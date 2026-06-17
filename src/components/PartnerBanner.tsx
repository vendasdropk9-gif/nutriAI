import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Store } from 'lucide-react';

const PARTNERS = [
  "Sacolão do Bairro - Frescor do Dia 🥬",
  "Horta Urbana Premium - Orgânicos Locais 🍅",
  "Mercado da Terra - Tradição e Sabor 🌽",
  "Empório Orgânico - Direto do Produtor 🥦",
  "Fresh Garden Nutri - Seleção da IA 🍎",
  "Sacolão Vila Verde - Nutrição e Saúde 🥑",
  "Hortifruti Prime - Qualidade Certificada 🍓"
];

export function PartnerBanner() {
  const [index, setIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.06);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterVolumeRef = useRef<GainNode | null>(null);
  const synthNodesRef = useRef<any[]>([]);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (masterVolumeRef.current) {
        masterVolumeRef.current.gain.setValueAtTime(volume, audioCtxRef.current!.currentTime);
    }
  }, [volume]);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PARTNERS.length);
    }, 6000);
    return () => {
      clearInterval(timer);
      stopAmbientSynth();
    };
  }, []);

  const startAmbientSynth = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      // Always stop existing before starting
      stopAmbientSynth();
      
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      // Create a master volume node
      const masterVolume = ctx.createGain();
      masterVolume.gain.setValueAtTime(volume, ctx.currentTime);
      masterVolume.connect(ctx.destination);
      masterVolumeRef.current = masterVolume;

      // Create beautiful low frequency soothing drone/pad
      const droneOsc1 = ctx.createOscillator();
      const droneOsc2 = ctx.createOscillator();
      const droneGain = ctx.createGain();
      
      droneOsc1.type = 'sine';
      droneOsc2.type = 'triangle';
      
      droneOsc1.frequency.setValueAtTime(65.41, ctx.currentTime); // C2
      droneOsc2.frequency.setValueAtTime(98.00, ctx.currentTime); // G2 for rich fifth harmony
      
      droneGain.gain.setValueAtTime(0.3, ctx.currentTime);
      
      droneOsc1.connect(droneGain);
      droneOsc2.connect(droneGain);
      droneGain.connect(masterVolume);
      
      droneOsc1.start();
      droneOsc2.start();
      
      synthNodesRef.current.push(droneOsc1, droneOsc2, droneGain);

      // Pentatonic relaxation scale: C4 (261.63), D4 (293.66), E4 (329.63), G4 (392.00), A4 (440.00), C5 (523.25)
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
      
      // Play a peaceful bell chime periodically
      const playBell = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'suspended') return;
        const now = audioCtxRef.current.currentTime;
        const freq = scale[Math.floor(Math.random() * scale.length)];
        
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        
        osc.type = 'sine';
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
      synthNodesRef.current.forEach(node => {
        try { node.stop(); } catch (e) {}
        try { node.disconnect(); } catch (e) {}
      });
      synthNodesRef.current = [];
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
      masterVolumeRef.current = null;
    }
  };

  const toggleMusic = () => {
    if (isMuted) {
      startAmbientSynth();
      setIsMuted(false);
    } else {
      stopAmbientSynth();
      setIsMuted(true);
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800/85 shadow-sm h-16 md:h-20 flex items-center justify-center pt-0 mx-0 mt-0 -mb-[5px] transition-colors duration-500">
      {/* Decorative pulse background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)] animate-pulse" />
      </div>

      <div className="max-w-7xl mx-auto px-4 w-full flex items-center justify-between relative z-10 animate-fade">
        <div className="hidden md:flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] tracking-widest uppercase font-bold">
          <Store className="w-3 h-3" />
          <span>Parceiros NutriAI</span>
        </div>

        <div className="flex-1 flex justify-center items-center h-full overflow-hidden relative min-h-[40px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
              transition={{ 
                duration: 1.2, 
                ease: [0.22, 1, 0.36, 1] 
              }}
              className="absolute inset-x-0 mx-auto text-center flex justify-center items-center px-4 max-w-full"
            >
              <span className="font-serif text-sm sm:text-lg md:text-2xl font-light text-slate-800 dark:text-slate-200 tracking-wide block max-w-full">
                {PARTNERS[index]}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          {!isMuted && (
            <input
                type="range"
                min="0"
                max="0.2"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-emerald-500/30 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          )}

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMusic}
            className={`p-2 rounded-full border transition-all duration-500 ${
              !isMuted 
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
              : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title={isMuted ? "Ativar música ambiente" : "Desativar música"}
            id="toggle-ambient-music-btn"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          </motion.button>
        </div>
      </div>

      {/* Modern scan line effect */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
    </div>
  );
}
