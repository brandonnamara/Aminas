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
import { VoxGrid, meshGrid, hash, pick } from './voxmesh.js';
import { PAL, TV, DV, UNIT_PX, HEIGHT_PX } from './voxstyle.js';
import * as VB from './voxbuild.js';

const A = window.A;
const COARSE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const AMBIENT_FPS = 12;
let R = null; // shared renderer (kept between visits to the island)

// camera basis: screen-right = (1,0,-1)/√2, screen-up = (-16, 39.19, -16)/45.25, toward the viewer = r × u
const RIGHT = new THREE.Vector3(1, 0, -1).normalize(), UP = new THREE.Vector3(-16, HEIGHT_PX, -16).normalize();
const BACK = new THREE.Vector3().crossVectors(RIGHT, UP).normalize();
// a 2D world point (px, at ground height 0) to 3D
const fromIso = (wx, wy) => { const a = wx / 32, b = wy / 16; return new THREE.Vector3((a + b) / 2, 0, (b - a) / 2); };

/* ------------------------------------------------------------------ terrain */
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s), u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }

function buildTerrain(cols) {
  const V = 1 / TV; // voxels per cell (2)
  const byKey = new Map(); cols.forEach((c) => byKey.set(c.x + ',' + c.y, c));
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, minY = 0, maxY = 0;
  const vy = (px) => Math.round(px / HEIGHT_PX / TV);
  cols.forEach((c) => { minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x); minZ = Math.min(minZ, c.y); maxZ = Math.max(maxZ, c.y); minY = Math.min(minY, vy(c.bot) - 5); maxY = Math.max(maxY, vy(c.top) + 2); });
  const g = new VoxGrid((minX - 2) * V, minY, (minZ - 2) * V, (maxX - minX + 5) * V, maxY - minY + 2, (maxZ - minZ + 5) * V);
  const water = [];
  const grassy = (k) => k === 'grass' || k === 'hill' || k === 'ledge' || k === 'chunk';
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
  const exposed = (X, Z, y) => { const n = colAt.get(X + ',' + Z); return !n || y >= n.top || y < n.bot; };
  colAt.forEach((v, k) => {
    const [X, Z] = k.split(',').map(Number), { c, top, bot } = v, kind = c.kind;
    const edge = exposed(X + 1, Z, top - 1) || exposed(X - 1, Z, top - 1) || exposed(X, Z + 1, top - 1) || exposed(X, Z - 1, top - 1);
    const vine = edge && hash(X, Z, 31) < 0.22, vineLen = 2 + Math.floor(hash(X, Z, 32) * 5);
    for (let y = bot; y < top; y++) {
      const d = top - 1 - y; let col;
      const h = hash(X * 3 + y, Z * 5 - y, 11);
      if (d === 0) {
        if (grassy(kind) && !(kind === 'ledge' && c.top < -24)) { const t = vnoise(X * 0.35, Z * 0.35, 3); col = h < 0.06 ? PAL.grass[4] : t < 0.38 ? PAL.grass[1] : t < 0.62 ? PAL.grass[0] : t < 0.8 ? PAL.grass[2] : PAL.grass[3]; }
        else if (kind === 'sand') col = pick(PAL.sand, h);
        else if (kind === 'path') col = hash(Math.floor(X / 1), Math.floor(Z / 1), 41) < 0.2 ? pick(PAL.pathStone, h) : pick(PAL.path, h);
        else if (kind === 'plaza') col = PAL.plaza[(c.x + c.y) % 2];
        else if (kind === 'water') col = pick(PAL.bed, h);
        else col = pick(PAL.stone, h);
      } else if (d === 1 && grassy(kind)) col = edge && h < 0.5 ? pick(PAL.grassSide, h * 2) : pick(PAL.dirt, h);
      else if (d === 1 && kind === 'sand') col = pick(PAL.sand, h);
      else if (d <= 2) col = pick(PAL.dirt, h);
      else {
        // strata: reddish earth bands near the top, coursed grey stone below, cooler slate under the island
        const band = Math.floor((y + vnoise(X * 0.2, Z * 0.2, 5) * 3) / 2);
        if (y >= -4) col = band % 3 === 0 ? pick(PAL.stone, h) : pick(PAL.clay, h);
        else if (y >= -9) col = band % 4 === 0 ? pick(PAL.clay, h) : h < 0.08 ? pick(PAL.stoneDark, h * 10) : pick(PAL.stone, h);
        else col = h < 0.1 ? pick(PAL.stoneDark, h * 10) : pick(PAL.deep, h);
        if (y === bot) col = pick(PAL.deep, h);
      }
      if (vine && d >= 1 && d <= vineLen) col = pick(PAL.moss, h);
      g.set(X, y, Z, col);
    }
    if (kind === 'water') water.push([X, Z]);
    // stalactites under the island: the underside drips into points
    if (hash(X, Z, 51) < 0.32) { const n = 1 + Math.floor(hash(X, Z, 52) * 3); for (let i = 1; i <= n; i++) g.set(X, bot - i, Z, pick(PAL.deep, hash(X, i, 53))); }
    // rock outcrops on the cliff faces
    if (edge && hash(X, Z, 61) < 0.07 && top - bot > 5) {
      const y0 = top - 4 - Math.floor(hash(X, Z, 62) * (top - bot - 5));
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { if (!colAt.has((X + dx) + ',' + (Z + dz))) { g.set(X + dx, y0, Z + dz, pick(PAL.stone, hash(X, Z, 63))); if (hash(X, Z, 64) > 0.5) g.set(X + dx, y0 - 1, Z + dz, pick(PAL.stoneDark, hash(X, Z, 65))); } });
    }
  });
  return { g, water, colAt, bounds: { minX, maxX, minZ, maxZ } };
}

