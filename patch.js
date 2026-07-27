import fs from 'fs';
const file = 'src/components/PersonalizationWizard.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /<div className="w-full max-w-lg mb-8 text-center space-y-3">[\s\S]*?<\/p>\n\s*<\/div>/,
  `<div className="w-full max-w-lg mb-10 flex flex-col items-center justify-center gap-4 text-center mt-8">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm">
          <Brain className="w-10 h-10" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
          Seu plano personalizado
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
          A Inteligência Artificial precisa entender seu corpo para calibrar sua nutrição 360.
        </p>
      </div>`
);
fs.writeFileSync(file, content);
