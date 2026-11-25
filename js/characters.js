// The three friends. Original designs (inspired by what Taeri loves:
// a pink bunny, a fluffy sky-blue puppy and a little heart fairy).
// Parents can rename them and use their own pictures in the parent page.
//
// All three share one body template (viewBox 200x240) so that body parts,
// wear slots and scrub zones are in the same place for everyone.

import { h, flash } from './core/util.js';
import { store } from './core/store.js';
import { speak } from './core/speech.js';
import { W } from './content/vocab.js';

export const ORDER = ['momo', 'puff', 'lulu'];

export const CHARS = {
  momo: { id: 'momo', name: 'Momo', kind: 'bunny', pitch: 1.3, body: '#FFE6EF', belly: '#FFFFFF', inner: '#FFB3CB', accent: '#FF8FB7', nose: '#FF7AA2', ears: [[66, 30], [134, 30]] },
  puff: { id: 'puff', name: 'Puff', kind: 'puppy', pitch: 1.1, body: '#E9F6FF', belly: '#FFFFFF', inner: '#C9E8FC', accent: '#A3D5F7', nose: '#4F6C8E', ears: [[28, 110], [172, 110]] },
  lulu: { id: 'lulu', name: 'Lulu', kind: 'fairy', pitch: 1.5, body: '#FFD3E8', belly: '#FFF4FA', inner: '#FFE8F2', accent: '#FF6FA5', nose: '#FF6F9C', ears: [[22, 52], [178, 52]] },
};

export const MOODS = ['happy', 'joy', 'sad', 'angry', 'sleepy', 'scared', 'surprised', 'yummy', 'love', 'hungry'];
const MOOD_EMOJI = { joy: '😄', sad: '😢', angry: '😠', sleepy: '😴', scared: '😱', surprised: '😮', yummy: '😋', love: '😍', hungry: '🤤' };

export const charName = (id) => store.settings.names?.[id]?.trim() || CHARS[id]?.name || id;
export const friendOf = (id) => ORDER[(ORDER.indexOf(id) + 1) % 3];
export const friend2Of = (id) => ORDER[(ORDER.indexOf(id) + 2) % 3];

/** Fill {name} {buddy} {friend} {momo}… placeholders. mode 'say' uses the TTS spelling of the child's name. */
export function fill(text, mode = 'show') {
  const s = store.settings;
  return String(text ?? '').replace(/\{(\w+)\}/g, (m, k) => {
    if (k === 'name') return mode === 'say' ? s.childSay || s.childName || 'friend' : s.childName || 'friend';
    if (k === 'buddy') return charName(s.buddy);
    if (k === 'friend') return charName(friendOf(s.buddy));
    if (k === 'friend2') return charName(friend2Of(s.buddy));
    if (CHARS[k]) return charName(k);
    return m;
  });
}

// ---------------------------------------------------------------- SVG art

const L = '#6B4A5A';
const SW = `stroke="${L}" stroke-width="3" stroke-linejoin="round"`;

export const heartPath = (x, y, s) =>
  `M${x} ${y + s * 0.9} C ${x - s * 1.6} ${y - s * 0.1}, ${x - s * 0.7} ${y - s * 1.25}, ${x} ${y - s * 0.35} C ${x + s * 0.7} ${y - s * 1.25}, ${x + s * 1.6} ${y - s * 0.1}, ${x} ${y + s * 0.9} Z`;

function starPath(cx, cy, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1) + ' ';
  }
  return d + 'Z';
}

