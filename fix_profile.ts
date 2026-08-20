import fs from 'fs';
let content = fs.readFileSync('src/components/Profile.tsx', 'utf8');

// Replace all occurrences of the classname
const targetClass = 'className="w-full p-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 placeholder:text-slate-400 shadow-sm transition-all"';
const newClass = 'className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"';
content = content.replaceAll(targetClass, newClass);

// Replace label classes
content = content.replaceAll(
  'className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400"',
  'className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500"'
);

fs.writeFileSync('src/components/Profile.tsx', content);
