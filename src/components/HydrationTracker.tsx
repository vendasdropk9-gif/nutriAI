import React, { useState, useEffect } from 'react';
import { Droplet, Plus, GlassWater as Glass, Volume2, Play, Sparkles, RefreshCw, Info, Calendar } from 'lucide-react';
import { UserProfile, HydrationLog } from '../types';
import { generateHydrationAdvice, textToSpeech } from '../lib/gemini';

interface HydrationTrackerProps {
  profile: UserProfile | null;
  onUpdateProtocol: (goal: number, logs: HydrationLog[]) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function HydrationTracker({ profile, onUpdateProtocol, onAwardPoints }: HydrationTrackerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);

  // Today's logs
  const today = new Date().toISOString().split('T')[0];
  const logs = profile?.hydrationLogs || [];
  const todayLogs = logs.filter(log => log.date.startsWith(today));
  const currentTotal = todayLogs.reduce((sum, log) => sum + log.amount, 0);
  
  // Default goal calculation: weight * 35ml
  const recommendedGoal = profile?.weight ? Math.round(profile.weight * 35) : 2500;
  const goal = profile?.waterGoal || recommendedGoal;

  const handleAddWater = (amount: number) => {
    const newLog: HydrationLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      amount
    };
    onUpdateProtocol(goal, [...logs, newLog]);
    if (onAwardPoints) onAwardPoints(10, `Hidratação: +${amount}ml registrados`);
  };

  const resetToday = () => {
    if (confirm("Resetar o consumo de hoje?")) {
      const otherDaysLogs = logs.filter(log => !log.date.startsWith(today));
      onUpdateProtocol(goal, otherDaysLogs);
    }
  };

  const getAdvice = async () => {
    setIsProcessing(true);
    setAudioUrl(null);
    try {
      const msg = await generateHydrationAdvice(currentTotal, goal, profile);
      setAdvice(msg);
      playTTS(msg);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const playTTS = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    try {
      const base64Audio = await textToSpeech(text);
      if (base64Audio) {
        const url = `data:audio/wav;base64,${base64Audio}`;
        setAudioUrl(url);
        const audio = new Audio(url);
        audio.onended = () => setIsPlaying(false);
        audio.play();
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error(error);
      setIsPlaying(false);
    }
  };

  const percentage = Math.min((currentTotal / goal) * 100, 100);

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Hidratação Inteligente
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Beber água é o segredo para o metabolismo acelerado. Eu calculo sua meta ideal e te lembro de beber.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Progress Card */}
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 dark:border-slate-700/50 shadow-2xl flex flex-col items-center justify-center space-y-8 relative overflow-hidden">
            {/* Water Wave Background */}
            <div 
              className="absolute bottom-0 left-0 w-full bg-emerald-400/10 dark:bg-emerald-400/5 transition-all duration-1000 ease-in-out"
              style={{ height: `${percentage}%` }}
            />

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-48 h-48 rounded-full border-8 border-slate-100 dark:border-slate-700 flex items-center justify-center relative bg-white/40 dark:bg-slate-800/40">
                <div className="text-center">
                   <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Restam</p>
                   <p className="text-4xl font-serif font-bold text-emerald-600">
                      {Math.max(goal - currentTotal, 0)}ml
                   </p>
                   <p className="text-xs text-slate-400 mt-1">de {goal}ml</p>
                </div>
                {/* Visual Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                   <circle
                     cx="96"
                     cy="96"
                     r="88"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="8"
                     className="text-emerald-500 transition-all duration-1000"
                     strokeDasharray={2 * Math.PI * 88}
                     strokeDashoffset={2 * Math.PI * 88 * (1 - percentage / 100)}
                     strokeLinecap="round"
                   />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full relative z-10">
               <div className="bg-white/60 dark:bg-slate-700/50 p-4 rounded-2xl text-center border border-white/40">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Consumido</p>
                  <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{currentTotal}ml</p>
               </div>
               <div className="bg-white/60 dark:bg-slate-700/50 p-4 rounded-2xl text-center border border-white/40 text-emerald-500">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Meta</p>
                  <p className="text-xl font-bold">{goal}ml</p>
               </div>
            </div>
        </div>

        {/* Actions Card */}
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 dark:border-slate-700/50 shadow-2xl flex flex-col justify-between space-y-6">
           <div className="space-y-4">
              <h3 className="font-serif text-2xl text-slate-800 dark:text-slate-100 font-medium">Registrar Ingestão</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Clique no tamanho do copo ou garrafa que você usou.</p>
           </div>
           
           <div className="grid grid-cols-1 gap-3">
              {[200, 300, 500].map(amount => (
                <button
                  key={amount}
                  onClick={() => handleAddWater(amount)}
                  className="group flex items-center justify-between p-5 bg-white/60 dark:bg-slate-700/50 border border-white/40 dark:border-slate-600/50 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-white/20 group-hover:text-white">
                       <Glass className={`w-6 h-6 ${amount === 500 ? 'scale-110' : ''}`} />
                    </div>
                    <span className="font-bold text-lg">{amount}ml</span>
                  </div>
                  <Plus className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                </button>
              ))}
           </div>

           <div className="flex items-center justify-between pt-4">
             <button
               onClick={getAdvice}
               disabled={isProcessing}
               className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:underline"
             >
               <Sparkles className="w-4 h-4" />
               Como estou indo?
             </button>
             <button
               onClick={resetToday}
               className="flex items-center gap-1 text-slate-400 hover:text-rose-500 text-xs font-medium"
             >
               <RefreshCw className="w-3 h-3" />
               Zerar hoje
             </button>
           </div>
        </div>
      </div>

      {/* Intelligent Feedback Section */}
      {(advice || isProcessing) && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 bg-white/50 dark:bg-slate-800/50 p-8 rounded-[32px] border border-white/80 dark:border-slate-700/50 shadow-sm">
           <div className="flex items-start gap-4">
               <button
                  onClick={() => advice && playTTS(advice)}
                  className={`w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-white bg-emerald-500 transition-all ${isPlaying ? 'animate-pulse ring-4 ring-emerald-500/30' : 'hover:scale-105 shadow-md shadow-emerald-500/20'}`}
                >
                  {isPlaying ? <Volume2 className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>
                <div className="space-y-2">
                  <h4 className="font-serif text-2xl text-emerald-800 dark:text-emerald-400 font-medium italic">Assistente NutriAI diz:</h4>
                  {isProcessing ? (
                    <div className="flex items-center gap-2 text-slate-400 animate-pulse">
                      <Sparkles className="w-4 h-4" />
                      <span>Analisando sua hidratação...</span>
                    </div>
                  ) : (
                    <p className="font-sans text-slate-700 dark:text-slate-300 text-xl leading-relaxed italic">
                      "{advice}"
                    </p>
                  )}
                </div>
            </div>
        </div>
      )}

      {/* History and recommendation info */}
      <div className="grid md:grid-cols-2 gap-8">
         <div className="bg-white/40 dark:bg-slate-800/40 p-8 rounded-[32px] border border-white/60 dark:border-slate-700/50 space-y-6">
            <div className="flex items-center gap-3">
               <Info className="w-5 h-5 text-slate-400" />
               <h3 className="font-serif text-xl font-medium text-slate-700 dark:text-slate-200">Por que beber {goal}ml?</h3>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
               Com base no seu peso ({profile?.weight || 'não informado'}kg), o cálculo ideal de 35ml por quilo indica que seu corpo precisa dessa quantidade para metabolizar gordura e eliminar toxinas de forma eficiente.
            </p>
            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
               <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2">
                  <Droplet className="w-3 h-3" />
                  DICA DA IA: Experimente água com limão em jejum para despertar seu sistema digestivo.
               </p>
            </div>
         </div>

         <div className="bg-white/40 dark:bg-slate-800/40 p-8 rounded-[32px] border border-white/60 dark:border-slate-700/50 space-y-6">
            <div className="flex items-center gap-3">
               <Calendar className="w-5 h-5 text-slate-400" />
               <h3 className="font-serif text-xl font-medium text-slate-700 dark:text-slate-200">Histórico de Hoje</h3>
            </div>
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
               {todayLogs.length === 0 ? (
                 <p className="text-slate-400 italic text-center py-4">Nenhum gole registrado ainda hoje.</p>
               ) : (
                 todayLogs.slice().reverse().map((log) => (
                   <div key={log.id} className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-white/40">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                            <Droplet className="w-4 h-4" />
                         </div>
                         <span className="font-bold text-slate-600 dark:text-slate-300">{log.amount}ml</span>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(log.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                 ))
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
