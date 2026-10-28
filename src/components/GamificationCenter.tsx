import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Flame, Target, Medal, Star, ChevronRight, CheckCircle2, TrendingUp, Sparkles, Gift, Utensils, Settings, Plus, Check, RotateCcw, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, WeeklyChallenge } from '../types';
import { generateWeeklyChallenges } from '../lib/gemini';
import { ScratchCard } from './ScratchCard';
import { FitnessRoulette } from './FitnessRoulette';
import { ConfettiCelebration } from './ConfettiCelebration';
import { CommunityChallenges } from './CommunityChallenges';
import { playSfx, vibrate } from '../lib/sensory';

interface GamificationCenterProps {
  profile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
}

interface WeeklyTreat {
  name: string;
  image: string;
  description: string;
}

const WEEKLY_TREATS: WeeklyTreat[] = [
  {
    name: 'Brownie Fit com Sorvete',
    image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?auto=format&fit=crop&q=80&w=600',
    description: 'Chocolate belga & fatias com sorvete'
  },
  {
    name: 'Bolo de Cenoura Fit',
    image: 'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?auto=format&fit=crop&q=80&w=600',
    description: 'Calda de cacau 70% sem açúcar'
  },
  {
    name: 'Cheesecake de Frutas Vermelhas',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=600',
    description: 'Creme leve com calda rústica premium'
  },
  {
    name: 'Petit Gâteau Light',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=600',
    description: 'Bolinho quente cremosa por dentro'
  },
  {
    name: 'Pudim de Leite Fit',
    image: 'https://images.unsplash.com/photo-1511018556340-d16986a1c194?auto=format&fit=crop&q=80&w=600',
    description: 'Calda brilhante de caramelo saudável'
  }
];

export interface DailyConfigurableGoal {
  id: string;
  title: string;
  category: 'water' | 'protein' | 'steps' | 'workout';
  icon: string;
  unit: string;
  target: number;
  current: number;
  stepIncrement: number;
  completed: boolean;
  color: string;
}

