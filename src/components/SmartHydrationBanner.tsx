import React, { useState, useEffect } from 'react';
import { Droplet, Sparkles, X, Check, Bell, Flame, Sun, CloudRain, Sliders, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, HydrationLog } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { analyzeSmartHydration, HydrationAnalysis } from '../lib/smartHydrationEngine';

interface SmartHydrationBannerProps {
  profile: UserProfile | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
  onNavigateToHabits?: () => void;
}

export const SmartHydrationBanner: React.FC<SmartHydrationBannerProps> = ({
  profile,
  onUpdateProfile,
  onAwardPoints,
  onNavigateToHabits
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [smartAnalysis, setSmartAnalysis] = useState<HydrationAnalysis | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoal, setTempGoal] = useState<number>(() => profile?.waterGoal || 2500);

  useEffect(() => {
    analyzeSmartHydration(profile).then(res => {
      setSmartAnalysis(res);
    });
  }, [profile]);

  useEffect(() => {
    if (profile?.waterGoal) {
      setTempGoal(profile.waterGoal);
    }
  }, [profile?.waterGoal]);

  const today = new Date().toISOString().split('T')[0];
  const hydrationLogs = profile?.hydrationLogs || [];
  const todayHydration = hydrationLogs.filter(log => log.date.startsWith(today));
  const currentTotalWater = todayHydration.reduce((sum, log) => sum + log.amount, 0);
  
  const recommendedWater = smartAnalysis?.recommendedWaterTotal || (profile?.weight ? Math.round(profile.weight * 35) : 2500);
  const goalWater = profile?.waterGoal || recommendedWater;
  const progressPercent = Math.min(100, Math.round((currentTotalWater / Math.max(goalWater, 1)) * 100));
  const rawPercent = Math.round((currentTotalWater / Math.max(goalWater, 1)) * 100);
  const isGoalReached = currentTotalWater >= goalWater;
  const remainingMl = Math.max(0, goalWater - currentTotalWater);

  const latestLog = todayHydration.length > 0
    ? [...todayHydration].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const reminderEnabled = profile?.waterReminderEnabled ?? true;
  const intervalMinutes = smartAnalysis?.recommendedIntervalMinutes || profile?.waterReminderIntervalMinutes || 60;

  useEffect(() => {
    if (!reminderEnabled) return;
    const checkInterval = setInterval(() => {
      const currentHour = new Date().getHours();
      if (currentHour < 8 || currentHour >= 22) return;

      if (latestLog) {
        const diffMs = Date.now() - new Date(latestLog.date).getTime();
        const mins = Math.floor(diffMs / (1000 * 60));
        if (mins >= intervalMinutes && !dismissed) {
          setShowPrompt(true);
        }
      } else if (todayHydration.length === 0 && !dismissed) {
        if (currentHour >= 9) {
          setShowPrompt(true);
        }
      }
    }, 30000);

    return () => clearInterval(checkInterval);
  }, [latestLog, reminderEnabled, intervalMinutes, dismissed, todayHydration.length]);

  // Auto-dismiss after 8 seconds whenever the banner is shown, paused if modal is open
  useEffect(() => {
    const isVisible = showPrompt || (!dismissed && currentTotalWater < goalWater);
    if (!isVisible || showGoalModal) return;

    const autoDismissTimer = setTimeout(() => {
      setShowPrompt(false);
      setDismissed(true);
    }, 8000);

    return () => clearTimeout(autoDismissTimer);
  }, [showPrompt, dismissed, currentTotalWater, goalWater, showGoalModal]);

  const handleQuickLog = (amount: number) => {
    const newLog: HydrationLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      amount,
      source: 'Filtrada'
    };
    onUpdateProfile({ hydrationLogs: [...hydrationLogs, newLog] });
    playSfx('crystal');
    vibrate(60);
    if (onAwardPoints) onAwardPoints(10, `Hidratação rápida: +${amount}ml registrados!`);
    setShowPrompt(false);
    setDismissed(true);
    setTimeout(() => setDismissed(false), 45 * 60 * 1000);
  };

  const handleSaveGoal = () => {
    const validatedGoal = Math.max(500, Math.min(10000, Number(tempGoal) || 2500));
    onUpdateProfile({ waterGoal: validatedGoal });
    playSfx('crystal');
    vibrate(40);
    setShowGoalModal(false);
  };

  const isVisible = (showPrompt || (!dismissed && currentTotalWater < goalWater));
  if (!isVisible && !showGoalModal) return null;

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white px-4 py-3 shadow-lg relative z-40 flex flex-col gap-2.5 overflow-hidden"
          >
            {/* Top Row: Info and Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner animate-pulse">
                  <Droplet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sun className="w-3 h-3" /> Clima: {smartAnalysis?.temperature ?? 28}°C ({smartAnalysis?.climateCondition || 'quente'})
                    </span>
                    <span className="text-xs font-medium text-cyan-100">
                      Hoje: {currentTotalWater}ml / {goalWater}ml
                    </span>
                    {smartAnalysis?.hasWorkoutToday && (
                      <span className="text-xs font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Flame className="w-3 h-3" /> Treino Ativo ({smartAnalysis.workoutIntensity})
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                    {smartAnalysis?.pushMessage || "Hora de fazer uma pausa inteligente! Beba um copo d'água para manter sua energia."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleQuickLog(250)}
                  className="px-3 py-1.5 bg-white text-cyan-700 hover:bg-cyan-50 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> +250ml Copo
                </button>

                <button
                  onClick={() => handleQuickLog(500)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer hidden sm:inline-flex"
                >
                  +500ml Garrafa
                </button>

                {onNavigateToHabits && (
                  <button
                    onClick={onNavigateToHabits}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition cursor-pointer"
                  >
                    Abrir HabitTracker
                  </button>
                )}

                <button
                  onClick={() => { setShowPrompt(false); setDismissed(true); }}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                  title="Dispensar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Row: Visual Hydration Progress Bar & Goal Adjuster */}
            <div className="w-full pt-2 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white shrink-0">
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-black tracking-wide text-cyan-100 flex items-center gap-1">
                    <Droplet className="w-3 h-3 fill-cyan-200 text-cyan-200" />
                    {rawPercent}%
                  </span>
                  <span className="hidden sm:inline text-white/90 text-xs">Progresso Diário</span>
                </div>

                {/* Progress Bar Track */}
                <div 
                  className="flex-1 bg-black/25 rounded-full h-3 overflow-hidden p-0.5 border border-white/25 shadow-inner cursor-pointer"
                  onClick={() => { setShowGoalModal(true); playSfx('tap'); }}
                  title="Clique para ajustar meta diária de água"
                >
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-200 via-teal-100 to-white shadow-sm"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs shrink-0">
                <span className="font-semibold text-cyan-50 flex items-center gap-1.5">
                  <span>{currentTotalWater} / {goalWater} ml</span>
                  {isGoalReached ? (
                    <span className="text-emerald-950 font-extrabold bg-emerald-300 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-0.5 shadow-sm">
                      <CheckCircle2 className="w-3 h-3" /> Meta Atingida!
                    </span>
                  ) : (
                    <span className="text-cyan-100/90 text-[11px]">
                      (faltam {remainingMl}ml)
                    </span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => { setShowGoalModal(true); playSfx('tap'); }}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1 cursor-pointer"
                  title="Ajustar Meta Diária de Água"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Ajustar Meta</span>
                </button>
              </div>
            </div>

            {/* Countdown indicator bar at bottom */}
            {!showGoalModal && (
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 8, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 bg-white/70"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Meta Diária de Água */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-800 dark:text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-inner">
                  <Droplet className="w-5 h-5 fill-cyan-500 text-cyan-500" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Meta Diária de Ingestão de Água
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina sua ingestão ideal para manter o corpo hidratado.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Suggested by Weight */}
            {profile?.weight && (
              <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/60 dark:border-cyan-800/50 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-cyan-900 dark:text-cyan-200 block">
                    Recomendação OMS (35ml por kg)
                  </span>
                  <span className="text-cyan-700 dark:text-cyan-300">
                    Para seu peso ({profile.weight} kg): ~{Math.round(profile.weight * 35)} ml/dia
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTempGoal(Math.round(profile.weight! * 35));
                    playSfx('tap');
                  }}
                  className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-[11px] shrink-0 transition shadow-sm cursor-pointer"
                >
                  Aplicar
                </button>
              </div>
            )}

            {/* Number Input with Increment / Decrement */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Meta em Mililitros (ml)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTempGoal(prev => Math.max(500, prev - 100))}
                  className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-extrabold text-base flex items-center justify-center transition cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  step="50"
                  min="500"
                  max="10000"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(Number(e.target.value))}
                  className="flex-1 p-3 text-center text-lg font-black tracking-wider rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
                <button
                  type="button"
                  onClick={() => setTempGoal(prev => Math.min(10000, prev + 100))}
                  className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-extrabold text-base flex items-center justify-center transition cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Quick Preset Chips */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Metas pré-definidas
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1800, 2000, 2500, 3000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => { setTempGoal(preset); playSfx('tap'); }}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      tempGoal === preset
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {preset} ml
                  </button>
                ))}
              </div>
            </div>

            {/* Current Progress Preview */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                Ingerido hoje: <strong className="text-slate-800 dark:text-slate-200">{currentTotalWater} ml</strong>
              </span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">
                Novo progresso: {Math.round((currentTotalWater / Math.max(tempGoal, 1)) * 100)}%
              </span>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveGoal}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
