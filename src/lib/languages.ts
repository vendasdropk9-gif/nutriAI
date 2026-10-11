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
 * Exclusively supported 4 primary languages for NutriAI:
 * 1. 🇧🇷 Português brasileiro — pt-BR
 * 2. 🇺🇸 Inglês — en-US
 * 3. 🇪🇸 Espanhol — es-ES
 * 4. 🇫🇷 Francês — fr-FR
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
  // --- Espanha (Español) ---
  {
    code: 'es-ES',
    subtag: 'es-ES',
    originalName: 'Español',
    translatedName: 'Español (España)',
    country: 'España',
    flag: '🇪🇸',
    priority: 'premium',
    currency: 'EUR',
    currencySymbol: '€',
    unitSystem: 'metric',
  },
  // --- França (Français) ---
  {
    code: 'fr-FR',
    subtag: 'fr-FR',
    originalName: 'Français',
    translatedName: 'Français (France)',
    country: 'France',
    flag: '🇫🇷',
    priority: 'premium',
    currency: 'EUR',
    currencySymbol: '€',
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
  const normalized = subtag ? subtag.trim().toLowerCase() : 'pt-br';
  if (normalized === 'pt' || normalized.startsWith('pt')) return languagesList[0];
  if (normalized === 'en' || normalized.startsWith('en')) return languagesList[1];
  if (normalized === 'es' || normalized.startsWith('es')) return languagesList[2];
  if (normalized === 'fr' || normalized.startsWith('fr')) return languagesList[3];
  
  const found = languagesList.find(l => l.subtag.toLowerCase() === normalized || l.code.toLowerCase() === normalized);
  return found || languagesList[0];
}
