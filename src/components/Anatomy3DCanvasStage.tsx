import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { MuscleExercise } from './AnatomyWorkoutGuide';

interface Anatomy3DCanvasStageProps {
  currentExercise: MuscleExercise;
  selectedMuscleId: string;
  cameraView: 'front' | 'side' | 'top' | 'close';
  isPlaying: boolean;
  playbackSpeed: number;
  onProgressUpdate: (progress: number) => void;
}

// 3D Dumbbells attached to hands
function HandDumbbell({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const chromeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.2,
    metalness: 0.95
  }), []);

  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.35,
    metalness: 0.8
  }), []);

  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      {/* Central Handle Grip */}
      <mesh material={chromeMat} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.22, 16]} />
      </mesh>
      {/* Left Weight Plates */}
      <mesh material={plateMat} position={[-0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.03, 24]} />
      </mesh>
      <mesh material={plateMat} position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.025, 24]} />
      </mesh>
      {/* Right Weight Plates */}
      <mesh material={plateMat} position={[0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.03, 24]} />
      </mesh>
      <mesh material={plateMat} position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.025, 24]} />
      </mesh>
    </group>
  );
}

// 3D Barbell Half
function HandBarbell({ position, isLeft }: { position: [number, number, number]; isLeft: boolean }) {
  const chromeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#cbd5e1', roughness: 0.2, metalness: 0.95
  }), []);
  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0f172a', roughness: 0.35, metalness: 0.8
  }), []);

  const dir = isLeft ? -1 : 1;
  return (
    <group position={position}>
      <mesh material={chromeMat} position={[dir * 0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 1.2, 16]} />
      </mesh>
      <mesh material={plateMat} position={[dir * 0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 24]} />
      </mesh>
      <mesh material={plateMat} position={[dir * 0.75, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 24]} />
      </mesh>
    </group>
  );
}

// 3D Cable Handle
function HandCable({ position }: { position: [number, number, number] }) {
  const darkMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#111827', roughness: 0.6, metalness: 0.2
  }), []);
  
  return (
    <group position={position}>
      <mesh material={darkMat} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 0.14, 16]} />
      </mesh>
      <mesh material={darkMat} position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.12, 0.02, 0.02]} />
      </mesh>
    </group>
  );
}

