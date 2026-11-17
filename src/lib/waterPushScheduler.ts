import {
  UserProfile,
  WaterPushPhase,
  WaterPushScheduleConfig,
  WaterPushScheduleSlot,
  WaterPushSolarWindow,
} from '../types';
import { safeGet, safeSet } from './storage';

export const WATER_PUSH_CONFIG_STORAGE_KEY = 'nutri-water-push-schedule-config';
export const SOLAR_WINDOW_STORAGE_KEY = 'nutri-solar-window-cache';

export const DEFAULT_WATER_PUSH_CONFIG: WaterPushScheduleConfig = {
  enabled: true,
  circadianSyncEnabled: true,
  mode: 'circadian_adaptive',
  intervalMinutes: 90,
  customTimes: ['07:30', '10:00', '12:30', '15:30', '18:00', '20:30'],
  startHour: '07:00',
  endHour: '21:30',
  sunriseOffsetMinutes: 20,
  sunsetTaperMinutes: 90,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:30',
  customTitle: '',
  customMessage: '',
  targetSipMl: 250,
};

export const PHASE_LABELS: Record<WaterPushPhase, string> = {
  morning_boost: 'Ativação Solar',
  active_day: 'Pico Metabólico Diurno',
  evening_taper: 'Desaceleração Noturna',
};

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseTimeToMinutes(timeStr?: string | null, fallbackMinutes: number = 420): number {
  if (!timeStr || typeof timeStr !== 'string') return fallbackMinutes;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallbackMinutes;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return fallbackMinutes;
  }
  return h * 60 + m;
}

