import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, X, Bell, Volume2, VolumeX, Timer as TimerIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RecipeStepTimerProps {
  stepText: string;
  stepIndex: number;
  recipeName: string;
}

// Utility to parse duration from step text
export function parseStepDuration(text: string): number | null {
  if (!text) return null;
  
  // Look for patterns like "10 minutos", "5 min", "15min"
  const minMatch = text.match(/(\d+)\s*(?:minutos|minutos|min|mins|m)\b/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10) * 60;
  }
  
  // Look for patterns like "30 segundos", "20 seg", "45s"
  const secMatch = text.match(/(\d+)\s*(?:segundos|segundo|seg|s)\b/i);
  if (secMatch) {
    return parseInt(secMatch[1], 10);
  }

  // Look for patterns like "1 hora", "2 horas", "1.5 h"
  const hourMatch = text.match(/(\d+)\s*(?:horas|hora|h)\b/i);
  if (hourMatch) {
    return parseInt(hourMatch[1], 10) * 3600;
  }

  return null;
}

export function RecipeStepTimer({ stepText, stepIndex, recipeName }: RecipeStepTimerProps) {
  const parsedSeconds = parseStepDuration(stepText);
  const defaultSeconds = parsedSeconds || 300; // default to 5 minutes if not found

  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(defaultSeconds);
  const [timeLeft, setTimeLeft] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with parsed duration on component load
  useEffect(() => {
    if (parsedSeconds) {
      setDuration(parsedSeconds);
      setTimeLeft(parsedSeconds);
    }
  }, [stepText]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer interval countdown
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsCompleted(true);
            triggerAlarm();
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Synthesize alarm chime sound using Web Audio API
  const triggerAlarm = () => {
    // 1. Dispatch app-wide notification
    window.dispatchEvent(new CustomEvent('app:notification', {
      detail: {
        title: `Tempo Esgotado! ⏱️`,
        message: `O timer do passo ${stepIndex + 1} de "${recipeName}" foi concluído!`,
        type: 'success'
      }
    }));

    // 2. Play synthesized chime if not muted
    if (!isMuted) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playBeep = (time: number, freq: number, durationSec: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          
          gain.gain.setValueAtTime(0.35, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + durationSec - 0.02);
          
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.start(time);
          osc.stop(time + durationSec);
        };

        const now = audioCtx.currentTime;
        // Alarm chime sequence: beep beep beep!
        playBeep(now, 880, 0.15); // A5
        playBeep(now + 0.2, 880, 0.15);
        playBeep(now + 0.4, 1109, 0.4); // C#6
      } catch (err) {
        console.warn("Failed to synthesize chime alarm:", err);
      }
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    setIsCompleted(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(duration);
    setIsCompleted(false);
  };

  const adjustTime = (amountSeconds: number) => {
    setTimeLeft((prev) => {
      const nextValue = Math.max(0, prev + amountSeconds);
      // If timer is not running, adjust total duration as well
      if (!isRunning) {
        setDuration(nextValue);
      }
      return nextValue;
    });
    setIsCompleted(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const parts = [];
    if (h > 0) parts.push(String(h).padStart(2, '0'));
    parts.push(String(m).padStart(2, '0'));
    parts.push(String(s).padStart(2, '0'));

    return parts.join(':');
  };

  // Progress percentage
  const progress = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0;

  return (
    <div className="mt-2 flex flex-col items-start w-full">
      {/* Collapse/Expand state badge/button */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105 cursor-pointer ${
            parsedSeconds 
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          id={`btn-open-timer-${stepIndex}`}
        >
          <TimerIcon className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin duration-1000' : ''}`} />
          <span>
            {isRunning ? `Executando: ${formatTime(timeLeft)}` : parsedSeconds ? `Timer: ${formatTime(duration)}` : '+ Adicionar Timer'}
          </span>
          {isRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          )}
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 mt-2 shadow-sm space-y-3"
          id={`timer-panel-${stepIndex}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TimerIcon className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Timer do Passo {stepIndex + 1}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? "Ativar som" : "Desativar som"}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Countdown clock visualizer */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-14 h-14 rounded-full border-4 border-slate-200 dark:border-slate-800 shrink-0">
                {/* SVG circular progress indicator */}
                <svg className="absolute w-full h-full transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="transparent"
                    stroke={isCompleted ? "#10b981" : "#10b981"}
                    strokeWidth="4"
                    strokeDasharray="150.7"
                    strokeDashoffset={150.7 - (150.7 * progress) / 100}
                    className="transition-all duration-300"
                  />
                </svg>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  {Math.round(progress)}%
                </span>
              </div>

              <div className="text-left">
                <div className={`font-mono text-3xl font-black tracking-tight leading-none ${
                  isCompleted 
                    ? 'text-emerald-500 animate-pulse' 
                    : isRunning 
                      ? 'text-slate-800 dark:text-white' 
                      : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {formatTime(timeLeft)}
                </div>
                {isCompleted && (
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1 block">Pronto!</span>
                )}
              </div>
            </div>

            {/* Interaction buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustTime(-60)}
                disabled={timeLeft <= 0}
                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full transition-colors active:scale-95 disabled:opacity-50"
                title="Subtrair 1 minuto"
                id={`btn-minus-${stepIndex}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={() => adjustTime(60)}
                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full transition-colors active:scale-95"
                title="Adicionar 1 minuto"
                id={`btn-plus-${stepIndex}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={toggleTimer}
                disabled={timeLeft <= 0 && !isCompleted}
                className={`px-4 py-2 text-white font-bold text-xs rounded-full transition-all active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer ${
                  isRunning 
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10' 
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
                }`}
                id={`btn-play-pause-${stepIndex}`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Iniciar
                  </>
                )}
              </button>

              <button
                onClick={resetTimer}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full transition-colors active:scale-95"
                title="Reiniciar timer"
                id={`btn-reset-${stepIndex}`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
