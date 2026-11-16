/* ==========================================================================
   scrollFrame.js — the bridge between page scroll and the 3D scene.

   compute() returns one "frame" for the current scroll position:
     s                 continuous section coordinate 0..4 (home → contact)
     anchors[]         screen position/size of each section's 3D stage (NDC)
     projectsProgress  0..1 through the projects section (camera travel)
     workflow          0..1 through the workflow list (ring stages)
     project           index of the project card closest to the viewport centre
   The scene pulls compute() at the start of its own animation frame, so the
   3D object and the page always agree (no 1-frame lag).
   Discrete UI values are pushed to the store only when they change
   (progress is 0..1, marks = section start positions = the spider's flies).
   ========================================================================== */

import { SECTION_ORDER } from '../data/portfolio.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createScrollFrame({ getScene, store, workflowSteps = 5 }) {
  const $ = id => document.getElementById(id);
  const navEl = () => document.querySelector('.nav');
  let sections = [], stages = [], workflowEl = null, projectsEl = null, projectCards = [];
  let anchors = [], vw = innerWidth, vh = innerHeight, maxScroll = 1;
  let cacheKey = '', cached = null, layoutVersion = 0, lastProject = 0, destroyed = false;
  const frame = { s: 0, anchors: SECTION_ORDER.map(() => ({ has: false, x: 0, y: 0, r: 0 })), projectsProgress: 0, workflow: 0, project: 0, y: 0 };

  function query() {
    sections = SECTION_ORDER.map($);
    stages = SECTION_ORDER.map(id => document.querySelector(`[data-anchor3d="${id}"]`));
    workflowEl = $('workflow');
    projectsEl = $('projects');
    projectCards = [...document.querySelectorAll('.project')];
  }

  function measure() {
    if (destroyed) return;
    query();
    vw = innerWidth; vh = innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    // a section is "arrived at" when its heading plate lands under the nav (where navigation scrolls to)
    const off = (navEl() ? navEl().offsetHeight : 0) + 16;
    anchors = sections.map((el, i) => {
      if (!el || i === 0) return 0;
      const land = el.querySelector('.sec-head') || el;
      return clamp(Math.round(land.getBoundingClientRect().top + scrollY - off), 0, maxScroll);
    });
    for (let i = 1; i < anchors.length; i++) if (anchors[i] <= anchors[i - 1]) anchors[i] = anchors[i - 1] + 1;
    // where each section starts along the page (0..1) — one fly per section for the scroll spider
    const marks = anchors.slice(1).map(a => Math.round((a / maxScroll) * 1e4) / 1e4);
    if (marks.join() !== (store.get().marks || []).join()) store.set({ marks });
    layoutVersion++;
    sync();
  }

  function sectionCoord(y) {
    if (y <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++) if (y <= anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
    return anchors.length - 1;
  }

  function compute() {
    const y = scrollY;
    const key = `${y}|${layoutVersion}|${innerHeight}`;
    if (key === cacheKey && cached) return cached;
    cacheKey = key;

    const s = sectionCoord(y);
    frame.s = s;
    const i = Math.min(SECTION_ORDER.length - 1, Math.floor(s)), j = Math.min(SECTION_ORDER.length - 1, i + 1);
    const navB = navEl() ? navEl().getBoundingClientRect().bottom : 0;
    for (let k = 0; k < stages.length; k++) {
      const a = frame.anchors[k];
      if ((k !== i && k !== j) || !stages[k]) continue;
      const r = stages[k].getBoundingClientRect();
      if (r.width < 8 || r.height < 8) { a.has = false; continue; }
      a.has = true;
      // frame the visible part of the stage (below the nav), never less than 55% of it
      const minH = r.height * 0.55;
      let top = Math.max(r.top, navB), bot = Math.min(r.bottom, vh);
      if (bot - top < minH) { if (top > r.top) top = Math.max(r.top, bot - minH); else bot = Math.min(r.bottom, top + minH); }
      a.x = ((r.left + r.width / 2) / vw) * 2 - 1;
      a.y = -((((top + bot) / 2) / vh) * 2 - 1);
      a.r = Math.min(r.width, Math.max(0, bot - top)) / 2;
    }
    if (projectsEl) {
      const r = projectsEl.getBoundingClientRect();
      frame.projectsProgress = clamp((vh * 0.5 - r.top) / Math.max(1, r.height), 0, 1);
    }
    if (workflowEl) {
      const r = workflowEl.getBoundingClientRect();
      frame.workflow = clamp((vh * 0.8 - r.top) / Math.max(1, r.height + vh * 0.1), 0, 1);
    }
    let best = lastProject, bestD = Infinity;
    projectCards.forEach((c, n) => {
      const r = c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const d = Math.abs(r.top + r.height / 2 - vh * 0.5);
      if (d < bestD) { bestD = d; best = n; }
    });
    lastProject = best;
    frame.project = best;
    frame.y = y;
    cached = frame;
    publish();
    return frame;
  }

  function publish() {
    const y = frame.y;
    const step = frame.workflow <= 0.01 ? -1 : Math.min(workflowSteps - 1, Math.floor(frame.workflow * workflowSteps * 0.999 + 0.2));
    const ref = y + vh * 0.42;
    let active = SECTION_ORDER[0];
    sections.forEach((el, n) => { if (el && el.getBoundingClientRect().top + y <= ref) active = SECTION_ORDER[n]; });
    if (y >= maxScroll - 2) active = SECTION_ORDER[SECTION_ORDER.length - 1];
    store.set({ section: active, progress: Math.round(clamp(y / maxScroll, 0, 1) * 1e4) / 1e4, workflowStep: step, activeProject: frame.project });
  }

  let pending = false;
  function sync() {
    pending = false;
    if (destroyed) return;
    compute();
    const scene = getScene();
    if (scene && !scene.isLooping()) scene.refresh();
  }
  function onScroll() {
    // UI (spider, nav, workflow) updates immediately on every scroll event,
    // independent of how fast the GPU renders the 3D scene
    compute();
    const scene = getScene();
    if (scene && scene.isLooping()) return;             // the render loop pulls the frame itself
    if (!pending) { pending = true; requestAnimationFrame(sync); }  // paused / reduced motion: redraw once
  }
  const onResize = () => requestAnimationFrame(measure);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  addEventListener('load', onResize);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(onResize) : null;
  ro && ro.observe(document.body);
  document.fonts && document.fonts.ready.then(onResize).catch(() => {});

  measure();
  return {
    frame: compute,
    refresh: measure,
    destroy() {
      destroyed = true;
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
      removeEventListener('load', onResize);
      ro && ro.disconnect();
    },
  };
}


