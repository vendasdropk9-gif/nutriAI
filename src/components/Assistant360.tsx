import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Activity, Leaf, Utensils, Zap, ShoppingBag, Truck, Map, 
  Dumbbell, Moon, Droplets, Camera, Flame, ChevronRight, MessageCircle, AlertTriangle,
  Scale, Smile, Sparkles, Crown, ArrowUpRight, TrendingUp, Heart, Footprints
} from 'lucide-react';
import { UserProfile, IntakeLog } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { DashboardQuickTips } from './DashboardQuickTips';
import { ConnectedHealthWidget } from './ConnectedHealthWidget';
import { AdaptiveMealAdjustmentCard } from './AdaptiveMealAdjustmentCard';

interface Assistant360Props {
  profile: UserProfile | null;
  onNavigate: (tabId: string) => void;
  onLogIntake?: (log: IntakeLog) => void;
  onUpdateProfile?: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
}

const PROACTIVE_TIPS = [
  { text: "Sua meta de hidratação precisa de 600ml para ser concluída hoje.", icon: <Droplets className="w-5 h-5 text-blue-500" />, type: 'warning' },
  { text: "Ingestão de proteínas recomendada para o pós-treino: 35g.", icon: <Utensils className="w-5 h-5 text-emerald-500" />, type: 'suggestion' },
  { text: "Caminhada leve de 20 min recomendada para estabilizar glicemia.", icon: <Activity className="w-5 h-5 text-amber-500" />, type: 'suggestion' },
  { text: "Qualidade do sono ontem atingiu 88%. Excelente recuperação corporal!", icon: <Moon className="w-5 h-5 text-indigo-400" />, type: 'alert' }
];

