// SAY: listen to the friend, then tap the microphone and say it.
// Pronunciation is checked loosely; after two tries we always praise.

import { h, pick } from '../core/util.js';
import { store } from '../core/store.js';
import { sfx } from '../core/sfx.js';
import { hear, stopListening } from '../core/mic.js';
import { visual, pointAt, burstAt } from '../core/ui.js';
import { fill } from '../characters.js';
import { W } from '../content/vocab.js';

/** One "listen -> your turn -> mic" exchange. Reused inside conversations. */
export async function practice(ctx, buddy, item, host) {
  const v = item.v ? W[item.v] : { e: item.e, t: item.t };
  const useMic = store.settings.mic !== false;
  const pic = h('button', { class: 'say-pic', type: 'button', 'aria-label': 'listen' }, visual(v), h('div', { class: 'say-text' }, fill(item.t)));
  const level = h('i', { class: 'mic-level' });
  const mic = h('button', { class: 'mic-btn', type: 'button', 'aria-label': 'microphone' }, level, h('span', { class: 'emo' }, useMic ? '🎤' : '👂'));
  const box = h('div', { class: 'say-box pop-in' }, pic, mic);
  host.replaceChildren(box);
  pic.addEventListener('click', () => ctx.talk(buddy, item.t, { rate: 0.85 }));
  ctx.onDispose(stopListening);

  await ctx.say(buddy, item.t, { rate: 0.85 });
  for (let attempt = 1; attempt <= 2; attempt++) {
    await ctx.say(buddy, attempt === 1 ? 'Your turn!' : "Let's try again!");
    if (attempt === 2) await ctx.say(buddy, item.t, { rate: 0.8 });
    ctx.setPrompt(() => buddy.say(item.t, { rate: 0.85 }));

    if (useMic) {
      mic.classList.add('ready');
      let stopHand = pointAt(mic);
      const nudge = ctx.nudge([() => (stopHand = pointAt(mic)), () => buddy.say(item.t, { rate: 0.85 })], 7000);
      await ctx.$(new Promise((r) => mic.addEventListener('click', r, { once: true })));
      nudge.stop();
      stopHand?.();
      mic.classList.remove('ready');
      sfx.click();
    }
    mic.classList.add('listening');
    buddy.el.classList.add('listening');
    const res = await ctx.$(
      hear(fill(item.t, 'say'), {
        useMic,
        keys: item.key,
        ignore: [store.settings.childSay, store.settings.childName],
        onLevel: (x) => level.style.setProperty('--lv', x.toFixed(2)),
      }),
    );
    mic.classList.remove('listening');
    buddy.el.classList.remove('listening');

    if (res.ok) {
      sfx.ding();
      burstAt(pic, { emojis: ['⭐', '🌟', '💖'], n: 10 });
      buddy.setMood('joy');
      buddy.play('jump');
      await ctx.say(buddy, pick(['Great job!', 'Wow! Very good!', 'Perfect!', 'Yay! You did it!']));
      buddy.setMood('happy');
      return true;
    }
    if (attempt === 2) {
      sfx.sparkle();
      buddy.play('jump');
      await ctx.say(buddy, `Good try! ${fill(item.t)}`);
      return false;
    }
    buddy.play('wiggle', 600);
  }
  return false;
}

export default async function say(ctx, act) {
  const { buddy, main } = ctx.layout();
  main.classList.add('say-main');
  if (act.intro) await ctx.say(buddy, act.intro);
  for (let i = 0; i < act.items.length; i++) {
    ctx.dots(i, act.items.length);
    if (i === 0) await ctx.say(buddy, 'Listen!');
    await practice(ctx, buddy, act.items[i], main);
    await ctx.wait(300);
  }
  ctx.dots(act.items.length, act.items.length);
}
