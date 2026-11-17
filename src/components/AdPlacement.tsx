import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { useProfileSync } from '../lib/profileSync';
import { useAdPreference } from '../hooks/useAdPreference';
import {
  useMutedAdCategories,
  KNOWN_AD_CATEGORIES,
  getCategoryLabel,
  getCategoryEmoji
} from '../hooks/useMutedAdCategories';
import {
  useAdABTest,
  evaluateABPerformance,
  ABVariantId,
  AdABVariantConfig,
  ABTestMode,
  AdABEvaluationSummary,
} from '../hooks/useAdABTest';
import { db, auth, doc, collection, getDoc, setDoc, addDoc, increment, serverTimestamp } from '../lib/firebase';
import { 
  Sparkles, 
  X, 
  Info, 
  Volume2, 
  VolumeX, 
  ExternalLink, 
  ShieldCheck, 
  Leaf,
  Apple,
  Dumbbell,
  Video,
  Image as ImageIcon,
  Settings,
  Check,
  FlaskConical,
  Trophy,
  ShieldAlert,
  EyeOff,
  Zap
} from 'lucide-react';

export type AdCategory = 'nutrition' | 'fitness' | 'organic' | 'fast_food' | 'supplements' | string;

export interface SponsoredAdData {
  id: string;
  brand: string;
  badge: string;
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  image: string;
  secondaryImage: string;
  videoUrl?: string;
  category: AdCategory;
}

export interface AdPlacementControls {
  onDismiss: () => void;
  isMuted: boolean;
  toggleMute: (e: React.MouseEvent) => void;
  infoOpen: boolean;
  setInfoOpen: (open: boolean) => void;
  isVideoMode: boolean;
  setIsVideoMode: (videoMode: boolean | ((prev: boolean) => boolean)) => void;
  settingsOpen?: boolean;
  setSettingsOpen?: (open: boolean) => void;
  preferredFormat?: 'video' | 'banner' | null;
  onSelectPreference?: (format: 'video' | 'banner') => void;
  mutedCategories?: string[];
  toggleMuteCategory?: (category: string) => void;
  isCategoryMuted?: (category: string) => boolean;
}

export interface AdPlacementProps {
  placementId: string;
  format?: 'banner' | 'rectangle' | 'native' | 'video';
  adClient?: string;
  adSlot?: string;
  className?: string;
  forceFallback?: boolean;
  onAdDismiss?: (placementId: string) => void;

  // Claymorphic & Custom Dynamic Template Slot Extensions
  templateSlot?: 'default' | 'claymorphic' | 'badge' | 'minimal';
  claymorphic?: boolean;
  customAdData?: Partial<SponsoredAdData>;
  renderTemplate?: (ad: SponsoredAdData, controls: AdPlacementControls) => React.ReactNode;
  profile: UserProfile | null;
  conversionContext?: string;

  // A/B Testing Extensions
  experimentId?: string;
  abTestEnabled?: boolean;
  abTestMode?: ABTestMode;
  forceVariant?: ABVariantId;
  abVariants?: Partial<Record<ABVariantId, Partial<AdABVariantConfig>>>;
}

export interface ContextualSponsoredAd extends SponsoredAdData {
  interests?: string[];
}

const SPONSORED_FALLBACK_ADS: ContextualSponsoredAd[] = [
  {
    id: 'ad-organic-farm',
    brand: 'Fazenda Fresca',
    badge: 'Orgânicos Certificados',
    title: 'Cesta da Semana: Frutas e Vegetais Frescos',
    description: 'Colhidos no mesmo dia direto do produtor familiar. Sem agrotóxicos e com frete grátis para assinantes NutriAI.',
    ctaText: 'Garantir Cesta com Frete Grátis',
    ctaUrl: '#mercado-organico',
    image: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=800',
    secondaryImage: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fresh-vegetables-being-washed-in-a-sink-41484-large.mp4',
    category: 'organic',
    interests: ['organicos', 'alimentacao saudavel', 'vegano', 'vegetariano', 'culinaria', 'hortifruti', 'frutas', 'vegetais', 'nutricao natural', 'dieta limpa', 'organic', 'vegan'],
  },
  {
    id: 'ad-biofit-supplements',
    brand: 'BioFit Nutrition',
    badge: 'Qualidade Garantida',
    title: 'Creatina Creapure & Whey Isolado Puro',
    description: 'Matéria-prima 100% importada, sem aditivos químicos ou açúcar. Otimize sua recuperação muscular.',
    ctaText: 'Aproveitar 20% OFF',
    ctaUrl: '#suplementos-biofit',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=800',
    secondaryImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-athlete-drinking-protein-shake-41716-large.mp4',
    category: 'supplements',
    interests: ['suplementacao', 'suplementos', 'whey', 'creatina', 'proteina', 'ganho de massa', 'nutricao esportiva', 'pre-treino', 'supplements', 'protein'],
  },
  {
    id: 'ad-crave-fastfood-fallback',
    brand: 'Burger Crave Gourmet',
    badge: 'Lanches & Fast Food',
    title: 'Smash Burger Artesanal Duplo com Fritas',
    description: 'Combos rápidos com entrega expressa para matar a fome no fim de semana.',
    ctaText: 'Pedir Delivery',
    ctaUrl: '#fastfood-crave',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    secondaryImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-top-view-of-a-table-with-fast-food-41718-large.mp4',
    category: 'fast_food',
    interests: ['fast food', 'fastfood', 'hamburguer', 'lanche', 'batata frita', 'cheat meal', 'burger'],
  },
  {
    id: 'ad-smarthydrate',
    brand: 'SmartHydrate',
    badge: 'Tecnologia em Saúde',
    title: 'Garrafa Térmica com Lembrete de Água',
    description: 'Monitore sua hidratação em tempo real com sensor digital de temperatura e alertas inteligentes.',
    ctaText: 'Ver Garrafa Inteligente',
    ctaUrl: '#garrafa-smart',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=800',
    secondaryImage: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-water-into-a-glass-from-a-pitcher-41885-large.mp4',
    category: 'nutrition',
    interests: ['hidratacao', 'agua', 'saude', 'longevidade', 'hydration', 'wellness'],
  }
];

const INTEREST_CONTEXTUAL_ADS: ContextualSponsoredAd[] = [
  {
    id: 'ad-crave-fastfood-promo',
    brand: 'Burger Crave Gourmet',
    badge: 'Lanches & Fast Food',
    title: 'Smash Burger Artesanal Duplo com Batata Rústica',
    description: 'Combos indulgentes com entrega expressa para o seu fim de semana ou cheat day.',
    ctaText: 'Ver Cardápio Delivery',
    ctaUrl: '#fastfood-crave',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    secondaryImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-top-view-of-a-table-with-fast-food-41718-large.mp4',
    category: 'fast_food',
    interests: ['fast food', 'fastfood', 'hamburguer', 'lanche', 'batata frita', 'cheat meal', 'dia do lixo', 'refrigerante', 'pizza', 'frituras', 'burger'],
  },
  {
    id: 'ad-irongear-gym-equipment',
    brand: 'IronGear Pro',
    badge: 'Equipamentos Esportivos',
    title: 'Kit Halteres Ajustáveis & Barra Olímpica Pro',
    description: 'Equipamentos esportivos de alta resistência para musculação, força e hipertrofia em casa ou na academia.',
    ctaText: 'Ver Equipamentos Esportivos',
    ctaUrl: '#equipamentos-esportivos',
    image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&q=80&w=800',
    secondaryImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-athlete-drinking-protein-shake-41716-large.mp4',
    category: 'fitness',
    interests: [
      'musculacao',
      'hipertrofia',
      'academia',
      'treino de forca',
      'levantamento de peso',
      'equipamentos esportivos',
      'crossfit',
      'halteres',
      'calistenia',
      'bodybuilding',
      'powerlifting',
      'strength training',
      'weightlifting',
      'fitness',
    ],
  },
  {
    id: 'ad-stridesync-running',
    brand: 'StrideSync Athletics',
    badge: 'Cardio & Performance',
    title: 'Tênis de Corrida Carbon Pro & Monitor Cardíaco',
    description: 'Amortecimento responsivo e métricas de pace em tempo real para potencializar seus treinos de corrida e cardio.',
    ctaText: 'Explorar Linha Cardio',
    ctaUrl: '#corrida-cardio',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800',
    secondaryImage: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-athlete-drinking-protein-shake-41716-large.mp4',
    category: 'fitness',
    interests: ['corrida', 'cardio', 'maratona', 'ciclismo', 'natacao', 'triatlo', 'caminhada', 'running', 'cycling', 'aerobico', 'resistencia'],
  },
  {
    id: 'ad-zenflow-mobility',
    brand: 'ZenFlow Studio',
    badge: 'Bem-Estar & Mobilidade',
    title: 'Tapete TPE Antiderrapante & Kit Alongamento',
    description: 'Equipamento ergonômico de alta densidade para yoga, pilates e recuperação articular pós-treino.',
    ctaText: 'Ver Kit Mobilidade',
    ctaUrl: '#yoga-mobilidade',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
    secondaryImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-water-into-a-glass-from-a-pitcher-41885-large.mp4',
    category: 'fitness',
    interests: ['yoga', 'pilates', 'alongamento', 'mobilidade', 'meditacao', 'flexibilidade', 'bem-estar', 'mindfulness'],
  }
];

