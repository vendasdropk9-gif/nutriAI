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
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
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
    image: 'https://images.unsplash.com/photo-1488459711635-de82da10d981?auto=format&fit=crop&q=80&w=400',
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
    image: 'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&q=80&w=400',
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
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=800',
    title: 'Fresquinho perto de você',
    subtitle: 'Direto do produtor local',
    storeId: 's1'
  },
  {
    id: 'b2',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800',
    title: 'Verduras Premium',
    subtitle: 'Mais barato hoje na Bio Garden',
    storeId: 's3'
  },
  {
    id: 'b3',
    image: 'https://images.unsplash.com/photo-1590779033100-9f60705a2f3b?auto=format&fit=crop&q=80&w=800',
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
    handleSpeak(store.assistantMessage);
  };

  const filteredStores = useMemo(() => {
    return MOCK_STORES.filter(store => {
      const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === 'all' || store.tags.some(tag => tag.type === filter);
      return matchesSearch && matchesFilter;
    });
  }, [filter, searchQuery]);

  useEffect(() => {
    setTimeout(() => {
      handleSpeak("Oi! Encontrei algumas opções realmente boas perto de você. Tem um sacolão aqui do lado com frutas que acabaram de chegar, super fresquinhas. Quer que eu te mostre os melhores preços?");
    }, 1500);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 relative overflow-hidden h-full">
      {/* Back Button */}
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        onClick={onBack}
        className="absolute top-6 left-6 z-[1000] w-12 h-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl flex items-center justify-center text-slate-800 dark:text-white border border-white/20 hover:scale-110 active:scale-95 transition-all"
      >
        <ChevronLeft className="w-6 h-6" />
      </motion.button>

      {/* Premium Visual Banner */}
      <div className="absolute top-0 left-0 right-0 z-[900] h-48 md:h-64 pointer-events-none p-4">
        <div className="w-full h-full bg-slate-200 dark:bg-slate-800 rounded-[32px] overflow-hidden relative shadow-2xl pointer-events-auto">
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
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
              
              <div className="absolute inset-y-0 left-6 md:left-12 flex flex-col justify-center max-w-md space-y-2">
                <motion.span 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="inline-block px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[3px] rounded-full w-max"
                >
                  DESTAQUE IA
                </motion.span>
                <motion.h2 
                  className="text-2xl md:text-4xl font-serif font-bold text-white leading-tight"
                >
                  {BANNER_SLIDES[currentSlide].title}
                </motion.h2>
                <motion.p 
                  className="text-white/80 text-sm md:text-lg font-medium"
                >
                  {BANNER_SLIDES[currentSlide].subtitle}
                </motion.p>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const store = MOCK_STORES.find(s => s.id === BANNER_SLIDES[currentSlide].storeId);
                    if (store) selectStore(store);
                  }}
                  className="mt-4 px-6 py-2.5 bg-white text-slate-900 rounded-full font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 w-max hover:bg-emerald-50 transition-colors"
                >
                  Comprar agora
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Progress Dots */}
              <div className="absolute bottom-6 right-8 flex gap-2">
                {BANNER_SLIDES.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all duration-700 ${i === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Real Map Container */}
      <div className="flex-1 relative z-0">
        <MapContainer 
          center={mapCenter} 
          zoom={15} 
          zoomControl={false}
          className="w-full h-full"
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
      <div className="absolute top-[210px] md:top-[280px] left-1/2 -translate-x-1/2 z-[800] w-[90%] max-w-md space-y-4">
        <div className="bg-white dark:bg-slate-900 h-14 rounded-full shadow-2xl flex items-center px-6 gap-3 border border-white">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Qual legume ou fruta procura?" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {[
              { id: 'frescor', label: 'Mais Fresco', icon: Leaf, color: 'emerald' },
              { id: 'preco', label: 'Melhor Preço', icon: TrendingDown, color: 'amber' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(filter === cat.id ? 'all' : cat.id as any)}
                className={`px-6 py-3 rounded-2xl flex items-center gap-3 whitespace-nowrap text-xs font-black uppercase tracking-wider transition-all border shadow-lg ${
                  filter === cat.id 
                  ? `bg-${cat.color}-500 text-white border-transparent`
                  : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-100'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
        </div>
      </div>

      {/* Selected Store Bottom Sheet */}
      <AnimatePresence>
        {selectedStore && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 left-0 right-0 z-[1100] bg-white dark:bg-slate-900 rounded-t-[48px] shadow-2xl max-h-[60%] border-t border-slate-100 dark:border-slate-800"
          >
            <div className="w-full flex justify-center p-4">
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
            
            <div className="p-8 pt-0 space-y-6 overflow-y-auto">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <img src={selectedStore.image} className="w-16 h-16 rounded-2xl object-cover" />
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase font-sans tracking-tight">{selectedStore.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold">{selectedStore.rating}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">{selectedStore.distance}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStore(null)}
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400"
                >
                  <Navigation className="w-5 h-5" />
                </button>
              </div>

              {/* AI Insight */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-200/50">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-widest mb-2">
                  <Sparkles className="w-4 h-4" />
                  Insight NutriAI
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
                  "{selectedStore.aiAnalysis}"
                </p>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-emerald-200/30">
                  <div className="flex items-center gap-1.5">
                    <Leaf className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase text-emerald-600">FRESCO: {selectedStore.freshnessScore}/10</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black uppercase text-amber-600">{selectedStore.priceLevel === 1 ? 'ECONÔMICO' : 'PREÇO JUSTO'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Aberto até</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedStore.openingHours.split(' - ')[1]}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Pedido Mín.</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">R$ {selectedStore.minOrder.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-4 pb-6">
                <button className="flex-1 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[2px] shadow-xl">
                  Ver Produtos
                </button>
                <button className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[2px] shadow-xl shadow-emerald-500/20">
                  Comprar Agora
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Buttons */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-4">
        <button 
          className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex items-center justify-center text-emerald-600 border border-white dark:border-slate-800"
        >
          <Target className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
