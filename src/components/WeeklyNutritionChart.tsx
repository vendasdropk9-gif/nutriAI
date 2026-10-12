/* eslint-disable i18next/no-literal-string */
import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Flame, Apple, Sparkles } from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';

const WEEKLY_DATA = [
  { day: 'Seg', calories: 1950, calorieGoal: 2000, protein: 110, proteinGoal: 130 },
  { day: 'Ter', calories: 2100, calorieGoal: 2000, protein: 135, proteinGoal: 130 },
  { day: 'Qua', calories: 1850, calorieGoal: 2000, protein: 120, proteinGoal: 130 },
  { day: 'Qui', calories: 2020, calorieGoal: 2000, protein: 125, proteinGoal: 130 },
  { day: 'Sex', calories: 1900, calorieGoal: 2000, protein: 140, proteinGoal: 130 },
  { day: 'Sáb', calories: 2200, calorieGoal: 2000, protein: 115, proteinGoal: 130 },
  { day: 'Dom', calories: 2000, calorieGoal: 2000, protein: 130, proteinGoal: 130 },
];

export function WeeklyNutritionChart() {
  const [metricView, setMetricView] = useState<'both' | 'calories' | 'protein'>('both');

  return (
    <div className="bg-white dark:bg-slate-900/60 p-6 md:p-8 rounded-[32px] border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Análise Nutricional Semanal
          </div>
          <h3 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">
            Progresso de Calorias e Proteínas
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Acompanhe sua ingestão diária em comparação com as metas estabelecidas.
          </p>
        </div>

        {/* Metric Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          {[
            { id: 'both', label: 'Ambos' },
            { id: 'calories', label: 'Calorias (kcal)' },
            { id: 'protein', label: 'Proteínas (g)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setMetricView(tab.id as any);
                playSfx('tap');
                vibrate(5);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-none outline-none cursor-pointer ${
                metricView === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Média de Calorias</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white font-mono">2,003 <span className="text-xs font-normal text-slate-500">kcal/dia</span></div>
          </div>
        </div>

        <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
            <Apple className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Média de Proteínas</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white font-mono">125 <span className="text-xs font-normal text-slate-500">g/dia</span></div>
          </div>
        </div>
      </div>

      {/* Recharts Line Chart */}
      <div className="h-[320px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={WEEKLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
            <XAxis 
              dataKey="day" 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                borderRadius: '16px', 
                border: 'none', 
                color: '#fff',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
              }} 
            />
            <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />

            {(metricView === 'both' || metricView === 'calories') && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="calories" 
                  name="Calorias Consumidas (kcal)" 
                  stroke="#f97316" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#f97316' }} 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="calorieGoal" 
                  name="Meta de Calorias" 
                  stroke="#cbd5e1" 
                  strokeDasharray="4 4" 
                  strokeWidth={2} 
                  dot={false} 
                />
              </>
            )}

            {(metricView === 'both' || metricView === 'protein') && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="protein" 
                  name="Proteínas Consumidas (g)" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981' }} 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="proteinGoal" 
                  name="Meta de Proteínas" 
                  stroke="#94a3b8" 
                  strokeDasharray="4 4" 
                  strokeWidth={2} 
                  dot={false} 
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
