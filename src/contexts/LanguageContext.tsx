import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation as useI18nextTranslation, I18nextProvider } from 'react-i18next';
import i18n, { changeLanguage as i18nChangeLanguage, getInitialLanguage } from '../i18n/index';
import { languagesList, LanguageOption } from '../lib/languages';
import { lookupRuntimeTranslation } from '../i18n/runtimeDictionary';
import { localesMap } from '../i18n/locales';

export interface LanguageContextType {
  language: string;
  changeLanguage: (targetLng: string, supabaseClient?: any, userId?: string) => Promise<string>;
  setLanguage?: (targetLng: string) => Promise<string>;
  isRtl: boolean;
  direction: 'ltr' | 'rtl';
  t: (keyOrPhrase: string, defaultValueOrParams?: string | Record<string, any>, params?: Record<string, any>) => string;
  availableLanguages: LanguageOption[];
  renderKey: string;
  _isProviderActive?: boolean;
}

const defaultLanguage = getInitialLanguage();

export const LanguageContext = createContext<LanguageContextType>({
  language: defaultLanguage,
  changeLanguage: async (lng) => lng,
  isRtl: defaultLanguage.startsWith('ar'),
  direction: defaultLanguage.startsWith('ar') ? 'rtl' : 'ltr',
  t: (key, def) => (typeof def === 'string' ? def : key),
  availableLanguages: languagesList,
  renderKey: defaultLanguage,
});

export const useLanguage = () => useContext(LanguageContext);

/**
 * Universal useTranslation hook providing instant reactivity to LanguageContext changes
 */
export const useTranslation = () => {
  const ctx = useLanguage();
  const i18nHook = useI18nextTranslation();

  return {
    t: ctx.t,
    i18n: {
      ...i18nHook.i18n,
      language: ctx.language,
      changeLanguage: ctx.changeLanguage,
      dir: () => ctx.direction,
    },
    ready: true,
  };
};

export interface LanguageProviderProps {
  children: React.ReactNode;
  initialLang?: string;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, initialLang }) => {
  const existing = useContext(LanguageContext);
  if (existing && existing._isProviderActive) {
    return <>{children}</>;
  }
  return <LanguageProviderInner initialLang={initialLang}>{children}</LanguageProviderInner>;
};

const LanguageProviderInner: React.FC<LanguageProviderProps> = ({ children, initialLang }) => {
  // Single source of truth for app-wide language state
  const [language, setLanguageState] = useState<string>(() => {
    return initialLang || i18n.language || getInitialLanguage() || 'pt-BR';
  });

  const [renderCount, setRenderCount] = useState(0);

  const isRtl = useMemo(() => language.startsWith('ar'), [language]);
  const direction = isRtl ? 'rtl' : 'ltr';

  // Synchronize with i18next language changes
  useEffect(() => {
    const handleI18nChange = (lng: string) => {
      let target = lng || 'pt-BR';
      if (target === 'pt') target = 'pt-BR';
      if (target === 'en') target = 'en-US';
      if (target === 'es') target = 'es-ES';
      setLanguageState((prev) => {
        if (prev !== target) {
          setRenderCount((c) => c + 1);
          return target;
        }
        return prev;
      });
    };

    i18n.on('languageChanged', handleI18nChange);
    return () => {
      i18n.off('languageChanged', handleI18nChange);
    };
  }, []);

  // Synchronize document direction and html language attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = direction;
      if (document.body) {
        if (isRtl) {
          document.body.classList.add('rtl-layout');
          document.body.classList.remove('ltr-layout');
        } else {
          document.body.classList.remove('rtl-layout');
          document.body.classList.add('ltr-layout');
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

    // 1. Synchronously update state and render key so all components re-render immediately
    setLanguageState(normalized);
    setRenderCount((c) => c + 1);

    // 2. Synchronously update document attributes
    if (typeof document !== 'undefined') {
      document.documentElement.lang = normalized;
      document.documentElement.dir = normalized.startsWith('ar') ? 'rtl' : 'ltr';
      if (document.body) {
        if (normalized.startsWith('ar')) {
          document.body.classList.add('rtl-layout');
        } else {
          document.body.classList.remove('rtl-layout');
        }
      }
    }

    // 3. Dispatch global events for instant notification
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nutri:language-changed', { detail: normalized }));
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: normalized }));
    }

    // 4. Call i18n changeLanguage to persist in localStorage and sync with Supabase / Firestore
    const result = await i18nChangeLanguage(normalized, supabaseClient, userId);
    return result;
  }, []);

  // High-performance, multi-tier translation resolver
  const translate = useCallback((
    keyOrPhrase: string,
    defaultValueOrParams?: string | Record<string, any>,
    params?: Record<string, any>
  ): string => {
    if (!keyOrPhrase || typeof keyOrPhrase !== 'string') return '';

    const defaultValue = typeof defaultValueOrParams === 'string' ? defaultValueOrParams : keyOrPhrase;
    const interpolationParams = typeof defaultValueOrParams === 'object' ? defaultValueOrParams : params;

    const currentLang = language;
    const cleanLang = currentLang.split('-')[0];
    const isPortuguese = currentLang.startsWith('pt');

    let translated: string | null = null;

    // 1. Try i18next initialized instance
    try {
      if (i18n && i18n.isInitialized) {
        const i18nRes = i18n.t(keyOrPhrase, {
          lng: currentLang,
          defaultValue: defaultValue || keyOrPhrase,
          ...(interpolationParams || {})
        });
        if (i18nRes && i18nRes !== keyOrPhrase) {
          translated = i18nRes;
        }
      }
    } catch (e) {}

    // 2. If target is Portuguese and key is in Portuguese, return defaultValue or key
    if (!translated && isPortuguese) {
      translated = defaultValue || keyOrPhrase;
    }

    // 3. Try lookup in runtime dictionary with full normalization and emoji handling
    if (!translated) {
      translated = lookupRuntimeTranslation(keyOrPhrase, currentLang) || 
                   (defaultValue ? lookupRuntimeTranslation(defaultValue, currentLang) : null);
    }

    // 4. Try direct lookup in localesMap bundles
    if (!translated) {
      const bundle = localesMap[currentLang] || localesMap[cleanLang] || localesMap['en-US'];
      if (bundle && bundle[keyOrPhrase] && typeof bundle[keyOrPhrase] === 'string') {
        translated = bundle[keyOrPhrase];
      }
    }

    // 5. Final fallback
    let finalStr = translated || defaultValue || keyOrPhrase;

    // 6. Parameter interpolation
    if (interpolationParams && typeof interpolationParams === 'object') {
      for (const [pKey, pVal] of Object.entries(interpolationParams)) {
        finalStr = finalStr.replace(new RegExp(`{{\\s*${pKey}\\s*}}`, 'g'), String(pVal))
                           .replace(new RegExp(`{\\s*${pKey}\\s*}`, 'g'), String(pVal));
      }
    }

    return finalStr;
  }, [language]);

  const contextValue = useMemo<LanguageContextType>(() => ({
    language,
    changeLanguage,
    setLanguage: changeLanguage,
    isRtl,
    direction,
    t: translate,
    availableLanguages: languagesList,
    renderKey: `${language}-${renderCount}`,
    _isProviderActive: true,
  }), [language, changeLanguage, isRtl, direction, translate, renderCount]);

  return (
    <LanguageContext.Provider value={contextValue}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </LanguageContext.Provider>
  );
};
