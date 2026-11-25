// LEARN: gift boxes hide pictures. Tap a box -> it opens, the friend says the
// word (and a little sentence). When all are open, we say them together.

import { h, flash } from '../core/util.js';
import { idle } from '../core/speech.js';
import { sfx } from '../core/sfx.js';
import { card, wiggle, pointAt, burstAt } from '../core/ui.js';
import { W, wordLine } from '../content/vocab.js';

export default async function learn(ctx, act) {
  const items = act.words.map((id) => W[id]);
  const { buddy, main } = ctx.layout();
  const grid = h('div', { class: `grid g${items.length}` });
  main.append(grid);

  const opened = new Set();
  let allOpen;
  const allOpenP = new Promise((r) => (allOpen = r));
  let tok = 0;

  const cards = items.map((v, i) => {
    const c = card(v, { cls: 'flip closed' });
    c.prepend(h('div', { class: 'cover' }, h('span', { class: 'emo' }, act.cover || '🎁')));
    c.addEventListener('click', async () => {
      if (ctx.dead) return;
      const my = ++tok;
      if (c.classList.contains('closed')) {
        c.classList.remove('closed');
        opened.add(i);
        sfx.pop();
        burstAt(c, { n: 6, dist: 60 });
      } else sfx.tap();
      flash(c.querySelector('.vis'), 'anim-' + (v.a || 'bounce'), 1300);
      buddy.play('jump', 600);
      await ctx.talk(buddy, wordLine(v), { rate: 0.9 });
      if (v.s && my === tok && !ctx.dead) await ctx.talk(buddy, v.s);
      if (my === tok && opened.size === items.length) allOpen();
    });
    grid.append(c);
    return c;
  });

  ctx.setPrompt(() => buddy.say('Tap the boxes!'));
  await ctx.say(buddy, act.intro || "Let's look! Tap the boxes!");
  const closed = () => cards.find((c) => c.classList.contains('closed'));
  let hand = closed() && opened.size === 0 ? pointAt(closed()) : null;
  const nudge = ctx.nudge([
    () => {
      const c = closed();
      if (c) wiggle(c);
      return buddy.say('Tap a box!');
    },
    () => {
      const c = closed();
      if (c) {
        hand?.();
        hand = pointAt(c);
      }
    },
  ]);
  grid.addEventListener('pointerdown', () => hand?.(), { once: true });
  await ctx.$(allOpenP);
  nudge.stop();
  hand?.();
  await ctx.$(idle());
  await ctx.wait(500);

  // echo time: friend says each word, child repeats
  grid.classList.add('reviewing');
  await ctx.say(buddy, 'Say it with me!');
  for (let i = 0; i < items.length; i++) {
    cards[i].classList.add('hl');
    flash(cards[i].querySelector('.vis'), 'anim-' + (items[i].a || 'bounce'), 1300);
    await ctx.say(buddy, wordLine(items[i]), { rate: 0.9 });
    await ctx.wait(1100);
    cards[i].classList.remove('hl');
  }
  grid.classList.remove('reviewing');
}
