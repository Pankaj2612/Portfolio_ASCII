/* ==========================================================================
   ScrollSpider — the vertical scroll indicator in the right-hand rail.
   The spider lowers itself on its thread as you scroll, its legs move with
   every step, and it catches one fly per section (with a little sound when
   sound is on). Click anywhere on the rail to jump there.

   Logic lives in spider.js. For smoothness the spider's position is written
   straight to the DOM from the scroll store (no React re-render per pixel);
   React only re-renders when a fly is caught/released or the layout changes.
   ========================================================================== */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext.js';
import { useStore } from '../../lib/store.js';
import { sfx } from '../../lib/sound.js';
import { FRAMES, FLY, COCOON, ANCHOR, STEP_PX, spiderY, frameAt, layoutFlies, caughtCount, progressAt } from './spider.js';

const NO_MARKS = [];

function SpiderArt({ frame }) {
  return (
    <>
      {FRAMES[frame].map((row, r) => (
        <span key={r} className="block">
          {[...row].map((ch, i) => {
            const cls = ch === 'o' ? 'spider-eye text-highlight' : ch === '(' || ch === ')' ? 'text-fg' : 'text-secondary';
            return <span key={i} className={cls}>{ch}</span>;
          })}
        </span>
      ))}
    </>
  );
}

export default function ScrollSpider() {
  const { uiStore, seek } = useApp();
  const marks = useStore(uiStore, s => s.marks || NO_MARKS);
  const railRef = useRef(null), bodyRef = useRef(null), threadRef = useRef(null);
  const [geo, setGeo] = useState({ travel: 0, h: 0 });
  const [frame, setFrame] = useState(0);
  const [caught, setCaught] = useState(0);
  const live = useRef({ y: -1, step: 0, frame: 0, caught: 0, pct: -1, ready: false });

  // measure rail + spider height
  useLayoutEffect(() => {
    const rail = railRef.current, body = bodyRef.current;
    if (!rail || !body) return undefined;
    const measure = () => {
      const h = body.offsetHeight;
      const travel = Math.max(0, rail.clientHeight - h - 18);
      setGeo(g => (g.travel === travel && g.h === h ? g : { travel, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(rail);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, []);

  // follow the scroll store; write position straight to the DOM
  useEffect(() => {
    const apply = (withSound) => {
      const { progress } = uiStore.get();
      const y = spiderY(progress, geo.travel);
      const L = live.current;
      if (y !== L.y) {
        bodyRef.current.style.transform = `translate3d(-50%, ${y}px, 0)`;
        threadRef.current.style.height = `${y}px`;
        // tick once per step travelled (not per pose change, so big jumps still click)
        const step = Math.floor(y / STEP_PX);
        if (step !== L.step) { L.step = step; if (withSound) sfx.play('tick', { p: progress }); }
        const f = frameAt(y);
        if (f !== L.frame) { L.frame = f; setFrame(f); }
        L.y = y;
      }
      const c = caughtCount(marks, progress, geo.travel);
      if (c !== L.caught) { if (withSound && L.ready) sfx.play(c > L.caught ? 'catch' : 'uncatch'); L.caught = c; setCaught(c); }
      const pct = Math.round(progress * 100);
      if (pct !== L.pct) { L.pct = pct; railRef.current.setAttribute('aria-valuenow', String(pct)); }
    };
    apply(false);
    live.current.ready = true;
    return uiStore.subscribe(() => apply(true));
  }, [uiStore, geo.travel, marks]);

  const flies = useMemo(() => layoutFlies(marks, uiStore.get().progress, geo.travel), [marks, geo.travel, caught]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextFly = flies.findIndex(f => !f.caught);

  const onClick = (e) => {
    const r = railRef.current.getBoundingClientRect();
    seek(progressAt(e.clientY - r.top - 14, geo.h, geo.travel));
  };

  return (
    <div
      ref={railRef}
      onClick={onClick}
      title="click to jump"
      role="progressbar"
      aria-label="Scroll progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-valuetext={`${caught} of ${marks.length} sections reached`}
      className="rail fixed bottom-0 right-0 top-[var(--nav-h)] z-80 w-[var(--rail-w)] cursor-pointer select-none overflow-hidden border-l border-line bg-ink-1/90 font-banner text-[length:var(--spider-fs)] leading-[1.15]"
    >
      <span aria-hidden="true" className="absolute left-1/2 top-1 z-1 -translate-x-1/2 bg-ink-1 leading-none text-fg-2">{ANCHOR}</span>
      {/* silk thread */}
      <span ref={threadRef} aria-hidden="true" className="absolute left-1/2 top-[14px] w-0 -translate-x-1/2 border-l border-dashed border-fg-3" style={{ height: 4 }} />
      {/* flies: caught ones become silk cocoons on the thread */}
      {flies.map(f => (
        <span
          key={f.i}
          aria-hidden="true"
          className={`absolute left-1/2 z-1 -translate-x-1/2 bg-ink-1 leading-none ${f.caught ? 'text-fg-2' : `text-highlight font-bold ${f.i === nextFly ? 'fly-buzz' : ''}`}`}
          style={{ top: 14 + f.y + geo.h / 2 - 6 }}
        >
          {f.caught ? COCOON : FLY}
        </span>
      ))}
      {/* the spider */}
      <div ref={bodyRef} aria-hidden="true" className="spider absolute left-1/2 top-[14px] z-2 whitespace-pre text-center will-change-transform" style={{ transform: 'translate3d(-50%,0,0)' }}>
        <div className="spider-sway">
          <SpiderArt frame={frame} />
        </div>
      </div>
    </div>
  );
}

