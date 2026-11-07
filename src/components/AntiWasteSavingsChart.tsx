import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell, CartesianGrid, Legend 
} from 'recharts';
import { 
  TrendingUp, DollarSign, Scale, Leaf, ChefHat, Sparkles, 
  Calendar, CheckCircle2, PlusCircle, ArrowUpRight, Flame, 
  Award, Info, RefreshCw, Layers, Check, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSfx, vibrate } from '../lib/sensory';
import { speak } from '../lib/speech';

export interface AntiWasteSavingsEntry {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  recipeName: string;
  rescuedIngredients: string[];
  savedReais: number;
  savedKg: number;
}

const STORAGE_KEY = 'nutri_anti_waste_savings_history';

// Generate realistic default data for the last 30 days
function generateDefault30DaysSavings(): AntiWasteSavingsEntry[] {
  const now = new Date();
  const entries: AntiWasteSavingsEntry[] = [
    {
      id: 'save-1',
      date: new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0],
      recipeName: 'Omelete Proteico de Vegetais Maduros',
      rescuedIngredients: ['Tomate Italiano', 'Espinafre Fresco', 'Ovos Caipiras'],
      savedReais: 18.50,
      savedKg: 0.55
    },
    {
      id: 'save-2',
      date: new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0],
      recipeName: 'Sopa Cremosa de Legumes Anti-Desperdício',
      rescuedIngredients: ['Cenoura', 'Batata Doce', 'Alho-Poró'],
      savedReais: 24.20,
      savedKg: 0.85
    },
    {
      id: 'save-3',
      date: new Date(now.getTime() - 9 * 86400000).toISOString().split('T')[0],
      recipeName: 'Wrap Fit Integral de Frango Desfiado',
      rescuedIngredients: ['Peito de Frango Resfriado', 'Folhas Verdes'],
      savedReais: 29.80,
      savedKg: 0.65
    },
    {
      id: 'save-4',
      date: new Date(now.getTime() - 13 * 86400000).toISOString().split('T')[0],
      recipeName: 'Bowl Colorido com Quinoa e Legumes Salteados',
      rescuedIngredients: ['Brócolis', 'Cebola Roxa', 'Pimentão Amarelo'],
      savedReais: 21.40,
      savedKg: 0.60
    },
    {
      id: 'save-5',
      date: new Date(now.getTime() - 17 * 86400000).toISOString().split('T')[0],
      recipeName: 'Smoothie Revitalizante de Frutas Maduras',
      rescuedIngredients: ['Banana Madura', 'Morangos', 'Iogurte Grego'],
      savedReais: 16.70,
      savedKg: 0.45
    },
    {
      id: 'save-6',
      date: new Date(now.getTime() - 21 * 86400000).toISOString().split('T')[0],
      recipeName: 'Refogado Nutritivo de Talos e Folhas',
      rescuedIngredients: ['Talos de Couve', 'Talos de Brócolis', 'Cenoura'],
      savedReais: 15.30,
      savedKg: 0.70
    },
    {
      id: 'save-7',
      date: new Date(now.getTime() - 24 * 86400000).toISOString().split('T')[0],
      recipeName: 'Risoto Rápido com Sobras e Queijo Branco',
      rescuedIngredients: ['Arroz Cozido', 'Queijo Minas', 'Abobrinha'],
      savedReais: 32.50,
      savedKg: 0.90
    },
    {
      id: 'save-8',
      date: new Date(now.getTime() - 28 * 86400000).toISOString().split('T')[0],
      recipeName: 'Muffin Salgado Proteico de Ovos e Ervas',
      rescuedIngredients: ['Ovos', 'Ervas Frescas', 'Ricota'],
      savedReais: 14.60,
      savedKg: 0.40
    }
  ];

  return entries;
}

