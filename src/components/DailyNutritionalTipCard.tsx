import React, { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { UserProfile } from '../types';

interface DailyNutritionalTipProps {
  profile: UserProfile | null;
}

export function DailyNutritionalTipCard({ profile }: DailyNutritionalTipProps) {
  const [tip, setTip] = useState<string>('Carregando dica nutricional...');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTip = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/nutritional-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await response.json();
      setTip(data.tip);
    } catch (error) {
      console.error('Erro ao buscar dica:', error);
      setTip('Comer conscientemente melhora a digestão e ajuda seu corpo a absorver melhor os nutrientes!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTip();
  }, [profile]);

  return (
    <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-[24px] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Lightbulb className="w-5 h-5" />
          <h4 className="font-bold text-slate-800 dark:text-slate-100">Dica Nutricional Diária</h4>
        </div>
        <button 
          onClick={fetchTip}
          disabled={loading}
          className="text-amber-600 hover:text-amber-800 p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer border-none bg-transparent"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {tip}
      </p>
    </div>
  );
}
