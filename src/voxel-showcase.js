/* Aminas — Phase 8 showcase monsters: Umbrit (stage 1), Cannonis (stage 1) and Aimza (all three stages).
   Higher-detail voxel models built in parts, so the 3D view can animate heads, jaws, eyelids, ears, wings, tails and
   Cannonis's cannon on their own (see src/3d/showcase.js). The same models draw the 2D portraits, cards and island
   critters, which simply ignore the parts. Every other form keeps its earlier builder:
   Duskmantle, Eclipsar, Reefback and Shellfin are untouched.
   Identities come from the supplied art: Umbrit from its original starter design (round velvet-indigo baby, pointed
   ears, glowing moon crest, big friendly eyes, pale belly, a shadow that pools under it), Cannonis and Aimza from their
   reference cards. Coordinates: x forward (the creature faces +x), y up, z to its left. */
(function (root) {
  'use strict';
  const A = root.A, V = A.Voxel; if (!V) return;
  const K = V.kit;
  const hash = V.hash;
  const part = (m, name, fn) => { const was = m.part; m.part = name; fn(); m.part = was; };
  const glow = (c, g) => ({ c, g: g == null ? 1 : g });
  // the first filled voxel scanning from the front (+x) at a given height and side
  const frontX = (m, y, z, from) => { y = Math.round(y); z = Math.round(z); let x = from == null ? m.max[0] + 2 : Math.round(from); const lo = m.min[0]; while (x >= lo && !m.has(x, y, z)) x--; return x < lo ? NaN : x; };
  // set only where a surface was found (NaN = no surface in that column)
  const put = (m, p, x, y, z, c, g) => { if (Number.isNaN(x)) return false; const was = m.part; m.part = p; m.set(x, y, z, c, g); m.part = was; return true; };
  const lerp = (a, b, t) => a + (b - a) * t;
  // a flat-ended cylinder from a to b (capsules have rounded caps that would close a cannon's bore)
  const cyl = (m, a, b, r, col, mode) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], R = r + 1;
    return m.fill([Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.min(a[2], b[2]) - R, Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, Math.max(a[2], b[2]) + R], (x, y, z) => {
      const t = ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L2; if (t < 0 || t > 1) return false;
      const px = a[0] + d[0] * t - x, py = a[1] + d[1] * t - y, pz = a[2] + d[2] * t - z; return px * px + py * py + pz * pz <= r * r; }, typeof col === 'function' ? (x, y, z) => col(x, y, z, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L2) : col, mode); };
  const pick = (cols, x, y, z, s) => cols[Math.floor(hash(x, y, z, s) * cols.length) % cols.length];

  /* =================================================================== UMBRIT — The Velvet Shadow (stage 1) */
  function umbrit() {
    const m = new V.Model();
    const IND = ['#4a3a92', '#5243a2', '#43358a'], DEEP = '#33286e', SHEEN = '#6b5bc8', SHADE = '#2a2160', BELLY = ['#aa9ce8', '#b6aaf0'], FOOT = '#1d1638';
    const PALE = '#ece4ff', MOON = '#f6efff', IRIS = '#b9a2ff', PUP = '#160e2c', BLUSH = '#ff8fbe';
    const cx = 0, cy = 13, R = 11;
    // velvet body: soft two-tone noise that darkens towards the ground, a sheen high on the front-left
    const velvet = (x, y, z) => {
      const t = (y - 2) / 22, h = hash(x >> 1, y >> 1, z >> 1, 3);
      if (t < 0.28) return h < 0.5 ? DEEP : SHADE;
      if (x > 2 && y > cy + 3 && z > 2 && h < 0.55) return SHEEN;
      return IND[Math.floor(h * 3) % 3];
    };
    part(m, 'core', () => {
      m.ellipsoid(cx, cy, 0, R, R * 0.98, R * 0.94, velvet);
      // pale belly patch on the lower front
      m.ellipsoid(cx + 7, cy - 5, 0, 6.5, 6, 7.2, (x, y, z) => BELLY[(x + y + z) & 1 ? 0 : 1], 'paint');
      // stubby dark feet
      K.sym((sd) => m.ellipsoid(cx + 3.5, 1.6, sd * 5.2, 3.6, 2, 3.1, FOOT));
      // tiny paws held in front of the belly
      K.sym((sd) => m.ellipsoid(cx + 9.6, cy - 4.5, sd * 4.4, 1.8, 1.6, 1.6, IND[1]));
    });
    // face: everything is placed on the body's front surface
    const eyeY = cy + 1.5, eyeZ = 5.6;
    K.sym((sd) => {
      const z0 = sd * eyeZ;
      for (let dy = -4; dy <= 4; dy++) for (let dz = -3; dz <= 3; dz++) {
        const e = dy * dy / 17 + dz * dz / 5.6; if (e > 1) continue;
        const y = eyeY + dy, z = Math.round(z0 + dz), x = frontX(m, y, z);
        let c = PUP, g = 0;
        if (e > 0.72) c = '#2a1f55';                                                        // soft rim
        if (dy <= -2 && e < 0.72) c = '#4a3690';                                            // violet glint at the bottom of the eye
        if (dy >= 1 && dy <= 2 && dz * sd >= -1 && dz * sd <= 0) { c = '#ffffff'; g = 0.6; }  // big highlight (upper inner)
        if (dy === -1 && dz * sd === 1) { c = '#e2d8ff'; g = 0.4; }                          // small highlight
        if (put(m, 'core', x, y, z, c, g)) m.hide(sd > 0 ? 'lidL' : 'lidR', x + 1, y, z, IND[0]);
      }
      // blush under the outer corner
      [[0, 0], [1, 0], [0, -1], [1, -1]].forEach(([dz, dy]) => { const y = eyeY - 5 + dy, z = Math.round(z0 + sd * (2.6 + dz)), x = frontX(m, y, z); m.part = 'core'; m.set(x, y, z, BLUSH); m.part = undefined; });
      m.pivot(sd > 0 ? 'lidL' : 'lidR', [frontX(m, eyeY + 4, Math.round(z0)) + 1, eyeY + 4.5, z0], null, { lid: true });
    });
    // small smile
    [[-1, 0], [0, 0], [1, 0], [-2, 1], [2, 1]].forEach(([dz, dy]) => { const y = eyeY - 5 + dy, x = frontX(m, y, dz); m.part = 'core'; m.set(x, y, dz, PUP); m.part = undefined; });
    // the moon-pale crescent crest on the forehead: a disc minus an offset disc, standing proud and glowing
    for (let dy = -4; dy <= 4; dy++) for (let dz = -4; dz <= 4; dz++) {
      if (dy * dy + dz * dz > 13.5) continue;
      if ((dy - 1.4) * (dy - 1.4) + (dz - 1.6) * (dz - 1.6) < 9) continue;
      const y = cy + 8 + dy, z = dz, x = frontX(m, y, z) + 1;
      put(m, 'core', x, y, z, MOON, 1);
    }
    // pointed ears (separate parts so they can twitch, flatten and perk)
    K.sym((sd) => {
      const name = sd > 0 ? 'earL' : 'earR', base = [cx - 1, cy + 8.5, sd * 5.6], tip = [cx - 3.2, cy + 20, sd * 9.2];
      m.pivot(name, base, null);
      part(m, name, () => {
        m.capsule(base, tip, 3.4, 0.55, (x, y, z, t) => (t > 0.86 ? DEEP : SHADE));
        // pale inner ear on the forward face
        m.capsule([base[0] + 1.2, base[1] + 1.5, base[2]], [tip[0] + 1.2, tip[1] - 1.2, tip[2] - sd * 0.4], 1.9, 0.35, PALE, 'paint');
        m.capsule([base[0] + 2.2, base[1] + 1.5, base[2]], [tip[0] + 2, tip[1] - 1.6, tip[2] - sd * 0.4], 1.6, 0.3, (x, y, z) => (x >= base[0] + 1 ? PALE : null), 'under');
      });
    });
    // a wisp tail that curls up behind, fading to violet light at the tip
    m.pivot('tail', [cx - 9.5, cy - 4, 0], null);
    part(m, 'tail', () => {
      const pts = [[cx - 9.5, cy - 4, 0], [cx - 14, cy - 3, 0], [cx - 16.5, cy + 1, 0], [cx - 16, cy + 5.5, 0], [cx - 13.5, cy + 8, 0]];
      for (let i = 0; i < pts.length - 1; i++) { const t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
        m.capsule(pts[i], pts[i + 1], lerp(2.8, 0.9, t0), lerp(2.8, 0.9, t1), (x, y, z, t) => { const k = lerp(t0, t1, t); return k > 0.72 ? glow(IRIS, 0.7) : k > 0.5 ? SHEEN : IND[1]; }); }
    });
    return m;
  }

  /* =================================================================== CANNONIS — The Living Artillery (stage 1) */
  function cannonis() {
    const m = new V.Model();
    const BL = ['#298bff', '#3d9cff', '#1f74e0'], BD = '#1557b8', DEEPB = '#0e3a80', CY = '#52c3ff', ICE = '#7fd8ff';
    const ST = ['#e6e6e6', '#d6cfbf', '#c2b59b', '#a8987a'], BROWN = '#7a6448', CREAM = ['#efe4c8', '#e2d4b0'], CLAW = '#f4efe2';
    // shell: Voronoi plates, stone and blue, with dark seams; some plates stand proud; a few seams carry water light
    const plate = (x, y, z, c0) => {
      const c = V.cells(x, y, z, 6.4, 17), id = c.id;
      if (c.edge < 0.6) return (id % 9 === 0) ? glow(ICE, 0.8) : DEEPB;
      const stone = id % 5 < 3;
      if (stone) return ST[id % 4] === ST[0] && y < c0 ? ST[1] : ST[id % 4];
      return BL[id % 3];
    };
    const shellC = [-2, 19, 0];
    part(m, 'core', () => {
      // blue torso and cream belly plates
      m.ellipsoid(1, 12, 0, 13, 8, 9.5, (x, y, z) => (x > 6 && y < 13 ? CREAM[(y >> 1) & 1] : BL[(x + z) & 1 ? 0 : 2]));
      // the shell dome: the bulk of the silhouette
      m.ellipsoid(shellC[0], shellC[1], 0, 15.5, 12, 12.5, (x, y, z) => plate(x, y, z, 16));
      m.box(-20, 0, -14, 16, 11.5, 14, null, 'carve');
      m.ellipsoid(1, 12, 0, 12.5, 7.5, 9, (x, y, z) => (x > 6 && y < 13 ? CREAM[(y >> 1) & 1] : BL[(x + z) & 1 ? 0 : 2]), 'under');
      // raised plates: every third plate gains a layer on its outer face
      const add = [];
      m.v.forEach((v, k) => { const p = k.split(',').map(Number); if (p[1] < 14) return; const c = V.cells(p[0], p[1], p[2], 6.4, 17); if (c.id % 3 || c.edge < 1.1) return;
        const d = [p[0] - shellC[0], p[1] - shellC[1], p[2]], L = Math.hypot(d[0], d[1], d[2]) || 1, q = [Math.round(p[0] + d[0] / L), Math.round(p[1] + d[1] / L), Math.round(p[2] + d[2] / L)];
        if (!m.has(q[0], q[1], q[2])) add.push([q, v.c]); });
      add.forEach(([q, c]) => m.set(q[0], q[1], q[2], c));
      // stout legs: blue skin, stone shoulder plates, pale claws
    });
    const legs = [['legFL', 9, 8.5, 3.8], ['legFR', 9, -8.5, 3.8], ['legBL', -10, 9, 4.2], ['legBR', -10, -9, 4.2]];
    legs.forEach(([name, lx, lz, r]) => {
      const top = [lx, 11, lz], sd = lz > 0 ? 1 : -1;
      m.pivot(name, top, null);
      part(m, name, () => {
        m.capsule(top, [lx + 1, 2.2, lz + sd * 0.8], r, r * 0.92, (x, y, z) => { const c = V.cells(x, y, z, 3, 41); return y > 7 ? (c.id % 3 ? ST[c.id % 4] : BL[1]) : c.edge < 0.5 ? BD : BL[c.id % 3]; });
        for (let c = -1; c <= 1; c++) m.box(lx + r * 0.55, 0, lz + sd * 0.8 + c * 1.6, lx + r * 0.55 + 1.6, 1.4, lz + sd * 0.8 + c * 1.6, CLAW);
      });
    });
    // head: low and forward under the cannon, blue face, heavy stone brow, glowing eyes; the jaw hinges open
    const neck = [12, 12, 0], hc = [18, 12.5, 0];
    m.pivot('head', neck, null);
    const skin = (x, y, z) => (V.cells(x, y, z, 2.4, 61).id % 4 ? BL[0] : BL[1]);
    part(m, 'head', () => {
      m.capsule([8, 12.5, 0], neck, 5, 4.6, skin);
      m.ellipsoid(hc[0], hc[1] + 0.5, 0, 6.4, 5.4, 5.8, skin);                                         // skull
      m.ellipsoid(hc[0] + 5, hc[1] - 0.2, 0, 4.4, 3.4, 4.3, (x, y, z) => (y < hc[1] - 1.6 ? DEEPB : BL[1])); // snout, dark mouth line beneath
      K.sym((sd) => m.set(hc[0] + 9, hc[1] + 1, sd * 1.6, DEEPB));                                       // nostrils
      // stone brow ridges over each eye and a crown plate that sweeps back towards the shell
      K.sym((sd) => m.ellipsoid(hc[0] + 2.6, hc[1] + 3.6, sd * 3.2, 3.2, 1.4, 2.2, (x, y, z) => ST[(V.cells(x, y, z, 2.2, 9).id) % 2 + 1]));
      m.ellipsoid(hc[0] - 0.5, hc[1] + 5.4, 0, 4.8, 1.8, 3.6, ST[0]);
      m.ellipsoid(hc[0] - 4.5, hc[1] + 5.2, 0, 3.4, 2, 3.4, ST[2]);
      // pale cheeks
      K.sym((sd) => m.ellipsoid(hc[0] + 1.5, hc[1] - 1.6, sd * 4.4, 2.6, 1.8, 1.4, CREAM[0], 'paint'));
    });
    // eyes under the brow
    K.sym((sd) => {
      const ez = sd * 3.4, ey = Math.round(hc[1] + 1.6);
      for (let dz = 0; dz <= 1; dz++) for (let dy = 0; dy <= 1; dy++) { const z = Math.round(ez + sd * dz), y = ey + dy, x = frontX(m, y, z, hc[0] + 9); m.part = 'head'; m.set(x, y, z, dy && dz === 0 ? '#ffffff' : ICE, 1); m.part = undefined; m.hide(sd > 0 ? 'lidL' : 'lidR', x + 1, y, z, BL[0]); }
      const lx = frontX(m, ey + 2, Math.round(ez), hc[0] + 9) + 1;
      m.pivot(sd > 0 ? 'lidL' : 'lidR', [lx, ey + 2.4, ez], 'head', { lid: true });
    });
    // the jaw: a rounded cream underside that hinges open for a roar
    m.pivot('jaw', [hc[0] - 3, hc[1] - 2.4, 0], 'head');
    part(m, 'jaw', () => {
      m.fill([hc[0] - 4, hc[1] - 7, -6, hc[0] + 9, hc[1] - 2, 6], (x, y, z) => ((x - hc[0] - 2.5) / 6.6) ** 2 + ((y - hc[1] + 2.6) / 2.6) ** 2 + (z / 4.6) ** 2 <= 1 && y <= hc[1] - 2.2, (x, y) => (y > hc[1] - 3.5 ? CREAM[0] : CREAM[1]));
      K.sym((sd) => { for (let i = 0; i < 3; i++) m.set(hc[0] + 3 + i * 2, hc[1] - 2, sd * 3, '#ffffff'); });
    });
    // the living cannon: grown from the shell, pointing forward and up; banded barrel, a glowing bore
    const base = [-6, 27.5, 0], dir = [0.86, 0.5, 0], Ln = 21, rr = 4.1, tip = [base[0] + dir[0] * Ln, base[1] + dir[1] * Ln, 0];
    m.pivot('cannon', base, null);
    part(m, 'cannon', () => {
      const P = (t) => [base[0] + dir[0] * Ln * t, base[1] + dir[1] * Ln * t, 0];
      // banded barrel: stone rings between blue living segments
      cyl(m, P(-0.08), P(1), rr, (x, y, z, t) => { const band = Math.floor(t * 9); return band % 2 ? ST[(band >> 1) % 3] : BL[band % 3]; });
      // muzzle ring, then a deep glowing bore (white core, cyan around it)
      cyl(m, P(0.86), P(1.02), rr + 0.9, (x, y, z) => ST[V.cells(x, y, z, 2, 5).id % 2]);
      cyl(m, P(0.7), P(1.05), rr - 1.4, null, 'carve');
      cyl(m, P(0.7), P(0.76), rr - 1.4, (x, y, z) => (Math.abs(z) < 1.3 && Math.abs((y - P(0.73)[1]) - (x - P(0.73)[0]) * 0) < 9 ? glow('#ffffff', 1) : glow(CY, 1)));
      cyl(m, P(0.76), P(1.05), rr - 1.4, (x, y, z) => (hash(x, y, z, 7) < 0.25 ? glow(ICE, 0.8) : null), 'under');
      // plates where it grows out of the shell
      m.ellipsoid(base[0] + 1, base[1] - 1.5, 0, 5.5, 3, 5.6, (x, y, z) => ST[V.cells(x, y, z, 2.8, 23).id % 4]);
    });
    m.pivot('muzzle', [tip[0] + dir[0], tip[1] + dir[1], 0], 'cannon');
    // short tail
    m.pivot('tail', [-14, 9, 0], null);
    part(m, 'tail', () => m.capsule([-14, 9, 0], [-20, 5, 0], 3, 1.2, (x, y, z) => (y > 7 ? ST[2] : BL[0])));
    return m;
  }

  /* =================================================================== AIMZA — The Copied Child (stages 1–3)
     Card: I The Awakening (white, cyan glow), II The Second Head, III The Third Head (black, cyan circuitry).
     Palette from the card: #9aa5b5 #3b4a63 #2c5a8a #22d3ee #7fe6f0 (stage 1), near-black navy with cyan (2–3). */
  function batWing(m, root, sd, span, o) {
    // arm root → wrist, four fingers fanning from the wrist; membrane panels between them with a scalloped edge
    const add = (a, d, l) => [a[0] + d[0] * l, a[1] + d[1] * l, a[2] + d[2] * l], nrm = (d) => { const L = Math.hypot(d[0], d[1], d[2]) || 1; return [d[0] / L, d[1] / L, d[2] / L]; };
    const wrist = add(root, nrm([-0.25, 0.9, sd * 0.75]), span * 0.42);
    const fingers = [[-0.1, 1, sd * 0.35], [-0.55, 0.85, sd * 0.5], [-0.9, 0.35, sd * 0.4], [-1, -0.15, sd * 0.25]].map((d, i) => add(wrist, nrm(d), span * [0.62, 0.72, 0.66, 0.52][i]));
    const bone = o.bone, br = o.boneR || 1.1;
    m.capsule(root, wrist, br * 1.2, br, bone);
    fingers.forEach((f) => m.capsule(wrist, f, br * 0.8, 0.45, bone));
    // membrane: fill each triangle wrist / finger i / finger i+1 (and root / wrist / last finger for the inner panel)
    const tri = (a, b, c, scallop) => { const st = 0.35;
      for (let u = 0; u <= 1; u += st / span * 6) for (let v = 0; v <= 1 - u; v += st / span * 6) {
        const w = 1 - u - v; if (scallop && w < 0.16 && Math.abs(u - v) < 0.22 && u + v > 0.9) continue;
        const x = a[0] * w + b[0] * u + c[0] * v, y = a[1] * w + b[1] * u + c[1] * v, z = a[2] * w + b[2] * u + c[2] * v;
        const X = Math.round(x), Y = Math.round(y), Z = Math.round(z); if (!m.has(X, Y, Z)) { const col = o.membrane(X, Y, Z); if (col) typeof col === 'string' ? m.set(X, Y, Z, col) : m.set(X, Y, Z, col.c, col.g); } } };
    for (let i = 0; i < fingers.length - 1; i++) tri(wrist, fingers[i], fingers[i + 1], true);
    tri(root, wrist, fingers[fingers.length - 1], false);
    return { wrist, fingers };
  }
  function aimza(stage) {
    const m = new V.Model(), k = [1, 1.32, 1.6][stage - 1], S = (v) => v * k;
    const CY = '#22d3ee', LC = '#7fe6f0', NAVY = '#2c5a8a';
    const white = stage === 1;
    const SK = white ? ['#eef2f7', '#dbe2eb', '#c5cfdb'] : ['#161d28', '#1d2633', '#27323f'];
    const DARKS = white ? ['#9aa5b5', '#8592a4'] : ['#0b0f16', '#0f141c'];
    const BELLY = white ? ['#f7f9fc', '#e6ecf3'] : ['#1e2a3c', '#24324a'];
    const HORN = white ? '#8a97aa' : '#2e3a4c', CLAW = white ? '#5e6b80' : '#3a4a60';
    const glowP = white ? 0.045 : 0.075;
    // skin: plated cells; seams glow cyan like circuitry (sparse on the white hatchling, dense on the dark forms)
    const skin = (x, y, z) => { const c = V.cells(x, y, z, white ? 2.6 : 2.2, 8 + stage);
      if (c.edge < 0.32 && hash(x >> 1, y >> 1, z >> 1, 3) < glowP * 3.2) return glow(hash(x, y, z, 4) < 0.3 ? LC : CY, white ? 0.8 : 1);
      return SK[c.id % 3]; };
    // torso, chest and belly
    part(m, 'core', () => {
      m.ellipsoid(0, S(10), 0, S(8.4), S(6.2), S(6.2), skin);
      m.ellipsoid(S(4.5), S(11), 0, S(4.8), S(5.4), S(5.4), skin);
      m.ellipsoid(S(2), S(7.2), 0, S(7), S(3.2), S(4.6), (x, y) => BELLY[(y >> 1) & 1], 'paint');
      // stage 1: a soft glowing chest core; later stages: a glowing seam down the chest
      if (white) m.ellipsoid(S(7.6), S(11), 0, S(1.6), S(2.4), S(2.2), (x, y, z) => glow(hash(x, y, z, 2) < 0.5 ? CY : LC, 1), 'paint');
      else m.box(S(7.8), S(7.5), -0.5, S(9.5), S(13.5), 0.5, glow(CY, 1), 'paint');
      // legs with claws
      [[S(5), S(5), 3], [S(-5.5), S(5.2), 3.3]].forEach(([lx, lz, r0]) => K.sym((sd) => {
        const z = sd * lz, r = S(r0);
        m.capsule([lx, S(9), z], [lx + S(1), S(4.4), z + sd * S(0.6)], r, r * 0.85, skin);
        m.capsule([lx + S(1), S(4.4), z + sd * S(0.6)], [lx + S(0.8), S(1.4), z + sd * S(0.8)], r * 0.8, r * 0.78, skin);
        for (let c = -1; c <= 1; c++) m.box(lx + S(1.2), 0, z + sd * S(0.8) + c * S(1.1), lx + S(2.6), S(0.8), z + sd * S(0.8) + c * S(1.1), CLAW);
        if (!white) m.set(lx + S(1.4), Math.round(S(6)), Math.round(z + sd * r), CY, 1);
      }));
      // dorsal spikes along the back (more and taller as it grows)
      const nSp = [4, 7, 10][stage - 1];
      for (let i = 0; i < nSp; i++) { const t = i / Math.max(1, nSp - 1), x = lerp(S(4), S(-8), t), y = S(15.8) - Math.abs(t - 0.4) * S(3.5);
        m.capsule([x, y - S(1), 0], [x - S(1.2), y + S(1.6 + stage * 0.6), 0], S(0.9), S(0.3), white ? DARKS[0] : (i % 3 === 1 ? glow(CY, 1) : DARKS[1])); }
    });
    // tail: a tapering chain that curls down and back, with a glowing tip
    m.pivot('tail', [S(-7.5), S(9.5), 0], null);
    part(m, 'tail', () => {
      const tl = white ? 0.75 : 1, pts = [[S(-7.5), S(9.5), 0], [S(-7.5 - 5.5 * tl), S(7.6), 0], [S(-7.5 - 10.5 * tl), S(5), S(1.5)], [S(-7.5 - 14.5 * tl), S(4), S(3.5)], [S(-7.5 - 17.5 * tl), S(5), S(5)]];
      for (let i = 0; i < pts.length - 1; i++) { const t0 = i / 4, t1 = (i + 1) / 4; m.capsule(pts[i], pts[i + 1], S(lerp(3, 0.8, t0)), S(lerp(3, 0.8, t1)), (x, y, z, t) => (lerp(t0, t1, t) > 0.86 ? glow(CY, 1) : skin(x, y, z))); }
      if (!white) for (let i = 1; i < 4; i++) m.capsule(pts[i], [pts[i][0] - S(1), pts[i][1] + S(1.6), pts[i][2]], S(0.6), S(0.25), DARKS[1]);
    });
    // wings: bat wings raised behind the shoulders; membrane cells glow (a few on the white hatchling, many later)
    const span = S([13.5, 18.5, 21][stage - 1]);
    const memb = (x, y, z) => { const cell = hash(Math.floor(x / 2), Math.floor(y / 2), Math.floor(z / 2), 31), big = hash(Math.floor(x / 4), Math.floor(y / 4), Math.floor(z / 4), 37);
      if (white) return cell < 0.1 && big < 0.6 ? glow(cell < 0.04 ? LC : CY, 0.8) : (cell < 0.55 ? '#d3dbe6' : '#c3cdda');
      return cell < 0.3 && big < 0.55 ? glow(cell < 0.1 ? LC : CY, 1) : (cell < 0.7 ? '#0e1520' : '#152030'); };
    K.sym((sd) => {
      const name = sd > 0 ? 'wingL' : 'wingR', rt = [S(-0.5), S(15), sd * S(4.6)];
      m.pivot(name, rt, null);
      part(m, name, () => batWing(m, rt, sd, span, { bone: white ? '#aeb9c8' : '#1c2533', boneR: S(1), membrane: memb }));
    });
    // heads: one, two or three, each a neck + head part with its own jaw, eyelids and mouth point
    const H = stage === 1 ? [['', [S(5.5), S(13), 0], [S(11.5), S(18.5), 0], 1.4]]
      : stage === 2 ? [['', [S(5.5), S(13.5), S(1.6)], [S(12.4), S(21.5), S(2.8)], 1.05], ['2', [S(5), S(12.5), S(-2.4)], [S(10.8), S(17.8), S(-7.6)], 0.9]]
      : [['', [S(5.5), S(14), 0], [S(13), S(23), 0], 1.05], ['2', [S(5), S(13), S(2.6)], [S(10.6), S(18.5), S(8.4)], 0.92], ['3', [S(5), S(13), S(-2.6)], [S(10.6), S(18.5), S(-8.4)], 0.92]];
    H.forEach(([n, base, c, size]) => {
      const h = k * size, hn = 'head' + n, cz = c[2];
      m.pivot(hn, base, null);
      part(m, hn, () => {
        m.capsule(base, [c[0] - 2 * h, c[1] - 1 * h, cz], S(2.8) * size, S(2.1) * size, skin);
        if (!white) m.capsule([base[0] + S(1.5), base[1], base[2]], [c[0] - 0.4 * h, c[1] - 2 * h, cz], 0.6, 0.6, glow(CY, 1), 'paint');
        m.ellipsoid(c[0], c[1], cz, 3.7 * h, 3.1 * h, 3.1 * h, skin);                                        // skull
        m.ellipsoid(c[0] + (white ? 2.7 : 3.3) * h, c[1] - 0.5 * h, cz, (white ? 2.5 : 3) * h, 1.9 * h, 2.3 * h, skin);                       // snout
        K.sym((sd) => { // swept-back horns (two pairs) and a brow ridge
          m.capsule([c[0] - 0.8 * h, c[1] + 2.3 * h, cz + sd * 1.8 * h], [c[0] - 5.2 * h, c[1] + 4.6 * h, cz + sd * 2.8 * h], 1 * h, 0.35 * h, HORN);
          m.capsule([c[0] - 1.8 * h, c[1] + 1.2 * h, cz + sd * 2.4 * h], [c[0] - 4.6 * h, c[1] + 1.8 * h, cz + sd * 3.6 * h], 0.7 * h, 0.3 * h, HORN);
          m.set(c[0] + (white ? 5 : 6) * h, c[1] + 0.2 * h, cz + sd * 1 * h, DARKS[1]);                                   // nostril
        });
      });
      // eyes: glowing cyan on the side of the face, with a lid in the hidden layer
      const ln = 'lid' + n; let lidTop = null;
      const ew = white ? 2 : 1; K.sym((sd) => { for (let dy = 0; dy <= ew; dy++) for (let dx = 0; dx <= ew; dx++) {
        const y = Math.round(c[1] + 0.9 * h) + dy, z0 = Math.round(cz + sd * 2.2 * h);
        let z = z0 + sd * 3; while (Math.abs(z - cz) > 0 && !m.has(Math.round(c[0] + 1.4 * h) + dx, y, z)) z -= sd;
        const x = Math.round(c[0] + 1.4 * h) + dx; if (!m.has(x, y, z)) continue;
        put(m, hn, x, y, z, dy === ew && dx === ew - (white ? 1 : 0) ? '#ffffff' : (white && dy === 0 ? LC : CY), 1); m.hide(ln, x, y, z + sd, SK[0]); lidTop = [x, y + 1.5, cz];
      } });
      if (lidTop) m.pivot(ln, lidTop, hn, { lid: true });
      // jaw: hinges under the skull; the inside of the mouth glows on the dark forms
      const jn = 'jaw' + n; m.pivot(jn, [c[0] + 0.4 * h, c[1] - 1.3 * h, cz], hn);
      part(m, jn, () => {
        m.fill([c[0] - 1 * h, c[1] - 4 * h, cz - 3 * h, c[0] + 7 * h, c[1] - 1.2 * h, cz + 3 * h], (x, y, z) => ((x - c[0] - 3 * h) / (3.4 * h)) ** 2 + ((y - c[1] + 2 * h) / (1 * h)) ** 2 + ((z - cz) / (2 * h)) ** 2 <= 1, (x, y, z) => (y >= c[1] - 1.6 * h ? (white ? '#f2f6fa' : glow(CY, 0.8)) : skin(x, y, z)));
        K.sym((sd) => { for (let i = 0; i < 3; i++) m.set(c[0] + (2 + i * 1.5) * h, c[1] - 1.2 * h, cz + sd * 1.5 * h, '#ffffff'); });
      });
      m.pivot('mouth' + n, [c[0] + 6.6 * h, c[1] - 1.1 * h, cz], hn);
    });
    return m;
  }

  /* =================================================================== register (other forms keep their builders) */
  const keep = (id, mine) => { const old = V.SPECIES[id]; V.register(id, (stage) => (mine[stage] ? mine[stage]() : old(stage))); };
  keep('umbrit', { 1: umbrit });
  keep('cannonis', { 1: cannonis });
  keep('aimza', { 1: () => aimza(1), 2: () => aimza(2), 3: () => aimza(3) });
  // moves whose presentation differs from the battle screen's default (Echo Wave has a cooldown but is Aimza's basic
  // strike: one head, the attack animation and voice, no ultimate camera)
  A.Showcase = { ids: ['umbrit', 'cannonis', 'aimza', 'aimza2', 'aimza3'], moves: { echowave: { clip: 'attack', ult: false, cue: 'attack' } } };
})(typeof window !== 'undefined' ? window : globalThis);
