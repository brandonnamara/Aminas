/* Aminas — the voxel island (Environment Phase 1, ES module). Renders the island's terrain, scenery, buildings and
   natural obstacles as real 3D voxel geometry, underneath the existing 2D layer. The 2D layer keeps everything
   interactive (hit areas, bubbles, timers, labels, creatures, build-mode ghost and grid), so gameplay code does not
   change: this module only draws.

   The camera is an orthographic dimetric camera that matches the 2D isometric projection exactly
   (screen x = (x - y) * 32, screen y = (x + y) * 16 - height), so a building drawn here sits precisely under its
   2D hit area at every pan and zoom.

   Cost control: one mesh for all terrain, one for water, instanced meshes for every repeated model, one for all
   small details; shadows are drawn once per change, not every frame; the scene only redraws when the camera or the
   island changes, plus a slow ambient tick (water, swaying leaves, drifting clouds and motes) that stops at rest,
   in the background and in Battery saver. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { VoxGrid, meshGrid, mergeGeo, hash, pick } from './voxmesh.js';
import { PAL, TV, DV, UNIT_PX, HEIGHT_PX, MAGIC, LIGHT } from './voxstyle.js';
import * as VB from './voxbuild.js';
import * as MS from './modelslots.js'; // Phase 14: imported building models (empty slots load nothing)
import './library/vegetation.js'; import './library/terrain.js'; import './library/decor.js'; // Phase 2: library kinds used by the island

const A = window.A;
const COARSE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const AMBIENT_FPS = 12;
let R = null; // shared renderer (kept between visits to the island)
// Phase 3: graphics quality tier (A.Perf.tier in src/perf.js): pixel-ratio cap, shadow map, LOD rules
const FALLBACK_TIER = { id: COARSE ? 'balanced' : 'high', prCap: COARSE ? 1.5 : 2, shadowMap: COARSE ? 1024 : 2048, shadows: true, natureLod: false, buildingLod: false };
const tier = () => (A && A.Perf && A.Perf.tier ? A.Perf.tier() : FALLBACK_TIER);
const saver = () => !!(A && A.Perf && (A.Perf.saver() || A.Perf.forceTier === 'saver'));

// camera basis: screen-right = (1,0,-1)/√2, screen-up = (-16, 39.19, -16)/45.25, toward the viewer = r × u
const RIGHT = new THREE.Vector3(1, 0, -1).normalize(), UP = new THREE.Vector3(-16, HEIGHT_PX, -16).normalize();
const BACK = new THREE.Vector3().crossVectors(RIGHT, UP).normalize();
/* Phase 14 finalisation: the island's camera never turns (it pans and zooms only), so from the front it only ever
   sees faces turned toward BACK. Everything solid on the island is drawn twice from now on, at no cost in draw calls
   on screen: a "view" copy holding only the faces the camera can see (about half), drawn by the camera; and the full
   model, kept on layer 1, which only the sun's shadow camera draws (shadows are drawn once per change, not per
   frame). What the player sees is pixel-for-pixel the same; the GPU processes about half the triangles per frame. */
const SHADOW_LAYER = 1, viewCache = new Map();
// the faces of `geo` that face `dir` (a direction in the geometry's own frame); kept geometry shares its attributes
function facing(geo, dir, key, margin) {
  if (!geo || !geo.index) return geo; const k = key || geo.uuid + '|' + (dir === DOWN_ONLY ? 'down' : dir.x.toFixed(3) + ',' + dir.z.toFixed(3)); let g = viewCache.get(k); if (g) return g;
  const p = geo.attributes.position, ix = geo.index.array, keep = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = margin || 0;
  for (let i = 0; i < ix.length; i += 3) { a.fromBufferAttribute(p, ix[i]); b.fromBufferAttribute(p, ix[i + 1]).sub(a); c.fromBufferAttribute(p, ix[i + 2]).sub(a); const n = b.cross(c); const l = n.length(); if (l > 0 && (dir === DOWN_ONLY ? n.y / l > -0.5 : n.dot(dir) / l > -m)) keep.push(ix[i], ix[i + 1], ix[i + 2]); }
  g = new THREE.BufferGeometry(); Object.keys(geo.attributes).forEach((n) => g.setAttribute(n, geo.attributes[n])); g.setIndex(keep.length && Math.max(...keep.slice(0, 1)) >= 0 && p.count > 65535 ? new THREE.Uint32BufferAttribute(keep, 1) : new THREE.Uint16BufferAttribute(keep, 1));
  g.boundingBox = geo.boundingBox; g.boundingSphere = geo.boundingSphere; if (!g.boundingSphere) g.computeBoundingSphere(); g.userData.view = true; if (!/^terrain\|/.test(k)) viewCache.set(k, g); return g;
}
// BACK seen from an object turned by `ry` about the vertical
const backFor = (ry) => new THREE.Vector3().copy(BACK).applyAxisAngle(new THREE.Vector3(0, 1, 0), -(ry || 0));
const DOWN_ONLY = new THREE.Vector3(0, 1e-3, 0); // keeps every face that does not point down (seen from some quarter turn)
const quarter = (ry) => (((Math.round((ry || 0) / (Math.PI / 2)) % 4) + 4) % 4);
// a 2D world point (px, at ground height 0) to 3D
const fromIso = (wx, wy) => { const a = wx / 32, b = wy / 16; return new THREE.Vector3((a + b) / 2, 0, (b - a) / 2); };

/* ------------------------------------------------------------------ terrain */
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s), u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }

