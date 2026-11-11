import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { useProfileSync } from '../lib/profileSync';
import { useAdPreference } from '../hooks/useAdPreference';
import { db, doc, setDoc, increment, serverTimestamp } from '../lib/firebase';
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
  Check
} from 'lucide-react';

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
  category: 'nutrition' | 'fitness' | 'organic';
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
}

const SPONSORED_FALLBACK_ADS: SponsoredAdData[] = [
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
    category: 'organic'
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
    category: 'fitness'
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
    category: 'nutrition'
  }
];

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
  profile
}) => {
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

  // Effective format & claymorphic mode evaluation
  const effectiveFormat = (isMobile && format === 'banner') ? 'native' : format;
  const isCompactMobile = isMobile || effectiveFormat === 'native' || templateSlot === 'badge' || templateSlot === 'minimal';
  const isClayMode = claymorphic || templateSlot === 'claymorphic';
  
  // Asset Fallback States
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageRetryCount, setImageRetryCount] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const adSenseRef = useRef<HTMLModElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Pick sponsored ad based on placementId hash for stable rotation, with optional custom overrides
  const selectedAd = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < placementId.length; i++) {
      hash = (hash << 5) - hash + placementId.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % SPONSORED_FALLBACK_ADS.length;
    const baseAd = SPONSORED_FALLBACK_ADS[index];
    return customAdData ? { ...baseAd, ...customAdData } : baseAd;
  }, [placementId, customAdData]);

  // Persistent Format Preference ('video' | 'banner') handled by useAdPreference
  const { format: prefFormat, updateFormat, initialized: prefInitialized, isVideoMode: prefIsVideoMode } = useAdPreference(profile);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Explicit Mutual Exclusion State: exactly one visual mode at a time (Video OR Product Photo)
  const [isVideoMode, setIsVideoMode] = useState<boolean>(false);
  
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
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [preloadStatus, setPreloadStatus] = useState<'idle' | 'preloading' | 'ready' | 'error'>('idle');

  // Ad Load Telemetry
  useEffect(() => {
    if (!isNearViewport) return;

    const telemetryDocRef = doc(db, 'adTelemetry', 'global');
    const field = isVideoMode ? 'videoLoads' : 'bannerLoads';
    
    // Increment telemetry
    setDoc(telemetryDocRef, {
      [field]: increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true }).catch(err => console.error('Failed to log ad telemetry', err));
  }, [isNearViewport, isVideoMode]);

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
    if (isDismissed || isNearViewport) return;

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
  }, [isDismissed, isNearViewport]);

  // Conditional Asset & SDK Preloading: Executed ONLY when element enters pre-viewport threshold (isNearViewport === true)
  useEffect(() => {
    if (!isNearViewport || isDismissed) return;

    let isMounted = true;
    setPreloadStatus('preloading');

    const preloadAssets = async () => {
      try {
        const loadImg = (url: string) =>
          new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = url;
          });
        
        const loadVideo = (url: string) =>
          new Promise<void>((resolve) => {
            const video = document.createElement('video');
            video.onloadedmetadata = () => resolve();
            video.onerror = () => resolve(); // Don't block preloading if video fails
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

    // 2. Initialize Google AdSense / AdMob SDK conditionally on viewport approach
    if (forceFallback) {
      setUseFallback(true);
      return;
    }

    const initAdSense = () => {
      try {
        const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
          script.async = true;
          script.crossOrigin = 'anonymous';
          script.onerror = () => {
            if (isMounted) {
              setIsAdBlockActive(true);
              setUseFallback(true);
            }
          };
          document.head.appendChild(script);
        }

        if (typeof window !== 'undefined' && adSenseRef.current) {
          const adsbygoogle = (window as any).adsbygoogle || [];
          adsbygoogle.push({});
        }
      } catch (err) {
        if (isMounted) {
          setUseFallback(true);
        }
      }
    };

    const timer = setTimeout(() => {
      if (isMounted) {
        const isFilled = adSenseRef.current && adSenseRef.current.innerHTML.trim().length > 0;
        if (!isFilled) {
          setUseFallback(true);
        }
      }
    }, 1500);

    initAdSense();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isNearViewport, isDismissed, selectedAd, forceFallback, adClient]);

  const handleDismiss = () => {
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

  if (isDismissed) return null;

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

  // Render Google AdSense Script slot if active and not in fallback
  if (!useFallback) {
    return (
      <div 
        ref={containerRef}
        data-testid={`adsense-slot-${placementId}`}
        data-mobile-mode={isMobile ? 'true' : 'false'}
        className={`relative w-full overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-2 my-3 ${className}`}
      >
        <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-slate-400 uppercase px-2 mb-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Publicidade
          </span>
          <button
            onClick={handleDismiss}
            className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Ocultar anúncio"
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

  // Claymorphic visual container class generator
  const containerStyle = isClayMode
    ? `group relative overflow-hidden rounded-3xl border-2 border-emerald-500/25 dark:border-emerald-500/15 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/80 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-teal-950/40 shadow-[0_12px_28px_-6px_rgba(16,185,129,0.18),_inset_0_2px_4px_rgba(255,255,255,0.8)] dark:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all duration-300 hover:shadow-[0_16px_32px_-4px_rgba(16,185,129,0.25)] hover:border-emerald-500/40 my-4 sm:my-6 ${className}`
    : `group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-500/15 dark:border-emerald-500/10 bg-gradient-to-r from-emerald-500/[0.03] via-slate-50 to-emerald-500/[0.04] dark:from-slate-900/90 dark:via-slate-900/80 dark:to-slate-900/90 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-500/30 my-3 sm:my-6 ${className}`;

  return (
    <div ref={containerRef}>
      <AnimatePresence>
        <motion.aside
          data-testid={`ad-placement-${placementId}`}
          data-mobile-mode={isMobile ? 'true' : 'false'}
          data-effective-format={effectiveFormat}
          data-template-slot={templateSlot}
          data-claymorphic={isClayMode ? 'true' : 'false'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
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
            </div>

            {/* PREFERENCE SELECTOR: Vídeo vs Banner */}
            <div
              role="tablist"
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

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                data-testid="ad-settings-toggle-btn"
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  settingsOpen
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
                title="Seletor de Preferências: Vídeo ou Banner"
                aria-label="Configurar preferências de anúncios"
              >
                <Settings className="w-3.5 h-3.5" />
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

              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <Check className="w-3 h-3 text-emerald-500" />
                  Salvo no localStorage: <strong>{isVideoMode ? 'Vídeo' : 'Banner'}</strong>
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
                onSelectPreference: handleSelectFormatPreference
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
                  onClick={(e) => {
                    e.stopPropagation();
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
