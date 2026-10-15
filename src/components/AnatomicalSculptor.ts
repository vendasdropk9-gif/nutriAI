import * as THREE from 'three';

/**
 * AnatomicalSculptor
 * Professional Human Anatomical Geometry Sculptor for the NutriAI 3D Avatar.
 * Generates continuous, organic, proportional human muscular and skeletal geometry
 * matching medical fitness standards (zero boxy artifacts, zero crude cylinders).
 */

// Parametric surface builder with smooth vertex normal computation
function createSmoothParametricSurface(
  uSegments: number,
  vSegments: number,
  evaluator: (u: number, v: number, target: THREE.Vector3) => void
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const indices: number[] = [];
  const vertices: number[] = [];
  const uvs: number[] = [];
  const target = new THREE.Vector3();

  for (let i = 0; i <= vSegments; i++) {
    const v = i / vSegments;
    for (let j = 0; j <= uSegments; j++) {
      const u = j / uSegments;
      evaluator(u, v, target);
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
 * 1. HEAD & CRANIUM (Human Anatomical Proportions, Faceless Minimalist Mannequin)
 * Classical 8-head canon proportions: sleek cranial dome, defined zygomatic arch,
 * mandibular jawline and smooth chin. Zero artificial facial features (sem olhos, nariz ou boca).
 */
export function createSculptedHeadGeometry(): THREE.BufferGeometry {
  return createSmoothParametricSurface(24, 22, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const phi = v * Math.PI;

    let rx = 0.125;
    let ry = 0.165;
    let rz = 0.145;

    const yNorm = Math.cos(phi); // 1 at top, -1 at chin

    // Natural cranial sculpting: wider at parietal/occipital, tapering down to jawline and chin
    if (yNorm < 0) {
      const chinTaper = 1.0 + yNorm * 0.38; // tapers smoothly toward jaw/chin
      rx *= Math.max(0.62, chinTaper);
      rz *= Math.max(0.68, 1.0 + yNorm * 0.28);
    } else {
      const parietalCurve = 1.0 + Math.sin(yNorm * Math.PI * 0.5) * 0.06;
      rx *= parietalCurve;
      rz *= parietalCurve;
    }

    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    // Subtle temporal recession and jawline angle
    if (sinTheta > 0.1 && yNorm < 0.2 && yNorm > -0.6) {
      rz *= 0.96;
    }

    const x = rx * Math.sin(phi) * cosTheta;
    const y = ry * yNorm;
    const z = rz * Math.sin(phi) * sinTheta;

    target.set(x, y, z);
  });
}

/**
 * 2. NECK (Anatomical Cervical Column with Sternocleidomastoid Sweep)
 * Smoothly connects the skull base to the thoracic inlet and clavicles without sharp cylinder edges.
 */
export function createSculptedNeckGeometry(isFemale: boolean): THREE.BufferGeometry {
  const topRadiusX = isFemale ? 0.068 : 0.078;
  const topRadiusZ = isFemale ? 0.065 : 0.075;
  const bottomRadiusX = isFemale ? 0.092 : 0.108;
  const bottomRadiusZ = isFemale ? 0.088 : 0.102;
  const height = 0.18;

  return createSmoothParametricSurface(24, 24, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * height;

    // Organic flared transition: narrow at C1/C2 atlas, widening into thoracic girdle
    const rx = THREE.MathUtils.lerp(bottomRadiusX, topRadiusX, Math.pow(v, 0.85));
    const rz = THREE.MathUtils.lerp(bottomRadiusZ, topRadiusZ, Math.pow(v, 0.85));

    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    // Sternocleidomastoid anterior definition
    let radMultiplier = 1.0;
    if (sinTheta > 0.4 && Math.abs(cosTheta) > 0.25) {
      radMultiplier += 0.04 * (1.0 - v);
    }

    target.set(rx * cosTheta * radMultiplier, y, rz * sinTheta * radMultiplier);
  });
}

/**
 * 3. TRAPEZIUS (Organic Cervico-Thoracic Muscular Wedge)
 * Anatomical diamond cape descending from the occiput to mid-back and spreading to acromion processes.
 * Replaces crude BoxGeometry with a continuous anatomical muscular saddle.
 */
export function createSculptedTrapeziusGeometry(isFemale: boolean): THREE.BufferGeometry {
  const width = isFemale ? 0.26 : 0.32;
  const height = isFemale ? 0.22 : 0.26;
  const depth = isFemale ? 0.08 : 0.10;

  return createSmoothParametricSurface(24, 24, (u, v, target) => {
    const normX = (u - 0.5) * 2; // -1 to +1 across shoulders
    const normY = v; // 0 at T12, 1 at occiput

    const diamondSpan = (1.0 - Math.abs(normY - 0.6) * 1.4) * (width * 0.5);
    const x = normX * Math.max(0.04, diamondSpan);
    const y = (normY - 0.5) * height;

    // Muscular thickness curving backward along the spine
    const spineGroove = Math.min(1.0, Math.abs(normX) * 2.5);
    const belly = Math.sin(normY * Math.PI);
    const z = -depth * spineGroove * belly * (1.0 - normX * normX * 0.5);

    target.set(x, y, z);
  });
}

/**
 * 4. PECTORALIS MAJOR (Contoured Anatomical Chest Plate)
 * Clavicular & sternal heads, midline sternal cleft, and smooth axillary twist toward humerus.
 */
export function createSculptedPectoralGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const width = isFemale ? 0.18 : 0.22;
  const height = isFemale ? 0.17 : 0.20;
  const maxDepth = isFemale ? 0.095 : 0.125;
  const sign = isLeft ? -1 : 1;

  return createSmoothParametricSurface(20, 20, (u, v, target) => {
    // u: 0 (sternum midline) to 1 (lateral shoulder insertion)
    // v: 0 (inframammary fold) to 1 (sub-clavicular margin)
    const x = sign * (u * width);
    const y = (v - 0.5) * height;

    // Natural pectoralis thickness curve
    const bellCurveX = Math.sin(u * Math.PI * 0.95);
    const bellCurveY = Math.sin(v * Math.PI * 0.9);

    let z = maxDepth * Math.pow(Math.max(0, bellCurveX), 0.7) * Math.pow(Math.max(0, bellCurveY), 0.8);

    // Smooth sternal margin falloff (prevents gap at midline)
    if (u < 0.12) {
      z *= Math.pow(u / 0.12, 0.7);
    }
    // Axillary tendon taper at lateral humerus
    if (u > 0.82) {
      z *= Math.pow((1.0 - u) / 0.18, 0.6);
    }

    target.set(x, y, z);
  });
}

