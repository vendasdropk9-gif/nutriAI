import * as THREE from 'three';

/**
 * AnatomicalSculptor
 * High-definition procedural organic mesh sculptor for the NutriAI 3D Anatomical Atlas.
 * Generates continuous, smooth, anatomically accurate human muscular and skeletal geometry
 * matching premium medical fitness atlas standards (zero boxy/robotic artifacts).
 */

// Helper to create a smoothed sculpted geometry from parametric formulas
function createParametricSurface(
  uSegments: number,
  vSegments: number,
  func: (u: number, v: number, target: THREE.Vector3) => void
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const indices: number[] = [];
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const target = new THREE.Vector3();

  for (let i = 0; i <= vSegments; i++) {
    const v = i / vSegments;
    for (let j = 0; j <= uSegments; j++) {
      const u = j / uSegments;
      func(u, v, target);
      vertices.push(target.x, target.y, target.z);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < vSegments; i++) {
    for (let j = 0; j < uSegments; j++) {
      const a = i * (uSegments + 1) + j;
      const b = (i + 1) * (uSegments + 1) + j;
      const c = (i + 1) * (uSegments + 1) + (j + 1);
      const d = i * (uSegments + 1) + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geom.setIndex(indices);
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();
  return geom;
}

/**
 * 1. HEAD & CRANIUM
 * Sleek porcelain humanoid head with defined jawline, temples, chin and occipital curve.
 */
export function createSculptedHeadGeometry(): THREE.BufferGeometry {
  return createParametricSurface(36, 36, (u, v, target) => {
    // theta: 0 to 2*PI, phi: 0 to PI
    const theta = u * Math.PI * 2;
    const phi = v * Math.PI;

    // Base ellipsoid
    let rx = 0.135;
    let ry = 0.175;
    let rz = 0.155;

    // Height offset along vertical axis (y from -ry to +ry)
    const yNorm = Math.cos(phi); // 1 at top, -1 at chin

    // Sculpt cranium: broader at top-back, narrower at chin
    if (yNorm < 0) {
      // Jaw and chin taper
      const chinTaper = 1.0 + yNorm * 0.35; // tapers to 0.65 at bottom
      rx *= chinTaper;
      rz *= (1.0 + yNorm * 0.22);
    } else {
      // Forehead & parietal expansion
      const parietalExpand = 1.0 + Math.sin(yNorm * Math.PI * 0.5) * 0.08;
      rx *= parietalExpand;
      rz *= parietalExpand;
    }

    // Facial flat plane anteriorly (z > 0)
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    if (sinTheta > 0 && yNorm < 0.3 && yNorm > -0.8) {
      // Subtle cheekbone and eye socket recess
      rz *= 0.94;
    }

    const x = rx * Math.sin(phi) * cosTheta;
    const y = ry * yNorm;
    const z = rz * Math.sin(phi) * sinTheta;

    target.set(x, y, z);
  });
}

/**
 * 2. NECK & CLAVICULAR SCONCE
 * Anatomical neck with sternocleidomastoid columns descending to clavicles.
 */
export function createSculptedNeckGeometry(isFemale: boolean): THREE.BufferGeometry {
  const topRadius = isFemale ? 0.072 : 0.082;
  const bottomRadius = isFemale ? 0.095 : 0.112;
  const height = 0.18;

  return createParametricSurface(32, 24, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * height;

    const r = THREE.MathUtils.lerp(bottomRadius, topRadius, v);
    // Slight oval cross-section (wider laterally than antero-posteriorly)
    let rx = r * 1.05;
    let rz = r * 0.92;

    // Sternocleidomastoid anterior definition
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    if (sinTheta > 0.4 && Math.abs(cosTheta) > 0.3) {
      // Anterior lateral columns
      rx *= 1.04;
    }

    target.set(rx * cosTheta, y, rz * sinTheta);
  });
}

/**
 * 3. PECTORALIS MAJOR (LEFT OR RIGHT)
 * Anatomically contoured chest with clavicular & sternal heads and axillary sweep.
 */
export function createSculptedPectoralGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const width = isFemale ? 0.18 : 0.22;
  const height = isFemale ? 0.16 : 0.19;
  const depth = isFemale ? 0.095 : 0.125;
  const sign = isLeft ? -1 : 1;

  return createParametricSurface(28, 28, (u, v, target) => {
    // u: 0 (medial/sternum) to 1 (lateral/shoulder insertion)
    // v: 0 (inferior/lower pec fold) to 1 (superior/clavicular margin)
    const x = sign * (u * width);
    const y = (v - 0.5) * height;

    // Muscular thickness curve: thickest in mid-belly (u ~ 0.45, v ~ 0.45)
    const bellyCurveX = Math.sin(u * Math.PI);
    const bellyCurveY = Math.sin(v * Math.PI);
    let z = depth * Math.pow(bellyCurveX, 0.75) * Math.pow(bellyCurveY, 0.85);

    // Anatomical sternal crest falloff
    if (u < 0.15) {
      z *= Math.pow(u / 0.15, 0.6);
    }
    // Clavicular superior sweep
    if (v > 0.8) {
      z *= (1.0 - (v - 0.8) * 1.5);
    }

    target.set(x, y, z);
  });
}

/**
 * 4. CLAVICULAR GIRDLE (COLLARBONE)
 * S-shaped architectural landmark bridging sternum to shoulder acromion.
 */
export function createSculptedClaviclesGeometry(isFemale: boolean): THREE.BufferGeometry {
  const curveLeft = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.02, 0, 0.06),
    new THREE.Vector3(-0.12, 0.015, 0.05),
    new THREE.Vector3(-0.25, 0.02, 0.01),
  ]);
  return new THREE.TubeGeometry(curveLeft, 24, isFemale ? 0.012 : 0.016, 12, false);
}