// Phase 14 finalisation: detail blocks on the exposed cliff faces that face the camera (+X and +Z). Pure function of
// the terrain grid, so it is the same every time. Returns { list, glow } of [x, y, z, sx, sy, sz, colour] in world units.
function cliffSkin(t, TVs, DVs) {
  const list = [], glow = [], g = t.g, k = TVs / DVs; // detail blocks per terrain voxel (4)
  const solid = (X, Y, Z) => g.get(X, Y, Z) !== 0;
  t.colAt.forEach((v, key) => {
    const [X, Z] = key.split(',').map(Number), top = v.top, kind = v.c.kind; if (kind === 'water' || top <= v.bot) return;
    [[1, 0], [0, 1]].forEach(([dx, dz]) => {
      for (let Y = top - 1; Y >= Math.max(v.bot, top - 16); Y--) { // the upper cliff only: lower down the haze hides fine detail
        if (!solid(X, Y, Z) || solid(X + dx, Y, Z + dz)) continue;           // only a face open to the air
        const d = top - 1 - Y, fx = (X + dx) * TVs, fz = (Z + dz) * TVs, y0 = Y * TVs, hh = (a) => hash(X * 7 + a, Y * 13 + Z * 3, 140 + dx);
        const col = (pal, a) => pick(pal, hh(a));
        // place a block on the face: u along the face (0..k-1), w up the face (0..k-1), out = how far it stands proud
        const put = (u, w, out, sx, sy, c, arr) => { sx = Math.max(1, Math.min(sx, k - u)); const along = u * DVs, up = y0 + w * DVs;
          (arr || list).push(dx ? [fx, up, Z * TVs + along, out, sy, sx, c] : [X * TVs + along, up, fz, sx, sy, out, c]); };
        if (d <= 1) { // under the grass lip: a moss drape the width of the face, ragged at the bottom, and now and then a root
          if (hh(1) < 0.7) { put(0, k - 1, 1, k, 1, col(PAL.moss, 4)); const u = Math.floor(hh(2) * k); put(u, k - 3, 1, 1, 2, col(PAL.moss, 3)); }
          if (hh(5) < 0.14) { const u = Math.floor(hh(6) * k), n = 3 + Math.floor(hh(7) * 4); put(u, k - 1 - n, 1, 1, n, PAL.woodDark[0]); put(u, k - 2 - n, 1, 1, 1, PAL.leaf[0]); }
          continue; }
        // strata: on every other voxel row, a ledge the width of the face standing one block proud, with a thin line
        // of shadow beneath it, so the rock reads as layers; now and then the ledge is broken
        // (in the rock's own colour: a lighter lip catching the sun, a darker line under it)
        const lineRow = (Y + 200) % 2 === 0, own = new THREE.Color().setHex(g.get(X, Y, Z) - 1, THREE.SRGBColorSpace);
        if (d >= 3 && lineRow && hh(8) < 0.75) { const u = hh(9) < 0.3 ? Math.floor(hh(10) * 2) : 0, n = k - u - (hh(11) < 0.25 ? 1 : 0); put(u, k - 1, 1, n, 1, own.clone().multiplyScalar(1.22)); put(u, k - 2, 0.3, n, 1, own.clone().multiplyScalar(0.62)); }
        // a larger stone set into the face, now and then
        if (d >= 3 && hh(14) < 0.15) { const w2 = 1 + Math.floor(hh(15) * 2); put(Math.floor(hh(16) * (k - 1)), Math.floor(hh(17) * (k - 2)), 1, w2, w2, own.clone().multiplyScalar(hh(18) < 0.5 ? 1.15 : 0.78)); }
        // damp moss down the upper face
        if (d < 8 && vnoise(X * 0.4 + Y * 0.2, Z * 0.4, 13) > 0.62 && hh(22) < 0.7) put(Math.floor(hh(23) * (k - 1)), Math.floor(hh(24) * k), 1, 2, 1, col(PAL.moss, 26));
        // the World Resonance: a rare cold glint of crystal deep in the stone (a hint, never a feature)
        if (d > 7 && hh(27) < 0.03) { const u = Math.floor(hh(28) * (k - 1)), w = Math.floor(hh(29) * (k - 2)); put(u, w, 1, 1, 2, MAGIC.spirit, glow); put(u + 1, w, 1, 1, 1, '#ffffff', glow); }
      }
    });
  });
  return { list: list.concat(glow), glow: [] }; // Phase 14: the glints are drawn in the same mesh (one draw call), bright enough to read as crystal
}
export function buildTerrain(cols, avoid) { // exported for Hide and Seek (src/3d/hideseek3d.js); unchanged
  const V = 1 / TV; // voxels per cell (2)
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, maxY = 0;
  const vy = (px) => Math.round(px / HEIGHT_PX / TV);
  cols.forEach((c) => { minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x); minZ = Math.min(minZ, c.y); maxZ = Math.max(maxZ, c.y); maxY = Math.max(maxY, vy(c.top) + 2); });
  const water = [];
  const grassy = (k) => k === 'grass' || k === 'hill' || k === 'ledge' || k === 'chunk';
  const main = (k) => k !== 'ledge' && k !== 'chunk';
  // first pass: column extents per sub-voxel
  const colAt = new Map();
  cols.forEach((c) => {
    for (let sz = 0; sz < V; sz++) for (let sx = 0; sx < V; sx++) {
      const X = c.x * V + sx, Z = c.y * V + sz;
      let top = c.kind === 'water' ? -1 : vy(c.top), bot = vy(c.bot) + Math.round((hash(X, Z, 7) - 0.5) * 2);
      if (c.kind === 'ledge' || c.kind === 'chunk') bot += Math.round(hash(X, Z, 8) * 2);
      colAt.set(X + ',' + Z, { c, top, bot });
    }
  });
  // distance (in voxels) from the main island's rim, so the underside tapers into a hanging rock root
  const dist = new Map(), q = [];
  colAt.forEach((v, k) => { if (!main(v.c.kind)) return; const [X, Z] = k.split(',').map(Number); if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => { const n = colAt.get((X + dx) + ',' + (Z + dz)); return !n || !main(n.c.kind); })) { dist.set(k, 0); q.push(k); } });
  for (let i = 0; i < q.length; i++) { const k = q[i], [X, Z] = k.split(',').map(Number), d = dist.get(k); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { const nk = (X + dx) + ',' + (Z + dz), n = colAt.get(nk); if (n && main(n.c.kind) && !dist.has(nk)) { dist.set(nk, d + 1); q.push(nk); } }); }
  let minY = 0;
  colAt.forEach((v, k) => {
    const d = dist.get(k); if (d == null) { minY = Math.min(minY, v.bot - 5); return; }
    const [X, Z] = k.split(',').map(Number), n = vnoise(X * 0.16, Z * 0.16, 9);
    // the root: deeper towards the middle, lumpy, with a few long spires hanging from it
    v.bot = Math.min(v.bot, -4 - Math.floor(Math.min(d, 26) * (0.55 + n * 0.55)) - Math.round(vnoise(X * 0.5, Z * 0.5, 10) * 3));
    if (d > 3 && hash(X, Z, 57) < 0.05) v.bot -= 3 + Math.floor(hash(X, Z, 58) * 6);
    v.bot = Math.max(v.bot, -44); minY = Math.min(minY, v.bot - 6);
  });
  const g = new VoxGrid((minX - 2) * V, minY, (minZ - 2) * V, (maxX - minX + 5) * V, maxY - minY + 2, (maxZ - minZ + 5) * V);
  const exposed = (X, Z, y) => { const n = colAt.get(X + ',' + Z); return !n || y >= n.top || y < n.bot; };
  colAt.forEach((v, k) => {
    const [X, Z] = k.split(',').map(Number), { c, top, bot } = v, kind = c.kind;
    const edge = exposed(X + 1, Z, top - 1) || exposed(X - 1, Z, top - 1) || exposed(X, Z + 1, top - 1) || exposed(X, Z - 1, top - 1);
    const vine = edge && hash(X, Z, 31) < 0.26, vineLen = 2 + Math.floor(hash(X, Z, 32) * 7), vineCol = hash(X, Z, 33) < 0.5 ? PAL.moss : PAL.leaf;
    const drape = edge && grassy(kind) ? 1 + Math.floor(hash(X, Z, 34) * 2.6) : 0; // grass hanging over the rim
    const dirtD = 2 + (vnoise(X * 0.3, Z * 0.3, 12) > 0.55 ? 1 : 0);
    for (let y = bot; y < top; y++) {
      const d = top - 1 - y; let col;
      const h = hash(X * 3 + y, Z * 5 - y, 11);
      if (d === 0) {
        if (grassy(kind) && !(kind === 'ledge' && c.top < -24)) { const t = vnoise(X * 0.35, Z * 0.35, 3); col = h < 0.06 ? PAL.grass[4] : t < 0.38 ? PAL.grass[1] : t < 0.62 ? PAL.grass[0] : t < 0.8 ? PAL.grass[2] : PAL.grass[3];
          // Phase 4: broad meadow moods on top of the fine mix: lush, deeper green hollows and sun-warmed open swards
          const m = vnoise(X * 0.09, Z * 0.09, 21); if (m > 0.7 && h < 0.55) col = h < 0.25 ? PAL.grassDark[0] : PAL.grass[3]; else if (m < 0.24 && h < 0.5) col = h < 0.2 ? PAL.grass[4] : PAL.grass[2]; }
        else if (kind === 'sand') col = pick(PAL.sand, h);
        else if (kind === 'path') col = hash(X, Z, 41) < 0.2 ? pick(PAL.pathStone, h) : pick(PAL.path, h);
        else if (kind === 'plaza') col = PAL.plaza[(c.x + c.y) % 2];
        else if (kind === 'water') col = pick(PAL.bed, h);
        else col = pick(PAL.stone, h);
      } else if (d <= drape) col = pick(PAL.grassSide, h);
      else if (d === 1 && kind === 'sand') col = pick(PAL.sand, h);
      else if (d <= dirtD) col = d === dirtD && h < 0.35 ? pick(PAL.clay, h) : pick(PAL.dirt, h);
      else {
        // strata: warm earth bands near the top, coursed stone in the middle, cool slate in the hanging root
        const w = vnoise(X * 0.18, Z * 0.18, 5), band = Math.floor((y + w * 4) / 2);
        if (y >= -5) col = band % 3 === 0 ? pick(PAL.stone, h) : band % 3 === 1 ? pick(PAL.clay, h) : pick(PAL.dirt, h);
        else if (y >= -12) col = band % 4 === 0 ? pick(PAL.clay, h) : h < 0.07 ? pick(PAL.stoneDark, h * 10) : pick(PAL.stone, h);
        else if (y >= -20) col = band % 5 === 0 ? pick(PAL.stone, h) : h < 0.08 ? pick(PAL.stoneDark, h * 10) : pick(PAL.deep, h);
        else col = band % 4 === 0 ? pick(PAL.deep, h) : pick(PAL.deepLow, h);
        if (y === bot) col = pick(PAL.deepLow, h);
        // moss creeps down the stone on shaded, damp faces
        if (y > -9 && edge && vnoise(X * 0.4 + y * 0.2, Z * 0.4, 13) > 0.72) col = pick(PAL.moss, h);
      }
      if (vine && d >= 1 && d <= vineLen) col = pick(vineCol, h);
      g.set(X, y, Z, col);
    }
    if (kind === 'water') water.push([X, Z]);
    // stalactites under the island and a few hanging roots near the rim
    if (hash(X, Z, 51) < 0.3) { const n = 1 + Math.floor(hash(X, Z, 52) * 3); for (let i = 1; i <= n; i++) g.set(X, bot - i, Z, pick(PAL.deepLow, hash(X, i, 53))); }
    else if (dist.get(k) === 1 && hash(X, Z, 54) < 0.12) { const n = 2 + Math.floor(hash(X, Z, 55) * 4); for (let i = 1; i <= n; i++) g.set(X, bot - i, Z, i === n ? PAL.leaf[0] : PAL.woodDark[i % 2]); }
    // irregular rock formations bulging out of the cliff faces: small clusters, 1-3 voxels deep
    if (edge && hash(X, Z, 61) < 0.09 && top - bot > 6) {
      const y0 = top - 3 - Math.floor(hash(X, Z, 62) * Math.min(14, top - bot - 5)), hgt = 1 + Math.floor(hash(X, Z, 66) * 3);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { if (colAt.has((X + dx) + ',' + (Z + dz))) return; for (let yy = 0; yy < hgt; yy++) { g.set(X + dx, y0 - yy, Z + dz, pick(yy === 0 ? PAL.rock : PAL.stone, hash(X, Z + yy, 63))); if (yy === 0 && hash(X, Z, 67) < 0.4) g.set(X + dx, y0 + 1, Z + dz, pick(PAL.moss, hash(X, Z, 68))); } if (hash(X, Z, 64) > 0.55) g.set(X + 2 * dx, y0, Z + 2 * dz, pick(PAL.rockDark, 0.5)); });
    }
  });
  // waterfalls: springs on the two cliff faces that face the camera
  const falls = [];
  const cand = (sx, sz) => { let best = null; colAt.forEach((v, k) => { if (!main(v.c.kind) || v.c.kind === 'path' || v.top < 0) return; const [X, Z] = k.split(',').map(Number); if (X % 2 || Z % 2) return; // align to a cell
      if ((avoid || []).some(([ax, az]) => Math.abs(X / 2 - ax) + Math.abs(Z / 2 - az) < 7)) return; // keep clear of the jetty, so the fall is not hidden behind it
      for (let i = 0; i < 2; i++) { if (!colAt.has((X + (sx ? 1 : i)) + ',' + (Z + (sz ? 1 : i)))) return; if (colAt.has((X + (sx ? 2 : i)) + ',' + (Z + (sz ? 2 : i)))) return; if (colAt.has((X + (sx ? 3 : i)) + ',' + (Z + (sz ? 3 : i)))) return; }
      if (!colAt.has((X - sz) + ',' + (Z - sx)) || !colAt.has((X + 2 * sz) + ',' + (Z + 2 * sx))) return; // a straight stretch of cliff
      const mid = sx ? (minZ + maxZ) : (minX + maxX), along = sx ? Z : X, sc = -Math.abs(along - mid + 10) / 20 + hash(X, Z, 71) * 0.25 + (v.c.kind === 'sand' ? -0.3 : 0); if (!best || sc > best.sc) best = { sc, X, Z, v }; }); return best; };
  [[1, 0], [0, 1]].forEach(([sx, sz]) => { const b = cand(sx, sz); if (!b) return;
    const y0 = b.v.top - 3; // the spring: a dark mouth with a mossy stone lip, two voxels below the rim
    for (let i = 0; i < 2; i++) { const X = b.X + sz * i + (sx > 0 ? 1 : 0), Z = b.Z + sx * i + (sz > 0 ? 1 : 0); g.set(X, y0, Z, '#3f4a52'); g.set(X, y0 + 1, Z, '#3f4a52'); g.set(X + sx, y0 - 1, Z + sz, pick(PAL.rock, hash(X, Z, 72))); g.set(X + sx, y0 - 2, Z + sz, pick(PAL.moss, hash(X, Z, 73)));
      for (let y = y0 - 3; y > y0 - 12; y--) if (g.get(X, y, Z)) g.set(X, y, Z, pick(PAL.moss, hash(X, y, 74))); }
    const lowest = Math.min(...[0, 1].map((i) => { const c2 = colAt.get((b.X + sz * i + (sx > 0 ? 1 : 0)) + ',' + (b.Z + sx * i + (sz > 0 ? 1 : 0))); return c2 ? c2.bot : -10; }));
    falls.push({ sx, sz, x: (b.X + (sx > 0 ? 3 : 0)) * TV, z: (b.Z + (sz > 0 ? 3 : 0)) * TV, y0: (y0 + 0.4) * TV, y1: (lowest - 10) * TV, w: 2 * TV });
  });
  return { g, water, colAt, falls, bounds: { minX, maxX, minZ, maxZ } };
}

