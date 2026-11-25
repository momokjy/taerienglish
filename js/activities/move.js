// MOVE: the friend shows an action ("Clap your hands!"), then the child does
// it for real while we count the beats together. Gets little bodies moving.

import { h, cap, pick, NUM, flash } from '../core/util.js';
import { playSfx, sfx } from '../core/sfx.js';
import { confetti } from '../core/ui.js';

export default async function move(ctx, act) {
  const { buddy, main } = ctx.layout({ size: 'l', center: true });
  const sign = h('div', { class: 'move-sign emo' });
  const beatEl = h('div', { class: 'beat-dots' });
  main.append(sign, beatEl);
  main.classList.add('move-main');

  if (act.intro) await ctx.say(buddy, act.intro);
  for (let i = 0; i < act.items.length; i++) {
    const it = act.items[i];
    const n = it.n || 3;
    ctx.dots(i, act.items.length);
    sign.textContent = it.e;
    flash(sign, 'pop-in', 500);
    beatEl.replaceChildren(...Array.from({ length: n }, () => h('i')));
    ctx.setPrompt(() => buddy.say(it.t));

    buddy.play(it.anim);
    playSfx(it.sfx);
    await ctx.say(buddy, it.t);
    await ctx.say(buddy, i === 0 ? "Let's do it together! Ready?" : pick(['Your turn!', 'Ready? Go!', "Let's go!"]));
    for (let k = 1; k <= n; k++) {
      buddy.play(it.anim);
      flash(sign, 'beat', 500);
      beatEl.children[k - 1]?.classList.add('on');
      playSfx(it.sfx || 'pop');
      await ctx.say(buddy, it.count ? cap(NUM[k]) + '!' : it.beat || cap(NUM[k]) + '!', { rate: 1.1 });
      await ctx.wait(450);
    }
    sfx.sparkle();
    if (i === act.items.length - 1) confetti(20);
    await ctx.say(buddy, pick(['Great job!', 'Wow! Super!', 'Good moving!', 'Yay!']));
    await ctx.wait(300);
  }
  ctx.dots(act.items.length, act.items.length);
}
