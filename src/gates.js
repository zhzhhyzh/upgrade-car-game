import * as THREE from 'three';
import { GATE_INTERVAL, GATE_START_Z, TRACK_LENGTH, ROAD_WIDTH, ROAD_HALF, MAX_TIER } from './constants.js';
import { getTier, setTier } from './car.js';
import { flashScreen, spawnParticles, triggerCameraShake } from './effects.js';

const gates = [];      // { mesh, z, type: 'upgrade'|'downgrade', hit: false }
let scene;

const GATE_WIDTH = 3.2;
const GATE_HEIGHT = 4;
const COLLISION_DIST_Z = 2.5;
const COLLISION_DIST_X = 1.8;

export function initGates(sceneRef) {
  scene = sceneRef;
  spawnAllGates();
}

function spawnAllGates() {
  let z = -GATE_START_Z;
  while (z > -TRACK_LENGTH + 20) {
    // Decide: mostly upgrades early, mixed later
    const progress = Math.abs(z) / TRACK_LENGTH;
    const upgradeChance = 0.55 - progress * 0.15; // gradually harder

    // Place 1-2 gates per row
    const gateCount = Math.random() > 0.4 ? 2 : 1;
    const usedLanes = [];

    for (let g = 0; g < gateCount; g++) {
      let lane;
      do {
        lane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
      } while (usedLanes.includes(lane));
      usedLanes.push(lane);

      const isUpgrade = Math.random() < upgradeChance;
      const x = lane * (ROAD_WIDTH / 3);
      createGate(x, z, isUpgrade);
    }

    z -= GATE_INTERVAL;
  }
}

function createGate(x, z, isUpgrade) {
  const group = new THREE.Group();
  const color = isUpgrade ? 0x00ff66 : 0xff3333;
  const emissive = isUpgrade ? 0x00cc44 : 0xcc0000;

  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.85,
    roughness: 0.3,
    metalness: 0.2,
  });

  // Left pillar
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, GATE_HEIGHT, 0.3), mat);
  pillar.position.set(-GATE_WIDTH / 2, GATE_HEIGHT / 2, 0);
  group.add(pillar);

  // Right pillar
  const pillar2 = pillar.clone();
  pillar2.position.set(GATE_WIDTH / 2, GATE_HEIGHT / 2, 0);
  group.add(pillar2);

  // Top bar
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(GATE_WIDTH + 0.3, 0.3, 0.3), mat);
  topBar.position.set(0, GATE_HEIGHT, 0);
  group.add(topBar);

  // Arrow indicator
  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: color,
    emissiveIntensity: 1.0,
  });
  if (isUpgrade) {
    // Up arrow (triangle)
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.6);
    shape.lineTo(-0.4, -0.2);
    shape.lineTo(0.4, -0.2);
    shape.closePath();
    const arrowGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(0, GATE_HEIGHT / 2 + 0.5, 0);
    group.add(arrow);
  } else {
    // Down arrow
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.6);
    shape.lineTo(-0.4, 0.2);
    shape.lineTo(0.4, 0.2);
    shape.closePath();
    const arrowGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(0, GATE_HEIGHT / 2 + 0.5, 0);
    group.add(arrow);
  }

  // Glowing floor strip
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(GATE_WIDTH, 0.6),
    new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.8, transparent: true, opacity: 0.5 })
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(0, 0.03, 0);
  group.add(strip);

  group.position.set(x, 0, z);
  scene.add(group);

  gates.push({ mesh: group, z, x, type: isUpgrade ? 'upgrade' : 'downgrade', hit: false });
}

export function checkCollisions(carGroup) {
  const carZ = carGroup.position.z;
  const carX = carGroup.position.x;

  for (const gate of gates) {
    if (gate.hit) continue;
    const dz = Math.abs(carZ - gate.z);
    const dx = Math.abs(carX - gate.x);

    if (dz < COLLISION_DIST_Z && dx < COLLISION_DIST_X) {
      gate.hit = true;
      gate.mesh.visible = false;

      if (gate.type === 'upgrade') {
        const newTier = getTier() + 1;
        if (newTier <= MAX_TIER) {
          setTier(newTier);
          flashScreen('upgrade');
          spawnParticles(carGroup.position, 0x00ff66);
        }
      } else {
        const newTier = getTier() - 1;
        if (newTier >= 0) {
          setTier(newTier);
          flashScreen('downgrade');
          spawnParticles(carGroup.position, 0xff3333);
          triggerCameraShake();
        }
      }
    }
  }
}

export function updateGates(dt) {
  // Animate gates (subtle floating)
  const time = performance.now() * 0.001;
  for (const gate of gates) {
    if (gate.hit) continue;
    // Subtle pulse
    const pulse = 1 + 0.03 * Math.sin(time * 3 + gate.z);
    gate.mesh.scale.setScalar(pulse);
  }
}

export function resetGates() {
  for (const gate of gates) {
    scene.remove(gate.mesh);
    gate.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
  gates.length = 0;
  spawnAllGates();
}
