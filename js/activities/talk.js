// TALK: a tiny interactive scene. Friends talk, the child taps, chooses what
// to say (picture bubbles), and says lines into the microphone.
//
// Script steps (any combination in one step; setup first, then speech, then interaction):
//   { chars: ['buddy','friend'] }     who is on stage
//   { who: 'friend' }                 speaker for this step (default: first on stage)
//   { mood, anim, wear, unwear, sfx, fx: 'rain'|'snow'|'sun'|'night'|null }
//   { prop: '🥛' | null, propFx: 'drop' | 'toBuddy' | 'toMe' }
//   { n: 'narrator line' }  { c: 'character line' }  { all: 'everyone says' }
//   { tap: 3, taps: ['Mmm...'] }      tap the character N times
//   { tapProp: true, hint: '...' }    tap the prop
//   { choice: [{ e|v, t, then: [...] }] }
//   { say: { t, e|v, key } }          microphone practice
//   { wait: ms }

import { h } from '../core/util.js';
import { store } from '../core/store.js';
import { playSfx, sfx } from '../core/sfx.js';
import { choose, visual, pointAt, flyTo, wiggle, burstAt } from '../core/ui.js';
import { Buddy, friendOf, friend2Of, fill, sayAll } from '../characters.js';
import { W } from '../content/vocab.js';
import { practice } from './say.js';
import { CANCEL } from '../core/cancel.js';
import { speak } from '../core/speech.js';

