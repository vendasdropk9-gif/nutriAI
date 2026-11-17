import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import {
  computeCircadianWaterSchedule,
  findDueWaterSlot,
  resolveSolarWindow,
  PHASE_LABELS,
} from '../lib/waterPushScheduler';
import {
  buildSchedulePayload,
  syncSchedulesToServiceWorker,
} from '../lib/pushScheduler';
import { useSolarCircadianNotification } from '../hooks/useSolarCircadianNotification';
import { WaterPushSchedulerPanel } from '../components/WaterPushSchedulerPanel';
import { UserProfile } from '../types';

vi.mock('../lib/sensory', () => ({
  playSfx: vi.fn(),
  vibrate: vi.fn(),
}));

const baseProfile: UserProfile = {
  name: 'Marina Costa',
  goals: 'Longevidade e hidratação',
  restrictions: [],
  allergies: [],
  equipment: [],
  chronotype: 'intermediate',
  circadianNotificationConfig: {
    enabled: true,
    intensityAdjustmentEnabled: true,
    reminderEnabled: true,
    goldenHourStart: '06:00',
    goldenHourEnd: '08:00',
  },
  waterPushSchedule: {
    enabled: true,
    circadianSyncEnabled: true,
    mode: 'circadian_adaptive',
    intervalMinutes: 90,
    customTimes: ['07:30', '12:00', '16:30'],
    startHour: '06:30',
    endHour: '21:30',
    sunriseOffsetMinutes: 20,
    sunsetTaperMinutes: 90,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00',
    targetSipMl: 250,
  },
};

