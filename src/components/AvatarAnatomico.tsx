import React, { Component, createRef, Suspense, useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { ContactShadows, PerspectiveCamera, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
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
  /** Full exercise object or exercise ID */
  exercise?: DetailedExercise | string;
  /** Exercise ID fallback if exercise prop is not passed */
  exerciseId?: string;
  /** Explicit muscle data from exercise catalog to dynamically overlay biomechanical highlights */
  muscleData?: ExerciseMuscleData;
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
  /** Allow interactive manual toggle of gender variant */
  onGenderChange?: (newGender: 'male' | 'female') => void;
  /** Callback when user toggles play/pause from video pill */
  onTogglePlay?: (playing: boolean) => void;
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

  const target = useMemo(() => {
    if (cameraView === 'back') {
      return {
        pos: new THREE.Vector3(0, 1.15, -3.2),
        lookAt: new THREE.Vector3(0, 0.85, 0),
      };
    }
    if (cameraView === 'side') {
      return {
        pos: new THREE.Vector3(3.2, 0.85, 0.2),
        lookAt: new THREE.Vector3(0, 0.85, 0),
      };
    }
    if (cameraView === 'detail') {
      if (category === 'shoulders') {
        return {
          pos: new THREE.Vector3(0, 1.25, 1.55),
          lookAt: new THREE.Vector3(0, 1.18, 0),
        };
      }
      if (category === 'chest') {
        return {
          pos: new THREE.Vector3(0, 1.15, 1.55),
          lookAt: new THREE.Vector3(0, 1.08, 0),
        };
      }
      if (category === 'biceps' || category === 'triceps') {
        return {
          pos: new THREE.Vector3(0.65, 1.05, 1.5),
          lookAt: new THREE.Vector3(0.25, 0.95, 0),
        };
      }
      if (category === 'legs' || category === 'glutes') {
        return {
          pos: new THREE.Vector3(0, 0.45, 1.75),
          lookAt: new THREE.Vector3(0, 0.45, 0),
        };
      }
      if (category === 'back') {
        return {
          pos: new THREE.Vector3(0, 1.2, -1.75),
          lookAt: new THREE.Vector3(0, 1.1, 0),
        };
      }
      return {
        pos: new THREE.Vector3(0, 1.1, 1.65),
        lookAt: new THREE.Vector3(0, 0.95, 0),
      };
    }
    // Front view default matching reference image
    return {
      pos: new THREE.Vector3(0, 0.85, 3.4),
      lookAt: new THREE.Vector3(0, 0.85, 0),
    };
  }, [cameraView, category]);

  useFrame(() => {
    if (!enableOrbitControls) {
      camera.position.lerp(target.pos, 0.08);
      camera.lookAt(target.lookAt);
    }
  });

  return null;
}

// ============================================================================
// GYM ENVIRONMENT & EQUIPMENT PROPS
// ============================================================================

function StudioGymPlatform() {
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#070b14',
    roughness: 0.55,
    metalness: 0.35,
  }), []);

  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#00e5ff',
    wireframe: true,
    transparent: true,
    opacity: 0.22,
  }), []);

  return (
    <group position={[0, -0.32, 0]}>
      <mesh material={floorMat} position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[1.75, 1.85, 0.08, 48]} />
      </mesh>
      <mesh material={ringMat} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.48, 48]} />
      </mesh>
    </group>
  );
}

function GymBench({ position = 'seated' }: { position: string }) {
  const metalMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0d131f',
    roughness: 0.35,
    metalness: 0.85,
  }), []);

  const leatherMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#151d2a',
    roughness: 0.75,
    metalness: 0.15,
  }), []);

  if (position === 'seated') {
    return (
      <group position={[0, -0.32, -0.05]}>
        <mesh material={leatherMat} position={[0, 0.46, 0.08]} castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.07, 0.36]} />
        </mesh>
        <mesh material={leatherMat} position={[0, 0.88, -0.12]} rotation={[0.08, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.74, 0.06]} />
        </mesh>
        <mesh material={metalMat} position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.44, 16]} />
        </mesh>
        <mesh material={metalMat} position={[0, 0.02, 0.22]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.52, 16]} />
        </mesh>
        <mesh material={metalMat} position={[0, 0.02, -0.25]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.52, 16]} />
        </mesh>
      </group>
    );
  }

  if (position === 'lying') {
    return (
      <group position={[0, -0.05, -0.3]}>
        <mesh material={leatherMat} position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.08, 1.15]} />
        </mesh>
        <mesh material={metalMat} position={[0, 0.22, -0.45]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.44, 16]} />
        </mesh>
        <mesh material={metalMat} position={[0, 0.22, 0.45]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.44, 16]} />
        </mesh>
      </group>
    );
  }

  return null;
}

