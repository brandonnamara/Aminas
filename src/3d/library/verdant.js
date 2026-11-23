/* Aminas — Phase 18B: the Verdant Wilds' landmarks and dungeon entrances (voxel models for the island).
   An older civilisation the jungle has swallowed (biomes.js: verdant): fitted pale stone under thick moss, ivy, roots,
   doorways of two heights. Each model is registered as an island "extra" (X), drawn at its landmark rectangle by
   island3d.js; sizes are in prop voxels (1/8 cell), x along the map's x, z along the map's y, y up.
   Models are built once and cached (voxbuild.js), and all of them merge into the island's shared solid/glow meshes,
   so they add triangles but no draw calls. The gates take one variant: lit (its turn has come) or dark (locked). */
import { PAL, MAGIC } from '../voxstyle.js';
import { hash, pick } from '../voxmesh.js';
import { H, X, N, extraSize } from '../voxbuild.js';
import { MAT } from './kit.js';

const MOSS = ['#5fa34e', '#4f9442', '#6cb35a'], MOSSD = ['#3f7a3a', '#467f3f'], IVY = ['#3f9a4a', '#358a40', '#4aa856'];
const STONE = ['#c4bcac', '#b8b0a0', '#cfc8ba', '#aea696'], STONED = ['#8f8878', '#857e70'];
const stone = (x, y, z) => pick(H(x, y, z, 401) > 0.86 ? STONED : STONE, H(x, z, y, 402));
// moss creeps over the top two rows of anything and drips a little down the sides
function mossTop(m, x0, z0, x1, z1, y, seed) {
  for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) { if (H(x, z, seed, 403) < 0.85) m.put(x, y, z, pick(MOSS, H(x, y, z, 404))); }
  for (let x = x0; x < x1; x++) { if (H(x, 1, seed, 405) < 0.35) for (let k = 1; k < 2 + (H(x, 2, seed) * 4 | 0); k++) m.put(x, y - k, z1, pick(IVY, H(x, k, z1))); }
}
function wall(m, x0, z0, x1, z1, h, seed) { m.box(x0, 0, z0, x1, h, z1, stone); mossTop(m, x0, z0, x1, z1, h, seed); }
function arch(m, x0, x1, z0, z1, h) { // a doorway through a wall along x (clears and frames)
  const w = x1 - x0; for (let y = 0; y < h; y++) { const t = y < h - 2 ? 0 : 1; m.clear(x0 + t, y, z0, x1 - t, y + 1, z1); }
  m.box(x0 - 1, h, z0, x1 + 1, h + 1, z1, STONED); if (w > 4) m.box(x0, h - 1, z0, x0 + 1, h, z1, STONED);
}

