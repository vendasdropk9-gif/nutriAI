import React from 'react';
import { BookOpen } from 'lucide-react';

interface PostureTip {
  title: string;
  description: string;
  gifUrl?: string;
}

const tipsDatabase: Record<string, PostureTip[]> = {
  'ex-4': [ // Prancha Isométrica
    { title: 'Alinhe a Coluna', description: 'Mantenha o pescoço alinhado com a coluna, olhando para o chão.' },
    { title: 'Contraia o Core', description: 'Imagine que está puxando o umbigo para dentro em direção às costas.' }
  ],
  // ... outros exercícios
};

export const PostureTips: React.FC<{ exerciseId: string; joint: string }> = ({ exerciseId, joint }) => {
  const tips = tipsDatabase[exerciseId] || [{ title: 'Dica Geral', description: 'Mantenha o corpo alinhado e respire calmamente.' }];
  
  return (
    <div className="absolute bottom-20 left-4 right-4 bg-slate-900/90 p-4 rounded-2xl border border-teal-500/50 text-white z-20">
      <h3 className="text-teal-400 font-bold flex items-center gap-2 mb-2"><BookOpen className="w-4 h-4" /> Dica de Postura: {tips[0].title}</h3>
      <p className="text-sm">{tips[0].description}</p>
    </div>
  );
};
