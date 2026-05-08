import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Volume2, VolumeX, Store } from 'lucide-react';

const PARTNERS = [
  "Sacolão do Bairro - Frescor do Dia 🥬",
  "Horta Urbana Premium - Orgânicos Locais 🍅",
  "Mercado da Terra - Tradição e Sabor 🌽",
  "Empório Orgânico - Direto do Produtor 🥦",
  "Fresh Garden Nutri - Seleção da IA 🍎",
  "Sacolão Vila Verde - Nutrição e Saúde 🥑",
  "Hortifruti Prime - Qualidade Certificada 🍓"
];

const AMBIENT_MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3";

export function PartnerBanner() {
  const [index, setIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PARTNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.play().catch(err => console.log("Audio play failed, user interaction required:", err));
      setIsMuted(false);
    } else {
      audioRef.current.pause();
      setIsMuted(true);
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-y border-white/5 shadow-2xl h-16 md:h-20 flex items-center justify-center pt-0 mx-0 mt-0 -mb-[5px]">
      {/* Decorative pulse background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)] animate-pulse" />
      </div>

      {/* Audio Element */}
      <audio 
        ref={audioRef}
        src={AMBIENT_MUSIC_URL}
        loop
        preload="auto"
      />

      <div className="max-w-7xl mx-auto px-4 w-full flex items-center justify-between relative z-10">
        <div className="hidden md:flex items-center gap-2 text-emerald-500/60 font-mono text-[10px] tracking-widest uppercase">
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
              className="absolute text-center"
            >
              <span className="font-serif text-lg md:text-2xl font-light text-white tracking-wide">
                {PARTNERS[index]}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMusic}
          className={`p-2 rounded-full border transition-all duration-500 ${
            !isMuted 
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
            : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
          }`}
          title={isMuted ? "Ativar música ambiente" : "Desativar música"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </motion.button>
      </div>

      {/* Modern scan line effect */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
    </div>
  );
}
