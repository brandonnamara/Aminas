/* Aminas — environmental decoration and water/atmosphere props (Environment Phase 2, library categories D and E).
   Small hand-made objects that tell the island's story: who lives here, what they do, what came before. Each is
   (m, variant, o), centred on 0, ground at y = 0. Water systems that are effects rather than objects (the ocean,
   waterfalls, mist, motes, magic sparks, clouds) live in island3d.js and are catalogued as systems. */
import { PAL, MAGIC, EL } from '../voxstyle.js';
import { hash, pick } from '../voxmesh.js';
import { H, B, X } from '../voxbuild.js';
import { MAT } from './kit.js';

const D = {};
// LIGHT: post lantern (the island's), wall/standing torch, hanging festival lantern
D.lanternPost = (m, v) => { m.box(-1, 0, -1, 2, 1, 2, PAL.stoneDark); m.box(0, 1, 0, 1, 12, 1, PAL.woodDark); m.box(0, 12, 0, 3, 13, 1, PAL.woodDark); m.box(2, 9, -1, 5, 10, 2, '#5a4a3a'); m.glow(2, 10, -1, 5, 12, 2, v === 2 ? MAGIC.egg : PAL.glow); m.box(2, 12, -1, 5, 13, 2, '#5a4a3a'); };
D.torch = (m) => { m.box(0, 0, 0, 1, 6, 1, PAL.woodDark); m.box(-1, 5, -1, 2, 6, 2, MAT.iron[0]); m.glow(0, 6, 0, 1, 8, 1, PAL.glowWarm); m.glow(-1, 6, 0, 0, 7, 1, '#ffd86b'); };
// MONUMENTS: statue (the island's guardian), obelisk with a glowing rune band, ruined column standing and fallen
D.statue = (m) => B.statue(m);
D.obelisk = (m, v, o) => { const c = MAGIC[(o && o.hue) || 'egg']; m.box(-4, 0, -4, 4, 2, 4, MAT.ashlar); for (let y = 2; y < 22; y++) { const w = y < 18 ? 2 : 1; m.box(-w, y, -w, w, y + 1, w, y % 6 === 4 ? c : MAT.ashlar, y % 6 === 4 ? true : undefined); } m.box(-1, 22, -1, 1, 24, 1, '#e8e2d4'); };
D.columnRuin = (m, v) => { const sw = MAT.ashlar; m.box(-3, 0, -3, 3, 1, 3, sw); if (v === 1) { for (let y = 1; y < 12 - (hash(1, 2, 3) * 3 | 0); y++) m.disc(0, 0, 2.2, y, y + 1, (x, yy, z) => (yy % 4 === 0 ? '#bdb4a3' : '#d3ccbe')); m.box(-1, 11, -1, 1, 12, 0, '#d3ccbe'); }
  else { for (let x = -8; x < 6; x++) m.box(x, 1, -2, x + 1, 3, 2, x % 4 === 0 ? '#bdb4a3' : '#d3ccbe'); m.box(-3, 1, -3, 3, 4, 3, null); m.box(-3, 1, -3, 3, 2, 3, sw); }
  for (let i = 0; i < 6; i++) m.put(Math.round((hash(i, v, 31) - 0.5) * 10), v === 1 ? 1 : 3, Math.round((hash(i, v, 32) - 0.5) * 4), pick(PAL.moss, hash(i, 3, v))); };
