import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import avatarGlobalStore, { useAvatarGlobalState } from '../lib/avatarGlobalState';

export interface AvatarFaceProps {
  /** Physical exertion effort level (0 to 1) */
  effort?: number;
  /** Motivational smile blend shape weight (0 to 1) */
  motivationalSmile?: number;
  /** Direct flag indicating active positive feedback / celebratory state */
  positiveFeedback?: boolean;
  /** Whether the avatar animation is currently running */
  isPlaying?: boolean;
  /** Playback speed multiplier */
  playbackSpeed?: number;
}

/**
 * Creates a parametric TubeGeometry equipped with Three.js GPU Morph Targets (Blend Shapes)
 * for seamless interpolation between Neutral, Effort (athletic exhalation), and Motivational Smile.
 */
function createMorphableLipsGeometry(): {
  geometry: THREE.BufferGeometry;
  baseCurve: THREE.CatmullRomCurve3;
} {
  // 5 Key control points along the lips from left corner to right corner
  const neutralPoints = [
    new THREE.Vector3(-0.028, 0.0, 0.0),
    new THREE.Vector3(-0.013, 0.0022, 0.002),
    new THREE.Vector3(0.0, 0.0016, 0.003),
    new THREE.Vector3(0.013, 0.0022, 0.002),
    new THREE.Vector3(0.028, 0.0, 0.0),
  ];

  // Morph Target 1: Physical Exertion (Mouth parts into an athletic exhalation oval)
  const effortPoints = [
    new THREE.Vector3(-0.029, -0.0025, -0.001),
    new THREE.Vector3(-0.014, 0.0045, 0.001),
    new THREE.Vector3(0.0, 0.0035, 0.002),
    new THREE.Vector3(0.014, 0.0045, 0.001),
    new THREE.Vector3(0.029, -0.0025, -0.001),
  ];

  // Morph Target 2: Motivational Smile (Zygomaticus major contraction: corners lift & curve upward into an encouraging smile)
  const smilePoints = [
    new THREE.Vector3(-0.0305, 0.0075, 0.002), // Left corner lifts +7.5mm and pulls slightly back
    new THREE.Vector3(-0.0135, -0.0008, 0.0028),
    new THREE.Vector3(0.0, -0.0022, 0.0038), // Lowered center creates friendly crescent parted smile
    new THREE.Vector3(0.0135, -0.0008, 0.0028),
    new THREE.Vector3(0.0305, 0.0075, 0.002), // Right corner lifts +7.5mm
  ];

  const baseCurve = new THREE.CatmullRomCurve3(neutralPoints);
  const effortCurve = new THREE.CatmullRomCurve3(effortPoints);
  const smileCurve = new THREE.CatmullRomCurve3(smilePoints);

  const tubularSegments = 24;
  const radius = 0.0026;
  const radialSegments = 10;

  const baseGeom = new THREE.TubeGeometry(baseCurve, tubularSegments, radius, radialSegments, false);
  const effortGeom = new THREE.TubeGeometry(effortCurve, tubularSegments, radius, radialSegments, false);
  const smileGeom = new THREE.TubeGeometry(smileCurve, tubularSegments, radius * 1.08, radialSegments, false);

  const basePos = baseGeom.attributes.position.array as Float32Array;
  const effortPos = effortGeom.attributes.position.array as Float32Array;
  const smilePos = smileGeom.attributes.position.array as Float32Array;

  // Compute position deltas for Three.js morph target attributes
  const effortDelta = new Float32Array(basePos.length);
  const smileDelta = new Float32Array(basePos.length);

  for (let i = 0; i < basePos.length; i++) {
    effortDelta[i] = effortPos[i] - basePos[i];
    smileDelta[i] = smilePos[i] - basePos[i];
  }

  // Attach GPU Morph Targets to the BufferGeometry
  baseGeom.morphAttributes.position = [
    new THREE.Float32BufferAttribute(effortDelta, 3),
    new THREE.Float32BufferAttribute(smileDelta, 3),
  ];

  return { geometry: baseGeom, baseCurve };
}

/**
 * AvatarFace
 * High-fidelity, stylized athletic facial expression system with native GPU blend shapes.
 * Seamlessly morphs between physical exertion (effort, furrowed brows, breathing oval)
 * and motivational smiles (uplifted mouth corners, Duchenne eye crinkles, celebratory nod)
 * during positive feedback and workout milestones.
 */
