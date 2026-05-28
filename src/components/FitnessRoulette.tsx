import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Award, RotateCw, Utensils, Zap, HelpCircle, 
  Flame, CheckCircle2, ChevronRight, Volume2, VolumeX, Eye
} from 'lucide-react';
import { UserProfile } from '../types';

interface Dessert {
  id: string;
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  type: 'light' | 'balanced' | 'high-calorie';
  tier: 'unlocked' | 'premium';
}

const ALL_DESSERTS: Dessert[] = [
  // Light / Low Carb (Cutting)
  { id: 'morango-choco', name: 'Morango c/ Choco 70%', emoji: '🍓', calories: 120, protein: 3, carbs: 12, fat: 8, ingredients: ['Morangos frescos', 'Cacau 70%', 'Gotas de Stévia'], type: 'light', tier: 'unlocked' },
  { id: 'iogurte-protein', name: 'Iogurte com Frutas', emoji: '🍇', calories: 110, protein: 12, carbs: 10, fat: 1, ingredients: ['Iogurte natural desnatado', 'Frutas vermelhas', 'Psyllium'], type: 'light', tier: 'unlocked' },
  { id: 'mousse-lowcarb', name: 'Mousse Abacate Lowcarb', emoji: '🥑', calories: 140, protein: 4, carbs: 7, fat: 11, ingredients: ['Abacate maduro', 'Whey protein de cacau', 'Eritritol'], type: 'light', tier: 'unlocked' },
  { id: 'mousse-maracuja', name: 'Mousse de Maracujá Light', emoji: '🍋', calories: 95, protein: 8, carbs: 6, fat: 2, ingredients: ['Polpa de maracujá', 'Gelatina zero', 'Yorgus desnatado'], type: 'light', tier: 'premium' },
  
  // Balanced (Manutenção)
  { id: 'banana-amendoim', name: 'Banana com Amendoim', emoji: '🍌', calories: 190, protein: 6, carbs: 22, fat: 9, ingredients: ['Banana prata assada', 'Pasta de amendoim integral', 'Canela'], type: 'balanced', tier: 'unlocked' },
  { id: 'sorvete-proteico', name: 'Sorvete Fit Proteico', emoji: '🍨', calories: 175, protein: 18, carbs: 14, fat: 4, ingredients: ['Banana congelada', 'Whey Isolate', 'Leite de amêndoas'], type: 'balanced', tier: 'unlocked' },
  { id: 'cupcake-fit', name: 'Cupcake de Cenoura Fit', emoji: '🧁', calories: 160, protein: 7, carbs: 16, fat: 5, ingredients: ['Farinha de aveia', 'Adoçante culinário', 'Cenoura ralada', 'Whey vanila'], type: 'balanced', tier: 'unlocked' },
  { id: 'acai-clean', name: 'Açaí Proteico Whey', emoji: '🍧', calories: 195, protein: 12, carbs: 24, fat: 3, ingredients: ['Polpa de açaí puro', 'Xilitol', 'Colágeno hidrolisado'], type: 'balanced', tier: 'premium' },

  // High-Calorie / High Protein (Bulking)
  { id: 'brownie-fit', name: 'Brownie de Whey Premium', emoji: '🍫', calories: 230, protein: 11, carbs: 22, fat: 10, ingredients: ['Cacau 100%', 'Ovos', 'Farinha de coco', 'Whey hidrolisado'], type: 'high-calorie', tier: 'unlocked' },
  { id: 'panqueca-doce', name: 'Panqueca Doce Whey', emoji: '🥞', calories: 260, protein: 22, carbs: 28, fat: 5, ingredients: ['Claras de ovos', 'Aveia fina', 'Banana amassada', 'Whey chocolate'], type: 'high-calorie', tier: 'unlocked' },
  { id: 'cookie-fit', name: 'Cookie Proteico Macio', emoji: '🍪', calories: 210, protein: 14, carbs: 18, fat: 8, ingredients: ['Farinha de aveia', 'Pasta de castanha', 'Albumina', 'Chocolate 80%'], type: 'high-calorie', tier: 'unlocked' },
  { id: 'waffle-honey', name: 'Waffle Fit de Mel', emoji: '🧇', calories: 275, protein: 15, carbs: 32, fat: 7, ingredients: ['Aveia', 'Mel orgânico puro', 'Queijo cottage lac-free', 'Claras'], type: 'high-calorie', tier: 'premium' },
];

