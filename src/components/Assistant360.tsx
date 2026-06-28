import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, Leaf, Utensils, Zap, ShoppingBag, Truck, Map, 
  Dumbbell, Moon, Droplets, Camera, Flame, Plus, ChevronRight, MessageCircle, AlertTriangle
} from 'lucide-react';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';

interface Assistant360Props {
  profile: UserProfile | null;
  onNavigate: (tabId: string) => void;
}

const PROACTIVE_TIPS = [
  { text: "Você bebeu pouca água hoje.", icon: <Droplets className="w-5 h-5 text-blue-500" />, type: 'warning' },
  { text: "Sua ingestão de proteínas está abaixo da meta.", icon: <Utensils className="w-5 h-5 text-orange-500" />, type: 'warning' },
  { text: "Que tal uma caminhada de 20 minutos?", icon: <Activity className="w-5 h-5 text-emerald-500" />, type: 'suggestion' },
  { text: "Há frutas na sua geladeira que podem estragar em breve.", icon: <AlertTriangle className="w-5 h-5 text-rose-500" />, type: 'alert' }
];

export function Assistant360({ profile, onNavigate }: Assistant360Props) {
  const [activeTip, setActiveTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTip((prev) => (prev + 1) % PROACTIVE_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { id: 'generator', label: 'Receitas Inteligentes', icon: <Utensils className="w-6 h-6 text-orange-500" />, color: 'bg-orange-50' },
    { id: 'coach', label: 'Nutrição & Coach', icon: <Zap className="w-6 h-6 text-emerald-500" />, color: 'bg-emerald-50' },
    { id: 'live', label: 'IA Conversacional', icon: <MessageCircle className="w-6 h-6 text-indigo-500" />, color: 'bg-indigo-50', isFloating: true },
    { id: 'herbs', label: 'Plantas e Ervas', icon: <Leaf className="w-6 h-6 text-green-500" />, color: 'bg-green-50' },
    { id: 'analyzer', label: 'Scanner de Prato', icon: <Camera className="w-6 h-6 text-blue-500" />, color: 'bg-blue-50' },
    { id: 'trainer', label: 'Treinos', icon: <Dumbbell className="w-6 h-6 text-slate-700" />, color: 'bg-slate-100' },
    { id: 'habits', label: 'Sono & Hidratação', icon: <Moon className="w-6 h-6 text-purple-500" />, color: 'bg-purple-50' },
    { id: 'evolution', label: 'Evolução Corporal', icon: <Activity className="w-6 h-6 text-rose-500" />, color: 'bg-rose-50' },
    { id: 'market', label: 'Marketplace', icon: <ShoppingBag className="w-6 h-6 text-teal-500" />, color: 'bg-teal-50' },
    { id: 'delivery', label: 'Entregas', icon: <Truck className="w-6 h-6 text-amber-500" />, color: 'bg-amber-50' },
    { id: 'garden', label: 'Horta Inteligente', icon: <Leaf className="w-6 h-6 text-lime-500" />, color: 'bg-lime-50' },
    { id: 'allergy', label: 'Alertas de Alergia', icon: <AlertTriangle className="w-6 h-6 text-red-500" />, color: 'bg-red-50' },
    { id: 'frescor', label: 'Mapa de Parceiros', icon: <Map className="w-6 h-6 text-sky-500" />, color: 'bg-sky-50' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[36px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-20 translate-x-4 translate-y-4">
          <Zap className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <Activity className="w-4 h-4" /> Assistente 360°
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-black tracking-tight leading-tight">
            Sua saúde em um só lugar
          </h2>
          <p className="text-indigo-50 max-w-lg leading-relaxed font-medium">
            Monitoramento proativo e central de todos os seus recursos de bem-estar.
          </p>
        </div>
      </div>

      {/* Proactive Tip Banner */}
      <motion.div 
        key={activeTip}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full">
            {PROACTIVE_TIPS[activeTip].icon}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Assistente Proativo</h4>
            <p className="text-slate-800 dark:text-white font-medium">{PROACTIVE_TIPS[activeTip].text}</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors">
           <ChevronRight className="w-5 h-5" />
        </button>
      </motion.div>

      {/* Grid de Funcionalidades */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => {
              playSfx('tap');
              vibrate(10);
              // if it's "live", we trigger a global event or something if we can't navigate directly
              // wait, 'live' isn't a tab. we can just open LiveAssistant from App.tsx via a prop
              onNavigate(feature.id);
            }}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group outline-none cursor-pointer text-center h-full min-h-[160px]"
          >
            <div className={`w-14 h-14 ${feature.color} rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              {feature.icon}
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
              {feature.label}
            </h3>
          </button>
        ))}
      </div>
    </div>
  );
}
