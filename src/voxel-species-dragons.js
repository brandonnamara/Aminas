/* Aminas — voxel sculpts: dragons, serpents and birds (Ignivor line, Zephyrix line, Aquaflora, Aimza, Pyro-Phoenix). */
(function (root) {
  'use strict';
  const V = root.A.Voxel, K = V.kit;

  // Dragon body plan. P: palette and proportions. heads: 1..3 (Aimza).
  function dragon(m, k, P) {
    const S = (v) => v * k, lo = P.leg || 6;
    V.rigStart(m, 'dragon');   // Phase 8B: body, four legs, one to three heads (each with a jaw), wings, tail
    m.capsule([S(-5), S(lo + 2.2), 0], [S(3), S(lo + 3.6), 0], S(P.girth || 3.6), S((P.girth || 3.6) + 0.3), P.body);
    if (P.belly) m.ellipsoid(S(0), S(lo + 1), 0, S(6.5), S(2.4), S(3), P.belly, 'paint');
    K.sym((sd) => {
      // hind legs: thick haunches; fore legs thinner
      const s = sd > 0 ? 'L' : 'R';
      V.joint(m, 'legB' + s, [S(-4.5), S(lo + 1.5), sd * S(2.8)], null); V.joint(m, 'legF' + s, [S(3), S(lo + 1.5), sd * S(2.6)], null);
      V.inPart(m, 'legB' + s, () => { m.ellipsoid(S(-4.5), S(lo + 1.5), sd * S(2.8), S(3), S(3.2), S(1.8), P.body); m.capsule([S(-4), S(lo), sd * S(3.2)], [S(-2.5), S(1.2), sd * S(3.4)], S(1.9), S(1.4), P.leg1 || P.body); });
      V.inPart(m, 'legF' + s, () => m.capsule([S(3), S(lo + 2), sd * S(2.6)], [S(4), S(1.2), sd * S(3)], S(1.4), S(1.2), P.leg1 || P.body));
      [[S(-2.2), S(3.4), 'legB'], [S(4.2), S(3), 'legF']].forEach(([x, z, n]) => V.inPart(m, n + s, () => { m.ellipsoid(x + S(0.4), S(0.9), sd * z, S(1.6), S(0.9), S(1.4), P.leg1 || P.body); K.toes(m, Math.round(x + S(1.8)), 0, Math.round(sd * z), 3, P.claw || '#f0e8d8'); }));
    });
    // necks and heads
    const heads = P.heads || 1, out = [];
    for (let h = 0; h < heads; h++) {
      const zo = heads === 1 ? 0 : (h - (heads - 1) / 2) * S(4.2), lift = heads === 3 && h === 1 ? S(1.5) : 0;
      const n0 = [S(3), S(lo + 4), zo * 0.4], n1 = [S(5.5), S(lo + 6 + (P.neck || 3) * 0.6) + lift, zo * 0.8], n2 = [S(7), S(lo + 7 + (P.neck || 3)) + lift, zo];
      const hn = h ? 'head' + (h + 1) : 'head', jn = h ? 'jaw' + (h + 1) : 'jaw', mn = h ? 'mouth' + (h + 1) : 'mouth';
      const fy = ((P.faceYaw == null ? 22 : P.faceYaw) + (heads > 1 ? (zo > 0 ? 12 : zo < 0 ? -8 : 0) : 0)) * Math.PI / 180, fd = [Math.cos(fy), -0.12, Math.sin(fy)];
      const hc = [n2[0] + S(1), n2[1] + S(1), n2[2]], hr = S(P.head || 2.6);
      const snout = K.add(hc, fd, hr * (P.snoutLen || 1.5));
      V.joint(m, hn, n0, null);
      V.inPart(m, hn, () => {
        m.capsule(n0, n1, S(2.4), S(2), P.neckCol || P.body); m.capsule(n1, n2, S(2), S(1.8), P.neckCol || P.body);
        if (P.belly) m.capsule([n0[0] + S(1.2), n0[1], n0[2]], [n2[0] + S(0.8), n2[1] - S(0.6), n2[2]], S(1.3), S(1.1), P.belly, 'paint');
        m.ellipsoid(hc[0], hc[1], hc[2], hr, hr * 0.9, hr * 0.9, P.headCol || P.body);
        m.capsule(hc, snout, hr * 0.75, hr * 0.5, P.snoutCol || P.headCol || P.body);
      });
      if (P.jaw) {
        V.joint(m, jn, [hc[0], hc[1] - hr * 0.5, hc[2]], hn);
        V.inPart(m, jn, () => {
          m.capsule([hc[0], hc[1] - hr * 0.55, hc[2]], [snout[0] - S(0.3), snout[1] - hr * 0.55, snout[2]], hr * 0.45, hr * 0.32, P.jaw);
          if (P.teeth) { const t = K.add([snout[0], snout[1] - hr * 0.4, snout[2]], fd, -S(0.8)); m.set(t[0], t[1], t[2] + 1, P.teeth); m.set(t[0] - 1, t[1], t[2] - 1, P.teeth); }
        }, true);
      } else {
        if (P.teeth) V.inPart(m, hn, () => { const t = K.add([snout[0], snout[1] - hr * 0.4, snout[2]], fd, -S(0.8)); m.set(t[0], t[1], t[2] + 1, P.teeth); m.set(t[0] - 1, t[1], t[2] - 1, P.teeth); });
        V.jaw(m, hn, jn, [hc[0], hc[1] - hr * 0.35, hc[2]], (x, y, z) => { const t = (x - hc[0]) * fd[0] + (z - hc[2]) * fd[2]; return t > hr * 0.5 && y < hc[1] - hr * 0.2 - t * 0.14 && Math.abs((z - hc[2]) * fd[0] - (x - hc[0]) * fd[2]) < hr * 0.85; });
      }
      V.inPart(m, hn, () => {
        if (P.horn) K.sym((sd) => K.tuft(m, [hc[0] - hr * 0.3, hc[1] + hr * 0.6, hc[2] + sd * hr * 0.55], [-1, 0.75, sd * 0.3], S(P.hornLen || 3.4), S(0.9), P.horn));
        if (P.crest) for (let i = 0; i < (P.crestN || 4); i++) K.tuft(m, [hc[0] - hr * 0.6 - i * S(0.7), hc[1] + hr * 0.5 - i * S(0.6), hc[2]], [-1, 0.6, 0], S(2.6) - i * 0.3, S(0.8), typeof P.crest === 'function' ? P.crest(i) : P.crest);
        K.eyes(m, hc, { yaw: fy * 180 / Math.PI, ang: 42, el: 18, size: P.eyeSize || 1, tall: 1, iris: P.eye, white: P.eyeWhite, pupil: '#120808', lid: P.lid });
      });
      V.emit(m, mn, snout, hn);
      out.push({ hc, hr, snout, n0, n1, n2 });
    }
    // spine spikes
    if (P.spikes) V.inPart(m, 'core', () => { for (let i = 0; i < 6; i++) K.tuft(m, [S(3 - i * 2), S(lo + 5.6 - i * 0.3), 0], [-0.6, 1, 0], S(1.8), S(0.8), P.spikes); });
    // tail: tapering chain sweeping back, down and up
    const tp = [[S(-7.5), S(lo + 2), 0], [S(-11), S(lo + 0.5), S(1.5)], [S(-14.5), S(lo), S(2.5)], [S(-17.5), S(lo + 1.5), S(2)], [S(-19.5), S(lo + 3.5), S(0.5)]].slice(0, P.tailN || 5);
    V.joint(m, 'tail', [S(-6), S(lo + 2.2), 0], null);
    V.inPart(m, 'tail', () => { for (let i = 0; i < tp.length - 1; i++) m.capsule(tp[i], tp[i + 1], S(2.2) * (1 - i * 0.2), S(2.2) * (1 - (i + 1) * 0.2), P.tailCol || P.body); });
    m.part = null;
    const shoulder = [S(1), S(lo + 5.2), S(1.8)];
    m.geo = { S, lo, heads: out, tp, shoulder };   // Phase 15B: read by the refined roster's species work
    return { S, lo, heads: out, tailTip: tp[tp.length - 1], shoulder };
  }

  /* ===== Igniflare → Pyronix → Ignivor (Fire / Flying). Red scales, cream belly, obsidian wings and horns, a flame tail. ===== */
  V.register('igniflare', function (stage) {
    const m = new V.Model(), k = [0.8, 1.15, 1.45][stage - 1] * V.detail();
    const RD = ['#c81e1e', '#a81414', '#e03a2a', '#8e1010'], OB = ['#2a1416', '#3a1a1c'], CR = '#f2dcc0', FL = ['#ff4500', '#ff9a1a', '#fff1a0'];
    const g = dragon(m, k, { body: K.cellsOf(RD, 1.8, 3), belly: K.cellsOf([CR, '#e6cba8'], 1.5, 4), leg: stage === 1 ? 4 : 6, girth: stage === 1 ? 4 : 3.6, head: stage === 1 ? 3.6 : 2.7, snoutLen: stage === 1 ? 1.1 : 1.5, neck: stage === 1 ? 0.5 : 3, horn: OB[0], hornLen: stage === 1 ? 2.4 : 3.8, eye: '#ffb000', jaw: RD[3], teeth: '#ffffff', spikes: stage > 1 ? OB[1] : null, claw: '#f6eedd', tailN: stage === 1 ? 4 : 5, faceYaw: stage === 1 ? 32 : 22 });
    const S = g.S;
    K.sym((sd) => K.wing(m, [g.shoulder[0], g.shoulder[1], sd * g.shoulder[2]], sd, S(stage === 1 ? 7 : 12), { cols: [OB[0], OB[1]], membrane: '#5a1418', boneCol: OB[0], up: 1.7, back: 0.35, droop: 1.3, featherLen: 0.6, feathers: stage === 1 ? 4 : 6, bone: 1 }));
    K.flame(m, g.tailTip, [0, 1, 0], S(4) + stage, S(1.6), FL, 7);
    if (stage === 3) K.recolour(m, (x, y, z, v) => RD.includes(v.c) && V.hash(x, y, z, 6) < 0.05, () => K.glow('#ff7a1a', 0.6));
    return m;
  });

  /* ===== Zephyr → Aeolus → Stormbringer (Wind). Card palette #3DBBFF #7FE8FF #FFFFFF #FFD166 #2A3B8F. ===== */
  V.register('zephyr', function (stage) {
    const m = new V.Model(), k = [0.85, 1.15, 1.42][stage - 1] * V.detail();
    const BL = '#3d6bff', SK = '#3dbbff', ICE = '#7fe8ff', W = '#ffffff', GD = '#ffd166', IN = '#2a3b8f';
    const g = dragon(m, k, { body: (x, y, z) => (y < 8 * k ? [IN, BL][V.cells(x, y, z, 2, 2).id % 2] : [W, '#eef2ff', '#dfe7ff', BL][V.cells(x, y, z, 2, 2).id % 4]), belly: W, leg: 6, girth: 3.4, head: 2.5, snoutLen: 1.25, snoutCol: W, headCol: W, neckCol: K.cellsOf([W, '#eef2ff', SK], 1.6, 3), neck: 2.5, eye: '#29b6ff', claw: GD, leg1: K.cellsOf([IN, BL, W], 1.5, 5), crest: (i) => (i % 2 ? GD : BL), crestN: 3 + stage, tailCol: K.cellsOf([IN, BL], 1.6, 6), faceYaw: 24 });
    const S = g.S;
    const hc = g.heads[0].hc; K.sym((sd) => K.tuft(m, [hc[0] - S(0.5), hc[1] + S(1.6), hc[2] + sd * S(1.6)], [-1, 0.9, sd * 0.4], S(3.6), S(0.9), GD));
    // a beak tip and gold armour on chest and legs
    const sn = g.heads[0].snout; m.ellipsoid(sn[0], sn[1] - S(0.3), sn[2], S(1), S(0.9), S(0.9), GD);
    K.sym((sd) => { m.ellipsoid(S(3.5), S(10), sd * S(2.6), S(1.6), S(1.4), S(1), GD); m.set(Math.round(S(4)), Math.round(S(10)), Math.round(sd * S(3.8)), K.glow(ICE).c, 1); });
    K.sym((sd) => K.wing(m, [g.shoulder[0], g.shoulder[1], sd * g.shoulder[2]], sd, S(10 + stage * 2), { cols: [W, SK, BL, IN], up: 1.2, back: 0.55, droop: 0.9, featherLen: 0.75, feathers: 6 + stage, bone: 1.1, boneCol: GD, glowTips: stage === 3 ? ICE : null }));
    // feathered tail fan
    for (let i = -1; i <= 1; i++) K.tuft(m, g.tailTip, [-1, 0.3, i * 0.5], S(4), S(1.2), i ? SK : W);
    if (stage >= 2) K.bits(m, [0, S(12), 0], [S(14), S(4), S(12)], stage * 3, [ICE, W], 77, 0.6);
    return m;
  });

  /* ===== Aquaflora → Aquaflora II → Aquaflora III (Water). Card palette #083D8B #00D1C6 #FF6B9D #F5F7FF #7FFFB8. ===== */
  const CORAL = ['#ff6b9d', '#ff9a3c', '#b45cff', '#ff7ad9'];
  function coralFan(m, base, dir, n, len, seed) {
    for (let i = 0; i < n; i++) { const a = (i / Math.max(1, n - 1) - 0.5) * 1.6; const b = K.add(base, [0, 0, Math.sin(a) * 0.8], 1); const tip = K.add(b, K.norm([dir[0] - 0.3 + Math.cos(a) * 0.2, dir[1], dir[2] + Math.sin(a)]), len * (0.7 + V.hash(i, seed, 1, 2) * 0.5));
      m.capsule(b, tip, 0.9, 0.5, CORAL[(i + seed) % 4]); const mid = K.add(b, K.norm([tip[0] - b[0], tip[1] - b[1], tip[2] - b[2]]), len * 0.45); K.tuft(m, mid, [-0.3, 0.8, Math.sin(a) + 0.4], len * 0.4, 0.6, CORAL[(i + seed + 1) % 4]); }
  }
  V.register('aquaflora', function (stage) {
    const m = new V.Model();
    const SEG = ['#00b8a8', '#00d1c6', '#13a98f'], DP = '#083d8b', MINT = '#7fffb8', W = '#f5f7ff';
    const body = (x, y, z) => (V.hash(x, y, z, 5) < 0.06 ? K.glow(MINT, 1) : SEG[V.cells(x, y, z, 2, 4).id % 3]);
    if (stage === 1) {
      // coiled serpent rising in an S from a ground coil
      const pts = []; for (let i = 0; i <= 26; i++) { const t = i / 26; const a = t * Math.PI * 3.2; const r = 7 - t * 4; pts.push([Math.cos(a) * r * (t < 0.45 ? 1 : 0.6) + (t > 0.45 ? (t - 0.45) * 10 : 0), 2 + t * 17 + Math.max(0, t - 0.6) * 4, Math.sin(a) * r * (t < 0.45 ? 1 : 0.5)]); }
      V.rigStart(m, 'serpent');   // Phase 8B: the ground coil stays, the rising body sways, the head looks about
      V.joint(m, 'neck', pts[11], null);
      for (let i = 0; i < pts.length - 1; i++) V.inPart(m, i < 11 ? 'core' : 'neck', () => m.capsule(pts[i], pts[i + 1], 2.6 - i * 0.04, 2.6 - (i + 1) * 0.04, body));
      K.recolour(m, (x, y, z) => !m.has(x, y - 1, z) && y > 3, () => W);
      const hc = K.add(pts[pts.length - 1], [1.5, 0.5, 0], 1);
      V.joint(m, 'head', pts[pts.length - 2], 'neck');
      V.inPart(m, 'head', () => { m.ellipsoid(hc[0], hc[1], hc[2], 2.6, 2.2, 2.2, SEG[1]); m.capsule(hc, [hc[0] + 4.5, hc[1] - 0.8, hc[2] + 1], 1.8, 1.2, SEG[0]); });
      V.joint(m, 'jaw', [hc[0], hc[1] - 1.4, hc[2]], 'head');
      V.inPart(m, 'jaw', () => m.capsule([hc[0], hc[1] - 1.5, hc[2]], [hc[0] + 3.8, hc[1] - 2, hc[2] + 1], 1, 0.7, W), true);
      V.emit(m, 'mouth', [hc[0] + 4.8, hc[1] - 1.2, hc[2] + 1], 'head');
      V.inPart(m, 'head', () => { K.eyes(m, hc, { yaw: 22, ang: 45, el: 20, size: 1, iris: '#ff3a5a' }); coralFan(m, [hc[0] - 2, hc[1] + 1.5, 0], [-0.8, 1, 0], 6, 5, 1); });
      V.inPart(m, 'neck', () => { for (let i = 14; i < 24; i += 2) coralFan(m, K.add(pts[i], [-1.5, 1.8, 0], 1), [-1, 0.6, 0], 2, 3.5, i); });
      m.part = null;
      return m;
    }
    const k = (stage === 2 ? 1.1 : 1.4) * V.detail();
    const g = dragon(m, k, { body, belly: W, leg: stage === 2 ? 6 : 7, girth: 3.2, head: 2.4, snoutLen: 1.5, neck: stage === 2 ? 6 : 5, eye: '#ff3a5a', claw: W, leg1: K.cellsOf([DP, '#1a5fb0', SEG[0]], 1.5, 3), jaw: SEG[2], teeth: W, tailN: 5, faceYaw: 20 });
    const S = g.S;
    g.heads.forEach((h) => coralFan(m, [h.hc[0] - S(1.5), h.hc[1] + S(1.5), 0], [-0.8, 1, 0], 5 + stage, S(4.5), 2));
    for (let i = 0; i < 5; i++) coralFan(m, [S(3 - i * 2.4), S(g.lo + 5.5), 0], [-1, 0.8, 0], 2, S(3), 10 + i);
    if (stage === 3) {
      // water ribbons swirling around the body
      V.inPart(m, 'aura', () => { for (let r = 0; r < 2; r++) { let prev = null; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2 + r * 2, p = [Math.cos(a) * S(9), S(6 + r * 4) + Math.sin(a * 2) * S(1.5), Math.sin(a) * S(7)]; if (prev) m.capsule(prev, p, 0.7, 0.7, { c: r ? '#52c3ff' : '#9ff0ff', g: 0.5 }, 'under'); prev = p; } } });
      K.sym((sd) => coralFan(m, [S(-1), S(g.lo + 4.5), sd * S(3)], [-0.6, 0.8, sd * 1.2], 3, S(4), 20));
    }
    return m;
  });

  /* ===== Aimza (Resonance): I The Awakening (white), II The Second Head, III The Third Head (black, cyan glow). ===== */
  V.register('aimza', function (stage) {
    const m = new V.Model(), k = [0.9, 1.2, 1.45][stage - 1] * V.detail();
    const CY = '#1fe0ff', SOFT = '#7ff0ff';
    const WH = ['#e9eef4', '#cfd8e2', '#b6c2cf'], BK = ['#14181f', '#1e2430', '#2a3140'];
    const pal = stage === 1 ? WH : BK, glowP = stage === 1 ? 0.12 : 0.18;
    const skin = (x, y, z) => { const c = V.cells(x, y, z, 2.2, 8); return c.edge < 0.3 && V.hash(x, y, z, 3) < glowP * 2 ? K.glow(CY, V.hash(x, y, z, 4) < 0.25 ? 1 : 0.4) : pal[c.id % 3]; };
    const g = dragon(m, k, { body: skin, leg: 6, girth: 3.8, head: stage === 1 ? 2.9 : 2.5, snoutLen: 1.35, neck: stage === 1 ? 1.5 : 3.5, heads: stage, eye: CY, horn: stage === 1 ? WH[2] : BK[2], hornLen: 2.6, claw: stage === 1 ? WH[0] : '#3a4456', spikes: stage > 1 ? BK[2] : null, jaw: stage > 1 ? BK[0] : null, teeth: stage > 1 ? SOFT : null, faceYaw: 26 });
    const S = g.S;
    K.sym((sd) => K.wing(m, [g.shoulder[0], g.shoulder[1], sd * g.shoulder[2]], sd, S(stage === 1 ? 7 : 12), { cols: stage === 1 ? [WH[0], WH[1]] : [BK[1], BK[0]], membrane: stage === 1 ? '#dfe7ef' : '#0f1218', boneCol: pal[2], up: 1.7, back: 0.35, droop: 1.3, featherLen: 0.6, feathers: stage === 1 ? 4 : 6, bone: 1, glowTips: stage > 1 ? CY : null }));
    if (stage > 1) K.bits(m, [0, S(12), 0], [S(13), S(6), S(12)], stage * 3, [CY, SOFT], 21, 0.4);
    return m;
  });

  /* ===== Pyro-Spark → Pyro-Hawk → Pyro-Phoenix (Fire). Card palette #FF0000 #FF8000 #FFFF00 #8B4513.
     Only the final form has supplied art; the first two forms are new provisional designs. ===== */
  V.register('pyrospark', function (stage) {
    const m = new V.Model(), k = [0.85, 1.1, 1.4][stage - 1] * V.detail(), S = (v) => v * k;
    const RD = ['#c41010', '#e02a10', '#9a0c0c'], OR = '#ff8000', YL = '#ffe600', BR = '#8b4513';
    const body = K.cellsOf(RD, 1.8, 3), lo = stage === 1 ? 2 : 3;
    V.rigStart(m, 'bird');   // Phase 8B: body, head (beak, crest), legs, wings, tail plumes
    // body, chest and head
    m.ellipsoid(0, S(lo + 4), 0, S(stage === 1 ? 4.6 : 4), S(stage === 1 ? 4.4 : 4.6), S(stage === 1 ? 4.2 : 3.4), body);
    m.ellipsoid(S(1.6), S(lo + 3.5), 0, S(2.4), S(3.2), S(2.6), K.cellsOf([OR, YL], 1.4, 4), 'paint');
    m.part = null;
    const hc = [S(stage === 1 ? 2.5 : 3), S(lo + (stage === 1 ? 8.5 : 9.5)), 0];
    V.joint(m, 'head', [hc[0] - S(0.8), hc[1] - S(2.4), 0], null);
    V.inPart(m, 'head', () => {
      m.ellipsoid(hc[0], hc[1], hc[2], S(2.8), S(2.6), S(2.6), body);
      m.capsule([hc[0] + S(2), hc[1] - S(0.3), 0], [hc[0] + S(4), hc[1] - S(1.4), S(0.8)], S(1), S(0.5), '#d8a020');
      K.eyes(m, hc, { yaw: 25, ang: 42, el: 12, size: 1, iris: '#ff2020', white: '#ffffff' });
      // crest flames on the head
      K.mane(m, [hc[0] - S(1), hc[1] + S(2), 0], [-0.6, 1, 0], S(3) + stage, S(1), [RD[0], OR, YL], 3, 3, 1);
    });
    V.emit(m, 'mouth', [hc[0] + S(4.2), hc[1] - S(1.4), S(0.8)], 'head');
    // legs
    K.sym((sd) => { const n = sd > 0 ? 'legL' : 'legR'; V.joint(m, n, [0, S(lo + 1), sd * S(1.6)], null); V.inPart(m, n, () => { m.capsule([0, S(lo + 1), sd * S(1.6)], [S(0.5), 0, sd * S(1.8)], S(0.8), S(0.7), BR); K.toes(m, Math.round(S(1)), 0, Math.round(sd * S(1.8)), 3, '#d8a020', 2); }); });
    // wings raised (stage 1: small stubs)
    K.sym((sd) => K.wing(m, [S(-0.5), S(lo + 6), sd * S(2.6)], sd, S(stage === 1 ? 5 : stage === 2 ? 10 : 14), { cols: [YL, OR, RD[0], RD[2]], up: 1.6, back: 0.3, droop: 0.7, sweep: 0.6, featherLen: 0.75, feathers: stage === 1 ? 4 : 6 + stage, bone: 1, boneCol: RD[0], glowTips: stage === 3 ? YL : null }));
    // tail plumes
    V.joint(m, 'tail', [S(-2.8), S(lo + 2.6), 0], null);
    V.inPart(m, 'tail', () => { for (let i = -1; i <= 1; i++) K.flame(m, [S(-3.5), S(lo + 2.5), i * S(1)], [-1, -0.2 + (stage - 1) * 0.15, i * 0.5], S(4 + stage * 1.5), S(1.1), [RD[0], OR, YL], 40 + i); });
    if (stage === 3) K.recolour(m, (x, y, z, v) => v.c === RD[1] && V.hash(x, y, z, 2) < 0.2, () => K.glow(OR, 0.5));
    m.part = null;
    return m;
  });
})(typeof window !== 'undefined' ? window : globalThis);
