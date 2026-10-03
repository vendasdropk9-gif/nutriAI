import React from 'react';
import { Volume2, Sparkles } from 'lucide-react';
import { speak } from '../lib/speech';

export function MaluVoiceTestView() {
  const testPhrases = [
    "Olá! Eu sou a Malu, sua assistente inteligente de nutrição e longevidade.",
    "Parabéns! Seu plano alimentar foi atualizado com sucesso.",
    "Lembre-se de beber água regularmente para manter sua hidratação em dia."
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-emerald-500/20 shadow-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-white">Laboratório de Voz da Malu</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Teste a voz autêntica da Malu (modelo Aoede) em português.</p>
        </div>
      </div>

      <div className="space-y-3">
        {testPhrases.map((phrase, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <p className="text-slate-700 dark:text-slate-300 text-sm font-medium flex-1 mr-4">{phrase}</p>
            <button
              onClick={() => speak(phrase)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-600/20"
            >
              <Volume2 className="w-4 h-4" />
              <span>Ouvir</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
