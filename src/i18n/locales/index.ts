import ptBR from './pt-BR';
import ptPT from './pt-PT';
import enUS from './en-US';
import enGB from './en-GB';
import enAU from './en-AU';
import enCA from './en-CA';
import esES from './es-ES';
import esMX from './es-MX';
import esAR from './es-AR';
import frFR from './fr-FR';
import frCA from './fr-CA';
import deDE from './de-DE';
import itIT from './it-IT';
import jaJP from './ja-JP';
import koKR from './ko-KR';
import zhCN from './zh-CN';
import ruRU from './ru-RU';
import arSA from './ar-SA';

export {
  ptBR,
  ptPT,
  enUS,
  enGB,
  enAU,
  enCA,
  esES,
  esMX,
  esAR,
  frFR,
  frCA,
  deDE,
  itIT,
  jaJP,
  koKR,
  zhCN,
  ruRU,
  arSA,
};

/**
 * Universally supported locales map for NutriAI across all world regions:
 */
export const localesMap: Record<string, any> = {
  // Brazil & Portugal / Português
  'pt': ptBR,
  'pt-BR': ptBR,
  'pt-PT': ptPT,

  // United States, UK, Australia, Canada / English
  'en': enUS,
  'en-US': enUS,
  'en-GB': enGB,
  'en-AU': enAU,
  'en-CA': enCA,

  // Spain, Mexico, Argentina / Español
  'es': esES,
  'es-ES': esES,
  'es-MX': esMX,
  'es-AR': esAR,

  // France, Canada / Français
  'fr': frFR,
  'fr-FR': frFR,
  'fr-CA': frCA,

  // Germany / Deutsch
  'de': deDE,
  'de-DE': deDE,

  // Italy / Italiano
  'it': itIT,
  'it-IT': itIT,

  // Japan / 日本語
  'ja': jaJP,
  'ja-JP': jaJP,

  // South Korea / 한국어
  'ko': koKR,
  'ko-KR': koKR,

  // China / 中文简体
  'zh': zhCN,
  'zh-CN': zhCN,

  // Russia / Русский
  'ru': ruRU,
  'ru-RU': ruRU,

  // Saudi Arabia & Arab world / العربية
  'ar': arSA,
  'ar-SA': arSA,
};

export type SupportedLocale = 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR';

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  'pt-BR',
  'en-US',
  'es-ES',
  'fr-FR'
];

export default localesMap;
