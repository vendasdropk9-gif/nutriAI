export interface LanguageOption {
  code: string;       // Primary i18n key (e.g., 'pt-BR', 'en-US')
  subtag: string;     // Full ISO subtag (e.g., 'pt-BR', 'en-US')
  originalName: string; // Native name of the language (e.g., 'Português', 'English')
  translatedName: string; // Display name with variant (e.g., 'Português (Brasil)', 'English (United States)')
  country: string;    // Main country name
  flag: string;       // Country flag emoji
  priority: 'premium' | 'growth' | 'global';
  currency?: string;
  currencySymbol?: string;
  unitSystem?: 'metric' | 'imperial';
}

/**
 * Exclusively supported languages for NutriAI:
 * 1. 🇧🇷 Português (Brasil) — pt-BR
 * 2. 🇺🇸 English (United States) — en-US
 */
export const languagesList: LanguageOption[] = [
  // --- Brasil (Português) ---
  {
    code: 'pt-BR',
    subtag: 'pt-BR',
    originalName: 'Português',
    translatedName: 'Português (Brasil)',
    country: 'Brasil',
    flag: '🇧🇷',
    priority: 'premium',
    currency: 'BRL',
    currencySymbol: 'R$',
    unitSystem: 'metric',
  },
  // --- Estados Unidos (English) ---
  {
    code: 'en-US',
    subtag: 'en-US',
    originalName: 'English',
    translatedName: 'English (United States)',
    country: 'United States',
    flag: '🇺🇸',
    priority: 'premium',
    currency: 'USD',
    currencySymbol: '$',
    unitSystem: 'imperial',
  },
];

export function searchLanguages(query: string): LanguageOption[] {
  if (!query) return languagesList;
  const cleanQuery = query.toLowerCase().trim();
  return languagesList.filter(lang => 
    lang.country.toLowerCase().includes(cleanQuery) ||
    lang.originalName.toLowerCase().includes(cleanQuery) ||
    lang.translatedName.toLowerCase().includes(cleanQuery) ||
    lang.code.toLowerCase().includes(cleanQuery) ||
    lang.subtag.toLowerCase().includes(cleanQuery)
  );
}

export function getLanguageBySubtag(subtag: string): LanguageOption {
  const normalized = subtag ? subtag.trim().toLowerCase() : 'pt-br';
  if (normalized === 'en' || normalized.startsWith('en')) return languagesList[1];
  return languagesList[0];
}
