import fs from 'fs';

let content = fs.readFileSync('src/components/JourneyVisualizer.tsx', 'utf8');

const replacements = [
  ['bg-white/80 backdrop-blur-md border border-emerald-100 dark:border-emerald-800/30 p-5 rounded-[24px]', 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-emerald-100 dark:border-emerald-800/30 p-5 rounded-[24px]'],
  ['bg-white text-emerald-600 shadow-md border border-emerald-50', 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md border border-emerald-50 dark:border-slate-700/50'],
  ['bg-white rounded-full flex items-center justify-center shadow-2xl relative border border-white dark:border-slate-700/50', 'bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-2xl relative border border-white dark:border-slate-700/50']
];

for (const [t, r] of replacements) {
  content = content.replaceAll(t, r);
}

fs.writeFileSync('src/components/JourneyVisualizer.tsx', content);
