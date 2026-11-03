import React from 'react';
import { motion } from 'motion/react';
import { Droplets, Plus } from 'lucide-react';
import { UserProfile, HydrationLog } from '../types';
import { playSfx, vibrate } from '../lib/sensory';

interface QuickWaterLoggerProps {
  profile: UserProfile | null;
  onUpdateProfile: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
}

export function QuickWaterLogger({ profile, onUpdateProfile }: QuickWaterLoggerProps) {
  const hydrationLogs = profile?.hydrationLogs || [];
  const todayStr = new Date().toISOString().split('T')[0];
  const todayHydration = hydrationLogs.filter(log => log.date.startsWith(todayStr));
  const current = todayHydration.reduce((acc, log) => acc + (log.amount || 0), 0);
  const target = profile?.waterGoal || 2500;
  const percent = Math.min(100, Math.round((current / target) * 100));

  const addWater = (amount: number) => {
    if (!onUpdateProfile) return;
    const newLog: HydrationLog = { 
        id: crypto.randomUUID(), 
        date: new Date().toISOString(), 
        amount,
        source: 'Filtrada'
    };
    onUpdateProfile(prev => prev ? { ...prev, hydrationLogs: [...(prev.hydrationLogs || []), newLog] } : null);
    playSfx('crystal');
    vibrate(40);
  };

  return (
    <div className="card-premium p-6 rounded-[32px] w-full border border-blue-500/20 bg-slate-900/60 shadow-lg flex items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-24 bg-slate-800 rounded-b-2xl rounded-t-lg border-2 border-slate-700 overflow-hidden">
          <motion.div 
            className="absolute bottom-0 left-0 w-full bg-blue-500/80"
            initial={{ height: 0 }}
            animate={{ height: `${percent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
             <Droplets className="w-6 h-6 text-white/50" />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-300">Hidratação</h3>
          <p className="text-2xl font-black text-white">{current}<span className="text-sm text-slate-500 font-medium">/{target}ml</span></p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => addWater(250)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition cursor-pointer"
        >
          <Plus className="w-3 h-3" /> +250ml
        </button>
        <button
          onClick={() => addWater(500)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl font-bold text-xs transition cursor-pointer"
        >
          <Plus className="w-3 h-3" /> +500ml
        </button>
      </div>
    </div>
  );
}
