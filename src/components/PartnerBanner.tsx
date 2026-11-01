import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Store, Utensils, Sparkles, Music, Megaphone, Zap, X, Gift, Video, ArrowRight, Info, Clock, Maximize2, Heart } from "lucide-react";
import { useTranslation } from "../contexts/LanguageContext";
import { playSfx, vibrate } from "../lib/sensory";
import { speak } from "../lib/speech";

const PARTNERS = [
  "Sacolão do Bairro - Frescor do Dia 🥬",
  "Horta Urbana Premium - Orgânicos Locais 🍅",
  "Mercado da Terra - Tradição e Sabor 🌽",
  "Empório Orgânico - Direto do Produtor 🥦",
  "Fresh Garden Nutri - Seleção da IA 🍎",
  "Sacolão Vila Verde - Nutrição e Saúde 🥑",
  "Hortifruti Prime - Qualidade Certificada 🍓",
];

const PARTNER_ACTIONS = [
  "Segure o alimento fresco em frente à câmera, mostre a textura natural e convide a saborear.",
  "Mostre a folhagem verde e crocante colhida do dia, destacando o cultivo sem agrotóxicos.",
  "Apresente a cesta rústica de legumes, sorria e fale sobre o frescor do campo.",
  "Destaque o selo de certificação orgânica e mostre a embalagem sustentável do produto.",
  "Sirva um suco ou prato colorido com as frutas e ressalte a praticidade e energia.",
  "Corte o abacate revelando a qualidade impecável e o ponto de maturação ideal.",
  "Aproxime o morango suculento da lente, demonstrando o frescor irresistível."
];

const PARTNER_PRODUCT_INFO = [
  "Frutas e verduras 100% frescas com colheita matinal",
  "Hortaliças orgânicas certificadas, sem agrotóxicos",
  "Alimentos direto do produtor rural selecionados",
  "Superalimentos puros, nutrição viva e integral",
  "Seleção inteligente aprovada pela IA NutriAI",
  "Gorduras boas, saciedade prolongada e energia",
  "Morangos premium selecionados ricos em vitamina C"
];

const PARTNER_LIKES = [342, 518, 276, 429, 615, 388, 492];

const FRUIT_BG_IMAGES = [
  "https://images.unsplash.com/photo-1518635017498-87f514b751ba?auto=format&fit=crop&q=80&w=1200", // Strawberries
  "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=1200", // Citrus / Oranges
  "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&q=80&w=1200", // Green Apples
  "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=1200", // Avocados
  "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=1200"  // Watermelons
];