function normalizeInterestTerm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function selectContextualAdForProfile(
  profile: UserProfile | null | undefined,
  placementId: string,
  mutedCategories: string[] = []
): { ad: ContextualSponsoredAd; matchedInterest: string | null; allMuted?: boolean } {
  let hash = 0;
  for (let i = 0; i < placementId.length; i++) {
    hash = (hash << 5) - hash + placementId.charCodeAt(i);
    hash |= 0;
  }

  const rawInterests = Array.isArray(profile?.interests)
    ? profile.interests.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  const isCategoryAllowed = (ad: ContextualSponsoredAd) => !mutedCategories.includes(ad.category);
  const eligibleContextualAds = [...INTEREST_CONTEXTUAL_ADS, ...SPONSORED_FALLBACK_ADS].filter(isCategoryAllowed);
  const eligibleFallbackAds = SPONSORED_FALLBACK_ADS.filter(isCategoryAllowed);

  // If user has muted all categories across the entire catalog
  if (eligibleContextualAds.length === 0) {
    return { ad: SPONSORED_FALLBACK_ADS[0], matchedInterest: null, allMuted: true };
  }

  if (rawInterests.length > 0) {
    let bestMatches: Array<{ ad: ContextualSponsoredAd; score: number; matchedInterest: string }> = [];
    let bestScore = 0;

    for (const candidateAd of eligibleContextualAds) {
      const keywords = candidateAd.interests || [];
      if (keywords.length === 0) continue;

      let score = 0;
      let firstMatchedInterest: string | null = null;

      for (const userInterest of rawInterests) {
        const normalizedUserInterest = normalizeInterestTerm(userInterest);
        if (!normalizedUserInterest) continue;

        const isExact = keywords.some((kw) => kw === normalizedUserInterest);
        const isPartial =
          !isExact &&
          keywords.some(
            (kw) =>
              (normalizedUserInterest.length >= 3 && kw.includes(normalizedUserInterest)) ||
              (kw.length >= 3 && normalizedUserInterest.includes(kw))
          );

        if (isExact || isPartial) {
          score += isExact ? 2 : 1;
          if (!firstMatchedInterest) {
            firstMatchedInterest = userInterest.trim();
          }
        }
      }

      if (score > 0 && firstMatchedInterest) {
        if (score > bestScore) {
          bestScore = score;
          bestMatches = [{ ad: candidateAd, score, matchedInterest: firstMatchedInterest }];
        } else if (score === bestScore) {
          bestMatches.push({ ad: candidateAd, score, matchedInterest: firstMatchedInterest });
        }
      }
    }

    if (bestMatches.length > 0) {
      const picked = bestMatches[Math.abs(hash) % bestMatches.length];
      return { ad: picked.ad, matchedInterest: picked.matchedInterest, allMuted: false };
    }
  }

  const pool = eligibleFallbackAds.length > 0 ? eligibleFallbackAds : eligibleContextualAds;
  const fallbackIndex = Math.abs(hash) % pool.length;
  return { ad: pool[fallbackIndex], matchedInterest: null, allMuted: false };
}

type ThirdPartyScriptStatus = 'idle' | 'scheduled' | 'loading' | 'loaded' | 'error';

/**
 * Schedules work during browser idle frames (requestIdleCallback) with a
 * zero-delay timer fallback so third-party ad scripts never block the main thread.
 */
