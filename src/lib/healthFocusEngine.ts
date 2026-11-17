import { HealthFocusMuteEvent, HealthFocusProfile, UserProfile } from '../types';

export const HEALTH_FOCUS_STORAGE_KEY = 'nutri_health_focus_profile';
export const MUTED_TRACKING_LOG_KEY = 'nutri_ad_muted_tracking_log';
export const MUTED_CATEGORIES_STORAGE_KEY = 'nutri_ad_muted_categories';
export const NUTRI_PROFILE_STORAGE_KEY = 'nutri-profile';

/**
 * Maps ad categories to similar / adjacent keywords and concepts
 * so muting or hiding one category silently deprioritizes related ad types
 * and AI recommendations in the future.
 */
export const CATEGORY_SIMILAR_KEYWORDS: Record<string, string[]> = {
  fast_food: [
    'fast food',
    'fastfood',
    'ultraprocessado',
    'ultraprocessados',
    'fritura',
    'frituras',
    'hamburguer',
    'burger',
    'refrigerante',
    'pizza',
    'batata frita',
    'cheat meal',
    'dia do lixo',
    'lanche rapido',
    'delivery fast',
    'acucar refinado',
  ],
  supplements: [
    'suplemento',
    'suplementos',
    'whey',
    'whey protein',
    'creatina',
    'pre-treino',
    'termogenico',
    'supplements',
    'protein powder',
    'ergogenico',
    'bcaa',
    'glutamina',
    'hipercalorico',
  ],
  fitness: [
    'equipamento',
    'equipamentos esportivos',
    'halteres',
    'barra olimpica',
    'academia',
    'musculacao',
    'bodybuilding',
    'powerlifting',
    'crossfit',
    'fitness',
    'tenis de corrida',
  ],
  organic: [
    'organico',
    'organicos',
    'organic',
    'hortifruti',
    'cesta organica',
    'feira fresca',
  ],
  nutrition: [
    'garrafa termica',
    'smart hydrate',
    'hidratacao',
    'cha funcional',
    'acessorio nutricional',
  ],
};

/**
 * Defines cross-category similarity weights when a category is muted/hidden
 * (e.g., hiding/muting fast_food softly nudges down processed indulgence;
 * muting supplements emphasizes whole foods).
 */
export const SIMILAR_CATEGORY_CLUSTERS: Record<string, string[]> = {
  fast_food: ['ultraprocessed', 'high_sugar', 'cheat_meal'],
  supplements: ['synthetic_ergogenics', 'protein_powders'],
  fitness: ['gym_gear', 'cardio_gear'],
  organic: ['farm_delivery'],
  nutrition: ['hydration_gear'],
};

const CATEGORY_FRIENDLY_LABELS: Record<string, string> = {
  fast_food: 'Fast Food & Ultraprocessados',
  supplements: 'Suplementos Sintéticos',
  fitness: 'Equipamentos Fitness',
  organic: 'Produtos Orgânicos',
  nutrition: 'Acessórios de Nutrição & Hidratação',
};

function normalizeTerm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function createEmptyHealthFocusProfile(existingGoals?: string): HealthFocusProfile {
  return {
    focusLabel: existingGoals?.trim() || 'Equilíbrio nutricional e bem-estar',
    deprioritizedCategories: [],
    deprioritizedKeywords: [],
    categoryWeights: {},
    muteHistory: [],
    aiDirective: '',
    strictnessMode: 'balanced',
    updatedAt: new Date(0).toISOString(),
  };
}

