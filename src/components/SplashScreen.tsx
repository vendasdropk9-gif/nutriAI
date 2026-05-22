import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Sparkles } from 'lucide-react';
import { playSfx } from '../lib/sensory';
import nutriaiVoiceUrl from '../assets/audio/nutriai_gemini.wav';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Sincronizado com o momento em que o reflexo cruza o centro
    const soundTimer = setTimeout(() => {
      playSfx('crystal');
    }, 1000);

    // Reproduzir áudio da voz afirmando "NutriAI" limpa e suavemente após a logo aparecer
    const voiceTimer = setTimeout(() => {
      const voiceAudio = new Audio(nutriaiVoiceUrl);
      voiceAudio.play().catch(e => console.log('Audio autoplay prevented:', e));
    }, 1300);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800);
    }, 3000); // Aumentado para 3000ms para permitir a finalização elegante do áudio

    return () => {
      clearTimeout(timer);
      clearTimeout(soundTimer);
      clearTimeout(voiceTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(15px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#05080c] overflow-hidden"
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
                duration: 1.2, 
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
                  transition={{ duration: 1.5, ease: "easeInOut", delay: 0.4 }}
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
                  duration: 3, 
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
              transition={{ delay: 0.5, duration: 1.2 }}
              className="text-center"
            >
              <h1 className="font-serif text-5xl font-bold tracking-tight text-white mb-3 drop-shadow-lg">
                Nutri<span className="text-emerald-400">AI</span>
              </h1>
              
              <div className="flex items-center justify-center gap-3 text-slate-400 font-medium tracking-[0.2em] uppercase text-[10px]">
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 24, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 1 }}
                  className="h-[1px] bg-gradient-to-r from-transparent to-emerald-500/50"
                />
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.8 }}
                >
                  Inteligência Premium
                </motion.span>
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 24, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 1 }}
                  className="h-[1px] bg-gradient-to-l from-transparent to-emerald-500/50"
                />
              </div>
            </motion.div>

          </div>

          {/* Elegant Loading Line (Bottom) */}
          <motion.div 
            className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
            initial={{ width: "0%", left: "50%", opacity: 0 }}
            animate={{ width: "100%", left: "0%", opacity: 1 }}
            transition={{ duration: 2.2, ease: "easeInOut", delay: 0.2 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
