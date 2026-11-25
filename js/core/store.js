// Progress + settings, persisted in localStorage (this device only).

const KEY = 'taeri-english-v1';

const defaults = () => ({
  settings: {
    childName: 'Taeri', // shown on screen
    childSay: 'Taeri', // how the English voice should pronounce it
    rate: 0.85, // speech speed (kids like it a bit slower)
    voiceURI: '',
    mic: true,
    buddy: 'momo',
    names: {}, // custom character names
    images: {}, // custom character pictures (data URLs)
  },
  progress: {},
  stickers: [],
  stars: 0,
  plays: 0,
});

function load() {
  const d = defaults();
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return d;
    const s = JSON.parse(raw);
    return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
  } catch {
    return d;
  }
}

export const store = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
    return true;
  } catch (e) {
    console.warn('save failed', e);
    return false;
  }
}

export const isDone = (unitId, idx) => !!store.progress[unitId]?.done?.includes(idx);

export const doneCount = (unit) => unit.activities.filter((_, i) => isDone(unit.id, i)).length;

export function markDone(unit, idx) {
  const p = (store.progress[unit.id] ||= { done: [] });
  if (!p.done.includes(idx)) p.done.push(idx);
  store.stars += 3;
  store.plays += 1;
  let newSticker = false;
  if (doneCount(unit) === unit.activities.length && !store.stickers.includes(unit.id)) {
    store.stickers.push(unit.id);
    newSticker = true;
  }
  save();
  return { newSticker };
}

export function resetProgress() {
  store.progress = {};
  store.stickers = [];
  store.stars = 0;
  store.plays = 0;
  save();
}
