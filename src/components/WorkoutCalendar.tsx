/* eslint-disable i18next/no-literal-string */
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
  Clock,
  Bell,
  BellOff,
  GripVertical,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  Coffee,
  Check,
  MoveHorizontal,
  Info,
  CalendarDays,
  Target
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { speak } from '../lib/speech';
import { UserProfile, WeeklyWorkoutPlan, WeeklyWorkoutDay } from '../types';
import { DEFAULT_WEEKLY_PLAN } from './PersonalTrainer';
import { safeGet, safeSet } from '../lib/storage';

interface WorkoutCalendarProps {
  profile: UserProfile | null;
  onUpdateProfile?: (profile: UserProfile) => void;
  onStartWorkoutDay?: (day: WeeklyWorkoutDay) => void;
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_LABELS: Record<string, { short: string; full: string }> = {
  monday: { short: 'Seg', full: 'Segunda-feira' },
  tuesday: { short: 'Ter', full: 'Terça-feira' },
  wednesday: { short: 'Qua', full: 'Quarta-feira' },
  thursday: { short: 'Qui', full: 'Quinta-feira' },
  friday: { short: 'Sex', full: 'Sexta-feira' },
  saturday: { short: 'Sáb', full: 'Sábado' },
  sunday: { short: 'Dom', full: 'Domingo' },
};

const COMMON_WORKOUT_TIMES = ['06:30', '07:00', '08:00', '12:00', '17:30', '18:00', '19:00', '20:00'];

export function WorkoutCalendarComponent({ profile, onUpdateProfile, onStartWorkoutDay }: WorkoutCalendarProps) {
  const [calendarViewMode, setCalendarViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [draggedDayKey, setDraggedDayKey] = useState<string | null>(null);
  const [dragOverDayKey, setDragOverDayKey] = useState<string | null>(null);
  const [rescheduleModalDay, setRescheduleModalDay] = useState<WeeklyWorkoutDay | null>(null);
  const [editingReminderDayKey, setEditingReminderDayKey] = useState<string | null>(null);

  // Active weekly workout plan
  const activePlan: WeeklyWorkoutPlan = useMemo(() => {
    return profile?.weeklyWorkoutPlan || DEFAULT_WEEKLY_PLAN;
  }, [profile?.weeklyWorkoutPlan]);

  // Workout Reminders from profile
  const workoutRemindersEnabled = profile?.workoutRemindersEnabled !== false && safeGet('nutri-workout-reminders') !== 'false';
  const reminderTimes = profile?.workoutReminderTimes || {};

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

  // Today key
  const todayDate = new Date();
  const todayDateStr = todayDate.toISOString().split('T')[0];
  const todayDayKey = useMemo(() => {
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayKeys[todayDate.getDay()];
  }, [todayDate]);

  // Current month & year calculations for monthly view
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Drag and Drop Handler: Swaps/Moves a workout to a new day
  const handleSwapWorkouts = (sourceKey: string, targetKey: string) => {
    if (sourceKey === targetKey) return;

    playSfx('success');
    vibrate([25, 45]);

    const sourceDay = activePlan.days.find(d => d.dayKey === sourceKey);
    const targetDay = activePlan.days.find(d => d.dayKey === targetKey);

    if (!sourceDay || !targetDay) return;

    // Swap workout contents between source and target days while keeping day names and keys intact
    const updatedDays = activePlan.days.map(d => {
      if (d.dayKey === targetKey) {
        return {
          ...d,
          workoutTitle: sourceDay.workoutTitle,
          workoutFocus: sourceDay.workoutFocus,
          targetMuscles: sourceDay.targetMuscles,
          intensity: sourceDay.intensity,
          nutritionContext: sourceDay.nutritionContext,
          exercises: sourceDay.exercises
        };
      }
      if (d.dayKey === sourceKey) {
        return {
          ...d,
          workoutTitle: targetDay.workoutTitle,
          workoutFocus: targetDay.workoutFocus,
          targetMuscles: targetDay.targetMuscles,
          intensity: targetDay.intensity,
          nutritionContext: targetDay.nutritionContext,
          exercises: targetDay.exercises
        };
      }
      return d;
    });

    // Also update reminder times to follow the workout if desired
    const sourceTime = reminderTimes[sourceKey] || '18:00';
    const targetTime = reminderTimes[targetKey] || '18:00';
    const updatedReminderTimes = {
      ...reminderTimes,
      [targetKey]: sourceTime,
      [sourceKey]: targetTime
    };

    const updatedPlan: WeeklyWorkoutPlan = {
      ...activePlan,
      days: updatedDays
    };

    if (onUpdateProfile && profile) {
      onUpdateProfile({
        ...profile,
        weeklyWorkoutPlan: updatedPlan,
        workoutReminderTimes: updatedReminderTimes
      });
    }

    // Malu voice confirmation using mandatory Aoede voice profile
    speak(
      `Treino de ${sourceDay.workoutTitle} reagendado para ${DAY_LABELS[targetKey]?.full || targetKey}! Seu lembrete foi atualizado.`,
      { voice: 'Aoede', lang: 'pt-BR' }
    );
  };

  // Toggle global workout reminders
  const handleToggleGlobalReminders = () => {
    playSfx('tap');
    vibrate(15);
    const next = !workoutRemindersEnabled;
    safeSet('nutri-workout-reminders', String(next));
    if (onUpdateProfile && profile) {
      onUpdateProfile({
        ...profile,
        workoutRemindersEnabled: next
      });
    }
  };

  // Update specific day reminder time
  const handleSetDayReminderTime = (dayKey: string, newTime: string) => {
    playSfx('crystal');
    vibrate(15);
    const updated = {
      ...reminderTimes,
      [dayKey]: newTime
    };
    safeSet(`nutri-workout-time-${dayKey}`, newTime);
    if (onUpdateProfile && profile) {
      onUpdateProfile({
        ...profile,
        workoutReminderTimes: updated
      });
    }
    setEditingReminderDayKey(null);
  };

  // Test speaking workout reminder
  const handleTestReminderSpeech = (day: WeeklyWorkoutDay, time: string) => {
    playSfx('tap');
    vibrate(20);
    speak(
      `Hora do seu treino de ${day.workoutTitle}! ${day.workoutFocus}. Vamos começar agora?`,
      { voice: 'Aoede', lang: 'pt-BR' }
    );
  };

  // Reset to default weekly plan
  const handleResetWeeklyPlan = () => {
    playSfx('tap');
    vibrate(25);
    if (onUpdateProfile && profile) {
      onUpdateProfile({
        ...profile,
        weeklyWorkoutPlan: DEFAULT_WEEKLY_PLAN
      });
    }
    speak("Plano semanal restaurado para a programação padrão recomendada.", { voice: 'Aoede', lang: 'pt-BR' });
  };

  // Generate calendar grid for monthly view
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{
      dayNumber: number;
      isCurrentMonth: boolean;
      dateKey: string;
      fullDate: Date;
      dayKey: string;
    }> = [];

    const dayKeysList = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateKey = prevDate.toISOString().split('T')[0];
      days.push({ dayNumber: dayNum, isCurrentMonth: false, dateKey, fullDate: prevDate, dayKey: dayKeysList[prevDate.getDay()] });
    }

    // Current month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const currDate = new Date(year, month, i);
      const dateKey = currDate.toISOString().split('T')[0];
      days.push({ dayNumber: i, isCurrentMonth: true, dateKey, fullDate: currDate, dayKey: dayKeysList[currDate.getDay()] });
    }

