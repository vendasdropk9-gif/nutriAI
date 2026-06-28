import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, addDoc, getDocs, deleteDoc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  Camera, Upload, Sparkles, AlertTriangle, ShieldAlert, Heart, Trash2, 
  MapPin, Clock, MessageSquare, Send, CheckCircle2, AlertOctagon, 
  BookOpen, Sprout, Sun, Droplet, HelpCircle, FileText, Compass, ChevronRight, X
} from 'lucide-react';
import Markdown from 'react-markdown';

// Mockup preset images for easy 1-click testing in preview environment
const PRESET_PLANTS = [
  {
    name: "Alecrim",
    scientific: "Rosmarinus officinalis",
    url: "https://images.unsplash.com/photo-1515543904379-3d757afe72e2?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Folhas finas, aroma marcante, muito resistente ao sol."
  },
  {
    name: "Hortelã-Pimenta",
    scientific: "Mentha x piperita",
    url: "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Folhas serrilhadas verdes, refrescante e excelente para chás."
  },
  {
    name: "Arruda",
    scientific: "Ruta graveolens",
    url: "https://images.unsplash.com/photo-1594411130009-40ee47690623?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Folhas verde-azuladas, odor forte e característico."
  },
  {
    name: "Comigo-ninguém-pode",
    scientific: "Dieffenbachia seguine",
    url: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Folhas largas com manchas brancas. ALTAMENTE TÓXICA.",
    isToxic: true
  }
];

interface PlantIdentificationResult {
  identified: boolean;
  popularName: string;
  scientificName: string;
  botanicalFamily: string;
  confidence: number;
  classifications: string[];
  isToxic: boolean;
  warningMessage?: string;
  generalDescription: string;
  info: {
    origin: string;
    biome: string;
    brazilDistribution: string;
  };
  usages: {
    type: string;
    description: string;
    evidenceLevel?: string;
  }[];
  preparation?: {
    partUsed: string;
    method: string;
    cautions: string[];
    contraindications: string[];
  };
  cultivation: {
    soil: string;
    climate: string;
    luminosity: string;
    watering: string;
    fertilization: string;
    plantingSeason: string;
    growthTime: string;
    harvest: string;
  };
  benefits: {
    title: string;
    description: string;
    evidence: 'Forte evidência' | 'Evidência moderada' | 'Uso tradicional' | 'Evidência insuficiente';
  }[];
  curiosities: string[];
}

