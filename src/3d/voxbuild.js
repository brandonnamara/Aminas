/* Aminas — voxel model library for the island (Environment Phase 1). Every building, tree, rock and prop is built
   here in code from prop voxels (1/8 of a cell), following voxstyle.js. A model is a pair of grids: solid blocks
   (lit, shadowed, ambient-occluded) and glow blocks (windows, lanterns, embers: unlit and bright).
   Coordinates: x and z run across the footprint (centred on 0), y up from the ground. The entrance side of a
   building faces +z (the lit, lower-left side on screen). rot = 1 swaps x and z, like the 2D art's mirror. */
import { VoxGrid, meshGrid, hash, pick } from './voxmesh.js';
import { PAL, EL, PV } from './voxstyle.js';

class Model {
  constructor(w, h, maxY, rot, seed, minY) {
    this.W = Math.round(w * 8); this.H = Math.round(h * 8); this.rot = rot ? 1 : 0; this.seed = seed || 1;
    const m = 8, X = (rot ? this.H : this.W), Z = (rot ? this.W : this.H), y0 = minY == null ? -2 : minY;
    this.g = new VoxGrid(-Math.ceil(X / 2) - m, y0, -Math.ceil(Z / 2) - m, X + 2 * m, maxY - y0 + 2, Z + 2 * m);
    this.l = new VoxGrid(-Math.ceil(X / 2) - m, y0, -Math.ceil(Z / 2) - m, X + 2 * m, maxY - y0 + 2, Z + 2 * m);
  }
  // colour spec: '#hex' | [palette] (hashed per voxel) | fn(x,y,z)
  col(c, x, y, z) { return typeof c === 'function' ? c(x, y, z) : Array.isArray(c) ? pick(c, hash(x * 7 + y * 131, z * 13 + y, this.seed)) : c; }
  put(x, y, z, c, glow) { const [X, Z] = this.rot ? [z, x] : [x, z]; const col = c == null ? 0 : this.col(c, x, y, z); (glow ? this.l : this.g).set(X, y, Z, col); if (!glow && col) this.l.set(X, y, Z, 0); }
  box(x0, y0, z0, x1, y1, z1, c, glow) { for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) this.put(x, y, z, c, glow); return this; }
  clear(x0, y0, z0, x1, y1, z1) { for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) { const [X, Z] = this.rot ? [z, x] : [x, z]; this.g.set(X, y, Z, 0); this.l.set(X, y, Z, 0); } return this; }
  glow(x0, y0, z0, x1, y1, z1, c) { return this.box(x0, y0, z0, x1, y1, z1, c, true); }
  has(x, y, z) { const [X, Z] = this.rot ? [z, x] : [x, z]; return this.g.get(X, y, Z) !== 0; }
  // hollow walls of a box (no top/bottom)
  walls(x0, y0, z0, x1, y1, z1, c) { this.box(x0, y0, z0, x1, y1, z0 + 1, c); this.box(x0, y0, z1 - 1, x1, y1, z1, c); this.box(x0, y0, z0, x0 + 1, y1, z1, c); this.box(x1 - 1, y0, z0, x1, y1, z1, c); return this; }
  // stepped hip roof: each layer one voxel in from the last, until it closes
  hip(x0, z0, x1, z1, y, c, trim) { let i = 0; while (x0 + i < x1 - i && z0 + i < z1 - i) { this.box(x0 + i, y + i, z0 + i, x1 - i, y + i + 1, z1 - i, i === 0 && trim ? trim : c); i++; } return y + i; }
  // gable roof with its ridge along x (axis 'x') or z; end walls filled with `wall`
  gable(x0, z0, x1, z1, y, axis, c, wall, trim) {
    const n = axis === 'x' ? z1 - z0 : x1 - x0, steps = Math.ceil(n / 2);
    for (let i = 0; i < steps; i++) {
      if (axis === 'x') { this.box(x0, y + i, z0 + i, x1, y + i + 1, z0 + i + 1, i === 0 && trim ? trim : c); this.box(x0, y + i, z1 - i - 1, x1, y + i + 1, z1 - i, i === 0 && trim ? trim : c); if (wall) { this.box(x0 + 1, y + i, z0 + i + 1, x0 + 2, y + i + 1, z1 - i - 1, wall); this.box(x1 - 2, y + i, z0 + i + 1, x1 - 1, y + i + 1, z1 - i - 1, wall); } }
      else { this.box(x0 + i, y + i, z0, x0 + i + 1, y + i + 1, z1, i === 0 && trim ? trim : c); this.box(x1 - i - 1, y + i, z0, x1 - i, y + i + 1, z1, i === 0 && trim ? trim : c); if (wall) { this.box(x0 + i + 1, y + i, z0 + 1, x1 - i - 1, y + i + 1, z0 + 2, wall); this.box(x0 + i + 1, y + i, z1 - 2, x1 - i - 1, y + i + 1, z1 - 1, wall); } }
    }
    return y + steps;
  }
  disc(cx, cz, r, y0, y1, c) { for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x + 0.5 - cx) ** 2 + (z + 0.5 - cz) ** 2 <= r * r) this.box(x, y0, z, x + 1, y1, z + 1, c); return this; }
  ball(cx, cy, cz, rx, ry, rz, c, glow) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 + ((z + 0.5 - cz) / rz) ** 2 <= 1) this.put(x, y, z, c, glow); return this; }
  build() {
    const g = this.g, l = this.l;
    return { geo: g.count ? meshGrid(g, { size: PV, solid: (x, y, z) => l.get(x, y, z) !== 0 }) : null, glow: l.count ? meshGrid(l, { size: PV, ao: false, shadeFaces: false }) : null, h: g.ny * PV };
  }
}

