import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Sparkles, Volume2 } from 'lucide-react';
import { playLogoIntroSound, playSfx } from '../lib/sensory';
import { speak, stopSpeech } from '../lib/speech';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const hasPlayedAudioRef = useRef(false);
  const hasPlayedSfxRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [needsGesture, setNeedsGesture] = useState(false);
  const hasInitiatedVoiceRef = useRef(false);

  const triggerStartupSounds = () => {
    // 1. Toca o efeito sonoro cristalino da logo (apenas uma vez)
    if (!hasPlayedSfxRef.current) {
      hasPlayedSfxRef.current = true;
      try {
        playLogoIntroSound();
      } catch (e) {
        console.warn('SFX trigger error:', e);
      }
    }

    // 2. Toca a voz autêntica da Malu (Aoede) falando "Nutri AI" (estritamente uma única vez)
    if (!hasInitiatedVoiceRef.current) {
      hasInitiatedVoiceRef.current = true;

      if (!audioRef.current) {
        audioRef.current = new Audio('/audio/nutri_ai_malu.wav');
      }

      const audio = audioRef.current;
      audio.currentTime = 0;
      audio.play().then(() => {
        hasPlayedAudioRef.current = true;
        setNeedsGesture(false);
      }).catch((err) => {
        // Autoplay aguardando interação do usuário; reseta flag para permitir tocar no clique
        hasInitiatedVoiceRef.current = false;
        console.info('Autoplay aguarda interação:', err?.message || err);
        setNeedsGesture(true);
      });
    }
  };

  useEffect(() => {
    // Pré-carrega o áudio nativo da Malu gerado no backend com modelo Aoede
    const audio = new Audio('/audio/nutri_ai_malu.wav');
    audio.preload = 'auto';
    audioRef.current = audio;

    // Dispara a voz e o som no momento exato em que a logo ganha foco
    const initialSoundTimer = setTimeout(() => {
      triggerStartupSounds();
    }, 200);

    // Segundo reforço sonoro no momento do brilho (shine)
    const shimmerTimer = setTimeout(() => {
      playSfx('crystal');
    }, 650);

    // Listener para reprodução instantânea ao menor toque caso o navegador bloqueie autoplay
    const handleUserInteraction = () => {
      if (!hasPlayedAudioRef.current && audioRef.current) {
        if (!hasInitiatedVoiceRef.current) {
          hasInitiatedVoiceRef.current = true;
          audioRef.current.currentTime = 0;
          audioRef.current.play().then(() => {
            hasPlayedAudioRef.current = true;
            setNeedsGesture(false);
          }).catch(() => {
            hasInitiatedVoiceRef.current = false;
          });
        }
      }
      if (!hasPlayedSfxRef.current) {
        hasPlayedSfxRef.current = true;
        playLogoIntroSound();
      }
    };

    window.addEventListener('pointerdown', handleUserInteraction, { passive: true, once: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true, once: true });

    // Duração confortável para a animação da logo
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 400);
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearTimeout(initialSoundTimer);
      clearTimeout(shimmerTimer);
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      // Não interrompemos o áudio no unmount para permitir que a voz conclua perfeitamente
    };
  }, [onComplete]);

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    onComplete();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(15px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => {
            setIsVisible(false);
            onComplete();
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#05080c] overflow-hidden cursor-pointer"
          title="Clique para pular"
        >
          {/* Subtle Premium Background Gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12)_0%,rgba(0,0,0,0)_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.08)_0%,rgba(0,0,0,0)_50%)]" />
          
          <div className="relative flex flex-col items-center">
            {/* Logo Animation */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ 
                duration: 1.0, 
                ease: [0.16, 1, 0.3, 1],
                delay: 0.1
              }}
              className="relative mb-8"
            >
              <div className="relative overflow-hidden z-10 p-6 rounded-[32px] clay-card bg-gradient-to-br from-slate-800/80 to-slate-900/90 shadow-[0_0_60px_rgba(16,185,129,0.15)] ring-1 ring-white/5 backdrop-blur-xl">
                <Utensils className="relative z-10 w-16 h-16 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                
                {/* Premium Shine Effect passing through logo */}
                <motion.div
                  initial={{ x: '-150%', skewX: -20 }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 1.2, ease: "easeInOut", delay: 0.3 }}
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent z-20"
                />
              </div>
              
              {/* Soft Pulse Behind Logo */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.25, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 blur-3xl bg-emerald-500/30 -z-10 rounded-full"
              />
            </motion.div>

            {/* Brand Name */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 1.0 }}
              className="text-center"
            >
              <h1 className="font-serif text-5xl font-bold tracking-tight text-white mb-3 drop-shadow-lg">
                Nutri<span className="text-emerald-400">AI</span>
              </h1>
              
              <div className="flex items-center justify-center gap-3 text-slate-400 font-medium tracking-[0.2em] uppercase text-[10px]">
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 24, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="h-[1px] bg-gradient-to-r from-transparent to-emerald-500/50"
                />
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                >
                  Inteligência Premium
                </motion.span>
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 24, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="h-[1px] bg-gradient-to-l from-transparent to-emerald-500/50"
                />
              </div>

              {/* Botão sutil caso o autoplay esteja aguardando interação do navegador */}
              {needsGesture && (
                <motion.button
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (audioRef.current) {
                      audioRef.current.play().then(() => {
                        hasPlayedAudioRef.current = true;
                        setNeedsGesture(false);
                      }).catch(() => {});
                    }
                    playLogoIntroSound();
                  }}
                  className="mt-5 mx-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium cursor-pointer shadow-lg transition-all"
                >
                  <Volume2 className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                  <span>Toque para ouvir a Malu</span>
                </motion.button>
              )}
            </motion.div>

          </div>

          {/* Skip Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            whileHover={{ opacity: 0.9, scale: 1.05 }}
            onClick={handleSkip}
            className="absolute bottom-8 right-8 text-[11px] text-slate-400 font-medium tracking-wider uppercase bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full cursor-pointer transition-all duration-200 z-[110]"
          >
            Pular →
          </motion.button>

          {/* Elegant Loading Line (Bottom) */}
          <motion.div 
            className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
            initial={{ width: "0%", left: "50%", opacity: 0 }}
            animate={{ width: "100%", left: "0%", opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut", delay: 0.1 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
