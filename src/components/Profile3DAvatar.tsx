import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import {
  Sparkles,
  Trophy,
  Flame,
  Zap,
  RefreshCw,
  Award,
  Star,
  Sun,
  Dumbbell,
  Palette,
  Droplets,
  Eye,
  Activity,
  Layers,
  Check,
  Sliders,
  Maximize2,
  ShieldCheck,
  SlidersHorizontal,
  Info,
  Circle,
  UserCheck
} from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { getAvatarById } from '../data/avatarCatalog';
import avatarGlobalStore, { useAvatarGlobalState } from '../lib/avatarGlobalState';
import {
  createSculptedTorsoCoreGeometry,
  createSculptedHeadGeometry,
  createSculptedNeckGeometry,
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
} from './AnatomicalSculptor';

export interface Profile3DAvatarProps {
  points?: number;
  streak?: number;
  level?: number;
  avatarId?: string;
  userSkinTone?: string;
  onAwardPoints?: (amount: number) => void;
  onOpenGallery?: () => void;
}

export type PoseType = 'idle' | 'flex' | 'celebrate' | 'jump' | 'spin';
export type LightingPreset = 'studio' | 'cyber' | 'solar' | 'emerald';
export type MuscleDefinitionLevel = 'natural' | 'fit' | 'hipertrofia';

// Skin & Avatar Material Palettes with realistic Fitzpatrick dermatological phototypes & subcutaneous undertones
export const SKIN_TONE_PALETTE = [
  { id: 'tanAthletic', name: 'Bronzeado Atlético', hex: '#d29469', subHex: '#b6381e', desc: 'Fototipo IV - Tom bronzeado esportivo com definição vascular e alto vigor dérmico' },
  { id: 'peachBeige', name: 'Bege Pêssego Natural', hex: '#f2cbb4', subHex: '#e85d47', desc: 'Fototipo II - Tez pêssego translúcida com rica difusão epidérmica' },
  { id: 'fairNordic', name: 'Porcelana Nórdica', hex: '#f8dfd4', subHex: '#f46b5a', desc: 'Fototipo I - Tez clara com subtons rosados de microcirculação' },
  { id: 'mediterranean', name: 'Dourado Mediterrâneo', hex: '#e2b38f', subHex: '#d44a33', desc: 'Fototipo III - Tom dourado aquecido e iluminado pelo sol' },
  { id: 'warmBronze', name: 'Moreno Tropical', hex: '#b8744b', subHex: '#9e2b17', desc: 'Fototipo V - Tom moreno quente e homogêneo com dispersão profunda' },
  { id: 'cinnamon', name: 'Castanho Canela', hex: '#8c4d31', subHex: '#731e0f', desc: 'Fototipo V+ - Tom castanho aveludado e rico em melanina' },
  { id: 'mahogany', name: 'Café Sublime', hex: '#5e3321', subHex: '#4a1409', desc: 'Fototipo VI - Tom café profundo com brilho specular acetinado' },
  { id: 'ebonyDeep', name: 'Ébano Profundo', hex: '#3b1e14', subHex: '#300c06', desc: 'Fototipo VI+ - Ébano escuro de alta pigmentação com reflexos vítreos' },
  { id: 'matteGray', name: 'Cinza Minimalista Fosco', hex: '#8e98a3', subHex: '#64748b', desc: 'Avatar minimalista sem rosto, músculos sólidos e estética de estúdio neutra' },
];

/**
 * High-Resolution Multi-Octave Procedural Skin Texture Generator
 * Creates isotropic micro-pore normals via finite-difference gradient and lipid roughness variation
 */
function createProceduralSkinTextures(): {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} | null {
  if (typeof document === 'undefined') return null;
  try {
    const size = 512;
    const normCanvas = document.createElement('canvas');
    normCanvas.width = size;
    normCanvas.height = size;
    const normCtx = normCanvas.getContext('2d');

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const roughCtx = roughCanvas.getContext('2d');

    if (!normCtx || !roughCtx) return null;

    const normImg = normCtx.createImageData(size, size);
    const roughImg = roughCtx.createImageData(size, size);

    const nData = normImg.data;
    const rData = roughImg.data;

    // Precalculate cellular heightfield using multi-scale harmonic dermal pores
    const heightField = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      const fy = y / size;
      for (let x = 0; x < size; x++) {
        const fx = x / size;

        // Multi-frequency organic cellular skin pores and subtle micro-lines
        const p1 = Math.sin(fx * 95.0) * Math.cos(fy * 95.0) * 0.42;
        const p2 = Math.sin(fx * 190.0 + fy * 160.0) * Math.cos(fx * 150.0 - fy * 190.0) * 0.28;
        const p3 = Math.sin(fx * 380.0 - fy * 320.0) * 0.18;
        const p4 = Math.cos(fx * 720.0 + fy * 680.0) * 0.12;

        // Follicular micro-pores (soft indentations)
        const cellNoise = Math.sin(fx * 240.0) * Math.sin(fy * 240.0);
        const poreDip = cellNoise > 0.65 ? -0.35 * (cellNoise - 0.65) * 2.8 : 0.0;

        heightField[y * size + x] = p1 + p2 + p3 + p4 + poreDip;
      }
    }

    // Finite central differences for physically accurate isotropic normal vectors
    const bumpStrength = 18.0;
    for (let y = 0; y < size; y++) {
      const yPrev = (y - 1 + size) % size;
      const yNext = (y + 1) % size;
      for (let x = 0; x < size; x++) {
        const xPrev = (x - 1 + size) % size;
        const xNext = (x + 1) % size;
        const idx = (y * size + x) * 4;

        const hL = heightField[y * size + xPrev];
        const hR = heightField[y * size + xNext];
        const hU = heightField[yPrev * size + x];
        const hD = heightField[yNext * size + x];
        const hCurrent = heightField[y * size + x];

        // Central difference gradient
        const dhdx = (hR - hL) * 0.5;
        const dhdy = (hD - hU) * 0.5;

        // Normal vector components
        const nx = Math.round(128 - dhdx * bumpStrength * 128);
        const ny = Math.round(128 - dhdy * bumpStrength * 128);
        const nz = 240;

        nData[idx] = Math.max(0, Math.min(255, nx));
        nData[idx + 1] = Math.max(0, Math.min(255, ny));
        nData[idx + 2] = Math.max(0, Math.min(255, nz));
        nData[idx + 3] = 255;

        // Roughness map: pores trap light (higher roughness), epidermal plateau has natural silky sebum sheen
        const baseRough = 100; // ~0.39 in normalized 0-1
        const poreRoughness = Math.round(baseRough + Math.max(0, -hCurrent) * 48);
        rData[idx] = Math.max(70, Math.min(180, poreRoughness));
        rData[idx + 1] = rData[idx];
        rData[idx + 2] = rData[idx];
        rData[idx + 3] = 255;
      }
    }

    normCtx.putImageData(normImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);

    const normalMap = new THREE.CanvasTexture(normCanvas);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(16, 16);
    normalMap.needsUpdate = true;

    const roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(16, 16);
    roughnessMap.needsUpdate = true;

    return { normalMap, roughnessMap };
  } catch (e) {
    return null;
  }
}

