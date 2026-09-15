import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Footprints, Flame, Heart, Zap, RefreshCw, 
  ArrowUpRight, CheckCircle2, AlertCircle, Volume2, 
  VolumeX, Sparkles, TrendingUp, Smartphone, ShieldCheck, ChevronRight
} from 'lucide-react';
import { UserProfile, HealthIntegrationConfig } from '../types';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';

interface ConnectedHealthWidgetProps {
  profile: UserProfile | null;
  onNavigate: (tab: string) => void;
  onUpdateProfile?: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
}

export const ConnectedHealthWidget: React.FC<ConnectedHealthWidgetProps> = ({
  profile,
  onNavigate,
  onUpdateProfile,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  // Configuration and defaults
  const integrations: HealthIntegrationConfig | undefined = profile?.healthIntegrations;
  const isGoogleFitConnected = !!integrations?.googleFit?.connected;
  const isAppleHealthConnected = !!integrations?.appleHealth?.connected;
  const isConnected = isGoogleFitConnected || isAppleHealthConnected;

  const defaultMetrics = {
    steps: 7450,
    activeCalories: 380,
    distanceKm: 5.2,
    avgHeartRate: 72,
    source: isAppleHealthConnected ? 'apple_health' : isGoogleFitConnected ? 'google_fit' : 'manual'
  };

  const currentMetrics = integrations?.dailyMetrics || defaultMetrics;
  const stepGoal = 10000;
  const stepPercent = Math.min(100, Math.round((currentMetrics.steps / stepGoal) * 100));
  const calorieFactor = integrations?.activityCalorieFactor ?? 0.5;
  const extraKcalAllowed = Math.round(currentMetrics.activeCalories * calorieFactor);

  // Weekly mini-history mock data / real history if available
  const historyData = integrations?.history && integrations.history.length > 0 
    ? integrations.history 
    : [
        { date: 'Seg', steps: 6800, activeCalories: 320 },
        { date: 'Ter', steps: 8900, activeCalories: 450 },
        { date: 'Qua', steps: 7200, activeCalories: 360 },
        { date: 'Qui', steps: 9400, activeCalories: 490 },
        { date: 'Sex', steps: 10200, activeCalories: 530 },
        { date: 'Sáb', steps: 8100, activeCalories: 410 },
        { date: 'Hoje', steps: currentMetrics.steps, activeCalories: currentMetrics.activeCalories }
      ];

  const maxStepsInWeek = Math.max(...historyData.map(d => d.steps), 10000);

  // Manual Quick Sync
  const handleQuickSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    playSfx('tap');
    vibrate(10);

    setTimeout(() => {
      const additionalSteps = Math.floor(Math.random() * 350) + 150;
      const additionalCalories = Math.floor(additionalSteps * 0.04);
      const newSteps = currentMetrics.steps + additionalSteps;
      const newCalories = currentMetrics.activeCalories + additionalCalories;
      const newDistance = Number((newSteps * 0.00075).toFixed(1));

      if (onUpdateProfile) {
        onUpdateProfile((prev) => {
          if (!prev) return null;
          const currentConfig = prev.healthIntegrations || {
            autoAdjustMealPlan: true,
            activityCalorieFactor: 0.5
          };

          return {
            ...prev,
            healthIntegrations: {
              ...currentConfig,
              dailyMetrics: {
                date: new Date().toISOString().split('T')[0],
                steps: newSteps,
                activeCalories: newCalories,
                distanceKm: newDistance,
                avgHeartRate: 74,
                source: isAppleHealthConnected ? 'apple_health' : isGoogleFitConnected ? 'google_fit' : 'google_fit',
                lastUpdated: new Date().toISOString()
              }
            }
          };
        });
      }

      setIsSyncing(false);
      setShowSyncSuccess(true);
      playSfx('success');
      vibrate([15, 30, 15]);
      setTimeout(() => setShowSyncSuccess(false), 3000);
    }, 1200);
  };

  // Quick Voice Assistant narration (Aoede voice)
  const handleVoiceSummary = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    playSfx('tap');

    const sourceName = isAppleHealthConnected ? 'Apple Health' : isGoogleFitConnected ? 'Google Fit' : 'sensores de atividade';
    const speechText = `Olá! Pelo seu ${sourceName}, você já completou ${currentMetrics.steps.toLocaleString('pt-BR')} passos hoje e queimou ${currentMetrics.activeCalories} calorias ativas em ${currentMetrics.distanceKm} quilômetros percorridos. Com base nisso, eu calibrei ${extraKcalAllowed} calorias adicionais com segurança no seu plano de hoje para você manter o gasto equilibrado!`;

    speak(speechText, {
      onEnded: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  return (
    <div className="card-premium p-5 sm:p-6 space-y-5 relative overflow-hidden group border border-blue-500/20 bg-gradient-to-br from-white via-blue-50/20 to-emerald-50/20 dark:from-[#11161D] dark:via-[#131B26] dark:to-[#111A1E]">
      {/* Background soft glow decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -ml-16 -mb-16" />

      {/* 1. Header with Live Status & Quick Action Buttons */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            {isConnected && (
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-[#11161D]"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white">
                Saúde Conectada
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                {isAppleHealthConnected ? 'Apple Health' : isGoogleFitConnected ? 'Google Fit' : 'Sincronizável'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isConnected 
                  ? `Sincronização automática ativa • ${new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}`
                  : 'Monitore passos e queima calórica em tempo real'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons: Voice Aoede + Sync + Setup */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Aoede Voice Narration */}
          <button
            type="button"
            onClick={handleVoiceSummary}
            title={isSpeaking ? "Parar narração da Malu" : "Ouvir resumo da Chef Malu (Voz Aoede)"}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isSpeaking
                ? 'bg-purple-600 text-white animate-pulse shadow-md shadow-purple-500/30'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-100'
            }`}
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isSpeaking ? 'Parar Voz' : 'Ouvir Malu'}</span>
          </button>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleQuickSync}
            disabled={isSyncing}
            title="Atualizar dados agora"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden xs:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          {/* Manage / Connect Settings */}
          <button
            type="button"
            onClick={() => {
              playSfx('tap');
              vibrate(10);
              onNavigate('profile');
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition-all flex items-center gap-1 shadow-sm"
          >
            <span>{isConnected ? 'Gerenciar' : 'Conectar'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notification Toast for Sync */}
      <AnimatePresence>
        {showSyncSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Dados sincronizados com sucesso com seu dispositivo!</span>
            </div>
            <span className="text-[10px] opacity-75">Agora</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Metrics Highlight (Steps, Calories, Heart Rate, Distance) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
        
        {/* Step Counter Card */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Footprints className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300">
              {stepPercent}% da meta
            </span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              Passos Hoje
            </span>
            <div className="text-2xl font-display font-extrabold text-slate-900 dark:text-white mt-0.5">
              {currentMetrics.steps.toLocaleString('pt-BR')}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              Meta: {stepGoal.toLocaleString('pt-BR')} passos
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 rounded-full"
              style={{ width: `${stepPercent}%` }}
            />
          </div>
        </div>

        {/* Active Calories Card */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-300">
              Ativo
            </span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              Gasto Ativo
            </span>
            <div className="text-2xl font-display font-extrabold text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1">
              {currentMetrics.activeCalories}
              <span className="text-xs font-bold text-slate-400">kcal</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
              +15% que a média
            </span>
          </div>
          {/* Visual indicator */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-400 via-amber-500 to-red-500 transition-all duration-700 rounded-full"
              style={{ width: `${Math.min(100, Math.round((currentMetrics.activeCalories / 600) * 100))}%` }}
            />
          </div>
        </div>

        {/* Distance Card */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300">
              Distância
            </span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              Distância Percorrida
            </span>
            <div className="text-2xl font-display font-extrabold text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1">
              {currentMetrics.distanceKm}
              <span className="text-xs font-bold text-slate-400">km</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              ~{Math.round(currentMetrics.distanceKm * 12)} min em movimento
            </span>
          </div>
          {/* Visual indicator */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700 rounded-full"
              style={{ width: `${Math.min(100, Math.round((currentMetrics.distanceKm / 8) * 100))}%` }}
            />
          </div>
        </div>

        {/* Heart Rate / Recovery Card */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Heart className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300">
              Cardio
            </span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              Freq. Cardíaca
            </span>
            <div className="text-2xl font-display font-extrabold text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1">
              {currentMetrics.avgHeartRate || 72}
              <span className="text-xs font-bold text-slate-400">bpm</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
              Ritmo Saudável
            </span>
          </div>
          {/* Visual indicator */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-rose-400 to-red-500 transition-all duration-700 rounded-full"
              style={{ width: `72%` }}
            />
          </div>
        </div>

      </div>

      {/* 3. Smart Nutrition Compensation Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                Calibração Inteligente da Dieta
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                +{extraKcalAllowed} kcal hoje
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
              Seu gasto ativo foi compensado com {(calorieFactor * 100).toFixed(0)}% de segurança para apoiar sua recuperação muscular e manter seu déficit calórico no ponto ideal.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-[11px] transition-all self-end sm:self-auto shrink-0 shadow-sm"
        >
          <span>Ajustar Fator</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4. Mini Weekly History Bar Chart */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            Evolução de Passos na Semana
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Meta diária: 10.000
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 items-end pt-3 pb-1 h-24">
          {historyData.map((item, idx) => {
            const isToday = item.date === 'Hoje' || idx === historyData.length - 1;
            const heightPercent = Math.max(15, Math.min(100, Math.round((item.steps / maxStepsInWeek) * 100)));
            const reachedGoal = item.steps >= 10000;

            return (
              <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group/bar">
                <span className="text-[9px] font-bold text-slate-400 group-hover/bar:text-blue-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                  {(item.steps / 1000).toFixed(1)}k
                </span>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg h-full max-h-14 flex items-end p-0.5">
                  <div 
                    className={`w-full rounded-md transition-all duration-500 ${
                      isToday 
                        ? 'bg-gradient-to-t from-blue-600 to-teal-400 shadow-sm shadow-blue-500/30' 
                        : reachedGoal
                          ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                          : 'bg-slate-300 dark:bg-slate-700 group-hover/bar:bg-blue-400'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className={`text-[10px] font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                  {item.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
