/* Aminas — Phase 19B: Obsidian Reach, the Cooling Forge (voxel models for the island).
   A forge-island of the Kind Souls built over cooled lava (docs/PHASE19A.md, concept A; biomes.js: obsidian): black
   basalt and grey ash, rust-brown iron and soot, magenta crystal veins, pale glass, and warm light only where a fire
   still lives. People and Aminas worked here together: doors and hooks come in two heights, benches have a low end.
   - N: the island's six obstacle kinds (cached per variant; island3d.js bakes them into one mesh) and three scenery
     kinds for the island's groves (ash trees, ash rocks, crystal shoots).
   - X: the landmarks (Black Sand Landing, Glasswick and its workshops, the Mirror Gallery, the Great Bellows, the Great
     Forge) and the ten dungeon entrances (lit when their turn has come, dark when locked).
   Sizes are in prop voxels (1/8 cell); x along the map's x, z along the map's y, y up. Glow voxels are drawn unlit in
   the island's shared glow mesh; nothing here adds lights, shaders or per-frame work. */
import { PAL } from '../voxstyle.js';
import { hash, pick } from '../voxmesh.js';
import { H, X, N, extraSize } from '../voxbuild.js';

const BASALT = ['#3e3446', '#352c3e', '#463c50', '#2f2838'], BASALTD = ['#262030', '#2a2232'];
const ASH = ['#8a8090', '#7e7486', '#968c9c'], SOOT = ['#2a2428', '#332a30'];
const IRON = ['#5a4e56', '#4e444c', '#66585f'], RUST = ['#a8603a', '#965432', '#b46c42'];
const BRICK = ['#6a4a48', '#5e423f', '#76524e', '#523a38'], CLAY = ['#9a6a4a', '#8a5e42'];
const LEATHER = ['#7a4e34', '#6a442e', '#86583a'], WOOD = ['#5a4232', '#4e3a2c'];
const GLASS = ['#9fd8e8', '#b8e6f0', '#8ccbe0'], GLASSD = ['#4a5a8a', '#3a4878'], CRYSTAL = ['#e64ab8', '#ff6ad0', '#c83aa0'];
const EMBER = ['#ff8a3a', '#ffb05a', '#ff6a2a'];
const basalt = (x, y, z) => pick(H(x, y, z, 601) > 0.88 ? BASALTD : BASALT, H(x, z, y, 602));
const brick = (x, y, z) => pick(((y + (x + z) * 3) % 5) ? BRICK : SOOT, H(x, y, z, 603));
// a glowing seam of magenta or ember through stone
function seam(m, x0, z0, len, y, along, c, seed) { for (let i = 0; i < len; i++) { const j = Math.round((hash(i, seed, 604) - 0.5) * 1.6); if (along) m.put(x0 + i, y + j, z0, pick(c, i), true); else m.put(x0, y + j, z0 + i, pick(c, i), true); } }
function ashTop(m, x0, z0, x1, z1, y, seed) { for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) if (H(x, z, seed, 605) < 0.7) m.put(x, y, z, pick(ASH, H(x, y, z, 606))); }

