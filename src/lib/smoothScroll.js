/* ==========================================================================
   smoothScroll.js
   • wheel input → eased, frame-rate-independent inertial scrolling
     (no overshoot, no stalls)
   • navigation → duration-based easeInOutCubic tween
   • touch, keyboard and scrollbar stay native; nested scroll areas
     (terminal, textarea) keep their own wheel
   • any native input interrupts an animation
   ========================================================================== */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createSmoothScroll({ enabled = true, offset = () => 0 } = {}) {
  const root = document.documentElement;
  let current = window.scrollY, target = current;
  let mode = 'idle'; // 'idle' | 'wheel' | 'tween'
  let tween = null, raf = 0, last = 0;
  const maxY = () => Math.max(0, root.scrollHeight - window.innerHeight);

  function canScrollInside(el, dy) {
    for (let n = el; n && n !== document.body && n !== root; n = n.parentElement) {
      if (!(n instanceof HTMLElement)) continue;
      const oy = getComputedStyle(n).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) {
        if (dy < 0 && n.scrollTop > 0) return true;
        if (dy > 0 && n.scrollTop + n.clientHeight < n.scrollHeight - 1) return true;
      }
    }
    return false;
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 1 / 60);
    last = now;
    if (mode === 'wheel') {
      current += (target - current) * (1 - Math.exp(-dt * 10));
      if (Math.abs(target - current) < 0.4) { current = target; mode = 'idle'; }
    } else if (mode === 'tween') {
      const t = Math.min(1, (now - tween.t0) / tween.dur);
      current = tween.from + (tween.to - tween.from) * easeInOutCubic(t);
      if (t >= 1) { mode = 'idle'; const done = tween.done; tween = null; done && done(); }
    }
    window.scrollTo(0, current);
    raf = mode === 'idle' ? 0 : requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  function cancel() { mode = 'idle'; tween = null; if (raf) cancelAnimationFrame(raf); raf = 0; current = target = window.scrollY; }

  function onWheel(e) {
    if (e.ctrlKey || e.defaultPrevented) return;
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 32; else if (e.deltaMode === 2) dy *= window.innerHeight;
    if (Math.abs(e.deltaX) > Math.abs(dy)) return;
    if (canScrollInside(e.target, dy)) return;
    e.preventDefault();
    if (mode !== 'wheel') { current = window.scrollY; target = current; tween = null; }
    mode = 'wheel';
    target = clamp(target + dy, 0, maxY());
    kick();
  }
  const onPointer = (e) => { if (mode !== 'idle' && !(e.target.closest && e.target.closest('[data-nav]'))) cancel(); };
  const onKey = (e) => { if (mode !== 'idle' && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) cancel(); };

  if (enabled) {
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener('keydown', onKey);
  }

  return {
    enabled,
    /** scroll to an element (aligned below the nav) or to a y value */
    scrollTo(dest, { instant = false, done } = {}) {
      if (!dest && dest !== 0) return;
      const y = typeof dest === 'number' ? dest
        : dest.getBoundingClientRect().top + window.scrollY - (dest.id === 'home' ? 0 : offset());
      const to = clamp(Math.round(y), 0, maxY());
      if (instant || !enabled) { cancel(); window.scrollTo(0, to); current = target = to; done && done(); return; }
      const from = window.scrollY, dist = Math.abs(to - from);
      if (dist < 2) { done && done(); return; }
      mode = 'tween'; current = from; target = to;
      tween = { from, to, t0: performance.now(), dur: clamp(420 + Math.sqrt(dist) * 14, 520, 1250), done };
      kick();
    },
    state: () => ({ mode, current, target, dur: tween ? tween.dur : 0, from: tween ? tween.from : 0, to: tween ? tween.to : 0 }),
    destroy() {
      cancel();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onPointer);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    },
  };
}


