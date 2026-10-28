import React, { Component, createRef, Suspense, useMemo, useRef, useEffect, useState } from 'react';
import { useSpring } from 'react-spring';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { ContactShadows, PerspectiveCamera, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader, DRACOLoader } from 'three-stdlib';
import {
  createSculptedHeadGeometry,
  createSculptedNeckGeometry,
  createSculptedTorsoCoreGeometry,
  createSculptedTrapeziusGeometry,
  createSculptedClaviclesGeometry,
  createSculptedPectoralGeometry,
  createSculptedAbdominalWallGeometry,
  createSculptedSerratusObliquesGeometry,
  createSculptedDeltoidGeometry,
  createSculptedBicepGeometry,
  createSculptedTricepGeometry,
  createSculptedForearmGeometry,
  createSculptedHandGeometry,
  createSculptedQuadricepsGeometry,
  createSculptedHamstringsGeometry,
  createSculptedPatellaGeometry,
  createSculptedCalfGeometry,
  createSculptedFootGeometry,
  createSculptedShortsGeometry,
  createSculptedGluteGeometry,
  getOptimalAvatarLOD,
  isMobileOrLowPowerDevice,
} from './AnatomicalSculptor';
import {
  Play,
  Pause,
  User,
  Sparkles,
  Zap,
  Activity,
  Eye,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  DetailedExercise,
  EXERCISE_DATABASE,
  MuscleGroupCategory,
  getExerciseById
} from '../data/exerciseDatabase';
import {
  avatarGlobalStore,
  AvatarGenderType,
  AvatarCameraViewType,
  MuscleHighlightMode,
} from '../lib/avatarGlobalState';
import { playSfx, vibrate } from '../lib/sensory';

// Helper function to validate muscle raycast intersections
function validateMuscleRaycast(raycaster: THREE.Raycaster, objects: THREE.Object3D[], muscleList: string[]): THREE.Intersection[] {
  const intersects = raycaster.intersectObjects(objects, true);
  return intersects.filter((hit) => {
    // Assuming muscleTag is attached to userData of the object
    const muscleTag = (hit.object as any).userData?.muscleTag;
    return muscleTag && muscleList.includes(muscleTag);
  });
}

// Validate if a hit belongs to primary muscles
function validatePrimaryMuscleIntersection(raycaster: THREE.Raycaster, objects: THREE.Object3D[], primaryMuscles: string[]): boolean {
  return validateMuscleRaycast(raycaster, objects, primaryMuscles).length > 0;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AvatarGender = 'male' | 'female' | 'masculino' | 'feminino';
export type { MuscleHighlightMode };

export interface MuscleHighlightSequenceStep {
  /** Target muscle identifier or name */
  muscle: string;
  /** Duration to highlight this muscle in milliseconds */
  durationMs: number;
  /** Intensity multiplier (0.0 to 1.0) */
  intensity?: number;
}

export interface AvatarAnatomicoRef {
  /** Start exercise biomechanical animation */
  play: () => void;
  /** Pause exercise biomechanical animation */
  pause: () => void;
  /** Toggle between play and pause */
  togglePlay: () => void;
  /** Set playback speed (e.g. 0.5, 1.0, 1.5) */
  setPlaybackSpeed: (speed: number) => void;
  /** Change active camera angle */
  setCameraView: (view: 'front' | 'side' | 'detail' | 'back') => void;
  /** Set anatomical gender variant ('masculino' | 'feminino' | 'male' | 'female') */
  setGender: (gender: AvatarGender) => void;
  /** Toggle between male and female models */
  toggleGender: () => void;
  /** Set interactive hover highlight on a specific muscle */
  setMuscleHover: (muscle: string | null) => void;
  /** Set pulsing highlight state on a specific muscle */
  setMusclePulse: (muscle: string | null, isPulsing?: boolean) => void;
  /** Dynamically highlight one or multiple muscle groups */
  highlightMuscles: (muscles: string[]) => void;
  /** Clear dynamic muscle overrides */
  clearHighlights: () => void;
  /** Execute a timed sequence of muscle activations */
  triggerMuscleSequence: (steps: MuscleHighlightSequenceStep[]) => void;
  /** Trigger a single animation cycle demonstration */
  triggerAnimationCycle: (exerciseId?: string) => void;
  /** Play and set active animation by name or exercise ID */
  playAnimation: (name: string) => void;
  /** Set active animation cycle */
  setAnimation: (animationName: string) => void;
  /** Change the active exercise demonstration */
  setExercise: (exercise: DetailedExercise | string) => void;
  /** Set muscle highlight mode: 'all' | 'primary-only' | 'secondary-only' | 'none' */
  setHighlightMode: (mode: MuscleHighlightMode) => void;
  /** Highlight only primary muscles in red/orange */
  highlightPrimaryOnly: () => void;
  /** Highlight only secondary synergist muscles in amber/orange */
  highlightSecondaryOnly: () => void;
  /** Highlight all active muscles (both primary and secondary) */
  highlightAll: () => void;
  /** Dynamically set primary and secondary highlight colors (e.g. from exercise catalog) */
  setHighlightColors: (primary?: string, secondary?: string) => void;
  /** Dynamically set primary highlight color (crimson / red neon) */
  setHighlightColorPrimary: (color: string) => void;
  /** Dynamically set secondary highlight color (electric orange / amber) */
  setHighlightColorSecondary: (color: string) => void;
  /** Dynamically calculate contrast ratio between muscle highlight colors and avatar skin texture */
  getContrastRatio: (
    type?: 'primary' | 'secondary',
    options?: LightingContrastOptions
  ) => ContrastRatioResult;
  /** Helper that checks if current highlight colors ensure readability against the avatar skin texture in all lighting conditions */
  ensureReadableContrast: (
    type?: 'primary' | 'secondary',
    options?: LightingContrastOptions
  ) => boolean;
  /** Load and overlay muscle data directly from exercise catalog by ID, exercise object, or custom muscle data */
  loadExerciseMuscleData: (exerciseOrId: string | DetailedExercise | ExerciseMuscleData) => void;
  /** Set biomechanical target muscles and synergists dynamically with optional custom highlight colors */
  setBiomechanicalMuscles: (
    primary: string[],
    secondary?: string[],
    colors?: { primary?: string; secondary?: string }
  ) => void;
  /** Get current biomechanical overlay status with resolved muscle regions and active colors */
  getBiomechanicalOverlayStatus: () => {
    exerciseName: string;
    exerciseId: string;
    primaryMuscles: string[];
    secondaryMuscles: string[];
    highlightColorPrimary: string;
    highlightColorSecondary: string;
    activeShaderMuscles: {
      primary: string[];
      secondary: string[];
    };
  };
  /** Get current visualizer state snapshot */
  getCurrentState: () => {
    gender: 'male' | 'female';
    isPlaying: boolean;
    playbackSpeed: number;
    cameraView: 'front' | 'side' | 'detail' | 'back';
    exerciseId: string;
    primaryMuscles: string[];
    secondaryMuscles: string[];
    highlightedMuscles: string[];
    highlightMode: MuscleHighlightMode;
    highlightColorPrimary?: string;
    highlightColorSecondary?: string;
    hoveredMuscle: string | null;
    pulsingMuscle: string | null;
    contrastRatioPrimary?: number;
    contrastRatioSecondary?: number;
    contrastPrimaryReadable?: boolean;
    contrastSecondaryReadable?: boolean;
  };
  /** Validate consistency between highlighted muscles and selected exercise animation effort */
  validateMuscleConsistency: () => {
    isConsistent: boolean;
    discrepancies: string[];
    expectedPrimary: string[];
    actualPrimary: string[];
    expectedSecondary: string[];
    actualSecondary: string[];
  };
}

export interface ExerciseMuscleData {
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  category?: MuscleGroupCategory;
  categoryLabel?: string;
  highlightColorPrimary?: string;
  highlightColorSecondary?: string;
  exerciseName?: string;
  exerciseId?: string;
}

export interface AvatarAnatomicoProps {
  /** User profile to automatically detect gender ('male' | 'female') and preferences */
  profile?: UserProfile | null;
  /** Explicit gender override ('male' | 'female' | 'masculino' | 'feminino'). If omitted, automatically derived from profile / global state */
  gender?: AvatarGender;
  /** Optional custom 3D model URL to load via useGLTF */
  modelUrl?: string;
  /** Optional explicit male 3D model URL */
  maleModelUrl?: string;
  /** Optional explicit female 3D model URL */
  femaleModelUrl?: string;
  /** Optional explicit animation asset identifier */
  animationAsset?: string;
  /** Full exercise object or exercise ID */
  exercise?: DetailedExercise | string;
  /** Exercise ID fallback if exercise prop is not passed */
  exerciseId?: string;
  /** Explicit muscle data from exercise catalog to dynamically overlay biomechanical highlights */
  muscleData?: ExerciseMuscleData;
  /** Custom mapping dictionary mapping exercise IDs or names to their primary and secondary muscles */
  muscleMap?: Record<string, { primaryMuscles: string[]; secondaryMuscles?: string[] }>;
  /** Catalog exercise reference (by object or ID string) */
  catalogExercise?: DetailedExercise | string;
  /** Active camera viewpoint */
  cameraView?: 'front' | 'side' | 'detail' | 'back';
  /** Allow tactile/mouse 360° orbit rotation */
  enableOrbitControls?: boolean;
  /** Whether the biomechanical animation is active */
  isPlaying?: boolean;
  /** Playback speed multiplier (e.g. 0.5, 1, 1.5) */
  playbackSpeed?: number;
  /** User exercise pace / cadence multiplier (e.g. 0.5, 1.0, 1.5, 2.0). Directly scales pulse animation speed and intensity */
  exercisePace?: number;
  /** Horizontal mirror flip for alternate perspective */
  isMirrorMode?: boolean;
  /** Highlight mode: 'all' (default), 'primary-only' (isolate primary muscles in red/orange), 'secondary-only' (isolate synergists in amber/orange), or 'none' */
  highlightMode?: MuscleHighlightMode;
  /** Custom dynamic highlight color for primary muscles (e.g. '#ff0033') */
  highlightColorPrimary?: string;
  /** Custom dynamic uniform highlight color for primary muscles (e.g. '#ff0033') */
  uHighlightColorPrimary?: string;
  /** Custom dynamic highlight color for secondary muscles (e.g. '#ff6a00') */
  highlightColorSecondary?: string;
  /** Custom dynamic uniform highlight color for secondary muscles (e.g. '#ff6a00') */
  uHighlightColorSecondary?: string;
  /** Highlight specific muscle tag or name */
  highlightMuscleOverride?: string | null;
  /** Alias for highlightMuscleOverride */
  highlightOverride?: string | null;
  /** Primary muscles to highlight (defaults to exercise.primaryMuscles) */
  primaryMuscles?: string[];
  /** Secondary muscles to highlight (defaults to exercise.secondaryMuscles) */
  secondaryMuscles?: string[];
  /** Interactive callback when hovering over an anatomical muscle group */
  onMuscleHover?: (muscle: string | null) => void;
  /** Interactive callback when clicking an anatomical muscle group */
  onMuscleClick?: (muscle: string) => void;
  /** Callback fired on each animation frame with cycle phase and breathing rhythm */
  onCycleUpdate?: (cycle: number, phase: 'concentric' | 'eccentric', breath: 'inhale' | 'exhale') => void;
  /** Optional container class name */
  className?: string;
  /** Show top muscle focus carousel and bottom-left video pill button (matches reference image) */
  showReferenceControls?: boolean;
  /** Show subtle overlay controls badge (toggle gender, camera angles, muscle modes) */
  showOverlayBadges?: boolean;
  /** Optional real-time heart rate from wearable devices or health platform APIs (Apple Health, Google Fit) */
  realtimeHeartRate?: number;
  /** Source of heart rate data ('bluetooth' | 'apple-health' | 'google-fit' | 'simulated' | 'profile') */
  heartRateSource?: string;
  /** Allow interactive manual toggle of gender variant */
  onGenderChange?: (newGender: 'male' | 'female') => void;
  /** Callback when user toggles play/pause from video pill */
  onTogglePlay?: (playing: boolean) => void;
  /** Positive feedback state to trigger warm motivational smile blend shapes */
  positiveFeedback?: boolean;
  /** Motivational smile blend shape intensity (0.0 to 1.0) */
  motivationalSmile?: number;
  /** Performance rendering optimization: 'auto' (detects mobile/low-end), 'high' (ultra 68k tris), or 'eco_mobile' (optimized 17k tris) */
  performanceMode?: 'auto' | 'high' | 'eco_mobile';
  /** Callback when user changes performance rendering mode */
  onPerformanceModeChange?: (mode: 'high' | 'eco_mobile') => void;
  /** Whether to show a toggle badge for Eco Mobile / High Fidelity mode */
  showPerformanceBadge?: boolean;
}

interface AvatarAnatomicoState {
  gender: 'male' | 'female';
  cameraView: 'front' | 'side' | 'detail' | 'back';
  isPlaying: boolean;
  playbackSpeed: number;
  exercise: DetailedExercise;
  highlightedMuscles: string[];
  highlightMode: MuscleHighlightMode;
  highlightColorPrimary?: string;
  highlightColorSecondary?: string;
  hoveredMuscle: string | null;
  pulsingMuscle: string | null;
  activeTargetIndex: number;
  webglAvailable: boolean;
  performanceMode: 'auto' | 'high' | 'eco_mobile';
  isZoomedLOD: boolean;
  cameraDistance: number;
}

// ============================================================================
// HELPER: GENDER NORMALIZER
// ============================================================================
function normalizeGender(g?: string): 'male' | 'female' {
  if (!g) return 'male';
  const lower = g.toLowerCase().trim();
  if (lower.includes('fem') || lower.includes('mulher') || lower === 'f' || lower === 'female') {
    return 'female';
  }
  return 'male';
}

// ============================================================================
// 3D CAMERA RIG
// ============================================================================
function CameraRig({
  cameraView,
  category,
  enableOrbitControls
}: {
  cameraView: 'front' | 'side' | 'detail' | 'back';
  category: string;
  enableOrbitControls?: boolean;
}) {
  const { camera } = useThree();
  const currentLookAt = useRef(new THREE.Vector3(0, 0.85, 0));

  const target = useMemo(() => {
    if (cameraView === 'back') {
      return {
        pos: [0, 1.15, -3.2] as [number, number, number],
        lookAt: [0, 0.85, 0] as [number, number, number],
        fov: 38,
      };
    }
    if (cameraView === 'side') {
      return {
        pos: [3.2, 0.85, 0.2] as [number, number, number],
        lookAt: [0, 0.85, 0] as [number, number, number],
        fov: 38,
      };
    }
    if (cameraView === 'detail') {
      if (category === 'shoulders') {
        return {
          pos: [0, 1.25, 1.55] as [number, number, number],
          lookAt: [0, 1.18, 0] as [number, number, number],
          fov: 30,
        };
      }
      if (category === 'chest') {
        return {
          pos: [0, 1.15, 1.55] as [number, number, number],
          lookAt: [0, 1.08, 0] as [number, number, number],
          fov: 30,
        };
      }
      if (category === 'biceps' || category === 'triceps') {
        return {
          pos: [0.65, 1.05, 1.5] as [number, number, number],
          lookAt: [0.25, 0.95, 0] as [number, number, number],
          fov: 30,
        };
      }
      if (category === 'legs' || category === 'glutes') {
        return {
          pos: [0, 0.45, 1.75] as [number, number, number],
          lookAt: [0, 0.45, 0] as [number, number, number],
          fov: 30,
        };
      }
      if (category === 'back') {
        return {
          pos: [0, 1.2, -1.75] as [number, number, number],
          lookAt: [0, 1.1, 0] as [number, number, number],
          fov: 30,
        };
      }
      return {
        pos: [0, 1.1, 1.65] as [number, number, number],
        lookAt: [0, 0.95, 0] as [number, number, number],
        fov: 30,
      };
    }
    // Front view default matching reference image
    return {
      pos: [0, 0.85, 3.4] as [number, number, number],
      lookAt: [0, 0.85, 0] as [number, number, number],
      fov: 38,
    };
  }, [cameraView, category]);

  const [{ pos, lookAt, fov }, api] = useSpring(() => ({
    pos: target.pos,
    lookAt: target.lookAt,
    fov: target.fov,
    config: { tension: 110, friction: 28, mass: 1 },
  }));

  useEffect(() => {
    api.start({
      pos: target.pos,
      lookAt: target.lookAt,
      fov: target.fov,
      immediate: false,
    });
  }, [target, api]);

  useFrame(() => {
    if (!enableOrbitControls && pos.get && lookAt.get && fov.get) {
      const p = pos.get();
      const l = lookAt.get();
      const f = fov.get();
      camera.position.set(p[0], p[1], p[2]);
      currentLookAt.current.set(l[0], l[1], l[2]);
      camera.lookAt(currentLookAt.current);
      if ('fov' in camera && typeof (camera as any).fov === 'number') {
        (camera as any).fov = f;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}

// ============================================================================
// DYNAMIC CAMERA DISTANCE MONITOR FOR AUTOMATIC LOD SWAPPING
// ============================================================================
function DynamicLODCameraMonitor({
  onLODUpdate,
  cameraView,
}: {
  onLODUpdate: (isZoomed: boolean, distance: number) => void;
  cameraView?: string;
}) {
  const { camera } = useThree();
  const lastState = useRef<{ isZoomed: boolean | null; dist: number }>({ isZoomed: null, dist: 3.4 });

  useFrame(() => {
    const target = new THREE.Vector3(0, 0.85, 0);
    const dist = camera.position.distanceTo(target);
    // When camera distance is close (< 2.25) or explicitly in 'detail' view, activate high-fidelity zoomed LOD
    const isZoomed = dist < 2.25 || cameraView === 'detail';

    if (lastState.current.isZoomed !== isZoomed || Math.abs(lastState.current.dist - dist) > 0.2) {
      lastState.current = { isZoomed, dist };
      onLODUpdate(isZoomed, dist);
    }
  });

  return null;
}

// ============================================================================
// GYM ENVIRONMENT & EQUIPMENT PROPS
// ============================================================================

function StudioGymPlatform() {
  const matMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a2230',
    roughness: 0.85,
    metalness: 0.1,
  }), []);

  return (
    <group position={[0, -0.32, 0]}>
      {/* Rectangular training mat exactly matching reference screenshots */}
      <mesh material={matMat} position={[0, -0.01, 0]} receiveShadow>
        <boxGeometry args={[1.65, 0.02, 1.85]} />
      </mesh>
    </group>
  );
}

function GymBench({ position = 'seated' }: { position: string }) {
  const metalMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#090d16',
    roughness: 0.35,
    metalness: 0.85,
  }), []);

  const leatherMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#10141f',
    roughness: 0.65,
    metalness: 0.12,
    clearcoat: 0.28,
    clearcoatRoughness: 0.35,
  }), []);

  if (position === 'seated') {
    return (
      <group position={[0, -0.32, -0.06]}>
        {/* Contoured Ergonomic Seat Pad */}
        <mesh material={leatherMat} position={[0, 0.44, 0.08]} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.08, 0.42]} />
        </mesh>
        {/* High Anatomical Backrest with beveled profile */}
        <mesh material={leatherMat} position={[0, 0.90, -0.14]} rotation={[0.06, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.82, 0.08]} />
        </mesh>
        {/* Central Heavy Steel Stanchion */}
        <mesh material={metalMat} position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.44, 20]} />
        </mesh>
        {/* Front T-Bar Stabilizer Foot & Leg Rest */}
        <mesh material={metalMat} position={[0, 0.02, 0.26]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.038, 0.038, 0.58, 20]} />
        </mesh>
        {/* Rear T-Bar Stabilizer Foot */}
        <mesh material={metalMat} position={[0, 0.02, -0.30]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.038, 0.038, 0.58, 20]} />
        </mesh>
      </group>
    );
  }

  if (position === 'lying') {
    return (
      <group position={[0, -0.05, -0.3]}>
        <mesh material={leatherMat} position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.08, 1.25]} />
        </mesh>
        <mesh material={metalMat} position={[0, 0.22, -0.5]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.44, 16]} />
        </mesh>
        <mesh material={metalMat} position={[0, 0.22, 0.5]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.44, 16]} />
        </mesh>
      </group>
    );
  }

  return null;
}

function DumbbellGrip({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const chromeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f1f5f9',
    roughness: 0.14,
    metalness: 0.95,
  }), []);

  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#151d2f',
    roughness: 0.45,
    metalness: 0.72,
  }), []);

  return (
    <group position={position} rotation={rotation || [0, Math.PI / 2, 0]}>
      {/* Knurled Chrome Center Handle */}
      <mesh material={chromeMat} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.20, 16]} />
      </mesh>
      {/* Locking Chrome Collars */}
      <mesh material={chromeMat} position={[-0.052, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 0.014, 14]} />
      </mesh>
      <mesh material={chromeMat} position={[0.052, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 0.014, 14]} />
      </mesh>

      {/* Left Tiered Cast Iron Plates (Proportional athletic scale) */}
      <mesh material={plateMat} position={[-0.068, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.068, 0.068, 0.020, 24]} />
      </mesh>
      <mesh material={plateMat} position={[-0.088, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.058, 0.058, 0.018, 24]} />
      </mesh>

      {/* Right Tiered Cast Iron Plates */}
      <mesh material={plateMat} position={[0.068, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.068, 0.068, 0.020, 24]} />
      </mesh>
      <mesh material={plateMat} position={[0.088, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.058, 0.058, 0.018, 24]} />
      </mesh>
    </group>
  );
}

function BarbellBar({ position }: { position: [number, number, number] }) {
  const chromeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.15,
    metalness: 0.95,
  }), []);
  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0b0f19',
    roughness: 0.35,
    metalness: 0.8,
  }), []);

  return (
    <group position={position}>
      <mesh material={chromeMat} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 1.5, 24]} />
      </mesh>
      <mesh material={plateMat} position={[-0.65, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 28]} />
      </mesh>
      <mesh material={plateMat} position={[0.65, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 28]} />
      </mesh>
    </group>
  );
}

// ============================================================================
// CUSTOM SHADER MATERIAL FOR ANATOMICAL MUSCLE HIGHLIGHTING (RED / ORANGE)
// Dynamic Biomechanical Glow: Frontal planar projection, Lateral profile depth, Detail fiber striations
// ============================================================================

const muscleHighlightVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uContraction;
  uniform float uIsPrimary;
  uniform float uExercisePace;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // Hypertrophic volume expansion displacement along vertex normal during contraction & pace pulse
    vec3 displaced = position;
    float effectivePace = max(0.1, uExercisePace);
    float pulseSpeed = (uIsPrimary > 0.5 ? 4.2 : 2.6) * effectivePace;
    float microPulse = sin(uTime * pulseSpeed) * (uIsPrimary > 0.5 ? 0.0035 : 0.0018) * min(effectivePace, 2.0);
    float swell = (uIsPrimary > 0.5 ? 0.022 : 0.010) * uContraction + microPulse;
    displaced += normal * swell;

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPos.xyz;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const muscleHighlightFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  uniform float uTime;
  uniform float uExercisePace;           // Dynamic exercise pace / tempo multiplier (e.g. 0.5, 1.0, 1.5, 2.0)
  uniform vec3 uHighlightColorPrimary;   // Dynamic primary highlight color (e.g. from exercise catalog)
  uniform vec3 uHighlightColorSecondary; // Dynamic secondary highlight color (e.g. from exercise catalog)
  uniform vec3 uColorCore;               // Crimson red (#ff0033) for primary, ruby (#e11d48) for secondary
  uniform vec3 uColorGlow;               // Vibrant cyber orange (#ff6a00) for rim / glow
  uniform vec3 uColorWarm;               // Fiery orange-red (#ff2200)
  uniform float uIsPrimary;              // 1.0 = primary, 0.0 = secondary
  uniform float uCameraView;             // 0 = front, 1 = side, 2 = detail, 3 = back
  uniform float uIntensity;              // Base glow multiplier
  uniform float uContraction;            // 0.0 to 1.0 (synchronized with kinematic cycle)
  uniform float uSweatIntensity;         // Sweat intensity: 0.0 (dry) to 1.0 (very sweaty)

  // =========================================================================
  // NORMAL MAPPING: Procedural Micro-Anatomical Muscle Fiber Heightfield
  // Evaluates longitudinal fascicles, transverse sarcomere striations, and dynamic tension
  // =========================================================================
  float getMuscleFiberHeight(vec3 worldPos, vec2 uv, float time, float contraction, float isPrimary, float pace) {
    float freq = isPrimary > 0.5 ? 46.0 : 34.0;
    
    // Longitudinal fascicle muscle fiber cords
    float fiber1 = sin(worldPos.y * freq + worldPos.x * 14.0 + worldPos.z * 10.0);
    
    // Secondary harmonic bundle separation
    float fiber2 = sin(worldPos.y * (freq * 2.15) - worldPos.x * 7.5) * 0.45;
    
    // Transverse micro-striations (sarcomere bands) flexing dynamically under tension
    float striations = sin(worldPos.y * 115.0 + sin(worldPos.x * 28.0) * 1.3) * 0.28;
    
    // Dynamic metabolic tension wave traveling along fibers aligned with pace tempo
    float tension = sin(worldPos.y * 22.0 - time * (4.2 * max(0.2, pace))) * 0.22;
    
    // Hypertrophic swelling scales bump relief during peak contraction
    float contractionRelief = 0.80 + contraction * 0.60;
    return (fiber1 * 0.52 + fiber2 * 0.34 + striations * 0.24 + tension * 0.18) * contractionRelief;
  }

  // Subcutaneous Vascular Network (hyperemic veins)
  float getVascularity(vec3 worldPos, float contraction, float isPrimary) {
    if (isPrimary < 0.5) return 0.0;
    float vein1 = sin(worldPos.y * 22.0 + sin(worldPos.x * 28.0 + worldPos.z * 16.0) * 2.5);
    float veinWidth1 = smoothstep(0.93, 0.98, vein1);
    
    float vein2 = cos(worldPos.y * 36.0 - cos(worldPos.z * 24.0) * 1.8);
    float veinWidth2 = smoothstep(0.95, 0.99, vein2) * 0.65;
    
    return (veinWidth1 + veinWidth2) * (0.5 + 0.5 * contraction);
  }

  // Mikkelsen / Screen-Space Cotangent Frame Normal Perturbation
  // Computes precise view-space perturbed surface normal N' from procedural heightfield
  vec3 getPerturbedNormal(vec3 eyePos, vec3 surfNorm, float height, float bumpStrength) {
    vec3 dpdx = dFdx(eyePos);
    vec3 dpdy = dFdy(eyePos);
    float dhdx = dFdx(height);
    float dhdy = dFdy(height);

    vec3 r1 = cross(dpdy, surfNorm);
    vec3 r2 = cross(surfNorm, dpdx);

    float det = dot(dpdx, r1);
    if (abs(det) < 0.000001) return surfNorm;

    vec3 grad = (r1 * dhdx + r2 * dhdy) / det;
    return normalize(surfNorm - grad * bumpStrength);
  }

  void main() {
    vec3 geomNormal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    vec3 eyePos = -vViewPosition;

    // Calculate procedural normal mapping height and perturbed surface normal N'
    float fiberHeight = getMuscleFiberHeight(vWorldPosition, vUv, uTime, uContraction, uIsPrimary, uExercisePace);
    float bumpScale = (uIsPrimary > 0.5 ? 0.036 : 0.024) * (1.0 + uContraction * 0.45);
    vec3 normal = getPerturbedNormal(eyePos, geomNormal, fiberHeight, bumpScale);

    // =========================================================================
    // MULTI-SOURCE NORMAL-MAPPED LIGHTING CALCULATIONS
    // =========================================================================
    // Studio lighting directions in view space
    vec3 L_key = normalize(vec3(0.55, 0.90, 0.85));   // Key light (top-front-right)
    vec3 L_fill = normalize(vec3(-0.65, 0.20, 0.50)); // Fill light (cool lateral left)
    
    // Normal-mapped Diffuse with Half-Lambert soft tissue translucency
    float NdotL_key = dot(normal, L_key);
    float diffKey = pow(NdotL_key * 0.5 + 0.5, 1.35);
    float diffFill = max(0.0, dot(normal, L_fill)) * 0.42;
    
    // Subsurface organic scattering approximation (light wrapping through muscular volume)
    float sss = pow(max(0.0, dot(-normal, L_key) * 0.5 + 0.5), 2.2) * 0.40;
    
    // High-gloss specular gleam reflecting off individual normal-mapped fiber striations
    vec3 H_key = normalize(L_key + viewDir);
    float NdotH = max(0.0, dot(normal, H_key));
    float specSharp = pow(NdotH, 44.0);        // Glistening wetness on fascicle crests
    float specBroad = pow(NdotH, 12.0) * 0.35; // Organic fascia sheen
    float specularGleam = specSharp * 1.15 + specBroad;

    // Normal-mapped View Angle Fresnel
    float NdotV = max(0.0, dot(normal, viewDir));
    float fresnel = pow(1.0 - NdotV, 2.3);

    // Inter-fascicular Cavity Shadowing / Crevice Ambient Occlusion
    // Depresses ambient light in the valleys between muscle fibers for rich 3D depth
    float cavity = smoothstep(-1.1, 0.7, fiberHeight);

    // =========================================================================
    // CAMERA VIEW-SPECIFIC PROJECTION MODULATION
    // =========================================================================
    float viewFactor = 1.0;
    if (uCameraView < 0.5) {
      // Frente: accentuate frontal planar projection and muscular definition
      viewFactor = 0.92 + 0.38 * max(0.0, normal.z);
    } else if (uCameraView < 1.5) {
      // Lateral: accentuate lateral profile depth and silhouette curvature
      viewFactor = 0.92 + 0.52 * abs(normal.x);
    } else if (uCameraView < 2.5) {
      // Detalhe: ultra-high focal emission and magnified fiber striations
      viewFactor = 1.35 + 0.45 * (1.0 - NdotV) + fiberHeight * 0.12;
    } else {
      // Back: dorsal muscular projection
      viewFactor = 0.92 + 0.38 * max(0.0, -normal.z);
    }

    // =========================================================================
    // PERIODIC 'PULSE' ANIMATION (Primary & Secondary synchronized with Exercise Pace)
    // =========================================================================
    float effectivePace = max(0.1, uExercisePace);
    float pulseFrequency = (uIsPrimary > 0.5 ? 4.2 : 2.6) * effectivePace;

    float rawWave = sin(uTime * pulseFrequency);
    float periodicWave = rawWave * 0.5 + 0.5; // Normalized 0.0 to 1.0

    // Non-linear power shaping: Primary has energetic sharp crest; Secondary smooth swells
    float pulseShape = pow(periodicWave, uIsPrimary > 0.5 ? 2.2 : 1.4);

    // Pace intensity factor: faster tempo heighten luminous amplitude
    float paceIntensityFactor = clamp(0.65 + effectivePace * 0.45, 0.45, 2.25);
    float pulseAmplitude = (uIsPrimary > 0.5 ? 0.42 : 0.24) * paceIntensityFactor;

    // Overall pulse factor combining base glow, periodic pace wave, and peak contraction burst
    float pulse = 0.88 + pulseShape * pulseAmplitude + uContraction * (0.38 * paceIntensityFactor);

    // =========================================================================
    // COLOR COMPOSITION & DEPTH GRADIENTS
    // =========================================================================
    vec3 targetHighlight = mix(uHighlightColorSecondary, uHighlightColorPrimary, step(0.5, uIsPrimary));

    // Deep ruby-crimson in crevices, fiery vermilion-orange on illuminated fiber crests
    vec3 deepCreviceColor = mix(vec3(0.42, 0.02, 0.07), uColorCore, 0.65);
    vec3 illuminatedRidgeColor = mix(uColorGlow, uColorWarm, 0.50);
    illuminatedRidgeColor = mix(illuminatedRidgeColor, targetHighlight, 0.65);

    // Base tissue tone blending crevice depth with surface illumination
    vec3 baseCore = mix(deepCreviceColor, targetHighlight, cavity * 0.75);
    vec3 baseTone = mix(baseCore, illuminatedRidgeColor, (diffKey + diffFill + sss * 0.5) * 0.55);

    // Active color blending normal-mapped diffuse, organic subsurface scattering, and pulse glow
    vec3 activeColor = baseTone * (0.75 + 0.35 * diffKey);
    activeColor += illuminatedRidgeColor * (sss * 0.60 * pulse);

    // Heighten edge and fiber crest luminescence during peak pulse beats
    activeColor += illuminatedRidgeColor * (fresnel * (0.55 + pulseShape * 0.35) * pulse);
    activeColor += targetHighlight * (NdotV * (0.28 + pulseShape * 0.28) * pulse);

    // Normal-mapped Specular Glistening: fibers glisten with intense athletic sheen at pulse apex
    float pulseSpecularBoost = 1.0 + pulseShape * 0.85 * paceIntensityFactor + uContraction * 0.50;
    float sweatSpecularBoost = 1.0 + uSweatIntensity * 1.5; // Boost specularity with sweat
    vec3 specularColor = mix(vec3(1.0, 0.88, 0.75), vec3(1.0, 0.95, 0.90), step(0.5, uIsPrimary));
    activeColor += specularColor * (specularGleam * 0.55 * pulseSpecularBoost * sweatSpecularBoost);

    // Dynamic crest flash at the apex of the pulse wave
    if (uIsPrimary > 0.5) {
      activeColor += uHighlightColorPrimary * (pulseShape * 0.28 * paceIntensityFactor);
    } else {
      activeColor += uHighlightColorSecondary * (pulseShape * 0.18 * paceIntensityFactor);
    }

    // Hyperemic vascularity accent line glow on active muscle belly
    float vascularLine = getVascularity(vWorldPosition, uContraction, uIsPrimary);
    if (vascularLine > 0.01) {
      vec3 veinGlowColor = mix(uHighlightColorPrimary, vec3(0.0, 0.95, 1.0), 0.35);
      activeColor += veinGlowColor * (vascularLine * 0.55 * (0.8 + pulseShape * 0.5));
    }

    // Detail camera view enhancement
    if (uCameraView > 1.5 && uCameraView < 2.5) {
      activeColor *= 1.25;
    }

    // Secondary synergist softens slightly
    if (uIsPrimary < 0.5) {
      activeColor = mix(activeColor, uHighlightColorSecondary, 0.22);
    }

    // Signature Electric Cyan / Blue backlight halo on the muscle silhouette matching reference image
    // Catching normal-mapped silhouette edges for anatomical atlas precision
    vec3 cyanHalo = vec3(0.0, 0.92, 1.0);
    float rimFactor = pow(1.0 - NdotV, 3.4);
    activeColor += cyanHalo * (rimFactor * 0.50);

    gl_FragColor = vec4(activeColor * uIntensity * viewFactor, 1.0);
  }
