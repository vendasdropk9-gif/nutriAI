import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Info,
  CheckCircle2,
  Dumbbell,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Flame,
  Zap,
  Target,
  Eye,
  Sliders,
  Award
} from 'lucide-react';
import { speak, stopSpeech } from '../lib/speech';
import { playSfx, vibrate } from '../lib/sensory';
import { useTranslation } from '../contexts/LanguageContext';

export interface DumbbellArmExercise {
  id: string;
  name: string;
  nameEn: string;
  targetMuscle: 'biceps' | 'triceps' | 'brachialis' | 'forearms';
  targetMuscleLabel: string;
  targetMuscleHead: string;
  secondaryMuscles: string[];
  position: 'standing' | 'incline' | 'bent_over' | 'seated' | 'lying' | 'preacher';
  grip: 'supinated' | 'neutral' | 'pronated';
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  description: string;
  techniqueTip: string;
  tempo: string; // e.g. "2-1-2"
  repTarget: string;
  audioCue: string;
}

export const DUMBBELL_ARM_WORKOUTS: DumbbellArmExercise[] = [
  {
    id: 'standing-bicep-curl',
    name: 'Rosca Direta com Halteres',
    nameEn: 'Standing Dumbbell Bicep Curl',
    targetMuscle: 'biceps',
    targetMuscleLabel: 'Bíceps Braquial',
    targetMuscleHead: 'Cabeça Curta & Longa',
    secondaryMuscles: ['Braquiorradial', 'Deltóide Anterior'],
    position: 'standing',
    grip: 'supinated',
    difficulty: 'Iniciante',
    description: 'Exercício clássico de ativação máxima do bíceps. Mantenha os cotovelos fixos ao lado das costelas e realize a supinação completa na subida.',
    techniqueTip: 'Evite balançar o tronco. Contraia o bíceps no topo por 1 segundo antes de iniciar a descida controlada.',
    tempo: '2-1-2',
    repTarget: '3 x 10-12 reps',
    audioCue: 'Na rosca direta com halteres, mantenha os cotovelos fixos junto ao tronco. Concentre toda a tensão no pico de contração do bíceps braquial.'
  },
  {
    id: 'standing-hammer-curl',
    name: 'Rosca Martelo com Halteres',
    nameEn: 'Standing Dumbbell Hammer Curl',
    targetMuscle: 'brachialis',
    targetMuscleLabel: 'Braquial & Braquiorradial',
    targetMuscleHead: 'Espessura do Braço',
    secondaryMuscles: ['Bíceps Braquial', 'Antebraço'],
    position: 'standing',
    grip: 'neutral',
    difficulty: 'Iniciante',
    description: 'Pegada neutra que foca no músculo braquial profundo e braquiorradial, expandindo a espessura lateral do braço.',
    techniqueTip: 'Mantenha as palmas apontadas uma para a outra durante toda a amplitude. Não use o impulso dos quadris.',
    tempo: '3-1-2',
    repTarget: '4 x 10 reps',
    audioCue: 'A rosca martelo trabalha o braquial e o antebraço com pegada neutra. Isso empurra o bíceps para cima, aumentando o volume do braço.'
  },
  {
    id: 'incline-bench-curl',
    name: 'Rosca Inclinada no Banco 45°',
    nameEn: 'Incline Bench Dumbbell Curl',
    targetMuscle: 'biceps',
    targetMuscleLabel: 'Bíceps Braquial',
    targetMuscleHead: 'Cabeça Longa (Alongamento)',
    secondaryMuscles: ['Braquial'],
    position: 'incline',
    grip: 'supinated',
    difficulty: 'Intermediário',
    description: 'Banco inclinado a 45° coloca a cabeça longa do bíceps sob alongamento passivo extremo, gerando alto estímulo hipertrófico.',
    techniqueTip: 'Deixe os braços caírem perpendicularmente ao chão. Inicie a flexão sem mover os cotovelos para frente.',
    tempo: '3-1-2',
    repTarget: '3 x 10 reps',
    audioCue: 'No banco inclinado, os ombros ficam em hiperextensão, alongando a cabeça longa do bíceps para construir o pico muscular.'
  },
  {
    id: 'seated-concentration-curl',
    name: 'Rosca Concentrada Sentada',
    nameEn: 'Seated Concentration Curl',
    targetMuscle: 'biceps',
    targetMuscleLabel: 'Pico do Bíceps',
    targetMuscleHead: 'Cabeça Curta Isolada',
    secondaryMuscles: ['Braquial'],
    position: 'seated',
    grip: 'supinated',
    difficulty: 'Intermediário',
    description: 'Cotovelo apoiado na face interna da coxa elimina completamente a ação do deltóide e trapézio, isolando o bíceps.',
    techniqueTip: 'Gire o punho levemente para fora (supinação máxima) no topo para recrutar 100% das fibras do bíceps.',
    tempo: '2-2-2',
    repTarget: '3 x 12 reps cada braço',
    audioCue: 'A rosca concentrada isola totalmente o bíceps. Apoie o cotovelo na coxa interna e sinta a contração máxima no topo.'
  },
  {
    id: 'preacher-scott-curl',
    name: 'Rosca Scott com Halteres',
    nameEn: 'Dumbbell Preacher Curl',
    targetMuscle: 'biceps',
    targetMuscleLabel: 'Bíceps Braquial Inferior',
    targetMuscleHead: 'Inserção & Cabeça Curta',
    secondaryMuscles: ['Braquiorradial'],
    position: 'preacher',
    grip: 'supinated',
    difficulty: 'Intermediário',
    description: 'Braços apoiados na almofada inclinada de Scott garantem tensão contínua na porção distal do bíceps.',
    techniqueTip: 'Não estenda totalmente o cotovelo no ponto inferior para proteger os tendões e manter a tensão muscular.',
    tempo: '3-1-2',
    repTarget: '3 x 10-12 reps',
    audioCue: 'Na rosca Scott, mantenha a parte posterior dos braços firmemente apoiada na almofada. Não deixe os cotovelos descolarem.'
  },
  {
    id: 'bent-over-row-curl',
    name: 'Rosca Curvada com Halteres',
    nameEn: 'Bent-Over Dumbbell Curl',
    targetMuscle: 'biceps',
    targetMuscleLabel: 'Bíceps & Antebraços',
    targetMuscleHead: 'Pico de Contração com Gravidade',
    secondaryMuscles: ['Braquial', 'Dorsal'],
    position: 'bent_over',
    grip: 'supinated',
    difficulty: 'Avançado',
    description: 'Tronco inclinado a 45° altera o vetor gravitacional, exigindo pico de torque máximo no topo da contração.',
    techniqueTip: 'Mantenha a coluna lombar neutra e o abdômen contraído durante todo o movimento.',
    tempo: '2-1-2',
    repTarget: '3 x 12 reps',
    audioCue: 'Na rosca curvada, a gravidade atua diretamente contra o pico do bíceps no topo do movimento. Mantenha o core firme.'
  },
  {
    id: 'standing-overhead-tricep-ext',
    name: 'Tríceps Francês em Pé com Haltere',
    nameEn: 'Standing Overhead Triceps Extension',
    targetMuscle: 'triceps',
    targetMuscleLabel: 'Tríceps Braquial',
    targetMuscleHead: 'Cabeça Longa',
    secondaryMuscles: ['Deltóide Posterior', 'Core'],
    position: 'standing',
    grip: 'neutral',
    difficulty: 'Iniciante',
    description: 'Braços elevados acima da cabeça colocam a cabeça longa do tríceps em alongamento completo, fundamental para massa muscular.',
    techniqueTip: 'Mantenha os cotovelos apontados para o teto e próximos às orelhas, sem abrir excessivamente para os lados.',
    tempo: '3-1-2',
    repTarget: '3 x 12 reps',
    audioCue: 'No tríceps francês em pé, eleve o haltere atrás da nuca mantendo os cotovelos fechados para ativar a cabeça longa do tríceps.'
  },
  {
    id: 'seated-overhead-tricep-ext',
    name: 'Tríceps Francês Sentado',
    nameEn: 'Seated Overhead Dumbbell Extension',
    targetMuscle: 'triceps',
    targetMuscleLabel: 'Tríceps Braquial',
    targetMuscleHead: 'Cabeça Longa & Medial',
    secondaryMuscles: ['Trapézio'],
    position: 'seated',
    grip: 'neutral',
    difficulty: 'Iniciante',
    description: 'Posição sentada com encosto estabiliza a coluna, permitindo maior sobrecarga com segurança no tríceps.',
    techniqueTip: 'Segure a parte interna do haltere com ambas as mãos em forma de cálice/diamante.',
    tempo: '3-1-2',
    repTarget: '4 x 10 reps',
    audioCue: 'Sentado com encosto, você elimina o balanço do corpo e concentra 100% da carga na cabeça longa do tríceps.'
  },
  {
    id: 'dumbbell-skull-crusher',
    name: 'Tríceps Testa com Halteres',
    nameEn: 'Lying Dumbbell Skull Crusher',
    targetMuscle: 'triceps',
    targetMuscleLabel: 'Tríceps Braquial',
    targetMuscleHead: 'Cabeça Medial & Lateral',
    secondaryMuscles: ['Cabeça Longa'],
    position: 'lying',
    grip: 'neutral',
    difficulty: 'Intermediário',
    description: 'Deitado no banco reto, flexione os cotovelos levando os halteres ao lado da testa e estenda vigorosamente.',
    techniqueTip: 'Incline os braços cerca de 10° para trás para não perder a tensão no tríceps no topo da repetição.',
    tempo: '3-1-2',
    repTarget: '4 x 10-12 reps',
    audioCue: 'No tríceps testa com halteres, deite no banco e flexione os antebraços até a linha das têmporas. Estenda travando o tríceps.'
  },
  {
    id: 'dumbbell-kickback',
    name: 'Tríceps Coice com Halteres',
    nameEn: 'Dumbbell Triceps Kickback',
    targetMuscle: 'triceps',
    targetMuscleLabel: 'Tríceps Braquial',
    targetMuscleHead: 'Cabeça Lateral (Pico)',
    secondaryMuscles: ['Deltóide Posterior'],
    position: 'bent_over',
    grip: 'neutral',
    difficulty: 'Intermediário',
    description: 'Tronco curvado paralelo ao solo, cotovelo erguido na altura das costelas e extensão horizontal completa do antebraço.',
    techniqueTip: 'O cotovelo deve permanecer completamente imóvel. Apenas o antebraço se move durante o kickback.',
    tempo: '2-1-2',
    repTarget: '3 x 12-15 reps',
    audioCue: 'No tríceps coice, trave o cotovelo no alto e estenda o braço para trás. Segure a contração por um segundo no ápice.'
  },
  {
    id: 'lying-cross-body-ext',
    name: 'Tríceps Cruzado Deitado',
    nameEn: 'Lying Cross-Body Triceps Extension',
    targetMuscle: 'triceps',
    targetMuscleLabel: 'Tríceps Braquial',
    targetMuscleHead: 'Cabeça Lateral e Medial',
    secondaryMuscles: ['Braquial'],
    position: 'lying',
    grip: 'neutral',
    difficulty: 'Avançado',
    description: 'Movimento unilateral de alta precisão que isola a cabeça lateral do tríceps sem sobrecarregar o ombro.',
    techniqueTip: 'Desça o haltere suavemente em direção ao ombro oposto mantendo o braço perpendicular.',
    tempo: '3-1-2',
    repTarget: '3 x 12 reps cada braço',
    audioCue: 'A extensão cruzada deitada permite amplitude total e foco milimétrico na cabeça lateral do tríceps.'
  },
  {
    id: 'close-grip-dumbbell-press',
    name: 'Supino Fechado com Halteres',
    nameEn: 'Close-Grip Dumbbell Press',
    targetMuscle: 'triceps',
    targetMuscleLabel: 'Tríceps & Peitoral Interno',
    targetMuscleHead: 'Tríceps Braquial Completo',
    secondaryMuscles: ['Peitoral Maior', 'Deltóide Anterior'],
    position: 'lying',
    grip: 'neutral',
    difficulty: 'Iniciante',
    description: 'Halteres unidos no centro do peito com cotovelos colados ao corpo, enfatizando a extensão do cotovelo com grande carga.',
    techniqueTip: 'Pressione os halteres um contra o outro enquanto sobe para maximizar o recrutamento de fibras.',
    tempo: '2-1-2',
    repTarget: '4 x 8-10 reps',
    audioCue: 'No supino fechado com halteres, mantenha os cotovelos raspando nas costelas para transferir a carga máxima ao tríceps.'
  }
];

