import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, query, onSnapshot, getDocs } from 'firebase/firestore';
import { 
  Sprout, Droplet, Sparkles, Trash2, Edit2, Plus, Calendar, AlertTriangle, 
  ShieldCheck, Loader2, BookOpen, Clock, Heart, Search, CheckCircle2, 
  X, Camera, ChevronRight, RefreshCw, Upload, AlertCircle, Info, Flame
} from 'lucide-react';
import { diagnosePlantHealth, PlantDiagnosisResult } from '../lib/gemini';
import { playSfx, vibrate } from '../lib/sensory';

interface GardenCrop {
  id: string;
  cropType: 'alface' | 'tomate' | 'cebolinha' | 'hortela' | 'manjericao' | 'alecrim';
  varietyName: string;
  plantedAt: string;
  wateringIntervalHours: number;
  lastWateredAt: string;
  fertilizingIntervalDays: number;
  lastFertilizedAt: string;
  estimatedHarvestDate: string;
  harvestCompleted: boolean;
  notes?: string;
}

const CROP_CATALOG = {
  alface: {
    id: 'alface',
    name: 'Alface',
    scientificName: 'Lactuca sativa',
    difficulty: 'Fácil',
    sunlight: 'Meia-sombra a Sol pleno (4-6h/dia)',
    wateringFrequency: 'Diária (manter solo levemente úmido)',
    fertilizingFrequency: 'A cada 15 dias (Rico em Nitrogênio / Húmus de minhoca)',
    daysToHarvest: 50,
    wateringHours: 24,
    fertilizingDays: 15,
    germinationDays: '4 a 7 dias',
    benefits: 'Calmante natural, rica em fibras, vitamina A e K.',
    image: 'https://images.unsplash.com/photo-1622206194165-d27372d73927?auto=format&fit=crop&q=80&w=400&h=300',
    steps: [
      'Prepare um vaso com boa drenagem (furos embaixo + camada de argila expandida ou brita).',
      'Use substrato leve, fofo e rico em matéria orgânica (húmus de minhoca).',
      'Semeie de 3 a 5 sementes a 0.5 cm de profundidade. Regue borrifando água de leve.',
      'Mantenha o solo úmido e em local iluminado. Após brotar, deixe as mudas mais fortes.',
      'Regue diariamente perto da base e evite molhar em excesso as folhas sob sol forte.'
    ]
  },
  tomate: {
    id: 'tomate',
    name: 'Tomate Cereja',
    scientificName: 'Solanum lycopersicum',
    difficulty: 'Média',
    sunlight: 'Sol pleno (Mínimo 6h/dia de sol direto)',
    wateringFrequency: 'Regular (profunda, evitar solo seco ou encharcado)',
    fertilizingFrequency: 'A cada 15 dias (Rico em Fósforo e Potássio / Farinha de ossos)',
    daysToHarvest: 90,
    wateringHours: 36,
    fertilizingDays: 15,
    germinationDays: '5 a 10 dias',
    benefits: 'Excelente antioxidante, rico em licopeno e vitamina C.',
    image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=400&h=300',
    steps: [
      'Semeie em sementeiras. Transplante para vaso definitivo grande (+20 litros) quando atingir 10-15cm.',
      'Coloque uma estaca de madeira ou tutor para apoiar o caule durante o crescimento.',
      'Regue sempre na base do solo, evitando molhar as folhas para não atrair fungos.',
      'Pode os brotos laterais ("ladrões") que crescem nas axilas dos galhos para focar energia nos frutos.',
      'Quando os tomates começarem a avermelhar, reduza ligeiramente as regas para concentrar o sabor.'
    ]
  },
  cebolinha: {
    id: 'cebolinha',
    name: 'Cebolinha',
    scientificName: 'Allium fistulosum',
    difficulty: 'Muito Fácil',
    sunlight: 'Sol pleno a Meia-sombra (4h+/dia)',
    wateringFrequency: 'Moderada (regar quando a superfície do solo estiver seca)',
    fertilizingFrequency: 'A cada 30 dias (Matéria orgânica leve ou composto caseiro)',
    daysToHarvest: 70,
    wateringHours: 48,
    fertilizingDays: 30,
    germinationDays: '6 a 12 dias',
    benefits: 'Auxilia na digestão, rica em vitaminas A, C e minerais.',
    image: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=80&w=400&h=300',
    steps: [
      'Semeie diretamente em vaso de pelo menos 15cm de profundidade ou plante bulbos/raiz de feira.',
      'Mantenha o solo úmido, mas nunca encharcado. Gosta de solo bem drenado.',
      'Pode ser cultivada facilmente em parapeitos de janela que recebem luz solar direta.',
      'Ao colher, corte sempre as folhas externas a cerca de 2cm do solo. Ela rebrotará rapidamente.',
      'Retire folhas amareladas ou secas para dar força a novos brotos saudáveis.'
    ]
  },
  hortela: {
    id: 'hortela',
    name: 'Hortelã',
    scientificName: 'Mentha spicata',
    difficulty: 'Fácil',
    sunlight: 'Meia-sombra (Claridade forte, sem sol direto escaldante)',
    wateringFrequency: 'Frequente (Solo sempre úmido, adora umidade)',
    fertilizingFrequency: 'A cada 30 dias (Adubo orgânico líquido ou húmus diluído)',
    daysToHarvest: 45,
    wateringHours: 24,
    fertilizingDays: 30,
    germinationDays: '7 a 14 dias',
    benefits: 'Digestivo potente, alivia cólicas, excelente refrescante aromático.',
    image: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&q=80&w=400&h=300',
    steps: [
      'Plante em um vaso EXCLUSIVO. A hortelã possui raízes invasivas que sufocam outras plantas vizinhas.',
      'Use um vaso largo e raso, pois ela se espalha horizontalmente na superfície.',
      'Mantenha o solo constantemente úmido. Se a terra secar, ela murchará rapidamente.',
      'Proteja de ventos fortes e frios, que queimam as folhas delicadas.',
      'Colha beliscando os galhos de cima para estimular que a planta se ramifique e cresça cheia.'
    ]
  },
  manjericao: {
    id: 'manjericao',
    name: 'Manjericão',
    scientificName: 'Ocimum basilicum',
    difficulty: 'Fácil',
    sunlight: 'Sol pleno (Ama sol e calor, mínimo 4-6h/dia)',
    wateringFrequency: 'Regular (regar ao notar o solo secando)',
    fertilizingFrequency: 'A cada 15 dias (Adubo líquido caseiro, casca de banana/ovo)',
    daysToHarvest: 60,
    wateringHours: 36,
    fertilizingDays: 15,
    germinationDays: '5 a 10 dias',
    benefits: 'Antisséptico natural, combate estresse, rico em antioxidantes.',
    image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=400&h=300',
    steps: [
      'Escolha um local que receba muito sol direto. O manjericão precisa de calor para desenvolver o sabor.',
      'Evite encharcar a terra, mas não o deixe passar sede absoluta.',
      'Faça a poda de beliscamento: corte o par de folhas do topo de cada galho. Isso dobra o número de ramos!',
      'Retire as flores assim que surgirem. Se deixá-lo florir, as folhas ficam amargas e a planta morre mais cedo.',
      'Regue de manhã cedo para que a umidade nas folhas evapore ao longo do dia.'
    ]
  },
  alecrim: {
    id: 'alecrim',
    name: 'Alecrim',
    scientificName: 'Salvia rosmarinus',
    difficulty: 'Média (resistente, mas lento no início)',
    sunlight: 'Sol pleno constante (Adora calor intenso e sol direto)',
    wateringFrequency: 'Pouca (regar apenas quando o solo estiver completamente seco)',
    fertilizingFrequency: 'A cada 90 dias ou menos (Necessita de pouquíssimos nutrientes)',
    daysToHarvest: 90,
    wateringHours: 72,
    fertilizingDays: 90,
    germinationDays: '15 a 25 dias',
    benefits: 'Melhora o foco, memória, circulação e possui ação anti-inflamatória.',
    image: 'https://images.unsplash.com/photo-1515519315610-d87b1c3fa1df?auto=format&fit=crop&q=80&w=400&h=300',
    steps: [
      'Garante drenagem excelente: misture 1 parte de areia de construção para 2 partes de terra vegetal.',
      'O alecrim odeia raízes encharcadas, excesso de água causa apodrecimento imediato.',
      'Posicione no local que pega mais sol na sua residência (mínimo 6 horas diárias).',
      'Propague preferencialmente por estacas (galhos na água até criar raízes), pois sementes demoram muito.',
      'Não adube em excesso. O alecrim prefere solos mais pobres e rústicos.'
    ]
  }
};

