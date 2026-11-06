import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Droplet, Moon, Clock, Plus, Sparkles, Volume2, Play, Info, Calendar, 
  Activity, Zap, Trash2, Bell, Filter, Check, Sliders, AlertTriangle, 
  HelpCircle, RefreshCw, Pencil, CheckSquare, Coffee, Waves, Flame, Award, Trophy, ChevronRight
} from 'lucide-react';
import { UserProfile, HydrationLog, SleepLog, FastingLog } from '../types';
import { playAudioUrl } from '../lib/speech';
import { textToSpeech, generateHabitsInsight, getWaterQualityAdvice } from '../lib/gemini';
import { playSfx, vibrate } from '../lib/sensory';
import { useTranslation } from '../contexts/LanguageContext';
import { ConfettiCelebration } from './ConfettiCelebration';

interface HabitTrackerProps {
  profile: UserProfile | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onAwardPoints?: (amount: number, reason: string) => void;
  addNotification?: (notif: { title: string; message: string; type: 'achievement' | 'point' | 'streak' | 'info' }) => void;
}

const WATER_SOURCES = [
  { id: 'Filtrada', label: 'Filtrada', icon: '💧', desc: 'Livre de cloro, metais pesados e partículas.', pH: 'pH ~7.0 (Neutro)', purity: 'Altíssima (Filtro de Barro/Carvão)', benefit: 'Purificação diária sem aditivos químicos.' },
  { id: 'Mineral', label: 'Mineral', icon: '⛰️', desc: 'Rica em eletrólitos naturais e sais minerais.', pH: 'pH ~7.4 (Levemente Alcalina)', purity: 'Alta (Fontes subterrâneas)', benefit: 'Ótima para reposição de cálcio e magnésio.' },
  { id: 'Alcalina', label: 'Alcalina', icon: '⚡', desc: 'Ionizada para combater radicais livres.', pH: 'pH 8.5 - 9.5 (Alcalino)', purity: 'Altíssima (Filtros Especiais/Ozonizada)', benefit: 'Ajuda a diminuir a acidez metabólica.' },
  { id: 'Torneira', label: 'Torneira', icon: '🚰', desc: 'Tratada da rede pública. Contém cloro.', pH: 'pH ~6.8', purity: 'Baixa/Média (Direto da Rede)', benefit: 'Prática, mas recomenda-se filtrar antes.' },
  { id: 'Coco', label: 'Água de Coco', icon: '🥥', desc: 'Repleta de potássio e sódio essenciais.', pH: 'pH ~6.2 (Natural)', purity: 'Natural (Fruta Orgânica)', benefit: 'Isotônico natural perfeito para reidratação.' },
  { id: 'Outra', label: 'Outra', icon: '🍵', desc: 'Chás claros, infusões ou águas saborizadas.', pH: 'Variável', purity: 'Caseira', benefit: 'Complemento saudável à hidratação pura.' }
] as const;