// Particle celebration component
function CelebrationParticles({ active }: { active: boolean }) {
  const count = 70;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 0.6 + Math.random() * 1.6;
      const scale = 0.03 + Math.random() * 0.05;
      const color = new THREE.Color().setHSL(Math.random() * 0.2 + 0.1, 1, 0.6);
      temp.push({
        position: new THREE.Vector3(0, 0.6, 0),
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed + 0.9,
          Math.cos(phi) * speed
        ),
        scale,
        color,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8
      });
    }
    return temp;
  }, []);

  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (!active && progressRef.current > 2) return;

    if (active) {
      progressRef.current = 0;
    } else {
      progressRef.current += delta;
    }

    particles.forEach((p, i) => {
      if (active) {
        p.position.set(
          (Math.random() - 0.5) * 0.3,
          0.5 + (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );
        const speed = 0.8 + Math.random() * 1.2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        p.velocity.set(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed + 1.0,
          Math.cos(phi) * speed
        );
        p.life = 0;
      }

      if (p.life < p.maxLife) {
        p.life += delta;
        p.position.addScaledVector(p.velocity, delta);
        p.velocity.y -= delta * 1.8;

        const opacity = Math.max(0, 1 - p.life / p.maxLife);
        const currentScale = p.scale * opacity;

        dummy.position.copy(p.position);
        dummy.scale.set(currentScale, currentScale, currentScale);
        dummy.rotation.x += delta * 4;
        dummy.rotation.y += delta * 4;
        dummy.updateMatrix();

        meshRef.current!.setMatrixAt(i, dummy.matrix);
        meshRef.current!.setColorAt(i, p.color);
      } else {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.2} metalness={0.9} emissive="#fbbf24" emissiveIntensity={0.8} />
    </instancedMesh>
  );
}

/**
 * Dynamic Facial Micro-Expressions Engine
 * Manages involuntary blinking, playful winking, joyful smile morphing, and eyebrow tilts
 * when user achieves gamification rewards, completes goals, or triggers poses.
 */
function FacialMicroExpressions({
  animationState,
  accentColor,
  isCelebrating,
  subsurfaceColor,
}: {
  animationState: PoseType;
  accentColor: string;
  isCelebrating: boolean;
  skinColor: string;
  subsurfaceColor: string;
}) {
  const avatarState = useAvatarGlobalState();
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const leftEyebrowRef = useRef<THREE.Mesh>(null);
  const rightEyebrowRef = useRef<THREE.Mesh>(null);
  const smileGroupRef = useRef<THREE.Group>(null);
  const smileMeshRef = useRef<THREE.Mesh>(null);

  const blinkProgressRef = useRef(0);
  const winkTimerRef = useRef(0);
  const isWinkingRef = useRef(false);
  const nextBlinkTimeRef = useRef(2.5);

  const currentSmileScaleYRef = useRef(0.20);
  const currentSmileScaleXRef = useRef(0.90);

  // Trigger wink if global state requests wink or celebrate
  useEffect(() => {
    if (avatarState.microExpressionType === 'wink' || avatarState.microExpressionType === 'celebrate') {
      isWinkingRef.current = true;
      winkTimerRef.current = 0;
    }
  }, [avatarState.microExpressionTimestamp, avatarState.microExpressionType]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. Playful Winks on Gamification Reward, Goal Completed & Celebration
    const isWinkRequested = avatarState.microExpressionType === 'wink' || avatarState.microExpressionType === 'celebrate';

    if (isCelebrating || animationState === 'celebrate' || animationState === 'flex' || isWinkRequested) {
      if (!isWinkingRef.current && Math.random() < 0.04) {
        isWinkingRef.current = true;
        winkTimerRef.current = 0;
      }
    }

    if (isWinkingRef.current) {
      winkTimerRef.current += delta;
      const winkProgress = Math.sin(Math.min(1, winkTimerRef.current / 0.38) * Math.PI);
      if (leftEyelidRef.current) {
        leftEyelidRef.current.scale.y = THREE.MathUtils.lerp(1.0, 0.05, winkProgress);
      }
      if (rightEyelidRef.current) {
        rightEyelidRef.current.scale.y = 1.0;
      }
      if (winkTimerRef.current > 0.48) {
        isWinkingRef.current = false;
      }
    } else {
      // Natural involuntary blinking & double blinks
      blinkProgressRef.current += delta;
      const isDoubleBlink = avatarState.microExpressionType === 'double_blink';
      const blinkInterval = isDoubleBlink ? 0.9 : nextBlinkTimeRef.current;

      if (blinkProgressRef.current > blinkInterval) {
        const blinkPhase = (blinkProgressRef.current - blinkInterval) / 0.18;
        if (blinkPhase <= 1.0) {
          const eyelidClosure = Math.sin(blinkPhase * Math.PI);
          const eyeScaleY = Math.max(0.08, 1.0 - eyelidClosure * 0.92);
          if (leftEyelidRef.current) leftEyelidRef.current.scale.y = eyeScaleY;
          if (rightEyelidRef.current) rightEyelidRef.current.scale.y = eyeScaleY;
        } else {
          blinkProgressRef.current = 0;
          nextBlinkTimeRef.current = 2.5 + Math.random() * 2.5;
          if (leftEyelidRef.current) leftEyelidRef.current.scale.y = 1.0;
          if (rightEyelidRef.current) rightEyelidRef.current.scale.y = 1.0;
        }
      }
    }

    // 2. Dynamic Smile Morphing
    const isJoyful = isCelebrating || 
      animationState === 'celebrate' || 
      animationState === 'flex' || 
      avatarState.positiveFeedback || 
      avatarState.motivationalSmile > 0 ||
      avatarState.microExpressionType === 'smile' ||
      avatarState.microExpressionType === 'celebrate';

    const targetSmileY = isJoyful ? 0.58 : 0.22 + Math.sin(t * 1.5) * 0.04;
    const targetSmileX = isJoyful ? 1.35 : 0.92;

    currentSmileScaleYRef.current = THREE.MathUtils.lerp(currentSmileScaleYRef.current, targetSmileY, 0.16);
    currentSmileScaleXRef.current = THREE.MathUtils.lerp(currentSmileScaleXRef.current, targetSmileX, 0.16);

    if (smileMeshRef.current) {
      smileMeshRef.current.scale.set(currentSmileScaleXRef.current, currentSmileScaleYRef.current, 1.0);
    }

    if (smileGroupRef.current) {
      smileGroupRef.current.position.y = THREE.MathUtils.lerp(
        smileGroupRef.current.position.y,
        isJoyful ? -0.040 : -0.050,
        0.14
      );
    }

    // 3. Eyebrow Expressive Tilts & Lift
    const isEyebrowRaised = isJoyful || avatarState.microExpressionType === 'eyebrow_raise' || avatarState.microExpressionType === 'joy_nod';
    const browRaise = isEyebrowRaised ? 0.016 : Math.sin(t * 0.8) * 0.003;
    const browTilt = isEyebrowRaised ? 0.24 : 0.03;

    if (leftEyebrowRef.current && rightEyebrowRef.current) {
      leftEyebrowRef.current.position.y = 0.042 + browRaise;
      rightEyebrowRef.current.position.y = 0.042 + browRaise;

      leftEyebrowRef.current.rotation.z = THREE.MathUtils.lerp(leftEyebrowRef.current.rotation.z, browTilt, 0.14);
      rightEyebrowRef.current.rotation.z = THREE.MathUtils.lerp(rightEyebrowRef.current.rotation.z, -browTilt, 0.14);
    }
  });

  const matEyeGlow = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        emissive: accentColor,
        emissiveIntensity: 0.85,
        roughness: 0.18,
      }),
    [accentColor]
  );

  const matIris = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.45,
        roughness: 0.25,
      }),
    [accentColor]
  );

  const matLips = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: subsurfaceColor,
        roughness: 0.35,
        clearcoat: 0.50,
        clearcoatRoughness: 0.18,
      }),
    [subsurfaceColor]
  );

  const matEyebrow = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.65,
      }),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* Left & Right Eyes with Eyelids */}
      <group position={[-0.062, 0.022, 0.128]}>
        <mesh ref={leftEyelidRef} position={[0, 0, 0]}>
          <sphereGeometry args={[0.024, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
          <primitive object={matEyeGlow} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.018]}>
          <circleGeometry args={[0.012, 16]} />
          <primitive object={matIris} attach="material" />
        </mesh>
      </group>

      <group position={[0.062, 0.022, 0.128]}>
        <mesh ref={rightEyelidRef} position={[0, 0, 0]}>
          <sphereGeometry args={[0.024, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
          <primitive object={matEyeGlow} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.018]}>
          <circleGeometry args={[0.012, 16]} />
          <primitive object={matIris} attach="material" />
        </mesh>
      </group>

      {/* Expressive Eyebrows */}
      <mesh ref={leftEyebrowRef} position={[-0.062, 0.042, 0.132]}>
        <boxGeometry args={[0.038, 0.007, 0.008]} />
        <primitive object={matEyebrow} attach="material" />
      </mesh>
      <mesh ref={rightEyebrowRef} position={[0.062, 0.042, 0.132]}>
        <boxGeometry args={[0.038, 0.007, 0.008]} />
        <primitive object={matEyebrow} attach="material" />
      </mesh>

      {/* Dynamic Smile Curve Group */}
      <group ref={smileGroupRef} position={[0, -0.05, 0.128]}>
        <mesh ref={smileMeshRef}>
          <torusGeometry args={[0.028, 0.006, 12, 24, Math.PI]} />
          <primitive object={matLips} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

