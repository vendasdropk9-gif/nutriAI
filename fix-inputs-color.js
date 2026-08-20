import fs from 'fs';
const file = 'src/components/AcademyPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/text-slate-900 dark:text-white text-sm/g, 'text-white text-sm');

fs.writeFileSync(file, content);
console.log('Fixed inputs text color to white');