export function HabitTracker({ profile, onUpdateProfile, onAwardPoints, addNotification }: HabitTrackerProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'hydration' | 'sleep' | 'fasting' | 'ingestion'>('hydration');
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);

  // Quick activity speed dial handlers
  const handleQuickWalkLog = () => {
    triggerStreakUpdateAndBonus('Caminhada');
    const newLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      completed: true,
      durationMinutes: 20,
      intensity: 'Moderado' as const
    };
    const currentWorkoutLogs = profile?.workoutLogs || [];
    onUpdateProfile({ workoutLogs: [newLog, ...currentWorkoutLogs] });

    playSfx('success');
    vibrate([40, 40, 80]);
    if (onAwardPoints) onAwardPoints(25, 'Caminhada rápida de 20 min registrada!');
    if (addNotification) {
      addNotification({
        title: 'Caminhada Registrada! 🚶',
        message: 'Você completou 20 minutos de caminhada rápida (+25 XP).',
        type: 'achievement'
      });
    }
    setIsSpeedDialOpen(false);
  };

  const handleQuickWaterLog = () => {
    handleAddWater(250, 'Filtrada');
    setIsSpeedDialOpen(false);
  };

  const handleQuickSleepLog = () => {
    handleLogSleep();
    playSfx('success');
    setIsSpeedDialOpen(false);
  };

  const handleQuickFastingLog = () => {
    handleLogFasting();
    playSfx('success');
    setIsSpeedDialOpen(false);
  };
  
  const ingestionRemindersEnabled = profile?.ingestionRemindersEnabled ?? true;
  const defaultIngestionList = profile?.ingestionRemindersList || [
    { id: '1', title: 'Café da Manhã Energético', time: '08:00', nutrient: 'Proteína de Alto Valor Biológico & Carboidratos Complexos', enabled: true },
    { id: '2', title: 'Hidratação & Eletrólitos', time: '10:30', nutrient: 'Água Mineral / Sódio e Potássio', enabled: true },
    { id: '3', title: 'Almoço Nutricional', time: '13:00', nutrient: 'Fibras, Ferro, Vitaminas A e C, Proteína Magra', enabled: true },
    { id: '4', title: 'Lanche Pré-Treino / Foco', time: '16:30', nutrient: 'Antioxidantes & Carboidrato de Baixo IG', enabled: true },
    { id: '5', title: 'Jantar de Recuperação', time: '20:00', nutrient: 'Triptofano, Magnésio & Proteína de Absorção Lenta', enabled: true }
  ];
  const [ingestionList, setIngestionList] = useState(defaultIngestionList);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('12:00');
  const [newReminderNutrient, setNewReminderNutrient] = useState('');

  const handleToggleIngestionGlobal = (enabled: boolean) => {
    onUpdateProfile({ ingestionRemindersEnabled: enabled });
    playSfx('tap');
    vibrate(40);
    if (enabled && addNotification) {
      addNotification({
        title: "Lembretes de Ingestão Ativados! 🥗",
        message: "Notificações push ativadas para lembrar você dos horários do plano alimentar.",
        type: 'achievement'
      });
    }
  };

  const handleToggleSingleIngestion = (id: string) => {
    const updated = ingestionList.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item);
    setIngestionList(updated);
    onUpdateProfile({ ingestionRemindersList: updated });
    playSfx('tap');
    vibrate(30);
  };

  const handleAddIngestionReminder = () => {
    if (!newReminderTitle.trim() || !newReminderNutrient.trim()) return;
    const newItem = {
      id: crypto.randomUUID(),
      title: newReminderTitle,
      time: newReminderTime,
      nutrient: newReminderNutrient,
      enabled: true
    };
    const updated = [...ingestionList, newItem];
    setIngestionList(updated);
    onUpdateProfile({ ingestionRemindersList: updated });
    setNewReminderTitle('');
    setNewReminderNutrient('');
    playSfx('success');
    vibrate(50);
    setShowConfetti(true);
    if (addNotification) {
      addNotification({
        title: "Lembrete Adicionado! ⏰",
        message: `Novo lembrete de ingestão programado para as ${newReminderTime}.`,
        type: 'achievement'
      });
    }
  };

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        playSfx('success');
        vibrate(50);
        if (addNotification) {
          addNotification({
            title: "Notificações Push Concedidas! 🔔",
            message: "Seu navegador está pronto para enviar notificações push de ingestão e plano alimentar.",
            type: 'achievement'
          });
        }
      } else {
        if (addNotification) {
          addNotification({
            title: "Permissão Negada",
            message: "Você pode habilitar notificações nas configurações do seu navegador.",
            type: 'warning' as any
          });
        }
      }
    }
  };

  const testPushReminder = (item: { title: string; nutrient: string; time: string }) => {
    playSfx('notification');
    vibrate([100, 50, 100]);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Nutri AI • Lembrete: ${item.title} (${item.time})`, {
        body: `Hora de ingerir: ${item.nutrient}. Siga seu plano alimentar atual!`,
        icon: '/favicon.ico'
      });
    }
    if (addNotification) {
      addNotification({
        title: `Lembrete Push: ${item.title} (${item.time})`,
        message: `Foco: ${item.nutrient} (Plano Alimentar Atual)`,
        type: 'info'
      });
    }
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);

  // Hydration extra states
  const [selectedWaterSource, setSelectedWaterSource] = useState<'Filtrada' | 'Mineral' | 'Torneira' | 'Alcalina' | 'Poço' | 'Coco' | 'Outra'>('Filtrada');
  const [customWaterAmount, setCustomWaterAmount] = useState<string>('250');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempWaterGoal, setTempWaterGoal] = useState<string>('2500');
  
  // IA Water Consultant state
  const [waterQuery, setWaterQuery] = useState('');
  const [waterAnswer, setWaterAnswer] = useState<string | null>(null);
  const [isAnalyzingWater, setIsAnalyzingWater] = useState(false);

  // Today state
  const today = new Date().toISOString().split('T')[0];
  const hydrationLogs = profile?.hydrationLogs || [];
  const sleepLogs = profile?.sleepLogs || [];
  const fastingLogs = profile?.fastingLogs || [];

  const todayHydration = hydrationLogs.filter(log => log.date.startsWith(today));
  const currentTotalWater = todayHydration.reduce((sum, log) => sum + log.amount, 0);
  const recommendedWater = profile?.weight ? Math.round(profile.weight * 35) : 2500;
  const goalWater = profile?.waterGoal || recommendedWater;
  const waterPercentage = Math.min((currentTotalWater / goalWater) * 100, 100);

  const todaySleep = sleepLogs.find(log => log.date.startsWith(today));
  const todayFasting = fastingLogs.find(log => log.date.startsWith(today));

  // Modals / forms state
  const [sleepHours, setSleepHours] = useState(8);
  const [sleepQuality, setSleepQuality] = useState<'Péssimo' | 'Ruim' | 'Regular' | 'Bom' | 'Excelente'>('Bom');
  const [fastingHours, setFastingHours] = useState(16);

  // Reminders Settings read from user profile
  const reminderEnabled = profile?.waterReminderEnabled ?? false;
  const reminderInterval = profile?.waterReminderIntervalMinutes ?? 60;
  const reminderStartHour = profile?.waterReminderStartHour ?? 8;
  const reminderEndHour = profile?.waterReminderEndHour ?? 22;

  // Geo Hydration Reminders & Climate state
  const geoHydrationEnabled = profile?.geoHydrationEnabled ?? false;
  const [geoLoading, setGeoLoading] = useState(false);
  const geoLocationName = profile?.geoHydrationLocation || 'Localização não detectada';
  const geoTemp = profile?.geoHydrationTemp ?? 27;
  const geoHumidity = profile?.geoHydrationHumidity ?? 55;

  const handleFetchGeoWeather = () => {
    setGeoLoading(true);
    playSfx('tap');
    vibrate(40);

    if (!navigator.geolocation) {
      setGeoLoading(false);
      if (addNotification) {
        addNotification({
          title: "Geolocalização Indisponível",
          message: "Seu navegador não suporta geolocalização.",
          type: 'warning' as any
        });
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`);
          const data = await res.json();
          const temp = data?.current?.temperature_2m ?? 28;
          const humidity = data?.current?.relative_humidity_2m ?? 50;
          const locName = `Região (${lat.toFixed(1)}°, ${lon.toFixed(1)}°)`;

          onUpdateProfile({
            geoHydrationEnabled: true,
            geoHydrationLocation: locName,
            geoHydrationTemp: temp,
            geoHydrationHumidity: humidity
          });

          playSfx('success');
          vibrate(60);
          if (addNotification) {
            addNotification({
              title: "Clima Local Detectado! ☀️",
              message: `Temperatura: ${temp}°C, Umidade: ${humidity}%. Meta de água ajustada!`,
              type: 'achievement'
            });
          }
        } catch (err) {
          console.warn(err);
          const temp = 31;
          const humidity = 42;
          onUpdateProfile({
            geoHydrationEnabled: true,
            geoHydrationLocation: 'Região Local (Simulada)',
            geoHydrationTemp: temp,
            geoHydrationHumidity: humidity
          });
          playSfx('success');
          if (addNotification) {
            addNotification({
              title: "Clima Local Atualizado 🌡️",
              message: `Temperatura: ${temp}°C, Umidade: ${humidity}%.`,
              type: 'achievement'
            });
          }
        } finally {
          setGeoLoading(false);
        }
      },
      (error) => {
        setGeoLoading(false);
        console.warn(error);
        const temp = 30;
        const humidity = 45;
        onUpdateProfile({
          geoHydrationEnabled: true,
          geoHydrationLocation: 'Localização Padrão (GPS Negado)',
          geoHydrationTemp: temp,
          geoHydrationHumidity: humidity
        });
        if (addNotification) {
          addNotification({
            title: "Uso de Clima Padrão ☀️",
            message: `Temperatura estimada: ${temp}°C, Umidade: ${humidity}%.`,
            type: 'info'
          });
        }
      },
      { timeout: 10000 }
    );
  };

  const handleToggleGeoHydration = (enabled: boolean) => {
    onUpdateProfile({ geoHydrationEnabled: enabled });
    playSfx('tap');
    vibrate(30);
    if (enabled && !profile?.geoHydrationTemp) {
      handleFetchGeoWeather();
    }
  };

  const climateExtraWater = (geoTemp > 26 ? (geoTemp - 26) * 60 : 0) + (geoHumidity < 40 ? 300 : 0);
  const climateAdjustedGoal = goalWater + climateExtraWater;

  // Reactivity tick for countdown timer
  const [tick, setTick] = useState(0);
  const [lastNotifiedTime, setLastNotifiedTime] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 15000); // refresh calculations every 15 seconds
    return () => clearInterval(timer);
  }, []);

  // Compute countdown until next drink
  const latestLogOfToday = todayHydration.length > 0 
    ? [...todayHydration].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  let minutesElapsed = 99999;
  let nextReminderMinutes = 0;
  let isOverdue = true;

  if (latestLogOfToday) {
    const lastTime = new Date(latestLogOfToday.date).getTime();
    const diffMs = Date.now() - lastTime;
    minutesElapsed = Math.floor(diffMs / (1000 * 60));
    nextReminderMinutes = Math.max(0, reminderInterval - minutesElapsed);
    isOverdue = minutesElapsed >= reminderInterval;
  }

  // Auto notification system hook
  useEffect(() => {
    if (!reminderEnabled || !addNotification) return;

    // Check if within hours
    const currentHour = new Date().getHours();
    if (currentHour < reminderStartHour || currentHour >= reminderEndHour) return;

    // If overdue and we haven't notified for this specific cycle/day
    if (isOverdue) {
      const todayStr = new Date().toLocaleDateString();
      const notificationKey = `${todayStr}-${Math.floor(Date.now() / (1000 * 60 * reminderInterval))}`; // key changes every interval
      
      if (lastNotifiedTime !== notificationKey) {
        setLastNotifiedTime(notificationKey);
        
        // Push notification
        addNotification({
          title: "Lembrete de Hidratação 💧",
          message: `Já faz mais de ${reminderInterval} minutos desde seu último copo de água. Beba água para reabastecer sua energia!`,
          type: 'info'
        });
        
        // Sensory alert
        playSfx('notification');
        vibrate([200, 100, 200]);
      }
    }
  }, [isOverdue, reminderEnabled, reminderInterval, reminderStartHour, reminderEndHour, lastNotifiedTime, addNotification]);

  // Helper to calculate active streak and dates set
  const calculateStreak = () => {
    const datesSet = new Set<string>();
    
    // Collect all dates from hydration, sleep, fasting, intake logs
    hydrationLogs.forEach(l => datesSet.add(l.date.split('T')[0]));
    sleepLogs.forEach(l => datesSet.add(l.date.split('T')[0]));
    fastingLogs.forEach(l => datesSet.add(l.date.split('T')[0]));
    (profile?.intakeLogs || []).forEach(l => datesSet.add(l.date.split('T')[0]));

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Determine active streak based on consecutive logged days
    let activeStreak = 0;
    const checkDate = new Date();
    
    // If not logged today and not logged yesterday, active streak reset
    if (!datesSet.has(todayStr) && !datesSet.has(yesterdayStr)) {
      return { streak: 0, isLoggedToday: false, datesSet };
    }

    if (!datesSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (datesSet.has(dStr)) {
        activeStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      streak: Math.max(activeStreak, profile?.streak || 0),
      isLoggedToday: datesSet.has(todayStr),
      datesSet
    };
  };

  const { streak: currentStreak, isLoggedToday, datesSet } = calculateStreak();
  const highestStreak = Math.max(currentStreak, profile?.highestStreak || 0);

  const [isSparkling, setIsSparkling] = useState(false);

  // Trigger streak evaluation and bonus points when a habit is recorded
  const triggerStreakUpdateAndBonus = (actionType: string) => {
    setIsSparkling(true);
    setTimeout(() => setIsSparkling(false), 2200);

    const todayStr = new Date().toISOString().split('T')[0];
    const lastDate = profile?.lastStreakDate;

    if (lastDate !== todayStr) {
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const newStreak = lastDate === yesterdayStr ? (profile?.streak || 0) + 1 : 1;
      const newHighest = Math.max(newStreak, profile?.highestStreak || 0);
      
      // Calculate Streak Bonus Points (+10 XP per day streak up to 100 XP + Milestone Bonuses)
      const basePoints = 15;
      const streakBonus = Math.min(newStreak * 10, 100);
      let milestoneBonus = 0;
      if (newStreak === 7) milestoneBonus = 150;
      if (newStreak === 14) milestoneBonus = 250;
      if (newStreak === 30) milestoneBonus = 500;

      const totalBonus = basePoints + streakBonus + milestoneBonus;

      onUpdateProfile({
        streak: newStreak,
        highestStreak: newHighest,
        lastStreakDate: todayStr,
        points: (profile?.points || 0) + totalBonus
      });

      if (onAwardPoints) {
        onAwardPoints(totalBonus, `🔥 Streak de ${newStreak} dia(s) mantido! (${actionType})`);
      }

      if (addNotification) {
        addNotification({
          title: `🔥 Sequência de ${newStreak} Dias!`,
          message: milestoneBonus > 0 
            ? `PARABÉNS! Você atingiu o marco de ${newStreak} dias consecutivos e ganhou +${totalBonus} XP!` 
            : `Você manteve seu streak ativo hoje e acumulou +${totalBonus} XP bônus!`,
          type: 'streak'
        });
      }

      if (newStreak >= 3 || milestoneBonus > 0) {
        setShowConfetti(true);
        playSfx('confetti');
      }
    }
  };

  const handleAddWater = (amount: number, source: any = selectedWaterSource) => {
    const newLog: HydrationLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      amount,
      source
    };
    onUpdateProfile({ hydrationLogs: [...hydrationLogs, newLog] });
    triggerStreakUpdateAndBonus('Hidratação');
    
    // Awards and feedback
    playSfx('crystal');
    vibrate(60);
    
    let bonusMessage = `Hidratação: +${amount}ml de água ${source.toLowerCase()} registrados!`;
    if (source === 'Alcalina') {
      bonusMessage += " Excelente escolha antioxidante.";
    } else if (source === 'Torneira') {
      bonusMessage += " Dica: considere filtrar para remover o cloro.";
    }
    
    if (onAwardPoints) onAwardPoints(10, bonusMessage);
  };

  const handleDeleteWaterLog = (id: string) => {
    const updated = hydrationLogs.filter(log => log.id !== id);
    onUpdateProfile({ hydrationLogs: updated });
    playSfx('tap');
    vibrate(40);
  };

  const handleUpdateWaterGoal = () => {
    const val = parseInt(tempWaterGoal);
    if (!isNaN(val) && val > 0) {
      onUpdateProfile({ waterGoal: val });
      setIsEditingGoal(false);
      playSfx('success');
      vibrate(50);
    }
  };

  const handleToggleReminders = (enabled: boolean) => {
    onUpdateProfile({ waterReminderEnabled: enabled });
    playSfx('tap');
    vibrate(45);
    if (enabled && addNotification) {
      addNotification({
        title: "Lembretes Ativados! 🔔",
        message: `Você receberá alertas a cada ${reminderInterval} minutos entre ${reminderStartHour}h e ${reminderEndHour}h.`,
        type: 'info'
      });
    }
  };

  const handleUpdateReminderInterval = (mins: number) => {
    onUpdateProfile({ waterReminderIntervalMinutes: mins });
    playSfx('tap');
  };

  const handleUpdateReminderHours = (start: number, end: number) => {
    onUpdateProfile({ waterReminderStartHour: start, waterReminderEndHour: end });
  };

  const handleTestNotification = () => {
    playSfx('notification');
    vibrate([100, 100, 100]);
    if (addNotification) {
      addNotification({
        title: "Teste de Lembrete 💧",
        message: "Excelente! Seus lembretes de hidratação estão funcionando com sucesso.",
        type: 'info'
      });
    }
  };

  const handleAskWaterAdvisor = async () => {
    if (!waterQuery.trim()) return;
    setIsAnalyzingWater(true);
    setWaterAnswer(null);
    vibrate(50);
    try {
      const advice = await getWaterQualityAdvice(waterQuery);
      setWaterAnswer(advice);
      playSfx('success');
    } catch (e) {
      console.warn(e);
      setWaterAnswer("Não foi possível carregar as informações no momento. Tente novamente.");
    } finally {
      setIsAnalyzingWater(false);
    }
  };

  const handleLogSleep = () => {
    const newLog: SleepLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      durationHours: sleepHours,
      quality: sleepQuality
    };
    const newLogs = [...sleepLogs.filter(l => !l.date.startsWith(today)), newLog];
    onUpdateProfile({ sleepLogs: newLogs });
    triggerStreakUpdateAndBonus('Registro de Sono');
    if (onAwardPoints) onAwardPoints(15, `Sono registrado: ${sleepHours}h`);
    getInsight(newLogs, fastingLogs); // get insights after
  };

  const handleLogFasting = () => {
    const newLog: FastingLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      durationHours: fastingHours
    };
    const newLogs = [...fastingLogs.filter(l => !l.date.startsWith(today)), newLog];
    onUpdateProfile({ fastingLogs: newLogs });
    triggerStreakUpdateAndBonus('Jejum Intermitente');
    if (onAwardPoints) onAwardPoints(20, `Jejum registrado: ${fastingHours}h`);
    getInsight(sleepLogs, newLogs);
  };

  const getInsight = async (sLogs = sleepLogs, fLogs = fastingLogs) => {
    setIsProcessing(true);
    setAudioUrl(null);
    try {
      const msg = await generateHabitsInsight(profile, currentTotalWater, goalWater, sLogs, fLogs);
      setInsight(msg);
      playTTS(msg);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const playTTS = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const base64Audio = await textToSpeech(text);
      if (base64Audio) {
        setAudioUrl(base64Audio);
        await playAudioUrl(base64Audio, { onEnded: () => setIsPlaying(false) });
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.warn(error);
      setIsPlaying(false);
    }
  };

  // Water source statistics breakdown
  const sourceStats = WATER_SOURCES.map(src => {
    const ml = todayHydration
      .filter(log => log.source === src.id)
      .reduce((sum, log) => sum + log.amount, 0);
    const pct = currentTotalWater > 0 ? Math.round((ml / currentTotalWater) * 100) : 0;
    return { ...src, ml, pct };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Rastreamento de Hábitos
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Monitore sua ingestão de água, qualidade do sono e horários de jejum para otimizar sua nutrição.
        </p>
      </div>
      {/* Visual Streak Counter & Gamification Banner */}
      <div 
        data-testid="habit-streak-counter"
        className={`clay-card p-6 md:p-8 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/40 border-2 transition-all duration-500 ${
          isSparkling 
            ? 'border-amber-400 ring-4 ring-amber-400/20 shadow-[0_0_30px_rgba(245,158,11,0.3)] scale-[1.01]' 
            : 'border-orange-500/30 shadow-xl'
        } rounded-3xl space-y-6 relative overflow-hidden`}
      >
        {/* Subtle sparkle particles overlay when active */}
        <AnimatePresence>
          {isSparkling && (
            <>
              {/* Floating sparks */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, y: 20, x: (i - 2.5) * 30, scale: 0.5 }}
                  animate={{ opacity: 0, y: -60, scale: 1.2, rotate: i % 2 === 0 ? 45 : -45 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 + i * 0.1, ease: 'easeOut' }}
                  className="absolute bottom-1/2 left-1/2 pointer-events-none z-20 flex items-center justify-center"
                >
                  <Sparkles className={`w-${4 + (i % 3)} h-${4 + (i % 3)} ${i % 2 === 0 ? 'text-amber-400' : 'text-orange-400'} drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]`} />
                </motion.div>
              ))}

              {/* Reward Badge Popup */}
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: -20, scale: 1.05 }}
                exit={{ opacity: 0, y: -35, scale: 0.9 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="absolute top-3 right-6 z-20 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-amber-200/50"
              >
                <Flame className="w-4 h-4 fill-amber-200 text-amber-100 animate-bounce" />
                <span>+ XP & Constância Mantida! 🔥</span>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {/* Flame Badge & Counter */}
          <div className="flex items-center gap-4 text-center md:text-left">
            <div 
              onClick={() => {
                setIsSparkling(true);
                playSfx('confetti');
                vibrate(80);
                setTimeout(() => setIsSparkling(false), 2000);
              }}
              className="relative shrink-0 cursor-pointer group"
              title="Toque para celebrar sua disciplina!"
            >
              <motion.div 
                animate={isSparkling ? { scale: [1, 1.2, 0.95, 1.1, 1], rotate: [0, -6, 6, -3, 0] } : {}}
                transition={{ duration: 0.6 }}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center text-white transition-all ${
                  isSparkling 
                    ? 'shadow-[0_0_30px_rgba(249,115,22,0.8),_inset_0_2px_8px_rgba(255,255,255,0.8)] ring-4 ring-amber-300' 
                    : 'shadow-[0_8px_20px_rgba(249,115,22,0.4),_inset_0_2px_4px_rgba(255,255,255,0.4)]'
                }`}
              >
                <Flame className={`w-10 h-10 sm:w-12 sm:h-12 text-amber-100 fill-amber-200 transition-transform duration-300 ${isSparkling ? 'scale-125' : 'group-hover:scale-110'}`} />
              </motion.div>

              <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow flex items-center gap-0.5">
                <span>🔥 Hot</span>
                {isSparkling && <Sparkles className="w-3 h-3 text-amber-200 animate-spin" />}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="text-xs font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">
                  Sequência de Disciplina
                </span>
                {isLoggedToday && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                    ✓ Registrado Hoje
                  </span>
                )}
              </div>
              <h3 className="text-3xl sm:text-4xl font-serif font-black text-slate-900 dark:text-white flex items-center gap-2 justify-center md:justify-start">
                <span>{currentStreak} {currentStreak === 1 ? 'Dia' : 'Dias'} Consecutivos</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recorde pessoal: <strong className="text-orange-600 dark:text-orange-400 font-bold">{highestStreak} dias</strong> • Bônus diário ativo: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">+{Math.min((currentStreak || 1) * 10, 100)} XP/dia</strong>
              </p>
            </div>
          </div>

          {/* Weekly 7-Day Calendar Dots (Seg - Dom) */}
          <div className="w-full md:w-auto bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-orange-500/20 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>Constância da Semana</span>
              <span className="text-orange-600 dark:text-orange-400">{isLoggedToday ? 'Meta de Hoje Cumprida 🎉' : 'Aguardando Log de Hoje ⏳'}</span>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((dayLabel, idx) => {
                const now = new Date();
                const currentDayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
                const dayDiff = idx - currentDayOfWeek;
                const targetDate = new Date(now.getTime() + dayDiff * 86400000);
                const targetStr = targetDate.toISOString().split('T')[0];
                const isLogged = datesSet.has(targetStr);
                const isToday = idx === currentDayOfWeek;

                return (
                  <div key={dayLabel} className="flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-bold ${isToday ? 'text-orange-600 dark:text-orange-400 underline' : 'text-slate-400'}`}>
                      {dayLabel}
                    </span>
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                      isLogged 
                        ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/30 scale-105' 
                        : isToday 
                          ? 'bg-orange-100 dark:bg-orange-950/50 border-2 border-dashed border-orange-500 text-orange-600 animate-pulse' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {isLogged ? <Flame className="w-4 h-4 fill-white" /> : targetDate.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-orange-500/15">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Próximo Marco: {currentStreak >= 30 ? '👑 Lenda (30+ Dias)' : currentStreak >= 14 ? '🔥 Super Streak (30 Dias)' : currentStreak >= 7 ? '⭐ Elite (14 Dias)' : '🌟 Meta Inicial (7 Dias)'}</span>
            </span>
            <span className="text-orange-600 dark:text-orange-400 font-extrabold">
              {currentStreak >= 30 ? '30/30 Dias (Máximo)' : `${currentStreak} / ${currentStreak >= 14 ? 30 : currentStreak >= 7 ? 14 : 7} Dias`}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-full transition-all duration-1000"
              style={{ 
                width: `${Math.min(
                  100, 
                  (currentStreak / (currentStreak >= 30 ? 30 : currentStreak >= 14 ? 30 : currentStreak >= 7 ? 14 : 7)) * 100
                )}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Insight Banner */}
      <div className="clay-card p-8 bg-gradient-to-br from-emerald-600 to-teal-800 text-white relative overflow-hidden flex flex-col md:flex-row items-center gap-6 shadow-2xl">
        <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        
        <button
          onClick={() => insight ? playTTS(insight) : getInsight()}
          disabled={isProcessing}
          className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center bg-white text-emerald-600 font-bold focus:outline-none transition-all ${isProcessing ? 'animate-pulse opacity-80' : 'hover:scale-105 shadow-xl shadow-emerald-900/50'} ${isPlaying ? 'ring-4 ring-emerald-300 ring-offset-2 ring-offset-emerald-600' : ''}`}
        >
          {isProcessing ? <Zap className="w-8 h-8 animate-pulse" /> : isPlaying ? <Volume2 className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
        </button>
        
        <div className="flex-1 space-y-2 text-center md:text-left z-10">
           <h3 className="text-sm font-black uppercase tracking-widest text-emerald-200">Insight Diário</h3>
           {isProcessing ? (
              <p className="text-xl font-medium animate-pulse text-white/80">Analisando seus hábitos...</p>
           ) : insight ? (
              <p className="text-lg font-medium leading-relaxed italic">"{insight}"</p>
           ) : (
              <p className="text-lg font-medium text-emerald-100">Toque no ícone para gerar uma análise personalizada da sua rotina atual de hidratação, sono e jejum.</p>
           )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap w-[94%] max-w-lg p-1 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl mx-auto shadow-inner gap-1">
        {[
          { id: 'hydration', label: 'Água e Qualidade', icon: <Droplet className="w-4 h-4" /> },
          { id: 'ingestion', label: 'Lembretes de Ingestão', icon: <Bell className="w-4 h-4" /> },
          { id: 'sleep', label: 'Sono', icon: <Moon className="w-4 h-4" /> },
          { id: 'fasting', label: 'Jejum', icon: <Clock className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              playSfx('tap');
            }}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'ingestion' && (
          <motion.div key="ingestion" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            {/* Ingestion Reminders Header Card */}
            <div className="clay-card p-8 bg-gradient-to-br from-purple-600 to-indigo-800 text-white relative overflow-hidden flex flex-col md:flex-row items-center gap-6 shadow-2xl">
              <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="w-16 h-16 shrink-0 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                <Bell className="w-8 h-8 animate-bounce" />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left z-10">
                <h3 className="text-sm font-black uppercase tracking-widest text-purple-200">Notificações Push Inteligentes</h3>
                <h2 className="text-2xl font-serif font-bold">Lembretes de Ingestão & Plano Alimentar</h2>
                <p className="text-purple-100 text-sm leading-relaxed">
                  Receba alertas automáticos em horários estratégicos para consumir água, macronutrientes (proteínas, carboidratos, fibras) e suplementos baseados no seu plano alimentar atual.
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0 z-10">
                <button
                  onClick={requestPushPermission}
                  className="px-5 py-3 bg-white text-purple-700 hover:bg-purple-50 rounded-xl text-xs font-black shadow-lg transition-all"
                >
                  Permitir Push no Navegador
                </button>
              </div>
            </div>

            {/* Global Settings & Status */}
            <div className="clay-card p-8 shadow-xl bg-white dark:bg-slate-800 grid md:grid-cols-2 gap-8 items-center border border-slate-100 dark:border-slate-700">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-serif text-xl font-medium text-slate-800 dark:text-slate-100">Ativar Lembretes de Ingestão</h4>
                      <p className="text-xs text-slate-400">Sincronizado com o plano alimentar atual.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleToggleIngestionGlobal(!ingestionRemindersEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${ingestionRemindersEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${ingestionRemindersEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/30 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <p>💡 <strong>Como funciona:</strong> Nosso motor inteligente analisa seu cardápio e gera notificações personalizadas para cada refeição e janela de micronutrientes.</p>
                </div>
              </div>

              {/* Add Custom Reminder Form */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Adicionar Novo Lembrete</h5>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      type="text"
                      placeholder="Título (Ex: Pós-Treino)"
                      value={newReminderTitle}
                      onChange={(e) => setNewReminderTitle(e.target.value)}
                      className="col-span-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input 
                      type="time"
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <input 
                    type="text"
                    placeholder="Nutriente / Alimento (Ex: Whey Protein + Glutamina)"
                    value={newReminderNutrient}
                    onChange={(e) => setNewReminderNutrient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleAddIngestionReminder}
                    disabled={!newReminderTitle.trim() || !newReminderNutrient.trim()}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Programar Lembrete de Ingestão
                  </button>
                </div>
              </div>
            </div>

            {/* Scheduled Ingestion Reminders List */}
            <div className="clay-card p-8 shadow-xl bg-white dark:bg-slate-800 space-y-6 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-xl font-medium text-slate-800 dark:text-slate-100">Horários e Ingestões Programadas</h4>
                  <p className="text-xs text-slate-500">Baseado no seu plano alimentar atual e metas nutricionais.</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold">
                  {ingestionList.filter(i => i.enabled).length} Ativos
                </span>
              </div>

              <div className="grid gap-3">
                {ingestionList.map(item => (
                  <div 
                    key={item.id} 
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      item.enabled 
                        ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm' 
                        : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-black text-sm flex items-center justify-center shrink-0">
                        {item.time}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</h5>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">🎯 Foco: <strong className="text-purple-600 dark:text-purple-400">{item.nutrient}</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => testPushReminder(item)}
                        className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 text-purple-600 dark:text-purple-300 rounded-xl text-xs font-bold transition-all"
                        title="Testar notificação push deste item"
                      >
                        Testar Alerta
                      </button>
                      <button
                        onClick={() => handleToggleSingleIngestion(item.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${item.enabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'hydration' && (
          <motion.div key="hydration" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            
            {/* Main grid: Ring + Water Input */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Ring card */}
              <div className="clay-card p-8 shadow-xl flex flex-col items-center justify-center space-y-6 relative overflow-hidden bg-white dark:bg-slate-800">
                <div 
                  className="absolute bottom-0 left-0 w-full bg-cyan-400/10 dark:bg-cyan-400/5 transition-all duration-1000 ease-in-out"
                  style={{ height: `${waterPercentage}%` }}
                />
                
                <div className="relative z-10 flex flex-col items-center w-full">
                  <div className="w-48 h-48 rounded-full flex items-center justify-center relative bg-white/40 dark:bg-slate-800/40 shadow-inner">
                    <div className="text-center relative z-10">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consumido</p>
                       <p className="text-4xl font-serif font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                          {currentTotalWater}ml
                       </p>
                       
                       {isEditingGoal ? (
                         <div className="flex items-center gap-1 mt-2 justify-center">
                           <input 
                             type="number" 
                             value={tempWaterGoal}
                             onChange={(e) => setTempWaterGoal(e.target.value)}
                             className="w-16 text-center border-b border-cyan-500 text-xs font-bold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none"
                             autoFocus
                           />
                           <button onClick={handleUpdateWaterGoal} className="p-1 bg-cyan-500 text-white rounded-full hover:bg-cyan-600">
                             <Check className="w-3 h-3" />
                           </button>
                         </div>
                       ) : (
                         <div className="flex items-center gap-1 mt-1 justify-center group cursor-pointer" onClick={() => { setIsEditingGoal(true); setTempWaterGoal(String(goalWater)); playSfx('tap'); }}>
                           <p className="text-xs text-slate-400">Meta: {goalWater}ml</p>
                           <Pencil className="w-3 h-3 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                         </div>
                       )}
                    </div>
                    <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full -rotate-90">
                       <circle
                         cx="96" cy="96" r="84" fill="none"
                         stroke="currentColor" strokeWidth="8"
                         className="text-slate-100 dark:text-slate-700/60"
                       />
                       <circle
                         cx="96" cy="96" r="84" fill="none"
                         stroke="currentColor" strokeWidth="8"
                         className="text-cyan-500 transition-all duration-1000"
                         strokeDasharray={2 * Math.PI * 84}
                         strokeDashoffset={2 * Math.PI * 84 * (1 - waterPercentage / 100)}
                         strokeLinecap="round"
                       />
                    </svg>
                  </div>
                  
                  {/* Quick status bar */}
                  <div className="w-full mt-6 bg-slate-100 dark:bg-slate-700/50 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {waterPercentage >= 100 
                        ? "🎉 Excelente! Você atingiu sua meta diária de hidratação!" 
                        : `Você completou ${waterPercentage.toFixed(0)}% da sua meta recomendada de água hoje.`}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Logger card */}
              <div className="clay-card p-8 shadow-xl flex flex-col justify-between space-y-6 bg-white dark:bg-slate-800">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl text-slate-800 dark:text-slate-100 font-medium">Registrar Ingestão</h3>
                    <p className="text-sm text-slate-500">Escolha a origem da água e o volume consumido.</p>
                  </div>

                  {/* Water Source Picker */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Filter className="w-3 h-3 text-cyan-500" /> {t('water_source_label', 'Origem da Água')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {WATER_SOURCES.map(src => (
                        <button
                          key={src.id}
                          onClick={() => { setSelectedWaterSource(src.id); playSfx('tap'); }}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                            selectedWaterSource === src.id
                              ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-sm scale-[1.02]'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                          }`}
                        >
                          <span className="text-xl mb-1">{src.icon}</span>
                          <span className="text-xs font-bold leading-tight">{t(src.label)}</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">{src.pH}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Water Quantity Picker */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {t('volume_consumed', 'Volume Consumido')}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { amount: 150, label: "Xícara/Dose", sub: "150ml" },
                        { amount: 250, label: "Copo", sub: "250ml" },
                        { amount: 350, label: "Copo Grande", sub: "350ml" },
                        { amount: 500, label: "Garrafa", sub: "500ml" },
                      ].map(preset => (
                        <button
                          key={preset.amount}
                          onClick={() => handleAddWater(preset.amount)}
                          className="flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-900 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 transition-all rounded-xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          <span className="text-xs font-black">{preset.sub}</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 hover:text-white/80 mt-0.5">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Water Logger */}
                  <div className="flex gap-2 pt-2 items-center">
                    <div className="relative flex-1">
                      <input 
                        type="number"
                        value={customWaterAmount}
                        onChange={(e) => setCustomWaterAmount(e.target.value)}
                        placeholder="Quantidade personalizada"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                      />
                      <span className="absolute right-4 top-2.5 text-sm font-bold text-slate-400">ml</span>
                    </div>
                    <button
                      onClick={() => {
                        const amt = parseInt(customWaterAmount);
                        if (!isNaN(amt) && amt > 0) {
                          handleAddWater(amt);
                          setCustomWaterAmount('');
                        }
                      }}
                      className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-4 h-4" /> Registrar
                    </button>
                  </div>
                </div>

                {/* Selected Source Info Card */}
                {(() => {
                  const srcInfo = WATER_SOURCES.find(s => s.id === selectedWaterSource);
                  if (!srcInfo) return null;
                  return (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                      <div className="w-9 h-9 shrink-0 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-lg shadow-sm">
                        {srcInfo.icon}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">{srcInfo.label} • {srcInfo.pH}</p>
                        <p className="text-[11px] text-slate-400 leading-normal">{srcInfo.desc} <strong className="text-cyan-600 dark:text-cyan-400">{srcInfo.benefit}</strong></p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Geo & Climate Hydration Reminders Card */}
            <div className="clay-card p-8 shadow-xl bg-gradient-to-br from-cyan-900 to-blue-950 text-white space-y-6 relative overflow-hidden border border-cyan-800/50">
              <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-10 relative">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-cyan-200 shadow-inner">
                    <Waves className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-serif text-xl font-bold">Lembretes de Hidratação por Geolocalização & Clima</h4>
                    <p className="text-xs text-cyan-200">Alertas e metas automáticas baseadas na temperatura e umidade da sua região.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleFetchGeoWeather}
                    disabled={geoLoading}
                    className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
                    {geoLoading ? 'Detectando Clima...' : 'Atualizar GPS & Clima'}
                  </button>

                  <button 
                    onClick={() => handleToggleGeoHydration(!geoHydrationEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${geoHydrationEnabled ? 'bg-cyan-400' : 'bg-slate-700'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-900 shadow ring-0 transition duration-200 ease-in-out ${geoHydrationEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 z-10 relative pt-2">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-3">
                  <span className="text-2xl">📍</span>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-black text-cyan-300">Localização</p>
                    <p className="text-xs font-bold truncate text-white">{geoLocationName}</p>
                  </div>
                </div>

                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-3">
                  <span className="text-2xl">🌡️</span>
                  <div>
                    <p className="text-[10px] uppercase font-black text-cyan-300">Temperatura Local</p>
                    <p className="text-base font-black text-white">{geoTemp}°C {geoTemp > 28 ? '🔥 (Quente)' : geoTemp < 18 ? '❄️ (Fresco)' : '☀️ (Agradável)'}</p>
                  </div>
                </div>

                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-3">
                  <span className="text-2xl">💧</span>
                  <div>
                    <p className="text-[10px] uppercase font-black text-cyan-300">Umidade Relativa</p>
                    <p className="text-base font-black text-white">{geoHumidity}% {geoHumidity < 40 ? '⚠️ (Seco)' : '✅ (Normal)'}</p>
                  </div>
                </div>
              </div>

              {geoHydrationEnabled && (
                <div className="p-4 bg-cyan-500/20 rounded-2xl border border-cyan-400/30 text-xs text-cyan-100 flex flex-col sm:flex-row items-center justify-between gap-4 z-10 relative">
                  <div>
                    <p>💡 <strong>Revisão Climática:</strong> Com base na temperatura de {geoTemp}°C e umidade de {geoHumidity}%, sua meta recomendada de água é de <strong className="text-white font-black">{climateAdjustedGoal}ml</strong> (+{climateExtraWater}ml devido ao clima).</p>
                  </div>
                  <button
                    onClick={() => {
                      onUpdateProfile({ waterGoal: climateAdjustedGoal });
                      playSfx('success');
                      vibrate(50);
                      if (addNotification) {
                        addNotification({
                          title: "Meta Atualizada pelo Clima! 💧",
                          message: `Sua meta diária foi ajustada para ${climateAdjustedGoal}ml devido às condições locais.`,
                          type: 'achievement'
                        });
                      }
                    }}
                    className="px-4 py-2 bg-white text-cyan-900 hover:bg-cyan-50 rounded-xl text-xs font-black shadow transition-all shrink-0"
                  >
                    Aplicar Meta Climática ({climateAdjustedGoal}ml)
                  </button>
                </div>
              )}
            </div>

            {/* Alarm & Reminder Settings Card */}
            <div className="clay-card p-8 shadow-xl bg-white dark:bg-slate-800 grid md:grid-cols-2 gap-8 items-center border border-slate-100 dark:border-slate-700">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
                      <Bell className="w-5 h-5 animate-swing" />
                    </div>
                    <div>
                      <h4 className="font-serif text-xl font-medium text-slate-800 dark:text-slate-100">Lembrete de Hidratação</h4>
                      <p className="text-xs text-slate-400">Alarmes periódicos automáticos.</p>
                    </div>
                  </div>
                  
                  {/* Switch toggle */}
                  <button 
                    onClick={() => handleToggleReminders(!reminderEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${reminderEnabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${reminderEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                      <span>Frequência</span>
                      <span className="text-rose-500 font-bold">A cada {reminderInterval} minutos</span>
                    </div>
                    <input 
                      type="range" 
                      min="15" 
                      max="180" 
                      step="15" 
                      value={reminderInterval}
                      disabled={!reminderEnabled}
                      onChange={(e) => handleUpdateReminderInterval(parseInt(e.target.value))}
                      className="w-full accent-rose-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Horário Inicial</label>
                      <select
                        value={reminderStartHour}
                        disabled={!reminderEnabled}
                        onChange={(e) => handleUpdateReminderHours(parseInt(e.target.value), reminderEndHour)}
                        className="w-full text-xs font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none disabled:opacity-50 text-slate-700 dark:text-slate-300"
                      >
                        {[6, 7, 8, 9, 10, 11, 12].map(h => (
                          <option key={h} value={h}>{h}:00</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Horário Final</label>
                      <select
                        value={reminderEndHour}
                        disabled={!reminderEnabled}
                        onChange={(e) => handleUpdateReminderHours(reminderStartHour, parseInt(e.target.value))}
                        className="w-full text-xs font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none disabled:opacity-50 text-slate-700 dark:text-slate-300"
                      >
                        {[18, 19, 20, 21, 22, 23].map(h => (
                          <option key={h} value={h}>{h}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reminder Live Countdown */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                {reminderEnabled ? (
                  <>
                    <Waves className={`w-12 h-12 text-cyan-500 ${isOverdue ? 'animate-bounce' : 'animate-pulse'}`} />
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold uppercase tracking-widest text-slate-400">Próxima Notificação</h5>
                      {isOverdue ? (
                        <p className="text-xl font-black text-rose-500 animate-pulse">⚠️ ALERTA: Você está atrasado para se hidratar!</p>
                      ) : (
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                          em <strong className="text-cyan-600 dark:text-cyan-400">{nextReminderMinutes} minutos</strong>
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        Calculado automaticamente desde seu último copo às {latestLogOfToday ? new Date(latestLogOfToday.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}.
                      </p>
                    </div>
                    <button 
                      onClick={handleTestNotification}
                      className="px-4 py-2 bg-white dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-750 transition-all active:scale-95"
                    >
                      Testar Envio de Alerta
                    </button>
                  </>
                ) : (
                  <>
                    <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold uppercase tracking-widest text-slate-400">Lembrete Desativado</h5>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">Ative a chave de lembrete ao lado para receber alertas inteligentes baseados na sua ingestão real!</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Water Stats Breakdown & AI Quality Advisor */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Stats Breakdown */}
              <div className="clay-card p-8 shadow-xl bg-white dark:bg-slate-800 space-y-6 border border-slate-100 dark:border-slate-700">
                <div className="space-y-1">
                  <h4 className="font-serif text-xl font-medium text-slate-800 dark:text-slate-100">Divisão de Qualidade da Origem</h4>
                  <p className="text-xs text-slate-500">Acompanhamento pessoal dos tipos de água que você consumiu hoje.</p>
                </div>

                {currentTotalWater === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Waves className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-sm">Nenhum registro de hidratação feito hoje.</p>
                    <p className="text-xs mt-1">Seus volumes de água por origem aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sourceStats.map(stat => (
                      <div key={stat.id} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                            <span>{stat.icon}</span>
                            <span>{stat.label}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({stat.pH})</span>
                          </div>
                          <span className="font-semibold text-slate-500">{stat.ml}ml ({stat.pct}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${stat.pct}%` }}
                            className="h-full bg-cyan-500 rounded-full"
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Water Quality Consultant */}
              <div className="clay-card p-8 shadow-xl bg-white dark:bg-slate-800 space-y-6 border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-serif text-xl font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> Consultor de Qualidade da Água
                    </h4>
                    <p className="text-xs text-slate-500">Tire dúvidas sobre filtros de barro, alcalinização, poços, água dura e purificação.</p>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={waterQuery}
                      onChange={(e) => setWaterQuery(e.target.value)}
                      placeholder="Ex: O filtro de barro tradicional de cerâmica realmente limpa bem a água? Como aumentar o pH da água mineral em casa?"
                      rows={3}
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-700 dark:text-slate-200 leading-relaxed"
                    />
                    <button
                      onClick={handleAskWaterAdvisor}
                      disabled={isAnalyzingWater || !waterQuery.trim()}
                      className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                    >
                      {isAnalyzingWater ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analisando parâmetros de água...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> Analisar Parâmetros de Qualidade com IA
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {waterAnswer && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-4 p-4 bg-cyan-50/50 dark:bg-cyan-950/20 rounded-2xl border border-cyan-100/60 dark:border-cyan-900/30 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-h-[180px] overflow-y-auto"
                    >
                      <h5 className="font-bold text-cyan-800 dark:text-cyan-400 mb-1 flex items-center gap-1">🔬 Parecer do Especialista:</h5>
                      <p className="whitespace-pre-line">{waterAnswer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Water logs history list */}
            <div className="clay-card p-8 shadow-xl bg-white dark:bg-slate-800 space-y-4 border border-slate-100 dark:border-slate-700">
              <h4 className="font-serif text-xl font-medium text-slate-800 dark:text-slate-100">Registros de Hidratação de Hoje</h4>
              
              {todayHydration.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Nenhum copo de água registrado hoje ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        <th className="py-2.5">Horário</th>
                        <th className="py-2.5">Volume</th>
                        <th className="py-2.5">Origem da Água</th>
                        <th className="py-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-xs text-slate-600 dark:text-slate-300">
                      {[...todayHydration].reverse().map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 font-semibold">
                            {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 font-black text-slate-800 dark:text-slate-200">
                            {log.amount} ml
                          </td>
                          <td className="py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {WATER_SOURCES.find(s => s.id === log.source)?.icon || '💧'} {log.source || 'Filtrada'}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteWaterLog(log.id)}
                              className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                              title="Remover registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </motion.div>
        )}

        {activeTab === 'sleep' && (
          <motion.div key="sleep" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid md:grid-cols-2 gap-8">
            <div className="clay-card p-8 shadow-xl flex flex-col items-center justify-center text-center space-y-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-0">
               <Moon className="w-16 h-16 text-indigo-400 opacity-80" />
               <div className="space-y-2">
                 <h3 className="font-serif text-2xl font-medium text-indigo-100">Como você dormiu?</h3>
                 <p className="text-indigo-300">O sono profundo regula hormônios como leptina e grelina, que controlam a fome.</p>
               </div>
               {todaySleep && (
                 <div className="bg-white/10 px-6 py-4 rounded-2xl mt-4 border border-white/10">
                   <p className="text-sm font-bold text-indigo-200 uppercase tracking-widest mb-1">Registro de Hoje</p>
                   <p className="text-3xl font-black">{todaySleep.durationHours} hrs</p>
                   <p className="text-indigo-300 mt-1">Qualidade: {todaySleep.quality}</p>
                 </div>
               )}
            </div>

            <div className="clay-card p-8 shadow-xl flex flex-col justify-center space-y-8 bg-white dark:bg-slate-800">
               <div className="space-y-4">
                 <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest">Horas de sono</label>
                 <div className="flex items-center gap-4">
                   <input 
                     type="range" min="3" max="14" step="0.5" 
                     value={sleepHours} 
                     onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                     className="w-full accent-indigo-500" 
                   />
                   <span className="font-black text-2xl text-slate-700 dark:text-slate-200 min-w-[3ch]">{sleepHours}</span>
                 </div>
               </div>

               <div className="space-y-4">
                 <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest">Qualidade</label>
                 <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                   {(['Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'] as const).map(q => (
                     <button
                       key={q}
                       onClick={() => { setSleepQuality(q); playSfx('tap'); }}
                       className={`py-2 px-1 text-xs font-bold rounded-xl border ${sleepQuality === q ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                     >
                       {q}
                     </button>
                   ))}
                 </div>
               </div>

               <button 
                 onClick={() => { handleLogSleep(); playSfx('success'); setShowConfetti(true); }}
                 className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
               >
                 <Moon className="w-5 h-5" />
                 Salvar Registro de Sono
               </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'fasting' && (
          <motion.div key="fasting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid md:grid-cols-2 gap-8">
            <div className="clay-card p-8 shadow-xl flex flex-col items-center justify-center text-center space-y-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
               <Clock className="w-16 h-16 text-amber-200 opacity-80" />
               <div className="space-y-2">
                 <h3 className="font-serif text-2xl font-medium text-amber-50">Jejum Intermitente</h3>
                 <p className="text-amber-200">Aumente a sensibilidade à insulina e promova autofagia com períodos de repouso digestivo.</p>
               </div>
               {todayFasting && (
                 <div className="bg-white/10 px-6 py-4 rounded-2xl mt-4 border border-white/10">
                   <p className="text-sm font-bold text-amber-200 uppercase tracking-widest mb-1">Registro de Hoje</p>
                   <p className="text-3xl font-black">{todayFasting.durationHours} hrs</p>
                 </div>
               )}
            </div>

            <div className="clay-card p-8 shadow-xl flex flex-col justify-center space-y-8 bg-white dark:bg-slate-800">
               <div className="space-y-4">
                 <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest">Protocolo Realizado</label>
                 <div className="flex items-center gap-4">
                   <input 
                     type="range" min="12" max="24" step="1" 
                     value={fastingHours} 
                     onChange={(e) => setFastingHours(parseInt(e.target.value))}
                     className="w-full accent-amber-500" 
                   />
                   <span className="font-black text-2xl text-slate-700 dark:text-slate-200 min-w-[4ch]">{fastingHours}h</span>
                 </div>
               </div>
               
               <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                 <Info className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-sm text-amber-700 dark:text-amber-400">
                   Registros consistentes de jejum permitem que nossa IA recomende os melhores alimentos para quebra (desjejum) e otimize seus horários baseados no sono.
                 </p>
               </div>

               <button 
                 onClick={() => { handleLogFasting(); playSfx('success'); setShowConfetti(true); }}
                 className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
               >
                 <Clock className="w-5 h-5" />
                 Salvar Registro de Jejum
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Speed-Dial Menu for Quick Activity Logging */}
      <div 
        data-testid="habit-speed-dial-container"
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3"
      >
        <AnimatePresence>
          {isSpeedDialOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              className="flex flex-col items-end gap-2.5 mb-1"
            >
              {/* Speed Dial Item 1: Drink Water */}
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                onClick={handleQuickWaterLog}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <span className="bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold py-1.5 px-3 rounded-xl shadow-lg border border-slate-700/50 dark:border-slate-200/50 backdrop-blur-md transition-all group-hover:scale-105">
                  💧 Beber Água (+250ml)
                </span>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg border border-cyan-300/40 group-hover:scale-110 transition-all">
                  <Droplet className="w-5 h-5 fill-cyan-100" />
                </div>
              </motion.button>

              {/* Speed Dial Item 2: Walk */}
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                onClick={handleQuickWalkLog}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <span className="bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold py-1.5 px-3 rounded-xl shadow-lg border border-slate-700/50 dark:border-slate-200/50 backdrop-blur-md transition-all group-hover:scale-105">
                  🚶 Registra Caminhada (+20m)
                </span>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg border border-emerald-300/40 group-hover:scale-110 transition-all">
                  <Activity className="w-5 h-5" />
                </div>
              </motion.button>

              {/* Speed Dial Item 3: Fasting Log */}
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                onClick={handleQuickFastingLog}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <span className="bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold py-1.5 px-3 rounded-xl shadow-lg border border-slate-700/50 dark:border-slate-200/50 backdrop-blur-md transition-all group-hover:scale-105">
                  ⏱️ Jejum ({fastingHours}h)
                </span>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg border border-amber-300/40 group-hover:scale-110 transition-all">
                  <Clock className="w-5 h-5" />
                </div>
              </motion.button>

              {/* Speed Dial Item 4: Sleep Log */}
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                onClick={handleQuickSleepLog}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <span className="bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold py-1.5 px-3 rounded-xl shadow-lg border border-slate-700/50 dark:border-slate-200/50 backdrop-blur-md transition-all group-hover:scale-105">
                  🌙 Registrar Sono ({sleepHours}h)
                </span>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg border border-indigo-300/40 group-hover:scale-110 transition-all">
                  <Moon className="w-5 h-5" />
                </div>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Floating Action Button (FAB Trigger) */}
        <button
          data-testid="habit-speed-dial-trigger"
          onClick={() => {
            playSfx('tap');
            vibrate(30);
            setIsSpeedDialOpen(!isSpeedDialOpen);
          }}
          className={`w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white shadow-2xl flex items-center justify-center border-2 border-emerald-300/40 transition-all cursor-pointer hover:scale-110 active:scale-95 ${
            isSpeedDialOpen ? 'rotate-45 ring-4 ring-emerald-400/40' : 'ring-2 ring-emerald-500/20'
          }`}
          title={isSpeedDialOpen ? 'Fechar menu de registro' : 'Menu de Registro Rápido'}
        >
          <Plus className="w-7 h-7 text-white stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
