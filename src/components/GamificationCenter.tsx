/* eslint-disable i18next/no-literal-string */
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Flame, 
  Target, 
  Medal, 
  Star, 
  ChevronRight, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  Gift, 
  Utensils, 
  Settings, 
  Plus, 
  Check, 
  RotateCcw, 
  Zap,
  Lock,
  Award,
  Crown,
  ChevronUp,
  Volume2,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, WeeklyChallenge } from '../types';
import { generateWeeklyChallenges } from '../lib/gemini';
import { ScratchCard } from './ScratchCard';
import { FitnessRoulette } from './FitnessRoulette';
import { ConfettiCelebration } from './ConfettiCelebration';
import { CommunityChallenges } from './CommunityChallenges';
import { playSfx, vibrate } from '../lib/sensory';
import { speak } from '../lib/speech';
import avatarGlobalStore from '../lib/avatarGlobalState';

interface GamificationCenterProps {
  profile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
}

interface WeeklyTreat {
  name: string;
  image: string;
  description: string;
}

interface CelebrationModalData {
  type: 'level' | 'medal' | 'goal';
  title: string;
  subtitle: string;
  description?: string;
  badgeName?: string;
  badgeIcon?: React.ReactNode;
  levelNumber?: number;
  pointsEarned?: number;
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

  // Celebration Modal State for New Medal or Level Up
  const [celebrationData, setCelebrationData] = useState<CelebrationModalData | null>(null);

  // Floating reward particles state
  const [particles, setParticles] = useState<Array<{ id: string; text: string; x: number; y: number }>>([]);

  const spawnRewardParticles = (pointsDelta: number) => {
    const id = crypto.randomUUID();
    const x = window.innerWidth / 2 + (Math.random() * 140 - 70);
    const y = window.innerHeight / 2 + (Math.random() * 100 - 50);
    
    setParticles(prev => [...prev, { id, text: `+${pointsDelta} XP`, x, y }]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 1500);
  };

  // Points & Level Calculation
  const currentPoints = profile?.points || 0;
  const currentLevel = Math.max(1, profile?.level || Math.floor(currentPoints / 500) + 1);

  // User unlocked badges (defaulting to starter badges if empty)
  const userBadges: string[] = profile?.badges || ['1', '2'];

  // Previous tracking to detect transitions
  const prevPointsRef = useRef<number>(currentPoints);
  const prevLevelRef = useRef<number>(currentLevel);
  const prevBadgesCountRef = useRef<number>(userBadges.length);

  useEffect(() => {
    if (currentPoints > prevPointsRef.current) {
      const delta = currentPoints - prevPointsRef.current;
      spawnRewardParticles(delta);
    }
    prevPointsRef.current = currentPoints;
  }, [currentPoints]);

  // List of all comprehensive badges with metadata
  const ALL_BADGES = [
    {
      id: '1',
      key: 'madrugador',
      name: 'Madrugador',
      icon: <Sparkles className="w-7 h-7" />,
      color: 'from-amber-400 to-yellow-500',
      bgLight: 'bg-amber-400',
      borderGlow: 'border-amber-400/50',
      description: 'Completou um treino antes das 7h',
      rewardPoints: 100
    },
    {
      id: '2',
      key: 'hidratado_plus',
      name: 'Hidratado+',
      icon: <CheckCircle2 className="w-7 h-7" />,
      color: 'from-blue-400 to-cyan-500',
      bgLight: 'bg-blue-400',
      borderGlow: 'border-blue-400/50',
      description: 'Bebeu 3L de água por 5 dias seguidos',
      rewardPoints: 120
    },
    {
      id: '3',
      key: 'scanner_pro',
      name: 'Scanner Pro',
      icon: <Target className="w-7 h-7" />,
      color: 'from-emerald-400 to-teal-500',
      bgLight: 'bg-emerald-400',
      borderGlow: 'border-emerald-400/50',
      description: 'Analisou 10 pratos com a IA Nutricional',
      rewardPoints: 150
    },
    {
      id: '4',
      key: 'fogo_sagrado',
      name: 'Fogo Sagrado',
      icon: <Flame className="w-7 h-7" />,
      color: 'from-orange-500 to-red-500',
      bgLight: 'bg-orange-500',
      borderGlow: 'border-orange-500/50',
      description: 'Manteve 7 dias de ofensiva seguidos',
      rewardPoints: 200
    },
    {
      id: '5',
      key: 'mestre_proteina',
      name: 'Mestre da Proteína',
      icon: <Utensils className="w-7 h-7" />,
      color: 'from-rose-500 to-pink-500',
      bgLight: 'bg-rose-500',
      borderGlow: 'border-rose-500/50',
      description: 'Bateu a meta de proteína 5 vezes na semana',
      rewardPoints: 180
    },
    {
      id: '6',
      key: 'atleta_calistenia',
      name: 'Atleta Calistenia',
      icon: <Trophy className="w-7 h-7" />,
      color: 'from-purple-500 to-indigo-500',
      bgLight: 'bg-purple-500',
      borderGlow: 'border-purple-500/50',
      description: 'Completou 3 treinos no simulador 3D',
      rewardPoints: 250
    }
  ];

