// Simple game state machine: 'menu' | 'playing' | 'finished'

let state = 'menu';
const listeners = [];

export function getState() { return state; }

export function setState(newState) {
  if (newState === state) return;
  state = newState;
  for (const fn of listeners) fn(state);
}

export function onStateChange(fn) {
  listeners.push(fn);
}