// Helper: 3D Dumbbell Prop
function DumbbellProp({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const chromeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.15,
    metalness: 0.95
  }), []);

  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.35,
    metalness: 0.75
  }), []);

  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      {/* Central Grip */}
      <mesh material={chromeMat} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 0.22, 16]} />
      </mesh>
      {/* Left Plates */}
      <mesh material={plateMat} position={[-0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.085, 0.085, 0.03, 24]} />
      </mesh>
      <mesh material={plateMat} position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.025, 24]} />
      </mesh>
      {/* Right Plates */}
      <mesh material={plateMat} position={[0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.085, 0.085, 0.03, 24]} />
      </mesh>
      <mesh material={plateMat} position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.025, 24]} />
      </mesh>
    </group>
  );
}

// 3D Gym Bench Props based on workout position
function GymBench({ position }: { position: DumbbellArmExercise['position'] }) {
  const benchMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.4,
    metalness: 0.6
  }), []);

  const leatherMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.8,
    metalness: 0.1
  }), []);

  if (position === 'standing' || position === 'bent_over') {
    return null;
  }

  if (position === 'seated') {
    return (
      <group position={[0, -0.32, -0.05]}>
        <mesh material={leatherMat} position={[0, 0.46, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.08, 0.4]} />
        </mesh>
        <mesh material={leatherMat} position={[0, 0.85, -0.16]} rotation={[0.08, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.72, 0.07]} />
        </mesh>
        <mesh material={benchMat} position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.44, 16]} />
        </mesh>
        <mesh material={benchMat} position={[0, 0.02, 0.22]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.52, 16]} />
        </mesh>
      </group>
    );
  }

  if (position === 'incline') {
    return (
      <group position={[0, -0.32, -0.1]}>
        <mesh material={leatherMat} position={[0, 0.42, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.08, 0.35]} />
        </mesh>
        <mesh material={leatherMat} position={[0, 0.74, -0.22]} rotation={[-Math.PI / 6, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.8, 0.07]} />
        </mesh>
        <mesh material={benchMat} position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.4, 16]} />
        </mesh>
      </group>
    );
  }

  if (position === 'lying') {
    return (
      <group position={[0, -0.32, 0.2]}>
        <mesh material={leatherMat} position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.08, 1.3]} />
        </mesh>
        <mesh material={benchMat} position={[0, 0.2, -0.45]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.4, 16]} />
        </mesh>
        <mesh material={benchMat} position={[0, 0.2, 0.45]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.4, 16]} />
        </mesh>
      </group>
    );
  }

  if (position === 'preacher') {
    return (
      <group position={[0, -0.32, 0]}>
        <mesh material={leatherMat} position={[0, 0.42, -0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.08, 0.3]} />
        </mesh>
        <mesh material={leatherMat} position={[0, 0.72, 0.15]} rotation={[Math.PI / 4, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.35, 0.08]} />
        </mesh>
        <mesh material={benchMat} position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 16]} />
        </mesh>
      </group>
    );
  }

  return null;
}

