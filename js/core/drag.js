// Pointer-based drag (works for finger, pen and mouse).
// A quick tap without movement calls onTap instead, so little hands that
// tap instead of drag still get a response.

export function draggable(el, { onTap, onDrop, onMove, onStart } = {}) {
  let st = null;
  el.style.touchAction = 'none';

  el.addEventListener('pointerdown', (e) => {
    if (el.classList.contains('used') || st) return;
    e.preventDefault();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    st = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false };
    el.classList.add('grab');
    onStart?.(e);
  });

  el.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.id) return;
    const dx = e.clientX - st.x0;
    const dy = e.clientY - st.y0;
    if (!st.moved && Math.hypot(dx, dy) > 10) {
      st.moved = true;
      el.classList.add('dragging');
    }
    if (st.moved) {
      el.style.transform = `translate(${dx}px, ${dy}px) scale(1.15)`;
      onMove?.(e.clientX, e.clientY, e);
    }
  });

  const end = (e, cancelled) => {
    if (!st || e.pointerId !== st.id) return;
    const s = st;
    st = null;
    el.classList.remove('grab', 'dragging');
    if (!s.moved) {
      el.style.transform = '';
      if (!cancelled) onTap?.();
      return;
    }
    const ok = !cancelled && onDrop?.(e.clientX, e.clientY);
    if (!ok) springBack(el);
  };
  el.addEventListener('pointerup', (e) => end(e, false));
  el.addEventListener('pointercancel', (e) => end(e, true));
}

export function springBack(el) {
  el.style.transition = 'transform .35s cubic-bezier(.3,1.6,.5,1)';
  el.style.transform = '';
  setTimeout(() => (el.style.transition = ''), 400);
}
