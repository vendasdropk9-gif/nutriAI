import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Smile, Frown, Meh, Sparkles, Dumbbell, Utensils, 
  Activity, CheckCircle2, HeartPulse, Battery, BatteryCharging,
  Plus, X, RefreshCw, AlertCircle, Clock
} from 'lucide-react';
import { UserProfile, EmotionalLog } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { playSfx, vibrate } from '../lib/sensory';
import { speak } from '../lib/speech';
import avatarGlobalStore from '../lib/avatarGlobalState';

interface DailyEnergyLevelCardProps {
  profile: UserProfile | null;
  onUpdateProfile?: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
  onNavigate?: (tabId: string) => void;
}

export function DailyEnergyLevelCard({ profile, onUpdateProfile, onNavigate }: DailyEnergyLevelCardProps) {
  const { language, t } = useLanguage();
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInType, setCheckInType] = useState<'pos-treino' | 'pos-refeicao' | 'geral'>('geral');
  const [selectedMood, setSelectedMood] = useState<string>('energizado');
  const [noteText, setNoteText] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's emotional logs
  const todayEmotionalLogs = useMemo(() => {
    const logs = profile?.emotionalLogs || [];
    return logs.filter(l => l.date?.startsWith(todayStr));
  }, [profile?.emotionalLogs, todayStr]);

  // Today's body monitor / fatigue logs if present
  const todayBodyLogs = useMemo(() => {
    const logs = profile?.bodyMonitorLogs || [];
    return logs.filter(l => l.date?.startsWith(todayStr));
  }, [profile?.bodyMonitorLogs, todayStr]);

  // Calculate Daily Energy Score (0 to 100) and Level (Alta ⚡, Moderada 🟡, Baixa 🌙)
  const energyMetrics = useMemo(() => {
    let score = 75; // Default healthy baseline score

    if (todayEmotionalLogs.length > 0) {
      let logScoreSum = 0;
      todayEmotionalLogs.forEach(log => {
        const moodLower = (log.mood || '').toLowerCase();
        if (moodLower.includes('feliz') || moodLower.includes('energizado') || moodLower.includes('excelente') || moodLower.includes('ótimo')) {
          logScoreSum += 95;
        } else if (moodLower.includes('neutro') || moodLower.includes('satisfeito') || moodLower.includes('moderado')) {
          logScoreSum += 70;
        } else if (moodLower.includes('cansado') || moodLower.includes('estressado') || moodLower.includes('ansioso') || moodLower.includes('triste')) {
          logScoreSum += 40;
        } else {
          logScoreSum += 65;
        }
      });
      score = Math.round(logScoreSum / todayEmotionalLogs.length);
    }

    // Factor in fatigue level if captured in BodyMonitor
    if (todayBodyLogs.length > 0) {
      const lastBody = todayBodyLogs[todayBodyLogs.length - 1];
      if (lastBody.fatigueLevel !== undefined) {
        const bodyEnergy = Math.max(10, 100 - lastBody.fatigueLevel);
        score = Math.round((score * 0.6) + (bodyEnergy * 0.4));
      }
    }

    let levelLabel = t('energy_level_high', 'Alta ⚡');
    let colorClass = 'from-emerald-500 to-teal-500';
    let textClass = 'text-emerald-400';
    let borderClass = 'border-emerald-500/40';
    let bgBadge = 'bg-emerald-500/20 text-emerald-300';
    let icon = <Zap className="w-5 h-5 text-emerald-400 animate-pulse" />;
    let desc = t('energy_high_desc', 'Seu nível de energia está elevado! Excelente momento para treinos intensos ou manter o foco total.');

    if (score < 50) {
      levelLabel = t('energy_level_low', 'Baixa 🌙');
      colorClass = 'from-indigo-500 to-purple-600';
      textClass = 'text-indigo-400';
      borderClass = 'border-indigo-500/40';
      bgBadge = 'bg-indigo-500/20 text-indigo-300';
      icon = <Battery className="w-5 h-5 text-indigo-400" />;
      desc = t('energy_low_desc', 'Energia em taxa de recuperação. Priorize hidratação, refeições leves e repouso reparador.');
    } else if (score < 75) {
      levelLabel = t('energy_level_moderate', 'Moderada 🟡');
      colorClass = 'from-amber-500 to-orange-500';
      textClass = 'text-amber-400';
      borderClass = 'border-amber-500/40';
      bgBadge = 'bg-amber-500/20 text-amber-300';
      icon = <BatteryCharging className="w-5 h-5 text-amber-400" />;
      desc = t('energy_mod_desc', 'Energia estável e equilibrada. Bom ritmo para atividades diárias e nutrição consistente.');
    }

    return { score, levelLabel, colorClass, textClass, borderClass, bgBadge, icon, desc };
  }, [todayEmotionalLogs, todayBodyLogs, t]);

  // Mood options for manual logging
  const moodOptions = [
    { key: 'energizado', label: 'Energizado ⚡', icon: '⚡', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    { key: 'excelente', label: 'Excelente 🔥', icon: '🔥', color: 'bg-teal-500/20 text-teal-400 border-teal-500/40' },
    { key: 'satisfeito', label: 'Satisfeito 🥗', icon: '🥗', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
    { key: 'cansado', label: 'Cansado 🥱', icon: '🥱', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    { key: 'estressado', label: 'Estressado 🌀', icon: '🌀', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
  ];

  const handleOpenCheckIn = (type: 'pos-treino' | 'pos-refeicao' | 'geral') => {
    setCheckInType(type);
    setSelectedMood('energizado');
    setNoteText('');
    setIsCheckInOpen(true);
    playSfx('tap');
    vibrate(15);
  };

  const handleSaveCheckIn = () => {
    if (!onUpdateProfile) return;

    playSfx('success');
    vibrate([30, 50, 30]);

    const labelContext = checkInType === 'pos-treino' ? 'Pós-Treino' : checkInType === 'pos-refeicao' ? 'Pós-Refeição' : 'Registro Manual';
    const newLog: EmotionalLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mood: selectedMood,
      trigger: `${labelContext}${noteText ? `: ${noteText}` : ''}`,
      mealType: checkInType,
    };

    onUpdateProfile(prev => {
      if (!prev) return prev;
      const updatedLogs = [...(prev.emotionalLogs || []), newLog];
      
      // Sync to localStorage
      try {
        localStorage.setItem('nutriai_emotional_logs', JSON.stringify(updatedLogs));
        localStorage.setItem('nutri-emotional-logs', JSON.stringify(updatedLogs));
      } catch (e) {
        console.warn('Failed to sync emotional logs to localStorage:', e);
      }

      return {
        ...prev,
        emotionalLogs: updatedLogs
      };
    });

    // Trigger Avatar Micro-expression reaction!
    avatarGlobalStore.triggerGamificationReaction('goal_completed');
    avatarGlobalStore.triggerMicroExpression('smile', 4000);

    // Speak confirmation with Malu (Aoede) voice
    const feedbackText = language?.startsWith('pt')
      ? `Registro de energia ${labelContext} concluído com sucesso! Que ótimo acompanhar sua evolução.`
      : `${labelContext} energy check-in saved successfully!`;

    speak(feedbackText, { voice: 'Aoede', lang: language });

    setIsCheckInOpen(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3500);
  };

  return (
    <div className="w-full card-premium p-6 sm:p-7 rounded-[32px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xl relative overflow-hidden space-y-6">
      
      {/* Background Subtle Gradient */}
      <div className={`absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-gradient-to-br ${energyMetrics.colorClass} opacity-10 blur-3xl pointer-events-none`} />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <BatteryCharging className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
              <Sparkles className="w-3 h-3" />
              <span>{t('emotional_energy_tracker', 'EmotionalTracker • Ritmo Vital')}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              ⚡ {t('daily_energy_level_title', 'Nível de Energia Diário')}
            </h3>
          </div>
        </div>

        {/* Current Energy Level Badge */}
        <div className={`px-4 py-2 rounded-2xl border ${energyMetrics.borderClass} ${energyMetrics.bgBadge} flex items-center gap-2 shadow-md backdrop-blur-md`}>
          {energyMetrics.icon}
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest block opacity-80">
              {t('current_status', 'Status Atual')}
            </span>
            <span className="text-sm font-black tracking-tight">
              {energyMetrics.levelLabel} ({energyMetrics.score}%)
            </span>
          </div>
        </div>
      </div>

      {/* Main Energy Gauge & Guidance Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center relative z-10">
        
        {/* Gauge Card */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center text-center space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t('daily_energy_gauge', 'Índice de Vitalidade')}
          </span>
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200 dark:text-slate-700"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={energyMetrics.textClass}
                strokeDasharray={`${energyMetrics.score}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {energyMetrics.score}%
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {todayEmotionalLogs.length} {todayEmotionalLogs.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
          </div>
        </div>

        {/* Guidance Text */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-3 flex flex-col justify-between h-full">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
              <HeartPulse className="w-4 h-4 text-emerald-400" />
              <span>{t('energy_insight_heading', 'Recomendação do Coach de Energia')}</span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              "{energyMetrics.desc}"
            </p>
          </div>

          {/* Quick Check-In CTA Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/40 dark:border-slate-700/40">
            <span className="text-xs font-bold text-slate-400 mr-1">
              {t('register_feeling_now', 'Como se sente agora?')}:
            </span>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleOpenCheckIn('pos-treino')}
              className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Pós-Treino</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleOpenCheckIn('pos-refeicao')}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Pós-Refeição</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleOpenCheckIn('geral')}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Geral</span>
            </motion.button>
          </div>
        </div>

      </div>

      {/* Today's Logged Energy Timeline */}
      {todayEmotionalLogs.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {t('today_energy_checkins', 'Registros de Energia de Hoje')}
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold">
              Avatar 3D reage em tempo real 🌟
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {todayEmotionalLogs.slice().reverse().map((log) => (
              <div 
                key={log.id} 
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-sm"
              >
                <span className="font-bold capitalize text-emerald-500">{log.mood}</span>
                {log.trigger && (
                  <span className="text-[11px] text-slate-400 truncate max-w-[160px]">
                    ({log.trigger})
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(log.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast Banner */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-emerald-500/30"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Nível de energia registrado com sucesso! O avatar de perfil recebeu sua reação!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Check-In Modal */}
      <AnimatePresence>
        {isCheckInOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-[#131920] rounded-[32px] border border-emerald-500/40 shadow-2xl p-6 space-y-6 text-white"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsCheckInOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase">
                  {checkInType === 'pos-treino' ? <Dumbbell className="w-3.5 h-3.5" /> : checkInType === 'pos-refeicao' ? <Utensils className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                  <span>{checkInType === 'pos-treino' ? 'Registro Pós-Treino' : checkInType === 'pos-refeicao' ? 'Registro Pós-Refeição' : 'Registro de Vitalidade'}</span>
                </div>
                <h3 className="text-2xl font-black tracking-tight text-white">
                  Como está seu nível de energia?
                </h3>
                <p className="text-xs text-slate-300">
                  Selecione seu estado atual para atualizar seu perfil e disparar micro-expressões no seu Avatar 3D.
                </p>
              </div>

              {/* Mood Choices */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {moodOptions.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setSelectedMood(opt.key);
                      playSfx('tap');
                      vibrate(10);
                    }}
                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      selectedMood === opt.key 
                        ? 'bg-emerald-500 text-white border-emerald-400 font-extrabold shadow-lg shadow-emerald-500/30 scale-105' 
                        : `${opt.color} hover:bg-slate-800/80`
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="text-xs font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Additional Note */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Observação ou Nota (Opcional):
                </label>
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Ex: Treino de pernas puxado, refeição proteica leve..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCheckInOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCheckIn}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/30 transition cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Registro de Energia</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
