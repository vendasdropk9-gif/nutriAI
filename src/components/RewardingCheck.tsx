import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Sparkles } from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';

interface RewardingCheckProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RewardingCheck: React.FC<RewardingCheckProps> = ({
  checked,
  onChange,
  label,
  className = '',
  size = 'md'
}) => {
  const [showBurst, setShowBurst] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !checked;
    if (nextState) {
      playSfx('success');
      vibrate([30, 40, 30]);
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 900);
    } else {
      playSfx('tap');
      vibrate(15);
    }
    onChange(nextState);
  };

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }[size];

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  }[size];

  return (
    <div className={`relative inline-flex items-center gap-2.5 cursor-pointer select-none ${className}`} onClick={handleClick}>
      <motion.div
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.08 }}
        animate={checked ? { scale: [1, 1.25, 1], backgroundColor: '#10B981', borderColor: '#10B981' } : { scale: 1, backgroundColor: 'transparent', borderColor: '#94A3B8' }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 400, damping: 15 }}
        className={`${sizeClasses} rounded-xl border-2 flex items-center justify-center transition-colors shadow-sm relative overflow-hidden`}
      >
        <AnimatePresence>
          {checked && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -45 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="text-white flex items-center justify-center"
            >
              <Check size={iconSizes} strokeWidth={3.5} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ripple / Pulse effect on check */}
        <AnimatePresence>
          {showBurst && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0.9 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute inset-0 rounded-xl bg-emerald-400 pointer-events-none"
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Sparkle Burst animation */}
      <AnimatePresence>
        {showBurst && (
          <div className="absolute -top-3 -left-3 -right-3 -bottom-3 pointer-events-none flex items-center justify-center">
            {[...Array(6)].map((_, i) => {
              const angle = (i * 60) * (Math.PI / 180);
              const distance = 24;
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    scale: [0, 1.2, 0],
                    opacity: [1, 1, 0]
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute text-emerald-400"
                >
                  <Sparkles size={12} className="fill-emerald-400" />
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {label && (
        <span className={`text-sm font-medium transition-colors ${checked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
          {label}
        </span>
      )}
    </div>
  );
};
