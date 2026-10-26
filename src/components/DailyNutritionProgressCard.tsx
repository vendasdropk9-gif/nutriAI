import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Utensils, 
  Flame, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  Camera, 
  Info,
  TrendingUp,
  Beef,
  Wheat,
  Droplet
} from 'lucide-react';
import { UserProfile } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { playSfx, vibrate } from '../lib/sensory';

interface DailyNutritionProgressCardProps {
  profile: UserProfile | null;
  onNavigate?: (tabId: string) => void;
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
  className = ''
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'concentric' | 'cards'>('concentric');

  // 1. Calculate today's intake from profile.intakeLogs
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = profile?.intakeLogs?.filter(l => l.date && l.date.startsWith(today)) || [];

  const currentProtein = Math.round(
    todayLogs.reduce((acc, l) => acc + (l.actual?.protein || l.planned?.protein || 0), 0)
  );
  const currentCarbs = Math.round(
    todayLogs.reduce((acc, l) => acc + (l.actual?.carbs || l.planned?.carbs || 0), 0)
  );
  const currentFat = Math.round(
    todayLogs.reduce((acc, l) => acc + (l.actual?.fat || l.planned?.fat || 0), 0)
  );
  const currentCalories = Math.round(
    todayLogs.reduce((acc, l) => acc + (l.actual?.calories || l.planned?.calories || 0), 0)
  );

  // 2. Retrieve goals from user profile or calculate smart adaptive defaults
  const weight = profile?.weight || 70;
  const targetCalories = profile?.masterPlan?.dailyCalories || 2000;

  // Goals priority: masterPlan.macros -> profile calculated goals
  const targetProtein = Math.round(
    profile?.masterPlan?.macros?.protein || 
    (profile?.goals?.toLowerCase().includes('hipertrofia') || profile?.goals?.toLowerCase().includes('massa')
      ? weight * 2.0 
      : weight * 1.7)
  );

  const targetCarbs = Math.round(
    profile?.masterPlan?.macros?.carbs || 
    ((targetCalories * 0.45) / 4)
  );

  const targetFat = Math.round(
    profile?.masterPlan?.macros?.fat || 
    ((targetCalories * 0.25) / 9)
  );

  // Calculate percentages
  const proteinPercent = Math.min(100, Math.round((currentProtein / (targetProtein || 1)) * 100));
  const carbsPercent = Math.min(100, Math.round((currentCarbs / (targetCarbs || 1)) * 100));
  const fatPercent = Math.min(100, Math.round((currentFat / (targetFat || 1)) * 100));
  const caloriesPercent = Math.min(100, Math.round((currentCalories / (targetCalories || 1)) * 100));

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
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('daily_nutrition_progress', 'Progresso Nutricional do Dia')}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{t('macronutrients_goal', 'Metas Diárias de Macronutrientes')}</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {t('macronutrients_desc', 'Acompanhamento em tempo real dos seus macros em relação ao seu plano alimentar.')}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center self-start sm:self-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
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
                <span data-testid="daily-calories-consumed" className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white leading-tight">
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
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full transition-all"
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
    </div>
  );
};

export default DailyNutritionProgressCard;
