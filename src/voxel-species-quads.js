/* Aminas — voxel sculpts: four-legged lines (Emberix, Acinus, Sylvaneer). Shared quadruped plan, head turned a
   little towards the viewer like the cards. */
(function (root) {
  'use strict';
  const V = root.A.Voxel, K = V.kit;

  function quad(m, k, P) {
    const S = (v) => v * k, leg = P.leg || 8, lo = leg; // body height above ground
    V.rigStart(m, 'quad');   // Phase 8B: parts are tagged as they are drawn (body, four legs, head, jaw, tail)
    m.capsule([S(-6), S(lo + 1.5), 0], [S(4), S(lo + 2.5), 0], S(P.girth || 4), S((P.girth || 4) + 0.3), P.body);
    if (P.belly) m.ellipsoid(S(-0.5), S(lo + 0.4), 0, S(6), S(2), S(2.8), P.belly, 'paint');
    K.sym((sd) => [[S(3.4), 'f'], [S(-5.6), 'b']].forEach(([x, w]) => {
      const z = sd * S(P.stance || 2.8), name = 'leg' + (w === 'f' ? 'F' : 'B') + (sd > 0 ? 'L' : 'R');
      V.joint(m, name, [x, S(lo + 0.5), z], null);
      V.inPart(m, name, () => {
        m.capsule([x, S(lo + 1.5), z], [x + (w === 'b' ? -S(0.6) : S(0.3)), S(leg * 0.45), z], S(P.thigh || 1.9), S(1.5), P.leg1 || P.body);
        m.capsule([x + (w === 'b' ? -S(0.6) : S(0.3)), S(leg * 0.45), z], [x, S(1), z], S(1.5), S(1.3), P.leg2 || P.leg1 || P.body);
        m.ellipsoid(x + S(0.5), S(0.9), z, S(1.8), S(1), S(1.5), P.paw || P.leg2 || P.body);
        if (P.claw) K.toes(m, Math.round(x + S(2)), 0, Math.round(z), 3, P.claw);
      });
    }));
    const fy = (P.faceYaw == null ? 30 : P.faceYaw) * Math.PI / 180, fd = [Math.cos(fy), 0, Math.sin(fy)], sv = [-Math.sin(fy), 0, Math.cos(fy)];
    const neckTop = [S(6.5), S(lo + 6 + (P.neck || 0)), 0];
    const hc = [neckTop[0] + S(1.2), neckTop[1] + S(1.2), 0], hr = S(P.head || 3.4);
    const at = (d, up, side) => [hc[0] + fd[0] * d + sv[0] * side, hc[1] + up, hc[2] + fd[2] * d + sv[2] * side];
    const sn = at(hr * 0.95, -hr * 0.35, 0);
    V.joint(m, 'head', [S(3.5), S(lo + 3), 0], null);
    V.inPart(m, 'head', () => {
      m.capsule([S(3.5), S(lo + 3), 0], neckTop, S(2.8), S(2.4), P.neckCol || P.body);
      m.ellipsoid(hc[0], hc[1], hc[2], hr, hr * 0.92, hr * 0.95, P.headCol || P.body);
      m.capsule(at(0, -hr * 0.2, 0), sn, hr * 0.62, hr * (P.snout || 0.45), P.muzzle || P.headCol || P.body);
      const ns = K.surface(m, at(0, -hr * 0.3, 0), fy * 180 / Math.PI, 0, 20); if (ns) m.set(ns[0], ns[1], ns[2], P.nose || '#2a2228');
    });
    // the jaw: the lower half of the snout, hinged under the eyes
    const ax0 = hc[1] - hr * 0.2;
    V.jaw(m, 'head', 'jaw', [hc[0] + fd[0] * hr * 0.1, hc[1] - hr * 0.42, hc[2] + fd[2] * hr * 0.1], (x, y, z) => { const t = (x - hc[0]) * fd[0] + (z - hc[2]) * fd[2]; return t > hr * 0.42 && y < ax0 - (t / (hr * 0.95)) * hr * 0.15 - 0.4; });
    V.emit(m, 'mouth', sn, 'head');
    // tail
    const tb = [S(-9.5), S(lo + 2.5), 0], tt = [S(-12.5), S(lo + 2.5 + (P.tailUp == null ? 4 : P.tailUp)), 0];
    V.joint(m, 'tail', [S(-7.5), S(lo + 2.5), 0], null);
    if (P.tail !== false) V.inPart(m, 'tail', () => m.capsule(tb, tt, S(1.3), S(0.8), P.tailCol || P.body));
    m.part = null;
    m.geo = { S, hc, hr, at, fd, sv, sn, fy: fy * 180 / Math.PI, tb, tailTip: tt, lo, neckTop };   // Phase 15B: read by the refined roster's species work
    return { S, hc, hr, at, fy: fy * 180 / Math.PI, tailTip: tt, lo, neckTop };
  }
  const eyes = (m, g, o) => K.eyes(m, [g.hc[0], g.hc[1], g.hc[2]], Object.assign({ yaw: g.fy, ang: 34, el: 14, size: 2, tall: 2, white: '#ffffff', pupil: '#0b0f1e' }, o));
  // recursive branching (antlers, twigs)
  function branch(m, base, dir, len, r, depth, col, leaf, seed) {
    const d = K.norm(dir), end = K.add(base, d, len);
    m.capsule(base, end, r, Math.max(0.5, r * 0.7), col);
    if (depth <= 0) { if (leaf) m.ellipsoid(end[0], end[1], end[2], 1.4, 1.2, 1.4, leaf); return; }
    const n = 2;
    for (let i = 0; i < n; i++) {
      const s = (i ? 1 : -1), j = V.hash(depth, i, seed, 4) - 0.5;
      branch(m, end, [d[0] + s * 0.45 + j * 0.3, d[1] + 0.25, d[2] + s * 0.35 * (i ? 1 : -0.6) + j * 0.2], len * 0.72, Math.max(0.5, r * 0.7), depth - 1, col, leaf, seed + i * 7);
    }
    if (leaf && depth < 2) m.ellipsoid(end[0], end[1] + 0.5, end[2], 1.3, 1, 1.3, leaf, 'under');
  }

  /* ===== Emberix → Flaremon → Infernox (Fire, frost-blue flame). Card palette #FFFFFF #B3E5FF #00D1FF #4A9BFF #2B3A4A. ===== */
  V.register('emberix', function (stage) {
    const m = new V.Model(), k = [1, 1.2, 1.42][stage - 1] * V.detail();
    const W = ['#ffffff', '#eef4ff', '#dfe9fb'], ICE = '#b3e5ff', CY = '#00d1ff', BL = '#4a9bff', NV = '#2b3a4a';
    const fl = [BL, CY, '#ffffff'];
    const g = quad(m, k, { body: K.cellsOf(W, 2.2, 3), leg: 7.5, girth: 3.4, leg2: (x, y) => (y < 3 * k ? BL : W[0]), paw: '#ffffff', claw: BL, head: 3.6, snout: 0.55, nose: '#4a6a9a', tailUp: 6, tailCol: W[1], neck: 0.5 });
    const S = g.S;
    K.sym((sd) => { const e = g.at(-S(0.5), S(2.6), sd * S(2.2)); K.tuft(m, e, [-0.2, 1, sd * 0.35], S(3), S(1.3), (x, y, z, t) => (t > 0.5 ? BL : ICE)); });
    // flame mane around the neck and head; flame tail tip
    K.mane(m, [g.neckTop[0] - S(1.5), g.neckTop[1] + S(1.5), 0], [-0.7, 1, 0], S(5) + stage * 1.5, S(1.7), fl, 10 + stage, 4 + stage, 1.6);
    K.flame(m, g.tailTip, [0.1, 1, 0], S(5) + stage * 1.5, S(1.8), fl, 20);
    if (stage >= 2) K.sym((sd) => K.flame(m, [S(-1), S(g.lo + 5), sd * S(3)], [-0.8, 0.8, sd * 0.5], S(4), S(1.2), fl, 30 + sd));
    if (stage === 3) { K.sym((sd) => [S(3.4), S(-5.6)].forEach((x, i) => K.flame(m, [x, S(4), sd * S(3.6)], [-0.5, 0.8, sd * 0.6], S(3), S(1), fl, 40 + i + sd))); }
    eyes(m, g, { iris: '#18b8ff', lid: NV });
    return m;
  });

  /* ===== Acinus → Berrant → Calyxar (Nature / Rock). Card palette #5E8F3A #8FAE5A #C9B98A #6B4F3A #B33A3A #F4E9D7. ===== */
  V.register('acinus', function (stage) {
    const m = new V.Model(), k = [1, 1.25, 1.5][stage - 1] * V.detail();
    const ST = ['#c9b98a', '#a8946a', '#8b7a5a', '#6b4f3a'], GR = ['#5e8f3a', '#8fae5a', '#4a7a2e', '#6f9a3e'], BER = '#b33a3a', FL = '#f4e9d7';
    const g = quad(m, k, { body: K.cellsOf(ST, 2.4, 5), leg: 5.5, girth: 4.3, stance: 3.2, thigh: 2.4, leg1: K.cellsOf(ST, 2, 6), leg2: K.cellsOf([ST[3], ST[2]], 1.6, 7), paw: ST[3], claw: '#e8dcc0', headCol: K.cellsOf([GR[0], GR[3]], 1.8, 8), muzzle: '#9fb86a', head: 3.4, snout: 0.6, nose: '#2e3a1e', tailUp: 1, tailCol: ST[2], neck: -1.5 });
    const S = g.S;
    // stone plates on the body: seams in dark earth
    K.plates(m, (x, y, z, v) => ST.includes(v.c) && y > S(4), { size: 2.6, seed: 12, seam: 0.45, seamCol: '#4a3a28', cols: ST });
    // leaf horns
    K.sym((sd) => { const b = g.at(-S(1), S(2.2), sd * S(1.8)); K.tuft(m, b, [-1, 0.7, sd * 0.35], S(3 + stage), S(1.1), GR[1]); });
    // the berry bush on its back
    const bc = [S(-1), S(g.lo + 5.5), 0], br = [S(5.6 + stage * 0.5), S(4.6 + stage * 0.5), S(4.6 + stage * 0.3)];
    const pts = K.leaves(m, bc, br, GR, 33 + stage, { dome: true, n: 26 + stage * 14 });
    K.dots(m, pts, (i) => (stage === 3 && i % 3 === 0 ? '#3a4fb3' : BER), { p: 0.55, seed: 3, big: true, hi: '#e86060' });
    K.dots(m, pts, FL, { p: 0.22, seed: 9, hi: '#ffe27a' });
    if (stage === 3) K.sym((sd) => m.capsule([S(-6), S(g.lo + 4), sd * S(4.2)], [S(3), S(g.lo + 1), sd * S(4.4)], S(0.7), S(0.6), '#4f3a22'));
    eyes(m, g, { iris: '#e8e04a', size: 1, tall: 2, lid: '#3e5a24', glow: false });
    return m;
  });

  /* ===== Sylvaneer → Sylvaneer II → Sylvaneer III (Nature). Card palette moss greens, bark browns, glowing rune. ===== */
  V.register('sylvaneer', function (stage) {
    const m = new V.Model(), k = [1, 1.18, 1.36][stage - 1] * V.detail();
    const BK = ['#8b5a2b', '#6b4423', '#7a4e26'], MS = ['#8fd14f', '#6fb43a', '#a6e05a', '#4f8f2e'], CR = '#e6d2a8', RUNE = '#7dff6a';
    const AC = stage === 3 ? ['#3ec8ff', '#7ff0ff'] : null;
    const g = quad(m, k, { body: K.cellsOf(BK, 2.4, 2), leg: 11, girth: 3.4, thigh: 1.8, leg2: K.cellsOf([BK[1], '#4a2f18'], 1.6, 3), paw: '#3a2414', head: 3, snout: 0.5, muzzle: CR, nose: '#2a1a10', tailUp: 2, neck: 2.5, faceYaw: 28 });
    const S = g.S;
    // moss tufts hanging from back, neck and shoulders
    K.recolour(m, (x, y, z) => !m.has(x, y + 1, z) && y > S(9), (x, y, z) => (V.cells(x, y, z, 2.2, 11).id % 3 ? (AC && V.hash(x, y, z, 3) < 0.2 ? AC[0] : MS[V.cells(x, y, z, 2.2, 11).id % 4]) : null));
    for (let i = 0; i < 10 + stage * 3; i++) {
      const x = S(-6 + V.hash(i, 1, 2, 3) * 13), z = (V.hash(i, 2, 2, 3) - 0.5) * S(7), y = S(14) + (x > S(3) ? S(2) : 0);
      K.tuft(m, [x, y, z], [-0.4, -1, z > 0 ? 0.6 : -0.6], S(2.5), S(1.1), MS[i % 4], 'under');
    }
    // glowing rune on the flank
    const rx = Math.round(S(-1.5)), ry = Math.round(S(12.5)), rz = Math.round(S(3.4)) + 1;
    let z0 = rz + 3; while (z0 > 0 && !m.has(rx, ry, z0)) z0--;
    [[0, 0], [0, 1], [0, 2], [0, -1], [0, -2], [1, 2], [-1, 2], [1, -2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1], [2, 0], [-2, 0]].forEach(([dx, dy]) => { let z = z0 + 2; while (z > 0 && !m.has(rx + dx, ry + dy, z)) z--; if (z > 0) m.set(rx + dx, ry + dy, z, RUNE, 0.6); });
    // antlers: a beam sweeping up, back and out, with forward tines tipped in leaf blocks
    K.sym((sd) => {
      let p = g.at(-S(0.8), S(2.4), sd * S(1.5)); const segs = 2 + stage, leafC = (i) => (AC && i % 2 ? AC[1] : MS[(i + 2) % 4]);
      for (let i = 0; i < segs; i++) {
        const q = K.add(p, K.norm([-0.45, 1, sd * (0.55 - i * 0.08)]), S(2.6));
        m.capsule(p, q, S(0.85) * (1 - i * 0.12), S(0.75) * (1 - i * 0.12), BK[i % 2]);
        const tl = S(2.4) * (1 - i * 0.12), tip = K.add(q, K.norm([0.55, 1, sd * 0.25]), tl);
        m.capsule(q, tip, S(0.6), 0.5, BK[0]);
        m.ellipsoid(tip[0], tip[1] + 0.5, tip[2], 1.4, 1.2, 1.4, leafC(i));
        p = q;
      }
      m.ellipsoid(p[0] - 0.5, p[1] + 1, p[2], 1.6, 1.3, 1.6, leafC(9));
    });
    eyes(m, g, { iris: RUNE, size: 1, tall: 1, lid: BK[1] });
    return m;
  });
})(typeof window !== 'undefined' ? window : globalThis);
