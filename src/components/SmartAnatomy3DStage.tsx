import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { DetailedExercise } from '../data/exerciseDatabase';
import { AvatarAnatomico } from './AvatarAnatomico';

interface SmartAnatomy3DStageProps {
  exercise: DetailedExercise;
  gender?: 'male' | 'female';
  cameraView: 'front' | 'side' | 'detail';
  isPlaying: boolean;
  playbackSpeed: number;
  isMirrorMode?: boolean;
  highlightMuscleOverride?: string | null;
  onCycleUpdate?: (cycle: number, phase: 'concentric' | 'eccentric', breath: 'inhale' | 'exhale') => void;
}

// Camera controller smoothly moving between Front, Side, and Detail viewpoints
function CameraRig({
  cameraView,
  category,
}: {
  cameraView: 'front' | 'side' | 'detail';
  category: string;
}) {
  const { camera } = useThree();

  const target = useMemo(() => {
    if (cameraView === 'side') {
      return {
        pos: new THREE.Vector3(3.5, 0.85, 0.25),
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
          pos: new THREE.Vector3(0, 1.15, 1.6),
          lookAt: new THREE.Vector3(0, 1.08, 0),
        };
      }
      if (category === 'biceps' || category === 'triceps') {
        return {
          pos: new THREE.Vector3(0.65, 1.05, 1.55),
          lookAt: new THREE.Vector3(0.25, 0.95, 0),
        };
      }
      if (category === 'legs' || category === 'glutes') {
        return {
          pos: new THREE.Vector3(0, 0.45, 1.8),
          lookAt: new THREE.Vector3(0, 0.45, 0),
        };
      }
      if (category === 'back') {
        return {
          pos: new THREE.Vector3(0, 1.2, -1.8),
          lookAt: new THREE.Vector3(0, 1.1, 0),
        };
      }
      return {
        pos: new THREE.Vector3(0, 1.1, 1.7),
        lookAt: new THREE.Vector3(0, 0.95, 0),
      };
    }
    // Front view default
    return {
      pos: new THREE.Vector3(0, 0.85, 3.4),
      lookAt: new THREE.Vector3(0, 0.85, 0),
    };
  }, [cameraView, category]);

  useFrame(() => {
    camera.position.lerp(target.pos, 0.08);
    camera.lookAt(target.lookAt);
  });

  return null;
}

// 3D Gym Bench (flat or incline)
function GymBench({ position = 'seated' }: { position: string }) {
  const metalMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.35,
    metalness: 0.85,
  }), []);

  const leatherMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a2233',
    roughness: 0.75,
    metalness: 0.1,
  }), []);

  if (position === 'seated') {
    return (
      <group position={[0, -0.32, -0.05]}>
        {/* Seat cushion */}
        <mesh material={leatherMat} position={[0, 0.46, 0.08]} castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.07, 0.36]} />
        </mesh>
        {/* Backrest */}
        <mesh material={leatherMat} position={[0, 0.88, -0.12]} rotation={[0.08, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.74, 0.06]} />
        </mesh>
        {/* Frame pillar */}
        <mesh material={metalMat} position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.44, 16]} />
        </mesh>
        {/* Base legs */}
        <mesh material={metalMat} position={[0, 0.02, 0.22]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.52, 16]} />
        </mesh>
        <mesh material={metalMat} position={[0, 0.02, -0.25]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.52, 16]} />
        </mesh>
      </group>
    );
  }

  if (position === 'incline') {
    return (
      <group position={[0, -0.32, -0.05]}>
        <mesh material={leatherMat} position={[0, 0.44, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.07, 0.34]} />
        </mesh>
        <mesh material={leatherMat} position={[0, 0.76, -0.2]} rotation={[-Math.PI / 6, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.78, 0.06]} />
        </mesh>
        <mesh material={metalMat} position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.4, 16]} />
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