/* ------------------------------------------------------------------ distant islands (Phase 1.2) */
// Small voxel islands floating in the distance: grass cap, earth, a tapering rock root, a tree or two, and on some
// a broken tower or a thread of falling water. Their colours are baked part-way towards the sky haze so they read
// as far away, and the group pans more slowly than the island (parallax). One mesh each, no shadows.
const HAZE = new THREE.Color('#bfe0f6');
function farIslet(seed, r, opt) {
  const R0 = Math.ceil(r) + 2, g = new VoxGrid(-R0, -Math.ceil(r * 2.6) - 2, -R0, R0 * 2 + 1, Math.ceil(r * 2.6) + 14, R0 * 2 + 1);
  for (let z = -R0; z <= R0; z++) for (let x = -R0; x <= R0; x++) {
    const d = Math.hypot(x, z) / (r * (0.85 + vnoise(x * 0.5 + seed, z * 0.5, 31) * 0.3)); if (d > 1) continue;
    const depth = Math.max(1, Math.round((1 - d) * r * 1.5 + vnoise(x * 0.7, z * 0.7 + seed, 32) * 2));
    for (let y = -depth; y < 1; y++) { const h = hash(x + seed, z * 3 + y, 33); g.set(x, y, z, y === 0 ? pick(PAL.grass, h) : y === -1 ? (d > 0.8 ? pick(PAL.grassSide, h) : pick(PAL.dirt, h)) : y > -3 ? pick(PAL.dirt.concat(PAL.clay), h) : y > -depth + 1 ? pick(PAL.stone, h) : pick(PAL.deepLow, h)); }
  }
  const trees = opt.trees == null ? 1 + Math.floor(hash(seed, 1, 34) * 2) : opt.trees;
  for (let i = 0; i < trees; i++) { const tx = Math.round((hash(seed, i, 35) - 0.5) * r), tz = Math.round((hash(seed, i, 36) - 0.5) * r), th = 2 + Math.floor(hash(seed, i, 37) * 2), pine = hash(seed, i, 38) < 0.5;
    for (let y = 1; y <= th; y++) g.set(tx, y, tz, PAL.woodDark[0]);
    for (let y = 0; y < (pine ? 4 : 3); y++) { const rr = pine ? 2 - Math.floor(y / 2) : y === 1 ? 2 : 1; for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) if (Math.abs(dx) + Math.abs(dz) <= rr + (pine ? 0 : 1)) g.set(tx + dx, th + 1 + y, tz + dz, pick(pine ? PAL.pine : PAL.leaf, hash(dx, dz + y, seed))); } }
  if (opt.tower) { const tx = -Math.round(r * 0.3), tz = Math.round(r * 0.2); for (let y = 1; y < 7; y++) for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) if (y < 5 || hash(dx, y, dz + seed) > 0.4) g.set(tx + dx, y, tz + dz, pick(PAL.stone, hash(dx + y, dz, seed))); }
  if (opt.fall) { const fx = Math.round(r * 0.75), fz = 0; for (let y = 0; y > -Math.ceil(r * 2.6) - 1; y--) { g.set(fx + 1, y, fz, y % 3 ? '#bfe8ff' : '#f2fbff'); } }
  const geo = meshGrid(g, { size: opt.size || 0.5 }), c = geo.attributes.color, k = opt.haze == null ? 0.42 : opt.haze, tmp = new THREE.Color(); const linHaze = HAZE.clone(); // colours are linear in the buffer
  for (let i = 0; i < c.count; i++) { tmp.setRGB(c.getX(i), c.getY(i), c.getZ(i)).lerp(linHaze, k); c.setXYZ(i, tmp.r, tmp.g, tmp.b); }
  return geo;
}
// where they float, in island-centred screen px at zoom 1 (x right, y down), their size, haze and parallax
const FAR = [
  { sx: -820, sy: -330, r: 5, s: 0.5, k: 0.45, trees: 2 }, { sx: -520, sy: -470, r: 3.5, s: 0.34, k: 0.6, tower: true },
  { sx: 600, sy: -480, r: 4.5, s: 0.4, k: 0.55, fall: true }, { sx: 930, sy: -330, r: 3.5, s: 0.34, k: 0.6, trees: 1 },
  { sx: -930, sy: 260, r: 3.5, s: 0.45, k: 0.45, fall: true }, { sx: 880, sy: 340, r: 3, s: 0.36, k: 0.5, tower: true, trees: 0 },
];

