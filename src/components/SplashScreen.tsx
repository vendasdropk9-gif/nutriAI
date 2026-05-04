import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Extra delay for the exit animation to complete
      setTimeout(onComplete, 800);
    }, 2800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-slate-950 overflow-hidden"
        >
          {/* Subtle Premium Background Gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)]" />
          
          <div className="relative flex flex-col items-center">
            {/* Logo Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ 
                duration: 1.2, 
                ease: [0.22, 1, 0.36, 1],
                delay: 0.2
              }}
              className="relative mb-8"
            >
              <div className="relative z-10 p-6 rounded-[32px] bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_20px_50px_rgba(16,185,129,0.3)] dark:shadow-[0_20px_50px_rgba(16,185,129,0.2)]">
                <Utensils className="w-16 h-16 text-white" />
              </div>
              
              {/* Soft Glow Effect */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 blur-3xl bg-emerald-500/40 -z-10"
              />
            </motion.div>

            {/* Brand Name */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 1 }}
              className="text-center"
            >
              <h1 className="font-serif text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
                Nutri<span className="text-emerald-600 dark:text-emerald-400">AI</span>
              </h1>
              
              <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 font-medium tracking-widest uppercase text-[10px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: 20 }}
                  transition={{ delay: 1, duration: 0.8 }}
                  className="h-[1px] bg-emerald-600/30"
                />
                <motion.span
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.8 }}
                >
                  Inteligência para sua saúde
                </motion.span>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: 20 }}
                  transition={{ delay: 1, duration: 0.8 }}
                  className="h-[1px] bg-emerald-600/30"
                />
              </div>
            </motion.div>

            {/* Premium Indicator (Bottom) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 1 }}
              className="absolute bottom-[-100px] flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/10 bg-emerald-500/5 backdrop-blur-sm"
            >
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-bold text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-[0.2em]">Tecnologia Premium</span>
            </motion.div>
          </div>

          {/* Elegant Loading Line (Bottom) */}
          <motion.div 
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
            initial={{ width: "0%", left: "50%" }}
            animate={{ width: "100%", left: "0%" }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
