import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, ShieldAlert } from 'lucide-react';

interface Avatar3DProps {
  activeMuscles: string[];
  animation?: 'idle' | 'executing' | 'tutorial' | 'wrong';
  view?: 'front' | 'side' | 'detail';
  playbackSpeed?: number;
}

function HumanoidModel({ activeMuscles, animation = 'idle', playbackSpeed = 1 }: Avatar3DProps) {
  const group = useRef<THREE.Group>(null);
  
  // Create a humanoid shape using basic geometries
  const segments = useMemo(() => {
    return [
      { name: 'head', pos: [0, 2, 0], scale: [0.4, 0.45, 0.4], muscle: 'none' },
      { name: 'neck', pos: [0, 1.75, 0], scale: [0.15, 0.15, 0.15], muscle: 'none' },
      { name: 'torso', pos: [0, 1.25, 0], scale: [0.7, 0.9, 0.35], muscle: 'chest' },
      { name: 'abs', pos: [0, 0.7, 0], scale: [0.6, 0.4, 0.3], muscle: 'abs' },
      { name: 'shoulder_l', pos: [-0.45, 1.5, 0], scale: [0.2, 0.2, 0.2], muscle: 'shoulders' },
      { name: 'shoulder_r', pos: [0.45, 1.5, 0], scale: [0.2, 0.2, 0.2], muscle: 'shoulders' },
      { name: 'arm_l', pos: [-0.65, 1.1, 0], scale: [0.15, 0.6, 0.15], muscle: 'arms' },
      { name: 'arm_r', pos: [0.65, 1.1, 0], scale: [0.15, 0.6, 0.15], muscle: 'arms' },
      { name: 'thigh_l', pos: [-0.25, 0.2, 0], scale: [0.25, 0.7, 0.25], muscle: 'legs' },
      { name: 'thigh_r', pos: [0.25, 0.2, 0], scale: [0.25, 0.7, 0.25], muscle: 'legs' },
      { name: 'leg_l', pos: [-0.25, -0.5, 0], scale: [0.2, 0.7, 0.2], muscle: 'legs' },
      { name: 'leg_r', pos: [0.25, -0.5, 0], scale: [0.2, 0.7, 0.2], muscle: 'legs' },
    ];
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    
    const time = state.clock.getElapsedTime() * playbackSpeed;
    
    if (animation === 'executing' || animation === 'tutorial') {
      const move = Math.sin(time * 3) * 0.3;
      group.current.position.y = move - 0.5;
      
      group.current.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          if (child.material.emissive.getHex() !== 0x000000) {
            child.material.emissiveIntensity = 2 + Math.sin(time * 10);
          }
        }
      });
    } else if (animation === 'wrong') {
      // Shaky, erratic movement for "wrong"
      const move = Math.sin(time * 12) * 0.1;
      group.current.position.y = move - 0.5;
      group.current.position.x = Math.sin(time * 20) * 0.05;
    } else {
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, -0.5, 0.1);
      group.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={group} position={[0, -0.5, 0]}>
      {segments.map((s, i) => (
        <mesh key={i} position={s.pos as any} scale={s.scale as any}>
          <boxGeometry />
          <primitive object={useMemo(() => {
            const isMuscleActive = (m: string) => activeMuscles.some(am => am.toLowerCase().includes(m));
            const active = isMuscleActive(s.muscle);
            return new THREE.MeshStandardMaterial({
              color: animation === 'wrong' && active ? '#ef4444' : (active ? '#10b981' : (s.muscle === 'none' ? '#e2e8f0' : '#475569')),
              emissive: animation === 'wrong' && active ? '#ef4444' : (active ? '#10b981' : '#000000'),
              emissiveIntensity: active ? 2 : 0,
              metalness: 0.6,
              roughness: 0.3,
            });
          }, [activeMuscles, s.muscle, animation])} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

export function Avatar3D({ activeMuscles, animation, view = 'front', playbackSpeed = 1 }: Avatar3DProps) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) return false;
        
        // Extended check: some environments return a context that is immediately lost
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (renderer && renderer.includes('Software')) return false; // Fail on software renderers
        }
        
        return true;
      } catch (e) {
        return false;
      }
    };
    
    setWebglAvailable(checkWebGL());
  }, []);

  const cameraPos = useMemo(() => {
    if (view === 'side') return [5, 1, 0] as [number, number, number];
    if (view === 'detail') return [0, 1, 2] as [number, number, number];
    return [0, 1, 5] as [number, number, number];
  }, [view]);

  if (webglAvailable === false) {
    return (
      <div className="w-full h-[400px] md:h-[600px] relative rounded-[40px] overflow-hidden bg-slate-900 flex flex-col items-center justify-center p-8 text-center border border-white/10 shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent" />
        
        <div className="relative z-10 w-full max-w-xs mx-auto mb-8">
          <svg viewBox="0 0 200 400" className="w-full h-auto drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            {/* Minimalist SVG Humanoid Fallback with active states */}
            {/* Head */}
            <circle cx="100" cy="40" r="25" fill="#e2e8f0" />
            {/* Torso */}
            <rect 
              x="70" y="75" width="60" height="100" rx="10" 
              fill={activeMuscles.some(m => m.toLowerCase().includes('chest') || m.toLowerCase().includes('back')) ? '#10b981' : '#e2e8f0'} 
              className={animation === 'executing' ? 'animate-pulse' : ''}
            />
            {/* Abs */}
            <rect 
              x="75" y="180" width="50" height="40" rx="5" 
              fill={activeMuscles.some(m => m.toLowerCase().includes('abs')) ? '#10b981' : '#e2e8f0'} 
            />
            {/* Arms */}
            <rect 
              x="35" y="80" width="25" height="110" rx="10" 
              fill={activeMuscles.some(m => m.toLowerCase().includes('arms') || m.toLowerCase().includes('shoulders')) ? '#10b981' : '#e2e8f0'} 
              transform={animation === 'executing' ? `rotate(${Math.sin(Date.now()/200)*10} 60 80)` : ''}
            />
            <rect 
              x="140" y="80" width="25" height="110" rx="10" 
              fill={activeMuscles.some(m => m.toLowerCase().includes('arms') || m.toLowerCase().includes('shoulders')) ? '#10b981' : '#e2e8f0'} 
              transform={animation === 'executing' ? `rotate(${-Math.sin(Date.now()/200)*10} 140 80)` : ''}
            />
            {/* Legs */}
            <rect 
              x="72" y="230" width="25" height="130" rx="10" 
              fill={activeMuscles.some(m => m.toLowerCase().includes('legs') || m.toLowerCase().includes('glutes')) ? '#10b981' : '#e2e8f0'} 
            />
            <rect 
              x="103" y="230" width="25" height="130" rx="10" 
              fill={activeMuscles.some(m => m.toLowerCase().includes('legs') || m.toLowerCase().includes('glutes')) ? '#10b981' : '#e2e8f0'} 
            />
          </svg>
        </div>

        <div className="relative z-10 space-y-3">
          <h3 className="text-xl font-serif font-bold text-white">Visualização NutriAI Ativa</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Detectando esforço e ativando grupos musculares em tempo real.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
             <ShieldAlert className="w-3 h-3 text-amber-500" />
             Modo de Compatibilidade Ativo
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] md:h-[600px] relative rounded-[40px] overflow-hidden bg-slate-950/5 dark:bg-slate-900/50">
      {webglAvailable === true && (
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={cameraPos} fov={40} />
          <OrbitControls enablePan={false} minDistance={2} maxDistance={7} minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 1.5} />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
          <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
          
          <Environment preset="city" />
          
          <Float speed={animation === 'idle' ? 2 : 0} rotationIntensity={0.5} floatIntensity={0.5}>
            <HumanoidModel activeMuscles={activeMuscles} animation={animation} playbackSpeed={playbackSpeed} />
          </Float>
          
          <ContactShadows 
            position={[0, -1.5, 0]} 
            opacity={0.4} 
            scale={10} 
            blur={1.5} 
            far={4} 
          />
        </Canvas>
      )}
      
      {!webglAvailable && <div className="absolute inset-0 bg-slate-900/10 animate-pulse" />}

      <div className="absolute bottom-6 left-6 right-6 flex justify-center gap-4 pointer-events-none">
        <div className="px-4 py-2 bg-emerald-500/20 backdrop-blur-md rounded-full border border-emerald-500/30 text-[10px] font-bold text-emerald-500 uppercase tracking-widest animate-pulse">
           Live 3D Body Rendering
        </div>
      </div>
    </div>
  );
}
