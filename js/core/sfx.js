// Tiny synthesized sound effects (no audio files needed).

let ac = null;
let out = null;
let noiseBuf = null;

export function audioCtx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ac = new AC();
      out = ac.createGain();
      out.gain.value = 0.8;
      out.connect(ac.destination);
    } catch {
      return null;
    }
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}

export function unlockAudio() {
  const c = audioCtx();
  if (!c) return;
  // play a silent blip so iOS fully unlocks the context
  const o = c.createOscillator();
  const g = c.createGain();
  g.gain.value = 0.0001;
  o.connect(g).connect(out);
  o.start();
  o.stop(c.currentTime + 0.02);
}

function tone(f, d, { type = 'sine', vol = 0.18, at = 0, to = null, attack = 0.008 } = {}) {
  const c = audioCtx();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + d + 0.05);
}

function noise(d, { at = 0, vol = 0.2, type = 'bandpass', f = 1200, to = null, q = 1 } = {}) {
  const c = audioCtx();
  if (!c) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + at;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const fl = c.createBiquadFilter();
  fl.type = type;
  fl.frequency.setValueAtTime(f, t);
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t + d);
  fl.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(g).connect(out);
  s.start(t);
  s.stop(t + d + 0.05);
}

export const sfx = {
  tap: () => tone(700, 0.06, { type: 'triangle', vol: 0.1 }),
  pop: () => tone(420, 0.14, { to: 1100, vol: 0.2 }),
  ding: () => {
    tone(988, 0.16, { type: 'triangle', vol: 0.18 });
    tone(1319, 0.3, { type: 'triangle', vol: 0.18, at: 0.1 });
  },
  boing: () => tone(320, 0.28, { to: 160, vol: 0.13 }),
  sparkle: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.14, { type: 'triangle', vol: 0.09, at: i * 0.06 })),
  fanfare: () => {
    [523, 659, 784].forEach((f, i) => tone(f, 0.16, { type: 'square', vol: 0.06, at: i * 0.12 }));
    tone(1047, 0.5, { type: 'triangle', vol: 0.14, at: 0.36 });
    tone(784, 0.5, { type: 'triangle', vol: 0.08, at: 0.36 });
  },
  whoosh: () => noise(0.35, { f: 400, to: 2400, vol: 0.12 }),
  munch: () => [0, 0.16, 0.32].forEach((at) => noise(0.09, { at, f: 900, vol: 0.22, q: 0.8 })),
  brush: () => noise(0.1, { type: 'highpass', f: 2500, vol: 0.06 }),
  bubble: () => tone(500 + Math.random() * 600, 0.08, { to: 1400, vol: 0.06 }),
  splash: () => noise(0.4, { type: 'lowpass', f: 3000, to: 500, vol: 0.18 }),
  clap: () => noise(0.08, { f: 1500, q: 0.6, vol: 0.35 }),
  stomp: () => tone(110, 0.22, { to: 50, vol: 0.35 }),
  magic: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.2, { type: 'sine', vol: 0.08, at: i * 0.07 })),
  sticker: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, { type: 'triangle', vol: 0.12, at: i * 0.09 }));
  },
  click: () => tone(1200, 0.03, { type: 'square', vol: 0.05 }),
};

export function playSfx(name) {
  try {
    sfx[name]?.();
  } catch {
    /* audio is optional */
  }
}
