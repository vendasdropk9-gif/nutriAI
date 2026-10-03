import React, { useEffect, useMemo, useRef } from 'react';
import { localesMap } from '../i18n/locales';
import { useLanguage } from '../contexts/LanguageContext';
import { RUNTIME_DICTIONARY, lookupRuntimeTranslation } from '../i18n/runtimeDictionary';
import { STATIC_APP_PHRASES } from '../i18n/staticPhrases';

// Global WeakMaps to store original textual content and attributes
// This guarantees zero loss of fidelity when cycling through any language and back to Portuguese
const originalTextMap = new WeakMap<Node, string>();
const originalAttrMap = new WeakMap<HTMLElement, Record<string, string>>();

// Global in-memory cache for dynamic translations
const dynamicTranslationCache = new Map<string, string>();
let clientBatchCooldownUntil = 0;



function flattenBundle(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  if (!obj || typeof obj !== 'object') return result;
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullPath] = value;
      if (!result[key]) {
        result[key] = value;
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenBundle(value, fullPath));
    }
  }
  return result;
}

export function AutoTranslator() {
  const { language: activeLang } = useLanguage();
  const isTranslatingRef = useRef(false);
  const pendingNodesRef = useRef<Set<Node>>(new Set());
  const batchTimerRef = useRef<any>(null);

  // Build high-performance bidirectional translation dictionary
  const translationMap = useMemo(() => {
    const currentLang = activeLang || 'pt-BR';
    const cleanLang = currentLang.split('-')[0];
    const isPortuguese = currentLang.startsWith('pt');

    const map = new Map<string, string>();

    const pickTranslation = (translations: Record<string, string>): string | null => {
      if (!translations) return null;
      return translations[currentLang] || translations[cleanLang] || translations['en'] || Object.values(translations)[0] || null;
    };

    // 1. Static high-frequency UI phrases
    for (const [rawPtKey, translations] of Object.entries(STATIC_APP_PHRASES)) {
      const targetText = isPortuguese ? rawPtKey : pickTranslation(translations);
      if (targetText && typeof targetText === 'string') {
        const cleanPt = rawPtKey.toLowerCase().trim();
        map.set(cleanPt, targetText);
        for (const [_, other] of Object.entries(translations)) {
          if (other) map.set(other.toLowerCase().trim(), targetText);
        }
      }
    }

    // 2. RUNTIME_DICTIONARY
    for (const [rawPtKey, translations] of Object.entries(RUNTIME_DICTIONARY)) {
      if (typeof rawPtKey !== 'string') continue;
      const targetText = isPortuguese ? rawPtKey : pickTranslation(translations);
      if (targetText && typeof targetText === 'string') {
        const cleanPtKey = rawPtKey.toLowerCase().trim();
        map.set(cleanPtKey, targetText);
        for (const [_, otherLangText] of Object.entries(translations)) {
          if (otherLangText && typeof otherLangText === 'string') {
            map.set(otherLangText.toLowerCase().trim(), targetText);
          }
        }
      }
    }

    // 3. Flattened Locale bundles (keys AND Portuguese text values)
    const ptFlat = flattenBundle(localesMap['pt-BR'] || {});
    const targetFlat = flattenBundle(localesMap[currentLang] || localesMap[cleanLang] || localesMap['en-US'] || {});
    const usFlat = flattenBundle(localesMap['en-US'] || {});

    for (const [key, ptVal] of Object.entries(ptFlat)) {
      const targetVal = isPortuguese ? ptVal : (targetFlat[key] || usFlat[key] || ptVal);
      if (targetVal && typeof targetVal === 'string') {
        map.set(key.toLowerCase().trim(), targetVal);
        if (typeof ptVal === 'string') {
          map.set(ptVal.toLowerCase().trim(), targetVal);
        }
      }
    }

    for (const [key, targetVal] of Object.entries(targetFlat)) {
      if (targetVal && typeof targetVal === 'string') {
        map.set(key.toLowerCase().trim(), targetVal);
      }
    }

    return map;
  }, [activeLang]);

  useEffect(() => {
    const currentLang = activeLang;
    const isPortuguese = currentLang.startsWith('pt');
    const isRtl = currentLang.startsWith('ar') || currentLang.startsWith('he');

    // Synchronize HTML element attributes and layout class
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = currentLang;
      if (document.body) {
        if (isRtl) {
          document.body.classList.add('rtl-layout');
          document.body.classList.remove('ltr-layout');
        } else {
          document.body.classList.remove('rtl-layout');
          document.body.classList.add('ltr-layout');
        }
      }
    }

    // Comprehensive string translation engine with segment parsing
    const translateString = (str: string): string => {
      if (!str || typeof str !== 'string') return str;
      const trimmed = str.trim();
      if (!trimmed) return str;

      if (isPortuguese) {
        return str;
      }

      // Check dynamic cache first
      const dynKey = `${currentLang}:::${trimmed}`;
      if (dynamicTranslationCache.has(dynKey)) {
        const cached = dynamicTranslationCache.get(dynKey)!;
        const prefix = str.slice(0, str.indexOf(trimmed));
        const suffix = str.slice(str.indexOf(trimmed) + trimmed.length);
        return prefix + cached + suffix;
      }

      const prefix = str.slice(0, str.indexOf(trimmed));
      const suffix = str.slice(str.indexOf(trimmed) + trimmed.length);

      // Helper to translate single phrase or token
      const translatePhrase = (p: string): string => {
        const pTrim = p.trim();
        if (!pTrim) return p;
        const pLower = pTrim.toLowerCase();
        if (translationMap.has(pLower)) return translationMap.get(pLower)!;
        const dictRes = lookupRuntimeTranslation(pTrim, currentLang);
        if (dictRes) return dictRes;
        return p;
      };

      // 1. Direct exact match
      const lower = trimmed.toLowerCase();
      if (translationMap.has(lower)) {
        return prefix + translationMap.get(lower)! + suffix;
      }

      // Direct lookup in runtime dictionary helper
      const dictMatch = lookupRuntimeTranslation(trimmed, currentLang);
      if (dictMatch && dictMatch !== trimmed) {
        return prefix + dictMatch + suffix;
      }

      // 2. Surrounding emojis & icons
      const emojiRegex = /^([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s•\-\+—\(\)\[\]\{\}:;!?#@]+)(.*?)([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s•\-\+—\(\)\[\]\{\}:;!?#@]+)?$/u;
      const matchEmoji = trimmed.match(emojiRegex);
      if (matchEmoji && matchEmoji[2] && matchEmoji[2].trim().length > 0) {
        const coreText = matchEmoji[2].trim();
        const translatedCore = translatePhrase(coreText);
        if (translatedCore !== coreText) {
          const lead = matchEmoji[1] || '';
          const trail = matchEmoji[3] || '';
          return prefix + lead + translatedCore + trail + suffix;
        }
      }

      // 3. Trailing punctuation
      const punctRegex = /^(.+?)([:!?,.;]+)$/;
      const matchPunct = trimmed.match(punctRegex);
      if (matchPunct && matchPunct[1]) {
        const coreText = matchPunct[1].trim();
        const translatedCore = translatePhrase(coreText);
        if (translatedCore !== coreText) {
          return prefix + translatedCore + matchPunct[2] + suffix;
        }
      }

      // 4. Parentheses
      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        const inner = trimmed.slice(1, -1).trim();
        const translatedInner = translatePhrase(inner);
        if (translatedInner !== inner) {
          return prefix + `(${translatedInner})` + suffix;
        }
      }

      // 5. Multi-sentence translation (split paragraphs into individual sentences)
      const sentenceRegex = /([.!?]+(?:\s+|\n+|$))/;
      const sentenceTokens = trimmed.split(sentenceRegex);
      if (sentenceTokens.length > 2) {
        let translatedAnySentence = false;
        const resSentences: string[] = [];
        for (let i = 0; i < sentenceTokens.length; i += 2) {
          const sent = sentenceTokens[i];
          const delim = sentenceTokens[i + 1] || '';
          const sTrim = sent.trim();
          if (sTrim) {
            const sTrans = translatePhrase(sTrim);
            if (sTrans !== sTrim) {
              translatedAnySentence = true;
              const sp = sent.slice(0, sent.indexOf(sTrim));
              const ss = sent.slice(sent.indexOf(sTrim) + sTrim.length);
              resSentences.push(sp + sTrans + ss + delim);
            } else {
              resSentences.push(sent + delim);
            }
          } else {
            resSentences.push(sent + delim);
          }
        }
        if (translatedAnySentence) {
          return prefix + resSentences.join('') + suffix;
        }
      }

      // 6. Colon-based translation (e.g. "Sugerido: Leve 🥗")
      if (trimmed.includes(': ')) {
        const colonIdx = trimmed.indexOf(': ');
        const left = trimmed.slice(0, colonIdx).trim();
        const right = trimmed.slice(colonIdx + 2).trim();
        const leftTrans = translatePhrase(left);
        const rightTrans = translatePhrase(right);
        if (leftTrans !== left || rightTrans !== right) {
          return prefix + `${leftTrans}: ${rightTrans}` + suffix;
        }
      }

      // 7. Segment-based translation for compound phrases (e.g. "Almoço Registrado • Jantar Leve Sugerido")
      if (trimmed.includes(' • ') || trimmed.includes(' | ') || trimmed.includes(' — ') || (trimmed.includes(' - ') && !/^\d+ - \d+$/.test(trimmed))) {
        const delimiter = trimmed.includes(' • ')
          ? ' • '
          : trimmed.includes(' | ')
          ? ' | '
          : trimmed.includes(' — ')
          ? ' — '
          : ' - ';
        const parts = trimmed.split(delimiter);
        let hasTranslatedPart = false;
        const translatedParts = parts.map((part) => {
          const subTrimmed = part.trim();
          if (!subTrimmed) return part;
          const subTrans = translatePhrase(subTrimmed);
          if (subTrans !== subTrimmed) {
            hasTranslatedPart = true;
            return subTrans;
          }
          return part;
        });

        if (hasTranslatedPart) {
          return prefix + translatedParts.join(delimiter) + suffix;
        }
      }

      return str;
    };

    // Dispatch background batch translation for complex untranslated sentences/paragraphs
    const flushPendingTranslations = async () => {
      if (isPortuguese || pendingNodesRef.current.size === 0) return;

      const nodes = Array.from(pendingNodesRef.current);
      pendingNodesRef.current.clear();

      const uniqueTexts: string[] = [];
      const textToNodes = new Map<string, Node[]>();

      nodes.forEach((node) => {
        const orig = originalTextMap.get(node);
        if (orig) {
          const clean = orig.trim();
          // Filter out numbers, pure symbols, or very short tokens
          if (clean.length > 2 && /[a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/.test(clean)) {
            if (!textToNodes.has(clean)) {
              textToNodes.set(clean, []);
              uniqueTexts.push(clean);
            }
            textToNodes.get(clean)!.push(node);
          }
        }
      });

      if (uniqueTexts.length === 0) return;

      // Check localStorage/sessionStorage cache and offline dictionary
      const neededTexts: string[] = [];
      uniqueTexts.forEach((text) => {
        const k = `${currentLang}:::${text}`;
        let cached = dynamicTranslationCache.get(k);
        if (!cached && typeof localStorage !== 'undefined') {
          try {
            cached = localStorage.getItem(`nutri_tr_${k}`) || undefined;
            if (cached) dynamicTranslationCache.set(k, cached);
          } catch (e) {}
        }
        if (!cached) {
          const dictRes = lookupRuntimeTranslation(text, currentLang);
          if (dictRes && dictRes !== text) {
            cached = dictRes;
            dynamicTranslationCache.set(k, cached);
          }
        }
        if (cached) {
          const targetNodes = textToNodes.get(text) || [];
          targetNodes.forEach((node) => {
            const raw = originalTextMap.get(node) || '';
            const p = raw.slice(0, raw.indexOf(text));
            const s = raw.slice(raw.indexOf(text) + text.length);
            node.nodeValue = p + cached + s;
          });
        } else {
          neededTexts.push(text);
        }
      });

      if (neededTexts.length === 0) return;
      if (Date.now() < clientBatchCooldownUntil) return;

      try {
        const response = await fetch('/api/translate-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: neededTexts.slice(0, 30), targetLang: currentLang }),
        });

        if (response.status === 429) {
          clientBatchCooldownUntil = Date.now() + 60000;
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const translations: string[] = data?.translations || [];

          neededTexts.forEach((text, i) => {
            const translated = translations[i];
            if (translated && translated !== text) {
              const k = `${currentLang}:::${text}`;
              dynamicTranslationCache.set(k, translated);
              try {
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem(`nutri_tr_${k}`, translated);
                }
              } catch (e) {}

              const targetNodes = textToNodes.get(text) || [];
              targetNodes.forEach((node) => {
                const raw = originalTextMap.get(node) || '';
                const p = raw.slice(0, raw.indexOf(text));
                const s = raw.slice(raw.indexOf(text) + text.length);
                node.nodeValue = p + translated + s;
              });
            }
          });
        }
      } catch (err) {
        // graceful offline fallback
      }
    };

    const scheduleBatchTranslation = () => {
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      batchTimerRef.current = setTimeout(flushPendingTranslations, 800);
    };

    // Recursive DOM walker that translates or restores original text
    const walkAndTranslate = (node: Node) => {
      if (!node) return;

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName ? el.tagName.toLowerCase() : '';
        if (['script', 'style', 'iframe', 'canvas', 'noscript', 'code', 'pre'].includes(tagName)) {
          return;
        }

        // Handle attributes
        let attrStore = originalAttrMap.get(el);
        if (!attrStore) {
          attrStore = {};
          originalAttrMap.set(el, attrStore);
        }

        for (const attr of ['placeholder', 'title', 'alt', 'aria-label'] as const) {
          const currentVal = el.getAttribute(attr);
          if (currentVal) {
            if (!attrStore[attr]) {
              attrStore[attr] = currentVal;
            }
            if (isPortuguese) {
              const orig = attrStore[attr];
              if (orig && currentVal !== orig) {
                el.setAttribute(attr, orig);
              }
            } else {
              const trans = translateString(attrStore[attr]);
              if (trans && trans !== currentVal) {
                el.setAttribute(attr, trans);
              }
            }
          }
        }
      }

      // Handle Text Nodes
      if (node.nodeType === Node.TEXT_NODE) {
        let original = originalTextMap.get(node);
        if (!original) {
          original = node.nodeValue || '';
          if (original.trim().length > 0) {
            originalTextMap.set(node, original);
          }
        }

        if (original && original.trim().length > 0) {
          if (isPortuguese) {
            if (node.nodeValue !== original) {
              node.nodeValue = original;
            }
          } else {
            const targetText = translateString(original);
            if (targetText && targetText !== node.nodeValue) {
              node.nodeValue = targetText;
            } else if (targetText === original && original.trim().length > 2) {
              // Untranslated Portuguese sentence/paragraph - queue for batch translation
              pendingNodesRef.current.add(node);
              scheduleBatchTranslation();
            }
          }
        }
      }

      // Traverse children
      let child = node.firstChild;
      while (child) {
        walkAndTranslate(child);
        child = child.nextSibling;
      }
    };

    const runFullScan = () => {
      if (isTranslatingRef.current || typeof document === 'undefined' || !document.body) return;
      try {
        isTranslatingRef.current = true;
        walkAndTranslate(document.body);
      } finally {
        isTranslatingRef.current = false;
      }
    };

    // Staggered scans to catch all initial and dynamically rendered components
    runFullScan();
    const t0 = setTimeout(runFullScan, 0);
    const t1 = setTimeout(runFullScan, 50);
    const t2 = setTimeout(runFullScan, 150);
    const t3 = setTimeout(runFullScan, 350);
    const t4 = setTimeout(runFullScan, 700);
    const t5 = setTimeout(runFullScan, 1200);

    const handleLanguageEvent = () => {
      runFullScan();
      setTimeout(runFullScan, 60);
    };

    window.addEventListener('nutri:language-changed', handleLanguageEvent);
    window.addEventListener('languageChanged', handleLanguageEvent);

    // MutationObserver to translate dynamically rendered components, modals, and toasts
    const observer = new MutationObserver((mutations) => {
      if (isTranslatingRef.current) return;
      isTranslatingRef.current = true;

      try {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              walkAndTranslate(node);
            });
          } else if (mutation.type === 'characterData') {
            const targetNode = mutation.target;
            let original = originalTextMap.get(targetNode);
            if (!original) {
              original = targetNode.nodeValue || '';
              if (original.trim().length > 0) {
                originalTextMap.set(targetNode, original);
              }
            }
            if (original && original.trim().length > 0) {
              if (isPortuguese) {
                if (targetNode.nodeValue !== original) {
                  targetNode.nodeValue = original;
                }
              } else {
                const targetText = translateString(original);
                if (targetText && targetText !== targetNode.nodeValue) {
                  targetNode.nodeValue = targetText;
                } else if (targetText === original && original.trim().length > 2) {
                  pendingNodesRef.current.add(targetNode);
                  scheduleBatchTranslation();
                }
              }
            }
          } else if (mutation.type === 'attributes') {
            const el = mutation.target as HTMLElement;
            const attr = mutation.attributeName;
            if (attr === 'placeholder' || attr === 'title' || attr === 'alt' || attr === 'aria-label') {
              let attrStore = originalAttrMap.get(el);
              if (!attrStore) {
                attrStore = {};
                originalAttrMap.set(el, attrStore);
              }
              const currentVal = el.getAttribute(attr);
              if (currentVal) {
                if (!attrStore[attr]) {
                  attrStore[attr] = currentVal;
                }
                if (isPortuguese) {
                  const orig = attrStore[attr];
                  if (orig && currentVal !== orig) {
                    el.setAttribute(attr, orig);
                  }
                } else {
                  const trans = translateString(attrStore[attr]);
                  if (trans && trans !== currentVal) {
                    el.setAttribute(attr, trans);
                  }
                }
              }
            }
          }
        }
      } finally {
        isTranslatingRef.current = false;
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'alt', 'aria-label'],
    });

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      window.removeEventListener('nutri:language-changed', handleLanguageEvent);
      window.removeEventListener('languageChanged', handleLanguageEvent);
      observer.disconnect();
    };
  }, [translationMap, activeLang]);

  return null;
}
export default AutoTranslator;
