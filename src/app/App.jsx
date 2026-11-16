/* ==========================================================================
   App.jsx — composes the page and owns the imperative engines:
     • features/three/scene.js   WebGL + ASCII renderer (loaded lazily)
     • lib/smoothScroll          inertial wheel + eased navigation
     • lib/scrollFrame           scroll → 3D frame + UI store (spider, nav)
     • lib/sound                 8-bit sound effects (opt-in)
   Content: src/data/portfolio.js · Styling: Tailwind (src/styles/index.css)
   ========================================================================== */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from './AppContext.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { createStore } from '../lib/store.js';
import { createSmoothScroll } from '../lib/smoothScroll.js';
import { createScrollFrame } from '../lib/scrollFrame.js';
import { THEMES, WORKFLOW } from '../data/portfolio.js';
import { installDebugApi } from '../dev/debugApi.js';
import { sfx } from '../lib/sound.js';
import { initAnalytics, track } from '../lib/analytics.js';
import { useKonami } from '../hooks/useKonami.js';
import ScrollSpider from '../features/scroll-spider/ScrollSpider.jsx';

import Boot from '../components/layout/Boot.jsx';
import Cursor from '../components/layout/Cursor.jsx';
import CrtOverlay from '../components/layout/CrtOverlay.jsx';
import Nav from '../components/layout/Nav.jsx';
import Footer from '../components/layout/Footer.jsx';
import Hero from '../components/sections/Hero.jsx';
import About from '../components/sections/About.jsx';
import Skills from '../components/sections/Skills.jsx';
import Projects from '../components/sections/Projects.jsx';
import Contact from '../components/sections/Contact.jsx';
import Terminal from '../components/terminal/Terminal.jsx';

/* ?critic → deterministic mode for tools/critic.py (no boot, no transitions) */
const CRITIC = document.documentElement.classList.contains('critic');
const FINE_POINTER = matchMedia('(hover: hover) and (pointer: fine)').matches;
const navOffset = () => (document.querySelector('.nav')?.offsetHeight || 0) + 16;

/** where navigation lands: the section's heading plate just below the nav */
function landingFor(id) {
  const sec = document.getElementById(id);
  if (!sec) return null;
  return id === 'home' ? sec : (sec.querySelector('.sec-head') || sec);
}
const readPref = (key, allowed, fallback) => { try { const v = localStorage.getItem(key); return allowed.includes(v) ? v : fallback; } catch { return fallback; } };
const probeWebGL = () => { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; } };