`;

export interface MuscleHighlightShaderOptions {
  isPrimary?: boolean;
  cameraView?: 'front' | 'side' | 'detail' | 'back' | number;
  intensity?: number;
  contraction?: number;
  exercisePace?: number;
  uExercisePace?: number;
  uHighlightColorPrimary?: string | THREE.Color;
  uHighlightColorSecondary?: string | THREE.Color;
  highlightColorPrimary?: string | THREE.Color;
  highlightColorSecondary?: string | THREE.Color;
  colorCore?: string | THREE.Color;
  colorGlow?: string | THREE.Color;
  colorWarm?: string | THREE.Color;
}

export class MuscleHighlightShaderMaterial extends THREE.ShaderMaterial {
  constructor(options?: MuscleHighlightShaderOptions) {
    const isPrimary = options?.isPrimary !== undefined ? options.isPrimary : true;
    const cameraViewNum =
      typeof options?.cameraView === 'number'
        ? options.cameraView
        : options?.cameraView === 'side'
        ? 1.0
        : options?.cameraView === 'detail'
        ? 2.0
        : options?.cameraView === 'back'
        ? 3.0
        : 0.0;

    const exercisePaceVal = options?.uExercisePace ?? options?.exercisePace ?? 1.0;

    const rawPrimaryColor = options?.uHighlightColorPrimary ?? options?.highlightColorPrimary;
    const highlightColorPrimaryVal = rawPrimaryColor
      ? typeof rawPrimaryColor === 'string'
        ? new THREE.Color(rawPrimaryColor)
        : rawPrimaryColor
      : new THREE.Color('#ff0033');

    const rawSecondaryColor = options?.uHighlightColorSecondary ?? options?.highlightColorSecondary;
    const highlightColorSecondaryVal = rawSecondaryColor
      ? typeof rawSecondaryColor === 'string'
        ? new THREE.Color(rawSecondaryColor)
        : rawSecondaryColor
      : new THREE.Color('#ff6a00');

    const coreColor = options?.colorCore
      ? typeof options.colorCore === 'string'
        ? new THREE.Color(options.colorCore)
        : options.colorCore
      : new THREE.Color(isPrimary ? '#ff0033' : '#e11d48');

    const glowColor = options?.colorGlow
      ? typeof options.colorGlow === 'string'
        ? new THREE.Color(options.colorGlow)
        : options.colorGlow
      : new THREE.Color(isPrimary ? '#ff6a00' : '#f97316');

    const warmColor = options?.colorWarm
      ? typeof options.colorWarm === 'string'
        ? new THREE.Color(options.colorWarm)
        : options.colorWarm
      : new THREE.Color(isPrimary ? '#ff2200' : '#ea580c');

    super({
      uniforms: {
        uTime: { value: 0 },
        uExercisePace: { value: exercisePaceVal },
        uHighlightColorPrimary: { value: highlightColorPrimaryVal },
        uHighlightColorSecondary: { value: highlightColorSecondaryVal },
        uColorCore: { value: coreColor },
        uColorGlow: { value: glowColor },
        uColorWarm: { value: warmColor },
        uIsPrimary: { value: isPrimary ? 1.0 : 0.0 },
        uCameraView: { value: cameraViewNum },
        uIntensity: { value: options?.intensity ?? (isPrimary ? 1.65 : 1.15) },
        uContraction: { value: options?.contraction ?? 0.0 },
        uSweatIntensity: { value: 0.0 },
      },
      vertexShader: muscleHighlightVertexShader,
      fragmentShader: muscleHighlightFragmentShader,
      side: THREE.FrontSide,
    });
  }

  public setIsPrimary(isPrimary: boolean) {
    this.uniforms.uIsPrimary.value = isPrimary ? 1.0 : 0.0;
    this.uniforms.uIntensity.value = isPrimary ? 1.65 : 1.15;
    if (isPrimary) {
      this.uniforms.uColorCore.value.set('#ff0033');
      this.uniforms.uColorGlow.value.set('#ff6a00');
      this.uniforms.uColorWarm.value.set('#ff2200');
    } else {
      this.uniforms.uColorCore.value.set('#e11d48');
      this.uniforms.uColorGlow.value.set('#f97316');
      this.uniforms.uColorWarm.value.set('#ea580c');
    }
  }

  public setHighlightColorPrimary(color: string | THREE.Color) {
    if (typeof color === 'string') {
      this.uniforms.uHighlightColorPrimary.value.set(color);
    } else {
      this.uniforms.uHighlightColorPrimary.value.copy(color);
    }
  }

  public setHighlightColorSecondary(color: string | THREE.Color) {
    if (typeof color === 'string') {
      this.uniforms.uHighlightColorSecondary.value.set(color);
    } else {
      this.uniforms.uHighlightColorSecondary.value.copy(color);
    }
  }

  public setHighlightColors(primary?: string | THREE.Color, secondary?: string | THREE.Color) {
    if (primary) this.setHighlightColorPrimary(primary);
    if (secondary) this.setHighlightColorSecondary(secondary);
  }

  public setExercisePace(pace: number) {
    this.uniforms.uExercisePace.value = pace;
  }

  get uExercisePace(): number {
    return this.uniforms.uExercisePace.value;
  }

  set uExercisePace(pace: number) {
    this.setExercisePace(pace);
  }

  get uHighlightColorPrimary(): THREE.Color {
    return this.uniforms.uHighlightColorPrimary.value;
  }

  set uHighlightColorPrimary(color: string | THREE.Color) {
    this.setHighlightColorPrimary(color);
  }

  get uHighlightColorSecondary(): THREE.Color {
    return this.uniforms.uHighlightColorSecondary.value;
  }

  set uHighlightColorSecondary(color: string | THREE.Color) {
    this.setHighlightColorSecondary(color);
  }

  public setCameraView(view: 'front' | 'side' | 'detail' | 'back' | number) {
    const val =
      typeof view === 'number'
        ? view
        : view === 'side'
        ? 1.0
        : view === 'detail'
        ? 2.0
        : view === 'back'
        ? 3.0
        : 0.0;
    this.uniforms.uCameraView.value = val;
  }

  public updateTimeAndContraction(time: number, contraction: number, exercisePace?: number) {
    this.uniforms.uTime.value = time;
    this.uniforms.uContraction.value = contraction;
    if (exercisePace !== undefined) {
      this.uniforms.uExercisePace.value = exercisePace;
    }
  }
}

// Register custom shader material in React Three Fiber
extend({ MuscleHighlightShaderMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      muscleHighlightShaderMaterial: any;
    }
  }
}

export function createMuscleHighlightShaderMaterial(
  options?: MuscleHighlightShaderOptions
): MuscleHighlightShaderMaterial {
  return new MuscleHighlightShaderMaterial(options);
}

// ============================================================================
// REACT THREE FIBER DECLARATIVE SHADER COMPONENT
// Allows applying the Red / Orange muscle highlight shader to any R3F mesh directly
// ============================================================================
export interface MuscleShaderMaterialProps {
  isPrimary?: boolean;
  intensity?: number;
  cameraView?: 'front' | 'side' | 'detail' | 'back' | number;
  contraction?: number;
  exercisePace?: number;
  uExercisePace?: number;
  uHighlightColorPrimary?: string | THREE.Color;
  uHighlightColorSecondary?: string | THREE.Color;
  highlightColorPrimary?: string | THREE.Color;
  highlightColorSecondary?: string | THREE.Color;
  colorCore?: string;
  colorGlow?: string;
  colorWarm?: string;
  attach?: string;
}

export function MuscleShaderMaterial({
  isPrimary = true,
  intensity,
  cameraView = 'front',
  contraction,
  exercisePace,
  uExercisePace,
  uHighlightColorPrimary,
  uHighlightColorSecondary,
  highlightColorPrimary,
  highlightColorSecondary,
  colorCore,
  colorGlow,
  colorWarm,
  attach = 'material',
}: MuscleShaderMaterialProps) {
  const matRef = useRef<MuscleHighlightShaderMaterial>(null);

  const effectivePrimaryColor = uHighlightColorPrimary ?? highlightColorPrimary;
  const effectiveSecondaryColor = uHighlightColorSecondary ?? highlightColorSecondary;
  const effectivePace = uExercisePace ?? exercisePace ?? 1.0;

  const material = useMemo(() => {
    return new MuscleHighlightShaderMaterial({
      isPrimary,
      intensity,
      cameraView,
      contraction,
      exercisePace: effectivePace,
      uHighlightColorPrimary: effectivePrimaryColor,
      uHighlightColorSecondary: effectiveSecondaryColor,
      colorCore,
      colorGlow,
      colorWarm,
    });
  }, [
    isPrimary,
    intensity,
    cameraView,
    contraction,
    effectivePace,
    effectivePrimaryColor,
    effectiveSecondaryColor,
    colorCore,
    colorGlow,
    colorWarm,
  ]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  const currentContraction = useRef(0);
  useFrame((state) => {
    if (matRef.current) {
      const time = state.clock.getElapsedTime();
      const targetCycle = contraction !== undefined ? contraction : (Math.sin(time * 2.2 * effectivePace) + 1) / 2;
      currentContraction.current = THREE.MathUtils.lerp(currentContraction.current, targetCycle, 0.12);
      matRef.current.updateTimeAndContraction(time, currentContraction.current, effectivePace);
      if (effectivePrimaryColor) matRef.current.setHighlightColorPrimary(effectivePrimaryColor);
      if (effectiveSecondaryColor) matRef.current.setHighlightColorSecondary(effectiveSecondaryColor);
    }
  });

  return <primitive ref={matRef} object={material} attach={attach} />;
}

// ============================================================================
// DYNAMIC CONTRAST RATIO & READABILITY HELPER FOR MUSCLE HIGHLIGHT SHADER
// Computes WCAG 2.1 relative luminance and contrast ratios between highlight colors
// (uHighlightColorPrimary / uHighlightColorSecondary) and avatar skin texture / surface
// to guarantee crisp readability in all lighting conditions (studio, dim, bright, outdoor).
// ============================================================================

export interface LightingContrastOptions {
  /** Ambient light intensity multiplier (default: 0.55 from visualizer studio setup) */
  ambientIntensity?: number;
  /** Directional key light intensity (default: 1.5 from visualizer setup) */
  directionalIntensity?: number;
  /** Lighting preset: 'studio' | 'dim' | 'bright' | 'outdoor' */
  preset?: 'studio' | 'dim' | 'bright' | 'outdoor';
  /** Minimum acceptable contrast ratio threshold (defaults to 3.0:1 for WCAG UI graphics) */
  minRatioThreshold?: number;
  /** Target ratio for suggested color adjustments (default: 3.0) */
  targetRatio?: number;
}

export interface ContrastRatioResult {
  /** The calculated numerical contrast ratio, e.g. 3.42 (meaning 3.42:1) */
  ratio: number;
  /** Formatted string representation (e.g. "3.4:1") */
  formattedRatio: string;
  /** Whether the contrast ratio meets or exceeds the required threshold (default >= 3.0:1) */
  isReadable: boolean;
  /** Passes WCAG 2.1 Non-Text Contrast (SC 1.4.11, ratio >= 3.0:1) for graphics and UI components */
  wcagAA_UI: boolean;
  /** Passes WCAG 2.1 Contrast Minimum (SC 1.4.3, ratio >= 4.5:1) for normal text and high legibility */
  wcagAA: boolean;
  /** Passes WCAG 2.1 Enhanced Contrast (SC 1.4.6, ratio >= 7.0:1) */
  wcagAAA: boolean;
  /** Relative luminance of muscle highlight color under lighting conditions (0.0 to 1.0) */
  luminanceHighlight: number;
  /** Relative luminance of avatar skin surface/texture under lighting conditions (0.0 to 1.0) */
  luminanceSkin: number;
  /** Effective lighting scale factor applied to the calculation */
  lightingScale: number;
  /** Qualitative readability rating */
  rating: 'excellent' | 'good' | 'adequate' | 'poor';
  /** Suggested contrast-adjusted color (hex string) that guarantees readability if current contrast is weak */
  suggestedHighlightColor?: string;
}

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB color.
 * Supports string hex ('#ff0033'), THREE.Color, or [r, g, b] array.
 */
export function getRelativeLuminance(color: string | THREE.Color | [number, number, number]): number {
  let r = 0;
  let g = 0;
  let b = 0;

  if (typeof color === 'string') {
    try {
      const c = new THREE.Color(color);
      r = c.r;
      g = c.g;
      b = c.b;
    } catch {
      r = 1;
      g = 0;
      b = 0.2;
    }
  } else if (color instanceof THREE.Color) {
    r = color.r;
    g = color.g;
    b = color.b;
  } else if (Array.isArray(color)) {
    r = color[0] > 1 ? color[0] / 255 : color[0];
    g = color[1] > 1 ? color[1] / 255 : color[1];
    b = color[2] > 1 ? color[2] / 255 : color[2];
  }

  const sRGBtoLin = (val: number): number => {
    const clamped = Math.max(0, Math.min(1, val));
    return clamped <= 0.04045 ? clamped / 12.92 : Math.pow((clamped + 0.055) / 1.055, 2.4);
  };

  const rLin = sRGBtoLin(r);
  const gLin = sRGBtoLin(g);
  const bLin = sRGBtoLin(b);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Helper function in AvatarAnatomico to dynamically calculate the contrast ratio
 * between the muscle highlight color (uHighlightColorPrimary/Secondary) and the
 * avatar's skin texture / base surface to ensure readability in all lighting conditions.
 *
 * @param highlightColor The highlight color (uHighlightColorPrimary or uHighlightColorSecondary)
 * @param skinColorOrTexture The avatar skin surface color, texture, or material definition (defaults to '#d4d8e5')
 * @param options Lighting condition options (ambient & directional intensities or lighting presets)
 * @returns ContrastRatioResult with WCAG evaluations and suggested colors if needed
 */
export function calculateMuscleSkinContrastRatio(
  highlightColor: string | THREE.Color,
  skinColorOrTexture: string | THREE.Color | THREE.Texture | { color?: string | THREE.Color } = '#d4d8e5',
  options?: LightingContrastOptions
): ContrastRatioResult {
  // 1. Resolve raw skin color
  let resolvedSkinColor: string | THREE.Color = '#d4d8e5';
  if (typeof skinColorOrTexture === 'string' || skinColorOrTexture instanceof THREE.Color) {
    resolvedSkinColor = skinColorOrTexture;
  } else if (skinColorOrTexture && typeof skinColorOrTexture === 'object') {
    if ('color' in skinColorOrTexture && skinColorOrTexture.color) {
      resolvedSkinColor = skinColorOrTexture.color;
    } else if ('isTexture' in (skinColorOrTexture as any)) {
      // Texture fallback / sampled base tint
      resolvedSkinColor = '#d4d8e5';
    }
  }

  // 2. Base relative luminances without scene lighting
  const baseHighlightLum = getRelativeLuminance(highlightColor);
  const baseSkinLum = getRelativeLuminance(resolvedSkinColor);

  // 3. Determine scene lighting scale factor
  let ambient = options?.ambientIntensity ?? 0.55;
  let directional = options?.directionalIntensity ?? 1.5;

  if (options?.preset === 'dim') {
    ambient = 0.25;
    directional = 0.45;
  } else if (options?.preset === 'bright') {
    ambient = 0.90;
    directional = 2.20;
  } else if (options?.preset === 'outdoor') {
    ambient = 1.00;
    directional = 2.50;
  }

  // Effective light incident on the reflective skin surface:
  const lightingScale = ambient * 0.45 + directional * 0.55;

  // The porcelain/skin surface reflects the incident scene lighting:
  const litSkinLum = Math.max(0.005, Math.min(1.0, baseSkinLum * lightingScale));

  // The muscle ShaderMaterial is bio-luminescent (emissive uIntensity: 1.65 / 1.15),
  // maintaining readability even in low light while reacting to scene lights:
  const litHighlightLum = Math.max(0.005, Math.min(1.0, baseHighlightLum * (0.75 + 0.35 * lightingScale)));

  // 4. WCAG 2.1 Contrast Ratio formula: (Lmax + 0.05) / (Lmin + 0.05)
  const lMax = Math.max(litHighlightLum, litSkinLum);
  const lMin = Math.min(litHighlightLum, litSkinLum);
  const numericRatio = Number(((lMax + 0.05) / (lMin + 0.05)).toFixed(2));

  const minThreshold = options?.minRatioThreshold ?? 3.0;
  const isReadable = numericRatio >= minThreshold;
  const wcagAA_UI = numericRatio >= 3.0;
  const wcagAA = numericRatio >= 4.5;
  const wcagAAA = numericRatio >= 7.0;

  let rating: 'excellent' | 'good' | 'adequate' | 'poor' = 'poor';
  if (numericRatio >= 7.0) {
    rating = 'excellent';
  } else if (numericRatio >= 4.5) {
    rating = 'good';
  } else if (numericRatio >= 3.0) {
    rating = 'adequate';
  }

  // 5. Calculate suggested highlight color if contrast is weak
  let suggestedHighlightColor: string | undefined = undefined;
  if (!isReadable) {
    if (litSkinLum > 0.45) {
      // Skin is light: deepen the muscle highlight color towards rich high-contrast crimson/ruby
      suggestedHighlightColor = '#b91c1c';
    } else {
      // Skin is dark: brighten highlight color towards intense electric amber/neon orange
      suggestedHighlightColor = '#fb923c';
    }
  }

  return {
    ratio: numericRatio,
    formattedRatio: `${numericRatio.toFixed(1)}:1`,
    isReadable,
    wcagAA_UI,
    wcagAA,
    wcagAAA,
    luminanceHighlight: litHighlightLum,
    luminanceSkin: litSkinLum,
    lightingScale,
    rating,
    suggestedHighlightColor,
  };
}

/**
 * Convenience helper to evaluate both primary and secondary highlight contrast against avatar skin
 */
export function checkVisualizerContrast(
  primaryColor = '#ff0033',
  secondaryColor = '#ff6a00',
  skinColor = '#d4d8e5',
  lightingPreset: 'studio' | 'dim' | 'bright' | 'outdoor' = 'studio'
) {
  const primaryResult = calculateMuscleSkinContrastRatio(primaryColor, skinColor, { preset: lightingPreset });
  const secondaryResult = calculateMuscleSkinContrastRatio(secondaryColor, skinColor, { preset: lightingPreset });

  return {
    primary: primaryResult,
    secondary: secondaryResult,
    overallReadable: primaryResult.isReadable && secondaryResult.isReadable,
  };
}

// Muscle Tag to Exercise Database String Matching
// Strict mapping for muscle tags to known catalog identifiers
const STRICT_MUSCLE_MAP: Record<string, string[]> = {
  'deltoid_lateral': ['deltoide', 'deltoides', 'ombro', 'ombros', 'deltoide lateral'],
  'deltoid_anterior': ['deltoide anterior', 'ombro anterior'],
  'deltoid_posterior': ['deltoide posterior', 'ombro posterior'],
  'bicep': ['biceps', 'bíceps'],
  'tricep': ['triceps', 'tríceps'],
  'chest': ['peito', 'peitoral'],
  'abs': ['abs', 'abdômen', 'abdominal'],
  'lat': ['costas', 'latíssimo', 'dorsal'],
  'glute': ['glúteo', 'glúteos'],
  'forearm': ['antebraço'],
};

// Verify consistency between active muscles and model structure
export function verifyAnatomicalConsistency(activeMuscles: string[], validMuscleTags: string[]): { valid: string[], invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  activeMuscles.forEach(muscle => {
    // Check if the muscle name maps to any of the valid model tags
    const isMapped = validMuscleTags.some(tag => {
      const mapping = STRICT_MUSCLE_MAP[tag];
      return mapping && mapping.includes(muscle.toLowerCase().trim());
    });
    
    if (isMapped) {
      valid.push(muscle);
    } else {
      invalid.push(muscle);
    }
  });

  return { valid, invalid };
}

export function isMuscleMatching(tag: string, muscleList?: string[]): boolean {
  if (!muscleList || muscleList.length === 0) return false;
  const t = tag.toLowerCase().trim();

  // Strict lookup based on internal map
  if (STRICT_MUSCLE_MAP[t]) {
    return muscleList.some(m => STRICT_MUSCLE_MAP[t].includes(m.toLowerCase().trim()));
  }

  // Fallback for custom or unmapped nodes
  return muscleList.some((m) => {
    const raw = (m || '').toLowerCase();
    const clean = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Deltoids & Shoulders Sub-regions
    if (t === 'deltoid_lateral') {
      return (
        clean.includes('lateral') ||
        (clean.includes('deltoid') && !clean.includes('anterior') && !clean.includes('posterior')) ||
        clean === 'ombro' ||
        clean === 'ombros' ||
        clean === 'deltoide' ||
        clean === 'deltoides' ||
        clean.includes('supraespinhal')
      );
    }
    if (t === 'deltoid_anterior') {
      return (
        clean.includes('anterior') ||
        (clean.includes('deltoid') && !clean.includes('lateral') && !clean.includes('posterior')) ||
        clean === 'ombro' ||
        clean === 'ombros' ||
        clean === 'deltoide' ||
        clean === 'deltoides' ||
        clean.includes('manguito')
      );
    }
    if (t === 'deltoid_posterior') {
      return (
        clean.includes('posterior') ||
        clean.includes('infraespinhal') ||
        (clean.includes('deltoid') && !clean.includes('lateral') && !clean.includes('anterior')) ||
        clean === 'ombro' ||
        clean === 'ombros' ||
        clean === 'deltoide' ||
        clean === 'deltoides'
      );
    }
    if (t === 'deltoid') {
      return (
        clean.includes('deltoid') ||
        clean.includes('ombro') ||
        clean.includes('manguito') ||
        clean.includes('infraespinhal') ||
        clean.includes('supraespinhal')
      );
    }

    // Pectorals & Chest Sub-regions
    if (t === 'pectoral_upper' || t === 'chest_upper') {
      return (
        clean.includes('clavicular') ||
        clean.includes('peitoral superior') ||
        clean.includes('peito superior') ||
        (clean.includes('peitoral') && !clean.includes('inferior') && !clean.includes('costal')) ||
        clean.includes('supino inclinado')
      );
    }
    if (t === 'pectoral_lower' || t === 'chest_lower') {
      return (
        clean.includes('costal') ||
        clean.includes('peitoral inferior') ||
        clean.includes('peito inferior') ||
        clean.includes('supino declinado')
      );
    }
    if (t === 'chest' || t === 'pectoral') {
      return (
        clean.includes('peitoral') ||
        clean.includes('peito') ||
        clean.includes('supino') ||
        clean.includes('serratil') ||
        clean.includes('crucifixo')
      );
    }

    // Back & Lats
    if (t === 'lat' || t === 'latissimus') {
      return (
        clean.includes('dorsal') ||
        clean.includes('latissimus') ||
        clean.includes('costas') ||
        clean.includes('lat') ||
        clean.includes('puxada') ||
        clean.includes('remada') ||
        clean.includes('redondo maior')
      );
    }
    if (t === 'trapezius_upper') {
      return clean.includes('trapezio superior') || clean.includes('encolhimento') || clean.includes('trapezio');
    }
    if (t === 'trapezius') {
      return (
        clean.includes('trapezio') ||
        clean.includes('romboide') ||
        clean.includes('escapular') ||
        clean.includes('eretor')
      );
    }

    // Arms
    if (t === 'bicep' || t === 'biceps') {
      return (
        clean.includes('biceps') ||
        clean.includes('braquial') ||
        clean.includes('rosca')
      );
    }
    if (t === 'tricep' || t === 'triceps') {
      return (
        clean.includes('triceps') ||
        clean.includes('extensao de cotovelo') ||
        clean.includes('anconeo') ||
        clean.includes('paralela') ||
        clean.includes('mergulho')
      );
    }
    if (t === 'forearm' || t === 'brachialis') {
      return (
        clean.includes('antebraco') ||
        clean.includes('braquiorradial') ||
        clean.includes('braquial') ||
        clean.includes('punho') ||
        clean.includes('flexores')
      );
    }

    // Abdominals & Core
    if (t === 'abs' || t === 'core') {
      return (
        clean.includes('abd') ||
        clean.includes('core') ||
        clean.includes('reto abdominal') ||
        clean.includes('transverso') ||
        clean.includes('obliquo') ||
        clean.includes('lombar') ||
        clean.includes('prancha')
      );
    }
    if (t === 'obliques') {
      return (
        clean.includes('obliquo') ||
        clean.includes('serratil') ||
        clean.includes('core') ||
        clean.includes('abd')
      );
    }

    // Lower Body
    if (t === 'quad' || t === 'quadriceps') {
      return (
        clean.includes('quadriceps') ||
        clean.includes('coxa') ||
        clean.includes('reto femoral') ||
        clean.includes('vasto') ||
        clean.includes('agachamento') ||
        clean.includes('extensora') ||
        clean.includes('leg press')
      );
    }
    if (t === 'hamstring' || t === 'hamstrings') {
      return (
        clean.includes('isquio') ||
        clean.includes('posterior de coxa') ||
        clean.includes('femoral') ||
        clean.includes('semitendineo') ||
        clean.includes('flexora') ||
        clean.includes('stiff') ||
        clean.includes('terra')
      );
    }
    if (t === 'glute' || t === 'glutes') {
      return (
        clean.includes('gluteo') ||
        clean.includes('pelvico') ||
        clean.includes('quadril') ||
        clean.includes('elevacao pelvica') ||
        clean.includes('adutor') ||
        clean.includes('psoas') ||
        clean.includes('fascia lata') ||
        clean.includes('hip thrust')
      );
    }
    if (t === 'calf' || t === 'calves') {
      return (
        clean.includes('panturrilha') ||
        clean.includes('gastrocnemio') ||
        clean.includes('soleo') ||
        clean.includes('gemeos') ||
        clean.includes('tibial')
      );
    }

    return clean.includes(t) || t.includes(clean);
  });
}

interface MuscleHighlightContextValue {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  cameraView: 'front' | 'side' | 'detail' | 'back';
  isPlaying: boolean;
  playbackSpeed: number;
  exercisePace?: number;
  highlightOverride?: string | null;
  highlightMode: MuscleHighlightMode;
  uHighlightColorPrimary?: string;
  uHighlightColorSecondary?: string;
  highlightColorPrimary?: string;
  highlightColorSecondary?: string;
}

const MuscleHighlightContext = React.createContext<MuscleHighlightContextValue>({
  primaryMuscles: [],
  secondaryMuscles: [],
  cameraView: 'front',
  isPlaying: true,
  playbackSpeed: 1,
  exercisePace: 1,
  highlightOverride: null,
  highlightMode: 'all',
  uHighlightColorPrimary: '#ff0033',
  uHighlightColorSecondary: '#ff6a00',
  highlightColorPrimary: '#ff0033',
  highlightColorSecondary: '#ff6a00',
});

// ============================================================================
// ANATOMICAL MUSCLE NODE (ShaderMaterial em Vermelho / Laranja com Câmera Responsiva)
// Permite destacar apenas o músculo primário ou secundário de forma independente
// ============================================================================
export interface AnatomicalMuscleNodeProps {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  muscleTag: string;
  forceHighlight?: 'primary' | 'secondary' | 'none';
  highlightMode?: MuscleHighlightMode;
  uHighlightColorPrimary?: string | THREE.Color;
  uHighlightColorSecondary?: string | THREE.Color;
  highlightColorPrimary?: string | THREE.Color;
  highlightColorSecondary?: string | THREE.Color;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  isPlaying?: boolean;
  playbackSpeed?: number;
  exercisePace?: number;
  highlightOverride?: string | null;
  cameraView?: 'front' | 'side' | 'detail' | 'back';
}

function AnatomicalMuscleNode({
  geometry,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  muscleTag,
  forceHighlight,
  highlightMode: propHighlightMode,
  uHighlightColorPrimary: propUHighlightPrimary,
  uHighlightColorSecondary: propUHighlightSecondary,
  highlightColorPrimary: propHighlightPrimary,
  highlightColorSecondary: propHighlightSecondary,
  primaryMuscles: propPrimary,
  secondaryMuscles: propSecondary,
  isPlaying: propIsPlaying,
  playbackSpeed: propPlaybackSpeed,
  exercisePace: propExercisePace,
  highlightOverride: propHighlightOverride,
  cameraView: propCameraView,
}: AnatomicalMuscleNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const context = React.useContext(MuscleHighlightContext);

  const primaryMuscles = propPrimary || context.primaryMuscles;
  const secondaryMuscles = propSecondary || context.secondaryMuscles;
  const isPlaying = propIsPlaying !== undefined ? propIsPlaying : context.isPlaying;
  const playbackSpeed = propPlaybackSpeed !== undefined ? propPlaybackSpeed : context.playbackSpeed;
  const exercisePace = propExercisePace ?? propPlaybackSpeed ?? context.exercisePace ?? context.playbackSpeed ?? 1.0;
  const currentPace = isPlaying ? exercisePace : 0.2;
  const highlightOverride = propHighlightOverride !== undefined ? propHighlightOverride : context.highlightOverride;
  const cameraView = propCameraView || context.cameraView;
  const effectiveHighlightMode = propHighlightMode || context.highlightMode || 'all';

  const rawHighlightPrimary =
    propUHighlightPrimary ||
    propHighlightPrimary ||
    context.uHighlightColorPrimary ||
    context.highlightColorPrimary ||
    '#ef4444'; // Bright solid red

  const rawHighlightSecondary =
    propUHighlightSecondary ||
    propHighlightSecondary ||
    context.uHighlightColorSecondary ||
    context.highlightColorSecondary ||
    '#f97316'; // Bright solid orange

  // Camera view float for shader: 0=front, 1=side, 2=detail, 3=back
  const cameraViewFloat = useMemo(() => {
    if (cameraView === 'side') return 1.0;
    if (cameraView === 'detail') return 2.0;
    if (cameraView === 'back') return 3.0;
    return 0.0;
  }, [cameraView]);

  // Determine activation independently for this specific muscle node
  const { isPrimary, isSecondary } = useMemo(() => {
    if (forceHighlight === 'primary') {
      return { isPrimary: true, isSecondary: false };
    }
    if (forceHighlight === 'secondary') {
      return { isPrimary: false, isSecondary: true };
    }
    if (forceHighlight === 'none') {
      return { isPrimary: false, isSecondary: false };
    }

    if (highlightOverride) {
      const isMatch = isMuscleMatching(muscleTag, [highlightOverride]);
      return { isPrimary: isMatch, isSecondary: false };
    }

    const matchesPrimary = isMuscleMatching(muscleTag, primaryMuscles);
    const matchesSecondary = isMuscleMatching(muscleTag, secondaryMuscles);

    // Filter by highlight mode
    if (effectiveHighlightMode === 'primary-only') {
      // Highlight ONLY the primary muscle in red/orange
      return { isPrimary: matchesPrimary, isSecondary: false };
    }
    if (effectiveHighlightMode === 'secondary-only') {
      // Highlight ONLY the secondary synergist muscles in amber/orange
      return { isPrimary: false, isSecondary: matchesSecondary };
    }
    if (effectiveHighlightMode === 'none') {
      return { isPrimary: false, isSecondary: false };
    }

    // Default 'all': primary takes precedence, synergists secondary
    return {
      isPrimary: matchesPrimary,
      isSecondary: !matchesPrimary && matchesSecondary,
    };
  }, [forceHighlight, highlightOverride, muscleTag, primaryMuscles, secondaryMuscles, effectiveHighlightMode]);

  const isHighlighted = isPrimary || isSecondary;

  // High-Definition Athletic Material for target muscles (balanced glow, rich 3D shading & normal definition)
  const solidMuscleMat = useMemo(() => {
    if (isHighlighted) {
      const targetColor = isPrimary ? rawHighlightPrimary : rawHighlightSecondary;
      return new THREE.MeshStandardMaterial({
        color: targetColor,
        emissive: targetColor,
        emissiveIntensity: isPrimary ? 0.48 : 0.32,
        roughness: 0.28,
        metalness: 0.06,
        side: THREE.DoubleSide,
      });
    }
    // Sleek athletic studio mannequin finish (reveals cuts, striations and grooves with specular highlights)
    return new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      roughness: 0.38,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
  }, [isHighlighted, isPrimary, rawHighlightPrimary, rawHighlightSecondary]);

  useEffect(() => {
    return () => {
      solidMuscleMat.dispose();
    };
  }, [solidMuscleMat]);

  // Update dynamic solid color pulse and concentric expansion
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime() * (isPlaying ? playbackSpeed : 0);
    const cycle = (Math.sin(time * 2.2) + 1) / 2;

    if (isHighlighted && solidMuscleMat) {
      const pulse = Math.sin(time * 3 * currentPace) * 0.12 + (isPrimary ? 0.46 : 0.32);
      solidMuscleMat.emissiveIntensity = pulse;
    }

    // Dynamic hypertrophic swelling during concentric peak contraction
    if (isPrimary && isPlaying) {
      const contractionSwell = 1.0 + cycle * 0.08; // 8% volume expansion
      meshRef.current.scale.set(
        scale[0] * contractionSwell,
        scale[1] * (1.0 + cycle * 0.02),
        scale[2] * contractionSwell
      );
    } else if (isSecondary && isPlaying) {
      const synergistSwell = 1.0 + cycle * 0.03; // 3% synergist tension
      meshRef.current.scale.set(
        scale[0] * synergistSwell,
        scale[1] * synergistSwell,
        scale[2] * synergistSwell
      );
    } else {
      meshRef.current.scale.set(scale[0], scale[1], scale[2]);
    }
  });

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.userData.muscleTag = muscleTag;
    }
  }, [muscleTag]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={solidMuscleMat}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
      userData={{ muscleTag }}
    />
  );
}

// ============================================================================
// VERTEX WEIGHT RECALIBRATION FOR JOINT VOLUME PRESERVATION (ELBOWS & KNEES)
// Mitigates linear blend skinning volume loss, candy-wrapper twisting, and pinching
// ============================================================================

export interface JointWeightRecalibrationOptions {
  preserveElbowVolume?: boolean;
  preserveKneeVolume?: boolean;
  smoothingStrength?: number;       // Blending factor (0.0 to 1.0, default 0.65)
  curvaturePreservation?: number;   // Curvature volume preservation factor (default 0.75)
  transitionRadiusScale?: number;   // Spatial search multiplier for joint envelope (default 1.0)
}

/**
 * Recalibrates skin weights on SkinnedMesh instances within a GLTF scene or object.
 * Prevents geometric joint collapse ("candy-wrapper" artifact and volume pinching)
 * at the elbows and knees during high-angle flexion in exercise demonstrations,
 * preserving anatomical muscle bulk, continuous contours, and natural deformation.
 */
export function recalibrateJointSkinWeights(
  root: THREE.Object3D,
  options?: JointWeightRecalibrationOptions
): { calibratedMeshesCount: number; affectedVerticesCount: number } {
  const {
    preserveElbowVolume = true,
    preserveKneeVolume = true,
    smoothingStrength = 0.65,
    curvaturePreservation = 0.75,
    transitionRadiusScale = 1.0,
  } = options || {};

  let calibratedMeshesCount = 0;
  let affectedVerticesCount = 0;

  root.traverse((child) => {
    if (!(child as THREE.SkinnedMesh).isSkinnedMesh) return;

    const skinnedMesh = child as THREE.SkinnedMesh;
    const geometry = skinnedMesh.geometry;
    if (!geometry || !geometry.attributes?.skinIndex || !geometry.attributes?.skinWeight) return;

    const skeleton = skinnedMesh.skeleton;
    if (!skeleton || !skeleton.bones || skeleton.bones.length === 0) return;

    const bones = skeleton.bones;

    // Helper to find matching bone index by name substrings
    const findBoneIndices = (patterns: string[]): number[] => {
      const indices: number[] = [];
      bones.forEach((bone, idx) => {
        const name = (bone.name || '').toLowerCase();
        if (patterns.some((p) => name.includes(p.toLowerCase()))) {
          indices.push(idx);
        }
      });
      return indices;
    };

    interface JointPair {
      name: string;
      proximal: number[];
      distal: number[];
      type: 'elbow' | 'knee';
    }

    const jointPairs: JointPair[] = [];

    if (preserveElbowVolume) {
      // Left Elbow: Left Arm / UpperArm <-> Left Forearm / LowerArm
      const lArm = findBoneIndices(['leftarm', 'arm.l', 'arm_l', 'upperarm.l', 'upperarm_l', 'shoulder.l', 'left_arm', 'leftupperarm', 'arm']);
      const lForearm = findBoneIndices(['leftforearm', 'forearm.l', 'forearm_l', 'lowerarm.l', 'lowerarm_l', 'left_forearm', 'leftlowerarm', 'forearm', 'lowerarm']);
      if (lArm.length > 0 && lForearm.length > 0) {
        jointPairs.push({ name: 'Left Elbow', proximal: lArm, distal: lForearm, type: 'elbow' });
      }

      // Right Elbow: Right Arm / UpperArm <-> Right Forearm / LowerArm
      const rArm = findBoneIndices(['rightarm', 'arm.r', 'arm_r', 'upperarm.r', 'upperarm_r', 'shoulder.r', 'right_arm', 'rightupperarm', 'arm']);
      const rForearm = findBoneIndices(['rightforearm', 'forearm.r', 'forearm_r', 'lowerarm.r', 'lowerarm_r', 'right_forearm', 'rightlowerarm', 'forearm', 'lowerarm']);
      if (rArm.length > 0 && rForearm.length > 0) {
        jointPairs.push({ name: 'Right Elbow', proximal: rArm, distal: rForearm, type: 'elbow' });
      }
    }

    if (preserveKneeVolume) {
      // Left Knee: Left UpLeg / Thigh <-> Left Leg / Shin / Calf
      const lThigh = findBoneIndices(['leftupleg', 'upleg.l', 'upleg_l', 'thigh.l', 'thigh_l', 'femur.l', 'femur_l', 'left_thigh', 'leftthigh', 'thigh', 'upleg']);
      const lShin = findBoneIndices(['leftleg', 'leg.l', 'leg_l', 'shin.l', 'shin_l', 'calf.l', 'calf_l', 'tibia.l', 'tibia_l', 'left_leg', 'leftshin', 'shin', 'calf', 'leg']);
      if (lThigh.length > 0 && lShin.length > 0) {
        jointPairs.push({ name: 'Left Knee', proximal: lThigh, distal: lShin, type: 'knee' });
      }

      // Right Knee: Right UpLeg / Thigh <-> Right Leg / Shin / Calf
      const rThigh = findBoneIndices(['rightupleg', 'upleg.r', 'upleg_r', 'thigh.r', 'thigh_r', 'femur.r', 'femur_r', 'right_thigh', 'rightthigh', 'thigh', 'upleg']);
      const rShin = findBoneIndices(['rightleg', 'leg.r', 'leg_r', 'shin.r', 'shin_r', 'calf.r', 'calf_r', 'tibia.r', 'tibia_r', 'right_leg', 'rightshin', 'shin', 'calf', 'leg']);
      if (rThigh.length > 0 && rShin.length > 0) {
        jointPairs.push({ name: 'Right Knee', proximal: rThigh, distal: rShin, type: 'knee' });
      }
    }

    if (jointPairs.length === 0) return;

    const skinIndexAttr = geometry.attributes?.skinIndex;
    const skinWeightAttr = geometry.attributes?.skinWeight;
    const positionAttr = geometry.attributes?.position;
    const vertexCount = positionAttr ? positionAttr.count : skinWeightAttr.count;

    let modified = false;

    // Precalculate bone pivot positions in mesh local coordinates
    const invMeshWorld = new THREE.Matrix4().copy(skinnedMesh.matrixWorld).invert();
    const boneLocalPositions = bones.map((b) => {
      const v = new THREE.Vector3();
      b.getWorldPosition(v);
      return v.applyMatrix4(invMeshWorld);
    });

    for (let i = 0; i < vertexCount; i++) {
      const idx0 = skinIndexAttr.getX(i);
      const idx1 = skinIndexAttr.getY(i);
      const idx2 = skinIndexAttr.getZ(i);
      const idx3 = skinIndexAttr.getW(i);

      let w0 = skinWeightAttr.getX(i);
      let w1 = skinWeightAttr.getY(i);
      let w2 = skinWeightAttr.getZ(i);
      let w3 = skinWeightAttr.getW(i);

      let vertexAdjusted = false;

      for (const joint of jointPairs) {
        let proxWeight = 0;
        let distWeight = 0;
        let proxSlot = -1;
        let distSlot = -1;

        const checkSlot = (slot: number, boneIdx: number, weight: number) => {
          if (joint.proximal.includes(boneIdx)) {
            proxWeight += weight;
            if (proxSlot === -1) proxSlot = slot;
          } else if (joint.distal.includes(boneIdx)) {
            distWeight += weight;
            if (distSlot === -1) distSlot = slot;
          }
        };

        checkSlot(0, idx0, w0);
        checkSlot(1, idx1, w1);
        checkSlot(2, idx2, w2);
        checkSlot(3, idx3, w3);

        const totalJointWeight = proxWeight + distWeight;

        // Condition 1: Vertex in the joint blend zone (influenced by both proximal and distal bones)
        if (totalJointWeight > 0.05 && proxWeight > 0.02 && distWeight > 0.02) {
          const t = distWeight / totalJointWeight;

          // Non-linear Hermite S-curve volume preservation
          const sCurve = 0.5 - 0.5 * Math.cos(Math.PI * t);
          const hermite = t * t * (3 - 2 * t);
          const targetT = sCurve * 0.5 + hermite * 0.5;

          const blendedT = t * (1.0 - smoothingStrength) + targetT * smoothingStrength;

          // Volume expansion factor counteracting the ~30% LBS volume loss at inflection
          const volumePreservationFactor = 1.0 + Math.sin(Math.PI * blendedT) * (0.18 * curvaturePreservation);

          const newProx = totalJointWeight * (1.0 - blendedT) * volumePreservationFactor;
          const newDist = totalJointWeight * blendedT * volumePreservationFactor;

          if (proxSlot === 0) w0 = newProx;
          else if (proxSlot === 1) w1 = newProx;
          else if (proxSlot === 2) w2 = newProx;
          else if (proxSlot === 3) w3 = newProx;

          if (distSlot === 0) w0 = newDist;
          else if (distSlot === 1) w1 = newDist;
          else if (distSlot === 2) w2 = newDist;
          else if (distSlot === 3) w3 = newDist;

          vertexAdjusted = true;
          break;
        }

        // Condition 2: Spatial proximity to the joint pivot center (remedying rigid unblended creases)
        if (positionAttr && totalJointWeight > 0.70 && (proxWeight > 0.65 || distWeight > 0.65)) {
          const distalBoneIdx = joint.distal[0];
          if (distalBoneIdx !== undefined) {
            const jointPivot = boneLocalPositions[distalBoneIdx];
            const vx = positionAttr.getX(i);
            const vy = positionAttr.getY(i);
            const vz = positionAttr.getZ(i);

            const dx = vx - jointPivot.x;
            const dy = vy - jointPivot.y;
            const dz = vz - jointPivot.z;
            const distToJoint = Math.sqrt(dx * dx + dy * dy + dz * dz);

            const jointRadius = (joint.type === 'knee' ? 0.14 : 0.09) * transitionRadiusScale;

            if (distToJoint < jointRadius) {
              const blendRatio = Math.pow(1.0 - distToJoint / jointRadius, 2) * 0.55 * smoothingStrength;

              if (proxWeight > distWeight && distSlot !== -1) {
                const transfer = proxWeight * blendRatio;
                if (proxSlot === 0) w0 -= transfer;
                else if (proxSlot === 1) w1 -= transfer;
                else if (proxSlot === 2) w2 -= transfer;
                else if (proxSlot === 3) w3 -= transfer;

                if (distSlot === 0) w0 += transfer;
                else if (distSlot === 1) w1 += transfer;
                else if (distSlot === 2) w2 += transfer;
                else if (distSlot === 3) w3 += transfer;
                vertexAdjusted = true;
              } else if (distWeight > proxWeight && proxSlot !== -1) {
                const transfer = distWeight * blendRatio;
                if (distSlot === 0) w0 -= transfer;
                else if (distSlot === 1) w1 -= transfer;
                else if (distSlot === 2) w2 -= transfer;
                else if (distSlot === 3) w3 -= transfer;

                if (proxSlot === 0) w0 += transfer;
                else if (proxSlot === 1) w1 += transfer;
                else if (proxSlot === 2) w2 += transfer;
                else if (proxSlot === 3) w3 += transfer;
                vertexAdjusted = true;
              }
            }
          }
        }
      }

      if (vertexAdjusted) {
        // Strict normalization: sum of all 4 weights must equal 1.0
        const sum = Math.max(0.0001, w0 + w1 + w2 + w3);
        const norm0 = Math.max(0, w0 / sum);
        const norm1 = Math.max(0, w1 / sum);
        const norm2 = Math.max(0, w2 / sum);
        const norm3 = Math.max(0, w3 / sum);

        skinWeightAttr.setXYZW(i, norm0, norm1, norm2, norm3);
        affectedVerticesCount++;
        modified = true;
      }
    }

    if (modified) {
      skinWeightAttr.needsUpdate = true;
      calibratedMeshesCount++;
    }
  });

  return { calibratedMeshesCount, affectedVerticesCount };
}

// ============================================================================
// DYNAMIC JOINT VERTEX WEIGHT INTERPOLATION & VOLUME PRESERVATION (ELBOWS & KNEES)
// Continuously recalculates vertex weights and volumetric dilation during runtime
// animations as the joint angle changes, preventing LBS pinching & cross-section collapse.
// ============================================================================

export interface DynamicJointInterpolationOptions {
  preserveElbows?: boolean;
  preserveKnees?: boolean;
  volumeCompensationFactor?: number; // 0.0 to 1.0, default 0.85
  flexionThresholdRad?: number;      // Minimum radians before dynamic interpolation engages (default ~0.08 rad)
}

interface DynamicJointVertexData {
  vertexIndex: number;
  proxSlot: number;
  distSlot: number;
  baseProxWeight: number;
  baseDistWeight: number;
  totalJointWeight: number;
  baseRatio: number;
  otherSlots: { slot: number; weight: number }[];
}

interface DynamicJointBinding {
  type: 'elbow' | 'knee';
  name: string;
  proximalBone: THREE.Bone;
  distalBone: THREE.Bone;
  vertices: DynamicJointVertexData[];
}

interface SkinnedMeshJointCache {
  bindings: DynamicJointBinding[];
  initialized: boolean;
}

const _vProx = new THREE.Vector3();
const _vDist = new THREE.Vector3();

function initSkinnedMeshJointCache(
  skinnedMesh: THREE.SkinnedMesh,
  options?: DynamicJointInterpolationOptions
): SkinnedMeshJointCache {
  const { preserveElbows = true, preserveKnees = true } = options || {};

  const skeleton = skinnedMesh.skeleton;
  const geometry = skinnedMesh.geometry;
  if (!skeleton || !skeleton.bones || !geometry || !geometry.attributes?.skinIndex || !geometry.attributes?.skinWeight) {
    return { bindings: [], initialized: true };
  }

  const bones = skeleton.bones;
  const skinIndexAttr = geometry.attributes?.skinIndex;
  const skinWeightAttr = geometry.attributes?.skinWeight;
  const count = skinWeightAttr.count;

  const findBone = (patterns: string[]): { bone: THREE.Bone; index: number } | null => {
    for (let idx = 0; idx < bones.length; idx++) {
      const name = (bones[idx].name || '').toLowerCase();
      if (patterns.some((p) => name.includes(p.toLowerCase()))) {
        return { bone: bones[idx], index: idx };
      }
    }
    return null;
  };

  const rawJoints: { name: string; type: 'elbow' | 'knee'; prox: { bone: THREE.Bone; index: number } | null; dist: { bone: THREE.Bone; index: number } | null }[] = [];

  if (preserveElbows) {
    rawJoints.push({
      name: 'Left Elbow',
      type: 'elbow',
      prox: findBone(['leftarm', 'arm.l', 'arm_l', 'upperarm.l', 'upperarm_l', 'shoulder.l', 'left_arm', 'leftupperarm']),
      dist: findBone(['leftforearm', 'forearm.l', 'forearm_l', 'lowerarm.l', 'lowerarm_l', 'left_forearm', 'leftlowerarm']),
    });
    rawJoints.push({
      name: 'Right Elbow',
      type: 'elbow',
      prox: findBone(['rightarm', 'arm.r', 'arm_r', 'upperarm.r', 'upperarm_r', 'shoulder.r', 'right_arm', 'rightupperarm']),
      dist: findBone(['rightforearm', 'forearm.r', 'forearm_r', 'lowerarm.r', 'lowerarm_r', 'right_forearm', 'rightlowerarm']),
    });
  }

  if (preserveKnees) {
    rawJoints.push({
      name: 'Left Knee',
      type: 'knee',
      prox: findBone(['leftupleg', 'upleg.l', 'upleg_l', 'thigh.l', 'thigh_l', 'femur.l', 'femur_l', 'left_thigh', 'leftthigh']),
      dist: findBone(['leftleg', 'leg.l', 'leg_l', 'shin.l', 'shin_l', 'calf.l', 'calf_l', 'tibia.l', 'tibia_l', 'left_leg', 'leftshin']),
    });
    rawJoints.push({
      name: 'Right Knee',
      type: 'knee',
      prox: findBone(['rightupleg', 'upleg.r', 'upleg_r', 'thigh.r', 'thigh_r', 'femur.r', 'femur_r', 'right_thigh', 'rightthigh']),
      dist: findBone(['rightleg', 'leg.r', 'leg_r', 'shin.r', 'shin_r', 'calf.r', 'calf_r', 'tibia.r', 'tibia_r', 'right_leg', 'rightshin']),
    });
  }

  const bindings: DynamicJointBinding[] = [];

  for (const j of rawJoints) {
    if (!j.prox || !j.dist) continue;
    const proxIdx = j.prox.index;
    const distIdx = j.dist.index;

    const vertices: DynamicJointVertexData[] = [];

    for (let i = 0; i < count; i++) {
      const i0 = (skinIndexAttr as any).getX(i);
      const i1 = (skinIndexAttr as any).getY(i);
      const i2 = (skinIndexAttr as any).getZ(i);
      const i3 = (skinIndexAttr as any).getW(i);

      const w0 = (skinWeightAttr as any).getX(i);
      const w1 = (skinWeightAttr as any).getY(i);
      const w2 = (skinWeightAttr as any).getZ(i);
      const w3 = (skinWeightAttr as any).getW(i);

      let proxSlot = -1;
      let distSlot = -1;
      let proxWeight = 0;
      let distWeight = 0;
      const otherSlots: { slot: number; weight: number }[] = [];

      const check = (slot: number, bIdx: number, w: number) => {
        if (bIdx === proxIdx) {
          proxSlot = slot;
          proxWeight = w;
        } else if (bIdx === distIdx) {
          distSlot = slot;
          distWeight = w;
        } else if (w > 0.001) {
          otherSlots.push({ slot, weight: w });
        }
      };

      check(0, i0, w0);
      check(1, i1, w1);
      check(2, i2, w2);
      check(3, i3, w3);

      const totalJoint = proxWeight + distWeight;
      if (totalJoint > 0.08 && proxSlot !== -1 && distSlot !== -1 && proxWeight > 0.02 && distWeight > 0.02) {
        vertices.push({
          vertexIndex: i,
          proxSlot,
          distSlot,
          baseProxWeight: proxWeight,
          baseDistWeight: distWeight,
          totalJointWeight: totalJoint,
          baseRatio: distWeight / totalJoint,
          otherSlots,
        });
      }
    }

    if (vertices.length > 0) {
      bindings.push({
        type: j.type,
        name: j.name,
        proximalBone: j.prox.bone,
        distalBone: j.dist.bone,
        vertices,
      });
    }
  }

  const cache = { bindings, initialized: true };
  (skinnedMesh.userData as any).__dynamicJointCache = cache;
  return cache;
}

/**
 * Dynamically interpolates vertex weights on GLTF SkinnedMesh joints in real-time
 * as bones rotate during animations. Applies Pose-Space non-linear volumetric dilation
 * at the inflection zones of elbows and knees to prevent LBS cross-section pinching.
 */
export function interpolateDynamicJointWeights(
  root: THREE.Object3D,
  options?: DynamicJointInterpolationOptions
): void {
  const {
    volumeCompensationFactor = 0.85,
    flexionThresholdRad = 0.08,
  } = options || {};

  root.traverse((child) => {
    if (!(child as THREE.SkinnedMesh).isSkinnedMesh) return;
    const skinnedMesh = child as THREE.SkinnedMesh;

    let cache: SkinnedMeshJointCache = (skinnedMesh.userData as any).__dynamicJointCache;
    if (!cache || !cache.initialized) {
      cache = initSkinnedMeshJointCache(skinnedMesh, options);
    }

    if (!cache.bindings || cache.bindings.length === 0) return;

    const geometry = skinnedMesh.geometry;
    if (!geometry || !geometry.attributes?.skinWeight) return;
    const skinWeightAttr = geometry.attributes?.skinWeight;

    let meshNeedsUpdate = false;

    for (const binding of cache.bindings) {
      // Calculate real-time angle between proximal and distal bones in world coordinates
      binding.proximalBone.getWorldDirection(_vProx);
      binding.distalBone.getWorldDirection(_vDist);

      const dot = Math.max(-1.0, Math.min(1.0, _vProx.dot(_vDist)));
      const flexionAngle = Math.acos(dot); // 0.0 (extended) to ~3.14 (fully folded)

      // Only perform dynamic interpolation if the joint is actively flexed past threshold
      if (flexionAngle < flexionThresholdRad) continue;

      // Normalized flexion progression (0.0 = straight arm/leg, 1.0 = deep ~135°+ acute flexion)
      const flexion = Math.min(1.0, flexionAngle / 2.35);

      // In Linear Blend Skinning, volume loss is maximum at ~90-130° flexion
      // Non-linear Hermite S-curve weight redistribution dynamically modulated by flexion:
      const dynFactor = flexion * volumeCompensationFactor;

      for (let k = 0; k < binding.vertices.length; k++) {
        const v = binding.vertices[k];

        // S-curve and Hermite volumetric profile
        const sCurve = 0.5 - 0.5 * Math.cos(Math.PI * v.baseRatio);
        const hermite = v.baseRatio * v.baseRatio * (3 - 2 * v.baseRatio);
        const targetRatio = sCurve * 0.5 + hermite * 0.5;

        // Dynamic interpolation between rest ratio and target volumetric curve
        const dynamicRatio = v.baseRatio * (1.0 - dynFactor * 0.65) + targetRatio * (dynFactor * 0.65);

        // Hypertrophic volume dilation factor counteracting the cross-sectional collapse
        const dilation = 1.0 + Math.sin(Math.PI * dynamicRatio) * (0.22 * dynFactor);

        const newProx = v.totalJointWeight * (1.0 - dynamicRatio) * dilation;
        const newDist = v.totalJointWeight * dynamicRatio * dilation;

        let total = newProx + newDist;
        for (let o = 0; o < v.otherSlots.length; o++) {
          total += v.otherSlots[o].weight;
        }

        const invTotal = 1.0 / Math.max(0.0001, total);
        const finalProx = newProx * invTotal;
        const finalDist = newDist * invTotal;

        // Write directly to component slots
        if (v.proxSlot === 0) (skinWeightAttr as any).setX(v.vertexIndex, finalProx);
        else if (v.proxSlot === 1) (skinWeightAttr as any).setY(v.vertexIndex, finalProx);
        else if (v.proxSlot === 2) (skinWeightAttr as any).setZ(v.vertexIndex, finalProx);
        else if (v.proxSlot === 3) (skinWeightAttr as any).setW(v.vertexIndex, finalProx);

        if (v.distSlot === 0) (skinWeightAttr as any).setX(v.vertexIndex, finalDist);
        else if (v.distSlot === 1) (skinWeightAttr as any).setY(v.vertexIndex, finalDist);
        else if (v.distSlot === 2) (skinWeightAttr as any).setZ(v.vertexIndex, finalDist);
        else if (v.distSlot === 3) (skinWeightAttr as any).setW(v.vertexIndex, finalDist);

        meshNeedsUpdate = true;
      }
    }

    if (meshNeedsUpdate) {
      skinWeightAttr.needsUpdate = true;
    }
  });
}

// ============================================================================
// MODEL POOLING & GPU VRAM RETENTION SYSTEM (Male & Female Variants via Draco)
// Keeps decompressed Draco GLTF models for Male & Female variants resident in
// GPU video memory to enable instant, zero-latency gender toggling without re-parsing.
// ============================================================================

export interface PooledModelAsset {
  gender: 'male' | 'female';
  url: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  isRecalibrated: boolean;
  cachedAt: number;
}

class AvatarModelPoolManager {
  private static instance: AvatarModelPoolManager | null = null;
  private pool: Map<string, PooledModelAsset> = new Map();
  private dracoLoader: DRACOLoader | null = null;
  private gltfLoader: GLTFLoader | null = null;
  private pendingLoads: Map<string, Promise<PooledModelAsset>> = new Map();

  private constructor() {
    if (typeof window !== 'undefined') {
      try {
        const draco = new DRACOLoader();
        draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        draco.setDecoderConfig({ type: 'js' });
        this.dracoLoader = draco;

        const gltf = new GLTFLoader();
        gltf.setDRACOLoader(draco);
        this.gltfLoader = gltf;
      } catch (err) {
        console.warn('Draco loader init warning:', err);
      }
    }
  }

  public static getInstance(): AvatarModelPoolManager {
    if (!AvatarModelPoolManager.instance) {
      AvatarModelPoolManager.instance = new AvatarModelPoolManager();
    }
    return AvatarModelPoolManager.instance;
  }

  private getKey(gender: 'male' | 'female', url?: string): string {
    return `${gender}:${url || 'default'}`;
  }

  public has(gender: 'male' | 'female', url?: string): boolean {
    return this.pool.has(this.getKey(gender, url));
  }

  public get(gender: 'male' | 'female', url?: string): PooledModelAsset | undefined {
    return this.pool.get(this.getKey(gender, url));
  }

  public set(gender: 'male' | 'female', url: string, asset: PooledModelAsset): void {
    // Keep buffers resident in GPU video memory by configuring StaticDrawUsage and marking keepInVRAM
    asset.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          (mesh.geometry as any).keepInVRAM = true;
          const setUsage = (attr: any) => {
            if (attr) {
              if ('usage' in attr) attr.usage = THREE.StaticDrawUsage;
              if (attr.data && 'usage' in attr.data) attr.data.usage = THREE.StaticDrawUsage;
            }
          };
          setUsage(mesh.geometry.attributes?.position);
          setUsage(mesh.geometry.attributes?.normal);
          setUsage(mesh.geometry.attributes?.skinWeight);
          setUsage(mesh.geometry.attributes?.skinIndex);
        }
      }
    });

    this.pool.set(this.getKey(gender, url), asset);
  }

  public async preloadModel(gender: 'male' | 'female', url: string): Promise<PooledModelAsset | null> {
    const key = this.getKey(gender, url);
    if (this.pool.has(key)) {
      return this.pool.get(key)!;
    }
    if (this.pendingLoads.has(key)) {
      return this.pendingLoads.get(key)!;
    }
    if (!this.gltfLoader) return null;

    const promise = new Promise<PooledModelAsset>((resolve, reject) => {
      this.gltfLoader!.load(
        url,
        (gltf) => {
          const scene = gltf.scene;
          recalibrateJointSkinWeights(scene, {
            preserveElbowVolume: true,
            preserveKneeVolume: true,
            smoothingStrength: 0.999,
            curvaturePreservation: 0.999,
            transitionRadiusScale: 2.0,
          });

          const asset: PooledModelAsset = {
            gender,
            url,
            scene,
            animations: gltf.animations || [],
            isRecalibrated: true,
            cachedAt: Date.now(),
          };

          this.set(gender, url, asset);
          this.pendingLoads.delete(key);
          resolve(asset);
        },
        undefined,
        (error) => {
          this.pendingLoads.delete(key);
          reject(error);
        }
      );
    });

    this.pendingLoads.set(key, promise);
    return promise;
  }

  public preloadBothGenders(maleUrl?: string, femaleUrl?: string): void {
    if (maleUrl) {
      this.preloadModel('male', maleUrl).catch(() => {});
      try {
        useGLTF.preload(maleUrl, true);
      } catch {}
    }
    if (femaleUrl) {
      this.preloadModel('female', femaleUrl).catch(() => {});
      try {
        useGLTF.preload(femaleUrl, true);
      } catch {}
    }
  }

  public clear(): void {
    this.pool.forEach((item) => {
      item.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
            else mesh.material.dispose();
          }
        }
      });
    });
    this.pool.clear();
    this.pendingLoads.clear();
  }
}

export const avatarModelPool = AvatarModelPoolManager.getInstance();

// ============================================================================
// SINGLE GLTF MODEL INSTANCE (Resident in VRAM)
// ============================================================================
function SingleGLTFModelInstance({
  modelUrl,
  gender,
  isVisible,
  animationAsset,
  isPlaying,
  resolvedPace,
  currentPace,
  cameraViewFloat,
  activeMuscles,
  secondaryMuscles,
  highlightMode,
  effPrimary,
  effSecondary,
  hoveredMuscle,
  pulsingMuscle,
  onMuscleHover,
  onMuscleClick,
}: {
  modelUrl: string;
  gender: 'male' | 'female';
  isVisible: boolean;
  animationAsset?: string;
  isPlaying: boolean;
  resolvedPace: number;
  currentPace: number;
  cameraViewFloat: number;
  activeMuscles: string[];
  secondaryMuscles: string[];
  highlightMode: MuscleHighlightMode;
  effPrimary: string;
  effSecondary: string;
  hoveredMuscle?: string | null;
  pulsingMuscle?: string | null;
  onMuscleHover?: (muscle: string | null) => void;
  onMuscleClick?: (muscle: string) => void;
}) {
  // useGLTF with 'true' enables DRACOLoader automatically via @react-three/drei
  const gltf = useGLTF(modelUrl, true);
  const groupRef = useRef<THREE.Group>(null);
  const shaderMaterialsRef = useRef<MuscleHighlightShaderMaterial[]>([]);
  const sweatTimeRef = useRef(0);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);

  // Clone scene once, recalibrate weights, and register into VRAM resident pool
  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    recalibrateJointSkinWeights(clone, {
      preserveElbowVolume: true,
      preserveKneeVolume: true,
      smoothingStrength: 0.999,
      curvaturePreservation: 0.999,
      transitionRadiusScale: 2.0,
    });

    clone.traverse((child: any) => {
      if (child.isMesh && child.geometry?.morphAttributes?.position) {
        if (!child.morphTargetInfluences || child.morphTargetInfluences.length === 0) {
          child.updateMorphTargets();
        }
      }
    });

    avatarModelPool.set(gender, modelUrl, {
      gender,
      url: modelUrl,
      scene: clone,
      animations: gltf.animations || [],
      isRecalibrated: true,
      cachedAt: Date.now(),
    });

    return clone;
  }, [gltf.scene, gender, modelUrl]);

  // Animation Mixer
  useEffect(() => {
    if (!clonedScene || !gltf.animations || gltf.animations.length === 0) return;
    const mixer = new THREE.AnimationMixer(clonedScene);
    mixerRef.current = mixer;

    let clip = gltf.animations[0];
    if (animationAsset) {
      const found = gltf.animations.find((c) => c.name.toLowerCase().includes(animationAsset.toLowerCase()));
      if (found) clip = found;
    }

    const action = mixer.clipAction(clip);
    action.reset().fadeIn(0.4).play();
    activeActionRef.current = action;

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
      activeActionRef.current = null;
    };
  }, [clonedScene, gltf.animations, animationAsset]);

  useEffect(() => {
    if (!mixerRef.current || !gltf.animations || gltf.animations.length === 0) return;
    let clip = gltf.animations[0];
    if (animationAsset) {
      const found = gltf.animations.find((c) => c.name.toLowerCase().includes(animationAsset.toLowerCase()));
      if (found) clip = found;
    }

    const newAction = mixerRef.current.clipAction(clip);
    if (activeActionRef.current && activeActionRef.current !== newAction) {
      newAction.reset();
      newAction.setEffectiveWeight(1.0);
      activeActionRef.current.crossFadeTo(newAction, 0.35, true);
      newAction.play();
      activeActionRef.current = newAction;
    } else if (!activeActionRef.current) {
      newAction.reset().fadeIn(0.3).play();
      activeActionRef.current = newAction;
    }
  }, [animationAsset, gltf.animations]);

  // Attach ShaderMaterials to matching muscle meshes
  useEffect(() => {
    if (!clonedScene) return;
    shaderMaterialsRef.current.forEach((m) => m.dispose());
    shaderMaterialsRef.current = [];

    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = (mesh.name || '').toLowerCase();
        const isHover = Boolean(hoveredMuscle && (name.includes(hoveredMuscle.toLowerCase()) || isMuscleMatching(name, [hoveredMuscle])));
        const isPulse = Boolean(pulsingMuscle && (name.includes(pulsingMuscle.toLowerCase()) || isMuscleMatching(name, [pulsingMuscle])));
        const isPrim = isMuscleMatching(name, activeMuscles);
        const isSec = !isPrim && isMuscleMatching(name, secondaryMuscles);

        let shouldHighlight = false;
        let isPrimary = false;

        if (isHover || isPulse) {
          shouldHighlight = true;
          isPrimary = true;
        } else if (highlightMode === 'primary-only') {
          shouldHighlight = isPrim;
          isPrimary = true;
        } else if (highlightMode === 'secondary-only') {
          shouldHighlight = isSec;
          isPrimary = false;
        } else if (highlightMode === 'none') {
          shouldHighlight = false;
        } else {
          shouldHighlight = isPrim || isSec;
          isPrimary = isPrim;
        }

        if (shouldHighlight) {
          const shaderMat = new MuscleHighlightShaderMaterial({
            isPrimary,
            cameraView: cameraViewFloat,
            exercisePace: currentPace,
            uHighlightColorPrimary: effPrimary,
            uHighlightColorSecondary: effSecondary,
          });
          shaderMaterialsRef.current.push(shaderMat);
          mesh.material = shaderMat;
        } else {
          // Clean matte white material for non-highlighted body parts
          mesh.material = new THREE.MeshStandardMaterial({
            color: '#f8fafc',
            roughness: 0.85,
            metalness: 0.05,
          });
        }
      }
    });

    return () => {
      shaderMaterialsRef.current.forEach((m) => m.dispose());
      shaderMaterialsRef.current = [];
    };
  }, [clonedScene, activeMuscles, secondaryMuscles, highlightMode, hoveredMuscle, pulsingMuscle, cameraViewFloat, effPrimary, effSecondary, currentPace]);

  // Frame loop: update animations and pulse on the instance
  useFrame((state, delta) => {
    if (!isVisible) return;
    const time = state.clock.getElapsedTime();
    const cycle = (Math.sin(time * 2.2 * (isPlaying ? resolvedPace : 0)) + 1) / 2;

    if (mixerRef.current && isPlaying) {
      mixerRef.current.update(delta * resolvedPace);
      // Dynamically interpolate joint vertex weights based on live flexion angle to preserve volume
      interpolateDynamicJointWeights(clonedScene);
    }

    shaderMaterialsRef.current.forEach((mat) => {
      mat.updateTimeAndContraction(time, cycle, currentPace);
      mat.uniforms.uSweatIntensity.value = Math.min(1.0, sweatTimeRef.current * 0.05);
      mat.uniforms.uCameraView.value = cameraViewFloat;
      if (effPrimary) mat.setHighlightColorPrimary(effPrimary);
      if (effSecondary) mat.setHighlightColorSecondary(effSecondary);
    });

    if (isPlaying) {
      sweatTimeRef.current += delta;
    } else {
      sweatTimeRef.current = Math.max(0, sweatTimeRef.current - delta * 0.5);
    }

    if (groupRef.current && isPlaying && pulsingMuscle) {
      const pulse = 1 + Math.sin(time * 6 * resolvedPace) * 0.03;
      groupRef.current.scale.set(1, 1, 1).multiplyScalar(pulse);
    }
  });

  return (
    <primitive
      ref={groupRef}
      object={clonedScene}
      position={[0, -0.3, 0]}
      visible={isVisible}
      onPointerOver={(e: any) => {
        if (!isVisible) return;
        e.stopPropagation();
        if (e.object?.name && onMuscleHover) {
          onMuscleHover(e.object.name);
        }
      }}
      onPointerOut={(e: any) => {
        if (!isVisible) return;
        e.stopPropagation();
        if (onMuscleHover) onMuscleHover(null);
      }}
      onClick={(e: any) => {
        if (!isVisible) return;
        e.stopPropagation();
        if (e.object?.name && onMuscleClick) {
          onMuscleClick(e.object.name);
        }
      }}
    />
  );
}

// ============================================================================
// POOLED GLTF ANATOMICAL MODEL
// Hosts both Male and Female models simultaneously in GPU memory.
// Switching gender modifies visibility without unmounting or re-parsing geometry.
// ============================================================================
export function PooledGLTFAnatomicalModel({
  maleModelUrl,
  femaleModelUrl,
  modelUrl,
  activeGender = 'male',
  animationAsset,
  isPlaying = true,
  playbackSpeed = 1,
  exercisePace,
  cameraView = 'front',
  activeMuscles = [],
  secondaryMuscles = [],
  highlightMode = 'all',
  uHighlightColorPrimary,
  uHighlightColorSecondary,
  highlightColorPrimary,
  highlightColorSecondary,
  hoveredMuscle = null,
  pulsingMuscle = null,
  onMuscleHover,
  onMuscleClick,
}: {
  maleModelUrl?: string;
  femaleModelUrl?: string;
  modelUrl?: string;
  activeGender: 'male' | 'female';
  animationAsset?: string;
  isPlaying?: boolean;
  playbackSpeed?: number;
  exercisePace?: number;
  cameraView?: 'front' | 'side' | 'detail' | 'back';
  activeMuscles?: string[];
  secondaryMuscles?: string[];
  highlightMode?: MuscleHighlightMode;
  uHighlightColorPrimary?: string;
  uHighlightColorSecondary?: string;
  highlightColorPrimary?: string;
  highlightColorSecondary?: string;
  hoveredMuscle?: string | null;
  pulsingMuscle?: string | null;
  onMuscleHover?: (muscle: string | null) => void;
  onMuscleClick?: (muscle: string) => void;
}) {
  const resolvedMaleUrl = maleModelUrl || modelUrl;
  const resolvedFemaleUrl = femaleModelUrl || modelUrl;

  const cameraViewFloat = useMemo(() => {
    if (cameraView === 'side') return 1.0;
    if (cameraView === 'detail') return 2.0;
    if (cameraView === 'back') return 3.0;
    return 0.0;
  }, [cameraView]);

  const effPrimary = uHighlightColorPrimary || highlightColorPrimary || '#ff0033';
  const effSecondary = uHighlightColorSecondary || highlightColorSecondary || '#ff6a00';
  const resolvedPace = exercisePace ?? playbackSpeed ?? 1.0;
  const currentPace = isPlaying ? resolvedPace : 0.2;

  // Single shared URL fallback if male and female point to the same file
  const isSameUrl = Boolean(resolvedMaleUrl && resolvedFemaleUrl && resolvedMaleUrl === resolvedFemaleUrl);

  return (
    <group>
      {isSameUrl && resolvedMaleUrl ? (
        <SingleGLTFModelInstance
          modelUrl={resolvedMaleUrl}
          gender={activeGender}
          isVisible={true}
          animationAsset={animationAsset}
          isPlaying={isPlaying}
          resolvedPace={resolvedPace}
          currentPace={currentPace}
          cameraViewFloat={cameraViewFloat}
          activeMuscles={activeMuscles}
          secondaryMuscles={secondaryMuscles}
          highlightMode={highlightMode}
          effPrimary={effPrimary}
          effSecondary={effSecondary}
          hoveredMuscle={hoveredMuscle}
          pulsingMuscle={pulsingMuscle}
          onMuscleHover={onMuscleHover}
          onMuscleClick={onMuscleClick}
        />
      ) : (
        <>
          {resolvedMaleUrl && (
            <SingleGLTFModelInstance
              modelUrl={resolvedMaleUrl}
              gender="male"
              isVisible={activeGender === 'male'}
              animationAsset={animationAsset}
              isPlaying={isPlaying}
              resolvedPace={resolvedPace}
              currentPace={currentPace}
              cameraViewFloat={cameraViewFloat}
              activeMuscles={activeMuscles}
              secondaryMuscles={secondaryMuscles}
              highlightMode={highlightMode}
              effPrimary={effPrimary}
              effSecondary={effSecondary}
              hoveredMuscle={hoveredMuscle}
              pulsingMuscle={pulsingMuscle}
              onMuscleHover={onMuscleHover}
              onMuscleClick={onMuscleClick}
            />
          )}
          {resolvedFemaleUrl && (
            <SingleGLTFModelInstance
              modelUrl={resolvedFemaleUrl}
              gender="female"
              isVisible={activeGender === 'female'}
              animationAsset={animationAsset}
              isPlaying={isPlaying}
              resolvedPace={resolvedPace}
              currentPace={currentPace}
              cameraViewFloat={cameraViewFloat}
              activeMuscles={activeMuscles}
              secondaryMuscles={secondaryMuscles}
              highlightMode={highlightMode}
              effPrimary={effPrimary}
              effSecondary={effSecondary}
              hoveredMuscle={hoveredMuscle}
              pulsingMuscle={pulsingMuscle}
              onMuscleHover={onMuscleHover}
              onMuscleClick={onMuscleClick}
            />
          )}
        </>
      )}
    </group>
  );
}

// Backward-compatible single-model wrapper
export function GLTFAnatomicalModel(props: any) {
  return (
    <PooledGLTFAnatomicalModel
      {...props}
      activeGender={props.gender || 'male'}
      modelUrl={props.modelUrl}
    />
  );
}

// ============================================================================
// ANATOMICALLY CORRECT REALISTIC HUMAN BODY (Male & Female Variants)
// Zero robotic parts, organic muscle contours, and natural skeletal rig
// ============================================================================
function AnatomicalAvatarModel({
  exercise,
  gender = 'male',
  isPlaying = true,
  playbackSpeed = 1,
  exercisePace,
  cameraView = 'front',
  highlightMode = 'all',
  uHighlightColorPrimary,
  uHighlightColorSecondary,
  highlightColorPrimary,
  highlightColorSecondary,
  highlightOverride,
  hoveredMuscle,
  pulsingMuscle,
  onCycleUpdate,
  positiveFeedback = false,
  motivationalSmile = 0.0,
  lodScale = 1.0,
}: {
  exercise: DetailedExercise;
  gender: 'male' | 'female';
  isPlaying: boolean;
  playbackSpeed: number;
  exercisePace?: number;
  cameraView?: 'front' | 'side' | 'detail' | 'back';
  highlightMode?: MuscleHighlightMode;
  uHighlightColorPrimary?: string;
  uHighlightColorSecondary?: string;
  highlightColorPrimary?: string;
  highlightColorSecondary?: string;
  highlightOverride?: string | null;
  hoveredMuscle?: string | null;
  pulsingMuscle?: string | null;
  onCycleUpdate?: (cycle: number, phase: 'concentric' | 'eccentric', breath: 'inhale' | 'exhale') => void;
  positiveFeedback?: boolean;
  motivationalSmile?: number;
  lodScale?: number;
}) {
  const rootGroup = useRef<THREE.Group>(null);
  const spineGroup = useRef<THREE.Group>(null);
  const chestGroup = useRef<THREE.Group>(null);
  const leftShoulder = useRef<THREE.Group>(null);
  const rightShoulder = useRef<THREE.Group>(null);
  const leftElbow = useRef<THREE.Group>(null);
  const rightElbow = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftKnee = useRef<THREE.Group>(null);
  const rightKnee = useRef<THREE.Group>(null);

  const isFemale = gender === 'female';

  // Morphological parameters tailored for Male vs Female variants
  const shoulderOffset = isFemale ? 0.225 : 0.258;
  const hipOffset = isFemale ? 0.17 : 0.15;
  const torsoScale: [number, number, number] = isFemale ? [0.88, 1.0, 0.86] : [1.08, 1.0, 1.05];
  const chestScale: [number, number, number] = isFemale ? [0.88, 0.95, 0.92] : [1.06, 1.02, 1.04];
  const gluteScale: [number, number, number] = isFemale ? [1.14, 1.12, 1.18] : [1.0, 1.0, 1.0];
  const armThickness = isFemale ? 0.9 : 1.08;
  const legThickness = isFemale ? 0.96 : 1.06;

  // Sculpted anatomical geometries (Organic human atlas proportions matching reference image with dynamic LOD scaling)
  const geo = useMemo(() => ({
    // Head with natural cranial dome and jawline
    head: createSculptedHeadGeometry(lodScale),
    neck: createSculptedNeckGeometry(isFemale, lodScale),
    clavicles: createSculptedClaviclesGeometry(isFemale, lodScale),
    // Pectorals with organic sternal & clavicular sweep (left & right)
    pectoralLeft: createSculptedPectoralGeometry(true, isFemale, lodScale),
    pectoralRight: createSculptedPectoralGeometry(false, isFemale, lodScale),
    // Natural deltoids (three biomechanical heads: lateral, anterior, posterior)
    deltoidLateralLeft: createSculptedDeltoidGeometry('lateral', true, isFemale, lodScale),
    deltoidLateralRight: createSculptedDeltoidGeometry('lateral', false, isFemale, lodScale),
    deltoidAnteriorLeft: createSculptedDeltoidGeometry('anterior', true, isFemale, lodScale),
    deltoidAnteriorRight: createSculptedDeltoidGeometry('anterior', false, isFemale, lodScale),
    deltoidPosteriorLeft: createSculptedDeltoidGeometry('posterior', true, isFemale, lodScale),
    deltoidPosteriorRight: createSculptedDeltoidGeometry('posterior', false, isFemale, lodScale),
    // Sculpted anatomical ribcage / torso core (fills chest cavity and eliminates hollow gaps)
    torsoCore: createSculptedTorsoCoreGeometry(isFemale, lodScale),
    // Trapezius and upper back
    trapezius: createSculptedTrapeziusGeometry(isFemale, lodScale),
    // 8-Pack Rectus Abdominis with Linea Alba & Transverse Inscriptions
    abs: createSculptedAbdominalWallGeometry(isFemale, lodScale),
    // Lateral Serratus & Obliques
    obliquesLeft: createSculptedSerratusObliquesGeometry(true, isFemale, lodScale),
    obliquesRight: createSculptedSerratusObliquesGeometry(false, isFemale, lodScale),
    // Latissimus dorsi V-taper wings
    latLeft: createSculptedSerratusObliquesGeometry(true, isFemale, lodScale),
    latRight: createSculptedSerratusObliquesGeometry(false, isFemale, lodScale),
    // Biceps brachii with long and short heads
    bicepLeft: createSculptedBicepGeometry(true, isFemale, lodScale),
    bicepRight: createSculptedBicepGeometry(false, isFemale, lodScale),
    // Triceps brachii (lateral, long, and medial heads)
    tricepLeft: createSculptedTricepGeometry(true, isFemale, lodScale),
    tricepRight: createSculptedTricepGeometry(false, isFemale, lodScale),
    // Forearm with defined brachioradialis
    forearmLeft: createSculptedForearmGeometry(true, isFemale, lodScale),
    forearmRight: createSculptedForearmGeometry(false, isFemale, lodScale),
    // Hand with natural palm and athletic grip
    hand: createSculptedHandGeometry(true, lodScale),
    // Compression athletic shorts matching reference image
    shorts: createSculptedShortsGeometry(isFemale, lodScale),
    // Gluteus maximus
    gluteLeft: createSculptedGluteGeometry(true, isFemale, lodScale),
    gluteRight: createSculptedGluteGeometry(false, isFemale, lodScale),
    // Quadriceps femoris (rectus femoris, vastus lateralis, vastus medialis teardrop)
    quadLeft: createSculptedQuadricepsGeometry(true, isFemale, lodScale),
    quadRight: createSculptedQuadricepsGeometry(false, isFemale, lodScale),
    // Hamstrings
    hamstringLeft: createSculptedHamstringsGeometry(true, isFemale, lodScale),
    hamstringRight: createSculptedHamstringsGeometry(false, isFemale, lodScale),
    // Natural patella kneecap
    patella: createSculptedPatellaGeometry(lodScale),
    // Calf: Gastrocnemius (dual bellies) and soleus
    calfLeft: createSculptedCalfGeometry(true, isFemale, lodScale),
    calfRight: createSculptedCalfGeometry(false, isFemale, lodScale),
    // Human athletic foot
    foot: createSculptedFootGeometry(true, lodScale),
  }), [isFemale, lodScale]);

  // Clean geometry disposal on LOD switch or component unmount to prevent mobile VRAM leaks
  useEffect(() => {
    return () => {
      Object.values(geo).forEach((geometry: any) => {
        if (geometry && typeof geometry.dispose === 'function') {
          geometry.dispose();
        }
      });
    };
  }, [geo]);

  // Athletic studio porcelain material for skeletal, pelvic and non-muscular landmarks
  const inactiveMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f1f5f9',
    roughness: 0.38,
    metalness: 0.04,
    side: THREE.DoubleSide,
  }), []);

  // Athletic fitness training gloves with refined cyber grip
  const mechanicalGloveMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.5,
    metalness: 0.4,
    emissive: '#0284c7',
    emissiveIntensity: 0.25,
  }), []);

  // Compression athletic shorts material
  const shortsMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#090d16',
    roughness: 0.75,
    metalness: 0.12,
  }), []);

  // Biomechanical Motion Engine with smooth continuous interpolation
  useFrame((state) => {
    if (!rootGroup.current) return;
    const time = state.clock.getElapsedTime() * (isPlaying ? playbackSpeed : 0);
    // Smooth harmonic cycle between 0 and 1
    const cycle = (Math.sin(time * 2.2) + 1) / 2;
    const isConcentric = Math.cos(time * 2.2) > 0;

    // Respiration expansion
    if (chestGroup.current) {
      const breathScale = 1 + (isConcentric ? -0.02 : 0.04) * (isPlaying ? 1 : 0.3);
      chestGroup.current.scale.set(torsoScale[0] * breathScale, torsoScale[1], torsoScale[2] * breathScale);
    }

    if (onCycleUpdate) {
      onCycleUpdate(
        cycle,
        isConcentric ? 'concentric' : 'eccentric',
        isConcentric ? 'exhale' : 'inhale'
      );
    }

    // Sync globally for all subscribers
    avatarGlobalStore.updateCycle(
      cycle,
      isConcentric ? 'concentric' : 'eccentric',
      isConcentric ? 'exhale' : 'inhale'
    );

    const pos = exercise.position;
    const isSeated = pos === 'seated';
    const isLying = pos === 'lying';

    // Position & Root Anchor
    if (isSeated) {
      // Glutes rest firmly on bench seat pad; pelvis back aligns with backrest
      rootGroup.current.position.set(0, -0.22, -0.06);
      rootGroup.current.rotation.set(0, 0, 0);
      if (leftLeg.current) {
        // Hips connect seamlessly into acetabulum at y = 0.48
        leftLeg.current.position.set(-hipOffset, 0.48, 0.02);
        // Femurs extend horizontally along seat pad with natural athletic flare
        leftLeg.current.rotation.set(-Math.PI / 2 + 0.06, 0, -0.08);
      }
      if (rightLeg.current) {
        rightLeg.current.position.set(hipOffset, 0.48, 0.02);
        rightLeg.current.rotation.set(-Math.PI / 2 + 0.06, 0, 0.08);
      }
      // Knees flex 90 degrees downward with feet planted on the floor
      if (leftKnee.current) leftKnee.current.rotation.set(Math.PI / 2 - 0.06, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(Math.PI / 2 - 0.06, 0, 0);
      if (spineGroup.current) spineGroup.current.rotation.set(0.06, 0, 0);
    } else if (isLying) {
      rootGroup.current.position.set(0, 0.38, -0.35);
      rootGroup.current.rotation.set(Math.PI / 2, 0, 0);
      if (leftLeg.current) {
        leftLeg.current.position.set(-hipOffset, 0.48, -0.08);
        leftLeg.current.rotation.set(-1.25, 0, -0.1);
      }
      if (rightLeg.current) {
        rightLeg.current.position.set(hipOffset, 0.48, -0.08);
        rightLeg.current.rotation.set(-1.25, 0, 0.1);
      }
      if (leftKnee.current) leftKnee.current.rotation.set(1.35, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(1.35, 0, 0);
    } else {
      rootGroup.current.position.set(0, 0.08, 0);
      rootGroup.current.rotation.set(0, 0, 0);
      if (leftLeg.current) {
        leftLeg.current.position.set(-hipOffset, 0.48, 0);
        leftLeg.current.rotation.set(0, 0, -0.04);
      }
      if (rightLeg.current) {
        rightLeg.current.position.set(hipOffset, 0.48, 0);
        rightLeg.current.rotation.set(0, 0, 0.04);
      }
      if (leftKnee.current) leftKnee.current.rotation.set(0, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(0, 0, 0);
    }

    // Kinematic Joint Animations by Exercise ID
    const exId = exercise.id;

    if (exId === 'pose-flex-biceps') {
      // Double Front Bicep Flex Bodybuilding Pose
      const flexTension = Math.sin(time * 3) * 0.04 + 1.0;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.12, 0, -1.48);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.12, 0, 1.48);
      if (leftElbow.current) leftElbow.current.rotation.set(2.15 * flexTension, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(2.15 * flexTension, 0, 0);
      if (chestGroup.current) chestGroup.current.scale.set(torsoScale[0] * 1.08, torsoScale[1] * 1.02, torsoScale[2] * 1.08);
      if (spineGroup.current) spineGroup.current.rotation.set(-0.04, 0, 0);

    } else if (exId === 'pose-victory') {
      // Victory / Champion Pose with Fists High
      const cheer = Math.sin(time * 4) * 0.08;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.2, 0, -2.4 + cheer);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.2, 0, 2.4 - cheer);
      if (leftElbow.current) leftElbow.current.rotation.set(0.45, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(0.45, 0, 0);
      if (spineGroup.current) spineGroup.current.rotation.set(-0.08, 0, 0);

    } else if (exId === 'pose-stretch') {
      // Dynamic Athletic Side Stretch
      const sW = Math.sin(time * 1.8) * 0.28;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.1, 0, -2.7 + sW * 0.1);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.1, 0, 0.4);
      if (spineGroup.current) spineGroup.current.rotation.set(0, 0, -0.15 + sW * 0.12);

    } else if (exId === 'pose-wave') {
      // Friendly Malu greeting wave with right arm
      const wave = Math.sin(time * 6) * 0.35;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.05, 0, -0.1);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.25, 0, 1.55);
      if (rightElbow.current) rightElbow.current.rotation.set(1.4, wave, 0);
      if (leftElbow.current) leftElbow.current.rotation.set(0.1, 0, 0);

    } else if (exId === 'pose-guard') {
      // Boxing & Athletic Ready Stance
      const bob = Math.sin(time * 3) * 0.03;
      if (rootGroup.current) rootGroup.current.position.y += bob;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.65, 0, 0.4);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.7, 0, -0.35);
      if (leftElbow.current) leftElbow.current.rotation.set(1.9, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(1.95, 0, 0);
      if (spineGroup.current) spineGroup.current.rotation.set(0.12, 0, -0.06);

    } else if (exId === 'pose-breathe') {
      // Diaphragmatic Breath & Meditation
      const breath = (Math.sin(time * 1.4) + 1) / 2;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.08, 0, -0.18);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.08, 0, 0.18);
      if (leftElbow.current) leftElbow.current.rotation.set(0.35, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(0.35, 0, 0);
      if (chestGroup.current) chestGroup.current.scale.set(torsoScale[0] * (1 + breath * 0.09), torsoScale[1], torsoScale[2] * (1 + breath * 0.1));

    } else if (exId === 'seated-lateral-raises') {
      // Lateral abduction: starts at sides (~0.08 rad), raises up to ~80 degrees (1.38 rad)
      const raiseAngle = 0.08 + cycle * 1.30;
      // Left arm raises up with negative Z, Right arm with positive Z
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.06, 0.04, -raiseAngle);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.06, -0.04, raiseAngle);
      // Gentle natural 15-degree elbow bend, keeping wrists in line
      if (leftElbow.current) leftElbow.current.rotation.set(0.25, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(0.25, 0, 0);
      if (spineGroup.current) spineGroup.current.rotation.set(0.06, 0, 0);

    } else if (exId === 'dumbbell-shoulder-press') {
      const pressAngle = cycle * 1.15;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.8 - pressAngle * 0.45, 0, 0.85 + pressAngle * 0.55);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.8 - pressAngle * 0.45, 0, -0.85 - pressAngle * 0.55);
      if (leftElbow.current) leftElbow.current.rotation.set(-1.45 + pressAngle * 1.25, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(-1.45 + pressAngle * 1.25, 0, 0);

    } else if (exId === 'arnold-press') {
      const arnoldCycle = cycle * 1.2;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.6 - arnoldCycle * 0.4, arnoldCycle * 0.4, 0.5 + arnoldCycle * 0.7);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.6 - arnoldCycle * 0.4, -arnoldCycle * 0.4, -0.5 - arnoldCycle * 0.7);
      if (leftElbow.current) leftElbow.current.rotation.set(-1.3 + arnoldCycle * 1.2, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(-1.3 + arnoldCycle * 1.2, 0, 0);

    } else if (exId === 'front-raise') {
      const frontAngle = cycle * 1.4;
      if (leftShoulder.current) leftShoulder.current.rotation.set(-frontAngle, 0, 0.1);
      if (rightShoulder.current) rightShoulder.current.rotation.set(-frontAngle, 0, -0.1);
      if (leftElbow.current) leftElbow.current.rotation.set(-0.15, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(-0.15, 0, 0);

    } else if (exId === 'reverse-fly') {
      const flyAngle = cycle * 1.3;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.5, 0, flyAngle);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.5, 0, -flyAngle);
      if (spineGroup.current) spineGroup.current.rotation.set(0.65, 0, 0);

    } else if (exId === 'bench-press' || exId === 'incline-dumbbell-press' || exId === 'decline-bench-press') {
      const pressDepth = cycle * 0.95;
      if (leftShoulder.current) leftShoulder.current.rotation.set(1.25 - pressDepth * 0.35, 0, 0.45 + pressDepth * 0.4);
      if (rightShoulder.current) rightShoulder.current.rotation.set(1.25 - pressDepth * 0.35, 0, -0.45 - pressDepth * 0.4);
      if (leftElbow.current) leftElbow.current.rotation.set(-pressDepth * 1.25, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(-pressDepth * 1.25, 0, 0);

    } else if (exId === 'dumbbell-flyes' || exId === 'cable-crossover') {
      const openArc = (1 - cycle) * 1.1;
      if (leftShoulder.current) leftShoulder.current.rotation.set(1.1, 0, openArc);
      if (rightShoulder.current) rightShoulder.current.rotation.set(1.1, 0, -openArc);
      if (leftElbow.current) leftElbow.current.rotation.set(-0.35, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(-0.35, 0, 0);

    } else if (exId === 'push-up') {
      const pushDepth = cycle * 0.8;
      if (rootGroup.current) rootGroup.current.position.set(0, 0.42 - pushDepth * 0.25, 0);
      if (leftShoulder.current) leftShoulder.current.rotation.set(1.1 - pushDepth * 0.3, 0, 0.4);
      if (rightShoulder.current) rightShoulder.current.rotation.set(1.1 - pushDepth * 0.3, 0, -0.4);
      if (leftElbow.current) leftElbow.current.rotation.set(-pushDepth * 1.35, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(-pushDepth * 1.35, 0, 0);

    } else if (exId === 'barbell-curl' || exId === 'incline-dumbbell-curl' || exId === 'preacher-curl' || exId === 'concentration-curl') {
      const curlAngle = cycle * 1.65;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.1, 0, 0.08);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.1, 0, -0.08);
      if (leftElbow.current) leftElbow.current.rotation.set(curlAngle, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(curlAngle, 0, 0);

    } else if (exId === 'alternate-dumbbell-curl' || exId === 'hammer-curl') {
      const leftCycle = Math.max(0, Math.sin(time * 3 * playbackSpeed));
      const rightCycle = Math.max(0, Math.sin(time * 3 * playbackSpeed + Math.PI));
      if (leftElbow.current) leftElbow.current.rotation.set(leftCycle * 1.6, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(rightCycle * 1.6, 0, 0);

    } else if (exId === 'tricep-rope-pushdown') {
      const pushdownAngle = cycle * 1.45;
      if (leftShoulder.current) leftShoulder.current.rotation.set(-0.25, 0, 0.1);
      if (rightShoulder.current) rightShoulder.current.rotation.set(-0.25, 0, -0.1);
      if (leftElbow.current) leftElbow.current.rotation.set(-1.45 + pushdownAngle, 0, 0.2 * cycle);
      if (rightElbow.current) rightElbow.current.rotation.set(-1.45 + pushdownAngle, 0, -0.2 * cycle);

    } else if (exId === 'overhead-tricep-extension') {
      const extAngle = cycle * 1.4;
      if (leftShoulder.current) leftShoulder.current.rotation.set(2.8, 0, 0.15);
      if (rightShoulder.current) rightShoulder.current.rotation.set(2.8, 0, -0.15);
      if (leftElbow.current) leftElbow.current.rotation.set(1.5 - extAngle, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(1.5 - extAngle, 0, 0);

    } else if (exId === 'skull-crusher') {
      const skullCycle = cycle * 1.35;
      if (leftShoulder.current) leftShoulder.current.rotation.set(1.4, 0, 0.1);
      if (rightShoulder.current) rightShoulder.current.rotation.set(1.4, 0, -0.1);
      if (leftElbow.current) leftElbow.current.rotation.set(1.4 - skullCycle, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(1.4 - skullCycle, 0, 0);

    } else if (exId === 'tricep-dips') {
      const dipDepth = cycle * 0.75;
      if (rootGroup.current) rootGroup.current.position.set(0, 0.35 - dipDepth * 0.3, 0);
      if (leftElbow.current) leftElbow.current.rotation.set(-dipDepth * 1.4, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(-dipDepth * 1.4, 0, 0);

    } else if (exId === 'lat-pulldown' || exId === 'pull-up') {
      const pullDepth = cycle * 1.1;
      if (leftShoulder.current) leftShoulder.current.rotation.set(1.95 - pullDepth * 0.8, 0.2, 0.25);
      if (rightShoulder.current) rightShoulder.current.rotation.set(1.95 - pullDepth * 0.8, -0.2, -0.25);
      if (leftElbow.current) leftElbow.current.rotation.set(pullDepth * 1.25, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(pullDepth * 1.25, 0, 0);

    } else if (exId === 'seated-cable-row' || exId === 'bent-over-row' || exId === 'single-arm-dumbbell-row') {
      const rowPull = cycle * 1.15;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.65 - rowPull * 0.6, 0.1, 0.15);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.65 - rowPull * 0.6, -0.1, -0.15);
      if (leftElbow.current) leftElbow.current.rotation.set(rowPull * 1.35, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(rowPull * 1.35, 0, 0);

    } else if (exId === 'straight-arm-pulldown') {
      const sweep = cycle * 1.2;
      if (leftShoulder.current) leftShoulder.current.rotation.set(1.6 - sweep, 0, 0.1);
      if (rightShoulder.current) rightShoulder.current.rotation.set(1.6 - sweep, 0, -0.1);
      if (leftElbow.current) leftElbow.current.rotation.set(-0.15, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(-0.15, 0, 0);

    } else if (exId === 'barbell-squat' || exId === 'sumo-squat') {
      const squatDepth = cycle * 0.85;
      if (leftLeg.current) leftLeg.current.rotation.set(-squatDepth * 1.15, 0, -0.12);
      if (rightLeg.current) rightLeg.current.rotation.set(-squatDepth * 1.15, 0, 0.12);
      if (leftKnee.current) leftKnee.current.rotation.set(squatDepth * 1.55, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(squatDepth * 1.55, 0, 0);
      if (rootGroup.current) rootGroup.current.position.set(0, 0.35 - squatDepth * 0.28, 0);
      if (spineGroup.current) spineGroup.current.rotation.set(squatDepth * 0.42, 0, 0);

    } else if (exId === 'leg-press') {
      const pressDepth = (1 - cycle) * 0.8;
      if (leftLeg.current) leftLeg.current.rotation.set(-1.45 + pressDepth, 0, 0.1);
      if (rightLeg.current) rightLeg.current.rotation.set(-1.45 + pressDepth, 0, -0.1);
      if (leftKnee.current) leftKnee.current.rotation.set(1.45 - pressDepth * 1.2, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(1.45 - pressDepth * 1.2, 0, 0);

    } else if (exId === 'leg-extension') {
      const extAngle = cycle * 1.35;
      if (leftKnee.current) leftKnee.current.rotation.set(1.48 - extAngle, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(1.48 - extAngle, 0, 0);

    } else if (exId === 'lying-leg-curl') {
      const curlAngle = cycle * 1.35;
      if (leftKnee.current) leftKnee.current.rotation.set(curlAngle, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(curlAngle, 0, 0);

    } else if (exId === 'lunges') {
      const lungeDepth = cycle * 0.75;
      if (leftLeg.current) leftLeg.current.rotation.set(-lungeDepth * 1.2, 0, 0);
      if (rightLeg.current) rightLeg.current.rotation.set(lungeDepth * 0.8, 0, 0);
      if (leftKnee.current) leftKnee.current.rotation.set(lungeDepth * 1.4, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(lungeDepth * 1.4, 0, 0);
      if (rootGroup.current) rootGroup.current.position.set(0, 0.35 - lungeDepth * 0.25, 0);

    } else if (exId === 'stiff-leg-deadlift' || exId === 'romanian-deadlift') {
      const hingeDepth = cycle * 1.15;
      if (spineGroup.current) spineGroup.current.rotation.set(hingeDepth * 0.9, 0, 0);
      if (leftLeg.current) leftLeg.current.rotation.set(-0.12, 0, -0.05);
      if (rightLeg.current) rightLeg.current.rotation.set(-0.12, 0, 0.05);
      if (leftKnee.current) leftKnee.current.rotation.set(hingeDepth * 0.22, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(hingeDepth * 0.22, 0, 0);
      if (leftShoulder.current) leftShoulder.current.rotation.set(-hingeDepth * 0.85, 0, 0.1);
      if (rightShoulder.current) rightShoulder.current.rotation.set(-hingeDepth * 0.85, 0, -0.1);

    } else if (exId === 'calf-raises') {
      const calfLift = cycle * 0.15;
      if (rootGroup.current) rootGroup.current.position.set(0, 0.35 + calfLift, 0);

    } else if (exId === 'hip-thrust' || exId === 'glute-bridge') {
      const thrustDepth = cycle * 0.85;
      if (rootGroup.current) rootGroup.current.position.set(0, 0.12 + thrustDepth * 0.22, 0);
      if (spineGroup.current) spineGroup.current.rotation.set(-thrustDepth * 0.3, 0, 0);

    } else if (exId === 'seated-hip-abduction') {
      const abdAngle = cycle * 0.55;
      if (leftLeg.current) leftLeg.current.rotation.set(-1.45, 0, -abdAngle);
      if (rightLeg.current) rightLeg.current.rotation.set(-1.45, 0, abdAngle);

    } else {
      // Kinematic fallback tailored by muscle category
      const cat = exercise.category;
      if (cat === 'chest') {
        const pressDepth = cycle * 0.9;
        if (leftShoulder.current) leftShoulder.current.rotation.set(1.15 - pressDepth * 0.35, 0, 0.4 + pressDepth * 0.35);
        if (rightShoulder.current) rightShoulder.current.rotation.set(1.15 - pressDepth * 0.35, 0, -0.4 - pressDepth * 0.35);
        if (leftElbow.current) leftElbow.current.rotation.set(-pressDepth * 1.2, 0, 0);
        if (rightElbow.current) rightElbow.current.rotation.set(-pressDepth * 1.2, 0, 0);
      } else if (cat === 'back') {
        const pull = cycle * 1.1;
        if (leftShoulder.current) leftShoulder.current.rotation.set(0.6 - pull * 0.5, 0.1, 0.15);
        if (rightShoulder.current) rightShoulder.current.rotation.set(0.6 - pull * 0.5, -0.1, -0.15);
        if (leftElbow.current) leftElbow.current.rotation.set(pull * 1.3, 0, 0);
        if (rightElbow.current) rightElbow.current.rotation.set(pull * 1.3, 0, 0);
      } else if (cat === 'biceps') {
        const curl = cycle * 1.6;
        if (leftElbow.current) leftElbow.current.rotation.set(curl, 0, 0);
        if (rightElbow.current) rightElbow.current.rotation.set(curl, 0, 0);
      } else if (cat === 'triceps') {
        const ext = cycle * 1.4;
        if (leftElbow.current) leftElbow.current.rotation.set(-1.4 + ext, 0, 0);
        if (rightElbow.current) rightElbow.current.rotation.set(-1.4 + ext, 0, 0);
      } else if (cat === 'legs') {
        const squat = cycle * 0.8;
        if (leftLeg.current) leftLeg.current.rotation.set(-squat * 1.1, 0, -0.1);
        if (rightLeg.current) rightLeg.current.rotation.set(-squat * 1.1, 0, 0.1);
        if (leftKnee.current) leftKnee.current.rotation.set(squat * 1.5, 0, 0);
        if (rightKnee.current) rightKnee.current.rotation.set(squat * 1.5, 0, 0);
        if (rootGroup.current) rootGroup.current.position.set(0, 0.35 - squat * 0.25, 0);
      } else {
        const genRaise = cycle * 0.85;
        if (leftShoulder.current) leftShoulder.current.rotation.set(0, 0, genRaise);
        if (rightShoulder.current) rightShoulder.current.rotation.set(0, 0, -genRaise);
      }
    }
  });

  const prim = exercise.primaryMuscles || [];
  const sec = exercise.secondaryMuscles || [];

  const effHighlightPrimary =
    uHighlightColorPrimary ||
    highlightColorPrimary ||
    exercise.highlightColorPrimary ||
    '#ff0033';

  const effHighlightSecondary =
    uHighlightColorSecondary ||
    highlightColorSecondary ||
    exercise.highlightColorSecondary ||
    '#ff6a00';

  return (
    <MuscleHighlightContext.Provider
      value={{
        primaryMuscles: prim,
        secondaryMuscles: sec,
        cameraView,
        isPlaying,
        playbackSpeed,
        exercisePace: exercisePace ?? playbackSpeed,
        highlightOverride,
        highlightMode,
        uHighlightColorPrimary: effHighlightPrimary,
        uHighlightColorSecondary: effHighlightSecondary,
        highlightColorPrimary: effHighlightPrimary,
        highlightColorSecondary: effHighlightSecondary,
      }}
    >
      <group ref={rootGroup}>
      {/* Torso Spine Anchor */}
      <group ref={spineGroup} position={[0, 0.52, 0]}>
        
        {/* Foundation Sculpted Ribcage / Thorax Core (eliminates hollow chest voids) */}
        <mesh
          geometry={geo.torsoCore}
          material={inactiveMat}
          position={[0, 0.28, 0]}
          scale={torsoScale}
          castShadow
          receiveShadow
        />

        {/* Head & Neck (Organic anatomical head, cranium, throat and clavicles) */}
        <group position={[0, 0.58, 0]}>
          <AnatomicalMuscleNode
            geometry={geo.head}
            position={[0, 0.12, 0.015]}
            scale={[1.0, 1.0, 1.0]}
            muscleTag="head"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.neck}
            position={[0, -0.04, 0.005]}
            muscleTag="neck"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.trapezius}
            position={[0, -0.06, -0.015]}
            muscleTag="trapezius"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Clavicular Collarbone Ridge */}
          <mesh geometry={geo.clavicles} material={inactiveMat} position={[0, -0.052, 0.035]} castShadow />
          <mesh geometry={geo.clavicles} material={inactiveMat} position={[0, -0.052, 0.035]} scale={[-1, 1, 1]} castShadow />
        </group>

        {/* Chest & Upper Back Ribcage */}
        <group ref={chestGroup} position={[0, 0.38, 0]} scale={torsoScale}>
          {/* Left Pectoralis Major (Sculpted Contoured Muscular Plate) */}
          <AnatomicalMuscleNode
            geometry={geo.pectoralLeft}
            position={[-0.005, 0.025, 0.072]}
            rotation={[0.01, 0.02, -0.02]}
            scale={chestScale}
            muscleTag="chest"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Pectoralis Major (Sculpted Contoured Muscular Plate) */}
          <AnatomicalMuscleNode
            geometry={geo.pectoralRight}
            position={[0.005, 0.025, 0.072]}
            rotation={[0.01, -0.02, 0.02]}
            scale={chestScale}
            muscleTag="chest"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />

          {/* Latissimus Dorsi (Left & Right V-Taper Wings) */}
          <AnatomicalMuscleNode
            geometry={geo.latLeft}
            position={[-0.15, -0.03, -0.06]}
            rotation={[-0.1, 0.2, 0.25]}
            muscleTag="lat"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.latRight}
            position={[0.15, -0.03, -0.06]}
            rotation={[-0.1, -0.2, -0.25]}
            muscleTag="lat"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
        </group>

        {/* Abdominal Core (8-Pack Rectus Abdominis with Linea Alba & Transverse Inscriptions) */}
        <group position={[0, 0.18, 0]}>
          <AnatomicalMuscleNode
            geometry={geo.abs}
            position={[0, 0.01, 0.062]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />

          {/* Lateral Serratus & Obliques */}
          <AnatomicalMuscleNode
            geometry={geo.obliquesLeft}
            position={[-0.125, -0.01, 0.03]}
            rotation={[0, 0, 0.14]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.obliquesRight}
            position={[0.125, -0.01, 0.03]}
            rotation={[0, 0, -0.14]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
        </group>

        {/* Pelvis & Glutes */}
        <group position={[0, -0.02, 0]}>
          <mesh
            geometry={geo.shorts}
            material={shortsMat}
            position={[0, 0.03, 0]}
            rotation={[0, 0, 0]}
            castShadow
          />
          {/* Gluteus Maximus Left */}
          <AnatomicalMuscleNode
            geometry={geo.gluteLeft}
            position={[-0.10, 0.02, -0.09]}
            scale={gluteScale}
            muscleTag="glute"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Gluteus Maximus Right */}
          <AnatomicalMuscleNode
            geometry={geo.gluteRight}
            position={[0.10, 0.02, -0.09]}
            scale={gluteScale}
            muscleTag="glute"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
        </group>

        {/* Left Arm Chain */}
        <group ref={leftShoulder} position={[-shoulderOffset, 0.45, 0]}>
          {/* Anatomical Glenohumeral Joint Articulation Condyle */}
          <mesh material={inactiveMat} position={[0, 0, 0]} castShadow>
            <sphereGeometry args={[0.032, 18, 18]} />
          </mesh>
          {/* Left Deltoid Lateral Head (Signature glowing shoulder cap) */}
          <AnatomicalMuscleNode
            geometry={geo.deltoidLateralLeft}
            position={[-0.018, 0.010, 0]}
            muscleTag="deltoid_lateral"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Left Deltoid Anterior Head */}
          <AnatomicalMuscleNode
            geometry={geo.deltoidAnteriorLeft}
            position={[-0.006, -0.005, 0.032]}
            muscleTag="deltoid_anterior"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Left Deltoid Posterior Head */}
          <AnatomicalMuscleNode
            geometry={geo.deltoidPosteriorLeft}
            position={[-0.006, -0.005, -0.032]}
            muscleTag="deltoid_posterior"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Left Bicep (Anterior) */}
          <AnatomicalMuscleNode
            geometry={geo.bicepLeft}
            position={[-0.012, -0.15, 0.025]}
            rotation={[0, 0, 0.05]}
            muscleTag="bicep"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Left Tricep (Posterior) */}
          <AnatomicalMuscleNode
            geometry={geo.tricepLeft}
            position={[-0.01, -0.15, -0.028]}
            rotation={[0, 0, 0.05]}
            muscleTag="tricep"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />

          {/* Left Elbow & Forearm */}
          <group ref={leftElbow} position={[0, -0.28, 0]}>
            {/* Anatomical Elbow Condyle Joint Articulation */}
            <mesh material={inactiveMat} position={[0, 0, 0]} castShadow>
              <sphereGeometry args={[0.024, 16, 16]} />
            </mesh>
            <AnatomicalMuscleNode
              geometry={geo.forearmLeft}
              position={[0, -0.14, 0]}
              muscleTag="forearm"
              primaryMuscles={prim}
              secondaryMuscles={sec}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              highlightOverride={highlightOverride}
            />
            {/* Left Hand Grip - Stylized glowing orange-red mechanical glove */}
            <mesh geometry={geo.hand} material={mechanicalGloveMat} position={[0, -0.28, 0]} castShadow />
            {/* Dumbbell in Hand if equipment is dumbbells */}
            {exercise.equipment === 'dumbbells' && (
              <DumbbellGrip position={[0, -0.28, 0]} rotation={[0, Math.PI / 2, 0]} />
            )}
          </group>
        </group>

        {/* Right Arm Chain */}
        <group ref={rightShoulder} position={[shoulderOffset, 0.45, 0]}>
          {/* Anatomical Glenohumeral Joint Articulation Condyle */}
          <mesh material={inactiveMat} position={[0, 0, 0]} castShadow>
            <sphereGeometry args={[0.032, 18, 18]} />
          </mesh>
          {/* Right Deltoid Lateral Head (Signature glowing shoulder cap) */}
          <AnatomicalMuscleNode
            geometry={geo.deltoidLateralRight}
            position={[0.018, 0.010, 0]}
            muscleTag="deltoid_lateral"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Deltoid Anterior Head */}
          <AnatomicalMuscleNode
            geometry={geo.deltoidAnteriorRight}
            position={[0.006, -0.005, 0.032]}
            muscleTag="deltoid_anterior"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Deltoid Posterior Head */}
          <AnatomicalMuscleNode
            geometry={geo.deltoidPosteriorRight}
            position={[0.006, -0.005, -0.032]}
            muscleTag="deltoid_posterior"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Bicep (Anterior) */}
          <AnatomicalMuscleNode
            geometry={geo.bicepRight}
            position={[0.012, -0.15, 0.025]}
            rotation={[0, 0, -0.05]}
            muscleTag="bicep"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Tricep (Posterior) */}
          <AnatomicalMuscleNode
            geometry={geo.tricepRight}
            position={[0.01, -0.15, -0.028]}
            rotation={[0, 0, -0.05]}
            muscleTag="tricep"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />

          {/* Right Elbow & Forearm */}
          <group ref={rightElbow} position={[0, -0.28, 0]}>
            {/* Anatomical Elbow Condyle Joint Articulation */}
            <mesh material={inactiveMat} position={[0, 0, 0]} castShadow>
              <sphereGeometry args={[0.024, 16, 16]} />
            </mesh>
            <AnatomicalMuscleNode
              geometry={geo.forearmRight}
              position={[0, -0.14, 0]}
              muscleTag="forearm"
              primaryMuscles={prim}
              secondaryMuscles={sec}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              highlightOverride={highlightOverride}
            />
            {/* Right Hand Grip - Stylized glowing orange-red mechanical glove */}
            <mesh geometry={geo.hand} material={mechanicalGloveMat} position={[0, -0.28, 0]} castShadow />
            {/* Dumbbell in Hand if equipment is dumbbells */}
            {exercise.equipment === 'dumbbells' && (
              <DumbbellGrip position={[0, -0.28, 0]} rotation={[0, Math.PI / 2, 0]} />
            )}
          </group>
        </group>

      </group>

      {/* Barbell Bar (Olympic) for Barbell exercises */}
      {exercise.equipment === 'barbell' && (
        <BarbellBar
          position={[
            0,
            exercise.position === 'lying' ? 0.72 : 0.85,
            exercise.position === 'lying' ? -0.22 : 0.28
          ]}
        />
      )}

      {/* Left Leg Chain */}
      <group ref={leftLeg} position={[-hipOffset, 0.38, 0]}>
        {/* Left Quadriceps (Front Thigh: Rectus Femoris, Vastus Lateralis, Vastus Medialis Teardrop) */}
        <AnatomicalMuscleNode
          geometry={geo.quadLeft}
          position={[0, -0.18, 0.025]}
          rotation={[0.04, 0, -0.03]}
          muscleTag="quad"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          highlightOverride={highlightOverride}
        />
        {/* Left Hamstrings (Back Thigh) */}
        <AnatomicalMuscleNode
          geometry={geo.hamstringLeft}
          position={[0, -0.18, -0.035]}
          rotation={[-0.04, 0, -0.03]}
          muscleTag="hamstring"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          highlightOverride={highlightOverride}
        />

        {/* Left Knee Joint & Lower Leg */}
        <group ref={leftKnee} position={[0, -0.38, 0]}>
          {/* Anatomical Femoral/Tibial Condyle Joint Articulation */}
          <mesh material={inactiveMat} position={[0, 0, 0]} castShadow>
            <sphereGeometry args={[0.042, 20, 20]} />
          </mesh>
          <mesh geometry={geo.patella} material={inactiveMat} position={[0, 0, 0.032]} castShadow />
          {/* Left Gastrocnemius (Calf with Dual Bellies) */}
          <AnatomicalMuscleNode
            geometry={geo.calfLeft}
            position={[0, -0.18, -0.02]}
            muscleTag="calf"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Left Foot Planted Firmly */}
          <mesh
            geometry={geo.foot}
            material={inactiveMat}
            position={[0, -0.36, 0.05]}
            rotation={[0, 0, 0]}
            castShadow
          />
        </group>
      </group>

      {/* Right Leg Chain */}
      <group ref={rightLeg} position={[hipOffset, 0.38, 0]}>
        {/* Right Quadriceps (Front Thigh: Rectus Femoris, Vastus Lateralis, Vastus Medialis Teardrop) */}
        <AnatomicalMuscleNode
          geometry={geo.quadRight}
          position={[0, -0.18, 0.025]}
          rotation={[0.04, 0, 0.03]}
          muscleTag="quad"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          highlightOverride={highlightOverride}
        />
        {/* Right Hamstrings (Back Thigh) */}
        <AnatomicalMuscleNode
          geometry={geo.hamstringRight}
          position={[0, -0.18, -0.035]}
          rotation={[-0.04, 0, 0.03]}
          muscleTag="hamstring"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          highlightOverride={highlightOverride}
        />

        {/* Right Knee Joint & Lower Leg */}
        <group ref={rightKnee} position={[0, -0.38, 0]}>
          {/* Anatomical Femoral/Tibial Condyle Joint Articulation */}
          <mesh material={inactiveMat} position={[0, 0, 0]} castShadow>
            <sphereGeometry args={[0.042, 20, 20]} />
          </mesh>
          <mesh geometry={geo.patella} material={inactiveMat} position={[0, 0, 0.032]} castShadow />
          {/* Right Gastrocnemius (Calf with Dual Bellies) */}
          <AnatomicalMuscleNode
            geometry={geo.calfRight}
            position={[0, -0.18, -0.02]}
            muscleTag="calf"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Foot Planted Firmly */}
          <mesh
            geometry={geo.foot}
            material={inactiveMat}
            position={[0, -0.36, 0.05]}
            rotation={[0, 0, 0]}
            castShadow
          />
        </group>
      </group>
    </group>
  </MuscleHighlightContext.Provider>
);
}

// ============================================================================
// 2D FALLBACK VISUALIZER (If WebGL is unavailable on device)
// ============================================================================
function Anatomical2DFallback({
  exercise,
  gender,
  isPlaying,
}: {
  exercise: DetailedExercise;
  gender: 'male' | 'female';
  isPlaying: boolean;
}) {
  const isFemale = gender === 'female';
  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center select-none bg-[#0a0f1d]">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-[240px] mx-auto mb-4">
        <svg viewBox="0 0 200 400" className="w-full h-auto drop-shadow-[0_0_25px_rgba(255,0,51,0.4)]">
          <circle cx="100" cy="36" r="22" fill="#cbd5e1" stroke="#00e5ff" strokeWidth="1.5" />
          <rect x="92" y="58" width="16" height="18" rx="4" fill="#94a3b8" />

          {/* Shoulders / Deltoids with Red Glow */}
          <ellipse
            cx={isFemale ? '64' : '56'}
            cy="84"
            rx={isFemale ? '14' : '18'}
            ry="14"
            fill="#ff0033"
            stroke="#00e5ff"
            strokeWidth="2"
            className={isPlaying ? 'animate-pulse' : ''}
          />
          <ellipse
            cx={isFemale ? '136' : '144'}
            cy="84"
            rx={isFemale ? '14' : '18'}
            ry="14"
            fill="#ff0033"
            stroke="#00e5ff"
            strokeWidth="2"
            className={isPlaying ? 'animate-pulse' : ''}
          />

          <path
            d={
              isFemale
                ? 'M 66 78 Q 100 86 134 78 L 126 138 Q 100 148 74 138 Z'
                : 'M 58 76 Q 100 84 142 76 L 132 142 Q 100 150 68 142 Z'
            }
            fill="#e2e8f0"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />

          <rect x={isFemale ? '46' : '38'} y="98" width="16" height="85" rx="8" fill="#cbd5e1" />
          <rect x={isFemale ? '138' : '146'} y="98" width="16" height="85" rx="8" fill="#cbd5e1" />
          <rect
            x={isFemale ? '68' : '72'}
            y="144"
            width={isFemale ? '64' : '56'}
            height="38"
            rx="10"
            fill="#090d16"
          />
          <rect x="74" y="186" width="22" height="150" rx="10" fill="#cbd5e1" />
          <rect x="104" y="186" width="22" height="150" rx="10" fill="#cbd5e1" />
        </svg>
      </div>

      <div className="relative z-10 space-y-1.5">
        <h4 className="text-sm font-bold text-white tracking-wide">
          {exercise.name}
        </h4>
        <p className="text-xs text-red-400 font-mono">
          {exercise.primaryMuscles.join(' • ')}
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          <ShieldAlert className="w-3 h-3 text-red-400" />
          Modo 2D Otimizado ({isFemale ? 'Feminino ♀' : 'Masculino ♂'})
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TOP MUSCLE FOCUS CAROUSEL COMPONENT
// ============================================================================
function MuscleFocusCarousel({
  primaryMuscles,
  secondaryMuscles = [],
  category,
  activeTargetIndex = 1,
  onSelectTarget,
  highlightColor,
}: {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  category: string;
  activeTargetIndex: number;
  onSelectTarget: (index: number) => void;
  highlightColor?: string;
}) {
  const mainMuscle = primaryMuscles[0] || 'Chest';
  const displayTitle = (mainMuscle.toLowerCase().includes('peit') || mainMuscle.toLowerCase().includes('chest'))
    ? (activeTargetIndex === 0 ? 'MID CHEST' : activeTargetIndex === 1 ? 'FULL CHEST' : 'UPPER CHEST')
    : mainMuscle.toUpperCase();

  const neonColors = ['#ec4899', '#f97316', '#eab308'];
  const activeColor = highlightColor || neonColors[activeTargetIndex % 3];

  return (
    <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
      {/* Title above carousel matching prints */}
      <div className="text-[11px] sm:text-xs font-black tracking-widest text-white/95 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        {displayTitle}
      </div>

      {/* 3 Muscle Cards Carousel with Neon Glow Frame */}
      <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl">
        {[
          { label: 'Mid', index: 0, sub: 'Foco Central' },
          { label: 'Full', index: 1, sub: 'Completo' },
          { label: 'Upper', index: 2, sub: 'Superior' },
        ].map((item) => {
          const isActive = activeTargetIndex === item.index;
          return (
            <button
              key={item.index}
              type="button"
              onClick={() => onSelectTarget(item.index)}
              className={`w-14 h-16 sm:w-16 sm:h-18 rounded-xl flex flex-col items-center justify-center p-1 transition-all cursor-pointer ${
                isActive
                  ? 'border-2 scale-105 shadow-lg bg-black/80'
                  : 'border border-white/10 opacity-55 hover:opacity-85 bg-black/40'
              }`}
              style={{
                borderColor: isActive ? activeColor : 'rgba(255,255,255,0.1)',
                boxShadow: isActive ? `0 0 16px ${activeColor}55` : undefined,
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="1.8">
                  <path d="M4 8l4-2 4 2 4-2 4 2v6l-4 4-4-2-4 2-4-4V8z" />
                </svg>
              </div>
              <span className="text-[9px] font-bold uppercase text-white/90">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sets / Reps Counter at Bottom matching prints */}
      <div className="text-[10px] font-mono font-bold tracking-wider text-slate-400">
        3x10-15
      </div>
    </div>
  );
}

// ============================================================================
// CLASS IMPLEMENTATION: AvatarAnatomico
// Implements AvatarAnatomicoRef and uses React Three Fiber Canvas with
// Global State consistency across all views.
// ============================================================================

export class AvatarAnatomico
  extends Component<AvatarAnatomicoProps, AvatarAnatomicoState>
  implements AvatarAnatomicoRef
{
  private static instance: AvatarAnatomico | null = null;
  private unsubscribeGlobalStore?: () => void;
  private sequenceTimeouts: NodeJS.Timeout[] = [];

  constructor(props: AvatarAnatomicoProps) {
    super(props);

    // Initial gender detection from:
    // 1. Explicit prop gender
    // 2. User profile gender
    // 3. Global store snapshot
    const globalSnap = avatarGlobalStore.getSnapshot();
    const resolvedGender: 'male' | 'female' = props.gender
      ? normalizeGender(props.gender)
      : props.profile?.gender
      ? normalizeGender(props.profile.gender)
      : globalSnap.gender;

    // Resolve exercise from catalog or props
    let resolvedExercise: DetailedExercise;
    if (typeof props.exercise === 'object' && props.exercise !== null) {
      resolvedExercise = props.exercise;
    } else if (typeof props.catalogExercise === 'object' && props.catalogExercise !== null) {
      resolvedExercise = props.catalogExercise;
    } else if (typeof props.exercise === 'string') {
      resolvedExercise = getExerciseById(props.exercise) || EXERCISE_DATABASE[0];
    } else if (typeof props.catalogExercise === 'string') {
      resolvedExercise = getExerciseById(props.catalogExercise) || EXERCISE_DATABASE[0];
    } else if (props.exerciseId) {
      resolvedExercise = getExerciseById(props.exerciseId) || EXERCISE_DATABASE[0];
    } else {
      resolvedExercise = getExerciseById('seated-lateral-raises') || EXERCISE_DATABASE[0];
    }

    // Merge custom muscleData if supplied
    if (props.muscleData) {
      resolvedExercise = {
        ...resolvedExercise,
        name: props.muscleData.exerciseName || resolvedExercise.name,
        primaryMuscles: props.muscleData.primaryMuscles || resolvedExercise.primaryMuscles,
        secondaryMuscles: props.muscleData.secondaryMuscles || resolvedExercise.secondaryMuscles,
        category: props.muscleData.category || resolvedExercise.category,
        highlightColorPrimary: props.muscleData.highlightColorPrimary || resolvedExercise.highlightColorPrimary || '#ff0033',
        highlightColorSecondary: props.muscleData.highlightColorSecondary || resolvedExercise.highlightColorSecondary || '#ff6a00',
      };
    }

    // Safe WebGL check
    const webglAvailable = typeof window !== 'undefined' ? (() => {
      try {
        const c = document.createElement('canvas');
        return Boolean(c.getContext('webgl') || c.getContext('experimental-webgl'));
      } catch {
        return false;
      }
    })() : true;

    this.state = {
      gender: resolvedGender,
      cameraView: props.cameraView || globalSnap.cameraView,
      isPlaying: props.isPlaying !== undefined ? props.isPlaying : globalSnap.isPlaying,
      playbackSpeed: props.playbackSpeed || globalSnap.playbackSpeed,
      exercise: resolvedExercise,
      highlightedMuscles: [],
      highlightMode: props.highlightMode || globalSnap.highlightMode || 'all',
      highlightColorPrimary: props.uHighlightColorPrimary || props.highlightColorPrimary || resolvedExercise.highlightColorPrimary || '#ff0033',
      highlightColorSecondary: props.uHighlightColorSecondary || props.highlightColorSecondary || resolvedExercise.highlightColorSecondary || '#ff6a00',
      hoveredMuscle: null,
      pulsingMuscle: null,
      activeTargetIndex: 1,
      webglAvailable,
      performanceMode: props.performanceMode || 'auto',
      isZoomedLOD: props.cameraView === 'detail',
      cameraDistance: 3.4,
    };

    AvatarAnatomico.instance = this;
  }

  // ==========================================================================
  // STATIC UTILITIES & GLOBAL ACCESSORS
  // ==========================================================================
  public static getInstance(): AvatarAnatomico | null {
    return AvatarAnatomico.instance;
  }

  public static getGlobalState() {
    return avatarGlobalStore.getSnapshot();
  }

  public static setGlobalGender(gender: AvatarGender) {
    avatarGlobalStore.setGender(normalizeGender(gender));
  }

  public static toggleGlobalGender(): 'male' | 'female' {
    return avatarGlobalStore.toggleGender();
  }

  public static setGlobalCameraView(view: AvatarCameraViewType) {
    avatarGlobalStore.setCameraView(view);
  }

  public static setGlobalHighlightMode(mode: MuscleHighlightMode) {
    avatarGlobalStore.setHighlightMode(mode);
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================
  componentDidMount() {
    AvatarAnatomico.instance = this;

    // Sync profile gender with global store
    if (this.props.profile) {
      avatarGlobalStore.syncWithUserProfile(this.props.profile);
    }

    // Preload both male and female Draco GLTF models into video memory pool
    const prof = this.props.profile as any;
    const mUrl = this.props.maleModelUrl || prof?.maleModelUrl || (prof?.gender === 'male' ? prof?.modelUrl : undefined);
    const fUrl = this.props.femaleModelUrl || prof?.femaleModelUrl || (prof?.gender === 'female' ? prof?.modelUrl : undefined);
    if (mUrl || fUrl) {
      avatarModelPool.preloadBothGenders(mUrl, fUrl);
    }

    // Subscribe to global avatar state so changes anywhere sync here
    this.unsubscribeGlobalStore = avatarGlobalStore.subscribe(() => {
      const snap = avatarGlobalStore.getSnapshot();
      this.setState((prev) => {
        // If prop didn't explicitly override gender, follow global store
        const nextGender = this.props.gender ? normalizeGender(this.props.gender) : snap.gender;
        const nextHighlightMode = this.props.highlightMode || snap.highlightMode;
        if (prev.gender !== nextGender || prev.highlightMode !== nextHighlightMode) {
          return { gender: nextGender, highlightMode: nextHighlightMode };
        }
        return null;
      });
    });
  }

  componentDidUpdate(prevProps: AvatarAnatomicoProps) {
    // Sync if user profile changed
    if (this.props.profile !== prevProps.profile && this.props.profile) {
      avatarGlobalStore.syncWithUserProfile(this.props.profile);
    }

    // Sync if explicit gender prop changed
    if (this.props.gender && this.props.gender !== prevProps.gender) {
      const nextG = normalizeGender(this.props.gender);
      if (nextG !== this.state.gender) {
        this.setState({ gender: nextG });
        avatarGlobalStore.setGender(nextG);
      }
    }

    // Sync if highlightMode prop changed
    if (this.props.highlightMode && this.props.highlightMode !== prevProps.highlightMode) {
      this.setState({ highlightMode: this.props.highlightMode });
      avatarGlobalStore.setHighlightMode(this.props.highlightMode);
    }

    // Sync if cameraView prop changed
    if (this.props.cameraView && this.props.cameraView !== prevProps.cameraView) {
      this.setState({ cameraView: this.props.cameraView });
    }

    // Sync if isPlaying prop changed
    if (this.props.isPlaying !== undefined && this.props.isPlaying !== prevProps.isPlaying) {
      this.setState({ isPlaying: this.props.isPlaying });
    }

    // Sync if playbackSpeed prop changed
    if (this.props.playbackSpeed !== undefined && this.props.playbackSpeed !== prevProps.playbackSpeed) {
      this.setState({ playbackSpeed: this.props.playbackSpeed });
    }

    // Sync if performanceMode prop changed
    if (this.props.performanceMode !== undefined && this.props.performanceMode !== prevProps.performanceMode) {
      this.setState({ performanceMode: this.props.performanceMode });
    }

    // Sync if primary or secondary highlight color props changed
    const nextPrimaryColor = this.props.uHighlightColorPrimary || this.props.highlightColorPrimary;
    const prevPrimaryColor = prevProps.uHighlightColorPrimary || prevProps.highlightColorPrimary;
    if (nextPrimaryColor && nextPrimaryColor !== prevPrimaryColor) {
      this.setState({ highlightColorPrimary: nextPrimaryColor });
    }

    const nextSecondaryColor = this.props.uHighlightColorSecondary || this.props.highlightColorSecondary;
    const prevSecondaryColor = prevProps.uHighlightColorSecondary || prevProps.highlightColorSecondary;
    if (nextSecondaryColor && nextSecondaryColor !== prevSecondaryColor) {
      this.setState({ highlightColorSecondary: nextSecondaryColor });
    }

    // Sync exercise, catalogExercise, or muscleData prop
    if (
      this.props.exercise !== prevProps.exercise ||
      this.props.catalogExercise !== prevProps.catalogExercise ||
      this.props.exerciseId !== prevProps.exerciseId ||
      this.props.muscleData !== prevProps.muscleData
    ) {
      if (this.props.muscleData && this.props.muscleData !== prevProps.muscleData) {
        this.loadExerciseMuscleData(this.props.muscleData);
      } else {
        const targetEx = this.props.exercise || this.props.catalogExercise || this.props.exerciseId;
        if (targetEx) {
          this.setExercise(targetEx);
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.unsubscribeGlobalStore) {
      this.unsubscribeGlobalStore();
    }
    this.clearSequenceTimeouts();
    if (AvatarAnatomico.instance === this) {
      AvatarAnatomico.instance = null;
    }
  }

  private clearSequenceTimeouts() {
    this.sequenceTimeouts.forEach((t) => clearTimeout(t));
    this.sequenceTimeouts = [];
  }

  // ==========================================================================
  // IMPERATIVE METHODS (AvatarAnatomicoRef Interface)
  // ==========================================================================
  public play = () => {
    this.setState({ isPlaying: true });
    avatarGlobalStore.setPlaying(true);
    if (this.props.onTogglePlay) this.props.onTogglePlay(true);
  };

  public pause = () => {
    this.setState({ isPlaying: false });
    avatarGlobalStore.setPlaying(false);
    if (this.props.onTogglePlay) this.props.onTogglePlay(false);
  };

  public togglePlay = () => {
    const next = !this.state.isPlaying;
    this.setState({ isPlaying: next });
    avatarGlobalStore.setPlaying(next);
    if (this.props.onTogglePlay) this.props.onTogglePlay(next);
  };

  public setPlaybackSpeed = (speed: number) => {
    this.setState({ playbackSpeed: speed });
    avatarGlobalStore.setPlaybackSpeed(speed);
  };

  public setCameraView = (view: 'front' | 'side' | 'detail' | 'back') => {
    this.setState({ cameraView: view });
    avatarGlobalStore.setCameraView(view);
  };

  public setGender = (gender: AvatarGender) => {
    const norm = normalizeGender(gender);
    this.setState({ gender: norm });
    avatarGlobalStore.setGender(norm);
    if (this.props.onGenderChange) this.props.onGenderChange(norm);
  };

  public toggleGender = () => {
    const next = this.state.gender === 'male' ? 'female' : 'male';
    this.setGender(next);
  };

  public setMuscleHover = (muscle: string | null) => {
    this.setState({ hoveredMuscle: muscle });
    avatarGlobalStore.setHoveredMuscle(muscle);
    if (this.props.onMuscleHover) this.props.onMuscleHover(muscle);
  };

  public setMusclePulse = (muscle: string | null, isPulsing = true) => {
    const target = isPulsing ? muscle : null;
    this.setState({ pulsingMuscle: target });
    avatarGlobalStore.setPulsingMuscle(target);
  };

  public highlightMuscles = (muscles: string[]) => {
    this.clearSequenceTimeouts();
    this.setState({ highlightedMuscles: muscles });
    avatarGlobalStore.setHighlightedMuscles(muscles);
  };

  public clearHighlights = () => {
    this.clearSequenceTimeouts();
    this.setState({
      highlightedMuscles: [],
      hoveredMuscle: null,
      pulsingMuscle: null,
    });
    avatarGlobalStore.setHighlightedMuscles([]);
    avatarGlobalStore.setHoveredMuscle(null);
    avatarGlobalStore.setPulsingMuscle(null);
  };

  public triggerMuscleSequence = (steps: MuscleHighlightSequenceStep[]) => {
    this.clearSequenceTimeouts();
    if (!steps || steps.length === 0) return;
    let accumulatedTime = 0;
    steps.forEach((step) => {
      const timeout = setTimeout(() => {
        this.setState({
          highlightedMuscles: [step.muscle],
          pulsingMuscle: step.muscle,
        });
        avatarGlobalStore.setHighlightedMuscles([step.muscle]);
        avatarGlobalStore.setPulsingMuscle(step.muscle);
      }, accumulatedTime);
      this.sequenceTimeouts.push(timeout);
      accumulatedTime += step.durationMs;
    });

    const endTimeout = setTimeout(() => {
      this.clearHighlights();
    }, accumulatedTime);
    this.sequenceTimeouts.push(endTimeout);
  };

  public triggerAnimationCycle = (exerciseId?: string) => {
    if (exerciseId) {
      this.setExercise(exerciseId);
    }
    this.play();
  };

  public playAnimation = (name: string) => {
    this.setExercise(name);
    this.play();
  };

  public setAnimation = (animationName: string) => {
    this.setExercise(animationName);
    this.play();
  };

  public setHighlightMode = (mode: MuscleHighlightMode) => {
    this.setState({ highlightMode: mode });
    avatarGlobalStore.setHighlightMode(mode);
  };

  public highlightPrimaryOnly = () => {
    this.setHighlightMode('primary-only');
  };

  public highlightSecondaryOnly = () => {
    this.setHighlightMode('secondary-only');
  };

  public highlightAll = () => {
    this.setHighlightMode('all');
  };

  public setHighlightColorPrimary = (color: string) => {
    this.setState({ highlightColorPrimary: color });
  };

  public setHighlightColorSecondary = (color: string) => {
    this.setState({ highlightColorSecondary: color });
  };

  public setHighlightColors = (primary?: string, secondary?: string) => {
    this.setState((prev) => ({
      highlightColorPrimary: primary ?? prev.highlightColorPrimary,
      highlightColorSecondary: secondary ?? prev.highlightColorSecondary,
    }));
  };

  /** Dynamically calculate contrast ratio for primary or secondary muscle highlights against avatar skin */
  public getContrastRatio = (
    type: 'primary' | 'secondary' = 'primary',
    options?: LightingContrastOptions
  ): ContrastRatioResult => {
    const color =
      type === 'primary'
        ? this.state.highlightColorPrimary || '#ff0033'
        : this.state.highlightColorSecondary || '#ff6a00';
    return calculateMuscleSkinContrastRatio(color, '#d4d8e5', options);
  };

  /** Verify that current muscle highlight colors maintain readable contrast against avatar skin in all lighting */
  public ensureReadableContrast = (
    type: 'primary' | 'secondary' = 'primary',
    options?: LightingContrastOptions
  ): boolean => {
    return this.getContrastRatio(type, options).isReadable;
  };

  /** Load and overlay muscle data directly from exercise catalog by ID, exercise object, or custom muscle data */
  public loadExerciseMuscleData = (data: string | DetailedExercise | ExerciseMuscleData) => {
    if (typeof data === 'string') {
      this.setExercise(data);
      return;
    }
    if ('id' in data && (data as any).id) {
      this.setExercise(data as DetailedExercise);
      return;
    }
    const prevEx = this.state.exercise;
    const emd = data as ExerciseMuscleData;
    const dex = data as DetailedExercise;
    const updatedEx: DetailedExercise = {
      ...prevEx,
      name: dex.name || emd.exerciseName || prevEx.name,
      primaryMuscles: data.primaryMuscles || prevEx.primaryMuscles,
      secondaryMuscles: data.secondaryMuscles || prevEx.secondaryMuscles,
      category: data.category || prevEx.category,
      categoryLabel: data.categoryLabel || prevEx.categoryLabel,
      highlightColorPrimary: data.highlightColorPrimary || prevEx.highlightColorPrimary || '#ff0033',
      highlightColorSecondary: data.highlightColorSecondary || prevEx.highlightColorSecondary || '#ff6a00',
    };
    this.setState({
      exercise: updatedEx,
      highlightColorPrimary: updatedEx.highlightColorPrimary,
      highlightColorSecondary: updatedEx.highlightColorSecondary,
    });
  };

  /** Set biomechanical target muscles and synergists dynamically with optional custom highlight colors */
  public setBiomechanicalMuscles = (
    primary: string[],
    secondary: string[] = [],
    colors?: { primary?: string; secondary?: string }
  ) => {
    this.setState((prev) => ({
      exercise: {
        ...prev.exercise,
        primaryMuscles: primary,
        secondaryMuscles: secondary,
        highlightColorPrimary: colors?.primary || prev.highlightColorPrimary || '#ff0033',
        highlightColorSecondary: colors?.secondary || prev.highlightColorSecondary || '#ff6a00',
      },
      highlightColorPrimary: colors?.primary || prev.highlightColorPrimary,
      highlightColorSecondary: colors?.secondary || prev.highlightColorSecondary,
    }));
  };

  /** Get current biomechanical overlay status with resolved muscle regions and active colors */
  public getBiomechanicalOverlayStatus = () => {
    const { exercise, highlightColorPrimary, highlightColorSecondary } = this.state;
    return {
      exerciseName: exercise.name,
      exerciseId: exercise.id,
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,
      highlightColorPrimary: highlightColorPrimary || exercise.highlightColorPrimary || '#ff0033',
      highlightColorSecondary: highlightColorSecondary || exercise.highlightColorSecondary || '#ff6a00',
      activeShaderMuscles: {
        primary: exercise.primaryMuscles,
        secondary: exercise.secondaryMuscles,
      },
    };
  };

  /** Validate consistency between highlighted muscles and the selected exercise/animation */
  public validateMuscleConsistency = () => {
    const { exercise } = this.state;
    const expectedPrimary = exercise.primaryMuscles || [];
    const expectedSecondary = exercise.secondaryMuscles || [];
    
    // Retrieve current biomechanical overlay status (activeShaderMuscles)
    const { activeShaderMuscles } = this.getBiomechanicalOverlayStatus();
    const actualPrimary = activeShaderMuscles.primary;
    const actualSecondary = activeShaderMuscles.secondary;

    const discrepancies: string[] = [];

    // Check primary muscles mismatch between exercise definition and active shader nodes
    const primaryMismatch = expectedPrimary.some(m => !actualPrimary.includes(m)) || 
                           actualPrimary.some(m => !expectedPrimary.includes(m));
    if (primaryMismatch) {
      discrepancies.push(`Mismatch between exercise primary muscles and active biomechanical shader nodes.`);
    }

    const dbExercise = getExerciseById(exercise.id);
    if (dbExercise) {
      const dbPrimary = dbExercise.primaryMuscles || [];
      const hasMismatch = expectedPrimary.some(m => !dbPrimary.includes(m)) || dbPrimary.some(m => !expectedPrimary.includes(m));
      if (hasMismatch) {
        discrepancies.push(`Exercise ID '${exercise.id}' primary muscles mismatch with exercise database records.`);
      }
    } else if (exercise.id && exercise.id !== 'custom') {
      discrepancies.push(`Exercise ID '${exercise.id}' not found in exercise database.`);
    }

    if (exercise.animationAsset) {
      const animName = exercise.animationAsset.toLowerCase();
      const exName = exercise.name.toLowerCase();
      if (!animName && !exName) {
        discrepancies.push(`Exercise animation asset missing or unlinked for '${exercise.name}'.`);
      }
    }

    const isConsistent = discrepancies.length === 0;

    return {
      isConsistent,
      discrepancies,
      expectedPrimary,
      actualPrimary,
      expectedSecondary,
      actualSecondary,
    };
  };

  public setExercise = (exercise: DetailedExercise | string) => {
    let resolved: DetailedExercise | undefined;
    if (typeof exercise === 'object' && exercise !== null) {
      resolved = exercise;
    } else if (typeof exercise === 'string') {
      resolved = getExerciseById(exercise);
    }
    if (resolved) {
      this.setState({
        exercise: resolved,
        highlightColorPrimary: resolved.highlightColorPrimary || '#ff0033',
        highlightColorSecondary: resolved.highlightColorSecondary || '#ff6a00',
      });
      avatarGlobalStore.setActiveExerciseId(resolved.id);
    }
  };

  public getCurrentState = () => {
    const {
      exercise,
      gender,
      isPlaying,
      playbackSpeed,
      cameraView,
      highlightedMuscles,
      highlightMode,
      highlightColorPrimary,
      highlightColorSecondary,
      hoveredMuscle,
      pulsingMuscle,
    } = this.state;

    const primaryColor = highlightColorPrimary || '#ff0033';
    const secondaryColor = highlightColorSecondary || '#ff6a00';
    const contrastPrimary = calculateMuscleSkinContrastRatio(primaryColor, '#d4d8e5');
    const contrastSecondary = calculateMuscleSkinContrastRatio(secondaryColor, '#d4d8e5');

    return {
      gender,
      isPlaying,
      playbackSpeed,
      cameraView,
      exerciseId: exercise.id,
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,
      highlightedMuscles,
      highlightMode,
      highlightColorPrimary,
      highlightColorSecondary,
      hoveredMuscle,
      pulsingMuscle,
      contrastRatioPrimary: contrastPrimary.ratio,
      contrastRatioSecondary: contrastSecondary.ratio,
      contrastPrimaryReadable: contrastPrimary.isReadable,
      contrastSecondaryReadable: contrastSecondary.isReadable,
    };
  };

  private handleSelectMuscleTarget = (index: number) => {
    this.setState({ activeTargetIndex: index });
    if (index === 0) {
      // Visão Geral / Sinergistas e Primários
      this.setCameraView('front');
      this.setHighlightMode('all');
    } else if (index === 1) {
      // Foco Principal: Apenas músculo primário em vermelho neon
      this.setCameraView('front');
      this.setHighlightMode('primary-only');
    } else if (index === 2) {
      // Zoom Biomecânico / Detalhe
      this.setCameraView('detail');
    }
  };

  // ==========================================================================
  // RENDER METHOD (REACT THREE FIBER CANVAS)
  // ==========================================================================
  render() {
    const {
      modelUrl,
      maleModelUrl,
      femaleModelUrl,
      enableOrbitControls = true,
      isMirrorMode,
      highlightMuscleOverride,
      primaryMuscles: primProp,
      secondaryMuscles: secProp,
      onMuscleHover,
      onMuscleClick,
      onCycleUpdate,
      className = '',
      showReferenceControls,
      showOverlayBadges,
    } = this.props;

    const {
      gender,
      cameraView,
      isPlaying,
      playbackSpeed,
      exercise,
      highlightedMuscles,
      highlightMode,
      highlightColorPrimary,
      highlightColorSecondary,
      hoveredMuscle,
      pulsingMuscle,
      activeTargetIndex,
      webglAvailable,
    } = this.state;

    // Resolve custom GLTF model URL only if an explicit external model asset was provided
    const prof = this.props.profile as any;
    const profileMaleUrl = prof?.maleModelUrl || (prof?.gender === 'male' ? prof?.modelUrl : undefined);
    const profileFemaleUrl = prof?.femaleModelUrl || (prof?.gender === 'female' ? prof?.modelUrl : undefined);

    const activeMaleUrl = maleModelUrl || profileMaleUrl;
    const activeFemaleUrl = femaleModelUrl || profileFemaleUrl;

    const resolvedModelUrl = modelUrl || (gender === 'female' ? activeFemaleUrl : activeMaleUrl);

    // Merge muscles with optional muscleMap dictionary lookup
    const { muscleMap } = this.props;
    let mappedPrimary = primProp || exercise.primaryMuscles;
    let mappedSecondary = secProp || exercise.secondaryMuscles;

    if (muscleMap) {
      const exKey = exercise.id || exercise.name;
      const mapped = muscleMap[exKey] || (exercise.id ? muscleMap[exercise.id] : undefined) || (exercise.name ? muscleMap[exercise.name] : undefined);
      if (mapped) {
        if (mapped.primaryMuscles) mappedPrimary = mapped.primaryMuscles;
        if (mapped.secondaryMuscles) mappedSecondary = mapped.secondaryMuscles;
      }
    }

    const effectivePrimary = highlightedMuscles.length > 0
      ? highlightedMuscles
      : mappedPrimary;
    const effectiveSecondary = mappedSecondary;

    const effectiveHighlightPrimary =
      highlightColorPrimary ||
      this.props.uHighlightColorPrimary ||
      this.props.highlightColorPrimary ||
      exercise.highlightColorPrimary ||
      '#ff0033';

    const effectiveHighlightSecondary =
      highlightColorSecondary ||
      this.props.uHighlightColorSecondary ||
      this.props.highlightColorSecondary ||
      exercise.highlightColorSecondary ||
      '#ff6a00';

    const userProfile = this.props.profile;
    const lodStats = getOptimalAvatarLOD(this.state.performanceMode || this.props.performanceMode);
    const realtimeHr = this.props.realtimeHeartRate || 0;
    const profileHr = userProfile?.averageHeartRate || userProfile?.heartRate || userProfile?.restingHeartRate || 0;
    const activeHeartRate = realtimeHr > 0 ? realtimeHr : (profileHr > 0 ? profileHr : 115);
    const heartRateMultiplier = activeHeartRate > 0 ? Math.max(0.6, Math.min(2.4, activeHeartRate / 85)) : 1.0;
    const basePace = this.props.exercisePace ?? playbackSpeed;
    const effectiveExercisePace = basePace * heartRateMultiplier;

    const exerciseWithMuscles: DetailedExercise = {
      ...exercise,
      primaryMuscles: effectivePrimary,
      secondaryMuscles: effectiveSecondary,
      highlightColorPrimary: effectiveHighlightPrimary,
      highlightColorSecondary: effectiveHighlightSecondary,
    };

    return (
      <div
        className={`w-full h-full relative select-none overflow-hidden bg-gradient-to-b from-[#0a0e17] via-[#09111c] to-[#040810] ${
          isMirrorMode ? 'scale-x-[-1]' : ''
        } ${className}`}
      >
        {/* ================================================================ */}
        {/* 1. TOP MUSCLE FOCUS CAROUSEL                                     */}
        {/* ================================================================ */}
        {showReferenceControls && (
          <div className="absolute top-4 inset-x-0 z-20 flex justify-center pointer-events-none">
            <MuscleFocusCarousel
              primaryMuscles={exerciseWithMuscles.primaryMuscles}
              secondaryMuscles={exerciseWithMuscles.secondaryMuscles}
              category={exerciseWithMuscles.category}
              activeTargetIndex={activeTargetIndex}
              onSelectTarget={this.handleSelectMuscleTarget}
              highlightColor={effectiveHighlightPrimary}
            />
          </div>
        )}

        {/* ================================================================ */}
        {/* 2. BOTTOM-LEFT "▶ Video" & "Estúdio 3D" PILL BUTTONS              */}
        {/* ================================================================ */}
        {showReferenceControls && (
          <div className="absolute bottom-5 left-5 z-20 pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                this.togglePlay();
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-black/85 hover:bg-black active:scale-95 text-white text-xs font-semibold backdrop-blur-md border border-white/10 shadow-2xl transition-all cursor-pointer"
              title={isPlaying ? 'Pausar Animação de Vídeo' : 'Iniciar Demonstração em Vídeo'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-white text-white" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white text-white" />
              )}
              <span className="font-sans font-bold tracking-wide">Video</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                vibrate(12);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('app:openInteractiveAvatarStudio', {
                      detail: { exerciseId: exerciseWithMuscles.id }
                    })
                  );
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-950/85 hover:bg-emerald-900 active:scale-95 text-emerald-300 text-xs font-bold backdrop-blur-md border border-emerald-500/40 shadow-2xl transition-all cursor-pointer"
              title="Abrir Estúdio Interativo do Avatar 3D (Poses, Giro 360°, Músculos)"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Estúdio 3D</span>
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* 3. TOP-RIGHT GENDER & ANGLE CONTROLS                             */}
        {/* ================================================================ */}
        {showOverlayBadges && (
          <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center justify-end gap-2 pointer-events-auto">
            {/* Muscle Highlight Mode Selector */}
            <div className="flex items-center rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-0.5 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  this.setHighlightMode('all');
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  highlightMode === 'all'
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Destacar todos os músculos ativos (primários e secundários)"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  this.setHighlightMode('primary-only');
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  highlightMode === 'primary-only'
                    ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Destacar apenas músculo primário (vermelho/laranja neon)"
              >
                Primário
              </button>
              <button
                type="button"
                onClick={() => {
                  playSfx('tap');
                  this.setHighlightMode('secondary-only');
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  highlightMode === 'secondary-only'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Destacar apenas músculos secundários (âmbar/laranja)"
              >
                Secundário
              </button>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-red-500/30 text-xs font-semibold text-white shadow-lg" title={this.props.heartRateSource ? `Sincronizado via ${this.props.heartRateSource}` : 'Frequência Cardíaca (Média/Real-time)'}>
              <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span className="font-mono font-bold text-red-400">{activeHeartRate}</span>
              <span className="text-[10px] text-slate-400">BPM</span>
            </div>

            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                vibrate(12);
                this.toggleGender();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-xs font-semibold text-white shadow-lg transition-all cursor-pointer active:scale-95"
              title="Alternar variante anatômica Masculina / Feminina"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>{gender === 'female' ? 'Feminino ♀' : 'Masculino ♂'}</span>
            </button>

            {/* Dynamic Polygon LOD & Mobile Performance Optimization Button */}
            <button
              type="button"
              onClick={() => {
                playSfx('tap');
                vibrate(10);
                const nextMode = lodStats.mode === 'eco_mobile' ? 'high' : 'eco_mobile';
                this.setState({ performanceMode: nextMode });
                if (this.props.onPerformanceModeChange) {
                  this.props.onPerformanceModeChange(nextMode);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 backdrop-blur-md border shadow-lg ${
                lodStats.mode === 'eco_mobile'
                  ? 'bg-emerald-950/80 hover:bg-emerald-900/90 border-emerald-500/50 text-emerald-300'
                  : 'bg-indigo-950/80 hover:bg-indigo-900/90 border-indigo-500/50 text-indigo-300'
              }`}
              title={`Modo de Renderização: ${lodStats.mode === 'eco_mobile' ? 'Eco Mobile Otimizado (17.2k Tris - 75% menos processamento GPU)' : 'Alta Resolução (68.5k Tris)'}. Clique para alternar.`}
            >
              <Zap className={`w-3 h-3 ${lodStats.mode === 'eco_mobile' ? 'text-emerald-400' : 'text-indigo-400'}`} />
              <span>{lodStats.mode === 'eco_mobile' ? 'Eco 17k' : '68k HQ'}</span>
            </button>

            {/* Dynamic Camera Zoom Level of Detail (LOD) Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-mono font-bold transition-all backdrop-blur-md border shadow-lg ${
                this.state.isZoomedLOD
                  ? 'bg-amber-950/85 border-amber-500/60 text-amber-300'
                  : 'bg-cyan-950/85 border-cyan-500/50 text-cyan-300'
              }`}
              title={
                this.state.isZoomedLOD
                  ? 'LOD Zoom Ativo: Malha de alta fidelidade com texturas de contração muscular em tempo real'
                  : 'LOD Corpo Inteiro Ativo: Renderizando apenas grupos temáticos principais para máxima fluidez'
              }
            >
              {this.state.isZoomedLOD ? (
                <>
                  <Eye className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span>LOD: Zoom (Contração 3D)</span>
                </>
              ) : (
                <>
                  <Layers className="w-3 h-3 text-cyan-400" />
                  <span>LOD: Corpo Inteiro</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* 4. REACT THREE FIBER CANVAS 3D VIEWPORT                          */}
        {/* ================================================================ */}
        {webglAvailable ? (
          <Suspense
            fallback={
              <div className="w-full h-full flex flex-col items-center justify-center space-y-3 bg-[#0a0e17]">
                <div className="w-10 h-10 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                <p className="text-xs text-slate-400 font-mono tracking-wider">
                  Carregando Modelo Anatômico ({gender === 'female' ? 'Feminino' : 'Masculino'})...
                </p>
              </div>
            }
          >
            <Canvas
              shadows={lodStats.mode === 'high'}
              dpr={[1, typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, lodStats.dprCap) : 1]}
              gl={{
                antialias: true,
                powerPreference: 'high-performance',
                alpha: true,
                precision: lodStats.mode === 'eco_mobile' ? 'mediump' : 'highp',
                failIfMajorPerformanceCaveat: false,
              }}
              className="w-full h-full"
              onCreated={({ gl }) => {
                gl.domElement.addEventListener('webglcontextlost', (e) => {
                  e.preventDefault();
                  this.setState({ webglAvailable: false });
                });
              }}
            >
              <PerspectiveCamera makeDefault fov={38} position={[0, 0.85, 3.4]} />
              <CameraRig
                cameraView={cameraView}
                category={exerciseWithMuscles.category}
                enableOrbitControls={enableOrbitControls}
              />
              <DynamicLODCameraMonitor
                cameraView={cameraView}
                onLODUpdate={(isZoomed, distance) => {
                  if (this.state.isZoomedLOD !== isZoomed) {
                    this.setState({ isZoomedLOD: isZoomed, cameraDistance: distance });
                  }
                }}
              />

              {enableOrbitControls && (
                <OrbitControls
                  enablePan={false}
                  target={[0, 0.85, 0]}
                  minDistance={1.4}
                  maxDistance={5.8}
                  minPolarAngle={Math.PI / 12}
                  maxPolarAngle={Math.PI / 1.7}
                  enableDamping={true}
                  dampingFactor={0.08}
                />
              )}

              {/* Studio Lighting: Soft neutral daylight / studio illumination preserving white matte texture */}
              <ambientLight intensity={0.7} color="#ffffff" />

              {/* Key Cool White Light from Front-Right */}
              <directionalLight
                position={[2.4, 4.0, 3.2]}
                intensity={1.6}
                color="#ffffff"
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-bias={-0.0001}
              />

              {/* Fill Light Front-Left */}
              <directionalLight
                position={[-2.8, 2.5, 2.2]}
                intensity={0.8}
                color="#f1f5f9"
              />

              {/* Subtle Neutral Rim Lights to Sculpt the Mannequin Silhouette */}
              <directionalLight
                position={[0, 2.8, -3.4]}
                intensity={1.2}
                color="#f8fafc"
              />
              <directionalLight
                position={[-3.5, 1.8, -2.0]}
                intensity={0.8}
                color="#f8fafc"
              />
              <directionalLight
                position={[3.5, 1.8, -2.0]}
                intensity={0.8}
                color="#f8fafc"
              />

              {/* Floor Ambient Glow */}
              <pointLight position={[0, 0.2, 0.8]} intensity={0.25} color="#ffffff" distance={2.5} />

              {/* Studio Floor Platform */}
              <StudioGymPlatform />
              <ContactShadows
                position={[0, -0.32, 0]}
                opacity={0.78}
                scale={3.2}
                blur={1.6}
                far={1.8}
                color="#020617"
              />

              {/* Gym Bench Props (if exercise is seated/lying/incline) */}
              <GymBench position={exerciseWithMuscles.position} />

              {/* 3D Anatomical Human Model: GLTF loaded with Model Pooling & Draco VRAM retention */}
              {activeMaleUrl || activeFemaleUrl || modelUrl ? (
                <PooledGLTFAnatomicalModel
                  maleModelUrl={activeMaleUrl || modelUrl}
                  femaleModelUrl={activeFemaleUrl || modelUrl}
                  modelUrl={resolvedModelUrl}
                  activeGender={gender}
                  animationAsset={this.props.animationAsset || exerciseWithMuscles.animationAsset}
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                  exercisePace={effectiveExercisePace}
                  cameraView={cameraView}
                  activeMuscles={exerciseWithMuscles.primaryMuscles}
                  secondaryMuscles={exerciseWithMuscles.secondaryMuscles}
                  highlightMode={highlightMode}
                  uHighlightColorPrimary={effectiveHighlightPrimary}
                  uHighlightColorSecondary={effectiveHighlightSecondary}
                  highlightColorPrimary={effectiveHighlightPrimary}
                  highlightColorSecondary={effectiveHighlightSecondary}
                  hoveredMuscle={hoveredMuscle}
                  pulsingMuscle={pulsingMuscle}
                  onMuscleHover={onMuscleHover}
                  onMuscleClick={onMuscleClick}
                />
              ) : (
                <AnatomicalAvatarModel
                  exercise={exerciseWithMuscles}
                  gender={gender}
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                  exercisePace={effectiveExercisePace}
                  cameraView={cameraView}
                  highlightMode={highlightMode}
                  uHighlightColorPrimary={effectiveHighlightPrimary}
                  uHighlightColorSecondary={effectiveHighlightSecondary}
                  highlightColorPrimary={effectiveHighlightPrimary}
                  highlightColorSecondary={effectiveHighlightSecondary}
                  highlightOverride={highlightedMuscles.length > 0 ? highlightedMuscles[0] : highlightMuscleOverride}
                  hoveredMuscle={hoveredMuscle}
                  pulsingMuscle={pulsingMuscle}
                  onCycleUpdate={onCycleUpdate}
                  positiveFeedback={this.props.positiveFeedback}
                  motivationalSmile={this.props.motivationalSmile}
                  lodScale={this.state.isZoomedLOD ? lodStats.lodScale : lodStats.lodScale * 0.65}
                />
              )}
            </Canvas>
          </Suspense>
        ) : (
          <Anatomical2DFallback
            exercise={exerciseWithMuscles}
            gender={gender}
            isPlaying={isPlaying}
          />
        )}
      </div>
    );
  }
}

export default AvatarAnatomico;
