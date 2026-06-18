import { useTranslation } from 'react-i18next';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  return (
    <div className="flex gap-2 p-2">
      {languages.map((lng) => (
        <button
          key={lng.code}
          onClick={() => i18n.changeLanguage(lng.code)}
          className={`px-3 py-1 rounded ${i18n.language === lng.code ? 'bg-emerald-500 text-white' : 'bg-slate-200'}`}
        >
          {lng.flag} {lng.name}
        </button>
      ))}
    </div>
  );
};
