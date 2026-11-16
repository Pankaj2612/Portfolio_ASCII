#!/usr/bin/env python3
"""
PKS.OS UI critic (React + Tailwind edition, v4: spider + sound + contact + features)
===========================================
Loads the built site in Chromium and scores it 0–10 in six categories. Every
deduction is a concrete, reproducible finding.

  UI & LAYOUT     overlaps, clipped text, horizontal overflow, banner fit, headings
                  under the header, 3D core locked in its stage, touch targets,
                  scroll-spider rail (never over content), docked terminal (320 → 1920 px)
  READABILITY     WCAG contrast of every visible text run against the real pixels
  SMOOTHNESS      wheel easing, navigation tween, 3D continuity, spider progression
  PERFORMANCE     JS per frame, draw calls, GPU leaks, DPR cap, costly CSS,
                  infinite animations, idle DOM churn, CLS, pause when hidden, payload
  ACCESSIBILITY   landmarks, headings, labels, focus, dialog, Escape, reduced motion
  RETRO IDENTITY  ASCII renderer, banners, monospace text, no gradient text, no green
  SOUND           opt-in (no AudioContext before consent), toggle + persistence,
                  typing / scroll / catch / error effects fire, mute really mutes
  CONTACT         (mail provider mocked) validation, real payload, delivered → reset,
                  activation / server error / network failure → honest message +
                  prefilled mailto fallback, honeypot blocks bots, resend cooldown
  FEATURES        terminal commands (links, github, experience), snake game
                  (start, steer, pause, Esc quits game not terminal), Konami theme,
                  case study + outcome lines, live GitHub window (mocked API) + fallback,
                  SEO tags (og:image, twitter card, valid JSON-LD)

usage:
  npm run build && npx vite preview --port 8000      # or any static server on dist/
  python tools/critic.py --url http://localhost:8000/

Requires: pip install playwright pillow numpy && playwright install chromium
Limitation: raw GPU FPS is hardware-dependent; the critic measures animation curves
and JS cost instead.
"""
import argparse, io, json, math, os, sys
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

VIEWPORTS = [(320, 640, True), (375, 812, True), (768, 1024, True), (1024, 768, False), (1440, 900, False), (1920, 1080, False)]
SECTIONS = ['home', 'about', 'skills', 'projects', 'contact']

HIDE_TEXT_CSS = """
html.critic-hide *, html.critic-hide *::before, html.critic-hide *::after {
  color: transparent !important; -webkit-text-fill-color: transparent !important;
  text-shadow: none !important; caret-color: transparent !important; }
html.critic-hide .caret { visibility: hidden !important; }
html.critic-nofx .fx { display: none !important; }
"""

COLLECT_JS = r"""
() => {
  const vw = innerWidth, vh = innerHeight;
  const nav = document.querySelector('.nav');
  const navB = nav ? nav.getBoundingClientRect().bottom : 0;
  const cs = e => getComputedStyle(e);
  const opacityOf = el => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = cs(n); if (c.display === 'none' || c.visibility === 'hidden') return 0; o *= parseFloat(c.opacity); } return o; };
  const layer = el => el.closest('.nav, .terminal, .fx, .cursor-dot, .cursor-box, #boot, .skip-link');
  const describe = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const SEL = 'h1,h2,h3,p,li,a,button,input,textarea,label,pre,dt,dd,kbd,.window,.stage3d,.sec-head,.stage-tag,.statusbar,.pid,.wf-idx,.sk-node,.wb-meta,.wb-btn,.window-title > span,.hero-name,.banner-host';
  const atoms = [...document.querySelectorAll(SEL)].filter(el => !el.closest('.sr-only') && !layer(el) && opacityOf(el) > 0.05)
    .map(el => ({ el, r: el.getBoundingClientRect() }))
    .filter(a => a.r.width > 1 && a.r.height > 1 && a.r.bottom > navB && a.r.top < vh);
  const overlaps = [];
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
    const A = atoms[i], B = atoms[j];
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
    const h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
    if (w > 1.5 && h > 1.5 && w * h > 4) overlaps.push(`${describe(A.el)} ⨯ ${describe(B.el)} (${Math.round(w)}×${Math.round(h)}px)`);
  }
  const clipped = [];
  for (const { el, r } of atoms) {
    const c = cs(el);
    if (r.right > vw + 1 || r.left < -1) clipped.push(`${describe(el)} exceeds viewport (${Math.round(r.left)}→${Math.round(r.right)})`);
    if (/(hidden|clip)/.test(c.overflowX) && el.scrollWidth > el.clientWidth + 1 && el.matches('h1,h2,h3,p,li,a,button,label,dt,dd,.window-title > span,.wb-meta,.stage-tag'))
      clipped.push(`${describe(el)} text truncated (${el.scrollWidth}>${el.clientWidth})`);
    if (el.matches('pre.ascii-banner')) {
      const host = el.parentElement.getBoundingClientRect();
      if (r.right > host.right + 1) clipped.push(`${describe(el)} banner overflows its container by ${Math.round(r.right - host.right)}px`);
    }
  }
  const runs = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.nodeValue; if (!t || !t.trim()) continue;
    const el = n.parentElement; if (!el || el.closest('.sr-only, script, style, noscript, [hidden], #boot')) continue;
    const c = cs(el);
    const op = opacityOf(el); if (op < 0.05) continue;
    const inNav = !!el.closest('.nav');
    const range = document.createRange(); range.selectNodeContents(n);
    const rects = [...range.getClientRects()].map(r => [Math.max(0, r.left), Math.max(inNav ? 0 : navB, r.top), Math.min(vw, r.right), Math.min(vh, r.bottom)])
      .filter(r => r[2] - r[0] > 2 && r[3] - r[1] > 2);
    if (!rects.length) continue;
    const fs = parseFloat(c.fontSize), fw = parseInt(c.fontWeight, 10) || 400;
    const banner = !!el.closest('pre.ascii-banner');
    runs.push({ text: t.trim().slice(0, 32), color: c.color, op, large: banner || fs >= 24 || (fs >= 18.66 && fw >= 700), rects, sel: describe(el), font: c.fontFamily, gradient: /text/.test(c.backgroundClip || c.webkitBackgroundClip || '') });
  }
  return { overlaps, clipped, runs, navB };
}
"""

