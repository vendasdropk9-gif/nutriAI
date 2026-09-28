import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { localesMap } from '../i18n/locales';
import { useLanguage } from '../contexts/LanguageContext';
import { RUNTIME_DICTIONARY } from '../i18n/runtimeDictionary';

// Global WeakMaps to store original textual content and attributes
// This guarantees zero loss of fidelity when cycling through any language and back to Portuguese
const originalTextMap = new WeakMap<Node, string>();
const originalAttrMap = new WeakMap<HTMLElement, Record<string, string>>();

export function AutoTranslator() {
  const { language: contextLanguage } = useLanguage();
  const { i18n } = useTranslation();
  const activeLang = contextLanguage || i18n.language || 'pt-BR';
  const isTranslatingRef = useRef(false);

  // Build high-performance bidirectional translation dictionary
  const translationMap = useMemo(() => {
    const currentLang = activeLang;
    const cleanLang = currentLang.split('-')[0];
    const isPortuguese = currentLang.startsWith('pt');

    const map = new Map<string, string>();

    // Helper to get best language translation
    const pickTranslation = (translations: Record<string, string>): string | null => {
      if (!translations) return null;
      return translations[currentLang] || translations[cleanLang] || translations['en'] || Object.values(translations)[0] || null;
    };

    // 1. Process all entries in RUNTIME_DICTIONARY
    for (const [rawPtKey, translations] of Object.entries(RUNTIME_DICTIONARY)) {
      if (typeof rawPtKey !== 'string') continue;
      const targetText = isPortuguese ? rawPtKey : pickTranslation(translations);

      if (targetText && typeof targetText === 'string') {
        const cleanPtKey = rawPtKey.toLowerCase().trim();
        map.set(cleanPtKey, targetText);

        // Map every translation variant across all languages to target language
        for (const [_, otherLangText] of Object.entries(translations)) {
          if (otherLangText && typeof otherLangText === 'string') {
            map.set(otherLangText.toLowerCase().trim(), targetText);
          }
        }
      }
    }

    // 2. Process all locale bundles in localesMap
    const targetBundle = localesMap[currentLang] || localesMap[cleanLang] || localesMap['en-US'] || localesMap['pt-BR'] || {};
    const ptBundle = localesMap['pt-BR'] || {};

    const allKeys = new Set<string>();
    for (const bundle of Object.values(localesMap)) {
      if (bundle && typeof bundle === 'object') {
        Object.keys(bundle).forEach((k) => allKeys.add(k));
      }
    }

    for (const key of allKeys) {
      const targetText = isPortuguese
        ? ptBundle[key] || key
        : targetBundle[key] || localesMap['en-US']?.[key] || ptBundle[key] || key;

      if (targetText && typeof targetText === 'string') {
        map.set(key.toLowerCase().trim(), targetText);

        for (const bundle of Object.values(localesMap)) {
          if (bundle && bundle[key] && typeof bundle[key] === 'string') {
            map.set(bundle[key].toLowerCase().trim(), targetText);
          }
        }
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

      const prefix = str.slice(0, str.indexOf(trimmed));
      const suffix = str.slice(str.indexOf(trimmed) + trimmed.length);

      // 1. Direct exact match
      const lower = trimmed.toLowerCase();
      if (translationMap.has(lower)) {
        return prefix + translationMap.get(lower)! + suffix;
      }

      // 2. Surrounding emojis & icons
      const emojiRegex = /^([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s•\-\+—\(\)\[\]\{\}:;!?#@]+)(.*?)([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s•\-\+—\(\)\[\]\{\}:;!?#@]+)?$/u;
      const matchEmoji = trimmed.match(emojiRegex);
      if (matchEmoji && matchEmoji[2] && matchEmoji[2].trim().length > 0) {
        const coreText = matchEmoji[2].trim();
        const coreLower = coreText.toLowerCase();
        if (translationMap.has(coreLower)) {
          const translatedCore = translationMap.get(coreLower)!;
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
        const coreLower = coreText.toLowerCase();
        if (translationMap.has(coreLower)) {
          const translatedCore = translationMap.get(coreLower)!;
          return prefix + translatedCore + matchPunct[2] + suffix;
        }
      }

      // 4. Parentheses
      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        const inner = trimmed.slice(1, -1).trim();
        const innerLower = inner.toLowerCase();
        if (translationMap.has(innerLower)) {
          return prefix + `(${translationMap.get(innerLower)!})` + suffix;
        }
      }

      // 5. Segment-based translation for joined phrases (e.g. "Café da Manhã • 450 kcal" or "Início | 10 min")
      if (trimmed.includes(' • ') || trimmed.includes(' | ') || trimmed.includes(' - ') || trimmed.includes(' — ')) {
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
          const subLower = subTrimmed.toLowerCase();
          if (translationMap.has(subLower)) {
            hasTranslatedPart = true;
            return translationMap.get(subLower)!;
          }
          return part;
        });

        if (hasTranslatedPart) {
          return prefix + translatedParts.join(delimiter) + suffix;
        }
      }

      return str;
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

    // Initial immediate scan and staggered passes
    runFullScan();
    const t0 = setTimeout(runFullScan, 0);
    const t1 = setTimeout(runFullScan, 50);
    const t2 = setTimeout(runFullScan, 150);
    const t3 = setTimeout(runFullScan, 350);
    const t4 = setTimeout(runFullScan, 700);

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
      window.removeEventListener('nutri:language-changed', handleLanguageEvent);
      window.removeEventListener('languageChanged', handleLanguageEvent);
      observer.disconnect();
    };
  }, [translationMap, activeLang]);

  return null;
}
export default AutoTranslator;
