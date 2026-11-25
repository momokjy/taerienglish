// TOUCH: body parts on the friend.
//   explore: tap anywhere -> "My nose!"  (find them all)
//   quiz:    "Where is my nose?" -> tap it -> "Touch YOUR nose!" (real body)

import { h, shuffle, pick, cap } from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { burst, PRAISE, markAnswer } from '../core/ui.js';
import { PARTS } from '../characters.js';

const ICON = { head: '🙆', eyes: '👀', ears: '👂', nose: '👃', mouth: '👄', hands: '🙌', tummy: '🌀', feet: '🦶' };

function glowAt(buddy, part) {
  const p = buddy.partPoint(part);
  const r = buddy.art.getBoundingClientRect();
  const g = h('div', { class: 'part-glow', style: { left: ((p.x - r.left) / r.width) * 100 + '%', top: ((p.y - r.top) / r.height) * 100 + '%' } });
  buddy.art.append(g);
  setTimeout(() => g.remove(), 2600);
}

export default async function touch(ctx, act) {
  const parts = act.parts || Object.keys(PARTS);
  const { buddy, main } = ctx.layout({ size: 'xl', center: true, forceSvg: true });
  buddy.el.classList.add('touchable');
  let onTap = null;
  buddy.art.addEventListener('click', (e) => onTap?.(e));

  if (act.mode === 'explore') {
    const chips = h('div', { class: 'chips' });
    const chipOf = {};
    parts.forEach((p) => chips.append((chipOf[p] = h('div', { class: 'chip' }, h('span', { class: 'emo' }, ICON[p] || '⭐')))));
    main.append(chips);
    const found = new Set();
    let all;
    const allP = new Promise((r) => (all = r));
    let tok = 0;
    onTap = async (e) => {
      const part = buddy.partAt(e.clientX, e.clientY, parts);
      if (!part) return;
      const my = ++tok;
      burst(e.clientX, e.clientY, { n: 6, dist: 50 });
      sfx.pop();
      buddy.play('wiggle', 600);
      chipOf[part].classList.add('on');
      found.add(part);
      await ctx.talk(buddy, `My ${PARTS[part].word}!`);
      if (my === tok && found.size === parts.length) all();
    };
    ctx.setPrompt(() => buddy.say('Touch me!'));
    await ctx.say(buddy, act.intro || 'Touch me! Tap, tap!');
    const nudge = ctx.nudge([
      () => {
        const p = parts.find((x) => !found.has(x));
        if (!p) return;
        glowAt(buddy, p);
        return buddy.say(`Where ${PARTS[p].pl ? 'are' : 'is'} my ${PARTS[p].word}?`);
      },
    ]);
    await ctx.$(allP);
    nudge.stop();
    onTap = null;
    await ctx.say(buddy, pick(PRAISE) + ' You found them all!');
    return;
  }

  // quiz
  const order = shuffle(parts).slice(0, act.rounds || 5);
  await ctx.say(buddy, act.intro || "Let's play! Listen!");
  for (let r = 0; r < order.length; r++) {
    ctx.dots(r, order.length);
    const part = order[r];
    const P = PARTS[part];
    const q = `Where ${P.pl ? 'are' : 'is'} my ${P.word}?`;
    markAnswer(buddy.art, part);
    ctx.setPrompt(() => buddy.say(q));
    let resolve;
    const hit = new Promise((res) => (resolve = res));
    let wrong = 0;
    let busy = false;
    onTap = async (e) => {
      if (busy) return;
      // forgiving: close enough to the asked part counts, even if another part is nearer
      const got = buddy.distTo(part, e.clientX, e.clientY) <= 24 ? part : buddy.partAt(e.clientX, e.clientY, parts);
      if (!got) return;
      if (got === part) {
        busy = true;
        burst(e.clientX, e.clientY);
        sfx.ding();
        resolve();
        return;
      }
      busy = true;
      sfx.boing();
      buddy.play('shake', 500);
      wrong++;
      if (wrong >= 2) glowAt(buddy, part);
      await ctx.talk(buddy, `That's my ${PARTS[got].word}! ${q}`);
      busy = false;
    };
    ctx.talk(buddy, q);
    const nudge = ctx.nudge([() => buddy.say(q), () => glowAt(buddy, part)], 7000);
    await ctx.$(hit);
    nudge.stop();
    onTap = null;
    buddy.play('jump');
    await ctx.say(buddy, `${pick(PRAISE)} My ${P.word}!`);
    if (act.yours) {
      const big = h('div', { class: 'your-turn emo' }, ICON[part] || '👆');
      main.replaceChildren(big);
      await ctx.say(buddy, `Now touch your ${P.word}!`);
      await ctx.wait(2200);
      sfx.sparkle();
      await ctx.say(buddy, pick(['Good!', 'Great!', 'Yes! ' + cap(P.word) + '!']));
      main.replaceChildren();
    }
  }
  ctx.dots(order.length, order.length);
}