/* ---------------------------------------------------------------- shared parts */
const H = (x, y, z, s) => hash(x * 31 + y * 7, z * 17 + y * 3, s || 9);
// a coursed stone pattern: 4-long blocks, 2-high courses, offset every course, darker joints
const stoneWork = (pal, joint) => (x, y, z) => { const c = Math.floor(y / 2), along = (x + z + (c % 2) * 2) % 4; return (y % 2 === 1 && H(x, y, z) < 0.25) || along === 0 && H(x, c, z, 3) < 0.6 ? (joint || PAL.stoneDark[0]) : pick(pal, H(Math.floor((x + z + (c % 2) * 2) / 4), c, 0, 5)); };
const planks = (pal, dark) => (x, y, z) => (y % 3 === 0 ? dark || PAL.woodDark[0] : pick(pal, H(0, Math.floor(y / 3), x + z)));
const shingles = (pal) => (x, y, z) => ((x + z + y) % 3 === 0 ? pick(pal.slice(1), H(x, y, z)) : pal[0]);
function foundation(m, x0, z0, x1, z1, hgt, pal) { m.box(x0, 0, z0, x1, hgt, z1, stoneWork(pal || PAL.stone)); m.box(x0 - 1, 0, z0 - 1, x1 + 1, 1, z1 + 1, PAL.stoneDark); return hgt; }
function grassTuft(m, x, z, y) { m.box(x, y, z, x + 1, y + 1 + (H(x, 0, z) > 0.5 ? 1 : 0), z + 1, PAL.leaf); }
function flower(m, x, z, y, c) { m.box(x, y, z, x + 1, y + 1, z + 1, PAL.leafDark); m.box(x, y + 1, z, x + 1, y + 2, z + 1, c); }
function torch(m, x, y, z) { m.box(x, y, z, x + 1, y + 3, z + 1, PAL.woodDark); m.glow(x, y + 3, z, x + 1, y + 4, z + 1, PAL.glowWarm); }
function banner(m, x, y, z, len, col, col2, face) { // a hanging cloth on the +z (face 'z') or +x face
  for (let i = 0; i < len; i++) { const c = i === len - 1 ? col2 : col; if (face === 'x') m.box(x, y - i, z, x + 1, y - i + 1, z + 2, c); else m.box(x, y - i, z, x + 2, y - i + 1, z + 1, c); }
  if (face === 'x') m.box(x, y + 1, z - 1, x + 1, y + 2, z + 3, PAL.woodDark); else m.box(x - 1, y + 1, z, x + 3, y + 2, z + 1, PAL.woodDark);
}
function windowZ(m, x, y, z, w, h, lit) { m.box(x - 1, y - 1, z, x + w + 1, y + h + 1, z + 1, PAL.woodDark); if (lit) m.glow(x, y, z, x + w, y + h, z + 1, PAL.glow); else m.box(x, y, z, x + w, y + h, z + 1, '#3a3a52'); }
function windowX(m, x, y, z, w, h, lit) { m.box(x, y - 1, z - 1, x + 1, y + h + 1, z + w + 1, PAL.woodDark); if (lit) m.glow(x, y, z, x + 1, y + h, z + w, PAL.glow); else m.box(x, y, z, x + 1, y + h, z + w, '#3a3a52'); }
// rubble and broken walls for ruined buildings (any footprint)
function ruin(m, pal, accent) {
  const W = m.W, Hh = m.H, x0 = -W / 2 + 2, z0 = -Hh / 2 + 2, x1 = W / 2 - 2, z1 = Hh / 2 - 2;
  foundation(m, x0, z0, x1, z1, 2, PAL.stoneDark.concat(PAL.stone));
  for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) {
    const edge = x === x0 || z === z0 || x === x1 - 1 || z === z1 - 1;
    if (edge) { const h = Math.floor(H(x, 0, z, 11) * 7) + (x + z) % 3; if (H(x, 1, z, 4) > 0.25) m.box(x, 2, z, x + 1, 2 + h, z + 1, stoneWork(pal)); }
    else if (H(x, 2, z, 12) > 0.86) m.box(x, 2, z, x + 1, 3 + Math.floor(H(x, 3, z) * 2), z + 1, pick(PAL.rock, H(x, 4, z)));
  }
  for (let i = 0; i < 6; i++) { const x = Math.floor(x0 + H(i, 5, 1) * (x1 - x0)), z = Math.floor(z0 + H(i, 6, 2) * (z1 - z0)); m.box(x, 2, z, x + 1, 3, z + 1, PAL.moss); }
  if (accent) for (let i = 0; i < 3; i++) { const x = Math.floor(x0 + 2 + H(i, 7, 3) * (x1 - x0 - 4)), z = Math.floor(z0 + 2 + H(i, 8, 4) * (z1 - z0 - 4)); m.box(x, 2, z, x + 2, 3, z + 1, accent); }
  for (let i = 0; i < 8; i++) grassTuft(m, Math.floor(x0 - 1 + H(i, 9, 5) * (x1 - x0 + 2)), Math.floor(z0 - 1 + H(i, 10, 6) * (z1 - z0 + 2)), 0);
}