export function minutesToTimeString(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatHourIntToTime(hour?: number, fallback: string = '07:00'): string {
  if (typeof hour !== 'number' || Number.isNaN(hour)) return fallback;
  const clamped = Math.max(0, Math.min(23, Math.floor(hour)));
  return `${String(clamped).padStart(2, '0')}:00`;
}

export function isMinutesInQuietHours(
  targetMinutes: number,
  quietStartStr: string,
  quietEndStr: string
): boolean {
  const qStart = parseTimeToMinutes(quietStartStr, 22 * 60);
  const qEnd = parseTimeToMinutes(quietEndStr, 6 * 60 + 30);
  const t = ((targetMinutes % 1440) + 1440) % 1440;

  if (qStart === qEnd) return false;
  if (qStart < qEnd) {
    return t >= qStart && t < qEnd;
  }
  // Overnight quiet window (e.g. 22:00 -> 06:30)
  return t >= qStart || t < qEnd;
}

export function loadLocalWaterPushConfig(): Partial<WaterPushScheduleConfig> | null {
  try {
    const raw = safeGet(WATER_PUSH_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLocalWaterPushConfig(config: WaterPushScheduleConfig): void {
  try {
    safeSet(WATER_PUSH_CONFIG_STORAGE_KEY, JSON.stringify(config));
    safeSet('nutri-hydration-reminders', String(config.enabled));
    safeSet('nutri-hydration-interval', String(config.intervalMinutes));
  } catch {
    // Graceful no-op when storage unavailable
  }
}

export function loadCachedSolarWindow(todayStr: string = getLocalDateString()): WaterPushSolarWindow | null {
  try {
    const raw = safeGet(SOLAR_WINDOW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WaterPushSolarWindow;
    if (parsed && parsed.date === todayStr && parsed.sunrise && parsed.sunset) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCachedSolarWindow(solarWindow: WaterPushSolarWindow): void {
  try {
    safeSet(SOLAR_WINDOW_STORAGE_KEY, JSON.stringify(solarWindow));
  } catch {
    // Graceful no-op
  }
}

export function resolveWaterPushConfig(profile: UserProfile | null): WaterPushScheduleConfig {
  const localConfig = loadLocalWaterPushConfig();
  const profileConfig = profile?.waterPushSchedule;

  const profileEnabled =
    profileConfig?.enabled ??
    (profile?.hydrationRemindersEnabled !== undefined
      ? Boolean(profile.hydrationRemindersEnabled)
      : profile?.waterReminderEnabled !== undefined
      ? Boolean(profile.waterReminderEnabled)
      : undefined);

  const localHydrationPref = safeGet('nutri-hydration-reminders');
  const resolvedEnabled =
    profileEnabled ??
    localConfig?.enabled ??
    (localHydrationPref !== null ? localHydrationPref !== 'false' : DEFAULT_WATER_PUSH_CONFIG.enabled);

  const rawInterval =
    profileConfig?.intervalMinutes ??
    (profile?.hydrationInterval ? Number(profile.hydrationInterval) : undefined) ??
    profile?.waterReminderIntervalMinutes ??
    localConfig?.intervalMinutes ??
    (safeGet('nutri-hydration-interval') ? Number(safeGet('nutri-hydration-interval')) : undefined) ??
    DEFAULT_WATER_PUSH_CONFIG.intervalMinutes;

  const intervalMinutes =
    Number.isFinite(rawInterval) && Number(rawInterval) >= 15 && Number(rawInterval) <= 360
      ? Math.round(Number(rawInterval))
      : DEFAULT_WATER_PUSH_CONFIG.intervalMinutes;

  const circadianSyncEnabled =
    profileConfig?.circadianSyncEnabled ??
    profile?.circadianNotificationConfig?.waterSyncEnabled ??
    localConfig?.circadianSyncEnabled ??
    (profile?.circadianNotificationConfig ? Boolean(profile.circadianNotificationConfig.enabled) : true);

  const startHour =
    profileConfig?.startHour ||
    (profile?.waterReminderStartHour !== undefined
      ? formatHourIntToTime(profile.waterReminderStartHour, DEFAULT_WATER_PUSH_CONFIG.startHour)
      : undefined) ||
    localConfig?.startHour ||
    DEFAULT_WATER_PUSH_CONFIG.startHour;

  const endHour =
    profileConfig?.endHour ||
    (profile?.waterReminderEndHour !== undefined
      ? formatHourIntToTime(profile.waterReminderEndHour, DEFAULT_WATER_PUSH_CONFIG.endHour)
      : undefined) ||
    localConfig?.endHour ||
    DEFAULT_WATER_PUSH_CONFIG.endHour;

  const customTimes =
    Array.isArray(profileConfig?.customTimes) && profileConfig.customTimes.length > 0
      ? profileConfig.customTimes
      : Array.isArray(localConfig?.customTimes) && localConfig.customTimes.length > 0
      ? localConfig.customTimes
      : DEFAULT_WATER_PUSH_CONFIG.customTimes;

  return {
    ...DEFAULT_WATER_PUSH_CONFIG,
    ...localConfig,
    ...profileConfig,
    enabled: resolvedEnabled,
    circadianSyncEnabled,
    intervalMinutes,
    startHour,
    endHour,
    customTimes: Array.from(new Set(customTimes)).sort(
      (a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b)
    ),
    targetSipMl:
      profileConfig?.targetSipMl ?? localConfig?.targetSipMl ?? DEFAULT_WATER_PUSH_CONFIG.targetSipMl,
    snoozeUntil: profileConfig?.snoozeUntil ?? localConfig?.snoozeUntil,
    snoozedMinutes: profileConfig?.snoozedMinutes ?? localConfig?.snoozedMinutes,
  };
}

export interface SolarResolveInput {
  sunrise?: Date | string;
  sunset?: Date | string;
  date?: string;
  source?: WaterPushSolarWindow['source'];
}

function toHHMMFromDateOrString(val?: Date | string): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return null;
    return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`;
  }
  if (/^\d{1,2}:\d{2}$/.test(val.trim())) {
    const mins = parseTimeToMinutes(val.trim());
    return minutesToTimeString(mins);
  }
  const parsed = new Date(val);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
}

export function resolveSolarWindow(
  profile: UserProfile | null,
  solarInput?: SolarResolveInput | null,
  todayStr: string = getLocalDateString()
): WaterPushSolarWindow & { sunriseMinutes: number; sunsetMinutes: number } {
  // 1. Explicit live API input
  const inputSunrise = toHHMMFromDateOrString(solarInput?.sunrise);
  const inputSunset = toHHMMFromDateOrString(solarInput?.sunset);
  if (inputSunrise && inputSunset) {
    const win: WaterPushSolarWindow = {
      date: solarInput?.date || todayStr,
      sunrise: inputSunrise,
      sunset: inputSunset,
      source: solarInput?.source || 'geolocation_api',
    };
    return {
      ...win,
      sunriseMinutes: parseTimeToMinutes(win.sunrise),
      sunsetMinutes: parseTimeToMinutes(win.sunset),
    };
  }

  // 2. Same-day solar window stored on profile or local cache
  const profileSolar = profile?.waterPushSchedule?.lastSolarWindow;
  if (profileSolar && profileSolar.date === todayStr && profileSolar.sunrise && profileSolar.sunset) {
    return {
      ...profileSolar,
      sunriseMinutes: parseTimeToMinutes(profileSolar.sunrise),
      sunsetMinutes: parseTimeToMinutes(profileSolar.sunset),
    };
  }

  const cached = loadCachedSolarWindow(todayStr);
  if (cached) {
    return {
      ...cached,
      sunriseMinutes: parseTimeToMinutes(cached.sunrise),
      sunsetMinutes: parseTimeToMinutes(cached.sunset),
    };
  }

  // 3. Circadian config Golden Hour baseline
  const goldenStart = profile?.circadianNotificationConfig?.goldenHourStart;
  if (goldenStart) {
    const sunriseMinutes = parseTimeToMinutes(goldenStart, 6 * 60);
    const sunsetMinutes = Math.min(20 * 60 + 30, sunriseMinutes + 12 * 60 + 15);
    return {
      date: todayStr,
      sunrise: minutesToTimeString(sunriseMinutes),
      sunset: minutesToTimeString(sunsetMinutes),
      source: 'circadian_config',
      sunriseMinutes,
      sunsetMinutes,
    };
  }

  // 4. Chronotype fallback
  const chronotype = profile?.chronotype || 'intermediate';
  const chronoMap: Record<string, { sunrise: string; sunset: string }> = {
    morning: { sunrise: '05:45', sunset: '17:45' },
    intermediate: { sunrise: '06:30', sunset: '18:30' },
    night: { sunrise: '07:30', sunset: '19:30' },
  };
  const chosen = chronoMap[chronotype] || chronoMap.intermediate;
  return {
    date: todayStr,
    sunrise: chosen.sunrise,
    sunset: chosen.sunset,
    source: 'chronotype_fallback',
    sunriseMinutes: parseTimeToMinutes(chosen.sunrise),
    sunsetMinutes: parseTimeToMinutes(chosen.sunset),
  };
}

function classifyCircadianPhase(
  minutes: number,
  sunriseMinutes: number,
  sunsetMinutes: number,
  sunriseOffsetMinutes: number,
  sunsetTaperMinutes: number
): WaterPushPhase {
  const morningEnd = sunriseMinutes + Math.max(60, sunriseOffsetMinutes + 90);
  const eveningStart = sunsetMinutes - Math.max(30, sunsetTaperMinutes);

  if (minutes <= morningEnd) return 'morning_boost';
  if (minutes >= eveningStart) return 'evening_taper';
  return 'active_day';
}

function buildSlotCopy(
  phase: WaterPushPhase,
  targetMl: number,
  solarWindow: WaterPushSolarWindow,
  config: WaterPushScheduleConfig
): { title: string; message: string } {
  const applyTokens = (template: string) =>
    template
      .replace(/\{ml\}/g, String(targetMl))
      .replace(/\{phase\}/g, PHASE_LABELS[phase])
      .replace(/\{sunrise\}/g, solarWindow.sunrise)
      .replace(/\{sunset\}/g, solarWindow.sunset);

  if (config.customTitle?.trim() || config.customMessage?.trim()) {
    const title = config.customTitle?.trim()
      ? applyTokens(config.customTitle.trim())
      : `💧 ${PHASE_LABELS[phase]} • Hora da Água`;
    const message = config.customMessage?.trim()
      ? applyTokens(config.customMessage.trim())
      : `Beba cerca de ${targetMl}ml agora para manter seu ritmo biológico hidratado.`;
    return { title, message };
  }

  if (phase === 'morning_boost') {
    return {
      title: '☀️ Despertar Solar & Hidratação',
      message: `Após o nascer do sol (${solarWindow.sunrise}), reponha ${targetMl}ml de água para ativar seu metabolismo e foco.`,
    };
  }
  if (phase === 'evening_taper') {
    return {
      title: '🌅 Hidratação Suave Pré-Sono',
      message: `Entardecer sincronizado (${solarWindow.sunset}). Tome ${targetMl}ml em pequenos goles para hidratar sem interromper o sono.`,
    };
  }
  return {
    title: '💧 Lembrete Circadiano de Água',
    message: `Mantenha o pico de energia diurna: hora de beber ${targetMl}ml de água fresca.`,
  };
}

export interface ComputeScheduleOptions {
  includePreviewWhenDisabled?: boolean;
  todayStr?: string;
}

export function computeCircadianWaterSchedule(
  profile: UserProfile | null,
  solarInput?: SolarResolveInput | null,
  options: ComputeScheduleOptions = {}
): {
  config: WaterPushScheduleConfig;
  solarWindow: WaterPushSolarWindow & { sunriseMinutes: number; sunsetMinutes: number };
  slots: WaterPushScheduleSlot[];
} {
  const config = resolveWaterPushConfig(profile);
  const todayStr = options.todayStr || getLocalDateString();
  const solarWindow = resolveSolarWindow(profile, solarInput, todayStr);

  if (!config.enabled && !options.includePreviewWhenDisabled) {
    return { config, solarWindow, slots: [] };
  }

  const baseSipMl = Math.max(100, Math.min(600, Number(config.targetSipMl || 250)));
  const startMin = parseTimeToMinutes(config.startHour, 7 * 60);
  const endMin = Math.max(startMin + 60, parseTimeToMinutes(config.endHour, 21 * 60 + 30));
  const interval = Math.max(20, Math.min(360, Number(config.intervalMinutes || 90)));

  const candidateMinutes: number[] = [];

  if (config.mode === 'custom_times') {
    for (const timeStr of config.customTimes) {
      const m = parseTimeToMinutes(timeStr, -1);
      if (m >= 0) candidateMinutes.push(m);
    }
  } else if (config.mode === 'interval' || !config.circadianSyncEnabled) {
    for (let t = startMin; t <= endMin; t += interval) {
      candidateMinutes.push(t);
    }
  } else {
    // 'circadian_adaptive' with circadianSyncEnabled === true
    const morningTrigger = Math.max(
      startMin,
      Math.min(endMin - 60, solarWindow.sunriseMinutes + Math.max(0, config.sunriseOffsetMinutes))
    );
    candidateMinutes.push(morningTrigger);

    const eveningStart = solarWindow.sunsetMinutes - Math.max(30, config.sunsetTaperMinutes);
    let cursor = morningTrigger;

    while (cursor < endMin) {
      let step = interval;

      // Solar mid-day metabolic peak (11:00 - 15:30): slightly tighter cadence
      if (cursor >= 11 * 60 && cursor <= 15 * 60 + 30) {
        step = Math.max(30, Math.round(interval * 0.85));
      } else if (cursor >= eveningStart) {
        // Evening taper near sunset: wider, gentler intervals before sleep
        step = Math.max(interval, Math.round(interval * 1.35));
      }

      cursor += step;
      if (cursor <= endMin) {
        candidateMinutes.push(cursor);
      }
    }
  }

  const uniqueSortedMinutes = Array.from(new Set(candidateMinutes)).sort((a, b) => a - b);

  const slots: WaterPushScheduleSlot[] = [];
  for (const mins of uniqueSortedMinutes) {
    if (
      config.quietHoursEnabled &&
      isMinutesInQuietHours(mins, config.quietHoursStart, config.quietHoursEnd)
    ) {
      continue;
    }

    const phase: WaterPushPhase = config.circadianSyncEnabled
      ? classifyCircadianPhase(
          mins,
          solarWindow.sunriseMinutes,
          solarWindow.sunsetMinutes,
          config.sunriseOffsetMinutes,
          config.sunsetTaperMinutes
        )
      : 'active_day';

    const targetMl =
      phase === 'morning_boost'
        ? Math.min(500, baseSipMl + 50)
        : phase === 'evening_taper'
        ? Math.max(150, baseSipMl - 50)
        : baseSipMl;

    const time = minutesToTimeString(mins);
    const { title, message } = buildSlotCopy(phase, targetMl, solarWindow, config);

    slots.push({
      id: `water-${time.replace(':', '')}-${phase}`,
      time,
      phase,
      title,
      message,
      targetMl,
    });
  }

  return { config, solarWindow, slots };
}

export function findDueWaterSlot(
  slots: WaterPushScheduleSlot[],
  config: WaterPushScheduleConfig,
  now: Date = new Date(),
  notifiedSlotIds?: Set<string>
): WaterPushScheduleSlot | null {
  if (!config.enabled || slots.length === 0) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (
    config.quietHoursEnabled &&
    isMinutesInQuietHours(nowMinutes, config.quietHoursStart, config.quietHoursEnd)
  ) {
    return null;
  }

  // Snooze suppression: if user snoozed the reminder, don't trigger until snoozeUntil passes
  if (config.snoozeUntil) {
    const snoozeMs = new Date(config.snoozeUntil).getTime();
    if (!Number.isNaN(snoozeMs) && snoozeMs > now.getTime()) {
      return null;
    }
  }

  // Cooldown check against lastWaterPushAt to prevent double fires within same trigger window
  if (config.lastWaterPushAt) {
    const lastMs = new Date(config.lastWaterPushAt).getTime();
    if (!Number.isNaN(lastMs)) {
      const elapsedMins = (now.getTime() - lastMs) / 60000;
      const minCooldown = config.mode === 'custom_times' ? 5 : Math.max(15, config.intervalMinutes * 0.65);
      if (elapsedMins >= 0 && elapsedMins < minCooldown) {
        return null;
      }
    }
  }

  const todayStr = getLocalDateString(now);

  for (const slot of slots) {
    const slotMinutes = parseTimeToMinutes(slot.time, -1);
    if (slotMinutes < 0) continue;

    const diff = nowMinutes - slotMinutes;
    if (diff >= 0 && diff <= 2) {
      const dedupeKey = `${todayStr}-${slot.id}`;
      if (notifiedSlotIds?.has(dedupeKey)) {
        continue;
      }
      return slot;
    }
  }

  return null;
}

export function getNextWaterReminderSlot(
  slots: WaterPushScheduleSlot[],
  config: WaterPushScheduleConfig,
  now: Date = new Date()
): { slot: WaterPushScheduleSlot | null; timeStr: string; isSnoozed: boolean; snoozeMinutesLeft: number } {
  const isSnoozed = Boolean(
    config.snoozeUntil && new Date(config.snoozeUntil).getTime() > now.getTime()
  );

  let snoozeMinutesLeft = 0;
  let effectiveTimeStr = '';

  if (isSnoozed && config.snoozeUntil) {
    const snoozeDate = new Date(config.snoozeUntil);
    snoozeMinutesLeft = Math.max(1, Math.round((snoozeDate.getTime() - now.getTime()) / 60000));
    const h = String(snoozeDate.getHours()).padStart(2, '0');
    const m = String(snoozeDate.getMinutes()).padStart(2, '0');
    effectiveTimeStr = `${h}:${m}`;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = slots.find((s) => parseTimeToMinutes(s.time) > nowMinutes);
  const nextSlot = upcoming || slots[0] || null;

  if (!effectiveTimeStr && nextSlot) {
    effectiveTimeStr = nextSlot.time;
  }

  return {
    slot: nextSlot,
    timeStr: effectiveTimeStr || '09:00',
    isSnoozed,
    snoozeMinutesLeft,
  };
}

export function snoozeWaterReminder(
  profile: UserProfile | null,
  minutes: 15 | 30
): { nextConfig: WaterPushScheduleConfig; snoozeDate: Date; snoozeTimeStr: string } {
  const currentConfig = resolveWaterPushConfig(profile);
  const now = new Date();
  const snoozeDate = new Date(now.getTime() + minutes * 60 * 1000);
  const hours = String(snoozeDate.getHours()).padStart(2, '0');
  const mins = String(snoozeDate.getMinutes()).padStart(2, '0');
  const snoozeTimeStr = `${hours}:${mins}`;

  const nextConfig: WaterPushScheduleConfig = {
    ...currentConfig,
    snoozeUntil: snoozeDate.toISOString(),
    snoozedMinutes: minutes,
    updatedAt: now.toISOString(),
  };

  saveLocalWaterPushConfig(nextConfig);
  return { nextConfig, snoozeDate, snoozeTimeStr };
}

export function cancelWaterReminderSnooze(
  profile: UserProfile | null
): WaterPushScheduleConfig {
  const currentConfig = resolveWaterPushConfig(profile);
  const nextConfig: WaterPushScheduleConfig = {
    ...currentConfig,
    snoozeUntil: undefined,
    snoozedMinutes: undefined,
    updatedAt: new Date().toISOString(),
  };

  saveLocalWaterPushConfig(nextConfig);
  return nextConfig;
}
