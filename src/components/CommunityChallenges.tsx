import React, { useState } from 'react';
import { 
  Trophy, Medal, Flame, CheckCircle2, Award, Zap, 
  Users, Star, ShieldCheck, Sparkles, Plus, ArrowUpRight 
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { playSfx, vibrate } from '../lib/sensory';

export interface ChallengeItem {
  id: string;
  title: string;
  description: string;
  category: 'hydration' | 'nutrition' | 'fitness' | 'mindfulness';
  durationDays: number;
  currentDay: number;
  xpReward: number;
  participantsCount: number;
  joined: boolean;
  completedDays: boolean[];
  badgeName: string;
  badgeIcon: string;
}

const INITIAL_CHALLENGES: ChallengeItem[] = [
  {
    id: 'water_streak',
    title: 'Semana Hidratação Total (2L/dia)',
    description: 'Bata a meta de 2.000ml de água todos os dias durante 7 dias seguidos.',
    category: 'hydration',
    durationDays: 7,
    currentDay: 4,
    xpReward: 350,
    participantsCount: 1420,
    joined: true,
    completedDays: [true, true, true, true, false, false, false],
    badgeName: 'Mestre da Hidratação',
    badgeIcon: '💧'
  },
  {
    id: 'rainbow_plate',
    title: 'Desafio 5 Cores no Prato',
    description: 'Monte almoços e jantares coloridos combinando hortaliças de pelo menos 5 cores.',
    category: 'nutrition',
    durationDays: 5,
    currentDay: 2,
    xpReward: 250,
    participantsCount: 980,
    joined: true,
    completedDays: [true, true, false, false, false],
    badgeName: 'Prato Arco-Íris',
    badgeIcon: '🥗'
  },
  {
    id: 'no_ultraprocessed',
    title: '7 Dias Sem Ultraprocessados',
    description: 'Elimine refrigerantes, embutidos e salgadinhos da sua rotina semanal.',
    category: 'nutrition',
    durationDays: 7,
    currentDay: 1,
    xpReward: 500,
    participantsCount: 2150,
    joined: false,
    completedDays: [false, false, false, false, false, false, false],
    badgeName: 'Comida de Verdade',
    badgeIcon: '🥑'
  },
  {
    id: 'daily_walk',
    title: '30 Minutos de Caminhada Diária',
    description: 'Ative sua circulação e acelere o metabolismo com 30 min de caminhada contínua.',
    category: 'fitness',
    durationDays: 10,
    currentDay: 3,
    xpReward: 400,
    participantsCount: 1840,
    joined: true,
    completedDays: [true, true, true, false, false, false, false, false, false, false],
    badgeName: 'Passadas de Ouro',
    badgeIcon: '🏃'
  }
];

const LEADERBOARD_RANKING = [
  { rank: 1, name: 'Juliana Silva', xp: 4850, level: 'Mestre da Nutrição Nível 8', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150' },
  { rank: 2, name: 'Rodrigo Mendes', xp: 4200, level: 'Nutricionista Mestre Nível 7', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150' },
  { rank: 3, name: 'Camila Alencar', xp: 3950, level: 'Atleta Fitness Nível 6', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150' },
  { rank: 4, name: 'Você (NutriAI Member)', xp: 3400, level: 'Explorador Saudável Nível 5', isUser: true, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150' },
  { rank: 5, name: 'Fernanda Costa', xp: 3100, level: 'Explorador Saudável Nível 5', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150' }
];

export function CommunityChallenges() {
  const [challenges, setChallenges] = useLocalStorage<ChallengeItem[]>('nutri-community-challenges', INITIAL_CHALLENGES);
  const [userXp, setUserXp] = useLocalStorage<number>('nutri-user-xp', 3400);

  const toggleJoin = (id: string) => {
    playSfx('tap');
    vibrate(12);

    setChallenges(challenges.map(c => {
      if (c.id === id) {
        const nextJoined = !c.joined;
        if (nextJoined) {
          playSfx('success');
          vibrate([15, 60, 15]);
        }
        return {
          ...c,
          joined: nextJoined,
          participantsCount: nextJoined ? c.participantsCount + 1 : c.participantsCount - 1
        };
      }
      return c;
    }));
  };

  const markDayComplete = (challengeId: string, dayIdx: number) => {
    playSfx('success');
    vibrate(20);

    setChallenges(challenges.map(c => {
      if (c.id === challengeId) {
        const newCompleted = [...c.completedDays];
        const wasCompleted = newCompleted[dayIdx];
        newCompleted[dayIdx] = !wasCompleted;

        // Add or remove XP
        if (!wasCompleted) {
          const addedXp = Math.round(c.xpReward / c.durationDays);
          setUserXp(prev => prev + addedXp);
        }

        return {
          ...c,
          completedDays: newCompleted
        };
      }
      return c;
    }));
  };

  const userLevel = Math.floor(userXp / 800) + 1;
  const xpCurrentLevel = userXp % 800;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-6 animate-fade-in">
      {/* Header Banner & Level XP Bar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
              <Trophy className="w-7 h-7 text-yellow-200 animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-100 uppercase tracking-wider block">
                Comunidade NutriAI Gamificada
              </span>
              <h2 className="text-2xl font-black text-white">
                Desafios & Conquistas de Saúde
              </h2>
            </div>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-black/20 backdrop-blur-md border border-white/20 text-right">
            <span className="text-[10px] text-amber-200 font-bold uppercase block">Nível de Saúde</span>
            <span className="text-lg font-black text-white">Nível {userLevel} • {userXp} XP</span>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-amber-100">
            <span>Progresso para o Nível {userLevel + 1}</span>
            <span>{xpCurrentLevel} / 800 XP</span>
          </div>
          <div className="w-full h-3 rounded-full bg-black/20 overflow-hidden p-0.5">
            <div 
              className="h-full rounded-full bg-yellow-300 transition-all duration-500 shadow-md"
              style={{ width: `${(xpCurrentLevel / 800) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Challenges List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          <span>Desafios da Semana em Destaque</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map(challenge => (
            <div
              key={challenge.id}
              className={`p-5 rounded-2xl border transition-all space-y-3 ${
                challenge.joined
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 shadow-md'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{challenge.badgeIcon}</span>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      {challenge.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-amber-500" />
                      <span>{challenge.participantsCount.toLocaleString('pt-BR')} participantes</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => toggleJoin(challenge.id)}
                  className={`px-3 py-1.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
                    challenge.joined
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                  }`}
                >
                  {challenge.joined ? 'Participando' : '+ Entrar'}
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {challenge.description}
              </p>

              {/* Day Checkboxes */}
              {challenge.joined && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    <span>Marcar Dias Concluídos:</span>
                    <span>Recompensa: +{challenge.xpReward} XP</span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {challenge.completedDays.map((isDone, idx) => (
                      <button
                        key={`day-${idx}`}
                        onClick={() => markDayComplete(challenge.id, idx)}
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                          isDone
                            ? 'bg-emerald-500 text-white shadow-sm scale-105'
                            : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500 hover:border-emerald-400'
                        }`}
                        title={`Dia ${idx + 1}`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Community Leaderboard */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Medal className="w-4 h-4 text-amber-500" />
          <span>Ranking de Membros da Comunidade</span>
        </h3>

        <div className="space-y-2">
          {LEADERBOARD_RANKING.map(member => (
            <div
              key={member.rank}
              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                member.isUser
                  ? 'bg-amber-100/70 dark:bg-amber-950/40 border-amber-400 font-bold shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center ${
                  member.rank === 1 ? 'bg-yellow-400 text-slate-900' :
                  member.rank === 2 ? 'bg-slate-300 text-slate-900' :
                  member.rank === 3 ? 'bg-amber-700 text-white' :
                  'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {member.rank}
                </span>

                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                />

                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>{member.name}</span>
                    {member.isUser && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                        Você
                      </span>
                    )}
                  </h4>
                  <span className="text-[10px] text-slate-400">{member.level}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 block">
                  {member.xp} XP
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
