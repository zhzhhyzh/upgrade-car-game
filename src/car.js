import * as THREE from 'three';
import { TIERS, MAX_TIER } from './constants.js';

let carGroup;
let currentTier = 0;
let targetTier = 0;
let transitionProgress = 1; // 1 = done

// Cached tier meshes
const tierMeshes = [];
let scene;

export function initCar(sceneRef) {
  scene = sceneRef;
  carGroup = new THREE.Group();
  carGroup.position.set(0, 0, 0);

  // Build all 7 tier meshes
  for (let t = 0; t <= MAX_TIER; t++) {
    const mesh = buildTierMesh(t);
    mesh.visible = t === 0;
    carGroup.add(mesh);
    tierMeshes.push(mesh);
  }

  scene.add(carGroup);
  return carGroup;
}

function buildTierMesh(tier) {
  const cfg = TIERS[tier];
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    metalness: cfg.metalness,
    roughness: cfg.roughness,
  });

  // ── Body dimensions per tier ──
  let bodyW, bodyH, bodyL, cabinH, cabinW, cabinL, cabinY;

  switch (tier) {
    case 0: // Junk Heap
      bodyW = 1.8; bodyH = 0.7; bodyL = 3.2;
      cabinH = 0.7; cabinW = 1.6; cabinL = 1.6; cabinY = 0.7;
      break;
    case 1: // Rusty Beater
      bodyW = 1.8; bodyH = 0.65; bodyL = 3.4;
      cabinH = 0.65; cabinW = 1.6; cabinL = 1.8; cabinY = 0.65;
      break;
    case 2: // City Sedan
      bodyW = 1.9; bodyH = 0.6; bodyL = 3.8;
      cabinH = 0.6; cabinW = 1.7; cabinL = 1.8; cabinY = 0.6;
      break;
    case 3: // Sports Coupe
      bodyW = 2.0; bodyH = 0.5; bodyL = 4.0;
      cabinH = 0.45; cabinW = 1.6; cabinL = 1.4; cabinY = 0.5;
      break;
    case 4: // Neon Racer
      bodyW = 2.05; bodyH = 0.45; bodyL = 4.2;
      cabinH = 0.4; cabinW = 1.55; cabinL = 1.3; cabinY = 0.45;
      break;
    case 5: // Cyber GT
      bodyW = 2.1; bodyH = 0.42; bodyL = 4.4;
      cabinH = 0.36; cabinW = 1.5; cabinL = 1.2; cabinY = 0.42;
      break;
    case 6: // Hyperion X
      bodyW = 2.15; bodyH = 0.4; bodyL = 4.6;
      cabinH = 0.32; cabinW = 1.45; cabinL = 1.1; cabinY = 0.4;
      break;
  }

  // ── Main body ──
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyL), mat);
  body.position.y = bodyH / 2 + 0.35;
  body.castShadow = true;
  group.add(body);

  // ── Cabin ──
  let cabinMat;
  if (tier >= 4) {
    // Cyber tinted windshield
    cabinMat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      metalness: 0.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.75,
    });
  } else if (tier >= 3) {
    cabinMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.3, roughness: 0.4 });
  } else {
    cabinMat = new THREE.MeshStandardMaterial({
      color: 0x88bbdd, metalness: 0.1, roughness: 0.3, transparent: true, opacity: 0.7,
    });
  }

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinW, cabinH, cabinL), cabinMat);
  cabin.position.y = cabinY + cabinH / 2 + 0.35;
  cabin.position.z = tier >= 3 ? 0.2 : 0;
  cabin.castShadow = true;
  group.add(cabin);

  // ── Wheels ──
  const wheelRadius = tier >= 4 ? 0.34 : 0.3;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.22, 16);
  const wheelMat = new THREE.MeshStandardMaterial({
    color: tier >= 4 ? 0x1a1a1a : 0x111111,
    metalness: tier >= 4 ? 0.6 : 0.2,
    roughness: 0.6,
  });
  const wheelPositions = [
    [-bodyW / 2, wheelRadius, bodyL / 2 - 0.6],
    [bodyW / 2, wheelRadius, bodyL / 2 - 0.6],
    [-bodyW / 2, wheelRadius, -bodyL / 2 + 0.6],
    [bodyW / 2, wheelRadius, -bodyL / 2 + 0.6],
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    group.add(wheel);

    // Rim accent for tier 3+
    if (tier >= 3) {
      const rimColor = cfg.neonColor || 0xcccccc;
      const rimMat = new THREE.MeshStandardMaterial({
        color: rimColor, emissive: rimColor, emissiveIntensity: tier >= 4 ? 0.4 : 0.15,
        metalness: 0.8, roughness: 0.2,
      });
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius * 0.55, wheelRadius * 0.55, 0.24, 8),
        rimMat
      );
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, wy, wz);
      group.add(rim);
    }
  }

  // ── Headlights ──
  const lightGeo = new THREE.SphereGeometry(0.13, 8, 8);
  const headlightEmissive = tier >= 4 ? (cfg.neonColor || 0xffffff) : 0xffffaa;
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffffee,
    emissive: headlightEmissive,
    emissiveIntensity: tier >= 4 ? 1.2 : 0.8,
  });
  for (const side of [-1, 1]) {
    const headlight = new THREE.Mesh(lightGeo, lightMat);
    headlight.position.set(side * (bodyW / 2 - 0.25), bodyH / 2 + 0.35, -bodyL / 2);
    group.add(headlight);
  }

  // ── Taillights ──
  const tailColor = tier >= 4 ? (cfg.neonColor || 0xff0000) : 0xff0000;
  const tailMat = new THREE.MeshStandardMaterial({
    color: tailColor, emissive: tailColor, emissiveIntensity: tier >= 4 ? 0.9 : 0.5,
  });
  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(lightGeo, tailMat);
    tail.position.set(side * (bodyW / 2 - 0.25), bodyH / 2 + 0.35, bodyL / 2);
    group.add(tail);
  }

  // ── Spoiler for tier 3+ ──
  if (tier >= 3) {
    const spoilerColor = tier >= 5 ? 0x222233 : cfg.color;
    const spoilerMat = new THREE.MeshStandardMaterial({
      color: spoilerColor, metalness: 0.7, roughness: 0.2,
    });
    const spoilerW = tier >= 5 ? bodyW * 1.0 : bodyW * 0.9;
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(spoilerW, 0.06, 0.4), spoilerMat);
    spoiler.position.set(0, bodyH + 0.55, bodyL / 2 - 0.2);
    group.add(spoiler);
    for (const side of [-0.35, 0.35]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.06), spoilerMat);
      support.position.set(side, bodyH + 0.4, bodyL / 2 - 0.2);
      group.add(support);
    }

    // Neon strip on spoiler for tier 5+
    if (tier >= 5 && cfg.neonColor) {
      const stripMat = new THREE.MeshStandardMaterial({
        color: cfg.neonColor, emissive: cfg.neonColor, emissiveIntensity: 1.0,
        transparent: true, opacity: 0.9,
      });
      const strip = new THREE.Mesh(new THREE.BoxGeometry(spoilerW - 0.2, 0.03, 0.1), stripMat);
      strip.position.set(0, bodyH + 0.59, bodyL / 2 - 0.2);
      group.add(strip);
    }
  }

  // ── NEON UNDERGLOW (tier 2+) ──
  if (cfg.neonColor) {
    const neonMat = new THREE.MeshStandardMaterial({
      color: cfg.neonColor,
      emissive: cfg.neonColor,
      emissiveIntensity: tier >= 5 ? 1.5 : (tier >= 4 ? 1.0 : 0.6),
      transparent: true,
      opacity: 0.8,
    });

    // Side strips
    for (const side of [-1, 1]) {
      const sideStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, bodyL * 0.8),
        neonMat
      );
      sideStrip.position.set(side * (bodyW / 2 + 0.02), 0.12, 0);
      group.add(sideStrip);
    }

    // Front strip
    const frontStrip = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.7, 0.06, 0.06),
      neonMat
    );
    frontStrip.position.set(0, 0.12, -bodyL / 2 + 0.1);
    group.add(frontStrip);

    // Rear strip
    const rearStrip = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.7, 0.06, 0.06),
      neonMat
    );
    rearStrip.position.set(0, 0.12, bodyL / 2 - 0.1);
    group.add(rearStrip);

    // Underglow point light for tier 4+
    if (tier >= 4) {
      const glowLight = new THREE.PointLight(cfg.neonColor, 2, 6);
      glowLight.position.set(0, 0.15, 0);
      group.add(glowLight);
    }
  }

  // ── CYBER BODY LINES (tier 4+) ──
  if (tier >= 4 && cfg.neonColor) {
    const lineMat = new THREE.MeshStandardMaterial({
      color: cfg.neonColor,
      emissive: cfg.neonColor,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.9,
    });

    // Hood lines
    for (const offset of [-0.3, 0.3]) {
      const hoodLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.02, bodyL * 0.4),
        lineMat
      );
      hoodLine.position.set(offset, bodyH + 0.36, -bodyL * 0.15);
      group.add(hoodLine);
    }

    // Side accent stripe
    for (const side of [-1, 1]) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.08, bodyL * 0.6),
        lineMat
      );
      stripe.position.set(side * (bodyW / 2 + 0.01), bodyH / 2 + 0.35, -0.2);
      group.add(stripe);
    }
  }

  // ── EXHAUST PIPES (tier 3+) ──
  if (tier >= 3) {
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.3 });
    const pipeCount = tier >= 5 ? 2 : 1;
    for (let p = 0; p < pipeCount; p++) {
      for (const side of [-1, 1]) {
        const pipe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8),
          exhaustMat
        );
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(
          side * (bodyW / 2 - 0.3 - p * 0.2),
          0.2,
          bodyL / 2 + 0.15
        );
        group.add(pipe);
      }
    }

    // Exhaust glow for tier 5+
    if (tier >= 5 && cfg.neonColor) {
      const glowMat = new THREE.MeshStandardMaterial({
        color: cfg.neonColor, emissive: cfg.neonColor, emissiveIntensity: 0.6,
      });
      for (const side of [-1, 1]) {
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), glowMat);
        glow.position.set(side * (bodyW / 2 - 0.3), 0.2, bodyL / 2 + 0.3);
        group.add(glow);
      }
    }
  }

  // ── FRONT SPLITTER (tier 4+) ──
  if (tier >= 4) {
    const splitterMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, metalness: 0.7, roughness: 0.3,
    });
    const splitter = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 1.1, 0.05, 0.35),
      splitterMat
    );
    splitter.position.set(0, 0.15, -bodyL / 2 - 0.1);
    group.add(splitter);

    // Neon edge on splitter
    if (cfg.neonColor) {
      const edgeMat = new THREE.MeshStandardMaterial({
        color: cfg.neonColor, emissive: cfg.neonColor, emissiveIntensity: 0.8,
      });
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(bodyW * 1.1, 0.02, 0.04),
        edgeMat
      );
      edge.position.set(0, 0.16, -bodyL / 2 - 0.26);
      group.add(edge);
    }
  }

  // ── ROOF SCOOP / ANTENNA (tier 5+) ──
  if (tier >= 5) {
    const scoopMat = new THREE.MeshStandardMaterial({
      color: 0x111111, metalness: 0.8, roughness: 0.2,
    });
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.4), scoopMat);
    scoop.position.set(0, cabinY + cabinH + 0.41, -0.1);
    group.add(scoop);

    // Neon accent on scoop
    if (cfg.neonColor) {
      const accentMat = new THREE.MeshStandardMaterial({
        color: cfg.neonColor, emissive: cfg.neonColor, emissiveIntensity: 1.0,
      });
      const accent = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.3), accentMat);
      accent.position.set(0, cabinY + cabinH + 0.48, -0.1);
      group.add(accent);
    }
  }

  // ── "Rust spots" for tier 0 ──
  if (tier === 0) {
    const rustMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 1.0 });
    for (let i = 0; i < 5; i++) {
      const spot = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 + Math.random() * 0.12, 6, 6),
        rustMat
      );
      spot.position.set(
        (Math.random() - 0.5) * bodyW,
        bodyH / 2 + 0.35 + (Math.random() - 0.5) * bodyH * 0.5,
        (Math.random() - 0.5) * bodyL
      );
      spot.scale.y = 0.3;
      group.add(spot);
    }
  }

  // ── Dents for tier 1 ──
  if (tier === 1) {
    const dentMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95 });
    for (let i = 0; i < 3; i++) {
      const dent = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 5), dentMat);
      dent.position.set(
        (Math.random() - 0.5) * bodyW * 0.9,
        bodyH / 2 + 0.35 + (Math.random() - 0.5) * bodyH * 0.4,
        (Math.random() - 0.5) * bodyL * 0.8
      );
      dent.scale.y = 0.25;
      group.add(dent);
    }
  }

  group.scale.setScalar(cfg.scale);
  return group;
}

