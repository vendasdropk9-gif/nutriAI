import fs from 'fs';
const file = 'src/components/AcademyPortal.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/text-black text-sm/g, 'text-slate-900 dark:text-white text-sm');
content = content.replace(/text-black text-xs/g, 'text-slate-900 dark:text-white text-xs');
fs.writeFileSync(file, content);
console.log('Fixed text-black');