/* ---------------------------------------------------------------- buildings */
const B = {};
// THE OLD HATCHERY (benchmark): a stone hall on a stepped platform, a timber-framed upper floor, a tiled hip roof,
// and rising from it the great speckled shell-stone egg that gives the place its name. Torches at the door,
// banners at the corners, a straw nest of eggs on the platform.
B.hatchery = (m, lv) => {
  const gold = lv >= 3 ? PAL.gold : PAL.metal;
  // platform: two steps of coursed stone, wider at the front for the stair
  foundation(m, -12, -12, 12, 12, 2, PAL.stone); m.box(-11, 2, -11, 11, 3, 11, stoneWork(PAL.stone.slice(0, 3)));
  m.box(-4, 0, 12, 4, 1, 14, PAL.stone); m.box(-4, 1, 12, 4, 2, 13, PAL.stone); // front steps
  // ground floor: coursed stone walls with darker corner pillars
  const sw = stoneWork(['#c9c1b2', '#bdb4a3', '#d3ccbe']);
  m.box(-8, 3, -9, 8, 11, 5, sw); m.box(-7, 3, -8, 7, 11, 4, null);
  [[-9, -10], [7, -10], [-9, 4], [7, 4]].forEach(([x, z]) => m.box(x, 3, z, x + 2, 12, z + 2, stoneWork(PAL.stoneDark.concat(PAL.stone[1]))));
  // arched door on the front with warm light inside
  m.clear(-2, 3, 4, 2, 9, 5); m.clear(-1, 9, 4, 1, 10, 5); m.glow(-2, 3, 3, 2, 9, 4, PAL.glowWarm); m.glow(-1, 9, 3, 1, 10, 4, PAL.glowWarm);
  m.box(-3, 3, 5, -2, 10, 6, PAL.woodDark); m.box(2, 3, 5, 3, 10, 6, PAL.woodDark); m.box(-3, 10, 5, 3, 11, 6, PAL.woodDark);
  windowZ(m, -6, 6, 5, 2, 3, true); windowZ(m, 4, 6, 5, 2, 3, true); windowX(m, 8, 6, -5, 2, 3, true); windowX(m, 8, 6, 0, 2, 3, lv >= 2);
  torch(m, -4, 6, 6); torch(m, 3, 6, 6);
  // upper floor: plaster panels between dark timber beams, overhanging by one
  m.box(-9, 11, -10, 9, 12, 6, PAL.woodDark);
  for (let y = 12; y < 17; y++) for (let x = -9; x < 9; x++) for (let z = -10; z < 6; z++) {
    const edge = x === -9 || x === 8 || z === -10 || z === 5; if (!edge) continue;
    const beam = (x + 9) % 4 === 0 || (z + 10) % 4 === 0 || y === 16 || x === -9 && z === -10;
    m.put(x, y, z, beam ? PAL.woodDark : PAL.plaster);
  }
  windowZ(m, -5, 13, 6, 2, 2, true); windowZ(m, 3, 13, 6, 2, 2, true); windowX(m, 9, 13, -6, 2, 2, true);
  // tiled hip roof, deep red with a darker eave
  const top = m.hip(-11, -12, 11, 8, 17, shingles(PAL.roof.red), PAL.woodDark);
  // the great egg: cream shell-stone with blue speckles and a crack, ringed with a metal band
  // the egg sits in a stone cradle that rises through the roof, so it reads from across the island
  const ex = 0, ez = -2, base = top - 2;
  m.disc(ex, ez, 6.5, top - 6, base + 2, stoneWork(['#c9c1b2', '#bdb4a3']));
  m.disc(ex, ez, 7.5, base + 2, base + 3, gold);
  m.ball(ex, base + 10, ez, 6.5, 9.5, 6.5, (x, y, z) => (H(x, y, z, 21) > 0.9 ? '#5a9ae0' : H(x, y, z, 22) > 0.84 ? '#e8dcc0' : '#f8f2e2'));
  for (let y = base + 9; y < base + 17; y++) { const x = ex + 6 - Math.floor((y - base - 9) / 3); m.put(x, y, ez + 2 + ((y >> 1) % 2), '#9a8e78'); }
  if (lv >= 3) m.disc(ex, ez, 6.8, base + 6, base + 7, gold);
  m.glow(ex - 1, base + 19, ez - 1, ex + 1, base + 21, ez + 1, lv >= 2 ? PAL.glow : '#d8f4ff');
  // banners at the front corners in the island's egg-blue
  if (lv >= 2) { banner(m, -10, 10, 6, 6, '#3f7cc8', '#f2c440', 'z'); banner(m, 8, 10, 6, 6, '#3f7cc8', '#f2c440', 'z'); }
  if (lv >= 4) { m.box(ex, base + 21, ez, ex + 1, base + 27, ez + 1, PAL.woodDark); m.box(ex + 1, base + 24, ez, ex + 5, base + 27, ez + 1, '#3f7cc8'); m.box(ex + 2, base + 25, ez, ex + 3, base + 26, ez + 1, '#f2c440'); }
  // the nest: a straw ring with eggs on the platform's front right corner
  const nx = 7, nz = 8;
  m.disc(nx, nz, 3, 3, 4, ['#d8b860', '#c8a850', '#e8c870']); m.disc(nx, nz, 2, 3, 4, null); m.disc(nx, nz, 2, 3, 3.9, '#b8964a');
  m.ball(nx - 1, 5, nz, 1, 1.6, 1, '#f6efdd'); m.ball(nx + 1, 5, nz - 1, 1, 1.6, 1, '#ff9a7a');
  if (lv >= 2) m.ball(nx, 5, nz + 1, 1, 1.6, 1, '#7ac8f0');
  // plants and a crate
  m.box(-11, 3, 8, -8, 6, 11, planks(PAL.wood)); m.box(-11, 6, 8, -8, 7, 11, PAL.woodDark);
  flower(m, -6, 10, 3, PAL.flowers[2]); flower(m, -5, 9, 3, PAL.flowers[1]); grassTuft(m, 10, -10, 3); grassTuft(m, -10, -9, 3);
  if (lv >= 5) m.ball(ex, base + 10, ez, 6.5, 9.5, 6.5, (x, y, z) => (H(x, y, z, 21) > 0.88 ? '#f2c440' : '#fff8ea'));
};
B.hatchery.ruin = (m) => { ruin(m, ['#c9c1b2', '#bdb4a3'], '#f6efdd'); m.ball(2, 3, -2, 3, 2.5, 3, (x, y, z) => (H(x, y, z) > 0.5 ? '#f6efdd' : '#e8dcc0')); m.ball(2, 4.2, -2, 2.4, 2.2, 2.4, null); };

