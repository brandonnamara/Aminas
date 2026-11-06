/* Aminas — environment library viewer and exporter (Environment Phase 2).
   Renders catalog assets with the game's own camera angle and lighting standard (voxstyle LIGHT), so what is
   reviewed here is what the island shows. URL: ?cat=vegetation | ?id=oak | &lod=1 | &plate=1 (no toolbar, for art
   bible plates) | &cols=6 | &variants=0 (first variant only). window.LIB exposes buildAsset and the exporters. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { CATALOG, CATEGORIES, buildAsset, find } from '../src/3d/library/index.js';
import { LIGHT, HEIGHT_PX } from '../src/3d/voxstyle.js';

const q = new URLSearchParams(location.search), plate = q.get('plate') === '1';
if (plate) document.body.classList.add('plate');
const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.outputColorSpace = THREE.SRGBColorSpace;
R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap; R.setClearColor(q.get('bg') || '#eef3ea');
document.getElementById('stage').appendChild(R.domElement);
const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -400, 400);
const UP = new THREE.Vector3(-16, HEIGHT_PX, -16).normalize(), RIGHT = new THREE.Vector3(1, 0, -1).normalize(), BACK = new THREE.Vector3().crossVectors(RIGHT, UP).normalize(); cam.up.copy(UP);
scene.add(new THREE.HemisphereLight(LIGHT.sky, LIGHT.ground, LIGHT.hemi)); const sun = new THREE.DirectionalLight(LIGHT.sun, LIGHT.sunI); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3; sun.shadow.blurSamples = 8; scene.add(sun, sun.target);
const matSolid = new THREE.MeshLambertMaterial({ vertexColors: true }), matGlow = new THREE.MeshBasicMaterial({ vertexColors: true }), matBoard = new THREE.MeshLambertMaterial({ color: q.get('board') || '#cfdcc4' });
const root = new THREE.Group(); scene.add(root); const labels = [];

function entries() {
  if (q.get('id')) return q.get('id').split(',').map(find).filter(Boolean);
  const cat = q.get('cat') || 'vegetation', sub = q.get('sub'); return CATALOG.filter((e) => e.cat === cat && (!sub || e.sub === sub));
}
function layout() {
  root.clear(); labels.forEach((l) => l.el.remove()); labels.length = 0;
  const lod = document.getElementById('lod').checked || q.get('lod') === '1', allV = q.get('variants') !== '0', items = [];
  entries().forEach((e) => { const n = allV ? e.variants : 1; for (let v = 1; v <= n; v++) items.push({ e, v }); });
  const cols = +q.get('cols') || Math.max(2, Math.min(8, Math.ceil(Math.sqrt(items.length * 2.2))));
  // screen-aligned rows: columns run along screen-right, rows down the screen (the ground diagonal), with room for height
  const built = items.map((it) => ({ it, a: buildAsset(it.e, it.v) }));
  const wMax = Math.max(...items.map((i) => i.e.fp[0] + i.e.fp[1])) * 0.72 + 0.9, hMax = Math.max(...built.map((b) => (b.a.full.geo ? (b.a.full.geo.boundingBox.max.y - Math.min(0, b.a.full.geo.boundingBox.min.y)) : 1)));
  const DOWN = new THREE.Vector3(1, 0, 1).normalize(), colGap = wMax * 1.05, rowGap = Math.max(wMax * 0.9, (hMax * HEIGHT_PX / 22.63) + 1.4);
  let sx0 = 1e9, sx1 = -1e9, sy0 = 1e9, sy1 = -1e9; const centre = new THREE.Vector3();
  built.forEach(({ it, a }, i) => {
    const o = lod ? a.lod : a.full, g = new THREE.Group(), c = i % cols, r = Math.floor(i / cols), pos = new THREE.Vector3().addScaledVector(RIGHT, c * colGap).addScaledVector(DOWN, r * rowGap);
    if (o.geo) { const mm = new THREE.Mesh(o.geo, matSolid); mm.castShadow = mm.receiveShadow = true; g.add(mm); } if (o.glow) g.add(new THREE.Mesh(o.glow, matGlow));
    if (it.e.minY >= -2) { const board = new THREE.Mesh(new THREE.BoxGeometry(it.e.fp[0] + 0.5, 0.06, it.e.fp[1] + 0.5), matBoard); board.position.y = -0.03; board.receiveShadow = true; g.add(board); }
    g.position.copy(pos); root.add(g); centre.add(pos);
    const top = o.geo ? o.geo.boundingBox.max.y : 1, bot = Math.min(0, o.geo ? o.geo.boundingBox.min.y : 0);
    [pos.clone().addScaledVector(RIGHT, -wMax / 2), pos.clone().addScaledVector(RIGHT, wMax / 2), pos.clone().setY(top), pos.clone().setY(bot).addScaledVector(DOWN, 1)].forEach((p) => { const x = p.dot(RIGHT), y = p.dot(UP); sx0 = Math.min(sx0, x); sx1 = Math.max(sx1, x); sy0 = Math.min(sy0, y); sy1 = Math.max(sy1, y); });
    const el = document.createElement('div'); el.className = 'lab'; el.innerHTML = it.e.title + (it.e.variants > 1 ? ' · ' + it.v : '') + '<span class="st ' + it.e.status + '">' + it.e.status + '</span><small>' + a.stats.tris.toLocaleString() + ' tris · LOD ' + a.stats.lodTris.toLocaleString() + '</small>';
    document.body.appendChild(el); labels.push({ el, p: pos.clone().addScaledVector(DOWN, Math.max(it.e.fp[0], it.e.fp[1]) * 0.55 + 0.2).setY(Math.min(0, bot)), stats: a.stats, id: it.e.id, v: it.v });
  });
  centre.multiplyScalar(1 / Math.max(1, built.length));
  const span = Math.max(colGap * cols, rowGap * Math.ceil(built.length / cols)) + 4;
  sun.target.position.copy(centre); sun.position.set(centre.x + LIGHT.sunDir[0], LIGHT.sunDir[1], centre.z + LIGHT.sunDir[2]); Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 160 }); sun.shadow.camera.updateProjectionMatrix();
  fitBox(sx0, sx1, sy0 - 0.6, sy1 + 0.3); window.__items = labels.map((l) => ({ id: l.id, v: l.v, stats: l.stats }));
}
function fitBox(x0, x1, y0, y1) {
  const w = innerWidth, top = plate ? 0 : 40, h = innerHeight - top, k = Math.max((x1 - x0) / w, (y1 - y0) / h) * 1.04;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + (top / 2) * k, t = new THREE.Vector3().addScaledVector(RIGHT, cx).addScaledVector(UP, cy);
  cam.left = -w / 2 * k; cam.right = w / 2 * k; cam.top = innerHeight / 2 * k; cam.bottom = -innerHeight / 2 * k; cam.position.copy(t).addScaledVector(BACK, 150); cam.lookAt(t); cam.updateProjectionMatrix();
  R.setSize(w, innerHeight); render();
}
function render() { R.render(scene, cam); const W = innerWidth, Hh = innerHeight; labels.forEach((l) => { const p = l.p.clone().project(cam); l.el.style.left = ((p.x + 1) / 2 * W) + 'px'; l.el.style.top = ((1 - p.y) / 2 * Hh + 6) + 'px'; }); }
// toolbar
const cats = document.getElementById('cats'); CATEGORIES.forEach((c) => { const b = document.createElement('button'); b.textContent = c; if ((q.get('cat') || 'vegetation') === c && !q.get('id')) b.className = 'on'; b.onclick = () => { q.set('cat', c); q.delete('id'); location.search = q.toString(); }; cats.appendChild(b); });
document.getElementById('lod').onchange = layout; addEventListener('resize', layout);
layout(); window.__ready = true;

/* ---------------------------------------------------------------- export */
// glTF binary: one node per part (solid: PBR, rough, vertex colours; glow: unlit), 1 unit = 1 island cell
let GLTFExporter = null;
async function toGLB(e, v, lod) {
  if (!GLTFExporter) GLTFExporter = (await import('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/exporters/GLTFExporter.js/+esm')).GLTFExporter;
  const a = buildAsset(e, v), o = lod ? a.lod : a.full, s = new THREE.Scene(), grp = new THREE.Group(); grp.name = e.id + (e.variants > 1 ? '_' + v : '') + (lod ? '_lod1' : ''); s.add(grp);
  if (o.geo) { const m = new THREE.Mesh(o.geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, name: 'aminas_voxel' })); m.name = 'solid'; grp.add(m); }
  if (o.glow) { const m = new THREE.Mesh(o.glow, new THREE.MeshBasicMaterial({ vertexColors: true, name: 'aminas_glow' })); m.name = 'glow'; grp.add(m); }
  const buf = await new GLTFExporter().parseAsync(s, { binary: true }); return { buf, stats: a.stats };
}
// MagicaVoxel .vox (version 150): SIZE, XYZI, RGBA, and MATL emissive entries for glowing colours. MagicaVoxel is
// z-up, so our (x, y, z) is written as (x, z, y). One voxel = 1/8 cell.
function toVOX(e, v) {
  const a = buildAsset(e, v), m = a.model, grids = [[m.g, 0], [m.u, 0], [m.l, 1]], vox = [];
  let mnx = 1e9, mny = 1e9, mnz = 1e9, mxx = -1e9, mxy = -1e9, mxz = -1e9;
  grids.forEach(([g, glow]) => { for (let y = 0; y < g.ny; y++) for (let z = 0; z < g.nz; z++) for (let x = 0; x < g.nx; x++) { const c = g.d[(y * g.nz + z) * g.nx + x]; if (!c) continue; const X = x + g.x0, Y = y + g.y0, Z = z + g.z0; vox.push([X, Y, Z, c - 1, glow]); mnx = Math.min(mnx, X); mny = Math.min(mny, Y); mnz = Math.min(mnz, Z); mxx = Math.max(mxx, X); mxy = Math.max(mxy, Y); mxz = Math.max(mxz, Z); } });
  // palette: exact colours if they fit in 255, else round to fewer bits until they do
  let bits = 8, pal; for (;;) { const sh = 8 - bits, key = (c, gl) => (((c >> 16 & 255) >> sh) << 16 | ((c >> 8 & 255) >> sh) << 8 | ((c & 255) >> sh)) * 2 + gl; pal = new Map(); vox.forEach((t) => { const k = key(t[3], t[4]); if (!pal.has(k)) pal.set(k, { c: t[3], glow: t[4] }); t[5] = k; }); if (pal.size <= 255 || bits <= 4) break; bits--; }
  const keys = [...pal.keys()].slice(0, 255), idx = new Map(keys.map((k, i) => [k, i + 1]));
  const sx = mxx - mnx + 1, sy = mxz - mnz + 1, sz = mxy - mny + 1, parts = [];
  const i32 = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setInt32(0, n, true); return b; }, str = (s2) => { const t = new TextEncoder().encode(s2); return [i32(t.length), t]; };
  const chunk = (id, content, kids) => { const c = concat(content), k = concat(kids || []); return concat([new TextEncoder().encode(id), i32(c.length), i32(k.length), c, k]); };
  const concat = (arr) => { const n = arr.reduce((s2, x) => s2 + x.length, 0), o = new Uint8Array(n); let p = 0; arr.forEach((x) => { o.set(x, p); p += x.length; }); return o; };
  const xyzi = new Uint8Array(4 * vox.length); vox.forEach((t, i) => { xyzi.set([t[0] - mnx, t[2] - mnz, t[1] - mny, idx.get(t[5]) || 1], i * 4); });
  const rgba = new Uint8Array(1024); keys.forEach((k, i) => { const c = pal.get(k).c; rgba.set([c >> 16 & 255, c >> 8 & 255, c & 255, 255], i * 4); });
  const mats = keys.map((k, i) => (pal.get(k).glow ? chunk('MATL', [i32(i + 1), i32(2), ...str('_type'), ...str('_emit'), ...str('_emit'), ...str('0.8')]) : null)).filter(Boolean);
  const main = chunk('MAIN', [], [chunk('SIZE', [i32(sx), i32(sy), i32(sz)]), chunk('XYZI', [i32(vox.length), xyzi]), chunk('RGBA', [rgba]), ...mats]);
  return { buf: concat([new TextEncoder().encode('VOX '), i32(150), main]).buffer, size: [sx, sy, sz], colours: keys.length, bits, stats: a.stats };
}
window.LIB = { CATALOG: CATALOG.map((e) => ({ id: e.id, cat: e.cat, sub: e.sub, title: e.title, fp: e.fp, variants: e.variants, status: e.status, note: e.note || '' })), toGLB: async (id, v, lod) => { const r = await toGLB(find(id), v, lod); return { b64: b64(r.buf), stats: r.stats }; }, toVOX: (id, v) => { const r = toVOX(find(id), v); return { b64: b64(r.buf), size: r.size, colours: r.colours, bits: r.bits, stats: r.stats }; } };
function b64(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
