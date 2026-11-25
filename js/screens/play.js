// Runs one activity: top bar, stage, the activity engine, then the reward.

import { h, pick, sleep } from '../core/util.js';
import { store, markDone } from '../core/store.js';
import { isSpeaking } from '../core/speech.js';
import { sfx } from '../core/sfx.js';
import { mount, go } from '../core/nav.js';
import { Buddy, fill } from '../characters.js';
import { TYPE_ICON, iconBtn, setScene, setFx, confetti, Narrator, pointAt } from '../core/ui.js';
import { UNIT_BY_ID } from '../content/units.js';
import { ENGINES } from '../activities/index.js';

import { CANCEL } from '../core/cancel.js';
export { CANCEL };

function makeCtx(base) {
  const disposers = [];
  const ctx = {
    ...base,
    dead: false,
    prompt: null,
    speaking: 0,
    $(p) {
      return Promise.resolve(p).then((v) => {
        if (ctx.dead) throw CANCEL;
        return v;
      });
    },
    async say(who, text, opts) {
      if (ctx.dead) throw CANCEL;
      ctx.speaking++;
      try {
        await who.say(text, opts);
      } finally {
        ctx.speaking--;
      }
      if (ctx.dead) throw CANCEL;
    },
    /** Fire-and-forget speech that never throws. */
    talk(who, text, opts) {
      if (ctx.dead) return Promise.resolve();
      return who.say(text, opts).catch(() => {});
    },
    wait(ms) {
      return ctx.$(sleep(ms));
    },
    setPrompt(f) {
      ctx.prompt = f;
    },
    onDispose(f) {
      disposers.push(f);
    },
    dispose() {
      if (ctx.dead) return;
      ctx.dead = true;
      disposers.forEach((f) => {
        try {
          f();
        } catch {
          /* ignore */
        }
      });
    },
    dots(i, n) {
      base.dotsEl.replaceChildren(...Array.from({ length: n }, (_, k) => h('i', { class: k < i ? 'on' : k === i ? 'now' : '' })));
    },
    fx(name) {
      setFx(base.screen, name);
    },
    /**
     * Call nudges one after another whenever the child has not touched the
     * screen for `ms`. Returns { stop }.
     */
    nudge(list, ms = 8000) {
      let i = 0;
      let t = null;
      let stopped = false;
      const arm = () => {
        clearTimeout(t);
        if (stopped || ctx.dead) return;
        t = setTimeout(async () => {
          if (stopped || ctx.dead) return;
          if (isSpeaking()) return arm();
          try {
            await list[i % list.length]?.();
          } catch {
            /* ignore */
          }
          i++;
          arm();
        }, ms);
      };
      const reset = () => arm();
      base.screen.addEventListener('pointerdown', reset);
      arm();
      const stop = () => {
        stopped = true;
        clearTimeout(t);
        base.screen.removeEventListener('pointerdown', reset);
      };
      disposers.push(stop);
      return { stop };
    },
    /** Create the current friend + a main area, side by side (or centred). */
    layout({ size = 'm', center = false, forceSvg = false, mood } = {}) {
      const buddy = new Buddy(store.settings.buddy, { size, forceSvg, mood });
      disposers.push(() => buddy.destroy());
      const main = h('div', { class: 'main' });
      if (center) {
        base.stage.append(h('div', { class: 'centered' }, h('div', { class: 'center-wrap' }, buddy.el), main));
      } else {
        base.stage.append(h('div', { class: 'split' }, h('div', { class: 'side' }, buddy.el), main));
      }
      return { buddy, main };
    },
  };
  ctx.narrator = new Narrator(base.stage);
  return ctx;
}

