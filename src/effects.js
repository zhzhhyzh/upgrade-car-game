import * as THREE from 'three';
import { getCamera, getScene } from './scene.js';

// ── Screen Flash ──
const flashEl = document.getElementById('flash-overlay');

export function flashScreen(type) {
  if (!flashEl) return;
  flashEl.style.background = type === 'upgrade'
    ? 'radial-gradient(circle, rgba(0,255,100,0.4) 0%, transparent 70%)'
    : 'radial-gradient(circle, rgba(255,50,50,0.4) 0%, transparent 70%)';
  flashEl.style.opacity = '1';
  setTimeout(() => { flashEl.style.opacity = '0'; }, 200);
}

// ── Camera Shake ──
let shakeIntensity = 0;
let shakeDecay = 8;

export function triggerCameraShake() {
  shakeIntensity = 0.4;
}

export function updateCameraShake(dt) {
  if (shakeIntensity > 0.01) {
    const camera = getCamera();
    camera.position.x += (Math.random() - 0.5) * shakeIntensity;
    camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.5;
    shakeIntensity *= Math.max(0, 1 - shakeDecay * dt);
  }
}

// ── Particles ──
const particles = []; // { mesh, velocity, life }

export function spawnParticles(position, color) {
  const scene = getScene();
  const count = 15;
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });

  for (let i = 0; i < count; i++) {
    const size = 0.08 + Math.random() * 0.12;
    const geo = new THREE.BoxGeometry(size, size, size);
    const mesh = new THREE.Mesh(geo, mat.clone());
    mesh.position.copy(position);
    mesh.position.y += 1 + Math.random();

    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      2 + Math.random() * 4,
      (Math.random() - 0.5) * 4
    );

    scene.add(mesh);
    particles.push({ mesh, velocity, life: 1.0 });
  }
}

export function updateParticles(dt) {
  const scene = getScene();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt * 2;
    p.velocity.y -= 9.8 * dt; // gravity
    p.mesh.position.addScaledVector(p.velocity, dt);
    p.mesh.material.opacity = Math.max(0, p.life);
    p.mesh.rotation.x += dt * 5;
    p.mesh.rotation.y += dt * 3;

    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      particles.splice(i, 1);
    }
  }
}

export function resetParticles() {
  const scene = getScene();
  for (const p of particles) {
    scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    p.mesh.material.dispose();
  }
  particles.length = 0;
  shakeIntensity = 0;
}
