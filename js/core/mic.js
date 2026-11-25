// "Say it!" support. Three levels, best first:
//  1. SpeechRecognition (Chrome / Android / Safari): checks the words loosely.
//  2. Microphone level: just checks that the child said *something*.
//  3. No mic: the friend "listens" for a few seconds and praises anyway.
// Five-year-olds' pronunciation is not judged strictly — trying is the goal.

import { audioCtx } from './sfx.js';
import { FAST } from './speech.js';
import { sleep } from './util.js';

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
let recBroken = !SR;
let active = null;

export const canRecognize = () => !recBroken;

export function stopListening() {
  try {
    active?.abort?.();
  } catch {
    /* ignore */
  }
  active = null;
}

function recognize(ms = 5500) {
  return new Promise((resolve) => {
    let rec;
    try {
      rec = new SR();
    } catch {
      recBroken = true;
      return resolve({ error: 'start', alts: [] });
    }
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    rec.continuous = false;
    const alts = new Set();
    let error = null;
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      if (active === rec) active = null;
      resolve({ error, alts: [...alts] });
    };
    rec.onresult = (e) => {
      for (const res of e.results) for (const a of res) alts.add(String(a.transcript).toLowerCase());
    };
    rec.onerror = (e) => (error = e.error || 'error');
    rec.onend = finish;
    const timer = setTimeout(() => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      setTimeout(finish, 900);
    }, ms);
    active = rec;
    try {
      rec.start();
    } catch {
      error = 'start';
      finish();
    }
  });
}

async function voiceLevel(ms = 5000, onLevel) {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    return { ok: false };
  }
  const ac = audioCtx();
  if (!ac) {
    stream.getTracks().forEach((t) => t.stop());
    return { ok: false };
  }
  const src = ac.createMediaStreamSource(stream);
  const an = ac.createAnalyser();
  an.fftSize = 1024;
  src.connect(an);
  const buf = new Float32Array(an.fftSize);
  const t0 = performance.now();
  let last = t0;
  let voiced = 0;
  let spoke = false;
  let lastVoice = 0;
  return new Promise((resolve) => {
    const stop = (res) => {
      try {
        src.disconnect();
      } catch {
        /* ignore */
      }
      stream.getTracks().forEach((t) => t.stop());
      onLevel?.(0);
      resolve(res);
    };
    const tick = () => {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      onLevel?.(Math.min(1, rms * 10));
      const now = performance.now();
      if (rms > 0.025) {
        voiced += now - last;
        lastVoice = now;
      }
      last = now;
      if (!spoke && voiced > 300) spoke = true;
      if (now - t0 > ms || (spoke && now - lastVoice > 800)) stop({ ok: true, spoke });
      else requestAnimationFrame(tick);
    };
    tick();
  });
}

const STOP = new Set(['a', 'an', 'the', 'is', 'am', 'are', 'i', 'my', 'you', 'your', 'it', 'to', 'please', 'oh']);
const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

function close(a, b) {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && a.slice(0, 3) === b.slice(0, 3)) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  // one edit away
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      if (++edits > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else {
        i++;
        j++;
      }
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

export function matches(alts, target, { keys, ignore = [] } = {}) {
  const ign = new Set(ignore.flatMap(norm));
  let want = keys ? keys.flatMap(norm) : norm(target).filter((w) => !STOP.has(w));
  want = want.filter((w) => !ign.has(w));
  if (!want.length) return alts.length > 0;
  return alts.some((alt) => {
    const words = norm(alt);
    const hit = want.filter((w) => words.some((x) => close(w, x))).length;
    return hit / want.length >= 0.5;
  });
}

/**
 * Listen for the child saying `target`.
 * Returns { ok: true } when we think they said it, { ok: false } to try again.
 */
export async function hear(target, { useMic = true, keys, ignore, onLevel } = {}) {
  if (FAST) {
    await sleep(30);
    return { ok: true, how: 'fast' };
  }
  if (!useMic) {
    await sleep(3200);
    return { ok: true, how: 'none' };
  }
  if (!recBroken) {
    const r = await recognize();
    if (['not-allowed', 'service-not-allowed', 'start', 'audio-capture', 'network', 'language-not-supported'].includes(r.error)) {
      recBroken = true;
    } else {
      if (!r.alts.length) return { ok: false, how: 'recognize' };
      return { ok: matches(r.alts, target, { keys, ignore }), how: 'recognize', heard: r.alts };
    }
  }
  const lv = await voiceLevel(5000, onLevel);
  if (!lv.ok) {
    await sleep(2500);
    return { ok: true, how: 'none' };
  }
  return { ok: lv.spoke, how: 'level' };
}
