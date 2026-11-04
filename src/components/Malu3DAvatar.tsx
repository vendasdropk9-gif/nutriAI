import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Sparkles, Volume2, Mic, Heart, Smile, Brain, Flame, RefreshCw, MessageSquare } from 'lucide-react';
import avatarGlobalStore, { useAvatarGlobalState, MaluEmotionType } from '../lib/avatarGlobalState';
import { speak } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';
import { ErrorBoundary } from './ErrorBoundary';

interface Malu3DAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showControls?: boolean;
  interactiveGaze?: boolean;
  onTalkClick?: () => void;
  className?: string;
}

/**
 * Procedural Hair System for Malu (Sleek athletic top-knot / high ponytail with dynamic specular highlights)
 */
function MaluHair({ hairColor = '#1e1b18', accentGlow = '#10b981' }: { hairColor?: string; accentGlow?: string }) {
  const hairMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.55,
      metalness: 0.15,
    });
  }, [hairColor]);

  const bandMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#10b981',
      emissive: '#047857',
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.4,
    });
  }, []);

  return (
    <group position={[0, 0.08, -0.01]}>
      {/* Crown Volume */}
      <mesh material={hairMat} position={[0, 0.13, -0.03]} scale={[1.12, 0.98, 1.1]}>
        <sphereGeometry args={[0.135, 24, 20]} />
      </mesh>

      {/* Front Side Strands / Framing Locks */}
      <mesh material={hairMat} position={[-0.105, 0.06, 0.05]} rotation={[0.1, 0, 0.25]} scale={[0.025, 0.11, 0.03]}>
        <capsuleGeometry args={[1, 1, 12, 16]} />
      </mesh>
      <mesh material={hairMat} position={[0.105, 0.06, 0.05]} rotation={[0.1, 0, -0.25]} scale={[0.025, 0.11, 0.03]}>
        <capsuleGeometry args={[1, 1, 12, 16]} />
      </mesh>

      {/* Athletic Ponytail Hairband */}
      <mesh material={bandMat} position={[0, 0.21, -0.1]} rotation={[0.5, 0, 0]}>
        <torusGeometry args={[0.038, 0.012, 12, 24]} />
      </mesh>

      {/* High Ponytail Tail */}
      <group position={[0, 0.22, -0.11]} rotation={[-0.35, 0, 0]}>
        <mesh material={hairMat} position={[0, -0.08, -0.06]} rotation={[-0.4, 0, 0]} scale={[0.045, 0.13, 0.045]}>
          <capsuleGeometry args={[1, 1, 14, 16]} />
        </mesh>
        <mesh material={hairMat} position={[0, -0.18, -0.13]} rotation={[-0.6, 0, 0]} scale={[0.035, 0.11, 0.035]}>
          <capsuleGeometry args={[1, 1, 12, 16]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Athletic Collar & Bust with NutriAI Emerald/Gold Accents
 */
function MaluTorsoCollar({ accentColor = '#10b981' }: { accentColor?: string }) {
  const suitMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#0f172a', // Deep slate athletic compression fabric
      roughness: 0.6,
      metalness: 0.1,
    });
  }, []);

  const trimMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.4,
      roughness: 0.25,
      metalness: 0.5,
    });
  }, [accentColor]);

  const skinMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#e5b897',
      roughness: 0.42,
      metalness: 0.05,
    });
  }, []);

  return (
    <group position={[0, -0.22, 0]}>
      {/* Athletic Neck */}
      <mesh material={skinMat} position={[0, 0.09, -0.01]} scale={[0.068, 0.12, 0.068]}>
        <cylinderGeometry args={[1, 1.15, 1, 24]} />
      </mesh>

      {/* Clavicle & Upper Trapezius Contour */}
      <mesh material={skinMat} position={[0, 0.02, 0]} scale={[0.16, 0.045, 0.1]}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>

      {/* Athletic Compression Top (Shoulders & Bust) */}
      <mesh material={suitMat} position={[0, -0.1, -0.01]} scale={[0.26, 0.17, 0.15]}>
        <sphereGeometry args={[1, 24, 18]} />
      </mesh>

      {/* V-Neckline Accent Trim with Glowing Emerald Pip */}
      <mesh material={trimMat} position={[0, -0.015, 0.1]} rotation={[0, 0, Math.PI / 4]} scale={[0.015, 0.015, 0.015]}>
        <octahedronGeometry args={[1]} />
      </mesh>
      <mesh material={trimMat} position={[0, -0.04, 0.095]} rotation={[0.4, 0, 0]} scale={[0.045, 0.006, 0.02]}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  );
}

/**
 * Animated Sound Wave & Emotional Resonance Halo Ring
 */
