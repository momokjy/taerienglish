// SCRUB: brush teeth, wash face/hands, take a bath.
// Rub the tool over the friend until the germs / mud / bubbles are gone.

import { h, rand } from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { draggable, springBack } from '../core/drag.js';
import { dragHint, burst, markAnswer } from '../core/ui.js';
import { ZONES } from '../characters.js';

function spawnDirt(buddy, zone, kind, n = kind === 'germ' ? 5 : 7) {
  const z = ZONES[zone];
  const out = [];
  for (let i = 0; i < n; i++) {
    const [cx, cy] = z.pts[i % z.pts.length];
    let a;
    let d;
    if (kind === 'germ') {
      // around the sides and below the mouth, never over the eyes
      a = ((-25 + (230 * i) / (n - 1)) * Math.PI) / 180;
      d = z.r * 0.95;
    } else {
      a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      d = z.r * (0.35 + Math.random() * 0.55);
    }
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    const el = h('div', { class: 'dirt dirt-' + kind, style: { left: x / 2 + '%', top: y / 2.4 + '%', '--s': rand(0.75, 1.1).toFixed(2) } }, kind === 'germ' ? h('span', { class: 'emo' }, '🦠') : null);
    buddy.layer.append(el);
    out.push(el);
  }
  return out;
}

export default async function scrub(ctx, act) {
  const { buddy, main } = ctx.layout({ size: 'xl', forceSvg: true });
  main.classList.add('scrub-main');
  const bar = h('div', { class: 'progress' }, h('i'));
  const slot = h('div', { class: 'tool-slot' });
  main.append(bar, slot);

  for (let ti = 0; ti < act.tasks.length; ti++) {
    const task = act.tasks[ti];
    ctx.dots(ti, act.tasks.length);
    const dirt = spawnDirt(buddy, task.zone, task.dirt || 'mud');
    markAnswer(buddy.art, task.zone);
    const tool = h('div', { class: 'tool', role: 'button', 'aria-label': 'tool' }, h('span', { class: 'emo' }, task.tool));
    slot.replaceChildren(tool);
    const fillEl = bar.querySelector('i');
    fillEl.style.width = '0%';

    let progress = 0;
    let last = null;
    let travelled = 0;
    let chanted = 0;
    let finish;
    const done = new Promise((r) => (finish = r));
    const NEED = task.need || 650; // distance in character units
    let hint = null;

    draggable(tool, {
      onStart: () => (last = null),
      onMove: (x, y) => {
        if (progress >= 1) return;
        if (!buddy.inZone(task.zone, x, y)) {
          last = null;
          return;
        }
        const [vx, vy] = buddy.toVB(x, y);
        if (last) {
          const d = Math.hypot(vx - last[0], vy - last[1]);
          progress = Math.min(1, progress + d / NEED);
          travelled += d;
          if (travelled > 40) {
            travelled = 0;
            (task.dirt === 'soap' ? sfx.splash : task.zone === 'mouth' ? sfx.brush : sfx.bubble)();
            bubble(buddy, vx, vy, task.dirt === 'soap' ? 'water' : 'foam');
          }
        }
        last = [vx, vy];
        fillEl.style.width = progress * 100 + '%';
        dirt.forEach((el, i) => (el.style.opacity = Math.max(0, 1 - progress * 1.3 + (i % 3) * 0.08)));
        if (task.chant && chanted === 0 && progress > 0.3) {
          chanted = 1;
          ctx.talk(buddy, task.chant);
        }
        if (task.chant && chanted === 1 && progress > 0.7) {
          chanted = 2;
          ctx.talk(buddy, task.chant);
        }
        if (progress >= 1) finish();
      },
      onDrop: () => false,
      onTap: () => {
        hint?.();
        hint = dragHint(tool, buddy.zonePoint(task.zone));
      },
    });

    buddy.setMood(task.mood || (task.dirt === 'soap' ? 'happy' : 'sad'));
    if (task.pre) await ctx.say(buddy, task.pre);
    await ctx.say(buddy, task.say);
    ctx.setPrompt(() => buddy.say(task.say));
    hint = dragHint(tool, buddy.zonePoint(task.zone));
    const nudge = ctx.nudge([
      () => buddy.say(task.say),
      () => {
        hint?.();
        hint = dragHint(tool, buddy.zonePoint(task.zone));
      },
    ]);
    await ctx.$(done);
    nudge.stop();
    hint?.();
    springBack(tool);
    dirt.forEach((el) => el.remove());
    const p = buddy.zonePoint(task.zone);
    burst(p.x, p.y, { emojis: ['✨', '⭐', '💎'], n: 10 });
    sfx.sparkle();
    buddy.setMood('joy');
    buddy.play('jump');
    await ctx.say(buddy, task.done);
    buddy.setMood('happy');
    await ctx.wait(300);
  }
  ctx.dots(act.tasks.length, act.tasks.length);
}

function bubble(buddy, vx, vy, kind) {
  const b = h('div', { class: 'foam ' + kind, style: { left: (vx + rand(-12, 12)) / 2 + '%', top: (vy + rand(-12, 12)) / 2.4 + '%' } });
  buddy.layer.append(b);
  setTimeout(() => b.remove(), 900);
}
