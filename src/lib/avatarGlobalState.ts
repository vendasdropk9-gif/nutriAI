import { useSyncExternalStore } from 'react';
import { UserProfile } from '../types';

export type AvatarGenderType = 'male' | 'female';
export type AvatarCameraViewType = 'front' | 'side' | 'detail' | 'back';
export type MuscleHighlightMode = 'all' | 'primary-only' | 'secondary-only' | 'none';

export type MicroExpressionType = 'none' | 'smile' | 'wink' | 'double_blink' | 'joy_nod' | 'eyebrow_raise' | 'celebrate';

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
}

const STORAGE_GENDER_KEY = 'nutriai_avatar_gender_pref';

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

class AvatarGlobalStateStore {
  private state: AvatarGlobalState = {
    gender: getInitialGender(),
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
    microExpressionTimestamp: 0
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
