import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, X, Heart, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playSfx, vibrate } from '../lib/sensory';
import { languagesList, searchLanguages, LanguageOption } from '../lib/languages';
import { UserProfile } from '../types';
import { changeLanguage } from '../i18n/index';
import { supabase } from '../lib/supabase';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: UserProfile | null;
  onUpdateProfile?: (profile: UserProfile | null) => void;
}

export function LanguageModal({ isOpen, onClose, profile, onUpdateProfile }: LanguageModalProps) {
  const { i18n, t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLanguageChange = async (code: string) => {
    playSfx('success');
    vibrate(30);
    
    // Normalize code for pt
    const normalizedCode = code.startsWith('pt') ? 'pt-BR' : code;
    
    // Call the comprehensive i18n helper
    await changeLanguage(normalizedCode, supabase, profile?.id);
    
    if (profile && onUpdateProfile) {
      onUpdateProfile({
        ...profile,
        language: normalizedCode
      });
    }
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const filtered = searchLanguages(searchQuery);

  const premiumMarkets = filtered.filter(l => l.priority === 'premium');
  const growthMarkets = filtered.filter(l => l.priority === 'growth');
  const globalMarkets = filtered.filter(l => l.priority === 'global');

  const hasResults = filtered.length > 0;

  const renderLanguageButton = (lng: LanguageOption) => {
    // Check if selected. Respect subtags for variants (pt-BR vs pt-PT, en-US vs en-GB, es-ES vs es-MX)
    const isSelected = i18n.language === lng.subtag || 
                       (lng.subtag === 'pt-BR' && (i18n.language === 'pt' || i18n.language?.startsWith('pt-BR'))) ||
                       (lng.subtag === 'en-US' && (i18n.language === 'en' || i18n.language?.startsWith('en-US'))) ||
                       (lng.subtag === 'es-ES' && (i18n.language === 'es' || i18n.language?.startsWith('es-ES'))) ||
                       (!['pt-BR', 'pt-PT', 'en-US', 'en-GB', 'en-CA', 'en-AU', 'es-ES', 'es-MX', 'es-AR', 'es-CL', 'es-CO', 'es-PE', 'es-UY', 'es-VE'].includes(lng.subtag) && i18n.language?.startsWith(lng.code));

    return (
      <motion.button
        whileHover={{ scale: 1.01, x: 2 }}
        whileTap={{ scale: 0.99 }}
        key={lng.subtag}
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
          <p className="text-[10px] opacity-70 font-normal text-slate-550 dark:text-slate-400">
            {lng.translatedName} • <span className="italic opacity-90">{lng.country}</span>
          </p>
        </div>
        
        <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
          isSelected
            ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_8px_#10b981]'
            : 'border-slate-300 dark:border-slate-600'
        }`}>
          {isSelected && (
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-scale-up" />
          )}
        </div>
      </motion.button>
    );
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
                  {t('settings_language', 'Idioma / Language')}
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 mb-3 leading-relaxed">
              {t('settings_select_lang', 'Selecione o idioma de sua preferência para utilizar todo o aplicativo.')}
            </p>

            {/* Instant Search Bar */}
            <div className="relative flex items-center mb-4">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('settings_search_placeholder', 'Buscar por idioma, país, nativo ou ISO...')}
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-200 placeholder-slate-450 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Language Priority Scroll Container */}
            <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-emerald-500/20 scroll-smooth">
              {!hasResults ? (
                <div className="text-center py-8 text-slate-450 dark:text-slate-500 text-xs">
                  <Globe className="w-8 h-8 mx-auto mb-2 opacity-30 animate-pulse" />
                  <p>{t('settings_no_results', 'Nenhum idioma encontrado para a busca.')}</p>
                </div>
              ) : (
                <>
                  {/* Category: Premium Markets */}
                  {premiumMarkets.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 pl-1">
                        {t('settings_premium_markets', 'Mercados Premium')}
                      </h5>
                      <div className="space-y-2">
                        {premiumMarkets.map(renderLanguageButton)}
                      </div>
                    </div>
                  )}

                  {/* Category: Growth Markets */}
                  {growthMarkets.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h5 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 pl-1">
                        {t('settings_growth_markets', 'Mercados em Crescimento')}
                      </h5>
                      <div className="space-y-2">
                        {growthMarkets.map(renderLanguageButton)}
                      </div>
                    </div>
                  )}

                  {/* Category: Global Expansion */}
                  {globalMarkets.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h5 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 pl-1">
                        {t('settings_global_expansion', 'Expansão Global')}
                      </h5>
                      <div className="space-y-2">
                        {globalMarkets.map(renderLanguageButton)}
                      </div>
                    </div>
                  )}
                </>
              )}
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
