import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Store, Utensils, Compass, Music, Sliders } from "lucide-react";

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
    <div className="relative w-full overflow-hidden bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800/85 shadow-sm h-auto sm:h-16 md:h-20 flex items-center justify-center py-2 sm:py-0 mx-0 mt-0 -mb-[5px] transition-colors duration-500">
      {/* Imagens de frutas rotacionando de 5 em 5 segundos no fundo */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-[0.55] dark:opacity-[0.45]">
        <AnimatePresence mode="sync">
          <motion.img
            key={bgIndex}
            src={FRUIT_BG_IMAGES[bgIndex]}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover object-center filter saturate-150 contrast-110 brightness-95 dark:brightness-90"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        {/* Soft elegant edge fades to integrate beautifully into the app header */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent dark:from-slate-900" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent dark:from-slate-900" />
      </div>

      {/* Decorative pulse background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)] animate-pulse" />
      </div>

      <div className="max-w-7xl mx-auto px-4 w-full flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 relative z-10 animate-fade">
        <div className="hidden lg:flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] tracking-widest uppercase font-bold">
          <Store className="w-3.5 h-3.5" />
          <span>Fidelidade Parceira</span>
        </div>

        <div className="w-full sm:flex-1 flex justify-center items-center h-8 sm:h-full overflow-hidden relative min-h-[32px] sm:min-h-[40px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
              transition={{
                duration: 1.0,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute inset-x-0 mx-auto text-center flex justify-center items-center px-3 py-1 sm:px-5 sm:py-1.5 max-w-[95%] sm:max-w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-[6px] rounded-full border border-slate-200/50 dark:border-slate-800/60 shadow-md"
            >
              <span className="font-serif text-xs min-[400px]:text-sm sm:text-[15px] md:text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-wide block max-w-full">
                {PARTNERS[index]}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-800/40 p-1 sm:p-1.5 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
          {/* Micro pill sound type switcher */}
          <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-900/40 rounded-full p-0.5">
            <button
              onClick={() => setSoundType("cooking")}
              className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-medium transition-all ${
                soundType === "cooking"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Música saudável & alegre de culinária (Acústico)"
            >
              <Utensils className="w-3 h-3" />
              <span className="hidden sm:inline">Nutri-Ritmo</span>
            </button>
            <button
              onClick={() => setSoundType("meditative")}
              className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-medium transition-all ${
                soundType === "meditative"
                  ? "bg-teal-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Frequências zen de meditação e foco"
            >
              <Compass className="w-3 h-3" />
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
              className="w-12 sm:w-14 h-1 bg-emerald-500/30 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-all opacity-80 hover:opacity-100"
              title="Ajustar Volume"
            />
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMusic}
            className={`p-1.5 rounded-full border transition-all duration-300 ${
              !isMuted
                ? soundType === "cooking"
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                  : "bg-teal-500/10 border-teal-500/40 text-teal-600 dark:text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.15)]"
                : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400"
            }`}
            title={isMuted ? "Tocar trilha sonora" : "Pausar música"}
            id="toggle-ambient-music-btn"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Modern scan line effect */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
    </div>
  );
}