// SUNLIT HOLLOW: the companion's home: a grassy stone mound with a glowing arched hollow, a round window, a
// little porch roof and flowers at the door.
B.hollow = (m, lv) => {
  foundation(m, -11, -11, 11, 11, 1, PAL.stone);
  m.ball(-1, 1, -2, 9.5, 11, 8.5, (x, y, z) => (y > 9 ? pick(PAL.grass, H(x, y, z)) : y > 7 && H(x, y, z) > 0.5 ? pick(PAL.moss, H(x, z, y)) : stoneWork(['#d9cfb6', '#c4b998', '#cfc4a8'])(x, y, z)));
  m.box(-12, 0, -12, 12, 1, 12, null); foundation(m, -11, -11, 11, 11, 1, PAL.stone);
  // arched opening on the front, warm light
  m.clear(-3, 1, 3, 3, 8, 7); m.clear(-2, 8, 3, 2, 9, 7); m.glow(-3, 1, 2, 3, 8, 3, PAL.glow); m.glow(-2, 8, 2, 2, 9, 3, PAL.glow);
  m.box(-4, 1, 6, -3, 9, 7, lv >= 3 ? PAL.gold : '#aab2c4'); m.box(3, 1, 6, 4, 9, 7, lv >= 3 ? PAL.gold : '#aab2c4'); m.box(-4, 9, 6, 4, 10, 7, lv >= 3 ? PAL.gold : '#aab2c4');
  // porch roof on two posts
  m.box(-5, 1, 9, -4, 9, 10, PAL.woodDark); m.box(4, 1, 9, 5, 9, 10, PAL.woodDark); m.gable(-6, 6, 6, 11, 9, 'x', shingles(PAL.roof.green), null, PAL.woodDark);
  // round window on the right side and a chimney
  m.clear(6, 5, -3, 9, 8, 0); m.glow(6, 5, -3, 7, 8, 0, lv >= 2 ? PAL.glow : '#cfe6ff'); m.box(9, 4, -4, 10, 9, 1, PAL.woodDark);
  m.box(-5, 10, -6, -2, 16, -3, stoneWork(PAL.stone)); m.box(-6, 16, -7, -1, 17, -2, PAL.stoneDark);
  [[-8, 10, 1], [7, 10, 2], [-6, 11, 4], [9, 6, 0], [8, 9, 3]].forEach(([x, z, c]) => flower(m, x, z, 1, PAL.flowers[c]));
  if (lv >= 2) torch(m, 6, 1, 9);
  if (lv >= 4) { m.box(-1, 19, -2, 0, 26, -1, PAL.woodDark); m.box(0, 23, -2, 4, 26, -1, PAL.gold); }
};
B.hollow.ruin = (m) => { ruin(m, ['#a9a39a', '#9a948b'], null); m.ball(-2, 2, -2, 6, 5, 5, stoneWork(['#a9a39a', '#9a948b'])); m.clear(-3, 2, 1, 1, 6, 6); };

// TIDE GATE: a stone basin of sea water between two towers, a sheet of water falling through the arch.
B.tidegate = (m, lv) => {
  const W = m.W / 2, Hh = m.H / 2;
  foundation(m, -W + 1, -Hh + 1, W - 1, Hh - 1, 3, ['#b7c4cf', '#a8b6c2', '#c2ced8']);
  m.box(-W + 3, 2, -Hh + 3, W - 3, 3, Hh - 3, '#2f8cc8'); m.glow(-W + 4, 2, -Hh + 4, W - 4, 3, Hh - 4, '#5fd0ee');
  const tw = stoneWork(['#a4afc2', '#97a3b8', '#b0bacb']);
  [-W + 2, W - 6].forEach((x) => { m.box(x, 3, -3, x + 4, 22, 3, tw); m.box(x - 1, 22, -4, x + 5, 23, 4, lv >= 3 ? PAL.gold : '#8e98ae'); m.box(x, 23, -3, x + 4, 25, 3, tw); m.glow(x + 1, 25, -1, x + 3, 27, 1, '#9ae8ff'); });
  m.box(-W + 2, 18, -2, W - 2, 22, 2, tw); m.clear(-W + 6, 18, -2, W - 6, 19, 2);
  for (let x = -W + 6; x < W - 6; x++) for (let y = 3; y < 18; y++) if ((x + y) % 5 !== 0) m.glow(x, y, 0, x + 1, y + 1, 1, (x + y) % 3 ? '#8ad8f8' : '#d8f4ff');
  m.box(-W + 6, 3, 1, W - 6, 4, 2, '#d8f4ff');
  [[-8, 6], [8, -6]].forEach(([x, z]) => m.box(x, 3, z, x + 1, 4, z + 1, '#ffe0b0'));
  if (lv >= 2) [[-W + 1, Hh - 2], [W - 2, Hh - 2]].forEach(([x, z]) => torch(m, x, 3, z));
};
B.tidegate.ruin = (m) => { ruin(m, ['#8590a4', '#7a8498'], '#5fd0ee'); };

// MOON SHRINE: a violet stepped roof on four slim pillars, a glowing moon block above an altar.
B.moonshrine = (m, lv) => {
  foundation(m, -8, -8, 8, 8, 3, ['#c7c1e4', '#b4acd8', '#d0cbea']); m.box(-6, 3, -6, 6, 4, 6, '#b4acd8');
  [[-6, -6], [5, -6], [-6, 5], [5, 5]].forEach(([x, z]) => m.box(x, 4, z, x + 1, 17, z + 1, stoneWork(['#bcb6dc', '#aaa3cc'])));
  m.box(-2, 4, -2, 2, 7, 2, '#9a90d0'); m.glow(-1, 7, -1, 1, 9, 1, '#e8dcff');
  const t = m.hip(-8, -8, 8, 8, 17, shingles(PAL.roof.purple), lv >= 3 ? PAL.gold : '#5a4a8a');
  m.ball(0, t + 3, 0, 2.5, 2.5, 2.5, '#f4ecff', true); m.clear(1, t + 2, -3, 4, t + 6, 3);
  if (lv >= 2) [[-8, 9], [7, 9]].forEach(([x, z]) => torch(m, x, 0, z));
  for (let i = 0; i < 6; i++) m.box(-8 + i * 3, 3, 7, -7 + i * 3, 6 + (i % 2), 8, PAL.moss);
};
B.moonshrine.ruin = (m) => { ruin(m, ['#8e8aa8', '#7e7a98'], '#d8caff'); };

// RELIQUARY GATE: a great carved door set into a grassy rock mound, vines across it, runes that glow.
B.reliquarygate = (m, lv, ruined) => {
  m.ball(0, 0, -3, 11.5, 15, 9, (x, y, z) => (y > 11 ? pick(PAL.grass, H(x, y, z)) : H(x, y, z) > 0.8 ? pick(PAL.moss, H(x, z, y)) : pick(PAL.rock, H(x, y, z))));
  m.box(-12, -2, -12, 12, 0, 12, null);
  m.box(-6, 0, 3, 6, 15, 6, stoneWork(['#aaa49a', '#9c968c', '#b6b0a6'])); m.clear(-4, 0, 4, 4, 12, 6);
  m.box(-4, 0, 4, 4, 12, 5, ruined ? planks(PAL.woodDark) : planks(['#8a5a34', '#7a4e2c'], '#5e3f26'));
  m.box(-6, 15, 2, 6, 17, 6, stoneWork(PAL.stoneDark.concat(['#8a857c'])));
  if (!ruined) { m.glow(-1, 5, 6, 1, 9, 7, lv >= 2 ? '#7aff9a' : '#ffd86b'); [[-3, 13], [2, 13]].forEach(([x, y]) => m.glow(x, y, 6, x + 1, y + 1, 7, '#7aff9a')); }
  for (let i = 0; i < 9; i++) { const x = -5 + Math.floor(H(i, 1, 2) * 10); for (let y = 15 - Math.floor(H(i, 2, 3) * 10); y < 15; y++) m.put(x, y, 6, PAL.leafDark); }
  m.box(-8, 0, 6, -6, 1, 9, PAL.stone); m.box(6, 0, 6, 8, 1, 9, PAL.stone);
};
B.reliquarygate.ruin = (m) => B.reliquarygate(m, 1, true);

