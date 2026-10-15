import * as THREE from 'three';
import { DetailedExercise, EXERCISE_DATABASE } from '../data/exerciseDatabase';

export type ExerciseArchetype =
  | 'squat'
  | 'bench_press'
  | 'incline_bench_press'
  | 'push_up'
  | 'lunge'
  | 'deadlift_rdl'
  | 'bicep_curl'
  | 'tricep_pushdown'
  | 'tricep_overhead'
  | 'tricep_dips'
  | 'shoulder_press'
  | 'lateral_raise'
  | 'front_raise'
  | 'reverse_fly'
  | 'lat_pulldown'
  | 'pull_up'
  | 'row'
  | 'hip_thrust'
  | 'calf_raise'
  | 'crunch_abs'
  | 'plank'
  | 'jumping_jacks'
  | 'running_cardio'
  | 'generic_dynamic';

export interface RigJointAngles {
  rootPosition: [number, number, number];
  rootRotation: [number, number, number];
  spinePosition: [number, number, number];
  spineRotation: [number, number, number];
  chestScale: [number, number, number];
  neckRotation: [number, number, number];
  headRotation: [number, number, number];
  leftShoulderRotation: [number, number, number];
  rightShoulderRotation: [number, number, number];
  leftElbowRotation: [number, number, number];
  rightElbowRotation: [number, number, number];
  leftWristRotation: [number, number, number];
  rightWristRotation: [number, number, number];
  leftHipPosition: [number, number, number];
  rightHipPosition: [number, number, number];
  leftHipRotation: [number, number, number];
  rightHipRotation: [number, number, number];
  leftKneeRotation: [number, number, number];
  rightKneeRotation: [number, number, number];
  leftAnkleRotation: [number, number, number];
  rightAnkleRotation: [number, number, number];
}

export interface ExerciseKinematicProfile {
  archetype: ExerciseArchetype;
  basePosture: 'standing' | 'seated' | 'lying' | 'incline' | 'prone' | 'plank';
  benchType: 'none' | 'flat' | 'incline';
  equipmentType: 'dumbbells' | 'barbell' | 'cable' | 'bodyweight' | 'none';
  primaryMuscleTags: string[];
  secondaryMuscleTags: string[];
  calculateRig: (cycle: number, time: number, isPlaying: boolean, playbackSpeed: number) => RigJointAngles;
}

/**
 * Normalizes text for robust multi-language semantic matching
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Intelligently classifies any exercise name, ID, or prompt into a high-fidelity biomechanical archetype
 */
export function classifyExerciseArchetype(nameOrId: string, category?: string): ExerciseArchetype {
  const norm = normalizeString(nameOrId);
  const cat = category ? normalizeString(category) : '';

  // 1. Agachamentos (Squats)
  if (
    norm.includes('agach') ||
    norm.includes('squat') ||
    norm.includes('sumo') ||
    norm.includes('hack') ||
    (norm.includes('perna') && norm.includes('profund'))
  ) {
    return 'squat';
  }

  // 2. Supino (Bench Press) & Variações
  if (norm.includes('supino') || norm.includes('bench press') || norm.includes('chest press')) {
    if (norm.includes('inclinad') || norm.includes('incline')) return 'incline_bench_press';
    return 'bench_press';
  }

  // 3. Flexão de Braço (Push Up)
  if (norm.includes('flexao') || norm.includes('push up') || norm.includes('apoio') || norm.includes('flexoes')) {
    return 'push_up';
  }

  // 4. Afundo, Passada & Avanço (Lunges)
  if (norm.includes('afundo') || norm.includes('lunge') || norm.includes('passada') || norm.includes('avanco')) {
    return 'lunge';
  }

  // 5. Stiff, Deadlift & Terra
  if (
    norm.includes('stiff') ||
    norm.includes('deadlift') ||
    norm.includes('terra') ||
    norm.includes('romanian') ||
    norm.includes('rdl')
  ) {
    return 'deadlift_rdl';
  }

  // 6. Elevação Pélvica & Glute Bridge / Hip Thrust
  if (
    norm.includes('pelvic') ||
    norm.includes('ponte') ||
    norm.includes('hip thrust') ||
    norm.includes('glute bridge') ||
    norm.includes('elevacao de quadril')
  ) {
    return 'hip_thrust';
  }

  // 7. Prancha (Plank)
  if (norm.includes('prancha') || norm.includes('plank')) {
    return 'plank';
  }

  // 8. Abdominais & Crunch
  if (
    norm.includes('abdominal') ||
    norm.includes('crunch') ||
    norm.includes('remador') ||
    norm.includes('bicicleta') ||
    norm.includes('sit up') ||
    norm.includes('infra') ||
    norm.includes('supra')
  ) {
    return 'crunch_abs';
  }

  // 9. Panturrilha (Calf Raises)
  if (
    norm.includes('panturrilha') ||
    norm.includes('gemeos') ||
    norm.includes('calf') ||
    norm.includes('soleo')
  ) {
    return 'calf_raise';
  }

  // 10. Desenvolvimento de Ombros (Shoulder Press)
  if (
    norm.includes('desenvolvimento') ||
    norm.includes('shoulder press') ||
    norm.includes('arnold') ||
    norm.includes('militar') ||
    norm.includes('overhead press')
  ) {
    return 'shoulder_press';
  }

  // 11. Elevações de Ombros (Lateral & Frontal)
  if (norm.includes('elevacao lateral') || norm.includes('lateral raise') || norm.includes('abducao de ombro')) {
    return 'lateral_raise';
  }
  if (norm.includes('elevacao frontal') || norm.includes('front raise')) {
    return 'front_raise';
  }
  if (norm.includes('crucifixo invertido') || norm.includes('reverse fly')) {
    return 'reverse_fly';
  }

  // 12. Bíceps (Curls)
  if (
    norm.includes('rosca') ||
    norm.includes('curl') ||
    norm.includes('biceps') ||
    cat === 'biceps'
  ) {
    return 'bicep_curl';
  }

  // 13. Tríceps (Extensions, Dips, Pushdowns)
  if (norm.includes('mergulho') || norm.includes('dips')) {
    return 'tricep_dips';
  }
  if (norm.includes('frances') || norm.includes('overhead tricep') || norm.includes('testa') || norm.includes('skull')) {
    return 'tricep_overhead';
  }
  if (norm.includes('triceps') || norm.includes('pulley') || norm.includes('corda') || norm.includes('pushdown') || cat === 'triceps') {
    return 'tricep_pushdown';
  }

  // 14. Costas: Puxadas (Lat Pulldown / Pull up) & Remadas (Rows)
  if (norm.includes('puxada') || norm.includes('pulldown') || norm.includes('barra fixa') || norm.includes('pull up')) {
    return 'lat_pulldown';
  }
  if (norm.includes('remada') || norm.includes('row') || norm.includes('serrote') || norm.includes('cavalinho') || cat === 'back') {
    return 'row';
  }

  // 15. Cardio & Calistenia Dinâmica
  if (norm.includes('polichinelo') || norm.includes('jumping jack') || norm.includes('burpee')) {
    return 'jumping_jacks';
  }
  if (norm.includes('corrida') || norm.includes('esteira') || norm.includes('treadmill') || norm.includes('trote')) {
    return 'running_cardio';
  }

  // Fallback baseado na categoria anatômica
  if (cat === 'legs' || cat === 'glutes') return 'squat';
  if (cat === 'chest') return 'bench_press';
  if (cat === 'shoulders') return 'lateral_raise';
  if (cat === 'core') return 'crunch_abs';

  return 'generic_dynamic';
}

