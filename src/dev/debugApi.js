/* ==========================================================================
   debugApi.js — exposes window.PKS.
   • Always: PKS.info(), PKS.ready() (index.html uses window.PKS as a
     "JavaScript loaded" safety net).
   • Only with ?critic in the URL: read-only diagnostics used by
     tools/critic.py. No code-execution surface.
   ========================================================================== */
import { SECTION_ORDER } from '../data/portfolio.js';
import { createSmoothScroll } from '../lib/smoothScroll.js';

export function installDebugApi(o) {
  const api = {
    sections: SECTION_ORDER,
    info: () => o.getScene()?.info() ?? null,
    ready: () => Promise.resolve(o.ready()).then(() => true),
  };
  if (o.critic) {
    api.debug = {
      goto: (id) => o.getScroller().scrollTo(o.landingFor(id), { instant: true }),
      gotoSmooth: (id) => o.navigate(id),
      settle: () => { o.getFrame().refresh(); o.getScene()?.debug.settle(); },
      pause: () => o.getScene()?.debug.pause(),
      resume: () => o.getScene()?.debug.resume(),
      profile: (on) => o.getScene()?.debug.profile(on),
      /** scroll the real page top→bottom in n steps, stepping the 3D state at 60 Hz */
      simulate: (n = 300) => {
        const scene = o.getScene();
        if (!scene) return null;
        const max = document.documentElement.scrollHeight - innerHeight, out = [];
        for (let k = 0; k <= n + 40; k++) {
          const y = Math.round(max * Math.min(1, k / n));
          scrollTo(0, y);
          const s = scene.debug.step(o.getFrame().frame(), 1 / 60);
          s.push(y);
          out.push(s);
        }
        return out;
      },
      frame: () => o.getFrame().frame(),
      sceneNdc: () => o.getScene()?.debug.ndc() ?? null,
      terminal: (cmd) => o.terminal()?.run(cmd),
      openTerminal: () => o.terminal()?.open(),
      closeTerminal: () => o.terminal()?.close(),
      enableSmooth: () => { o.getScroller().destroy(); o.setScroller(createSmoothScroll({ enabled: true, offset: o.navOffset })); },
              scrollState: () => o.getScroller().state(),
        sound: () => o.sound.stats(),
        setSound: (on) => o.sound.setEnabled(on),
    };
  }
  window.PKS = api;
  return () => { if (window.PKS === api) delete window.PKS; };
}


