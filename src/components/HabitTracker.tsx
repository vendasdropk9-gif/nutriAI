import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplet, Moon, Clock, Plus, Sparkles, Volume2, Play, Info, Calendar, Activity, Zap } from 'lucide-react';
import { UserProfile, HydrationLog, SleepLog, FastingLog } from '../types';
import { playAudioUrl } from '../lib/speech';
import { textToSpeech, generateHabitsInsight } from '../lib/gemini';

interface HabitTrackerProps {
  profile: UserProfile | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function HabitTracker({ profile, onUpdateProfile, onAwardPoints }: HabitTrackerProps) {
  const [activeTab, setActiveTab] = useState<'hydration' | 'sleep' | 'fasting'>('hydration');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);

  // Today state
  const today = new Date().toISOString().split('T')[0];
  const hydrationLogs = profile?.hydrationLogs || [];
  const sleepLogs = profile?.sleepLogs || [];
  const fastingLogs = profile?.fastingLogs || [];

  const todayHydration = hydrationLogs.filter(log => log.date.startsWith(today));
  const currentTotalWater = todayHydration.reduce((sum, log) => sum + log.amount, 0);
  const recommendedWater = profile?.weight ? Math.round(profile.weight * 35) : 2500;
  const goalWater = profile?.waterGoal || recommendedWater;
  const waterPercentage = Math.min((currentTotalWater / goalWater) * 100, 100);

  const todaySleep = sleepLogs.find(log => log.date.startsWith(today));
  const todayFasting = fastingLogs.find(log => log.date.startsWith(today));

  // Modals / forms state
  const [sleepHours, setSleepHours] = useState(8);
  const [sleepQuality, setSleepQuality] = useState<'Péssimo' | 'Ruim' | 'Regular' | 'Bom' | 'Excelente'>('Bom');
  const [fastingHours, setFastingHours] = useState(16);

