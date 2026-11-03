import { safeGet, safeSet, safeRemove } from "../lib/storage";
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LanguageSwitcher } from './LanguageSwitcher';
import { HealthIntegrationSettings } from './HealthIntegrationSettings';
import { AvatarGallery } from './AvatarGallery';
import { getAvatarById, AvatarCatalogItem } from '../data/avatarCatalog';
import { UserProfile, MacroPreset } from '../types';
import { 
  Check, LogOut, Cloud, Bell, BellOff, Fingerprint, ScanFace, 
  ShieldCheck, Trash2, Sparkles, Volume2, Camera, Upload, 
  User, RefreshCw, X, Image as ImageIcon, Droplets, Contrast, Eye, Database, Compass,
  Clock, Trophy, Target, Smartphone, Flame, AlertCircle, CheckCircle2, Zap, Cpu, Layers, Store, Mic, MicOff,
  FileSpreadsheet, Stethoscope, FileText, Sliders, Scale, PieChart, TrendingUp, HelpCircle,
  Calendar, Sun, Moon
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { auth, db, doc, deleteDoc } from '../lib/firebase';
import { deleteUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { MealNotificationTimes } from '../types';
import { 
  DEFAULT_MEAL_TIMES, 
  DEFAULT_CHALLENGE_TIMES, 
  syncSchedulesToServiceWorker, 
  triggerNativeTestNotification, 
  triggerUpcomingMealNotification,
  requestNotificationPermission, 
  getNotificationPermission 
} from '../lib/pushScheduler';

import { NutritionalReportPDF } from './NutritionalReportPDF';
import { HealthReportExportModal } from './HealthReportExportModal';
import { ClinicalTextSummaryModal } from './ClinicalTextSummaryModal';
import { FamilyProfilesManager } from './FamilyProfilesManager';
import { WearablesSync } from './WearablesSync';
import { SavedRecipesSwipeList } from './SavedRecipesSwipeList';
import { Profile3DAvatar } from './Profile3DAvatar';
import { WorkoutCategoryNotificationSettings } from './WorkoutCategoryNotificationSettings';
import { PushNotificationManagerModal } from './PushNotificationManagerModal';
import { ThemePaletteSelector } from './ThemePaletteSelector';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


interface ProfileProps {
  profile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
  addNotification?: (notif: { title: string; message: string; type: 'achievement' | 'point' | 'streak' | 'info' | 'success' | 'warning' | 'error' }) => void;
}

const PRESET_AVATARS = [
  { id: 'robot-humanoid', label: 'Robô Humanóide 3D', url: '/assets/robot_avatar_portrait.jpg' },
  { id: 'chef', label: 'Chef Saudável', url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'fitness-woman', label: 'Atleta Fitness', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'fitness-man', label: 'Treino & Força', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'wellness', label: 'Zen & Bem-Estar', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'runner', label: 'Corrida & Energia', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'nature', label: 'Vitalidade Natural', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'nutrition', label: 'Nutrição & Vida', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'modern', label: 'Estilo & Foco', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=300&h=300' }
];

export const AVATAR_OPTIONS = [
  { id: 'cyberfit-biomechanic', name: 'Robô Humanóide 3D', gender: 'Unissex', category: 'Futurista 3D', description: 'Robô Humanóide Glossy com Luvas Glowing Orange-Red' },
  { id: 'athletic-01', name: 'Athena Fit Pro', gender: 'Feminino', category: 'Atlético', description: 'Alta Performance & Definição Atlética' },
  { id: 'fitness-02', name: 'Titan Iron', gender: 'Masculino', category: 'Hipertrofia', description: 'Hipertrofia & Força Máxima' },
  { id: 'athletic-02', name: 'Valkyrie Prime', gender: 'Feminino', category: 'Cross-Training', description: 'Força Funcional & HIIT' },
  { id: 'runner-01', name: 'Marcus Runner', gender: 'Masculino', category: 'Endurance', description: 'Cardio, Agilidade & Corrida' },
  { id: 'cyberfit-01', name: 'CyberFit Biomechanic', gender: 'Unissex', category: 'Futurista', description: 'Scanner Anatômico em Tempo Real' },
  { id: 'wellness-01', name: 'Maya ZenFlow', gender: 'Feminino', category: 'Wellness', description: 'Yoga, Mobilidade & Equilíbrio' },
  { id: 'athena-fit-pro', name: 'Athena Fit Pro (Elite)', gender: 'Feminino', category: 'Pro 3D', description: 'Modelo 3D Quantizado DRACO' },
  { id: 'titan-iron', name: 'Titan Iron (Elite)', gender: 'Masculino', category: 'Pro 3D', description: 'Modelo 3D Quantizado DRACO' },
  { id: 'valkyrie-cross', name: 'Valkyrie Cross (Elite)', gender: 'Feminino', category: 'Pro 3D', description: 'Modelo 3D Quantizado DRACO' },
  { id: 'leo-mesomorph', name: 'Leo Mesomorph', gender: 'Masculino', category: 'Atlético', description: 'Proporções Clássicas de Hipertrofia' },
  { id: 'elena-wellness', name: 'Elena Vitality', gender: 'Feminino', category: 'Tonificação', description: 'Tonificação & Saúde Integral' },
  { id: 'male-athletic-01', name: 'Treinador Masculino Padrão', gender: 'Masculino', category: 'Padrão', description: 'Instrutor de Calistenia & Força' },
  { id: 'female-athletic-01', name: 'Treinadora Feminina Padrão', gender: 'Feminino', category: 'Padrão', description: 'Instrutora de Mobilidade & Força' },
];

export function Profile({ profile, onSaveProfile, addNotification }: ProfileProps) {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [mealRemindersEnabled, setMealRemindersEnabled] = useState<boolean>(() => {
    if (profile?.mealRemindersEnabled !== undefined) return Boolean(profile.mealRemindersEnabled);
    return safeGet('nutri-meal-reminders') !== 'false';
  });
  const [challengeRemindersEnabled, setChallengeRemindersEnabled] = useState<boolean>(() => {
    if (profile?.challengeRemindersEnabled !== undefined) return Boolean(profile.challengeRemindersEnabled);
    return safeGet('nutri-challenge-reminders') !== 'false';
  });
  const [mealTimes, setMealTimes] = useState<Required<MealNotificationTimes>>(() => ({
    breakfast: profile?.mealNotificationTimes?.breakfast || safeGet('nutri-meal-time-breakfast') || DEFAULT_MEAL_TIMES.breakfast,
    morningSnack: profile?.mealNotificationTimes?.morningSnack || safeGet('nutri-meal-time-morningSnack') || DEFAULT_MEAL_TIMES.morningSnack,
    lunch: profile?.mealNotificationTimes?.lunch || safeGet('nutri-meal-time-lunch') || DEFAULT_MEAL_TIMES.lunch,
    afternoonSnack: profile?.mealNotificationTimes?.afternoonSnack || safeGet('nutri-meal-time-afternoonSnack') || DEFAULT_MEAL_TIMES.afternoonSnack,
    dinner: profile?.mealNotificationTimes?.dinner || safeGet('nutri-meal-time-dinner') || DEFAULT_MEAL_TIMES.dinner,
    supper: profile?.mealNotificationTimes?.supper || safeGet('nutri-meal-time-supper') || DEFAULT_MEAL_TIMES.supper
  }));
  const [challengeTime, setChallengeTime] = useState<string>(() => {
    return profile?.challengeReminderTime || safeGet('nutri-challenge-time-morning') || DEFAULT_CHALLENGE_TIMES.morningReminder;
  });
  const [challengeReviewTime, setChallengeReviewTime] = useState<string>(() => {
    return profile?.challengeReviewTime || safeGet('nutri-challenge-time-evening') || DEFAULT_CHALLENGE_TIMES.eveningReview;
  });
  const [hydrationRemindersEnabled, setHydrationRemindersEnabled] = useState<boolean>(() => {
    if (profile?.hydrationRemindersEnabled !== undefined) return Boolean(profile.hydrationRemindersEnabled);
    return safeGet('nutri-hydration-reminders') !== 'false';
  });
  const [hydrationInterval, setHydrationInterval] = useState<string>(() => {
    return String(profile?.hydrationInterval || safeGet('nutri-hydration-interval') || '90');
  });
  const [workoutRemindersEnabled, setWorkoutRemindersEnabled] = useState<boolean>(() => {
    if (profile?.workoutRemindersEnabled !== undefined) return Boolean(profile.workoutRemindersEnabled);
    return safeGet('nutri-workout-reminders') !== 'false';
  });


  const handleToggleHydrationReminders = () => {
    const next = !hydrationRemindersEnabled;
    setHydrationRemindersEnabled(next);
    safeSet('nutri-hydration-reminders', String(next));
    playSfx('tap');
    vibrate(15);
    if (profile) {
      onSaveProfile({ ...profile, hydrationRemindersEnabled: next, hydrationInterval });
    }
    if (next && addNotification) {
      addNotification({
        title: 'Hidratação Ativada',
        message: 'Lembretes periódicos de água ativados com sucesso!',
        type: 'success'
      });
    }
  };

  const handleToggleWorkoutReminders = () => {
    const next = !workoutRemindersEnabled;
    setWorkoutRemindersEnabled(next);
    safeSet('nutri-workout-reminders', String(next));
    playSfx('tap');
    vibrate(15);
    if (profile) {
      onSaveProfile({ ...profile, workoutRemindersEnabled: next, workoutReminderTimes: profile.workoutReminderTimes });
    }
    if (next && addNotification) {
      addNotification({
        title: 'Lembretes de Treino Ativados',
        message: 'Sua rotina de treinos e preparação física está programada.',
        type: 'success'
      });
    }
  };

  const handleTestHydrationNotification = () => {
    playSfx('crystal');
    vibrate([20, 40]);
    if (addNotification) {
      addNotification({
        title: '💧 Hora de Beber Água!',
        message: 'Mantenha-se hidratado(a)! Beba um copo d\'água agora para manter seu metabolismo em alta.',
        type: 'info'
      });
    } else {
      alert('💧 Hora de Beber Água! Mantenha-se hidratado(a)!');
    }
  };

  const handleTestWorkoutNotification = () => {
    playSfx('success');
    vibrate([30, 60, 30]);
    if (addNotification) {
      addNotification({
        title: '🏋️ Hora do Treino!',
        message: 'Prepare seu equipamento e aquecimento. Seu horário de treino programado chegou!',
        type: 'success'
      });
    } else {
      alert('🏋️ Hora do Treino! Prepare-se para sua sessão!');
    }
  };
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [isTestingPreMeal, setIsTestingPreMeal] = useState(false);
  const [highContrastEnabled, setHighContrastEnabled] = useState<boolean>(() => {
    if (profile?.highContrast !== undefined) return Boolean(profile.highContrast);
    return safeGet('nutri-high-contrast') === 'true';
  });

  useEffect(() => {
    if (profile?.highContrast !== undefined) {
      setHighContrastEnabled(Boolean(profile.highContrast));
    }
  }, [profile?.highContrast]);
  const [activeToast, setActiveToast] = useState<{ title: string; desc: string; icon?: 'bell' | 'face' | 'fingerprint' | 'check' } | null>(null);
  const [isTestingBiometric, setIsTestingBiometric] = useState<'face' | 'fingerprint' | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [show3DAvatarGallery, setShow3DAvatarGallery] = useState(false);
  const [avatarHeroMode, setAvatarHeroMode] = useState<'photo' | '3d'>('photo');
  const [customPhotoUrlInput, setCustomPhotoUrlInput] = useState('');
  const [showUrlInputModal, setShowUrlInputModal] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showExportLogsModal, setShowExportLogsModal] = useState(false);
  const [showClinicalTextModal, setShowClinicalTextModal] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<'client' | 'merchant' | 'admin'>(() => {
    if (profile?.role === 'merchant' || profile?.role === 'seller') return 'merchant';
    if (profile?.role === 'admin') return 'admin';
    return 'client';
  });
  const [backupDestination, setBackupDestination] = useState<string>(profile?.backupDestination || '');
  const [sleepGoalHours, setSleepGoalHours] = useState<number>(profile?.sleepGoalHours || 8);
  const [sleepReminderEnabled, setSleepReminderEnabled] = useState<boolean>(!!profile?.sleepReminderEnabled);

  useEffect(() => {
    if (profile?.role) {
      setUserRole(profile.role === 'merchant' || profile.role === 'seller' ? 'merchant' : profile.role === 'admin' ? 'admin' : 'client');
    }
  }, [profile?.role]);

  const handleRoleChange = (newRole: 'client' | 'merchant' | 'admin') => {
    setUserRole(newRole);
    playSfx('tap');
    if (profile) {
      const updated = { ...profile, role: newRole };
      onSaveProfile(updated);
    }
  };

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    photoURL: profile?.photoURL || '',
    email: profile?.email || auth.currentUser?.email || '',
    phone: profile?.phone || '',
    birthDate: profile?.birthDate || '',
    gender: profile?.gender || '',
    avatarId: profile?.avatarId || 'athletic-01',
    age: profile?.age?.toString() || '',
    weight: profile?.weight?.toString() || '',
    targetWeight: profile?.targetWeight?.toString() || '',
    height: profile?.height?.toString() || '',
    activityLevel: profile?.activityLevel || '',
    skinTone: profile?.skinTone || '',
    hairColor: profile?.hairColor || '',
    bodyType: profile?.bodyType || '',
    metabolism: profile?.metabolism || '',
    routine: profile?.routine || '',
    waterGoal: profile?.waterGoal?.toString() || '2500',
    restrictions: profile?.restrictions?.join(', ') || '',
    allergies: profile?.allergies?.join(', ') || '',
    goals: profile?.goals || '',
    preferences: profile?.preferences || '',
    equipment: profile?.equipment?.join(', ') || '',
    dailyCalories: profile?.macroTargets?.calories?.toString() || profile?.masterPlan?.dailyCalories?.toString() || '2000',
    proteinGoal: profile?.macroTargets?.protein?.toString() || profile?.masterPlan?.macros?.protein?.toString() || '130',
    carbsGoal: profile?.macroTargets?.carbs?.toString() || profile?.masterPlan?.macros?.carbs?.toString() || '210',
    fatGoal: profile?.macroTargets?.fat?.toString() || profile?.masterPlan?.macros?.fat?.toString() || '65',
    macroPreset: (profile?.macroTargets?.preset || 'balanced') as MacroPreset,
    themePreference: (profile?.themePreference || 'auto') as 'light' | 'dark' | 'auto',
  });

  // Keep form data in sync if profile updates asynchronously (e.g. initial Firestore load)
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.name || prev.name || '',
        photoURL: profile.photoURL !== undefined ? (profile.photoURL || '') : prev.photoURL,
        email: profile.email || auth.currentUser?.email || prev.email || '',
        phone: profile.phone || prev.phone || '',
        birthDate: profile.birthDate || prev.birthDate || '',
        gender: profile.gender || prev.gender || '',
        avatarId: profile.avatarId || prev.avatarId || 'athletic-01',
        age: profile.age !== undefined && profile.age !== null ? profile.age.toString() : prev.age,
        weight: profile.weight !== undefined && profile.weight !== null ? profile.weight.toString() : prev.weight,
        targetWeight: profile.targetWeight !== undefined && profile.targetWeight !== null ? profile.targetWeight.toString() : prev.targetWeight,
        height: profile.height !== undefined && profile.height !== null ? profile.height.toString() : prev.height,
        activityLevel: profile.activityLevel || prev.activityLevel || '',
        skinTone: profile.skinTone || prev.skinTone || '',
        hairColor: profile.hairColor || prev.hairColor || '',
        bodyType: profile.bodyType || prev.bodyType || '',
        metabolism: profile.metabolism || prev.metabolism || '',
        routine: profile.routine || prev.routine || '',
        waterGoal: profile.waterGoal ? profile.waterGoal.toString() : prev.waterGoal,
        restrictions: profile.restrictions ? profile.restrictions.join(', ') : prev.restrictions,
        allergies: profile.allergies ? profile.allergies.join(', ') : prev.allergies,
        goals: profile.goals || prev.goals || '',
        preferences: profile.preferences || prev.preferences || '',
        equipment: profile.equipment ? profile.equipment.join(', ') : prev.equipment,
        dailyCalories: profile.macroTargets?.calories?.toString() || profile.masterPlan?.dailyCalories?.toString() || prev.dailyCalories || '2000',
        proteinGoal: profile.macroTargets?.protein?.toString() || profile.masterPlan?.macros?.protein?.toString() || prev.proteinGoal || '130',
        carbsGoal: profile.macroTargets?.carbs?.toString() || profile.masterPlan?.macros?.carbs?.toString() || prev.carbsGoal || '210',
        fatGoal: profile.macroTargets?.fat?.toString() || profile.masterPlan?.macros?.fat?.toString() || prev.fatGoal || '65',
        macroPreset: (profile.macroTargets?.preset || prev.macroPreset || 'balanced') as MacroPreset,
        themePreference: (profile.themePreference || prev.themePreference || 'auto') as 'light' | 'dark' | 'auto',
      }));
    }
  }, [profile]);

  const [isSaved, setIsSaved] = useState(false);

  // Web Speech API State
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const speak = (text: string) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const aoede = voices.find(v => v.name.includes('Aoede'));
    if (aoede) utterance.voice = aoede;
    utterance.lang = 'pt-BR';
    synth.speak(utterance);
  };

  const toggleListening = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setInterimTranscript('');
      playSfx('tap');
      vibrate(20);
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert('Seu navegador atual não possui suporte nativo ao microfone via Web Speech.');
      return;
    }

    try {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'pt-BR';
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
        playSfx('pop');
        vibrate(30);
      };

      rec.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += trans;
          } else {
            interim += trans;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          setInterimTranscript('');
          const transcript = final.trim().toLowerCase();
          handleVoiceCommand(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.warn('Speech recognition error in Profile:', event.error);
        setIsListening(false);
        setInterimTranscript('');
        playSfx('scratch');
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
      setInterimTranscript('');
    }
  };

  const handleVoiceCommand = (command: string) => {
    let updated = { ...formData };
    let changed = false;

    if (command.includes('objetivo') || command.includes('meta')) {
      const match = command.match(/(objetivo|meta)\s+(?:para|como|seja)\s+(.+)/);
      if (match) {
        updated.goals = match[2];
        changed = true;
      }
    } else if (command.includes('alergia')) {
      const match = command.match(/alergia\s+(?:a|ao)\s+(.+)/);
      if (match) {
        updated.allergies = updated.allergies ? `${updated.allergies}, ${match[1]}` : match[1];
        changed = true;
      }
    } else if (command.includes('restrição')) {
      const match = command.match(/restrição\s+(.+)/);
      if (match) {
        updated.restrictions = updated.restrictions ? `${updated.restrictions}, ${match[1]}` : match[1];
        changed = true;
      }
    }

    if (changed) {
      setFormData(updated);
      playSfx('success');
      vibrate([40, 40]);
      speak('Perfil atualizado com sucesso.');
      // Persist
      const processedProfile: UserProfile = {
        equipment: 'dumbbells',
        ...(profile || {}),
        name: updated.name.trim() || 'Usuário NutriAI',
        goals: updated.goals || undefined,
        allergies: updated.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        restrictions: updated.restrictions.split(',').map((s) => s.trim()).filter(Boolean),
      } as UserProfile;
      onSaveProfile(processedProfile);
    } else {
      playSfx('error');
      speak('Não entendi o comando. Tente dizer: definir objetivo como, adicionar alergia a, ou restrição.');
    }
  };

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'both' | null>(null);
  const [testScanProgress, setTestScanProgress] = useState(0);

  // ElevenLabs Voice Selection & Malu Customization
  const maluAvatarFileInputRef = useRef<HTMLInputElement>(null);
  const [voices, setVoices] = useState<{ voice_id: string; name: string }[]>([]);
  const [selectedVoice, setSelectedVoice] = useState(profile?.elevenLabsVoiceId || 'Aoede');
  const [maluAvatarStyle, setMaluAvatarStyle] = useState<'artistic' | 'photo' | 'cyber'>(() => {
    return (profile as any)?.maluAvatarConfig?.style || 'artistic';
  });
  const [maluAvatarUrl, setMaluAvatarUrl] = useState<string>(() => {
    return (profile as any)?.maluAvatarConfig?.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300';
  });
  const [maluSpeechSpeed, setMaluSpeechSpeed] = useState<number>(() => {
    return (profile as any)?.maluSpeechSpeed || 1.0;
  });

  const MALU_PRESET_AVATARS = [
    { id: 'robot', label: 'Robô Humanóide 3D', url: '/assets/robot_avatar_portrait.jpg' },
    { id: 'chef', label: 'Chef Malu', url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=300&h=300' },
    { id: 'fitness', label: 'Atleta Fitness', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300' },
    { id: 'zen', label: 'Zen & Bem-Estar', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300&h=300' },
    { id: 'cyber', label: 'Cyber AI', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300&h=300' },
    { id: 'vitality', label: 'Vitalidade Natural', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300&h=300' }
  ];

  const handleMaluFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Str = reader.result as string;
      setMaluAvatarUrl(base64Str);
      handleSaveMaluCustomization({ url: base64Str });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMaluCustomization = (updates: { style?: 'artistic' | 'photo' | 'cyber'; url?: string; speed?: number; voiceId?: string }) => {
    const nextStyle = updates.style !== undefined ? updates.style : maluAvatarStyle;
    const nextUrl = updates.url !== undefined ? updates.url : maluAvatarUrl;
    const nextSpeed = updates.speed !== undefined ? updates.speed : maluSpeechSpeed;
    const nextVoice = updates.voiceId !== undefined ? updates.voiceId : selectedVoice;

    if (updates.style !== undefined) setMaluAvatarStyle(updates.style);
    if (updates.url !== undefined) setMaluAvatarUrl(updates.url);
    if (updates.speed !== undefined) setMaluSpeechSpeed(updates.speed);
    if (updates.voiceId !== undefined) setSelectedVoice(updates.voiceId);

    playSfx('success');
    vibrate([25, 35]);

    const updatedProfile: UserProfile = {
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      ...(profile || {}),
      name: formData.name || profile?.name || 'Usuário NutriAI',
      maluAvatarConfig: { style: nextStyle, url: nextUrl },
      maluSpeechSpeed: nextSpeed,
      elevenLabsVoiceId: nextVoice
    };
    onSaveProfile(updatedProfile);
    showInAppToast('Malu AI Customizada!', 'Aparência, tom de voz e velocidade de fala salvos com sucesso.');
  };

  useEffect(() => {
    fetch('/api/elevenlabs/voices')
      .then(res => res.json())
      .then(data => {
        if (data.voices) {
          setVoices(data.voices);
        }
      })
      .catch(err => console.error("Erro ao carregar vozes:", err));
  }, []);


  useEffect(() => {
    try {
      if ('Notification' in window && typeof Notification !== 'undefined') {
        setNotificationPermission(Notification.permission);
      }
    } catch (e) {
      console.warn('Notification permission read blocked:', e);
    }
  }, []);

  const showInAppToast = (title: string, desc: string, icon: 'bell' | 'face' | 'fingerprint' | 'check' = 'check') => {
    setActiveToast({ title, desc, icon });
    setTimeout(() => {
      setActiveToast(null);
    }, 4000);
  };

  const handleRequestPushPermission = async () => {
    playSfx('tap');
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      playSfx('crystal');
      vibrate([30, 40]);
      showInAppToast('Notificações Nativas Ativadas!', 'O Service Worker agora pode alertar suas refeições e desafios em tempo real.', 'bell');
    } else if (perm === 'denied') {
      showInAppToast('Permissão Negada', 'Habilite as notificações nas configurações do seu navegador para receber alertas.', 'bell');
    }
    return perm;
  };

  const handleToggleMealReminders = async () => {
    const nextState = !mealRemindersEnabled;
    setMealRemindersEnabled(nextState);
    safeSet('nutri-meal-reminders', String(nextState));

    if (nextState) {
      playSfx('crystal');
      vibrate([30, 40]);
      if (notificationPermission === 'default') {
        await handleRequestPushPermission();
      }
      showInAppToast('Lembretes de Refeições Ativados!', 'Você receberá alertas e avisos sonoros nos horários das refeições.', 'bell');
    } else {
      playSfx('pop');
      vibrate(20);
      showInAppToast('Lembretes Desativados', 'Os alertas automáticos de refeições foram pausados.', 'bell');
    }

    const updatedProfile: UserProfile = {
      ...(profile || {}),
      name: formData.name.trim() || profile?.name || 'Usuário NutriAI',
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      mealRemindersEnabled: nextState,
      mealNotificationTimes: mealTimes,
      challengeRemindersEnabled,
      challengeReminderTime: challengeTime,
      challengeReviewTime
    };
    onSaveProfile(updatedProfile);
    syncSchedulesToServiceWorker(updatedProfile);
  };

  const handleToggleChallengeReminders = async () => {
    const nextState = !challengeRemindersEnabled;
    setChallengeRemindersEnabled(nextState);
    safeSet('nutri-challenge-reminders', String(nextState));

    if (nextState) {
      playSfx('crystal');
      vibrate([30, 40]);
      if (notificationPermission === 'default') {
        await handleRequestPushPermission();
      }
      showInAppToast('Alertas de Desafios Ativados!', 'Você será notificado nos horários programados sobre metas e desafios.', 'bell');
    } else {
      playSfx('pop');
      vibrate(20);
      showInAppToast('Alertas de Desafios Pausados', 'Lembretes de desafios foram desativados.', 'bell');
    }

    const updatedProfile: UserProfile = {
      ...(profile || {}),
      name: formData.name.trim() || profile?.name || 'Usuário NutriAI',
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      mealRemindersEnabled,
      mealNotificationTimes: mealTimes,
      challengeRemindersEnabled: nextState,
      challengeReminderTime: challengeTime,
      challengeReviewTime
    };
    onSaveProfile(updatedProfile);
    syncSchedulesToServiceWorker(updatedProfile);
  };

  const handleMealTimeChange = (mealKey: keyof MealNotificationTimes, timeValue: string) => {
    const updatedTimes = { ...mealTimes, [mealKey]: timeValue };
    setMealTimes(updatedTimes);
    safeSet(`nutri-meal-time-${mealKey}`, timeValue);

    const updatedProfile: UserProfile = {
      ...(profile || {}),
      name: formData.name.trim() || profile?.name || 'Usuário NutriAI',
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      mealRemindersEnabled,
      mealNotificationTimes: updatedTimes,
      challengeRemindersEnabled,
      challengeReminderTime: challengeTime,
      challengeReviewTime
    };
    onSaveProfile(updatedProfile);
    syncSchedulesToServiceWorker(updatedProfile);
  };

  const handleChallengeTimeChange = (type: 'morning' | 'evening', timeValue: string) => {
    if (type === 'morning') {
      setChallengeTime(timeValue);
      safeSet('nutri-challenge-time-morning', timeValue);
    } else {
      setChallengeReviewTime(timeValue);
      safeSet('nutri-challenge-time-evening', timeValue);
    }

    const updatedProfile: UserProfile = {
      ...(profile || {}),
      name: formData.name.trim() || profile?.name || 'Usuário NutriAI',
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      mealRemindersEnabled,
      mealNotificationTimes: mealTimes,
      challengeRemindersEnabled,
      challengeReminderTime: type === 'morning' ? timeValue : challengeTime,
      challengeReviewTime: type === 'evening' ? timeValue : challengeReviewTime
    };
    onSaveProfile(updatedProfile);
    syncSchedulesToServiceWorker(updatedProfile);
  };

  const handleTestNativeNotification = async () => {
    setIsTestingPush(true);
    playSfx('notification');
    vibrate([40, 60, 100]);
    showInAppToast('Disparando Push Nativo...', 'Verifique a central de notificações do seu sistema/dispositivo.', 'bell');

    try {
      await triggerNativeTestNotification(
        '🍲 NutriAI - Alerta Nativo & Desafio',
        'Seu lembrete programado de refeição e metas diárias está ativo no Service Worker!'
      );
      setNotificationPermission(getNotificationPermission());
    } catch (e) {
      console.warn('Falha no teste de push nativo:', e);
    } finally {
      setTimeout(() => setIsTestingPush(false), 1200);
    }
  };

  const handleTestUpcomingMealNotification = async () => {
    setIsTestingPreMeal(true);
    playSfx('notification');
    vibrate([40, 60, 100]);
    showInAppToast('Disparando Alerta de Pré-Refeição...', 'Notificação push de refeição prestes a começar enviada.', 'bell');

    try {
      await triggerUpcomingMealNotification(
        'Almoço',
        mealTimes.lunch || '12:30',
        'Salmão Grelhado com Legumes e Quinoa',
        15
      );
      setNotificationPermission(getNotificationPermission());
    } catch (e) {
      console.warn('Falha no teste de refeição prestes a começar:', e);
    } finally {
      setTimeout(() => setIsTestingPreMeal(false), 1200);
    }
  };

  const [circadianConfig, setCircadianConfig] = useState<{
    enabled: boolean;
    intensityAdjustmentEnabled: boolean;
    reminderEnabled: boolean;
    goldenHourStart?: string;
    goldenHourEnd?: string;
  }>(() => {
    return profile?.circadianNotificationConfig || {
      enabled: true,
      intensityAdjustmentEnabled: true,
      reminderEnabled: true,
      goldenHourStart: '06:00',
      goldenHourEnd: '08:00'
    };
  });

  useEffect(() => {
    if (profile?.circadianNotificationConfig) {
      setCircadianConfig({
        enabled: Boolean(profile.circadianNotificationConfig.enabled),
        intensityAdjustmentEnabled: Boolean(profile.circadianNotificationConfig.intensityAdjustmentEnabled),
        reminderEnabled: Boolean(profile.circadianNotificationConfig.reminderEnabled),
        goldenHourStart: (profile.circadianNotificationConfig as any).goldenHourStart || '06:00',
        goldenHourEnd: (profile.circadianNotificationConfig as any).goldenHourEnd || '08:00'
      });
    }
  }, [profile?.circadianNotificationConfig]);

  const handleToggleCircadian = (key: 'enabled' | 'intensityAdjustmentEnabled' | 'reminderEnabled') => {
    const nextVal = !circadianConfig[key];
    const updated = { ...circadianConfig, [key]: nextVal };
    setCircadianConfig(updated);
    playSfx('tap');
    vibrate(15);

    const updatedProfile: UserProfile = {
      ...(profile || {}),
      name: formData.name.trim() || profile?.name || 'Usuário NutriAI',
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      circadianNotificationConfig: updated,
      highContrast: highContrastEnabled,
      mealRemindersEnabled,
      mealNotificationTimes: mealTimes,
      challengeRemindersEnabled,
      challengeReminderTime: challengeTime,
      challengeReviewTime
    };
    onSaveProfile(updatedProfile);
    showInAppToast('Configuração Solar Atualizada', 'Preferências de circADIAN & Golden Hour salvas.', 'bell');
  };

  const handleCircadianTimeChange = (type: 'goldenHourStart' | 'goldenHourEnd', value: string) => {
    const updated = { ...circadianConfig, [type]: value };
    setCircadianConfig(updated);
    safeSet(`nutri-solar-${type}`, value);

    const updatedProfile: UserProfile = {
      ...(profile || {}),
      name: formData.name.trim() || profile?.name || 'Usuário NutriAI',
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      circadianNotificationConfig: updated,
      highContrast: highContrastEnabled,
      mealRemindersEnabled,
      mealNotificationTimes: mealTimes,
      challengeRemindersEnabled,
      challengeReminderTime: challengeTime,
      challengeReviewTime
    };
    onSaveProfile(updatedProfile);
  };

  const handleToggleHighContrast = () => {
    const nextState = !highContrastEnabled;
    setHighContrastEnabled(nextState);
    safeSet('nutri-high-contrast', String(nextState));

    if (nextState) {
      document.documentElement.classList.add('high-contrast');
      playSfx('crystal');
      vibrate([20, 30]);
      showInAppToast('Alto Contraste Ativado!', 'Bordas, fontes e elementos agora possuem contraste ampliado para melhor leitura.', 'check');
    } else {
      document.documentElement.classList.remove('high-contrast');
      playSfx('pop');
      vibrate(20);
      showInAppToast('Alto Contraste Desativado', 'Tema visual padrão reativado com sucesso.', 'check');
    }

    const updatedProfile: UserProfile = {
      ...(profile || {}),
      name: formData.name.trim() || profile?.name || 'Usuário NutriAI',
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      circadianNotificationConfig: circadianConfig,
      highContrast: nextState,
      mealRemindersEnabled,
      mealNotificationTimes: mealTimes,
      challengeRemindersEnabled,
      challengeReminderTime: challengeTime,
      challengeReviewTime
    };
    onSaveProfile(updatedProfile);
  };

  const handleLogout = async () => {
    try {
      playSfx('tap');
      vibrate(15);
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  useEffect(() => {
    const enabled = safeGet('nutri-biometric-enabled') === 'true';
    const type = (safeGet('nutri-biometric-type') as 'face' | 'fingerprint' | 'both') || null;
    setBiometricEnabled(enabled);
    setBiometricType(type);
  }, []);

  const isFaceActive = biometricEnabled && (biometricType === 'face' || biometricType === 'both');
  const isFingerprintActive = biometricEnabled && (biometricType === 'fingerprint' || biometricType === 'both');

  const handleToggleBiometrics = (type: 'face' | 'fingerprint') => {
    const isCurrentlyActive = type === 'face' ? isFaceActive : isFingerprintActive;

    if (isCurrentlyActive) {
      if (biometricType === 'both') {
        const remainingType = type === 'face' ? 'fingerprint' : 'face';
        setBiometricType(remainingType);
        safeSet('nutri-biometric-type', remainingType);
      } else {
        setBiometricEnabled(false);
        setBiometricType(null);
        safeRemove('nutri-biometric-enabled');
        safeRemove('nutri-biometric-type');
      }
      playSfx('pop');
      vibrate(25);
      showInAppToast(
        `${type === 'face' ? 'Reconhecimento Facial' : 'Impressão Digital'} Desativado`,
        'Autenticação biométrica removida com sucesso.',
        type
      );
    } else {
      let nextType: 'face' | 'fingerprint' | 'both' = type;
      if (biometricEnabled && biometricType && biometricType !== type) {
        nextType = 'both';
      }

      setBiometricEnabled(true);
      setBiometricType(nextType);
      safeSet('nutri-biometric-enabled', 'true');
      safeSet('nutri-biometric-type', nextType);
      safeSet('nutri-biometric-email', auth.currentUser?.email || profile?.name || 'usuario@nutriai.com');
      safeSet('nutri-biometric-username', profile?.name || auth.currentUser?.displayName || 'Usuário');

      playSfx('crystal');
      vibrate([35, 45]);
      showInAppToast(
        `${type === 'face' ? 'Reconhecimento Facial' : 'Impressão Digital'} Ativado!`,
        'Sensor vinculado com sucesso para login e desbloqueio rápido.',
        type
      );
    }
  };

  const startBiometricTest = (type: 'face' | 'fingerprint') => {
    setIsTestingBiometric(type);
    setTestScanProgress(0);
    playSfx('tap');
    vibrate(20);

    const interval = setInterval(() => {
      setTestScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          playSfx('crystal');
          vibrate([50, 50]);
          setTimeout(() => {
            setIsTestingBiometric(null);
            showInAppToast(
              'Biometria Validada!',
              `Sensor de ${type === 'face' ? 'Reconhecimento Facial' : 'Impressão Digital'} funcionando perfeitamente.`,
              type
            );
          }, 600);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  // Process & compress uploaded image file into lightweight base64
  const handlePhotoFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    playSfx('tap');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 360;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          setFormData(prev => ({ ...prev, photoURL: compressedDataUrl }));
          
          // Immediately persist photo to profile
          const updatedProfile: UserProfile = {
            restrictions: profile?.restrictions || [],
            allergies: profile?.allergies || [],
            goals: profile?.goals || '',
            equipment: profile?.equipment || [],
            ...(profile || {}),
            name: formData.name || profile?.name || 'Usuário NutriAI',
            photoURL: compressedDataUrl
          };
          onSaveProfile(updatedProfile);

          playSfx('success');
          vibrate([30, 40]);
          showInAppToast('Foto Atualizada!', 'Sua nova foto de perfil foi salva com sucesso.');
        }
        setIsUploadingPhoto(false);
      };
      img.onerror = () => {
        setIsUploadingPhoto(false);
        alert('Erro ao carregar a imagem. Tente outro arquivo.');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetAvatar = (url: string) => {
    setFormData(prev => ({ ...prev, photoURL: url }));
    setShowAvatarPicker(false);

    const updatedProfile: UserProfile = {
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      ...(profile || {}),
      name: formData.name || profile?.name || 'Usuário NutriAI',
      photoURL: url
    };
    onSaveProfile(updatedProfile);

    playSfx('success');
    vibrate([25, 35]);
    showInAppToast('Avatar Selecionado!', 'Avatar de perfil atualizado com sucesso.');
  };

  const handleSelect3DAvatar = (avatarId: string, customConfig?: Partial<AvatarCatalogItem['modelConfig']>) => {
    const avatarItem = getAvatarById(avatarId);
    
    const updatedProfile: UserProfile = {
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      ...(profile || {}),
      name: formData.name || profile?.name || 'Usuário NutriAI',
      avatarId: avatarId,
      avatarName: avatarItem.name,
      avatarAccentColor: customConfig?.accentColor || avatarItem.modelConfig.accentColor,
      skinTone: customConfig?.skinColor || avatarItem.modelConfig.skinColor,
      avatarDracoOptimized: true
    };
    
    onSaveProfile(updatedProfile);
    safeSet('nutri-profile', JSON.stringify(updatedProfile));

    playSfx('success');
    vibrate([30, 40]);
    showInAppToast('Avatar 3D Ativado!', `${avatarItem.name} configurado como seu avatar 3D oficial.`);
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photoURL: '' }));
    
    const updatedProfile: UserProfile = {
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      ...(profile || {}),
      name: formData.name || profile?.name || 'Usuário NutriAI',
      photoURL: ''
    };
    onSaveProfile(updatedProfile);

    playSfx('pop');
    vibrate(20);
    showInAppToast('Foto Removida', 'Foto de perfil removida com sucesso.');
  };

  const handleSaveCustomUrl = () => {
    if (!customPhotoUrlInput.trim()) return;
    setFormData(prev => ({ ...prev, photoURL: customPhotoUrlInput.trim() }));
    setShowUrlInputModal(false);

    const updatedProfile: UserProfile = {
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      ...(profile || {}),
      name: formData.name || profile?.name || 'Usuário NutriAI',
      photoURL: customPhotoUrlInput.trim()
    };
    onSaveProfile(updatedProfile);

    setCustomPhotoUrlInput('');
    playSfx('success');
    vibrate([25, 35]);
    showInAppToast('Foto Atualizada!', 'Link da foto salvo no perfil com sucesso.');
  };

  const handleSelectAvatarId = (selectedId: string) => {
    setFormData(prev => ({ ...prev, avatarId: selectedId }));
    const avatarInfo = AVATAR_OPTIONS.find(a => a.id === selectedId);
    const updatedProfile: UserProfile = {
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      ...(profile || {}),
      name: formData.name || profile?.name || 'Usuário NutriAI',
      avatarId: selectedId,
      avatarName: avatarInfo?.name || selectedId,
    };
    onSaveProfile(updatedProfile);
    safeSet('nutri-profile', JSON.stringify(updatedProfile));

    playSfx('success');
    vibrate([30, 40]);
    showInAppToast('AvatarID Selecionado!', `Avatar '${selectedId}' (${avatarInfo?.name || ''}) salvo no Firebase e ativado para treinos!`);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const applyMacroPreset = (preset: MacroPreset) => {
    playSfx('tap');
    vibrate(15);
    const weight = Number(formData.weight) || (profile?.weight ? Number(profile.weight) : 70);
    let baseCalories = Number(formData.dailyCalories) || 2000;
    if (baseCalories < 1000) baseCalories = 2000;

    let c = 200;
    let p = 130;
    let f = 65;

    if (preset === 'balanced') {
      // 45% carbs, 25% protein, 30% fat
      c = Math.round((baseCalories * 0.45) / 4);
      p = Math.round((baseCalories * 0.25) / 4);
      f = Math.round((baseCalories * 0.30) / 9);
    } else if (preset === 'high_protein') {
      // ~2.0 g/kg protein or 35% protein, 40% carbs, 25% fat
      const targetP = Math.max(Math.round(weight * 2.0), Math.round((baseCalories * 0.35) / 4));
      p = targetP;
      const remCal = Math.max(0, baseCalories - (p * 4));
      c = Math.round((remCal * 0.60) / 4);
      f = Math.round((remCal * 0.40) / 9);
    } else if (preset === 'low_carb') {
      // 20% carbs, 35% protein, 45% fat
      c = Math.round((baseCalories * 0.20) / 4);
      p = Math.round((baseCalories * 0.35) / 4);
      f = Math.round((baseCalories * 0.45) / 9);
    } else if (preset === 'keto') {
      // 5% carbs, 25% protein, 70% fat
      c = Math.min(30, Math.max(15, Math.round((baseCalories * 0.05) / 4)));
      p = Math.round((baseCalories * 0.25) / 4);
      const remCal = Math.max(0, baseCalories - (c * 4) - (p * 4));
      f = Math.round(remCal / 9);
    }

    const calculatedCalories = (c * 4) + (p * 4) + (f * 9);

    setFormData((prev) => ({
      ...prev,
      macroPreset: preset,
      carbsGoal: String(c),
      proteinGoal: String(p),
      fatGoal: String(f),
      dailyCalories: String(calculatedCalories),
    }));
    setIsSaved(false);
  };

  const handleQuickSaveMacros = () => {
    const carbs = Math.max(0, Number(formData.carbsGoal) || 0);
    const protein = Math.max(0, Number(formData.proteinGoal) || 0);
    const fat = Math.max(0, Number(formData.fatGoal) || 0);
    const calories = Number(formData.dailyCalories) || (carbs * 4 + protein * 4 + fat * 9);

    const updatedProfile: UserProfile = {
      ...(profile || {}),
      name: formData.name.trim() || profile?.name || 'Usuário NutriAI',
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      macroTargets: {
        carbs,
        protein,
        fat,
        calories,
        preset: formData.macroPreset,
        enabled: true,
        updatedAt: new Date().toISOString()
      },
      masterPlan: {
        ...(profile?.masterPlan || { workoutFocus: '', nutritionFocus: '', adaptiveNotes: '' }),
        dailyCalories: calories,
        macros: {
          protein,
          carbs,
          fat
        }
      }
    };

    onSaveProfile(updatedProfile);
    playSfx('success');
    vibrate([30, 40]);
    showInAppToast(
      'Metas de Macros Salvas para a IA! 🎯',
      `Carbos: ${carbs}g | Prot: ${protein}g | Gord: ${fat}g (~${calories} kcal). A IA usará estas metas nos próximos cardápios!`
    );
    window.dispatchEvent(new CustomEvent('nutri:macro-targets-updated', {
      detail: updatedProfile.macroTargets
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const processedProfile: UserProfile = {
      ...(profile || {}),
      name: formData.name.trim() || 'Usuário NutriAI',
      photoURL: formData.photoURL || undefined,
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      birthDate: formData.birthDate || undefined,
      gender: formData.gender || undefined,
      avatarId: formData.avatarId || profile?.avatarId || 'athletic-01',
      age: formData.age ? Number(formData.age) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
      targetWeight: formData.targetWeight ? Number(formData.targetWeight) : undefined,
      height: formData.height ? Number(formData.height) : undefined,
      activityLevel: formData.activityLevel || undefined,
      skinTone: formData.skinTone || undefined,
      hairColor: formData.hairColor || undefined,
      bodyType: formData.bodyType as any || undefined,
      metabolism: formData.metabolism as any || undefined,
      routine: formData.routine.trim() || undefined,
      waterGoal: formData.waterGoal ? Number(formData.waterGoal) : 2500,
      restrictions: formData.restrictions.split(',').map((s) => s.trim()).filter(Boolean),
      allergies: formData.allergies.split(',').map((s) => s.trim()).filter(Boolean),
      goals: formData.goals.trim() || undefined,
      preferences: formData.preferences.trim() || undefined,
      equipment: formData.equipment.split(',').map((s) => s.trim()).filter(Boolean),
      highContrast: highContrastEnabled,
      mealRemindersEnabled,
      mealNotificationTimes: mealTimes,
      challengeRemindersEnabled,
      challengeReminderTime: challengeTime,
      challengeReviewTime: challengeReviewTime,
      backupDestination: backupDestination as 'google_drive' | 'dropbox' | 'onedrive' || undefined,
      elevenLabsVoiceId: selectedVoice || undefined,
      macroTargets: {
        carbs: Math.max(0, Number(formData.carbsGoal) || 0),
        protein: Math.max(0, Number(formData.proteinGoal) || 0),
        fat: Math.max(0, Number(formData.fatGoal) || 0),
        calories: Number(formData.dailyCalories) || ((Math.max(0, Number(formData.carbsGoal) || 0) * 4) + (Math.max(0, Number(formData.proteinGoal) || 0) * 4) + (Math.max(0, Number(formData.fatGoal) || 0) * 9)),
        preset: formData.macroPreset,
        enabled: true,
        updatedAt: new Date().toISOString()
      },
      masterPlan: {
        dailyCalories: Number(formData.dailyCalories) || ((Math.max(0, Number(formData.carbsGoal) || 0) * 4) + (Math.max(0, Number(formData.proteinGoal) || 0) * 4) + (Math.max(0, Number(formData.fatGoal) || 0) * 9)),
        macros: {
          protein: Math.max(0, Number(formData.proteinGoal) || 0),
          carbs: Math.max(0, Number(formData.carbsGoal) || 0),
          fat: Math.max(0, Number(formData.fatGoal) || 0),
        },
        workoutFocus: profile?.masterPlan?.workoutFocus || '',
        nutritionFocus: profile?.masterPlan?.nutritionFocus || '',
        adaptiveNotes: profile?.masterPlan?.adaptiveNotes || '',
      },
      sleepGoalHours: sleepGoalHours,
      sleepReminderEnabled: sleepReminderEnabled,
    };
    
    onSaveProfile(processedProfile);
    syncSchedulesToServiceWorker(processedProfile);
    window.dispatchEvent(new CustomEvent('nutri:macro-targets-updated', { 
      detail: processedProfile.macroTargets 
    }));
    playSfx('success');
    vibrate([30, 50]);
    setIsSaved(true);
    showInAppToast('Perfil Salvo!', 'Todas as suas informações, metas de macros e lembretes foram salvos e sincronizados com a IA.');
    setTimeout(() => setIsSaved(false), 4000);
  };

  const userInitial = (formData.name || profile?.name || 'U').charAt(0).toUpperCase();

  const circadianChartData = React.useMemo(() => {
    const hydration = profile?.hydrationLogs || [];
    const fatigue = profile?.bodyMonitorLogs || [];
    const map = new Map<string, { date: string, hydration: number, energy: number }>();
    hydration.forEach(log => {
      const date = log.date.split('T')[0];
      map.set(date, { ...map.get(date) || { date, hydration: 0, energy: 0 }, hydration: (map.get(date)?.hydration || 0) + log.amount });
    });
    fatigue.forEach(log => {
      const date = log.date.split('T')[0];
      const energy = 100 - log.fatigueLevel;
      map.set(date, { ...map.get(date) || { date, hydration: 0, energy: 0 }, energy: (map.get(date)?.energy || 0) + energy });
    });
    return Array.from(map.values()).sort((a,b) => a.date.localeCompare(b.date)).slice(-7);
  }, [profile?.hydrationLogs, profile?.bodyMonitorLogs]);

  const numCarbs = Math.max(0, Number(formData.carbsGoal) || 0);
  const numProtein = Math.max(0, Number(formData.proteinGoal) || 0);
  const numFat = Math.max(0, Number(formData.fatGoal) || 0);
  const macroCalculatedCal = (numCarbs * 4) + (numProtein * 4) + (numFat * 9);
  const carbsKcal = numCarbs * 4;
  const proteinKcal = numProtein * 4;
  const fatKcal = numFat * 9;
  const sumKcal = macroCalculatedCal || 1;
  const carbsPct = Math.round((carbsKcal / sumKcal) * 100);
  const proteinPct = Math.round((proteinKcal / sumKcal) * 100);
  const fatPct = Math.max(0, 100 - carbsPct - proteinPct);
  const userWeight = Number(formData.weight) || (profile?.weight ? Number(profile.weight) : null);
  const proteinPerKg = userWeight && userWeight > 0 ? (numProtein / userWeight).toFixed(1) : null;
  const carbsPerKg = userWeight && userWeight > 0 ? (numCarbs / userWeight).toFixed(1) : null;
  const fatPerKg = userWeight && userWeight > 0 ? (numFat / userWeight).toFixed(1) : null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 flex flex-col items-center gap-8">
      {/* Header Info */}
      <div className="w-full text-center space-y-3 mb-2 px-2">
        <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400 text-center">
          Seu Perfil
        </h2>
        <div className="inline-flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3.5 py-1.5 rounded-full max-w-full border border-emerald-200 dark:border-emerald-800 shadow-sm text-center">
          <Cloud className="w-4 h-4 shrink-0" />
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate">Sincronizado na Nuvem & Firestore</span>
        </div>
        <p className="font-sans text-slate-500 dark:text-slate-400 text-xs sm:text-sm md:text-base max-w-lg mx-auto text-center">
          Mantenha seus dados físicos, objetivos e fotos atualizados para recomendações nutricionais e treinos 100% sob medida.
        </p>
      </div>

      {/* Quick Action Bar: Clinical Export & Admin Library */}
      <div className="w-full flex flex-wrap items-center justify-center gap-3 px-2">
        <button
          type="button"
          onClick={() => {
            playSfx('tap');
            vibrate(20);
            setShowClinicalTextModal(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer"
          id="btn-open-clinical-text-summary-bar"
        >
          <Stethoscope className="w-4 h-4 shrink-0 text-blue-100" />
          <span>Resumo Clínico em Texto (Profissionais de Saúde)</span>
          <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Data Range</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playSfx('tap');
            vibrate(20);
            setShowExportLogsModal(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-100" />
          <span>Exportar Histórico de Logs (PDF / CSV)</span>
          <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Nutricionista</span>
        </button>

        <button onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: "admin_library" }))} className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 text-white px-5 py-2.5 rounded-full font-medium shadow-md hover:bg-slate-800 transition-colors text-xs sm:text-sm cursor-pointer">
          <Database className="w-4 h-4 shrink-0" />
          <span>Área Admin: Biblioteca Científica</span>
        </button>
      </div>

      {/* Main Form Card */}
      <form id="profile-main-form" onSubmit={handleSubmit} className="clay-card p-4 sm:p-8 md:p-10 w-full overflow-hidden bg-white/60 dark:bg-slate-800/60 shadow-xl rounded-3xl space-y-6">
        {/* Photo & Identity Hero Section */}
        <div className="mb-10 pb-8 border-b border-slate-100 dark:border-slate-700/80 w-full">
          <div className="flex flex-col items-center text-center gap-6 w-full">
            {/* Voice Control Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/30 ring-2 ring-rose-300'
                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 shadow-emerald-500/5 dark:bg-emerald-500/10 dark:text-emerald-400'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5 animate-bounce" />
                  <span>Ouvindo...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>Comando por Voz</span>
                </>
              )}
            </button>

            {/* View Mode Toggle: [ 📸 Foto 2D | 🦾 Avatar 3D ] */}
            <div className="flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 mb-2 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setAvatarHeroMode('photo');
                  playSfx('tap');
                  vibrate(15);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  avatarHeroMode === 'photo'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Foto 2D</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAvatarHeroMode('3d');
                  playSfx('crystal');
                  vibrate([20, 30]);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  avatarHeroMode === '3d'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Avatar 3D</span>
              </button>
            </div>

            {/* Avatar with Actions */}
            <div className="relative group shrink-0 mx-auto">
              {avatarHeroMode === '3d' ? (
                // 3D Avatar Hero Preview Circle
                <div 
                  onClick={() => {
                    playSfx('crystal');
                    vibrate(20);
                    setShow3DAvatarGallery(true);
                  }}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-cyan-500/50 dark:ring-cyan-400/40 overflow-hidden shadow-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col items-center justify-center relative cursor-pointer group-hover:scale-105 transition-all"
                  title="Clique para personalizar seu Avatar 3D"
                >
                  <img
                    src={getAvatarById(formData.avatarId || 'cyberfit-biomechanic').photoURL}
                    alt={getAvatarById(formData.avatarId || 'cyberfit-biomechanic').name}
                    className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end items-center pb-1.5 pointer-events-none">
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider text-cyan-300 bg-slate-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      3D DRACO
                    </span>
                  </div>
                </div>
              ) : (
                // Standard 2D Photo
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-emerald-500/30 dark:ring-emerald-400/20 overflow-hidden shadow-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 flex items-center justify-center relative">
                  {formData.photoURL ? (
                    <img
                      src={formData.photoURL}
                      alt={formData.name || 'Foto do Perfil'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl sm:text-5xl font-serif font-bold text-white tracking-wider select-none">
                      {userInitial}
                    </span>
                  )}

                  {/* Uploading loading overlay */}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mb-1" />
                      <span className="text-[10px] font-bold uppercase">Carregando...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button: Camera for Photo mode, Studio for 3D mode */}
              {avatarHeroMode === '3d' ? (
                <button
                  type="button"
                  onClick={() => {
                    playSfx('crystal');
                    vibrate(20);
                    setShow3DAvatarGallery(true);
                  }}
                  className="absolute bottom-0 right-0 p-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-white dark:border-slate-800"
                  title="Abrir Galeria de Avatares 3D"
                >
                  <Cpu className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-white dark:border-slate-800"
                  title="Carregar nova foto da câmera ou galeria"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoFileUpload}
                className="hidden"
              />
            </div>

            {/* Profile Photo Controls & Metadata */}
            <div className="w-full text-center space-y-3">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {formData.name || 'Usuário NutriAI'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5 break-all">
                  {formData.email || 'Conta sincronizada'}
                </p>
              </div>

              {/* Action Buttons for Avatar */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full max-w-lg mx-auto">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Trocar Foto</span>
                </button>

                <button
                  type="button"
                  id="open-3d-avatar-gallery-btn"
                  onClick={() => setShow3DAvatarGallery(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                >
                  <Cpu className="w-3.5 h-3.5 text-slate-950" />
                  <span>Avatar 3D (DRACO)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-bold rounded-xl transition-all border border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Fotos 2D</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInputModal(true)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all border border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Inserir link da foto"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>URL</span>
                </button>

                {formData.photoURL && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all border border-rose-200 dark:border-rose-900/50 flex items-center gap-1 cursor-pointer shrink-0"
                    title="Remover foto atual"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                Formatos aceitos: JPG, PNG, WEBP. A foto é ajustada e sincronizada instantaneamente.
              </p>
            </div>
          </div>
        </div>

        {/* 3D Interactive Avatar with Micro-Animations */}
        <div className="w-full mb-6">
          <Profile3DAvatar
            points={profile?.points || 1250}
            streak={profile?.streak || 7}
            level={profile?.level || 4}
            avatarId={profile?.avatarId || 'cyberfit-biomechanic'}
            userSkinTone={formData.skinTone || profile?.skinTone}
            onOpenGallery={() => setShow3DAvatarGallery(true)}
            onAwardPoints={(earned) => {
              if (profile) {
                const updated = {
                  ...profile,
                  points: (profile.points || 1250) + earned
                };
                onSaveProfile(updated);
              }
            }}
          />
        </div>

        {/* Escolha de AvatarID Preferido (Simulador de Exercícios) */}
        <div className="w-full bg-slate-900/90 dark:bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                AvatarID Preferido (Simulador de Treino)
              </h3>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                Escolha o AvatarID para ser utilizado na execução dos treinos. Salvo e sincronizado no Firebase.
              </p>
            </div>
            <div className="shrink-0 bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-emerald-300">AvatarID Ativo:</span>
              <span className="text-xs font-black font-mono text-emerald-400">{formData.avatarId || 'athletic-01'}</span>
            </div>
          </div>

          {/* Seletor Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Selecione seu AvatarID Preferido
            </label>
            <select
              value={formData.avatarId}
              onChange={(e) => handleSelectAvatarId(e.target.value)}
              className="w-full p-3.5 bg-slate-950 border border-emerald-500/40 rounded-xl text-xs font-medium text-white outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            >
              {AVATAR_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.id} — {t(opt.name)} ({t(opt.gender)} • {t(opt.category)})
                </option>
              ))}
            </select>
          </div>

          {/* Grid Interativo de Avatares */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
            {AVATAR_OPTIONS.map((opt) => {
              const isSelected = formData.avatarId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectAvatarId(opt.id)}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-br from-emerald-950/80 to-teal-950/80 border-emerald-400 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${isSelected ? 'bg-emerald-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'}`}>
                      {opt.id}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white truncate">{t(opt.name)}</div>
                    <div className="text-[10px] text-slate-400 truncate">{t(opt.gender)} • {t(opt.category)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================================================================ */}
        {/* DEDICATED MALU AI AVATAR & VOICE CUSTOMIZATION INTERFACE         */}
        {/* ================================================================ */}
        <div className="w-full bg-slate-900/95 dark:bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-teal-500/40 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 text-teal-400 shrink-0" />
                <span>Personalização do Avatar & Voz da IA Malu</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-sans mt-1">
                Personalize a aparência visual da Malu (estilo artístico, foto ou cyber), o tom de voz integrado (via ElevenLabs / Aoede) e a velocidade de fala.
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/40 shadow-sm">
              <Volume2 className="w-4 h-4 text-teal-300 animate-pulse" />
              Voz Aoede / ElevenLabs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Visual Appearance Style & Visual Selector */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-950/85 border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  <span>Aparência Visual da Malu</span>
                </label>
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-teal-500 shadow-md">
                  <img src={maluAvatarUrl} alt="Malu Avatar Preview" className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Style Category selector */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'artistic' as const, label: '🎨 Artístico 3D' },
                  { id: 'photo' as const, label: '📸 Foto Real' },
                  { id: 'cyber' as const, label: '🤖 Cyber AI' }
                ].map((s) => {
                  const isSelected = maluAvatarStyle === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setMaluAvatarStyle(s.id);
                        playSfx('tap');
                        vibrate(10);
                        handleSaveMaluCustomization({ style: s.id });
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center active:scale-95 ${
                        isSelected
                          ? 'bg-teal-500 text-slate-950 font-black border-teal-300 shadow-md shadow-teal-500/25'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/* Hidden file input for uploading custom photo */}
              <input
                type="file"
                ref={maluAvatarFileInputRef}
                accept="image/*"
                onChange={handleMaluFileUpload}
                className="hidden"
              />

              {/* Upload Button */}
              <button
                type="button"
                onClick={() => maluAvatarFileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold text-xs flex items-center justify-center gap-2 border border-teal-500/40 transition-all cursor-pointer shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Enviar Foto do Dispositivo (Upload)</span>
              </button>

              {/* Preset Visual Avatars Grid */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-teal-400" />
                  Ou selecione um avatar predefinido:
                </span>
                <div className="grid grid-cols-6 gap-2">
                  {MALU_PRESET_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setMaluAvatarUrl(av.url);
                        playSfx('tap');
                        vibrate(10);
                        handleSaveMaluCustomization({ url: av.url });
                      }}
                      className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                        maluAvatarUrl === av.url
                          ? 'border-teal-400 ring-2 ring-teal-500/40 shadow-md'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                      title={av.label}
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                      {maluAvatarUrl === av.url && (
                        <div className="absolute inset-0 bg-teal-600/40 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-medium">Ou cole a URL direta da imagem:</span>
                <input
                  type="text"
                  value={maluAvatarUrl}
                  onChange={(e) => {
                    setMaluAvatarUrl(e.target.value);
                    handleSaveMaluCustomization({ url: e.target.value });
                  }}
                  placeholder="https://exemplo.com/malu-avatar.jpg"
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-teal-500/50 font-mono"
                />
              </div>
            </div>

            {/* 2. ElevenLabs Voice Selection */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950/85 border border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" />
                <span>Tom de Voz (ElevenLabs API)</span>
              </label>
              <select
                value={selectedVoice || 'Aoede'}
                onChange={(e) => {
                  setSelectedVoice(e.target.value);
                  playSfx('tap');
                  vibrate(10);
                  handleSaveMaluCustomization({ voiceId: e.target.value });
                }}
                className="w-full p-3.5 bg-slate-900 border border-teal-500/40 rounded-xl text-xs font-medium text-white outline-none focus:ring-2 focus:ring-teal-500/50 cursor-pointer"
              >
                <option value="Aoede">Aoede (Padrão PT-BR / Feminina)</option>
                <option value="rachel">Rachel (ElevenLabs - Calma & Profissional)</option>
                <option value="domi">Domi (ElevenLabs - Enérgica)</option>
                <option value="antoni">Antoni (ElevenLabs - Suave)</option>
                {voices.map(v => (
                  <option key={v.voice_id} value={v.voice_id}>{v.name} (ElevenLabs)</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 leading-tight">
                Utiliza a voz 'Aoede' por padrão para qualidade natural em Português do Brasil com integração ElevenLabs.
              </p>
            </div>

            {/* 3. Speech Speed */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950/85 border border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                <span>Velocidade de Fala da Malu</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[0.75, 1.0, 1.25, 1.5].map((speed) => {
                  const isSelected = maluSpeechSpeed === speed;
                  return (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => {
                        setMaluSpeechSpeed(speed);
                        playSfx('tap');
                        vibrate(8);
                        handleSaveMaluCustomization({ speed });
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                          : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {speed}x
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">Velocidade Atual:</span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                  {maluSpeechSpeed}x normal
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Backup Destination Selection */}
        <div className="w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <h3 className="font-serif text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-500" />
            Configurações de Backup
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Escolha o destino para seus backups automáticos de dados nutricionais e logs.
          </p>
          <select
            value={backupDestination}
            onChange={(e) => setBackupDestination(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
          >
            <option value="">Nenhum (Local)</option>
            <option value="google_drive">Google Drive</option>
            <option value="dropbox">Dropbox</option>
            <option value="onedrive">OneDrive</option>
          </select>
        </div>

        <div className="space-y-6">
          {/* Dados Pessoais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                {t('full_name_label', 'Nome Completo / Como quer ser chamado')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={t('placeholder_name_ex', 'Ex: Lucas Silva')}
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Gênero
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 shadow-sm transition-all"
              >
                <option value="">Selecione...</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="outro">Outro / Prefiro não informar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder={t('placeholder_email', 'seuemail@exemplo.com')}
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                {t('phone_whatsapp_label', 'Telefone / WhatsApp')}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder={t('placeholder_phone', '(11) 99999-9999')}
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Biometria & Físico */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                {t('age_label', 'Idade')}
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder={t('placeholder_years', 'Anos')}
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                {t('current_weight_kg', 'Peso Atual (kg)')}
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                placeholder={t('placeholder_weight_ex', 'Ex: 72.5')}
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                {t('target_weight_kg', 'Peso Alvo (kg)')}
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.targetWeight}
                onChange={(e) => handleChange('targetWeight', e.target.value)}
                placeholder={t('placeholder_target_weight_ex', 'Ex: 65.0')}
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                {t('height_cm', 'Altura (cm)')}
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder={t('placeholder_height_ex', 'Ex: 175')}
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
               <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Nível de Atividade Física
               </label>
               <select
                  value={formData.activityLevel}
                  onChange={(e) => handleChange('activityLevel', e.target.value)}
                  className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="sedentario">Sedentário (pouco ou nenhum exercício)</option>
                  <option value="leve">Leve (exercício leve 1-3 dias/semana)</option>
                  <option value="moderado">Moderado (exercício moderado 3-5 dias/semana)</option>
                  <option value="intenso">Intenso (exercício forte 6-7 dias/semana)</option>
                </select>
            </div>
            
            <div className="space-y-2">
               <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Tom de Pele
               </label>
               <select
                  value={formData.skinTone}
                  onChange={(e) => handleChange('skinTone', e.target.value)}
                  className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="clara">Pele Clara</option>
                  <option value="media">Pele Média / Morena Clara</option>
                  <option value="parda">Pele Parda / Morena Escura</option>
                  <option value="escura">Pele Negra</option>
                </select>
            </div>

            <div className="space-y-2">
               <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Cor do Cabelo
               </label>
               <select
                  value={formData.hairColor}
                  onChange={(e) => handleChange('hairColor', e.target.value)}
                  className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="preto">Preto</option>
                  <option value="castanho_escuro">Castanho Escuro</option>
                  <option value="castanho_claro">Castanho Claro</option>
                  <option value="loiro">Loiro</option>
                  <option value="ruivo">Ruivo</option>
                  <option value="grisalho">Grisalho / Branco</option>
                  <option value="careca">Careca / Sem cabelo</option>
                </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
                <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                    Tipo de Corpo (Biotipo)
                </label>
                <select
                    value={formData.bodyType}
                    onChange={(e) => handleChange('bodyType', e.target.value)}
                    className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                >
                    <option value="">Selecione...</option>
                    <option value="Ectomorfo">Ectomorfo (Magro, dificuldade em ganhar peso)</option>
                    <option value="Mesomorfo">Mesomorfo (Atlético, facilidade em ganhar/perder)</option>
                    <option value="Endomorfo">Endomorfo (Largo, facilidade em ganhar peso)</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                    Metabolismo Estimado
                </label>
                <select
                    value={formData.metabolism}
                    onChange={(e) => handleChange('metabolism', e.target.value)}
                    className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                >
                    <option value="">Selecione...</option>
                    <option value="Lento">Lento</option>
                    <option value="Moderado">Moderado</option>
                    <option value="Acelerado">Acelerado</option>
                </select>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                      Meta de Água Diária (ml)
                  </label>
                  {formData.weight && (
                    <button
                      type="button"
                      onClick={() => handleChange('waterGoal', String(Math.round(Number(formData.weight) * 35)))}
                      className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline normal-case font-medium cursor-pointer"
                    >
                      Sugerir pelo peso (~{Math.round(Number(formData.weight) * 35)}ml)
                    </button>
                  )}
                </div>
                <input
                    type="number"
                    step="100"
                    value={formData.waterGoal}
                    onChange={(e) => handleChange('waterGoal', e.target.value)}
                    placeholder="Ex: 2500"
                    className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mr-1">Metas comuns:</span>
                  {[2000, 2500, 3000, 3500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleChange('waterGoal', String(val))}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        Number(formData.waterGoal) === val
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {val} ml
                    </button>
                  ))}
                </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Sua Rotina Diária (Horários, trabalho, treinos)
            </label>
            <textarea
              value={formData.routine}
              onChange={(e) => handleChange('routine', e.target.value)}
              placeholder="Ex: Trabalho das 08h às 18h, treino musculação às 06h, durmo às 22h. Tenho pouco tempo para o almoço."
              rows={3}
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Restrições Alimentares (separadas por vírgula)
            </label>
            <input
              type="text"
              value={formData.restrictions}
              onChange={(e) => handleChange('restrictions', e.target.value)}
              placeholder="Ex: Vegano, Sem glúten, Sem lactose"
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Alergias (separadas por vírgula)
            </label>
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => handleChange('allergies', e.target.value)}
              placeholder="Ex: Amendoim, Frutos do mar, Leite de vaca"
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Objetivos de Saúde & Fitness
            </label>
            <input
              type="text"
              value={formData.goals}
              onChange={(e) => handleChange('goals', e.target.value)}
              placeholder="Ex: Emagrecimento saudável, Ganho de massa magra, Longevidade"
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Equipamentos de Cozinha Disponíveis (separados por vírgula)
            </label>
            <input
              type="text"
              value={formData.equipment}
              onChange={(e) => handleChange('equipment', e.target.value)}
              placeholder="Ex: Forno, Micro-ondas, Air Fryer, Liquidificador"
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
            />
          </div>

          <HealthIntegrationSettings
            profile={profile}
            onUpdateProfile={(updater) => {
              const updated = updater(profile);
              if (updated) onSaveProfile(updated);
            }}
          />

          {/* Macronutrient Goals & AI Meal Plan Sizing */}
          <div className="space-y-6 pt-6 border-t border-slate-200/80 dark:border-slate-700/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                  <Target className="w-6 h-6 text-emerald-500 shrink-0" />
                  <span>Metas Diárias de Macronutrientes</span>
                </h3>
                <p className="font-sans text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                  Defina os carboidratos, proteínas e gorduras que você deseja consumir por dia. A inteligência artificial usará estes valores ao gerar novos planos alimentares e receitas.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  Sincronizado com a IA
                </span>
              </div>
            </div>

            {/* Presets Selection Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                  Distribuição & Presets Nutricionais
                </span>
                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 normal-case">
                  Toque para preencher automaticamente
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'balanced', label: 'Equilibrada', desc: '45% C • 25% P • 30% G', emoji: '🥗' },
                  { id: 'high_protein', label: 'Hipertrofia', desc: '40% C • 35% P • 25% G', emoji: '🥩' },
                  { id: 'low_carb', label: 'Low Carb', desc: '20% C • 35% P • 45% G', emoji: '🥑' },
                  { id: 'keto', label: 'Cetogênica', desc: '5% C • 25% P • 70% G', emoji: '🧀' },
                  { id: 'custom', label: 'Personalizada', desc: 'Valores livres', emoji: '⚙️' }
                ].map((preset) => {
                  const isActive = formData.macroPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyMacroPreset(preset.id as MacroPreset)}
                      className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30 shadow-md'
                          : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                        <span>{preset.emoji}</span>
                        <span>{preset.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight line-clamp-1">
                        {preset.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Macro Proportion Bar & Calories Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 dark:from-slate-900/60 dark:via-slate-800/60 dark:to-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Calorias Diárias dos Macros
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
                        {macroCalculatedCal}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">kcal calculadas</span>
                    </div>
                  </div>
                </div>

                {/* Sync calories button if there's mismatch */}
                {Number(formData.dailyCalories) !== macroCalculatedCal && (
                  <button
                    type="button"
                    onClick={() => {
                      handleChange('dailyCalories', String(macroCalculatedCal));
                      playSfx('tap');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-semibold border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer self-start sm:self-auto"
                    title="Igualar meta calórica diária com a soma dos macronutrientes"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Sincronizar Calorias ({macroCalculatedCal} kcal)</span>
                  </button>
                )}
              </div>

              {/* Segmented Distribution Bar */}
              <div className="space-y-1.5">
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${carbsPct}%` }}
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
                    title={`Carboidratos: ${carbsPct}% (${numCarbs}g)`}
                  />
                  <div
                    style={{ width: `${proteinPct}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                    title={`Proteínas: ${proteinPct}% (${numProtein}g)`}
                  />
                  <div
                    style={{ width: `${fatPct}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                    title={`Gorduras: ${fatPct}% (${numFat}g)`}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-300 gap-2 pt-1 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Carbos: <strong>{numCarbs}g</strong> ({carbsPct}% • {carbsKcal} kcal)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Proteínas: <strong>{numProtein}g</strong> ({proteinPct}% • {proteinKcal} kcal)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                    <span>Gorduras: <strong>{numFat}g</strong> ({fatPct}% • {fatKcal} kcal)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Interactive Macro Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Carboidratos */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-amber-200/80 dark:border-amber-900/50 shadow-sm space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-3xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm">
                      🍞
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Carboidratos</h4>
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{carbsKcal} kcal • {carbsPct}%</span>
                    </div>
                  </div>
                  {carbsPerKg && (
                    <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-medium">
                      {carbsPerKg} g/kg
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0, numCarbs - 5);
                      handleChange('carbsGoal', String(next));
                      handleChange('macroPreset', 'custom');
                      playSfx('tap');
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-base transition-colors cursor-pointer shrink-0"
                  >
                    -
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="600"
                      value={formData.carbsGoal}
                      onChange={(e) => {
                        handleChange('carbsGoal', e.target.value);
                        handleChange('macroPreset', 'custom');
                      }}
                      className="w-full text-center py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-lg text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">g</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = numCarbs + 5;
                      handleChange('carbsGoal', String(next));
                      handleChange('macroPreset', 'custom');
                      playSfx('tap');
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-base transition-colors cursor-pointer shrink-0"
                  >
                    +
                  </button>
                </div>

                <input
                  type="range"
                  min="0"
                  max="500"
                  step="5"
                  value={numCarbs}
                  onChange={(e) => {
                    handleChange('carbsGoal', e.target.value);
                    handleChange('macroPreset', 'custom');
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Fonte primária de energia rápida para o cérebro e performance física.
                </p>
              </div>

              {/* Proteínas */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-3xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                      🍗
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Proteínas</h4>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{proteinKcal} kcal • {proteinPct}%</span>
                    </div>
                  </div>
                  {proteinPerKg && (
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 font-bold">
                      {proteinPerKg} g/kg
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0, numProtein - 5);
                      handleChange('proteinGoal', String(next));
                      handleChange('macroPreset', 'custom');
                      playSfx('tap');
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-base transition-colors cursor-pointer shrink-0"
                  >
                    -
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="400"
                      value={formData.proteinGoal}
                      onChange={(e) => {
                        handleChange('proteinGoal', e.target.value);
                        handleChange('macroPreset', 'custom');
                      }}
                      className="w-full text-center py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-lg text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">g</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = numProtein + 5;
                      handleChange('proteinGoal', String(next));
                      handleChange('macroPreset', 'custom');
                      playSfx('tap');
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-base transition-colors cursor-pointer shrink-0"
                  >
                    +
                  </button>
                </div>

                <input
                  type="range"
                  min="0"
                  max="350"
                  step="5"
                  value={numProtein}
                  onChange={(e) => {
                    handleChange('proteinGoal', e.target.value);
                    handleChange('macroPreset', 'custom');
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Construção de massa magra, saciedade prolongada e síntese tecidual.
                </p>
              </div>

              {/* Gorduras */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-200/80 dark:border-purple-900/50 shadow-sm space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-3xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-sm">
                      🥑
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Gorduras (Lipídios)</h4>
                      <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">{fatKcal} kcal • {fatPct}%</span>
                    </div>
                  </div>
                  {fatPerKg && (
                    <span className="text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 font-medium">
                      {fatPerKg} g/kg
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0, numFat - 5);
                      handleChange('fatGoal', String(next));
                      handleChange('macroPreset', 'custom');
                      playSfx('tap');
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-base transition-colors cursor-pointer shrink-0"
                  >
                    -
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="250"
                      value={formData.fatGoal}
                      onChange={(e) => {
                        handleChange('fatGoal', e.target.value);
                        handleChange('macroPreset', 'custom');
                      }}
                      className="w-full text-center py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-lg text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">g</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = numFat + 5;
                      handleChange('fatGoal', String(next));
                      handleChange('macroPreset', 'custom');
                      playSfx('tap');
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-base transition-colors cursor-pointer shrink-0"
                  >
                    +
                  </button>
                </div>

                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={numFat}
                  onChange={(e) => {
                    handleChange('fatGoal', e.target.value);
                    handleChange('macroPreset', 'custom');
                  }}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Suporte hormonal vital, saúde celular e absorção de vitaminas lipossolúveis (A, D, E, K).
                </p>
              </div>
            </div>

            {/* Quick Save Macro Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20">
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  As metas acima serão salvas no seu perfil e utilizadas imediatamente pela IA na geração de novos planos alimentares.
                </span>
              </div>
              <button
                type="button"
                onClick={handleQuickSaveMacros}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Salvar Metas de Macros para IA</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Sibling Card Sections outside Form container for responsive safety */}
      <div className="w-full flex flex-col gap-8 items-center">

          {/* Push Notifications & Schedule Section */}
          <div className="space-y-4 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Notificações Push Nativas & Agendamento
              </label>

              {/* Native Permission Status Badge */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPushModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-md transition-all cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Gerenciar Notificações
                </button>
                {notificationPermission === 'granted' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Push Permitido
                  </span>
                ) : notificationPermission === 'denied' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    Bloqueado
                  </span>
                ) : null}
              </div>
            </div>

            {/* 1. Meal Reminders Card */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm space-y-4">
              {/* ElevenLabs Voice Selection */}
              <div className="space-y-2">
                <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Seleção de Voz da Assistente Malu (ElevenLabs)
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => {
                    setSelectedVoice(e.target.value);
                    localStorage.setItem('nutriai_elevenlabs_voice', e.target.value);
                  }}
                  className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all cursor-pointer"
                >
                  <option value="">Padrão (Aoede)</option>
                  {voices.map(voice => (
                    <option key={voice.voice_id} value={voice.voice_id}>{voice.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">Nota: O padrão é a voz Aoede (Recomendada para consistência).</p>
              </div>

              {/* Theme Color Palette Selector Card */}
              <ThemePaletteSelector className="my-4" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3.5 rounded-2xl transition-colors ${
                    mealRemindersEnabled 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {mealRemindersEnabled ? <Bell className="w-5 h-5 animate-bounce" /> : <BellOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Lembretes do Plano Alimentar</h4>
                      {mealRemindersEnabled && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider border border-emerald-500/20">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {mealRemindersEnabled 
                        ? 'Notificações sonoras e nativas sincronizadas com o Service Worker nos seus horários programados.' 
                        : 'Ative para programar alertas nativos em cada refeição do dia.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleTestNativeNotification}
                    disabled={isTestingPush}
                    className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-xs transition-all border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 w-full sm:w-auto text-center"
                    title="Disparar notificação nativa de teste pelo Service Worker"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isTestingPush ? 'Enviando...' : 'Testar Push'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestUpcomingMealNotification}
                    disabled={isTestingPreMeal}
                    className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-xl font-bold text-xs transition-all border border-amber-200 dark:border-amber-800/60 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 w-full sm:w-auto text-center"
                    title="Testar alerta nativo de refeição prestes a começar (15 minutos antes)"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isTestingPreMeal ? 'Enviando...' : 'Testar Pré-Refeição'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleMealReminders}
                    className={`px-5 py-2 rounded-full font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center text-center ${
                      mealRemindersEnabled
                        ? 'bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 hover:scale-105 active:scale-95'
                    } w-full sm:w-auto`}
                  >
                    {mealRemindersEnabled ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>

              {/* Time Configuration Grid */}
              {mealRemindersEnabled && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      Horários Programados das Refeições
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Toque no horário para personalizar
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                    {/* Café da manhã */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between">
                      <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 truncate">Café da Manhã</p>
                      <input
                        type="time"
                        value={mealTimes.breakfast}
                        onChange={(e) => handleMealTimeChange('breakfast', e.target.value)}
                        className="mt-1.5 w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                      />
                    </div>

                    {/* Lanche da Manhã */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between">
                      <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 truncate">Lanche Manhã</p>
                      <input
                        type="time"
                        value={mealTimes.morningSnack}
                        onChange={(e) => handleMealTimeChange('morningSnack', e.target.value)}
                        className="mt-1.5 w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                      />
                    </div>

                    {/* Almoço */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between">
                      <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 truncate">Almoço</p>
                      <input
                        type="time"
                        value={mealTimes.lunch}
                        onChange={(e) => handleMealTimeChange('lunch', e.target.value)}
                        className="mt-1.5 w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                      />
                    </div>

                    {/* Lanche da Tarde */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between">
                      <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 truncate">Lanche Tarde</p>
                      <input
                        type="time"
                        value={mealTimes.afternoonSnack}
                        onChange={(e) => handleMealTimeChange('afternoonSnack', e.target.value)}
                        className="mt-1.5 w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                      />
                    </div>

                    {/* Jantar */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between">
                      <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 truncate">Jantar</p>
                      <input
                        type="time"
                        value={mealTimes.dinner}
                        onChange={(e) => handleMealTimeChange('dinner', e.target.value)}
                        className="mt-1.5 w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                      />
                    </div>

                    {/* Ceia */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between">
                      <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 truncate">Ceia</p>
                      <input
                        type="time"
                        value={mealTimes.supper}
                        onChange={(e) => handleMealTimeChange('supper', e.target.value)}
                        className="mt-1.5 w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 1.5. Workout Category Reminders Card (Cardio, Força, Flexibilidade) */}
            <WorkoutCategoryNotificationSettings
              profile={profile}
              onSaveProfile={onSaveProfile}
              addNotification={addNotification}
            />

            {/* 2. Challenge & Habit Reminders Card */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm space-y-4">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3.5 rounded-2xl transition-colors ${
                    challengeRemindersEnabled 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Alertas de Desafios & Metas</h4>
                      {challengeRemindersEnabled && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] uppercase tracking-wider border border-amber-500/20">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {challengeRemindersEnabled 
                        ? 'Lembretes automáticos para não perder sua sequência (streak), metas de hidratação e desafios da semana.' 
                        : 'Ative para receber lembretes de cumprimento de metas diárias.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleChallengeReminders}
                    className={`px-5 py-2 rounded-full font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center text-center ${
                      challengeRemindersEnabled
                        ? 'bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200'
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 hover:scale-105 active:scale-95'
                    } w-full sm:w-auto`}
                  >
                    {challengeRemindersEnabled ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>

              {/* Challenge Timings */}
              {challengeRemindersEnabled && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Morning reminder */}
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <Target className="w-3.5 h-3.5 text-amber-500" />
                          <span>Lembrete Matinal de Metas</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Foco nos desafios e metas do dia
                        </p>
                      </div>
                      <input
                        type="time"
                        value={challengeTime}
                        onChange={(e) => handleChallengeTimeChange('morning', e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-300 outline-none focus:ring-2 focus:ring-amber-500 text-center w-24 shrink-0"
                      />
                    </div>

                    {/* Evening review */}
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <Flame className="w-3.5 h-3.5 text-orange-500" />
                          <span>Revisão Noturna de Hábitos</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Checagem de streak e metas cumpridas
                        </p>
                      </div>
                      <input
                        type="time"
                        value={challengeReviewTime}
                        onChange={(e) => handleChallengeTimeChange('evening', e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-300 outline-none focus:ring-2 focus:ring-amber-500 text-center w-24 shrink-0"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Hydration Reminders Card */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3.5 rounded-2xl transition-colors ${
                    hydrationRemindersEnabled 
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <Droplets className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Lembretes de Hidratação</h4>
                      {hydrationRemindersEnabled && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-[10px] uppercase tracking-wider border border-sky-500/20">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {hydrationRemindersEnabled 
                        ? 'Alertas periódicos para garantir que você atinja sua meta diária de água.' 
                        : 'Ative para receber lembretes de consumo de água ao longo do dia.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleTestHydrationNotification}
                    className="px-3.5 py-2 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 rounded-xl font-bold text-xs transition-all border border-sky-200 dark:border-sky-800/60 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm w-full sm:w-auto text-center"
                    title="Testar notificação de hidratação no sistema"
                  >
                    <Droplets className="w-3.5 h-3.5 text-sky-500" />
                    <span>Testar Água</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleHydrationReminders}
                    className={`px-5 py-2 rounded-full font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center text-center ${
                      hydrationRemindersEnabled
                        ? 'bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200'
                        : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/20 hover:scale-105 active:scale-95'
                    } w-full sm:w-auto`}
                  >
                    {hydrationRemindersEnabled ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>

              {hydrationRemindersEnabled && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                    Frequência de Alertas de Hidratação
                  </span>
                  <select
                    value={hydrationInterval}
                    onChange={(e) => {
                      setHydrationInterval(e.target.value);
                      safeSet('nutri-hydration-interval', e.target.value);
                      if (profile) onSaveProfile({ ...profile, hydrationInterval: e.target.value });
                    }}
                    className="bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800/80 rounded-xl px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="45">A cada 45 minutos</option>
                    <option value="60">A cada 1 hora</option>
                    <option value="90">A cada 1h30 (Recomendado)</option>
                    <option value="120">A cada 2 horas</option>
                    <option value="180">A cada 3 horas</option>
                  </select>
                </div>
              )}
            </div>

            {/* 4. Workout Reminders Card */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3.5 rounded-2xl transition-colors ${
                    workoutRemindersEnabled 
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Lembretes de Horários de Treino</h4>
                      {workoutRemindersEnabled && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px] uppercase tracking-wider border border-purple-500/20">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {workoutRemindersEnabled 
                        ? 'Notificações programadas para lembrar sua sessão de treino diária.' 
                        : 'Ative para manter o foco na sua rotina de exercícios.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleTestWorkoutNotification}
                    className="px-3.5 py-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl font-bold text-xs transition-all border border-purple-200 dark:border-purple-800/60 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm w-full sm:w-auto text-center"
                    title="Testar notificação de treino no sistema"
                  >
                    <Flame className="w-3.5 h-3.5 text-purple-500" />
                    <span>Testar Treino</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleWorkoutReminders}
                    className={`px-5 py-2 rounded-full font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center text-center ${
                      workoutRemindersEnabled
                        ? 'bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200'
                        : 'bg-purple-500 hover:bg-purple-600 text-white shadow-purple-500/20 hover:scale-105 active:scale-95'
                    } w-full sm:w-auto`}
                  >
                    {workoutRemindersEnabled ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>

              {workoutRemindersEnabled && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-500" />
                      Horários Semanais de Treino
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(profile?.weeklyWorkoutPlan?.days || []).map((day) => (
                      <div key={day.dayKey} className="bg-purple-50/50 dark:bg-purple-950/20 p-2 rounded-xl border border-purple-100 dark:border-purple-900/30 flex flex-col justify-between">
                        <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 truncate">{day.dayName}</p>
                        <input
                          type="time"
                          value={profile?.workoutReminderTimes?.[day.dayKey] || '18:00'}
                          onChange={(e) => {
                            const newTimes = { ...(profile?.workoutReminderTimes || {}), [day.dayKey]: e.target.value };
                            if (profile) onSaveProfile({ ...profile, workoutReminderTimes: newTimes });
                          }}
                          className="mt-1.5 w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 rounded-lg px-2 py-1 text-xs font-mono font-bold text-purple-700 dark:text-purple-300 outline-none focus:ring-2 focus:ring-purple-500 text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Service Worker Background Info */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-xs">
              <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                <strong>Agendamento PWA Nativo:</strong> O Service Worker persiste seus horários localmente para disparar notificações pontuais mesmo quando a aba estiver em segundo plano.
              </span>
            </div>
          </div>

          {/* Biometrics Card */}
          <div className="space-y-4 w-full">
            <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Segurança e Biometria
            </label>
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-6 rounded-[2rem] shadow-sm space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Acesso por Cadastro Biométrico</h4>
                    {biometricEnabled && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[9px] uppercase tracking-wider shadow-sm">
                        Protegido
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Toque nas opções abaixo para ativar ou desativar os sensores de reconhecimento facial e impressão digital deste aparelho.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Reconhecimento Facial */}
                <button
                  type="button"
                  onClick={() => handleToggleBiometrics('face')}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left outline-none cursor-pointer active:scale-98 select-none ${
                    isFaceActive
                      ? 'bg-emerald-500/15 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl transition-colors ${isFaceActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                      <ScanFace className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wider">Reconhecimento Facial</p>
                      <p className="text-[11px] font-medium mt-0.5 opacity-90">
                        {isFaceActive ? 'Ativado e Vinculado' : 'Desativado (Toque para ativar)'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                    isFaceActive
                      ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_#10b981]'
                      : 'border-slate-300 dark:border-slate-600 bg-white/40 dark:bg-slate-800'
                  }`}>
                    {isFaceActive && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                </button>

                {/* Impressão Digital */}
                <button
                  type="button"
                  onClick={() => handleToggleBiometrics('fingerprint')}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left outline-none cursor-pointer active:scale-98 select-none ${
                    isFingerprintActive
                      ? 'bg-emerald-500/15 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl transition-colors ${isFingerprintActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wider">Impressão Digital</p>
                      <p className="text-[11px] font-medium mt-0.5 opacity-90">
                        {isFingerprintActive ? 'Ativada e Vinculada' : 'Desativada (Toque para ativar)'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                    isFingerprintActive
                      ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_#10b981]'
                      : 'border-slate-300 dark:border-slate-600 bg-white/40 dark:bg-slate-800'
                  }`}>
                    {isFingerprintActive && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                </button>
              </div>

              {biometricEnabled && (
                <div className="pt-2 flex justify-center w-full">
                  <button
                    type="button"
                    onClick={() => startBiometricTest(isFaceActive ? 'face' : 'fingerprint')}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-all border border-emerald-200 dark:border-emerald-800 cursor-pointer w-full sm:w-auto text-center"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Testar Validação de Biometria no Aparelho</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RBAC Role-Based Access Control & Profile Segmentation */}
          <div className="space-y-4 w-full">
            <div className="flex items-center justify-between">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Controle de Acesso Baseado em Funções (RBAC)
              </label>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wider border border-emerald-500/30">
                Segurança Ativa
              </span>
            </div>
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-6 rounded-[2rem] shadow-sm space-y-5">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                  Segmentação de Perfil & Permissões
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Alterne entre o perfil de <strong>Cliente / Consumidor</strong> (focado em dietas, smart swaps, assistente de voz e compras) e o perfil de <strong>Estabelecimento / Comerciante</strong> (focado em gestão de hortifrúti, estoque, pedidos e câmeras de frescor).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Profile Option */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('client')}
                  className={`flex flex-col p-4 rounded-2xl border transition-all text-left outline-none cursor-pointer active:scale-98 select-none ${
                    userRole === 'client'
                      ? 'bg-emerald-500/15 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-xl ${userRole === 'client' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm block">Cliente / Consumidor</span>
                        <span className="text-[11px] opacity-80">Experiência Pessoal & Saúde</span>
                      </div>
                    </div>
                    {userRole === 'client' && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-90 mt-2 leading-relaxed">
                    Acesso a planos de refeições personalizados, analisadores calóricos, SmartSwaps, assistente de voz Malu, roleta fitness, treinos e rotas de entrega.
                  </p>
                </button>

                {/* Merchant Profile Option */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('merchant')}
                  className={`flex flex-col p-4 rounded-2xl border transition-all text-left outline-none cursor-pointer active:scale-98 select-none ${
                    userRole === 'merchant'
                      ? 'bg-emerald-500/15 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-xl ${userRole === 'merchant' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm block">Estabelecimento / Comerciante</span>
                        <span className="text-[11px] opacity-80">Portal do Parceiro & Hortifrúti</span>
                      </div>
                    </div>
                    {userRole === 'merchant' && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-90 mt-2 leading-relaxed">
                    Acesso restrito ao Portal do Parceiro, gestão de catálogo de hortifrúti, controle de estoque preventivo, pedidos, relatórios de vendas e câmeras de frescor.
                  </p>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  O controle de acesso baseado em funções (RBAC) garante isolamento completo de dados e ferramentas entre clientes e comerciantes na nuvem.
                </span>
              </div>
            </div>
          </div>

          {/* Solar Circadian & Golden Hour Configuration Panel */}
          <div className="space-y-4 w-full">
            <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Ciclo Circadiano & Golden Hour (Notificações Solares)
            </label>
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-6 rounded-[2rem] shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 shrink-0">
                    <Sparkles className="w-5 h-5 animate-spin-slow" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                        Notificações Solares Circadianas
                      </h4>
                      {circadianConfig.enabled ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider border border-amber-500/30">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                      Gerencie alertas inteligentes baseados na alvorada (Golden Hour) para lembretes de hidratação e exposição à luz natural.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleCircadian('enabled')}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                      circadianConfig.enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    role="switch"
                    aria-checked={circadianConfig.enabled}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                        circadianConfig.enabled ? 'translate-x-6 text-amber-600' : 'translate-x-0 text-slate-400'
                      }`}
                    >
                      {circadianConfig.enabled && <Check className="w-4 h-4 stroke-[3]" />}
                    </span>
                  </button>
                </div>
              </div>

              {circadianConfig.enabled && (
                <div className="space-y-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Golden Hour Start */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Início da Golden Hour (Alvorada)
                      </label>
                      <input
                        type="time"
                        value={circadianConfig.goldenHourStart || '06:00'}
                        onChange={(e) => handleCircadianTimeChange('goldenHourStart', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-bold outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Golden Hour End */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Fim da Golden Hour
                      </label>
                      <input
                        type="time"
                        value={circadianConfig.goldenHourEnd || '08:00'}
                        onChange={(e) => handleCircadianTimeChange('goldenHourEnd', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-bold outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Ajuste Dinâmico de Brilho da Interface</p>
                      <p className="text-[11px]">Ajusta sutilmente a temperatura visual do app ao nascer do sol.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCircadian('intensityAdjustmentEnabled')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        circadianConfig.intensityAdjustmentEnabled
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {circadianConfig.intensityAdjustmentEnabled ? 'Brilho Automático: Ativo' : 'Brilho Automático: Inativo'}
                    </button>
                  </div>
                  
                  {/* Correlation Graph */}
                  <div className="mt-6">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                      Correlação: Hidratação vs Energia
                    </label>
                    <div className="h-64 w-full bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={circadianChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{fontSize: 10}} />
                          <YAxis tick={{fontSize: 10}} />
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="hydration" stroke="#10b981" strokeWidth={2} name="Hidratação (ml)" />
                          <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} name="Energia (%)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sleep Goal & Notifications Configuration */}
          <div className="space-y-4 w-full">
            <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Sono & Recuperação
            </label>
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-6 rounded-[2rem] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-500 dark:text-indigo-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Meta de Sono Diária</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Configure suas horas de descanso ideais.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={sleepGoalHours}
                    onChange={(e) => setSleepGoalHours(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-center"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">horas</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lembretes de Sono</span>
                <button
                  type="button"
                  onClick={() => setSleepReminderEnabled(!sleepReminderEnabled)}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    sleepReminderEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${sleepReminderEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Accessibility & High Contrast Card */}
          <div className="space-y-4 w-full">
            <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Preferências de Visual e Acessibilidade
            </label>
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-6 rounded-[2rem] shadow-sm space-y-6">
              
              {/* Theme Preference */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Modo de Cor</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Escolha o tema para o aplicativo.
                    </p>
                  </div>
                </div>
                <select 
                  value={formData.themePreference || 'auto'} 
                  onChange={(e) => {
                    const newTheme = e.target.value as 'light' | 'dark' | 'auto';
                    setFormData(prev => ({ ...prev, themePreference: newTheme }));
                    if (profile) {
                      onSaveProfile({ ...profile, themePreference: newTheme });
                    }
                    playSfx('tap');
                  }}
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="auto">Automático (Baseado no Sol)</option>
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                </select>
              </div>

              {/* High Contrast */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full shrink-0 transition-colors ${
                    highContrastEnabled 
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    <Contrast className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                        Modo de Alto Contraste
                      </h4>
                      {highContrastEnabled ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider border border-amber-500/30">
                          Ativado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                          Padrão
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                      Reforça o contraste de cores, espessura de bordas e nitidez dos textos.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleHighContrast}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      highContrastEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    role="switch"
                    aria-checked={highContrastEnabled}
                    title={highContrastEnabled ? "Desativar Modo de Alto Contraste" : "Ativar Modo de Alto Contraste"}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                        highContrastEnabled ? 'translate-x-6 text-amber-600' : 'translate-x-0 text-slate-400'
                      }`}
                    >
                      {highContrastEnabled ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Contrast className="w-3.5 h-3.5 opacity-60" />
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {highContrastEnabled && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200 font-medium"
                >
                  <Eye className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    O modo de alto contraste está ativo em todas as abas e botões do aplicativo.
                  </span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Minhas Receitas Salvas com Gestos de Deslize (Framer Motion) */}
          <SavedRecipesSwipeList profile={profile} onSaveProfile={onSaveProfile} />

          {/* Relatório PDF para Médicos/Nutricionistas */}
          <NutritionalReportPDF profile={profile} />

          {/* Card Resumo Clínico em Texto (Profissionais de Saúde & Intervalo de Datas) */}
          <div className="w-full p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-teal-600/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    Resumo Clínico Consolidado em Texto
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-[10px] uppercase tracking-wider">
                    Intervalo de Datas
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Filtre por qualquer intervalo de datas e gere um resumo clínico estruturado em texto puro para Prontuário Eletrônico (PEP) ou envio rápido no WhatsApp do seu profissional de saúde.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                vibrate(20);
                setShowClinicalTextModal(true);
              }}
              className="px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer w-full sm:w-auto text-center shrink-0"
              id="btn-open-clinical-text-summary-card"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Gerar Resumo em Texto</span>
            </button>
          </div>

          {/* Gestão de Perfil Familiar & Pets */}
          <FamilyProfilesManager currentProfile={profile} />

          {/* Sincronização com Wearables & Sensores */}
          <WearablesSync />

          {/* Tour Guiado Interativo com Setas */}
          <div className="w-full p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-md shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Tour de Boas-Vindas Interativo
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Reveja as funcionalidades principais (Gerador de Receitas, Rastreador de Hábitos, Despensa IA e mais) a qualquer momento.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  playSfx('pop');
                  vibrate(15);
                  window.dispatchEvent(new CustomEvent('app:openWelcomeTour', { detail: { mode: 'introjs' } }));
                }}
                className="px-3.5 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer w-full sm:w-auto text-center"
                id="btn-reopen-introjs-tour-profile"
                title="Iniciar tour passo a passo com Intro.js"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Tour Intro.js</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSfx('pop');
                  vibrate(15);
                  window.dispatchEvent(new CustomEvent('app:openWelcomeTour', { detail: { mode: 'spotlight' } }));
                }}
                className="px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer w-full sm:w-auto text-center"
                id="btn-reopen-welcome-tour-profile"
                title="Iniciar tour com setas visuais"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Tour com Setas</span>
              </button>
            </div>
          </div>

          {/* Painel Administrativo & Integridade do Banco */}
          <div className="w-full p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500 text-white shadow-md shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-100">
                    Painel Admin & Integridade do Banco
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase tracking-wider border border-emerald-500/40">
                    Online
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monitoramento em tempo real do Firestore, integridade de tabelas, índices e gerador de migrações.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playSfx('pop');
                vibrate(15);
                window.dispatchEvent(new CustomEvent('navigate', { detail: 'admin' }));
              }}
              className="px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer w-full sm:w-auto text-center shrink-0"
              id="btn-open-admin-db-dashboard"
              title="Abrir Painel Administrativo do Banco de Dados"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Abrir Admin Dashboard</span>
            </button>
          </div>

          <LanguageSwitcher profile={profile} onSaveProfile={onSaveProfile} />

          {/* Form Action Footer */}
          <div className="w-full pt-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-full border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold text-sm tracking-wide hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>

            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('TEM CERTEZA ABSOLUTA? Esta ação apaga permanentemente sua conta, histórico nutricional, dietas e receitas personalizadas. Não será possível desfazer.')) {
                  return;
                }
                try {
                  playSfx('scratch');
                  const currentUser = auth.currentUser;
                  if (currentUser) {
                    try {
                      await deleteDoc(doc(db, 'users', currentUser.uid));
                    } catch (e) {}
                    await deleteUser(currentUser);
                  }
                  await logout();
                  window.location.reload();
                } catch (err: any) {
                  if (err.code === 'auth/requires-recent-login') {
                    alert('Por motivos de segurança, você precisa fazer login novamente antes de excluir sua conta.');
                    await logout();
                  } else {
                    alert('Não foi possível excluir a conta: ' + (err.message || err));
                  }
                }
              }}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-4 rounded-full border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-colors font-bold text-xs tracking-wide cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Minha Conta
            </button>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <AnimatePresence>
                {isSaved && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="text-emerald-500 animate-pulse font-bold flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full"
                  >
                    <Check className="w-5 h-5" />
                    Salvo com sucesso!
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                form="profile-main-form"
                className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-bold px-8 py-4 rounded-full transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-5 h-5" />
                Salvar Perfil Completo
              </button>
            </div>
          </div>
        </div>

      {/* Preset Avatars Modal */}
      <AnimatePresence>
        {showAvatarPicker && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Escolher Avatar Ilustrado
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Selecione um estilo visual personalizado para seu perfil.
                  </p>
                </div>
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(avatar.url)}
                    className="group flex flex-col items-center p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer text-center"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden mb-2 ring-2 ring-transparent group-hover:ring-emerald-500 transition-all shadow-md">
                      <img src={avatar.url} alt={t(avatar.label)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      {t(avatar.label)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* URL Photo Modal */}
      <AnimatePresence>
        {showUrlInputModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-emerald-500" />
                  Inserir Link de Foto
                </h3>
                <button
                  onClick={() => setShowUrlInputModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cole a URL direta da imagem (ex: https://meusite.com/minhafoto.jpg):
              </p>

              <input
                type="url"
                value={customPhotoUrlInput}
                onChange={(e) => setCustomPhotoUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs font-mono text-slate-700 dark:text-slate-200"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUrlInputModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomUrl}
                  disabled={!customPhotoUrlInput.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Salvar Imagem
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3D Avatar Gallery Modal Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {show3DAvatarGallery && (
            <div className="fixed inset-0 z-[999998] flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-slate-950 rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl border border-emerald-500/30 relative"
              >
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Personalização de Avatar Biomecânico 3D</span>
                  </div>
                  <button
                    onClick={() => setShow3DAvatarGallery(false)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <AvatarGallery
                  userProfile={profile || undefined}
                  onSelectAvatar={handleSelect3DAvatar}
                  onClose={() => setShow3DAvatarGallery(false)}
                  isModal={true}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Biometric Scanner Test Modal Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isTestingBiometric && (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-emerald-500/30 text-center space-y-6 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-emerald-500/5 pointer-events-none" />

                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping duration-1000" />
                  <div className="absolute inset-2 rounded-full border border-emerald-400/50 animate-spin duration-3000" />
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 shadow-inner">
                    {isTestingBiometric === 'face' ? (
                      <ScanFace className="w-10 h-10 animate-pulse" />
                    ) : (
                      <Fingerprint className="w-10 h-10 animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-serif text-xl font-bold text-slate-800 dark:text-slate-100">
                    {isTestingBiometric === 'face' ? 'Escaneando Rosto' : 'Lendo Impressão Digital'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aponte para a câmera ou posicione seu dedo no leitor óptico para calibrar.
                  </p>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full transition-all duration-200"
                    style={{ width: `${testScanProgress}%` }}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Floating Global In-App Toast */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {activeToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-[999999] max-w-sm w-full bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl flex items-start gap-3 backdrop-blur-md"
            >
              <div className="p-2.5 rounded-xl bg-emerald-500 text-white shrink-0 shadow-md">
                {activeToast.icon === 'bell' ? (
                  <Bell className="w-5 h-5" />
                ) : activeToast.icon === 'face' ? (
                  <ScanFace className="w-5 h-5" />
                ) : activeToast.icon === 'fingerprint' ? (
                  <Fingerprint className="w-5 h-5" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">{activeToast.title}</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activeToast.desc}</p>
              </div>
              <button
                onClick={() => setActiveToast(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Complete Clinical Health Report Export Modal (PDF / CSV) */}
      <HealthReportExportModal
        profile={profile}
        isOpen={showExportLogsModal}
        onClose={() => setShowExportLogsModal(false)}
      />

      {/* Consolidated Clinical Text Summary Modal (Healthcare Professionals) */}
      <ClinicalTextSummaryModal
        profile={profile}
        isOpen={showClinicalTextModal}
        onClose={() => setShowClinicalTextModal(false)}
      />

      <PushNotificationManagerModal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        profile={profile}
        onUpdateProfile={onSaveProfile as any}
      />
    </div>
  );
}

