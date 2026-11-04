import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Activity, Leaf, Utensils, Zap, ShoppingBag, Truck, Map, 
  Dumbbell, Moon, Droplets, Camera, Flame, ChevronRight, MessageCircle, AlertTriangle,
  Scale, Smile, Sparkles, Crown, ArrowUpRight, TrendingUp, Heart, Footprints,
  Mic, MicOff, HelpCircle, Calendar, X, CheckCircle2, Loader2, ChefHat,
  Bell, Clock, Volume2
} from 'lucide-react';
import { UserProfile, IntakeLog } from '../types';
import { playSfx, vibrate } from '../lib/sensory';
import { speak, stopSpeech } from '../lib/speech';
import { safeGet } from '../lib/storage';
import { DEFAULT_WEEKLY_PLAN } from './PersonalTrainer';
import { DashboardQuickTips } from './DashboardQuickTips';
import { ConnectedHealthWidget } from './ConnectedHealthWidget';
import { AdaptiveMealAdjustmentCard } from './AdaptiveMealAdjustmentCard';
import { WeeklyReport } from './WeeklyReport';
import { WeeklyNutritionChart } from './WeeklyNutritionChart';
import { DailyNutritionProgressCard } from './DailyNutritionProgressCard';
import { GlucoseSmartSnacksCard } from './GlucoseSmartSnacksCard';
import { RecipeCollectionsView } from './RecipeCollectionsView';
import { VoiceShortcutsModal } from './VoiceShortcutsModal';
import { NutritionalProgressRechartsRing } from './NutritionalProgressRechartsRing';
import { DailyEnergyLevelCard } from './DailyEnergyLevelCard';
import { DailyWorkoutTipCard } from './DailyWorkoutTipCard';
import { QuickWaterLogger } from './QuickWaterLogger';
import { EvolutionComparison } from './EvolutionComparison';
import { NutritionTipsCarousel } from './NutritionTipsCarousel';


const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04
    }
  }
} as const;

const staggerCardVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 280,
      damping: 24
    }
  }
} as const;

interface Assistant360Props {
  profile: UserProfile | null;
  onNavigate: (tabId: string) => void;
  onLogIntake?: (log: IntakeLog) => void;
  onUpdateProfile?: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
  activeTab?: string;
  addNotification?: (notif: { title: string; message: string; type: any }) => void;
}