// 3D Gym Props (Bench, Platform, Cables)
function GymEquipmentProps({ 
  position = 'seated',
}: { 
  position: 'seated' | 'standing' | 'lying' | 'incline';
  exerciseId: string;
}) {
  const benchMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.4,
    metalness: 0.6,
  }), []);

  const leatherMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.8,
    metalness: 0.1,
  }), []);

  return (
    <group>
      {position === 'seated' && (
        <group position={[0, -0.32, -0.05]}>
          <mesh material={leatherMat} position={[0, 0.46, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[0.34, 0.08, 0.38]} />
          </mesh>
          <mesh material={leatherMat} position={[0, 0.85, -0.15]} rotation={[0.08, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.72, 0.07]} />
          </mesh>
          <mesh material={benchMat} position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.44, 16]} />
          </mesh>
          <mesh material={benchMat} position={[0, 0.02, 0.22]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.52, 16]} />
          </mesh>
          <mesh material={benchMat} position={[0, 0.02, -0.25]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.52, 16]} />
          </mesh>
        </group>
      )}

      {position === 'incline' && (
        <group position={[0, -0.32, -0.1]}>
          <mesh material={leatherMat} position={[0, 0.42, 0.1]} castShadow receiveShadow>
            <boxGeometry args={[0.34, 0.08, 0.35]} />
          </mesh>
          <mesh material={leatherMat} position={[0, 0.72, -0.22]} rotation={[-Math.PI / 6, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.78, 0.07]} />
          </mesh>
          <mesh material={benchMat} position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 16]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// 3D Mannequin Anatomy Muscle Part with Glowing Highlight
function AnatomicalMuscleMesh({
  geometry,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  muscleGroupKey,
  selectedMuscleKey,
  isSecondary = false,
  isPlaying = false,
  colorOverride
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  muscleGroupKey: string;
  selectedMuscleKey: string;
  isSecondary?: boolean;
  isPlaying?: boolean;
  colorOverride?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isTarget = muscleGroupKey === selectedMuscleKey;

  const mat = useMemo(() => {
    if (colorOverride) {
      return new THREE.MeshStandardMaterial({
        color: colorOverride,
        roughness: 0.3,
        metalness: 0.15,
      });
    }

    if (isTarget) {
      return new THREE.MeshPhysicalMaterial({
        color: '#ff6a00',
        emissive: '#ff5500',
        emissiveIntensity: 2.8,
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
      });
    }

    if (isSecondary) {
      return new THREE.MeshPhysicalMaterial({
        color: '#f97316',
        emissive: '#ea580c',
        emissiveIntensity: 1.2,
        roughness: 0.3,
        metalness: 0.2,
        clearcoat: 0.3,
        clearcoatRoughness: 0.2,
      });
    }

    return new THREE.MeshPhysicalMaterial({
      color: '#1a1d26',
      roughness: 0.5,
      metalness: 0.4,
      clearcoat: 0.2,
      clearcoatRoughness: 0.4,
    });
  }, [isTarget, isSecondary, colorOverride]);

  useFrame((state) => {
    if (!meshRef.current || !isTarget) return;
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      const t = state.clock.getElapsedTime();
      const pulse = Math.sin(t * (isPlaying ? 5 : 2.5)) * 0.5 + 2.6;
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

// Full 3D Athletic Mannequin performing the selected exercise
function AnimatedMannequin3D({
  exercise,
  selectedMuscleKey,
  isPlaying,
  playbackSpeed,
  onProgressUpdate
}: {
  exercise: MuscleExercise;
  selectedMuscleKey: string;
  isPlaying: boolean;
  playbackSpeed: number;
  onProgressUpdate?: (progress: number) => void;
}) {
  const rootGroup = useRef<THREE.Group>(null);
  const spineGroup = useRef<THREE.Group>(null);
  const leftShoulderGroup = useRef<THREE.Group>(null);
  const rightShoulderGroup = useRef<THREE.Group>(null);
  const leftElbowGroup = useRef<THREE.Group>(null);
  const rightElbowGroup = useRef<THREE.Group>(null);
  const leftLegGroup = useRef<THREE.Group>(null);
  const rightLegGroup = useRef<THREE.Group>(null);
  const leftKneeGroup = useRef<THREE.Group>(null);
  const rightKneeGroup = useRef<THREE.Group>(null);

  const geo = useMemo(() => ({
    head: new THREE.SphereGeometry(0.18, 32, 32),
    neck: new THREE.CylinderGeometry(0.1, 0.13, 0.18, 24),
    chest: new THREE.CapsuleGeometry(0.16, 0.28, 24, 24),
    deltoid: new THREE.SphereGeometry(0.14, 24, 24),
    bicep: new THREE.CapsuleGeometry(0.085, 0.2, 16, 16),
    tricep: new THREE.CapsuleGeometry(0.08, 0.18, 16, 16),
    forearm: new THREE.CapsuleGeometry(0.07, 0.22, 16, 16),
    hand: new THREE.CapsuleGeometry(0.045, 0.09, 12, 12),
    absUpper: new THREE.CapsuleGeometry(0.06, 0.1, 16, 16),
    absMid: new THREE.CapsuleGeometry(0.06, 0.09, 16, 16),
    absLower: new THREE.CapsuleGeometry(0.06, 0.08, 16, 16),
    oblique: new THREE.CapsuleGeometry(0.065, 0.18, 16, 16),
    lat: new THREE.CapsuleGeometry(0.1, 0.26, 24, 24),
    shorts: new THREE.CapsuleGeometry(0.17, 0.28, 24, 24),
    quadMain: new THREE.CapsuleGeometry(0.12, 0.36, 24, 24),
    hamstring: new THREE.CapsuleGeometry(0.1, 0.32, 24, 24),
    knee: new THREE.SphereGeometry(0.06, 16, 16),
    calf: new THREE.CapsuleGeometry(0.09, 0.3, 24, 24),
    foot: new THREE.CapsuleGeometry(0.06, 0.18, 16, 16),
  }), []);

  const shortsMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0b1120',
    roughness: 0.8,
    metalness: 0.1
  }), []);

  useFrame((state) => {
    if (!rootGroup.current) return;
    const time = state.clock.getElapsedTime() * playbackSpeed;
    const cycle = (Math.sin(time * 2.2) + 1) / 2; // 0 to 1
    
    if (onProgressUpdate) {
      onProgressUpdate(cycle);
    }

    const isSeated = exercise.position === 'seated';
    const isLying = exercise.position === 'lying';

    if (isSeated) {
      rootGroup.current.position.set(0, 0.1, 0.02);
      rootGroup.current.rotation.set(0, 0, 0);
      if (leftLegGroup.current) {
        leftLegGroup.current.position.set(-0.16, 0.08, 0.05);
        leftLegGroup.current.rotation.set(-1.45, 0, -0.15);
      }
      if (rightLegGroup.current) {
        rightLegGroup.current.position.set(0.16, 0.08, 0.05);
        rightLegGroup.current.rotation.set(-1.45, 0, 0.15);
      }
      if (leftKneeGroup.current) leftKneeGroup.current.rotation.set(1.48, 0, 0);
      if (rightKneeGroup.current) rightKneeGroup.current.rotation.set(1.48, 0, 0);
    } else if (isLying) {
      rootGroup.current.position.set(0, 0.25, -0.4);
      rootGroup.current.rotation.set(Math.PI / 2, 0, 0);
      if (leftLegGroup.current) {
        leftLegGroup.current.position.set(-0.16, 0.08, -0.1);
        leftLegGroup.current.rotation.set(-1.2, 0, -0.1);
      }
      if (rightLegGroup.current) {
        rightLegGroup.current.position.set(0.16, 0.08, -0.1);
        rightLegGroup.current.rotation.set(-1.2, 0, 0.1);
      }
      if (leftKneeGroup.current) leftKneeGroup.current.rotation.set(1.4, 0, 0);
      if (rightKneeGroup.current) rightKneeGroup.current.rotation.set(1.4, 0, 0);
    } else {
      rootGroup.current.position.set(0, 0.35, 0);
      rootGroup.current.rotation.set(0, 0, 0);
      if (leftLegGroup.current) {
        leftLegGroup.current.position.set(-0.15, 0.08, 0);
        leftLegGroup.current.rotation.set(0, 0, -0.05);
      }
      if (rightLegGroup.current) {
        rightLegGroup.current.position.set(0.15, 0.08, 0);
        rightLegGroup.current.rotation.set(0, 0, 0.05);
      }
      if (leftKneeGroup.current) leftKneeGroup.current.rotation.set(0, 0, 0);
      if (rightKneeGroup.current) rightKneeGroup.current.rotation.set(0, 0, 0);
    }

    // Exercise Biomechanical Movements
    if (exercise.id === 'seated_lateral_raises' || exercise.id === 'cable_lateral_raise') {
      const raiseAngle = cycle * 1.35;
      if (leftShoulderGroup.current) leftShoulderGroup.current.rotation.set(0.15, 0, raiseAngle);
      if (rightShoulderGroup.current) rightShoulderGroup.current.rotation.set(0.15, 0, -raiseAngle);
      if (leftElbowGroup.current) leftElbowGroup.current.rotation.set(-0.35, 0.2, 0.25);
      if (rightElbowGroup.current) rightElbowGroup.current.rotation.set(-0.35, -0.2, -0.25);
      if (spineGroup.current) spineGroup.current.rotation.set(0.04, 0, 0);

    } else if (exercise.id === 'standing_dumbbell_press') {
      const pressAngle = cycle * 1.1;
      if (leftShoulderGroup.current) leftShoulderGroup.current.rotation.set(0.8 - pressAngle * 0.4, 0, 0.8 + pressAngle * 0.5);
      if (rightShoulderGroup.current) rightShoulderGroup.current.rotation.set(0.8 - pressAngle * 0.4, 0, -0.8 - pressAngle * 0.5);
      if (leftElbowGroup.current) leftElbowGroup.current.rotation.set(-1.4 + pressAngle * 1.2, 0, 0);
      if (rightElbowGroup.current) rightElbowGroup.current.rotation.set(-1.4 + pressAngle * 1.2, 0, 0);

    } else if (exercise.id.includes('curl')) {
      const curlAngle = cycle * 1.55;
      if (leftShoulderGroup.current) leftShoulderGroup.current.rotation.set(0.15, 0, 0.1);
      if (rightShoulderGroup.current) rightShoulderGroup.current.rotation.set(0.15, 0, -0.1);
      if (leftElbowGroup.current) leftElbowGroup.current.rotation.set(curlAngle, 0, 0);
      if (rightElbowGroup.current) rightElbowGroup.current.rotation.set(curlAngle, 0, 0);

    } else if (exercise.id.includes('bench_press') || exercise.id.includes('incline_dumbbell_press')) {
      const pressDepth = cycle * 0.9;
      if (leftShoulderGroup.current) leftShoulderGroup.current.rotation.set(1.2 - pressDepth * 0.3, 0, 0.4 + pressDepth * 0.4);
      if (rightShoulderGroup.current) rightShoulderGroup.current.rotation.set(1.2 - pressDepth * 0.3, 0, -0.4 - pressDepth * 0.4);
      if (leftElbowGroup.current) leftElbowGroup.current.rotation.set(-pressDepth * 1.2, 0, 0);
      if (rightElbowGroup.current) rightElbowGroup.current.rotation.set(-pressDepth * 1.2, 0, 0);

    } else if (exercise.id.includes('tricep') || exercise.id.includes('skull')) {
      const pushdownAngle = cycle * 1.4;
      if (leftShoulderGroup.current) leftShoulderGroup.current.rotation.set(-0.2, 0, 0.1);
      if (rightShoulderGroup.current) rightShoulderGroup.current.rotation.set(-0.2, 0, -0.1);
      if (leftElbowGroup.current) leftElbowGroup.current.rotation.set(-1.4 + pushdownAngle, 0, 0);
      if (rightElbowGroup.current) rightElbowGroup.current.rotation.set(-1.4 + pushdownAngle, 0, 0);

    } else if (exercise.id.includes('row') || exercise.id.includes('pulldown')) {
      const pullDepth = cycle * 1.0;
      const isPulldown = exercise.id.includes('pulldown');
      const shoulderBase = isPulldown ? 2.0 : 0.8;
      
      if (leftShoulderGroup.current) leftShoulderGroup.current.rotation.set(shoulderBase - pullDepth * 0.8, 0.2, 0.2);
      if (rightShoulderGroup.current) rightShoulderGroup.current.rotation.set(shoulderBase - pullDepth * 0.8, -0.2, -0.2);
      if (leftElbowGroup.current) leftElbowGroup.current.rotation.set(pullDepth * 1.2, 0, 0);
      if (rightElbowGroup.current) rightElbowGroup.current.rotation.set(pullDepth * 1.2, 0, 0);

    } else if (exercise.id.includes('crunch')) {
      const crunchDepth = cycle * 0.6;
      if (spineGroup.current) spineGroup.current.rotation.set(crunchDepth, 0, 0);
      if (leftShoulderGroup.current) leftShoulderGroup.current.rotation.set(1.5, 0, 0.2);
      if (rightShoulderGroup.current) rightShoulderGroup.current.rotation.set(1.5, 0, -0.2);
      if (leftElbowGroup.current) leftElbowGroup.current.rotation.set(1.5, 0, 0);
      if (rightElbowGroup.current) rightElbowGroup.current.rotation.set(1.5, 0, 0);

    } else if (exercise.id.includes('extension')) {
      const extAngle = cycle * 1.3;
      if (leftKneeGroup.current) leftKneeGroup.current.rotation.set(1.48 - extAngle, 0, 0);
      if (rightKneeGroup.current) rightKneeGroup.current.rotation.set(1.48 - extAngle, 0, 0);

    } else if (exercise.id.includes('squat')) {
      const squatDepth = cycle * 0.8;
      if (leftLegGroup.current) leftLegGroup.current.rotation.set(-squatDepth * 1.1, 0, -0.1);
      if (rightLegGroup.current) rightLegGroup.current.rotation.set(-squatDepth * 1.1, 0, 0.1);
      if (leftKneeGroup.current) leftKneeGroup.current.rotation.set(squatDepth * 1.5, 0, 0);
      if (rightKneeGroup.current) rightKneeGroup.current.rotation.set(squatDepth * 1.5, 0, 0);
      if (rootGroup.current) rootGroup.current.position.set(0, 0.35 - squatDepth * 0.25, 0);
      if (spineGroup.current) spineGroup.current.rotation.set(squatDepth * 0.4, 0, 0);

    } else if (exercise.id.includes('deadlift')) {
      const hingeDepth = cycle * 1.2;
      if (spineGroup.current) spineGroup.current.rotation.set(hingeDepth * 0.9, 0, 0);
      if (leftLegGroup.current) leftLegGroup.current.rotation.set(-0.1, 0, -0.05);
      if (rightLegGroup.current) rightLegGroup.current.rotation.set(-0.1, 0, 0.05);
      if (leftKneeGroup.current) leftKneeGroup.current.rotation.set(hingeDepth * 0.2, 0, 0);
      if (rightKneeGroup.current) rightKneeGroup.current.rotation.set(hingeDepth * 0.2, 0, 0);
      if (leftShoulderGroup.current) leftShoulderGroup.current.rotation.set(-hingeDepth * 0.9, 0, 0.1);
      if (rightShoulderGroup.current) rightShoulderGroup.current.rotation.set(-hingeDepth * 0.9, 0, -0.1);

    } else if (exercise.id.includes('calf')) {
      const calfRaise = cycle * 0.3;
      if (rootGroup.current) rootGroup.current.position.set(0, 0.35 + calfRaise, 0);
    } else {
      const genRaise = cycle * 0.6;
      if (leftShoulderGroup.current) leftShoulderGroup.current.rotation.set(0, 0, genRaise);
      if (rightShoulderGroup.current) rightShoulderGroup.current.rotation.set(0, 0, -genRaise);
    }
  });

  return (
    <group ref={rootGroup}>
      {/* Torso & Head */}
      <group ref={spineGroup} position={[0, 0.52, 0]}>
        <group position={[0, 0.58, 0]}>
          <AnatomicalMuscleMesh
            geometry={geo.head}
            position={[0, 0.08, 0]}
            scale={[0.85, 1.0, 0.92]}
            muscleGroupKey="head"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.neck}
            position={[0, -0.1, 0]}
            scale={[1, 1, 0.95]}
            muscleGroupKey="neck"
            selectedMuscleKey={selectedMuscleKey}
          />
        </group>

        <AnatomicalMuscleMesh
          geometry={geo.chest}
          position={[0, 0.34, 0.05]}
          rotation={[0, 0, Math.PI / 2]}
          scale={[1.15, 1.3, 0.9]}
          muscleGroupKey="chest"
          selectedMuscleKey={selectedMuscleKey}
        />

        <AnatomicalMuscleMesh
          geometry={geo.lat}
          position={[-0.17, 0.28, -0.07]}
          rotation={[0, 0.2, 0.2]}
          muscleGroupKey="back"
          selectedMuscleKey={selectedMuscleKey}
        />
        <AnatomicalMuscleMesh
          geometry={geo.lat}
          position={[0.17, 0.28, -0.07]}
          rotation={[0, -0.2, -0.2]}
          muscleGroupKey="back"
          selectedMuscleKey={selectedMuscleKey}
        />

        <group position={[0, 0.18, 0.09]}>
          <AnatomicalMuscleMesh
            geometry={geo.absUpper}
            position={[0, 0.09, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[1.4, 1.5, 0.9]}
            muscleGroupKey="abs"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.absMid}
            position={[0, -0.02, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[1.3, 1.4, 0.9]}
            muscleGroupKey="abs"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.absLower}
            position={[0, -0.12, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[1.2, 1.3, 0.9]}
            muscleGroupKey="abs"
            selectedMuscleKey={selectedMuscleKey}
          />
        </group>

        <AnatomicalMuscleMesh
          geometry={geo.oblique}
          position={[-0.13, 0.12, 0.04]}
          rotation={[0, 0, 0.18]}
          muscleGroupKey="abs"
          selectedMuscleKey={selectedMuscleKey}
        />
        <AnatomicalMuscleMesh
          geometry={geo.oblique}
          position={[0.13, 0.12, 0.04]}
          rotation={[0, 0, -0.18]}
          muscleGroupKey="abs"
          selectedMuscleKey={selectedMuscleKey}
        />

        {/* Left Arm & Deltoid */}
        <group ref={leftShoulderGroup} position={[-0.30, 0.43, 0]}>
          <AnatomicalMuscleMesh
            geometry={geo.deltoid}
            position={[0, 0.02, 0]}
            scale={[1.2, 1.35, 1.1]}
            muscleGroupKey="side_delts"
            selectedMuscleKey={selectedMuscleKey}
            isPlaying={isPlaying}
          />
          <AnatomicalMuscleMesh
            geometry={geo.bicep}
            position={[0, -0.16, 0.02]}
            muscleGroupKey="biceps"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.tricep}
            position={[0, -0.16, -0.03]}
            muscleGroupKey="triceps"
            selectedMuscleKey={selectedMuscleKey}
          />
          <group ref={leftElbowGroup} position={[0, -0.3, 0]}>
            <AnatomicalMuscleMesh
              geometry={geo.forearm}
              position={[0, -0.14, 0]}
              muscleGroupKey="arms"
              selectedMuscleKey={selectedMuscleKey}
            />
            <AnatomicalMuscleMesh
              geometry={geo.hand}
              position={[0, -0.28, 0]}
              muscleGroupKey="none"
              selectedMuscleKey={selectedMuscleKey}
            />
            {exercise.equipment === 'dumbbells' && <HandDumbbell position={[0, -0.28, 0]} />}
            {exercise.equipment === 'barbell' && <HandBarbell position={[0, -0.28, 0]} isLeft={true} />}
            {exercise.equipment === 'cable' && <HandCable position={[0, -0.28, 0]} />}
          </group>
        </group>

        {/* Right Arm & Deltoid */}
        <group ref={rightShoulderGroup} position={[0.30, 0.43, 0]}>
          <AnatomicalMuscleMesh
            geometry={geo.deltoid}
            position={[0, 0.02, 0]}
            scale={[1.2, 1.35, 1.1]}
            muscleGroupKey="side_delts"
            selectedMuscleKey={selectedMuscleKey}
            isPlaying={isPlaying}
          />
          <AnatomicalMuscleMesh
            geometry={geo.bicep}
            position={[0, -0.16, 0.02]}
            muscleGroupKey="biceps"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.tricep}
            position={[0, -0.16, -0.03]}
            muscleGroupKey="triceps"
            selectedMuscleKey={selectedMuscleKey}
          />
          <group ref={rightElbowGroup} position={[0, -0.3, 0]}>
            <AnatomicalMuscleMesh
              geometry={geo.forearm}
              position={[0, -0.14, 0]}
              muscleGroupKey="arms"
              selectedMuscleKey={selectedMuscleKey}
            />
            <AnatomicalMuscleMesh
              geometry={geo.hand}
              position={[0, -0.28, 0]}
              muscleGroupKey="none"
              selectedMuscleKey={selectedMuscleKey}
            />
            {exercise.equipment === 'dumbbells' && <HandDumbbell position={[0, -0.28, 0]} />}
            {exercise.equipment === 'barbell' && <HandBarbell position={[0, -0.28, 0]} isLeft={false} />}
            {exercise.equipment === 'cable' && <HandCable position={[0, -0.28, 0]} />}
          </group>
        </group>
      </group>

      {/* Pelvis & Shorts */}
      <mesh geometry={geo.shorts} material={shortsMat} position={[0, 0.44, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.2, 1.3, 1.1]} castShadow receiveShadow />

      {/* Left Leg */}
      <group ref={leftLegGroup} position={[-0.16, 0.4, 0]}>
        <AnatomicalMuscleMesh
          geometry={geo.quadMain}
          position={[0, -0.2, 0.02]}
          muscleGroupKey="quads"
          selectedMuscleKey={selectedMuscleKey}
        />
        <AnatomicalMuscleMesh
          geometry={geo.hamstring}
          position={[0, -0.2, -0.04]}
          muscleGroupKey="hamstrings_glutes"
          selectedMuscleKey={selectedMuscleKey}
        />
        <group ref={leftKneeGroup} position={[0, -0.42, 0]}>
          <AnatomicalMuscleMesh
            geometry={geo.knee}
            position={[0, 0, 0.02]}
            muscleGroupKey="none"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.calf}
            position={[0, -0.18, -0.02]}
            muscleGroupKey="calves"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.foot}
            position={[0, -0.36, 0.08]}
            rotation={[Math.PI / 2, 0, 0]}
            muscleGroupKey="none"
            selectedMuscleKey={selectedMuscleKey}
          />
        </group>
      </group>

      {/* Right Leg */}
      <group ref={rightLegGroup} position={[0.16, 0.4, 0]}>
        <AnatomicalMuscleMesh
          geometry={geo.quadMain}
          position={[0, -0.2, 0.02]}
          muscleGroupKey="quads"
          selectedMuscleKey={selectedMuscleKey}
        />
        <AnatomicalMuscleMesh
          geometry={geo.hamstring}
          position={[0, -0.2, -0.04]}
          muscleGroupKey="hamstrings_glutes"
          selectedMuscleKey={selectedMuscleKey}
        />
        <group ref={rightKneeGroup} position={[0, -0.42, 0]}>
          <AnatomicalMuscleMesh
            geometry={geo.knee}
            position={[0, 0, 0.02]}
            muscleGroupKey="none"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.calf}
            position={[0, -0.18, -0.02]}
            muscleGroupKey="calves"
            selectedMuscleKey={selectedMuscleKey}
          />
          <AnatomicalMuscleMesh
            geometry={geo.foot}
            position={[0, -0.36, 0.08]}
            rotation={[Math.PI / 2, 0, 0]}
            muscleGroupKey="none"
            selectedMuscleKey={selectedMuscleKey}
          />
        </group>
      </group>
    </group>
  );
}