export function AvatarFace({
  effort = 0.1,
  motivationalSmile = 0.0,
  positiveFeedback = false,
  isPlaying = true,
  playbackSpeed = 1,
}: AvatarFaceProps) {
  const globalState = useAvatarGlobalState();

  // Root face group for subtle head gestures (affirmative nod on feedback)
  const faceRigRef = useRef<THREE.Group>(null);

  // Eyelids and eyes
  const leftEyelidUpperRef = useRef<THREE.Mesh>(null);
  const rightEyelidUpperRef = useRef<THREE.Mesh>(null);
  const leftEyelidLowerRef = useRef<THREE.Mesh>(null);
  const rightEyelidLowerRef = useRef<THREE.Mesh>(null);
  const leftPupilRef = useRef<THREE.Mesh>(null);
  const rightPupilRef = useRef<THREE.Mesh>(null);

  // Brows
  const leftBrowRef = useRef<THREE.Group>(null);
  const rightBrowRef = useRef<THREE.Group>(null);

  // Morphable lips mesh and dynamic oral cavity
  const morphLipsMeshRef = useRef<THREE.Mesh>(null);
  const oralCavityRef = useRef<THREE.Mesh>(null);

  // Damped blend shape weights for 60 FPS organic transitions
  const currentEffortWeightRef = useRef(effort);
  const currentSmileWeightRef = useRef(motivationalSmile);
  const nodPhaseRef = useRef(0);

  // PBR materials tailored for anatomical atlas fidelity
  const materials = useMemo(() => {
    return {
      featureMat: new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.45,
        metalness: 0.15,
      }),
      scleraMat: new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.35,
        metalness: 0.05,
      }),
      pupilMat: new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.18,
        metalness: 0.35,
      }),
      // Highlight gleam that sparkles during positive feedback / smile
      pupilSparkleMat: new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0284c7',
        emissiveIntensity: 0.45,
        roughness: 0.1,
        metalness: 0.5,
      }),
      oralCavityMat: new THREE.MeshBasicMaterial({
        color: '#0b1120',
      }),
    };
  }, []);

  // Pre-compiled morphable lips geometry with GPU morph targets
  const { geometry: morphLipsGeometry } = useMemo(() => createMorphableLipsGeometry(), []);

  // Sculpted eyeball geometry
  const eyeGeom = useMemo(() => {
    const sclera = new THREE.SphereGeometry(0.0125, 22, 18);
    sclera.scale(1.22, 0.74, 0.76);
    return sclera;
  }, []);

  const pupilGeom = useMemo(() => {
    const pupil = new THREE.SphereGeometry(0.0055, 18, 14);
    pupil.scale(1.0, 1.0, 0.4);
    return pupil;
  }, []);

  // Dynamic eyelids (upper for squinting, lower for Duchenne smile crinkle)
  const upperEyelidGeom = useMemo(() => {
    const lid = new THREE.CylinderGeometry(0.0135, 0.0135, 0.0035, 18);
    lid.scale(1.25, 1.0, 0.65);
    return lid;
  }, []);

  const lowerEyelidGeom = useMemo(() => {
    const lid = new THREE.CylinderGeometry(0.0132, 0.0132, 0.0028, 18);
    lid.scale(1.22, 1.0, 0.62);
    return lid;
  }, []);

  // Athletic sculpted eyebrow arch
  const browGeom = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.023, -0.002, 0),
      new THREE.Vector3(-0.009, 0.0042, 0.002),
      new THREE.Vector3(0.012, 0.0012, 0.001),
      new THREE.Vector3(0.024, -0.0052, -0.002),
    ]);
    return new THREE.TubeGeometry(curve, 20, 0.0024, 10, false);
  }, []);

  // Trigger affirmative nod gesture whenever positive feedback begins
  const prevPositiveFeedbackRef = useRef(false);
  useEffect(() => {
    const isPositive = positiveFeedback || globalState.positiveFeedback || motivationalSmile > 0.5;
    if (isPositive && !prevPositiveFeedbackRef.current) {
      nodPhaseRef.current = Math.PI; // Triggers smooth nod curve
    }
    prevPositiveFeedbackRef.current = isPositive;
  }, [positiveFeedback, globalState.positiveFeedback, motivationalSmile]);

  // Dynamic frame loop blending blend shapes smoothly at 60 FPS
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime() * (isPlaying ? playbackSpeed : 0);

    // Target weights from props or global reactive state
    const isFeedbackActive = Boolean(
      positiveFeedback ||
      globalState.positiveFeedback ||
      motivationalSmile > 0.2 ||
      globalState.motivationalSmile > 0.2
    );

    // 1. Target Smile Blend Shape Weight
    const targetSmile = isFeedbackActive
      ? Math.max(motivationalSmile, globalState.motivationalSmile || 1.0)
      : 0.05; // Gentle friendly athletic baseline

    // 2. Target Effort Blend Shape Weight
    // During positive feedback, physical strain relaxes smoothly into celebratory pride
    const repPhase = Math.sin(time * 2.2);
    const naturalEffort = isPlaying
      ? Math.max(0.05, THREE.MathUtils.clamp(effort + (repPhase > 0 ? repPhase * 0.45 : 0), 0, 1))
      : 0.05;
    const targetEffort = isFeedbackActive ? naturalEffort * 0.25 : naturalEffort;

    // Smooth second-order exponential damping (smooth cross-fade over ~350ms)
    currentSmileWeightRef.current = THREE.MathUtils.damp(
      currentSmileWeightRef.current,
      targetSmile,
      5.2,
      delta
    );
    currentEffortWeightRef.current = THREE.MathUtils.damp(
      currentEffortWeightRef.current,
      targetEffort,
      6.0,
      delta
    );

    const smileW = currentSmileWeightRef.current;
    const effortW = currentEffortWeightRef.current;

    // Apply GPU Morph Target Influences to Morphable Lips Mesh
    if (morphLipsMeshRef.current && morphLipsMeshRef.current.morphTargetInfluences) {
      // index 0 = effort, index 1 = smile
      morphLipsMeshRef.current.morphTargetInfluences[0] = effortW;
      morphLipsMeshRef.current.morphTargetInfluences[1] = smileW;
    }

    // Dynamic Oral Cavity Depth & Aperture
    if (oralCavityRef.current) {
      // In effort, aperture expands vertically (exhalation)
      // In smile, aperture expands in an encouraging crescent smile
      const mouthScaleY = THREE.MathUtils.lerp(
        0.12,
        1.45,
        effortW * (1.0 - smileW * 0.7) + smileW * 0.65
      );
      const mouthScaleX = THREE.MathUtils.lerp(1.0, 1.14, smileW) - effortW * 0.08;
      oralCavityRef.current.scale.set(mouthScaleX, mouthScaleY, 1.0);
      oralCavityRef.current.position.y = THREE.MathUtils.lerp(0.0, 0.002, smileW);
    }

    // Eyes: Eyelid squint in effort vs. Duchenne eye crinkle in smile
    if (leftEyelidUpperRef.current && rightEyelidUpperRef.current) {
      // Upper lid lowers in effort; softens in smile
      const upperDrop = -effortW * 0.0034 + smileW * 0.0012;
      leftEyelidUpperRef.current.position.y = 0.006 + upperDrop;
      rightEyelidUpperRef.current.position.y = 0.006 + upperDrop;
    }

    if (leftEyelidLowerRef.current && rightEyelidLowerRef.current) {
      // Lower lid elevates in smile (Duchenne eye crinkle)
      const lowerLift = smileW * 0.0026;
      leftEyelidLowerRef.current.position.y = -0.006 + lowerLift;
      rightEyelidLowerRef.current.position.y = -0.006 + lowerLift;
    }

    // Eyebrows: Furrow inward/downward in effort vs. Arch and lift warmly in smile
    if (leftBrowRef.current && rightBrowRef.current) {
      const furrowAngle = effortW * 0.18 - smileW * 0.07;
      const browLiftY = 0.038 - effortW * 0.0028 + smileW * 0.0038;

      leftBrowRef.current.rotation.z = furrowAngle;
      rightBrowRef.current.rotation.z = -furrowAngle;
      leftBrowRef.current.position.y = browLiftY;
      rightBrowRef.current.position.y = browLiftY;
    }

    // Pupils: Eye sparkle gleam enhances in positive feedback
    if (leftPupilRef.current && rightPupilRef.current) {
      const sparkleScale = 1.0 + smileW * 0.18;
      leftPupilRef.current.scale.set(sparkleScale, sparkleScale, 1.0);
      rightPupilRef.current.scale.set(sparkleScale, sparkleScale, 1.0);
    }

    // Affirmative Head Nod Gesture on Emotional Reward
    if (faceRigRef.current) {
      if (nodPhaseRef.current > 0.01) {
        nodPhaseRef.current = THREE.MathUtils.damp(nodPhaseRef.current, 0, 3.8, delta);
        // Nod down and smooth rebound
        const nodAngle = Math.sin(nodPhaseRef.current) * -0.045;
        faceRigRef.current.rotation.x = nodAngle;
      } else {
        faceRigRef.current.rotation.x = THREE.MathUtils.damp(
          faceRigRef.current.rotation.x,
          0,
          8.0,
          delta
        );
      }
    }
  });

  return (
    <group ref={faceRigRef} position={[0, 0.12, 0.015]}>
      {/* =================================================================== */}
      {/* 1. LEFT EYE & ORBIT (Anatomically anchored on cranial dome)          */}
      {/* =================================================================== */}
      <group position={[-0.038, 0.018, 0.134]} rotation={[0.02, -0.06, 0]}>
        <mesh geometry={eyeGeom} material={materials.scleraMat} />
        {/* Dynamic Pupil / Iris */}
        <mesh
          ref={leftPupilRef}
          geometry={pupilGeom}
          material={materials.pupilMat}
          position={[0, 0, 0.0065]}
        />
        {/* Upper eyelid: closes down during physical effort */}
        <mesh
          ref={leftEyelidUpperRef}
          geometry={upperEyelidGeom}
          material={materials.featureMat}
          position={[0, 0.006, 0.005]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        {/* Lower eyelid: lifts up during motivational smile (Duchenne crinkle) */}
        <mesh
          ref={leftEyelidLowerRef}
          geometry={lowerEyelidGeom}
          material={materials.featureMat}
          position={[0, -0.006, 0.005]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </group>

      {/* =================================================================== */}
      {/* 2. RIGHT EYE & ORBIT                                               */}
      {/* =================================================================== */}
      <group position={[0.038, 0.018, 0.134]} rotation={[0.02, 0.06, 0]}>
        <mesh geometry={eyeGeom} material={materials.scleraMat} />
        <mesh
          ref={rightPupilRef}
          geometry={pupilGeom}
          material={materials.pupilMat}
          position={[0, 0, 0.0065]}
        />
        {/* Upper eyelid */}
        <mesh
          ref={rightEyelidUpperRef}
          geometry={upperEyelidGeom}
          material={materials.featureMat}
          position={[0, 0.006, 0.005]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        {/* Lower eyelid */}
        <mesh
          ref={rightEyelidLowerRef}
          geometry={lowerEyelidGeom}
          material={materials.featureMat}
          position={[0, -0.006, 0.005]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </group>

      {/* =================================================================== */}
      {/* 3. SCULPTED ATHLETIC EYEBROWS (Furrow vs. Motivational Arch)        */}
      {/* =================================================================== */}
      <group ref={leftBrowRef} position={[-0.038, 0.038, 0.138]}>
        <mesh geometry={browGeom} material={materials.featureMat} scale={[-1, 1, 1]} />
      </group>
      <group ref={rightBrowRef} position={[0.038, 0.038, 0.138]}>
        <mesh geometry={browGeom} material={materials.featureMat} />
      </group>

      {/* =================================================================== */}
      {/* 4. BLEND SHAPES LIPS & MOUTH (Effort Exhale vs. Motivational Smile) */}
      {/* =================================================================== */}
      <group position={[0, -0.052, 0.118]}>
        {/* Oral Depth Cavity */}
        <mesh
          ref={oralCavityRef}
          geometry={upperEyelidGeom}
          material={materials.oralCavityMat}
          position={[0, 0, -0.002]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1.0, 0.15, 1.0]}
        />
        {/* Native GPU Morph Target Mesh: effortlessly morphs between Neutral, Effort and Smile */}
        <mesh
          ref={morphLipsMeshRef}
          geometry={morphLipsGeometry}
          material={materials.featureMat}
        />
      </group>
    </group>
  );
}
export default AvatarFace;
