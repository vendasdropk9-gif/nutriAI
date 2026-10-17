import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Dumbbell, 
  CheckCircle2, 
  Flame, 
  Zap, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  RefreshCw,
  Trophy,
  Coffee,
  Heart
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { UserProfile } from '../types';

interface WorkoutCalendarProps {
  profile: UserProfile | null;
  onUpdateProfile?: (profile: UserProfile) => void;
}

interface DayStatus {
  dateKey: string; // YYYY-MM-DD
  status: 'training' | 'rest' | 'none';
  completedWorkoutsCount: number;
}

/**
 * WorkoutCalendarComponent
 * Professional calendar visualization that highlights historical training and rest days,
 * allowing users to toggle any day between 'training' and 'rest' mode for advanced progress tracking.
 */
export function WorkoutCalendarComponent({ profile, onUpdateProfile }: WorkoutCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Load custom user training/rest day overrides from localStorage or profile
  const [dayOverrides, setDayOverrides] = useState<Record<string, 'training' | 'rest'>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nutriai_calendar_overrides');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  // Extract completed workout dates from profile workoutLogs
  const completedWorkoutDates = useMemo(() => {
    const map = new Map<string, number>();
    const logs = profile?.workoutLogs || [];
    logs.forEach(log => {
      try {
        const dateKey = new Date(log.date).toISOString().split('T')[0];
        map.set(dateKey, (map.get(dateKey) || 0) + 1);
      } catch (e) {}
    });
    return map;
  }, [profile?.workoutLogs]);

  // Current month & year calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Generate calendar grid days for current month view
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { dayNumber: number; isCurrentMonth: boolean; dateKey: string; fullDate: Date }[] = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateKey = prevDate.toISOString().split('T')[0];
      days.push({ dayNumber: dayNum, isCurrentMonth: false, dateKey, fullDate: prevDate });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const currDate = new Date(year, month, i);
      const dateKey = currDate.toISOString().split('T')[0];
      days.push({ dayNumber: i, isCurrentMonth: true, dateKey, fullDate: currDate });
    }

    // Next month padding days to complete 35 or 42 grid slots
    const remainingSlots = days.length <= 35 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateKey = nextDate.toISOString().split('T')[0];
      days.push({ dayNumber: i, isCurrentMonth: false, dateKey, fullDate: nextDate });
    }

    return days;
  }, [year, month]);

  const handlePrevMonth = () => {
    playSfx('tap');
    vibrate(10);
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    playSfx('tap');
    vibrate(10);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const todayKey = new Date().toISOString().split('T')[0];

  const handleToggleDayStatus = (dateKey: string, currentStatus: 'training' | 'rest' | 'none') => {
    playSfx('success');
    vibrate(20);

    let nextStatus: 'training' | 'rest' = 'training';
    if (currentStatus === 'training') {
      nextStatus = 'rest';
    } else if (currentStatus === 'rest') {
      // Remove override if going back to none
      const updated = { ...dayOverrides };
      delete updated[dateKey];
      setDayOverrides(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('nutriai_calendar_overrides', JSON.stringify(updated));
      }
      return;
    }

    const updated = { ...dayOverrides, [dateKey]: nextStatus };
    setDayOverrides(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nutriai_calendar_overrides', JSON.stringify(updated));
    }
  };

  // Monthly stats summary
  const monthlyStats = useMemo(() => {
    let trainingDays = 0;
    let restDays = 0;
    calendarGrid.forEach(cell => {
      if (!cell.isCurrentMonth) return;
      const completed = completedWorkoutDates.get(cell.dateKey) || 0;
      const override = dayOverrides[cell.dateKey];
      const isTraining = override === 'training' || completed > 0;
      const isRest = override === 'rest';

      if (isTraining) trainingDays++;
      else if (isRest) restDays++;
    });
    return { trainingDays, restDays };
  }, [calendarGrid, completedWorkoutDates, dayOverrides]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
      {/* Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-serif font-black text-slate-900 dark:text-white capitalize">
              {monthNames[month]} de {year}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Histórico de Treinos e Dias de Repouso
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border-none"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border-none"
          >
            Hoje
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border-none"
            title="Próximo Mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
              {monthlyStats.trainingDays}
            </div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Dias de Treino este Mês
            </div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-100">
              {monthlyStats.restDays}
            </div>
            <div className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              Dias de Repouso
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid Header (Weekdays) */}
      <div className="grid grid-cols-7 gap-2 text-center">
        {weekDays.map((wd, idx) => (
          <div key={idx} className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar Grid Days */}
      <div className="grid grid-cols-7 gap-2">
        {calendarGrid.map((cell, idx) => {
          const completedCount = completedWorkoutDates.get(cell.dateKey) || 0;
          const override = dayOverrides[cell.dateKey];
          const isToday = cell.dateKey === todayKey;

          // Determine status: override takes precedence or history workout count
          let status: 'training' | 'rest' | 'none' = 'none';
          if (override === 'training' || completedCount > 0) {
            status = 'training';
          } else if (override === 'rest') {
            status = 'rest';
          }

          return (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleToggleDayStatus(cell.dateKey, status)}
              className={`min-h-[76px] sm:min-h-[88px] rounded-2xl p-2 sm:p-3 flex flex-col justify-between border cursor-pointer transition-all relative overflow-hidden ${
                !cell.isCurrentMonth
                  ? 'opacity-30 bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/50'
                  : status === 'training'
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                  : status === 'rest'
                  ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
              } ${isToday ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-xs sm:text-sm font-black ${
                  isToday 
                    ? 'bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md' 
                    : cell.isCurrentMonth ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'
                }`}>
                  {cell.dayNumber}
                </span>

                {status === 'training' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Treino Registrado" />
                )}
                {status === 'rest' && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" title="Dia de Repouso" />
                )}
              </div>

              <div className="flex flex-col items-center justify-center my-auto">
                {status === 'training' && (
                  <div className="flex flex-col items-center text-emerald-600 dark:text-emerald-400">
                    <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Treino</span>
                  </div>
                )}
                {status === 'rest' && (
                  <div className="flex flex-col items-center text-amber-600 dark:text-amber-400">
                    <Coffee className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Repouso</span>
                  </div>
                )}
                {status === 'none' && cell.isCurrentMonth && (
                  <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 opacity-0 hover:opacity-150 transition-opacity">
                    Toque p/ alternar
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend & Instructions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="font-semibold">Dia de Treino</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="font-semibold">Dia de Repouso</span>
          </div>
        </div>
        <p className="italic text-[11px]">
          💡 Dica: Clique em qualquer dia para alternar entre Treino, Repouso ou Neutro.
        </p>
      </div>
    </div>
  );
}
export default WorkoutCalendarComponent;
