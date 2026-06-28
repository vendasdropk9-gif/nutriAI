import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  RefreshCw, 
  Apple, 
  Droplet, 
  Zap, 
  Brain, 
  Trophy, 
  Heart, 
  Lightbulb,
  ChevronRight
} from 'lucide-react';
import { UserProfile } from '../types';
import { generateDailyNutritionTips } from '../lib/gemini';
import { playSfx, vibrate } from '../lib/sensory';

interface DailyTipsProps {
  profile: UserProfile | null;
}

interface Tip {
  category: string;
  title: string;
  content: string;
  recommendation: string;
  icon: string;
}

export function DailyTips({ profile }: DailyTipsProps) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTips = async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
      playSfx('tap');
      vibrate(20);
    } else {
      setLoading(true);
    }
    setError(false);

    try {
      // Fetch tips based on user profile using the Gemini proxy
      const result = await generateDailyNutritionTips(profile);
      if (result && result.tips && result.tips.length > 0) {
        setTips(result.tips);
        if (isManual) {
          playSfx('crystal');
        }
      } else {
        throw new Error("Invalid response from tips engine");
      }
    } catch (err) {
      console.error("Erro ao obter dicas de nutrição:", err);
      setError(true);
      // Fallback tips in case of failure or offline mode
      setTips([
        {
          category: "Hidratação",
          title: "Beba água regularmente",
          content: "Manter-se hidratado ajuda na concentração, otimiza o metabolismo e auxilia seu corpo a processar nutrientes de forma eficiente.",
          recommendation: "Carregue uma garrafa de água com você hoje e tente beber pelo menos 2 litros.",
          icon: "droplet"
        },
        {
          category: "Energia",
          title: "Combustível Inteligente",
          content: "Combinar carboidratos complexos com fibras lentas garante energia estável durante todo o dia, prevenindo aquela fadiga da tarde.",
          recommendation: "Adicione aveia ou chia na sua próxima porção de frutas.",
          icon: "zap"
        },
        {
          category: "Superalimentos",
          title: "Alimentos Coloridos",
          content: "Vegetais de cores vibrantes contêm diferentes fitoquímicos e antioxidantes essenciais que protegem o seu organismo.",
          recommendation: "Tente colocar pelo menos 3 cores diferentes no seu prato do almoço de hoje.",
          icon: "apple"
        }
      ]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTips();
  }, [profile?.goals, profile?.restrictions]);

  const getIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'apple':
        return <Apple className="w-5 h-5 text-emerald-500" />;
      case 'droplet':
        return <Droplet className="w-5 h-5 text-blue-500" />;
      case 'zap':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'brain':
        return <Brain className="w-5 h-5 text-purple-500" />;
      case 'trophy':
        return <Trophy className="w-5 h-5 text-indigo-500" />;
      case 'heart':
        return <Heart className="w-5 h-5 text-rose-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-emerald-500" />;
    }
  };

  const getIconBg = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'apple':
        return 'bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400';
      case 'droplet':
        return 'bg-blue-100/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400';
      case 'zap':
        return 'bg-amber-100/60 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400';
      case 'brain':
        return 'bg-purple-100/60 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400';
      case 'trophy':
        return 'bg-indigo-100/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400';
      case 'heart':
        return 'bg-rose-100/60 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400';
      default:
        return 'bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400';
    }
  };

  return (
    <div id="daily-tips-component" className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-800 dark:text-slate-100">Dicas Nutritivas Diárias</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Conselhos personalizados gerados em tempo real pela IA</p>
          </div>
        </div>

        <button
          onClick={() => fetchTips(true)}
          disabled={loading || isRefreshing}
          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-bold transition-all disabled:opacity-50 cursor-pointer p-1.5 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg"
          title="Regerar dicas nutricionais"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Atualizando...' : 'Novas dicas'}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl animate-pulse space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-5/6 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {tips.map((tip, index) => (
              <motion.div
                key={tip.title + index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 p-5 rounded-[24px] shadow-sm flex flex-col justify-between hover:shadow-md transition-all gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${getIconBg(tip.icon)}`}>
                      {getIcon(tip.icon)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {tip.category}
                      </span>
                      <h4 className="font-serif text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                        {tip.title}
                      </h4>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {tip.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <p className="text-[11px] font-medium leading-normal italic">
                    {tip.recommendation}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
