/* ==========================================================================
   three/scene.js — PKS.OS WebGL environment

   PIPELINE
     scene ──► half-res render target ──► ASCII post-process (GPU) ──► screen
                                                  └─► overlay pass (node labels)

   LAYOUT-LOCKED FRAMING
     Each section has an empty DOM stage ([data-anchor3d]). Every frame the
     scene shifts its projection centre onto that stage and picks a camera
     distance so the composition fits inside it → never behind text.

   STATE MACHINE
     sceneStates are blended by the section coordinate s ∈ [0,4] (from
     scrollFrame.js) and damped frame-rate independently.

   createScene() returns an API including destroy(), which removes every
   listener and frees GPU resources (needed for React StrictMode / HMR).
   ========================================================================== */

import * as THREE from 'three';

export const PALETTES = {
  aurora:  { primary: 0x8b5cf6, secondary: 0x67e8f9, highlight: 0xfb7185, dim: 0x2a1f52 },
  ember:   { primary: 0xfb7185, secondary: 0xa78bfa, highlight: 0x67e8f9, dim: 0x4a1f33 },
  glacier: { primary: 0x67e8f9, secondary: 0xa78bfa, highlight: 0xfb7185, dim: 0x15384a },
  amber:   { primary: 0xf59e0b, secondary: 0xfcd34d, highlight: 0xfb7185, dim: 0x3d2a08 },  // hidden CRT theme
};

const ORDER_KEYS = ['home', 'about', 'skills', 'projects', 'contact'];

/* Edit these to change how each section looks in 3D. */
export const sceneStates = {
  home: {
    anchored: 1, frameRadius: 7.8, camDir: [0, 0.08, 1], orbit: 0, fov: 40,
    pivot: [0, 0, 0], camOff: [0, 0.8, 27], lookOff: [0, 0, 0],
    core: [0, 0, 0], coreScale: 1, coreOpacity: 1,
    layout: { shell: 1, orbit: 0, corridor: 0, ring: 0 },
    nodes: 0, ringsAlign: 0, ringsOpacity: 0.55, ringsScale: 1, workflowMode: 0,
    gridOpacity: 0.16, glow: 0.5, travel: 0, dim: 1, accent: 'primary', accent2: 'secondary',
  },
  about: {
    anchored: 1, frameRadius: 7.3, camDir: [0, 0.16, 1], orbit: 0.95, fov: 46,
    pivot: [0, 0, 0], camOff: [0, 1.4, 14], lookOff: [0, 0, 0],
    core: [0, 0, 0], coreScale: 1.05, coreOpacity: 1,
    layout: { shell: 1, orbit: 0, corridor: 0, ring: 0 },
    nodes: 0, ringsAlign: 0.15, ringsOpacity: 0.5, ringsScale: 1, workflowMode: 1,
    gridOpacity: 0.1, glow: 0.6, travel: 0, dim: 1, accent: 'secondary', accent2: 'primary',
  },
  skills: {
    anchored: 1, frameRadius: 8.4, camDir: [0, 0.3, 1], orbit: 1.8, fov: 44,
    pivot: [0, 0, 0], camOff: [0, 4, 20], lookOff: [0, 0, 0],
    core: [0, 0, 0], coreScale: 0.5, coreOpacity: 0.9,
    layout: { shell: 0, orbit: 1, corridor: 0, ring: 0 },
    nodes: 1, ringsAlign: 0, ringsOpacity: 0.14, ringsScale: 0.7, workflowMode: 0,
    gridOpacity: 0.12, glow: 0.4, travel: 0, dim: 1, accent: 'primary', accent2: 'secondary',
  },
  projects: {
    anchored: 0, frameRadius: 8, camDir: [0, 0.1, 1], orbit: 0, fov: 58,
    pivot: [0, 0, -10], camOff: [0, 0.9, 9], lookOff: [0, 0, -34],
    core: [0, 0, 0], coreScale: 0.75, coreOpacity: 0.55,
    layout: { shell: 0, orbit: 0, corridor: 1, ring: 0 },
    nodes: 0, ringsAlign: 0.4, ringsOpacity: 0.22, ringsScale: 1, workflowMode: 0,
    gridOpacity: 0.26, glow: 0.35, travel: 1, dim: 0.85, accent: 'primary', accent2: 'secondary',
  },
  contact: {
    anchored: 1, frameRadius: 9.2, camDir: [0, 0.02, 1], orbit: 0, fov: 44,
    pivot: [0, 0, -78], camOff: [0, 0.2, 17], lookOff: [0, 0, 0],
    core: [0, 0, -78], coreScale: 0.42, coreOpacity: 1,
    layout: { shell: 0, orbit: 0, corridor: 0, ring: 1 },
    nodes: 0, ringsAlign: 1, ringsOpacity: 0.85, ringsScale: 1.3, workflowMode: 0,
    gridOpacity: 0.16, glow: 0.7, travel: 0, dim: 1, accent: 'highlight', accent2: 'primary',
  },
};