export function loadMutedTrackingLog(): HealthFocusMuteEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MUTED_TRACKING_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadLocalHealthFocusProfile(profile?: UserProfile | null): HealthFocusProfile {
  let storedFocus: HealthFocusProfile | null = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(HEALTH_FOCUS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          storedFocus = {
            focusLabel: parsed.focusLabel || profile?.goals || 'Equilíbrio nutricional e bem-estar',
            deprioritizedCategories: Array.isArray(parsed.deprioritizedCategories)
              ? parsed.deprioritizedCategories
              : [],
            deprioritizedKeywords: Array.isArray(parsed.deprioritizedKeywords)
              ? parsed.deprioritizedKeywords
              : [],
            categoryWeights:
              parsed.categoryWeights && typeof parsed.categoryWeights === 'object'
                ? parsed.categoryWeights
                : {},
            muteHistory: Array.isArray(parsed.muteHistory) ? parsed.muteHistory : [],
            aiDirective: typeof parsed.aiDirective === 'string' ? parsed.aiDirective : '',
            strictnessMode: parsed.strictnessMode || 'balanced',
            manualOverrideAt: parsed.manualOverrideAt,
            updatedAt: parsed.updatedAt || new Date(0).toISOString(),
          };
        }
      }
    } catch {
      // Ignore parse errors in restricted/corrupted storage
    }
  }

  let profileFocus: HealthFocusProfile | null = null;
  if (profile?.healthFocus && typeof profile.healthFocus === 'object') {
    profileFocus = {
      focusLabel: profile.healthFocus.focusLabel || profile.goals || 'Equilíbrio nutricional e bem-estar',
      deprioritizedCategories: Array.isArray(profile.healthFocus.deprioritizedCategories)
        ? profile.healthFocus.deprioritizedCategories
        : [],
      deprioritizedKeywords: Array.isArray(profile.healthFocus.deprioritizedKeywords)
        ? profile.healthFocus.deprioritizedKeywords
        : [],
      categoryWeights:
        profile.healthFocus.categoryWeights && typeof profile.healthFocus.categoryWeights === 'object'
          ? profile.healthFocus.categoryWeights
          : {},
      muteHistory: Array.isArray(profile.healthFocus.muteHistory)
        ? profile.healthFocus.muteHistory
        : [],
      aiDirective: profile.healthFocus.aiDirective || '',
      strictnessMode: profile.healthFocus.strictnessMode || 'balanced',
      manualOverrideAt: profile.healthFocus.manualOverrideAt,
      updatedAt: profile.healthFocus.updatedAt || new Date(0).toISOString(),
    };
  }

  if (storedFocus && profileFocus) {
    const storedTs = new Date(storedFocus.updatedAt || 0).getTime();
    const profileTs = new Date(profileFocus.updatedAt || 0).getTime();
    return storedTs >= profileTs ? storedFocus : profileFocus;
  }

  if (profileFocus) return profileFocus;
  if (storedFocus) return storedFocus;

  return createEmptyHealthFocusProfile(profile?.goals);
}

function deriveHealthFocusLabel(deprioritizedCategories: string[], baseGoals?: string): string {
  const base = baseGoals?.trim() || 'Alimentação saudável e longevidade';
  if (deprioritizedCategories.length === 0) return base;

  const modifiers: string[] = [];
  if (deprioritizedCategories.includes('fast_food')) {
    modifiers.push('Foco em comida de verdade (sem ultraprocessados/fast food)');
  }
  if (deprioritizedCategories.includes('supplements')) {
    modifiers.push('Preferência por nutrientes de alimentos integrais (sem suplementos)');
  }
  if (deprioritizedCategories.includes('fitness')) {
    modifiers.push('Foco nutricional e hábitos cotidianos');
  }

  if (modifiers.length === 0) {
    return `${base} • Filtro personalizado ativo`;
  }

  return `${base} • ${modifiers.join(' • ')}`;
}

function buildAiDirective(deprioritizedCategories: string[], deprioritizedKeywords: string[]): string {
  if (deprioritizedCategories.length === 0 && deprioritizedKeywords.length === 0) {
    return '';
  }

  const categoryNames = deprioritizedCategories.map(
    (c) => CATEGORY_FRIENDLY_LABELS[c] || c
  );
  const keywordPreview = deprioritizedKeywords.slice(0, 12).join(', ');

  return `Despriorizar e evitar recomendações, produtos ou anúncios relacionados a: ${categoryNames.join(', ')}${
    keywordPreview ? ` (termos evitados: ${keywordPreview})` : ''
  }.`;
}

export interface RecordHiddenAdCategoryParams {
  category: string;
  action: 'mute' | 'hide' | 'unmute';
  adId?: string;
  placementId?: string;
  profile?: UserProfile | null;
}

/**
 * Hidden tracking engine that asynchronously records muted or hidden ad categories
 * locally and silently refines the user's Health Focus profile so future ad matches
 * and AI recommendations deprioritize similar categories.
 */
