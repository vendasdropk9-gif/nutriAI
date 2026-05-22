import React, { useState, useEffect, useRef } from "react";
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
  ChevronRight
} from "lucide-react";

interface JourneyVisualizerProps {
  profile: UserProfile | null;
}

type Period = "day1" | "day7" | "day30" | "day90";

const PERIOD_LABELS = {
  day1: "Ponto de Partida",
  day7: "7 Dias",
  day30: "30 Dias",
  day90: "90 Dias",
};

export function JourneyVisualizer({ profile }: JourneyVisualizerProps) {
  const [images, setImages] = useState<Record<Period, string | null>>({
    day1: null,
    day7: null,
    day30: null,
    day90: null,
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sliderValue, setSliderValue] = useState(0); // 0 to 100
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Determine milestone message based on slider
    if (sliderValue === 0 && images.day1) {
      if (message === "" || message.includes("Dias")) generateMessage('day1');
    } else if (sliderValue > 30 && sliderValue < 35 && images.day30) {
       generateMessage('day30');
    } else if (sliderValue === 100 && images.day90) {
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

  const getPromptForPeriod = (period: Period) => {
    if (!profile) return "";
    
    // Base attributes
    const genderStr = profile.gender === 'feminino' ? 'woman' : profile.gender === 'masculino' ? 'man' : 'person';
    const skinToneStr = profile.skinTone === 'clara' ? 'fair skin' : profile.skinTone === 'media' ? 'medium olive skin' : profile.skinTone === 'parda' ? 'brown skin' : profile.skinTone === 'escura' ? 'dark skin' : 'natural skin tone';
    const hairColorStr = profile.hairColor === 'careca' ? 'bald' : `${profile.hairColor?.replace('_', ' ')} hair`;

    const base = `Unreal Engine 5 3D render, MetaHuman style, ultra-realistic, hyper-detailed volumetric lighting, 8k resolution. A full-body 3D digital human character of a ${profile.age || 30}-year-old ${skinToneStr} ${genderStr} with ${hairColorStr}, height ${profile.height || 170}cm.`;
    
    // Determine goal context
    const isWeightLoss = profile.goals?.toLowerCase().includes('perda') || profile.goals?.toLowerCase().includes('emagrecer');
    const isMuscleGain = profile.goals?.toLowerCase().includes('ganho') || profile.goals?.toLowerCase().includes('massa');

    let bodyDesc = "";
    
    if (period === "day1") {
      bodyDesc = `Current weight is ${profile.weight || 70}kg. Scientifically accurate representation of starting body composition. Soft natural lighting, subtle pose, wearing well-fitted neutral workout form-fitting clothes. Realistic skin texture, natural body proportions.`;
    } 
    else if (period === "day7") {
      bodyDesc = `After 7 days of consistent nutrition. Very subtle changes, mostly postural improvement and slight reduction in water retention. Weight is approx ${(profile.weight || 70) - (isWeightLoss ? 1 : 0)}kg. Confident stance, same workout form-fitting clothes, clear lighting.`;
    }
    else if (period === "day30") {
      bodyDesc = `After 30 days of consistent healthy eating and ${profile.activityLevel || 'moderate'} activity. Noticeable reduction in body fat by approx 2-3%. ${isMuscleGain ? 'Early signs of muscle tone and definition.' : 'Slightly slimmer silhouette.'} Improved skin glow. Confident posture, same workout form-fitting clothes, cinematic rim lighting.`;
    }
    else if (period === "day90") {
      bodyDesc = `After 90 days of dedicated nutrition and exercise. Significant visual transformation but scientifically realistic. Total body fat reduced by approx 6-8%. ${isMuscleGain ? 'Clear muscle definition, athletic build.' : 'Lean, fit, and toned physique.'} Radiant health, powerful posture, same workout form-fitting clothes. Premium 4k sharp details, volumetric lighting.`;
    }

    return `${base} ${bodyDesc} Ensure physiological realism, no exaggerated proportions. Clean minimalist studio background. The character must be facing forward in the same exact pose across all periods.`;
  };

  const currentStats = () => {
    const isWeightLoss = profile?.goals?.toLowerCase().includes('perda') || profile?.goals?.toLowerCase().includes('emagrecer');
    const startWeight = profile?.weight || 70;
    const endWeight = isWeightLoss ? startWeight * 0.9 : startWeight * 1.05; 
    
    const baseFat = profile?.gender === 'feminino' ? 28 : 20;
    const endFat = isWeightLoss ? baseFat - 7 : baseFat - 4;
    
    const startLean = startWeight * (1 - baseFat/100);
    const endLean = endWeight * (1 - endFat/100);

    const progress = sliderValue / 100;
    
    return {
      weight: (startWeight + (endWeight - startWeight) * progress).toFixed(1),
      bodyFat: (baseFat + (endFat - baseFat) * progress).toFixed(1),
      leanMass: (startLean + (endLean - startLean) * progress).toFixed(1)
    };
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
      console.error(e);
    }
    return null;
  };

  const generateFullSimulation = async () => {
    if (!profile || !profile.gender || !profile.weight || !profile.height) {
      alert("Por favor, preencha peso, altura e gênero no Perfil primeiro para gerar o avatar.");
      return;
    }

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
    setMessage(msg);
  };

  const hasRequiredData = profile?.gender && profile?.weight && profile?.height && profile?.age;

  if (!hasRequiredData) {
    return (
      <div className="max-w-4xl mx-auto text-center space-y-4 py-20 px-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
          <ImageIcon className="w-10 h-10" />
        </div>
        <h2 className="font-serif text-3xl font-medium text-emerald-800 dark:text-emerald-400">Complete seu Perfil</h2>
        <p className="text-slate-500 dark:text-slate-400 font-sans max-w-md mx-auto">
          Para a IA criar sua projeção corporal hiper-realista, precisamos estimar suas medidas iniciais pela aba Perfil.
        </p>
      </div>
    );
  }

  const { weight, bodyFat, leanMass } = currentStats();
  const allGenerated = images.day1 && images.day7 && images.day30 && images.day90;

  // Determine opacities based on slider value (0 to 100)
  // 0 = day1, 33 = day7, 66 = day30, 100 = day90
  const opacities = {
    day1: Math.max(0, 1 - (sliderValue / 33)),
    day7: sliderValue <= 33 ? (sliderValue / 33) : Math.max(0, 1 - ((sliderValue - 33) / 33)),
    day30: sliderValue <= 33 ? 0 : sliderValue <= 66 ? ((sliderValue - 33) / 33) : Math.max(0, 1 - ((sliderValue - 66) / 34)),
    day90: Math.max(0, (sliderValue - 66) / 34)
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      <div className="text-center space-y-4 mb-10 px-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-800 dark:text-emerald-400 flex items-center justify-center gap-3">
          <Sparkles className="w-8 h-8 text-emerald-500" />
          Projeção 3D Inteligente
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
          Visualize seu futuro físico antes mesmo de começar. A Inteligência Artificial processa seus dados nutricionais e simula a evolução realista do seu corpo.
        </p>
      </div>

      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-3xl p-6 md:p-8 rounded-[36px] shadow-2xl border border-white dark:border-slate-700/50 dark:border-slate-700/50 relative overflow-hidden">
        
        {/* Assistant Message Bubble */}
        {message && allGenerated && (
          <div className="flex items-center gap-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-emerald-100 dark:border-emerald-800/30 p-5 rounded-[24px] mb-8 shadow-sm">
            <button 
              onClick={() => playTTS(message)}
              className={`w-14 h-14 rounded-full shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md border border-emerald-50 dark:border-slate-700/50 ${isPlaying ? 'animate-pulse ring-4 ring-emerald-200' : 'hover:scale-105 transition-transform'}`}
            >
              <Volume2 className="w-6 h-6" />
            </button>
            <div>
              <p className="font-sans text-emerald-800 dark:text-emerald-400 font-medium italic text-lg opacity-90">"{message}"</p>
            </div>
          </div>
        )}

        {/* Generate Initial State */}
        {!isGenerating && !allGenerated && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="relative mb-8">
               <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-20 rounded-full"></div>
               <div className="w-32 h-32 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-2xl relative border border-white dark:border-slate-700/50">
                  <Sparkles className="w-14 h-14 text-emerald-500" />
               </div>
             </div>
             
             <h3 className="text-3xl font-serif text-slate-800 dark:text-slate-100 mb-4">Simulação Evolutiva</h3>
             <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-md text-lg leading-relaxed">Nossa tecnologia MetaHuman gera automaticamente um Avatar 3D hiper-realista que reflete seu estado atual e sua incrível transformação nos próximos 90 dias.</p>
             <button
               onClick={generateFullSimulation}
               className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-full font-medium text-lg transition-all shadow-xl shadow-emerald-500/30 hover:-translate-y-1 hover:shadow-emerald-500/40 flex items-center gap-3"
             >
               Iniciar Simulação 3D (Tempo Real)
               <ChevronRight className="w-5 h-5" />
             </button>
          </div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-32 space-y-8">
             <div className="relative">
               <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-30 rounded-full animate-pulse"></div>
               <Loader2 className="w-16 h-16 animate-spin text-emerald-600 relative z-10" />
             </div>
             <div className="text-center">
               <p className="text-emerald-800 dark:text-emerald-400 font-serif font-medium text-2xl mb-3">{generationStep}</p>
               <p className="text-emerald-700/70 dark:text-emerald-400/70 font-sans max-w-sm mx-auto">Calculando métricas corporais, ajustando proporções musculares, fotogrametria e renderizando tecidos estáticos em 8K...</p>
             </div>
          </div>
        )}

        {/* 3D Morphing View */}
        {!isGenerating && allGenerated && (
          <div className="flex flex-col lg:flex-row gap-10 items-center justify-center animate-in zoom-in-95 duration-1000">
             
             {/* Stats Cards */}
             <div className="flex w-full lg:w-1/4 flex-col gap-5">
                <div className="bg-white/80 dark:bg-slate-800/80 p-6 rounded-[28px] border border-white dark:border-slate-700/50 shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-2">
                     <TrendingUp className="w-4 h-4" />
                     <p className="text-sm font-semibold uppercase tracking-wider">Peso Estimado</p>
                  </div>
                  <p className="text-5xl font-serif text-slate-800 dark:text-slate-100 tracking-tight">{weight} <span className="text-2xl text-slate-400">kg</span></p>
                </div>
                <div className="bg-emerald-50/90 dark:bg-emerald-900/40 p-6 rounded-[28px] border border-emerald-100 dark:border-emerald-800/30 shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 text-emerald-500/70 mb-2">
                     <Sparkles className="w-4 h-4" />
                     <p className="text-sm font-semibold uppercase tracking-wider">Gordura Corporal</p>
                  </div>
                  <p className="text-5xl font-serif text-emerald-800 dark:text-emerald-400 tracking-tight">{bodyFat} <span className="text-2xl text-emerald-500">%</span></p>
                </div>
                <div className="bg-indigo-50/90 dark:bg-indigo-900/40 p-6 rounded-[28px] border border-indigo-100 dark:border-indigo-800/30 shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 text-indigo-500/70 mb-2">
                     <ImageIcon className="w-4 h-4" />
                     <p className="text-sm font-semibold uppercase tracking-wider">Massa Magra</p>
                  </div>
                  <p className="text-5xl font-serif text-indigo-800 dark:text-indigo-400 tracking-tight">{leanMass} <span className="text-2xl text-indigo-500">kg</span></p>
                </div>
             </div>

             {/* Morphing Avatar Container */}
             <div className="w-full lg:w-2/4 flex flex-col items-center">
               <div className="relative rounded-[40px] clay-card overflow-hidden shadow-2xl border-[6px] border-white dark:border-slate-800 dark:border-slate-700/50 aspect-[3/4] w-full max-w-md bg-stone-100 dark:bg-slate-900 ring-1 ring-slate-900/5 dark:ring-white/5">
                 {/* Images are superimposed, opacity controlled by slider */}
                 <img src={images.day1!} alt="Dia 1" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: opacities.day1 }} />
                 <img src={images.day7!} alt="Dia 7" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: opacities.day7 }} />
                 <img src={images.day30!} alt="Dia 30" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: opacities.day30 }} />
                 <img src={images.day90!} alt="Dia 90" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: opacities.day90 }} />
                 
                 <div className="absolute top-5 left-5 bg-white/95 dark:bg-slate-800/95 backdrop-blur text-emerald-800 dark:text-emerald-400 px-4 py-2 rounded-full text-xs font-bold shadow-md border border-emerald-50 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   SIMULAÇÃO 3D EM TEMPO REAL
                 </div>
               </div>
               
               {/* Timeline Slider */}
               <div className="w-full max-w-md mt-12 bg-white/80 dark:bg-slate-800/80 shadow-sm border border-slate-100 dark:border-slate-700 p-6 rounded-[32px] clay-card">
                 <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-5 px-1">
                   <span>Dia 1</span>
                   <span>7 Dias</span>
                   <span>30 Dias</span>
                   <span className="text-emerald-600">90 Dias</span>
                 </div>
                 <div className="relative w-full flex items-center h-12">
                   <div className="absolute inset-0 flex items-center">
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full shadow-inner border border-slate-200/50 dark:border-slate-700"></div>
                   </div>
                   <input
                     type="range"
                     min="0"
                     max="100"
                     value={sliderValue}
                     onChange={(e) => setSliderValue(Number(e.target.value))}
                     className="w-full h-3 bg-transparent appearance-none cursor-pointer absolute z-20 outline-none
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(16,185,129,0.5)] [&::-webkit-slider-thumb]:transition-all hover:[&::-webkit-slider-thumb]:scale-110"
                   />
                 </div>
               </div>
             </div>

             {/* Actions */}
             <div className="flex w-full lg:w-1/4 flex-col gap-4">
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-8 rounded-[32px] clay-card shadow-xl shadow-emerald-600/20 transition-all hover:-translate-y-2 text-left w-full border border-emerald-500 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/50 flex items-center justify-center border border-emerald-400">
                       <SlidersHorizontal className="w-6 h-6 text-white" />
                    </div>
                    <ChevronRight className="w-6 h-6 text-emerald-200 group-hover:translate-x-2 transition-transform" />
                  </div>
                  <h4 className="font-serif text-2xl mb-2 relative z-10">Ajustar meu plano</h4>
                  <p className="text-emerald-100 text-sm font-sans leading-relaxed relative z-10">Reajuste calorias e macros para atingir essa composição corporal mais rápido.</p>
                </button>
             </div>

          </div>
        )}
      </div>
    </div>
  );
}
