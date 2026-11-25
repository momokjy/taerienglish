// Screen mounting + hash navigation.

import { stopSpeaking } from './speech.js';
import { stopListening } from './mic.js';

let cleanup = null;
const listeners = [];

export function mount(el, onLeave) {
  try {
    cleanup?.();
  } catch (e) {
    console.error(e);
  }
  cleanup = onLeave || null;
  stopSpeaking();
  stopListening();
  document.querySelectorAll('.hint-hand, .particle, .flying, .confetti').forEach((n) => n.remove());
  document.getElementById('app').replaceChildren(el);
  window.scrollTo(0, 0);
}

export function go(hash) {
  if (location.hash === hash) listeners.forEach((f) => f());
  else location.hash = hash;
}

export const onRoute = (f) => listeners.push(f);
