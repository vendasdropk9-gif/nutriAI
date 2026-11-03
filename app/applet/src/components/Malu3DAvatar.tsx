import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface Malu3DAvatarProps {
  isSpeaking?: boolean;
  audioLevel?: number; // 0 to 1
  avatarUrl?: string;
  avatarStyle?: string;
  className?: string;
  size?: number | string;
}

function MaluHeadMesh({ isSpeaking, audioLevel = 0 }: { isSpeaking?: boolean; audioLevel?: number }) {
  const jawRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(time * 1.5) * 0.12;
      headRef.current.rotation.x = Math.cos(time * 2) * 0.06 + (isSpeaking ? Math.sin(time * 8) * 0.04 : 0);
    }
    if (jawRef.current) {
      const speakingFactor = isSpeaking ? (0.28 + Math.sin(time * 20) * 0.22 + audioLevel * 0.4) : 0;
      jawRef.current.rotation.x = THREE.MathUtils.lerp(jawRef.current.rotation.x, speakingFactor, 0.25);
    }
    if (leftEyeRef.current && rightEyeRef.current) {
      const pulse = 1 + (isSpeaking ? Math.sin(time * 14) * 0.08 : 0);
      leftEyeRef.current.scale.set(pulse, pulse, pulse);
      rightEyeRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group ref={headRef} position={[0, -0.15, 0]}>
      {/* Head Base */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshStandardMaterial
          color="#0f766e"
          roughness={0.22}
          metalness={0.85}
          emissive="#0d9488"
          emissiveIntensity={isSpeaking ? 0.35 : 0.12}
        />
      </mesh>

      {/* Holographic Face Visor */}
      <mesh position={[0, 0.35, 0.44]}>
        <planeGeometry args={[0.82, 0.62]} />
        <meshStandardMaterial
          color="#14b8a6"
          roughness={0.1}
          metalness={0.9}
          transparent
          opacity={0.88}
          emissive="#2dd4bf"
          emissiveIntensity={isSpeaking ? 0.45 : 0.2}
        />
      </mesh>

      {/* Glowing Eyes */}
      <mesh ref={leftEyeRef} position={[-0.2, 0.46, 0.7]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={isSpeaking ? '#38bdf8' : '#2dd4bf'} />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.2, 0.46, 0.7]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={isSpeaking ? '#38bdf8' : '#2dd4bf'} />
      </mesh>

      {/* Articulated Jaw for Speech Animation */}
      <group ref={jawRef} position={[0, 0.12, 0.48]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.32, isSpeaking ? 0.16 : 0.08, 0.1]} />
          <meshStandardMaterial
            color="#0f766e"
            roughness={0.3}
            metalness={0.7}
            emissive="#38bdf8"
            emissiveIntensity={isSpeaking ? 0.55 : 0.1}
          />
        </mesh>
      </group>

      {/* Neck & Shoulders */}
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.38, 0.55, 0.45, 32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  );
}

export function Malu3DAvatar({
  isSpeaking = false,
  audioLevel = 0,
  avatarUrl,
  avatarStyle,
  className = "w-32 h-32 sm:w-40 sm:h-40",
  size
}: Malu3DAvatarProps) {
  const isImageAvatar = avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:'));

  if (isImageAvatar) {
    return (
      <div className={`relative flex items-center justify-center rounded-full overflow-hidden ${className}`}>
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full border-4 border-cyan-400 animate-ping opacity-75 pointer-events-none" />
        )}
        <div className={`absolute inset-0 rounded-full border-2 ${isSpeaking ? 'border-cyan-400 shadow-[0_0_25px_rgba(56,189,248,0.6)]' : 'border-teal-500/40'} transition-all`} />
        <img
          src={avatarUrl}
          alt="Malu AI Avatar"
          className="w-full h-full object-cover rounded-full"
        />
        {isSpeaking && (
          <div className="absolute bottom-1 px-2 py-0.5 rounded-full bg-cyan-500/90 text-white text-[10px] font-bold tracking-wider uppercase animate-pulse shadow-lg">
            🔊 Aoede
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative rounded-full overflow-hidden bg-gradient-to-b from-slate-900 via-teal-950/40 to-slate-950 border border-teal-500/30 shadow-2xl flex items-center justify-center ${className}`} style={size ? { width: size, height: size } : undefined}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent pointer-events-none" />
      
      <Canvas camera={{ position: [0, 0, 2.0], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.3} />
        <pointLight position={[4, 4, 4]} intensity={2.2} color="#38bdf8" />
        <pointLight position={[-4, -4, -4]} intensity={1.2} color="#10b981" />
        <Float speed={2.5} rotationIntensity={0.15} floatIntensity={0.25}>
          <MaluHeadMesh isSpeaking={isSpeaking} audioLevel={audioLevel} />
        </Float>
      </Canvas>

      {isSpeaking && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-cyan-500/90 backdrop-blur-md text-white text-[9px] font-extrabold tracking-wider uppercase shadow-[0_0_12px_rgba(56,189,248,0.5)] flex items-center gap-1 z-10 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>Falando (Aoede)</span>
        </div>
      )}
    </div>
  );
}

export default Malu3DAvatar;
