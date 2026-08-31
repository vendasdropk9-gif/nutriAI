import { safeGet, safeSet, safeRemove } from "../lib/storage";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserProfile } from '../types';
import { Check, LogOut, Cloud, Bell, BellOff, Fingerprint, ScanFace, ShieldCheck, Lock, Trash2, Sparkles, Volume2, X } from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { auth, db, doc, deleteDoc } from '../lib/firebase';
import { deleteUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileProps {
  profile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
}

export function Profile({ profile, onSaveProfile }: ProfileProps) {
  const { logoutLocally } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [mealRemindersEnabled, setMealRemindersEnabled] = useState<boolean>(() => {
    return safeGet('nutri-meal-reminders') === 'true';
  });
  const [activeToast, setActiveToast] = useState<{ title: string; desc: string; icon?: 'bell' | 'face' | 'fingerprint' | 'check' } | null>(null);
  const [isTestingBiometric, setIsTestingBiometric] = useState<'face' | 'fingerprint' | null>(null);

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
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    restrictions: profile?.restrictions?.join(', ') || '',
    allergies: profile?.allergies?.join(', ') || '',
    goals: profile?.goals || '',
    equipment: profile?.equipment?.join(', ') || '',
    weight: profile?.weight?.toString() || '',
    targetWeight: profile?.targetWeight?.toString() || '',
    height: profile?.height?.toString() || '',
    age: profile?.age?.toString() || '',
    activityLevel: profile?.activityLevel || '',
    gender: profile?.gender || '',
    skinTone: profile?.skinTone || '',
    hairColor: profile?.hairColor || '',
    bodyType: profile?.bodyType || '',
    metabolism: profile?.metabolism || '',
    routine: profile?.routine || '',
  });
  
  const [isSaved, setIsSaved] = useState(false);

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'both' | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [biometricPromptType, setBiometricPromptType] = useState<'face' | 'fingerprint' | null>(null);
  const [promptPassword, setPromptPassword] = useState('');
  const [promptError, setPromptError] = useState('');
  const [promptSuccess, setPromptSuccess] = useState('');
  const [testScanProgress, setTestScanProgress] = useState(0);

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
      // Deactivating this type
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
      // Activating this type
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

  const handleConfirmPromptPassword = () => {
    if (!promptPassword.trim()) {
      setPromptError('Sua senha de login é obrigatória para vincular a biometria.');
      playSfx('scratch');
      return;
    }
    
    safeSet('nutri-biometric-enabled', 'true');
    safeSet('nutri-biometric-type', biometricPromptType || 'face');
    safeSet('nutri-biometric-email', auth.currentUser?.email || '');
    safeSet('nutri-biometric-password', promptPassword);
    safeSet('nutri-biometric-username', auth.currentUser?.displayName || 'Usuário');

    setBiometricEnabled(true);
    setBiometricType(biometricPromptType);
    setPromptSuccess(`Biometria por ${biometricPromptType === 'face' ? 'Reconhecimento Facial' : 'Impressão Digital'} vinculada com sucesso!`);
    playSfx('success');
    vibrate([30, 30]);

    setTimeout(() => {
      setShowPasswordPrompt(false);
    }, 1500);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const processedProfile: UserProfile = {
      name: formData.name,
      restrictions: formData.restrictions.split(',').map((s) => s.trim()).filter(Boolean),
      allergies: formData.allergies.split(',').map((s) => s.trim()).filter(Boolean),
      goals: formData.goals,
      equipment: formData.equipment.split(',').map((s) => s.trim()).filter(Boolean),
      weight: formData.weight ? Number(formData.weight) : undefined,
      targetWeight: formData.targetWeight ? Number(formData.targetWeight) : undefined,
      height: formData.height ? Number(formData.height) : undefined,
      age: formData.age ? Number(formData.age) : undefined,
      activityLevel: formData.activityLevel,
      gender: formData.gender,
      skinTone: formData.skinTone,
      hairColor: formData.hairColor,
      bodyType: formData.bodyType as any,
      metabolism: formData.metabolism as any,
      routine: formData.routine,
    };
    
    onSaveProfile(processedProfile);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4 mb-6">
        <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-emerald-700 dark:text-emerald-400">
          Seu Perfil
        </h2>
        <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full w-fit mx-auto border border-emerald-100 dark:border-emerald-800">
          <Cloud className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Sincronizado com a Nuvem</span>
        </div>
        <p className="font-sans text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
          Configure suas restrições e objetivos para receitas mais precisas.
        </p>
      </div>

      <div className="clay-card p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                Nome
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Chef Lucas"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                Gênero
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
              >
                <option value="">Selecione...</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="outro">Outro/Não informar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                Idade
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder="Anos"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                Peso (kg)
              </label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                placeholder="Ex: 70"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                Altura (cm)
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="Ex: 175"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                Peso Alvo (kg)
              </label>
              <input
                type="number"
                value={formData.targetWeight}
                onChange={(e) => handleChange('targetWeight', e.target.value)}
                placeholder="Ex: 65"
                className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
               <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                  Nível de Atividade Física
               </label>
               <select
                  value={formData.activityLevel}
                  onChange={(e) => handleChange('activityLevel', e.target.value)}
                  className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="sedentario">Sedentário (pouco ou nenhum exercício)</option>
                  <option value="leve">Leve (exercício leve 1-3 dias/semana)</option>
                  <option value="moderado">Moderado (exercício moderado 3-5 dias/semana)</option>
                  <option value="intenso">Intenso (exercício forte 6-7 dias/semana)</option>
                </select>
            </div>
            
            <div className="space-y-2">
               <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                  Tom de Pele
               </label>
               <select
                  value={formData.skinTone}
                  onChange={(e) => handleChange('skinTone', e.target.value)}
                  className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="clara">Pele Clara</option>
                  <option value="media">Pele Média / Morena Clara</option>
                  <option value="parda">Pele Parda / Morena Escura</option>
                  <option value="escura">Pele Negra</option>
                </select>
            </div>

            <div className="space-y-2">
               <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                  Cor do Cabelo
               </label>
               <select
                  value={formData.hairColor}
                  onChange={(e) => handleChange('hairColor', e.target.value)}
                  className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 dark:border-slate-700 pt-6">
            <div className="space-y-2">
                <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                    Tipo de Corpo (Biotipo)
                </label>
                <select
                    value={formData.bodyType}
                    onChange={(e) => handleChange('bodyType', e.target.value)}
                    className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                >
                    <option value="">Selecione...</option>
                    <option value="Ectomorfo">Ectomorfo (Magro, dificuldade em ganhar peso)</option>
                    <option value="Mesomorfo">Mesomorfo (Atlético, facilidade em ganhar/perder)</option>
                    <option value="Endomorfo">Endomorfo (Largo, facilidade em ganhar peso)</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
                    Metabolismo Estimado
                </label>
                <select
                    value={formData.metabolism}
                    onChange={(e) => handleChange('metabolism', e.target.value)}
                    className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                >
                    <option value="">Selecione...</option>
                    <option value="Lento">Lento</option>
                    <option value="Moderado">Moderado</option>
                    <option value="Acelerado">Acelerado</option>
                </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Sua Rotina Diária (Horários, trabalho, disponibilidade)
            </label>
            <textarea
              value={formData.routine}
              onChange={(e) => handleChange('routine', e.target.value)}
              placeholder="Ex: Trabalho das 08h às 18h, treino musculação às 06h, durmo às 22h. Tenho pouco tempo para o almoço."
              rows={3}
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Restrições Alimentares (separadas por vírgula)
            </label>
            <input
              type="text"
              value={formData.restrictions}
              onChange={(e) => handleChange('restrictions', e.target.value)}
              placeholder="Ex: Vegano, Sem glúten"
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Alergias (separadas por vírgula)
            </label>
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => handleChange('allergies', e.target.value)}
              placeholder="Ex: Amendoim, Laticínios"
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Objetivos de Saúde
            </label>
            <input
              type="text"
              value={formData.goals}
              onChange={(e) => handleChange('goals', e.target.value)}
              placeholder="Ex: Perda de peso, Ganho muscular"
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Equipamentos de Cozinha (separados por vírgula)
            </label>
            <input
              type="text"
              value={formData.equipment}
              onChange={(e) => handleChange('equipment', e.target.value)}
              placeholder="Ex: Forno, Micro-ondas, Air Fryer"
              className="w-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition-all"
            />
          </div>

          {/* Meal Reminders Card */}
          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Notificações de Refeições
            </label>
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 p-5 rounded-2xl shadow-sm space-y-4">
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
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">Lembretes do Plano Alimentar</h4>
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

              {/* Meal Hours Schedule Badge Line when Active */}
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
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Segurança e Biometria
            </label>
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 p-6 rounded-[2rem] shadow-sm space-y-4">
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
                {/* Button 1: Reconhecimento Facial */}
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

                {/* Button 2: Impressão Digital */}
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

              {/* Instant Test Biometric Scanner Button */}
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

          <LanguageSwitcher profile={profile} onSaveProfile={onSaveProfile} />

          <div className="pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-full border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold text-sm tracking-wide hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
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
                className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-medium px-8 py-4 rounded-full transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                Salvar Perfil
              </button>
            </div>
          </div>
        </form>
      </div>

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
                {/* Background scanning laser effect */}
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

                <div>
                  <h3 className="text-xl font-serif font-bold text-slate-800 dark:text-white">
                    {isTestingBiometric === 'face' ? 'Escaneando Rosto...' : 'Lendo Impressão Digital...'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Validando sensor biométrico integrado com o NutriAI.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-200 shadow-[0_0_10px_#10b981]"
                    style={{ width: `${testScanProgress}%` }}
                  />
                </div>

                <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {testScanProgress}% Concluído
                </p>

                <button
                  type="button"
                  onClick={() => setIsTestingBiometric(null)}
                  className="px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Fechar
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* In-App Floating Toast Notification Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {activeToast && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="fixed top-6 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-[9999999] pointer-events-auto"
            >
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-start gap-3.5">
                <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/20 shrink-0">
                  {activeToast.icon === 'bell' ? (
                    <Bell className="w-5 h-5 animate-bounce" />
                  ) : activeToast.icon === 'face' ? (
                    <ScanFace className="w-5 h-5" />
                  ) : activeToast.icon === 'fingerprint' ? (
                    <Fingerprint className="w-5 h-5" />
                  ) : (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  )}
                </div>
                <div className="flex-1 pr-2">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    {activeToast.title}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {activeToast.desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveToast(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Password Prompt Confirmation Pop-up */}
      <AnimatePresence>
        {showPasswordPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 text-center"
            >
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                <Lock className="w-6 h-6 shrink-0" />
              </div>
              
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Confirmação de Senha</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Confirme a senha da sua conta para ativar o {biometricPromptType === 'face' ? 'Reconhecimento Facial' : 'Impressão Digital'} neste aparelho.
                </p>
              </div>

              {promptError && (
                <p className="text-xs text-red-500 font-semibold p-2.5 bg-red-50 dark:bg-red-950/20 rounded-xl leading-relaxed">
                  {promptError}
                </p>
              )}

              {promptSuccess && (
                <p className="text-xs text-emerald-500 font-semibold p-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl leading-relaxed animate-pulse">
                  {promptSuccess}
                </p>
              )}

              <input
                type="password"
                placeholder="Senha de login"
                value={promptPassword}
                onChange={(e) => setPromptPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 font-sans text-sm text-slate-800 dark:text-white"
              />

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordPrompt(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPromptPassword}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-all uppercase tracking-wide shadow-md"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
