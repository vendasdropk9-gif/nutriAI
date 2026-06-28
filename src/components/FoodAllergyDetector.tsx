import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, addDoc, deleteDoc, updateDoc, getDoc, setDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  Camera, Upload, Sparkles, AlertTriangle, Heart, Trash2, 
  Settings, Info, ShieldAlert, CheckCircle2, ShieldCheck,
  RotateCcw, Send, MessageSquare, AlertOctagon, HelpCircle, 
  UtensilsCrossed, Apple, ChevronRight, Bookmark, Search, BookOpen, X, Sprout
} from 'lucide-react';
import Markdown from 'react-markdown';

// Presets for easy 1-click testing of labels & products
const PRESET_PRODUCTS = [
  {
    name: "Biscoito Amanteigado Tradicional",
    url: "https://images.unsplash.com/photo-1558961309-dbdf71799f54?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Ingredientes: Farinha de trigo enriquecida, açúcar, manteiga (leite), ovos inteiros pasteurizados, fermento químico, sal.",
    allergens: ["Glúten", "Lactose", "Leite", "Ovos", "Trigo"]
  },
  {
    name: "Barra de Cereal Nut & Amendoim",
    url: "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Ingredientes: Amendoim torrado, xarope de glicose, aveia em flocos, flocos de arroz, castanha-de-caju, lecitina de soja, sal, óleo de soja.",
    allergens: ["Amendoim", "Castanhas", "Glúten", "Soja"]
  },
  {
    name: "Molho Shoyu Premium",
    url: "https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Ingredientes: Água, sal, soja em grãos, trigo em grãos, corante caramelo IV, conservador sorbato de potássio.",
    allergens: ["Soja", "Glúten", "Trigo"]
  },
  {
    name: "Iogurte Natural Cremoso",
    url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Ingredientes: Leite integral pasteurizado, soro de leite concentrado, fermento lácteo vivo.",
    allergens: ["Lactose", "Leite"]
  },
  {
    name: "Filé de Peixe Empanado Crocante",
    url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Ingredientes: Filé de merluza (peixe), farinha de trigo, água, óleo vegetal de soja, ovos em pó, sal, condimentos.",
    allergens: ["Frutos do mar", "Glúten", "Ovos", "Soja", "Trigo"]
  }
];

const AVAILABLE_COMMON_ALLERGENS = [
  { id: 'gluten', name: 'Glúten', icon: '🌾', description: 'Trigo, aveia, cevada, centeio e derivados' },
  { id: 'lactose', name: 'Lactose', icon: '🥛', description: 'Açúcar natural do leite de origem animal' },
  { id: 'leite', name: 'Leite', icon: '🐄', description: 'Proteína do leite de vaca (caseína, beta-lactoglobulina)' },
  { id: 'amendoim', name: 'Amendoim', icon: '🥜', description: 'Amendoim, óleos não refinados e derivados' },
  { id: 'soja', name: 'Soja', icon: '🌱', description: 'Grãos de soja, lecitina, óleos e derivados' },
  { id: 'castanhas', name: 'Castanhas', icon: '🌰', description: 'Nozes, amêndoas, castanha-de-caju, castanha-do-pará, avelãs' },
  { id: 'ovos', name: 'Ovos', icon: '🥚', description: 'Clara e gema de ovo de galinha e outras aves' },
  { id: 'frutos_do_mar', name: 'Frutos do mar', icon: '🦐', description: 'Peixes, camarão, caranguejo, lagosta, moluscos' }
];

interface FoodAllergyAnalysisResult {
  identified: boolean;
  productName: string;
  ingredientsFound: string;
  isSafe: boolean;
  allergensDetected: string[];
  userSpecificThreats: { allergen: string; ingredientSource: string; severity: 'Alta' | 'Média' | 'Baixa' }[];
  alternativesSuggested: string[];
  detailedAnalysis: string;
  score: number;
}

