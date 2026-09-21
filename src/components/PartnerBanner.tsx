import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Store, Utensils, Sparkles, Music, Megaphone, Zap, X, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
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
    const promoSlides = promos.map((p: any) => ({
      id: p.id,
      title: p.title || "Oferta Especial",
      subtitle: p.subtitle || "Aproveite esta promoção relâmpago",
      price: p.price || "Oferta",
      image: p.image || FRUIT_BG_IMAGES[0],
      type: "promo"
    }));

    const staticSlides = PARTNERS.map((name, i) => ({
      id: `partner-${i}`,
      title: name,
      subtitle: "Desconto NutriAI Ativo",
      price: "15% OFF",
      image: FRUIT_BG_IMAGES[i % FRUIT_BG_IMAGES.length],
      type: "partner"
    }));

    return [...promoSlides, ...staticSlides];
  };

  const slides = getActiveSlides();

  const [index, setIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.08);
  const [soundType, setSoundType] = useState<"cooking" | "meditative">("cooking");

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

  // Handle partner rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => {
        const len = slides.length || 1;
        return (prev + 1) % len;
      });
    }, 6000);
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

  const currentBgImage = slides[index]?.image || FRUIT_BG_IMAGES[bgIndex];

  return (
    <div className="w-full bg-slate-900 border-b border-slate-200 dark:border-slate-800/85 transition-colors duration-500 overflow-hidden relative">
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
        {/* Banner Principal Unificado com Largura Total (Edge-to-Edge) */}
        <div className="relative w-full h-52 sm:h-60 md:h-68 overflow-hidden group transition-all duration-300">
          {/* Imagem de Fundo (Preenche todo o tamanho da tela) */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <AnimatePresence mode="sync">
              <motion.img
                key={currentBgImage}
                src={currentBgImage}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 1.0, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full object-cover object-center filter saturate-125 contrast-105 brightness-95 dark:brightness-85 transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
          </div>

          {/* Gradiente de sobreposição para leitura perfeita em toda a tela */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/30 pointer-events-none z-0" />

          {/* Conteúdo sobreposto e integrado */}
          <div className="relative z-10 w-full h-full p-4 sm:p-6 md:p-8 flex flex-col justify-between max-w-7xl mx-auto">
            {/* Topo do Banner: Badge Fidelidade e Controles de Áudio */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 bg-transparent border border-white/25 text-white px-3 py-1.5 rounded-full font-mono text-[10px] sm:text-xs tracking-wider uppercase font-extrabold shrink-0 drop-shadow-md">
                <Store className="w-3.5 h-3.5 text-white" />
                <span>{slides[index]?.type === 'promo' ? t('flash_deal_top', 'OFERTA ATIVA ⚡') : t('fidelity_partner', 'Fidelidade Parceira')}</span>
              </div>

              {/* Controles de Áudio Compactos em Pilula Transparente */}
              <div className="flex items-center gap-1 bg-black/40 p-0.5 sm:p-1 rounded-full border border-white/20 shrink-0 backdrop-blur-md shadow-md max-w-[200px] sm:max-w-none">
                <div className="flex items-center gap-0.5 rounded-full">
                  <button
                    onClick={selectCookingTrack}
                    className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer text-white drop-shadow-md active:scale-95 ${
                      !isMuted && soundType === "cooking" 
                        ? "ring-1 ring-emerald-400 font-black bg-emerald-500/40 text-emerald-100 shadow-xs" 
                        : "opacity-80 hover:opacity-100 hover:bg-white/10"
                    }`}
                    title="Música saudável & alegre de culinária e preparo (Acústico NutriAI)"
                  >
                    <Utensils className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-300" />
                    <span className="hidden xs:inline sm:inline">Ritmo</span>
                  </button>
                  <button
                    onClick={selectZenTrack}
                    className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer text-white drop-shadow-md active:scale-95 ${
                      !isMuted && soundType === "meditative" 
                        ? "ring-1 ring-teal-400 font-black bg-teal-500/40 text-teal-100 shadow-xs" 
                        : "opacity-80 hover:opacity-100 hover:bg-white/10"
                    }`}
                    title="Frequências de relaxamento, digestão consciente e foco"
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
                    className="w-8 sm:w-12 h-1 bg-white/40 rounded-lg appearance-none cursor-pointer accent-emerald-400 transition-all opacity-90 hover:opacity-100"
                    title="Ajustar Volume"
                  />
                )}

                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleMusic(); }}
                  className={`p-1 sm:p-1.5 rounded-full border transition-all duration-300 cursor-pointer drop-shadow-md ${
                    !isMuted 
                      ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200' 
                      : 'border-transparent bg-transparent text-white hover:bg-white/15'
                  }`}
                  title={isMuted ? "Tocar trilha sonora do NutriAI" : "Pausar música"}
                  id="toggle-ambient-music-btn"
                >
                  {isMuted ? (
                    <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                  ) : (
                    <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300 animate-pulse" />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Rodapé do Banner: Nome e Oferta do Parceiro Transparente com Texto Branco */}
            <div className="w-full bg-transparent rounded-xl p-1 sm:p-2 border-none">
              <div className="h-10 sm:h-12 overflow-hidden relative w-full flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 12, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -12, filter: "blur(2px)" }}
                    transition={{
                      duration: 0.6,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="w-full flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <span className="font-sans text-sm sm:text-base md:text-lg font-bold text-white tracking-wide block truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {slides[index]?.title}
                      </span>
                      {slides[index]?.subtitle && (
                        <span className="text-[10px] sm:text-xs text-emerald-300 font-semibold block truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {slides[index]?.subtitle}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-white shrink-0 bg-emerald-500/80 px-3 py-1 rounded-full border border-emerald-400/50 shadow-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-300 animate-pulse fill-amber-300" />
                      {slides[index]?.price || "Desconto NutriAI"}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

