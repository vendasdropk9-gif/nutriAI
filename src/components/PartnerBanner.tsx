import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Store, Utensils, Compass, Music, Sliders } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const [index, setIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.06);
  const [soundType, setSoundType] = useState<"cooking" | "meditative">("cooking"); // default to energetic cooking track as requested

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
    // Sync HTML5 audio volume (scaled slightly higher for better balance)
    if (htmlAudioRef.current) {
      htmlAudioRef.current.volume = Math.min(volume * 4.5, 1.0);
    }
  }, [volume]);

  // Handle partner rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PARTNERS.length);
    }, 6000);
    return () => {
      clearInterval(timer);
      stopAmbientSynth();
      stopHTMLAudio();
    };
  }, []);

  // Background fruits rotation interval (every 5 seconds as requested)
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
        // High quality happy, warm, sunny acoustic guitar study/cooking soundtrack
        const audio = new Audio("https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3");
        audio.loop = true;
        htmlAudioRef.current = audio;
      }
      
      htmlAudioRef.current.volume = Math.min(volume * 4.5, 1.0);
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

      // Create beautiful low frequency soothing drone/pad
      const droneOsc1 = ctx.createOscillator();
      const droneOsc2 = ctx.createOscillator();
      const droneGain = ctx.createGain();

      droneOsc1.type = "sine";
      droneOsc2.type = "sine"; // Premium warm dual-sine drone/pad

      droneOsc1.frequency.setValueAtTime(65.41, ctx.currentTime); // C2
      droneOsc2.frequency.setValueAtTime(98.0, ctx.currentTime); // G2

      droneGain.gain.setValueAtTime(0.2, ctx.currentTime); // Soft background depth

      droneOsc1.connect(droneGain);
      droneOsc2.connect(droneGain);
      droneGain.connect(masterVolume);

      droneOsc1.start();
      droneOsc2.start();

      synthNodesRef.current.push(droneOsc1, droneOsc2, droneGain);

      // Pentatonic relaxation scale
      const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

      const playBell = () => {
        if (!audioCtxRef.current) return;
        const currentCtx = audioCtxRef.current;
        
        // Ensure context is running when triggering notes
        if (currentCtx.state === "suspended") {
          currentCtx.resume().catch(() => {});
        }
        
        const now = currentCtx.currentTime;
        const freq =
          scale[Math.floor(Math.random() * scale.length)];

        const osc = currentCtx.createOscillator();
        const gain = currentCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        // Premium soft chime envelope: 100ms attack, very long smooth exponential release
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

        osc.connect(gain);
        gain.connect(masterVolume);

        osc.start(now);
        osc.stop(now + 3.6);
      };

      intervalRef.current = setInterval(playBell, 3000);
      playBell(); // Play first chime instantly
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
    setIsMuted((prev) => !prev);
  };

  return (
    <div className="w-full bg-slate-900 border-b border-slate-200 dark:border-slate-800/85 transition-colors duration-500 overflow-hidden">
      <div className="w-full">
        {/* Banner Principal Unificado com Largura Total (Edge-to-Edge) */}
        <div className="relative w-full h-52 sm:h-60 md:h-68 overflow-hidden group transition-all duration-300">
          {/* Imagem de Fundo (Preenche todo o tamanho da tela) */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <AnimatePresence mode="sync">
              <motion.img
                key={bgIndex}
                src={FRUIT_BG_IMAGES[bgIndex]}
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
                <span>{t('fidelity_partner', 'Fidelidade Parceira')}</span>
              </div>

              {/* Controles de Áudio em Pilula Transparente */}
              <div className="flex items-center gap-1.5 bg-transparent p-1 rounded-full border border-white/25 shrink-0 backdrop-blur-sm">
                <div className="flex items-center gap-0.5 bg-transparent rounded-full p-0.5">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSoundType("cooking"); }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer bg-transparent text-white hover:bg-white/15 drop-shadow-md ${
                      soundType === "cooking" ? "ring-1 ring-white/70 font-black bg-white/10" : "opacity-85 hover:opacity-100"
                    }`}
                    title="Música saudável & alegre de culinária (Acústico)"
                  >
                    <Utensils className="w-3 h-3 text-white" />
                    <span className="hidden sm:inline">Nutri-Ritmo</span>
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSoundType("meditative"); }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer bg-transparent text-white hover:bg-white/15 drop-shadow-md ${
                      soundType === "meditative" ? "ring-1 ring-white/70 font-black bg-white/10" : "opacity-85 hover:opacity-100"
                    }`}
                    title="Frequências zen de meditação e foco"
                  >
                    <Compass className="w-3 h-3 text-white" />
                    <span className="hidden sm:inline">Meditar</span>
                  </button>
                </div>

                {!isMuted && (
                  <input
                    type="range"
                    min="0.01"
                    max="0.2"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="w-10 sm:w-14 h-1 bg-white/40 rounded-lg appearance-none cursor-pointer accent-white transition-all opacity-90 hover:opacity-100"
                    title="Ajustar Volume"
                  />
                )}

                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleMusic(); }}
                  className="p-1.5 rounded-full border border-transparent bg-transparent text-white hover:bg-white/15 transition-all duration-300 cursor-pointer drop-shadow-md"
                  title={isMuted ? "Tocar trilha sonora" : "Pausar música"}
                  id="toggle-ambient-music-btn"
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Rodapé do Banner: Nome e Oferta do Parceiro Transparente com Texto Branco */}
            <div className="w-full bg-transparent rounded-xl p-1 sm:p-2 border-none">
              <div className="h-7 overflow-hidden relative w-full flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(2px)" }}
                    transition={{
                      duration: 0.6,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="w-full flex items-center justify-between gap-2"
                  >
                    <span className="font-sans text-sm sm:text-base md:text-lg font-bold text-white tracking-wide block truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {PARTNERS[index]}
                    </span>
                    <span className="text-[11px] sm:text-xs font-semibold text-white shrink-0 bg-transparent px-2.5 py-0.5 rounded-full border border-white/40 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      Desconto NutriAI
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

