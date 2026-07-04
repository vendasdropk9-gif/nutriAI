import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Utensils, CalendarDays, ShoppingBasket, User, Camera, 
  Sparkles, GlassWater, Barcode, Brain, Trophy, Droplet, 
  RefreshCw, ChefHat, TrendingUp, Dumbbell, Store, Crown, 
  Map as MapIcon, Zap, Activity, Building2, Heart, BookOpen, Leaf,
  ShieldAlert, Scale, Apple, Sprout, Image as ImageIcon
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

  useEffect(() => {
    const handleResize = () => {
      setResizeTrigger(prev => prev + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  return (
    <div className="w-full relative h-14 md:h-16 flex items-center bg-white/60 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-md shrink-0 transition-all duration-500">
      <div
        ref={containerRef}
        className="relative flex items-center gap-3 h-full overflow-x-auto scrollbar-none px-4 md:px-8 w-full scroll-smooth"
      >
        {NAV_ITEMS.map((item) => (
          <motion.button
            key={item.id}
            data-id={item.id}
            onClick={() => {
              if (activeTab === item.id) {
                const currentIndex = NAV_ITEMS.findIndex(i => i.id === item.id);
                const nextIndex = (currentIndex + 1) % NAV_ITEMS.length;
                onTabChange(NAV_ITEMS[nextIndex].id);
              } else {
                onTabChange(item.id);
                playSfx('tap');
                vibrate(10);
              }
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-500 whitespace-nowrap group relative shrink-0
              ${activeTab === item.id 
                ? item.isSpecial 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-500/30'
                  : item.isPremium
                    ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-xl shadow-amber-500/30'
                    : item.color 
                      ? `${item.color.includes('from-') ? 'bg-gradient-to-r ' + item.color : item.color} text-white shadow-xl`
                      : 'clay-btn text-emerald-600 dark:text-emerald-400'
                : 'text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 border-none'
              }
            `}
          >
            <span className={`transition-transform duration-500 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </span>
            <span>{t(`nav.${item.id}`, item.label)}</span>
            
            {activeTab === item.id && (
              <motion.div
                layoutId="nav-active-glow"
                className="absolute inset-0 rounded-full bg-white/10 blur-md -z-10"
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
