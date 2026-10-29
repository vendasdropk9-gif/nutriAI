import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, HealthIntegrationConfig } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface HealthSyncMetrics {
  steps: number;
  activeCalories: number;
  distanceKm: number;
  lastUpdated: string;
  source: 'device_sensors' | 'google_fit' | 'apple_health' | 'manual' | 'simulated';
}

export interface UseHealthDataSyncOptions {
  userProfile?: UserProfile | null;
  onProfileUpdate?: (updatedProfile: Partial<UserProfile>) => void;
  autoSyncIntervalMs?: number; // Default 30s
  stepGoal?: number; // Default 10000
}

export interface UseHealthDataSyncResult {
  steps: number;
  activeCalories: number;
  distanceKm: number;
  isSensorActive: boolean;
  isSyncing: boolean;
  hasSensorPermission: boolean | null;
  lastSyncedAt: string | null;
  error: string | null;
  sensorType: 'accelerometer' | 'pedometer' | 'simulated' | 'none';
  autoSync: boolean;
  requestSensorPermission: () => Promise<boolean>;
  startSensorTracking: () => void;
  stopSensorTracking: () => void;
  syncToUserProfile: (customSteps?: number) => Promise<void>;
  resetDailySteps: () => void;
  setAutoSync: (enabled: boolean) => void;
  addManualSteps: (additionalSteps: number) => void;
}

const STORAGE_KEY_STEPS = 'nutriai_pedometer_daily_steps';
const STORAGE_KEY_LAST_DATE = 'nutriai_pedometer_last_date';
const STORAGE_KEY_AUTO_SYNC = 'nutriai_pedometer_auto_sync';

