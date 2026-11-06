/* Aminas — island identity framework (Environment Phase 2, Stage D; art bible section 11).
   An island is not a recolour: each profile changes climate, geology, vegetation, architecture, atmosphere, light,
   decoration and the depth of its ancient history. The Starter profile describes the island as it is today (the
   benchmark); the others are SPECIFICATIONS for future islands, demonstrated only as small vignettes in the library
   viewer. No island in the game reads these profiles yet except as documentation; island3d.js keeps its own values. */
import { PAL, MAGIC } from '../voxstyle.js';
import { hash, pick } from '../voxmesh.js';
import { H, N } from '../voxbuild.js';
import { MAT, at, foundation, storey, roof, door, windowZ, chimney, roundTower, roundWindow } from './kit.js';
import { VEG } from './vegetation.js';
import { TERRAIN } from './terrain.js';
import { DECOR } from './decor.js';

export const BIOMES = {
  starter: {
    name: 'Sunlit Sanctuary (Starter Island)', status: 'implemented: the benchmark',
    climate: 'temperate spring meadow, gentle breeze',
    pal: {},                                                     // the base palette in voxstyle.js
    geology: 'layered grass, earth, orange clay and grey coursed stone; a tapering rock root; mossy outcrops; standing stones',
    vegetation: { oak: 3, pine: 3, birch: 2, blossom: 2, roundBush: 2, flowerPatch: 2, tallGrass: 2, fernLarge: 1, mushrooms: 1 },
    architecture: 'timber-framed plaster over dressed pale stone; red, blue and green tiled roofs; flower boxes and banners',
    walls: 'timber', roofMat: 'red', signature: 'the Hatchery: hip roof crowned by a nest and a living egg',
    atmosphere: { sky: ['#4f8ee0', '#9fd0f6'], haze: '#bfe0f6', particles: 'pollen and soft egg-blue magic motes', clouds: 'white voxel banks below the island' },
    light: { sun: '#ffe6b8', sunI: 2.2, sky: '#eaf6ff', ground: '#b39a6c', mood: 'late-morning sun, short soft shadows' },
    decor: 'lanterns, benches, fountains, signposts, crates, flower beds',
    decay: 0.3, history: 'a sanctuary being restored: ruins become buildings as the player heals the island',
  },
  verdant: {
    name: 'Verdant Reach', status: 'specification + vignette demo',
    climate: 'warm, humid jungle terraces; frequent mist and rain-fed waterfalls',
    pal: { grass: ['#4fb84a', '#45aa40', '#5cc854', '#3f9e3a'], side: ['#3f9e3a', '#358f34'], dirt: ['#7a5232', '#6e4a2c'], clay: ['#a86842', '#9a5e3a'], stone: ['#8a9a88', '#7e8e7c', '#96a694'], dark: ['#5e6e5c'], moss: ['#4aa840', '#3f9a38', '#58b84c'] },
    geology: 'stepped terraces of mossy green-grey stone, deep plunge pools, natural arches, cave mouths behind falls',
    vegetation: { willow: 3, glowcap: 1, fernLarge: 4, oakOld: 2, flowerBush: 2, vines: 3, hangingMoss: 2, mushrooms: 2 },
    architecture: 'vine-wrapped temples of mossy ashlar on terraces; stepped pyramid roofs in green and gold; rope bridges',
    walls: 'rubble', roofMat: 'green', signature: 'a stepped temple crown with a life-green crystal heart',
    atmosphere: { sky: ['#3fa0b8', '#a8f0d8'], haze: '#c8f0dc', particles: 'fireflies and drifting spores', clouds: 'low mist banks in the valleys' },
    light: { sun: '#fff0c0', sunI: 1.9, sky: '#e0fff0', ground: '#6a8a50', mood: 'green-gold light through canopy, deep cool shade' },
    decor: 'rune stones, mossy columns, rope bridges, giant mushrooms, totems',
    decay: 0.7, history: 'an older civilisation the jungle has swallowed: most stone is ruin, roots split the walls',
  },
  obsidian: {
    name: 'Obsidian Forge', status: 'specification + vignette demo',
    climate: 'hot volcanic highland; ash on the wind, ember-lit nights',
    pal: { grass: ['#8a8a5a', '#7e7e52', '#969662'], side: ['#6e6a4e', '#625e46'], dirt: ['#4a3a34', '#3e302c'], clay: ['#a8452c', '#c0583a'], stone: ['#4a4a5c', '#42424f', '#55556a'], dark: ['#2e2e3a'], deep: ['#2a2232', '#241e2c'], moss: ['#6a6e48'] },
    geology: 'black basalt columns, glassy obsidian shards, glowing lava seams in the cliffs, ash plains',
    vegetation: { charredTree: 3, tallGrass: 2, mushrooms: 1, roots: 2 },
    architecture: 'heavy brick and iron forges on basalt plinths; slate hip roofs; tall chimneys; few windows, all ember-lit',
    walls: 'brick', roofMat: 'slate', signature: 'twin forge chimneys venting ember light',
    atmosphere: { sky: ['#1a1030', '#d0587e'], haze: '#5a2a4e', particles: 'rising embers', clouds: 'ash-grey smoke banks' },
    light: { sun: '#ff9a6a', sunI: 1.6, sky: '#6a4a8a', ground: '#4a2a2a', mood: 'red-gold dusk, long dramatic shadows, strong ember glows' },
    decor: 'anvils, ore carts, crystal pylons (ember), chains, iron lanterns',
    decay: 0.5, history: 'a working forge island built over an older, cooled one',
  },
  celestial: {
    name: 'Celestial Spire', status: 'specification + vignette demo',
    climate: 'high, thin, cold air above a sea of clouds; perpetual twilight',
    pal: { grass: ['#c8c0f0', '#b8b0e8', '#d4ccf8'], side: ['#a8a0dc', '#9c94d0'], dirt: ['#8a84b8', '#7e78ac'], clay: ['#b8a8e8', '#c8b8f0'], stone: ['#dcd8f0', '#ccc8e4', '#e8e4f8'], dark: ['#9a96ba'], deep: ['#6a6aa8', '#5d5a9a'], moss: ['#a8e8ff', '#98d8f0'] },
    geology: 'pale moon-stone shelves, floating monolith rings, crystal clusters, islands tethered by light',
    vegetation: { crystalwood: 4, flowerPatch: 1, tallGrass: 1 },
    architecture: 'slender moon-stone towers with cone roofs and gold bands; bridges of light; round windows',
    walls: 'slate', roofMat: 'purple', signature: 'a spire crowned with a moon crystal',
    atmosphere: { sky: ['#0d1234', '#b8a8e8'], haze: '#c8c4f0', particles: 'slow stars and moon motes', clouds: 'a cloud sea far below' },
    light: { sun: '#dce4ff', sunI: 1.4, sky: '#c8d0ff', ground: '#6a6aa8', mood: 'cool moonlight with warm window glows' },
    decor: 'orb pedestals, obelisks, crystal pylons (moon), monolith rings',
    decay: 0.15, history: 'ancient and untouched; the stillness of something waiting',
  },
};

