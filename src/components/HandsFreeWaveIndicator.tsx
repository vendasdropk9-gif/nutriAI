import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Volume2, Headphones, Sparkles, CheckCircle2, Pause, Hand, Play, Sliders } from 'lucide-react';

interface HandsFreeWaveIndicatorProps {
  isSpeaking: boolean;
  isListening: boolean;
  isVoiceModeActive: boolean;
  isPaused?: boolean;
  pauseReason?: 'keyword' | 'gesture' | 'manual' | null;
  currentStepIndex: number;
  totalSteps: number;
  recognizedCommand?: string | null;
  voiceTranscript?: string;
  voiceSensitivity?: number;
  currentAudioLevel?: number;
  onOpenVoiceSettings?: () => void;
  onSimulateCommand?: (cmd: string) => void;
  onSimulateGesture?: () => void;
  className?: string;
}

export const HandsFreeWaveIndicator: React.FC<HandsFreeWaveIndicatorProps> = ({
  isSpeaking,
  isListening,
  isVoiceModeActive,
  isPaused = false,
  pauseReason = null,
  currentStepIndex,
  totalSteps,
  recognizedCommand,
  voiceTranscript,
  voiceSensitivity,
  currentAudioLevel,
  onOpenVoiceSettings,
  onSimulateCommand,
  onSimulateGesture,
  className = ''
}) => {
  // Current mode state determination
  const mode = isPaused
    ? 'paused'
    : isSpeaking
    ? 'speaking'
    : isListening || isVoiceModeActive
    ? 'listening'
    : 'idle';

  // Precomputed heights for the 24 equalizer wave bars for natural soundwave curve
  const waveBars = useMemo(() => {
    // Symmetrical curved wave pattern: low on ends, high in middle
    const baseCurve = [
      0.25, 0.4, 0.6, 0.85, 0.95, 0.7, 0.85, 1.0, 0.9, 0.75, 0.95, 1.0,
      1.0, 0.92, 0.78, 0.88, 1.0, 0.8, 0.92, 0.7, 0.85, 0.6, 0.4, 0.25
    ];
    return baseCurve;
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative overflow-hidden rounded-2xl border transition-all duration-500 ${
        mode === 'paused'
          ? 'bg-gradient-to-r from-amber-950/90 via-slate-900/90 to-orange-950/90 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
          : mode === 'speaking'
          ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-emerald-950/80 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
          : mode === 'listening'
          ? 'bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/80 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
          : 'bg-slate-900/80 border-white/10 shadow-lg'
      } p-4 sm:p-5 ${className}`}
    >
      {/* Dynamic Ambient Glow Behind Wave */}
      <div
        className={`absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 h-28 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          mode === 'paused'
            ? 'bg-amber-500/30'
            : mode === 'speaking'
            ? 'bg-emerald-500/25'
            : mode === 'listening'
            ? 'bg-amber-500/25'
            : 'bg-slate-600/10'
        }`}
      />

      <div className="relative z-10 flex flex-col gap-3">
        {/* Top Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            {/* Visual Icon with Radar Wave Aura */}
            <div className="relative flex items-center justify-center">
              {mode === 'paused' && (
                <span className="absolute w-9 h-9 rounded-full bg-amber-400/40 animate-pulse pointer-events-none" />
              )}
              {mode === 'speaking' && (
                <span className="absolute w-9 h-9 rounded-full bg-emerald-400/40 animate-wave-aura pointer-events-none" />
              )}
              {mode === 'listening' && (
                <span className="absolute w-9 h-9 rounded-full bg-amber-400/40 animate-wave-aura pointer-events-none" />
              )}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300 shadow-md ${
                  mode === 'paused'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 shadow-amber-500/30 font-black'
                    : mode === 'speaking'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/30'
                    : mode === 'listening'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border border-white/10'
                }`}
              >
                {mode === 'paused' ? (
                  pauseReason === 'gesture' ? (
                    <Hand className="w-5 h-5 text-slate-950" />
                  ) : (
                    <Pause className="w-5 h-5 text-slate-950 fill-current" />
                  )
                ) : mode === 'speaking' ? (
                  <Volume2 className="w-5 h-5 animate-pulse" />
                ) : mode === 'listening' ? (
                  <Mic className="w-5 h-5 animate-bounce" />
                ) : (
                  <Headphones className="w-5 h-5" />
                )}
              </div>
            </div>

            {/* Mode & Action Descriptive Label */}
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-all ${
                    mode === 'paused'
                      ? 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold shadow-sm'
                      : mode === 'speaking'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : mode === 'listening'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-white/10'
                  }`}
                >
                  {mode === 'paused'
                    ? pauseReason === 'gesture'
                      ? '✋ Pausado por Gesto'
                      : pauseReason === 'keyword'
                      ? '⏸️ Pausado por Palavra-Chave ("PAUSA")'
                      : '⏸️ Leitura Pausada'
                    : mode === 'speaking'
                    ? 'Lendo Instruções em Voz Alta'
                    : mode === 'listening'
                    ? 'Ouvindo Comandos de Voz'
                    : 'Aguardando Ação'}
                </span>

                <span className="text-[10px] font-mono text-slate-400">
                  Passo {currentStepIndex + 1}/{totalSteps}
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-0.5 font-medium flex items-center gap-1.5">
                {mode === 'paused' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                    <span className="text-amber-200">
                      Leitura pausada. Diga <strong>"Continuar"</strong> ou clique em <strong>Ouvir Passo</strong> para retomar.
                    </span>
                  </>
                ) : mode === 'speaking' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>Malu está narrando o passo. Fale <strong>"PAUSA"</strong> ou acene ✋ para interromper</span>
                  </>
                ) : mode === 'listening' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                    <span>Diga <strong>"Próximo"</strong>, <strong>"Pausa"</strong>, <strong>"Repetir"</strong> ou <strong>"Voltar"</strong></span>
                  </>
                ) : (
                  <span>Clique em "Ouvir Passo" ou ative o microfone para continuar</span>
                )}
              </p>
            </div>
          </div>

          {/* Real-Time Detected Command Pill & Listening Threshold Status */}
          <div className="flex items-center gap-2">
            {typeof voiceSensitivity === 'number' && (
              <button
                type="button"
                onClick={onOpenVoiceSettings}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 text-[10px] font-mono text-slate-300 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Configurar sensibilidade de detecção de voz"
              >
                <span className={`w-2 h-2 rounded-full ${isListening && !isPaused ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                <Sliders className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Limiar:</span>
                <span className="text-amber-300 font-bold">{voiceSensitivity}%</span>
              </button>
            )}

            <AnimatePresence>
              {recognizedCommand && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -5 }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/30 border border-emerald-300"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Comando: "{recognizedCommand.toUpperCase()}"</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- Central Audio Wave Animation Canvas --- */}
        <div className="relative py-2.5 px-3 rounded-xl bg-black/45 border border-white/10 flex items-center justify-between gap-1 sm:gap-1.5 overflow-hidden min-h-[56px]">
          {/* Subtle Grid / Equalizer Background Track Line */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/5 pointer-events-none" />

          {/* 24 Dynamic Audio Waveform Bars */}
          <div className="flex-1 flex items-center justify-around gap-1 sm:gap-1.5 h-10 px-1">
            {waveBars.map((multiplier, idx) => {
              // Staggered durations & delays for organic sound behavior
              const delay = (idx % 8) * 0.08;
              const duration = mode === 'speaking' ? 0.45 + (idx % 4) * 0.1 : 0.9 + (idx % 3) * 0.15;
              const maxBarHeight = 36 * multiplier;

              return (
                <div
                  key={`wave-bar-${idx}`}
                  className="flex-1 flex items-center justify-center h-full max-w-[8px]"
                >
                  <motion.div
                    className={`w-full rounded-full transition-colors duration-300 ${
                      mode === 'paused'
                        ? 'bg-gradient-to-t from-amber-500 via-orange-400 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                        : mode === 'speaking'
                        ? 'bg-gradient-to-t from-emerald-500 via-teal-400 to-amber-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : mode === 'listening'
                        ? 'bg-gradient-to-t from-amber-500 via-orange-400 to-rose-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                        : 'bg-slate-700/60'
                    }`}
                    animate={
                      mode === 'paused'
                        ? {
                            height: [
                              Math.max(6, maxBarHeight * 0.35),
                              Math.max(8, maxBarHeight * 0.42),
                              Math.max(6, maxBarHeight * 0.35)
                            ],
                            opacity: [0.6, 0.85, 0.6]
                          }
                        : mode === 'speaking'
                        ? {
                            height: [8, maxBarHeight, 6, maxBarHeight * 0.8, 8],
                            opacity: [0.6, 1, 0.7, 0.95, 0.6]
                          }
                        : mode === 'listening'
                        ? {
                            height: [
                              Math.max(6, maxBarHeight * 0.3),
                              Math.max(12, maxBarHeight * 0.75),
                              Math.max(6, maxBarHeight * 0.3)
                            ],
                            opacity: [0.5, 0.9, 0.5]
                          }
                        : {
                            height: 6,
                            opacity: 0.3
                          }
                    }
                    transition={{
                      repeat: Infinity,
                      repeatType: 'reverse',
                      duration: mode === 'paused' ? 1.4 : duration,
                      delay: delay,
                      ease: 'easeInOut'
                    }}
                    style={{ minHeight: '4px' }}
                  />
                </div>
              );
            })}
          </div>

          {/* Live Waveform Status Tag on the Right */}
          <div className="shrink-0 flex items-center gap-1.5 pl-3 border-l border-white/10">
            <span
              className={`w-2 h-2 rounded-full ${
                mode === 'paused'
                  ? 'bg-amber-400 animate-pulse'
                  : mode === 'speaking'
                  ? 'bg-emerald-400 animate-ping'
                  : mode === 'listening'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-500'
              }`}
            />
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-slate-400 hidden sm:inline">
              {mode === 'paused' ? 'Pausado' : mode === 'speaking' ? 'Fala Ativa' : mode === 'listening' ? 'Voz Ativa' : 'Standby'}
            </span>
          </div>
        </div>

        {/* Live Heard Transcript / Mic Guidance */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-[11px] font-mono text-slate-400">Captura de voz:</span>
            <span className="italic font-medium text-slate-200">
              "{voiceTranscript || (mode === 'speaking' ? 'Lendo o passo atual...' : mode === 'paused' ? 'Leitura pausada. Diga "Continuar" para retomar' : 'Aguardando você falar...')}"
            </span>
          </div>

          {/* Quick Voice Command Simulation Buttons (ideal for hands-busy or testing keyword & gesture pause) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:inline">
              Testar:
            </span>

            {/* Keyword Pause Button ("PAUSA") */}
            {onSimulateCommand && (
              <button
                type="button"
                onClick={() => onSimulateCommand('pausa')}
                className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-black transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
                title="Simular palavra-chave de pausa imediata: 'PAUSA'"
              >
                <Pause className="w-3 h-3 fill-current" />
                <span>"PAUSA"</span>
              </button>
            )}

            {/* Gesture Pause Simulation Button */}
            {onSimulateGesture && (
              <button
                type="button"
                onClick={onSimulateGesture}
                className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-[11px] font-black transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
                title="Simular pausa por gesto de mão / aceno"
              >
                <Hand className="w-3 h-3" />
                <span>Aceno ✋</span>
              </button>
            )}

            {onSimulateCommand && (
              <>
                <button
                  type="button"
                  onClick={() => onSimulateCommand('continuar')}
                  className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  title="Simular comando de voz: Continuar / Retomar"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>"Continuar"</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateCommand('próximo')}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-slate-200 transition-all active:scale-95 cursor-pointer"
                  title="Simular comando de voz: Próximo"
                >
                  "Próximo"
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateCommand('repetir')}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-slate-200 transition-all active:scale-95 cursor-pointer"
                  title="Simular comando de voz: Repetir"
                >
                  "Repetir"
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateCommand('voltar')}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-slate-200 transition-all active:scale-95 cursor-pointer"
                  title="Simular comando de voz: Voltar"
                >
                  "Voltar"
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateCommand('repetir ingrediente')}
                  className="px-2 py-0.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                  title="Simular comando de voz: Repetir Ingredientes"
                >
                  "Ingredientes"
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default HandsFreeWaveIndicator;
