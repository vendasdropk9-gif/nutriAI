import { useState, useEffect, useCallback, useMemo } from 'react';

export type ABVariantId = 'A' | 'B';
export type AdVisualStyle = 'standard' | 'claymorphic';
export type ABTestMode = 'style' | 'format' | 'both';

export interface AdABVariantConfig {
  variantId: ABVariantId;
  label: string;
  format: 'video' | 'banner';
  style: AdVisualStyle;
}

export interface AdABVariantRawMetrics {
  id?: string;
  label?: string;
  format?: 'video' | 'banner';
  style?: AdVisualStyle;
  impressions?: number;
  clicks?: number;
  visibilityRatioSum?: number;
}

export interface AdABVariantComputedStats {
  impressions: number;
  clicks: number;
  ctr: number;
  avgVisibility: number;
  compositeScore: number;
}

export interface AdABEvaluationSummary {
  winnerByClicks: ABVariantId | 'tie' | null;
  winnerByVisibility: ABVariantId | 'tie' | null;
  bestPerformingVariant: ABVariantId | 'tie' | null;
  variantStats: Record<ABVariantId, AdABVariantComputedStats>;
}

export const DEFAULT_AB_VARIANTS: Record<ABVariantId, AdABVariantConfig> = {
  A: {
    variantId: 'A',
    label: 'Variante A • Banner Clássico',
    format: 'banner',
    style: 'standard',
  },
  B: {
    variantId: 'B',
    label: 'Variante B • Vídeo Claymorphic',
    format: 'video',
    style: 'claymorphic',
  },
};

const roundMetric = (value: number, decimals = 3): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export function evaluateABPerformance(
  variants?: Partial<Record<ABVariantId, AdABVariantRawMetrics>> | null
): AdABEvaluationSummary {
  const computeStats = (raw?: AdABVariantRawMetrics): AdABVariantComputedStats => {
    const impressions = typeof raw?.impressions === 'number' && raw.impressions > 0 ? raw.impressions : 0;
    const clicks = typeof raw?.clicks === 'number' && raw.clicks > 0 ? raw.clicks : 0;
    const visibilityRatioSum =
      typeof raw?.visibilityRatioSum === 'number' && raw.visibilityRatioSum > 0
        ? raw.visibilityRatioSum
        : impressions > 0
          ? impressions * 0.5
          : 0;

    const ctr = impressions > 0 ? roundMetric((clicks / impressions) * 100, 2) : 0;
    const avgVisibility = impressions > 0 ? roundMetric(Math.min(1, visibilityRatioSum / impressions), 3) : 0;
    const compositeScore =
      impressions > 0
        ? roundMetric(ctr * 0.7 + avgVisibility * 100 * 0.3, 3)
        : clicks > 0
          ? roundMetric(clicks * 0.7, 3)
          : 0;

    return {
      impressions,
      clicks,
      ctr,
      avgVisibility,
      compositeScore,
    };
  };

  const statsA = computeStats(variants?.A);
  const statsB = computeStats(variants?.B);

  const hasAnyData =
    statsA.impressions > 0 ||
    statsB.impressions > 0 ||
    statsA.clicks > 0 ||
    statsB.clicks > 0;

  let winnerByClicks: ABVariantId | 'tie' | null = null;
  if (statsA.clicks > 0 || statsB.clicks > 0 || (statsA.impressions > 0 && statsB.impressions > 0)) {
    if (Math.abs(statsA.ctr - statsB.ctr) > 0.001) {
      winnerByClicks = statsA.ctr > statsB.ctr ? 'A' : 'B';
    } else if (statsA.clicks !== statsB.clicks) {
      winnerByClicks = statsA.clicks > statsB.clicks ? 'A' : 'B';
    } else {
      winnerByClicks = 'tie';
    }
  }

  let winnerByVisibility: ABVariantId | 'tie' | null = null;
  if (statsA.impressions > 0 || statsB.impressions > 0) {
    if (Math.abs(statsA.avgVisibility - statsB.avgVisibility) > 0.001) {
      winnerByVisibility = statsA.avgVisibility > statsB.avgVisibility ? 'A' : 'B';
    } else if (statsA.impressions !== statsB.impressions) {
      winnerByVisibility = statsA.impressions > statsB.impressions ? 'A' : 'B';
    } else {
      winnerByVisibility = 'tie';
    }
  }

  let bestPerformingVariant: ABVariantId | 'tie' | null = null;
  if (hasAnyData) {
    if (Math.abs(statsA.compositeScore - statsB.compositeScore) > 0.001) {
      bestPerformingVariant = statsA.compositeScore > statsB.compositeScore ? 'A' : 'B';
    } else {
      bestPerformingVariant = 'tie';
    }
  }

  return {
    winnerByClicks,
    winnerByVisibility,
    bestPerformingVariant,
    variantStats: {
      A: statsA,
      B: statsB,
    },
  };
}