// LANDING COVE: a worn landing stone, a mooring post with a lantern, a coil of rope
X.v_landing = (m) => {
  m.box(-4, 0, -4, 4, 1, 4, (x, y, z) => pick(PAL.pathStone.concat(STONE), H(x, y, z, 410))); m.box(-3, 1, -3, 3, 2, 3, null);
  m.box(-3, 0, -3, 3, 1, 3, (x, y, z) => pick(STONED.concat(STONE), H(x, z, 411)));
  m.box(2, 1, -3, 3, 13, -2, PAL.woodDark); m.box(2, 13, -3, 5, 14, -2, PAL.woodDark); m.box(3, 10, -4, 6, 11, -1, '#5a4a3a'); m.glow(4, 11, -3, 5, 13, -2, PAL.glowWarm);
  m.disc(-2, 2, 1.6, 1, 2, '#c8a46a'); m.disc(-2, 2, 0.6, 1, 2, null);
};
// THE OVERGROWN SETTLEMENT: a row of fitted-stone house walls along the beach, doorways of two heights (a tall one
// and a small one with steps beside it), fallen blocks and moss everywhere
X.v_settle = (m) => {
  const W = m.W / 2;
  wall(m, -W, -2, -W + 7, 1, 18, 1); arch(m, -W + 2, -W + 5, -2, 1, 12);                    // a tall doorway
  wall(m, -W + 8, -2, -W + 12, 1, 9, 2);
  wall(m, -W + 13, -2, -W + 22, 1, 22, 3); arch(m, -W + 15, -W + 19, -2, 1, 14);             // the tallest house front
  m.box(-W + 20, 0, -2, -W + 22, 1, 1, null); arch(m, -W + 20, -W + 22, -2, 1, 5);           // the small door
  m.box(-W + 19, 0, 1, -W + 20, 1, 3, STONED); m.box(-W + 19, 1, 1, -W + 20, 2, 2, STONED);  // its little steps
  wall(m, -W + 24, -2, W, 1, 12, 4);
  wall(m, -W + 1, -6, -W + 2, -2, 14, 5); wall(m, W - 2, -6, W - 1, -2, 10, 6);              // side walls going back
  [[-W + 9, 3], [-W + 25, 4], [W - 4, 3]].forEach(([x, z], i) => { m.box(x, 0, z, x + 2 + i % 2, 2, z + 2, stone); m.put(x, 2, z, pick(MOSS, i)); });
  for (let i = 0; i < 14; i++) m.put(Math.round((hash(i, 3, 412) - 0.5) * m.W), 0, 2 + (hash(i, 4, 413) * 4 | 0), pick(MOSSD, i));
};
// The settlement's hearth: a shared fire ring, a deep bowl and a wide one, and a broken wall behind
X.v_settle2 = (m) => {
  const W = m.W / 2;
  wall(m, -W, -3, -W + 8, 0, 16, 7); arch(m, -W + 2, -W + 4, -3, 0, 4); wall(m, W - 7, -3, W, 0, 10, 8);
  m.disc(0, 2, 3.2, 0, 2, STONED); m.disc(0, 2, 2, 1, 2, null); m.glow(-1, 1, 1, 2, 3, 3, PAL.glowWarm); m.put(0, 3, 2, '#ffd86b', true);
  m.disc(-6, 4, 1.4, 0, 3, '#c4703a'); m.disc(-6, 4, 0.7, 2, 3, '#3a2a20');                   // the deep bowl
  m.disc(6, 4, 2.2, 0, 1, '#a8603a'); m.disc(6, 4, 1.4, 1, 2, '#a8603a'); m.disc(6, 4, 1.2, 1, 2, null); // the wide one
};
// THE AQUEDUCT: tall pale arches carrying a channel of running water (the island's landmark you can see from far away)
function aqueduct(m, along) {
  const L = (along ? m.H : m.W) / 2, top = 21;
  for (let t = -L; t <= L; t += 8) {
    const p = (a, b, c, d, e, f, col) => (along ? m.box(a, b, c + t, d, e, f + t, col) : m.box(c + t, b, a, f + t, e, d, col));
    p(-3, 0, -1, 3, top, 2, stone);
    if (H(t, 1, 420) < 0.7) for (let k = 0; k < 6; k++) p(-3, top - 2 - k, 2, -2 + (k % 3), top - 1 - k, 3, pick(IVY, k));
  }
  const span = (a, b, c, d, e, f, col, glow) => (along ? m.box(a, b, c, d, e, f, col, glow) : m.box(c, b, a, f, e, d, col, glow));
  span(-4, top, -L, 4, top + 4, L, stone); span(-2, top + 3, -L, 2, top + 4, L, PAL.water);
  for (let t = -L; t < L; t += 8) for (let a = 1; a < 7; a++) { const y = top - Math.round(Math.sqrt(Math.max(0, 9 - (a - 4) ** 2))); span(-3, y, t + a, 3, top, t + a + 1, stone); }
  for (let t = -L; t < L; t++) { if (H(t, 2, 421) < 0.5) along ? m.put(-4, top + 4, t, pick(MOSS, t & 3)) : m.put(t, top + 4, -4, pick(MOSS, t & 3)); }
  // Phase 18D: running water: bright glints along the channel, and a spill pouring from its far end into the stream
  for (let t = -L + 1; t < L; t += 3) { const g = H(t, 5, 422) < 0.5 ? '#e8fdff' : '#bff4ff'; along ? m.put((t % 2), top + 4, t, g, true) : m.put(t, top + 4, (t % 2), g, true); }
  for (let y = 0; y < top + 3; y++) { const c = y % 3 === 0 ? '#e8fdff' : PAL.water; along ? m.put(0, y, L + 1, c, y % 3 === 0) : m.put(L + 1, y, 0, c, y % 3 === 0); along ? m.put(1, y, L + 1, PAL.water) : m.put(L + 1, y, 1, PAL.water); }
  along ? m.box(-2, 0, L + 1, 3, 1, L + 3, '#e8fdff', true) : m.box(L + 1, 0, -2, L + 3, 1, 3, '#e8fdff', true);
}
X.v_aqueduct = (m) => aqueduct(m, true);
X.v_aqueductw = (m) => aqueduct(m, false);
// THE IVY ARCHIVE: a long stone hall on the north shore, its front a wall of stone shelves, wrapped in ivy, one
// dark doorway (the way in is for a later day)
X.v_archive = (m) => {
  const W = m.W / 2;
  m.box(-W, 0, -4, W, 24, 4, MAT.ashlar); m.box(-W - 1, 24, -5, W + 1, 26, 5, STONED); m.hip(-W, -4, W, 4, 26, STONE);
  arch(m, -3, 3, 2, 4, 16); m.box(-3, 0, 3, 3, 15, 4, '#20180f');
  for (let x = -W + 2; x < W - 2; x += 5) { if (Math.abs(x) < 5) continue; for (let y = 4; y < 20; y += 5) { m.box(x, y, 4, x + 3, y + 3, 5, '#5a4a3a'); m.box(x, y + 1, 4, x + 3, y + 2, 5, (xx) => ['#d8cfa8', '#c4b88e', '#b8ac80'][(xx + y) % 3]); } }
  for (let x = -W; x < W; x++) { const n = Math.round(4 + H(x, 3, 430) * 18); for (let y = 26 - n; y < 26; y++) if (H(x, y, 431) < 0.7) m.put(x, y, 4 + (y % 2), pick(IVY, H(x, y, 432))); }
  mossTop(m, -W, -4, W, 4, 26, 9);
  // Phase 18D: a lantern either side of the door and a few tablets that still glow, filed and waiting
  [-5, 4].forEach((x) => { m.box(x, 0, 5, x + 1, 10, 6, PAL.woodDark); m.box(x - 1, 10, 4, x + 2, 11, 7, '#5a4a3a'); m.glow(x, 11, 5, x + 1, 13, 6, PAL.glowWarm); });
  for (let x = -W + 2; x < W - 2; x += 5) { if (Math.abs(x) < 5 || H(x, 7, 433) < 0.5) continue; m.glow(x + 1, 10, 5, x + 2, 11, 6, '#ffe9b0'); }
};
// THE TWIN SHRINE: one temple split by the stream: the pale half on one bank, the dark-glass half on the other, a
// footbridge between them, a small light in each (warm on the pale side, violet on the dark)
X.v_shrine = (m) => {
  const L = m.H / 2;
  const half = (z0, z1, light) => {
    m.box(-4, 0, z0, 4, 2, z1, light ? '#ece6d6' : '#3a3450');
    [-4, 3].forEach((x) => [z0, z1 - 1].forEach((z) => m.box(x, 2, z, x + 1, 18, z + 1, light ? ['#f2ece0', '#e4dccb'] : ['#2e2a44', '#423a62'])));
    m.box(-5, 18, z0 - 1, 5, 20, z1 + 1, light ? '#fff3c8' : '#5b4f86'); m.hip(-5, z0 - 1, 5, z1 + 1, 20, light ? ['#efe4c0', '#e2d6ae'] : ['#46406a', '#3a3458']);
    m.glow(-1, 4, (z0 + z1) / 2 - 1 | 0, 1, 7, ((z0 + z1) / 2 | 0) + 1, light ? '#fff6c0' : '#c9a8ff');
  };
  half(-L, -L + 8, true); half(L - 8, L, false);
  // Phase 18D: each half holds a column of its own light: warm in the pale half, violet in the dark one
  for (let y = 2; y < 16; y += 2) { m.glow(0, y, -L + 3, 1, y + 1, -L + 5, '#fff3c8'); m.glow(-1, y, L - 5, 0, y + 1, L - 3, '#c9a8ff'); }
  m.glow(-2, 2, -L + 2, 3, 3, -L + 6, '#fff6c0'); m.glow(-2, 2, L - 6, 3, 3, L - 2, '#b89cff');
  m.box(-2, 1, -L + 8, 2, 2, L - 8, PAL.plank); [-3, 2].forEach((x) => m.box(x, 2, -L + 8, x + 1, 4, L - 8, PAL.woodDark));
  for (let z = -L; z < L; z++) if (H(z, 5, 440) < 0.3) m.put(z < 0 ? -5 : 4, 19, z, pick(MOSS, z & 3));
};
// THE STANDING STONE CHOIR: pale stones in a curving line on the east shore, like the Sanctuary's own. On the voxel
// island they carry a faint cool light (the 2D layer adds the slow, irregular pulse; reduced motion keeps it still)
X.v_choir = (m) => {
  const L = m.H / 2;
  [[-1, -L + 3, 14], [1, -L + 9, 19], [0, -2, 23], [-1, 5, 17], [1, L - 4, 12]].forEach(([x, z, h], i) => {
    m.box(x - 1, 0, z - 1, x + 2, h, z + 1, (xx, y) => (y % 4 ? '#dcd8e8' : '#cac6d8')); m.box(x - 1, h, z - 1, x + 2, h + 1, z + 1, '#f2efff');
    m.glow(x, h - 5, z + 1, x + 1, h - 3, z + 2, i === 2 ? '#e8fff0' : MAGIC.egg);
  });
  m.disc(0, 0, 2, 0, 1, '#a8b8c8');
  // Phase 18D: a faint ring of light at the stones' feet, one stone's share slightly greener than the rest
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, x = Math.round(Math.cos(a) * 3), z = Math.round(Math.sin(a) * (L - 1)); m.put(x, 0, z, i % 6 === 0 ? '#e8fff0' : '#cfe8ff', true); }
};
// THE ELDER ROOT: the oldest tree on the island, filling the old landmark slot: roots like walls, a shut door between
// them, a trunk wider than a house and a canopy that shades half the meadow
X.elderroot = (m) => {
  const bark = (x, y, z) => pick(H(x, y, z, 450) > 0.8 ? PAL.woodDark : ['#7a5636', '#6a4a2c', '#86603e'], H(x, z, y, 451));
  for (let y = 0; y < 46; y++) { const r = 7 - y * 0.05 + (y < 6 ? (6 - y) * 0.6 : 0); m.disc(0, 0, r, y, y + 1, bark); }
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.3; for (let t = 0; t < 16; t++) { const x = Math.round(Math.cos(a) * (6 + t)), z = Math.round(Math.sin(a) * (6 + t)), h = Math.max(1, Math.round(9 - t * 0.6)); m.box(x - 1, 0, z - 1, x + 1, h, z + 1, bark); if (H(i, t, 452) < 0.25) m.put(x, h, z, pick(MOSS, t)); } }
  for (let y = 0; y < 13; y++) { const w = Math.round(Math.sqrt(Math.max(0, 1 - (y / 13) ** 2)) * 3); m.box(-w, y, 6, w + 1, y + 1, 9, '#2a1a10'); }   // the shut door
  m.box(-1, 5, 8, 2, 7, 9, '#e8c870');
  [[0, 58, 0, 16, 9, 16], [-10, 53, 6, 10, 7, 9], [10, 55, -5, 11, 7, 10], [3, 65, -4, 11, 6, 11], [-6, 62, -9, 9, 6, 8]].forEach(([x, y, z, rx, ry, rz], i) =>
    m.ball(x, y, z, rx, ry, rz, (xx, yy, zz) => pick(yy > y + ry * 0.4 ? ['#4fbf63', '#5fd070', '#3fa858'] : ['#2f8f48', '#26783c', '#3a9a50'], H(xx, yy, zz, 453 + i))));
  [[-11, 45, 4], [9, 43, -9], [13, 47, 6], [-4, 42, 12]].forEach(([x, y, z]) => { for (let k = 0; k < 12; k++) m.put(x, y - k, z, pick(IVY, k)); });
  [[-9, 51, 9], [11, 50, 2], [2, 53, 13], [-12, 55, -6]].forEach(([x, y, z]) => m.glow(x, y, z, x + 1, y + 1, z + 1, '#9af2ff'));
  // Phase 18D: more lights under the canopy, and the threshold of the door glowing faintly (the Island Boss is home)
  for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 8 + (i % 4) * 3; m.glow(Math.round(Math.cos(a) * r), 38 + (i % 5) * 3, Math.round(Math.sin(a) * r), Math.round(Math.cos(a) * r) + 1, 39 + (i % 5) * 3, Math.round(Math.sin(a) * r) + 1, i % 3 ? '#9af2ff' : '#d8ffb0'); }
  m.glow(-2, 0, 9, 3, 1, 10, '#bff7a8');
};

