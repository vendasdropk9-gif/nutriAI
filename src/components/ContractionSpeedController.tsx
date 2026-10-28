import React from 'react';
import { Activity } from 'lucide-react';

interface ContractionSpeedControllerProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export const ContractionSpeedController: React.FC<ContractionSpeedControllerProps> = ({ speed, onSpeedChange }) => {
  return (
    <div className="clay-card p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-3 h-3 text-emerald-400" />
          Contração Muscular
        </h5>
        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          {speed.toFixed(1)}x
        </span>
      </div>
      
      <input
        type="range"
        min="0.2"
        max="3.0"
        step="0.1"
        value={speed}
        onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
      />
      
      <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
        <span>Lenta</span>
        <span>Normal</span>
        <span>Explosiva</span>
      </div>
    </div>
  );
};
