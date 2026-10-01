import { RUNTIME_DICTIONARY, lookupRuntimeTranslation } from '../i18n/runtimeDictionary';
import { localesMap } from '../i18n/locales';

/**
 * High-performance speech & string translator.
 * Ensures that whenever text is sent to the TTS voice engine (Gemini Aoede or browser fallback),
 * it is properly translated into the user's selected language instead of speaking Portuguese.
 */
export function translateSpeechText(text: string, targetLanguage?: string): string {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();

  const lang = targetLanguage || 
    (typeof localStorage !== 'undefined' ? localStorage.getItem('nutriai_language') || localStorage.getItem('i18nextLng') : null) || 
    'pt-BR';

  const isPt = lang.toLowerCase().startsWith('pt');
  if (isPt) {
    return trimmed;
  }

  const cleanLang = lang.split('-')[0].toLowerCase();

  // 1. Direct whole-text lookup in runtime dictionary
  const direct = lookupRuntimeTranslation(trimmed, lang);
  if (direct && direct.trim() !== trimmed) {
    return direct;
  }

  // 2. Direct lookup in localesMap
  const bundle = localesMap[lang] || localesMap[cleanLang] || localesMap['en-US'];
  if (bundle && bundle[trimmed] && typeof bundle[trimmed] === 'string') {
    return bundle[trimmed];
  }

  // 3. Sentence-by-sentence translation
  // Common when multiple sentences are concatenated: e.g. "Como dica rápida... O registro do almoço..."
  const sentenceDelimiters = /([.!?]+[\s\n]+)/;
  const tokens = trimmed.split(sentenceDelimiters);

  if (tokens.length > 1) {
    let hasTranslatedAny = false;
    const translatedTokens = tokens.map((tok) => {
      const cleanTok = tok.trim();
      if (!cleanTok || /^[.!?\s]+$/.test(tok)) {
        return tok;
      }
      const transTok = lookupRuntimeTranslation(cleanTok, lang);
      if (transTok && transTok.trim() !== cleanTok) {
        hasTranslatedAny = true;
        const prefix = tok.slice(0, tok.indexOf(cleanTok));
        const suffix = tok.slice(tok.indexOf(cleanTok) + cleanTok.length);
        return prefix + transTok + suffix;
      }
      return tok;
    });

    if (hasTranslatedAny) {
      return translatedTokens.join('');
    }
  }

  // 4. English fallback lookup for phrases if target language doesn't have an entry
  if (cleanLang !== 'en') {
    const enDirect = lookupRuntimeTranslation(trimmed, 'en-US');
    if (enDirect && enDirect.trim() !== trimmed) {
      return enDirect;
    }
  }

  return trimmed;
}

export default translateSpeechText;
