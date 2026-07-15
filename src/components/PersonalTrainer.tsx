import { playSfx, vibrate } from '../lib/sensory';
import { playAudioUrl, stopSpeech } from '../lib/speech';
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, PlayCircle, Trophy, Sparkles, Volume2, Clock, Zap, Activity, Info, ChevronRight, RefreshCw, Music, VolumeX, CheckCircle2, Calendar, Dumbbell, Flame, Apple, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, WorkoutSession, Exercise, WeeklyWorkoutPlan, WeeklyWorkoutDay } from '../types';
import { generateWorkout, generateWeeklyWorkoutPlan, textToSpeech } from '../lib/gemini';
import { Avatar3D } from './Avatar3D';

interface PersonalTrainerProps {
  profile: UserProfile | null;
  onAwardPoints?: (amount: number, reason: string) => void;
  onUpdateProfile?: (profile: UserProfile) => void;
}

const DEFAULT_WEEKLY_PLAN: WeeklyWorkoutPlan = {
  id: "weekly-plan-default",
  title: "Plano Semanal NutriAI - Sincronizado",
  description: "Treinos semanais de calistenia sincronizados com sua nutrição e nível de atividade.",
  days: [
    {
      dayName: "Segunda-feira",
      dayKey: "monday",
      workoutTitle: "Cardio e Resistência",
      workoutFocus: "Foco em queima calórica e tônus muscular geral",
      targetMuscles: ["Membros Inferiores", "Cardio", "Core"],
      intensity: "Iniciante",
      nutritionContext: "Excelente dia para consumir carboidratos complexos (como aveia e batata-doce) antes do treino para energia.",
      exercises: [
        { id: "ex-1", name: "Polichinelos", duration: 40, muscleGroups: ["Cardio"] },
        { id: "ex-2", name: "Agachamentos Livres", reps: 15, muscleGroups: ["Pernas", "Glúteos"] },
        { id: "ex-3", name: "Corrida Estacionária", duration: 60, muscleGroups: ["Cardio", "Pernas"] },
        { id: "ex-4", name: "Prancha Isométrica", duration: 30, muscleGroups: ["Abdômen", "Core"] }
      ]
    },
    {
      dayName: "Terça-feira",
      dayKey: "tuesday",
      workoutTitle: "Força de Membros Superiores",
      workoutFocus: "Foco no desenvolvimento do peito, costas e braços",
      targetMuscles: ["Peito", "Costas", "Tríceps", "Ombros"],
      intensity: "Iniciante",
      nutritionContext: "Priorize o aporte proteico de alta qualidade (ovos, frango, tofu) após o treino para apoiar a regeneração muscular.",
      exercises: [
        { id: "ex-5", name: "Flexões de Braço", reps: 12, muscleGroups: ["Peito", "Tríceps"] },
        { id: "ex-6", name: "Super-homem (Lombar)", reps: 15, muscleGroups: ["Lombar", "Costas"] },
        { id: "ex-7", name: "Flexões Inclinadas", reps: 10, muscleGroups: ["Peito", "Ombros"] },
        { id: "ex-8", name: "Tríceps no Banco", reps: 12, muscleGroups: ["Tríceps"] }
      ]
    },
    {
      dayName: "Quarta-feira",
      dayKey: "wednesday",
      workoutTitle: "Recuperação Ativa e Mobilidade",
      workoutFocus: "Recuperação muscular ativa e aumento de flexibilidade",
      targetMuscles: ["Corpo Inteiro", "Flexibilidade"],
      intensity: "Iniciante",
      nutritionContext: "Dia focado em hidratação abundante. Adicione chás antioxidantes ou sucos verdes refrescantes ao seu plano.",
      exercises: [
        { id: "ex-9", name: "Alongamento Dinâmico de Pernas", duration: 120, muscleGroups: ["Pernas"] },
        { id: "ex-10", name: "Alongamento de Ombros e Costas", duration: 120, muscleGroups: ["Membros Superiores"] },
        { id: "ex-11", name: "Exercícios de Respiração Guiada", duration: 180, muscleGroups: ["Pulmões", "Mente"] }
      ]
    },
    {
      dayName: "Quinta-feira",
      dayKey: "thursday",
      workoutTitle: "Fortalecimento de Pernas e Glúteos",
      workoutFocus: "Desenvolvimento de força e resistência nos membros inferiores",
      targetMuscles: ["Quadríceps", "Isquiotibiais", "Glúteos", "Panturrilhas"],
      intensity: "Iniciante",
      nutritionContext: "Inclua potássio (ex: banana ou água de coco) para prevenir cãibras musculares devido ao esforço das pernas.",
      exercises: [
        { id: "ex-12", name: "Agachamento Sumô", reps: 15, muscleGroups: ["Quadríceps", "Adutores", "Glúteos"] },
        { id: "ex-13", name: "Afundos Alternados", reps: 12, muscleGroups: ["Pernas", "Glúteos"] },
        { id: "ex-14", name: "Elevação Pélvica (Ponte)", reps: 20, muscleGroups: ["Glúteos", "Posteriores"] },
        { id: "ex-15", name: "Elevação de Gêmeos (Panturrilhas)", reps: 20, muscleGroups: ["Panturrilhas"] }
      ]
    },
    {
      dayName: "Sexta-feira",
      dayKey: "friday",
      workoutTitle: "Fortalecimento de Core e Abdominais",
      workoutFocus: "Construção de estabilidade e força na região do tronco",
      targetMuscles: ["Abdômen", "Oblíquos", "Lombar"],
      intensity: "Iniciante",
      nutritionContext: "Alimente-se com fontes de magnésio (sementes, folhas verdes) para apoiar o relaxamento e controle neuromuscular.",
      exercises: [
        { id: "ex-16", name: "Abdominais Remador", reps: 15, muscleGroups: ["Abdômen"] },
        { id: "ex-17", name: "Prancha Lateral (Lado Esquerdo)", duration: 25, muscleGroups: ["Oblíquos", "Core"] },
        { id: "ex-18", name: "Prancha Lateral (Lado Direito)", duration: 25, muscleGroups: ["Oblíquos", "Core"] },
        { id: "ex-19", name: "Abdominais Bicicleta", reps: 20, muscleGroups: ["Abdômen", "Oblíquos"] }
      ]
    },
    {
      dayName: "Sábado",
      dayKey: "saturday",
      workoutTitle: "Treino Full Body de Alta Intensidade (HIIT)",
      workoutFocus: "Ativação global e estímulo metabólico completo",
      targetMuscles: ["Corpo Inteiro", "Cardio"],
      intensity: "Iniciante",
      nutritionContext: "Mantenha a reposição de glicogênio pós-treino com uma boa fonte de carboidratos saudáveis de absorção média.",
      exercises: [
        { id: "ex-20", name: "Burpees", reps: 10, muscleGroups: ["Corpo Inteiro", "Cardio"] },
        { id: "ex-21", name: "Agachamentos com Salto", reps: 12, muscleGroups: ["Pernas", "Cardio"] },
        { id: "ex-22", name: "Flexões de Braço rápidas", reps: 10, muscleGroups: ["Peito", "Tríceps"] },
        { id: "ex-23", name: "Alpinistas (Mountain Climbers)", duration: 30, muscleGroups: ["Cardio", "Core", "Ombros"] }
      ]
    },
    {
      dayName: "Domingo",
      dayKey: "sunday",
      workoutTitle: "Meditação e Mindful Recovery",
      workoutFocus: "Reequilíbrio mental, respiração e repouso absoluto",
      targetMuscles: ["Mente", "Recuperação"],
      intensity: "Iniciante",
      nutritionContext: "Dia ideal para purificar e nutrir o corpo com abundância de água, frutas silvestres e refeições limpas.",
      exercises: [
        { id: "ex-24", name: "Respiração Quadrada Pranayama", duration: 180, muscleGroups: ["Mente", "Pulmões"] },
        { id: "ex-25", name: "Meditação Guiada de Atenção Plena", duration: 300, muscleGroups: ["Mente"] }
      ]
    }
  ]
};