export function Assistant360({ profile, onNavigate, onLogIntake, onUpdateProfile }: Assistant360Props) {
  const { t } = useTranslation();
  const [activeTip, setActiveTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTip((prev) => (prev + 1) % PROACTIVE_TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const isPremium = (profile as any)?.isPremium ?? false;

  // Compute daily metrics safely
  const today = new Date().toISOString().split('T')[0];
  
  // Water
  const waterLogs = profile?.hydrationLogs?.filter(l => l.date.startsWith(today)) || [];
  const waterCurrent = waterLogs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const waterTarget = profile?.waterGoal || 2500;
  const waterPercent = Math.min(100, Math.round((waterCurrent / waterTarget) * 100));

  // Calories
  const intakeLogs = profile?.intakeLogs?.filter(l => l.date.startsWith(today)) || [];
  const caloriesCurrent = intakeLogs.reduce((acc, curr) => acc + (curr.actual?.calories || curr.planned?.calories || 0), 0);
  const caloriesTarget = profile?.masterPlan?.dailyCalories || 2000;
  const caloriesPercent = Math.min(100, Math.round((caloriesCurrent / caloriesTarget) * 100));

  // Weight & BMI
  const currentWeight = profile?.weight || 70;
  const heightInM = (profile?.height || 175) / 100;
  const bmi = (currentWeight / (heightInM * heightInM)).toFixed(1);
  
  let bmiCategory = t('normal', 'Normal');
  const bmiNum = parseFloat(bmi);
  if (bmiNum < 18.5) bmiCategory = t('underweight', 'Abaixo do peso');
  else if (bmiNum >= 25 && bmiNum < 30) bmiCategory = t('overweight', 'Sobrepeso');
  else if (bmiNum >= 30) bmiCategory = t('obesity', 'Obesidade');

  // Sleep
  const sleepLogs = profile?.sleepLogs?.filter(s => s.date.startsWith(today)) || [];
  const sleepHours = sleepLogs.length > 0 ? sleepLogs[sleepLogs.length - 1].durationHours : 7.5;

  // Mood
  const moodLogs = profile?.emotionalLogs?.filter(m => m.date.startsWith(today)) || [];
  const currentMood = moodLogs.length > 0 ? moodLogs[moodLogs.length - 1].mood : t('great', 'Ótimo');

  const features = [
    { id: 'quickdishes', labelKey: 'feature_quickdishes', descKey: 'desc_quickdishes', defaultLabel: 'Pratos Rápidos IA', defaultDesc: '3 opções em 1 toque', icon: <Flame className="w-5 h-5 text-orange-500" /> },
    { id: 'generator', labelKey: 'feature_generator', descKey: 'desc_generator', defaultLabel: 'Receitas com IA', defaultDesc: 'Geradas sob medida', icon: <Utensils className="w-5 h-5 text-emerald-500" /> },
    { id: 'coach', labelKey: 'feature_coach', descKey: 'desc_coach', defaultLabel: 'NutriCoach IA', defaultDesc: 'Análise de dieta 24/7', icon: <Zap className="w-5 h-5 text-emerald-400" /> },
    { id: 'analyzer', labelKey: 'feature_analyzer', descKey: 'desc_analyzer', defaultLabel: 'Scanner de Prato', defaultDesc: 'Fotografe e analise', icon: <Camera className="w-5 h-5 text-emerald-500" /> },
    { id: 'smartplate', labelKey: 'feature_smartplate', descKey: 'desc_smartplate', defaultLabel: 'Restaurante Inteligente', defaultDesc: 'Combine opções de fora', icon: <Camera className="w-5 h-5 text-emerald-400" /> },
    { id: 'trainer', labelKey: 'feature_trainer', descKey: 'desc_trainer', defaultLabel: 'Treino Personalizado', defaultDesc: 'Exercícios guiados', icon: <Dumbbell className="w-5 h-5 text-emerald-500" /> },
    { id: 'fridge', labelKey: 'feature_fridge', descKey: 'desc_fridge', defaultLabel: 'Geladeira Inteligente', defaultDesc: 'Aproveitamento 100%', icon: <Sparkles className="w-5 h-5 text-emerald-400" /> },
    { id: 'habits', labelKey: 'feature_habits', descKey: 'desc_habits', defaultLabel: 'Hábitos & Sono', defaultDesc: 'Ritmo circadiano', icon: <Moon className="w-5 h-5 text-indigo-400" /> },
    { id: 'herbs', labelKey: 'feature_herbs', descKey: 'desc_herbs', defaultLabel: 'Ervas & Fitoterapia', defaultDesc: 'Infusões e remédios', icon: <Leaf className="w-5 h-5 text-emerald-500" /> },
    { id: 'market', labelKey: 'feature_market', descKey: 'desc_market', defaultLabel: 'Marketplace Orgânico', defaultDesc: 'Insumos selecionados', icon: <ShoppingBag className="w-5 h-5 text-amber-500" /> },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-32 pt-2 animate-in fade-in duration-700 flex flex-col items-center">
      
      {/* 1. Hero AI Avatar Card */}
      <div className={`relative w-full rounded-[32px] p-6 sm:p-10 overflow-hidden transition-all duration-500 mx-auto ${
        isPremium 
          ? 'bg-gradient-to-br from-[#151B23] via-[#1A222C] to-[#0F141A] border border-[#D8B14A]/40 shadow-[0_12px_40px_rgba(216,177,74,0.15)]' 
          : 'bg-gradient-to-br from-[#151B23] via-[#1B232E] to-[#0B0F14] border border-[#232C39] shadow-[0_12px_36px_rgba(0,0,0,0.4)]'
      }`}>
        
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-[90px] pointer-events-none" />
        {isPremium && (
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#D8B14A]/10 blur-[90px] pointer-events-none" />
        )}

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Avatar Section with Idle Breathing & Glow */}
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="relative group cursor-pointer" onClick={() => onNavigate('coach')}>
              
              {/* Breathing Glow Outer Ring */}
              <div className={`absolute inset-0 rounded-full blur-md transition-all duration-1000 ${
                isPremium 
                  ? 'bg-gradient-to-tr from-[#D8B14A] to-[#16C784] opacity-60 animate-idle-breathe' 
                  : 'bg-emerald-500/40 opacity-50 animate-idle-breathe'
              }`} />
              
              {/* Outer Border Halo */}
              <div className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 transition-all duration-500 ${
                isPremium 
                  ? 'bg-gradient-to-tr from-[#D8B14A] via-[#F3E5AB] to-[#16C784] shadow-[0_0_25px_rgba(216,177,74,0.3)]' 
                  : 'bg-gradient-to-tr from-[#16C784] to-[#10B981] shadow-[0_0_25px_rgba(22,199,132,0.3)]'
              }`}>
                <div className="w-full h-full rounded-full bg-[#0B0F14] overflow-hidden flex items-center justify-center relative">
                  <img 
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" 
                    alt="NutriAI Assistant" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Status Indicator */}
                  <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-[#16C784] border-2 border-[#0B0F14] shadow-md animate-pulse" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-emerald-400 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>NutriAI Coach 360°</span>
                {isPremium && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-[#D8B14A]/20 text-[#D8B14A] border border-[#D8B14A]/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                {t('greeting_hello', 'Olá')}, {profile?.name?.split(' ')[0] || t('user', 'Usuário')}!
              </h2>

              <p className="text-sm text-[#B5BDC9] max-w-md leading-relaxed font-sans">
                "{t('today_overview_quote', 'Seu metabolismo está operando em padrão ótimo hoje. Lembre-se de manter a hidratação contínua.')}"
              </p>
            </div>
          </div>

          {/* Quick Chat Action */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              playSfx('tap');
              vibrate(10);
              onNavigate('coach');
            }}
            className={`px-6 py-3.5 rounded-full font-display font-semibold text-sm flex items-center gap-2.5 shadow-lg shrink-0 cursor-pointer transition-all ${
              isPremium 
                ? 'bg-gradient-to-r from-[#D8B14A] to-[#B8860B] text-slate-950 shadow-[0_6px_20px_rgba(216,177,74,0.3)] hover:opacity-95' 
                : 'bg-gradient-to-r from-[#16C784] to-[#10B981] text-white shadow-[0_6px_20px_rgba(22,199,132,0.3)] hover:opacity-95'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t('btn_talk_malu', 'Falar com NutriAI')}</span>
          </motion.button>
        </div>
      </div>

      {/* 2. Featured Spotlight: GERAR PRATOS RÁPIDOS */}
      <div 
        onClick={() => {
          playSfx('tap');
          vibrate(20);
          onNavigate('quickdishes');
        }}
        className="relative w-full overflow-hidden rounded-[32px] bg-gradient-to-r from-orange-500/15 via-emerald-500/10 to-teal-500/15 p-6 sm:p-7 border border-orange-500/30 hover:border-orange-500/60 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group backdrop-blur-md mx-auto"
      >
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-300 shrink-0">
              <Flame className="w-7 h-7 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[11px] font-bold tracking-wide uppercase">
                <Sparkles className="w-3 h-3" />
                <span>1 Toque • Fotos IA • 3 Opções</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                🍽️ Pratos Rápidos com IA
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                Escolha <strong>Emagrecer</strong>, <strong>Ganhar Massa</strong> ou <strong>Lanches Fit</strong> e receba 3 sugestões imediatas com foto realista e macros.
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 shrink-0 group-hover:shadow-orange-500/50 transition-all"
          >
            <span>GERAR PRATOS RÁPIDOS</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
      </div>

      {/* 3. Proactive AI Banner */}
      <motion.div 
        key={activeTip}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="card-premium w-full p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:border-emerald-500/40 transition-all mx-auto"
        onClick={() => onNavigate('habits')}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl shrink-0">
            {PROACTIVE_TIPS[activeTip].icon}
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-[#B5BDC9] uppercase tracking-wider mb-0.5">
              Insight em Tempo Real
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white leading-snug">
              {PROACTIVE_TIPS[activeTip].text}
            </p>
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#151B23] flex items-center justify-center text-slate-400 hover:text-emerald-500 dark:hover:text-[#16C784] transition-colors shrink-0">
          <ChevronRight className="w-5 h-5" />
        </div>
      </motion.div>

      {/* NOVO: Sistema de Dicas Rápidas Inteligentes Conectado ao Histórico */}
      <div className="w-full mx-auto">
        <DashboardQuickTips 
          profile={profile} 
          onNavigate={onNavigate} 
          onLogIntake={onLogIntake} 
        />
      </div>

      {/* 3. Resumo do Dia / Daily Health Metrics Grid */}
      <div className="space-y-4 w-full mx-auto">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#16C784]" />
            Resumo da Sua Saúde Hoje
          </h3>
          <span className="text-xs font-semibold text-slate-400 dark:text-[#B5BDC9]">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Water Metric */}
          <div className="card-premium p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-500">
                <Droplets className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                {waterPercent}%
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-[#B5BDC9]">{t('metric_water_goal', 'Meta de Água')}</span>
              <div className="text-xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
                {waterCurrent} <span className="text-xs font-normal text-slate-400">/ {waterTarget}ml</span>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-[#232C39] h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700"
                style={{ width: `${waterPercent}%` }}
              />
            </div>
          </div>

          {/* Calories Metric */}
          <div className="card-premium p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-[#16C784]">
                <Flame className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#16C784] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                {caloriesPercent}%
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-[#B5BDC9]">{t('metric_calories_goal', 'Meta de Calorias')}</span>
              <div className="text-xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
                {caloriesCurrent} <span className="text-xs font-normal text-slate-400">/ {caloriesTarget} kcal</span>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-[#232C39] h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#10B981] via-[#16C784] to-[#34D399] transition-all duration-700"
                style={{ width: `${caloriesPercent}%` }}
              />
            </div>
          </div>

          {/* Weight & BMI */}
          <div className="card-premium p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-500">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                IMC {bmi}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-[#B5BDC9]">{t('metric_weight_bmi', 'Peso & Classificação')}</span>
              <div className="text-xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
                {currentWeight} <span className="text-xs font-normal text-slate-400">kg</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-[#B5BDC9] block mt-0.5">
                {bmiCategory}
              </span>
            </div>
          </div>

          {/* Sleep & Mood */}
          <div className="card-premium p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500">
                <Moon className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                {currentMood}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-[#B5BDC9]">{t('metric_sleep_mood', 'Sono & Humor')}</span>
              <div className="text-xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
                {sleepHours}h <span className="text-xs font-normal text-slate-400">{t('hours_slept', 'dormidas')}</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-500 block mt-0.5">
                {t('high_recovery', 'Recuperação Alta')}
              </span>
            </div>
          </div>

        </div>

        {/* WIDGET DE SAÚDE CONECTADA (Google Fit / Apple Health) */}
        <ConnectedHealthWidget
          profile={profile}
          onNavigate={onNavigate}
          onUpdateProfile={onUpdateProfile}
        />

        {/* AJUSTE DINÂMICO NO PLANO DE REFEIÇÕES BASEADO EM DADOS DE SAÚDE */}
        <AdaptiveMealAdjustmentCard
          profile={profile}
          onNavigate={onNavigate}
          onLogIntake={onLogIntake}
          onUpdateProfile={onUpdateProfile}
        />
      </div>

      {/* NOVO: BANNER DESTAQUE PARA O RESTAURANTE INTELIGENTE */}
      <motion.div
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          playSfx('tap');
          vibrate(10);
          onNavigate('smartplate');
        }}
        className={`relative w-full mx-auto overflow-hidden rounded-[24px] p-6 sm:p-8 cursor-pointer transition-all ${
          isPremium
            ? 'bg-gradient-to-r from-[#D8B14A]/10 via-[#B8860B]/10 to-transparent border border-[#D8B14A]/30'
            : 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30'
        }`}
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          <div className={`p-4 rounded-full ${isPremium ? 'bg-[#D8B14A]/20 text-[#D8B14A]' : 'bg-emerald-500/20 text-emerald-500'}`}>
            <Camera className="w-8 h-8" />
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isPremium ? 'text-[#D8B14A]' : 'text-emerald-500'}`}>
              NOVIDADE EXCLUSIVA
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white mb-2">
              {t('feature_smartplate', 'Restaurante Inteligente')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg">
              Está comendo fora? Tire uma foto das opções ou do cardápio e deixe a IA montar a melhor combinação para o seu objetivo.
            </p>
          </div>
          <div className="shrink-0 mt-4 sm:mt-0">
            <div className={`px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 ${isPremium ? 'bg-[#D8B14A] text-slate-900' : 'bg-emerald-500 text-white'}`}>
              <Utensils className="w-4 h-4" />
              {t('combine_plate', 'Combinar Prato')}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. Grid de Funcionalidades Principais */}
      <div className="space-y-4 w-full mx-auto">
        <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white px-1">
          {t('smart_resources', 'Recursos Inteligentes')}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {features.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                onNavigate(item.id);
              }}
              className="card-premium p-4 sm:p-5 flex flex-col items-start justify-between text-left group cursor-pointer h-32 sm:h-36 relative overflow-hidden"
            >
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#151B23] border border-slate-100 dark:border-[#232C39] group-hover:scale-105 transition-transform">
                {item.icon}
              </div>

              <div>
                <h4 className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight mb-0.5 group-hover:text-[#16C784] transition-colors">
                  {t(item.labelKey, item.defaultLabel)}
                </h4>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-[#B5BDC9]">
                  {t(item.descKey, item.defaultDesc)}
                </p>
              </div>

              <div className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="w-3.5 h-3.5 text-[#16C784]" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

    </div>
  );
}
