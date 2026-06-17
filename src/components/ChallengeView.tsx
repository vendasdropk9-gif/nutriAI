import { playAudioUrl } from '../lib/speech';
import React, { useState } from 'react';
import { Target, Trophy, Flame, ChevronRight, CheckCircle2, Circle, Sparkles, Volume2, Play, Calendar, Timer } from 'lucide-react';
import { Challenge, UserProfile } from '../types';
import { generateChallengeFeedback, textToSpeech } from '../lib/gemini';
import { ConfettiCelebration } from './ConfettiCelebration';

interface ChallengeViewProps {
  profile: UserProfile | null;
  onUpdateChallenge: (challenge: Challenge | undefined) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function ChallengeView({ profile, onUpdateChallenge, onAwardPoints }: ChallengeViewProps) {
  const [selectedType, setSelectedType] = useState<7 | 15 | 30>(7);
  const [goal, setGoal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const challenge = profile?.currentChallenge;

  const startChallenge = () => {
    if (!goal.trim()) {
      alert("Por favor, defina uma meta diária (ex: zero açúcar, 2L de água, comer vegetal em toda refeição).");
      return;
    }

    const newChallenge: Challenge = {
      type: selectedType,
      startDate: new Date().toISOString(),
      completedDays: 0,
      dailyGoal: goal.trim(),
      history: []
    };

    onUpdateChallenge(newChallenge);
  };

  const completeDay = async () => {
    if (!challenge) return;
    
    setIsProcessing(true);
    setAudioUrl(null);

    const nextDay = challenge.completedDays + 1;
    const feedback = await generateChallengeFeedback(nextDay, challenge.type, profile);

    const newHistoryEntry = {
      day: nextDay,
      date: new Date().toISOString(),
      completed: true,
      feedback
    };

    const updatedChallenge: Challenge = {
      ...challenge,
      completedDays: nextDay,
      history: [...challenge.history, newHistoryEntry]
    };

    onUpdateChallenge(updatedChallenge);
    if (onAwardPoints) onAwardPoints(100, `Dia ${nextDay} do desafio concluído`);
    setIsProcessing(false);
    setShowConfetti(true);
    
    // Auto-play the feedback
    playTTS(feedback);
  };

  const playTTS = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    try {
      const base64Audio = await textToSpeech(text);
      if (base64Audio) {
        const url = `data:audio/wav;base64,${base64Audio}`;
        setAudioUrl(url);
        await playAudioUrl(url, { onEnded: () => setIsPlaying(false) });
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error(error);
      setIsPlaying(false);
    }
  };

  const progressPercentage = challenge ? (challenge.completedDays / challenge.type) * 100 : 0;

  if (!challenge) {
    return (
      <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        <ConfettiCelebration active={showConfetti} onComplete={() => setShowConfetti(false)} mode="all" />
        <div className="text-center space-y-4">
          <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
            Desafio Personalizado
          </h2>
          <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
            Escolha um período e defina uma meta. Eu vou te acompanhar todos os dias com feedback e motivação.
          </p>
        </div>

        <div className="clay-card p-8 space-y-10">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest text-center">Quanto tempo de foco total?</label>
            <div className="grid grid-cols-3 gap-4">
              {[7, 15, 30].map(days => (
                <button
                  key={days}
                  onClick={() => setSelectedType(days as any)}
                  className={`py-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    selectedType === days 
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                    : 'bg-white/60 dark:bg-slate-800/60 border-white/40 dark:border-slate-700/50 text-slate-500 hover:border-emerald-300'
                  }`}
                >
                  <span className="text-3xl font-serif font-bold">{days}</span>
                  <span className="text-xs uppercase font-bold">Dias</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest text-center">Qual sua única meta diária?</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ex: Beber 3L de água / Sem refrigerante / Legumes no almoço"
              className="w-full p-6 bg-white/60 dark:bg-slate-800/60 border border-white/40 dark:border-slate-600/50 rounded-3xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-center font-serif text-2xl text-slate-700 dark:text-slate-200"
            />
          </div>

          <button
            onClick={startChallenge}
            className="w-full py-6 bg-emerald-500 hover:clay-primary px-6 py-3 font-bold text-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3"
          >
            Começar Desafio
            <Flame className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  const latestFeedback = challenge.history[challenge.history.length - 1]?.feedback;

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <ConfettiCelebration active={showConfetti} onComplete={() => setShowConfetti(false)} mode="all" />
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 clay-card p-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
             <Trophy className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-3xl font-medium text-slate-800 dark:text-slate-100">Desafio de {challenge.type} Dias</h3>
            <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
               <Target className="w-4 h-4" />
               {challenge.dailyGoal}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm("Deseja realmente cancelar seu desafio atual?")) {
              onUpdateChallenge(undefined);
            }
          }}
          className="text-xs font-bold text-slate-400 hover:text-rose-500 underline uppercase tracking-widest"
        >
          Cancelar Desafio
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Evolution Avatar Card */}
        <div className="md:col-span-1 clay-card p-8 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="relative">
               <div className="w-32 h-32 rounded-full border-4 border-emerald-500/20 flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-700">
                  <div className={`transition-all duration-1000 ${progressPercentage > 50 ? 'scale-110 shadow-2xl' : 'scale-100'}`}>
                    <Flame 
                      className={`w-16 h-16 transition-colors duration-1000 ${
                        progressPercentage < 30 ? 'text-slate-300' : 
                        progressPercentage < 70 ? 'text-emerald-400' : 'text-emerald-600'
                      }`} 
                    />
                  </div>
               </div>
               {progressPercentage >= 100 && (
                 <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <Sparkles className="w-6 h-6 text-white" />
                 </div>
               )}
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-xl font-medium text-slate-800 dark:text-slate-100">Sua Energia</h4>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Evoluindo a cada dia</p>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-emerald-500 transition-all duration-1000"
                 style={{ width: `${progressPercentage}%` }}
               />
            </div>
            <p className="text-2xl font-serif font-bold text-emerald-600">
               {challenge.completedDays} / {challenge.type}
            </p>
        </div>

        {/* Action Card */}
        <div className="md:col-span-2 clay-card p-8 flex flex-col justify-center space-y-8">
           <div className="text-center space-y-2">
              <h4 className="font-serif text-2xl font-medium text-slate-800 dark:text-slate-100">Dia {challenge.completedDays + 1}</h4>
              <p className="text-slate-500 dark:text-slate-400 font-sans">Meta de hoje: <span className="font-bold text-slate-700 dark:text-slate-200">{challenge.dailyGoal}</span></p>
           </div>

           {challenge.completedDays < challenge.type ? (
             <button
               onClick={completeDay}
               disabled={isProcessing}
               className="w-full py-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold text-xl shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
             >
               {isProcessing ? <Timer className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
               Meta do Dia Concluída!
             </button>
           ) : (
             <div className="bg-emerald-500 text-white p-8 rounded-2xl text-center space-y-4">
                <Trophy className="w-12 h-12 mx-auto" />
                <h3 className="text-2xl font-bold font-serif">Desafio Concluído!</h3>
                <p className="font-medium opacity-90">Você provou sua disciplina. Que tal um novo desafio de 30 dias?</p>
             </div>
           )}

           {latestFeedback && (
             <div className="clay-card p-6 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                 <button
                    onClick={() => playTTS(latestFeedback)}
                    className={`w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md ${isPlaying ? 'animate-pulse' : ''}`}
                  >
                    {isPlaying ? <Volume2 className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  <p className="text-slate-700 dark:text-slate-200 font-sans italic text-sm leading-relaxed">
                     "{latestFeedback}"
                  </p>
             </div>
           )}
        </div>
      </div>

      <div className="clay-card p-8">
          <div className="flex items-center gap-3 mb-8">
            <Calendar className="w-6 h-6 text-slate-400" />
            <h3 className="font-serif text-2xl font-medium text-slate-800 dark:text-slate-100">Calendário da Vitória</h3>
          </div>
          <div className="grid grid-cols-7 sm:grid-cols-10 gap-3">
             {Array.from({ length: challenge.type }).map((_, i) => {
               const dayNum = i + 1;
               const isCompleted = dayNum <= challenge.completedDays;
               return (
                 <div
                   key={i}
                   className={`aspect-square rounded-xl flex items-center justify-center border-2 transition-all ${
                     isCompleted 
                     ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                     : 'bg-white/40 dark:bg-slate-800/40 border-white/60 dark:border-slate-700/50 text-slate-300 dark:text-slate-600'
                   }`}
                 >
                   {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-bold">{dayNum}</span>}
                 </div>
               );
             })}
          </div>
      </div>
    </div>
  );
}
