import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage as i18nChangeLanguage, getInitialLanguage } from '../i18n/index';
import { languagesList, LanguageOption } from '../lib/languages';

export interface LanguageContextType {
  language: string;
  changeLanguage: (targetLng: string, supabaseClient?: any, userId?: string) => Promise<string>;
  isRtl: boolean;
  direction: 'ltr' | 'rtl';
  t: (key: string, defaultValue?: string) => string;
  availableLanguages: LanguageOption[];
  _isProviderActive?: boolean;
}

const defaultLanguage = getInitialLanguage();

export const LanguageContext = createContext<LanguageContextType>({
  language: defaultLanguage,
  changeLanguage: async (lng) => lng,
  isRtl: defaultLanguage.startsWith('ar'),
  direction: defaultLanguage.startsWith('ar') ? 'rtl' : 'ltr',
  t: (key, def) => def || key,
  availableLanguages: languagesList,
});

export const useLanguage = () => useContext(LanguageContext);

export interface LanguageProviderProps {
  children: React.ReactNode;
  initialLang?: string;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, initialLang }) => {
  const existing = useContext(LanguageContext);
  if (existing && existing._isProviderActive) {
    return <>{children}</>;
  }

  const { t, i18n } = useTranslation();
  
  // Single source of truth for app-wide language state
  const [language, setLanguage] = useState<string>(() => {
    return initialLang || i18n.language || getInitialLanguage() || 'pt-BR';
  });

  const isRtl = useMemo(() => language.startsWith('ar'), [language]);
  const direction = isRtl ? 'rtl' : 'ltr';

  // Synchronize with i18next language changes
  useEffect(() => {
    const handleI18nChange = (lng: string) => {
      let target = lng || 'pt-BR';
      if (target === 'pt') target = 'pt-BR';
      if (target === 'en') target = 'en-US';
      if (target === 'es') target = 'es-ES';
      setLanguage((prev) => (prev !== target ? target : prev));
    };

    i18n.on('languageChanged', handleI18nChange);
    return () => {
      i18n.off('languageChanged', handleI18nChange);
    };
  }, [i18n]);

  // Synchronize document direction and html language attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = direction;
      if (document.body) {
        if (isRtl) {
          document.body.classList.add('rtl-layout');
        } else {
          document.body.classList.remove('rtl-layout');
        }
      }
    }
  }, [language, direction, isRtl]);

  // Centralized language change dispatcher
  const changeLanguage = useCallback(async (targetLng: string, supabaseClient?: any, userId?: string) => {
    let normalized = targetLng;
    if (normalized === 'pt') normalized = 'pt-BR';
    if (normalized === 'en') normalized = 'en-US';
    if (normalized === 'es') normalized = 'es-ES';

    // 1. Immediately update React Context state so all sub-components receive the update directly
    setLanguage((prev) => (prev !== normalized ? normalized : prev));

    // 2. Call i18n changeLanguage to persist in localStorage, update document attributes,
    //    and synchronize with Supabase / Firestore
    const result = await i18nChangeLanguage(normalized, supabaseClient, userId);
    return result;
  }, []);

  const translate = useCallback((key: string, defaultValue?: string) => t(key, defaultValue || key), [t]);

  const contextValue = useMemo<LanguageContextType>(() => ({
    language,
    changeLanguage,
    isRtl,
    direction,
    t: translate,
    availableLanguages: languagesList,
    _isProviderActive: true,
  }), [language, changeLanguage, isRtl, direction, translate]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};