describe('Customizable Circadian Water Intake Push Scheduler', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('computes circadian-aligned water push slots with morning boost, daytime peak, and evening taper', () => {
    const result = computeCircadianWaterSchedule(baseProfile, {
      sunrise: '06:00',
      sunset: '18:30',
      date: '2026-11-17',
      source: 'geolocation_api',
    });

    expect(result.solarWindow.sunrise).toBe('06:00');
    expect(result.solarWindow.sunset).toBe('18:30');
    expect(result.slots.length).toBeGreaterThanOrEqual(5);

    const morningSlot = result.slots[0];
    expect(morningSlot.time).toBe('06:30');
    expect(morningSlot.phase).toBe('morning_boost');
    expect(morningSlot.targetMl).toBe(300);

    expect(result.slots.some((s) => s.phase === 'active_day' && s.targetMl === 250)).toBe(true);
    expect(result.slots.some((s) => s.phase === 'evening_taper' && s.targetMl === 200)).toBe(true);
  });

  it('supports custom times, filters overnight quiet hours, and interpolates custom message templates', () => {
    const customProfile: UserProfile = {
      ...baseProfile,
      waterPushSchedule: {
        ...baseProfile.waterPushSchedule!,
        mode: 'custom_times',
        customTimes: ['05:30', '08:15', '14:30', '23:15'],
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '06:00',
        customTitle: '🥤 {phase} • Hidratação',
        customMessage: 'Tome {ml}ml agora!',
      },
    };

    const result = computeCircadianWaterSchedule(customProfile);
    const times = result.slots.map((s) => s.time);

    // 05:30 and 23:15 fall inside 22:00 - 06:00 quiet hours
    expect(times).toEqual(['08:15', '14:30']);
    expect(result.slots[0].title).toContain(PHASE_LABELS[result.slots[0].phase]);
    expect(result.slots[0].message).toContain(`${result.slots[0].targetMl}ml`);
  });

  it('resolves solar window fallback chain from circadian goldenHourStart and chronotype', () => {
    const profileNoApi: UserProfile = {
      ...baseProfile,
      circadianNotificationConfig: {
        enabled: true,
        intensityAdjustmentEnabled: true,
        reminderEnabled: true,
        goldenHourStart: '05:40',
      },
    };
    const fromConfig = resolveSolarWindow(profileNoApi, null, '2026-11-17');
    expect(fromConfig.source).toBe('circadian_config');
    expect(fromConfig.sunrise).toBe('05:40');

    const profileNight: UserProfile = {
      name: 'Lucas',
      restrictions: [],
      allergies: [],
      goals: 'Saúde',
      equipment: [],
      chronotype: 'night',
    };
    const fromChrono = resolveSolarWindow(profileNight, null, '2026-11-17');
    expect(fromChrono.source).toBe('chronotype_fallback');
    expect(fromChrono.sunrise).toBe('07:30');
  });

  it('detects due water slots and blocks duplicates via cooldown and notifiedSet', () => {
    const now = new Date(2026, 10, 17, 10, 31, 0); // 10:31 local
    const slots = [
      {
        id: 'water-1030-active_day',
        time: '10:30',
        phase: 'active_day' as const,
        title: 'Beber Água',
        message: '250ml agora',
        targetMl: 250,
      },
    ];
    const config = { ...baseProfile.waterPushSchedule! };

    const due = findDueWaterSlot(slots, config, now, new Set());
    expect(due?.id).toBe('water-1030-active_day');

    // Duplicate prevention via already notified set
    const notified = new Set(['2026-11-17-water-1030-active_day']);
    expect(findDueWaterSlot(slots, config, now, notified)).toBeNull();

    // Cooldown prevention via recent lastWaterPushAt
    const recentConfig = {
      ...config,
      lastWaterPushAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
    };
    expect(findDueWaterSlot(slots, recentConfig, now, new Set())).toBeNull();
  });

  it('builds and syncs waterSchedule payload to Service Worker and localStorage', async () => {
    const postMessageMock = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          active: { postMessage: postMessageMock },
        }),
      },
    });

    const payload = buildSchedulePayload(baseProfile);
    expect(payload.waterAlertsEnabled).toBe(true);
    expect(Array.isArray(payload.waterSchedule)).toBe(true);
    expect(payload.waterSchedule!.length).toBeGreaterThan(0);

    const synced = await syncSchedulesToServiceWorker(baseProfile);
    expect(synced).toBe(true);
    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SCHEDULE_NOTIFICATIONS',
        payload: expect.objectContaining({
          waterAlertsEnabled: true,
          waterSchedule: expect.any(Array),
        }),
      })
    );

    const persisted = JSON.parse(localStorage.getItem('nutri-notification-schedules') || '{}');
    expect(persisted.waterAlertsEnabled).toBe(true);
    expect(persisted.waterSchedule.length).toBeGreaterThan(0);
  });

  it('integrates sunrise geolocation check and due water push trigger inside useSolarCircadianNotification', async () => {
    const fakeNow = new Date(2026, 10, 17, 14, 0, 0); // 14:00 local
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);

    // Mock geolocation returning coordinates & sunrise/sunset API near 14:00?
    // Test sunrise near 14:00 UTC/local AND custom water slot at 14:00!
    const sunriseIso = fakeNow.toISOString();
    const sunsetDate = new Date(fakeNow.getTime() + 5 * 60 * 60 * 1000);

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: 'OK',
        results: {
          sunrise: sunriseIso,
          sunset: sunsetDate.toISOString(),
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          success({
            coords: { latitude: -23.55, longitude: -46.63 },
          } as GeolocationPosition);
        }),
      },
    });

    const showNotificationMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          active: { postMessage: vi.fn() },
          showNotification: showNotificationMock,
        }),
      },
    });

    vi.stubGlobal('Notification', {
      permission: 'granted',
    });

    const addNotification = vi.fn();
    let currentProfile: UserProfile | null = {
      ...baseProfile,
      waterPushSchedule: {
        ...baseProfile.waterPushSchedule!,
        mode: 'custom_times',
        customTimes: ['14:00'],
      },
    };
    const updateProfile = vi.fn((updater: (prev: UserProfile | null) => UserProfile | null) => {
      currentProfile = updater(currentProfile);
    });

    renderHook(() => useSolarCircadianNotification(currentProfile, addNotification, updateProfile));

    // Flush promises for fetch & SW sync
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // 1. Water custom push triggered for 14:00
    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'info',
        title: expect.stringContaining('Água'),
      })
    );

    // 2. Original sunrise notification preserved
    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Bom Dia Solar! ☀️',
      })
    );

    expect(showNotificationMock).toHaveBeenCalled();
    expect(currentProfile?.waterPushSchedule?.lastWaterPushAt).toBeTruthy();
    expect(currentProfile?.waterPushSchedule?.lastSolarWindow?.source).toBe('geolocation_api');

    vi.unstubAllGlobals();
  });

  it('renders WaterPushSchedulerPanel and lets users customize circadian sync and custom times', () => {
    const onUpdateConfig = vi.fn();
    const onTestWaterPush = vi.fn();

    render(
      <WaterPushSchedulerPanel
        profile={baseProfile}
        onUpdateConfig={onUpdateConfig}
        onTestWaterPush={onTestWaterPush}
      />
    );

    expect(screen.getByTestId('water-push-scheduler-panel')).toBeDefined();
    expect(screen.getByText(/Sincronização com Ritmo Circadiano/i)).toBeDefined();

    // Switch to custom times mode
    fireEvent.click(screen.getByText('Horários Customizados'));
    expect(onUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'custom_times',
      })
    );

    // Add custom time 19:45
    const timeInput = screen.getByLabelText('Novo horário personalizado de água') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '19:45' } });
    fireEvent.click(screen.getByText('Adicionar Horário'));

    expect(onUpdateConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customTimes: expect.arrayContaining(['19:45']),
      })
    );

    // Trigger test button
    fireEvent.click(screen.getByText('Testar Push Circadiano'));
    expect(onTestWaterPush).toHaveBeenCalled();
  });
});
