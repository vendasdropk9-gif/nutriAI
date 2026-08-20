import fs from 'fs';

let content = fs.readFileSync('src/components/JourneyVisualizer.tsx', 'utf8');

const replacements = [
  // Container wrapper
  ['bg-white/60 backdrop-blur-3xl p-6 md:p-8 rounded-[36px] shadow-2xl border border-white relative overflow-hidden',
   'bg-white/60 dark:bg-slate-800/60 backdrop-blur-3xl p-6 md:p-8 rounded-[36px] shadow-2xl border border-white dark:border-slate-700/50 relative overflow-hidden'],
  // Titles
  ['text-emerald-800', 'text-emerald-800 dark:text-emerald-400'],
  ['text-slate-800', 'text-slate-800 dark:text-slate-100'],
  // Body copy
  ['text-slate-500', 'text-slate-500 dark:text-slate-400'],
  ['text-slate-400 mb-2', 'text-slate-400 dark:text-slate-500 mb-2'],
  // Stat cards container backgrounds
  ['bg-white/80 p-6', 'bg-white/80 dark:bg-slate-800/80 p-6'],
  ['bg-emerald-50/90 p-6', 'bg-emerald-50/90 dark:bg-emerald-900/40 p-6'],
  ['bg-indigo-50/90 p-6', 'bg-indigo-50/90 dark:bg-indigo-900/40 p-6'],
  ['border-white', 'border-white dark:border-slate-700/50'],
  ['border-emerald-100', 'border-emerald-100 dark:border-emerald-800/30'],
  ['border-indigo-100', 'border-indigo-100 dark:border-indigo-800/30'],
  ['text-slate-800 tracking-tight', 'text-slate-800 dark:text-slate-100 tracking-tight'],
  ['text-emerald-800 tracking-tight', 'text-emerald-800 dark:text-emerald-400 tracking-tight'],
  ['text-indigo-800 tracking-tight', 'text-indigo-800 dark:text-indigo-400 tracking-tight'],
  // Avatar image container
  ['bg-stone-100 ring-1 ring-slate-900/5', 'bg-stone-100 dark:bg-slate-900 ring-1 ring-slate-900/5 dark:ring-white/5'],
  ['border-[6px] border-white', 'border-[6px] border-white dark:border-slate-800'],
  ['bg-white/95 backdrop-blur', 'bg-white/95 dark:bg-slate-800/95 backdrop-blur'],
  // Timeline container
  ['bg-white/80 shadow-sm border border-slate-100 p-6 rounded-[32px]', 'bg-white/80 dark:bg-slate-800/80 shadow-sm border border-slate-100 dark:border-slate-700 p-6 rounded-[32px]'],
  ['bg-slate-100 rounded-full shadow-inner border border-slate-200/50', 'bg-slate-100 dark:bg-slate-900 rounded-full shadow-inner border border-slate-200/50 dark:border-slate-700'],
  // Assistant bubble
  ['bg-white/80 backdrop-blur-md border border-emerald-100 p-5 rounded-[24px]', 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-emerald-100 dark:border-emerald-900/50 p-5 rounded-[24px]']
];

for (const [t, r] of replacements) {
  content = content.replaceAll(t, r);
}

fs.writeFileSync('src/components/JourneyVisualizer.tsx', content);
