import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import { FoodNutritionComparison } from '../types';
import { Trophy, TrendingDown, TrendingUp, Sparkles, Scale, Check, ArrowRight } from 'lucide-react';
import { VoicePlayButton } from './VoicePlayButton';

interface NutritionalComparisonChartProps {
  comparison: FoodNutritionComparison;
  className?: string;
}

export function NutritionalComparisonChart({ comparison, className = '' }: NutritionalComparisonChartProps) {
  const [activeMetricView, setActiveMetricView] = useState<'macros' | 'calories' | 'all'>('macros');

  const { foodA, foodB, winner, verdict, keyDifferences, assistantMessage } = comparison;

  // Macro chart data (grams)
  const macroChartData = [
    {
      nutrient: 'Proteínas',
      unit: 'g',
      foodA: Number((foodA.protein || 0).toFixed(1)),
      foodB: Number((foodB.protein || 0).toFixed(1)),
      higherIsBetter: true,
    },
    {
      nutrient: 'Fibras',
      unit: 'g',
      foodA: Number((foodA.fiber || 0).toFixed(1)),
      foodB: Number((foodB.fiber || 0).toFixed(1)),
      higherIsBetter: true,
    },
    {
      nutrient: 'Carboidratos',
      unit: 'g',
      foodA: Number((foodA.carbs || 0).toFixed(1)),
      foodB: Number((foodB.carbs || 0).toFixed(1)),
      higherIsBetter: false,
    },
    {
      nutrient: 'Gorduras',
      unit: 'g',
      foodA: Number((foodA.fat || 0).toFixed(1)),
      foodB: Number((foodB.fat || 0).toFixed(1)),
      higherIsBetter: false,
    },
    ...(foodA.sugar !== undefined || foodB.sugar !== undefined
      ? [
          {
            nutrient: 'Açúcares',
            unit: 'g',
            foodA: Number((foodA.sugar || 0).toFixed(1)),
            foodB: Number((foodB.sugar || 0).toFixed(1)),
            higherIsBetter: false,
          },
        ]
      : []),
  ];

  // Calorie chart data
  const calorieChartData = [
    {
      name: foodA.name,
      calories: foodA.calories,
      fill: '#f43f5e',
      portion: foodA.portion,
    },
    {
      name: foodB.name,
      calories: foodB.calories,
      fill: '#10b981',
      portion: foodB.portion,
    },
  ];

  // Calculate delta highlights
  const calDiff = foodA.calories - foodB.calories;
  const calPercent = foodA.calories > 0 ? Math.round((Math.abs(calDiff) / foodA.calories) * 100) : 0;

  const proteinDiff = Number(((foodB.protein || 0) - (foodA.protein || 0)).toFixed(1));
  const fiberDiff = Number(((foodB.fiber || 0) - (foodA.fiber || 0)).toFixed(1));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cards Header: Alimento A vs Alimento B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Alimento A */}
        <div className="p-5 rounded-3xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/30 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Opção Tradicional
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-800/70 px-2.5 py-1 rounded-full font-medium">
              {foodA.portion}
            </span>
          </div>
          <div className="mt-3">
            <h4 className="text-xl font-bold font-serif text-slate-800 dark:text-slate-100">
              {foodA.name}
            </h4>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-600 dark:text-rose-400 font-serif">
                {foodA.calories}
              </span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">kcal</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-rose-200/50 dark:border-rose-800/30 grid grid-cols-4 gap-1 text-center text-xs">
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Prot</p>
              <p className="font-bold text-slate-700 dark:text-slate-300">{foodA.protein}g</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Carb</p>
              <p className="font-bold text-slate-700 dark:text-slate-300">{foodA.carbs}g</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Gord</p>
              <p className="font-bold text-slate-700 dark:text-slate-300">{foodA.fat}g</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Fibra</p>
              <p className="font-bold text-slate-700 dark:text-slate-300">{foodA.fiber}g</p>
            </div>
          </div>
        </div>

        {/* Card Alimento B */}
        <div className="p-5 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/20 border-2 border-emerald-500/40 dark:border-emerald-500/30 flex flex-col justify-between relative overflow-hidden shadow-sm">
          {winner === 'B' && (
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
              <Trophy className="w-3 h-3" />
              Opção Vencedora
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Alternativa Saudável
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-800/70 px-2.5 py-1 rounded-full font-medium">
              {foodB.portion}
            </span>
          </div>
          <div className="mt-3">
            <h4 className="text-xl font-bold font-serif text-slate-800 dark:text-slate-100">
              {foodB.name}
            </h4>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-serif">
                {foodB.calories}
              </span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">kcal</span>
              {calDiff > 0 && (
                <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> -{calDiff} kcal (-{calPercent}%)
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-200/50 dark:border-emerald-800/30 grid grid-cols-4 gap-1 text-center text-xs">
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Prot</p>
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                {foodB.protein}g
                {proteinDiff > 0 && <span className="text-[9px] text-emerald-500 ml-0.5">+{proteinDiff}</span>}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Carb</p>
              <p className="font-bold text-slate-700 dark:text-slate-300">{foodB.carbs}g</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Gord</p>
              <p className="font-bold text-slate-700 dark:text-slate-300">{foodB.fat}g</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Fibra</p>
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                {foodB.fiber}g
                {fiberDiff > 0 && <span className="text-[9px] text-emerald-500 ml-0.5">+{fiberDiff}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Gráfica: Gráfico de Barras com Seletor */}
      <div className="p-6 md:p-7 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-500" />
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-serif">
                Comparação Nutricional em Gráfico de Barras
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Visualização comparativa de macronutrientes e densidade calórica
            </p>
          </div>

          {/* Seletor de Visão */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-2xl self-start sm:self-auto text-xs font-semibold">
            <button
              onClick={() => setActiveMetricView('macros')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeMetricView === 'macros'
                  ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Macronutrientes (g)
            </button>
            <button
              onClick={() => setActiveMetricView('calories')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeMetricView === 'calories'
                  ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Calorias (kcal)
            </button>
          </div>
        </div>

        {/* Renderização do Gráfico de Barras */}
        {activeMetricView === 'macros' ? (
          <motion.div 
            key={`macros-container-${foodA.name}-${foodB.name}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="space-y-3"
          >
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  key={`barchart-macros-${foodA.name}-${foodB.name}`}
                  data={macroChartData}
                  margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                  barGap={6}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" vertical={false} />
                  <XAxis
                    dataKey="nutrient"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    unit="g"
                    tick={{ fill: '#64748b' }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const valA = payload.find((p) => p.dataKey === 'foodA')?.value as number;
                        const valB = payload.find((p) => p.dataKey === 'foodB')?.value as number;
                        const diff = Number((valB - valA).toFixed(1));
                        return (
                          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl shadow-xl text-xs backdrop-blur-md space-y-1.5 min-w-[190px]">
                            <p className="font-bold text-slate-700 dark:text-slate-300 border-b pb-1 border-slate-100 dark:border-slate-800">
                              {label} (g)
                            </p>
                            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                              <span>{foodA.name}:</span>
                              <span className="font-bold">{valA}g</span>
                            </div>
                            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                              <span>{foodB.name}:</span>
                              <span className="font-bold">{valB}g</span>
                            </div>
                            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] font-medium text-slate-500 flex justify-between">
                              <span>Diferença:</span>
                              <span className={diff > 0 ? 'text-emerald-600 font-bold' : diff < 0 ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                                {diff > 0 ? `+${diff}g` : `${diff}g`}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: 15, fontSize: 12 }}
                    formatter={(value) => {
                      if (value === 'foodA') return <span className="text-rose-600 dark:text-rose-400 font-semibold">{foodA.name}</span>;
                      if (value === 'foodB') return <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{foodB.name}</span>;
                      return value;
                    }}
                  />
                  <Bar
                    dataKey="foodA"
                    name="foodA"
                    fill="#fb7185"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                    isAnimationActive={true}
                    animationDuration={850}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="foodB"
                    name="foodB"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                    isAnimationActive={true}
                    animationDuration={850}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda Explicativa de Apoio */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span>{foodA.name} (Original)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span>{foodB.name} (Alternativa)</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key={`calories-container-${foodA.name}-${foodB.name}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="space-y-4"
          >
            <div className="h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  key={`barchart-calories-${foodA.name}-${foodB.name}`}
                  data={calorieChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    unit=" kcal"
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#334155' }}
                    width={120}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl shadow-xl text-xs backdrop-blur-md">
                            <p className="font-bold text-slate-800 dark:text-slate-200">{data.name}</p>
                            <p className="text-slate-500 text-[11px] mb-1">Porção: {data.portion}</p>
                            <p className="text-base font-black text-slate-900 dark:text-white">
                              {data.calories} <span className="text-xs font-normal">kcal</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="calories"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={32}
                    isAnimationActive={true}
                    animationDuration={850}
                    animationEasing="ease-out"
                  >
                    {calorieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Destaque de Economia Calórica */}
            {calDiff > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                  <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Economia de {calDiff} calorias ({calPercent}% a menos)</span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                  Impacto Positivo
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Tabela Resumo com Diferenciais Chave */}
        <div className="pt-2">
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Diferenciais Nutricionais Identificados:
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {keyDifferences.map((diff, index) => (
              <div
                key={index}
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/40 text-xs text-slate-700 dark:text-slate-300"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span className="font-medium leading-relaxed">{diff}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Veredito & Mensagem da Malu */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                Veredito Nutricional da Malu:
              </h5>
            </div>
            {assistantMessage && (
              <VoicePlayButton
                text={assistantMessage}
                size="sm"
                title="Ouvir análise da nutricionista Malu"
              />
            )}
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
            {verdict}
          </p>
          {assistantMessage && (
            <p className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed pt-1 border-t border-emerald-500/10">
              "{assistantMessage}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
