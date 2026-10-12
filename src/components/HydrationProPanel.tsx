import React, { useState } from 'react';
import { Droplet, Sun, Minus, Plus, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface HydrationProPanelProps {
  profile: UserProfile | null;
}

export function HydrationProPanel({ profile }: HydrationProPanelProps) {
  const [manualAdjustment, setManualAdjustment] = useLocalStorage('manual_hydration_adjustment', 0);
  const baseGoal = profile?.waterGoal || 2500;
  const currentGoal = baseGoal + manualAdjustment;

  const today = new Date().toISOString().split('T')[0];
  const consumed = (profile?.hydrationLogs || [])
    .filter(log => log.date.startsWith(today))
    .reduce((acc, log) => acc + log.amount, 0);

  const percentage = Math.min(100, (consumed / currentGoal) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <Droplet className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Hidratação Pro</h3>
          <p className="text-sm text-slate-500">Monitore e ajuste sua meta diária</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="text-center">
          <p className="text-sm text-slate-500">Meta Ajustada</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentGoal}ml</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-500">Consumido</p>
          <p className="text-2xl font-bold text-blue-500">{consumed}ml</p>
        </div>
      </div>

      <div className="relative h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-8">
        <motion.div 
          className="absolute top-0 left-0 h-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
        />
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            Ajuste pelo Clima
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setManualAdjustment(prev => prev - 100)}
              className="p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800 dark:text-slate-100 w-16 text-center">
              {manualAdjustment > 0 ? '+' : ''}{manualAdjustment}ml
            </span>
            <button 
              onClick={() => setManualAdjustment(prev => prev + 100)}
              className="p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ajuste manualmente a meta baseada na intensidade do calor local ou atividade física extra.
        </p>
      </div>
    </div>
  );
}
