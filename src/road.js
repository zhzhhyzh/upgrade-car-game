import * as THREE from 'three';
import { ROAD_WIDTH, CHUNK_LENGTH, CHUNK_BUFFER } from './constants.js';

const chunks = [];
let scene;

// Materials (shared)
const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.85 });
const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7 });
const buildingColors = [0x8899aa, 0x99776a, 0x6688aa, 0x777788, 0xaa8866, 0x556677];

export function initRoad(sceneRef) {
  scene = sceneRef;
  // Pre-generate initial chunks
  for (let i = 0; i < CHUNK_BUFFER; i++) {
    createChunk(-i * CHUNK_LENGTH);
  }
}

function createChunk(zStart) {
  const group = new THREE.Group();
  group.userData.zStart = zStart;

  // Road surface
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_WIDTH, CHUNK_LENGTH),
    roadMat
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, zStart - CHUNK_LENGTH / 2);
  road.receiveShadow = true;
  group.add(road);

  // Lane lines (dashed center lines)
  for (let lane = -1; lane <= 1; lane += 2) {
    const lx = lane * (ROAD_WIDTH / 3 / 2 + ROAD_WIDTH / 6);
    for (let d = 0; d < CHUNK_LENGTH; d += 4) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 2),
        lineMat
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(lane * (ROAD_WIDTH / 3), 0.02, zStart - d);
      group.add(dash);
    }
  }

  // Sidewalks
  for (const side of [-1, 1]) {
    const sw = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.3, CHUNK_LENGTH),
      sidewalkMat
    );
    sw.position.set(side * (ROAD_WIDTH / 2 + 1), 0.15, zStart - CHUNK_LENGTH / 2);
    sw.receiveShadow = true;
    group.add(sw);
  }

  // Buildings on both sides
  for (const side of [-1, 1]) {
    const buildingCount = 2 + Math.floor(Math.random() * 2);
    for (let b = 0; b < buildingCount; b++) {
      const h = 6 + Math.random() * 18;
      const w = 3 + Math.random() * 4;
      const d = 3 + Math.random() * 4;
      const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      bldg.position.set(
        side * (ROAD_WIDTH / 2 + 3 + Math.random() * 5),
        h / 2,
        zStart - (b / buildingCount) * CHUNK_LENGTH - Math.random() * 8
      );
      bldg.castShadow = true;
      bldg.receiveShadow = true;
      group.add(bldg);
    }

    // Street lamps
    if (Math.random() > 0.3) {
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 5, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(side * (ROAD_WIDTH / 2 + 0.5), 2.5, zStart - CHUNK_LENGTH / 2);
      group.add(pole);

      const lampGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 0.3 });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(side * (ROAD_WIDTH / 2 + 0.5), 5.2, zStart - CHUNK_LENGTH / 2);
      group.add(lamp);
    }
  }

  scene.add(group);
  chunks.push(group);
  return group;
}

export function updateRoad(carZ) {
  // Find the furthest chunk
  let minZ = Infinity;
  for (const c of chunks) {
    if (c.userData.zStart < minZ) minZ = c.userData.zStart;
  }

  // If car is getting close to the last chunk, add a new one
  const neededZ = carZ - CHUNK_BUFFER * CHUNK_LENGTH;
  while (minZ > neededZ) {
    minZ -= CHUNK_LENGTH;
    createChunk(minZ);
  }

  // Remove chunks far behind the car
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i].userData.zStart > carZ + CHUNK_LENGTH * 2) {
      scene.remove(chunks[i]);
      chunks[i].traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
      chunks.splice(i, 1);
    }
  }
}

export function resetRoad() {
  for (const c of chunks) {
    scene.remove(c);
    c.traverse(child => {
      if (child.geometry) child.geometry.dispose();
    });
  }
  chunks.length = 0;
  for (let i = 0; i < CHUNK_BUFFER; i++) {
    createChunk(-i * CHUNK_LENGTH);
  }
}