// THE TEN ENTRANCES: one shape language (two moss-capped posts, a lintel, a dark way in), each with its own accent:
// its dungeon's element colour and a sign of the place (steps, water, glowcaps, shelves, lanterns, a split arch,
// rope, a moon pool, a stone, roots). Lit = its turn has come (sealed for now); dark = it opens later.
const GATE = {
  v_mossgate: { c: '#c49a5a', s: 'steps' }, v_aqueduct: { c: '#5ab8e8', s: 'water' }, v_spore: { c: '#6ad06a', s: 'caps' },
  v_archive: { c: '#b8c4d4', s: 'shelf' }, v_glow: { c: '#ff9a4a', s: 'lamps' }, v_twinshrine: { c: '#ffe58a', s: 'split' },
  v_canopy: { c: '#bfe8ff', s: 'rope' }, v_moonwell: { c: '#c9b8ff', s: 'pool' }, v_choir: { c: '#ff9ee0', s: 'stone' }, v_elderroot: { c: '#6ad06a', s: 'roots' },
};
function gate(m, g, lit) {
  const post = (x) => { m.box(x, 0, -1, x + 2, 16, 1, stone); m.box(x, 16, -1, x + 2, 17, 1, MOSS); };
  post(-5); post(3); m.box(-6, 16, -2, 6, 19, 2, stone); mossTop(m, -6, -2, 6, 2, 19, 11);
  m.box(-3, 0, -1, 3, 15, 0, lit ? g.c : '#2a3326', false); if (lit) { m.glow(-3, 1, 0, 3, 2, 1, g.c); m.glow(-1, 19, -1, 1, 21, 1, g.c); }
  const c = g.c;
  if (g.s === 'steps') for (let i = 0; i < 3; i++) m.box(-4, 0, 1 + i * 2, 4, 3 - i, 3 + i * 2, STONED);
  if (g.s === 'water') { m.box(-6, 0, 1, 6, 1, 5, PAL.water); m.box(-6, 0, 5, 6, 1, 6, STONED); }
  if (g.s === 'caps') [[-6, 2], [6, 3], [-4, 4]].forEach(([x, z], i) => { m.box(x, 0, z, x + 1, 3 + i, z + 1, '#e8e0c8'); m.ball(x + 0.5, 3 + i, z + 0.5, 1.6, 0.8, 1.6, lit ? c : '#7a9a70', lit); });
  if (g.s === 'shelf') { m.box(-7, 0, 1, -5, 8, 3, '#5a4a3a'); for (let y = 1; y < 8; y += 2) m.box(-7, y, 2, -5, y + 1, 3, '#d8cfa8'); }
  if (g.s === 'lamps') [-7, 6].forEach((x) => { m.box(x, 0, 1, x + 1, 8, 2, PAL.woodDark); m.box(x, 8, 1, x + 1, 10, 2, lit ? c : '#6a5a4a', lit); });
  if (g.s === 'split') { m.box(-6, 16, -2, 0, 19, 2, '#ece6d6'); m.box(0, 16, -2, 6, 19, 2, '#3a3450'); }
  if (g.s === 'rope') { for (let x = -7; x < 8; x++) m.put(x, 12 - Math.round(Math.abs(x) * 0.3), 1, '#c8a46a'); }
  if (g.s === 'pool') { m.disc(0, 4, 3, 0, 1, '#2a3a6a'); m.disc(0, 4, 1.4, 0, 1, lit ? c : '#4a5a7a', lit); }
  if (g.s === 'stone') { m.box(6, 0, 1, 8, 12, 3, '#dcd8e8'); m.box(6, 12, 1, 8, 13, 3, '#f2efff'); }
  if (g.s === 'roots') for (let i = 0; i < 4; i++) { const x = -7 + i * 4; m.box(x, 0, 1 + (i % 2), x + 2, 2 + (i % 3), 3 + (i % 2), ['#7a5636', '#6a4a2c']); }
}
Object.keys(GATE).forEach((id) => { X['v_gate_' + id] = (m, lit) => gate(m, GATE[id], lit); });