/* ---------------------------------------------------------------- obstacles (all six existing kinds) */
// BASALT COLUMNS (2×2): a cluster of hexagon-ish columns of different heights, ash on their tops, a thin magenta seam
N.basalt = (m, v) => {
  const cols = [[-4, -4, 14], [0, -5, 18 + v * 2], [4, -3, 11], [-5, 1, 9], [-1, 0, 22 - v * 2], [3, 2, 15], [-3, 5, 7], [2, 5, 10 + v]];
  cols.forEach(([x, z, h], i) => { m.disc(x, z, 1.7, 0, h, basalt); ashTop(m, x - 2, z - 2, x + 3, z + 3, h, 610 + i); });
  seam(m, -5, -1, 4, 6 + v, false, CRYSTAL, 611 + v);
};
// MAGENTA CRYSTAL (1×1): a cluster of angular shoots from a basalt foot, glowing tips
N.crystal = (m, v) => {
  m.disc(0, 0, 2.6, 0, 1, basalt);
  [[0, 0, 11 + v], [-2, 1, 7], [2, -1, 8 + v], [1, 2, 5]].forEach(([x, z, h], i) => {
    for (let y = 1; y <= h; y++) { const w = y > h - 2 ? 0 : 1; m.box(x, y, z, x + 1 + w, y + 1, z + 1 + w, y > h - 3 ? CRYSTAL[0] : pick(CRYSTAL, y + i), y > h - 2); }
  });
};
// EMBER VENT (1×1): a cracked mound of cinder over a glowing core, a stub of chimney rock, warm cracks
N.embervent = (m, v) => {
  m.ball(0, 1.5, 0, 3.4, 2.2, 3.4, (x, y, z) => (H(x, y, z, 620) > 0.8 ? SOOT[0] : pick(BASALT, H(x, z, y, 621))));
  m.clear(-1, 2, -1, 1, 4, 1); m.glow(-1, 2, -1, 1, 3, 1, EMBER[0]);
  for (let i = 0; i < 4; i++) { const a = i * 1.6 + v; m.put(Math.round(Math.cos(a) * 2.6), 1, Math.round(Math.sin(a) * 2.6), pick(EMBER, i), true); }
  m.box(1, 3, 1, 2, 5 + v, 2, BASALTD);
};
// CHARRED TREE (1×1): a black trunk, two bare forks, and (the orchard still fruits) a few magenta blossoms
N.charred = (m, v) => {
  for (let y = 0; y < 13 + v; y++) m.box(0, y, 0, 1 + (y < 3 ? 1 : 0), y + 1, 1 + (y < 3 ? 1 : 0), y < 3 ? SOOT : pick(SOOT.concat(['#1e1a1e']), y));
  for (let i = 1; i < 5; i++) { m.put(i, 8 + i, 0, SOOT[0]); m.put(-i + 1, 10 + i - (v % 2), 0, SOOT[1]); }
  m.put(0, 13 + v, 1, SOOT[0]); m.put(0, 14 + v, 2, SOOT[1]);
  [[4, 13, 0], [-3, 14, 0], [0, 15 + v, 2]].forEach(([x, y, z], i) => { if (i <= v) m.put(x, y, z, CRYSTAL[i % 3]); });
  m.put(1, 0, 2, ASH[0]); m.put(-1, 0, -1, ASH[1]);
};
// OBSIDIAN SHARD (1×1): black volcanic glass breaking out of the ground in sharp slabs with a violet sheen
N.obsidianshard = (m, v) => {
  const glass = (x, y, z) => (H(x, y, z, 630) > 0.82 ? '#6a5a9a' : pick(['#1a1424', '#221a30', '#2c2240'], H(x, z, y, 631)));
  [[0, 0, 10 + v, 0.35], [-2, 1, 6, -0.4], [2, -1, 7 + v, 0.25]].forEach(([x, z, h, lean]) => { for (let y = 0; y < h; y++) { const dx = Math.round(y * lean); m.box(x + dx, y, z, x + dx + (y < h - 2 ? 2 : 1), y + 1, z + 1, glass); } });
  m.disc(0, 0, 2.2, 0, 1, ASH);
};
// SLAG HEAP (2×2): a heap of rusty slag and clinker with glowing seams, an abandoned cart wheel and an iron bar
N.slagheap = (m, v) => {
  m.ball(0, 2, 0, 6.5, 4.5 + v * 0.5, 6, (x, y, z) => { const r = H(x, y, z, 640); return r > 0.84 ? pick(RUST, H(z, y, x)) : r > 0.7 ? pick(IRON, H(x, z, y)) : pick(SOOT.concat(BASALTD), H(y, x, z, 641)); });
  seam(m, -5, 2, 9, 3, true, EMBER, 642 + v);
  m.disc(5, -5, 2.4, 0, 1, '#4a3a2e'); m.disc(5, -5, 1.2, 0, 1, null); m.box(-6, 0, 5, 2, 1, 6, IRON);
};

/* ---------------------------------------------------------------- scenery for the island's groves */
N.ashtree = (m, v) => { for (let y = 0; y < 9 + v * 2; y++) m.put(0, y, 0, pick(SOOT, y)); for (let i = 1; i < 3 + v; i++) { m.put(i, 5 + i, 0, SOOT[0]); m.put(0, 6 + i, -i, SOOT[1]); } };
N.ashrock = (m, v) => { m.ball(0, 1.2, 0, 2.2 + v * 0.3, 1.6, 2, (x, y, z) => (y > 1 ? pick(ASH, H(x, y, z, 650)) : pick(BASALT, H(x, z, y, 651)))); };
// ash strands hanging from the island's edges (where other islands have vines), with the odd ember
N.ashvine = (m, v) => { for (let k = 0; k < 3; k++) { const len = 5 + Math.floor(hash(k, v, 655) * 8); for (let j = 0; j < len; j++) m.put(k * 2 - 2, -j, 0, j === len - 1 && k === v ? EMBER[0] : pick(SOOT.concat(BASALTD), j + k), j === len - 1 && k === v); } };
N.crystalshoot = (m, v) => { m.box(0, 0, 0, 1, 4 + v, 1, CRYSTAL[1], false); m.put(0, 4 + v, 0, CRYSTAL[0], true); m.box(1, 0, 1, 2, 2 + v, 2, CRYSTAL[2]); };

