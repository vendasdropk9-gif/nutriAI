/**
 * NutriAI Translation Consistency Unit Test Script
 * Validates that all critical core translation keys (navigation, common actions, tabs, settings)
 * are present and consistent across pt-BR, en-US, es-ES, and fr-FR.
 */

import { localesMap } from '../src/i18n/locales';

export function validateLocales(): boolean {
  console.info('🔍 [NutriAI i18n Unit Test] Validating translation consistency across pt-BR, en-US, es-ES, fr-FR...');

  const requiredLocales = ['pt-BR', 'en-US', 'es-ES', 'fr-FR'];
  const coreKeys = [
    'assistant360',
    'quickdishes',
    'coach',
    'generator',
    'fridge',
    'trainer',
    'profile',
    'pricing',
    'home',
    'recipes',
    'settings',
    'save',
    'cancel',
    'back',
    'next',
    'loading',
    'settings_language_title',
    'settings_language_description'
  ];

  let hasErrors = false;

  for (const loc of requiredLocales) {
    const bundle = localesMap[loc];
    if (!bundle) {
      console.error(`❌ Erro: Bundle de tradução '${loc}' não encontrado.`);
      hasErrors = true;
      continue;
    }

    const missingKeys: string[] = [];
    for (const key of coreKeys) {
      const val = bundle[key] || bundle.common?.[key];
      if (!val) {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length > 0) {
      console.warn(`⚠️ [${loc}] Faltam ${missingKeys.length} chaves essenciais:`, missingKeys);
      hasErrors = true;
    } else {
      console.info(`✅ [${loc}] Todas as chaves essenciais validadas com sucesso!`);
    }
  }

  if (hasErrors) {
    console.error('❌ Teste unitário de internacionalização falhou (chaves ausentes).');
    return false;
  } else {
    console.info('🎉 Sucesso! Todos os 4 idiomas (pt-BR, en-US, es-ES, fr-FR) estão consistentes e completos.');
    return true;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('validateLocales.ts')) {
  const success = validateLocales();
  process.exit(success ? 0 : 1);
}
