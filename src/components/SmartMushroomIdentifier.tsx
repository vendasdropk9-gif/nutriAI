import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, addDoc, deleteDoc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  Camera, Upload, Sparkles, AlertTriangle, Heart, Trash2, 
  MapPin, Clock, MessageSquare, Send, CheckCircle2, AlertOctagon, 
  BookOpen, Sprout, Sun, Droplet, HelpCircle, Compass, X
} from 'lucide-react';
import Markdown from 'react-markdown';

// Mockup preset images for easy 1-click testing of mushrooms
const PRESET_MUSHROOMS = [
  {
    name: "Shimeji Preto",
    scientific: "Pleurotus ostreatus",
    url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Cresce em pencas/buquês, altamente saboroso e comestível.",
    edibility: "Comestível"
  },
  {
    name: "Champignon de Paris",
    scientific: "Agaricus bisporus",
    url: "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Chapéu arredondado, branco-creme. O cogumelo mais consumido do mundo.",
    edibility: "Comestível"
  },
  {
    name: "Amanita Muscaria",
    scientific: "Amanita muscaria",
    url: "https://images.unsplash.com/photo-1590004953392-5aba2e72269a?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Chapéu vermelho brilhante com escamas brancas. Altamente tóxico e alucinógeno.",
    edibility: "Tóxico"
  },
  {
    name: "Orelha-de-pau",
    scientific: "Pycnoporus sanguineus",
    url: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=400&h=400",
    description: "Textura lenhosa, cresce em troncos em decomposição. Não comestível.",
    edibility: "Desconhecido"
  }
];

interface MushroomIdentificationResult {
  identified: boolean;
  popularName: string;
  scientificName: string;
  confidence: number;
  edibility: 'Comestível' | 'Tóxico' | 'Desconhecido';
  warningMessage: string;
  habitat: string;
  growingSeason: string;
  generalDescription: string;
  curiosities: string[];
  benefitsOrProperties: string[];
  features: {
    cap: string;
    gills: string;
    stem: string;
    sporePrint: string;
  };
}