function scheduleIdleTask(task: () => void, timeoutMs = 1200): () => void {
  if (typeof window !== 'undefined' && typeof (window as any).requestIdleCallback === 'function') {
    const idleId = (window as any).requestIdleCallback(task, { timeout: timeoutMs });
    return () => {
      if (typeof (window as any).cancelIdleCallback === 'function') {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }

  const timerId = globalThis.setTimeout(task, 0);
  return () => {
    globalThis.clearTimeout(timerId);
  };
}

/**
 * Lazily injects the third-party AdSense script at most once per page with async/defer
 * and low fetchpriority, reusing an in-flight or already-loaded script element.
 */
function loadThirdPartyAdScriptOnce(adClient: string): Promise<'loaded' | 'error'> {
  if (typeof document === 'undefined') {
    return Promise.resolve('error');
  }

  const existingScript = document.querySelector(
    'script[src*="pagead2.googlesyndication.com"]'
  ) as HTMLScriptElement | null;

  if (existingScript) {
    if (existingScript.dataset.adScriptState === 'loaded') {
      return Promise.resolve('loaded');
    }
    if (existingScript.dataset.adScriptState === 'error') {
      return Promise.resolve('error');
    }
    return new Promise<'loaded' | 'error'>((resolve) => {
      const onLoad = () => {
        existingScript.dataset.adScriptState = 'loaded';
        resolve('loaded');
      };
      const onError = () => {
        existingScript.dataset.adScriptState = 'error';
        resolve('error');
      };
      existingScript.addEventListener('load', onLoad, { once: true });
      existingScript.addEventListener('error', onError, { once: true });
    });
  }

  return new Promise<'loaded' | 'error'>((resolve) => {
    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('fetchpriority', 'low');
    script.setAttribute('data-ad-lazy-script', 'true');
    script.dataset.adScriptState = 'loading';

    script.addEventListener(
      'load',
      () => {
        script.dataset.adScriptState = 'loaded';
        resolve('loaded');
      },
      { once: true }
    );
    script.addEventListener(
      'error',
      () => {
        script.dataset.adScriptState = 'error';
        resolve('error');
      },
      { once: true }
    );

    document.head.appendChild(script);
  });
}

export const AdPlacement: React.FC<AdPlacementProps> = ({
  placementId,
  format = 'banner',
  adClient = 'ca-pub-9876543210123456',
  adSlot = '1234567890',
  className = '',
  forceFallback = false,
  onAdDismiss,
  templateSlot = 'default',
  claymorphic = false,
  customAdData,
  renderTemplate,
  profile,
  conversionContext,
  experimentId = 'nutri_ad_ab_v1',
  abTestEnabled = true,
  abTestMode = 'style',
  forceVariant,
  abVariants
}) => {
  const isAdFreeUser = profile?.isPremium === true;
  const [isDismissed, setIsDismissed] = useState(false);
  const [useFallback, setUseFallback] = useState(forceFallback);
  const [isAdBlockActive, setIsAdBlockActive] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  // Mobile Screen Size Detection Hook (< 768px)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
      return () => mediaQuery.removeListener(handleMediaChange);
    }
  }, []);

  // A/B Testing Variant Assignment (Style & Format)
  const {
    experimentId: activeExperimentId,
    variantId: abVariantId,
    activeVariant: abVariantConfig,
    variantsConfig: abVariantsConfig,
    selectVariant: selectABVariant,
  } = useAdABTest({
    experimentId,
    userId: profile?.id || auth?.currentUser?.uid || null,
    forceVariant,
    customVariants: abVariants,
  });
  const [abEvaluation, setAbEvaluation] = useState<AdABEvaluationSummary | null>(null);

  // Effective format & claymorphic mode evaluation
  const effectiveFormat = (isMobile && format === 'banner') ? 'native' : format;
  const isCompactMobile = isMobile || effectiveFormat === 'native' || templateSlot === 'badge' || templateSlot === 'minimal';
  const effectiveStyle =
    claymorphic || templateSlot === 'claymorphic'
      ? 'claymorphic'
      : abTestEnabled && (abTestMode === 'style' || abTestMode === 'both')
        ? abVariantConfig.style
        : 'standard';
  const isClayMode = effectiveStyle === 'claymorphic';
  
  // Asset Fallback States
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageRetryCount, setImageRetryCount] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const adSenseRef = useRef<HTMLModElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Category Muting Hook: allows users to mute specific categories contrary to health goals
  const {
    mutedCategories,
    toggleMuteCategory,
    isCategoryMuted,
    knownCategories
  } = useMutedAdCategories(profile);

  // Query profile.interests for contextual ad relevance, falling back to placementId hash and respecting mutedCategories
  const { ad: contextualAd, matchedInterest, allMuted } = React.useMemo(
    () => selectContextualAdForProfile(profile, placementId, mutedCategories),
    [profile?.interests, placementId, mutedCategories]
  );

  const selectedAd = React.useMemo(() => {
    return customAdData ? { ...contextualAd, ...customAdData } : contextualAd;
  }, [contextualAd, customAdData]);

  const activeConversionContext = React.useMemo(() => {
    if (conversionContext && conversionContext.trim().length > 0) {
      return conversionContext.trim();
    }
    if (placementId.startsWith('nutri-tab-')) {
      return placementId.replace('nutri-tab-', '');
    }
    return placementId || 'default';
  }, [conversionContext, placementId]);

  // Persistent Format Preference ('video' | 'banner') handled by useAdPreference
  const defaultPrefFormat: 'video' | 'banner' =
    abTestEnabled && (abTestMode === 'format' || abTestMode === 'both')
      ? abVariantConfig.format
      : format === 'video'
        ? 'video'
        : 'banner';
  const { format: prefFormat, updateFormat, initialized: prefInitialized } = useAdPreference(profile, defaultPrefFormat);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Explicit Mutual Exclusion State: exactly one visual mode at a time (Video OR Product Photo)
  const [isVideoMode, setIsVideoMode] = useState<boolean>(() =>
    Boolean(prefFormat === 'video' && selectedAd.videoUrl)
  );
  
  // Sync internal state with preference hook
  useEffect(() => {
    if (!prefInitialized) return;
    
    if (prefFormat === 'video' && selectedAd.videoUrl && !videoError) {
      setIsVideoMode(true);
    } else {
      setIsVideoMode(false);
    }
  }, [prefFormat, prefInitialized, selectedAd.videoUrl, videoError]);

  // Handler to select and persist user preference in localStorage for consistency across sessions
  const handleSelectFormatPreference = (mode: 'video' | 'banner') => {
    updateFormat(mode);
    if (mode === 'video') {
      setVideoError(false);
      setIsVideoMode(true);
    } else {
      setIsVideoMode(false);
    }
  };


  // Conditional Preloading State Management
  const [isNearViewport, setIsNearViewport] = useState<boolean>(() => {
    // In environments without IntersectionObserver (e.g. basic jsdom/SSR), default to true immediately
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return true;
    }
    return false;
  });
  const [isHalfVisible, setIsHalfVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return true;
    }
    return false;
  });
  const [observedVisibilityRatio, setObservedVisibilityRatio] = useState<number>(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return 1.0;
    }
    return 0;
  });
  const [dwellTimeMs, setDwellTimeMs] = useState<number>(0);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [preloadStatus, setPreloadStatus] = useState<'idle' | 'preloading' | 'ready' | 'error'>('idle');
  const [thirdPartyScriptStatus, setThirdPartyScriptStatus] = useState<ThirdPartyScriptStatus>('idle');
  const loggedImpressionsRef = useRef<Set<string>>(new Set());
  const dwellSegmentStartRef = useRef<number | null>(null);
  const unflushedDwellMsRef = useRef<number>(0);
  const isInViewForDwellRef = useRef<boolean>(false);
  const latestFormatRef = useRef<'video' | 'banner'>(isVideoMode ? 'video' : 'banner');
  latestFormatRef.current = isVideoMode ? 'video' : 'banner';
  const latestVisibilityRatioRef = useRef<number>(observedVisibilityRatio);
  latestVisibilityRatioRef.current = observedVisibilityRatio > 0 ? observedVisibilityRatio : 1.0;

  const syncABWinnerEvaluation = React.useCallback(
    async (abTestDocRef: any) => {
      try {
        if (typeof getDoc !== 'function') return;
        const snap = await getDoc(abTestDocRef);
        const data = snap?.exists?.() ? snap.data() : null;
        if (!data?.variants) return;

        const evaluation = evaluateABPerformance(data.variants);
        setAbEvaluation(evaluation);

        if (evaluation.bestPerformingVariant) {
          await Promise.resolve(
            setDoc(
              abTestDocRef,
              {
                bestPerformingVariant: evaluation.bestPerformingVariant,
                winnerByClicks: evaluation.winnerByClicks || 'tie',
                winnerByVisibility: evaluation.winnerByVisibility || 'tie',
                metricsSummary: evaluation.variantStats,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            )
          ).catch(() => {});
        }
      } catch {
        // Non-blocking evaluation fallback
      }
    },
    []
  );

  // Fetch A/B evaluation snapshot when user opens settings modal
  useEffect(() => {
    if (!settingsOpen || !abTestEnabled) return;
    const isUnauthenticatedRealSession = Boolean(
      auth && typeof auth.onAuthStateChanged === 'function' && !auth.currentUser
    );
    if (isUnauthenticatedRealSession || typeof getDoc !== 'function') return;

    const abTestDocRef = doc(db, 'adABTests', activeExperimentId);
    Promise.resolve(getDoc(abTestDocRef))
      .then((snap: any) => {
        if (snap?.exists?.() && snap.data()?.variants) {
          setAbEvaluation(evaluateABPerformance(snap.data().variants));
        }
      })
      .catch(() => {});
  }, [settingsOpen, abTestEnabled, activeExperimentId]);

  const logAdTelemetry = React.useCallback(
    (eventType: 'impression' | 'click', adType: 'video' | 'banner', visibilityRatioValue?: number) => {
      try {
        const isUnauthenticatedRealSession = Boolean(
          auth && typeof auth.onAuthStateChanged === 'function' && !auth.currentUser
        );
        if (isUnauthenticatedRealSession) return;

        const adTypeLabel = adType === 'video' ? 'Vídeo' : 'Banner';
        const telemetryDocRef = doc(db, 'adTelemetry', 'global');
        const telemetryLogsRef = collection(db, 'adTelemetryLogs');
        const uid = auth?.currentUser?.uid || 'anonymous';
        const nowIso = new Date().toISOString();
        const safeVisibilityRatio =
          typeof visibilityRatioValue === 'number' && visibilityRatioValue >= 0
            ? Math.min(1, Math.max(0, Number(visibilityRatioValue.toFixed(3))))
            : observedVisibilityRatio > 0
              ? observedVisibilityRatio
              : 1.0;
        const visibilidadePercentual = Math.min(100, Math.max(0, Math.round(safeVisibilityRatio * 100)));

        const abPayloadMeta = abTestEnabled
          ? {
              experimentId: activeExperimentId,
              abVariant: abVariantId,
              abVariantStyle: effectiveStyle,
              visibilityRatio: safeVisibilityRatio,
            }
          : {};

        if (eventType === 'impression') {
          const loadField = adType === 'video' ? 'videoLoads' : 'bannerLoads';
          Promise.resolve(
            setDoc(
              telemetryDocRef,
              {
                [loadField]: increment(1),
                totalImpressions: increment(1),
                conversionContext: activeConversionContext,
                lastAdType: adTypeLabel,
                visibilidade_percentual: visibilidadePercentual,
                ...abPayloadMeta,
                byContext: {
                  [activeConversionContext]: {
                    [loadField]: increment(1),
                    impressions: increment(1),
                  },
                },
                ...(abTestEnabled
                  ? {
                      byVariant: {
                        [abVariantId]: {
                          impressions: increment(1),
                          [loadField]: increment(1),
                          visibilityRatioSum: increment(safeVisibilityRatio),
                        },
                      },
                    }
                  : {}),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            )
          ).catch((err) => console.error('Failed to log ad impression telemetry', err));

          Promise.resolve(
            addDoc(telemetryLogsRef, {
              eventType: 'impression',
              adType: adTypeLabel,
              format: adType,
              adId: selectedAd.id,
              placementId,
              conversionContext: activeConversionContext,
              visibilidade_percentual: visibilidadePercentual,
              ...abPayloadMeta,
              userId: uid,
              timestamp: serverTimestamp(),
              createdAt: nowIso,
            })
          ).catch((err) => console.error('Failed to log ad impression event', err));

          if (abTestEnabled) {
            const abTestDocRef = doc(db, 'adABTests', activeExperimentId);
            Promise.resolve(
              setDoc(
                abTestDocRef,
                {
                  experimentId: activeExperimentId,
                  placementId,
                  conversionContext: activeConversionContext,
                  variants: {
                    [abVariantId]: {
                      id: abVariantId,
                      label: abVariantConfig.label,
                      format: adType,
                      style: effectiveStyle,
                      impressions: increment(1),
                      visibilityRatioSum: increment(safeVisibilityRatio),
                    },
                  },
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              )
            )
              .then(() => syncABWinnerEvaluation(abTestDocRef))
              .catch((err) => console.error('Failed to log A/B impression metrics', err));
          }
        } else {
          const clickField = adType === 'video' ? 'videoClicks' : 'bannerClicks';
          Promise.resolve(
            setDoc(
              telemetryDocRef,
              {
                [clickField]: increment(1),
                totalClicks: increment(1),
                conversionContext: activeConversionContext,
                lastClickedAdType: adTypeLabel,
                lastClickTimestamp: serverTimestamp(),
                visibilidade_percentual: visibilidadePercentual,
                ...abPayloadMeta,
                byContext: {
                  [activeConversionContext]: {
                    [clickField]: increment(1),
                    clicks: increment(1),
                  },
                },
                ...(abTestEnabled
                  ? {
                      byVariant: {
                        [abVariantId]: {
                          clicks: increment(1),
                          [clickField]: increment(1),
                        },
                      },
                    }
                  : {}),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            )
          ).catch((err) => console.error('Failed to log ad click telemetry', err));

          Promise.resolve(
            addDoc(telemetryLogsRef, {
              eventType: 'click',
              adType: adTypeLabel,
              format: adType,
              adId: selectedAd.id,
              placementId,
              conversionContext: activeConversionContext,
              visibilidade_percentual: visibilidadePercentual,
              ...abPayloadMeta,
              userId: uid,
              timestamp: serverTimestamp(),
              createdAt: nowIso,
            })
          ).catch((err) => console.error('Failed to log ad click event', err));

          if (abTestEnabled) {
            const abTestDocRef = doc(db, 'adABTests', activeExperimentId);
            Promise.resolve(
              setDoc(
                abTestDocRef,
                {
                  experimentId: activeExperimentId,
                  placementId,
                  conversionContext: activeConversionContext,
                  variants: {
                    [abVariantId]: {
                      id: abVariantId,
                      label: abVariantConfig.label,
                      format: adType,
                      style: effectiveStyle,
                      clicks: increment(1),
                    },
                  },
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              )
            )
              .then(() => syncABWinnerEvaluation(abTestDocRef))
              .catch((err) => console.error('Failed to log A/B click metrics', err));
          }
        }
      } catch (err) {
        console.error('Failed to dispatch ad telemetry', err);
      }
    },
    [
      activeConversionContext,
      placementId,
      selectedAd.id,
      abTestEnabled,
      activeExperimentId,
      abVariantId,
      abVariantConfig.label,
      effectiveStyle,
      observedVisibilityRatio,
      syncABWinnerEvaluation,
    ]
  );

  // Record Viewable Impression Telemetry ONLY once >= 50% visible on screen
  useEffect(() => {
    if (isAdFreeUser || !isHalfVisible || isDismissed || !isNearViewport || preloadStatus === 'preloading') return;

    const currentFormat: 'video' | 'banner' = isVideoMode ? 'video' : 'banner';
    const impressionKey = `${placementId}:${selectedAd.id}:${currentFormat}:${activeConversionContext}:${activeExperimentId}:${abVariantId}:${effectiveStyle}`;
    if (loggedImpressionsRef.current.has(impressionKey)) return;

    loggedImpressionsRef.current.add(impressionKey);
    logAdTelemetry('impression', currentFormat, observedVisibilityRatio);
  }, [
    isAdFreeUser,
    isHalfVisible,
    isDismissed,
    isNearViewport,
    preloadStatus,
    isVideoMode,
    placementId,
    selectedAd.id,
    activeConversionContext,
    activeExperimentId,
    abVariantId,
    effectiveStyle,
    observedVisibilityRatio,
    logAdTelemetry,
  ]);

  // Check 24h dismissal state from localStorage
  useEffect(() => {
    try {
      const dismissedUntil = localStorage.getItem(`nutri_ad_dismissed_${placementId}`);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setIsDismissed(true);
      }
    } catch (e) {
      // Ignore storage errors in private mode
    }
  }, [placementId]);

  // Lazy Loading & Conditional Preloading Trigger via IntersectionObserver (250px pre-viewport margin buffer)
  useEffect(() => {
    if (isAdFreeUser || isDismissed || isNearViewport) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIsNearViewport(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '250px 0px', threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isAdFreeUser, isDismissed, isNearViewport]);

  // Viewable Impression Observer: fires only when ad is mounted and at least 50% visible on screen
  const isAdRendered = !isAdFreeUser && !isDismissed && isNearViewport && preloadStatus !== 'preloading';

  useEffect(() => {
    if (!isAdRendered || isHalfVisible) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsHalfVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const ratio = Math.min(1, Math.max(0, Number(entry.intersectionRatio.toFixed(3))));
            setObservedVisibilityRatio(ratio);
            setIsHalfVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: [0.5, 0.6, 0.75, 0.9, 1.0] }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isAdRendered, isHalfVisible]);

  const pauseDwellSegment = React.useCallback(() => {
    if (dwellSegmentStartRef.current !== null) {
      const delta = Math.max(0, Date.now() - dwellSegmentStartRef.current);
      unflushedDwellMsRef.current += delta;
      setDwellTimeMs((prev) => prev + delta);
      dwellSegmentStartRef.current = null;
    }
  }, []);

  const flushDwellTelemetry = React.useCallback(
    (
      reason: 'interval' | 'hidden' | 'dismiss' | 'unmount' | 'visibility_exit',
      restartIfActive = false
    ) => {
      try {
        pauseDwellSegment();

        if (
          restartIfActive &&
          isInViewForDwellRef.current &&
          typeof document !== 'undefined' &&
          document.visibilityState !== 'hidden'
        ) {
          dwellSegmentStartRef.current = Date.now();
        }

        const deltaMs = Math.round(unflushedDwellMsRef.current);
        if (deltaMs <= 0) return;

        unflushedDwellMsRef.current = 0;

        const isUnauthenticatedRealSession = Boolean(
          auth && typeof auth.onAuthStateChanged === 'function' && !auth.currentUser
        );
        if (isUnauthenticatedRealSession) return;

        const currentFormat = latestFormatRef.current;
        const adTypeLabel = currentFormat === 'video' ? 'Vídeo' : 'Banner';
        const safeVisibilityRatio =
          latestVisibilityRatioRef.current > 0 ? latestVisibilityRatioRef.current : 1.0;
        const visibilidadePercentual = Math.min(
          100,
          Math.max(0, Math.round(safeVisibilityRatio * 100))
        );
        const deltaSeconds = Number((deltaMs / 1000).toFixed(2));
        const telemetryDocRef = doc(db, 'adTelemetry', 'global');
        const telemetryLogsRef = collection(db, 'adTelemetryLogs');
        const uid = auth?.currentUser?.uid || 'anonymous';
        const nowIso = new Date().toISOString();

        Promise.resolve(
          setDoc(
            telemetryDocRef,
            {
              totalDwellTimeMs: increment(deltaMs),
              totalDwellTimeSeconds: increment(deltaSeconds),
              lastDwellTimeMs: deltaMs,
              conversionContext: activeConversionContext,
              visibilidade_percentual: visibilidadePercentual,
              ...(abTestEnabled
                ? {
                    experimentId: activeExperimentId,
                    abVariant: abVariantId,
                    abVariantStyle: effectiveStyle,
                    visibilityRatio: safeVisibilityRatio,
                    byVariant: {
                      [abVariantId]: {
                        dwellTimeMs: increment(deltaMs),
                      },
                    },
                  }
                : {}),
              byContext: {
                [activeConversionContext]: {
                  dwellTimeMs: increment(deltaMs),
                },
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        ).catch((err) => console.error('Failed to log ad dwell telemetry', err));

        Promise.resolve(
          addDoc(telemetryLogsRef, {
            eventType: 'dwell',
            adType: adTypeLabel,
            format: currentFormat,
            adId: selectedAd.id,
            placementId,
            conversionContext: activeConversionContext,
            visibilidade_percentual: visibilidadePercentual,
            dwellTimeMs: deltaMs,
            dwellTimeSeconds: deltaSeconds,
            dwellFlushReason: reason,
            ...(abTestEnabled
              ? {
                  experimentId: activeExperimentId,
                  abVariant: abVariantId,
                  abVariantStyle: effectiveStyle,
                  visibilityRatio: safeVisibilityRatio,
                }
              : {}),
            userId: uid,
            timestamp: serverTimestamp(),
            createdAt: nowIso,
          })
        ).catch((err) => console.error('Failed to log ad dwell event', err));

        if (abTestEnabled) {
          const abTestDocRef = doc(db, 'adABTests', activeExperimentId);
          Promise.resolve(
            setDoc(
              abTestDocRef,
              {
                experimentId: activeExperimentId,
                placementId,
                conversionContext: activeConversionContext,
                variants: {
                  [abVariantId]: {
                    id: abVariantId,
                    label: abVariantConfig.label,
                    format: currentFormat,
                    style: effectiveStyle,
                    dwellTimeMs: increment(deltaMs),
                  },
                },
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            )
          ).catch((err) => console.error('Failed to log A/B dwell metrics', err));
        }
      } catch (err) {
        console.error('Failed to flush dwell telemetry', err);
      }
    },
    [
      pauseDwellSegment,
      activeConversionContext,
      abTestEnabled,
      activeExperimentId,
      abVariantId,
      abVariantConfig.label,
      effectiveStyle,
      selectedAd.id,
      placementId,
    ]
  );

  const flushDwellRef = useRef(flushDwellTelemetry);
  flushDwellRef.current = flushDwellTelemetry;

  // Dwell Time Timer: tracks accumulated visible screen time once impression is visible (>=50%)
  useEffect(() => {
    if (!isAdRendered || !isHalfVisible) return;

    isInViewForDwellRef.current = true;
    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
      dwellSegmentStartRef.current = Date.now();
    }

    const intervalId = setInterval(() => {
      flushDwellRef.current('interval', true);
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushDwellRef.current('hidden', false);
      } else if (isInViewForDwellRef.current && dwellSegmentStartRef.current === null) {
        dwellSegmentStartRef.current = Date.now();
      }
    };

    const handlePageHide = () => {
      flushDwellRef.current('hidden', false);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handlePageHide);
    }

    let exitObserver: IntersectionObserver | null = null;
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window && containerRef.current) {
      exitObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
              isInViewForDwellRef.current = false;
              flushDwellRef.current('visibility_exit', false);
            } else {
              const ratio = Math.min(1, Math.max(0, Number(entry.intersectionRatio.toFixed(3))));
              setObservedVisibilityRatio(ratio);
              isInViewForDwellRef.current = true;
              if (
                dwellSegmentStartRef.current === null &&
                (typeof document === 'undefined' || document.visibilityState !== 'hidden')
              ) {
                dwellSegmentStartRef.current = Date.now();
              }
            }
          });
        },
        { threshold: [0, 0.5] }
      );
      exitObserver.observe(containerRef.current);
    }

    return () => {
      clearInterval(intervalId);
      if (exitObserver) exitObserver.disconnect();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handlePageHide);
      }
      isInViewForDwellRef.current = false;
      flushDwellRef.current('unmount', false);
    };
  }, [isAdRendered, isHalfVisible]);

  // Conditional Asset & SDK Preloading: Executed ONLY when element enters pre-viewport threshold (isNearViewport === true)
  useEffect(() => {
    if (isAdFreeUser || !isNearViewport || isDismissed) return;

    let isMounted = true;
    const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');

    if (isJsdom) {
      // Trigger asset preload hints without blocking synchronous Vitest/jsdom rendering
      try {
        const img1 = new Image();
        img1.src = selectedAd.image;
        const img2 = new Image();
        img2.src = selectedAd.secondaryImage;
      } catch {}
      setIsPreloaded(true);
      setPreloadStatus('ready');
    } else {
      setPreloadStatus('preloading');

      const preloadAssets = async () => {
        try {
          const loadImg = (url: string) =>
            new Promise<void>((resolve) => {
              const timer = setTimeout(resolve, 1500);
              const img = new Image();
              img.onload = () => {
                clearTimeout(timer);
                resolve();
              };
              img.onerror = () => {
                clearTimeout(timer);
                resolve();
              };
              img.src = url;
            });

          const loadVideo = (url: string) =>
            new Promise<void>((resolve) => {
              const timer = setTimeout(resolve, 1500);
              const video = document.createElement('video');
              video.onloadedmetadata = () => {
                clearTimeout(timer);
                resolve();
              };
              video.onerror = () => {
                clearTimeout(timer);
                resolve(); // Don't block preloading if video fails
              };
              video.src = url;
              video.preload = 'metadata';
              video.load();
            });

          const assets = [
            loadImg(selectedAd.image),
            loadImg(selectedAd.secondaryImage)
          ];

          if (selectedAd.videoUrl) {
            assets.push(loadVideo(selectedAd.videoUrl));
          }

          await Promise.allSettled(assets);

          if (isMounted) {
            setIsPreloaded(true);
            setPreloadStatus('ready');
          }
        } catch (err) {
          if (isMounted) {
            setPreloadStatus('error');
          }
        }
      };

      preloadAssets();
    }

    // 2. Non-blocking Lazy Loading of Third-Party Ad Script (AdSense / AdMob)
    // Scheduled only when near viewport and executed during idle frames to avoid blocking the main thread
    if (forceFallback) {
      setUseFallback(true);
      return () => {
        isMounted = false;
      };
    }

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelPushIdle: (() => void) | null = null;
    setThirdPartyScriptStatus('scheduled');

    const cancelScriptIdle = scheduleIdleTask(() => {
      if (!isMounted) return;
      setThirdPartyScriptStatus('loading');

      loadThirdPartyAdScriptOnce(adClient)
        .then((result) => {
          if (!isMounted) return;

          if (result === 'error') {
            setThirdPartyScriptStatus('error');
            setIsAdBlockActive(true);
            setUseFallback(true);
            return;
          }

          setThirdPartyScriptStatus('loaded');

          // Defer adsbygoogle slot initialization off the critical paint/scroll frame
          cancelPushIdle = scheduleIdleTask(() => {
            if (!isMounted) return;
            try {
              if (typeof window !== 'undefined' && adSenseRef.current) {
                const adsbygoogle = ((window as any).adsbygoogle = (window as any).adsbygoogle || []);
                adsbygoogle.push({});
              }
            } catch {
              if (isMounted) {
                setUseFallback(true);
              }
              return;
            }

            fallbackTimer = setTimeout(() => {
              if (isMounted) {
                const isFilled = adSenseRef.current && adSenseRef.current.innerHTML.trim().length > 0;
                if (!isFilled) {
                  setUseFallback(true);
                }
              }
            }, 1500);
          });
        })
        .catch(() => {
          if (isMounted) {
            setThirdPartyScriptStatus('error');
            setIsAdBlockActive(true);
            setUseFallback(true);
          }
        });
    });

    return () => {
      isMounted = false;
      cancelScriptIdle();
      if (cancelPushIdle) cancelPushIdle();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [isAdFreeUser, isNearViewport, isDismissed, selectedAd, forceFallback, adClient]);

  const handleDismiss = () => {
    isInViewForDwellRef.current = false;
    flushDwellRef.current('dismiss', false);
    setIsDismissed(true);
    try {
      // Dismiss for 24 hours
      localStorage.setItem(`nutri_ad_dismissed_${placementId}`, String(Date.now() + 24 * 60 * 60 * 1000));
    } catch (e) {}
    if (onAdDismiss) onAdDismiss(placementId);
  };

  const handleImageError = (e?: any) => {
    console.error(`[AdPlacement Error] Falha ao carregar a imagem do produto (${currentImageSrc}) para o anúncio "${selectedAd?.title || 'Anúncio'}":`, e);
    if (imageRetryCount === 0) {
      // Try secondary CDN fallback image
      setImageRetryCount(1);
    } else {
      // Fallback to stylized native SVG gradient card
      setImageError(true);
    }
  };

  const handleVideoError = (e?: any) => {
    console.error(`[AdPlacement Error] Falha ao carregar o vídeo comercial (${selectedAd?.videoUrl}) para o anúncio "${selectedAd?.title || 'Anúncio'}":`, e);
    // If video stream fails to load or codec is not supported, seamlessly switch to product photo mode
    setVideoError(true);
    setIsVideoMode(false);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleAdInteractionClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-ad-control="true"]')) {
      return;
    }
    const currentFormat: 'video' | 'banner' = isVideoMode ? 'video' : 'banner';
    logAdTelemetry('click', currentFormat);
  };

  if (isDismissed || isAdFreeUser) return null;

  // If all ad categories have been muted by the user in alignment with health goals
  if (allMuted && !customAdData) {
    return (
      <div 
        ref={containerRef}
        data-testid={`ad-all-muted-${placementId}`}
        className={`w-full overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 my-3 sm:my-4 shadow-sm ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate">
                Anúncios Silenciados por Meta de Saúde
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Todas as categorias de anúncios foram silenciadas para manter seu foco em <strong>{profile?.goals || 'uma alimentação equilibrada'}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="ad-manage-muted-btn"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer self-end sm:self-auto shrink-0 flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{settingsOpen ? 'Fechar Ajustes' : 'Gerenciar Categorias'}</span>
          </button>
        </div>

        {/* Category Mute Settings Panel for Muted State */}
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-slate-800 space-y-3"
            data-testid="ad-settings-panel"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  Categorias de Anúncios Silenciadas
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              Reative qualquer categoria abaixo para voltar a receber recomendações parceiras:
            </p>

            <div 
              data-testid="ad-mute-categories-grid"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1"
            >
              {knownCategories.map((cat) => {
                const isMuted = isCategoryMuted(cat.key);
                return (
                  <div
                    key={cat.key}
                    className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-2 ${
                      isMuted
                        ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                        : 'bg-white/90 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{cat.emoji}</span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {cat.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                        {cat.healthContext}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid={`mute-category-${cat.key}`}
                      onClick={() => toggleMuteCategory(cat.key)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                        isMuted
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {isMuted ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Silenciado</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Ativo</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // Lightweight skeleton placeholder reserving DOM layout space (0 CLS)
  if (!isNearViewport || preloadStatus === 'preloading') {
    return (
      <div 
        ref={containerRef}
        data-testid={`ad-placement-skeleton-${placementId}`}
        className={`w-full overflow-hidden rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/40 p-4 my-3 animate-pulse min-h-[90px] flex items-center justify-between gap-4 ${className}`}
        aria-label="Carregando anúncio..."
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
        </div>
        <div className="w-24 h-9 bg-slate-200 dark:bg-slate-700 rounded-xl shrink-0 hidden sm:block" />
      </div>
    );
  }

  const isBannerAd = !isVideoMode;

  // Render Google AdSense Script slot if active and not in fallback
  if (!useFallback) {
    return (
      <div 
        ref={containerRef}
        tabIndex={isBannerAd ? 0 : undefined}
        data-testid={`adsense-slot-${placementId}`}
        data-mobile-mode={isMobile ? 'true' : 'false'}
        data-conversion-context={activeConversionContext}
        data-ab-experiment={abTestEnabled ? activeExperimentId : undefined}
        data-ab-variant={abTestEnabled ? abVariantId : undefined}
        data-dwell-ms={dwellTimeMs}
        data-third-party-script-status={thirdPartyScriptStatus}
        data-matched-interest={matchedInterest || undefined}
        data-ad-id={selectedAd.id}
        data-ad-category={selectedAd.category}
        data-banner-hover-scale={isBannerAd ? '1.02' : undefined}
        onClick={handleAdInteractionClick}
        className={`relative w-full overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-2 my-3 ${
          isBannerAd
            ? 'transform-gpu will-change-transform transition-transform duration-300 ease-out hover:scale-[1.02] focus:scale-[1.02] focus-within:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus:scale-100 motion-reduce:focus-within:scale-100'
            : ''
        } ${className}`}
      >
        <div
          data-ad-control="true"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-slate-400 uppercase px-2 mb-1"
        >
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Publicidade
          </span>
          <button
            onClick={handleDismiss}
            className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Ocultar anúncio"
            aria-label="Ocultar anúncio"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        <ins
          ref={adSenseRef}
          className="adsbygoogle block"
          style={{ display: 'block', minHeight: isCompactMobile ? '60px' : format === 'rectangle' ? '250px' : '90px' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={isCompactMobile ? 'fluid' : format === 'rectangle' ? 'rectangle' : 'auto'}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Curated Fallback Ad Creative
  const currentImageSrc = imageRetryCount === 0 ? selectedAd.image : selectedAd.secondaryImage;

  const bannerInteractiveScaleClass = isBannerAd
    ? 'transform-gpu will-change-transform hover:scale-[1.02] focus:scale-[1.02] focus-within:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 motion-reduce:hover:scale-100 motion-reduce:focus:scale-100 motion-reduce:focus-within:scale-100'
    : '';

  // Claymorphic visual container class generator (compositor-only property transitions)
  const containerStyle = isClayMode
    ? `group relative overflow-hidden rounded-3xl border-2 border-emerald-500/25 dark:border-emerald-500/15 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/80 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-teal-950/40 shadow-[0_12px_28px_-6px_rgba(16,185,129,0.18),_inset_0_2px_4px_rgba(255,255,255,0.8)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.05)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:shadow-[0_16px_32px_-4px_rgba(16,185,129,0.25)] hover:border-emerald-500/40 ${bannerInteractiveScaleClass} my-4 sm:my-6 ${className}`
    : `group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-500/15 dark:border-emerald-500/10 bg-gradient-to-r from-emerald-500/[0.03] via-slate-50 to-emerald-500/[0.04] dark:from-slate-900/90 dark:via-slate-900/80 dark:to-slate-900/90 shadow-sm transition-[transform,box-shadow,border-color] duration-300 ease-out hover:shadow-md hover:border-emerald-500/30 ${bannerInteractiveScaleClass} my-3 sm:my-6 ${className}`;

  return (
    <div ref={containerRef}>
      <AnimatePresence>
        <motion.aside
          tabIndex={isBannerAd ? 0 : undefined}
          data-testid={`ad-placement-${placementId}`}
          data-mobile-mode={isMobile ? 'true' : 'false'}
          data-effective-format={effectiveFormat}
          data-template-slot={templateSlot}
          data-claymorphic={isClayMode ? 'true' : 'false'}
          data-conversion-context={activeConversionContext}
          data-ab-experiment={abTestEnabled ? activeExperimentId : undefined}
          data-ab-variant={abTestEnabled ? abVariantId : undefined}
          data-ab-style={effectiveStyle}
          data-dwell-ms={dwellTimeMs}
          data-third-party-script-status={thirdPartyScriptStatus}
          data-matched-interest={matchedInterest || undefined}
          data-ad-id={selectedAd.id}
          data-ad-category={selectedAd.category}
          data-banner-hover-scale={isBannerAd ? '1.02' : undefined}
          onClick={handleAdInteractionClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          whileHover={isBannerAd ? { scale: 1.02 } : undefined}
          whileFocus={isBannerAd ? { scale: 1.02 } : undefined}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={containerStyle}
          aria-label="Conteúdo Patrocinado"
        >
          {/* Top Compliance Header & User Controls */}
          <div className="flex flex-wrap items-center justify-between px-3 sm:px-6 pt-2.5 sm:pt-3.5 pb-2 text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/60 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                isClayMode 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3),_inset_0_1px_1px_rgba(255,255,255,0.4)]'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}>
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Patrocinado
              </span>
              <span className="text-slate-300 dark:text-slate-600 text-xs">•</span>
              <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[120px] sm:max-w-none">{selectedAd.brand}</span>
              {matchedInterest && (
                <span
                  data-testid="ad-interest-match-badge"
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[9px] font-semibold"
                >
                  {matchedInterest}
                </span>
              )}
            </div>

            {/* PREFERENCE SELECTOR: Vídeo vs Banner */}
            <div
              role="tablist"
              data-ad-control="true"
              onClick={(e) => e.stopPropagation()}
              aria-label="Seletor de Preferências de Formato (Vídeo ou Banner)"
              className="inline-flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700/60 shadow-inner"
            >
              <button
                type="button"
                role="tab"
                aria-selected={isVideoMode}
                data-testid="ad-mode-video-btn"
                onClick={() => {
                  handleSelectFormatPreference('video');
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isVideoMode
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Definir Vídeo como formato padrão"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Vídeo</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isVideoMode}
                data-testid="ad-mode-photo-btn"
                onClick={() => {
                  handleSelectFormatPreference('banner');
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  !isVideoMode
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Definir Banner como formato padrão"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Banner</span>
              </button>
            </div>

            <div
              data-ad-control="true"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 sm:gap-2"
            >
              <button
                type="button"
                data-testid="ad-settings-toggle-btn"
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`p-1.5 rounded-full transition cursor-pointer flex items-center gap-1 ${
                  settingsOpen
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
                title="Configurar preferências e silenciar categorias de anúncios"
                aria-label="Configurar preferências de anúncios"
              >
                <Settings className="w-3.5 h-3.5" />
                {mutedCategories.length > 0 && (
                  <span
                    data-testid="ad-header-muted-indicator"
                    className="w-1.5 h-1.5 rounded-full bg-amber-500"
                    title={`${mutedCategories.length} categoria(s) silenciada(s)`}
                  />
                )}
              </button>
              <button
                type="button"
                data-testid="ad-quick-mute-category-btn"
                onClick={() => setSettingsOpen(true)}
                className="p-1.5 rounded-full text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                title={`Silenciar categoria: ${getCategoryLabel(selectedAd.category)}`}
                aria-label={`Silenciar categoria: ${getCategoryLabel(selectedAd.category)}`}
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setInfoOpen(!infoOpen)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Informações sobre esta publicidade"
                aria-label="Informações sobre anúncios"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer flex items-center gap-1 text-[10px]"
                title="Dispensar anúncio por 24 horas"
                aria-label="Dispensar anúncio"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dispensar</span>
              </button>
            </div>
          </div>

          {/* Settings Panel: Choose Default Format Preference */}
          {settingsOpen && (
            <motion.div
              data-ad-control="true"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 space-y-3"
              data-testid="ad-settings-panel"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    Formato Padrão de Anúncios (Vídeo ou Banner)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Escolha o formato que prefere ver por padrão nos anúncios do NutriAI (<strong>Vídeo</strong> ou <strong>Banner</strong>). Sua escolha é salva no <code>localStorage</code> e aplicada automaticamente ao carregar o aplicativo:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Option 1: Vídeo */}
                <button
                  type="button"
                  data-testid="pref-format-video-btn"
                  style={{ backgroundColor: '#232428' }}
                  onClick={() => handleSelectFormatPreference('video')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    isVideoMode
                      ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isVideoMode
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    <Video className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        Vídeo (IA Comercial)
                      </span>
                      {isVideoMode && (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Padrão Ativo
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Vídeo dinâmico de 15 segundos com áudio e movimento
                    </span>
                  </div>
                </button>

                {/* Option 2: Banner */}
                <button
                  type="button"
                  data-testid="pref-format-banner-btn"
                  style={{ backgroundColor: '#26282a' }}
                  onClick={() => handleSelectFormatPreference('banner')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    !isVideoMode
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-sm ring-1 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    !isVideoMode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        Banner (Foto de Produto)
                      </span>
                      {!isVideoMode && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Padrão Ativo
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Imagem estática nítida em alta definição do produto
                    </span>
                  </div>
                </button>
              </div>

              {/* Category Muting Section: Health Goals Alignment */}
              <div
                data-testid="ad-category-mute-panel"
                className="pt-2.5 mt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      Silenciar Categorias de Anúncios (Metas de Saúde)
                    </span>
                  </div>
                  {mutedCategories.length > 0 && (
                    <span 
                      data-testid="ad-muted-count-badge"
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    >
                      {mutedCategories.length} {mutedCategories.length === 1 ? 'categoria silenciada' : 'categorias silenciadas'}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Silencie categorias de anúncios que você considerar contrárias às suas metas atuais ({profile?.goals || 'nutrição e bem-estar'}), como <strong>Fast Food</strong> ou <strong>Suplementos</strong>. Os anúncios selecionados serão ocultados do seu app:
                </p>

                {/* Quick Mute Action for the Currently Displayed Ad */}
                {selectedAd && (
                  <div 
                    data-testid="ad-current-category-box"
                    className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="text-[11px] min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 block">Categoria do anúncio em exibição:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                        <span className="text-base">{getCategoryEmoji(selectedAd.category)}</span>
                        <span>{getCategoryLabel(selectedAd.category)}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({selectedAd.brand})</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      data-testid="mute-current-category-btn"
                      onClick={() => toggleMuteCategory(selectedAd.category)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 shrink-0 ${
                        isCategoryMuted(selectedAd.category)
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      {isCategoryMuted(selectedAd.category) ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Reativar Categoria</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Silenciar Esta Categoria</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Category Toggles Grid */}
                <div 
                  data-testid="ad-mute-categories-grid"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1"
                >
                  {knownCategories.map((cat) => {
                    const isMuted = isCategoryMuted(cat.key);
                    return (
                      <div
                        key={cat.key}
                        className={`p-2.5 rounded-2xl border transition-all flex items-start justify-between gap-2 ${
                          isMuted
                            ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                            : 'bg-white/90 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{cat.emoji}</span>
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {cat.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                            {cat.healthContext}
                          </p>
                        </div>
                        <button
                          type="button"
                          data-testid={`mute-category-${cat.key}`}
                          onClick={() => toggleMuteCategory(cat.key)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                            isMuted
                              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {isMuted ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Silenciado</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span>Ativo</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* A/B Testing Diagnostics & Live Performance Comparison */}
              {abTestEnabled && (
                <div
                  data-testid="ad-ab-test-panel"
                  className="pt-2.5 mt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <FlaskConical className="w-3.5 h-3.5 text-indigo-500" />
                      Teste A/B ({activeExperimentId})
                    </span>
                    <div className="inline-flex items-center gap-1">
                      {(['A', 'B'] as ABVariantId[]).map((vId) => (
                        <button
                          key={vId}
                          type="button"
                          data-testid={`ab-variant-switch-${vId}`}
                          onClick={() => selectABVariant(vId)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            abVariantId === vId
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-700'
                          }`}
                        >
                          Variante {vId} ({abVariantsConfig[vId].style === 'claymorphic' ? 'Claymorphic' : 'Clássico'})
                        </button>
                      ))}
                    </div>
                  </div>

                  {abEvaluation && (
                    <div
                      data-testid="ad-ab-metrics-summary"
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]"
                    >
                      {(['A', 'B'] as ABVariantId[]).map((vId) => {
                        const stats = abEvaluation.variantStats[vId];
                        const isWinner = abEvaluation.bestPerformingVariant === vId;
                        return (
                          <div
                            key={vId}
                            className={`p-2 rounded-xl border ${
                              isWinner
                                ? 'border-amber-500/40 bg-amber-500/10 text-slate-800 dark:text-slate-100'
                                : 'border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>Variante {vId}</span>
                              {isWinner && (
                                <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                  <Trophy className="w-3 h-3" /> Melhor Desempenho
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px] opacity-90">
                              <span>Cliques: {stats.clicks} ({stats.ctr}% CTR)</span>
                              <span>Visib.: {Math.round(stats.avgVisibility * 100)}% ({stats.impressions} imp.)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <Check className="w-3 h-3 text-emerald-500" />
                  Salvo no localStorage: <strong>{isVideoMode ? 'Vídeo' : 'Banner'}</strong>
                  {mutedCategories.length > 0 && ` • ${mutedCategories.length} cat. silenciada(s)`}
                </span>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          )}

          {/* Informative Popover */}
          {infoOpen && (
            <motion.div
              data-ad-control="true"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 sm:px-6 py-2 bg-slate-100/80 dark:bg-slate-800/80 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 border-b border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                O <strong>NutriAI</strong> exibe anúncios não-intrusivos de marcas parceiras selecionadas em saúde e alimentação. 
                {isAdBlockActive && " (Bloqueador de anúncios detectado: exibindo anúncio selecionado de parceiro sustentável)."}
              </p>
            </motion.div>
          )}

          {/* Custom Dynamic HTML Template Slot or Native Layout Rendering */}
          {renderTemplate ? (
            <div className="p-3 sm:p-5">
              {renderTemplate(selectedAd, { 
                onDismiss: handleDismiss, 
                isMuted, 
                toggleMute, 
                infoOpen, 
                setInfoOpen,
                isVideoMode,
                setIsVideoMode,
                settingsOpen,
                setSettingsOpen,
                preferredFormat: prefFormat,
                onSelectPreference: handleSelectFormatPreference,
                mutedCategories,
                toggleMuteCategory,
                isCategoryMuted
              })}
            </div>
          ) : templateSlot === 'badge' ? (
            /* Claymorphic Pill / Badge Template Slot */
            <div className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(16,185,129,0.3),_inset_0_1px_1px_rgba(255,255,255,0.4)] shrink-0">
                  {selectedAd.category === 'organic' && <Leaf className="w-5 h-5" />}
                  {selectedAd.category === 'fitness' && <Dumbbell className="w-5 h-5" />}
                  {selectedAd.category === 'nutrition' && <Apple className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {selectedAd.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {selectedAd.description}
                  </p>
                </div>
              </div>
              <a
                href={selectedAd.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-[0_4px_12px_rgba(16,185,129,0.3)] active:scale-95 transition cursor-pointer shrink-0 flex items-center gap-1"
              >
                <span>{selectedAd.ctaText}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : templateSlot === 'minimal' ? (
            /* Minimalist Inline Template Slot */
            <div className="p-3 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                <strong className="text-emerald-600 dark:text-emerald-400">{selectedAd.brand}:</strong> {selectedAd.title}
              </span>
              <a
                href={selectedAd.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline shrink-0 flex items-center gap-1"
              >
                <span>Conhecer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            /* Default or Claymorphic Rich Native Banner Slot */
            <div className={`p-3 sm:p-6 flex ${isCompactMobile ? 'flex-row items-center gap-3' : 'flex-col md:flex-row md:items-center justify-between gap-5'}`}>
              {/* Visual Asset (Video, Image, or Claymorphic Vector Artwork) */}
              <div className={`relative overflow-hidden shrink-0 bg-slate-900 ${
                isClayMode 
                  ? 'border-2 border-white/80 dark:border-slate-800 shadow-[0_8px_16px_rgba(0,0,0,0.15),_inset_0_2px_4px_rgba(0,0,0,0.3)]' 
                  : 'border border-slate-200/60 dark:border-slate-800'
              } ${
                isCompactMobile 
                  ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl' 
                  : 'w-full md:w-56 h-36 md:h-32 rounded-2xl sm:rounded-3xl'
              }`}>
                {/* STRICT MUTUAL EXCLUSION with Framer Motion AnimatePresence Fade */}
                <AnimatePresence>
                  {isVideoMode ? (
                    <motion.div
                      key="ad-exclusive-video"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 w-full h-full bg-black"
                    >
                      <video
                        ref={videoRef}
                        src={selectedAd.videoUrl}
                        autoPlay
                        muted={isMuted}
                        loop
                        playsInline
                        preload="none"
                        onError={handleVideoError}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        data-ad-control="true"
                        onClick={toggleMute}
                        className="absolute bottom-1.5 right-1.5 p-1 rounded-xl bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition cursor-pointer z-10"
                        title={isMuted ? "Ativar som" : "Silenciar"}
                      >
                        {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="ad-exclusive-photo"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 w-full h-full bg-slate-900"
                    >
                      {!imageError ? (
                        <img
                          src={currentImageSrc}
                          alt={selectedAd.title}
                          loading="lazy"
                          onError={handleImageError}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-800 flex flex-col items-center justify-center p-2 text-white text-center">
                          {selectedAd.category === 'organic' && <Leaf className="w-5 h-5 sm:w-8 sm:h-8 text-emerald-200 mb-0.5" />}
                          {selectedAd.category === 'fitness' && <Dumbbell className="w-5 h-5 sm:w-8 sm:h-8 text-emerald-200 mb-0.5" />}
                          {selectedAd.category === 'nutrition' && <Apple className="w-5 h-5 sm:w-8 sm:h-8 text-emerald-200 mb-0.5" />}
                          {!isCompactMobile && (
                            <>
                              <span className="font-serif font-bold text-xs tracking-wide">{selectedAd.brand}</span>
                              <span className="text-[10px] text-emerald-100 opacity-90">{selectedAd.badge}</span>
                            </>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isCompactMobile && (
                  <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white tracking-wider uppercase flex items-center gap-1.5 border border-white/10">
                    {isVideoMode ? (
                      <>
                        <Video className="w-3 h-3 text-indigo-400" />
                        <span>Vídeo IA • {selectedAd.badge}</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3 h-3 text-emerald-400" />
                        <span>{selectedAd.badge}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Copy & Details */}
              <div className="flex-1 space-y-1 min-w-0">
                <h4 className={`font-serif font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors ${
                  isCompactMobile ? 'text-xs sm:text-sm line-clamp-1' : 'text-base sm:text-lg'
                }`}>
                  {selectedAd.title}
                </h4>
                <p className={`text-slate-600 dark:text-slate-300 font-normal leading-relaxed ${
                  isCompactMobile ? 'text-[11px] sm:text-xs line-clamp-1' : 'text-xs sm:text-sm line-clamp-2'
                }`}>
                  {selectedAd.description}
                </p>
                <div className="flex items-center gap-1.5 pt-0.5 text-[10px] sm:text-[11px] text-slate-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">Verificado pela moderação NutriAI</span>
                </div>
              </div>

              {/* Claymorphic 3D CTA Action Button */}
              <div className={`shrink-0 flex ${isCompactMobile ? 'items-center' : 'sm:flex-col items-center sm:items-end justify-between gap-3 pt-2 sm:pt-0'}`}>
                <a
                  href={selectedAd.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    try {
                      const event = new CustomEvent('nutri-award-points', { detail: { amount: 10, reason: 'Explorou anúncio de parceiro' } });
                      window.dispatchEvent(event);
                    } catch (e) {}
                  }}
                  className={`inline-flex items-center gap-1.5 font-bold transition-all cursor-pointer text-white active:translate-y-0.5 ${
                    isClayMode
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-[0_6px_16px_rgba(16,185,129,0.35),_inset_0_1.5px_2px_rgba(255,255,255,0.4)]'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95'
                  } ${
                    isCompactMobile 
                      ? 'px-3 py-1.5 rounded-xl text-[11px] sm:text-xs' 
                      : 'px-5 py-2.5 rounded-2xl text-xs sm:text-sm'
                  }`}
                >
                  <span>{selectedAd.ctaText}</span>
                  <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                </a>
              </div>
            </div>
          )}
        </motion.aside>
      </AnimatePresence>
    </div>
  );
};