export function playScreen(unitId, idx) {
  const unit = UNIT_BY_ID[unitId];
  const act = unit?.activities[idx];
  if (!act) return go('#/');

  const screen = h('div', { class: 'screen play type-' + act.type });
  setScene(screen, act.scene || unit.scene);
  const dotsEl = h('div', { class: 'dots' });
  const stage = h('div', { class: 'stage' });
  let ctx = null;
  const replay = iconBtn('🔊', 'Listen again', () => {
    if (ctx?.prompt && !ctx.speaking) {
      sfx.tap();
      Promise.resolve()
        .then(() => ctx.prompt())
        .catch(() => {});
    }
  }, 'replay');
  const top = h(
    'div',
    { class: 'topbar' },
    iconBtn('🏠', 'Back', () => go(`#/unit/${unit.id}`)),
    h('div', { class: 'tb-mid' }, h('div', { class: 'tb-title' }, h('span', { class: 'emo' }, act.icon || TYPE_ICON[act.type]), ' ', act.title), dotsEl),
    replay,
  );
  screen.append(top, stage);
  ctx = makeCtx({ unit, act, idx, screen, stage, dotsEl });
  mount(screen, () => ctx.dispose());

  const engine = ENGINES[act.type];
  Promise.resolve()
    .then(() => engine(ctx, act))
    .then(
      () => !ctx.dead && reward(ctx),
      (e) => {
        if (e === CANCEL || ctx.dead) return;
        console.error(e);
        reward(ctx);
      },
    );
}

const CHEERS = ['Great job, {name}!', 'You did it, {name}!', 'Wonderful, {name}!', 'Super, {name}!', 'Hooray! Well done, {name}!'];

async function reward(ctx) {
  const { unit, idx, screen } = ctx;
  ctx.fx(null);
  const { newSticker } = markDone(unit, idx);
  const hasNext = idx + 1 < unit.activities.length;
  const buddy = new Buddy(store.settings.buddy, { size: 'm', mood: 'joy' });
  const stars = h('div', { class: 'reward-stars' }, ...[0, 1, 2].map((i) => h('span', { class: 'emo', style: { animationDelay: 0.25 + i * 0.25 + 's' } }, '⭐')));
  const next = iconBtn('▶️', 'Next', () => (newSticker ? stickerTime(ctx) : go(hasNext ? `#/play/${unit.id}/${idx + 1}` : `#/unit/${unit.id}`)), 'big primary');
  const card = h(
    'div',
    { class: 'reward-card pop-in' },
    buddy.el,
    stars,
    h('div', { class: 'reward-text' }, fill(pick(CHEERS))),
    h('div', { class: 'reward-btns' }, iconBtn('🏠', 'Map', () => go(`#/unit/${unit.id}`), 'big'), iconBtn('🔁', 'Again', () => playScreen(unit.id, idx), 'big'), next),
  );
  screen.append(h('div', { class: 'overlay' }, card));
  sfx.fanfare();
  confetti();
  buddy.play('jump');
  const line = card.querySelector('.reward-text').textContent;
  await buddy.say(line).catch(() => {});
  if (ctx.dead) return;
  if (newSticker) {
    await sleep(300);
    if (!ctx.dead) stickerTime(ctx);
  } else pointAt(next);
}

async function stickerTime(ctx) {
  const { unit, screen } = ctx;
  if (screen.querySelector('.sticker-ov')) return;
  screen.querySelector('.overlay')?.remove();
  const buddy = new Buddy(store.settings.buddy, { size: 's', mood: 'love' });
  const book = iconBtn('📒', 'Stickers', () => go('#/stickers'), 'big primary');
  const ov = h(
    'div',
    { class: 'overlay sticker-ov' },
    h(
      'div',
      { class: 'reward-card pop-in' },
      h('div', { class: 'sticker-big emo' }, unit.sticker),
      h('div', { class: 'reward-text' }, unit.title),
      h('div', { class: 'reward-btns' }, buddy.el, iconBtn('🏠', 'Home', () => go('#/'), 'big'), book),
    ),
  );
  screen.append(ov);
  sfx.sticker();
  confetti(50);
  await buddy.say('Wow! A sticker for you!').catch(() => {});
  if (!ctx.dead) pointAt(book);
}
