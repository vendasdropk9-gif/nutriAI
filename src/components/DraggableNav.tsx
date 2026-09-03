import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Utensils, CalendarDays, ShoppingBasket, User, Camera, 
  Sparkles, GlassWater, Barcode, Brain, Trophy, Droplet, 
  RefreshCw, ChefHat, TrendingUp, Dumbbell, Store, Crown, 
  Map as MapIcon, Zap, Activity, Building2, Heart, BookOpen, Leaf,
  ShieldAlert, Scale, Apple, Sprout, Image as ImageIcon,
  ChevronLeft, ChevronRight, Flame
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
  isPremium?: boolean;
  isSpecial?: boolean;
}

interface DraggableNavProps {
  activeTab: string;
  onTabChange: (id: any) => void;
}

const BASE_NAV_ITEMS: NavItem[] = [
  { id: 'assistant360', label: 'Assistente 360°', icon: <Zap className="w-4 h-4 sm:w-5 sm:h-5" />, isSpecial: true, color: 'from-indigo-500 to-purple-600' },
  { id: 'quickdishes', label: 'Pratos Rápidos', icon: <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />, isSpecial: true, color: 'from-orange-500 to-amber-500' },
  { id: 'coach', label: 'Coach IA', icon: <Zap className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'generator', label: 'Receitas', icon: <Utensils className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'fridge', label: 'Geladeira', icon: <Apple className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />, color: 'from-emerald-500 to-teal-600' },
  { id: 'garden', label: 'Horta', icon: <Sprout className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />, color: 'from-teal-500 to-emerald-600' },
  { id: 'herbs', label: 'Ervas', icon: <Leaf className="w-4 h-4 sm:w-5 sm:h-5" />, color: 'from-emerald-500 to-teal-600' },
  { id: 'juice', label: 'Sucos', icon: <GlassWater className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'habits', label: 'Hábitos', icon: <Activity className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'notes', label: 'Notas', icon: <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />, color: 'from-amber-400 to-yellow-600' },
  { id: 'bloodpressure', label: 'Pressão', icon: <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 animate-pulse" />, color: 'from-rose-500 to-red-600' },
  { id: 'glucose', label: 'Glicemia', icon: <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[#16C784]" />, color: 'from-emerald-500 to-teal-600' },
  { id: 'barcode', label: 'Scanner', icon: <Barcode className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'allergy', label: 'Alergias', icon: <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />, color: 'from-rose-500 to-red-600' },
  { id: 'comparer', label: 'Comparar', icon: <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />, color: 'from-emerald-500 to-teal-600' },
  { id: 'emotional', label: 'Mente', icon: <Brain className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'analyzer', label: 'Prato', icon: <Camera className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'body', label: 'Corpo', icon: <User className="w-4 h-4 sm:w-5 sm:h-5" />, color: 'from-blue-500 to-indigo-500' },
  { id: 'plan', label: 'Plano', icon: <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'shopping', label: 'Compras', icon: <ShoppingBasket className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'journey', label: 'Simulador 3D', icon: <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />, color: 'from-emerald-500 to-indigo-500' },
  { id: 'evolution', label: 'Evolução', icon: <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />, color: 'from-indigo-400 to-purple-600' },
  { id: 'challenge', label: 'Desafio', icon: <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />, color: 'from-orange-500 to-amber-500' },
  { id: 'swaps', label: 'Trocas', icon: <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'dining', label: 'Comi Fora', icon: <ChefHat className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'smartplate', label: 'Restaurante', icon: <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-white" />, color: 'from-emerald-500 to-teal-600' },
  { id: 'market', label: 'Market', icon: <Store className="w-4 h-4 sm:w-5 sm:h-5" />, color: 'bg-emerald-600' },
  { id: 'frescor', label: 'Mapa', icon: <MapIcon className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'trainer', label: 'Treinar', icon: <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" />, color: 'bg-slate-900' },
  { id: 'wellness', label: 'Bem-Estar', icon: <Heart className="w-4 h-4 sm:w-5 sm:h-5" />, color: 'from-rose-400 to-rose-600' },
  { id: 'academies', label: 'Academias', icon: <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />, color: 'bg-emerald-600' },
  { id: 'gamification', label: 'Conquistas', icon: <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />, color: 'from-emerald-400 to-teal-600' },
  { id: 'prediction', label: 'Previsão', icon: <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'profile', label: 'Perfil', icon: <User className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'pricing', label: 'Premium', icon: <Crown className="w-4 h-4 sm:w-5 sm:h-5" />, isPremium: true },
  { id: 'partner', label: 'Parceiro', icon: <Store className="w-4 h-4 sm:w-5 sm:h-5" /> },
];

export function DraggableNav({ activeTab, onTabChange }: DraggableNavProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<any>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getLabel = (item: NavItem): string => {
    switch (item.id) {
      case 'assistant360': return t('assistant_ai', item.label) as string;
      case 'quickdishes': return 'Pratos Rápidos';
      case 'generator': return t('recipes', item.label) as string;
      case 'fridge': return t('smart_fridge', item.label) as string;
      case 'herbs': return t('herbs', item.label) as string;
      case 'juice': return t('juices', item.label) as string;
      case 'habits': return t('habits', item.label) as string;
      case 'analyzer': return t('plate_analysis', item.label) as string;
      case 'plan': return t('meal_planning', item.label) as string;
      case 'shopping': return t('shopping_list', item.label) as string;
      case 'market': return t('market', item.label) as string;
      case 'profile': return t('profile', item.label) as string;
      case 'pricing': return t('premium_plan', item.label) as string;
      default: return t(item.id, item.label) as string;
    }
  };

  // Adaptive Navigation Items based on time of day
  const NAV_ITEMS = useMemo(() => {
    const hour = new Date().getHours();
    let sortedList = [...BASE_NAV_ITEMS];
    
    // Morning (05:00 - 09:59)
    if (hour >= 5 && hour < 10) {
      const priorities = ['assistant360', 'coach', 'habits', 'plan', 'gamification'];
      sortedList.sort((a, b) => {
        const aIndex = priorities.indexOf(a.id);
        const bIndex = priorities.indexOf(b.id);
        if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;
        if (aIndex > -1) return -1;
        if (bIndex > -1) return 1;
        return 0;
      });
    } 
    // Lunch/Dinner (11:00 - 14:59 and 18:00 - 21:59)
    else if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21)) {
      const priorities = ['assistant360', 'smartplate', 'analyzer', 'dining', 'swaps', 'quickdishes'];
      sortedList.sort((a, b) => {
        const aIndex = priorities.indexOf(a.id);
        const bIndex = priorities.indexOf(b.id);
        if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;
        if (aIndex > -1) return -1;
        if (bIndex > -1) return 1;
        return 0;
      });
    }
    // Night (22:00 - 04:59)
    else if (hour > 21 || hour < 5) {
      const priorities = ['assistant360', 'emotional', 'body', 'prediction', 'journey'];
      sortedList.sort((a, b) => {
        const aIndex = priorities.indexOf(a.id);
        const bIndex = priorities.indexOf(b.id);
        if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;
        if (aIndex > -1) return -1;
        if (bIndex > -1) return 1;
        return 0;
      });
    }
    
    return sortedList;
  }, []);

  // Update scroll arrow indicators
  const updateScrollIndicators = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 8);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
    }
  }, []);

  // Smoothly center the active tab in the visible container
  const scrollToActive = useCallback((smooth = true) => {
    const container = containerRef.current;
    if (!container) return;

    const activeElement = container.querySelector<HTMLElement>(`[data-id="${activeTab}"]`);
    if (!activeElement) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = activeElement.getBoundingClientRect();

    // Calculate exact difference between active element center and container center
    const elementCenter = elementRect.left + elementRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const scrollDifference = elementCenter - containerCenter;

    if (Math.abs(scrollDifference) > 2) {
      container.scrollBy({
        left: scrollDifference,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, [activeTab]);

  // Center active tab on tab change and on resize
  useEffect(() => {
    scrollToActive(true);
    const timer = setTimeout(() => {
      scrollToActive(true);
      updateScrollIndicators();
    }, 120);

    return () => clearTimeout(timer);
  }, [activeTab, scrollToActive, updateScrollIndicators]);

  // Handle resize & scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateScrollIndicators();

      // If user scrolls manually, reset idle timer to smoothly re-center on active tab after 3.5s
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (!isHovered) {
        idleTimerRef.current = setTimeout(() => {
          scrollToActive(true);
        }, 3500);
      }
    };

    const handleResize = () => {
      scrollToActive(false);
      updateScrollIndicators();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    updateScrollIndicators();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [updateScrollIndicators, scrollToActive, isHovered]);

  // Arrow navigation
  const handleScrollByArrow = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const scrollDistance = 260;
    container.scrollBy({
      left: direction === 'left' ? -scrollDistance : scrollDistance,
      behavior: 'smooth'
    });

    // After scrolling, re-center after 4 seconds of idle
    idleTimerRef.current = setTimeout(() => {
      scrollToActive(true);
    }, 4000);
  };

  return (
    <nav
      aria-label="Barra de Navegação dos Módulos"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        // On mouse leave, smoothly return to centered active tab
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          scrollToActive(true);
        }, 1200);
      }}
      className="w-full relative h-14 md:h-16 flex items-center justify-center bg-white/90 dark:bg-[#0E1520]/95 backdrop-blur-xl border-b border-slate-200/70 dark:border-[#1E293B] shadow-[0_2px_10px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] shrink-0 transition-all duration-300 overflow-hidden select-none"
    >
      {/* Left Smooth Fade Gradient Mask */}
      <div 
        className={`pointer-events-none absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-[#0E1520] dark:via-[#0E1520]/80 dark:to-transparent z-10 transition-opacity duration-300 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`} 
      />

      {/* Left Navigation Chevron Button */}
      <button
        type="button"
        onClick={() => handleScrollByArrow('left')}
        className={`absolute left-2.5 z-20 w-8 h-8 rounded-full bg-white/95 dark:bg-[#162130]/95 backdrop-blur-md shadow-md border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${
          canScrollLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Rolar para a esquerda"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Main Horizontal Scrollable Container (No visible scrollbars) */}
      <div
        ref={containerRef}
        className="relative flex items-center gap-2 sm:gap-2.5 h-full overflow-x-auto overflow-y-hidden scrollbar-none no-scrollbar hide-scrollbar px-10 md:px-16 w-full scroll-smooth"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const isPremiumItem = item.isPremium;

          return (
            <motion.button
              key={item.id}
              data-id={item.id}
              onClick={() => {
                if (isActive) {
                  // If already active, smoothly re-center
                  scrollToActive(true);
                  playSfx('pop');
                } else {
                  onTabChange(item.id);
                  playSfx('tap');
                  vibrate(12);
                }
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className={`
                flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-medium transition-all duration-300 whitespace-nowrap shrink-0 cursor-pointer select-none
                ${isActive
                  ? isPremiumItem
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-bold shadow-[0_4px_18px_rgba(16,185,129,0.38)] ring-1 ring-[#D8B14A]/90 border border-[#D8B14A]/80 scale-[1.02]'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 dark:from-emerald-500 dark:via-teal-500 dark:to-emerald-600 text-white font-bold shadow-[0_4px_18px_rgba(16,185,129,0.38)] ring-1 ring-emerald-300/40 dark:ring-emerald-400/40 scale-[1.02]'
                  : 'bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-[#1E293B] border border-slate-200/60 dark:border-slate-800/80'
                }
              `}
            >
              <span className={`transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                {item.icon}
              </span>
              <span className="tracking-wide">{getLabel(item)}</span>

              {isPremiumItem && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#D8B14A] shadow-[0_0_8px_#D8B14A] shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Right Navigation Chevron Button */}
      <button
        type="button"
        onClick={() => handleScrollByArrow('right')}
        className={`absolute right-2.5 z-20 w-8 h-8 rounded-full bg-white/95 dark:bg-[#162130]/95 backdrop-blur-md shadow-md border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${
          canScrollRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Rolar para a direita"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Right Smooth Fade Gradient Mask */}
      <div 
        className={`pointer-events-none absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-l from-white via-white/80 to-transparent dark:from-[#0E1520] dark:via-[#0E1520]/80 dark:to-transparent z-10 transition-opacity duration-300 ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`} 
      />
    </nav>
  );
}