function createFullExercise3D(name: string, quantity: { reps?: number; duration?: number }, groups: string[]): Exercise {
  const isDuration = !!quantity.duration;
  const cleanName = name.toLowerCase();
  
  let primaryMuscles = ["core"];
  if (cleanName.includes("flex") || cleanName.includes("triceps") || cleanName.includes("braço")) {
    primaryMuscles = ["peitoral", "triceps", "ombros"];
  } else if (cleanName.includes("agach") || cleanName.includes("perna") || cleanName.includes("afundo") || cleanName.includes("panturrilha") || cleanName.includes("gêmeos")) {
    primaryMuscles = ["quadriceps", "gluteos"];
  } else if (cleanName.includes("abdominal") || cleanName.includes("prancha") || cleanName.includes("core")) {
    primaryMuscles = ["abs", "core"];
  } else if (cleanName.includes("super") || cleanName.includes("lombar") || cleanName.includes("costas")) {
    primaryMuscles = ["back", "core"];
  } else if (cleanName.includes("cardio") || cleanName.includes("polichinelo") || cleanName.includes("burpee") || cleanName.includes("corrida")) {
    primaryMuscles = ["core", "quadriceps"];
  }

  return {
    id: `dynamic-ex-${crypto.randomUUID()}`,
    name,
    description: `Exercício focado em ${groups.join(", ")} desenvolvido para seu condicionamento físico.`,
    difficulty: "Iniciante",
    muscleGroups: groups,
    primaryMuscles,
    reps: quantity.reps || undefined,
    duration: quantity.duration || undefined,
    instructions: [
      "Mantenha a coluna neutra e alinhe a respiração com cada movimento.",
      "Execute o movimento de forma controlada, sentindo a contração do músculo-alvo.",
      "Mantenha a contração do core (região abdominal) ativa para estabilidade postural."
    ],
    benefits: `Melhora significativamente a resistência, força funcional e estabilidade na região do ${groups[0] || 'corpo'}.`,
    tutorialSteps: [
      {
        title: "Posição Inicial",
        description: "Adote a postura de partida com pés firmes e coluna alinhada. Concentre sua respiração.",
        animationState: "tutorial",
        cameraView: "front"
      },
      {
        title: "Fase de Execução",
        description: "Inicie a descida ou contração de forma pausada e consciente até atingir o ponto máximo.",
        animationState: "executing",
        cameraView: "side"
      },
      {
        title: "Finalização",
        description: "Retorne à postura neutra inicial, expirando o ar de maneira controlada.",
        animationState: "idle",
        cameraView: "front"
      }
    ],
    commonErrors: [
      {
        error: "Bloquear a respiração durante o esforço",
        fix: "Expire na fase concêntrica (de maior força) e inspire no retorno."
      },
      {
        error: "Acelerar demais a execução prejudicando a postura",
        fix: "Priorize o tempo sob tensão muscular de forma lenta e controlada."
      }
    ]
  };
}

