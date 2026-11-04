import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, 
  Flame, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  Camera, 
  Info,
  Beef,
  Wheat,
  Droplet,
  Droplets,
  Plus,
  Download,
  FileText,
  X,
  Check,
  Copy,
  RefreshCw
} from 'lucide-react';
import { UserProfile } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { playSfx, vibrate } from '../lib/sensory';
import { useNutritionGoals } from '../hooks/useNutritionGoals';

interface DailyNutritionProgressCardProps {
  profile: UserProfile | null;
  onNavigate?: (tabId: string) => void;
  onUpdateProfile?: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
  className?: string;
}

interface MacroItem {
  id: 'protein' | 'carbs' | 'fat';
  label: string;
  shortLabel: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  trackColor: string;
  gradientFrom: string;
  gradientTo: string;
  icon: React.ReactNode;
  kcalPerGram: number;
}

export const DailyNutritionProgressCard: React.FC<DailyNutritionProgressCardProps> = ({
  profile,
  onNavigate,
  onUpdateProfile,
  className = ''
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'concentric' | 'cards'>('concentric');

  // Use custom useNutritionGoals hook for efficient aggregation
  const nutritionSummary = useNutritionGoals(profile);
  const {
    currentCalories,
    currentProtein,
    currentCarbs,
    currentFat,
    currentWater,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    targetWater,
    caloriesPercent,
    proteinPercent,
    carbsPercent,
    fatPercent,
    waterPercent
  } = nutritionSummary;

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const handleSyncData = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    playSfx('tap');
    vibrate(15);

    // Simulate database / state synchronization with Framer Motion spinning indicator
    await new Promise(resolve => setTimeout(resolve, 1400));

    if (onUpdateProfile) {
      onUpdateProfile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lastSyncedAt: new Date().toISOString()
        };
      });
    }

    setIsSyncing(false);
    setSyncToast('Dados do Assistant360 sincronizados com o banco!');
    playSfx('success');
    vibrate([20, 30, 20]);
    setTimeout(() => setSyncToast(null), 3500);
  };

  // Generate structured export report object
  const exportReportData = React.useMemo(() => {
    return {
      reportTitle: "Relatório Diário de Nutrição & Hidratação - NutriAI Assistant360",
      generatedAt: new Date().toISOString(),
      user: {
        name: profile?.name || "Usuário NutriAI",
        email: profile?.email || null,
        weightKg: profile?.weight || null,
        goals: profile?.goals || "Saúde e Alimentação"
      },
      date: nutritionSummary.dateStr,
      metricsSummary: {
        calories: {
          current: nutritionSummary.currentCalories,
          target: nutritionSummary.targetCalories,
          remaining: nutritionSummary.remainingCalories,
          percentage: nutritionSummary.caloriesPercent,
          unit: "kcal"
        },
        protein: {
          current: nutritionSummary.currentProtein,
          target: nutritionSummary.targetProtein,
          remaining: nutritionSummary.remainingProtein,
          percentage: nutritionSummary.proteinPercent,
          unit: "g"
        },
        carbs: {
          current: nutritionSummary.currentCarbs,
          target: nutritionSummary.targetCarbs,
          remaining: nutritionSummary.remainingCarbs,
          percentage: nutritionSummary.carbsPercent,
          unit: "g"
        },
        fat: {
          current: nutritionSummary.currentFat,
          target: nutritionSummary.targetFat,
          remaining: nutritionSummary.remainingFat,
          percentage: nutritionSummary.fatPercent,
          unit: "g"
        },
        water: {
          current: nutritionSummary.currentWater,
          target: nutritionSummary.targetWater,
          remaining: nutritionSummary.remainingWater,
          percentage: nutritionSummary.waterPercent,
          unit: "ml"
        }
      },
      status: {
        isCaloriesMet: nutritionSummary.isCaloriesMet,
        isProteinMet: nutritionSummary.isProteinMet,
        isWaterMet: nutritionSummary.isWaterMet
      },
      activityCounts: {
        mealCountToday: nutritionSummary.mealCountToday,
        hydrationCountToday: nutritionSummary.hydrationCountToday
      }
    };
  }, [profile, nutritionSummary]);

  const handleDownloadJSON = () => {
    playSfx('success');
    vibrate([20, 30]);
    const jsonString = JSON.stringify(exportReportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutriai-relatorio-nutricional-${nutritionSummary.dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = () => {
    playSfx('tap');
    vibrate(15);
    navigator.clipboard.writeText(JSON.stringify(exportReportData, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleQuickAddWater = (amount = 250) => {
    playSfx('pop');
    vibrate(20);
    if (onUpdateProfile) {
      onUpdateProfile(prev => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        const existingLogs = prev.hydrationLogs || [];
        return {
          ...prev,
          hydrationLogs: [
            ...existingLogs,
            { id: crypto.randomUUID(), date: now, amount }
          ]
        };
      });
    }
  };

  const macros: MacroItem[] = [
    {
      id: 'protein',
      label: t('macro_protein', 'Proteínas'),
      shortLabel: 'PROT',
      current: currentProtein,
      goal: targetProtein,
      unit: 'g',
      color: '#10B981', // emerald-500
      trackColor: 'rgba(16, 185, 129, 0.15)',
      gradientFrom: '#10B981',
      gradientTo: '#34D399',
      icon: <Beef className="w-4 h-4 text-emerald-500" />,
      kcalPerGram: 4
    },
    {
      id: 'carbs',
      label: t('macro_carbs', 'Carboidratos'),
      shortLabel: 'CARB',
      current: currentCarbs,
      goal: targetCarbs,
      unit: 'g',
      color: '#F59E0B', // amber-500
      trackColor: 'rgba(245, 158, 11, 0.15)',
      gradientFrom: '#F59E0B',
      gradientTo: '#FBBF24',
      icon: <Wheat className="w-4 h-4 text-amber-500" />,
      kcalPerGram: 4
    },
    {
      id: 'fat',
      label: t('macro_fat', 'Gorduras'),
      shortLabel: 'GORD',
      current: currentFat,
      goal: targetFat,
      unit: 'g',
      color: '#38BDF8', // sky-400
      trackColor: 'rgba(56, 189, 248, 0.15)',
      gradientFrom: '#38BDF8',
      gradientTo: '#818CF8',
      icon: <Droplet className="w-4 h-4 text-sky-400" />,
      kcalPerGram: 9
    }
  ];

  // Helper for SVG circular progress
  const renderCircle = (
    radius: number,
    strokeWidth: number,
    percent: number,
    strokeColor: string,
    trackColor: string,
    cx = 100,
    cy = 100
  ) => {
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, percent) / 100) * circumference;

    return (
      <g key={radius}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress Arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </g>
    );
  };

  return (
    <div className={`card-premium p-6 sm:p-8 rounded-[32px] w-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md relative overflow-hidden transition-all duration-300 ${className}`}>
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('daily_nutrition_progress', 'Progresso Nutricional do Dia')}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{t('macronutrients_goal', 'Metas Diárias: Calorias, Proteína & Hidratação')}</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {t('macronutrients_desc', 'Acompanhamento em tempo real dos seus registros de refeições (intakeLogs) e água (hydrationLogs).')}
          </p>
        </div>

        {/* Header Actions: View Toggle & Export Button */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                setViewMode('concentric');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'concentric'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t('view_rings', 'Anel Triplo')}
            </button>
            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                setViewMode('cards');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t('view_detailed', 'Por Nutriente')}
            </button>
          </div>

          {/* Sync Button with Framer-Motion Spinning Animation */}
          <button
            type="button"
            onClick={handleSyncData}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1.5 border border-blue-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
            title="Sincronizar dados nutricionais do Assistant360 com o banco de dados"
          >
            <motion.div
              animate={isSyncing ? { rotate: 360 } : { rotate: 0 }}
              transition={isSyncing ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0.2 }}
              className="flex items-center justify-center shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </motion.div>
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              vibrate(15);
              setIsExportModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/20 transition-all cursor-pointer active:scale-95"
            title="Exportar resumo diário em formato JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* Sync Success Feedback Toast */}
      <AnimatePresence>
        {syncToast && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="relative z-20 mb-4 p-3 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{syncToast}</span>
            </div>
            <span className="text-[10px] text-blue-500 dark:text-blue-400 font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3 Pillars Summary Cards: Calorie, Protein, Water */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* 1. Calorias */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-500">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              {caloriesPercent}%
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Calorias (intakeLogs)</span>
            <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
              <span data-testid="daily-calories-consumed">{currentCalories}</span> <span className="text-xs font-normal text-slate-400">/ {targetCalories} kcal</span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${caloriesPercent}%` }}
              transition={{ type: "spring", stiffness: 60, damping: 15 }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
            />
          </div>
        </div>

        {/* 2. Proteínas */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500">
              <Beef className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              {proteinPercent}%
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Proteína Diária</span>
            <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
              {currentProtein}g <span className="text-xs font-normal text-slate-400">/ {targetProtein}g</span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${proteinPercent}%` }}
              transition={{ type: "spring", stiffness: 60, damping: 15 }}
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
            />
          </div>
        </div>

        {/* 3. Hidratação (Água) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent border border-sky-500/30 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400">
              <Droplets className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-sky-500 dark:text-sky-400 bg-sky-500/15 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                {waterPercent}%
              </span>
              <button
                type="button"
                onClick={() => handleQuickAddWater(250)}
                className="w-6 h-6 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center justify-center transition active:scale-90 cursor-pointer"
                title="Adicionar 250ml de água"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Hidratação (Água)</span>
            <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
              {currentWater} <span className="text-xs font-normal text-slate-400">/ {targetWater} ml</span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${waterPercent}%` }}
              transition={{ type: "spring", stiffness: 60, damping: 15 }}
              className="h-full bg-gradient-to-r from-sky-400 to-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Left: Interactive Visual Ring (Concentric or 3 Separate Rings) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50/70 dark:bg-slate-850/40 rounded-3xl border border-slate-100 dark:border-slate-800/80">
          {viewMode === 'concentric' ? (
            <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 200 200">
                {/* Outer Ring: Protein (r=82, width=11) */}
                {renderCircle(82, 11, proteinPercent, '#10B981', 'rgba(16, 185, 129, 0.15)')}
                {/* Middle Ring: Carbs (r=66, width=11) */}
                {renderCircle(66, 11, carbsPercent, '#F59E0B', 'rgba(245, 158, 11, 0.15)')}
                {/* Inner Ring: Fat (r=50, width=11) */}
                {renderCircle(50, 11, fatPercent, '#38BDF8', 'rgba(56, 189, 248, 0.15)')}
              </svg>

              {/* Center Content: Calories Summary */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
                <Flame className="w-5 h-5 text-emerald-500 mb-0.5 animate-pulse" />
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white leading-tight">
                  {currentCalories}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  / {targetCalories} kcal
                </span>
                <span className="mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {caloriesPercent}% da meta
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 w-full py-2">
              {macros.map((m) => {
                const percent = Math.min(100, Math.round((m.current / m.goal) * 100));
                return (
                  <div key={m.id} className="flex flex-col items-center text-center">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        {renderCircle(38, 8, percent, m.color, m.trackColor, 50, 50)}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white">
                          {percent}%
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          {m.shortLabel}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">
                      {m.current}g
                    </span>
                    <span className="text-[10px] text-slate-400">
                      de {m.goal}g
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ring Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/80 w-full text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Proteína ({proteinPercent}%)</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Carbos ({carbsPercent}%)</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-sky-500">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Gorduras ({fatPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Right: Detailed Macro Rows & Progress Breakdown */}
        <div className="lg:col-span-7 space-y-4">
          {macros.map((m) => {
            const percent = Math.min(100, Math.round((m.current / m.goal) * 100));
            const remaining = Math.max(0, m.goal - m.current);
            const isCompleted = m.current >= m.goal;

            return (
              <div 
                key={m.id}
                className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2.5"
              >
                {/* Row Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-xs">
                      {m.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                        {m.label}
                      </h4>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Meta do plano: {m.goal}{m.unit} • {m.goal * m.kcalPerGram} kcal
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                      {m.current} <span className="text-xs font-normal text-slate-400">/ {m.goal}{m.unit}</span>
                    </div>
                    {isCompleted ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-3 h-3" /> Meta atingida!
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                        Restam {remaining}{m.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar with Percentage Indicator */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ type: "spring", stiffness: 60, damping: 15 }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(to right, ${m.gradientFrom}, ${m.gradientTo})`
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-0.5">
                    <span>{m.current * m.kcalPerGram} kcal consumidas</span>
                    <span style={{ color: m.color }}>{percent}% concluído</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Quick Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Info className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Metas sincronizadas automaticamente com o seu plano de nutrição.</span>
            </div>

            {onNavigate && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    vibrate(15);
                    onNavigate('analyzer');
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/20 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Fotografar prato para registrar macros"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Escanear Refeição</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    vibrate(15);
                    onNavigate('coach');
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                  title="Falar com o NutriCoach IA sobre seus macronutrientes"
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Ajustar Metas</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Exportação do Relatório JSON */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header Modal */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Relatório Diário de Nutrição & Hidratação
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Resumo estruturado do NutriAI Assistant360 para {nutritionSummary.dateStr}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Modal - JSON & Metrics Preview */}
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block">CALORIAS</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{nutritionSummary.currentCalories} / {nutritionSummary.targetCalories} kcal</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block">PROTEÍNA</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{nutritionSummary.currentProtein} / {nutritionSummary.targetProtein} g</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block">CARBOIDRATOS</span>
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400">{nutritionSummary.currentCarbs} / {nutritionSummary.targetCarbs} g</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold block">ÁGUA</span>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">{nutritionSummary.currentWater} / {nutritionSummary.targetWater} ml</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Conteúdo do Arquivo JSON (useNutritionGoals)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyJSON}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copiado!' : 'Copiar JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 text-xs font-mono overflow-x-auto max-h-60 border border-slate-800 select-all">
                    {JSON.stringify(exportReportData, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-850/50">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJSON}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Arquivo JSON</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyNutritionProgressCard;
