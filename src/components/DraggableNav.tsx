import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Utensils, CalendarDays, ShoppingBasket, User, Camera, 
  Sparkles, GlassWater, Barcode, Brain, Trophy, Droplet, 
  RefreshCw, ChefHat, TrendingUp, Dumbbell, Store, Crown, 
  Map as MapIcon, Zap, Activity, Building2, Heart, BookOpen, Leaf,
  ShieldAlert, Scale, Apple, Sprout, Image as ImageIcon,
  ChevronLeft, ChevronRight
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
  { id: 'assistant360', label: 'Assistente 360°', icon: <Zap className="w-5 h-5" />, isSpecial: true, color: 'from-indigo-500 to-purple-600' },
  { id: 'coach', label: 'Coach IA', icon: <Zap className="w-5 h-5" /> },
  { id: 'generator', label: 'Receitas', icon: <Utensils className="w-5 h-5" /> },
  { id: 'fridge', label: 'Geladeira', icon: <Apple className="w-5 h-5 text-emerald-500" />, color: 'from-emerald-500 to-teal-600' },
  { id: 'garden', label: 'Horta', icon: <Sprout className="w-5 h-5 text-teal-500" />, color: 'from-teal-500 to-emerald-600' },
  { id: 'herbs', label: 'Ervas', icon: <Leaf className="w-5 h-5" />, color: 'from-emerald-500 to-teal-600' },
  { id: 'juice', label: 'Sucos', icon: <GlassWater className="w-5 h-5" /> },
  { id: 'habits', label: 'Hábitos', icon: <Activity className="w-5 h-5" /> },
  { id: 'notes', label: 'Notas', icon: <BookOpen className="w-5 h-5" />, color: 'from-amber-400 to-yellow-600' },
  { id: 'bloodpressure', label: 'Pressão', icon: <Heart className="w-5 h-5 text-rose-500 animate-pulse" />, color: 'from-rose-500 to-red-600' },
  { id: 'glucose', label: 'Glicemia', icon: <Activity className="w-5 h-5 text-[#16C784]" />, color: 'from-emerald-500 to-teal-600' },
  { id: 'barcode', label: 'Scanner', icon: <Barcode className="w-5 h-5" /> },
  { id: 'allergy', label: 'Alergias', icon: <ShieldAlert className="w-5 h-5 text-rose-500" />, color: 'from-rose-500 to-red-600' },
  { id: 'comparer', label: 'Comparar', icon: <Scale className="w-5 h-5 text-emerald-500" />, color: 'from-emerald-500 to-teal-600' },
  { id: 'emotional', label: 'Mente', icon: <Brain className="w-5 h-5" /> },
  { id: 'analyzer', label: 'Prato', icon: <Camera className="w-5 h-5" /> },
  { id: 'body', label: 'Corpo', icon: <User className="w-5 h-5" />, color: 'from-blue-500 to-indigo-500' },
  { id: 'plan', label: 'Plano', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'shopping', label: 'Compras', icon: <ShoppingBasket className="w-5 h-5" /> },
  { id: 'journey', label: 'Simulador 3D', icon: <Sparkles className="w-5 h-5" />, color: 'from-emerald-500 to-indigo-500' },
  { id: 'evolution', label: 'Evolução', icon: <ImageIcon className="w-5 h-5" />, color: 'from-indigo-400 to-purple-600' },
  { id: 'challenge', label: 'Desafio', icon: <Trophy className="w-5 h-5" />, color: 'from-orange-500 to-amber-500' },
  { id: 'swaps', label: 'Trocas', icon: <RefreshCw className="w-5 h-5" /> },
  { id: 'dining', label: 'Comi Fora', icon: <ChefHat className="w-5 h-5" /> },
  { id: 'market', label: 'Market', icon: <Store className="w-5 h-5" />, color: 'bg-emerald-600' },
  { id: 'frescor', label: 'Mapa', icon: <MapIcon className="w-5 h-5" /> },
  { id: 'trainer', label: 'Treinar', icon: <Dumbbell className="w-5 h-5" />, color: 'bg-slate-900' },
  { id: 'wellness', label: 'Bem-Estar', icon: <Heart className="w-5 h-5" />, color: 'from-rose-400 to-rose-600' },
  { id: 'academies', label: 'Academias', icon: <Building2 className="w-5 h-5" />, color: 'bg-emerald-600' },
  { id: 'gamification', label: 'Conquistas', icon: <Trophy className="w-5 h-5" />, color: 'from-emerald-400 to-teal-600' },
  { id: 'prediction', label: 'Previsão', icon: <TrendingUp className="w-5 h-5" /> },
  { id: 'profile', label: 'Perfil', icon: <User className="w-5 h-5" /> },
  { id: 'pricing', label: 'Premium', icon: <Crown className="w-5 h-5" />, isPremium: true },
  { id: 'partner', label: 'Parceiro', icon: <Store className="w-5 h-5" /> },
];

