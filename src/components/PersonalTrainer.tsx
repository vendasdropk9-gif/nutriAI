import { playSfx, vibrate } from '../lib/sensory';
import { playAudioUrl, stopSpeech, speak } from '../lib/speech';
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { Play, Pause, SkipForward, PlayCircle, Trophy, Sparkles, Volume2, Clock, Zap, Activity, Info, ChevronRight, RefreshCw, Music, VolumeX, CheckCircle2, Calendar, Dumbbell, Flame, Apple, Heart, FileText, Share2, Download, Cpu, Eye, Compass, ZoomIn, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, WorkoutSession, Exercise, WeeklyWorkoutPlan, WeeklyWorkoutDay } from '../types';
import { generateWorkout, generateWeeklyWorkoutPlan, textToSpeech } from '../lib/gemini';
import { Static3DAvatarPlaceholder } from './Static3DAvatarPlaceholder';
import { WorkoutSummaryReportModal } from './WorkoutSummaryReportModal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import avatarMaleSquat from '../assets/images/avatar_male_squat_1790881954417.jpg';
import avatarFemaleSquat from '../assets/images/avatar_female_squat_1790881967238.jpg';
import avatarMaleCurl from '../assets/images/avatar_male_curl_1790881979757.jpg';
import avatarFemaleCurl from '../assets/images/avatar_female_curl_1790881993449.jpg';
import avatarMalePlank from '../assets/images/avatar_male_plank_1790882008420.jpg';
import avatarFemalePlank from '../assets/images/avatar_female_plank_1790882021034.jpg';

