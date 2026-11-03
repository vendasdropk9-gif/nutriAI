import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Volume2, ShieldCheck, ShieldAlert, Sparkles, Check, RotateCcw, Info, Flame, Wind, Coffee, Mic, MessageSquare } from 'lucide-react';
import { HandsFreeCustomAliasesSettings } from './HandsFreeCustomAliasesSettings';

interface HandsFreeVoiceSensitivitySettingsProps {
  voiceSensitivity: number;
  onSensitivityChange: (newVal: number) => void;
  currentAudioLevel: number;
  onSimulateCommand?: (cmd: string) => void;
  onClose?: () => void;
  initialTab?: 'sensitivity' | 'aliases';
  className?: string;
}

export const HandsFreeVoiceSensitivitySettings: React.FC<HandsFreeVoiceSensitivitySettingsProps> = ({
  voiceSensitivity,
  onSensitivityChange,
  currentAudioLevel,
  onSimulateCommand,
  onClose,
  initialTab = 'sensitivity',
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'sensitivity' | 'aliases'>(initialTab);

  const presets = [
    {
      id: 'quiet',
      label: 'Silencioso',
      sublabel: 'Voz baixa / Quarto',
      value: 15,
      icon: Coffee,
      color: 'from-blue-500/20 to-cyan-500/20 border-cyan-500/40 text-cyan-200'
    },
    {
      id: 'normal',
      label: 'Cozinha Normal',
      sublabel: 'Recomendado',
      value: 35,
      icon: ShieldCheck,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-200'
    },
    {
      id: 'noisy',
      label: 'Cozinha Barulhenta',
      sublabel: 'Exaustor / Fritura',
      value: 65,
      icon: Flame,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-200'
    },
    {
      id: 'extreme',
      label: 'Ruído Extremo',
      sublabel: 'Liquidificador / Panela',
      value: 80,
      icon: Wind,
      color: 'from-rose-500/20 to-red-500/20 border-rose-500/40 text-rose-200'
    }
  ];

  const isAudioAboveThreshold = currentAudioLevel >= voiceSensitivity;

  if (activeTab === 'aliases') {
    return (
      <div className={className}>
        {/* Navigation Tabs Bar */}
        <div className="mb-3 flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('sensitivity')}
            className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Limiar de Sensibilidade</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('aliases')}
            className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-emerald-500 text-slate-950 shadow-md"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Sinônimos Personalizados</span>
          </button>
        </div>
        <HandsFreeCustomAliasesSettings onClose={onClose} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-black/95 border-2 border-amber-500/40 p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-md ${className}`}
    >
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Navigation Tabs Bar */}
      <div className="mb-3 flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 relative z-10">
        <button
          type="button"
          onClick={() => setActiveTab('sensitivity')}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-amber-500 text-slate-950 shadow-md"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Limiar de Sensibilidade</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('aliases')}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-300 hover:text-emerald-300"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sinônimos Personalizados</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/30">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              Sensibilidade de Detecção de Voz
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {voiceSensitivity}% Limiar
              </span>
            </h4>
            <p className="text-[11px] text-slate-300 font-medium">
              Ajuste o volume mínimo necessário para acionar os comandos de voz e evitar disparos acidentais com ruídos de cozinha.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95"
          >
            Concluir
          </button>
        )}
      </div>

      <div className="space-y-4 pt-3.5 relative z-10">
        {/* Slider Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span>Nível de disparo dos comandos:</span>
            </span>
            <span className="font-mono font-bold text-amber-400 bg-black/40 px-2 py-0.5 rounded-lg border border-white/10">
              {voiceSensitivity}%
            </span>
          </div>

          <div className="relative py-1">
            <input
              type="range"
              min="5"
              max="95"
              step="1"
              value={voiceSensitivity}
              onChange={(e) => onSensitivityChange(Number(e.target.value))}
              aria-label="Sensibilidade de detecção de voz"
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
            {/* Markers underneath */}
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-0.5 mt-1">
              <span>5% (Mais sensível)</span>
              <span className="text-emerald-400 font-bold">35% (Recomendado)</span>
              <span>95% (Exige voz muito alta)</span>
            </div>
          </div>
        </div>

        {/* Quick Presets Grid */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Ajustes Rápidos por Ambiente:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presets.map((p) => {
              const Icon = p.icon;
              const isSelected = Math.abs(voiceSensitivity - p.value) <= 5;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSensitivityChange(p.value)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 active:scale-95 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/20 font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                    <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-slate-950' : 'text-slate-400'}`}>
                      {p.value}%
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">{p.label}</div>
                    <div className={`text-[9px] font-medium leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                      {p.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-Time Calibration Feedback Bar */}
        <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-slate-300 text-[11px]">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Calibração em Tempo Real:</span>
            </span>
            <span
              className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                isAudioAboveThreshold
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-white/10'
              }`}
            >
              {isAudioAboveThreshold
                ? '✅ Voz Detectada (Comando Aceito)'
                : '🛡️ Ruído Filtrado (Disparo Evitado)'}
            </span>
          </div>

          {/* Dual Visual Level Bar */}
          <div className="relative w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-white/5">
            {/* Dynamic Volume Level */}
            <div
              className={`h-full transition-all duration-75 rounded-full ${
                isAudioAboveThreshold
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-300 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                  : 'bg-slate-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(3, currentAudioLevel))}%` }}
            />

            {/* Threshold Pin Marker */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,1)] z-10 -ml-0.5"
              style={{ left: `${voiceSensitivity}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>
              Microfone: <strong className="text-white font-mono">{currentAudioLevel}%</strong>
            </span>
            <span>
              Limiar Mínimo: <strong className="text-amber-300 font-mono">{voiceSensitivity}%</strong>
            </span>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-white/5">
            💡 <strong>Dica de Cozinha:</strong> Fale normalmente ou diga <em>"PAUSA"</em>. Se a barra ultrapassar a linha dourada ({voiceSensitivity}%), o comando é acionado imediatamente. Se o ruído da fritura ficar abaixo da linha, ele será descartado com segurança!
          </p>
        </div>

        {/* Reset to Recommended Button */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            type="button"
            onClick={() => onSensitivityChange(35)}
            className="flex items-center gap-1.5 text-[11px] text-amber-300/80 hover:text-amber-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restaurar padrão de cozinha (35%)</span>
          </button>

          {onSimulateCommand && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Testar comando:</span>
              <button
                type="button"
                onClick={() => onSimulateCommand('pausa')}
                className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer transition-all active:scale-95"
              >
                "PAUSA"
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HandsFreeVoiceSensitivitySettings;
