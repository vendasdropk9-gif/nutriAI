/**
 * NutriAI Translation Consistency Unit Test Script
 * Scans translation objects for pt-BR and en-US to verify that
 * all keys are consistent, preventing missing or orphan keys across languages.
 */

import { localesMap } from '../src/i18n/locales';

export function validateLocales(): boolean {
  console.info('🔍 [NutriAI i18n Unit Test] Scanning translation keys across pt-BR and en-US for consistency...');

  const targetLocales = ['pt-BR', 'en-US'];
  const referenceLocale = 'pt-BR';
  const refBundle = localesMap[referenceLocale];

  if (!refBundle) {
    console.error(`❌ Reference locale '${referenceLocale}' not found in localesMap.`);
    return false;
  }

  const refKeys = Object.keys(refBundle);
  let hasErrors = false;

  for (const loc of targetLocales) {
    const bundle = localesMap[loc];
    if (!bundle) {
      console.error(`❌ Error: Translation bundle '${loc}' not found.`);
      hasErrors = true;
      continue;
    }

    const bundleKeys = Object.keys(bundle);

    // Find missing keys in loc compared to reference (pt-BR)
    const missingKeys = refKeys.filter(k => bundle[k] === undefined);
    // Find orphan keys in loc that are not present in reference
    const orphanKeys = bundleKeys.filter(k => refBundle[k] === undefined);

    if (missingKeys.length > 0) {
      console.warn(`⚠️ [${loc}] Missing ${missingKeys.length} keys compared to ${referenceLocale}:`, missingKeys.slice(0, 10));
      hasErrors = true;
    }

    if (orphanKeys.length > 0) {
      console.warn(`⚠️ [${loc}] Found ${orphanKeys.length} orphan/extra keys not in ${referenceLocale}:`, orphanKeys.slice(0, 10));
    }

    if (missingKeys.length === 0 && orphanKeys.length === 0) {
      console.info(`✅ [${loc}] Perfectly synchronized with ${referenceLocale} (${bundleKeys.length} keys).`);
    } else if (missingKeys.length === 0) {
      console.info(`✅ [${loc}] All reference keys present (${bundleKeys.length} total keys).`);
    }
  }

  if (hasErrors) {
    console.error('❌ i18n unit test failed: missing translation keys detected.');
    return false;
  } else {
    console.info('🎉 Success! All translation files (pt-BR, en-US) are fully consistent.');
    return true;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('validateLocales.ts')) {
  const success = validateLocales();
  process.exit(success ? 0 : 1);
}