function EmotionalHaloRing({ emotion = 'neutral', isSpeaking = false, volume = 0 }: { emotion: MaluEmotionType; isSpeaking: boolean; volume: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);

  const ringColors = useMemo(() => {
    switch (emotion) {
      case 'alegre':
      case 'happy':
        return { primary: '#10b981', secondary: '#34d399' };
      case 'focada':
      case 'motivating':
        return { primary: '#f59e0b', secondary: '#fbbf24' };
      case 'calma':
        return { primary: '#14b8a6', secondary: '#2dd4bf' };
      case 'pensativa':
      case 'thoughtful':
        return { primary: '#06b6d4', secondary: '#38bdf8' };
      case 'neutral':
      default:
        return { primary: '#10b981', secondary: '#059669' };
    }
  }, [emotion]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (ringRef.current) {
      const pulseScale = 1.0 + (isSpeaking ? volume * 0.35 + Math.sin(t * 8) * 0.04 : Math.sin(t * 2) * 0.02);
      ringRef.current.scale.set(pulseScale, pulseScale, 1);
      ringRef.current.rotation.z = t * (isSpeaking ? 0.8 : 0.2);
    }
    if (outerRingRef.current) {
      const outerScale = 1.15 + (isSpeaking ? volume * 0.45 : Math.sin(t * 1.5 + 1) * 0.03);
      outerRingRef.current.scale.set(outerScale, outerScale, 1);
      outerRingRef.current.rotation.z = -t * (isSpeaking ? 0.5 : 0.15);
    }
  });

  return (
    <group position={[0, 0.02, -0.22]}>
      {/* Primary Inner Glow Ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.34, 0.355, 64]} />
        <meshBasicMaterial color={ringColors.primary} transparent opacity={isSpeaking ? 0.85 : 0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Secondary Outer Ripple Ring */}
      <mesh ref={outerRingRef}>
        <ringGeometry args={[0.39, 0.402, 64]} />
        <meshBasicMaterial color={ringColors.secondary} transparent opacity={isSpeaking ? 0.6 : 0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Malu Head & Facial Rig with Real-time TTS Lip-Sync, Dynamic Idle Animations, and Emotion Engine
 */
function MaluFaceRig({
  emotion = 'neutral',
  isSpeaking = false,
  mouthOpen = 0,
  mouthSpread = 0.2,
  audioVolume = 0,
  interactiveGaze = true
}: {
  emotion: MaluEmotionType;
  isSpeaking: boolean;
  mouthOpen: number;
  mouthSpread: number;
  audioVolume: number;
  interactiveGaze?: boolean;
}) {
  const headGroupRef = useRef<THREE.Group>(null);
  const faceMeshRef = useRef<THREE.Mesh>(null);

  // Facial elements
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const leftPupilRef = useRef<THREE.Mesh>(null);
  const rightPupilRef = useRef<THREE.Mesh>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  const leftEyelidUpperRef = useRef<THREE.Mesh>(null);
  const rightEyelidUpperRef = useRef<THREE.Mesh>(null);

  // Oral cavity & morph lips
  const oralCavityRef = useRef<THREE.Mesh>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);
  const lowerLipRef = useRef<THREE.Mesh>(null);
  const teethUpperRef = useRef<THREE.Mesh>(null);

  // Damped animation weights
  const currentMouthOpenRef = useRef(0);
  const currentMouthSpreadRef = useRef(0.2);
  const currentSmileWeightRef = useRef(0.15);
  const blinkTimerRef = useRef(2.5);
  const blinkPhaseRef = useRef(0);
  const isDoubleBlinkRef = useRef(false);
  const nodPhaseRef = useRef(0);

  // Idle Animation Engine Refs (Active during conversation pauses)
  const idleTimerRef = useRef(3.5);
  const idleStateRef = useRef<'breathe' | 'microSmile' | 'inquisitive' | 'thoughtfulGlance' | 'cheerful'>('breathe');
  const idleSmileRef = useRef(0);
  const idleBrowRef = useRef(0);
  const idleHeadZRef = useRef(0);
  const idleHeadXRef = useRef(0);
  const idleGazeXRef = useRef(0);
  const idleGazeYRef = useRef(0);
  const saccadeTimerRef = useRef(2.0);

  // PBR Materials
  const skinMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#ebb998', // Warm natural Fitzpatrick Type III athletic skin
      roughness: 0.44,
      metalness: 0.02,
    });
  }, []);

  const blushMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#e58080',
      roughness: 0.5,
      metalness: 0.0,
      transparent: true,
      opacity: 0.35,
    });
  }, []);

  const scleraMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.2,
      metalness: 0.02,
    });
  }, []);

  const irisMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#10b981', // Vivid Emerald green iris for Malu
      roughness: 0.15,
      metalness: 0.25,
      emissive: '#047857',
      emissiveIntensity: 0.3,
    });
  }, []);

  const limbalRingMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#022c22', // Dark emerald limbal ring border
    });
  }, []);

  const eyelashMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#181210',
      roughness: 0.5,
      metalness: 0.1,
    });
  }, []);

  const earringMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#10b981',
      emissive: '#10b981',
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
    });
  }, []);

  const pupilMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#090d16',
      roughness: 0.1,
      metalness: 0.8,
    });
  }, []);

  const pupilGleamMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#ffffff',
    });
  }, []);

  const browMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#26201b',
      roughness: 0.6,
      metalness: 0.1,
    });
  }, []);

  const lipMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#c85a50', // Warm natural rose/coral lip tint
      roughness: 0.32,
      metalness: 0.06,
    });
  }, []);

  const oralCavityMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#2a0d14', // Deep mouth interior
    });
  }, []);

  const teethMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#fdfbf7',
      roughness: 0.2,
      metalness: 0.1,
    });
  }, []);

  // Trigger affirmative nod gesture on motivating speech or emotion switch
  useEffect(() => {
    if (emotion === 'motivating' || emotion === 'focada' || emotion === 'happy' || emotion === 'alegre') {
      nodPhaseRef.current = Math.PI * 1.5;
    }
  }, [emotion]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const pointer = state.pointer;

    // --- 1. IDLE ANIMATION STATE MACHINE (Runs when not actively speaking) ---
    if (!isSpeaking) {
      idleTimerRef.current -= delta;
      if (idleTimerRef.current <= 0) {
        // Cycle smoothly between organic human micro-expressions
        const possibleStates: Array<'breathe' | 'microSmile' | 'inquisitive' | 'thoughtfulGlance' | 'cheerful'> = [
          'breathe', 'microSmile', 'inquisitive', 'thoughtfulGlance', 'cheerful'
        ];
        const nextState = possibleStates[Math.floor(Math.random() * possibleStates.length)];
        idleStateRef.current = nextState;
        idleTimerRef.current = 4.0 + Math.random() * 3.5; // Next micro-state in 4.0–7.5s
      }

      // Compute micro-expression targets
      let targetIdleSmile = 0;
      let targetIdleBrow = 0;
      let targetIdleHeadZ = 0;
      let targetIdleHeadX = 0;

      switch (idleStateRef.current) {
        case 'microSmile':
          targetIdleSmile = 0.18;
          targetIdleHeadZ = -0.018;
          targetIdleHeadX = 0.01;
          break;
        case 'inquisitive':
          targetIdleBrow = 0.06;
          targetIdleHeadZ = 0.024;
          targetIdleHeadX = -0.015;
          break;
        case 'thoughtfulGlance':
          targetIdleSmile = -0.04;
          targetIdleBrow = 0.035;
          targetIdleHeadZ = 0.022;
          targetIdleHeadX = 0.015;
          break;
        case 'cheerful':
          targetIdleSmile = 0.22;
          targetIdleBrow = -0.03;
          targetIdleHeadZ = -0.022;
          targetIdleHeadX = 0.012;
          break;
        case 'breathe':
        default:
          targetIdleSmile = 0;
          targetIdleBrow = 0;
          targetIdleHeadZ = 0;
          targetIdleHeadX = 0;
          break;
      }

      // Smooth damped interpolation for idle expressions (natural human cadence ~3.0)
      idleSmileRef.current = THREE.MathUtils.damp(idleSmileRef.current, targetIdleSmile, 3.2, delta);
      idleBrowRef.current = THREE.MathUtils.damp(idleBrowRef.current, targetIdleBrow, 3.2, delta);
      idleHeadZRef.current = THREE.MathUtils.damp(idleHeadZRef.current, targetIdleHeadZ, 2.8, delta);
      idleHeadXRef.current = THREE.MathUtils.damp(idleHeadXRef.current, targetIdleHeadX, 2.8, delta);

      // Micro-saccades (natural subtle eye exploration)
      saccadeTimerRef.current -= delta;
      if (saccadeTimerRef.current <= 0) {
        saccadeTimerRef.current = 1.8 + Math.random() * 2.6;
        if (idleStateRef.current === 'thoughtfulGlance') {
          idleGazeXRef.current = Math.random() > 0.5 ? 0.0035 : -0.0035;
          idleGazeYRef.current = 0.0025 + Math.random() * 0.002;
        } else {
          idleGazeXRef.current = (Math.random() - 0.5) * 0.003;
          idleGazeYRef.current = (Math.random() - 0.5) * 0.002;
        }
      }
    } else {
      // When speaking, smoothly return idle offsets to zero
      idleSmileRef.current = THREE.MathUtils.damp(idleSmileRef.current, 0, 8.0, delta);
      idleBrowRef.current = THREE.MathUtils.damp(idleBrowRef.current, 0, 8.0, delta);
      idleHeadZRef.current = THREE.MathUtils.damp(idleHeadZRef.current, 0, 8.0, delta);
      idleHeadXRef.current = THREE.MathUtils.damp(idleHeadXRef.current, 0, 8.0, delta);
      idleGazeXRef.current = THREE.MathUtils.damp(idleGazeXRef.current, 0, 8.0, delta);
      idleGazeYRef.current = THREE.MathUtils.damp(idleGazeYRef.current, 0, 8.0, delta);
    }

    // --- 2. SMOOTH LIP-SYNC INTERPOLATION (Damped 60 FPS) ---
    const targetMouthOpen = isSpeaking ? Math.max(0.04, mouthOpen) : 0.0;
    const targetMouthSpread = isSpeaking ? Math.max(0.15, mouthSpread) : 0.2;

    currentMouthOpenRef.current = THREE.MathUtils.damp(
      currentMouthOpenRef.current,
      targetMouthOpen,
      18.0,
      delta
    );
    currentMouthSpreadRef.current = THREE.MathUtils.damp(
      currentMouthSpreadRef.current,
      targetMouthSpread,
      15.0,
      delta
    );

    const mOpen = currentMouthOpenRef.current;
    const mSpread = currentMouthSpreadRef.current;

    // --- 3. EMOTIONAL SMILE & BROW TARGETS COMBINED WITH IDLE ENGINE ---
    let baseSmile = 0.18;
    let baseBrowAngle = 0.0;
    let baseBrowLift = 0.0;
    let baseHeadTiltZ = 0.0;
    let baseHeadTiltX = 0.0;
    let baseGazeOffsetX = 0.0;
    let baseGazeOffsetY = 0.0;
    let breathingSpeed = 1.7;

    switch (emotion) {
      case 'alegre':
      case 'happy':
        baseSmile = 0.72 + (isSpeaking ? mOpen * 0.15 : 0);
        baseBrowAngle = -0.06;
        baseBrowLift = 0.005;
        baseHeadTiltZ = -0.035;
        baseHeadTiltX = 0.015;
        breathingSpeed = 1.8;
        break;
      case 'focada':
      case 'motivating':
        baseSmile = 0.48 + (isSpeaking ? mOpen * 0.2 : 0);
        baseBrowAngle = -0.09;
        baseBrowLift = 0.006;
        baseHeadTiltZ = 0.01;
        baseHeadTiltX = 0.035;
        breathingSpeed = 2.0;
        break;
      case 'calma':
        baseSmile = 0.28 + (isSpeaking ? mOpen * 0.1 : 0);
        baseBrowAngle = -0.02;
        baseBrowLift = 0.002;
        baseHeadTiltZ = 0.02;
        baseHeadTiltX = -0.01;
        breathingSpeed = 1.3; // Serene, slower restorative breathing
        break;
      case 'pensativa':
      case 'thoughtful':
        baseSmile = 0.12;
        baseBrowAngle = 0.12; // inner brow raises, thoughtful contemplation
        baseBrowLift = 0.007;
        baseHeadTiltZ = 0.035;
        baseHeadTiltX = -0.035;
        baseGazeOffsetX = 0.0035;
        baseGazeOffsetY = 0.003;
        breathingSpeed = 1.5;
        break;
      case 'neutral':
      default:
        baseSmile = 0.20;
        baseBrowAngle = 0.0;
        baseBrowLift = 0.0;
        baseHeadTiltZ = 0.0;
        baseHeadTiltX = 0.0;
        breathingSpeed = 1.6;
        break;
    }

    // Combine base emotion with idle offsets
    const targetSmile = Math.min(1.0, Math.max(0.0, baseSmile + idleSmileRef.current));
    const targetBrowAngle = baseBrowAngle + idleBrowRef.current;
    const targetBrowLift = baseBrowLift;
    const headTiltTargetZ = baseHeadTiltZ + idleHeadZRef.current;
    const headTiltTargetX = baseHeadTiltX + idleHeadXRef.current;

    currentSmileWeightRef.current = THREE.MathUtils.damp(
      currentSmileWeightRef.current,
      targetSmile,
      7.0,
      delta
    );
    const smileW = currentSmileWeightRef.current;

    // --- 4. ORAL CAVITY & LIP DEFORMATIONS ---
    if (oralCavityRef.current) {
      const oralScaleY = THREE.MathUtils.lerp(0.04, 0.042 + mOpen * 0.05, 1);
      const oralScaleX = THREE.MathUtils.lerp(0.045, 0.048 + mSpread * 0.03, 1);
      oralCavityRef.current.scale.set(oralScaleX, oralScaleY, 0.03);
      oralCavityRef.current.position.y = -0.042 - mOpen * 0.008;
    }

    if (upperLipRef.current && lowerLipRef.current) {
      const upperLift = mOpen * 0.005 + smileW * 0.003;
      upperLipRef.current.position.y = -0.034 + upperLift;
      upperLipRef.current.scale.x = 1.0 + mSpread * 0.25;

      const lowerDrop = mOpen * 0.016 - smileW * 0.002;
      lowerLipRef.current.position.y = -0.052 - lowerDrop;
      lowerLipRef.current.scale.x = 1.0 + mSpread * 0.2;
    }

    if (teethUpperRef.current) {
      teethUpperRef.current.position.y = -0.038 + smileW * 0.002;
      teethUpperRef.current.visible = mOpen > 0.08 || smileW > 0.4;
    }

    // --- 5. NATURAL BLINKING CYCLE WITH DOUBLE-BLINK PROBABILITY ---
    blinkTimerRef.current -= delta;
    if (blinkTimerRef.current <= 0) {
      blinkPhaseRef.current = Math.PI; // trigger blink cycle
      if (!isDoubleBlinkRef.current && Math.random() < 0.28) {
        isDoubleBlinkRef.current = true;
        blinkTimerRef.current = 0.22; // rapid realistic double blink
      } else {
        isDoubleBlinkRef.current = false;
        blinkTimerRef.current = 2.8 + Math.random() * 3.2;
      }
    }

    let blinkWeight = 0;
    if (blinkPhaseRef.current > 0.01) {
      blinkPhaseRef.current = THREE.MathUtils.damp(blinkPhaseRef.current, 0, 16.0, delta);
      blinkWeight = Math.sin(blinkPhaseRef.current);
    }

    if (leftEyelidUpperRef.current && rightEyelidUpperRef.current) {
      const eyelidDrop = THREE.MathUtils.lerp(0, -0.018, blinkWeight) - (smileW * 0.002);
      leftEyelidUpperRef.current.position.y = 0.038 + eyelidDrop;
      rightEyelidUpperRef.current.position.y = 0.038 + eyelidDrop;
    }

    // --- 6. EYEBROW ANGLES AND ELEVATION ---
    if (leftBrowRef.current && rightBrowRef.current) {
      const bLift = 0.065 + targetBrowLift + (isSpeaking ? Math.sin(time * 6) * 0.001 : 0);
      leftBrowRef.current.position.y = bLift;
      rightBrowRef.current.position.y = bLift;
      leftBrowRef.current.rotation.z = targetBrowAngle;
      rightBrowRef.current.rotation.z = -targetBrowAngle;
    }

    // --- 7. PUPIL GAZE (Interactive pointer tracking + natural saccades) ---
    if (leftPupilRef.current && rightPupilRef.current) {
      const totalGazeOffsetX = baseGazeOffsetX + idleGazeXRef.current;
      const totalGazeOffsetY = baseGazeOffsetY + idleGazeYRef.current;
      const gazeX = interactiveGaze ? pointer.x * 0.004 + totalGazeOffsetX : totalGazeOffsetX;
      const gazeY = interactiveGaze ? pointer.y * 0.003 + totalGazeOffsetY : totalGazeOffsetY;

      leftPupilRef.current.position.x = -0.048 + gazeX;
      leftPupilRef.current.position.y = 0.024 + gazeY;
      rightPupilRef.current.position.x = 0.048 + gazeX;
      rightPupilRef.current.position.y = 0.024 + gazeY;
    }

    // --- 8. HEAD MICRO-MOTION (Natural Breathing Cadence + Idle Shifts + Speech Bob) ---
    if (headGroupRef.current) {
      const idleBreathingY = Math.sin(time * breathingSpeed) * 0.003;
      const speechBob = isSpeaking ? Math.sin(time * 10) * (audioVolume * 0.012) : 0;

      // Affirmative nod gesture
      let nodAngle = 0;
      if (nodPhaseRef.current > 0.01) {
        nodPhaseRef.current = THREE.MathUtils.damp(nodPhaseRef.current, 0, 4.0, delta);
        nodAngle = Math.sin(nodPhaseRef.current) * -0.065;
      }

      headGroupRef.current.position.y = idleBreathingY + speechBob;
      headGroupRef.current.rotation.x = THREE.MathUtils.damp(
        headGroupRef.current.rotation.x,
        headTiltTargetX + nodAngle + (interactiveGaze ? -pointer.y * 0.08 : 0),
        5.5,
        delta
      );
      headGroupRef.current.rotation.y = THREE.MathUtils.damp(
        headGroupRef.current.rotation.y,
        interactiveGaze ? pointer.x * 0.14 : 0,
        5.5,
        delta
      );
      headGroupRef.current.rotation.z = THREE.MathUtils.damp(
        headGroupRef.current.rotation.z,
        headTiltTargetZ,
        5.0,
        delta
      );
    }
  });

  return (
    <group ref={headGroupRef}>
      {/* 1. Base Sculpted Feminine Head Mesh */}
      <mesh ref={faceMeshRef} material={skinMat} position={[0, 0, 0]} scale={[1.0, 1.14, 1.02]}>
        <sphereGeometry args={[0.13, 32, 28]} />
      </mesh>

      {/* Feminine Chin & Jawline Contouring */}
      <mesh material={skinMat} position={[0, -0.09, 0.04]} scale={[0.07, 0.055, 0.07]}>
        <sphereGeometry args={[1, 20, 18]} />
      </mesh>

      {/* Subtle Feminine Cheek Contours */}
      <mesh material={skinMat} position={[-0.065, -0.015, 0.085]} scale={[0.045, 0.04, 0.04]}>
        <sphereGeometry args={[1, 16, 14]} />
      </mesh>
      <mesh material={skinMat} position={[0.065, -0.015, 0.085]} scale={[0.045, 0.04, 0.04]}>
        <sphereGeometry args={[1, 16, 14]} />
      </mesh>

      {/* Healthy Natural Blush Highlights */}
      <mesh material={blushMat} position={[-0.068, -0.018, 0.098]} scale={[0.032, 0.022, 0.018]}>
        <sphereGeometry args={[1, 16, 14]} />
      </mesh>
      <mesh material={blushMat} position={[0.068, -0.018, 0.098]} scale={[0.032, 0.022, 0.018]}>
        <sphereGeometry args={[1, 16, 14]} />
      </mesh>

      {/* Ears & Emerald Stud Earrings */}
      <group position={[-0.125, 0.01, -0.01]} rotation={[0, -0.2, -0.1]}>
        <mesh material={skinMat} scale={[0.018, 0.038, 0.012]}>
          <sphereGeometry args={[1, 14, 12]} />
        </mesh>
        <mesh material={earringMat} position={[0, -0.02, 0.008]} scale={[0.005, 0.005, 0.005]}>
          <octahedronGeometry args={[1]} />
        </mesh>
      </group>
      <group position={[0.125, 0.01, -0.01]} rotation={[0, 0.2, 0.1]}>
        <mesh material={skinMat} scale={[0.018, 0.038, 0.012]}>
          <sphereGeometry args={[1, 14, 12]} />
        </mesh>
        <mesh material={earringMat} position={[0, -0.02, 0.008]} scale={[0.005, 0.005, 0.005]}>
          <octahedronGeometry args={[1]} />
        </mesh>
      </group>

      {/* Sculpted Delicate Nose */}
      <group position={[0, 0.005, 0.125]}>
        <mesh material={skinMat} rotation={[-0.3, 0, 0]} scale={[0.016, 0.038, 0.018]}>
          <coneGeometry args={[1, 1, 16]} />
        </mesh>
        <mesh material={skinMat} position={[0, -0.015, 0.006]} scale={[0.018, 0.012, 0.016]}>
          <sphereGeometry args={[1, 14, 12]} />
        </mesh>
      </group>

      {/* 2. Left Eye System */}
      <group position={[-0.048, 0.024, 0.108]}>
        {/* Sclera Eyeball */}
        <mesh material={scleraMat} scale={[0.024, 0.019, 0.018]}>
          <sphereGeometry args={[1, 20, 16]} />
        </mesh>
        {/* Limbal Ring & Emerald Green Iris */}
        <mesh material={limbalRingMat} position={[0, 0, 0.0145]} scale={[0.0125, 0.0125, 0.002]}>
          <cylinderGeometry args={[1, 1, 1, 20]} />
        </mesh>
        <mesh material={irisMat} position={[0, 0, 0.015]} scale={[0.011, 0.011, 0.004]}>
          <cylinderGeometry args={[1, 1, 1, 20]} />
        </mesh>
        {/* Pupil & High-gloss Gleam */}
        <mesh ref={leftPupilRef} material={pupilMat} position={[0, 0, 0.017]} scale={[0.0055, 0.0055, 0.002]}>
          <cylinderGeometry args={[1, 1, 1, 16]} />
        </mesh>
        <mesh material={pupilGleamMat} position={[0.003, 0.0035, 0.0185]} scale={[0.0022, 0.0022, 0.001]}>
          <sphereGeometry args={[1, 8, 8]} />
        </mesh>
        {/* Upper Eyelash Contour */}
        <mesh material={eyelashMat} position={[0, 0.012, 0.015]} rotation={[0.2, 0, -0.1]} scale={[0.024, 0.003, 0.004]}>
          <capsuleGeometry args={[1, 1, 8, 12]} />
        </mesh>
        {/* Upper Eyelid for Blinking */}
        <mesh ref={leftEyelidUpperRef} material={skinMat} position={[0, 0.014, 0.01]} scale={[0.026, 0.016, 0.02]}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
      </group>

      {/* 3. Right Eye System */}
      <group position={[0.048, 0.024, 0.108]}>
        {/* Sclera Eyeball */}
        <mesh material={scleraMat} scale={[0.024, 0.019, 0.018]}>
          <sphereGeometry args={[1, 20, 16]} />
        </mesh>
        {/* Limbal Ring & Emerald Green Iris */}
        <mesh material={limbalRingMat} position={[0, 0, 0.0145]} scale={[0.0125, 0.0125, 0.002]}>
          <cylinderGeometry args={[1, 1, 1, 20]} />
        </mesh>
        <mesh material={irisMat} position={[0, 0, 0.015]} scale={[0.011, 0.011, 0.004]}>
          <cylinderGeometry args={[1, 1, 1, 20]} />
        </mesh>
        {/* Pupil & High-gloss Gleam */}
        <mesh ref={rightPupilRef} material={pupilMat} position={[0, 0, 0.017]} scale={[0.0055, 0.0055, 0.002]}>
          <cylinderGeometry args={[1, 1, 1, 16]} />
        </mesh>
        <mesh material={pupilGleamMat} position={[0.003, 0.0035, 0.0185]} scale={[0.0022, 0.0022, 0.001]}>
          <sphereGeometry args={[1, 8, 8]} />
        </mesh>
        {/* Upper Eyelash Contour */}
        <mesh material={eyelashMat} position={[0, 0.012, 0.015]} rotation={[0.2, 0, 0.1]} scale={[0.024, 0.003, 0.004]}>
          <capsuleGeometry args={[1, 1, 8, 12]} />
        </mesh>
        {/* Upper Eyelid for Blinking */}
        <mesh ref={rightEyelidUpperRef} material={skinMat} position={[0, 0.014, 0.01]} scale={[0.026, 0.016, 0.02]}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
      </group>

      {/* 4. Eyebrows (Dynamically angled based on Gemini emotional tone) */}
      <group position={[0, 0, 0.116]}>
        <mesh ref={leftBrowRef} material={browMat} position={[-0.048, 0.065, 0]} rotation={[0, 0, -0.06]} scale={[0.038, 0.006, 0.008]}>
          <capsuleGeometry args={[1, 1, 8, 12]} />
        </mesh>
        <mesh ref={rightBrowRef} material={browMat} position={[0.048, 0.065, 0]} rotation={[0, 0, 0.06]} scale={[0.038, 0.006, 0.008]}>
          <capsuleGeometry args={[1, 1, 8, 12]} />
        </mesh>
      </group>

      {/* 5. Dynamic Mouth, Teeth & Real-Time Oral Cavity */}
      <group position={[0, 0, 0.108]}>
        {/* Oral Cavity Depth */}
        <mesh ref={oralCavityRef} material={oralCavityMat} position={[0, -0.042, 0]}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>

        {/* Teeth Upper Row */}
        <mesh ref={teethUpperRef} material={teethMat} position={[0, -0.038, 0.01]} scale={[0.026, 0.007, 0.008]}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>

        {/* Upper Lip */}
        <mesh ref={upperLipRef} material={lipMat} position={[0, -0.034, 0.016]} scale={[0.036, 0.0075, 0.012]}>
          <capsuleGeometry args={[1, 1, 10, 14]} />
        </mesh>

        {/* Lower Lip */}
        <mesh ref={lowerLipRef} material={lipMat} position={[0, -0.052, 0.015]} scale={[0.038, 0.0085, 0.014]}>
          <capsuleGeometry args={[1, 1, 10, 14]} />
        </mesh>
      </group>

      {/* 6. Hair System */}
      <MaluHair />

      {/* 7. Neck & Torso Collar */}
      <MaluTorsoCollar />
    </group>
  );
}