function DumbbellGrip({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const chromeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.15,
    metalness: 0.95,
  }), []);

  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0b0f19',
    roughness: 0.45,
    metalness: 0.75,
  }), []);

  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      <mesh material={chromeMat} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 0.22, 16]} />
      </mesh>
      <mesh material={plateMat} position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.088, 0.088, 0.03, 24]} />
      </mesh>
      <mesh material={plateMat} position={[-0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.024, 24]} />
      </mesh>
      <mesh material={plateMat} position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.088, 0.088, 0.03, 24]} />
      </mesh>
      <mesh material={plateMat} position={[0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.024, 24]} />
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

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // View angle Fresnel factor
    float NdotV = max(0.0, dot(normal, viewDir));
    float fresnel = pow(1.0 - NdotV, 2.2);

    // Camera view-specific modulation
    // 0.0 = Frente (Front View)
    // 1.0 = Lateral (Side View)
    // 2.0 = Detalhe (Detail View)
    // 3.0 = Costas (Back View)
    float viewFactor = 1.0;
    float fiberStriation = 0.0;

    if (uCameraView < 0.5) {
      // Frente: accentuate frontal projection
      viewFactor = 0.90 + 0.40 * max(0.0, normal.z);
    } else if (uCameraView < 1.5) {
      // Lateral: accentuate outer silhouette rim and lateral curvature depth
      viewFactor = 0.90 + 0.55 * abs(normal.x);
    } else if (uCameraView < 2.5) {
      // Detalhe: biological micro-fiber striation wave and high focal emission
      fiberStriation = sin(vWorldPosition.y * 65.0 + uTime * (4.0 * max(0.2, uExercisePace))) * 0.16;
      viewFactor = 1.35 + 0.45 * (1.0 - NdotV) + fiberStriation;
    } else {
      // Back: dorsal projection
      viewFactor = 0.90 + 0.40 * max(0.0, -normal.z);
    }

    // =========================================================================
    // PERIODIC 'PULSE' ANIMATION (Primary & Secondary segments synchronized with Exercise Pace)
    // =========================================================================
    float effectivePace = max(0.1, uExercisePace);

    // Pulse frequency: Primary pulses with focused rapid heart/metabolic rate;
    // Secondary synergists follow in smooth harmonic supporting rhythm
    float pulseFrequency = (uIsPrimary > 0.5 ? 4.2 : 2.6) * effectivePace;

    // Time-based periodic harmonic waveform
    float rawWave = sin(uTime * pulseFrequency);
    float periodicWave = rawWave * 0.5 + 0.5; // Normalized 0.0 to 1.0

    // Non-linear power shaping: Primary has energetic sharp crest; Secondary has smooth rounded swells
    float pulseShape = pow(periodicWave, uIsPrimary > 0.5 ? 2.2 : 1.4);

    // Pulse intensity scaling directly proportional to the user's exercise pace:
    // Faster tempo -> heightened luminous amplitude and metabolic glow intensity
    float paceIntensityFactor = clamp(0.65 + effectivePace * 0.45, 0.45, 2.25);
    float pulseAmplitude = (uIsPrimary > 0.5 ? 0.42 : 0.24) * paceIntensityFactor;

    // Overall pulse factor combining base glow, periodic pace wave, and peak contraction burst
    float pulse = 0.88 + pulseShape * pulseAmplitude + uContraction * (0.38 * paceIntensityFactor);

    // Dynamically select target color from uniform
    vec3 targetHighlight = mix(uHighlightColorSecondary, uHighlightColorPrimary, step(0.5, uIsPrimary));

    // Vibrant Red core to Electric Orange glow gradient incorporating dynamic uniforms
    vec3 baseCore = mix(uColorCore, targetHighlight, 0.70);
    vec3 baseGlow = mix(uColorGlow, targetHighlight, 0.45);
    vec3 baseTone = mix(baseCore, uColorWarm, 0.35);
    vec3 glowTone = baseGlow;

    // Harmonize tones with Fresnel and fiber striation
    vec3 activeColor = mix(baseTone, glowTone, fresnel * 0.85 + fiberStriation);

    // Edge and core luminescence heightened during peak pulse beats
    activeColor += baseGlow * (fresnel * (0.65 + pulseShape * 0.35) * pulse);
    activeColor += targetHighlight * (NdotV * (0.35 + pulseShape * 0.30) * pulse);

    // Dynamic crest flash at the apex of the pulse wave
    if (uIsPrimary > 0.5) {
      activeColor += uHighlightColorPrimary * (pulseShape * 0.25 * paceIntensityFactor);
    } else {
      activeColor += uHighlightColorSecondary * (pulseShape * 0.15 * paceIntensityFactor);
    }

    // Detail camera view enhancement
    if (uCameraView > 1.5 && uCameraView < 2.5) {
      activeColor *= 1.30;
    }

    // Secondary synergist softens slightly
    if (uIsPrimary < 0.5) {
      activeColor = mix(activeColor, uHighlightColorSecondary, 0.25);
    }

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

  useFrame((state) => {
    if (matRef.current) {
      const time = state.clock.getElapsedTime();
      const cycle = contraction !== undefined ? contraction : (Math.sin(time * 2.2 * effectivePace) + 1) / 2;
      matRef.current.updateTimeAndContraction(time, cycle, effectivePace);
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
export function isMuscleMatching(tag: string, muscleList?: string[]): boolean {
  if (!muscleList || muscleList.length === 0) return false;
  const t = tag.toLowerCase().trim();

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
    '#ff0033';

  const rawHighlightSecondary =
    propUHighlightSecondary ||
    propHighlightSecondary ||
    context.uHighlightColorSecondary ||
    context.highlightColorSecondary ||
    '#ff6a00';

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

  // Custom ShaderMaterial in Red / Orange for active muscles with dynamic pace pulse
  const shaderMat = useMemo(() => {
    if (isHighlighted) {
      return new MuscleHighlightShaderMaterial({
        isPrimary,
        cameraView,
        intensity: isPrimary ? 1.65 : 1.15,
        exercisePace: currentPace,
        uHighlightColorPrimary: rawHighlightPrimary,
        uHighlightColorSecondary: rawHighlightSecondary,
      });
    }
    return null;
  }, [isHighlighted, isPrimary, cameraView, currentPace, rawHighlightPrimary, rawHighlightSecondary]);

  useEffect(() => {
    return () => {
      if (shaderMat) {
        shaderMat.dispose();
      }
    };
  }, [shaderMat]);

  // High-Definition Sculpted Matte Porcelain Atlas Mannequin for inactive body parts
  const inactiveMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#d4d8e5',
        roughness: 0.32,
        metalness: 0.12,
        clearcoat: 0.35,
        clearcoatRoughness: 0.2,
      }),
    []
  );

  // Update Shader Uniforms and Dynamic Contraction Swelling
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime() * (isPlaying ? playbackSpeed : 0);
    const cycle = (Math.sin(time * 2.2) + 1) / 2;

    if (shaderMat) {
      shaderMat.updateTimeAndContraction(state.clock.getElapsedTime(), cycle, currentPace);
      shaderMat.setCameraView(cameraViewFloat);
      shaderMat.setIsPrimary(isPrimary);
      if (rawHighlightPrimary) shaderMat.setHighlightColorPrimary(rawHighlightPrimary);
      if (rawHighlightSecondary) shaderMat.setHighlightColorSecondary(rawHighlightSecondary);
    }

    // Dynamic hypertrophic swelling during concentric peak contraction
    if (isPrimary && isPlaying) {
      const contractionSwell = 1.0 + cycle * 0.10; // 10% volume expansion
      meshRef.current.scale.set(
        scale[0] * contractionSwell,
        scale[1] * (1.0 + cycle * 0.03),
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

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={shaderMat || inactiveMat}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
}

// ============================================================================
// GLTF ANATOMICAL 3D MODEL LOADER WITH SHADERMATERIAL HIGHLIGHTING
// ============================================================================
export function GLTFAnatomicalModel({
  modelUrl,
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
  modelUrl: string;
  gender?: 'male' | 'female';
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
  const gltf = useGLTF(modelUrl);
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null);
  const shaderMaterialsRef = useRef<MuscleHighlightShaderMaterial[]>([]);

  const cameraViewFloat = useMemo(() => {
    if (cameraView === 'side') return 1.0;
    if (cameraView === 'detail') return 2.0;
    if (cameraView === 'back') return 3.0;
    return 0.0;
  }, [cameraView]);

  const effPrimary = uHighlightColorPrimary || highlightColorPrimary;
  const effSecondary = uHighlightColorSecondary || highlightColorSecondary;
  const resolvedPace = exercisePace ?? playbackSpeed ?? 1.0;
  const currentPace = isPlaying ? resolvedPace : 0.2;

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

        // Apply highlightMode filtering
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
        }
      }
    });

    return () => {
      shaderMaterialsRef.current.forEach((m) => m.dispose());
      shaderMaterialsRef.current = [];
    };
  }, [clonedScene, activeMuscles, secondaryMuscles, highlightMode, hoveredMuscle, pulsingMuscle, cameraViewFloat, effPrimary, effSecondary, currentPace]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const cycle = (Math.sin(time * 2.2 * (isPlaying ? resolvedPace : 0)) + 1) / 2;

    shaderMaterialsRef.current.forEach((mat) => {
      mat.updateTimeAndContraction(time, cycle, currentPace);
      mat.uniforms.uCameraView.value = cameraViewFloat;
      if (effPrimary) mat.setHighlightColorPrimary(effPrimary);
      if (effSecondary) mat.setHighlightColorSecondary(effSecondary);
    });

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
      onPointerOver={(e: any) => {
        e.stopPropagation();
        if (e.object?.name && onMuscleHover) {
          onMuscleHover(e.object.name);
        }
      }}
      onPointerOut={(e: any) => {
        e.stopPropagation();
        if (onMuscleHover) onMuscleHover(null);
      }}
      onClick={(e: any) => {
        e.stopPropagation();
        if (e.object?.name && onMuscleClick) {
          onMuscleClick(e.object.name);
        }
      }}
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
  const shoulderOffset = isFemale ? 0.275 : 0.33;
  const hipOffset = isFemale ? 0.17 : 0.15;
  const torsoScale: [number, number, number] = isFemale ? [0.88, 1.0, 0.86] : [1.08, 1.0, 1.05];
  const chestScale: [number, number, number] = isFemale ? [0.86, 0.92, 0.9] : [1.12, 1.05, 1.08];
  const gluteScale: [number, number, number] = isFemale ? [1.14, 1.12, 1.18] : [1.0, 1.0, 1.0];
  const armThickness = isFemale ? 0.9 : 1.08;
  const legThickness = isFemale ? 0.96 : 1.06;

  // Sculpted anatomical geometries (Organic human atlas proportions)
  const geo = useMemo(() => ({
    // Head with natural cranial dome and jawline
    head: new THREE.SphereGeometry(0.16, 32, 32),
    neck: new THREE.CylinderGeometry(0.075, isFemale ? 0.095 : 0.115, 0.16, 24),
    // Pectorals with organic sternal & clavicular sweep
    pectoral: new THREE.CapsuleGeometry(isFemale ? 0.125 : 0.145, 0.22, 24, 24),
    pectoralUpper: new THREE.CapsuleGeometry(isFemale ? 0.095 : 0.115, 0.16, 20, 20),
    // Natural deltoids (three biomechanical heads: lateral, anterior, posterior)
    deltoid: new THREE.SphereGeometry(isFemale ? 0.12 : 0.142, 24, 24),
    deltoidLateral: new THREE.SphereGeometry(isFemale ? 0.105 : 0.125, 20, 20),
    deltoidAnterior: new THREE.SphereGeometry(isFemale ? 0.095 : 0.115, 20, 20),
    deltoidPosterior: new THREE.SphereGeometry(isFemale ? 0.095 : 0.115, 20, 20),
    // Diamond trapezius covering upper back and cervical spine
    trapezius: new THREE.BoxGeometry(isFemale ? 0.21 : 0.26, 0.12, 0.1),
    // Biceps brachii with long and short heads
    bicep: new THREE.CapsuleGeometry(0.08 * armThickness, 0.19, 20, 20),
    // Triceps brachii (lateral, long, and medial heads)
    tricep: new THREE.CapsuleGeometry(0.076 * armThickness, 0.18, 20, 20),
    // Forearm with defined brachioradialis
    forearm: new THREE.CapsuleGeometry(0.065 * armThickness, 0.22, 20, 20),
    // Hand with natural palm and athletic grip
    hand: new THREE.CapsuleGeometry(0.044, 0.09, 16, 16),
    // Rectus abdominis with linea alba
    absUpper: new THREE.BoxGeometry(isFemale ? 0.105 : 0.125, 0.08, 0.06),
    absMid: new THREE.BoxGeometry(isFemale ? 0.095 : 0.115, 0.08, 0.06),
    absLower: new THREE.BoxGeometry(isFemale ? 0.09 : 0.105, 0.07, 0.06),
    // External obliques & serratus anterior
    obliques: new THREE.CapsuleGeometry(isFemale ? 0.052 : 0.064, 0.22, 16, 16),
    // Latissimus dorsi V-taper wings
    lat: new THREE.CapsuleGeometry(isFemale ? 0.082 : 0.102, 0.26, 20, 20),
    // Gluteus maximus
    glutes: new THREE.SphereGeometry(0.15, 24, 24),
    // Quadriceps femoris (rectus femoris, vastus lateralis, vastus medialis)
    quadriceps: new THREE.CapsuleGeometry(0.115 * legThickness, 0.34, 24, 24),
    // Hamstrings
    hamstring: new THREE.CapsuleGeometry(0.098 * legThickness, 0.32, 20, 20),
    // Natural patella kneecap
    knee: new THREE.SphereGeometry(0.054, 16, 16),
    // Gastrocnemius and soleus
    calf: new THREE.CapsuleGeometry(0.082 * legThickness, 0.30, 24, 24),
    // Human athletic shoe
    foot: new THREE.CapsuleGeometry(0.054, 0.18, 16, 16),
    // Compression athletic shorts
    shorts: new THREE.CapsuleGeometry(isFemale ? 0.16 : 0.175, 0.26, 24, 24),
  }), [isFemale, armThickness, legThickness]);

  // Dark athletic shorts matching reference image
  const darkShortsMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#090d16',
    roughness: 0.85,
    metalness: 0.15,
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
      rootGroup.current.position.set(0, 0.12, 0.04);
      rootGroup.current.rotation.set(0, 0, 0);
      if (leftLeg.current) {
        leftLeg.current.position.set(-hipOffset, 0.08, 0.05);
        leftLeg.current.rotation.set(-1.45, 0, -0.15);
      }
      if (rightLeg.current) {
        rightLeg.current.position.set(hipOffset, 0.08, 0.05);
        rightLeg.current.rotation.set(-1.45, 0, 0.15);
      }
      if (leftKnee.current) leftKnee.current.rotation.set(1.48, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(1.48, 0, 0);
    } else if (isLying) {
      rootGroup.current.position.set(0, 0.38, -0.35);
      rootGroup.current.rotation.set(Math.PI / 2, 0, 0);
      if (leftLeg.current) {
        leftLeg.current.position.set(-hipOffset, 0.08, -0.1);
        leftLeg.current.rotation.set(-1.25, 0, -0.1);
      }
      if (rightLeg.current) {
        rightLeg.current.position.set(hipOffset, 0.08, -0.1);
        rightLeg.current.rotation.set(-1.25, 0, 0.1);
      }
      if (leftKnee.current) leftKnee.current.rotation.set(1.35, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(1.35, 0, 0);
    } else {
      rootGroup.current.position.set(0, 0.35, 0);
      rootGroup.current.rotation.set(0, 0, 0);
      if (leftLeg.current) {
        leftLeg.current.position.set(-hipOffset, 0.08, 0);
        leftLeg.current.rotation.set(0, 0, -0.05);
      }
      if (rightLeg.current) {
        rightLeg.current.position.set(hipOffset, 0.08, 0);
        rightLeg.current.rotation.set(0, 0, 0.05);
      }
      if (leftKnee.current) leftKnee.current.rotation.set(0, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(0, 0, 0);
    }

    // Kinematic Joint Animations by Exercise ID
    const exId = exercise.id;

    if (exId === 'seated-lateral-raises') {
      const raiseAngle = cycle * 1.35;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.12, 0, raiseAngle);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.12, 0, -raiseAngle);
      if (leftElbow.current) leftElbow.current.rotation.set(-0.35, 0.15, 0.22);
      if (rightElbow.current) rightElbow.current.rotation.set(-0.35, -0.15, -0.22);
      if (spineGroup.current) spineGroup.current.rotation.set(0.04, 0, 0);

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
        
        {/* Head & Neck (Organic anatomical head, cranium and throat columns) */}
        <group position={[0, 0.58, 0]}>
          <AnatomicalMuscleNode
            geometry={geo.head}
            position={[0, 0.09, 0]}
            scale={[0.85, 1.0, 0.92]}
            muscleTag="head"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.neck}
            position={[0, -0.06, 0]}
            muscleTag="neck"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.trapezius}
            position={[0, -0.08, -0.05]}
            muscleTag="trapezius"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
        </group>

        {/* Chest & Upper Back Ribcage */}
        <group ref={chestGroup} position={[0, 0.38, 0]} scale={torsoScale}>
          {/* Left Pectoralis Clavicular (Upper Chest) */}
          <AnatomicalMuscleNode
            geometry={geo.pectoralUpper}
            position={[-0.088, 0.08, 0.065]}
            rotation={[0.08, 0.16, -0.34]}
            scale={chestScale}
            muscleTag="pectoral_upper"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Left Pectoralis Sternal (Mid/Main Chest) */}
          <AnatomicalMuscleNode
            geometry={geo.pectoral}
            position={[-0.095, 0.02, 0.06]}
            rotation={[0.1, 0.12, -0.26]}
            scale={chestScale}
            muscleTag="chest"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Pectoralis Clavicular (Upper Chest) */}
          <AnatomicalMuscleNode
            geometry={geo.pectoralUpper}
            position={[0.088, 0.08, 0.065]}
            rotation={[0.08, -0.16, 0.34]}
            scale={chestScale}
            muscleTag="pectoral_upper"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Pectoralis Sternal (Mid/Main Chest) */}
          <AnatomicalMuscleNode
            geometry={geo.pectoral}
            position={[0.095, 0.02, 0.06]}
            rotation={[0.1, -0.12, 0.26]}
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
            geometry={geo.lat}
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
            geometry={geo.lat}
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

        {/* Abdominal Core & Obliques */}
        <group position={[0, 0.18, 0]}>
          <AnatomicalMuscleNode
            geometry={geo.absUpper}
            position={[0, 0.08, 0.07]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.absMid}
            position={[0, 0.0, 0.07]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.absLower}
            position={[0, -0.08, 0.07]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />

          {/* Lateral Obliques */}
          <AnatomicalMuscleNode
            geometry={geo.obliques}
            position={[-0.11, 0.0, 0.03]}
            rotation={[0, 0, 0.18]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.obliques}
            position={[0.11, 0.0, 0.03]}
            rotation={[0, 0, -0.18]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
        </group>

        {/* Pelvis, Athletic Shorts & Glutes */}
        <group position={[0, -0.02, 0]}>
          <mesh
            geometry={geo.shorts}
            material={darkShortsMat}
            position={[0, 0.04, 0]}
            rotation={[0, 0, 0]}
            castShadow
          />
          {/* Gluteus Maximus Left */}
          <AnatomicalMuscleNode
            geometry={geo.glutes}
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
            geometry={geo.glutes}
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
          {/* Left Deltoid Lateral Head */}
          <AnatomicalMuscleNode
            geometry={geo.deltoidLateral}
            position={[-0.035, 0, 0]}
            scale={[0.85, 1.05, 0.9]}
            muscleTag="deltoid_lateral"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Left Deltoid Anterior Head */}
          <AnatomicalMuscleNode
            geometry={geo.deltoidAnterior}
            position={[-0.015, -0.012, 0.045]}
            scale={[0.8, 0.95, 0.85]}
            muscleTag="deltoid_anterior"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Left Deltoid Posterior Head */}
          <AnatomicalMuscleNode
            geometry={geo.deltoidPosterior}
            position={[-0.015, -0.012, -0.045]}
            scale={[0.8, 0.95, 0.85]}
            muscleTag="deltoid_posterior"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Left Bicep (Anterior) */}
          <AnatomicalMuscleNode
            geometry={geo.bicep}
            position={[-0.015, -0.14, 0.02]}
            rotation={[0, 0, 0.06]}
            muscleTag="bicep"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Left Tricep (Posterior) */}
          <AnatomicalMuscleNode
            geometry={geo.tricep}
            position={[-0.01, -0.14, -0.025]}
            rotation={[0, 0, 0.06]}
            muscleTag="tricep"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />

          {/* Left Elbow & Forearm */}
          <group ref={leftElbow} position={[0, -0.27, 0]}>
            <AnatomicalMuscleNode
              geometry={geo.forearm}
              position={[0, -0.13, 0]}
              muscleTag="forearm"
              primaryMuscles={prim}
              secondaryMuscles={sec}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              highlightOverride={highlightOverride}
            />
            {/* Left Hand Grip */}
            <mesh geometry={geo.hand} material={darkShortsMat} position={[0, -0.27, 0]} castShadow />
            {/* Dumbbell in Hand if equipment is dumbbells */}
            {exercise.equipment === 'dumbbells' && (
              <DumbbellGrip position={[0, -0.27, 0]} rotation={[0, 0, 0]} />
            )}
          </group>
        </group>

        {/* Right Arm Chain */}
        <group ref={rightShoulder} position={[shoulderOffset, 0.45, 0]}>
          {/* Right Deltoid Lateral Head */}
          <AnatomicalMuscleNode
            geometry={geo.deltoidLateral}
            position={[0.035, 0, 0]}
            scale={[0.85, 1.05, 0.9]}
            muscleTag="deltoid_lateral"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Deltoid Anterior Head */}
          <AnatomicalMuscleNode
            geometry={geo.deltoidAnterior}
            position={[0.015, -0.012, 0.045]}
            scale={[0.8, 0.95, 0.85]}
            muscleTag="deltoid_anterior"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Deltoid Posterior Head */}
          <AnatomicalMuscleNode
            geometry={geo.deltoidPosterior}
            position={[0.015, -0.012, -0.045]}
            scale={[0.8, 0.95, 0.85]}
            muscleTag="deltoid_posterior"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Bicep (Anterior) */}
          <AnatomicalMuscleNode
            geometry={geo.bicep}
            position={[0.015, -0.14, 0.02]}
            rotation={[0, 0, -0.06]}
            muscleTag="bicep"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Tricep (Posterior) */}
          <AnatomicalMuscleNode
            geometry={geo.tricep}
            position={[0.01, -0.14, -0.025]}
            rotation={[0, 0, -0.06]}
            muscleTag="tricep"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />

          {/* Right Elbow & Forearm */}
          <group ref={rightElbow} position={[0, -0.27, 0]}>
            <AnatomicalMuscleNode
              geometry={geo.forearm}
              position={[0, -0.13, 0]}
              muscleTag="forearm"
              primaryMuscles={prim}
              secondaryMuscles={sec}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              highlightOverride={highlightOverride}
            />
            {/* Right Hand Grip */}
            <mesh geometry={geo.hand} material={darkShortsMat} position={[0, -0.27, 0]} castShadow />
            {/* Dumbbell in Hand if equipment is dumbbells */}
            {exercise.equipment === 'dumbbells' && (
              <DumbbellGrip position={[0, -0.27, 0]} rotation={[0, 0, 0]} />
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
        {/* Left Quadriceps (Front Thigh) */}
        <AnatomicalMuscleNode
          geometry={geo.quadriceps}
          position={[0, -0.17, 0.03]}
          rotation={[0.05, 0, -0.04]}
          muscleTag="quad"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          highlightOverride={highlightOverride}
        />
        {/* Left Hamstrings (Back Thigh) */}
        <AnatomicalMuscleNode
          geometry={geo.hamstring}
          position={[0, -0.16, -0.035]}
          rotation={[-0.05, 0, -0.04]}
          muscleTag="hamstring"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          highlightOverride={highlightOverride}
        />

        {/* Left Knee Joint & Lower Leg */}
        <group ref={leftKnee} position={[0, -0.37, 0]}>
          <mesh geometry={geo.knee} material={darkShortsMat} position={[0, 0, 0.02]} />
          {/* Left Gastrocnemius (Calf) */}
          <AnatomicalMuscleNode
            geometry={geo.calf}
            position={[0, -0.16, -0.02]}
            muscleTag="calf"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Left Foot Athletic Shoe */}
          <mesh
            geometry={geo.foot}
            material={darkShortsMat}
            position={[0, -0.33, 0.05]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          />
        </group>
      </group>

      {/* Right Leg Chain */}
      <group ref={rightLeg} position={[hipOffset, 0.38, 0]}>
        {/* Right Quadriceps (Front Thigh) */}
        <AnatomicalMuscleNode
          geometry={geo.quadriceps}
          position={[0, -0.17, 0.03]}
          rotation={[0.05, 0, 0.04]}
          muscleTag="quad"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          highlightOverride={highlightOverride}
        />
        {/* Right Hamstrings (Back Thigh) */}
        <AnatomicalMuscleNode
          geometry={geo.hamstring}
          position={[0, -0.16, -0.035]}
          rotation={[-0.05, 0, 0.04]}
          muscleTag="hamstring"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          highlightOverride={highlightOverride}
        />

        {/* Right Knee Joint & Lower Leg */}
        <group ref={rightKnee} position={[0, -0.37, 0]}>
          <mesh geometry={geo.knee} material={darkShortsMat} position={[0, 0, 0.02]} />
          {/* Right Gastrocnemius (Calf) */}
          <AnatomicalMuscleNode
            geometry={geo.calf}
            position={[0, -0.16, -0.02]}
            muscleTag="calf"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            highlightOverride={highlightOverride}
          />
          {/* Right Foot Athletic Shoe */}
          <mesh
            geometry={geo.foot}
            material={darkShortsMat}
            position={[0, -0.33, 0.05]}
            rotation={[Math.PI / 2, 0, 0]}
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
}: {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  category: string;
  activeTargetIndex: number;
  onSelectTarget: (index: number) => void;
}) {
  const targetItems = useMemo(() => {
    const mainMuscle = primaryMuscles[0] || 'Músculo Alvo';
    const secMuscle = (secondaryMuscles && secondaryMuscles[0]) || primaryMuscles[1] || 'Sinergistas';
    return [
      { id: 'left', label: secMuscle, sub: 'Sinergistas', active: activeTargetIndex === 0 },
      { id: 'center', label: mainMuscle, sub: 'Foco Principal', active: activeTargetIndex === 1 },
      { id: 'right', label: 'Zoom Biomecânico', sub: 'Detalhe', active: activeTargetIndex === 2 },
    ];
  }, [primaryMuscles, secondaryMuscles, activeTargetIndex]);

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 shadow-2xl">
      {targetItems.map((item, idx) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelectTarget(idx)}
          className={`px-3 py-1.5 rounded-xl text-left transition-all cursor-pointer pointer-events-auto ${
            item.active
              ? 'bg-gradient-to-r from-red-600/90 to-red-500/90 text-white shadow-lg shadow-red-600/40 border border-red-400/50 scale-102'
              : 'bg-slate-900/40 text-slate-300 hover:text-white border border-white/5 hover:border-white/20'
          }`}
        >
          <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider opacity-85 leading-none">
            {item.sub}
          </p>
          <p className="text-[11px] sm:text-xs font-bold leading-tight truncate max-w-[110px] sm:max-w-[140px]">
            {item.label}
          </p>
        </button>
      ))}
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
      enableOrbitControls,
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

    // Merge muscles
    const effectivePrimary = highlightedMuscles.length > 0
      ? highlightedMuscles
      : primProp || exercise.primaryMuscles;
    const effectiveSecondary = secProp || exercise.secondaryMuscles;

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
            />
          </div>
        )}

        {/* ================================================================ */}
        {/* 2. BOTTOM-LEFT "▶ Video" PILL BUTTON                             */}
        {/* ================================================================ */}
        {showReferenceControls && (
          <div className="absolute bottom-5 left-5 z-20 pointer-events-auto">
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
              shadows
              dpr={[1, typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1]}
              gl={{
                antialias: true,
                powerPreference: 'high-performance',
                alpha: true,
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

              {enableOrbitControls && (
                <OrbitControls
                  enablePan={false}
                  target={[0, 0.85, 0]}
                  minDistance={1.8}
                  maxDistance={5.2}
                  minPolarAngle={Math.PI / 6}
                  maxPolarAngle={Math.PI / 1.7}
                />
              )}

              {/* Studio Lighting Exactly Matching Reference Image */}
              <ambientLight intensity={0.55} color="#0f172a" />

              {/* Key Cool White Light from Front-Right */}
              <directionalLight
                position={[2.2, 4.0, 3.2]}
                intensity={1.5}
                color="#f8fafc"
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-bias={-0.0001}
              />

              {/* Fill Light Front-Left */}
              <directionalLight
                position={[-2.8, 2.5, 2.2]}
                intensity={0.7}
                color="#cbd5e1"
              />

              {/* Signature Electric Blue / Cyan Rim Light from Behind & Sides */}
              <directionalLight
                position={[0, 2.8, -3.4]}
                intensity={3.8}
                color="#00e5ff"
              />
              <directionalLight
                position={[-3.5, 1.8, -2.0]}
                intensity={2.4}
                color="#00e5ff"
              />
              <directionalLight
                position={[3.5, 1.8, -2.0]}
                intensity={2.4}
                color="#00e5ff"
              />

              {/* Floor Ambient Glow */}
              <pointLight position={[0, 0.2, 0.8]} intensity={0.7} color="#ff0033" distance={2.5} />

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

              {/* 3D Anatomical Human Model: GLTF if modelUrl provided, else Procedural Anatomical Model */}
              {modelUrl ? (
                <GLTFAnatomicalModel
                  modelUrl={modelUrl}
                  gender={gender}
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                  exercisePace={this.props.exercisePace ?? playbackSpeed}
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
                  exercisePace={this.props.exercisePace ?? playbackSpeed}
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
