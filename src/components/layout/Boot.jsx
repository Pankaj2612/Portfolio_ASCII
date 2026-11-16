/* BOOT — ~2s retro BIOS sequence. Skipped on repeat visits (per session),
   under reduced motion and in critic mode. Any key / tap skips it. */
import { useEffect, useRef, useState } from 'react';
import AsciiBanner from '../ui/AsciiBanner.jsx';
import { sfx } from '../../lib/sound.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const TONE = { ok: 'text-secondary', warn: 'text-highlight', hi: 'text-fg' };

export default function Boot({ getEngine, onDone }) {
  const [rows, setRows] = useState([]);
  const [pct, setPct] = useState(0);
  const [out, setOut] = useState(false);
  const skipped = useRef(false);

  useEffect(() => {
    let alive = true;
    const skip = () => { skipped.current = true; };
    addEventListener('keydown', skip, { once: true });
    addEventListener('pointerdown', skip, { once: true });
    const add = r => { if (!alive) return; setRows(x => [...x, r]); sfx.play('boot'); };
    const step = async (ms, p) => { if (!alive) return; setPct(p); if (!skipped.current) await sleep(ms); };
    (async () => {
      const gl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
      add({ t: 'PKS BIOS v2.04', c: 'hi' }); await step(160, 12);
      add({ l: 'MEMORY CHECK', s: 'OK' }); await step(160, 26);
      add({ l: 'WEBGL', s: gl ? 'OK' : 'UNAVAILABLE', c: gl ? 'ok' : 'warn' }); await step(160, 42);
      let engine = getEngine();
      for (let i = 0; i < 13 && engine === 'pending' && !skipped.current; i++) { await sleep(100); engine = getEngine(); }
      add({ l: 'THREE.JS ENGINE', s: engine === 'online' ? 'ONLINE' : engine === 'fallback' ? 'FALLBACK' : 'DEFERRED', c: engine === 'online' ? 'ok' : 'warn' }); await step(180, 64);
      add({ l: 'SPIDER.DAEMON', s: 'SPAWNED' }); await step(120, 74);
      add({ l: 'AUDIO.SYNTH', s: sfx.isEnabled() ? 'ARMED' : 'MUTED', c: sfx.isEnabled() ? 'ok' : 'warn' }); await step(120, 84);
      add({ t: 'BOOT COMPLETE', c: 'ok' }); sfx.play('bootDone'); await step(160, 100);
      add({ t: '> START SESSION_', c: 'hi' }); await step(240, 100);
      if (!alive) return;
      try { sessionStorage.setItem('pks.booted', '1'); } catch { /* ignore */ }
      setOut(true);
      setTimeout(() => alive && onDone(), 450);
    })();
    return () => { alive = false; removeEventListener('keydown', skip); removeEventListener('pointerdown', skip); };
  }, [getEngine, onDone]);

  return (
    <div
      id="boot"
      aria-hidden="true"
      className={`fixed inset-0 z-300 grid place-items-center bg-ink-0 p-[clamp(16px,4vw,48px)] transition-[opacity,visibility] duration-[450ms] ${out ? 'invisible opacity-0' : ''}`}
    >
      <div className="w-[min(560px,100%)]">
        <div className="mb-[18px]"><AsciiBanner text="PKS.OS" max={12} /></div>
        <div className="mb-4 min-h-[9.5em] whitespace-pre-wrap text-[clamp(12px,1.6vw,14px)] leading-[1.55] text-fg-2">
          {rows.map((r, i) => (
            <div key={i} className={r.t ? TONE[r.c] : undefined}>
              {r.t || <>{r.l} {'.'.repeat(Math.max(2, 22 - r.l.length))} <span className={TONE[r.c || 'ok']}>{r.s}</span></>}
            </div>
          ))}
        </div>
        <div className="h-2.5 border border-line-strong p-px">
          <span className="block h-full bg-[repeating-linear-gradient(90deg,var(--primary)_0_6px,transparent_6px_8px)] transition-[width] duration-200 ease-[steps(6)]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="absolute bottom-[18px] right-[22px] text-[11px] uppercase tracking-[.16em] text-fg-3">press any key to skip</span>
    </div>
  );
}