const SKILL_NODES = [
  { key: 'frontend',  label: 'FRONTEND',  pos: [0, 4.4, 0] },
  { key: 'data',      label: 'DATA',      pos: [0, -4.4, 0] },
  { key: 'ai',        label: 'AI/ML',     pos: [-5.8, 0, 0] },
  { key: 'backend',   label: 'BACKEND',   pos: [5.8, 0, 0] },
  { key: 'languages', label: 'LANGUAGES', pos: [-3.4, 2.5, 3.2] },
  { key: 'tools',     label: 'TOOLS',     pos: [3.4, -2.5, -3.2] },
];

const GLYPHS = ' .:-=+*#%@';
const GLYPH_SLOTS = 16;

/* ------------------------------------------------------------- helpers */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const cloneState = s => JSON.parse(JSON.stringify(s));

function mixInto(out, a, b, t) {
  for (const k in a) {
    const va = a[k], vb = b[k];
    if (typeof va === 'number') out[k] = va + (vb - va) * t;
    else if (Array.isArray(va)) { for (let i = 0; i < va.length; i++) out[k][i] = va[i] + (vb[i] - va[i]) * t; }
    else if (va && typeof va === 'object') mixInto(out[k], va, vb, t);
    else out[k] = t < 0.5 ? va : vb;
  }
}
function dampInto(cur, tgt, f) {
  for (const k in tgt) {
    const v = tgt[k];
    if (typeof v === 'number') cur[k] += (v - cur[k]) * f;
    else if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) cur[k][i] += (v[i] - cur[k][i]) * f; }
    else if (v && typeof v === 'object') dampInto(cur[k], v, f);
    else cur[k] = v;
  }
}
const hexToRGB = hex => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function canvasTexture(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}
function makeGlowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.2, 'rgba(255,255,255,.5)');
  grd.addColorStop(0.5, 'rgba(255,255,255,.1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return canvasTexture(c);
}
function makeLabelTexture(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.font = '600 46px "JetBrains Mono", ui-monospace, monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const label = `[ ${text} ]`;
  const w = Math.min(500, g.measureText(label).width + 24);
  g.fillStyle = 'rgba(7,7,16,.88)'; g.fillRect(256 - w / 2, 34, w, 60);
  g.fillStyle = '#f4f1ff'; g.fillText(label, 256, 66);
  return canvasTexture(c);
}
function makeGlyphAtlas() {
  const c = document.createElement('canvas'); c.width = 32 * GLYPH_SLOTS; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 46px "JetBrains Mono", "DejaVu Sans Mono", ui-monospace, monospace';
  for (let i = 0; i < GLYPHS.length; i++) g.fillText(GLYPHS[i], i * 32 + 16, 34);
  return canvasTexture(c, false);
}

/* ==========================================================================
   createScene
   ========================================================================== */
