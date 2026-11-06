/* Aminas — architectural standard demonstrations (Environment Phase 2, Stage C).
   One example per building category, assembled only from kit.js parts, to prove the standards produce distinct,
   handcrafted buildings from shared construction. THESE ARE NOT GAME BUILDINGS: they appear in the library viewer
   only; no building data, cost or function is added. Each follows the category rules in docs/art-bible/03. */
import { PAL, MAGIC, EL } from '../voxstyle.js';
import { pick } from '../voxmesh.js';
import { H } from '../voxbuild.js';
import { MAT, foundation, storey, roof, windowZ, windowX, roundWindow, door, chimney, roundTower, stairs, balcony, fence, bridge, platform, detail } from './kit.js';
import { DECOR } from './decor.js';

const A = {};
// HABITAT: low and welcoming. Timber storey on a plinth, a thatched gable, a flower box and a smoking chimney.
A.habitatCottage = (m) => {
  const y = foundation(m, -9, -8, 9, 7, { style: 'plinth', h: 1 });
  const t = storey(m, -8, y, -7, 8, 6, 9, 'timber', { band: MAT.trimDark });
  door(m, -3, y, 6, 'plank'); windowZ(m, 3, y + 3, 6, 3, 3, true, EL.nature[1]); windowX(m, 8, y + 3, -4, 2, 3, true, EL.nature[1]);
  detail.flowerBox(m, 2, y + 2, 7, 5);
  roof(m, -8, t, -7, 8, 6, 'gable-z', MAT.thatch, { gableWall: MAT.plaster });
  chimney(m, 4, t, -5, 8, 'stone');
  fence(m, -11, 9, 8, 'x', 'picket');
};
// RESOURCE: practical and busy. A stone ground floor, a plank loft with a hoist beam, a lean-to, sacks and crates.
A.resourceGranary = (m) => {
  const y = foundation(m, -10, -8, 6, 8, { style: 'rubble', h: 1 });
  const t1 = storey(m, -9, y, -7, 5, 7, 7, 'stone', { quoins: true });
  const t2 = storey(m, -9, t1, -7, 5, 7, 6, 'plank', { band: MAT.trimDark });
  door(m, -2, y, 7, 'double'); windowZ(m, -7, t1 + 2, 7, 2, 2, false);
  m.box(-3, t2 - 1, 7, -2, t2, 10, MAT.trimDark); m.box(-3, t2 - 4, 9, -2, t2 - 1, 10, MAT.iron[0]);             // hoist beam and rope
  roof(m, -9, t2, -7, 5, 7, 'gable-x', MAT.roof('red'));
  m.box(5, y, -6, 9, y + 5, -5, MAT.plank); [[8, -6], [8, 5]].forEach(([x, z]) => m.box(x, y, z, x + 1, y + 4, z + 1, PAL.woodDark)); roof(m, 5, y + 5, -6, 10, 6, 'shed', MAT.roof('red'), { overhang: 0, fall: '+x' });       // lean-to on posts
  [[7, 2], [8, -3]].forEach(([x, z]) => m.box(x, y, z, x + 2, y + 2, z + 2, MAT.plankLight));
  detail.sign(m, 2, y + 6, 7, '#c9965e');
};
// BREEDING: paired and nurturing. Two round forms joined by a covered walk, soft cone roofs, nesting alcoves.
A.breedingLodge = (m) => {
  foundation(m, -11, -7, 11, 7, { style: 'stepped', h: 1, mat: MAT.ashlar });
  [[-6, 0], [6, 0]].forEach(([cx, cz], i) => { const t = roundTower(m, cx, cz, 4.6, 2, 9, i ? MAT.ashlar : MAT.ashlar, { band: MAT.trimDark }); roof(m, cx - 5, t, cz - 5, cx + 5, cz + 5, 'cone', MAT.roof(i ? 'blue' : 'red'), { overhang: 0 }); roundWindow(m, cx, 7, cz + 4, 1, true); });
  storey(m, -2, 2, -2, 2, 3, 6, 'timber'); roof(m, -2, 8, -2, 2, 3, 'gable-x', MAT.roof('gold'));
  door(m, 0, 2, 3, 'arched', { light: PAL.glow });
  [[-6, 5], [6, 5]].forEach(([x, z]) => { m.box(x - 1, 2, z, x + 2, 4, z + 1, MAT.thatch); m.put(x, 4, z, '#f6efdd'); });
};
// CRAFTING: strong and smoky. Brick walls, a wide arched doorway glowing with forge light, a tall chimney, a wheel.
A.craftWorkshop = (m) => {
  const y = foundation(m, -10, -9, 10, 8, { style: 'plinth', h: 1 });
  const t = storey(m, -9, y, -8, 9, 7, 10, 'brick', { quoins: true, band: PAL.stoneDark[0] });
  door(m, -2, y, 7, 'double', { light: '#ff8a3a' }); windowZ(m, 4, y + 4, 7, 3, 3, true); windowX(m, 9, y + 4, -5, 3, 3, true);
  roof(m, -9, t, -8, 9, 7, 'hip', MAT.roof('slate'));
  chimney(m, -7, t - 2, -6, 14, 'brick');
  m.box(10, 0, 3, 13, 2, 6, MAT.stone); m.box(10, 2, 3, 13, 3, 6, '#4a4e58');                                         // anvil block
  for (let i = 0; i < 3; i++) m.box(-13 + i, 0, 2 + i * 2, -9 + i, 2, 4 + i * 2, (x, yy, z) => (x === -13 + i ? '#c9965e' : PAL.woodDark[0]));   // log ends
  detail.lanternHook(m, 3, y + 9, 8);
};
// DECORATIVE: open and graceful. A raised round platform, slim posts, a pyramid roof, a lantern hung in the middle.
A.decorGazebo = (m) => {
  const h = platform(m, -7, -7, 7, 7, 2, MAT.ashlar);
  [[-6, -6], [5, -6], [-6, 5], [5, 5]].forEach(([x, z]) => m.box(x, h, z, x + 1, h + 9, z + 1, '#f2e6c4'));
  roof(m, -7, h + 9, -7, 7, 7, 'pyramid', MAT.roof('green'));
  m.glow(-1, h + 5, -1, 1, h + 7, 1, PAL.glow); m.box(0, h + 7, 0, 1, h + 9, 1, MAT.trimDark);
  [[-7, -7], [6, -7], [-7, 6], [6, 6]].forEach(([x, z], i) => { m.box(x, h, z, x + 2, h + 1, z + 2, PAL.woodDark); m.put(x, h + 1, z, PAL.leaf[0]); m.put(x + 1, h + 1, z, pick(PAL.flowers, i / 4)); m.put(x, h + 1, z + 1, pick(PAL.flowers, i / 4 + 0.2)); }); // planters
};
// SPECIAL MAGICAL: tall and luminous. A round tower of moon-stone on a stepped dais, a balcony, a crystal crown,
// rune stones at its foot.
A.magicSpire = (m) => {
  foundation(m, -8, -8, 8, 8, { style: 'stepped', h: 2, mat: MAT.slateStone });
  const t = roundTower(m, 0, 0, 5, 3, 22, MAT.slateStone, { band: PAL.gold });
  door(m, 0, 3, 5, 'arched', { light: MAGIC.moon }); [8, 14, 19].forEach((y) => roundWindow(m, 0, y, 5, 1, true));
  balcony(m, -3, 4, 17, 4, 2);
  const apex = roof(m, -5, t, -5, 5, 5, 'cone', MAT.roof('purple'), { overhang: 1 });
  for (let y = apex; y < apex + 5; y++) m.put(0, y, 0, y === apex + 4 ? '#ffffff' : MAGIC.moon, true);
  [[-7, 9], [7, 8]].forEach(([x, z]) => { m.box(x - 1, 0, z, x + 2, 6, z + 1, MAT.stone); m.glow(x, 2, z + 1, x + 1, 5, z + 2, MAGIC.moon); });
};
// A KIT SAMPLER: the parts laid out side by side (foundation styles, wall kinds, roof shapes, doors, windows,
// stairs, a balcony, fences, a bridge) for the art bible plate
A.kitSampler = (m) => {
  [['plinth', -30], ['stepped', -18], ['rubble', -6], ['deck', 6]].forEach(([st, x]) => foundation(m, x, -26, x + 8, -20, { style: st, h: 2 }));
  ['stone', 'brick', 'plank', 'log', 'timber', 'slate'].forEach((k, i) => storey(m, -30 + i * 9, 0, -14, -24 + i * 9, -9, 7, k, { quoins: true }));
  [['hip', -30], ['gable-x', -19], ['cone', -8], ['pyramid', 3], ['shed', 14]].forEach(([sh, x]) => { m.box(x, 0, -4, x + 8, 3, 4, MAT.stone); roof(m, x, 3, -4, x + 8, 4, sh, MAT.roof(['red', 'blue', 'purple', 'green', 'slate'][['hip', 'gable-x', 'cone', 'pyramid', 'shed'].indexOf(sh)]), { overhang: 0 }); });
  [['plank', -26], ['arched', -16], ['round', -6], ['double', 6]].forEach(([k, x]) => { m.box(x - 5, 0, 8, x + 5, 10, 10, MAT.stone); door(m, x, 1, 10, k, { step: false }); });
  windowZ(m, 16, 3, 10, 2, 3, true, EL.water[1]); roundWindow(m, 22, 5, 10, 2, true); m.box(14, 0, 8, 26, 10, 10, MAT.ashlar); windowZ(m, 16, 3, 10, 2, 3, true, EL.water[1]); roundWindow(m, 22, 5, 10, 2, true);
  stairs(m, -30, 0, 22, 4, 6); balcony(m, -20, -12, 6, 16, 3, { flowers: true }); m.box(-20, 0, 14, -12, 6, 16, MAT.plank);
  fence(m, -8, 20, 10, 'x', 'picket'); fence(m, -8, 23, 10, 'x', 'rail'); fence(m, -8, 26, 10, 'x', 'stone');
  bridge(m, 6, 26, 18, 4, 3, { lantern: true });
};

