import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Utensils, Zap, ShoppingCart } from 'lucide-react';

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % FOOD_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = FOOD_SLIDES[currentIndex];

  return (
    <div className="relative w-full max-w-full mx-auto h-[180px] sm:h-[320px] md:h-[420px] rounded-[24px] sm:rounded-[32px] clay-card md:rounded-[40px] overflow-hidden shadow-2xl shadow-emerald-900/10 mb-8 md:mb-12 bg-white dark:bg-white transition-colors box-border">
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
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent md:bg-gradient-to-t md:from-black/80 md:via-black/20 md:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent hidden md:block" />
        </motion.div>
      </AnimatePresence>

      {/* Content Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-6 md:p-12 flex flex-col justify-end items-start text-left space-y-1 sm:space-y-2 md:space-y-4 box-border">
        <div className="space-y-1 max-w-full flex flex-col items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={`meta-${slide.id}`}
            className="flex flex-wrap items-center justify-start gap-1 pb-1 sm:gap-2 mb-0.5 sm:mb-2"
          >
            <div className="px-2 py-0.5 bg-emerald-500 rounded-full text-[8px] sm:text-[10px] font-bold text-white uppercase tracking-widest whitespace-nowrap">
              Destaque Saudável
            </div>
            <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[8px] sm:text-[10px] font-bold text-white uppercase tracking-widest border border-white/20 whitespace-nowrap">
              {slide.calories}
            </div>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={`title-${slide.id}`}
            className="font-serif text-sm sm:text-2xl md:text-5xl font-bold text-white tracking-tight leading-tight break-words"
          >
            {slide.name}
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={`benefit-${slide.id}`}
            className="hidden sm:block text-white/80 font-sans text-xs sm:text-base md:text-xl max-w-md line-clamp-1 sm:line-clamp-2 md:line-clamp-none break-words"
          >
            {slide.benefit}
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={`buy-${slide.id}`}
            onClick={onNavigateToMarket}
            className="mt-1 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500 backdrop-blur-md border border-emerald-500/30 text-white rounded-lg sm:rounded-xl font-bold text-[9px] sm:text-xs md:text-sm active:scale-95 transition-all shadow-lg w-fit whitespace-nowrap"
          >
            <ShoppingCart className="w-3 md:w-4 h-3 md:h-4 flex-shrink-0" />
            Comprar Agora
          </motion.button>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-1.5 sm:gap-4 w-full">
          <button className="flex-1 min-w-[100px] sm:min-w-[120px] max-w-[180px] px-2.5 py-1.5 sm:px-6 sm:py-4 md:px-8 md:py-4 clay-btn rounded-lg md:rounded-2xl font-bold flex items-center justify-center gap-1 active:scale-95 duration-200 shadow-lg text-[9px] sm:text-sm md:text-base">
            <Utensils className="w-3 sm:w-5 h-3 sm:h-5 flex-shrink-0" />
            <span className="truncate">Ver Receita</span>
            <ChevronRight className="w-3 sm:w-5 h-3 sm:h-5 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="absolute bottom-3 right-3 md:bottom-8 md:right-12 flex items-center gap-1 md:gap-3">
        {FOOD_SLIDES.map((_, i) => (
          <div 
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`cursor-pointer transition-all duration-500 rounded-full h-1 md:h-1.5 ${i === currentIndex ? 'w-4 sm:w-8 md:w-10 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'w-1.5 sm:w-3 md:w-4 bg-white/30'}`}
          />
        ))}
      </div>
      
      {/* Decorative Blur Accent */}
      <div className="absolute top-8 right-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
