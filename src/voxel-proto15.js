/* Aminas — Phase 15 prototypes: refined voxel models for three lines, for review only.
   Lumifern (small, starter), Igniflare → Pyronix → Ignivor (large, flying) and Atem (mechanical). They are registered
   under their own ids ('lumifern15', 'igniflare15', 'atem15') and are NOT used by the game unless the developer
   switch is on (A.Proto15, Settings → developer panel, or ?p15=1). Production models, 2D portraits, cards and island
   critters are unchanged: the switch only swaps the 3D model, its clips and its move effects.
   Same coordinates as every builder: x forward (the creature faces +x), y up, z to its left. Same rig contract as
   Phase 8B (parts tagged while sculpting, V.autoRig finishes them), with more joints: neck and three tail segments for
   the dragon, folding wing tips, elbows and knees for Atem, leaf-ear tips for Lumifern. */
(function (root) {
  'use strict';
  const A = root.A, V = A && A.Voxel, K = V && V.kit; if (!V || !K) return;
  const R = Math.round, add = K.add, norm = K.norm, hash = V.hash;
  const inP = V.inPart, glow = K.glow;
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);

  /* ---------------------------------------------------------------- shared sculpting helpers */
  // a flat leaf: blade along dir, width across `across`, two blocks thick, with a midrib, side veins and a pale rim
  function leaf(m, base, dir, across, L, W, o) {
    o = o || {}; const d = norm(dir), a = norm(across), nrm = norm(cross(d, a)), steps = Math.ceil(L * 2.2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, w = W * Math.pow(Math.sin(Math.PI * Math.min(1, t * (o.fat || 1.05))), 0.75) * (1 - t * 0.15);
      for (let s = -w; s <= w + 0.01; s += 0.45) {
        const c = add(add(base, d, t * L + (o.curl || 0) * t * t * 0), a, s), edge = Math.abs(s) > w - 0.9, rib = Math.abs(s) < 0.5;
        const vein = o.vein && !rib && !edge && Math.abs(Math.abs(s) - ((t * L * 0.6) % 4)) < 0.3 && t > 0.15 && t < 0.85;
        const col = rib ? o.rib : vein ? o.vein : edge ? o.rim : (hash(R(c[0]), R(c[1]), R(c[2]), o.seed || 3) < 0.12 ? o.alt || o.col : o.col);
        const lift = (o.cup || 0) * (s * s) / (W * W + 0.01);   // cupped leaves curve up at the edges
        for (let th = 0; th < (o.thick || 2); th++) { const q = add(c, nrm, th * 0.6 + lift); m.set(q[0], q[1], q[2], col, o.glowRib && rib ? 0.7 : 0); }
      }
    }
    return add(base, d, L);
  }
  // a membrane filling the triangle a-b-c, one block thick, coloured by a function of (bary b, bary c)
  function tri(m, a, b, c, col) {
    const n = Math.ceil(Math.max(len(sub(b, a)), len(sub(c, a)), len(sub(c, b))) * 1.8);
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
      const u = i / n, v = j / n, p = [a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v, a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * v, a[2] + (b[2] - a[2]) * u + (c[2] - a[2]) * v];
      const k = typeof col === 'function' ? col(u, v, p) : col; if (k == null) continue;
      if (typeof k === 'string') m.set(p[0], p[1], p[2], k, 0); else m.set(p[0], p[1], p[2], k.c, k.g);
    }
  }
  // a curved horn: a chain of tapering capsules bending from dir0 to dir1
  function horn(m, base, d0, d1, L, r0, col, n) {
    n = n || 5; let p = base;
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, d = norm(lerp3(d0, d1, t)), q = add(p, d, L / n), ra = r0 * (1 - i / n) + 0.45, rb = r0 * (1 - (i + 1) / n) + 0.45;
      m.capsule(p, q, ra, rb, typeof col === 'function' ? (x, y, z) => col(x, y, z, (i + 0.5) / n) : col); p = q; }
    return p;
  }

  /* ================================================================= LUMIFERN → SOLARBLOOM → AURELITH (Light)
     Kept: the round sprout-eared body in lime green, the cream belly, the leaf ears, the glowing star mark, the leaf
     tail, the big friendly eyes; Solarbloom's crown of petals; Aurelith's sun-wheel and flying leaves.
     Refined: a finer block grid (about 1.7× in each direction), leaves with a midrib, veins and a pale rim, ears in two
     segments (base and tip), shaded underside, gold "stored sunlight" specks on the back, eye highlights, cheeks, a
     mouth, paws with toes, and a seed sprout that grows into the crown. */
  V.register('lumifern15', function (stage) {
    const m = new V.Model(), k = [1.75, 2.05, 2.35][stage - 1], S = (v) => v * k;
    const GR = ['#bff58a', '#a6e870', '#d2fb9e'], GRD = ['#93d85f', '#86cc55'], CR = '#fff7c8', CR2 = '#f3e8b0', YL = '#ffd86b';
    const LF = { col: '#8fdb62', alt: '#8fdb62', rib: '#4f9a34', vein: '#76c552', rim: '#c8f59a' };
    const lo = stage === 1 ? 0 : 2.6, bc = [0, S(5 + lo), 0];
    const fur = (x, y, z) => { if (y < bc[1] - S(2.8)) return GRD[0]; const c = V.cells(x, y, z, 2.6, 3); return c.edge < 0.12 ? GR[1] : c.id % 3 === 0 ? GR[2] : GR[0]; };   // soft fur tufts
    V.rigStart(m, 'blob');
    // body, belly, and gold specks of stored sunlight across the back
    m.ellipsoid(bc[0], bc[1], bc[2], S(5), S(4.6), S(4.4), fur);
    m.ellipsoid(S(1.9), S(4 + lo), 0, S(3.4), S(3), S(3.4), (x, y, z) => ((y + z) % 3 === 0 && hash(x, y, z, 2) < 0.4 ? CR2 : CR), 'paint');
    m.ellipsoid(S(-1.2), bc[1] + S(1.6), 0, S(3.4), S(2.6), S(3.6), (x, y, z) => (hash(x, y, z, 11) < 0.05 ? glow('#ffe9a0', 0.55) : null), 'paint');
    m.part = null;
    // feet: stage I has little paws in front (they wiggle) and round hind feet; later forms stand on legs with toes
    if (stage === 1) {
      K.sym((sd) => { const n = sd > 0 ? 'pawL' : 'pawR', at = [S(2.6), S(1.6), sd * S(2.2)]; V.joint(m, n, at, null);
        inP(m, n, () => { m.ellipsoid(S(3.1), S(1.0), sd * S(2.3), S(1.5), S(1.0), S(1.2), CR); for (let i = -1; i <= 1; i++) m.set(R(S(4.4)), R(S(0.6)), R(sd * S(2.3) + i), CR2); });
        m.ellipsoid(S(-1.5), S(0.9), sd * S(2.9), S(1.8), S(0.9), S(1.4), CR); });
    } else {
      K.sym((sd) => { const n = sd > 0 ? 'legL' : 'legR'; V.joint(m, n, [S(-0.3), S(3.6 + lo), sd * S(2.4)], null);
        inP(m, n, () => { m.capsule([S(-0.5), S(4 + lo), sd * S(2.4)], [0, S(1), sd * S(2.6)], S(1.35), S(1.1), GR[1]);
          m.ellipsoid(S(0.6), S(0.75), sd * S(2.6), S(1.7), S(0.8), S(1.3), CR); for (let i = -1; i <= 1; i++) m.box(R(S(2)), 0, R(sd * S(2.6) + i * 1.3), R(S(2)) + 1, 0, R(sd * S(2.6) + i * 1.3), CR2); }); });
    }
    // head (from stage II), eyes with highlights, cheeks, a small smile
    const hc = [S(2.6), S(8.6 + lo), 0], hp = stage > 1 ? 'head' : 'core', face = stage > 1 ? hc : [bc[0] + S(1), bc[1] + S(1.1), 0];
    if (stage > 1) { V.joint(m, 'head', [S(1.6), S(6.2 + lo), 0], null); inP(m, 'head', () => m.ellipsoid(hc[0], hc[1], hc[2], S(3.6), S(3.3), S(3.6), fur)); }
    inP(m, hp, () => {
      K.eyes(m, face, { yaw: 30, ang: stage > 1 ? 33 : 34, el: stage > 1 ? 4 : 12, size: 3, tall: 4, iris: '#3f8f2e', pupil: '#0f2408', white: '#ffffff', glow: false });
      K.sym((sd) => { const p = K.surface(m, face, sd * 58, stage > 1 ? -12 : 2, 30); if (p) { m.set(p[0], p[1], p[2], '#ffb8a8'); m.set(p[0], p[1] - 1, p[2], '#ffb8a8'); } });
      const mo = K.surface(m, face, 0, stage > 1 ? -22 : -8, 30); if (mo) { m.set(mo[0], mo[1], mo[2] + 1, '#3d6a2c'); m.set(mo[0], mo[1], mo[2] - 1, '#3d6a2c'); m.set(mo[0], mo[1] + 1, mo[2], '#3d6a2c'); }
    });
    const top = stage > 1 ? [hc[0] - S(0.5), hc[1] + S(2.6), 0] : [bc[0], bc[1] + S(3.8), 0];
    V.emit(m, 'mouth', stage > 1 ? [hc[0] + S(3.4), hc[1] - S(1.2), S(1)] : [S(4.8), bc[1] - S(0.5), S(1)], hp === 'core' ? null : hp);
    // leaf ears: one broad leaf each, its far half is a part of its own (the tip can flop)
    K.sym((sd) => {
      const b = add(top, [0, 0, sd * S(2.1)], 1), d = norm([-0.42, 1, sd * 0.78]), ac = norm(cross(d, [1, 0, 0.0001])), L = S(stage === 3 ? 6.6 : 6), Wd = S(stage === 1 ? 2.05 : 1.8);
      const mid = add(b, d, L * 0.5), n = sd > 0 ? 'earL' : 'earR', nt = sd > 0 ? 'earTipL' : 'earTipR';
      V.joint(m, n, b, hp === 'core' ? null : hp); V.joint(m, nt, mid, n);
      inP(m, n, () => leaf(m, b, d, ac, L, Wd, Object.assign({ seed: 4, fat: 1.0 }, LF)));
      inP(m, nt, () => { const ph = []; m.v.forEach((v, kk) => { if (v.p !== n) return; const q = kk.split(',').map(Number), t = (q[0] - b[0]) * d[0] + (q[1] - b[1]) * d[1] + (q[2] - b[2]) * d[2]; if (t > L * 0.5) ph.push(q); });
        ph.forEach((q) => { const v = m.get(q[0], q[1], q[2]); m.set(q[0], q[1], q[2], v.c, v.g); }); }, true);
    });
    // star mark (a glowing diamond on the brow)
    const st = K.surface(m, [top[0] + S(0.5), top[1] - S(1.2), 0], 30, 12, 30) || K.surface(m, [top[0], top[1] - S(1), 0], 0, 25, 30);
    if (st) inP(m, hp, () => { const r = stage === 3 ? 2 : 1; for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (Math.abs(a) + Math.abs(b) <= r) m.set(st[0] + (Math.abs(a) + Math.abs(b) === 0 ? 1 : 0), st[1] + a, st[2] + b, Math.abs(a) + Math.abs(b) === 0 ? '#fff6c0' : YL, 1); });
    // the sprout (I), crown of petals (II), sun-wheel (III)
    if (stage === 1) {
      V.joint(m, 'sprout', top, null);
      inP(m, 'sprout', () => { const tipP = [top[0] - S(0.2), top[1] + S(2.4), 0]; m.capsule(top, tipP, 0.8, 0.6, '#6fbd4c');
        K.sym((sd) => leaf(m, add(tipP, [0, -S(0.4), 0], 1), [-0.15, 0.55, sd], [1, 0, 0], S(2), S(0.9), Object.assign({ seed: 6, thick: 1 }, LF)));
        m.ellipsoid(tipP[0], tipP[1] + 1, tipP[2], 1.2, 1.3, 1.2, glow('#ffe27a', 0.85)); });
    } else {
      V.joint(m, 'crown', top, 'head');
      inP(m, 'crown', () => {
        const nP = stage === 2 ? 7 : 10;
        for (let i = 0; i < nP; i++) { const a = (i / nP) * Math.PI * 2, dir = [Math.cos(a) * 0.55 - 0.15, 0.9, Math.sin(a) * 0.75];
          leaf(m, add(top, [0, -S(0.6), 0], 1), dir, [-Math.sin(a), 0, Math.cos(a)], S(stage === 2 ? 3.1 : 2.6), S(1.15), { col: i % 2 ? '#ffe98a' : '#ffd95a', rib: '#fff6c8', rim: '#ffc23a', thick: 2, seed: 7 + i, glowRib: true }); }
        m.ellipsoid(top[0], top[1] + S(0.3), top[2], S(1.1), S(0.8), S(1.1), glow('#ffd86b', 0.8));
      });
    }
    if (stage === 3) {
      // the sun-wheel: a ring of long petals standing behind the head, joined to the crown
      const sw = [hc[0] - S(3.4), hc[1] + S(1.6), 0];
      V.joint(m, 'wheel', sw, 'head');
      inP(m, 'wheel', () => { const nP = 12; for (let i = 0; i < nP; i++) { const a = (i / nP) * Math.PI * 2, dir = [-0.12, Math.sin(a), Math.cos(a)];
        leaf(m, add(sw, dir, S(2.6)), dir, [0, -Math.cos(a), Math.sin(a)], S(3.8), S(1.25), { col: i % 2 ? '#ffd23f' : '#ffdc5a', rib: '#fff3b0', rim: '#ffa82e', thick: 2, seed: 21 + i, glowRib: true }); }
        for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; m.set(sw[0], sw[1] + Math.sin(a) * S(2.3), sw[2] + Math.cos(a) * S(2.3), i % 3 ? '#ffe27a' : '#fff6c0', 1); } });
      // flying leaves: three leaves fanned from each shoulder
      K.sym((sd) => { const sh = [S(-1.4), S(7.4 + lo), sd * S(3.4)], n = sd > 0 ? 'wingL' : 'wingR'; V.joint(m, n, sh, null);
        inP(m, n, () => [0, 1, 2].forEach((i) => leaf(m, add(sh, [S(-0.5) * i, -S(0.6) * i, 0], 1), [-0.75 - i * 0.25, 0.55 - i * 0.4, sd * 0.85], [0.25, 0.3, -sd * 0.6], S(8 - i * 1.6), S(1.9 - i * 0.2), Object.assign({ seed: 30 + i }, LF, { rim: '#e4ffbf', rib: '#ffd86b', glowRib: i === 0 })))); });   // the leaves that learned to fly
    }
    // leaf tail (two leaves)
    V.joint(m, 'tail', [S(-3.6), S(4 + lo), 0], null);
    inP(m, 'tail', () => { leaf(m, [S(-4), S(4 + lo), 0], [-1, 0.95, 0.12], [0, 0, 1], S(4.4), S(1.3), Object.assign({ seed: 8 }, LF)); leaf(m, [S(-4), S(3.6 + lo), 0], [-1, 0.45, -0.35], [0, 0.4, 1], S(3.2), S(1.0), Object.assign({ seed: 9 }, LF)); });
    return m;
  });

  /* ================================================================= IGNIFLARE → PYRONIX → IGNIVOR (Fire, flying)
     From the Ignivor card: red scales with obsidian plates along the back and glowing seams between them, a cream belly
     in segmented bands, swept-back black horns, a heavy brow over amber eyes, teeth, cream claws, bat wings with red
     bones and a black membrane, black spikes down the spine, and a flame at the tail tip. Igniflare is the chibi
     hatchling (big head, stubby horns, small wings); Pyronix lean; Ignivor bulky and upright, with more lava seams.
     Rig: neck → head → jaw, four legs, wing → wing tip on each side (so the wings fold and flap), tail → tail2 → tail3. */
  V.register('igniflare15', function (stage) {
    const m = new V.Model(), k = [1.3, 1.6, 1.9][stage - 1], S = (v) => v * k;
    const RD = ['#c81e1e', '#b01818', '#d62a22', '#9a1212'], OB = ['#241214', '#34181a', '#1a0c0e'], CR = '#f2dcc0', CR2 = '#e2c49c', CR3 = '#c9a37c';
    const LAVA = '#ff7a1a', FL = ['#ff4500', '#ff9a1a', '#fff1a0'], CLAW = '#f6eedd';
    const lo = stage === 1 ? 4 : 6, up = stage === 3 ? 1.6 : stage === 2 ? 0.8 : 0;   // later forms carry the chest higher
    const hipC = [S(-5), S(lo + 2.4), 0], chestC = [S(3), S(lo + 3.8 + up), 0], girth = stage === 1 ? 4 : 3.7;
    const seam = stage === 1 ? 0 : stage === 2 ? 0.25 : 0.6;
    // scales: obsidian plates on the back with glowing seams (II/III), red cells on the flanks, darker underneath
    const hide = (x, y, z) => {
      const t = Math.max(0, Math.min(1, (x - hipC[0]) / (chestC[0] - hipC[0]))), ay = hipC[1] + (chestC[1] - hipC[1]) * t, c = V.cells(x, y, z, 2.3, 5);
      if (y > ay + S(girth) * 0.5) { if (c.edge < 0.16) return seam && hash(x, y, z, 8) < seam ? glow(LAVA, 0.75) : OB[2]; return c.id % 4 === 0 ? RD[3] : OB[c.id % 2]; }
      if (y < ay - S(girth) * 0.4) return RD[3];
      return c.edge < 0.1 ? RD[3] : RD[c.id % 2];
    };
    const belly = (x, y, z) => { const b = ((x % 3) + 3) % 3; return b === 0 ? CR3 : b === 1 ? CR2 : CR; };
    V.rigStart(m, 'dragon');
    // torso and belly bands
    inP(m, 'core', () => { m.capsule(hipC, chestC, S(girth), S(girth + 0.4), hide); m.ellipsoid(S(-0.6), S(lo + 1.4 + up * 0.4), 0, S(6.4), S(2.5), S(3.1), belly, 'paint');
      m.ellipsoid(chestC[0] + S(2.4), chestC[1] - S(1.0), 0, S(2.4), S(3.2), S(2.5), belly, 'paint'); }, true);   // the cream chest plate
    // legs: heavy haunches behind, thinner fore legs, cream claws
    K.sym((sd) => {
      const s = sd > 0 ? 'L' : 'R';
      V.joint(m, 'legB' + s, [S(-4.6), S(lo + 1.8), sd * S(2.9)], null); V.joint(m, 'legF' + s, [S(3), S(lo + 2 + up), sd * S(2.6)], null);
      inP(m, 'legB' + s, () => { m.ellipsoid(S(-4.6), S(lo + 1.6), sd * S(2.9), S(3.1), S(3.3), S(1.9), hide);
        m.capsule([S(-4), S(lo), sd * S(3.3)], [S(-3.6), S(lo * 0.45), sd * S(3.5)], S(1.9), S(1.3), RD[1]); m.capsule([S(-3.6), S(lo * 0.45), sd * S(3.5)], [S(-2.4), S(1.1), sd * S(3.5)], S(1.3), S(1.2), RD[1]);
        m.ellipsoid(S(-2.0), S(0.9), sd * S(3.5), S(1.7), S(0.9), S(1.5), RD[3]); for (let i = -1; i <= 1; i++) { const z0 = R(sd * S(3.5) + i * S(0.9)); m.box(R(S(-0.6)), 0, z0, R(S(-0.6)) + R(S(0.9)), 1, z0, CLAW); } });
      inP(m, 'legF' + s, () => { m.capsule([S(3), S(lo + 2 + up), sd * S(2.6)], [S(3.8), S(lo * 0.5), sd * S(3)], S(1.75), S(1.35), RD[1]); m.capsule([S(3.8), S(lo * 0.5), sd * S(3)], [S(4.4), S(1.1), sd * S(3.1)], S(1.2), S(1.1), RD[1]);
        m.ellipsoid(S(4.6), S(0.85), sd * S(3.1), S(1.5), S(0.85), S(1.3), RD[3]); for (let i = -1; i <= 1; i++) { const z0 = R(sd * S(3.1) + i * S(0.8)); m.box(R(S(5.8)), 0, z0, R(S(5.8)) + R(S(0.8)), 1, z0, CLAW); } });
    });
    // neck, head, jaw
    const nk = stage === 1 ? 0.6 : 3, n0 = [S(3.6), S(lo + 4.6 + up), 0], n1 = [S(5.6), S(lo + 6.4 + up + nk * 0.5), 0], n2 = [S(6.8), S(lo + 7.2 + up + nk), 0];
    const hr = S(stage === 1 ? 3.6 : stage === 2 ? 3.05 : 3.2), hc = [n2[0] + S(1), n2[1] + S(1), 0], fy = 0.2, fd = [Math.cos(fy), -0.1, 0], snout = add(hc, fd, hr * (stage === 1 ? 1.15 : 1.55));
    V.joint(m, 'neck', n0, null); V.joint(m, 'head', n2, 'neck');
    inP(m, 'neck', () => { m.capsule(n0, n1, S(2.5), S(2.1), hide); m.capsule(n1, n2, S(2.1), S(1.85), hide);
      m.capsule([n0[0] + S(1.6), n0[1] - S(0.4), 0], [n2[0] + S(1.2), n2[1] - S(0.6), 0], S(1.7), S(1.3), belly, 'paint');
      for (let i = 0; i < 3; i++) { const p = lerp3(n0, n2, (i + 0.5) / 3); K.tuft(m, [p[0] - S(0.6), p[1] + S(1.8), 0], [-0.8, 1, 0], S(1.4), S(0.7), OB[0]); } }, true);
    inP(m, 'head', () => {
      m.ellipsoid(hc[0], hc[1], hc[2], hr, hr * 0.88, hr * 0.92, hide);
      m.capsule(hc, snout, hr * 0.74, hr * 0.48, (x, y, z) => (V.cells(x, y, z, 1.4, 9).id % 4 ? RD[0] : RD[2]));
      // a heavy brow ridge over the eyes and dark nostrils (glowing on Ignivor)
      K.sym((sd) => { m.capsule([hc[0] + hr * 0.15, hc[1] + hr * 0.55, sd * hr * 0.5], [hc[0] + hr * 0.95, hc[1] + hr * 0.4, sd * hr * 0.42], S(0.75), S(0.5), OB[0]);
        const ns = add(snout, [0, hr * 0.25, sd * hr * 0.22], 1); m.set(ns[0], ns[1], ns[2], stage === 3 ? '#ff9a1a' : '#2a0c0c', stage === 3 ? 0.9 : 0); });
      // horns: two big swept-back horns, two smaller below; stubs on the hatchling
      const hl = stage === 1 ? 2.6 : stage === 2 ? 5 : 6.4;
      K.sym((sd) => { horn(m, [hc[0] - hr * 0.25, hc[1] + hr * 0.65, sd * hr * 0.55], [-0.35, 1, sd * 0.3], [-1, 0.25, sd * 0.25], S(hl), S(stage === 1 ? 1 : 1.15), (x, y, z, t) => (t > 0.75 ? OB[2] : OB[0]));
        if (stage > 1) horn(m, [hc[0] - hr * 0.55, hc[1] + hr * 0.2, sd * hr * 0.8], [-0.6, 0.6, sd * 0.6], [-1, -0.1, sd * 0.3], S(hl * 0.55), S(0.7), OB[1], 4);
        if (stage > 1) K.tuft(m, [hc[0] - hr * 0.15, hc[1] - hr * 0.35, sd * hr * 0.82], [-0.9, -0.2, sd * 0.45], S(1.8), S(0.6), OB[0]);   // cheek spikes
      });
      K.eyes(m, hc, { yaw: fy * 180 / Math.PI, ang: 40, el: 16, size: 2, tall: stage === 1 ? 2 : 1, iris: '#ffb000', pupil: '#1a0a00', white: stage === 1 ? '#fff2c0' : null });
    }, true);
    // the jaw opens on a hinge under the head; teeth on both jaws
    V.joint(m, 'jaw', [hc[0], hc[1] - hr * 0.45, 0], 'head');
    inP(m, 'jaw', () => { m.capsule([hc[0], hc[1] - hr * 0.55, 0], [snout[0] - S(0.4), snout[1] - hr * 0.56, 0], hr * 0.45, hr * 0.32, (x, y, z) => (y > hc[1] - hr * 0.62 ? '#7a1010' : RD[3]));
      if (stage > 1) for (let i = 0; i < 3; i++) K.sym((sd) => { const p = lerp3([hc[0] + hr * 0.5, 0, 0], [snout[0] - S(0.5), 0, 0], i / 2); m.set(p[0], R(snout[1] - hr * 0.36), R(sd * hr * (0.32 - i * 0.04)), '#ffffff'); m.set(p[0], R(snout[1] - hr * 0.28), R(sd * hr * (0.32 - i * 0.04)), '#ffffff'); }); }, true);
    V.emit(m, 'mouth', snout, 'head');
    // spine spikes along the back
    inP(m, 'core', () => { for (let i = 0; i < 5; i++) { const p = lerp3(chestC, hipC, i / 4.5); K.tuft(m, [p[0], p[1] + S(girth) * 0.85, 0], [-0.55, 1, 0], S(stage === 1 ? 1.4 : 2.1 - i * 0.15), S(0.8), i % 2 ? OB[0] : OB[1]); } });
    // wings: arm bone (wing) and the fingers with their membrane (wing tip), red bones, black membrane with a red rim
    const span = S(stage === 1 ? 7.5 : stage === 2 ? 12.5 : 15);
    K.sym((sd) => {
      const s = sd > 0 ? 'L' : 'R', sh = [S(1.4), S(lo + 5 + up), sd * S(2.4)], el = add(sh, norm([-0.45, 1.05, sd * 0.85]), span * 0.42);
      V.joint(m, 'wing' + s, sh, null); V.joint(m, 'wingTip' + s, el, 'wing' + s);
      const fingers = [[-0.25, 0.75, sd * 0.85], [-0.75, 0.35, sd * 0.75], [-1, -0.15, sd * 0.55], [-0.9, -0.6, sd * 0.35]].map((d, i) => add(el, norm(d), span * [0.62, 0.66, 0.58, 0.45][i]));
      const mem = (u, v) => (u + v > 0.9 ? '#8a1c1c' : u + v > 0.8 ? '#5a1416' : '#2a1416');   // black membrane, red trailing edge
      inP(m, 'wing' + s, () => { m.capsule(sh, el, S(1.25), S(1.0), RD[2]); tri(m, sh, el, add(hipC, [S(1), S(girth * 0.6), sd * S(1.6)], 1), mem); });
      inP(m, 'wingTip' + s, () => {
        m.ellipsoid(el[0], el[1], el[2], S(0.9), S(0.9), S(0.9), RD[1]); K.tuft(m, el, [0.3, 0.9, sd * 0.2], S(1.6), S(0.55), CLAW);   // the wing claw
        fingers.forEach((f, i) => { m.capsule(el, f, S(0.8) - i * 0.06, 0.55, RD[2]); if (i < fingers.length - 1) tri(m, el, f, fingers[i + 1], mem); });
        tri(m, el, fingers[fingers.length - 1], add(hipC, [S(1), S(girth * 0.6), sd * S(1.6)], 1), mem);
      });
    });
    // tail in three segments with spikes; flame at the tip
    const tp = [[S(-7.6), S(lo + 2.3), 0], [S(-10.8), S(lo + 1.2), S(1.2)], [S(-14), S(lo + 0.8), S(2)], [S(-17), S(lo + 1.8), S(1.8)], [S(-19.4), S(lo + 3.6), S(0.6)], [S(-20.6), S(lo + 6), 0]].slice(0, stage === 1 ? 4 : 6);
    const tn = ['tail', 'tail', 'tail2', 'tail2', 'tail3', 'tail3'];
    V.joint(m, 'tail', [S(-6.4), S(lo + 2.4), 0], null); V.joint(m, 'tail2', tp[2], 'tail'); if (tp.length > 4) V.joint(m, 'tail3', tp[4], 'tail2');
    for (let i = 0; i < tp.length - 1; i++) inP(m, tn[i], () => {
      const r0 = S(2.3) * (1 - i * 0.16), r1 = S(2.3) * (1 - (i + 1) * 0.16); m.capsule(tp[i], tp[i + 1], r0, Math.max(0.7, r1), hide);
      if (i < tp.length - 2) K.tuft(m, [tp[i][0], tp[i][1] + r0 * 0.8, tp[i][2]], [-0.7, 1, 0], S(1.3), S(0.6), OB[0]); });
    const tipPart = tp.length > 4 ? 'tail3' : 'tail2';
    inP(m, tipPart, () => K.flame(m, tp[tp.length - 1], [0.1, 1, 0], S(stage === 1 ? 5 : 4) + stage, S(stage === 1 ? 1.9 : 1.6), FL, 7));
    return m;
  });

  /* ================================================================= ATEM-01 → ATEM-02 → ATEM (Metal, war)
     From the Atem card: a tall armoured frame of white and silver plates with blue light in the seams and joints, a
     visor face with blue eyes, a ring of blocks standing behind the head, heavy pauldrons, and forearms that become long
     crystalline blades. Atem-01 has fists that "want to be something sharper"; Atem-02 has one blade; Atem has two and
     the full ring. Plates are laid out in a regular grid (panels with seams), not noise, so the build reads as made.
     Rig: torso on the hips (it can twist), head, shoulder → forearm on each side (elbows bend), thigh → shin (knees). */
  V.register('atem15', function (stage) {
    const m = new V.Model(), k = [1.35, 1.6, 1.85][stage - 1], S = (v) => v * k;
    const AR = ['#f2f6fc', '#d9e1ee', '#bcc8dc', '#97a6bf'], DK = '#56637c', BL = '#2f7bff', CY = '#7fd0ff', WH = '#e8f6ff', VIS = '#141d33';
    const L = stage === 1 ? 8.5 : 10, T = stage === 1 ? 7 : 8, W = stage === 1 ? 2.7 : 3;
    // armour: broad plates in a regular layout. A seam (dark, or lit blue near joints) runs between plates; each plate
    // is one tone with a pale upper edge, so the model reads as built from parts rather than painted with noise.
    const plate = (hgt, wid, seed, lit) => (x, y, z) => {
      const py = ((y + seed) % hgt + hgt) % hgt, pz = ((Math.floor((z + 64) / wid) + Math.floor((y + seed + 64) / hgt)) % 2);
      if (py === 0) return lit && hash(x, y, z, seed) < lit ? glow(BL, 0.6) : DK;
      return py === hgt - 1 ? AR[0] : pz ? AR[1] : AR[2];
    };
    V.rigStart(m, 'biped');
    // legs: armoured thigh and shin; the knee glows; a knee guard; heavy feet with a toe plate
    K.sym((sd) => {
      const s = sd > 0 ? 'L' : 'R', hip = [0, S(L), sd * S(W * 0.62)], knee = [S(0.5), S(L * 0.5), sd * S(W * 0.68)], ank = [0, S(1.3), sd * S(W * 0.72)];
      V.joint(m, 'leg' + s, hip, null); V.joint(m, 'shin' + s, knee, 'leg' + s);
      inP(m, 'leg' + s, () => m.capsule(hip, knee, S(1.8), S(1.45), plate(5, 4, 1, 0)));
      inP(m, 'shin' + s, () => { m.capsule(knee, ank, S(1.4), S(1.2), plate(5, 4, 3, 0));
        m.ellipsoid(knee[0] + S(1.2), knee[1] + S(0.3), knee[2], S(0.9), S(1.4), S(1.3), (x, y, z) => (y > knee[1] + S(1) ? AR[0] : AR[1]));   // knee guard
        m.ellipsoid(knee[0] + S(0.2), knee[1] - S(0.4), knee[2] + sd * S(1.2), S(0.6), S(0.6), S(0.6), glow(CY, 0.8));
        m.box(R(S(-1.3)), 0, R(ank[2] - S(1.2)), R(S(2.4)), R(S(1.4)), R(ank[2] + S(1.2)), (x, y, z) => (y === R(S(1.4)) ? AR[0] : y === 0 ? DK : AR[1]));
        m.box(R(S(2.4)), 0, R(ank[2] - S(0.9)), R(S(3.1)), R(S(0.8)), R(ank[2] + S(0.9)), AR[2]); });
    });
    // hips and a narrow waist with a lit ring
    const waist = [S(0.2), S(L + T * 0.36), 0], sh = S(L + T - 0.6);
    inP(m, 'core', () => { m.ellipsoid(S(0.1), S(L + 0.6), 0, S(W * 0.95), S(1.9), S(W * 1.05), plate(4, 3, 4, 0)); m.capsule([0, S(L + 0.8), 0], waist, S(W * 0.72), S(W * 0.62), DK);
      for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; m.set(waist[0] + Math.cos(a) * S(W * 0.66), waist[1], Math.sin(a) * S(W * 0.66), CY, 0.8); } }, true);
    // torso: a broad chest tapering to the waist (the V of the card), abdominal plates, a lit core and a seam down the middle
    V.joint(m, 'torso', waist, null);
    const chW = stage === 1 ? 1.1 : stage === 2 ? 1.28 : 1.4;
    inP(m, 'torso', () => {
      m.ellipsoid(S(0.4), waist[1] + S(T * 0.62), 0, S(W * 0.95), S(T * 0.42), S(W * chW), plate(4, 3, 5, stage === 3 ? 0.25 : 0.1));
      for (let i = 0; i < 3; i++) m.ellipsoid(S(0.7), waist[1] + S(0.6 + i * 1.05), 0, S(W * 0.7), S(0.55), S(W * (0.62 + i * 0.1)), i % 2 ? AR[1] : AR[0]);   // abdominal plates
      for (let y = R(waist[1] + S(1.2)); y < R(S(L + T)); y++) { const p = K.surface(m, [0, y, 0], 0, 0, 30); if (p) m.set(p[0], p[1], 0, BL, 0.7); }
      const cc = K.surface(m, [0, waist[1] + S(T * 0.7), 0], 0, 0, 30); if (cc) { const r = stage === 1 ? 1 : 2; for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (Math.abs(a) + Math.abs(b) <= r) m.set(cc[0] + 1, cc[1] + a, b, Math.abs(a) + Math.abs(b) < r ? WH : CY, 1); }
      // pauldrons: three stacked plates, each trimmed with a blue line
      const pr = stage === 1 ? 1.8 : stage === 2 ? 2.25 : 2.6;
      K.sym((sd) => { for (let i = 0; i < 3; i++) { const cy = sh + S(0.8) - i * S(0.95); m.ellipsoid(S(0.2), cy, sd * S(W * 1.4), S(pr) - i * 0.5, S(1.0), S(pr * 0.85) - i * 0.3, (x, y, z) => (y <= R(cy - S(0.8)) ? glow(BL, 0.55) : i === 0 ? AR[0] : AR[1])); } });
    }, true);
    V.emit(m, 'chest', [S(0.4) + S(W), waist[1] + S(T * 0.62), 0], 'torso');
    // arms: shoulder and forearm; fists on Atem-01, blades grow from the forearms (one on Atem-02, two on Atem)
    const arm = (sd) => {
      const s = sd > 0 ? 'L' : 'R', s0 = [S(0.3), sh, sd * S(W * 1.42)], el = [S(0.9), sh - S(T * 0.55), sd * S(W * 1.62)], hd = [S(2.1), sh - S(T * 1.05), sd * S(W * 1.58)];
      V.joint(m, 'arm' + s, s0, 'torso'); V.joint(m, 'fore' + s, el, 'arm' + s);
      inP(m, 'arm' + s, () => m.capsule(s0, el, S(1.4), S(1.25), plate(4, 4, 6, 0)));
      const blade = stage === 3 || (stage === 2 && sd < 0);
      inP(m, 'fore' + s, () => {
        m.capsule(el, hd, S(1.3), S(1.2), plate(4, 4, 7, 0)); m.ellipsoid(el[0], el[1], el[2], S(1.0), S(1.0), S(1.0), glow(CY, 0.8));   // the elbow joint glows
        const bc = lerp3(el, hd, 0.55); m.ellipsoid(bc[0], bc[1], bc[2], S(1.6), S(2.0), S(1.55), (x, y, z) => (((y % 4) + 4) % 4 === 0 ? BL : AR[0]), 'under');   // bracer
        if (!blade) { const f = [hd[0] + S(0.5), hd[1] - S(0.4), hd[2]], x1 = R(f[0] + S(1.1));
          m.box(R(f[0] - S(1.1)), R(f[1] - S(1.2)), R(f[2] - S(1.1)), x1, R(f[1] + S(1.1)), R(f[2] + S(1.1)), (x, y, z) => (x === x1 ? (((y + 64) % 2) ? AR[2] : AR[1]) : AR[0]));
          V.emit(m, 'hand' + s, f, 'fore' + s); return; }
        // the blade: a broad crystalline sword, white at the edge, paler towards the tip, with a hilt guard
        const bl = S(stage === 3 ? 13 : 10.5), dir = norm([0.9, -0.95, sd * 0.1]), base = add(hd, dir, -S(0.4)), wide = norm(cross(dir, [0, 0, 1])), tip = add(base, dir, bl), bw = S(stage === 3 ? 1.9 : 1.6);
        for (let i = 0; i <= Math.ceil(bl * 2); i++) { const t = i / Math.ceil(bl * 2), wd = bw * (1 - Math.pow(t, 2.4) * 0.92);
          for (let w = -wd; w <= wd + 0.01; w += 0.45) for (let th = -0.5; th <= 0.51; th += 0.5) { const p = add(add(add(base, dir, t * bl), wide, w), [0, 0, 1], th), edge = Math.abs(w) > wd - 0.85, spine = Math.abs(w) < 0.5;
            m.set(p[0], p[1], p[2], edge ? '#f4fbff' : spine ? WH : t > 0.72 ? '#bfe6ff' : CY, edge || spine ? 1 : 0.75); } }
        m.box(R(base[0] - S(1.1)), R(base[1] - S(1.5)), R(base[2] - S(1.5)), R(base[0] + S(0.5)), R(base[1] + S(1.5)), R(base[2] + S(1.5)), (x, y, z) => (y === R(base[1] - S(1.5)) ? BL : AR[3]));   // hilt guard
        V.emit(m, 'hand' + s, lerp3(base, tip, 0.6), 'fore' + s);
      });
    };
    K.sym(arm);
    // head: a helmet with angled cheek plates, a T visor with two blue eyes, and a crest (Atem-02 and Atem)
    const hc = [S(0.75), S(L + T + 1.1 + 2.0), 0], hw = S(stage === 1 ? 1.95 : 1.8), hh = S(stage === 1 ? 2.0 : 2.1);
    V.joint(m, 'head', [S(0.4), S(L + T) + S(0.2), 0], 'torso');
    inP(m, 'head', () => {
      m.capsule([S(0.4), S(L + T - 0.4), 0], [S(0.5), S(L + T + 1.3), 0], S(1.0), S(0.95), DK);   // neck
      m.ellipsoid(hc[0], hc[1], hc[2], hw * 1.05, hh, hw, (x, y, z) => (y > hc[1] + hh * 0.55 ? AR[0] : x < hc[0] - hw * 0.4 ? AR[2] : AR[1]));
      K.sym((sd) => m.box(R(hc[0] - S(0.2)), R(hc[1] - hh * 0.9), R(sd * hw * 0.75), R(hc[0] + hw * 0.9), R(hc[1] - S(0.2)), R(sd * hw * 1.0), AR[2]));   // cheek plates
      const vx = R(hc[0] + hw * 1.0), vy = R(hc[1] + S(0.25));
      for (let z = -R(hw * 0.7); z <= R(hw * 0.7); z++) { m.set(vx, vy, z, VIS); m.set(vx - 1, vy, z, VIS); }
      for (let y = vy - R(S(1.1)); y < vy; y++) { m.set(vx, y, 0, VIS); m.set(vx, y, 1, VIS); m.set(vx, y, -1, VIS); }
      K.sym((sd) => { const z = R(sd * hw * 0.42); m.set(vx + 1, vy, z, CY, 1); m.set(vx + 1, vy, z + sd, WH, 1); });
      if (stage > 1) { const cy = R(hc[1] + hh) ; for (let i = 0; i < 5; i++) m.box(R(hc[0] + hw * 0.6 - i * S(0.75)), cy, 0, R(hc[0] + hw * 0.6 - i * S(0.75)), cy + (stage === 3 ? 4 : 3) - Math.floor(i / 2), 0, i === 0 ? CY : AR[0], i === 0 ? 0.8 : 0); }
    }, true);
    V.emit(m, 'mouth', [hc[0] + hw + S(0.4), hc[1] - S(0.4), 0], 'head');
    // the ring of blocks behind the head (a broken arc on Atem-01)
    const rc = [hc[0] - hw - S(1.2), hc[1] + S(0.8), 0], rr = S(stage === 1 ? 3.3 : stage === 2 ? 3.9 : 4.5);
    V.joint(m, 'ring', rc, 'head');
    inP(m, 'ring', () => { const n = R(rr * 7); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; if (stage === 1 && Math.sin(a) < -0.45) continue; const blk = i % 4 === 0;
      const p = [rc[0], rc[1] + Math.sin(a) * rr, Math.cos(a) * rr]; m.set(p[0], p[1], p[2], blk ? AR[0] : CY, blk ? 0 : 0.85); if (blk) m.set(p[0] - 1, p[1], p[2], AR[1]); } });
    return m;
  });

  /* ================================================================= META → META II → META III (Metal, Ancient Tech, peace)
     From the Phase 15 concept sheet: a slim grey armoured figure with blue light at the joints and a lit chest gem, a
     smooth helmet face with two blue eyes, a ring of light behind the head, and long wired hair: glowing blue cables
     with data cubes along them. Meta has a few short cables and a small ring; Meta II has shoulder plates, a waist and
     cables to the knees; Meta III has hip plates, a full mane of cables spreading wide to the ground, a large ring and
     two floating crystals. Block size stays close to the current models (the polish sheet keeps silhouettes).
     Rig: torso on the waist, head, shoulder → forearm, thigh → shin, the ring, and the hair in four locks (two per
     side), each with a tip, so the cables flow with a lag. */
  V.register('meta15', function (stage) {
    const m = new V.Model(), k = [1.3, 1.45, 1.6][stage - 1], S = (v) => v * k;
    const GR = ['#e2e7f2', '#c4cde0', '#a3aec6', '#828ea8'], CY = '#5fd0ff', BL = '#2f8cff', WH = '#f2f8ff', FACE = '#cfd8ea', GD = '#e8b84a', TAB = '#e9ecf8';
    const L = stage === 1 ? 9.5 : 10.5, T = stage === 1 ? 6.2 : 7, W = 1.7;
    const smooth = (x, y, z) => (y % 7 === 0 ? GR[2] : GR[1]);
    V.rigStart(m, 'biped');
    // legs: slim, tapering to pointed feet; a glowing knee and a light line down the shin
    K.sym((sd) => {
      const s = sd > 0 ? 'L' : 'R', hip = [0, S(L), sd * S(W * 0.6)], knee = [S(0.25), S(L * 0.5), sd * S(W * 0.5)], ank = [S(0.1), S(1.0), sd * S(W * 0.42)];
      V.joint(m, 'leg' + s, hip, null); V.joint(m, 'shin' + s, knee, 'leg' + s);
      inP(m, 'leg' + s, () => m.capsule(hip, knee, S(1.05), S(0.78), smooth));
      inP(m, 'shin' + s, () => { m.capsule(knee, ank, S(0.75), S(0.45), smooth); m.ellipsoid(knee[0] + S(0.55), knee[1], knee[2], S(0.5), S(0.5), S(0.5), glow(CY, 0.85));
        m.capsule(ank, [S(0.9), 0, ank[2]], S(0.5), 0.5, GR[0]);   // the pointed foot
        for (let y = R(ank[1] + S(1.2)); y < R(knee[1] - S(1)); y++) { const p = K.surface(m, [0, y, knee[2]], 0, 0, 20); if (p) m.set(p[0], y, R(knee[2]), CY, 0.7); } });
    });
    // hips wider than the waist; a lit waist ring
    const waist = [S(0.1), S(L + T * 0.33), 0], sh = S(L + T - 0.3);
    inP(m, 'core', () => { m.ellipsoid(0, S(L + 0.4), 0, S(W * 0.9), S(1.4), S(W * 1.2), smooth); m.capsule([0, S(L + 0.6), 0], waist, S(W * 0.55), S(W * 0.45), GR[2]);
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; m.set(waist[0] + Math.cos(a) * S(W * 0.5), waist[1], Math.sin(a) * S(W * 0.5), CY, 0.8); } }, true);
    // tabards (II, III): front and back panels from the waist, pale with a blue edge and a gold clasp
    if (stage > 1) inP(m, 'core', () => [1, -1].forEach((fb) => { const len = S(stage === 3 ? 6.5 : 5), w = S(stage === 3 ? 1.3 : 1.1);
      for (let y = 0; y < len; y++) { const half = w * (1 - y / len * 0.35); for (let z = -half; z <= half; z += 0.5) m.set(fb * S(W * 0.75) + fb * y * 0.08, waist[1] - y, z, Math.abs(z) > half - 0.6 || y === R(len) - 1 ? BL : TAB, Math.abs(z) > half - 0.6 ? 0.5 : 0); }
      m.set(fb * S(W * 0.8), waist[1], 0, GD); }), true);
    // torso: slim, a gem framed in gold, a gold collar, light lines; shoulder plates on II and III
    V.joint(m, 'torso', waist, null);
    inP(m, 'torso', () => {
      m.ellipsoid(S(0.2), waist[1] + S(T * 0.6), 0, S(W * 0.72), S(T * 0.42), S(W * 0.95), smooth);
      const cc = K.surface(m, [0, waist[1] + S(T * 0.66), 0], 0, 0, 20);
      if (cc) { [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => m.set(cc[0], cc[1] + a, b, GD)); [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => m.set(cc[0] + 1, cc[1] + a, b, a || b ? CY : WH, 1)); }
      for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; m.set(S(0.2) + Math.cos(a) * S(W * 0.6), S(L + T - 0.2), Math.sin(a) * S(W * 0.8), i % 3 ? GD : GR[0]); }
      if (stage > 1) K.sym((sd) => { for (let i = 0; i < 2; i++) { const cy = sh + S(0.4) - i * S(0.7); m.ellipsoid(S(0.1), cy, sd * S(W * 1.25), S(stage === 3 ? 1.6 : 1.35) - i * 0.4, S(0.65), S(1.15) - i * 0.3, (x, y, z) => (y <= R(cy - S(0.5)) ? GD : i ? GR[1] : GR[0])); } });
    }, true);
    V.emit(m, 'chest', [S(0.3) + S(W), waist[1] + S(T * 0.6), 0], 'torso');
    // arms: slender, glowing elbows, small pale hands (held a little out on Meta III)
    K.sym((sd) => {
      const s = sd > 0 ? 'L' : 'R', out = stage === 3 ? 1.9 : 1.55, s0 = [S(0.15), sh, sd * S(W * 1.3)], el = [S(0.45), sh - S(T * 0.55), sd * S(W * out)], hd = [S(1.0), sh - S(T * 1.0), sd * S(W * (out + 0.25))];
      V.joint(m, 'arm' + s, s0, 'torso'); V.joint(m, 'fore' + s, el, 'arm' + s);
      inP(m, 'arm' + s, () => m.capsule(s0, el, S(0.62), S(0.52), smooth));
      inP(m, 'fore' + s, () => { m.capsule(el, hd, S(0.52), S(0.45), smooth); m.ellipsoid(el[0], el[1], el[2], S(0.48), S(0.48), S(0.48), glow(CY, 0.85)); m.ellipsoid(hd[0] + S(0.25), hd[1] - S(0.45), hd[2], S(0.55), S(0.75), S(0.42), WH); });
      V.emit(m, 'hand' + s, [hd[0] + S(0.3), hd[1] - S(0.5), hd[2]], 'fore' + s);
    });
    // head: a small smooth helmet, a pale face with two blue eyes, a light crest
    const hc = [S(0.5), S(L + T + 0.9 + 1.6), 0], hr = S(1.6);
    V.joint(m, 'head', [S(0.3), S(L + T), 0], 'torso');
    inP(m, 'head', () => {
      m.capsule([S(0.3), S(L + T - 0.4), 0], [S(0.35), S(L + T + 1.0), 0], S(0.55), S(0.5), GR[2]);
      m.ellipsoid(hc[0], hc[1], hc[2], hr * 1.02, hr * 1.12, hr * 0.98, (x, y, z) => (y > hc[1] + hr * 0.6 ? GR[0] : GR[1]));
      m.ellipsoid(hc[0] + hr * 0.5, hc[1] - hr * 0.12, 0, hr * 0.58, hr * 0.72, hr * 0.74, FACE, 'paint');
      const ex = R(hc[0] + hr * 1.02), ey = R(hc[1] + S(0.1));
      K.sym((sd) => { const z = R(sd * hr * 0.42); m.set(ex, ey, z, CY, 1); m.set(ex, ey + 1, z, CY, 1); });
      for (let x = R(hc[0] - hr * 0.6); x < R(hc[0] + hr * 0.6); x++) m.set(x, R(hc[1] + hr * 1.12), 0, CY, 0.7);
    }, true);
    V.emit(m, 'mouth', [hc[0] + hr + S(0.4), hc[1] - S(0.5), 0], 'head');
    // the ring of light behind the head
    const rc = [hc[0] - hr - S(0.8), hc[1] + S(0.8), 0], rr = S(stage === 1 ? 3.3 : stage === 2 ? 4.1 : 5.0);
    V.joint(m, 'ring', rc, 'head');
    inP(m, 'ring', () => { const n = R(rr * 7); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; if (i % 6 === 5) continue; m.set(rc[0], rc[1] + Math.sin(a) * rr, Math.cos(a) * rr, i % 6 === 0 ? WH : CY, i % 6 === 0 ? 0 : 0.9); }
      if (stage === 3) for (let i = 0; i < 44; i++) { const a = (i / 44) * Math.PI * 2; if (i % 4 === 3) continue; m.set(rc[0] - 1, rc[1] + Math.sin(a) * (rr + 1.5), Math.cos(a) * (rr + 1.5), CY, 0.6); } });
    // the wired hair: thick glowing ribbons in four locks (two per side, each with a tip part), sweeping down and out
    // in an S and curling at the ends; more and longer with each stage; small data cubes along them
    const per = [1, 2, 2][stage - 1], len = S([9, 14, 18][stage - 1]), reach = [0.4, 0.7, 1.15][stage - 1], thick = [0.6, 0.62, 0.66][stage - 1];   // separate tendrils, not a solid mass
    K.sym((sd) => ['F', 'B'].forEach((fb, li) => {
      const lk = 'hair' + (sd > 0 ? 'L' : 'R') + fb, tip = lk + 'T', root = [hc[0] - hr * (0.75 + li * 0.35), hc[1] + hr * 0.35, sd * hr * 0.72];   // from the back of the head, clear of the face
      V.joint(m, lk, root, 'head'); V.joint(m, tip, add(root, [-0.2, -1, sd * 0.3 * reach], len * 0.45), lk);
      for (let c = 0; c < per; c++) {
        let p = add(root, [-li * 1.2, 0, sd * c * 1.6], 1); const steps = R(len / 1.0), ph = c * 2.3 + li * 3.1, wide = reach * (0.55 + c * 0.75 + li * 0.5);
        for (let j = 0; j < steps; j++) {
          const t = j / steps, part = t < 0.45 ? lk : tip;
          // down and outward, swinging out in an S; the last fifth curls up and out
          const curl = t > 0.8 ? (t - 0.8) / 0.2 : 0;
          const dir = norm([-0.3 - li * 0.15 + t * 0.2 + Math.sin(ph + t * 6) * 0.12, -1 + curl * 1.4, sd * (wide * (0.25 + t) * 0.6 + Math.sin(ph + t * 5) * 0.35) + sd * curl * 1.2]);
          const q = add(p, dir, 1.0), r0 = thick * (1 - t * 0.45) + 0.3;
          inP(m, part, () => { m.capsule(p, q, r0, r0 * 0.95, (x, y, z) => { const e = Math.hypot(x - q[0], y - q[1], z - q[2]) > r0 * 0.6; return glow(e ? '#9fe8ff' : CY, e ? 0.6 : 0.9); }, 'under');
            if (j % 5 === 4 && stage > 1) m.set(q[0], q[1], q[2] + sd * (r0 + 1), WH, 0.7); });
          p = q;
        }
      }
    }));
    // Meta III: two crystals float beside it (they drift with the aura)
    if (stage === 3) inP(m, 'aura', () => K.sym((sd) => { const c = [S(0.5), sh + S(2.2), sd * S(W * 5.2)]; for (let y = -3; y <= 3; y++) { const r = 1.9 - Math.abs(y) * 0.55; m.ellipsoid(c[0], c[1] + y, c[2], Math.max(0.5, r), 0.5, Math.max(0.5, r), glow(Math.abs(y) < 2 ? '#bfefff' : CY, 0.9)); } }));
    return m;
  });

  ['lumifern15', 'igniflare15', 'atem15', 'meta15'].forEach((id) => V.register(id + 's', (stage) => V.resample(V.model(id, stage), 0.62)));

  /* ================================================================= the developer switch
     Off by default. On: the three lines use these models in 3D (battle, viewer), with their Phase 15 clips, move
     effects, combat accents and sound layers. Nothing is saved with the game; the choice lives in this browser only. */
  const LINES15 = { lumifern: 'lumifern15', igniflare: 'igniflare15', atem: 'atem15', meta: 'meta15' };
  const PROTO_LINES = { lumifern: 1, igniflare: 1, atem: 1, meta: 1 };
  // Battery Saver copies of the hand-built prototypes: the same model on a coarser grid (each block of the coarse grid
  // takes the most common colour and part of the blocks inside it; glow and rig joints carry over)
  V.resample = function (src, f) {
    const cells = new Map(), key = (x, y, z) => x + ',' + y + ',' + z;
    src.v.forEach((v, k) => { const p = k.split(',').map(Number), q = key(Math.floor(p[0] * f), Math.floor(p[1] * f), Math.floor(p[2] * f)); let c = cells.get(q); if (!c) cells.set(q, c = { n: 0, cols: new Map() }); c.n++;
      const id = v.c + '|' + (v.g > 0.5 ? 1 : 0) + '|' + (v.p || ''); c.cols.set(id, (c.cols.get(id) || 0) + 1); });
    const m = new V.Model(), need = Math.max(1, Math.floor(1 / (f * f * f) * 0.3));
    cells.forEach((c, q) => { if (c.n < need) return; let best = null, bn = -1; c.cols.forEach((n, id) => { if (n > bn) { bn = n; best = id; } }); const [col, g, part] = best.split('|'), p = q.split(',').map(Number);
      m.part = part || null; m.set(p[0], p[1], p[2], col, +g); });
    m.part = null;
    if (src.pivots) { m.pivots = {}; Object.keys(src.pivots).forEach((n) => { const pv = src.pivots[n]; m.pivots[n] = Object.assign({}, pv, { at: pv.at.map((v) => v * f) }); }); }
    if (src.hid) { m.hid = new Map(); src.hid.forEach((v, k) => { const p = k.split(',').map(Number); m.hid.set(key(Math.floor(p[0] * f), Math.floor(p[1] * f), Math.floor(p[2] * f)), v); }); }
    if (src.rig) m.rig = Object.assign({}, src.rig, { done: true });
    return m;
  };
  const KEY = 'aminas.proto15';
  let on = false;
  const devOK = !!(A.Data && A.Data.DEV_TOOLS);   // a developer build only
  try { on = devOK && (/[?&]p15=1\b/.test(root.location ? root.location.search : '') || (root.localStorage && root.localStorage.getItem(KEY) === '1')); } catch (e) { on = false; }
  A.Proto15 = {
    LINES: Object.keys(LINES15),
    PROTO: Object.keys(PROTO_LINES),   // the Phase 15A prototype lines (the rest of LINES is the Phase 15B refined roster)
    vox: LINES15,
    enabled: () => on,
    // set(true|false): remembered in this browser; the 3D views pick it up on the next model build (reload to be sure)
    set(v) { on = !!v && devOK; try { if (root.localStorage) root.localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} return on; },
    active(spId) { if (!on) return false; const sp = A.Data && A.Data.SPECIES[spId]; return !!(sp && LINES15[sp.line]); },
    // Phase 15B: the model for this device. High (desktop High tier), phones ('m'), Battery Saver ('s'): the Phase 15A
    // prototypes use a coarser copy of themselves; the rest of the roster falls back to its production model.
    lod() { try { if (A.Perf && ((A.Perf.saver && A.Perf.saver()) || A.Perf.forceTier === 'saver')) return 's'; const touch = root.navigator && (root.navigator.maxTouchPoints > 0 || 'ontouchstart' in root);
      return touch || (A.Perf && A.Perf.tier && A.Perf.tier().id !== 'high') ? 'm' : 'h'; } catch (e) { return 'h'; } },
    voxFor(spId, lvl) { const sp = A.Data && A.Data.SPECIES[spId]; if (!sp || !LINES15[sp.line]) return null; const base = LINES15[sp.line], l = lvl || A.Proto15.lod();
      if (PROTO_LINES[sp.line]) return l === 's' ? base + 's' : base;
      return l === 's' ? null : l === 'm' ? base + 'm' : base; },
    addLines(map) { Object.keys(map).forEach((ln) => { LINES15[ln] = map[ln] + '15'; if (A.Proto15.LINES.indexOf(ln) < 0) A.Proto15.LINES.push(ln); }); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
