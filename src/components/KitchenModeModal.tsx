import React, { useState, useEffect, useRef } from 'react';
import { ChefHat, X, ChevronLeft, ChevronRight, RotateCcw, Volume2, VolumeX, Mic, HelpCircle, BookOpen, Clock, Play, Pause, Square, Plus, CheckCircle2, BellRing, Sparkles } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

interface KitchenModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeTitle: string;
  instructions: string[];
  ingredients?: string[];
  prepTime?: string;
  calories?: number;
}

export function KitchenModeModal({
  isOpen,
  onClose,
  recipeTitle,
  instructions = [],
  ingredients = [],
  prepTime,
  calories,
}: KitchenModeModalProps) {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [recognizedCommand, setRecognizedCommand] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Timer states
  const [timerTotalSeconds, setTimerTotalSeconds] = useState<number | null>(null);
  const [timerRemainingSeconds, setTimerRemainingSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isTimerCompleted, setIsTimerCompleted] = useState<boolean>(false);
  const [timerLabel, setTimerLabel] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const activeStepRef = useRef(0);
  const isOpenRef = useRef(isOpen);

  activeStepRef.current = currentStepIndex;
  isOpenRef.current = isOpen;

  const totalSteps = instructions.length;

  // Speak text aloud using Malu Aoede voice
  const speakText = (text: string) => {
    stopSpeech();
    setIsSpeaking(true);
    speak(text, {
      voice: 'Aoede',
      onEnded: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  // Speak current step
  const speakCurrentStep = (stepIdx: number) => {
    if (!instructions || instructions.length === 0 || stepIdx < 0 || stepIdx >= instructions.length) return;
    const stepNum = stepIdx + 1;
    const textToSpeak = `Passo ${stepNum} de ${instructions.length}: ${instructions[stepIdx]}`;
    speakText(textToSpeak);
  };

  // Start timer helper
  const startTimer = (minutes: number, customLabel?: string) => {
    const seconds = Math.max(5, Math.round(minutes * 60));
    setTimerTotalSeconds(seconds);
    setTimerRemainingSeconds(seconds);
    setIsTimerRunning(true);
    setIsTimerCompleted(false);
    setTimerLabel(customLabel || `Timer de ${minutes} min`);

    speakText(`Temporizador de ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} iniciado!`);
    playSfx('success');
    vibrate(30);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
    playSfx('tap');
    vibrate(10);
  };

  const handleResumeTimer = () => {
    if (timerRemainingSeconds > 0) {
      setIsTimerRunning(true);
      playSfx('tap');
      vibrate(10);
    }
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerTotalSeconds(null);
    setTimerRemainingSeconds(0);
    setIsTimerCompleted(false);
    setTimerLabel('');
    playSfx('tap');
  };

  const handleAddTimerMinute = () => {
    if (timerTotalSeconds !== null) {
      setTimerTotalSeconds(prev => (prev || 0) + 60);
      setTimerRemainingSeconds(prev => prev + 60);
      playSfx('tap');
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      playSfx('tap');
      vibrate(15);
      speakCurrentStep(nextIdx);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      playSfx('tap');
      vibrate(12);
      speakCurrentStep(prevIdx);
    }
  };

  const handleRepeatStep = () => {
    playSfx('pop');
    vibrate(15);
    speakCurrentStep(currentStepIndex);
  };

  const handleStopSpeech = () => {
    stopSpeech();
    setIsSpeaking(false);
    playSfx('tap');
  };

  // Timer countdown ticker effect
  useEffect(() => {
    if (!isTimerRunning || timerRemainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimerRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTimerRunning(false);
          setIsTimerCompleted(true);
          
          playSfx('success');
          vibrate(50);
          speakText('Tempo esgotado! O temporizador do seu preparo finalizou.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, timerRemainingSeconds]);

  // Process raw transcript for step navigation AND automatic timer commands
  const processTranscript = (rawText: string) => {
    const text = rawText.toLowerCase().trim();
    setVoiceTranscript(rawText);

    // 1. Timer Voice Recognition: e.g. "cozinhar por 10 minutos", "timer de 5 minutos", "temporizador 15 min"
    const timerMatch = text.match(/(?:cozinhar|ferver|assar|cozer|deixar|esperar|timer|temporizador|cronômetro|cook|set timer)\s*(?:por|de|em)?\s*(\d+)\s*(?:minuto|minutos|min|m|minute|minutes)/i) ||
                       text.match(/(\d+)\s*(?:minutos|minuto|min)\s*(?:de timer|no temporizador)/i);

    if (timerMatch && timerMatch[1]) {
      const mins = parseInt(timerMatch[1], 10);
      if (!isNaN(mins) && mins > 0) {
        setRecognizedCommand(`TIMER DE ${mins} MIN`);
        startTimer(mins, `Cozinhar por ${mins} min`);
        return;
      }
    }

    // 2. Control active timer commands
    if (text.includes('pausar timer') || text.includes('parar timer') || text.includes('pause timer')) {
      setRecognizedCommand('PAUSAR TIMER');
      handlePauseTimer();
      return;
    }

    if (text.includes('retomar timer') || text.includes('continuar timer') || text.includes('resume timer')) {
      setRecognizedCommand('RETOMAR TIMER');
      handleResumeTimer();
      return;
    }

    if (text.includes('cancelar timer') || text.includes('zerar timer') || text.includes('reset timer')) {
      setRecognizedCommand('CANCELAR TIMER');
      handleResetTimer();
      return;
    }

    // 3. Next Step voice triggers: 'próximo', 'next', 'avançar', 'continua'
    if (
      text.includes('próximo') ||
      text.includes('proximo') ||
      text.includes('avançar') ||
      text.includes('avancar') ||
      text.includes('next') ||
      text.includes('continua') ||
      text.includes('seguinte')
    ) {
      setRecognizedCommand('PRÓXIMO PASSO');
      if (activeStepRef.current < totalSteps - 1) {
        const nextIdx = activeStepRef.current + 1;
        setCurrentStepIndex(nextIdx);
        playSfx('tap');
        vibrate(20);
        speakCurrentStep(nextIdx);
      }
      return;
    }

    // 4. Previous Step voice triggers: 'voltar', 'anterior', 'atrás', 'back', 'previous'
    if (
      text.includes('voltar') ||
      text.includes('anterior') ||
      text.includes('atrás') ||
      text.includes('atras') ||
      text.includes('back') ||
      text.includes('previous')
    ) {
      setRecognizedCommand('PASSO ANTERIOR');
      if (activeStepRef.current > 0) {
        const prevIdx = activeStepRef.current - 1;
        setCurrentStepIndex(prevIdx);
        playSfx('tap');
        vibrate(20);
        speakCurrentStep(prevIdx);
      }
      return;
    }

    // 5. Repeat Step voice triggers: 'repetir', 'de novo', 'novamente', 'repeat', 'ouvir'
    if (
      text.includes('repetir') ||
      text.includes('de novo') ||
      text.includes('novamente') ||
      text.includes('repeat') ||
      text.includes('ouvir') ||
      text.includes('ler')
    ) {
      setRecognizedCommand('REPETIR PASSO');
      playSfx('pop');
      vibrate(20);
      speakCurrentStep(activeStepRef.current);
      return;
    }

    // 6. Pause / Stop speech triggers: 'parar', 'pausar', 'silêncio', 'stop', 'pause'
    if (
      text.includes('parar voz') ||
      text.includes('pausar voz') ||
      text.includes('silêncio') ||
      text.includes('silencio') ||
      text.includes('stop speech')
    ) {
      setRecognizedCommand('PAUSAR ÁUDIO');
      stopSpeech();
      setIsSpeaking(false);
      playSfx('tap');
      return;
    }
  };

  // Setup Web Speech API continuous recognition when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopSpeech();
      setIsSpeaking(false);
      setIsTimerRunning(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      return;
    }

    // Reset state and read first step aloud upon entering Kitchen Mode
    setCurrentStepIndex(0);
    speakCurrentStep(0);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Microfone não suportado diretamente pelo navegador. Utilize os botões do simulador de voz.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          processTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error in KitchenMode:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Acesso ao microfone foi negado. Habilite a permissão de microfone nas configurações.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically restart speech recognition if kitchen mode remains open
        if (isOpenRef.current) {
          setTimeout(() => {
            if (isOpenRef.current && recognitionRef.current) {
              try { recognitionRef.current.start(); } catch (e) {}
            }
          }, 300);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Could not initialize SpeechRecognition:', err);
    }

    return () => {
      stopSpeech();
      setIsSpeaking(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStepText = instructions[currentStepIndex] || '';
  const progressPercent = totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 0;

  // Detect time mentioned in current step text (e.g. "10 minutos")
  const stepTimeMatch = currentStepText.match(/(\d+)\s*(?:minutos|minuto|min)/i);
  const detectedStepMinutes = stepTimeMatch ? parseInt(stepTimeMatch[1], 10) : null;

  // Format timer MM:SS
  const timerMins = Math.floor(timerRemainingSeconds / 60);
  const timerSecs = timerRemainingSeconds % 60;
  const formattedTimer = `${String(timerMins).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`;
  const timerPercent = timerTotalSeconds ? Math.min(100, Math.max(0, (timerRemainingSeconds / timerTotalSeconds) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-950 text-white animate-in fade-in duration-300 overflow-hidden font-sans select-none">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <ChefHat className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                {t('kitchen_mode', 'Modo Cozinha')}
              </span>
              {isListening && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Voz Ativa
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-xs sm:max-w-md mt-0.5">
              {recipeTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {ingredients && ingredients.length > 0 && (
            <button
              onClick={() => setShowIngredients(!showIngredients)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                showIngredients
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{t('ingredients', 'Ingredientes')}</span>
            </button>
          )}

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all"
            title="Ajuda com comandos de voz"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">{t('exit_kitchen_mode', 'Sair')}</span>
          </button>
        </div>
      </header>

      {/* Main Maximized Content Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Ingredients Drawer (Slide-in) */}
        {showIngredients && (
          <aside className="w-full md:w-80 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-6 overflow-y-auto shrink-0 animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {t('ingredients', 'Ingredientes')} ({ingredients.length})
              </h3>
              <button
                onClick={() => setShowIngredients(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-2.5">
              {ingredients.map((ing, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{ing}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Center Giant Step Display Area */}
        <main className="flex-1 flex flex-col justify-between p-6 sm:p-10 max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar">
          {/* Progress Header & Counter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-2 text-amber-400 font-bold">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                {t('step_x_of_y', `Passo ${currentStepIndex + 1} de ${totalSteps}`).replace('{{current}}', (currentStepIndex + 1).toString()).replace('{{total}}', totalSteps.toString())}
              </span>
              <span>{progressPercent}% concluído</span>
            </div>

            {/* Glowing Step Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-300 transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* ACTIVE VOICE TIMER BAR OVER INSTRUCTIONS */}
          {(timerTotalSeconds !== null || isTimerCompleted) && (
            <div className="my-4 p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isTimerCompleted ? 'bg-rose-500 text-white animate-bounce' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                    <Clock className={`w-8 h-8 ${isTimerRunning ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-400 block">
                      {isTimerCompleted ? '⏰ TEMPO COMPLETADO!' : (timerLabel || 'Temporizador de Cozinha')}
                    </span>
                    <span className="font-mono text-4xl sm:text-5xl font-black text-white tracking-tight">
                      {isTimerCompleted ? '00:00' : formattedTimer}
                    </span>
                  </div>
                </div>

                {/* Timer Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {!isTimerCompleted && (
                    <>
                      {isTimerRunning ? (
                        <button
                          onClick={handlePauseTimer}
                          className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2"
                        >
                          <Pause className="w-4 h-4" />
                          <span>Pausar</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleResumeTimer}
                          className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          <span>Retomar</span>
                        </button>
                      )}

                      <button
                        onClick={handleAddTimerMinute}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1"
                        title="Adicionar +1 Minuto"
                      >
                        <Plus className="w-4 h-4" />
                        <span>1m</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleResetTimer}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>{isTimerCompleted ? 'Fechar' : 'Cancelar'}</span>
                  </button>
                </div>
              </div>

              {/* Timer Progress Bar overlayed over instruction card */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-4 border border-slate-700">
                <div
                  className={`h-full transition-all duration-1000 ${
                    isTimerCompleted
                      ? 'bg-rose-500 shadow-[0_0_12px_#ef4444]'
                      : 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                  }`}
                  style={{ width: `${isTimerCompleted ? 100 : timerPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick Timer Triggers when step text mentions a duration */}
          {detectedStepMinutes && timerTotalSeconds === null && !isTimerCompleted && (
            <div className="my-2 flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-in fade-in duration-300">
              <span className="flex items-center gap-2 font-medium">
                <Clock className="w-4 h-4 text-amber-400 animate-bounce" />
                Tempo de preparo detectado neste passo: <strong>{detectedStepMinutes} minutos</strong>
              </span>
              <button
                onClick={() => startTimer(detectedStepMinutes, `Passo ${currentStepIndex + 1} (${detectedStepMinutes} min)`)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95"
              >
                ⏱️ Iniciar {detectedStepMinutes} min
              </button>
            </div>
          )}

          {/* Maximized Instruction Text Box */}
          <div className="my-6 my-auto space-y-6">
            <div className="p-8 sm:p-12 rounded-[36px] bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-4 left-6 text-6xl font-black text-slate-800/40 font-mono pointer-events-none select-none">
                #{currentStepIndex + 1}
              </div>

              <p className="relative text-2xl sm:text-3xl md:text-4xl font-sans font-medium text-slate-100 leading-relaxed sm:leading-snug tracking-normal pt-4">
                {currentStepText}
              </p>

              {/* Audio Playback State Pill */}
              <div className="mt-8 flex items-center justify-between border-t border-slate-800/80 pt-6">
                <button
                  onClick={() => isSpeaking ? handleStopSpeech() : speakCurrentStep(currentStepIndex)}
                  className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-xs font-bold transition-all border ${
                    isSpeaking
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-500/20 animate-pulse'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-5 h-5 text-rose-400" />
                      <span>Parar Áudio</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5 text-emerald-400" />
                      <span>Ouvir este Passo (Voz Malu)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleRepeatStep}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Repetir Passo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Preset Timers row */}
          <div className="my-3 flex flex-wrap items-center gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Presets de Timer:
            </span>
            {[1, 3, 5, 10, 15, 20].map((m) => (
              <button
                key={m}
                onClick={() => startTimer(m, `Timer ${m} min`)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/40 text-slate-200 hover:text-amber-300 font-mono text-xs font-bold transition-all active:scale-95"
              >
                +{m} min
              </button>
            ))}
          </div>

          {/* Live Voice Microphone Status Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className={`w-4 h-4 ${isListening ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {isListening ? '🎙️ Escutando Comandos de Voz em Português' : 'Aguardando Ativação do Microfone'}
                </span>
              </div>
              {recognizedCommand && (
                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-widest animate-bounce">
                  {recognizedCommand}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 italic">
              "{voiceTranscript || t('timer_voice_tip', 'Diga "cozinhar por 10 minutos" ou "timer de 5 min"')}"
            </p>

            {speechError && (
              <p className="text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                ⚠️ {speechError}
              </p>
            )}

            {showHelp && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="font-bold text-amber-400 block">"Cozinhar por 10 min"</span>
                  <span className="text-slate-400 text-[10px]">Inicia timer 10 minutos</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="font-bold text-amber-400 block">"Timer de 5 minutos"</span>
                  <span className="text-slate-400 text-[10px]">Inicia timer 5 minutos</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="font-bold text-amber-400 block">"Próximo passo"</span>
                  <span className="text-slate-400 text-[10px]">Avançar instrução</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="font-bold text-amber-400 block">"Voltar passo"</span>
                  <span className="text-slate-400 text-[10px]">Retornar instrução</span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Bottom Giant Action Bar */}
      <footer className="p-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4 shrink-0">
        <button
          onClick={handlePrevStep}
          disabled={currentStepIndex === 0}
          className="flex-1 py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-3 transition-all border disabled:opacity-30 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-700 border-slate-700 text-white"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>{t('previous_step', 'Passo Anterior')}</span>
        </button>

        <button
          onClick={handleRepeatStep}
          className="py-4 px-6 rounded-2xl font-bold text-sm bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hidden sm:flex items-center gap-2 transition-all active:scale-95"
        >
          <RotateCcw className="w-5 h-5" />
          <span>{t('repeat_step', 'Repetir')}</span>
        </button>

        <button
          onClick={handleNextStep}
          disabled={currentStepIndex === totalSteps - 1}
          className="flex-1 py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-3 transition-all border disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black shadow-lg shadow-emerald-500/20 active:scale-95"
        >
          <span>{t('next_step', 'Próximo Passo')}</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
}
