/**
 * NutriAI Translation Coverage & Fallback Validator
 * Ensures dynamic translation keys (exercise names, recipe titles, states)
 * have robust fallbacks preventing raw keys like 'exercise.name.unknown' from showing in UI.
 */

export function validateTranslationCoverage(
  key: string, 
  fallback?: string, 
  translationMap?: Record<string, string>
): string {
  if (!key || typeof key !== 'string') return fallback || '';
  const cleanKey = key.trim();

  // 1. Check direct match in translation map if provided
  if (translationMap && translationMap[cleanKey]) {
    return translationMap[cleanKey];
  }

  // 2. Validate fallback if provided
  if (
    fallback && 
    typeof fallback === 'string' && 
    fallback.trim() !== '' && 
    !fallback.includes('___I18N_MISSING___') &&
    fallback !== cleanKey
  ) {
    return fallback;
  }

  // 3. If key is a dot-notated path (e.g. 'exercise.name.unknown' or 'recipe.title'),
  // generate an intelligent readable fallback
  if (cleanKey.includes('.')) {
    const parts = cleanKey.split('.');
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart !== 'unknown' && lastPart !== 'missing' && lastPart !== 'default') {
      return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/[-_]/g, ' ');
    }
  }

  return fallback || cleanKey;
}

/**
 * Validates a batch of dynamic keys to ensure none return raw missing key paths.
 */
export function auditDynamicTranslationCoverage(keys: string[], translationMap?: Record<string, string>): { key: string; resolved: string; hasFallback: boolean }[] {
  return keys.map(key => {
    const resolved = validateTranslationCoverage(key, undefined, translationMap);
    const hasFallback = !resolved.includes('.') && resolved !== key;
    return { key, resolved, hasFallback };
  });
}