export function SmartGarden() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'catalog' | 'mygarden' | 'diagnosis'>('catalog');
  
  // State for user crops
  const [crops, setCrops] = useState<GardenCrop[]>([]);
  const [loadingCrops, setLoadingCrops] = useState(true);

  // Crop configuration modal state
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<any | null>(null);
  const [isPlantingModalOpen, setIsPlantingModalOpen] = useState(false);
  const [varietyName, setVarietyName] = useState('');
  const [plantedAt, setPlantedAt] = useState(new Date().toISOString().split('T')[0]);
  const [customWateringHours, setCustomWateringHours] = useState(24);
  const [customFertilizingDays, setCustomFertilizingDays] = useState(15);

  // Diagnostics states
  const [symptomDescription, setSymptomDescription] = useState('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<PlantDiagnosisResult | null>(null);
  const [diagnoseImage, setDiagnoseImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Error logger
  const logError = (error: unknown, op: string) => {
    console.error(`Error during ${op}:`, error);
  };

  // Sync Garden Crops from Firestore
  useEffect(() => {
    if (!user) {
      setLoadingCrops(false);
      const cached = localStorage.getItem('nutri_local_garden');
      if (cached) {
        setCrops(JSON.parse(cached));
      }
      return;
    }

    setLoadingCrops(true);
    const gardenPath = `users/${user.uid}/gardenCrops`;
    const q = query(collection(db, gardenPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: GardenCrop[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as GardenCrop);
      });
      setCrops(items);
      setLoadingCrops(false);
    }, (error) => {
      logError(error, 'onSnapshot gardenCrops');
      setLoadingCrops(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fallback storage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('nutri_local_garden', JSON.stringify(crops));
    }
  }, [crops, user]);

  const handleStartPlantingSetup = (item: any) => {
    setSelectedCatalogItem(item);
    setVarietyName(`${item.name} da Horta`);
    setPlantedAt(new Date().toISOString().split('T')[0]);
    setCustomWateringHours(item.wateringHours);
    setCustomFertilizingDays(item.fertilizingDays);
    setIsPlantingModalOpen(true);
    playSfx('tap');
  };

  const handleConfirmPlanting = async () => {
    if (!selectedCatalogItem) return;

    // Estimate harvest date
    const harvestDate = new Date();
    harvestDate.setDate(harvestDate.getDate() + selectedCatalogItem.daysToHarvest);
    const estimatedHarvestDate = harvestDate.toISOString().split('T')[0];

    const newCrop: GardenCrop = {
      id: crypto.randomUUID(),
      cropType: selectedCatalogItem.id,
      varietyName: varietyName || selectedCatalogItem.name,
      plantedAt: plantedAt,
      wateringIntervalHours: customWateringHours,
      lastWateredAt: new Date().toISOString(),
      fertilizingIntervalDays: customFertilizingDays,
      lastFertilizedAt: new Date().toISOString(),
      estimatedHarvestDate: estimatedHarvestDate,
      harvestCompleted: false
    };

    if (user) {
      const docPath = `users/${user.uid}/gardenCrops/${newCrop.id}`;
      try {
        await setDoc(doc(db, docPath), newCrop);
      } catch (e) {
        logError(e, 'setDoc gardenCrops');
      }
    } else {
      setCrops(prev => [...prev, newCrop]);
    }

    setIsPlantingModalOpen(false);
    setSelectedCatalogItem(null);
    setActiveTab('mygarden');
    playSfx('success');
    vibrate(40);
  };

  // Quick Action: Regar (Water)
  const handleWaterCrop = async (id: string) => {
    const updatedCrops = crops.map(c => {
      if (c.id === id) {
        return { ...c, lastWateredAt: new Date().toISOString() };
      }
      return c;
    });

    const crop = updatedCrops.find(c => c.id === id);
    if (user && crop) {
      try {
        await setDoc(doc(db, `users/${user.uid}/gardenCrops/${id}`), crop, { merge: true });
      } catch (e) {
        logError(e, 'water crop doc update');
      }
    } else {
      setCrops(updatedCrops);
    }
    playSfx('success');
    vibrate([20, 40]);
  };

  // Quick Action: Adubar (Fertilize)
  const handleFertilizeCrop = async (id: string) => {
    const updatedCrops = crops.map(c => {
      if (c.id === id) {
        return { ...c, lastFertilizedAt: new Date().toISOString() };
      }
      return c;
    });

    const crop = updatedCrops.find(c => c.id === id);
    if (user && crop) {
      try {
        await setDoc(doc(db, `users/${user.uid}/gardenCrops/${id}`), crop, { merge: true });
      } catch (e) {
        logError(e, 'fertilize crop doc update');
      }
    } else {
      setCrops(updatedCrops);
    }
    playSfx('success');
    vibrate([20, 40]);
  };

  // Quick Action: Colher! (Harvest)
  const handleHarvestCrop = async (id: string) => {
    const confirmHarvest = confirm("Parabéns pelo cultivo! Marcar esta horta como colhida com sucesso?");
    if (!confirmHarvest) return;

    const updatedCrops = crops.map(c => {
      if (c.id === id) {
        return { ...c, harvestCompleted: true };
      }
      return c;
    });

    const crop = updatedCrops.find(c => c.id === id);
    if (user && crop) {
      try {
        await setDoc(doc(db, `users/${user.uid}/gardenCrops/${id}`), crop, { merge: true });
      } catch (e) {
        logError(e, 'harvest crop doc update');
      }
    } else {
      setCrops(updatedCrops);
    }
    playSfx('success');
    vibrate([50, 50, 50]);
  };

  // Delete Crop
  const handleDeleteCrop = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta planta da sua horta?")) return;

    if (user) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/gardenCrops/${id}`));
      } catch (e) {
        logError(e, 'delete crop doc');
      }
    } else {
      setCrops(prev => prev.filter(c => c.id !== id));
    }
    playSfx('tap');
  };

  // AI Plant Diagnosis Trigger
  const handleTriggerDiagnosis = async () => {
    if (!symptomDescription.trim()) {
      alert("Por favor, descreva os sintomas da planta para que a IA possa avaliar.");
      return;
    }

    setIsDiagnosing(true);
    setDiagnoseResult(null);
    playSfx('pop');
    try {
      const result = await diagnosePlantHealth(symptomDescription, diagnoseImage || undefined);
      setDiagnoseResult(result);
      playSfx('success');
      vibrate([40, 40]);
    } catch (e) {
      logError(e, 'diagnosePlantHealth');
      alert("Ocorreu um erro ao consultar a IA Agrônoma. Tente novamente mais tarde.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Upload photo for diagnosis
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDiagnoseImage(reader.result as string);
        playSfx('success');
      };
      reader.readAsDataURL(file);
    }
  };

  // Timer/Status Calculation Helper
  const getWateringStatus = (crop: GardenCrop) => {
    const lastWatered = new Date(crop.lastWateredAt);
    const now = new Date();
    const diffHours = (now.getTime() - lastWatered.getTime()) / (1000 * 60 * 60);
    const progress = Math.max(0, Math.min(100, 100 - (diffHours / crop.wateringIntervalHours) * 100));
    const isOverdue = diffHours > crop.wateringIntervalHours;
    const remainingHours = Math.max(0, crop.wateringIntervalHours - diffHours);

    return {
      progress,
      isOverdue,
      remainingText: isOverdue 
        ? 'Necessita regar!' 
        : `Regar em ${Math.ceil(remainingHours)}h`
    };
  };

  const getFertilizingStatus = (crop: GardenCrop) => {
    const lastFertilized = new Date(crop.lastFertilizedAt);
    const now = new Date();
    const diffDays = (now.getTime() - lastFertilized.getTime()) / (1000 * 60 * 60 * 24);
    const progress = Math.max(0, Math.min(100, 100 - (diffDays / crop.fertilizingIntervalDays) * 100));
    const isOverdue = diffDays > crop.fertilizingIntervalDays;
    const remainingDays = Math.max(0, crop.fertilizingIntervalDays - diffDays);

    return {
      progress,
      isOverdue,
      remainingText: isOverdue 
        ? 'Necessita adubar!' 
        : `Adubar em ${Math.ceil(remainingDays)} dias`
    };
  };

  const getHarvestingStatus = (crop: GardenCrop) => {
    const planted = new Date(crop.plantedAt);
    const estHarvest = new Date(crop.estimatedHarvestDate);
    const now = new Date();
    
    const totalDuration = estHarvest.getTime() - planted.getTime();
    const elapsed = now.getTime() - planted.getTime();
    const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    
    const daysToHarvest = Math.ceil((estHarvest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isReady = daysToHarvest <= 0;

    return {
      progress,
      isReady,
      remainingText: isReady
        ? 'Pronto para colher!'
        : `${daysToHarvest} dias para colher`
    };
  };

  // Get visual growth stage representing seed -> sprout -> growing -> harvest
  const getGrowthVisualStage = (crop: GardenCrop) => {
    const hStatus = getHarvestingStatus(crop);
    const prog = hStatus.progress;

    if (crop.harvestCompleted) return { label: 'Colheita Concluída 🎉', icon: '🧺', color: 'text-emerald-500' };
    if (prog >= 100) return { label: 'Pronto p/ Colheita', icon: '🥬', color: 'text-emerald-500 animate-bounce' };
    if (prog >= 65) return { label: 'Fase de Crescimento Avançado', icon: '🌿', color: 'text-teal-500' };
    if (prog >= 35) return { label: 'Desenvolvendo Folhas', icon: '🌱', color: 'text-green-500' };
    if (prog >= 15) return { label: 'Brotinho Germinado', icon: '🌱', color: 'text-lime-500' };
    return { label: 'Semente Germinando', icon: '🥚', color: 'text-amber-500' };
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500" id="smart-garden-root">
      
      {/* Upper header section */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-medium text-xs md:text-sm border border-teal-200 dark:border-teal-800 max-w-full select-none shadow-sm">
          <Sprout className="w-3.5 h-3.5 md:w-4 md:h-4 animate-bounce shrink-0" />
          <span className="truncate">Minha Horta Inteligente</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-slate-850 dark:text-slate-100">
          Horta Caseira Inteligente
        </h1>
        <p className="font-sans text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto">
          Aprenda o passo a passo científico para plantar temperos saudáveis, configure alarmes de cuidados inteligentes e previna doenças com IA botânica.
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex justify-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/30 max-w-xl mx-auto">
        <button
          onClick={() => { setActiveTab('catalog'); playSfx('tap'); }}
          className={`px-5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all ${
            activeTab === 'catalog' 
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' 
              : 'text-slate-600 dark:text-slate-350 hover:bg-slate-200/40 dark:hover:bg-slate-700/20'
          }`}
        >
          Guia de Plantio
        </button>
        <button
          onClick={() => { setActiveTab('mygarden'); playSfx('tap'); }}
          className={`px-5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'mygarden' 
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' 
              : 'text-slate-600 dark:text-slate-350 hover:bg-slate-200/40 dark:hover:bg-slate-700/20'
          }`}
        >
          Minha Horta
          {crops.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-bold">
              {crops.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('diagnosis'); playSfx('tap'); }}
          className={`px-5 py-2.5 rounded-xl font-sans text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'diagnosis' 
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' 
              : 'text-slate-600 dark:text-slate-350 hover:bg-slate-200/40 dark:hover:bg-slate-700/20'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Consultório IA
        </button>
      </div>

      {/* Main Panel views */}
      <AnimatePresence mode="wait">
        
        {/* VIEW 1: ENCYCLOPEDIA & CATALOG */}
        {activeTab === 'catalog' && (
          <motion.div
            key="catalog-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(CROP_CATALOG).map((item) => (
                <div 
                  key={item.id}
                  className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/40 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-video">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-md text-white font-medium text-xs rounded-full">
                        {item.difficulty}
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="font-serif text-2xl font-bold text-slate-850 dark:text-slate-100">{item.name}</h3>
                        <p className="font-sans text-xs italic text-slate-400 dark:text-slate-500">{item.scientificName}</p>
                      </div>

                      <p className="font-sans text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {item.benefits}
                      </p>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700/40 space-y-2 text-xs font-sans">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Sol ideal:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{item.sunlight}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Regas:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{item.wateringFrequency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ciclo médio:</span>
                          <span className="font-medium text-teal-600 dark:text-teal-400">{item.daysToHarvest} dias</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex gap-2">
                    <button
                      onClick={() => { setSelectedCatalogItem(item); playSfx('tap'); }}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-sans text-sm font-semibold rounded-2xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <BookOpen className="w-4 h-4 text-teal-600" />
                      Como Plantar
                    </button>
                    <button
                      onClick={() => handleStartPlantingSetup(item)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-sans text-sm font-semibold rounded-2xl hover:opacity-95 shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Iniciar Cultivo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* VIEW 2: MY PERSONAL ACTIVE GARDEN CROPS */}
        {activeTab === 'mygarden' && (
          <motion.div
            key="mygarden-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {loadingCrops ? (
              <div className="text-center py-24">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-teal-500 mb-4" />
                <p className="font-sans text-slate-500">Buscando sua horta inteligente...</p>
              </div>
            ) : crops.length === 0 ? (
              <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-dashed border-slate-300 dark:border-slate-700 rounded-[32px] p-12 text-center max-w-2xl mx-auto">
                <Sprout className="w-14 h-14 mx-auto text-slate-400 mb-4 animate-pulse" />
                <h3 className="font-serif text-2xl font-medium text-slate-700 dark:text-slate-300 mb-2">Sua horta está limpa por enquanto</h3>
                <p className="font-sans text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                  Que tal plantar cebolinha, hortelã fresca ou um tomatinho cereja hoje mesmo? Escolha um de nossos guias e inicie seu diário de cultivo.
                </p>
                <button
                  onClick={() => { setActiveTab('catalog'); playSfx('tap'); }}
                  className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-6 py-3 rounded-2xl font-sans text-sm font-medium shadow-md hover:opacity-95 transition-all"
                >
                  Explorar Guia de Plantio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {crops.map((crop) => {
                  const catalogItem = CROP_CATALOG[crop.cropType];
                  const wStatus = getWateringStatus(crop);
                  const fStatus = getFertilizingStatus(crop);
                  const hStatus = getHarvestingStatus(crop);
                  const growth = getGrowthVisualStage(crop);

                  return (
                    <div 
                      key={crop.id}
                      className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border rounded-[28px] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-lg ${
                        crop.harvestCompleted 
                          ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/10 dark:bg-emerald-950/5' 
                          : 'border-slate-200/60 dark:border-slate-700/40'
                      }`}
                    >
                      {/* Growth Stage Overlay Indicator */}
                      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/80 px-3 py-1 rounded-full text-xs font-semibold">
                        <span className="text-sm">{growth.icon}</span>
                        <span className={growth.color}>{growth.label}</span>
                      </div>

                      {/* Header details */}
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h4 className="font-serif text-2xl font-bold text-slate-850 dark:text-slate-100">
                            {crop.varietyName}
                          </h4>
                          <p className="font-sans text-xs text-slate-400">
                            Planted on: {new Date(crop.plantedAt + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        {/* Interactive Reminders Checkbox timers */}
                        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700/40">
                          
                          {/* Watering Reminder */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-sans font-medium text-slate-500 flex items-center gap-1">
                                <Droplet className={`w-3.5 h-3.5 ${wStatus.isOverdue ? 'text-blue-500 animate-bounce' : 'text-blue-400'}`} />
                                Regar (Próxima)
                              </span>
                              <span className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full ${
                                wStatus.isOverdue 
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' 
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                              }`}>
                                {wStatus.remainingText}
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${wStatus.isOverdue ? 'bg-rose-500' : 'bg-blue-500'}`}
                                style={{ width: `${wStatus.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Fertilizing Reminder */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-sans font-medium text-slate-500 flex items-center gap-1">
                                <Sparkles className={`w-3.5 h-3.5 ${fStatus.isOverdue ? 'text-amber-500 animate-pulse' : 'text-amber-400'}`} />
                                Adubar (Próxima)
                              </span>
                              <span className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full ${
                                fStatus.isOverdue 
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' 
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                              }`}>
                                {fStatus.remainingText}
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${fStatus.isOverdue ? 'bg-rose-500' : 'bg-amber-500'}`}
                                style={{ width: `${fStatus.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Harvesting Forecast */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-sans font-medium text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                                Previsão de Colheita
                              </span>
                              <span className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full ${
                                hStatus.isReady 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 animate-pulse' 
                                  : 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300'
                              }`}>
                                {hStatus.remainingText}
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-teal-500 transition-all duration-1000"
                                style={{ width: `${hStatus.progress}%` }}
                              />
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Reminders Log Actions */}
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/40 flex flex-wrap gap-2 items-center justify-between">
                        <div className="flex gap-2">
                          {!crop.harvestCompleted && (
                            <>
                              <button
                                onClick={() => handleWaterCrop(crop.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-sans text-xs font-semibold border border-blue-200/45 transition-colors"
                              >
                                <Droplet className="w-3.5 h-3.5 fill-current" />
                                Regar
                              </button>
                              <button
                                onClick={() => handleFertilizeCrop(crop.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-sans text-xs font-semibold border border-amber-200/45 transition-colors"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Adubar
                              </button>
                              {hStatus.isReady && (
                                <button
                                  onClick={() => handleHarvestCrop(crop.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-sans text-xs font-bold transition-colors animate-pulse"
                                >
                                  🧺 Colher!
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteCrop(crop.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                          title="Remover planta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 3: AI DIAGNOSTIC CONSULTANT */}
        {activeTab === 'diagnosis' && (
          <motion.div
            key="diagnosis-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 max-w-3xl mx-auto"
          >
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-[32px] p-6 md:p-8 shadow-xl space-y-6">
              <div className="text-center space-y-2">
                <h3 className="font-serif text-2xl font-bold text-slate-800 dark:text-slate-100">Consultório do Agrônomo IA</h3>
                <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
                  Sua planta está com folhas amarelas, secando, ou cheia de pequenos pontinhos brancos? Descreva os sintomas e receba receitas ecológicas protetoras.
                </p>
              </div>

              {/* Symptom Input & Photo selector */}
              <div className="space-y-4">
                <textarea
                  value={symptomDescription}
                  onChange={(e) => setSymptomDescription(e.target.value)}
                  placeholder="Exemplo: As folhas de baixo do meu manjericão estão com manchas amarelas e murchas, e há pequenos teias de aranha finas no caule."
                  rows={4}
                  className="w-full p-4 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-650 font-sans text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-400"
                />

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5 text-teal-600" />
                      Anexar foto da folha/problema
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    {diagnoseImage && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-sans flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Foto carregada!
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleTriggerDiagnosis}
                    disabled={isDiagnosing}
                    className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:opacity-95 shadow disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    {isDiagnosing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analisando Solo...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        Diagnosticar com IA
                      </>
                    )}
                  </button>
                </div>

                {diagnoseImage && (
                  <div className="relative inline-block mt-2">
                    <img src={diagnoseImage} alt="Preview" className="w-32 h-32 rounded-2xl object-cover border border-slate-200 dark:border-slate-700" />
                    <button
                      onClick={() => setDiagnoseImage(null)}
                      className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* AI Diagnostic Response Panel */}
              <AnimatePresence>
                {diagnoseResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-6 border-t border-slate-100 dark:border-slate-700/60 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-xl font-bold text-slate-800 dark:text-slate-100">Avaliação Ecológica</h4>
                      
                      {diagnoseResult.urgency === 'alta' && (
                        <span className="px-3 py-1 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold rounded-full flex items-center gap-1 animate-pulse">
                          <Flame className="w-3.5 h-3.5" /> Urgência Alta
                        </span>
                      )}
                      {diagnoseResult.urgency === 'media' && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-bold rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Urgência Média
                        </span>
                      )}
                      {diagnoseResult.urgency === 'baixa' && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold rounded-full flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" /> Urgência Baixa
                        </span>
                      )}
                    </div>

                    <div className="bg-teal-50/40 dark:bg-teal-950/10 p-5 rounded-2xl border border-teal-100/40 dark:border-teal-900/30">
                      <p className="font-sans text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {diagnoseResult.diagnosis}
                      </p>
                    </div>

                    {/* Causes breakdown */}
                    <div className="space-y-2">
                      <h5 className="font-serif font-bold text-slate-800 dark:text-slate-200 text-sm">Prováveis Causas:</h5>
                      <ul className="list-disc list-inside text-xs font-sans text-slate-600 dark:text-slate-400 space-y-1 pl-1">
                        {diagnoseResult.causes.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>

                    {/* Organic remedies list */}
                    <div className="space-y-3">
                      <h5 className="font-serif font-bold text-teal-800 dark:text-teal-300 text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Remédios Orgânicos Recomendados:
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {diagnoseResult.organicSolutions.map((sol, i) => (
                          <div key={i} className="bg-emerald-50/20 dark:bg-emerald-950/20 border border-emerald-100/30 p-3.5 rounded-xl text-xs font-sans text-slate-700 dark:text-slate-350 leading-relaxed">
                            {sol}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Preventions */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/40">
                      <h5 className="font-serif font-bold text-slate-800 dark:text-slate-200 text-sm">Cuidados Preventivos Permanentes:</h5>
                      <ul className="list-decimal list-inside text-xs font-sans text-slate-600 dark:text-slate-400 space-y-1.5 pl-1">
                        {diagnoseResult.preventions.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* PLANTING INSTRUCTIONS / GUIDE DETAIL MODAL */}
      {selectedCatalogItem && !isPlantingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-850 rounded-[32px] w-full max-w-xl max-h-[85vh] overflow-y-auto border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedCatalogItem(null)}
              className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>

            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                <img src={selectedCatalogItem.image} alt={selectedCatalogItem.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h3 className="font-serif text-3xl font-bold text-slate-800 dark:text-slate-100">{selectedCatalogItem.name}</h3>
                <p className="font-sans text-xs text-teal-600 dark:text-teal-400 italic">{selectedCatalogItem.scientificName}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100/40 p-4 rounded-2xl text-xs font-sans text-slate-600 dark:text-slate-350 leading-relaxed">
                <p className="font-semibold text-teal-700 dark:text-teal-300 mb-1">Dificuldade: {selectedCatalogItem.difficulty}</p>
                {selectedCatalogItem.benefits}
              </div>

              {/* Plant info stats */}
              <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-slate-400">Tempo de Germinação</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{selectedCatalogItem.germinationDays}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-slate-400">Luminosidade ideal</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{selectedCatalogItem.sunlight}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-slate-400">Freq. de Regas</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{selectedCatalogItem.wateringFrequency}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-slate-400">Freq. de Adubação</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{selectedCatalogItem.fertilizingFrequency}</p>
                </div>
              </div>

              {/* Step by Step list */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-slate-800 dark:text-slate-200 text-sm">Passo a Passo de Cultivo:</h4>
                <div className="space-y-2.5">
                  {selectedCatalogItem.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 text-xs font-sans text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleStartPlantingSetup(selectedCatalogItem)}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-sans text-sm font-semibold rounded-2xl hover:opacity-95 transition-all shadow-lg"
              >
                Plantar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETUP / START PLANTING MODAL */}
      {isPlantingModalOpen && selectedCatalogItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-850 rounded-[32px] w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => { setIsPlantingModalOpen(false); setSelectedCatalogItem(null); }}
              className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>

            <div>
              <h3 className="font-serif text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Sprout className="w-6 h-6 text-teal-500" />
                Configurar Nova Planta
              </h3>
              <p className="font-sans text-xs text-slate-400 mt-1">Configure os cronômetros de cuidado e rega ideal recomendada.</p>
            </div>

            <div className="space-y-4 font-sans text-sm">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Nome / Identificação</label>
                <input
                  type="text"
                  value={varietyName}
                  onChange={(e) => setVarietyName(e.target.value)}
                  placeholder="Ex: Meu Alecrim na sacada"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Data de Plantio</label>
                <input
                  type="date"
                  value={plantedAt}
                  onChange={(e) => setPlantedAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>

              {/* Watering Interval Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Intervalo de Rega</span>
                  <span className="text-teal-600 dark:text-teal-400">A cada {customWateringHours} horas</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={96}
                  step={12}
                  value={customWateringHours}
                  onChange={(e) => setCustomWateringHours(Number(e.target.value))}
                  className="w-full accent-teal-500"
                />
                <p className="text-[10px] text-slate-400">Sugestão típica: {selectedCatalogItem.wateringFrequency}</p>
              </div>

              {/* Fertilizing Interval Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Intervalo de Adubação</span>
                  <span className="text-teal-600 dark:text-teal-400">A cada {customFertilizingDays} dias</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={90}
                  step={5}
                  value={customFertilizingDays}
                  onChange={(e) => setCustomFertilizingDays(Number(e.target.value))}
                  className="w-full accent-teal-500"
                />
                <p className="text-[10px] text-slate-400 font-sans">Sugestão típica: {selectedCatalogItem.fertilizingFrequency}</p>
              </div>

            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => { setIsPlantingModalOpen(false); setSelectedCatalogItem(null); }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 text-sm font-semibold rounded-2xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPlanting}
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-semibold rounded-2xl hover:opacity-95 shadow-lg transition-all"
              >
                Confirmar Plantio
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
