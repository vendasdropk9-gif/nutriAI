import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Clock,
  Droplets,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
} from 'lucide-react';
import {
  UserProfile,
  WaterPushPhase,
  WaterPushScheduleConfig,
  WaterPushScheduleMode,
  WaterPushScheduleSlot,
} from '../types';
import {
  computeCircadianWaterSchedule,
  PHASE_LABELS,
  resolveWaterPushConfig,
  saveLocalWaterPushConfig,
} from '../lib/waterPushScheduler';
import { playSfx, vibrate } from '../lib/sensory';

interface WaterPushSchedulerPanelProps {
  profile: UserProfile | null;
  onUpdateConfig: (nextConfig: WaterPushScheduleConfig) => void;
  onTestWaterPush?: (previewSlot?: WaterPushScheduleSlot) => void;
  compact?: boolean;
}

const PHASE_BADGE_STYLES: Record<WaterPushPhase, string> = {
  morning_boost:
    'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  active_day:
    'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  evening_taper:
    'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
};

const PHASE_ICONS: Record<WaterPushPhase, React.ReactNode> = {
  morning_boost: <Sunrise className="w-3 h-3" />,
  active_day: <Sun className="w-3 h-3" />,
  evening_taper: <Sunset className="w-3 h-3" />,
};

export const WaterPushSchedulerPanel: React.FC<WaterPushSchedulerPanelProps> = ({
  profile,
  onUpdateConfig,
  onTestWaterPush,
  compact = false,
}) => {
  const [config, setConfig] = useState<WaterPushScheduleConfig>(() =>
    resolveWaterPushConfig(profile)
  );
  const [newCustomTime, setNewCustomTime] = useState<string>('11:00');

  useEffect(() => {
    setConfig(resolveWaterPushConfig(profile));
  }, [
    profile?.waterPushSchedule,
    profile?.hydrationRemindersEnabled,
    profile?.hydrationInterval,
    profile?.waterReminderEnabled,
    profile?.waterReminderIntervalMinutes,
    profile?.circadianNotificationConfig,
  ]);

  const applyUpdate = (patch: Partial<WaterPushScheduleConfig>) => {
    const next: WaterPushScheduleConfig = {
      ...config,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    setConfig(next);
    saveLocalWaterPushConfig(next);
    onUpdateConfig(next);
  };

  const previewProfile: UserProfile = useMemo(
    () => ({
      name: profile?.name || 'Usuário NutriAI',
      restrictions: profile?.restrictions || [],
      allergies: profile?.allergies || [],
      goals: profile?.goals || '',
      equipment: profile?.equipment || [],
      ...profile,
      waterPushSchedule: config,
      hydrationRemindersEnabled: config.enabled,
      waterReminderEnabled: config.enabled,
      hydrationInterval: String(config.intervalMinutes),
      waterReminderIntervalMinutes: config.intervalMinutes,
    }),
    [profile, config]
  );

  const schedulePreview = useMemo(
    () =>
      computeCircadianWaterSchedule(previewProfile, undefined, {
        includePreviewWhenDisabled: true,
      }),
    [previewProfile]
  );

  const handleAddCustomTime = () => {
    if (!newCustomTime || !/^\d{2}:\d{2}$/.test(newCustomTime)) return;
    if (config.customTimes.includes(newCustomTime)) return;
    playSfx('tap');
    vibrate(10);
    const updatedTimes = [...config.customTimes, newCustomTime].sort();
    applyUpdate({ customTimes: updatedTimes });
  };

  const handleRemoveCustomTime = (timeToRemove: string) => {
    playSfx('tap');
    vibrate(10);
    const updatedTimes = config.customTimes.filter((t) => t !== timeToRemove);
    applyUpdate({ customTimes: updatedTimes });
  };

  const containerBg = compact
    ? 'bg-slate-900/70 border-slate-700/80 text-white'
    : 'bg-sky-50/60 dark:bg-slate-900/50 border-sky-200/80 dark:border-slate-700/80';

  const inputBg = compact
    ? 'bg-slate-800 border-slate-700 text-white'
    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';

  const mutedText = compact
    ? 'text-slate-300'
    : 'text-slate-600 dark:text-slate-300';

  return (
    <div
      data-testid="water-push-scheduler-panel"
      className={`rounded-2xl border p-4 space-y-4 ${containerBg}`}
    >
      {/* Circadian Sync Header Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sunrise className="w-4 h-4 text-amber-500 shrink-0" />
            <h5
              className={`text-xs sm:text-sm font-bold ${
                compact ? 'text-white' : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              Sincronização com Ritmo Circadiano
            </h5>
          </div>
          <p className={`text-[11px] leading-relaxed ${mutedText}`}>
            Ajusta os lembretes de água conforme o nascer ({schedulePreview.solarWindow.sunrise}) e
            pôr do sol ({schedulePreview.solarWindow.sunset}) e seu cronotipo.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={config.circadianSyncEnabled}
          aria-label="Sincronizar lembretes de água com ritmo circadiano"
          onClick={() => {
            playSfx('tap');
            vibrate(12);
            applyUpdate({ circadianSyncEnabled: !config.circadianSyncEnabled });
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 ${
            config.circadianSyncEnabled
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25'
              : compact
              ? 'bg-slate-800 text-slate-300 border border-slate-700'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {config.circadianSyncEnabled ? 'Circadiano Ativo' : 'Ativar Sync Solar'}
          </span>
        </button>
      </div>

      {/* Mode Selector */}
      <div className="space-y-2">
        <span className={`block text-[11px] font-bold uppercase tracking-wider ${mutedText}`}>
          Modo de Agendamento Push
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(
            [
              {
                id: 'circadian_adaptive',
                label: 'Adaptativo Circadiano',
                desc: 'Pico diurno + leve à noite',
              },
              {
                id: 'interval',
                label: 'Intervalo Fixo',
                desc: 'Cadência constante',
              },
              {
                id: 'custom_times',
                label: 'Horários Customizados',
                desc: 'Alertas nos horários exatos',
              },
            ] as Array<{ id: WaterPushScheduleMode; label: string; desc: string }>
          ).map((modeOpt) => {
            const active = config.mode === modeOpt.id;
            return (
              <button
                key={modeOpt.id}
                type="button"
                onClick={() => {
                  playSfx('tap');
                  vibrate(10);
                  applyUpdate({ mode: modeOpt.id });
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-500/25'
                    : compact
                    ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-sky-500/50'
                    : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400'
                }`}
              >
                <div className="text-xs font-bold leading-tight">{modeOpt.label}</div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    active ? 'text-sky-100' : 'text-slate-400'
                  }`}
                >
                  {modeOpt.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode-specific Controls */}
      {config.mode === 'custom_times' ? (
        <div className="space-y-2.5">
          <label className={`block text-xs font-semibold ${mutedText}`}>
            Horários Personalizados para Beber Água
          </label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              aria-label="Novo horário personalizado de água"
              value={newCustomTime}
              onChange={(e) => setNewCustomTime(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500 ${inputBg}`}
            />
            <button
              type="button"
              onClick={handleAddCustomTime}
              className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Horário</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {config.customTimes.map((timeStr) => (
              <span
                key={timeStr}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${inputBg}`}
              >
                <Clock className="w-3 h-3 text-sky-500" />
                <span>{timeStr}</span>
                <button
                  type="button"
                  aria-label={`Remover horário ${timeStr}`}
                  onClick={() => handleRemoveCustomTime(timeStr)}
                  className="text-slate-400 hover:text-red-500 cursor-pointer ml-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className={`block text-[11px] font-semibold ${mutedText}`}>
              Intervalo Base
            </label>
            <select
              aria-label="Intervalo base dos lembretes de água"
              value={String(config.intervalMinutes)}
              onChange={(e) => applyUpdate({ intervalMinutes: Number(e.target.value) })}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer ${inputBg}`}
            >
              <option value="30">A cada 30 min</option>
              <option value="45">A cada 45 min</option>
              <option value="60">A cada 1 hora</option>
              <option value="90">A cada 1h30</option>
              <option value="120">A cada 2 horas</option>
              <option value="180">A cada 3 horas</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className={`block text-[11px] font-semibold ${mutedText}`}>
              Início da Janela
            </label>
            <input
              type="time"
              aria-label="Horário de início da janela de hidratação"
              value={config.startHour}
              onChange={(e) => applyUpdate({ startHour: e.target.value })}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500 ${inputBg}`}
            />
          </div>

          <div className="space-y-1">
            <label className={`block text-[11px] font-semibold ${mutedText}`}>
              Fim da Janela
            </label>
            <input
              type="time"
              aria-label="Horário de término da janela de hidratação"
              value={config.endHour}
              onChange={(e) => applyUpdate({ endHour: e.target.value })}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500 ${inputBg}`}
            />
          </div>
        </div>
      )}

      {/* Quiet Hours & Target ml */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="space-y-1">
          <label className={`block text-[11px] font-semibold ${mutedText}`}>
            Dose por Lembrete
          </label>
          <select
            aria-label="Volume sugerido por lembrete"
            value={String(config.targetSipMl || 250)}
            onChange={(e) => applyUpdate({ targetSipMl: Number(e.target.value) })}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer ${inputBg}`}
          >
            <option value="150">150 ml</option>
            <option value="200">200 ml</option>
            <option value="250">250 ml (1 copo)</option>
            <option value="300">300 ml</option>
            <option value="400">400 ml (Garrafa)</option>
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className={`text-[11px] font-semibold flex items-center gap-1 ${mutedText}`}>
              <Moon className="w-3 h-3 text-indigo-400" />
              Silêncio Noturno
            </label>
            <input
              type="checkbox"
              aria-label="Ativar modo silencioso noturno para água"
              checked={config.quietHoursEnabled}
              onChange={(e) => applyUpdate({ quietHoursEnabled: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="time"
              aria-label="Início do silêncio noturno"
              disabled={!config.quietHoursEnabled}
              value={config.quietHoursStart}
              onChange={(e) => applyUpdate({ quietHoursStart: e.target.value })}
              className={`w-full px-2 py-1.5 rounded-xl border text-[11px] font-bold disabled:opacity-40 ${inputBg}`}
            />
            <span className="text-[10px] text-slate-400">às</span>
            <input
              type="time"
              aria-label="Fim do silêncio noturno"
              disabled={!config.quietHoursEnabled}
              value={config.quietHoursEnd}
              onChange={(e) => applyUpdate({ quietHoursEnd: e.target.value })}
              className={`w-full px-2 py-1.5 rounded-xl border text-[11px] font-bold disabled:opacity-40 ${inputBg}`}
            />
          </div>
        </div>

        {config.circadianSyncEnabled && (
          <div className="space-y-1">
            <label className={`block text-[11px] font-semibold ${mutedText}`}>
              Offset Pós-Nascer (min)
            </label>
            <input
              type="number"
              min={0}
              max={180}
              aria-label="Minutos após nascer do sol para primeiro lembrete"
              value={config.sunriseOffsetMinutes}
              onChange={(e) =>
                applyUpdate({
                  sunriseOffsetMinutes: Math.max(0, Math.min(180, Number(e.target.value) || 0)),
                })
              }
              className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500 ${inputBg}`}
            />
          </div>
        )}
      </div>

      {/* Custom Notification Text */}
      {!compact && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className={`block text-[11px] font-semibold ${mutedText}`}>
              Título Customizado (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: 💧 Pausa de Hidratação • {phase}"
              value={config.customTitle || ''}
              onChange={(e) => applyUpdate({ customTitle: e.target.value })}
              className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-sky-500 ${inputBg}`}
            />
          </div>
          <div className="space-y-1">
            <label className={`block text-[11px] font-semibold ${mutedText}`}>
              Mensagem Customizada (use {'{ml}'} se desejar)
            </label>
            <input
              type="text"
              placeholder="Ex: Hora de beber {ml}ml para manter o foco!"
              value={config.customMessage || ''}
              onChange={(e) => applyUpdate({ customMessage: e.target.value })}
              className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-sky-500 ${inputBg}`}
            />
          </div>
        </div>
      )}

      {/* Scheduled Circadian Slots Preview */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`text-xs font-bold flex items-center gap-1.5 ${mutedText}`}>
            <BellRing className="w-3.5 h-3.5 text-sky-500" />
            <span>
              Cronograma Circadiano de Hoje ({schedulePreview.slots.length} push
              {schedulePreview.slots.length === 1 ? '' : 'es'})
            </span>
          </span>

          {onTestWaterPush && (
            <button
              type="button"
              onClick={() => onTestWaterPush(schedulePreview.slots[0])}
              className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Droplets className="w-3 h-3" />
              <span>Testar Push Circadiano</span>
            </button>
          )}
        </div>

        {schedulePreview.slots.length > 0 ? (
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
            {schedulePreview.slots.map((slot) => (
              <div
                key={slot.id}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] flex items-center gap-1.5 ${inputBg}`}
                title={`${slot.title} — ${slot.message}`}
              >
                <span className="font-mono font-bold">{slot.time}</span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${
                    PHASE_BADGE_STYLES[slot.phase]
                  }`}
                >
                  {PHASE_ICONS[slot.phase]}
                  <span>{PHASE_LABELS[slot.phase]}</span>
                </span>
                <span className="text-[10px] font-semibold text-sky-500">
                  {slot.targetMl}ml
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">
            Nenhum horário ativo fora do período de silêncio noturno.
          </p>
        )}
      </div>
    </div>
  );
};
