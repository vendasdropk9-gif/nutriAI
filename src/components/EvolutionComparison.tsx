import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { UserProfile } from '../types';
import { TrendingUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface EvolutionComparisonProps {
  profile: UserProfile | null;
}

export function EvolutionComparison({ profile }: EvolutionComparisonProps) {
  const { t, language } = useLanguage();

  const evolutionData = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    return (profile?.progressLogs || [])
      .filter(log => new Date(log.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(log => ({
        date: new Date(log.date).toLocaleDateString(language || 'pt-BR', { day: '2-digit', month: '2-digit' }),
        weight: log.weight,
        bodyFat: log.bodyFat || null
      }));
  }, [profile?.progressLogs, language]);

  return (
    <div className="bg-white dark:bg-slate-900/60 p-6 sm:p-8 rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-md relative overflow-hidden space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('evolution_comparison_title', 'Comparativo de Evolução')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('evolution_comparison_desc', 'Tendência de peso e gordura corporal nos últimos 30 dias.')}
          </p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '16px', border: 'none', color: '#fff' }}
            />
            <Legend />
            <Line type="monotone" dataKey="weight" name="Peso (kg)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="bodyFat" name="Gordura Corporal (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
