import { STEER_SPEED, ROAD_HALF } from './constants.js';

let steerInput = 0; // -1 left, 0 center, +1 right
let touchStartX = 0;
let isTouching = false;

export function initControls() {
  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') steerInput = -1;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') steerInput = 1;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') { if (steerInput === -1) steerInput = 0; }
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') { if (steerInput === 1) steerInput = 0; }
  });

  // Touch / Drag
  const canvas = document.querySelector('canvas');
  if (canvas) {
    canvas.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      isTouching = true;
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!isTouching) return;
      const dx = e.touches[0].clientX - touchStartX;
      const threshold = 10;
      if (dx > threshold) steerInput = 1;
      else if (dx < -threshold) steerInput = -1;
      else steerInput = 0;
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      isTouching = false;
      steerInput = 0;
    });

    // Mouse drag fallback for desktop testing
    canvas.addEventListener('mousedown', (e) => {
      touchStartX = e.clientX;
      isTouching = true;
    });
    window.addEventListener('mousemove', (e) => {
      if (!isTouching) return;
      const dx = e.clientX - touchStartX;
      const threshold = 10;
      if (dx > threshold) steerInput = 1;
      else if (dx < -threshold) steerInput = -1;
      else steerInput = 0;
    });
    window.addEventListener('mouseup', () => {
      isTouching = false;
      steerInput = 0;
    });
  }

  // Show touch hint on mobile
  if ('ontouchstart' in window) {
    const hint = document.getElementById('touch-hint');
    if (hint) hint.style.display = 'block';
  }
}

export function applyControls(carGroup, dt) {
  const moveX = steerInput * STEER_SPEED * dt;
  carGroup.position.x += moveX;
  // Clamp to road
  carGroup.position.x = Math.max(-ROAD_HALF, Math.min(ROAD_HALF, carGroup.position.x));

  // Slight tilt when steering
  const targetRotZ = -steerInput * 0.06;
  carGroup.rotation.z += (targetRotZ - carGroup.rotation.z) * 5 * dt;
}