SPIDER_JS = r"""
() => {
  const rail = document.querySelector('.rail'); if (!rail) return null;
  const sp = rail.querySelector('.spider');
  const r = rail.getBoundingClientRect(), b = sp.getBoundingClientRect();
  // right-most edge of any page content (the rail must never cover content)
  let contentR = 0;
  for (const el of document.querySelectorAll('main *, footer *')) {
    const e = el.getBoundingClientRect(); if (e.width && e.height && e.bottom > 0 && e.top < innerHeight) contentR = Math.max(contentR, e.right);
  }
  return { rail: [r.left, r.top, r.right, r.bottom], sp: [b.left, b.top, b.right, b.bottom], vw: innerWidth, vh: innerHeight,
           caught: parseInt(rail.getAttribute('aria-valuetext'), 10), now: +rail.getAttribute('aria-valuenow'), contentR,
           text: sp.textContent };
}
"""

def parse_rgba(s):
    s = s[s.index('(') + 1:s.index(')')].replace('/', ' ').replace(',', ' ').split()
    v = [float(x) for x in s]
    return (v[0], v[1], v[2], v[3] if len(v) > 3 else 1.0)

def lin(c):
    c = np.asarray(c, dtype=np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def lum(rgb):
    l = lin(rgb)
    return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]

def contrast(l1, l2):
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)

