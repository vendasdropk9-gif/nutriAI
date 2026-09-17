import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutAnimationProviderProps {
  children: React.ReactNode;
  animationKey: string;
  className?: string;
}

const fadeUpVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export function LayoutAnimationProvider({ 
  children, 
  animationKey, 
  className = "w-full flex-1 flex flex-col items-center min-h-[400px]" 
}: LayoutAnimationProviderProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animationKey}
        variants={fadeUpVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