export function GamificationCenter({ profile, onUpdateProfile }: GamificationCenterProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showScratchCard, setShowScratchCard] = useState(false);
  const [revealedTreat, setRevealedTreat] = useState<WeeklyTreat | null>(null);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [celebratedGoalTitle, setCelebratedGoalTitle] = useState<string | null>(null);

  // Configurable Daily Goals State
  const [dailyGoals, setDailyGoals] = useState<DailyConfigurableGoal[]>([
    {
      id: 'water_goal',
      title: 'Meta de Hidratação Diária',
      category: 'water',
      icon: '💧',
      unit: 'ml',
      target: profile?.waterGoal || 2500,
      current: 2000,
      stepIncrement: 250,
      completed: false,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'protein_goal',
      title: 'Meta de Proteína Diária',
      category: 'protein',
      icon: '🥩',
      unit: 'g',
      target: profile?.masterPlan?.macros?.protein || 130,
      current: 110,
      stepIncrement: 20,
      completed: false,
      color: 'from-rose-500 to-red-500',
    },
    {
      id: 'steps_goal',
      title: 'Meta de Passos Diários',
      category: 'steps',
      icon: '🏃',
      unit: 'passos',
      target: 10000,
      current: 9000,
      stepIncrement: 1000,
      completed: false,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'workout_goal',
      title: 'Meta de Treino Diário',
      category: 'workout',
      icon: '🧘',
      unit: 'min',
      target: 45,
      current: 30,
      stepIncrement: 15,
      completed: false,
      color: 'from-amber-500 to-orange-500',
    },
  ]);

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [tempTargetValue, setTempTargetValue] = useState<string>('');

  // Triggers canvas-confetti burst + ConfettiCelebration overlay automatically when 100% of a goal is reached
  const triggerConfettiBurst = (goalTitle?: string) => {
    setShowConfetti(true);
    playSfx('confetti');
    vibrate([100, 50, 100, 50, 150]);
    if (goalTitle) {
      setCelebratedGoalTitle(goalTitle);
      setTimeout(() => setCelebratedGoalTitle(null), 6000);
    }
    try {
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { y: 0.55 },
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#38bdf8'],
      });
    } catch {
      // Fallback
    }
  };

  const handleIncrementGoal = (goalId: string, amount: number) => {
    playSfx('tap');
    vibrate(10);
    setDailyGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const newCurrent = Math.max(0, goal.current + amount);
      const isNowCompleted = newCurrent >= goal.target;

      // Trigger particle confetti automatically upon reaching 100% of the configured daily goal!
      if (isNowCompleted && !goal.completed) {
        triggerConfettiBurst(goal.title);
      }

      return {
        ...goal,
        current: newCurrent,
        completed: isNowCompleted,
      };
    }));
  };

  const handleSaveConfiguredTarget = (goalId: string) => {
    const numTarget = parseInt(tempTargetValue, 10);
    if (isNaN(numTarget) || numTarget <= 0) {
      setEditingGoalId(null);
      return;
    }
    playSfx('tap');
    vibrate(10);
    setDailyGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const isNowCompleted = goal.current >= numTarget;

      // Trigger particle confetti automatically upon setting target to <= current (100% complete)
      if (isNowCompleted && !goal.completed) {
        triggerConfettiBurst(goal.title);
      }

      return {
        ...goal,
        target: numTarget,
        completed: isNowCompleted,
      };
    }));
    setEditingGoalId(null);
  };
  
  useEffect(() => {
    if (!profile?.weeklyChallenges) return;
    
    const nowCompleted = profile.weeklyChallenges
      .filter(c => c.completed)
      .map(c => c.id);
      
    if (nowCompleted.some(id => !completedChallenges.includes(id))) {
      setShowConfetti(true);
      playSfx('success');
      vibrate([100, 50, 100]);
    }
    
    setCompletedChallenges(nowCompleted);
  }, [profile?.weeklyChallenges]);

  // Streak logic
  useEffect(() => {
    if (!profile) return;

    const today = new Date().toISOString().split('T')[0];
    const lastActive = profile.lastActiveDate ? profile.lastActiveDate.split('T')[0] : null;

    if (lastActive === today) return; // Already checked today

    let newStreak = profile.streak || 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let reachedSevenToday = false;
    if (lastActive === yesterdayStr) {
      newStreak += 1;
      if (newStreak === 7) reachedSevenToday = true;
    } else if (lastActive === null || lastActive < yesterdayStr) {
      newStreak = 1;
    }

    if (reachedSevenToday) {
      setShowConfetti(true);
    }

    onUpdateProfile({
      ...profile,
      streak: newStreak,
      lastActiveDate: new Date().toISOString()
    });
  }, []);

  useEffect(() => {
    if (profile && (!profile.weeklyChallenges || profile.weeklyChallenges.length === 0)) {
      const loadChallenges = async () => {
        const data = await generateWeeklyChallenges(profile);
        if (data.length > 0) {
          onUpdateProfile({ ...profile, weeklyChallenges: data });
        }
      };
      loadChallenges();
    }
  }, [profile?.weeklyChallenges?.length]);

  const challenges: WeeklyChallenge[] = profile?.weeklyChallenges || [
    {
      id: '1',
      title: 'Hidratação de Elite',
      description: 'Beba 2L de água por dia durante a semana',
      target: 7,
      current: 4,
      type: 'water',
      rewardPoints: 100,
      completed: false,
      expiresAt: new Date(Date.now() + 86400000 * 3).toISOString()
    },
    {
      id: '2',
      title: 'Mestre da Proteína',
      description: 'Atinja sua meta de proteína 5 vezes',
      target: 5,
      current: 5,
      type: 'protein',
      rewardPoints: 150,
      completed: true,
      expiresAt: new Date(Date.now() + 86400000 * 3).toISOString()
    }
  ];

  const badges = [
    { id: '1', name: 'Madrugador', icon: <Sparkles className="w-6 h-6" />, color: 'bg-amber-400', description: 'Completou um treino antes das 7h' },
    { id: '2', name: 'Hidratado+', icon: <CheckCircle2 className="w-6 h-6" />, color: 'bg-blue-400', description: 'Bebeu 3L de água por 5 dias seguidos' },
    { id: '3', name: 'Scanner Pro', icon: <Target className="w-6 h-6" />, color: 'bg-emerald-400', description: 'Analisou 10 pratos com a IA' }
  ];

  return (
    <div className="space-y-8 p-4">
      {/* Premium Full-screen Confetti Celebration Overlay */}
      <ConfettiCelebration active={showConfetti} onComplete={() => setShowConfetti(false)} mode="all" />

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 gap-5">
        <motion.div 
          whileHover={{ y: -5 }}
          className="clay-card p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full translate-x-8 -translate-y-8 blur-2xl" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Streak</span>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{profile?.streak || 0}</span>
            <span className="text-sm font-bold text-slate-400">dias</span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="clay-card p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full translate-x-8 -translate-y-8 blur-2xl" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <Star className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Pontos</span>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{profile?.points || 0}</span>
            <span className="text-sm font-bold text-slate-400">XP</span>
          </div>
        </motion.div>
      </div>

      {/* Configurable Daily Goals with Particle Confetti Animation Trigger */}
      <div className="space-y-4">
        {celebratedGoalTitle && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 text-white shadow-xl flex items-center justify-between border border-amber-300/40"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                <Trophy className="w-6 h-6 text-yellow-200 animate-bounce" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">🎉 PARABÉNS! META 100% CONCLUÍDA!</h4>
                <p className="text-xs text-amber-100 font-medium">
                  Você atingiu 100% da sua <strong>{celebratedGoalTitle}</strong>! Confetes liberados!
                </p>
              </div>
            </div>
            <button
              onClick={() => triggerConfettiBurst(celebratedGoalTitle)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
              title="Soltar mais confetes!"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
              <span>+ Confetes</span>
            </button>
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Metas Diárias Configuráveis
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
                  🎉 100% = Confetes
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ajuste e registre suas metas diárias. Ao atingir 100%, os confetes de celebração são acionados automaticamente!
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dailyGoals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
            const isEditing = editingGoalId === goal.id;

            return (
              <div
                key={goal.id}
                className={`p-5 rounded-[28px] clay-card border transition-all duration-300 relative overflow-hidden ${
                  goal.completed
                    ? 'bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-slate-900/5 border-emerald-500/30 shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/80'
                }`}
              >
                {goal.completed && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>100% Concluído</span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-2 rounded-2xl bg-slate-100 dark:bg-slate-700/60 shadow-inner">
                      {goal.icon}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        {goal.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                          Meta: {goal.target} {goal.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            playSfx('tap');
                            setEditingGoalId(isEditing ? null : goal.id);
                            setTempTargetValue(goal.target.toString());
                          }}
                          className="p-1 text-slate-400 hover:text-amber-500 transition-colors rounded-lg cursor-pointer"
                          title="Configurar Meta Diária"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Target Configuration */}
                {isEditing && (
                  <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Ajustar Valor da Meta ({goal.unit}):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={tempTargetValue}
                        onChange={(e) => setTempTargetValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl text-xs font-mono font-bold border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white"
                        placeholder={`Ex: ${goal.target}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveConfiguredTarget(goal.id)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress Bar & Percentage */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                    <span>{goal.current} / {goal.target} {goal.unit}</span>
                    <span className={pct >= 100 ? 'text-emerald-500 font-extrabold' : 'text-amber-500'}>
                      {pct}%
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 100
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Quick Progress Increment Controls */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-400 font-medium">Registrar Progresso:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleIncrementGoal(goal.id, goal.stepIncrement)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-100 dark:bg-slate-700 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-300 text-xs font-bold transition-all flex items-center gap-1 border border-slate-200 dark:border-slate-600 active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+{goal.stepIncrement} {goal.unit}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleIncrementGoal(goal.id, goal.target)}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all flex items-center gap-1 border border-amber-500/30 active:scale-95 cursor-pointer"
                      title="Completar 100% imediatamente e soltar confetes!"
                    >
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>100%</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Challenges */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-500" />
            Desafios Semanais
          </h3>
          <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 sm:bg-transparent px-2 py-1 rounded-md sm:p-0">Renovam em 3d</span>
        </div>

        <div className="space-y-4">
          {challenges.map((challenge) => (
            <div 
              key={challenge.id}
              className={`p-6 rounded-[32px] clay-card border transition-all duration-500 ${
                challenge.completed 
                ? 'bg-emerald-500/5 border-emerald-500/20' 
                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{challenge.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{challenge.description}</p>
                </div>
                {challenge.completed ? (
                  <div className="p-2 clay-primary px-6 py-3">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full text-[10px] font-black uppercase">
                    <TrendingUp className="w-3 h-3" />
                    +{challenge.rewardPoints} XP
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                  <span>Progresso</span>
                  <span>{challenge.current} / {challenge.target}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(challenge.current / challenge.target) * 100}%` }}
                    className={`h-full ${challenge.completed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <FitnessRoulette profile={profile} />

      {/* Weekly Reward / Scratch Card */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-500" />
          Recompensa da Semana
        </h3>

        {!showScratchCard ? (
          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              const randomTreat = WEEKLY_TREATS[Math.floor(Math.random() * WEEKLY_TREATS.length)];
              setRevealedTreat(randomTreat);
              setShowScratchCard(true);
            }}
            className="p-6 rounded-[32px] bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-xl cursor-pointer flex flex-col items-center justify-center text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            <Sparkles className="w-10 h-10 mb-2 relative z-10" />
            <h4 className="text-lg font-black uppercase tracking-widest relative z-10">Raspadinha Desbloqueada!</h4>
            <p className="text-sm font-medium opacity-90 relative z-10">Você atingiu a meta da semana. Toque para raspar.</p>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-800 p-6 rounded-[32px] border border-slate-200 dark:border-slate-700">
            <p className="text-center text-slate-500 mb-6 font-medium">Use o dedo para raspar e revelar sua sobremesa da semana!</p>
            <ScratchCard 
              width={320} 
              height={200} 
              brushSize={25} 
              finishPercent={45}
              onComplete={() => setShowConfetti(true)}
            >
              {revealedTreat && (
                <div className="w-full h-full relative overflow-hidden group select-none">
                  {/* Photo of the rewarded treat */}
                  <img 
                    src={revealedTreat.image} 
                    alt={revealedTreat.name} 
                    className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-700 group-hover:scale-105" 
                    referrerPolicy="no-referrer"
                  />
                  {/* Elegant darkening mask for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent select-none pointer-events-none" />
                  
                  {/* Absolute content details inside the card */}
                  <div className="absolute inset-x-0 bottom-0 p-4 text-left flex flex-col justify-end select-none pointer-events-none">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      🏆 Recompensa Revelada!
                    </span>
                    <h4 className="text-lg font-black text-white leading-tight mt-0.5 drop-shadow">
                      {revealedTreat.name}
                    </h4>
                    <p className="text-[11px] text-slate-300 drop-shadow mt-0.5 line-clamp-1">
                      {revealedTreat.description}
                    </p>
                  </div>
                </div>
              )}
            </ScratchCard>
          </div>
        )}
      </div>

      {/* Badges and Trophies */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Medal className="w-5 h-5 text-amber-500" />
          Conquistas e Medalhas
        </h3>

        <div className="grid grid-cols-3 gap-4">
          {badges.map((badge) => (
            <motion.div
              key={badge.id}
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center gap-2"
            >
              <div className={`w-20 h-20 ${badge.color} rounded-full flex items-center justify-center text-white shadow-xl relative`}>
                <div className="absolute inset-2 border-2 border-white/30 rounded-full border-dashed" />
                {badge.icon}
              </div>
              <span className="text-[10px] font-black text-center text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-tight">
                {badge.name}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Community Challenges Section */}
      <CommunityChallenges />

      {/* Motivation Footer */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-white shadow-lg overflow-hidden relative transition-colors duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 pointer-events-none">
          <Trophy className="w-32 h-32 text-slate-800 dark:text-white" />
        </div>
        <div className="relative z-10">
          <h4 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Quase lá! 🚀</h4>
          <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
            Você está no top 5% dos usuários esta semana. Continue assim para desbloquear o status <span className="font-bold underline decoration-amber-400 decoration-2">Lendário</span>.
          </p>
          <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-md dark:hover:bg-slate-50 transition-all cursor-pointer">
            Ver Ranking Global
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