// OLD FORGE: brick smithy with a slate roof and a tall chimney, the furnace glowing through its mouth, an anvil,
// a quench barrel and a weapon rack outside.
B.forge = (m, lv) => {
  foundation(m, -12, -12, 12, 12, 1, PAL.stone);
  const br = stoneWork(PAL.brick, '#7a3a28');
  m.box(-10, 1, -10, 6, 12, 2, br); m.box(-9, 1, -9, 5, 12, 1, null);
  m.clear(-6, 1, 1, -2, 7, 2); m.glow(-6, 1, 0, -2, 7, 1, '#ff8a3a');
  windowX(m, 6, 5, -7, 2, 3, true);
  m.gable(-11, -11, 7, 3, 12, 'x', shingles(PAL.roof.slate), br, '#3a4458');
  m.box(-9, 12, -9, -5, 26, -5, br); m.box(-10, 26, -10, -4, 27, -4, '#5a2a1e'); m.glow(-8, 27, -8, -6, 28, -6, '#ff7a2a');
  // furnace: a brick hump with a glowing mouth on the front, coals
  m.box(-1, 1, 3, 6, 6, 8, br); m.clear(1, 1, 7, 4, 4, 8); m.glow(1, 1, 6, 4, 4, 7, '#ff6a1a'); m.box(0, 6, 4, 5, 7, 7, '#5a2a1e');
  // anvil, barrel, rack
  m.box(7, 1, 4, 10, 3, 6, PAL.stoneDark); m.box(6, 3, 4, 11, 5, 6, '#4a4e58'); m.box(10, 4, 4, 12, 5, 5, '#4a4e58');
  m.disc(9, -6, 2, 1, 5, planks(PAL.wood)); m.disc(9, -6, 1.5, 5, 5.9, '#3a8ac8');
  m.box(-11, 1, 5, -10, 8, 11, PAL.woodDark); for (let z = 5; z < 11; z += 2) m.box(-10, 2, z, -9, 9, z + 1, '#9aa0aa');
  if (lv >= 2) { m.box(-11, 1, -11, -8, 4, -8, planks(PAL.wood)); torch(m, 7, 1, 2); }
  if (lv >= 3) m.box(-9, 26, -9, -5, 27, -5, PAL.gold);
};
B.forge.ruin = (m) => { ruin(m, PAL.brick, '#5a2a1e'); m.box(-9, 2, -9, -5, 12, -5, stoneWork(PAL.brick, '#7a3a28')); };