/**
 * Main 3D Canvas Stage for Malu Avatar
 */
function MaluScene({ interactiveGaze = true }: { interactiveGaze?: boolean }) {
  const globalState = useAvatarGlobalState();
  const { maluEmotion, maluLipSync } = globalState;

  return (
    <>
      {/* 3-Point Studio Lighting Rig */}
      <ambientLight intensity={0.95} />
      <directionalLight position={[2.5, 3.5, 3]} intensity={1.4} castShadow shadow-mapSize={512} />
      <directionalLight position={[-2.5, 1.5, 2]} intensity={0.8} color="#e0f2fe" />
      <directionalLight position={[0, 2, -3]} intensity={1.1} color="#10b981" />

      {/* Interactive Floating Micro-Bounce */}
      <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.3}>
        <MaluFaceRig
          emotion={maluEmotion || 'neutral'}
          isSpeaking={maluLipSync.isSpeaking}
          mouthOpen={maluLipSync.mouthOpen}
          mouthSpread={maluLipSync.mouthSpread}
          audioVolume={maluLipSync.audioVolume}
          interactiveGaze={interactiveGaze}
        />

        {/* Sound Wave & Emotional Resonance Halo */}
        <EmotionalHaloRing
          emotion={maluEmotion || 'neutral'}
          isSpeaking={maluLipSync.isSpeaking}
          volume={maluLipSync.audioVolume}
        />
      </Float>

      {/* Ground Contact Shadow */}
      <ContactShadows position={[0, -0.42, 0]} opacity={0.4} scale={1.2} blur={1.8} far={1.5} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.7}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
      />
    </>
  );
}

