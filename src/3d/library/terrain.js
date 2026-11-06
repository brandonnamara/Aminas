/* Aminas — terrain and geology assets (Environment Phase 2, library category A).
   Free-standing pieces in prop voxels (1/8 cell). The island's ground itself is generated from the map at terrain
   scale (1/2 cell) by island3d.js and follows the same material rules; these pieces dress it: cliff segments, rock
   formations, crystals, cave mouths and ancient formations. Each builder is (m, variant, o) and draws centred on 0
   with the ground at y = 0. o.pal lets an island tradition swap the stone and grass (see biomes.js). */
import { PAL, MAGIC } from '../voxstyle.js';
import { hash, pick } from '../voxmesh.js';
import { H, N, X } from '../voxbuild.js';

const T = {};
const P = (o) => Object.assign({ grass: PAL.grass, side: PAL.grassSide, dirt: PAL.dirt, clay: PAL.clay, stone: PAL.stone, dark: PAL.stoneDark, deep: PAL.deepLow, moss: PAL.moss }, (o && o.pal) || {});
// the layer rule shared by every terrain piece: grass cap, a grass lip that drapes, dirt, a clay band, stone, deep rock
function layer(pal, depth, x, y, z, s) { const h = H(x, y, z, s); return depth === 0 ? pick(pal.grass, h) : depth === 1 ? pick(pal.side, h) : depth < 4 ? pick(pal.dirt, h) : depth < 5 ? pick(pal.clay, h) : depth < 12 ? (h < 0.08 ? pick(pal.dark, h * 10) : pick(pal.stone, h)) : pick(pal.deep, h); }

// GRASS BLOCK and SOIL BLOCK: one terrain voxel (4 x 4 prop voxels), the reference cube for colour checks
T.grassBlock = (m, v, o) => { const p = P(o); m.box(-2, 0, -2, 2, 4, 2, (x, y, z) => layer(p, 3 - y, x, y, z, 1)); };
T.soilBlock = (m, v, o) => { const p = P(o); m.box(-2, 0, -2, 2, 4, 2, (x, y, z) => (y === 3 && H(x, y, z, 2) < 0.3 ? pick(p.clay, H(x, z, y)) : pick(p.dirt, H(x, y, z, 3)))); };

// LAYERED CLIFF: a 2-cell run of cliff face with strata, a grass lip, hanging roots and a ledge (3 variants)
T.cliff = (m, v, o) => {
  const p = P(o), W = 8, D = 6, top = 20;
  for (let x = -W; x < W; x++) for (let z = -D; z < D; z++) {
    const bite = Math.round((hash(x + v * 7, 1, 81) - 0.5) * 2 + Math.sin((x + v * 3) * 0.6) * 1.2), face = D - 1 + Math.min(0, bite);
    if (z > face) continue; const bot = -Math.round(hash(x, z, 82 + v) * 3);
    for (let y = bot; y < top; y++) { let c = layer(p, top - 1 - y, x, y, z, 83 + v); if (top - 1 - y >= 5 && top - 1 - y < 12) { const band = Math.floor((y + hash(x >> 2, 0, 84) * 3) / 3) % 3; if (band === 1) c = pick(p.clay, H(x, y, z, 85)); } m.put(x, y, z, c); }
    if (z === face && hash(x, v, 86) < 0.25) for (let k = 1; k < 3 + Math.floor(hash(x, v, 87) * 5); k++) m.put(x, top - 1 - k, z + 1, pick(p.moss.concat(PAL.leaf), H(x, k, z, 88)));
  }
  if (v === 1) m.box(-3, 8, D - 1, 3, 9, D + 2, (x, y, z) => pick(p.grass, H(x, y, z, 89)));                  // a ledge
  if (v === 2) for (let x = -W; x < W; x += 5) for (let k = 0; k < 4; k++) m.put(x, -1 - k, D - 3, k === 3 ? PAL.leaf[0] : PAL.woodDark[k % 2]);   // roots below
};

// STONE FORMATION: a cluster of three weathered pillars of different heights, moss on top
T.stonePillars = (m, v, o) => { const p = P(o); [[-3, -2, 14, 2.4], [3, 0, 10, 2], [-1, 4, 7, 1.7]].forEach(([x, z, h, r], i) => { for (let y = 0; y < h; y++) m.disc(x, z, r - (y > h - 3 ? 0.5 : 0) + Math.sin(y * 0.9 + i) * 0.25, y, y + 1, (xx, yy, zz) => (yy === h - 1 && H(xx, yy, zz, 90) < 0.7 ? pick(p.moss, H(xx, zz, yy)) : pick(p.stone.concat(p.dark), H(xx, yy, zz, 91 + v)))); }); };
// ROCKY OUTCROP: a broken shelf of rock pushing up through the grass
T.outcrop = (m, v, o) => { const p = P(o); for (let x = -7; x < 7; x++) for (let z = -5; z < 5; z++) { const h = Math.round(6 - Math.abs(x) * 0.5 - Math.abs(z) * 0.6 + (hash(x, z, 92 + v) - 0.5) * 3 + (x > 0 ? 2 : 0)); for (let y = 0; y < h; y++) m.put(x, y, z, y === h - 1 && h < 4 ? pick(p.grass, H(x, y, z)) : pick(p.stone.concat(PAL.rock), H(x, y, z, 93))); } };
// MOSSY ROCK: a rounded boulder wearing a thick cap of moss and a fern
T.mossyRock = (m, v, o) => { const p = P(o); m.ball(0, 3, 0, 5 + v, 4, 4.5, (x, y, z) => (y > 3 + (H(x, 0, z, 94) > 0.5 ? 0 : 1) ? pick(p.moss, H(x, y, z, 95)) : pick(PAL.rock.concat(PAL.rockDark), H(x, y, z, 96)))); m.put(-2, 7, 1, PAL.leaf[0]); m.put(-3, 7, 1, PAL.leaf[1]); m.put(-2, 8, 2, PAL.leaf[0]); };
// FLOATING ISLAND EDGE: a corner of island rim (grass lip, strata, a rock root tapering below), for set-dressing
T.islandEdge = (m, v, o) => { const p = P(o); for (let x = -8; x < 8; x++) for (let z = -8; z < 8; z++) { const d = Math.max(x + 8, z + 8); const rim = Math.min(x + 8, z + 8); if (rim > 12) continue; const depth = Math.round(4 + rim * 1.8 + hash(x, z, 97) * 3); for (let y = -depth; y < 1; y++) m.put(x, y, z, layer(p, -y, x, y, z, 98)); if (d < 0) continue; } };

