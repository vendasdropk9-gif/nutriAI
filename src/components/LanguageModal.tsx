import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, X, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playSfx, vibrate } from '../lib/sensory';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'pt', originalName: 'Português', translatedName: 'Português (Brasil)', flag: '🇧🇷' },
    { code: 'en', originalName: 'English', translatedName: 'English (US)', flag: '🇺🇸' },
    { code: 'es', originalName: 'Español', translatedName: 'Español', flag: '🇪🇸' },
    { code: 'fr', originalName: 'Français', translatedName: 'Français', flag: '🇫🇷' },
  ];

  const handleLanguageChange = (code: string) => {
    playSfx('success');
    vibrate(30);
    i18n.changeLanguage(code);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="language-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            id="language-modal-overlay"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md overflow-hidden rounded-[24px] bg-white p-6 shadow-2xl dark:bg-slate-900 border border-emerald-500/10 z-10"
            id="language-modal-content"
          >
            {/* Background Accent Gradients */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl animate-pulse" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800/80">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Globe className="h-5 w-5 animate-spin-slow" />
                <h3 className="font-serif text-lg font-bold tracking-wide">
                  {t('settings.language', 'Idioma / Language')}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
                id="close-language-modal-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Subtitle / Description */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 mb-4 leading-relaxed">
              {t('settings.select_lang', 'Selecione o idioma de sua preferência para utilizar todo o aplicativo.')}
            </p>

            {/* Language Grid */}
            <div className="space-y-2.5">
              {languages.map((lng) => {
                const isSelected = i18n.language?.startsWith(lng.code);
                return (
                  <motion.button
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    key={lng.code}
                    type="button"
                    onClick={() => handleLanguageChange(lng.code)}
                    className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left outline-none cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-2xl select-none" role="img" aria-label={lng.translatedName}>
                      {lng.flag}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        {lng.originalName}
                      </p>
                      <p className="text-[10px] opacity-70 font-normal">
                        {lng.translatedName}
                      </p>
                    </div>
                    
                    <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-scale-up" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Bottom Accent Decoration */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500">
              <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest font-mono">NutriAI Premium Experience</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
