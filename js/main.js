// Entry point: hash router + start gate + service worker.

import { onRoute } from './core/nav.js';
import { FAST } from './core/speech.js';
import { startScreen, homeScreen, unitScreen, stickerScreen } from './screens/home.js';
import { playScreen } from './screens/play.js';
import { parentScreen } from './screens/parent.js';

let started = false;

function route() {
  if (!started) {
    startScreen(() => {
      started = true;
      route();
    });
    return;
  }
  const [a, b, c] = location.hash.replace(/^#\/?/, '').split('/');
  if (a === 'unit') unitScreen(b);
  else if (a === 'play') playScreen(b, +c || 0);
  else if (a === 'stickers') stickerScreen();
  else if (a === 'parent') parentScreen();
  else homeScreen();
}

window.addEventListener('hashchange', route);
onRoute(route);
route();

// no pinch-zoom / double-tap zoom surprises for small fingers
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

if ('serviceWorker' in navigator && location.protocol === 'https:' && !FAST) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