function backParts(c) {
  if (c.kind === 'bunny')
    return `
    <g class="c-ear c-ear-l"><ellipse cx="70" cy="38" rx="17" ry="38" transform="rotate(-14 70 38)" fill="${c.body}" ${SW}/><ellipse cx="70" cy="42" rx="8" ry="26" transform="rotate(-14 70 42)" fill="${c.inner}"/></g>
    <g class="c-ear c-ear-r"><ellipse cx="130" cy="38" rx="17" ry="38" transform="rotate(14 130 38)" fill="${c.body}" ${SW}/><ellipse cx="130" cy="42" rx="8" ry="26" transform="rotate(14 130 42)" fill="${c.inner}"/></g>`;
  if (c.kind === 'puppy')
    return `
    <path class="c-tail" d="M138 204 C 162 208, 172 186, 160 176 C 152 170, 144 180, 152 186" fill="none" stroke="${L}" stroke-width="10" stroke-linecap="round"/>
    <path d="M138 204 C 162 208, 172 186, 160 176 C 152 170, 144 180, 152 186" fill="none" stroke="${c.body}" stroke-width="5" stroke-linecap="round"/>`;
  // fairy
  return `
    <g class="c-wings">
      <path d="M72 170 C 32 128, 6 160, 20 184 C 30 200, 58 194, 72 182 Z" fill="#FFFFFF" fill-opacity=".92" stroke="${c.accent}" stroke-width="2.5"/>
      <path d="M128 170 C 168 128, 194 160, 180 184 C 170 200, 142 194, 128 182 Z" fill="#FFFFFF" fill-opacity=".92" stroke="${c.accent}" stroke-width="2.5"/>
      <path d="${heartPath(34, 172, 5)}" fill="${c.inner}"/><path d="${heartPath(166, 172, 5)}" fill="${c.inner}"/>
    </g>
    <g class="c-ear c-ear-l"><path d="M44 62 L12 40 L34 100 Z" fill="${c.body}" ${SW}/></g>
    <g class="c-ear c-ear-r"><path d="M156 62 L188 40 L166 100 Z" fill="${c.body}" ${SW}/></g>
    <path d="M100 36 Q 93 24 100 16" fill="none" stroke="${L}" stroke-width="3" stroke-linecap="round"/>
    <path class="c-heart" d="${heartPath(100, 12, 9)}" fill="${c.accent}" ${SW}/>`;
}

function frontParts(c) {
  if (c.kind === 'bunny') {
    const petals = [0, 72, 144, 216, 288]
      .map((a) => `<circle cx="${(Math.cos((a * Math.PI) / 180) * 8).toFixed(1)}" cy="${(Math.sin((a * Math.PI) / 180) * 8).toFixed(1)}" r="7" fill="#fff" stroke="${L}" stroke-width="2"/>`)
      .join('');
    return `<g class="c-flower" transform="translate(146 46)">${petals}<circle r="5.5" fill="#FFD54F" stroke="${L}" stroke-width="2"/></g>`;
  }
  if (c.kind === 'puppy')
    return `
    <g class="c-ear c-ear-l"><path d="M46 50 C 12 56, 4 128, 24 148 C 38 160, 58 142, 58 110 C 58 84, 58 58, 46 50 Z" fill="${c.accent}" ${SW}/></g>
    <g class="c-ear c-ear-r"><path d="M154 50 C 188 56, 196 128, 176 148 C 162 160, 142 142, 142 110 C 142 84, 142 58, 154 50 Z" fill="${c.accent}" ${SW}/></g>
    <path d="${starPath(100, 48, 10)}" fill="#FFE066" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>`;
  return `<path d="${heartPath(150, 50, 5)}" fill="${c.accent}" opacity=".7"/>`;
}

function eyesSvg(mood) {
  const n = (cx) => `<ellipse cx="${cx}" cy="92" rx="7.5" ry="9.5" fill="${L}"/><circle cx="${cx + 2.5}" cy="88" r="3" fill="#fff"/>`;
  const arc = (cx) => `<path d="M${cx - 9} 95 Q${cx} 83 ${cx + 9} 95" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round"/>`;
  const closed = (cx) => `<path d="M${cx - 9} 92 Q${cx} 100 ${cx + 9} 92" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round"/>`;
  const big = (cx) => `<circle cx="${cx}" cy="92" r="11" fill="#fff" stroke="${L}" stroke-width="3"/><circle cx="${cx}" cy="93" r="4.5" fill="${L}"/>`;
  const wide = (cx) => `<ellipse cx="${cx}" cy="91" rx="8.5" ry="11.5" fill="${L}"/><circle cx="${cx + 3}" cy="86" r="3.4" fill="#fff"/>`;
  const heart = (cx) => `<path d="${heartPath(cx, 92, 7)}" fill="#FF4F8B" stroke="${L}" stroke-width="2"/>`;
  switch (mood) {
    case 'joy':
    case 'yummy':
      return arc(74) + arc(126);
    case 'sleepy':
      return closed(74) + closed(126);
    case 'scared':
      return big(74) + big(126);
    case 'surprised':
      return wide(74) + wide(126);
    case 'love':
      return heart(74) + heart(126);
    default:
      return `<g class="c-blink">${n(74)}${n(126)}</g>`;
  }
}