// BERRY FARM: tilled rows of berry bushes inside a low fence, a small shed and a scarecrow.
B.farm = (m, lv) => {
  const W = m.W / 2, Hh = m.H / 2;
  m.box(-W + 1, 0, -Hh + 1, W - 1, 1, Hh - 1, (x, y, z) => (z % 3 === 0 ? '#7a5032' : '#8a5a38'));
  for (let x = -W + 3; x < W - 6; x += 3) for (let z = -Hh + 3; z < Hh - 2; z += 3) { m.box(x, 1, z, x + 2, 3, z + 2, PAL.leaf); if (H(x, 1, z) > 0.3) m.put(x + (H(x, 2, z) > 0.5 ? 1 : 0), 3, z, PAL.fruit[0]); if (lv >= 3 && H(x, 3, z) > 0.5) m.put(x + 1, 2, z + 1, PAL.fruit[0]); }
  for (let x = -W; x < W; x++) [-Hh, Hh - 1].forEach((z) => m.box(x, 1, z, x + 1, x % 3 === 0 ? 4 : 3, z + 1, PAL.wood));
  for (let z = -Hh; z < Hh; z++) [-W, W - 1].forEach((x) => m.box(x, 1, z, x + 1, z % 3 === 0 ? 4 : 3, z + 1, PAL.wood));
  m.box(W - 6, 1, -Hh + 2, W - 2, 6, Hh - 6, planks(PAL.wood)); m.gable(W - 7, -Hh + 1, W - 1, Hh - 5, 6, 'z', shingles(PAL.roof.red));
  m.box(-W + 4, 1, Hh - 4, -W + 5, 8, Hh - 3, PAL.woodDark); m.box(-W + 2, 6, Hh - 4, -W + 7, 7, Hh - 3, PAL.woodDark); m.box(-W + 4, 8, Hh - 4, -W + 5, 10, Hh - 3, PAL.sand[1]); m.box(-W + 3, 10, Hh - 4, -W + 6, 11, Hh - 3, PAL.roof.red[0]);
};
// GLIMMER MINE: a rocky knoll with a timbered shaft, a cart on rails and ore that glimmers.
B.mine = (m, lv) => {
  m.ball(-1, 0, -2, 8, 10, 6.5, (x, y, z) => (y > 8 ? pick(PAL.grass, H(x, y, z)) : pick(PAL.rock.concat(PAL.rockDark), H(x, y, z))));
  m.box(-9, -2, -9, 9, 0, 9, null);
  m.clear(-3, 0, 1, 2, 6, 6); m.box(-3, 0, 1, 2, 6, 2, '#2a2230');
  m.box(-4, 0, 2, -3, 7, 3, PAL.woodDark); m.box(2, 0, 2, 3, 7, 3, PAL.woodDark); m.box(-4, 7, 2, 3, 8, 3, PAL.woodDark);
  for (let z = 2; z < 8; z++) { m.box(-2, 0, z, -1, 1, z + 1, '#6a6e78'); m.box(0, 0, z, 1, 1, z + 1, '#6a6e78'); }
  m.box(-3, 1, 5, 2, 4, 7, '#7a6a5a'); m.box(-2, 4, 5, 1, 5, 7, '#ffd86b');
  [[-6, 4, 3], [5, 5, 1], [3, 7, -3], [-5, 6, -1]].forEach(([x, y, z]) => m.glow(x, y, z, x + 1, y + 1, z + 1, lv >= 3 ? '#9ae8ff' : '#ffd86b'));
  if (lv >= 2) torch(m, 4, 0, 4);
};
// HABITATS: one cottage plan, each element with its own roof colour and feature.
B.habitat = (m, lv, ruined, b) => {
  const el = (b.type || '').replace('hab_', ''), ec = EL[el] || EL.nature;
  foundation(m, -11, -11, 11, 11, 1, PAL.stone);
  const roofs = { nature: PAL.roof.green, water: PAL.roof.blue, earth: ['#b0824a', '#a07440', '#c0925a'], fire: PAL.roof.red, light: PAL.roof.gold.concat(['#f0c850']), dark: PAL.roof.purple, wind: ['#6ac8b8', '#5ab8a8', '#7ad8c8'] };
  const walls = el === 'dark' ? stoneWork(['#6a6488', '#5e587a']) : el === 'fire' ? stoneWork(PAL.brick, '#7a3a28') : el === 'earth' ? planks(['#b8875a', '#a8774a']) : (x, y, z) => ((x + z) % 6 === 0 || y === 1 ? PAL.woodDark[0] : PAL.plaster[(y >> 2) % 2]);
  m.box(-7, 1, -8, 6, 10, 4, walls); m.box(-6, 1, -7, 5, 10, 3, null);
  m.clear(-2, 1, 3, 1, 7, 4); m.box(-2, 1, 3, 1, 7, 4, PAL.woodDark); m.glow(-1, 2, 3, 0, 6, 4, PAL.glowWarm);
  windowZ(m, -6, 5, 4, 2, 2, true); windowZ(m, 3, 5, 4, 2, 2, lv >= 2); windowX(m, 6, 5, -5, 2, 2, true);
  const t = m.gable(-8, -9, 7, 5, 10, 'z', shingles(roofs[el] || PAL.roof.green), walls, PAL.woodDark);
  m.box(-1, t - 1, -9, 0, t, 5, ec[1]);
  // a porch and the element's own feature beside the house
  m.box(-3, 1, 4, 2, 2, 7, planks(PAL.plank));
  if (el === 'nature') { m.box(7, 1, 6, 8, 6, 7, PAL.woodDark); m.ball(7.5, 8, 6.5, 3, 2.5, 3, PAL.leaf); m.put(6, 8, 8, PAL.fruit[0]); }
  else if (el === 'water') { m.disc(7, 6, 3, 1, 2, PAL.stone); m.disc(7, 6, 2, 1, 2, null); m.glow(5, 1, 4, 9, 2, 8, '#5fd0ee'); }
  else if (el === 'earth') { m.ball(7, 1, 6, 3.5, 3, 3, PAL.dirt); m.box(6, 1, 8, 8, 3, 9, '#2a2230'); }
  else if (el === 'fire') { m.box(6, 1, 5, 9, 3, 8, PAL.stoneDark); m.glow(7, 3, 6, 8, 5, 7, '#ff7a2a'); m.glow(7, 5, 6, 8, 6, 7, '#ffd86b'); }
  else if (el === 'light') { m.box(7, 1, 6, 8, 3, 7, PAL.stone); m.glow(6, 3, 5, 9, 4, 8, '#fff3b0'); m.glow(7, 4, 6, 8, 7, 7, '#ffd86b'); }
  else if (el === 'dark') { m.box(7, 1, 6, 8, 3, 7, PAL.stoneDark); m.glow(7, 3, 6, 8, 7, 7, '#c9b0ff'); m.glow(6, 5, 6, 7, 6, 7, '#9a78e6'); }
  else if (el === 'wind') { m.box(7, 1, 6, 8, 12, 7, PAL.woodDark); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { for (let i = 1; i < 4; i++) m.put(7 + dx * i, 11 + dy * i, 7, i === 3 ? ec[1] : '#f2e6c4'); }); }
  if (lv >= 3) { m.box(-8, 1, 5, -7, 7, 6, PAL.woodDark); m.box(-8, 7, 5, -4, 10, 6, ec[0]); }
  [[-10, 9, 0], [9, -9, 3], [-9, -9, 1]].forEach(([x, z, c]) => flower(m, x, z, 1, PAL.flowers[c]));
};
B.habitat.ruin = (m, b) => ruin(m, PAL.stone, (EL[(b.type || '').replace('hab_', '')] || EL.nature)[0]);

// DECOR
B.lantern = (m) => { m.box(-1, 0, -1, 1, 1, 1, PAL.stoneDark); m.box(0, 1, 0, 1, 12, 1, PAL.woodDark); m.box(-1, 12, -1, 2, 13, 2, PAL.woodDark); m.glow(-1, 13, -1, 2, 16, 2, PAL.glow); m.box(-1, 16, -1, 2, 17, 2, '#5a4a3a'); };
B.festlantern = (m) => { m.box(0, 0, 0, 1, 14, 1, PAL.woodDark); m.box(1, 13, 0, 3, 14, 1, PAL.woodDark); m.glow(1, 9, -1, 4, 13, 2, '#ffb05a'); m.box(1, 13, -1, 4, 14, 2, '#c84a30'); };
B.flowerbed = (m) => { m.disc(0, 0, 3.6, 0, 2, stoneWork(PAL.stone)); m.disc(0, 0, 2.6, 1, 2, '#6a4a2a'); for (let i = 0; i < 9; i++) flower(m, -2 + (i % 3) * 2, -2 + Math.floor(i / 3) * 2, 2, PAL.flowers[i % 5]); };
B.bench = (m) => { const W = m.W / 2; m.box(-W + 2, 0, -1, -W + 3, 3, 1, PAL.stoneDark); m.box(W - 3, 0, -1, W - 2, 3, 1, PAL.stoneDark); m.box(-W + 1, 3, -2, W - 1, 4, 2, planks(PAL.wood)); m.box(-W + 1, 4, -2, W - 1, 7, -1, planks(PAL.wood)); m.box(-W + 3, 7, -2, -W + 6, 8, -1, PAL.moss); };
B.statue = (m) => { foundation(m, -6, -6, 6, 6, 3, PAL.stone); m.box(-4, 3, -4, 4, 5, 4, '#cfcac0'); m.ball(0, 10, 0, 4, 5, 4, '#d8d3c8'); m.box(-3, 14, -1, -1, 17, 1, '#d8d3c8'); m.box(1, 14, -1, 3, 17, 1, '#d8d3c8'); m.box(-2, 10, 3, -1, 11, 4, '#3a3a52'); m.box(1, 10, 3, 2, 11, 4, '#3a3a52'); m.box(-1, 8, 4, 1, 9, 5, '#a89c84'); };
B.fountain = (m) => { m.disc(0, 0, 7.5, 0, 3, stoneWork(PAL.stone)); m.disc(0, 0, 6.5, 2, 3, null); m.disc(0, 0, 6.5, 1, 2, '#2f8cc8'); m.glow(-5, 2, -5, 5, 2.9, 5, '#5fd0ee'); m.disc(0, 0, 6.5, 2, 3, null); m.box(-1, 1, -1, 1, 8, 1, stoneWork(PAL.stone)); m.disc(0, 0, 2.5, 8, 9, PAL.stone); m.glow(-1, 9, -1, 1, 11, 1, '#d8f4ff'); };