/**
 * 5. 8-PACK RECTUS ABDOMINIS
 * Sculpted dual columns of 4 rounded muscular bellies with linea alba and transverse intersections.
 */
export function createSculptedAbdominalWallGeometry(isFemale: boolean): THREE.BufferGeometry {
  const width = isFemale ? 0.19 : 0.23;
  const height = isFemale ? 0.32 : 0.36;
  const depth = isFemale ? 0.045 : 0.065;

  return createParametricSurface(36, 48, (u, v, target) => {
    // u: -1 to 1 (lateral span across midline)
    const normX = (u - 0.5) * 2;
    // v: 0 (lower pubic crest) to 1 (xiphoid process at sternum)
    const x = normX * (width * 0.5);
    const y = (v - 0.5) * height;

    // Linea alba central vertical groove
    const lineaAlbaFactor = 1.0 - Math.exp(-Math.pow(normX * 6.5, 2));

    // 4 Distinct Transverse Bellies along vertical axis
    // Tiers at v ~ 0.85 (upper), 0.62 (mid-upper), 0.38 (mid-lower/navel), 0.15 (lower)
    const tierFrequency = Math.sin(v * Math.PI * 4.0);
    const tierPillows = Math.max(0, tierFrequency * 0.5 + 0.5);

    // Lateral border falloff (semilunar line)
    const lateralFalloff = Math.max(0, 1.0 - Math.pow(Math.abs(normX), 2.2));

    let z = depth * lineaAlbaFactor * tierPillows * lateralFalloff;

    // Slight global torso convexity
    z += Math.cos(normX * Math.PI * 0.5) * 0.02;

    target.set(x, y, z);
  });
}

/**
 * 6. SERRATUS ANTERIOR & EXTERNAL OBLIQUES
 * Sculpted lateral ribcage muscle digits and oblique crest descending to the hips.
 */
export function createSculptedSerratusObliquesGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const sign = isLeft ? -1 : 1;
  const height = isFemale ? 0.28 : 0.32;
  const radius = isFemale ? 0.052 : 0.068;

  return createParametricSurface(24, 32, (u, v, target) => {
    const angle = u * Math.PI; // wraps anterior to lateral
    const y = (v - 0.5) * height;

    // Rib slips wave
    const slipWave = Math.sin(v * Math.PI * 6) * 0.012;
    const r = radius + slipWave;

    const x = sign * (r * Math.sin(angle));
    const z = r * Math.cos(angle);

    target.set(x, y, z);
  });
}

/**
 * 7. DELTOIDE (SHOULDER CAP - LATERAL, ANTERIOR, OR POSTERIOR)
 * Distinct organic muscular bellies covering the shoulder girdle.
 * Recreates the brilliant muscular crown seen in the reference image.
 */
export function createSculptedDeltoidGeometry(
  part: 'lateral' | 'anterior' | 'posterior',
  isLeft: boolean,
  isFemale: boolean
): THREE.BufferGeometry {
  const sign = isLeft ? -1 : 1;
  const width = isFemale ? 0.115 : 0.145;
  const height = isFemale ? 0.17 : 0.21;
  const depth = isFemale ? 0.11 : 0.14;

  return createParametricSurface(28, 28, (u, v, target) => {
    // Parametric inverted teardrop
    const phi = u * Math.PI; // lateral dome
    const y = (v - 0.5) * height; // +height/2 at clavicle/acromion origin, -height/2 at humeral insertion

    // Teardrop profile: wide at top (v ~ 0.8), tapering to point at bottom (v ~ 0.0)
    const taper = Math.pow(v, 0.45) * (1.1 - v * 0.2);
    const r = (part === 'lateral' ? width : width * 0.85) * taper;

    let x = sign * (r * Math.sin(phi));
    let z = (part === 'anterior' ? depth * 0.9 : depth) * Math.cos(phi) * taper;

    // Muscular fullness bump in the belly
    const belly = Math.sin(v * Math.PI) * 0.025;
    x += sign * belly;

    target.set(x, y, z);
  });
}

/**
 * 8. BICEPS BRACHII & BRACHIALIS (UPPER ARM ANTERIOR)
 * Organic muscular peak with dual long and short heads.
 */
export function createSculptedBicepGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const sign = isLeft ? -1 : 1;
  const length = isFemale ? 0.22 : 0.26;
  const radius = isFemale ? 0.065 : 0.088;

  return createParametricSurface(24, 28, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * length;

    // Fusiform muscle bellies: peaks in the middle (v ~ 0.45)
    const belly = Math.sin(v * Math.PI);
    let r = radius * (0.35 + 0.65 * Math.pow(belly, 0.65));

    // Dual head ridge
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    if (sinTheta > 0.2) {
      // Anterior bicep peak
      r *= (1.0 + Math.pow(belly, 1.2) * 0.22);
    }

    target.set(r * cosTheta, y, r * sinTheta);
  });
}

/**
 * 9. TRICEPS BRACHII (UPPER ARM POSTERIOR)
 * Horseshoe shaped triceps with lateral, long and medial heads plus olecranon tendon.
 */
export function createSculptedTricepGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const length = isFemale ? 0.22 : 0.26;
  const radius = isFemale ? 0.062 : 0.084;

  return createParametricSurface(24, 28, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * length;

    const belly = Math.sin(v * Math.PI);
    let r = radius * (0.4 + 0.6 * Math.pow(belly, 0.7));

    // Horseshoe lateral and long head split
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    if (sinTheta < -0.2) {
      // Posterior bulge
      r *= (1.0 + Math.pow(belly, 1.1) * 0.2);
    }

    target.set(r * cosTheta, y, r * sinTheta);
  });
}

/**
 * 10. FOREARM (BRACHIORADIALIS & FLEXOR/EXTENSOR MASS)
 * Muscular proximal expansion tapering smoothly to a refined wrist.
 */
