import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from "react";
import { UserProfile } from "../types";
import {
  generateAvatarImage,
  generateJourneyMessage,
} from "../lib/gemini";
import { speak, stopSpeech } from '../lib/speech';
import {
  Loader2,
  TrendingUp,
  Sparkles,
  Image as ImageIcon,
  Volume2,
  SlidersHorizontal,
  ChevronRight,
  FileText,
  Download,
  Activity,
  User,
  Eye,
  RotateCcw,
  Zap,
  Layers,
  Heart
} from "lucide-react";
import { jsPDF } from "jspdf";
import { JourneyAnalyticsDashboard } from "./JourneyAnalyticsDashboard";
import { WeeklySummary } from "./WeeklySummary";
import { GoldenWaterTip } from "./GoldenWaterTip";
import { Static3DAvatarPlaceholder } from "./Static3DAvatarPlaceholder";
import realisticSimulatorImg from "../assets/images/realistic_simulator_avatar_1789485027705.jpg";

// Lazy load the 3D Avatar component to eliminate tab-switching lag and initial load overhead
const Avatar3D = lazy(() => import("./Avatar3D"));

interface JourneyVisualizerProps {
  profile: UserProfile | null;
  onUpdateProfile?: (updated: Partial<UserProfile> | UserProfile) => void;
}

type Period = "day1" | "day7" | "day30" | "day90";

const PERIOD_LABELS = {
  day1: "Ponto de Partida",
  day7: "7 Dias",
  day30: "30 Dias",
  day90: "90 Dias",
};

// Preset realistic photogrammetric 3D renders matching gender & body goals
const DEFAULT_AVATARS_FEMALE: Record<Period, string> = {
  day1: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=800",
  day7: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=800",
  day30: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800",
  day90: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800",
};

const DEFAULT_AVATARS_MALE: Record<Period, string> = {
  day1: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800",
  day7: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800",
  day30: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800",
  day90: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800",
};