export function PartnerBanner() {
  const { t } = useTranslation();
  const [promos, setPromos] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("nutri-partner-promos");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [activeNotification, setActiveNotification] = useState<any | null>(null);

  // Dynamic slides constructor: custom promos first!
  const getActiveSlides = () => {
    const promoSlides = promos.map((p: any, i: number) => ({
      id: p.id,
      title: p.title || "Oferta Especial",
      subtitle: p.subtitle || "Aproveite esta promoção relâmpago",
      price: p.price || "Oferta",
      image: p.image || FRUIT_BG_IMAGES[0],
      videoUrl: p.videoUrl,
      type: p.type || "promo",
      videoAction: p.videoAction || "Apresente o produto para a câmera sorrindo e mostre seus detalhes principais.",
      productInfo: p.productInfo || p.subtitle || "Produto selecionado de alto valor nutricional.",
      defaultLikes: p.likes || (280 + ((i * 47) % 320))
    }));

    const staticSlides = PARTNERS.map((name, i) => ({
      id: `partner-${i}`,
      title: name,
      subtitle: "Desconto NutriAI Ativo",
      price: "15% OFF",
      image: FRUIT_BG_IMAGES[i % FRUIT_BG_IMAGES.length],
      videoUrl: undefined,
      type: "partner",
      videoAction: PARTNER_ACTIONS[i % PARTNER_ACTIONS.length],
      productInfo: PARTNER_PRODUCT_INFO[i % PARTNER_PRODUCT_INFO.length],
      defaultLikes: PARTNER_LIKES[i % PARTNER_LIKES.length]
    }));

    return [...promoSlides, ...staticSlides];
  };

  const slides = getActiveSlides();

  const DEMO_DURATION_MS = 6000;
  const [index, setIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(DEMO_DURATION_MS);
  const [mediaMode, setMediaMode] = useState<"auto" | "video" | "photo">("auto");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.08);
  const [soundType, setSoundType] = useState<"cooking" | "meditative">("cooking");
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitor scroll position to hide banner on scroll down and restore when returning to top
  useEffect(() => {
    const checkScroll = () => {
      const scrollElem = document.querySelector('.overflow-y-auto');
      const scrollTop = window.scrollY || (scrollElem ? scrollElem.scrollTop : 0);
      setIsScrolled(scrollTop > 15);
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    const scrollElem = document.querySelector('.overflow-y-auto');
    if (scrollElem) {
      scrollElem.addEventListener('scroll', checkScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', checkScroll);
      if (scrollElem) {
        scrollElem.removeEventListener('scroll', checkScroll);
      }
    };
  }, []);

  const [likesData, setLikesData] = useState<Record<string, { count: number; userLiked: boolean }>>(() => {
    try {
      const stored = localStorage.getItem("nutri-banner-likes");
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  const handleToggleLike = (slideId: string, defaultLikes: number = 250, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playSfx('tap');
    vibrate(20);

    setLikesData((prev) => {
      const current = prev[slideId] || { count: defaultLikes, userLiked: false };
      const nextUserLiked = !current.userLiked;
      const nextCount = nextUserLiked ? current.count + 1 : Math.max(0, current.count - 1);
      const updated = {
        ...prev,
        [slideId]: { count: nextCount, userLiked: nextUserLiked }
      };
      try {
        localStorage.setItem("nutri-banner-likes", JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterVolumeRef = useRef<GainNode | null>(null);
  const synthNodesRef = useRef<any[]>([]);
  const intervalRef = useRef<any>(null);

  // HTML5 Audio for the warm acoustic cooking loop
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);

  // Handle volume changes
  useEffect(() => {
    // Sync web audio volume
    if (masterVolumeRef.current && audioCtxRef.current) {
      masterVolumeRef.current.gain.setTargetAtTime(
        volume,
        audioCtxRef.current.currentTime,
        0.1,
      );
    }
    // Sync HTML5 audio volume
    if (htmlAudioRef.current) {
      htmlAudioRef.current.volume = Math.min(volume * 4.0, 1.0);
    }
  }, [volume]);

  // ESC key listener for fullscreen modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreenModalOpen(false);
      }
    };
    if (isFullscreenModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreenModalOpen]);

  // Handle partner rotation and countdown
  useEffect(() => {
    setTimeLeftMs(DEMO_DURATION_MS);
    const stepMs = 50;

    const timer = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= stepMs) {
          setIndex((curr) => {
            const len = slides.length || 1;
            return (curr + 1) % len;
          });
          return DEMO_DURATION_MS;
        }
        return prev - stepMs;
      });
    }, stepMs);

    return () => {
      clearInterval(timer);
      stopAmbientSynth();
      stopHTMLAudio();
    };
  }, [slides.length]);

  // Listen to new live promotions
  useEffect(() => {
    const handleNewPromo = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newPromo = customEvent.detail;
      if (!newPromo) return;

      // Append new promo to state so it renders instantly
      setPromos(prev => {
        const exists = prev.some(p => p.id === newPromo.id);
        if (exists) return prev;
        return [newPromo, ...prev];
      });

      // Show floating interactive card
      setActiveNotification(newPromo);

      // Instantly switch index to 0 to display the fresh offer
      setIndex(0);

      // Play joyful success chime
      try {
        playSfx("success");
        vibrate(25);
      } catch (err) {}

      // Play elegant Malu (Aoede) voice announcement of the deal
      try {
        const cleanTitle = (newPromo.title || "").replace(/⚡/g, "").trim();
        const msg = `Atenção! Nova promoção lançada: ${cleanTitle}. ${newPromo.price}! Aproveite agora!`;
        speak(msg);
      } catch (err) {}
    };

    window.addEventListener("nutri-promo-added", handleNewPromo);
    return () => {
      window.removeEventListener("nutri-promo-added", handleNewPromo);
    };
  }, []);

  // Background fruits rotation interval
  useEffect(() => {
    const bgTimer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % FRUIT_BG_IMAGES.length);
    }, 5000);
    return () => clearInterval(bgTimer);
  }, []);

  // Sync sound playback when type or mute states change
  useEffect(() => {
    if (isMuted) {
      stopAmbientSynth();
      stopHTMLAudio();
    } else {
      if (soundType === "cooking") {
        stopAmbientSynth();
        startHTMLAudio();
      } else {
        stopHTMLAudio();
        startAmbientSynth();
      }
    }
  }, [isMuted, soundType]);

  const startHTMLAudio = () => {
    try {
      if (!htmlAudioRef.current) {
        // High quality acoustic guitar study & joyful healthy cooking background loop
        const audio = new Audio("https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3");
        audio.loop = true;
        htmlAudioRef.current = audio;
      }
      
      htmlAudioRef.current.volume = Math.min(volume * 4.0, 1.0);
      htmlAudioRef.current.play().catch((e) => {
        console.warn("Could not play HTML5 audio loop:", e);
      });
    } catch (e) {
      console.warn("HTML5 audio initialization failed:", e);
    }
  };

  const stopHTMLAudio = () => {
    if (htmlAudioRef.current) {
      try {
        htmlAudioRef.current.pause();
      } catch (e) {}
    }
  };

  const startAmbientSynth = () => {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      // Always stop existing before starting
      stopAmbientSynth();

      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      // Auto-resume if context starts suspended
      if (ctx.state === "suspended") {
        ctx.resume().catch((e) => console.log("Context resume failed:", e));
      }

      // Create a master volume node
      const masterVolume = ctx.createGain();
      masterVolume.gain.setValueAtTime(volume, ctx.currentTime);
      masterVolume.connect(ctx.destination);
      masterVolumeRef.current = masterVolume;

      // Premium warm dual-sine drone/pad in F Major / D Minor (Health & Serenity Frequencies: 174Hz & 432Hz harmonic roots)
      const droneOsc1 = ctx.createOscillator();
      const droneOsc2 = ctx.createOscillator();
      const droneGain = ctx.createGain();

      droneOsc1.type = "sine";
      droneOsc2.type = "sine";

      droneOsc1.frequency.setValueAtTime(87.31, ctx.currentTime); // F2 (Warm organic ground)
      droneOsc2.frequency.setValueAtTime(130.81, ctx.currentTime); // C3 (Perfect fifth harmonic)

      droneGain.gain.setValueAtTime(0.18, ctx.currentTime);

      droneOsc1.connect(droneGain);
      droneOsc2.connect(droneGain);
      droneGain.connect(masterVolume);

      droneOsc1.start();
      droneOsc2.start();

      synthNodesRef.current.push(droneOsc1, droneOsc2, droneGain);

      // Organic Nature & Wellness Harmony Scale (F Major Pentatonic + Solfeggio 432Hz feel: F3, A3, C4, D4, F4, G4, A4, C5)
      const scale = [174.61, 220.00, 261.63, 293.66, 349.23, 392.00, 440.00, 523.25, 659.25];

      const playBell = () => {
        if (!audioCtxRef.current) return;
        const currentCtx = audioCtxRef.current;
        
        if (currentCtx.state === "suspended") {
          currentCtx.resume().catch(() => {});
        }
        
        const now = currentCtx.currentTime;
        const freq = scale[Math.floor(Math.random() * scale.length)];

        // Primary harmonic bell
        const osc = currentCtx.createOscillator();
        const gain = currentCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        // Soft shimmer overtone for organic crystal resonance
        const overtoneOsc = currentCtx.createOscillator();
        const overtoneGain = currentCtx.createGain();
        overtoneOsc.type = "sine";
        overtoneOsc.frequency.setValueAtTime(freq * 2.01, now);

        // Envelope: 120ms soft attack, long soothing organic decay
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

        overtoneGain.gain.setValueAtTime(0, now);
        overtoneGain.gain.linearRampToValueAtTime(0.035, now + 0.08);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

        osc.connect(gain);
        gain.connect(masterVolume);

        overtoneOsc.connect(overtoneGain);
        overtoneGain.connect(masterVolume);

        osc.start(now);
        osc.stop(now + 4.3);

        overtoneOsc.start(now);
        overtoneOsc.stop(now + 3.0);
      };

      intervalRef.current = setInterval(playBell, 2800);
      playBell();
    } catch (e) {
      console.warn("Could not start ambient synthesizer:", e);
    }
  };

  const stopAmbientSynth = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (synthNodesRef.current) {
      synthNodesRef.current.forEach((node) => {
        try {
          node.stop();
        } catch (e) {}
        try {
          node.disconnect();
        } catch (e) {}
      });
      synthNodesRef.current = [];
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
      masterVolumeRef.current = null;
    }
  };

  const toggleMusic = () => {
    playSfx('tap');
    vibrate(15);
    setIsMuted((prev) => !prev);
  };

  const selectCookingTrack = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playSfx('tap');
    vibrate(15);
    setSoundType("cooking");
    setIsMuted(false);
  };

  const selectZenTrack = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playSfx('tap');
    vibrate(15);
    setSoundType("meditative");
    setIsMuted(false);
  };

  const currentSlide = slides[index];
  const currentBgImage = currentSlide?.image || FRUIT_BG_IMAGES[bgIndex];
  const isVideoActive = mediaMode === "video" || (mediaMode === "auto" && Boolean(currentSlide?.videoUrl));
  const activeVideoSrc = currentSlide?.videoUrl || "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

  const secondsLeft = Math.max(1, Math.ceil(timeLeftMs / 1000));
  const progressPercent = Math.min(100, Math.max(0, ((DEMO_DURATION_MS - timeLeftMs) / DEMO_DURATION_MS) * 100));

  const currentSlideId = currentSlide?.id || `slide-${index}`;
  const currentSlideDefaultLikes = currentSlide?.defaultLikes || 320;
  const slideLikesInfo = likesData[currentSlideId] || { count: currentSlideDefaultLikes, userLiked: false };
  const slideLikesCount = slideLikesInfo.count;
  const isSlideLiked = slideLikesInfo.userLiked;

  const handleLearnMore = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playSfx('tap');
    vibrate(15);
    setIsProductModalOpen(true);
    try {
      const productTitle = currentSlide?.title || "Produto em Destaque";
      const productInfo = currentSlide?.productInfo || "";
      speak(`Conheça mais sobre ${productTitle}. ${productInfo}`);
    } catch (err) {}
  };

  const handleToggleFullscreen = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playSfx('tap');
    vibrate(15);
    setIsFullscreenModalOpen(true);
  };

  return (
    <AnimatePresence>
      {!isScrolled && (
        <motion.div
          id="partner-banner"
          initial={{ opacity: 0, height: 0, scale: 0.98 }}
          animate={{ opacity: 1, height: 'auto', scale: 1 }}
          exit={{ opacity: 0, height: 0, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-slate-900 border-b border-slate-200 dark:border-slate-800/85 transition-all duration-500 overflow-hidden relative origin-center"
        >
          {/* Dynamic Floating Interactive Toast Notification Overlay */}
          <AnimatePresence>
            {activeNotification && (
              <motion.div
                initial={{ opacity: 0, y: -80, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] w-[calc(100%-32px)] max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-4 shadow-2xl flex items-center gap-4 cursor-pointer"
                onClick={() => {
                  setActiveNotification(null);
                  setIndex(0); // Scroll to the live offer
                }}
              >
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-slate-100 border border-slate-150">
                  <img src={activeNotification.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute top-1 right-1 bg-amber-500 text-white rounded-full p-1 animate-pulse">
                    <Zap className="w-3.5 h-3.5 fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Megaphone className="w-3 h-3 animate-bounce" /> {t('flash_deal_label', 'Oferta Relâmpago!')}
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{activeNotification.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{activeNotification.subtitle}</p>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeNotification.price}</p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveNotification(null);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full">
            {/* Banner Principal Unificado com Formato Panorâmico Responsivo com aspect-ratio consistente */}
            <div className="relative w-full aspect-[16/7] sm:aspect-[21/9] md:aspect-[24/8] overflow-hidden group transition-all duration-300">
              {/* Contêiner de Mídia */}
              <div className="absolute inset-0 w-full h-full aspect-[16/7] sm:aspect-[21/9] md:aspect-[24/8] overflow-hidden pointer-events-none z-0">
                {isVideoActive ? (
                  <video
                    key={activeVideoSrc}
                    src={activeVideoSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ objectFit: 'cover' }}
                    className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                  />
                ) : (
                  <AnimatePresence mode="sync">
                    <motion.img
                      key={currentBgImage}
                      src={currentBgImage}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 1.0, ease: "easeInOut" }}
                      style={{ objectFit: 'cover' }}
                      className="absolute inset-0 w-full h-full object-cover object-center filter saturate-125 contrast-105 brightness-95 dark:brightness-85 transition-transform duration-1000 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </AnimatePresence>
                )}
              </div>

              {/* Gradiente de sobreposição cinematográfico sutil */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-950/40 pointer-events-none z-0" />

              {/* Conteúdo sobreposto e integrado minimalista */}
              <div className="relative z-10 w-full h-full p-3 sm:p-5 md:p-6 flex flex-col justify-between max-w-7xl mx-auto">
                {/* Topo do Banner: Ícone de Coração em Destaque + Botões Secundários Transparentes */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Badge Sutil & Transparente na Parte Superior */}
                    <div className="flex items-center gap-1.5 bg-transparent text-white/80 px-2 py-0.5 text-[10px] sm:text-xs tracking-wider uppercase font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>{isVideoActive ? "Google Veo" : (currentSlide?.type === 'promo' ? t('flash_deal_top', 'OFERTA ATIVA ⚡') : t('fidelity_partner', 'Parceiros NutriAI'))}</span>
                    </div>

                    {/* Ícone de Coração Prominente em Destaque (Principal Interação do Banner) */}
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => handleToggleLike(currentSlideId, currentSlideDefaultLikes, e)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer shadow-md backdrop-blur-md ${
                        isSlideLiked
                          ? 'bg-rose-500/35 border border-rose-400/60 text-rose-100 shadow-rose-500/20 ring-2 ring-rose-500/30'
                          : 'bg-black/40 hover:bg-black/60 border border-white/25 text-white hover:border-rose-400/50 hover:text-rose-300'
                      }`}
                      title={isSlideLiked ? "Você salvou esta receita/produto! Clique para remover" : "Clique para salvar esta receita/produto"}
                    >
                      <Heart className={`w-4 h-4 transition-transform duration-300 ${isSlideLiked ? 'fill-rose-400 text-rose-400 scale-110 animate-pulse' : 'text-rose-400 hover:scale-110'}`} />
                      <span className="font-mono">{slideLikesCount}</span>
                      <span className="hidden sm:inline text-white/70 text-[10px] uppercase tracking-wider font-sans">salvaram</span>
                    </motion.button>

                    {/* Alternador Transparente de Foto / Vídeo */}
                    <div className="flex items-center bg-transparent gap-1 p-0.5">
                      <button
                        onClick={() => { playSfx('tap'); vibrate(15); setMediaMode("photo"); }}
                        className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium transition-all cursor-pointer ${
                          !isVideoActive ? "bg-white/20 text-white font-bold" : "text-white/60 hover:text-white hover:bg-white/10"
                        }`}
                        title="Visualizar foto"
                      >
                        Foto
                      </button>
                      <button
                        onClick={() => { playSfx('tap'); vibrate(15); setMediaMode("video"); }}
                        className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                          isVideoActive ? "bg-indigo-600/40 text-white font-bold border border-indigo-400/30" : "text-white/60 hover:text-white hover:bg-white/10"
                        }`}
                        title="Visualizar vídeo"
                      >
                        <Video className="w-2.5 h-2.5" />
                        <span>Vídeo</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Botão de Expansão (Fullscreen) Transparente Sutil */}
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={handleToggleFullscreen}
                      className="p-1 sm:p-1.5 rounded-full bg-transparent hover:bg-white/15 text-white/80 hover:text-white transition-all duration-300 cursor-pointer flex items-center justify-center"
                      title="Abrir em tela cheia"
                      id="partner-banner-fullscreen-btn"
                    >
                      <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/80 hover:text-white transition-colors" />
                    </motion.button>

                    {/* Controles de Áudio Transparentes e Sutis */}
                    <div className="flex items-center gap-1 bg-transparent p-0.5 rounded-full shrink-0 max-w-[200px] sm:max-w-none">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={selectCookingTrack}
                          className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] transition-all cursor-pointer text-white/80 ${
                            !isMuted && soundType === "cooking" 
                              ? "font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40" 
                              : "hover:bg-white/10 hover:text-white"
                          }`}
                          title="Música saudável & alegre (Acústico NutriAI)"
                        >
                          <Utensils className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-300" />
                          <span className="hidden xs:inline sm:inline">Ritmo</span>
                        </button>
                        <button
                          onClick={selectZenTrack}
                          className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] transition-all cursor-pointer text-white/80 ${
                            !isMuted && soundType === "meditative" 
                              ? "font-bold bg-teal-500/30 text-teal-200 border border-teal-400/40" 
                              : "hover:bg-white/10 hover:text-white"
                          }`}
                          title="Frequências de relaxamento e foco"
                        >
                          <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-teal-300" />
                          <span className="hidden xs:inline sm:inline">Zen</span>
                        </button>
                      </div>

                      {!isMuted && (
                        <input
                          type="range"
                          min="0.01"
                          max="0.25"
                          step="0.01"
                          value={volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          className="w-8 sm:w-12 h-1 bg-white/40 rounded-lg appearance-none cursor-pointer accent-emerald-400 transition-all opacity-80 hover:opacity-100"
                          title="Ajustar Volume"
                        />
                      )}

                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleMusic(); }}
                        className="p-1 sm:p-1.5 rounded-full transition-all duration-300 cursor-pointer bg-transparent text-white/80 hover:text-white hover:bg-white/15"
                        title={isMuted ? "Tocar trilha sonora do NutriAI" : "Pausar música"}
                        id="toggle-ambient-music-btn"
                      >
                        {isMuted ? (
                          <VolumeX className="w-3.5 h-3.5 text-white/70" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>

            {/* Botão de Chamada para Ação (CTA) Minimalista e Semitransparente sobreposto ao vídeo */}
            <div className="flex items-center justify-center my-auto py-1 pointer-events-none">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLearnMore}
                className="pointer-events-auto group px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full bg-slate-950/45 hover:bg-slate-950/70 text-white backdrop-blur-md border border-white/20 hover:border-emerald-400/50 shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 flex items-center gap-2 text-[11px] sm:text-xs md:text-sm font-semibold cursor-pointer"
                title="Aprender mais sobre o produto em destaque"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="tracking-wide">Conheça o Produto</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-300 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>

            {/* Rodapé Minimalista: Foco Exclusivo no Essencial do Produto e na Ação do Vídeo */}
            <div className="w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full bg-slate-950/75 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 sm:p-3.5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    {/* O que fazer no vídeo (Roteiro claro para o usuário saber o que fazer) */}
                    <div className="flex items-start sm:items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/25 text-indigo-300 border border-indigo-400/30 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                        <Video className="w-3 h-3 text-indigo-400" /> Ação no vídeo:
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-white drop-shadow-sm truncate">
                        {currentSlide?.videoAction || "Apresente o produto para a câmera sorrindo e mostre seus detalhes principais."}
                      </span>
                    </div>

                    {/* Essencial do produto (poucas informações essenciais do produto) */}
                    <div className="flex items-start sm:items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                        <Sparkles className="w-3 h-3 text-emerald-400" /> Essencial do produto:
                      </span>
                      <span className="text-xs text-slate-200 drop-shadow-sm truncate">
                        <strong className="text-white font-bold">{t(currentSlide?.title)}</strong>
                        {currentSlide?.productInfo && (
                          <span className="text-emerald-300 ml-1.5 font-medium">— {currentSlide.productInfo}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Preço / Oferta Minimalista */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span className="text-xs sm:text-sm font-bold text-white bg-emerald-600/90 border border-emerald-400/40 px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                      {t(currentSlide?.price || "Desconto NutriAI")}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Produto em Destaque */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-white space-y-5 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-white">
                      {currentSlide?.title}
                    </h3>
                    <p className="text-xs text-emerald-400 font-semibold">
                      Produto em Destaque no NutriAI
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Media Preview Thumbnail */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                {isVideoActive ? (
                  <video
                    src={activeVideoSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ objectFit: 'cover' }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={currentBgImage}
                    alt={currentSlide?.title}
                    style={{ objectFit: 'cover' }}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-2 left-2 flex items-center">
                  <button
                    onClick={(e) => handleToggleLike(currentSlideId, currentSlideDefaultLikes, e)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border backdrop-blur-md cursor-pointer shadow-md ${
                      isSlideLiked
                        ? 'bg-rose-500/30 border-rose-400/50 text-rose-200 shadow-rose-500/20'
                        : 'bg-slate-950/80 border-white/20 text-white hover:text-rose-300 hover:border-rose-400/40'
                    }`}
                    title={isSlideLiked ? "Você salvou esta receita! Clique para remover" : "Clique para salvar esta receita/produto"}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isSlideLiked ? 'fill-rose-400 text-rose-400' : 'text-rose-400'}`} />
                    <span className="font-mono">{slideLikesCount}</span>
                    <span className="text-[9px] uppercase font-sans text-white/70">salvaram</span>
                  </button>
                </div>
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white border border-white/10 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                  <span>{currentSlide?.price}</span>
                </div>
              </div>

              {/* Information Cards */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Essencial do Produto & Benefícios
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200">
                    {currentSlide?.productInfo || "Alimento 100% natural, colheita fresca selecionada e rico em nutrientes essenciais para sua saúde e longevidade."}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/40 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Dica de Roteiro para o Vídeo
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300">
                    {currentSlide?.videoAction || "Apresente o produto para a câmera sorrindo, destacando o frescor e os benefícios naturais."}
                  </p>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-2">
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  Entendi, Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Vídeo em Tela Cheia para Visualização Imersiva */}
      <AnimatePresence>
        {isFullscreenModalOpen && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-2 sm:p-6 md:p-8 bg-black/95 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden border border-white/15 bg-slate-950 shadow-2xl"
            >
              {/* Header do Fullscreen Modal */}
              <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-5 flex items-center justify-between bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                    <Video className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Visualização Imersiva • Google Veo</span>
                  </div>
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-white text-xs font-mono">
                    {secondsLeft}s restantes
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsFullscreenModalOpen(false)}
                    className="p-2 rounded-full bg-black/60 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg"
                    title="Fechar tela cheia (ESC)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Contêiner de Mídia Imersiva */}
              <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[24/8] min-h-[350px] max-h-[78vh] flex items-center justify-center bg-black overflow-hidden">
                {isVideoActive ? (
                  <video
                    src={activeVideoSrc}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    style={{ objectFit: 'cover' }}
                    className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                  />
                ) : (
                  <img
                    src={currentBgImage}
                    alt={currentSlide?.title}
                    style={{ objectFit: 'cover' }}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                )}

                {/* Gradiente cinematográfico */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-transparent to-slate-950/30 pointer-events-none" />

                {/* Informações Sobrepostas Imersivas */}
                <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Essencial do Produto:
                      </span>
                      <h3 className="text-base sm:text-xl font-bold text-white drop-shadow-md">
                        {currentSlide?.title}
                      </h3>
                    </div>
                    {currentSlide?.productInfo && (
                      <p className="text-xs sm:text-sm text-slate-200 drop-shadow-sm">
                        {currentSlide.productInfo}
                      </p>
                    )}
                    {currentSlide?.videoAction && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] sm:text-xs text-indigo-300 font-semibold flex items-center gap-1">
                          <Video className="w-3.5 h-3.5" /> Roteiro:
                        </span>
                        <span className="text-xs text-white/90 italic">
                          "{currentSlide.videoAction}"
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={(e) => handleToggleLike(currentSlideId, currentSlideDefaultLikes, e)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer border shadow-xl backdrop-blur-md ${
                        isSlideLiked
                          ? 'bg-rose-500/25 border-rose-400/50 text-rose-200 shadow-rose-500/10'
                          : 'bg-black/60 border-white/20 text-white hover:border-rose-400/40 hover:text-rose-300'
                      }`}
                      title={isSlideLiked ? "Você salvou esta receita! Clique para remover" : "Clique para salvar esta receita/produto"}
                    >
                      <Heart className={`w-4 h-4 transition-transform ${isSlideLiked ? 'fill-rose-400 text-rose-400 scale-110' : 'text-rose-400'}`} />
                      <span className="font-mono">{slideLikesCount}</span>
                      <span className="text-[10px] uppercase font-sans text-white/60">salvaram</span>
                    </button>
                    <span className="text-sm sm:text-base font-black text-white bg-emerald-600 border border-emerald-400/40 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                      {currentSlide?.price}
                    </span>
                    <button
                      onClick={() => {
                        setIsFullscreenModalOpen(false);
                        handleLearnMore();
                      }}
                      className="px-4 py-2 rounded-2xl bg-white text-slate-900 font-bold text-xs sm:text-sm hover:bg-slate-100 transition shadow-xl cursor-pointer"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