  const handleAddWater = (amount: number) => {
    const newLog: HydrationLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      amount
    };
    onUpdateProfile({ hydrationLogs: [...hydrationLogs, newLog] });
    if (onAwardPoints) onAwardPoints(10, `Hidratação: +${amount}ml registrados`);
  };

  const handleLogSleep = () => {
    const newLog: SleepLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      durationHours: sleepHours,
      quality: sleepQuality
    };
    const newLogs = [...sleepLogs.filter(l => !l.date.startsWith(today)), newLog];
    onUpdateProfile({ sleepLogs: newLogs });
    if (onAwardPoints) onAwardPoints(15, `Sono registrado: ${sleepHours}h`);
    getInsight(newLogs, fastingLogs); // get insights after
  };

  const handleLogFasting = () => {
    const newLog: FastingLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      durationHours: fastingHours
    };
    const newLogs = [...fastingLogs.filter(l => !l.date.startsWith(today)), newLog];
    onUpdateProfile({ fastingLogs: newLogs });
    if (onAwardPoints) onAwardPoints(20, `Jejum registrado: ${fastingHours}h`);
    getInsight(sleepLogs, newLogs);
  };

  const getInsight = async (sLogs = sleepLogs, fLogs = fastingLogs) => {
    setIsProcessing(true);
    setAudioUrl(null);
    try {
      const msg = await generateHabitsInsight(profile, currentTotalWater, goalWater, sLogs, fLogs);
      setInsight(msg);
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
        await playAudioUrl(url, { onEnded: () => setIsPlaying(false) });
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error(error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Rastreamento de Hábitos
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Monitoramento inteligente 360º. Registre água, sono e jejum. A Inteligência Artificial vai analisar seus padrões e otimizar sua rotina.
        </p>
      </div>

      {/* Insight Banner */}
      <div className="clay-card p-8 bg-gradient-to-br from-emerald-600 to-teal-800 text-white relative overflow-hidden flex flex-col md:flex-row items-center gap-6 shadow-2xl">
        <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        
        <button
          onClick={() => insight ? playTTS(insight) : getInsight()}
          disabled={isProcessing}
          className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center bg-white text-emerald-600 font-bold focus:outline-none transition-all ${isProcessing ? 'animate-pulse opacity-80' : 'hover:scale-105 shadow-xl shadow-emerald-900/50'} ${isPlaying ? 'ring-4 ring-emerald-300 ring-offset-2 ring-offset-emerald-600' : ''}`}
        >
          {isProcessing ? <Zap className="w-8 h-8 animate-pulse" /> : isPlaying ? <Volume2 className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
        </button>
        
        <div className="flex-1 space-y-2 text-center md:text-left z-10">
           <h3 className="text-sm font-black uppercase tracking-widest text-emerald-200">Insight Diário</h3>
           {isProcessing ? (
             <p className="text-xl font-medium animate-pulse text-white/80">Analisando seus hábitos...</p>
           ) : insight ? (
             <p className="text-lg font-medium leading-relaxed italic">"{insight}"</p>
           ) : (
             <p className="text-lg font-medium text-emerald-100">Toque no ícone para gerar uma análise personalizada da sua rotina atual de hidratação, sono e jejum.</p>
           )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-[92%] max-w-sm sm:max-w-md md:w-max p-1 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl mx-auto shadow-inner">
        {[
          { id: 'hydration', label: 'Água', icon: <Droplet className="w-4 h-4" /> },
          { id: 'sleep', label: 'Sono', icon: <Moon className="w-4 h-4" /> },
          { id: 'fasting', label: 'Jejum', icon: <Clock className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm md:text-base font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'hydration' && (
          <motion.div key="hydration" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid md:grid-cols-2 gap-8">
            <div className="clay-card p-8 shadow-xl flex flex-col items-center justify-center space-y-8 relative overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 w-full bg-emerald-400/10 dark:bg-emerald-400/5 transition-all duration-1000 ease-in-out"
                  style={{ height: `${waterPercentage}%` }}
                />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-48 h-48 rounded-full flex items-center justify-center relative bg-white/40 dark:bg-slate-800/40">
                    <div className="text-center relative z-10">
                       <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Restam</p>
                       <p className="text-4xl font-serif font-bold text-emerald-600">
                          {Math.max(goalWater - currentTotalWater, 0)}ml
                       </p>
                       <p className="text-xs text-slate-400 mt-1">de {goalWater}ml</p>
                    </div>
                    <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full -rotate-90">
                       {/* Background template track */}
                       <circle
                         cx="96" cy="96" r="88" fill="none"
                         stroke="currentColor" strokeWidth="8"
                         className="text-slate-100 dark:text-slate-700/60"
                       />
                       {/* Foreground active progress circle */}
                       <circle
                         cx="96" cy="96" r="88" fill="none"
                         stroke="currentColor" strokeWidth="8"
                         className="text-emerald-500 transition-all duration-1000"
                         strokeDasharray={2 * Math.PI * 88}
                         strokeDashoffset={2 * Math.PI * 88 * (1 - waterPercentage / 100)}
                         strokeLinecap="round"
                       />
                    </svg>
                  </div>
                </div>
            </div>
            
            <div className="clay-card p-8 shadow-xl flex flex-col justify-center space-y-6">
               <div className="space-y-2 text-center md:text-left">
                  <h3 className="font-serif text-2xl text-slate-800 dark:text-slate-100 font-medium">Registrar Ingestão</h3>
                  <p className="text-sm text-slate-500">Toque no tamanho do copo ou garrafa.</p>
               </div>
               <div className="grid gap-3">
                  {[200, 300, 500].map(amount => (
                    <button
                      key={amount}
                      onClick={() => handleAddWater(amount)}
                      className="group flex items-center justify-between p-4 bg-white/60 dark:bg-slate-700/50 border border-white/40 dark:border-slate-600/50 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-white/20 group-hover:text-white">
                           <Droplet className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg">{amount}ml</span>
                      </div>
                      <Plus className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                    </button>
                  ))}
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'sleep' && (
          <motion.div key="sleep" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid md:grid-cols-2 gap-8">
            <div className="clay-card p-8 shadow-xl flex flex-col items-center justify-center text-center space-y-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-0">
               <Moon className="w-16 h-16 text-indigo-400 opacity-80" />
               <div className="space-y-2">
                 <h3 className="font-serif text-2xl font-medium text-indigo-100">Como você dormiu?</h3>
                 <p className="text-indigo-300">O sono profundo regula hormônios como leptina e grelina, que controlam a fome.</p>
               </div>
               {todaySleep && (
                 <div className="bg-white/10 px-6 py-4 rounded-2xl mt-4 border border-white/10">
                   <p className="text-sm font-bold text-indigo-200 uppercase tracking-widest mb-1">Registro de Hoje</p>
                   <p className="text-3xl font-black">{todaySleep.durationHours} hrs</p>
                   <p className="text-indigo-300 mt-1">Qualidade: {todaySleep.quality}</p>
                 </div>
               )}
            </div>

            <div className="clay-card p-8 shadow-xl flex flex-col justify-center space-y-8">
               <div className="space-y-4">
                 <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest">Horas de sono</label>
                 <div className="flex items-center gap-4">
                   <input 
                     type="range" min="3" max="14" step="0.5" 
                     value={sleepHours} 
                     onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                     className="w-full accent-indigo-500" 
                   />
                   <span className="font-black text-2xl text-slate-700 dark:text-slate-200 min-w-[3ch]">{sleepHours}</span>
                 </div>
               </div>

               <div className="space-y-4">
                 <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest">Qualidade</label>
                 <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                   {(['Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'] as const).map(q => (
                     <button
                       key={q}
                       onClick={() => setSleepQuality(q)}
                       className={`py-2 px-1 text-xs font-bold rounded-xl border ${sleepQuality === q ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                     >
                       {q}
                     </button>
                   ))}
                 </div>
               </div>

               <button 
                 onClick={handleLogSleep}
                 className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
               >
                 <Moon className="w-5 h-5" />
                 Salvar Registro de Sono
               </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'fasting' && (
          <motion.div key="fasting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid md:grid-cols-2 gap-8">
            <div className="clay-card p-8 shadow-xl flex flex-col items-center justify-center text-center space-y-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
               <Clock className="w-16 h-16 text-amber-200 opacity-80" />
               <div className="space-y-2">
                 <h3 className="font-serif text-2xl font-medium text-amber-50">Jejum Intermitente</h3>
                 <p className="text-amber-200">Aumente a sensibilidade à insulina e promova autofagia com períodos de repouso digestivo.</p>
               </div>
               {todayFasting && (
                 <div className="bg-white/10 px-6 py-4 rounded-2xl mt-4 border border-white/10">
                   <p className="text-sm font-bold text-amber-200 uppercase tracking-widest mb-1">Registro de Hoje</p>
                   <p className="text-3xl font-black">{todayFasting.durationHours} hrs</p>
                 </div>
               )}
            </div>

            <div className="clay-card p-8 shadow-xl flex flex-col justify-center space-y-8">
               <div className="space-y-4">
                 <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest">Protocolo Realizado</label>
                 <div className="flex items-center gap-4">
                   <input 
                     type="range" min="12" max="24" step="1" 
                     value={fastingHours} 
                     onChange={(e) => setFastingHours(parseInt(e.target.value))}
                     className="w-full accent-amber-500" 
                   />
                   <span className="font-black text-2xl text-slate-700 dark:text-slate-200 min-w-[4ch]">{fastingHours}h</span>
                 </div>
               </div>
               
               <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                 <Info className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-sm text-amber-700 dark:text-amber-400">
                   Registros consistentes de jejum permitem que nossa IA recomende os melhores alimentos para quebra (desjejum) e otimize seus horários baseados no sono.
                 </p>
               </div>

               <button 
                 onClick={handleLogFasting}
                 className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
               >
                 <Clock className="w-5 h-5" />
                 Salvar Registro de Jejum
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