/* ---------------------------------------------------------------- nature (obstacles and scenery) */
const N = {};
N.oak = (m, s) => { const k = 0.85 + hash(s, 1, 1) * 0.3; m.box(-1, 0, -1, 2, Math.round(9 * k), 2, PAL.woodDark.concat(PAL.wood[1])); m.box(-2, 0, -2, 3, 1, 3, PAL.woodDark);
  m.ball(0.5, 11 * k, 0.5, 6 * k, 4.2 * k, 6 * k, (x, y, z) => (H(x, y, z, s) > 0.82 ? pick(PAL.leafDark, H(x, z, y)) : pick(PAL.leaf, H(x, y, z, s + 1))));
  m.ball(2, 14.5 * k, -1, 3.6 * k, 2.8 * k, 3.6 * k, PAL.leaf); if (hash(s, 2, 2) > 0.6) [[3, 10, 4], [-4, 11, 2], [1, 9, -5]].forEach(([x, y, z]) => m.put(x, Math.round(y * k), z, PAL.fruit[0])); };
N.pine = (m, s) => { const k = 0.85 + hash(s, 1, 1) * 0.35; m.box(0, 0, 0, 1, Math.round(5 * k), 1, PAL.woodDark); let y = Math.round(3 * k);
  [4, 3.3, 2.6, 1.9, 1.2].forEach((r, i) => { m.disc(0.5, 0.5, r * k, y, y + 2, (x, yy, z) => pick(PAL.pine, H(x, yy, z, s + i))); y += 2; }); m.box(0, y, 0, 1, y + 1, 1, PAL.pine[0]); };
N.bush = (m, s) => { m.ball(0, 2, 0, 3.4, 2.6, 3.4, PAL.leaf); [[2, 3, 2], [-2, 4, 1], [0, 4, -3], [3, 2, -1]].forEach(([x, y, z], i) => { if (hash(s, i, 3) > 0.3) m.put(x, y, z, PAL.fruit[0]); }); };
N.pebble = (m, s) => { m.ball(0, 1, 0, 2.4, 1.6, 2, PAL.rock); m.ball(2.5, 0.6, 2, 1.2, 1, 1.2, PAL.rockDark); if (hash(s, 1, 4) > 0.5) m.put(-1, 2, 0, PAL.moss[0]); };
N.boulder = (m, s) => { m.ball(0, 3, 0, 6, 4.5, 5.5, (x, y, z) => (y > 5 && H(x, y, z, s) > 0.55 ? pick(PAL.moss, H(x, z, y)) : pick(PAL.rock.concat(PAL.rockDark), H(x, y, z, s)))); m.ball(4, 1.5, 4, 2, 2, 2, PAL.rock); };
N.stump = (m) => { m.disc(0, 0, 2.6, 0, 3, PAL.woodDark.concat(PAL.wood[1])); m.disc(0, 0, 2, 3, 3.9, '#c9965e'); m.put(0, 3, 0, '#a8774a'); m.box(2, 0, -1, 4, 1, 0, PAL.woodDark); m.put(-2, 3, 1, PAL.moss[0]); };
N.birch = (m, s) => { m.box(0, 0, 0, 1, 11, 1, (x, y) => (y % 3 === 0 ? '#3a3a3a' : '#f2efe6')); m.ball(0.5, 12, 0.5, 3.5, 4.5, 3.5, ['#9ad85a', '#8ac84a', '#aae86a']); };
N.blossom = (m, s) => { m.box(0, 0, 0, 1, 7, 1, PAL.woodDark); m.ball(0.5, 9, 0.5, 4, 3, 4, (x, y, z) => (H(x, y, z, s) > 0.75 ? '#ffffff' : pick(PAL.blossom, H(x, y, z)))); };
N.sapling = (m) => { m.box(0, 0, 0, 1, 4, 1, PAL.woodDark); m.ball(0.5, 5, 0.5, 2, 2, 2, PAL.leaf); };
N.fern = (m, s) => { for (let i = 0; i < 6; i++) { const a = i * 1.05 + s; m.put(Math.round(Math.cos(a) * 2), 1, Math.round(Math.sin(a) * 2), PAL.leaf); } m.box(0, 0, 0, 1, 2, 1, PAL.leafDark); };

