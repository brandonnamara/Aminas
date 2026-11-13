/* Aminas — voxel sculpting kit: shared parts (eyes, flames, tufts, wings, leaf clumps, plating) used by the species
   sculpts. Everything is deterministic: the same species and stage always produce the same blocks. */
(function (root) {
  'use strict';
  const V = root.A.Voxel;
  const K = (V.kit = {});
  const R = Math.round;

  // colour pickers
  K.cellsOf = (cols, size, seed) => (x, y, z) => cols[V.cells(x, y, z, size, seed).id % cols.length];
  K.noise = (cols, seed) => (x, y, z) => cols[Math.floor(V.hash(x, y, z, seed) * cols.length) % cols.length];
  K.glow = (c, g) => ({ c, g: g == null ? 1 : g });
  K.sym = (fn) => { fn(1); fn(-1); };
  const norm = (d) => { const L = Math.hypot(d[0], d[1], d[2]) || 1; return [d[0] / L, d[1] / L, d[2] / L]; };
  const add = (a, d, t) => [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t];
  K.add = add; K.norm = norm;

  // Last solid voxel walking out from c along direction (yaw ang from +x towards +z, elevation el), or null.
  K.surface = function (m, c, ang, el, maxR) {
    const a = ang * Math.PI / 180, e = (el || 0) * Math.PI / 180, d = [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
    let p = null;
    for (let t = 0; t <= (maxR || 30); t += 0.25) { const q = add(c, d, t), r = [R(q[0]), R(q[1]), R(q[2])]; if (m.has(r[0], r[1], r[2])) p = r; else if (p) break; }
    return p;
  };
  // Eyes painted on a head's surface. o: {ang (deg from front), el, size 1|2, iris, pupil, white, glow, tall}
  K.eyes = function (m, c, o) {
    const out = [];
    [1, -1].forEach((sd) => {
      const deg = (o.yaw || 0) + sd * (o.ang || 30), p = K.surface(m, c, deg, o.el || 10, 30); if (!p) return;
      const a = deg * Math.PI / 180, t = [-Math.sin(a), 0, Math.cos(a)]; // tangent across the face
      const D = V.detail ? V.detail() : 1, sz = Math.max(1, Math.round((o.size || 1) * D)), tl = Math.max(1, Math.round((o.tall || o.size || 1) * D)), cells = [];   // Phase 15B: eyes keep their size on a finer grid
      for (let i = 0; i < sz; i++) for (let j = 0; j < tl; j++) cells.push([R(p[0] + t[0] * i * sd), p[1] + j, R(p[2] + t[2] * i * sd), i, j]);
      cells.forEach(([x, y, z, i, j]) => {
        // bring the eye voxel to the surface along the outward direction so it is never buried
        let q = [x, y, z]; for (let k = 0; k < 3 && !m.has(q[0], q[1], q[2]); k++) q = [R(q[0] - Math.cos(a)), q[1], R(q[2] - Math.sin(a))];
        const top = j === tl - 1, inner = sz > 1 && i === 0;
        const col = o.white && top && !inner ? o.white : sz > 1 && !top && inner && o.pupil ? o.pupil : o.iris;
        m.set(q[0], q[1], q[2], col, col === o.iris && o.glow !== false ? 1 : 0);
      });
      if (o.lid) m.set(p[0], p[1] + tl, p[2], o.lid);
      out.push(p);
    });
    return out;
  };
  // Tapered spike / hair tuft from base along dir
  K.tuft = function (m, base, dir, len, r0, col, mode) { const d = norm(dir); return m.capsule(base, add(base, d, len), r0, Math.max(0.45 * V.detail(), r0 * 0.25), col, mode); };
  // A flame: a bent stack of tapering blobs, brighter (and glowing) towards the core. cols: [outer, mid, core]
  K.flame = function (m, base, dir, len, r, cols, seed, o) {
    o = o || {}; let d = norm(dir), p = base.slice(); const n = Math.max(3, R(len / 1.6));
    for (let i = 0; i < n; i++) {
      const t = i / n, rr = Math.max(0.5 * V.detail(), r * (1 - t * 0.85));
      const wob = [(V.hash(i, seed, 1, 3) - 0.5) * 0.9, 0, (V.hash(i, seed, 2, 3) - 0.5) * 0.9];
      const q = add(p, norm([d[0] + wob[0] + (o.lean || 0) * t, d[1], d[2] + wob[2]]), len / n);
      m.capsule(p, q, rr, rr * 0.85, (x, y, z) => {
        const k = Math.hypot(x - q[0], z - q[2]) / (rr + 0.01);
        const col = k < 0.45 && t < 0.7 ? cols[2] : k < 0.85 ? cols[1] : cols[0];
        return { c: col, g: col === cols[2] ? 1 : 0.45 };
      }, o.mode);
      p = q;
    }
    return p;
  };
  // A fan of flames (a mane): count flames spread over an arc around dir
  K.mane = function (m, base, dir, len, r, cols, seed, count, spread) {
    for (let i = 0; i < count; i++) {
      const f = count > 1 ? i / (count - 1) - 0.5 : 0, d = norm([dir[0] - f * (spread || 1.2) * 0.4, dir[1] + Math.abs(f) * -0.3, dir[2] + f * (spread || 1.2)]);
      K.flame(m, add(base, [0, 0, f * r * 2.4], 1), d, len * (1 - Math.abs(f) * 0.5), r * (1 - Math.abs(f) * 0.3), cols, seed + i);
    }
  };
  // Feathered / membrane wing on side sd (+1 = +z). root: shoulder; span; o: {cols:[...rows], up, back, droop, membrane}
  K.wing = function (m, root, sd, span, o) {
    o = o || {}; const cols = o.cols || ['#ffffff'], D = V.detail(), bone = (o.bone || 1.1) * D;
    const elbow = add(root, norm([-(o.back || 0.4), o.up == null ? 1 : o.up, sd * 1.1]), span * 0.45);
    const tip = add(elbow, norm([-(o.back || 0.4) * 1.4, (o.up == null ? 1 : o.up) * 0.7, sd * 0.9]), span * 0.6);
    m.capsule(root, elbow, bone, bone * 0.8, o.boneCol || cols[0]);
    m.capsule(elbow, tip, bone * 0.8, 0.5 * D, o.boneCol || cols[0]);
    const n = o.feathers || 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n, s = t < 0.5 ? add(root, [elbow[0] - root[0], elbow[1] - root[1], elbow[2] - root[2]], t * 2) : add(elbow, [tip[0] - elbow[0], tip[1] - elbow[1], tip[2] - elbow[2]], (t - 0.5) * 2);
      const L = span * (o.featherLen || 0.55) * (0.55 + t * 0.6) * (o.membrane ? 1 : 1);
      const fd = norm([-(o.sweep || 0.9) - t * 0.5, -(o.droop || 0.9), sd * (0.25 + t * 0.35)]);
      const rows = cols.length;
      m.capsule(s, add(s, fd, L), (o.membrane ? 1.1 : 0.85) * D, 0.55 * D, (x, y, z, tt) => {
        const c = cols[Math.min(rows - 1, Math.floor(tt * rows))];
        return o.glowTips && tt > 0.75 ? { c: o.glowTips, g: 1 } : c;
      });
      if (o.membrane && i < n) { // fill between this finger and the next
        const s2 = i + 1 <= n / 2 ? add(root, [elbow[0] - root[0], elbow[1] - root[1], elbow[2] - root[2]], ((i + 1) / n) * 2) : add(elbow, [tip[0] - elbow[0], tip[1] - elbow[1], tip[2] - elbow[2]], ((i + 1) / n - 0.5) * 2);
        for (let u = 0.25; u < 1; u += 0.25) m.capsule(add(s, [s2[0] - s[0], s2[1] - s[1], s2[2] - s[2]], u), add(add(s, [s2[0] - s[0], s2[1] - s[1], s2[2] - s[2]], u), fd, L * 0.85), 0.7 * D, 0.5 * D, o.membrane, 'under');
      }
    }
    return { elbow, tip };
  };
  // Leafy clump: lumpy blobs over an ellipsoid; cols leaf colours. Returns the list of blob centres (for berries).
  K.leaves = function (m, c, r, cols, seed, o) {
    o = o || {}; const n = o.n || R(r * r * 0.9), pts = [];
    m.ellipsoid(c[0], c[1], c[2], r[0] * 0.8, r[1] * 0.75, r[2] * 0.8, K.cellsOf(cols, 2.2, seed), o.mode);
    for (let i = 0; i < n; i++) {
      const u = V.hash(i, seed, 7, 1) * Math.PI * 2, v = (o.dome ? 0.15 : -0.4) + V.hash(i, seed, 8, 1) * (o.dome ? 0.85 : 1.4);
      const p = [c[0] + Math.cos(u) * Math.cos(v) * r[0], c[1] + Math.sin(v) * r[1], c[2] + Math.sin(u) * Math.cos(v) * r[2]];
      const br = (1.1 + V.hash(i, seed, 9, 1) * 1.3) * V.detail();
      m.ellipsoid(p[0], p[1], p[2], br, br * 0.8, br, cols[i % cols.length], o.mode);
      pts.push(p.map(R));
    }
    return pts;
  };
  // Dots on the surface near given points (berries, flowers, crystals)
  K.dots = function (m, pts, col, o) {
    o = o || {};
    pts.forEach((p, i) => {
      if (V.hash(i, o.seed || 1, 5, 5) > (o.p == null ? 0.5 : o.p)) return;
      let q = p.slice(); for (let k = 0; k < 4 && m.has(q[0], q[1] + 1, q[2]); k++) q[1]++;
      const c = typeof col === 'function' ? col(i) : col;
      m.set(q[0], q[1] + 1, q[2], c, o.g || 0);
      const sz = Math.round(V.detail()); if (sz > 1) for (let a = 0; a < sz; a++) for (let b = 0; b < sz; b++) for (let e = 0; e < sz; e++) m.set(q[0] + a, q[1] + 1 + b, q[2] + e, c, o.g || 0);
      if (o.big) { m.set(q[0] + 1, q[1] + 1, q[2], c, o.g || 0); m.set(q[0], q[1] + 1, q[2] + 1, c, o.g || 0); m.set(q[0], q[1] + 2, q[2], o.hi || c, o.g || 0); }
    });
  };
  // A crystal shard: hexagonal-ish prism tapering to a point
  K.crystal = function (m, base, dir, len, r, cols) {
    const d = norm(dir), tip = add(base, d, len);
    m.capsule(base, add(base, d, len * 0.6), r, r * 0.9, (x, y, z, t) => ({ c: (x + z) % 2 ? cols[0] : cols[1], g: 0.6 }));
    m.capsule(add(base, d, len * 0.6), tip, r * 0.9, 0.4, { c: cols[1], g: 1 });
  };
  // Paint plating cells on every voxel matching test (seams in seamCol, optional glowing seams)
  K.plates = function (m, test, o) {
    m.v.forEach((val, k) => {
      const p = k.split(',').map(Number); if (!test(p[0], p[1], p[2], val)) return;
      const c = V.cells(p[0], p[1], p[2], o.size, o.seed);
      if (c.edge < o.seam) m.set(p[0], p[1], p[2], o.seamCol, o.seamGlow ? 1 : 0);
      else m.set(p[0], p[1], p[2], o.cols[c.id % o.cols.length]);
    });
  };
  // Recolour voxels matching test with fn(x,y,z,val) -> colour | {c,g} | null(keep)
  K.recolour = function (m, test, fn) {
    const ch = [];
    m.v.forEach((val, k) => { const p = k.split(',').map(Number); if (!test(p[0], p[1], p[2], val)) return; const r = fn(p[0], p[1], p[2], val); if (r != null) ch.push([p, r]); });
    ch.forEach(([p, r]) => (typeof r === 'string' ? m.set(p[0], p[1], p[2], r, 0) : m.set(p[0], p[1], p[2], r.c, r.g)));
  };
  // Floating cubes (debris, data bits) around a centre
  K.bits = function (m, c, r, n, cols, seed, g) {
    for (let i = 0; i < n; i++) {
      const u = V.hash(i, seed, 1, 9) * Math.PI * 2, h = (V.hash(i, seed, 2, 9) - 0.3) * r[1], d = r[0] * (0.75 + V.hash(i, seed, 3, 9) * 0.35);
      const p = [R(c[0] + Math.cos(u) * d), R(c[1] + h), R(c[2] + Math.sin(u) * d * (r[2] / r[0]))];
      if (m.has(p[0], p[1], p[2])) continue;
      m.set(p[0], p[1], p[2], cols[i % cols.length], g == null ? 1 : g);
      const sz = Math.round(V.detail()); if (sz > 1) m.box(p[0], p[1], p[2], p[0] + sz - 1, p[1] + sz - 1, p[2] + sz - 1, { c: cols[i % cols.length], g: g == null ? 1 : g });
      if (V.hash(i, seed, 4, 9) > 0.6) m.set(p[0] + 1, p[1], p[2], cols[i % cols.length], g == null ? 1 : g);
    }
  };
  // Simple claws / toes at a foot centre, pointing +x
  K.toes = function (m, x, y, z, n, col, len) { const D = V.detail(), w = Math.max(1, Math.round(D)) - 1; for (let i = 0; i < n; i++) { const zz = z + (i - (n - 1) / 2) * 1.2 * D; m.box(x, y, zz, x + (len || 1) * D, y + w, zz + w, col); } };
})(typeof window !== 'undefined' ? window : globalThis);
