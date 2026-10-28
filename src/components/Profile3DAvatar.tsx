import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Sparkles, Trophy, Flame, Zap, RefreshCw, Award, Star } from 'lucide-react';
import { playSfx, vibrate } from '../lib/sensory';
import { getAvatarById } from '../data/avatarCatalog';

interface Profile3DAvatarProps {
  points?: number;
  streak?: number;
  level?: number;
  avatarId?: string;
  onAwardPoints?: (amount: number) => void;
}

// Particle explosion component when earning points or completing a goal
function CelebrationParticles({ active }: { active: boolean }) {
  const count = 60;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 0.5 + Math.random() * 1.5;
      const scale = 0.03 + Math.random() * 0.05;
      const color = new THREE.Color().setHSL(Math.random() * 0.2 + 0.1, 1, 0.6); // Gold / Emerald hues
      temp.push({
        position: new THREE.Vector3(0, 0.6, 0),
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed + 0.8,
          Math.cos(phi) * speed
        ),
        rotation: new THREE.Euler(Math.random(), Math.random(), Math.random()),
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
        // Reset particle on trigger
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
        p.velocity.y -= delta * 1.8; // Gravity

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

// Interactive 3D Avatar Body with Victory Micro-Animations
function AvatarModel({
  animationState,
  accentColor = '#10b981',
  skinColor = '#d4a373'
}: {
  animationState: 'idle' | 'spin' | 'celebrate' | 'jump';
  accentColor?: string;
  skinColor?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const matSkin = useMemo(() => new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.5, metalness: 0.1 }), [skinColor]);
  const matAccent = useMemo(() => new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.2, metalness: 0.6, emissive: accentColor, emissiveIntensity: 0.4 }), [accentColor]);
  const matBody = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4, metalness: 0.3 }), []);
  const matWhite = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.8, metalness: 0.0 }), []);

  // Micro-animation step loop
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    if (animationState === 'spin') {
      groupRef.current.rotation.y += delta * 8;
      groupRef.current.position.y = Math.sin(t * 10) * 0.1;

      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.z = 1.2;
        rightArmRef.current.rotation.z = -1.2;
      }
    } else if (animationState === 'celebrate') {
      // Victory pose: hands raised high in V-shape + torso pulse
      groupRef.current.rotation.y = Math.sin(t * 3) * 0.15;
      groupRef.current.position.y = Math.abs(Math.sin(t * 5)) * 0.12;

      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.z = 2.4 + Math.sin(t * 8) * 0.1;
        rightArmRef.current.rotation.z = -2.4 - Math.sin(t * 8) * 0.1;
        leftArmRef.current.rotation.x = Math.sin(t * 4) * 0.2;
        rightArmRef.current.rotation.x = Math.sin(t * 4) * 0.2;
      }
      if (headRef.current) {
        headRef.current.rotation.x = -0.2;
      }
    } else if (animationState === 'jump') {
      // Double jump bounce
      const jumpY = Math.abs(Math.sin(t * 8)) * 0.25;
      groupRef.current.position.y = jumpY;
      groupRef.current.rotation.y = Math.sin(t * 2) * 0.2;

      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.z = 1.5;
        rightArmRef.current.rotation.z = -1.5;
      }
    } else {
      // Idle natural posture with subtle breathing & slight swaying
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, 0.1);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, Math.sin(t * 0.8) * 0.15, 0.08);

      const breathe = Math.sin(t * 2) * 0.03;
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.15 + breathe, 0.1);
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.15 - breathe, 0.1);
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.1);
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
      }
      if (headRef.current) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, Math.sin(t * 1.2) * 0.04, 0.1);
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.4, 0]}>
      {/* Head */}
      <group ref={headRef} position={[0, 1.2, 0]}>
        <mesh material={matWhite} position={[0, 0, 0]}>
          <sphereGeometry args={[0.18, 24, 24]} />
        </mesh>
        {/* Futuristic visor line */}
        <mesh material={matAccent} position={[0, 0.02, 0.14]}>
          <boxGeometry args={[0.22, 0.04, 0.08]} />
        </mesh>
      </group>

      {/* Torso */}
      <mesh material={matBody} position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.18, 0.14, 0.6, 20]} />
      </mesh>

      {/* Chest Accent Plate */}
      <mesh material={matAccent} position={[0, 0.82, 0.08]}>
        <cylinderGeometry args={[0.1, 0.12, 0.22, 16]} />
      </mesh>

      {/* Left Arm Assembly */}
      <group ref={leftArmRef} position={[-0.24, 0.9, 0]}>
        <mesh material={matWhite} position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.05, 0.3, 12, 12]} />
        </mesh>
        <mesh material={matAccent} position={[0, 0, 0]}>
          <sphereGeometry args={[0.065, 16, 16]} />
        </mesh>
      </group>

      {/* Right Arm Assembly */}
      <group ref={rightArmRef} position={[0.24, 0.9, 0]}>
        <mesh material={matWhite} position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.05, 0.3, 12, 12]} />
        </mesh>
        <mesh material={matAccent} position={[0, 0, 0]}>
          <sphereGeometry args={[0.065, 16, 16]} />
        </mesh>
      </group>

      {/* Legs & Base */}
      <mesh material={matBody} position={[-0.1, 0.22, 0]}>
        <capsuleGeometry args={[0.065, 0.45, 12, 12]} />
      </mesh>
      <mesh material={matBody} position={[0.1, 0.22, 0]}>
        <capsuleGeometry args={[0.065, 0.45, 12, 12]} />
      </mesh>

      {/* Glowing Neon Ring Pedestal */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.48, 32]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export function Profile3DAvatar({
  points = 1250,
  streak = 7,
  level = 4,
  avatarId = 'cyberfit-biomechanic',
  onAwardPoints
}: Profile3DAvatarProps) {
  const [animState, setAnimState] = useState<'idle' | 'spin' | 'celebrate' | 'jump'>('idle');
  const [isParticleActive, setIsParticleActive] = useState(false);
  const [localPoints, setLocalPoints] = useState(points);
  const [showToast, setShowToast] = useState<string | null>(null);

  const avatarInfo = useMemo(() => getAvatarById(avatarId), [avatarId]);
  const accentColor = avatarInfo.modelConfig.accentColor || '#10b981';
  const skinColor = avatarInfo.modelConfig.skinColor || '#d4a373';

  // React to prop points increases
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
    setLocalPoints(prev => prev + earned);
    if (onAwardPoints) onAwardPoints(earned);
    triggerCelebration('+50 Pontos Conquistados!');
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

  return (
    <div className="w-full clay-card p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 text-white rounded-3xl border border-emerald-500/20 shadow-2xl relative overflow-hidden flex flex-col items-center">
      {/* Background Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="w-full flex items-center justify-between mb-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Avatar 3D Interativo
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Level {level}
              </span>
            </h3>
            <p className="text-xs text-slate-400">Arraste para girar • Reage a conquistas & metas</p>
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

      {/* Toast Overlay Notification */}
      {showToast && (
        <div className="absolute top-16 z-30 animate-in fade-in zoom-in slide-in-from-top-4 duration-300 bg-emerald-500 text-slate-950 px-4 py-1.5 rounded-full text-xs font-extrabold shadow-lg shadow-emerald-500/30 flex items-center gap-1.5">
          <Zap className="w-4 h-4 fill-slate-950" />
          <span>{showToast}</span>
        </div>
      )}

      {/* 3D Canvas Container */}
      <div className="w-full h-[280px] sm:h-[320px] relative rounded-2xl overflow-hidden bg-slate-950/60 border border-slate-800 shadow-inner cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [0, 0.4, 2.6], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 2]} intensity={1.2} />
          <directionalLight position={[-3, -2, -2]} intensity={0.4} color="#38bdf8" />
          <pointLight position={[0, 1, 1]} intensity={0.8} color={accentColor} />

          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
            <AvatarModel animationState={animState} accentColor={accentColor} skinColor={skinColor} />
          </Float>

          <CelebrationParticles active={isParticleActive} />

          <ContactShadows position={[0, -0.6, 0]} opacity={0.6} scale={2} blur={1.5} far={1} />
          <OrbitControls enableZoom={false} maxPolarAngle={Math.PI / 1.8} minPolarAngle={Math.PI / 3} />
        </Canvas>

        {/* Floating Hint */}
        <div className="absolute bottom-2 left-2 right-2 text-center pointer-events-none">
          <span className="text-[10px] bg-slate-900/80 text-slate-400 px-3 py-1 rounded-full border border-slate-800 backdrop-blur-xs">
            ✨ Clique nas ações para ativar micro-animações 3D
          </span>
        </div>
      </div>

      {/* Interactive Micro-Animation Buttons */}
      <div className="w-full grid grid-cols-3 gap-2 mt-4 z-10">
        <button
          type="button"
          onClick={handleManualAwardPoints}
          className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Award className="w-4 h-4" />
          <span>+50 Pontos</span>
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
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Celebrar</span>
        </button>
      </div>
    </div>
  );
}
