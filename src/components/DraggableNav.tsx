import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { 
  Utensils, CalendarDays, ShoppingBasket, User, Camera, 
  Sparkles, GlassWater, Barcode, Brain, Trophy, Droplet, 
  RefreshCw, ChefHat, TrendingUp, Dumbbell, Store, Crown, 
  Map as MapIcon, Zap 
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
  { id: 'coach', label: 'Coach IA', icon: <Zap className="w-5 h-5" />, isSpecial: true },
  { id: 'generator', label: 'Receitas', icon: <Utensils className="w-5 h-5" /> },
  { id: 'juice', label: 'Sucos', icon: <GlassWater className="w-5 h-5" /> },
  { id: 'hydration', label: 'Água', icon: <Droplet className="w-5 h-5" /> },
  { id: 'barcode', label: 'Scanner', icon: <Barcode className="w-5 h-5" /> },
  { id: 'emotional', label: 'Mente', icon: <Brain className="w-5 h-5" /> },
  { id: 'analyzer', label: 'Prato', icon: <Camera className="w-5 h-5" /> },
  { id: 'body', label: 'Corpo', icon: <User className="w-5 h-5" />, color: 'from-blue-500 to-indigo-500' },
  { id: 'plan', label: 'Plano', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'shopping', label: 'Compras', icon: <ShoppingBasket className="w-5 h-5" /> },
  { id: 'journey', label: 'Evolução', icon: <Sparkles className="w-5 h-5" />, color: 'from-emerald-500 to-indigo-500' },
  { id: 'challenge', label: 'Desafio', icon: <Trophy className="w-5 h-5" />, color: 'from-orange-500 to-amber-500' },
  { id: 'swaps', label: 'Trocas', icon: <RefreshCw className="w-5 h-5" /> },
  { id: 'dining', label: 'Comi Fora', icon: <ChefHat className="w-5 h-5" /> },
  { id: 'market', label: 'Market', icon: <Store className="w-5 h-5" />, color: 'bg-emerald-600' },
  { id: 'frescor', label: 'Mapa', icon: <MapIcon className="w-5 h-5" /> },
  { id: 'trainer', label: 'Treinar', icon: <Dumbbell className="w-5 h-5" />, color: 'bg-slate-900' },
  { id: 'gamification', label: 'Conquistas', icon: <Trophy className="w-5 h-5" />, color: 'from-emerald-400 to-teal-600' },
  { id: 'prediction', label: 'Previsão', icon: <TrendingUp className="w-5 h-5" /> },
  { id: 'profile', label: 'Perfil', icon: <User className="w-5 h-5" /> },
  { id: 'pricing', label: 'Premium', icon: <Crown className="w-5 h-5" />, isPremium: true },
  { id: 'partner', label: 'Parceiro', icon: <Store className="w-5 h-5" /> },
];

export function DraggableNav({ activeTab, onTabChange }: DraggableNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });

  // Adaptive Navigation Logic
  const NAV_ITEMS = useMemo(() => {
    const hour = new Date().getHours();
    let sortedList = [...BASE_NAV_ITEMS];
    
    // Morning: Prioritize water, journey, and today's plan
    if (hour >= 5 && hour < 10) {
      const priorities = ['coach', 'hydration', 'plan', 'gamification'];
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
      const priorities = ['coach', 'analyzer', 'dining', 'swaps', 'market'];
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
      const priorities = ['coach', 'emotional', 'body', 'prediction', 'journey'];
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

  useEffect(() => {
    if (containerRef.current) {
      const parentWidth = containerRef.current.parentElement?.offsetWidth || 0;
      const contentWidth = containerRef.current.scrollWidth;
      setConstraints({ left: -(contentWidth - parentWidth + 40), right: 0 });
    }
  }, [activeTab]);

  const springX = useSpring(x, { stiffness: 300, damping: 30 });

  return (
    <div className="w-[calc(100%-2rem)] md:w-full max-w-[500px] md:max-w-none mx-auto relative overflow-hidden h-16 md:h-20 flex items-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 shadow-lg mt-2 md:mt-4 mb-2 md:mb-4 rounded-[32px] md:rounded-[40px] shrink-0">
      <motion.div
        ref={containerRef}
        drag="x"
        dragConstraints={constraints}
        style={{ x: springX }}
        className="flex items-center gap-3 px-8 cursor-grab active:cursor-grabbing select-none h-full"
      >
        {NAV_ITEMS.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => {
              if (activeTab !== item.id) {
                playSfx('tap');
                vibrate(10);
              }
              onTabChange(item.id);
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-500 whitespace-nowrap group relative
              ${activeTab === item.id 
                ? item.isSpecial 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-500/30'
                  : item.isPremium
                    ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-xl shadow-amber-500/30'
                    : item.color 
                      ? `${item.color.includes('from-') ? 'bg-gradient-to-r ' + item.color : item.color} text-white shadow-xl`
                      : 'clay-btn text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 border-none'
              }
            `}
          >
            <span className={`transition-transform duration-500 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
            
            {activeTab === item.id && (
              <motion.div
                layoutId="nav-active-glow"
                className="absolute inset-0 rounded-full bg-white/10 blur-md -z-10"
              />
            )}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