export async function recordHiddenAdCategoryEvent({
  category,
  action,
  adId,
  placementId,
  profile,
}: RecordHiddenAdCategoryParams): Promise<HealthFocusProfile> {
  // Yield asynchronously so the UI toggle/dismiss stays completely non-blocking
  await Promise.resolve();

  const normalizedCategory = normalizeTerm(category) || 'general';
  const nowIso = new Date().toISOString();
  const similarCategories = SIMILAR_CATEGORY_CLUSTERS[normalizedCategory] || [];

  const event: HealthFocusMuteEvent = {
    category: normalizedCategory,
    action,
    adId,
    placementId,
    similarCategories,
    timestamp: nowIso,
  };

  // 1. Append to hidden local tracking log
  const existingLog = loadMutedTrackingLog();
  const nextLog = [...existingLog, event].slice(-100);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MUTED_TRACKING_LOG_KEY, JSON.stringify(nextLog));
    } catch {
      // Ignore storage quota errors
    }
  }

  // 2. Refine Health Focus profile silently
  const currentFocus = loadLocalHealthFocusProfile(profile);
  const nextWeights: Record<string, number> = { ...(currentFocus.categoryWeights || {}) };
  let nextDeprioritized = new Set<string>(currentFocus.deprioritizedCategories || []);

  // Count recent hides for this category
  const hideCountForCategory = nextLog.filter(
    (entry) => entry.category === normalizedCategory && entry.action === 'hide'
  ).length;

  // Also check explicit muted categories in localStorage if available
  let explicitMutedList: string[] = Array.isArray(profile?.mutedAdCategories)
    ? [...profile.mutedAdCategories]
    : [];
  if (typeof window !== 'undefined') {
    try {
      const rawMuted = window.localStorage.getItem(MUTED_CATEGORIES_STORAGE_KEY);
      if (rawMuted) {
        const parsedMuted = JSON.parse(rawMuted);
        if (Array.isArray(parsedMuted)) {
          explicitMutedList = parsedMuted.filter((c): c is string => typeof c === 'string');
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (action === 'mute') {
    nextWeights[normalizedCategory] = 0;
    nextDeprioritized.add(normalizedCategory);
    for (const simCat of similarCategories) {
      const prevSim = typeof nextWeights[simCat] === 'number' ? nextWeights[simCat] : 1;
      nextWeights[simCat] = Number(Math.max(0.25, prevSim * 0.6).toFixed(2));
    }
  } else if (action === 'hide') {
    const prevWeight = typeof nextWeights[normalizedCategory] === 'number' ? nextWeights[normalizedCategory] : 1;
    const lowered = Number(Math.max(0.1, prevWeight - 0.35).toFixed(2));
    nextWeights[normalizedCategory] = lowered;

    for (const simCat of similarCategories) {
      const prevSim = typeof nextWeights[simCat] === 'number' ? nextWeights[simCat] : 1;
      nextWeights[simCat] = Number(Math.max(0.4, prevSim - 0.15).toFixed(2));
    }

    // Repeated hides or steep weight drop automatically flags category for deprioritization
    if (hideCountForCategory >= 2 || lowered <= 0.35) {
      nextDeprioritized.add(normalizedCategory);
    }
  } else if (action === 'unmute') {
    nextWeights[normalizedCategory] = 1.0;
    nextDeprioritized.delete(normalizedCategory);
    for (const simCat of similarCategories) {
      nextWeights[simCat] = 1.0;
    }
  }

  // Ensure consistency with explicit muted list
  for (const explicitCat of explicitMutedList) {
    if (action !== 'unmute' || explicitCat !== normalizedCategory) {
      nextDeprioritized.add(explicitCat);
      nextWeights[explicitCat] = 0;
    }
  }

  const deprioritizedCategories = Array.from(nextDeprioritized);

  // Collect keywords for all deprioritized or significantly downgraded categories
  const keywordSet = new Set<string>();
  for (const catKey of deprioritizedCategories) {
    const kws = CATEGORY_SIMILAR_KEYWORDS[catKey] || [];
    kws.forEach((kw) => keywordSet.add(kw));
  }
  for (const [catKey, weight] of Object.entries(nextWeights)) {
    if (typeof weight === 'number' && weight < 0.7) {
      const kws = CATEGORY_SIMILAR_KEYWORDS[catKey] || [];
      kws.forEach((kw) => keywordSet.add(kw));
    }
  }

  const deprioritizedKeywords = Array.from(keywordSet);
  const focusLabel = deriveHealthFocusLabel(deprioritizedCategories, profile?.goals);
  const aiDirective = buildAiDirective(deprioritizedCategories, deprioritizedKeywords);

  const updatedFocus: HealthFocusProfile = {
    focusLabel,
    deprioritizedCategories,
    deprioritizedKeywords,
    categoryWeights: nextWeights,
    muteHistory: nextLog.slice(-30),
    aiDirective,
    updatedAt: nowIso,
  };

  // 3. Persist updated Health Focus locally and update local nutri-profile synchronously/safely
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(HEALTH_FOCUS_STORAGE_KEY, JSON.stringify(updatedFocus));

      const rawStoredProfile = window.localStorage.getItem(NUTRI_PROFILE_STORAGE_KEY);
      if (rawStoredProfile) {
        const parsedProfile = JSON.parse(rawStoredProfile);
        if (parsedProfile && typeof parsedProfile === 'object') {
          parsedProfile.healthFocus = updatedFocus;
          if (Array.isArray(explicitMutedList)) {
            parsedProfile.mutedAdCategories = explicitMutedList;
          }
          parsedProfile.updatedAt = nowIso;
          window.localStorage.setItem(NUTRI_PROFILE_STORAGE_KEY, JSON.stringify(parsedProfile));
        }
      }

      window.dispatchEvent(
        new CustomEvent('nutri-health-focus-updated', {
          detail: {
            healthFocus: updatedFocus,
            mutedAdCategories: explicitMutedList,
            event,
          },
        })
      );
    } catch {
      // Silent fallback if storage is blocked
    }
  }

  return updatedFocus;
}

/**
 * Evaluates a candidate ad against the user's Health Focus profile to return
 * a priority multiplier in [0, 1]. Neutral ads score 1.0; deprioritized or
 * keyword-similar ads score lower so non-deprioritized ads win selection.
 */
export function getAdHealthFocusPriorityFactor(
  ad: { category: string; title?: string; description?: string; interests?: string[] },
  healthFocus?: HealthFocusProfile | null
): number {
  if (!healthFocus) return 1;

  const category = normalizeTerm(ad.category || '');
  let factor = 1;

  if (Array.isArray(healthFocus.deprioritizedCategories) && healthFocus.deprioritizedCategories.includes(category)) {
    factor = Math.min(factor, 0.05);
  }

  const weight = healthFocus.categoryWeights?.[category];
  if (typeof weight === 'number' && weight < factor) {
    factor = Math.max(0.05, weight);
  }

  // Check similarity via deprioritized keywords across ad interests/title/description
  const deprioritizedKeywords = healthFocus.deprioritizedKeywords || [];
  if (deprioritizedKeywords.length > 0 && factor > 0.2) {
    const adCorpus = normalizeTerm(
      `${ad.title || ''} ${ad.description || ''} ${(ad.interests || []).join(' ')}`
    );
    const hasSimilarKeyword = deprioritizedKeywords.some(
      (kw) => kw.length >= 3 && adCorpus.includes(normalizeTerm(kw))
    );
    if (hasSimilarKeyword) {
      const keywordPenalty = healthFocus.strictnessMode === 'flexible' ? 0.65 : 0.25;
      factor = Math.min(factor, keywordPenalty);
    }
  }

  return factor;
}

/**
 * Persists manual user overrides from the Profile tab so users can tone down
 * overly restrictive AI filtering or customize their Health Focus preferences.
 */
export function saveManualHealthFocusUpdate(
  profile: UserProfile | null | undefined,
  updates: Partial<HealthFocusProfile>,
  explicitMutedCategories?: string[]
): HealthFocusProfile {
  const current = loadLocalHealthFocusProfile(profile);
  const nowIso = new Date().toISOString();

  const nextDeprioritized = updates.deprioritizedCategories ?? current.deprioritizedCategories;
  const nextKeywords = updates.deprioritizedKeywords ?? current.deprioritizedKeywords;
  const nextStrictness = updates.strictnessMode ?? current.strictnessMode ?? 'balanced';
  const nextFocusLabel =
    updates.focusLabel !== undefined
      ? updates.focusLabel
      : current.focusLabel || deriveHealthFocusLabel(nextDeprioritized, profile?.goals);
  const nextDirective =
    updates.aiDirective !== undefined
      ? updates.aiDirective
      : buildAiDirective(nextDeprioritized, nextKeywords);

  const nextFocus: HealthFocusProfile = {
    ...current,
    ...updates,
    focusLabel: nextFocusLabel,
    deprioritizedCategories: nextDeprioritized,
    deprioritizedKeywords: nextKeywords,
    aiDirective: nextDirective,
    strictnessMode: nextStrictness,
    manualOverrideAt: nowIso,
    updatedAt: nowIso,
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(HEALTH_FOCUS_STORAGE_KEY, JSON.stringify(nextFocus));
      if (explicitMutedCategories) {
        window.localStorage.setItem(MUTED_CATEGORIES_STORAGE_KEY, JSON.stringify(explicitMutedCategories));
        window.dispatchEvent(
          new CustomEvent('nutri-ad-muted-categories-changed', {
            detail: { mutedCategories: explicitMutedCategories },
          })
        );
      }

      const rawStoredProfile = window.localStorage.getItem(NUTRI_PROFILE_STORAGE_KEY);
      if (rawStoredProfile) {
        const parsedProfile = JSON.parse(rawStoredProfile);
        if (parsedProfile && typeof parsedProfile === 'object') {
          parsedProfile.healthFocus = nextFocus;
          if (explicitMutedCategories) {
            parsedProfile.mutedAdCategories = explicitMutedCategories;
          }
          parsedProfile.updatedAt = nowIso;
          window.localStorage.setItem(NUTRI_PROFILE_STORAGE_KEY, JSON.stringify(parsedProfile));
        }
      }

      window.dispatchEvent(
        new CustomEvent('nutri-health-focus-updated', {
          detail: {
            healthFocus: nextFocus,
            mutedAdCategories: explicitMutedCategories ?? profile?.mutedAdCategories ?? [],
          },
        })
      );
    } catch {
      // Ignore storage failures
    }
  }

  return nextFocus;
}

