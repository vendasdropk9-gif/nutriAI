import { useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import {
  computeCircadianWaterSchedule,
  findDueWaterSlot,
  getLocalDateString,
  loadCachedSolarWindow,
  resolveWaterPushConfig,
  saveCachedSolarWindow,
  saveLocalWaterPushConfig,
  SolarResolveInput,
} from '../lib/waterPushScheduler';
import {
  syncSchedulesToServiceWorker,
  triggerWaterIntakePushNotification,
} from '../lib/pushScheduler';

export const useSolarCircadianNotification = (
  profile: UserProfile | null,
  addNotification: (notif: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' | 'point' }) => void,
  updateProfile: (updater: (prev: UserProfile | null) => UserProfile | null) => void
) => {
  const notifiedWaterSlotsRef = useRef<Set<string>>(new Set());
  const solarFetchDateRef = useRef<string | null>(null);
  const solarResultRef = useRef<SolarResolveInput | null>(null);
  const lastSwSyncSignatureRef = useRef<string>('');

  const profileRef = useRef<UserProfile | null>(profile);
  profileRef.current = profile;

  const waterConfig = resolveWaterPushConfig(profile);
  const isSolarEnabled = Boolean(profile?.circadianNotificationConfig?.enabled);
  const isWaterCircadianActive = Boolean(waterConfig.enabled);

  // 1. Ciclo Solar (Nascer / Pôr do Sol via Geolocation API + Sincronização Circadiana)
  useEffect(() => {
    if (!isSolarEnabled && !(isWaterCircadianActive && waterConfig.circadianSyncEnabled)) {
      return;
    }

    const checkSolarCircadian = async () => {
      const currentProfile = profileRef.current;
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const localToday = getLocalDateString(now);

      // Reutiliza janela solar já buscada hoje em cache local para evitar chamadas repetitivas à API
      if (solarFetchDateRef.current === localToday && solarResultRef.current) {
        if (isSolarEnabled && solarResultRef.current.sunrise) {
          const sunrise = new Date(solarResultRef.current.sunrise);
          const diffMinutes = Math.abs(now.getTime() - sunrise.getTime()) / (1000 * 60);
          if (diffMinutes < 30 && currentProfile?.circadianNotificationConfig?.lastNotifiedDate !== today) {
            triggerSunriseGreeting(today);
          }
        }
        return;
      }

      const cachedWindow = loadCachedSolarWindow(localToday);
      if (cachedWindow && cachedWindow.source === 'geolocation_api') {
        solarFetchDateRef.current = localToday;
        solarResultRef.current = {
          sunrise: cachedWindow.sunrise,
          sunset: cachedWindow.sunset,
          date: localToday,
          source: 'geolocation_api',
        };
      }

      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`
            );
            const data = await response.json();
            if (data.status === 'OK' && data.results?.sunrise) {
              const sunrise = new Date(data.results.sunrise);
              const sunset = data.results.sunset ? new Date(data.results.sunset) : undefined;
              const liveNow = new Date();
              const liveToday = liveNow.toISOString().split('T')[0];
              const liveLocalToday = getLocalDateString(liveNow);

              const sunriseHHMM = `${String(sunrise.getHours()).padStart(2, '0')}:${String(sunrise.getMinutes()).padStart(2, '0')}`;
              const sunsetHHMM = sunset
                ? `${String(sunset.getHours()).padStart(2, '0')}:${String(sunset.getMinutes()).padStart(2, '0')}`
                : '18:30';

              solarFetchDateRef.current = liveLocalToday;
              solarResultRef.current = {
                sunrise: data.results.sunrise,
                sunset: data.results.sunset,
                date: liveLocalToday,
                source: 'geolocation_api',
              };

              const solarWindow = {
                date: liveLocalToday,
                sunrise: sunriseHHMM,
                sunset: sunsetHHMM,
                source: 'geolocation_api' as const,
              };
              saveCachedSolarWindow(solarWindow);

              // Atualiza lastSolarWindow no perfil caso ainda não esteja sincronizado hoje
              const latestProfile = profileRef.current;
              const existingWindow = latestProfile?.waterPushSchedule?.lastSolarWindow;
              if (
                latestProfile &&
                (existingWindow?.date !== liveLocalToday ||
                  existingWindow?.sunrise !== sunriseHHMM ||
                  existingWindow?.sunset !== sunsetHHMM)
              ) {
                const resolvedWater = resolveWaterPushConfig(latestProfile);
                const nextWaterConfig = {
                  ...resolvedWater,
                  lastSolarWindow: solarWindow,
                  updatedAt: new Date().toISOString(),
                };
                saveLocalWaterPushConfig(nextWaterConfig);
                updateProfile((prev) =>
                  prev
                    ? {
                        ...prev,
                        waterPushSchedule: nextWaterConfig,
                      }
                    : null
                );
              }

              // Dispara saudação solar matinal original caso esteja dentro da janela de 30 minutos do nascer do sol
              if (latestProfile?.circadianNotificationConfig?.enabled) {
                const diffMinutes = Math.abs(liveNow.getTime() - sunrise.getTime()) / (1000 * 60);
                if (diffMinutes < 30) {
                  if (latestProfile.circadianNotificationConfig?.lastNotifiedDate === liveToday) {
                    return;
                  }
                  triggerSunriseGreeting(liveToday);
                }
              }
            }
          } catch (error) {
            console.error('Failed to fetch sun times:', error);
          }
        },
        () => {
          // Geolocation negada/indisponível: scheduler usa fallback de Golden Hour / Cronotipo
        }
      );
    };

    const triggerSunriseGreeting = (todayIso: string) => {
      addNotification({
        title: 'Bom Dia Solar! ☀️',
        message: 'Seu ciclo circadiano está começando. Ajustando a iluminação para um despertar produtivo.',
        type: 'info',
      });

      updateProfile((prev) =>
        prev
          ? {
              ...prev,
              circadianNotificationConfig: {
                ...(prev.circadianNotificationConfig || {
                  enabled: true,
                  intensityAdjustmentEnabled: true,
                  reminderEnabled: true,
                }),
                lastNotifiedDate: todayIso,
              },
            }
          : null
      );

      if (profileRef.current?.circadianNotificationConfig?.intensityAdjustmentEnabled !== false) {
        document.documentElement.style.setProperty('--app-brightness', '1.1');
        setTimeout(() => {
          document.documentElement.style.setProperty('--app-brightness', '1.0');
        }, 5000);
      }
    };

    const interval = setInterval(checkSolarCircadian, 60000 * 15);
    checkSolarCircadian();

    return () => clearInterval(interval);
  }, [
    isSolarEnabled,
    isWaterCircadianActive,
    waterConfig.circadianSyncEnabled,
    addNotification,
    updateProfile,
  ]);

  // 2. Sincronização de Agendamentos de Hidratação Circadiana com o Service Worker & Disparo no Prazo
  useEffect(() => {
    if (!profile) return;

    const computed = computeCircadianWaterSchedule(profile, solarResultRef.current);
    const syncSignature = JSON.stringify({
      enabled: computed.config.enabled,
      circadianSyncEnabled: computed.config.circadianSyncEnabled,
      mode: computed.config.mode,
      intervalMinutes: computed.config.intervalMinutes,
      customTimes: computed.config.customTimes,
      startHour: computed.config.startHour,
      endHour: computed.config.endHour,
      quietHoursEnabled: computed.config.quietHoursEnabled,
      quietHoursStart: computed.config.quietHoursStart,
      quietHoursEnd: computed.config.quietHoursEnd,
      sunriseOffsetMinutes: computed.config.sunriseOffsetMinutes,
      sunsetTaperMinutes: computed.config.sunsetTaperMinutes,
      customTitle: computed.config.customTitle,
      customMessage: computed.config.customMessage,
      targetSipMl: computed.config.targetSipMl,
      solar: `${computed.solarWindow.sunrise}-${computed.solarWindow.sunset}`,
    });

    if (lastSwSyncSignatureRef.current !== syncSignature) {
      lastSwSyncSignatureRef.current = syncSignature;
      syncSchedulesToServiceWorker(profile).catch((err) => {
        console.warn('[useSolarCircadianNotification] Erro ao sincronizar agenda de água com SW:', err);
      });
    }

    if (!computed.config.enabled) return;

    const evaluateWaterSchedule = () => {
      const latestProfile = profileRef.current;
      if (!latestProfile) return;

      const now = new Date();
      const todayStr = getLocalDateString(now);
      const { config, slots } = computeCircadianWaterSchedule(latestProfile, solarResultRef.current, {
        todayStr,
      });

      const dueSlot = findDueWaterSlot(slots, config, now, notifiedWaterSlotsRef.current);
      if (!dueSlot) return;

      const dedupeKey = `${todayStr}-${dueSlot.id}`;
      notifiedWaterSlotsRef.current.add(dedupeKey);

      addNotification({
        title: dueSlot.title,
        message: dueSlot.message,
        type: 'info',
      });

      triggerWaterIntakePushNotification(
        dueSlot.title,
        dueSlot.message,
        dueSlot.targetMl,
        dueSlot.phase,
        dedupeKey
      ).catch(() => {});

      const pushedAt = now.toISOString();
      const updatedWaterConfig = {
        ...config,
        lastWaterPushAt: pushedAt,
        updatedAt: pushedAt,
      };
      saveLocalWaterPushConfig(updatedWaterConfig);

      updateProfile((prev) =>
        prev
          ? {
              ...prev,
              waterPushSchedule: updatedWaterConfig,
            }
          : null
      );
    };

    evaluateWaterSchedule();
    const waterTimer = setInterval(evaluateWaterSchedule, 60000);

    return () => clearInterval(waterTimer);
  }, [
    profile?.hydrationRemindersEnabled,
    profile?.hydrationInterval,
    profile?.waterReminderEnabled,
    profile?.waterReminderIntervalMinutes,
    profile?.waterReminderStartHour,
    profile?.waterReminderEndHour,
    profile?.circadianNotificationConfig,
    profile?.chronotype,
    profile?.waterPushSchedule,
    addNotification,
    updateProfile,
  ]);
};
