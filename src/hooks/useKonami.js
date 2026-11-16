/* useKonami — calls onUnlock after ↑ ↑ ↓ ↓ ← → ← → B A (ignored while typing in a field). */
import { useEffect, useRef } from 'react';

const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export function useKonami(onUnlock) {
  const cb = useRef(onUnlock);
  cb.current = onUnlock;
  useEffect(() => {
    let i = 0;
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable || e.target.closest?.('.snake-game')) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      i = k === CODE[i] ? i + 1 : (k === CODE[0] ? 1 : 0);
      if (i === CODE.length) { i = 0; cb.current(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
}