// Anatomical Muscle Segment with High-Visibility Glowing Shader
function UnisexMuscleMesh({
  geometry,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  muscleType,
  activeTargetMuscle,
  isPlaying,
  colorOverride
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  muscleType: 'biceps' | 'triceps' | 'brachialis' | 'deltoids' | 'forearms' | 'body' | 'joints';
  activeTargetMuscle: 'biceps' | 'triceps' | 'brachialis' | 'forearms';
  isPlaying: boolean;
  colorOverride?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isPrimary = muscleType === activeTargetMuscle;
  const isSecondary = (activeTargetMuscle === 'biceps' && (muscleType === 'brachialis' || muscleType === 'forearms')) ||
                      (activeTargetMuscle === 'triceps' && muscleType === 'deltoids') ||
                      (activeTargetMuscle === 'brachialis' && muscleType === 'biceps');

  const mat = useMemo(() => {
    if (colorOverride) {
      return new THREE.MeshStandardMaterial({
        color: colorOverride,
        roughness: 0.3,
        metalness: 0.2
      });
    }

    if (isPrimary) {
      // High-intensity Glowing Active Muscle matching video's red arrow highlight
      return new THREE.MeshPhysicalMaterial({
        color: '#ff2a00',
        emissive: '#ff3300',
        emissiveIntensity: 3.2,
        roughness: 0.15,
        metalness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1
      });
    }

    if (isSecondary) {
      // Warm Amber secondary highlight
      return new THREE.MeshPhysicalMaterial({
        color: '#f97316',
        emissive: '#ea580c',
        emissiveIntensity: 1.4,
        roughness: 0.25,
        metalness: 0.2,
        clearcoat: 0.4
      });
    }

    // Sleek Unisex Mannequin Material
    return new THREE.MeshPhysicalMaterial({
      color: '#1e2433',
      roughness: 0.45,
      metalness: 0.35,
      clearcoat: 0.2,
      clearcoatRoughness: 0.3
    });
  }, [isPrimary, isSecondary, colorOverride]);

  useFrame((state) => {
    if (!meshRef.current || !isPrimary) return;
    if (meshRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      const t = state.clock.getElapsedTime();
      const pulse = Math.sin(t * (isPlaying ? 5 : 2.5)) * 0.7 + 3.0;
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

// Complete Unisex Anatomical 3D Avatar with Exercise Biomechanics
function UnisexWorkoutAvatar({
  exercise,
  activeTargetMuscle,
  isPlaying,
  playbackSpeed,
  positionOffset = [0, 0, 0],
  rotationOffset = [0, 0, 0],
  avatarLabel = 'Avatar 1',
  viewAngle = 'front',
  onRepProgress
}: {
  exercise: DumbbellArmExercise;
  activeTargetMuscle: 'biceps' | 'triceps' | 'brachialis' | 'forearms';
  isPlaying: boolean;
  playbackSpeed: number;
  positionOffset?: [number, number, number];
  rotationOffset?: [number, number, number];
  avatarLabel?: string;
  viewAngle?: 'front' | 'angle45' | 'side';
  onRepProgress?: (progress: number) => void;
}) {
  const rootGroup = useRef<THREE.Group>(null);
  const leftUpperArmRef = useRef<THREE.Group>(null);
  const rightUpperArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const animationTimeRef = useRef(0);

  // Cached Geometries
  const geo = useMemo(() => ({
    head: new THREE.SphereGeometry(0.12, 24, 24),
    visor: new THREE.BoxGeometry(0.14, 0.045, 0.12),
    neck: new THREE.CylinderGeometry(0.055, 0.065, 0.1, 16),
    chestUpper: new THREE.BoxGeometry(0.36, 0.18, 0.22),
    chestLower: new THREE.BoxGeometry(0.32, 0.16, 0.2),
    abdomen: new THREE.CylinderGeometry(0.14, 0.15, 0.26, 16),
    deltLeft: new THREE.SphereGeometry(0.085, 20, 20),
    deltRight: new THREE.SphereGeometry(0.085, 20, 20),
    bicep: new THREE.CapsuleGeometry(0.065, 0.14, 16, 16),
    tricep: new THREE.CapsuleGeometry(0.062, 0.15, 16, 16),
    forearm: new THREE.CapsuleGeometry(0.052, 0.19, 16, 16),
    hand: new THREE.SphereGeometry(0.045, 16, 16),
    pelvis: new THREE.BoxGeometry(0.32, 0.16, 0.22),
    quad: new THREE.CapsuleGeometry(0.085, 0.32, 16, 16),
    calf: new THREE.CapsuleGeometry(0.065, 0.3, 16, 16),
    shoe: new THREE.BoxGeometry(0.09, 0.07, 0.22),
    pointerRing: new THREE.TorusGeometry(0.11, 0.015, 16, 32),
    pointerArrow: new THREE.ConeGeometry(0.04, 0.09, 16)
  }), []);

  // Frame update for exercise movement
  useFrame((_, delta) => {
    if (!isPlaying) return;
    animationTimeRef.current += delta * playbackSpeed * 2.2;
    const t = animationTimeRef.current;
    const progress = (Math.sin(t) + 1) / 2; // 0 to 1
    if (onRepProgress) onRepProgress(progress);

    if (!leftUpperArmRef.current || !rightUpperArmRef.current || !leftForearmRef.current || !rightForearmRef.current) return;

    // Movement Pose Interpolation based on exercise type
    if (exercise.targetMuscle === 'biceps' || exercise.targetMuscle === 'brachialis') {
      if (exercise.position === 'incline') {
        // Incline curl: upper arm pulled slightly back, forearm curls upward
        leftUpperArmRef.current.rotation.x = 0.25;
        rightUpperArmRef.current.rotation.x = 0.25;
        leftForearmRef.current.rotation.x = -0.2 - progress * 1.95;
        rightForearmRef.current.rotation.x = -0.2 - progress * 1.95;
      } else if (exercise.position === 'seated' || exercise.position === 'preacher') {
        // Preacher / Concentration curl: upper arm forward
        leftUpperArmRef.current.rotation.x = -0.6;
        rightUpperArmRef.current.rotation.x = -0.6;
        leftForearmRef.current.rotation.x = -0.4 - progress * 1.7;
        rightForearmRef.current.rotation.x = -0.4 - progress * 1.7;
      } else if (exercise.position === 'bent_over') {
        // Bent over curl
        if (torsoRef.current) torsoRef.current.rotation.x = 0.7;
        leftUpperArmRef.current.rotation.x = -0.3;
        rightUpperArmRef.current.rotation.x = -0.3;
        leftForearmRef.current.rotation.x = -0.3 - progress * 1.8;
        rightForearmRef.current.rotation.x = -0.3 - progress * 1.8;
      } else {
        // Standard Standing Bicep / Hammer Curl
        leftUpperArmRef.current.rotation.x = 0.05;
        rightUpperArmRef.current.rotation.x = 0.05;
        leftForearmRef.current.rotation.x = -0.15 - progress * 2.05;
        rightForearmRef.current.rotation.x = -0.15 - progress * 2.05;
      }
    } else {
      // Triceps Exercises
      if (exercise.id === 'standing-overhead-tricep-ext' || exercise.id === 'seated-overhead-tricep-ext') {
        // Overhead extension: upper arms vertical, forearms extend upward
        leftUpperArmRef.current.rotation.x = 2.85;
        rightUpperArmRef.current.rotation.x = 2.85;
        leftUpperArmRef.current.rotation.z = -0.15;
        rightUpperArmRef.current.rotation.z = 0.15;
        leftForearmRef.current.rotation.x = -1.8 + progress * 1.6;
        rightForearmRef.current.rotation.x = -1.8 + progress * 1.6;
      } else if (exercise.id === 'dumbbell-skull-crusher' || exercise.id === 'lying-cross-body-ext') {
        // Lying Skull Crusher
        if (torsoRef.current) torsoRef.current.rotation.x = -Math.PI / 2;
        leftUpperArmRef.current.rotation.x = 1.35;
        rightUpperArmRef.current.rotation.x = 1.35;
        leftForearmRef.current.rotation.x = -1.9 + progress * 1.75;
        rightForearmRef.current.rotation.x = -1.9 + progress * 1.75;
      } else if (exercise.id === 'dumbbell-kickback') {
        // Kickback: bent over, upper arm pinned back, forearm extends straight back
        if (torsoRef.current) torsoRef.current.rotation.x = 0.85;
        leftUpperArmRef.current.rotation.x = 0.85;
        rightUpperArmRef.current.rotation.x = 0.85;
        leftForearmRef.current.rotation.x = 1.4 - progress * 1.65;
        rightForearmRef.current.rotation.x = 1.4 - progress * 1.65;
      } else {
        // Close Grip Press / Default
        leftUpperArmRef.current.rotation.x = 0.4;
        rightUpperArmRef.current.rotation.x = 0.4;
        leftForearmRef.current.rotation.x = -0.3 - progress * 1.5;
        rightForearmRef.current.rotation.x = -0.3 - progress * 1.5;
      }
    }
  });

  const neonAccentMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#00f5ff',
    emissive: '#00e5ff',
    emissiveIntensity: 2.5,
    roughness: 0.1
  }), []);

  const visorMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#10b981',
    emissive: '#059669',
    emissiveIntensity: 1.8,
    roughness: 0.2
  }), []);

  const shortsMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0b0f19',
    roughness: 0.7,
    metalness: 0.1
  }), []);

  return (
    <group ref={rootGroup} position={positionOffset} rotation={rotationOffset}>
      {/* Dynamic Bench Equipment under avatar */}
      <GymBench position={exercise.position} />

      {/* Main Avatar Kinematic Chain */}
      <group position={[0, exercise.position === 'lying' ? 0.2 : 0, 0]}>
        {/* Head & Athletic Visor */}
        <group position={[0, 1.62, 0]}>
          <UnisexMuscleMesh geometry={geo.head} position={[0, 0, 0]} muscleType="body" activeTargetMuscle={activeTargetMuscle} isPlaying={isPlaying} />
          {/* Futuristic Visor */}
          <mesh geometry={geo.visor} material={visorMat} position={[0, 0.02, 0.08]} />
          {/* Cybernetic Accent Stripe */}
          <mesh geometry={geo.visor} material={neonAccentMat} position={[0, 0.04, 0.075]} scale={[0.85, 0.2, 1]} />
        </group>

        {/* Neck */}
        <UnisexMuscleMesh geometry={geo.neck} position={[0, 1.48, 0]} muscleType="body" activeTargetMuscle={activeTargetMuscle} isPlaying={isPlaying} />

        {/* Torso & Spine */}
        <group ref={torsoRef} position={[0, 1.25, 0]}>
          <UnisexMuscleMesh geometry={geo.chestUpper} position={[0, 0.1, 0.01]} muscleType="body" activeTargetMuscle={activeTargetMuscle} isPlaying={isPlaying} />
          <UnisexMuscleMesh geometry={geo.chestLower} position={[0, -0.06, 0]} muscleType="body" activeTargetMuscle={activeTargetMuscle} isPlaying={isPlaying} />
          <UnisexMuscleMesh geometry={geo.abdomen} position={[0, -0.22, 0]} muscleType="body" activeTargetMuscle={activeTargetMuscle} isPlaying={isPlaying} />

          {/* Left Shoulder & Arm */}
          <group position={[-0.24, 0.16, 0]}>
            {/* Left Deltoid */}
            <UnisexMuscleMesh geometry={geo.deltLeft} position={[0, 0, 0]} muscleType="deltoids" activeTargetMuscle={activeTargetMuscle} isPlaying={isPlaying} />

            {/* Left Upper Arm */}
            <group ref={leftUpperArmRef} position={[-0.04, -0.08, 0]}>
              {/* Biceps (Anterior) with Glowing Active Highlight */}
              <UnisexMuscleMesh
                geometry={geo.bicep}
                position={[0, -0.1, 0.035]}
                muscleType="biceps"
                activeTargetMuscle={activeTargetMuscle}
                isPlaying={isPlaying}
              />
              {/* Triceps (Posterior) with Glowing Active Highlight */}
              <UnisexMuscleMesh
                geometry={geo.tricep}
                position={[0, -0.1, -0.035]}
                muscleType="triceps"
                activeTargetMuscle={activeTargetMuscle}
                isPlaying={isPlaying}
              />
              {/* Brachialis (Lateral) */}
              <UnisexMuscleMesh
                geometry={geo.bicep}
                position={[-0.03, -0.12, 0.01]}
                scale={[0.7, 0.8, 0.7]}
                muscleType="brachialis"
                activeTargetMuscle={activeTargetMuscle}
                isPlaying={isPlaying}
              />

              {/* Red Indicator Arrow / Halo near active arm muscle */}
              {(activeTargetMuscle === 'biceps' || activeTargetMuscle === 'triceps' || activeTargetMuscle === 'brachialis') && (
                <group position={[-0.14, -0.1, activeTargetMuscle === 'biceps' ? 0.08 : -0.08]} rotation={[0, 0, Math.PI / 2]}>
                  <mesh geometry={geo.pointerArrow} material={new THREE.MeshBasicMaterial({ color: '#ff2200' })} />
                </group>
              )}

              {/* Left Forearm & Hand */}
              <group ref={leftForearmRef} position={[0, -0.25, 0]}>
                <UnisexMuscleMesh
                  geometry={geo.forearm}
                  position={[0, -0.12, 0]}
                  muscleType="forearms"
                  activeTargetMuscle={activeTargetMuscle}
                  isPlaying={isPlaying}
                />
                <UnisexMuscleMesh
                  geometry={geo.hand}
                  position={[0, -0.26, 0]}
                  muscleType="joints"
                  activeTargetMuscle={activeTargetMuscle}
                  isPlaying={isPlaying}
                />
                {/* 3D Dumbbell in Left Hand */}
                <DumbbellProp position={[0, -0.27, 0]} rotation={[0, 0, Math.PI / 2]} />
              </group>
            </group>
          </group>

          {/* Right Shoulder & Arm */}
          <group position={[0.24, 0.16, 0]}>
            {/* Right Deltoid */}
            <UnisexMuscleMesh geometry={geo.deltRight} position={[0, 0, 0]} muscleType="deltoids" activeTargetMuscle={activeTargetMuscle} isPlaying={isPlaying} />

            {/* Right Upper Arm */}
            <group ref={rightUpperArmRef} position={[0.04, -0.08, 0]}>
              {/* Biceps (Anterior) with Glowing Active Highlight */}
              <UnisexMuscleMesh
                geometry={geo.bicep}
                position={[0, -0.1, 0.035]}
                muscleType="biceps"
                activeTargetMuscle={activeTargetMuscle}
                isPlaying={isPlaying}
              />
              {/* Triceps (Posterior) with Glowing Active Highlight */}
              <UnisexMuscleMesh
                geometry={geo.tricep}
                position={[0, -0.1, -0.035]}
                muscleType="triceps"
                activeTargetMuscle={activeTargetMuscle}
                isPlaying={isPlaying}
              />
              {/* Brachialis (Lateral) */}
              <UnisexMuscleMesh
                geometry={geo.bicep}
                position={[0.03, -0.12, 0.01]}
                scale={[0.7, 0.8, 0.7]}
                muscleType="brachialis"
                activeTargetMuscle={activeTargetMuscle}
                isPlaying={isPlaying}
              />

              {/* Red Indicator Arrow / Halo near active arm muscle */}
              {(activeTargetMuscle === 'biceps' || activeTargetMuscle === 'triceps' || activeTargetMuscle === 'brachialis') && (
                <group position={[0.14, -0.1, activeTargetMuscle === 'biceps' ? 0.08 : -0.08]} rotation={[0, 0, -Math.PI / 2]}>
                  <mesh geometry={geo.pointerArrow} material={new THREE.MeshBasicMaterial({ color: '#ff2200' })} />
                </group>
              )}

              {/* Right Forearm & Hand */}
              <group ref={rightForearmRef} position={[0, -0.25, 0]}>
                <UnisexMuscleMesh
                  geometry={geo.forearm}
                  position={[0, -0.12, 0]}
                  muscleType="forearms"
                  activeTargetMuscle={activeTargetMuscle}
                  isPlaying={isPlaying}
                />
                <UnisexMuscleMesh
                  geometry={geo.hand}
                  position={[0, -0.26, 0]}
                  muscleType="joints"
                  activeTargetMuscle={activeTargetMuscle}
                  isPlaying={isPlaying}
                />
                {/* 3D Dumbbell in Right Hand */}
                <DumbbellProp position={[0, -0.27, 0]} rotation={[0, 0, Math.PI / 2]} />
              </group>
            </group>
          </group>
        </group>

        {/* Pelvis & Athletic Shorts */}
        <group position={[0, 0.82, 0]}>
          <mesh geometry={geo.pelvis} material={shortsMat} castShadow receiveShadow />
        </group>

        {/* Left Leg */}
        <group position={[-0.13, 0.76, 0]}>
          <UnisexMuscleMesh geometry={geo.quad} position={[0, -0.18, 0]} muscleType="body" activeTargetMuscle={activeTargetMuscle} isPlaying={isPlaying} />
          <UnisexMuscleMesh geometry={geo.calf} position={[0, -0.5, 0]} muscleType="body" activeTargetMuscle={activeTargetMuscle} isPlaying={isPlaying} />
          <mesh geometry={geo.shoe} material={shortsMat} position={[0, -0.72, 0.05]} castShadow />
        </group>

        {/* Right Leg */}
        <group position={[0.13, 0.76, 0]}>
          <UnisexMuscleMesh geometry={geo.quad} position={[0, -0.18, 0]} muscleType="body" activeTargetMuscle={activeTargetMuscle} isPlaying={isPlaying} />
          <UnisexMuscleMesh geometry={geo.calf} position={[0, -0.5, 0]} muscleType="body" activeTargetMuscle={activeTargetMuscle} isPlaying={isPlaying} />
          <mesh geometry={geo.shoe} material={shortsMat} position={[0, -0.72, 0.05]} castShadow />
        </group>
      </group>

      {/* Floating 3D Label tag above avatar */}
      <group position={[0, 1.9, 0]}>
        {/* Glow point */}
        <pointLight color="#38bdf8" intensity={0.5} distance={1.2} />
      </group>
    </group>
  );
}