export function SmartMushroomIdentifier() {
  const { user } = useAuth();
  
  // Scanned history from DB
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  
  // Selection/scanning states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MushroomIdentificationResult | null>(null);
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
    const historyRef = collection(db, 'users', user.uid, 'mushroomIdentifications');
    const q = query(historyRef, orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setHistory(items);
      setHistoryLoading(false);
    }, (err) => {
      console.warn("Error reading mushroom scan history:", err);
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

  // Scroll to bottom of chat
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

  // Upload handler
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

  // Drag-and-drop
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

  // Analyze mushroom via AI
  const handleAnalyze = async (customUrl?: string) => {
    const activeImage = customUrl || selectedImage;
    if (!activeImage) {
      setError("Por favor, tire uma foto de um cogumelo, selecione um arquivo ou use os de teste.");
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

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'identifyMushroom',
          args: [imagePayload, selectedFile?.type || "image/jpeg"]
        })
      });

      if (!response.ok) {
        throw new Error("Erro na comunicação com o servidor micológico.");
      }

      const data: MushroomIdentificationResult = await response.json();
      setResult(data);

      // Auto-save to history
      if (user && data.identified) {
        await addDoc(collection(db, 'users', user.uid, 'mushroomIdentifications'), {
          photoURL: customUrl || activeImage,
          name: data.popularName,
          scientificName: data.scientificName,
          confidence: data.confidence,
          edibility: data.edibility,
          date: new Date().toISOString(),
          location: saveLocation ? (currentCoords || "Coordenadas Capturadas") : "Local Omitido",
          isFavorite: false,
          result: data
        });
      }

      if (data.identified) {
        setChatHistory([
          {
            role: 'model',
            text: `Análise micológica concluída para **${data.popularName}** (${data.scientificName}). 
Classificado como **${data.edibility}** com nível de confiança de **${data.confidence}%**.

Estou pronto para responder dúvidas adicionais sobre habitat, toxicidade ou curiosidades deste exemplar.`
          }
        ]);
      }
    } catch (err: any) {
      console.warn("Mushroom analysis error:", err);
      setError("Não foi possível analisar a imagem. Tente tirar uma foto mais nítida mostrando o chapéu e o caule do cogumelo.");
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
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'chatAboutIdentifiedMushroom',
          args: [result.popularName, chatHistory, textToSend]
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(prev => [...prev, { role: 'model', text: data.text }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'model', text: "Ocorreu um erro ao consultar o micologista." }]);
      }
    } catch (err) {
      console.warn("Chat error:", err);
      setChatHistory(prev => [...prev, { role: 'model', text: "Erro de rede ao conectar com o serviço botânico." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleFavorite = async (id: string, current: boolean) => {
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'mushroomIdentifications', id);
      await updateDoc(ref, { isFavorite: !current });
    } catch (err) {
      console.warn(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'mushroomIdentifications', id);
      await deleteDoc(ref);
    } catch (err) {
      console.warn(err);
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
        text: `Carreguei os detalhes micológicos salvos para **${scan.name}** do seu histórico.`
      }
    ]);
  };

  return (
    <div className="space-y-6" id="mushroom_identifier_container">
      {/* Absolute Safety Warning Block */}
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 flex gap-3 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-extrabold text-red-800 dark:text-red-400 uppercase tracking-wider mb-1">
            🚨 AVISO CRÍTICO DE SEGURANÇA MICOLÓGICA
          </h4>
          <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed font-medium">
            Muitos cogumelos mortais e severamente tóxicos possuem sósias visuais idênticos a espécies comestíveis comuns. 
            **A identificação por imagem de IA nunca substitui a avaliação física de um micologista profissional.** 
            NUNCA consuma, cozinhe ou toque em cogumelos selvagens com base exclusiva nas sugestões deste aplicativo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: input */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-500" />
              Tirar Foto do Cogumelo
            </h3>

            {/* Upload Zone */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('mushroom-file-input')?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                selectedImage 
                  ? 'border-emerald-500/35 bg-emerald-50/5 dark:bg-emerald-950/5' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-emerald-500/30 hover:bg-gray-50/50 dark:hover:bg-gray-800/40'
              }`}
            >
              <input 
                type="file" 
                id="mushroom-file-input"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedImage ? (
                <div className="w-full space-y-3">
                  <div className="relative h-44 w-full rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800">
                    <img 
                      src={selectedImage} 
                      alt="Mushroom upload preview" 
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
                  <p className="text-[11px] text-gray-500">Imagem selecionada com sucesso!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-full text-emerald-600 dark:text-emerald-400 inline-block">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Fotografar ou Enviar Imagem
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Arraste uma foto aqui ou clique para navegar
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Save location options */}
            <div className="mt-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100/55 dark:border-gray-700/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Mapear coordenadas do cogumelo
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

            {/* Launch trigger button */}
            <div className="mt-4">
              <button
                onClick={() => handleAnalyze()}
                disabled={isAnalyzing || !selectedImage}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isAnalyzing ? (
                  <>
                    <Sprout className="w-4 h-4 animate-spin" />
                    Analisando estrutura fúngica...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Identificar Cogumelo por IA
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preset Images */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Amostras de Cogumelos para Teste
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-4">
              Selecione um exemplo abaixo para simular o processo micológico completo:
            </p>

            <div className="grid grid-cols-2 gap-3">
              {PRESET_MUSHROOMS.map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedFile(null);
                    setSelectedImage(m.url);
                    handleAnalyze(m.url);
                  }}
                  className={`group relative overflow-hidden rounded-xl border cursor-pointer transition-all ${
                    m.edibility === 'Tóxico'
                      ? 'border-red-100 dark:border-red-950/30 hover:border-red-500 hover:bg-red-50/10'
                      : 'border-gray-100 dark:border-gray-800 hover:border-emerald-500 hover:bg-emerald-50/10'
                  }`}
                >
                  <div className="h-24 bg-gray-50 dark:bg-gray-800 overflow-hidden relative">
                    <img 
                      src={m.url} 
                      alt={m.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className={`absolute top-1 right-1 px-1.5 py-0.5 text-[8px] font-bold text-white rounded uppercase tracking-wider ${
                      m.edibility === 'Comestível' ? 'bg-emerald-600' : m.edibility === 'Tóxico' ? 'bg-red-600' : 'bg-orange-600'
                    }`}>
                      {m.edibility}
                    </div>
                  </div>
                  <div className="p-2">
                    <h4 className="text-xs font-bold text-gray-800 dark:text-white group-hover:text-emerald-600 transition-colors">
                      {m.name}
                    </h4>
                    <p className="text-[9px] text-gray-400 italic mt-0.5">{m.scientific}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: results & Q&A chat */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-xs flex gap-2"
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
                  <span className="text-xl absolute inset-0 flex items-center justify-center animate-pulse">🍄</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Escaneando características morfológicas...</h4>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
                    Analisando padrão do chapéu, presença de lâminas/poros, formato do estipe e edibilidade segura.
                  </p>
                </div>
              </motion.div>
            )}

            {result && result.identified && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-xs"
              >
                {/* Upper banner edibility */}
                <div className={`p-6 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 items-center justify-between ${
                  result.edibility === 'Comestível'
                    ? 'bg-emerald-500/5 dark:bg-emerald-950/10'
                    : result.edibility === 'Tóxico'
                    ? 'bg-red-500/5 dark:bg-red-950/10'
                    : 'bg-amber-500/5 dark:bg-amber-950/10'
                }`}>
                  <div>
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                      result.edibility === 'Comestível'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        : result.edibility === 'Tóxico'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                    }`}>
                      🍄 {result.edibility}
                    </span>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1.5">
                      {result.popularName}
                    </h2>
                    <p className="text-xs text-gray-400 italic mt-0.5">
                      {result.scientificName}
                    </p>
                  </div>

                  {/* Confidence */}
                  <div className="flex items-center gap-3 bg-white dark:bg-gray-800/80 px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                    <div className="relative w-10 h-10 shrink-0">
                      <svg className="w-10 h-10 transform -rotate-90">
                        <circle cx="20" cy="20" r="16" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="3" fill="transparent" />
                        <circle cx="20" cy="20" r="16" stroke="currentColor" className={result.confidence > 80 ? 'text-emerald-500' : 'text-amber-500'} strokeWidth="3" fill="transparent" strokeDasharray={100} strokeDashoffset={100 - result.confidence} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-800 dark:text-white">
                        {result.confidence}%
                      </span>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold text-gray-400 uppercase">Segurança</div>
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
                        {result.confidence > 80 ? 'Confiável' : 'Revisar foto'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning message always visible */}
                <div className="bg-red-600 text-white px-6 py-4 flex gap-3 items-center">
                  <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
                  <div className="text-xs font-semibold leading-tight">
                    {result.warningMessage || "ATENÇÃO: Nunca ingira nenhum cogumelo silvestre sem certificação oficial."}
                  </div>
                </div>

                {/* Scientific metadata */}
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição Geral</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {result.generalDescription}
                    </p>
                  </div>

                  {/* Habitat & growing season */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Habitat Natural</span>
                      <p className="text-xs font-bold text-gray-800 dark:text-white mt-1">
                        🌲 {result.habitat}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Época de Crescimento</span>
                      <p className="text-xs font-bold text-gray-800 dark:text-white mt-1">
                        📅 {result.growingSeason}
                      </p>
                    </div>
                  </div>

                  {/* Anatomical structures */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Estruturas de Identificação Visual</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Chapéu (Píleo)</span>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{result.features.cap}</p>
                      </div>
                      <div className="p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Lâminas / Poros</span>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{result.features.gills}</p>
                      </div>
                      <div className="p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Caule (Estipe)</span>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{result.features.stem}</p>
                      </div>
                      <div className="p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Esporada (Spore Print)</span>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{result.features.sporePrint}</p>
                      </div>
                    </div>
                  </div>

                  {/* Benefits & properties */}
                  {result.benefitsOrProperties?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Propriedades Conhecidas</h4>
                      <ul className="space-y-1.5 pl-1">
                        {result.benefitsOrProperties.map((b, i) => (
                          <li key={i} className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2">
                            <span className="text-emerald-500 shrink-0 mt-0.5">✦</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Curiosities */}
                  {result.curiosities?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Curiosidades do Fungo</h4>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                        {result.curiosities.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Q&A chat specific about this mushroom */}
                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 flex flex-col h-[340px]">
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-gray-900">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                      Pergunte ao Micologista IA
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Suporte Fungi</span>
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
                          <span className="text-xs font-semibold animate-pulse">Avaliando dados taxonômicos...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Suggestions */}
                  <div className="px-4 py-1.5 flex gap-1.5 overflow-x-auto border-t border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900/60 scrollbar-none">
                    {[
                      "Como diferenciar de um sósia venenoso?",
                      "Onde ele cresce?",
                      "Existe uso medicinal?",
                      "Como preparar de forma segura?"
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
                      placeholder={`Pergunte algo sobre o ${result.popularName}...`}
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
                    <Clock className="w-4 h-4 text-emerald-500" />
                    Histórico de Cogumelos Escaneados
                  </h3>
                  <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
                    {history.length} scans
                  </span>
                </div>

                {historyLoading ? (
                  <div className="py-12 text-center text-xs text-gray-400 space-y-2">
                    <Sprout className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                    <p>Conectando ao histórico micológico...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <span className="text-4xl">🍄</span>
                    <div>
                      <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300">Nenhum cogumelo salvo</h4>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">
                        Selecione um exemplo de teste à esquerda ou faça upload de um cogumelo para iniciar sua coleção.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {history.map((scan) => (
                      <div
                        key={scan.id}
                        onClick={() => handleLoadFromHistory(scan)}
                        className="p-3 border border-gray-100 dark:border-gray-800 hover:border-emerald-500/20 dark:hover:border-emerald-500/10 rounded-2xl flex gap-3 items-center justify-between bg-white dark:bg-gray-900 hover:bg-gray-50/50 cursor-pointer transition-all"
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
                              {scan.scientificName}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded ${
                                scan.edibility === 'Comestível'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : scan.edibility === 'Tóxico'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}>
                                {scan.edibility}
                              </span>
                              <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                {scan.confidence}% conf.
                              </span>
                              <span className="text-[8px] text-gray-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(scan.date).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleFavorite(scan.id, scan.isFavorite)}
                            className={`p-1.5 rounded-full transition-all ${
                              scan.isFavorite 
                                ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' 
                                : 'text-gray-400 hover:text-rose-500 hover:bg-gray-50'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${scan.isFavorite ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDelete(scan.id)}
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