/**
 * 3D Avatar Model (Supports Faceless Minimalist Matte Gray & Photorealistic PBR)
 */
function SculptedAvatarModel({
  animationState,
  accentColor = '#10b981',
  skinColor = '#8e98a3',
  skinSubsurfaceColor = '#64748b',
  definitionLevel = 'fit',
  sweatIntensity = 30,
  poreDetailLevel = 65,
  subsurfaceWarmth = 70,
  isPumpActive = false,
  isBioFibersActive = false,
  isVascularActive = false,
  isFacelessMinimalist = false,
  isCelebrating = false,
}: {
  animationState: PoseType;
  accentColor?: string;
  skinColor?: string;
  skinSubsurfaceColor?: string;
  definitionLevel?: MuscleDefinitionLevel;
  sweatIntensity?: number;
  poreDetailLevel?: number;
  subsurfaceWarmth?: number;
  isPumpActive?: boolean;
  isBioFibersActive?: boolean;
  isVascularActive?: boolean;
  isFacelessMinimalist?: boolean;
  isCelebrating?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const leftBicepMeshRef = useRef<THREE.Mesh>(null);
  const rightBicepMeshRef = useRef<THREE.Mesh>(null);
  const chestGroupRef = useRef<THREE.Group>(null);
  const absMeshRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const chestCoreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  // Global Body Morphing State
  const globalAvatarState = useAvatarGlobalState();
  const { bodyFatPercentage, somatotype, heightCm, shoulderWaistRatio } = globalAvatarState;

  // Real-Time Body Morphing Scales Computation
  const morphHeightScaleY = useMemo(() => Math.min(1.25, Math.max(0.75, heightCm / 175)), [heightCm]);
  const morphShoulderScaleX = useMemo(() => Math.min(1.50, Math.max(0.75, shoulderWaistRatio / 1.20)), [shoulderWaistRatio]);

  const morphBodyFatWaistScaleZ = useMemo(() => {
    if (bodyFatPercentage <= 12) return 0.92;
    if (bodyFatPercentage <= 18) return 1.0;
    return 1.0 + ((bodyFatPercentage - 18) / 100) * 0.90;
  }, [bodyFatPercentage]);

  const morphSomatotypeScale = useMemo(() => {
    if (somatotype === 'ectomorph') return { x: 0.90, z: 0.88 };
    if (somatotype === 'endomorph') return { x: 1.15, z: 1.12 };
    return { x: 1.0, z: 1.0 }; // mesomorph
  }, [somatotype]);

  // Procedural skin micro-pore & roughness textures
  const skinTextures = useMemo(() => createProceduralSkinTextures(), []);

  // Multipliers based on definition level
  const defScale = useMemo(() => {
    if (definitionLevel === 'hipertrofia') {
      return { muscle: 1.18, cutDepth: 1.30, pecThickness: 1.25, bicepPeak: 1.28 };
    }
    if (definitionLevel === 'natural') {
      return { muscle: 0.94, cutDepth: 0.82, pecThickness: 0.92, bicepPeak: 0.95 };
    }
    // Default 'fit'
    return { muscle: 1.06, cutDepth: 1.08, pecThickness: 1.06, bicepPeak: 1.10 };
  }, [definitionLevel]);

  // Clean Solid Matte Gray Material or Hyperrealistic PBR Physical Skin Material
  const matSkin = useMemo(() => {
    if (isFacelessMinimalist && skinColor === '#8e98a3') {
      return new THREE.MeshStandardMaterial({
        color: '#8b95a1',
        roughness: 0.85,
        metalness: 0.05,
      });
    }

    const moistureFactor = sweatIntensity / 100;
    // Human skin physiological roughness: 0.38 - 0.42 resting; smoothed by sweat/hydration
    const baseRoughness = isPumpActive ? 0.28 : 0.40;
    const finalRoughness = Math.max(0.16, baseRoughness - moistureFactor * 0.18);

    // Natural epidermal sebum / lipid film clearcoat layer (sweat increases glossiness)
    const clearcoatVal = isPumpActive ? 0.85 : (0.30 + moistureFactor * 0.55);
    const clearcoatRoughnessVal = Math.max(0.08, 0.22 - moistureFactor * 0.12);

    // Realistic microscopic pore displacement depth
    const normalScaleVal = (poreDetailLevel / 100) * (isPumpActive ? 0.32 : 0.22);

    const sssWarmthFactor = subsurfaceWarmth / 100;
    const emissiveVal = isBioFibersActive ? accentColor : (isVascularActive ? '#22c55e' : '#000000');
    const emissiveInt = isBioFibersActive ? 0.45 : (isVascularActive ? 0.20 : 0.0);

    return new THREE.MeshPhysicalMaterial({
      color: skinColor,
      roughness: finalRoughness,
      roughnessMap: skinTextures?.roughnessMap || undefined,
      metalness: 0.0,
      clearcoat: clearcoatVal,
      clearcoatRoughness: clearcoatRoughnessVal,
      clearcoatNormalMap: skinTextures?.normalMap || undefined,
      // Sheen simulates soft vellus hair & dermal micro-scattering at grazing angles
      sheen: 0.82 + sssWarmthFactor * 0.16,
      sheenColor: new THREE.Color(skinSubsurfaceColor),
      sheenRoughness: 0.32,
      normalMap: skinTextures?.normalMap || undefined,
      normalScale: new THREE.Vector2(normalScaleVal, normalScaleVal),
      specularIntensity: 0.96,
      // Epidermal subsurface light absorption & hemoglobin transmission
      thickness: 0.72,
      attenuationColor: new THREE.Color(skinSubsurfaceColor),
      attenuationDistance: 0.32 + (1 - sssWarmthFactor) * 0.18,
      emissive: emissiveVal,
      emissiveIntensity: emissiveInt,
    });
  }, [isFacelessMinimalist, skinColor, skinSubsurfaceColor, sweatIntensity, poreDetailLevel, subsurfaceWarmth, isPumpActive, isBioFibersActive, isVascularActive, accentColor, skinTextures]);

  // Secondary Accent & Dark Armor Materials
  const matAccent = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isFacelessMinimalist ? '#64748b' : accentColor,
        roughness: 0.75,
        metalness: 0.1,
        emissive: isFacelessMinimalist ? '#000000' : accentColor,
        emissiveIntensity: isFacelessMinimalist ? 0.0 : 0.65
      }),
    [accentColor, isFacelessMinimalist]
  );

  const matArmorDark = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: isFacelessMinimalist ? '#334155' : '#090d16',
      roughness: isFacelessMinimalist ? 0.80 : 0.45,
      metalness: isFacelessMinimalist ? 0.05 : 0.55
    }),
    [isFacelessMinimalist]
  );

  const matGlowVisor = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isFacelessMinimalist ? '#475569' : accentColor,
        roughness: isFacelessMinimalist ? 0.80 : 0.1,
        metalness: isFacelessMinimalist ? 0.05 : 0.9,
        emissive: isFacelessMinimalist ? '#000000' : accentColor,
        emissiveIntensity: isFacelessMinimalist ? 0.0 : 1.4
      }),
    [accentColor, isFacelessMinimalist]
  );

  const matVeinGlow = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        roughness: 0.2,
        metalness: 0.8,
        emissive: '#0284c7',
        emissiveIntensity: 1.2
      }),
    []
  );

  // High-Resolution Parametric Anatomical Geometries
  const lod = 0.95;
  const geoTorsoCore = useMemo(() => createSculptedTorsoCoreGeometry(false, lod), []);
  const geoHead = useMemo(() => createSculptedHeadGeometry(lod), []);
  const geoNeck = useMemo(() => createSculptedNeckGeometry(false, lod), []);
  const geoTrapezius = useMemo(() => createSculptedTrapeziusGeometry(false, lod), []);
  const geoClavicles = useMemo(() => createSculptedClaviclesGeometry(false, lod), []);
  const geoPecLeft = useMemo(() => createSculptedPectoralGeometry(true, false, lod), []);
  const geoPecRight = useMemo(() => createSculptedPectoralGeometry(false, false, lod), []);
  const geoAbs = useMemo(() => createSculptedAbdominalWallGeometry(false, lod), []);
  const geoSerratusLeft = useMemo(() => createSculptedSerratusObliquesGeometry(true, false, lod), []);
  const geoSerratusRight = useMemo(() => createSculptedSerratusObliquesGeometry(false, false, lod), []);

  const geoDeltLatLeft = useMemo(() => createSculptedDeltoidGeometry('lateral', true, false, lod), []);
  const geoDeltAntLeft = useMemo(() => createSculptedDeltoidGeometry('anterior', true, false, lod), []);
  const geoDeltPostLeft = useMemo(() => createSculptedDeltoidGeometry('posterior', true, false, lod), []);
  const geoDeltLatRight = useMemo(() => createSculptedDeltoidGeometry('lateral', false, false, lod), []);
  const geoDeltAntRight = useMemo(() => createSculptedDeltoidGeometry('anterior', false, false, lod), []);
  const geoDeltPostRight = useMemo(() => createSculptedDeltoidGeometry('posterior', false, false, lod), []);

  const geoBicepLeft = useMemo(() => createSculptedBicepGeometry(true, false, lod), []);
  const geoBicepRight = useMemo(() => createSculptedBicepGeometry(false, false, lod), []);
  const geoTricepLeft = useMemo(() => createSculptedTricepGeometry(true, false, lod), []);
  const geoTricepRight = useMemo(() => createSculptedTricepGeometry(false, false, lod), []);
  const geoForearmLeft = useMemo(() => createSculptedForearmGeometry(true, false, lod), []);
  const geoForearmRight = useMemo(() => createSculptedForearmGeometry(false, false, lod), []);
  const geoHandLeft = useMemo(() => createSculptedHandGeometry(true, lod), []);
  const geoHandRight = useMemo(() => createSculptedHandGeometry(false, lod), []);

  const geoQuadLeft = useMemo(() => createSculptedQuadricepsGeometry(true, false, lod), []);
  const geoQuadRight = useMemo(() => createSculptedQuadricepsGeometry(false, false, lod), []);
  const geoHamLeft = useMemo(() => createSculptedHamstringsGeometry(true, false, lod), []);
  const geoHamRight = useMemo(() => createSculptedHamstringsGeometry(false, false, lod), []);
  const geoPatella = useMemo(() => createSculptedPatellaGeometry(lod), []);
  const geoCalfLeft = useMemo(() => createSculptedCalfGeometry(true, false, lod), []);
  const geoCalfRight = useMemo(() => createSculptedCalfGeometry(false, false, lod), []);
  const geoFootLeft = useMemo(() => createSculptedFootGeometry(true, lod), []);
  const geoFootRight = useMemo(() => createSculptedFootGeometry(false, lod), []);
  const geoShorts = useMemo(() => createSculptedShortsGeometry(false, lod), []);

  // Kinematics and Micro-animations Loop
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    if (ringRef.current && !isFacelessMinimalist) {
      ringRef.current.rotation.z += delta * 0.8;
    }

    if (chestCoreRef.current && !isFacelessMinimalist) {
      const pulse = 1 + Math.sin(t * 4) * 0.18;
      chestCoreRef.current.scale.set(pulse, pulse, pulse);
    }

    const isFlexing = animationState === 'flex';
    const flexBicepSwell = isFlexing ? 1.25 * defScale.bicepPeak : defScale.bicepPeak;
    const flexPecSwell = isFlexing ? 1.15 * defScale.pecThickness : defScale.pecThickness;

    if (leftBicepMeshRef.current && rightBicepMeshRef.current) {
      leftBicepMeshRef.current.scale.x = THREE.MathUtils.lerp(leftBicepMeshRef.current.scale.x, flexBicepSwell, 0.15);
      leftBicepMeshRef.current.scale.z = THREE.MathUtils.lerp(leftBicepMeshRef.current.scale.z, flexBicepSwell, 0.15);
      rightBicepMeshRef.current.scale.x = THREE.MathUtils.lerp(rightBicepMeshRef.current.scale.x, flexBicepSwell, 0.15);
      rightBicepMeshRef.current.scale.z = THREE.MathUtils.lerp(rightBicepMeshRef.current.scale.z, flexBicepSwell, 0.15);
    }

    if (chestGroupRef.current) {
      chestGroupRef.current.scale.z = THREE.MathUtils.lerp(chestGroupRef.current.scale.z, flexPecSwell, 0.12);
    }

    if (animationState === 'flex') {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0.05, 0.15);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, Math.sin(t * 1.5) * 0.08, 0.1);

      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 1.48, 0.2);
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -1.48, 0.2);
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0.22, 0.2);
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0.22, 0.2);
      }
      if (leftForearmRef.current && rightForearmRef.current) {
        leftForearmRef.current.rotation.z = THREE.MathUtils.lerp(leftForearmRef.current.rotation.z, 1.62, 0.2);
        rightForearmRef.current.rotation.z = THREE.MathUtils.lerp(rightForearmRef.current.rotation.z, -1.62, 0.2);
      }
      if (headRef.current) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -0.1, 0.1);
      }
    } else if (animationState === 'spin') {
      groupRef.current.rotation.y += delta * 7;
      groupRef.current.position.y = Math.sin(t * 10) * 0.12;

      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.z = 1.1;
        rightArmRef.current.rotation.z = -1.1;
      }
      if (leftForearmRef.current && rightForearmRef.current) {
        leftForearmRef.current.rotation.z = 0.2;
        rightForearmRef.current.rotation.z = -0.2;
      }
    } else if (animationState === 'celebrate') {
      groupRef.current.rotation.y = Math.sin(t * 3) * 0.15;
      groupRef.current.position.y = Math.abs(Math.sin(t * 6)) * 0.14;

      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.z = 2.45 + Math.sin(t * 8) * 0.1;
        rightArmRef.current.rotation.z = -2.45 - Math.sin(t * 8) * 0.1;
        leftArmRef.current.rotation.x = Math.sin(t * 4) * 0.2;
        rightArmRef.current.rotation.x = Math.sin(t * 4) * 0.2;
      }
      if (leftForearmRef.current && rightForearmRef.current) {
        leftForearmRef.current.rotation.z = 0.3;
        rightForearmRef.current.rotation.z = -0.3;
      }
      if (headRef.current) {
        headRef.current.rotation.x = -0.25;
      }
    } else if (animationState === 'jump') {
      const jumpY = Math.abs(Math.sin(t * 8)) * 0.28;
      groupRef.current.position.y = jumpY;
      groupRef.current.rotation.y = Math.sin(t * 2) * 0.2;

      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.z = 1.5;
        rightArmRef.current.rotation.z = -1.5;
      }
      if (leftForearmRef.current && rightForearmRef.current) {
        leftForearmRef.current.rotation.z = 0.4;
        rightForearmRef.current.rotation.z = -0.4;
      }
    } else {
      // Idle natural posture
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, 0.1);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        Math.sin(t * 0.8) * 0.15,
        0.08
      );

      const breathe = Math.sin(t * 2) * 0.04;
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(
          leftArmRef.current.rotation.z,
          0.18 + breathe,
          0.1
        );
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
          rightArmRef.current.rotation.z,
          -0.18 - breathe,
          0.1
        );
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.1);
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
      }
      if (leftForearmRef.current && rightForearmRef.current) {
        leftForearmRef.current.rotation.z = THREE.MathUtils.lerp(
          leftForearmRef.current.rotation.z,
          0.1,
          0.1
        );
        rightForearmRef.current.rotation.z = THREE.MathUtils.lerp(
          rightForearmRef.current.rotation.z,
          -0.1,
          0.1
        );
      }
      if (headRef.current) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(
          headRef.current.rotation.x,
          Math.sin(t * 1.2) * 0.04,
          0.1
        );
        headRef.current.rotation.y = THREE.MathUtils.lerp(
          headRef.current.rotation.y,
          Math.sin(t * 0.6) * 0.08,
          0.1
        );
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={[0, -0.42, 0]}
      scale={[
        morphSomatotypeScale.x * morphShoulderScaleX,
        morphHeightScaleY,
        morphSomatotypeScale.z * morphBodyFatWaistScaleZ
      ]}
    >
      {/* Head Assembly (Faceless Minimalist or Cyber Head) */}
      <group ref={headRef} position={[0, 1.26, 0]}>
        {/* Sculpted Cranial Base & Jaw */}
        <mesh geometry={geoHead} material={matSkin} position={[0, 0, 0]} castShadow receiveShadow />

        {/* Facial Micro-Expressions Engine (Eye Blinks, Winks, Smile Morphing & Eyebrows) */}
        {!isFacelessMinimalist && (
          <FacialMicroExpressions
            animationState={animationState}
            accentColor={accentColor}
            isCelebrating={isCelebrating}
            skinColor={skinColor}
            subsurfaceColor={skinSubsurfaceColor}
          />
        )}

        {/* Sculpted Neck */}
        <mesh geometry={geoNeck} material={matSkin} position={[0, -0.15, 0]} castShadow />
      </group>

      {/* Torso & Muscle Architecture */}
      <group position={[0, 0.82, 0]}>
        {/* Muscular Thoracic Core Backbone */}
        <mesh geometry={geoTorsoCore} material={matArmorDark} position={[0, 0, 0]} castShadow receiveShadow />

        {/* Trapezius Collar */}
        <mesh geometry={geoTrapezius} material={matSkin} position={[0, 0.04, -0.045]} castShadow receiveShadow />

        {/* Clavicles */}
        <mesh geometry={geoClavicles} material={matSkin} position={[0, 0.20, 0.06]} castShadow />
        <mesh geometry={geoClavicles} material={matSkin} position={[0, 0.20, 0.06]} scale={[-1, 1, 1]} castShadow />

        {/* Contoured Pectoralis Major (Left & Right) */}
        <group ref={chestGroupRef} position={[0, 0.08, 0.04]}>
          <mesh
            geometry={geoPecLeft}
            material={matSkin}
            position={[-0.005, 0.02, 0.045]}
            scale={[defScale.muscle, defScale.muscle, defScale.pecThickness]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={geoPecRight}
            material={matSkin}
            position={[0.005, 0.02, 0.045]}
            scale={[defScale.muscle, defScale.muscle, defScale.pecThickness]}
            castShadow
            receiveShadow
          />
        </group>

        {/* Chest Core Reactor (Hidden in Faceless Mode) */}
        {!isFacelessMinimalist && (
          <mesh ref={chestCoreRef} material={matGlowVisor} position={[0, 0.09, 0.12]}>
            <cylinderGeometry args={[0.032, 0.032, 0.028, 16]} />
          </mesh>
        )}

        {/* Sculpted 6-Pack Rectus Abdominis */}
        <mesh
          ref={absMeshRef}
          geometry={geoAbs}
          material={matSkin}
          position={[0, -0.07, 0.065]}
          scale={[defScale.muscle, 1.0, defScale.cutDepth]}
          castShadow
          receiveShadow
        />

        {/* Sculpted Serratus Anterior & External Obliques */}
        <mesh
          geometry={geoSerratusLeft}
          material={matSkin}
          position={[-0.11, -0.05, 0.035]}
          scale={[defScale.muscle, 1.0, 1.0]}
          castShadow
        />
        <mesh
          geometry={geoSerratusRight}
          material={matSkin}
          position={[0.11, -0.05, 0.035]}
          scale={[defScale.muscle, 1.0, 1.0]}
          castShadow
        />
      </group>

      {/* Pelvis & Athletic Shorts */}
      <group position={[0, 0.48, 0]}>
        <mesh geometry={geoShorts} material={matArmorDark} position={[0, 0, 0]} castShadow receiveShadow />
        {!isFacelessMinimalist && (
          <mesh material={matGlowVisor} position={[0, 0.06, 0.14]}>
            <boxGeometry args={[0.06, 0.04, 0.03]} />
          </mesh>
        )}
      </group>

      {/* Left Arm Assembly */}
      <group ref={leftArmRef} position={[-0.24, 0.98, 0]}>
        <mesh geometry={geoDeltLatLeft} material={matSkin} position={[-0.015, 0, 0]} scale={[defScale.muscle, 1.0, defScale.muscle]} castShadow />
        <mesh geometry={geoDeltAntLeft} material={matSkin} position={[-0.005, -0.01, 0.025]} scale={[defScale.muscle, 1.0, defScale.muscle]} castShadow />
        <mesh geometry={geoDeltPostLeft} material={matSkin} position={[-0.005, -0.01, -0.025]} scale={[defScale.muscle, 1.0, defScale.muscle]} castShadow />

        <mesh
          ref={leftBicepMeshRef}
          geometry={geoBicepLeft}
          material={matSkin}
          position={[-0.01, -0.14, 0.018]}
          scale={[defScale.bicepPeak, 1.0, defScale.bicepPeak]}
          castShadow
          receiveShadow
        />

        {isVascularActive && !isFacelessMinimalist && (
          <mesh material={matVeinGlow} position={[-0.01, -0.14, 0.042]} rotation={[0, 0, 0.15]}>
            <cylinderGeometry args={[0.004, 0.004, 0.18, 8]} />
          </mesh>
        )}

        <mesh
          geometry={geoTricepLeft}
          material={matSkin}
          position={[-0.01, -0.14, -0.02]}
          scale={[defScale.muscle, 1.0, defScale.muscle]}
          castShadow
          receiveShadow
        />

        <mesh material={matArmorDark} position={[-0.01, -0.27, 0]}>
          <sphereGeometry args={[0.038, 16, 16]} />
        </mesh>

        <group ref={leftForearmRef} position={[-0.01, -0.27, 0]}>
          <mesh geometry={geoForearmLeft} material={matSkin} position={[0, -0.14, 0]} castShadow receiveShadow />
          <mesh geometry={geoHandLeft} material={matArmorDark} position={[0, -0.28, 0]} castShadow />
        </group>
      </group>

      {/* Right Arm Assembly */}
      <group ref={rightArmRef} position={[0.24, 0.98, 0]}>
        <mesh geometry={geoDeltLatRight} material={matSkin} position={[0.015, 0, 0]} scale={[defScale.muscle, 1.0, defScale.muscle]} castShadow />
        <mesh geometry={geoDeltAntRight} material={matSkin} position={[0.005, -0.01, 0.025]} scale={[defScale.muscle, 1.0, defScale.muscle]} castShadow />
        <mesh geometry={geoDeltPostRight} material={matSkin} position={[0.005, -0.01, -0.025]} scale={[defScale.muscle, 1.0, defScale.muscle]} castShadow />

        <mesh
          ref={rightBicepMeshRef}
          geometry={geoBicepRight}
          material={matSkin}
          position={[0.01, -0.14, 0.018]}
          scale={[defScale.bicepPeak, 1.0, defScale.bicepPeak]}
          castShadow
          receiveShadow
        />

        {isVascularActive && !isFacelessMinimalist && (
          <mesh material={matVeinGlow} position={[0.01, -0.14, 0.042]} rotation={[0, 0, -0.15]}>
            <cylinderGeometry args={[0.004, 0.004, 0.18, 8]} />
          </mesh>
        )}

        <mesh
          geometry={geoTricepRight}
          material={matSkin}
          position={[0.01, -0.14, -0.02]}
          scale={[defScale.muscle, 1.0, defScale.muscle]}
          castShadow
          receiveShadow
        />

        <mesh material={matArmorDark} position={[0.01, -0.27, 0]}>
          <sphereGeometry args={[0.038, 16, 16]} />
        </mesh>

        <group ref={rightForearmRef} position={[0.01, -0.27, 0]}>
          <mesh geometry={geoForearmRight} material={matSkin} position={[0, -0.14, 0]} castShadow receiveShadow />
          <mesh geometry={geoHandRight} material={matArmorDark} position={[0, -0.28, 0]} castShadow />
        </group>
      </group>

      {/* Left Leg Assembly */}
      <group position={[-0.11, 0.38, 0]}>
        <mesh geometry={geoQuadLeft} material={matSkin} position={[0, -0.14, 0]} scale={[defScale.muscle, 1.0, defScale.muscle]} castShadow receiveShadow />
        <mesh geometry={geoHamLeft} material={matSkin} position={[0, -0.14, 0]} castShadow />
        <mesh geometry={geoPatella} material={matArmorDark} position={[0, -0.32, 0.05]} castShadow />

        <mesh geometry={geoCalfLeft} material={matSkin} position={[0, -0.48, 0]} scale={[defScale.muscle, 1.0, defScale.muscle]} castShadow receiveShadow />
        <mesh geometry={geoFootLeft} material={matArmorDark} position={[0, -0.66, 0.04]} castShadow />
      </group>

      {/* Right Leg Assembly */}
      <group position={[0.11, 0.38, 0]}>
        <mesh geometry={geoQuadRight} material={matSkin} position={[0, -0.14, 0]} scale={[defScale.muscle, 1.0, defScale.muscle]} castShadow receiveShadow />
        <mesh geometry={geoHamRight} material={matSkin} position={[0, -0.14, 0]} castShadow />
        <mesh geometry={geoPatella} material={matArmorDark} position={[0, -0.32, 0.05]} castShadow />

        <mesh geometry={geoCalfRight} material={matSkin} position={[0, -0.48, 0]} scale={[defScale.muscle, 1.0, defScale.muscle]} castShadow receiveShadow />
        <mesh geometry={geoFootRight} material={matArmorDark} position={[0, -0.66, 0.04]} castShadow />
      </group>

      {/* Pedestal Base */}
      <group position={[0, -0.28, 0]}>
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.48, 0.54, 48]} />
          <meshBasicMaterial color={isFacelessMinimalist ? '#64748b' : accentColor} transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.45, 36]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      </group>
    </group>
  );
}