function browsSvg(mood) {
  const s = `fill="none" stroke="${L}" stroke-width="3.5" stroke-linecap="round"`;
  if (mood === 'sad') return `<path d="M62 78 L84 71" ${s}/><path d="M138 78 L116 71" ${s}/>`;
  if (mood === 'angry') return `<path d="M62 71 L85 80" ${s}/><path d="M138 71 L115 80" ${s}/>`;
  if (mood === 'surprised' || mood === 'scared') return `<path d="M64 72 Q74 64 84 72" ${s}/><path d="M116 72 Q126 64 136 72" ${s}/>`;
  return '';
}

function mouthSvg(mood) {
  const st = `fill="none" stroke="${L}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"`;
  const open = `<g class="m-open"><path d="M88 114 Q100 135 112 114 Z" fill="#B23F5F" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="100" cy="124" rx="6" ry="3.5" fill="#FF8FA8"/></g>`;
  let closed;
  switch (mood) {
    case 'sad':
      closed = `<path d="M89 123 Q100 113 111 123" ${st}/>`;
      break;
    case 'angry':
      closed = `<path d="M88 122 Q94 116 100 120 Q106 116 112 122" ${st}/>`;
      break;
    case 'sleepy':
      closed = `<ellipse cx="100" cy="119" rx="4" ry="5" fill="#B23F5F" stroke="${L}" stroke-width="2.5"/>`;
      break;
    case 'scared':
      closed = `<path d="M86 121 q3.5 -5 7 0 q3.5 5 7 0 q3.5 -5 7 0 q3.5 5 7 0" ${st}/>`;
      break;
    case 'surprised':
      closed = `<ellipse cx="100" cy="121" rx="7" ry="9" fill="#B23F5F" stroke="${L}" stroke-width="3"/>`;
      break;
    case 'hungry':
      closed = `<ellipse cx="100" cy="120" rx="6" ry="7" fill="#B23F5F" stroke="${L}" stroke-width="3"/><path d="M108 124 q3 7 0 10 q-3 -3 0 -10z" fill="#9FD8FF"/>`;
      break;
    case 'yummy':
      closed = `<path d="M87 113 Q100 131 113 113 Z" fill="#B23F5F" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><path d="M96 120 Q102 134 109 120 Z" fill="#FF8FA8" stroke="${L}" stroke-width="2"/>`;
      break;
    case 'joy':
    case 'love':
      closed = `<path d="M87 113 Q100 132 113 113 Z" fill="#B23F5F" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="100" cy="123" rx="6" ry="3.5" fill="#FF8FA8"/>`;
      break;
    default:
      closed = `<path d="M89 114 Q100 125 111 114" ${st}/>`;
  }
  return `<g class="m-closed">${closed}</g>${open}`;
}

function extrasSvg(mood) {
  if (mood === 'sad') return `<path class="c-tear" d="M66 104 q-6 9 0 12 q6 -3 0 -12z" fill="#8FD3FF" stroke="#5AAFE0" stroke-width="1.5"/>`;
  if (mood === 'angry')
    return `<g transform="translate(152 50)" stroke="#FF4D4D" stroke-width="4" stroke-linecap="round" fill="none"><path d="M-9 -3 Q-3 -3 -3 -9"/><path d="M9 -3 Q3 -3 3 -9"/><path d="M-9 3 Q-3 3 -3 9"/><path d="M9 3 Q3 3 3 9"/></g>`;
  if (mood === 'sleepy')
    return `<g class="c-zz" fill="#7C8CE0" font-family="Fredoka, Arial, sans-serif" font-weight="700"><text x="150" y="46" font-size="24">z</text><text x="166" y="28" font-size="17">z</text><text x="178" y="15" font-size="12">z</text></g>`;
  if (mood === 'scared') return `<path d="M152 56 q-6 9 0 12 q6 -3 0 -12z" fill="#8FD3FF" stroke="#5AAFE0" stroke-width="1.5"/>`;
  if (mood === 'love') return `<path class="c-float-heart" d="${heartPath(166, 40, 7)}" fill="#FF6F9C"/>`;
  return '';
}