// 3D Dumbbells in hand
function DumbbellGrip({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const chromeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.15,
    metalness: 0.95,
  }), []);

  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0b0f19',
    roughness: 0.4,
    metalness: 0.75,
  }), []);

  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      {/* Chrome Handle Bar */}
      <mesh material={chromeMat} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 0.22, 16]} />
      </mesh>
      {/* Outer Weight Plates Left */}
      <mesh material={plateMat} position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.085, 0.085, 0.028, 24]} />
      </mesh>
      <mesh material={plateMat} position={[-0.108, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.022, 24]} />
      </mesh>
      {/* Outer Weight Plates Right */}
      <mesh material={plateMat} position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.085, 0.085, 0.028, 24]} />
      </mesh>
      <mesh material={plateMat} position={[0.108, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.022, 24]} />
      </mesh>
    </group>
  );
}

// 3D Barbell Bar
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
      {/* Long Olympic Bar */}
      <mesh material={chromeMat} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 1.5, 24]} />
      </mesh>
      {/* Big Olympic Plates */}
      <mesh material={plateMat} position={[-0.65, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 28]} />
      </mesh>
      <mesh material={plateMat} position={[0.65, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 28]} />
      </mesh>
    </group>
  );
}

// Individual Anatomical Muscle Component with Fiery Glowing Shader
function AnatomicalMuscleNode({
  geometry,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  muscleTag,
  primaryMuscles,
  secondaryMuscles,
  isPlaying,
  highlightOverride,
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  muscleTag: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  isPlaying: boolean;
  highlightOverride?: string | null;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const isPrimary = useMemo(() => {
    if (highlightOverride) {
      return highlightOverride.toLowerCase().includes(muscleTag.toLowerCase()) ||
             muscleTag.toLowerCase().includes(highlightOverride.toLowerCase());
    }
    const tag = muscleTag.toLowerCase();
    return primaryMuscles.some(m => {
      const lower = m.toLowerCase();
      if (tag === 'deltoid' && (lower.includes('deltoide') || lower.includes('ombro'))) return true;
      if (tag === 'chest' && (lower.includes('peitoral') || lower.includes('peito'))) return true;
      if (tag === 'lat' && (lower.includes('dorsal') || lower.includes('costas') || lower.includes('lat'))) return true;
      if (tag === 'trapezius' && lower.includes('trapézio')) return true;
      if (tag === 'bicep' && lower.includes('bíceps')) return true;
      if (tag === 'tricep' && lower.includes('tríceps')) return true;
      if (tag === 'abs' && (lower.includes('abd') || lower.includes('core') || lower.includes('reto'))) return true;
      if (tag === 'quad' && (lower.includes('quadríceps') || lower.includes('coxa'))) return true;
      if (tag === 'hamstring' && (lower.includes('isquio') || lower.includes('posterior'))) return true;
      if (tag === 'glute' && lower.includes('glúteo')) return true;
      if (tag === 'calf' && (lower.includes('panturrilha') || lower.includes('gêmeo'))) return true;
      return lower.includes(tag);
    });
  }, [muscleTag, primaryMuscles, highlightOverride]);

  const isSecondary = useMemo(() => {
    if (isPrimary) return false;
    const tag = muscleTag.toLowerCase();
    return secondaryMuscles.some(m => {
      const lower = m.toLowerCase();
      if (tag === 'deltoid' && (lower.includes('deltoide') || lower.includes('ombro'))) return true;
      if (tag === 'chest' && (lower.includes('peitoral') || lower.includes('peito'))) return true;
      if (tag === 'lat' && (lower.includes('dorsal') || lower.includes('costas'))) return true;
      if (tag === 'trapezius' && lower.includes('trapézio')) return true;
      if (tag === 'bicep' && lower.includes('bíceps')) return true;
      if (tag === 'tricep' && lower.includes('tríceps')) return true;
      if (tag === 'abs' && (lower.includes('abd') || lower.includes('core'))) return true;
      if (tag === 'quad' && lower.includes('quadríceps')) return true;
      if (tag === 'hamstring' && lower.includes('isquio')) return true;
      if (tag === 'glute' && lower.includes('glúteo')) return true;
      if (tag === 'calf' && lower.includes('panturrilha')) return true;
      return lower.includes(tag);
    });
  }, [isPrimary, muscleTag, secondaryMuscles]);

  const mat = useMemo(() => {
    if (isPrimary) {
      // Matching Reference Print 3: High-contrast burning fiery neon orange with emissive energy!
      return new THREE.MeshPhysicalMaterial({
        color: '#ff5500',
        emissive: '#ff4400',
        emissiveIntensity: 3.2,
        roughness: 0.22,
        metalness: 0.15,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
      });
    }

    if (isSecondary) {
      // Amber/Gold highlight for secondary assisting muscles
      return new THREE.MeshPhysicalMaterial({
        color: '#f59e0b',
        emissive: '#d97706',
        emissiveIntensity: 1.4,
        roughness: 0.35,
        metalness: 0.2,
        clearcoat: 0.3,
        clearcoatRoughness: 0.3,
      });
    }

    // Neutral Sleek Dark Athletic Anatomical Body (Graphite Titanium)
    return new THREE.MeshPhysicalMaterial({
      color: '#1a2233',
      roughness: 0.45,
      metalness: 0.25,
      clearcoat: 0.2,
      clearcoatRoughness: 0.4,
    });
  }, [isPrimary, isSecondary]);

  useFrame((state) => {
    if (!meshRef.current || (!isPrimary && !isSecondary)) return;
    if (meshRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      const t = state.clock.getElapsedTime();
      const pulseSpeed = isPlaying ? 4.5 : 2.0;
      const baseIntensity = isPrimary ? 3.0 : 1.3;
      const pulse = Math.sin(t * pulseSpeed) * 0.7 + baseIntensity;
      meshRef.current.material.emissiveIntensity = pulse;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={mat}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
}

// High-Fidelity Anatomical Humanoid Mannequin Avatar
function AnatomicalAvatarModel({
  exercise,
  gender = 'male',
  isPlaying,
  playbackSpeed,
  highlightOverride,
  onCycleUpdate,
}: {
  exercise: DetailedExercise;
  gender?: 'male' | 'female';
  isPlaying: boolean;
  playbackSpeed: number;
  highlightOverride?: string | null;
  onCycleUpdate?: (cycle: number, phase: 'concentric' | 'eccentric', breath: 'inhale' | 'exhale') => void;
}) {
  const rootGroup = useRef<THREE.Group>(null);
  const spineGroup = useRef<THREE.Group>(null);
  const leftShoulder = useRef<THREE.Group>(null);
  const rightShoulder = useRef<THREE.Group>(null);
  const leftElbow = useRef<THREE.Group>(null);
  const rightElbow = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftKnee = useRef<THREE.Group>(null);
  const rightKnee = useRef<THREE.Group>(null);

  const isFemale = gender === 'female';
  const chestScaleFactor = isFemale ? 0.92 : 1.05;
  const waistScaleFactor = isFemale ? 0.85 : 0.98;
  const shoulderWidth = isFemale ? 0.28 : 0.32;

  // Sculpted anatomical geometries
  const geo = useMemo(() => ({
    head: new THREE.SphereGeometry(0.16, 32, 32),
    neck: new THREE.CylinderGeometry(0.08, 0.11, 0.16, 24),
    pectoral: new THREE.CapsuleGeometry(0.14, 0.22, 24, 24),
    deltoid: new THREE.SphereGeometry(0.135, 24, 24),
    trapezius: new THREE.BoxGeometry(0.24, 0.12, 0.1),
    bicep: new THREE.CapsuleGeometry(0.082, 0.19, 20, 20),
    tricep: new THREE.CapsuleGeometry(0.078, 0.18, 20, 20),
    forearm: new THREE.CapsuleGeometry(0.068, 0.22, 20, 20),
    hand: new THREE.CapsuleGeometry(0.045, 0.09, 16, 16),
    absUpper: new THREE.BoxGeometry(0.12, 0.08, 0.06),
    absMid: new THREE.BoxGeometry(0.11, 0.08, 0.06),
    absLower: new THREE.BoxGeometry(0.10, 0.07, 0.06),
    obliques: new THREE.CapsuleGeometry(0.06, 0.22, 16, 16),
    lat: new THREE.CapsuleGeometry(0.095, 0.26, 20, 20),
    glutes: new THREE.SphereGeometry(0.15, 24, 24),
    quadriceps: new THREE.CapsuleGeometry(0.118, 0.34, 24, 24),
    hamstring: new THREE.CapsuleGeometry(0.10, 0.32, 20, 20),
    knee: new THREE.SphereGeometry(0.055, 16, 16),
    calf: new THREE.CapsuleGeometry(0.085, 0.30, 24, 24),
    foot: new THREE.CapsuleGeometry(0.055, 0.18, 16, 16),
    shorts: new THREE.CapsuleGeometry(0.165, 0.26, 24, 24),
  }), []);

  const darkApparelMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#080c14',
    roughness: 0.85,
    metalness: 0.15,
  }), []);

  // Biomechanical Motion Engine
  useFrame((state) => {
    if (!rootGroup.current) return;
    const time = state.clock.getElapsedTime() * (isPlaying ? playbackSpeed : 0);
    // Smooth harmonic cycle between 0 and 1
    const cycle = (Math.sin(time * 2.2) + 1) / 2;
    const isConcentric = Math.cos(time * 2.2) > 0;

    if (onCycleUpdate) {
      onCycleUpdate(
        cycle,
        isConcentric ? 'concentric' : 'eccentric',
        isConcentric ? 'exhale' : 'inhale'
      );
    }

    const pos = exercise.position;
    const isSeated = pos === 'seated';
    const isLying = pos === 'lying';
    const isStanding = pos === 'standing';

    // Position & Root Anchor
    if (isSeated) {
      rootGroup.current.position.set(0, 0.12, 0.04);
      rootGroup.current.rotation.set(0, 0, 0);
      if (leftLeg.current) {
        leftLeg.current.position.set(-0.16, 0.08, 0.05);
        leftLeg.current.rotation.set(-1.45, 0, -0.15);
      }
      if (rightLeg.current) {
        rightLeg.current.position.set(0.16, 0.08, 0.05);
        rightLeg.current.rotation.set(-1.45, 0, 0.15);
      }
      if (leftKnee.current) leftKnee.current.rotation.set(1.48, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(1.48, 0, 0);
    } else if (isLying) {
      rootGroup.current.position.set(0, 0.38, -0.35);
      rootGroup.current.rotation.set(Math.PI / 2, 0, 0);
      if (leftLeg.current) {
        leftLeg.current.position.set(-0.16, 0.08, -0.1);
        leftLeg.current.rotation.set(-1.25, 0, -0.1);
      }
      if (rightLeg.current) {
        rightLeg.current.position.set(0.16, 0.08, -0.1);
        rightLeg.current.rotation.set(-1.25, 0, 0.1);
      }
      if (leftKnee.current) leftKnee.current.rotation.set(1.35, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(1.35, 0, 0);
    } else {
      rootGroup.current.position.set(0, 0.35, 0);
      rootGroup.current.rotation.set(0, 0, 0);
      if (leftLeg.current) {
        leftLeg.current.position.set(-0.15, 0.08, 0);
        leftLeg.current.rotation.set(0, 0, -0.05);
      }
      if (rightLeg.current) {
        rightLeg.current.position.set(0.15, 0.08, 0);
        rightLeg.current.rotation.set(0, 0, 0.05);
      }
      if (leftKnee.current) leftKnee.current.rotation.set(0, 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(0, 0, 0);
    }

    // Kinematic Joint Animations by Exercise ID
    const exId = exercise.id;

    if (exId === 'seated-lateral-raises') {
      // Reference Print: Seated Lateral Raise execution with dumbbells!
      const raiseAngle = cycle * 1.35; // Abduction up to 90 degrees shoulder height
      if (leftShoulder.current) leftShoulder.current.rotation.set(0.12, 0, raiseAngle);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0.12, 0, -raiseAngle);
      // Slight fixed ~15° elbow bend
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

    } else if (exId === 'plank') {
      // Isometric breathing pulsation
      const breathPulse = Math.sin(time * 3) * 0.02;
      if (spineGroup.current) spineGroup.current.rotation.set(breathPulse, 0, 0);

    } else if (exId === 'cable-crunch' || exId === 'bicycle-crunch') {
      const crunchDepth = cycle * 0.65;
      if (spineGroup.current) spineGroup.current.rotation.set(crunchDepth, 0, 0);
      if (leftShoulder.current) leftShoulder.current.rotation.set(1.4, 0, 0.2);
      if (rightShoulder.current) rightShoulder.current.rotation.set(1.4, 0, -0.2);
      if (leftElbow.current) leftElbow.current.rotation.set(1.4, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(1.4, 0, 0);

    } else if (exId === 'jumping-jacks') {
      const jackCycle = cycle;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0, 0, jackCycle * 2.2);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0, 0, -jackCycle * 2.2);
      if (leftLeg.current) leftLeg.current.rotation.set(0, 0, -jackCycle * 0.45);
      if (rightLeg.current) rightLeg.current.rotation.set(0, 0, jackCycle * 0.45);
      if (rootGroup.current) rootGroup.current.position.set(0, 0.35 + (jackCycle > 0.5 ? 0.06 : 0), 0);

    } else if (exId === 'treadmill-running') {
      const runCycle = Math.sin(time * 8 * playbackSpeed);
      if (leftShoulder.current) leftShoulder.current.rotation.set(runCycle * 0.8, 0, 0.1);
      if (rightShoulder.current) rightShoulder.current.rotation.set(-runCycle * 0.8, 0, -0.1);
      if (leftElbow.current) leftElbow.current.rotation.set(1.2, 0, 0);
      if (rightElbow.current) rightElbow.current.rotation.set(1.2, 0, 0);
      if (leftLeg.current) leftLeg.current.rotation.set(-runCycle * 0.7, 0, 0);
      if (rightLeg.current) rightLeg.current.rotation.set(runCycle * 0.7, 0, 0);
      if (leftKnee.current) leftKnee.current.rotation.set(Math.max(0, -runCycle * 1.1), 0, 0);
      if (rightKnee.current) rightKnee.current.rotation.set(Math.max(0, runCycle * 1.1), 0, 0);

    } else if (exId === 'shoulder-mobility') {
      const mobAngle = cycle * 2.8;
      if (leftShoulder.current) leftShoulder.current.rotation.set(mobAngle, 0, 0.2);
      if (rightShoulder.current) rightShoulder.current.rotation.set(mobAngle, 0, -0.2);

    } else if (exId === 'hip-mobility') {
      const rotAngle = Math.sin(time * 2.5 * playbackSpeed) * 0.5;
      if (leftLeg.current) leftLeg.current.rotation.set(-1.45, rotAngle, -0.2);
      if (rightLeg.current) rightLeg.current.rotation.set(-1.45, -rotAngle, 0.2);

    } else {
      // Generic harmonic abduction
      const genRaise = cycle * 0.8;
      if (leftShoulder.current) leftShoulder.current.rotation.set(0, 0, genRaise);
      if (rightShoulder.current) rightShoulder.current.rotation.set(0, 0, -genRaise);
    }
  });

  const prim = exercise.primaryMuscles;
  const sec = exercise.secondaryMuscles;

  return (
    <group ref={rootGroup}>
      {/* Torso Spine Anchor */}
      <group ref={spineGroup} position={[0, 0.52, 0]}>
        
        {/* Head & Neck */}
        <group position={[0, 0.58, 0]}>
          <AnatomicalMuscleNode
            geometry={geo.head}
            position={[0, 0.09, 0]}
            scale={[0.85, 1.0, 0.92]}
            muscleTag="head"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.neck}
            position={[0, -0.06, 0]}
            muscleTag="neck"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          {/* Defined Trapezius Muscle */}
          <AnatomicalMuscleNode
            geometry={geo.trapezius}
            position={[0, -0.08, -0.05]}
            muscleTag="trapezius"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
        </group>

        {/* Chest (Left & Right Pectorals) */}
        <group position={[0, 0.38, 0.04]} scale={[chestScaleFactor, 1, 1]}>
          <AnatomicalMuscleNode
            geometry={geo.pectoral}
            position={[-0.11, 0, 0]}
            rotation={[0.1, 0.2, 0.15]}
            muscleTag="chest"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.pectoral}
            position={[0.11, 0, 0]}
            rotation={[0.1, -0.2, -0.15]}
            muscleTag="chest"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
        </group>

        {/* Lats (Grande Dorsal) Left & Right */}
        <group position={[0, 0.34, -0.05]}>
          <AnatomicalMuscleNode
            geometry={geo.lat}
            position={[-0.17, 0, 0]}
            rotation={[0.08, -0.1, -0.22]}
            muscleTag="lat"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.lat}
            position={[0.17, 0, 0]}
            rotation={[0.08, 0.1, 0.22]}
            muscleTag="lat"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
        </group>

        {/* 6-Pack Abs & Core (Upper, Mid, Lower Rectus Abdominis) */}
        <group position={[0, 0.18, 0.08]} scale={[waistScaleFactor, 1, 1]}>
          <AnatomicalMuscleNode
            geometry={geo.absUpper}
            position={[-0.055, 0.08, 0]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.absUpper}
            position={[0.055, 0.08, 0]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.absMid}
            position={[-0.05, 0, 0]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.absMid}
            position={[0.05, 0, 0]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.absLower}
            position={[-0.045, -0.075, 0]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.absLower}
            position={[0.045, -0.075, 0]}
            muscleTag="abs"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
        </group>

        {/* Left Arm & Shoulder Group */}
        <group ref={leftShoulder} position={[-shoulderWidth, 0.44, 0]}>
          <AnatomicalMuscleNode
            geometry={geo.deltoid}
            position={[0, 0, 0]}
            muscleTag="deltoid"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.bicep}
            position={[-0.03, -0.16, 0.03]}
            muscleTag="bicep"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.tricep}
            position={[0.02, -0.16, -0.03]}
            muscleTag="tricep"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          {/* Left Forearm & Hand */}
          <group ref={leftElbow} position={[-0.02, -0.28, 0]}>
            <AnatomicalMuscleNode
              geometry={geo.forearm}
              position={[0, -0.12, 0]}
              muscleTag="forearm"
              primaryMuscles={prim}
              secondaryMuscles={sec}
              isPlaying={isPlaying}
              highlightOverride={highlightOverride}
            />
            <AnatomicalMuscleNode
              geometry={geo.hand}
              position={[0, -0.24, 0]}
              muscleTag="hand"
              primaryMuscles={prim}
              secondaryMuscles={sec}
              isPlaying={isPlaying}
              highlightOverride={highlightOverride}
            />
            {exercise.equipment === 'dumbbells' && (
              <DumbbellGrip position={[0, -0.25, 0]} />
            )}
          </group>
        </group>

        {/* Right Arm & Shoulder Group */}
        <group ref={rightShoulder} position={[shoulderWidth, 0.44, 0]}>
          <AnatomicalMuscleNode
            geometry={geo.deltoid}
            position={[0, 0, 0]}
            muscleTag="deltoid"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.bicep}
            position={[0.03, -0.16, 0.03]}
            muscleTag="bicep"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.tricep}
            position={[-0.02, -0.16, -0.03]}
            muscleTag="tricep"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          {/* Right Forearm & Hand */}
          <group ref={rightElbow} position={[0.02, -0.28, 0]}>
            <AnatomicalMuscleNode
              geometry={geo.forearm}
              position={[0, -0.12, 0]}
              muscleTag="forearm"
              primaryMuscles={prim}
              secondaryMuscles={sec}
              isPlaying={isPlaying}
              highlightOverride={highlightOverride}
            />
            <AnatomicalMuscleNode
              geometry={geo.hand}
              position={[0, -0.24, 0]}
              muscleTag="hand"
              primaryMuscles={prim}
              secondaryMuscles={sec}
              isPlaying={isPlaying}
              highlightOverride={highlightOverride}
            />
            {exercise.equipment === 'dumbbells' && (
              <DumbbellGrip position={[0, -0.25, 0]} />
            )}
          </group>
        </group>
      </group>

      {/* Pelvis & Dark Athletic Compression Shorts */}
      <group position={[0, 0.48, 0]}>
        <mesh material={darkApparelMat} position={[0, -0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.18, 0.22]} />
        </mesh>
        <AnatomicalMuscleNode
          geometry={geo.glutes}
          position={[-0.1, -0.08, -0.08]}
          muscleTag="glute"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          highlightOverride={highlightOverride}
        />
        <AnatomicalMuscleNode
          geometry={geo.glutes}
          position={[0.1, -0.08, -0.08]}
          muscleTag="glute"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          highlightOverride={highlightOverride}
        />
      </group>

      {/* Left Leg Group */}
      <group ref={leftLeg} position={[-0.14, 0.42, 0]}>
        <AnatomicalMuscleNode
          geometry={geo.quadriceps}
          position={[0, -0.19, 0.04]}
          muscleTag="quad"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          highlightOverride={highlightOverride}
        />
        <AnatomicalMuscleNode
          geometry={geo.hamstring}
          position={[0, -0.18, -0.04]}
          muscleTag="hamstring"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          highlightOverride={highlightOverride}
        />
        {/* Left Knee & Lower Leg */}
        <group ref={leftKnee} position={[0, -0.38, 0]}>
          <AnatomicalMuscleNode
            geometry={geo.knee}
            position={[0, 0, 0.02]}
            muscleTag="knee"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.calf}
            position={[0, -0.16, -0.02]}
            muscleTag="calf"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.foot}
            position={[0, -0.33, 0.06]}
            rotation={[Math.PI / 2, 0, 0]}
            muscleTag="foot"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
        </group>
      </group>

      {/* Right Leg Group */}
      <group ref={rightLeg} position={[0.14, 0.42, 0]}>
        <AnatomicalMuscleNode
          geometry={geo.quadriceps}
          position={[0, -0.19, 0.04]}
          muscleTag="quad"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          highlightOverride={highlightOverride}
        />
        <AnatomicalMuscleNode
          geometry={geo.hamstring}
          position={[0, -0.18, -0.04]}
          muscleTag="hamstring"
          primaryMuscles={prim}
          secondaryMuscles={sec}
          isPlaying={isPlaying}
          highlightOverride={highlightOverride}
        />
        {/* Right Knee & Lower Leg */}
        <group ref={rightKnee} position={[0, -0.38, 0]}>
          <AnatomicalMuscleNode
            geometry={geo.knee}
            position={[0, 0, 0.02]}
            muscleTag="knee"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.calf}
            position={[0, -0.16, -0.02]}
            muscleTag="calf"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
          <AnatomicalMuscleNode
            geometry={geo.foot}
            position={[0, -0.33, 0.06]}
            rotation={[Math.PI / 2, 0, 0]}
            muscleTag="foot"
            primaryMuscles={prim}
            secondaryMuscles={sec}
            isPlaying={isPlaying}
            highlightOverride={highlightOverride}
          />
        </group>
      </group>

      {/* Barbell Prop (for bench press, barbell curl, barbell squat) */}
      {exercise.equipment === 'barbell' && (
        <BarbellBar
          position={
            exercise.position === 'lying'
              ? [0, 0.8, -0.1]
              : exercise.id === 'barbell-squat'
              ? [0, 1.05, -0.1]
              : [0, 0.65, 0.25]
          }
        />
      )}
    </group>
  );
}

