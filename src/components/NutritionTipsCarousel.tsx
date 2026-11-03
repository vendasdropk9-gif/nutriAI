import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { UserProfile } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface NutritionTipsCarouselProps {
  profile: UserProfile | null;
}

export function NutritionTipsCarousel({ profile }: NutritionTipsCarouselProps) {
  const { t } = useLanguage();
  const [tips, setTips] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchTip = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/nutritional-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await response.json();
      if (data.tip) {
        setTips(prev => [...prev, data.tip]);
      }
    } catch (error) {
      console.error('Failed to fetch nutrition tip:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTip();
  }, []);

  const nextTip = () => {
    if (currentIndex < tips.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      fetchTip();
      setCurrentIndex(tips.length);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-5 rounded-2xl border border-emerald-500/20 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          {t('nutrition_tips_title', 'Dicas Rápidas de Nutrição')}
        </h4>
        <button onClick={nextTip} className="text-emerald-600 hover:text-emerald-500 cursor-pointer">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      <div className="relative min-h-[80px]">
        <AnimatePresence mode="wait">
          {tips[currentIndex] ? (
            <motion.p
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-sm text-slate-600 dark:text-slate-300 italic"
            >
              "{tips[currentIndex]}"
            </motion.p>
          ) : (
            <p className="text-sm text-slate-400 italic">Carregando dicas...</p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
