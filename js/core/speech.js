// Text-to-speech wrapper around the browser's speechSynthesis.
// Every call returns a Promise that resolves when the line is finished
// (or cut off by a newer line), with a timeout fallback because some
// browsers never fire `onend`.

import { sleep } from './util.js';
import { store } from './store.js';

export const FAST = /[?&]fast\b/.test(location.search); // test mode: no waiting for speech

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

// Novelty voices we never want to pick automatically.
const BAD = /(bad news|bahh|bells|boing|bubbles|cellos|wobble|zarvox|whisper|trinoids|organ|jester|superstar|albert|fred|junior|ralph|good news|deranged|hysterical|grandpa|grandma|eddy|reed|rocko|sandy|shelley|flo\b)/i;
const PREFER = [/samantha/i, /natural/i, /google us english/i, /aria/i, /jenny/i, /\bava\b/i, /allison/i, /susan/i, /karen/i, /moira/i, /tessa/i, /serena/i, /zira/i, /google uk english female/i];

let voices = [];
let cached = null;
let active = 0;
let currentEnd = null;
const keep = new Set(); // avoid GC of utterances (Chrome bug)
const listeners = new Set();

function loadVoices() {
  voices = synth ? synth.getVoices() : [];
  cached = null;
  listeners.forEach((f) => f());
}
if (synth) {
  loadVoices();
  if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
  else synth.onvoiceschanged = loadVoices;
}

export const hasTTS = !!synth;
export const onVoices = (f) => listeners.add(f);
export const englishVoices = () => voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
export const resetVoice = () => (cached = null);

export function currentVoice() {
  if (cached) return cached;
  const en = englishVoices();
  if (!en.length) return null;
  const want = store.settings.voiceURI;
  if (want) {
    const v = en.find((x) => x.voiceURI === want);
    if (v) return (cached = v);
  }
  const score = (v) => {
    let s = 0;
    if (/en[-_]US/i.test(v.lang)) s += 4;
    else if (/en[-_](GB|AU|CA|IE|NZ)/i.test(v.lang)) s += 2;
    const i = PREFER.findIndex((r) => r.test(v.name));
    if (i >= 0) s += 20 - i;
    if (BAD.test(v.name)) s -= 30;
    return s;
  };
  return (cached = en.slice().sort((a, b) => score(b) - score(a))[0]);
}

const estimate = (text, rate) => 500 + (text.length * 70) / rate;

export function speak(text, { pitch = 1, rate = 1 } = {}) {
  text = String(text ?? '').trim();
  if (!text) return Promise.resolve();
  const r = Math.max(0.5, Math.min(1.4, (store.settings.rate || 0.85) * rate));
  if (FAST) return sleep(15);
  if (!synth) return sleep(estimate(text, r));

  return new Promise((resolve) => {
    const hadSpeech = synth.speaking || synth.pending;
    if (hadSpeech) synth.cancel();
    currentEnd?.(); // the previous line is over as far as callers are concerned

    const u = new SpeechSynthesisUtterance(text);
    const v = currentVoice();
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    } else u.lang = 'en-US';
    u.rate = r;
    u.pitch = Math.max(0, Math.min(2, pitch));
    u.volume = 1;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      keep.delete(u);
      active = Math.max(0, active - 1);
      if (currentEnd === finish) currentEnd = null;
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    const timer = setTimeout(finish, estimate(text, r) + 3000);
    keep.add(u);
    active++;
    currentEnd = finish;
    const go = () => {
      if (done) return;
      synth.speak(u);
      if (synth.paused) synth.resume();
    };
    // Chrome sometimes drops an utterance queued right after cancel().
    if (hadSpeech) setTimeout(go, 60);
    else go();
  });
}

export function stopSpeaking() {
  currentEnd?.();
  if (synth && (synth.speaking || synth.pending)) synth.cancel();
}

export const isSpeaking = () => active > 0;

export async function idle() {
  while (active > 0) await sleep(80);
}

/** iOS needs the first utterance to happen inside a user gesture. */
export function unlockSpeech() {
  if (!synth) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  } catch {
    /* ignore */
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopSpeaking();
  });
}
