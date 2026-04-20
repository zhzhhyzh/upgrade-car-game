import * as THREE from 'three';
import { initScene, getScene, getCamera, getRenderer } from './scene.js';
import { initRoad, updateRoad, resetRoad } from './road.js';
import { initCar, getCarGroup, getTier, updateCar, resetCar } from './car.js';
import { initControls, applyControls } from './controls.js';
import { initGates, checkCollisions, updateGates, resetGates } from './gates.js';
import { updateParticles, updateCameraShake, resetParticles } from './effects.js';
import {
  showStartScreen, hideStartScreen, showHUD, updateHUD,
  showEndScreen, hideEndScreen, onStartClick, onPlayAgainClick
} from './ui.js';
import { getState, setState } from './gameState.js';
import { CAR_SPEED, TRACK_LENGTH, TIERS } from './constants.js';

// ── Finish Line ──
let finishLine;

function createFinishLine(sceneRef) {
  const group = new THREE.Group();
  const size = 1;
  const cols = 12;
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isWhite = (r + c) % 2 === 0;
      const mat = new THREE.MeshStandardMaterial({ color: isWhite ? 0xffffff : 0x111111 });
      const tile = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.1), mat);
      tile.position.set((c - cols / 2 + 0.5) * size, (r + 0.5) * size + 0.2, 0);
      group.add(tile);
    }
  }
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.5 });
  const banner = new THREE.Mesh(new THREE.BoxGeometry(cols * size + 1, 0.8, 0.15), bannerMat);
  banner.position.set(0, rows * size + 0.8, 0);
  group.add(banner);

  group.position.set(0, 0, -TRACK_LENGTH);
  sceneRef.add(group);
  return group;
}

// ══════════════════════════════════════
//  REALISTIC ENGINE SOUND SYSTEM
// ══════════════════════════════════════
let audioCtx;

function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* */ }
  }
  return audioCtx;
}

// ── Multi-oscillator engine per tier ──
let engineNodes = null;  // { oscs: [], gains: [], masterGain }

function createEngineForTier(tierIndex) {
  const ctx = getAudioCtx();
  if (!ctx) return null;

  const cfg = TIERS[tierIndex];
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);

  const oscs = [];
  const gains = [];

  // Layer 1: Base rumble (low freq)
  const baseOsc = ctx.createOscillator();
  const baseGain = ctx.createGain();
  baseOsc.type = cfg.engineType;
  baseOsc.frequency.value = cfg.enginePitch;
  baseGain.gain.value = 0.5;
  baseOsc.connect(baseGain);
  baseGain.connect(masterGain);
  oscs.push(baseOsc);
  gains.push(baseGain);

  // Layer 2: First harmonic (adds body)
  const harm1 = ctx.createOscillator();
  const harm1Gain = ctx.createGain();
  harm1.type = tierIndex >= 4 ? 'square' : 'sawtooth';
  harm1.frequency.value = cfg.enginePitch * 2;
  harm1Gain.gain.value = tierIndex >= 3 ? 0.18 : 0.08;
  harm1.connect(harm1Gain);
  harm1Gain.connect(masterGain);
  oscs.push(harm1);
  gains.push(harm1Gain);

  // Layer 3: High crackle/sizzle for sporty tiers
  if (tierIndex >= 3) {
    const crackle = ctx.createOscillator();
    const crackleGain = ctx.createGain();
    crackle.type = 'sawtooth';
    crackle.frequency.value = cfg.enginePitch * 3.5;
    crackleGain.gain.value = tierIndex >= 5 ? 0.07 : 0.04;
    crackle.connect(crackleGain);
    crackleGain.connect(masterGain);
    oscs.push(crackle);
    gains.push(crackleGain);
  }

  // Layer 4: Sub-bass thump for cyber tiers
  if (tierIndex >= 4) {
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.value = cfg.enginePitch * 0.5;
    subGain.gain.value = 0.15;
    sub.connect(subGain);
    subGain.connect(masterGain);
    oscs.push(sub);
    gains.push(subGain);
  }

  // Layer 5: Noise-like texture via detuned oscillator for top tiers
  if (tierIndex >= 5) {
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.type = 'sawtooth';
    noise.frequency.value = cfg.enginePitch * 5.1; // slightly detuned for grit
    noiseGain.gain.value = 0.025;
    noise.connect(noiseGain);
    noiseGain.connect(masterGain);
    oscs.push(noise);
    gains.push(noiseGain);
  }

  // Apply a slight vibrato/wobble to base for realism
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = tierIndex >= 4 ? 6 : 3; // faster wobble for sportier
  lfoGain.gain.value = cfg.enginePitch * 0.02; // subtle pitch modulation
  lfo.connect(lfoGain);
  lfoGain.connect(baseOsc.frequency);
  oscs.push(lfo);
  gains.push(lfoGain);

  // Start all oscillators
  for (const o of oscs) o.start();

  return { oscs, gains, masterGain, targetVol: cfg.engineVol };
}

