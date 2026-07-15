import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Dynamic loaders for language bundles (Lazy Loading)
const loaders: Record<string, () => Promise<any>> = {
  'pt': () => import('../locales/pt-BR/common.json'),
  'pt-BR': () => import('../locales/pt-BR/common.json'),
  'en': () => import('../locales/en/common.json'),
  'es': () => import('../locales/es/common.json'),
  'fr': () => import('../locales/fr/common.json'),
  'it': () => import('../locales/it/common.json'),
  'de': () => import('../locales/de/common.json'),
  'ja': () => import('../locales/ja/common.json'),
  'ko': () => import('../locales/ko/common.json'),
  'zh': () => import('../locales/zh/common.json'),
  'ar': () => import('../locales/ar/common.json'),
  'hi': () => import('../locales/hi/common.json'),
  'ru': () => import('../locales/ru/common.json'),
  'tr': () => import('../locales/tr/common.json'),
};

// Function to load language bundle dynamically
export async function loadLanguageBundle(lng: string): Promise<string> {
  const cleanLng = lng.split('-')[0]; // e.g. pt-BR -> pt
  
  // Find key in loaders
  let loader = loaders[lng] || loaders[cleanLng] || loaders['en'];
  
  try {
    const bundle = await loader();
    const data = bundle.default || bundle;
    
    // Add to i18n
    i18n.addResourceBundle(lng, 'common', data, true, true);
    return lng;
  } catch (error) {
    console.error(`Failed to load translation bundle for language: ${lng}`, error);
    // Fallback to en
    if (lng !== 'en') {
      return loadLanguageBundle('en');
    }
    return 'en';
  }
}

// Function to change language globally in real-time with state, Supabase, LocalStorage, and RTL sync
export async function changeLanguage(lng: string, supabaseClient?: any, userId?: string) {
  const normalizedLng = lng.startsWith('pt') ? 'pt-BR' : lng;
  
  // Load the bundle dynamically
  await loadLanguageBundle(normalizedLng);
  
  // Apply language in i18next
  await i18n.changeLanguage(normalizedLng);
  
  // Save preference in localStorage
  localStorage.setItem('language', normalizedLng);
  localStorage.setItem('i18nextLng', normalizedLng);
  
  // RTL Support for Arabic
  if (normalizedLng === 'ar') {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  } else {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = normalizedLng;
  }

  // Update in Supabase profiles if credentials exist
  if (supabaseClient && userId) {
    try {
      await supabaseClient
        .from('profiles')
        .update({ language: normalizedLng })
        .eq('id', userId);
    } catch (err) {
      console.warn('Could not sync language preference to Supabase:', err);
    }
  }
}

// Get initial language preference safely (from LocalStorage, then Navigator, with fallback to pt-BR)
const getInitialLanguage = (): string => {
  const saved = localStorage.getItem('language') || localStorage.getItem('i18nextLng');
  if (saved) return saved;
  
  const navLng = navigator.language;
  if (navLng) {
    const base = navLng.split('-')[0];
    if (loaders[navLng]) return navLng;
    if (loaders[base]) return base === 'pt' ? 'pt-BR' : base;
  }
  return 'pt-BR';
};

const initialLanguage = getInitialLanguage();

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: initialLanguage,
    fallbackLng: 'pt-BR',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already safeguards from XSS
    },
    react: {
      useSuspense: false, // Turn off Suspense to prevent white screen flickers during bundle load
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

// Pre-load the initial language bundle
loadLanguageBundle(initialLanguage).then(() => {
  if (initialLanguage === 'ar') {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  } else {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = initialLanguage;
  }
});

export default i18n;
