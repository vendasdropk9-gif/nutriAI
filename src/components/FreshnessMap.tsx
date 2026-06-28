import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Map as MapIcon, 
  Search, 
  Filter, 
  Star, 
  MapPin, 
  TrendingDown, 
  Sparkles, 
  Clock, 
  ShoppingBag, 
  Navigation, 
  Phone, 
  Leaf, 
  DollarSign, 
  ArrowRight,
  Target,
  ChevronUp,
  ChevronLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FreshnessStore } from '../types';
import { speak } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

// Fix Leaflet marker icons
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333]; // São Paulo Center

const MOCK_STORES: FreshnessStore[] = [
  {
    id: 's1',
    name: 'Sacolão do Bairro',
    rating: 4.8,
    deliveryTime: '20-35 min',
    minOrder: 15,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200',
    distance: '0.8 km',
    coordinates: { lat: -23.552, lng: -46.635 },
    freshnessScore: 9.5,
    priceLevel: 2,
    tags: [
      { label: 'Mais Fresco', type: 'frescor', color: 'bg-emerald-500' },
      { label: 'Produtos do Dia', type: 'frescor', color: 'bg-green-500' }
    ],
    aiAnalysis: 'Este estabelecimento possui o maior giro de estoque da região, garantindo que as frutas e verduras cheguem sempre no dia.',
    assistantMessage: 'Olha... esse sacolão aqui tá com frutas bem fresquinhas hoje. Elas acabaram de chegar do produtor, vale a pena conferir.',
    openingHours: '08:00 - 19:00',
    phone: '(11) 98888-7777',
    address: 'Rua das Flores, 123 - Vl. Mariana'
  },
  {
    id: 's2',
    name: 'Hortifruti Economia',
    rating: 4.5,
    deliveryTime: '40-50 min',
    minOrder: 10,
    image: 'https://images.unsplash.com/photo-1488459711635-de82da10d981?auto=format&fit=crop&q=80&w=1200',
    distance: '1.5 km',
    coordinates: { lat: -23.555, lng: -46.630 },
    freshnessScore: 7.2,
    priceLevel: 1,
    tags: [
      { label: 'Melhor Preço', type: 'preco', color: 'bg-amber-500' },
      { label: 'Promoção', type: 'promocao', color: 'bg-red-500' }
    ],
    aiAnalysis: 'Preços 15% abaixo da média da região. Ideal para compras de volume em itens básicos como batata, cebola e ovos.',
    assistantMessage: 'Se você quer economizar hoje, esse é o melhor lugar agora. Encontrei ótimos preços pra você.',
    openingHours: '07:00 - 20:00',
    phone: '(11) 97777-6666',
    address: 'Av. Principal, 450 - Centro'
  },
  {
    id: 's3',
    name: 'Bio Garden Orgânicos',
    rating: 4.9,
    deliveryTime: '30-45 min',
    minOrder: 30,
    image: 'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&q=80&w=1200',
    distance: '2.3 km',
    coordinates: { lat: -23.548, lng: -46.628 },
    freshnessScore: 9.8,
    priceLevel: 3,
    tags: [
      { label: '100% Orgânico', type: 'frescor', color: 'bg-emerald-600' },
      { label: 'Curadoria IA', type: 'promocao', color: 'bg-purple-500' }
    ],
    aiAnalysis: 'Focado em pequenos produtores locais. Certificação orgânica em 95% do catálogo.',
    assistantMessage: 'Para produtos orgânicos de verdade, a Bio Garden é imbatível. A qualidade lá é incrível hoje.',
    openingHours: '09:00 - 18:00',
    phone: '(11) 96666-5555',
    address: 'Rua Sustentável, 88 - Pinheiros'
  }
];

