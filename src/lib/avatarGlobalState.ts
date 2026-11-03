import { useSyncExternalStore } from 'react';
import { UserProfile } from '../types';

export type AvatarGenderType = 'male' | 'female';
export type AvatarCameraViewType = 'front' | 'side' | 'detail' | 'back';
export type MuscleHighlightMode = 'all' | 'primary-only' | 'secondary-only' | 'none';

export type MicroExpressionType = 'none' | 'smile' | 'wink' | 'double_blink' | 'joy_nod' | 'eyebrow_raise' | 'celebrate';
export type SomatotypeType = 'ectomorph' | 'mesomorph' | 'endomorph';

export interface AvatarGlobalState {
  gender: AvatarGenderType;
  cameraView: AvatarCameraViewType;
  isPlaying: boolean;
  playbackSpeed: number;
  activeExerciseId: string;
  highlightedMuscles: string[];
  highlightMode: MuscleHighlightMode;
  hoveredMuscle: string | null;
  pulsingMuscle: string | null;
  heartRate: number;
  cycle: number;
  phase: 'concentric' | 'eccentric';
  breath: 'inhale' | 'exhale';
  positiveFeedback: boolean;
  motivationalSmile: number;
  isSpeaking: boolean;
  fatigueLevel: number;
  microExpressionType: MicroExpressionType;
  microExpressionIntensity: number;
  microExpressionTimestamp: number;
  // Morphing Corporal (Biotipo & Gordura)
  bodyFatPercentage: number;
  somatotype: SomatotypeType;
  heightCm: number;
  shoulderWaistRatio: number;
  // Outfit & Accessories Studio
  outfitTop: 'tank_top' | 'compression_shirt' | 'tshirt' | 'bare_chest';
  outfitBottom: 'shorts' | 'leggings' | 'jogger';
  outfitColor: string;
  accessories: {
    smartwatch: boolean;
    wristbands: boolean;
    liftingStraps: boolean;
  };
}

const STORAGE_GENDER_KEY = 'nutriai_avatar_gender_pref';
const STORAGE_BODYFAT_KEY = 'nutriai_avatar_bodyfat';
const STORAGE_SOMATOTYPE_KEY = 'nutriai_avatar_somatotype';
const STORAGE_HEIGHT_KEY = 'nutriai_avatar_height';
const STORAGE_SW_RATIO_KEY = 'nutriai_avatar_sw_ratio';

function getInitialGender(): AvatarGenderType {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_GENDER_KEY);
      if (stored === 'male' || stored === 'female') return stored;
      
      const profileStr = localStorage.getItem('nutri-profile');
      if (profileStr) {
        const p = JSON.parse(profileStr);
        const g = (p.gender || '').toLowerCase();
        if (g.includes('fem') || g.includes('mulher') || g === 'female' || g === 'f') {
          return 'female';
        }
      }
    } catch {
      // fallback
    }
  }
  return 'male';
}

function getInitialBodyFat(gender: AvatarGenderType): number {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_BODYFAT_KEY);
      if (stored) {
        const num = Number(stored);
        if (!isNaN(num) && num >= 5 && num <= 45) return num;
      }
    } catch {}
  }
  return gender === 'female' ? 20 : 14;
}

function getInitialSomatotype(): SomatotypeType {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_SOMATOTYPE_KEY) as SomatotypeType;
      if (stored === 'ectomorph' || stored === 'mesomorph' || stored === 'endomorph') return stored;
    } catch {}
  }
  return 'mesomorph';
}

function getInitialHeight(): number {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_HEIGHT_KEY);
      if (stored) {
        const num = Number(stored);
        if (!isNaN(num) && num >= 130 && num <= 220) return num;
      }
      const profileStr = localStorage.getItem('nutri-profile');
      if (profileStr) {
        const p = JSON.parse(profileStr);
        if (p.height && !isNaN(Number(p.height))) return Number(p.height);
      }
    } catch {}
  }
  return 175;
}

function getInitialSWRatio(): number {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_SW_RATIO_KEY);
      if (stored) {
        const num = Number(stored);
        if (!isNaN(num) && num >= 0.7 && num <= 1.8) return num;
      }
    } catch {}
  }
  return 1.2;
}

class AvatarGlobalStateStore {
  private initialGender = getInitialGender();
  private state: AvatarGlobalState = {
    gender: this.initialGender,
    cameraView: 'front',
    isPlaying: true,
    playbackSpeed: 1,
    activeExerciseId: 'seated-lateral-raises',
    highlightedMuscles: [],
    highlightMode: 'all',
    hoveredMuscle: null,
    pulsingMuscle: null,
    heartRate: 72,
    cycle: 0,
    phase: 'concentric',
    breath: 'exhale',
    positiveFeedback: false,
    motivationalSmile: 0,
    isSpeaking: false,
    fatigueLevel: 0,
    microExpressionType: 'none',
    microExpressionIntensity: 0,
    microExpressionTimestamp: 0,
    bodyFatPercentage: getInitialBodyFat(this.initialGender),
    somatotype: getInitialSomatotype(),
    heightCm: getInitialHeight(),
    shoulderWaistRatio: getInitialSWRatio(),
    outfitTop: 'tank_top',
    outfitBottom: 'shorts',
    outfitColor: '#10b981',
    accessories: {
      smartwatch: true,
      wristbands: false,
      liftingStraps: false
    }
  };