export function useHealthDataSync(options: UseHealthDataSyncOptions = {}): UseHealthDataSyncResult {
  const { userProfile, onProfileUpdate, autoSyncIntervalMs = 30000 } = options;

  const getTodayISO = () => new Date().toISOString().split('T')[0];

  // Initialize steps state from localStorage or userProfile dailyMetrics
  const [steps, setSteps] = useState<number>(() => {
    try {
      const storedDate = localStorage.getItem(STORAGE_KEY_LAST_DATE);
      const today = getTodayISO();
      if (storedDate === today) {
        const storedSteps = localStorage.getItem(STORAGE_KEY_STEPS);
        if (storedSteps) return parseInt(storedSteps, 10) || 0;
      }
      if (userProfile?.healthIntegrations?.dailyMetrics?.date === today) {
        return userProfile.healthIntegrations.dailyMetrics.steps || 0;
      }
    } catch (e) {
      console.warn('Failed to load step count from localStorage:', e);
    }
    return 0;
  });

  const [isSensorActive, setIsSensorActive] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [hasSensorPermission, setHasSensorPermission] = useState<boolean | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    userProfile?.healthIntegrations?.dailyMetrics?.lastUpdated || null
  );
  const [error, setError] = useState<string | null>(null);
  const [sensorType, setSensorType] = useState<'accelerometer' | 'pedometer' | 'simulated' | 'none'>('none');
  const [autoSync, setAutoSyncState] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem(STORAGE_KEY_AUTO_SYNC);
      return val !== null ? val === 'true' : true;
    } catch (e) {
      return true;
    }
  });

  // Derived metrics
  const distanceKm = Number((steps * 0.00076).toFixed(2)); // ~0.76 meters per step
  const activeCalories = Math.round(steps * 0.042); // ~0.042 kcal per step

  // Refs for motion filtering & peak detection
  const lastAccelRef = useRef<{ x: number; y: number; z: number; time: number }>({ x: 0, y: 0, z: 0, time: 0 });
  const stepThresholdRef = useRef<number>(2.4); // Acceleration delta threshold in m/s²
  const minStepIntervalMsRef = useRef<number>(280); // Min time between steps to prevent double counting
  const lastStepTimeRef = useRef<number>(0);
  const syncTimerRef = useRef<any>(null);
  const simulationTimerRef = useRef<any>(null);

  // Persist steps & date to localStorage
  useEffect(() => {
    try {
      const today = getTodayISO();
      localStorage.setItem(STORAGE_KEY_STEPS, steps.toString());
      localStorage.setItem(STORAGE_KEY_LAST_DATE, today);
    } catch (e) {
      // Ignore quota error
    }
  }, [steps]);

  // Request motion sensor permissions (Required on iOS Safari 13+)
  const requestSensorPermission = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (typeof window === 'undefined') return false;

    const DeviceMotionEventTyped = window.DeviceMotionEvent as any;

    if (DeviceMotionEventTyped && typeof DeviceMotionEventTyped.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEventTyped.requestPermission();
        if (response === 'granted') {
          setHasSensorPermission(true);
          return true;
        } else {
          setHasSensorPermission(false);
          setError('Permissão de sensores do dispositivo foi negada.');
          return false;
        }
      } catch (err: any) {
        console.warn('Error requesting DeviceMotionEvent permission:', err);
        setError('Não foi possível obter permissão de sensores: ' + (err?.message || 'Erro desconhecido'));
        setHasSensorPermission(false);
        return false;
      }
    }

    // Default to true for standard Android/Browsers without explicit permission API
    if ('DeviceMotionEvent' in window || 'Sensor' in window) {
      setHasSensorPermission(true);
      return true;
    }

    setHasSensorPermission(false);
    setError('Este navegador não possui suporte direto a sensores de movimento.');
    return false;
  }, []);

  // Real-time Motion Acceleration Handler for step detection
  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    const accel = event.accelerationIncludingGravity || event.acceleration;
    if (!accel || accel.x === null || accel.y === null || accel.z === null) return;

    const now = Date.now();
    const x = accel.x || 0;
    const y = accel.y || 0;
    const z = accel.z || 0;

    // Calculate total acceleration magnitude minus gravity (~9.81 m/s²)
    const totalAccel = Math.sqrt(x * x + y * y + z * z);
    const deltaAccel = Math.abs(totalAccel - 9.81);

    // Peak detection with refractory period filter
    if (
      deltaAccel > stepThresholdRef.current &&
      now - lastStepTimeRef.current > minStepIntervalMsRef.current
    ) {
      lastStepTimeRef.current = now;
      setSteps((prev) => prev + 1);
    }

    lastAccelRef.current = { x, y, z, time: now };
  }, []);

  // Start active hardware sensor or fallback simulation
  const startSensorTracking = useCallback(async () => {
    setError(null);
    const hasPerm = hasSensorPermission ?? (await requestSensorPermission());

    if (hasPerm && typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
      setIsSensorActive(true);
      setSensorType('accelerometer');
      return;
    }

    // Fallback simulation mode for desktop or unsupported devices
    setSensorType('simulated');
    setIsSensorActive(true);
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);

    simulationTimerRef.current = setInterval(() => {
      // Simulate natural walking cadence (~1-3 steps per interval)
      const randomSteps = Math.floor(Math.random() * 3) + 1;
      setSteps((prev) => prev + randomSteps);
    }, 3000);
  }, [hasSensorPermission, requestSensorPermission, handleDeviceMotion]);

  // Stop tracking
  const stopSensorTracking = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    }
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsSensorActive(false);
  }, [handleDeviceMotion]);

  // Sync steps to user profile state & Firestore
  const syncToUserProfile = useCallback(
    async (customSteps?: number) => {
      const stepsToSync = customSteps !== undefined ? customSteps : steps;
      const today = getTodayISO();
      const updatedTimestamp = new Date().toISOString();

      setIsSyncing(true);
      setError(null);

      const calculatedKm = Number((stepsToSync * 0.00076).toFixed(2));
      const calculatedKcal = Math.round(stepsToSync * 0.042);

      const newDailyMetrics = {
        date: today,
        steps: stepsToSync,
        activeCalories: calculatedKcal,
        distanceKm: calculatedKm,
        source: (sensorType === 'simulated' ? 'manual' : 'device_sensors') as any,
        lastUpdated: updatedTimestamp,
      };

      // Prepare updated health integrations object
      const updatedHealthIntegrations: HealthIntegrationConfig = {
        ...(userProfile?.healthIntegrations || { autoAdjustMealPlan: true }),
        dailyMetrics: newDailyMetrics,
        history: [
          ...(userProfile?.healthIntegrations?.history || []).filter((h) => h.date !== today),
          {
            date: today,
            steps: stepsToSync,
            activeCalories: calculatedKcal,
            distanceKm: calculatedKm,
            adjustedCaloriesAdded: Math.round(calculatedKcal * 0.5),
            source: (sensorType === 'simulated' ? 'simulated' : 'device_sensors') as ('google_fit' | 'apple_health' | 'manual' | 'device_sensors' | 'simulated'),
          },
        ].slice(-30), // Keep 30 days history
      };

      // Update local state if handler provided
      if (onProfileUpdate) {
        onProfileUpdate({
          healthIntegrations: updatedHealthIntegrations,
        });
      }

      // Sync to Firestore if authenticated
      if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await setDoc(
            userRef,
            {
              healthIntegrations: updatedHealthIntegrations,
              updatedAt: updatedTimestamp,
            },
            { merge: true }
          );
        } catch (err: any) {
          console.warn('Firestore health data sync warning:', err);
          // Keep local sync functioning even if offline
        }
      }

      setLastSyncedAt(updatedTimestamp);
      setIsSyncing(false);
    },
    [steps, sensorType, userProfile, onProfileUpdate]
  );

  // Auto-sync interval
  useEffect(() => {
    if (autoSync && steps > 0) {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      syncTimerRef.current = setInterval(() => {
        syncToUserProfile();
      }, autoSyncIntervalMs);
    }
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [autoSync, steps, autoSyncIntervalMs, syncToUserProfile]);

  // Clean up sensors on unmount
  useEffect(() => {
    return () => {
      stopSensorTracking();
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [stopSensorTracking]);

  const setAutoSync = useCallback((enabled: boolean) => {
    setAutoSyncState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_AUTO_SYNC, enabled.toString());
    } catch (e) {}
  }, []);

  const resetDailySteps = useCallback(() => {
    setSteps(0);
    const today = getTodayISO();
    try {
      localStorage.setItem(STORAGE_KEY_STEPS, '0');
      localStorage.setItem(STORAGE_KEY_LAST_DATE, today);
    } catch (e) {}
  }, []);

  const addManualSteps = useCallback((additionalSteps: number) => {
    if (additionalSteps > 0) {
      setSteps((prev) => prev + additionalSteps);
    }
  }, []);

  return {
    steps,
    activeCalories,
    distanceKm,
    isSensorActive,
    isSyncing,
    hasSensorPermission,
    lastSyncedAt,
    error,
    sensorType,
    autoSync,
    requestSensorPermission,
    startSensorTracking,
    stopSensorTracking,
    syncToUserProfile,
    resetDailySteps,
    setAutoSync,
    addManualSteps,
  };
}
