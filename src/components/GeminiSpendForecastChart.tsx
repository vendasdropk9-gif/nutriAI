import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, Calendar, Sparkles, Activity, LineChart as LineIcon, 
  HelpCircle, ArrowUpRight, ShieldCheck, Zap, Layers, RefreshCw
} from 'lucide-react';
import { 
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { AnimatedCounter } from './AnimatedCounter';
import { playSfx } from '../lib/sensory';

export interface ForecastItem {
  date: string;
  dayLabel: string;
  activeUsers: number;
  geminiTokens: number | null;
  dailyCostBrl: number | null;
  movingAverage7d: number;
  movingAverage30d: number;
  projectedTrendCostBrl: number;
  upperBound: number | null;
  lowerBound: number | null;
  isForecast: boolean;
}

export interface MovingAverageForecastStats {
  past30dTotalCostBrl: number;
  past30dAvgDailyCostBrl: number;
  next30dProjectedTotalBrl: number;
  trendGrowthPercentage: number;
}

interface GeminiSpendForecastChartProps {
  timeline?: ForecastItem[];
  stats?: MovingAverageForecastStats;
  isLoading?: boolean;
}

export function GeminiSpendForecastChart({ timeline, stats, isLoading }: GeminiSpendForecastChartProps) {
  const [activeMetric, setActiveMetric] = useState<'ma30' | 'ma7' | 'bands'>('ma30');

  // Fallback synthetic data if timeline loading
  const fallbackStats: MovingAverageForecastStats = {
    past30dTotalCostBrl: 894.50,
    past30dAvgDailyCostBrl: 29.81,
    next30dProjectedTotalBrl: 1284.20,
    trendGrowthPercentage: 43.5
  };

  const currentStats = stats || fallbackStats;
  const data = timeline || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
      className="p-6 rounded-[32px] bg-slate-900/90 border border-indigo-500/30 shadow-2xl text-slate-100 space-y-6 relative overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-indigo-400" />
              <span>Linha de Tendência Preditiva</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Média Móvel 30 Dias
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white mt-1 font-serif flex items-center gap-2">
            <span>Previsão de Gastos Futuros com a API Gemini</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Projeção contínua dos próximos 30 dias derivada da média móvel histórica e taxa de aceleração diária.
          </p>
        </div>

        {/* Metric Selector Toggles */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 shrink-0 self-start md:self-auto">
          <button
            onClick={() => { playSfx('pop'); setActiveMetric('ma30'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMetric === 'ma30' 
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Média Móvel 30d
          </button>
          <button
            onClick={() => { playSfx('pop'); setActiveMetric('ma7'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMetric === 'ma7' 
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Média 7d vs 30d
          </button>
          <button
            onClick={() => { playSfx('pop'); setActiveMetric('bands'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMetric === 'bands' 
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Intervalo de Confiança
          </button>
        </div>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 30d Moving Average */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
          <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Média Móvel Diária (30d)</span>
          <div className="text-xl font-black text-indigo-300 font-mono">
            R$ <AnimatedCounter value={currentStats.past30dAvgDailyCostBrl} decimals={2} duration={900} />
            <span className="text-xs text-slate-400 font-normal ml-1">/dia</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Base de cálculo histórica</span>
        </div>

        {/* Card 2: Total Spent in Last 30d */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
          <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Acumulado (Últimos 30d)</span>
          <div className="text-xl font-black text-white font-mono">
            R$ <AnimatedCounter value={currentStats.past30dTotalCostBrl} decimals={2} duration={900} />
          </div>
          <span className="text-[10px] text-slate-400 block">Consumo realizado</span>
        </div>

        {/* Card 3: Projected Spend Next 30d */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-amber-500/30 space-y-1 bg-amber-500/5">
          <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider">Projeção (Próximos 30d)</span>
          <div className="text-xl font-black text-amber-300 font-mono">
            R$ <AnimatedCounter value={currentStats.next30dProjectedTotalBrl} decimals={2} duration={1100} />
          </div>
          <span className="text-[10px] text-amber-300/80 block">Previsão baseada em tendência</span>
        </div>

        {/* Card 4: Trend Growth Rate */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
          <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Aceleração de Tendência</span>
          <div className="text-xl font-black text-emerald-400 font-mono flex items-center gap-1">
            <ArrowUpRight className="w-5 h-5" />
            <AnimatedCounter value={currentStats.trendGrowthPercentage} decimals={1} suffix="%" duration={1000} />
          </div>
          <span className="text-[10px] text-slate-400 block">Variação projetada M/M</span>
        </div>
      </div>

      {/* Main Recharts Forecast Graph */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="confidenceBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis dataKey="dayLabel" stroke="#94a3b8" tick={{ fontSize: 10 }} interval={2} />
            <YAxis 
              stroke="#94a3b8" 
              tick={{ fontSize: 11 }} 
              unit=" R$"
              tickFormatter={(val: number) => `${val.toFixed(0)}`}
            />

            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                borderColor: '#334155', 
                borderRadius: '16px',
                color: '#f8fafc',
                fontSize: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
              }}
              formatter={(val: any, name: string, item: any) => {
                if (val === null || val === undefined) return [null, name];
                if (name === 'Custo Diário Real') return [`R$ ${Number(val).toFixed(2)}`, name];
                if (name === 'Média Móvel 30 Dias') return [`R$ ${Number(val).toFixed(2)}/dia`, name];
                if (name === 'Média Móvel 7 Dias') return [`R$ ${Number(val).toFixed(2)}/dia`, name];
                if (name === 'Tendência Projetada') return [`R$ ${Number(val).toFixed(2)}/dia (Projeção)`, name];
                if (name === 'Limite Superior') return [`R$ ${Number(val).toFixed(2)}`, name];
                if (name === 'Limite Inferior') return [`R$ ${Number(val).toFixed(2)}`, name];
                return [`R$ ${Number(val).toFixed(2)}`, name];
              }}
              labelFormatter={(label) => `Data: ${label}`}
            />

            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

            {/* Historical Real Daily Cost Bars */}
            <Bar 
              dataKey="dailyCostBrl" 
              name="Custo Diário Real" 
              fill="#6366f1" 
              opacity={0.4} 
              radius={[4, 4, 0, 0]}
            />

            {/* Confidence Band Area (Optional) */}
            {activeMetric === 'bands' && (
              <Area 
                type="monotone" 
                dataKey="upperBound" 
                name="Limite Superior" 
                fill="url(#confidenceBandGrad)" 
                stroke="#818cf8" 
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            )}

            {/* 30-Day Moving Average Historical Trendline */}
            <Line 
              type="monotone" 
              dataKey="movingAverage30d" 
              name="Média Móvel 30 Dias" 
              stroke="#6366f1" 
              strokeWidth={3} 
              dot={false}
              activeDot={{ r: 6 }}
            />

            {/* 7-Day Moving Average Line */}
            {activeMetric === 'ma7' && (
              <Line 
                type="monotone" 
                dataKey="movingAverage7d" 
                name="Média Móvel 7 Dias" 
                stroke="#10b981" 
                strokeWidth={2} 
                dot={false}
              />
            )}

            {/* Projected Future Spend Line based on Moving Average Trend */}
            <Line 
              type="monotone" 
              dataKey="projectedTrendCostBrl" 
              name="Tendência Projetada" 
              stroke="#f59e0b" 
              strokeWidth={3} 
              strokeDasharray="5 5" 
              dot={{ r: 3, fill: '#f59e0b' }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-indigo-500 rounded-full" />
          <span>Linha contínua: Consumo real e média móvel acumulada</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-amber-500 rounded-full border border-dashed" />
          <span>Linha pontilhada (*): Previsão para os próximos 30 dias</span>
        </div>
      </div>
    </motion.div>
  );
}
