import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Flame, Target, Medal, Star, ChevronRight, CheckCircle2, TrendingUp, Sparkles, Gift, Utensils } from 'lucide-react';
import { UserProfile, WeeklyChallenge } from '../types';
import { generateWeeklyChallenges } from '../lib/gemini';
import { ScratchCard } from './ScratchCard';

interface GamificationCenterProps {
  profile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
}

const WEEKLY_TREATS = ['Brownie Fit com Sorvete', 'Bolo de Cenoura', 'Cheesecake de Frutas Vermelhas', 'Petit Gâteau Light', 'Pudim de Leite (Porção Pequena)'];

export function GamificationCenter({ profile, onUpdateProfile }: GamificationCenterProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showScratchCard, setShowScratchCard] = useState(false);
  const [revealedTreat, setRevealedTreat] = useState<string>('');

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

    if (lastActive === yesterdayStr) {
      newStreak += 1;
    } else if (lastActive === null || lastActive < yesterdayStr) {
      newStreak = 1;
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
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
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
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-slate-900 dark:text-white">{profile?.streak || 0}</span>
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
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-slate-900 dark:text-white">{profile?.points || 0}</span>
            <span className="text-sm font-bold text-slate-400">XP</span>
          </div>
        </motion.div>
      </div>

      {/* Weekly Challenges */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-500" />
            Desafios Semanais
          </h3>
          <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Renovam em 3d</span>
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
              width={250} 
              height={150} 
              brushSize={25} 
              finishPercent={50}
              onComplete={() => setShowConfetti(true)}
            >
              <div className="flex flex-col items-center text-center p-4">
                <Utensils className="w-8 h-8 text-emerald-500 mb-2" />
                <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {revealedTreat}
                </h4>
                <p className="text-xs font-bold text-emerald-500 uppercase mt-2">Liberado esta semana!</p>
              </div>
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

      {/* Motivation Footer */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[40px] clay-card text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Trophy className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <h4 className="text-2xl font-black mb-2">Quase lá! 🚀</h4>
          <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
            Você está no top 5% dos usuários esta semana. Continue assim para desbloquear o status <span className="font-bold underline decoration-amber-400 decoration-2">Lendário</span>.
          </p>
          <button className="flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-50 transition-all">
            Ver Ranking Global
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