function noseSvg(c) {
  if (c.kind === 'puppy') return `<ellipse cx="100" cy="105" rx="7" ry="4.6" fill="${c.nose}"/><ellipse cx="98" cy="103.5" rx="2.2" ry="1.2" fill="#fff" opacity=".7"/>`;
  if (c.kind === 'fairy') return `<ellipse cx="100" cy="105" rx="3.2" ry="2.4" fill="${c.nose}"/>`;
  return `<ellipse cx="100" cy="105" rx="5" ry="3.6" fill="${c.nose}" stroke="${L}" stroke-width="1.5"/>`;
}

export function charSVG(id, mood = 'happy') {
  const c = CHARS[id] || CHARS.momo;
  const cheek = mood === 'angry' ? '#FF6B6B' : '#FF9DBB';
  const co = mood === 'angry' || mood === 'love' || mood === 'joy' ? 0.75 : 0.55;
  return `<svg class="char-svg kind-${c.kind}" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g class="c-all">
    <g class="c-back">${backParts(c)}</g>
    <g class="c-body"><ellipse cx="100" cy="190" rx="46" ry="40" fill="${c.body}" ${SW}/><ellipse cx="100" cy="197" rx="27" ry="24" fill="${c.belly}"/></g>
    <g class="c-feet"><ellipse cx="78" cy="226" rx="18" ry="11" fill="${c.body}" ${SW}/><ellipse cx="122" cy="226" rx="18" ry="11" fill="${c.body}" ${SW}/></g>
    <g class="c-arm c-arm-l"><ellipse cx="58" cy="182" rx="12" ry="19" transform="rotate(32 58 182)" fill="${c.body}" ${SW}/></g>
    <g class="c-arm c-arm-r"><ellipse cx="142" cy="182" rx="12" ry="19" transform="rotate(-32 142 182)" fill="${c.body}" ${SW}/></g>
    <g class="c-head">
      <ellipse cx="100" cy="92" rx="70" ry="62" fill="${c.body}" ${SW}/>
      ${frontParts(c)}
      <g class="c-face">
        <ellipse cx="57" cy="111" rx="11" ry="7" fill="${cheek}" opacity="${co}"/>
        <ellipse cx="143" cy="111" rx="11" ry="7" fill="${cheek}" opacity="${co}"/>
        ${browsSvg(mood)}${eyesSvg(mood)}${noseSvg(c)}${mouthSvg(mood)}${extrasSvg(mood)}
      </g>
    </g>
  </g></svg>`;
}

/** A character picture for cards: the parent's photo if set, otherwise the drawing. */
export function charArt(id, mood = 'happy') {
  const img = store.settings.images?.[id];
  if (img && (mood === 'happy' || mood === 'joy')) return h('img', { class: 'char-img', src: img, alt: charName(id), draggable: 'false' });
  return h('div', { class: 'char-wrap', html: charSVG(id, mood) });
}

// ---------------------------------------------------------------- geometry

export const PARTS = {
  head: { word: 'head', pts: [[100, 40]] },
  eyes: { word: 'eyes', pl: true, pts: [[74, 92], [126, 92]] },
  ears: { word: 'ears', pl: true, pts: null },
  nose: { word: 'nose', pts: [[100, 105]] },
  mouth: { word: 'mouth', pts: [[100, 121]] },
  hands: { word: 'hands', pl: true, pts: [[52, 190], [148, 190]] },
  tummy: { word: 'tummy', pts: [[100, 197]] },
  feet: { word: 'feet', pl: true, pts: [[78, 228], [122, 228]] },
};
export const partPts = (id, part) => (part === 'ears' ? CHARS[id].ears : PARTS[part].pts);