export function Malu3DAvatar({
  size = 'hero',
  showControls = true,
  interactiveGaze = true,
  onTalkClick,
  className = ''
}: Malu3DAvatarProps) {
  const globalState = useAvatarGlobalState();
  const { maluEmotion, maluLipSync } = globalState;

  const sizeClasses = {
    sm: 'w-24 h-24 sm:w-28 sm:h-28',
    md: 'w-36 h-36 sm:w-44 sm:h-44',
    lg: 'w-48 h-48 sm:w-56 sm:h-56',
    hero: 'w-48 h-48 sm:w-60 sm:h-60 md:w-64 md:h-64'
  }[size];

  const emotionBadgeMeta = useMemo(() => {
    switch (maluEmotion) {
      case 'alegre':
      case 'happy':
        return { label: 'Alegre & Acolhedora', icon: <Smile className="w-3.5 h-3.5 text-emerald-400" />, color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' };
      case 'focada':
      case 'motivating':
        return { label: 'Focada & Determinada', icon: <Flame className="w-3.5 h-3.5 text-amber-400" />, color: 'bg-amber-500/15 border-amber-500/30 text-amber-300' };
      case 'calma':
        return { label: 'Calma & Serena', icon: <Heart className="w-3.5 h-3.5 text-teal-400" />, color: 'bg-teal-500/15 border-teal-500/30 text-teal-300' };
      case 'pensativa':
      case 'thoughtful':
        return { label: 'Pensativa & Analítica', icon: <Brain className="w-3.5 h-3.5 text-cyan-400" />, color: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' };
      case 'neutral':
      default:
        return { label: 'Pronta para Orientar', icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />, color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' };
    }
  }, [maluEmotion]);

  const handleTestVoice = (testEmotion: MaluEmotionType) => {
    playSfx('tap');
    vibrate(20);
    avatarGlobalStore.setMaluEmotion(testEmotion);

    const phrases = {
      alegre: "Que alegria ver você cuidando da sua saúde hoje! Vamos juntos conquistar seus objetivos com muita energia positiva! 💚",
      happy: "Que alegria ver você cuidando da sua saúde hoje! Parabéns pela sua dedicação! 💚",
      focada: "Foco total na sua meta! Cada refeição equilibrada e cada treino contam para sua melhor performance! 🔥",
      motivating: "Vamos lá com força total! Cada refeição e treino te aproxima da sua melhor versão! 🔥",
      calma: "Respire fundo e mantenha a consistência. O equilíbrio e o autocuidado diário trazem os resultados mais sólidos. 🌿",
      pensativa: "Analisando seus dados nutricionais e gasto energético... O equilíbrio de macronutrientes é fundamental. 💡",
      thoughtful: "Analisando seus dados nutricionais e gasto energético... O equilíbrio de macronutrientes é essencial. 🤔",
      neutral: "Olá! Sou a Malu, sua nutricionista e treinadora inteligente. Como posso te orientar hoje?"
    };

    speak(phrases[testEmotion] || phrases.alegre, {
      voice: 'Aoede',
      emotion: testEmotion,
      lang: 'pt-BR'
    });
  };

  return (
    <ErrorBoundary fallback={<div className={`${sizeClasses} rounded-full bg-slate-900 border border-emerald-500/30 flex items-center justify-center text-emerald-400`}><Sparkles className="w-8 h-8" /></div>}>
      <div className={`flex flex-col items-center justify-center relative ${className}`}>
        {/* 3D Canvas Box */}
        <div className={`relative ${sizeClasses} rounded-3xl overflow-hidden p-1 bg-gradient-to-br from-[#10B981]/20 via-[#151B23]/90 to-[#D4AF37]/15 border border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.25)] group`}>
          
          {/* Real-time WebGL Canvas */}
          <Canvas
            camera={{ position: [0, 0.05, 0.65], fov: 38 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          >
            <MaluScene interactiveGaze={interactiveGaze} />
          </Canvas>

          {/* Real-time Speaking Pulsing Indicator */}
          {maluLipSync.isSpeaking && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/50 backdrop-blur-md text-[10px] font-bold text-emerald-300 uppercase tracking-wider animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Falando...</span>
            </div>
          )}

          {/* Quick Talk Button Overlay */}
          {onTalkClick && (
            <button
              type="button"
              onClick={onTalkClick}
              className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
              title="Falar com a Malu"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Emotion State Badge */}
        {showControls && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold backdrop-blur-md shadow-sm transition-all ${emotionBadgeMeta.color}`}>
              {emotionBadgeMeta.icon}
              <span>{emotionBadgeMeta.label}</span>
            </div>

            {/* Quick Emotion & Lip-Sync Preview Pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => handleTestVoice('alegre')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition active:scale-95 cursor-pointer ${
                  maluEmotion === 'alegre' || maluEmotion === 'happy'
                    ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
                title="Testar tom Alegre"
              >
                😊 Alegre
              </button>
              <button
                type="button"
                onClick={() => handleTestVoice('focada')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition active:scale-95 cursor-pointer ${
                  maluEmotion === 'focada' || maluEmotion === 'motivating'
                    ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
                title="Testar tom Focada"
              >
                🎯 Focada
              </button>
              <button
                type="button"
                onClick={() => handleTestVoice('calma')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition active:scale-95 cursor-pointer ${
                  maluEmotion === 'calma'
                    ? 'bg-teal-500/30 text-teal-300 border-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.3)]'
                    : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/30'
                }`}
                title="Testar tom Calma"
              >
                🌿 Calma
              </button>
              <button
                type="button"
                onClick={() => handleTestVoice('pensativa')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition active:scale-95 cursor-pointer ${
                  maluEmotion === 'pensativa' || maluEmotion === 'thoughtful'
                    ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                }`}
                title="Testar tom Pensativa"
              >
                💡 Pensativa
              </button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
export default Malu3DAvatar;
