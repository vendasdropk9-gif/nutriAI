import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, Flame, Sparkles, Clock, Calendar, CheckCircle2, 
  Bell, BellOff, Volume2, AlertCircle, RefreshCw, Zap, ShieldCheck, HeartPulse
} from 'lucide-react';
import { UserProfile, WorkoutCategoryRemindersConfig, WorkoutCategoryType, WorkoutCategoryReminderSetting } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { playSfx, vibrate } from '../lib/sensory';
import { speak } from '../lib/speech';
import { safeGet, safeSet } from '../lib/storage';

interface WorkoutCategoryNotificationSettingsProps {
  profile: UserProfile | null;
  onSaveProfile?: (profile: UserProfile) => void;
  addNotification?: (notif: { title: string; message: string; type: any }) => void;
}

export const DEFAULT_WORKOUT_CATEGORY_REMINDERS: WorkoutCategoryRemindersConfig = {
  enabled: true,
  categories: {
    cardio: {
      enabled: true,
      leadTimeMinutes: 30,
      activeDays: ['tuesday', 'thursday', 'saturday'],
      time: '07:00'
    },
    forca: {
      enabled: true,
      leadTimeMinutes: 30,
      activeDays: ['monday', 'wednesday', 'friday'],
      time: '18:00'
    },
    flexibilidade: {
      enabled: true,
      leadTimeMinutes: 15,
      activeDays: ['sunday', 'wednesday', 'saturday'],
      time: '20:00'
    }
  }
};

const ALL_DAYS = [
  { key: 'sunday', label: 'Dom', fullName: 'Domingo' },
  { key: 'monday', label: 'Seg', fullName: 'Segunda-feira' },
  { key: 'tuesday', label: 'Ter', fullName: 'Terça-feira' },
  { key: 'wednesday', label: 'Qua', fullName: 'Quarta-feira' },
  { key: 'thursday', label: 'Qui', fullName: 'Quinta-feira' },
  { key: 'friday', label: 'Sex', fullName: 'Sexta-feira' },
  { key: 'saturday', label: 'Sáb', fullName: 'Sábado' },
];

const LEAD_TIME_OPTIONS = [
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 45, label: '45 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
];

