/* 3D block-letter banner, auto-fitted to the available width.
   Decorative (aria-hidden): always pair it with a real heading. */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { bannerLines, bannerRuns, charRatio, resetCharRatio } from '../../lib/ascii.js';

const px = v => parseFloat(v) || 0;
const contentWidth = el => { const cs = getComputedStyle(el); return el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight); };

export default function AsciiBanner({ text, max = 14, min = 3, className = '' }) {
  const lines = useMemo(() => bannerLines(text), [text]);
  const runs = useMemo(() => bannerRuns(lines), [lines]);
  const cols = [...lines[0]].length;
  const ref = useRef(null);
  const [size, setSize] = useState(null);

  useLayoutEffect(() => {
    const pre = ref.current;
    if (!pre) return undefined;
    // inside a content-sized heading plate (.sec-head) measure the plate's parent,
    // otherwise the banner would shrink itself to its own width
    const head = pre.closest('.sec-head');
    const root = head ? head.parentElement : pre.parentElement;
    const fit = () => {
      let avail = contentWidth(root);
      if (head) { const cs = getComputedStyle(head); avail -= px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.borderLeftWidth) + px(cs.borderRightWidth); }
      const next = Math.max(min, Math.min(max, Math.floor(((avail * 0.98) / (cols * charRatio(pre))) * 10) / 10));
      setSize(prev => (prev === next ? prev : next));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) { resetCharRatio(); fit(); } }).catch(() => {});
    return () => { alive = false; ro.disconnect(); };
  }, [cols, max, min]);

  return (
    <pre ref={ref} className={`ascii-banner ${className}`} aria-hidden="true" style={size ? { fontSize: `${size}px` } : undefined}>
      {runs.map((line, li) => (
        <span key={li}>
          {line.map((r, ri) => (r.k === 'sp' ? r.t : <span key={ri} className={r.k}>{r.t}</span>))}
          {li < runs.length - 1 ? '\n' : null}
        </span>
      ))}
    </pre>
  );
}