extraSize('v_landing', 1, 1, 20); extraSize('v_settle', 4, 1, 30); extraSize('v_settle2', 3, 1, 24);
extraSize('v_aqueduct', 1, 4, 40); extraSize('v_aqueductw', 5, 1, 40); extraSize('v_archive', 4, 1, 36);
extraSize('v_shrine', 1, 3, 30); extraSize('v_choir', 1, 3, 30); extraSize('elderroot', 3, 3, 76);
Object.keys(GATE).forEach((id) => extraSize('v_gate_' + id, 1, 1, 26));

/* ---------------------------------------------------------------- Phase 18D: Verdant obstacles in 3D
   The island's own clearable obstacles had no voxel models, so on the voxel island they were drawn as flat 2D pictures
   over the 3D ground. Now each has one (cached per variant like every tree and rock), so the 2D art steps aside. */
const LEAFV = ['#2f8f48', '#26783c', '#3a9a50', '#358a40'], LEAFL = ['#4fbf63', '#5fd070', '#3fa858'];
const barkV = (x, y, z) => pick(H(x, y, z, 470) > 0.8 ? PAL.woodDark : ['#7a5636', '#6a4a2c', '#86603e'], H(x, z, y, 471));
// ELDER ROOT (a younger cousin of the great tree): a squat gnarled trunk on spreading roots, a dark heavy canopy, moss
N.elderroot = (m, v) => {
  for (let y = 0; y < 14; y++) m.disc(0, 0, 2.5 - y * 0.06 + (y < 3 ? (3 - y) * 0.6 : 0), y, y + 1, barkV);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + v; for (let t = 0; t < 5; t++) { const x = Math.round(Math.cos(a) * (2.5 + t)), z = Math.round(Math.sin(a) * (2.5 + t)); m.box(x, 0, z, x + 1, Math.max(1, 3 - (t >> 1)), z + 1, barkV); } }
  m.ball(0, 18, 0, 6.5 + (v % 2) * 0.5, 4, 6.5, (x, y, z) => pick(y > 19 ? LEAFL : LEAFV, H(x, y, z, 472 + v)));
  m.ball(-3 + v, 15, 3, 3, 2.5, 3, (x, y, z) => pick(LEAFV, H(x, y, z, 475)));
  for (let k = 0; k < 4; k++) { const x = Math.round((hash(k, v, 476) - 0.5) * 11), z = Math.round((hash(v, k, 477) - 0.5) * 11); for (let j = 0; j < 3 + (k % 3); j++) m.put(x, 14 - j, z, pick(MOSS, j)); }
};
// VINE TREE: a slender trunk under a light canopy, curtains of ivy hanging to the ground, a few flowers in the vines
N.vinetree = (m, v) => {
  for (let y = 0; y < 20; y++) m.box(0, y, 0, 2, y + 1, 2, barkV);
  m.ball(1, 22, 1, 5.5, 3.5, 5.5, (x, y, z) => pick(LEAFV.concat(LEAFL), H(x, y, z, 480 + v)));
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + v * 0.3, x = Math.round(1 + Math.cos(a) * 5), z = Math.round(1 + Math.sin(a) * 5), len = 5 + Math.floor(hash(k, v, 481) * 9);
    for (let j = 0; j < len; j++) m.put(x, 20 - j, z, j === len - 1 && k % 3 === 0 ? ['#ff8fb8', '#ffe066', '#b48cff'][k % 3] : pick(IVY, H(k, j, v))); }
};
// MOSSY RUIN: a broken corner of fitted pale stone, thick moss, a fallen block and a small doorway (two heights again)
N.mossruin = (m, v) => {
  wall(m, -7, -7, 7, -5, 9 + v * 2, 20 + v); wall(m, -7, -5, -5, 6, 6 + v, 22);
  if (v !== 2) { m.clear(-2, 0, -7, 1, 6, -5); m.box(-3, 6, -7, 2, 7, -5, STONED); }
  m.box(2, 0, 2, 6, 3, 5, stone); mossTop(m, 2, 2, 6, 5, 3, 23 + v);
  for (let i = 0; i < 8; i++) m.put(Math.round((hash(i, v, 482) - 0.3) * 10), 0, Math.round((hash(v, i, 483) - 0.3) * 10), pick(MOSSD, i));
};
// MOSSY ROCK: a rounded grey-green boulder under a thick cap of moss, with a fern at its foot
N.mossrock = (m, v) => {
  m.ball(0, 2.5, 0, 3.6 + v * 0.3, 3, 3.2, (x, y, z) => (y > 2 + (H(x, 0, z, 484) > 0.5 ? 0 : 1) ? pick(MOSS, H(x, y, z, 485)) : pick(STONE.concat(STONED), H(x, y, z, 486))));
  for (let i = 0; i < 5; i++) { const a = i * 1.25 + v; m.put(Math.round(3 + Math.cos(a) * 1.5), 0, Math.round(2 + Math.sin(a) * 1.5), pick(LEAFL, i)); }
};
