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

// Build universal reverse text-to-key map for instant bidirectional translation across all languages
const textToKeyMap = new Map<string, string>();

for (const [, bundle] of Object.entries(flattenedLocales)) {
  for (const [k, v] of Object.entries(bundle)) {
    if (typeof v === 'string') {
      textToKeyMap.set(v.toLowerCase().trim(), k);
    }
    textToKeyMap.set(k.toLowerCase().trim(), k);
  }
}

// Index STATIC_APP_PHRASES keys and translated values into textToKeyMap
for (const [phrase, translations] of Object.entries(STATIC_APP_PHRASES)) {
  textToKeyMap.set(phrase.toLowerCase().trim(), phrase);
  if (translations && typeof translations === 'object') {
    for (const val of Object.values(translations)) {
      if (typeof val === 'string') {
        textToKeyMap.set(val.toLowerCase().trim(), phrase);
      }
    }
  }
}

// Index RUNTIME_DICTIONARY keys and translated values into textToKeyMap
for (const [phrase, translations] of Object.entries(RUNTIME_DICTIONARY)) {
  textToKeyMap.set(phrase.toLowerCase().trim(), phrase);
  if (translations && typeof translations === 'object') {
    for (const val of Object.values(translations)) {
      if (typeof val === 'string') {
        textToKeyMap.set(val.toLowerCase().trim(), phrase);
      }
    }
  }
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

  const isRtl = language.startsWith('ar');
  const direction: 'ltr' | 'rtl' = isRtl ? 'rtl' : 'ltr';

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
    const normalized = normalizeToSupportedLocale(targetLng);
    const targetIsRtl = normalized.startsWith('ar');

    // 1. Synchronously update state and render key so all components re-render immediately
    setLanguageState(normalized);
    setRenderCount((c) => c + 1);

    // 2. Synchronously update document attributes
    if (typeof document !== 'undefined') {
      document.documentElement.lang = normalized;
      document.documentElement.dir = targetIsRtl ? 'rtl' : 'ltr';
      if (document.body) {
        if (targetIsRtl) {
          document.body.classList.add('rtl-layout');
          document.body.classList.remove('ltr-layout');
        } else {
          document.body.classList.remove('rtl-layout');
          document.body.classList.add('ltr-layout');
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

  // High-performance, fully symmetrical bidirectional translation resolver
  const translate = useCallback((
    keyOrPhrase: string,
    defaultValueOrParams?: string | Record<string, any>,
    params?: Record<string, any>
  ): string => {
    if (!keyOrPhrase || typeof keyOrPhrase !== 'string') return '';

    const defaultValue = typeof defaultValueOrParams === 'string' ? defaultValueOrParams : undefined;
    const interpolationParams = typeof defaultValueOrParams === 'object' ? defaultValueOrParams : params;

    const currentLang = language || 'pt-BR';
    const isEn = currentLang.startsWith('en');
    const targetBundleKey = isEn ? 'en-US' : 'pt-BR';
    const flatBundle = flattenedLocales[targetBundleKey] || flattenedLocales[currentLang] || {};

    let translated: string | null = null;
    const cleanLower = keyOrPhrase.toLowerCase().trim();

    // 1. Direct exact key lookup in target bundle
    if (flatBundle[keyOrPhrase] !== undefined) {
      translated = flatBundle[keyOrPhrase];
    }
    // 2. Direct clean lower key lookup
    else if (flatBundle[cleanLower] !== undefined) {
      translated = flatBundle[cleanLower];
    }
    // 3. Dot-separated path lookup (e.g. "common.save" -> flatBundle["common.save"] or flatBundle["save"])
    else if (keyOrPhrase.includes('.')) {
      const parts = keyOrPhrase.split('.');
      const leafKey = parts[parts.length - 1];
      if (flatBundle[keyOrPhrase] !== undefined) {
        translated = flatBundle[keyOrPhrase];
      } else if (flatBundle[leafKey] !== undefined) {
        translated = flatBundle[leafKey];
      }
    }

    // 4. Reverse lookup: if keyOrPhrase is a phrase in any language, map to canonical key
    if (!translated) {
      const mappedKey = textToKeyMap.get(cleanLower);
      if (mappedKey) {
        if (flatBundle[mappedKey] !== undefined) {
          translated = flatBundle[mappedKey];
        } else if (flatBundle[mappedKey.toLowerCase()] !== undefined) {
          translated = flatBundle[mappedKey.toLowerCase()];
        }
      }
    }

    // 5. If defaultValue was provided and differs from keyOrPhrase, try looking up defaultValue as well
    if (!translated && defaultValue && defaultValue !== keyOrPhrase) {
      const cleanDefLower = defaultValue.toLowerCase().trim();
      if (flatBundle[defaultValue] !== undefined) {
        translated = flatBundle[defaultValue];
      } else if (flatBundle[cleanDefLower] !== undefined) {
        translated = flatBundle[cleanDefLower];
      } else {
        const mappedDefKey = textToKeyMap.get(cleanDefLower);
        if (mappedDefKey && flatBundle[mappedDefKey] !== undefined) {
          translated = flatBundle[mappedDefKey];
        }
      }
    }

    // 6. Direct STATIC_APP_PHRASES lookup
    if (!translated) {
      const staticEntry = STATIC_APP_PHRASES[cleanLower] || STATIC_APP_PHRASES[keyOrPhrase];
      if (staticEntry) {
        translated = isEn ? (staticEntry['en'] || staticEntry['en-US']) : (staticEntry['pt'] || staticEntry['pt-BR']);
      }
    }

    // 7. Try lookup with emoji / icon stripping
    if (!translated) {
      const emojiRegex = /^([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s•\-\+—\(\)\[\]\{\}:;!?#@]+)(.*?)([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s•\-\+—\(\)\[\]\{\}:;!?#@]+)?$/u;
      const matchEmoji = keyOrPhrase.match(emojiRegex);
      if (matchEmoji && matchEmoji[2] && matchEmoji[2].trim().length > 0) {
        const coreText = matchEmoji[2].trim();
        const coreLower = coreText.toLowerCase();
        const staticCore = STATIC_APP_PHRASES[coreLower];
        if (staticCore) {
          const coreTrans = isEn ? (staticCore['en'] || staticCore['en-US']) : (staticCore['pt'] || staticCore['pt-BR']);
          if (coreTrans) {
            translated = (matchEmoji[1] || '') + coreTrans + (matchEmoji[3] || '');
          }
        } else if (flatBundle[coreLower] || flatBundle[coreText]) {
          const coreTrans = flatBundle[coreLower] || flatBundle[coreText];
          translated = (matchEmoji[1] || '') + coreTrans + (matchEmoji[3] || '');
        }
      }
    }

    // 8. Direct RUNTIME_DICTIONARY lookup
    if (!translated) {
      const dictLang = isEn ? 'en' : 'pt';
      translated = lookupRuntimeTranslation(keyOrPhrase, dictLang) || 
                   (defaultValue ? lookupRuntimeTranslation(defaultValue, dictLang) : null);
    }

    // 9. i18next initialized instance check
    if (!translated) {
      try {
        if (i18n && i18n.isInitialized) {
          const sentinel = '___I18N_MISSING___';
          const i18nRes = i18n.t(keyOrPhrase, {
            lng: targetBundleKey,
            defaultValue: sentinel,
            ...(interpolationParams || {})
          });
          if (i18nRes && i18nRes !== sentinel && i18nRes !== keyOrPhrase) {
            translated = i18nRes;
          }
        }
      } catch (e) {}
    }

    // 10. Fallback resolution:
    let finalStr = translated || defaultValue || keyOrPhrase;

    // 11. Parameter interpolation
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
