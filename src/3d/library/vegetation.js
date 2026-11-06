/* Aminas — vegetation assets (Environment Phase 2, library category B).
   Builders are (m, s) with s = 1..3, the seeded variant: every kind ships at least three silhouettes, and the island
   also varies scale and rotation per instance, so no two neighbours repeat. New kinds are registered into the
   island's nature set (voxbuild N), so the island can place them like the existing oak, pine, birch and blossom.
   Rules (art bible section 6): trunks are dark wood, canopies are built from several overlapping blobs (never one
   sphere), leaves are a bluer green than the meadow, and every tree has one accent (fruit, blossom, glow, moss). */
import { PAL, MAGIC } from '../voxstyle.js';
import { hash, pick } from '../voxmesh.js';
import { H, N } from '../voxbuild.js';

const V = {};
const leafy = (s, pal, dark) => (x, y, z) => (H(x, y, z, s) > 0.82 ? pick(dark || PAL.leafDark, H(x, z, y)) : pick(pal || PAL.leaf, H(x, y, z, s + 1)));

// OLD OAK: a gnarled trunk that forks, three canopy lobes, roots spreading over the ground
V.oakOld = (m, s) => {
  const k = 0.9 + hash(s, 1, 11) * 0.2, tr = PAL.woodDark.concat(PAL.wood[1]);
  m.box(-1, 0, -1, 2, Math.round(8 * k), 2, tr); m.box(-2, 0, -1, 3, 2, 2, tr); m.box(-1, 0, -2, 2, 2, 3, tr);
  [[-3, 0, 1], [3, 0, -1], [0, 0, 3], [1, 0, -3]].forEach(([x, , z]) => m.box(x, 0, z, x + 1, 1, z + 1, PAL.woodDark[0]));
  m.box(1, Math.round(7 * k), 0, 4, Math.round(8 * k), 1, tr); m.box(-3, Math.round(6 * k), 0, -1, Math.round(7 * k), 1, tr);
  [[0.5, 12, 0.5, 6.5], [4, 10.5, 1, 4.2], [-3.5, 10, 0, 4], [1, 15, -1, 4]].forEach(([x, y, z, r], i) => m.ball(x, y * k, z, r * k, r * 0.72 * k, r * k, leafy(s + i * 7)));
  if (s === 2) [[5, 9, 3], [-5, 9, 1], [2, 8, 5]].forEach(([x, y, z]) => m.put(x, Math.round(y * k), z, PAL.fruit[1]));
  if (s === 3) for (let i = 0; i < 4; i++) m.put(-1 + i, 1, 2, PAL.moss[i % 2]);
};
// GLOWCAP: a fantasy mushroom tree, a pale stalk with a broad spotted cap whose gills glow
V.glowcap = (m, s) => {
  const h = 9 + s * 2, cap = ['#e85a8a', '#8a64d0', '#4aa8f0'][s - 1], glow = [MAGIC.spirit, MAGIC.moon, MAGIC.water][s - 1];
  for (let y = 0; y < h; y++) m.disc(0.5 + Math.round(Math.sin(y * 0.4) * 0.6), 0.5, y < 2 ? 2 : 1.4, y, y + 1, ['#f2ead8', '#e6dcc4']);
  m.disc(0.5, 0.5, 6, h, h + 1, (x, y, z) => pick([cap], 0)); m.disc(0.5, 0.5, 5, h + 1, h + 2, cap); m.disc(0.5, 0.5, 3.4, h + 2, h + 3, cap);
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + s, r = 2 + (i % 3) * 1.3; m.put(Math.round(Math.cos(a) * r), h + (r > 4 ? 1 : 2), Math.round(Math.sin(a) * r), '#fff6f0'); }
  m.disc(0.5, 0.5, 5.5, h - 1, h, glow, true); m.disc(0.5, 0.5, 2, h - 1, h, null);
  [[3, 0, 2, 3], [-3, 0, -1, 2]].forEach(([x, , z, hh]) => { m.box(x, 0, z, x + 1, hh, z + 1, '#f2ead8'); m.box(x - 1, hh, z - 1, x + 2, hh + 1, z + 2, cap); });
};
// CRYSTALWOOD: a slender silver tree whose leaves are glassy and cyan; magic island tree
V.crystalwood = (m, s) => {
  const h = 9 + s; m.box(0, 0, 0, 1, h, 1, ['#d8dce8', '#c8ccd8']); m.box(1, h - 3, 0, 3, h - 2, 1, '#c8ccd8'); m.box(-2, h - 4, 0, 0, h - 3, 1, '#c8ccd8');
  [[0.5, h + 2, 0.5, 3.2], [3, h, 0.5, 2.2], [-2, h - 1, 0.5, 2]].forEach(([x, y, z, r], i) => m.ball(x, y, z, r, r * 1.1, r, (xx, yy, zz) => (H(xx, yy, zz, 12 + i) > 0.7 ? '#e8fbff' : H(xx, yy, zz, 13) > 0.35 ? '#9ae8ff' : '#6ac8e8'), H(i, s, 14) > 0.5 ? true : undefined));
};
// WEEPING WILLOW: a broad crown with long hanging fronds; for water edges
V.willow = (m, s) => {
  m.box(0, 0, 0, 2, 8, 2, PAL.woodDark); m.ball(1, 11, 1, 6, 3.4, 6, leafy(s + 20, ['#7ac850', '#6ab844', '#8ad860']));
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, x = Math.round(1 + Math.cos(a) * 5.5), z = Math.round(1 + Math.sin(a) * 5.5), len = 4 + Math.floor(hash(i, s, 15) * 5); for (let y = 10; y > 10 - len; y--) m.put(x, y, z, pick(['#7ac850', '#6ab844', '#9ae070'], H(x, y, z, 16))); }
};
// BUSHES: round (a soft mound of leaves), flowering (with blossom spots), berry is the island's existing 'bush'
V.roundBush = (m, s) => { m.ball(0, 2, 0, 3 + s * 0.4, 2.6, 3, leafy(s + 30)); m.ball(2, 2.5, -1, 2, 2, 2, leafy(s + 31)); };
V.flowerBush = (m, s) => { const fc = ['#ff8fb8', '#ffe066', '#b48cff'][s - 1]; m.ball(0, 2, 0, 3.4, 2.8, 3.2, (x, y, z) => (H(x, y, z, 32 + s) > 0.78 ? fc : pick(PAL.leaf, H(x, y, z, 33)))); };
// FLOWERS: a patch in one dominant colour with a second accent (daisies, tulips, bluebells)
V.flowerPatch = (m, s) => { const main = ['#ffffff', '#ff7a5a', '#7a9cff'][s - 1], acc = ['#ffe066', '#ffe066', '#ffffff'][s - 1];
  for (let i = 0; i < 11; i++) { const x = Math.round((hash(i, s, 17) - 0.5) * 7), z = Math.round((hash(i, s, 18) - 0.5) * 7), h = 1 + (i % 3 === 0 ? 1 : 0); m.box(x, 0, z, x + 1, h, z + 1, PAL.leafDark); m.put(x, h, z, i % 4 === 0 ? acc : main); if (s === 2 && i % 2) m.put(x, h + 1, z, main); } };
