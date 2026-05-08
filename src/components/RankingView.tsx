import React from 'react';
import { Trophy, Star, TrendingUp, Award, Zap, History, ChevronRight } from 'lucide-react';
import { UserProfile } from '../types';

interface RankingViewProps {
  profile: UserProfile | null;
}

export function RankingView({ profile }: RankingViewProps) {
  const points = profile?.points || 0;
  const history = profile?.pointsHistory || [];

  const getLevelInfo = (pts: number) => {
    if (pts < 500) return { name: 'Iniciante', color: 'text-slate-400', bg: 'bg-slate-400', nextGoal: 500 };
    if (pts < 1500) return { name: 'Intermediário', color: 'text-emerald-500', bg: 'bg-emerald-500', nextGoal: 1500 };
    if (pts < 3000) return { name: 'Avançado', color: 'text-blue-500', bg: 'bg-blue-500', nextGoal: 3000 };
    return { name: 'Mestre Nutri', color: 'text-amber-500', bg: 'bg-amber-500', nextGoal: pts };
  };

  const levelInfo = getLevelInfo(points);
  const progress = levelInfo.nextGoal === points ? 100 : (points / levelInfo.nextGoal) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Seu Ranking de Evolução
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Cada hábito saudável te leva mais longe. Acumule pontos e suba de nível na sua jornada.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Current Status Card */}
        <div className="md:col-span-1 clay-card p-8 shadow-2xl flex flex-col items-center justify-center space-y-6 text-center">
            <div className="relative">
               <div className={`w-32 h-32 rounded-full border-4 ${levelInfo.bg.replace('bg-', 'border-')}/20 flex items-center justify-center overflow-hidden bg-white/60 dark:bg-slate-700`}>
                  <Trophy className={`w-16 h-16 ${levelInfo.color}`} />
               </div>
               <div className={`absolute -bottom-2 right-0 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest ${levelInfo.bg} shadow-lg`}>
                  LVL {(points / 500).toFixed(0)}
               </div>
            </div>
            <div className="space-y-1">
              <h4 className={`font-serif text-2xl font-bold ${levelInfo.color}`}>{levelInfo.name}</h4>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nível Atual</p>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
               <div 
                 className={`h-full ${levelInfo.bg} transition-all duration-1000`}
                 style={{ width: `${progress}%` }}
               />
            </div>
            <div className="flex justify-between w-full text-[10px] font-bold uppercase tracking-widest text-slate-400">
               <span>{points} pts</span>
               <span>Próximo: {levelInfo.nextGoal} pts</span>
            </div>
        </div>

        {/* Stats Summary Card */}
        <div className="md:col-span-2 bg-slate-900 text-white p-8 rounded-[32px] clay-card shadow-2xl flex flex-col justify-between space-y-8 relative overflow-hidden">
           {/* Decorative background shape */}
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <TrendingUp className="w-32 h-32" />
           </div>

           <div className="space-y-2 relative z-10">
              <h3 className="font-serif text-3xl font-medium">Estatísticas de Poder</h3>
              <p className="text-slate-400">Você está entre os usuários que mais evoluem esta semana!</p>
           </div>

           <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 relative z-10">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex flex-col items-center gap-2">
                 <Zap className="w-6 h-6 text-yellow-400" />
                 <p className="text-2xl font-bold">{points}</p>
                 <p className="text-[10px] font-bold uppercase text-slate-400">Pts Totais</p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex flex-col items-center gap-2">
                 <Star className="w-6 h-6 text-emerald-400" />
                 <p className="text-2xl font-bold">{history.length}</p>
                 <p className="text-[10px] font-bold uppercase text-slate-400">Conquistas</p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex flex-col items-center gap-2">
                 <Award className="w-6 h-6 text-blue-400" />
                 <p className="text-2xl font-bold">TOP 5%</p>
                 <p className="text-[10px] font-bold uppercase text-slate-400">Sua Posição</p>
              </div>
           </div>

           <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                 </div>
                 <div>
                    <p className="text-sm font-bold">Crescimento Mensal</p>
                    <p className="text-xs text-slate-400">+12% pts que o mês passado</p>
                 </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600" />
           </div>
        </div>
      </div>

      {/* Points History */}
      <div className="clay-card p-8 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-slate-400" />
            <h3 className="font-serif text-2xl font-medium text-slate-800 dark:text-slate-100">Jornada de Conquistas</h3>
          </div>
          
          <div className="space-y-4">
             {history.length === 0 ? (
               <div className="text-center py-12 space-y-4">
                  <Star className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto" />
                  <p className="text-slate-400 italic">Sua jornada está apenas começando. Ganhe pontos ao usar as ferramentas do app!</p>
               </div>
             ) : (
               history.slice().reverse().map((entry) => (
                 <div key={entry.id} className="flex items-center justify-between p-5 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white/40 group hover:bg-white dark:hover:bg-slate-700 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                          <Zap className="w-6 h-6" />
                       </div>
                       <div>
                          <p className="font-bold text-slate-700 dark:text-slate-200">{entry.reason}</p>
                          <p className="text-xs text-slate-400">{new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                       </div>
                    </div>
                    <div className="text-xl font-serif font-bold text-emerald-600">
                       +{entry.amount}
                    </div>
                 </div>
               ))
             )}
          </div>
      </div>

      {/* Points Tip Card */}
      <div className="grid md:grid-cols-2 gap-8 ring-1 ring-emerald-500/10 p-8 rounded-[32px] clay-card bg-emerald-50/20 dark:bg-emerald-900/5">
          <div className="space-y-4">
             <h4 className="font-serif text-2xl font-medium text-emerald-800 dark:text-emerald-400">Como ganhar mais pontos?</h4>
             <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Mantenha a frequência! O uso diário do app e a conclusão dos desafios são as formas mais rápidas de subir de nível.
             </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-white/60 dark:bg-slate-800 border border-white rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Challenge Day</p>
                <p className="text-lg font-bold text-emerald-600">+100 pts</p>
             </div>
             <div className="p-4 bg-white/60 dark:bg-slate-800 border border-white rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Beber Água</p>
                <p className="text-lg font-bold text-emerald-600">+10 pts</p>
             </div>
             <div className="p-4 bg-white/60 dark:bg-slate-800 border border-white rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Nova Receita</p>
                <p className="text-lg font-bold text-emerald-600">+20 pts</p>
             </div>
             <div className="p-4 bg-white/60 dark:bg-slate-800 border border-white rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Análise de Prato</p>
                <p className="text-lg font-bold text-emerald-600">+50 pts</p>
             </div>
          </div>
      </div>
    </div>
  );
}
