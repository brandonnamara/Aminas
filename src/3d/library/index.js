/* Aminas — the environment asset library catalog (Environment Phase 2).
   One list of every environment asset, with category, footprint, variants and status:
     in-game  — used on the Starter Island today
     library  — built, reviewed in the viewer and exported, ready to place; not yet on an island
     demo     — a demonstration of the standards (architecture examples, island vignettes); not a game asset
   buildAsset() returns the full-detail model and its mobile LOD (half resolution), with voxel and triangle counts.
   The viewer (tools/library.html) and the exporter (tools/export-library.js) both read this list. */
import { Model, B, N, X } from '../voxbuild.js';
import { PAL } from '../voxstyle.js';
import { TERRAIN } from './terrain.js';
import { VEG } from './vegetation.js';
import { DECOR } from './decor.js';
import { ARCH } from './buildings.js';
import { BIOMES, vignette } from './biomes.js';

const E = [];
const add = (cat, sub, id, title, fp, build, o) => E.push(Object.assign({ cat, sub, id, title, fp, build, variants: 1, status: 'library', maxY: 40, minY: -2 }, o || {}));

// A. terrain and geology
add('terrain', 'blocks', 'grassBlock', 'Grass block', [0.5, 0.5], TERRAIN.grassBlock, { status: 'in-game', note: 'the island ground uses this layering at terrain scale' });
add('terrain', 'blocks', 'soilBlock', 'Soil block', [0.5, 0.5], TERRAIN.soilBlock, { status: 'in-game' });
add('terrain', 'cliffs', 'cliff', 'Layered cliff segment', [2, 1.5], TERRAIN.cliff, { variants: 3, minY: -8 });
add('terrain', 'cliffs', 'islandEdge', 'Floating island edge', [2, 2], TERRAIN.islandEdge, { minY: -36 });
add('terrain', 'rock', 'stonePillars', 'Stone pillar formation', [1.5, 1.5], TERRAIN.stonePillars, { variants: 2 });
add('terrain', 'rock', 'outcrop', 'Rocky outcrop', [2, 1.5], TERRAIN.outcrop, { variants: 2 });
add('terrain', 'rock', 'mossyRock', 'Moss-covered rock', [1.5, 1.5], TERRAIN.mossyRock, { variants: 2 });
add('terrain', 'rock', 'boulder', 'Boulder (obstacle)', [1, 1], N.boulder, { status: 'in-game' });
add('terrain', 'rock', 'pebble', 'Pebbles (obstacle)', [1, 1], N.pebble, { status: 'in-game' });
add('terrain', 'magic', 'crystals', 'Crystal cluster', [1, 1], TERRAIN.crystals, { variants: 5, note: 'one per magic hue' });
add('terrain', 'ancient', 'caveMouth', 'Cave entrance', [3, 2.5], TERRAIN.caveMouth);
add('terrain', 'ancient', 'arch', 'Natural stone arch', [3, 1], TERRAIN.arch);
add('terrain', 'ancient', 'basalt', 'Basalt columns', [1.5, 1.5], TERRAIN.basalt);
add('terrain', 'ancient', 'monolithRing', 'Fallen monolith ring', [2.5, 2.5], TERRAIN.monolithRing);
// B. vegetation
[['oak', 'Oak', 'in-game'], ['oakOld', 'Old oak', 'library'], ['pine', 'Pine', 'in-game'], ['birch', 'Birch', 'in-game'], ['blossom', 'Blossom tree', 'in-game'], ['willow', 'Weeping willow', 'library'],
  ['glowcap', 'Glowcap (fantasy)', 'library'], ['crystalwood', 'Crystalwood (fantasy)', 'library'], ['charredTree', 'Charred tree', 'library'], ['sapling', 'Sapling', 'in-game']].forEach(([id, t, st]) => add('vegetation', 'trees', id, t, [1, 1], VEG[id], { variants: 3, status: st }));
[['bush', 'Berry bush', 'in-game'], ['roundBush', 'Round bush', 'library'], ['flowerBush', 'Flowering bush', 'library'], ['flowerPatch', 'Flower patch', 'library'], ['tallGrass', 'Tall grass', 'library'], ['fern', 'Fern (small)', 'in-game'], ['fernLarge', 'Fern (large)', 'library'],
  ['mushrooms', 'Mushrooms', 'library'], ['roots', 'Exposed roots', 'library'], ['stump', 'Stump (obstacle)', 'in-game']].forEach(([id, t, st]) => add('vegetation', 'ground', id, t, [1, 1], VEG[id], { variants: id === 'stump' ? 1 : 3, status: st }));
add('vegetation', 'hanging', 'vines', 'Hanging vines', [1.25, 0.5], VEG.vines, { variants: 3, minY: -12 });
add('vegetation', 'hanging', 'hangingMoss', 'Hanging moss', [1, 0.5], VEG.hangingMoss, { variants: 2, minY: -10 });
// C. architecture: the kit sampler, the category demonstrations, and the game's own buildings
add('architecture', 'reference', 'materialBoard', 'Material board', [7, 7], ARCH.materialBoard, { status: 'demo', maxY: 10 });
add('architecture', 'kit', 'kitSampler', 'Component kit sampler', [8, 7], ARCH.kitSampler, { status: 'demo', maxY: 30 });
[['habitatCottage', 'Habitat: meadow cottage', [2.5, 2.5]], ['resourceGranary', 'Resource: granary', [3, 2.5]], ['breedingLodge', 'Breeding: twin nest lodge', [3, 2]], ['craftWorkshop', 'Crafting: workshop', [3.5, 2.5]],
  ['decorGazebo', 'Decorative: gazebo', [2, 2]], ['magicSpire', 'Magical: moon spire', [2, 2]]].forEach(([id, t, fp]) => add('architecture', 'standards', id, t, fp, ARCH[id], { status: 'demo', maxY: 48 }));
