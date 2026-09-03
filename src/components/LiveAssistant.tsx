import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Loader2, 
  Waves
} from 'lucide-react';
import { UserProfile } from '../types';
import { chatWithAssistant } from '../lib/gemini';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

interface LiveAssistantProps {
  profile: UserProfile | null;
}

// Inactivity timeout in milliseconds (8 seconds of silence closes the session)
const INACTIVITY_TIMEOUT_MS = 8000;

// Compute time-appropriate greeting in Brazilian Portuguese:
// "Olá, [bom dia / boa tarde / boa noite]! Eu sou a Malu. No que posso te ajudar?"
function getTimeGreeting(profile?: UserProfile | null): string {
  const currentHour = new Date().getHours();
  let timeGreeting = "boa noite";
  if (currentHour >= 5 && currentHour < 12) {
    timeGreeting = "bom dia";
  } else if (currentHour >= 12 && currentHour < 18) {
    timeGreeting = "boa tarde";
  }

  const rawName = profile?.name?.trim();
  const firstName = rawName && !['usuário', 'usuario', 'amigo', 'amiga', 'amigo(a)', ''].includes(rawName.toLowerCase())
    ? rawName.split(' ')[0]
    : null;

  const namePrefix = firstName ? `, ${firstName}` : '';
  return `Olá, ${timeGreeting}${namePrefix}! Eu sou a Malu. No que posso te ajudar?`;
}

