/* Aminas — voxel sculpts: bipeds, constructs and spirits (Voltar, Zeep, Lumi, Terraflora, Pyro-Core line, Meta, Atem,
   the starters Lumifern and Umbrit) and The Entity (story character, not a collectable). */
(function (root) {
  'use strict';
  const V = root.A.Voxel, K = V.kit;

  // Upright body: legs, hips, torso, arms, head. Returns joints for dressing.
  function biped(m, k, P) {
    const S = (v) => v * k, L = P.legLen || 7, T = P.torso || 6, W = P.width || 2.6;
    K.sym((sd) => {
      m.capsule([0, S(L), sd * S(W * 0.6)], [S(0.4), S(L * 0.5), sd * S(W * 0.7)], S(P.thigh || 1.5), S(1.3), P.leg1 || P.body);
      m.capsule([S(0.4), S(L * 0.5), sd * S(W * 0.7)], [0, S(1), sd * S(W * 0.75)], S(1.3), S(P.shin || 1.2), P.leg2 || P.leg1 || P.body);
      m.box(S(-1), 0, sd * S(W * 0.75) - S(1), S(2.2), S(1.2), sd * S(W * 0.75) + S(1), P.foot || P.leg2 || P.body);
    });
    m.capsule([0, S(L + 0.5), 0], [S(0.3), S(L + T), 0], S(W), S(W * (P.chest || 1.15)), P.body);
    const sh = S(L + T - 0.5), hand = [];
    K.sym((sd) => {
      const s0 = [S(0.3), sh, sd * S(W * 1.35)], el = [S(0.8 + (P.armFwd || 0)), sh - S(T * 0.55), sd * S(W * 1.6)], hd = [S(1.8 + (P.armFwd || 0) * 2), sh - S(T * 1.05), sd * S(W * 1.55)];
      m.capsule(s0, el, S(P.arm || 1.1), S(1), P.arm1 || P.body); m.capsule(el, hd, S(1), S(0.9), P.arm2 || P.arm1 || P.body);
      if (P.hand) m.ellipsoid(hd[0], hd[1], hd[2], S(1.2), S(1.2), S(1.1), P.hand);
      hand.push({ sd, s0, el, hd });
    });
    const hc = [S(0.6), S(L + T + (P.neck || 1.5) + (P.head || 3)), 0];
    m.ellipsoid(hc[0], hc[1], hc[2], S(P.head || 3), S((P.head || 3) * (P.headY || 1)), S(P.head || 3), P.headCol || P.body);
    return { S, hc, hr: S(P.head || 3), hand, top: S(L + T), sh, L: S(L) };
  }
  const front = (m, c, yaw, el) => K.surface(m, c, yaw, el || 0, 30);

  /* ===== Voltar I → II → III (Dark): the sparkling jester. Card palette #8B00B8 #FFA500 #4169E1 #FFFFFF #7FFFE0 #1A1A6B. ===== */
  V.register('voltar', function (stage) {
    const m = new V.Model(), k = [0.95, 1.1, 1.35][stage - 1];
    const PU = ['#8b00b8', '#6a0090', '#a020d0'], GD = '#ffa500', GL = '#ffd700', W = '#ffffff', MG = stage === 1 ? '#4169e1' : '#ff00ff', CY = '#00e6ff';
    const g = biped(m, k, { body: K.cellsOf(PU, 1.8, 2), leg1: PU[0], leg2: (x, y) => (y < 2 * k ? GD : PU[1]), foot: PU[1], legLen: 6, torso: 5, width: 2.4, hand: W, arm1: PU[2], arm2: PU[0], headCol: W, head: 2.9, armFwd: 0.6 });
    const S = g.S;
    // gold chest plate with a glowing gem, gold knee and shoulder blocks
    const ch = front(m, [S(0.3), S(9), 0], 20, 0); if (ch) { m.box(ch[0], ch[1] - 1, ch[2] - 1, ch[0], ch[1] + 1, ch[2] + 1, GD); m.set(ch[0] + 1, ch[1], ch[2], CY, 1); }
    K.sym((sd) => { m.ellipsoid(S(0.4), g.sh, sd * S(3.3), S(1.5), S(1.2), S(1.3), GD); m.box(S(0.8), S(3), sd * S(1.8) - 1, S(1.8), S(4), sd * S(1.8) + 1, GD); });
    // mask face: yellow glowing eyes, a purple grin
    K.eyes(m, g.hc, { yaw: 25, ang: 28, el: 12, size: 2, tall: 2, iris: GL, pupil: '#3a2a00', lid: PU[1] });
    const mo = front(m, [g.hc[0], g.hc[1] - S(1.4), 0], 25, 0); if (mo) { for (let d = -2; d <= 2; d++) m.set(mo[0] - (Math.abs(d) > 1 ? 1 : 0), mo[1] + (Math.abs(d) > 1 ? 1 : 0), mo[2] + d, PU[1]); }
    // jester hat: a band and curling prongs tipped with gold bells
    m.ellipsoid(g.hc[0], g.hc[1] + S(1.8), 0, S(3.2), S(1.6), S(3.2), GD, 'under');
    m.ellipsoid(g.hc[0] - S(0.2), g.hc[1] + S(2.6), 0, S(3), S(1.5), S(3), PU[0], 'under');
    const prongs = stage === 1 ? [-0.9, 0.9] : stage === 2 ? [-1, 0, 1] : [-1.1, -0.45, 0.45, 1.1];
    prongs.forEach((a, i) => {
      let p = [g.hc[0] - S(0.4), g.hc[1] + S(3.4), Math.sin(a) * S(2.2)]; const col = i % 2 ? GD : PU[0];
      for (let j = 0; j < 4; j++) { const q = K.add(p, K.norm([-0.25, 1.1 - j * 0.6, a * 1.3]), S(2.2)); m.capsule(p, q, S(1.1) * (1 - j * 0.18), S(1.1) * (1 - (j + 1) * 0.18), col); p = q; }
      m.ellipsoid(p[0], p[1] - S(0.6), p[2], S(0.9), S(0.9), S(0.9), GL);
    });
    if (stage >= 2) {
      m.box(S(-2.6), S(1.5), S(-3.5), S(-1.8), S(10), S(3.5), K.cellsOf([MG, PU[1], PU[0]], 1.6, 3), 'under'); // cape
      for (let i = -1; i <= 1; i++) K.tuft(m, [g.hc[0], g.hc[1] + S(4.2), i * S(1)], [0.1, 1, i * 0.3], S(2 - Math.abs(i) * 0.6), S(0.7), GL);
      g.hand.forEach((h) => m.ellipsoid(h.hd[0] + S(1.5), h.hd[1] + S(1.5), h.hd[2] + h.sd * S(1.5), S(1.1), S(1.1), S(1.1), K.glow(stage === 3 ? CY : '#c040ff', 1)));
    }
    if (stage === 3) {
      [[-4, 13, 7], [5, 15, -7], [-6, 6, -6], [6, 7, 8]].forEach(([x, y, z], i) => { const c = [S(x), S(y), S(z)]; m.box(c[0], c[1], c[2], c[0] + 1, c[1] + 3, c[2] + 2, i % 2 ? W : '#f0e6ff'); m.set(c[0] + 2, c[1] + 2, c[2] + 1, K.glow(MG).c, 1); });
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; m.set(Math.round(Math.cos(a) * S(6)), 1, Math.round(Math.sin(a) * S(6)), '#d946ef', 1); }
    }
    return m;
  });

  /* ===== Zeep I → II → III (Metal): the tiny shell of forgotten technology. Dark blocks, cyan circuit seams. ===== */
  V.register('zeep', function (stage) {
    const m = new V.Model(), k = [0.85, 1.2, 1.55][stage - 1], S = (v) => v * k;
    const DK = ['#12161c', '#1b2129', '#262e38', '#0c0f14'], CY = '#22d8ff', ICE = '#9ff0ff';
    m.ellipsoid(0, S(6), 0, S(7), S(5.6), S(6.2), DK[1]);
    m.box(S(-8), 0, S(-8), S(8), S(2.8), S(8), null, 'carve');
    K.plates(m, () => true, { size: stage === 3 ? 3 : 2.6, seed: 4, seam: 0.4, seamCol: CY, seamGlow: true, cols: DK });
    K.recolour(m, (x, y, z, v) => v.c === CY && V.hash(x, y, z, 5) < (stage === 1 ? 0.7 : 0.55), () => DK[0]);
    // head: big round, cyan eyes
    const hc = [S(8.6), S(4), 0]; m.ellipsoid(hc[0], hc[1], hc[2], S(3.3), S(3), S(3.2), K.cellsOf(DK, 1.5, 7));
    K.eyes(m, hc, { yaw: 30, ang: 34, el: 8, size: 2, tall: 2, iris: CY, pupil: '#04263a', white: ICE });
    K.sym((sd) => [S(3.5), S(-3.5)].forEach((x) => { m.box(x - S(1.2), 0, sd * S(4.4) - S(1.2), x + S(1.2), S(3), sd * S(4.4) + S(1.2), K.cellsOf(DK, 1.2, 9)); m.set(Math.round(x + S(1.2)) + 1, 0, Math.round(sd * S(4.4)), DK[2]); }));
    if (stage === 1) K.crystal(m, [S(-6.5), S(4), 0], [-1, 0.4, 0], S(2.4), S(0.8), [CY, ICE]);
    if (stage >= 2) { for (let i = 0; i < (stage === 2 ? 5 : 9); i++) { const a = (i / (stage === 2 ? 5 : 9)) * Math.PI * 1.6 - 0.8 + Math.PI; const b = [Math.cos(a) * S(4.5), S(9.5), Math.sin(a) * S(4.5)]; K.crystal(m, b, [Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5], S(3 + (i % 3)), S(0.9), [CY, ICE]); } K.crystal(m, [S(-6.5), S(4), 0], [-1, 0.6, 0], S(3.4), S(1), [CY, ICE]); }
    if (stage === 3) { for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; m.set(Math.round(Math.cos(a) * S(2.4)), Math.round(S(11.3)), Math.round(Math.sin(a) * S(2.4)), CY, 1); } K.sym((sd) => m.box(S(-1), S(5), sd * S(6.2), S(1), S(7), sd * S(6.2), K.glow(CY))); }
    return m;
  });

  /* ===== Lumi I → II → III (Light): the soft spark. White block shell, glowing cyan face. ===== */
  V.register('lumi', function (stage) {
    const m = new V.Model(), k = [0.9, 1.1, 1.3][stage - 1], S = (v) => v * k;
    const W = ['#ffffff', '#eef3f8', '#dde6ef'], CY = '#3fd6ff', ICE = '#a9ecff', NV = '#0b3a66', lift = S(5);
    const c = [0, S(7) + lift, 0];
    m.ellipsoid(c[0], c[1], c[2], S(6), S(stage === 1 ? 6 : 6.6), S(6), K.cellsOf(W, 1.6, 3));
    // glowing face: the front of the shell opens onto the cyan core
    const fy = 28 * Math.PI / 180;
    K.recolour(m, (x, y, z) => (x - c[0]) * Math.cos(fy) + (z - c[2]) * Math.sin(fy) > S(4) && Math.abs(y - c[1]) < S(4.2), (x, y, z) => ({ c: V.hash(x, y, z, 2) < 0.4 ? ICE : CY, g: 0.5 }));
    K.eyes(m, [c[0], c[1] + S(0.5), c[2]], { yaw: 28, ang: 24, el: 4, size: 2, tall: 3, iris: NV, pupil: '#061a33', white: '#ffffff', glow: false });
    const mo = front(m, [c[0], c[1] - S(2.2), c[2]], 28); if (mo) { m.set(mo[0], mo[1], mo[2], NV); m.set(mo[0], mo[1], mo[2] - 1, NV); m.set(mo[0], mo[1] + 1, mo[2] + 1, NV); m.set(mo[0], mo[1] + 1, mo[2] - 2, NV); }
    // data wisps underneath (they also keep it floating above the ground)
    for (let i = 0; i < 18; i++) { const a = i * 0.7, r = S(3 + i * 0.12); m.set(Math.round(Math.cos(a) * r), Math.round(i * lift / 18), Math.round(Math.sin(a) * r), CY, i % 3 ? 0.5 : 1); }
    if (stage >= 2) {
      m.capsule([c[0] - S(1), c[1] - S(5), c[2]], [c[0] + S(1), c[1] - S(8.5), c[2]], S(2.6), S(0.6), K.cellsOf(W, 1.4, 5)); // tapering shell point
      const gem = front(m, [c[0], c[1] - S(5.5), c[2]], 28); if (gem) m.ellipsoid(gem[0], gem[1], gem[2], 1.2, 1.6, 1.2, K.glow(CY));
      K.sym((sd) => K.wing(m, [c[0] - S(1), c[1] + S(1), sd * S(5.5)], sd, S(stage === 2 ? 6 : 9), { cols: stage === 2 ? [W[0], W[1]] : [W[0], ICE, CY], up: 1.3, back: 0.2, droop: 0.4, sweep: 0.3, featherLen: 0.5, feathers: 4, bone: 1.2, boneCol: W[0], glowTips: stage === 3 ? CY : null }));
      for (let i = -1; i <= 1; i++) m.box(c[0] + i * 2 - 1, c[1] + S(6.5), c[2] - 1, c[0] + i * 2, c[1] + S(6.5) + (i ? 2 : 3), c[2], W[0]);
    }
    if (stage === 3) {
      for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; m.set(Math.round(c[0] - S(1.5) + Math.cos(a) * S(1)), Math.round(c[1] + S(3) + Math.sin(a) * S(7)), Math.round(Math.cos(a) * S(7)), i % 2 ? W[0] : ICE, i % 2 ? 0 : 0.6); }
      K.sym((sd) => { const f = [S(4), c[1] - S(4), sd * S(9)]; m.box(f[0] - S(1.6), f[1] - S(1.6), f[2] - S(1.6), f[0] + S(1.6), f[1] + S(1.6), f[2] + S(1.6), K.cellsOf(W, 1.2, 8)); m.set(Math.round(f[0] + S(1.6)) + 1, Math.round(f[1]), Math.round(f[2]), CY, 1); });
    }
    return m;
  });

  /* ===== Terraflora I → II Grove Sentinel → III Worldshaper (Nature). Card palette #228B22 #7A9F3A #5B3A1F #C8A96A #00FF88. ===== */
  V.register('terraflora', function (stage) {
    const m = new V.Model();
    const MS = ['#2b8b22', '#5e9e3b', '#7a9f3a', '#3a7a2e'], WD = ['#5b3a1f', '#7a5230', '#8b6a40', '#c8a96a'], GL = '#00ff88';
    const wood = K.cellsOf(WD.slice(0, 3), 1.8, 4);
    const circuit = (x, y, z) => (V.hash(x, y, z, 7) < 0.12 ? K.glow(GL, 0.6) : wood(x, y, z));
    if (stage === 1) {
      // big round head on spreading roots
      const hc = [0, 9.5, 0]; m.ellipsoid(hc[0], hc[1], hc[2], 5, 4.6, 4.8, wood);
      K.recolour(m, (x, y) => y > 10.5, (x, y, z) => MS[V.cells(x, y, z, 2, 3).id % 4]);
      K.leaves(m, [hc[0] - 0.5, hc[1] + 3.2, 0], [4.4, 1.8, 4.4], MS, 5, { n: 14, dome: true });
      K.eyes(m, [hc[0], hc[1], 0], { yaw: 25, ang: 30, el: 0, size: 2, tall: 2, iris: GL, white: '#c8ffd8' });
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.3, p1 = [Math.cos(a) * 3, 4.5, Math.sin(a) * 3], p2 = [Math.cos(a) * 6.5, 1.5, Math.sin(a) * 6.5], p3 = [Math.cos(a) * 8.5, 0, Math.sin(a) * 8.5]; m.capsule([0, 6, 0], p1, 1.6, 1.3, wood); m.capsule(p1, p2, 1.3, 1, circuit); m.capsule(p2, p3, 1, 0.6, circuit); }
      K.sym((sd) => { const b = [hc[0] - 1, hc[1] + 3.5, sd * 2.5]; K.tuft(m, b, [-0.3, 1, sd * 0.6], 4, 0.8, WD[1]); K.tuft(m, K.add(b, K.norm([-0.3, 1, sd * 0.6]), 2.4), [0.4, 1, sd * 0.2], 2, 0.6, WD[1]); m.ellipsoid(b[0] - 1, b[1] + 4, b[2] + sd * 2.5, 1.2, 1, 1.2, '#c8e05a'); });
      return m;
    }
    const k = stage === 2 ? 1 : 1.35;
    const g = biped(m, k, { body: circuit, leg1: wood, legLen: stage === 2 ? 6 : 8, torso: 6, width: 2.8, thigh: 2, arm: 1.3, headCol: wood, head: 3.4, chest: 1.2, hand: WD[1] });
    const S = g.S;
    K.recolour(m, (x, y, z) => !m.has(x, y + 1, z) && V.hash(x, y, z, 3) < 0.6, (x, y, z) => MS[V.cells(x, y, z, 1.8, 6).id % 4]);
    K.leaves(m, [g.hc[0] - S(0.5), g.hc[1] + S(2.4), 0], [S(3.6), S(1.6), S(3.6)], MS, 9, { n: 12, dome: true });
    K.eyes(m, g.hc, { yaw: 22, ang: 30, el: 0, size: 2, tall: 1, iris: GL, white: '#c8ffd8' });
    // branch crown
    const n = stage === 2 ? 4 : 6;
    for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 2.6, b = [g.hc[0] - S(0.5), g.hc[1] + S(2.5), Math.sin(a) * S(2.4)], d = [-0.2, 1, Math.sin(a) * 1.2], e = K.add(b, K.norm(d), S(4)); m.capsule(b, e, S(0.8), S(0.6), WD[0]); const t = K.add(e, K.norm([0.3, 1, Math.sin(a) * 0.5]), S(2.4)); m.capsule(e, t, S(0.6), 0.5, WD[1]); m.ellipsoid(t[0], t[1] + 1, t[2], S(1.4), S(1.1), S(1.4), stage === 2 && i % 2 ? '#f4f0e0' : MS[i % 4]); }
    // roots spreading from the feet
    K.sym((sd) => { for (let i = 0; i < 3; i++) { const a = (i - 1) * 0.9 + (sd > 0 ? 0.5 : -0.5); m.capsule([0, S(1), sd * S(2)], [Math.cos(a) * S(4.5), 0, sd * S(2) + Math.sin(a) * S(3.5)], S(0.9), S(0.5), circuit); } });
    if (stage === 3) { const ch = front(m, [S(0.3), g.top - S(2), 0], 20); if (ch) m.ellipsoid(ch[0], ch[1], ch[2], 1, 1.6, 1, K.glow(GL)); [[-4, 26, 7], [6, 22, -8], [-6, 14, -8], [4, 30, -4]].forEach(([x, y, z]) => K.crystal(m, [x, y, z], [0, 1, 0], 3, 1, ['#00c866', GL])); }
    return m;
  });

  /* ===== Pyro-Cell → Pyro-Forge → Pyro-Core (Earth): the molten guardian. Card palette #800000 #A15D38 #FF4500 #FF0000 #808080.
     Only the final form has supplied art; the first two forms are new provisional designs. ===== */
  V.register('pyrocell', function (stage) {
    const m = new V.Model(), k = [0.9, 1, 1.25][stage - 1];
    const RK = ['#2a2426', '#3a3234', '#4a4044', '#1e1a1c'], OR = '#ff4500', RD = '#ff2000', YL = '#ffb020';
    const rock = (x, y, z) => { const c = V.cells(x, y, z, 2.6, 3); return c.edge < 0.3 ? K.glow(V.hash(x, y, z, 2) < 0.5 ? OR : RD, V.hash(x, y, z, 4) < 0.06 ? 1 : 0.45) : RK[c.id % 4]; };
    if (stage === 1) {
      const S = (v) => v * 1.0;
      m.ellipsoid(0, S(6), 0, S(5.5), S(5), S(5), rock);
      K.sym((sd) => { m.box(S(-2), 0, sd * S(2.6) - 1, S(1), S(2.5), sd * S(2.6) + 1, RK[1]); m.capsule([S(1), S(6), sd * S(4.6)], [S(3), S(2.8), sd * S(5.2)], S(1.4), S(1.6), rock); });
      const core = front(m, [0, S(6), 0], 25); if (core) m.ellipsoid(core[0], core[1], core[2], 1.4, 1.4, 1.4, K.glow(YL));
      K.eyes(m, [0, S(8.5), 0], { yaw: 25, ang: 26, el: 6, size: 1, iris: YL });
      return m;
    }
    const g = biped(m, k, { body: rock, legLen: 7, torso: 8, width: 3.6, thigh: 2.4, shin: 2.2, arm: 2.2, chest: 1.35, headCol: rock, head: 2.8, neck: 0, armFwd: 0.6 });
    const S = g.S;
    // huge fists, shoulder spikes, a blazing core
    g.hand.forEach((h) => { m.ellipsoid(h.hd[0], h.hd[1] - S(0.6), h.hd[2], S(2.4), S(2.4), S(2.2), rock); m.ellipsoid(h.s0[0], h.s0[1] + S(0.6), h.s0[2], S(2.4), S(2), S(2.2), rock); if (stage === 3) for (let i = 0; i < 3; i++) K.tuft(m, [h.s0[0] - S(0.5) + i * S(0.8), h.s0[1] + S(2), h.s0[2]], [-0.2, 1, h.sd * 0.5], S(2.5), S(0.8), K.glow(OR, 0.6)); });
    const core = front(m, [S(0.3), g.top - S(2.5), 0], 22); if (core) { m.ellipsoid(core[0], core[1], core[2], S(1.6), S(1.6), S(1.6), K.glow(YL)); }
    K.eyes(m, g.hc, { yaw: 22, ang: 28, el: 10, size: 1, iris: YL });
    const mo = front(m, [g.hc[0], g.hc[1] - S(1.2), 0], 22); if (mo) for (let d = -1; d <= 1; d++) m.set(mo[0], mo[1], mo[2] + d, OR, 1);
    return m;
  });

  /* ===== Meta (Metal): the second Tech Amina. Long wired hair tipped with data cubes, a halo of light.
     Only the final form has supplied art; Meta-01 and Meta-02 are new provisional designs. ===== */
  V.register('meta', function (stage) {
    const m = new V.Model(), k = [0.95, 1.1, 1.3][stage - 1];
    const WH = ['#eef4ff', '#cfdcf0', '#b4c6e2'], BL = '#2f8cff', CY = '#5fd0ff';
    const skin = (x, y, z) => (V.hash(x, y, z, 3) < 0.1 ? K.glow(CY, 0.6) : WH[V.cells(x, y, z, 1.6, 2).id % 3]);
    const g = biped(m, k, { body: skin, legLen: 10, torso: 7, width: 2, thigh: 1.4, shin: 1, arm: 0.9, chest: 1.1, headCol: WH[0], head: 2.4, hand: WH[1], armFwd: 0.2 });
    const S = g.S;
    K.eyes(m, g.hc, { yaw: 22, ang: 28, el: 4, size: 1, iris: CY });
    // hair cables flowing back and down, data cubes along them
    const nC = [4, 7, 10][stage - 1];
    for (let i = 0; i < nC; i++) {
      const a = (i / (nC - 1) - 0.5) * 2.6; let p = [g.hc[0] - S(1.8), g.hc[1] + S(0.5), Math.sin(a) * S(2)];
      for (let j = 0; j < 5 + stage; j++) { const q = K.add(p, K.norm([-0.22, -1, Math.sin(a) * 0.55 + Math.sin(j + i) * 0.25]), S(2.4)); m.capsule(p, q, 0.5, 0.5, { c: BL, g: 0.6 }, 'under'); if (j % 2 && !m.has(Math.round(q[0]), Math.round(q[1]), Math.round(q[2]))) m.set(q[0], q[1], q[2], WH[0], 0.5); p = q; }
    }
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; m.set(Math.round(g.hc[0] - S(2.6)), Math.round(g.hc[1] + S(0.8) + Math.sin(a) * S(4.2)), Math.round(Math.cos(a) * S(4.2)), i % 4 ? CY : WH[0], i % 4 ? 0.6 : 0); }
    return m;
  });

  /* ===== Atem (Metal): the first Tech Amina. Armoured giant whose arms become blades.
     Only the final form has supplied art; Atem-01 and Atem-02 are new provisional designs. ===== */
  V.register('atem', function (stage) {
    const m = new V.Model(), k = [0.95, 1.1, 1.3][stage - 1];
    const AR = ['#e8eef8', '#c3cfe0', '#9aa8bf', '#7d8aa3'], BL = '#2f7bff', CY = '#7fd0ff';
    const plate = (x, y, z) => { const c = V.cells(x, y, z, 2, 6); return c.edge < 0.18 ? K.glow(BL, 0.4) : AR[c.id % 4]; };
    const g = biped(m, k, { body: plate, legLen: 10, torso: 8, width: 3, thigh: 2, shin: 1.6, arm: 1.6, chest: 1.3, headCol: plate, head: 2.4, neck: 1, armFwd: 0.8 });
    const S = g.S;
    g.hand.forEach((h) => m.ellipsoid(h.s0[0], h.s0[1] + S(0.8), h.s0[2], S(2.4), S(1.8), S(2), plate));
    K.eyes(m, g.hc, { yaw: 20, ang: 24, el: 4, size: 1, iris: CY });
    // blades grow from the forearms (one at stage 2, both at stage 3)
    g.hand.forEach((h, i) => {
      if (stage === 1 || (stage === 2 && i === 1)) { m.ellipsoid(h.hd[0], h.hd[1], h.hd[2], S(1.6), S(1.6), S(1.5), plate); return; }
      const tip = K.add(h.hd, K.norm([0.9, -0.9, h.sd * 0.15]), S(10));
      m.capsule(h.hd, tip, S(1.3), 0.6, (x, y, z) => ({ c: V.hash(x, y, z, 9) < 0.5 ? CY : '#e6f4ff', g: 0.7 }));
    });
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; m.set(Math.round(g.hc[0] - S(2.6)), Math.round(g.hc[1] + S(0.8) + Math.sin(a) * S(4)), Math.round(Math.cos(a) * S(4)), i % 3 ? CY : AR[0], i % 3 ? 0.6 : 0); }
    return m;
  });

  /* ===== Lumifern → Solarbloom → Aurelith (Light starter). Kept from v0.6 and rebuilt in blocks; Aurelith is a new third form. ===== */
  V.register('lumifern', function (stage) {
    const m = new V.Model(), k = [1, 1.25, 1.5][stage - 1], S = (v) => v * k;
    const GR = ['#bff58a', '#a6e870', '#d2fb9e'], CR = '#fff7c8', YL = '#ffd86b', GD = '#ffcf4a', LF = ['#7fcf5a', '#9fe36a'];
    const lo = stage === 1 ? 0 : 2.5;
    const bc = [0, S(5 + lo), 0];
    m.ellipsoid(bc[0], bc[1], bc[2], S(5), S(4.6), S(4.4), K.cellsOf(GR, 1.8, 3));
    m.ellipsoid(S(1.8), S(4 + lo), 0, S(3.4), S(3), S(3.4), CR, 'paint');
    if (stage > 1) K.sym((sd) => { m.capsule([S(-0.5), S(4 + lo), sd * S(2.4)], [0, S(0.8), sd * S(2.6)], S(1.3), S(1.1), GR[1]); m.ellipsoid(S(0.6), S(0.7), sd * S(2.6), S(1.6), S(0.8), S(1.2), CR); });
    else K.sym((sd) => m.ellipsoid(S(2), S(0.8), sd * S(2.6), S(1.6), S(0.9), S(1.3), CR));
    const hc = [S(2.6), S(8.5 + lo), 0];
    if (stage > 1) m.ellipsoid(hc[0], hc[1], hc[2], S(3.6), S(3.3), S(3.6), K.cellsOf(GR, 1.8, 4));
    K.eyes(m, stage > 1 ? hc : [bc[0] + S(1), bc[1] + S(1), 0], { yaw: 30, ang: 28, el: stage > 1 ? 4 : 14, size: 2, tall: 2, iris: '#3a6a2a', pupil: '#16300e', white: '#ffffff', glow: false });
    const top = stage > 1 ? [hc[0] - S(0.5), hc[1] + S(2.6), 0] : [bc[0], bc[1] + S(3.8), 0];
    // leaf ears and the star mark
    K.sym((sd) => { const b = K.add(top, [0, 0, sd * S(2.2)], 1); m.capsule(b, K.add(b, K.norm([-0.6, 0.9, sd * 0.9]), S(4.5)), S(1.5), S(0.6), (x, y, z, t) => (t > 0.15 && t < 0.85 && V.hash(x, y, z, 1) < 0.2 ? LF[0] : LF[1])); });
    const st = front(m, [top[0] + S(0.5), top[1] - S(1), 0], 30, 10); if (st) { [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([a, b]) => m.set(st[0], st[1] + a, st[2] + b, YL, 1)); }
    // leaf tail
    K.tuft(m, [S(-4), S(4 + lo), 0], [-1, 0.9, 0], S(4), S(1.6), LF[0]);
    if (stage >= 2) { for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.4; K.tuft(m, [top[0] - S(0.4), top[1] - S(0.4), Math.sin(a) * S(2.6)], [-0.2, 1, Math.sin(a) * 1.1], S(2.6) + (i % 2) * S(1), S(1.1), i % 2 ? GD : YL); } }
    if (stage === 3) {
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; K.tuft(m, [S(-1.2), hc[1] + Math.sin(a) * S(4.6), Math.cos(a) * S(4.6)], [-0.2, Math.sin(a), Math.cos(a)], S(2.4), S(1), { c: i % 2 ? '#fff0a8' : GD, g: 0.5 }); }
      K.sym((sd) => K.wing(m, [S(-1), S(8 + lo), sd * S(4)], sd, S(8), { cols: [LF[1], LF[0], GD], up: 1, back: 0.6, droop: 0.8, featherLen: 0.6, feathers: 5, bone: 1, boneCol: LF[0] }));
    }
    return m;
  });

  /* ===== Umbrit → Duskmantle → Eclipsar (Dark starter). Kept from v0.6 and rebuilt in blocks; Eclipsar is a new third form. ===== */
  V.register('umbrit', function (stage) {
    const m = new V.Model(), k = [1, 1.25, 1.5][stage - 1], S = (v) => v * k;
    const PU = ['#5a4a9a', '#4a3a88', '#6a58b0'], PL = '#a89be0', CR = '#f4e9ff', GL = '#b9a2ff', NV = '#1e1640';
    const lo = stage === 1 ? 0 : 3;
    const bc = [0, S(5 + lo), 0];
    m.ellipsoid(bc[0], bc[1], bc[2], S(5), S(4.4 + (stage > 1 ? 0.6 : 0)), S(4.2), K.cellsOf(PU, 1.8, 3));
    m.ellipsoid(S(1.8), S(4 + lo), 0, S(3.2), S(3), S(3.2), PL, 'paint');
    if (stage > 1) {
      // a cloak of living twilight hangs from the shoulders to the ground
      m.capsule([S(-2.4), S(8 + lo), 0], [S(-3), S(0.5), 0], S(3.6), S(5), (x, y, z) => (y < S(2) && V.hash(x, y, z, 4) < 0.3 ? null : K.cellsOf([NV, PU[1], '#2c2260'], 2, 5)(x, y, z)), 'under');
      K.recolour(m, (x, y) => y < S(1.5), (x, y, z) => (V.hash(x, y, z, 9) < 0.35 ? K.glow(GL, 0.5) : null));
    } else K.sym((sd) => m.ellipsoid(S(2), S(0.8), sd * S(2.4), S(1.5), S(0.9), S(1.2), PL));
    const hc = stage > 1 ? [S(3.8), S(11.2 + lo), 0] : [S(1), S(7), 0];
    if (stage > 1) m.ellipsoid(hc[0], hc[1], hc[2], S(3.4), S(3.1), S(3.3), K.cellsOf(PU, 1.8, 6));
    K.eyes(m, hc, { yaw: 30, ang: 28, el: stage > 1 ? 4 : 10, size: 2, tall: 2, iris: GL, pupil: '#1a1030', white: CR });
    const top = stage > 1 ? [hc[0] - S(0.4), hc[1] + S(2.6), 0] : [S(0), S(9), 0];
    K.sym((sd) => K.tuft(m, K.add(top, [0, 0, sd * S(2.2)], 1), [-0.3, 1, sd * 0.5], S(stage > 1 ? 3 : 3.6), S(1.4), PU[0]));
    // moon-pale crest
    for (let i = 0; i < 3; i++) K.tuft(m, [top[0] - i * S(1.1), top[1] + S(0.3) - i * S(0.5), 0], [-0.7, 1, 0], S(2.6) - i * 0.4, S(0.9), CR);
    // wisp tail
    K.flame(m, [S(-4.5), S(4 + lo), 0], [-1, 0.8, 0], S(5), S(1.4), [PU[2], GL, CR], 5);
    if (stage >= 2) K.sym((sd) => K.tuft(m, [hc[0] - S(1), hc[1] + S(2.2), sd * S(2)], [-0.8, 0.9, sd * 0.4], S(stage === 2 ? 3.4 : 4), S(0.9), stage === 2 ? CR : PL));
    if (stage === 3) {
      // crescent-moon horns and drifting wisps
      K.sym((sd) => { let p = [hc[0] - S(0.5), hc[1] + S(2.2), sd * S(2.4)]; for (let i = 0; i < 6; i++) { const a = i / 5 * Math.PI * 0.9; const q = [p[0] - S(0.6) + Math.cos(a) * 0.3, p[1] + Math.cos(a) * S(1.4), p[2] + sd * Math.sin(a) * S(1.2)]; m.capsule(p, q, S(0.8) * (1 - i * 0.1), S(0.8) * (1 - (i + 1) * 0.1), K.glow(CR, 0.4)); p = q; } });
      K.bits(m, [0, S(10), 0], [S(9), S(6), S(9)], 10, [GL, CR], 13, 1);
    }
    return m;
  });

  /* ===== The Entity (story guide). Single form; idle / talk / react poses are animated by the scene player. ===== */
  V.register('entity', function () {
    const m = new V.Model();
    const BK = ['#1a1a1a', '#232129', '#0e0d12'], PU = ['#9a6ad8', '#b88af0', '#7a4ac0'], GD = '#b8860b', YL = '#ffd700';
    // cloak: a long tapering robe that breaks into falling blocks near the ground
    m.capsule([0, 22, 0], [-0.5, 3, 0], 4.4, 6.5, (x, y, z) => (y < 6 && V.hash(x, y, z, 2) < (6 - y) * 0.12 ? null : BK[V.cells(x, y, z, 2, 3).id % 3]));
    for (let i = 0; i < 22; i++) { const a = V.hash(i, 1, 1, 1) * Math.PI * 2, r = 4 + V.hash(i, 2, 1, 1) * 4; m.set(Math.round(Math.cos(a) * r), Math.round(V.hash(i, 3, 1, 1) * 5), Math.round(Math.sin(a) * r), BK[i % 3]); }
    // high collar, head with one great eye, a crown of crystal spines
    K.sym((sd) => m.capsule([0, 23, sd * 2.5], [-1.5, 27, sd * 4.2], 1.6, 1.2, BK[1]));
    m.ellipsoid(1, 27.5, 0, 3.4, 3.4, 3.3, K.cellsOf(PU, 1.4, 4));
    const e = K.surface(m, [1, 27.8, 0], 22, 4, 10); if (e) { m.ellipsoid(e[0], e[1], e[2], 1.7, 1.7, 1.7, '#f2e6c8'); m.ellipsoid(e[0] + 1, e[1], e[2] + 0.5, 1.1, 1.1, 1.1, K.glow(YL)); m.set(e[0] + 2, e[1], e[2] + 1, '#2a1a00'); }
    for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.4; K.tuft(m, [0, 30, Math.sin(a) * 2.4], [-0.4, 1, Math.sin(a) * 0.9], 3 + (i % 2) * 1.5, 0.9, K.glow(i % 2 ? PU[1] : '#d7b8ff', 0.5)); }
    // brooch, sleeves and violet hands; the right hand holds a spinning disc
    const br = K.surface(m, [0, 20, 0], 25, 0, 10); if (br) { m.ellipsoid(br[0], br[1], br[2], 1.3, 1.3, 1.3, GD); m.set(br[0] + 1, br[1], br[2] + 1, PU[1], 1); }
    K.sym((sd) => { m.capsule([0, 21, sd * 4.2], [3, 16 + (sd > 0 ? 3 : 0), sd * 6], 1.8, 1.5, BK[0]); m.ellipsoid(3.8, 16 + (sd > 0 ? 3 : 0), sd * 6.5, 1.4, 1.6, 1.3, PU[0]); });
    for (let r = 0; r < 3; r++) for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, R = 4.8 - r * 1.3; m.set(Math.round(4 + Math.cos(a) * R), 22 + r * 0, Math.round(7 + Math.sin(a) * R), r === 1 ? '#ffe9a0' : GD, r === 1 ? 1 : 0.4); }
    return m;
  });
})(typeof window !== 'undefined' ? window : globalThis);
