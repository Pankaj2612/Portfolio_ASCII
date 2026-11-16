/* ==========================================================================
   ascii.js — 3D "ANSI Shadow" block-letter font
   Solid faces (█) and extruded shadows (╗║╝═…) are classified separately so
   the shadow can be tinted differently — that is what creates the depth.
   ========================================================================== */

const H = 6;

/* prettier-ignore */
const FONT = {
  A: [' █████╗ ', '██╔══██╗', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
  B: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██████╔╝', '╚═════╝ '],
  C: [' ██████╗', '██╔════╝', '██║     ', '██║     ', '╚██████╗', ' ╚═════╝'],
  D: ['██████╗ ', '██╔══██╗', '██║  ██║', '██║  ██║', '██████╔╝', '╚═════╝ '],
  E: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '███████╗', '╚══════╝'],
  F: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '██║     ', '╚═╝     '],
  G: [' ██████╗ ', '██╔════╝ ', '██║  ███╗', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  H: ['██╗  ██╗', '██║  ██║', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
  I: ['██╗', '██║', '██║', '██║', '██║', '╚═╝'],
  J: ['     ██╗', '     ██║', '     ██║', '██   ██║', '╚█████╔╝', ' ╚════╝ '],
  K: ['██╗  ██╗', '██║ ██╔╝', '█████╔╝ ', '██╔═██╗ ', '██║  ██╗', '╚═╝  ╚═╝'],
  L: ['██╗     ', '██║     ', '██║     ', '██║     ', '███████╗', '╚══════╝'],
  M: ['███╗   ███╗', '████╗ ████║', '██╔████╔██║', '██║╚██╔╝██║', '██║ ╚═╝ ██║', '╚═╝     ╚═╝'],
  N: ['███╗   ██╗', '████╗  ██║', '██╔██╗ ██║', '██║╚██╗██║', '██║ ╚████║', '╚═╝  ╚═══╝'],
  O: [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  P: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔═══╝ ', '██║     ', '╚═╝     '],
  Q: [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║▄▄ ██║', '╚██████╔╝', ' ╚══▀▀═╝ '],
  R: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██║  ██║', '╚═╝  ╚═╝'],
  S: ['███████╗', '██╔════╝', '███████╗', '╚════██║', '███████║', '╚══════╝'],
  T: ['████████╗', '╚══██╔══╝', '   ██║   ', '   ██║   ', '   ██║   ', '   ╚═╝   '],
  U: ['██╗   ██╗', '██║   ██║', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  V: ['██╗   ██╗', '██║   ██║', '██║   ██║', '╚██╗ ██╔╝', ' ╚████╔╝ ', '  ╚═══╝  '],
  W: ['██╗    ██╗', '██║    ██║', '██║ █╗ ██║', '██║███╗██║', '╚███╔███╔╝', ' ╚══╝╚══╝ '],
  X: ['██╗  ██╗', '╚██╗██╔╝', ' ╚███╔╝ ', ' ██╔██╗ ', '██╔╝ ██╗', '╚═╝  ╚═╝'],
  Y: ['██╗   ██╗', '╚██╗ ██╔╝', ' ╚████╔╝ ', '  ╚██╔╝  ', '   ██║   ', '   ╚═╝   '],
  Z: ['███████╗', '╚══███╔╝', '  ███╔╝ ', ' ███╔╝  ', '███████╗', '╚══════╝'],
  0: [' ██████╗ ', '██╔═████╗', '██║██╔██║', '████╔╝██║', '╚██████╔╝', ' ╚═════╝ '],
  1: [' ██╗', '███║', '╚██║', ' ██║', ' ██║', ' ╚═╝'],
  2: ['██████╗ ', '╚════██╗', ' █████╔╝', '██╔═══╝ ', '███████╗', '╚══════╝'],
  3: ['██████╗ ', '╚════██╗', ' █████╔╝', ' ╚═══██╗', '██████╔╝', '╚═════╝ '],
  4: ['██╗  ██╗', '██║  ██║', '███████║', '╚════██║', '     ██║', '     ╚═╝'],
  5: ['███████╗', '██╔════╝', '███████╗', '╚════██║', '███████║', '╚══════╝'],
  6: [' ██████╗ ', '██╔════╝ ', '███████╗ ', '██╔═══██╗', '╚██████╔╝', ' ╚═════╝ '],
  7: ['███████╗', '╚════██║', '    ██╔╝', '   ██╔╝ ', '   ██║  ', '   ╚═╝  '],
  8: [' █████╗ ', '██╔══██╗', '╚█████╔╝', '██╔══██╗', '╚█████╔╝', ' ╚════╝ '],
  9: [' █████╗ ', '██╔══██╗', '╚██████║', ' ╚═══██║', ' █████╔╝', ' ╚════╝ '],
  '.': ['   ', '   ', '   ', '   ', '██╗', '╚═╝'],
  '-': ['      ', '      ', '█████╗', '╚════╝', '      ', '      '],
  '_': ['        ', '        ', '        ', '        ', '███████╗', '╚══════╝'],
  ' ': ['   ', '   ', '   ', '   ', '   ', '   '],
};

export const SUPPORTED = Object.keys(FONT).join('');

export function canRender(text) {
  return [...String(text).toUpperCase()].every(c => FONT[c]);
}

/** banner as H equal-length strings; unsupported characters become spaces */
export function bannerLines(text) {
  const chars = [...String(text).toUpperCase()].map(c => (FONT[c] ? c : ' '));
  if (import.meta.env && import.meta.env.DEV && !canRender(text)) {
    console.warn(`[ascii] "${text}" contains unsupported characters (supported: ${SUPPORTED})`);
  }
  const rows = Array.from({ length: H }, () => '');
  for (const c of chars) {
    const g = FONT[c];
    const w = Math.max(...g.map(r => [...r].length));
    for (let r = 0; r < H; r++) rows[r] += g[r].padEnd(w, ' ');
  }
  const width = Math.max(1, ...rows.map(r => [...r].length));
  return rows.map(r => r.padEnd(width, ' '));
}

/** split each line into runs: f = face, s = shadow, sp = space */
export function bannerRuns(lines) {
  return lines.map(line => {
    const runs = [];
    for (const ch of line) {
      const k = ch === ' ' ? 'sp' : ch === '█' ? 'f' : 's';
      const last = runs[runs.length - 1];
      if (last && last.k === k) last.t += ch; else runs.push({ k, t: ch });
    }
    return runs;
  });
}

/* ------------- character advance / font-size ratio (measured once) ------------- */
let ratio = 0;
export function charRatio(sample) {
  if (ratio) return ratio;
  const cs = getComputedStyle(sample);
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-size:100px;line-height:1;font-family:${cs.fontFamily};font-weight:${cs.fontWeight}`;
  probe.textContent = '█'.repeat(40);
  document.body.append(probe);
  const w = probe.getBoundingClientRect().width / 4000;
  probe.remove();
  ratio = w > 0.3 && w < 1.2 ? w : 0.6;
  return ratio;
}
export function resetCharRatio() { ratio = 0; }


