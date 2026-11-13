/* Aminas — Phase 15D: dressing for the prototype lines refined on a finer grid (see PROTO_D in voxel-proto15.js;
   developer switch only, off by default). H[line] = (m, stage, d, lvl) => m, called after the line's 15A builder has
   run at detail d. Identity, palette, joints and silhouettes are the 15A prototypes'; this adds what the finer grid
   allows. */
(function (root) {
  'use strict';
  const A = root.A, V = A && A.Voxel, K = V && V.kit; if (!V || !K) return;
  const H = (V.PROTO15D_HOOKS = V.PROTO15D_HOOKS || {});
  const R = Math.round, add = K.add, norm = K.norm, glow = K.glow;

  /* ================================================================ META (peace): gentle, elegant, sophisticated
     - a calm face: wide almond eyes of light with a soft lid line and a highlight, a small serene mouth, a seam
       framing the face plate;
     - armour panels: fine seams over the pale shell (Atem's plates are heavy and angular; Meta's are smooth and fine);
     - articulation: dark joint rings at shoulders, wrists and ankles, a larger chest gem in its gold frame;
     - the wired hair: each lock gains two finer wires of light running beside it (in the lock's own parts, so they
       sway with it) and more data cubes, keeping the hair the most prominent feature;
     - a fuller ring of light behind the head. */
  H.meta = function (m, stage) {
    if (!m.rig) return m;
    const k = [1.3, 1.45, 1.6][stage - 1] * V.detail(), S = (v) => v * k;
    const GR = ['#e2e7f2', '#c4cde0', '#a3aec6', '#828ea8'], CY = '#5fd0ff', WH = '#f2f8ff', GD = '#e8b84a', SOFT = '#bfefff';
    const L = stage === 1 ? 9.5 : 10.5, T = stage === 1 ? 6.2 : 7, W = 1.7, waist = [S(0.1), S(L + T * 0.33), 0], sh = S(L + T - 0.3);
    const hc = [S(0.5), S(L + T + 0.9 + 1.6), 0], hr = S(1.6);
    // panels first (so the details drawn after sit on top)
    const shell = { [GR[0]]: 1, [GR[1]]: 1, [GR[2]]: 1 };
    K.plates(m, (x, y, z, v) => shell[v.c] && !(v.g > 0) && v.p !== 'head' && v.p !== 'ring' && !/^hair/.test(v.p || ''), { size: 2.2 * V.detail(), seed: 71, seam: 0.12, seamCol: GR[3], cols: [GR[0], GR[1], GR[1]] });
    // face
    V.inPart(m, 'head', () => {
      const ex = hc[0] + hr * 0.98;
      m.ellipsoid(hc[0] + hr * 0.52, hc[1] - hr * 0.12, 0, hr * 0.62, hr * 0.78, hr * 0.8, GR[3], 'paint');
      m.ellipsoid(hc[0] + hr * 0.52, hc[1] - hr * 0.12, 0, hr * 0.56, hr * 0.7, hr * 0.72, '#cfd8ea', 'paint');
      K.sym((sd) => { const z0 = sd * hr * 0.42, ey = hc[1] + S(0.15);
        m.fill([R(ex - 2), R(ey - hr * 0.3), R(z0 - hr * 0.32), R(ex + 2), R(ey + hr * 0.3), R(z0 + hr * 0.32)], (x, y, z) => ((y - ey) / (hr * 0.2)) ** 2 + ((z - z0) / (hr * 0.3)) ** 2 <= 1 && m.has(x, y, z) && !m.has(x + 1, y, z),
          (x, y, z) => (y > ey + hr * 0.08 && Math.abs(z - (z0 - sd * hr * 0.1)) < hr * 0.1 ? glow(WH, 1) : glow(CY, 1)), 'paint');
        for (let i = -3; i <= 3; i++) { const z = z0 + i * hr * 0.1, y = ey + hr * 0.26 - Math.abs(i) * hr * 0.03; const q = K.surface(m, [hc[0], y, z], 0, 0, 20); if (q) m.set(q[0], q[1], q[2], GR[3]); } });
      for (let i = -2; i <= 2; i++) { const q = K.surface(m, [hc[0], hc[1] - hr * 0.5 + Math.abs(i) * hr * 0.03, i * hr * 0.08], 0, 0, 20); if (q) m.set(q[0], q[1], q[2], GR[3]); }
    });
    // chest gem, joint rings
    V.inPart(m, 'torso', () => { const c = K.surface(m, [0, waist[1] + S(T * 0.66), 0], 0, 0, 20); if (c) { m.ellipsoid(c[0], c[1], c[2], S(0.55), S(0.95), S(0.95), GD); m.ellipsoid(c[0] + 1, c[1], c[2], S(0.4), S(0.65), S(0.65), glow(SOFT, 1)); } });
    K.sym((sd) => { const s = sd > 0 ? 'L' : 'R', j = m.rig.joints;
      if (j['arm' + s]) V.inPart(m, 'arm' + s, () => m.ellipsoid(j['arm' + s].at[0], j['arm' + s].at[1], j['arm' + s].at[2], S(0.62), S(0.62), S(0.62), GR[3], 'under'));
      const hand = m.rig.emit['hand' + s]; if (hand && j['fore' + s]) V.inPart(m, 'fore' + s, () => { const w = add(hand.at, [-S(0.45), S(0.75), 0], 1); m.ellipsoid(w[0], w[1], w[2], S(0.42), S(0.3), S(0.42), glow(CY, 0.8), 'under'); }); });
    // finer wires beside each lock of hair, and more data cubes
    const per = [1, 2, 2][stage - 1], len = S([9, 14, 18][stage - 1]), reach = [0.4, 0.7, 1.15][stage - 1];
    K.sym((sd) => ['F', 'B'].forEach((fb, li) => {
      const lk = 'hair' + (sd > 0 ? 'L' : 'R') + fb, tip = lk + 'T', root0 = [hc[0] - hr * (0.75 + li * 0.35), hc[1] + hr * 0.35, sd * hr * 0.72];
      for (let c = 0; c < per; c++) for (let w = 0; w < 2; w++) {
        let p = add(root0, [-li * 1.2 - 0.6 + w * 1.2, 0.3, sd * (c * 1.6 + (w ? 0.9 : -0.9))], 1); const steps = R(len), ph = c * 2.3 + li * 3.1 + (w ? 0.6 : -0.6), wide = reach * (0.55 + c * 0.75 + li * 0.5) * (w ? 1.12 : 0.9);
        for (let j = 0; j < steps; j++) { const t = j / steps, part = t < 0.45 ? lk : tip, curl = t > 0.8 ? (t - 0.8) / 0.2 : 0;
          const dir = norm([-0.3 - li * 0.15 + t * 0.2 + Math.sin(ph + t * 6) * 0.12, -1 + curl * 1.4, sd * (wide * (0.25 + t) * 0.6 + Math.sin(ph + t * 5) * 0.35) + sd * curl * 1.2]), q = add(p, dir, 1.0);
          V.inPart(m, part, () => { m.capsule(p, q, 0.5, 0.5, glow(w ? SOFT : '#9fe8ff', 0.75), 'under'); if (stage > 1 && j % 7 === 3) m.ellipsoid(q[0], q[1], q[2] + sd, 0.7, 0.7, 0.7, glow(WH, 0.8), 'under'); });
          p = q; } }
    }));
    // a fuller ring of light: a second, inner band
    const rc = [hc[0] - hr - S(0.8), hc[1] + S(0.8), 0], rr = S(stage === 1 ? 3.3 : stage === 2 ? 4.1 : 5.0);
    if (m.rig.joints.ring) V.inPart(m, 'ring', () => { const n = R(rr * 7); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; if (i % 6 === 5) continue; m.set(rc[0], rc[1] + Math.sin(a) * (rr - 1), Math.cos(a) * (rr - 1), i % 6 === 0 ? WH : SOFT, 0.7); } });
    return m;
  };

  /* ================================================================ LUMIFERN (gentle, small, upright)
     - two clearly readable eyes: each repainted as a glossy eye with a dark rim, a deep-to-light green iris, a pupil
       and two highlights (the 15A eyes were dark green on green and read as one shape on the first form);
     - the small bud that sat between the first form's eyes moves up to the crown sprout, clearing the face;
     - floral details: tiny five-petal flowers dotted over the head and back (more on later forms);
     - organic shading: the roster's crease-and-edge shading pass. */
  H.lumifern = function (m, stage) {
    const k = [1.75, 2.05, 2.35][stage - 1], S = (v) => v * k, lo = stage === 1 ? 0 : 2.6, bc = [0, S(5 + lo), 0];
    const face = stage > 1 ? [S(2.6), S(8.6 + lo), 0] : [bc[0] + S(1), bc[1] + S(1.1), 0], el = stage > 1 ? 4 : 12, ang = stage > 1 ? 33 : 34, part = stage > 1 ? 'head' : 'core';
    const CR = '#fff7c8', YL = '#ffd86b';
    // clear the bud between the first form's eyes
    if (stage === 1) { const fr = K.surface(m, face, 30, el, 30); if (fr) { const del = []; m.v.forEach((v, kk) => { if (v.c !== YL && v.c !== CR && v.c !== '#ffe9a0') return; const q = kk.split(',').map(Number); if (Math.hypot(q[0] - fr[0], q[1] - fr[1], q[2] - fr[2]) < S(2.2)) del.push(kk); }); del.forEach((kk) => m.v.delete(kk)); } }
    // eyes: found from the 15A eye blocks themselves (their centre on each side), then repainted on the outer surface
    const fa = 30 * Math.PI / 180, fdir = [Math.cos(fa), 0, Math.sin(fa)], ftan = [-Math.sin(fa), 0, Math.cos(fa)], EYE = { '#0f2408': 1, '#3f8f2e': 1, '#ffffff': 1 };
    const groups = { 1: [], '-1': [] };
    m.v.forEach((v, kk) => { if (!EYE[v.c]) return; const q = kk.split(',').map(Number), d = [q[0] - face[0], q[1] - face[1], q[2] - face[2]], u = d[0] * ftan[0] + d[2] * ftan[2], w = d[0] * fdir[0] + d[2] * fdir[2];
      if (w > 0 && Math.abs(u) < S(4) && Math.abs(d[1]) < S(4)) groups[u > 0 ? 1 : -1].push(q); });
    [1, -1].forEach((sd) => { const g = groups[sd]; if (g.length < 4) return;
      const c = [0, 1, 2].map((a) => g.reduce((t, q) => t + q[a], 0) / g.length), a = Math.atan2(c[2] - face[2], c[0] - face[0]), dir = [Math.cos(a), 0, Math.sin(a)], tan = [-Math.sin(a), 0, Math.cos(a)];
      // the old eye blocks go back to skin; the new eye is a crisp plate standing just proud of the face
      g.forEach((q) => m.set(q[0], q[1], q[2], '#bff58a'));
      let w0 = 0; g.forEach((q) => { w0 = Math.max(w0, (q[0] - c[0]) * dir[0] + (q[2] - c[2]) * dir[2]); }); w0 += 0.4;
      const rx = 2.0, ry = 2.6;
      V.inPart(m, part, () => m.fill([R(c[0] - 5), R(c[1] - 4), R(c[2] - 5), R(c[0] + 5), R(c[1] + 4), R(c[2] + 5)], (x, y, z) => {
        const d = [x - c[0], y - c[1], z - c[2]], u = d[0] * tan[0] + d[2] * tan[2], v = d[1], w = d[0] * dir[0] + d[2] * dir[2];
        return (u / rx) ** 2 + (v / ry) ** 2 <= 1 && Math.abs(w - w0) <= 0.55; }, (x, y, z) => {
        const d = [x - c[0], y - c[1], z - c[2]], u = (d[0] * tan[0] + d[2] * tan[2]) * sd, v = d[1], r = Math.sqrt((u / rx) ** 2 + (v / ry) ** 2);
        if (r > 0.84) return '#1d3a12';
        if ((Math.abs(u + 0.7) < 0.6 && Math.abs(v - 1.0) < 0.6) || (Math.abs(u - 0.8) < 0.45 && Math.abs(v + 1.1) < 0.45)) return '#ffffff';
        if (Math.abs(u) < 0.7 && Math.abs(v) < 0.9) return '#0f2408';
        return v > 0.5 ? '#245c1a' : v > -0.7 ? '#3f8f2e' : '#6cc04a'; }));
    });
    // tiny flowers over the head and back
    const n = [3, 5, 8][stage - 1];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.7, top = K.surface(m, [bc[0] - S(0.6), bc[1] + S(stage > 1 ? 1.5 : 2.2), 0], 180 + Math.cos(a) * 70, 35 + 30 * Math.abs(Math.sin(a)), 40); if (!top) continue;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => m.set(top[0] + dx, top[1] + 1, top[2] + dz, CR)); m.set(top[0], top[1] + 1, top[2], YL); }
    if (V.shade15) V.shade15(m);
    return m;
  };
})(typeof window !== 'undefined' ? window : globalThis);
