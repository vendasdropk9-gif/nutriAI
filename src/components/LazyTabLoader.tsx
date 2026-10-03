import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Activity } from 'lucide-react';

interface LazyTabLoaderProps {
  label?: string;
}

export function LazyTabLoader({ label = 'Carregando módulo inteligente...' }: LazyTabLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-5xl mx-auto py-12 px-4 flex flex-col items-center justify-center space-y-6"
    >
      <div className="relative">
        {/* Pulsing glow background */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 dark:bg-emerald-400/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
          <Sparkles className="w-8 h-8 text-emerald-500 dark:text-emerald-400 animate-pulse" />
        </div>
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-teal-400/20 to-emerald-500/20 blur-md -z-10 animate-pulse" />
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500 animate-spin" />
          <span>{label}</span>
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Sincronizando modelos e interface...
        </p>
      </div>

      {/* Shimmer skeleton cards to maintain layout stability */}
      <div className="w-full space-y-4 pt-4">
        <div className="h-10 w-48 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl animate-pulse mx-auto sm:mx-0" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-3xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-700/40 p-5 flex flex-col justify-between animate-pulse"
            >
              <div className="space-y-2.5">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-3 w-3/4 bg-slate-200/70 dark:bg-slate-700/50 rounded-full" />
              </div>
              <div className="h-8 w-full bg-slate-200/50 dark:bg-slate-700/40 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default LazyTabLoader;