export function FitnessRoulette({ profile }: { profile: UserProfile | null }) {
  // Config states
  const [objective, setObjective] = useState<'cutting' | 'balanced' | 'bulking'>('balanced');
  const [activeTab, setActiveTab] = useState<'wheel' | 'menu' | 'smart-free'>('wheel');
  const [isMuted, setIsMuted] = useState(false);

  // Gamification & Control States
  const [points, setPoints] = useState(profile?.points || 150);
  const [spinsLeft, setSpinsLeft] = useState(2);
  const [weeklyCompletedSpins, setWeeklyCompletedSpins] = useState<string[]>([]);
  const [unlockedPremium, setUnlockedPremium] = useState(false);
  const [level, setLevel] = useState(profile?.streak ? Math.min(10, Math.floor(profile.streak / 3) + 1) : 2);
  const [levelProgress, setLevelProgress] = useState(45); // percent
  
  // Animation States
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [result, setResult] = useState<Dessert | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  
  // Smart Free Day Choice State
  const [smartChoice, setSmartChoice] = useState<Dessert | null>(null);
  const [isChoosingSmart, setIsChoosingSmart] = useState(false);

  // References
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

  // Auto detect objective based on user goals
  useEffect(() => {
    if (profile?.goals) {
      const g = profile.goals.toLowerCase();
      if (g.includes('emagrecer') || g.includes('perder') || g.includes('cutting') || g.includes('defini')) {
        setObjective('cutting');
      } else if (g.includes('ganhar') || g.includes('massa') || g.includes('hipertrofia') || g.includes('bulking')) {
        setObjective('bulking');
      } else {
        setObjective('balanced');
      }
    }
  }, [profile]);

  // Filter desserts dynamically
  const filteredDesserts = ALL_DESSERTS.filter(dessert => {
    // Show premium only if unlocked or if default
    if (dessert.tier === 'premium' && !unlockedPremium) return false;
    
    if (objective === 'cutting') return dessert.type === 'light';
    if (objective === 'bulking') return dessert.type === 'high-calorie';
    return dessert.type === 'balanced' || dessert.type === 'light'; // maintenance allows both
  });

  // Sound Synth Synthesizer safely utilizing Web Audio API
  const playSound = (type: 'tick' | 'win' | 'start' | 'premium' | 'error') => {
    if (isMuted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === 'start') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } else if (type === 'win') {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Arpeggio C4 to C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
        });
      } else if (type === 'premium') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'error') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Audio Context blocked by policy:", e);
    }
  };

  // Neon Confetti Animation Loop
  const spawnConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 600;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    const colors = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e'];

    confettiParticles.current = Array.from({ length: 120 }, () => ({
      x: canvas.width / 2,
      y: canvas.height * 0.6,
      vx: (Math.random() - 0.5) * 12,
      vy: (-Math.random() * 12) - 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10
    }));

    const updatePlay = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      confettiParticles.current.forEach(p => {
        p.vy += 0.35; // Gravity
        p.vx *= 0.98; // Air resistance
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height && p.x > 0 && p.x < canvas.width) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          // draw rectangle particle
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        animationFrameId.current = requestAnimationFrame(updatePlay);
      }
    };

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    updatePlay();
  };

  // Perform Spin
  const spinTheWheel = () => {
    if (isSpinning) return;
    if (spinsLeft <= 0) {
      playSound('error');
      alert('Sem giros disponíveis! Desbloqueie giros com Pontos ou completando os desafios de dieta.');
      return;
    }

    setIsSpinning(true);
    setResult(null);
    setSmartChoice(null);
    playSound('start');

    // Determine segments and pick randomized winning segment
    const segmentCount = filteredDesserts.length;
    const chosenIndex = Math.floor(Math.random() * segmentCount);
    const degreePerSegment = 360 / segmentCount;

    // Calculate dynamic physical spin degree to match selected item
    // Note: CSS rotation starts on top or right. Let's aim clearly
    const offsetDegrees = 360 - (chosenIndex * degreePerSegment) - (degreePerSegment / 2);
    const totalSpins = 6 * 360; // 6 fully premium cycles
    const finalRotation = rotation - (rotation % 360) + totalSpins + offsetDegrees;

    setRotation(finalRotation);

    // Audio tick rate during slowing spin
    let tempTicks = 0;
    const tickInterval = setInterval(() => {
      tempTicks++;
      if (tempTicks < 25) {
        playSound('tick');
      } else {
        clearInterval(tickInterval);
      }
    }, 120);

    // Dynamic haptic vibration shake visual effect
    setTimeout(() => setShaking(true), 2000);

    setTimeout(() => {
      setIsSpinning(false);
      setShaking(false);
      clearInterval(tickInterval);

      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      const winner = filteredDesserts[chosenIndex];
      setResult(winner);
      setWeeklyCompletedSpins(prev => [...prev, winner.name]);
      setSpinsLeft(prev => prev - 1);
      
      // Gain XP progression
      setPoints(prev => prev + 30);
      setLevelProgress(prev => {
        const nextProg = prev + 25;
        if (nextProg >= 100) {
          setLevel(l => Math.min(10, l + 1));
          return nextProg - 100;
        }
        return nextProg;
      });

      playSound('win');
      setTimeout(() => {
        spawnConfetti();
        setShowResultModal(true);
      }, 300);

    }, 3200);
  };

  // Buy turn using currency points
  const buyExtraTurn = () => {
    if (points >= 50) {
      setPoints(prev => prev - 50);
      setSpinsLeft(prev => prev + 1);
      playSound('premium');
    } else {
      playSound('error');
    }
  };

  // Unlock premium desserts
  const unlockPremiumTier = () => {
    if (points >= 80) {
      setPoints(prev => prev - 80);
      setUnlockedPremium(true);
      playSound('win');
    } else {
      playSound('error');
    }
  };

  // Custom AI intelligent Free Day Dessert calculation / Suggestion
  const loadSmartAIPlan = () => {
    if (isChoosingSmart) return;
    setIsChoosingSmart(true);
    setSmartChoice(null);
    playSound('start');

    setTimeout(() => {
      // Pick dynamic best suited light or premium dessert based on target
      const targetCategory = objective === 'cutting' ? 'light' : objective === 'bulking' ? 'high-calorie' : 'balanced';
      const possible = ALL_DESSERTS.filter(d => d.type === targetCategory);
      const selected = possible[Math.floor(Math.random() * possible.length)];
      setSmartChoice(selected);
      setIsChoosingSmart(false);
      playSound('win');
      spawnConfetti();
    }, 1800);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto p-4 md:p-8 bg-slate-950/70 border border-purple-500/20 rounded-[32px] overflow-hidden backdrop-blur-xl shadow-[0_0_50px_rgba(139,92,246,0.15)] select-none">
      {/* Absolute canvas confetti overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 z-50 pointer-events-none w-full h-full" />

      {/* Header Bezel and Dashboard Details */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-purple-900/40 pb-6 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] relative">
            <Utensils className="h-7 w-7 text-white" />
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 bg-emerald-500 rounded-full border border-slate-950 items-center justify-center text-[9px] font-black text-white">2</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase bg-clip-text">
                Sobremesa Premiada
              </h2>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse">
                Fit da Semana
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Gire a roleta saudável para desbloquear doces inteligentes sem quebrar o físico!
            </p>
          </div>
        </div>

        {/* Currency tracker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="font-bold text-sm tracking-wide">{points} pts</span>
          </div>

          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className="p-2 bg-slate-850 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            title={isMuted ? "Ativar Áudio Synth" : "Mutar Áudio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-purple-400" />}
          </button>
        </div>
      </div>

      {/* Top Objective Navigation Pillbox */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8 relative z-10">
        <div className="flex gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
          <button 
            onClick={() => { setActiveTab('wheel'); setResult(null); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'wheel' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            Ativar Roleta Fit
          </button>
          
          <button 
            onClick={() => { setActiveTab('menu'); setResult(null); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'menu' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            Ver Cardápio Fit ({ALL_DESSERTS.length})
          </button>

          <button 
            onClick={() => { setActiveTab('smart-free'); setResult(null); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'smart-free' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            Dia Livre Inteligente
          </button>
        </div>

        {/* Dynamic target adaptive selector */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-[10px] text-slate-500 uppercase font-black px-2">Meta da IA:</span>
          <select 
            value={objective} 
            onChange={(e) => {
              setObjective(e.target.value as any);
              setResult(null);
            }} 
            className="bg-slate-950 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="cutting">🔥 Cutting / Dry (Low Carb)</option>
            <option value="balanced">🥗 Manutenção (Equilibrado)</option>
            <option value="bulking">💪 Bulking / Massa (Proteico+)</option>
          </select>
        </div>
      </div>

      {/* MAIN LAYOUT SECTIONS */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Interactive / Playground Pane (8 cols or full width depending) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          
          {activeTab === 'wheel' && (
            <div className="w-full flex flex-col items-center">
              
              {/* Spinning status alert */}
              <div className="text-center mb-6">
                <span className="text-sm font-semibold text-purple-300 flex items-center gap-1.5 justify-center">
                  <Flame className="w-4 h-4 text-pink-500 animate-pulse" />
                  Hoje é dia premiado! Giros Restantes: <strong className="text-white text-base px-2 py-0.5 bg-purple-500/20 rounded-md">{spinsLeft}</strong>
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Sua dieta seguida gera recompensas de forma segura.</p>
              </div>

              {/* STUNNING ROQUETA WHEEL CONSTRUCTURE */}
              <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-[350px] md:h-[350px] mb-8">
                
                {/* Outliner physical gold bezel with neon lights pulsing */}
                <div className={`absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-indigo-600 p-2 shadow-[0_0_50px_rgba(236,72,153,0.3)] ${shaking ? 'animate-bounce' : ''}`}>
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center relative overflow-hidden p-1.5">
                    
                    {/* Glowing LED bulbs around the wheel border - positioned dynamically via math percentages */}
                    {Array.from({ length: 16 }).map((_, i) => {
                      const angle = (i * 360) / 16;
                      const rad = (angle * Math.PI) / 180;
                      // Place exactly at 48.2% from center so it aligns along the inner border responsively
                      const x = 50 + 48.2 * Math.cos(rad);
                      const y = 50 + 48.2 * Math.sin(rad);
                      const isEven = i % 2 === 0;
                      return (
                        <div 
                          key={i}
                          className={`absolute w-1.5 h-1.5 rounded-full z-20 -translate-x-1/2 -translate-y-1/2 ${isEven ? 'bg-pink-400 shadow-[0_0_8px_#ec4899]' : 'bg-purple-300 shadow-[0_0_8px_#a855f7]'}`}
                          style={{
                            left: `${x}%`,
                            top: `${y}%`,
                          }}
                        />
                      );
                    })}

                    {/* Rotating Wheel body */}
                    <motion.div 
                      className="w-full h-full rounded-full relative overflow-hidden"
                      style={{ transformOrigin: 'center' }}
                      animate={{ rotate: rotation }}
                      transition={isSpinning ? { duration: 3.2, ease: [0.12, 0.8, 0.15, 1] } : { duration: 0 }}
                    >
                      {/* Inner colorful circle with geometric lines */}
                      <div className="absolute inset-0 rounded-full bg-slate-900 border-2 border-slate-800"></div>

                      {/* Perfect SVG Sectors to prevent broken clip paths or gaps */}
                      <svg viewBox="0 0 100 100" className="w-full h-full select-none overflow-hidden">
                        <defs>
                          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#1e1b4b" />
                            <stop offset="100%" stopColor="#020005" />
                          </radialGradient>
                          <linearGradient id="sliceGrad0" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#581c87" stopOpacity="0.9" />
                          </linearGradient>
                          <linearGradient id="sliceGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.75" />
                            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.9" />
                          </linearGradient>
                          <linearGradient id="sliceGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#701a75" stopOpacity="0.9" />
                          </linearGradient>
                          <linearGradient id="sliceGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
                            <stop offset="100%" stopColor="#0c1221" stopOpacity="0.9" />
                          </linearGradient>
                        </defs>

                        {/* Outer background fill */}
                        <circle cx="50" cy="50" r="50" fill="url(#centerGlow)" />

                        {filteredDesserts.map((dessert, index) => {
                          const totalSegments = filteredDesserts.length;
                          const sliceAngle = 360 / totalSegments;
                          const startAngle = index * sliceAngle;
                          
                          // Convert angles to radians (adjusting offset by -90 so index 0 starts at top)
                          const rad1 = ((startAngle - 90) * Math.PI) / 180;
                          const rad2 = ((startAngle + sliceAngle - 90) * Math.PI) / 180;
                          
                          // Outer arc point coordinates
                          const x1 = 50 + 50 * Math.cos(rad1);
                          const y1 = 50 + 50 * Math.sin(rad1);
                          const x2 = 50 + 50 * Math.cos(rad2);
                          const y2 = 50 + 50 * Math.sin(rad2);
                          
                          // Position text labels at 65% of the radius (32.5 out of 50)
                          const midAngle = startAngle + sliceAngle / 2;
                          const midRad = ((midAngle - 90) * Math.PI) / 180;
                          const tx = 50 + 32.5 * Math.cos(midRad);
                          const ty = 50 + 32.5 * Math.sin(midRad);
                          
                          const gradId = `sliceGrad${index % 4}`;

                          return (
                            <g key={dessert.id}>
                              {/* Vector Slice Sector Path */}
                              <path 
                                d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                                fill={`url(#${gradId})`}
                                stroke="rgba(168, 85, 247, 0.45)"
                                strokeWidth="0.4"
                                className="transition-all duration-300 hover:brightness-110"
                              />

                              {/* Neon border accent divider */}
                              <line 
                                x1="50" 
                                y1="50" 
                                x2={x1} 
                                y2={y1} 
                                stroke="rgba(236, 72, 153, 0.25)" 
                                strokeWidth="0.3" 
                              />
                              
                              {/* Perfectly aligned readable emoji / label group */}
                              <g transform={`translate(${tx}, ${ty}) rotate(${midAngle + 90})`}>
                                {/* Large dynamic emoji */}
                                <text 
                                  x="0" 
                                  y="1" 
                                  textAnchor="middle" 
                                  dominantBaseline="middle" 
                                  fontSize="7.5" 
                                  className="select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                                >
                                  {dessert.emoji}
                                </text>
                                
                                {/* Truncated small label */}
                                <text 
                                  x="0" 
                                  y="6" 
                                  textAnchor="middle" 
                                  dominantBaseline="middle" 
                                  fontSize="1.8" 
                                  fontWeight="900" 
                                  fill="#f3e8ff" 
                                  className="font-mono tracking-wider select-none pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] uppercase opacity-85"
                                >
                                  {dessert.name.split(' ')[0]}
                                </text>
                              </g>
                            </g>
                          );
                        })}
                      </svg>
                    </motion.div>

                    {/* Needle Indicator point at the very center (3D bubble) */}
                    <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-[0_0_20px_rgba(168,85,247,0.6)] z-30 flex items-center justify-center border-2 border-white/20">
                      <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center relative">
                        {/* Needle pin index arrow pointing exactly up */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-pink-500 rotate-45 border-t border-l border-white/30 z-30 shadow-[0_0_10px_rgba(236,72,153,0.5)]"></div>
                        <Utensils className="h-5 w-5 text-white animate-pulse" />
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Control Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                <button 
                  onClick={spinTheWheel}
                  disabled={isSpinning || spinsLeft <= 0}
                  className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-600 rounded-2xl font-black text-lg text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none uppercase tracking-wider flex items-center justify-center gap-3 border border-white/10"
                >
                  <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                  {isSpinning ? 'Girando a Vida...' : 'Girar Roleta Fit'}
                </button>

                {spinsLeft <= 0 && (
                  <button 
                    onClick={buyExtraTurn}
                    disabled={points < 50}
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
                    title="Gaste 50 pontos da sua dieta para ganhar outro giro livre e seguro!"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    Ganhar +1 Giro por 50 XP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab Menu List Cardápio Fit */}
          {activeTab === 'menu' && (
            <div className="w-full space-y-4">
              <div className="flex justify-between items-center bg-purple-950/10 border border-purple-500/20 p-4 rounded-xl">
                <div>
                  <h4 className="font-bold text-sm text-purple-300">Coleção Saudável da NutriAI</h4>
                  <p className="text-xs text-slate-400">São ao todo {ALL_DESSERTS.length} doces gourmet calculados minuciosamente.</p>
                </div>
                {!unlockedPremium ? (
                  <button 
                    onClick={unlockPremiumTier}
                    disabled={points < 80}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-black shadow-md shadow-purple-600/20 flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-40"
                  >
                    Liberar Premium (80 pts)
                  </button>
                ) : (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-black border border-emerald-500/30 px-2 py-1 rounded-lg">
                    PREMIUM LIBERADO 👑
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ALL_DESSERTS.map(dessert => (
                  <motion.div 
                    key={dessert.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${dessert.tier === 'premium' && !unlockedPremium ? 'bg-slate-900/40 border-slate-800/40 opacity-70' : 'bg-slate-900/80 border-slate-800 hover:border-purple-500/30'}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center text-2xl border border-slate-800">
                      {dessert.tier === 'premium' && !unlockedPremium ? '🔒' : dessert.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-white truncate">{dessert.name}</h4>
                        {dessert.tier === 'premium' && (
                          <span className="text-[8px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded">FIT+</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-mono">
                        <span>🔥 {dessert.calories} kcal</span>
                        <span className="text-purple-300 font-bold">💪 {dessert.protein}g P</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Free Day (Dia Livre Inteligente) tab layout */}
          {activeTab === 'smart-free' && (
            <div className="w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl" />

              <div className="flex flex-col items-center text-center max-w-lg mx-auto relative z-10">
                <Sparkles className="w-12 h-12 text-pink-400 mb-4 animate-bounce" />
                <h3 className="text-xl font-bold text-white mb-2">🔥 Dia Livre Inteligente com IA</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Sem extrapolar a gordura semanal! Nossa Inteligência Artificial monta e dimensiona uma sobremesa de alto prazer encaixada milimetricamente nos seus macros restantes de hoje.
                </p>

                <button 
                  onClick={loadSmartAIPlan}
                  disabled={isChoosingSmart}
                  className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black rounded-xl text-sm shadow-xl shadow-pink-500/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isChoosingSmart ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Dimensionando Prato...
                    </>
                  ) : (
                    <>
                      <Utensils className="w-4 h-4" />
                      Mapear Sobremesa Inteligente
                    </>
                  )}
                </button>

                {/* Intelligent display of results */}
                <AnimatePresence>
                  {smartChoice && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="mt-8 p-6 bg-slate-950 border border-pink-500/30 rounded-2xl w-full text-left"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">{smartChoice.emoji}</span>
                        <div>
                          <span className="text-[10px] text-pink-400 uppercase font-black tracking-widest font-mono">IA Aprovado para Hoje</span>
                          <h4 className="font-bold text-base text-white">{smartChoice.name}</h4>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center bg-slate-900 p-3 rounded-xl border border-slate-800/60 mb-4">
                        <div>
                          <span className="block text-[9px] text-slate-500">Calorias</span>
                          <span className="font-extrabold text-white text-xs">{smartChoice.calories}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-500">Proteínas</span>
                          <span className="font-extrabold text-emerald-400 text-xs">{smartChoice.protein}g</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-500">Carbos</span>
                          <span className="font-extrabold text-blue-400 text-xs">{smartChoice.carbs}g</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-500">Gorduras</span>
                          <span className="font-extrabold text-pink-400 text-xs">{smartChoice.fat}g</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Ingredientes & Modo de Fazer:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {smartChoice.ingredients.map((ing, i) => (
                            <span key={i} className="text-[10px] px-2 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded-md">
                              {ing}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-2 italic">
                          💡 Essa porção foi calculada para ser consumida preferencialmente após seu treino de força para maximizar a captação de glicose no músculo!
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

        </div>

        {/* Right Gamification Sidebar & Rewards Stats (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Level Progress Banner */}
          <div className="bg-gradient-to-b from-purple-900/30 to-slate-950 border border-purple-500/20 p-5 rounded-3xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-black tracking-wider text-purple-400">Nível Fitness</span>
              <Award className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-black text-white">Lvl {level}</span>
              <span className="text-xs text-slate-400 font-medium">Confeiteiro Fit</span>
            </div>

            {/* Slider bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative mb-4">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                style={{ width: `${levelProgress}%` }}
              />
            </div>

            <div className="text-[10px] text-slate-400 flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/40">
              <span>Ganhe +25 XP por cada giro</span>
              <span className="text-purple-300 font-bold">{100 - levelProgress} XP para Lvl {level + 1}</span>
            </div>
          </div>

          {/* Medalhas & Fit Badges Achieved */}
          <div className="bg-slate-900/50 border border-slate-850 p-5 rounded-3xl space-y-3">
            <h4 className="font-bold text-xs text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Award className="w-4 h-4 text-pink-400" />
              Medalhas de Doces
            </h4>
            
            <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center p-2 rounded-xl bg-slate-950 border border-slate-850 text-center" title="Completou o primeiro giro na roleta fit">
                <span className="text-lg">🍭</span>
                <span className="text-[8px] text-slate-400 font-bold mt-1 scale-90">Iniciante</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-slate-950 border border-slate-850 text-center" title="Conquistou doce após treino intenso">
                <span className="text-lg">⚡</span>
                <span className="text-[8px] text-slate-400 font-bold mt-1 scale-90">Pós-Treino</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-slate-950 border border-slate-850 text-center" title="Manteve a consistência alimentar por 1 semana">
                <span className="text-lg">🏆</span>
                <span className="text-[8px] text-slate-400 font-bold mt-1 scale-90">Blindado</span>
              </div>
              <div className={`flex flex-col items-center p-2 rounded-xl text-center border transition-all ${unlockedPremium ? 'bg-slate-950 border-purple-500/20' : 'bg-slate-950/20 border-slate-900/40 opacity-40'}`} title="Desbloqueou sobremesas do menu premium fit">
                <span className="text-lg">👑</span>
                <span className="text-[8px] text-slate-400 font-bold mt-1 scale-90">Elite</span>
              </div>
            </div>
          </div>

          {/* Historico / Weekly spin winners */}
          <div className="bg-slate-900/50 border border-slate-850 p-5 rounded-3xl space-y-3">
            <h4 className="font-bold text-xs text-slate-300 uppercase tracking-widest">
              Conquistas da Semana
            </h4>

            {weeklyCompletedSpins.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-3 text-center italic">
                Nenhuma sobremesa ganha ainda. Gire a roleta acima!
              </p>
            ) : (
              <div className="space-y-2">
                {weeklyCompletedSpins.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-white truncate font-medium">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Nutrition AI Rule Guide */}
          <div className="bg-slate-900/30 border border-indigo-900/20 p-4 rounded-2xl">
            <span className="text-[10px] text-indigo-400 uppercase font-bold block mb-1">Como Funciona a Gamificação?</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Consumir doces adaptados após o treino ajuda a recompor o glicogênio muscular de forma acelerada sem elevar a insulina de maneira prejudicial à saúde. Siga as orientações para evoluir o nível!
            </p>
          </div>

        </div>

      </div>

      {/* WIN RESULT MODAL */}
      <AnimatePresence>
        {showResultModal && result && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-gradient-to-b from-purple-900/50 to-slate-950 border border-purple-500/30 p-6 rounded-[32px] text-center shadow-[0_0_50px_rgba(168,85,247,0.5)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button 
                  onClick={() => setShowResultModal(false)}
                  className="text-slate-400 hover:text-white font-black text-sm p-1.5"
                >
                  X
                </button>
              </div>

              {/* Glowing animated visual */}
              <div className="w-20 h-20 rounded-full mx-auto bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-5xl mb-4 shadow-[0_0_25px_rgba(168,85,247,0.3)] animate-pulse">
                {result.emoji}
              </div>

              <span className="text-[10px] text-purple-300 uppercase tracking-widest font-black font-mono">
                Sua Recompensa Saudável da Semana 🍓
              </span>
              
              <h3 className="text-xl md:text-2xl font-black text-white mt-1 mb-4">
                {result.name}
              </h3>

              {/* Macro nutritional table detailed stats */}
              <div className="grid grid-cols-4 gap-2 text-center bg-slate-900/80 p-3.5 rounded-2xl border border-slate-850 mb-6 font-mono">
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase">Kcal</span>
                  <span className="font-extrabold text-white text-sm">{result.calories}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase">Prot</span>
                  <span className="font-extrabold text-emerald-400 text-sm">{result.protein}g</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase">Carb</span>
                  <span className="font-extrabold text-blue-400 text-sm">{result.carbs}g</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase">Gord</span>
                  <span className="font-extrabold text-pink-400 text-sm">{result.fat}g</span>
                </div>
              </div>

              {/* Ingredients card */}
              <div className="text-left bg-slate-900/40 p-4 rounded-xl border border-slate-850 mb-6 space-y-2">
                <span className="text-[9px] text-slate-500 uppercase font-black">Ingredientes Aprovados pela IA:</span>
                <div className="flex flex-wrap gap-1.5">
                  {result.ingredients.map((ing, k) => (
                    <span key={k} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setShowResultModal(false)}
                className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white font-extrabold text-xs active:scale-95 transition-all uppercase tracking-wider"
              >
                Adicionar ao Meu Diário de Hoje
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