const BANNER_SLIDES = [
  {
    id: 'b1',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=1200',
    title: 'Fresquinho perto de você',
    subtitle: 'Direto do produtor local',
    storeId: 's1'
  },
  {
    id: 'b2',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1200',
    title: 'Verduras Premium',
    subtitle: 'Mais barato hoje na Bio Garden',
    storeId: 's3'
  },
  {
    id: 'b3',
    image: 'https://images.unsplash.com/photo-1590779033100-9f60705a2f3b?auto=format&fit=crop&q=80&w=1200',
    title: 'Legumes Selecionados',
    subtitle: 'Custo-benefício imbatível',
    storeId: 's2'
  }
];

function createCustomIcon(type: 'frescor' | 'preco' | 'proximidade') {
  const colors = {
    frescor: '#10b981', // Emerald 500
    preco: '#f59e0b',   // Amber 500
    proximidade: '#3b82f6' // Blue 500
  };
  
  const color = colors[type] || '#10b981';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; border: 4px solid white; border-radius: 12px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2);">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${type === 'frescor' ? '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 3.5-3.4 8-1 1-1.5 2-1.6 3.9"></path><path d="M14 20a5 5 0 0 0-5-5"></path><path d="M8.2 13c-1.9-1.8-2-5.9 0-7.1"></path>' : 
          type === 'preco' ? '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>' :
          '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>'}
      </svg>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
  });
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 15);
  return null;
}

