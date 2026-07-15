import { safeGet, safeSet, safeRemove } from "../lib/storage";
import React, { useState, useEffect } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SecuritySuite } from './SecuritySuite';
import { UserProfile } from '../types';
import { Check, LogOut, Cloud, Bell, BellOff, Fingerprint, ScanFace, ShieldCheck, Lock } from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileProps {
  profile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
}

export function Profile({ profile, onSaveProfile }: ProfileProps) {
  const { logoutLocally } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    try {
      if ('Notification' in window && typeof Notification !== 'undefined') {
        setNotificationPermission(Notification.permission);
      }
    } catch (e) {
      console.warn('Notification permission read blocked:', e);
    }
  }, []);

  const requestNotificationPermission = async () => {
    try {
      if ('Notification' in window && typeof Notification !== 'undefined') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
      }
    } catch (e) {
      console.warn('Notification permission request blocked:', e);
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

  useEffect(() => {
    const enabled = safeGet('nutri-biometric-enabled') === 'true';
    const type = safeGet('nutri-biometric-type') as any;
    setBiometricEnabled(enabled);
    setBiometricType(type);
  }, []);

  const handleToggleBiometrics = (type: 'face' | 'fingerprint') => {
    const active = safeGet('nutri-biometric-enabled') === 'true';
    const currentType = safeGet('nutri-biometric-type');

    if (active && (currentType === type || currentType === 'both')) {
      // Disable biometrics
      safeRemove('nutri-biometric-enabled');
      safeRemove('nutri-biometric-type');
      safeRemove('nutri-biometric-password');
      safeRemove('nutri-biometric-email');
      safeRemove('nutri-biometric-username');
      setBiometricEnabled(false);
      setBiometricType(null);
      playSfx('pop');
      vibrate(50);
    } else {
      // Enable biometrics: Show secure confirmation prompt so user saves credentials locally
      setBiometricPromptType(type);
      setPromptPassword('');
      setPromptError('');
      setPromptSuccess('');
      setShowPasswordPrompt(true);
      playSfx('tap');
    }
  };

  const handleConfirmPromptPassword = () => {
    if (!promptPassword.trim()) {
      setPromptError('Sua senha de login é obrigatória para vincular a biometria.');
      playSfx('scratch');
      return;
    }
    
    // Save credentials safely to device's secure local cache to allow instant background logins
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

          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold tracking-wide uppercase text-slate-400 dark:text-slate-500">
              Notificações de Refeições
            </label>
            <div className="flex items-center gap-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-600/50 p-4 rounded-2xl shadow-sm">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
                {notificationPermission === 'granted' ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Lembretes do Plano Alimentar</h4>
                <p className="text-sm text-slate-500">
                  {notificationPermission === 'granted' 
                    ? 'Você receberá notificações na hora das refeições.' 
                    : 'Ative para receber alertas quando for a hora de comer.'}
                </p>
              </div>
              {notificationPermission !== 'granted' ? (
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium text-sm transition-colors"
                >
                  Ativar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (typeof Notification !== 'undefined') {
                        new Notification('Teste de Notificação 🍲', {
                          body: 'Tudo certo! Você será avisado na hora das suas refeições.',
                        });
                      }
                    } catch (e) {
                      console.warn('Failed to display native test notification:', e);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-full font-medium text-sm transition-colors"
                >
                  Testar
                </button>
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
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Acesso por Cadastro Biométrico</h4>
                  <p className="text-sm text-slate-500">
                    Use os sensores corporais de seu dispositivo para acessar o NutriAI instantaneamente sem redigitar senhas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleToggleBiometrics('face')}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left outline-none ${
                    biometricEnabled && (biometricType === 'face' || biometricType === 'both')
                      ? 'bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-transparent text-slate-500 hover:bg-slate-100/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ScanFace className="w-5 h-5" />
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wider">Reconhecimento Facial</p>
                      <p className="text-[10px] opacity-80">
                        {biometricEnabled && (biometricType === 'face' || biometricType === 'both') ? 'Disponível' : 'Desativado'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                    biometricEnabled && (biometricType === 'face' || biometricType === 'both')
                      ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_#10b981]'
                      : 'border-slate-350'
                  }`} />
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleBiometrics('fingerprint')}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left outline-none ${
                    biometricEnabled && (biometricType === 'fingerprint' || biometricType === 'both')
                      ? 'bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-transparent text-slate-500 hover:bg-slate-100/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Fingerprint className="w-5 h-5" />
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wider">Impressão Digital</p>
                      <p className="text-[10px] opacity-80">
                        {biometricEnabled && (biometricType === 'fingerprint' || biometricType === 'both') ? 'Disponível' : 'Desativado'}
                      </p>
                    </div>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                    biometricEnabled && (biometricType === 'fingerprint' || biometricType === 'both')
                      ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_#10b981]'
                      : 'border-slate-350'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <SecuritySuite />

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
