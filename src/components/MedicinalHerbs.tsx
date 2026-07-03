import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';
import { 
  Search, Filter, Heart, Leaf, BookOpen, AlertTriangle, MessageSquare, 
  Compass, ShieldAlert, Sparkles, X, Check, Droplet, Sun, Sprout, 
  ExternalLink, HelpCircle, Send, ArrowLeft, Info, BookMarked, Camera
} from 'lucide-react';
import Markdown from 'react-markdown';
import { SmartPlantIdentifier } from './SmartPlantIdentifier';
import { SmartMushroomIdentifier } from './SmartMushroomIdentifier';

interface Indication {
  name: string;
  evidence: string;
  badge: string;
}

interface Preparation {
  amount: string;
  water: string;
  temperature: string;
  time: string;
  strain: string;
  dosage: string;
}

interface Dosage {
  traditional: string;
  limit: string;
  maxDuration: string;
}

interface Contraindications {
  warnings: string[];
}

interface Cultivation {
  soil: string;
  luminosity: string;
  watering: string;
  climate: string;
}

interface Herb {
  id: string;
  popularName: string;
  scientificName: string;
  botanicalFamily: string;
  otherNames: string[];
  description: string;
  origin: string;
  biome: string;
  states: string[];
  harvestSeason: string;
  partUsed: string;
  properties: string[];
  indications: Indication[];
  preparation: Preparation;
  dosage: Dosage;
  contraindications: Contraindications;
  compounds: string[];
  cultivation: Cultivation;
  curiosities: string[];
  sources: string[];
  photoURL: string;
  gallery: string[];
}

