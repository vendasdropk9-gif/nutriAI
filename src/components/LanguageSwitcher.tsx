import React, { useState } from 'react';
import { Globe, Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import { searchLanguages, LanguageOption } from '../lib/languages';
import { UserProfile } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageSwitcherProps {
  profile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ profile, onSaveProfile }) => {
  const { language: currentLang, changeLanguage: setAppLanguage, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLanguageChange = async (targetLng: string) => {
    playSfx('success');
    vibrate(30);
    
    // Use the comprehensive LanguageContext change language helper
    await setAppLanguage(targetLng, supabase, profile?.id);
    
    if (profile && onSaveProfile) {
      onSaveProfile({
        ...profile,
        language: targetLng,
        preferred_language: targetLng
      });
    }
  };

  const filtered = searchLanguages(searchQuery);
  const hasResults = filtered.length > 0;

  const renderLanguageButton = (lng: LanguageOption) => {
    const isSelected = 
      currentLang === lng.subtag ||
      currentLang === lng.code;

    const countryCode = (lng.subtag.split('-')[1] || lng.code).toUpperCase();

    return (
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        key={lng.subtag}
        type="button"
        onClick={() => handleLanguageChange(lng.subtag || lng.code)}
        className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left outline-none cursor-pointer ${
          isSelected
            ? 'bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold shadow-sm'
            : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100/40 dark:border-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
        }`}
      >
        <div className="flex flex-col items-center justify-center min-w-[36px] h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
          <span className="text-xl select-none leading-none" role="img" aria-label={lng.translatedName}>
            {lng.flag}
          </span>
          <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 leading-tight">
            {countryCode}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-xs tracking-wider truncate text-slate-700 dark:text-slate-200">
              {lng.originalName}
            </p>
            {lng.currency && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {lng.currencySymbol} {lng.currency}
              </span>
            )}
          </div>
          <p className="text-[10px] opacity-75 truncate font-normal mt-0.5">
            {lng.translatedName} • <span className="italic opacity-90">{lng.country}</span>
          </p>
        </div>
        <div className={`shrink-0 w-3.5 h-3.5 rounded-full border-2 ${
          isSelected
            ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_#10b981]'
            : 'border-slate-300 dark:border-slate-600'
        }`} />
      </motion.button>
    );
  };

  return (
    <div className="w-full space-y-4 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80">
      {/* Title */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-800 dark:text-slate-200">
            {t('settings_language_title', 'Idioma e Localização / Language & Location')}
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('settings_language_description', 'Suporte exclusivo para Estados Unidos, Reino Unido, Austrália e Brasil.')}
          </p>
        </div>
      </div>

      {/* Instant Search Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('settings_search_placeholder', 'Buscar por idioma, país ou ISO...')}
          className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100/40 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 placeholder-slate-450 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-4 rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Language Lists */}
      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-emerald-500/20 scroll-smooth">
        {!hasResults ? (
          <div className="text-center py-8 text-slate-450 dark:text-slate-500 text-xs">
            <Globe className="w-8 h-8 mx-auto mb-2 opacity-30 animate-pulse" />
            <p>{t('settings_no_results', 'Nenhum idioma encontrado para a busca.')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h5 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 pl-1">
              {t('settings_exclusive_markets', 'Países e Regiões Suportadas')}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(renderLanguageButton)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