export function JourneyVisualizer({ profile, onUpdateProfile }: JourneyVisualizerProps) {
  const isFemale = profile?.gender === 'feminino';
  const defaultAvatars = isFemale ? DEFAULT_AVATARS_FEMALE : DEFAULT_AVATARS_MALE;

  const [simMode, setSimMode] = useState<'realistic' | 'biomechanic3d' | 'photomorph'>('realistic');
  
  const [images, setImages] = useState<Record<Period, string | null>>({
    day1: defaultAvatars.day1,
    day7: defaultAvatars.day7,
    day30: defaultAvatars.day30,
    day90: defaultAvatars.day90,
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [message, setMessage] = useState("A consistência diária no seu plano nutricional é o motor que molda a sua transformação corporal.");
  const [sliderValue, setSliderValue] = useState(0); // 0 to 100
  const [isPlaying, setIsPlaying] = useState(false);

  // 3D Avatar state controls
  const [avatarView, setAvatarView] = useState<'front' | 'side' | 'detail'>('front');
  const [avatarAnimation, setAvatarAnimation] = useState<'idle' | 'executing' | 'tutorial' | 'perfect'>('idle');
  const [selectedMuscleFocus, setSelectedMuscleFocus] = useState<string>('fullbody');

  const activeMuscles = useMemo(() => {
    switch (selectedMuscleFocus) {
      case 'core': return ['core', 'abs', 'obliques'];
      case 'upper': return ['chest', 'back', 'biceps', 'triceps', 'shoulders'];
      case 'lower': return ['quadriceps', 'hamstrings', 'glutes', 'calves'];
      default: return ['core', 'quadriceps', 'chest', 'back', 'glutes', 'biceps'];
    }
  }, [selectedMuscleFocus]);

  useEffect(() => {
    // When gender changes, update default avatar preview if not custom generated
    setImages(prev => ({
      day1: prev.day1?.startsWith('data:') ? prev.day1 : defaultAvatars.day1,
      day7: prev.day7?.startsWith('data:') ? prev.day7 : defaultAvatars.day7,
      day30: prev.day30?.startsWith('data:') ? prev.day30 : defaultAvatars.day30,
      day90: prev.day90?.startsWith('data:') ? prev.day90 : defaultAvatars.day90,
    }));
  }, [isFemale]);

  useEffect(() => {
    // Determine milestone message based on slider
    if (sliderValue === 0) {
      generateMessage('day1');
    } else if (sliderValue >= 30 && sliderValue <= 35) {
      generateMessage('day30');
    } else if (sliderValue === 100) {
      generateMessage('day90');
    }
  }, [sliderValue]);

  const playTTS = async (text: string) => {
    try {
      setIsPlaying(true);
      await speak(text, {
        onEnded: () => setIsPlaying(false)
      });
    } catch (e) {
      console.error("Error playing audio", e);
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    stopSpeech();
    setIsPlaying(false);
  };

  const currentStats = () => {
    const isWeightLoss = profile?.goals?.toLowerCase().includes('perda') || profile?.goals?.toLowerCase().includes('emagrecer');
    const startWeight = profile?.weight || 70;
    const endWeight = isWeightLoss ? startWeight * 0.9 : startWeight * 1.05; 
    
    const baseFat = profile?.gender === 'feminino' ? 28 : 20;
    const endFat = isWeightLoss ? baseFat - 7 : baseFat - 4;
    
    const startLean = startWeight * (1 - baseFat / 100);
    const endLean = endWeight * (1 - endFat / 100);

    const progress = sliderValue / 100;
    
    return {
      weight: (startWeight + (endWeight - startWeight) * progress).toFixed(1),
      bodyFat: (baseFat + (endFat - baseFat) * progress).toFixed(1),
      leanMass: (startLean + (endLean - startLean) * progress).toFixed(1)
    };
  };

  const getPromptForPeriod = (period: Period) => {
    if (!profile) return "";
    
    const genderStr = profile.gender === 'feminino' ? 'woman' : profile.gender === 'masculino' ? 'man' : 'person';
    const skinToneStr = profile.skinTone === 'clara' ? 'fair skin' : profile.skinTone === 'media' ? 'medium olive skin' : profile.skinTone === 'parda' ? 'brown skin' : profile.skinTone === 'escura' ? 'dark skin' : 'natural skin tone';
    const hairColorStr = profile.hairColor === 'careca' ? 'bald' : `${profile.hairColor?.replace('_', ' ')} hair`;

    const base = `Unreal Engine 5 3D render, MetaHuman style, ultra-realistic, hyper-detailed volumetric lighting, 8k resolution. A full-body 3D digital human character of a ${profile.age || 30}-year-old ${skinToneStr} ${genderStr} with ${hairColorStr}, height ${profile.height || 170}cm.`;
    
    const isWeightLoss = profile.goals?.toLowerCase().includes('perda') || profile.goals?.toLowerCase().includes('emagrecer');
    const isMuscleGain = profile.goals?.toLowerCase().includes('ganho') || profile.goals?.toLowerCase().includes('massa');

    let bodyDesc = "";
    if (period === "day1") {
      bodyDesc = `Current weight is ${profile.weight || 70}kg. Scientifically accurate representation of starting body composition. Soft natural lighting, subtle pose, wearing well-fitted neutral workout form-fitting clothes. Realistic skin texture, natural body proportions.`;
    } else if (period === "day7") {
      bodyDesc = `After 7 days of consistent nutrition. Very subtle changes, mostly postural improvement and slight reduction in water retention. Weight is approx ${(profile.weight || 70) - (isWeightLoss ? 1 : 0)}kg. Confident stance, same workout form-fitting clothes, clear lighting.`;
    } else if (period === "day30") {
      bodyDesc = `After 30 days of consistent healthy eating and ${profile.activityLevel || 'moderate'} activity. Noticeable reduction in body fat by approx 2-3%. ${isMuscleGain ? 'Early signs of muscle tone and definition.' : 'Slightly slimmer silhouette.'} Improved skin glow. Confident posture, same workout form-fitting clothes, cinematic rim lighting.`;
    } else if (period === "day90") {
      bodyDesc = `After 90 days of dedicated nutrition and exercise. Significant visual transformation but scientifically realistic. Total body fat reduced by approx 6-8%. ${isMuscleGain ? 'Clear muscle definition, athletic build.' : 'Lean, fit, and toned physique.'} Radiant health, powerful posture, same workout form-fitting clothes. Premium 4k sharp details, volumetric lighting.`;
    }

    return `${base} ${bodyDesc} Ensure physiological realism, no exaggerated proportions. Clean minimalist studio background. The character must be facing forward in the same exact pose across all periods.`;
  };

  const loadDataForPeriod = async (period: Period): Promise<string | null> => {
    if (!profile) return null;
    try {
      const prompt = getPromptForPeriod(period);
      const imgBase64 = await generateAvatarImage(prompt);
      
      if (imgBase64) {
        setImages(prev => ({ ...prev, [period]: imgBase64 }));
        return imgBase64;
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  };

  const generateFullSimulation = async () => {
    setIsGenerating(true);
    setSliderValue(0);
    stopAudio();

    try {
      setGenerationStep("Renderizando Dia 1 (Ponto de Partida)...");
      await loadDataForPeriod('day1');
      
      setGenerationStep("Renderizando Dia 7 (Primeiros Efeitos)...");
      await loadDataForPeriod('day7');
      
      setGenerationStep("Renderizando Dia 30 (Evolução Visível)...");
      await loadDataForPeriod('day30');
      
      setGenerationStep("Renderizando Dia 90 (Metamorfose)...");
      await loadDataForPeriod('day90');
      
      generateMessage('day1');
    } catch (error) {
       console.error("Simulation failed", error);
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  const generateMessage = async (period: Period) => {
    if (!profile) return;
    const msg = await generateJourneyMessage(profile, PERIOD_LABELS[period]);
    if (msg) setMessage(msg);
  };

  const handleGeneratePDF = () => {
    if (!profile) return;

    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');
    
    const startWeight = profile.weight || 70;
    const isWeightLoss = profile.goals?.toLowerCase().includes('perda') || profile.goals?.toLowerCase().includes('emagrecer');
    const endWeight = isWeightLoss ? startWeight * 0.9 : startWeight * 1.05;
    
    const baseFat = profile.gender === 'feminino' ? 28 : 20;
    const endFat = isWeightLoss ? baseFat - 7 : baseFat - 4;
    
    const startLean = startWeight * (1 - baseFat / 100);
    const endLean = endWeight * (1 - endFat / 100);

    // Decorative Header bar
    doc.setFillColor(5, 150, 105);
    doc.rect(15, 12, 180, 2, 'F');

    // Title Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Relatorio de Evolucao Corporal - NutriAI', 15, 24);
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Simulacao de 90 dias com projecao de metas e composicao corporal', 15, 30);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Gerado em: ${today}`, 160, 24);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 35, 195, 35);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(5, 150, 105);
    doc.text('1. Informacoes do Perfil do Usuario', 15, 43);

    const nameStr = profile.name || 'Usuario NutriAI';
    const ageStr = profile.age ? `${profile.age} anos` : '30 anos';
    const genderStr = profile.gender ? (profile.gender === 'masculino' ? 'Masculino' : 'Feminino') : 'Nao informado';
    const weightStr = `${startWeight.toFixed(1)} kg`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nome: ${nameStr}`, 15, 50);
    doc.text(`Idade: ${ageStr}`, 75, 50);
    doc.text(`Genero: ${genderStr}`, 135, 50);

    doc.text(`Peso Atual: ${weightStr}`, 15, 57);
    doc.text(`Meta Nutricional: ${profile.goals || 'Manter Saude e Forma'}`, 75, 57);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 63, 195, 63);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(5, 150, 105);
    doc.text('2. Projecao Estimada de Composicao Corporal (90 Dias)', 15, 71);

    doc.setFillColor(241, 245, 249);
    doc.rect(15, 78, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('Periodo', 20, 83.5);
    doc.text('Peso Projetado', 65, 83.5);
    doc.text('Gordura Corporal %', 110, 83.5);
    doc.text('Massa Magra Est.', 155, 83.5);

    const milestones = [
      { label: 'Dia 1 (Ponto Inicial)', p: 0 },
      { label: 'Dia 7 (Adaptacao Inicial)', p: 0.077 },
      { label: 'Dia 30 (Resultado Visivel)', p: 0.333 },
      { label: 'Dia 90 (Metamorfose)', p: 1.0 }
    ];

    let currentY = 86;
    milestones.forEach((m, idx) => {
      const pW = (startWeight + (endWeight - startWeight) * m.p).toFixed(1);
      const pF = (baseFat + (endFat - baseFat) * m.p).toFixed(1);
      const pL = (startLean + (endLean - startLean) * m.p).toFixed(1);

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, 8, 'F');
      }

      doc.setFont('helvetica', idx === 3 ? 'bold' : 'normal');
      doc.setTextColor(idx === 3 ? 5 : 51, idx === 3 ? 150 : 65, idx === 3 ? 105 : 85);
      
      doc.text(m.label, 20, currentY + 5.5);
      doc.text(`${pW} kg`, 65, currentY + 5.5);
      doc.text(`${pF} %`, 110, currentY + 5.5);
      doc.text(`${pL} kg`, 155, currentY + 5.5);

      doc.line(15, currentY + 8, 195, currentY + 8);
      currentY += 8;
    });

    // Save File
    doc.save(`NutriAI-Evolucao-${nameStr.replace(/\s+/g, '-')}.pdf`);
  };

  const { weight, bodyFat, leanMass } = currentStats();

  const opacities = {
    day1: Math.max(0, 1 - (sliderValue / 33)),
    day7: sliderValue <= 33 ? (sliderValue / 33) : Math.max(0, 1 - ((sliderValue - 33) / 33)),
    day30: sliderValue <= 33 ? 0 : sliderValue <= 66 ? ((sliderValue - 33) / 33) : Math.max(0, 1 - ((sliderValue - 66) / 34)),
    day90: Math.max(0, (sliderValue - 66) / 34)
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-3 sm:px-4 md:px-6">
      
      {/* Centered Main Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-3 mb-8 sm:mb-10 px-2 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-bold tracking-wide">
          <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>Simulador 3D & Projeção Biométrica</span>
        </div>
        
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-emerald-800 dark:text-emerald-400 flex items-center justify-center gap-3">
          Simulador 3D
        </h2>
        
        <p className="font-sans text-slate-600 dark:text-slate-300 max-w-2xl mx-auto text-sm sm:text-base md:text-lg leading-relaxed">
          Visualize a transformação do seu corpo em tempo real. Alterne entre o avatar biomecânico interativo 3D e a projeção fotográfica progressiva de 90 dias.
        </p>
      </div>

      {/* Centered Mode Switcher Pill */}
      <div className="flex items-center justify-center p-1.5 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full mb-8 max-w-xl w-full mx-auto border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
        <button
          type="button"
          onClick={() => setSimMode('realistic')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer select-none ${
            simMode === 'realistic'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Avatar Realista</span>
        </button>

        <button
          type="button"
          onClick={() => setSimMode('biomechanic3d')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer select-none ${
            simMode === 'biomechanic3d'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Avatar 3D</span>
        </button>

        <button
          type="button"
          onClick={() => setSimMode('photomorph')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer select-none ${
            simMode === 'photomorph'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Metamorfose 90D</span>
        </button>
      </div>

      {/* Main Centered Stage Card */}
      <div className="w-full bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-3xl p-5 sm:p-7 md:p-8 rounded-[28px] sm:rounded-[36px] shadow-2xl border border-white/60 dark:border-slate-800/80 relative overflow-hidden flex flex-col items-center justify-center">
        
        {/* Assistant Audio Speech Bubble */}
        {message && (
          <div className="w-full max-w-2xl flex items-center justify-center gap-4 bg-emerald-50/70 dark:bg-emerald-950/30 backdrop-blur-md border border-emerald-200/60 dark:border-emerald-800/40 p-4 sm:p-5 rounded-[24px] mb-8 shadow-sm mx-auto">
            <button 
              onClick={() => isPlaying ? stopAudio() : playTTS(message)}
              title={isPlaying ? "Pausar voz" : "Ouvir dica da Malu"}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md border border-emerald-100 dark:border-slate-700/50 cursor-pointer ${isPlaying ? 'animate-pulse ring-4 ring-emerald-300' : 'hover:scale-105 transition-transform'}`}
            >
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="text-left flex-1">
              <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">Assistente Malu</p>
              <p className="font-sans text-slate-700 dark:text-slate-200 font-medium italic text-sm sm:text-base leading-relaxed">"{message}"</p>
            </div>
          </div>
        )}

        {/* MODE 0: Photorealistic 3D Fitness Avatar */}
        {simMode === 'realistic' && (
          <div className="w-full flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
            
            {/* Focus Controls */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setSelectedMuscleFocus('fullbody')}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${selectedMuscleFocus === 'fullbody' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Corpo Inteiro
              </button>
              <button
                onClick={() => setSelectedMuscleFocus('core')}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${selectedMuscleFocus === 'core' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Core & Abdômen
              </button>
              <button
                onClick={() => setSelectedMuscleFocus('upper')}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${selectedMuscleFocus === 'upper' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Superior & Ombros
              </button>
              <button
                onClick={() => setSelectedMuscleFocus('lower')}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${selectedMuscleFocus === 'lower' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Inferior & Coxas
              </button>
            </div>

            {/* Realistic Stage Viewport */}
            <div className="w-full max-w-2xl min-h-[420px] sm:min-h-[480px] bg-gradient-to-b from-[#09101d] via-[#040810] to-[#020408] rounded-[28px] sm:rounded-[36px] border border-emerald-500/30 p-4 sm:p-6 relative overflow-hidden flex flex-col items-center justify-center shadow-2xl">
              {/* Cyan biometric scanning ring */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
              
              {/* Top floating biometric status badge */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-400/40 text-xs font-bold text-emerald-400 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Biometria HD Ativa</span>
              </div>

              <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-blue-400/40 text-xs font-bold text-blue-400 shadow-lg">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                <span>Simetria: 98.4%</span>
              </div>

              {/* Realistic Avatar Image & Overlays */}
              <div className="relative z-10 flex items-center justify-center py-2">
                <img
                  src={realisticSimulatorImg}
                  alt="Avatar Realista 3D"
                  className="max-h-[360px] sm:max-h-[420px] w-auto object-contain drop-shadow-[0_0_40px_rgba(56,189,248,0.35)] rounded-2xl"
                  referrerPolicy="no-referrer"
                />

                {/* Laser Scanning Line Animation */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse pointer-events-none" />
              </div>

              {/* Bottom Projection Label */}
              <div className="absolute bottom-4 inset-x-0 flex justify-center px-4 pointer-events-none z-10">
                <div className="bg-slate-950/85 backdrop-blur-md px-5 py-2 rounded-2xl border border-slate-700/80 shadow-xl flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-white text-xs sm:text-sm font-black uppercase tracking-wider">
                    Projeção Anatômica Realista • Hipertrofia & Definição
                  </span>
                </div>
              </div>
            </div>

            {/* Centered Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mx-auto">
              <div className="bg-slate-50/90 dark:bg-slate-800/80 p-5 rounded-[24px] border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-400 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Peso de Referência</span>
                </div>
                <p className="text-3xl sm:text-4xl font-serif text-slate-800 dark:text-slate-100 tracking-tight">
                  {profile?.weight || 70} <span className="text-lg text-slate-400">kg</span>
                </p>
              </div>

              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-5 rounded-[24px] border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Gordura Estimada</span>
                </div>
                <p className="text-3xl sm:text-4xl font-serif text-emerald-800 dark:text-emerald-300 tracking-tight">
                  {isFemale ? '26.5' : '18.0'} <span className="text-lg text-emerald-500">%</span>
                </p>
              </div>

              <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-5 rounded-[24px] border border-indigo-200/60 dark:border-indigo-800/40 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 mb-1">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Massa Magra</span>
                </div>
                <p className="text-3xl sm:text-4xl font-serif text-indigo-800 dark:text-indigo-300 tracking-tight">
                  {((profile?.weight || 70) * (isFemale ? 0.735 : 0.82)).toFixed(1)} <span className="text-lg text-indigo-500">kg</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MODE 1: Interactive Three.js 3D Avatar Simulator */}
        {simMode === 'biomechanic3d' && (
          <div className="w-full flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
            
            {/* View and Focus Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full max-w-xl mx-auto">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  onClick={() => setAvatarView('front')}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${avatarView === 'front' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'}`}
                >
                  Frontal
                </button>
                <button
                  onClick={() => setAvatarView('side')}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${avatarView === 'side' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'}`}
                >
                  Lateral
                </button>
                <button
                  onClick={() => setAvatarView('detail')}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${avatarView === 'detail' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'}`}
                >
                  Detalhes
                </button>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  onClick={() => setSelectedMuscleFocus('fullbody')}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${selectedMuscleFocus === 'fullbody' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Corpo Inteiro
                </button>
                <button
                  onClick={() => setSelectedMuscleFocus('core')}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${selectedMuscleFocus === 'core' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Core & Abdômen
                </button>
                <button
                  onClick={() => setSelectedMuscleFocus('upper')}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${selectedMuscleFocus === 'upper' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Superior
                </button>
                <button
                  onClick={() => setSelectedMuscleFocus('lower')}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${selectedMuscleFocus === 'lower' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Inferior
                </button>
              </div>
            </div>

            {/* Centered Three.js 3D Canvas Box with Lazy Loading and Biometric Scan Placeholder */}
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center">
              <Suspense
                fallback={
                  <Static3DAvatarPlaceholder
                    title="Modelo 3D Biomecânico"
                    subtitle="Carregando malha 3D e renderizador WebGL..."
                    heightClass="min-h-[420px]"
                  />
                }
              >
                <Avatar3D 
                  activeMuscles={activeMuscles}
                  animation={avatarAnimation}
                  view={avatarView}
                  playbackSpeed={1}
                />
              </Suspense>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-center">
                Arraste com o dedo ou mouse para girar 360° e inspecionar a estrutura biomecânica.
              </p>
            </div>

            {/* Centered Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mx-auto">
              <div className="bg-slate-50/90 dark:bg-slate-800/80 p-5 rounded-[24px] border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-400 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Peso de Referência</span>
                </div>
                <p className="text-3xl sm:text-4xl font-serif text-slate-800 dark:text-slate-100 tracking-tight">
                  {profile?.weight || 70} <span className="text-lg text-slate-400">kg</span>
                </p>
              </div>

              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-5 rounded-[24px] border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Gordura Estimada</span>
                </div>
                <p className="text-3xl sm:text-4xl font-serif text-emerald-800 dark:text-emerald-300 tracking-tight">
                  {isFemale ? '26.5' : '18.0'} <span className="text-lg text-emerald-500">%</span>
                </p>
              </div>

              <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-5 rounded-[24px] border border-indigo-200/60 dark:border-indigo-800/40 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 mb-1">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Massa Magra</span>
                </div>
                <p className="text-3xl sm:text-4xl font-serif text-indigo-800 dark:text-indigo-300 tracking-tight">
                  {((profile?.weight || 70) * (isFemale ? 0.735 : 0.82)).toFixed(1)} <span className="text-lg text-indigo-500">kg</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: Photomorphic 90-Day IA Progression */}
        {simMode === 'photomorph' && (
          <div className="w-full flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
            
            {/* Loading AI State */}
            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-16 space-y-6 max-w-md mx-auto px-4 text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-30 rounded-full animate-pulse"></div>
                  <Loader2 className="w-14 h-14 animate-spin text-emerald-600 relative z-10" />
                </div>
                <div>
                  <p className="text-emerald-800 dark:text-emerald-400 font-serif font-bold text-xl mb-2">{generationStep}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">Calculando proporções musculares e renderizando projeção corporal hiper-realista...</p>
                </div>
              </div>
            )}

            {!isGenerating && (
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-center justify-center w-full max-w-4xl mx-auto">
                
                {/* Left: Real-time Stats Cards */}
                <div className="flex w-full lg:w-1/3 flex-col gap-4">
                  <div className="bg-slate-50/90 dark:bg-slate-800/80 p-5 rounded-[24px] border border-slate-200/60 dark:border-slate-700/60 shadow-sm flex flex-col items-center text-center">
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-400 mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Peso na Linha do Tempo</span>
                    </div>
                    <p className="text-4xl font-serif text-slate-800 dark:text-slate-100 tracking-tight">{weight} <span className="text-xl text-slate-400">kg</span></p>
                  </div>

                  <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-5 rounded-[24px] border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm flex flex-col items-center text-center">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Gordura Corporal</span>
                    </div>
                    <p className="text-4xl font-serif text-emerald-800 dark:text-emerald-300 tracking-tight">{bodyFat} <span className="text-xl text-emerald-500">%</span></p>
                  </div>

                  <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-5 rounded-[24px] border border-indigo-200/60 dark:border-indigo-800/40 shadow-sm flex flex-col items-center text-center">
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 mb-1">
                      <ImageIcon className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Massa Magra Est.</span>
                    </div>
                    <p className="text-4xl font-serif text-indigo-800 dark:text-indigo-300 tracking-tight">{leanMass} <span className="text-xl text-indigo-500">kg</span></p>
                  </div>
                </div>

                {/* Center: Morphing Avatar Container */}
                <div className="w-full lg:w-2/3 flex flex-col items-center justify-center">
                  <div className="relative rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl border-[6px] border-white dark:border-slate-800 aspect-[3/4] w-full max-w-sm bg-stone-100 dark:bg-slate-900 ring-1 ring-slate-900/5 dark:ring-white/5 mx-auto">
                    <img src={images.day1!} alt="Dia 1" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-150" style={{ opacity: opacities.day1 }} />
                    <img src={images.day7!} alt="Dia 7" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-150" style={{ opacity: opacities.day7 }} />
                    <img src={images.day30!} alt="Dia 30" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-150" style={{ opacity: opacities.day30 }} />
                    <img src={images.day90!} alt="Dia 90" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-150" style={{ opacity: opacities.day90 }} />
                    
                    <div className="absolute top-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur text-emerald-700 dark:text-emerald-400 px-3.5 py-1.5 rounded-full text-[11px] font-bold shadow-md border border-emerald-100 dark:border-slate-800 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      SIMULAÇÃO 90 DIAS
                    </div>
                  </div>

                  {/* Centered Timeline Slider */}
                  <div className="w-full max-w-sm mt-8 bg-slate-50/90 dark:bg-slate-800/90 shadow-sm border border-slate-200/80 dark:border-slate-700 p-5 rounded-[28px] mx-auto flex flex-col items-center">
                    <div className="flex justify-between w-full text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 px-1">
                      <span className={sliderValue < 20 ? 'text-emerald-600 font-black' : ''}>Dia 1</span>
                      <span className={sliderValue >= 20 && sliderValue < 50 ? 'text-emerald-600 font-black' : ''}>7 Dias</span>
                      <span className={sliderValue >= 50 && sliderValue < 85 ? 'text-emerald-600 font-black' : ''}>30 Dias</span>
                      <span className={sliderValue >= 85 ? 'text-emerald-600 font-black' : ''}>90 Dias</span>
                    </div>

                    <div className="relative w-full flex items-center h-10">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full shadow-inner"></div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sliderValue}
                        onChange={(e) => setSliderValue(Number(e.target.value))}
                        className="w-full h-2.5 bg-transparent appearance-none cursor-pointer absolute z-20 outline-none
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(16,185,129,0.5)] [&::-webkit-slider-thumb]:transition-all hover:[&::-webkit-slider-thumb]:scale-110"
                      />
                    </div>
                  </div>

                  {/* AI Re-generation Action Button */}
                  <button
                    onClick={generateFullSimulation}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Gerar Nova Projeção Personalizada IA</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Centered Actions Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto mt-10 pt-8 border-t border-slate-200/70 dark:border-slate-800">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-6 rounded-[28px] shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-1 text-center w-full flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/50 flex items-center justify-center border border-emerald-400">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <h4 className="font-serif text-lg font-bold">Ajustar meu plano</h4>
            <p className="text-emerald-100 text-xs font-sans max-w-xs mx-auto">Reajuste calorias e metas para acelerar sua transformação corporal.</p>
          </button>

          <button 
            onClick={handleGeneratePDF} 
            className="bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 p-6 rounded-[28px] shadow-md shadow-black/5 transition-all hover:-translate-y-1 text-center w-full border border-slate-200/80 dark:border-slate-700 flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/40">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="font-serif text-lg font-bold">Relatório PDF</h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-sans max-w-xs mx-auto">Baixe o resumo da evolução projetada em documento oficial PDF.</p>
          </button>
        </div>

      </div>

      {/* Dashboard Integrado da Jornada: Evolução do Peso, Hidratação & Nutrição */}
      <div className="w-full mt-10">
        <JourneyAnalyticsDashboard profile={profile} onUpdateProfile={onUpdateProfile} />
      </div>

      {/* Seção Semanal: Resumo Consolidado & Dica de Ouro de Hidratação lado a lado */}
      <div className="w-full mt-8 grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">
        <WeeklySummary profile={profile} onUpdateProfile={onUpdateProfile} />
        <GoldenWaterTip profile={profile} onUpdateProfile={onUpdateProfile} />
      </div>

    </div>
  );
}
