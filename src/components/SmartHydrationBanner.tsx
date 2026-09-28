import React, { useState, useEffect } from 'react';
import { Droplet, Sparkles, X, Check, Bell } from 'lucide-react';
import { UserProfile, HydrationLog } from '../types';
import { playSfx, vibrate } from '../lib/sensory';

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

  const today = new Date().toISOString().split('T')[0];
  const hydrationLogs = profile?.hydrationLogs || [];
  const todayHydration = hydrationLogs.filter(log => log.date.startsWith(today));
  const currentTotalWater = todayHydration.reduce((sum, log) => sum + log.amount, 0);
  const recommendedWater = profile?.weight ? Math.round(profile.weight * 35) : 2500;
  const goalWater = profile?.waterGoal || recommendedWater;

  const latestLog = todayHydration.length > 0
    ? [...todayHydration].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const reminderEnabled = profile?.waterReminderEnabled ?? true;
  const intervalMinutes = profile?.waterReminderIntervalMinutes ?? 60;

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

  if (!showPrompt && currentTotalWater >= goalWater) return null;
  if (dismissed && !showPrompt) return null;

  return (
    <div className="bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white px-4 py-3 shadow-lg relative z-40 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner animate-pulse">
          <Droplet className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              💧 Pausa para Hidratação
            </span>
            <span className="text-xs font-medium text-cyan-100">
              Hoje: {currentTotalWater}ml / {goalWater}ml
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
            Hora de fazer uma pausa inteligente! Beba um copo d'água para manter sua energia e metabolismo ativos.
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
  );
};
