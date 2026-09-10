const fs = require('fs');
const file = 'src/lib/gemini.server.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `  try {
    const stringifiedHistory = (history || []).map(h => \`\${h.role === 'user' ? 'Usuário' : 'Você'}: \${h.text}\`).join('\\n');
        
    const finalPrompt = \`HISTÓRICO DA CONVERSA:
\${stringifiedHistory}

O usuário acabou de dizer: "\${userMessage}"

RESPONDA EM JSON.\`;`;

const target2 = `  try {
    const stringifiedHistory = (history || []).map(h => \`\${h.role === 'user' ? 'Usuário' : 'Você'}: \${h.text}\`).join('\\n');
        
    const finalPrompt = \`HISTÓRICO DA CONVERSA:\n\${stringifiedHistory}\n\nO usuário acabou de dizer: "\${userMessage}"\n\nRESPONDA EM JSON.\`;`;

// Using regex to replace flexibly
code = code.replace(/const stringifiedHistory(.+?)const finalPrompt([^;]+);/s, (match) => {
  return `const stringifiedHistory$1
    // RAG Search for context
    let libraryContext = "";
    try {
      const chunks = await searchScientificLibrary(userMessage);
      if (chunks && chunks.length > 0) {
        libraryContext = "\\n\\nBIBLIOTECA CIENTÍFICA (RESULTADOS RECUPERADOS):\\n" + 
          chunks.map((c) => \`DOCUMENTO: \${c.title || 'Desconhecido'} (Autor: \${c.author || '-'}, Instituição: \${c.institution || '-'}, Ano: \${c.year || '-'})\n\` +
          \`PÁGINA: \${c.page_number || '-'}\\nTRECHO: \${c.content}\\n\`).join('\\n') +
          "\\n\\nINSTRUÇÃO RAG (PRIORIDADE MÁXIMA): Responda utilizando SOMENTE o contexto recuperado acima se a pergunta for sobre saúde, medicamentos, fitoterapia ou referências. SEMPRE cite a fonte e a página exata (Ex: 'Segundo [Fonte], pág [X]...'). Se a informação solicitada NÃO estiver no contexto recuperado, NÃO INVENTE FATOS, responda EXATAMENTE: 'Não encontrei informação suficiente na Biblioteca Científica da Malu para responder isso com segurança.'";
      }
    } catch (e) {
      console.error("RAG fetch failed:", e);
    }
    
    const finalPrompt = \`HISTÓRICO DA CONVERSA:\\n\${stringifiedHistory}\\nO usuário acabou de dizer: "\${userMessage}"\${libraryContext}\\n\\nRESPONDA EM JSON.\`;`;
});

fs.writeFileSync(file, code);
