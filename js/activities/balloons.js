// BALLOONS: "Pop the red balloon!" — tap the right colour to pop it.

import { h, shuffle, sample, pick, rand } from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { balloonSVG, choose, wiggle, shake, burst, PRAISE, markAnswer } from '../core/ui.js';
import { W, wordText } from '../content/vocab.js';
import { rounds } from './listen.js';

export default async function balloons(ctx, act) {
  const pool = act.words.map((id) => W[id]);
  const order = rounds(pool, act.rounds || 6);
  const { buddy, main } = ctx.layout();
  const sky = h('div', { class: 'balloon-sky' });
  main.append(sky);
  await ctx.say(buddy, act.intro || "Balloons! Let's pop them!");

  for (let r = 0; r < order.length; r++) {
    ctx.dots(r, order.length);
    const ans = order[r];
    const opts = shuffle([ans, ...sample(pool.filter((x) => x !== ans), Math.min(4, pool.length - 1))]);
    const bs = opts.map((v) => {
      const b = h('button', { class: 'balloon', type: 'button', 'aria-label': v.t, style: { '--d': rand(0, 2).toFixed(2) + 's', '--y': rand(-6, 6).toFixed(0) + '%' }, html: balloonSVG(v.color) });
      b._v = v;
      return b;
    });
    sky.replaceChildren(...bs);
    const q = wordText(act.q || 'Pop the {t} balloon!', ans);
    ctx.setPrompt(() => buddy.say(q));
    ctx.talk(buddy, q);
    const right = bs[opts.indexOf(ans)];
    markAnswer(right);
    let wrong = 0;
    for (;;) {
      const nudge = ctx.nudge([() => buddy.say(q), () => wiggle(right)], 7000);
      const picked = await ctx.$(choose(bs));
      nudge.stop();
      if (picked === right) {
        const r2 = picked.getBoundingClientRect();
        picked.classList.add('popped');
        sfx.pop();
        burst(r2.left + r2.width / 2, r2.top + r2.height * 0.35, { emojis: ['✨', '💥', '⭐'], n: 10 });
        buddy.play('jump');
        await ctx.say(buddy, `${pick(PRAISE)} ${wordText('{T}!', ans)}`);
        break;
      }
      wrong++;
      sfx.boing();
      shake(picked);
      await ctx.say(buddy, wordText("That's {t}!", picked._v) + ' ' + q);
      if (wrong >= 2) right.classList.add('glow');
    }
    await ctx.wait(300);
  }
  ctx.dots(order.length, order.length);
}