/* ---------------------------------------------------------------- the jetty, the skiff, the lighthouse */
const X = {};
X.jetty = (m) => { // 3 cells wide (centre plank run), 4.5 cells long along +z, hanging over the edge
  for (let z = -18; z < 18; z++) m.box(-3, -1, z, 4, 0, z + 1, z % 2 ? PAL.plank[0] : PAL.plank[1]);
  for (let z = -16; z < 18; z += 8) [-3, 3].forEach((x) => { m.box(x, -12 + Math.max(0, (z + 18) >> 2), z, x + 1, 2, z + 1, PAL.woodDark); });
  [-3, 3].forEach((x) => m.box(x, 1, -18, x + 1, 2, 18, PAL.woodDark));
  m.box(3, 0, 16, 4, 8, 17, PAL.woodDark); m.glow(2, 8, 15, 5, 10, 18, PAL.glow); m.box(2, 10, 15, 5, 11, 18, '#5a4a3a');
};
X.skiff = (m) => {
  m.box(-8, 0, -3, 8, 2, 3, '#a8452c'); m.box(-9, 2, -3, 9, 4, 3, '#c0583a'); m.box(-7, 1, -2, 7, 4, 2, '#7a3020'); m.box(-8, 4, -3, 8, 5, 3, '#f2e6c4'); m.box(-7, 4, -2, 7, 5, 2, null);
  m.box(0, 2, 0, 1, 22, 1, PAL.woodDark); for (let y = 6; y < 21; y++) m.box(1, y, 0, 1 + Math.round((21 - y) * 0.45), y + 1, 1, '#fff8ec');
  m.ball(0, -2, 0, 11, 2.5, 5, ['#ffffff', '#f2f7ff']);
};
X.lighthouse = (m) => {
  m.ball(0, -6, 0, 9, 9, 9, (x, y, z) => (y > -1 ? pick(PAL.grass, H(x, y, z)) : pick(PAL.stone.concat(PAL.deep), H(x, y, z)))); m.box(-10, 1, -10, 10, 4, 10, null);
  for (let y = 1; y < 26; y++) { const r = 3.4 - y * 0.03; m.disc(0, 0, r, y, y + 1, (y >> 2) % 2 ? '#fff8ec' : '#d8583a'); }
  m.disc(0, 0, 4, 26, 27, '#5a4a6a'); m.glow(-2, 27, -2, 2, 31, 2, '#fff3b0'); m.box(-2, 27, -2, -1, 31, -1, '#5a4a6a'); m.box(1, 27, 1, 2, 31, 2, '#5a4a6a'); m.hip(-3, -3, 3, 3, 31, '#5a4a6a');
};

// THE PLAZA: a sun mosaic of cream and gold tiles inside a low kerb (the 2D layer keeps its glowing mark on top)
X.plaza = (m) => {
  const W = m.W / 2;
  for (let x = -W; x < W; x++) for (let z = -W; z < W; z++) {
    const r = Math.hypot(x + 0.5, z + 0.5), ring = Math.floor(r / 2.2), tile = ((x >> 1) + (z >> 1)) % 2;
    const c = r < 4.2 ? (r < 2.5 ? '#ffe27a' : '#f2c440') : ring % 4 === 2 && Math.floor(Math.atan2(z, x) * 8 / Math.PI) % 2 ? '#e8c870' : tile ? '#f4ead0' : '#e8dcbc';
    m.put(x, 0, z, (x + z) % 4 === 0 && r > 5 ? '#d8c8a0' : c);
  }
  for (let i = -W; i < W; i++) { m.box(i, 1, W - 1, i + 1, 2, W, '#cbb48a'); m.box(W - 1, 1, i, W, 2, i + 1, '#cbb48a'); m.box(i, 1, -W, i + 1, 2, -W + 1, '#cbb48a'); m.box(-W, 1, i, -W + 1, 2, i + 1, '#cbb48a'); }
  [[-W, -W], [W - 2, -W], [-W, W - 2], [W - 2, W - 2]].forEach(([x, z]) => { m.box(x, 1, z, x + 2, 3, z + 2, '#bba478'); });
};
// THE STANDING STONES: a ring of seven pale stones; when the island hums they glow violet
X.stones = (m, on) => {
  for (let i = 0; i < 7; i++) { const a = (i * Math.PI * 2) / 7, x = Math.round(Math.cos(a) * 7), z = Math.round(Math.sin(a) * 7), h = 9 + (i % 3) * 3;
    m.box(x - 1, 0, z - 1, x + 1, h, z + 1, (xx, y) => (on && y > h - 5 && y < h - 2 ? '#f0e4ff' : on ? (y % 3 ? '#dccaf4' : '#c8b6e6') : (y % 3 ? '#aaa6ba' : '#9a96aa'))); m.box(x - 1, h, z - 1, x + 1, h + 1, z + 1, on ? '#f0e4ff' : '#c4c0d2');
    if (on) m.glow(x - 1, h - 4, z + 1, x + 1, h - 2, z + 2, '#ff9ee0'); }
  m.disc(0, 0, 2.5, 0, 1, on ? '#ff9ee0' : '#8a8698', on);
};

/* ---------------------------------------------------------------- public */
const cache = new Map();
const keyOf = (k) => k;
// A building model (geometries cached per type, level, state and rotation).
export function buildingModel(b, size, opts) {
  const art = opts.art, ruined = b.state === 'ruined', lv = Math.max(1, b.level || 1);
  const k = 'b|' + b.type + '|' + (ruined ? 'r' : lv) + '|' + (b.rot ? 1 : 0);
  if (cache.has(k)) return cache.get(k);
  const fn = B[art] || (opts.cat === 'habitat' ? B.habitat : null); if (!fn) return null;
  const m = new Model(size.w0, size.h0, 64, b.rot, 7);
  if (ruined) (fn.ruin ? fn.ruin(m, b) : ruin(m, PAL.stone)); else fn(m, lv, false, b);
  const out = m.build(); cache.set(k, out); return out;
}
export const hasBuilding = (art, cat) => !!(B[art] || cat === 'habitat');
export function natureModel(kind, seed, w, h) {
  const k = 'n|' + kind + '|' + (seed % 3); if (cache.has(k)) return cache.get(k);
  const fn = N[kind]; if (!fn) return null;
  const m = new Model(w || 1, h || 1, 34, 0, seed % 3 + 1); fn(m, seed % 3 + 1);
  const out = m.build(); cache.set(k, out); return out;
}
export const hasNature = (kind) => !!N[kind];
const XSIZE = { skiff: [3, 2], lighthouse: [2.5, 2.5], jetty: [1, 4.5], plaza: [4, 4], stones: [3, 3] };
export function extraModel(kind, variant) { const k = 'x|' + kind + '|' + (variant ? 1 : 0); if (cache.has(k)) return cache.get(k); if (!X[kind]) return null; const sz = XSIZE[kind] || [2, 2]; const m = new Model(sz[0], sz[1], 40, 0, 3, -18); X[kind](m, variant); const out = m.build(); cache.set(k, out); return out; }
export const hasExtra = (kind) => !!X[kind];
export function disposeCache() { cache.forEach((v) => { if (v.geo) v.geo.dispose(); if (v.glow) v.glow.dispose(); }); cache.clear(); }
export { keyOf };
