/* Custom cursor (dot + lagging box) — fine pointers only, off under reduced motion. */
import { useEffect, useRef } from 'react';

const HOVER = 'a, button, .project-card, .skill-card, input, textarea';

export default function Cursor({ enabled }) {
  const dot = useRef(null), box = useRef(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const html = document.documentElement;
    html.classList.add('has-cursor');
    let x = 0, y = 0, bx = 0, by = 0, raf = 0, seen = false;
    const loop = () => {
      bx += (x - bx) * 0.22; by += (y - by) * 0.22;
      box.current.style.transform = `translate3d(${bx}px, ${by}px, 0)`;
      raf = Math.abs(x - bx) + Math.abs(y - by) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    const move = (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      if (!seen) { seen = true; bx = x; by = y; }
      dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      dot.current.classList.remove('hidden'); box.current.classList.remove('hidden');
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const leave = () => { dot.current.classList.add('hidden'); box.current.classList.add('hidden'); };
    const over = (e) => { if (e.target.closest?.(HOVER)) box.current.classList.add('hover'); };
    const outE = (e) => { if (e.target.closest?.(HOVER) && !e.relatedTarget?.closest?.(HOVER)) box.current.classList.remove('hover'); };
    addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerout', outE);
    return () => {
      html.classList.remove('has-cursor');
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerout', outE);
    };
  }, [enabled]);
  return (
    <>
      <div ref={dot} className="cursor-dot hidden" aria-hidden="true" />
      <div ref={box} className="cursor-box hidden" aria-hidden="true" />
    </>
  );
}