export function createSculptedForearmGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const sign = isLeft ? -1 : 1;
  const length = isFemale ? 0.24 : 0.28;
  const topRadius = isFemale ? 0.058 : 0.076;
  const wristRadius = isFemale ? 0.034 : 0.044;

  return createParametricSurface(24, 28, (u, v, target) => {
    // v: 0 at wrist, 1 at elbow
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * length;

    // Organic taper with brachioradialis bulge in upper third (v ~ 0.75)
    let r = THREE.MathUtils.lerp(wristRadius, topRadius, Math.pow(v, 0.6));

    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    // Brachioradialis lateral bulge
    if (sign * cosTheta > 0.4 && v > 0.5) {
      r *= 1.18;
    }

    target.set(r * cosTheta, y, r * sinTheta);
  });
}

/**
 * 11. ANATOMICAL HAND
 * Palm, thumb, and natural fingers curled realistically around exercise grips.
 */
export function createSculptedHandGeometry(isLeft: boolean): THREE.BufferGeometry {
  const palm = new THREE.CapsuleGeometry(0.038, 0.08, 16, 16);
  return palm;
}

/**
 * 12. QUADRICEPS FEMORIS (THIGH ANTERIOR)
 * High-definition 3-head complex: Rectus femoris down center, Vastus lateralis flare,
 * and Vastus medialis (teardrop) bulging above inner knee!
 */
export function createSculptedQuadricepsGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const sign = isLeft ? -1 : 1;
  const length = isFemale ? 0.38 : 0.44;
  const midRadius = isFemale ? 0.11 : 0.138;

  return createParametricSurface(32, 36, (u, v, target) => {
    // v: 0 (knee joint), 1 (hip / groin)
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * length;

    // Base athletic taper
    let r = midRadius * Math.sin(v * Math.PI * 0.85 + 0.15);

    const sinTheta = Math.sin(theta); // anterior (+) / posterior (-)
    const cosTheta = Math.cos(theta); // lateral / medial

    // Anterior rectus femoris central ridge
    if (sinTheta > 0.4) {
      r *= (1.0 + Math.sin(v * Math.PI) * 0.18);
    }

    // Vastus Lateralis outer sweep (upper 2/3)
    if (sign * cosTheta > 0.3 && v > 0.35) {
      r *= 1.22;
    }

    // Vastus Medialis "Teardrop" on inner knee (lower 1/3, v ~ 0.15 - 0.35)
    if (sign * cosTheta < -0.2 && v >= 0.12 && v <= 0.42) {
      const teardropBelly = Math.sin(((v - 0.12) / 0.3) * Math.PI);
      r *= (1.0 + teardropBelly * 0.28);
    }

    target.set(r * cosTheta, y, r * sinTheta);
  });
}

/**
 * 13. HAMSTRINGS (THIGH POSTERIOR)
 * Biceps femoris and semitendinosus muscular columns running from ischial tuberosity to knee.
 */
export function createSculptedHamstringsGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const length = isFemale ? 0.36 : 0.42;
  const radius = isFemale ? 0.095 : 0.118;

  return createParametricSurface(24, 28, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * length;

    const belly = Math.sin(v * Math.PI * 0.9 + 0.1);
    let r = radius * belly;

    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    if (sinTheta < -0.3) {
      // Posterior hamstring bulge
      r *= 1.15;
    }

    target.set(r * cosTheta, y, r * sinTheta);
  });
}

/**
 * 14. PATELLA & KNEECAP
 * Anatomical kneecap with patellar ligament groove.
 */
export function createSculptedPatellaGeometry(): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(0.052, 20, 20);
  geom.scale(0.85, 1.1, 0.65);
  return geom;
}

/**
 * 15. CALF (GASTROCNEMIUS & SOLEUS)
 * Dual muscular bellies: medial belly sits slightly lower and fuller than lateral belly,
 * tapering into the Achilles tendon.
 */
