import ptBR from './pt-BR';
import enUS from './en-US';
import enGB from './en-GB';
import enAU from './en-AU';

export {
  ptBR,
  enUS,
  enGB,
  enAU,
};

/**
 * Exclusively supported locales map for NutriAI:
 * 1. United States (en-US / en)
 * 2. United Kingdom (en-GB)
 * 3. Australia (en-AU)
 * 4. Brazil (pt-BR / pt)
 */
export const localesMap: Record<string, any> = {
  // Brazil / Português
  'pt': ptBR,
  'pt-BR': ptBR,

  // United States / American English
  'en': enUS,
  'en-US': enUS,

  // United Kingdom / British English
  'en-GB': enGB,

  // Australia / Australian English
  'en-AU': enAU,
};

export type SupportedLocale = 'pt-BR' | 'en-US' | 'en-GB' | 'en-AU';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['pt-BR', 'en-US', 'en-GB', 'en-AU'];

export default localesMap;
