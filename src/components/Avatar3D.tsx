import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { ShieldAlert } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';

interface Avatar3DProps {
  activeMuscles: string[];
  animation?: 'idle' | 'executing' | 'tutorial' | 'wrong' | 'perfect';
  view?: 'front' | 'side' | 'detail';
  playbackSpeed?: number;
}

// Camera controller that smoothly transitions to target view
function CameraController({ view }: { view: 'front' | 'side' | 'detail' }) {
  const { camera } = useThree();
  const targetPos = useMemo(() => {
    if (view === 'side') return new THREE.Vector3(3.6, 0.85, 0);
    if (view === 'detail') return new THREE.Vector3(0, 1.15, 1.85);
    return new THREE.Vector3(0, 0.85, 3.6);
  }, [view]);

  useFrame(() => {
    camera.position.lerp(targetPos, 0.08);
    camera.lookAt(0, 0.85, 0);
  });

  return null;
}

// Anatomical Muscle Segment Component
interface MuscleMeshProps {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  muscleType: string;
  activeMuscles: string[];
  animation?: string;
  pulseSpeed?: number;
  colorOverride?: string;
  isJoint?: boolean;
}

function MusclePart({
  geometry,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  muscleType,
  activeMuscles,
  animation = 'idle',
  colorOverride,
  isJoint = false,
}: MuscleMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const isMuscleActive = useMemo(() => {
    if (muscleType === 'none') return false;
    const lower = muscleType.toLowerCase();
    return activeMuscles.some(am => {
      const a = am.toLowerCase();
      if (lower === 'chest' && (a.includes('peit') || a.includes('chest') || a.includes('peitoral'))) return true;
      if (lower === 'abs' && (a.includes('abs') || a.includes('abd') || a.includes('core') || a.includes('obliq'))) return true;
      if (lower === 'back' && (a.includes('costas') || a.includes('back') || a.includes('lombar') || a.includes('lats') || a.includes('trape'))) return true;
      if (lower === 'shoulders' && (a.includes('ombro') || a.includes('should') || a.includes('delto'))) return true;
      if (lower === 'arms' && (a.includes('braç') || a.includes('arm') || a.includes('bic') || a.includes('tric') || a.includes('antebraço'))) return true;
      if (lower === 'legs' && (a.includes('pern') || a.includes('leg') || a.includes('quad') || a.includes('glut') || a.includes('pant') || a.includes('isquiot'))) return true;
      if (lower === 'glutes' && (a.includes('glut') || a.includes('glute') || a.includes('quad'))) return true;
      if (lower === 'calves' && (a.includes('pant') || a.includes('gêm') || a.includes('calf') || a.includes('pern'))) return true;
      return a.includes(lower);
    });
  }, [muscleType, activeMuscles]);

  const mat = useMemo(() => {
    if (isJoint) {
      return new THREE.MeshStandardMaterial({
        color: '#334155',
        metalness: 0.8,
        roughness: 0.25,
        wireframe: false,
      });
    }

    if (colorOverride) {
      return new THREE.MeshStandardMaterial({
        color: colorOverride,
        metalness: 0.4,
        roughness: 0.3,
      });
    }

    const isWrong = animation === 'wrong';
    const isPerfect = animation === 'perfect';

    return new THREE.MeshStandardMaterial({
      color: isMuscleActive 
        ? (isWrong ? '#ef4444' : isPerfect ? '#10b981' : '#059669') 
        : (muscleType === 'none' ? '#cbd5e1' : '#1e293b'),
      emissive: isMuscleActive 
        ? (isWrong ? '#dc2626' : isPerfect ? '#34d399' : '#10b981') 
        : '#000000',
      emissiveIntensity: isMuscleActive ? (isPerfect ? 3.0 : 1.8) : 0,
      metalness: isMuscleActive ? 0.2 : 0.4,
      roughness: isMuscleActive ? 0.25 : 0.35,
    });
  }, [isMuscleActive, animation, colorOverride, isJoint, muscleType]);

  useFrame((state) => {
    if (!meshRef.current) return;
    if (isMuscleActive && meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      const t = state.clock.getElapsedTime();
      const pulse = Math.sin(t * (animation === 'perfect' ? 8 : 4)) * 0.4 + 1.4;
      meshRef.current.material.emissiveIntensity = animation === 'wrong' ? 2.5 : pulse;
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

// Realistic Anatomical Humanoid Model with smooth athletic curves & joints
function RealisticHumanoidModel({ activeMuscles, animation = 'idle', playbackSpeed = 1 }: Avatar3DProps) {
  const rootGroup = useRef<THREE.Group>(null);
  const spineGroup = useRef<THREE.Group>(null);
  const leftArmGroup = useRef<THREE.Group>(null);
  const rightArmGroup = useRef<THREE.Group>(null);
  const leftElbowGroup = useRef<THREE.Group>(null);
  const rightElbowGroup = useRef<THREE.Group>(null);
  const leftLegGroup = useRef<THREE.Group>(null);
  const rightLegGroup = useRef<THREE.Group>(null);
  const leftKneeGroup = useRef<THREE.Group>(null);
  const rightKneeGroup = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);

  // Shared reusable smooth geometries for high performance & realistic contours
  const geo = useMemo(() => {
    return {
      head: new THREE.SphereGeometry(0.2, 32, 32),
      jaw: new THREE.CylinderGeometry(0.12, 0.08, 0.12, 24),
      visor: new THREE.TorusGeometry(0.17, 0.03, 16, 32, Math.PI),
      neck: new THREE.CylinderGeometry(0.09, 0.12, 0.18, 24),
      clavicle: new THREE.CapsuleGeometry(0.04, 0.45, 12, 16),
      pectoral: new THREE.CapsuleGeometry(0.08, 0.16, 16, 16),
      upperRibs: new THREE.CapsuleGeometry(0.15, 0.28, 16, 16),
      lat: new THREE.CapsuleGeometry(0.07, 0.22, 16, 16),
      abUpper: new THREE.CapsuleGeometry(0.05, 0.1, 12, 12),
      abMid: new THREE.CapsuleGeometry(0.05, 0.09, 12, 12),
      abLower: new THREE.CapsuleGeometry(0.05, 0.08, 12, 12),
      oblique: new THREE.CapsuleGeometry(0.055, 0.18, 12, 12),
      pelvis: new THREE.CapsuleGeometry(0.13, 0.22, 16, 16),
      glute: new THREE.SphereGeometry(0.12, 24, 24),
      deltoid: new THREE.SphereGeometry(0.1, 24, 24),
      bicep: new THREE.CapsuleGeometry(0.065, 0.22, 16, 16),
      tricep: new THREE.CapsuleGeometry(0.06, 0.2, 16, 16),
      jointSphere: new THREE.SphereGeometry(0.06, 16, 16),
      forearm: new THREE.CapsuleGeometry(0.055, 0.22, 16, 16),
      hand: new THREE.CapsuleGeometry(0.045, 0.1, 12, 12),
      quadMain: new THREE.CapsuleGeometry(0.095, 0.35, 16, 16),
      quadTear: new THREE.CapsuleGeometry(0.06, 0.15, 12, 12),
      hamstring: new THREE.CapsuleGeometry(0.075, 0.32, 16, 16),
      patella: new THREE.SphereGeometry(0.045, 16, 16),
      calf: new THREE.CapsuleGeometry(0.075, 0.3, 16, 16),
      shin: new THREE.CapsuleGeometry(0.05, 0.28, 12, 12),
      shoe: new THREE.CapsuleGeometry(0.06, 0.2, 16, 16),
      shoeSole: new THREE.BoxGeometry(0.13, 0.03, 0.26),
    };
  }, []);

  // Detect exercise category to trigger natural biomechanical movements
  const exerciseType = useMemo(() => {
    const list = activeMuscles.map(m => m.toLowerCase()).join(' ');
    if (list.includes('quad') || list.includes('perna') || list.includes('glúteo') || list.includes('leg')) return 'squat';
    if (list.includes('peit') || list.includes('chest') || list.includes('tríc')) return 'pushup';
    if (list.includes('abs') || list.includes('abd') || list.includes('core') || list.includes('oblíq')) return 'crunch';
    if (list.includes('cardio') || list.includes('polichinelo') || list.includes('burpee')) return 'jumpingjack';
    if (list.includes('braç') || list.includes('bic')) return 'curl';
    return 'general';
  }, [activeMuscles]);

  // Biomechanical animation frame update
  useFrame((state) => {
    if (!rootGroup.current) return;
    const time = state.clock.getElapsedTime() * playbackSpeed;

    const isRunningExercise = animation === 'executing' || animation === 'tutorial' || animation === 'perfect';

    if (isRunningExercise) {
      if (exerciseType === 'squat') {
        // Realistic athletic squat cycle (hips hinge, knees bend, arms raise forward for counter-balance)
        const squatCycle = (Math.sin(time * 2.5) + 1) / 2; // 0 to 1
        const depth = squatCycle * 0.45;
        
        rootGroup.current.position.y = -depth;
        if (spineGroup.current) spineGroup.current.rotation.x = squatCycle * 0.35;
        
        // Thighs hinge back & knees flex
        if (leftLegGroup.current) leftLegGroup.current.rotation.x = -squatCycle * 0.9;
        if (rightLegGroup.current) rightLegGroup.current.rotation.x = -squatCycle * 0.9;
        if (leftKneeGroup.current) leftKneeGroup.current.rotation.x = squatCycle * 1.25;
        if (rightKneeGroup.current) rightKneeGroup.current.rotation.x = squatCycle * 1.25;

        // Arms reach forward
        if (leftArmGroup.current) leftArmGroup.current.rotation.x = squatCycle * 1.1;
        if (rightArmGroup.current) rightArmGroup.current.rotation.x = squatCycle * 1.1;
      } else if (exerciseType === 'pushup') {
        // Dynamic pushup / press motion
        const pushCycle = (Math.sin(time * 3) + 1) / 2;
        if (spineGroup.current) spineGroup.current.rotation.x = 0.05;
        
        if (leftArmGroup.current) {
          leftArmGroup.current.rotation.x = 0.8 + pushCycle * 0.4;
          leftArmGroup.current.rotation.z = -0.35 - pushCycle * 0.2;
        }
        if (rightArmGroup.current) {
          rightArmGroup.current.rotation.x = 0.8 + pushCycle * 0.4;
          rightArmGroup.current.rotation.z = 0.35 + pushCycle * 0.2;
        }
        if (leftElbowGroup.current) leftElbowGroup.current.rotation.x = -pushCycle * 0.9;
        if (rightElbowGroup.current) rightElbowGroup.current.rotation.x = -pushCycle * 0.9;
      } else if (exerciseType === 'jumpingjack') {
        // Jumping jack cycle
        const jackCycle = Math.abs(Math.sin(time * 4.5));
        rootGroup.current.position.y = jackCycle * 0.12;

        if (leftArmGroup.current) leftArmGroup.current.rotation.z = jackCycle * 2.1;
        if (rightArmGroup.current) rightArmGroup.current.rotation.z = -jackCycle * 2.1;

        if (leftLegGroup.current) leftLegGroup.current.rotation.z = -jackCycle * 0.4;
        if (rightLegGroup.current) rightLegGroup.current.rotation.z = jackCycle * 0.4;
      } else if (exerciseType === 'crunch') {
        // Abdominal crunch
        const crunchCycle = (Math.sin(time * 3) + 1) / 2;
        if (spineGroup.current) spineGroup.current.rotation.x = crunchCycle * 0.45;
        if (headGroup.current) headGroup.current.rotation.x = crunchCycle * 0.25;
      } else if (exerciseType === 'curl') {
        // Bicep curls
        const curlCycle = (Math.sin(time * 3) + 1) / 2;
        if (leftArmGroup.current) leftArmGroup.current.rotation.x = 0.2;
        if (rightArmGroup.current) rightArmGroup.current.rotation.x = 0.2;
        if (leftElbowGroup.current) leftElbowGroup.current.rotation.x = curlCycle * 1.5;
        if (rightElbowGroup.current) rightElbowGroup.current.rotation.x = curlCycle * 1.5;
      } else {
        // General cadence
        const bob = Math.sin(time * 3) * 0.06;
        rootGroup.current.position.y = bob;
        if (leftArmGroup.current) leftArmGroup.current.rotation.x = Math.sin(time * 3) * 0.3;
        if (rightArmGroup.current) rightArmGroup.current.rotation.x = -Math.sin(time * 3) * 0.3;
      }
    } else if (animation === 'wrong') {
      // Erratic posture shake to visually indicate error
      const wobble = Math.sin(time * 15) * 0.06;
      rootGroup.current.position.x = wobble;
      if (spineGroup.current) spineGroup.current.rotation.z = wobble * 1.5;
      if (leftArmGroup.current) leftArmGroup.current.rotation.z = 0.2 + wobble;
      if (rightArmGroup.current) rightArmGroup.current.rotation.z = -0.2 - wobble;
    } else {
      // Natural idle stance with subtle diaphragmatic chest expansion & weight shifting
      const breathe = Math.sin(time * 1.6) * 0.02;
      rootGroup.current.position.y = THREE.MathUtils.lerp(rootGroup.current.position.y, 0, 0.05);
      rootGroup.current.rotation.y = Math.sin(time * 0.5) * 0.08;

      if (spineGroup.current) {
        spineGroup.current.scale.set(1 + breathe * 0.5, 1, 1 + breathe * 0.8);
        spineGroup.current.rotation.x = 0;
      }
      if (leftArmGroup.current) {
        leftArmGroup.current.rotation.z = 0.08 + Math.sin(time * 1.6) * 0.02;
        leftArmGroup.current.rotation.x = 0;
      }
      if (rightArmGroup.current) {
        rightArmGroup.current.rotation.z = -0.08 - Math.sin(time * 1.6) * 0.02;
        rightArmGroup.current.rotation.x = 0;
      }
      if (leftLegGroup.current) leftLegGroup.current.rotation.set(0, 0, -0.02);
      if (rightLegGroup.current) rightLegGroup.current.rotation.set(0, 0, 0.02);
      if (leftKneeGroup.current) leftKneeGroup.current.rotation.x = 0;
      if (rightKneeGroup.current) rightKneeGroup.current.rotation.x = 0;
      if (headGroup.current) headGroup.current.rotation.y = Math.sin(time * 0.8) * 0.05;
    }
  });

  return (
    <group ref={rootGroup} position={[0, 0, 0]}>
      {/* Upper Torso & Head (Attached to Spine for Natural Flexion) */}
      <group ref={spineGroup} position={[0, 0.8, 0]}>
        {/* Head & Neck */}
        <group ref={headGroup} position={[0, 0.85, 0]}>
          {/* Cranium Sphere */}
          <MusclePart
            geometry={geo.head}
            position={[0, 0.12, 0]}
            scale={[0.88, 1.05, 0.95]}
            muscleType="none"
            activeMuscles={activeMuscles}
            animation={animation}
            colorOverride="#e2e8f0"
          />
          {/* Athletic Jawline */}
          <MusclePart
            geometry={geo.jaw}
            position={[0, -0.02, 0.04]}
            scale={[0.9, 0.8, 1.1]}
            muscleType="none"
            activeMuscles={activeMuscles}
            animation={animation}
            colorOverride="#cbd5e1"
          />
          {/* Futuristic Visor Accent */}
          <mesh geometry={geo.visor} position={[0, 0.12, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={2.0}
              roughness={0.1}
              metalness={0.9}
            />
          </mesh>
          {/* Cervical Neck */}
          <MusclePart
            geometry={geo.neck}
            position={[0, -0.14, -0.01]}
            scale={[1, 1, 0.95]}
            muscleType="none"
            activeMuscles={activeMuscles}
            animation={animation}
            colorOverride="#94a3b8"
          />
        </group>

        {/* Clavicles & Trapezius Slope */}
        <MusclePart
          geometry={geo.clavicle}
          position={[0, 0.65, 0.02]}
          rotation={[0, 0, Math.PI / 2]}
          scale={[1, 1.1, 0.9]}
          muscleType="back"
          activeMuscles={activeMuscles}
          animation={animation}
        />

        {/* Upper Ribcage & Chest Shelf */}
        <MusclePart
          geometry={geo.upperRibs}
          position={[0, 0.46, -0.02]}
          scale={[1.1, 0.95, 0.85]}
          muscleType="chest"
          activeMuscles={activeMuscles}
          animation={animation}
        />

        {/* Left & Right Pectorals (Chest Plates) */}
        <MusclePart
          geometry={geo.pectoral}
          position={[-0.14, 0.5, 0.1]}
          rotation={[0.1, -0.15, -0.2]}
          scale={[1.05, 1, 0.8]}
          muscleType="chest"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        <MusclePart
          geometry={geo.pectoral}
          position={[0.14, 0.5, 0.1]}
          rotation={[0.1, 0.15, 0.2]}
          scale={[1.05, 1, 0.8]}
          muscleType="chest"
          activeMuscles={activeMuscles}
          animation={animation}
        />

        {/* Latissimus Dorsi (Lats / Back Wings) */}
        <MusclePart
          geometry={geo.lat}
          position={[-0.24, 0.44, -0.06]}
          rotation={[0, 0, -0.35]}
          scale={[1, 1.1, 0.9]}
          muscleType="back"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        <MusclePart
          geometry={geo.lat}
          position={[0.24, 0.44, -0.06]}
          rotation={[0, 0, 0.35]}
          scale={[1, 1.1, 0.9]}
          muscleType="back"
          activeMuscles={activeMuscles}
          animation={animation}
        />

        {/* Six-Pack Core / Rectus Abdominis */}
        {/* Upper Abs */}
        <MusclePart
          geometry={geo.abUpper}
          position={[-0.065, 0.32, 0.08]}
          rotation={[0, 0, 0]}
          muscleType="abs"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        <MusclePart
          geometry={geo.abUpper}
          position={[0.065, 0.32, 0.08]}
          rotation={[0, 0, 0]}
          muscleType="abs"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        {/* Mid Abs */}
        <MusclePart
          geometry={geo.abMid}
          position={[-0.06, 0.21, 0.075]}
          rotation={[0, 0, 0]}
          muscleType="abs"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        <MusclePart
          geometry={geo.abMid}
          position={[0.06, 0.21, 0.075]}
          rotation={[0, 0, 0]}
          muscleType="abs"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        {/* Lower Abs */}
        <MusclePart
          geometry={geo.abLower}
          position={[-0.055, 0.11, 0.065]}
          rotation={[0, 0, 0]}
          muscleType="abs"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        <MusclePart
          geometry={geo.abLower}
          position={[0.055, 0.11, 0.065]}
          rotation={[0, 0, 0]}
          muscleType="abs"
          activeMuscles={activeMuscles}
          animation={animation}
        />

        {/* External Obliques (Waist Flanks) */}
        <MusclePart
          geometry={geo.oblique}
          position={[-0.17, 0.22, 0.02]}
          rotation={[0, 0, -0.15]}
          muscleType="abs"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        <MusclePart
          geometry={geo.oblique}
          position={[0.17, 0.22, 0.02]}
          rotation={[0, 0, 0.15]}
          muscleType="abs"
          activeMuscles={activeMuscles}
          animation={animation}
        />

        {/* --- LEFT ARM ASSEMBLY --- */}
        <group ref={leftArmGroup} position={[-0.34, 0.62, 0]}>
          {/* Left Deltoid Cap */}
          <MusclePart
            geometry={geo.deltoid}
            position={[0, 0, 0]}
            scale={[1.1, 1.25, 1.1]}
            muscleType="shoulders"
            activeMuscles={activeMuscles}
            animation={animation}
          />
          {/* Left Upper Arm (Biceps & Triceps) */}
          <MusclePart
            geometry={geo.bicep}
            position={[-0.02, -0.18, 0.02]}
            rotation={[0, 0, 0.05]}
            scale={[1, 1, 0.9]}
            muscleType="arms"
            activeMuscles={activeMuscles}
            animation={animation}
          />
          <MusclePart
            geometry={geo.tricep}
            position={[-0.01, -0.18, -0.03]}
            rotation={[0, 0, 0.05]}
            scale={[1, 1, 0.85]}
            muscleType="arms"
            activeMuscles={activeMuscles}
            animation={animation}
          />

          {/* Left Forearm & Hand Pivot */}
          <group ref={leftElbowGroup} position={[-0.03, -0.34, 0]}>
            <MusclePart
              geometry={geo.jointSphere}
              position={[0, 0, 0]}
              muscleType="none"
              activeMuscles={activeMuscles}
              isJoint={true}
            />
            {/* Left Forearm */}
            <MusclePart
              geometry={geo.forearm}
              position={[0, -0.15, 0.01]}
              scale={[1.1, 1, 0.9]}
              muscleType="arms"
              activeMuscles={activeMuscles}
              animation={animation}
            />
            {/* Left Hand */}
            <MusclePart
              geometry={geo.hand}
              position={[0, -0.32, 0.02]}
              scale={[0.9, 1, 0.6]}
              muscleType="none"
              activeMuscles={activeMuscles}
              colorOverride="#475569"
            />
          </group>
        </group>

        {/* --- RIGHT ARM ASSEMBLY --- */}
        <group ref={rightArmGroup} position={[0.34, 0.62, 0]}>
          {/* Right Deltoid Cap */}
          <MusclePart
            geometry={geo.deltoid}
            position={[0, 0, 0]}
            scale={[1.1, 1.25, 1.1]}
            muscleType="shoulders"
            activeMuscles={activeMuscles}
            animation={animation}
          />
          {/* Right Upper Arm */}
          <MusclePart
            geometry={geo.bicep}
            position={[0.02, -0.18, 0.02]}
            rotation={[0, 0, -0.05]}
            scale={[1, 1, 0.9]}
            muscleType="arms"
            activeMuscles={activeMuscles}
            animation={animation}
          />
          <MusclePart
            geometry={geo.tricep}
            position={[0.01, -0.18, -0.03]}
            rotation={[0, 0, -0.05]}
            scale={[1, 1, 0.85]}
            muscleType="arms"
            activeMuscles={activeMuscles}
            animation={animation}
          />

          {/* Right Forearm & Hand Pivot */}
          <group ref={rightElbowGroup} position={[0.03, -0.34, 0]}>
            <MusclePart
              geometry={geo.jointSphere}
              position={[0, 0, 0]}
              muscleType="none"
              activeMuscles={activeMuscles}
              isJoint={true}
            />
            {/* Right Forearm */}
            <MusclePart
              geometry={geo.forearm}
              position={[0, -0.15, 0.01]}
              scale={[1.1, 1, 0.9]}
              muscleType="arms"
              activeMuscles={activeMuscles}
              animation={animation}
            />
            {/* Right Hand */}
            <MusclePart
              geometry={geo.hand}
              position={[0, -0.32, 0.02]}
              scale={[0.9, 1, 0.6]}
              muscleType="none"
              activeMuscles={activeMuscles}
              colorOverride="#475569"
            />
          </group>
        </group>
      </group>

      {/* Pelvis & Glutes */}
      <group position={[0, 0.72, 0]}>
        <MusclePart
          geometry={geo.pelvis}
          position={[0, 0, -0.01]}
          rotation={[0, 0, Math.PI / 2]}
          scale={[0.95, 1.2, 0.9]}
          muscleType="glutes"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        {/* Left & Right Gluteus Maximus */}
        <MusclePart
          geometry={geo.glute}
          position={[-0.11, -0.04, -0.09]}
          scale={[1.1, 1.15, 1.2]}
          muscleType="glutes"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        <MusclePart
          geometry={geo.glute}
          position={[0.11, -0.04, -0.09]}
          scale={[1.1, 1.15, 1.2]}
          muscleType="glutes"
          activeMuscles={activeMuscles}
          animation={animation}
        />
      </group>

      {/* --- LEFT LEG ASSEMBLY --- */}
      <group ref={leftLegGroup} position={[-0.15, 0.62, 0]}>
        {/* Left Upper Thigh / Quadriceps & Hamstring */}
        <MusclePart
          geometry={geo.quadMain}
          position={[0, -0.24, 0.02]}
          scale={[1.05, 1, 1.05]}
          muscleType="legs"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        {/* Vastus Medialis (Teardrop inner quad) */}
        <MusclePart
          geometry={geo.quadTear}
          position={[0.04, -0.32, 0.06]}
          rotation={[0, 0, -0.15]}
          muscleType="legs"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        {/* Hamstring */}
        <MusclePart
          geometry={geo.hamstring}
          position={[0, -0.24, -0.06]}
          scale={[1, 1, 0.95]}
          muscleType="legs"
          activeMuscles={activeMuscles}
          animation={animation}
        />

        {/* Left Knee & Lower Leg Pivot */}
        <group ref={leftKneeGroup} position={[0, -0.48, 0]}>
          {/* Patellar Knee Cap */}
          <MusclePart
            geometry={geo.patella}
            position={[0, 0, 0.06]}
            muscleType="none"
            activeMuscles={activeMuscles}
            isJoint={true}
          />
          {/* Calf (Gastrocnemius Bellies) */}
          <MusclePart
            geometry={geo.calf}
            position={[0, -0.2, -0.03]}
            scale={[1.15, 1, 1.2]}
            muscleType="calves"
            activeMuscles={activeMuscles}
            animation={animation}
          />
          {/* Anterior Tibialis (Shin) */}
          <MusclePart
            geometry={geo.shin}
            position={[0, -0.2, 0.03]}
            scale={[0.85, 1, 0.8]}
            muscleType="calves"
            activeMuscles={activeMuscles}
            animation={animation}
          />

          {/* Left Athletic Training Shoe */}
          <group position={[0, -0.42, 0.06]}>
            <mesh geometry={geo.shoe} position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.2, 0.8]}>
              <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.3} />
            </mesh>
            <mesh geometry={geo.shoeSole} position={[0, 0, 0.02]}>
              <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.6} roughness={0.3} />
            </mesh>
          </group>
        </group>
      </group>

      {/* --- RIGHT LEG ASSEMBLY --- */}
      <group ref={rightLegGroup} position={[0.15, 0.62, 0]}>
        {/* Right Upper Thigh */}
        <MusclePart
          geometry={geo.quadMain}
          position={[0, -0.24, 0.02]}
          scale={[1.05, 1, 1.05]}
          muscleType="legs"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        {/* Vastus Medialis (Teardrop) */}
        <MusclePart
          geometry={geo.quadTear}
          position={[-0.04, -0.32, 0.06]}
          rotation={[0, 0, 0.15]}
          muscleType="legs"
          activeMuscles={activeMuscles}
          animation={animation}
        />
        {/* Hamstring */}
        <MusclePart
          geometry={geo.hamstring}
          position={[0, -0.24, -0.06]}
          scale={[1, 1, 0.95]}
          muscleType="legs"
          activeMuscles={activeMuscles}
          animation={animation}
        />

        {/* Right Knee & Lower Leg Pivot */}
        <group ref={rightKneeGroup} position={[0, -0.48, 0]}>
          {/* Patellar Knee Cap */}
          <MusclePart
            geometry={geo.patella}
            position={[0, 0, 0.06]}
            muscleType="none"
            activeMuscles={activeMuscles}
            isJoint={true}
          />
          {/* Calf */}
          <MusclePart
            geometry={geo.calf}
            position={[0, -0.2, -0.03]}
            scale={[1.15, 1, 1.2]}
            muscleType="calves"
            activeMuscles={activeMuscles}
            animation={animation}
          />
          {/* Shin */}
          <MusclePart
            geometry={geo.shin}
            position={[0, -0.2, 0.03]}
            scale={[0.85, 1, 0.8]}
            muscleType="calves"
            activeMuscles={activeMuscles}
            animation={animation}
          />

          {/* Right Athletic Training Shoe */}
          <group position={[0, -0.42, 0.06]}>
            <mesh geometry={geo.shoe} position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.2, 0.8]}>
              <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.3} />
            </mesh>
            <mesh geometry={geo.shoeSole} position={[0, 0, 0.02]}>
              <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.6} roughness={0.3} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

