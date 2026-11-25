// DRAG: give things to a friend.
//   mode 'eat'  : "I'm hungry! Can I have a banana, please?"  -> feed
//   mode 'wear' : "Put on the hat!"                            -> dress up
//   mode 'box'  : "Put the ball in the box!"                   -> clean up
//   mode 'give' : "Can I have two cookies, please?"            -> count while giving

import { h, shuffle, sample, pick, cap, NUM, isOver, flash } from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { draggable } from '../core/drag.js';
import { wiggle, flyTo, burstAt, dragHint, PRAISE, markAnswer } from '../core/ui.js';
import { W, wordText } from '../content/vocab.js';

function toyBox() {
  return h(
    'div',
    { class: 'toybox' },
    h('div', { class: 'toybox-lid' }),
    h('div', { class: 'toybox-body' }, h('span', { class: 'emo' }, '⭐')),
  );
}

export default async function drag(ctx, act) {
  const mode = act.mode || 'eat';
  const { buddy, main } = ctx.layout({ size: mode === 'box' ? 'm' : 'l', forceSvg: mode === 'wear' });
  const tray = h('div', { class: 'tray' });
  const box = mode === 'box' ? toyBox() : null;
  if (box) main.append(box);
  main.append(tray);
  main.classList.add('drag-main', 'mode-' + mode);
  const target = box || buddy.art;

  const pool = (act.pool || act.rounds.map((r) => r.want)).map((id) => W[id]);
  let remaining = act.all ? shuffle(pool) : null; // clean-up: everything on the floor at once
  const plan = act.all ? remaining.slice(0, act.rounds?.length || remaining.length) : act.rounds.map((r) => ({ ...r, want: W[r.want] }));

  if (act.intro) await ctx.say(buddy, act.intro);

  if (remaining) {
    tray.replaceChildren(...remaining.map((v) => item(v)));
  }

  for (let ri = 0; ri < plan.length; ri++) {
    ctx.dots(ri, plan.length);
    const rd = act.all ? { want: plan[ri] } : plan[ri];
    const want = rd.want;
    const need = rd.n || 1;
    let got = 0;
    let busy = false;

    if (!remaining) {
      let items;
      if (rd.n) items = Array.from({ length: Math.min(rd.n + 2, 6) }, () => want);
      else {
        const worn = Object.keys(buddy.worn);
        const others = pool.filter((v) => v !== want && !(mode === 'wear' && v.slot && worn.includes(v.slot)));
        items = shuffle([want, ...sample(others, (act.choices || 3) - 1)]);
      }
      tray.replaceChildren(...items.map((v) => item(v)));
    }
    tray.querySelectorAll('.item').forEach((el) => flash(el, 'deal', 600));

    const askText =
      rd.ask ||
      {
        eat: (ri === 0 ? "I'm hungry! " : '') + 'Can I have {one}, please?',
        wear: 'Put on the {t}!',
        box: 'Put the {t} in the box!',
        give: `Can I have ${NUM[need]} {pl}, please?`,
      }[mode];
    const q = wordText(askText, want);
    const ask = () => buddy.say(q);
    ctx.setPrompt(ask);
    if (mode === 'eat') buddy.setMood('hungry');

    let finish;
    const done = new Promise((r) => (finish = r));

    // wire up the tray items for this round
    for (const el of tray.querySelectorAll('.item:not(.used)')) {
      delete el.dataset.answer;
      if (el._v === want) markAnswer(el);
      el._onTap = () => attempt(el, true);
      el._onDrop = (x, y) => (isOver(target, x, y, 30) ? attempt(el, false) : false);
    }

    function attempt(el, viaTap) {
      if (busy || ctx.dead) return false;
      if (el._v !== want) {
        sfx.boing();
        wiggle(el);
        buddy.play('shake', 600);
        ctx.talk(buddy, viaTap ? wordText("That's {one}.", el._v) : wordText("That's {one}. ", el._v) + q);
        return false;
      }
      busy = true;
      el.classList.add('used');
      success(el).then(() => {
        busy = false;
        if (got >= need) finish();
      });
      return true;
    }

    async function success(el) {
      if (mode === 'eat') {
        const p = buddy.toClient(100, 120);
        await flyTo(el, p, { scale: 0.2 });
        el.classList.add('gone');
        got++;
        buddy.setMood('yummy');
        buddy.play('eat', 800);
        sfx.munch();
        await ctx.talk(buddy, pick(['Yummy! Thank you!', 'Mmm, yummy! Thank you!', 'Thank you! Delicious!']));
        buddy.setMood('happy');
      } else if (mode === 'wear') {
        await flyTo(el, buddy.art, { scale: 0.6 });
        el.classList.add('gone');
        got++;
        buddy.wear(want.id);
        sfx.sparkle();
        burstAt(buddy.art, { n: 6 });
        buddy.play('jump');
        await ctx.talk(buddy, wordText(rd.done || act.done || '{T} on! ' + pick(['I like it!', 'Thank you!', 'Cool!']), want));
      } else if (mode === 'box') {
        await flyTo(el, box, { scale: 0.3 });
        el.classList.add('gone');
        remaining = remaining?.filter((v) => v !== want);
        got++;
        sfx.pop();
        flash(box, 'bounce', 700);
        await ctx.talk(buddy, wordText('{T}, in the box!', want));
      } else {
        // give: count each one
        const p = buddy.toClient(100, 175);
        await flyTo(el, p, { scale: 0.4 });
        el.classList.add('gone');
        got++;
        sfx.pop();
        buddy.play('jump', 500);
        pile(want, got);
        await ctx.talk(buddy, cap(NUM[got]) + '!');
        if (got >= need) {
          sfx.ding();
          await ctx.talk(buddy, `${cap(NUM[need])} ${need === 1 ? want.t : want.pl}! Thank you!`);
        }
      }
    }

    function pile(v, n) {
      let p = buddy.el.querySelector('.pile');
      if (!p) buddy.el.append((p = h('div', { class: 'pile' })));
      p.replaceChildren(...Array.from({ length: n }, () => h('span', { class: 'emo' }, v.e)));
    }

    await ctx.say(buddy, q);
    const first = [...tray.querySelectorAll('.item:not(.used)')].find((x) => x._v === want);
    let stopHint = ri === 0 && first ? dragHint(first, target) : null;
    const nudge = ctx.nudge([
      ask,
      () => {
        buddy.think(mode === 'give' ? `${want.e}×${need}` : want.e);
      },
      () => {
        const el = [...tray.querySelectorAll('.item:not(.used)')].find((x) => x._v === want);
        if (el) {
          wiggle(el);
          stopHint?.();
          stopHint = dragHint(el, target);
        }
      },
    ]);
    await ctx.$(done);
    nudge.stop();
    stopHint?.();
    buddy.think(null);
    await ctx.wait(300);
    if (mode === 'give') buddy.el.querySelector('.pile')?.remove();
  }
  ctx.dots(plan.length, plan.length);
  if (mode === 'box') await ctx.say(buddy, `${pick(PRAISE)} All clean!`);

  function item(v) {
    const el = h('div', { class: 'item', role: 'button', 'aria-label': v.t }, h('span', { class: 'emo' }, v.e));
    el._v = v;
    draggable(el, { onTap: () => el._onTap?.(), onDrop: (x, y) => el._onDrop?.(x, y) || false });
    return el;
  }
}