export const ZONES = {
  mouth: { pts: [[100, 120]], r: 22 },
  face: { pts: [[100, 98]], r: 52 },
  hands: { pts: [[52, 190], [148, 190]], r: 24 },
  body: { pts: [[100, 192]], r: 40 },
  head: { pts: [[100, 60]], r: 40 },
};

const SLOTS = {
  head: [{ x: 100, y: 34, s: 46 }],
  eyes: [{ x: 100, y: 93, s: 46 }],
  neck: [{ x: 100, y: 152, s: 32 }],
  body: [{ x: 100, y: 186, s: 44 }],
  legs: [{ x: 100, y: 216, s: 30 }],
  socks: [{ x: 76, y: 222, s: 16 }, { x: 124, y: 222, s: 16, flip: true }],
  feet: [{ x: 76, y: 230, s: 18 }, { x: 124, y: 230, s: 18, flip: true }],
  hand: [{ x: 162, y: 128, s: 46 }],
  hands: [{ x: 50, y: 192, s: 17 }, { x: 150, y: 192, s: 17, flip: true }],
};
const CLASH = { body: ['body'], legs: ['legs'] };

// ---------------------------------------------------------------- Buddy

/** A living character on screen: talks, changes mood, animates, wears things. */
export class Buddy {
  constructor(id, { mood = 'happy', size = 'm', forceSvg = false } = {}) {
    this.id = CHARS[id] ? id : 'momo';
    this.mood = mood;
    this.forceSvg = forceSvg;
    this._tok = 0;
    this.worn = {};
    this.el = h('div', { class: `buddy size-${size}`, 'data-char': this.id });
    this.art = h('div', { class: 'buddy-art' });
    this.layer = h('div', { class: 'wear-layer' });
    this.bubbleEl = h('div', { class: 'bubble', 'aria-live': 'polite' });
    this.thinkEl = h('div', { class: 'think' });
    this.el.append(this.art, this.bubbleEl, this.thinkEl);
    this.render();
    if ('ResizeObserver' in window) {
      this._ro = new ResizeObserver(() => this.art.style.setProperty('--u', this.art.clientWidth / 100 + 'px'));
      this._ro.observe(this.art);
    }
  }

  get name() {
    return charName(this.id);
  }
  get pitch() {
    return CHARS[this.id].pitch;
  }
  get custom() {
    return !this.forceSvg && store.settings.images?.[this.id];
  }

  render() {
    const img = this.custom;
    if (img) {
      this.art.replaceChildren(h('img', { class: 'char-img', src: img, alt: this.name, draggable: 'false' }));
      if (MOOD_EMOJI[this.mood]) this.art.append(h('div', { class: 'mood-badge' }, MOOD_EMOJI[this.mood]));
      this.el.classList.add('custom');
    } else {
      this.art.innerHTML = charSVG(this.id, this.mood);
      this.el.classList.remove('custom');
    }
    this.art.append(this.layer);
  }

  setMood(m) {
    if (m && m !== this.mood) {
      this.mood = m;
      this.render();
    }
    return this;
  }

  play(anim, ms) {
    if (!anim) return;
    const dur = ms || { jump: 900, spin: 900, sleep: 2400, stretch: 1400, clap: 1100, stomp: 900, fly: 1400, swim: 1400, wave: 1500, head: 1200, hop: 1000 }[anim] || 900;
    flash(this.el, 'a-' + anim, dur);
  }

  async say(text, { rate = 1, pitch } = {}) {
    const tok = ++this._tok;
    this.showBubble(fill(text, 'show'));
    this.el.classList.add('talking');
    try {
      await speak(fill(text, 'say'), { pitch: pitch ?? this.pitch, rate });
    } finally {
      if (tok === this._tok) {
        this.el.classList.remove('talking');
        clearTimeout(this._bt);
        this._bt = setTimeout(() => tok === this._tok && this.hideBubble(), 1400);
      }
    }
  }