// a charred tree for the volcanic profile (also registered with the library vegetation)
VEG.charredTree = (m, s) => { m.box(0, 0, 0, 1, 8 + s, 1, '#2e2a2a'); m.box(1, 5 + s, 0, 4, 6 + s, 1, '#2e2a2a'); m.box(-3, 4 + s, 0, 0, 5 + s, 1, '#2e2a2a'); m.box(3, 6 + s, 0, 4, 9 + s, 1, '#3a3434'); m.put(0, 8 + s, 0, '#ff7a2a', true); if (s === 2) m.put(-3, 5 + s, 0, '#ff9a5a', true); };
if (!N.charredTree) N.charredTree = VEG.charredTree;

// DEMONSTRATION VIGNETTE: a small floating islet dressed in a profile's geology, vegetation, one house in its
// architectural tradition and a few of its props. For the viewer and the art bible only.
export function vignette(m, id) {
  const b = BIOMES[id], pal = Object.assign({ grass: PAL.grass, side: PAL.grassSide, dirt: PAL.dirt, clay: PAL.clay, stone: PAL.stone, dark: PAL.stoneDark, deep: PAL.deepLow, moss: PAL.moss }, b.pal);
  const R = 22;
  for (let z = -R; z <= R; z++) for (let x = -R; x <= R; x++) {
    const d = Math.hypot(x, z) / (R * (0.86 + hash(x >> 2, z >> 2, 51) * 0.18)); if (d > 1) continue;
    const depth = Math.round((1 - d) * 26 + hash(x, z, 52) * 3) + 3, terrace = id === 'verdant' && x + z > 8 ? 4 : 0;
    for (let y = -depth; y < 1 + terrace; y++) { const k = terrace - y; const h = H(x, y, z, 53); m.put(x, y, z, k === 0 ? pick(pal.grass, h) : k === 1 ? pick(pal.side, h) : k < 4 ? pick(pal.dirt, h) : k < 6 ? pick(pal.clay, h) : y > -16 ? pick(pal.stone, h) : pick(pal.deep, h)); }
  }
  const lift = (x, z) => (id === 'verdant' && x + z > 8 ? 4 : 0) + 1;
  // a house in the island's tradition (back left)
  const hx = -9, hz = -9, hy = lift(hx, hz), hm = at(m, hx, hy, hz);
  if (id === 'celestial') { const t = roundTower(hm, 0, 0, 4.5, 0, 18, MAT.slateStone, { band: PAL.gold }); roof(hm, -5, t, -5, 5, 5, 'cone', MAT.roof('purple'), { overhang: 1 }); roundWindow(hm, 0, 9, 4, 1, true); door(hm, 0, 0, 4, 'arched', { light: MAGIC.moon, step: false }); }
  else { const kind = b.walls, y0 = foundation(hm, -7, -6, 7, 6, { style: id === 'obsidian' ? 'plinth' : 'rubble', h: 1, mat: id === 'obsidian' ? MAT.slateStone : MAT.stone }); const t = storey(hm, -6, y0, -5, 6, 5, 8, kind, { quoins: true });
    door(hm, -2, y0, 5, id === 'verdant' ? 'arched' : 'plank', { light: id === 'obsidian' ? '#ff7a2a' : PAL.glowWarm }); windowZ(hm, 2, y0 + 3, 5, 2, 2, true);
    roof(hm, -6, t, -5, 6, 5, id === 'verdant' ? 'pyramid' : id === 'obsidian' ? 'hip' : 'gable-z', MAT.roof(b.roofMat), { gableWall: MAT.plaster });
    if (id === 'obsidian') { chimney(hm, -5, t - 1, -4, 12, 'brick'); chimney(hm, 2, t - 1, -4, 9, 'brick'); }
    if (id === 'verdant') for (let i = 0; i < 6; i++) for (let y = t - 1; y > t - 5 - (i % 3); y--) hm.put(-6 + i * 2, y, 5, pick(PAL.leaf, H(i, y, 3))); }
  // vegetation by weight, placed on a loose ring so the house and a clearing stay open
  const kinds = []; Object.entries(b.vegetation).forEach(([k, w]) => { for (let i = 0; i < w; i++) kinds.push(k); });
  for (let i = 0; i < 9; i++) { const a = 0.5 + i * 0.62, r = 12 + (i % 3) * 3, x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r); if (x < -2 && z < -2) continue; const k = kinds[Math.floor(hash(i, 7, id.length) * kinds.length)], fn = VEG[k]; if (!fn || k === 'vines' || k === 'hangingMoss') continue; fn(at(m, x, lift(x, z), z), 1 + (i % 3)); }
  // geology and props
  if (id === 'verdant') { TERRAIN.arch(at(m, 10, 5, -8), 1, { pal }); VEG.vines(at(m, 14, -1, 12), 2); DECOR.runeStone(at(m, 2, 1, 12), 3, { hue: 'life' }); }
  if (id === 'obsidian') { TERRAIN.basalt(at(m, 10, 1, -8), 1); TERRAIN.crystals(at(m, 2, 1, 12), 0, { hue: 'egg' }); DECOR.crate(at(m, 12, 1, 6), 2); for (let y = -3; y > -12; y--) m.put(18, y, 4, y % 2 ? '#ff7a2a' : '#ffb04a', true); }
  if (id === 'celestial') { TERRAIN.monolithRing(at(m, 9, 1, 6), 1, { pal }); DECOR.orbPedestal(at(m, 12, 1, -10), 1, { hue: 'moon' }); TERRAIN.crystals(at(m, -2, 1, 13), 2, { hue: 'moon' }); }
  if (id === 'starter') { DECOR.lanternPost(at(m, 4, 1, 8), 1); DECOR.barrel(at(m, 8, 1, 2)); TERRAIN.mossyRock(at(m, 12, 1, -10), 1, { pal }); }
}
