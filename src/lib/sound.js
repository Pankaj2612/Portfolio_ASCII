/* ==========================================================================
   sound.js — tiny 8-bit sound synth (Web Audio API, zero audio files)

   Every effect is generated on the fly from square / triangle / sawtooth
   oscillators and a white-noise buffer, so it costs ~0 KB to download.

   • OFF by default. Turned on with the [♪] header button or `sound on`.
     The choice is remembered (localStorage 'pks.sound').
   • The AudioContext is only created after the user turns sound on
     (browsers block audio until a user gesture anyway).
   • Suspended while the tab is hidden.
   • Each effect has its own throttle so fast scrolling / typing never
     turns into noise, and a hard cap on simultaneous voices.

   Usage:  import { sfx } from '../lib/sound.js';  sfx.play('key');
   Effects: tick, key, enter, backspace, hover, click, nav, open, close,
            catch, uncatch, error, success, theme, dock, boot, bootDone, toggle
   ========================================================================== */

const STORAGE_KEY = 'pks.sound';
const MASTER = 0.16;          // overall volume (0..1) — change to taste
const MAX_VOICES = 24;
/* effects that must never be dropped by the voice cap */
const PRIORITY = new Set(['error', 'catch', 'uncatch', 'nav', 'open', 'close', 'success', 'toggle', 'theme', 'dock', 'bootDone']);

/* minimum gap between two plays of the same effect (ms) */
const THROTTLE = { tick: 45, key: 28, hover: 70, catch: 120, uncatch: 120 };

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note → Hz