export function PersonalTrainer({ profile, onAwardPoints, onUpdateProfile }: PersonalTrainerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'plan' | 'training'>('plan');
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyWorkoutPlan | null>(null);
  const [isGeneratingWeekly, setIsGeneratingWeekly] = useState(false);
  const [selectedWeeklyDay, setSelectedWeeklyDay] = useState<WeeklyWorkoutDay | null>(null);

  const [workout, setWorkout] = useState<WorkoutSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(-1);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMode, setActiveMode] = useState<'training' | 'tutorial'>('training');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [cameraView, setCameraView] = useState<'front' | 'side' | 'detail'>('front');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showWrongMode, setShowWrongMode] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [isSpeakingTips, setIsSpeakingTips] = useState(false);
  
  // Background Music State
  const [isBgMusicPlaying, setIsBgMusicPlaying] = useState(false);
  const [bgMusicVolume, setBgMusicVolume] = useState(0.3);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (profile?.weeklyWorkoutPlan) {
      setWeeklyPlan(profile.weeklyWorkoutPlan);
    } else {
      setWeeklyPlan(DEFAULT_WEEKLY_PLAN);
    }
  }, [profile?.weeklyWorkoutPlan]);

  const startWeeklyDayWorkout = (day: WeeklyWorkoutDay) => {
    playSfx('tap');
    
    const dynamicExercises = day.exercises.map((ex, idx) => {
      const isDuration = ex.name.toLowerCase().includes("prancha") || 
                         ex.name.toLowerCase().includes("corrida") || 
                         ex.name.toLowerCase().includes("polichinelo") || 
                         ex.name.toLowerCase().includes("alongamento") || 
                         ex.name.toLowerCase().includes("respiração") || 
                         ex.name.toLowerCase().includes("meditação");
      const quantity = isDuration ? { duration: ex.duration || 45 } : { reps: ex.reps || 12 };
      
      return createFullExercise3D(ex.name, quantity, ex.muscleGroups || day.targetMuscles);
    });

    const session: WorkoutSession = {
      id: `weekly-${day.dayKey}-${crypto.randomUUID()}`,
      title: `${day.workoutTitle} (${day.dayName})`,
      exercises: dynamicExercises,
      totalCalories: day.exercises.length * 45,
      estimatedDuration: day.exercises.reduce((acc, curr) => acc + (curr.duration ? Math.ceil(curr.duration / 60) : 1), 0) + 5
    };

    setWorkout(session);
    setCurrentExerciseIndex(0);
    setCompletedExercises([]);
    setActiveSubTab('training');
    
    playMotivationalMessage(`Iniciando treino de ${day.workoutTitle} para esta ${day.dayName}. Mantenha o foco!`);
  };

  const handleGenerateWeeklyPlan = async () => {
    setIsGeneratingWeekly(true);
    playSfx('tap');
    playMotivationalMessage("Elaborando seu plano semanal de exercícios baseado em seus objetivos de saúde e nutrição...");
    try {
      const plan = await generateWeeklyWorkoutPlan(profile);
      if (plan) {
        setWeeklyPlan(plan);
        if (onUpdateProfile && profile) {
          onUpdateProfile({
            ...profile,
            weeklyWorkoutPlan: plan
          });
        }
        playMotivationalMessage("Seu plano semanal personalizado foi gerado com sucesso pela nossa Inteligência Artificial!");
      }
    } catch (error) {
      console.error("Erro ao gerar plano semanal:", error);
      playMotivationalMessage("Desculpe, tive um probleminha para gerar o plano com IA. Mantive seu plano atual de alta qualidade.");
    } finally {
      setIsGeneratingWeekly(false);
    }
  };

  useEffect(() => {
    // Initialize background music
    const audio = new Audio('https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3');
    audio.loop = true;
    audio.volume = bgMusicVolume;
    bgAudioRef.current = audio;

    return () => {
      audio.pause();
      bgAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.volume = bgMusicVolume;
    }
  }, [bgMusicVolume]);

  const toggleBgMusic = () => {
    if (!bgAudioRef.current) return;
    if (isBgMusicPlaying) {
      bgAudioRef.current.pause();
    } else {
      bgAudioRef.current.play().catch(console.error);
    }
    setIsBgMusicPlaying(!isBgMusicPlaying);
  };

  const currentExercise = currentExerciseIndex >= 0 ? workout?.exercises[currentExerciseIndex] : null;

  const handleExerciseSuccess = () => {
    setIsTimerActive(false);
    setShowSuccessAnimation(true);
    playSfx('success');
    vibrate([30, 50, 30]);
    playMotivationalMessage("Perfeito! Movimento impecável. Concluído com sucesso.");
    
    // Auto-advance after showing success
    setTimeout(() => {
      setShowSuccessAnimation(false);
      nextExercise();
    }, 4500);
  };

  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      handleExerciseSuccess();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive, timeLeft]);

  const handleStartWorkout = async () => {
    setIsGenerating(true);
    try {
      const result = await generateWorkout(profile);
      if (result) {
        setWorkout(result);
        setCurrentExerciseIndex(0);
        setCompletedExercises([]);
        playMotivationalMessage(`Pode deixar comigo, vou cuidar disso com você 💚 Prepare-se para o primeiro.`);
        
        // Auto-play background music if not already playing
        if (!isBgMusicPlaying && bgAudioRef.current) {
          bgAudioRef.current.play().catch(console.error);
          setIsBgMusicPlaying(true);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const playMotivationalMessage = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const base64Audio = await textToSpeech(text);
      if (base64Audio) {
        const url = `data:audio/wav;base64,${base64Audio}`;
        setAudioUrl(url);
        await playAudioUrl(url, { onEnded: () => setIsPlaying(false) });
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error(error);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    setIsSpeakingTips(false);
  }, [currentExerciseIndex]);

  const getAudioTipsText = () => {
    if (!currentExercise) return '';
    const name = currentExercise.name;
    
    let text = `Instruções de execução para o exercício ${name}. `;
    
    if (currentExercise.instructions && currentExercise.instructions.length > 0) {
      text += `Como fazer: ${currentExercise.instructions.join('. ')}. `;
    }
    
    if (currentExercise.commonErrors && currentExercise.commonErrors.length > 0) {
      const errorsText = currentExercise.commonErrors
        .map(e => `Atenção: evite o erro comum de ${e.error.toLowerCase()}. O correto é ${e.fix.toLowerCase()}.`)
        .join('. ');
      text += `Fique atento a postura. ${errorsText} `;
    }
    
    if (currentExercise.benefits) {
      text += `Como benefício, ${currentExercise.benefits.toLowerCase()}`;
    }
    
    return text;
  };

  const handlePlayAudioTips = async () => {
    if (!currentExercise) return;

    if (isSpeakingTips) {
      stopSpeech();
      setIsSpeakingTips(false);
      if (bgAudioRef.current && isBgMusicPlaying) {
        bgAudioRef.current.volume = bgMusicVolume;
      }
      return;
    }

    setIsSpeakingTips(true);
    const textToSpeak = getAudioTipsText();
    
    if (bgAudioRef.current && isBgMusicPlaying) {
      bgAudioRef.current.volume = 0.05;
    }
    
    try {
      const base64Audio = await textToSpeech(textToSpeak);
      if (base64Audio) {
        const url = `data:audio/wav;base64,${base64Audio}`;
        setAudioUrl(url);
        await playAudioUrl(url, {
          onEnded: () => {
            setIsSpeakingTips(false);
            if (bgAudioRef.current && isBgMusicPlaying) {
              bgAudioRef.current.volume = bgMusicVolume;
            }
          }
        });
      } else {
        setIsSpeakingTips(false);
        if (bgAudioRef.current && isBgMusicPlaying) {
          bgAudioRef.current.volume = bgMusicVolume;
        }
      }
    } catch (error) {
      console.error("Erro ao gerar áudio de dicas:", error);
      setIsSpeakingTips(false);
      if (bgAudioRef.current && isBgMusicPlaying) {
        bgAudioRef.current.volume = bgMusicVolume;
      }
    }
  };

  const startExercise = () => {
    if (!currentExercise) return;
    setActiveMode('training');
    setIsTimerActive(true);
    setPlaybackSpeed(1);
    setTutorialStep(0);
    setShowWrongMode(false);
    setTimeLeft(currentExercise.duration || 45);
    playMotivationalMessage(`Tá tudo pronto. Só começa que eu te guio.`);
  };

  const startTutorial = () => {
    if (!currentExercise || !currentExercise.tutorialSteps) return;
    setActiveMode('tutorial');
    setIsTimerActive(false);
    setTutorialStep(0);
    setShowWrongMode(false);
    const firstStep = currentExercise.tutorialSteps[0];
    setCameraView(firstStep.cameraView);
    playMotivationalMessage(`Vou te mostrar como faz. ${firstStep.description}`);
  };

  const nextTutorialStep = () => {
    if (!currentExercise?.tutorialSteps) return;
    const nextStep = tutorialStep + 1;
    if (nextStep < currentExercise.tutorialSteps.length) {
      setTutorialStep(nextStep);
      const step = currentExercise.tutorialSteps[nextStep];
      setCameraView(step.cameraView);
      playMotivationalMessage(`${step.title}. ${step.description}`);
    } else {
      playMotivationalMessage("Pronto pra começar?");
    }
  };

  const nextExercise = () => {
    if (!workout || !currentExercise) return;
    
    const nextIndex = currentExerciseIndex + 1;
    setCompletedExercises(prev => [...prev, currentExercise.id]);
    
    if (nextIndex < workout.exercises.length) {
      setCurrentExerciseIndex(nextIndex);
      setIsTimerActive(false);
      setTimeLeft(0);
      playMotivationalMessage(`Muito bom! Vamos pro próximo: ${workout.exercises[nextIndex].name}.`);
    } else {
      finishWorkout();
    }
  };

  const finishWorkout = () => {
    setCurrentExerciseIndex(-2); // Special state for finished
    setIsTimerActive(false);
    if (onAwardPoints) onAwardPoints(150, `Treino Completo: ${workout?.title}`);
    
    if (onUpdateProfile && profile) {
      onUpdateProfile({
         ...profile,
         workoutLogs: [
            ...(profile.workoutLogs || []),
            {
               id: crypto.randomUUID(),
               date: new Date().toISOString(),
               durationMinutes: workout?.estimatedDuration || 30,
               completed: true,
               intensity: 'Moderado',
            }
         ]
      })
    }

    playMotivationalMessage("Hoje foi bom. Amanhã a gente continua 💚");
    
    // Smoothly lower background music volume
    const interval = setInterval(() => {
      if (bgAudioRef.current && bgAudioRef.current.volume > 0.1) {
        bgAudioRef.current.volume -= 0.05;
      } else {
        clearInterval(interval);
      }
    }, 200);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Personal Trainer 3D
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
          Treine em casa com precisão. Siga seu plano de exercícios semanais sugerido pela IA ou inicie o treino guiado em 3D.
        </p>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex justify-center">
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full flex gap-1 shadow-inner border border-slate-200/40 dark:border-slate-700/40">
          <button
            onClick={() => setActiveSubTab('plan')}
            className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'plan'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Plano Semanal
          </button>
          <button
            onClick={() => setActiveSubTab('training')}
            className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'training'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Treino 3D Ativo
          </button>
        </div>
      </div>

      {activeSubTab === 'plan' ? (
        <div className="space-y-8">
          {/* Sync status alert banner */}
          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-[24px] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-serif font-bold text-lg">
                <Sparkles className="w-5 h-5" />
                Sincronização de IA Ativa
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
                Seu plano de calistenia foi sincronizado com seu objetivo de <span className="font-bold text-emerald-600 dark:text-emerald-400">{profile?.goals || 'Emagrecimento'}</span> e nível de atividade <span className="font-bold text-emerald-600 dark:text-emerald-400">{profile?.activityLevel || 'Iniciante'}</span>.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50">
                  <Apple className="w-3.5 h-3.5" />
                  Nutrição: {profile?.masterPlan?.nutritionFocus || 'Foco em Carboidratos & Proteínas'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/50">
                  <Flame className="w-3.5 h-3.5" />
                  Calistenia: {profile?.masterPlan?.workoutFocus || 'Resistência & Força Muscular'}
                </span>
              </div>
            </div>

            <button
              onClick={handleGenerateWeeklyPlan}
              disabled={isGeneratingWeekly}
              className="w-full md:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm shadow-xl transition-all disabled:opacity-50 active:scale-95"
            >
              {isGeneratingWeekly ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Regerar com Inteligência Artificial
            </button>
          </div>

          {/* Weekly Days List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {weeklyPlan?.days.map((day, index) => {
              const isSelected = selectedWeeklyDay?.dayKey === day.dayKey;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={day.dayKey}
                  className={`bg-white dark:bg-slate-800/60 rounded-[28px] border p-6 space-y-5 transition-all shadow-lg hover:shadow-xl ${
                    isSelected 
                      ? 'border-emerald-500 shadow-emerald-500/5 dark:shadow-emerald-500/10' 
                      : 'border-slate-100 dark:border-slate-700/50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                        {day.dayName}
                      </span>
                      <h4 className="font-serif text-xl font-bold text-slate-800 dark:text-slate-100">
                        {day.workoutTitle}
                      </h4>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      {day.intensity}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {day.workoutFocus}
                  </p>

                  {/* AI Synced Nutrition Context */}
                  <div className="bg-amber-500/[0.04] dark:bg-amber-500/[0.08] border border-amber-500/15 rounded-2xl p-4 flex gap-3">
                    <Apple className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Contexto Nutricional IA</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {day.nutritionContext}
                      </p>
                    </div>
                  </div>

                  {/* Exercises List Header */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      Série de Exercícios ({day.exercises.length})
                    </p>
                    <div className="space-y-2.5">
                      {day.exercises.map((ex, exIdx) => (
                        <div key={ex.id || exIdx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-700/20">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {ex.name}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {ex.duration ? `${ex.duration}s` : ex.reps ? `${ex.reps} repetições` : '1 série'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Play Action */}
                  <div className="pt-2">
                    <button
                      onClick={() => startWeeklyDayWorkout(day)}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Treinar no Simulador 3D
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          {!workout ? (
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-8 md:p-12 rounded-[32px] clay-card md:rounded-[40px] shadow-2xl border border-white/60 dark:border-slate-700/50 text-center space-y-6 md:space-y-8 max-w-2xl mx-auto">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                   <Dumbbell className="w-10 h-10 md:w-12 md:h-12 animate-bounce" />
                </div>
                <div className="space-y-3 md:space-y-4">
                   <h3 className="font-serif text-2xl md:text-3xl font-medium text-slate-800 dark:text-slate-100">Pronto para Treinar?</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed max-w-md mx-auto">
                     Inicie uma sessão 3D interativa! Escolha um dia específico na aba **Plano Semanal** ou gere um Treino Inteligente personalizado agora mesmo.
                   </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setActiveSubTab('plan')}
                    className="px-6 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-2xl font-bold text-sm transition-all"
                  >
                    Ver Plano Semanal
                  </button>
                  <button
                     onClick={handleStartWorkout}
                     disabled={isGenerating}
                     className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mx-auto sm:mx-0"
                  >
                     {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                     Gerar Treino Inteligente Personalizado
                  </button>
                </div>
            </div>
      ) : currentExerciseIndex === -2 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-500 text-white p-8 md:p-16 rounded-[32px] clay-card md:rounded-[48px] text-center space-y-8 md:space-y-10 shadow-2xl shadow-emerald-500/20 max-w-2xl mx-auto"
        >
            <Trophy className="w-20 h-20 md:w-32 md:h-32 mx-auto animate-bounce" />
            <div className="space-y-3 md:space-y-4">
               <h3 className="text-3xl md:text-4xl font-serif font-bold">Vença a si mesma!</h3>
               <p className="text-emerald-50 text-base md:text-xl font-medium">Você completou o treino de hoje com sucesso.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl backdrop-blur-md">
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-emerald-100">Calorias</p>
                  <p className="text-2xl md:text-3xl font-bold font-serif">~{workout.totalCalories}</p>
               </div>
               <div className="bg-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl backdrop-blur-md">
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-emerald-100">Pontos</p>
                  <p className="text-2xl md:text-3xl font-bold font-serif">+150</p>
               </div>
            </div>
            <button
               onClick={() => setWorkout(null)}
               className="w-full py-4 md:py-5 clay-btn px-6 py-3 font-bold text-base md:text-lg shadow-xl active:scale-95"
            >
               Voltar ao Menu
            </button>
        </motion.div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
           {/* Left Column: Avatar and Visuals */}
           <div className="lg:col-span-12 xl:col-span-7 space-y-6 relative">
             <div className="relative w-full rounded-[40px] overflow-hidden bg-slate-950/5 dark:bg-slate-900/50">
               <Avatar3D 
                 activeMuscles={currentExercise?.primaryMuscles || []} 
                 animation={
                   showWrongMode ? 'wrong' : 
                   (activeMode === 'tutorial' ? currentExercise?.tutorialSteps?.[tutorialStep]?.animationState || 'tutorial' : 
                   (isTimerActive ? 'executing' : 'idle'))
                 }
                 view={cameraView}
                 playbackSpeed={playbackSpeed}
               />

              {/* Viewpoint Controls */}
              <div className="absolute top-6 left-6 md:top-8 md:left-8 flex flex-col gap-2 z-10">
                {(['front', 'side', 'detail'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setCameraView(v)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest backdrop-blur-md border transition-all ${
                      cameraView === v 
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/30' 
                      : 'bg-white/10 text-white border-white/20 active:bg-white/30'
                    }`}
                  >
                    {v === 'front' ? 'Frente' : v === 'side' ? 'Lateral' : 'Detalhe'}
                  </button>
                ))}
              </div>

              {/* Ambient Music Controls Overlay */}
              <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-white/60 dark:border-slate-800 shadow-xl flex items-center gap-2 md:gap-3 group"
                >
                   <button 
                     onClick={toggleBgMusic}
                     title={isBgMusicPlaying ? "Pausar música" : "Tocar música"}
                     className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${isBgMusicPlaying ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                   >
                     {isBgMusicPlaying ? <Music className="w-4 h-4 md:w-5 md:h-5 animate-pulse" /> : <VolumeX className="w-4 h-4 md:w-5 md:h-5" />}
                   </button>
                   
                   <div className="w-0 group-hover:w-32 md:group-hover:w-36 overflow-hidden transition-all duration-300 flex items-center gap-2 md:gap-3">
                      <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full flex-1 relative">
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          value={bgMusicVolume} 
                          onChange={(e) => setBgMusicVolume(parseFloat(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div 
                          className="h-full bg-emerald-500 rounded-full relative"
                          style={{ width: `${bgMusicVolume * 100}%` }}
                        >
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 bg-white border-2 border-emerald-500 rounded-full shadow-md" />
                        </div>
                      </div>
                      <span className="text-[9px] md:text-[10px] font-mono font-bold text-slate-500 shrink-0">
                         {Math.round(bgMusicVolume * 100)}%
                       </span>
                   </div>
                </motion.div>
              </div>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                 <div className="bg-white/40 dark:bg-slate-800/40 p-4 md:p-6 rounded-2xl md:rounded-[28px] border border-white/60 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progressos</p>
                        <p className="text-xl md:text-2xl font-serif font-bold text-slate-800 dark:text-slate-100">
                           {currentExerciseIndex + 1} de {workout.exercises.length}
                        </p>
                    </div>
                    <div className="w-12 md:w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shrink-0">
                       <div 
                         className="h-full bg-emerald-500" 
                         style={{ width: `${((currentExerciseIndex + 1) / workout.exercises.length) * 100}%` }} 
                       />
                    </div>
                 </div>

                 <div className="bg-white/40 dark:bg-slate-800/40 p-4 md:p-6 rounded-2xl md:rounded-[28px] border border-white/60 dark:border-slate-700/50 flex items-center gap-3 md:gap-4">
                    <button
                        onClick={() => currentExercise && playMotivationalMessage(currentExercise.description)}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-full shrink-0 flex items-center justify-center text-white bg-emerald-500 transition-all ${isPlaying ? 'animate-pulse' : 'hover:scale-105 active:scale-95'}`}
                    >
                        {isPlaying ? <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> : <Info className="w-4 h-4 md:w-5 md:h-5" />}
                    </button>
                    <div className="overflow-hidden">
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assistente</p>
                        <p className="text-xs italic text-slate-600 dark:text-slate-300 truncate md:whitespace-normal">"Mantenha sempre a postura..."</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Right Column: Exercise Details & Controls */}
           <div className="lg:col-span-12 xl:col-span-5 space-y-6">
              <motion.div 
                key={currentExercise?.id + activeMode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/40 dark:bg-slate-800/40 p-6 md:p-8 rounded-[24px] md:rounded-[32px] clay-card border border-white/60 dark:border-slate-700/50 shadow-xl space-y-6 md:space-y-8"
              >
                 <div className="flex items-center justify-between">
                    <div className="space-y-1 md:space-y-2">
                        <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">
                          <Zap className="w-3.5 h-3.5" />
                          {activeMode === 'tutorial' ? 'Modo Tutorial' : 'Treino Ativo'}
                        </div>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-800 dark:text-slate-100">{currentExercise?.name}</h3>
                    </div>
                    
                    {activeMode === 'training' && (
                      <div className="text-right">
                         <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo</p>
                         <p className="text-2xl md:text-3xl font-mono font-bold text-emerald-500">
                            {timeLeft}s
                         </p>
                      </div>
                    )}
                 </div>

                 {activeMode === 'tutorial' ? (
                   <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="flex items-center gap-2 mb-4">
                        {currentExercise?.tutorialSteps?.map((_, i) => (
                          <div 
                            key={i} 
                            className={`h-1 flex-1 rounded-full transition-all ${i <= tutorialStep ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} 
                          />
                        ))}
                      </div>

                      <div className="space-y-3 md:space-y-4">
                        <h4 className="text-xl md:text-2xl font-serif font-bold text-slate-800 dark:text-slate-100">
                           {currentExercise?.tutorialSteps?.[tutorialStep]?.title}
                        </h4>
                        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                           {currentExercise?.tutorialSteps?.[tutorialStep]?.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                         <button
                           onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 0.5 : 1)}
                           className={`p-3 md:p-4 rounded-xl md:rounded-2xl border font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                             playbackSpeed === 0.5 ? 'bg-amber-500/10 border-amber-500 text-amber-600' : 'bg-white/50 border-slate-200 text-slate-600'
                           }`}
                         >
                           <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                           {playbackSpeed === 0.5 ? '0.5x' : '1x'}
                         </button>
                         <button
                           onClick={() => setShowWrongMode(!showWrongMode)}
                           className={`p-3 md:p-4 rounded-xl md:rounded-2xl border font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                              showWrongMode ? 'bg-red-500/10 border-red-500 text-red-600' : 'bg-white/50 border-slate-200 text-slate-600'
                           }`}
                         >
                           <Info className="w-3.5 h-3.5 md:w-4 md:h-4" />
                           Ajustes
                         </button>
                      </div>

                      {showWrongMode && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl md:rounded-2xl border border-red-100 dark:border-red-900/30"
                        >
                           <p className="text-[10px] font-bold text-red-600 uppercase mb-2">❌ Evite:</p>
                           {currentExercise?.commonErrors?.map((err, i) => (
                             <div key={i} className="mb-2 last:mb-0">
                               <p className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300">"{err.error}"</p>
                               <p className="text-[10px] md:text-xs text-emerald-600 font-bold mt-1">✅ Correção: {err.fix}</p>
                             </div>
                           ))}
                        </motion.div>
                      )}

                      <div className="flex gap-3 md:gap-4 pt-2 md:pt-4">
                         {tutorialStep < (currentExercise?.tutorialSteps?.length || 0) - 1 ? (
                           <button
                             onClick={nextTutorialStep}
                             className="flex-1 py-4 md:py-5 clay-primary px-6 py-3 md:rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 text-sm md:text-base text-white"
                           >
                              Próximo
                              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                           </button>
                         ) : (
                           <button
                             onClick={startExercise}
                             className="flex-1 py-4 md:py-5 bg-slate-900 text-white rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 text-sm md:text-base"
                           >
                              Treinar Agora
                              <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                           </button>
                         )}
                         <button
                           onClick={() => setTutorialStep(0)}
                           className="p-4 md:p-5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl md:rounded-2xl active:scale-95"
                         >
                            <RefreshCw className="w-5 h-5 md:w-6 md:h-6" />
                         </button>
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="flex gap-3 md:gap-4">
                        <div className="px-3 py-1.5 md:px-4 md:py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold">
                           {currentExercise?.difficulty}
                        </div>
                        <div className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold">
                           {currentExercise?.reps ? `${currentExercise.reps} Reps` : `${currentExercise?.duration}s`}
                        </div>
                     </div>

                     <div className="space-y-3 md:space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Músculos Ativados:</h4>
                        <div className="flex flex-wrap gap-2">
                           {currentExercise?.muscleGroups.map(m => (
                             <span key={m} className="px-2.5 py-1 md:px-3 md:py-1 bg-white/60 dark:bg-slate-700 rounded-full text-[10px] md:text-xs text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-600/50">
                                {m}
                             </span>
                           ))}
                        </div>
                     </div>

                     <div className="pt-4 md:pt-8 space-y-4">
                        <div className="flex gap-3 md:gap-4">
                           {!isTimerActive ? (
                             <button
                               onClick={startExercise}
                               className="flex-1 py-4 md:py-5 bg-emerald-500 text-white hover:clay-primary px-6 py-3 md:rounded-2xl font-bold text-base md:text-lg shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95"
                             >
                               <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                               Começar
                             </button>
                           ) : (
                             <button
                               onClick={() => setIsTimerActive(false)}
                               className="flex-1 py-4 md:py-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95"
                             >
                               <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                               Pausar
                             </button>
                           )}
                           
                           <button
                             onClick={startTutorial}
                             className="px-4 md:px-6 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl md:rounded-2xl font-bold active:bg-slate-200 transition-all flex items-center gap-2"
                             title="Ver Tutorial"
                           >
                              <Info className="w-5 h-5 md:w-6 md:h-6" />
                              <span className="hidden sm:inline text-sm md:text-base">Tutorial</span>
                           </button>

                           <button
                             onClick={handleExerciseSuccess}
                             className="px-4 md:px-6 bg-emerald-500 text-white rounded-xl md:rounded-2xl font-bold hover:bg-emerald-600 active:bg-emerald-700 transition-all flex items-center justify-center"
                             title="Concluir O Movimento"
                           >
                              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                           </button>

                           <button
                             onClick={nextExercise}
                             className="px-4 md:px-6 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white rounded-xl md:rounded-2xl font-bold active:bg-slate-300 transition-all"
                             title="Pular"
                           >
                              <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
                           </button>
                        </div>
                     </div>
                   </div>
                 )}
              </motion.div>

              <button
                type="button"
                onClick={handlePlayAudioTips}
                disabled={isGenerating}
                className={`w-full bg-gradient-to-r ${isSpeakingTips ? 'from-amber-500/15 via-amber-500/5' : 'from-emerald-500/15 via-emerald-500/5'} to-transparent dark:from-emerald-500/25 dark:via-emerald-500/10 border ${isSpeakingTips ? 'border-amber-500/30' : 'border-emerald-500/20'} p-5 rounded-[24px] hover:rounded-[28px] flex items-center justify-between hover:border-emerald-500/40 hover:scale-[1.01] transition-all group active:scale-95 text-left`}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1 mr-2">
                  <div className={`w-12 h-12 rounded-2xl shrink-0 ${isSpeakingTips ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'} flex items-center justify-center shadow-lg ${isSpeakingTips ? 'shadow-amber-500/30' : 'shadow-emerald-500/30'} group-hover:scale-110 transition-transform`}>
                    {isSpeakingTips ? (
                      <Pause className="w-5 h-5 fill-current animate-pulse" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-sm sm:text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 flex flex-wrap items-center gap-1.5 md:gap-2 leading-tight">
                      <span>{isSpeakingTips ? 'Pausar Dicas por Voz' : 'Dicas de Execução por Voz (IA)'}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium ${isSpeakingTips ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                        {isSpeakingTips ? 'Tocando' : 'Premium'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug break-words">
                      {isSpeakingTips ? 'Clique para pausar a reprodução do áudio' : 'Ouça como executar, respirar e evitar erros comuns'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 md:p-6 rounded-[24px] md:rounded-[28px] border border-emerald-100 dark:border-emerald-800/30 space-y-2 md:space-y-3">
                 <div className="flex items-center gap-2 font-serif text-base md:text-lg text-emerald-800 dark:text-emerald-400">
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                    Benefício IA
                 </div>
                 <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    "{currentExercise?.benefits}"
                 </p>
              </div>
           </div>
        </div>
      )}
        </div>
      )}

      <AnimatePresence>
        {showSuccessAnimation && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4 lg:p-0"
           >
             <motion.div 
               initial={{ scale: 0.8, y: 50 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.8, y: 50 }}
               className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[32px] md:rounded-[48px] shadow-2xl space-y-6 md:space-y-8 w-full max-w-md mx-auto text-center relative overflow-hidden"
             >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent pointer-events-none" />
                <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-emerald-500 mx-auto animate-pulse" />
                <div className="relative z-10">
                   <h3 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 dark:text-white mb-2">Excepcional!</h3>
                   <p className="text-slate-500 dark:text-slate-400 font-medium">Olha só como a execução foi perfeita.</p>
                </div>
                
                <div className="relative w-full aspect-square rounded-[24px] overflow-hidden border border-emerald-100 dark:border-emerald-800/50 shadow-inner bg-slate-50 dark:bg-slate-800">
                   <div className="absolute inset-x-0 bottom-0 top-auto z-10 pointers-events-none" style={{height: '40%', background: 'linear-gradient(to top, rgba(16,185,129,0.15), transparent)'}}></div>
                   <Avatar3D 
                     activeMuscles={currentExercise?.primaryMuscles || []} 
                     animation="perfect"
                     view="front"
                     playbackSpeed={1.5}
                   />
                </div>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