// CRYSTAL CLUSTER: magic made solid. hue: one of MAGIC (egg, water, moon, life, spirit). Glowing shards on a dark base.
T.crystals = (m, v, o) => { const hue = (o && o.hue) || ['egg', 'water', 'moon', 'life', 'spirit'][v % 5], c = MAGIC[hue], dark = '#4a4a62';
  m.ball(0, 0, 0, 4, 2, 4, (x, y, z) => pick(PAL.rock.concat(PAL.rockDark), H(x, y, z, 99)));
  [[0, 0, 9, 1], [-2, 1, 6, 0], [2, -1, 5, 0], [1, 2, 4, 0], [-1, -2, 7, 1]].forEach(([x, z, h, wide], i) => { for (let y = 1; y < 1 + h; y++) { const lean = Math.round((y / h) * (i % 2 ? 1 : -1)); m.put(x + lean, y, z, y === h ? '#ffffff' : c, y >= h - 1 ? true : 'u'); if (wide && y < h - 2) m.put(x + lean + 1, y, z, c, 'u'); } /* self-lit faceted body, glowing tip */ m.put(x, 1, z, dark); }); };
// CAVE ENTRANCE: a dark mouth in a mossy rock face, a few stones on the threshold, a faint glow deep inside
T.caveMouth = (m, v, o) => { const p = P(o); m.ball(0, 0, -2, 10, 12, 7, (x, y, z) => (y > 8 ? pick(p.grass, H(x, y, z)) : H(x, y, z, 100) > 0.82 ? pick(p.moss, H(x, z, y)) : pick(p.stone.concat(p.dark), H(x, y, z, 101)))); m.box(-11, -2, -10, 11, 0, 8, null);
  for (let y = 0; y < 8; y++) { const w = Math.round(Math.sqrt(Math.max(0, 1 - (y / 8) ** 2)) * 4); m.clear(-w, y, 0, w + 1, y + 1, 6); m.box(-w, y, -1, w + 1, y + 1, 0, '#1e1a28'); } m.glow(-1, 1, -1, 1, 3, 0, (o && o.hue && MAGIC[o.hue]) || MAGIC.moon);
  [[-5, 5], [4, 6], [1, 7]].forEach(([x, z]) => m.put(x, 0, z, pick(PAL.rock, H(x, 0, z)))); };
// ANCIENT FORMATIONS: 'arch' (a natural stone arch), 'basalt' (hexagonal columns stepping down), 'ring' (a toppled
// ring of old monoliths half sunk in turf)
T.arch = (m, v, o) => { const p = P(o); for (let a = 0; a <= 32; a++) { const t = a / 32 * Math.PI, x = Math.round(Math.cos(t) * 9), y = Math.round(Math.sin(t) * 11); m.ball(x, y, 0, 2.6, 2.2, 2.6, (xx, yy, zz) => (yy > 11 && H(xx, yy, zz, 102) < 0.6 ? pick(p.moss, H(xx, zz, yy)) : pick(p.stone.concat(p.dark), H(xx, yy, zz, 103)))); } m.box(-13, -3, -4, 13, 0, 4, null); };
T.basalt = (m, v, o) => { for (let i = 0; i < 9; i++) { const x = (i % 3) * 4 - 4, z = Math.floor(i / 3) * 4 - 4, h = 4 + Math.round((8 - (x + z) / 2) * 0.6 + hash(i, v, 104) * 3); m.disc(x + 0.5, z + 0.5, 2.1, 0, h, (xx, y) => (y === h - 1 ? '#5a5a6e' : y % 3 === 0 ? '#3a3a4a' : pick(['#4a4a5c', '#42424f'], H(xx, y, i)))); } };
T.monolithRing = (m, v, o) => { const p = P(o); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, x = Math.round(Math.cos(a) * 8), z = Math.round(Math.sin(a) * 8), fallen = i % 3 === 1; if (fallen) m.box(x - 3, 0, z - 1, x + 3, 2, z + 1, (xx, y, zz) => (y === 1 && H(xx, y, zz, 105) < 0.5 ? pick(p.moss, 0.3) : pick(p.stone, H(xx, y, zz, 106)))); else m.box(x - 1, 0, z - 1, x + 1, 7 + (i % 2) * 3, z + 1, (xx, y, zz) => (H(xx, y, zz, 107) < 0.15 ? pick(p.moss, 0.6) : pick(p.stone, H(xx, y, zz, 108)))); } };

export const TERRAIN = T;

// island use (Phase 2 validation): rocks and crystals as scenery kinds; seed picks the variant / hue
if (!N.mossyRock) N.mossyRock = (m, s) => T.mossyRock(m, (s - 1) % 2);
if (!N.crystals) N.crystals = (m, s) => T.crystals(m, 0, { hue: ['egg', 'moon', 'spirit'][(s - 1) % 3] });