    // Next month padding
    const remainingSlots = days.length <= 35 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateKey = nextDate.toISOString().split('T')[0];
      days.push({ dayNumber: i, isCurrentMonth: false, dateKey, fullDate: nextDate, dayKey: dayKeysList[nextDate.getDay()] });
    }

    return days;
  }, [year, month]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Calendar Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <CalendarIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Interativo • Arraste e Solte</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                Calendário de Treinos
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Arraste e solte os treinos entre os dias da semana para reorganizar sua rotina e sincronizar os horários de notificação.
              </p>
            </div>
          </div>

          {/* View Mode Switcher & Reset */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                onClick={() => {
                  setCalendarViewMode('weekly');
                  playSfx('tap');
                  vibrate(5);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-none outline-none cursor-pointer flex items-center gap-1.5 ${
                  calendarViewMode === 'weekly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MoveHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                <span>Semana (Arrastar)</span>
              </button>
              <button
                onClick={() => {
                  setCalendarViewMode('monthly');
                  playSfx('tap');
                  vibrate(5);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-none outline-none cursor-pointer flex items-center gap-1.5 ${
                  calendarViewMode === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
                <span>Mês Completo</span>
              </button>
            </div>

            <button
              onClick={handleResetWeeklyPlan}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              title="Restaurar programação padrão"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workout Reminders Status Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-emerald-500/10 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${workoutRemindersEnabled ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
              {workoutRemindersEnabled ? <Bell className="w-5 h-5 animate-bounce" /> : <BellOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Lembretes de Treino Conectados
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  workoutRemindersEnabled
                    ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}>
                  {workoutRemindersEnabled ? 'Ativados no Sistema' : 'Desativados'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Os horários agendados nos cards abaixo disparam notificações e áudio com a voz da Malu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleGlobalReminders}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                workoutRemindersEnabled
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              {workoutRemindersEnabled ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Lembretes Ativos</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Ativar Lembretes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* VIEW 1: WEEKLY VIEW WITH DRAG & DROP CARDS */}
        {calendarViewMode === 'weekly' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span className="font-semibold flex items-center gap-1.5">
                <GripVertical className="w-4 h-4 text-emerald-500" />
                Segure e arraste qualquer treino para outro dia para reagendar:
              </span>
              <span className="hidden sm:inline">
                Sincronizado com os horários de notificação
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3.5">
              {DAY_ORDER.map((dayKey) => {
                const day = activePlan.days.find(d => d.dayKey === dayKey);
                const isToday = dayKey === todayDayKey;
                const isDragSource = draggedDayKey === dayKey;
                const isDragOver = dragOverDayKey === dayKey;
                const dayReminderTime = reminderTimes[dayKey] || '18:00';
                const isCompletedToday = isToday && completedWorkoutDates.get(todayDateStr);

                return (
                  <div
                    key={dayKey}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverDayKey !== dayKey) {
                        setDragOverDayKey(dayKey);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverDayKey === dayKey) {
                        setDragOverDayKey(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceKey = e.dataTransfer.getData('text/plain') || draggedDayKey;
                      if (sourceKey && sourceKey !== dayKey) {
                        handleSwapWorkouts(sourceKey, dayKey);
                      }
                      setDraggedDayKey(null);
                      setDragOverDayKey(null);
                    }}
                    className={`rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 border min-h-[310px] ${
                      isDragOver
                        ? 'bg-emerald-500/20 border-2 border-dashed border-emerald-500 scale-[1.02] shadow-xl'
                        : isToday
                        ? 'bg-gradient-to-b from-emerald-500/10 via-white to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-emerald-500/60 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800'
                    }`}
                  >
                    {/* Day Column Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                      <div>
                        <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {DAY_LABELS[dayKey]?.short}
                        </div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {DAY_LABELS[dayKey]?.full.split('-')[0]}
                        </div>
                      </div>

                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase">
                          Hoje
                        </span>
                      )}
                    </div>

                    {/* Draggable Workout Card */}
                    {day ? (
                      <div
                        draggable
                        onDragStart={(e) => {
                          setDraggedDayKey(dayKey);
                          e.dataTransfer.setData('text/plain', dayKey);
                          e.dataTransfer.effectAllowed = 'move';
                          playSfx('tap');
                          vibrate(10);
                        }}
                        onDragEnd={() => {
                          setDraggedDayKey(null);
                          setDragOverDayKey(null);
                        }}
                        className={`my-2 p-3 rounded-xl bg-white dark:bg-slate-800 border transition-all cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md flex flex-col justify-between space-y-3 relative overflow-hidden group ${
                          isDragSource
                            ? 'opacity-40 border-dashed border-emerald-500'
                            : 'border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500/50'
                        }`}
                      >
                        {/* Drag Handle Top Bar */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-500 transition-colors">
                            <GripVertical className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-semibold">Arrastar</span>
                          </div>

                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {day.intensity}
                          </span>
                        </div>

                        {/* Title & Muscle Focus */}
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                            {day.workoutTitle}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {day.workoutFocus}
                          </p>
                        </div>

                        {/* Muscle groups tag pills */}
                        <div className="flex flex-wrap gap-1">
                          {day.targetMuscles.slice(0, 2).map((m, i) => (
                            <span key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                              {m}
                            </span>
                          ))}
                          {day.exercises?.length > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                              {day.exercises.length} ex
                            </span>
                          )}
                        </div>

                        {/* Reminder Time Tag & Editor */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingReminderDayKey(editingReminderDayKey === dayKey ? null : dayKey);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-bold transition cursor-pointer"
                              title="Alterar horário do lembrete"
                            >
                              <Clock className="w-3 h-3 text-purple-500" />
                              <span>{dayReminderTime}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTestReminderSpeech(day, dayReminderTime);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-purple-500 transition cursor-pointer"
                              title="Ouvir lembrete da Malu"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quick Reminder Time Selector Dropdown */}
                          {editingReminderDayKey === dayKey && (
                            <div className="mt-2 p-2 bg-slate-900 text-white rounded-xl shadow-xl space-y-1.5 z-20">
                              <span className="text-[10px] text-slate-400 block font-bold">Definir Horário:</span>
                              <div className="grid grid-cols-2 gap-1">
                                {COMMON_WORKOUT_TIMES.map((time) => (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => handleSetDayReminderTime(dayKey, time)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                                      dayReminderTime === time ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                  >
                                    {time}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Mobile quick reschedule button */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setRescheduleModalDay(day)}
                            className="w-full py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <MoveHorizontal className="w-3 h-3 text-emerald-500" />
                            <span>Mover</span>
                          </button>

                          {onStartWorkoutDay && (
                            <button
                              type="button"
                              onClick={() => {
                                playSfx('tap');
                                onStartWorkoutDay(day);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition flex items-center justify-center cursor-pointer shadow-sm"
                              title="Iniciar este treino"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="my-auto py-6 text-center text-slate-400">
                        <Coffee className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        <span className="text-xs">Dia Livre</span>
                      </div>
                    )}

                    {/* Footer completion indicator */}
                    <div className="pt-2 text-center border-t border-slate-200/40 dark:border-slate-800">
                      {isCompletedToday ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Concluído</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {dayReminderTime ? `⏰ ${dayReminderTime}` : 'Sem lembrete'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: MONTHLY FULL CALENDAR VIEW */}
        {calendarViewMode === 'monthly' && (
          <div className="space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                {monthNames[month]} de {year}
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
                <div key={i} className="py-1">{d}</div>
              ))}
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarGrid.map((cell, idx) => {
                const dayPlan = activePlan.days.find(d => d.dayKey === cell.dayKey);
                const isToday = cell.dateKey === todayDateStr;
                const isCompleted = (completedWorkoutDates.get(cell.dateKey) || 0) > 0;
                const reminderTime = reminderTimes[cell.dayKey] || '18:00';

                return (
                  <div
                    key={idx}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverDayKey(cell.dayKey);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceKey = e.dataTransfer.getData('text/plain') || draggedDayKey;
                      if (sourceKey && sourceKey !== cell.dayKey) {
                        handleSwapWorkouts(sourceKey, cell.dayKey);
                      }
                      setDraggedDayKey(null);
                      setDragOverDayKey(null);
                    }}
                    className={`min-h-[95px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                      !cell.isCurrentMonth
                        ? 'opacity-30 bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800'
                        : isToday
                        ? 'bg-emerald-500/10 border-2 border-emerald-500 shadow-sm'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {cell.dayNumber}
                      </span>
                      {isCompleted && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>

                    {dayPlan && cell.isCurrentMonth && (
                      <div
                        draggable
                        onDragStart={(e) => {
                          setDraggedDayKey(cell.dayKey);
                          e.dataTransfer.setData('text/plain', cell.dayKey);
                        }}
                        className="my-1 p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/20 cursor-grab"
                      >
                        <div className="truncate">{dayPlan.workoutTitle}</div>
                        <div className="text-[9px] text-purple-600 dark:text-purple-300 font-mono">⏰ {reminderTime}</div>
                      </div>
                    )}

                    <div className="text-[9px] text-slate-400 text-right">
                      {DAY_LABELS[cell.dayKey]?.short}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Accessible Mobile Reassign Modal */}
      <AnimatePresence>
        {rescheduleModalDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                    Reagendar Treino
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecione o novo dia da semana para '{rescheduleModalDay.workoutTitle}':
                  </p>
                </div>
                <button
                  onClick={() => setRescheduleModalDay(null)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                {DAY_ORDER.map((targetKey) => {
                  const isCurrent = targetKey === rescheduleModalDay.dayKey;
                  const targetDay = activePlan.days.find(d => d.dayKey === targetKey);

                  return (
                    <button
                      key={targetKey}
                      disabled={isCurrent}
                      onClick={() => {
                        handleSwapWorkouts(rescheduleModalDay.dayKey, targetKey);
                        setRescheduleModalDay(null);
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        isCurrent
                          ? 'opacity-40 bg-slate-100 dark:bg-slate-800 border-slate-200'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {DAY_LABELS[targetKey]?.full}
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Atual: {targetDay?.workoutTitle || 'Dia Livre'}
                        </p>
                      </div>

                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {isCurrent ? '(Dia Atual)' : 'Reagendar Aqui →'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WorkoutCalendarComponent;
