import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation as useI18nextTranslation, I18nextProvider } from 'react-i18next';
import i18n, { changeLanguage as i18nChangeLanguage, getInitialLanguage, normalizeToSupportedLocale } from '../i18n/index';
import { languagesList, LanguageOption } from '../lib/languages';
import { lookupRuntimeTranslation, RUNTIME_DICTIONARY } from '../i18n/runtimeDictionary';
import { localesMap } from '../i18n/locales';
import { STATIC_APP_PHRASES } from '../i18n/staticPhrases';

console.log('🌐 [NutriAI LanguageContext] Carregado e inicializado com sucesso!');

// Recursive flattener that extracts both full dot-paths and leaf keys
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  if (!obj || typeof obj !== 'object') return result;
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullPath] = value;
      if (!result[key]) {
        result[key] = value;
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = flattenObject(value, fullPath);
      Object.assign(result, nested);
    }
  }
  return result;
}

// Pre-flatten all supported locale bundles for ultra-fast O(1) lookups
const flattenedLocales: Record<string, Record<string, string>> = {};
for (const [locKey, bundle] of Object.entries(localesMap)) {
  flattenedLocales[locKey] = flattenObject(bundle);
}

// Build reverse Portuguese text to key map for instant bidirectional translation
const ptToKeyMap = new Map<string, string>();
const flatPt = flattenedLocales['pt-BR'] || {};
for (const [k, v] of Object.entries(flatPt)) {
  if (typeof v === 'string') {
    ptToKeyMap.set(v.toLowerCase().trim(), k);
    ptToKeyMap.set(k.toLowerCase().trim(), k);
  }
}

// Also index STATIC_APP_PHRASES keys into ptToKeyMap
for (const phrase of Object.keys(STATIC_APP_PHRASES)) {
  ptToKeyMap.set(phrase.toLowerCase().trim(), phrase);
}

// Also index RUNTIME_DICTIONARY keys into ptToKeyMap
for (const phrase of Object.keys(RUNTIME_DICTIONARY)) {
  ptToKeyMap.set(phrase.toLowerCase().trim(), phrase);
}

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
  isRtl: false,
  direction: 'ltr',
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
    language: ctx.language,
    currentLanguage: ctx.language,
    changeLanguage: ctx.changeLanguage,
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

  const isRtl = false;
  const direction: 'ltr' | 'rtl' = 'ltr';

  // Synchronize with i18next language changes
  useEffect(() => {
    const handleI18nChange = (lng: string) => {
      const target = normalizeToSupportedLocale(lng);
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
    }
  }, [language, direction]);

  // Centralized language change dispatcher
  const changeLanguage = useCallback(async (targetLng: string, supabaseClient?: any, userId?: string) => {
    const normalized = normalizeToSupportedLocale(targetLng);

    // 1. Synchronously update state and render key so all components re-render immediately
    setLanguageState(normalized);
    setRenderCount((c) => c + 1);

    // 2. Synchronously update document attributes
    if (typeof document !== 'undefined') {
      document.documentElement.lang = normalized;
      document.documentElement.dir = 'ltr';
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

    const currentLang = language || 'pt-BR';
    const cleanLang = currentLang.split('-')[0];
    const isPortuguese = currentLang.startsWith('pt');

    // If target is Portuguese, resolve key from pt-BR dictionary or return defaultValue
    if (isPortuguese) {
      let ptStr = flattenedLocales['pt-BR']?.[keyOrPhrase] || defaultValue || keyOrPhrase;
      if (interpolationParams && typeof interpolationParams === 'object') {
        for (const [pKey, pVal] of Object.entries(interpolationParams)) {
          ptStr = ptStr.replace(new RegExp(`{{\\s*${pKey}\\s*}}`, 'g'), String(pVal))
                       .replace(new RegExp(`{\\s*${pKey}\\s*}`, 'g'), String(pVal));
        }
      }
      return ptStr;
    }

    let translated: string | null = null;
    const cleanLower = keyOrPhrase.toLowerCase().trim();

    // 1. Direct lookup in flattened target bundle (exact match or lowercased)
    const flatBundle = flattenedLocales[currentLang] || flattenedLocales[cleanLang] || flattenedLocales['en-US'] || {};
    if (flatBundle[keyOrPhrase]) {
      translated = flatBundle[keyOrPhrase];
    } else if (flatBundle[cleanLower]) {
      translated = flatBundle[cleanLower];
    }

    // 2. Reverse lookup: if keyOrPhrase is a known Portuguese text/key, find its translated value
    if (!translated) {
      const mappedKey = ptToKeyMap.get(cleanLower);
      if (mappedKey) {
        if (flatBundle[mappedKey]) {
          translated = flatBundle[mappedKey];
        } else if (flatBundle[mappedKey.toLowerCase()]) {
          translated = flatBundle[mappedKey.toLowerCase()];
        }
      }
    }

    // 3. Direct STATIC_APP_PHRASES lookup
    if (!translated) {
      const staticEntry = STATIC_APP_PHRASES[cleanLower] || STATIC_APP_PHRASES[keyOrPhrase];
      if (staticEntry) {
        translated = staticEntry[currentLang] || staticEntry[cleanLang] || staticEntry['en'] || null;
      }
    }

    // 4. Try lookup with emoji / icon stripping
    if (!translated) {
      const emojiRegex = /^([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s•\-\+—\(\)\[\]\{\}:;!?#@]+)(.*?)([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s•\-\+—\(\)\[\]\{\}:;!?#@]+)?$/u;
      const matchEmoji = keyOrPhrase.match(emojiRegex);
      if (matchEmoji && matchEmoji[2] && matchEmoji[2].trim().length > 0) {
        const coreText = matchEmoji[2].trim();
        const coreLower = coreText.toLowerCase();
        const staticCore = STATIC_APP_PHRASES[coreLower];
        if (staticCore) {
          const coreTrans = staticCore[currentLang] || staticCore[cleanLang] || staticCore['en'];
          if (coreTrans) {
            translated = (matchEmoji[1] || '') + coreTrans + (matchEmoji[3] || '');
          }
        } else if (flatBundle[coreLower] || flatBundle[coreText]) {
          const coreTrans = flatBundle[coreLower] || flatBundle[coreText];
          translated = (matchEmoji[1] || '') + coreTrans + (matchEmoji[3] || '');
        }
      }
    }

    // 5. Direct RUNTIME_DICTIONARY lookup
    if (!translated) {
      translated = lookupRuntimeTranslation(keyOrPhrase, currentLang) || 
                   (defaultValue ? lookupRuntimeTranslation(defaultValue, currentLang) : null);
    }

    // 6. i18next initialized instance check
    if (!translated) {
      try {
        if (i18n && i18n.isInitialized) {
          const sentinel = '___I18N_MISSING___';
          const i18nRes = i18n.t(keyOrPhrase, {
            lng: currentLang,
            defaultValue: sentinel,
            ...(interpolationParams || {})
          });
          if (i18nRes && i18nRes !== sentinel && i18nRes !== keyOrPhrase) {
            translated = i18nRes;
          }
        }
      } catch (e) {}
    }

    // 7. English fallback for any missing key or phrase
    if (!translated && cleanLang !== 'en') {
      const enFlat = flattenedLocales['en-US'] || flattenedLocales['en'] || {};
      translated = enFlat[keyOrPhrase] || enFlat[cleanLower] || STATIC_APP_PHRASES[cleanLower]?.['en'] || null;
    }

    // 8. Final fallback
    let finalStr = translated || defaultValue || keyOrPhrase;

    // 9. Parameter interpolation
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