// Stage Floor Cyber-Ring Platform
function StudioGymPlatform() {
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#080c16',
    roughness: 0.7,
    metalness: 0.3,
  }), []);

  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#10b981',
    wireframe: false,
    transparent: true,
    opacity: 0.35,
  }), []);

  return (
    <group position={[0, -0.33, 0]}>
      {/* Dark Circular Platform */}
      <mesh material={floorMat} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.5, 48]} />
      </mesh>
      {/* Outer Cyan-Emerald Ring */}
      <mesh material={ringMat} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.54, 48]} />
      </mesh>
      <mesh material={ringMat} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.1, 2.12, 48]} />
      </mesh>
    </group>
  );
}

export function SmartAnatomy3DStage(props: SmartAnatomy3DStageProps) {
  return (
    <AvatarAnatomico
      exercise={props.exercise}
      gender={props.gender}
      cameraView={props.cameraView}
      isPlaying={props.isPlaying}
      playbackSpeed={props.playbackSpeed}
      isMirrorMode={props.isMirrorMode}
      highlightMuscleOverride={props.highlightMuscleOverride}
      onCycleUpdate={props.onCycleUpdate}
      showReferenceControls={true}
      showOverlayBadges={false}
    />
  );
}

export { AvatarAnatomico } from './AvatarAnatomico';
export default SmartAnatomy3DStage;