export function DraggableNav({ activeTab, onTabChange }: DraggableNavProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const getLabel = (item: any): string => {
    switch (item.id) {
      case 'assistant360': return t('assistant_ai', item.label) as string;
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

  // Adaptive Navigation Logic
  const NAV_ITEMS = useMemo(() => {
    const hour = new Date().getHours();
    let sortedList = [...BASE_NAV_ITEMS];
    
    // Morning: Prioritize water, journey, and today's plan
    if (hour >= 5 && hour < 10) {
      const priorities = ['assistant360', 'coach', 'hydration', 'plan', 'gamification'];
      sortedList.sort((a, b) => {
        const aIndex = priorities.indexOf(a.id);
        const bIndex = priorities.indexOf(b.id);
        if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;
        if (aIndex > -1) return -1;
        if (bIndex > -1) return 1;
        return 0;
      });
    } 
    // Lunch/Dinner: Prioritize Camera, Swaps, Dining out
    else if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21)) {
      const priorities = ['assistant360', 'analyzer', 'dining', 'swaps', 'market'];
      sortedList.sort((a, b) => {
        const aIndex = priorities.indexOf(a.id);
        const bIndex = priorities.indexOf(b.id);
        if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;
        if (aIndex > -1) return -1;
        if (bIndex > -1) return 1;
        return 0;
      });
    }
    // Night: Prioritize Emotional, Body, Prediction
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

  const [resizeTrigger, setResizeTrigger] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'right' | 'left'>('right');
  const lastInteractionTime = useRef<number>(Date.now());

  useEffect(() => {
    const handleResize = () => {
      setResizeTrigger(prev => prev + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const checkArrows = () => {
    const container = containerRef.current;
    if (container) {
      setShowLeftArrow(container.scrollLeft > 10);
      setShowRightArrow(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkArrows);
      checkArrows();
      const timer = setTimeout(checkArrows, 500);
      return () => {
        container.removeEventListener('scroll', checkArrows);
        clearTimeout(timer);
      };
    }
  }, [resizeTrigger, activeTab]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationId: number;
    const scrollSpeed = 0.4; // smooth slow speed

    const step = () => {
      const isIdle = Date.now() - lastInteractionTime.current > 3000;
      if (isIdle && !isInteracting) {
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (maxScroll > 0) {
          if (scrollDirection === 'right') {
            container.scrollLeft += scrollSpeed;
            if (container.scrollLeft >= maxScroll - 1) {
              setScrollDirection('left');
            }
          } else {
            container.scrollLeft -= scrollSpeed;
            if (container.scrollLeft <= 1) {
              setScrollDirection('right');
            }
          }
        }
      }
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);

    const handleUserInteraction = () => {
      lastInteractionTime.current = Date.now();
    };

    container.addEventListener('scroll', handleUserInteraction, { passive: true });
    container.addEventListener('touchstart', handleUserInteraction, { passive: true });
    container.addEventListener('mousedown', handleUserInteraction, { passive: true });

    return () => {
      cancelAnimationFrame(animationId);
      if (container) {
        container.removeEventListener('scroll', handleUserInteraction);
        container.removeEventListener('touchstart', handleUserInteraction);
        container.removeEventListener('mousedown', handleUserInteraction);
      }
    };
  }, [scrollDirection, isInteracting]);

  useEffect(() => {
    const scrollToActive = () => {
      if (containerRef.current) {
        const activeElement = containerRef.current.querySelector(`[data-id="${activeTab}"]`);
        if (activeElement instanceof HTMLElement) {
          const container = containerRef.current;
          const scrollLeft = activeElement.offsetLeft - (container.offsetWidth / 2) + (activeElement.offsetWidth / 2);
          container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
          });
        }
      }
    };

    scrollToActive();
    const timer = setTimeout(scrollToActive, 100);
    return () => clearTimeout(timer);
  }, [activeTab, resizeTrigger]);

  const handleScroll = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (container) {
      lastInteractionTime.current = Date.now();
      const scrollAmount = 240;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setScrollDirection(direction);
    }
  };

  return (
    <div className="w-full relative h-14 md:h-16 flex items-center bg-white/80 dark:bg-[#151B23]/90 backdrop-blur-2xl border-b border-slate-200/60 dark:border-[#232C39] shadow-sm shrink-0 transition-all duration-500">
      <div
        ref={containerRef}
        className="relative flex items-center gap-2.5 h-full overflow-x-auto scrollbar-none px-4 md:px-8 w-full scroll-smooth"
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
                  const currentIndex = NAV_ITEMS.findIndex(i => i.id === item.id);
                  const nextIndex = (currentIndex + 1) % NAV_ITEMS.length;
                  onTabChange(NAV_ITEMS[nextIndex].id);
                } else {
                  onTabChange(item.id);
                  playSfx('tap');
                  vibrate(10);
                }
              }}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className={`
                flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs font-display font-semibold transition-all duration-300 whitespace-nowrap group relative shrink-0 cursor-pointer
                ${isActive
                  ? isPremiumItem
                    ? 'bg-gradient-to-r from-[#16C784] to-[#10B981] text-white border border-[#D8B14A]/80 shadow-[0_4px_16px_rgba(216,177,74,0.25)]'
                    : 'bg-gradient-to-r from-[#10B981] to-[#059669] dark:from-[#16C784] dark:to-[#0D9488] text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-100/70 dark:bg-[#0B0F14]/60 text-slate-600 dark:text-[#B5BDC9] hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-[#232C39]'
                }
              `}
            >
              <span className={`transition-transform duration-300 ${isActive ? 'text-white' : 'text-slate-500 dark:text-[#B5BDC9] group-hover:text-[#16C784]'}`}>
                {item.icon}
              </span>
              <span>{getLabel(item)}</span>

              {isPremiumItem && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#D8B14A] shadow-[0_0_8px_#D8B14A] shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