// 3D Canvas Scene Host
function DualAvatarCanvasScene({
  currentExercise,
  activeTargetMuscle,
  isPlaying,
  playbackSpeed,
  cameraView,
  onRepProgress
}: {
  currentExercise: DumbbellArmExercise;
  activeTargetMuscle: 'biceps' | 'triceps' | 'brachialis' | 'forearms';
  isPlaying: boolean;
  playbackSpeed: number;
  cameraView: 'front' | 'side' | 'arms' | 'iso';
  onRepProgress?: (progress: number) => void;
}) {
  const cameraPos = useMemo<[number, number, number]>(() => {
    switch (cameraView) {
      case 'side':
        return [3.6, 1.1, 1.2];
      case 'arms':
        return [0, 1.25, 2.2];
      case 'iso':
        return [2.5, 1.8, 2.8];
      case 'front':
      default:
        return [0, 1.05, 3.8];
    }
  }, [cameraView]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      className="w-full h-full cursor-grab active:cursor-grabbing"
    >
      <PerspectiveCamera makeDefault position={cameraPos} fov={36} />

      <OrbitControls
        enablePan={false}
        target={[0, 0.9, 0]}
        minDistance={1.8}
        maxDistance={5.2}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 1.7}
        dampingFactor={0.08}
        enableDamping
      />

      {/* High-Fidelity Studio Lighting */}
      <ambientLight intensity={0.5} color="#e2e8f0" />
      <directionalLight position={[3, 4, 4]} intensity={2.2} color="#ffffff" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.001} />
      <directionalLight position={[-3, 2, 3]} intensity={1.4} color="#94a3b8" />
      <spotLight position={[0, 5, -2]} intensity={7.0} color="#38bdf8" angle={Math.PI / 3} penumbra={0.6} />
      <pointLight position={[0, 1.2, 0.5]} intensity={1.2} color="#ff3b00" distance={2.5} />

      {/* Dual Avatars Setup (Side-by-side) */}
      <Float speed={0} rotationIntensity={0} floatIntensity={0}>
        {/* Avatar 1 (Left): Primary Demonstrator - Frontal View Angle */}
        <UnisexWorkoutAvatar
          exercise={currentExercise}
          activeTargetMuscle={activeTargetMuscle}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          positionOffset={[-0.85, 0, 0]}
          rotationOffset={[0, 0.15, 0]}
          avatarLabel="Avatar 1 (Frontal)"
          viewAngle="front"
          onRepProgress={onRepProgress}
        />

        {/* Avatar 2 (Right): Form Demonstrator - 45° Isometric Angle for Perfect Posture Check */}
        <UnisexWorkoutAvatar
          exercise={currentExercise}
          activeTargetMuscle={activeTargetMuscle}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          positionOffset={[0.85, 0, 0]}
          rotationOffset={[0, -0.65, 0]}
          avatarLabel="Avatar 2 (Ângulo 45°)"
          viewAngle="angle45"
        />
      </Float>

      {/* Studio Floor Contact Shadows */}
      <ContactShadows position={[0, -0.01, 0]} opacity={0.65} scale={4.5} blur={2.0} far={2.5} />
    </Canvas>
  );
}

