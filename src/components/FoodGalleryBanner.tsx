import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Utensils, Zap, Volume2, Play, ShoppingCart } from 'lucide-react';
import { speak } from '../lib/speech';

interface FoodSlide {
  id: string;
  image: string;
  name: string;
  benefit: string;
  calories: string;
  assistantTip: string;
}

const FOOD_SLIDES: FoodSlide[] = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1200',
    name: 'Bowl Proteico Natural',
    benefit: 'Rico em proteína e fibras',
    calories: '320 kcal',
    assistantTip: 'Que tal essa opção leve e nutritiva? 💚'
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=1200',
    name: 'Salada Gourmet Mediterrânea',
    benefit: 'Antioxidante e refrescante',
    calories: '280 kcal',
    assistantTip: 'Perfeita pra quem quer emagrecer com saúde.'
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=1200',
    name: 'Prato Fitness de Almoço',
    benefit: 'Energia duradoura para o dia',
    calories: '450 kcal',
    assistantTip: 'Equilíbrio perfeito de macros para seu dia!'
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1494390248081-4e55172b3c99?auto=format&fit=crop&q=80&w=1200',
    name: 'Smoothie Tropical Elegante',
    benefit: 'Detox e imunidade extra',
    calories: '180 kcal',
    assistantTip: 'Uma delícia para começar o dia com o pé direito.'
  },
  {
    id: '5',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=1200',
    name: 'Avocado Toast Premium',
    benefit: 'Gorduras boas e saciedade',
    calories: '290 kcal',
    assistantTip: 'O café da manhã dos campeões está aqui!'
  },
  {
    id: '6',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=1200',
    name: 'Salmão Grelhado com Aspargos',
    benefit: 'Ômega 3 e alto valor proteico',
    calories: '380 kcal',
    assistantTip: 'Uma opção sofisticada para um jantar inesquecível.'
  },
  {
    id: '7',
    image: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&q=80&w=1200',
    name: 'Bowl de Iogurte e Frutas',
    benefit: 'Probióticos e energia limpa',
    calories: '240 kcal',
    assistantTip: 'Leveza e sabor em cada colherada.'
  }
];

interface FoodGalleryBannerProps {
  onNavigateToMarket?: () => void;
}

export function FoodGalleryBanner({ onNavigateToMarket }: FoodGalleryBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % FOOD_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = FOOD_SLIDES[currentIndex];

  const handleSpeak = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    await speak(slide.assistantTip, {
      onEnded: () => setIsPlaying(false),
      onError: () => setIsPlaying(false)
    });
  };

  return (
    <div className="relative w-full h-[450px] md:h-[500px] rounded-[32px] md:rounded-[40px] overflow-hidden shadow-2xl shadow-emerald-900/10 mb-8 md:mb-12 bg-slate-200 dark:bg-slate-800 transition-colors">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img 
            src={slide.image} 
            alt={slide.name}
            className="w-full h-full object-cover"
          />
          {/* Subtle Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent md:bg-gradient-to-t md:from-black/80 md:via-black/20 md:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent hidden md:block" />
        </motion.div>
      </AnimatePresence>

      {/* Content Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 flex flex-col justify-end space-y-4 md:space-y-6">
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={`meta-${slide.id}`}
            className="flex items-center gap-2 mb-1 md:mb-2"
          >
            <div className="px-2.5 py-1 bg-emerald-500 rounded-full text-[9px] md:text-[10px] font-bold text-white uppercase tracking-widest">
              Destaque Saudável
            </div>
            <div className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] md:text-[10px] font-bold text-white uppercase tracking-widest border border-white/20">
              {slide.calories}
            </div>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={`title-${slide.id}`}
            className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight"
          >
            {slide.name}
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={`benefit-${slide.id}`}
            className="text-white/80 font-sans text-sm sm:text-base md:text-xl max-w-md line-clamp-2 md:line-clamp-none"
          >
            {slide.benefit}
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={`buy-${slide.id}`}
            onClick={onNavigateToMarket}
            className="mt-2 flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500 backdrop-blur-md border border-emerald-500/30 text-white rounded-xl font-bold text-xs md:text-sm active:scale-95 transition-all shadow-lg w-fit"
          >
            <ShoppingCart className="w-4 h-4" />
            Comprar Agora
          </motion.button>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <button className="flex-1 md:flex-none px-6 py-4 md:px-8 md:py-4 bg-white text-slate-900 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 duration-200 shadow-lg text-sm md:text-base">
            <Utensils className="w-4 h-4 md:w-5 md:h-5" />
            Ver Receita
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          
          <button 
            onClick={handleSpeak}
            disabled={isPlaying}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 text-white transition-all ${isPlaying ? 'bg-emerald-500 border-transparent animate-pulse' : 'bg-white/10 active:bg-white/30 md:hover:bg-white/20'}`}
          >
            {isPlaying ? <Volume2 className="w-5 h-5 md:w-6 md:h-6" /> : <Play className="w-5 h-5 md:w-6 md:h-6 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="absolute bottom-6 right-6 md:bottom-8 md:right-12 flex items-center gap-2 md:gap-3">
        {FOOD_SLIDES.map((_, i) => (
          <div 
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`cursor-pointer transition-all duration-500 rounded-full h-1 md:h-1.5 ${i === currentIndex ? 'w-8 md:w-10 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'w-3 md:w-4 bg-white/30'}`}
          />
        ))}
      </div>
      
      {/* Decorative Blur Accent */}
      <div className="absolute top-8 right-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