export default async function talk(ctx, act) {
  const wrap = h('div', { class: 'talk' });
  const castRow = h('div', { class: 'cast' });
  const propBox = h('div', { class: 'prop-box' });
  const bottom = h('div', { class: 'talk-bottom' });
  wrap.append(h('div', { class: 'talk-row' }, castRow, propBox), bottom);
  ctx.stage.append(wrap);
  // shrink the friends a little while choices / the microphone are showing
  new MutationObserver(() => wrap.classList.toggle('busy', bottom.childElementCount > 0)).observe(bottom, { childList: true });

  const me = store.settings.buddy;
  const resolve = (a) => ({ buddy: me, friend: friendOf(me), friend2: friend2Of(me) })[a] || a;
  let cast = {};
  let first = null;

  function setCast(list) {
    Object.values(cast).forEach((b) => b.destroy());
    cast = {};
    castRow.replaceChildren();
    castRow.className = 'cast n' + list.length;
    list.forEach((a, i) => {
      const id = resolve(a);
      const b = new Buddy(id, { size: list.length > 2 ? 'm' : list.length > 1 ? 'ml' : 'l' });
      cast[id] = b;
      castRow.append(b.el);
      setTimeout(() => b.el.classList.add('enter'), i * 180);
      b.art.addEventListener('click', () => b._onTap?.());
    });
    first = resolve(list[0]);
  }
  ctx.onDispose(() => Object.values(cast).forEach((b) => b.destroy()));
  setCast(act.cast || ['buddy']);

  const who = (s) => cast[resolve(s.who || '')] || cast[first];
  let prop = null;

  function showProp(p) {
    propBox.replaceChildren();
    prop = null;
    if (!p) return;
    const v = W[p] || { e: p };
    prop = h('button', { class: 'prop pop-in', type: 'button', 'aria-label': v.t || 'thing' }, visual(v));
    propBox.append(prop);
  }

  async function step(s) {
    if (ctx.dead) throw CANCEL;
    if (s.chars) setCast(s.chars);
    const b = who(s);
    if (s.fx !== undefined && !s.tapProp) ctx.fx(s.fx);
    if (s.unwear) b.unwear();
    if (s.wear) b.wear(s.wear);
    if (s.mood) b.setMood(s.mood);
    if (s.anim) (s.all ? Object.values(cast) : [b]).forEach((x) => x.play(s.anim));
    if (s.sfx) playSfx(s.sfx);
    if (s.prop !== undefined) showProp(s.prop);
    if (s.propFx && prop) {
      const el = prop;
      if (s.propFx === 'drop') {
        el.classList.add('drop-fall');
        await ctx.wait(700);
      } else {
        await ctx.$(flyTo(el, s.propFx === 'toBuddy' ? b.toClient(100, 120) : { x: innerWidth / 2, y: innerHeight + 40 }, { scale: s.propFx === 'toBuddy' ? 0.2 : 1.6 }));
      }
      showProp(null);
    }
    if (s.n) await ctx.say(ctx.narrator, s.n);
    if (s.c) await ctx.say(b, s.c);
    if (s.all) {
      ctx.speaking++;
      try {
        await ctx.$(sayAll(Object.values(cast), s.all));
      } finally {
        ctx.speaking--;
      }
    }
    if (s.tap) await tapChar(b, s);
    if (s.tapProp) await tapProp(s);
    if (s.choice) await choice(s);
    if (s.say) {
      await practice(ctx, b, s.say, bottom);
      bottom.replaceChildren();
    }
    if (s.wait) await ctx.wait(s.wait);
  }

  async function run(steps) {
    for (const s of steps) await step(s);
  }

  async function tapChar(b, s) {
    let n = 0;
    let res;
    const done = new Promise((r) => (res = r));
    b.el.classList.add('tappable');
    let stop = pointAt(b.art, { offsetY: 0.4 });
    b._onTap = () => {
      stop?.();
      n++;
      sfx.pop();
      b.play('wiggle', 500);
      const line = s.taps?.[n - 1];
      if (line) ctx.talk(b, line);
      if (n >= s.tap) {
        b._onTap = null;
        res();
      }
    };
    const hint = s.hint || null;
    const nudge = ctx.nudge([() => (hint ? ctx.narrator.say(hint) : null), () => (stop = pointAt(b.art, { offsetY: 0.4 }))], 6000);
    await ctx.$(done);
    nudge.stop();
    stop?.();
    b.el.classList.remove('tappable');
    await ctx.wait(500);
  }

  async function tapProp(s) {
    if (s.tapProp !== true) showProp(s.tapProp);
    if (!prop) return;
    const el = prop;
    let stop = pointAt(el);
    if (s.hint) ctx.setPrompt(() => ctx.narrator.say(s.hint));
    const nudge = ctx.nudge([() => s.hint && ctx.narrator.say(s.hint), () => (stop = pointAt(el))], 6000);
    await ctx.$(new Promise((r) => el.addEventListener('click', r, { once: true })));
    nudge.stop();
    stop?.();
    sfx.pop();
    burstAt(el, { n: 6 });
    if (s.fx !== undefined) ctx.fx(s.fx);
    if (s.tapSfx) playSfx(s.tapSfx);
  }

  async function choice(s) {
    const opts = s.choice;
    const btns = opts.map((o) => {
      const v = o.v ? W[o.v] : { e: o.e };
      return h('button', { class: 'choice pop-in', type: 'button' }, visual(v, { char: o.char || me }), h('div', { class: 'choice-text' }, fill(o.t)));
    });
    bottom.replaceChildren(h('div', { class: 'choices-row n' + btns.length }, ...btns));
    const prompt = s.prompt;
    const nudge = ctx.nudge([() => (prompt ? who(s).say(prompt) : wiggle(btns[0])), () => btns.forEach((b) => wiggle(b))], 7000);
    const picked = await ctx.$(choose(btns));
    nudge.stop();
    const o = opts[btns.indexOf(picked)];
    btns.forEach((b) => b !== picked && b.classList.add('fade'));
    picked.classList.add('picked');
    sfx.pop();
    // the child's line, spoken in a light "kid" voice
    await ctx.say({ say: (t) => speak(fill(t, 'say'), { pitch: 1.85, rate: 1 }) }, o.t);
    await ctx.wait(250);
    bottom.replaceChildren();
    if (o.then) await run(o.then);
  }

  await run(act.steps);
  ctx.fx(null);
}

