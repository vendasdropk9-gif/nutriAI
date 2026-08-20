import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Activity, Info, Plus, Calendar, AlertTriangle, ShieldCheck, Check, 
  Trash2, Loader2, Sparkles, RefreshCw, Cpu, Smartphone, Bluetooth, Droplet, 
  Apple, Wind, AlertCircle, Share2, ClipboardList
} from 'lucide-react';
import { BloodPressureLog, UserProfile } from '../types';
import { analyzeBloodPressure } from '../lib/gemini';
import { playSfx, vibrate } from '../lib/sensory';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

interface BloodPressureTrackerProps {
  profile: UserProfile | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
}

export function BloodPressureTracker({ profile, onUpdateProfile, onAwardPoints }: BloodPressureTrackerProps) {
  const [systolic, setSystolic] = useState<number>(120);
  const [diastolic, setDiastolic] = useState<number>(80);
  const [bpm, setBpm] = useState<number>(72);
  const [notes, setNotes] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  const [activeTab, setActiveTab] = useState<'tracker' | 'history' | 'ai-analysis' | 'smartwatch'>('tracker');
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);

  // Simulation state
  const [simulationStep, setSimulationStep] = useState<number>(0); // 0: idle, 1: inflating, 2: reading, 3: completed
  const [simValueSys, setSimValueSys] = useState<number>(0);
  const [simValueDia, setSimValueDia] = useState<number>(0);
  const [simValueBpm, setSimValueBpm] = useState<number>(0);

  // Smartwatch state
  const [isBtConnecting, setIsBtConnecting] = useState<boolean>(false);
  const [isBtConnected, setIsBtConnected] = useState<boolean>(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);

  // Get logs safely from profile
  const logs: BloodPressureLog[] = useMemo(() => {
    return (profile?.bloodPressureLogs || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [profile?.bloodPressureLogs]);

  // Determine status color and label
  const getBpStatus = (sys: number, dia: number) => {
    if (sys >= 140 || dia >= 90) {
      return { label: 'Pressão Alta', color: 'text-red-500 bg-red-500/10 border-red-500/20', bgClass: 'bg-red-500', hexColor: '#ef4444' };
    } else if (sys >= 120 || dia >= 80) {
      return { label: 'Atenção / Pré-Hipertensão', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', bgClass: 'bg-amber-500', hexColor: '#f59e0b' };
    } else {
      return { label: 'Normal / Saudável', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', bgClass: 'bg-emerald-500', hexColor: '#10b981' };
    }
  };

  // Sound and vibration heartbeat during measurement
  useEffect(() => {
    let interval: any;
    if (isMeasuring && simulationStep === 2) {
      interval = setInterval(() => {
        playSfx('tap');
        vibrate(15);
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isMeasuring, simulationStep]);

  // Handle simulation of real-time automatic measurement cuff inflation
  const startMeasurementSimulation = () => {
    if (isMeasuring) return;
    setIsMeasuring(true);
    setSimulationStep(1);
    setSimValueSys(80);
    setSimValueDia(60);
    setSimValueBpm(65);
    playSfx('tap');
    vibrate(30);

    // Step 1: Cuff inflating (increasing values)
    let inflationTimer = setInterval(() => {
      setSimValueSys(prev => {
        if (prev >= 155) {
          clearInterval(inflationTimer);
          // Move to release/reading step
          setSimulationStep(2);
          startReadingSimulation();
          return 155;
        }
        playSfx('tap');
        return prev + Math.floor(Math.random() * 12) + 8;
      });
    }, 150);
  };

  const startReadingSimulation = () => {
    // Step 2: cuff deflating and measuring micro-oscillations
    let finalSys = Math.floor(Math.random() * 40) + 105; // 105 - 145
    let finalDia = Math.floor(Math.random() * 25) + 65;  // 65 - 90
    let finalBpm = Math.floor(Math.random() * 20) + 60;  // 60 - 80

    let valSys = 155;
    let defTimer = setInterval(() => {
      setSimValueSys(prev => {
        if (prev <= finalSys) {
          clearInterval(defTimer);
          setSimulationStep(3);
          setSimValueSys(finalSys);
          setSimValueDia(finalDia);
          setSimValueBpm(finalBpm);
          // Pre-populate input values with measured results
          setSystolic(finalSys);
          setDiastolic(finalDia);
          setBpm(finalBpm);
          playSfx('success');
          vibrate(50);
          return finalSys;
        }
        return prev - 2;
      });
      // Gently drop diastolic during reading
      setSimValueDia(prev => Math.max(finalDia, Math.floor(valSys - 60)));
      setSimValueBpm(prev => {
        const offset = Math.random() > 0.5 ? 1 : -1;
        return Math.max(55, Math.min(100, prev + offset));
      });
      valSys -= 2;
    }, 120);
  };

  const handleSaveSimulatedResult = () => {
    const newLog: BloodPressureLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      systolic: simValueSys,
      diastolic: simValueDia,
      bpm: simValueBpm,
      userId: profile?.id || 'local',
      notes: notes.trim() || 'Medição Smart Automática'
    };

    const currentLogs = profile?.bloodPressureLogs || [];
    const updatedLogs = [...currentLogs, newLog];
    
    onUpdateProfile({ bloodPressureLogs: updatedLogs });
    
    if (onAwardPoints) {
      onAwardPoints(15, "Medição de Pressão Inteligente");
    }

    setNotes('');
    setIsMeasuring(false);
    setSimulationStep(0);
    playSfx('success');
    setActiveTab('history');
  };

  // Form Manual Submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (systolic <= 0 || diastolic <= 0 || bpm <= 0) return;

    const newLog: BloodPressureLog = {
      id: crypto.randomUUID(),
      date: new Date(dateStr).toISOString(),
      systolic,
      diastolic,
      bpm,
      userId: profile?.id || 'local',
      notes: notes.trim() || 'Registro Manual'
    };

    const currentLogs = profile?.bloodPressureLogs || [];
    const updatedLogs = [...currentLogs, newLog];
    
    onUpdateProfile({ bloodPressureLogs: updatedLogs });
    
    if (onAwardPoints) {
      onAwardPoints(10, "Registro de Pressão Arterial");
    }

    setNotes('');
    playSfx('success');
    setActiveTab('history');
  };

  // Delete Log
  const handleDeleteLog = (id: string) => {
    const currentLogs = profile?.bloodPressureLogs || [];
    const updated = currentLogs.filter(l => l.id !== id);
    onUpdateProfile({ bloodPressureLogs: updated });
    playSfx('tap');
  };

  // Run Smart AI analysis via Gemini
  const triggerAiAnalysis = async () => {
    if (logs.length === 0) return;
    setIsAnalyzing(true);
    setAiAnalysisResult(null);
    playSfx('tap');

    try {
      const result = await analyzeBloodPressure(logs, profile);
      if (result) {
        setAiAnalysisResult(result);
        playSfx('success');
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Mock connecting smartwatch
  const handleConnectBt = (device: string) => {
    if (isBtConnected) {
      setIsBtConnected(false);
      setConnectedDevice(null);
      playSfx('tap');
      return;
    }
    setIsBtConnecting(true);
    playSfx('tap');
    setTimeout(() => {
      setIsBtConnecting(false);
      setIsBtConnected(true);
      setConnectedDevice(device);
      playSfx('success');
      vibrate(40);
    }, 2000);
  };

  // Evolution chart formatting
  const chartData = useMemo(() => {
    return [...logs].reverse().map(l => ({
      date: new Date(l.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      systolic: l.systolic,
      diastolic: l.diastolic,
      bpm: l.bpm,
      label: `${l.systolic}/${l.diastolic}`
    })).slice(-10); // Take last 10 points for readable chart
  }, [logs]);

  // Overall Health KPI averages
  const statsSummary = useMemo(() => {
    if (logs.length === 0) return null;
    const sysSum = logs.reduce((acc, current) => acc + current.systolic, 0);
    const diaSum = logs.reduce((acc, current) => acc + current.diastolic, 0);
    const bpmSum = logs.reduce((acc, current) => acc + current.bpm, 0);
    return {
      avgSys: Math.round(sysSum / logs.length),
      avgDia: Math.round(diaSum / logs.length),
      avgBpm: Math.round(bpmSum / logs.length),
      count: logs.length
    };
  }, [logs]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-16">
      {/* Premium Header */}
      <div className="text-center md:text-left space-y-2">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 flex items-center justify-center md:justify-start gap-3">
          <Heart className="w-9 h-9 text-rose-500 animate-pulse fill-rose-600" />
          Medidor de Pressão Arterial Inteligente
        </h2>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-2xl">
          Monitore seu ritmo cardiovascular diariamente, detecte alterações preventivas e receba orientações personalizadas guiadas pela Inteligência Artificial.
        </p>
      </div>

      {/* Internal Navigation Tabs inside Cardio Panel */}
      <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-[20px] max-w-md mx-auto md:mx-0 shadow-inner border border-white/40 dark:border-slate-800">
        {(['tracker', 'history', 'ai-analysis', 'smartwatch'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              playSfx('tap');
            }}
            className={`flex-1 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 capitalize ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'tracker' && 'Medir'}
            {tab === 'history' && 'Histórico'}
            {tab === 'ai-analysis' && 'Análise IA'}
            {tab === 'smartwatch' && 'Smartwatch'}
          </button>
        ))}
      </div>

      {/* Main card panel */}
      <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/60 dark:border-slate-700/60 rounded-[32px] shadow-2xl p-6 md:p-8 space-y-8 relative overflow-hidden transition-all duration-300">
        
        <AnimatePresence mode="wait">
          {activeTab === 'tracker' && (
            <motion.div
              key="tracker"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-8"
            >
              {/* Left column: Digital Cuff Simulator */}
              <div className="md:col-span-6 flex flex-col items-center justify-center space-y-6">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
                  Medidor Cardio Digital
                </span>
                
                {/* Simulated Monitor Screen */}
                <div className="relative w-64 h-64 md:w-72 md:h-72 rounded-full border-4 border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center p-8 bg-neutral-50 dark:bg-slate-900/60 shadow-inner overflow-hidden">
                  
                  {/* Dynamic background status ring */}
                  <div className="absolute inset-2 rounded-full border border-dashed border-slate-300 dark:border-slate-700 pointer-events-none" />
                  
                  {isMeasuring ? (
                    <div className="text-center space-y-4 flex flex-col items-center justify-center">
                      <Heart className={`w-12 h-12 text-rose-500 fill-rose-500 ${simulationStep === 2 ? 'animate-[ping_0.8s_infinite]' : 'animate-pulse'}`} />
                      
                      {simulationStep === 1 && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-sky-500 font-bold uppercase tracking-widest animate-pulse">Influflando Manguito...</p>
                          <p className="text-4xl font-mono font-black text-slate-800 dark:text-slate-100">{simValueSys}</p>
                          <p className="text-xs text-slate-400">mmHg</p>
                        </div>
                      )}

                      {simulationStep === 2 && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest animate-pulse">Medindo Ritmo...</p>
                          <div className="flex items-baseline justify-center gap-1 font-mono">
                            <span className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">{simValueSys}</span>
                            <span className="text-lg text-slate-400">/</span>
                            <span className="text-2xl font-bold text-slate-500">{simValueDia}</span>
                          </div>
                          <p className="text-xs font-mono text-emerald-500 font-bold">{simValueBpm} BPM</p>
                        </div>
                      )}

                      {simulationStep === 3 && (
                        <div className="space-y-1 animate-in zoom-in-90 duration-300">
                          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Leitura Concluída</p>
                          <div className="flex items-baseline justify-center gap-1 font-mono">
                            <span className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">{simValueSys}</span>
                            <span className="text-lg text-slate-400">/</span>
                            <span className="text-3xl font-extrabold text-slate-700 dark:text-slate-200">{simValueDia}</span>
                          </div>
                          <p className="text-xs font-mono font-extrabold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                            {simValueBpm} BPM
                          </p>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="text-center space-y-4 flex flex-col items-center justify-center">
                      <Heart className="w-16 h-16 text-rose-500 dark:text-rose-400 opacity-80" />
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Última Pressão</span>
                        {logs.length > 0 ? (
                          <>
                            <p className="text-3xl font-mono font-semibold text-slate-800 dark:text-slate-100">
                              {logs[0].systolic}/{logs[0].diastolic}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">{logs[0].bpm} BPM</p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-slate-400 italic">Sem registros</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Visual Status Indicator ring glow under simulation result or current entry */}
                  {simulationStep === 3 && (
                    <div className={`absolute bottom-3 px-3 py-1 rounded-full text-[9px] font-bold border ${getBpStatus(simValueSys, simValueDia).color}`}>
                      {getBpStatus(simValueSys, simValueDia).label}
                    </div>
                  )}
                  {!isMeasuring && logs.length > 0 && (
                    <div className={`absolute bottom-3 px-3 py-1 rounded-full text-[9px] font-bold border ${getBpStatus(logs[0].systolic, logs[0].diastolic).color}`}>
                      {getBpStatus(logs[0].systolic, logs[0].diastolic).label}
                    </div>
                  )}
                </div>

                {/* Simulation Control actions */}
                <div className="w-full max-w-xs space-y-3">
                  {!isMeasuring ? (
                    <button
                      onClick={startMeasurementSimulation}
                      className="w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold py-4 rounded-[20px] transition-all duration-300 shadow-lg shadow-rose-500/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                    >
                      <Heart className="w-4 h-4 animate-pulse" />
                      Medir Automaticamente (+15 XP)
                    </button>
                  ) : simulationStep === 3 ? (
                    <div className="flex gap-2">
                      <button
                        onClick={startMeasurementSimulation}
                        className="flex-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 hover:dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold py-3.5 rounded-[16px] text-xs transition-colors"
                      >
                        Remedir
                      </button>
                      <button
                        onClick={handleSaveSimulatedResult}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-[16px] text-xs transition-colors shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Salvar Medição
                      </button>
                    </div>
                  ) : (
                    <p className="text-center text-xs text-slate-400 dark:text-slate-500 animate-pulse font-medium">
                      Permaneça imóvel, mantenha o braço na altura do coração.
                    </p>
                  )}
                </div>

              </div>

              {/* Right column: Manual Input form & tips */}
              <div className="md:col-span-6 space-y-6">
                <div>
                  <h4 className="font-serif text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-emerald-500" />
                    Inserir Manualmente
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-600">Digite os valores caso tenha medido em um aparelho mecânico ou Bluetooth externo.</p>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                        Sistólica (SYS)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="250"
                        value={systolic}
                        onChange={(e) => {
                          setSystolic(Number(e.target.value));
                          playSfx('tap');
                        }}
                        required
                        className="w-full text-center p-3 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500/30 outline-none text-slate-800 dark:text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                        Diastólica (DIA)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="180"
                        value={diastolic}
                        onChange={(e) => {
                          setDiastolic(Number(e.target.value));
                          playSfx('tap');
                        }}
                        required
                        className="w-full text-center p-3 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500/30 outline-none text-slate-800 dark:text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                        Pulso (BPM)
                      </label>
                      <input
                        type="number"
                        min="35"
                        max="220"
                        value={bpm}
                        onChange={(e) => {
                          setBpm(Number(e.target.value));
                          playSfx('tap');
                        }}
                        required
                        className="w-full text-center p-3 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500/30 outline-none text-slate-800 dark:text-slate-100 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Data e Hora da Medição
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="datetime-local"
                        value={dateStr}
                        onChange={(e) => setDateStr(e.target.value)}
                        required
                        className="w-full p-3 pl-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500/30 outline-none text-slate-800 dark:text-slate-100 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Notas / Sintomas (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Em repouso, após treinar, dor de cabeça leve..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500/30 outline-none text-slate-800 dark:text-slate-100 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 hover:dark:bg-slate-600 text-white font-bold py-3.5 rounded-[16px] transition-all duration-300 text-xs shadow-md shadow-slate-900/10"
                  >
                    Salvar Registro Manual (+10 XP)
                  </button>
                </form>

                {/* Live Indicator of selected input status */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Classificação Atual:</span>
                    <span className={`font-extrabold ${getBpStatus(systolic, diastolic).color.split(' ')[0]}`}>
                      {getBpStatus(systolic, diastolic).label}
                    </span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-500 font-medium">
                    {systolic >= 140 || diastolic >= 90 
                      ? 'Nível elevado. Recomendado repousar, beber água fresca e evitar estresses. Se persistir ou houver dor, consulte seu cardiologista.' 
                      : systolic >= 120 || diastolic >= 80 
                        ? 'Ritmo em atenção. Reduza a ingestão de sal/sódio hoje e faça uma leve respiração profunda.' 
                        : 'Sua pressão está na faixa considerada ideal e saudável pela Organização Mundial da Saúde.'
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Stat Boxes */}
              {statsSummary && (
                <div className="grid grid-cols-3 gap-3 md:gap-4 text-center">
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 md:p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Sis Média</p>
                    <p className="text-xl md:text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 mt-0.5">{statsSummary.avgSys} <span className="text-xs font-normal text-slate-400">mmHg</span></p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 md:p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Dia Média</p>
                    <p className="text-xl md:text-2xl font-mono font-bold text-slate-700 dark:text-slate-200 mt-0.5">{statsSummary.avgDia} <span className="text-xs font-normal text-slate-400">mmHg</span></p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 md:p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Avg Pulso</p>
                    <p className="text-xl md:text-2xl font-mono font-bold text-rose-500 mt-0.5">{statsSummary.avgBpm} <span className="text-xs font-normal text-slate-400">BPM</span></p>
                  </div>
                </div>
              )}

              {/* Minimalist Chart */}
              {logs.length > 0 ? (
                <div className="p-4 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-rose-500" />
                      Curva de Evolução Cardiovascular
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Exibindo últimas 10 medições</span>
                  </div>
                  
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDia" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:hidden" />
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} className="hidden dark:block" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[40, 180]} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                            border: 'none', 
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Area name="Sistólica (SYS)" type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSys)" />
                        <Area name="Diastólica (DIA)" type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDia)" />
                        <Line name="Pulso (BPM)" type="monotone" dataKey="bpm" stroke="#10b981" strokeWidth={1.5} dot={{ r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                  <Activity className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-500">Nenhum histórico disponível para gráficos ainda.</p>
                  <p className="text-xs text-slate-400">Faça sua primeira medição automática ou manual acima!</p>
                </div>
              )}

              {/* History Log List */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ClipboardList className="w-4 h-4 text-slate-500" />
                  Linha do Tempo Cardio
                </h5>
                
                {logs.length > 0 ? (
                  <div className="max-h-72 overflow-y-auto space-y-2.5 pr-2.5 scrollbar-thin">
                    {logs.map((log) => {
                      const status = getBpStatus(log.systolic, log.diastolic);
                      return (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3.5 bg-slate-50/70 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {/* Color Tag dot */}
                            <span className={`w-3.5 h-3.5 rounded-full ${status.bgClass} flex items-center justify-center text-[8px] text-white font-extrabold shadow-sm shadow-black/10`}>
                              {log.systolic >= 140 ? '!' : '✓'}
                            </span>
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-mono text-base font-bold text-slate-800 dark:text-slate-100">
                                  {log.systolic}/{log.diastolic}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">mmHg</span>
                                <span className="text-xs font-semibold font-mono text-rose-500 ml-1">
                                  {log.bpm} BPM
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                                <span>{new Date(log.date).toLocaleString('pt-BR')}</span>
                                {log.notes && (
                                  <>
                                    <span>•</span>
                                    <span className="italic truncate max-w-[150px] md:max-w-xs">{log.notes}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Remover Log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Sem registros salvos.</p>
                )}
              </div>

            </motion.div>
          )}

          {activeTab === 'ai-analysis' && (
            <motion.div
              key="ai-analysis"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Trigger Button or Loading */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800/40 pb-5">
                <div>
                  <h4 className="font-serif text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    Laudo Preventivo Cardiologico da IA
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Malu analisa suas tendências, padrões e traz conselhos específicos de estilo de vida.</p>
                </div>
                <button
                  disabled={logs.length === 0 || isAnalyzing}
                  onClick={triggerAiAnalysis}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold px-5 py-3 rounded-xl text-xs transition-colors shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Cpu className="w-4 h-4" />
                      Analisar Tendências Clínicas
                    </>
                  )}
                </button>
              </div>

              {logs.length === 0 && (
                <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-500">Não há dados suficientes para análise artificial.</p>
                  <p className="text-xs text-slate-400">Por favor, registre pelo menos 1 medição para acionar a médica virtual.</p>
                </div>
              )}

              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <Heart className="w-16 h-16 text-rose-500 animate-[ping_1.5s_infinite] opacity-35" />
                    <Cpu className="w-8 h-8 text-emerald-500 absolute animate-pulse" />
                  </div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">A IA Malu está estudando o seu histórico...</p>
                </div>
              )}

              {/* Analysis Results */}
              {aiAnalysisResult && !isAnalyzing && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                  
                  {/* Status Indicator Banner */}
                  <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                    aiAnalysisResult.status === 'high_pressure' 
                      ? 'bg-red-500/10 border-red-500/20 text-red-950 dark:text-red-200'
                      : aiAnalysisResult.status === 'attention'
                        ? 'bg-amber-600/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-200'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                      aiAnalysisResult.status === 'high_pressure' 
                        ? 'text-red-500 animate-bounce' 
                        : aiAnalysisResult.status === 'attention' 
                          ? 'text-amber-600' 
                          : 'text-emerald-500'
                    }`} />
                    <div className="space-y-1">
                      <h6 className="font-extrabold text-sm uppercase tracking-wide">
                        Diagnóstco de Padrões: {
                          aiAnalysisResult.status === 'high_pressure' 
                            ? 'Frequência do Coração Elevada / Pressão Alta' 
                            : aiAnalysisResult.status === 'attention' 
                              ? 'Ritmo Cardiovascular Sob Flutuações (Atenção)' 
                              : 'Reserva e Rigidez Arterial Normais (Saudável)'
                        }
                      </h6>
                      <p className="text-xs leading-relaxed opacity-90">{aiAnalysisResult.insight}</p>
                    </div>
                  </div>

                  {/* Preventative Warning if present */}
                  {aiAnalysisResult.preventiveAlert && (
                    <div className="p-4 bg-orange-500/10 border border-orange-500/25 rounded-2xl flex items-start gap-3 text-orange-950 dark:text-orange-200 text-xs">
                      <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold uppercase tracking-wider">Aviso Preventivo de Cardiologia</span>
                        <p className="opacity-95 leading-relaxed">{aiAnalysisResult.preventiveAlert}</p>
                      </div>
                    </div>
                  )}

                  {/* Summary Box */}
                  <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-1.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black">Resumo Diário do Coração</span>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{aiAnalysisResult.dailySummary}</p>
                  </div>

                  {/* Suggestions Quadrant Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Water */}
                    <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-2">
                      <div className="flex items-center gap-2 text-sky-500">
                        <Droplet className="w-5 h-5 fill-sky-500/15" />
                        <span className="text-xs font-bold uppercase tracking-wide">Conselho de Hidratação</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{aiAnalysisResult.suggestions.hydration}</p>
                    </div>

                    {/* Nutrition */}
                    <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-500">
                        <Apple className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wide">Nutrição Recomendada</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{aiAnalysisResult.suggestions.nutrition}</p>
                    </div>

                    {/* Sodium */}
                    <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-2">
                      <div className="flex items-center gap-2 text-red-500">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wide">Redução de Sódio</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{aiAnalysisResult.suggestions.sodiumReduction}</p>
                    </div>

                    {/* Relaxation & Teas */}
                    <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-2">
                      <div className="flex items-center gap-2 text-amber-500">
                        <Wind className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wide">Relaxamento e Chás Camomila/Cidreira</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{aiAnalysisResult.suggestions.relaxation}</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-slate-400 italic">
                    Aviso: As sugestões da IA servem para orientação em estilo de vida saudável e não substituem prescrições de cardiologistas formados.
                  </p>

                </div>
              )}

            </motion.div>
          )}

          {activeTab === 'smartwatch' && (
            <motion.div
              key="smartwatch"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h4 className="font-serif text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Bluetooth className="w-5 h-5 text-sky-500" />
                  Integração Médica e Smartwatch (Futuro)
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500">NutriAI já está preparado para conectar em medidores digitais OMRON por Bluetooth e smartwatches Apple Watch, Samsung Galaxy Active ou Garmin.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Device block */}
                <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h6 className="text-sm font-bold text-slate-800 dark:text-slate-100">Apple Health / Google Fit</h6>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">Sincronização passiva do app Saúde do iOS ou Android, importando pulso e pressão arterial.</p>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleConnectBt('Core Health Integration')}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                        isBtConnected && connectedDevice === 'Core Health Integration'
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/10'
                      }`}
                    >
                      {isBtConnecting ? 'Sincronizando...' : isBtConnected && connectedDevice === 'Core Health Integration' ? 'Desconectar Canal' : 'Autorizar Sincronização'}
                    </button>
                  </div>
                </div>

                {/* 2. Device block (OMRON) */}
                <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-sky-500/10 rounded-xl text-sky-500">
                      <Bluetooth className="w-6 h-6" />
                    </div>
                    <div>
                      <h6 className="text-sm font-bold text-slate-800 dark:text-slate-100">Medidor Braço OMRON Bluetooth</h6>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">Conecte via BLE com aparelhos mecânicos padrão de braço para carregar sistólica e diastólica.</p>
                    </div>
                  </div>
                  <div>
                    <button
                      disabled={isBtConnecting}
                      onClick={() => handleConnectBt('OMRON HEM-7156T')}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                        isBtConnected && connectedDevice === 'OMRON HEM-7156T'
                          ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                          : 'bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/10'
                      }`}
                    >
                      {isBtConnecting ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Conectando BLE...
                        </span>
                      ) : isBtConnected && connectedDevice === 'OMRON HEM-7156T' ? (
                        'Desconectar OMRON'
                      ) : (
                        'Conectar via Bluetooth'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Technical Protocol Note */}
              <div className="p-4 bg-sky-500/5 rounded-2xl border border-sky-500/10 text-sky-900 dark:text-sky-400 text-xs flex items-start gap-3.5 leading-relaxed">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-sky-500" />
                <div className="space-y-1">
                  <span className="font-extrabold uppercase tracking-wide">Protocolo de Comunicação HL7 / FHIR</span>
                  <p className="opacity-90 font-medium">
                    A API clínica do NutriAI já está estruturada no padrão médico internacional **FHIR (Fast Healthcare Interoperability Resources)**. Isso possibilita que os registros de pressão arterial salvos sejam exportados diretamente para sistemas de clínicas integradas ou Prontuário Eletrônico de seu cardiologista parceiro no futuro.
                  </p>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}
