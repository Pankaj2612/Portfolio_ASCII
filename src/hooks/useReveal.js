/* useReveal — returns [ref, shown]. `shown` flips to true the first time the
   element's parent scrolls into view (the parent is observed because
   clip-path/scale-hidden elements report no intersection).
   Under reduced motion (or critic mode) everything is shown immediately. */
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext.js';

export function useReveal() {
  const { instant } = useApp();
  const ref = useRef(null);
  const [shown, setShown] = useState(instant);

  useEffect(() => {
    if (shown) return undefined;
    if (instant || !('IntersectionObserver' in window) || !ref.current) { setShown(true); return undefined; }
    const target = ref.current.parentElement || ref.current;
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { threshold: 0.01, rootMargin: '0px 0px -8% 0px' });
    io.observe(target);
    return () => io.disconnect();
  }, [shown, instant]);

  return [ref, shown];
}