export function FoodAllergyDetector() {
  const { user } = useAuth();
  
  // Scans history state
  const [scans, setScans] = useState<any[]>([]);
  const [scansLoading, setScansLoading] = useState(true);
  
  // Custom Allergies & Severity states
  const [userAllergies, setUserAllergies] = useState<string[]>([]);
  const [severityLevels, setSeverityLevels] = useState<Record<string, 'Alta' | 'Média' | 'Baixa'>>({});
  const [customAllergenInput, setCustomAllergenInput] = useState('');
  const [isSavingAllergies, setIsSavingAllergies] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Analysis & Scanner states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FoodAllergyAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Conversational chat specific to the scanned product
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load User Allergies and Scan History on startup
  useEffect(() => {
    if (!user) {
      // Local fallback
      const localAllergies = localStorage.getItem('nutri_user_allergies');
      const localSeverities = localStorage.getItem('nutri_user_severities');
      if (localAllergies) {
        setUserAllergies(JSON.parse(localAllergies));
      } else {
        setUserAllergies(['gluten', 'lactose']); // defaults
      }
      if (localSeverities) {
        setSeverityLevels(JSON.parse(localSeverities));
      } else {
        setSeverityLevels({ 'gluten': 'Alta', 'lactose': 'Média' });
      }
      setScansLoading(false);
      return;
    }

    // 1. Fetch profile allergies
    const profileRef = doc(db, 'users', user.uid);
    getDoc(profileRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.allergies && Array.isArray(data.allergies)) {
          // Map string names back to ids if possible, or just treat as direct names
          const mapped: string[] = [];
          const severities: Record<string, 'Alta' | 'Média' | 'Baixa'> = {};
          
          data.allergies.forEach((allergy: string) => {
            const foundCommon = AVAILABLE_COMMON_ALLERGENS.find(
              c => c.name.toLowerCase() === allergy.toLowerCase() || c.id === allergy.toLowerCase()
            );
            if (foundCommon) {
              mapped.push(foundCommon.id);
              severities[foundCommon.id] = data.allergySeverities?.[foundCommon.id] || 'Alta';
            } else {
              // Custom allergy
              mapped.push(allergy);
              severities[allergy] = data.allergySeverities?.[allergy] || 'Alta';
            }
          });
          
          setUserAllergies(mapped);
          setSeverityLevels(severities);
        }
      }
    }).catch(err => console.error("Error loading allergies profile:", err));

    // 2. Stream Scan History
    const scansRef = collection(db, 'users', user.uid, 'allergyScans');
    const q = query(scansRef, orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setScans(items);
      setScansLoading(false);
    }, (err) => {
      console.error("Error reading allergy scan history:", err);
      setScansLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  // Save allergies configuration
  const handleSaveAllergies = async () => {
    setIsSavingAllergies(true);
    setSettingsSuccess(false);

    // Human readable text list to store in User doc
    const humanList = userAllergies.map(allergyId => {
      const foundCommon = AVAILABLE_COMMON_ALLERGENS.find(c => c.id === allergyId);
      return foundCommon ? foundCommon.name : allergyId;
    });

    try {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          allergies: humanList,
          allergySeverities: severityLevels
        }, { merge: true });
      } else {
        localStorage.setItem('nutri_user_allergies', JSON.stringify(userAllergies));
        localStorage.setItem('nutri_user_severities', JSON.stringify(severityLevels));
      }
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save allergies:", err);
    } finally {
      setIsSavingAllergies(false);
    }
  };

  const toggleAllergen = (id: string) => {
    setUserAllergies(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // default severity is Alta
      if (!severityLevels[id]) {
        setSeverityLevels(curr => ({ ...curr, [id]: 'Alta' }));
      }
      return next;
    });
  };

  const handleSeverityChange = (id: string, level: 'Alta' | 'Média' | 'Baixa') => {
    setSeverityLevels(prev => ({
      ...prev,
      [id]: level
    }));
  };

  const handleAddCustomAllergen = () => {
    if (!customAllergenInput.trim()) return;
    const clean = customAllergenInput.trim();
    if (!userAllergies.includes(clean)) {
      setUserAllergies(prev => [...prev, clean]);
      setSeverityLevels(prev => ({ ...prev, [clean]: 'Alta' }));
    }
    setCustomAllergenInput('');
  };

  const handleRemoveCustomAllergen = (name: string) => {
    setUserAllergies(prev => prev.filter(x => x !== name));
    setSeverityLevels(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  };

  // Convert uploaded image
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);
      setResult(null);
      setChatHistory([]);
      
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setError(null);
      setResult(null);
      setChatHistory([]);
      
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Run Gemini analysis
  const handleAnalyze = async (customUrl?: string) => {
    const activeImage = customUrl || selectedImage;
    if (!activeImage) {
      setError("Por favor, tire uma foto do rótulo/alimento, envie uma imagem ou selecione um dos exemplos de teste.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setChatHistory([]);

    try {
      let imagePayload = activeImage;
      if (selectedFile && !customUrl) {
        imagePayload = await fileToBase64(selectedFile);
      }

      // Human-readable allergies to pass to model
      const humanAllergyNames = userAllergies.map(id => {
        const found = AVAILABLE_COMMON_ALLERGENS.find(c => c.id === id);
        return found ? found.name : id;
      });

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'analyzeFoodAllergens',
          args: [imagePayload, humanAllergyNames, selectedFile?.type || "image/jpeg"]
        })
      });

      if (!response.ok) {
        throw new Error("Erro na comunicação com o servidor de alérgenos.");
      }

      const data: FoodAllergyAnalysisResult = await response.json();
      setResult(data);

      // Save to Firestore
      if (user && data.identified) {
        await addDoc(collection(db, 'users', user.uid, 'allergyScans'), {
          photoURL: customUrl || activeImage,
          productName: data.productName,
          isSafe: data.isSafe,
          allergensDetected: data.allergensDetected,
          date: new Date().toISOString(),
          isFavorite: false,
          result: data
        });
      }

      if (data.identified) {
        setChatHistory([
          {
            role: 'model',
            text: `Análise de alergias concluída para **${data.productName}**. 
Status: ${data.isSafe ? '✅ **SEGURO** para o seu perfil!' : '⚠️ **ALERTA DE ALERGÊNICOS DETECTADOS!**'}

O nível de segurança geral é de **${data.score}/100**. Você deseja tirar alguma dúvida técnica ou saber sobre contaminação cruzada para esse produto?`
          }
        ]);
      } else {
        setError("Não foi possível identificar o rótulo de ingredientes ou o alimento com clareza. Certifique-se de tirar uma foto nítida e iluminada da área de ingredientes.");
      }
    } catch (err: any) {
      console.error("Allergies scan error:", err);
      setError("Falha técnica ao analisar alérgenos. Verifique a imagem ou tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendChatMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || chatLoading || !result) return;

    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: textToSend }]);
    setChatLoading(true);

    try {
      const humanAllergyNames = userAllergies.map(id => {
        const found = AVAILABLE_COMMON_ALLERGENS.find(c => c.id === id);
        return found ? found.name : id;
      });

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'chatAboutAllergies',
          args: [result.productName, humanAllergyNames, chatHistory, textToSend]
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(prev => [...prev, { role: 'model', text: data.text }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'model', text: "Ocorreu um erro ao consultar o alergologista." }]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatHistory(prev => [...prev, { role: 'model', text: "Erro ao conectar com a IA do Alergologista." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleFavoriteScan = async (id: string, current: boolean) => {
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'allergyScans', id);
      await updateDoc(ref, { isFavorite: !current });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteScan = async (id: string) => {
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'allergyScans', id);
      await deleteDoc(ref);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadFromHistory = (scan: any) => {
    setSelectedImage(scan.photoURL);
    setSelectedFile(null);
    setResult(scan.result || scan);
    setError(null);
    setChatHistory([
      {
        role: 'model',
        text: `Carreguei os detalhes de alergia salvos para **${scan.productName}** do seu histórico.`
      }
    ]);
  };

  return (
    <div className="space-y-6" id="food_allergy_detector_main">
      {/* Visual Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-y-8 translate-x-4 opacity-15 scale-125">
          <ShieldAlert className="w-44 h-44" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
              Tecnologia de Visão Computacional Gemini 3.5
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight font-sans">
            Detector de Alergias Alimentares
          </h2>
          <p className="text-xs text-emerald-50 max-w-xl leading-relaxed font-medium">
            Tire foto de embalagens, pratos ou listas de ingredientes. 
            Nosso especialista escaneia em tempo real em busca de glúten, lactose, amendoim, ovos e muito mais, personalizando os alertas de acordo com o seu perfil micológico e de saúde.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Settings and Image Inputs */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section: Allergies Customization Profile */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-500" />
                Meu Perfil de Alergias
              </h3>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg transition-all"
              >
                {showSettings ? 'Fechar' : 'Configurar'}
              </button>
            </div>

            {/* Configured allergies visual badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {userAllergies.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic">Nenhuma alergia cadastrada. Alertas desativados.</p>
              ) : (
                userAllergies.map(allergyId => {
                  const common = AVAILABLE_COMMON_ALLERGENS.find(c => c.id === allergyId);
                  const name = common ? common.name : allergyId;
                  const icon = common ? common.icon : '✨';
                  const sev = severityLevels[allergyId] || 'Alta';
                  
                  return (
                    <div 
                      key={allergyId}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-300 text-[10px] font-bold rounded-lg"
                    >
                      <span>{icon} {name}</span>
                      <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        sev === 'Alta' ? 'bg-red-500 text-white' : sev === 'Média' ? 'bg-orange-400 text-white' : 'bg-amber-300 text-gray-800'
                      }`}>
                        {sev}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick config expanded block */}
            {showSettings && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4"
              >
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Selecione suas alergias de interesse:
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {AVAILABLE_COMMON_ALLERGENS.map(item => {
                      const isSelected = userAllergies.includes(item.id);
                      return (
                        <div 
                          key={item.id}
                          className={`p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                            isSelected 
                              ? 'border-rose-200 bg-rose-50/10 dark:border-rose-950/30' 
                              : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleAllergen(item.id)}
                                className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                              />
                              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                {item.icon} {item.name}
                              </span>
                            </label>

                            {/* Severity Level slider */}
                            {isSelected && (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-gray-400 font-bold mr-1">Severidade:</span>
                                {(['Baixa', 'Média', 'Alta'] as const).map(lvl => (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => handleSeverityChange(item.id, lvl)}
                                    className={`px-1.5 py-0.5 text-[8px] font-black rounded uppercase transition-all ${
                                      severityLevels[item.id] === lvl
                                        ? lvl === 'Alta' ? 'bg-red-600 text-white' : lvl === 'Média' ? 'bg-orange-500 text-white' : 'bg-amber-400 text-gray-800'
                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                                    }`}
                                  >
                                    {lvl[0]}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 pl-6">{item.description}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Allergen input */}
                <div className="space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alergênico Adicional Customizado:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={customAllergenInput}
                      onChange={(e) => setCustomAllergenInput(e.target.value)}
                      placeholder="Ex: Corante tartrazina, Morango..."
                      className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomAllergen}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
                    >
                      Adicionar
                    </button>
                  </div>

                  {/* List custom allergens */}
                  {userAllergies.filter(id => !AVAILABLE_COMMON_ALLERGENS.some(c => c.id === id)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {userAllergies.filter(id => !AVAILABLE_COMMON_ALLERGENS.some(c => c.id === id)).map(custom => (
                        <div key={custom} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[9px] px-2 py-0.5 rounded-md">
                          <span>{custom}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveCustomAllergen(custom)}
                            className="text-red-500 font-extrabold hover:text-red-700 ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save to Profile button */}
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                  {settingsSuccess ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Salvo com sucesso!
                    </span>
                  ) : <span />}
                  <button
                    type="button"
                    onClick={handleSaveAllergies}
                    disabled={isSavingAllergies}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1"
                  >
                    {isSavingAllergies ? 'Salvando...' : 'Salvar no Perfil'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Photo upload zone */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-500" />
              Escanear Rótulo / Foto do Alimento
            </h3>

            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('allergy-file-input')?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] ${
                selectedImage 
                  ? 'border-emerald-500/35 bg-emerald-50/5' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-emerald-500/30'
              }`}
            >
              <input 
                type="file" 
                id="allergy-file-input"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedImage ? (
                <div className="w-full space-y-3">
                  <div className="relative h-40 w-full rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800">
                    <img 
                      src={selectedImage} 
                      alt="Food preview" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(null);
                        setSelectedFile(null);
                        setResult(null);
                        setError(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/85 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 font-semibold">Imagem carregada com sucesso!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-full text-emerald-600 dark:text-emerald-400 inline-block">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Fotografar Tabela ou Embalagem
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Arraste arquivos aqui ou toque para abrir a câmera
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => handleAnalyze()}
              disabled={isAnalyzing || !selectedImage}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              {isAnalyzing ? (
                <>
                  <Sprout className="w-4 h-4 animate-spin" />
                  Analisando ingredientes micológicos...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analisar Ingredientes com IA
                </>
              )}
            </button>
          </div>

          {/* Test Presets */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Ingredientes & Rótulos de Teste
            </h3>
            <p className="text-[10px] text-gray-400 mb-3">
              Selecione um exemplo abaixo para simular a leitura do rótulo instantaneamente:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {PRESET_PRODUCTS.map((prod, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedFile(null);
                    setSelectedImage(prod.url);
                    handleAnalyze(prod.url);
                  }}
                  className="group relative overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/5 transition-all p-1.5 flex gap-2 items-center"
                >
                  <img 
                    src={prod.url} 
                    alt={prod.name} 
                    className="w-10 h-10 object-cover rounded-lg shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-[10px] font-bold text-gray-800 dark:text-white truncate group-hover:text-emerald-600">
                      {prod.name}
                    </h4>
                    <p className="text-[8px] text-gray-400 truncate">Ver alérgenos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Dynamic Analysis, Chat & History */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 text-red-700 dark:text-red-300 text-xs flex gap-2"
              >
                <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-12 text-center shadow-xs space-y-4"
              >
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xl absolute inset-0 flex items-center justify-center animate-pulse">🕵️‍♂️</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Escaneando Rótulo e Tabela Nutricional...</h4>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
                    Analisando derivados de trigo, ovos, soro de leite, lecitina de soja e potenciais ameaças ocultas.
                  </p>
                </div>
              </motion.div>
            )}

            {result && result.identified && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-xs space-y-0"
              >
                {/* Upper banner status */}
                <div className={`p-6 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 items-center justify-between ${
                  result.isSafe 
                    ? 'bg-emerald-500/5 dark:bg-emerald-950/10'
                    : 'bg-red-500/5 dark:bg-red-950/10'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {result.isSafe ? (
                        <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 px-2.5 py-0.5 rounded">
                          <ShieldCheck className="w-3.5 h-3.5" /> SEGURO PARA VOCÊ
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 px-2.5 py-0.5 rounded animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 animate-bounce" /> ALERTA DE PERIGO!
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                      {result.productName}
                    </h2>
                    <p className="text-xs text-gray-400 font-semibold">
                      Análise de Alérgenos Alimentares
                    </p>
                  </div>

                  {/* Safety Score */}
                  <div className="flex items-center gap-3 bg-white dark:bg-gray-800/80 px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                    <div className="relative w-10 h-10 shrink-0">
                      <svg className="w-10 h-10 transform -rotate-90">
                        <circle cx="20" cy="20" r="16" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="3" fill="transparent" />
                        <circle cx="20" cy="20" r="16" stroke="currentColor" className={result.score > 75 ? 'text-emerald-500' : 'text-red-500'} strokeWidth="3" fill="transparent" strokeDasharray={100} strokeDashoffset={100 - result.score} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-800 dark:text-white">
                        {result.score}
                      </span>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold text-gray-400 uppercase">Grau de Segurança</div>
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
                        {result.score > 75 ? 'Excelente' : 'Risco de Reação'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Specific threats list (Personal Match) */}
                {result.userSpecificThreats.length > 0 && (
                  <div className="bg-red-600 text-white px-6 py-4 space-y-2">
                    <div className="flex gap-2 items-center">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <h4 className="text-xs font-black uppercase tracking-wider">Alergênicos perigosos para a sua saúde:</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {result.userSpecificThreats.map((t, idx) => (
                        <div key={idx} className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                          <span className="text-[10px] font-black uppercase block tracking-wider text-red-100">
                            Alergênico: {t.allergen}
                          </span>
                          <span className="text-xs font-bold mt-1 block">
                            Origem no ingrediente: {t.ingredientSource}
                          </span>
                          <span className="text-[9px] bg-red-700 px-2 py-0.5 rounded font-black inline-block mt-1 uppercase">
                            Severidade: {t.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis Details */}
                <div className="p-6 space-y-6">
                  
                  {/* Ingredients found block */}
                  <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                      Ingredientes Encontrados
                    </h4>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                      {result.ingredientsFound}
                    </p>
                  </div>

                  {/* General Allergens Block */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Alergênicos Gerais Detectados
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {result.allergensDetected.length === 0 ? (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-bold">Nenhum alérgeno detectado</span>
                      ) : (
                        result.allergensDetected.map((alg, idx) => (
                          <span key={idx} className="text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border border-amber-100 px-2.5 py-1 rounded-lg">
                            ⚠️ {alg}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Detailed Analysis Markdown */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Relatório do Nutricionista</h4>
                    <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed space-y-2 markdown-body">
                      <Markdown>{result.detailedAnalysis}</Markdown>
                    </div>
                  </div>

                  {/* Alternatives Suggested */}
                  {result.alternativesSuggested.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Apple className="w-3.5 h-3.5 text-emerald-500" />
                        Alternativas Seguras Sugeridas
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {result.alternativesSuggested.map((alt, idx) => (
                          <div key={idx} className="bg-emerald-50/15 border border-emerald-100/50 p-2.5 rounded-xl flex gap-2 items-center">
                            <span className="text-emerald-500 text-sm">✓</span>
                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{alt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Chat Panel */}
                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 flex flex-col h-[340px]">
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-gray-900">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                      Chat de Suporte de Alergias
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Alergologia IA</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatHistory.map((chat, cIdx) => (
                      <div key={cIdx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                          chat.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100/50 dark:border-gray-700/50 shadow-xs'
                        }`}>
                          {chat.role === 'model' ? (
                            <div className="markdown-body">
                              <Markdown>{chat.text}</Markdown>
                            </div>
                          ) : (
                            chat.text
                          )}
                        </div>
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-2.5 flex items-center gap-2">
                          <Sprout className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                          <span className="text-xs font-semibold animate-pulse">Consultando alergologista...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Suggestions */}
                  <div className="px-4 py-1.5 flex gap-1.5 overflow-x-auto border-t border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900/60 scrollbar-none">
                    {[
                      "Há risco de contaminação cruzada?",
                      "Esse aditivo tem lactose?",
                      "Existe ingrediente oculto com glúten?",
                      "Como substituir na receita?"
                    ].map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSendChatMessage(sug)}
                        disabled={chatLoading}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 dark:bg-gray-800 dark:hover:bg-emerald-950/40 rounded-lg text-[10px] font-semibold text-gray-600 dark:text-gray-300 shrink-0 transition-all"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChatMessage();
                    }}
                    className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0 flex gap-2"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Pergunte algo sobre o ${result.productName}...`}
                      disabled={chatLoading}
                      className="flex-1 px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || chatLoading}
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {!result && !isAnalyzing && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-emerald-500" />
                    Histórico de Alimentos Verificados
                  </h3>
                  <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
                    {scans.length} verificados
                  </span>
                </div>

                {scansLoading ? (
                  <div className="py-12 text-center text-xs text-gray-400 space-y-2">
                    <Sprout className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                    <p>Carregando histórico de alergias...</p>
                  </div>
                ) : scans.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <span className="text-4xl">🍎</span>
                    <div>
                      <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300">Nenhum rótulo analisado</h4>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">
                        Selecione um exemplo de teste à esquerda ou tire foto de um rótulo para iniciar o rastreamento seguro.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {scans.map((scan) => (
                      <div
                        key={scan.id}
                        onClick={() => handleLoadFromHistory(scan)}
                        className="p-3 border border-gray-100 dark:border-gray-800 hover:border-emerald-500/20 rounded-2xl flex gap-3 items-center justify-between bg-white dark:bg-gray-900 hover:bg-gray-50/50 cursor-pointer transition-all"
                      >
                        <div className="flex gap-3 items-center min-w-0">
                          <img 
                            src={scan.photoURL} 
                            alt={scan.productName} 
                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate">
                              {scan.productName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {scan.isSafe ? (
                                <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                                  ✓ SEGURO
                                </span>
                              ) : (
                                <span className="text-[8px] font-black uppercase tracking-wider bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                                  ⚠️ ALERTA
                                </span>
                              )}
                              <span className="text-[8px] font-bold text-gray-400">
                                {new Date(scan.date).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleFavoriteScan(scan.id, scan.isFavorite)}
                            className={`p-1.5 rounded-full transition-all ${
                              scan.isFavorite 
                                ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' 
                                : 'text-gray-400 hover:text-rose-500'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${scan.isFavorite ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDeleteScan(scan.id)}
                            className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