export default function Anatomy3DCanvasStage({
  currentExercise,
  selectedMuscleId,
  cameraView,
  isPlaying,
  playbackSpeed,
  onProgressUpdate,
}: Anatomy3DCanvasStageProps) {
  return (
    <div className="w-full h-full relative flex items-center justify-center cursor-grab active:cursor-grabbing">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        className="w-full h-full"
      >
        <PerspectiveCamera
          makeDefault
          position={
            cameraView === 'side'
              ? [2.8, 0.7, 0.8]
              : cameraView === 'close'
              ? [0, 0.95, 1.8]
              : [0, 0.75, 3.2]
          }
          fov={38}
        />

        <OrbitControls
          enablePan={false}
          target={[0, 0.65, 0]}
          minDistance={1.6}
          maxDistance={4.8}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.8}
          dampingFactor={0.08}
          enableDamping
        />

        {/* Cinematic Studio Lighting */}
        <ambientLight intensity={0.4} color="#e2e8f0" />
        <directionalLight position={[2, 3, 4]} intensity={2.0} color="#f8fafc" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.001} />
        <directionalLight position={[-3, 1.5, 3]} intensity={1.2} color="#94a3b8" />
        <spotLight position={[0, 4.5, -3]} intensity={8.0} color="#60a5fa" angle={Math.PI / 3} penumbra={0.5} />
        <directionalLight position={[-4, 2, -1]} intensity={2.5} color="#818cf8" />

        <Float speed={0} rotationIntensity={0} floatIntensity={0}>
          <AnimatedMannequin3D
            exercise={currentExercise}
            selectedMuscleKey={selectedMuscleId}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onProgressUpdate={onProgressUpdate}
          />
          <GymEquipmentProps
            position={currentExercise.position}
            exerciseId={currentExercise.id}
          />
        </Float>

        <ContactShadows position={[0, -0.32, 0]} opacity={0.7} scale={3.5} blur={2.0} far={2.5} />
      </Canvas>

      {/* Exercise Name Overlay */}
      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center justify-center pointer-events-none px-4">
        <h3 className="text-white text-base sm:text-lg md:text-xl font-black uppercase tracking-wider drop-shadow-md text-center">
          {currentExercise.nameEn}
        </h3>
        <p className="text-emerald-400 text-xs sm:text-sm font-bold tracking-wide">
          {currentExercise.name}
        </p>
      </div>
    </div>
  );
}
