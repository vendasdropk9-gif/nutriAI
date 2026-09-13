import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { localesMap } from './locales';
import { auth, db, doc, setDoc, serverTimestamp } from '../lib/firebase';

// Construct resources for all locales
const resources: Record<string, { common: any; translation: any }> = {};
for (const [key, bundle] of Object.entries(localesMap)) {
  resources[key] = {
    common: bundle,
    translation: bundle,
  };
}

// Safe helper to determine initial language based on strict priority:
// 1. Saved localStorage 'nutriai_language' (or legacy keys)
// 2. Browser navigator.language
// 3. Fallback to pt-BR
export const getInitialLanguage = (): string => {
  try {
    const saved = localStorage.getItem('nutriai_language') || 
                  localStorage.getItem('language') || 
                  localStorage.getItem('i18nextLng');
    if (saved && resources[saved]) return saved;
    if (saved) {
      const base = saved.split('-')[0];
      if (resources[base]) {
        if (base === 'pt') return 'pt-BR';
        if (base === 'es') return 'es-ES';
        if (base === 'en') return 'en-US';
        return base;
      }
    }
    
    const navLng = typeof navigator !== 'undefined' ? navigator.language : null;
    if (navLng) {
      if (resources[navLng]) return navLng;
      const base = navLng.split('-')[0];
      if (resources[base]) {
        if (base === 'pt') return 'pt-BR';
        if (base === 'es') return 'es-ES';
        if (base === 'en') return 'en-US';
        return base;
      }
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
      'es-AR': ['es', 'pt-BR'],
      'es-CL': ['es', 'pt-BR'],
      'es-CO': ['es', 'pt-BR'],
      'es-PE': ['es', 'pt-BR'],
      'es-ES': ['es', 'pt-BR'],
      'es-MX': ['es', 'pt-BR'],
      'es-UY': ['es', 'pt-BR'],
      'pt-PT': ['pt-BR'],
      'pt': ['pt-BR'],
      'en-US': ['en', 'pt-BR'],
      'en-GB': ['en', 'pt-BR'],
      'en-CA': ['en', 'pt-BR'],
      'en-AU': ['en', 'pt-BR'],
      'fr-FR': ['fr', 'pt-BR'],
      'de-DE': ['de', 'pt-BR'],
      'it-IT': ['it', 'pt-BR'],
      'zh-CN': ['zh', 'pt-BR'],
      'ja-JP': ['ja', 'pt-BR'],
      'ko-KR': ['ko', 'pt-BR'],
      'hi-IN': ['hi', 'pt-BR'],
      'ar-SA': ['ar', 'pt-BR'],
      'tr-TR': ['tr', 'pt-BR'],
      'ru-RU': ['ru', 'pt-BR'],
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
  const isRtl = initialLanguage.startsWith('ar');
  document.documentElement.lang = initialLanguage;
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  if (document.body) {
    if (isRtl) document.body.classList.add('rtl-layout');
    else document.body.classList.remove('rtl-layout');
  }
}

// Function to change language globally in real-time with state, Firestore, Supabase, LocalStorage, and RTL sync
export async function changeLanguage(lng: string, supabaseClient?: any, userId?: string) {
  let targetLng = lng;
  if (targetLng === 'pt') targetLng = 'pt-BR';
  if (targetLng === 'en') targetLng = 'en-US';

  // 1. Apply language in i18next
  await i18n.changeLanguage(targetLng);
  
  // 2. Save preference in localStorage with nutriai_language and backward compatibility keys
  try {
    localStorage.setItem('nutriai_language', targetLng);
    localStorage.setItem('language', targetLng);
    localStorage.setItem('i18nextLng', targetLng);
  } catch (e) {}
  
  // 3. Update documentElement lang & dir (RTL support for Arabic)
  if (typeof document !== 'undefined') {
    const isRtl = targetLng.startsWith('ar');
    document.documentElement.lang = targetLng;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    if (document.body) {
      if (isRtl) {
        document.body.classList.add('rtl-layout');
      } else {
        document.body.classList.remove('rtl-layout');
      }
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
