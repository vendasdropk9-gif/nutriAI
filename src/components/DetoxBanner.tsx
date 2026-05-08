import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, Droplets, Sparkles, ChevronRight, Zap } from 'lucide-react';

const DETOX_SLIDES = [
  {
    id: 'd1',
    name: 'Detox Verde Energizante',
    benefit: 'Acelera o metabolismo e purifica',
    calories: '120 kcal',
    image: 'https://images.unsplash.com/photo-1622947190547-0638e55e0987?auto=format&fit=crop&q=80&w=1200',
    tip: 'Que tal começar o dia com esse detox leve? 💚'
  },
  {
    id: 'd2',
    name: 'Poder Laranja Imunidade',
    benefit: 'Rico em Vitamina C e Antioxidantes',
    calories: '145 kcal',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=1200',
    tip: 'Esse suco ajuda seu corpo a desinchar e fortalece sua defesa.'
  },
  {
    id: 'd3',
    name: 'Red Glow Revitalizante',
    benefit: 'Pele radiante e circulação ativa',
    calories: '130 kcal',
    image: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&q=80&w=1200',
    tip: 'Refrescante, saudável e super fácil de preparar!'
  },
  {
    id: 'd4',
    name: 'Yellow Zen Anti-inflamatório',
    benefit: 'Gengibre e cúrcuma para bem-estar',
    calories: '95 kcal',
    image: 'https://images.unsplash.com/photo-1563821844227-41d92e5175a4?auto=format&fit=crop&q=80&w=1200',
    tip: 'Quer ver como preparar essa dose extra de saúde?'
  },
  {
    id: 'd5',
    name: 'Deep Green Clorofila',
    benefit: 'Limpeza profunda e oxigenação',
    calories: '80 kcal',
    image: 'https://images.unsplash.com/photo-1510629954389-c1e0da47d414?auto=format&fit=crop&q=80&w=1200',
    tip: 'Sinta a energia da natureza em cada gole. Você merece.'
  },
  {
    id: 'd6',
    name: 'Sweet Pure Berries',
    benefit: 'Foco mental e combate ao estresse',
    calories: '160 kcal',
    image: 'https://images.unsplash.com/photo-1600718374662-0483d2b9da44?auto=format&fit=crop&q=80&w=1200',
    tip: 'Uma explosão de antioxidantes para o seu cérebro.'
  },
  {
    id: 'd7',
    name: 'Cucumber Crisp Refresh',
    benefit: 'Hidratação extrema e diurético',
    calories: '65 kcal',
    image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=1200',
    tip: 'O equilíbrio perfeito para dias mais intensos.'
  },
  {
    id: 'd8',
    name: 'Kiwi Power Clean',
    benefit: 'Digestão leve e fibras solúveis',
    calories: '110 kcal',
    image: 'https://images.unsplash.com/photo-1589733593635-856ca5e0766d?auto=format&fit=crop&q=80&w=1200',
    tip: 'Combine com seu plano alimentar para resultados incríveis.'
  }
];

export function DetoxBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % DETOX_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = DETOX_SLIDES[index];

  return (
    <div className="relative w-full max-w-full mx-auto h-[450px] sm:h-[500px] md:h-[550px] rounded-[24px] sm:rounded-[32px] clay-card md:rounded-[48px] overflow-hidden shadow-2xl mb-8 md:mb-12 bg-slate-100 dark:bg-slate-800 box-border">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img src={slide.image} className="w-full h-full object-cover object-center" alt={slide.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-emerald-950/40 to-black/20" />
          
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-8 flex gap-3 flex-wrap pr-4">
             <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2 text-white text-[9px] md:text-xs font-bold uppercase tracking-widest border border-white/20 whitespace-nowrap">
                <Leaf className="w-3 md:w-3.5 h-3 md:h-3.5 text-emerald-400 flex-shrink-0" />
                Pure Detox Premium
             </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 md:bottom-12 md:left-12 md:right-12 flex flex-col md:flex-row md:items-end justify-end gap-4 md:gap-8 box-border">
            <div className="space-y-2 sm:space-y-3 max-w-full md:max-w-xl pr-8 md:pr-0">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-2 flex-wrap"
              >
                <div className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-[9px] md:text-[10px] font-bold uppercase whitespace-nowrap">
                  {slide.calories}
                </div>
                <div className="flex items-center gap-1 text-emerald-300 text-[9px] md:text-xs font-medium whitespace-nowrap">
                  <Droplets className="w-3 h-3 flex-shrink-0" />
                  Efeito Refrescante
                </div>
              </motion.div>
              
              <motion.h3 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-2xl sm:text-3xl md:text-5xl font-serif font-bold text-white leading-tight break-words"
              >
                {slide.name}
              </motion.h3>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-emerald-50/80 text-sm sm:text-base md:text-xl font-medium line-clamp-2 md:line-clamp-none break-words"
              >
                {slide.benefit}
              </motion.p>
            </div>

            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 w-full md:w-auto"
            >
              <button className="flex-1 min-w-[140px] md:min-w-[200px] px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-5 bg-white text-emerald-950 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 md:gap-3 active:scale-95 md:hover:bg-emerald-50 transition-all shadow-xl shadow-emerald-950/20 group">
                <span className="text-sm md:text-base truncate">Ver Receita</span>
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </button>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress Indicators - Vertical on right edge */}
      <div className="absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 sm:gap-2 md:gap-3">
        {DETOX_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-1 md:w-1.5 transition-all duration-500 rounded-full ${
              index === i ? 'h-6 sm:h-8 md:h-12 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'h-2 sm:h-2 md:h-3 bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