function createSfx() {
  let enabled = false;
  try { enabled = localStorage.getItem(STORAGE_KEY) === 'on'; } catch { /* ignore */ }
  let ctx = null, master = null, noise = null;
  let voices = 0;
  const last = {};
  const listeners = new Set();
  const stats = { played: 0, byName: {}, contextCreated: false };

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    stats.contextCreated = true;
    master = ctx.createGain();
    master.gain.value = MASTER;
    // gentle low-pass keeps square waves from being harsh
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 5200;
    master.connect(lp).connect(ctx.destination);
    // 0.5s of white noise, reused by every noisy effect
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {}); else if (enabled) ctx.resume().catch(() => {});
    });
    return ctx;
  }

  /* ---------- voice building blocks ---------- */
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone({ type = 'square', f = 440, f2 = null, t = 0, dur = 0.08, vol = 0.5, a = 0.004 }) {
    const now = ctx.currentTime + t;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, now);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur);
    env(g, now, a, vol, dur);
    o.connect(g).connect(master);
    o.start(now); o.stop(now + dur + 0.02);
    voices++; o.onended = () => { voices--; o.disconnect(); g.disconnect(); };
  }
  function hiss({ t = 0, dur = 0.03, vol = 0.4, f = 3000, q = 1.2, type = 'bandpass' }) {
    const now = ctx.currentTime + t;
    const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    bp.type = type; bp.frequency.value = f; bp.Q.value = q;
    env(g, now, 0.002, vol, dur);
    s.connect(bp).connect(g).connect(master);
    s.start(now, Math.random() * 0.4, dur + 0.02);
    voices++; s.onended = () => { voices--; s.disconnect(); bp.disconnect(); g.disconnect(); };
  }
  const arp = (notes, step, opts = {}) => notes.forEach((n, i) => tone({ f: NOTE(n), t: i * step, dur: step * 1.6, ...opts }));

  /* ---------- the effects ---------- */
  const FX = {
    // scrolling: a soft mechanical tick; pitch rises as you go down the page (p = 0..1)
    tick: ({ p = 0 } = {}) => { tone({ type: 'triangle', f: 520 + p * 900, dur: 0.025, vol: 0.18 }); hiss({ dur: 0.012, vol: 0.08, f: 5000 }); },
    // typing: retro keyboard clack (filtered noise + tiny square click, randomised)
    key: () => { hiss({ dur: 0.022, vol: 0.32, f: 2200 + Math.random() * 1800, q: 2 }); tone({ f: 1800 + Math.random() * 600, dur: 0.012, vol: 0.06 }); },
    backspace: () => { hiss({ dur: 0.03, vol: 0.28, f: 1200, q: 2 }); tone({ f: 600, f2: 380, dur: 0.04, vol: 0.08 }); },
    enter: () => { hiss({ dur: 0.04, vol: 0.35, f: 900, q: 1.4 }); tone({ type: 'square', f: 880, dur: 0.05, vol: 0.14, t: 0.02 }); },
    // UI
    hover: () => tone({ type: 'triangle', f: 1320, dur: 0.02, vol: 0.12 }),
    click: () => { tone({ f: 660, dur: 0.03, vol: 0.18 }); tone({ f: 990, dur: 0.04, vol: 0.14, t: 0.03 }); },
    nav: () => { tone({ type: 'square', f: 260, f2: 1040, dur: 0.16, vol: 0.16 }); hiss({ t: 0.02, dur: 0.12, vol: 0.12, f: 1800, q: 0.7 }); },
    open: () => { tone({ type: 'sawtooth', f: 120, f2: 900, dur: 0.18, vol: 0.12 }); arp([79, 84], 0.05, { t: 0.14, vol: 0.12 }); },
    close: () => tone({ type: 'sawtooth', f: 800, f2: 90, dur: 0.16, vol: 0.12 }),
    // the spider catches a fly / lets it go (scrolling back up)
    catch: () => { arp([72, 76, 79, 84], 0.045, { vol: 0.16 }); hiss({ t: 0.16, dur: 0.05, vol: 0.12, f: 4000 }); },
    uncatch: () => arp([79, 74, 67], 0.04, { type: 'triangle', vol: 0.14 }),
    // feedback
    error: () => { tone({ f: 110, dur: 0.16, vol: 0.2 }); tone({ f: 104, dur: 0.16, vol: 0.2, t: 0.01 }); },
    success: () => arp([76, 83], 0.07, { vol: 0.15 }),
    theme: () => arp([60, 64, 67, 72, 76], 0.035, { type: 'triangle', vol: 0.15 }),
    dock: () => { tone({ type: 'sawtooth', f: 300, f2: 150, dur: 0.1, vol: 0.1 }); hiss({ dur: 0.1, vol: 0.15, f: 1200, q: 0.6 }); },
    toggle: () => arp([67, 79], 0.05, { vol: 0.15 }),
    // boot: modem-ish chirps, then a chord
    boot: () => { tone({ f: 1200 + Math.random() * 900, dur: 0.035, vol: 0.1 }); },
    bootDone: () => arp([60, 67, 72, 76, 79], 0.06, { vol: 0.14 }),
  };

  function play(name, opts) {
    if (!enabled || !FX[name]) return false;
    const now = performance.now();
    const gap = THROTTLE[name];
    if (gap && last[name] && now - last[name] < gap) return false;
    if (!ensure()) return false;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (voices >= MAX_VOICES && !PRIORITY.has(name)) return false;
    last[name] = now;
    try { FX[name](opts); } catch { return false; }
    stats.played++; stats.byName[name] = (stats.byName[name] || 0) + 1;
    return true;
  }

  function setEnabled(on) {
    enabled = !!on;
    try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch { /* ignore */ }
    if (enabled) { ensure(); ctx && ctx.resume().catch(() => {}); play('toggle'); }
    else if (ctx) ctx.suspend().catch(() => {});
    listeners.forEach(fn => fn(enabled));
    return enabled;
  }

  return {
    play,
    setEnabled,
    toggle: () => setEnabled(!enabled),
    isEnabled: () => enabled,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    effects: Object.keys(FX),
    stats: () => ({ ...stats, byName: { ...stats.byName }, enabled, state: ctx ? ctx.state : 'none' }),
  };
}

export const sfx = createSfx();