/* ---------------------------------------------------------------- landmarks */
// BLACK SAND LANDING: a basalt jetty head, an iron mooring post with a lantern, rings worn bright
X.o_landing = (m) => {
  m.box(-4, 0, -4, 4, 2, 4, basalt); ashTop(m, -4, -4, 4, 4, 2, 660);
  m.box(2, 2, -3, 3, 14, -2, IRON); m.box(2, 14, -3, 5, 15, -2, IRON); m.box(3, 11, -4, 6, 12, -1, IRON); m.glow(4, 12, -3, 5, 14, -2, EMBER[1]);
  m.disc(-2, 2, 1.4, 2, 3, '#c8b08a'); m.disc(-2, 2, 0.5, 2, 3, null);
};
// GLASSWICK, the kilnworkers' square: two kiln chimneys (one fired pale, one dark, both warm at the mouth), a well with
// an iron hood, glass benches with a low end, a notice board, and hooks at two heights by the doors
X.o_glasswick = (m) => {
  const W = m.W / 2;
  m.box(-W, 0, -4, W, 1, 4, (x, y, z) => pick(((x + z) & 1) ? ASH : BASALT, H(x, z, 670)));               // the square's paving
  const kiln = (x0, light) => { m.box(x0, 0, -4, x0 + 7, 9, 2, brick); m.box(x0 + 2, 9, -3, x0 + 5, 22, 0, brick); m.box(x0 + 1, 22, -4, x0 + 6, 23, 1, SOOT);
    m.clear(x0 + 2, 1, 1, x0 + 5, 5, 2); m.glow(x0 + 2, 1, 1, x0 + 5, 2, 2, EMBER[0]); m.box(x0 + 1, 9, 1, x0 + 6, 10, 2, light ? '#e8e4f0' : '#3a3048'); };
  kiln(-W + 1, true); kiln(W - 9, false);
  m.disc(-4, 1, 2.6, 1, 4, basalt); m.disc(-4, 1, 1.6, 1, 4, null); m.disc(-4, 1, 1.4, 1, 2, '#2a4a6a');                 // the well
  m.box(-6, 4, 0, -5, 9, 1, IRON); m.box(-3, 4, 0, -2, 9, 1, IRON); m.box(-7, 9, -1, -1, 10, 3, IRON);
  [[1, 9], [6, 4]].forEach(([x, len]) => { m.box(x, 1, 2, x + len, 3, 3, GLASS); m.box(x, 1, 2, x + 1, 2, 3, IRON); });    // glass benches, a low end each
  m.box(9, 1, -3, 10, 10, -2, WOOD); m.box(7, 6, -3, 13, 10, -2, '#c8b08a');                                              // the notice board
  [[-W + 8, 7], [-W + 8, 3], [W - 10, 7], [W - 10, 3]].forEach(([x, y]) => m.put(x, y, 2, IRON[2]));                       // hooks, high and low
};
// GLASSWICK'S WORKSHOPS: broken workshop walls, a glassblower's bench, moulds stacked like plates, a cooling rack of
// panes, and a scorch on the floor in the shape of a resting Amina where one kept a furnace warm
X.o_workshops = (m) => {
  const W = m.W / 2;
  m.box(-W, 0, -3, -W + 9, 12, -1, brick); m.clear(-W + 3, 1, -3, -W + 6, 8, -1);
  m.box(-W + 11, 0, -3, -W + 16, 6, -1, brick); m.box(W - 8, 0, -3, W, 10, -1, brick); m.clear(W - 5, 1, -3, W - 3, 4, -1);   // a small door too
  m.box(-6, 0, 0, 2, 3, 2, WOOD); m.box(-5, 3, 0, -4, 6, 1, IRON); m.glow(-5, 6, 0, -4, 7, 1, EMBER[1]);
  for (let i = 0; i < 4; i++) m.disc(5, 1, 1.6, i, i + 1, i % 2 ? CLAY[0] : CLAY[1]);                                     // moulds
  for (let i = 0; i < 4; i++) { m.box(8 + i * 2, 0, 1, 9 + i * 2, 7, 2, IRON); m.box(9 + i * 2, 2, 1, 10 + i * 2, 6, 2, i % 2 ? GLASS : GLASSD); }
  [[-1, 2], [0, 2], [1, 2], [0, 3], [-1, 3], [2, 2], [-2, 2]].forEach(([x, z]) => m.put(x - 10, 0, z, SOOT[0]));           // the scorch
};
// THE MIRROR GALLERY: a long basalt hall on the ridge, tall arched panes of pale glass (dusty, some cracked), iron
// doors sealed shut, a slate roof
X.o_gallery = (m) => {
  const W = m.W / 2;
  m.box(-W, 0, -3, W, 22, 3, basalt); m.box(-W - 1, 22, -4, W + 1, 24, 4, BASALTD); m.box(-W + 2, 24, -2, W - 2, 26, 2, SOOT);
  for (let x = -W + 3; x < W - 3; x += 6) { m.box(x, 4, 3, x + 3, 18, 4, (xx, y) => (y === 11 && x % 12 === 3 ? '#e8f6ff' : pick(GLASS, y + xx))); m.box(x - 1, 18, 3, x + 4, 19, 4, IRON); }
  m.box(-3, 0, 3, 3, 14, 4, IRON); m.box(-1, 0, 4, 1, 14, 5, RUST);                                                         // sealed doors and their bar
};
// THE GREAT BELLOWS: three leather lungs on iron frames, ribbed, joined by clay pipes running west to the forge
X.o_bellows = (m) => {
  const W = m.W / 2;
  [-W + 2, -5, 8].forEach((x0, i) => {
    const h = 12 + (i % 2) * 4; m.box(x0, 0, -3, x0 + 10, 2, 3, IRON);
    for (let y = 2; y < h; y++) { const w = y < h - 3 ? 0 : 1; m.box(x0 + w, y, -3 + w, x0 + 10 - w, y + 1, 3 - w, y % 3 ? LEATHER : IRON); }
    m.box(x0 + 4, h, -1, x0 + 6, h + 4, 1, IRON);
  });
  m.box(-W, 4, 3, W, 6, 5, CLAY); m.box(W - 3, 0, 3, W - 1, 4, 5, CLAY);
};
// THE GREAT FORGE (the landmark slot): a hall on a basalt plinth, two tall chimneys, iron doors with the core glowing
// through the gap, an anvil, a quench trough, a crane with a chain, and ember light on the stones
X.o_greatforge = (m) => {
  const W = m.W / 2;
  m.box(-W, 0, -W, W, 3, W, basalt); ashTop(m, -W, -W, W, W, 3, 690);
  m.box(-9, 3, -9, 9, 22, 5, brick); m.box(-10, 22, -10, 10, 24, 6, SOOT); m.box(-8, 24, -8, 8, 27, 4, BRICK);
  [[-7, -7], [4, -7]].forEach(([x, z], i) => { m.box(x, 27, z, x + 4, 52 + i * 6, z + 4, brick); m.box(x - 1, 52 + i * 6, z - 1, x + 5, 54 + i * 6, z + 5, SOOT); m.glow(x + 1, 53 + i * 6, z + 1, x + 3, 54 + i * 6, z + 3, EMBER[0]); });
  m.clear(-4, 3, 5, 4, 16, 6); m.box(-4, 3, 4, 4, 16, 5, IRON); m.glow(-1, 3, 5, 1, 15, 6, EMBER[0]); m.glow(-3, 3, 5, 3, 4, 6, EMBER[1]);   // the doors, ajar on the core
  m.box(5, 3, 9, 9, 6, 11, IRON); m.box(6, 6, 9, 9, 7, 11, IRON[2]); m.box(8, 6, 9, 10, 7, 10, IRON[2]);                    // anvil
  m.box(-9, 3, 8, -3, 5, 12, IRON); m.box(-8, 4, 9, -4, 5, 11, '#2a4a6a');                                                 // quench trough
  m.box(10, 3, -2, 11, 26, -1, WOOD); m.box(3, 26, -2, 11, 27, -1, WOOD); for (let y = 16; y < 26; y++) m.put(4, y, -2, IRON[0]); m.box(3, 14, -3, 6, 16, 0, IRON);
  seam(m, -W + 1, -W + 2, 6, 1, false, EMBER, 691); seam(m, W - 2, 4, 6, 1, false, CRYSTAL, 692);
};
// DUNGEON ENTRANCES: two basalt posts and an iron lintel; a door that glows in the dungeon's element when its turn has
// come; and a small motif of what lies inside
const GATE = {
  o_cinder: { c: '#ff9a4a', s: 'steps' }, o_kilns: { c: '#ffb05a', s: 'kiln' }, o_rookery: { c: '#bfe8ff', s: 'nest' }, o_quench: { c: '#5ab8e8', s: 'pool' },
  o_seams: { c: '#b8c4d4', s: 'cart' }, o_gallery: { c: '#b89aff', s: 'pane' }, o_hollows: { c: '#ff9ee0', s: 'crystal' }, o_orchard: { c: '#6ad06a', s: 'tree' },
  o_bellows: { c: '#bfe8ff', s: 'pipe' }, o_forge: { c: '#c49a5a', s: 'anvil' },
};
function gate(m, g, lit) {
  const post = (x) => { m.box(x, 0, -1, x + 2, 16, 1, basalt); m.box(x, 16, -1, x + 2, 17, 1, ASH); };
  post(-5); post(3); m.box(-6, 16, -2, 6, 19, 2, IRON); m.box(-6, 19, -2, 6, 20, 2, RUST);
  m.box(-3, 0, -1, 3, 15, 0, lit ? g.c : '#241e2a', false); if (lit) { m.glow(-3, 1, 0, 3, 2, 1, g.c); m.glow(-1, 20, -1, 1, 22, 1, g.c); }
  if (g.s === 'steps') for (let i = 0; i < 3; i++) m.box(-4, 0, 1 + i * 2, 4, 3 - i, 3 + i * 2, BASALTD);
  if (g.s === 'kiln') { m.box(-8, 0, 1, -5, 10, 4, brick); m.glow(-7, 1, 3, -6, 3, 4, lit ? EMBER[0] : '#5a3a2a'); }
  if (g.s === 'nest') { m.disc(6, 3, 2, 0, 2, WOOD); m.disc(6, 3, 1, 1, 2, null); m.put(6, 1, 3, '#e8e0c8'); }
  if (g.s === 'pool') { m.disc(0, 4, 3, 0, 1, '#2a4a6a'); m.disc(0, 4, 1.4, 0, 1, lit ? g.c : '#4a5a7a', lit); }
  if (g.s === 'cart') { m.box(5, 1, 1, 9, 4, 4, IRON); m.box(5, 0, 1, 6, 1, 2, SOOT); m.box(8, 0, 3, 9, 1, 4, SOOT); m.box(6, 4, 2, 8, 5, 3, RUST); }
  if (g.s === 'pane') { m.box(-8, 0, 1, -7, 12, 2, IRON); m.box(-7, 2, 1, -5, 11, 2, GLASS); }
  if (g.s === 'crystal') [[6, 2, 6], [7, 3, 4], [5, 4, 3]].forEach(([x, z, h]) => m.box(x, 0, z, x + 1, h, z + 1, CRYSTAL, lit));
  if (g.s === 'tree') { for (let y = 0; y < 10; y++) m.put(6, y, 3, SOOT[0]); m.put(7, 8, 3, SOOT[1]); m.put(8, 9, 3, CRYSTAL[0]); }
  if (g.s === 'pipe') { m.box(-8, 0, 1, -6, 9, 3, CLAY); m.box(-8, 9, 1, -3, 11, 3, CLAY); }
  if (g.s === 'anvil') { m.box(5, 0, 2, 9, 3, 4, IRON); m.box(4, 3, 2, 10, 4, 4, IRON[2]); }
}
Object.keys(GATE).forEach((id) => { X['o_gate_' + id] = (m, lit) => gate(m, GATE[id], lit); });

extraSize('o_landing', 1, 1, 20); extraSize('o_glasswick', 5, 1, 30); extraSize('o_workshops', 4, 1, 20);
extraSize('o_gallery', 4, 1, 30); extraSize('o_bellows', 4, 1, 26); extraSize('o_greatforge', 3, 3, 64);
Object.keys(GATE).forEach((id) => extraSize('o_gate_' + id, 1, 1, 26));
export { GATE as O19_GATES, PAL as O19_PAL_BASE };
