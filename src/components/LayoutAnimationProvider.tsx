import React from 'react';
import { motion, AnimatePresence, Variants } from 'motion/react';

export const DEFAULT_TAB_ORDER: string[] = [
  'assistant360',
  'quickdishes',
  'coach',
  'generator',
  'fridge',
  'pantry',
  'garden',
  'herbs',
  'juice',
  'habits',
  'notes',
  'bloodpressure',
  'glucose',
  'barcode',
  'allergy',
  'comparer',
  'emotional',
  'analyzer',
  'body',
  'plan',
  'shopping',
  'evolution',
  'challenge',
  'swaps',
  'dining',
  'smartplate',
  'market',
  'frescor',
  'trainer',
  'wellness',
  'academies',
  'gamification',
  'cooking_advisor',
  'pricing',
  'partner',
  'delivery',
  'ranking',
  'prediction',
  'profile',
  'admin',
  'admin_library'
];

export interface LayoutAnimationProviderProps {
  children: React.ReactNode;
  animationKey: string;
  className?: string;
  direction?: number;
  tabOrder?: string[];
  mode?: 'slide' | 'fade-up';
}

const slideVariants: Variants = {
  initial: (dir: number) => ({
    opacity: 0,
    x: dir >= 0 ? 42 : -42,
    filter: 'blur(2px)',
  }),
  animate: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: {
      x: { type: 'spring' as const, stiffness: 320, damping: 30, mass: 0.7 },
      opacity: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
      filter: { duration: 0.2 },
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir >= 0 ? -42 : 42,
    filter: 'blur(2px)',
    transition: {
      x: { duration: 0.18, ease: [0.25, 1, 0.5, 1] },
      opacity: { duration: 0.15, ease: 'easeIn' },
      filter: { duration: 0.15 },
    },
  }),
};

const fadeUpVariants: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2, ease: 'easeIn' }
  }
};

export function LayoutAnimationProvider({ 
  children, 
  animationKey, 
  className = "w-full flex-1 flex flex-col items-center min-h-[400px] overflow-x-hidden",
  direction: explicitDirection,
  tabOrder = DEFAULT_TAB_ORDER,
  mode = 'slide'
}: LayoutAnimationProviderProps) {
  // Synchronous state adjustment on prop change to ensure exit animation receives the correct direction
  const [tracker, setTracker] = React.useState({
    currentKey: animationKey,
    prevKey: animationKey,
    direction: 1
  });

  if (tracker.currentKey !== animationKey) {
    const prevIdx = tabOrder.indexOf(tracker.currentKey);
    const currIdx = tabOrder.indexOf(animationKey);
    let computedDirection = 1;
    if (prevIdx !== -1 && currIdx !== -1) {
      computedDirection = currIdx >= prevIdx ? 1 : -1;
    }
    setTracker({
      currentKey: animationKey,
      prevKey: tracker.currentKey,
      direction: computedDirection
    });
  }

  const effectiveDirection = explicitDirection !== undefined ? explicitDirection : tracker.direction;
  const activeVariants = mode === 'fade-up' ? fadeUpVariants : slideVariants;

  return (
    <AnimatePresence mode="wait" custom={effectiveDirection}>
      <motion.div
        key={animationKey}
        custom={effectiveDirection}
        variants={activeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