/**
 * Relaxes automatic AI restrictions learned from dismiss/hide tracking while
 * allowing the user to keep or clear explicit category mutes.
 */
export function relaxHealthFocusRestrictions(
  profile: UserProfile | null | undefined,
  options: { clearExplicitMutes?: boolean } = {}
): { healthFocus: HealthFocusProfile; mutedAdCategories: string[] } {
  const clearExplicitMutes = Boolean(options.clearExplicitMutes);
  const currentExplicitMuted = clearExplicitMutes
    ? []
    : Array.isArray(profile?.mutedAdCategories)
      ? profile.mutedAdCategories
      : [];

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(MUTED_TRACKING_LOG_KEY);
    } catch {
      // Ignore storage error
    }
  }

  const nextWeights: Record<string, number> = {};
  for (const cat of currentExplicitMuted) {
    nextWeights[cat] = 0;
  }

  const nextKeywords = clearExplicitMutes
    ? []
    : Array.from(
        new Set(
          currentExplicitMuted.flatMap((cat) => CATEGORY_SIMILAR_KEYWORDS[cat] || [])
        )
      );

  const nextFocus = saveManualHealthFocusUpdate(
    profile,
    {
      strictnessMode: 'flexible',
      deprioritizedCategories: currentExplicitMuted,
      deprioritizedKeywords: nextKeywords,
      categoryWeights: nextWeights,
      muteHistory: [],
      focusLabel: deriveHealthFocusLabel(currentExplicitMuted, profile?.goals),
    },
    clearExplicitMutes ? [] : undefined
  );

  return {
    healthFocus: nextFocus,
    mutedAdCategories: currentExplicitMuted,
  };
}

