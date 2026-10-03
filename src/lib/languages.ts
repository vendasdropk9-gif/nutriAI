export interface LanguageOption {
  code: string;       // Primary i18n key (e.g., 'en-US', 'pt-BR', 'en-GB', 'en-AU')
  subtag: string;     // Full ISO subtag (e.g., 'en-US', 'pt-BR')
  originalName: string; // Native name of the language (e.g., 'English', 'Português')
  translatedName: string; // Display name with variant (e.g., 'English (US)', 'Português (Brasil)')
  country: string;    // Main country name
  flag: string;       // Country flag emoji
  priority: 'premium' | 'growth' | 'global';
  currency?: string;
  currencySymbol?: string;
  unitSystem?: 'metric' | 'imperial';
}

/**
 * Exclusively supported languages & regional locales for NutriAI:
 * 1. United States (English - US)
 * 2. United Kingdom (English - UK)
 * 3. Australia (English - AU)
 * 4. Brazil (Português - Brasil)
 * 
 * All other language options have been removed per specification.
 */
export const languagesList: LanguageOption[] = [
  // --- Estados Unidos (United States) ---
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
  // --- Reino Unido (United Kingdom) ---
  {
    code: 'en-GB',
    subtag: 'en-GB',
    originalName: 'English',
    translatedName: 'English (United Kingdom)',
    country: 'United Kingdom',
    flag: '🇬🇧',
    priority: 'premium',
    currency: 'GBP',
    currencySymbol: '£',
    unitSystem: 'metric',
  },
  // --- Austrália (Australia) ---
  {
    code: 'en-AU',
    subtag: 'en-AU',
    originalName: 'English',
    translatedName: 'English (Australia)',
    country: 'Australia',
    flag: '🇦🇺',
    priority: 'premium',
    currency: 'AUD',
    currencySymbol: '$',
    unitSystem: 'metric',
  },
  // --- Brasil (Brazil) ---
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
  const normalized = subtag ? subtag.trim() : 'pt-BR';
  if (normalized === 'pt') return languagesList.find(l => l.subtag === 'pt-BR') || languagesList[3];
  if (normalized === 'en') return languagesList.find(l => l.subtag === 'en-US') || languagesList[0];
  
  const found = languagesList.find(l => l.subtag.toLowerCase() === normalized.toLowerCase() || l.code.toLowerCase() === normalized.toLowerCase());
  return found || languagesList.find(l => l.subtag === 'pt-BR') || languagesList[3];
}