// Lazy load Avatar3D to eliminate main-thread blocking on tab switch
const Avatar3D = lazy(() => import('./Avatar3D'));

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
  const getRealisticAvatarImage = () => {
    const avatarId = profile?.avatarId?.toLowerCase() || '';
    const gender = profile?.gender?.toLowerCase() || 'female';
    const name = currentExercise?.name?.toLowerCase() || '';

    const isMaleAvatar = avatarId.includes('male') || avatarId.includes('titan') || avatarId.includes('marcus') || avatarId.includes('leo') || avatarId === 'fitness-02';
    const isFemaleAvatar = avatarId.includes('female') || avatarId.includes('athena') || avatarId.includes('valkyrie') || avatarId.includes('maya') || avatarId.includes('elena') || avatarId === 'athletic-01';

    const effectiveGender = isMaleAvatar ? 'male' : isFemaleAvatar ? 'female' : (gender === 'male' ? 'male' : 'female');

    if (effectiveGender === 'male') {
      if (cameraView === 'side') {
        if (name.includes('prancha') || name.includes('abdom') || name.includes('core')) return avatarMalePlank;
        if (name.includes('agach') || name.includes('perna') || name.includes('afundo')) return avatarMaleSquat;
        return avatarMaleCurl;
      }
      if (cameraView === 'detail') {
        if (name.includes('agach') || name.includes('perna')) return avatarMaleSquat;
        return avatarMaleCurl;
      }
      // front view
      if (name.includes('agach') || name.includes('perna') || name.includes('afundo') || name.includes('gêmeos')) {
        return avatarMaleSquat;
      }
      if (name.includes('prancha') || name.includes('abdom') || name.includes('core')) {
        return avatarMalePlank;
      }
      return avatarMaleCurl;
    } else {
      if (cameraView === 'side') {
        if (name.includes('prancha') || name.includes('abdom') || name.includes('core')) return avatarFemalePlank;
        if (name.includes('agach') || name.includes('perna') || name.includes('afundo')) return avatarFemaleSquat;
        return avatarFemaleCurl;
      }
      if (cameraView === 'detail') {
        if (name.includes('agach') || name.includes('perna')) return avatarFemaleSquat;
        return avatarFemaleCurl;
      }
      // front view
      if (name.includes('agach') || name.includes('perna') || name.includes('afundo') || name.includes('gêmeos')) {
        return avatarFemaleSquat;
      }
      if (name.includes('prancha') || name.includes('abdom') || name.includes('core')) {
        return avatarFemalePlank;
      }
      return avatarFemaleCurl;
    }
  };

  const getCameraViewStyle = () => {
    if (cameraView === 'side') {
      return {
        transform: 'perspective(1000px) rotateY(-32deg) rotateX(3deg) scale(0.98) translateX(18px)',
        transition: 'all 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
        filter: 'drop-shadow(-15px 20px 28px rgba(0,0,0,0.6)) contrast(1.08)'
      };
    }
    if (cameraView === 'detail') {
      return {
        transform: 'scale(1.52) translateY(-10%)',
        transition: 'all 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
        filter: 'contrast(1.18) saturate(1.2) drop-shadow(0 0 45px rgba(16,185,129,0.55))'
      };
    }
    return {
      transform: 'scale(1) rotateY(0deg) translate(0)',
      transition: 'all 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
      filter: 'drop-shadow(0 0 35px rgba(59,130,246,0.35))'
    };
  };

  const handleSaveGender = (g: 'male' | 'female') => {
    playSfx('success');
    vibrate(20);
    if (onUpdateProfile && profile) {
      onUpdateProfile({
        ...profile,
        gender: g,
        avatarId: g === 'male' ? 'male-athletic-01' : 'female-athletic-01'
      });
    }
  };

  const { t } = useTranslation();
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
  const [avatarDisplayMode, setAvatarDisplayMode] = useState<'realistic' | '3d'>('realistic');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showWrongMode, setShowWrongMode] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [isSpeakingTips, setIsSpeakingTips] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  
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
      console.warn(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const playMotivationalMessage = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      await speak(text, {
        onEnded: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
    } catch (error) {
      console.warn(error);
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
      await speak(textToSpeak, {
        onEnded: () => {
          setIsSpeakingTips(false);
          if (bgAudioRef.current && isBgMusicPlaying) {
            bgAudioRef.current.volume = bgMusicVolume;
          }
        },
        onError: () => {
          setIsSpeakingTips(false);
          if (bgAudioRef.current && isBgMusicPlaying) {
            bgAudioRef.current.volume = bgMusicVolume;
          }
        }
      });
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

  if (profile && (!profile.gender || (profile.gender !== 'male' && profile.gender !== 'female'))) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 space-y-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 border border-emerald-200">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="font-serif text-3xl font-bold text-slate-800 dark:text-slate-100">Escolha seu Avatar Fitness</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Selecione o perfil do seu treinador para garantir a representação perfeita dos movimentos e consistência visual durante todos os treinos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
          {/* Male Instructor */}
          <button
            type="button"
            onClick={() => handleSaveGender('male')}
            className="group p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-xl transition-all cursor-pointer text-center space-y-4"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-4 border-slate-100 dark:border-slate-700 group-hover:border-emerald-500 transition-colors">
              <img src={avatarMaleSquat} alt="Treinador Masculino" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">Treinador Masculino</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avatar fotorealista focado em força e execução natural.</p>
            </div>
          </button>

          {/* Female Instructor */}
          <button
            type="button"
            onClick={() => handleSaveGender('female')}
            className="group p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-xl transition-all cursor-pointer text-center space-y-4"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-4 border-slate-100 dark:border-slate-700 group-hover:border-emerald-500 transition-colors">
              <img src={avatarFemaleSquat} alt="Treinadora Feminina" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">Treinadora Feminina</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avatar fotorealista focado em técnica correta e tônus muscular.</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4 w-full max-w-3xl mx-auto">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Personal Trainer
        </h2>
        <p className="font-sans text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
          Treine em casa com precisão. Siga seu plano de exercícios semanais sugerido pela IA ou inicie o treino guiado.
        </p>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex justify-center w-full">
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full flex flex-wrap justify-center gap-1 shadow-inner border border-slate-200/40 dark:border-slate-700/40">
          <button
            onClick={() => setActiveSubTab('plan')}
            className={`px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
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
            className={`px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'training'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Treino Ativo
          </button>
        </div>
      </div>

      {activeSubTab === 'plan' ? (
        <div className="space-y-8 w-full">
          {/* Sync status alert banner */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-900/5 dark:from-emerald-950/40 dark:via-slate-900/60 dark:to-slate-900/80 border border-emerald-500/20 dark:border-emerald-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-base sm:text-lg">
                  <div className="p-1.5 bg-emerald-500/15 rounded-lg">
                    <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span>{t('trainer_sync_active', 'Sincronização de IA Ativa')}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  Seu plano de calistenia foi sincronizado com seu objetivo de{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{profile?.goals || 'Emagrecimento'}</span> e nível de atividade{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{profile?.activityLevel || 'Iniciante'}</span>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => setIsSummaryModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <FileText className="w-4 h-4" />
                  Resumo Semanal (PDF / Card)
                </button>

                <button
                  onClick={handleGenerateWeeklyPlan}
                  disabled={isGeneratingWeekly}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  {isGeneratingWeekly ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  )}
                  Regerar com IA
                </button>
              </div>
            </div>

            {/* Structured Insights Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Nutrition focus card */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-emerald-500/20 shadow-xs">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                  <Apple className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Diretriz Nutricional
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {profile?.masterPlan?.nutritionFocus || 'Dieta balanceada e calculada para apoiar sua recuperação muscular e aporte calórico ideal.'}
                  </p>
                </div>
              </div>

              {/* Workout focus card */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-blue-500/20 shadow-xs">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    Foco da Calistenia
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {profile?.masterPlan?.workoutFocus || 'Treinos focados em progressão de força corporal, ativação neuromuscular e resistência.'}
                  </p>
                </div>
              </div>
            </div>
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
                      Treinar no Simulador
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
                     Inicie uma sessão interativa! Escolha um dia específico na aba **Plano Semanal** ou gere um Treino Inteligente personalizado agora mesmo.
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
               <h3 className="text-3xl md:text-4xl font-serif font-bold">{t('trainer_beat_yourself', 'Vença a si mesma!')}</h3>
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
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                 onClick={() => setIsSummaryModalOpen(true)}
                 className="flex-1 py-4 md:py-5 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 active:scale-95 border border-white/20"
              >
                 <FileText className="w-5 h-5" />
                 Gerar Card / PDF Semanal
              </button>
              <button
                 onClick={() => setWorkout(null)}
                 className="flex-1 py-4 md:py-5 clay-btn px-6 py-3 font-bold text-base md:text-lg shadow-xl active:scale-95"
              >
                 Voltar ao Menu
              </button>
            </div>
        </motion.div>
      ) : (
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center">
           {/* Left Column: Avatar and Visuals */}
           <div className="lg:col-span-7 space-y-6 relative w-full">
             <div className="relative w-full min-h-[420px] rounded-[32px] md:rounded-[40px] overflow-hidden bg-slate-950/80 dark:bg-slate-900/90 shadow-2xl border border-emerald-500/20 flex items-center justify-center">
               {avatarDisplayMode === 'realistic' ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`exercise_${currentExercise?.id || currentExerciseIndex}_${cameraView}_${profile?.gender || 'default'}`}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full h-full min-h-[420px] relative flex items-center justify-center p-4"
                    >
                      {/* Background ambient lighting */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-950/30 via-transparent to-transparent pointer-events-none" />
                      
                      <motion.div
                        className="relative max-h-full max-w-full flex items-center justify-center"
                        animate={isTimerActive ? {
                          scale: [1, 1.02, 1],
                          y: [0, -3, 0],
                        } : { scale: 1, y: 0 }}
                        transition={{
                          duration: (2.5 / playbackSpeed),
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <motion.img
                          key={getRealisticAvatarImage() + cameraView}
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          src={getRealisticAvatarImage()}
                          alt={currentExercise?.name || "Exercício"} style={getCameraViewStyle()}
                          className="max-h-[360px] md:max-h-[400px] w-auto object-contain drop-shadow-[0_0_35px_rgba(59,130,246,0.35)] rounded-2xl transition-all duration-300"
                          referrerPolicy="no-referrer"
                        />

                      </motion.div>
                    </motion.div>
                  </AnimatePresence>
                ) : (
                 <Suspense
                   fallback={
                     <Static3DAvatarPlaceholder
                       title={currentExercise?.name || "Exercício 3D"}
                       subtitle="Carregando modelo anatômico do instrutor..."
                       heightClass="min-h-[420px]"
                     />
                   }
                 >
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
                 </Suspense>
               )}

              {/* Top Left: Active Target Muscle Badge & Avatar Mode Toggle */}
              <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
                {currentExercise?.primaryMuscles?.[0] && (
                  <div className="bg-slate-950/85 backdrop-blur-md border border-emerald-400/40 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">
                      {currentExercise.primaryMuscles[0]}
                    </span>
                  </div>
                )}

                {/* Display Mode Switcher (Realista / 3D) */}
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tap');
                    vibrate(12);
                    setAvatarDisplayMode(m => m === 'realistic' ? '3d' : 'realistic');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold bg-slate-950/85 hover:bg-slate-900 text-emerald-400 border border-emerald-500/30 backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95"
                  title={avatarDisplayMode === 'realistic' ? "Alternar para Modelo 3D Interativo" : "Alternar para Foto Realista"}
                >
                  {avatarDisplayMode === 'realistic' ? (
                    <>
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ver em 3D</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ver Realista</span>
                    </>
                  )}
                </button>
              </div>

              {/* View-specific feedback HUD overlays */}
              <AnimatePresence>
                {cameraView === 'detail' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-16 left-4 md:left-6 z-20 max-w-[270px] bg-slate-950/90 backdrop-blur-md border border-emerald-500/40 p-2.5 rounded-2xl shadow-xl pointer-events-none"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">
                      <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
                      <span>Zoom Biomecânico Ativo</span>
                    </div>
                    <p className="text-[11px] text-slate-200 font-medium leading-snug">
                      Foco em <strong className="text-emerald-300">{currentExercise?.primaryMuscles?.join(', ') || 'Músculo Alvo'}</strong> sob tensão constante.
                    </p>
                  </motion.div>
                )}

                {cameraView === 'side' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-16 left-4 md:left-6 z-20 max-w-[270px] bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 p-2.5 rounded-2xl shadow-xl pointer-events-none"
                  >
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">
                      <Compass className="w-3 h-3 text-cyan-400" />
                      <span>Visão Lateral Sagital</span>
                    </div>
                    <p className="text-[11px] text-slate-200 font-medium leading-snug">
                      Avalie alinhamento de coluna, joelhos e trajetória articular.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Center: Camera View Perspective Controls (Frente, Lateral, Detalhe) */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 bg-slate-950/90 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl">
                {([
                  { id: 'front' as const, label: 'Frente', icon: Eye, title: 'Visão Frontal • Simetria e amplitude' },
                  { id: 'side' as const, label: 'Lateral', icon: Compass, title: 'Visão Lateral • Alinhamento postural' },
                  { id: 'detail' as const, label: 'Detalhe', icon: ZoomIn, title: 'Zoom de Detalhe • Músculo sob tensão' },
                ]).map(({ id, label, icon: Icon, title }) => {
                  const isSelected = cameraView === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      title={title}
                      onClick={() => {
                        playSfx('tap');
                        vibrate(14);
                        setCameraView(id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer outline-none select-none ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-102 font-black'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 active:scale-98'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span>{label}</span>
                    </button>
                  );
                })}
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
           <div className="lg:col-span-5 space-y-6 w-full max-w-full min-w-0">
              <motion.div 
                key={currentExercise?.id + activeMode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/40 dark:bg-slate-800/40 p-5 sm:p-6 md:p-8 rounded-[24px] md:rounded-[32px] clay-card border border-white/60 dark:border-slate-700/50 shadow-xl space-y-6 md:space-y-8 w-full max-w-full overflow-hidden"
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
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('trainer_activated_muscles', 'Músculos Ativados:')}</h4>
                        <div className="flex flex-wrap gap-2">
                           {currentExercise?.muscleGroups.map(m => (
                             <span key={m} className="px-2.5 py-1 md:px-3 md:py-1 bg-white/60 dark:bg-slate-700 rounded-full text-[10px] md:text-xs text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-600/50">
                                {m}
                             </span>
                           ))}
                        </div>
                     </div>

                     <div className="pt-4 md:pt-8 space-y-4 w-full max-w-full">
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 md:gap-4 w-full overflow-hidden">
                           {!isTimerActive ? (
                             <button
                               onClick={startExercise}
                               className="flex-1 py-4 md:py-5 bg-emerald-500 text-white hover:clay-primary px-3 sm:px-6 py-3 md:rounded-2xl rounded-xl font-bold text-xs sm:text-base md:text-lg min-w-0 flex-1 shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-95"
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
                             className="p-3 sm:px-4 md:px-6 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl md:rounded-2xl font-bold active:bg-slate-200 transition-all flex items-center justify-center gap-1.5 shrink-0"
                             title="Ver Tutorial"
                           >
                              <Info className="w-5 h-5 md:w-6 md:h-6" />
                              <span className="hidden sm:inline text-sm md:text-base">Tutorial</span>
                           </button>

                           <button
                             onClick={handleExerciseSuccess}
                             className="p-3 sm:px-4 md:px-6 bg-emerald-500 text-white rounded-xl md:rounded-2xl font-bold hover:bg-emerald-600 active:bg-emerald-700 transition-all flex items-center justify-center shrink-0"
                             title="Concluir O Movimento"
                           >
                              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                           </button>

                           <button
                             onClick={nextExercise}
                             className="p-3 sm:px-4 md:px-6 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white rounded-xl md:rounded-2xl font-bold active:bg-slate-300 transition-all flex items-center justify-center shrink-0"
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
                   <p className="text-slate-500 dark:text-slate-400 font-medium">{t('trainer_perfect_execution', 'Olha só como a execução foi perfeita.')}</p>
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

      {/* Weekly Workout Summary Report Modal (Card Compartilhável & PDF) */}
      <WorkoutSummaryReportModal 
        profile={profile}
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />
    </div>
  );
}
