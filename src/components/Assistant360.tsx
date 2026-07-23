import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Leaf, Utensils, Zap, ShoppingBag, Truck, Map, 
  Dumbbell, Moon, Droplets, Camera, Flame, ChevronRight, MessageCircle, AlertTriangle,
  Scale, Smile, Sparkles, Crown, ArrowUpRight, TrendingUp, Heart
} from 'lucide-react';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';

interface Assistant360Props {
  profile: UserProfile | null;
  onNavigate: (tabId: string) => void;
}

const PROACTIVE_TIPS = [
  { text: "Sua meta de hidratação precisa de 600ml para ser concluída hoje.", icon: <Droplets className="w-5 h-5 text-blue-500" />, type: 'warning' },
  { text: "Ingestão de proteínas recomendada para o pós-treino: 35g.", icon: <Utensils className="w-5 h-5 text-emerald-500" />, type: 'suggestion' },
  { text: "Caminhada leve de 20 min recomendada para estabilizar glicemia.", icon: <Activity className="w-5 h-5 text-amber-500" />, type: 'suggestion' },
  { text: "Qualidade do sono ontem atingiu 88%. Excelente recuperação corporal!", icon: <Moon className="w-5 h-5 text-indigo-400" />, type: 'alert' }
];

export function Assistant360({ profile, onNavigate }: Assistant360Props) {
  const [activeTip, setActiveTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTip((prev) => (prev + 1) % PROACTIVE_TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const isPremium = profile?.isPremium ?? false;

  // Compute daily metrics safely
  const today = new Date().toISOString().split('T')[0];
  
  // Water
  const waterLogs = profile?.intakeLogs?.filter(l => l.type === 'water' && l.date.startsWith(today)) || [];
  const waterCurrent = waterLogs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const waterTarget = profile?.waterGoal || 2500;
  const waterPercent = Math.min(100, Math.round((waterCurrent / waterTarget) * 100));

  // Calories
  const calorieLogs = profile?.intakeLogs?.filter(l => l.type === 'food' && l.date.startsWith(today)) || [];
  const caloriesCurrent = calorieLogs.reduce((acc, curr) => acc + (curr.calories || 0), 0);
  const caloriesTarget = profile?.calorieGoal || 2000;
  const caloriesPercent = Math.min(100, Math.round((caloriesCurrent / caloriesTarget) * 100));

  // Weight & BMI
  const currentWeight = profile?.weight || 70;
  const heightInM = (profile?.height || 175) / 100;
  const bmi = (currentWeight / (heightInM * heightInM)).toFixed(1);
  
  let bmiCategory = 'Normal';
  const bmiNum = parseFloat(bmi);
  if (bmiNum < 18.5) bmiCategory = 'Abaixo do peso';
  else if (bmiNum >= 25 && bmiNum < 30) bmiCategory = 'Sobrepeso';
  else if (bmiNum >= 30) bmiCategory = 'Obesidade';

  // Sleep
  const sleepLogs = profile?.sleepLogs?.filter(s => s.date.startsWith(today)) || [];
  const sleepHours = sleepLogs.length > 0 ? sleepLogs[sleepLogs.length - 1].hours : 7.5;

  // Mood
  const moodLogs = profile?.moodLogs?.filter(m => m.date.startsWith(today)) || [];
  const currentMood = moodLogs.length > 0 ? moodLogs[moodLogs.length - 1].mood : 'Ótimo';

  const features = [
    { id: 'generator', label: 'Receitas com IA', icon: <Utensils className="w-6 h-6 text-emerald-500" />, desc: 'Geradas sob medida' },
    { id: 'coach', label: 'NutriCoach IA', icon: <Zap className="w-6 h-6 text-emerald-400" />, desc: 'Análise de dieta 24/7' },
    { id: 'analyzer', label: 'Scanner de Prato', icon: <Camera className="w-6 h-6 text-emerald-500" />, desc: 'Fotografe e analise' },
    { id: 'trainer', label: 'Treino Personalizado', icon: <Dumbbell className="w-6 h-6 text-emerald-500" />, desc: 'Exercícios guiados' },
    { id: 'fridge', label: 'Geladeira Inteligente', icon: <Sparkles className="w-6 h-6 text-emerald-400" />, desc: 'Aproveitamento 100%' },
    { id: 'habits', label: 'Hábitos & Sono', icon: <Moon className="w-6 h-6 text-indigo-400" />, desc: 'Ritmo circadiano' },
    { id: 'herbs', label: 'Ervas & Fitoterapia', icon: <Leaf className="w-6 h-6 text-emerald-500" />, desc: 'Infusões e remédios' },
    { id: 'market', label: 'Marketplace Orgânico', icon: <ShoppingBag className="w-6 h-6 text-amber-500" />, desc: 'Insumos selecionados' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 pt-2 animate-in fade-in duration-700">
      
      {/* 1. Hero AI Avatar Card */}
      <div className={`relative rounded-[32px] p-6 sm:p-10 overflow-hidden transition-all duration-500 ${
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
                Olá, {profile?.name?.split(' ')[0] || 'Usuário'}!
              </h2>

              <p className="text-sm text-[#B5BDC9] max-w-md leading-relaxed font-sans">
                "Seu metabolismo está operando em padrão ótimo hoje. Lembre-se de manter a hidratação contínua."
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
            <span>Falar com NutriAI</span>
          </motion.button>
        </div>
      </div>

      {/* 2. Proactive AI Banner */}
      <motion.div 
        key={activeTip}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="card-premium p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:border-emerald-500/40 transition-all"
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

      {/* 3. Resumo do Dia / Daily Health Metrics Grid */}
      <div className="space-y-4">
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
              <span className="text-xs font-medium text-slate-400 dark:text-[#B5BDC9]">Meta de Água</span>
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
              <span className="text-xs font-medium text-slate-400 dark:text-[#B5BDC9]">Meta de Calorias</span>
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
              <span className="text-xs font-medium text-slate-400 dark:text-[#B5BDC9]">Peso & Classificação</span>
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
              <span className="text-xs font-medium text-slate-400 dark:text-[#B5BDC9]">Sono & Humor</span>
              <div className="text-xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
                {sleepHours}h <span className="text-xs font-normal text-slate-400">dormidas</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-500 block mt-0.5">
                Recuperação Alta
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Grid de Funcionalidades Principais */}
      <div className="space-y-4">
        <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white px-1">
          Recursos Inteligentes
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {features.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                onNavigate(item.id);
              }}
              className="card-premium p-6 flex flex-col items-start justify-between text-left group cursor-pointer h-40 relative overflow-hidden"
            >
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#151B23] border border-slate-100 dark:border-[#232C39] group-hover:scale-110 transition-transform">
                {item.icon}
              </div>

              <div>
                <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white leading-tight mb-1 group-hover:text-[#16C784] transition-colors">
                  {item.label}
                </h4>
                <p className="text-[11px] font-medium text-slate-400 dark:text-[#B5BDC9]">
                  {item.desc}
                </p>
              </div>

              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="w-4 h-4 text-[#16C784]" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

    </div>
  );
}