export function DualAvatarWorkoutStudio() {
  const { t } = useTranslation();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('standing-bicep-curl');
  const [filterCategory, setFilterCategory] = useState<'all' | 'biceps' | 'triceps'>('all');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [cameraView, setCameraView] = useState<'front' | 'side' | 'arms' | 'iso'>('front');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [repProgress, setRepProgress] = useState<number>(0);

  const currentExercise = useMemo(() => {
    return DUMBBELL_ARM_WORKOUTS.find(e => e.id === selectedExerciseId) || DUMBBELL_ARM_WORKOUTS[0];
  }, [selectedExerciseId]);

  const filteredExercises = useMemo(() => {
    if (filterCategory === 'all') return DUMBBELL_ARM_WORKOUTS;
    if (filterCategory === 'biceps') return DUMBBELL_ARM_WORKOUTS.filter(e => e.targetMuscle === 'biceps' || e.targetMuscle === 'brachialis');
    return DUMBBELL_ARM_WORKOUTS.filter(e => e.targetMuscle === 'triceps');
  }, [filterCategory]);

  const handleSelectExercise = (exercise: DumbbellArmExercise) => {
    playSfx('tap');
    vibrate(25);
    setSelectedExerciseId(exercise.id);
  };

  const handlePlayVoice = (text: string) => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    speak(text, {
      voice: 'Aoede', // Strictly Aoede voice per user guidelines
      rate: 1.0,
      onEnded: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 px-3 sm:px-4 md:px-6">
      {/* Header Banner - Matching Video Inspiration */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 border border-slate-700/60 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-md shadow-sm">
                Dumbbells Arms Workout
              </span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> 3D Biomecânica R3F
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white uppercase">
              Guia Anatômico de Braços em 3D
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Dois avatares unissex demonstram simultaneamente a postura correta, ângulo de cotovelo e trajetória com halteres.
              O músculo alvo acende em vermelho pulsante sincronizado com a contração.
            </p>
          </div>

          {/* Quick Active Muscle Anatomy Pill with Audio Cue */}
          <div className="bg-slate-950/70 border border-slate-700/80 rounded-2xl p-4 flex flex-col gap-2.5 backdrop-blur-md min-w-[260px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Músculo Ativo no 3D:</span>
              <span className="text-red-400 font-black uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                {currentExercise.targetMuscleLabel}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 bg-slate-900/90 rounded-lg p-2 border border-slate-800">
              <span className="text-amber-400 font-bold">Porção Principal: </span>
              {currentExercise.targetMuscleHead}
            </div>
            <button
              onClick={() => handlePlayVoice(currentExercise.audioCue)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                isSpeaking
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isSpeaking ? 'Pausar Áudio da Malu' : 'Ouvir Técnica com Voz Malu'}
            </button>
          </div>
        </div>
      </div>

      {/* 3D Visual Stage Section */}
      <div className="relative w-full h-[460px] sm:h-[540px] md:h-[600px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Floating Top Controls Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          {/* Dual Avatars Badge */}
          <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-2xl px-3.5 py-2 flex items-center gap-3 text-xs text-slate-200 shadow-lg">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Dois Avatares Unissex 3D
            </div>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 font-medium hidden sm:inline">Frontal & Isométrico 45°</span>
          </div>

          {/* Camera View Switcher Buttons */}
          <div className="pointer-events-auto flex items-center gap-1 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-1 shadow-lg">
            {(['front', 'arms', 'side', 'iso'] as const).map((view) => (
              <button
                key={view}
                onClick={() => {
                  playSfx('tap');
                  setCameraView(view);
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  cameraView === view
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {view === 'front' && 'Frontal'}
                {view === 'arms' && 'Braços'}
                {view === 'side' && 'Lateral'}
                {view === 'iso' && 'Isométrico'}
              </button>
            ))}
          </div>

          {/* Speed & Animation Toggles */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-1 shadow-lg">
            <button
              onClick={() => {
                playSfx('tap');
                setIsPlaying(!isPlaying);
              }}
              className={`p-2 rounded-xl text-white transition-colors cursor-pointer ${
                isPlaying ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-emerald-500 text-slate-950 font-bold'
              }`}
              title={isPlaying ? 'Pausar Movimento' : 'Iniciar Movimento'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            {[0.5, 1, 1.5].map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  playSfx('tap');
                  setPlaybackSpeed(speed);
                }}
                className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
                  playbackSpeed === speed
                    ? 'bg-slate-700 text-white font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* 3D Canvas Scene Host */}
        <div className="w-full flex-1 relative">
          <DualAvatarCanvasScene
            currentExercise={currentExercise}
            activeTargetMuscle={currentExercise.targetMuscle}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            cameraView={cameraView}
            onRepProgress={setRepProgress}
          />

          {/* Floating Rep Phase & Bio Feedback Indicator */}
          <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none">
            <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-black text-sm">
                🔥
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fase da Repetição:</p>
                <p className="text-xs font-black text-white">
                  {repProgress > 0.75
                    ? 'Contração Máxima no Topo (Pico)'
                    : repProgress < 0.25
                    ? 'Alongamento Excêntrico Controlado'
                    : 'Fase Concêntrica com Halteres'}
                </p>
              </div>
            </div>

            {/* Exercise Title Overlay on 3D */}
            <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3 text-right">
              <div>
                <h2 className="text-white text-sm sm:text-base font-black tracking-wide uppercase">
                  {currentExercise.name}
                </h2>
                <p className="text-emerald-400 text-xs font-bold tracking-wide">
                  {currentExercise.nameEn} • {currentExercise.repTarget}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Muscle Group Filter & Workouts Grid Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-500" />
            Catálogo Completo de Treinos com Halteres
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clique em qualquer treino para reposicionar os dois avatares 3D e iluminar o músculo ativo
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => {
              playSfx('tap');
              setFilterCategory('all');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos ({DUMBBELL_ARM_WORKOUTS.length})
          </button>
          <button
            onClick={() => {
              playSfx('tap');
              setFilterCategory('biceps');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterCategory === 'biceps'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Bíceps ({DUMBBELL_ARM_WORKOUTS.filter(e => e.targetMuscle === 'biceps' || e.targetMuscle === 'brachialis').length})
          </button>
          <button
            onClick={() => {
              playSfx('tap');
              setFilterCategory('triceps');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterCategory === 'triceps'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tríceps ({DUMBBELL_ARM_WORKOUTS.filter(e => e.targetMuscle === 'triceps').length})
          </button>
        </div>
      </div>

      {/* Grid of Workouts (12 dumbbell exercises from reference) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredExercises.map((exercise, index) => {
          const isSelected = exercise.id === selectedExerciseId;
          const isBiceps = exercise.targetMuscle === 'biceps' || exercise.targetMuscle === 'brachialis';

          return (
            <motion.div
              key={exercise.id}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectExercise(exercise)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-900 border-red-500 shadow-xl shadow-red-500/15 ring-2 ring-red-500/40 text-white'
                  : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-700'
              }`}
            >
              {/* Highlight ribbon when active */}
              {isSelected && (
                <div className="absolute top-0 right-0 bg-red-600 text-[10px] font-black uppercase tracking-wider text-white px-3 py-0.5 rounded-bl-lg shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Ativo no 3D
                </div>
              )}

              <div className="space-y-3">
                {/* Header Tag with Muscle Icon */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                      isSelected
                        ? 'bg-red-500 text-white'
                        : isBiceps
                        ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                        : 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                    }`}
                  >
                    #{index + 1}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      {exercise.position.toUpperCase()} • {exercise.grip.toUpperCase()}
                    </span>
                    <p className={`text-xs font-extrabold ${isSelected ? 'text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {exercise.targetMuscleLabel}
                    </p>
                  </div>
                </div>

                {/* Exercise Names */}
                <div>
                  <h4 className="font-black text-sm leading-tight text-slate-900 dark:text-white">
                    {exercise.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {exercise.nameEn}
                  </p>
                </div>

                {/* Muscle Head Badge */}
                <div className="text-[11px] p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-red-500 dark:text-red-400">Foco: </span>
                  {exercise.targetMuscleHead}
                </div>
              </div>

              {/* Card Footer with Rep Target & Action Indicator */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" /> {exercise.repTarget}
                </span>

                <span
                  className={`text-[11px] font-bold flex items-center gap-1 ${
                    isSelected ? 'text-red-400' : 'text-slate-400 group-hover:text-white'
                  }`}
                >
                  {isSelected ? 'Posicionado' : 'Ver Posição 3D →'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Exercise Technique Detail Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-white space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500 text-white">
                Biomecânica & Postura Recomendada
              </span>
              <span className="text-xs text-slate-400">Cadência {currentExercise.tempo}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">{currentExercise.name}</h3>
          </div>

          <button
            onClick={() => handlePlayVoice(currentExercise.audioCue)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            Voz da Chef Malu (Aoede)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Execução Biomecânica Perfeita:
            </h4>
            <p className="text-slate-300 leading-relaxed">{currentExercise.description}</p>
          </div>

          <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <h4 className="font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Dica de Ativação Máxima:
            </h4>
            <p className="text-slate-300 leading-relaxed">{currentExercise.techniqueTip}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DualAvatarWorkoutStudio;