export function FreshnessMap({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState<FreshnessStore | null>(null);
  const [filter, setFilter] = useState<'all' | 'frescor' | 'preco'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSpeak = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    await speak(text, {
      onEnded: () => setIsPlaying(false),
      onError: () => setIsPlaying(false)
    });
  };

  const selectStore = (store: FreshnessStore) => {
    setSelectedStore(store);
    setMapCenter([store.coordinates.lat, store.coordinates.lng]);
  };

  const filteredStores = useMemo(() => {
    return MOCK_STORES.filter(store => {
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = !searchLower || 
        store.name.toLowerCase().includes(searchLower) ||
        store.aiAnalysis.toLowerCase().includes(searchLower) ||
        store.address.toLowerCase().includes(searchLower) ||
        store.tags.some(tag => tag.label.toLowerCase().includes(searchLower)) ||
        (searchLower.includes('fruta') && (store.id === 's1' || store.id === 's3')) ||
        (searchLower.includes('legume') && (store.id === 's1' || store.id === 's2')) ||
        (searchLower.includes('orgânic') && store.id === 's3') ||
        (searchLower.includes('batata') && store.id === 's2') ||
        (searchLower.includes('cebola') && store.id === 's2') ||
        (searchLower.includes('ovo') && store.id === 's2') ||
        (searchLower.includes('banana') && store.id === 's1') ||
        (searchLower.includes('alface') && store.id === 's3') ||
        (searchLower.includes('verdura') && store.id === 's3') ||
        (searchLower.includes('laranja') && store.id === 's1');

      const matchesFilter = filter === 'all' || store.tags.some(tag => tag.type === filter);
      return matchesSearch && matchesFilter;
    });
  }, [filter, searchQuery]);

  const handleSearchSubmit = () => {
    playSfx('success');
    vibrate(60);
    if (filteredStores.length > 0) {
      selectStore(filteredStores[0]);
    }
  };

  useEffect(() => {
    // Initial banner animation timer is handled above
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-slate-50 dark:bg-slate-950 relative overflow-hidden min-h-[600px] box-border">
      {/* Back Button - Left Floating */}
      <button 
        onClick={onBack}
        className="absolute top-6 left-6 z-[1001] bg-slate-900/95 dark:bg-slate-900/95 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-slate-700/50 group cursor-pointer focus:outline-none"
        title="Voltar para o Hortifruti"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
      </button>

      {/* Floating Centered Back Button */}
      <AnimatePresence>
        {!selectedStore && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-8 inset-x-0 mx-auto z-[999] flex justify-center pointer-events-none"
          >
            <button 
              onClick={onBack}
              className="pointer-events-auto flex items-center gap-2 px-8 py-3.5 bg-slate-950 dark:bg-slate-900 text-white rounded-full font-bold shadow-2xl hover:bg-slate-900 dark:hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 border border-white/10 group cursor-pointer text-sm"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Voltar ao Sacolão & Hortifruti
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Visual Banner */}
      <div className="absolute top-0 inset-x-0 z-[900] pointer-events-none p-4 md:p-6 flex justify-center w-full box-border">
        <div className="w-full max-w-[500px] md:max-w-3xl h-48 md:h-64 bg-white dark:bg-white rounded-[24px] md:rounded-[32px] clay-card overflow-hidden relative shadow-2xl pointer-events-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <img 
                src={BANNER_SLIDES[currentSlide].image} 
                className="w-full h-full object-cover"
                alt="Fresh produce"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              
              <div className="absolute inset-y-0 left-6 right-6 md:left-10 md:right-10 flex flex-col justify-center items-center text-center md:items-start md:text-left space-y-1.5 md:space-y-2 pointer-events-none">
                <motion.span 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="inline-block px-3 py-1 bg-emerald-500 text-white text-[10px] md:text-xs font-black uppercase tracking-[3px] rounded-full w-max shadow-lg pointer-events-auto"
                >
                  Destaque IA
                </motion.span>
                <motion.h2 
                  className="text-xl sm:text-2xl md:text-4xl font-serif font-bold text-white leading-tight drop-shadow-md pointer-events-auto"
                >
                  {BANNER_SLIDES[currentSlide].title}
                </motion.h2>
                <motion.p 
                  className="text-white/90 text-xs sm:text-sm md:text-lg font-medium drop-shadow pointer-events-auto"
                >
                  {BANNER_SLIDES[currentSlide].subtitle}
                </motion.p>
                
                <div className="pointer-events-auto pt-2 flex justify-center md:justify-start">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const store = MOCK_STORES.find(s => s.id === BANNER_SLIDES[currentSlide].storeId);
                      if (store) selectStore(store);
                    }}
                    className="px-5 md:px-6 py-2.5 md:py-3 clay-btn text-emerald-800 dark:text-emerald-400 font-black text-[10px] md:text-xs uppercase tracking-[2px] shadow-xl flex items-center gap-2 w-max hover:bg-emerald-50 transition-colors"
                  >
                    Comprar Agora
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                  </motion.button>
                </div>
              </div>

              {/* Progress Dots */}
              <div className="absolute bottom-4 md:bottom-6 right-4 md:right-8 flex gap-1.5 md:gap-2">
                {BANNER_SLIDES.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all duration-700 shadow-sm ${i === currentSlide ? 'w-6 md:w-8 bg-white' : 'w-2 bg-white/40'}`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Real Map Container */}
      <div className="flex-1 relative z-0 min-h-[500px]">
        <MapContainer 
          center={mapCenter} 
          zoom={15} 
          zoomControl={false}
          className="w-full h-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeView center={mapCenter} />
          
          {filteredStores.map((store) => (
            <Marker 
              key={store.id}
              position={[store.coordinates.lat, store.coordinates.lng]}
              icon={createCustomIcon(store.tags[0].type as any)}
              eventHandlers={{
                click: () => selectStore(store),
              }}
            />
          ))}
          
          {/* User Location Simulated Marker */}
          <Marker 
            position={DEFAULT_CENTER} 
            icon={L.divIcon({
              className: 'user-icon',
              html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          />
        </MapContainer>
      </div>

      {/* Filters Overlay */}
      <div className="absolute top-[216px] md:top-[288px] inset-x-0 z-[800] w-full px-4 md:px-6 flex flex-col items-center pointer-events-none box-border">
        <div className="w-full max-w-[500px] md:max-w-3xl space-y-3 pointer-events-auto box-border">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl h-12 md:h-14 rounded-full shadow-2xl flex items-center pl-4 md:pl-6 pr-2 md:pr-3 gap-3 border border-white/50 dark:border-slate-800 w-full box-border">
            <Search className="w-4 h-4 md:w-5 md:h-5 text-slate-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Qual legume ou fruta procura?" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit();
                }
              }}
              className="flex-1 bg-transparent min-w-0 outline-none text-xs md:text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 truncate"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSearchSubmit}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] md:text-xs px-3.5 md:px-5 py-1.5 md:py-2 rounded-full shrink-0 transition-all shadow-md shadow-emerald-500/15 cursor-pointer flex items-center gap-1"
              id="freshness-search-apply-btn"
            >
              Buscar
            </motion.button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar w-full box-border">
            {[
              { id: 'frescor', label: 'Mais Fresco', icon: Leaf, color: 'emerald' },
              { id: 'preco', label: 'Melhor Preço', icon: TrendingDown, color: 'amber' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(filter === cat.id ? 'all' : cat.id as any)}
                className={`px-4 md:px-6 py-2.5 md:py-3 rounded-[20px] md:rounded-2xl flex items-center gap-2 md:gap-3 whitespace-nowrap text-[10px] md:text-xs font-black uppercase tracking-wider transition-all border shadow-lg shrink-0 ${
                  filter === cat.id 
                  ? `bg-${cat.color}-500 text-white border-transparent`
                  : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg text-slate-600 border-slate-100 dark:border-slate-800 w-full max-w-max'
                }`}
              >
                <cat.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Store Bottom Sheet */}
      <AnimatePresence>
        {selectedStore && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 inset-x-0 z-[1100] bg-white dark:bg-slate-900 rounded-t-[32px] md:rounded-t-[48px] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] w-full max-h-[85vh] flex flex-col border-t border-slate-100 dark:border-slate-800 mx-auto max-w-3xl"
          >
            <div className="w-full flex justify-center p-3 shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
            
            <div className="px-4 md:px-8 pb-8 space-y-5 md:space-y-6 overflow-y-auto w-full box-border no-scrollbar flex-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <img src={selectedStore.image} className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover shrink-0 shadow-sm" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-white uppercase font-sans tracking-tight truncate" style={{ color: '#fffefe' }}>{selectedStore.name}</h3>
                    <div className="flex items-center gap-1.5 md:gap-2 mt-1 flex-wrap">
                      <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-amber-400 text-amber-400 shrink-0" />
                      <span className="text-xs md:text-sm font-bold">{selectedStore.rating}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase truncate">{selectedStore.distance}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStore(null)}
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 shrink-0 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <Navigation className="w-5 h-5 ml-0.5 mt-0.5" />
                </button>
              </div>

              {/* AI Insight */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-emerald-200/50 w-full box-border">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-widest mb-2">
                  <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Insight NutriAI
                </div>
                <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
                  "{selectedStore.aiAnalysis}"
                </p>
                <div className="flex items-center gap-3 md:gap-4 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-emerald-200/30 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase text-black">Fresco: {selectedStore.freshnessScore}/10</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" />
                    <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">{selectedStore.priceLevel === 1 ? 'Eco' : 'Justo'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 w-full box-border">
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Aberto até</span>
                  <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{selectedStore.openingHours.split(' - ')[1]}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 w-full box-border">
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Pedido Mín.</span>
                  <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">R$ {selectedStore.minOrder.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-3 w-full box-border">
                <button 
                  className="flex-1 h-12 md:h-14 clay-btn px-2 py-2 md:py-3 font-black text-[9px] md:text-xs uppercase tracking-widest shadow-lg md:shadow-xl truncate text-[#00ff01]"
                >
                  Ver Produtos
                </button>
                <button className="flex-1 h-12 md:h-14 clay-primary px-2 py-2 md:py-3 font-black text-[9px] md:text-xs uppercase tracking-widest shadow-lg md:shadow-xl shadow-emerald-500/20 truncate text-white">
                  Comprar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