export function createScene(canvas, opts = {}) {
  const isMobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  let reduced = !!opts.reducedMotion;
  let mode = opts.mode === 'vector' ? 'vector' : 'ascii';
  const getFrame = opts.getFrame || (() => null);
  const REV = parseInt(THREE.REVISION, 10) || 0;
  const ENCODE = REV >= 152 ? 1 : 0; // r152+: linear render targets → encode manually
  let destroyed = false;

  /* listener bookkeeping so destroy() can remove everything */
  const listeners = [];
  const on = (target, ev, fn, o) => { target.addEventListener(ev, fn, o); listeners.push([target, ev, fn, o]); };

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true });
  let dprCap = isMobile ? 1.5 : 1.75;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  renderer.setClearColor(0x070710, 1);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false; // count every pass of a frame; reset in draw()
  const gl = renderer.getContext();
  const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

  const scene = new THREE.Scene();
  const FOG_BASE = 0.021;
  scene.fog = new THREE.FogExp2(0x070710, FOG_BASE);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);
  const overlay = new THREE.Scene();

  /* ---------- palette ---------- */
  let paletteName = 'aurora';
  const pal = { primary: new THREE.Color(), secondary: new THREE.Color(), highlight: new THREE.Color(), dim: new THREE.Color() };
  const loadPalette = (name) => {
    const p = PALETTES[name] || PALETTES.aurora;
    pal.primary.setHex(p.primary); pal.secondary.setHex(p.secondary); pal.highlight.setHex(p.highlight); pal.dim.setHex(p.dim);
  };
  loadPalette(paletteName);

  const R = rng(20260);
  const glowTex = makeGlowTexture();

  /* ======================================================================
     CORE ARTIFACT
     ====================================================================== */
  const anchor = new THREE.Group();
  scene.add(anchor);
  const core = new THREE.Group();
  anchor.add(core);

  const icoGeo = new THREE.IcosahedronGeometry(3, 1);
  const icoMat = new THREE.LineBasicMaterial({ color: pal.primary, transparent: true, opacity: 0.95, depthWrite: false });
  core.add(new THREE.LineSegments(new THREE.EdgesGeometry(icoGeo), icoMat));
  const icoOuterMat = new THREE.LineBasicMaterial({ color: pal.secondary, transparent: true, opacity: 0.22, depthWrite: false });
  const icoOuter = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(3.9, 0)), icoOuterMat);
  core.add(icoOuter);
  const vertMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  core.add(new THREE.Points(icoGeo, vertMat));
  const knotMat = new THREE.MeshBasicMaterial({ color: pal.secondary, wireframe: true, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.25, 0.3, isMobile ? 56 : 96, isMobile ? 6 : 8, 2, 3), knotMat);
  core.add(knot);
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: pal.primary, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(14, 14, 1);
  anchor.add(glow);

  /* rings: workflow stages (about) → portal (contact) */
  const ringGroup = new THREE.Group();
  anchor.add(ringGroup);
  const rings = [];
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? pal.secondary : pal.primary, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(3.9 + i * 0.62, 0.035, 5, isMobile ? 80 : 128), mat);
    mesh.userData = { tiltX: (R() - 0.5) * 2.4 + (Math.PI / 2) * (i % 2), tiltY: (R() - 0.5) * 1.6, speed: (0.08 + R() * 0.12) * (i % 2 ? -1 : 1), color: new THREE.Color() };
    ringGroup.add(mesh);
    rings.push(mesh);
  }

  /* skill graph */
  const nodeGroup = new THREE.Group();
  anchor.add(nodeGroup);
  const nodeGeo = new THREE.IcosahedronGeometry(0.42, 1);
  const nodes = [];
  const linePos = new Float32Array(SKILL_NODES.length * 6);
  SKILL_NODES.forEach((n, i) => {
    const holder = new THREE.Group();
    holder.position.set(...n.pos);
    const mesh = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ color: pal.secondary, transparent: true, opacity: 1, wireframe: true }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: pal.secondary, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(2.4, 2.4, 1);
    holder.add(mesh, halo);
    nodeGroup.add(holder);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabelTexture(n.label), transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    label.scale.set(5.2, 1.3, 1);
    overlay.add(label);
    nodes.push({ key: n.key, text: n.label, holder, mesh, halo, label, hl: 0 });
    linePos.set([0, 0, 0, ...n.pos], i * 6);
  });
  const nodeLineGeo = new THREE.BufferGeometry();
  nodeLineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const nodeLineMat = new THREE.LineBasicMaterial({ color: pal.primary, transparent: true, opacity: 0.5, depthWrite: false });
  nodeGroup.add(new THREE.LineSegments(nodeLineGeo, nodeLineMat));
  const coreLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabelTexture('CORE'), transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  coreLabel.scale.set(4, 1, 1);
  overlay.add(coreLabel);

  /* ======================================================================
     FRAGMENTS — one set of objects, four blended layouts
     ====================================================================== */
  const FRAG_COUNT = isMobile ? 26 : 50;
  const fragGeos = [
    new THREE.EdgesGeometry(new THREE.TetrahedronGeometry(0.46)),
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.4)),
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.56, 0.56, 0.56)),
  ];
  const fragMats = [
    new THREE.LineBasicMaterial({ color: pal.primary, transparent: true, opacity: 0.9, depthWrite: false }),
    new THREE.LineBasicMaterial({ color: pal.secondary, transparent: true, opacity: 0.8, depthWrite: false }),
    new THREE.LineBasicMaterial({ color: pal.highlight, transparent: true, opacity: 0.75, depthWrite: false }),
  ];
  const frags = [];
  for (let i = 0; i < FRAG_COUNT; i++) {
    const obj = new THREE.LineSegments(fragGeos[i % 3], fragMats[R() < 0.55 ? 0 : R() < 0.7 ? 1 : 2]);
    const u = R() * 2 - 1, th = R() * Math.PI * 2, sq = Math.sqrt(1 - u * u);
    const side = i % 2 ? 1 : -1;
    obj.scale.setScalar(0.8 + R() * 0.7);
    obj.rotation.set(R() * 6, R() * 6, R() * 6);
    scene.add(obj);
    frags.push({
      obj, rotSpd: 0.2 + R() * 0.5,
      shellDir: new THREE.Vector3(sq * Math.cos(th), u, sq * Math.sin(th)), shellR: 4.6 + R() * 1.6,
      orbitR: 5.6 + R() * 2.8, orbitA: R() * Math.PI * 2, orbitInc: (R() - 0.5) * 1.3, orbitSpd: (0.1 + R() * 0.16) * (R() < 0.5 ? -1 : 1),
      corridor: new THREE.Vector3(side * (4.2 + R() * 4.5), -2.8 + R() * 7.5, -14 - (i / FRAG_COUNT) * 64 - R() * 3),
      ringA: (i / FRAG_COUNT) * Math.PI * 2, ringR: 7.4 + (R() - 0.5) * 0.7, ringZ: (R() - 0.5) * 0.8,
    });
  }

  /* ======================================================================
     PARTICLES (single draw call)
     ====================================================================== */
  const P_COUNT = isMobile ? 800 : 1800;
  const pPos = new Float32Array(P_COUNT * 3), pCol = new Float32Array(P_COUNT * 3), pSize = new Float32Array(P_COUNT), pSeed = new Float32Array(P_COUNT);
  const pRole = new Uint8Array(P_COUNT);
  for (let i = 0; i < P_COUNT; i++) {
    pPos[i * 3] = (R() - 0.5) * 90; pPos[i * 3 + 1] = -8 + R() * 30; pPos[i * 3 + 2] = 34 - R() * 150;
    const r = R(); pRole[i] = r < 0.55 ? 0 : r < 0.85 ? 1 : 2;
    pSize[i] = 0.8 + Math.pow(R(), 3) * 2.8; pSeed[i] = R();
  }
  function paintParticles() {
    const P = PALETTES[paletteName];
    const roles = [P.primary, P.secondary, P.highlight].map(hexToRGB);
    for (let i = 0; i < P_COUNT; i++) {
      const c = roles[pRole[i]];
      for (let k = 0; k < 3; k++) pCol[i * 3 + k] = ENCODE ? Math.pow(c[k], 2.2) : c[k];
    }
  }
  paintParticles();
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 }, uMouse: { value: new THREE.Vector2() } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aSeed;
      uniform float uTime; uniform float uPR; uniform vec2 uMouse;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.18 + aSeed * 6.2831) * 0.5 + uMouse.x * (0.4 + aSeed * 1.2);
        p.y += cos(uTime * 0.14 + aSeed * 12.566) * 0.35 - uMouse.y * (0.3 + aSeed * 0.8);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        gl_PointSize = min(aSize * uPR * (48.0 / max(d, 0.1)), 24.0 * uPR);
        vAlpha = smoothstep(110.0, 18.0, d) * smoothstep(0.6, 4.0, d) * (0.65 + 0.35 * sin(uTime * (0.6 + aSeed) + aSeed * 40.0));
        vColor = aColor;
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(vColor, a * a * vAlpha);
      }`,
  });
  const particles = new THREE.Points(pGeo, pMat);
  particles.frustumCulled = false;
  scene.add(particles);

  /* constellation (static) */
  const C_COUNT = isMobile ? 40 : 96;
  const cPts = [];
  for (let i = 0; i < C_COUNT; i++) cPts.push(new THREE.Vector3((R() < 0.5 ? -1 : 1) * (9 + R() * 22), -4 + R() * 18, 20 - R() * 120));
  const segs = [];
  for (let i = 0; i < C_COUNT; i++) {
    let links = 0;
    for (let j = i + 1; j < C_COUNT && links < 3; j++) if (cPts[i].distanceTo(cPts[j]) < 11) { segs.push(cPts[i].x, cPts[i].y, cPts[i].z, cPts[j].x, cPts[j].y, cPts[j].z); links++; }
  }
  const cLineGeo = new THREE.BufferGeometry();
  cLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs), 3));
  const cLineMat = new THREE.LineBasicMaterial({ color: pal.primary, transparent: true, opacity: 0.12, depthWrite: false });
  scene.add(new THREE.LineSegments(cLineGeo, cLineMat));

  /* grid (snaps to camera → infinite) */
  const GRID_STEP = 4;
  const grid = new THREE.GridHelper(320, 80, pal.primary.getHex(), pal.dim.getHex());
  grid.position.y = -9;
  const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
  gridMats.forEach(m => { m.transparent = true; m.opacity = 0.3; m.depthWrite = false; });
  scene.add(grid);

  /* ======================================================================
     ASCII POST-PROCESS
     ====================================================================== */
  const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false };
  let rt = new THREE.WebGLRenderTarget(4, 4, rtOpts);
  rt.texture.generateMipmaps = false;

  const cellCss = isMobile ? [7, 12] : [8, 14];
  const postUniforms = {
    tScene: { value: rt.texture },
    tGlyphs: { value: makeGlyphAtlas() },
    uRes: { value: new THREE.Vector2(1, 1) },
    uCell: { value: new THREE.Vector2(8, 14) },
    uTime: { value: 0 },
    uAscii: { value: mode === 'ascii' ? 1 : 0 },
    uMix: { value: 0.22 },
    uDim: { value: 1 },
    uEncode: { value: ENCODE },
    uBg: { value: new THREE.Vector3(7 / 255, 7 / 255, 16 / 255) },
    uMouse: { value: new THREE.Vector3(-9999, -9999, 0) },
    uTint: { value: new THREE.Color(0xfb7185) },
  };
  const postMat = new THREE.ShaderMaterial({
    uniforms: postUniforms, depthTest: false, depthWrite: false,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tScene; uniform sampler2D tGlyphs;
      uniform vec2 uRes; uniform vec2 uCell; uniform float uTime; uniform float uAscii;
      uniform float uMix; uniform float uDim; uniform float uEncode; uniform vec3 uBg;
      uniform vec3 uMouse; uniform vec3 uTint;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      vec3 enc(vec3 c){ return uEncode > 0.5 ? pow(max(c, 0.0), vec3(1.0 / 2.2)) : c; }
      void main(){
        vec2 fc = gl_FragCoord.xy;
        vec3 raw = texture2D(tScene, fc / uRes).rgb;
        vec3 col = raw;
        if (uAscii > 0.5) {
          vec2 cell = floor(fc / uCell);
          vec2 origin = cell * uCell;
          vec3 best = vec3(0.0); float bl = 0.0; vec3 sum = vec3(0.0);
          for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
              vec3 c = texture2D(tScene, (origin + (vec2(float(i), float(j)) + 0.5) * uCell / 3.0) / uRes).rgb;
              float l = dot(c, vec3(0.299, 0.587, 0.114));
              sum += c;
              if (l > bl) { bl = l; best = c; }
            }
          }
          float avgL = dot(sum / 9.0, vec3(0.299, 0.587, 0.114));
          float lum = 1.0 - exp(-3.2 * (0.62 * bl + 0.38 * avgL));
          vec2 cc = origin + uCell * 0.5;
          float fl = uMouse.z * exp(-dot(cc - uMouse.xy, cc - uMouse.xy) / (2.0 * 9000.0 * uCell.x / 8.0));
          lum = clamp(lum + fl * (0.16 + 0.1 * hash(cell + floor(uTime * 6.0))), 0.0, 1.0);
          float gi = floor(lum * ${(GLYPHS.length - 1).toFixed(1)} + 0.5);
          vec2 local = fract(fc / uCell);
          float g = texture2D(tGlyphs, vec2((gi + local.x) / ${GLYPH_SLOTS.toFixed(1)}, local.y)).r;
          float mx = max(best.r, max(best.g, best.b));
          vec3 hue = mx > 0.001 ? best / mx : vec3(0.75, 0.7, 1.0);
          hue = mix(hue, uTint, fl * 0.7);
          col = hue * g * (0.38 + 0.9 * lum) + raw * uMix;
        }
        col *= uDim;
        col *= 0.93 + 0.07 * sin(fc.y * 3.14159);
        vec3 outc = enc(col) + (hash(fc + fract(uTime) * 91.0) - 0.5) * 0.03;
        gl_FragColor = vec4(max(outc, uBg), 1.0);
      }`,
  });
  const quadGeo = new THREE.BufferGeometry();
  quadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new THREE.Mesh(quadGeo, postMat);
  quad.frustumCulled = false;
  const postScene = new THREE.Scene();
  postScene.add(quad);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let cssW = 1, cssH = 1;
  function sizeTargets() {
    const pr = renderer.getPixelRatio();
    const bufW = Math.max(1, Math.floor(cssW * pr)), bufH = Math.max(1, Math.floor(cssH * pr));
    const scale = mode === 'ascii' ? 0.5 : 1;
    const w = Math.max(1, Math.floor(bufW * scale)), h = Math.max(1, Math.floor(bufH * scale));
    const wantSamples = mode === 'vector' && isGL2 ? 4 : 0;
    if ((rt.samples || 0) !== wantSamples && REV >= 138) {
      rt.dispose();
      rt = new THREE.WebGLRenderTarget(w, h, { ...rtOpts, samples: wantSamples });
      rt.texture.generateMipmaps = false;
      postUniforms.tScene.value = rt.texture;
    } else rt.setSize(w, h);
    postUniforms.uRes.value.set(bufW, bufH);
    postUniforms.uCell.value.set(cellCss[0] * pr, cellCss[1] * pr);
    pMat.uniforms.uPR.value = pr * (mode === 'ascii' ? 0.5 : 1);
  }

  /* ======================================================================
     STATE MACHINE
     ====================================================================== */
  const ORDER = ORDER_KEYS.map(k => sceneStates[k]);
  const target = cloneState(sceneStates.home);
  const current = cloneState(sceneStates.home);
  target.camOff = [0, 0, 27]; current.camOff = [0, 0, 27];

  let frame = { s: 0, anchors: [], projectsProgress: 0, workflow: 0, project: 0 };
  let highlighted = null, fovKick = 0;
  const ndc = [0, 0];
  const accentA = new THREE.Color().copy(pal.primary), accentB = new THREE.Color().copy(pal.secondary);
  const tA = new THREE.Color(), tB = new THREE.Color(), tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
  const projColor = new THREE.Color().copy(pal.primary), projTarget = new THREE.Color();
  let projWeight = 0, motionScale = isMobile ? 0.35 : 1;
  const offI = [0, 0, 0], offJ = [0, 0, 0], ndcI = [0, 0], ndcJ = [0, 0];

  function resolve(state, a, outOff, outNdc) {
    if (state.anchored && a && a.has) {
      const fovR = (state.fov * Math.PI) / 360;
      const d = clamp((state.frameRadius * cssH) / (2 * Math.max(40, a.r) * Math.tan(fovR)), 9, 64);
      const L = Math.hypot(...state.camDir) || 1;
      outOff[0] = (state.camDir[0] / L) * d; outOff[1] = (state.camDir[1] / L) * d; outOff[2] = (state.camDir[2] / L) * d;
      outNdc[0] = a.x; outNdc[1] = a.y;
    } else {
      outOff[0] = state.camOff[0]; outOff[1] = state.camOff[1]; outOff[2] = state.camOff[2];
      outNdc[0] = 0; outNdc[1] = 0;
    }
  }

  function computeTarget() {
    const s = clamp(reduced ? Math.round(frame.s) : frame.s, 0, ORDER.length - 1);
    const ti = clamp(Math.floor(s), 0, ORDER.length - 1);
    const tj = Math.min(ti + 1, ORDER.length - 1);
    // hold on the current section for the first ~40% of the way, then hand over smoothly
    const tt = ti === tj ? 0 : smooth(0.4, 0.97, s - ti);
    mixInto(target, ORDER[ti], ORDER[tj], tt);
    resolve(ORDER[ti], frame.anchors[ti], offI, ndcI);
    resolve(ORDER[tj], frame.anchors[tj], offJ, ndcJ);
    for (let k = 0; k < 3; k++) target.camOff[k] = lerp(offI[k], offJ[k], tt);
    ndc[0] = lerp(ndcI[0], ndcJ[0], tt); ndc[1] = lerp(ndcI[1], ndcJ[1], tt);
    tA.copy(pal[ORDER[ti].accent]).lerp(tmpC.copy(pal[ORDER[tj].accent]), tt);
    tB.copy(pal[ORDER[ti].accent2]).lerp(tmpC2.copy(pal[ORDER[tj].accent2]), tt);
    projWeight = clamp(1 - Math.abs(s - 3), 0, 1);
  }

  /* input */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, px: -9999, py: -9999, fl: 0, flT: 0 };
  on(window, 'pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    mouse.tx = (e.clientX / innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / innerHeight) * 2 - 1;
    mouse.px = e.clientX; mouse.py = e.clientY; mouse.flT = 1;
  }, { passive: true });
  on(document, 'pointerleave', () => { mouse.flT = 0; });

  /* scratch (no allocation in the loop) */
  const vCam = new THREE.Vector3(), vLook = new THREE.Vector3(), vAnchor = new THREE.Vector3(), vTmp = new THREE.Vector3(), vSum = new THREE.Vector3(), vW = new THREE.Vector3();
  let time = 0;
  const rotY = (out, x, y, z, a) => { const c = Math.cos(a), s = Math.sin(a); return out.set(x * c + z * s, y, -x * s + z * c); };

  function update(dt) {
    const f0 = getFrame();
    if (f0) frame = f0;
    computeTarget();
    time += dt;
    dampInto(current, target, reduced ? 1 : damp(6, dt));

    const mf = reduced ? 0 : damp(2.6, dt);
    mouse.x += (mouse.tx * motionScale - mouse.x) * mf;
    mouse.y += (mouse.ty * motionScale - mouse.y) * mf;
    mouse.fl += (mouse.flT - mouse.fl) * (reduced ? 0 : damp(3, dt));

    projTarget.copy(frame.project === 0 ? pal.primary : frame.project === 1 ? pal.secondary : pal.highlight);
    const cf = reduced ? 1 : damp(2.4, dt);
    projColor.lerp(projTarget, cf);
    tmpC.copy(tA).lerp(projColor, projWeight); accentA.lerp(tmpC, cf);
    tmpC2.copy(tB).lerp(projColor, projWeight * 0.5); accentB.lerp(tmpC2, cf);

    /* camera */
    const c = current;
    const pz = c.pivot[2] - c.travel * frame.projectsProgress * 30;
    rotY(vTmp, c.camOff[0], c.camOff[1], c.camOff[2], c.orbit);
    vCam.set(c.pivot[0] + vTmp.x, c.pivot[1] + vTmp.y, pz + vTmp.z);
    rotY(vTmp, c.lookOff[0], c.lookOff[1], c.lookOff[2], c.orbit);
    vLook.set(c.pivot[0] + vTmp.x, c.pivot[1] + vTmp.y, pz + vTmp.z);
    camera.position.set(vCam.x + mouse.x * 0.7, vCam.y - mouse.y * 0.45, vCam.z);
    camera.lookAt(vLook);
    const fov = c.fov + fovKick;
    if (Math.abs(camera.fov - fov) > 0.001 || camera.userData.dirty) { camera.fov = fov; camera.updateProjectionMatrix(); camera.userData.dirty = false; }
    fovKick *= reduced ? 0 : Math.exp(-4 * dt);
    // layout lock: shift the projection centre onto the DOM stage (undamped → no lag vs. the page)
    camera.projectionMatrix.elements[8] = -ndc[0];
    camera.projectionMatrix.elements[9] = -ndc[1];
    scene.fog.density = FOG_BASE * clamp(24 / Math.hypot(...c.camOff), 0.3, 1.15);

    /* core */
    anchor.position.set(...c.core);
    vAnchor.copy(anchor.position);
    core.scale.setScalar(c.coreScale);
    core.rotation.y = time * 0.16 + mouse.x * 0.35;
    core.rotation.x = Math.sin(time * 0.21) * 0.22 + mouse.y * 0.25;
    knot.rotation.z = -time * 0.35;
    icoOuter.rotation.y = -time * 0.08;
    const near = smooth(2.5, 8, camera.position.distanceTo(vAnchor));
    const alpha = c.coreOpacity * near;
    icoMat.opacity = 0.95 * alpha; icoMat.color.copy(accentA);
    icoOuterMat.opacity = 0.22 * alpha; icoOuterMat.color.copy(accentB);
    vertMat.opacity = 0.9 * alpha;
    knotMat.opacity = 0.4 * alpha; knotMat.color.copy(accentB);
    glowMat.opacity = c.glow * near * 0.75; glowMat.color.copy(accentA);
    glow.scale.setScalar(12 + c.coreScale * 4 + Math.sin(time * 1.3) * 0.4);

    /* rings */
    ringGroup.scale.setScalar(c.ringsScale);
    const stage = frame.workflow * 5;
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i], u = r.userData, spin = time * u.speed, al = c.ringsAlign;
      r.rotation.x = lerp(u.tiltX + spin, 0, al);
      r.rotation.y = lerp(u.tiltY + spin * 0.6, 0, al);
      r.rotation.z = time * 0.05 * (i % 2 ? 1 : -1);
      const vis = clamp(stage - i, 0, 1);
      r.material.opacity = lerp(c.ringsOpacity, 0.1 + vis * 0.85, c.workflowMode) * near;
      u.color.copy(i % 2 ? accentB : accentA);
      if (c.workflowMode > 0.5 && vis > 0 && stage - i < 1.25) u.color.lerp(pal.highlight, 0.85);
      if (al > 0.5) u.color.lerp(i % 2 ? pal.highlight : accentA, (al - 0.5) * 1.2);
      r.material.color.lerp(u.color, reduced ? 1 : damp(4, dt));
    }

    /* skill graph + labels */
    const nv = c.nodes;
    nodeGroup.visible = nv > 0.02;
    coreLabel.visible = nodeGroup.visible;
    if (nodeGroup.visible) {
      nodeGroup.scale.setScalar(0.4 + nv * 0.6);
      nodeGroup.rotation.y = time * 0.12 + mouse.x * 0.3;
      nodeGroup.rotation.x = 0.15 + mouse.y * 0.12;
      nodeLineMat.opacity = 0.5 * nv; nodeLineMat.color.copy(accentA);
      anchor.updateMatrixWorld(true);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.hl += ((highlighted === n.key ? 1 : 0) - n.hl) * (reduced ? 1 : damp(7, dt));
        n.mesh.scale.setScalar(1 + n.hl * 0.9 + Math.sin(time * 1.4 + i) * 0.05);
        n.mesh.rotation.y = time * 0.6 + i;
        n.mesh.material.opacity = nv;
        n.mesh.material.color.copy(pal.secondary).lerp(pal.highlight, n.hl);
        n.halo.material.opacity = (0.5 + n.hl * 0.5) * nv;
        n.halo.material.color.copy(pal.secondary).lerp(pal.highlight, n.hl);
        n.halo.scale.setScalar(2.2 + n.hl * 2.2);
        n.holder.getWorldPosition(vW);
        n.label.position.set(vW.x, vW.y + 1.25, vW.z);
        n.label.material.opacity = smooth(0.55, 0.95, nv) * (0.75 + n.hl * 0.25);
        n.label.visible = true;
      }
      coreLabel.position.set(vAnchor.x, vAnchor.y - 2.3, vAnchor.z);
      coreLabel.material.opacity = smooth(0.55, 0.95, nv) * 0.85;
    } else nodes.forEach(n => { n.label.visible = false; });

    /* fragments */
    const L = c.layout;
    const wSum = L.shell + L.orbit + L.corridor + L.ring || 1;
    const ws = L.shell / wSum, wo = L.orbit / wSum, wc = L.corridor / wSum, wr = L.ring / wSum;
    for (let i = 0; i < frags.length; i++) {
      const fr = frags[i];
      vSum.set(0, 0, 0);
      if (ws > 0.001) vSum.addScaledVector(vTmp.copy(fr.shellDir).multiplyScalar(fr.shellR * (0.7 + c.coreScale * 0.3) + Math.sin(time * 0.8 + i) * 0.15).add(vAnchor), ws);
      if (wo > 0.001) {
        const a = fr.orbitA + time * fr.orbitSpd;
        vSum.addScaledVector(vTmp.set(Math.cos(a) * fr.orbitR, Math.sin(a) * fr.orbitR * Math.sin(fr.orbitInc), Math.sin(a) * fr.orbitR * Math.cos(fr.orbitInc)).add(vAnchor), wo);
      }
      if (wc > 0.001) { vTmp.copy(fr.corridor); vTmp.y += Math.sin(time * 0.5 + i) * 0.25; vSum.addScaledVector(vTmp, wc); }
      if (wr > 0.001) { const a = fr.ringA + time * 0.06; vSum.addScaledVector(vTmp.set(Math.cos(a) * fr.ringR, Math.sin(a) * fr.ringR, fr.ringZ).add(vAnchor), wr); }
      fr.obj.position.copy(vSum);
      fr.obj.rotation.x += dt * fr.rotSpd;
      fr.obj.rotation.y += dt * fr.rotSpd * 0.7;
    }
    fragMats[0].color.copy(accentA);

    grid.position.z = Math.round(camera.position.z / GRID_STEP) * GRID_STEP;
    grid.position.x = Math.round(camera.position.x / GRID_STEP) * GRID_STEP;
    gridMats.forEach(m => { m.opacity = c.gridOpacity; });
    pMat.uniforms.uTime.value = time;
    pMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
    cLineMat.color.copy(accentA);

    const pr = renderer.getPixelRatio();
    postUniforms.uTime.value = time;
    postUniforms.uDim.value = c.dim * (cssW < 760 ? 0.85 : 1);
    postUniforms.uMouse.value.set(mouse.px * pr, (cssH - mouse.py) * pr, mouse.fl * (reduced ? 0 : 1));
  }

  function draw() {
    renderer.info.reset();
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
    if (nodeGroup.visible) {
      renderer.autoClear = false;
      renderer.render(overlay, camera);
      renderer.autoClear = true;
    }
  }

  /* loop + profiling */
  let raf = null, last = 0, running = false, paused = false, slowTime = 0, degraded = false;
  const prof = { on: false, upd: [], draw: [] };
  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - last) / 1000 || 0.016);
    last = now;
    if (!degraded) {
      slowTime = dt > 0.034 ? slowTime + dt : Math.max(0, slowTime - dt * 0.5);
      if (slowTime > 2.5) { degraded = true; dprCap = 1; resize(); } // adaptive quality
    }
    const t0 = performance.now();
    update(dt);
    const t1 = performance.now();
    draw();
    if (prof.on) { prof.upd.push(t1 - t0); prof.draw.push(performance.now() - t1); }
  }
  function start() { if (destroyed || running || reduced || paused || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
  function stop() { running = false; if (raf !== null) cancelAnimationFrame(raf); raf = null; }
  function renderOnce() { if (destroyed) return; update(0.016); draw(); }
  on(document, 'visibilitychange', () => { if (document.hidden) stop(); else start(); });

  function resize() {
    if (destroyed) return;
    cssW = canvas.clientWidth || innerWidth; cssH = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
    renderer.setSize(cssW, cssH, false);
    camera.aspect = cssW / cssH;
    camera.userData.dirty = true;
    motionScale = cssW < 760 ? 0.35 : 1;
    sizeTargets();
    if (!running) renderOnce();
  }
  let rT;
  on(window, 'resize', () => { clearTimeout(rT); rT = setTimeout(resize, 100); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
    if (destroyed) return;
    postUniforms.tGlyphs.value.dispose(); postUniforms.tGlyphs.value = makeGlyphAtlas();
    nodes.forEach(n => { const o = n.label.material.map; n.label.material.map = makeLabelTexture(n.text); n.label.material.needsUpdate = true; o.dispose(); });
    const o = coreLabel.material.map; coreLabel.material.map = makeLabelTexture('CORE'); coreLabel.material.needsUpdate = true; o.dispose();
    if (!running) renderOnce();
  }).catch(() => {});

  function snap() { computeTarget(); dampInto(current, target, 1); projColor.copy(projTarget); accentA.copy(tA); accentB.copy(tB); }

  resize();
  update(0.016); snap();
  if (reduced) renderOnce(); else start();

  /* ======================================================================
     API
     ====================================================================== */
  const api = {
    isLooping: () => running,
    refresh() { if (!running && !destroyed) { update(0.016); if (reduced) snap(); draw(); } },
    highlightSkill(key) { highlighted = key || null; if (!running) api.refresh(); },
    setPalette(name) {
      if (!PALETTES[name]) return false;
      paletteName = name; loadPalette(name); paintParticles();
      pGeo.attributes.aColor.needsUpdate = true;
      fragMats[1].color.copy(pal.secondary); fragMats[2].color.copy(pal.highlight);
      postUniforms.uTint.value.copy(pal.highlight);
      if (!running) api.refresh();
      return true;
    },
    setMode(m) {
      if (m !== 'ascii' && m !== 'vector') return false;
      mode = m; postUniforms.uAscii.value = m === 'ascii' ? 1 : 0; sizeTargets();
      if (!running) api.refresh();
      return true;
    },
    pulse() { if (!reduced) fovKick = 8; },
    setReducedMotion(v) { reduced = !!v; if (reduced) { stop(); snap(); renderOnce(); } else start(); },
    info() {
      return {
        mode, particles: P_COUNT, fragments: FRAG_COUNT, nodes: SKILL_NODES.length,
        pixelRatio: renderer.getPixelRatio(), drawCalls: renderer.info.render.calls,
        geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
        webgl: isGL2 ? 'WebGL2' : 'WebGL1', revision: REV, running,
      };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      clearTimeout(rT);
      listeners.forEach(([t, ev, fn, o]) => t.removeEventListener(ev, fn, o));
      const seen = new Set();
      const free = (x) => { if (x && !seen.has(x) && typeof x.dispose === 'function') { seen.add(x); x.dispose(); } };
      [scene, overlay, postScene].forEach(root => root.traverse(obj => {
        free(obj.geometry);
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => { if (m) { free(m.map); free(m); } });
      }));
      free(icoGeo); free(glowTex); free(postUniforms.tGlyphs.value); free(rt);
      renderer.dispose();
    },
    /* diagnostics used by tools/critic.py (read-only, no code-execution surface) */
    debug: {
      pause() { paused = true; stop(); },
      resume() { paused = false; start(); },
      settle() { update(0.016); snap(); update(0); draw(); },
      profile(enable) { prof.on = !!enable; if (enable) { prof.upd = []; prof.draw = []; } return { upd: prof.upd.slice(), draw: prof.draw.slice() }; },
      ndc: () => [ndc[0], ndc[1]],
      step(f, dt) {
        frame = f; const t0 = performance.now();
        computeTarget(); time += dt; dampInto(current, target, damp(6, dt));
        const c = current, pz = c.pivot[2] - c.travel * f.projectsProgress * 30;
        rotY(vTmp, c.camOff[0], c.camOff[1], c.camOff[2], c.orbit);
        return [c.pivot[0] + vTmp.x, c.pivot[1] + vTmp.y, pz + vTmp.z, c.fov, ndc[0], ndc[1], performance.now() - t0];
      },
    },
  };
  return api;
}