class Report:
    def __init__(self):
        self.cats = {k: [] for k in ['UI & LAYOUT', 'READABILITY', 'SMOOTHNESS', 'PERFORMANCE', 'ACCESSIBILITY', 'RETRO IDENTITY', 'SOUND', 'CONTACT', 'FEATURES']}
        self.passes = {k: 0 for k in self.cats}
        self.metrics = {}
    def check(self, cat, ok, msg, weight=1.0):
        if ok: self.passes[cat] += 1
        else: self.cats[cat].append((weight, msg))
        return ok
    def score(self, cat):
        return max(0.0, round(10 - sum(w for w, _ in self.cats[cat]), 1))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:8000/')
    ap.add_argument('--chromium', default=None)
    ap.add_argument('--shots', default=None, help='directory to save screenshots')
    ap.add_argument('--json', default=None)
    ap.add_argument('--offline', action='store_true', help='block Google Fonts (no network)')
    ap.add_argument('--exclude', action='append', default=[], help='URL suffix to leave out of the payload budget')
    ap.add_argument('--budget-kb', type=int, default=450, help='first-party JS+CSS+HTML budget (uncompressed)')
    args = ap.parse_args()
    base = args.url.split('?')[0]
    url = base + '?critic'
    R = Report()
    if args.shots: os.makedirs(args.shots, exist_ok=True)

    def setup(ctx):
        if args.offline: ctx.route('**/fonts.g*/**', lambda r: r.abort())
        # never send real mail or hit real APIs from the critic
        ctx.route('https://formsubmit.co/**', lambda r: r.abort())
        ctx.route('https://formspree.io/**', lambda r: r.abort())
        ctx.route('https://api.web3forms.com/**', lambda r: r.abort())
        ctx.route('https://api.github.com/**', lambda r: r.abort())
        ctx.add_init_script("""
          window.__cls = 0; window.__raf = 0;
          try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
          const _r = window.requestAnimationFrame.bind(window);
          window.requestAnimationFrame = cb => { window.__raf++; return _r(cb); };
        """)
        ctx.add_init_script(f"document.addEventListener('DOMContentLoaded',()=>{{const s=document.createElement('style');s.textContent={json.dumps(HIDE_TEXT_CSS)};document.head.append(s);}})")

    def boot(page, u=url, debug=True):
        page.goto(u); page.wait_for_function('window.PKS' + (' && PKS.debug' if debug else ''), timeout=30000); page.evaluate('PKS.ready()')

    def term_rect(page):
        return page.evaluate("(()=>{const r=document.getElementById('terminal').getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,hb:document.querySelector('.nav').getBoundingClientRect().bottom,dock:document.getElementById('terminal').dataset.dock}})()")

    errors = []
    with sync_playwright() as p:
        launch = dict(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        if args.chromium: launch['executable_path'] = args.chromium
        browser = p.chromium.launch(**launch)

        for (W, H, mobile) in VIEWPORTS:
            ctx = browser.new_context(viewport={'width': W, 'height': H}, has_touch=mobile, is_mobile=mobile)
            setup(ctx)
            page = ctx.new_page()
            page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
            page.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') and 'ERR_FAILED' not in m.text and 'fonts.g' not in m.text else None)
            boot(page); page.evaluate('PKS.debug.pause()'); page.wait_for_timeout(200)
            sw = page.evaluate('document.documentElement.scrollWidth')
            R.check('UI & LAYOUT', sw <= W, f'{W}px: horizontal overflow ({sw}px)', 2)

            eaten_seq = []
            for pos in SECTIONS + ['projects#1', 'projects#2']:
                sec = pos.split('#')[0]
                if '#' in pos:
                    k = int(pos.split('#')[1])
                    page.evaluate(f"(() => {{ const c = document.querySelectorAll('.project')[{k}]; window.scrollTo(0, c.getBoundingClientRect().top + scrollY - document.querySelector('.nav').offsetHeight - 16); }})()")
                else:
                    page.evaluate(f"PKS.debug.goto('{sec}')")
                page.wait_for_timeout(60); page.evaluate('PKS.debug.settle()'); page.wait_for_timeout(100)
                tag = f'{W}:{pos}'
                if '#' not in pos:
                    k = SECTIONS.index(sec)
                    fr = page.evaluate('PKS.debug.frame()'); nd = page.evaluate('PKS.debug.sceneNdc()')
                    R.check('SMOOTHNESS', abs(fr['s'] - k) < 0.03, f'{tag} 3D state not settled on its section (s={fr["s"]:.2f})', 1)
                    a = fr['anchors'][k]
                    if nd and a['has'] and sec != 'projects':
                        err = math.hypot((nd[0] - a['x']) * W / 2, (nd[1] - a['y']) * H / 2)
                        R.check('UI & LAYOUT', err < 10, f'{tag} 3D core is {err:.0f}px away from its stage frame', 1)
                    sp = page.evaluate(SPIDER_JS)
                    if R.check('UI & LAYOUT', sp is not None, f'{tag} scroll spider missing', 2):
                        rl, rt, rr, rb = sp['rail']; sl, st, sr, sb = sp['sp']
                        R.check('UI & LAYOUT', sl >= rl - 0.5 and sr <= rr + 0.5, f'{tag} spider wider than its rail ({sl:.0f}..{sr:.0f} vs {rl:.0f}..{rr:.0f})', 1)
                        R.check('UI & LAYOUT', st >= rt - 0.5 and sb <= min(rb, sp['vh']) + 0.5, f'{tag} spider outside the rail vertically', 1)
                        R.check('UI & LAYOUT', rr <= sp['vw'] + 0.5, f'{tag} rail exceeds viewport', 1)
                        R.check('UI & LAYOUT', sp['contentR'] <= rl + 0.5, f'{tag} page content runs under the spider rail ({sp["contentR"]:.0f} > {rl:.0f})', 2)
                        eaten_seq.append((sec, st, sp['caught'], sp['now']))
                data = page.evaluate(COLLECT_JS)
                for o in data['overlaps'][:6]: R.check('UI & LAYOUT', False, f'{tag} overlap {o}', 0.5)
                if not data['overlaps']: R.check('UI & LAYOUT', True, '')
                for c in data['clipped'][:6]: R.check('UI & LAYOUT', False, f'{tag} {c}', 0.5)
                if '#' not in pos and sec != 'home':
                    top = page.evaluate(f"document.querySelector('#{sec} .sec-head').getBoundingClientRect().top")
                    R.check('UI & LAYOUT', top >= data['navB'] - 0.5, f'{tag} heading hidden under header (top {top:.0f} < {data["navB"]:.0f})', 1)
                page.evaluate("document.documentElement.classList.add('critic-nofx')")
                if args.shots: page.screenshot(path=os.path.join(args.shots, f'{W}_{pos.replace("#", "-")}.png'))
                page.evaluate("document.documentElement.classList.add('critic-hide')")
                img = np.asarray(Image.open(io.BytesIO(page.screenshot())).convert('RGB'))
                page.evaluate("document.documentElement.classList.remove('critic-hide','critic-nofx')")
                fails = []
                for run in data['runs']:
                    r, g, b, a = parse_rgba(run['color'])
                    alpha = a * run['op']
                    th = 3.0 if run['large'] else 4.5
                    for (x0, y0, x1, y1) in run['rects']:
                        x0, y0, x1, y1 = int(math.ceil(x0)) + 1, int(math.ceil(y0)) + 1, int(math.floor(x1)) - 1, int(math.floor(y1)) - 1
                        if x1 - x0 < 1 or y1 - y0 < 1: continue
                        reg = img[y0:y1, x0:x1].reshape(-1, 3)
                        if reg.size == 0: continue
                        idx = np.argsort(lum(reg))
                        for bg in (reg[idx[int(len(idx) * 0.03)]], reg[idx[min(len(idx) - 1, int(len(idx) * 0.97))]]):
                            fg = alpha * np.array([r, g, b]) + (1 - alpha) * bg
                            c = contrast(float(lum(fg[None, :])[0]), float(lum(bg[None, :])[0]))
                            if c < th:
                                fails.append(f"{tag} '{run['text']}' ({run['sel']}) contrast {c:.2f} < {th}")
                                break
                        else: continue
                        break
                for f in sorted(set(fails))[:8]: R.check('READABILITY', False, f, 0.5)
                if not fails: R.check('READABILITY', True, '')
                if W == 1440:
                    mono = [run for run in data['runs'] if not any(k in run['font'] for k in ('Mono', 'VT323', 'monospace'))]
                    R.check('RETRO IDENTITY', not mono, f'{tag} non-monospace text: {[m["sel"] for m in mono[:4]]}', 1)
                    R.check('RETRO IDENTITY', not any(run['gradient'] for run in data['runs']), f'{tag} gradient-filled text', 1)
                    hsv = np.asarray(Image.fromarray(img).convert('HSV')).reshape(-1, 3).astype(int)
                    green = ((hsv[:, 0] > 60) & (hsv[:, 0] < 117) & (hsv[:, 1] > 90) & (hsv[:, 2] > 60)).mean()
                    R.check('RETRO IDENTITY', green < 0.002, f'{tag} green pixels {green*100:.2f}%', 1)

            # the spider must descend section by section and catch exactly one fly per section
            ys = [round(y) for _, y, _, _ in eaten_seq]
            R.check('SMOOTHNESS', all(b > a for a, b in zip(ys, ys[1:])), f'{W}px spider does not descend section by section: {ys}', 1)
            caught = [c for _, _, c, _ in eaten_seq]
            R.check('UI & LAYOUT', caught == list(range(len(caught))), f'{W}px flies caught per section {caught}, expected 0..4', 1)
            if W == 1440: R.metrics['spider_y_1440'] = ys

            # docked terminal geometry
            page.evaluate("PKS.debug.goto('about')"); page.evaluate('PKS.debug.settle()')
            page.evaluate('PKS.debug.openTerminal()')
            page.wait_for_function("getComputedStyle(document.getElementById('terminal')).opacity === '1'", timeout=5000); page.wait_for_timeout(100)
            t = term_rect(page)
            inside = t['l'] >= -0.5 and t['r'] <= t['vw'] + 0.5 and t['b'] <= t['vh'] + 0.5 and t['t'] >= t['hb'] - 0.5
            R.check('UI & LAYOUT', inside, f'{W}px terminal outside viewport/under header {t}', 2)
            if W >= 640:
                R.check('UI & LAYOUT', t['w'] <= 400, f'{W}px docked terminal too wide ({t["w"]:.0f}px)', 1)
                rail_w = page.evaluate("document.querySelector('.rail').getBoundingClientRect().width")
                edge = (t['vw'] - rail_w - t['r']) if t['dock'] == 'right' else t['l']
                R.check('UI & LAYOUT', edge <= 16, f'{W}px terminal not docked to the {t["dock"]} edge ({edge:.0f}px gap)', 1)
                page.click('[aria-label^="Dock terminal"]')
                page.wait_for_function(f"document.getElementById('terminal').dataset.dock !== '{t['dock']}'", timeout=5000); page.wait_for_timeout(150)
                t2 = term_rect(page)
                R.check('UI & LAYOUT', t2['dock'] != t['dock'] and (t2['l'] <= 16 if t2['dock'] == 'left' else t2['vw'] - rail_w - t2['r'] <= 16), f'{W}px dock toggle failed {t2}', 1)
                R.check('UI & LAYOUT', t2['r'] <= t2['vw'] - rail_w + 0.5 or t2['dock'] == 'left', f'{W}px right-docked terminal covers the spider rail', 1)
                page.click('[aria-label^="Dock terminal"]'); page.wait_for_timeout(300)
            else:
                R.check('UI & LAYOUT', t['w'] >= W - 24, f'{W}px mobile terminal should be a full-width sheet ({t["w"]:.0f}px)', 1)
            page.evaluate('PKS.debug.closeTerminal()'); page.wait_for_timeout(300)

            if mobile:
                small = page.evaluate("""() => [...document.querySelectorAll('button, .btn, .nav a')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).display !== 'none' && !e.closest('[hidden]') && (r.width < 24 || r.height < 24); }).map(e => (e.textContent || e.className).trim().slice(0, 20))""")
                R.check('UI & LAYOUT', not small, f'{W}px touch targets < 24px: {small[:5]}', 1)
                info = page.evaluate('PKS.info()')
                if info: R.check('PERFORMANCE', info['particles'] <= 1000, f'{W}px: {info["particles"]} particles on mobile', 1)
            info = page.evaluate('PKS.info()')
            if info: R.check('PERFORMANCE', info['drawCalls'] <= 70, f'{W}px draw calls {info["drawCalls"]}', 1)
            if W == 1440:
                n_ban = page.evaluate("[...document.querySelectorAll('.sec-head pre.ascii-banner, .hero-name pre.ascii-banner')].filter(p => p.textContent.trim()).length")
                R.check('RETRO IDENTITY', n_ban >= 6, f'only {n_ban} ASCII banners rendered', 2)
                R.check('RETRO IDENTITY', bool(info) and info['mode'] == 'ascii', 'ASCII renderer not active', 2)
                css = page.evaluate("""() => { const out = []; for (const e of document.querySelectorAll('*')) { const c = getComputedStyle(e);
                   for (const k of ['color','backgroundColor','borderTopColor']) { const v = c[k]; const m = v.match(/rgba?\\(([^)]+)\\)/); if (!m) continue;
                   const [r,g,b,a=1] = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); if (a < .05) continue;
                   const mx = Math.max(r,g,b), mn = Math.min(r,g,b); if (mx - mn < 40) continue;
                   let h = 0; if (mx === r) h = ((g-b)/(mx-mn)) % 6; else if (mx === g) h = (b-r)/(mx-mn) + 2; else h = (r-g)/(mx-mn) + 4; h *= 60; if (h < 0) h += 360;
                   if (h > 85 && h < 165) out.push(e.tagName + ' ' + k + ' ' + v); } } return out.slice(0, 5); }""")
                R.check('RETRO IDENTITY', not css, f'green CSS colours: {css}', 2)
            ctx.close()

        # DPR cap
        for dpr in (2, 3):
            ctx = browser.new_context(viewport={'width': 800, 'height': 600}, device_scale_factor=dpr); setup(ctx)
            page = ctx.new_page(); boot(page)
            info = page.evaluate('PKS.info()')
            R.check('PERFORMANCE', info is not None, 'WebGL scene failed to initialise', 3)
            if info: R.check('PERFORMANCE', info['pixelRatio'] <= 1.75, f'pixel ratio {info["pixelRatio"]} > 1.75 at DPR {dpr}', 1)
            ctx.close()

        # smoothness + runtime performance
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800}); setup(ctx)
        page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        boot(page); info = page.evaluate('PKS.info()')
        page.evaluate('PKS.debug.pause()'); page.evaluate('PKS.debug.enableSmooth()')
        page.evaluate("window.scrollTo(0,0)"); page.wait_for_timeout(100)
        trace = page.evaluate("""() => new Promise(res => {
            const out = []; const t0 = performance.now();
            [0, 40, 80].forEach(d => setTimeout(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true })), d));
            const f = (t) => { out.push([t - t0, scrollY]); if (t - t0 < 2500 || out.length < 40) requestAnimationFrame(f); else res(out); };
            requestAnimationFrame(f); })""")
        ys = [y for _, y in trace]
        R.check('SMOOTHNESS', all(b >= a - 0.5 for a, b in zip(ys, ys[1:])), 'wheel scroll reverses/overshoots', 2)
        R.check('SMOOTHNESS', abs(ys[-1] - 360) <= 1.5, f'wheel scroll ended at {ys[-1]:.1f}, expected 360', 1)
        moving = [i for i, y in enumerate(ys) if y > 0.5]
        stalls = sum(1 for i in range((moving[0] + 1) if moving else 0, len(ys) - 1) if moving and abs(ys[i] - ys[i - 1]) < 0.01 and 360 - ys[i] > 20)
        R.check('SMOOTHNESS', stalls <= 1, f'wheel scroll stalled for {stalls} frames mid-motion', 1)

        page.evaluate("window.scrollTo(0,0)"); page.wait_for_timeout(100)
        res = page.evaluate("""() => new Promise(res => {
            const out = []; PKS.debug.gotoSmooth('projects'); const plan = PKS.debug.scrollState();
            const f = () => { out.push([performance.now(), scrollY]); if (out.length < 40 || PKS.debug.scrollState().mode !== 'idle') requestAnimationFrame(f); else res({ out, plan }); };
            requestAnimationFrame(f); })""")
        plan, trace = res['plan'], res['out']
        R.metrics['nav_tween_planned_ms'] = round(plan['dur'])
        ts = np.array([t for t, _ in trace]); ys = np.array([y for _, y in trace])
        R.check('SMOOTHNESS', ys[-1] - ys[0] > 100, 'navigation tween did not move', 3)
        R.check('SMOOTHNESS', 450 <= plan['dur'] <= 1400, f'navigation tween duration {plan["dur"]:.0f}ms outside 450–1400ms', 1)
        R.check('SMOOTHNESS', all(b >= a - 0.5 for a, b in zip(ys, ys[1:])), 'navigation tween not monotonic', 2)
        mv = np.where(np.abs(np.diff(ys)) > 0.01)[0]
        v = np.diff(ys) / np.maximum(np.diff(ts), 1)
        if len(mv) > 4 and np.max(np.abs(v)) > 0:
            vmax = np.max(np.abs(v)); vm = v[mv[0]:mv[-1] + 1]
            R.check('SMOOTHNESS', abs(vm[0]) < .35 * vmax and abs(vm[-1]) < .35 * vmax, 'navigation tween does not ease in/out', 1)

        if info:
            sim = np.array(page.evaluate('PKS.debug.simulate(300)')); page.evaluate("window.scrollTo(0,0)")
            if R.check('SMOOTHNESS', np.isfinite(sim).all(), '3D state produced NaN/Infinity', 3):
                vel = np.linalg.norm(np.diff(sim[:, :3], axis=0), axis=1); acc = np.abs(np.diff(vel))
                R.metrics['cam_max_dv_ratio'] = round(float(acc.max() / max(vel.max(), 1e-6)), 3)
                R.check('SMOOTHNESS', acc.max() / max(vel.max(), 1e-6) < 0.2, f'camera velocity jump {acc.max()/vel.max():.2f} of peak per frame', 2)
                R.check('SMOOTHNESS', np.abs(np.diff(sim[:, 3])).max() < 0.6, 'FOV jumps in one frame', 1)
                ratio = np.abs(np.diff(sim[:, 4:6], axis=0)).max(axis=1) - (3.0 * np.abs(np.diff(sim[:, 7])) / 400 + 0.004)
                R.check('SMOOTHNESS', ratio.max() <= 0, f'3D anchor outruns the page by {ratio.max():.3f} NDC/frame', 1)
            page.evaluate("PKS.debug.goto('home')"); page.evaluate('PKS.debug.profile(true)'); page.evaluate('PKS.debug.resume()')
            page.wait_for_timeout(2500)
            prof = page.evaluate('PKS.debug.profile(false)'); page.evaluate('PKS.debug.pause()')
            if prof and prof['upd']:
                p95 = float(np.percentile(prof['upd'], 95)); R.metrics['frame_js_p95_ms'] = round(p95, 3)
                R.check('PERFORMANCE', p95 < 2.0, f'scene update JS p95 {p95:.2f}ms > 2ms', 2)
            a = page.evaluate('PKS.info()'); page.evaluate('PKS.debug.resume()'); page.wait_for_timeout(1500); page.evaluate('PKS.debug.pause()'); b = page.evaluate('PKS.info()')
            R.check('PERFORMANCE', a['geometries'] == b['geometries'] and a['textures'] == b['textures'], 'GPU resources grow over time', 2)
            page.evaluate('PKS.debug.resume()')
            page.evaluate("Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'))")
            page.wait_for_timeout(100)
            R.check('PERFORMANCE', page.evaluate('PKS.info().running') is False, 'render loop keeps running while tab is hidden', 2)
        costly = page.evaluate("""() => [...document.querySelectorAll('*')].filter(e => { const c = getComputedStyle(e); return (c.backdropFilter && c.backdropFilter !== 'none') || (c.mixBlendMode && c.mixBlendMode !== 'normal'); }).length""")
        R.check('PERFORMANCE', costly == 0, f'{costly} elements use backdrop-filter / blend modes', 1)
        ctx.close()

        # real (non-critic) run
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900}); setup(ctx)
        ctx.add_init_script("sessionStorage.setItem('pks.booted','1')")
        page = ctx.new_page(); sizes = []
        page.on('response', lambda r: sizes.append((r.url, len(r.body()) if r.ok else 0)) if r.url.startswith(base) else None)
        boot(page, base, debug=False); page.wait_for_timeout(2500)
        inf = page.evaluate("document.getAnimations().filter(a => a.effect && a.effect.getTiming().iterations === Infinity).length")
        R.metrics['infinite_animations'] = inf
        R.check('PERFORMANCE', inf <= 6, f'{inf} infinite CSS animations', 1)
        muts = page.evaluate("""() => new Promise(res => { let n = 0; const mo = new MutationObserver(l => n += l.length); mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); setTimeout(() => { mo.disconnect(); res(n); }, 3000); })""")
        R.metrics['idle_dom_mutations_3s'] = muts
        R.check('PERFORMANCE', muts <= 8, f'{muts} DOM mutations in 3s idle', 1)
        for sec in SECTIONS:
            page.evaluate(f"document.querySelector('a[data-nav=\"{sec}\"]').click()"); page.wait_for_timeout(700)
        cls = page.evaluate('window.__cls'); R.metrics['cls'] = round(cls, 4)
        R.check('PERFORMANCE', cls < 0.05, f'cumulative layout shift {cls:.3f}', 1)
        payload = sum(s for u, s in sizes if not any(u.split('?')[0].endswith(x) for x in args.exclude) and not u.endswith(('.png', '.svg', '.woff2')))
        R.metrics['first_party_kb'] = round(payload / 1024, 1)
        R.check('PERFORMANCE', payload < args.budget_kb * 1024, f'first-party payload {payload/1024:.0f}KB > {args.budget_kb}KB', 1)
        a11y = page.evaluate("""() => {
          const issues = [];
          if (!document.documentElement.lang) issues.push('missing lang');
          if (document.querySelectorAll('h1').length !== 1) issues.push('h1 count ' + document.querySelectorAll('h1').length);
          let prev = 0; for (const h of document.querySelectorAll('h1,h2,h3,h4')) { const l = +h.tagName[1]; if (prev && l > prev + 1) issues.push('heading skip ' + h.textContent.trim().slice(0, 20)); prev = l; }
          for (const i of document.querySelectorAll('input, textarea, select')) { if (!(i.labels && i.labels.length) && !i.getAttribute('aria-label')) issues.push('unlabelled ' + i.id); }
          for (const b of document.querySelectorAll('button, a[href]')) { const name = (b.getAttribute('aria-label') || b.textContent || '').trim(); if (!name) issues.push('nameless ' + b.className); }
          for (const sel of ['header', 'nav', 'main', 'footer']) if (!document.querySelector(sel)) issues.push('missing landmark ' + sel);
          const skip = document.querySelector('.skip-link'); if (!skip || !document.querySelector(skip.getAttribute('href'))) issues.push('skip link broken');
          const dlg = document.querySelector('[role=dialog]'); if (!dlg || !dlg.getAttribute('aria-labelledby')) issues.push('dialog unlabeled');
          const pb = document.querySelector('[role=progressbar]'); if (!pb || !pb.getAttribute('aria-label') || pb.getAttribute('aria-valuenow') === null || !pb.getAttribute('aria-valuetext')) issues.push('scroll spider progressbar not labelled');
          const st = document.getElementById('soundToggle'); if (!st || !st.getAttribute('aria-label') || !st.hasAttribute('aria-pressed')) issues.push('sound toggle missing name / aria-pressed');
          if (document.querySelector('canvas:not([aria-hidden=true])')) issues.push('canvas not hidden from AT');
          for (const p of document.querySelectorAll('pre.ascii-banner')) if (p.getAttribute('aria-hidden') !== 'true' && !p.closest('[aria-hidden=true]')) issues.push('banner exposed to AT');
          return issues; }""")
        for i in a11y: R.check('ACCESSIBILITY', False, i, 1)
        if not a11y: R.check('ACCESSIBILITY', True, '')
        page.evaluate("window.scrollTo(0,0); document.activeElement && document.activeElement.blur()")
        bad = []
        for _ in range(14):
            page.keyboard.press('Tab')
            st = page.evaluate("(() => { const e = document.activeElement; if (!e || e === document.body) return null; const c = getComputedStyle(e); return [e.id || e.textContent.trim().slice(0,16), c.outlineStyle, parseFloat(c.outlineWidth), c.boxShadow]; })()")
            if st and (st[1] == 'none' or st[2] < 1) and st[3] == 'none': bad.append(st[0])
        R.check('ACCESSIBILITY', not bad, f'focus not visible on: {bad[:4]}', 1)
        page.keyboard.press('Escape'); page.evaluate("document.activeElement.blur()")
        page.click('#enterTerminal'); page.wait_for_timeout(400)
        R.check('ACCESSIBILITY', page.evaluate("document.activeElement.id") == 'termInput', 'terminal input not focused on open', 1)
        page.keyboard.press('Escape'); page.wait_for_timeout(400)
        R.check('ACCESSIBILITY', page.evaluate("document.getElementById('terminal').hidden") and page.evaluate("document.activeElement.id") == 'enterTerminal', 'Escape does not close terminal / restore focus', 1)
        ctx.close()

        # ---------------- SOUND ----------------
        # Sound + spider logic don't depend on WebGL, so this section runs in a browser with WebGL off:
        # software GPUs (CI machines, this critic's default swiftshader) stall frames and would make
        # scroll-driven counts depend on the machine instead of the code.
        nogl = p.chromium.launch(**{**launch, 'args': launch['args'] + ['--disable-webgl', '--disable-3d-apis']})
        ctx = nogl.new_context(viewport={'width': 1280, 'height': 800}); setup(ctx)
        ctx.add_init_script("sessionStorage.setItem('pks.booted','1')")
        page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        boot(page); page.evaluate('PKS.debug.pause()')
        st0 = page.evaluate('PKS.debug.sound()')
        R.check('SOUND', not st0['enabled'] and not st0['contextCreated'], f'sound must be off and no AudioContext created before opt-in ({st0})', 3)
        page.mouse.move(400, 300); page.evaluate("PKS.debug.goto('about')"); page.keyboard.press('/'); page.wait_for_timeout(300)
        page.keyboard.type('hi', delay=40); page.keyboard.press('Escape'); page.wait_for_timeout(400)
        R.check('SOUND', page.evaluate('PKS.debug.sound().played') == 0, 'effects played while sound was off', 2)
        page.evaluate("window.scrollTo(0,0)")
        page.click('#soundToggle'); page.wait_for_timeout(150)
        st1 = page.evaluate('PKS.debug.sound()')
        R.check('SOUND', st1['enabled'] and st1['contextCreated'] and page.get_attribute('#soundToggle', 'aria-pressed') == 'true', f'sound toggle did not enable audio ({st1})', 2)
        R.check('SOUND', page.evaluate("localStorage.getItem('pks.sound')") == 'on', 'sound preference not persisted', 1)
        # scrolling: 12 steps spaced wider than the tick throttle (frame-rate independent)
        t0 = page.evaluate('PKS.debug.sound().byName.tick || 0')
        for i in range(1, 13):
            page.evaluate(f"window.scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * {i} / 20))"); page.wait_for_timeout(90)
        R.metrics['ticks_for_12_scroll_steps'] = page.evaluate('PKS.debug.sound().byName.tick || 0') - t0
        R.check('SOUND', R.metrics['ticks_for_12_scroll_steps'] >= 6, f"scrolling produced {R.metrics['ticks_for_12_scroll_steps']} ticks for 12 steps", 1)
        page.evaluate("window.scrollTo(0,0)"); page.wait_for_timeout(100)
        page.evaluate('PKS.debug.enableSmooth()'); page.evaluate("PKS.debug.gotoSmooth('projects')"); page.wait_for_timeout(1700)
        page.keyboard.press('/'); page.wait_for_timeout(250)
        page.keyboard.type('whoami', delay=60); page.keyboard.press('Backspace'); page.keyboard.press('Enter'); page.wait_for_timeout(120)
        page.fill('#termInput', 'definitely-not-a-command'); page.press('#termInput', 'Enter'); page.wait_for_timeout(150)
        page.fill('#termInput', 'theme ember'); page.press('#termInput', 'Enter'); page.wait_for_timeout(150)
        page.fill('#termInput', 'theme aurora'); page.press('#termInput', 'Enter'); page.wait_for_timeout(150)
        by = page.evaluate('PKS.debug.sound().byName')
        R.metrics['sound_effects_played'] = by
        for name, need in [('key', 4), ('backspace', 1), ('enter', 1), ('catch', 1), ('nav', 1), ('open', 1), ('error', 1), ('theme', 1)]:
            R.check('SOUND', by.get(name, 0) >= need, f"'{name}' effect played {by.get(name, 0)}x, expected ≥ {need}", 1)
        page.keyboard.press('Escape'); page.wait_for_timeout(300)
        R.check('SOUND', page.evaluate('PKS.debug.sound().byName.close || 0') >= 1, "'close' effect not played", 1)
        # throttling: a burst of 60 fast keystrokes must not trigger 60 sounds
        page.keyboard.press('/'); page.wait_for_timeout(250)
        k0 = page.evaluate('PKS.debug.sound().byName.key || 0')
        page.keyboard.type('x' * 60, delay=0)
        k1 = page.evaluate('PKS.debug.sound().byName.key || 0')
        R.metrics['burst_keys_played_of_60'] = k1 - k0
        R.check('SOUND', k1 - k0 <= 40, f'typing burst not throttled ({k1 - k0} sounds for 60 keys)', 1)
        page.keyboard.press('Escape'); page.wait_for_timeout(300)
        page.click('#soundToggle'); page.wait_for_timeout(100)
        p0 = page.evaluate('PKS.debug.sound().played'); page.evaluate("PKS.debug.goto('home')"); page.keyboard.press('/'); page.keyboard.type('abc', delay=40)
        R.check('SOUND', page.evaluate('PKS.debug.sound().played') == p0 and page.evaluate('PKS.debug.sound().enabled') is False, 'mute does not silence effects', 2)
        ctx.close(); nogl.close()

        # ---------------- CONTACT (mail provider mocked) + FEATURES ----------------
        nogl = p.chromium.launch(**{**launch, 'args': launch['args'] + ['--disable-webgl', '--disable-3d-apis']})
        def contact_page(mode):
            ctx = nogl.new_context(viewport={'width': 1280, 'height': 800}); setup(ctx)
            ctx.add_init_script("sessionStorage.setItem('pks.booted','1')")
            calls = []
            bodies = {
                'ok': (200, '{"success":"true","message":"The form was submitted successfully."}'),
                'activation': (200, '{"success":"false","message":"This form needs Activation. We\'ve sent you an email containing an \'Activate Form\' link."}'),
                '500': (500, '{"success":"false","message":"server error"}'),
            }
            def handler(route):
                calls.append(route.request.post_data)
                if mode in bodies: route.fulfill(status=bodies[mode][0], content_type='application/json', body=bodies[mode][1])
                else: route.abort()
            ctx.unroute('https://formsubmit.co/**'); ctx.route('https://formsubmit.co/**', handler)
            page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
            boot(page); page.evaluate("PKS.debug.goto('contact')")
            return ctx, page, calls
        def fill(page):
            page.fill('#fName', 'Ada Lovelace'); page.fill('#fEmail', 'ada@example.com'); page.fill('#fMsg', 'Hello Pankaj, I would like to talk about a role.')
        def send(page):
            page.click('#sendBtn'); page.wait_for_function("!document.getElementById('sendBtn').disabled", timeout=20000)
            return page.inner_text('#formStatus')

        ctx, page, calls = contact_page('ok')
        provider = page.evaluate("document.querySelector('#contact .wb-meta').textContent")
        R.check('CONTACT', 'LIVE' in provider or 'MAILTO' in provider, f'contact form is not configured ({provider})', 3)
        page.click('#sendBtn'); page.wait_for_timeout(100)
        R.check('CONTACT', 'validation failed' in page.inner_text('#formStatus') and page.evaluate('document.activeElement.id') == 'fName' and not calls, 'empty form not rejected / focus not moved to first invalid field', 1)
        fill(page); st = send(page)
        import json as _j
        payload = _j.loads(calls[0]) if calls else {}
        R.check('CONTACT', len(calls) == 1 and payload.get('email') == 'ada@example.com' and payload.get('message', '').startswith('Hello Pankaj') and payload.get('_replyto') == 'ada@example.com', f'wrong mail payload {payload}', 2)
        R.check('CONTACT', 'delivered' in st and page.input_value('#fName') == '', f'success not confirmed / form not reset ({st[:60]})', 2)
        fill(page); page.click('#sendBtn'); page.wait_for_timeout(150)
        R.check('CONTACT', len(calls) == 1, 'second message within the cooldown was sent (no spam protection)', 1)
        ctx.close()
        for mode, needle in [('activation', 'NOT delivered'), ('500', 'not delivered'), ('abort', 'not delivered')]:
            ctx, page, calls = contact_page(mode); fill(page); st = send(page)
            href = page.get_attribute('#mailtoFallback', 'href') if page.locator('#mailtoFallback').count() else ''
            R.check('CONTACT', needle in st and 'delivered.' not in st.replace('not delivered', '').replace('NOT delivered', ''), f'{mode}: misleading status ({st[:80]})', 2)
            R.check('CONTACT', href.startswith('mailto:') and 'Hello%20Pankaj' in href and page.input_value('#fMsg').startswith('Hello'), f'{mode}: no prefilled mailto fallback / text lost', 1)
            ctx.close()
        ctx, page, calls = contact_page('ok'); fill(page)
        page.evaluate("(()=>{const i=document.getElementById('fWebsite'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'spam.biz'); i.dispatchEvent(new Event('input',{bubbles:true}));})()")
        page.click('#sendBtn'); page.wait_for_timeout(200)
        R.check('CONTACT', not calls, 'honeypot filled but a message was still sent', 1)
        ctx.close()

        # FEATURES
        ctx = nogl.new_context(viewport={'width': 1280, 'height': 800}); setup(ctx)
        ctx.add_init_script("sessionStorage.setItem('pks.booted','1')")
        repos = [{'name': f'repo{i}', 'html_url': f'https://github.com/x/repo{i}', 'description': '', 'language': 'Python', 'stargazers_count': i, 'pushed_at': '2026-01-0%dT00:00:00Z' % (i + 1), 'fork': i == 2, 'archived': False} for i in range(8)]
        ctx.unroute('https://api.github.com/**')
        ctx.route('https://api.github.com/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(repos), headers={'Access-Control-Allow-Origin': '*'}))
        page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') and 'ERR_FAILED' not in m.text and 'fonts.g' not in m.text else None)
        boot(page, base, debug=False); page.wait_for_timeout(500)
        page.evaluate("document.querySelector('[aria-label=\"Recently updated repositories\"]').scrollIntoView()"); page.wait_for_timeout(1500)
        names = page.evaluate("[...document.querySelectorAll('[aria-label=\"Recently updated repositories\"] a')].map(a => a.textContent.replace('▸ ', ''))")
        R.check('FEATURES', names[:2] == ['repo0', 'repo1'] and 'repo2' not in names and len(names) == 6, f'live GitHub window wrong: {names}', 1)
        R.check('FEATURES', page.locator('text=result ›').count() >= len(page.evaluate("[...document.querySelectorAll('.project')]")) , 'not every project has an outcome line', 1)
        if page.locator('button:has-text("./case-study")').count():
            page.click('button:has-text("./case-study")'); page.wait_for_timeout(100)
            R.check('FEATURES', page.is_visible("text=WHAT I'D DO NEXT"), 'case study does not open', 1)
        seo = page.evaluate("""() => ({ og: !!document.querySelector('meta[property="og:image"]'), tw: (document.querySelector('meta[name="twitter:card"]') || {}).content,
            ld: (() => { try { return JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@type']; } catch (e) { return null; } })() })""")
        R.check('FEATURES', seo['og'] and seo['tw'] == 'summary_large_image' and seo['ld'] == 'Person', f'SEO tags incomplete {seo}', 1)
        page.evaluate("window.scrollTo(0,0); document.activeElement.blur()")
        for k in ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']: page.keyboard.press(k)
        page.wait_for_timeout(150)
        R.check('FEATURES', page.evaluate('document.documentElement.dataset.theme') == 'amber', 'Konami code does not unlock the amber theme', 1)
        for k in ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']: page.keyboard.press(k)
        page.keyboard.press('/'); page.wait_for_timeout(300)
        for c in ['links', 'github', 'cat experience.txt', 'email']:
            page.fill('#termInput', c); page.press('#termInput', 'Enter'); page.wait_for_timeout(80)
        out = page.inner_text('[role=log]')
        R.check('FEATURES', 'LINKS' in out and 'EXPERIENCE' in out and 'repo0' in out and page.evaluate("document.querySelectorAll('[role=log] a').length") >= 5, 'terminal links / github / experience output incomplete', 1)
        page.fill('#termInput', 'snake'); page.press('#termInput', 'Enter'); page.wait_for_timeout(300)
        g0 = page.evaluate("document.querySelector('.snake-game pre').textContent")
        page.keyboard.press('ArrowDown'); page.wait_for_timeout(500)
        g1 = page.evaluate("document.querySelector('.snake-game pre').textContent")
        R.check('FEATURES', page.evaluate("document.activeElement.classList.contains('snake-game')") and g0 != g1, 'snake game does not start / move', 1)
        page.keyboard.press('Escape'); page.wait_for_timeout(300)
        R.check('FEATURES', page.locator('.snake-game').count() == 0 and not page.evaluate("document.getElementById('terminal').hidden") and page.evaluate('document.activeElement.id') == 'termInput', 'Esc should quit the game but keep the terminal open', 1)
        ctx.close(); nogl.close()

        # reduced motion
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800}, reduced_motion='reduce'); setup(ctx)
        page = ctx.new_page(); boot(page, base, debug=False); page.wait_for_timeout(1200)
        R.check('ACCESSIBILITY', page.evaluate("!document.getElementById('boot')"), 'boot screen shown under reduced motion', 1)
        R.check('ACCESSIBILITY', page.evaluate("getComputedStyle(document.querySelector('.hero-role')).opacity") == '1', 'hero hidden under reduced motion', 1)
        r0 = page.evaluate('window.__raf'); page.wait_for_timeout(1000); r1 = page.evaluate('window.__raf')
        R.metrics['reduced_motion_raf_per_s'] = r1 - r0
        R.check('PERFORMANCE', r1 - r0 <= 3, f'{r1 - r0} rAF/s idle under reduced motion', 1)
        page.keyboard.press('/'); page.fill('#termInput', 'contact'); page.press('#termInput', 'Enter'); page.wait_for_timeout(400)
        top = page.evaluate("document.querySelector('#contact .sec-head').getBoundingClientRect().top")
        R.check('ACCESSIBILITY', 60 < top < 160, f'terminal navigation broken under reduced motion (heading at {top:.0f}px)', 2)
        ctx.close()
        browser.close()

    uniq = sorted(set(errors))
    R.check('PERFORMANCE', not uniq, f'console errors/warnings: {uniq[:4]}', 2)

    print('\n================  PKS.OS UI CRITIC  ================')
    allten = True
    for cat in R.cats:
        s = R.score(cat); allten &= s >= 10
        print(f'{cat:<16} {s:>4}/10   ({R.passes[cat]} checks passed, {len(R.cats[cat])} issues)')
    print('\nmetrics:', json.dumps(R.metrics))
    for cat, issues in R.cats.items():
        if issues:
            print(f'\n[{cat}]')
            for w, m in issues[:25]: print(f'  -{w:<4} {m}')
    print('\nVERDICT:', 'PERFECT — all categories 10/10' if allten else 'NEEDS WORK')
    if args.json:
        json.dump({'scores': {c: R.score(c) for c in R.cats}, 'issues': {c: [m for _, m in v] for c, v in R.cats.items()}, 'metrics': R.metrics}, open(args.json, 'w'), indent=2)
    sys.exit(0 if allten else 1)

if __name__ == '__main__':
    main()