export function setTier(newTier) {
  newTier = Math.max(0, Math.min(MAX_TIER, newTier));
  if (newTier === currentTier) return;

  tierMeshes[currentTier].visible = false;
  tierMeshes[newTier].visible = true;

  tierMeshes[newTier].scale.setScalar(0.01);
  targetTier = newTier;
  transitionProgress = 0;
  currentTier = newTier;
}

export function getTier() { return currentTier; }
export function getCarGroup() { return carGroup; }

export function updateCar(dt) {
  if (transitionProgress < 1) {
    transitionProgress = Math.min(1, transitionProgress + dt * 5);
    const s = TIERS[currentTier].scale;
    const t = transitionProgress;
    const overshoot = 1 + 0.3 * Math.sin(t * Math.PI);
    tierMeshes[currentTier].scale.setScalar(s * t * overshoot);
  }

  // Animate neon glow pulse for high tiers
  if (currentTier >= 4) {
    const time = performance.now() * 0.001;
    const mesh = tierMeshes[currentTier];
    mesh.traverse((child) => {
      if (child.material && child.material.emissiveIntensity !== undefined && child.material.emissive) {
        const r = child.material.emissive.r;
        const g = child.material.emissive.g;
        const b = child.material.emissive.b;
        if (r + g + b > 0.1) {
          // Subtle pulse
          const base = child.userData.baseEmissive || child.material.emissiveIntensity;
          if (!child.userData.baseEmissive) child.userData.baseEmissive = base;
          child.material.emissiveIntensity = base * (0.85 + 0.15 * Math.sin(time * 4));
        }
      }
    });
  }
}

export function resetCar() {
  for (let t = 0; t <= MAX_TIER; t++) {
    tierMeshes[t].visible = t === 0;
    tierMeshes[t].scale.setScalar(TIERS[t].scale);
  }
  currentTier = 0;
  targetTier = 0;
  transitionProgress = 1;
  carGroup.position.set(0, 0, 0);
}