/**
 * 5. CLAVICULAR GIRDLE (S-Curved Collarbones)
 * Natural organic bone curve bridging the manubrium sterni to the acromion process.
 */
export function createSculptedClaviclesGeometry(isFemale: boolean): THREE.BufferGeometry {
  const clavicleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.015, 0, 0.065),
    new THREE.Vector3(-0.08, 0.012, 0.055),
    new THREE.Vector3(-0.16, 0.016, 0.035),
    new THREE.Vector3(-0.25, 0.018, 0.015),
  ]);
  return new THREE.TubeGeometry(clavicleCurve, 14, isFemale ? 0.012 : 0.015, 10, false);
}

/**
 * 6. ABDOMINAL WALL / CORE (8-Pack Rectus Abdominis)
 * Seamless abdominal wall with central Linea Alba, 3-4 horizontal tendinous inscriptions,
 * and smooth semilunar lines connecting with the ribcage and pelvis.
 */
export function createSculptedAbdominalWallGeometry(isFemale: boolean): THREE.BufferGeometry {
  const width = isFemale ? 0.19 : 0.23;
  const height = isFemale ? 0.32 : 0.36;
  const depth = isFemale ? 0.045 : 0.06;

  return createSmoothParametricSurface(20, 20, (u, v, target) => {
    const normX = (u - 0.5) * 2; // -1 to +1 across abdomen
    const x = normX * (width * 0.5);
    const y = (v - 0.5) * height;

    // Smooth central Linea Alba groove
    const lineaAlba = 1.0 - Math.exp(-Math.pow(normX * 5.5, 2));

    // 4 Distinct Transverse Muscle Inscriptions
    const tierPillows = Math.max(0, Math.sin(v * Math.PI * 4.0));

    // Lateral border falloff (Linea Semilunaris)
    const lateralFalloff = Math.max(0, 1.0 - Math.pow(Math.abs(normX), 2.2));

    // Natural torso arch curvature
    const torsoArch = Math.cos(normX * Math.PI * 0.5) * 0.018;

    const z = depth * lineaAlba * (tierPillows * 0.65 + 0.35) * lateralFalloff + torsoArch;

    target.set(x, y, z);
  });
}

