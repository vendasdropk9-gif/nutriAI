import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Volume2, Sliders, ShieldCheck, ShieldAlert, Sparkles, Pause, Radio, BookOpen } from 'lucide-react';

interface HandsFreeListeningStatusBarProps {
  isListening: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  pauseReason?: 'keyword' | 'gesture' | 'manual' | null;
  currentAudioLevel: number; // 0 - 100
  voiceSensitivity: number; // 0 - 100 threshold
  onOpenSettings?: () => void;
  isSettingsOpen?: boolean;
  onOpenCommandsGuide?: () => void;
  isCommandsGuideOpen?: boolean;
  className?: string;
}

export const HandsFreeListeningStatusBar: React.FC<HandsFreeListeningStatusBarProps> = ({
  isListening,
  isSpeaking,
  isPaused,
  pauseReason,
  currentAudioLevel,
  voiceSensitivity,
  onOpenSettings,
  isSettingsOpen = false,
  onOpenCommandsGuide,
  isCommandsGuideOpen = false,
  className = ''
}) => {
  const isAudioAboveThreshold = currentAudioLevel >= voiceSensitivity;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border px-3.5 py-2.5 transition-all duration-300 relative overflow-hidden ${
        isPaused
          ? 'bg-amber-950/40 border-amber-500/40 shadow-sm'
          : isListening
          ? 'bg-slate-900/90 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
          : 'bg-slate-900/60 border-white/10'
      } ${className}`}
    >
      {/* Background Pulse Effect when actively monitoring */}
      {isListening && !isPaused && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/10 to-amber-500/5 pointer-events-none animate-pulse" />
      )}

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Blinking Listening Radar / Mic Indicator & Status Badge */}
        <div className="flex items-center gap-2.5 min-w-[200px]">
          {/* Animated Blinking Radar Indicator */}
          <div className="relative flex items-center justify-center w-7 h-7">
            {isListening && !isPaused ? (
              <>
                <span className="absolute w-7 h-7 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
                <span className="absolute w-5 h-5 rounded-full bg-emerald-500/40 animate-pulse pointer-events-none" />
                <div className="relative w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center shadow-md shadow-emerald-500/25">
                  <Mic className="w-3.5 h-3.5 text-white animate-bounce" />
                </div>
              </>
            ) : isPaused ? (
              <>
                <span className="absolute w-7 h-7 rounded-full bg-amber-400/30 animate-pulse pointer-events-none" />
                <div className="relative w-7 h-7 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/30 font-bold">
                  <Pause className="w-3.5 h-3.5 fill-current" />
                </div>
              </>
            ) : (
              <div className="w-7 h-7 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center border border-white/10">
                <Radio className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {/* Active Listening Badge & Text */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1.5 transition-colors ${
                  isPaused
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : isListening
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border border-white/10'
                }`}
              >
                {/* Blinking Dot Icon */}
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPaused
                      ? 'bg-amber-400 animate-pulse'
                      : isListening
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-slate-500'
                  }`}
                />
                <span>
                  {isPaused
                    ? '⏸️ Leitura Pausada'
                    : isSpeaking
                    ? '🔊 Malu Falando'
                    : isListening
                    ? 'Ouvindo Ativamente'
                    : 'Microfone em Espera'}
                </span>
              </span>

              {/* Status pill showing monitored keyword with click to open guide */}
              {onOpenCommandsGuide ? (
                <button
                  type="button"
                  onClick={onOpenCommandsGuide}
                  className="text-[10px] font-mono text-emerald-300 hover:text-white bg-emerald-950/70 hover:bg-emerald-900/90 px-2 py-0.5 rounded-md border border-emerald-500/30 inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                  title="Ver lista de frases e comandos reconhecidos"
                >
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Monitorando: <strong className="text-white">"PAUSA"</strong>, "Continuar", "Próximo"</span>
                  <span className="text-[9px] font-sans font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30 ml-1">
                    Ver Guia 📖
                  </span>
                </button>
              ) : (
                <span className="text-[10px] font-mono text-emerald-300/80 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20 hidden sm:inline-flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                  Monitorando: <strong className="text-white">"PAUSA"</strong>, "Continuar", "Próximo"
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-300 mt-0.5 font-medium flex items-center gap-1">
              {isPaused ? (
                <span className="text-amber-200">
                  Diga <strong className="text-white">"Continuar"</strong> ou clique em Ouvir Passo para retomar a leitura.
                </span>
              ) : isSpeaking ? (
                <span>
                  Fale <strong className="text-amber-300">"PAUSA"</strong> ou acene para parar imediatamente.
                </span>
              ) : (
                <span>
                  Fale alto para sobrepor ruído da cozinha • Comandos: <em>"pausa"</em>, <em>"próximo"</em>, <em>"repetir ingrediente"</em>.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Real-time Audio Level & Sensitivity Calibration Meter + Settings Trigger + Commands Guide */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Audio Input Level Meter Bar */}
          <div className="flex flex-col gap-1 w-28 sm:w-36 bg-black/40 px-2 py-1 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-400">
              <span className="flex items-center gap-1">
                {isAudioAboveThreshold ? (
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-3 h-3 text-slate-400" />
                )}
                <span>{isAudioAboveThreshold ? 'Voz Válida' : 'Filtro Ruído'}</span>
              </span>
              <span className={`${isAudioAboveThreshold ? 'text-emerald-300' : 'text-slate-400'}`}>
                {currentAudioLevel}%
              </span>
            </div>

            {/* Level Bar with Threshold Cutoff Marker */}
            <div className="relative w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              {/* Dynamic current audio volume fill */}
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  isAudioAboveThreshold
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-300 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                    : 'bg-slate-600'
                }`}
                style={{ width: `${Math.min(100, Math.max(4, currentAudioLevel))}%` }}
              />

              {/* Sensitivity Cutoff Pin Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,1)] z-10"
                style={{ left: `${voiceSensitivity}%` }}
                title={`Limiar de sensibilidade configurado: ${voiceSensitivity}%`}
              />
            </div>

            <div className="flex justify-between items-center text-[8px] font-mono text-slate-500">
              <span>0%</span>
              <span className="text-amber-400/90 font-bold">Limiar: {voiceSensitivity}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Button to Open/Toggle Commands Guide Panel */}
          {onOpenCommandsGuide && (
            <button
              type="button"
              onClick={onOpenCommandsGuide}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm ${
                isCommandsGuideOpen
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-emerald-500/20'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-white/10 text-emerald-300 hover:text-white'
              }`}
              title="Abrir painel com todos os comandos de voz reconhecidos"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Comandos</span>
            </button>
          )}

          {/* Button to Open/Toggle Sensitivity Settings Drawer */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm ${
                isSettingsOpen
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-amber-500/20'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-white/10 text-slate-200 hover:text-white'
              }`}
              title="Ajustar sensibilidade de detecção de voz e ruído da cozinha"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Sensibilidade:</span>
              <span className="font-mono">{voiceSensitivity}%</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HandsFreeListeningStatusBar;
