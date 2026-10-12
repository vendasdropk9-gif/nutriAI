import React from 'react';
import { motion } from 'motion/react';

interface CalorieProgressRingProps {
  current: number;
  goal: number;
}

export function CalorieProgressRing({ current, goal }: CalorieProgressRingProps) {
  const percentage = Math.min((current / (goal || 1)) * 100, 100);
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          className="stroke-slate-100 dark:stroke-slate-800"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          className="stroke-emerald-500"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-slate-800 dark:text-slate-100">{Math.round(percentage)}%</span>
        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Meta</span>
      </div>
    </div>
  );
}
