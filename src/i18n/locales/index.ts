import ptBR from './pt-BR';
import ptPT from './pt-PT';
import enUS from './en-US';
import enGB from './en-GB';
import enAU from './en-AU';
import enCA from './en-CA';

export {
  ptBR,
  ptPT,
  enUS,
  enGB,
  enAU,
  enCA,
};

/**
 * Exclusively supported locales map for NutriAI (Português & English):
 */
export const localesMap: Record<string, any> = {
  // Português (Brasil & Portugal)
  'pt': ptBR,
  'pt-BR': ptBR,
  'pt-PT': ptPT,

  // English (United States, United Kingdom, Australia, Canada)
  'en': enUS,
  'en-US': enUS,
  'en-GB': enGB,
  'en-AU': enAU,
  'en-CA': enCA,
};

export type SupportedLocale = 'pt-BR' | 'en-US';

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  'pt-BR',
  'en-US'
];

export default localesMap;
