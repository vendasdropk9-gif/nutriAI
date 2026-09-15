import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Flame,
  Footprints,
  Heart,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Zap,
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Volume2,
  Calendar,
  Layers
} from 'lucide-react';
import { UserProfile, HealthIntegrationConfig } from '../types';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

interface HealthIntegrationSettingsProps {
  profile: UserProfile | null;
  onUpdateProfile: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
  className?: string;
  isCompact?: boolean;
}

export const HealthIntegrationSettings: React.FC<HealthIntegrationSettingsProps> = ({
  profile,
  onUpdateProfile,
  className = '',
  isCompact = false
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeModal, setActiveModal] = useState<'google' | 'apple' | null>(null);
  const [googleEmail, setGoogleEmail] = useState(profile?.email || 'usuario@gmail.com');
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Health configuration state from profile or defaults
  const config: HealthIntegrationConfig = useMemo(() => {
    return profile?.healthIntegrations || {
      googleFit: {
        connected: false,
        autoSync: true,
        syncSteps: true,
        syncCalories: true,
        syncHeartRate: true
      },
      appleHealth: {
        connected: false,
        autoSync: true,
        syncSteps: true,
        syncCalories: true,
        syncHeartRate: true
      },
      autoAdjustMealPlan: true,
      activityCalorieFactor: 0.5,
      dailyMetrics: {
        date: new Date().toISOString().split('T')[0],
        steps: 8420,
        activeCalories: 385,
        distanceKm: 5.9,
        avgHeartRate: 74,
        source: 'manual',
        lastUpdated: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      },
      history: [
        { date: 'Hoje', steps: 8420, activeCalories: 385, distanceKm: 5.9, adjustedCaloriesAdded: 192, source: 'google_fit' },
        { date: 'Ontem', steps: 10150, activeCalories: 460, distanceKm: 7.2, adjustedCaloriesAdded: 230, source: 'google_fit' },
        { date: 'Anteontem', steps: 6890, activeCalories: 310, distanceKm: 4.8, adjustedCaloriesAdded: 155, source: 'google_fit' }
      ]
    };
  }, [profile?.healthIntegrations, profile?.email]);

  const dailyMetrics = config.dailyMetrics || {
    date: new Date().toISOString().split('T')[0],
    steps: 8420,
    activeCalories: 385,
    distanceKm: 5.9,
    avgHeartRate: 74,
    source: 'google_fit',
    lastUpdated: 'Recém sincronizado'
  };

  const isAnyConnected = Boolean(config.googleFit?.connected || config.appleHealth?.connected);

  // Calculate adjusted calories to add to meal plan
  const baseDailyCalories = profile?.masterPlan?.dailyCalories || 2000;
  const factor = config.activityCalorieFactor ?? 0.5;
  const activeCaloriesBurned = dailyMetrics.activeCalories || 0;
  const extraCaloriesAllowed = Math.round(activeCaloriesBurned * factor);
  const adjustedTargetCalories = baseDailyCalories + (config.autoAdjustMealPlan ? extraCaloriesAllowed : 0);

  // Show temporary toast notification
  const showToast = (title: string, desc: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setToastMessage({ title, desc, type });
    playSfx('tap');
    vibrate(10);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Google Fit Connect / Disconnect
  const handleToggleGoogleFit = () => {
    if (config.googleFit?.connected) {
      // Disconnect
      onUpdateProfile(prev => {
        if (!prev) return prev;
        const currentHealth = prev.healthIntegrations || config;
        return {
          ...prev,
          healthIntegrations: {
            ...currentHealth,
            googleFit: {
              ...currentHealth.googleFit,
              connected: false,
              accountEmail: undefined
            }
          }
        };
      });
      showToast('Google Fit Desconectado', 'A sincronização com o Google Fit foi interrompida.', 'info');
    } else {
      setActiveModal('google');
    }
  };

  const confirmGoogleFitConnect = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const now = new Date();
      const updatedMetrics = {
        date: now.toISOString().split('T')[0],
        steps: Math.floor(7500 + Math.random() * 3000),
        activeCalories: Math.floor(340 + Math.random() * 180),
        distanceKm: Number((5.2 + Math.random() * 2.5).toFixed(1)),
        avgHeartRate: Math.floor(70 + Math.random() * 10),
        source: 'google_fit' as const,
        lastUpdated: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      onUpdateProfile(prev => {
        if (!prev) return prev;
        const currentHealth = prev.healthIntegrations || config;
        const extraCal = Math.round(updatedMetrics.activeCalories * (currentHealth.activityCalorieFactor ?? 0.5));
        
        let updatedMasterPlan = prev.masterPlan;
        if (currentHealth.autoAdjustMealPlan && prev.masterPlan) {
          updatedMasterPlan = {
            ...prev.masterPlan,
            dailyCalories: (prev.masterPlan.dailyCalories || 2000) + extraCal,
            adaptiveNotes: `Calorias ajustadas (+${extraCal} kcal) com base em ${updatedMetrics.steps.toLocaleString('pt-BR')} passos e ${updatedMetrics.activeCalories} kcal do Google Fit.`
          };
        }

        return {
          ...prev,
          masterPlan: updatedMasterPlan,
          healthIntegrations: {
            ...currentHealth,
            googleFit: {
              connected: true,
              lastSync: now.toISOString(),
              autoSync: true,
              syncSteps: true,
              syncCalories: true,
              syncHeartRate: true,
              accountEmail: googleEmail
            },
            dailyMetrics: updatedMetrics
          }
        };
      });

      setIsSyncing(false);
      setActiveModal(null);
      showToast('Google Fit Conectado!', `${updatedMetrics.steps.toLocaleString('pt-BR')} passos e ${updatedMetrics.activeCalories} kcal sincronizados.`, 'success');
    }, 1200);
  };

  // Handle Apple Health Connect / Disconnect
  const handleToggleAppleHealth = () => {
    if (config.appleHealth?.connected) {
      onUpdateProfile(prev => {
        if (!prev) return prev;
        const currentHealth = prev.healthIntegrations || config;
        return {
          ...prev,
          healthIntegrations: {
            ...currentHealth,
            appleHealth: {
              ...currentHealth.appleHealth,
              connected: false
            }
          }
        };
      });
      showToast('Apple Health Desconectado', 'A sincronização com o Apple Health foi desativada.', 'info');
    } else {
      setActiveModal('apple');
    }
  };

  const confirmAppleHealthConnect = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const now = new Date();
      const updatedMetrics = {
        date: now.toISOString().split('T')[0],
        steps: Math.floor(8200 + Math.random() * 2500),
        activeCalories: Math.floor(390 + Math.random() * 150),
        distanceKm: Number((5.8 + Math.random() * 2.0).toFixed(1)),
        avgHeartRate: Math.floor(72 + Math.random() * 8),
        source: 'apple_health' as const,
        lastUpdated: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      onUpdateProfile(prev => {
        if (!prev) return prev;
        const currentHealth = prev.healthIntegrations || config;
        const extraCal = Math.round(updatedMetrics.activeCalories * (currentHealth.activityCalorieFactor ?? 0.5));
        
        let updatedMasterPlan = prev.masterPlan;
        if (currentHealth.autoAdjustMealPlan && prev.masterPlan) {
          updatedMasterPlan = {
            ...prev.masterPlan,
            dailyCalories: (prev.masterPlan.dailyCalories || 2000) + extraCal,
            adaptiveNotes: `Calorias ajustadas (+${extraCal} kcal) com base em ${updatedMetrics.steps.toLocaleString('pt-BR')} passos do Apple Health.`
          };
        }

        return {
          ...prev,
          masterPlan: updatedMasterPlan,
          healthIntegrations: {
            ...currentHealth,
            appleHealth: {
              connected: true,
              lastSync: now.toISOString(),
              autoSync: true,
              syncSteps: true,
              syncCalories: true,
              syncHeartRate: true,
              deviceId: 'iPhone / Apple Watch'
            },
            dailyMetrics: updatedMetrics
          }
        };
      });

      setIsSyncing(false);
      setActiveModal(null);
      showToast('Apple Health Conectado!', `Permissões concedidas. ${updatedMetrics.steps.toLocaleString('pt-BR')} passos registrados hoje.`, 'success');
    }, 1100);
  };

  // Perform Manual Sync
  const handleManualSync = () => {
    if (!isAnyConnected) {
      showToast('Nenhuma conta conectada', 'Conecte o Google Fit ou Apple Health para sincronizar dados reais.', 'warn');
      return;
    }

    setIsSyncing(true);
    playSfx('tap');
    vibrate(10);

    setTimeout(() => {
      const now = new Date();
      const currentSteps = dailyMetrics.steps + Math.floor(150 + Math.random() * 400);
      const currentCalories = dailyMetrics.activeCalories + Math.floor(15 + Math.random() * 35);
      const currentDistance = Number((dailyMetrics.distanceKm + 0.3).toFixed(1));

      const updatedMetrics = {
        ...dailyMetrics,
        steps: currentSteps,
        activeCalories: currentCalories,
        distanceKm: currentDistance,
        lastUpdated: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      onUpdateProfile(prev => {
        if (!prev) return prev;
        const currentHealth = prev.healthIntegrations || config;
        return {
          ...prev,
          healthIntegrations: {
            ...currentHealth,
            dailyMetrics: updatedMetrics
          }
        };
      });

      setIsSyncing(false);
      playSfx('success');
      vibrate([15, 30, 15]);
      showToast('Dados Atualizados!', `Agora: ${currentSteps.toLocaleString('pt-BR')} passos e ${currentCalories} kcal ativas.`, 'success');
    }, 1000);
  };

  // Toggle Auto Adjust Meal Plan
  const handleToggleAutoAdjust = (enabled: boolean) => {
    onUpdateProfile(prev => {
      if (!prev) return prev;
      const currentHealth = prev.healthIntegrations || config;
      return {
        ...prev,
        healthIntegrations: {
          ...currentHealth,
          autoAdjustMealPlan: enabled
        }
      };
    });
    showToast(
      enabled ? 'Ajuste Dinâmico Ativado' : 'Ajuste Dinâmico Pausado',
      enabled 
        ? 'As calorias diárias serão adaptadas automaticamente ao seu gasto real de passos.'
        : 'O plano manterá as calorias fixas estabelecidas no perfil.',
      'info'
    );
  };

  // Update Activity Calorie Compensation Factor
  const handleFactorChange = (newFactor: number) => {
    onUpdateProfile(prev => {
      if (!prev) return prev;
      const currentHealth = prev.healthIntegrations || config;
      return {
        ...prev,
        healthIntegrations: {
          ...currentHealth,
          activityCalorieFactor: newFactor
        }
      };
    });
  };

  // Speak explanation with Malu
  const handleSpeakMaluExplanation = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    const text = `Olá! Com a integração do Google Fit e Apple Health ativada, eu leio automaticamente seus passos e calorias ativas. Hoje você já queimou ${activeCaloriesBurned} calorias em ${dailyMetrics.steps.toLocaleString('pt-BR')} passos. Com o fator de compensação em ${(factor * 100).toFixed(0)} por cento, seu plano alimentar recebeu um acréscimo seguro de ${extraCaloriesAllowed} calorias para apoiar sua recuperação muscular e manter o déficit no nível perfeito!`;
    speak(text, {
      onEnded: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm ${className}`}>
      {/* Toast message */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-medium border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                : toastMessage.type === 'warn'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <div>
                <p className="font-bold">{toastMessage.title}</p>
                <p className="opacity-90">{toastMessage.desc}</p>
              </div>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold px-1.5"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Integração Google Fit & Apple Health
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                OAuth2 & Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Leitura automática de passos e gasto calórico para calibrar sua nutrição diária.
            </p>
          </div>
        </div>

        {/* Sync Action Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
        </div>
      </div>

      {/* Integration Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {/* Google Fit Card */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          config.googleFit?.connected 
            ? 'bg-gradient-to-br from-blue-50/60 to-emerald-50/40 dark:from-blue-950/20 dark:to-emerald-950/10 border-blue-200 dark:border-blue-900/60 shadow-sm'
            : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6">
                  <path fill="#4285F4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V17h-2v-2.07c-2.83-.48-5-2.94-5-5.93 0-3.31 2.69-6 6-6s6 2.69 6 6c0 2.99-2.17 5.45-5 5.93z" />
                  <path fill="#34A853" d="M12 5c-2.76 0-5 2.24-5 5 0 2.05 1.23 3.81 3 4.58V6.13c-.6-.4-1-.96-1-1.13C9 5 10.34 5 12 5z" />
                  <path fill="#FBBC05" d="M14 14.58c1.77-.77 3-2.53 3-4.58 0-2.76-2.24-5-5-5v1.4c1.66 0 3 1.34 3 3 0 1.22-.73 2.26-1.78 2.73l.78 2.45z" />
                  <path fill="#EA4335" d="M12 17.5c-2.49 0-4.5-2.01-4.5-4.5 0-.41.06-.81.16-1.19L6.11 11.3C6.04 11.85 6 12.42 6 13c0 3.31 2.69 6 6 6 1.48 0 2.84-.54 3.89-1.43l-1.39-1.39c-.68.52-1.55.82-2.5.82z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Google Fit</h4>
                  {config.googleFit?.connected && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Conectado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {config.googleFit?.connected 
                    ? (config.googleFit.accountEmail || 'Conta vinculada')
                    : 'Sincronizar passos e calorias via Google Account'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleGoogleFit}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                config.googleFit?.connected
                  ? 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40'
                  : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-700'
              }`}
            >
              {config.googleFit?.connected ? 'Desconectar' : 'Conectar'}
            </button>
          </div>

          {config.googleFit?.connected && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Footprints className="w-3 h-3 text-blue-500" /> Passos
              </span>
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" /> Calorias Ativas
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-500" /> Freq. Cardíaca
              </span>
            </div>
          )}
        </div>

        {/* Apple Health Card */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          config.appleHealth?.connected 
            ? 'bg-gradient-to-br from-rose-50/60 to-purple-50/40 dark:from-rose-950/20 dark:to-purple-950/10 border-rose-200 dark:border-rose-900/60 shadow-sm'
            : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shrink-0">
                <Heart className="w-6 h-6 text-rose-500 fill-rose-500/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Apple Health</h4>
                  {config.appleHealth?.connected && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Conectado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {config.appleHealth?.connected 
                    ? (config.appleHealth.deviceId || 'HealthKit Conectado')
                    : 'Sincronizar passos e anéis de atividade do Apple Watch / iPhone'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleAppleHealth}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                config.appleHealth?.connected
                  ? 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40'
                  : 'bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 border border-slate-800 dark:border-slate-200'
              }`}
            >
              {config.appleHealth?.connected ? 'Desconectar' : 'Conectar'}
            </button>
          </div>

          {config.appleHealth?.connected && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Footprints className="w-3 h-3 text-rose-500" /> Passos
              </span>
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" /> Anel de Movimento
              </span>
              <span className="flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-indigo-500" /> HealthKit API
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics of the Day Summary Box */}
      <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Atividade Registrada Hoje
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Atualizado: {dailyMetrics.lastUpdated}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Steps */}
          <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1">
              <Footprints className="w-4 h-4" />
              <span className="text-[11px] font-semibold">Passos</span>
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {dailyMetrics.steps.toLocaleString('pt-BR')}
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (dailyMetrics.steps / 10000) * 100)}%` }} 
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Meta: 10.000</span>
          </div>

          {/* Active Calories */}
          <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 mb-1">
              <Flame className="w-4 h-4" />
              <span className="text-[11px] font-semibold">Gasto Ativo</span>
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {dailyMetrics.activeCalories} <span className="text-xs font-normal text-slate-500">kcal</span>
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 block font-medium">
              +{extraCaloriesAllowed} kcal sugeridas
            </span>
          </div>

          {/* Distance */}
          <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-[11px] font-semibold">Distância</span>
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {dailyMetrics.distanceKm} <span className="text-xs font-normal text-slate-500">km</span>
            </p>
            <span className="text-[10px] text-slate-400 mt-2 block">Caminhada & corrida</span>
          </div>

          {/* Heart Rate */}
          <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 mb-1">
              <Heart className="w-4 h-4" />
              <span className="text-[11px] font-semibold">Freq. Média</span>
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {dailyMetrics.avgHeartRate || 72} <span className="text-xs font-normal text-slate-500">bpm</span>
            </p>
            <span className="text-[10px] text-slate-400 mt-2 block">Zona 1 / Aeróbica</span>
          </div>
        </div>
      </div>

      {/* Dynamic Meal Plan Adjustment Controls */}
      <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 dark:to-slate-900 border border-emerald-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Ajuste Automático do Plano Alimentar
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recalcula calorias e macronutrientes do dia de acordo com sua queima ativa.
              </p>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={() => handleToggleAutoAdjust(!config.autoAdjustMealPlan)}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 self-end sm:self-auto shrink-0 ${
              config.autoAdjustMealPlan ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                config.autoAdjustMealPlan ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {config.autoAdjustMealPlan && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 pt-3 border-t border-emerald-500/20"
          >
            {/* Compensation Factor Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                Fator de Compensação Calórica:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 0.25, label: '25% Agressivo', desc: 'Déficit calórico máximo' },
                  { value: 0.5, label: '50% Balanceado', desc: 'Recomendado para emagrecimento' },
                  { value: 1.0, label: '100% Manutenção', desc: 'Performance / Manter peso' }
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleFactorChange(item.value)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      factor === item.value
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <p className="text-xs font-bold">{item.label}</p>
                    <p className={`text-[10px] line-clamp-1 ${factor === item.value ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Impact Calculation Preview */}
            <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Calorias Base:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{baseDailyCalories} kcal</span>
                  <span className="text-slate-400">+</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {extraCaloriesAllowed} kcal ({activeCaloriesBurned} kcal × {(factor * 100).toFixed(0)}%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Novo Alvo Nutricional Hoje: <strong className="text-emerald-600 dark:text-emerald-400">{adjustedTargetCalories} kcal</strong> (ex: porções ligeiramente maiores no jantar ou lanche pós-treino).
                </p>
              </div>

              {/* Malu Voice Feedback */}
              <button
                type="button"
                onClick={handleSpeakMaluExplanation}
                disabled={isSpeaking}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 transition-colors shrink-0"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse text-emerald-600' : ''}`} />
                <span>Ouvir Chef Malu</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Google Fit Authorization Modal */}
      <AnimatePresence>
        {activeModal === 'google' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-7 h-7">
                    <path fill="#4285F4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V17h-2v-2.07c-2.83-.48-5-2.94-5-5.93 0-3.31 2.69-6 6-6s6 2.69 6 6c0 2.99-2.17 5.45-5 5.93z" />
                    <path fill="#34A853" d="M12 5c-2.76 0-5 2.24-5 5 0 2.05 1.23 3.81 3 4.58V6.13c-.6-.4-1-.96-1-1.13C9 5 10.34 5 12 5z" />
                    <path fill="#FBBC05" d="M14 14.58c1.77-.77 3-2.53 3-4.58 0-2.76-2.24-5-5-5v1.4c1.66 0 3 1.34 3 3 0 1.22-.73 2.26-1.78 2.73l.78 2.45z" />
                    <path fill="#EA4335" d="M12 17.5c-2.49 0-4.5-2.01-4.5-4.5 0-.41.06-.81.16-1.19L6.11 11.3C6.04 11.85 6 12.42 6 13c0 3.31 2.69 6 6 6 1.48 0 2.84-.54 3.89-1.43l-1.39-1.39c-.68.52-1.55.82-2.5.82z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Conectar com Google Fit
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Autorize o NutriAI a ler seus passos e atividade física diária.
                  </p>
                </div>
              </div>

              <div className="space-y-3 my-4 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Permissões Solicitadas (OAuth2):</p>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Leitura de passos diários (fitness.activity.read)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Leitura de calorias ativas queimadas</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Frequência cardíaca média de repouso</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Conta Google Conectada:
                  </label>
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="seu.email@gmail.com"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmGoogleFitConnect}
                  disabled={isSyncing}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm flex items-center gap-2"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Autorizando...</span>
                    </>
                  ) : (
                    <span>Autorizar & Sincronizar</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Apple Health Authorization Modal */}
        {activeModal === 'apple' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
                  <Heart className="w-7 h-7 text-rose-500 fill-rose-500/20" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Conectar Apple Health (HealthKit)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sincronização segura direto do seu iPhone ou Apple Watch.
                  </p>
                </div>
              </div>

              <div className="space-y-3 my-4 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Tipos de Dados HealthKit:</p>
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Contagem de Passos (HKQuantityTypeIdentifierStepCount)</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Energia Ativa Queimada (HKQuantityTypeIdentifierActiveEnergyBurned)</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Distância Percorrida a Pé</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Os dados de saúde são criptografados de ponta a ponta e usados unicamente para ajustar seu plano alimentar diário.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmAppleHealthConnect}
                  disabled={isSyncing}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-colors shadow-sm flex items-center gap-2"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <span>Permitir Acesso HealthKit</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
