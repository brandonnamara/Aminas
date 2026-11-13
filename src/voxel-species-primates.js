/* Aminas — voxel sculpts: the three primate lines (Gaiaroki, Kairyu, Pyrokai).
   They share one crouched, big-headed body plan (as on their cards) and differ in palette and element dressing. */
(function (root) {
  'use strict';
  const V = root.A.Voxel, K = V.kit;

  // Shared body. P: palette + options. Returns key points for the dressing.
  function primate(m, k, P) {
    const S = (v) => v * k;
    const body = P.body, belly = P.belly;
    V.rigStart(m, 'primate');   // Phase 8B: torso, two legs, two arms, head (with jaw), tail
    // torso: hips low at the back, chest raised at the front
    m.capsule([S(-3.5), S(7.5), 0], [S(2), S(9.5), 0], S(4.2), S(4.4), body);
    m.ellipsoid(S(1.5), S(8.3), 0, S(3.2), S(3.4), S(3), belly, 'paint');
    // legs (crouched) and arms (planted forward)
    K.sym((sd) => {
      const s = sd > 0 ? 'L' : 'R';
      V.joint(m, 'leg' + s, [S(-3), S(6), sd * S(3.2)], null); V.joint(m, 'arm' + s, [S(3), S(9.5), sd * S(3.4)], null);
      V.inPart(m, 'leg' + s, () => {
        m.capsule([S(-3.5), S(7), sd * S(3)], [S(-1.5), S(3.5), sd * S(4.2)], S(2.4), S(2), body);
        m.capsule([S(-1.5), S(3.5), sd * S(4.2)], [S(-2.5), S(1), sd * S(4)], S(2), S(1.7), body);
        m.ellipsoid(S(-1.2), S(0.9), sd * S(4), S(2.4), S(1), S(1.6), P.paw);
      });
      V.inPart(m, 'arm' + s, () => {
        m.capsule([S(3), S(10), sd * S(3.4)], [S(5.2), S(5), sd * S(4.6)], S(1.8), S(1.5), body);
        m.capsule([S(5.2), S(5), sd * S(4.6)], [S(6), S(1.3), sd * S(4.4)], S(1.5), S(1.4), body);
        m.ellipsoid(S(6.6), S(1), sd * S(4.4), S(1.8), S(1), S(1.5), P.paw);
        K.toes(m, Math.round(S(8)), 0, Math.round(sd * S(4.4)), 3, P.claw || P.paw);
      });
      V.emit(m, 'hand' + s, [S(7), S(1.6), sd * S(4.4)], 'arm' + s);
    });
    // head: big and round, turned a little towards the viewer, with a pale muzzle and side ears
    const fy = (P.faceYaw == null ? 32 : P.faceYaw) * Math.PI / 180, fd = [Math.cos(fy), 0, Math.sin(fy)], sdv = [-Math.sin(fy), 0, Math.cos(fy)];
    const hc = [S(5), S(15), 0], hr = S(5.2), at = (d, up, side) => [hc[0] + fd[0] * d + sdv[0] * side, hc[1] + up, hc[2] + fd[2] * d + sdv[2] * side];
    const mz = at(S(3.6), -S(1.7), 0);
    V.joint(m, 'head', [S(4), S(10.5), 0], null);
    V.inPart(m, 'head', () => {
      m.ellipsoid(hc[0], hc[1], hc[2], hr, hr * 0.95, hr, P.head || body);
      m.ellipsoid(mz[0], mz[1], mz[2], S(2.8), S(2.3), S(2.8), P.face);
      const fc = at(S(2.6), S(0.3), 0); m.ellipsoid(fc[0], fc[1], fc[2], S(3), S(2.3), S(3), P.face, 'paint');
      K.sym((sd) => {
        const e = at(-S(0.6), S(0.6), sd * S(5.3)); m.ellipsoid(e[0], e[1], e[2], S(1.6), S(1.9), S(1.6), P.ear || P.face);
        const ei = at(-S(0.2), S(0.6), sd * S(6.2)); m.set(Math.round(ei[0]), Math.round(ei[1]), Math.round(ei[2]), P.earIn || P.face);
      });
      const ns = K.surface(m, at(0, -S(1.3), 0), P.faceYaw == null ? 32 : P.faceYaw, 0, 20); if (ns) { m.set(ns[0], ns[1], ns[2], P.nose || '#3a2a20'); m.set(ns[0], ns[1] - 2, ns[2], P.mouth || P.nose || '#3a2a20'); }
    });
    // the jaw: the lower half of the muzzle
    V.jaw(m, 'head', 'jaw', [mz[0] - fd[0] * S(1.6), mz[1] + S(0.1), mz[2] - fd[2] * S(1.6)], (x, y, z) => { const t = (x - hc[0]) * fd[0] + (z - hc[2]) * fd[2]; return t > S(2.4) && y < mz[1] - S(0.3) && Math.hypot(x - mz[0], (y - mz[1]) * 1.2, z - mz[2]) < S(3.1); });
    V.emit(m, 'mouth', at(S(5.6), -S(1.9), 0), 'head');
    // tail: a loop curling up behind
    const tail = [];
    for (let i = 0; i <= 10; i++) { const a = -0.3 + i * 0.55, r = S(3.6) * (1 - i * 0.04); tail.push([S(-8) - Math.sin(a) * r * 0.6, S(8) + S(i * 0.9) + Math.cos(a) * r * 0.3, 0]); }
    V.joint(m, 'tail', [S(-6.5), S(8), 0], null);
    V.inPart(m, 'tail', () => { for (let i = 0; i < tail.length - 1; i++) m.capsule(tail[i], tail[i + 1], S(1.3) * (1 - i * 0.05), S(1.3) * (1 - (i + 1) * 0.05), P.tail || body); });
    m.part = null;
    return { hc, hr, fy: P.faceYaw == null ? 32 : P.faceYaw, tailTip: tail[tail.length - 1], S };
  }
  function eyes(m, g, P) { K.eyes(m, [g.hc[0], g.hc[1] - g.S(0.2), g.hc[2]], { yaw: g.fy, ang: 30, el: 12, size: 2, tall: 2, iris: P.eye, pupil: P.pupil || '#0a0a14', white: '#ffffff', lid: P.lid }); }

  /* ===== Gaiaroki → Terraki → Rockraki (Earth). Card palette #6B4E32 #8B6F47 #C9A96B #7AA437 #4A4A4A. ===== */
  V.register('gaiaroki', function (stage) {
    const m = new V.Model(), k = [1, 1.2, 1.42][stage - 1] * V.detail();
    const BR = ['#6b4e32', '#8b6f47', '#7a5c3a'], MOSS = ['#7aa437', '#8fc04a', '#5e8a2a'], ST = ['#4a4a4a', '#6a6a66', '#858078'];
    const P = { body: K.cellsOf(BR, 2.4, 3), belly: '#a8875a', paw: '#8b6f47', face: '#c9a96b', ear: '#8b6f47', earIn: '#c9a96b', eye: '#ffc93a', nose: '#4a3626', tail: K.cellsOf(BR, 2, 4) };
    const g = primate(m, k, P), S = g.S;
    // living moss over the back, shoulders and head top
    K.recolour(m, (x, y, z) => !m.has(x, y + 1, z) && y > S(8), (x, y, z) => { const c = V.cells(x, y, z, 2.6, 21); return c.id % 3 === 0 ? null : c.id % 5 === 0 ? ST[c.id % 3] : MOSS[c.id % 3]; });
    // a crown of moss and rock blocks
    const crest = stage === 1 ? 5 : stage === 2 ? 7 : 9;
    for (let i = 0; i < crest; i++) { const a = (i / (crest - 1) - 0.5) * 2.2; K.tuft(m, [g.hc[0] - S(1), g.hc[1] + S(3.8), Math.sin(a) * S(3)], [-0.5, 1, Math.sin(a) * 0.8], S(3.2) + (i % 2) * S(1.2), S(1.3), i % 3 === 1 ? ST[1] : MOSS[i % 2]); }
    // boulder fist(s)
    const fists = stage === 3 ? [1, -1] : [1];
    fists.forEach((sd) => { const c = [S(6.8), S(3.2), sd * S(5)]; m.ellipsoid(c[0], c[1], c[2], S(3), S(3), S(2.8), K.cellsOf(ST.concat(MOSS[0]), 1.8, 9)); });
    if (stage >= 2) K.sym((sd) => { m.ellipsoid(S(2.5), S(11.5), sd * S(4.5), S(2.6), S(1.8), S(1.6), K.cellsOf(ST, 1.6, 5)); });
    if (stage === 3) { for (let i = 0; i < 4; i++) K.tuft(m, [S(-2 + i * 1.6), S(12), 0], [-0.4, 1, (i % 2 ? 0.3 : -0.3)], S(3), S(1.4), ST[i % 3]); }
    K.bits(m, [0, S(16), 0], [S(12), S(6), S(9)], stage * 3, ST.concat(['#c9a96b']), 41, 0);
    eyes(m, g, P);
    return m;
  });

  /* ===== Kairyu → Tidalong → Oceanfang (Water). Card palette #0A4BFF #3EC8FF #7FF0FF #E0F6FF #D6B88A. ===== */
  V.register('kairyu', function (stage) {
    const m = new V.Model(), k = [1, 1.2, 1.42][stage - 1] * V.detail();
    const BL = ['#0a4bff', '#1e5fe6', '#0d3fc2'], LB = '#3ec8ff', ICE = '#7ff0ff', W = '#e0f6ff', TAN = '#d6b88a';
    const P = { body: K.cellsOf(BL, 2.3, 7), belly: W, paw: W, face: W, ear: BL[0], earIn: TAN, eye: '#2ee6ff', nose: '#0a2a6a', mouth: '#0a2a6a', tail: K.cellsOf([BL[0], LB], 2, 8) };
    const g = primate(m, k, P), S = g.S;
    K.recolour(m, (x, y, z) => y > S(5) && !m.has(x, y + 1, z) && V.hash(x, y, z, 4) < 0.25, () => LB);
    // spiky swept-back mane
    const n = [6, 8, 10][stage - 1];
    for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 2.4; K.tuft(m, [g.hc[0] - S(0.5), g.hc[1] + S(3) - Math.abs(a) * S(1.2), Math.sin(a) * S(3.6)], [-0.7, 1.3 - Math.abs(a) * 0.3, Math.sin(a) * 1.1], S(6) - Math.abs(a) * S(1.4), S(1.8), i % 3 === 0 ? LB : BL[i % 2]); }
    // tide-water tail plume
    K.flame(m, g.tailTip, [0.2, 1, 0], S(5) + stage * 1.5, S(1.8), [LB, ICE, W], 31, { lean: -0.6 });
    if (stage >= 2) K.sym((sd) => { for (let i = 0; i < 3; i++) K.tuft(m, [S(4 - i * 0.6), S(8 - i * 1.6), sd * S(4.8)], [-1, 0.3, sd * 0.6], S(3) - i * 0.6, S(0.9), { c: i ? LB : ICE, g: 0.4 }); });
    if (stage === 3) { for (let i = 0; i < 4; i++) K.crystal(m, [S(-3 + i * 1.6), S(11.5), (i % 2 ? 1 : -1) * S(1.2)], [-0.5, 1, (i % 2 ? 0.4 : -0.4)], S(4), S(1), [LB, ICE]); }
    eyes(m, g, P);
    return m;
  });

  /* ===== Pyrokai → Emberkai → Infernokai (Fire, blue flame). Card palette #00D1FF #3B8FFF #7A8BFF #E6F3FF #1A1F2B. ===== */
  V.register('pyrokai', function (stage) {
    const m = new V.Model(), k = [1, 1.2, 1.42][stage - 1] * V.detail();
    const DK = ['#1a1f2b', '#262d40', '#323a55'], CY = '#00d1ff', BL = '#3b8fff', W = '#e6f3ff', LAV = '#7a8bff';
    const P = { body: (x, y, z) => (V.hash(x, y, z, 2) < 0.035 ? { c: CY, g: 0.5 } : DK[V.cells(x, y, z, 2.2, 5).id % 3]), belly: '#c9d6f0', paw: W, face: W, ear: DK[1], earIn: '#c9b0b8', eye: '#22d8ff', nose: '#2a2f45', tail: K.cellsOf(DK, 2, 6) };
    const g = primate(m, k, P), S = g.S;
    // a blue flame mane rising from the head
    K.mane(m, [g.hc[0] - S(1), g.hc[1] + S(3.5), 0], [-0.35, 1, 0], S(5) + stage * 1.2, S(1.7), [BL, CY, W], 50 + stage, 3 + stage, 1.3);
    K.flame(m, g.tailTip, [0.1, 1, 0], S(4.5) + stage, S(1.6), [BL, CY, W], 70);
    if (stage >= 2) K.sym((sd) => K.flame(m, [S(0), S(11), sd * S(3.5)], [-0.6, 1, sd * 0.4], S(3), S(1.1), [LAV, BL, CY], 80 + sd));
    if (stage === 3) K.sym((sd) => K.flame(m, [S(6.5), S(3), sd * S(4.6)], [0.3, 1, sd * 0.3], S(3.2), S(1.2), [BL, CY, W], 90 + sd));
    eyes(m, g, P);
    return m;
  });
})(typeof window !== 'undefined' ? window : globalThis);