  showBubble(text, exclusive = true) {
    clearTimeout(this._bt);
    const b = this.bubbleEl;
    // only the friend who is talking shows a bubble
    if (exclusive) document.querySelectorAll('.bubble.show').forEach((x) => x !== b && x.classList.remove('show'));
    b.textContent = text;
    b.className = 'bubble';
    // keep the bubble on screen: try above, then right, then left, then over the head
    b.style.removeProperty('--dx');
    const me = this.art.getBoundingClientRect();
    for (const pos of ['above', 'right', 'left', 'inside']) {
      b.classList.remove('above', 'right', 'left', 'inside');
      b.classList.add(pos);
      // beside the friend: wrap the text into the space that is left
      const room = pos === 'right' ? window.innerWidth - (me.right - me.width * 0.14) - 8 : pos === 'left' ? me.left + me.width * 0.14 - 8 : 0;
      if (room && room < 110) continue;
      b.style.maxWidth = room ? Math.min(room, 330) + 'px' : '';
      const r = b.getBoundingClientRect();
      // a bubble above the head may slide sideways to stay on screen
      const dx = pos === 'above' || pos === 'inside' ? Math.max(0, 6 - r.left) + Math.min(0, window.innerWidth - 6 - r.right) : 0;
      if (r.top >= 60 && r.bottom <= window.innerHeight - 4 && r.left + dx >= 4 && r.right + dx <= window.innerWidth - 4) {
        if (dx) b.style.setProperty('--dx', dx + 'px');
        break;
      }
    }
    b.classList.add('show');
  }

  hideBubble() {
    this.bubbleEl.classList.remove('show');
  }

  think(content) {
    this.thinkEl.replaceChildren();
    if (!content) return this.thinkEl.classList.remove('show');
    this.thinkEl.append(content instanceof Node ? content : h('span', { class: 'emo' }, content));
    this.thinkEl.classList.add('show');
  }

  toVB(x, y) {
    const r = this.art.getBoundingClientRect();
    return [((x - r.left) / r.width) * 200, ((y - r.top) / r.height) * 240];
  }
  toClient(vx, vy) {
    const r = this.art.getBoundingClientRect();
    return { x: r.left + (vx / 200) * r.width, y: r.top + (vy / 240) * r.height };
  }

  partAt(x, y, parts = Object.keys(PARTS)) {
    const [vx, vy] = this.toVB(x, y);
    let best = null;
    let bd = Infinity;
    for (const p of parts)
      for (const [px, py] of partPts(this.id, p)) {
        const d = Math.hypot(px - vx, py - vy);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
    return bd < 58 ? best : null;
  }
  partPoint(part) {
    const [x, y] = partPts(this.id, part)[0];
    return this.toClient(x, y);
  }
  inZone(zone, x, y) {
    const z = ZONES[zone];
    const [vx, vy] = this.toVB(x, y);
    return z.pts.some(([px, py]) => Math.hypot(px - vx, py - vy) <= z.r + 14);
  }
  zonePoint(zone) {
    const [x, y] = ZONES[zone].pts[0];
    return this.toClient(x, y);
  }

  wear(itemId) {
    const v = W[itemId];
    if (!v?.slot) return;
    const slot = v.slot;
    for (const s of [slot, ...(CLASH[slot] || [])]) {
      this.worn[s]?.forEach((el) => el.remove());
      delete this.worn[s];
    }
    this.worn[slot] = SLOTS[slot].map((p) => {
      const el = h('div', { class: 'wear-item' + (p.flip ? ' flip' : ''), style: { left: p.x / 2 + '%', top: p.y / 2.4 + '%', fontSize: `calc(var(--u, 2px) * ${p.s})` } }, v.e);
      this.layer.append(el);
      flash(el, 'pop-in', 500);
      return el;
    });
  }
  unwear() {
    this.layer.replaceChildren();
    this.worn = {};
  }

  destroy() {
    this._ro?.disconnect();
  }
}

/** Several friends saying the same line together. */
export async function sayAll(buddies, text) {
  document.querySelectorAll('.bubble.show').forEach((x) => x.classList.remove('show'));
  buddies.forEach((b) => {
    b._tok++;
    b.showBubble(fill(text), false);
    b.el.classList.add('talking');
  });
  try {
    await speak(fill(text, 'say'), { pitch: 1.35 });
  } finally {
    buddies.forEach((b) => {
      b.el.classList.remove('talking');
      setTimeout(() => b.hideBubble(), 1200);
    });
  }
}
