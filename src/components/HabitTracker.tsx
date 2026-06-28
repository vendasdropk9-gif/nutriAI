import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Droplet, Moon, Clock, Plus, Sparkles, Volume2, Play, Info, Calendar, 
  Activity, Zap, Trash2, Bell, Filter, Check, Sliders, AlertTriangle, 
  HelpCircle, RefreshCw, Pencil, CheckSquare, Coffee, Waves
} from 'lucide-react';
import { UserProfile, HydrationLog, SleepLog, FastingLog } from '../types';
import { playAudioUrl } from '../lib/speech';
import { textToSpeech, generateHabitsInsight, getWaterQualityAdvice } from '../lib/gemini';
import { playSfx, vibrate } from '../lib/sensory';

interface HabitTrackerProps {
  profile: UserProfile | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
  addNotification?: (notif: { title: string; message: string; type: 'achievement' | 'point' | 'streak' | 'info' }) => void;
}

const WATER_SOURCES = [
  { id: 'Filtrada', label: 'Filtrada', icon: '💧', desc: 'Livre de cloro, metais pesados e partículas.', pH: 'pH ~7.0 (Neutro)', purity: 'Altíssima (Filtro de Barro/Carvão)', benefit: 'Purificação diária sem aditivos químicos.' },
  { id: 'Mineral', label: 'Mineral', icon: '⛰️', desc: 'Rica em eletrólitos naturais e sais minerais.', pH: 'pH ~7.4 (Levemente Alcalina)', purity: 'Alta (Fontes subterrâneas)', benefit: 'Ótima para reposição de cálcio e magnésio.' },
  { id: 'Alcalina', label: 'Alcalina', icon: '⚡', desc: 'Ionizada para combater radicais livres.', pH: 'pH 8.5 - 9.5 (Alcalino)', purity: 'Altíssima (Filtros Especiais/Ozonizada)', benefit: 'Ajuda a diminuir a acidez metabólica.' },
  { id: 'Torneira', label: 'Torneira', icon: '🚰', desc: 'Tratada da rede pública. Contém cloro.', pH: 'pH ~6.8', purity: 'Baixa/Média (Direto da Rede)', benefit: 'Prática, mas recomenda-se filtrar antes.' },
  { id: 'Coco', label: 'Água de Coco', icon: '🥥', desc: 'Repleta de potássio e sódio essenciais.', pH: 'pH ~6.2 (Natural)', purity: 'Natural (Fruta Orgânica)', benefit: 'Isotônico natural perfeito para reidratação.' },
  { id: 'Outra', label: 'Outra', icon: '🍵', desc: 'Chás claros, infusões ou águas saborizadas.', pH: 'Variável', purity: 'Caseira', benefit: 'Complemento saudável à hidratação pura.' }
] as const;

