import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { localesMap, SupportedLocale, SUPPORTED_LOCALES } from './locales';
import { RUNTIME_DICTIONARY } from './runtimeDictionary';
import { STATIC_APP_PHRASES } from './staticPhrases';
import { auth, db, doc, setDoc, serverTimestamp } from '../lib/firebase';

// Construct resources exclusively for supported locales (US, UK, AU, BR)
const resources: Record<string, { common: any; translation: any }> = {};
for (const [key, bundle] of Object.entries(localesMap)) {
  resources[key] = {
    common: { ...bundle },
    translation: { ...bundle },
  };
}

// Populate runtime dictionary translations into resource bundles for instant lookup
for (const [phraseKey, translations] of Object.entries(RUNTIME_DICTIONARY)) {
  for (const [langCode, translatedText] of Object.entries(translations)) {
    const targets: string[] = [];
    if (langCode === 'pt') {
      targets.push('pt', 'pt-BR');
    } else if (langCode === 'en') {
      targets.push('en', 'en-US', 'en-GB', 'en-AU');
    } else if (SUPPORTED_LOCALES.includes(langCode as SupportedLocale)) {
      targets.push(langCode);
    }

    for (const target of targets) {
      if (!resources[target]) {
        resources[target] = { common: {}, translation: {} };
      }
      if (!resources[target].common[phraseKey]) {
        resources[target].common[phraseKey] = translatedText;
      }
      if (!resources[target].translation[phraseKey]) {
        resources[target].translation[phraseKey] = translatedText;
      }
    }
  }
}

// Populate curated static UI phrases into resource bundles for instant lookup
for (const [phraseKey, translations] of Object.entries(STATIC_APP_PHRASES)) {
  for (const [langCode, translatedText] of Object.entries(translations)) {
    const targets: string[] = [];
    if (langCode === 'pt') {
      targets.push('pt', 'pt-BR');
    } else if (langCode === 'en') {
      targets.push('en', 'en-US', 'en-GB', 'en-AU');
    } else if (SUPPORTED_LOCALES.includes(langCode as SupportedLocale)) {
      targets.push(langCode);
    }

    for (const target of targets) {
      if (!resources[target]) {
        resources[target] = { common: {}, translation: {} };
      }
      if (!resources[target].common[phraseKey]) {
        resources[target].common[phraseKey] = translatedText;
      }
      if (!resources[target].translation[phraseKey]) {
        resources[target].translation[phraseKey] = translatedText;
      }
    }
  }
}

// Helper to normalize any incoming locale code strictly to one of the 4 supported options
export const normalizeToSupportedLocale = (input?: string | null): SupportedLocale => {
  if (!input) return 'pt-BR';
  const clean = input.trim();
  
  if (clean === 'pt-BR' || clean === 'pt' || clean.toLowerCase().startsWith('pt')) {
    return 'pt-BR';
  }
  if (clean === 'en-GB' || clean.toLowerCase() === 'en-gb' || clean.toLowerCase().includes('uk')) {
    return 'en-GB';
  }
  if (clean === 'en-AU' || clean.toLowerCase() === 'en-au' || clean.toLowerCase().includes('australia')) {
    return 'en-AU';
  }
  if (clean === 'en-US' || clean === 'en' || clean.toLowerCase().startsWith('en')) {
    return 'en-US';
  }

  return 'pt-BR';
};

// Safe helper to determine initial language based on strict priority:
// 1. Next.js style route query (?lang=... or ?locale=...)
// 2. Saved localStorage 'nutriai_language' (or legacy keys)
// 3. Browser navigator.language
// 4. Fallback to pt-BR
export const getInitialLanguage = (): SupportedLocale => {
  try {
    // 0. Route parameter check
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang') || urlParams.get('locale');
      if (urlLang) {
        return normalizeToSupportedLocale(urlLang);
      }
    }

    // 1. LocalStorage check
    const saved = localStorage.getItem('nutriai_language') || 
                  localStorage.getItem('language') || 
                  localStorage.getItem('i18nextLng');
    if (saved) {
      return normalizeToSupportedLocale(saved);
    }
    
    // 2. Browser navigator check
    const navLng = typeof navigator !== 'undefined' ? navigator.language : null;
    if (navLng) {
      return normalizeToSupportedLocale(navLng);
    }
  } catch (e) {
    // ignore
  }
  return 'pt-BR';
};

const initialLanguage = getInitialLanguage();

// Initialize i18n synchronously with all bundled resources
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: {
      'en-US': ['en', 'pt-BR'],
      'en-GB': ['en-US', 'en', 'pt-BR'],
      'en-AU': ['en-US', 'en', 'pt-BR'],
      'en': ['en-US', 'pt-BR'],
      'pt': ['pt-BR'],
      'default': ['pt-BR']
    },
    ns: ['common', 'translation'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'nutriai_language',
    }
  });

// Apply document attributes for initial language
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage;
  document.documentElement.dir = 'ltr';
  if (document.body) {
    document.body.classList.remove('rtl-layout');
    document.body.classList.add('ltr-layout');
  }
}

// Function to change language globally in real-time with state, Firestore, Supabase, and LocalStorage
export async function changeLanguage(lng: string, supabaseClient?: any, userId?: string) {
  const targetLng = normalizeToSupportedLocale(lng);

  // 1. Apply language in i18next
  await i18n.changeLanguage(targetLng);
  
  // 2. Save preference in localStorage & cookies with nutriai_language and backward compatibility keys
  try {
    localStorage.setItem('nutriai_language', targetLng);
    localStorage.setItem('language', targetLng);
    localStorage.setItem('i18nextLng', targetLng);
    if (typeof document !== 'undefined') {
      document.cookie = `nutriai_language=${targetLng};path=/;max-age=31536000;SameSite=Lax`;
    }
  } catch (e) {}

  // 2.1 Sync URL search parameters dynamically (Next.js route pattern without reload)
  if (typeof window !== 'undefined' && window.history && window.location) {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('lang') !== targetLng) {
        url.searchParams.set('lang', targetLng);
        window.history.replaceState(window.history.state, '', url.toString());
      }
    } catch (e) {}
  }
  
  // 3. Update documentElement lang & dir
  if (typeof document !== 'undefined') {
    document.documentElement.lang = targetLng;
    document.documentElement.dir = 'ltr';
    if (document.body) {
      document.body.classList.remove('rtl-layout');
      document.body.classList.add('ltr-layout');
    }
  }

  // 4. Dispatch custom window events for immediate global UI re-rendering
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nutri:language-changed', { detail: targetLng }));
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: targetLng }));
  }

  // 5. Update in Supabase profiles if credentials exist
  if (supabaseClient && userId) {
    try {
      await supabaseClient
        .from('profiles')
        .update({ preferred_language: targetLng, language: targetLng })
        .eq('id', userId);
    } catch (err) {
      console.warn('Could not sync language preference to Supabase:', err);
    }
  }

  // 6. Update in Firestore users profile if logged in
  try {
    const authUser = auth?.currentUser;
    const targetUserId = userId || authUser?.uid;
    if (targetUserId && db) {
      const userDocRef = doc(db, 'users', targetUserId);
      await setDoc(userDocRef, {
        preferred_language: targetLng,
        language: targetLng,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Could not sync language preference to Firestore:', err);
  }

  return targetLng;
}

export default i18n;
