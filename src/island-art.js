/* Aminas — isometric island art (procedural SVG, original artwork, no external images).
   A.Iso: grid <-> world geometry. A.IsoArt: terrain, backdrops, buildings, obstacles, landmarks and overlays.
   World units: one grid cell is a 64 x 32 diamond. Sprites are drawn around the centre of their footprint (0,0),
   with "up" being negative y, lit from the top-left (left faces lighter, right faces darker). */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = A.Data;
  const TW = 64, TH = 32, HW = TW / 2, HH = TH / 2;
  const Iso = (A.Iso = { TW, TH });
  const Art = (A.IsoArt = {});
  const sh = (h, a) => (A.Art ? A.Art.shade(h, a) : h);
  const f1 = (n) => Math.round(n * 10) / 10;
  const P = (pts) => pts.map((p) => f1(p[0]) + ',' + f1(p[1])).join(' ');
  // bounding box tracker (on while a sprite is being turned into a cached image)
  let BB = null;
  const bbAdd = (x0, y0, x1, y1) => { if (BB) { if (x0 < BB[0]) BB[0] = x0; if (y0 < BB[1]) BB[1] = y0; if (x1 > BB[2]) BB[2] = x1; if (y1 > BB[3]) BB[3] = y1; } };
  const poly = (pts, fill, extra) => { if (BB) pts.forEach((p) => bbAdd(p[0], p[1], p[0], p[1])); return '<polygon points="' + P(pts) + '" fill="' + fill + '"' + (extra || '') + '/>'; };
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  /* ================= geometry ================= */
  Iso.top = (x, y) => [(x - y) * HW, (x + y) * HH];                    // top corner of cell (x,y); fractional ok
  Iso.center = (x, y, w, h) => Iso.top(x + w / 2, y + h / 2);           // centre of a w x h footprint
  Iso.cell = (wx, wy) => { const a = wy / HH, b = wx / HW; return [Math.floor((a + b) / 2), Math.floor((a - b) / 2)]; };
  Iso.diamond = (x, y, w, h) => { w = w || 1; h = h || 1; return [Iso.top(x, y), Iso.top(x + w, y), Iso.top(x + w, y + h), Iso.top(x, y + h)]; };
  // corners of a w x h footprint relative to its centre: [T, R, B, L]
  const foot = (w, h) => [[(h - w) * HW / 2, -(w + h) * HH / 2], [(w + h) * HW / 2, (w - h) * HH / 2], [(w - h) * HW / 2, (w + h) * HH / 2], [-(w + h) * HW / 2, (h - w) * HH / 2]];
  Art.foot = foot;
  const up = (p, hgt) => [p[0], p[1] - hgt];
  const scaleP = (p, k) => [p[0] * k, p[1] * k];
  // An iso box (cuboid) on a w x h footprint (cells, may be fractional), raised by `lift`, `hgt` tall.
  function box(w, h, hgt, top, left, right, lift, stroke) {
    const [T, R, B, L] = foot(w, h).map((p) => up(p, lift || 0));
    const s = stroke ? ' stroke="' + stroke + '" stroke-width="1.2" stroke-linejoin="round"' : '';
    return poly([L, B, up(B, hgt), up(L, hgt)], left, s) + poly([B, R, up(R, hgt), up(B, hgt)], right, s) + poly([up(T, hgt), up(R, hgt), up(B, hgt), up(L, hgt)], top, s);
  }
  Art.box = box;
  const shadow = (w, h, op) => { if (A.IsoArt.vx && A.IsoArt.vx.swap) [w, h] = [h, w]; const [T, R, B, L] = foot(w * 1.04, h * 1.04); return poly([T, R, B, L], '#1b2a10', ' opacity="' + (op || 0.18) + '"'); };
  const ell = (cx, cy, rx, ry, fill, extra) => (bbAdd(cx - rx, cy - ry, cx + rx, cy + ry), '') + '<ellipse cx="' + f1(cx) + '" cy="' + f1(cy) + '" rx="' + f1(rx) + '" ry="' + f1(ry) + '" fill="' + fill + '"' + (extra || '') + '/>';
  const circ = (cx, cy, r, fill, extra) => (bbAdd(cx - r, cy - r, cx + r, cy + r), '') + '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '" fill="' + fill + '"' + (extra || '') + '/>';
  const path = (d, fill, extra) => '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>';
  const stroke = (d, col, w, extra) => '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>';

  /* ================= palettes ================= */
  // PAL: flat colours still used by the island map thumbnails and a few sprites.
  const PAL = {
    starter: { grass: ['#6cc644', '#62bb3d', '#77d04c'], grassEdge: '#4f9f33', sand: ['#f0da9b', '#e6cd89'], path: ['#d2b07c', '#c6a26f'], pathStone: '#b8946a',
      cliff: ['#9a6a3f', '#7e7a75', '#5f5b63'], cliffL: '#a77749', water: '#4fc3e2', waterDeep: '#2f8fb8', shallow: '#8fe6f2', foam: '#ffffff', tuft: '#4e9e31', flowers: ['#ff8fc4', '#ffd75e', '#ffffff', '#b49cff'], plaza: ['#efe3c8', '#e3d2ae', '#cbb48a'] },
    verdant: { grass: ['#3fb25c', '#36a352', '#4cc068'], grassEdge: '#23803e', sand: ['#cfe39a', '#b9d184'], path: ['#b5935e', '#a98754'], pathStone: '#8c7044',
      cliff: ['#6b5236', '#626c58', '#3f4636'], cliffL: '#7a9a4c', water: '#3fd9cf', waterDeep: '#18a3b0', shallow: '#88f2e4', foam: '#e8fff8', tuft: '#2f9a4a', flowers: ['#9af2ff', '#e8ff7a', '#ffffff', '#7affc8'], plaza: ['#9fb68a', '#8aa275', '#6f8a5c'] },
    obsidian: { grass: ['#4a3f5c', '#433855', '#524667'], grassEdge: '#2e2540', sand: ['#5a4e66', '#51465d'], path: ['#7a6a7c', '#706072'], pathStone: '#5c4e60',
      cliff: ['#3a2f45', '#2b2236', '#15101c'], cliffL: '#3d3150', water: '#5a2a6a', waterDeep: '#2a1236', shallow: '#c45ad6', foam: '#ff9ce0', tuft: '#6d5a86', flowers: ['#ff5fc8', '#ff9a4a', '#d48aff', '#ffcf6a'], plaza: ['#6a5a70', '#5a4a62', '#463850'] },
    celestial: { grass: ['#8ea6ea', '#9c9ce8', '#aebcf4'], grassEdge: '#6a7fc8', sand: ['#d8d4f4', '#cbc6ee'], path: ['#f2e6c4', '#e8dab4'], pathStone: '#d4c294',
      cliff: ['#c8c0ec', '#5d5a9a', '#2f2c5e'], cliffL: '#7a76b8', water: '#bfe4ff', waterDeep: '#7fb6f0', shallow: '#ffffff', foam: '#ffffff', tuft: '#b8c8ff', flowers: ['#fff6c0', '#ffd0f4', '#ffffff', '#c8f4ff'], plaza: ['#f4f0ff', '#e2dcf8', '#c8c0ec'] },
  };
  Art.PAL = PAL;
  // VP: voxel material palettes (each list = base, variant, accent). fog = the colour the underside fades into.
  const VP = {
    starter: { grass: ['#6cc644', '#62bb3d', '#77d04c', '#55a637', '#8bdb5c'], lip: ['#5aae3a', '#4f9f33', '#67bd45'], dirt: ['#9a6a3f', '#8a5d36', '#a77749'],
      stone: ['#8f8b85', '#7e7a75', '#9d9890'], deep: ['#716c77', '#64606b', '#7c7783'], sand: ['#f0da9b', '#e6cd89', '#f6e5b2'], sandLip: ['#e0c47f', '#d4b672', '#e8cf8f'],
      path: ['#d2b07c', '#c6a26f', '#dcbd8c', '#b8946a'], water: ['#4fc3e2', '#45b6d8', '#86def2'], plaza: ['#efe3c8', '#e3d2ae'], ridge: ['#8f8b85', '#7e7a75', '#9d9890'],
      flowers: ['#ff8fc4', '#ffd75e', '#ffffff', '#b49cff', '#ff7a5e'], tuft: ['#4c9a30', '#86d757'], fog: '#a9d4ef', leaf: ['#4fae3c', '#3f9632', '#6cc84c'], wood: '#8a5a34' },
    verdant: { grass: ['#3fae55', '#36a04c', '#4abb5f', '#2d8d42', '#5cc96d'], lip: ['#2f9a48', '#27873e', '#3fae55'], dirt: ['#6e5236', '#5f462e', '#7a5c3d'],
      stone: ['#6f7a66', '#626c5a', '#7b8771'], deep: ['#4c5a52', '#435048', '#56655c'], sand: ['#cfe39a', '#c0d68a', '#dcecaa'], sandLip: ['#b5ca7c', '#a6bc6e', '#c2d68a'],
      path: ['#b5935e', '#a98754', '#c09f6a', '#9a7a4a'], water: ['#3fd9cf', '#35c9c0', '#8af2e8'], plaza: ['#9fb68a', '#8aa275'], ridge: ['#6f7a66', '#626c5a', '#7b8771'],
      flowers: ['#9af2ff', '#e8ff7a', '#ffffff', '#7affc8', '#ffd0f4'], tuft: ['#24803a', '#5fd070'], fog: '#7fd0c8', leaf: ['#2f9a4f', '#24823f', '#46b862'], wood: '#6a4a2c' },
    obsidian: { grass: ['#4a3f5c', '#433855', '#53476a', '#3b3150', '#5d5076'], lip: ['#3d3350', '#352c46', '#463b5c'], dirt: ['#3a2f45', '#32283d', '#43374f'],
      stone: ['#2d2438', '#261e30', '#352b42'], deep: ['#221a2c', '#1c1625', '#2a2134'], sand: ['#5a4e66', '#51465d', '#655870'], sandLip: ['#4a3f56', '#42384d', '#53485f'],
      path: ['#7a6a7c', '#706072', '#857587', '#625466'], water: ['#ff7a3a', '#ff6a2a', '#ffb05a'], plaza: ['#6a5a70', '#5a4a62'], ridge: ['#3b3150', '#33294a', '#45395c'],
      flowers: ['#ff5fc8', '#ff9a4a', '#d48aff', '#ffcf6a', '#ff5fc8'], tuft: ['#6d5a86', '#8a74a6'], fog: '#5a2a5e', leaf: ['#5a4a72', '#4a3c60', '#6d5a86'], wood: '#3a2a34' },
    celestial: { grass: ['#8ea6ea', '#98aef0', '#a6b9f4', '#8296e0', '#b8c6f8'], lip: ['#7f95dc', '#7489d2', '#8ea6ea'], dirt: ['#d6d0f2', '#c8c0ec', '#e2dcf8'],
      stone: ['#6a66a8', '#5d5a9a', '#7672b4'], deep: ['#4a4788', '#423f7a', '#524f92'], sand: ['#e2dcf8', '#d6d0f2', '#ece8fc'], sandLip: ['#cbc4ec', '#bfb8e4', '#d6d0f2'],
      path: ['#f2e6c4', '#e8dab4', '#f8eed4', '#dccca0'], water: ['#bfe4ff', '#acd8fa', '#e4f4ff'], plaza: ['#f4f0ff', '#e2dcf8'], ridge: ['#c8c0ec', '#b8b0e2', '#d6d0f2'],
      flowers: ['#fff6c0', '#ffd0f4', '#ffffff', '#c8f4ff', '#ffe08a'], tuft: ['#7f95dc', '#c8d6ff'], fog: '#c8c4f0', leaf: ['#b8c8ff', '#9fb2f2', '#d4ddff'], wood: '#5d5a9a' },
  };
  Art.VP = VP;
  // how thick each island is: cliff depth at the coast, extra depth per cell inland (the stepped underside), cap
  const SHAPE = { starter: [96, 26, 290], verdant: [100, 28, 300], obsidian: [104, 28, 300], celestial: [88, 30, 300] };

  /* ================= voxel kit ================= */
  // Everything on the island is built from iso blocks. Sprites use a local model space: u, v in cells (origin =
  // footprint centre; u runs along grid x, v along grid y) and z in px up; one cell-wide cube is 32 px tall.
  // Light comes from the upper left: tops brightest, +v faces (screen-left) lit, +u faces (screen-right) in shade.
  // VX.swap mirrors a model (rotated buildings) and keeps the light on the correct side.
  const VX = (Art.vx = { swap: false });
  const shc = {};
  const shade = (c, a) => { if (!a) return c; const k = c + '|' + a; return shc[k] || (shc[k] = sh(c, a)); };
  const mixc = {};
  const mix = (a, b, t) => {
    t = Math.round(t * 20) / 20; if (t <= 0) return a; const k = a + b + t; if (mixc[k]) return mixc[k];
    const ha = parseInt(a.slice(1), 16), hb = parseInt(b.slice(1), 16), ch = (s) => Math.round(((ha >> s) & 255) * (1 - t) + ((hb >> s) & 255) * t);
    return (mixc[k] = '#' + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1));
  };
  Art.mix = mix;
  const pj = (u, v, z) => (VX.swap ? [(v - u) * HW, (u + v) * HH - z] : [(u - v) * HW, (u + v) * HH - z]);
  const LIT = { t: 0.12, v: -0.07, u: -0.25 };
  const fc = (col, face) => shade(col, face === 't' ? LIT.t : (face === 'v') !== VX.swap ? LIT.v : LIT.u);
  const dq = (pts) => 'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
  const onV = (v, pts) => pts.map(([u, z]) => pj(u, v, z));
  const onU = (u, pts) => pts.map(([v, z]) => pj(u, v, z));
  const onT = (z, pts) => pts.map(([u, v]) => pj(u, v, z));
  const quadV = (v, u0, u1, z0, z1) => onV(v, [[u0, z0], [u1, z0], [u1, z1], [u0, z1]]);
  const quadU = (u, v0, v1, z0, z1) => onU(u, [[v0, z0], [v1, z0], [v1, z1], [v0, z1]]);
  const quadT = (z, u0, v0, u1, v1) => onT(z, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
  // An iso block: min corner (u0, v0, z0), size (du, dv, dz). o: { t, v, u } colour overrides, noT/noV/noU, x: extra attrs
  function vbox(u0, v0, z0, du, dv, dz, col, o) {
    o = o || {}; const u1 = u0 + du, v1 = v0 + dv, z1 = z0 + dz, x = o.x || '';
    let g = '';
    if (!o.noV) g += poly(quadV(v1, u0, u1, z0, z1), o.v || fc(col, 'v'), x);
    if (!o.noU) g += poly(quadU(u1, v0, v1, z0, z1), o.u || fc(col, 'u'), x);
    if (!o.noT) g += poly(quadT(z1, u0, v0, u1, v1), o.t || fc(col, 't'), x);
    return g;
  }
  const vc = (cu, cv, z, wu, wv, h, col, o) => vbox(cu - wu / 2, cv - wv / 2, z, wu, wv, h, col, o);
  // Block texture on the visible faces of a box: staggered joints plus a few lighter and darker blocks.
  // kind: 'stone' (masonry), 'brick' (small courses), 'plank' (boards), 'log' (horizontal logs)
  function tex(u0, v0, z0, du, dv, dz, col, kind, seed) {
    const u1 = u0 + du, v1 = v0 + dv, rowH = kind === 'brick' ? 6 : kind === 'plank' ? dz : kind === 'log' ? 7 : 9, hi = { v: '', u: '' }, lo = { v: '', u: '' };
    let j = ''; seed = seed || 1;
    const L = (a, b) => 'M' + f1(a[0]) + ' ' + f1(a[1]) + 'L' + f1(b[0]) + ' ' + f1(b[1]);
    const rows = Math.max(1, Math.round(dz / rowH));
    for (let r = 0; r < rows; r++) {
      const za = z0 + (dz * r) / rows, zb = z0 + (dz * (r + 1)) / rows;
      if (r > 0) j += L(pj(u0, v1, za), pj(u1, v1, za)) + L(pj(u1, v1, za), pj(u1, v0, za));
      [['v', u0, u1], ['u', v0, v1]].forEach(([f, a0, a1], fi) => {
        let a = a0 - (r % 2 && kind !== 'plank' ? 0.1 : 0), k = 0;
        while (a < a1 - 0.001 && k < 40) {
          const len = kind === 'plank' ? 0.17 : kind === 'log' ? 9 : (kind === 'brick' ? 0.13 : 0.2) + hash(r, k + fi * 31, seed) * 0.16, s = Math.max(a, a0), e = Math.min(a + len, a1);
          const hv = hash(k + fi * 17, r, seed + 7);
          if (e - s > 0.03) { const q = f === 'v' ? quadV(v1, s, e, za, zb) : quadU(u1, s, e, za, zb); if (hv < 0.2) hi[f] += dq(q); else if (hv > 0.8) lo[f] += dq(q); }
          if (e < a1 - 0.01) j += f === 'v' ? L(pj(e, v1, za), pj(e, v1, zb)) : L(pj(u1, e, za), pj(u1, e, zb));
          a += len; k++;
        }
      });
    }
    let g = '';
    ['v', 'u'].forEach((f) => { if (hi[f]) g += path(hi[f], shade(fc(col, f), 0.1)); if (lo[f]) g += path(lo[f], shade(fc(col, f), -0.12)); });
    return g + (j ? '<path d="' + j + '" fill="none" stroke="' + shade(col, -0.5) + '" stroke-width="1" opacity=".38"/>' : '');
  }
  const sbox = (u0, v0, z0, du, dv, dz, col, kind, seed, o) => vbox(u0, v0, z0, du, dv, dz, col, o) + tex(u0, v0, z0, du, dv, dz, col, kind || 'stone', seed);
  const scb = (cu, cv, z, wu, wv, h, col, kind, seed, o) => sbox(cu - wu / 2, cv - wv / 2, z, wu, wv, h, col, kind, seed, o);
  // Stepped stack (domes, roofs, pyramids): layers [[inset, height, colour?], ...] from the bottom up.
  function vstack(cu, cv, z, wu, wv, layers, col) {
    let g = '', zz = z;
    layers.forEach(([ins, h, c]) => { g += vc(cu, cv, zz, Math.max(0.02, wu - ins * 2), Math.max(0.02, wv - ins * 2), h, c || col); zz += h; });
    return g;
  }
  // Gabled roof along u: boxes stepping in from both v sides.
  function vroof(cu, cv, z, wu, wv, steps, stepH, col, col2) {
    let g = '';
    for (let i = 0; i < steps; i++) { const w = wv * (1 - i / steps); g += vc(cu, cv, z + i * stepH, wu, Math.max(0.06, w), stepH, i % 2 && col2 ? col2 : col); }
    return g;
  }
  // A voxel egg: stacked slabs, widest just below the middle, with a few spots.
  function vegg(cu, cv, z, s, col, spot) {
    const prof = [0.62, 0.88, 1, 1.02, 1, 0.92, 0.76, 0.5], h = s * 9.5;
    let g = '';
    prof.forEach((k, i) => {
      const w = s * k, zz = z + i * h;
      g += vc(cu, cv, zz, w, w, h + 0.4, col, { t: i === prof.length - 1 ? fc(col, 't') : shade(fc(col, 't'), -0.04) });
      if (spot && (i === 2 || i === 4)) g += poly(quadV(cv + w / 2, cu - w * 0.3, cu - w * 0.05, zz + 1, zz + h - 1), fc(spot, 'v')) + poly(quadU(cu + w / 2, cv - w * (i === 2 ? 0.3 : 0.05), cv + w * (i === 2 ? -0.05 : 0.22), zz + 1, zz + h - 1), fc(spot, 'u'));
    });
    return g + poly(quadV(cv + s * 0.5, cu - s * 0.38, cu - s * 0.24, z + h * 3, z + h * 5), '#ffffff', ' opacity=".35"');
  }
  // Foliage: a core block with smaller blocks around and on top (painter-sorted), with a few pixel highlights.
  function leaves(cu, cv, z, s, cols, seed, n) {
    const H = s * 30, parts = [[cu, cv, z, s, H, cols[0]]];
    n = n || 5;
    for (let i = 0; i < n; i++) {
      const top = i >= n - 2, a = hash(i, 1, seed) * Math.PI * 2, r = s * (top ? 0.16 : 0.42 + hash(i, 2, seed) * 0.12), ss = s * (top ? 0.5 + hash(i, 3, seed) * 0.16 : 0.44 + hash(i, 3, seed) * 0.2);
      parts.push([cu + Math.cos(a) * r, cv + Math.sin(a) * r, top ? z + H * 0.82 : z + H * (0.1 + hash(i, 4, seed) * 0.3), ss, ss * 30 * (top ? 0.7 : 0.9), top ? cols[2] : i % 2 ? cols[1] : cols[0]]);
    }
    parts.sort((p, q) => p[0] + p[1] - (q[0] + q[1]) || p[2] - q[2]);
    return parts.map(([u, v, zz, ss, hh, c], i) => vc(u, v, zz, ss, ss, hh, c) + (hash(i, 9, seed) > 0.4 ? poly(quadT(zz + hh, u - ss * 0.3, v - ss * 0.3, u - ss * 0.08, v - ss * 0.08), shade(fc(c, 't'), 0.18)) : '')).join('');
  }
  // Trees: round (oak), tall (two-tier), pine (stepped cone), bush, sapling.
  function vtree(kind, cu, cv, z, s, cols, trunk, seed) {
    trunk = trunk || '#7a5536';
    if (kind === 'pine') {
      let g = sbox(cu - 0.07 * s, cv - 0.07 * s, z, 0.14 * s, 0.14 * s, 14 * s, trunk, 'plank', seed);
      [[0.9, 12], [0.7, 12], [0.5, 11], [0.3, 10], [0.12, 8]].forEach(([w, h], i) => { g += vc(cu, cv, z + 10 * s + i * 10 * s, w * s, w * s, h * s, cols[i % 2 ? 1 : 0], i === 4 ? { t: fc(cols[2], 't') } : null); });
      return g;
    }
    if (kind === 'bush') return leaves(cu, cv, z, 0.5 * s, cols, seed, 4);
    if (kind === 'sapling') return vbox(cu - 0.03, cv - 0.03, z, 0.06, 0.06, 10 * s, trunk) + leaves(cu, cv, z + 9 * s, 0.3 * s, cols, seed, 3);
    const tall = kind === 'tall', th = (tall ? 30 : 18) * s;
    let g = sbox(cu - 0.09 * s, cv - 0.09 * s, z, 0.18 * s, 0.18 * s, th, trunk, 'plank', seed) + vbox(cu + 0.05 * s, cv - 0.02, z, 0.16 * s, 0.06 * s, 5, shade(trunk, -0.1));
    g += leaves(cu, cv, z + th - 4 * s, 0.9 * s, cols, seed, 6);
    if (tall) g += leaves(cu, cv, z + th + 22 * s, 0.6 * s, [cols[1], cols[0], cols[2]], seed + 3, 4);
    return g;
  }
  Art.vtree = vtree;

  /* ================= terrain: block columns (cached per island + world state) ================= */
  // Each land cell is a column of blocks: a material top (grass, sand, path, water...) and earth and stone below it.
  // Columns get deeper toward the middle of the island, so the island hangs in the air as a stepped, tapering
  // landmass. Sea cells next to the coast sometimes hold lower ledges, and a few loose chunks float nearby.
  // Drawn back to front by diagonal (x + y); within one diagonal blocks never overlap, so each diagonal is grouped
  // by colour into a few paths. Returns { svg, bounds, live } (live = the few animated bits, kept out of the image).
  // pictures are data: URIs (allowed everywhere the game runs, unlike blob: URLs under some hosts' content policies)
  const svgUri = (doc) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(doc);
  const wp = (X, Y, z) => [(X - Y) * HW, (X + Y) * HH - z];
  // smooth value noise (for patches of colour that are not a checkerboard)
  const vnoise = (x, y, s) => { const fx = x * s, fy = y * s, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sm = (t) => t * t * (3 - 2 * t), a = hash(x0, y0, 3), b = hash(x0 + 1, y0, 3), c2 = hash(x0, y0 + 1, 3), d2 = hash(x0 + 1, y0 + 1, 3); return (a + (b - a) * sm(tx)) * (1 - sm(ty)) + (c2 + (d2 - c2) * sm(tx)) * sm(ty); };
  const terrainCache = {};
  // 'image': the static terrain is one SVG image (the browser keeps it as a single picture); 'inline': SVG nodes
  Art.terrainMode = root.__terrainMode || 'image';
  // The terrain only depends on the island's map, so it is built once per island and reused.
  const terrainDone = {};
  Art.terrainCacheClear = () => { Object.keys(terrainDone).forEach((k) => delete terrainDone[k]); };
  Art.terrain = function (iid, st) {
    const key = iid + '|' + Art.terrainMode;
    return terrainDone[key] || (terrainDone[key] = buildTerrain(iid, st));
  };
  function buildTerrain(iid, st) {
    const isl = D.ISLANDS[iid], P = VP[iid], map = isl.map, n = isl.grid.w, m = isl.grid.h, [BASE, KD, CAP] = SHAPE[iid];
    const ch = (x, y) => (y >= 0 && x >= 0 && y < m && x < n ? map[y][x] : '~');
    const land = (x, y) => ch(x, y) !== '~';
    // distance from the sea (4-neighbour BFS) drives the underside taper
    const dist = {}, q = [];
    for (let y = -2; y < m + 2; y++) for (let x = -2; x < n + 2; x++) if (!land(x, y)) { dist[x + ',' + y] = 0; q.push([x, y]); }
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i], d = dist[x + ',' + y]; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const k = (x + dx) + ',' + (y + dy); if (dist[k] == null && land(x + dx, y + dy)) { dist[k] = d + 1; q.push([x + dx, y + dy]); } }); }
    const cols = {};
    const q8 = (z) => Math.round(z / 8) * 8;
    const mk = (x, y, kind, top, bot) => {
      const c = { x, y, kind, top, bot, lipD: [0, 1, 2, 3].map((i) => { const h = hash(x * 4 + i, y, 5); return h < 0.6 ? 7 : h < 0.85 ? 11 : 17; }), dirtD: 32 + (hash(x, y, 6) > 0.5 ? 16 : 0) };
      const grassy = kind === 'grass' || kind === 'hill' || kind === 'ledge' || kind === 'chunk' || kind === 'plaza';
      c.lipPal = grassy ? P.lip : kind === 'sand' ? P.sandLip : kind === 'water' ? P.water : kind === 'path' ? P.dirt : P.stone;
      c.dirtPal = kind === 'ridge' ? P.stone : P.dirt;
      if (kind === 'ridge') c.lipD = [0, 0, 0, 0];
      return (cols[x + ',' + y] = c);
    };
    const KIND = { g: 'grass', s: 'sand', p: 'path', h: 'hill', w: 'water', b: 'water', r: 'ridge', x: 'plaza' };
    for (let y = 0; y < m; y++) for (let x = 0; x < n; x++) {
      const c = ch(x, y); if (c === '~') continue;
      let kind = KIND[c] || 'grass'; const d = dist[x + ',' + y] || 1;
      // the beach ring breaks up into patches: meadow runs to the cliff edge in places (sand stays near paths)
      if (kind === 'sand' && iid !== 'celestial' && vnoise(x, y, 0.32) > 0.48 && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => 'pb'.includes(ch(x + dx, y + dy)))) kind = 'grass';
      const top = kind === 'hill' ? 24 + (hash(x, y, 4) > 0.5 ? 8 : 0) : kind === 'water' ? -8 : kind === 'ridge' ? 16 + (hash(x, y, 4) > 0.5 ? 8 : 0) : 0;
      const bot = -Math.min(CAP, q8(BASE + (d - 1) * KD + hash(x, y, 7) * 22));
      mk(x, y, kind, top, bot);
    }
    // ledges: lower blocks stepping out of the cliff
    const jet = iid === 'starter' ? Art.jettyCells() : {};
    for (let y = -1; y <= m; y++) for (let x = -1; x <= n; x++) {
      if (land(x, y) || jet[x + ',' + y]) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => land(x + dx, y + dy)).length;
      if (!nb || hash(x, y, 11) > 0.42) continue;
      const top = -(16 + 8 * Math.floor(hash(x, y, 12) * 3)), bot = top - (24 + 8 * Math.floor(hash(x, y, 13) * 4));
      mk(x, y, 'ledge', top, bot);
    }
    // loose chunks floating near the island (2-4 cells out)
    const chunks = [];
    for (let y = -4; y < m + 4; y++) for (let x = -4; x < n + 4; x++) {
      if (land(x, y) || cols[x + ',' + y] || jet[x + ',' + y]) continue;
      let near = 9; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (land(x + dx, y + dy)) near = Math.min(near, Math.abs(dx) + Math.abs(dy));
      if (near < 3 || near > 4 || hash(x, y, 21) < 0.93) continue;
      if (chunks.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 6)) continue;
      chunks.push([x, y]);
      const top = -(36 + 8 * Math.floor(hash(x, y, 22) * 6)), bot = top - (32 + 8 * Math.floor(hash(x, y, 23) * 5));
      mk(x, y, 'chunk', top, bot);
      if (hash(x, y, 24) > 0.5 && !land(x + 1, y) && !cols[(x + 1) + ',' + y]) mk(x + 1, y, 'chunk', top, bot + 8);
    }
    const col = (x, y) => cols[x + ',' + y];
    // ---- painter pass
    const BK = {};
    const bk = (dg) => BK[dg] || (BK[dg] = { f: {}, t: {}, d: {}, r: {}, s: '' });
    const add = (mp, c, pts) => { mp[c] = (mp[c] || '') + dq(pts); };
    const line = (mp, c, a, b) => { mp[c] = (mp[c] || '') + 'M' + f1(a[0]) + ' ' + f1(a[1]) + 'L' + f1(b[0]) + ' ' + f1(b[1]); };
    // a small block in world space, faces into a colour map
    const wbox = (mp, X, Y, z, du, dv, dz, c, tc) => { add(mp, fc(c, 'v'), [wp(X, Y + dv, z), wp(X + du, Y + dv, z), wp(X + du, Y + dv, z + dz), wp(X, Y + dv, z + dz)]); add(mp, fc(c, 'u'), [wp(X + du, Y + dv, z), wp(X + du, Y, z), wp(X + du, Y, z + dz), wp(X + du, Y + dv, z + dz)]); add(mp, tc || fc(c, 't'), [wp(X, Y, z + dz), wp(X + du, Y, z + dz), wp(X + du, Y + dv, z + dz), wp(X, Y + dv, z + dz)]); };
    const ROW = 16, isFloat = true;
    // exposed side of column c toward its +y (face 0) or +x (face 1) neighbour
    function side(c, face, B) {
      const nb = face ? col(c.x + 1, c.y) : col(c.x, c.y + 1), ivs = [];
      if (!nb) ivs.push([c.top, c.bot]);
      else { if (c.top > nb.top) ivs.push([c.top, Math.max(c.bot, nb.top)]); if (c.bot < nb.bot) ivs.push([Math.min(c.top, nb.bot), c.bot]); }
      ivs.forEach(([zT, zB]) => {
        if (zT - zB < 0.5) return;
        for (let s = 0; s < 2; s++) {
          const a = s / 2, b = (s + 1) / 2;
          const P0 = face ? (z) => wp(c.x + 1, c.y + a, z) : (z) => wp(c.x + a, c.y + 1, z);
          const P1 = face ? (z) => wp(c.x + 1, c.y + b, z) : (z) => wp(c.x + b, c.y + 1, z);
          const lipD = c.lipD[face * 2 + s];
          const cuts = [zT, zB];
          for (let z = Math.floor(zT / ROW) * ROW; z > zB; z -= ROW) if (z < zT) cuts.push(z);
          [c.top - lipD, c.top - c.dirtD].forEach((z) => { if (z < zT && z > zB) cuts.push(z); });
          cuts.sort((p, q2) => q2 - p);
          for (let i = 0; i < cuts.length - 1; i++) {
            const za = cuts[i], zb = cuts[i + 1]; if (za - zb < 0.5) continue;
            const d = c.top - (za + zb) / 2, row = Math.floor(-zb / ROW);
            const pal = d < lipD ? c.lipPal : d < c.dirtD ? c.dirtPal : zb < -112 ? P.deep : P.stone;
            const hv = hash(c.x * 4 + face * 2 + s, c.y * 97 + row, 91);
            let cl = fc(pal[hv < 0.58 ? 0 : hv < 0.82 ? 1 : 2], face ? 'u' : 'v');
            if (isFloat) { const fade = Math.min(0.5, Math.max(0, (-zb - 90) / 420)); if (fade > 0) cl = mix(cl, P.fog, fade); }
            if (zb <= c.bot + 0.5 && c.bot - nbBot(c, face) < 0) cl = shade(cl, -0.12);
            add(B.f, cl, [P0(za), P1(za), P1(zb), P0(zb)]);
          }
        }
        // bevel: a light rim where the top meets an exposed side
        if (zT === c.top && c.kind !== 'water') line(B.r, shade(c.lipPal[0], 0.32), face ? wp(c.x + 1, c.y, zT) : wp(c.x, c.y + 1, zT), wp(c.x + 1, c.y + 1, zT));
      });
    }
    const nbBot = (c, face) => { const nb = face ? col(c.x + 1, c.y) : col(c.x, c.y + 1); return nb ? nb.bot : 0; };
    const vn = vnoise;
    function topColour(c, sx, sy) {
      const X = c.x * 2 + sx, Y = c.y * 2 + sy, h = hash(X, Y, 8);
      switch (c.kind) {
        case 'grass': case 'hill': case 'ledge': case 'chunk': {
          if (c.kind === 'ledge' && c.top < -24 && iid !== 'verdant') return P.stone[h < 0.6 ? 0 : 2];
          const t = vn(c.x + sx / 2, c.y + sy / 2, 0.3), base = t < 0.38 ? 1 : t < 0.62 ? 0 : 2;
          return P.grass[h < 0.12 ? 3 : h > 0.92 ? 4 : base];
        }
        case 'sand': return P.sand[h < 0.62 ? 0 : h < 0.88 ? 1 : 2];
        case 'path': return P.path[Math.floor(h * 3.6)];
        case 'water': return P.water[(sx + sy) % 2 && h > 0.5 ? 1 : 0];
        case 'plaza': return P.plaza[(c.x + c.y) % 2];
        default: return P.ridge[h < 0.6 ? 0 : h < 0.85 ? 1 : 2];
      }
    }
    const order = Object.values(cols).sort((a, b) => a.x + a.y - (b.x + b.y));
    order.forEach((c) => {
      const B = bk(c.x + c.y);
      side(c, 0, B); side(c, 1, B);
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) { const X = c.x + sx / 2, Y = c.y + sy / 2; add(B.t, fc(topColour(c, sx, sy), 't'), [wp(X, Y, c.top), wp(X + 0.5, Y, c.top), wp(X + 0.5, Y + 0.5, c.top), wp(X, Y + 0.5, c.top)]); }
      details(c, B);
    });
    // ---- surface details (tiny blocks: grass blades, flowers, pebbles), trees on hills, bridges, vines
    function details(c, B) {
      const { x, y, kind, top } = c, v = hash(x, y, 2), grassy = kind === 'grass' || kind === 'hill' || kind === 'ledge' || kind === 'chunk';
      if (grassy && !(kind === 'ledge' && top < -24 && iid !== 'verdant')) {
        if (v > 0.78) for (let i = 0; i < 3; i++) wbox(B.d, x + 0.2 + hash(x, y, 30 + i) * 0.55, y + 0.2 + hash(x, y, 40 + i) * 0.55, top, 0.05, 0.05, 5 + hash(x, y, 50 + i) * 6, P.tuft[i % 2]);
        else if (v < 0.08) for (let i = 0; i < 3; i++) { const X = x + 0.2 + hash(x, y, 60 + i) * 0.6, Y = y + 0.2 + hash(x, y, 70 + i) * 0.6; wbox(B.d, X, Y, top, 0.03, 0.03, 4, P.tuft[0]); wbox(B.d, X - 0.03, Y - 0.03, top + 4, 0.09, 0.09, 3, P.flowers[(x + y + i) % P.flowers.length]); }
      } else if (kind === 'sand' && v > 0.86) { wbox(B.d, x + 0.3 + v * 0.3, y + 0.4, top, 0.09, 0.07, 3, iid === 'obsidian' ? '#2a2236' : '#ffffff'); }
      else if (kind === 'path' && v > 0.7) { wbox(B.d, x + 0.15 + hash(x, y, 31) * 0.5, y + 0.2 + hash(x, y, 32) * 0.5, top, 0.14, 0.1, 2, P.path[3]); }
      else if (kind === 'water') {
        if (v > 0.55) line(B.r, '#ffffff', wp(x + 0.2, y + 0.45, top), wp(x + 0.45, y + 0.45, top));
        if (ch(x, y) === 'b') bridge(c, B);
        if (iid === 'verdant' && hash(x, y, 13) > 0.75) { wbox(B.d, x + 0.3, y + 0.35, top, 0.32, 0.28, 2, '#4fbf63'); if (hash(x, y, 14) > 0.5) wbox(B.d, x + 0.38, y + 0.42, top + 2, 0.08, 0.08, 3, '#ffd0f4'); }
      } else if (kind === 'ridge' && v > 0.45) line(B.r, '#ff5fc8', wp(x + 0.3, y + 1, top - 6), wp(x + 0.6, y + 1, top - 14));
      // trees and bushes on hills, ledges and loose chunks (scenery only: nothing buildable sits there)
      if (kind === 'hill' || (kind === 'chunk' && v > 0.45) || (kind === 'ledge' && v > 0.8 && top >= -24)) {
        const [px, py] = wp(x + 0.5, y + 0.5, top), lv = P.leaf, k = kind === 'hill' ? (v > 0.66 ? 'round' : v > 0.4 ? 'pine' : v > 0.2 ? 'bush' : 'sapling') : kind === 'chunk' ? (v > 0.75 ? 'pine' : 'round') : 'bush';
        if (!(iid === 'obsidian' && k !== 'bush')) B.s += '<g transform="translate(' + f1(px) + ' ' + f1(py) + ')">' + vtree(k, 0, 0, 0, kind === 'chunk' ? 0.7 : 0.85, lv, P.wood, x * 13 + y) + '</g>';
        else B.s += '<g transform="translate(' + f1(px) + ' ' + f1(py) + ')">' + O.crystal() + '</g>';
      }
      // vines down the coast cliffs (green islands), magma cracks (obsidian), a gold band (celestial)
      [0, 1].forEach((face) => {
        const nb = face ? col(x + 1, y) : col(x, y + 1); if (nb || kind === 'water') return;
        const hv = hash(x * 2 + face, y, 17), a = 0.15 + hash(x, y + face, 18) * 0.6, fq = (z0, z1, w) => face ? [wp(x + 1, y + a, z0), wp(x + 1, y + a + w, z0), wp(x + 1, y + a + w, z1), wp(x + 1, y + a, z1)] : [wp(x + a, y + 1, z0), wp(x + a + w, y + 1, z0), wp(x + a + w, y + 1, z1), wp(x + a, y + 1, z1)];
        if ((iid === 'starter' || iid === 'verdant') && grassy && hv > (iid === 'verdant' ? 0.6 : 0.82)) { const L2 = 18 + hash(x, y, 19) * (iid === 'verdant' ? 46 : 26); add(B.d, fc(P.lip[1], face ? 'u' : 'v'), fq(top - 4, top - L2, 0.07)); add(B.d, fc(P.leaf[2], face ? 'u' : 'v'), fq(top - L2 + 6, top - L2, 0.12)); }
        if (iid === 'obsidian' && hv > 0.7) { const z0 = top - 30 - hash(x, y, 19) * 40; add(B.d, '#ff7a3a', fq(z0, z0 - 3, 0.25)); add(B.d, '#ffb05a', fq(z0 - 3, z0 - 10, 0.06)); }
        if (iid === 'celestial' && top === 0) add(B.d, '#ffd86b', face ? [wp(x + 1, y, -13), wp(x + 1, y + 1, -13), wp(x + 1, y + 1, -16), wp(x + 1, y, -16)] : [wp(x, y + 1, -13), wp(x + 1, y + 1, -13), wp(x + 1, y + 1, -16), wp(x, y + 1, -16)]);
      });
    }
    function bridge(c, B) {
      const along = 'pb'.includes(ch(c.x - 1, c.y)) || 'pb'.includes(ch(c.x + 1, c.y)), wood = '#b98a56';
      for (let i = 0; i < 5; i++) along ? wbox(B.d, c.x + i * 0.2 + 0.01, c.y + 0.12, c.top + 6, 0.17, 0.76, 3, i % 2 ? wood : shade(wood, 0.08)) : wbox(B.d, c.x + 0.12, c.y + i * 0.2 + 0.01, c.top + 6, 0.76, 0.17, 3, i % 2 ? wood : shade(wood, 0.08));
      if (along) { wbox(B.d, c.x, c.y + 0.06, c.top + 6, 1, 0.06, 9, '#7a5532'); wbox(B.d, c.x, c.y + 0.88, c.top + 6, 1, 0.06, 9, '#7a5532'); }
      else { wbox(B.d, c.x + 0.06, c.y, c.top + 6, 0.06, 1, 9, '#7a5532'); wbox(B.d, c.x + 0.88, c.y, c.top + 6, 0.06, 1, 9, '#7a5532'); }
    }
    // ---- emit
    let stat = '';
    const strokeCol = (c) => ' stroke="' + c + '" stroke-width=".7" stroke-linejoin="round"';
    Object.keys(BK).map(Number).sort((a, b) => a - b).forEach((dg) => {
      const B = BK[dg];
      Object.keys(B.f).forEach((c) => { stat += '<path d="' + B.f[c] + '" fill="' + c + '"' + strokeCol(c) + '/>'; });
      Object.keys(B.t).forEach((c) => { stat += '<path d="' + B.t[c] + '" fill="' + c + '"' + strokeCol(c) + '/>'; });
      Object.keys(B.r).forEach((c) => { stat += '<path d="' + B.r[c] + '" fill="none" stroke="' + c + '" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>'; });
      Object.keys(B.d).forEach((c) => { stat += '<path d="' + B.d[c] + '" fill="' + c + '"/>'; });
      stat += B.s;
    });
    const extra = Art.islandExtras(iid, cols, ch);
    stat += extra.stat;
    const lands = Object.values(cols).filter((c) => land(c.x, c.y)), pts = lands.map((c) => Iso.top(c.x, c.y));
    const bounds = { x0: Math.min(...pts.map((p) => p[0])) - HW, x1: Math.max(...pts.map((p) => p[0])) + HW, y0: Math.min(...pts.map((p) => p[1])) - 30, y1: Math.max(...pts.map((p) => p[1])) + TH + 90 };
    let svg = stat;
    if (Art.terrainMode === 'image') {
      const ex = { x: Math.floor(bounds.x0 - 380), y: Math.floor(bounds.y0 - 200), w: 0, h: 0 }; ex.w = Math.ceil(bounds.x1 + 380 - ex.x); ex.h = Math.ceil(bounds.y1 + 330 - ex.y);
      const key = iid + '|' + stat.length;
      let url = terrainCache[key];
      if (!url) url = terrainCache[key] = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + ex.x + ' ' + ex.y + ' ' + ex.w + ' ' + ex.h + '" width="' + ex.w + '" height="' + ex.h + '">' + stat + '</svg>');
      svg = '<image class="terrain-img" pointer-events="none" href="' + url + '" x="' + ex.x + '" y="' + ex.y + '" width="' + ex.w + '" height="' + ex.h + '"/>';
    }
    // Environment Phase 1: the column data, so the voxel island (src/3d/island3d.js) builds the same land in 3D
    const colList = Object.values(cols).map((c) => ({ x: c.x, y: c.y, kind: c.kind, top: c.top, bot: c.bot }));
    return { svg: svg + extra.live, bounds, live: extra.live, stat, cols: colList };
  }
  // Cells the starter jetty occupies (kept clear of ledges and chunks).
  Art.jettyCells = function () {
    const map = D.ISLANDS.starter.map, out = {}; let jy = -1, jx = -1;
    for (let y = map.length - 1; y >= 0 && jy < 0; y--) for (let x = 0; x < map[y].length; x++) if (map[y][x] === 'p') { jy = y; jx = x; break; }
    if (jy >= 0) for (let i = 1; i <= 4; i++) { out[jx + ',' + (jy + i)] = 1; out[(jx - 1) + ',' + (jy + i)] = 1; out[(jx + 1) + ',' + (jy + i)] = 1; }
    out.at = [jx, jy];
    return out;
  };
  // Island-specific scenery drawn with the terrain: { stat (static), live (animated) }.
  Art.islandExtras = function (iid, cols, ch) {
    const isl = D.ISLANDS[iid], P = VP[iid], n = isl.grid.w, m = isl.grid.h; let g = '', live = '';
    const land = (x, y) => ch(x, y) !== '~';
    // mist banks drifting below the island: soft blocky cloud rows that make the drop feel deep
    const lowest = Object.values(cols).filter((c) => land(c.x, c.y)).reduce((a, c) => (c.x + c.y > a.x + a.y ? c : a), { x: 0, y: 0 });
    const [bx, by] = wp(lowest.x + 0.5, lowest.y + 0.5, 0);
    const puff = (x, y, s, op) => '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s + ')" opacity="' + op + '"><rect x="-70" y="-14" width="140" height="22" rx="8" fill="#ffffff"/><rect x="-40" y="-30" width="70" height="24" rx="8" fill="#ffffff"/><rect x="10" y="-24" width="44" height="18" rx="7" fill="#ffffff"/><rect x="-70" y="2" width="140" height="6" rx="3" fill="' + P.fog + '" opacity=".6"/></g>';
    if (iid !== 'celestial') g += puff(bx - 420, by + 150, 1.6, 0.5) + puff(bx + 330, by + 120, 1.3, 0.42) + puff(bx - 40, by + 250, 2, 0.45);
    else g += puff(bx - 380, by + 160, 2, 0.8) + puff(bx + 300, by + 130, 1.7, 0.75) + puff(bx - 20, by + 250, 2.4, 0.85);
    if (iid === 'starter') g += Art.starterExtras(cols);
    if (iid === 'verdant' || iid === 'obsidian') {
      // falls where inland water (or the basalt fissure) reaches the coast and pours over the edge into the void
      const cells = Object.values(cols).filter((c) => (c.kind === 'water' || (iid === 'obsidian' && c.kind === 'ridge')) && land(c.x, c.y));
      const falls = cells.filter((c) => !land(c.x + 1, c.y) || !land(c.x, c.y + 1) || ch(c.x + 1, c.y) === 's' || ch(c.x, c.y + 1) === 's').slice(0, 3);
      falls.forEach((c) => {
        const face = !land(c.x + 1, c.y) || ch(c.x + 1, c.y) === 's' ? 1 : 0, a = face ? wp(c.x + 1, c.y + 0.25, c.top) : wp(c.x + 0.25, c.y + 1, c.top), b = face ? wp(c.x + 1, c.y + 0.75, c.top) : wp(c.x + 0.75, c.y + 1, c.top);
        const H = 190, cw = iid === 'verdant' ? '#e8fffa' : '#ffb05a', cd = iid === 'verdant' ? P.water[0] : '#ff5fc8';
        g += poly([a, b, [b[0], b[1] + H], [a[0], a[1] + H]], cd, ' opacity=".8"') + poly([[a[0] + 4, a[1]], [a[0] + 8, a[1]], [a[0] + 8, a[1] + H], [a[0] + 4, a[1] + H]], cw, ' opacity=".7"');
        live += '<path class="fall" d="M' + f1(a[0] + (b[0] - a[0]) * 0.55) + ' ' + f1(a[1] + 2) + 'h5v' + (H - 10) + 'h-5z" fill="' + cw + '" opacity=".8"/>';
        g += '<rect x="' + f1(Math.min(a[0], b[0]) - 14) + '" y="' + f1(Math.max(a[1], b[1]) + H - 8) + '" width="' + f1(Math.abs(b[0] - a[0]) + 28) + '" height="16" rx="8" fill="' + cw + '" opacity=".45"/>';
      });
    }
    if (iid === 'obsidian') {
      // basalt spikes standing on loose chunks
      Object.values(cols).filter((c) => c.kind === 'chunk').forEach((c, i) => { const [x, y] = wp(c.x + 0.5, c.y + 0.5, c.top); g += '<g transform="translate(' + f1(x) + ' ' + f1(y) + ')">' + vc(0, 0, 0, 0.3, 0.3, 30 + (i % 3) * 10, '#2a2236') + vc(0.25, 0.1, 0, 0.2, 0.2, 18, '#33294a') + '</g>'; });
    }
    if (iid === 'celestial') {
      // little star crystals on the meadow, and a gold spark on each loose chunk
      Object.values(cols).forEach((c) => {
        if (c.kind === 'grass' && hash(c.x, c.y, 12) > 0.92) { const [x, y] = wp(c.x + 0.5, c.y + 0.5, 0); g += '<g transform="translate(' + f1(x) + ' ' + f1(y) + ')">' + vc(0, 0, 0, 0.08, 0.08, 7, '#fff8d8') + vc(0, 0, 7, 0.14, 0.14, 4, '#fff3b0') + '</g>'; }
        if (c.kind === 'chunk') { const [x, y] = wp(c.x + 0.5, c.y + 0.5, c.top); g += '<g transform="translate(' + f1(x) + ' ' + f1(y) + ')">' + vc(0, 0, 0, 0.12, 0.12, 14, '#e0c8ff') + vc(0, 0, 14, 0.06, 0.06, 6, '#ffffff') + '</g>'; live += circ(x, y - 18, 3, '#fff6c0', ' class="twk"'); }
      });
    }
    return { stat: g, live };
  };
  // Starter scenery: a plank jetty out over the edge with a moored sky-skiff, and a lighthouse on its own rock.
  Art.starterExtras = function (cols) {
    const J = Art.jettyCells(), [jx, jy] = J.at; let g = '';
    if (jy >= 0) {
      const wood = '#b98a56', dark = '#7a5532';
      // support beams hanging under the deck, then the deck planks and side rails, front to back order
      for (let i = 1; i <= 4; i++) { [0.12, 0.8].forEach((a) => { g += '<g transform="translate(' + f1(wp(jx + a, jy + i, 0)[0]) + ' ' + f1(wp(jx + a, jy + i, 0)[1]) + ')">' + vbox(0, -0.04, -46 + i * 4, 0.08, 0.08, 46 - i * 4, dark) + '</g>'; }); }
      for (let i = 0; i < 16; i++) { const Y = jy + 1 + i * 0.25; g += '<g transform="translate(' + f1(wp(jx, Y, 0)[0]) + ' ' + f1(wp(jx, Y, 0)[1]) + ')">' + vbox(0.06, 0, -4, 0.88, 0.22, 4, i % 2 ? wood : shade(wood, 0.08)) + '</g>'; }
      [0.04, 0.88].forEach((a) => { for (let i = 1; i <= 4; i++) { const [x, y] = wp(jx + a, jy + i, 0); g += '<g transform="translate(' + f1(x) + ' ' + f1(y) + ')">' + vbox(0, -0.05, 0, 0.08, 0.1, 14, dark) + '</g>'; } });
      // lantern post at the end
      const [lx, ly] = wp(jx + 0.85, jy + 4.8, 0);
      g += '<g transform="translate(' + f1(lx) + ' ' + f1(ly) + ')">' + vc(0, 0, 0, 0.07, 0.07, 30, dark) + vc(0, 0, 30, 0.16, 0.16, 9, '#ffe9a0') + vc(0, 0, 39, 0.2, 0.2, 3, '#5a4a3a') + '</g>';
      // the skiff: a little boat with a sail, bobbing beside the jetty end on a puff of cloud
      const [sx, sy] = wp(jx + 2.2, jy + 4.2, -14);
      g += '<g transform="translate(' + f1(sx) + ' ' + f1(sy) + ')">' + vc(0, 0, -12, 1.3, 0.5, 8, '#ffffff', { t: '#ffffff', v: '#eef6fc', u: '#d8e8f4', x: ' opacity=".85"' }) + vc(-0.3, 0.1, -16, 0.6, 0.4, 6, '#ffffff', { t: '#ffffff', v: '#eef6fc', u: '#d8e8f4', x: ' opacity=".8"' }) +
        vbox(-0.5, -0.18, 0, 1, 0.36, 6, '#a8452c') + vbox(-0.6, -0.14, 6, 1.2, 0.28, 7, '#c0583a') + vbox(-0.5, -0.1, 13, 1, 0.2, 2, '#f2e6c4') + vc(0, 0, 13, 0.06, 0.06, 46, '#7a5532') +
        poly(onV(0.04, [[0.04, 58], [0.5, 22], [0.04, 22]]), '#fff8ec') + poly(onV(0.04, [[0.04, 58], [0.5, 22], [0.04, 22]]).map((p) => [p[0], p[1]]), 'none', ' stroke="#d6c4a0" stroke-width="1.5"') + '</g>';
    }
    // lighthouse on a rock east of the island
    let ex = null; Object.values(cols).forEach((c) => { if (D.ISLANDS.starter.map[c.y] && D.ISLANDS.starter.map[c.y][c.x] && D.ISLANDS.starter.map[c.y][c.x] !== '~' && (!ex || c.x - c.y > ex.x - ex.y)) ex = c; });
    if (ex) {
      const [x, y] = wp(ex.x + 2.6, ex.y + 0.5, -40);
      g += '<g transform="translate(' + f1(x) + ' ' + f1(y) + ')">' + sbox(-0.6, -0.6, -60, 1.2, 1.2, 50, '#7e7a75', 'stone', 3) + vbox(-0.6, -0.6, -10, 1.2, 1.2, 10, '#5aae3a', { t: fc('#6cc644', 't') }) +
        sbox(-0.3, -0.3, 0, 0.6, 0.6, 18, '#fff8ec', 'brick', 4) + vbox(-0.28, -0.28, 18, 0.56, 0.56, 9, '#d8583a') + sbox(-0.26, -0.26, 27, 0.52, 0.52, 16, '#fff8ec', 'brick', 5) + vbox(-0.24, -0.24, 43, 0.48, 0.48, 9, '#d8583a') +
        vbox(-0.32, -0.32, 52, 0.64, 0.64, 3, '#5a4a6a') + vc(0, 0, 55, 0.36, 0.36, 12, '#fff3b0') + vstack(0, 0, 67, 0.5, 0.5, [[0, 4], [0.08, 4], [0.16, 4]], '#5a4a6a') +
        circ(0, -78, 18, '#fff3b0', ' opacity=".28"') + '</g>';
    }
    return g;
  };
  // Ambient life layer (world space, never interactive): butterflies, fireflies, embers or star motes per island.
  // Seasonal dressing (v0.4): paper lanterns drifting up over the island while a festival runs. Drawn as an HTML
  // layer above the island (UI.festivalLayer) so the animation is composited and never repaints the SVG world.
  Art.festivalLayer = function (id) {
    const c = ['#ffb05a', '#c88aff', '#ff9a7a', '#ffb05a']; // Dev 7: 6 -> 4 lanterns
    return '<div class="fest-layer fest-' + id + '" aria-hidden="true">' + c.map((col, i) => '<i class="fest-lan" style="--lc:' + col + ';left:' + (8 + i * 16 + (i % 2) * 5) + '%;--d:' + (14 + (i * 3) % 7) + 's;--dx:' + ((i % 3) - 1) * 2.5 + 'rem;--y:' + (18 + (i * 13) % 40) + '%;animation-delay:-' + (i * 2.7).toFixed(1) + 's"></i>').join('') + '</div>';
  };
  Art.ambient = function (iid) {
    const isl = D.ISLANDS[iid], out = [], n = 5; // Dev 7: 9 -> 5 (each one repaints the island while it moves)
    for (let i = 0; i < n; i++) {
      const x = 4 + hash(i, 1, 77) * (isl.grid.w - 8), y = 4 + hash(i, 2, 77) * (isl.grid.h - 8), [wx, wy] = Iso.top(x, y), d = (Math.round(hash(i, 3, 77) * 12) / 2).toFixed(1); // Dev 7: delays on the 0.5 s ambient beat
      if (iid === 'starter') out.push('<g transform="translate(' + f1(wx) + ' ' + f1(wy - 40) + ')"><g class="bfly" style="animation-delay:-' + d + 's"><g class="wings"><rect x="-8" y="-3" width="6" height="6" fill="' + ['#ffb0d8', '#ffe27a', '#b8e0ff'][i % 3] + '"/><rect x="2" y="-3" width="6" height="6" fill="' + ['#ffb0d8', '#ffe27a', '#b8e0ff'][i % 3] + '"/></g><rect x="-1" y="-4" width="2" height="8" fill="#4a3a2a"/></g></g>');
      else if (iid === 'verdant') out.push('<g transform="translate(' + f1(wx) + ' ' + f1(wy - 30) + ')"><g class="ffly" style="animation-delay:-' + d + 's"><rect x="-5" y="-5" width="10" height="10" fill="#e8ff7a" opacity=".25"/><rect x="-2" y="-2" width="4" height="4" fill="#f4ffb0"/></g></g>');
      else if (iid === 'obsidian') out.push('<g transform="translate(' + f1(wx) + ' ' + f1(wy) + ')"><g class="emb" style="animation-delay:-' + d + 's"><rect x="-2" y="-2" width="4" height="4" fill="' + (i % 2 ? '#ff9a5a' : '#ff5fc8') + '"/></g></g>');
      else out.push('<g transform="translate(' + f1(wx) + ' ' + f1(wy - 60) + ')"><g class="mote" style="animation-delay:-' + d + 's"><rect x="-1.5" y="-6" width="3" height="12" fill="#fff3b0"/><rect x="-6" y="-1.5" width="12" height="3" fill="#fff3b0"/></g></g>');
    }
    return '<g class="ambient" pointer-events="none">' + out.join('') + '</g>';
  };

  /* ================= grid & placement overlays ================= */
  Art.grid = function (iid) {
    const isl = D.ISLANDS[iid]; let d = '';
    for (let y = 0; y < isl.grid.h; y++) for (let x = 0; x < isl.grid.w; x++) if (isl.buildable[y][x]) { const c = Iso.diamond(x, y); d += 'M' + c.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z'; }
    return '<path class="gridlines" d="' + d + '" fill="none" stroke="#ffffff" stroke-width="1" opacity=".22"/>';
  };
  Art.footprint = function (cells, ok) {
    const col = ok ? '#5dff8a' : '#ff5a6a';
    return '<g class="fp ' + (ok ? 'ok' : 'bad') + '">' + cells.map(([x, y]) => poly(Iso.diamond(x, y), col, ' opacity=".45" stroke="' + col + '" stroke-width="1.5"')).join('') + '</g>';
  };

  /* ================= backdrops (screen space, behind the island) ================= */
  // Voxel sky: stepped clouds, distant floating islands built from blocks, the sea (or cloud sea) far below.
  const stars = (n, seed, h) => [...Array(n)].map((_, i) => '<rect x="' + f1(hash(i, 1, seed) * 1000) + '" y="' + f1(hash(i, 2, seed) * (h || 260)) + '" width="' + f1(1.5 + hash(i, 3, seed) * 2) + '" height="' + f1(1.5 + hash(i, 3, seed) * 2) + '" fill="#fff" opacity="' + f1(0.4 + hash(i, 4, seed) * 0.6) + '"' + (i % 4 === 0 ? ' class="twk" style="animation-delay:' + (Math.round(hash(i, 5, seed) * 8) / 2).toFixed(1) + 's"' : '') + '/>').join('');
  const vcloud = (x, y, s, op, cls, col) => { col = col || '#fff'; return '<g class="' + (cls || 'cl') + '"><g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" opacity="' + op + '"><rect x="-60" y="-8" width="128" height="16" fill="' + col + '"/><rect x="-40" y="-20" width="56" height="14" fill="' + col + '"/><rect x="4" y="-28" width="40" height="22" fill="' + col + '"/><rect x="-60" y="6" width="128" height="4" fill="#000" opacity=".06"/></g></g>'; };
  // a small block island seen far away: grass slab, earth and stone steps narrowing downward, optional tree
  const farIsle = (x, y, s, top, side, low, tree) => {
    let g = '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">';
    g += '<path d="M-60 0h120v10h-14v12h-14v12h-14v10h-20v-10h-14v-12h-14v-12h-30z" fill="' + low + '"/><path d="M-60 0h120v10h-14v8h-14v6h-64v-6h-14v-8h-14z" fill="' + side + '"/><rect x="-60" y="-8" width="120" height="10" fill="' + top + '"/><rect x="-60" y="0" width="120" height="3" fill="#000" opacity=".12"/>';
    if (tree) g += '<rect x="-30" y="-24" width="6" height="18" fill="#6a4a2c"/><rect x="-40" y="-40" width="26" height="20" fill="' + tree + '"/><rect x="-34" y="-48" width="14" height="10" fill="' + tree + '"/><rect x="20" y="-18" width="16" height="12" fill="' + tree + '"/>';
    return g + '</g>';
  };
  Art.backdrop = function (iid, st) {
    const fl = (st && st.flags) || {};
    let s = '<svg class="backdrop" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>';
    if (iid === 'starter') {
      s += '<linearGradient id="bk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (fl.r2 ? '#3e3e8e' : '#4f8ee0') + '"/><stop offset=".55" stop-color="' + (fl.r2 ? '#c890c8' : '#9fd0f6') + '"/><stop offset="1" stop-color="#e8f6ff"/></linearGradient>' +
        '<linearGradient id="bk-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4ecf4"/><stop offset=".08" stop-color="#7fd0e8"/><stop offset=".3" stop-color="#3fa6d6"/><stop offset=".62" stop-color="#2580b8"/><stop offset="1" stop-color="#14527f"/></linearGradient><radialGradient id="bk-sun"><stop offset="0" stop-color="#fff6cc" stop-opacity=".95"/><stop offset="1" stop-color="#fff6cc" stop-opacity="0"/></radialGradient>' +
        // Phase 4 water: the sun's path on the sea, shallow turquoise shelves, and three bands of moving voxel waves
        '<radialGradient id="bk-sunpath"><stop offset="0" stop-color="#fff2c8" stop-opacity=".42"/><stop offset=".5" stop-color="#ffe7b0" stop-opacity=".16"/><stop offset="1" stop-color="#ffe7b0" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="bk-shelf"><stop offset="0" stop-color="#6fe0dc" stop-opacity=".55"/><stop offset=".7" stop-color="#4cc4d8" stop-opacity=".2"/><stop offset="1" stop-color="#4cc4d8" stop-opacity="0"/></radialGradient>' +
        '</defs>';
      s += '<rect width="1000" height="500" fill="url(#bk-sky)"/>' + circ(820, 80, 90, 'url(#bk-sun)') + '<rect x="796" y="56" width="48" height="48" fill="#fff8d8"/>';
      if (fl.r1) s += '<g class="aurora">' + path('M0 60q250-60 500-10t500-30v70q-250 40-500-10T0 120z', '#7affc8', ' opacity=".14"') + path('M0 90q250-40 500 0t500-20v50q-250 30-500-10T0 140z', '#ff9ee0', ' opacity=".12"') + '</g>';
      s += vcloud(160, 70, 1, 0.8, 'cl c1') + vcloud(620, 46, 0.8, 0.65, 'cl c2') + vcloud(900, 150, 0.6, 0.55, 'cl c3');
      // the sea far below, with a misty horizon
      s += '<rect y="230" width="1000" height="270" fill="url(#bk-sea)"/><rect y="226" width="1000" height="10" fill="#e8f6ff" opacity=".8"/>';
      // Phase 4: shallow turquoise water over sunken shelves, the clouds mirrored faintly, the sun's glittering path,
      // and wave rows that drift with the wind (each row moves at its own pace; still when the island rests)
      s += '<ellipse cx="170" cy="330" rx="210" ry="40" fill="url(#bk-shelf)"/><ellipse cx="640" cy="420" rx="260" ry="55" fill="url(#bk-shelf)" opacity=".7"/><ellipse cx="930" cy="300" rx="150" ry="28" fill="url(#bk-shelf)" opacity=".8"/>';
      s += '<g opacity=".14"><rect x="96" y="246" width="128" height="6" fill="#fff"/><rect x="116" y="252" width="56" height="4" fill="#fff"/><rect x="572" y="242" width="102" height="5" fill="#fff"/><rect x="866" y="262" width="77" height="4" fill="#fff"/></g>';
      s += '<ellipse cx="820" cy="300" rx="46" ry="72" fill="url(#bk-sunpath)"/><ellipse cx="820" cy="246" rx="70" ry="14" fill="url(#bk-sunpath)"/>';
      // each row: scattered crests (light) with a trough shadow under them, longer and thicker nearer the viewer; the
      // pattern repeats every 250 units so the row can loop seamlessly as it drifts
      const waveRow = (k, y0, y1, n) => { let r = ''; for (let i = 0; i < n; i++) { const y = y0 + Math.pow(hash(i, k, 66), 0.9) * (y1 - y0), d = (y - 230) / 270, x = hash(i, k, 67) * 250, w = Math.round(5 + d * 22 + hash(i, k, 68) * (6 + d * 12)), h = 1 + Math.round(d * 2), op = 0.25 + hash(i, k, 69) * 0.35;
          for (let rep = -1; rep < 5; rep++) { const xx = x + rep * 250; r += '<rect x="' + f1(xx) + '" y="' + f1(y) + '" width="' + w + '" height="' + h + '" fill="#e6f8ff" opacity="' + f1(op) + '"/><rect x="' + f1(xx + w * 0.2) + '" y="' + f1(y + h) + '" width="' + Math.round(w * 0.7) + '" height="' + h + '" fill="#0d4a78" opacity="' + f1(op * 0.45) + '"/>'; } } return r; };
      s += '<g class="sea-waves">' + [[0, 240, 300, 22], [1, 300, 390, 16], [2, 390, 500, 12]].map(([k, y0, y1, n]) => '<g class="wv wv' + k + '">' + waveRow(k, y0, y1, n) + '</g>').join('') + '</g>';
      s += '<g class="sea-sun">' + [0, 1].map((k) => '<g class="ss ss' + k + '">' + [...Array(14)].map((_, i) => { const y = 238 + Math.pow(hash(i, k, 64), 1.3) * 250, spread = 14 + (y - 232) * 0.2, x = 820 + (hash(i, k, 65) - 0.5) * spread * 2, w = 3 + Math.round((y - 230) / 40) * 2; return '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + w + '" height="2" fill="#fffbe8"/>'; }).join('') + '</g>').join('') + '</g>';
      // Phase 1.2: layered depth over the sea: a low cloud bank on the horizon, two bands of mist, and pixel glints
      // that twinkle on the water in three staggered sets (paused with the rest of the island when it is still)
      s += '<g class="sea-deep">' + vcloud(80, 226, 1.4, 0.55, 'cl c2') + vcloud(470, 222, 1.1, 0.5, 'cl c3') + vcloud(980, 228, 1.5, 0.5, 'cl c1') + '</g>' +
        '<rect y="236" width="1000" height="16" fill="#e8f6ff" opacity=".35"/><rect y="252" width="1000" height="22" fill="#cfeefa" opacity=".18"/>' +
        '<g class="sea-glint">' + [0, 1, 2].map((k) => '<g class="sg sg' + k + '">' + [...Array(16)].map((_, i) => { const x = hash(i, k, 61) * 1000, y = 262 + Math.pow(hash(i, k, 62), 1.4) * 230, w = 4 + Math.round(y / 60) * 2; return '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + w + '" height="2" fill="#f2fbff"/>'; }).join('') + '</g>').join('') + '</g>';
      // the Dormant Spire on its own distant floating rock
      const on = !!fl.r2;
      s += '<g transform="translate(540 168)">' + farIsle(0, 18, 0.55, '#8fd46a', '#9a7a5a', '#7e7a85') + '<g class="spire' + (on ? ' awake' : '') + '">' + (on ? circ(0, -70, 70, 'url(#bk-sun)') + stroke('M-6 -70L-60 -170M6 -70L60 -170M0 -70V-180', '#fff6c0', 2.5, ' opacity=".5"') : '') +
        path('M-14 14V-40h4v-20h4v-20h4v-14h4v14h4v20h4v20h4v54z', on ? '#dcd6f4' : '#8a90a8') + path('M2 14V-40h4v-20h4v-20h-4v-14h-4v14h-4z', on ? '#b8b0dc' : '#717895') + '<rect x="-3" y="-60" width="6" height="8" fill="' + (on ? '#fff6c0' : '#5a6078') + '"/></g></g>';
      // other islands floating at the horizon hint at what lies beyond
      s += '<g class="fi">' + farIsle(120, 206, 0.6, '#5fbf62', '#7a5a3c', '#5e5a62', '#3f9a4a') + farIsle(890, 200, 0.5, '#6c5a86', '#4a3e5a', '#2a2236') + '<g class="drift-far">' + farIsle(330, 120, 0.38, '#c0c8f4', '#8a88b8', '#5d5a9a') + '</g>' + farIsle(720, 250, 0.3, '#7fd35a', '#9a6a3f', '#7e7a75', '#4fae3c') + '</g>';
      if (fl.r2) s += '<g transform="translate(120 96)"><g class="float">' + farIsle(0, 0, 0.5, '#8fdc78', '#8c6a48', '#6c6a72', '#6fcf6a') + '</g></g>';
    } else if (iid === 'verdant') {
      s += '<linearGradient id="bk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fa0b8"/><stop offset=".55" stop-color="#a8f0d8"/><stop offset="1" stop-color="#f4ffe0"/></linearGradient><linearGradient id="bk-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fe8dc"/><stop offset=".3" stop-color="#40c8c0"/><stop offset="1" stop-color="#0f7d8c"/></linearGradient></defs>';
      s += '<rect width="1000" height="500" fill="url(#bk-sky)"/>' + vcloud(240, 60, 0.9, 0.65, 'cl c1') + vcloud(760, 90, 0.7, 0.55, 'cl c2');
      // stepped jungle mountains with waterfalls
      s += path('M0 220V150h60v-40h40v30h50v-60h40v40h60v-20h40v-40h50v50h40v30h60v-50h50v-30h40v60h50v-20h60v-40h40v50h50v-30h50v50h80V220z', '#4f9f84', ' opacity=".6"');
      [[232, 90], [562, 100], [902, 90]].forEach(([x, y]) => { s += '<rect class="fall" x="' + (x - 4) + '" y="' + y + '" width="8" height="' + (226 - y) + '" fill="#e8fffa" opacity=".75"/>'; });
      s += path('M0 230V190h50v-30h40v20h60v-40h50v30h60v-20h40v30h50v-40h60v40h50v-30h40v40h60v-50h40v40h60v-20h50v30h70v-30h60v40h40V230z', '#2f7a5c', ' opacity=".85"');
      s += '<rect y="228" width="1000" height="272" fill="url(#bk-sea)"/><rect y="224" width="1000" height="8" fill="#e8fff4" opacity=".7"/>';
      s += farIsle(140, 210, 0.45, '#3fae55', '#6e5236', '#4c5a52', '#2f9a4f') + farIsle(840, 236, 0.35, '#3fae55', '#6e5236', '#4c5a52');
      s += [...Array(12)].map((_, i) => '<rect class="ff" x="' + f1(hash(i, 7, 9) * 1000) + '" y="' + f1(120 + hash(i, 8, 9) * 80) + '" width="3" height="3" fill="#e8ff9a" style="animation-delay:' + i * 0.5 + 's"/>').join('');
    } else if (iid === 'obsidian') {
      s += '<linearGradient id="bk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1030"/><stop offset=".55" stop-color="#5a2a6e"/><stop offset="1" stop-color="#d0587e"/></linearGradient><linearGradient id="bk-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a2a6a"/><stop offset=".3" stop-color="#4a2060"/><stop offset="1" stop-color="#140a1e"/></linearGradient><radialGradient id="bk-glow"><stop offset="0" stop-color="#ff7a4a" stop-opacity=".9"/><stop offset="1" stop-color="#ff7a4a" stop-opacity="0"/></radialGradient></defs>';
      s += '<rect width="1000" height="500" fill="url(#bk-sky)"/>' + stars(40, 3, 160);
      // distant stepped volcano with a glow, dark ridges
      s += circ(700, 120, 90, 'url(#bk-glow)') + path('M520 222V200h30v-20h30v-20h30v-20h30v-14h20v6h20v-6h20v14h30v20h30v20h30v20h30v22z', '#241632') + '<rect x="684" y="126" width="12" height="20" fill="#ff8a4a" opacity=".85"/><rect x="690" y="146" width="6" height="18" fill="#ff8a4a" opacity=".6"/>';
      s += path('M0 226V170h60v-20h50v30h60v-40h60v50h60v-20h60v30h60v26z', '#2a1a3a') + path('M820 226v-40h50v-20h60v20h70v40z', '#2a1a3a');
      s += '<rect y="226" width="1000" height="274" fill="url(#bk-sea)"/>';
      s += farIsle(150, 236, 0.4, '#4a3f5c', '#3a2f45', '#221a2c') + farIsle(880, 200, 0.32, '#4a3f5c', '#3a2f45', '#221a2c');
      s += [...Array(14)].map((_, i) => '<rect class="ember" x="' + f1(hash(i, 11, 4) * 1000) + '" y="' + f1(220 + hash(i, 12, 4) * 260) + '" width="3" height="3" fill="#ff9a5a" style="animation-delay:' + f1(i * 0.45) + 's"/>').join('');
    } else {
      s += '<linearGradient id="bk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1234"/><stop offset=".6" stop-color="#3a3a8a"/><stop offset="1" stop-color="#b8a8e8"/></linearGradient><radialGradient id="bk-moon"><stop offset="0" stop-color="#fffbe8" stop-opacity=".9"/><stop offset="1" stop-color="#fffbe8" stop-opacity="0"/></radialGradient></defs>';
      s += '<rect width="1000" height="500" fill="url(#bk-sky)"/>' + stars(90, 8, 330) + circ(170, 90, 70, 'url(#bk-moon)') + '<rect x="148" y="68" width="44" height="44" fill="#fffbe8"/><rect x="164" y="74" width="24" height="24" fill="#2a2a6a" opacity=".3"/>';
      s += '<g class="aurora">' + path('M0 80q250-50 500 0t500-30v60q-250 40-500 0T0 130z', '#c8a8ff', ' opacity=".16"') + path('M0 120q250-30 500 10t500-20v40q-250 30-500-10T0 150z', '#8fe6ff', ' opacity=".12"') + '</g>';
      s += '<g class="drift-far">' + farIsle(820, 170, 0.45, '#98b0ee', '#c8c0ec', '#5d5a9a') + farIsle(560, 120, 0.28, '#98b0ee', '#c8c0ec', '#5d5a9a') + '</g>';
      // a sea of clouds far below
      s += '<rect y="270" width="1000" height="230" fill="#c8c4f0"/>' + [...Array(9)].map((_, i) => vcloud(i * 125 - 20, 276 + (i % 2) * 18, 1.6, 0.95, 'cl c' + ((i % 3) + 1))).join('') + [...Array(7)].map((_, i) => vcloud(i * 160 + 40, 366 + (i % 2) * 30, 2, 0.9, 'cl c' + ((i % 3) + 1), '#e8e4ff')).join('');
    }
    s += '</svg>';
    return s;
  };

  /* ================= sprites: shared pieces ================= */
  // Materials shared by every building, so the whole island reads as one construction kit.
  const M = { st: '#a6a199', st2: '#8f8a83', std: '#76716b', wd: '#a8723f', wd2: '#875a33', gd: '#f2c045', gd2: '#c9962a', bl: '#3a86e0', bl2: '#2f6fc4', cr: '#f2e6c4', moss: '#5fae3f', moss2: '#4c9a33', glow: '#ffe9a0', fire: '#ffb02a' };
  Art.M = M;
  // Stone plinth under a building: a masonry slab on the footprint (slightly inset).
  const plinth = (w, h, hgt, col, seed) => sbox(-w / 2 + 0.06, -h / 2 + 0.06, 0, w - 0.12, h - 0.12, hgt || 8, col || M.st2, 'stone', seed || 1);
  // An octagonal-ish column: a core with four side slabs (chamfered corners), drawn back to front.
  function vcol(cu, cv, z, r, c, h, col, kind, seed) {
    // kind 'none': plain blocks; 'band': sides only (a trim ring around something taller)
    const i = r - c, bx = kind === 'none' || kind === 'band' ? (a, b, cc, d, e, f2, gc) => vbox(a, b, cc, d, e, f2, gc, kind === 'band' ? { noT: true } : null) : (a, b, cc, d, e, f2, gc, k) => sbox(a, b, cc, d, e, f2, gc, kind || 'stone', k);
    return bx(cu - r, cv - i, z, c, i * 2, h, col, seed) + bx(cu - i, cv - r, z, i * 2, c, h, col, seed + 1) + bx(cu - i, cv - i, z, i * 2, i * 2, h, col, seed + 2) +
      bx(cu + i, cv - i, z, c, i * 2, h, col, seed + 3) + bx(cu - i, cv + i, z, i * 2, c, h, col, seed + 4);
  }
  // a ring of blocks with gaps (crenellations, crowns, nests) around (cu, cv) of half-size r
  function vring(cu, cv, z, r, s, h, col, col2, gaps, half) {
    const parts = [];
    const n = Math.max(2, Math.round((r * 2) / s));
    for (let i = 0; i <= n; i++) {
      const t = -r + (i * (r * 2)) / n;
      [[t, -r], [t, r], [-r, t], [r, t]].forEach(([u, v], k) => { if (gaps && (i + k) % 2) return; parts.push([cu + u, cv + v, (i + k) % 2 && col2 ? col2 : col]); });
    }
    const seen = {};
    return parts.filter(([u, v]) => { const key = f1(u) + ',' + f1(v); if (seen[key]) return false; if (half === 'back' && u - cu + v - cv >= 0) return false; if (half === 'front' && u - cu + v - cv < 0) return false; return (seen[key] = true); }).sort((a, b) => a[0] + a[1] - (b[0] + b[1])).map(([u, v, c]) => vc(u, v, z, s, s, h, c)).join('');
  }
  // stepped arch outline on a face, in face coordinates (a along the face, z up)
  const archPts = (a0, a1, z0, zt) => { const w = a1 - a0; return [[a0, z0], [a0, zt - 9], [a0 + w * 0.14, zt - 9], [a0 + w * 0.14, zt - 4], [a0 + w * 0.3, zt - 4], [a0 + w * 0.3, zt], [a1 - w * 0.3, zt], [a1 - w * 0.3, zt - 4], [a1 - w * 0.14, zt - 4], [a1 - w * 0.14, zt - 9], [a1, zt - 9], [a1, z0]]; };
  // a door or window on a face: f = 'v' (face at v = at) or 'u'; a0..a1 along it; frame colour + fill
  function opening(f, at, a0, a1, z0, zt, frame, fill, extra) {
    const on = f === 'v' ? (p) => onV(at, p) : (p) => onU(at, p), w = a1 - a0, k = Math.min(0.05, w * 0.18);
    return poly(on(archPts(a0 - k, a1 + k, z0, zt + 3)), fc(frame, f)) + poly(on(archPts(a0, a1, z0, zt)), fill, extra || '');
  }
  // a square window with a wooden frame and cross mullions
  function window_(f, at, a0, a1, z0, z1, glass) {
    const on = f === 'v' ? (p) => onV(at, p) : (p) => onU(at, p), fr = fc(M.wd2, f), am = (a0 + a1) / 2, zm = (z0 + z1) / 2;
    return poly(on([[a0 - 0.04, z0 - 2], [a1 + 0.04, z0 - 2], [a1 + 0.04, z1 + 2], [a0 - 0.04, z1 + 2]]), fr) + poly(on([[a0, z0], [a1, z0], [a1, z1], [a0, z1]]), glass) +
      poly(on([[am - 0.015, z0], [am + 0.015, z0], [am + 0.015, z1], [am - 0.015, z1]]), fr) + poly(on([[a0, zm - 0.8], [a1, zm - 0.8], [a1, zm + 0.8], [a0, zm + 0.8]]), fr) + poly(on([[a0, z1 - 2.5], [a0 + (a1 - a0) * 0.35, z1 - 2.5], [a0 + (a1 - a0) * 0.35, z1], [a0, z1]]), '#ffffff', ' opacity=".45"');
  }
  // a hanging banner on a face, with a gold border and a small emblem shape
  function banner(f, at, a, w, zt, len, col, emblemPts) {
    const on = f === 'v' ? (p) => onV(at, p) : (p) => onU(at, p);
    const sh2 = (k) => [[a - w / 2 - k, zt + k], [a + w / 2 + k, zt + k], [a + w / 2 + k, zt - len - k], [a, zt - len + 6 - k * 2], [a - w / 2 - k, zt - len - k]];
    let g = poly(on(sh2(0.025)), fc(M.gd, f)) + poly(on(sh2(0)), fc(col, f));
    if (emblemPts) g += poly(on(emblemPts.map(([x, z]) => [a + x * w, zt - len * 0.45 + z])), '#ffffff', ' opacity=".9"');
    return g + poly(on([[a - w / 2 - 0.05, zt + 3], [a + w / 2 + 0.05, zt + 3], [a + w / 2 + 0.05, zt], [a - w / 2 - 0.05, zt]]), fc(M.wd2, f));
  }
  const EGG_MARK = [[0, 7], [0.22, 2], [0.24, -3], [0, -7], [-0.24, -3], [-0.22, 2]];
  function torch(cu, cv, z, s) {
    s = s || 1;
    return vc(cu, cv, z, 0.08 * s, 0.08 * s, 15 * s, M.wd2) + vc(cu, cv, z + 15 * s, 0.15 * s, 0.15 * s, 3, '#5a4a3a') + vc(cu, cv, z + 15 * s + 3, 0.1 * s, 0.1 * s, 6 * s, M.fire, { t: '#ffd25a' }) + vc(cu, cv, z + 15 * s + 3 + 6 * s, 0.05 * s, 0.05 * s, 4 * s, '#fff3a0') +
      circ(pj(cu, cv, z + 22 * s)[0], pj(cu, cv, z + 22 * s)[1], 8 * s, '#ffcf6a', ' opacity=".22"');
  }
  // small scenery blocks used around building bases
  const grassCube = (u, v, z, s) => vc(u, v, z, s, s, s * 26, M.moss, { t: fc('#6cc644', 't') });
  const rockCube = (u, v, z, s) => vc(u, v, z, s, s * 0.8, s * 20, M.st2);
  const flowerCube = (u, v, z, col) => vc(u, v, z, 0.03, 0.03, 4, M.moss2) + vc(u, v, z + 4, 0.08, 0.08, 3, col);
  // tree used by obstacles and scenery (kept for callers of the old API)
  function tree(x, y, s, c1, c2) { return '<g transform="translate(' + f1(x) + ' ' + f1(y) + ')">' + vtree('round', 0, 0, 0, s * 0.6, [c1, sh(c1, -0.12), c2], '#7a5536', Math.round(x * 7 + y)) + '</g>'; }
  Art.tree = tree;

  /* ================= story buildings ================= */
  const B = {};
  // Sunlit Hollow: the caretaker's home. A warm stone chamber under a stepped dome, its glowing hollow framed by a
  // great gateway; moss on the stones, vines down the pillars, flowers in front.
  B.hollow = function (lv, ruined) {
    const warm = '#d9cfb6', warm2 = '#c4b998';
    let g = shadow(3, 3, 0.2) + plinth(3, 3, 8, M.st2, 21);
    if (ruined) {
      g += sbox(-1.2, -1.0, 8, 1.4, 2.0, 26, '#a9a39a', 'stone', 22) + vc(-0.7, -0.3, 34, 0.6, 0.8, 8, '#a9a39a') + vc(-0.9, 0.5, 34, 0.4, 0.4, 5, '#a9a39a');
      g += poly(onU(0.2, archPts(-0.55, 0.55, 8, 32)), '#4c5266');
      g += sbox(0.2, -1.25, 8, 0.5, 0.62, 30, '#8f95a8', 'stone', 23) + vc(0.95, -0.2, 8, 0.4, 0.3, 9, '#7a8096') + vc(0.8, 0.7, 8, 0.3, 0.3, 7, '#7a8096') + vc(1.15, 0.25, 8, 0.25, 0.25, 6, '#9aa2b6');
      g += sbox(0.2, 0.63, 8, 0.5, 0.62, 18, '#8f95a8', 'stone', 24) + grassCube(0.4, 1.2, 8, 0.24) + grassCube(-1.1, 1.1, 8, 0.28);
      g += poly(onU(0.7, [[-1.05, 36], [-0.98, 36], [-0.98, 12], [-1.05, 12]]), fc(M.moss2, 'u')) + poly(onV(1.25, [[0.3, 24], [0.37, 24], [0.37, 12], [0.3, 12]]), fc(M.moss2, 'v'));
      return g;
    }
    const trim = lv >= 3 ? M.gd : '#8e96aa';
    // the chamber and its dome
    g += sbox(-1.2, -1.0, 8, 1.4, 2.0, 40, warm, 'stone', 22);
    g += vstack(-0.5, 0, 48, 1.4, 2.0, [[-0.06, 6, warm2], [0.06, 6, warm], [0.18, 6, warm2], [0.32, 5, warm], [0.46, 4, warm2]]);
    g += vc(-0.85, -0.6, 48, 0.3, 0.5, 4, M.moss) + vc(-0.5, 0.55, 54, 0.4, 0.3, 4, M.moss) + vc(-0.5, 0, 75, 0.2, 0.2, 6, lv >= 3 ? M.gd : warm2) + (lv >= 3 ? vc(-0.5, 0, 81, 0.1, 0.1, 5, '#fff3b0') : '');
    // the glowing hollow on the chamber's front face, and a round window on the side
    g += poly(onU(0.2, archPts(-0.62, 0.62, 8, 46)), '#c9a45a') + poly(onU(0.2, archPts(-0.52, 0.52, 8, 42)), '#ffe7a8') + poly(onU(0.2, archPts(-0.3, 0.3, 8, 34)), '#fff6d8');
    g += window_('v', 1.0, -0.95, -0.6, 24, 36, lv >= 2 ? '#ffe680' : '#cfe6ff');
    // gateway: right pillar, lintel with corbels, left pillar
    g += sbox(0.2, -1.25, 8, 0.5, 0.62, 56, '#aab2c4', 'stone', 25);
    g += sbox(0.2, -0.63, 48, 0.5, 1.26, 12, '#aab2c4', 'stone', 27) + vbox(0.2, -0.63, 40, 0.5, 0.16, 8, '#9aa2b6') + vbox(0.2, 0.47, 40, 0.5, 0.16, 8, '#9aa2b6');
    g += sbox(0.2, 0.63, 8, 0.5, 0.62, 56, '#aab2c4', 'stone', 26);
    g += vbox(0.14, -1.32, 64, 0.62, 2.64, 4, trim) + vbox(0.24, -0.9, 68, 0.42, 1.8, 6, '#9aa2b6') + vc(0.45, 0, 74, 0.3, 0.44, 7, trim);
    g += vc(0.4, -1.0, 68, 0.3, 0.4, 4, M.moss) + vc(0.45, 0.95, 68, 0.3, 0.32, 4, M.moss);
    g += poly(onU(0.7, [[-1.15, 60], [-1.08, 60], [-1.08, 24], [-1.15, 24]]), fc(M.moss2, 'u')) + poly(onU(0.7, [[0.95, 60], [1.02, 60], [1.02, 34], [0.95, 34]]), fc(M.moss2, 'u')) + poly(onV(1.25, [[0.3, 62], [0.37, 62], [0.37, 30], [0.3, 30]]), fc(M.moss2, 'v'));
    // flowers and grass at the gate
    [[0.95, -0.9, '#ff9ec7'], [1.05, -0.45, '#ffd86b'], [0.95, 0.55, '#ffffff'], [1.15, 0.95, '#b4a0ff'], [1.25, 0.15, '#ff9ec7'], [-0.9, 1.25, '#ffd86b'], [1.3, -1.2, '#ff8a6a']].forEach(([u, v, c]) => { g += flowerCube(u, v, 8, c); });
    g += grassCube(1.25, -0.7, 8, 0.24) + grassCube(-1.25, 1.2, 8, 0.22);
    if (lv >= 2) g += circ(pj(0.2, 0, 26)[0], pj(0.2, 0, 26)[1], 18, '#fff6cc', ' opacity=".45"');
    if (lv >= 4) g += vc(0.45, 0, 81, 0.05, 0.05, 26, M.wd2) + poly(onV(0.03 + 0, [[0.47, 106], [0.85, 100], [0.47, 94]]), M.gd);
    return g;
  };
  // Tide Gate: a water gate over a stone basin, a sheet of water falling between two towers.
  B.tidegate = function (lv, ruined) {
    let g = shadow(3, 2, 0.2) + sbox(-1.42, -0.92, 0, 2.84, 1.84, 9, '#b7c4cf', 'stone', 31);
    g += poly(quadT(9.2, -1.18, -0.68, 1.18, 0.68), '#4cc0e0') + poly(quadT(9.3, -1.0, -0.5, 1.0, 0.5), '#5fd0ee');
    g += stroke('M' + P([pj(-0.8, 0.3, 9.4), pj(-0.4, 0.3, 9.4)]).replace(' ', 'L'), '#e8fbff', 1.6) + stroke('M' + P([pj(0.3, -0.2, 9.4), pj(0.7, -0.2, 9.4)]).replace(' ', 'L'), '#e8fbff', 1.6);
    if (ruined) {
      g += sbox(-1.3, -0.3, 9, 0.5, 0.6, 30, '#8590a4', 'stone', 32) + sbox(0.8, -0.3, 9, 0.5, 0.6, 18, '#8590a4', 'stone', 33) + vc(0.1, 0.35, 9, 0.4, 0.3, 7, '#737b92') + vc(-0.3, -0.4, 9, 0.3, 0.3, 6, '#737b92');
      return g + flowerCube(-0.6, 0.75, 9, '#f0d0a0') + flowerCube(0.9, 0.7, 9, '#ffb0c0');
    }
    const band = lv >= 3 ? M.gd : '#8e98ae';
    g += vcol(-1.05, 0, 9, 0.3, 0.08, 54, '#a4afc2', 'stone', 34);
    g += poly(quadV(0, -0.75, 0.75, 10, 54), '#58b8e8', ' opacity=".7"') + poly(quadV(0, -0.12, 0.12, 10, 54), '#d8f4ff', ' opacity=".55" class="ripple"');
    g += vcol(1.05, 0, 9, 0.3, 0.08, 54, '#a4afc2', 'stone', 35);
    g += sbox(-1.4, -0.3, 63, 2.8, 0.6, 10, '#a4afc2', 'stone', 36) + vbox(-1.45, -0.34, 58, 2.9, 0.68, 5, band) + vbox(-0.4, -0.22, 73, 0.8, 0.44, 7, '#8e98ae') + vc(0, 0, 80, 0.2, 0.2, 7, '#5fd0ee');
    g += vc(-1.05, 0, 73, 0.22, 0.22, 6, band) + vc(1.05, 0, 73, 0.22, 0.22, 6, band);
    g += vc(-0.6, 0.66, 9, 0.12, 0.12, 4, '#ffe0b0') + vc(0.7, -0.62, 9, 0.12, 0.12, 4, '#ffb6c8');
    return g;
  };
  // Moon Shrine: four slim pillars under a stepped violet roof, a block moon glowing on top.
  B.moonshrine = function (lv, ruined) {
    let g = shadow(2, 2, 0.2) + plinth(2, 2, 10, '#c7c1e4', 41) + vbox(-0.6, -0.6, 10, 1.2, 1.2, 3, '#b4acd8');
    if (ruined) {
      g += sbox(-0.7, -0.7, 13, 0.24, 0.24, 40, '#8e8aa8', 'stone', 42) + sbox(0.46, -0.7, 13, 0.24, 0.24, 24, '#8e8aa8', 'stone', 43) + sbox(-0.7, 0.46, 13, 0.24, 0.24, 14, '#8e8aa8', 'stone', 44);
      return g + vc(0.3, 0.4, 13, 0.4, 0.2, 6, '#777e94') + vc(0.55, 0.6, 13, 0.2, 0.2, 4, '#777e94') + grassCube(-0.75, 0.75, 10, 0.2);
    }
    [[-0.58, -0.58], [0.58, -0.58]].forEach(([u, v], i) => { g += sbox(u - 0.12, v - 0.12, 13, 0.24, 0.24, 48, '#bcb6dc', 'stone', 45 + i); });
    g += vc(0, 0, 13, 0.5, 0.5, 10, '#9a90d0') + vc(0, 0, 23, 0.26, 0.26, 10, '#d8caff', { t: '#f4ecff' }) + circ(pj(0, 0, 30)[0], pj(0, 0, 30)[1], 14, '#d8caff', ' opacity=".4"');
    [[-0.58, 0.58], [0.58, 0.58]].forEach(([u, v], i) => { g += sbox(u - 0.12, v - 0.12, 13, 0.24, 0.24, 48, '#bcb6dc', 'stone', 47 + i); });
    g += vstack(0, 0, 61, 1.5, 1.5, [[0, 6, '#6c64a8'], [0.12, 7, '#8f88c4'], [0.28, 7, '#7a72b8'], [0.44, 6, '#8f88c4'], [0.6, 5, '#7a72b8']]);
    if (lv >= 3) g += vc(0, 0, 61, 1.54, 1.54, 3, M.gd, { noT: true });
    // the moon: a crescent of blocks facing the viewer
    const mz = 96;
    [[0, 0, 14], [0.12, -0.04, 18], [0.24, 0, 14]].forEach(([du, dz, h]) => { g += vc(-0.12 + du, 0, mz + dz, 0.12, 0.12, h, '#fff6c8'); });
    g += vc(-0.24, 0, mz + 10, 0.12, 0.12, 6, '#fff6c8') + vc(0.36, 0, mz + 10, 0.12, 0.12, 6, '#fff6c8');
    g += circ(pj(0, 0, mz + 10)[0], pj(0, 0, mz + 10)[1], 22, '#ffe9a0', ' opacity=".28" class="glow-soft"');
    return g;
  };
  // Old Hatchery (Reference 3): raised masonry platform, a chamfered central tower crowned by a nest with a great
  // blue egg, two side towers holding red and white eggs, blue-and-gold banners, a carpeted stair and torches.
  B.hatchery = function (lv, ruined) {
    let g = shadow(3, 3, 0.24);
    g += sbox(-1.44, -1.44, 0, 2.88, 2.88, 7, M.std, 'stone', 51) + sbox(-1.32, -1.32, 7, 2.3, 2.64, 10, M.st2, 'stone', 52);
    g += grassCube(-1.25, -1.2, 17, 0.26) + rockCube(-1.2, 1.15, 17, 0.24);
    if (ruined) {
      g += vcol(-0.25, 0, 17, 0.62, 0.18, 22, '#c9c2b0', 'stone', 53) + vc(-0.4, -0.2, 39, 0.5, 0.4, 8, '#bdb5a2') + vc(-0.5, 0.3, 39, 0.3, 0.3, 5, '#bdb5a2');
      g += vc(0.9, -0.85, 17, 0.4, 0.4, 12, '#bdb5a2') + vc(-0.85, 0.95, 17, 0.4, 0.4, 7, '#bdb5a2');
      g += vc(1.1, 0.3, 7, 0.22, 0.18, 6, '#efe6d0') + vc(0.95, 0.75, 7, 0.16, 0.2, 4, '#efe6d0') + vc(1.2, -0.3, 7, 0.14, 0.14, 7, '#efe6d0');
      g += vbox(0.86, -0.3, 7, 0.5, 0.6, 4, M.st2) + poly(onU(0.37, [[-0.25, 36], [-0.2, 36], [-0.2, 18], [-0.25, 18]]), M.moss2) + grassCube(0.3, 1.2, 17, 0.24);
      return g;
    }
    // side towers with eggs in nests: right (v < 0, further back) holds the white egg, left (v > 0) the red one
    const side = (cv, egg, spot, seed) => scb(0.62, cv, 17, 0.62, 0.62, 30, M.st2, 'stone', seed) + vbox(0.29, cv - 0.33, 44, 0.66, 0.66, 3, M.gd) + vring(0.62, cv, 47, 0.26, 0.12, 6, M.wd, M.gd, false, 'back') + vegg(0.62, cv, 49, 0.36, egg, spot) + vring(0.62, cv, 47, 0.26, 0.12, 6, M.wd, M.gd, false, 'front');
    g += side(-0.95, '#f4f4fb', '#7ab8f0', 55) + banner('u', 0.93, -0.95, 0.32, 40, 24, M.bl, EGG_MARK);
    // central tower (chamfered), with a blue band and gold trim
    g += vcol(-0.25, 0, 17, 0.62, 0.18, 50, M.st, 'stone', 54);
    g += vcol(-0.25, 0, 46, 0.64, 0.18, 6, M.bl, 'band') + vcol(-0.25, 0, 52, 0.64, 0.18, 3, M.gd, 'band');
    // the entrance on the +u face: gold frame, glowing hearth
    g += opening('u', 0.37, -0.22, 0.22, 17, 42, M.gd, '#ffb347') + poly(onU(0.37, archPts(-0.14, 0.14, 17, 36)), '#ffd86b') + poly(onU(0.37, [[-0.08, 17], [0.08, 17], [0.08, 28], [-0.08, 28]]), '#fff3c0');
    // crown nest and the great blue egg
    g += vc(-0.25, 0, 67, 0.9, 0.9, 3, M.wd2) + vring(-0.25, 0, 70, 0.42, 0.16, 8, M.wd, M.gd, false, 'back');
    g += vegg(-0.25, 0, 70, 0.62, '#3a8ee8', '#f2c045');
    g += vring(-0.25, 0, 70, 0.42, 0.16, 8, M.wd, M.gd, false, 'front');
    if (lv >= 2) [[-0.71, -0.46], [0.21, -0.46], [-0.71, 0.46], [0.21, 0.46]].forEach(([u, v]) => { g += vc(u, v, 78, 0.1, 0.1, 9, M.gd); });
    // stair with a blue carpet up to the doorway, torches either side
    g += torch(1.1, -0.48, 7);
    const st = [[0.37, 10], [0.6, 7], [0.83, 4]];
    st.forEach(([u0, h], i) => { g += sbox(u0, -0.3, 7, 0.23, 0.6, h, M.std, 'stone', 60 + i) + poly(quadT(7 + h + 0.2, u0, -0.17, u0 + 0.23, 0.17), M.bl) + poly(quadU(u0 + 0.23, -0.17, 0.17, 7 + h - 0.2, 7 + h - 3), fc(M.bl2, 'u')) + poly(quadT(7 + h + 0.3, u0, -0.2, u0 + 0.23, -0.17), M.gd) + poly(quadT(7 + h + 0.3, u0, 0.17, u0 + 0.23, 0.2), M.gd); });
    g += vbox(1.06, -0.3, 0, 0.3, 0.6, 7, M.std) + poly(quadT(7.2, 1.06, -0.17, 1.36, 0.17), M.bl);
    g += torch(1.1, 0.48, 7) + side(0.95, '#e8443a', '#ffffff', 56) + banner('v', 1.26, 0.62, 0.32, 40, 24, M.bl, EGG_MARK);
    // a wooden egg crate and a fence by the front corner
    g += sbox(1.0, 0.86, 0, 0.38, 0.38, 13, M.wd, 'plank', 57) + poly(onU(1.38, EGG_MARK.map(([x, z]) => [1.05 + x * 0.25, 7 + z * 0.7])), '#ffffff', ' opacity=".85"');
    g += vc(-1.2, 1.36, 0, 0.08, 0.08, 14, M.wd2) + vc(-0.6, 1.36, 0, 0.08, 0.08, 14, M.wd2) + vbox(-1.24, 1.32, 9, 0.68, 0.06, 3, M.wd);
    return g;
  };
  // Reliquary Gate: a mossy stepped rock mound with a great carved door.
  B.reliquarygate = function (lv, ruined) {
    let g = shadow(3, 3, 0.24);
    g += sbox(-1.45, -1.45, 0, 2.9, 2.9, 16, '#7c8a6a', 'stone', 71) + sbox(-1.3, -1.25, 16, 2.4, 2.5, 18, '#86947a', 'stone', 72) + sbox(-1.15, -1.0, 34, 1.9, 2.0, 18, '#7c8a6a', 'stone', 73);
    g += sbox(-0.95, -0.7, 52, 1.4, 1.4, 16, '#86947a', 'stone', 74) + vc(-0.35, -0.05, 68, 0.7, 0.8, 12, '#7c8a6a') + vc(-0.4, 0, 80, 0.3, 0.3, 8, '#6c7a60');
    // moss blankets on the steps
    g += vbox(-1.3, -1.25, 34, 0.9, 0.7, 2, M.moss) + vbox(-1.15, 0.3, 52, 0.7, 0.7, 2, M.moss) + vbox(-0.9, -0.7, 68, 0.6, 0.5, 2, M.moss2) + vc(-0.6, 0.1, 80, 0.3, 0.3, 3, M.moss);
    // the door: carved into the +u face of the lower steps
    g += sbox(0.75, -0.5, 0, 0.7, 1.0, 50, '#6a7660', 'stone', 75) + vbox(0.75, -0.55, 50, 0.72, 1.1, 6, '#5c6852');
    g += opening('u', 1.45, -0.34, 0.34, 0, 42, '#4a5640', ruined ? '#2e3a2c' : '#ffe9a8');
    if (ruined) g += stroke('M' + P([pj(1.46, -0.34, 4), pj(1.46, 0.34, 38)]).replace(' ', 'L') + 'M' + P([pj(1.46, 0.34, 4), pj(1.46, -0.34, 38)]).replace(' ', 'L'), '#3a8a44', 4) + vc(1.35, 0.42, 0, 0.12, 0.12, 8, '#58b85a') + vc(1.35, -0.45, 20, 0.1, 0.1, 6, '#58b85a');
    else g += poly(onU(1.45, archPts(-0.22, 0.22, 0, 32)), '#fff6c8', ' opacity=".8"') + vbox(1.45, -0.34, 0, 0.12, 0.68, 2, '#fff3b0') + flowerCube(1.3, 0.6, 0, '#ff9ec7') + flowerCube(1.3, -0.62, 0, '#ff9ec7');
    g += vc(1.1, 0, 56, 0.2, 0.2, 7, '#6c7a60') + (ruined ? '' : vc(1.1, 0, 63, 0.1, 0.1, 5, '#b8e69a'));
    return g;
  };

  /* ================= catalog buildings ================= */
  // Berry Farm: tilled soil in a wooden frame, rows of berry bushes, fence posts and a scarecrow (3 x 2; rotates).
  B.farm = function (lv) {
    let g = shadow(3, 2, 0.14) + sbox(-1.45, -0.95, 0, 2.9, 1.9, 4, M.wd2, 'plank', 81) + vbox(-1.35, -0.85, 4, 2.7, 1.7, 1, '#7a4c2a', { t: '#8a5a34' });
    const berry = lv >= 3 ? '#7a4adf' : '#e8344a';
    for (let i = 0; i < 4; i++) { const v = -0.62 + i * 0.42; g += poly(quadT(5.2, -1.3, v - 0.08, 1.3, v + 0.08), '#6a4026'); }
    g += vc(-1.4, -0.9, 0, 0.08, 0.08, 14, M.wd) + vc(1.4, -0.9, 0, 0.08, 0.08, 14, M.wd) + vc(-1.4, 0.9, 0, 0.08, 0.08, 14, M.wd);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) {
      const u = -1.12 + j * 0.45, v = -0.62 + i * 0.42;
      g += vc(u, v, 5, 0.24, 0.2, 7, '#3f9a4a', { t: '#55b85e' }) + vc(u - 0.03, v - 0.02, 12, 0.14, 0.12, 4, '#4fae55') + vc(u + 0.06, v + 0.07, 8, 0.06, 0.06, 3, berry) + vc(u - 0.07, v + 0.06, 10, 0.05, 0.05, 3, berry);
    }
    g += vc(1.4, 0.9, 0, 0.08, 0.08, 14, M.wd);
    g += vc(1.25, -0.72, 4, 0.05, 0.05, 30, '#7a5532') + vc(1.25, -0.72, 22, 0.05, 0.42, 3, '#7a5532') + vc(1.25, -0.72, 34, 0.14, 0.14, 9, '#f2d08a') + vstack(1.25, -0.72, 43, 0.2, 0.2, [[0, 2, '#c0583a'], [0.05, 3, '#c0583a']]);
    return g;
  };
  // Glimmer Mine: a stepped rock outcrop with a timber-framed entrance, rails and a cart of gold.
  B.mine = function (lv) {
    let g = shadow(2, 2, 0.2);
    g += sbox(-0.95, -0.95, 0, 1.9, 1.9, 18, '#9a8a78', 'stone', 91) + sbox(-0.95, -0.85, 18, 1.4, 1.6, 18, '#a8988a', 'stone', 92) + sbox(-0.9, -0.6, 36, 1.0, 1.1, 14, '#9a8a78', 'stone', 93) + vc(-0.55, -0.1, 50, 0.4, 0.5, 8, '#8a7a6a');
    // crystals poking out of the rock
    g += vc(-0.6, -0.75, 36, 0.1, 0.1, 10, '#9adfff', { t: '#d8f6ff' }) + vc(-0.2, -0.5, 50, 0.08, 0.08, 9, M.gd) + vc(-0.85, 0.5, 18, 0.1, 0.1, 8, '#ffe27a');
    // timber frame and dark entrance on the +u face
    g += poly(onU(0.95, [[-0.3, 0], [0.3, 0], [0.3, 26], [-0.3, 26]]), '#2a2230');
    g += vbox(0.95, -0.42, 0, 0.1, 0.1, 30, '#8a5a30') + vbox(0.95, 0.32, 0, 0.1, 0.1, 30, '#8a5a30') + vbox(0.95, -0.44, 28, 0.12, 0.88, 6, '#9a6a3a');
    // rails and the ore cart
    g += poly(quadT(0.6, 0.95, -0.2, 1.48, -0.16), '#5a5a6a') + poly(quadT(0.6, 0.95, 0.16, 1.48, 0.2), '#5a5a6a');
    g += vbox(1.0, -0.22, 2, 0.4, 0.44, 10, '#6a6a7a') + vc(1.2, 0, 12, 0.34, 0.36, 4, '#ffd23a') + vc(1.15, -0.05, 16, 0.14, 0.14, 4, '#ffe27a') + vc(1.28, 0.1, 15, 0.1, 0.1, 3, '#ffc21a');
    if (lv >= 3) g += torch(0.9, 0.62, 0, 0.9);
    return g;
  };
  // Forge (Dev 7): a squat brick smithy with a tall chimney and a glowing furnace mouth on the +u face, an anvil and a
  // weapon rack on the forecourt, a slate roof. Ruined: cold, roofless walls and a fallen chimney.
  // Levels: 2 bellows and a second rack, 3 a gold-trimmed chimney crown and banner. No animation (static sprite).
  const ANVIL_MARK = [[-0.32, 3], [0.32, 3], [0.2, 0], [0.08, -1], [0.08, -5], [0.26, -7], [-0.26, -7], [-0.08, -5], [-0.08, -1], [-0.2, 0]];
  B.forge = function (lv, ruined) {
    const BR = '#8a5a44', BR2 = '#6e4636', SL = '#4a4658', SL2 = '#3a3646', IR = '#4a4c58', IR2 = '#33343e';
    let g = shadow(3, 3, 0.24) + plinth(3, 3, 6, '#7f7a72', 71);
    if (ruined) {
      g += sbox(-1.3, -1.3, 6, 1.5, 2.5, 16, BR2, 'brick', 72) + sbox(-1.3, -1.3, 6, 0.55, 0.55, 28, '#7a6a62', 'brick', 73);
      g += vc(0.5, 0.9, 6, 0.5, 0.35, 5, '#7a6a62') + vc(0.95, 0.6, 6, 0.3, 0.3, 4, '#6a5a52') + vc(0.7, -0.5, 6, 0.42, 0.24, 7, IR2);
      g += poly(onU(0.2, [[-0.2, 6], [0.25, 6], [0.25, 16], [-0.2, 16]]), '#2a2026') + grassCube(-0.6, 1.1, 6, 0.26) + rockCube(0.9, -1.0, 6, 0.24) + grassCube(-1.1, 0.4, 22, 0.22);
      return g;
    }
    // workshop: brick walls, stepped slate roof
    g += sbox(-1.3, -1.3, 6, 1.55, 2.6, 26, BR, 'brick', 74);
    [[0, 2.6, 0], [5, 2.3, 0.15], [10, 1.9, 0.35], [15, 1.4, 0.6]].forEach(([dz, w, i]) => { g += vbox(-1.36 + i * 0.4, -1.36 + i, 32 + dz, 1.67 - i * 0.8, w + 0.12, 5, dz ? SL : SL2); });
    // chimney with a glowing top
    g += sbox(-1.25, -1.25, 32, 0.6, 0.6, 44, '#9a7a68', 'brick', 75) + vbox(-1.3, -1.3, 76, 0.7, 0.7, 4, lv >= 3 ? M.gd : IR);
    g += poly(quadT(80.2, -1.18, -1.18, -0.72, -0.72), '#ff7a2a') + poly(quadT(80.4, -1.08, -1.08, -0.82, -0.82), '#ffd25a');
    g += circ(pj(-0.95, -0.95, 86)[0], pj(-0.95, -0.95, 86)[1], 9, '#ffb04a', ' opacity=".25"');
    // furnace mouth on the front (+u) face, iron frame, coals
    g += opening('u', 0.25, -0.75, -0.05, 6, 24, IR, '#ff8a2a') + poly(onU(0.25, archPts(-0.62, -0.18, 6, 16)), '#ffd25a') + poly(onU(0.25, [[-0.55, 6], [-0.25, 6], [-0.25, 10], [-0.55, 10]]), '#fff1a0');
    // doorway and a shuttered window on the long (+v) face
    g += opening('v', 1.3, -0.55, -0.15, 6, 26, M.wd2, '#2a2026') + window_('v', 1.3, -1.05, -0.8, 14, 24, '#ffcf7a');
    g += banner('u', 0.25, 0.75, 0.32, 30, 18, '#c0392b', ANVIL_MARK);
    // forecourt: anvil on a stump, quench barrel, weapon rack
    g += vc(0.85, -0.55, 6, 0.3, 0.3, 7, M.wd2) + vbox(0.66, -0.68, 13, 0.4, 0.26, 3, IR2) + vbox(0.72, -0.62, 16, 0.3, 0.14, 4, IR) + vbox(0.62, -0.6, 16, 0.12, 0.1, 2, IR);
    g += vc(1.05, 0.2, 6, 0.32, 0.32, 10, '#7a5030') + poly(quadT(16.2, 0.92, 0.07, 1.18, 0.33), '#3a7ac8');
    const rack = (cv) => vc(0.55, cv, 6, 0.06, 0.06, 18, M.wd2) + vc(0.55, cv + 0.4, 6, 0.06, 0.06, 18, M.wd2) + vbox(0.52, cv - 0.03, 20, 0.08, 0.48, 2, M.wd) +
      vc(0.6, cv + 0.12, 6, 0.04, 0.04, 22, '#c8d0dc') + vc(0.6, cv + 0.28, 6, 0.04, 0.04, 19, '#d8c070');
    g += rack(0.75);
    if (lv >= 2) g += rack(-1.2) + vbox(-0.05, 0.95, 6, 0.4, 0.3, 6, '#6a4630') + vbox(0.0, 1.0, 12, 0.3, 0.2, 2, IR);
    g += torch(1.2, 1.15, 6, 0.8);
    return g;
  };
  // Habitats: a stone cottage with a stepped dome roof in element colours; each element has its own silhouette
  // feature (fire chimney, water pool, wind vane, rock buttresses, sun spire, moon tower, a sapling on the roof).
  // Level visuals (v0.4): 2 front garden, 3 pennant and lit windows, 4 crystal crown, 5 golden trim.
  const HAB_STYLE = {
    nature: { roof: '#4fae55', roof2: '#7ccf6a', wall: '#f2e6c4', accent: '#ff9ec7', emblem: 'leaf' },
    water: { roof: '#3f9ed8', roof2: '#7ccff2', wall: '#e8f6ff', accent: '#ffd0e0', emblem: 'wave' },
    earth: { roof: '#9a7048', roof2: '#c49a68', wall: '#efe0c8', accent: '#8fd06a', emblem: 'rock' },
    fire: { roof: '#d8583a', roof2: '#ff8a5a', wall: '#fff0d8', accent: '#ffd23a', emblem: 'flame' },
    light: { roof: '#f0c040', roof2: '#ffe27a', wall: '#fffbec', accent: '#ffffff', emblem: 'sun' },
    dark: { roof: '#5a4a9a', roof2: '#8a78d0', wall: '#e8e0f8', accent: '#ffe9a0', emblem: 'moon' },
    wind: { roof: '#5ac0b0', roof2: '#9aeee0', wall: '#f4fffc', accent: '#ffffff', emblem: 'feather' },
  };
  // emblems as small block glyphs on a face (pixel shapes: [a, z] offsets in px-ish units)
  const GLYPH = {
    leaf: [[0, 3], [1, 2], [-1, 2], [1, 1], [0, 1], [-1, 1], [0, 0], [1, 0], [-1, -1]],
    wave: [[-2, 1], [-1, 2], [0, 1], [1, 0], [2, 1], [-2, -1], [-1, 0], [1, -2], [2, -1], [0, -1]],
    rock: [[-1, 1], [0, 2], [1, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, -1], [-2, -1], [-1, -1], [0, -1], [1, -1]],
    flame: [[0, 3], [0, 2], [1, 1], [-1, 1], [0, 1], [-1, 0], [0, 0], [1, 0], [0, -1]],
    sun: [[0, 2], [-2, 0], [2, 0], [0, -2], [-1, 1], [0, 1], [1, 1], [-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1], [1, -1]],
    moon: [[-1, 2], [0, 2], [-2, 1], [-2, 0], [-2, -1], [-1, -2], [0, -2], [-1, 1], [-1, 0], [-1, -1]],
    feather: [[1, 2], [0, 1], [1, 1], [-1, 0], [0, 0], [-1, -1], [-2, -2]],
  };
  const glyph = (f, at, a, z, kind, col, px) => { px = px || 0.035; const on = f === 'v' ? (p) => onV(at, p) : (p) => onU(at, p); return '<path d="' + GLYPH[kind].map(([x, y]) => dq(on([[a + x * px, z + y * 3.4], [a + (x + 1) * px, z + y * 3.4], [a + (x + 1) * px, z + y * 3.4 - 3.4], [a + x * px, z + y * 3.4 - 3.4]]))).join('') + '" fill="' + col + '"/>'; };
  B.habitat = function (lv, ruined, b) {
    const el = (D.BUILDINGS[b.type] && D.BUILDINGS[b.type].el) || 'nature', s = HAB_STYLE[el], acc = s.accent === '#ffffff' ? '#ffd86b' : s.accent;
    let g = shadow(3, 3, 0.2) + plinth(3, 3, 8, '#b9b0a0', 101);
    // element feature behind the cottage
    if (el === 'wind') g += vc(-0.95, -0.95, 8, 0.1, 0.1, 74, '#8a7a6a') + poly(onV(-0.95, [[-0.95, 82], [-0.2, 76], [-0.95, 70]]), '#ffffff') + poly(onV(-0.95, [[-0.95, 70], [-1.5, 62], [-0.95, 60]]), '#e8fbf6');
    if (el === 'dark') g += sbox(-1.25, -1.25, 8, 0.6, 0.6, 70, '#6a5aa8', 'brick', 102) + vstack(-0.95, -0.95, 78, 0.6, 0.6, [[0, 4, '#5a4a9a'], [0.1, 6, '#8a78d0'], [0.2, 6, '#5a4a9a']]) + vc(-0.95, -0.95, 94, 0.08, 0.08, 6, '#ffe9a0');
    if (el === 'fire') g += sbox(-1.0, 0.45, 8, 0.36, 0.36, 84, '#b8a898', 'brick', 103);
    if (el === 'light') g += sbox(-1.22, -1.22, 8, 0.4, 0.4, 88, '#fffbec', 'brick', 110) + vc(-1.02, -1.02, 96, 0.5, 0.5, 4, M.gd) + vstack(-1.02, -1.02, 100, 0.36, 0.36, [[0, 6, '#ffe27a'], [0.06, 5, '#fff3b0']]);
    // walls (cream), base course and corner posts
    g += sbox(-1.0, -1.0, 8, 2.0, 2.0, 34, s.wall, 'brick', 104) + vbox(-1.04, -1.04, 8, 2.08, 2.08, 5, M.st2);
    [[1, -1], [-1, 1], [1, 1]].forEach(([u, v]) => { g += vc(u * 0.96, v * 0.96, 8, 0.14, 0.14, 36, M.wd2); });
    // door on the +v face, windows (lit from level 3)
    const win = lv >= 3 ? '#ffe680' : '#cfe6ff';
    g += opening('v', 1.0, -0.22, 0.22, 13, 34, shade(s.roof, -0.25), shade(s.roof, -0.45)) + vc(0.12, 1.0, 22, 0.04, 0.02, 3, M.gd);
    g += window_('v', 1.0, -0.8, -0.48, 21, 33, win) + window_('v', 1.0, 0.48, 0.8, 21, 33, win) + window_('u', 1.0, -0.62, -0.26, 21, 33, win) + window_('u', 1.0, 0.26, 0.62, 21, 33, win);
    // stepped dome roof with a light stripe, crowned with the element emblem plaque
    // a rounded dome: layer half-widths follow a circle, with a light stripe two layers up
    const DOME = [1.1, 1.09, 1.065, 1.02, 0.953, 0.859, 0.728, 0.532];
    g += vstack(0, 0, 42, 2.0, 2.0, DOME.map((w, i) => [1 - w, 6, i === 2 || i === 5 ? s.roof2 : s.roof]));
    if (lv >= 5) g += vc(0, 0, 42, 2.24, 2.24, 3, M.gd, { noT: true }) + vc(0, 0, 66, 1.94, 1.94, 2, M.gd, { noT: true });
    g += vc(0, 0, 90, 0.4, 0.4, 4, shade(s.roof, -0.2));
    g += sbox(-0.32, 0.96, 46, 0.64, 0.1, 20, '#ffffff', 'brick', 105) + glyph('v', 1.06, -0.02, 60, s.emblem, s.roof, 0.055);
    // element features in front
    if (el === 'water') g += sbox(0.9, -1.4, 0, 0.55, 0.9, 6, M.st2, 'stone', 106) + poly(quadT(6.2, 0.98, -1.32, 1.37, -0.58), '#58c4ec') + vc(1.18, -0.95, 6, 0.06, 0.06, 6, '#bfefff');
    if (el === 'fire') g += vc(-0.82, 0.63, 92, 0.24, 0.24, 6, '#5a4a3a') + vc(-0.82, 0.63, 98, 0.16, 0.16, 7, M.fire, { t: '#ffd25a' }) + vc(-0.82, 0.63, 105, 0.08, 0.08, 6, '#fff3a0') + circ(pj(-0.82, 0.63, 104)[0], pj(-0.82, 0.63, 104)[1], 12, '#ffb84a', ' opacity=".3"');
    if (el === 'earth') g += sbox(1.0, -1.15, 8, 0.36, 0.5, 24, '#9a8a78', 'stone', 107) + sbox(-1.15, 1.0, 8, 0.5, 0.36, 18, '#9a8a78', 'stone', 108) + vc(1.18, -0.9, 32, 0.16, 0.16, 6, M.moss);
    if (el === 'nature') g += vtree('sapling', -0.1, -0.1, 94, 1.1, [M.moss, M.moss2, '#7ccf6a'], M.wd2, 109) + poly(onV(1.0, [[0.86, 40], [0.92, 40], [0.92, 14], [0.86, 14]]), fc(M.moss2, 'v'));
    if (el === 'light') g += circ(pj(-1.02, -1.02, 106)[0], pj(-1.02, -1.02, 106)[1], 16, '#fff3b0', ' opacity=".35"');
    // level 2: front garden; level 3: pennant; level 4: crystal on the roof; level 5: sparkles
    if (lv >= 2) [[1.3, 0.4], [1.3, -0.3], [0.4, 1.3], [-0.4, 1.3]].forEach(([u, v], i) => { g += vc(u, v, 8, 0.24, 0.24, 7, sh(s.roof2, -0.15), { t: fc(sh(s.roof2, -0.05), 't') }) + vc(u + 0.04, v + 0.04, 15, 0.07, 0.07, 3, i % 2 ? acc : '#ffffff'); });
    if (lv >= 3) g += vc(0.55, -0.55, 66, 0.05, 0.05, 34, '#6a5a4a') + poly(onV(-0.53, [[0.55, 99], [0.98, 94], [0.55, 89]]), acc);
    if (lv >= 4) g += vstack(-0.45, 0.45, 70, 0.3, 0.3, [[0, 6, s.roof2], [0.04, 8, s.roof2], [0.09, 6, '#ffffff']]) + circ(pj(-0.45, 0.45, 81)[0], pj(-0.45, 0.45, 81)[1], 14, s.roof2, ' opacity=".3"');
    if (lv >= 5) [[-0.8, 0.2, 70], [0.4, -0.8, 76], [0.8, 0.6, 66], [-0.2, -0.6, 92]].forEach(([u, v, z], i) => { const p = pj(u, v, z); g += '<rect x="' + f1(p[0] - 2) + '" y="' + f1(p[1] - 2) + '" width="4" height="4" fill="#fff6c0"' + (i % 2 ? ' class="twk"' : '') + '/>'; });
    return g;
  };
  // decorations
  // Duskfall Lantern (seasonal): a crooked block pole with a paper lantern and a moon cut out of it
  B.festlantern = () => shadow(1, 1) + vc(0, 0, 0, 0.1, 0.1, 30, '#6a4a3a') + vc(-0.03, 0.03, 30, 0.1, 0.1, 26, '#6a4a3a') + vc(-0.06, 0.06, 56, 0.1, 0.1, 20, '#6a4a3a') + vbox(-0.06, 0.01, 72, 0.44, 0.1, 4, '#6a4a3a') +
    vc(0.32, 0.06, 66, 0.02, 0.02, 6, '#4a3a2a') + vc(0.32, 0.06, 44, 0.26, 0.26, 22, '#ffb05a', { t: '#ffd08a' }) + poly(onV(0.19, [[0.24, 60], [0.36, 60], [0.36, 50], [0.24, 50]]), '#fff3c0') + vbox(0.19, -0.07, 52, 0.26, 0.26, 3, '#7a3a8a') + vc(0.32, 0.06, 36, 0.06, 0.06, 8, '#c88aff') +
    circ(pj(0.32, 0.06, 55)[0], pj(0.32, 0.06, 55)[1], 18, '#ffcf7a', ' opacity=".28" class="glow-soft"');
  B.lantern = () => shadow(1, 1) + sbox(-0.16, -0.16, 0, 0.32, 0.32, 6, M.st2, 'stone', 111) + vc(0, 0, 6, 0.08, 0.08, 38, '#5a4a3a') + vc(0, 0, 44, 0.24, 0.24, 3, '#5a4a3a') + vc(0, 0, 47, 0.18, 0.18, 12, M.glow, { t: '#fff6c8' }) + vstack(0, 0, 59, 0.28, 0.28, [[0, 3, '#5a4a3a'], [0.07, 3, '#5a4a3a']]) + circ(pj(0, 0, 53)[0], pj(0, 0, 53)[1], 14, '#fff3b0', ' opacity=".28"');
  B.flowerbed = () => shadow(1, 1) + sbox(-0.4, -0.4, 0, 0.8, 0.8, 7, '#8a5a34', 'plank', 112) + vbox(-0.34, -0.34, 7, 0.68, 0.68, 1, '#5a3a22', { t: '#6a4026' }) +
    [[-0.2, -0.2, '#ff9ec7'], [0.12, -0.22, '#ffd86b'], [-0.22, 0.1, '#ffffff'], [0.08, 0.06, '#b4a0ff'], [0.22, 0.2, '#ff8a6a'], [-0.05, 0.24, '#ffd86b']].map(([u, v, c]) => vc(u, v, 8, 0.06, 0.06, 6, M.moss2) + vc(u, v, 14, 0.12, 0.12, 4, c)).join('');
  B.bench = function () {
    // 2 x 1 along u (rotation swaps the model)
    let g = shadow(2, 1, 0.15);
    [-0.7, 0.7].forEach((u) => { g += vc(u, -0.1, 0, 0.1, 0.36, 10, '#5a3a22'); });
    g += vbox(-0.85, -0.3, 10, 1.7, 0.44, 4, M.wd) + tex(-0.85, -0.3, 10, 1.7, 0.44, 4, M.wd, 'plank', 113);
    g += vbox(-0.85, -0.34, 14, 1.7, 0.1, 14, M.wd2) + vbox(-0.85, -0.34, 28, 1.7, 0.12, 3, M.wd);
    return g + vc(0.95, 0.25, 0, 0.18, 0.18, 6, M.moss);
  };
  B.statue = () => {
    // a blocky Amina carved in pale stone on a stepped plinth
    let g = shadow(2, 2, 0.18) + sbox(-0.75, -0.75, 0, 1.5, 1.5, 8, '#c0bcd0', 'stone', 114) + sbox(-0.5, -0.5, 8, 1.0, 1.0, 12, '#d8d4e4', 'stone', 115);
    g += vc(0, 0, 20, 0.6, 0.5, 18, '#d4d0e2') + vc(0.02, 0.02, 38, 0.66, 0.6, 22, '#e2def0');
    g += vc(-0.2, -0.12, 60, 0.12, 0.14, 12, '#c4c0d6') + vc(0.18, 0.12, 60, 0.14, 0.12, 12, '#c4c0d6');
    g += poly(onV(0.32, [[-0.18, 52], [-0.08, 52], [-0.08, 46], [-0.18, 46]]), '#8a86a0') + poly(onV(0.32, [[0.08, 52], [0.18, 52], [0.18, 46], [0.08, 46]]), '#8a86a0');
    return g + vc(-0.6, 0.62, 8, 0.2, 0.2, 5, M.moss) + vc(0.62, -0.5, 8, 0.16, 0.2, 4, M.moss);
  };
  B.fountain = () => {
    let g = shadow(2, 2, 0.18) + sbox(-0.85, -0.85, 0, 1.7, 1.7, 12, '#cfd6e2', 'stone', 116);
    g += poly(quadT(12.2, -0.7, -0.7, 0.7, 0.7), '#58c4ec') + poly(quadT(12.3, -0.5, -0.5, 0.5, 0.5), '#6fd4f2');
    g += stroke('M' + P([pj(-0.5, 0.35, 12.4), pj(-0.2, 0.35, 12.4)]).replace(' ', 'L'), '#e8fbff', 1.5, ' class="ripple"');
    g += sbox(-0.14, -0.14, 12, 0.28, 0.28, 24, '#c4ccd8', 'stone', 117) + vc(0, 0, 36, 0.5, 0.5, 4, '#cfd6e2') + poly(quadT(40.2, -0.18, -0.18, 0.18, 0.18), '#6fd4f2') + vc(0, 0, 40, 0.1, 0.1, 8, '#bfefff');
    g += '<g class="spout">' + vc(-0.32, 0, 30, 0.06, 0.06, 6, '#bfefff') + vc(0.32, 0, 30, 0.06, 0.06, 6, '#bfefff') + vc(0, 0.32, 30, 0.06, 0.06, 6, '#bfefff') + '</g>';
    return g + vc(0, 0, 48, 0.08, 0.08, 4, M.gd);
  };
  // construction site: a dirt slab, scaffold poles and beams, crates and a coin sign
  Art.construction = function (w, h) {
    let g = shadow(w, h, 0.16) + sbox(-w / 2 + 0.08, -h / 2 + 0.08, 0, w - 0.16, h - 0.16, 4, '#c8a878', 'plank', 121);
    const a = w / 2 - 0.3, c = h / 2 - 0.3;
    [[-a, -c], [a, -c], [-a, c]].forEach(([u, v]) => { g += vc(u, v, 4, 0.08, 0.08, 52, M.wd); });
    g += vbox(-a, -c - 0.04, 30, a * 2, 0.08, 4, '#c4935c') + vbox(-a - 0.04, -c, 52, 0.08, c * 2, 4, '#c4935c') + vbox(-a, -c - 0.04, 52, a * 2, 0.08, 4, '#c4935c');
    g += sbox(-0.25, -0.25, 4, 0.5, 0.5, 18, '#d4a86a', 'plank', 122) + sbox(0.3, 0.25, 4, 0.36, 0.36, 12, '#b88a4c', 'plank', 123);
    [[a, c]].forEach(([u, v]) => { g += vc(u, v, 4, 0.08, 0.08, 52, M.wd); });
    g += vbox(a - 0.04, -c, 30, 0.08, c * 2, 4, '#c4935c') + vbox(-a, c - 0.04, 30, a * 2, 0.08, 4, '#c4935c');
    bbAdd(-14, -88, 14, -60);
    g += '<g transform="translate(0 -74)"><rect x="-13" y="-13" width="26" height="26" fill="#ffd86b" stroke="#8a5a14" stroke-width="2"/><rect x="-5" y="-8" width="4" height="12" fill="#5a3a14"/><rect x="-1" y="-8" width="8" height="4" fill="#5a3a14"/></g>';
    return g;
  };

  /* ================= obstacles ================= */
  const O = {};
  // roots spreading from a trunk: stepped blocks getting lower toward the tips, painter-sorted with the trunk
  function roots(arms, len, h0, sz, col, trunk) {
    const parts = [];
    arms.forEach(([du, dv]) => { [0.4, 0.65, 0.9].forEach((t, i) => parts.push([du * len * t, dv * len * t, h0 * (1 - i * 0.32), sz * (1 - i * 0.15)])); });
    parts.push([0, 0, -1, 0]);
    return parts.sort((a, b) => a[0] + a[1] - (b[0] + b[1])).map(([u, v, h, s2]) => (h < 0 ? trunk : vc(u, v, 0, s2, s2, h, i2c(col, u + v)))).join('');
  }
  const i2c = (c, k) => (k > 0 ? c : shade(c, 0.06));
  const LEAF = ['#4fae3c', '#3f9632', '#6cc84c'], PINE = ['#2f7a44', '#3a8f52', '#5fb06c'];
  O.oak = () => shadow(2, 2, 0.16) + vbox(-0.4, 0.1, 0, 0.3, 0.12, 6, '#6a4a2c') + vtree('tall', 0, 0, 0, 1.05, LEAF, '#7a5536', 201) + vc(0.55, 0.5, 0, 0.16, 0.16, 5, M.moss) + vc(-0.5, -0.45, 0, 0.14, 0.14, 4, M.moss);
  O.pine = () => shadow(1, 1, 0.16) + vtree('pine', 0, 0, 0, 0.75, PINE, '#7a5536', 202);
  O.bush = () => shadow(1, 1, 0.14) + leaves(0, 0, 0, 0.42, LEAF, 203, 4) + vc(-0.12, 0.2, 9, 0.06, 0.06, 4, '#e8344a') + vc(0.2, -0.05, 12, 0.06, 0.06, 4, '#e8344a') + vc(0.05, 0.22, 4, 0.06, 0.06, 4, '#e8344a');
  O.pebble = () => shadow(1, 1, 0.14) + sbox(-0.22, -0.18, 0, 0.42, 0.36, 10, '#9aa0ae', 'stone', 204) + vc(0.1, 0.12, 0, 0.18, 0.16, 6, '#8a909e') + vc(-0.1, -0.06, 10, 0.18, 0.16, 5, '#b4b9c6');
  O.boulder = () => shadow(2, 2, 0.2) + sbox(-0.7, -0.6, 0, 1.3, 1.2, 24, '#8a909e', 'stone', 205) + sbox(-0.5, -0.45, 24, 0.9, 0.8, 16, '#9aa0ae', 'stone', 206) + vc(0.45, 0.5, 0, 0.4, 0.4, 12, '#7a8090') + vc(-0.2, -0.2, 40, 0.4, 0.35, 8, '#a8aebc') + vbox(-0.7, 0.3, 24, 0.5, 0.3, 3, M.moss);
  O.stump = () => shadow(1, 1, 0.14) + sbox(-0.2, -0.2, 0, 0.4, 0.4, 12, '#8a5e3a', 'plank', 207) + poly(quadT(12.2, -0.14, -0.14, 0.14, 0.14), '#e0b888') + poly(quadT(12.3, -0.07, -0.07, 0.07, 0.07), '#c49a6a') + vc(0.3, 0.05, 0, 0.14, 0.1, 5, '#7a5536') + vc(0.22, 0.28, 0, 0.12, 0.12, 4, M.moss);
  O.elderroot = () => shadow(2, 2, 0.2) + roots([[-1, 0.4], [0.7, 0.8], [0.8, -0.6], [-0.4, -0.8]], 0.8, 18, 0.2, '#6a4a2c', sbox(-0.16, -0.16, 0, 0.32, 0.32, 44, '#7a5636', 'plank', 208)) + leaves(0, 0, 40, 0.9, ['#2f8f48', '#26783c', '#4fbf63'], 209, 6) + vc(-0.6, 0.6, 2, 0.06, 0.06, 4, '#9af2ff') + vc(0.6, -0.2, 2, 0.06, 0.06, 4, '#9af2ff');
  O.vinetree = () => {
    let g = shadow(2, 2, 0.18) + sbox(-0.18, -0.18, 0, 0.36, 0.36, 40, '#6a4a2c', 'plank', 210) + leaves(0, 0, 36, 1.1, ['#2f9a4f', '#26823f', '#4fbf63'], 211, 6);
    [[-0.5, 0.45, 34], [0.4, 0.5, 26], [0.55, -0.3, 30], [-0.1, 0.55, 22]].forEach(([u, v, L2]) => { g += vbox(u, v, 40 - L2, 0.05, 0.05, L2, '#4fbf63') + vc(u, v, 40 - L2, 0.1, 0.1, 4, '#e8ff7a'); });
    return g;
  };
  O.fern = () => shadow(1, 1, 0.12) + [[-0.2, 0, 18], [0.2, 0, 16], [0, -0.2, 20], [0, 0.2, 14], [0, 0, 24]].map(([u, v, h]) => vc(u, v, 0, 0.12, 0.12, h, '#3fae5c', { t: '#5fcf74' })).join('') + vc(0.24, 0.24, 0, 0.16, 0.16, 6, '#2f8f48');
  O.glowcap = () => shadow(1, 1, 0.12) + vc(0, 0, 0, 0.08, 0.08, 12, '#e8f4e0') + vstack(0, 0, 12, 0.42, 0.42, [[0, 4, '#56e0d8'], [0.06, 4, '#56e0d8'], [0.13, 3, '#7af2e8']]) + vc(0.22, 0.18, 0, 0.06, 0.06, 6, '#e8f4e0') + vstack(0.22, 0.18, 6, 0.2, 0.2, [[0, 3, '#7af2e8'], [0.05, 2, '#9af6ee']]) + circ(pj(0, 0, 14)[0], pj(0, 0, 14)[1], 14, '#9af2ff', ' opacity=".22"');
  O.mossruin = () => shadow(2, 2, 0.18) + sbox(-0.75, -0.3, 0, 1.5, 0.5, 28, '#a8b09a', 'stone', 212) + sbox(0.35, -0.75, 0, 0.4, 0.4, 46, '#a8b09a', 'stone', 213) + vbox(-0.75, -0.3, 28, 0.9, 0.5, 3, M.moss) + vbox(0.35, -0.75, 46, 0.4, 0.4, 3, M.moss) + vc(-0.3, 0.55, 0, 0.3, 0.25, 9, '#98a08a') + vbox(-0.6, 0.2, 6, 0.05, 0.02, 20, M.moss2);
  O.mossrock = () => shadow(1, 1, 0.14) + sbox(-0.22, -0.18, 0, 0.42, 0.36, 10, '#8a9a88', 'stone', 214) + vc(-0.05, 0, 10, 0.3, 0.26, 3, M.moss) + vc(0.15, 0.15, 0, 0.16, 0.14, 5, '#7a8a78');
  O.basalt = () => shadow(2, 2, 0.26) + [[-0.4, -0.3, 40], [0.3, -0.4, 54], [-0.05, 0.05, 64], [-0.45, 0.4, 30], [0.4, 0.35, 36]].map(([u, v, h], i) => sbox(u - 0.2, v - 0.2, 0, 0.4, 0.4, h, '#3a3048', 'stone', 215 + i) + poly(onV(v + 0.2, [[u - 0.05, h * 0.62], [u + 0.02, h * 0.62], [u + 0.02, h * 0.5], [u - 0.05, h * 0.5]]), '#ff5fc8')).join('');
  O.crystal = () => shadow(1, 1, 0.2) + vc(-0.12, 0.08, 0, 0.14, 0.14, 18, '#d44aa8', { t: '#ff8ad8' }) + vc(0, 0, 0, 0.18, 0.18, 30, '#e64ab8', { t: '#ffaae0' }) + vc(0.16, 0.12, 0, 0.12, 0.12, 14, '#c43a9a', { t: '#ff8ad8' }) + circ(pj(0, 0, 18)[0], pj(0, 0, 18)[1], 14, '#ff5fc8', ' opacity=".18"');
  O.embervent = () => shadow(1, 1, 0.2) + sbox(-0.3, -0.3, 0, 0.6, 0.6, 6, '#3a2a3a', 'stone', 220) + poly(quadT(6.2, -0.14, -0.14, 0.14, 0.14), '#ff7a3a') + vc(0, 0, 6, 0.08, 0.08, 3, '#ffd25a') + '<g class="smoke">' + vc(0.02, 0, 16, 0.14, 0.14, 8, '#8a7a8a', { x: ' opacity=".45"' }) + vc(0.08, -0.04, 30, 0.18, 0.18, 9, '#8a7a8a', { x: ' opacity=".3"' }) + '</g>';
  O.charred = () => shadow(1, 1, 0.2) + vc(0, 0, 0, 0.1, 0.1, 32, '#2a2230') + vbox(-0.32, -0.04, 18, 0.32, 0.08, 4, '#2a2230') + vbox(0, -0.04, 24, 0.28, 0.08, 4, '#2a2230') + vc(-0.3, 0, 22, 0.06, 0.06, 6, '#2a2230') + vc(0.26, 0, 28, 0.06, 0.06, 7, '#2a2230') + vc(-0.3, 0, 28, 0.05, 0.05, 3, '#ff8a4a');
  O.obsidianshard = () => shadow(1, 1, 0.2) + vc(0, 0, 0, 0.24, 0.24, 20, '#1a1424', { t: '#3a2e4e' }) + vc(-0.04, -0.02, 20, 0.16, 0.16, 12, '#241a32', { t: '#5a4a7a' }) + vc(-0.06, -0.04, 32, 0.08, 0.08, 6, '#2e2240') + vc(0.18, 0.14, 0, 0.12, 0.12, 9, '#1a1424') + poly(onV(0.12, [[-0.05, 14], [0, 14], [0, 8], [-0.05, 8]]), '#d48aff');
  O.slagheap = () => shadow(2, 2, 0.26) + vstack(0, 0, 0, 1.6, 1.4, [[0, 8, '#3a2e44'], [0.15, 8, '#33284a'], [0.32, 8, '#3a2e44'], [0.5, 6, '#4a3e5a']]) + vc(-0.3, 0.5, 8, 0.06, 0.06, 3, '#ff8a4a') + vc(0.3, -0.2, 16, 0.06, 0.06, 3, '#ff5fc8') + vc(0.6, 0.2, 8, 0.06, 0.06, 3, '#ff9a4a');
  O.floatstone = () => shadow(2, 2, 0.16) + '<g class="float">' + vstack(0, 0, 18, 1.2, 1.2, [[0.4, 6, '#45427c'], [0.22, 8, '#5d5a9a'], [0, 10, '#8a86c8'], [0.12, 5, '#9a96d6']]) + vc(-0.1, 0.1, 47, 0.4, 0.3, 3, '#b8c8ff') + '</g>' + circ(pj(0, 0, 2)[0], pj(0, 0, 2)[1], 10, '#c8f4ff', ' opacity=".45"');
  O.starshard = () => shadow(1, 1, 0.16) + vc(0, 0, 0, 0.1, 0.1, 10, '#e6c46a') + [[0, 0, 22], [-0.14, 0, 12], [0.14, 0, 12], [0, -0.14, 12], [0, 0.14, 12]].map(([u, v, h]) => vc(u, v, u || v ? 16 : 10, 0.12, 0.12, u || v ? 6 : h, '#fff3b0', { t: '#fffbe0' })).join('') + circ(pj(0, 0, 20)[0], pj(0, 0, 20)[1], 14, '#fff6c0', ' opacity=".25"');
  O.moonbloom = () => shadow(1, 1, 0.12) + vc(0, 0, 0, 0.04, 0.04, 16, '#8fb0a0') + [[-0.1, 0], [0.1, 0], [0, -0.1], [0, 0.1]].map(([u, v]) => vc(u, v, 16, 0.1, 0.1, 6, '#f4f0ff')).join('') + vc(0, 0, 18, 0.08, 0.08, 6, '#ffe9a0') + vc(0.18, 0.15, 0, 0.12, 0.08, 4, '#8fb0a0');
  O.pillar = () => shadow(1, 1, 0.16) + sbox(-0.35, -0.12, 0, 0.7, 0.24, 14, '#e8e4f8', 'stone', 230) + vbox(0.3, -0.16, 0, 0.12, 0.32, 18, '#d8d2f2') + vc(-0.25, 0.3, 0, 0.14, 0.14, 7, '#d8d2f2');
  O.cloudpuff = () => shadow(1, 1, 0.1) + '<g class="float">' + vc(0, 0, 8, 0.5, 0.36, 10, '#ffffff', { t: '#ffffff', v: '#f0f0ff', u: '#dcdcf4' }) + vc(-0.08, 0.06, 18, 0.28, 0.24, 7, '#ffffff', { t: '#ffffff', v: '#f0f0ff', u: '#dcdcf4' }) + vc(0.15, -0.1, 14, 0.22, 0.2, 8, '#ffffff', { t: '#ffffff', v: '#f0f0ff', u: '#dcdcf4' }) + '</g>';
  O.geode = () => shadow(2, 2, 0.2) + sbox(-0.7, -0.6, 0, 1.4, 1.2, 22, '#6a62a8', 'stone', 231) + vc(-0.1, -0.1, 22, 0.8, 0.7, 8, '#5d5a9a') + poly(onU(0.7, [[-0.35, 4], [0.35, 4], [0.35, 18], [-0.35, 18]]), '#3a2e6a') + [[-0.22, 9], [-0.05, 12], [0.12, 10], [0.28, 7]].map(([v, h], i) => poly(onU(0.71, [[v - 0.05, 4], [v + 0.05, 4], [v + 0.05, 4 + h], [v - 0.05, 4 + h]]), ['#c8a8ff', '#e0c8ff', '#a888f0', '#d8b8ff'][i])).join('');

  /* ================= landmarks / story hotspots ================= */
  const L = {};
  L.plaza = function (st) {
    // sun mosaic of stone tiles with a low ring of blocks; the Silent Stone rises from its centre after the Spire wakes
    let g = '';
    const tiles = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const u = -1.8 + i * 0.6, v = -1.8 + j * 0.6, r = Math.hypot(u + 0.3, v + 0.3); tiles.push([u, v, r < 0.7 ? '#ffd86b' : r < 1.3 ? ((i + j) % 2 ? '#f4ead0' : '#ebdfc0') : (i + j) % 2 ? '#e7dab9' : '#ddcfaa']); }
    const by = {}; tiles.forEach(([u, v, c]) => { by[c] = (by[c] || '') + dq(quadT(1, u + 0.02, v + 0.02, u + 0.58, v + 0.58)); });
    if (!(Art.voxHas && Art.voxHas('l', 'plaza'))) {
      g += poly(quadT(0, -1.8, -1.8, 1.8, 1.8), '#cbb48a') + Object.keys(by).map((c) => path(by[c], c)).join('');
      g += vbox(-1.8, 1.72, 0, 3.6, 0.08, 3, '#cbb48a') + vbox(1.72, -1.8, 0, 0.08, 3.6, 3, '#cbb48a');
    }
    const ma = Math.min(0.9, 0.35 + ((st && st.rank) || 1) * 0.08);
    g += '<g data-hit="mark">' + ell(0, 0, 22, 11, '#fff2a8', ' opacity="' + ma + '" class="glow-soft"') + ell(0, 0, 40, 20, 'none', ' stroke="#fff2a8" stroke-width="2" stroke-dasharray="6 5" opacity="' + ma + '" class="mark-ring"') + ell(0, 0, 60, 30, 'transparent') + '</g>';
    return g;
  };
  L.silent = function (fresh) {
    return '<g class="silent' + (fresh ? ' fresh' : '') + '" data-hit="stone" data-hl="hit:stone">' + ell(0, 6, 22, 7, '#000', ' opacity=".16"') + circ(0, -30, 46, '#fff2a8', ' opacity=".18" class="glow-soft"') +
      vc(0, 0, 0, 0.5, 0.5, 6, '#d6d2e8') + vc(0, 0, 6, 0.34, 0.34, 46, '#ebe8f6', { t: '#ffffff' }) + vc(0, 0, 52, 0.22, 0.22, 10, '#ebe8f6', { t: '#ffffff' }) + poly(onV(0.17, [[-0.03, 50], [0.03, 50], [0.03, 10], [-0.03, 10]]), '#fff6c0') + ell(0, 6, 24, 8, 'none', ' stroke="#fff6c0" stroke-width="2" stroke-dasharray="4 5" class="mark-ring"') + ell(0, -26, 40, 50, 'transparent') +
      (fresh ? '<g transform="translate(0 -88)"><g class="tagq">' + circ(0, 0, 13, '#2b2147', ' stroke="#fff6c0" stroke-width="2"') + '<text y="6" text-anchor="middle" font-size="18" font-weight="800" fill="#fff6c0">?</text></g></g>' : '') + '</g>';
  };
  L.stones = function (on) {
    let g = '<g class="stones' + (on ? ' hum' : ' calm') + '" data-hit="' + (on ? 'disturbance' : 'stones') + '" data-hl="hit:disturbance">';
    g += on ? ell(0, 0, 70, 36, '#ff9ee0', ' opacity=".28" class="glow-soft"') : ell(0, 0, 50, 25, '#ff9ee0', ' opacity=".1"');
    const pts = [...Array(7)].map((_, i) => { const a = (i * Math.PI * 2) / 7; return [Math.cos(a) * 1.0, Math.sin(a) * 1.0, i]; }).sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
    if (!(Art.voxHas && Art.voxHas('l', 'stones'))) pts.forEach(([u, v, i]) => { const h = 22 + (i % 3) * 6; g += vc(u, v, 0, 0.22, 0.2, h, on ? '#dccaf4' : '#aaa6ba', { t: on ? '#f0e4ff' : '#c4c0d2' }) + (on ? poly(onV(v + 0.1, [[u - 0.03, h - 6], [u + 0.03, h - 6], [u + 0.03, h - 14], [u - 0.03, h - 14]]), '#ff9ee0', ' class="twk"') : ''); });
    g += ell(0, -10, 70, 50, 'transparent');
    if (on) g += '<g transform="translate(0 -60)"><g class="tagq">' + circ(0, 0, 13, '#2b2147', ' stroke="#ff9ee0" stroke-width="2"') + '<text y="6" text-anchor="middle" font-size="18" font-weight="800" fill="#ffd0f0">!</text></g></g>';
    return g + '</g>';
  };
  L.elderroot = () => {
    let g = ell(0, 8, 80, 30, '#14301a', ' opacity=".22"');
    g += roots([[-1, 0.4], [0.8, 0.8], [0.9, -0.7], [-0.6, -0.9], [0.1, 1]], 1.5, 34, 0.3, '#6a4a2c', sbox(-0.36, -0.36, 0, 0.72, 0.72, 112, '#7a5636', 'plank', 240) + poly(onV(0.36, archPts(-0.14, 0.14, 0, 34)), '#2a1a10') + vc(0, 0.37, 26, 0.04, 0.02, 4, '#e8ff7a'));
    g += leaves(0, 0, 100, 1.9, ['#2f8f48', '#26783c', '#4fbf63'], 241, 7) + leaves(0.1, -0.1, 150, 1.2, ['#3fa858', '#2f8f48', '#5fd070'], 242, 4);
    return g + [[-1.0, 1.0, 110], [1.1, -0.6, 120], [-0.6, -1.0, 140], [0.8, 0.8, 96]].map(([u, v, z]) => { const p = pj(u, v, z); return '<rect x="' + f1(p[0] - 2) + '" y="' + f1(p[1] - 2) + '" width="4" height="4" fill="#9af2ff" class="twk"/>'; }).join('');
  };
  L.forge = () => {
    let g = ell(0, 8, 76, 28, '#000', ' opacity=".28"') + sbox(-1.3, -1.1, 0, 2.6, 2.2, 22, '#5a4a62', 'stone', 250);
    g += sbox(-0.9, -0.9, 22, 0.9, 0.9, 64, '#4a3e5a', 'brick', 251) + vbox(-0.95, -0.95, 86, 1.0, 1.0, 5, '#3a3048');
    g += '<g class="smoke">' + vc(-0.45, -0.45, 100, 0.3, 0.3, 12, '#7a6a80', { x: ' opacity=".4"' }) + vc(-0.4, -0.5, 118, 0.4, 0.4, 14, '#7a6a80', { x: ' opacity=".28"' }) + '</g>';
    g += opening('u', 1.3, -0.45, 0.45, 0, 18, '#3a3048', '#ff8a3a') + poly(onU(1.3, archPts(-0.3, 0.3, 0, 12)), '#ffd25a') + circ(pj(1.3, 0, 10)[0], pj(1.3, 0, 10)[1], 22, '#ff7a3a', ' opacity=".3"');
    g += sbox(0.5, 0.3, 22, 0.5, 0.4, 10, '#2e2440', 'stone', 252) + vc(0.75, 0.5, 32, 0.6, 0.2, 4, '#4a4a5a');
    return g + vc(1.1, -0.9, 22, 0.08, 0.08, 10, '#ff5fc8') + vc(-1.1, 0.9, 22, 0.08, 0.08, 8, '#ff5fc8');
  };
  L.observatory = () => {
    let g = ell(0, 8, 90, 34, '#2f2c5e', ' opacity=".22"') + sbox(-1.7, -1.7, 0, 3.4, 3.4, 16, '#d4ccf4', 'stone', 260);
    g += vcol(0, 0, 16, 1.0, 0.3, 40, '#e8e4fb', 'brick', 261) + vbox(-1.05, -1.05, 56, 2.1, 2.1, 4, M.gd);
    g += vstack(0, 0, 60, 2.0, 2.0, [[0, 8, '#8a86c8'], [0.15, 8, '#7a76b8'], [0.32, 8, '#8a86c8'], [0.5, 7, '#7a76b8'], [0.7, 5, '#8a86c8']]);
    g += vbox(0.1, -0.12, 90, 0.9, 0.24, 10, '#5d5a9a') + vbox(0.9, -0.15, 92, 0.2, 0.3, 14, '#4a4788');
    g += opening('u', 1.0, -0.25, 0.25, 16, 36, M.gd, '#5d5a9a');
    return g + [[-1.2, 1.2, 70], [1.3, -1.0, 80]].map(([u, v, z]) => { const p = pj(u, v, z); return '<rect x="' + f1(p[0] - 2) + '" y="' + f1(p[1] - 2) + '" width="4" height="4" fill="#fff6c0" class="twk"/>'; }).join('');
  };

  /* ================= assembling sprites ================= */
  // Building sprite: returns SVG for a building instance (origin = footprint centre).
  Art.building = function (b, st) {
    const d = D.BUILDINGS[b.type]; if (!d) return '';
    const s = A.World.size(b.type, b.rot);
    if (b.state === 'constructing') return Art.construction(s.w, s.h);
    const fn = B[d.art] || (d.cat === 'habitat' ? B.habitat : null);
    // rotation swaps the model's axes (a mirror that keeps the light on the correct side)
    VX.swap = !!b.rot;
    let g;
    try { g = fn ? fn(Math.max(1, b.level), b.state === 'ruined', b) : box(s.w, s.h, 30, '#ddd', '#bbb', '#999'); } finally { VX.swap = false; }
    if (b.state === 'upgrading') g += '<g opacity=".95">' + Art.scaffoldOverlay(s.w, s.h) + '</g>';
    return g;
  };
  // upgrade scaffolding in front of a building: block poles and a plank walkway
  Art.scaffoldOverlay = function (w, h) {
    const a = w / 2 - 0.15, c = h / 2 - 0.15;
    return vc(-a, c, 0, 0.08, 0.08, 62, M.wd) + vc(a, -c, 0, 0.08, 0.08, 62, M.wd) + vbox(-a, c - 0.06, 38, a * 2, 0.12, 4, '#c4935c') + vbox(a - 0.06, -c, 38, 0.12, c * 2, 4, '#c4935c') + vc(a, c, 0, 0.08, 0.08, 62, M.wd);
  };
  Art.obstacle = function (o) { const fn = O[o.type]; return fn ? fn() : circ(0, -10, 10, '#888'); };
  // Approximate sprite heights (for hit areas, bubbles and label placement)
  Art.heightOf = function (b) {
    const d = D.BUILDINGS[b.type]; if (!d) return 60;
    return { hollow: 112, tidegate: 100, moonshrine: 122, hatchery: 132, forge: 96, reliquarygate: 100, farm: 52, mine: 70, habitat: 122, lantern: 70, festlantern: 84, flowerbed: 24, bench: 40, statue: 76, fountain: 60 }[d.art || (d.cat === 'habitat' ? 'habitat' : '')] || 80;
  };
  Art.obstacleHeight = (type) => ({ oak: 92, pine: 70, boulder: 52, elderroot: 90, vinetree: 90, basalt: 70, floatstone: 64, geode: 40, slagheap: 34, mossruin: 56, charred: 40, crystal: 36, fern: 30 }[type] || 34);
  Art.landmark = function (iid, st) {
    // returns [{x,y,w,h,svg,key}] fixed features drawn in depth order with objects
    const isl = D.ISLANDS[iid], out = [];
    const xs = []; isl.map.forEach((row, y) => row.split('').forEach((c, x) => { if (c === 'x') xs.push([x, y]); }));
    // group landmark cells into rectangles (each landmark is a single rectangle in the map)
    const seen = {};
    xs.forEach(([x, y]) => {
      if (seen[x + ',' + y]) return; let w = 0, h = 0;
      while (isl.map[y][x + w] === 'x') w++; while (isl.map[y + h] && isl.map[y + h][x] === 'x') h++;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) seen[xx + ',' + yy] = 1;
      out.push({ x, y, w, h });
    });
    return out.map((r) => {
      let svg = '', kind = '';
      if (iid === 'starter' && r.w === 4) { kind = 'plaza'; svg = L.plaza(st) + (st.flags.r2 ? L.silent(!st.flags.stone) : ''); }
      else if (iid === 'starter') { kind = 'stones'; svg = st.struct.tidegate ? L.stones(!st.flags.r1) : L.stones(false).replace('data-hit="stones"', 'data-hit="stones-dormant"'); }
      else if (iid === 'verdant') { kind = 'elderroot'; svg = L.elderroot(); }
      else if (iid === 'obsidian') { kind = 'forge'; svg = L.forge(); }
      else { kind = 'observatory'; svg = L.observatory(); }
      return Object.assign(r, { svg, kind, flat: kind === 'plaza' });
    });
  };

  // A creature standing on the island at the local origin (feet at 0,0): baked 3D portrait, or classic SVG art.
  // 2D art on the island is drawn as an image of the creature's SVG (rasterised once and cached by the browser)
  // instead of a nested live SVG: with several Aminas on screen this keeps camera panning as smooth as in v0.3.
  const critterUri = {};
  // v0.7: island creatures use the baked voxel portraits in every mode (live 3D only affects battles and viewers)
  Art.critter = function (id) {
    return '<image href="' + (A.Art && A.Art.portraitSrc ? A.Art.portraitSrc(id) : 'assets/portraits/' + id + '.webp') + '" x="-62" y="-107" width="124" height="124" preserveAspectRatio="xMidYMid meet"/>';
  };

  /* ================= sprite images ================= */
  // A building, obstacle or landmark is drawn once into a standalone SVG and placed as one <image>: the browser keeps
  // a single picture per sprite instead of hundreds of live polygons, which keeps panning and redraws cheap.
  // Animated parts (glows, ripples, smoke, floating stones, twinkles) and tappable data-hit groups stay live, drawn
  // just after the picture. window.__spriteMode = 'inline' keeps everything as live SVG (for A/B profiling).
  Art.spriteMode = root.__spriteMode || 'image';
  const LIVE_RE = /class="[^"]*\b(glow-soft|ripple|spout|float|smoke|twk|fall|tagq|mark-ring)\b|data-hit=/;
  function splitLive(svg) {
    let stat = '', live = '', i = 0, depth = 0;
    while (i < svg.length) {
      const j = svg.indexOf('<', i); if (j < 0) { stat += svg.slice(i); break; }
      stat += svg.slice(i, j);
      const k = svg.indexOf('>', j), tag = svg.slice(j, k + 1), close = tag[1] === '/', self = tag.endsWith('/>');
      if (!close && depth === 0 && LIVE_RE.test(tag)) {
        if (self) { live += tag; i = k + 1; continue; }
        let d = 0, q = j;
        while (q < svg.length) { const a = svg.indexOf('<', q), b = svg.indexOf('>', a), t = svg.slice(a, b + 1); if (t[1] === '/') d--; else if (!t.endsWith('/>')) d++; q = b + 1; if (d === 0) break; }
        live += svg.slice(j, q); i = q; continue;
      }
      if (close) depth--; else if (!self) depth++;
      stat += tag; i = k + 1;
    }
    return { stat, live };
  }
  Art.splitLive = splitLive;
  const spriteCache = new Map();
  function asImage(key, make) {
    if (Art.spriteMode !== 'image') return make();
    let c = spriteCache.get(key);
    if (!c) {
      BB = [1e9, 1e9, -1e9, -1e9]; let svg, bb;
      try { svg = make(); } finally { bb = BB; BB = null; }
      const { stat, live } = splitLive(svg);
      if (!/<polygon/.test(stat) || bb[0] > bb[2]) c = { html: svg };
      else {
        const m = 3, x = Math.floor(bb[0] - m), y = Math.floor(bb[1] - m), w = Math.ceil(bb[2] + m) - x, h = Math.ceil(bb[3] + m) - y;
        const url = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + x + ' ' + y + ' ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">' + stat + '</svg>');
        c = { html: '<image class="spr" pointer-events="none" href="' + url + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>' + live };
      }
      spriteCache.set(key, c);
    }
    return c.html;
  }
  Art.buildingSprite = (b, st) => asImage('b|' + b.type + '|' + Math.max(1, b.level || 1) + '|' + b.state + '|' + (b.rot ? 1 : 0), () => Art.building(b, st));
  Art.obstacleSprite = (o) => asImage('o|' + o.type, () => Art.obstacle(o));
  Art.landmarkSprite = (l) => asImage('l|' + l.svg, () => l.svg);

  /* ================= scene composition ================= */
  // All objects on an island (buildings, obstacles, landmarks, creatures), depth-sorted, with data attributes for
  // input and data-hl tokens for quest highlights. opts: { hide: buildingId, now }
  Art.objects = function (st, iid, opts) { return Art.objectItems(st, iid, opts).map((i) => i.svg).join(''); };
  // The same, as a list of { id, svg } (one top-level element each), so the island can update only what changed.
  Art.objectItems = function (st, iid, opts) {
    opts = opts || {};
    const W = A.World, R = A.Rules, now = opts.now || Date.now(), items = [];
    const at = (x, y, w, h) => Iso.center(x, y, w, h);
    Art.landmark(iid, st).forEach((l) => { const [cx, cy] = at(l.x, l.y, l.w, l.h); items.push({ id: 'l' + l.x + ',' + l.y, k: l.flat ? -1 : l.x + l.y + l.w + l.h, svg: '<g class="lm lm-' + l.kind + '" transform="translate(' + f1(cx) + ' ' + f1(cy) + ')">' + Art.landmarkSprite(l) + '</g>' }); });
    W.obstaclesOn(st, iid).forEach((o) => {
      if (o.state === 'cleared') return;
      const t = D.OBSTACLE_TYPES[o.type], [cx, cy] = at(o.x, o.y, t.w, t.h), removing = o.state === 'removing';
      const vx = Art.voxHas && Art.voxHas('o', o.type) ? ' vx' : '';
      let g = '<g class="obs' + vx + (removing ? ' removing' : '') + '" data-oid="' + o.id + '" data-hl="obs:' + o.id + '" transform="translate(' + f1(cx) + ' ' + f1(cy) + ')"><g class="artg">' + Art.obstacleSprite(o) + '</g>';
      const hgt = Art.obstacleHeight(o.type);
      g += poly(foot(t.w, t.h).map((p) => [p[0] * 1.05, p[1] * 1.05 - 2]), 'transparent') + '<rect x="' + (-t.w * 18) + '" y="' + (-hgt) + '" width="' + (t.w * 36) + '" height="' + hgt + '" fill="transparent"/>';
      if (removing) { const r = o.rec, tot = Math.max(1, r.endAt - (r.startAt || r.endAt - 1000)), left = Math.max(0, r.endAt - now); g += '<g transform="translate(0 ' + (-hgt - 14) + ')">' + Art.timerBar(1 - left / tot, Art.fmtTime(Math.ceil(left / 1000))) + '</g>'; }
      items.push({ id: 'o' + o.id, k: o.x + o.y + t.w + t.h - 0.01, svg: g + '</g>' });
    });
    W.buildingsOn(st, iid).forEach((b) => {
      if (b.id === opts.hide || b.x == null) return;
      const s = W.size(b.type, b.rot), [cx, cy] = at(b.x, b.y, s.w, s.h), d = D.BUILDINGS[b.type], hgt = Art.heightOf(b);
      const state = b.state === 'ruined' ? (R.reqMet(st, d.req) ? 'available' : 'hidden') : b.state;
      const vx = Art.voxHas && Art.voxHas('b', d.art || d.id, d.cat, b.state) ? ' vx' : '';
      let g = '<g class="bld ' + state + vx + (opts.selected === b.id ? ' sel' : '') + '" data-bid="' + b.id + '" data-hl="bld:' + b.id + '" transform="translate(' + f1(cx) + ' ' + f1(cy) + ')">';
      if (state === 'available') g += ell(0, 0, s.w * 30, s.h * 15 + 6, 'none', ' class="pulse" stroke="#fff2a8" stroke-width="3"');
      g += '<g class="artg"' + (state === 'hidden' ? ' opacity=".55"' : '') + '>' + Art.buildingSprite(b, st) + '</g>';
      // generous invisible hit area: footprint + sprite box
      g += poly(foot(s.w, s.h), 'transparent') + '<rect x="' + (-(s.w + s.h) * 15) + '" y="' + (-hgt) + '" width="' + ((s.w + s.h) * 30) + '" height="' + hgt + '" fill="transparent"/>';
      if (state === 'available') g += '<g transform="translate(0 ' + (-hgt - 12) + ')"><g class="tag"><rect x="-30" y="-13" width="60" height="26" rx="13" fill="#2b2147" stroke="#ffd86b" stroke-width="2"/>' + circ(-16, 0, 7, '#ffd86b') + '<text x="6" y="5" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">' + d.levels[0].cost.gold + '</text></g></g>';
      if (state === 'hidden') g += '<g transform="translate(0 ' + (-hgt * 0.55) + ')">' + circ(0, 0, 12, '#2b2147', ' opacity=".85"') + stroke('M-4 -1v-2a4 4 0 0 1 8 0v2', '#fff', 1.8) + '<rect x="-5" y="-1" width="10" height="8" rx="2" fill="#fff"/></g>';
      if (b.state === 'constructing' || b.state === 'upgrading') { const tot = Math.max(1, b.endAt - (b.startAt || b.endAt - 1000)), left = Math.max(0, b.endAt - now); g += '<g transform="translate(0 ' + (-hgt - 16) + ')">' + Art.timerBar(1 - left / tot, Art.fmtTime(Math.ceil(left / 1000))) + '</g>'; }
      else if (d.produces && b.level >= 1) {
        const stock = W.stock(st, b.id), cap = W.capOf(st, b);
        const pk = W.prodKind ? W.prodKind(b) : d.produces;
        if (stock >= Math.max(1, Math.min(cap * 0.1, pk === 'gems' || W.isEss(pk) ? 1 : 5))) g += '<g class="collect-b" data-collect="' + b.id + '" data-hl="collect:' + b.id + '" transform="translate(0 ' + (-hgt - 6) + ')">' + Art.bubble(pk, stock >= cap - 0.5) + circ(0, -20, 26, 'transparent') + '</g>';
      }
      // Phase 13B: the Hatchery says what it is doing (eggs incubating, every slot in use, or an egg ready to hatch)
      if (b.type === 'hatchery' && b.level >= 1 && b.state !== 'constructing' && b.state !== 'upgrading' && Art.hatchMarker) g += Art.hatchMarker(st, hgt);
      items.push({ id: 'b' + b.id, k: b.x + b.y + s.w + s.h, svg: g + '</g>' });
      // creatures: the companion in front of the hollow, residents beside their homes
      const res = W.residents(st, b);
      res.forEach((a, i) => {
        if (b.state === 'stored' || b.level < 1) return;
        const comp = a.uid === st.active, sc = comp ? 0.95 : 0.55;
        const off = comp ? [0, s.h * 16 + 10] : [(i % 2 ? 1 : -1) * (s.w * 22) , s.h * 12 + 6 + i * 4];
        items.push({ id: 'c' + a.uid, k: b.x + b.y + s.w + s.h + 0.5 + i * 0.01, svg: A.Life.markup(a, cx + off[0], cy + off[1], sc, { cls: comp ? 'companion' : 'resident', r: comp ? 2 : 1, attrs: comp ? ' data-hit="companion"' : ' data-bid="' + b.id + '"' }) });
      });
    });
    // companion without a home yet (before the Hollow is restored)
    const act = R.active(st);
    if (act && iid === 'starter' && !(st.buildings.hollow && st.buildings.hollow.level >= 1)) {
      const h = st.buildings.hollow, [cx, cy] = at(h.x + 1, h.y + 3, 1, 1);
      items.push({ id: 'c' + act.uid, k: h.x + h.y + 7, svg: A.Life.markup(act, cx, cy + 6, 0.8, { cls: 'companion lonely', r: 1, attrs: ' data-hit="companion"' }) });
    }
    // Aminas without a home wander around the middle of the island (v0.4)
    if (A.Life && !opts.noRoamers) A.Life.roamers(st, iid).forEach((r) => { const [cx, cy] = at(r.x, r.y, 1, 1); items.push({ id: 'c' + r.uid, k: r.x + r.y + 2 + 0.4, svg: A.Life.markup(r, cx, cy, 0.62, { cls: 'roamer', r: 2 }) }); });
    items.sort((a, b) => a.k - b.k);
    return items;
  };
  Art.fmtTime = function (s) {
    if (s <= 0) return 'done';
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60 ? (s % 60) + 's' : '');
    return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
  };

  /* ================= small UI glyphs drawn in world space ================= */
  const ICON = { gold: '#ffd23a', food: '#ff6a5a', gems: '#7adfff' };
  Art.bubble = function (kind, full) {
    const c = ICON[kind] || '#fff';
    let i = '';
    const pk = kind === 'gems' ? 'gem' : kind;
    if (A.Pixel && A.Pixel.has(pk)) i = A.Pixel.inline(pk, -12, -12, 24); else
    if (kind === 'gold') i = circ(0, 0, 9, c, ' stroke="#a87a10" stroke-width="2"') + '<text y="4" text-anchor="middle" font-size="11" font-weight="900" fill="#a87a10">$</text>';
    else if (kind === 'food') i = path('M0 -4c-4 -3 -10 0 -10 6 0 5 4 8 10 8s10 -3 10 -8c0 -6 -6 -9 -10 -6z', c, ' stroke="#9a2a20" stroke-width="1.6"') + stroke('M0 -4q0 -4 4 -6', '#3f8a3a', 2);
    else i = path('M-8 -4h16l4 5 -12 10 -12 -10z', c, ' stroke="#2a7aa0" stroke-width="1.6"');
    return '<g class="bubble' + (full ? ' full' : '') + '">' + path('M-18 -20a18 18 0 1 1 36 0 18 18 0 0 1 -12 17l-6 8 -6 -8a18 18 0 0 1 -12 -17z', '#ffffff', ' stroke="#2b2147" stroke-width="2.5"') + '<g transform="translate(0 -20)">' + i + '</g></g>';
  };
  Art.hatchMarker = function (st, hgt) {
    const H = A.Rules.Hatch; if (!H) return '';
    const x = H.status(st); if (x.state === 'idle' || x.state === 'closed') return '';
    const egg = (dx) => '<g transform="translate(' + dx + ' 0)">' + path('M0 -8c4 0 6.5 5 6.5 9a6.5 6.5 0 0 1 -13 0c0 -4 2.5 -9 6.5 -9z', '#fff4d6', ' stroke="#8a6a3a" stroke-width="1.5"') + '<rect x="-3" y="-2" width="2.4" height="2.4" fill="#ff9ec4"/><rect x="1" y="1.5" width="2.4" height="2.4" fill="#7fd4ff"/></g>';
    const ready = x.state === 'ready', label = ready ? (x.ready > 1 ? 'Hatch ×' + x.ready : 'Hatch!') : x.used + ' / ' + x.slots + (x.state === 'full' ? ' full' : ''), w = 30 + label.length * 6.4;
    // sits above the dome's own egg (the voxel model is taller than the 2D picture)
    return '<g class="hatch-b ' + x.state + '" data-egg="' + x.state + '" transform="translate(0 ' + (-hgt - 62) + ')"><g class="' + (ready ? 'tag' : '') + '"><rect x="' + f1(-w / 2) + '" y="-13" width="' + f1(w) + '" height="26" rx="13" fill="' + (ready ? '#ffd86b' : '#2b2147') + '" stroke="' + (ready ? '#2b2147' : x.state === 'full' ? '#ffd86b' : '#fff') + '" stroke-width="2"/>' + egg(f1(-w / 2 + 13)) +
      '<text x="' + f1(9) + '" y="4.5" text-anchor="middle" font-size="12.5" font-weight="900" fill="' + (ready ? '#2b2147' : '#fff') + '">' + label + '</text></g>' + '<rect x="' + f1(-w / 2 - 6) + '" y="-20" width="' + f1(w + 12) + '" height="40" fill="transparent"/></g>';
  };
  Art.timerBar = function (pct, label) {
    return '<g class="timerbar"><rect x="-34" y="-14" width="68" height="20" rx="10" fill="#2b2147" stroke="#fff" stroke-width="1.5"/><rect x="-30" y="-10" width="' + f1(60 * Math.max(0, Math.min(1, pct))) + '" height="12" rx="6" fill="#8cff8a"/><text y="1" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" stroke="#2b2147" stroke-width="2.4" paint-order="stroke">' + label + '</text></g>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