// Sleek Circular Studio Pedestal with futuristic floor ring
function StudioStage() {
  return (
    <group position={[0, -0.32, 0]}>
      {/* Concentric Neon Energy Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.7, 0.74, 64]} />
        <meshBasicMaterial color="#10b981" opacity={0.6} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.05, 1.07, 64]} />
        <meshBasicMaterial color="#38bdf8" opacity={0.3} transparent />
      </mesh>
      {/* Studio Pedestal Disc */}
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[1.2, 1.25, 0.08, 48]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.35}
          metalness={0.7}
        />
      </mesh>
    </group>
  );
}

export function Avatar3D({ activeMuscles, animation = 'idle', view = 'front', playbackSpeed = 1 }: Avatar3DProps) {
  const [webglAvailable, setWebglAvailable] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return false;
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (renderer && renderer.includes('Software')) return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    const handleContextLoss = (e: any) => {
      e.preventDefault();
      setWebglAvailable(false);
    };

    const handleWindowError = (e: ErrorEvent) => {
      if (e.message && e.message.includes('WebGL context')) {
        setWebglAvailable(false);
      }
    };

    window.addEventListener('webglcontextlost', handleContextLoss);
    window.addEventListener('error', handleWindowError);

    return () => {
      window.removeEventListener('webglcontextlost', handleContextLoss);
      window.removeEventListener('error', handleWindowError);
    };
  }, []);

  const Fallback2D = (
    <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center">
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent" />
      <div className="relative z-10 w-full max-w-[220px] mx-auto mb-4">
        <svg viewBox="0 0 200 400" className="w-full h-auto drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <circle cx="100" cy="40" r="24" fill="#334155" />
          <rect x="72" y="76" width="56" height="96" rx="14" fill="#1e293b" />
          <rect x="36" y="80" width="26" height="110" rx="12" fill="#1e293b" />
          <rect x="138" y="80" width="26" height="110" rx="12" fill="#1e293b" />
          <rect x="74" y="185" width="22" height="150" rx="10" fill="#10b981" />
          <rect x="104" y="185" width="22" height="150" rx="10" fill="#10b981" />
        </svg>
      </div>
      <div className="relative z-10 space-y-2">
        <h3 className="text-lg font-serif font-bold text-white">Visualização Ativa NutriAI</h3>
        <p className="text-slate-400 text-xs max-w-xs mx-auto">
          Músculos em destaque acompanham os movimentos da sessão.
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          Modo 2D Compatível
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-[460px] sm:h-[520px] md:h-[620px] relative rounded-[32px] sm:rounded-[40px] overflow-hidden bg-gradient-to-b from-[#0b1322] via-[#09111c] to-[#040810] shadow-2xl border border-emerald-500/20 flex items-center justify-center">
      <ErrorBoundary fallback={Fallback2D}>
        {webglAvailable ? (
          <Canvas
            shadows
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true, failIfMajorPerformanceCaveat: false }}
            className="w-full h-full"
            onCreated={({ gl }) => {
              gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                setWebglAvailable(false);
              });
            }}
          >
            <PerspectiveCamera makeDefault position={[0, 0.85, 3.6]} fov={38} />
            <CameraController view={view} />

            <OrbitControls
              enablePan={false}
              target={[0, 0.85, 0]}
              minDistance={2.0}
              maxDistance={5.5}
              minPolarAngle={Math.PI / 5}
              maxPolarAngle={Math.PI / 1.8}
              dampingFactor={0.08}
              enableDamping
            />

            {/* Studio 3-Point Lighting */}
            <ambientLight intensity={0.8} />
            {/* Key Light */}
            <directionalLight position={[4, 5, 4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
            {/* Rim / Silhouette Light */}
            <directionalLight position={[-4, 4, -3]} intensity={3.0} color="#34d399" />
            {/* Fill Light */}
            <pointLight position={[0, 1, 3]} intensity={0.9} color="#e0f2fe" />

            <Float speed={animation === 'idle' ? 1.5 : 0} rotationIntensity={0.2} floatIntensity={0.25}>
              <RealisticHumanoidModel
                activeMuscles={activeMuscles}
                animation={animation}
                playbackSpeed={playbackSpeed}
              />
            </Float>

            <StudioStage />

            <ContactShadows
              position={[0, -0.31, 0]}
              opacity={0.65}
              scale={3.8}
              blur={2.0}
              far={3.0}
            />
          </Canvas>
        ) : (
          Fallback2D
        )}
      </ErrorBoundary>

      {/* Floating Status Pill */}
      <div className="absolute bottom-5 left-0 right-0 flex justify-center pointer-events-none z-10 px-4">
        <div className="px-3.5 py-1.5 bg-slate-950/80 backdrop-blur-md rounded-full border border-emerald-500/30 text-[10px] sm:text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Biomechanical 3D Model</span>
        </div>
      </div>
    </div>
  );
}