export function WorkoutCategoryNotificationSettings({
  profile,
  onSaveProfile,
  addNotification
}: WorkoutCategoryNotificationSettingsProps) {
  const { language, t } = useLanguage();

  const [config, setConfig] = useState<WorkoutCategoryRemindersConfig>(() => {
    if (profile?.workoutCategoryReminders) {
      return profile.workoutCategoryReminders;
    }
    const stored = safeGet('nutriai_workout_category_reminders');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Error parsing stored workout category reminders:', e);
      }
    }
    return DEFAULT_WORKOUT_CATEGORY_REMINDERS;
  });

  const [testingCategory, setTestingCategory] = useState<WorkoutCategoryType | null>(null);

  // Sync state if profile changes externally
  useEffect(() => {
    if (profile?.workoutCategoryReminders) {
      setConfig(profile.workoutCategoryReminders);
    }
  }, [profile?.workoutCategoryReminders]);

  const saveConfig = (newConfig: WorkoutCategoryRemindersConfig) => {
    setConfig(newConfig);
    safeSet('nutriai_workout_category_reminders', JSON.stringify(newConfig));

    if (profile && onSaveProfile) {
      const updatedProfile: UserProfile = {
        ...profile,
        workoutCategoryReminders: newConfig,
        workoutRemindersEnabled: newConfig.enabled,
      };
      onSaveProfile(updatedProfile);
    }
  };

  const handleToggleMaster = () => {
    playSfx('tap');
    vibrate(20);
    const next = !config.enabled;
    const updated = { ...config, enabled: next };
    saveConfig(updated);

    if (addNotification) {
      addNotification({
        title: next ? '🔔 Lembretes por Categoria Ativados' : '🔕 Lembretes por Categoria Desativados',
        message: next 
          ? 'Notificações ativadas para Cardio, Força e Flexibilidade nos dias e tempos de antecedência escolhidos.'
          : 'Lembretes desativados temporariamente.',
        type: next ? 'success' : 'info'
      });
    }

    speak(
      language?.startsWith('pt')
        ? next ? "Lembretes por categoria de treino ativados no seu plano." : "Lembretes por categoria desativados."
        : next ? "Workout category reminders activated." : "Category reminders disabled.",
      { voice: 'Aoede', lang: language }
    );
  };

  const handleToggleCategory = (catKey: WorkoutCategoryType) => {
    playSfx('tap');
    vibrate(15);
    const updatedCategory = {
      ...config.categories[catKey],
      enabled: !config.categories[catKey].enabled
    };
    const updated = {
      ...config,
      categories: {
        ...config.categories,
        [catKey]: updatedCategory
      }
    };
    saveConfig(updated);
  };

  const handleLeadTimeChange = (catKey: WorkoutCategoryType, minutes: number) => {
    playSfx('tap');
    vibrate(10);
    const updated = {
      ...config,
      categories: {
        ...config.categories,
        [catKey]: {
          ...config.categories[catKey],
          leadTimeMinutes: minutes
        }
      }
    };
    saveConfig(updated);
  };

  const handleTimeChange = (catKey: WorkoutCategoryType, timeStr: string) => {
    const updated = {
      ...config,
      categories: {
        ...config.categories,
        [catKey]: {
          ...config.categories[catKey],
          time: timeStr
        }
      }
    };
    saveConfig(updated);
  };

  const handleToggleDay = (catKey: WorkoutCategoryType, dayKey: string) => {
    playSfx('tap');
    vibrate(10);
    const currentDays = config.categories[catKey].activeDays || [];
    const isSelected = currentDays.includes(dayKey);
    const nextDays = isSelected
      ? currentDays.filter(d => d !== dayKey)
      : [...currentDays, dayKey];

    const updated = {
      ...config,
      categories: {
        ...config.categories,
        [catKey]: {
          ...config.categories[catKey],
          activeDays: nextDays
        }
      }
    };
    saveConfig(updated);
  };

  const handleApplyPresetDays = (catKey: WorkoutCategoryType, preset: 'weekdays' | 'weekends' | 'all') => {
    playSfx('tap');
    vibrate(15);
    let days: string[] = [];
    if (preset === 'weekdays') days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    else if (preset === 'weekends') days = ['saturday', 'sunday'];
    else if (preset === 'all') days = ALL_DAYS.map(d => d.key);

    const updated = {
      ...config,
      categories: {
        ...config.categories,
        [catKey]: {
          ...config.categories[catKey],
          activeDays: days
        }
      }
    };
    saveConfig(updated);
  };

  const handleTestCategoryNotification = (catKey: WorkoutCategoryType) => {
    playSfx('crystal');
    vibrate([40, 60, 40]);
    setTestingCategory(catKey);

    const catSetting = config.categories[catKey];
    const catName = catKey === 'cardio' ? 'Cardio 🏃‍♂️' : catKey === 'forca' ? 'Força 🏋️‍♂️' : 'Flexibilidade 🧘‍♀️';
    const leadStr = catSetting.leadTimeMinutes >= 60 ? `${catSetting.leadTimeMinutes / 60} hora(s)` : `${catSetting.leadTimeMinutes} minutos`;

    if (addNotification) {
      addNotification({
        title: `🏋️ Teste Lembrete: ${catName}`,
        message: `Seu treino está programado para às ${catSetting.time || '18:00'} (Alerta emitido ${leadStr} antes). Mantenha o foco!`,
        type: 'success'
      });
    }

    const speechMessage = language?.startsWith('pt')
      ? `Teste de lembrete do Personal Trainer para treino de ${catKey === 'cardio' ? 'Cardio' : catKey === 'forca' ? 'Força' : 'Flexibilidade'}. Programado para às ${catSetting.time || '18:00'} com ${leadStr} de antecedência.`
      : `Workout reminder test for ${catKey}. Scheduled for ${catSetting.time || '18:00'} with ${leadStr} advance warning.`;

    speak(speechMessage, { voice: 'Aoede', lang: language });

    setTimeout(() => setTestingCategory(null), 3000);
  };

  const categoriesMetadata = [
    {
      key: 'cardio' as WorkoutCategoryType,
      title: 'Cardio & Endurance',
      emoji: '🏃‍♂️',
      desc: 'Corrida, Esteira, HIIT, Ciclismo, Pular Corda & Cardio funcional',
      bgColor: 'bg-amber-500/10 dark:bg-amber-950/20',
      borderColor: 'border-amber-500/30',
      activeBadge: 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30',
      btnColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20',
      icon: <Flame className="w-5 h-5 text-amber-500" />
    },
    {
      key: 'forca' as WorkoutCategoryType,
      title: 'Força & Hipertrofia',
      emoji: '🏋️‍♂️',
      desc: 'Musculação, Calistenia, Treino de Carga & Resistência Muscular',
      bgColor: 'bg-purple-500/10 dark:bg-purple-950/20',
      borderColor: 'border-purple-500/30',
      activeBadge: 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30',
      btnColor: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/20',
      icon: <Dumbbell className="w-5 h-5 text-purple-400" />
    },
    {
      key: 'flexibilidade' as WorkoutCategoryType,
      title: 'Flexibilidade & Mobilidade',
      emoji: '🧘‍♀️',
      desc: 'Yoga, Mobilidade Articular, Alongamentos, Pilates & Restauração',
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-950/20',
      borderColor: 'border-emerald-500/30',
      activeBadge: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
      btnColor: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20',
      icon: <Sparkles className="w-5 h-5 text-emerald-400" />
    }
  ];

  return (
    <div className="w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-7 rounded-[32px] shadow-lg space-y-6 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-700/80">
        <div className="flex items-center gap-3.5">
          <div className={`p-3.5 rounded-2xl transition-all ${
            config.enabled 
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30 animate-pulse' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 text-[10px] font-extrabold uppercase tracking-wider mb-1 border border-purple-500/30">
              <Dumbbell className="w-3 h-3" />
              <span>{t('personal_trainer_reminders', 'Personal Trainer • Alertas de Treino')}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Lembretes por Categoria de Treino
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
              Selecione quais tipos de treinos (Cardio, Força, Flexibilidade) do seu plano devem disparar lembretes, ajustando o tempo de antecedência e os dias da semana.
            </p>
          </div>
        </div>

        {/* Master Switch Button */}
        <button
          type="button"
          onClick={handleToggleMaster}
          className={`px-6 py-3 rounded-2xl font-extrabold text-xs sm:text-sm tracking-wide transition-all shadow-md cursor-pointer shrink-0 flex items-center justify-center gap-2 ${
            config.enabled
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/30'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          {config.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          <span>{config.enabled ? 'Notificações Ativas' : 'Ativar Lembretes de Treino'}</span>
        </button>
      </div>

      {/* Category Settings Cards List */}
      <div className="space-y-5">
        {categoriesMetadata.map((catMeta) => {
          const setting = config.categories[catMeta.key];
          const isCategoryActive = config.enabled && setting.enabled;

          return (
            <div
              key={catMeta.key}
              className={`p-5 rounded-2xl border transition-all space-y-4 ${
                isCategoryActive 
                  ? `${catMeta.bgColor} ${catMeta.borderColor} shadow-md`
                  : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800'
              }`}
            >
              {/* Category Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{catMeta.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {catMeta.title}
                      </h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                        setting.enabled ? catMeta.activeBadge : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}>
                        {setting.enabled ? 'Habilitado' : 'Desativado'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {catMeta.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Test notification button */}
                  <button
                    type="button"
                    onClick={() => handleTestCategoryNotification(catMeta.key)}
                    disabled={!setting.enabled || testingCategory === catMeta.key}
                    className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-sm transition-all cursor-pointer disabled:opacity-40"
                    title={`Testar som e notificação da categoria ${catMeta.title}`}
                  >
                    <Volume2 className={`w-4 h-4 ${testingCategory === catMeta.key ? 'text-emerald-400 animate-bounce' : 'text-slate-500 dark:text-slate-400'}`} />
                  </button>

                  {/* Toggle Category */}
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(catMeta.key)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      setting.enabled
                        ? 'bg-slate-800 hover:bg-slate-700 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {setting.enabled ? 'Desativar Categoria' : 'Ativar Categoria'}
                  </button>
                </div>
              </div>

              {/* Detailed Options Panel if Category is Active */}
              {setting.enabled && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                  
                  {/* Option 1: Tempo de Antecedência */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      Tempo de Antecedência do Lembrete:
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {LEAD_TIME_OPTIONS.map(opt => {
                        const isSelected = setting.leadTimeMinutes === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleLeadTimeChange(catMeta.key, opt.value)}
                            className={`px-3 py-2 rounded-xl text-xs font-extrabold border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
                                : 'bg-white/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Option 2: Horário e Dias da Semana */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        Dias Ativos & Horário Base:
                      </label>

                      {/* Time Input */}
                      <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-xl shadow-sm">
                        <span className="text-[10px] text-slate-400 font-bold">Horário:</span>
                        <input
                          type="time"
                          value={setting.time || '18:00'}
                          onChange={(e) => handleTimeChange(catMeta.key, e.target.value)}
                          className="bg-transparent font-mono font-bold text-xs text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    {/* Day Selection Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {ALL_DAYS.map(day => {
                        const isDaySelected = (setting.activeDays || []).includes(day.key);
                        return (
                          <button
                            key={day.key}
                            type="button"
                            onClick={() => handleToggleDay(catMeta.key, day.key)}
                            title={day.fullName}
                            className={`w-9 h-9 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer flex items-center justify-center ${
                              isDaySelected
                                ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20 scale-105'
                                : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Presets Bar */}
                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      <span className="text-slate-400 font-medium">Preencher:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyPresetDays(catMeta.key, 'weekdays')}
                        className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                      >
                        Dias Úteis (Seg-Sex)
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => handleApplyPresetDays(catMeta.key, 'weekends')}
                        className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                      >
                        Fim de Semana
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => handleApplyPresetDays(catMeta.key, 'all')}
                        className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                      >
                        Todos
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Sync Status Banner */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            Os horários e avisos por categoria estão sincronizados com o seu plano semanal do <strong>Personal Trainer</strong>.
          </span>
        </div>
        <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20 shrink-0">
          Sincronização Ativa ⚡
        </span>
      </div>

    </div>
  );
}