export function MedicinalHerbs() {
  const { user } = useAuth();
  const [herbs, setHerbs] = useState<Herb[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBiome, setSelectedBiome] = useState<string>('all');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('all');
  const [selectedEvidence, setSelectedEvidence] = useState<string>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedHerb, setSelectedHerb] = useState<Herb | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'use' | 'extra'>('info');
  const [activeSubTab, setActiveSubTab] = useState<'encyclopedia' | 'chat' | 'identifier' | 'mushroom'>('encyclopedia');
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Chatbot states
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
    {
      role: 'model',
      text: "Olá! Sou a **IA Botânica do NutriAI** 🌿. Estou aqui para responder qualquer dúvida sobre ervas medicinais, chás e fitoterapia baseada exclusivamente em evidências científicas comprovadas.\n\nComo posso ajudar seu bem-estar hoje? Experimente me perguntar sobre contraindicações do Guaco ou como preparar o chá de Alecrim!"
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Load herbs
  useEffect(() => {
    async function fetchHerbs() {
      try {
        const response = await fetch('/api/herbs');
        if (response.ok) {
          const data = await response.json();
          setHerbs(data);
        } else {
          console.error("Failed to load herbs from REST endpoint.");
        }
      } catch (err) {
        console.error("Error fetching herbs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHerbs();
  }, []);

  // Listen to user favorites in Firestore
  useEffect(() => {
    if (!user) return;
    const favsRef = collection(db, 'users', user.uid, 'favoriteHerbs');
    const unsubscribe = onSnapshot(favsRef, (snapshot) => {
      const favIds: string[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.herbId) favIds.push(data.herbId);
      });
      setFavorites(favIds);
    }, (error) => {
      console.error("Error fetching favorites:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  // Toggle favorite
  const toggleFavorite = async (herbId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const isFav = favorites.includes(herbId);
    const favDocRef = doc(db, 'users', user.uid, 'favoriteHerbs', herbId);
    try {
      if (isFav) {
        await deleteDoc(favDocRef);
      } else {
        await setDoc(favDocRef, {
          herbId,
          savedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Error writing favorite to Firestore:", err);
    }
  };

  // Handle send message to chatbot
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    setChatInput('');
    const userMsg = { role: 'user' as const, text: textToSend };
    setChatHistory(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'chatWithHerbsAssistant',
          args: [
            chatHistory,
            textToSend
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(prev => [...prev, { role: 'model', text: data.text || "Desculpe, não consegui formular uma resposta no momento." }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'model', text: "Erro ao processar sua solicitação no servidor. Certifique-se de que a conexão está ativa." }]);
      }
    } catch (err) {
      console.error("Error calling gemini proxy:", err);
      setChatHistory(prev => [...prev, { role: 'model', text: "Erro de comunicação com o servidor de IA. Tente novamente mais tarde." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Extract all unique biomes and purposes for filtering
  const allBiomes = Array.from(new Set(herbs.map(h => h.biome).filter(Boolean)));
  const allPurposes = Array.from(
    new Set(
      herbs.flatMap(h => h.indications?.map(ind => ind.name) || [])
    )
  );

  // Filter logic
  const filteredHerbs = herbs.filter(herb => {
    const queryLower = searchQuery.toLowerCase();
    const matchesSearch = 
      herb.popularName.toLowerCase().includes(queryLower) ||
      herb.scientificName.toLowerCase().includes(queryLower) ||
      herb.botanicalFamily.toLowerCase().includes(queryLower) ||
      herb.description.toLowerCase().includes(queryLower) ||
      herb.otherNames.some(name => name.toLowerCase().includes(queryLower)) ||
      herb.properties.some(prop => prop.toLowerCase().includes(queryLower)) ||
      herb.indications.some(ind => ind.name.toLowerCase().includes(queryLower));

    const matchesBiome = selectedBiome === 'all' || herb.biome === selectedBiome;
    const matchesPurpose = selectedPurpose === 'all' || herb.indications.some(ind => ind.name === selectedPurpose);
    
    let matchesEvidence = true;
    if (selectedEvidence !== 'all') {
      matchesEvidence = herb.indications.some(ind => {
        if (selectedEvidence === 'strong') return ind.evidence === 'Forte evidência científica';
        if (selectedEvidence === 'moderate') return ind.evidence === 'Evidência moderada';
        if (selectedEvidence === 'traditional') return ind.evidence === 'Uso tradicional';
        return true;
      });
    }

    return matchesSearch && matchesBiome && matchesPurpose && matchesEvidence;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6" id="medicinal_herbs_container">
      
      {/* Header section with beautifully integrated sub-tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Leaf className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Ervas Medicinais
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sua enciclopédia científica e guia de fitoterapia segura do SUS.
          </p>
        </div>

        {/* Dynamic sub-tab switcher */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-start md:self-center overflow-x-auto max-w-full flex-nowrap whitespace-nowrap scrollbar-none gap-1">
          <button
            onClick={() => setActiveSubTab('encyclopedia')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeSubTab === 'encyclopedia'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
            id="sub_tab_encyclopedia"
          >
            <BookOpen className="w-4 h-4 text-emerald-500" />
            Enciclopédia
          </button>
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeSubTab === 'chat'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
            id="sub_tab_chat"
          >
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            IA Botânica
          </button>
          <button
            onClick={() => setActiveSubTab('identifier')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeSubTab === 'identifier'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
            id="sub_tab_identifier"
          >
            <Camera className="w-4 h-4 text-emerald-500" />
            Identificar Planta
          </button>
          <button
            onClick={() => setActiveSubTab('mushroom')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeSubTab === 'mushroom'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
            id="sub_tab_mushroom"
          >
            <span className="text-emerald-500 text-xs font-extrabold">🍄</span>
            Identificar Cogumelo
          </button>
        </div>
      </div>

      {/* EDUCATIONAL HEALTH WARNING BANNER - HIGHLY PROMINENT */}
      <div className="mb-6 bg-amber-50/80 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-4 flex gap-3 shadow-sm">
        <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1">
            Uso Consciente & Segurança Científica
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            Esta seção possui caráter <strong>exclusivamente educativo e informativo</strong>. O uso de plantas medicinais e infusões serve como suporte de bem-estar e <strong>não substitui sob nenhuma hipótese</strong> consulta, diagnóstico, tratamento médico ou acompanhamento nutricional profissional.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'encyclopedia' ? (
          <motion.div
            key="encyclopedia_view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Filters and search section */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 mb-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Search Bar */}
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Pesquise por nome, sintoma, propriedades, família botânica..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    id="herb_search_input"
                  />
                </div>

                {/* Biome Filter */}
                <div>
                  <select
                    value={selectedBiome}
                    onChange={(e) => setSelectedBiome(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    id="filter_biome"
                  >
                    <option value="all">📍 Todos os Biomas</option>
                    {allBiomes.map(biome => (
                      <option key={biome} value={biome}>{biome}</option>
                    ))}
                  </select>
                </div>

                {/* Purpose Filter */}
                <div>
                  <select
                    value={selectedPurpose}
                    onChange={(e) => setSelectedPurpose(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    id="filter_purpose"
                  >
                    <option value="all">🌿 Todos os Alvos Terapêuticos</option>
                    {allPurposes.map(purpose => (
                      <option key={purpose} value={purpose}>{purpose}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Extra Filter Row: Evidence & Quick Reset */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    Nível de Evidência:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'strong', label: '🟢 Forte' },
                      { id: 'moderate', label: '🟡 Moderada' },
                      { id: 'traditional', label: '🟠 Tradicional' }
                    ].map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvidence(ev.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                          selectedEvidence === ev.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {ev.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(searchQuery || selectedBiome !== 'all' || selectedPurpose !== 'all' || selectedEvidence !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedBiome('all');
                      setSelectedPurpose('all');
                      setSelectedEvidence('all');
                    }}
                    className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Loading or Grid list */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Leaf className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Carregando acervo fitoterápico do NutriAI...
                </p>
              </div>
            ) : filteredHerbs.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-12 text-center shadow-sm">
                <HelpCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-800 dark:text-white">Nenhuma erva localizada</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  Tente alterar seus termos de pesquisa ou remover as opções selecionadas nos filtros acima.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHerbs.map(herb => {
                  const isFav = favorites.includes(herb.id);
                  return (
                    <motion.div
                      key={herb.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all flex flex-col h-full cursor-pointer"
                      onClick={() => {
                        setSelectedHerb(herb);
                        setDetailTab('info');
                      }}
                      id={`herb_card_${herb.id}`}
                    >
                      {/* Herb Card Image with favorite icon overlay */}
                      <div className="relative h-44 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <img
                          src={herb.photoURL}
                          alt={herb.popularName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-90" />
                        
                        {/* Botanical Family Badge overlay */}
                        <div className="absolute top-3 left-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-2.5 py-1 rounded-full border border-gray-100/50 dark:border-gray-700/50 text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          📚 {herb.botanicalFamily}
                        </div>

                        {/* Favorite Heart Button */}
                        <button
                          onClick={(e) => toggleFavorite(herb.id, e)}
                          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all ${
                            isFav 
                              ? 'bg-rose-500/90 text-white hover:bg-rose-600' 
                              : 'bg-black/30 text-white/90 hover:bg-black/50 hover:scale-105'
                          }`}
                          title={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
                        >
                          <Heart className="w-4 h-4 fill-current" />
                        </button>

                        {/* Title text overlay bottom */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-lg font-bold text-white tracking-tight leading-tight">
                            {herb.popularName}
                          </h3>
                          <p className="text-xs italic text-emerald-200/90 tracking-wide font-medium mt-0.5">
                            {herb.scientificName}
                          </p>
                        </div>
                      </div>

                      {/* Herb Description and tags */}
                      <div className="p-4 flex flex-col flex-grow">
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed flex-grow">
                          {herb.description}
                        </p>

                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-1.5">
                          <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                            📍 {herb.biome}
                          </span>
                          {herb.properties.slice(0, 2).map((prop, idx) => (
                            <span key={idx} className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                              ✨ {prop}
                            </span>
                          ))}
                        </div>

                        <button className="w-full mt-4 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 border border-emerald-100/40 dark:border-emerald-900/40">
                          <BookOpen className="w-3.5 h-3.5" />
                          Ver Detalhes Científicos
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* INTERACTIVE BOTANIST AI CHAT VIEW */
          <motion.div
            key="chat_view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-auto lg:h-[550px]"
          >
            {/* Left sidebar with helpful suggestions */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-3 h-auto lg:h-full">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Sugestões Rápidas</span>
              </div>

              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none whitespace-nowrap lg:whitespace-normal">
                {[
                  { title: "Chá para Gastrite", query: "Quais são as plantas medicinais recomendadas para gastrite e refluxo?" },
                  { title: "Contraindicações do Guaco", query: "Quais são as contraindicações importantes do Guaco?" },
                  { title: "Como plantar Alecrim", query: "Como plantar e cultivar Alecrim em casa ou vaso?" },
                  { title: "Chás calmantes", query: "Quais chás têm forte evidência científica para diminuir a ansiedade e dormir melhor?" }
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sug.query)}
                    disabled={chatLoading}
                    className="w-auto lg:w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-emerald-50/40 dark:bg-gray-800/50 dark:hover:bg-emerald-950/20 text-xs text-gray-700 dark:text-gray-300 hover:text-emerald-800 dark:hover:text-emerald-300 border border-transparent hover:border-emerald-200/40 dark:hover:border-emerald-900/40 font-medium transition-all shrink-0 lg:shrink"
                  >
                    {sug.title}
                  </button>
                ))}
              </div>

              <div className="hidden lg:block mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <Check className="w-3.5 h-3.5" />
                  Garantia Científica
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-normal">
                  Todas as respostas fornecidas são baseadas na Farmacopeia Brasileira (Anvisa) e artigos indexados de fitoterapia.
                </p>
              </div>
            </div>

            {/* Chat Box Container */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col h-[480px] lg:h-full overflow-hidden shadow-sm">
              
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Fitoterapeuta IA NutriAI
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">Tempo de resposta: ~3s</span>
              </div>

              {/* Chat Message Scroll */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
                {chatHistory.map((msg, index) => {
                  const isModel = msg.role === 'model';
                  return (
                    <div
                      key={index}
                      className={`flex ${isModel ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                          isModel
                            ? 'bg-gray-50 dark:bg-gray-800/60 text-gray-800 dark:text-gray-200 border border-gray-100/50 dark:border-gray-700/50'
                            : 'bg-emerald-600 text-white rounded-tr-none'
                        }`}
                      >
                        {isModel ? (
                          <div className="markdown-body">
                            <Markdown>{msg.text}</Markdown>
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>
                    </div>
                  );
                })}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 border border-gray-100/50 dark:border-gray-700/50 rounded-2xl p-3 flex items-center gap-2">
                      <Leaf className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                      <span className="text-xs font-medium animate-pulse">Consultando acervo farmacopeico...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input form */}
              <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/20">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                    placeholder="Pergunte sobre chás, dosagens, contraindicações ou plantio..."
                    className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    id="chat_input_field"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold transition-all flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'identifier' && (
          <motion.div
            key="identifier_view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SmartPlantIdentifier />
          </motion.div>
        )}

        {activeSubTab === 'mushroom' && (
          <motion.div
            key="mushroom_view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SmartMushroomIdentifier />
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAIL DRAWER / POPUP MODAL FOR SELECTED HERB */}
      <AnimatePresence>
        {selectedHerb && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] flex flex-col"
              id="herb_detail_modal"
            >
              {/* Modal Header Cover with dynamic photo and absolute close button */}
              <div className="relative h-56 bg-gray-100 dark:bg-gray-800 shrink-0">
                <img
                  src={selectedHerb.photoURL}
                  alt={selectedHerb.popularName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                {/* Close Button absolute top-right */}
                <button
                  onClick={() => setSelectedHerb(null)}
                  className="absolute top-4 right-4 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 backdrop-blur-md hover:scale-105 transition-all"
                  id="close_herb_modal"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Left/Bottom texts */}
                <div className="absolute bottom-4 left-5 right-5">
                  <span className="bg-emerald-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Família: {selectedHerb.botanicalFamily}
                  </span>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight mt-1">
                    {selectedHerb.popularName}
                  </h2>
                  <p className="text-xs italic text-emerald-200 mt-0.5">
                    {selectedHerb.scientificName}
                  </p>
                </div>
              </div>

              {/* Modal Tab Buttons */}
              <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 px-5 shrink-0">
                {[
                  { id: 'info', label: 'Identificação & Origem', icon: Sprout },
                  { id: 'use', label: 'Uso & Preparo', icon: Droplet },
                  { id: 'extra', label: 'Efeitos & Cultivo', icon: ShieldAlert }
                ].map(tab => {
                  const IconComp = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold border-b-2 transition-all ${
                        detailTab === tab.id
                          ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-extrabold'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Modal Tab Content Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {detailTab === 'info' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                        Descrição Botânica
                      </h4>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedHerb.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block">Outros Nomes</span>
                        <span className="text-xs text-gray-800 dark:text-gray-200 font-medium">
                          {selectedHerb.otherNames.join(', ') || 'Não documentados'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block">Origem</span>
                        <span className="text-xs text-gray-800 dark:text-gray-200 font-medium">{selectedHerb.origin}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block">Bioma</span>
                        <span className="text-xs text-gray-800 dark:text-gray-200 font-medium">📍 {selectedHerb.biome}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block">Estados (SUS)</span>
                        <span className="text-xs text-gray-800 dark:text-gray-200 font-medium">
                          {selectedHerb.states.join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block">Época de Colheita</span>
                        <span className="text-xs text-gray-800 dark:text-gray-200 font-medium">🍂 {selectedHerb.harvestSeason}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">Parte Utilizada</span>
                      <span className="inline-block bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs px-2.5 py-1 rounded-lg font-bold">
                        🌿 {selectedHerb.partUsed}
                      </span>
                    </div>

                    {/* Photo Gallery for visual identification */}
                    {selectedHerb.gallery && selectedHerb.gallery.length > 0 && (
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <h5 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                          Galeria de Identificação Botânica
                        </h5>
                        <div className="flex gap-3">
                          {selectedHerb.gallery.map((imgUrl, i) => (
                            <div
                              key={i}
                              onClick={() => setZoomImage(imgUrl)}
                              className="relative w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:opacity-85 border border-gray-100 dark:border-gray-800 group"
                            >
                              <img src={imgUrl} alt={`gallery-${i}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {detailTab === 'use' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {/* Indications with Scientific Evidence badge levels */}
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                        Indicações Clínicas & Alvos Terapêuticos
                      </h4>
                      <div className="space-y-2">
                        {selectedHerb.indications.map((ind, idx) => {
                          const isStrong = ind.evidence === 'Forte evidência científica';
                          const isModerate = ind.evidence === 'Evidência moderada';
                          const isTrad = ind.evidence === 'Uso tradicional';
                          return (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-xl">
                              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                {ind.name}
                              </span>
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                isStrong 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                                  : isModerate
                                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-600 dark:text-amber-400'
                                    : 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 text-orange-600 dark:text-orange-400'
                              }`}>
                                {ind.badge}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Properties list */}
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1.5">Propriedades</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedHerb.properties.map((prop, idx) => (
                          <span key={idx} className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            ✨ {prop}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Preparation guides */}
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                      <h4 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        Instruções de Preparo (Infusão Segura)
                      </h4>
                      <div className="grid grid-cols-2 gap-3 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/40 p-4 rounded-2xl">
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase block">Quantidade</span>
                          <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold">{selectedHerb.preparation.amount}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase block">Água</span>
                          <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold">{selectedHerb.preparation.water}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase block">Temperatura da água</span>
                          <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold">{selectedHerb.preparation.temperature}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase block">Tempo de Abafamento</span>
                          <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold">{selectedHerb.preparation.time}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[9px] font-bold text-gray-400 uppercase block">Filtragem / Coagem</span>
                          <span className="text-xs text-gray-800 dark:text-gray-200 font-medium leading-relaxed block mt-0.5">{selectedHerb.preparation.strain}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dosage information */}
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block">Dosagem & Limites de Consumo</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center">
                          <span className="text-[9px] text-gray-400 block font-bold">Uso Tradicional</span>
                          <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold">{selectedHerb.dosage.traditional}</span>
                        </div>
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center">
                          <span className="text-[9px] text-gray-400 block font-bold">Limite Diário</span>
                          <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{selectedHerb.dosage.limit}</span>
                        </div>
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center">
                          <span className="text-[9px] text-gray-400 block font-bold font-bold">Duração Máxima</span>
                          <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold">{selectedHerb.dosage.maxDuration}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {detailTab === 'extra' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {/* CONTRAINDICATIONS & SIDE EFFECTS */}
                    <div className="p-4 bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/40 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-4.5 h-4.5" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider">
                          Contraindicações & Efeitos Colaterais
                        </h4>
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-red-900/80 dark:text-red-300 leading-relaxed">
                        {selectedHerb.contraindications.warnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Chemical Compounds */}
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1.5">Fitoquímica (Principais Ativos)</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedHerb.compounds.map((comp, idx) => (
                          <span key={idx} className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            🧪 {comp}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Cultivo details */}
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block">Guia de Cultivo Caseiro</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center">
                          <span className="text-[9px] text-gray-400 block font-bold">Solo</span>
                          <span className="text-[11px] text-gray-800 dark:text-gray-200 font-semibold line-clamp-2 leading-tight">{selectedHerb.cultivation.soil}</span>
                        </div>
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center">
                          <span className="text-[9px] text-gray-400 block font-bold">Luminosidade</span>
                          <span className="text-[11px] text-gray-800 dark:text-gray-200 font-semibold line-clamp-2 leading-tight">{selectedHerb.cultivation.luminosity}</span>
                        </div>
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center">
                          <span className="text-[9px] text-gray-400 block font-bold">Rega</span>
                          <span className="text-[11px] text-gray-800 dark:text-gray-200 font-semibold line-clamp-2 leading-tight">{selectedHerb.cultivation.watering}</span>
                        </div>
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-center">
                          <span className="text-[9px] text-gray-400 block font-bold font-bold">Clima</span>
                          <span className="text-[11px] text-gray-800 dark:text-gray-200 font-semibold line-clamp-2 leading-tight">{selectedHerb.cultivation.climate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Curiosities */}
                    {selectedHerb.curiosities && selectedHerb.curiosities.length > 0 && (
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">História & Curiosidades</span>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">
                          {selectedHerb.curiosities.map((curio, i) => (
                            <li key={i}>{curio}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Sources / References */}
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1.5">Fontes e Referências Científicas</span>
                      <div className="space-y-1">
                        {selectedHerb.sources.map((src, i) => (
                          <div key={i} className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {src}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Modal Footer with favorite toggler and exit */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between shrink-0">
                <button
                  onClick={(e) => toggleFavorite(selectedHerb.id, e)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    favorites.includes(selectedHerb.id)
                      ? 'bg-rose-500 text-white hover:bg-rose-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Heart className="w-4 h-4 fill-current" />
                  {favorites.includes(selectedHerb.id) ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
                </button>

                <button
                  onClick={() => setSelectedHerb(null)}
                  className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-bold transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX FOR ZOOMED GALLERY PHOTOS */}
      <AnimatePresence>
        {zoomImage && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setZoomImage(null)}
          >
            <button className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={zoomImage}
              alt="Zoomed plant view"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