export interface UseAdABTestOptions {
  experimentId?: string;
  userId?: string | null;
  forceVariant?: ABVariantId;
  customVariants?: Partial<Record<ABVariantId, Partial<AdABVariantConfig>>>;
}

const getStorageKey = (experimentId: string) => `nutri_ad_ab_variant_${experimentId}`;

const assignDeterministicVariant = (experimentId: string, userId?: string | null): ABVariantId => {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(getStorageKey(experimentId));
      if (stored === 'A' || stored === 'B') {
        return stored;
      }
    }
  } catch {
    // Ignore storage access errors
  }

  let assigned: ABVariantId;
  if (userId && userId.trim().length > 0) {
    const seed = `${experimentId}:${userId}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    assigned = Math.abs(hash) % 2 === 0 ? 'A' : 'B';
  } else {
    assigned = Math.random() < 0.5 ? 'A' : 'B';
  }

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getStorageKey(experimentId), assigned);
    }
  } catch {
    // Ignore storage access errors
  }

  return assigned;
};

export const useAdABTest = ({
  experimentId = 'nutri_ad_ab_v1',
  userId,
  forceVariant,
  customVariants,
}: UseAdABTestOptions) => {
  const safeExperimentId = useMemo(
    () => (experimentId && /^[a-zA-Z0-9_-]+$/.test(experimentId) ? experimentId.slice(0, 128) : 'nutri_ad_ab_v1'),
    [experimentId]
  );

  const [variantId, setVariantId] = useState<ABVariantId>(() => {
    if (forceVariant === 'A' || forceVariant === 'B') return forceVariant;
    return assignDeterministicVariant(safeExperimentId, userId);
  });

  useEffect(() => {
    if (forceVariant === 'A' || forceVariant === 'B') {
      setVariantId(forceVariant);
      return;
    }
    setVariantId(assignDeterministicVariant(safeExperimentId, userId));
  }, [forceVariant, safeExperimentId, userId]);

  useEffect(() => {
    if (typeof window === 'undefined' || forceVariant) return;
    const handleVariantEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.experimentId === safeExperimentId && (detail?.variantId === 'A' || detail?.variantId === 'B')) {
        setVariantId(detail.variantId);
      }
    };
    window.addEventListener('nutri-ad-ab-variant-changed', handleVariantEvent);
    return () => window.removeEventListener('nutri-ad-ab-variant-changed', handleVariantEvent);
  }, [safeExperimentId, forceVariant]);

  const selectVariant = useCallback(
    (nextVariant: ABVariantId) => {
      setVariantId(nextVariant);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(getStorageKey(safeExperimentId), nextVariant);
          window.dispatchEvent(
            new CustomEvent('nutri-ad-ab-variant-changed', {
              detail: { experimentId: safeExperimentId, variantId: nextVariant },
            })
          );
        }
      } catch {
        // Ignore storage errors
      }
    },
    [safeExperimentId]
  );

  const variantsConfig = useMemo<Record<ABVariantId, AdABVariantConfig>>(() => {
    return {
      A: { ...DEFAULT_AB_VARIANTS.A, ...(customVariants?.A || {}), variantId: 'A' },
      B: { ...DEFAULT_AB_VARIANTS.B, ...(customVariants?.B || {}), variantId: 'B' },
    };
  }, [customVariants]);

  const activeVariant = variantsConfig[variantId];

  return {
    experimentId: safeExperimentId,
    variantId,
    activeVariant,
    variantsConfig,
    selectVariant,
  };
};