export function Assistant360({ profile, onNavigate, onLogIntake, onUpdateProfile, activeTab = 'assistant360', addNotification }: Assistant360Props) {
  const { language, t } = useLanguage();
  const [activeTip, setActiveTip] = useState(0);
  const [isMaluSpeaking, setIsMaluSpeaking] = useState(false);

  const handleRemoveFavorite = (recipeId: string) => {
    if (!profile || !onUpdateProfile) return;
    const updatedFavorites = ((profile.favorites || []) as any[]).filter(r => (typeof r === 'string' ? r : r?.id) !== recipeId);
    onUpdateProfile(prev => prev ? { ...prev, favorites: updatedFavorites } : null);
  };

  const proactiveTips = useMemo(() => {
    return [
      { text: t("tip_hydration", "Your hydration goal needs 600ml to be completed today."), icon: <Droplets className="w-5 h-5 text-blue-500" />, type: 'warning' },
      { text: t("tip_protein", "Recommended post-workout protein intake: 35g."), icon: <Utensils className="w-5 h-5 text-emerald-500" />, type: 'suggestion' },
      { text: t("tip_walk", "Light 20-min walk recommended to stabilize blood sugar."), icon: <Activity className="w-5 h-5 text-amber-500" />, type: 'suggestion' },
      { text: t("tip_sleep", "Sleep quality last night reached 88%. Excellent physical recovery!"), icon: <Moon className="w-5 h-5 text-indigo-400" />, type: 'alert' }
    ];
  }, [t]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTip((prev) => (prev + 1) % proactiveTips.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [proactiveTips.length]);

  const isPremium = (profile as any)?.isPremium ?? false;

  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Next-Day Meal Plan State (Gemini API + Pantry & Restrictions)
  const [isGeneratingNextDayPlan, setIsGeneratingNextDayPlan] = useState(false);
  const [nextDayPlan, setNextDayPlan] = useState<any | null>(null);
  const [isNextDayPlanModalOpen, setIsNextDayPlanModalOpen] = useState(false);
  const [isNextDayPlanSaved, setIsNextDayPlanSaved] = useState(false);

  const handleGenerateNextDayMealPlan = async () => {
    setIsGeneratingNextDayPlan(true);
    playSfx('tap');
    vibrate(20);

    try {
      const pantryItems = (profile as any)?.pantryItems || (profile as any)?.fridgeItems || [
        'Ovos', 'Aveia', 'Banana', 'Azeite de oliva', 'Peito de frango', 'Batata doce', 'Arroz integral', 'Espinafre', 'Maçã', 'Queijo branco'
      ];

      const res = await fetch('/api/generate-next-day-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, pantryItems })
      });

      const data = await res.json();
      if (data.success && data.plan) {
        setNextDayPlan(data.plan);
        setIsNextDayPlanModalOpen(true);
        setIsNextDayPlanSaved(false);
        playSfx('success');
        vibrate([30, 50]);
        speak(
          language?.startsWith('pt')
            ? "Plano alimentar para amanhã gerado com sucesso pela Gemini API, considerando suas restrições e os ingredientes da sua despensa!"
            : "Next day meal plan generated successfully by Gemini API considering your profile restrictions and pantry items!",
          { voice: 'Aoede', lang: language }
        );
      } else if (res.status === 429 || data.error === 'quota_exceeded') {
        alert(language?.startsWith('pt') 
          ? "Cota diária de IA atingida. Por favor, tente novamente em algumas horas." 
          : "Daily AI quota reached. Please try again in a few hours.");
      } else {
        alert(language?.startsWith('pt') 
          ? "Não foi possível gerar o plano no momento. Tente novamente." 
          : "Could not generate the plan at this moment. Please try again.");
      }
    } catch (err) {
      console.error("Erro ao solicitar plano do dia seguinte:", err);
      alert(language?.startsWith('pt') 
        ? "Erro ao conectar com a API para gerar o plano." 
        : "Error connecting to the API to generate the plan.");
    } finally {
      setIsGeneratingNextDayPlan(false);
    }
  };

  const handleSaveNextDayPlan = () => {
    if (!nextDayPlan || !onUpdateProfile) return;
    playSfx('success');
    vibrate(40);

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    onUpdateProfile(prev => {
      if (!prev) return prev;
      const existingMealPlan = prev.mealPlan || {};
      const newPlanForTomorrow = {
        date: tomorrow,
        summary: nextDayPlan.summary,
        meals: {
          breakfast: nextDayPlan.meals.find((m: any) => m.type === 'breakfast'),
          lunch: nextDayPlan.meals.find((m: any) => m.type === 'lunch'),
          snack: nextDayPlan.meals.find((m: any) => m.type === 'snack'),
          dinner: nextDayPlan.meals.find((m: any) => m.type === 'dinner'),
        }
      };

      return {
        ...prev,
        mealPlan: {
          ...existingMealPlan,
          [tomorrow]: newPlanForTomorrow
        }
      };
    });

    setIsNextDayPlanSaved(true);
    speak(
      language?.startsWith('pt')
        ? "Plano para amanhã salvo no seu perfil com sucesso!"
        : "Tomorrow's meal plan saved to your profile!",
      { voice: 'Aoede', lang: language }
    );
  };

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language || 'pt-BR';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        const lower = transcript.toLowerCase().trim();
        setLastTranscript(transcript);

        // Natural Language Macro Update
        if (lower.includes('adicionar') && (lower.includes('grama') || lower.includes('gramas')) && (lower.includes('proteína') || lower.includes('carbo') || lower.includes('gordura'))) {
          const amountMatch = lower.match(/(\d+)/);
          if (amountMatch) {
            const amount = parseInt(amountMatch[1], 10);
            let macroType = '';
            if (lower.includes('proteína')) macroType = 'protein';
            else if (lower.includes('carbo')) macroType = 'carbs';
            else if (lower.includes('gordura')) macroType = 'fat';

            if (macroType && onUpdateProfile) {
              onUpdateProfile(prev => {
                if (!prev) return prev;
                const today = new Date().toISOString().split('T')[0];
                const updatedLogs = [...(prev.intakeLogs || [])];
                let lastLogIdx = -1;
                for (let i = updatedLogs.length - 1; i >= 0; i--) {
                  if (updatedLogs[i].date?.startsWith(today)) {
                    lastLogIdx = i;
                    break;
                  }
                }
                
                if (lastLogIdx !== -1) {
                  updatedLogs[lastLogIdx] = {
                    ...updatedLogs[lastLogIdx],
                    actual: {
                      ...updatedLogs[lastLogIdx].actual,
                      [macroType]: (updatedLogs[lastLogIdx].actual?.[macroType as 'protein' | 'carbs' | 'fat'] || 0) + amount
                    }
                  };
                } else {
                  updatedLogs.push({
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                    mealId: 'voice_macro',
                    mealType: 'snack',
                    recipeName: 'Adição manual por voz',
                    planned: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
                    actual: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, [macroType]: amount },
                    adjusted: false
                  });
                }
                return { ...prev, intakeLogs: updatedLogs };
              });
              speak(`${amount} gramas de ${macroType === 'protein' ? 'proteína' : macroType === 'carbs' ? 'carboidratos' : 'gordura'} adicionados.`, { voice: 'Aoede', lang: language });
            }
          }
        } else if (lower.includes('receita') || lower.includes('recipe') || lower.includes('prato') || lower.includes('cozinha')) {
          speak(language?.startsWith('pt') ? "Navegando para Receitas." : "Navigating to Recipes.", { voice: 'Aoede', lang: language });
          onNavigate('quickdishes');
          setIsVoiceActive(false);
          recognition.stop();
        } else if (lower.includes('início') || lower.includes('home') || lower.includes('geral') || lower.includes('painel')) {
          speak(language?.startsWith('pt') ? "Voltando ao início." : "Returning home.", { voice: 'Aoede', lang: language });
          onNavigate('assistant360');
          setIsVoiceActive(false);
          recognition.stop();
        } else if (lower.includes('perfil') || lower.includes('profile') || lower.includes('conta')) {
          speak(language?.startsWith('pt') ? "Abrindo seu perfil." : "Opening your profile.", { voice: 'Aoede', lang: language });
          onNavigate('profile');
          setIsVoiceActive(false);
          recognition.stop();
        } else if (lower.includes('metas') || lower.includes('plano') || lower.includes('meta')) {
          speak(language?.startsWith('pt') ? "Abrindo suas metas." : "Opening your plan.", { voice: 'Aoede', lang: language });
          onNavigate('plan');
          setIsVoiceActive(false);
          recognition.stop();
        } else if (lower.includes('treino') || lower.includes('exercício') || lower.includes('fitness')) {
          speak(language?.startsWith('pt') ? "Iniciando modo de treino." : "Starting workout studio.", { voice: 'Aoede', lang: language });
          onNavigate('trainer');
          setIsVoiceActive(false);
          recognition.stop();
        } else if (lower.includes('glicose') || lower.includes('açúcar')) {
          speak(language?.startsWith('pt') ? "Abrindo monitor de glicose." : "Opening glucose tracker.", { voice: 'Aoede', lang: language });
          onNavigate('glucose');
          setIsVoiceActive(false);
          recognition.stop();
        } else if (lower.includes('água') || lower.includes('hidratação')) {
          speak(language?.startsWith('pt') ? "Abrindo painel de hidratação." : "Opening hydration panel.", { voice: 'Aoede', lang: language });
          onNavigate('habits');
          setIsVoiceActive(false);
          recognition.stop();
        } else if (lower.includes('coach') || lower.includes('malu') || lower.includes('chat')) {
          speak(language?.startsWith('pt') ? "Abrindo chat com Malu." : "Opening chat with Malu.", { voice: 'Aoede', lang: language });
          onNavigate('coach');
          setIsVoiceActive(false);
          recognition.stop();
        } else if (lower.includes('próximo') || lower.includes('next')) {
          window.dispatchEvent(new CustomEvent('recipe-next-step'));
          speak(language?.startsWith('pt') ? "Próximo passo." : "Next step.", { voice: 'Aoede', lang: language });
        } else if (lower.includes('anterior') || lower.includes('voltar') || lower.includes('back')) {
          window.dispatchEvent(new CustomEvent('recipe-prev-step'));
          speak(language?.startsWith('pt') ? "Passo anterior." : "Previous step.", { voice: 'Aoede', lang: language });
        } else if (lower.includes('repetir') || lower.includes('repeat')) {
          window.dispatchEvent(new CustomEvent('recipe-repeat-step'));
        } else if (lower.includes('parar') || lower.includes('stop')) {
          stopSpeech();
          setIsVoiceActive(false);
          recognition.stop();
        }
      };

      recognition.onerror = () => { setIsVoiceActive(false); };
      recognition.onend = () => { setIsVoiceActive(false); };
      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [language, onNavigate]);

  const toggleVoiceRecognition = () => {
    if (isVoiceActive) {
      recognitionRef.current?.stop();
      setIsVoiceActive(false);
      speak(language?.startsWith('pt') ? "Comando de voz desativado." : "Voice command deactivated.", { voice: 'Aoede', lang: language });
    } else {
      setLastTranscript('');
      try {
        recognitionRef.current?.start();
        setIsVoiceActive(true);
        speak(language?.startsWith('pt') ? "Ouvindo... Diga para onde quer ir ou navegue pelas instruções da receita." : "Listening... Say where you want to go or navigate recipe instructions.", { voice: 'Aoede', lang: language });
      } catch (e) {
        console.warn("Failed to start speech recognition:", e);
      }
    }
  };

  const speakDailySummary = () => {
    const today = new Date().toISOString().split('T')[0];
    const plan = profile?.masterPlan;
    const meals = profile?.mealPlan?.[today]?.meals;
    
    let summary = language?.startsWith('pt') ? "Olá! Aqui está o seu resumo diário." : "Hello! Here is your daily summary.";
    
    if (plan) {
      summary += language?.startsWith('pt') 
        ? ` Sua meta é de ${plan.dailyCalories} calorias, com ${plan.macros.protein} gramas de proteína, ${plan.macros.carbs} de carboidratos e ${plan.macros.fat} de gorduras.`
        : ` Your goal is ${plan.dailyCalories} calories, with ${plan.macros.protein} grams of protein, ${plan.macros.carbs} of carbs, and ${plan.macros.fat} of fat.`;
    }
    
    if (meals) {
      const mealNames = Object.entries(meals)
        .filter(([_, recipe]) => !!recipe)
        .map(([type, recipe]) => `${type === 'breakfast' ? (language?.startsWith('pt') ? 'café da manhã' : 'breakfast') : type}: ${recipe!.name}`)
        .join(', ');
      summary += language?.startsWith('pt') 
        ? ` Suas refeições planejadas são: ${mealNames}.`
        : ` Your scheduled meals are: ${mealNames}.`;
    }
    
    speak(summary, { voice: 'Aoede', lang: language });
  };

  // Compute daily metrics safely
  const today = new Date().toISOString().split('T')[0];
  
  // Water
  const waterLogs = profile?.hydrationLogs?.filter(l => l.date.startsWith(today)) || [];
  const waterCurrent = waterLogs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const waterTarget = profile?.waterGoal || 2500;
  const waterPercent = Math.min(100, Math.round((waterCurrent / waterTarget) * 100));

  // Calories
  const intakeLogs = profile?.intakeLogs?.filter(l => l.date.startsWith(today)) || [];
  const caloriesCurrent = intakeLogs.reduce((acc, curr) => acc + (curr.actual?.calories || curr.planned?.calories || 0), 0);
  const caloriesTarget = profile?.masterPlan?.dailyCalories || 2000;
  const caloriesPercent = Math.min(100, Math.round((caloriesCurrent / caloriesTarget) * 100));

  // Weight & BMI
  const currentWeight = profile?.weight || 70;
  const heightInM = (profile?.height || 175) / 100;
  const bmi = (currentWeight / (heightInM * heightInM)).toFixed(1);
  
  let bmiCategory = t('normal', 'Normal');
  const bmiNum = parseFloat(bmi);
  if (bmiNum < 18.5) bmiCategory = t('underweight', 'Abaixo do peso');
  else if (bmiNum >= 25 && bmiNum < 30) bmiCategory = t('overweight', 'Sobrepeso');
  else if (bmiNum >= 30) bmiCategory = t('obesity', 'Obesidade');

  // Sleep
  const sleepLogs = profile?.sleepLogs?.filter(s => s.date.startsWith(today)) || [];
  const sleepHours = sleepLogs.length > 0 ? sleepLogs[sleepLogs.length - 1].durationHours : 7.5;

  // Mood
  const moodLogs = profile?.emotionalLogs?.filter(m => m.date.startsWith(today)) || [];
  const currentMood = moodLogs.length > 0 ? moodLogs[moodLogs.length - 1].mood : t('great', 'Ótimo');

  // Macro calculation for charts
  const currentProtein = Math.round(intakeLogs.reduce((acc, l) => acc + (l.actual?.protein || l.planned?.protein || 0), 0));
  const currentCarbs = Math.round(intakeLogs.reduce((acc, l) => acc + (l.actual?.carbs || l.planned?.carbs || 0), 0));
  const currentFat = Math.round(intakeLogs.reduce((acc, l) => acc + (l.actual?.fat || l.planned?.fat || 0), 0));

  const weight = profile?.weight || 70;
  const targetCalories = profile?.masterPlan?.dailyCalories || 2000;
  const targetProtein = Math.round(profile?.masterPlan?.macros?.protein || (weight * 1.7));
  const targetCarbs = Math.round(profile?.masterPlan?.macros?.carbs || ((targetCalories * 0.45) / 4));
  const targetFat = Math.round(profile?.masterPlan?.macros?.fat || ((targetCalories * 0.25) / 9));

  // Next workout calculation from Personal Trainer & Notification System
  const todayDayKey = useMemo(() => {
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayKeys[new Date().getDay()];
  }, []);

  const todayWorkout = useMemo(() => {
    const weeklyPlan = profile?.weeklyWorkoutPlan || DEFAULT_WEEKLY_PLAN;
    return weeklyPlan?.days?.find(d => d.dayKey === todayDayKey) || weeklyPlan?.days?.[new Date().getDay()];
  }, [profile?.weeklyWorkoutPlan, todayDayKey]);

  const workoutRemindersEnabled = profile?.workoutRemindersEnabled !== false && safeGet('nutri-workout-reminders') !== 'false';
  const scheduledWorkoutTime = profile?.workoutReminderTimes?.[todayDayKey] || (profile as any)?.workoutReminderTime || safeGet('nutri-workout-time') || '18:00';

  const isWorkoutCompletedToday = useMemo(() => {
    const todayDateStr = new Date().toISOString().split('T')[0];
    return Boolean(profile?.workoutLogs?.some(log => log.date?.startsWith(todayDateStr) && log.completed));
  }, [profile?.workoutLogs]);

  const workoutTimingStatus = useMemo(() => {
    const now = new Date();
    const [h, m] = scheduledWorkoutTime.split(':').map(Number);
    const targetMins = (isNaN(h) ? 18 : h) * 60 + (isNaN(m) ? 0 : m);
    const currMins = now.getHours() * 60 + now.getMinutes();
    const diff = targetMins - currMins;
    const isUnder30 = !isWorkoutCompletedToday && diff > 0 && diff <= 30;

    if (isWorkoutCompletedToday) {
      return { 
        status: 'completed', 
        label: t('workout_completed_badge', 'Treino Concluído Hoje!'), 
        urgency: 'done' as const,
        countdownText: t('workout_done_streak', 'Meta diária atingida!'),
        isUnder30Minutes: false,
        diffMinutes: diff
      };
    }
    if (isUnder30) {
      return { 
        status: 'imminent', 
        label: t('workout_starts_soon', `Inicia em ${diff} min (${scheduledWorkoutTime})`), 
        urgency: 'high' as const,
        countdownText: `Inicia em ${diff} min`,
        isUnder30Minutes: true,
        diffMinutes: diff
      };
    }
    if (diff > 30 && diff <= 60) {
      return { 
        status: 'upcoming', 
        label: t('workout_starts_soon', `Inicia em ${diff} min (${scheduledWorkoutTime})`), 
        urgency: 'medium' as const,
        countdownText: `Faltam ${diff} minutos`,
        isUnder30Minutes: false,
        diffMinutes: diff
      };
    }
    if (diff <= 0 && diff >= -120) {
      return { 
        status: 'now', 
        label: t('workout_time_now', `Horário de Treino Agora (${scheduledWorkoutTime})`), 
        urgency: 'urgent' as const,
        countdownText: 'Em andamento',
        isUnder30Minutes: false,
        diffMinutes: diff
      };
    }
    return { 
      status: 'scheduled', 
      label: t('workout_scheduled_for', `Hoje às ${scheduledWorkoutTime}`), 
      urgency: 'normal' as const,
      countdownText: `Às ${scheduledWorkoutTime}`,
      isUnder30Minutes: false,
      diffMinutes: diff
    };
  }, [scheduledWorkoutTime, isWorkoutCompletedToday, t]);

  const handleTriggerWorkoutNotification = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSfx('crystal');
    vibrate([40, 60, 40]);

    if (addNotification) {
      addNotification({
        title: `🏋️ Próximo Treino: ${todayWorkout?.workoutTitle || 'Treino do Dia'}!`,
        message: `Seu treino está programado para às ${scheduledWorkoutTime}. Foco: ${todayWorkout?.workoutFocus || 'Calistenia e força'}. Vamos lá!`,
        type: 'success'
      });
    }

    speak(
      language?.startsWith('pt')
        ? `Lembrete do Personal Trainer! Seu próximo treino de hoje é ${todayWorkout?.workoutTitle || 'Treino do Dia'}, agendado para às ${scheduledWorkoutTime}. Foco: ${todayWorkout?.workoutFocus || 'Evolução física'}.`
        : `Personal Trainer reminder! Your next workout today is ${todayWorkout?.workoutTitle || 'Daily Workout'}, scheduled for ${scheduledWorkoutTime}. Focus: ${todayWorkout?.workoutFocus || 'Fitness progression'}.`,
      { voice: 'Aoede', lang: language }
    );
  };


  const features = [
    { id: 'quickdishes', labelKey: 'feature_quickdishes', descKey: 'desc_quickdishes', defaultLabel: 'Pratos Rápidos IA', defaultDesc: '3 opções em 1 toque', icon: <Flame className="w-5 h-5 text-orange-500" /> },
    { id: 'generator', labelKey: 'feature_generator', descKey: 'desc_generator', defaultLabel: 'Receitas com IA', defaultDesc: 'Geradas sob medida', icon: <Utensils className="w-5 h-5 text-emerald-500" /> },
    { id: 'coach', labelKey: 'feature_coach', descKey: 'desc_coach', defaultLabel: 'NutriCoach IA', defaultDesc: 'Análise de dieta 24/7', icon: <Zap className="w-5 h-5 text-emerald-400" /> },
    { id: 'analyzer', labelKey: 'feature_analyzer', descKey: 'desc_analyzer', defaultLabel: 'Scanner de Prato', defaultDesc: 'Fotografe e analise', icon: <Camera className="w-5 h-5 text-emerald-500" /> },
    { id: 'smartplate', labelKey: 'feature_smartplate', descKey: 'desc_smartplate', defaultLabel: 'Restaurante Inteligente', defaultDesc: 'Combine opções de fora', icon: <Camera className="w-5 h-5 text-emerald-400" /> },
    { id: 'trainer', labelKey: 'feature_trainer', descKey: 'desc_trainer', defaultLabel: 'Treino Personalizado', defaultDesc: 'Exercícios guiados', icon: <Dumbbell className="w-5 h-5 text-emerald-500" /> },
    { id: 'fridge', labelKey: 'feature_fridge', descKey: 'desc_fridge', defaultLabel: 'Geladeira Inteligente', defaultDesc: 'Aproveitamento 100%', icon: <Sparkles className="w-5 h-5 text-emerald-400" /> },
    { id: 'habits', labelKey: 'feature_habits', descKey: 'desc_habits', defaultLabel: 'Hábitos & Sono', defaultDesc: 'Ritmo circadiano', icon: <Moon className="w-5 h-5 text-[#38BDF8]" /> },
    { id: 'herbs', labelKey: 'feature_herbs', descKey: 'desc_herbs', defaultLabel: 'Ervas & Fitoterapia', defaultDesc: 'Infusões e remédios', icon: <Leaf className="w-5 h-5 text-emerald-500" /> },
    { id: 'market', labelKey: 'feature_market', descKey: 'desc_market', defaultLabel: 'Marketplace Orgânico', defaultDesc: 'Insumos selecionados', icon: <ShoppingBag className="w-5 h-5 text-amber-500" /> },
  ];

  return (
    <motion.div 
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-full px-2 sm:px-4 space-y-8 pb-32 pt-2 flex flex-col items-center"
    >
      
      {/* 1. Hero AI Avatar Card */}
      <motion.div 
        variants={staggerCardVariants}
        className={`relative w-full rounded-[32px] p-6 sm:p-10 overflow-hidden transition-all duration-500 mx-auto ${
          isPremium 
            ? 'bg-gradient-to-br from-[#151B23] via-[#1A222C] to-[#0F141A] border border-[#D8B14A]/40 shadow-[0_12px_40px_rgba(216,177,74,0.15)]' 
            : 'bg-gradient-to-br from-[#151B23] via-[#1B232E] to-[#0B0F14] border border-[#232C39] shadow-[0_12px_36px_rgba(0,0,0,0.4)]'
        }`}
      >

        
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-[90px] pointer-events-none" />
        {isPremium && (
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#D8B14A]/10 blur-[90px] pointer-events-none" />
        )}

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center">
          
          {/* Avatar Section with Idle Breathing & Glow */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-center sm:text-left w-full">
            <div className="relative group cursor-pointer shrink-0" onClick={() => onNavigate('coach')}>
              
              {/* Breathing Glow Outer Ring */}
              <div className={`absolute inset-0 rounded-full blur-md transition-all duration-1000 ${
                isPremium 
                  ? 'bg-gradient-to-tr from-[#D8B14A] to-[#16C784] opacity-60 animate-idle-breathe' 
                  : 'bg-emerald-500/40 opacity-50 animate-idle-breathe'
              }`} />
              
              {/* Outer Border Halo */}
              <div className={`relative w-32 h-32 sm:w-36 sm:h-36 rounded-full p-1 transition-all duration-500 ${
                isPremium 
                  ? 'bg-gradient-to-tr from-[#D8B14A] via-[#F3E5AB] to-[#16C784] shadow-[0_0_25px_rgba(216,177,74,0.3)]' 
                  : 'bg-gradient-to-tr from-[#16C784] to-[#10B981] shadow-[0_0_25px_rgba(22,199,132,0.3)]'
              }`}>
                <div className="w-full h-full rounded-full bg-[#0B0F14] overflow-hidden flex items-center justify-center relative">
                  <img 
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" 
                    alt="NutriAI Assistant" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Status Indicator */}
                  <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-[#16C784] border-2 border-[#0B0F14] shadow-md animate-pulse" />
                </div>
              </div>
            </div>

            <div className="space-y-3 flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-semibold text-emerald-400 backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>NutriAI Coach 360°</span>
                {isPremium && (
                  <span className="ml-1 px-2.5 py-0.5 rounded-full bg-[#D8B14A]/20 text-[#D8B14A] border border-[#D8B14A]/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" /> Premium
                  </span>
                )}
              </div>

              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
                {t('greeting_hello', 'Hello')}, {profile?.name?.split(' ')[0] || t('user', 'User')}!
              </h2>

              <p className="text-base text-[#B5BDC9] max-w-xl leading-relaxed font-sans">
                "{t('today_overview_quote', 'Your metabolism is operating at an optimal level today. Remember to maintain continuous hydration.')}"
              </p>
            </div>
          </div>

          {/* Quick Chat Action */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              playSfx('tap');
              vibrate(10);
              onNavigate('coach');
            }}
            className={`px-6 py-3.5 rounded-full font-display font-semibold text-sm flex items-center gap-2.5 shadow-lg shrink-0 cursor-pointer transition-all ${
              isPremium 
                ? 'bg-gradient-to-r from-[#D8B14A] to-[#B8860B] text-slate-950 shadow-[0_6px_20px_rgba(216,177,74,0.3)] hover:opacity-95' 
                : 'bg-gradient-to-r from-[#16C784] to-[#10B981] text-white shadow-[0_6px_20px_rgba(22,199,132,0.3)] hover:opacity-95'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t('btn_talk_malu', 'Talk to NutriAI')}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* 1.5. Web Speech API Hands-Free Voice Control Card */}
      <motion.div 
        variants={staggerCardVariants}
        className="w-full card-premium p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border border-emerald-500/30 mx-auto"
      >
        <div className="flex items-center gap-4">
          <div className={`p-3.5 rounded-2xl flex items-center justify-center transition-all ${
            isVoiceActive 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 animate-pulse' 
              : 'bg-emerald-500/20 text-emerald-500'
          }`}>
            {isVoiceActive ? <Mic className="w-6 h-6 animate-bounce" /> : <MicOff className="w-6 h-6" />}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" />
              <span>{t('hands_free_voice_nav', 'Navegação Hands-Free por Voz (Malu / Aoede)')}</span>
            </div>
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {isVoiceActive ? t('listening_commands', 'Ouvindo comandos (Início, Receitas, Metas, Próximo)...') : t('voice_control_prompt', 'Fale com a Malu para navegar sem as mãos')}
            </h4>
            {lastTranscript && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                "{lastTranscript}"
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playSfx('tap');
              vibrate(15);
              speakDailySummary();
            }}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 shadow transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{t('voice_summary_btn', 'Resumo')}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playSfx('tap');
              vibrate(15);
              setIsShortcutsOpen(true);
            }}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 shadow transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>{t('voice_shortcuts_btn', 'Atalhos')}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playSfx('tap');
              vibrate(20);
              toggleVoiceRecognition();
            }}
            className={`px-6 py-3 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
              isVoiceActive
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
            }`}
          >
            {isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isVoiceActive ? t('stop_listening', 'Parar Voz') : t('start_voice', 'Ativar Voz')}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* 2. Featured Spotlight: GERAR PRATOS RÁPIDOS */}
      <motion.div 
        variants={staggerCardVariants}
        onClick={() => {
          playSfx('tap');
          vibrate(20);
          onNavigate('quickdishes');
        }}
        className="relative w-full overflow-hidden rounded-[32px] bg-gradient-to-r from-orange-500/15 via-emerald-500/10 to-teal-500/15 p-6 sm:p-7 border border-orange-500/30 hover:border-orange-500/60 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group backdrop-blur-md mx-auto"
      >

        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-300 shrink-0">
              <Flame className="w-7 h-7 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[11px] font-bold tracking-wide uppercase">
                <Sparkles className="w-3 h-3" />
                <span>{t('1 toque • fotos ia • 3 opções', '1 Tap • AI Photos • 3 Options')}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('🍽️ pratos rápidos com ia', '🍽️ Quick Dishes with AI')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                {t('quick_dishes_desc', 'Choose Weight Loss, Muscle Gain, or Fit Snacks and receive 3 immediate suggestions with realistic photos and macros.')}
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 shrink-0 group-hover:shadow-orange-500/50 transition-all"
          >
            <span>{t('gerar pratos rápidos', 'GENERATE QUICK DISHES')}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
      </motion.div>

      {/* 2.5. Featured Spotlight: PLANO ALIMENTAR DE AMANHÃ (GEMINI API + DESPANSA & RESTRIÇÕES) */}
      <motion.div 
        variants={staggerCardVariants}
        className="relative w-full overflow-hidden rounded-[32px] bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-cyan-500/15 p-6 sm:p-7 border border-teal-500/30 hover:border-teal-500/60 shadow-lg hover:shadow-2xl transition-all duration-300 backdrop-blur-md mx-auto"
      >
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 shrink-0">
              <ChefHat className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 text-[11px] font-bold tracking-wide uppercase">
                <Sparkles className="w-3 h-3" />
                <span>{t('gemini_api_pantry_badge', 'Gemini API • Despensa & Restrições')}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('next_day_meal_plan_title', '📋 Plano Alimentar de Amanhã')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                {t('next_day_meal_plan_desc', 'Gere com a Gemini API um menu completo para o dia seguinte que respeita suas restrições e aproveita os ingredientes da sua despensa.')}
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            disabled={isGeneratingNextDayPlan}
            onClick={handleGenerateNextDayMealPlan}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 shrink-0 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingNextDayPlan ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gerando Menu de Amanhã...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>GERAR PLANO PARA AMANHÃ</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>


      {/* 2.7. INDICADOR VISUAL DE 'PRÓXIMO TREINO' (INTEGRAÇÃO PERSONAL TRAINER + NOTIFICAÇÕES) */}
      {todayWorkout && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={
            workoutTimingStatus.isUnder30Minutes
              ? {
                  opacity: 1,
                  y: 0,
                  scale: [1, 1.018, 1],
                  boxShadow: [
                    "0 10px 25px -5px rgba(168, 85, 247, 0.25), 0 0 0 0px rgba(168, 85, 247, 0.35)",
                    "0 22px 40px -5px rgba(168, 85, 247, 0.45), 0 0 0 8px rgba(168, 85, 247, 0.2)",
                    "0 10px 25px -5px rgba(168, 85, 247, 0.25), 0 0 0 0px rgba(168, 85, 247, 0.35)"
                  ]
                }
              : { opacity: 1, y: 0, scale: 1 }
          }
          transition={
            workoutTimingStatus.isUnder30Minutes
              ? {
                  scale: {
                    duration: 2.4,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut"
                  },
                  boxShadow: {
                    duration: 2.4,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut"
                  },
                  opacity: { duration: 0.4 },
                  y: { duration: 0.4 }
                }
              : { duration: 0.4 }
          }
          onClick={() => {
            playSfx('tap');
            vibrate(15);
            onNavigate('trainer');
          }}
          className={`relative w-full overflow-hidden rounded-[32px] p-6 sm:p-7 border transition-all duration-300 cursor-pointer group backdrop-blur-md mx-auto ${
            isWorkoutCompletedToday
              ? 'bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border-emerald-500/40 hover:border-emerald-500/70 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25'
              : workoutTimingStatus.isUnder30Minutes
              ? 'bg-gradient-to-r from-purple-950/85 via-indigo-950/75 to-fuchsia-950/65 border-2 border-purple-400 hover:border-purple-300 ring-2 ring-purple-500/40'
              : workoutTimingStatus.urgency === 'urgent'
              ? 'bg-gradient-to-r from-purple-950/80 via-indigo-950/70 to-fuchsia-950/60 border-2 border-purple-400 hover:border-purple-300 shadow-2xl shadow-purple-500/30 ring-2 ring-purple-500/40'
              : 'bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-purple-950/40 border border-purple-500/40 hover:border-purple-500/70 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/25'
          }`}
        >
          {/* Ambient Background Glow */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 rounded-full bg-purple-600/10 blur-2xl pointer-events-none" />

          {/* Gentle Pulsing Ambient Glow layer when < 30 min */}
          {workoutTimingStatus.isUnder30Minutes && (
            <motion.div
              animate={{ opacity: [0.12, 0.32, 0.12], scale: [1, 1.05, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-fuchsia-600/15 to-indigo-600/20 rounded-[32px] pointer-events-none"
            />
          )}

          <div className="relative z-10 flex flex-col gap-5">
            {/* Top Bar: Badges & Notification Status */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 text-xs font-bold uppercase tracking-wider border border-purple-500/30 backdrop-blur-sm">
                  <Dumbbell className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('next_workout_badge', 'Próximo Treino')}</span>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-white/10 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  {todayWorkout.dayName}
                </span>

                {isWorkoutCompletedToday ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('completed_badge', 'Concluído Hoje')}</span>
                  </span>
                ) : workoutTimingStatus.isUnder30Minutes ? (
                  <motion.span 
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                    className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/25 text-amber-300 text-xs font-extrabold border border-amber-400/50 shadow-md shadow-amber-500/20"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>⚡ {workoutTimingStatus.countdownText}</span>
                  </motion.span>
                ) : workoutTimingStatus.urgency === 'urgent' || workoutTimingStatus.urgency === 'high' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-300 text-xs font-extrabold border border-amber-500/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>{workoutTimingStatus.countdownText}</span>
                  </span>
                ) : null}
              </div>

              {/* Notification System Integration Info & Sound Trigger */}
              <div className="flex items-center gap-2">
                <div 
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    workoutRemindersEnabled 
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                  }`}
                  title={workoutRemindersEnabled ? `Lembrete diário ativo para às ${scheduledWorkoutTime}` : 'Lembretes de treino desativados'}
                >
                  <Bell className={`w-3.5 h-3.5 ${workoutRemindersEnabled ? 'text-purple-400 animate-bounce' : 'text-slate-400'}`} />
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>{scheduledWorkoutTime}</span>
                  {workoutRemindersEnabled && (
                    <span className="hidden sm:inline text-[11px] font-normal opacity-80">
                      • {t('reminder_active', 'Lembrete Ativo')}
                    </span>
                  )}
                </div>

                {/* Button to test notification & listen with Malu Aoede voice */}
                <button
                  type="button"
                  onClick={handleTriggerWorkoutNotification}
                  className="p-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-600 dark:text-purple-300 border border-purple-500/30 hover:border-purple-500/60 transition-all cursor-pointer shadow-sm flex items-center justify-center shrink-0"
                  title="Testar notificação no sistema e ouvir lembrete da Malu"
                >
                  <Volume2 className="w-4 h-4 text-purple-400" />
                </button>
              </div>
            </div>

            {/* Main Info Row: Icon, Title, Focus & Tags */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                  isWorkoutCompletedToday 
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30' 
                    : 'bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-600 shadow-purple-500/30'
                }`}>
                  <Dumbbell className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>{todayWorkout.workoutTitle}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                      {todayWorkout.intensity}
                    </span>
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                    {todayWorkout.workoutFocus}
                  </p>

                  {/* Target Muscles & Exercises Tag Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {todayWorkout.targetMuscles?.map((muscle, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-white/40 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-semibold"
                      >
                        {muscle}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-[11px] font-bold">
                      {todayWorkout.exercises?.length || 4} exercícios
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:self-center shrink-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    playSfx('tap');
                    vibrate(20);
                    onNavigate('trainer');
                  }}
                  className={`px-5 py-3 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                    isWorkoutCompletedToday 
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/30' 
                      : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/30 group-hover:shadow-purple-500/50'
                  }`}
                >
                  <Dumbbell className="w-4 h-4" />
                  <span>
                    {isWorkoutCompletedToday 
                      ? t('view_workout_history', 'VER NO PERSONAL TRAINER') 
                      : t('start_workout_now', 'INICIAR TREINO AGORA')}
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </div>
            </div>

            {/* Nutrition Context Footer: Connecting nutrition and training */}
            {todayWorkout.nutritionContext && (
              <div className="pt-3 border-t border-purple-500/20 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-purple-700 dark:text-purple-300">Dica Nutricional Sincronizada:</strong> {todayWorkout.nutritionContext}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 3. Proactive AI Banner */}
      <motion.div 
        key={activeTip}
        variants={staggerCardVariants}
        className="card-premium w-full p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:border-emerald-500/40 transition-all mx-auto"
        onClick={() => onNavigate('habits')}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl shrink-0">
            {proactiveTips[activeTip]?.icon}
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-[#B5BDC9] uppercase tracking-wider mb-0.5">
              {t('realtime_insight', 'Real-time Insight')}
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white leading-snug">
              {proactiveTips[activeTip]?.text}
            </p>
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#151B23] flex items-center justify-center text-slate-400 hover:text-emerald-500 dark:hover:text-[#16C784] transition-colors shrink-0">
          <ChevronRight className="w-5 h-5" />
        </div>
      </motion.div>

      {/* NOVO: Sistema de Dicas Rápidas Inteligentes Conectado ao Histórico */}
      <motion.div variants={staggerCardVariants} className="w-full mx-auto">
        <DashboardQuickTips 
          profile={profile} 
          onNavigate={onNavigate} 
          onLogIntake={onLogIntake} 
        />
      </motion.div>

      {/* DICAS RÁPIDAS DE NUTRIÇÃO BASEADAS EM EVIDÊNCIAS (GEMINI API) */}
      <motion.div variants={staggerCardVariants} className="w-full mx-auto">
        <NutritionTipsCarousel profile={profile} />
      </motion.div>

      {/* 3. Resumo do Dia / Daily Health Metrics Grid */}
      <motion.div variants={staggerCardVariants} className="space-y-4 w-full mx-auto">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#16C784]" />
            {t('daily_health_summary', 'Resumo da Sua Saúde Hoje')}
          </h3>
          <span className="text-xs font-semibold text-slate-400 dark:text-[#B5BDC9]">
            {new Date().toLocaleDateString(language || 'pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>

        <motion.div variants={staggerCardVariants} className="w-full">
           <QuickWaterLogger profile={profile} onUpdateProfile={onUpdateProfile} />
        </motion.div>


        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Calories Metric */}
          <div className="card-premium p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-[#16C784]">
                <Flame className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#16C784] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                {caloriesPercent}%
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-[#B5BDC9]">{t('metric_calories_goal', 'Meta de Calorias')}</span>
              <div className="text-xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
                {caloriesCurrent} <span className="text-xs font-normal text-slate-400">/ {caloriesTarget} kcal</span>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-[#232C39] h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#10B981] via-[#16C784] to-[#34D399] transition-all duration-700"
                style={{ width: `${caloriesPercent}%` }}
              />
            </div>
          </div>

          {/* Calories Metric */}
          <div className="card-premium p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-[#16C784]">
                <Flame className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#16C784] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                {caloriesPercent}%
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-[#B5BDC9]">{t('metric_calories_goal', 'Meta de Calorias')}</span>
              <div className="text-xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
                {caloriesCurrent} <span className="text-xs font-normal text-slate-400">/ {caloriesTarget} kcal</span>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-[#232C39] h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#10B981] via-[#16C784] to-[#34D399] transition-all duration-700"
                style={{ width: `${caloriesPercent}%` }}
              />
            </div>
          </div>

          {/* Weight & BMI */}
          <div className="card-premium p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-500">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                IMC {bmi}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-[#B5BDC9]">{t('metric_weight_bmi', 'Peso & Classificação')}</span>
              <div className="text-xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
                {currentWeight} <span className="text-xs font-normal text-slate-400">kg</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-[#B5BDC9] block mt-0.5">
                {bmiCategory}
              </span>
            </div>
          </div>

          {/* Sleep & Mood */}
          <div className="card-premium p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500">
                <Moon className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                {currentMood}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-[#B5BDC9]">{t('metric_sleep_mood', 'Sono & Humor')}</span>
              <div className="text-xl font-display font-bold text-slate-900 dark:text-white mt-0.5">
                {sleepHours}h <span className="text-xs font-normal text-slate-400">{t('hours_slept', 'dormidas')}</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-500 block mt-0.5">
                {t('high_recovery', 'Recuperação Alta')}
              </span>
            </div>
          </div>

        </div>

        {/* NÍVEL DE ENERGIA DIÁRIO & CHECK-IN EMOCIONAL */}
        <motion.div variants={staggerCardVariants} className="w-full">
          <DailyEnergyLevelCard
            profile={profile}
            onUpdateProfile={onUpdateProfile}
            onNavigate={onNavigate}
          />
        </motion.div>

        {/* PROGRESSO NUTRICIONAL DIÁRIO DE MACRONUTRIENTES COM ANÉIS CIRCULARES */}
        <motion.div variants={staggerCardVariants} className="w-full">
          <DailyNutritionProgressCard
            profile={profile}
            onNavigate={onNavigate}
          />
        </motion.div>

        {/* RING CHART RECHARTS */}
        <motion.div variants={staggerCardVariants} className="card-premium p-6 rounded-[32px] w-full border border-slate-200/80 dark:border-slate-800 bg-[#151B23]/90 dark:bg-slate-900/60 shadow-md">
           <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-2">Meta Nutricional</h3>
           <NutritionalProgressRechartsRing profile={profile} />
        </motion.div>

        {/* RECHARTS MACRONUTRIENT PROGRESS CHART */}
        <motion.div variants={staggerCardVariants} className="card-premium p-6 sm:p-8 rounded-[32px] w-full border border-slate-200/80 dark:border-slate-800 bg-[#151B23]/90 dark:bg-slate-900/60 shadow-md relative overflow-hidden">
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-6">
            {t('macro_chart_title', 'Progresso de Macronutrientes (Intake vs Meta)')}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Proteína', actual: currentProtein, goal: targetProtein, fill: '#10B981' },
                  { name: 'Carbos', actual: currentCarbs, goal: targetCarbs, fill: '#F59E0B' },
                  { name: 'Gorduras', actual: currentFat, goal: targetFat, fill: '#38BDF8' },
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="actual" name="Consumido (g)" fill="#8884d8" />
                <Bar dataKey="goal" name="Meta (g)" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>


        {/* SUGESTÕES DE LANCHES RÁPIDOS BASEADOS EM GLICEMIA E HORÁRIO */}
        <motion.div variants={staggerCardVariants} className="w-full">
          <GlucoseSmartSnacksCard
            profile={profile}
            onNavigate={onNavigate}
          />
        </motion.div>

        {/* WIDGET DE SAÚDE CONECTADA (Google Fit / Apple Health) */}
        <motion.div variants={staggerCardVariants} className="w-full">
          <ConnectedHealthWidget
            profile={profile}
            onNavigate={onNavigate}
            onUpdateProfile={onUpdateProfile}
          />
        </motion.div>

        {/* AJUSTE DINÂMICO NO PLANO DE REFEIÇÕES BASEADO EM DADOS DE SAÚDE */}
        <motion.div variants={staggerCardVariants} className="w-full">
          <AdaptiveMealAdjustmentCard
            profile={profile}
            onNavigate={onNavigate}
            onLogIntake={onLogIntake}
            onUpdateProfile={onUpdateProfile}
          />
        </motion.div>

        {/* RELATÓRIO SEMANAL (METAS CALÓRICAS E MACRONUTRIENTES DOS ÚLTIMOS 7 DIAS) */}
        <motion.div variants={staggerCardVariants} className="w-full">
          <WeeklyReport profile={profile} onNavigate={onNavigate} onUpdateProfile={onUpdateProfile} />
        </motion.div>

        {/* COMPARTIVO DE EVOLUÇÃO (PESO E MEDIDAS NOS ÚLTIMOS 30 DIAS) */}
        <motion.div variants={staggerCardVariants} className="w-full">
          <EvolutionComparison profile={profile} />
        </motion.div>

        {/* DICA DE TREINO DO DIA BASEADA NO NÍVEL DE CONDICIONAMENTO FÍSICO */}
        <motion.div variants={staggerCardVariants} className="w-full">
          <DailyWorkoutTipCard profile={profile} onNavigate={onNavigate} />
        </motion.div>
      </motion.div>


      {/* NOVO: BANNER DESTAQUE PARA O RESTAURANTE INTELIGENTE */}
      <motion.div
        variants={staggerCardVariants}
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          playSfx('tap');
          vibrate(10);
          onNavigate('smartplate');
        }}
        className={`relative w-full mx-auto overflow-hidden rounded-[24px] p-6 sm:p-8 cursor-pointer transition-all ${
          isPremium
            ? 'bg-gradient-to-r from-[#D8B14A]/10 via-[#B8860B]/10 to-transparent border border-[#D8B14A]/30'
            : 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30'
        }`}
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          <div className={`p-4 rounded-full ${isPremium ? 'bg-[#D8B14A]/20 text-[#D8B14A]' : 'bg-emerald-500/20 text-emerald-500'}`}>
            <Camera className="w-8 h-8" />
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isPremium ? 'text-[#D8B14A]' : 'text-emerald-500'}`}>
              {t('exclusive_news', 'NOVIDADE EXCLUSIVA')}
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white mb-2">
              {t('feature_smartplate', 'Restaurante Inteligente')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg">
              {t('smartplate_desc', 'Está comendo fora? Tire uma foto das opções ou do cardápio e deixe a IA montar a melhor combinação para o seu objetivo.')}
            </p>
          </div>
          <div className="shrink-0 mt-4 sm:mt-0">
            <div className={`px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 ${isPremium ? 'bg-[#D8B14A] text-slate-900' : 'bg-emerald-500 text-white'}`}>
              <Utensils className="w-4 h-4" />
              {t('combine_plate', 'Combinar Prato')}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. Grid de Funcionalidades Principais */}
      <motion.div variants={staggerCardVariants} className="space-y-4 w-full mx-auto">
        <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white px-1">
          {t('smart_resources', 'Recursos Inteligentes')}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {features.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                onNavigate(item.id);
              }}
              className="card-premium p-4 sm:p-5 flex flex-col items-start justify-between text-left group cursor-pointer h-32 sm:h-36 relative overflow-hidden"
            >
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#151B23] border border-slate-100 dark:border-[#232C39] group-hover:scale-105 transition-transform">
                {item.icon}
              </div>

              <div>
                <h4 className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight mb-0.5 group-hover:text-[#16C784] transition-colors">
                  {t(item.labelKey, item.defaultLabel)}
                </h4>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-[#B5BDC9]">
                  {t(item.descKey, item.defaultDesc)}
                </p>
              </div>

              <div className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="w-3.5 h-3.5 text-[#16C784]" />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* RECIPE COLLECTIONS VIEW */}
      <motion.div variants={staggerCardVariants} className="w-full">
        <RecipeCollectionsView 
          favoriteRecipes={(profile?.favorites || []) as any} 
          savedRecipes={profile?.savedRecipes || []}
          onRemoveFavorite={handleRemoveFavorite} 
        />
      </motion.div>


      {/* VOICE SHORTCUTS MODAL */}
      <VoiceShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        activeTab={activeTab}
      />

      {/* NEXT-DAY MEAL PLAN GENERATED BY GEMINI API MODAL */}
      <AnimatePresence>
        {isNextDayPlanModalOpen && nextDayPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#131920] rounded-[32px] border border-teal-500/40 shadow-2xl p-6 sm:p-8 space-y-6 text-white"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setIsNextDayPlanModalOpen(false);
                  playSfx('tap');
                }}
                className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-xs font-bold text-teal-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gemini API • Plano para {nextDayPlan.date}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                  <span>📋 {t('next_day_menu_title', 'Seu Menu Completo para Amanhã')}</span>
                </h2>
                <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                  "{nextDayPlan.summary}"
                </p>
              </div>

              {/* Macro & Pantry Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 text-center">
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Calorias</span>
                  <span className="text-lg font-black text-orange-400">{nextDayPlan.totalCalories} kcal</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Proteínas</span>
                  <span className="text-lg font-black text-emerald-400">{nextDayPlan.totalProtein}g</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Carboidratos</span>
                  <span className="text-lg font-black text-amber-400">{nextDayPlan.totalCarbs}g</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Gorduras</span>
                  <span className="text-lg font-black text-cyan-400">{nextDayPlan.totalFat}g</span>
                </div>
                <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-2 rounded-xl bg-teal-500/10 border border-teal-500/30">
                  <span className="text-[10px] uppercase font-bold text-teal-400">Despensa Utilizada</span>
                  <span className="text-lg font-black text-teal-300">{nextDayPlan.pantryUsedCount || nextDayPlan.meals?.reduce((acc: number, m: any) => acc + (m.pantryMatches?.length || 0), 0)} itens</span>
                </div>
              </div>

              {/* Meals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nextDayPlan.meals?.map((meal: any, idx: number) => (
                  <div key={idx} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-teal-500/30 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-xs font-bold uppercase">
                          {meal.label || meal.type}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                          ⏱️ {meal.prepTime}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white leading-snug">{meal.name}</h4>

                      {/* Macros pill */}
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-800/60 p-2 rounded-xl">
                        <span className="text-orange-400 font-bold">{meal.calories} kcal</span>
                        <span>•</span>
                        <span className="text-emerald-400">{meal.protein}g prot</span>
                        <span>•</span>
                        <span className="text-amber-400">{meal.carbs}g carb</span>
                        <span>•</span>
                        <span className="text-cyan-400">{meal.fat}g gord</span>
                      </div>

                      {/* Pantry matches tags */}
                      {meal.pantryMatches && meal.pantryMatches.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider w-full">Da sua despensa:</span>
                          {meal.pantryMatches.map((match: string, mIdx: number) => (
                            <span key={mIdx} className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-teal-400" />
                              {match}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Ingredients */}
                      <div className="space-y-1 pt-1">
                        <span className="text-xs font-bold text-slate-400">Ingredientes:</span>
                        <ul className="text-xs text-slate-300 list-disc list-inside space-y-0.5">
                          {meal.ingredients?.map((ing: string, iIdx: number) => (
                            <li key={iIdx}>{ing}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Simple Instructions */}
                    {meal.instructions && meal.instructions.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                        <span className="font-bold text-slate-300">Preparo: </span>
                        <span>{meal.instructions.join(' ')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setIsNextDayPlanModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Fechar
                </button>

                <button
                  onClick={handleSaveNextDayPlan}
                  disabled={isNextDayPlanSaved}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                    isNextDayPlanSaved
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30 cursor-default'
                      : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-teal-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isNextDayPlanSaved ? 'Plano Salvo para Amanhã!' : 'Aplicar & Salvar no Meu Plano'}</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voice Shortcuts & Help Modal */}
      <VoiceShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        activeTab={activeTab}
      />

    </motion.div>
  );
}