export default function App() {
  const reduced = useReducedMotion();
  const instant = reduced || CRITIC;

  const [booted, setBooted] = useState(() => { if (instant) return true; try { return sessionStorage.getItem('pks.booted') === '1'; } catch { return false; } });
  const [theme, setTheme] = useState(() => readPref('pks.theme', THEMES, 'aurora'));
  const [renderMode, setRenderMode] = useState(() => readPref('pks.render', ['ascii', 'vector'], 'ascii'));
  const [dock, setDock] = useState(() => readPref('pks.dock', ['left', 'right'], 'right'));
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [glStatus, setGlStatus] = useState({ label: 'INIT', warn: false });

  const uiStore = useMemo(() => createStore({ section: 'home', progress: 0, marks: [], workflowStep: -1, activeProject: 0 }), []);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const scrollerRef = useRef(null);
  const frameRef = useRef(null);
  const terminalRef = useRef(null);
  const engineState = useRef('pending'); // pending | online | fallback
  const scenePromise = useRef(null);
  const prefs = useRef({ theme, renderMode, dock });
  prefs.current = { theme, renderMode, dock };

  /* ---------------- engines (re-created if reduced-motion changes) ---------------- */
  useEffect(() => {
    const scroller = createSmoothScroll({ enabled: !instant, offset: navOffset });
    scrollerRef.current = scroller;
    const frame = createScrollFrame({ getScene: () => sceneRef.current, store: uiStore, workflowSteps: WORKFLOW.length });
    frameRef.current = frame;

    let cancelled = false;
    scenePromise.current = (async () => {
      if (!probeWebGL()) { engineState.current = 'fallback'; setGlStatus({ label: 'OFF', warn: true }); return null; }
      try {
        const { createScene } = await import('../features/three/scene.js');
        if (cancelled) return null;
        const api = createScene(canvasRef.current, { reducedMotion: reduced, mode: prefs.current.renderMode, getFrame: () => frame.frame() });
        if (cancelled) { api.destroy(); return null; }
        api.setPalette(prefs.current.theme);
        sceneRef.current = api;
        engineState.current = 'online';
        setGlStatus({ label: api.info().webgl, warn: false });
        frame.refresh();
        return api;
      } catch (e) {
        console.warn('[PKS.OS] 3D scene unavailable, static fallback:', e);
        engineState.current = 'fallback';
        setGlStatus({ label: 'OFF', warn: true });
        return null;
      }
    })();

    // deep link (#projects …)
    const hash = location.hash.slice(1);
    if (hash && document.getElementById(hash)) setTimeout(() => scroller.scrollTo(landingFor(hash), { instant: true }), 60);

    return () => {
      cancelled = true;
      scroller.destroy();
      frame.destroy();
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, [instant, reduced, uiStore]);

  /* ---------------- preferences ---------------- */
  useEffect(() => {
    if (theme === 'aurora') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    sceneRef.current?.setPalette(theme);
    try { localStorage.setItem('pks.theme', theme); } catch { /* ignore */ }
  }, [theme]);
  useEffect(() => {
    try { localStorage.setItem('pks.dock', dock); } catch { /* ignore */ }
  }, [dock]);
  useEffect(() => {
    sceneRef.current?.setMode(renderMode);
    try { localStorage.setItem('pks.render', renderMode); } catch { /* ignore */ }
  }, [renderMode]);

  /* ---------------- navigation ---------------- */
  const navigate = useCallback((id, { focus = false } = {}) => {
    const target = document.getElementById(id);
    if (!target) return;
    scrollerRef.current?.scrollTo(landingFor(id), {
      done: () => {
        if (!focus) return;
        const h = target.querySelector('h1, h2');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      },
    });
          history.replaceState?.(null, '', id === 'home' ? location.pathname + location.search : `#${id}`);
      sfx.play('nav');
    if (!instant) {
      const warp = document.getElementById('warp');
      if (warp) { warp.classList.remove('run'); void warp.offsetWidth; warp.classList.add('run'); }
      sceneRef.current?.pulse();
    }
  }, [instant]);

  /** jump to a fraction (0..1) of the page — used by the scroll spider rail */
  const seek = useCallback((fraction) => {
    sfx.play('click');
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollerRef.current?.scrollTo(Math.round(max * fraction));
  }, []);

  const onNavClick = useCallback((e) => {
    const id = e.currentTarget.dataset.nav;
    if (!id) return;
    e.preventDefault();
    navigate(id, { focus: true });
  }, [navigate]);

  /* ---------------- sound effects for UI (hover + click), theme / dock changes ---------------- */
  useEffect(() => {
    const UI = 'a[href], button, .skill-card, .project-card';
    let lastHover = null;
    const onOver = (e) => {
      if (e.pointerType !== 'mouse') return;
      const el = e.target.closest?.(UI);
      if (el && el !== lastHover) sfx.play('hover');
      lastHover = el;
    };
    const onClick = (e) => {
      const el = e.target.closest?.('button, a[href]');
      // nav links play their own 'nav' sound; the sound toggle plays its own jingle
      if (el && !el.closest('[data-nav]') && el.id !== 'soundToggle') sfx.play('click');
    };
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('click', onClick, true);
    return () => { document.removeEventListener('pointerover', onOver); document.removeEventListener('click', onClick, true); };
  }, []);
  const firstPref = useRef(true);
  useEffect(() => {
    if (firstPref.current) { firstPref.current = false; return; }
    sfx.play('theme');
  }, [theme]);
  const firstDock = useRef(true);
  useEffect(() => {
    if (firstDock.current) { firstDock.current = false; return; }
    sfx.play('dock');
  }, [dock]);

  /* ---------------- analytics (off unless configured) + Konami easter egg ---------------- */
  useEffect(() => { initAnalytics(); }, []);
  useKonami(() => {
    setTheme(t => (t === 'amber' ? 'aurora' : 'amber'));
    sfx.play('bootDone');
    track('konami');
  });

  /* ---------------- terminal ---------------- */
  const openTerminal = useCallback((from) => terminalRef.current?.open(from), []);
  const toggleTerminal = useCallback((from) => terminalRef.current?.toggle(from), []);
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      if ((e.key === '/' || e.key === '`') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); terminalRef.current?.open(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const terminalActions = {
    navigate: (id) => navigate(id),
    getSection: () => uiStore.get().section,
    getTheme: () => prefs.current.theme, setTheme,
    getRender: () => prefs.current.renderMode, setRender: setRenderMode,
          getDock: () => prefs.current.dock, setDock,
      getSound: () => sfx.isEnabled(), setSound: (on) => sfx.setEnabled(on), playSound: (n) => sfx.play(n),
    getRendererLabel: () => { const i = sceneRef.current?.info(); return i ? `Three.js r${i.revision} · ${i.webgl} · ${i.mode}` : 'static fallback'; },
  };

  /* ---------------- window.PKS (safety net + critic diagnostics) ---------------- */
  useEffect(() => installDebugApi({
    critic: CRITIC,
    ready: () => scenePromise.current,
    getScene: () => sceneRef.current,
    getFrame: () => frameRef.current,
    getScroller: () => scrollerRef.current,
    setScroller: (s) => { scrollerRef.current = s; },
    landingFor, navigate, navOffset,
          terminal: () => terminalRef.current,
      sound: sfx,
  }), [navigate]);

  const ctx = useMemo(() => ({
    uiStore, sceneRef, navigate, seek, onNavClick, openTerminal, toggleTerminal,
    terminalOpen, renderMode, glStatus, booted, instant, reduced,
  }), [uiStore, navigate, seek, onNavClick, openTerminal, toggleTerminal, terminalOpen, renderMode, glStatus, booted, instant, reduced]);

  const getEngine = useCallback(() => engineState.current, []);
  const onBootDone = useCallback(() => setBooted(true), []);

  return (
    <AppContext.Provider value={ctx}>
      <a href="#main" className="skip-link fixed -top-16 left-3 z-400 bg-secondary px-3 py-2 font-semibold text-ink-0 transition-[top] focus:top-3">Skip to content</a>
      {!booted && <Boot getEngine={getEngine} onDone={onBootDone} />}

      <canvas id="scene" ref={canvasRef} className="fixed inset-0 z-0 block h-screen w-full bg-ink-0" aria-hidden="true" />
      <CrtOverlay />
      <Cursor enabled={FINE_POINTER && !instant} />

      <Nav />
      <ScrollSpider />
      <main id="main" className="relative z-2">
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <Footer />

      <Terminal ref={terminalRef} actions={terminalActions} reduced={reduced} onOpenChange={setTerminalOpen} dock={dock} onDockChange={setDock} />
    </AppContext.Provider>
  );
}


