import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface SkeletonProps {
  type?: 'card' | 'list' | 'recipe' | 'chat';
}

export function Skeleton({ type = 'card' }: SkeletonProps) {
  const shimmerClass = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:dark:via-white/10 before:to-transparent isolate";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full space-y-4"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
            <Sparkles className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/10" style={{ animationDuration: '2s' }} />
        </div>
        <div className="space-y-2">
          <div className={`w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded-full ${shimmerClass}`} />
          <div className={`w-24 h-3 bg-slate-100 dark:bg-slate-800 rounded-full ${shimmerClass}`} />
        </div>
      </div>

      {type === 'recipe' && (
        <div className="bg-white dark:bg-slate-800/50 rounded-[32px] clay-card p-6 shadow-xl border border-slate-100 dark:border-slate-700">
          <div className={`w-full h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl mb-6 ${shimmerClass}`} />
          <div className="space-y-4">
            <div className={`w-3/4 h-8 bg-slate-200 dark:bg-slate-700 rounded-xl ${shimmerClass}`} />
            <div className="flex gap-2">
              <div className={`w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded-md ${shimmerClass}`} />
              <div className={`w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded-md ${shimmerClass}`} />
              <div className={`w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded-md ${shimmerClass}`} />
            </div>
            <div className="space-y-2 mt-6">
              <div className={`w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full ${shimmerClass}`} />
              <div className={`w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full ${shimmerClass}`} />
              <div className={`w-5/6 h-4 bg-slate-100 dark:bg-slate-800 rounded-full ${shimmerClass}`} />
            </div>
          </div>
        </div>
      )}

      {type === 'card' && (
        <div className="bg-white dark:bg-slate-800/50 rounded-[32px] clay-card p-6 shadow-xl border border-slate-100 dark:border-slate-700">
          <div className="space-y-4">
            <div className={`w-2/3 h-8 bg-slate-200 dark:bg-slate-700 rounded-xl ${shimmerClass}`} />
            <div className="space-y-2 mt-4">
              <div className={`w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full ${shimmerClass}`} />
              <div className={`w-5/6 h-4 bg-slate-100 dark:bg-slate-800 rounded-full ${shimmerClass}`} />
              <div className={`w-4/6 h-4 bg-slate-100 dark:bg-slate-800 rounded-full ${shimmerClass}`} />
            </div>
            <div className="mt-8 flex gap-4">
              <div className={`w-24 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl ${shimmerClass}`} />
              <div className={`w-24 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl ${shimmerClass}`} />
            </div>
          </div>
        </div>
      )}
      
      {type === 'chat' && (
        <div className="space-y-6 mt-4">
          <div className="flex justify-end">
            <div className={`w-2/3 h-16 bg-emerald-500/10 rounded-2xl rounded-tr-sm ${shimmerClass}`} />
          </div>
          <div className="flex gap-3">
             <div className={`w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0 ${shimmerClass}`} />
             <div className={`w-3/4 h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl flex flex-col justify-center px-4 rounded-tl-sm ${shimmerClass}`}>
                <div className={`w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full mb-2 ${shimmerClass}`} />
                <div className={`w-5/6 h-4 bg-slate-200 dark:bg-slate-700 rounded-full ${shimmerClass}`} />
             </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
