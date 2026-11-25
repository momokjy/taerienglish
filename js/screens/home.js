// Start screen (unlocks audio), home map, unit path and sticker book.

import { h, pick } from '../core/util.js';
import { store, save, isDone, doneCount } from '../core/store.js';
import { unlockSpeech } from '../core/speech.js';
import { sfx, unlockAudio } from '../core/sfx.js';
import { mount, go } from '../core/nav.js';
import { Buddy, ORDER, charArt, charName, fill } from '../characters.js';
import { TYPE_ICON, iconBtn, setScene, pointAt, burstAt } from '../core/ui.js';
import { UNITS, UNIT_BY_ID } from '../content/units.js';

let greeted = false;

const TAP_LINES = ['Hee hee!', 'I love you, {name}!', "Let's play!", "You're my best friend!", 'Tickle, tickle!', 'Hello, {name}!', 'Hug me!'];

function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
}

function gearButton() {
  const b = h('button', { class: 'icon-btn gear', type: 'button', 'aria-label': 'For parents' }, h('span', { class: 'emo' }, '⚙️'), h('i', { class: 'gear-ring' }));
  const tip = h('div', { class: 'gear-tip' }, '부모님: 길게 누르세요');
  let t = null;
  const cancel = () => {
    clearTimeout(t);
    b.classList.remove('holding');
  };
  b.addEventListener('pointerdown', () => {
    b.classList.add('holding');
    t = setTimeout(() => {
      cancel();
      go('#/parent');
    }, 1500);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, cancel));
  b.addEventListener('click', () => {
    tip.classList.add('show');
    setTimeout(() => tip.classList.remove('show'), 1800);
  });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  return h('div', { class: 'gear-wrap' }, b, tip);
}

// ---------------------------------------------------------------- start

export function startScreen(onStart) {
  const screen = h('div', { class: 'screen start' });
  setScene(screen, 'sky');
  const friends = ORDER.map((id, i) => {
    const b = new Buddy(id, { size: i === 1 ? 'l' : 'm' });
    b.el.style.animationDelay = i * 0.2 + 's';
    return b.el;
  });
  const play = h('button', { class: 'big-play', type: 'button', 'aria-label': 'Start' }, h('span', null, '▶'));
  play.addEventListener('click', () => {
    unlockAudio();
    unlockSpeech();
    sfx.sparkle();
    onStart();
  });
  screen.append(
    h('div', { class: 'start-wrap' }, h('h1', { class: 'start-title' }, fill("{name}'s"), h('br'), 'English Friends'), h('div', { class: 'start-friends' }, ...friends), play),
  );
  mount(screen);
}

// ---------------------------------------------------------------- home

export function homeScreen({ switched = false } = {}) {
  const screen = h('div', { class: 'screen home' });
  setScene(screen, 'sky');
  const buddy = new Buddy(store.settings.buddy, { size: 'l' });

  buddy.art.addEventListener('click', () => {
    sfx.pop();
    buddy.play(pick(['jump', 'wiggle', 'spin']));
    buddy.setMood(pick(['joy', 'love', 'happy']));
    buddy.say(pick(TAP_LINES)).catch(() => {});
  });

  const others = ORDER.filter((id) => id !== store.settings.buddy).map((id) =>
    h(
      'button',
      {
        class: 'friend-pick',
        type: 'button',
        'aria-label': charName(id),
        onClick: () => {
          sfx.whoosh();
          store.settings.buddy = id;
          save();
          homeScreen({ switched: true });
        },
      },
      charArt(id),
    ),
  );

  const tiles = UNITS.map((u, i) => {
    const n = doneCount(u);
    const all = u.activities.length;
    const got = store.stickers.includes(u.id);
    return h(
      'button',
      { class: 'unit-tile' + (got ? ' got' : ''), type: 'button', style: { '--c': u.color, animationDelay: i * 0.04 + 's' }, onClick: () => (sfx.tap(), go('#/unit/' + u.id)) },
      h('span', { class: 'unit-icon emo' }, u.icon),
      h('span', { class: 'unit-title' }, u.title),
      h('span', { class: 'unit-progress' }, ...Array.from({ length: all }, (_, k) => h('i', { class: k < n ? 'on' : '' }))),
      got ? h('span', { class: 'unit-sticker emo' }, u.sticker) : null,
    );
  });

  const top = h(
    'div',
    { class: 'topbar' },
    h('div', { class: 'star-count' }, h('span', { class: 'emo' }, '⭐'), ' ', String(store.stars)),
    h('div', { class: 'app-title' }, fill("{name}'s English")),
    gearButton(),
  );
  const side = h('div', { class: 'home-side' }, buddy.el, h('div', { class: 'friend-row' }, ...others));
  const map = h('div', { class: 'unit-grid' }, ...tiles);
  const bottom = h('div', { class: 'home-bottom' }, iconBtn('📒', 'Stickers', () => go('#/stickers'), 'big sticker-btn'));
  screen.append(top, h('div', { class: 'home-body' }, side, h('div', { class: 'home-main' }, map, bottom)));
  mount(screen, () => buddy.destroy());

  let line;
  if (switched) line = "Yay! Let's play, {name}!";
  else if (!greeted) line = `${greeting()}, {name}! Let's play!`;
  else line = pick(['What do you want to play?', 'Pick one!', "Let's play!"]);
  greeted = true;
  buddy.play('jump');
  buddy.say(line).then(() => {
    if (store.plays === 0 && screen.isConnected) pointAt(tiles[0]);
  }, () => {});
}

