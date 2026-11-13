/* Aminas — Phase 15B: species work for the refined roster (see src/voxel-roster15.js; behind the Phase 15 developer
   switch, off by default). Each hook receives a line's model after its own builder has run on the finer grid, and adds
   or reshapes only the features the brief names, in the line's own palette and on its own joints:
     H[vox] = (m, stage, d, lvl) => m      d: the block grid (1 = production), lvl: 'h' High or 'm' phones
   Nothing here changes names, stats, types or rules; the production models (detail 1, no hook) are untouched. */
(function (root) {
  'use strict';
  const A = root.A, V = A && A.Voxel, K = V && V.kit; if (!V || !K) return;
  const H = (V.ROSTER15_HOOKS = V.ROSTER15_HOOKS || {});
  const R = Math.round, add = K.add, norm = K.norm;
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // remove every block of the named parts (to rebuild a feature on the same joint)
  const drop = (m, parts) => { const del = []; m.v.forEach((v, k) => { if (parts.indexOf(v.p) >= 0) del.push(k); }); del.forEach((k) => m.v.delete(k)); };
  // A flat, tapering blade (ear, fin, feather, leaf): from base b along dir for length L, width W across `across`,
  // thickness T. prof(u) gives the half-width (0..1) at u = 0..1 along it; col(u, v, w) colours a block, where v is
  // -1..1 across and w -1..1 through (w > 0 on the side the normal faces). Returns nothing; draws into the current part.
  const blade = (m, b, dir, across, L, W, T, col, prof, mode) => {
    const d = norm(dir), a0 = norm(across), nrm = norm(cross(d, a0)), ac = norm(cross(nrm, d)), r = Math.max(L, W) + T + 1;
    prof = prof || ((u) => 1 - u);
    m.fill([b[0] - r, b[1] - r, b[2] - r, b[0] + r, b[1] + r, b[2] + r], (x, y, z) => {
      const p = [x - b[0], y - b[1], z - b[2]], u = dot(p, d) / L; if (u < 0 || u > 1) return false;
      const hw = W * prof(u); if (hw < 0.35) return false;
      return Math.abs(dot(p, ac)) <= hw && Math.abs(dot(p, nrm)) <= T / 2;
    }, (x, y, z) => { const p = [x - b[0], y - b[1], z - b[2]], u = dot(p, d) / L, hw = Math.max(0.5, W * prof(u)); return col(u, dot(p, ac) / hw, dot(p, nrm) / (T / 2 || 1)); }, mode);
  };
  V.blade15 = blade;
  // A filled triangle a-b-c of thickness T (a membrane between bones). col(la, lb, lc) gets the barycentric weights;
  // returning null leaves a gap (used for the scalloped trailing edge of a bat wing).
  const tri = (m, a, b, c, T, col, mode) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], n = norm(cross(e1, e2));
    const d11 = dot(e1, e1), d12 = dot(e1, e2), d22 = dot(e2, e2), den = d11 * d22 - d12 * d12; if (Math.abs(den) < 1e-6) return;
    const lo = [0, 1, 2].map((i) => Math.min(a[i], b[i], c[i]) - T), hi = [0, 1, 2].map((i) => Math.max(a[i], b[i], c[i]) + T);
    const bary = (x, y, z) => { const p = [x - a[0], y - a[1], z - a[2]], h = dot(p, n); if (Math.abs(h) > T / 2) return null;
      const q = [p[0] - n[0] * h, p[1] - n[1] * h, p[2] - n[2] * h], d1 = dot(q, e1), d2 = dot(q, e2), v = (d22 * d1 - d12 * d2) / den, w = (d11 * d2 - d12 * d1) / den;
      return v >= -0.02 && w >= -0.02 && v + w <= 1.02 ? [1 - v - w, v, w] : null; };
    m.fill([lo[0], lo[1], lo[2], hi[0], hi[1], hi[2]], (x, y, z) => !!bary(x, y, z), (x, y, z) => { const l = bary(x, y, z); return col(l[0], l[1], l[2], x, y, z); }, mode);
  };
  V.tri15 = tri;
  // A bat wing: arm bones shoulder → elbow → wrist, fingers fanning from the wrist, and membrane between the fingers
  // and back to the flank, its trailing edge scalloped between the finger tips. p: {r, el, wr, f:[tips], h} (absolute).
  const batWing = (m, p, o) => {
    const T = o.T, mem = o.mem, pts = [p.wr].concat(p.f, [p.h]);
    for (let i = 1; i < pts.length - 1; i++) tri(m, p.wr, pts[i], pts[i + 1], T, (lw, la, lb, x, y, z) => (lw < 0.3 * 4 * la * lb / ((la + lb) ** 2 || 1) && i < pts.length - 2 ? null : mem(x, y, z, lw)), 'under');
    tri(m, p.r, p.el, p.wr, T, (lw, la, lb, x, y, z) => mem(x, y, z, 1), 'under');
    tri(m, p.r, p.wr, p.h, T, (lw, la, lb, x, y, z) => mem(x, y, z, la), 'under');
    m.capsule(p.r, p.el, o.b0, o.b0 * 0.85, o.bone); m.capsule(p.el, p.wr, o.b0 * 0.85, o.b0 * 0.7, o.bone);
    p.f.forEach((f, i) => m.capsule(p.wr, f, o.b0 * 0.6, Math.max(0.45, o.b0 * 0.35), (x, y, z, t) => (o.tip && t > 0.82 ? o.tip : o.bone)));
    m.capsule(p.wr, add(p.wr, o.thumb, o.b0 * 1.8), o.b0 * 0.55, 0.45, o.claw);
  };

  /* ================================================================ UMBRIT II–III: the bat
     Brief: bat ears, a more expressive face, wing anatomy, cute to imposing. Umbrit I (the Phase 8 sculpt) already has
     its big pointed ears and stays as it is. Duskmantle: broad bat ears, small folded wings, fangs and a nose-leaf.
     Eclipsar: taller ears, great wings held half open behind the cloak, longer fangs. Same purple, same cloak. */
  H.umbrit = function (m, stage) {
    if (stage < 2 || !m.rig) return m;
    const k = [1, 1.25, 1.5][stage - 1] * V.detail(), S = (v) => v * k;
    const PU = ['#5a4a9a', '#4a3a88', '#6a58b0'], PL = '#a89be0', CR = '#f4e9ff', GL = '#b9a2ff', NV = '#1e1640', MB = '#2c2260';
    const lo = 3, hc = [S(3.8), S(11.2 + lo), 0], top = [hc[0] - S(0.4), hc[1] + S(2.6), 0];
    // ears: rebuilt on the same joints as broad, upright bat ears with a pale inner hollow and a dark rim
    drop(m, ['earL', 'earR']);
    K.sym((sd) => {
      const n = sd > 0 ? 'earL' : 'earR', b = K.add(top, [S(0.2), S(-0.6), sd * S(2.0)], 1), j = m.rig.joints[n];
      if (j) j.at = b.slice();
      const L = S(stage === 2 ? 4.6 : 5.6), W = S(stage === 2 ? 2.0 : 2.3), T = S(0.9);
      V.inPart(m, n, () => blade(m, b, [-0.15, 1, sd * 0.42], [0, 0, sd], L, W, T, (u, v, w) => {
        if (u > 0.9) return PU[1];
        if (w > 0.1 && Math.abs(v) < 0.62 && u > 0.08 && u < 0.84) return u > 0.55 ? GL : PL;
        return Math.abs(v) > 0.8 ? NV : PU[0];
      }, (u) => (u < 0.25 ? 0.75 + u : 1 - u) * 1.05));
    });
    // face: a small nose-leaf, fangs (longer on Eclipsar) and a darker brow that makes the eyes read as watchful
    V.inPart(m, 'head', () => {
      const fx = (dy, dz) => hc[0] + S(3.4) * Math.sqrt(Math.max(0, 1 - (dy / S(3.1)) ** 2 - (dz / S(3.3)) ** 2));
      const nl = [fx(-S(0.3), 0), hc[1] - S(0.3), 0];
      m.ellipsoid(nl[0] + S(0.15), nl[1] + S(0.1), 0, S(0.45), S(0.7), S(0.55), PU[2]);
      m.ellipsoid(nl[0] + S(0.45), nl[1] - S(0.25), 0, S(0.35), S(0.3), S(0.45), NV);
      K.sym((sd) => {
        const f = [fx(-S(1.4), S(0.7)) - S(0.2), hc[1] - S(1.45), sd * S(0.7)], len = S(stage === 2 ? 0.55 : 0.85);
        for (let i = 0; i <= R(len); i++) m.set(R(f[0]), R(f[1]) - i, R(f[2]), CR);
        // brow ridge
        const bw = [fx(S(1.3), S(1.4)) - S(0.1), hc[1] + S(1.3), sd * S(1.4)];
        m.capsule(bw, add(bw, [-0.4, 0.15, sd * 0.9], S(1.3)), Math.max(0.5, S(0.4)), 0.5, NV);
      });
    });
    // wings: bat anatomy on their own joints at the shoulders — arm, wrist with a thumb claw, three fingers and the
    // membrane between them. Folded at the sides on Duskmantle (cute, cape-like); held half open on Eclipsar (imposing)
    K.sym((sd) => {
      const n = sd > 0 ? 'wingL' : 'wingR', r = [S(-1.6), S(8.6 + lo), sd * S(3.0)], o = (v) => [r[0] + S(v[0]), r[1] + S(v[1]), r[2] + sd * S(v[2])];
      const P = stage === 2
        ? { r, el: o([-1.8, 2.0, 1.2]), wr: o([-3.0, 3.4, 2.0]), f: [o([-1.0, -3.4, 3.6]), o([-3.4, -4.6, 3.2]), o([-5.2, -2.6, 2.4])], h: [S(-3.4), S(5.6), sd * S(2.4)] }
        : { r, el: o([-1.0, 3.4, 2.6]), wr: o([-1.8, 6.4, 5.4]), f: [o([0.6, 0.4, 10.4]), o([-1.8, -2.6, 9.0]), o([-4.4, -2.6, 5.6])], h: [S(-3.6), S(6.0), sd * S(2.6)] };
      V.joint(m, n, r, null);
      V.inPart(m, n, () => batWing(m, P, { T: Math.max(1, S(0.55)), b0: Math.max(0.6, S(0.5)), bone: PU[0], claw: CR, tip: stage === 3 ? K.glow(GL, 0.6) : null, thumb: [0.3, 1, sd * 0.2],
        mem: (x, y, z, w) => (V.hash(x, y, z, 31) < 0.12 ? '#382c7a' : w > 0.7 ? '#33287a' : MB) }));
    });
    return m;
  };
  /* ================================================================ EMBERIX line: the fox
     Brief: a recognisable fox face, expressive ears, a refined muzzle, better tail anatomy. Same white and blue, same
     flame mane and tail flame. The blunt muzzle becomes a tapered fox snout with a dark nose, the ear tufts become
     broad pointed ears on their own joints (so they can twitch), white cheek ruffs frame the face, and the tail is
     fuller towards its flame. */
  H.emberix = function (m, stage) {
    const g = m.geo; if (!g || !m.rig) return m;
    const S = g.S, hr = g.hr, at = g.at, W = ['#ffffff', '#eef4ff', '#dfe9fb'], ICE = '#b3e5ff', BL = '#4a9bff', NV = '#2b3a4a';
    // old ear tufts (unjointed blue and ice blocks above the head)
    const eb = (sd) => at(-S(0.5), S(2.6), sd * S(2.2)), del = [];
    m.v.forEach((v, k) => { if (v.c !== BL && v.c !== ICE) return; const p = k.split(',').map(Number); if (p[1] < g.hc[1] + S(1.6)) return;
      if ([1, -1].some((sd) => { const b = eb(sd); return Math.hypot(p[0] - b[0], p[2] - b[2]) < S(2.4) && p[1] < b[1] + S(4); })) del.push(k); });
    del.forEach((k) => m.v.delete(k));
    K.sym((sd) => {
      const n = sd > 0 ? 'earL' : 'earR', b = at(-S(0.6), S(2.2), sd * S(1.9));
      V.joint(m, n, b, 'head');
      V.inPart(m, n, () => blade(m, b, [-0.2, 1, sd * 0.32], g.sv.map((c) => c * sd), S(4.2), S(1.9), S(1.0), (u, v, w) => {
        if (u > 0.74) return BL;
        if (w > 0.05 && Math.abs(v) < 0.55 && u > 0.08) return ICE;
        return W[u > 0.5 ? 1 : 0];
      }, (u) => (u < 0.2 ? 0.8 + u : 1.02 - u)));
    });
    V.inPart(m, 'head', () => {
      // tapered fox snout over the old muzzle, a dark nose at the tip, the mouth line and white cheek ruffs
      const a0 = at(hr * 0.55, -hr * 0.3, 0), tip = at(hr * 1.38, -hr * 0.42, 0), ax = [tip[0] - a0[0], tip[1] - a0[1], tip[2] - a0[2]], al = dot(ax, ax);
      // carve the blunt muzzle down to a taper first (only the part in front of the eyes)
      const cut = []; m.v.forEach((v, k) => { if (v.p !== 'head') return; const p = k.split(',').map(Number), t = (p[0] - g.hc[0]) * g.fd[0] + (p[2] - g.hc[2]) * g.fd[2]; if (t < hr * 0.6) return;
        const s = Math.max(0, Math.min(1, ((p[0] - a0[0]) * ax[0] + (p[1] - a0[1]) * ax[1] + (p[2] - a0[2]) * ax[2]) / al)), q = [a0[0] + ax[0] * s, a0[1] + ax[1] * s, a0[2] + ax[2] * s];
        if (Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > hr * (0.5 - 0.3 * s) + 0.6) cut.push(k); });
      cut.forEach((k) => m.v.delete(k));
      m.capsule(a0, tip, hr * 0.44, hr * 0.17, (x, y, z) => (y < tip[1] - hr * 0.12 ? W[2] : W[0]));
      m.ellipsoid(tip[0] + g.fd[0] * S(0.3), tip[1] + S(0.15), tip[2] + g.fd[2] * S(0.3), S(0.55), S(0.45), S(0.55), NV);
      K.sym((sd) => m.capsule(at(hr * 1.2, -hr * 0.55, sd * hr * 0.12), at(hr * 0.55, -hr * 0.52, sd * hr * 0.42), Math.max(0.5, S(0.22)), 0.45, '#6a7d96', 'paint'));
      K.sym((sd) => { const c0 = at(hr * 0.1, -hr * 0.45, sd * hr * 0.78); K.tuft(m, c0, [-0.5, -0.55, sd * 0.7], S(2.2), S(1.0), W[0]); K.tuft(m, K.add(c0, [0, S(0.8), 0], 1), [-0.7, -0.2, sd * 0.7], S(1.8), S(0.8), W[1]); });
    });
    if (m.rig.emit.mouth) m.rig.emit.mouth.at = at(hr * 1.45, -hr * 0.45, 0);
    // fuller brush tail, widest just below the flame
    V.inPart(m, 'tail', () => m.capsule(g.tb, g.tailTip, S(1.5), S(2.3), (x, y, z) => W[V.cells(x, y, z, 1.6, 77).id % 3], 'under'));
    return m;
  };

  /* ================================================================ ACINUS line: face definition
     Brief: more expressive eyes, better muzzle and mouth, a clearer face, readable at play scale. The plant-covered
     body and four-legged stance stay exactly as they are. Bigger eyes with a highlight, a stone brow above each, a
     broad snout pad with nostrils, and a mouth line that runs back from the snout. */
  H.acinus = function (m, stage) {
    const g = m.geo; if (!g || !m.rig) return m;
    const S = g.S, hr = g.hr, at = g.at, DK = '#2e3a1e';
    V.inPart(m, 'head', () => {
      const pad = at(hr * 1.0, -hr * 0.3, 0);
      m.ellipsoid(pad[0], pad[1], pad[2], S(1.2), S(1.0), S(1.5), '#b7cc82');
      K.sym((sd) => { const q = at(hr * 1.0 + S(1.0), -hr * 0.25, sd * S(0.6)); m.set(R(q[0]), R(q[1]), R(q[2]), DK); m.set(R(q[0]), R(q[1]) - 1, R(q[2]), DK); });
      K.sym((sd) => m.capsule(at(hr * 1.05, -hr * 0.62, sd * hr * 0.2), at(hr * 0.3, -hr * 0.55, sd * hr * 0.66), Math.max(0.55, S(0.3)), 0.5, DK, 'paint'));
      K.sym((sd) => { const b = at(hr * 0.42, hr * 0.42, sd * hr * 0.62); m.capsule(b, K.add(b, [-g.fd[0] * 0.5, 0.15, sd * 0.8], S(1.5)), Math.max(0.6, S(0.5)), 0.5, '#6b4f3a'); });
    });
    m.rig.eyes = m.rig.eyes.filter((e) => e.part !== 'head' && e.part !== 'core');
    V.inPart(m, 'head', () => K.eyes(m, [g.hc[0], g.hc[1], g.hc[2]], { yaw: g.fy, ang: 34, el: 14, size: 2, tall: 2, white: '#fffbe0', pupil: '#0b0f1e', iris: '#e8e04a', lid: '#3e5a24', glow: false }));
    return m;
  };
  /* ================================================================ VOLTAR line: the jester
     Brief: facial expression, hat geometry, magical detailing, hand gestures, stage presentation. Same purple and
     gold. The mask gets a proper curved grin and painted diamonds under the eyes, the hat lobes a harlequin diamond
     pattern, and a pleated gold-and-white ruff sits at the neck. */
  H.voltar = function (m, stage) {
    const g = m.geo; if (!g) return m;
    const S = g.S, hc = g.hc, hr = g.hr, PU = ['#8b00b8', '#6a0090', '#a020d0'], GD = '#ffa500', GL = '#ffd700', W = '#ffffff';
    const fy = 25 * Math.PI / 180, fd = [Math.cos(fy), 0, Math.sin(fy)], sv = [-Math.sin(fy), 0, Math.cos(fy)];
    const at = (d, up, side) => [hc[0] + fd[0] * d + sv[0] * side, hc[1] + up, hc[2] + fd[2] * d + sv[2] * side];
    const part = m.v.get(R(hc[0]) + ',' + R(hc[1]) + ',' + R(hc[2])), hp = (part && part.p) || 'head';
    V.inPart(m, hp, () => {
      // grin: an arc across the lower face, corners lifted
      let prev = null;
      for (let i = 0; i <= 8; i++) { const t = i / 8 - 0.5, q = at(hr * 1.2, -hr * 0.42 + Math.abs(t) * Math.abs(t) * hr * 1.0, t * hr * 1.25); if (prev) m.capsule(prev, q, Math.max(0.55, S(0.28)), Math.max(0.55, S(0.28)), PU[1], 'paint'); prev = q; }
      // painted diamonds under each eye
      K.sym((sd) => { const c = at(hr * 1.2, -hr * 0.05, sd * hr * 0.52); m.fill([c[0] - hr, c[1] - hr, c[2] - hr, c[0] + hr, c[1] + hr, c[2] + hr], (x, y, z) => Math.abs(y - c[1]) / S(0.75) + Math.hypot(x - c[0], z - c[2]) / S(0.45) <= 1, PU[2], 'paint'); });
    });
    // harlequin pattern on the hat's purple lobes
    K.recolour(m, (x, y, z, v) => y > hc[1] + hr * 0.6 && (v.c === PU[0] || v.c === GD) && !(Math.abs(y - (hc[1] + S(1.8))) < S(0.9)), (x, y, z, v) => {
      const a = Math.floor((x + y) / S(1.3)) + Math.floor((z + y) / S(1.3)); return (a & 1) ? (v.c === PU[0] ? PU[2] : '#ffbf3a') : null; });
    // pleated ruff at the neck: alternating gold and white points
    const ny = g.top + S(0.9);
    V.inPart(m, 'core', () => { const n = 14; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, c = [S(0.6) + Math.cos(a) * S(1.9), ny, Math.sin(a) * S(2.3)];
      K.tuft(m, c, [Math.cos(a), -0.25, Math.sin(a)], S(1.5 + stage * 0.2), Math.max(0.6, S(0.6)), i % 2 ? W : GD); } });
    return m;
  };

  /* ================================================================ ZEEP line: the little machine's face
     Brief: recognisable eyes, muzzle and mouth, clearer facial structure, mechanical details. Same compact black
     shell and cyan seams. A visor brow over the eyes, a short snout plate with a glowing grille mouth, side vents
     like ears, and rivets around the face. */
  H.zeep = function (m, stage) {
    if (!m.rig) return m;
    const k = [0.85, 1.2, 1.55][stage - 1] * V.detail(), S = (v) => v * k, DK = ['#12161c', '#1b2129', '#262e38', '#0c0f14'], CY = '#22d8ff', ICE = '#9ff0ff';
    const hc = [S(8.6), S(4), 0], fy = 30 * Math.PI / 180, fd = [Math.cos(fy), 0, Math.sin(fy)], sv = [-Math.sin(fy), 0, Math.cos(fy)];
    const at = (d, up, side) => [hc[0] + fd[0] * d + sv[0] * side, hc[1] + up, hc[2] + fd[2] * d + sv[2] * side];
    V.inPart(m, 'head', () => {
      // visor brow: a dark ridge arching over both eyes
      for (let i = -6; i <= 6; i++) { const t = i / 6, q = at(S(2.75) - Math.abs(t) * S(0.6), S(1.75) - t * t * S(0.3), t * S(2.6)); m.ellipsoid(q[0], q[1], q[2], Math.max(0.6, S(0.45)), Math.max(0.6, S(0.4)), Math.max(0.6, S(0.45)), DK[3], 'under'); }
      // snout plate with a three-bar grille mouth
      const sn = at(S(2.6), -S(1.1), 0);
      m.ellipsoid(sn[0], sn[1], sn[2], S(1.4), S(1.0), S(1.6), K.cellsOf([DK[2], DK[1]], 1.2, 17), 'under');
      for (let j = 0; j < 3; j++) { const a = at(S(3.85), -S(0.75) - j * S(0.42), -S(0.85)), b = at(S(3.85), -S(0.75) - j * S(0.42), S(0.85));
        m.capsule(a, b, 0.5, 0.5, (x, y, z) => (m.has(x, y, z) ? { c: j === 1 ? ICE : CY, g: 1 } : null), 'paint'); }
      // ear vents and rivets
      K.sym((sd) => { const e = at(-S(0.4), S(1.2), sd * S(3.1)); m.box(R(e[0] - S(0.9)), R(e[1] - S(0.5)), R(e[2]) - (sd > 0 ? 0 : 1), R(e[0] + S(0.6)), R(e[1] + S(1.4)), R(e[2]) + (sd > 0 ? 1 : 0), DK[2]);
        for (let j = 0; j < 3; j++) m.set(R(e[0] - S(0.6) + j * S(0.5)), R(e[1] + S(0.4)), R(e[2]) + (sd > 0 ? 2 : -2), CY, 1);
        [[-1.2, 2.6], [0.2, 3.1], [1.4, 2.4]].forEach(([u, v]) => { const q = K.surface(m, hc, (fy * 180 / Math.PI) + sd * 62, u * 14, 10); if (q) m.set(q[0], q[1], q[2], ICE); }); });
    });
    if (m.rig.emit.mouth) m.rig.emit.mouth.at = at(S(4), -S(1.1), 0);
    return m;
  };
  /* ================================================================ KAIRYU line: the monkey
     Brief: refine face, hands, posture, movement; keep it monkey-like (not a dragon), blue and white. A heavier brow,
     a curved smile and nostrils on the pale muzzle, tan inner ears, and real hands: four fingers curled over the
     ground and a thumb, on the same arm joints. */
  H.kairyu = function (m, stage) {
    const g = m.geo; if (!g || !m.rig) return m;
    const S = g.S, at = g.at, NV = '#0a2a6a', TAN = '#d6b88a', W = '#e0f6ff', BL = '#0d3fc2';
    V.inPart(m, 'head', () => {
      K.sym((sd) => { const b = at(S(3.0), S(2.1), sd * S(1.6)); m.capsule(b, at(S(2.2), S(2.4), sd * S(3.6)), Math.max(0.6, S(0.6)), Math.max(0.55, S(0.45)), BL); });
      let prev = null; for (let i = 0; i <= 8; i++) { const t = i / 8 - 0.5, q = at(S(6.2) - Math.abs(t) * S(1.2), -S(2.3) + t * t * S(2.4), t * S(3.0)); if (prev) m.capsule(prev, q, Math.max(0.55, S(0.25)), Math.max(0.55, S(0.25)), NV, 'paint'); prev = q; }
      K.sym((sd) => { const q = K.surface(m, at(0, -S(1.0), sd * S(0.55)), 32, 0, 20); if (q) { m.set(q[0], q[1], q[2], NV); } });
      K.sym((sd) => { const e = at(-S(0.3), S(0.6), sd * S(6.0)); m.ellipsoid(e[0], e[1], e[2], S(0.9), S(1.2), S(0.6), TAN, 'paint'); });
    });
    K.sym((sd) => V.inPart(m, 'arm' + (sd > 0 ? 'L' : 'R'), () => {
      const z = sd * S(4.4);
      for (let f = 0; f < 4; f++) { const fz = z + (f - 1.5) * S(0.75), b = [S(7.4), S(1.2), fz]; m.capsule(b, [S(8.4), S(0.9), fz], Math.max(0.55, S(0.42)), Math.max(0.5, S(0.36)), W); m.capsule([S(8.4), S(0.9), fz], [S(8.7), S(0.3), fz], Math.max(0.5, S(0.36)), 0.5, W); }
      const tb = [S(6.6), S(1.4), z - sd * S(1.4)]; m.capsule(tb, [S(7.6), S(0.6), z - sd * S(1.9)], Math.max(0.55, S(0.4)), 0.5, W);
      m.set(R(S(6.3)), R(S(1.9)), R(z), TAN);
    }));
    return m;
  };
  /* ================================================================ AQUAFLORA line: the serpent
     Brief: a longer, more expressive neck and body, fluid motion, fins and flowing details; turquoise, green and
     aquatic. The forms keep their bodies (the coil of the first form, the long-necked later forms); what they gain
     is a continuous finned frill running from the head down the neck and back, cheek fins, side fins and a tail
     fluke, so the whole line reads as one flowing water serpent. Fin membranes are mint with darker rays. */
  const finCol = (u, v) => (u > 0.82 ? '#b8ffe0' : Math.abs((v * 2.5) % 1) < 0.28 ? '#13a98f' : '#5fe8c8');
  H.aquaflora = function (m, stage, d) {
    if (!m.rig) return m;
    if (stage === 1) {
      const f = d, sc = (p) => p.map((v) => (v + 0.5) * f - 0.5), pts = [];
      for (let i = 0; i <= 26; i++) { const t = i / 26, a = t * Math.PI * 3.2, r = 7 - t * 4; pts.push(sc([Math.cos(a) * r * (t < 0.45 ? 1 : 0.6) + (t > 0.45 ? (t - 0.45) * 10 : 0), 2 + t * 17 + Math.max(0, t - 0.6) * 4, Math.sin(a) * r * (t < 0.45 ? 1 : 0.5)])); }
      for (let i = 12; i < 25; i++) { const a = pts[i], b = pts[i + 1], tg = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), base = add(a, [-tg[1] * 0.6, 1, 0], (2.4 - i * 0.04) * f);
        V.inPart(m, 'neck', () => blade(m, base, [-0.55, 1, 0], tg, f * (1.6 + 0.9 * Math.sin((i - 12) / 12 * Math.PI)), f * 1.2, f * 0.6, finCol, (u) => 1 - u * 0.5)); }
      const hc = add(pts[26], [1.5 * f, 0.5 * f, 0], 1);
      K.sym((sd) => V.inPart(m, 'head', () => blade(m, add(hc, [-0.6 * f, 0, sd * 1.9 * f], 1), [-1, 0.25, sd * 0.6], [0, 1, 0], f * 2.6, f * 1.1, f * 0.6, finCol, (u) => 1 - u * 0.8)));
      return m;
    }
    const g = m.geo; if (!g) return m; const S = g.S, h = g.heads[0];
    // dorsal frill: head → neck → back, as overlapping fin blades along the spine
    const spine = [h.n2, h.n1, h.n0, [S(0), S(g.lo + 4.6), 0], [S(-4), S(g.lo + 4.2), 0], g.tp[0]];
    for (let i = 0; i < spine.length - 1; i++) { const a = spine[i], b = spine[i + 1], part = i < 2 ? 'head' : 'core';
      for (let t = 0; t < 1; t += 0.25) { const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], tg = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
        const base = [p[0], p[1] + S(i < 2 ? 1.6 : 2.6), p[2]];
        V.inPart(m, part, () => blade(m, base, [-0.5, 1, 0], tg, S(1.7 + (i === 2 ? 0.6 : 0)), S(1.2), Math.max(1, S(0.5)), finCol, (u) => 1 - u * 0.55, 'under')); } }
    // cheek fins
    g.heads.forEach((hh) => K.sym((sd) => V.inPart(m, 'head', () => blade(m, [hh.hc[0] - S(0.6), hh.hc[1] - S(0.2), hh.hc[2] + sd * hh.hr * 0.9], [-1, 0.3, sd * 0.7], [0, 1, 0], S(2.6), S(1.0), Math.max(1, S(0.45)), finCol, (u) => 1 - u * 0.8))));
    // side fins behind the shoulders
    K.sym((sd) => V.inPart(m, 'core', () => blade(m, [S(1.5), S(g.lo + 2.4), sd * S(3.0)], [-0.8, -0.2, sd * 1], [0, 1, 0], S(3.4), S(1.4), Math.max(1, S(0.5)), finCol, (u) => (u < 0.3 ? 0.6 + u : 1.05 - u))));
    // tail fluke
    const tt = g.tp[g.tp.length - 1], tq = g.tp[g.tp.length - 2], td = norm([tt[0] - tq[0], tt[1] - tq[1], tt[2] - tq[2]]);
    V.inPart(m, 'tail', () => [1, -1].forEach((s) => blade(m, tt, [td[0], td[1] + s * 0.9, td[2]], [0, 0, 1], S(3.6), S(1.3), Math.max(1, S(0.55)), finCol, (u) => (u < 0.4 ? 0.5 + u : 1.1 - u))));
    return m;
  };

  /* ================================================================ PYRO-SPARK line: the fire bird
     Brief: head and beak, feather and wing structure, flight, the fiery tail. Same red, orange and gold. A hooked,
     two-tone beak with a gape line, a gold eye ring, and feather vanes between the wing's flight-feather shafts. */
  H.pyrospark = function (m, stage) {
    if (!m.rig) return m;
    const k = [0.85, 1.1, 1.4][stage - 1] * V.detail(), S = (v) => v * k, lo = stage === 1 ? 2 : 3;
    const RD = ['#c41010', '#e02a10', '#9a0c0c'], OR = '#ff8000', YL = '#ffe600', GD = '#d8a020';
    const hc = [S(stage === 1 ? 2.5 : 3), S(lo + (stage === 1 ? 8.5 : 9.5)), 0];
    V.inPart(m, 'head', () => {
      // hooked beak: upper mandible curving down past the lower, darker tip, gape line
      const b0 = [hc[0] + S(2), hc[1] - S(0.1), S(0.5)], b1 = [hc[0] + S(3.7), hc[1] - S(0.5), S(0.75)], b2 = [hc[0] + S(4.3), hc[1] - S(1.6), S(0.8)];
      m.capsule(b0, b1, S(1.05), S(0.7), GD); m.capsule(b1, b2, S(0.7), Math.max(0.5, S(0.3)), '#a8700a');
      m.capsule([hc[0] + S(2.1), hc[1] - S(0.95), S(0.55)], [hc[0] + S(3.6), hc[1] - S(1.05), S(0.75)], Math.max(0.55, S(0.25)), 0.5, '#5a2a00', 'paint');
      // gold eye ring
      K.sym((sd) => { const e = K.surface(m, hc, 25 + sd * 42, 12, 10); if (e) { const a = (25 + sd * 42) * Math.PI / 180, t = [-Math.sin(a), 0, Math.cos(a)];
        for (let j = 0; j < 10; j++) { const q = j / 10 * Math.PI * 2, rr = S(1.15); const p = [e[0] + t[0] * Math.cos(q) * rr, e[1] + Math.sin(q) * rr + S(0.4), e[2] + t[2] * Math.cos(q) * rr]; const g0 = m.get(R(p[0]), R(p[1]), R(p[2])); if (g0 && RD.indexOf(g0.c) >= 0) m.set(p[0], p[1], p[2], OR); } } });
    });
    // flight feathers: the same wings drawn again with vanes between the shafts, so the fan reads as feathers rather
    // than separate spines (the shafts and their colour rows stay where they were)
    K.sym((sd) => K.wing(m, [S(-0.5), S(lo + 6), sd * S(2.6)], sd, S(stage === 1 ? 5 : stage === 2 ? 10 : 14), { cols: [YL, OR, RD[0], RD[2]], membrane: stage === 1 ? RD[0] : OR, up: 1.6, back: 0.3, droop: 0.7, sweep: 0.6, featherLen: 0.75, feathers: stage === 1 ? 4 : 6 + stage, bone: 1, boneCol: RD[0], glowTips: stage === 3 ? YL : null }));
    return m;
  };
  /* ================================================================ CANNONIS II–III: matching the sculpted first form
     Part A: Reefback and Shellfin had less finish than Cannonis I (the hand-sculpted Phase 8 form). They gain its
     kind of detail: bigger glowing eyes with pupils under a stone brow, nostrils and a mouth line, a stone rim
     around the shell's lower edge, and heavier claws. Silhouette, cannon and colours unchanged. */
  H.cannonis = function (m, stage) {
    if (stage < 2 || !m.rig) return m;
    const k = [1, 1.2, 1.42][stage - 1] * V.detail(), S = (v) => v * k, ST = ['#e6e6e6', '#d4cdbd', '#c2b59b', '#a8987a'], ICE = '#7fd8ff', DARK = '#0f2038', BD = '#1d68c9';
    V.inPart(m, 'head', () => {
      [-1, 1].forEach((sd) => {
        const ez = sd * Math.max(1, R(S(1.8))), ey = R(S(8.2)); let ex = R(S(17)); while (ex > 0 && !m.has(ex, ey, ez)) ex--;
        const cells = [];
        for (let dy = -1; dy <= 1; dy++) for (let dz = 0; dz <= 1; dz++) { const z = ez + sd * dz, y = ey + dy; let x = R(S(17)); while (x > 0 && !m.has(x, y, z)) x--; if (x <= 0) continue;
          const pupil = dy === 0 && dz === 0, c = pupil ? DARK : dy === 1 && dz === 1 ? '#ffffff' : ICE; m.set(x, y, z, c, c === ICE ? 1 : 0); cells.push([x, y, z, c]); }
        const brow = [ex - 1, ey + 2.2, ez + sd * 0.5]; m.capsule(add(brow, [-1, 0.2, -sd * 1.5], 1), add(brow, [0.6, -0.2, sd * 1.4], 1), Math.max(0.7, S(0.6)), Math.max(0.6, S(0.5)), ST[2]);
        const e = m.rig.eyes.find((q) => q.part === 'head' && q.cells.some((c) => Math.sign(c[2]) === sd)); if (e) e.cells = e.cells.concat(cells.filter((c) => c[3] !== DARK));
      });
      // nostrils on the snout front, a mouth line along the jaw seam
      [-1, 1].forEach((sd) => { let x = R(S(16)); const y = R(S(7.2)), z = sd * Math.max(1, R(S(0.7))); while (x > 0 && !m.has(x, y, z)) x--; if (x > 0) m.set(x, y, z, DARK); });
      [-1, 1].forEach((sd) => m.capsule([S(15.2), S(6.1), sd * S(1.0)], [S(11.5), S(6.3), sd * S(3.0)], Math.max(0.55, S(0.3)), 0.5, DARK, 'paint'));
    });
    // stone rim round the shell's lower edge, notched every few blocks
    K.recolour(m, (x, y, z, v) => v.p === 'core' && y >= S(6.6) && y <= S(7.8) && Math.hypot((x + S(1)) / S(9.5), z / S(7.5)) > 0.78, (x, y, z) => (V.cells(x, 0, z, 2.2, 61).edge < 0.25 ? ST[3] : ST[(V.cells(x, 0, z, 2.2, 61).id % 2) + 1]));
    // heavier claws on each foot
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach((n) => { const j = m.rig.joints[n]; if (!j) return; const lx = j.at[0], z = j.at[2], r = (n[3] === 'F' ? 2.6 : 2.9) * k;
      V.inPart(m, n, () => { for (let c = -1; c <= 1; c++) m.capsule([lx + r * 0.6, S(0.8), z + c * S(1.4)], [lx + r * 0.6 + S(1.6), 0, z + c * S(1.4)], Math.max(0.55, S(0.45)), 0.5, ST[0]); }); });
    return m;
  };

  /* ================================================================ TERRAFLORA II–III: carrying the first form's face
     Part A: Terraflora II had a thinner face than Terraflora I. Both later forms get I's taller glowing eyes with a
     bark brow, a carved mouth, moss on the shoulders, and the first form's bud-tipped sprouts at the crown. */
  H.terraflora = function (m, stage) {
    if (stage < 2 || !m.geo) return m;
    const g = m.geo, S = g.S, hc = g.hc, hr = g.hr, WD = ['#5b3a1f', '#7a5230', '#8b6a40', '#c8a96a'], MS = ['#2b8b22', '#5e9e3b', '#7a9f3a', '#3a7a2e'], GL = '#00ff88';
    const fy = 22 * Math.PI / 180, fd = [Math.cos(fy), 0, Math.sin(fy)], sv = [-Math.sin(fy), 0, Math.cos(fy)];
    const at = (d, up, side) => [hc[0] + fd[0] * d + sv[0] * side, hc[1] + up, hc[2] + fd[2] * d + sv[2] * side];
    const pt = m.v.get(R(hc[0]) + ',' + R(hc[1]) + ',' + R(hc[2])), hp = (pt && pt.p) || 'head';
    V.inPart(m, hp, () => {
      if (m.rig) m.rig.eyes = m.rig.eyes.filter((e) => e.part !== hp);
      K.eyes(m, hc, { yaw: 22, ang: 30, el: 0, size: 2, tall: 2, iris: GL, white: '#c8ffd8' });
      K.sym((sd) => { const b = at(hr * 0.85, hr * 0.42, sd * hr * 0.55); m.capsule(add(b, [-0.3, -0.1, -sd], S(0.8)), add(b, [-0.2, 0.2, sd], S(0.9)), Math.max(0.6, S(0.45)), 0.5, WD[0]); });
      let prev = null; for (let i = 0; i <= 6; i++) { const t = i / 6 - 0.5, q = at(hr * 1.05, -hr * 0.5 + t * t * hr * 0.6, t * hr * 0.9); if (prev) m.capsule(prev, q, Math.max(0.55, S(0.28)), Math.max(0.55, S(0.28)), '#2a1a0c', 'paint'); prev = q; }
      K.sym((sd) => { const b = [hc[0] - S(0.8), hc[1] + hr * 0.9, sd * hr * 0.7]; K.tuft(m, b, [-0.3, 1, sd * 0.6], S(3.2), Math.max(0.6, S(0.6)), WD[1]); const tip = add(b, norm([-0.3, 1, sd * 0.6]), S(3.2)); m.ellipsoid(tip[0], tip[1] + S(0.4), tip[2], S(0.9), S(0.75), S(0.9), '#c8e05a'); });
    });
    K.sym((sd) => K.leaves(m, [S(0.2), g.top + S(0.4), sd * S(2.9)], [S(1.6), S(0.8), S(1.4)], MS, 70 + sd, { n: 4, dome: true, mode: 'under' }));
    return m;
  };
  /* ================================================================ ZEPHYR: the same feather vanes as the fire bird */
  H.zephyr = function (m, stage) {
    const g = m.geo; if (!g || !m.rig) return m;
    const S = g.S, BL = '#3d6bff', SK = '#3dbbff', ICE = '#7fe8ff', W = '#ffffff', GD = '#ffd166', IN = '#2a3b8f';
    K.sym((sd) => K.wing(m, [g.shoulder[0], g.shoulder[1], sd * g.shoulder[2]], sd, S(10 + stage * 2), { cols: [W, SK, BL, IN], membrane: SK, up: 1.2, back: 0.55, droop: 0.9, featherLen: 0.75, feathers: 6 + stage, bone: 1.1, boneCol: GD, glowTips: stage === 3 ? ICE : null }));
    return m;
  };

  /* ================================================================ LUMI II–III: keep the crown on the finer grid
     The three small crown blocks and the chest gem were written in single blocks; on the finer grid they are drawn
     again at their original size so the silhouette's crown stays. */
  H.lumi = function (m, stage, d) {
    if (stage < 2) return m;
    const k = [0.9, 1.1, 1.3][stage - 1] * d, S = (v) => v * k, W = '#ffffff', CY = '#3fd6ff', c = [0, S(7) + S(5), 0];
    for (let i = -1; i <= 1; i++) m.box(c[0] + (i * 2 - 1) * d, c[1] + S(6.5), c[2] - d, c[0] + i * 2 * d, c[1] + S(6.5) + (i ? 2 : 3) * d, c[2], W);
    const fy = 28 * Math.PI / 180, gem = K.surface(m, [c[0], c[1] - S(5.5), c[2]], 28, 0, 30); if (gem) m.ellipsoid(gem[0], gem[1], gem[2], 1.2 * d, 1.6 * d, 1.2 * d, K.glow(CY));
    return m;
  };
})(typeof window !== 'undefined' ? window : globalThis);
