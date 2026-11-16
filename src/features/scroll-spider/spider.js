/* ==========================================================================
   spider.js — pure logic for the ASCII scroll spider (no React, no DOM).

   The spider hangs on a silk thread in the right-hand rail and lowers itself
   as you scroll down the page:

        ┬            ← anchor (top of the rail)
        ¦
        @            ← a fly it already caught (wrapped in silk)
        ¦
      \(oo)/         ← the spider (legs alternate as it moves)
      /(  )\
                     
        ж            ← next fly, waiting at the start of the next section

   • progress (0..1) → spider position.
   • Each section start is a fly. When the spider reaches it, the fly is
     caught and wrapped; scroll back up and it is released again, so the
     picture always matches the scroll position.
   • STEP_PX controls how often the legs change pose (and the scroll tick
     sound plays): one step every STEP_PX pixels of descent.
   ========================================================================== */

/* two poses, two rows each — edit freely, but keep every row the same width */
export const FRAMES = [
  ['\\(oo)/', '/(  )\\'],
  ['/(oo)\\', '\\(  )/'],
];
export const WIDTH = FRAMES[0][0].length;   // characters
export const ROWS = FRAMES[0].length;
export const FLY = 'ж';
export const COCOON = '@';
export const ANCHOR = '┬';
export const STEP_PX = 9;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** travel = rail height − spider height (px). Returns the spider's top offset. */
export function spiderY(progress, travel) {
  return Math.round(clamp(progress, 0, 1) * Math.max(0, travel));
}

/** which pose to show at a given offset */
export function frameAt(y) {
  return Math.floor(y / STEP_PX) % FRAMES.length;
}

/** flies (one per section start) with their offsets and caught state */
export function layoutFlies(marks, progress, travel) {
  const y = spiderY(progress, travel);
  return marks.map((m, i) => {
    const fy = spiderY(m, travel);
    // 1px slack: sub-pixel scroll positions must still count as 'arrived'
    return { i, y: fy, caught: fy <= y + 1 };
  });
}

export function caughtCount(marks, progress, travel) {
  return layoutFlies(marks, progress, travel).filter(f => f.caught).length;
}

/** inverse: a click at offset `clickY` inside the rail → scroll fraction */
export function progressAt(clickY, spiderH, travel) {
  return travel <= 0 ? 0 : clamp((clickY - spiderH / 2) / travel, 0, 1);
}