const BLD = { hatchery: [3, 3], hollow: [3, 3], tidegate: [3, 2], moonshrine: [2, 2], reliquarygate: [3, 3], forge: [3, 3], farm: [3, 2], mine: [2, 2], habitat: [3, 3], lantern: [1, 1], festlantern: [1, 1], flowerbed: [1, 1], bench: [2, 1], statue: [2, 2], fountain: [2, 2] }; // footprints from data.js
const EL9 = ['nature', 'water', 'earth', 'fire', 'light', 'dark', 'wind'];
Object.keys(BLD).forEach((k) => {
  const habitat = k === 'habitat', fn = B[k];
  add('buildings', 'game', 'b_' + k, (habitat ? 'Habitat (7 elements)' : k[0].toUpperCase() + k.slice(1)), BLD[k], (m, v) => (habitat ? fn(m, 2, false, { type: 'hab_' + EL9[(v - 1) % 7] }) : fn(m, Math.min(v, 5), false, { type: k })), { status: 'in-game', variants: habitat ? 7 : ['lantern', 'festlantern', 'flowerbed', 'bench', 'statue', 'fountain'].includes(k) ? 1 : 3, maxY: 64, note: habitat ? 'variants are elements' : 'variants are levels 1-3' });
  if (fn && fn.ruin) add('ruins', 'game', 'r_' + k, k[0].toUpperCase() + k.slice(1) + ' (ruin)', BLD[k], (m) => fn.ruin(m, { type: habitat ? 'hab_nature' : k }), { status: 'in-game', maxY: 40 });
});
// D. decoration
[['lanternPost', 'Lantern post', 2], ['torch', 'Torch', 1], ['statue', 'Guardian statue', 1], ['obelisk', 'Rune obelisk', 1], ['columnRuin', 'Ruined column', 2], ['runeStone', 'Rune stone', 3], ['orbPedestal', 'Orb pedestal', 1], ['crystalPylon', 'Crystal pylon', 1],
  ['barrel', 'Barrel', 1], ['crate', 'Crates', 3], ['sacks', 'Sacks', 1], ['pots', 'Clay pots', 1], ['bucket', 'Bucket', 1], ['logPile', 'Log pile', 1], ['cartWheel', 'Cart wheel', 1], ['haystack', 'Haystack', 1], ['signpost', 'Signpost', 1], ['bench', 'Bench', 1]]
  .forEach(([id, t, n]) => add('decor', ['barrel', 'crate', 'sacks', 'pots', 'bucket', 'logPile', 'cartWheel', 'haystack'].includes(id) ? 'props' : ['runeStone', 'orbPedestal', 'crystalPylon', 'obelisk'].includes(id) ? 'magic' : 'monuments', id, t, ['statue', 'columnRuin'].includes(id) ? [2, 2] : id === 'bench' ? [2, 1] : [1, 1], DECOR[id], { variants: n, status: ['statue', 'bench'].includes(id) ? 'in-game' : 'library' }));
// E. water and atmosphere (objects; the effect systems are listed in the art bible)
[['pond', 'Lily pond', [2, 2], 2], ['stream', 'Stream segment', [2, 1.5], 2], ['trough', 'Water trough', [1, 1], 1], ['fountain', 'Fountain', [2, 2], 1], ['cloud', 'Cloud puff', [3, 1.5], 3]].forEach(([id, t, fp, n]) => add('water', 'objects', id, t, fp, DECOR[id], { variants: n, status: id === 'fountain' ? 'in-game' : 'library' }));
add('water', 'objects', 'jetty', 'Jetty', [1, 4.5], X.jetty, { status: 'in-game', minY: -18 }); add('water', 'objects', 'skiff', 'Skiff', [3, 2], X.skiff, { status: 'in-game', minY: -6 });
// island identity vignettes
Object.keys(BIOMES).forEach((id) => add('biomes', 'vignettes', 'v_' + id, BIOMES[id].name, [6, 6], (m) => vignette(m, id), { status: 'demo', maxY: 40, minY: -36 }));

export const CATALOG = E;
export const CATEGORIES = ['terrain', 'vegetation', 'architecture', 'buildings', 'ruins', 'decor', 'water', 'biomes'];
export { BIOMES };

export const lodOf = (m) => m.lod();
const tris = (o) => ((o.geo && o.geo.index ? o.geo.index.count / 3 : 0) + (o.glow && o.glow.index ? o.glow.index.count / 3 : 0)) | 0;
// Build one catalog asset (variant 1..n). Returns { model (the grids), full, lod, stats }.
export function buildAsset(e, v, o) {
  const m = new Model(e.fp[0], e.fp[1], e.maxY, 0, 3 + (v || 1), e.minY);
  e.build(m, v || 1, o || {});
  const full = m.build(), lod = full.lod;
  return { model: m, full, lod, stats: { voxels: m.g.count + m.l.count + m.u.count, glow: m.l.count + m.u.count, tris: tris(full), lodTris: tris(lod) } };
}
export const find = (id) => E.find((e) => e.id === id);
