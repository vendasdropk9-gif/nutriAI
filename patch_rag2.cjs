const fs = require('fs');
const file = 'src/lib/gemini.server.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace('const stringifiedHistory$1', `const stringifiedHistory = (history || []).map(h => \`\${h.role === 'user' ? 'Usuário' : 'Você'}: \${h.text}\`).join('\\n');`);
fs.writeFileSync(file, code);