/* ------------------------------------------------------------------ the scene */
export function createIsland() {
  if (!R) {
    R = new THREE.WebGLRenderer({ antialias: !COARSE, alpha: true, stencil: true, powerPreference: 'default' });
    R.setClearColor(0x000000, 0); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping; R.toneMappingExposure = LIGHT.exposure || 1; // Phase 4 grade
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap; R.shadowMap.autoUpdate = false;
    R.domElement.className = 'vox3d';
  }
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 200);
  camera.up.copy(UP);
  // Phase 1.1 light: warmer, brighter sun and a stronger sky fill so shadows stay soft and colourful, never murky
  const hemi = new THREE.HemisphereLight(LIGHT.sky, LIGHT.ground, LIGHT.hemi); scene.add(hemi);
  const sun = new THREE.DirectionalLight(LIGHT.sun, LIGHT.sunI); sun.castShadow = true; sun.shadow.camera.layers.enable(SHADOW_LAYER);
  sun.shadow.mapSize.set(tier().shadowMap, tier().shadowMap); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3; sun.shadow.blurSamples = 10;
  scene.add(sun); scene.add(sun.target);
  const groups = { terrain: new THREE.Group(), things: new THREE.Group(), fx: new THREE.Group() };
  const farGroup = new THREE.Group(); scene.add(farGroup); let farBase = null;
  Object.values(groups).forEach((g) => scene.add(g));
  const matSolid = new THREE.MeshLambertMaterial({ vertexColors: true }), matGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
  // Phase 4: aerial depth. The island's own terrain fades towards the sky haze as it hangs lower (the rock root, the
  // stalactites), so the island reads as floating high in bright air rather than ending in a dark block.
  const matTerrain = new THREE.MeshLambertMaterial({ vertexColors: true });
  matTerrain.onBeforeCompile = (sh) => {
    sh.uniforms.uHaze = { value: new THREE.Color(LIGHT.depthHaze) }; sh.uniforms.uDepth = { value: new THREE.Vector3(LIGHT.depthFrom, LIGHT.depthTo, LIGHT.depthMax) };
    sh.vertexShader = 'varying float vWy;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWy = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = 'uniform vec3 uHaze; uniform vec3 uDepth; varying float vWy;\n' + sh.fragmentShader.replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, smoothstep(uDepth.x, uDepth.y, vWy) * uDepth.z);\n#include <tonemapping_fragment>');
  };
  const matMist = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false });
  const matMistLow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false }); // Phase 14: the thinning spray below each fall
  // Phase 14 finalisation: the cliff skin's blocks (+X, +Y, +Z faces only: the fixed camera never sees the others),
  // with the terrain's aerial haze (the same uniforms, worked out per instance)
  const skinBox = new THREE.BoxGeometry(DV, DV, DV); skinBox.translate(DV / 2, DV / 2, DV / 2); { const ix = Array.from(skinBox.index.array); skinBox.setIndex(ix.slice(0, 6).concat(ix.slice(12, 18), ix.slice(24, 30))); skinBox.clearGroups(); }
  const hazed = (m) => { m.onBeforeCompile = (sh) => { sh.uniforms.uHaze = { value: new THREE.Color(LIGHT.depthHaze) }; sh.uniforms.uDepth = { value: new THREE.Vector3(LIGHT.depthFrom, LIGHT.depthTo, LIGHT.depthMax) };
    sh.vertexShader = 'varying float vWy;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvec4 wpH = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwpH = instanceMatrix * wpH;\n#endif\nvWy = (modelMatrix * wpH).y;');
    sh.fragmentShader = 'uniform vec3 uHaze; uniform vec3 uDepth; varying float vWy;\n' + sh.fragmentShader.replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, smoothstep(uDepth.x, uDepth.y, vWy) * uDepth.z);\n#include <tonemapping_fragment>'); }; return m; };
  const matSkin = hazed(new THREE.MeshLambertMaterial()), matSkinGlow = new THREE.MeshBasicMaterial(); let skinMesh = null;
  const uni = { uTime: { value: 0 } };
  // leaves sway a little (a vertex nudge proportional to height inside each tree instance)
  const matSway = new THREE.MeshLambertMaterial({ vertexColors: true });
  matSway.onBeforeCompile = (sh) => { sh.uniforms.uTime = uni.uTime; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;\n#else\nfloat ph = 0.0;\n#endif\nfloat k = max(0.0, position.y - 0.6) * 0.035;\ntransformed.x += sin(uTime * 1.3 + ph) * k;\ntransformed.z += cos(uTime * 1.1 + ph) * k * 0.6;'); };
  let state = { iid: null, key: null, built: false, view: null, dirty: true, shadowDirty: true, things: new Map(), sig: '' };
  let terr = null, waterMesh = null, detail = null, motes = null, sparks = null, clouds = [];
  const disposables = [];

  const cost = { terrainMs: 0, syncMs: 0 };
  function setTerrain(iid, key, cols, extras) { const c0 = performance.now(); try { return setTerrain0(iid, key, cols, extras); } finally { cost.terrainMs = +(performance.now() - c0).toFixed(1); } }
  function setTerrain0(iid, key, cols, extras) {
    if (state.key === key && terr) return;
    clearGroup(groups.terrain); clouds = [];
    const t = buildTerrain(cols, (extras || []).filter((e) => e.kind === 'jetty' || e.kind === 'skiff').map((e) => [e.x, e.z])); terr = t;
    const geo = meshGrid(t.g, { size: TV, shadeFaces: false }); disposables.push(geo);
    const m = new THREE.Mesh(facing(geo, BACK, 'terrain|' + key), matTerrain); m.receiveShadow = true; groups.terrain.add(m); disposables.push(m.geometry);
    const ms = new THREE.Mesh(geo, matTerrain); ms.castShadow = true; ms.layers.set(SHADOW_LAYER); ms.userData.shadowOnly = true; groups.terrain.add(ms);
    // Phase 14 finalisation: the cliff skin. The terrain's blocks are half a cell, which reads as flat slabs once the
    // camera is close. On the two cliff faces the camera sees, a skin of detail-sized blocks breaks them up: stones
    // standing proud along the strata, darker pebbles set in the earth, moss clumps and roots under the grass lip,
    // and, deep in the stone, a rare cold glint of crystal. Instanced like the meadow detail (only the three faces
    // the camera sees), no shadows, and the same aerial haze as the rock it sits on.
    { const sk = cliffSkin(t, TV, DV); if (sk.list.length) { const im = new THREE.InstancedMesh(skinBox, matSkin, sk.list.length), mm = new THREE.Matrix4(), cc = new THREE.Color();
      sk.list.forEach(([x, y, z, sx, sy, sz, col], i) => { mm.makeScale(sx, sy, sz).setPosition(x, y, z); im.setMatrixAt(i, mm); im.setColorAt(i, cc.set(col)); }); im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.receiveShadow = true; im.computeBoundingSphere(); im.userData.skin = sk.list.length; groups.terrain.add(im); skinMesh = im;
      if (sk.glow.length) { const ig = new THREE.InstancedMesh(skinBox, matSkinGlow, sk.glow.length); sk.glow.forEach(([x, y, z, sx, sy, sz, col], i) => { mm.makeScale(sx, sy, sz).setPosition(x, y, z); ig.setMatrixAt(i, mm); ig.setColorAt(i, cc.set(col)); }); ig.instanceMatrix.needsUpdate = true; ig.instanceColor.needsUpdate = true; ig.computeBoundingSphere(); groups.terrain.add(ig); } } }
    // water: subdivided quads that ripple (vertex shader) with a sheen
    if (t.water.length) {
      const pos = [], idx = []; let n = 0;
      t.water.forEach(([X, Z]) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x = X * TV + i * TV / 2, z = Z * TV + j * TV / 2, s = TV / 2; pos.push(x, -0.12, z, x + s, -0.12, z, x + s, -0.12, z + s, x, -0.12, z + s); idx.push(n, n + 2, n + 1, n, n + 3, n + 2); n += 4; } });
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.setIndex(idx); wg.computeVertexNormals(); disposables.push(wg);
      const wm = new THREE.MeshLambertMaterial({ color: PAL.water, transparent: true, opacity: 0.86, emissive: '#1a5a8a', emissiveIntensity: 0.25 });
      wm.onBeforeCompile = (sh) => { sh.uniforms.uTime = uni.uTime; sh.vertexShader = 'uniform float uTime;\nvarying vec3 vW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += sin(uTime * 1.6 + position.x * 5.0 + position.z * 3.0) * 0.025;\nvW = position;'); sh.fragmentShader = 'uniform float uTime;\nvarying vec3 vW;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat sp = step(0.93, fract(sin(floor(vW.x * 8.0) * 12.9898 + floor(vW.z * 8.0) * 78.233 + floor(uTime * 2.0)) * 43758.5453));\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.92, 0.98, 1.0), sp * 0.55);'); };
      disposables.push(wm); waterMesh = new THREE.Mesh(wg, wm); waterMesh.receiveShadow = true; groups.terrain.add(waterMesh);
    } else waterMesh = null;
    // waterfalls: a pixel-stepped ribbon of falling water with white streaks that scroll down and fade into the air
    const veilQ = { pos: [], uv: [], len: [], idx: [] }; // Phase 14: the falls' front veils, one mesh for all of them
    (t.falls || []).forEach((f) => {
      const L = f.y0 - f.y1, pos = f.sx ? [f.x, f.y0, f.z, f.x, f.y0, f.z + f.w, f.x, f.y1, f.z + f.w, f.x, f.y1, f.z] : [f.x, f.y0, f.z, f.x + f.w, f.y0, f.z, f.x + f.w, f.y1, f.z, f.x, f.y1, f.z];
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, L, 0, L], 2)); fg.setIndex([0, 1, 2, 0, 2, 3]); disposables.push(fg);
      const fm = new THREE.ShaderMaterial({ uniforms: { uTime: uni.uTime, uLen: { value: L } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float uTime; uniform float uLen; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n' +
          'void main(){ vec2 q = vec2(floor(vUv.x * 8.0), floor(vUv.y * 8.0)); float col = q.x; float lane = h(vec2(col, 3.0));\n' +
          ' float s = fract(q.y / 9.0 - uTime * (0.9 + lane * 0.5) + lane); float streak = step(0.72, s) * (0.6 + 0.4 * h(vec2(col, floor(s * 9.0))));\n' +
          ' float edge = (col < 0.5 || col > 6.5) ? 0.25 : 0.0; float top = 1.0 - smoothstep(0.0, 0.6, vUv.y);\n' +
          // Phase 4: body colour deepens towards the sides and with the drop, and pixel sparkles race down the sheet
          ' float side = abs(q.x - 3.5) / 3.5; vec3 base = mix(vec3(0.42, 0.80, 0.98), vec3(0.17, 0.53, 0.84), side * side * 0.8 + smoothstep(0.0, uLen, vUv.y) * 0.25);\n' +
          ' float spark = step(0.97, h(vec2(col * 7.0, floor(q.y - uTime * 16.0 * (0.8 + lane)))));\n' +
          ' vec3 c = mix(base, vec3(0.95, 0.99, 1.0), clamp(streak * 0.85 + top * 0.6 + edge + spark, 0.0, 1.0));\n' +
          ' float a = 0.9 * (1.0 - smoothstep(uLen * 0.45, uLen, vUv.y)); gl_FragColor = vec4(c, a); }' });
      disposables.push(fm); const fall = new THREE.Mesh(fg, fm); fall.renderOrder = 2; groups.terrain.add(fall);
      // a darker sheet just behind gives the falling water some body
      const back = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: '#3d8fc4', transparent: true, opacity: 0.35, depthWrite: false })); disposables.push(back.material); back.position.set(f.sx ? -0.04 : 0, 0, f.sz ? -0.04 : 0); back.renderOrder = 1; groups.terrain.add(back);
      // a little white churn where the water leaves the lip
      const cg = new VoxGrid(0, 0, 0, 6, 2, 6); for (let i = 0; i < 9; i++) cg.set(Math.floor(hash(i, f.x, 75) * 6), hash(i, 2, 76) < 0.5 ? 0 : 1, Math.floor(hash(i, f.z, 77) * 6), PAL.foam);
      const foam = meshGrid(cg, { size: DV, origin: [f.sx ? f.x - 2 * DV : f.x + f.w / 2 - 3 * DV, f.y0 - DV, f.sz ? f.z - 2 * DV : f.z + f.w / 2 - 3 * DV] }); disposables.push(foam); const foamMesh = new THREE.Mesh(foam, matGlow); groups.terrain.add(foamMesh);
      // Phase 14 finalisation: a narrower veil just in front, falling faster and thinner, so the water has depth
      // (two triangles, the same shader with its own speed and a lighter body)
      const vw = f.w * 0.6, vo = (f.w - vw) / 2, out = 0.07, vpos = f.sx ? [f.x + out, f.y0 - 0.05, f.z + vo, f.x + out, f.y0 - 0.05, f.z + vo + vw, f.x + out, f.y1, f.z + vo + vw, f.x + out, f.y1, f.z + vo] : [f.x + vo, f.y0 - 0.05, f.z + out, f.x + vo + vw, f.y0 - 0.05, f.z + out, f.x + vo + vw, f.y1, f.z + out, f.x + vo, f.y1, f.z + out];
      const vn = veilQ.pos.length / 3; veilQ.pos.push(...vpos); veilQ.uv.push(0, 0, 1, 0, 1, L, 0, L); veilQ.len.push(L, L, L, L); veilQ.idx.push(vn, vn + 1, vn + 2, vn, vn + 2, vn + 3);
      // spray: white droplets thrown out where the water leaves the lip and where the sheet breaks up lower down
      const sp = new VoxGrid(-6, -40, -6, 13, 44, 13); const dropAt = (yy, spread, n, seed) => { for (let i = 0; i < n; i++) { const a = hash(i, seed, 141), r = hash(seed, i, 142) * spread, px = Math.round(Math.cos(a * 6.283) * r), pz = Math.round(Math.abs(Math.sin(a * 6.283)) * r + 1), py = yy - Math.floor(hash(i, seed, 143) * 3); sp.set(f.sx ? pz : px, py, f.sx ? px : pz, hash(i, seed, 144) < 0.6 ? PAL.foam : '#bfe9ff'); } };
      dropAt(0, 3, 14, 1); dropAt(-Math.round(L / DV * 0.35), 4, 12, 2); dropAt(-Math.round(L / DV * 0.55), 5, 10, 3);
      const spg = meshGrid(sp, { size: DV, origin: [f.sx ? f.x : f.x + f.w / 2, f.y0 - DV, f.sz ? f.z : f.z + f.w / 2], ao: false }); disposables.push(spg); foamMesh.geometry = mergeGeo(foamMesh.geometry, spg); disposables.push(foamMesh.geometry); // one draw call with the churn
    });
    if (veilQ.idx.length) { const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.Float32BufferAttribute(veilQ.pos, 3)); vg.setAttribute('uv', new THREE.Float32BufferAttribute(veilQ.uv, 2)); vg.setAttribute('aLen', new THREE.Float32BufferAttribute(veilQ.len, 1)); vg.setIndex(veilQ.idx); disposables.push(vg);
      const vm = new THREE.ShaderMaterial({ uniforms: { uTime: uni.uTime }, transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexShader: 'attribute float aLen; varying vec2 vUv; varying float vLen; void main(){ vUv = uv; vLen = aLen; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float uTime; varying vec2 vUv; varying float vLen; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n' +
          'void main(){ vec2 q = vec2(floor(vUv.x * 5.0), floor(vUv.y * 8.0)); float lane = h(vec2(q.x, 9.0)); float s = fract(q.y / 7.0 - uTime * (1.5 + lane * 0.7) + lane);\n' +
          ' float streak = step(0.62, s); float a = streak * 0.55 * (1.0 - smoothstep(vLen * 0.3, vLen * 0.85, vUv.y)) * (0.6 + 0.4 * h(vec2(q.x, floor(s * 7.0))));\n' +
          ' if (a < 0.02) discard; gl_FragColor = vec4(mix(vec3(0.75, 0.93, 1.0), vec3(1.0), streak * 0.6), a); }' });
      disposables.push(vm); const veil = new THREE.Mesh(vg, vm); veil.renderOrder = 3; groups.terrain.add(veil); }
    // fixed scenery that belongs to the island: the jetty with its skiff, the lighthouse rock
    (extras || []).forEach((e) => { const md = VB.extraModel(e.kind); if (!md) return; const g = new THREE.Group(); addModel(g, md); g.position.set(e.x, e.y || 0, e.z); if (e.ry) g.rotation.y = e.ry; g.userData.bob = e.bob ? { y0: g.position.y, ph: e.x } : null; groups.terrain.add(g); if (e.bob) clouds.push(g); });
    // mist and cloud banks drifting below and around the island
    const b = t.bounds, cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    [[cx + 9, -7.5, cz + 14, 1.6], [cx - 14, -6, cz + 6, 1.3], [cx + 16, -5, cz - 6, 1.1], [cx - 4, -9, cz + 20, 1.9], [cx + 22, -8, cz + 10, 1.2]].forEach(([x, y, z, s], i) => {
      const cg = new VoxGrid(-12, 0, -7, 24, 6, 14); const r = (a, b2) => hash(i * 31 + a, b2, 77);
      for (let k = 0; k < 7; k++) { const px = Math.round((r(k, 1) - 0.5) * 14), pz = Math.round((r(k, 2) - 0.5) * 6), rx = 3 + Math.floor(r(k, 3) * 4), rz = 2 + Math.floor(r(k, 4) * 3), ry = 1 + Math.floor(r(k, 5) * 2);
        for (let yy = 0; yy <= ry; yy++) for (let zz = -rz; zz <= rz; zz++) for (let xx = -rx; xx <= rx; xx++) if ((xx / rx) ** 2 + (zz / rz) ** 2 + (yy / (ry + 0.5)) ** 2 <= 1) cg.set(px + xx, yy, pz + zz, pick(PAL.cloud, r(xx + 9, zz + yy))); }
      const geo2 = meshGrid(cg, { size: TV * s * 0.7 }); disposables.push(geo2);
      const cm = new THREE.Mesh(geo2, matSolid); cm.position.set(x, y, z); cm.userData.drift = { x0: x, ph: i * 1.7, sp: 0.15 + i * 0.03 }; groups.terrain.add(cm); clouds.push(cm);
    });
    // distant islands (their own group, moved with the camera for parallax in setView)
    farGroup.clear(); farBase = new THREE.Vector3(cx, 0, cz);
    FAR.forEach((f, i) => { const geo3 = farIslet(i * 17 + 5, f.r, f); disposables.push(geo3); const mm2 = new THREE.Mesh(geo3, matSolid); const p = farBase.clone().addScaledVector(RIGHT, f.sx / UNIT_PX).addScaledVector(UP, -f.sy / UNIT_PX).addScaledVector(BACK, -40 - i * 3);
      mm2.position.copy(p); mm2.scale.setScalar(f.s); mm2.userData.far = f; mm2.userData.base = p.clone(); mm2.userData.ph = i * 1.3; farGroup.add(mm2); });
    // mist where each waterfall thins into the air
    let lowMist = null;
    (t.falls || []).forEach((f, i) => { const cg = new VoxGrid(-6, 0, -6, 13, 5, 13); for (let k = 0; k < 6; k++) { const px = Math.round((hash(i, k, 78) - 0.5) * 6), pz = Math.round((hash(k, i, 79) - 0.5) * 6), rr = 2 + Math.floor(hash(i + k, 3, 80) * 2); for (let y = 0; y < 3; y++) for (let z = -rr; z <= rr; z++) for (let x = -rr; x <= rr; x++) if (x * x + z * z + y * y * 2 <= rr * rr) cg.set(px + x, y, pz + z, pick(PAL.cloud, hash(x, z, y + k))); }
      const mg2 = meshGrid(cg, { size: TV * 0.3 }); disposables.push(mg2); const mist = new THREE.Mesh(mg2, matMist); mist.position.set(f.x + (f.sx ? 0.6 : f.w / 2), f.y1 + (f.y0 - f.y1) * 0.42, f.z + (f.sz ? 0.6 : f.w / 2)); mist.userData.bob = { y0: mist.position.y, ph: i * 2.1 }; groups.terrain.add(mist); clouds.push(mist);
      // Phase 14 finalisation: where the sheet thins out, two wider, fainter banks of spray mist drift apart
      [[0.2, 1.5, -0.5], [0.08, 2.0, 0.7]].forEach(([at, sc, side]) => { const gq = mg2.clone(); gq.scale(sc, 0.8, sc); gq.translate(f.x + (f.sx ? 0.9 : f.w / 2 + side), f.y1 + (f.y0 - f.y1) * at, f.z + (f.sz ? 0.9 : f.w / 2 + side)); lowMist = lowMist ? mergeGeo(lowMist, gq) : gq; }); });
    if (lowMist) { disposables.push(lowMist); const lm = new THREE.Mesh(lowMist, matMistLow); lm.userData.bob = { y0: 0, ph: 1.3 }; groups.terrain.add(lm); clouds.push(lm); }
    // living-pixel motes: pollen and sparkles rising slowly over the meadow
    const N = COARSE ? 28 : 44, mp = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { mp[i * 3] = b.minX + hash(i, 1, 81) * (b.maxX - b.minX); mp[i * 3 + 1] = hash(i, 2, 81) * 3; mp[i * 3 + 2] = b.minZ + hash(i, 3, 81) * (b.maxZ - b.minZ); seed[i] = hash(i, 4, 81) * 6.28; }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3)); disposables.push(mg);
    const mm = new THREE.PointsMaterial({ color: '#fffbe0', size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false }); disposables.push(mm);
    motes = new THREE.Points(mg, mm); motes.userData = { mp, seed, N }; groups.terrain.add(motes);
    // sun and shadow camera framing the whole island
    const span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) * 0.8 + 6;
    sun.target.position.set(cx, 0, cz); sun.position.set(cx - 9, 22, cz + 17);
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 70 }); sun.shadow.camera.updateProjectionMatrix();
    state.iid = iid; state.key = key; state.sig = ''; state.shadowDirty = true; state.dirty = true; state.moved = true;
  }
  let lastSync = null, glbGroups = [];
  function addModel(group, md) {
    if (md.geo) { const m = new THREE.Mesh(md.geo, matSolid); m.castShadow = true; m.receiveShadow = true; group.add(m); }
    if (md.glow) group.add(new THREE.Mesh(md.glow, matGlow));
  }
  function clearGroup(g) { while (g.children.length) { const c = g.children.pop(); c.traverse && c.traverse((o) => { if (o.isInstancedMesh) o.dispose(); }); } disposables.splice(0).forEach((d) => d.dispose && d.dispose()); }

  /* ---- buildings, obstacles and scenery: rebuilt as instanced batches whenever the layout changes */
  function sync(items, scenery) { const c0 = performance.now(); try { return sync0(items, scenery); } finally { cost.syncMs = +(performance.now() - c0).toFixed(1); } }
  function sync0(items, scenery) {
    const sig = JSON.stringify(items) + '|' + state.key + '|' + MS.signature();
    if (sig === state.sig) return;
    state.sig = sig; lastSync = [items, scenery]; glbGroups = [];
    groups.things.children.slice().forEach((c) => { groups.things.remove(c); if (c.isInstancedMesh) c.dispose(); });
    if (detail) detail = null;
    const batches = new Map(); // geometry -> { mat, list: [matrix] , sway }
    const push = (geo, mat, x, y, z, ry, sway, s, lgeo, nature) => { if (!geo) return; const k = geo.uuid + mat.uuid; let bt = batches.get(k); if (!bt) batches.set(k, (bt = { geo, mat, list: [], qs: [], sway, lgeo, nature })); bt.qs.push(quarter(ry)); bt.list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry || 0), new THREE.Vector3(s || 1, s || 1, s || 1))); };
    const occupied = new Set();
    items.forEach((it) => {
      for (let y = it.y; y < it.y + it.h; y++) for (let x = it.x; x < it.x + it.w; x++) occupied.add(x + ',' + y);
      const cx = it.x + it.w / 2, cz = it.y + it.h / 2;
      // Phase 14: a building whose type has an imported model is drawn from it once it has loaded (the voxel model
      // stands in until then, and stays if loading fails). Ruins and building sites keep their voxel models.
      const slot = it.k === 'b' && it.state !== 'ruined' && it.state !== 'constructing' ? MS.slotFor(it.type) : null;
      const inst = slot ? MS.instance(it.type, it.w0, it.h0, it.rot) : null;
      if (slot && !inst) MS.request(it.type, (ok) => { if (!ok || !lastSync) return; state.sig = ''; sync(lastSync[0], lastSync[1]); state.shadowDirty = true; state.dirty = true; kick(); });
      if (inst) { inst.position.set(cx, 0, cz); inst.userData.foot = { fx: cx, fz: cz, fw: it.w, fd: it.h }; groups.things.add(inst); glbGroups.push(inst);
        // the model's view copy and its shadow twin (see facing() above)
        inst.updateMatrixWorld(true); const twin = inst.clone(true); twin.userData = { shadowOnly: true }; twin.traverse((o) => { o.layers.set(SHADOW_LAYER); if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
        let mi = 0; inst.traverse((o) => { if (!o.isMesh) return; const d = BACK.clone().transformDirection(o.matrixWorld.clone().invert()); o.geometry = facing(o.geometry, d, 'glb|' + it.type + '|' + (it.rot ? 1 : 0) + '|' + (mi++) + '|' + o.geometry.uuid, 0.02); o.castShadow = false; o.receiveShadow = true; });
        groups.things.add(twin); }
      else if (it.k === 'b') { const md = VB.buildingModel({ type: it.type, level: it.level, state: it.state, rot: it.rot }, { w0: it.w0, h0: it.h0 }, { art: it.art, cat: it.cat }); if (md) { push(md.geo, matSolid, cx, 0, cz, 0, false, 1, md.lod && md.lod.geo); push(md.glow, matGlow, cx, 0, cz, 0, false, 1, md.lod && md.lod.glow); } }
      else if (it.k === 'l' && it.kind && VB.hasExtra(it.kind)) { const md = VB.extraModel(it.kind, it.on); if (md) { push(md.geo, matSolid, cx, 0, cz, 0, false, 1, md.lod && md.lod.geo); push(md.glow, matGlow, cx, 0, cz, 0, false, 1, md.lod && md.lod.glow); } }
      else if (it.k === 'o') { const md = VB.natureModel(it.type, it.seed, it.w, it.h); if (md) { const ry = (it.seed % 4) * Math.PI / 2, sway = it.type === 'oak' || it.type === 'pine' || it.type === 'bush'; push(md.geo, sway ? matSway : matSolid, cx, 0, cz, ry, sway, 1, md.lod && md.lod.geo, true); push(md.glow, matGlow, cx, 0, cz, ry, false, 1, md.lod && md.lod.glow, true); } }
    });
    // scenery trees on hills, ledges and loose chunks, and meadow details, skipping anything occupied
    (scenery || []).forEach((sc) => { if (occupied.has(sc.cx + ',' + sc.cz)) return; const md = VB.natureModel(sc.kind, sc.seed); if (md) { push(md.geo, sc.still ? matSolid : matSway, sc.x, sc.y, sc.z, sc.ry, !sc.still, sc.s, md.lod && md.lod.geo, true); push(md.glow, matGlow, sc.x, sc.y, sc.z, sc.ry, false, sc.s, md.lod && md.lod.glow, true); } });
    lodPairs = [];
    // A batch whose copies face several ways is split by quarter turn only where that saves enough triangles to be
    // worth a draw call (12,000 or more; below that, no extra draw calls at all); a small batch keeps one draw call and loses only its downward faces.
    const split = [];
    batches.forEach((bt) => { const tris = (bt.geo.index ? bt.geo.index.count / 3 : 0) * bt.list.length, qset = [...new Set(bt.qs)];
      if (qset.length === 1 || tris < 12000) { split.push(Object.assign({}, bt, { q: qset.length === 1 ? qset[0] : null })); return; }
      qset.forEach((q) => { const idx = bt.qs.map((v, i) => (v === q ? i : -1)).filter((i) => i >= 0); split.push(Object.assign({}, bt, { q, list: idx.map((i) => bt.list[i]) })); }); });
    split.forEach((bt) => {
      // Phase 4: every tree, bush and rock gets its own small shift in brightness and warmth (a sunnier or a shadier
      // specimen), so a grove of the same species reads as individuals rather than copies
      const tint = bt.nature && bt.mat !== matGlow ? bt.list.map((m) => { const e = m.elements, a = hash(Math.round(e[12] * 16), Math.round(e[14] * 16), 131), w = hash(Math.round(e[14] * 16), Math.round(e[12] * 16), 132) - 0.5, l = 0.9 + a * 0.16; return new THREE.Color(l * (1 + w * 0.08), l, l * (1 - w * 0.1)); }) : null;
      // the view copy (faces the camera can see, for this quarter turn) is drawn; the full model only casts shadows
      const dir = bt.q == null ? DOWN_ONLY : backFor(bt.q * Math.PI / 2);
      const inst = (geo) => { const im = new THREE.InstancedMesh(geo, bt.mat, bt.list.length); bt.list.forEach((m, i) => { im.setMatrixAt(i, m); if (tint) im.setColorAt(i, tint[i]); }); im.instanceMatrix.needsUpdate = true; if (tint) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); groups.things.add(im); return im; };
      const make = (geo) => { const im = inst(facing(geo, dir)); if (bt.mat !== matGlow) { im.receiveShadow = true; const sh = inst(geo); sh.castShadow = true; sh.layers.set(SHADOW_LAYER); sh.userData.shadowOnly = true; im.userData.twin = sh; } return im; };
      const full = make(bt.geo); full.userData.nature = !!bt.nature; if (bt.lgeo) { const lo = make(bt.lgeo); lo.userData.nature = !!bt.nature; lodPairs.push([full, lo, !!bt.nature]); }
    });
    applyLod(true);
    const trees = []; const TREE = { oak: 1, oakOld: 1, pine: 1, birch: 1, blossom: 1, willow: 1 };
    (scenery || []).forEach((sc) => { if (TREE[sc.kind] && !occupied.has(sc.cx + ',' + sc.cz)) trees.push([sc.x, sc.y, sc.z, sc.kind]); });
    items.forEach((it) => { if (it.k === 'o' && TREE[it.type]) trees.push([it.x + it.w / 2, 0, it.y + it.h / 2, it.type]); });
    buildDetail(occupied, trees); buildSparks(items);
    state.shadowDirty = true; state.dirty = true; state.moved = true;
  }
  // magic: slow motes of light that spiral up around the island's enchanted places (the Hatchery's egg, the
  // Tidegate, the Moonshrine, the Reliquary Gate, the glowing standing stones). One Points object, ~10 per place.
  const SPARK = { hatchery: [MAGIC.egg, 2.6, 1.4], tidegate: [MAGIC.water, 1.8, 1.6], moonshrine: [MAGIC.moon, 2.2, 1.2], reliquarygate: [MAGIC.life, 1.4, 1.4] };
  function buildSparks(items) {
    if (sparks) { groups.fx.remove(sparks); sparks.geometry.dispose(); sparks.material.dispose(); sparks = null; }
    const src = []; items.forEach((it) => { const k = it.k === 'b' && it.state !== 'ruined' && it.state !== 'constructing' ? SPARK[it.type] : it.k === 'l' && it.kind === 'stones' && it.on ? [MAGIC.spirit, 1, 1.6] : null; if (k) src.push([it.x + it.w / 2, it.y + it.h / 2, k]); });
    if (!src.length) return;
    const N = src.length * (COARSE ? 7 : 10), p = new Float32Array(N * 3), col = new Float32Array(N * 3), seed = new Float32Array(N * 4), c = new THREE.Color();
    for (let i = 0; i < N; i++) { const [x, z, k] = src[i % src.length]; c.set(k[0]); col.set([c.r, c.g, c.b], i * 3); seed.set([x, z, k[1], hash(i, 1, 88) * 6.28 + hash(i, 2, 88) * 100], i * 4); p.set([x, k[1] * hash(i, 3, 88) * 1.5, z], i * 3); seed[i * 4 + 2] = k[2]; seed[i * 4 + 3] = hash(i, 4, 88) * 6.28; p[i * 3 + 1] = k[1] * hash(i, 5, 88) * 1.6; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    sparks = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false })); sparks.userData = { seed, N, top: src.map((s2) => s2[2][1]) };
    groups.fx.add(sparks);
  }
  // meadow details: grass blades, flowers and pebbles (one instanced mesh of small blocks)
  // Phase 4 (denser, handcrafted): taller tufts with sunlit tips, flower clusters instead of single flowers, clover
  // under lush ground, daisies in the open, tall wildflowers in long grass, and a skirt of undergrowth, fallen leaves
  // and pebbles around every tree, so groves sit in the ground instead of on it. Density follows the quality tier.
  let detailArgs = null, detailDens = null;
  function buildDetail(occupied, trees) {
    detailArgs = [occupied, trees]; const dens = tier().detail == null ? 1 : tier().detail; detailDens = dens;
    if (detail) { groups.things.remove(detail); detail.dispose(); detail = null; }
    if (!terr) return;
    const list = [], tip = PAL.grass[4];
    const tuft = (bx, y0, bz, n, hi, s0) => { for (let i = 0; i < n; i++) { const hgt = 1 + Math.floor(hash(s0 + i, bx * 97, 95) * 2) + hi, x = bx + (i % 2) * DV + (i > 1 ? DV * 0.5 : 0), z = bz + (i >> 1) * DV; const col = pick([PAL.grass[3], PAL.grassDark[0], PAL.grass[1]], hash(i, s0, 96));
      list.push([x, y0, z, 1, hgt, 1, col]); if (hgt >= 2) list.push([x, y0 + hgt * DV, z, 1, 1, 1, hash(i, s0, 97) < 0.6 ? tip : PAL.grass[2]]); } };
    const flower = (x, y0, z, fc, tall) => { list.push([x, y0, z, 1, tall ? 3 : 2, 1, PAL.leafDark[0]]); list.push([x - DV / 2, y0 + (tall ? 3 : 2) * DV, z - DV / 2, 2, 1, 2, fc]); };
    terr.colAt.forEach((v, k) => {
      const [X, Z] = k.split(',').map(Number), c = v.c; if (occupied.has(c.x + ',' + c.y)) return;
      const y0 = v.top * TV, h = hash(X, Z, 91);
      if ((c.kind === 'grass' || c.kind === 'hill') && v.top >= 0) {
        // Phase 14: the old road. Long before the Sanctuary, a paved way ran down the island from the Tide Gate. What
        // is left are worn flagstones sunk into the grass in a wandering line, a few tilted, a few mossed over, and
        // here and there a pale fleck that still catches the light. They are ground detail only: flat, never in the
        // way of building, and hidden under whatever is placed on them.
        const rd = Math.abs((c.x - c.y) + 5 + Math.sin((c.x + c.y) * 0.35) * 1.4), hr = hash(X, Z, 140);
        if (rd < 1.2 && hr < 0.62) {
          const x = X * TV + 0.04 + hash(X, Z, 141) * 0.2, z = Z * TV + 0.04 + hash(Z, X, 142) * 0.2, hs = hash(X, Z, 143), wide = hs < 0.5;
          list.push([x, y0, z, wide ? 4 : 3, 1, wide ? 3 : 4, pick(PAL.pathStone, hs * 8)]);
          if (hs > 0.86) list.push([x + DV, y0 + DV, z, 2, 1, 1, pick(PAL.pathStone, hr * 9)]);          // a broken slab, tilted up
          else if (hs > 0.7) list.push([x + DV, y0 + DV, z + DV, 1, 1, 1, PAL.grassDark[0]]);             // moss on it
          else if (hs < 0.035) list.push([x + DV, y0 + DV, z + DV, 1, 1, 1, '#c8f6ff']);                  // a pale fleck
          return;
        }
        // Phase 1.1: flowers gather in meadow patches and grass clumps thin out in the open, so the ground reads
        // as calm grass with a few bright drifts, instead of an even sprinkle everywhere
        const patch = vnoise(X * 0.16, Z * 0.16, 17), tall = vnoise(X * 0.22, Z * 0.22, 18), lush = vnoise(X * 0.11, Z * 0.11, 23), h2 = hash(X, Z, 101), h3 = hash(X, Z, 102);
        if (patch > 0.66 && h < 0.42 + 0.12 * dens) {
          const x = X * TV + 0.1 + hash(X, Z, 96) * 0.3, z = Z * TV + 0.1 + hash(Z, X, 97) * 0.3, fc = pick(PAL.flowers, vnoise(X * 0.5, Z * 0.5, 19));
          flower(x, y0, z, hash(X, Z, 98) < 0.75 ? fc : pick(PAL.flowers, hash(X, Z, 99)), false);
          const extra = Math.floor(hash(X, Z, 103) * 3 * dens); for (let i = 0; i < extra; i++) flower(x + (hash(i, X, 104) - 0.5) * 0.18, y0, z + (hash(Z, i, 105) - 0.5) * 0.18, hash(i, Z, 106) < 0.7 ? fc : pick(PAL.flowers, hash(X, i, 107)), false);
          if (h2 < 0.5 * dens) tuft(x + 0.12, y0, z - 0.06, 2, 0, X * 7 + Z);
        } else if (h < (tall > 0.55 ? 0.4 : 0.2) * dens) {
          const bx = X * TV + 0.08 + hash(X, Z, 93) * 0.3, bz = Z * TV + 0.08 + hash(Z, X, 94) * 0.3;
          tuft(bx, y0, bz, 2 + Math.floor(hash(X, Z, 92) * 3), tall > 0.65 ? 1 : 0, X * 13 + Z * 3);
          if (tall > 0.62 && h2 < 0.3) flower(bx + 0.14, y0, bz + 0.1, pick(['#b48cff', '#ffe066', '#ff8fb8'], h3), true);
        }
        if (lush > 0.62 && h2 < 0.22 * dens) { const x = X * TV + 0.06 + hash(X, Z, 108) * 0.28, z = Z * TV + 0.06 + hash(Z, X, 109) * 0.28; list.push([x, y0, z, 3, 1, 3, PAL.grass[3]]); list.push([x + DV, y0 + DV, z, 1, 1, 2, PAL.grassDark[0]]); if (h3 < 0.3) list.push([x + DV, y0 + DV, z + DV, 1, 1, 1, h3 < 0.15 ? '#ffffff' : '#ffc0d8']); }
        else if (lush < 0.4 && h3 < 0.05 * dens) { const x = X * TV + 0.1 + hash(X, Z, 110) * 0.3, z = Z * TV + 0.1 + hash(Z, X, 111) * 0.3; list.push([x, y0, z, 1, 1, 1, '#ffffff']); list.push([x + DV * 2, y0, z + DV, 1, 1, 1, '#fff6c8']); }
      } else if (c.kind === 'path' && h < 0.12) list.push([X * TV + 0.1 + hash(X, Z, 99) * 0.3, y0, Z * TV + 0.15, 2, 1, 2, pick(PAL.pathStone, h * 8)]);
      else if (c.kind === 'sand' && h < 0.08) list.push([X * TV + 0.2, y0, Z * TV + 0.2, 2, 1, 1, '#ffffff']);
      else if (c.kind === 'sand' && h > 0.93 && dens > 0.6) list.push([X * TV + 0.15, y0, Z * TV + 0.3, 2, 1, 1, pick(PAL.pathStone, h)]);
    });
    // undergrowth around trees
    (trees || []).forEach(([tx, ty, tz, kind], ti) => {
      const n = Math.round((kind === 'pine' ? 5 : 7) * dens), leaf = kind === 'blossom' ? PAL.blossom || PAL.flowers : kind === 'pine' ? PAL.pine : PAL.leaf;
      for (let i = 0; i < n; i++) { const a = hash(ti, i, 120) * 6.283, r = 0.22 + hash(i, ti, 121) * 0.34, x = tx + Math.cos(a) * r, z = tz + Math.sin(a) * r, w = hash(ti * 3 + i, 7, 122);
        if (w < 0.45) tuft(x, ty, z, 2 + Math.floor(w * 4), 0, ti * 31 + i);
        else if (w < 0.72) list.push([x, ty, z, 1, 1, 1, pick(leaf, hash(i, ti, 123))]); // a fallen leaf or needle cluster
        else if (w < 0.86) list.push([x, ty, z, 2, 1, 1, pick(PAL.leafDark, w)]); // low fern spray
        else list.push([x, ty, z, 1, 1, 1, pick(PAL.pathStone, w)]); } // a pebble
    });
    if (!list.length) return;
    const geo = new THREE.BoxGeometry(DV, DV, DV); geo.translate(DV / 2, DV / 2, DV / 2); { const ix = Array.from(geo.index.array); geo.setIndex(ix.slice(0, 6).concat(ix.slice(12, 18), ix.slice(24, 30))); geo.clearGroups(); } /* Phase 14: only the three faces the fixed camera sees (+X, +Y, +Z): 6 triangles a piece (was 10) */ // Phase 4: no bottom face (it sits on the ground): 10 triangles a piece instead of 12 disposables.push(geo);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), list.length), m = new THREE.Matrix4(), c = new THREE.Color();
    list.forEach(([x, y, z, sx, sy, sz, col], i) => { m.makeScale(sx, sy, sz).setPosition(x, y, z); im.setMatrixAt(i, m); im.setColorAt(i, c.set(col)); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.receiveShadow = true; detail = im; groups.things.add(im);
  }

  /* ---- depth for the 2D overlay (Phase 1.2) ----
     The overlay (creatures, markers, ground rings) is SVG above this canvas. vox-island.js describes each overlay
     sprite as a world-space proxy card; here we
       1. clear the overlay's screen region, draw the proxies into depth + stencil only (nearest card wins),
       2. draw the opaque scene where the stencil is set: only fragments nearer than the card survive,
       3. copy that region onto a 2D canvas that sits above the SVG, cut out the interface rectangles,
       4. redraw the normal scene into the region.
     The result: a building, tree or cliff in front of a creature covers it, and one behind it does not, using the
     real depth of every voxel. The proxies are re-read on a light poll (no work while nothing moves). */
  const occCanvas = document.createElement('canvas'); occCanvas.className = 'vox-occ'; const occCtx = occCanvas.getContext('2d');
  const proxyScene = new THREE.Scene(), proxyMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
  const proxyGeo = new THREE.BufferGeometry(), proxyMesh = new THREE.Mesh(proxyGeo, proxyMat); proxyMesh.frustumCulled = false; proxyScene.add(proxyMesh);
  const occ = { fn: null, data: null, sig: null, dirty: false, timer: 0, cost: 0, shown: false, cam: null, last: 0, stale: false };
  const YV = new THREE.Vector3(0, 1, 0);
  function setOverlay(fn) { occ.fn = fn; occ.sig = null; pollOcc(); }
  function pollOcc() {
    clearTimeout(occ.timer); occ.timer = 0;
    if (!occ.fn || !R.domElement.isConnected) return;
    // on a device too slow for the ambient tick (no GPU), a moving creature does not trigger a redraw on every step:
    // the occlusion catches up once the overlay has held still for one poll (or with the next camera change)
    if (occ.stale && !(A && A.UI && A.UI.dragging)) { occ.dirty = true; kick(); } // the drag ended: one exact pass
    if (!(A && A.Perf && A.Perf.hidden())) { const d = occ.fn(); const sig = d ? d.sig : ''; if (sig !== occ.sig) { if (!slow || sig === occ.pending) { occ.sig = sig; occ.data = d; occ.dirty = true; kick(); } occ.pending = sig; } }
    // a light poll: ~9 reads a second, slower on devices where the pass is expensive
    // Battery saver and a still island poll less often (creatures still walk, but rarely)
    occ.timer = setTimeout(pollOcc, slow ? 1000 : Math.min(1000, Math.max(saver() || resting() ? 400 : 110, occ.cost * 5)));
  }
  function proxies(d) {
    const pos = [], idx = []; let n = 0;
    const quad = (a, b, c, e) => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, e.x, e.y, e.z); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4; };
    d.up.forEach(([x0, x1, y0, y1, fx]) => { const g = fromIso(fx, y1), h = (y1 - y0) / HEIGHT_PX, a = (x0 - fx) / UNIT_PX, b = (x1 - fx) / UNIT_PX;
      const p0 = g.clone().addScaledVector(RIGHT, a), p1 = g.clone().addScaledVector(RIGHT, b); quad(p0, p1, p1.clone().addScaledVector(YV, h), p0.clone().addScaledVector(YV, h)); });
    d.flat.forEach(([x0, y0, x1, y1]) => { const c = [fromIso(x0, y0), fromIso(x1, y0), fromIso(x1, y1), fromIso(x0, y1)].map((v) => (v.y = 0.04, v)); quad(c[0], c[1], c[2], c[3]); });
    proxyGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); proxyGeo.setIndex(idx); proxyGeo.computeBoundingSphere();
  }
  function sizeOcc() { const c = R.domElement; if (occCanvas.width !== c.width || occCanvas.height !== c.height) { occCanvas.width = c.width; occCanvas.height = c.height; } occCanvas.style.width = c.style.width || '100%'; occCanvas.style.height = c.style.height || '100%'; }
  // returns the region it used (css px), or null
  function drawOcc() {
    // read the overlay fresh at draw time, so the proxies match what is on screen in this very frame
    occ.dirty = false; occ.stale = false; occ.last = performance.now(); occCanvas.style.transform = ''; const d = (occ.data = occ.fn ? occ.fn() : null), v = state.view; occ.sig = d ? d.sig : ''; sizeOcc();
    if (v) occ.cam = { x: v.x, y: v.y, z: v.z };
    if (occ.shown) { occCtx.clearRect(0, 0, occCanvas.width, occCanvas.height); occ.shown = false; }
    if (!d || !d.rect || !v || !(d.up.length + d.flat.length)) return null;
    const t0 = performance.now(), pr = R.getPixelRatio(), [rx, ry, rw, rh] = d.rect;
    proxies(d);
    R.autoClear = false; R.setScissorTest(true); R.setScissor(rx, v.h - ry - rh, rw, rh); R.setClearColor(0x000000, 0); R.clear(true, true, true);
    R.render(proxyScene, camera);
    // only opaque scenery takes part (water, waterfalls, motes and clouds never hide a creature)
    const hidden = [], mats = new Set();
    [waterMesh, motes, sparks, farGroup].concat(clouds).forEach((o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } });
    scene.traverseVisible((o) => { if (o.isMesh && o.material && !o.material.transparent) mats.add(o.material); });
    mats.forEach((m) => { m.stencilWrite = true; m.stencilFunc = THREE.EqualStencilFunc; m.stencilRef = 1; m.stencilZPass = THREE.KeepStencilOp; });
    R.render(scene, camera);
    mats.forEach((m) => { m.stencilWrite = false; m.stencilFunc = THREE.AlwaysStencilFunc; });
    hidden.forEach((o) => { o.visible = true; });
    occCtx.drawImage(R.domElement, rx * pr, ry * pr, rw * pr, rh * pr, rx * pr, ry * pr, rw * pr, rh * pr);
    if (d.cut.length) { occCtx.globalCompositeOperation = 'destination-out'; d.cut.forEach(([x, y, w, h]) => occCtx.fillRect(x * pr - 1, y * pr - 1, w * pr + 2, h * pr + 2)); occCtx.globalCompositeOperation = 'source-over'; }
    occ.shown = true; occ.cost = occ.cost * 0.7 + (performance.now() - t0) * 0.3;
    return [rx, ry, rw, rh];
  }
  function occludedAt(x, y) {
    if (!occ.shown) return false; const r = occCanvas.getBoundingClientRect(), pr = occCanvas.width / Math.max(1, r.width);
    const px = Math.floor((x - r.left) * pr), py = Math.floor((y - r.top) * pr); if (px < 0 || py < 0 || px >= occCanvas.width || py >= occCanvas.height) return false;
    try { return occCtx.getImageData(px, py, 1, 1).data[3] > 40; } catch (e) { return false; }
  }

  /* ---- level of detail (Phase 2) ----
     Every building, tree and rock has a half-resolution twin (Model.lod in voxbuild.js). Nature switches to it when
     the camera is near its widest zoom (a prop voxel is then about 2 screen pixels); buildings keep full detail,
     because their silhouettes carry the island's identity. In Battery saver everything uses the twins (Phase 3: the twins
     keep the visible colours and thin roofs, see halfGrid). The rules come from the quality tier. Same draw
     calls either way; the twins have roughly a quarter of the triangles. */
  const LOD_Z = 0.4; let lodPairs = [], lodOn = null;
  function applyLod(force) {
    const T = tier(), v = state.view, far = !!(v && (v.z < LOD_Z || T.natureLod)), sv = T.buildingLod, key = (far ? 1 : 0) + (sv ? 2 : 0);
    if (!force && key === lodOn) return; lodOn = key;
    lodPairs.forEach(([full, lo, nature]) => { const on = sv || (far && nature); full.visible = !on; lo.visible = on; if (full.userData.twin) full.userData.twin.visible = !on; if (lo.userData.twin) lo.userData.twin.visible = on; }); state.shadowDirty = true;
  }

  /* ---- camera: same view as the 2D layer ---- */
  function setView(cam, view) {
    state.view = { x: cam.x, y: cam.y, z: cam.z, w: view.w, h: view.h };
    const t = fromIso(cam.x, cam.y), k = 1 / (UNIT_PX * cam.z);
    camera.left = -view.w / 2 * k; camera.right = view.w / 2 * k; camera.top = view.h / 2 * k; camera.bottom = -view.h / 2 * k;
    camera.position.copy(t).addScaledVector(BACK, 60); camera.lookAt(t); camera.updateProjectionMatrix();
    // parallax: the distant islands follow the camera part of the way, so they drift more slowly than the island
    if (farBase) farGroup.children.forEach((m) => { const k = m.userData.far.k; m.position.copy(m.userData.base).addScaledVector(new THREE.Vector3(t.x - farBase.x, 0, t.z - farBase.z), 1 - k); });
    const pr = Math.min(window.devicePixelRatio || 1, tier().prCap);
    if (R.getPixelRatio() !== pr) R.setPixelRatio(pr);
    const sz = R.getSize(new THREE.Vector2()); if (sz.x !== view.w || sz.y !== view.h) R.setSize(view.w, view.h, true);
    applyLod(false); state.dirty = true; state.moved = true; kick();
  }
  const resting = () => !!(A && A.Perf && (A.Perf.resting() || A.Perf.hidden())) || document.body.classList.contains('perf-covered');
  const calm = () => !!(A && A.State && A.State.state && A.State.state.settings && A.State.state.settings.reduceMotion);

  /* ---- render loop: on demand, plus a slow ambient tick ---- */
  // slow: set when the device cannot keep the ambient tick (frames arriving under ~8 per second while animating, e.g.
  // no GPU and WebGL falling back to software). The island then only redraws when something changes.
  let lastMoveDraw = 0, raf = 0, last = 0, t0 = performance.now(), frames = 0, drawMs = 0, slow = false, prev = 0, gaps = [];
  function kick() { if (!raf) raf = requestAnimationFrame(loop); if (!occ.timer && occ.fn) occ.timer = setTimeout(pollOcc, 60); } // the occlusion poll stops while the island is away and restarts here
  // Phase 7 performance fix: a callback that drew nothing is light, so the interval to the next one is set by the
  // browser and screen; it tells Perf what frame rate the page can get (see Perf.noteFrame)
  let cbPrev = 0, cbIdle = false;
  function loop(now) {
    raf = 0; if (!R.domElement.isConnected) return;
    if (cbPrev && cbIdle && now - cbPrev < 120 && A && A.Perf && A.Perf.noteFrame) A.Perf.noteFrame(now - cbPrev);
    cbPrev = now;
    const animate = !slow && !saver() && !resting() && !calm();
    if (animate && prev && now - prev < 2000) { gaps.push(now - prev); if (gaps.length > 6) gaps.shift(); if (gaps.length >= 6 && gaps.reduce((a, b) => a + b, 0) / gaps.length > 125) { slow = true; if (window.console) console.info('Voxel island: slow frames, ambient animation off'); } }
    prev = animate ? now : 0;
    if (animate && now - last >= 1000 / AMBIENT_FPS - 2) { tickAmbient((now - t0) / 1000, Math.min(0.2, (now - last) / 1000)); last = now; state.dirty = true; }
    cbIdle = !(state.dirty || occ.dirty);
    if (!cbIdle) draw();
    if (animate) raf = requestAnimationFrame(loop);
  }
  function tickAmbient(t, dt) {
    uni.uTime.value = t;
    if (glbGroups.length) MS.tick(glbGroups, dt);
    clouds.forEach((c) => { const d = c.userData.drift; if (d) c.position.x = d.x0 + Math.sin(t * d.sp * 0.3 + d.ph) * 1.2; const b = c.userData.bob; if (b) c.position.y = b.y0 + Math.sin(t * 1.2 + b.ph) * 0.06; });
    if (sparks) { const u = sparks.userData, p = sparks.geometry.attributes.position.array; for (let i = 0; i < u.N; i++) { const cx = u.seed[i * 4], cz = u.seed[i * 4 + 1], r = u.seed[i * 4 + 2] * 0.55, ph = u.seed[i * 4 + 3]; let y = p[i * 3 + 1] + dt * 0.35; if (y > 3.4) y = 0.3; const a = ph + t * 0.6 + y * 1.4, rr = r * (0.6 + 0.4 * Math.sin(ph * 3)); p[i * 3] = cx + Math.cos(a) * rr; p[i * 3 + 1] = y; p[i * 3 + 2] = cz + Math.sin(a) * rr; } sparks.geometry.attributes.position.needsUpdate = true; }
    if (motes) { const u = motes.userData, p = u.mp; for (let i = 0; i < u.N; i++) { p[i * 3 + 1] += dt * 0.25; p[i * 3] += Math.sin(t * 0.7 + u.seed[i]) * dt * 0.08; if (p[i * 3 + 1] > 3.2) p[i * 3 + 1] = 0.1; } motes.geometry.attributes.position.needsUpdate = true; }
  }
  function draw() {
    if (!state.view) return;
    const s0 = performance.now();
    // Auto quality: report the interval between frames drawn for camera moves (not the 12 fps ambient tick)
    if (state.moved && lastMoveDraw && s0 - lastMoveDraw < 100 && A && A.Perf && A.Perf.sample) A.Perf.sample(s0 - lastMoveDraw);
    if (state.moved) lastMoveDraw = s0;
    const T = tier();
    if (detailArgs && (T.detail == null ? 1 : T.detail) !== detailDens) { buildDetail(detailArgs[0], detailArgs[1]); state.shadowDirty = true; }
    // Phase 4 soft shadows: High filters the shadow map with variance shadows (a wide, soft penumbra, blurred once when
    // the shadow is redrawn, then one lookup per pixel); Balanced and Battery saver use PCF with a smaller radius
    const stype = T.shadowSoft === 'vsm' ? THREE.VSMShadowMap : THREE.PCFShadowMap;
    if (R.shadowMap.type !== stype) { R.shadowMap.type = stype; scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); }); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } state.shadowDirty = true; }
    if (sun.shadow.radius !== (T.shadowRadius || 3)) { sun.shadow.radius = T.shadowRadius || 3; state.shadowDirty = true; }
    if (sun.shadow.mapSize.x !== T.shadowMap) { sun.shadow.mapSize.set(T.shadowMap, T.shadowMap); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } state.shadowDirty = true; }
    sun.castShadow = T.shadows;
    if (state.shadowDirty && sun.castShadow) { R.shadowMap.needsUpdate = true; state.shadowDirty = false; }
    let region = null;
    if ((occ.dirty || state.moved) && occ.fn) {
      // while the player drags the island, the exact pass runs at most ~8 times a second; in between, the last
      // occlusion image is slid along with the camera (same zoom), and an exact pass follows when the drag ends
      const v = state.view, c0 = occ.cam, dragging = !!(A && A.UI && A.UI.dragging);
      if (!occ.dirty && dragging && c0 && c0.z === v.z && performance.now() - occ.last < 120) { occCanvas.style.transform = 'translate(' + ((c0.x - v.x) * v.z).toFixed(1) + 'px,' + ((c0.y - v.y) * v.z).toFixed(1) + 'px)'; occ.stale = true; }
      else region = drawOcc();
    }
    const full = state.dirty; state.moved = false; // ambient-only frames keep the last occlusion
    // always a whole frame: the browser discards the drawing buffer after each composite, so a partial redraw
    // would leave the rest of the canvas empty
    if (full || region) { R.setScissorTest(false); R.autoClear = true; R.setClearColor(0x000000, 0); R.render(scene, camera); }
    R.setScissorTest(false); R.autoClear = true;
    state.dirty = false; frames++; drawMs += performance.now() - s0;
  }
  return {
    canvas: R.domElement, occCanvas,
    setTerrain, sync, setView, kick, setOverlay, occludedAt,
    redraw() { state.dirty = true; kick(); },
    // Phase 14: where each imported building model stands, against its building's footprint (tests and the report)
    falls() { return terr ? terr.falls.map((f) => ({ sx: f.sx, sz: f.sz, x: f.x, z: f.z, y0: f.y0, y1: f.y1 })) : []; },
    spinModels(dt) { MS.tick(glbGroups, dt); },
    models() { return glbGroups.map((g) => { g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g), f = g.userData.foot, e = g.userData.spin[0]; return { type: g.userData.glb, minY: +b.min.y.toFixed(3), height: +(b.max.y - b.min.y).toFixed(3), w: +(b.max.x - b.min.x).toFixed(3), d: +(b.max.z - b.min.z).toFixed(3), cx: +((b.min.x + b.max.x) / 2).toFixed(3), cz: +((b.min.z + b.max.z) / 2).toFixed(3), fx: f.fx, fz: f.fz, fw: f.fw, fd: f.fd, spin: e ? e.rotation.x + e.rotation.y + e.rotation.z : 0 }; }); },
    has: (k, art, cat, st) => (k === 'b' ? VB.hasBuilding(art, cat) && st !== 'constructing' : k === 'l' ? VB.hasExtra(art) : VB.hasNature(art)),
    // triangles by layer: what the island is made of (for the performance report)
    breakdown() { const t = (o) => (o.geometry && o.geometry.index ? o.geometry.index.count / 3 : 0) * (o.isInstancedMesh ? o.count : 1); const out = { terrain: 0, buildings: 0, nature: 0, detail: 0, far: 0, fx: 0 };
      groups.terrain.traverse((o) => { if (o.isMesh && !o.userData.shadowOnly) out.terrain += t(o); }); farGroup.traverse((o) => { if (o.isMesh) out.far += t(o); });
      groups.things.children.forEach((o) => { if (o.userData.shadowOnly) return; if (o.userData.glb) { o.traverse((m) => { if (m.isMesh) out.buildings += t(m); }); return; } if (!o.isMesh || !o.visible) return; if (o === detail) out.detail += t(o); else if (o.material === matSway || o.userData.nature) out.nature += t(o); else out.buildings += t(o); }); Object.keys(out).forEach((k) => (out[k] = Math.round(out[k]))); return out; },
    stats() { const i = R.info; return { frames, avgDrawMs: frames ? +(drawMs / frames).toFixed(2) : 0, calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, shadow: sun.castShadow, shadowMap: sun.shadow.mapSize.x, shadowType: R.shadowMap.type === THREE.VSMShadowMap ? 'vsm' : 'pcf', detail: detail ? detail.count : 0, grade: { toneMapping: R.toneMapping === THREE.NeutralToneMapping ? 'neutral' : 'none', exposure: R.toneMappingExposure }, tinted: groups.things.children.filter((o) => o.isInstancedMesh && o.instanceColor).length, tier: tier().id, canvas: [R.domElement.width, R.domElement.height], pixelRatio: R.getPixelRatio(), slow, lod: lodOn === 0 ? 'off' : lodOn === 1 ? 'nature' : 'all', terrainMs: cost.terrainMs, syncMs: cost.syncMs, occ: { shown: occ.shown, proxies: occ.data ? occ.data.up.length + occ.data.flat.length : 0, ms: +occ.cost.toFixed(1) } }; },
    dispose() { if (raf) cancelAnimationFrame(raf); raf = 0; clearGroup(groups.terrain); groups.things.children.slice().forEach((c) => { groups.things.remove(c); if (c.isInstancedMesh) c.dispose(); }); state = { things: new Map(), sig: '' }; },
  };
}
