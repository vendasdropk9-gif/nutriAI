import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/bg-transparent/g, 'bg-transparent');
content = content.replace(/min-h-screen bg-slate-50 dark:bg-slate-900/g, 'min-h-screen bg-[#F0F4F8] dark:bg-[#0f172a]');
content = content.replace(/bg-white\/[0-9]+ dark:bg-slate-[0-9]+\/[0-9]+/g, 'clay-panel');
fs.writeFileSync('src/App.tsx', content);