// MAGIC: rune stone (a standing slab with glowing runes), orb pedestal (a floating orb over a carved plinth), crystal pylon
D.runeStone = (m, v, o) => { const c = MAGIC[(o && o.hue) || ['spirit', 'moon', 'life'][(v - 1) % 3]]; m.box(-3, 0, -1, 3, 10, 1, (x, y, z) => pick(PAL.stone.concat(PAL.stoneDark), H(x, y, z, 33))); m.box(-2, 10, -1, 2, 11, 1, PAL.stone); [[-1, 3], [1, 5], [-1, 7], [0, 8], [1, 2]].forEach(([x, y]) => m.glow(x, y, 1, x + 1, y + 1, 2, c)); m.put(-3, 9, 0, PAL.moss[0]); m.put(2, 10, 0, PAL.moss[1]); };
D.orbPedestal = (m, v, o) => { const c = MAGIC[(o && o.hue) || 'egg']; m.box(-3, 0, -3, 3, 1, 3, MAT.ashlar); m.box(-2, 1, -2, 2, 6, 2, MAT.ashlar); m.box(-3, 6, -3, 3, 7, 3, PAL.gold); m.ball(0, 10, 0, 2.2, 2.2, 2.2, c, true); m.ball(0, 10, 0, 1.2, 1.2, 1.2, '#ffffff', true); };
D.crystalPylon = (m, v, o) => { const c = MAGIC[(o && o.hue) || 'water']; m.ball(0, 0, 0, 3, 2, 3, PAL.rock); for (let y = 1; y < 14; y++) { const w = y < 10 ? 1 : 0; m.box(-w, y, -w, w + 1, y + 1, w + 1, y === 13 ? '#ffffff' : c, true); } };
// STORAGE AND WORK: barrel, crate (single and stacked), sack, pot, bucket, log pile, cart wheel, haystack
D.barrel = (m) => { m.disc(0, 0, 2.6, 0, 6, (x, y, z) => (y === 1 || y === 4 ? MAT.iron[0] : pick(PAL.wood, H(x, y, z, 34)))); m.disc(0, 0, 2.1, 5, 6, PAL.plank[0]); };
D.crate = (m, v) => { const one = (x, y, z) => { m.box(x, y, z, x + 4, y + 4, z + 4, (xx, yy, zz) => { const e = (xx === x || xx === x + 3) + (yy === y || yy === y + 3) + (zz === z || zz === z + 3); return e >= 2 ? PAL.woodDark[0] : PAL.plank[(xx + yy + zz) % 2]; }); }; one(-2, 0, -2); if (v >= 2) one(2, 0, -1); if (v === 3) one(0, 4, -1); };
D.sacks = (m) => { [[0, 0], [3, 1], [1, 3]].forEach(([x, z], i) => { m.ball(x, 1.6, z, 1.6, 1.8, 1.6, ['#d8c49a', '#c8b48a']); m.put(x, 3 + (i === 0 ? 1 : 0), z, '#8a6a4a'); }); };
D.pots = (m) => { [[0, 0, 3, '#c4703a'], [3, 1, 2, '#a8603a'], [-2, 2, 2, '#d88a4a']].forEach(([x, z, h, c]) => { m.disc(x, z, 1.4, 0, h, c); m.disc(x, z, 0.8, h - 1, h, '#3a2a20'); }); };
D.bucket = (m) => { m.disc(0, 0, 1.6, 0, 3, MAT.plank); m.disc(0, 0, 1, 2, 3, '#4aa8f0'); m.box(-2, 3, 0, 2, 4, 1, MAT.iron[0]); };
D.logPile = (m) => { for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) { const z = -3 + i * 2 + r; m.box(-4, r * 2, z, 4, r * 2 + 2, z + 2, (x, y, zz) => (x === -4 || x === 3 ? '#c9965e' : pick(PAL.woodDark.concat(PAL.wood[1]), H(x, y, zz, 35)))); } };
D.cartWheel = (m) => { for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; m.put(Math.round(Math.cos(t) * 4), 4 + Math.round(Math.sin(t) * 4), 0, PAL.woodDark[0]); } for (let i = -3; i <= 3; i++) { m.put(i, 4, 0, PAL.wood[0]); m.put(0, 4 + i, 0, PAL.wood[0]); } m.put(0, 4, 1, MAT.iron[0]); };
D.haystack = (m) => { m.ball(0, 2, 0, 4, 4, 3.6, MAT.thatch); m.box(-4, -2, -4, 5, 0, 5, null); };
// SIGNS AND SEATS: a signpost with arrows, the island's bench
D.signpost = (m) => { m.box(0, 0, 0, 1, 10, 1, PAL.woodDark); m.box(1, 8, 0, 6, 10, 1, PAL.plank[0]); m.put(6, 9, 0, PAL.plank[0]); m.box(-5, 5, 0, 0, 7, 1, PAL.plank[1]); m.put(-6, 6, 0, PAL.plank[1]); m.put(2, 9, 1, '#5a3a20'); m.put(4, 9, 1, '#5a3a20'); m.put(-3, 6, 1, '#5a3a20'); };
D.bench = (m) => B.bench(m);
// WATER FEATURES: a lily pond (still water in a stone rim), a stream segment (moving water between mossy banks),
// a trough, the island's fountain
D.pond = (m, v) => { m.disc(0, 0, 7, 0, 2, (x, y, z) => pick(PAL.stone.concat(PAL.moss), H(x, y, z, 36))); m.disc(0, 0, 6, 0, 2, null); m.disc(0, 0, 6, 0, 1, (x, y, z) => ((x * 3 + z) % 7 === 0 ? '#e8f8ff' : Math.hypot(x, z) < 3 ? '#2f8cc8' : '#4fb6e8'));
  [[-2, 2], [3, -1], [1, 3]].forEach(([x, z]) => { m.box(x, 1, z, x + 2, 2, z + 2, '#4a9a3a'); if (v !== 2) m.put(x, 2, z, '#ffd0e0'); }); m.put(-5, 1, 2, PAL.leaf[0]); m.box(5, 1, -4, 6, 4, -3, '#6ab844'); };
D.stream = (m, v) => { for (let x = -8; x < 8; x++) { const c = Math.round(Math.sin((x + v * 4) * 0.35) * 1.5); for (let z = -6; z < 6; z++) { const d = Math.abs(z - c); if (d < 2) m.put(x, 0, z, (x + z) % 5 === 0 ? '#e8f8ff' : '#4fb6e8'); else if (d < 4) m.put(x, 0, z, pick(PAL.moss.concat(PAL.stone), H(x, 0, z, 37))); else m.put(x, 0, z, pick(PAL.grass, H(x, 0, z, 38))); } } [[-5, 2], [3, -3]].forEach(([x, z]) => m.put(x, 1, z, pick(PAL.rock, 0.4))); };
D.trough = (m) => { m.box(-4, 0, -2, 4, 3, 2, MAT.stone); m.box(-3, 1, -1, 3, 3, 1, null); m.box(-3, 1, -1, 3, 2, 1, '#4fb6e8'); };
D.fountain = (m) => B.fountain(m);
// CLOUD PUFF: the voxel cloud used below and around islands (systems in island3d.js use the same construction)
D.cloud = (m, v) => { for (let k = 0; k < 5; k++) { const px = Math.round((hash(k, v, 39) - 0.5) * 12), pz = Math.round((hash(k, v, 40) - 0.5) * 4), r = 3 + Math.floor(hash(k, v, 41) * 3); m.ball(px, 2, pz, r, 2, r * 0.7, pick(PAL.cloud, hash(k, 1, v))); } };

export const DECOR = D;
export { EL };

// island use (Phase 2 validation): props for the jetty
if (!X.crate) X.crate = (m) => D.crate(m, 3);
if (!X.barrel) X.barrel = (m) => D.barrel(m);
if (!X.sacks) X.sacks = (m) => D.sacks(m);