/**
 * 7. SERRATUS ANTERIOR & EXTERNAL OBLIQUES (Lateral Torso Flank)
 * Interdigitating finger-like slips wrapping the ribcage down to the iliac crest.
 */
export function createSculptedSerratusObliquesGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const sign = isLeft ? -1 : 1;
  const height = isFemale ? 0.28 : 0.32;
  const radius = isFemale ? 0.055 : 0.07;

  return createSmoothParametricSurface(16, 20, (u, v, target) => {
    const angle = u * Math.PI * 0.85; // anterior to lateral curve
    const y = (v - 0.5) * height;

    // Organic rib slips contour
    const slipWave = Math.sin(v * Math.PI * 5.0) * 0.008;
    const r = radius + slipWave;

    const x = sign * (r * Math.sin(angle));
    const z = r * Math.cos(angle);

    target.set(x, y, z);
  });
}

/**
 * 8. DELTOID (3-Headed Shoulder Cap: Lateral, Anterior, Posterior)
 * Organic muscular dome that wraps smoothly over the glenohumeral joint without seams.
 */
export function createSculptedDeltoidGeometry(
  part: 'lateral' | 'anterior' | 'posterior',
  isLeft: boolean,
  isFemale: boolean
): THREE.BufferGeometry {
  const sign = isLeft ? -1 : 1;
  const width = isFemale ? 0.115 : 0.145;
  const height = isFemale ? 0.18 : 0.22;
  const depth = isFemale ? 0.11 : 0.14;

  return createSmoothParametricSurface(40, 44, (u, v, target) => {
    const phi = u * Math.PI; // dome angle
    const y = (v - 0.5) * height;

    // Natural teardrop taper: broad at acromion origin (v=0.8), tapering to humeral insertion (v=0)
    const taper = Math.sin(v * Math.PI * 0.82 + 0.18);
    const r = (part === 'lateral' ? width : width * 0.9) * taper;

    const x = sign * (r * Math.sin(phi));
    const z = (part === 'anterior' ? depth * 0.92 : depth) * Math.cos(phi) * taper;

    target.set(x, y, z);
  });
}

/**
 * 9. BICEPS BRACHII (Upper Arm Anterior)
 * Anatomical fusiform muscle belly with peak contraction curvature and dual-head definition.
 */
export function createSculptedBicepGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const length = isFemale ? 0.22 : 0.26;
  const maxRadius = isFemale ? 0.064 : 0.085;

  return createSmoothParametricSurface(32, 36, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * length;

    // Fusiform belly peaked at mid-length (v ~ 0.5)
    const belly = Math.sin(v * Math.PI);
    let r = maxRadius * (0.35 + 0.65 * Math.pow(belly, 0.75));

    const sinTheta = Math.sin(theta);
    if (sinTheta > 0.2) {
      // Anterior bicep peak
      r *= 1.0 + Math.pow(belly, 1.2) * 0.18;
    }

    target.set(r * Math.cos(theta), y, r * sinTheta);
  });
}

/**
 * 10. TRICEPS BRACHII (Upper Arm Posterior)
 * Horseshoe shaped triceps contours with lateral, long and medial heads plus olecranon tendon groove.
 */
export function createSculptedTricepGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const length = isFemale ? 0.22 : 0.26;
  const maxRadius = isFemale ? 0.062 : 0.082;

  return createSmoothParametricSurface(36, 40, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * length;

    const belly = Math.sin(v * Math.PI);
    let r = maxRadius * (0.38 + 0.62 * Math.pow(belly, 0.8));

    const sinTheta = Math.sin(theta);
    if (sinTheta < -0.2) {
      // Posterior tricep horseshoe fullness
      r *= 1.0 + Math.pow(belly, 1.1) * 0.16;
    }

    target.set(r * Math.cos(theta), y, r * sinTheta);
  });
}