  private listeners = new Set<() => void>();

  public getSnapshot = (): AvatarGlobalState => {
    return this.state;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emitChange() {
    this.state = { ...this.state };
    this.listeners.forEach((listener) => listener());
  }

  public setHeartRate(bpm: number) {
    if (this.state.heartRate !== bpm) {
      this.state.heartRate = bpm;
      this.emitChange();
    }
  }

  public setGender(gender: AvatarGenderType | string) {
    const normalized: AvatarGenderType =
      gender.toLowerCase().includes('fem') ||
      gender.toLowerCase().includes('mulher') ||
      gender.toLowerCase() === 'f'
        ? 'female'
        : 'male';

    if (this.state.gender !== normalized) {
      this.state.gender = normalized;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_GENDER_KEY, normalized);
        } catch {
          // ignore
        }
      }
      this.emitChange();
    }
  }

  public toggleGender(): AvatarGenderType {
    const next = this.state.gender === 'male' ? 'female' : 'male';
    this.setGender(next);
    return next;
  }

  public syncWithUserProfile(profile?: UserProfile | null) {
    if (!profile) return;
    const g = (profile.gender || '').toLowerCase();
    if (g) {
      const norm: AvatarGenderType =
        g.includes('fem') || g.includes('mulher') || g === 'female' || g === 'f'
          ? 'female'
          : 'male';
      if (this.state.gender !== norm) {
        this.setGender(norm);
      }
    }
  }

  public setCameraView(view: AvatarCameraViewType) {
    if (this.state.cameraView !== view) {
      this.state.cameraView = view;
      this.emitChange();
    }
  }

  public setPlaying(isPlaying: boolean) {
    if (this.state.isPlaying !== isPlaying) {
      this.state.isPlaying = isPlaying;
      this.emitChange();
    }
  }

  public togglePlaying(): boolean {
    const next = !this.state.isPlaying;
    this.setPlaying(next);
    return next;
  }

  public setPlaybackSpeed(speed: number) {
    if (this.state.playbackSpeed !== speed) {
      this.state.playbackSpeed = speed;
      this.emitChange();
    }
  }

  public setActiveExerciseId(id: string) {
    if (this.state.activeExerciseId !== id) {
      this.state.activeExerciseId = id;
      this.emitChange();
    }
  }

  public setHighlightedMuscles(muscles: string[]) {
    this.state.highlightedMuscles = muscles;
    this.emitChange();
  }

  public setHighlightMode(mode: MuscleHighlightMode) {
    if (this.state.highlightMode !== mode) {
      this.state.highlightMode = mode;
      this.emitChange();
    }
  }

  public setHoveredMuscle(muscle: string | null) {
    if (this.state.hoveredMuscle !== muscle) {
      this.state.hoveredMuscle = muscle;
      this.emitChange();
    }
  }

  public setPulsingMuscle(muscle: string | null) {
    if (this.state.pulsingMuscle !== muscle) {
      this.state.pulsingMuscle = muscle;
      this.emitChange();
    }
  }

  public updateCycle(
    cycle: number,
    phase: 'concentric' | 'eccentric',
    breath: 'inhale' | 'exhale'
  ) {
    this.state.cycle = cycle;
    this.state.phase = phase;
    this.state.breath = breath;
    // Don't trigger full React re-render per frame for performance unless needed
  }

  public triggerMotivationalSmile(durationMs: number = 4200) {
    this.state.positiveFeedback = true;
    this.state.motivationalSmile = 1.0;
    this.emitChange();

    setTimeout(() => {
      this.state.positiveFeedback = false;
      this.state.motivationalSmile = 0.0;
      this.emitChange();
    }, durationMs);
  }

  public setPositiveFeedback(active: boolean) {
    if (this.state.positiveFeedback !== active) {
      this.state.positiveFeedback = active;
      this.state.motivationalSmile = active ? 1.0 : 0.0;
      this.emitChange();
    }
  }

  public setSpeaking(isSpeaking: boolean) {
    if (this.state.isSpeaking !== isSpeaking) {
      this.state.isSpeaking = isSpeaking;
      this.emitChange();
    }
  }

  public setFatigueLevel(level: number) {
    if (this.state.fatigueLevel !== level) {
      this.state.fatigueLevel = level;
      this.emitChange();
    }
  }

  public triggerMicroExpression(
    type: MicroExpressionType,
    durationMs: number = 3800,
    intensity: number = 1.0
  ) {
    this.state.microExpressionType = type;
    this.state.microExpressionIntensity = intensity;
    this.state.microExpressionTimestamp = Date.now();
    this.state.positiveFeedback = true;
    this.state.motivationalSmile = type === 'smile' || type === 'celebrate' || type === 'wink' ? 1.0 : 0.6;
    this.emitChange();

    setTimeout(() => {
      if (this.state.microExpressionTimestamp <= Date.now() - (durationMs - 150)) {
        this.state.microExpressionType = 'none';
        this.state.microExpressionIntensity = 0;
        this.state.positiveFeedback = false;
        this.state.motivationalSmile = 0.0;
        this.emitChange();
      }
    }, durationMs);
  }

  public setBodyFatPercentage(bf: number) {
    const clamped = Math.min(45, Math.max(5, Math.round(bf)));
    if (this.state.bodyFatPercentage !== clamped) {
      this.state.bodyFatPercentage = clamped;
      try {
        localStorage.setItem(STORAGE_BODYFAT_KEY, String(clamped));
      } catch {}
      this.emitChange();
    }
  }

  public setSomatotype(somatotype: SomatotypeType) {
    if (this.state.somatotype !== somatotype) {
      this.state.somatotype = somatotype;
      try {
        localStorage.setItem(STORAGE_SOMATOTYPE_KEY, somatotype);
      } catch {}
      this.emitChange();
    }
  }

  public setHeightCm(heightCm: number) {
    const clamped = Math.min(220, Math.max(130, Math.round(heightCm)));
    if (this.state.heightCm !== clamped) {
      this.state.heightCm = clamped;
      try {
        localStorage.setItem(STORAGE_HEIGHT_KEY, String(clamped));
      } catch {}
      this.emitChange();
    }
  }

  public setShoulderWaistRatio(swRatio: number) {
    const clamped = Math.min(1.8, Math.max(0.7, Number(swRatio.toFixed(2))));
    if (this.state.shoulderWaistRatio !== clamped) {
      this.state.shoulderWaistRatio = clamped;
      try {
        localStorage.setItem(STORAGE_SW_RATIO_KEY, String(clamped));
      } catch {}
      this.emitChange();
    }
  }

  public setOutfitTop(top: 'tank_top' | 'compression_shirt' | 'tshirt' | 'bare_chest') {
    if (this.state.outfitTop !== top) {
      this.state.outfitTop = top;
      this.emitChange();
    }
  }

  public setOutfitBottom(bottom: 'shorts' | 'leggings' | 'jogger') {
    if (this.state.outfitBottom !== bottom) {
      this.state.outfitBottom = bottom;
      this.emitChange();
    }
  }

  public setOutfitColor(color: string) {
    if (this.state.outfitColor !== color) {
      this.state.outfitColor = color;
      this.emitChange();
    }
  }

  public setAccessory(key: 'smartwatch' | 'wristbands' | 'liftingStraps', val: boolean) {
    if (this.state.accessories[key] !== val) {
      this.state.accessories = {
        ...this.state.accessories,
        [key]: val
      };
      this.emitChange();
    }
  }

  public resetBodyMorphing() {
    const defaultBf = this.state.gender === 'female' ? 20 : 14;
    const defaultSomato: SomatotypeType = 'mesomorph';
    const defaultHeight = 175;
    const defaultSw = 1.2;

    this.state.bodyFatPercentage = defaultBf;
    this.state.somatotype = defaultSomato;
    this.state.heightCm = defaultHeight;
    this.state.shoulderWaistRatio = defaultSw;

    try {
      localStorage.removeItem(STORAGE_BODYFAT_KEY);
      localStorage.removeItem(STORAGE_SOMATOTYPE_KEY);
      localStorage.removeItem(STORAGE_HEIGHT_KEY);
      localStorage.removeItem(STORAGE_SW_RATIO_KEY);
    } catch {}

    this.emitChange();
  }

  public triggerGamificationReaction(
    eventType: 'goal_completed' | 'level_up' | 'points_awarded' | 'badge_unlocked' | 'streak_milestone',
    options?: { durationMs?: number }
  ) {
    const duration = options?.durationMs || (eventType === 'level_up' ? 5500 : eventType === 'badge_unlocked' ? 4500 : 3800);
    const exprType: MicroExpressionType = 
      eventType === 'level_up' ? 'celebrate' :
      eventType === 'badge_unlocked' ? 'wink' :
      eventType === 'goal_completed' ? 'smile' : 'joy_nod';

    this.triggerMicroExpression(exprType, duration, 1.0);
  }
}

export const avatarGlobalStore = new AvatarGlobalStateStore();

export function useAvatarGlobalState(): AvatarGlobalState {
  return useSyncExternalStore(
    avatarGlobalStore.subscribe,
    avatarGlobalStore.getSnapshot,
    avatarGlobalStore.getSnapshot
  );
}

export default avatarGlobalStore;