// MATERIAL BOARD (art bible plate 1): every standard material as a row of terrain-voxel cubes, in the order the
// bible lists them: ground, earth and rock, wood and plaster, masonry, roofs, metal, magic and hearth light
A.materialBoard = (m) => {
  const rows = [
    ['grass', PAL.grass], ['grass side', PAL.grassSide], ['moss', PAL.moss], ['leaf', PAL.leaf], ['pine', PAL.pine], ['blossom', PAL.blossom],
    ['dirt', PAL.dirt], ['clay', PAL.clay], ['stone', PAL.stone], ['dark stone', PAL.stoneDark], ['deep rock', PAL.deepLow], ['sand', PAL.sand], ['path', PAL.path],
    ['wood', PAL.wood], ['dark wood', PAL.woodDark], ['plank', PAL.plank], ['plaster', PAL.plaster], ['brick', PAL.brick],
    ['roof red', PAL.roof.red], ['roof blue', PAL.roof.blue], ['roof green', PAL.roof.green], ['roof purple', PAL.roof.purple], ['roof slate', PAL.roof.slate], ['roof gold', PAL.roof.gold],
    ['metal', PAL.metal], ['gold', PAL.gold],
  ];
  rows.forEach(([, pal], i) => { const col = i % 6, row = Math.floor(i / 6), x0 = -24 + col * 8, z0 = -20 + row * 8; m.box(x0, 0, z0, x0 + 6, 4, z0 + 6, pal); });
  ['egg', 'water', 'moon', 'life', 'spirit'].forEach((k, i) => { const x0 = -24 + i * 8, z0 = 20; m.box(x0, 0, z0, x0 + 6, 4, z0 + 6, MAGIC[k], true); });
  [PAL.glow, PAL.glowWarm, PAL.glowCool].forEach((c, i) => { const x0 = 16 + (i % 1) * 8, z0 = 20 - 8 * (i + 1) + 8; });
  m.box(16, 0, 20, 22, 4, 26, PAL.glow, true);
};
export const MATERIAL_ROWS = ['grass', 'grass side', 'moss', 'leaf', 'pine', 'blossom', 'dirt', 'clay', 'stone', 'dark stone', 'deep rock', 'sand', 'path', 'wood', 'dark wood', 'plank', 'plaster', 'brick', 'roof red', 'roof blue', 'roof green', 'roof purple', 'roof slate', 'roof gold', 'metal', 'gold', 'magic: egg, water, moon, life, spirit; hearth glow'];

export const ARCH = A;
export { DECOR };