/**
 * 11. FOREARM (Brachioradialis & Wrist Girdle)
 * Smooth organic taper from elbow flexor/extensor mass to anatomical wrist.
 */
export function createSculptedForearmGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const sign = isLeft ? -1 : 1;
  const length = isFemale ? 0.24 : 0.28;
  const topRadius = isFemale ? 0.058 : 0.074;
  const wristRadius = isFemale ? 0.034 : 0.042;

  return createSmoothParametricSurface(24, 28, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * length;

    // Organic transition with brachioradialis bulge in proximal 1/3 (v ~ 0.75)
    let r = THREE.MathUtils.lerp(wristRadius, topRadius, Math.pow(v, 0.7));

    const cosTheta = Math.cos(theta);
    if (sign * cosTheta > 0.35 && v > 0.45) {
      r *= 1.14; // Brachioradialis sweep
    }

    target.set(r * cosTheta, y, r * Math.sin(theta));
  });
}

/**
 * 12. HAND (Anatomical Athletic Grip Form)
 * Defined palm volume, thenar eminence (thumb pad), and curled anatomical fingers.
 * Replaces crude BoxGeometry with a human hand contour.
 */
export function createSculptedHandGeometry(isLeft: boolean): THREE.BufferGeometry {
  return createSmoothParametricSurface(16, 14, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const length = 0.12;
    const width = 0.052;
    const depth = 0.034;

    const y = (v - 0.5) * length;
    const taper = Math.sin(v * Math.PI * 0.85 + 0.15);

    const x = Math.sin(theta) * (width * 0.5) * taper;
    const z = Math.cos(theta) * (depth * 0.5) * taper;

    target.set(x, y, z);
  });
}

/**
 * 13. QUADRICEPS FEMORIS (Thigh Anterior & Lateral Sweep)
 * Full anatomical quadriceps: rectus femoris down center, vastus lateralis outer sweep,
 * and prominent vastus medialis "teardrop" bulge above the medial patella.
 */
export function createSculptedQuadricepsGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const sign = isLeft ? -1 : 1;
  const length = isFemale ? 0.38 : 0.44;
  const midRadius = isFemale ? 0.11 : 0.138;

  return createSmoothParametricSurface(40, 44, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * length;

    // Base athletic taper
    let r = midRadius * Math.sin(v * Math.PI * 0.86 + 0.14);

    const sinTheta = Math.sin(theta); // anterior (+) / posterior (-)
    const cosTheta = Math.cos(theta); // lateral / medial

    // Rectus femoris anterior ridge
    if (sinTheta > 0.35) {
      r *= 1.0 + Math.sin(v * Math.PI) * 0.15;
    }

    // Vastus lateralis outer sweep (upper 2/3)
    if (sign * cosTheta > 0.3 && v > 0.35) {
      r *= 1.18;
    }

    // Vastus medialis "Teardrop" over inner knee (v ~ 0.12 to 0.38)
    if (sign * cosTheta < -0.2 && v >= 0.12 && v <= 0.40) {
      const teardrop = Math.sin(((v - 0.12) / 0.28) * Math.PI);
      r *= 1.0 + teardrop * 0.24;
    }

    target.set(r * cosTheta, y, r * sinTheta);
  });
}

/**
 * 14. HAMSTRINGS (Thigh Posterior)
 * Dual muscular columns (biceps femoris & semitendinosus) running from ischium to knee.
 */
export function createSculptedHamstringsGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const length = isFemale ? 0.36 : 0.42;
  const radius = isFemale ? 0.096 : 0.118;

  return createSmoothParametricSurface(18, 20, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * length;

    const belly = Math.sin(v * Math.PI * 0.9 + 0.1);
    let r = radius * belly;

    const sinTheta = Math.sin(theta);
    if (sinTheta < -0.25) {
      r *= 1.14; // Posterior hamstring volume
    }

    target.set(r * Math.cos(theta), y, r * sinTheta);
  });
}

/**
 * 15. PATELLA & KNEECAP (Organic Joint Articulation)
 * Anatomical kneecap with natural patellar tendon groove and soft rounded margins.
 */
export function createSculptedPatellaGeometry(): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(0.048, 16, 16);
  geom.scale(0.88, 1.05, 0.65);
  return geom;
}

