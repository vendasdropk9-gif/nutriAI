import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart as PieIcon, BarChart3, Flame, RefreshCw, Filter, 
  Calendar, FileSpreadsheet, Download, Sparkles, Utensils, 
  TrendingUp, CheckCircle2, ChevronRight, Apple, HeartPulse,
  Layers, Search, ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { collectionGroup, getDocs, collection, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { playSfx, vibrate } from '../lib/sensory';
import { AnimatedCounter } from './AnimatedCounter';
import { IntakeLog } from '../types';

interface DailyMacroAggregate {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Seg 15/09"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logCount: number;
}

interface MealMacroAggregate {
  mealType: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  color: string;
  count: number;
}

// Custom Colors for Macronutrients
const MACRO_COLORS = {
  protein: '#10b981', // Emerald
  carbs: '#f59e0b',   // Amber
  fat: '#ec4899',     // Pink
  calories: '#8b5cf6' // Violet
};

// Colors for Meal Categories
const MEAL_COLORS: Record<string, string> = {
  breakfast: '#f59e0b',
  lunch: '#3b82f6',
  snack: '#10b981',
  dinner: '#8b5cf6',
  other: '#64748b'
};

// Generate realistic mock sample data if Firestore intakeLogs are empty
function generateSampleIntakeLogs(): IntakeLog[] {
  const logs: IntakeLog[] = [];
  const today = new Date();

  const meals = [
    { type: 'breakfast', name: 'Omelete de Claras com Espinafre e Torrada Integral', cal: 340, p: 32, c: 28, f: 10 },
    { type: 'lunch', name: 'Peito de Frango Grelhado, Arroz Integral e Brócolis', cal: 580, p: 48, c: 55, f: 14 },
    { type: 'snack', name: 'Iogurte Grego com Whey Protein e Morangos', cal: 260, p: 25, c: 22, f: 5 },
    { type: 'dinner', name: 'Filé de Salmão ao Forno com Quinoa e Salada', cal: 520, p: 42, c: 35, f: 22 }
  ];

  for (let d = 13; d >= 0; d--) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - d);
    const dateStr = targetDate.toISOString().split('T')[0];

    meals.forEach((meal, idx) => {
      // Small variation per day
      const variation = (Math.random() - 0.5) * 0.15;
      const actualCal = Math.round(meal.cal * (1 + variation));
      const actualP = Math.round(meal.p * (1 + variation));
      const actualC = Math.round(meal.c * (1 + variation));
      const actualF = Math.round(meal.f * (1 + variation));

      logs.push({
        id: `sample_intake_${dateStr}_${idx}`,
        date: `${dateStr}T${10 + idx * 3}:00:00.000Z`,
        mealId: `meal_${idx}`,
        recipeName: meal.name,
        mealType: meal.type,
        adjusted: false,
        planned: { calories: meal.cal, protein: meal.p, carbs: meal.c, fat: meal.f },
        actual: { calories: actualCal, protein: actualP, carbs: actualC, fat: actualF }
      });
    });
  }

  return logs;
}

