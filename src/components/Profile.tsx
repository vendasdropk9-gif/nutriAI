import { safeGet, safeSet, safeRemove } from "../lib/storage";
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserProfile } from '../types';
import { 
  Check, LogOut, Cloud, Bell, BellOff, Fingerprint, ScanFace, 
  ShieldCheck, Trash2, Sparkles, Volume2, Camera, Upload, 
  User, RefreshCw, X, Image as ImageIcon, Droplets, Contrast, Eye
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { auth, db, doc, deleteDoc } from '../lib/firebase';
import { deleteUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileProps {
  profile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
}

const PRESET_AVATARS = [
  { id: 'chef', label: 'Chef Saudável', url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'fitness-woman', label: 'Atleta Fitness', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'fitness-man', label: 'Treino & Força', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'wellness', label: 'Zen & Bem-Estar', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'runner', label: 'Corrida & Energia', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'nature', label: 'Vitalidade Natural', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'nutrition', label: 'Nutrição & Vida', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300&h=300' },
  { id: 'modern', label: 'Estilo & Foco', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=300&h=300' }
];

export function Profile({ profile, onSaveProfile }: ProfileProps) {
  const { logoutLocally } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [mealRemindersEnabled, setMealRemindersEnabled] = useState<boolean>(() => {
    return safeGet('nutri-meal-reminders') === 'true';
  });
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
  const [customPhotoUrlInput, setCustomPhotoUrlInput] = useState('');
  const [showUrlInputModal, setShowUrlInputModal] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    photoURL: profile?.photoURL || '',
    email: profile?.email || auth.currentUser?.email || '',
    phone: profile?.phone || '',
    birthDate: profile?.birthDate || '',
    gender: profile?.gender || '',
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
      }));
    }
  }, [profile]);

  const [isSaved, setIsSaved] = useState(false);

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'both' | null>(null);
  const [testScanProgress, setTestScanProgress] = useState(0);

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

  const requestNotificationPermission = async () => {
    try {
      if ('Notification' in window && typeof Notification !== 'undefined') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        return permission;
      }
    } catch (e) {
      console.warn('Notification permission request blocked:', e);
    }
    return 'default' as NotificationPermission;
  };

  const handleToggleMealReminders = async () => {
    const nextState = !mealRemindersEnabled;
    setMealRemindersEnabled(nextState);
    safeSet('nutri-meal-reminders', String(nextState));

    if (nextState) {
      playSfx('crystal');
      vibrate([30, 40]);
      await requestNotificationPermission();
      showInAppToast('Lembretes Ativados!', 'Você receberá alertas e avisos sonoros nos horários das refeições.', 'bell');
    } else {
      playSfx('pop');
      vibrate(20);
      showInAppToast('Lembretes Desativados', 'Os alertas automáticos de refeições foram pausados.', 'bell');
    }
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
      highContrast: nextState
    };
    onSaveProfile(updatedProfile);
  };

  const handleTestMealNotification = () => {
    playSfx('notification');
    vibrate([40, 60, 100]);
    showInAppToast('🍲 Hora da Refeição!', 'Seu plano nutricional tem um lembrete programado: Almoço Saudável.', 'bell');

    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('🍲 Lembrete NutriAI', {
          body: 'Hora da sua refeição! Confira seu plano alimentar para manter o foco.',
          icon: '/favicon.ico'
        });
      }
    } catch (e) {
      console.warn('Failed to trigger native notification:', e);
    }
  };

  const handleLogout = async () => {
    try {
      playSfx('tap');
      vibrate(15);
      await logoutLocally();
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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsSaved(false);
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
    };
    
    onSaveProfile(processedProfile);
    playSfx('success');
    vibrate([30, 50]);
    setIsSaved(true);
    showInAppToast('Perfil Salvo!', 'Todas as suas informações foram salvas e sincronizadas.');
    setTimeout(() => setIsSaved(false), 4000);
  };

  const userInitial = (formData.name || profile?.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      {/* Header Info */}
      <div className="text-center space-y-3 mb-8">
        <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Seu Perfil
        </h2>
        <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3.5 py-1.5 rounded-full w-fit mx-auto border border-emerald-200 dark:border-emerald-800 shadow-sm">
          <Cloud className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Sincronizado na Nuvem & Firestore</span>
        </div>
        <p className="font-sans text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-lg mx-auto">
          Mantenha seus dados físicos, objetivos e fotos atualizados para recomendações nutricionais e treinos 100% sob medida.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="clay-card p-6 sm:p-10">
        {/* Photo & Identity Hero Section */}
        <div className="mb-10 pb-8 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar with Actions */}
            <div className="relative group shrink-0">
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

              {/* Camera Action Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-white dark:border-slate-800"
                title="Carregar nova foto da câmera ou galeria"
              >
                <Camera className="w-4 h-4" />
              </button>

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
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {formData.name || 'Usuário NutriAI'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                  {formData.email || 'Conta sincronizada'}
                </p>
              </div>

              {/* Action Buttons for Avatar */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Trocar Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-bold rounded-xl transition-all border border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Escolher Avatar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInputModal(true)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-all border border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  title="Inserir link da foto"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>URL</span>
                </button>

                {formData.photoURL && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all border border-rose-200 dark:border-rose-900/50 flex items-center gap-1 cursor-pointer"
                    title="Remover foto atual"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Formatos aceitos: JPG, PNG, WEBP. A foto é ajustada e sincronizada instantaneamente.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Nome Completo / Como quer ser chamado
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Lucas Silva"
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
                placeholder="seuemail@exemplo.com"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Telefone / WhatsApp
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Biometria & Físico */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Idade
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder="Anos"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Peso Atual (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                placeholder="Ex: 72.5"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Peso Alvo (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.targetWeight}
                onChange={(e) => handleChange('targetWeight', e.target.value)}
                placeholder="Ex: 65.0"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Altura (cm)
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="Ex: 175"
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
                <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                    Meta de Água Diária (ml)
                </label>
                <input
                    type="number"
                    step="100"
                    value={formData.waterGoal}
                    onChange={(e) => handleChange('waterGoal', e.target.value)}
                    placeholder="Ex: 2500"
                    className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                />
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

          {/* Meal Reminders Card */}
          <div className="space-y-2">
            <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Notificações de Refeições
            </label>
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm space-y-4">
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
                        ? 'Você receberá avisos sonoros e alertas pontuais para não pular refeições.' 
                        : 'Ative para receber alertas quando for a hora de comer.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {mealRemindersEnabled && (
                    <button
                      type="button"
                      onClick={handleTestMealNotification}
                      className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-xs transition-all border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Tocar som de teste e simular notificação"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Testar Alerta</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleMealReminders}
                    className={`px-5 py-2 rounded-full font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer ${
                      mealRemindersEnabled
                        ? 'bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {mealRemindersEnabled ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>

              {mealRemindersEnabled && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Café da Manhã</p>
                    <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">08:00</p>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Almoço</p>
                    <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">12:30</p>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Lanche</p>
                    <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">16:30</p>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Jantar</p>
                    <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">20:00</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Biometrics Card */}
          <div className="space-y-4">
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
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => startBiometricTest(isFaceActive ? 'face' : 'fingerprint')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-all border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Testar Validação de Biometria no Aparelho</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Accessibility & High Contrast Card */}
          <div className="space-y-4">
            <label className="block font-sans text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Acessibilidade & Visual
            </label>
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-6 rounded-[2rem] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                      Reforça o contraste de cores, espessura de bordas e nitidez dos textos para facilitar a visualização e navegação de pessoas com baixa visão ou em ambientes com luz solar intensa.
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

          <LanguageSwitcher profile={profile} onSaveProfile={onSaveProfile} />

          {/* Form Action Footer */}
          <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-700">
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
                  await logoutLocally();
                  window.location.reload();
                } catch (err: any) {
                  if (err.code === 'auth/requires-recent-login') {
                    alert('Por motivos de segurança, você precisa fazer login novamente antes de excluir sua conta.');
                    await logoutLocally();
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
                className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-bold px-8 py-4 rounded-full transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-5 h-5" />
                Salvar Perfil Completo
              </button>
            </div>
          </div>
        </form>
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
                      <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      {avatar.label}
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
    </div>
  );
}