function startEngine(tierIndex) {
  stopEngine();
  engineNodes = createEngineForTier(tierIndex);
  if (!engineNodes) return;

  const ctx = getAudioCtx();
  // Fade in
  engineNodes.masterGain.gain.setValueAtTime(0, ctx.currentTime);
  engineNodes.masterGain.gain.linearRampToValueAtTime(engineNodes.targetVol, ctx.currentTime + 0.3);
}

function stopEngine() {
  if (!engineNodes) return;
  try {
    const ctx = getAudioCtx();
    engineNodes.masterGain.gain.setValueAtTime(engineNodes.masterGain.gain.value, ctx.currentTime);
    engineNodes.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    const nodes = engineNodes;
    setTimeout(() => {
      for (const o of nodes.oscs) { try { o.stop(); } catch (e) { /* */ } }
    }, 200);
  } catch (e) { /* */ }
  engineNodes = null;
}

function switchEngineTier(tierIndex) {
  // Smoothly transition engine to new tier's sound
  stopEngine();
  engineNodes = createEngineForTier(tierIndex);
  if (!engineNodes) return;

  const ctx = getAudioCtx();
  // Quick fade in
  engineNodes.masterGain.gain.setValueAtTime(0, ctx.currentTime);
  engineNodes.masterGain.gain.linearRampToValueAtTime(engineNodes.targetVol, ctx.currentTime + 0.15);
}

// ── Startup Rev Sound (played on each tier change) ──
function playStartupRev(tierIndex) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const cfg = TIERS[tierIndex];
  const basePitch = cfg.enginePitch;
  const duration = tierIndex >= 4 ? 0.6 : 0.4;

  // Main rev sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = cfg.engineType;
  osc.frequency.setValueAtTime(basePitch * 0.6, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(basePitch * 2.2, ctx.currentTime + duration * 0.4);
  osc.frequency.exponentialRampToValueAtTime(basePitch * 1.2, ctx.currentTime + duration);
  gain.gain.setValueAtTime(cfg.engineVol * 2.5, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(cfg.engineVol * 1.5, ctx.currentTime + duration * 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.05);

  // Second harmonic for thickness
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(basePitch * 1.2, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(basePitch * 4.0, ctx.currentTime + duration * 0.35);
  osc2.frequency.exponentialRampToValueAtTime(basePitch * 2.0, ctx.currentTime + duration);
  gain2.gain.setValueAtTime(cfg.engineVol * 1.0, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start();
  osc2.stop(ctx.currentTime + duration + 0.05);

  // Pop/backfire for high tiers
  if (tierIndex >= 4) {
    const pop = ctx.createOscillator();
    const popGain = ctx.createGain();
    pop.type = 'square';
    pop.frequency.setValueAtTime(basePitch * 6, ctx.currentTime + duration * 0.35);
    pop.frequency.exponentialRampToValueAtTime(basePitch * 0.8, ctx.currentTime + duration * 0.5);
    popGain.gain.setValueAtTime(0, ctx.currentTime);
    popGain.gain.setValueAtTime(cfg.engineVol * 1.2, ctx.currentTime + duration * 0.35);
    popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration * 0.55);
    pop.connect(popGain);
    popGain.connect(ctx.destination);
    pop.start();
    pop.stop(ctx.currentTime + duration + 0.05);
  }
}

// ── Upgrade / Downgrade jingles ──
function playUpgradeSound(tierIndex) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const base = TIERS[tierIndex].enginePitch;
  playTone(base * 2, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(base * 2.5, 0.1, 'sine', 0.1), 70);
  setTimeout(() => playTone(base * 3, 0.15, 'sine', 0.12), 140);
}

function playDowngradeSound(tierIndex) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const base = TIERS[tierIndex].enginePitch;
  playTone(base * 2, 0.15, 'sawtooth', 0.08);
  setTimeout(() => playTone(base * 1.2, 0.2, 'sawtooth', 0.06), 100);
}

