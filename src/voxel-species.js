/* Aminas — voxel sculpts, one function per species line: (stage 1..3) -> A.Voxel.Model.
   Each line follows the supplied reference card. Stages grow from the same body plan, so the base form's
   silhouette stays readable in every later form. One voxel is one "block" of the reference art. */
(function (root) {
  'use strict';
  const V = root.A.Voxel;

  // Chunky armour: colour a surface by cells (plates) with blue seams; stone plates stand one block proud.
  function armour(m, test, o) {
    const add = [];
    m.v.forEach((val, k) => {
      const p = k.split(',').map(Number); if (!test(p[0], p[1], p[2])) return;
      const c = V.cells(p[0], p[1], p[2], o.size, o.seed), h = V.hash(c.id, o.seed, 1, 2);
      if (c.edge < o.seam) { m.set(p[0], p[1], p[2], o.glowSeam && V.hash(p[0], p[1], p[2], 9) < o.glowSeam ? o.glow : o.seamCol, o.glowSeam && V.hash(p[0], p[1], p[2], 9) < o.glowSeam ? 1 : 0); return; }
      const stone = h >= o.blue, col = stone ? o.stone[c.id % o.stone.length] : o.blues[c.id % o.blues.length];
      m.set(p[0], p[1], p[2], col);
      // raise stone plates outward along the surface normal (approximated from the shape centre)
      if (stone && h > o.blue + (1 - o.blue) * 0.35) {
        const n = [p[0] - o.c[0], (p[1] - o.c[1]) * 1.3, p[2] - o.c[2]], L = Math.hypot(n[0], n[1], n[2]) || 1;
        const q = [Math.round(p[0] + n[0] / L), Math.round(p[1] + n[1] / L), Math.round(p[2] + n[2] / L)];
        if (!m.has(q[0], q[1], q[2])) add.push([q[0], q[1], q[2], V.shade(col, 0.08)]);
      }
    });
    add.forEach((a) => m.set(a[0], a[1], a[2], a[3]));
  }

  /* ===== Cannonis → Reefback → Shellfin (reference: "CANNONIS – The Living Artillery", Water / Rock) =====
     A hunched, four-legged shell beast with a living cannon grown into its back. Palette from the card:
     #298BFF #52C3FF #7FD8FF #E6E6E6 and warm stone. */
  V.register('cannonis', function (stage) {
    const m = new V.Model(), k = [1, 1.2, 1.42][stage - 1] * V.detail(), S = (v) => v * k;
    const BL = '#298bff', BD = '#1d68c9', BM = '#3d9cff', CY = '#52c3ff', ICE = '#7fd8ff', W = '#e6e6e6', ST = ['#e6e6e6', '#d4cdbd', '#c2b59b', '#a8987a'], DARK = '#0f2038';
    const shellC = [S(-1), S(11), 0];
    V.rigStart(m, 'shellbeast');   // Phase 8B: shell body, head and jaw, four legs, tail, the living cannon
    // shell dome (the bulk of the silhouette) over a blue body
    m.ellipsoid(S(-1), S(11), 0, S(9.5), S(7.5), S(7.5), BL);
    m.box(S(-12), S(2), S(-9), S(10), S(6.5), S(9), null, 'carve');
    m.ellipsoid(S(0), S(7), 0, S(8), S(3.5), S(6), (x, y) => (y < S(6) ? ST[1] : BD), 'under'); // belly
    armour(m, (x, y) => y >= S(7), { size: stage === 1 ? 3.4 : 3.1, seed: 11, seam: 0.55, blue: stage === 1 ? 0.36 : 0.32, stone: ST, blues: [BL, BM, BD], seamCol: BD, glow: ICE, glowSeam: stage > 1 ? 0.18 : 0, c: shellC });
    // head: low and forward under the cannon, blue face, heavy stone brow, glowing eyes
    V.joint(m, 'head', [S(6), S(8), 0], null);
    V.inPart(m, 'head', () => { m.capsule([S(6), S(8), 0], [S(10), S(7), 0], S(3), S(2.7), BL); m.ellipsoid(S(11.5), S(7.2), 0, S(4.2), S(3.4), S(3.6), BM); });
    V.joint(m, 'jaw', [S(11), S(6), 0], 'head');
    V.inPart(m, 'jaw', () => m.ellipsoid(S(13.6), S(5.2), 0, S(2.6), S(1.4), S(2.4), W), true);          // pale jaw
    V.inPart(m, 'head', () => m.box(S(14), S(6.2), S(-1.4), S(15.4), S(7.6), S(1.4), BL), true);          // snout
    V.emit(m, 'mouth', [S(15.6), S(5.6), 0], 'head');
    // glowing eyes on the face (found on the head's front surface) under a short stone brow
    [-1, 1].forEach((sd) => {
      const ez = sd * Math.max(1, Math.round(S(1.8))), ey = Math.round(S(8.2));
      let ex = Math.round(S(17)); while (ex > 0 && !m.has(ex, ey, ez)) ex--;
      V.inPart(m, 'head', () => { m.set(ex, ey, ez, ICE, 1); m.set(ex, ey - 1, ez, '#ffffff'); m.set(ex, ey + 1, ez, ST[2]); m.set(ex - 1, ey + 2, ez, ST[1]); m.set(ex, ey + 1, ez + sd, ST[2]); });
      m.rig.eyes.push({ c: [S(11.5), ey, 0], o: { yaw: 0, ang: 30, iris: ICE, white: '#ffffff', lid: BL }, cells: [[ex, ey, ez, ICE], [ex, ey - 1, ez, '#ffffff']], part: 'head' });
    });
    // four stout legs with stone plating and pale claws
    [[S(5.5), S(5.5), 2.6], [S(-6.5), S(5.8), 2.9]].forEach(([lx, lz, r0]) => [-1, 1].forEach((sd) => {
      const z = sd * lz, r = r0 * k, n = 'leg' + (lx > 0 ? 'F' : 'B') + (sd > 0 ? 'L' : 'R');
      V.joint(m, n, [lx, S(6.2), z], null);
      V.inPart(m, n, () => {
        m.capsule([lx, S(7), z], [lx + S(0.6), S(1.2), z + sd * S(0.5)], r, r * 0.95, (x, y, zz) => { const c = V.cells(x, y, zz, 2.6, 31); return c.edge < 0.5 ? BD : y > S(4) ? (c.id % 3 ? BL : ST[2]) : c.id % 2 ? ST[1] : BL; });
        for (let c = -1; c <= 1; c++) m.box(lx + r * 0.6, 0, z + c * S(1.4), lx + r * 0.6 + 1 + (stage > 1 ? 1 : 0), 1, z + c * S(1.4) + (c ? 0 : 0), c ? ST[0] : W);
      });
    }));
    V.joint(m, 'tail', [S(-8.5), S(7), 0], null);
    V.inPart(m, 'tail', () => m.capsule([S(-9), S(7), 0], [S(-12.5), S(4), 0], S(1.8), S(0.8), BL)); // tail
    // the living cannon: grown from the shell, pointing forward and up; stone rings, a glowing bore
    const len = [14, 16, 18][stage - 1], cr = [2.2, 2.5, 2.8][stage - 1];
    const a = [S(-5), S(16.5), 0], dir = [0.84, 0.55, 0], L = Math.hypot(dir[0], dir[1]);
    const end = [a[0] + (dir[0] / L) * len * k, a[1] + (dir[1] / L) * len * k, 0];
    const R = cr * k, rings = stage + 3;
    V.joint(m, 'cannon', a, null);
    V.inPart(m, 'cannon', () => {
      m.capsule(a, end, R, R, (x, y, z, t) => (t > 0.92 ? ST[1] : Math.floor(t * rings * 2) % 2 ? ST[2] : stage > 1 ? BM : BL));
      const back = [end[0] - (dir[0] / L) * 1.2, end[1] - (dir[1] / L) * 1.2, 0];
      m.capsule(back, end, R + 1, R + 1, ST[0]);                                                  // muzzle ring
    });
    m.capsule([end[0] - (dir[0] / L) * 3, end[1] - (dir[1] / L) * 3, 0], [end[0] + 2, end[1] + 1, 0], R - 0.6, R - 0.6, null, 'carve'); // bore
    const bore = [end[0] - (dir[0] / L) * 3.2, end[1] - (dir[1] / L) * 3.2, 0];
    V.inPart(m, 'cannon', () => m.capsule([bore[0] - 0.8, bore[1] - 0.4, 0], bore, R - 0.6, R - 0.6, (x, y, z) => (Math.hypot(z, y - bore[1]) <= R * 0.62 ? { c: Math.hypot(z, y - bore[1]) <= R * 0.3 ? ICE : CY, g: 1 } : '#1d4f8f')));
    V.emit(m, 'muzzle', [end[0] + (dir[0] / L) * 1.5, end[1] + (dir[1] / L) * 1.5, 0], 'cannon');
    V.inPart(m, 'core', () => m.capsule([S(-6), S(14), 0], a, R + 1.3, R + 0.4, (x, y, z) => (V.hash(x, y, z, 6) < 0.5 ? ST[2] : BD), 'under'));           // root growth
    if (stage >= 2) {
      // Reefback: coral crests along the ridge, glowing vents on the flanks, a pressure channel on the barrel
      V.inPart(m, 'core', () => {
        for (let i = 0; i < 4; i++) { const x = S(-8.5 + i * 3.6), y = S(18.5) - Math.abs(i - 1.5) * S(1.2); m.capsule([x, y, S(i % 2 ? 1 : -1)], [x - 1, y + 2 + (i % 2), S(i % 2 ? 1 : -1)], 0.8, 0.5, i % 2 ? '#ff8aa8' : ICE); }
        [-1, 1].forEach((sd) => m.box(S(1), S(9), sd * S(8.2), S(4), S(9.6), sd * S(8.2), { c: CY, g: 1 }));
      });
      const mid = [a[0] + (end[0] - a[0]) * 0.45, a[1] + (end[1] - a[1]) * 0.45 + R + 0.4, 0];
      V.inPart(m, 'cannon', () => m.capsule([mid[0] - 2, mid[1] - 1, 0], [mid[0] + 2, mid[1] + 0.8, 0], 0.6, 0.6, { c: ICE, g: 1 }), true);
    }
    if (stage >= 3) {
      // Shellfin: blade fins sweep back from the shell sides, shoulder guards, a glowing ring behind the muzzle
      V.inPart(m, 'core', () => [-1, 1].forEach((sd) => {
        for (let i = 0; i < 3; i++) m.capsule([S(-1 - i * 3.4), S(12 - i * 0.6), sd * S(7.6)], [S(-5 - i * 3.4), S(14.5 - i * 1.3), sd * S(11.5 - i)], 1, 0.4, i === 0 ? ICE : CY);
        m.ellipsoid(S(5.5), S(8), sd * S(6.2), S(2.4), S(1.8), S(1.8), ST[0]);
      }));
      const r2 = [end[0] - (dir[0] / L) * 4, end[1] - (dir[1] / L) * 4, 0];
      V.inPart(m, 'cannon', () => m.capsule([r2[0] - 0.5, r2[1] - 0.3, 0], r2, R + 0.5, R + 0.5, CY, 'under'));
    }
    m.part = null;
    return m;
  });
})(typeof window !== 'undefined' ? window : globalThis);