/**
 * Builds the kinematic profile with exact mathematical curves for the selected archetype
 */
export function getKinematicProfileForArchetype(
  archetype: ExerciseArchetype,
  overridePosition?: 'seated' | 'standing' | 'lying' | 'incline',
  overrideEquipment?: 'dumbbells' | 'barbell' | 'cable' | 'bodyweight' | 'none'
): ExerciseKinematicProfile {
  switch (archetype) {
    case 'squat': {
      return {
        archetype,
        basePosture: 'standing',
        benchType: 'none',
        equipmentType: overrideEquipment || 'barbell',
        primaryMuscleTags: ['quad', 'glute'],
        secondaryMuscleTags: ['hamstring', 'calf', 'abs'],
        calculateRig: (cycle) => {
          // cycle: 0 = top lockout, 1 = bottom 90° deep parallel squat
          const depth = cycle;
          return {
            rootPosition: [0, 0.35 - depth * 0.32, -depth * 0.12],
            rootRotation: [0, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [depth * 0.44, 0, 0], // Torso hinges forward 25° maintaining flat lumbar
            chestScale: [1.0 + depth * 0.05, 1.0, 1.0 + depth * 0.04],
            neckRotation: [-depth * 0.28, 0, 0], // Head stays neutral looking forward
            headRotation: [-depth * 0.12, 0, 0],
            leftShoulderRotation: [1.1 - depth * 0.2, 0.25, 0.45], // Arms holding barbell / balanced forward
            rightShoulderRotation: [1.1 - depth * 0.2, -0.25, -0.45],
            leftElbowRotation: [-0.9 - depth * 0.25, 0, 0],
            rightElbowRotation: [-0.9 - depth * 0.25, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0],
            rightHipPosition: [0.13, 0.38, 0],
            leftHipRotation: [-depth * 1.35, 0, -0.12], // Deep 75° hip flexion with slight abduction
            rightHipRotation: [-depth * 1.35, 0, 0.12],
            leftKneeRotation: [depth * 1.68, 0, 0], // Knees flex forward to ~96° tracking toes
            rightKneeRotation: [depth * 1.68, 0, 0],
            leftAnkleRotation: [-depth * 0.35, 0, 0],
            rightAnkleRotation: [-depth * 0.35, 0, 0],
          };
        },
      };
    }

    case 'bench_press': {
      return {
        archetype,
        basePosture: 'lying',
        benchType: 'flat',
        equipmentType: overrideEquipment || 'barbell',
        primaryMuscleTags: ['chest'],
        secondaryMuscleTags: ['tricep', 'deltoid_anterior'],
        calculateRig: (cycle) => {
          // cycle: 0 = top bar lockout, 1 = bar at lower chest touching sternum
          const pressDepth = cycle;
          return {
            rootPosition: [0, 0.38, -0.32],
            rootRotation: [Math.PI / 2, 0, 0], // Horizontal supine on bench
            spinePosition: [0, 0.52, 0],
            spineRotation: [-0.08, 0, 0], // Thoracic arch
            chestScale: [1.0 + (1 - pressDepth) * 0.08, 1.0, 1.0 + (1 - pressDepth) * 0.08],
            neckRotation: [0, 0, 0],
            headRotation: [0, 0, 0],
            leftShoulderRotation: [1.22 - pressDepth * 0.38, 0, 0.42 + pressDepth * 0.45],
            rightShoulderRotation: [1.22 - pressDepth * 0.38, 0, -0.42 - pressDepth * 0.45],
            leftElbowRotation: [-pressDepth * 1.48, 0, 0], // Elbows flare to 90° under load
            rightElbowRotation: [-pressDepth * 1.48, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0],
            rightHipPosition: [0.13, 0.38, 0],
            leftHipRotation: [-1.25, 0, -0.16], // Feet firmly planted on floor alongside bench
            rightHipRotation: [-1.25, 0, 0.16],
            leftKneeRotation: [1.38, 0, 0],
            rightKneeRotation: [1.38, 0, 0],
            leftAnkleRotation: [0, 0, 0],
            rightAnkleRotation: [0, 0, 0],
          };
        },
      };
    }

    case 'incline_bench_press': {
      return {
        archetype,
        basePosture: 'incline',
        benchType: 'incline',
        equipmentType: overrideEquipment || 'dumbbells',
        primaryMuscleTags: ['chest', 'deltoid_anterior'],
        secondaryMuscleTags: ['tricep'],
        calculateRig: (cycle) => {
          const press = cycle;
          return {
            rootPosition: [0, 0.28, -0.16],
            rootRotation: [Math.PI / 4, 0, 0], // 45° incline on bench
            spinePosition: [0, 0.52, 0],
            spineRotation: [0, 0, 0],
            chestScale: [1.0 + (1 - press) * 0.06, 1.0, 1.0 + (1 - press) * 0.06],
            neckRotation: [0, 0, 0],
            headRotation: [0, 0, 0],
            leftShoulderRotation: [1.15 - press * 0.4, 0, 0.5 + press * 0.4],
            rightShoulderRotation: [1.15 - press * 0.4, 0, -0.5 - press * 0.4],
            leftElbowRotation: [-press * 1.45, 0, 0],
            rightElbowRotation: [-press * 1.45, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0],
            rightHipPosition: [0.13, 0.38, 0],
            leftHipRotation: [-1.4, 0, -0.12],
            rightHipRotation: [-1.4, 0, 0.12],
            leftKneeRotation: [1.45, 0, 0],
            rightKneeRotation: [1.45, 0, 0],
            leftAnkleRotation: [0, 0, 0],
            rightAnkleRotation: [0, 0, 0],
          };
        },
      };
    }

    case 'push_up': {
      return {
        archetype,
        basePosture: 'plank',
        benchType: 'none',
        equipmentType: 'bodyweight',
        primaryMuscleTags: ['chest', 'tricep'],
        secondaryMuscleTags: ['deltoid_anterior', 'abs'],
        calculateRig: (cycle) => {
          const pushDepth = cycle;
          return {
            rootPosition: [0, 0.12 - pushDepth * 0.20, -0.25],
            rootRotation: [-Math.PI / 2.05, Math.PI, 0], // Prone body alignment parallel to ground
            spinePosition: [0, 0.52, 0],
            spineRotation: [0, 0, 0], // Rigid neutral core
            chestScale: [1.0 + pushDepth * 0.06, 1.0, 1.0],
            neckRotation: [0.15, 0, 0],
            headRotation: [0.1, 0, 0],
            leftShoulderRotation: [1.2 - pushDepth * 0.35, 0, 0.45],
            rightShoulderRotation: [1.2 - pushDepth * 0.35, 0, -0.45],
            leftElbowRotation: [-pushDepth * 1.5, 0, 0],
            rightElbowRotation: [-pushDepth * 1.5, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0],
            rightHipPosition: [0.13, 0.38, 0],
            leftHipRotation: [0.08, 0, -0.04],
            rightHipRotation: [0.08, 0, 0.04],
            leftKneeRotation: [0, 0, 0],
            rightKneeRotation: [0, 0, 0],
            leftAnkleRotation: [0.25, 0, 0],
            rightAnkleRotation: [0.25, 0, 0],
          };
        },
      };
    }

    case 'lunge': {
      return {
        archetype,
        basePosture: 'standing',
        benchType: 'none',
        equipmentType: overrideEquipment || 'dumbbells',
        primaryMuscleTags: ['quad', 'glute'],
        secondaryMuscleTags: ['hamstring', 'calf'],
        calculateRig: (cycle) => {
          const lunge = cycle;
          return {
            rootPosition: [0, 0.35 - lunge * 0.28, 0],
            rootRotation: [0, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [lunge * 0.08, 0, 0],
            chestScale: [1, 1, 1],
            neckRotation: [0, 0, 0],
            headRotation: [0, 0, 0],
            leftShoulderRotation: [0.1, 0, 0.08],
            rightShoulderRotation: [0.1, 0, -0.08],
            leftElbowRotation: [-0.15, 0, 0],
            rightElbowRotation: [-0.15, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0],
            rightHipPosition: [0.13, 0.38, 0],
            leftHipRotation: [-lunge * 1.35, 0, -0.05], // Front leg step forward 90°
            rightHipRotation: [lunge * 0.72, 0, 0.05], // Rear leg extension
            leftKneeRotation: [lunge * 1.55, 0, 0], // Front knee flexes 90°
            rightKneeRotation: [lunge * 1.55, 0, 0], // Rear knee descends near floor
            leftAnkleRotation: [-lunge * 0.2, 0, 0],
            rightAnkleRotation: [lunge * 0.45, 0, 0],
          };
        },
      };
    }

    case 'deadlift_rdl': {
      return {
        archetype,
        basePosture: 'standing',
        benchType: 'none',
        equipmentType: overrideEquipment || 'barbell',
        primaryMuscleTags: ['hamstring', 'glute', 'back'],
        secondaryMuscleTags: ['abs', 'forearm'],
        calculateRig: (cycle) => {
          const hinge = cycle;
          return {
            rootPosition: [0, 0.35 - hinge * 0.12, -hinge * 0.22], // Hips shift backward
            rootRotation: [0, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [hinge * 0.98, 0, 0], // Torso hinges forward 60°
            chestScale: [1, 1, 1],
            neckRotation: [-hinge * 0.65, 0, 0], // Cervical spine aligns with torso
            headRotation: [-hinge * 0.3, 0, 0],
            leftShoulderRotation: [-hinge * 0.9, 0, 0.1], // Arms hang straight down under gravity
            rightShoulderRotation: [-hinge * 0.9, 0, -0.1],
            leftElbowRotation: [0, 0, 0],
            rightElbowRotation: [0, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0],
            rightHipPosition: [0.13, 0.38, 0],
            leftHipRotation: [-hinge * 0.32, 0, -0.06],
            rightHipRotation: [-hinge * 0.32, 0, 0.06],
            leftKneeRotation: [hinge * 0.35, 0, 0], // Soft 20° knee hinge
            rightKneeRotation: [hinge * 0.35, 0, 0],
            leftAnkleRotation: [0, 0, 0],
            rightAnkleRotation: [0, 0, 0],
          };
        },
      };
    }

    case 'bicep_curl': {
      return {
        archetype,
        basePosture: overridePosition === 'seated' ? 'seated' : 'standing',
        benchType: overridePosition === 'seated' ? 'flat' : 'none',
        equipmentType: overrideEquipment || 'barbell',
        primaryMuscleTags: ['bicep'],
        secondaryMuscleTags: ['forearm', 'deltoid_anterior'],
        calculateRig: (cycle) => {
          const curl = cycle * 1.72; // Full curl range up to 100° flexion
          const isSeated = overridePosition === 'seated';
          return {
            rootPosition: isSeated ? [0, 0.12, 0.04] : [0, 0.35, 0],
            rootRotation: [0, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [0.02, 0, 0],
            chestScale: [1, 1, 1],
            neckRotation: [0, 0, 0],
            headRotation: [0, 0, 0],
            leftShoulderRotation: [0.12, 0, 0.08], // Shoulders stationary, elbows locked
            rightShoulderRotation: [0.12, 0, -0.08],
            leftElbowRotation: [curl, 0, 0],
            rightElbowRotation: [curl, 0, 0],
            leftWristRotation: [cycle * 0.25, 0, 0], // Supination at peak
            rightWristRotation: [cycle * 0.25, 0, 0],
            leftHipPosition: [-0.13, 0.38, isSeated ? 0.05 : 0],
            rightHipPosition: [0.13, 0.38, isSeated ? 0.05 : 0],
            leftHipRotation: isSeated ? [-1.45, 0, -0.15] : [0, 0, -0.04],
            rightHipRotation: isSeated ? [-1.45, 0, 0.15] : [0, 0, 0.04],
            leftKneeRotation: isSeated ? [1.48, 0, 0] : [0, 0, 0],
            rightKneeRotation: isSeated ? [1.48, 0, 0] : [0, 0, 0],
            leftAnkleRotation: [0, 0, 0],
            rightAnkleRotation: [0, 0, 0],
          };
        },
      };
    }

    case 'shoulder_press': {
      return {
        archetype,
        basePosture: overridePosition === 'standing' ? 'standing' : 'seated',
        benchType: overridePosition === 'standing' ? 'none' : 'flat',
        equipmentType: overrideEquipment || 'dumbbells',
        primaryMuscleTags: ['deltoid_lateral', 'deltoid_anterior'],
        secondaryMuscleTags: ['tricep', 'trapezius'],
        calculateRig: (cycle) => {
          const press = cycle;
          const isSeated = overridePosition !== 'standing';
          return {
            rootPosition: isSeated ? [0, 0.12, 0.04] : [0, 0.35, 0],
            rootRotation: [0, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [0.03, 0, 0],
            chestScale: [1, 1, 1],
            neckRotation: [0, 0, 0],
            headRotation: [0, 0, 0],
            leftShoulderRotation: [0.8 - press * 0.45, 0, 0.85 + press * 0.65],
            rightShoulderRotation: [0.8 - press * 0.45, 0, -0.85 - press * 0.65],
            leftElbowRotation: [-1.45 + press * 1.35, 0, 0],
            rightElbowRotation: [-1.45 + press * 1.35, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, isSeated ? 0.05 : 0],
            rightHipPosition: [0.13, 0.38, isSeated ? 0.05 : 0],
            leftHipRotation: isSeated ? [-1.45, 0, -0.15] : [0, 0, -0.04],
            rightHipRotation: isSeated ? [-1.45, 0, 0.15] : [0, 0, 0.04],
            leftKneeRotation: isSeated ? [1.48, 0, 0] : [0, 0, 0],
            rightKneeRotation: isSeated ? [1.48, 0, 0] : [0, 0, 0],
            leftAnkleRotation: [0, 0, 0],
            rightAnkleRotation: [0, 0, 0],
          };
        },
      };
    }

    case 'lateral_raise': {
      return {
        archetype,
        basePosture: overridePosition === 'standing' ? 'standing' : 'seated',
        benchType: overridePosition === 'standing' ? 'none' : 'flat',
        equipmentType: 'dumbbells',
        primaryMuscleTags: ['deltoid_lateral'],
        secondaryMuscleTags: ['trapezius', 'deltoid_anterior'],
        calculateRig: (cycle) => {
          const raise = cycle * 1.42; // Up to shoulder plane
          const isSeated = overridePosition !== 'standing';
          return {
            rootPosition: isSeated ? [0, 0.12, 0.04] : [0, 0.35, 0],
            rootRotation: [0, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [0.05, 0, 0], // Subtle forward lean in scapular plane
            chestScale: [1, 1, 1],
            neckRotation: [0, 0, 0],
            headRotation: [0, 0, 0],
            leftShoulderRotation: [0.18, 0, raise],
            rightShoulderRotation: [0.18, 0, -raise],
            leftElbowRotation: [-0.3, 0.15, 0.18], // 15° slight elbow bend
            rightElbowRotation: [-0.3, -0.15, -0.18],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, isSeated ? 0.05 : 0],
            rightHipPosition: [0.13, 0.38, isSeated ? 0.05 : 0],
            leftHipRotation: isSeated ? [-1.45, 0, -0.15] : [0, 0, -0.04],
            rightHipRotation: isSeated ? [-1.45, 0, 0.15] : [0, 0, 0.04],
            leftKneeRotation: isSeated ? [1.48, 0, 0] : [0, 0, 0],
            rightKneeRotation: isSeated ? [1.48, 0, 0] : [0, 0, 0],
            leftAnkleRotation: [0, 0, 0],
            rightAnkleRotation: [0, 0, 0],
          };
        },
      };
    }

    case 'lat_pulldown': {
      return {
        archetype,
        basePosture: 'seated',
        benchType: 'flat',
        equipmentType: 'cable',
        primaryMuscleTags: ['lat'],
        secondaryMuscleTags: ['bicep', 'trapezius', 'forearm'],
        calculateRig: (cycle) => {
          const pull = cycle * 1.25;
          return {
            rootPosition: [0, 0.12, 0.04],
            rootRotation: [0, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [-pull * 0.14, 0, 0], // Slight thoracic extension as bar approaches sternum
            chestScale: [1.0 + pull * 0.08, 1, 1.0 + pull * 0.08],
            neckRotation: [pull * 0.1, 0, 0],
            headRotation: [pull * 0.08, 0, 0],
            leftShoulderRotation: [2.05 - pull * 0.95, 0.22, 0.35],
            rightShoulderRotation: [2.05 - pull * 0.95, -0.22, -0.35],
            leftElbowRotation: [pull * 1.45, 0, 0],
            rightElbowRotation: [pull * 1.45, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0.05],
            rightHipPosition: [0.13, 0.38, 0.05],
            leftHipRotation: [-1.45, 0, -0.15],
            rightHipRotation: [-1.45, 0, 0.15],
            leftKneeRotation: [1.48, 0, 0],
            rightKneeRotation: [1.48, 0, 0],
            leftAnkleRotation: [0, 0, 0],
            rightAnkleRotation: [0, 0, 0],
          };
        },
      };
    }

    case 'row': {
      return {
        archetype,
        basePosture: 'standing',
        benchType: 'none',
        equipmentType: overrideEquipment || 'barbell',
        primaryMuscleTags: ['lat', 'trapezius'],
        secondaryMuscleTags: ['bicep', 'back'],
        calculateRig: (cycle) => {
          const rowPull = cycle * 1.2;
          return {
            rootPosition: [0, 0.35, -0.15],
            rootRotation: [0, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [0.65, 0, 0], // Bent-over 45° posture
            chestScale: [1.0 + rowPull * 0.06, 1, 1],
            neckRotation: [-0.4, 0, 0],
            headRotation: [-0.2, 0, 0],
            leftShoulderRotation: [0.65 - rowPull * 0.65, 0.15, 0.2],
            rightShoulderRotation: [0.65 - rowPull * 0.65, -0.15, -0.2],
            leftElbowRotation: [rowPull * 1.45, 0, 0], // Elbows drive back past ribs
            rightElbowRotation: [rowPull * 1.45, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0],
            rightHipPosition: [0.13, 0.38, 0],
            leftHipRotation: [-0.25, 0, -0.06],
            rightHipRotation: [-0.25, 0, 0.06],
            leftKneeRotation: [0.35, 0, 0],
            rightKneeRotation: [0.35, 0, 0],
            leftAnkleRotation: [0, 0, 0],
            rightAnkleRotation: [0, 0, 0],
          };
        },
      };
    }

    case 'hip_thrust': {
      return {
        archetype,
        basePosture: 'lying',
        benchType: 'flat',
        equipmentType: overrideEquipment || 'barbell',
        primaryMuscleTags: ['glute'],
        secondaryMuscleTags: ['hamstring', 'quad', 'abs'],
        calculateRig: (cycle) => {
          const thrust = cycle;
          return {
            rootPosition: [0, 0.14 + thrust * 0.26, 0.08], // Pelvis elevates into bridge
            rootRotation: [Math.PI / 3.5, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [-thrust * 0.35, 0, 0], // Hips extend to horizontal lockout
            chestScale: [1, 1, 1],
            neckRotation: [0.25, 0, 0],
            headRotation: [0.15, 0, 0],
            leftShoulderRotation: [0.2, 0, 0.1],
            rightShoulderRotation: [0.2, 0, -0.1],
            leftElbowRotation: [-0.3, 0, 0],
            rightElbowRotation: [-0.3, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0],
            rightHipPosition: [0.13, 0.38, 0],
            leftHipRotation: [-1.45 + thrust * 0.45, 0, -0.15],
            rightHipRotation: [-1.45 + thrust * 0.45, 0, 0.15],
            leftKneeRotation: [1.45, 0, 0], // 90° knee angle firmly planted
            rightKneeRotation: [1.45, 0, 0],
            leftAnkleRotation: [0, 0, 0],
            rightAnkleRotation: [0, 0, 0],
          };
        },
      };
    }

    case 'plank': {
      return {
        archetype,
        basePosture: 'plank',
        benchType: 'none',
        equipmentType: 'bodyweight',
        primaryMuscleTags: ['abs'],
        secondaryMuscleTags: ['deltoid_anterior', 'glute', 'quad'],
        calculateRig: (_cycle, time, isPlaying) => {
          const microBreathe = isPlaying ? Math.sin(time * 3) * 0.015 : 0;
          return {
            rootPosition: [0, 0.08, -0.22],
            rootRotation: [-Math.PI / 2.05, Math.PI, 0], // Prone body alignment
            spinePosition: [0, 0.52, 0],
            spineRotation: [0, 0, 0], // Perfectly straight core
            chestScale: [1.0 + microBreathe, 1, 1.0 + microBreathe],
            neckRotation: [0.15, 0, 0],
            headRotation: [0.1, 0, 0],
            leftShoulderRotation: [1.4, 0, 0.25], // Supported on forearms
            rightShoulderRotation: [1.4, 0, -0.25],
            leftElbowRotation: [-1.55, 0, 0],
            rightElbowRotation: [-1.55, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0],
            rightHipPosition: [0.13, 0.38, 0],
            leftHipRotation: [0, 0, -0.04],
            rightHipRotation: [0, 0, 0.04],
            leftKneeRotation: [0, 0, 0],
            rightKneeRotation: [0, 0, 0],
            leftAnkleRotation: [0.25, 0, 0],
            rightAnkleRotation: [0.25, 0, 0],
          };
        },
      };
    }

    case 'crunch_abs': {
      return {
        archetype,
        basePosture: 'lying',
        benchType: 'none',
        equipmentType: 'bodyweight',
        primaryMuscleTags: ['abs'],
        secondaryMuscleTags: ['oblique'],
        calculateRig: (cycle) => {
          const crunch = cycle;
          return {
            rootPosition: [0, 0.16, -0.28],
            rootRotation: [Math.PI / 2, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [crunch * 0.55, 0, 0], // Torso curls up toward knees
            chestScale: [1, 1, 1],
            neckRotation: [crunch * 0.35, 0, 0],
            headRotation: [crunch * 0.2, 0, 0],
            leftShoulderRotation: [1.6, 0, 0.5], // Hands beside temples
            rightShoulderRotation: [1.6, 0, -0.5],
            leftElbowRotation: [-1.6, 0, 0],
            rightElbowRotation: [-1.6, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0],
            rightHipPosition: [0.13, 0.38, 0],
            leftHipRotation: [-1.45, 0, -0.1],
            rightHipRotation: [-1.45, 0, 0.1],
            leftKneeRotation: [1.45, 0, 0],
            rightKneeRotation: [1.45, 0, 0],
            leftAnkleRotation: [0, 0, 0],
            rightAnkleRotation: [0, 0, 0],
          };
        },
      };
    }

    case 'calf_raise': {
      return {
        archetype,
        basePosture: 'standing',
        benchType: 'none',
        equipmentType: overrideEquipment || 'bodyweight',
        primaryMuscleTags: ['calf'],
        secondaryMuscleTags: ['quad', 'abs'],
        calculateRig: (cycle) => {
          const calfLift = cycle * 0.18;
          return {
            rootPosition: [0, 0.35 + calfLift, 0], // Entire body lifts onto toes
            rootRotation: [0, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [0, 0, 0],
            chestScale: [1, 1, 1],
            neckRotation: [0, 0, 0],
            headRotation: [0, 0, 0],
            leftShoulderRotation: [0.08, 0, 0.08],
            rightShoulderRotation: [0.08, 0, -0.08],
            leftElbowRotation: [-0.15, 0, 0],
            rightElbowRotation: [-0.15, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0],
            rightHipPosition: [0.13, 0.38, 0],
            leftHipRotation: [0, 0, -0.04],
            rightHipRotation: [0, 0, 0.04],
            leftKneeRotation: [0, 0, 0],
            rightKneeRotation: [0, 0, 0],
            leftAnkleRotation: [cycle * 0.52, 0, 0], // Plantarflexion
            rightAnkleRotation: [cycle * 0.52, 0, 0],
          };
        },
      };
    }

    case 'jumping_jacks': {
      return {
        archetype,
        basePosture: 'standing',
        benchType: 'none',
        equipmentType: 'bodyweight',
        primaryMuscleTags: ['calf', 'quad', 'deltoid_lateral'],
        secondaryMuscleTags: ['abs', 'glute'],
        calculateRig: (_cycle, time, isPlaying, playbackSpeed) => {
          const jackPhase = isPlaying ? Math.abs(Math.sin(time * 4.2 * playbackSpeed)) : 0;
          return {
            rootPosition: [0, 0.35 + jackPhase * 0.14, 0], // Bounce height
            rootRotation: [0, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [0, 0, 0],
            chestScale: [1, 1, 1],
            neckRotation: [0, 0, 0],
            headRotation: [0, 0, 0],
            leftShoulderRotation: [0.15, 0, jackPhase * 2.3], // Arms open overhead
            rightShoulderRotation: [0.15, 0, -jackPhase * 2.3],
            leftElbowRotation: [-jackPhase * 0.3, 0, 0],
            rightElbowRotation: [-jackPhase * 0.3, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, 0],
            rightHipPosition: [0.13, 0.38, 0],
            leftHipRotation: [0, 0, -jackPhase * 0.42], // Legs abduct wide
            rightHipRotation: [0, 0, jackPhase * 0.42],
            leftKneeRotation: [jackPhase * 0.18, 0, 0],
            rightKneeRotation: [jackPhase * 0.18, 0, 0],
            leftAnkleRotation: [0, 0, 0],
            rightAnkleRotation: [0, 0, 0],
          };
        },
      };
    }

    default: {
      // Dynamic fallback tailored by posture
      return {
        archetype: 'generic_dynamic',
        basePosture: overridePosition || 'standing',
        benchType: overridePosition === 'lying' ? 'flat' : overridePosition === 'seated' ? 'flat' : 'none',
        equipmentType: overrideEquipment || 'dumbbells',
        primaryMuscleTags: ['deltoid_lateral'],
        secondaryMuscleTags: ['trapezius'],
        calculateRig: (cycle) => {
          const isLying = overridePosition === 'lying';
          const isSeated = overridePosition === 'seated';
          return {
            rootPosition: isLying ? [0, 0.38, -0.32] : isSeated ? [0, 0.12, 0.04] : [0, 0.35, 0],
            rootRotation: isLying ? [Math.PI / 2, 0, 0] : [0, 0, 0],
            spinePosition: [0, 0.52, 0],
            spineRotation: [0, 0, 0],
            chestScale: [1, 1, 1],
            neckRotation: [0, 0, 0],
            headRotation: [0, 0, 0],
            leftShoulderRotation: [0.1, 0, cycle * 1.1],
            rightShoulderRotation: [0.1, 0, -cycle * 1.1],
            leftElbowRotation: [-0.25, 0, 0],
            rightElbowRotation: [-0.25, 0, 0],
            leftWristRotation: [0, 0, 0],
            rightWristRotation: [0, 0, 0],
            leftHipPosition: [-0.13, 0.38, isSeated ? 0.05 : 0],
            rightHipPosition: [0.13, 0.38, isSeated ? 0.05 : 0],
            leftHipRotation: isSeated ? [-1.45, 0, -0.15] : isLying ? [-1.2, 0, -0.1] : [0, 0, -0.04],
            rightHipRotation: isSeated ? [-1.45, 0, 0.15] : isLying ? [-1.2, 0, 0.1] : [0, 0, 0.04],
            leftKneeRotation: isSeated || isLying ? [1.45, 0, 0] : [0, 0, 0],
            rightKneeRotation: isSeated || isLying ? [1.45, 0, 0] : [0, 0, 0],
            leftAnkleRotation: [0, 0, 0],
            rightAnkleRotation: [0, 0, 0],
          };
        },
      };
    }
  }
}

/**
 * Resolves a complete, highly-accurate DetailedExercise for PersonalTrainer
 * from any exercise input (name, ID, or workout item).
 */
export function resolveExerciseWithKinematics(
  exerciseInput: any
): { detailedExercise: DetailedExercise; kinematicProfile: ExerciseKinematicProfile } {
  if (!exerciseInput) {
    const fallbackEx = EXERCISE_DATABASE[0];
    const rawFbEq = fallbackEx.equipment;
    const normalizedFbEq: 'dumbbells' | 'barbell' | 'cable' | 'bodyweight' | 'none' =
      rawFbEq === 'machine' || rawFbEq === 'bench' || rawFbEq === 'kettlebell' || rawFbEq === 'cardio_gear'
        ? 'dumbbells'
        : (rawFbEq === 'dumbbells' || rawFbEq === 'barbell' || rawFbEq === 'cable' || rawFbEq === 'bodyweight' || rawFbEq === 'none')
        ? rawFbEq
        : 'barbell';
    const profile = getKinematicProfileForArchetype('lateral_raise', fallbackEx.position, normalizedFbEq);
    return { detailedExercise: fallbackEx, kinematicProfile: profile };
  }

  const name = exerciseInput.name || '';
  const id = exerciseInput.id || '';
  const category = exerciseInput.category || exerciseInput.muscleGroups?.[0] || '';
  const archetype = classifyExerciseArchetype(name || id, category);

  // Look for match in EXERCISE_DATABASE
  let matched = EXERCISE_DATABASE.find((e) => {
    if (e.id === id) return true;
    const eNorm = normalizeString(e.name);
    const iNorm = normalizeString(name);
    return eNorm === iNorm || eNorm.includes(iNorm) || iNorm.includes(eNorm);
  });

  // If not direct match, search by archetype
  if (!matched) {
    if (archetype === 'squat') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'barbell-squat' || e.id === 'sumo-squat');
    } else if (archetype === 'bench_press') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'bench-press');
    } else if (archetype === 'incline_bench_press') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'incline-dumbbell-press');
    } else if (archetype === 'push_up') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'push-up');
    } else if (archetype === 'lunge') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'lunges');
    } else if (archetype === 'deadlift_rdl') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'stiff-leg-deadlift');
    } else if (archetype === 'bicep_curl') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'barbell-curl');
    } else if (archetype === 'shoulder_press') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'dumbbell-shoulder-press');
    } else if (archetype === 'lateral_raise') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'seated-lateral-raises');
    } else if (archetype === 'lat_pulldown') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'lat-pulldown');
    } else if (archetype === 'row') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'bent-over-row' || e.id === 'seated-cable-row');
    } else if (archetype === 'hip_thrust') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'hip-thrust' || e.id === 'glute-bridge');
    } else if (archetype === 'calf_raise') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'calf-raises');
    } else if (archetype === 'crunch_abs') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'cable-crunch' || e.id === 'bicycle-crunch');
    } else if (archetype === 'plank') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'plank');
    } else if (archetype === 'jumping_jacks') {
      matched = EXERCISE_DATABASE.find((e) => e.id === 'jumping-jacks');
    }
  }

  const rawEq = matched?.equipment;
  const normalizedEq: 'dumbbells' | 'barbell' | 'cable' | 'bodyweight' | 'none' = 
    rawEq === 'machine' || rawEq === 'bench' || rawEq === 'kettlebell' || rawEq === 'cardio_gear'
      ? 'dumbbells'
      : (rawEq === 'dumbbells' || rawEq === 'barbell' || rawEq === 'cable' || rawEq === 'bodyweight' || rawEq === 'none')
      ? rawEq
      : (archetype === 'squat' || archetype === 'deadlift_rdl' || archetype === 'bench_press' ? 'barbell' : 'dumbbells');

  const profile = getKinematicProfileForArchetype(
    archetype,
    matched?.position || (archetype === 'bench_press' || archetype === 'crunch_abs' || archetype === 'hip_thrust' ? 'lying' : 'standing'),
    normalizedEq
  );

  const baseEx = matched || EXERCISE_DATABASE[0];
  const detailedExercise: DetailedExercise = {
    ...baseEx,
    id: id || baseEx.id,
    name: name || baseEx.name,
    category: (baseEx.category || 'legs') as any,
    position: (profile.basePosture === 'lying' ? 'lying' : profile.basePosture === 'seated' ? 'seated' : profile.basePosture === 'incline' ? 'incline' : 'standing') as any,
    equipment: (profile.equipmentType === 'barbell' ? 'barbell' : profile.equipmentType === 'dumbbells' ? 'dumbbells' : profile.equipmentType === 'cable' ? 'cable' : 'bodyweight') as any,
    primaryMuscles: exerciseInput.primaryMuscles?.length
      ? exerciseInput.primaryMuscles
      : baseEx.primaryMuscles,
    secondaryMuscles: exerciseInput.secondaryMuscles?.length
      ? exerciseInput.secondaryMuscles
      : baseEx.secondaryMuscles,
  };

  return { detailedExercise, kinematicProfile: profile };
}
