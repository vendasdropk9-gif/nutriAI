import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Loader2, 
  Waves, 
  Square,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../types';
import { chatWithAssistant } from '../lib/gemini';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

interface LiveAssistantProps {
  profile: UserProfile | null;
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

  const showStatus = (text: string, autoHideMs = 4000) => {
    setStatusText(text);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (autoHideMs > 0) {
      statusTimerRef.current = setTimeout(() => {
        setStatusText(null);
      }, autoHideMs);
    }
  };

  // Stop everything
  const stopAll = useCallback(() => {
    stopSpeech();
    setIsSpeaking(false);
    setIsListening(false);
    setIsProcessing(false);

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
  }, []);

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
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showStatus('Permissão de microfone necessária', 3500);
        } else if (event.error !== 'no-speech') {
          showStatus('Não entendi, tente novamente', 3000);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      return recognition;
    } catch (e) {
      console.warn('Speech recognition init error:', e);
      return null;
    }
  }, []);

  // Send user query to Malu and speak reply
  const handleUserQuery = async (queryText: string) => {
    if (!queryText || !queryText.trim() || isProcessing) return;

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
          showStatus('Pronta para falar!', 2500);
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
  };

  // Start listening
  const startListening = () => {
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
      } catch (err) {
        recognitionRef.current = initSpeechRecognition();
        try {
          recognitionRef.current?.start();
        } catch (e) {
          showStatus('Toque para falar', 2000);
        }
      }
    } else {
      showStatus('Reconhecimento de voz indisponível', 3000);
    }
  };

  // Toggle voice button
  const handleButtonClick = () => {
    playSfx('tap');
    vibrate(20);

    if (isSpeaking) {
      // If currently speaking, stop audio
      stopAll();
      showStatus('Áudio pausado', 2000);
      return;
    }

    if (isListening) {
      // If currently listening, stop and send transcript
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      if (transcript.trim()) {
        handleUserQuery(transcript);
      } else {
        setStatusText(null);
      }
    } else {
      // Start listening
      startListening();
    }
  };

  // Listen for custom open event
  useEffect(() => {
    const handleOpen = () => {
      startListening();
    };
    window.addEventListener('app:openLiveAssistant', handleOpen);
    return () => {
      window.removeEventListener('app:openLiveAssistant', handleOpen);
    };
  }, []);

  // Process transcript when listening ends
  useEffect(() => {
    if (!isListening && transcript.trim() && !isProcessing) {
      const timer = setTimeout(() => {
        handleUserQuery(transcript);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, isProcessing]);

  return (
    <div className="fixed bottom-5 left-5 z-50 flex items-center gap-3">
      {/* Floating Microphone Button with Rotating Neon Glow Ring */}
      <div className="relative group p-1.5 flex items-center justify-center">
        {/* Continuous Rotating Neon Glow Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full blur-[6px] opacity-90 transition-all duration-500 ${
            isListening
              ? 'bg-[conic-gradient(from_0deg,#ff0055,#ff5500,#ff0055)] opacity-100 blur-[8px]'
              : isSpeaking
              ? 'bg-[conic-gradient(from_0deg,#00ffcc,#00ff66,#00ccff,#00ffcc)] opacity-100 blur-[8px]'
              : isProcessing
              ? 'bg-[conic-gradient(from_0deg,#ffaa00,#ffdd00,#ff6600,#ffaa00)] opacity-100 blur-[8px]'
              : 'bg-[conic-gradient(from_0deg,#00f2fe,#4facfe,#00ff88,#00f2fe)]'
          }`}
        />

        {/* Sharp Rotating Neon Border Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-[1px] rounded-full p-[2.5px] transition-all duration-500 ${
            isListening
              ? 'bg-[conic-gradient(from_0deg,#ff0055,#ff7700,#ff0077)]'
              : isSpeaking
              ? 'bg-[conic-gradient(from_0deg,#00ffcc,#10b981,#06b6d4,#00ffcc)]'
              : isProcessing
              ? 'bg-[conic-gradient(from_0deg,#f59e0b,#fbbf24,#ea580c,#f59e0b)]'
              : 'bg-[conic-gradient(from_0deg,#06b6d4,#10b981,#3b82f6,#06b6d4)]'
          }`}
        >
          <div className="w-full h-full rounded-full bg-slate-950/20" />
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
              ? "Ouvindo você... Toque para finalizar" 
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md border max-w-[220px] truncate ${
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
