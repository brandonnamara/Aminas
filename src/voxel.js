/* Aminas — voxel creature engine (no dependencies).
   A creature is sculpted in code from simple solids (ellipsoids, capsules, boxes) on a voxel grid, then drawn as
   lit isometric blocks onto a 2D canvas: the same block language as the voxel island. Models are built once per
   species and stage and cached; sprites are cached per size, so the island, cards and battles only blit images.
   Works in Node (model building, tests) and the browser (rendering). */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const V = (A.Voxel = {});

  /* ---------- colour helpers ---------- */
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  V.shade = (h, k) => { const c = hex(h); return toHex(c.map((v) => (k >= 0 ? v + (255 - v) * k : v * (1 + k)))); };
  V.mix = (a, b, t) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };

  /* ---------- deterministic noise ---------- */
  V.hash = (x, y, z, s) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + (s | 0) * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // Cellular plates: returns {id, edge} where edge is the gap to the second-nearest cell centre (small = seam).
  V.cells = function (x, y, z, size, seed) {
    const cx = Math.floor(x / size), cy = Math.floor(y / size), cz = Math.floor(z / size);
    let d1 = 1e9, d2 = 1e9, id = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      const gx = cx + i, gy = cy + j, gz = cz + k;
      const px = (gx + V.hash(gx, gy, gz, seed)) * size, py = (gy + V.hash(gx, gy, gz, seed + 1)) * size, pz = (gz + V.hash(gx, gy, gz, seed + 2)) * size;
      const d = Math.hypot(x - px, y - py, z - pz);
      if (d < d1) { d2 = d1; d1 = d; id = (gx * 73856093) ^ (gy * 19349663) ^ (gz * 83492791); } else if (d < d2) d2 = d;
    }
    return { id: id >>> 0, edge: d2 - d1 };
  };

  /* ---------- models ---------- */
  // A model is a sparse map "x,y,z" -> {c: colour, g: glow 0..1}. y is up; the creature faces +x.
  V.Model = function () { this.v = new Map(); this.min = [1e9, 1e9, 1e9]; this.max = [-1e9, -1e9, -1e9]; };
  const P = V.Model.prototype;
  const key = (x, y, z) => x + ',' + y + ',' + z;
  // Phase 8 parts: a model may be split into named parts that the 3D view animates separately (heads, jaws, eyelids,
  // wings, tail, cannon…). Set m.part before sculpting a part; every voxel remembers it. m.pivot(name, at, parent)
  // gives a part its joint (in voxel coordinates) and its parent part. 2D drawing ignores parts entirely.
  P.pivot = function (name, at, parent, o) { (this.pivots = this.pivots || {})[name] = Object.assign({ at: at.slice(), parent: parent || null }, o || {}); return this; };
  P.set = function (x, y, z, c, g) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    if (c == null) { this.v.delete(key(x, y, z)); return; }
    this.v.set(key(x, y, z), this.part ? { c, g: g || 0, p: this.part } : { c, g: g || 0 });
    if (x < this.min[0]) this.min[0] = x; if (y < this.min[1]) this.min[1] = y; if (z < this.min[2]) this.min[2] = z;
    if (x > this.max[0]) this.max[0] = x; if (y > this.max[1]) this.max[1] = y; if (z > this.max[2]) this.max[2] = z;
  };
  // hidden voxels: only the 3D view uses them (eyelids that close for a blink); never drawn in 2D or counted
  P.hide = function (part, x, y, z, c, g) { (this.hid = this.hid || new Map()).set(key(Math.round(x), Math.round(y), Math.round(z)), { c, g: g || 0, p: part }); };
  P.get = function (x, y, z) { return this.v.get(key(x, y, z)); };
  P.has = function (x, y, z) { return this.v.has(key(x, y, z)); };
  P.count = function () { return this.v.size; };
  // fill(test, colour): test(x,y,z) inside the bounding box; colour may be a function (x,y,z) -> colour or {c,g}
  P.fill = function (bb, test, col, mode) {
    for (let x = Math.floor(bb[0]); x <= Math.ceil(bb[3]); x++) for (let y = Math.floor(bb[1]); y <= Math.ceil(bb[4]); y++) for (let z = Math.floor(bb[2]); z <= Math.ceil(bb[5]); z++) {
      if (!test(x, y, z)) continue;
      if (mode === 'paint' && !this.has(x, y, z)) continue;
      if (mode === 'under' && this.has(x, y, z)) continue;
      if (mode === 'carve') { this.set(x, y, z, null); continue; }
      const r = typeof col === 'function' ? col(x, y, z) : col;
      if (r == null) continue;
      if (typeof r === 'string') this.set(x, y, z, r, 0); else this.set(x, y, z, r.c, r.g);
    }
    return this;
  };
  P.ellipsoid = function (cx, cy, cz, rx, ry, rz, col, mode) {
    return this.fill([cx - rx, cy - ry, cz - rz, cx + rx, cy + ry, cz + rz], (x, y, z) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1, col, mode);
  };
  P.box = function (x0, y0, z0, x1, y1, z1, col, mode) { return this.fill([x0, y0, z0, x1, y1, z1], () => true, col, mode); };
  // capsule between two points, radius may taper from r0 to r1
  P.capsule = function (a, b, r0, r1, col, mode) {
    r1 = r1 == null ? r0 : r1; const R = Math.max(r0, r1);
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1;
    return this.fill([Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.min(a[2], b[2]) - R, Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, Math.max(a[2], b[2]) + R], (x, y, z) => {
      let t = ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L2; t = Math.max(0, Math.min(1, t));
      const px = a[0] + d[0] * t - x, py = a[1] + d[1] * t - y, pz = a[2] + d[2] * t - z, r = r0 + (r1 - r0) * t;
      return px * px + py * py + pz * pz <= r * r;
    }, typeof col === 'function' ? (x, y, z) => { let t = ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L2; return col(x, y, z, Math.max(0, Math.min(1, t))); } : col, mode);
  };
  // mirror every voxel with z>0 to -z (left/right symmetry); call after sculpting one side
  // swap: optional part renames for the mirrored side (e.g. { earL: 'earR' })
  P.mirrorZ = function (swap) { const add = []; this.v.forEach((val, k) => { const p = k.split(',').map(Number); if (p[2] > 0) add.push([p[0], p[1], -p[2], val]); }); const was = this.part; add.forEach((p) => { this.part = p[3].p ? (swap && swap[p[3].p]) || p[3].p : undefined; this.set(p[0], p[1], p[2], p[3].c, p[3].g); }); this.part = was; return this; };
  // drop the model so its lowest voxel sits on y = 0 (part joints move with it)
  P.ground = function () { const dy = -this.min[1]; if (!dy) return this; const old = this.v, was = this.part; this.v = new Map(); this.min = [1e9, 1e9, 1e9]; this.max = [-1e9, -1e9, -1e9]; old.forEach((val, k) => { const p = k.split(',').map(Number); this.part = val.p; this.set(p[0], p[1] + dy, p[2], val.c, val.g); }); this.part = was; if (this.pivots) Object.values(this.pivots).forEach((pv) => { pv.at[1] += dy; }); return this; };
  // Voxels with at least one exposed face towards the viewer (top, +x, +z). Order is set per view when drawing.
  P.visible = function () {
    const out = [];
    this.v.forEach((val, k) => {
      const p = k.split(',').map(Number), x = p[0], y = p[1], z = p[2];
      const top = !this.has(x, y + 1, z), right = !this.has(x + 1, y, z), front = !this.has(x, y, z + 1);
      if (top || right || front) out.push({ x, y, z, c: val.c, g: val.g, top, right, front, ao: this.has(x - 1, y + 1, z) || this.has(x, y + 1, z - 1) });
    });
    return out;
  };

  /* ---------- views ----------
     A view is an orthographic camera looking from the +x / +z / +y octant: yaw turns it from the creature's side
     (+z, yaw 0) towards its front (+x, yaw 90°); pitch lifts it. 'iso' matches the island; 'card' is a low
     three-quarter view like the reference cards (creatures face right). */
  V.VIEWS = { iso: { yaw: 45, pitch: 30, iso: true }, card: { yaw: 32, pitch: 16 } };
  function viewOf(o) {
    const v = typeof o === 'string' ? V.VIEWS[o] : o || V.VIEWS.iso;
    if (v._p) return v;
    if (v.iso) { v._p = (x, y, z) => [x - z, (x + z) / 2 - y, x + y + z]; return v; }
    const yw = v.yaw * Math.PI / 180, pt = v.pitch * Math.PI / 180, sy = Math.sin(yw), cy = Math.cos(yw), sp = Math.sin(pt), cp = Math.cos(pt);
    // camera direction d = (sy·cp, sp, cy·cp); screen right r = (cy, 0, −sy); screen up u = (−sy·sp, cp, −cy·sp)
    v._p = (x, y, z) => [x * cy - z * sy, x * sy * sp - y * cp + z * cy * sp, x * sy * cp + y * sp + z * cy * cp];
    return v;
  }
  V.view = viewOf;
  // 2D bounds of a model for voxel size s in a view
  V.bounds = function (m, s, view) {
    const P3 = viewOf(view)._p; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const x of [m.min[0], m.max[0] + 1]) for (const y of [m.min[1], m.max[1] + 1]) for (const z of [m.min[2], m.max[2] + 1]) {
      const q = P3(x, y, z); x0 = Math.min(x0, q[0] * s); x1 = Math.max(x1, q[0] * s); y0 = Math.min(y0, q[1] * s); y1 = Math.max(y1, q[1] * s);
    }
    return { x0, y0, x1, y1, w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) };
  };
  // draw(ctx, model, {s, ox, oy, view, outline, glowAlpha, tint}) — ox/oy: canvas position of the model origin
  V.draw = function (ctx, m, o) {
    const s = o.s, vw = viewOf(o.view), P3 = vw._p, tint = o.tint || null;
    const vis = (o.vis || m.visible()).slice().sort((a, b) => P3(a.x, a.y, a.z)[2] - P3(b.x, b.y, b.z)[2]);
    const P2 = (x, y, z) => { const q = P3(x, y, z); return [o.ox + q[0] * s, o.oy + q[1] * s]; };
    const line = o.outline !== false ? Math.max(0.6, s * 0.09) : 0;
    ctx.lineJoin = 'round';
    const face = (pts, col) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); if (line) { ctx.strokeStyle = V.shade(col, -0.38); ctx.lineWidth = line; ctx.stroke(); } };
    for (const v of vis) {
      const base = tint ? V.mix(v.c, tint, 0.55) : v.c;
      const x = v.x, y = v.y, z = v.z;
      const a = P2(x, y + 1, z), b = P2(x + 1, y + 1, z), c = P2(x + 1, y + 1, z + 1), d = P2(x, y + 1, z + 1);
      const e = P2(x + 1, y, z), f = P2(x + 1, y, z + 1), g = P2(x, y, z + 1);
      if (v.top) face([a, b, c, d], V.shade(base, v.g ? 0.35 : v.ao ? 0.02 : 0.16));
      if (v.right) face([b, e, f, c], V.shade(base, v.g ? 0.1 : vw.iso ? -0.12 : -0.22));
      if (v.front) face([d, c, f, g], V.shade(base, v.g ? 0 : vw.iso ? -0.3 : -0.06));
    }
    // glow: soft additive halo over glowing voxels (one pass)
    if (o.glowAlpha !== 0) {
      const glow = vis.filter((v) => v.g > 0.5);
      if (glow.length) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const v of glow) { const p = P2(v.x + 0.5, v.y + 0.5, v.z + 0.5), r = s * 1.6; const gr = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r); gr.addColorStop(0, v.c + '30'); gr.addColorStop(1, v.c + '00'); ctx.fillStyle = gr; ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2); }
        ctx.restore();
      }
    }
  };

  /* ---------- species registry and sprite cache ---------- */
  V.SPECIES = {};      // id -> function(stage) -> Model  (stage 1..3)
  const models = new Map(), sprites = new Map();
  V.register = (id, fn) => { V.SPECIES[id] = fn; };
  V.has = (id) => !!V.SPECIES[id];
  V.model = function (id, stage) {
    const k = id + '#' + (stage || 1);
    if (!models.has(k)) { const m = V.SPECIES[id](stage || 1); m.ground(); m._vis = m.visible(); models.set(k, m); }
    return models.get(k);
  };
  // A sprite canvas for a species/stage at a target box size (px). The voxel size is chosen so the model fits.
  V.sprite = function (id, stage, size, o) {
    o = o || {};
    const k = id + '#' + stage + '#' + size + '#' + (o.tint || '') + '#' + (o.fixedS || '') + '#' + (typeof o.view === 'string' ? o.view : o.view ? o.view.yaw + '/' + o.view.pitch : 'card');
    if (sprites.has(k)) return sprites.get(k);
    const m = V.model(id, stage), dpr = (root.devicePixelRatio || 1) > 1.5 ? 2 : 1;
    const view = o.view || 'card', b1 = V.bounds(m, 1, view), s = o.fixedS || Math.min((size * 0.94) / b1.w, (size * 0.94) / b1.h);
    const b = V.bounds(m, s, view);
    const cv = document.createElement('canvas'); cv.width = Math.ceil(size * dpr); cv.height = Math.ceil(size * dpr);
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const ox = (size - b.w) / 2 - b.x0, oy = size - 2 - b.y1;
    // contact shadow
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(size / 2, size - 2 - b.w * 0.06, b.w * 0.36, b.w * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    V.draw(ctx, m, { s, ox, oy, vis: m._vis, tint: o.tint, view });
    sprites.set(k, cv);
    if (sprites.size > 160) sprites.delete(sprites.keys().next().value); // keep memory bounded
    return cv;
  };
  V.dataUrl = (id, stage, size, o) => V.sprite(id, stage, size, o).toDataURL('image/png');
  V.clearCache = () => { sprites.clear(); };
})(typeof window !== 'undefined' ? window : globalThis);
