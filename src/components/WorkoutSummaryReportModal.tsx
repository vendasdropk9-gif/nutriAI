import React from 'react';
import { Trophy, Dumbbell, Flame, CheckCircle2, X } from 'lucide-react';

interface WorkoutSummaryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workoutTitle?: string;
  durationMinutes?: number;
  caloriesBurned?: number;
  exercisesCompleted?: number;
  profile?: any;
}

export function WorkoutSummaryReportModal({
  isOpen,
  onClose,
  workoutTitle,
  durationMinutes,
  caloriesBurned,
  exercisesCompleted
}: WorkoutSummaryReportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-2xl border border-emerald-500/20 text-center space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
          <Trophy className="w-8 h-8" />
        </div>

        <div>
          <h3 className="font-serif text-2xl font-bold text-slate-900 dark:text-white mb-1">Treino Concluído!</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{workoutTitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <Dumbbell className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-slate-900 dark:text-white">{exercisesCompleted}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Exercícios</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <Flame className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-slate-900 dark:text-white">{caloriesBurned}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Kcal</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-teal-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-slate-900 dark:text-white">{durationMinutes}m</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Duração</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