export function AntiWasteSavingsChart() {
  const [savingsHistory, setSavingsHistory] = useState<AntiWasteSavingsEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    const defaults = generateDefault30DaysSavings();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults)); } catch (e) {}
    return defaults;
  });

  const [activeMetric, setActiveMetric] = useState<'reais' | 'kg' | 'both'>('reais');
  const [viewGrouping, setViewGrouping] = useState<'weekly' | 'recent'>('weekly');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newIngredients, setNewIngredients] = useState('');
  const [newSavedReais, setNewSavedReais] = useState('18.50');
  const [newSavedKg, setNewSavedKg] = useState('0.50');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter entries to only the last 30 days
  const last30DaysEntries = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const minDateStr = thirtyDaysAgo.toISOString().split('T')[0];

    return savingsHistory.filter(e => e.date >= minDateStr);
  }, [savingsHistory]);

  // Aggregate totals
  const totalSavedReais = useMemo(() => {
    return last30DaysEntries.reduce((acc, curr) => acc + (Number(curr.savedReais) || 0), 0);
  }, [last30DaysEntries]);

  const totalSavedKg = useMemo(() => {
    return last30DaysEntries.reduce((acc, curr) => acc + (Number(curr.savedKg) || 0), 0);
  }, [last30DaysEntries]);

  const totalRecipesRescued = last30DaysEntries.length;
  const estimatedCo2Avoided = (totalSavedKg * 2.5).toFixed(1);

  // Weekly aggregated chart data (4 weeks of last 30 days)
  const weeklyChartData = useMemo(() => {
    const now = new Date();
    const weeks = [
      { key: 'w1', name: 'Semana 1 (22-30d)', minDay: 22, maxDay: 30, reais: 0, kg: 0, recipesCount: 0 },
      { key: 'w2', name: 'Semana 2 (15-21d)', minDay: 15, maxDay: 21, reais: 0, kg: 0, recipesCount: 0 },
      { key: 'w3', name: 'Semana 3 (8-14d)', minDay: 8, maxDay: 14, reais: 0, kg: 0, recipesCount: 0 },
      { key: 'w4', name: 'Semana 4 (Últimos 7d)', minDay: 0, maxDay: 7, reais: 0, kg: 0, recipesCount: 0 },
    ];

    last30DaysEntries.forEach(item => {
      const itemDate = new Date(item.date + 'T12:00:00');
      const diffMs = now.getTime() - itemDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      const targetWeek = weeks.find(w => diffDays >= w.minDay && diffDays <= w.maxDay);
      if (targetWeek) {
        targetWeek.reais += Number(item.savedReais) || 0;
        targetWeek.kg += Number(item.savedKg) || 0;
        targetWeek.recipesCount += 1;
      }
    });

    return weeks.map(w => ({
      name: w.name,
      reais: Number(w.reais.toFixed(2)),
      kg: Number(w.kg.toFixed(2)),
      receitas: w.recipesCount
    }));
  }, [last30DaysEntries]);

  // Rolling 6-period chart data (5-day intervals)
  const recentIntervalChartData = useMemo(() => {
    const now = new Date();
    const intervals = [
      { name: '25-30d atrás', min: 25, max: 30, reais: 0, kg: 0 },
      { name: '20-24d atrás', min: 20, max: 24, reais: 0, kg: 0 },
      { name: '15-19d atrás', min: 15, max: 19, reais: 0, kg: 0 },
      { name: '10-14d atrás', min: 10, max: 14, reais: 0, kg: 0 },
      { name: '5-9d atrás', min: 5, max: 9, reais: 0, kg: 0 },
      { name: 'Últimos 4d', min: 0, max: 4, reais: 0, kg: 0 },
    ];

    last30DaysEntries.forEach(item => {
      const itemDate = new Date(item.date + 'T12:00:00');
      const diffDays = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));

      const target = intervals.find(i => diffDays >= i.min && diffDays <= i.max);
      if (target) {
        target.reais += Number(item.savedReais) || 0;
        target.kg += Number(item.savedKg) || 0;
      }
    });

    return intervals.map(i => ({
      name: i.name,
      reais: Number(i.reais.toFixed(2)),
      kg: Number(i.kg.toFixed(2))
    }));
  }, [last30DaysEntries]);

  const activeChartData = viewGrouping === 'weekly' ? weeklyChartData : recentIntervalChartData;

  const handleAddNewSavings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipeName.trim()) return;

    const reaisVal = Math.max(1, Number(newSavedReais) || 15);
    const kgVal = Math.max(0.1, Number(newSavedKg) || 0.4);
    const ingredientsArr = newIngredients
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const newEntry: AntiWasteSavingsEntry = {
      id: `save-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      recipeName: newRecipeName.trim(),
      rescuedIngredients: ingredientsArr.length > 0 ? ingredientsArr : ['Ingredientes da Geladeira'],
      savedReais: Number(reaisVal.toFixed(2)),
      savedKg: Number(kgVal.toFixed(2))
    };

    const updated = [newEntry, ...savingsHistory];
    setSavingsHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}

    playSfx('success');
    vibrate([40, 60]);
    speak(`Receita anti-desperdício registrada! Você economizou R$ ${reaisVal.toFixed(2)} e evitou o descarte de ${kgVal.toFixed(2)} quilos de comida.`, {
      lang: 'pt-BR',
      voice: 'Aoede'
    });

    setSuccessToast(`+R$ ${reaisVal.toFixed(2)} economizados e +${kgVal.toFixed(2)} kg salvos!`);
    setTimeout(() => setSuccessToast(null), 4000);

    setNewRecipeName('');
    setNewIngredients('');
    setIsLogModalOpen(false);
  };

  const handleResetDemoData = () => {
    const defaults = generateDefault30DaysSavings();
    setSavingsHistory(defaults);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    } catch (e) {}
    playSfx('tap');
    vibrate(20);
    setSuccessToast('Histórico de 30 dias restaurado com sucesso!');
    setTimeout(() => setSuccessToast(null), 3500);
  };

  return (
    <div 
      id="anti-waste-savings-section"
      className="bg-white dark:bg-slate-800/80 rounded-[28px] border border-emerald-500/20 dark:border-emerald-500/20 p-5 sm:p-7 shadow-xl backdrop-blur-xl space-y-6"
    >
      {/* Header with Title and Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Economia com Receitas Anti-Desperdício</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                  Últimos 30 Dias
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhe o impacto financeiro (em R$) e a quantidade de alimentos resgatados ao cozinhar as sugestões contra desperdício.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
          <button
            type="button"
            id="btn-open-log-anti-waste"
            onClick={() => { setIsLogModalOpen(true); playSfx('tap'); }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Registrar Preparo</span>
          </button>

          <button
            type="button"
            onClick={handleResetDemoData}
            title="Restaurar dados dos últimos 30 dias"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Summary Highlight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Reais Economizados */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-1">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">Economia Total</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100">
            R$ {totalSavedReais.toFixed(2).replace('.', ',')}
          </div>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">
            Economizados nos últimos 30 dias
          </p>
        </div>

        {/* Card 2: Kg de Comida Salvos */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50/50 dark:from-cyan-950/30 dark:to-blue-950/20 border border-cyan-200/60 dark:border-cyan-800/40 space-y-1">
          <div className="flex items-center justify-between text-cyan-700 dark:text-cyan-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">Alimentos Salvos</span>
            <Scale className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-900 dark:text-cyan-100">
            {totalSavedKg.toFixed(2).replace('.', ',')} kg
          </div>
          <p className="text-[11px] text-cyan-700/80 dark:text-cyan-300/80 font-medium">
            Resgatados do descarte
          </p>
        </div>

        {/* Card 3: Receitas Executadas */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-1">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">Receitas Feitas</span>
            <ChefHat className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-100">
            {totalRecipesRescued} preparos
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 font-medium">
            Sugestões aproveitadas a tempo
          </p>
        </div>

        {/* Card 4: CO2 Evitado */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50/50 dark:from-purple-950/30 dark:to-indigo-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-1">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">Impacto Ecológico</span>
            <Leaf className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-900 dark:text-purple-100">
            {estimatedCo2Avoided} kg CO₂e
          </div>
          <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 font-medium">
            Emissões evitadas no aterro
          </p>
        </div>
      </div>

      {/* Controls Bar: Metric Toggle (R$ vs kg vs Ambos) and Grouping */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-600 dark:text-slate-300">
            Visualizar em:
          </span>
          <div className="inline-flex rounded-xl bg-slate-200 dark:bg-slate-800 p-1">
            <button
              type="button"
              id="btn-metric-reais"
              onClick={() => { setActiveMetric('reais'); playSfx('tap'); }}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                activeMetric === 'reais'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>R$ (Reais)</span>
            </button>
            <button
              type="button"
              id="btn-metric-kg"
              onClick={() => { setActiveMetric('kg'); playSfx('tap'); }}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                activeMetric === 'kg'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>kg (Alimentos)</span>
            </button>
            <button
              type="button"
              id="btn-metric-both"
              onClick={() => { setActiveMetric('both'); playSfx('tap'); }}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                activeMetric === 'both'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Comparativo Duplo</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600 dark:text-slate-300">
            Agrupamento:
          </span>
          <div className="inline-flex rounded-xl bg-slate-200 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => { setViewGrouping('weekly'); playSfx('tap'); }}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                viewGrouping === 'weekly'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Por Semana (4 Semanas)
            </button>
            <button
              type="button"
              onClick={() => { setViewGrouping('recent'); playSfx('tap'); }}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                viewGrouping === 'recent'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Intervalos de 5 Dias
            </button>
          </div>
        </div>
      </div>

      {/* Main Recharts Bar Chart Container */}
      <div className="w-full h-[280px] sm:h-[320px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={activeChartData}
            margin={{ top: 20, right: 20, left: 0, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: '#888' }}
              axisLine={{ stroke: '#888', opacity: 0.2 }}
              tickLine={false}
              dy={8}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#888' }}
              axisLine={{ stroke: '#888', opacity: 0.2 }}
              tickLine={false}
              unit={activeMetric === 'kg' ? ' kg' : activeMetric === 'reais' ? ' R$' : ''}
            />
            <RechartsTooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-slate-700 text-xs space-y-1.5">
                      <p className="font-bold text-slate-200 border-b border-slate-700/80 pb-1">
                        {label}
                      </p>
                      {payload.map((entry: any, index: number) => (
                        <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.name}:</span>
                          </span>
                          <span className="font-mono font-bold">
                            {entry.dataKey === 'reais' 
                              ? `R$ ${Number(entry.value).toFixed(2).replace('.', ',')}`
                              : `${Number(entry.value).toFixed(2).replace('.', ',')} kg`}
                          </span>
                        </div>
                      ))}
                      {payload[0]?.payload?.receitas !== undefined && (
                        <p className="text-[10px] text-emerald-400 pt-0.5">
                          🥗 {payload[0].payload.receitas} receitas executadas
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} 
            />

            {(activeMetric === 'reais' || activeMetric === 'both') && (
              <Bar 
                name="Economia Financeira (R$)" 
                dataKey="reais" 
                fill="#10b981" 
                radius={[6, 6, 0, 0]} 
                maxBarSize={48}
              >
                {activeChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-reais-${index}`} 
                    fill="url(#emeraldGradient)" 
                  />
                ))}
              </Bar>
            )}

            {(activeMetric === 'kg' || activeMetric === 'both') && (
              <Bar 
                name="Alimentos Resgatados (kg)" 
                dataKey="kg" 
                fill="#06b6d4" 
                radius={[6, 6, 0, 0]} 
                maxBarSize={48}
              >
                {activeChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-kg-${index}`} 
                    fill="url(#cyanGradient)" 
                  />
                ))}
              </Bar>
            )}

            <defs>
              <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.65} />
              </linearGradient>
              <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#0891b2" stopOpacity={0.65} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="p-3 rounded-2xl bg-emerald-500 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-emerald-500/20 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recent Rescued Recipes List */}
      <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Receitas Anti-Desperdício Executadas no Período ({last30DaysEntries.length})
          </h4>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Ordenado por data mais recente
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {last30DaysEntries.slice(0, 4).map((entry) => (
            <div 
              key={entry.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5 text-xs hover:border-emerald-500/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400">
                  {entry.date}
                </span>
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                  +R$ {entry.savedReais.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <h5 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                {entry.recipeName}
              </h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                Resgatou: {entry.rescuedIngredients.join(', ')}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800 text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">
                <span>Alimentos resgatados:</span>
                <span>{entry.savedKg.toFixed(2).replace('.', ',')} kg</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Registrar Preparo de Receita Anti-Desperdício */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-800 dark:text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Registrar Receita Anti-Desperdício
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Some a economia gerada ao seu gráfico dos últimos 30 dias.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewSavings} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nome da Receita Feita
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Frigideira Proteica de Sobras de Vegetais"
                  value={newRecipeName}
                  onChange={(e) => setNewRecipeName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ingredientes Resgatados (separados por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Espinafre, Tomate maduro, Peito de frango"
                  value={newIngredients}
                  onChange={(e) => setNewIngredients(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Economia Estimada (R$)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="1"
                    value={newSavedReais}
                    onChange={(e) => setNewSavedReais(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Alimento Salvo (kg)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={newSavedKg}
                    onChange={(e) => setNewSavedKg(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-cyan-500/40 font-mono font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 text-[11px] text-emerald-800 dark:text-emerald-300">
                💡 Cada refeição preparada aproveitando ingredientes a vencer salva em média R$ 15 a R$ 30 e evita cerca de 0,5 kg de desperdício alimentar!
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Salvar no Gráfico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