  // Helper to get Level Title & Range
  const getLevelDetails = (lvl: number) => {
    if (lvl === 1) return { title: 'Iniciante', badgeColor: 'text-slate-400 bg-slate-400/10' };
    if (lvl === 2) return { title: 'Intermediário', badgeColor: 'text-emerald-500 bg-emerald-500/10' };
    if (lvl === 3) return { title: 'Avançado', badgeColor: 'text-blue-500 bg-blue-500/10' };
    if (lvl === 4) return { title: 'Elite Fitness', badgeColor: 'text-purple-500 bg-purple-500/10' };
    return { title: 'Mestre NutriAI', badgeColor: 'text-amber-500 bg-amber-500/10' };
  };

  const levelInfo = getLevelDetails(currentLevel);
  const currentLevelBasePoints = (currentLevel - 1) * 500;
  const nextLevelThreshold = currentLevel * 500;
  const pointsInCurrentLevel = Math.max(0, currentPoints - currentLevelBasePoints);
  const levelProgressPct = Math.min(100, Math.round((pointsInCurrentLevel / 500) * 100));

  // Spectacular Confetti and Celebration Trigger
  const triggerCelebration = (data: CelebrationModalData) => {
    setCelebrationData(data);
    setShowConfetti(true);
    playSfx('confetti');
    vibrate([100, 50, 150, 50, 200]);

    // Multi-angle canvas confetti blast
    try {
      // 1. Center burst
      confetti({
        particleCount: 140,
        spread: 100,
        origin: { y: 0.45 },
        colors: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#eab308']
      });

      // 2. Left and right cannons
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 70,
          origin: { x: 0.1, y: 0.75 },
          colors: ['#10b981', '#38bdf8', '#fbbf24', '#f43f5e']
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 70,
          origin: { x: 0.9, y: 0.75 },
          colors: ['#a855f7', '#ec4899', '#10b981', '#fbbf24']
        });
      }, 250);

      // 3. Gold shimmer stars
      setTimeout(() => {
        confetti({
          particleCount: 45,
          spread: 80,
          shapes: ['star'],
          origin: { y: 0.5 },
          colors: ['#ffd700', '#f59e0b', '#ffffff']
        });
      }, 500);
    } catch {
      // Fallback
    }

    // Trigger dynamic 3D avatar micro-expressions (smiles, winks, eyebrow lifts)
    if (data.type === 'level') {
      avatarGlobalStore.triggerGamificationReaction('level_up');
      speak(
        `Parabéns extraordinário! Você acaba de subir para o Nível ${data.levelNumber}! Continue firme na sua evolução!`,
        { voice: 'Aoede', lang: 'pt-BR' }
      );
    } else if (data.type === 'medal') {
      avatarGlobalStore.triggerGamificationReaction('badge_unlocked');
      speak(
        `Sensacional! Você desbloqueou uma nova medalha: ${data.badgeName}! Mais uma grande conquista adicionada ao seu perfil!`,
        { voice: 'Aoede', lang: 'pt-BR' }
      );
    } else {
      avatarGlobalStore.triggerGamificationReaction('goal_completed');
    }
  };

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

  // Daily goals confetti & avatar micro-expression reaction
  const triggerConfettiBurst = (goalTitle?: string) => {
    setShowConfetti(true);
    playSfx('confetti');
    vibrate([100, 50, 100, 50, 150]);
    avatarGlobalStore.triggerGamificationReaction('goal_completed');
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

  // Add Points and Check for Level Up
  const handleAddPoints = (amount: number, reason: string = 'Pontos de Atividade') => {
    playSfx('success');
    vibrate(20);
    if (!profile) return;

    const newPoints = currentPoints + amount;
    const newLevel = Math.max(1, Math.floor(newPoints / 500) + 1);

    const updatedProfile: UserProfile = {
      ...profile,
      points: newPoints,
      level: newLevel
    };

    onUpdateProfile(updatedProfile);

    // If level crossed threshold -> Trigger Level Celebration!
    if (newLevel > currentLevel) {
      triggerCelebration({
        type: 'level',
        title: '🎉 NOVO NÍVEL ALCANÇADO!',
        subtitle: `Você atingiu o Nível ${newLevel} (${getLevelDetails(newLevel).title})!`,
        description: `Seus esforços constantes geraram ${amount} XP adicionais e desbloquearam um novo patamar de evolução!`,
        levelNumber: newLevel,
        pointsEarned: amount
      });
    } else {
      playSfx('crystal');
    }
  };

  // Unlock / Claim a Medal
  const handleUnlockBadge = (badge: typeof ALL_BADGES[0]) => {
    if (!profile) return;
    const isAlreadyUnlocked = userBadges.includes(badge.id) || userBadges.includes(badge.key);

    if (isAlreadyUnlocked) {
      // Re-celebrate already unlocked medal
      triggerCelebration({
        type: 'medal',
        title: '🏅 MEDALHA CONQUISTADA!',
        subtitle: badge.name,
        description: badge.description,
        badgeName: badge.name,
        badgeIcon: badge.icon,
        pointsEarned: badge.rewardPoints
      });
      return;
    }

    playSfx('success');
    vibrate([30, 50, 30]);

    const updatedBadges = [...userBadges, badge.id];
    const newPoints = currentPoints + badge.rewardPoints;
    const newLevel = Math.max(1, Math.floor(newPoints / 500) + 1);

    const updatedProfile: UserProfile = {
      ...profile,
      badges: updatedBadges,
      points: newPoints,
      level: newLevel
    };

    onUpdateProfile(updatedProfile);

    // Trigger Medal Celebration
    triggerCelebration({
      type: 'medal',
      title: '🏅 NOVA MEDALHA DESBLOQUEADA!',
      subtitle: badge.name,
      description: badge.description,
      badgeName: badge.name,
      badgeIcon: badge.icon,
      pointsEarned: badge.rewardPoints
    });
  };

  // Check for completed weekly challenges
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

    if (lastActive === today) return;

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
      triggerCelebration({
        type: 'medal',
        title: '🔥 SUPER STREAK DE 7 DIAS!',
        subtitle: 'Você manteve consistência durante uma semana inteira!',
        description: 'Sua dedicação diária ativa hábitos saudáveis profundos e duradouros.',
        pointsEarned: 200
      });
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

  return (
    <div className="space-y-8 p-4">
      {/* Premium Full-screen Confetti Celebration Overlay */}
      <ConfettiCelebration active={showConfetti} onComplete={() => setShowConfetti(false)} mode="all" />

      {/* Top Stats Cards: Streak, Points, and Current Level */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Streak Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="clay-card p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full translate-x-8 -translate-y-8 blur-2xl" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Streak Diário</span>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{profile?.streak || 0}</span>
            <span className="text-sm font-bold text-slate-400">dias seguidos</span>
          </div>
        </motion.div>

        {/* Points (XP) Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="clay-card p-6 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full translate-x-8 -translate-y-8 blur-2xl" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Star className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Pontuação Total</span>
              </div>
              <button
                type="button"
                onClick={() => handleAddPoints(100, 'Pontos de Teste')}
                className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold transition cursor-pointer"
                title="Ganhar +100 XP"
              >
                +100 XP
              </button>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{currentPoints}</span>
              <span className="text-sm font-bold text-slate-400">XP</span>
            </div>
          </div>
        </motion.div>

        {/* Level Progression Card with Immediate Level Up Trigger */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="clay-card p-6 relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-purple-500/10 via-white to-white dark:from-purple-950/30 dark:via-slate-800 dark:to-slate-800 border-purple-500/20"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/15 rounded-full translate-x-8 -translate-y-8 blur-2xl" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Nível</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${levelInfo.badgeColor}`}>
                {levelInfo.title}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                Nível {currentLevel}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                {currentPoints} / {nextLevelThreshold} XP
              </span>
            </div>

            {/* Micro Progress Bar to Next Level */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-2.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${levelProgressPct}%` }}
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              // Add remaining XP to reach the next level threshold and trigger celebration
              const needed = nextLevelThreshold - currentPoints;
              handleAddPoints(needed > 0 ? needed : 500, 'Subida de Nível');
            }}
            className="mt-3 w-full py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-purple-500/20 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Subir de Nível (Celebrar 🎉)</span>
          </button>
        </motion.div>
      </div>

      {/* Interactive Badges & Medals Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-500">
              <Medal className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Conquistas e Medalhas
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {userBadges.length}/{ALL_BADGES.length} Desbloqueadas
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Toque nas medalhas para desbloquear ou comemorar novas conquistas com chuva de confetes!
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {ALL_BADGES.map((badge) => {
            const isUnlocked = userBadges.includes(badge.id) || userBadges.includes(badge.key) || userBadges.includes(badge.name);

            return (
              <motion.div
                key={badge.id}
                whileHover={{ y: -4, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleUnlockBadge(badge)}
                className={`p-4 rounded-3xl clay-card border transition-all cursor-pointer flex flex-col items-center text-center justify-between relative overflow-hidden group ${
                  isUnlocked
                    ? `bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/90 ${badge.borderGlow} shadow-lg shadow-amber-500/5`
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 opacity-75 hover:opacity-100'
                }`}
              >
                {/* Unlocked / Locked Indicator Icon */}
                <div className="absolute top-2 right-2">
                  {isUnlocked ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Badge Medal Emblem with Glowing Ring */}
                <div className="my-2 relative">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${badge.color} flex items-center justify-center text-white shadow-md relative z-10 ${
                    isUnlocked ? 'group-hover:scale-110 transition-transform duration-300' : 'grayscale-[40%]'
                  }`}>
                    {badge.icon}
                  </div>
                  {isUnlocked && (
                    <div className="absolute inset-0 rounded-2xl bg-amber-400/20 blur-md pointer-events-none" />
                  )}
                </div>

                <div className="space-y-1 w-full">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                    {badge.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
                    {badge.description}
                  </p>
                </div>

                {/* Action Tag */}
                <div className="mt-3 w-full">
                  {isUnlocked ? (
                    <span className="w-full py-1 px-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold block">
                      ✨ Celebrar!
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="w-full py-1 px-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-300 text-[10px] font-bold transition block cursor-pointer"
                    >
                      Desbloquear +{badge.rewardPoints}XP
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
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
                  <button
                    type="button"
                    onClick={() => handleAddPoints(challenge.rewardPoints, challenge.title)}
                    className="p-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Reivindicar +{challenge.rewardPoints} XP</span>
                  </button>
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
              onComplete={() => {
                setShowConfetti(true);
                playSfx('confetti');
              }}
            >
              {revealedTreat && (
                <div className="w-full h-full relative overflow-hidden group select-none">
                  <img 
                    src={revealedTreat.image} 
                    alt={revealedTreat.name} 
                    className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-700 group-hover:scale-105" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent select-none pointer-events-none" />
                  
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

      {/* SPECTACULAR CELEBRATION MODAL FOR NEW MEDAL OR LEVEL UP */}
      <AnimatePresence>
        {celebrationData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.7, y: 40, rotate: -2 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.7, y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 220 }}
              className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-[40px] p-8 max-w-md w-full text-center relative overflow-hidden border-2 border-amber-400/60 shadow-[0_0_60px_rgba(245,158,11,0.35)]"
            >
              {/* Golden Rotating Halo Background */}
              <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-br from-amber-500/25 to-yellow-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-tl from-emerald-500/25 to-teal-500/10 blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setCelebrationData(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Central Pulsating Emblem Icon */}
              <div className="relative my-4 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.12, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center text-white shadow-2xl shadow-amber-500/40 relative z-10 border-2 border-white/40"
                >
                  {celebrationData.type === 'level' ? (
                    <Trophy className="w-14 h-14 text-white drop-shadow-lg" />
                  ) : (
                    celebrationData.badgeIcon || <Medal className="w-14 h-14 text-white drop-shadow-lg" />
                  )}
                </motion.div>

                {/* Sparkling Halo */}
                <div className="absolute w-36 h-36 rounded-full bg-amber-400/20 blur-xl animate-pulse pointer-events-none" />
              </div>

              {/* Title & Celebration Subtitle */}
              <div className="space-y-2 mt-4 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-widest border border-amber-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>{celebrationData.title}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow">
                  {celebrationData.subtitle}
                </h3>

                {celebrationData.description && (
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                    {celebrationData.description}
                  </p>
                )}

                {celebrationData.pointsEarned && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      +{celebrationData.pointsEarned} XP Adicionados ao Perfil
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-2.5 relative z-10">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    playSfx('confetti');
                    vibrate([50, 100]);
                    confetti({
                      particleCount: 100,
                      spread: 80,
                      origin: { y: 0.6 }
                    });
                    setCelebrationData(null);
                  }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/30 transition-all cursor-pointer"
                >
                  🎉 Celebrar & Continuar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Framer Motion Floating Reward Particles Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, scale: 0.5, y: p.y, x: p.x }}
              animate={{ opacity: 0, scale: 1.5, y: p.y - 140, x: p.x + (Math.random() * 80 - 40) }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 text-slate-950 font-black text-sm md:text-base shadow-[0_0_30px_rgba(16,185,129,0.6)] border-2 border-white flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-slate-950 animate-spin" />
              <span>{p.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