export function SmartPlantIdentifier() {
  const { user } = useAuth();
  
  // Scanned history from DB
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  
  // Selection/scanning states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PlantIdentificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Interactive Chat State
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  
  // Location capture switch
  const [saveLocation, setSaveLocation] = useState(true);
  const [currentCoords, setCurrentCoords] = useState<string | null>(null);

  // Load Scan History from Firestore
  useEffect(() => {
    if (!user) {
      setHistoryLoading(false);
      return;
    }
    const historyRef = collection(db, 'users', user.uid, 'plantIdentifications');
    const q = query(historyRef, orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setHistory(items);
      setHistoryLoading(false);
    }, (err) => {
      console.error("Error reading scan history:", err);
      setHistoryLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Handle Location permissions & capture
  useEffect(() => {
    if (saveLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentCoords(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        (err) => {
          console.log("Geolocation permission denied or failed:", err);
          setCurrentCoords(null);
        }
      );
    } else {
      setCurrentCoords(null);
    }
  }, [saveLocation]);

  // Scroll to bottom of result-chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Upload handler (supports drag and drop & click)
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

  // Drag-and-drop support
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

  // Process selected image (either preset URL or local file)
  const handleAnalyze = async (customUrl?: string) => {
    const activeImage = customUrl || selectedImage;
    if (!activeImage) {
      setError("Por favor, tire uma foto, selecione uma da galeria ou use uma das fotos de teste.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setChatHistory([]);

    try {
      let imagePayload = activeImage;
      
      // If it's a file from user, convert to Base64
      if (selectedFile && !customUrl) {
        imagePayload = await fileToBase64(selectedFile);
      }

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'identifyPlant',
          args: [imagePayload, selectedFile?.type || "image/jpeg"]
        })
      });

      if (!response.ok) {
        throw new Error("Erro na comunicação com o servidor de inteligência artificial.");
      }

      const data: PlantIdentificationResult = await response.json();
      setResult(data);

      // Auto-save scan to Firestore if user is signed in & identification succeeded
      if (user && data.identified) {
        await addDoc(collection(db, 'users', user.uid, 'plantIdentifications'), {
          photoURL: customUrl || activeImage,
          name: data.popularName,
          scientificName: data.scientificName,
          confidence: data.confidence,
          classifications: data.classifications,
          isToxic: data.isToxic,
          date: new Date().toISOString(),
          location: saveLocation ? (currentCoords || "Localização ativa") : "Local não autorizado",
          isFavorite: false,
          result: data // persist full analysis data
        });
      }

      // Initialize plant specific interactive chat
      if (data.identified) {
        setChatHistory([
          {
            role: 'model',
            text: `Identifiquei a planta **${data.popularName}** (${data.scientificName}) com **${data.confidence}%** de confiança. 🌿\n\nEstou pronta para responder suas dúvidas sobre ela. Pergunte o que quiser ou clique em uma das sugestões abaixo!`
          }
        ]);
      }
    } catch (err: any) {
      console.error("Error analyzing plant:", err);
      setError("Falha ao analisar a imagem. Verifique a iluminação e a nitidez da foto e tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Send message specifically about the identified plant
  const handleSendChatMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || chatLoading || !result) return;

    setChatInput('');
    const userMsg = { role: 'user' as const, text: textToSend };
    setChatHistory(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'chatAboutIdentifiedPlant',
          args: [result.popularName, chatHistory, textToSend]
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(prev => [...prev, { role: 'model', text: data.text }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'model', text: "Erro ao consultar a IA botânica. Tente novamente." }]);
      }
    } catch (err) {
      console.error("Identified chat error:", err);
      setChatHistory(prev => [...prev, { role: 'model', text: "Erro de conexão com o servidor botânico do NutriAI." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Toggle favorite scan in history
  const toggleFavoriteScan = async (scanId: string, currentFav: boolean) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'plantIdentifications', scanId);
    try {
      await updateDoc(docRef, { isFavorite: !currentFav });
    } catch (err) {
      console.error("Error toggling favorite scan:", err);
    }
  };

  // Delete scan from history
  const handleDeleteScan = async (scanId: string) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'plantIdentifications', scanId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Error deleting scan:", err);
    }
  };

  // Load a scan from history into active results
  const handleLoadFromHistory = (scan: any) => {
    setSelectedImage(scan.photoURL);
    setSelectedFile(null);
    setResult(scan.result);
    setError(null);
    setChatHistory([
      {
        role: 'model',
        text: `Carreguei os dados da identificação de **${scan.name}** feita em ${new Date(scan.date).toLocaleDateString('pt-BR')}. Como posso ajudar com mais informações sobre ela?`
      }
    ]);
  };

  return (
    <div className="space-y-6" id="smart_plant_identifier_main">
      {/* Educational warning about non-100% certainty - highly visually prominent */}
      <div className="bg-red-50/90 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 rounded-2xl p-4 flex gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-wider mb-1">
            ⚠️ Alerta Crítico de Segurança Botânica
            </h4>
          <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
            Identificações visuais por inteligência artificial **podem conter erros estruturais e nunca devem ser tidas como 100% exatas**. 
            NUNCA consuma, infunda ou utilize topicamente qualquer planta silvestre ou desconhecida com base apenas na análise deste aplicativo. 
            Em caso de dúvida terapêutica, consulte sempre um botânico ou profissional de saúde qualificado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Photo selection & Presets */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-500" />
              Fotografe ou envie uma foto
            </h3>

            {/* Drag and drop upload zone */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                selectedImage 
                  ? 'border-emerald-500/35 bg-emerald-50/5 dark:bg-emerald-950/5' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-emerald-500/30 hover:bg-gray-50/50 dark:hover:bg-gray-800/40'
              }`}
              onClick={() => document.getElementById('camera-file-input')?.click()}
            >
              <input 
                type="file" 
                id="camera-file-input"
                accept="image/*"
                capture="environment" // trigger smartphone camera on mobile
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedImage ? (
                <div className="w-full space-y-3">
                  <div className="relative h-44 w-full rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800">
                    <img 
                      src={selectedImage} 
                      alt="Uploaded preview" 
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
                      className="absolute top-2 right-2 p-1.5 bg-black/55 text-white rounded-full hover:bg-black/85 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500">Imagem carregada com sucesso!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-full text-emerald-600 dark:text-emerald-400 inline-block">
                    <Upload className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Tirar foto ou abrir galeria
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Arraste e solte uma imagem aqui ou toque para selecionar
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Location Checkbox */}
            <div className="mt-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100/55 dark:border-gray-700/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Salvar coordenadas do scan
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={saveLocation} 
                  onChange={(e) => setSaveLocation(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Actions Panel */}
            <div className="mt-4">
              <button
                onClick={() => handleAnalyze()}
                disabled={isAnalyzing || !selectedImage}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/10"
                id="btn_analyze_plant"
              >
                {isAnalyzing ? (
                  <>
                    <Sprout className="w-4 h-4 animate-spin" />
                    Analisando morfologia da planta...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Identificar Planta com IA
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Preset Cards - Outstanding UX for preview */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Imagens de Teste Rápido
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-4 leading-normal">
              Selecione um dos exemplos botânicos abaixo para testar instantaneamente a análise multimodal da IA:
            </p>

            <div className="grid grid-cols-2 gap-3">
              {PRESET_PLANTS.map((plant, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedFile(null);
                    setSelectedImage(plant.url);
                    handleAnalyze(plant.url);
                  }}
                  className={`group relative overflow-hidden rounded-xl border cursor-pointer transition-all ${
                    plant.isToxic
                      ? 'border-red-100 dark:border-red-950/40 hover:border-red-500 hover:bg-red-50/10'
                      : 'border-gray-100 dark:border-gray-800 hover:border-emerald-500 hover:bg-emerald-50/10'
                  }`}
                >
                  <div className="h-24 bg-gray-50 dark:bg-gray-800 overflow-hidden relative">
                    <img 
                      src={plant.url} 
                      alt={plant.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {plant.isToxic && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-600/90 text-[8px] font-bold text-white rounded uppercase tracking-wider">
                        Perigo
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h4 className="text-xs font-bold text-gray-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {plant.name}
                    </h4>
                    <p className="text-[9px] text-gray-400 italic mt-0.5">{plant.scientific}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Scan Output Results & Active Chat */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Scanning Progress Loader or Error Banner */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-xs flex gap-2.5 items-start"
              >
                <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-12 text-center shadow-sm space-y-4"
              >
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <Sprout className="w-6 h-6 text-emerald-500 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Análise de Morfologia Botânica</h4>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">
                    Avaliando formato das folhas, flores, ramificações, espinhos e texturas na imagem...
                  </p>
                </div>
              </motion.div>
            )}

            {/* Active Output Result Details */}
            {result && result.identified && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm"
              >
                {/* Result header with confidence level */}
                <div className={`p-6 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 items-center justify-between ${
                  result.isToxic 
                    ? 'bg-red-500/10 dark:bg-red-950/20' 
                    : 'bg-emerald-500/5 dark:bg-emerald-950/10'
                }`}>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Identificação Concluída
                    </span>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                      {result.popularName}
                    </h2>
                    <p className="text-xs text-gray-400 italic mt-0.5">
                      {result.scientificName} • Família {result.botanicalFamily}
                    </p>
                  </div>

                  {/* Confidence Ring Gauge */}
                  <div className="flex items-center gap-3 bg-white dark:bg-gray-800/80 px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                    <div className="relative w-10 h-10 shrink-0">
                      <svg className="w-10 h-10 transform -rotate-90">
                        <circle cx="20" cy="20" r="16" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="3" fill="transparent" />
                        <circle cx="20" cy="20" r="16" stroke="currentColor" className={result.confidence > 80 ? 'text-emerald-500' : result.confidence > 60 ? 'text-amber-500' : 'text-red-500'} strokeWidth="3" fill="transparent" strokeDasharray={100} strokeDashoffset={100 - result.confidence} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-gray-800 dark:text-white">
                        {result.confidence}%
                      </span>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400">Confiança</div>
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
                        {result.confidence > 85 ? 'Excelente' : 'Moderada'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toxic visual banner highlight */}
                {result.isToxic && (
                  <div className="bg-red-600 text-white px-6 py-3.5 flex gap-3 items-center">
                    <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wider">Aviso de Toxicidade Extrema</div>
                      <p className="text-[11px] opacity-90 leading-tight">
                        {result.warningMessage || "Esta planta pode ser tóxica ou venenosa se consumida ou tocada."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-6">
                  {/* General Description */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Resumo Botânico</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {result.generalDescription}
                    </p>
                  </div>

                  {/* Classification Badges */}
                  <div className="flex flex-wrap gap-2">
                    {result.classifications.map((cl, idx) => (
                      <span 
                        key={idx} 
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          cl.includes('tóxica') || cl.includes('venenosa')
                            ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                            : cl.includes('Medicinal')
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700'
                        }`}
                      >
                        🌿 {cl}
                      </span>
                    ))}
                  </div>

                  {/* Taxonomy info grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Origem</span>
                      <p className="text-xs font-bold text-gray-800 dark:text-white mt-0.5">{result.info.origin}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Bioma de Ocorrência</span>
                      <p className="text-xs font-bold text-gray-800 dark:text-white mt-0.5">{result.info.biome}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Distribuição no BR</span>
                      <p className="text-xs font-bold text-gray-800 dark:text-white mt-0.5">{result.info.brazilDistribution}</p>
                    </div>
                  </div>

                  {/* Usages Section with Evidence level */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Usos e Aplicações Práticas</h4>
                    <div className="space-y-3">
                      {result.usages.map((use, idx) => (
                        <div key={idx} className="p-3 border border-gray-100 dark:border-gray-800 rounded-xl flex items-start gap-2.5 bg-white dark:bg-gray-900 shadow-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-gray-800 dark:text-white">{use.type}</span>
                              {use.evidenceLevel && (
                                <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded">
                                  {use.evidenceLevel}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{use.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preparation traditional guide */}
                  {result.preparation && !result.isToxic && (
                    <div className="border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 bg-emerald-50/5 dark:bg-emerald-950/5">
                      <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4" />
                        Parte Utilizada e Preparo Tradicional
                      </h4>
                      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                        <p><strong>Parte utilizada:</strong> {result.preparation.partUsed}</p>
                        <p><strong>Preparo:</strong> {result.preparation.method}</p>
                        
                        {result.preparation.cautions?.length > 0 && (
                          <div className="mt-2.5">
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Cuidados Necessários:</span>
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-[11px]">
                              {result.preparation.cautions.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                          </div>
                        )}

                        {result.preparation.contraindications?.length > 0 && (
                          <div className="mt-2">
                            <span className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider">Contraindicações Cruciais:</span>
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-[11px] text-red-600 dark:text-red-400">
                              {result.preparation.contraindications.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cultivation recommendations */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Guia de Cultivo Caseiro</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <Sprout className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-bold uppercase">Solo</span>
                        </div>
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 mt-1 font-medium leading-tight">{result.cultivation.soil}</p>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-1.5 text-amber-500">
                          <Sun className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-bold uppercase">Luz</span>
                        </div>
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 mt-1 font-medium leading-tight">{result.cultivation.luminosity}</p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-1.5 text-blue-400">
                          <Droplet className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-bold uppercase">Rega</span>
                        </div>
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 mt-1 font-medium leading-tight">{result.cultivation.watering}</p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-1.5 text-indigo-400">
                          <Compass className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-bold uppercase">Colheita</span>
                        </div>
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 mt-1 font-medium leading-tight">{result.cultivation.harvest}</p>
                      </div>
                    </div>
                  </div>

                  {/* Scientific Evidence Benefits classification */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Benefícios e Grau de Evidência</h4>
                    <div className="space-y-2.5">
                      {result.benefits.map((ben, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-xl">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold text-gray-800 dark:text-white">{ben.title}</span>
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                              ben.evidence === 'Forte evidência'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : ben.evidence === 'Evidência moderada'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : ben.evidence === 'Uso tradicional'
                                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}>
                              {ben.evidence === 'Forte evidência' ? '🟢 Forte Evidência' : ben.evidence === 'Evidência moderada' ? '🟡 Evidência Moderada' : ben.evidence === 'Uso tradicional' ? '🟠 Uso Tradicional' : '🔴 Evidência Insuficiente'}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">{ben.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botanical curiosities */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Curiosidades e Histórico</h4>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                      {result.curiosities.map((cur, i) => <li key={i}>{cur}</li>)}
                    </ul>
                  </div>

                </div>

                {/* Interactive Q&A chat specific about this identified plant */}
                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col h-[350px]">
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Chat Interativo: Dúvidas sobre o {result.popularName}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">IA Botânica</span>
                  </div>

                  {/* Messages scroll */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatHistory.map((chatMsg, cIdx) => (
                      <div key={cIdx} className={`flex ${chatMsg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                          chatMsg.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100/50 dark:border-gray-700/50 shadow-xs'
                        }`}>
                          {chatMsg.role === 'model' ? (
                            <div className="markdown-body">
                              <Markdown>{chatMsg.text}</Markdown>
                            </div>
                          ) : (
                            chatMsg.text
                          )}
                        </div>
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-2.5 flex items-center gap-2">
                          <Sprout className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                          <span className="text-xs font-medium animate-pulse">Pesquisando evidências fitoterápicas...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Prefilled smart suggestions */}
                  <div className="px-4 py-2 flex flex-wrap gap-1.5 overflow-x-auto border-t border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900/60 scrollbar-none">
                    {[
                      "Posso fazer chá desta planta?",
                      "Ela é venenosa?",
                      "Como plantar?",
                      "Precisa de muito sol?",
                      "Pode ficar em vaso?"
                    ].map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSendChatMessage(sug)}
                        disabled={chatLoading}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 dark:bg-gray-800 dark:hover:bg-emerald-950/40 rounded-lg text-[10px] font-semibold text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-300 shrink-0 transition-all border border-transparent hover:border-emerald-200/50"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>

                  {/* Input form */}
                  <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendChatMessage();
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={`Pergunte algo sobre o ${result.popularName}...`}
                        disabled={chatLoading}
                        className="flex-1 px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim() || chatLoading}
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold transition-all shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>

              </motion.div>
            )}

            {/* If confidence low or identified failed */}
            {result && !result.identified && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-900/40 rounded-3xl p-6 text-center space-y-4"
              >
                <HelpCircle className="w-12 h-12 text-amber-500 dark:text-amber-600 mx-auto animate-bounce" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">Identificação Inconclusiva</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 max-w-sm mx-auto leading-relaxed">
                    Não foi possível identificar esta planta com segurança. Tire outra foto com melhor iluminação, mais próxima das folhas ou consulte um especialista botânico para evitar riscos de acidentes fitoterápicos.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Empty view state / History of Scans */}
            {!result && !isAnalyzing && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    Histórico de Identificações
                  </h3>
                  <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
                    {history.length} scans salvos
                  </span>
                </div>

                {historyLoading ? (
                  <div className="py-12 text-center text-xs text-gray-400 space-y-2">
                    <Sprout className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                    <p>Carregando histórico do servidor...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <Compass className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300">Nenhum scan recente</h4>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">
                        Tire sua primeira foto acima ou use uma imagem de teste para preencher seu histórico botânico pessoal!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {history.map((scan) => (
                      <div
                        key={scan.id}
                        className="p-3 border border-gray-100 dark:border-gray-800 hover:border-emerald-500/20 dark:hover:border-emerald-500/10 rounded-2xl flex gap-3 items-center justify-between bg-white dark:bg-gray-900 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 cursor-pointer transition-all"
                        onClick={() => handleLoadFromHistory(scan)}
                      >
                        <div className="flex gap-3 items-center">
                          <img 
                            src={scan.photoURL} 
                            alt={scan.name} 
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-gray-800 dark:text-white">
                              {scan.name}
                            </h4>
                            <p className="text-[9px] text-gray-400 italic mt-0.5">
                              {scan.scientificName || "Nome científico não disponível"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded">
                                {scan.confidence}% confiança
                              </span>
                              {scan.isToxic && (
                                <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded">
                                  Tóxica
                                </span>
                              )}
                              <span className="text-[8px] text-gray-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(scan.date).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions: delete & favorite */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleFavoriteScan(scan.id, scan.isFavorite)}
                            className={`p-1.5 rounded-full transition-all ${
                              scan.isFavorite 
                                ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' 
                                : 'text-gray-400 hover:text-rose-500 hover:bg-gray-50'
                            }`}
                            title="Favoritar identificação"
                          >
                            <Heart className={`w-3.5 h-3.5 ${scan.isFavorite ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDeleteScan(scan.id)}
                            className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                            title="Excluir do histórico"
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
