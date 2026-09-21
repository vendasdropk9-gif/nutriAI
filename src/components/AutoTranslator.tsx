import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localesMap } from '../i18n/locales';
import { useLanguage } from '../contexts/LanguageContext';

import { RUNTIME_DICTIONARY } from "../i18n/runtimeDictionary";

// Global WeakMaps to store original textual content and attributes
// This prevents loss of fidelity when cycling through multiple languages
const originalTextMap = new WeakMap<Node, string>();
const originalAttrMap = new WeakMap<HTMLElement, Record<string, string>>();

export function AutoTranslator() {
  const { language: contextLanguage } = useLanguage();
  const { i18n } = useTranslation();
  const activeLang = contextLanguage || i18n.language || 'pt-BR';

  // Load comprehensive bidirectional translation dictionary across all languages
  const translationMap = useMemo(() => {
    const currentLang = activeLang;
    const cleanLang = currentLang.split('-')[0];
    const isPortuguese = currentLang.startsWith('pt');

    const map = new Map<string, string>();

    // 1. Process all entries in RUNTIME_DICTIONARY
    for (const rawPtKey of Object.keys(RUNTIME_DICTIONARY)) {
      const translations = RUNTIME_DICTIONARY[rawPtKey];
      const targetText = isPortuguese 
        ? rawPtKey 
        : (translations[cleanLang] || translations[currentLang] || translations['en'] || rawPtKey);

      if (targetText && typeof targetText === 'string') {
        // Map Portuguese key to target language
        map.set(rawPtKey.toLowerCase().trim(), targetText);

        // Map every translation variant across all languages directly to target language
        for (const langCode of Object.keys(translations)) {
          const otherLangText = translations[langCode];
          if (otherLangText && typeof otherLangText === 'string') {
            map.set(otherLangText.toLowerCase().trim(), targetText);
          }
        }
      }
    }

    // 2. Process all locale bundles in localesMap
    const targetBundle = localesMap[currentLang] || localesMap[cleanLang] || localesMap['pt-BR'] || {};
    const ptBundle = localesMap['pt-BR'] || {};

    const allKeys = new Set<string>();
    for (const bundle of Object.values(localesMap)) {
      if (bundle && typeof bundle === 'object') {
        Object.keys(bundle).forEach(k => allKeys.add(k));
      }
    }

    for (const key of allKeys) {
      const targetText = isPortuguese 
        ? (ptBundle[key] || key)
        : (targetBundle[key] || localesMap['en-US']?.[key] || ptBundle[key] || key);

      if (targetText && typeof targetText === 'string') {
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
    
    // Sync document language and text direction (RTL support for Arabic)
    if (currentLang.startsWith('ar')) {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
      document.body.classList.add('rtl-layout');
      document.body.classList.remove('ltr-layout');
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = currentLang;
      document.body.classList.add('ltr-layout');
      document.body.classList.remove('rtl-layout');
    }

    // Helper to translate single string safely with smart punctuation and emoji preservation
    const translateString = (str: string): string => {
      if (!str || typeof str !== 'string') return str;
      const trimmed = str.trim();
      if (!trimmed) return str;

      const prefix = str.slice(0, str.indexOf(trimmed));
      const suffix = str.slice(str.indexOf(trimmed) + trimmed.length);

      // 1. Check exact match
      const lower = trimmed.toLowerCase();
      if (translationMap.has(lower)) {
        const match = translationMap.get(lower)!;
        return prefix + match + suffix;
      }

      // 2. Check for surrounding emojis or leading/trailing symbols
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

      // 3. Check for trailing punctuation (e.g., "Calorias:", "Salvo com sucesso!", "Esqueceu sua senha?")
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

      // 4. Check for parentheses (e.g., "(Fácil)", "(35g+)")
      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        const inner = trimmed.slice(1, -1).trim();
        const innerLower = inner.toLowerCase();
        if (translationMap.has(innerLower)) {
          const translatedInner = translationMap.get(innerLower)!;
          return prefix + `(${translatedInner})` + suffix;
        }
      }

      // If in Portuguese and no translation found, return original string
      if (isPortuguese) {
        return str;
      }

      // If no match, return original text safely
      return str;
    };

    // Recursive function to scan and translate DOM nodes
    const walkAndTranslate = (node: Node) => {
      // Skip script, style and non-visual elements
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        if (['script', 'style', 'iframe', 'canvas', 'noscript'].includes(tagName)) {
          return;
        }

        // Translate attributes if applicable
        let attrStore = originalAttrMap.get(el);
        if (!attrStore) {
          attrStore = {};
          originalAttrMap.set(el, attrStore);
        }

        for (const attr of ['placeholder', 'title', 'alt'] as const) {
          const currentVal = el.getAttribute(attr);
          if (currentVal) {
            if (!attrStore[attr]) {
              attrStore[attr] = currentVal;
            }
            const trans = translateString(attrStore[attr]);
            if (trans && trans !== currentVal) {
              el.setAttribute(attr, trans);
            }
          }
        }
      }

      // Translate text nodes using lossless WeakMap cache
      if (node.nodeType === Node.TEXT_NODE) {
        let original = originalTextMap.get(node);
        if (!original) {
          original = node.nodeValue || '';
          if (original.trim().length > 0) {
            originalTextMap.set(node, original);
          }
        }
        if (original && original.trim().length > 0) {
          const targetText = translateString(original);
          if (targetText && targetText !== node.nodeValue) {
            node.nodeValue = targetText;
          }
        }
      }

      // Process children
      let child = node.firstChild;
      while (child) {
        walkAndTranslate(child);
        child = child.nextSibling;
      }
    };

    // Immediate and staggered passes to guarantee full capture
    walkAndTranslate(document.body);

    const t0 = setTimeout(() => walkAndTranslate(document.body), 0);
    const t1 = setTimeout(() => walkAndTranslate(document.body), 50);
    const t2 = setTimeout(() => walkAndTranslate(document.body), 150);
    const t3 = setTimeout(() => walkAndTranslate(document.body), 300);
    const t4 = setTimeout(() => walkAndTranslate(document.body), 600);

    const handleCustomLangEvent = () => {
      walkAndTranslate(document.body);
      setTimeout(() => walkAndTranslate(document.body), 50);
    };

    window.addEventListener('nutri:language-changed', handleCustomLangEvent);
    window.addEventListener('languageChanged', handleCustomLangEvent);

    // Create a MutationObserver to catch dynamic content additions (e.g. modals, notifications, AI chat bubbles)
    const observer = new MutationObserver((mutations) => {
      observer.disconnect();

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
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
            const targetText = translateString(original);
            if (targetText && targetText !== targetNode.nodeValue) {
              targetNode.nodeValue = targetText;
            }
          }
        } else if (mutation.type === 'attributes') {
          const el = mutation.target as HTMLElement;
          const attr = mutation.attributeName;
          if (attr === 'placeholder' || attr === 'title' || attr === 'alt') {
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
              const trans = translateString(attrStore[attr]);
              if (trans && trans !== currentVal) {
                el.setAttribute(attr, trans);
              }
            }
          }
        }
      }

      connectObserver();
    });

    const connectObserver = () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'title', 'alt']
      });
    };

    connectObserver();

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('nutri:language-changed', handleCustomLangEvent);
      window.removeEventListener('languageChanged', handleCustomLangEvent);
      observer.disconnect();
    };
  }, [translationMap, activeLang]);

  return null; // Invisible global manager
}
