import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Leaf, RotateCw, Volume2, VolumeX, Award, Zap, Flame, 
  CheckCircle2, Clock, Trash2, ArrowLeft, Coffee, Sparkles
} from 'lucide-react';
import { UserProfile } from '../types';

interface Fruit {
  id: string;
  name: string;
  emoji: string;
  calories: string;
  benefits: string;
  vitamins: string;
  vitsLevel: string;
  fibersLevel: string;
  antioxidantsLevel: string;
  suggestion: string;
  colorHex: string;
  gradientFrom: string;
  gradientTo: string;
}

const ALL_FRUITS: Fruit[] = [
  {
    id: 'banana',
    name: 'Banana',
    emoji: '🍌',
    calories: '89 kcal',
    benefits: 'Fonte maravilhosa de potássio, fibras solúveis e energia limpa de rápida absorção. Ideal para prevenir cãibras e regular a saúde digestiva ao longo do dia.',
    vitamins: 'Vitamina B6 & C',
    vitsLevel: 'Alta',
    fibersLevel: 'Alta',
    antioxidantsLevel: 'Média',
    suggestion: 'Consuma pura como snacks rápidos, misturada com aveia e mel refinado, ou batida de manhã na sua vitamina favorita.',
    colorHex: 'from-amber-400 to-yellow-500',
    gradientFrom: '#FCD34D',
    gradientTo: '#EAB308'
  },
  {
    id: 'maca',
    name: 'Maçã',
    emoji: '🍎',
    calories: '52 kcal',
    benefits: 'Riquíssima em pectina, uma fibra solúvel de alta qualidade que controla os picos de açúcar no sangue, aumenta a saciedade e otimiza o fluxo do colesterol.',
    vitamins: 'Vitamina C & Fibras',
    vitsLevel: 'Alta',
    fibersLevel: 'Excelente',
    antioxidantsLevel: 'Alta',
    suggestion: 'Consuma com a casca para absorver todas as lignanas, corte em fatias com um fio de mel, ou asse com canela fina salpicada.',
    colorHex: 'from-rose-500 to-red-600',
    gradientFrom: '#FB7185',
    gradientTo: '#DC2626'
  },
  {
    id: 'morango',
    name: 'Morango',
    emoji: '🍓',
    calories: '32 kcal',
    benefits: 'Rico em vitamina C, antioxidantes e fibras. Excelente para combater radicais livres, fortalecer a imunidade e manter a elasticidade saudável da pele.',
    vitamins: 'Vitamina C, Potássio',
    vitsLevel: 'Muito Alta',
    fibersLevel: 'Alta',
    antioxidantsLevel: 'Ricos',
    suggestion: 'Consuma in natura, em saladas de lanche refrescantes, acompanhado de iogurtes naturais ou batido em vitaminas frescas.',
    colorHex: 'from-pink-500 to-rose-600',
    gradientFrom: '#EC4899',
    gradientTo: '#BE185D'
  },
  {
    id: 'abacaxi',
    name: 'Abacaxi',
    emoji: '🍍',
    calories: '50 kcal',
    benefits: 'Extraoficialmente recheado de bromelina, uma enzima poderosa que potencializa a quebra e digestão de proteínas e ajuda a combater o inchaço abdominal.',
    vitamins: 'Vitamina C & Manganês',
    vitsLevel: 'Alta',
    fibersLevel: 'Média',
    antioxidantsLevel: 'Excelente',
    suggestion: 'Sirva como fatias deliciosas após as refeições principais, grelhado de leve na canela ou no seu suco refrescante de hortelã.',
    colorHex: 'from-yellow-400 to-amber-500',
    gradientFrom: '#FBBF24',
    gradientTo: '#D97706'
  },
  {
    id: 'melancia',
    name: 'Melancia',
    emoji: '🍉',
    calories: '30 kcal',
    benefits: 'Contém cerca de 92% de água celular altamente nutritiva, repleta de l-citrulina e licopeno, essenciais para repor a hidratação muscular de forma rápida.',
    vitamins: 'Licopeno & Complexo A',
    vitsLevel: 'Média',
    fibersLevel: 'Suave',
    antioxidantsLevel: 'Alto',
    suggestion: 'Saboreie bem gelada em fatias nos dias ensolarados, ou batida na hora como um super shake de hidratação sem água adicionada.',
    colorHex: 'from-emerald-505 to-green-500',
    gradientFrom: '#34D399',
    gradientTo: '#059669'
  },
  {
    id: 'uva',
    name: 'Uva',
    emoji: '🍇',
    calories: '67 kcal',
    benefits: 'Fornece resveratrol em quantidades excepcionais nas cascas escuras, ajudando a blindar a saúde do sistema cardiovascular e renovar as células corporais.',
    vitamins: 'Vitamina K & Resveratrol',
    vitsLevel: 'Média',
    fibersLevel: 'Média',
    antioxidantsLevel: 'Ricos',
    suggestion: 'Perfeito para manter na geladeira e consumir aos poucos como snack fresco, ou adicionar a queijos leves e iogurtes gregos.',
    colorHex: 'from-purple-500 to-indigo-600',
    gradientFrom: '#A78BFA',
    gradientTo: '#6D28D9'
  },
  {
    id: 'manga',
    name: 'Manga',
    emoji: '🥭',
    calories: '60 kcal',
    benefits: 'Possui generoso teor de antioxidantes, betacaroteno e fibras solúveis que protegem a saúde ocular, melhoram o viço facial e estimulam a digestão saudável.',
    vitamins: 'Vitamina A & C',
    vitsLevel: 'Alta',
    fibersLevel: 'Alta',
    antioxidantsLevel: 'Alta',
    suggestion: 'Coma picada fresca bem gelada, misture em saladas verdes crocantes ou faça smoothies cremosos sem adoçantes artificiais.',
    colorHex: 'from-orange-400 to-yellow-600',
    gradientFrom: '#FB923C',
    gradientTo: '#EA580C'
  },
  {
    id: 'kiwi',
    name: 'Kiwi',
    emoji: '🥝',
    calories: '61 kcal',
    benefits: 'Contém mais vitamina C pura que a própria laranja! Acelera o metabolismo de cura, fortalece as defesas naturais e apoia a circulação.',
    vitamins: 'Vitamina C & E',
    vitsLevel: 'Altíssima',
    fibersLevel: 'Muito Alta',
    antioxidantsLevel: 'Excelente',
    suggestion: 'Corte simplesmente ao meio e retire a polpa rica com uma colher pequena, ou pique em saladas de frutas cítricas.',
    colorHex: 'from-lime-500 to-emerald-600',
    gradientFrom: '#A3E635',
    gradientTo: '#15803D'
  },
  {
    id: 'laranja',
    name: 'Laranja',
    emoji: '🍊',
    calories: '47 kcal',
    benefits: 'Excelente fonte de polifenóis bioativos e ácido cítrico. Auxilia na absorção de ferro de origem vegetal e protege as artérias coronárias.',
    vitamins: 'Vitamina C & Fibras',
    vitsLevel: 'Alta',
    fibersLevel: 'Muito Alta',
    antioxidantsLevel: 'Alta',
    suggestion: 'Consuma preferencialmente inteira com o bagaço fibroso para retardar o açúcar, ou espremida no suco sem coar.',
    colorHex: 'from-orange-500 to-amber-600',
    gradientFrom: '#F97316',
    gradientTo: '#EA580C'
  },
  {
    id: 'pera',
    name: 'Pera',
    emoji: '🍐',
    calories: '57 kcal',
    benefits: 'Excelente teor de frutose de baixo impacto insulínico e água equilibrada. Apoia o emagrecimento saudável promovendo uma sensação de saciedade prolongada.',
    vitamins: 'Vitamina K, C & Potássio',
    vitsLevel: 'Média',
    fibersLevel: 'Excelente',
    antioxidantsLevel: 'Média',
    suggestion: 'Saboreie como sua sobremesa leve de fim de noite, assada rapidamente com canela seca, ou junto a lâminas de castanhas de caju.',
    colorHex: 'from-yellow-500 to-lime-600',
    gradientFrom: '#FACC15',
    gradientTo: '#65A30D'
  },
  {
    id: 'coco',
    name: 'Coco',
    emoji: '🥥',
    calories: '99 kcal',
    benefits: 'Contém triglicerídeos de cadeia média (TCM), deliciosas gorduras saturadas de fácil e rápido consumo energético celular que geram saciedade imediata.',
    vitamins: 'Potássio, Lipídeos Úteis',
    vitsLevel: 'Média',
    fibersLevel: 'Muito Alta',
    antioxidantsLevel: 'Média',
    suggestion: 'Saboreie pequenos pedaços ou cubinhos secos como um lanche da tarde revigorante, ou adicione raspas frescas a saladas.',
    colorHex: 'from-amber-700 to-yellow-800',
    gradientFrom: '#B45309',
    gradientTo: '#78350F'
  },
  {
    id: 'mamao',
    name: 'Mamão',
    emoji: '🍈',
    calories: '43 kcal',
    benefits: 'Contém enzimas proteolíticas como a papaína, ideais para facilitar a absorção de nutrientes, acalmar o estômago e manter o trato intestinal livre.',
    vitamins: 'Vitamina A & Papaína',
    vitsLevel: 'Excelente',
    fibersLevel: 'Muito Alta',
    antioxidantsLevel: 'Alta',
    suggestion: 'Aproveite no café da manhã fatiado em metades, salpicando sementes de linhaça, chia hidratada ou granola caseira.',
    colorHex: 'from-orange-500 to-yellow-600',
    gradientFrom: '#FB923C',
    gradientTo: '#D97706'
  }
];