// TALL GRASS: a clump of blades two to four voxels high, a little seed head on some
V.tallGrass = (m, s) => { for (let i = 0; i < 9; i++) { const x = Math.round((hash(i, s, 19) - 0.5) * 4), z = Math.round((hash(i, s, 20) - 0.5) * 4), h = 2 + Math.floor(hash(i, s, 21) * 3); m.box(x, 0, z, x + 1, h, z + 1, pick(['#6cbc3c', '#7ccc48', '#5aa835'], hash(i, 2, s))); if (h === 4) m.put(x, h, z, '#e8d88a'); } };
// FERN: fronds radiating and arching down, a curled fiddlehead at the centre
V.fernLarge = (m, s) => { for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + s; for (let r = 1; r <= 4; r++) m.put(Math.round(Math.cos(a) * r), r < 3 ? r : 5 - r, Math.round(Math.sin(a) * r), r === 4 ? PAL.leafDark[0] : pick(PAL.leaf, hash(i, r, s))); } m.box(0, 0, 0, 1, 3, 1, PAL.leafDark[0]); m.put(0, 3, 0, '#9ad85a'); };
// MUSHROOMS: a cluster of small caps (s1 red spotted, s2 brown, s3 glowing blue)
V.mushrooms = (m, s) => { const cap = ['#e04a3a', '#a8774a', '#4aa8f0'][s - 1];
  [[0, 0, 3], [2, 1, 2], [-2, 1, 2], [1, -2, 1]].forEach(([x, z, h], i) => { m.box(x, 0, z, x + 1, h, z + 1, '#f2ead8'); m.box(x - (h > 1 ? 1 : 0), h, z - (h > 1 ? 1 : 0), x + (h > 1 ? 2 : 1), h + 1, z + (h > 1 ? 2 : 1), cap, s === 3 ? true : undefined); if (s === 1 && h > 1) m.put(x, h + 1, z, '#ffffff'); }); };
// VINES and HANGING VEGETATION: strands that hang from an overhang (anchor at y = 0, growing down)
V.vines = (m, s) => { for (let i = 0; i < 5; i++) { const x = i * 2 - 4, len = 4 + Math.floor(hash(i, s, 22) * 6); for (let y = 0; y > -len; y--) m.put(x + (y % 3 === 0 ? 1 : 0), y, 0, y === -len + 1 && i % 2 ? pick(PAL.flowers, hash(i, s, 23)) : pick(PAL.leaf.concat(PAL.moss), H(x, y, i, 24))); } };
V.hangingMoss = (m, s) => { for (let x = -4; x < 4; x++) for (let z = -1; z < 1; z++) { const len = 2 + Math.floor(hash(x, z + s, 25) * 5); for (let y = 0; y > -len; y--) if (H(x, y, z, 26) > 0.2) m.put(x, y, z, pick(['#8aa860', '#7a9850', '#9ab870'], H(x, y, z, 27))); } };
// ROOTS: a tangle of exposed roots arching over the ground (for banks and cliff tops)
V.roots = (m, s) => { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + s, len = 5 + (i % 2) * 2; for (let r = 0; r < len; r++) m.put(Math.round(Math.cos(a) * r), Math.round(Math.sin(r / len * Math.PI) * 2), Math.round(Math.sin(a) * r), PAL.woodDark[r % 2]); } m.disc(0, 0, 1.5, 0, 3, PAL.woodDark); };

// register the new kinds with the island
Object.keys(V).forEach((k) => { if (!N[k]) N[k] = V[k]; });
export const VEG = Object.assign({}, V, { oak: N.oak, pine: N.pine, birch: N.birch, blossom: N.blossom, sapling: N.sapling, bush: N.bush, fern: N.fern, pebble: N.pebble, boulder: N.boulder, stump: N.stump });
