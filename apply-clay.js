import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.join(__dirname, 'src/components');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Pattern replacements
  content = content.replace(/bg-white\/\d+ dark:bg-slate-\d+\/\d+ backdrop-[a-z-]+ (?:p-[0-9]+ )?(?:md:p-[0-9]+ )?rounded-\[\d+px\] (?:shadow-[a-z0-9]+ )?border border-white\/\d+ dark:border-slate-\d+\/\d+/g, 'clay-card p-8');
  
  content = content.replace(/bg-white dark:bg-slate-\d+ (?:p-[0-9]+ )?(?:md:p-[0-9]+ )?rounded-(?:[2-4]xl|\[\d+px\]) (?:shadow-[a-z0-9]+ )?border border-slate-[0-9]+ dark:border-slate-[0-9]+/g, 'clay-card p-6');
  
  content = content.replace(/bg-white\/\d+ dark:bg-slate-\d+\/\d+ (?:p-[0-9]+ )?rounded-(?:[2-4]xl|\[\d+px\]) border border-white\/\d+ dark:border-slate-\d+\/\d+/g, 'clay-card p-6');

  content = content.replace(/bg-white\/\d+ dark:bg-slate-\d+\/\d+ p-[0-9]+ rounded-\[[0-9]+px\] border border-white\/\d+ dark:border-slate-\d+\/\d+/g, 'clay-card p-6');

  // Specific components modifications
  content = content.replace(/rounded-\[32px\]/g, 'rounded-[32px] clay-card');
  content = content.replace(/rounded-\[40px\]/g, 'rounded-[40px] clay-card');

  // Replace primary buttons
  content = content.replace(/bg-emerald-[46]00 hover:bg-emerald-[57]00 text-white rounded-(?:xl|2xl|full|3xl|\[[0-9]+px\])/g, 'clay-primary px-6 py-3');
  content = content.replace(/bg-emerald-[46]00 text-white rounded-(?:xl|2xl|full|3xl|\[[0-9]+px\])/g, 'clay-primary px-6 py-3');
  content = content.replace(/bg-emerald-500 hover:bg-emerald-600 text-white rounded-(?:xl|2xl|full|3xl|\[[0-9]+px\])/g, 'clay-primary px-6 py-3');
  content = content.replace(/bg-emerald-500 text-white rounded-(?:xl|2xl|full|3xl|\[[0-9]+px\])/g, 'clay-primary px-6 py-3');

  // General button
  content = content.replace(/bg-white text-slate-900 rounded-(?:xl|2xl|full|\[[0-9]+px\])/g, 'clay-btn px-6 py-3');
  content = content.replace(/bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-(?:xl|2xl|full|\[[0-9]+px\])/g, 'clay-btn px-6 py-3');
  content = content.replace(/bg-white text-emerald-[56]00 rounded-(?:xl|2xl|full|\[[0-9]+px\])/g, 'clay-btn px-6 py-3');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
}

fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.tsx')) {
    processFile(path.join(dir, file));
  }
});