export function MacronutrientAnalyticsView() {
  const [logs, setLogs] = useState<IntakeLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFirestoreSource, setIsFirestoreSource] = useState<boolean>(false);
  const [dateRangeDays, setDateRangeDays] = useState<number>(7);
  const [selectedMealType, setSelectedMealType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch Intake Logs from Firestore
  const fetchIntakeLogs = useCallback(async () => {
    setLoading(true);
    try {
      let fetchedLogs: IntakeLog[] = [];

      // 1. Try Collection Group Query on 'intakeLogs'
      try {
        const snapshot = await getDocs(query(collectionGroup(db, 'intakeLogs'), limit(150)));
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as IntakeLog;
          if (data && (data.actual || data.planned)) {
            fetchedLogs.push({
              ...data,
              id: docSnap.id || data.id
            });
          }
        });
      } catch (colErr) {
        console.warn('CollectionGroup query warning, trying users collection fallback:', colErr);
      }

      // 2. If collectionGroup returned empty, check user documents subcollections
      if (fetchedLogs.length === 0) {
        try {
          const usersSnap = await getDocs(query(collection(db, 'users'), limit(10)));
          for (const userDoc of usersSnap.docs) {
            const userData = userDoc.data();
            if (userData.intakeLogs && Array.isArray(userData.intakeLogs)) {
              fetchedLogs.push(...userData.intakeLogs);
            }
          }
        } catch (uErr) {
          console.warn('Error fetching users subcollections:', uErr);
        }
      }

      if (fetchedLogs.length > 0) {
        setIsFirestoreSource(true);
        setLogs(fetchedLogs);
      } else {
        // Fallback to rich sample dataset
        setIsFirestoreSource(false);
        setLogs(generateSampleIntakeLogs());
      }
    } catch (err) {
      console.error('Error loading Firestore intake logs:', err);
      setIsFirestoreSource(false);
      setLogs(generateSampleIntakeLogs());
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    fetchIntakeLogs();
  }, [fetchIntakeLogs]);

  const handleRefresh = () => {
    playSfx('tap');
    vibrate(10);
    fetchIntakeLogs();
  };

  // Filter logs based on date range, meal type, and search
  const filteredLogs = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRangeDays);

    return logs.filter(log => {
      const logDate = new Date(log.date);
      if (isNaN(logDate.getTime())) return true;
      if (logDate < cutoffDate) return false;

      if (selectedMealType !== 'all') {
        const logMeal = (log.mealType || 'other').toLowerCase();
        if (logMeal !== selectedMealType) return false;
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const nameMatch = (log.recipeName || '').toLowerCase().includes(q);
        const mealMatch = (log.mealType || '').toLowerCase().includes(q);
        if (!nameMatch && !mealMatch) return false;
      }

      return true;
    });
  }, [logs, dateRangeDays, selectedMealType, searchQuery]);

  // Aggregate daily macronutrients
  const dailyAggregates = useMemo(() => {
    const map = new Map<string, { cal: number; p: number; c: number; f: number; count: number }>();

    filteredLogs.forEach(log => {
      const d = log.date.split('T')[0] || log.date;
      const current = map.get(d) || { cal: 0, p: 0, c: 0, f: 0, count: 0 };
      const info = log.actual || log.planned || { calories: 0, protein: 0, carbs: 0, fat: 0 };

      map.set(d, {
        cal: current.cal + (info.calories || 0),
        p: current.p + (info.protein || 0),
        c: current.c + (info.carbs || 0),
        f: current.f + (info.fat || 0),
        count: current.count + 1
      });
    });

    // Sort by date ascending
    const sortedDates = Array.from(map.keys()).sort();
    
    return sortedDates.map(dateKey => {
      const dateObj = new Date(dateKey + 'T12:00:00');
      const dayLabel = dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
      const values = map.get(dateKey)!;

      return {
        date: dateKey,
        dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        calories: Math.round(values.cal),
        protein: Math.round(values.p),
        carbs: Math.round(values.c),
        fat: Math.round(values.f),
        logCount: values.count
      };
    });
  }, [filteredLogs]);

  // Overall averages and macro splits
  const summary = useMemo(() => {
    const totalDays = Math.max(1, dailyAggregates.length);
    const sumCal = dailyAggregates.reduce((acc, curr) => acc + curr.calories, 0);
    const sumP = dailyAggregates.reduce((acc, curr) => acc + curr.protein, 0);
    const sumC = dailyAggregates.reduce((acc, curr) => acc + curr.carbs, 0);
    const sumF = dailyAggregates.reduce((acc, curr) => acc + curr.fat, 0);

    const avgCal = Math.round(sumCal / totalDays);
    const avgP = Math.round(sumP / totalDays);
    const avgC = Math.round(sumC / totalDays);
    const avgF = Math.round(sumF / totalDays);

    // Calories from each macro: P=4kcal/g, C=4kcal/g, F=9kcal/g
    const pKcal = avgP * 4;
    const cKcal = avgC * 4;
    const fKcal = avgF * 9;
    const totalMacroKcal = Math.max(1, pKcal + cKcal + fKcal);

    const pPct = Math.round((pKcal / totalMacroKcal) * 100);
    const cPct = Math.round((cKcal / totalMacroKcal) * 100);
    const fPct = Math.round((fKcal / totalMacroKcal) * 100);

    return {
      avgCalories: avgCal,
      avgProtein: avgP,
      avgCarbs: avgC,
      avgFat: avgF,
      proteinPct: pPct,
      carbsPct: cPct,
      fatPct: fPct,
      totalLogs: filteredLogs.length,
      daysTracked: totalDays
    };
  }, [dailyAggregates, filteredLogs]);

  // Aggregate by meal category
  const mealAggregates = useMemo<MealMacroAggregate[]>(() => {
    const mealMap: Record<string, { cal: number; p: number; c: number; f: number; count: number }> = {
      breakfast: { cal: 0, p: 0, c: 0, f: 0, count: 0 },
      lunch: { cal: 0, p: 0, c: 0, f: 0, count: 0 },
      snack: { cal: 0, p: 0, c: 0, f: 0, count: 0 },
      dinner: { cal: 0, p: 0, c: 0, f: 0, count: 0 }
    };

    filteredLogs.forEach(log => {
      const type = (log.mealType || 'other').toLowerCase();
      const info = log.actual || log.planned || { calories: 0, protein: 0, carbs: 0, fat: 0 };
      
      if (!mealMap[type]) {
        mealMap[type] = { cal: 0, p: 0, c: 0, f: 0, count: 0 };
      }

      mealMap[type].cal += info.calories || 0;
      mealMap[type].p += info.protein || 0;
      mealMap[type].c += info.carbs || 0;
      mealMap[type].f += info.fat || 0;
      mealMap[type].count += 1;
    });

    const labels: Record<string, string> = {
      breakfast: 'Café da Manhã',
      lunch: 'Almoço',
      snack: 'Lanche Intermediário',
      dinner: 'Jantar',
      other: 'Outros'
    };

    return Object.keys(mealMap).map(key => {
      const item = mealMap[key];
      const count = Math.max(1, item.count);
      return {
        mealType: key,
        label: labels[key] || key,
        calories: Math.round(item.cal / count),
        protein: Math.round(item.p / count),
        carbs: Math.round(item.c / count),
        fat: Math.round(item.f / count),
        color: MEAL_COLORS[key] || '#64748b',
        count: item.count
      };
    }).filter(m => m.count > 0);
  }, [filteredLogs]);

  // Pie chart data for macro split
  const macroPieData = [
    { name: 'Proteínas', value: summary.avgProtein, percentage: summary.proteinPct, color: MACRO_COLORS.protein, kcal: summary.avgProtein * 4 },
    { name: 'Carboidratos', value: summary.avgCarbs, percentage: summary.carbsPct, color: MACRO_COLORS.carbs, kcal: summary.avgCarbs * 4 },
    { name: 'Gorduras', value: summary.avgFat, percentage: summary.fatPct, color: MACRO_COLORS.fat, kcal: summary.avgFat * 9 }
  ];

  // CSV Export
  const handleExportCsv = () => {
    playSfx('success');
    vibrate([20, 50, 20]);

    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'Data;Dia;Calorias (kcal);Proteinas (g);Carboidratos (g);Gorduras (g);Refeicoes Registradas\n';

    dailyAggregates.forEach(row => {
      csv += `${row.date};${row.dayLabel};${row.calories};${row.protein};${row.carbs};${row.fat};${row.logCount}\n`;
    });

    csv += `TOTAL MEDIO;${summary.daysTracked} dias;${summary.avgCalories};${summary.avgProtein};${summary.avgCarbs};${summary.avgFat};${summary.totalLogs}\n`;

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nutriai_distribuicao_macronutrientes_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-100 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Apple className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <PieIcon className="w-5 h-5 animate-pulse" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Distribuição Diária de Macronutrientes
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Análise agregada de consumo alimentar (Proteínas, Carboidratos, Gorduras e Calorias) dos usuários sincronizada com os logs do Firestore.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Source Badge */}
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
              isFirestoreSource 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isFirestoreSource ? 'Firestore Conectado' : 'Dados Sintéticos'}</span>
            </span>

            <button
              onClick={handleExportCsv}
              className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
              title="Exportar dados de macronutrientes em CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 cursor-pointer"
              title="Atualizar Logs do Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-emerald-400" /> Período:
            </span>
            <div className="flex items-center bg-slate-900/90 rounded-xl p-1 border border-slate-800">
              {[
                { days: 7, label: 'Últimos 7 dias' },
                { days: 14, label: '14 dias' },
                { days: 30, label: '30 dias' }
              ].map(item => (
                <button
                  key={item.days}
                  onClick={() => {
                    playSfx('pop');
                    setDateRangeDays(item.days);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateRangeDays === item.days 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <span className="text-slate-400 font-medium ml-2">Refeição:</span>
            <select
              value={selectedMealType}
              onChange={(e) => {
                playSfx('pop');
                setSelectedMealType(e.target.value);
              }}
              className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 font-medium text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Todas as Refeições</option>
              <option value="breakfast">Café da Manhã</option>
              <option value="lunch">Almoço</option>
              <option value="snack">Lanche Intermediário</option>
              <option value="dinner">Jantar</option>
            </select>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar receita ou tipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Grid with Framer Motion & AnimatedCounter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Calorias Médias */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Média Calorias</span>
            <span className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              <AnimatedCounter value={summary.avgCalories} suffix=" kcal" />
            </span>
            <span className="block text-[11px] text-violet-300/80 font-medium mt-0.5">
              Energia Total Diária
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Média de {summary.daysTracked} dias avaliados</p>
        </motion.div>

        {/* Proteínas */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Proteínas</span>
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Utensils className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              <AnimatedCounter value={summary.avgProtein} suffix="g" />
            </span>
            <span className="block text-[11px] text-emerald-300 font-bold mt-0.5">
              <AnimatedCounter value={summary.proteinPct} suffix="% do VET total" />
            </span>
          </div>
          <p className="text-[10px] text-emerald-400/80 mt-2">4 kcal por grama</p>
        </motion.div>

        {/* Carboidratos */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/30 shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Carboidratos</span>
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              <AnimatedCounter value={summary.avgCarbs} suffix="g" />
            </span>
            <span className="block text-[11px] text-amber-300 font-bold mt-0.5">
              <AnimatedCounter value={summary.carbsPct} suffix="% do VET total" />
            </span>
          </div>
          <p className="text-[10px] text-amber-400/80 mt-2">4 kcal por grama</p>
        </motion.div>

        {/* Gorduras */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/30 shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Gorduras</span>
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <HeartPulse className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              <AnimatedCounter value={summary.avgFat} suffix="g" />
            </span>
            <span className="block text-[11px] text-rose-300 font-bold mt-0.5">
              <AnimatedCounter value={summary.fatPct} suffix="% do VET total" />
            </span>
          </div>
          <p className="text-[10px] text-rose-400/80 mt-2">9 kcal por grama</p>
        </motion.div>

        {/* Total Registros */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Refeições Registradas</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              <AnimatedCounter value={summary.totalLogs} />
            </span>
            <span className="block text-[11px] text-slate-300 font-medium mt-0.5">
              Logs no Período
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">No Firestore `intakeLogs`</p>
        </motion.div>
      </div>

      {/* Main Charts Section using Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Macronutrients Stacked Bar Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Evolução Diária de Gramas por Macronutriente
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribuição diária de Proteínas, Carboidratos e Gorduras (g)
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Proteína
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Carbos
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Gorduras
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyAggregates} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="dayLabel" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit="g" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155', 
                    borderRadius: '16px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}g (${name === 'protein' ? value * 4 : name === 'carbs' ? value * 4 : value * 9} kcal)`, 
                    name === 'protein' ? 'Proteínas' : name === 'carbs' ? 'Carboidratos' : 'Gorduras'
                  ]}
                />
                <Bar dataKey="protein" name="protein" fill={MACRO_COLORS.protein} radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="carbs" name="carbs" fill={MACRO_COLORS.carbs} radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="fat" name="fat" fill={MACRO_COLORS.fat} radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Macro Proportion Donut PieChart */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between"
        >
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              Divisão Proporcional de Macros
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Proporção média da energia diária (% VET)
            </p>

            <div className="h-56 w-full mt-2 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {macroPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '11px'
                    }}
                    formatter={(val: number, name: string) => [`${val}g`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute text-center pointer-events-none">
                <span className="text-xl font-black text-white block">
                  <AnimatedCounter value={summary.avgCalories} />
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400">kcal/dia</span>
              </div>
            </div>
          </div>

          {/* Custom Macro Legend List */}
          <div className="space-y-2 mt-2 pt-3 border-t border-slate-800">
            {macroPieData.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md" style={{ backgroundColor: item.color }}></span>
                  <span className="font-semibold text-slate-200">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white"><AnimatedCounter value={item.value} suffix="g" /></span>
                  <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Secondary Chart: Meal Breakdown */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Utensils className="w-4 h-4 text-emerald-400" />
              Média de Nutrientes por Categoria de Refeição
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparativo de aporte energético e macronutrientes por tipo de refeição
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {mealAggregates.map(meal => (
            <motion.div 
              key={meal.mealType}
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{meal.label}</span>
                <span className="p-1.5 rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: meal.color }}>
                  {meal.count} logs
                </span>
              </div>

              <div className="mt-3">
                <span className="text-xl font-black text-white">
                  <AnimatedCounter value={meal.calories} suffix=" kcal" />
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1.5 text-xs">
                <div className="flex justify-between text-emerald-400">
                  <span>Proteínas</span>
                  <span className="font-bold"><AnimatedCounter value={meal.protein} suffix="g" /></span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Carboidratos</span>
                  <span className="font-bold"><AnimatedCounter value={meal.carbs} suffix="g" /></span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Gorduras</span>
                  <span className="font-bold"><AnimatedCounter value={meal.fat} suffix="g" /></span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Firestore Intake Logs Detailed Table */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Registros Recentes de Consumo (`intakeLogs`)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Exibindo os últimos {filteredLogs.length} registros extraídos do banco
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3 rounded-l-xl">Data/Hora</th>
                <th className="p-3">Refeição / Receita</th>
                <th className="p-3">Categoria</th>
                <th className="p-3 text-right">Calorias</th>
                <th className="p-3 text-right text-emerald-400">Proteína</th>
                <th className="p-3 text-right text-amber-400">Carbos</th>
                <th className="p-3 text-right text-rose-400 rounded-r-xl">Gorduras</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.slice(0, 10).map((log, i) => {
                const info = log.actual || log.planned || { calories: 0, protein: 0, carbs: 0, fat: 0 };
                const dateObj = new Date(log.date);
                const dateFormatted = !isNaN(dateObj.getTime()) 
                  ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : log.date;

                return (
                  <tr key={log.id || i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono text-slate-400 text-[11px]">{dateFormatted}</td>
                    <td className="p-3 font-bold text-white">{log.recipeName || 'Refeição Personalizada'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {log.mealType ? log.mealType.toUpperCase() : 'GERAL'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-white">{info.calories || 0} kcal</td>
                    <td className="p-3 text-right font-bold text-emerald-400">{info.protein || 0}g</td>
                    <td className="p-3 text-right font-bold text-amber-400">{info.carbs || 0}g</td>
                    <td className="p-3 text-right font-bold text-rose-400">{info.fat || 0}g</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
