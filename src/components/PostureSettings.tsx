import React from 'react';
import { Settings, Camera, AlertTriangle } from 'lucide-react';

interface PostureSettingsProps {
  onClose: () => void;
  onUpdateSettings: (settings: { distance: number; sensitivity: number; interval: number }) => void;
  settings: { distance: number; sensitivity: number; interval: number };
}

export const PostureSettings: React.FC<PostureSettingsProps> = ({ onClose, onUpdateSettings, settings }) => {
  return (
    <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 flex flex-col gap-6 text-white">
      {/* ... header ... */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-teal-400" /> Configuração</h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full">X</button>
      </div>

      <div className="space-y-4">
        {/* ... existing sliders ... */}
        <label className="block text-sm">Distância Ideal (cm): {settings.distance}</label>
        <input type="range" min="50" max="200" value={settings.distance} onChange={(e) => onUpdateSettings({ ...settings, distance: parseInt(e.target.value) })} className="w-full" />
        
        <label className="block text-sm">Sensibilidade dos Alertas: {settings.sensitivity}</label>
        <input type="range" min="1" max="10" value={settings.sensitivity} onChange={(e) => onUpdateSettings({ ...settings, sensitivity: parseInt(e.target.value) })} className="w-full" />

        <label className="block text-sm">Lembrete de Postura (min): {settings.interval}</label>
        <input type="number" min="1" max="30" value={settings.interval} onChange={(e) => onUpdateSettings({ ...settings, interval: parseInt(e.target.value) })} className="w-full bg-slate-800 p-2 rounded-lg" />
      </div>

      <button className="bg-teal-600 py-3 rounded-xl font-bold" onClick={onClose}>Salvar e Calibrar</button>
    </div>
  );
};