/* ------------------------------------------------------------------ the scene */
export function createIsland() {
  if (!R) {
    R = new THREE.WebGLRenderer({ antialias: !COARSE, alpha: true, powerPreference: 'default' });
    R.setClearColor(0x000000, 0); R.outputColorSpace = THREE.SRGBColorSpace;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.shadowMap.autoUpdate = false;
    R.domElement.className = 'vox3d';
  }
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 200);
  camera.up.copy(UP);
  const hemi = new THREE.HemisphereLight('#d8ecff', '#7a6a58', 1.15); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d8', 1.9); sun.castShadow = true;
  sun.shadow.mapSize.set(COARSE ? 1024 : 2048, COARSE ? 1024 : 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02; sun.shadow.radius = 2;
  scene.add(sun); scene.add(sun.target);
  const groups = { terrain: new THREE.Group(), things: new THREE.Group(), fx: new THREE.Group() };
  Object.values(groups).forEach((g) => scene.add(g));
  const matSolid = new THREE.MeshLambertMaterial({ vertexColors: true }), matGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
  const uni = { uTime: { value: 0 } };
  // leaves sway a little (a vertex nudge proportional to height inside each tree instance)
  const matSway = new THREE.MeshLambertMaterial({ vertexColors: true });
  matSway.onBeforeCompile = (sh) => { sh.uniforms.uTime = uni.uTime; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;\n#else\nfloat ph = 0.0;\n#endif\nfloat k = max(0.0, position.y - 0.6) * 0.035;\ntransformed.x += sin(uTime * 1.3 + ph) * k;\ntransformed.z += cos(uTime * 1.1 + ph) * k * 0.6;'); };
  let state = { iid: null, key: null, built: false, view: null, dirty: true, shadowDirty: true, things: new Map(), sig: '' };
  let terr = null, waterMesh = null, detail = null, motes = null, clouds = [];
  const disposables = [];

  const cost = { terrainMs: 0, syncMs: 0 };
  function setTerrain(iid, key, cols, extras) { const c0 = performance.now(); try { return setTerrain0(iid, key, cols, extras); } finally { cost.terrainMs = +(performance.now() - c0).toFixed(1); } }
  function setTerrain0(iid, key, cols, extras) {
    if (state.key === key && terr) return;
    clearGroup(groups.terrain); clouds = [];
    const t = buildTerrain(cols); terr = t;
    const geo = meshGrid(t.g, { size: TV, shadeFaces: false }); disposables.push(geo);
    const m = new THREE.Mesh(geo, matSolid); m.castShadow = true; m.receiveShadow = true; groups.terrain.add(m);
    // water: subdivided quads that ripple (vertex shader) with a sheen
    if (t.water.length) {
      const pos = [], idx = []; let n = 0;
      t.water.forEach(([X, Z]) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x = X * TV + i * TV / 2, z = Z * TV + j * TV / 2, s = TV / 2; pos.push(x, -0.12, z, x + s, -0.12, z, x + s, -0.12, z + s, x, -0.12, z + s); idx.push(n, n + 2, n + 1, n, n + 3, n + 2); n += 4; } });
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.setIndex(idx); wg.computeVertexNormals(); disposables.push(wg);
      const wm = new THREE.MeshLambertMaterial({ color: PAL.water, transparent: true, opacity: 0.86, emissive: '#1a5a8a', emissiveIntensity: 0.25 });
      wm.onBeforeCompile = (sh) => { sh.uniforms.uTime = uni.uTime; sh.vertexShader = 'uniform float uTime;\nvarying vec3 vW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += sin(uTime * 1.6 + position.x * 5.0 + position.z * 3.0) * 0.025;\nvW = position;'); sh.fragmentShader = 'uniform float uTime;\nvarying vec3 vW;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat sp = step(0.93, fract(sin(floor(vW.x * 8.0) * 12.9898 + floor(vW.z * 8.0) * 78.233 + floor(uTime * 2.0)) * 43758.5453));\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.92, 0.98, 1.0), sp * 0.55);'); };
      disposables.push(wm); waterMesh = new THREE.Mesh(wg, wm); waterMesh.receiveShadow = true; groups.terrain.add(waterMesh);
    } else waterMesh = null;
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
    state.iid = iid; state.key = key; state.sig = ''; state.shadowDirty = true; state.dirty = true;
  }
  function addModel(group, md) {
    if (md.geo) { const m = new THREE.Mesh(md.geo, matSolid); m.castShadow = true; m.receiveShadow = true; group.add(m); }
    if (md.glow) group.add(new THREE.Mesh(md.glow, matGlow));
  }
  function clearGroup(g) { while (g.children.length) { const c = g.children.pop(); c.traverse && c.traverse((o) => { if (o.isInstancedMesh) o.dispose(); }); } disposables.splice(0).forEach((d) => d.dispose && d.dispose()); }

  /* ---- buildings, obstacles and scenery: rebuilt as instanced batches whenever the layout changes */
  function sync(items, scenery) { const c0 = performance.now(); try { return sync0(items, scenery); } finally { cost.syncMs = +(performance.now() - c0).toFixed(1); } }
  function sync0(items, scenery) {
    const sig = JSON.stringify(items) + '|' + state.key;
    if (sig === state.sig) return;
    state.sig = sig;
    groups.things.children.slice().forEach((c) => { groups.things.remove(c); if (c.isInstancedMesh) c.dispose(); });
    const batches = new Map(); // geometry -> { mat, list: [matrix] , sway }
    const push = (geo, mat, x, y, z, ry, sway, s) => { if (!geo) return; const k = geo.uuid + mat.uuid; let bt = batches.get(k); if (!bt) batches.set(k, (bt = { geo, mat, list: [], sway })); bt.list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry || 0), new THREE.Vector3(s || 1, s || 1, s || 1))); };
    const occupied = new Set();
    items.forEach((it) => {
      for (let y = it.y; y < it.y + it.h; y++) for (let x = it.x; x < it.x + it.w; x++) occupied.add(x + ',' + y);
      const cx = it.x + it.w / 2, cz = it.y + it.h / 2;
      if (it.k === 'b') { const md = VB.buildingModel({ type: it.type, level: it.level, state: it.state, rot: it.rot }, { w0: it.w0, h0: it.h0 }, { art: it.art, cat: it.cat }); if (md) { push(md.geo, matSolid, cx, 0, cz); push(md.glow, matGlow, cx, 0, cz); } }
      else if (it.k === 'l' && it.kind && VB.hasExtra(it.kind)) { const md = VB.extraModel(it.kind, it.on); if (md) { push(md.geo, matSolid, cx, 0, cz); push(md.glow, matGlow, cx, 0, cz); } }
      else if (it.k === 'o') { const md = VB.natureModel(it.type, it.seed, it.w, it.h); if (md) { const ry = (it.seed % 4) * Math.PI / 2, sway = it.type === 'oak' || it.type === 'pine' || it.type === 'bush'; push(md.geo, sway ? matSway : matSolid, cx, 0, cz, ry, sway); push(md.glow, matGlow, cx, 0, cz, ry); } }
    });
    // scenery trees on hills, ledges and loose chunks, and meadow details, skipping anything occupied
    (scenery || []).forEach((sc) => { if (occupied.has(sc.cx + ',' + sc.cz)) return; const md = VB.natureModel(sc.kind, sc.seed); if (md) push(md.geo, matSway, sc.x, sc.y, sc.z, sc.ry, true, sc.s); });
    batches.forEach((bt) => {
      const im = new THREE.InstancedMesh(bt.geo, bt.mat, bt.list.length); bt.list.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true;
      if (bt.mat !== matGlow) { im.castShadow = true; im.receiveShadow = true; }
      im.computeBoundingSphere(); groups.things.add(im);
    });
    buildDetail(occupied);
    state.shadowDirty = true; state.dirty = true;
  }
  // meadow details: grass blades, flowers and pebbles (one instanced mesh of small blocks)
  function buildDetail(occupied) {
    if (detail) { groups.things.remove(detail); detail.dispose(); detail = null; }
    if (!terr) return;
    const list = [];
    terr.colAt.forEach((v, k) => {
      const [X, Z] = k.split(',').map(Number), c = v.c; if (occupied.has(c.x + ',' + c.y)) return;
      const y0 = v.top * TV, h = hash(X, Z, 91);
      if ((c.kind === 'grass' || c.kind === 'hill') && v.top >= 0) {
        // small clumps of 2-3 short blades, a shade lighter or darker than the turf
        if (h < 0.16) { const bx = X * TV + 0.08 + hash(X, Z, 93) * 0.3, bz = Z * TV + 0.08 + hash(Z, X, 94) * 0.3, n = 2 + Math.floor(hash(X, Z, 92) * 2); for (let i = 0; i < n; i++) list.push([bx + (i % 2) * DV, y0, bz + (i >> 1) * DV, 1, 1 + Math.floor(hash(X + i, Z, 95) * 2), 1, pick([PAL.grass[3], PAL.grass[4], PAL.grassDark[0]], hash(i, X, Z))]); }
        else if (h < 0.23) { const x = X * TV + 0.1 + hash(X, Z, 96) * 0.3, z = Z * TV + 0.1 + hash(Z, X, 97) * 0.3; list.push([x, y0, z, 1, 2, 1, PAL.leafDark[0]]); list.push([x - DV / 2, y0 + 2 * DV, z - DV / 2, 2, 1, 2, pick(PAL.flowers, hash(X, Z, 98))]); }
      } else if (c.kind === 'path' && h < 0.12) list.push([X * TV + 0.1 + hash(X, Z, 99) * 0.3, y0, Z * TV + 0.15, 2, 1, 2, pick(PAL.pathStone, h * 8)]);
      else if (c.kind === 'sand' && h < 0.08) list.push([X * TV + 0.2, y0, Z * TV + 0.2, 2, 1, 1, '#ffffff']);
    });
    if (!list.length) return;
    const geo = new THREE.BoxGeometry(DV, DV, DV); geo.translate(DV / 2, DV / 2, DV / 2); disposables.push(geo);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), list.length), m = new THREE.Matrix4(), c = new THREE.Color();
    list.forEach(([x, y, z, sx, sy, sz, col], i) => { m.makeScale(sx, sy, sz).setPosition(x, y, z); im.setMatrixAt(i, m); im.setColorAt(i, c.set(col)); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.receiveShadow = true; detail = im; groups.things.add(im);
  }

  /* ---- camera: same view as the 2D layer ---- */
  function setView(cam, view) {
    state.view = { x: cam.x, y: cam.y, z: cam.z, w: view.w, h: view.h };
    const t = fromIso(cam.x, cam.y), k = 1 / (UNIT_PX * cam.z);
    camera.left = -view.w / 2 * k; camera.right = view.w / 2 * k; camera.top = view.h / 2 * k; camera.bottom = -view.h / 2 * k;
    camera.position.copy(t).addScaledVector(BACK, 60); camera.lookAt(t); camera.updateProjectionMatrix();
    const pr = Math.min(window.devicePixelRatio || 1, saver() ? 1 : COARSE ? 1.5 : 2);
    if (R.getPixelRatio() !== pr) R.setPixelRatio(pr);
    const sz = R.getSize(new THREE.Vector2()); if (sz.x !== view.w || sz.y !== view.h) R.setSize(view.w, view.h, true);
    state.dirty = true; kick();
  }
  const saver = () => !!(A && A.Perf && A.Perf.saver());
  const resting = () => !!(A && A.Perf && (A.Perf.resting() || A.Perf.hidden())) || document.body.classList.contains('perf-covered');
  const calm = () => !!(A && A.State && A.State.state && A.State.state.settings && A.State.state.settings.reduceMotion);

  /* ---- render loop: on demand, plus a slow ambient tick ---- */
  // slow: set when the device cannot keep the ambient tick (frames arriving under ~8 per second while animating, e.g.
  // no GPU and WebGL falling back to software). The island then only redraws when something changes.
  let raf = 0, last = 0, t0 = performance.now(), frames = 0, drawMs = 0, slow = false, prev = 0, gaps = [];
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  function loop(now) {
    raf = 0; if (!R.domElement.isConnected) return;
    const animate = !slow && !saver() && !resting() && !calm();
    if (animate && prev && now - prev < 2000) { gaps.push(now - prev); if (gaps.length > 6) gaps.shift(); if (gaps.length >= 6 && gaps.reduce((a, b) => a + b, 0) / gaps.length > 125) { slow = true; if (window.console) console.info('Voxel island: slow frames, ambient animation off'); } }
    prev = animate ? now : 0;
    if (animate && now - last >= 1000 / AMBIENT_FPS - 2) { tickAmbient((now - t0) / 1000, Math.min(0.2, (now - last) / 1000)); last = now; state.dirty = true; }
    if (state.dirty) draw();
    if (animate) raf = requestAnimationFrame(loop);
  }
  function tickAmbient(t, dt) {
    uni.uTime.value = t;
    clouds.forEach((c) => { const d = c.userData.drift; if (d) c.position.x = d.x0 + Math.sin(t * d.sp * 0.3 + d.ph) * 1.2; const b = c.userData.bob; if (b) c.position.y = b.y0 + Math.sin(t * 1.2 + b.ph) * 0.06; });
    if (motes) { const u = motes.userData, p = u.mp; for (let i = 0; i < u.N; i++) { p[i * 3 + 1] += dt * 0.25; p[i * 3] += Math.sin(t * 0.7 + u.seed[i]) * dt * 0.08; if (p[i * 3 + 1] > 3.2) p[i * 3 + 1] = 0.1; } motes.geometry.attributes.position.needsUpdate = true; }
  }
  function draw() {
    if (!state.view) return;
    const s0 = performance.now();
    sun.castShadow = !saver();
    if (state.shadowDirty && sun.castShadow) { R.shadowMap.needsUpdate = true; state.shadowDirty = false; }
    R.render(scene, camera); state.dirty = false; frames++; drawMs += performance.now() - s0;
  }
  return {
    canvas: R.domElement,
    setTerrain, sync, setView, kick,
    redraw() { state.dirty = true; kick(); },
    has: (k, art, cat, st) => (k === 'b' ? VB.hasBuilding(art, cat) && st !== 'constructing' : k === 'l' ? VB.hasExtra(art) : VB.hasNature(art)),
    stats() { const i = R.info; return { frames, avgDrawMs: frames ? +(drawMs / frames).toFixed(2) : 0, calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, shadow: sun.castShadow, pixelRatio: R.getPixelRatio(), slow, terrainMs: cost.terrainMs, syncMs: cost.syncMs }; },
    dispose() { if (raf) cancelAnimationFrame(raf); raf = 0; clearGroup(groups.terrain); groups.things.children.slice().forEach((c) => { groups.things.remove(c); if (c.isInstancedMesh) c.dispose(); }); state = { things: new Map(), sig: '' }; },
  };
}
