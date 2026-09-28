import ptBR from './pt-BR';
import enUS from './en-US';
import es from './es';
import esES from './es-ES';
import esAR from './es-AR';
import esCL from './es-CL';
import esCO from './es-CO';
import esPE from './es-PE';
import frFR from './fr-FR';
import deDE from './de-DE';
import itIT from './it-IT';
import zhCN from './zh-CN';
import jaJP from './ja-JP';
import koKR from './ko-KR';
import hiIN from './hi-IN';
import arSA from './ar-SA';
import trTR from './tr-TR';
import ruRU from './ru-RU';
import nlNL from './nl-NL';
import plPL from './pl-PL';
import svSE from './sv-SE';
import noNO from './no-NO';
import daDK from './da-DK';
import fiFI from './fi-FI';
import elGR from './el-GR';
import csCZ from './cs-CZ';
import roRO from './ro-RO';
import huHU from './hu-HU';
import thTH from './th-TH';
import viVN from './vi-VN';
import idID from './id-ID';
import msMY from './ms-MY';
import heIL from './he-IL';
import ukUA from './uk-UA';

export {
  ptBR,
  enUS,
  es,
  esES,
  esAR,
  esCL,
  esCO,
  esPE,
  frFR,
  deDE,
  itIT,
  zhCN,
  jaJP,
  koKR,
  hiIN,
  arSA,
  trTR,
  ruRU,
  nlNL,
  plPL,
  svSE,
  noNO,
  daDK,
  fiFI,
  elGR,
  csCZ,
  roRO,
  huHU,
  thTH,
  viVN,
  idID,
  msMY,
  heIL,
  ukUA,
};

export const localesMap: Record<string, any> = {
  // Portuguese
  'pt': ptBR,
  'pt-BR': ptBR,
  'pt-PT': ptBR,

  // English
  'en': enUS,
  'en-US': enUS,
  'en-GB': enUS,
  'en-CA': enUS,
  'en-AU': enUS,

  // Spanish
  'es': es,
  'es-ES': esES,
  'es-MX': es,
  'es-AR': esAR,
  'es-CL': esCL,
  'es-CO': esCO,
  'es-PE': esPE,
  'es-UY': esAR,
  'es-VE': es,

  // French
  'fr': frFR,
  'fr-FR': frFR,

  // German
  'de': deDE,
  'de-DE': deDE,

  // Italian
  'it': itIT,
  'it-IT': itIT,

  // Dutch
  'nl': nlNL,
  'nl-NL': nlNL,

  // Chinese
  'zh': zhCN,
  'zh-CN': zhCN,
  'zh-TW': zhCN,

  // Japanese
  'ja': jaJP,
  'ja-JP': jaJP,

  // Korean
  'ko': koKR,
  'ko-KR': koKR,

  // Hindi
  'hi': hiIN,
  'hi-IN': hiIN,

  // Turkish
  'tr': trTR,
  'tr-TR': trTR,

  // Russian
  'ru': ruRU,
  'ru-RU': ruRU,

  // Polish
  'pl': plPL,
  'pl-PL': plPL,

  // Swedish
  'sv': svSE,
  'sv-SE': svSE,

  // Norwegian
  'no': noNO,
  'no-NO': noNO,

  // Danish
  'da': daDK,
  'da-DK': daDK,

  // Finnish
  'fi': fiFI,
  'fi-FI': fiFI,

  // Greek
  'el': elGR,
  'el-GR': elGR,

  // Czech
  'cs': csCZ,
  'cs-CZ': csCZ,

  // Romanian
  'ro': roRO,
  'ro-RO': roRO,

  // Hungarian
  'hu': huHU,
  'hu-HU': huHU,

  // Thai
  'th': thTH,
  'th-TH': thTH,

  // Vietnamese
  'vi': viVN,
  'vi-VN': viVN,

  // Indonesian
  'id': idID,
  'id-ID': idID,

  // Malay
  'ms': msMY,
  'ms-MY': msMY,

  // Arabic
  'ar': arSA,
  'ar-SA': arSA,
  'ar-AE': arSA,

  // Hebrew
  'he': heIL,
  'he-IL': heIL,

  // Ukrainian
  'uk': ukUA,
  'uk-UA': ukUA,
};
