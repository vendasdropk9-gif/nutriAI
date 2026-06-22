import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { motion } from 'motion/react';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'pt', originalName: 'Português', translatedName: 'Portuguese (Brazil)', flag: '🇧🇷' },
    { code: 'en', originalName: 'English', translatedName: 'English (US)', flag: '🇺🇸' },
    { code: 'es', originalName: 'Español', translatedName: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', originalName: 'Français', translatedName: 'French', flag: '🇫🇷' },
    { code: 'it', originalName: 'Italiano', translatedName: 'Italian', flag: '🇮🇹' },
    { code: 'de', originalName: 'Deutsch', translatedName: 'German', flag: '🇩🇪' },
    { code: 'nl', originalName: 'Nederlands', translatedName: 'Dutch', flag: '🇳🇱' },
    { code: 'ru', originalName: 'Русский', translatedName: 'Russian', flag: '🇷🇺' },
    { code: 'zh', originalName: '中文', translatedName: 'Chinese (Simplified)', flag: '🇨🇳' },
    { code: 'ja', originalName: '日本語', translatedName: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', originalName: '한국어', translatedName: 'Korean', flag: '🇰🇷' },
    { code: 'ar', originalName: 'العربية', translatedName: 'Arabic', flag: '🇸🇦' },
    { code: 'hi', originalName: 'हिन्दी', translatedName: 'Hindi', flag: '🇮🇳' },
  ];

  return (
    <div className="space-y-4 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-800 dark:text-slate-200">Idioma</h4>
          <p className="text-sm text-slate-500">
            Selecione o idioma de sua preferência para utilizar todo o aplicativo.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
        {languages.map((lng) => (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            key={lng.code}
            type="button"
            onClick={() => i18n.changeLanguage(lng.code)}
            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left outline-none ${
              i18n.language?.startsWith(lng.code)
                ? 'bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-50/50 dark:bg-slate-900/40 border-transparent text-slate-500 hover:bg-slate-100/50'
            }`}
          >
            <span className="text-2xl">{lng.flag}</span>
            <div>
              <p className="font-bold text-xs tracking-wider">{lng.originalName}</p>
              <p className="text-[10px] opacity-80">{lng.translatedName}</p>
            </div>
            <div className={`ml-auto shrink-0 w-3.5 h-3.5 rounded-full border-2 ${
              i18n.language?.startsWith(lng.code)
                ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_#10b981]'
                : 'border-slate-300 dark:border-slate-600'
            }`} />
          </motion.button>
        ))}
      </div>
    </div>
  );
};