// Studio Lighting Rig
function SceneLighting({
  preset,
  accentColor,
  isFacelessMinimalist
}: {
  preset: LightingPreset;
  accentColor: string;
  isFacelessMinimalist?: boolean;
}) {
  if (isFacelessMinimalist) {
    return (
      <>
        <ambientLight intensity={0.85} color="#f8fafc" />
        <directionalLight position={[4, 6, 4]} intensity={1.8} color="#ffffff" castShadow />
        <directionalLight position={[-4, 3, -3]} intensity={1.0} color="#cbd5e1" />
        <directionalLight position={[0, -3, 3]} intensity={0.4} color="#94a3b8" />
      </>
    );
  }

  if (preset === 'cyber') {
    return (
      <>
        <ambientLight intensity={0.5} color="#0f172a" />
        <directionalLight position={[3, 5, 2]} intensity={1.6} color="#06b6d4" />
        <directionalLight position={[-3, 2, -2]} intensity={1.9} color="#ec4899" />
        <pointLight position={[0, 1.2, 1.5]} intensity={1.5} color={accentColor} />
      </>
    );
  }

  if (preset === 'solar') {
    return (
      <>
        <ambientLight intensity={0.6} color="#451a03" />
        <directionalLight position={[4, 5, 3]} intensity={2.2} color="#fbbf24" />
        <directionalLight position={[-3, -1, -2]} intensity={0.9} color="#f97316" />
        <pointLight position={[0, 1.5, 1.2]} intensity={1.3} color="#fde047" />
      </>
    );
  }

  if (preset === 'emerald') {
    return (
      <>
        <ambientLight intensity={0.6} color="#064e3b" />
        <directionalLight position={[3, 5, 2]} intensity={1.7} color="#34d399" />
        <directionalLight position={[-3, 2, -2]} intensity={1.1} color="#10b981" />
        <pointLight position={[0, 1.5, 1.2]} intensity={1.7} color="#059669" />
      </>
    );
  }

  return (
    <>
      <hemisphereLight intensity={0.8} color="#ffffff" groundColor="#334155" />
      <directionalLight position={[3, 5, 3]} intensity={1.6} color="#fffbeb" castShadow />
      <directionalLight position={[-3, 3, -2]} intensity={0.9} color="#38bdf8" />
      <directionalLight position={[0, -2, -3]} intensity={0.5} color="#e2e8f0" />
      <pointLight position={[0, 1.2, 1.4]} intensity={1.1} color={accentColor} />
    </>
  );
}