export function FitnessRoulette({ profile }: { profile: UserProfile | null }) {
  // Config state
  const [isMuted, setIsMuted] = useState(false);
  const [points, setPoints] = useState(() => {
    return profile?.points || 150;
  });
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  
  // Weekly spin history
  const [weeklyCompletedSpins, setWeeklyCompletedSpins] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nutri_roulette_history_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track spins
  const [spinsLeft, setSpinsLeft] = useState(3);

  // Animation and spin mechanics
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [shaking, setShaking] = useState(false);
  
  // Active selected fruit initially (We default to Morango at index 2 matching preview exactly)
  const [result, setResult] = useState<Fruit | null>(ALL_FRUITS[2]);
  const [glowWinner, setGlowWinner] = useState(false);

  // References for Web Confetti Overlay
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiParticles = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
  }[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nutri_roulette_history_v3', JSON.stringify(weeklyCompletedSpins));
    } catch (e) {
      console.warn("Storage syncing blocked:", e);
    }
  }, [weeklyCompletedSpins]);

  // Audio Synthesizer relying on Web Audio API safely
  const playSound = (type: 'tick' | 'win' | 'start' | 'error') => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'start') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'win') {
        // High quality bright C major arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
          gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.45);
          osc.start(ctx.currentTime + idx * 0.09);
          osc.stop(ctx.currentTime + idx * 0.09 + 0.45);
        });
      } else if (type === 'error') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn("Sound blocked by client policy:", e);
    }
  };

  // Sparkle Confetti Eruption Loop
  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 500;
    canvas.height = canvas.parentElement?.clientHeight || 500;

    const pallet = ['#ec4899', '#a855f7', '#10b981', '#f59e0b', '#3b82f6', '#34d399', '#f43f5e'];

    confettiParticles.current = Array.from({ length: 90 }, () => ({
      x: canvas.width / 2,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 14,
      vy: (-Math.random() * 10) - 5,
      color: pallet[Math.floor(Math.random() * pallet.length)],
      size: Math.random() * 6 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12
    }));

    const updateConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      confettiParticles.current.forEach(p => {
        p.vy += 0.3; // gravity
        p.vx *= 0.98; // air resistance
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height && p.x > 0 && p.x < canvas.width) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        animationFrameId.current = requestAnimationFrame(updateConfetti);
      }
    };

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    updateConfetti();
  };

  // Handle spin action
  const spinTheWheel = () => {
    if (isSpinning) return;
    if (spinsLeft <= 0) {
      playSound('error');
      alert('Seus giros livres acabaram! Gire novamente em instantes ou coma bem hoje para restabelecer seus créditos.');
      return;
    }

    setIsSpinning(true);
    setGlowWinner(false);
    playSound('start');

    // Pick randomized winner index
    const segmentCount = ALL_FRUITS.length;
    const winnerIndex = Math.floor(Math.random() * segmentCount);
    const degreesPerSegment = 360 / segmentCount;

    // Standard high rotational multiple + calculate target angle (Banana is 0 at top)
    const topAlignOffset = 360 - (winnerIndex * degreesPerSegment);
    const randomWedgeSlightIn = Math.random() * 20 - 10; // offset stop slightly inside slice
    const totalSpins = 360 * 6; // spins 6 full times

    // Calculate rotation to make segment arrive perfectly at peak positioning
    const finalRotation = rotation - (rotation % 360) + totalSpins + topAlignOffset + randomWedgeSlightIn;

    setRotation(finalRotation);

    // Audio ticking simulation matching velocity decay
    let tickCount = 0;
    const totalTicks = 24;
    const tickingInterval = setInterval(() => {
      tickCount++;
      if (tickCount <= totalTicks) {
        playSound('tick');
      } else {
        clearInterval(tickingInterval);
      }
    }, 130 + tickCount * 8);

    // Minor shake as momentum winds down
    setTimeout(() => {
      setShaking(true);
    }, 3600);

    setTimeout(() => {
      setIsSpinning(false);
      setShaking(false);
      clearInterval(tickingInterval);

      // Perform haptic vibration (device support check)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([120, 50, 150]);
      }

      const winner = ALL_FRUITS[winnerIndex];
      setResult(winner);
      setWeeklyCompletedSpins(prev => [
        `${winner.emoji} ${winner.name} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        ...prev.slice(0, 19) // Keep last 20 records
      ]);
      setSpinsLeft(prev => prev - 1);
      setPoints(prev => prev + 15);

      playSound('win');
      setGlowWinner(true);
      triggerConfetti();
    }, 4500); // 4.5s matches the smooth custom deceleration duration
  };

  // Clear spin tracking history
  const clearWeeklyHistory = () => {
    setWeeklyCompletedSpins([]);
    try {
      localStorage.removeItem('nutri_roulette_history_v3');
    } catch {}
  };

  return (
    <div id="roleta-fit-view" className="relative w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 bg-slate-950/70 border border-purple-500/15 rounded-[32px] overflow-hidden backdrop-blur-2xl shadow-[0_0_55px_rgba(139,92,246,0.12)] select-none">
      {/* Sparkly Canvas confetti overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 z-50 pointer-events-none w-full h-full" />

      {/* HEADER SECTION */}
      <div className="flex items-center justify-between gap-4 border-b border-purple-900/20 pb-5 mb-6 relative z-10">
        
        {/* Styled Mock Back Button */}
        <button 
          onClick={() => {
            // Smooth reset to default view or simulation reset
            setResult(ALL_FRUITS[2]); // Back to morango
            setGlowWinner(false);
          }}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 transition-all active:scale-95 flex items-center justify-center shrink-0 shadow-sm"
          title="Redefinir visualização"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Central Brand Label */}
        <div className="text-center flex-1">
          <div className="flex flex-col items-center justify-center gap-1">
            <Leaf className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" />
            <h1 className="font-sans font-black text-2xl sm:text-3xl tracking-wider text-white uppercase">
              ROLETA <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-400 font-black">FIT</span>
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1">
            Gire a roleta e descubra uma fruta saudável para o seu dia!
          </p>
        </div>

        {/* History Action Trigger */}
        <button
          onClick={() => setShowHistoryDrawer(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-850 transition-all active:scale-95 shrink-0"
        >
          <Clock className="w-4 h-4 text-purple-400" />
          <span className="hidden sm:inline">Histórico</span>
        </button>

      </div>

      {/* WHEEL CENTERPIECE & SPIN MECHANICS */}
      <div className="flex flex-col items-center justify-center w-full py-4 relative z-10">
        
        {/* Pulse spins count status bar */}
        <div className="text-center mb-6 z-10">
          <span className="text-[11px] sm:text-xs font-bold tracking-widest text-purple-300 uppercase flex items-center gap-2 justify-center">
            <Flame className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
            Giros Disponíveis Hoje: <strong className="text-white text-sm px-2.5 py-0.5 bg-pink-500/15 rounded-md border border-pink-500/20">{spinsLeft}</strong>
          </span>
        </div>

        {/* PERFECTLY CIRCULAR WHEEL WRAPPER */}
        <div className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[370px] md:max-w-[400px] aspect-square rounded-full flex items-center justify-center mb-8 mx-auto">
          
          {/* External locator needle map-pin pointing exactly down */}
          <div className="absolute -top-[15px] left-1/2 -translate-x-1/2 z-40 select-none pointer-events-none drop-shadow-[0_8px_16px_rgba(236,72,153,0.5)]">
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="url(#pinGrad)" />
              <circle cx="14" cy="14" r="4.5" fill="#FFFFFF" />
              <defs>
                <linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Glowing neon ring shell */}
          <div className={`absolute inset-0 rounded-full border-4 border-purple-500/40 p-1 bg-slate-950/80 shadow-[0_0_35px_rgba(168,85,247,0.25)] flex items-center justify-center overflow-hidden ${shaking ? 'animate-bounce' : ''}`}>
            
            {/* LED Glowing border bulbs distributed evenly along boundary */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * 360) / 16;
              const rad = (angle * Math.PI) / 180;
              const x = 50 + 49.0 * Math.cos(rad);
              const y = 50 + 49.0 * Math.sin(rad);
              const isEven = i % 2 === 0;
              return (
                <div 
                  key={i}
                  className={`absolute w-1.5 h-1.5 rounded-full z-25 -translate-x-1/2 -translate-y-1/2 transition-colors duration-200 ${
                    isSpinning
                      ? isEven ? 'bg-pink-400 shadow-[0_0_10px_#ec4899] scale-110' : 'bg-purple-400 shadow-[0_0_10px_#a855f7]'
                      : isEven ? 'bg-pink-500/80 shadow-[0_0_6px_#ec4899]' : 'bg-purple-500/80 shadow-[0_0_6px_#a855f7]'
                  }`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                />
              );
            })}

            {/* Rotating SVG core */}
            <motion.div 
              className="w-full h-full rounded-full select-none"
              style={{ transformOrigin: 'center' }}
              animate={{ rotate: rotation }}
              transition={isSpinning ? { duration: 4.5, ease: [0.15, 0.85, 0.2, 1] } : { duration: 0 }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full select-none overflow-hidden rounded-full">
                <defs>
                  <radialGradient id="centerSpaceGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#03000a" stopOpacity="1" />
                  </radialGradient>
                  {ALL_FRUITS.map(fruit => (
                    <linearGradient id={`grad-${fruit.id}`} key={fruit.id} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={fruit.gradientFrom} stopOpacity="0.85" />
                      <stop offset="100%" stopColor={fruit.gradientTo} stopOpacity="0.95" />
                    </linearGradient>
                  ))}
                </defs>

                <circle cx="50" cy="50" r="50" fill="url(#centerSpaceGlow)" />

                {ALL_FRUITS.map((fruit, index) => {
                  const totalSegments = ALL_FRUITS.length;
                  const sliceAngle = 360 / totalSegments;
                  const startAngle = index * sliceAngle;
                  
                  const r = 48; // Leave small margin from border
                  const rad1 = ((startAngle - 90) * Math.PI) / 180;
                  const rad2 = ((startAngle + sliceAngle - 90) * Math.PI) / 180;
                  
                  const x1 = 50 + r * Math.cos(rad1);
                  const y1 = 50 + r * Math.sin(rad1);
                  const x2 = 50 + r * Math.cos(rad2);
                  const y2 = 50 + r * Math.sin(rad2);
                  
                  const cx = 50;
                  const cy = 50;
                  
                  // Text coordinates at distance 29.5 from center
                  const midAngle = startAngle + sliceAngle / 2;
                  const midRad = ((midAngle - 90) * Math.PI) / 180;
                  const tx = 50 + 29.5 * Math.cos(midRad);
                  const ty = 50 + 29.5 * Math.sin(midRad);

                  return (
                    <g key={fruit.id} className="cursor-pointer">
                      {/* Sector Path Wedge */}
                      <path 
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                        fill={`url(#grad-${fruit.id})`}
                        stroke="#0f0726"
                        strokeWidth="0.4"
                        className="transition-all duration-300 hover:brightness-110"
                      />
                      
                      {/* Segment Concentric aligned Name & Emojis */}
                      <g transform={`translate(${tx}, ${ty}) rotate(${midAngle + 90})`}>
                        <text 
                          x="0" 
                          y="-2" 
                          textAnchor="middle" 
                          dominantBaseline="middle" 
                          fontSize="7.5"
                          className="select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)] font-serif"
                        >
                          {fruit.emoji}
                        </text>
                        <text 
                          x="0" 
                          y="4" 
                          textAnchor="middle" 
                          dominantBaseline="middle" 
                          fontSize="2.1" 
                          fontWeight="900" 
                          fill="#FFFFFF"
                          className="font-sans uppercase tracking-widest select-none pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] fill-white"
                        >
                          {fruit.name}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </motion.div>

            {/* Glowing static center axis cap with Leaf */}
            <div className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-indigo-600 p-0.5 shadow-[0_0_25px_rgba(168,85,247,0.7)] z-30 flex items-center justify-center border border-white/20">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center relative">
                <Leaf className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                <div className="absolute inset-1 rounded-full border border-purple-500/10 pointer-events-none animate-pulse"></div>
              </div>
            </div>

          </div>
        </div>

        {/* MAIN SPIN ACTION BUTTON */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-sm px-4">
          <button
            onClick={spinTheWheel}
            disabled={isSpinning || spinsLeft <= 0}
            className="w-full py-4.5 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 text-white font-sans font-black text-lg text-center rounded-2xl flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(236,72,153,0.4)] active:scale-95 transition-all disabled:opacity-45 disabled:pointer-events-none uppercase tracking-wider border border-white/10"
          >
            <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
            {isSpinning ? 'Sorteando Vida...' : 'Girar Roleta Fit'}
          </button>
        </div>

      </div>

      {/* DETAILED ACTIVE WIN RESULT PANEL */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className={`w-full mt-8 p-4 sm:p-6 rounded-[28px] border transition-all ${
              glowWinner 
                ? 'bg-slate-900/90 dark:bg-slate-950/90 border-pink-500/40 shadow-[0_0_30px_rgba(236,72,153,0.2)] animate-pulse'
                : 'bg-slate-900/50 dark:bg-slate-950/50 border-purple-500/10'
            }`}
          >
            
            {/* Split result summary info */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              
              {/* Left Glowing Avatar Ring containing fruit emoji */}
              <div className="shrink-0 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full blur-xl opacity-70 bg-gradient-to-tr from-pink-500 to-purple-600 scale-110"></div>
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-950 border-2 border-pink-500/30 flex items-center justify-center text-4xl sm:text-5xl shadow-inner z-10">
                  {result.emoji}
                </div>
              </div>

              {/* Right Descriptions & Stats */}
              <div className="flex-1 text-center md:text-left space-y-3 min-w-0">
                <div>
                  <h3 className="font-sans font-extrabold text-lg sm:text-xl text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-500 to-purple-400 uppercase tracking-wide">
                    {result.emoji} {result.name} sorteado!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-350 font-normal leading-relaxed mt-1">
                    {result.benefits}
                  </p>
                </div>

                {/* 4 columns micro stats table badges */}
                <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 text-center pt-2">
                  <div className="bg-slate-902/80 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-center">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">🍊 Calorias</span>
                    <span className="font-extrabold text-orange-400 text-xs sm:text-sm mt-0.5">{result.calories}</span>
                  </div>

                  <div className="bg-slate-902/80 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-center">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">🧪 Vitamina C</span>
                    <span className="font-extrabold text-emerald-400 text-xs sm:text-sm mt-0.5">{result.vitsLevel}</span>
                  </div>

                  <div className="bg-slate-902/80 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-center">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">🌿 Fibras</span>
                    <span className="font-extrabold text-teal-400 text-xs sm:text-sm mt-0.5">{result.fibersLevel}</span>
                  </div>

                  <div className="bg-slate-902/80 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-center">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">🧬 Antioxidantes</span>
                    <span className="font-extrabold text-purple-400 text-xs sm:text-sm mt-0.5">{result.antioxidantsLevel}</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Consumption Suggestion Row */}
            <div className="mt-5 p-3.5 bg-slate-950/80 rounded-2xl border border-purple-500/10 flex items-start gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Coffee className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h4 className="font-sans font-bold text-slate-300 text-xs uppercase tracking-wider">Sugestão de Consumo</h4>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed font-medium">
                  {result.suggestion}
                </p>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK NUTRITION RULES GUIDE SUMMARY */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 text-xs">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 uppercase font-bold tracking-widest block text-[10px]">
            ALIMENTAÇÃO INTELIGENTE
          </span>
          <p className="text-slate-400 leading-relaxed max-w-xl">
            As frutas trazem fitoquímicos e carboidratos nobres ideais para enriquecer sua nutrição. Aproveite os nutrientes frescos ao longo do seu dia!
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold shrink-0">
          <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" />
          <span>{points} pts</span>
        </div>
      </div>

      {/* HISTÓRICO DRAWER / DETAILED SLIDE-IN MODAL */}
      <AnimatePresence>
        {showHistoryDrawer && (
          <div className="fixed inset-0 z-[200] flex items-center justify-end bg-slate-950/80 backdrop-blur-sm p-4">
            
            {/* Backdrop click dismisses */}
            <div className="absolute inset-0" onClick={() => setShowHistoryDrawer(false)} />

            {/* Slide in panel container */}
            <motion.div
              initial={{ x: 280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 280, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="relative w-full max-w-sm h-full max-h-[580px] sm:max-h-[640px] bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col shadow-2xl z-21"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-purple-400" />
                  <h3 className="font-sans font-black text-white text-base uppercase tracking-wider">Histórico de Giros</h3>
                </div>
                <button 
                  onClick={() => setShowHistoryDrawer(false)}
                  className="text-slate-500 hover:text-white p-1 text-sm font-bold"
                >
                  Fechar
                </button>
              </div>

              {/* Scrollable list items */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {weeklyCompletedSpins.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <Sparkles className="w-8 h-8 text-slate-650 mb-2 animate-bounce" />
                    <p className="text-xs">Nenhum giro registrado.</p>
                    <p className="text-[10px] text-slate-600 mt-1">Gire a roleta e monte seu menu de vantagens!</p>
                  </div>
                ) : (
                  weeklyCompletedSpins.map((spin, k) => (
                    <div key={k} className="p-3 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-between text-xs text-white">
                      <span className="font-semibold">{spin}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />
                    </div>
                  ))
                )}
              </div>

              {/* Clear records button */}
              {weeklyCompletedSpins.length > 0 && (
                <button
                  onClick={clearWeeklyHistory}
                  className="mt-4 w-full py-2.5 rounded-xl bg-red-950/30 border border-red-900/40 text-red-400 hover:text-white hover:bg-red-900/50 transition-all font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Histórico
                </button>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