/**
 * Generates an AI-ready instruction block based on the user's Health Focus profile
 * so Gemini & local recommendation engines deprioritize muted/hidden categories.
 */
export function formatHealthFocusPromptContext(profile?: UserProfile | null): string {
  const healthFocus = loadLocalHealthFocusProfile(profile);
  const mutedCategories = new Set<string>([
    ...(Array.isArray(profile?.mutedAdCategories) ? profile.mutedAdCategories : []),
    ...(Array.isArray(healthFocus.deprioritizedCategories) ? healthFocus.deprioritizedCategories : []),
  ]);

  if (mutedCategories.size === 0 && !healthFocus.aiDirective) {
    return '';
  }

  const list = Array.from(mutedCategories);
  const directive =
    healthFocus.aiDirective ||
    buildAiDirective(list, healthFocus.deprioritizedKeywords || []);

  const strictnessHint =
    healthFocus.strictnessMode === 'flexible'
      ? 'Modo Flexível ativo: evite apenas as categorias explicitamente bloqueadas, mantendo variedade equilibrada nas demais recomendações.'
      : healthFocus.strictnessMode === 'strict'
        ? 'Modo Estrito ativo: evite rigorosamente qualquer item relacionado ou semelhante às categorias bloqueadas.'
        : 'Modo Equilibrado ativo: despriorize os itens bloqueados mantendo sugestões naturais alinhadas ao foco.';

  return `\nPREFERÊNCIA SILENCIOSA DE FOCO EM SAÚDE (Health Focus):
- Foco ajustado: ${healthFocus.focusLabel || profile?.goals || 'Saúde integral'}
- Nível de filtro da IA: ${healthFocus.strictnessMode || 'balanced'} (${strictnessHint})
- Categorias despriorizadas/evitadas pelo usuário: ${list.length > 0 ? list.join(', ') : 'Nenhuma específica'}
- Diretriz para IA: ${directive} Não recomende produtos, lanches ou conteúdos similares às categorias evitadas.`;
}