export function LiveAssistant({ profile }: LiveAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusText, setStatusText] = useState<string | null>(null);

  // References
  const recognitionRef = useRef<any>(null);
  const statusTimerRef = useRef<any>(null);
  const inactivityTimerRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Synchronize ref flags for callbacks
  useEffect(() => {
    isListeningRef.current = isListening;
    isSpeakingRef.current = isSpeaking;
    isProcessingRef.current = isProcessing;
  }, [isListening, isSpeaking, isProcessing]);

  const showStatus = useCallback((text: string, autoHideMs = 4000) => {
    setStatusText(text);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (autoHideMs > 0) {
      statusTimerRef.current = setTimeout(() => {
        setStatusText(null);
      }, autoHideMs);
    }
  }, []);

  // Clear the inactivity timeout
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  // Stop everything and close connection
  const stopAll = useCallback(() => {
    clearInactivityTimer();
    stopSpeech();
    setIsSpeaking(false);
    setIsListening(false);
    setIsProcessing(false);

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
  }, [clearInactivityTimer]);

  // Handler for inactivity timeout
  const handleInactivityTimeout = useCallback(() => {
    if (isListeningRef.current) {
      console.info("[InactivityMonitor] Sessão de voz encerrada automaticamente por inatividade.");
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      showStatus('Sessão encerrada por inatividade', 3500);
      playSfx('pop');
    }
  }, [showStatus]);

  // Start or reset the inactivity timer
  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      handleInactivityTimeout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer, handleInactivityTimeout]);

  // Forward declaration of startListening
  const startListeningRef = useRef<() => void>(() => {});

  // Send user query to Malu and speak reply
  const handleUserQuery = useCallback(async (queryText: string) => {
    if (!queryText || !queryText.trim() || isProcessingRef.current) return;

    clearInactivityTimer();
    stopSpeech();
    setIsSpeaking(false);
    setIsListening(false);
    setIsProcessing(true);
    showStatus('Malu pensando...', 0);

    try {
      const defaultProfile: UserProfile = profile || {
        name: 'Usuário',
        age: 30,
        gender: 'Outro',
        weight: 70,
        height: 170,
        activityLevel: 'Moderado',
        goals: 'Alimentação saudável, energia e bem-estar',
        routine: 'Trabalho e rotina ativa',
        restrictions: [],
        allergies: [],
        equipment: [],
        waterGoal: 2000,
        targetWeight: 68,
        points: 100,
        badges: []
      };

      const res = await chatWithAssistant(defaultProfile, [], queryText.trim());
      const replyText = res?.text || "Estou aqui com você! Como posso te ajudar na sua alimentação hoje?";

      setIsProcessing(false);
      setIsSpeaking(true);
      showStatus('Malu falando...', 0);

      // Play voice in Brazilian Portuguese (Aoede)
      await speak(replyText, {
        onEnded: () => {
          setIsSpeaking(false);
          // Seamlessly transition back to listening with inactivity monitor active
          showStatus('Ouvindo você...', 0);
          startListeningRef.current();
        },
        onError: () => {
          setIsSpeaking(false);
          setStatusText(null);
        }
      });

    } catch (err: any) {
      console.warn("Assistant voice error:", err);
      setIsProcessing(false);
      setIsSpeaking(false);
      showStatus('Tente falar novamente', 3000);
    }
  }, [clearInactivityTimer, profile, showStatus]);

  // Web Speech Recognition setup
  const initSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        showStatus('Ouvindo você...', 0);
        setTranscript('');
        // Start inactivity monitor when recognition starts
        resetInactivityTimer();
      };

      recognition.onresult = (event: any) => {
        // Reset inactivity timer upon voice detection
        resetInactivityTimer();
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        clearInactivityTimer();
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showStatus('Permissão de microfone necessária', 3500);
        } else if (event.error === 'no-speech') {
          // No speech detected during window, shut down cleanly
          showStatus('Sessão encerrada por silêncio', 3000);
        } else {
          showStatus('Não entendi, tente novamente', 3000);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        clearInactivityTimer();
        setIsListening(false);
      };

      return recognition;
    } catch (e) {
      console.warn('Speech recognition init error:', e);
      return null;
    }
  }, [clearInactivityTimer, resetInactivityTimer, showStatus]);

  // Start listening
  const startListening = useCallback(() => {
    clearInactivityTimer();
    stopSpeech();
    setIsSpeaking(false);

    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition();
    }

    if (recognitionRef.current) {
      try {
        setTranscript('');
        recognitionRef.current.start();
        playSfx('pop');
        vibrate(15);
        resetInactivityTimer();
      } catch (err) {
        recognitionRef.current = initSpeechRecognition();
        try {
          recognitionRef.current?.start();
          resetInactivityTimer();
        } catch (e) {
          showStatus('Toque para falar', 2000);
        }
      }
    } else {
      showStatus('Reconhecimento de voz indisponível', 3000);
    }
  }, [clearInactivityTimer, initSpeechRecognition, resetInactivityTimer, showStatus]);

  startListeningRef.current = startListening;

  // Speak initial greeting then start listening loop
  const speakGreetingAndListen = useCallback(async (greetingText: string) => {
    clearInactivityTimer();
    setIsProcessing(false);
    setIsListening(false);
    setIsSpeaking(true);
    showStatus('Malu falando...', 0);

    await speak(greetingText, {
      onEnded: () => {
        setIsSpeaking(false);
        showStatus('Ouvindo você...', 0);
        startListening();
      },
      onError: () => {
        setIsSpeaking(false);
        startListening();
      }
    });
  }, [clearInactivityTimer, showStatus, startListening]);

  // Toggle voice button
  const handleButtonClick = () => {
    playSfx('tap');
    vibrate(20);

    if (isSpeaking || isListening) {
      // If currently speaking or listening, stop session
      stopAll();
      showStatus('Assistente pausada', 2000);
      return;
    }

    // 1 Tap: Greet with time of day, name, and Malu introduction, then auto-listen
    const greetingText = getTimeGreeting(profile);
    speakGreetingAndListen(greetingText);
  };

  // Listen for custom open event
  useEffect(() => {
    const handleOpen = () => {
      const greetingText = getTimeGreeting(profile);
      speakGreetingAndListen(greetingText);
    };
    window.addEventListener('app:openLiveAssistant', handleOpen);
    return () => {
      window.removeEventListener('app:openLiveAssistant', handleOpen);
      stopAll();
    };
  }, [profile, speakGreetingAndListen, stopAll]);

  // Process transcript when listening ends with content
  useEffect(() => {
    if (!isListening && transcript.trim() && !isProcessing) {
      const timer = setTimeout(() => {
        handleUserQuery(transcript);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, isProcessing, handleUserQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInactivityTimer();
      stopSpeech();
    };
  }, [clearInactivityTimer]);

  return (
    <div className="fixed bottom-5 left-5 z-50 flex items-center gap-3">
      {/* Floating Microphone Button with Slim & Subtle Rotating Neon Glow Ring */}
      <div className="relative group p-1 flex items-center justify-center">
        {/* Soft, Subtle Ambient Glow (refined opacity and blur) */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full blur-[4px] opacity-40 group-hover:opacity-60 transition-all duration-500 pointer-events-none ${
            isListening
              ? 'bg-[conic-gradient(from_0deg,#ff0055,#ff5500,#ff0055)] opacity-60 blur-[5px]'
              : isSpeaking
              ? 'bg-[conic-gradient(from_0deg,#00ffcc,#00ff66,#00ccff,#00ffcc)] opacity-60 blur-[5px]'
              : isProcessing
              ? 'bg-[conic-gradient(from_0deg,#ffaa00,#ffdd00,#ff6600,#ffaa00)] opacity-60 blur-[5px]'
              : 'bg-[conic-gradient(from_0deg,#00f2fe,#4facfe,#00ff88,#00f2fe)]'
          }`}
        />

        {/* Ultra-Slim (1.5px) Rotating Neon Border */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full p-[1.5px] transition-all duration-500 pointer-events-none ${
            isListening
              ? 'bg-[conic-gradient(from_0deg,#ff0055,#ff7700,#ff0077)]'
              : isSpeaking
              ? 'bg-[conic-gradient(from_0deg,#00ffcc,#10b981,#06b6d4,#00ffcc)]'
              : isProcessing
              ? 'bg-[conic-gradient(from_0deg,#f59e0b,#fbbf24,#ea580c,#f59e0b)]'
              : 'bg-[conic-gradient(from_0deg,#06b6d4,#10b981,#3b82f6,#06b6d4)]'
          }`}
        >
          <div className="w-full h-full rounded-full bg-transparent" />
        </motion.div>

        {/* Main Floating Button */}
        <motion.button
          id="malu-live-assistant-fab-btn"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleButtonClick}
          disabled={isProcessing}
          className={`relative z-10 w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
            isListening
              ? 'bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-rose-500/50'
              : isSpeaking
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-emerald-500/50'
              : isProcessing
              ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/50'
              : 'bg-gradient-to-tr from-slate-900 via-teal-950 to-slate-900 text-teal-300 shadow-teal-500/40 border border-teal-500/40 hover:text-white hover:border-teal-300'
          }`}
          title={
            isSpeaking 
              ? "Toque para interromper a fala da Malu" 
              : isListening 
              ? "Ouvindo você... Toque para pausar" 
              : isProcessing 
              ? "Malu pensando..." 
              : "Falar com a Assistente Malu (Voz)"
          }
        >
          {/* Animated pulse halo while active */}
          {(isListening || isSpeaking || isProcessing) && (
            <motion.div
              animate={{
                scale: [1, 1.45, 1],
                opacity: [0.7, 0, 0.7]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={`absolute inset-0 rounded-full ${
                isListening ? 'bg-rose-400/40' : isSpeaking ? 'bg-emerald-400/40' : 'bg-amber-400/40'
              }`}
            />
          )}

          {isProcessing ? (
            <Loader2 className="w-6 h-6 md:w-7 md:h-7 animate-spin text-white" />
          ) : isSpeaking ? (
            <Waves className="w-6 h-6 md:w-7 md:h-7 text-white animate-pulse" />
          ) : isListening ? (
            <Mic className="w-6 h-6 md:w-7 md:h-7 text-white animate-bounce" />
          ) : (
            <Mic className="w-6 h-6 md:w-7 md:h-7" />
          )}
        </motion.button>
      </div>

      {/* Discreet floating status pill */}
      <AnimatePresence>
        {(statusText || transcript) && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.9 }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md border max-w-[240px] truncate ${
              isListening
                ? 'bg-rose-600/90 text-white border-rose-400/40'
                : isSpeaking
                ? 'bg-emerald-600/90 text-white border-emerald-400/40'
                : isProcessing
                ? 'bg-amber-600/90 text-white border-amber-400/40'
                : 'bg-slate-900/80 text-white border-slate-700/50'
            }`}
          >
            {transcript ? `"${transcript}"` : statusText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