// ---------------------------------------------------------------- unit path

export function unitScreen(id) {
  const unit = UNIT_BY_ID[id];
  if (!unit) return go('#/');
  const screen = h('div', { class: 'screen unit' });
  setScene(screen, unit.scene);
  const buddy = new Buddy(store.settings.buddy, { size: 'm' });
  const cur = unit.activities.findIndex((_, i) => !isDone(unit.id, i));
  const steps = unit.activities.map((a, i) => {
    const done = isDone(unit.id, i);
    return h(
      'button',
      { class: 'step' + (done ? ' done' : '') + (i === cur ? ' current' : ''), type: 'button', style: { '--c': unit.color, animationDelay: i * 0.05 + 's' }, onClick: () => (sfx.tap(), go(`#/play/${unit.id}/${i}`)) },
      h('span', { class: 'step-num' }, String(i + 1)),
      h('span', { class: 'step-icon emo' }, a.icon || TYPE_ICON[a.type]),
      h('span', { class: 'step-title' }, a.title),
      done ? h('span', { class: 'step-star emo' }, '⭐') : null,
    );
  });
  const top = h(
    'div',
    { class: 'topbar' },
    iconBtn('🏠', 'Home', () => go('#/')),
    h('div', { class: 'tb-mid' }, h('div', { class: 'tb-title big' }, h('span', { class: 'emo' }, unit.icon), ' ', unit.title)),
    store.stickers.includes(unit.id) ? h('div', { class: 'tb-sticker emo' }, unit.sticker) : h('div', { class: 'tb-space' }),
  );
  screen.append(top, h('div', { class: 'stage' }, h('div', { class: 'split' }, h('div', { class: 'side' }, buddy.el), h('div', { class: 'main' }, h('div', { class: 'path' }, ...steps)))));
  mount(screen, () => buddy.destroy());
  buddy.play('jump');
  buddy.say(cur === -1 ? `${unit.title} You did it all! Play again?` : `${unit.title} Let's play!`).then(() => {
    if (cur >= 0 && screen.isConnected) pointAt(steps[cur]);
  }, () => {});
}

// ---------------------------------------------------------------- stickers

export function stickerScreen() {
  const screen = h('div', { class: 'screen stickers' });
  setScene(screen, 'playroom');
  const buddy = new Buddy(store.settings.buddy, { size: 'm' });
  const slots = UNITS.map((u) => {
    const got = store.stickers.includes(u.id);
    const b = h('button', { class: 'sticker-slot' + (got ? ' got' : ''), type: 'button', 'aria-label': got ? u.title : 'locked' }, h('span', { class: 'emo' }, got ? u.sticker : '❔'), got ? h('span', { class: 'sticker-name' }, u.title) : null);
    b.addEventListener('click', () => {
      if (!got) {
        sfx.boing();
        buddy.say('Play and get a sticker!').catch(() => {});
        return;
      }
      sfx.sparkle();
      burstAt(b);
      b.classList.remove('spin');
      void b.offsetWidth;
      b.classList.add('spin');
      buddy.say(u.title).catch(() => {});
    });
    return b;
  });
  const top = h(
    'div',
    { class: 'topbar' },
    iconBtn('🏠', 'Home', () => go('#/')),
    h('div', { class: 'tb-mid' }, h('div', { class: 'tb-title big' }, h('span', { class: 'emo' }, '📒'), ' My Stickers')),
    h('div', { class: 'star-count' }, h('span', { class: 'emo' }, '⭐'), ' ', String(store.stars)),
  );
  screen.append(top, h('div', { class: 'stage' }, h('div', { class: 'split' }, h('div', { class: 'side' }, buddy.el), h('div', { class: 'main' }, h('div', { class: 'sticker-book' }, ...slots)))));
  mount(screen, () => buddy.destroy());
  const n = store.stickers.length;
  buddy.say(n ? `Wow! ${n === 1 ? 'One sticker' : n + ' stickers'}!` : "Let's get stickers!").catch(() => {});
}