function playTone(freq, duration, type = 'sine', vol = 0.15) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.01);
  } catch (e) { /* */ }
}

function playFinishSound() {
  playTone(523, 0.15, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 120);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.12), 240);
  setTimeout(() => playTone(1047, 0.3, 'sine', 0.15), 360);
}

// ── Camera Follow ──
const cameraOffset = new THREE.Vector3(0, 6, 10);
const cameraLookOffset = new THREE.Vector3(0, 1, -10);

function updateCamera(carGroup) {
  const camera = getCamera();
  const targetPos = new THREE.Vector3().addVectors(carGroup.position, cameraOffset);
  camera.position.lerp(targetPos, 0.08);
  const lookTarget = new THREE.Vector3().addVectors(carGroup.position, cameraLookOffset);
  camera.lookAt(lookTarget);
}

// ── Initialize ──
const { scene, camera, renderer } = initScene();
initRoad(scene);
const carGroup = initCar(scene);
initGates(scene);
finishLine = createFinishLine(scene);
initControls();

// UI
showStartScreen();

onStartClick(() => {
  if (getState() !== 'menu') return;
  setState('playing');
  hideStartScreen();
  showHUD();
  startEngine(0);
  playStartupRev(0);
});

onPlayAgainClick(() => {
  if (getState() !== 'finished') return;
  hideEndScreen();
  resetCar();
  resetRoad();
  resetGates();
  resetParticles();
  if (finishLine) scene.remove(finishLine);
  finishLine = createFinishLine(scene);
  setState('playing');
  showHUD();
  startEngine(0);
  playStartupRev(0);
});

// ── Game Loop ──
let lastTime = 0;

function gameLoop(time) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  const state = getState();

  if (state === 'playing') {
    // Move car forward
    carGroup.position.z -= CAR_SPEED * dt;

    // Apply steering
    applyControls(carGroup, dt);

    // Update road chunks
    updateRoad(carGroup.position.z);

    // Check tier before collision
    const tierBefore = getTier();

    // Check gate collisions
    checkCollisions(carGroup);

    // Detect tier change -> play sounds
    const tierAfter = getTier();
    if (tierAfter !== tierBefore) {
      // Play startup rev for the new tier
      playStartupRev(tierAfter);
      // Switch engine to new tier sound
      switchEngineTier(tierAfter);
      // Play upgrade/downgrade jingle
      if (tierAfter > tierBefore) playUpgradeSound(tierAfter);
      else playDowngradeSound(tierAfter);
    }

    // Update car animations
    updateCar(dt);

    // Update gate animations
    updateGates(dt);

    // Progress & HUD
    const progress = Math.abs(carGroup.position.z) / TRACK_LENGTH;
    updateHUD(progress);

    // Check finish
    if (Math.abs(carGroup.position.z) >= TRACK_LENGTH) {
      setState('finished');
      showEndScreen();
      stopEngine();
      playFinishSound();
    }

    // Camera follow
    updateCamera(carGroup);
  }

  // Effects always update
  updateParticles(dt);
  updateCameraShake(dt);

  renderer.render(scene, camera);
}

requestAnimationFrame(gameLoop);
