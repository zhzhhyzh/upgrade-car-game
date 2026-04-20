import { TIERS } from './constants.js';
import { getTier } from './car.js';

// DOM refs
const hud = document.getElementById('hud');
const tierNameEl = document.getElementById('car-tier-name');
const valueEl = document.getElementById('car-value');
const progressBar = document.getElementById('progress-bar');
const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const finalCarName = document.getElementById('final-car-name');
const finalValue = document.getElementById('final-value');

export function showHUD() {
  if (hud) hud.style.display = 'block';
}

export function hideHUD() {
  if (hud) hud.style.display = 'none';
}

export function updateHUD(progress) {
  const tier = getTier();
  const cfg = TIERS[tier];
  if (tierNameEl) tierNameEl.textContent = cfg.name;
  if (valueEl) valueEl.textContent = `$${cfg.value.toLocaleString()}`;
  if (progressBar) progressBar.style.width = `${Math.min(100, progress * 100)}%`;
}

export function showStartScreen() {
  if (startScreen) startScreen.style.display = 'flex';
  if (endScreen) endScreen.style.display = 'none';
  hideHUD();
}

export function hideStartScreen() {
  if (startScreen) startScreen.style.display = 'none';
}

export function showEndScreen() {
  const tier = getTier();
  const cfg = TIERS[tier];
  if (finalCarName) finalCarName.textContent = cfg.name;
  if (finalValue) finalValue.textContent = `$${cfg.value.toLocaleString()}`;
  if (endScreen) endScreen.style.display = 'flex';
  hideHUD();
}

export function hideEndScreen() {
  if (endScreen) endScreen.style.display = 'none';
}

export function onStartClick(callback) {
  const btn = document.getElementById('start-btn');
  if (btn) btn.addEventListener('click', callback);
}

export function onPlayAgainClick(callback) {
  const btn = document.getElementById('play-again-btn');
  if (btn) btn.addEventListener('click', callback);
}
