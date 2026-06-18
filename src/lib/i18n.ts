import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importa os arquivos de tradução
import pt from '../locales/pt.json';
import en from '../locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React já protege contra XSS
    },
    detection: {
      order: ['navigator', 'localStorage', 'cookie'],
    },
  });

export default i18n;
