import React from 'react';

interface AnatomicalPresetControllerProps {
  currentPreset: 'atleta' | 'equilibrado' | 'resistencia';
  onApplyPreset: (preset: 'atleta' | 'equilibrado' | 'resistencia') => void;
}

export const AnatomicalPresetController: React.FC<AnatomicalPresetControllerProps> = ({ currentPreset, onApplyPreset }) => {
  return (
    <div className="clay-card p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-md">
      <h5 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Presets Anatômicos</h5>
      <div className="flex gap-2">
        {(['atleta', 'equilibrado', 'resistencia'] as const).map((p) => (
          <button
            key={p}
            onClick={() => onApplyPreset(p)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
              currentPreset === p 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};