export function Profile3DAvatar({
  points = 1250,
  streak = 7,
  level = 4,
  avatarId = 'cyberfit-biomechanic',
  userSkinTone,
  onAwardPoints,
  onOpenGallery
}: Profile3DAvatarProps) {
  const [animState, setAnimState] = useState<PoseType>('idle');
  const [lighting, setLighting] = useState<LightingPreset>('studio');
  const [isParticleActive, setIsParticleActive] = useState(false);
  const [localPoints, setLocalPoints] = useState(points);
  const [showToast, setShowToast] = useState<string | null>(null);

  const avatarInfo = useMemo(() => getAvatarById(avatarId), [avatarId]);
  const accentColor = avatarInfo.modelConfig.accentColor || '#10b981';

  // Initialize with realistic physiological skin by default
  const [isFacelessMinimalist, setIsFacelessMinimalist] = useState(false);

  // Match initial skin tone from user profile or avatar catalog
  const initialSkinToneIndex = useMemo(() => {
    const raw = (userSkinTone || avatarInfo.modelConfig.skinColor || avatarInfo.modelConfig.skinTone || '').toLowerCase();
    if (raw) {
      const matchIdx = SKIN_TONE_PALETTE.findIndex(
        (t) => t.hex.toLowerCase() === raw || t.name.toLowerCase().includes(raw) || t.id.toLowerCase() === raw
      );
      if (matchIdx !== -1) return matchIdx;
      if (raw.includes('clara') || raw.includes('fair') || raw.includes('light')) return 1; // Bege Pêssego
      if (raw.includes('media') || raw.includes('dourado') || raw.includes('gold')) return 3; // Dourado Mediterrâneo
      if (raw.includes('parda') || raw.includes('bronze') || raw.includes('moren')) return 0; // Bronzeado Atlético
      if (raw.includes('escura') || raw.includes('negra') || raw.includes('dark')) return 6; // Café Sublime
    }
    return 0; // Bronzeado Atlético by default
  }, [userSkinTone, avatarInfo]);

  const [skinToneIndex, setSkinToneIndex] = useState(initialSkinToneIndex);
  const [sweatIntensity, setSweatIntensity] = useState(25);
  const [poreDetailLevel, setPoreDetailLevel] = useState(60);
  const [subsurfaceWarmth, setSubsurfaceWarmth] = useState(65);
  const [muscleDef, setMuscleDef] = useState<MuscleDefinitionLevel>('fit');
  const [isPumpActive, setIsPumpActive] = useState(false);
  const [isBioFibersActive, setIsBioFibersActive] = useState(false);
  const [isVascularActive, setIsVascularActive] = useState(false);
  const [showSkinFineTuning, setShowSkinFineTuning] = useState(false);

  const activeSkin = SKIN_TONE_PALETTE[skinToneIndex] || SKIN_TONE_PALETTE[0];

  const xpCurrentLevelBase = (level - 1) * 500;
  const xpNextLevelTarget = level * 500;
  const xpInCurrentLevel = Math.max(0, localPoints - xpCurrentLevelBase);
  const xpNeeded = xpNextLevelTarget - xpCurrentLevelBase;
  const levelProgressPct = Math.min(100, Math.round((xpInCurrentLevel / xpNeeded) * 100));

  useEffect(() => {
    if (points > localPoints) {
      triggerCelebration(`+${points - localPoints} Pontos!`);
      setLocalPoints(points);
    }
  }, [points]);

  const triggerCelebration = (msg: string) => {
    playSfx('crystal');
    vibrate([40, 60, 100]);
    setShowToast(msg);
    setIsParticleActive(true);
    setAnimState('celebrate');

    setTimeout(() => setIsParticleActive(false), 2000);
    setTimeout(() => {
      setAnimState('idle');
      setShowToast(null);
    }, 3000);
  };

  const handleManualAwardPoints = () => {
    const earned = 50;
    setLocalPoints((prev) => prev + earned);
    if (onAwardPoints) onAwardPoints(earned);
    triggerCelebration('+50 Pontos Conquistados!');
  };

  const handleFlex = () => {
    playSfx('crystal');
    vibrate([50, 80]);
    setAnimState('flex');
    setShowToast('💪 Pose Duplo Bíceps: Contração Muscular!');
    setTimeout(() => {
      setAnimState('idle');
      setShowToast(null);
    }, 2800);
  };

  const handleSpin = () => {
    playSfx('pop');
    vibrate(20);
    setAnimState('spin');
    setTimeout(() => setAnimState('idle'), 1800);
  };

  const handleJump = () => {
    playSfx('tap');
    vibrate(30);
    setAnimState('jump');
    setTimeout(() => setAnimState('idle'), 2000);
  };

  const handleToggleMinimalistMode = () => {
    const next = !isFacelessMinimalist;
    setIsFacelessMinimalist(next);
    if (next) {
      const grayIdx = SKIN_TONE_PALETTE.findIndex((t) => t.id === 'matteGray');
      setSkinToneIndex(grayIdx >= 0 ? grayIdx : 8);
      playSfx('crystal');
      vibrate([25, 40]);
      setShowToast('🩶 Modo Cinza Minimalista sem Rosto Ativado.');
    } else {
      setSkinToneIndex(0); // Bronzeado Atlético
      playSfx('pop');
      vibrate(20);
      setShowToast('✨ Pele Realista PBR Ativada (Hiper-Realismo Dérmico).');
    }
    setTimeout(() => setShowToast(null), 2500);
  };

  return (
    <div className="w-full clay-card p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 text-white rounded-3xl border border-emerald-500/20 shadow-2xl relative overflow-hidden flex flex-col items-center">
      {/* Background Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="w-full flex items-center justify-between mb-3 z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-white flex items-center gap-2">
              {isFacelessMinimalist ? 'Avatar 3D Cinza Minimalista (Sem Rosto)' : 'Avatar 3D Anatomia & Pele'}
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Level {level}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {isFacelessMinimalist ? 'Textura fosca cinza • Músculos sólidos e limpos • Renderização ultra-rápida' : 'Anatomia PBR • Dispersão Fisiológica SSS & Poros'}
            </p>
          </div>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/80 shadow-inner">
          <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-xs font-bold text-amber-300">{streak} dias</span>
          <div className="w-px h-3 bg-slate-700 mx-1" />
          <Star className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          <span className="text-xs font-bold text-emerald-300">{localPoints} pts</span>
        </div>
      </div>

      {/* Mode Preset Toggle Banner */}
      <div className="w-full flex items-center justify-between gap-2 p-2 bg-slate-950/80 rounded-2xl border border-slate-800 mb-3 z-10 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsFacelessMinimalist(true);
              setSkinToneIndex(0);
              playSfx('tap');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isFacelessMinimalist
                ? 'bg-slate-700 text-white shadow-md border border-slate-500'
                : 'bg-slate-900/60 text-slate-400 hover:text-white'
            }`}
          >
            <Circle className="w-3.5 h-3.5 fill-slate-400 text-slate-400" />
            <span>🩶 Cinza Minimalista (Sem Rosto)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFacelessMinimalist(false);
              setSkinToneIndex(4);
              playSfx('tap');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              !isFacelessMinimalist
                ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-slate-900/60 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✨ Estúdio PBR Fotorrealista</span>
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-mono hidden lg:inline-block">
          {isFacelessMinimalist ? 'Visual limpo • Músculos bem definidos' : 'Biomodelagem com microporos'}
        </span>
      </div>

      {/* XP Level Progress Bar */}
      <div className="w-full bg-slate-950/60 rounded-xl p-2.5 mb-3 border border-slate-800 z-10">
        <div className="flex justify-between items-center text-[11px] mb-1.5">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Progresso para Level {level + 1}
          </span>
          <span className="font-mono text-emerald-400 font-bold">
            {xpInCurrentLevel} / {xpNeeded} XP ({levelProgressPct}%)
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/50"
            style={{ width: `${levelProgressPct}%` }}
          />
        </div>
      </div>

      {/* Skin & Muscle Customization Controls Bar */}
      <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 mb-3 z-10 flex flex-col gap-2.5">
        {/* Row 1: Skin Tone Picker & Muscle Definition Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Skin Tones Palette */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              Acabamento:
            </span>
            <div className="flex items-center gap-1.5">
              {SKIN_TONE_PALETTE.map((tone, idx) => {
                const isSelected = skinToneIndex === idx;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => {
                      setSkinToneIndex(idx);
                      if (tone.id === 'matteGray') {
                        setIsFacelessMinimalist(true);
                      } else {
                        setIsFacelessMinimalist(false);
                      }
                      playSfx('tap');
                      vibrate(15);
                      setShowToast(`Estilo: ${tone.name}`);
                      setTimeout(() => setShowToast(null), 2000);
                    }}
                    title={`${tone.name} - ${tone.desc}`}
                    className={`w-6 h-6 rounded-full cursor-pointer transition-all border-2 relative flex items-center justify-center ${
                      isSelected
                        ? 'border-emerald-400 scale-110 shadow-md shadow-emerald-500/50 ring-2 ring-emerald-400/40'
                        : 'border-slate-700 hover:border-slate-400 hover:scale-105 opacity-80'
                    }`}
                    style={{ backgroundColor: tone.hex }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-slate-300 font-bold hidden md:inline-block">
              {activeSkin.name}
            </span>
          </div>

          {/* Muscle Definition Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
              Músculos:
            </span>
            <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMuscleDef('natural');
                  playSfx('tap');
                  vibrate(15);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  muscleDef === 'natural'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🌿 Natural
              </button>
              <button
                type="button"
                onClick={() => {
                  setMuscleDef('fit');
                  playSfx('tap');
                  vibrate(15);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  muscleDef === 'fit'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Fit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMuscleDef('hipertrofia');
                  playSfx('crystal');
                  vibrate([20, 30]);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  muscleDef === 'hipertrofia'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                💥 Hipertrofia
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Lighting Presets & Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          {/* Lighting Presets */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
              <Sun className="w-3 h-3 text-amber-400" /> Luz:
            </span>
            <button
              type="button"
              onClick={() => {
                setLighting('studio');
                playSfx('tap');
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                lighting === 'studio'
                  ? 'bg-slate-200 text-slate-950 shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              🌟 Limpa Estúdio
            </button>
            <button
              type="button"
              onClick={() => {
                setLighting('emerald');
                playSfx('tap');
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                lighting === 'emerald'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              🌿 Bio
            </button>
            <button
              type="button"
              onClick={() => {
                setLighting('cyber');
                playSfx('tap');
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                lighting === 'cyber'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              ⚡ Cyber
            </button>
            <button
              type="button"
              onClick={() => {
                setLighting('solar');
                playSfx('tap');
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                lighting === 'solar'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              🌅 Solar
            </button>
          </div>

          {/* Special Toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleToggleMinimalistMode}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isFacelessMinimalist
                  ? 'bg-slate-700 text-white border-slate-500 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <UserCheck className="w-3 h-3 text-slate-300" />
              <span>Sem Rosto (Fosco)</span>
            </button>

            {!isFacelessMinimalist && (
              <button
                type="button"
                onClick={() => {
                  setShowSkinFineTuning(!showSkinFineTuning);
                  playSfx('tap');
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showSkinFineTuning
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-emerald-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Ajuste Pele PBR</span>
              </button>
            )}
          </div>
        </div>

        {/* Expanded Skin Fine Tuning Controls Panel */}
        {showSkinFineTuning && !isFacelessMinimalist && (
          <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-emerald-500/30 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Parâmetros de Textura e Fisiologia Dérmica
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Shader PBR SSS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-300">
                  <span>💧 Brilho & Suor (Clearcoat)</span>
                  <span className="font-mono text-emerald-400">{sweatIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sweatIntensity}
                  onChange={(e) => setSweatIntensity(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-300">
                  <span>🔬 Poros & Textura Dérmica</span>
                  <span className="font-mono text-emerald-400">{poreDetailLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={poreDetailLevel}
                  onChange={(e) => setPoreDetailLevel(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-300">
                  <span>🩸 Dispersão SSS / Hemoglobina</span>
                  <span className="font-mono text-emerald-400">{subsurfaceWarmth}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={subsurfaceWarmth}
                  onChange={(e) => setSubsurfaceWarmth(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Overlay Notification */}
      {showToast && (
        <div className="absolute top-36 z-30 animate-in fade-in zoom-in slide-in-from-top-4 duration-300 bg-slate-800 text-white border border-slate-600 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 pointer-events-none">
          <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span>{showToast}</span>
        </div>
      )}

      {/* 3D Canvas Container */}
      <div className="w-full h-[330px] sm:h-[380px] relative rounded-2xl overflow-hidden bg-slate-950/80 border border-slate-800 shadow-inner cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [0, 0.45, 2.7], fov: 44 }}>
          <SceneLighting preset={lighting} accentColor={accentColor} isFacelessMinimalist={isFacelessMinimalist} />

          <Float speed={1.8} rotationIntensity={0.18} floatIntensity={0.22}>
            <SculptedAvatarModel
              animationState={animState}
              accentColor={accentColor}
              skinColor={activeSkin.hex}
              skinSubsurfaceColor={activeSkin.subHex}
              definitionLevel={muscleDef}
              sweatIntensity={sweatIntensity}
              poreDetailLevel={poreDetailLevel}
              subsurfaceWarmth={subsurfaceWarmth}
              isPumpActive={isPumpActive}
              isBioFibersActive={isBioFibersActive}
              isVascularActive={isVascularActive}
              isFacelessMinimalist={isFacelessMinimalist}
              isCelebrating={isParticleActive}
            />
          </Float>

          <CelebrationParticles active={isParticleActive} />

          <ContactShadows position={[0, -0.68, 0]} opacity={0.65} scale={2.4} blur={1.5} far={1.2} />
          <OrbitControls
            enableZoom={false}
            maxPolarAngle={Math.PI / 1.7}
            minPolarAngle={Math.PI / 3}
          />
        </Canvas>

        {/* Floating Hint */}
        <div className="absolute bottom-2 left-2 right-2 text-center pointer-events-none">
          <span className="text-[10px] bg-slate-900/90 text-slate-300 px-3 py-1 rounded-full border border-slate-800 backdrop-blur-xs shadow-xs font-medium">
            ✨ Giro 360° • PBR SSS Fisiológico & Micro-Expressões Dinâmicas (Sorrisos & Piscadelas)
          </span>
        </div>
      </div>

      {/* Interactive Micro-Animation Buttons */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 z-10">
        <button
          type="button"
          onClick={handleFlex}
          className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Dumbbell className="w-4 h-4" />
          <span>Flexionar 💪</span>
        </button>

        <button
          type="button"
          onClick={handleSpin}
          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
          <span>Girar 360°</span>
        </button>

        <button
          type="button"
          onClick={handleJump}
          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Salto Turbo</span>
        </button>

        <button
          type="button"
          onClick={handleManualAwardPoints}
          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          title="Ganhar XP e ver reações de micro-expressões (sorriso & piscadela)"
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>+50 XP 😉</span>
        </button>
      </div>

      {/* Gallery Access Button if callback provided */}
      {onOpenGallery && (
        <button
          type="button"
          onClick={() => {
            playSfx('crystal');
            vibrate(25);
            onOpenGallery();
          }}
          className="w-full mt-2.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Abrir Galeria & Estúdio 3D Completo</span>
        </button>
      )}
    </div>
  );
}