export function HabitTracker({ profile, onUpdateProfile, onAwardPoints, addNotification }: HabitTrackerProps) {
  const [activeTab, setActiveTab] = useState<'hydration' | 'sleep' | 'fasting'>('hydration');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);

  // Hydration extra states
  const [selectedWaterSource, setSelectedWaterSource] = useState<'Filtrada' | 'Mineral' | 'Torneira' | 'Alcalina' | 'Poço' | 'Coco' | 'Outra'>('Filtrada');
  const [customWaterAmount, setCustomWaterAmount] = useState<string>('250');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempWaterGoal, setTempWaterGoal] = useState<string>('2500');
  
  // IA Water Consultant state
  const [waterQuery, setWaterQuery] = useState('');
  const [waterAnswer, setWaterAnswer] = useState<string | null>(null);
  const [isAnalyzingWater, setIsAnalyzingWater] = useState(false);

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

  // Reminders Settings read from user profile
  const reminderEnabled = profile?.waterReminderEnabled ?? false;
  const reminderInterval = profile?.waterReminderIntervalMinutes ?? 60;
  const reminderStartHour = profile?.waterReminderStartHour ?? 8;
  const reminderEndHour = profile?.waterReminderEndHour ?? 22;

  // Reactivity tick for countdown timer
  const [tick, setTick] = useState(0);
  const [lastNotifiedTime, setLastNotifiedTime] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 15000); // refresh calculations every 15 seconds
    return () => clearInterval(timer);
  }, []);

  // Compute countdown until next drink
  const latestLogOfToday = todayHydration.length > 0 
    ? [...todayHydration].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  let minutesElapsed = 99999;
  let nextReminderMinutes = 0;
  let isOverdue = true;

  if (latestLogOfToday) {
    const lastTime = new Date(latestLogOfToday.date).getTime();
    const diffMs = Date.now() - lastTime;
    minutesElapsed = Math.floor(diffMs / (1000 * 60));
    nextReminderMinutes = Math.max(0, reminderInterval - minutesElapsed);
    isOverdue = minutesElapsed >= reminderInterval;
  }

  // Auto notification system hook
  useEffect(() => {
    if (!reminderEnabled || !addNotification) return;

    // Check if within hours
    const currentHour = new Date().getHours();
    if (currentHour < reminderStartHour || currentHour >= reminderEndHour) return;

    // If overdue and we haven't notified for this specific cycle/day
    if (isOverdue) {
      const todayStr = new Date().toLocaleDateString();
      const notificationKey = `${todayStr}-${Math.floor(Date.now() / (1000 * 60 * reminderInterval))}`; // key changes every interval
      
      if (lastNotifiedTime !== notificationKey) {
        setLastNotifiedTime(notificationKey);
        
        // Push notification
        addNotification({
          title: "Lembrete de Hidratação 💧",
          message: `Já faz mais de ${reminderInterval} minutos desde seu último copo de água. Beba água para reabastecer sua energia!`,
          type: 'info'
        });
        
        // Sensory alert
        playSfx('notification');
        vibrate([200, 100, 200]);
      }
    }
  }, [isOverdue, reminderEnabled, reminderInterval, reminderStartHour, reminderEndHour, lastNotifiedTime, addNotification]);

  const handleAddWater = (amount: number, source: any = selectedWaterSource) => {
    const newLog: HydrationLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      amount,
      source
    };
    onUpdateProfile({ hydrationLogs: [...hydrationLogs, newLog] });
    
    // Awards and feedback
    playSfx('crystal');
    vibrate(60);
    
    let bonusMessage = `Hidratação: +${amount}ml de água ${source.toLowerCase()} registrados!`;
    if (source === 'Alcalina') {
      bonusMessage += " Excelente escolha antioxidante.";
    } else if (source === 'Torneira') {
      bonusMessage += " Dica: considere filtrar para remover o cloro.";
    }
    
    if (onAwardPoints) onAwardPoints(10, bonusMessage);
  };

  const handleDeleteWaterLog = (id: string) => {
    const updated = hydrationLogs.filter(log => log.id !== id);
    onUpdateProfile({ hydrationLogs: updated });
    playSfx('tap');
    vibrate(40);
  };

  const handleUpdateWaterGoal = () => {
    const val = parseInt(tempWaterGoal);
    if (!isNaN(val) && val > 0) {
      onUpdateProfile({ waterGoal: val });
      setIsEditingGoal(false);
      playSfx('success');
      vibrate(50);
    }
  };

  const handleToggleReminders = (enabled: boolean) => {
    onUpdateProfile({ waterReminderEnabled: enabled });
    playSfx('tap');
    vibrate(45);
    if (enabled && addNotification) {
      addNotification({
        title: "Lembretes Ativados! 🔔",
        message: `Você receberá alertas a cada ${reminderInterval} minutos entre ${reminderStartHour}h e ${reminderEndHour}h.`,
        type: 'info'
      });
    }
  };

  const handleUpdateReminderInterval = (mins: number) => {
    onUpdateProfile({ waterReminderIntervalMinutes: mins });
    playSfx('tap');
  };

  const handleUpdateReminderHours = (start: number, end: number) => {
    onUpdateProfile({ waterReminderStartHour: start, waterReminderEndHour: end });
  };

  const handleTestNotification = () => {
    playSfx('notification');
    vibrate([100, 100, 100]);
    if (addNotification) {
      addNotification({
        title: "Teste de Lembrete 💧",
        message: "Excelente! Seus lembretes de hidratação estão funcionando com sucesso.",
        type: 'info'
      });
    }
  };

  const handleAskWaterAdvisor = async () => {
    if (!waterQuery.trim()) return;
    setIsAnalyzingWater(true);
    setWaterAnswer(null);
    vibrate(50);
    try {
      const advice = await getWaterQualityAdvice(waterQuery);
      setWaterAnswer(advice);
      playSfx('success');
    } catch (e) {
      console.error(e);
      setWaterAnswer("Não foi possível carregar as informações no momento. Tente novamente.");
    } finally {
      setIsAnalyzingWater(false);
    }
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

  // Water source statistics breakdown
  const sourceStats = WATER_SOURCES.map(src => {
    const ml = todayHydration
      .filter(log => log.source === src.id)
      .reduce((sum, log) => sum + log.amount, 0);
    const pct = currentTotalWater > 0 ? Math.round((ml / currentTotalWater) * 100) : 0;
    return { ...src, ml, pct };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Rastreamento de Hábitos
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
          Monitoramento inteligente 360º. Registre água com sua origem, configure alarmes de hidratação, e monitore sono e jejum com IA.
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
          { id: 'hydration', label: 'Água e Qualidade', icon: <Droplet className="w-4 h-4" /> },
          { id: 'sleep', label: 'Sono', icon: <Moon className="w-4 h-4" /> },
          { id: 'fasting', label: 'Jejum', icon: <Clock className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              playSfx('tap');
            }}
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
          <motion.div key="hydration" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            
            {/* Main grid: Ring + Water Input */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Ring card */}
              <div className="clay-card p-8 shadow-xl flex flex-col items-center justify-center space-y-6 relative overflow-hidden bg-white dark:bg-slate-800">
                <div 
                  className="absolute bottom-0 left-0 w-full bg-cyan-400/10 dark:bg-cyan-400/5 transition-all duration-1000 ease-in-out"
                  style={{ height: `${waterPercentage}%` }}
                />
                
                <div className="relative z-10 flex flex-col items-center w-full">
                  <div className="w-48 h-48 rounded-full flex items-center justify-center relative bg-white/40 dark:bg-slate-800/40 shadow-inner">
                    <div className="text-center relative z-10">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consumido</p>
                       <p className="text-4xl font-serif font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                          {currentTotalWater}ml
                       </p>
                       
                       {isEditingGoal ? (
                         <div className="flex items-center gap-1 mt-2 justify-center">
                           <input 
                             type="number" 
                             value={tempWaterGoal}
                             onChange={(e) => setTempWaterGoal(e.target.value)}
                             className="w-16 text-center border-b border-cyan-500 text-xs font-bold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none"
                             autoFocus
                           />
                           <button onClick={handleUpdateWaterGoal} className="p-1 bg-cyan-500 text-white rounded-full hover:bg-cyan-600">
                             <Check className="w-3 h-3" />
                           </button>
                         </div>
                       ) : (
                         <div className="flex items-center gap-1 mt-1 justify-center group cursor-pointer" onClick={() => { setIsEditingGoal(true); setTempWaterGoal(String(goalWater)); playSfx('tap'); }}>
                           <p className="text-xs text-slate-400">Meta: {goalWater}ml</p>
                           <Pencil className="w-3 h-3 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                         </div>
                       )}
                    </div>
                    <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full -rotate-90">
                       <circle
                         cx="96" cy="96" r="84" fill="none"
                         stroke="currentColor" strokeWidth="8"
                         className="text-slate-100 dark:text-slate-700/60"
                       />
                       <circle
                         cx="96" cy="96" r="84" fill="none"
                         stroke="currentColor" strokeWidth="8"
                         className="text-cyan-500 transition-all duration-1000"
                         strokeDasharray={2 * Math.PI * 84}
                         strokeDashoffset={2 * Math.PI * 84 * (1 - waterPercentage / 100)}
                         strokeLinecap="round"
                       />
                    </svg>
                  </div>
                  
                  {/* Quick status bar */}
                  <div className="w-full mt-6 bg-slate-100 dark:bg-slate-700/50 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {waterPercentage >= 100 
                        ? "🎉 Excelente! Você atingiu sua meta diária de hidratação!" 
                        : `Você completou ${waterPercentage.toFixed(0)}% da sua meta recomendada de água hoje.`}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Logger card */}
              <div className="clay-card p-8 shadow-xl flex flex-col justify-between space-y-6 bg-white dark:bg-slate-800">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl text-slate-800 dark:text-slate-100 font-medium">Registrar Ingestão</h3>
                    <p className="text-sm text-slate-500">Escolha a origem da água e o volume consumido.</p>
                  </div>

                  {/* Water Source Picker */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Filter className="w-3 h-3 text-cyan-500" /> Origem da Água
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {WATER_SOURCES.map(src => (
                        <button
                          key={src.id}
                          onClick={() => { setSelectedWaterSource(src.id); playSfx('tap'); }}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                            selectedWaterSource === src.id
                              ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-sm scale-[1.02]'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                          }`}
                        >
                          <span className="text-xl mb-1">{src.icon}</span>
                          <span className="text-xs font-bold leading-tight">{src.label}</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">{src.pH}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Water Quantity Picker */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Volume Consumido
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { amount: 150, label: "Xícara/Dose", sub: "150ml" },
                        { amount: 250, label: "Copo", sub: "250ml" },
                        { amount: 350, label: "Copo Grande", sub: "350ml" },
                        { amount: 500, label: "Garrafa", sub: "500ml" },
                      ].map(preset => (
                        <button
                          key={preset.amount}
                          onClick={() => handleAddWater(preset.amount)}
                          className="flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-900 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 transition-all rounded-xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          <span className="text-xs font-black">{preset.sub}</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 hover:text-white/80 mt-0.5">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Water Logger */}
                  <div className="flex gap-2 pt-2 items-center">
                    <div className="relative flex-1">
                      <input 
                        type="number"
                        value={customWaterAmount}
                        onChange={(e) => setCustomWaterAmount(e.target.value)}
                        placeholder="Quantidade personalizada"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                      />
                      <span className="absolute right-4 top-2.5 text-sm font-bold text-slate-400">ml</span>
                    </div>
                    <button
                      onClick={() => {
                        const amt = parseInt(customWaterAmount);
                        if (!isNaN(amt) && amt > 0) {
                          handleAddWater(amt);
                          setCustomWaterAmount('');
                        }
                      }}
                      className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-4 h-4" /> Registrar
                    </button>
                  </div>
                </div>

                {/* Selected Source Info Card */}
                {(() => {
                  const srcInfo = WATER_SOURCES.find(s => s.id === selectedWaterSource);
                  if (!srcInfo) return null;
                  return (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                      <div className="w-9 h-9 shrink-0 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-lg shadow-sm">
                        {srcInfo.icon}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">{srcInfo.label} • {srcInfo.pH}</p>
                        <p className="text-[11px] text-slate-400 leading-normal">{srcInfo.desc} <strong className="text-cyan-600 dark:text-cyan-400">{srcInfo.benefit}</strong></p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Alarm & Reminder Settings Card */}
            <div className="clay-card p-8 shadow-xl bg-white dark:bg-slate-800 grid md:grid-cols-2 gap-8 items-center border border-slate-100 dark:border-slate-700">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
                      <Bell className="w-5 h-5 animate-swing" />
                    </div>
                    <div>
                      <h4 className="font-serif text-xl font-medium text-slate-800 dark:text-slate-100">Lembrete de Hidratação</h4>
                      <p className="text-xs text-slate-400">Alarmes periódicos automáticos.</p>
                    </div>
                  </div>
                  
                  {/* Switch toggle */}
                  <button 
                    onClick={() => handleToggleReminders(!reminderEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${reminderEnabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${reminderEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                      <span>Frequência</span>
                      <span className="text-rose-500 font-bold">A cada {reminderInterval} minutos</span>
                    </div>
                    <input 
                      type="range" 
                      min="15" 
                      max="180" 
                      step="15" 
                      value={reminderInterval}
                      disabled={!reminderEnabled}
                      onChange={(e) => handleUpdateReminderInterval(parseInt(e.target.value))}
                      className="w-full accent-rose-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Horário Inicial</label>
                      <select
                        value={reminderStartHour}
                        disabled={!reminderEnabled}
                        onChange={(e) => handleUpdateReminderHours(parseInt(e.target.value), reminderEndHour)}
                        className="w-full text-xs font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none disabled:opacity-50 text-slate-700 dark:text-slate-300"
                      >
                        {[6, 7, 8, 9, 10, 11, 12].map(h => (
                          <option key={h} value={h}>{h}:00</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Horário Final</label>
                      <select
                        value={reminderEndHour}
                        disabled={!reminderEnabled}
                        onChange={(e) => handleUpdateReminderHours(reminderStartHour, parseInt(e.target.value))}
                        className="w-full text-xs font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none disabled:opacity-50 text-slate-700 dark:text-slate-300"
                      >
                        {[18, 19, 20, 21, 22, 23].map(h => (
                          <option key={h} value={h}>{h}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reminder Live Countdown */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                {reminderEnabled ? (
                  <>
                    <Waves className={`w-12 h-12 text-cyan-500 ${isOverdue ? 'animate-bounce' : 'animate-pulse'}`} />
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold uppercase tracking-widest text-slate-400">Próxima Notificação</h5>
                      {isOverdue ? (
                        <p className="text-xl font-black text-rose-500 animate-pulse">⚠️ ALERTA: Você está atrasado para se hidratar!</p>
                      ) : (
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                          em <strong className="text-cyan-600 dark:text-cyan-400">{nextReminderMinutes} minutos</strong>
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        Calculado automaticamente desde seu último copo às {latestLogOfToday ? new Date(latestLogOfToday.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}.
                      </p>
                    </div>
                    <button 
                      onClick={handleTestNotification}
                      className="px-4 py-2 bg-white dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-750 transition-all active:scale-95"
                    >
                      Testar Envio de Alerta
                    </button>
                  </>
                ) : (
                  <>
                    <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold uppercase tracking-widest text-slate-400">Lembrete Desativado</h5>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">Ative a chave de lembrete ao lado para receber alertas inteligentes baseados na sua ingestão real!</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Water Stats Breakdown & AI Quality Advisor */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Stats Breakdown */}
              <div className="clay-card p-8 shadow-xl bg-white dark:bg-slate-800 space-y-6 border border-slate-100 dark:border-slate-700">
                <div className="space-y-1">
                  <h4 className="font-serif text-xl font-medium text-slate-800 dark:text-slate-100">Divisão de Qualidade da Origem</h4>
                  <p className="text-xs text-slate-500">Acompanhamento pessoal dos tipos de água que você consumiu hoje.</p>
                </div>

                {currentTotalWater === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Waves className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-sm">Nenhum registro de hidratação feito hoje.</p>
                    <p className="text-xs mt-1">Seus volumes de água por origem aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sourceStats.map(stat => (
                      <div key={stat.id} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                            <span>{stat.icon}</span>
                            <span>{stat.label}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({stat.pH})</span>
                          </div>
                          <span className="font-semibold text-slate-500">{stat.ml}ml ({stat.pct}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${stat.pct}%` }}
                            className="h-full bg-cyan-500 rounded-full"
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Water Quality Consultant */}
              <div className="clay-card p-8 shadow-xl bg-white dark:bg-slate-800 space-y-6 border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-serif text-xl font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> Consultor de Qualidade da Água
                    </h4>
                    <p className="text-xs text-slate-500">Tire dúvidas sobre filtros de barro, alcalinização, poços, água dura e purificação.</p>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={waterQuery}
                      onChange={(e) => setWaterQuery(e.target.value)}
                      placeholder="Ex: O filtro de barro tradicional de cerâmica realmente limpa bem a água? Como aumentar o pH da água mineral em casa?"
                      rows={3}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-700 dark:text-slate-200 leading-relaxed"
                    />
                    <button
                      onClick={handleAskWaterAdvisor}
                      disabled={isAnalyzingWater || !waterQuery.trim()}
                      className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                    >
                      {isAnalyzingWater ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analisando parâmetros de água...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> Analisar Parâmetros de Qualidade com IA
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {waterAnswer && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-4 p-4 bg-cyan-50/50 dark:bg-cyan-950/20 rounded-2xl border border-cyan-100/60 dark:border-cyan-900/30 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-h-[180px] overflow-y-auto"
                    >
                      <h5 className="font-bold text-cyan-800 dark:text-cyan-400 mb-1 flex items-center gap-1">🔬 Parecer do Especialista:</h5>
                      <p className="whitespace-pre-line">{waterAnswer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Water logs history list */}
            <div className="clay-card p-8 shadow-xl bg-white dark:bg-slate-800 space-y-4 border border-slate-100 dark:border-slate-700">
              <h4 className="font-serif text-xl font-medium text-slate-800 dark:text-slate-100">Registros de Hidratação de Hoje</h4>
              
              {todayHydration.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Nenhum copo de água registrado hoje ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        <th className="py-2.5">Horário</th>
                        <th className="py-2.5">Volume</th>
                        <th className="py-2.5">Origem da Água</th>
                        <th className="py-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-850 text-xs text-slate-600 dark:text-slate-300">
                      {[...todayHydration].reverse().map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 font-semibold">
                            {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 font-black text-slate-800 dark:text-slate-200">
                            {log.amount} ml
                          </td>
                          <td className="py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {WATER_SOURCES.find(s => s.id === log.source)?.icon || '💧'} {log.source || 'Filtrada'}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteWaterLog(log.id)}
                              className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                              title="Remover registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

            <div className="clay-card p-8 shadow-xl flex flex-col justify-center space-y-8 bg-white dark:bg-slate-800">
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
                       onClick={() => { setSleepQuality(q); playSfx('tap'); }}
                       className={`py-2 px-1 text-xs font-bold rounded-xl border ${sleepQuality === q ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                     >
                       {q}
                     </button>
                   ))}
                 </div>
               </div>

               <button 
                 onClick={() => { handleLogSleep(); playSfx('success'); }}
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

            <div className="clay-card p-8 shadow-xl flex flex-col justify-center space-y-8 bg-white dark:bg-slate-800">
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
                 onClick={() => { handleLogFasting(); playSfx('success'); }}
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