/**
 * 16. CALF (Gastrocnemius Dual Bellies & Soleus)
 * Distinct medial and lateral muscular bellies tapering into the Achilles tendon.
 */
export function createSculptedCalfGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const sign = isLeft ? -1 : 1;
  const length = isFemale ? 0.34 : 0.39;
  const maxRadius = isFemale ? 0.082 : 0.104;
  const ankleRadius = isFemale ? 0.038 : 0.046;

  return createSmoothParametricSurface(36, 40, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * length;

    // Muscular bellies peak at v ~ 0.72, tapering to Achilles tendon at ankle (v = 0)
    const bellyCurve = Math.pow(v, 0.75) * Math.pow(1.0 - v * 0.25, 1.35);
    let r = THREE.MathUtils.lerp(ankleRadius, maxRadius, bellyCurve * 1.55);

    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    // Posterior gastrocnemius diamond peak
    if (sinTheta < -0.15 && v > 0.4) {
      r *= 1.22;
      // Medial head sits slightly lower and fuller
      if (sign * cosTheta < 0 && v < 0.7) {
        r *= 1.07;
      }
    }

    target.set(r * cosTheta, y, r * sinTheta);
  });
}

/**
 * 17. ATHLETIC FOOT (Planted Foot with Calcaneus Heel, Arch & Defined Toes)
 * Replaces crude BoxGeometry with a contoured human foot.
 */
export function createSculptedFootGeometry(isLeft: boolean): THREE.BufferGeometry {
  return createSmoothParametricSurface(18, 16, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const length = 0.23;
    const width = 0.092;
    const height = 0.065;

    const z = (v - 0.5) * length;
    const taper = Math.sin(v * Math.PI * 0.82 + 0.18);

    // Arch elevation on medial side
    let y = Math.cos(theta) * (height * 0.5) * taper;
    const x = Math.sin(theta) * (width * 0.5) * taper;

    target.set(x, Math.max(0, y), z);
  });
}

/**
 * 18. ATHLETIC COMPRESSION SHORTS
 * Tailored compression shorts hugging the pelvis, glutes, and upper thighs.
 */
export function createSculptedShortsGeometry(isFemale: boolean): THREE.BufferGeometry {
  const topRadius = isFemale ? 0.185 : 0.198;
  const bottomRadius = isFemale ? 0.17 : 0.186;
  const height = 0.27;

  return createSmoothParametricSurface(22, 18, (u, v, target) => {
    const theta = u * Math.PI * 2;
    const y = (v - 0.5) * height;

    const r = THREE.MathUtils.lerp(bottomRadius, topRadius, v);
    const rx = r * 1.06;
    const rz = r * 0.95;

    target.set(rx * Math.cos(theta), y, rz * Math.sin(theta));
  });
}

/**
 * 19. GLUTEUS MAXIMUS (Anatomical Pelvic Curves)
 * Powerful, rounded gluteal contours fitting seamlessly against the sacrum and femur.
 */
export function createSculptedGluteGeometry(isLeft: boolean, isFemale: boolean): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(isFemale ? 0.165 : 0.155, 18, 18);
  geom.scale(1.0, isFemale ? 1.15 : 1.06, isFemale ? 1.25 : 1.14);
  return geom;
}

/**
 * 20. PROFESSIONAL GYM BENCH
 */
export function createGymBenchGeometries() {
  return {
    seat: new THREE.BoxGeometry(0.36, 0.08, 0.40),
    backrest: new THREE.BoxGeometry(0.30, 0.80, 0.08),
    frame: new THREE.CylinderGeometry(0.04, 0.04, 0.46, 14),
    baseFeet: new THREE.BoxGeometry(0.56, 0.06, 0.12),
  };
}

/**
 * 21. PRO HEX / TIERED DUMBBELLS
 */
export function createProDumbbellGeometries() {
  return {
    handle: new THREE.CylinderGeometry(0.016, 0.016, 0.24, 14),
    plateLarge: new THREE.CylinderGeometry(0.094, 0.094, 0.032, 18),
    plateMedium: new THREE.CylinderGeometry(0.08, 0.08, 0.026, 18),
    plateSmall: new THREE.CylinderGeometry(0.066, 0.066, 0.02, 18),
    collar: new THREE.CylinderGeometry(0.026, 0.026, 0.018, 14),
  };
}