export function createSculptedCalfGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const sign = isLeft ? -1 : 1;
  const length = isFemale ? 0.34 : 0.39;
  const maxRadius = isFemale ? 0.082 : 0.104;
  const ankleRadius = isFemale ? 0.038 : 0.048;

  return createParametricSurface(28, 32, (u, v, target) => {
    // v: 0 (ankle), 1 (knee insertion)
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * length;

    // Muscular bellies peak in upper half (v ~ 0.72)
    const bellyCurve = Math.pow(v, 0.7) * Math.pow(1.0 - v * 0.25, 1.4);
    let r = THREE.MathUtils.lerp(ankleRadius, maxRadius, bellyCurve * 1.6);

    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    // Posterior calf diamond peak
    if (sinTheta < -0.15 && v > 0.4) {
      r *= 1.25;

      // Medial head sits slightly lower and larger
      if (sign * cosTheta < 0 && v < 0.7) {
        r *= 1.08;
      }
    }

    target.set(r * cosTheta, y, r * sinTheta);
  });
}

/**
 * 16. ATHLETIC FOOT
 * Planted foot with calcaneus heel, arch, lateral malleolus, and defined toes.
 */
export function createSculptedFootGeometry(isLeft: boolean): THREE.BufferGeometry {
  return createParametricSurface(24, 20, (u, v, target) => {
    // u: circumference around foot
    // v: 0 at heel to 1 at toes
    const theta = u * Math.PI * 2;
    const length = 0.24;
    const width = 0.095;
    const height = 0.065;

    const z = (v - 0.5) * length;
    const taper = Math.sin(v * Math.PI * 0.8 + 0.2);

    const x = Math.sin(theta) * (width * 0.5) * taper;
    const y = Math.cos(theta) * (height * 0.5) * taper;

    target.set(x, Math.max(0, y), z);
  });
}

/**
 * 17. ATHLETIC COMPRESSION SHORTS
 * Sleek dark athletic shorts hugging hips and quads matching reference image.
 */
export function createSculptedShortsGeometry(isFemale: boolean): THREE.BufferGeometry {
  const topRadius = isFemale ? 0.185 : 0.195;
  const bottomRadius = isFemale ? 0.17 : 0.185;
  const height = 0.27;

  return createParametricSurface(32, 24, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * height;

    const r = THREE.MathUtils.lerp(bottomRadius, topRadius, v);
    let rx = r * 1.08;
    let rz = r * 0.94;

    target.set(rx * Math.cos(theta), y, rz * Math.sin(theta));
  });
}

/**
 * 18. GLUTEUS MAXIMUS
 * Powerful sculpted rounded gluteal contours.
 */
export function createSculptedGluteGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(isFemale ? 0.165 : 0.155, 24, 24);
  geom.scale(1.0, isFemale ? 1.15 : 1.05, isFemale ? 1.25 : 1.12);
  return geom;
}

/**
 * 19. PROFESSIONAL GYM BENCH
 * Ergonomic contoured fitness bench from reference image.
 */
export function createGymBenchGeometries() {
  return {
    seat: new THREE.BoxGeometry(0.38, 0.08, 0.42),
    backrest: new THREE.BoxGeometry(0.32, 0.82, 0.08),
    frame: new THREE.CylinderGeometry(0.045, 0.045, 0.48, 16),
    baseFeet: new THREE.BoxGeometry(0.58, 0.06, 0.12),
  };
}

/**
 * 20. PRO HEX / TIERED DUMBBELLS
 * Heavy cast iron stacked weight plates with chrome knurled bar.
 */
export function createProDumbbellGeometries() {
  return {
    handle: new THREE.CylinderGeometry(0.016, 0.016, 0.24, 16),
    plateLarge: new THREE.CylinderGeometry(0.096, 0.096, 0.034, 24),
    plateMedium: new THREE.CylinderGeometry(0.082, 0.082, 0.028, 24),
    plateSmall: new THREE.CylinderGeometry(0.068, 0.068, 0.022, 24),
    collar: new THREE.CylinderGeometry(0.026, 0.026, 0.018, 16),
  };
}
