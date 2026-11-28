/* Aminas — Phase 20B: the Celestial Crown, the Silent Observatory (voxel models for the island).
   The approved Phase 20A concept (docs/PHASE20A.md, section 2): an ancient observatory island above a sea of cloud.
   Moonstone terraces and towers with gold bands, brass instruments (orreries, telescopes, calipers), cut-glass lenses,
   star shards that fell and took root, and restrained Light and Shadow: pale moonstone beside dark slate, with violet
   Resonance light only where something still hums. People and Aminas worked here together: stairs, benches and doors
   come in two sizes.
   - N: the island's six obstacle kinds (cached per variant; island3d.js bakes them into one mesh) and four scenery kinds
     for its groves (moon trees, shard sprouts, moon rocks and star vines under the rim).
   - X: the places (the Cloud Jetty, the Cloudstair, Starfall Terrace, the Orrery Wheel, Cloud Sea Cistern, the Lens
     Gallery, the Hall of Two Doors, the Chart Room, the Bell Loft, the Shadowed Dome, Lenshold, the Silent Observatory
     with its empty lens mount and the sealed Threshold door) and nine dungeon entrances. An entrance has three looks:
     0 dark (locked), 1 lit (its turn has come), 2 cleared (a gold star on the lintel).
   Sizes are in prop voxels (1/8 cell); x along the map's x, z along the map's y, y up; the camera sees the +x and +z
   faces. Glow voxels are drawn unlit in the island's shared glow mesh; nothing here adds lights, shaders, transparency,
   particles or per-frame work. Every Celestial place is baked into the island's merged mesh (island3d.js, 'c_' kinds). */
import { hash, pick } from '../voxmesh.js';
import { H, X, N, extraSize } from '../voxbuild.js';

const MOON = ['#e8e4fb', '#dcd6f4', '#f0ecff', '#d4cdf0'], MOOND = ['#bdb5e4', '#b0a8da', '#c6bfea'];
const SLATE = ['#5d5a9a', '#524f8e', '#6764a6'], SLATED = ['#3e3b72', '#36336a', '#46437c'];
const BRASS = ['#c8a050', '#b8903f', '#d6b062'], BRASSD = ['#8a6a30', '#7a5c28'], GOLD = ['#ffd86b', '#ffe9a0'];
const LENS = ['#9fd8e8', '#b8e6f0', '#c8f0ff'], VIOLET = ['#8a6ad8', '#b89aff', '#a07ae8'], CLOUD = ['#ffffff', '#f2f0ff', '#e4e2f6'];
const LEAF = ['#b8c8ff', '#a6b8f6', '#c8d4ff', '#9fb2f2'], PAPER = ['#f4ecd4', '#e8dcc0'], WATER = ['#bfe4ff', '#acd8fa'];
const EL = { wind: '#bfe8ff', light: '#ffe58a', metal: '#d8dce8', water: '#7ac8f0', dark: '#b89aff', resonance: '#ff9ee0' };
const moon = (x, y, z) => pick(H(x, y, z, 801) > 0.9 ? MOOND : MOON, H(x, z, y, 802));
const slate = (x, y, z) => pick(H(x, y, z, 803) > 0.88 ? SLATED : SLATE, H(z, x, y, 804));
// a gold band round a moonstone block (the island's signature, as on its cliffs)
function band(m, x0, y, z0, x1, z1) { m.box(x0, y, z0, x1, y + 1, z1, BRASS); }
function post(m, x, z, h, cap) { m.box(x, 0, z, x + 1, h, z + 1, BRASS); m.put(x, h, z, cap || GOLD[0], !!cap); }
// a lens: a disc of glass standing upright in a brass ring, facing +x (axis 'x') or +z
function lens(m, cx, cy, cz, r, axis, tint) {
  for (let a = -r - 1; a <= r + 1; a++) for (let b = -r - 1; b <= r + 1; b++) {
    const d = Math.hypot(a, b); if (d > r + 0.9) continue; const ring = d > r - 0.4;
    const c = ring ? pick(BRASS, a + b) : (d < 1.2 && tint ? tint : pick(LENS, a * 3 + b));
    if (axis === 'x') m.put(cx, cy + b, cz + a, c); else m.put(cx + a, cy + b, cz, c);
  }
}

/* ---------------------------------------------------------------- obstacles (all six existing kinds) */
// DRIFTING STONE (2×2): a chunk of moonstone hovering a hand's breadth above a pale rubble ring, a gold seam on its side
// and a cluster of crystal under it (the gap reads as "drifting"; it does not move)
N.floatstone = (m, v) => {
  m.disc(0, 0, 5.5, 0, 1, (x, y, z) => (H(x, z, 810) > 0.6 ? MOOND[0] : MOON[3]));
  m.ball(0, 7 + v * 0.5, 0, 6.2, 3.4, 5.6, moon); m.ball(-1, 10 + v * 0.5, 1, 4, 2.2, 3.8, moon);
  for (let i = -5; i <= 5; i++) m.put(i, 7 + (i % 3 === 0 ? 1 : 0), 5, BRASS[i & 1]);
  [[0, 0, 3], [-2, 1, 2], [2, -1, 2]].forEach(([x, z, h], i) => m.box(x, 4 - h + 1, z, x + 1, 5, z + 1, VIOLET[i % 3], i === 0));
  m.put(3, 12 + v, -1, GOLD[1], true);
};
// STAR SHARD (1×1): a pale-gold crystal standing out of a small moonstone socket, a lit tip, two smaller shards
N.starshard = (m, v) => {
  m.disc(0, 0, 2.4, 0, 1, MOOND);
  for (let y = 1; y < 11 + v; y++) { const w = y < 8 + v ? 1 : 0; m.box(0, y, 0, 1 + w, y + 1, 1 + w, y > 8 + v ? GOLD[1] : pick(['#f0d890', '#e6c46a', '#fff3b0'], y), y > 9 + v); }
  m.box(-2, 1, 1, -1, 5, 2, '#e6c46a'); m.put(-2, 5, 1, GOLD[1], true); m.box(2, 1, -2, 3, 4 + v, -1, '#f0d890');
};
// MOONBLOOM (1×1): a short pale stem, a broad white bloom with a gold heart, two leaves at its foot
N.moonbloom = (m, v) => {
  for (let y = 0; y < 4 + v; y++) m.put(0, y, 0, '#a8c8b8');
  const t = 4 + v; m.box(-2, t, -1, 3, t + 1, 2, '#f4f0ff'); m.box(-1, t, -2, 2, t + 1, 3, '#f4f0ff'); m.box(-1, t + 1, -1, 2, t + 2, 2, '#e8e4fb'); m.put(0, t + 1, 0, GOLD[0], true);
  m.box(1, 0, 0, 3, 1, 1, '#9fc0b0'); m.box(-2, 0, 1, 0, 1, 2, '#9fc0b0'); if (v === 3) { m.put(2, 2, 2, '#a8c8b8'); m.put(2, 3, 2, '#f4f0ff'); }
};
// FALLEN PILLAR (1×1): a broken moonstone column lying across its plinth, gold band on the drum, a short stump standing
N.pillar = (m, v) => {
  m.box(-3, 0, -3, 4, 1, 4, MOOND);
  m.box(-3, 1, -3, 0, 6 + v, 0, moon); band(m, -3, 4, -3, 0, 0);
  m.box(-1, 1, 1, 5, 4, 4, moon); m.box(2, 1, 1, 3, 4, 4, BRASS);
  m.put(4, 1, -2, MOON[2]); m.put(-2, 1, 3, MOON[1]);
};
// CLOUD PUFF (1×1): a small cloud resting on the grass (three soft lobes, white over lavender)
N.cloudpuff = (m, v) => {
  const c = (x, y, z) => pick(y > 4 ? CLOUD : ['#e4e2f6', '#d8d6ee'], H(x, y, z, 820));
  m.ball(0, 3, 0, 3.6, 2.6, 3, c); m.ball(-2, 5, 1, 2.2, 1.8, 2, c); m.ball(2, 4 + v * 0.5, -1, 2.4, 2, 2.2, c);
};
// SKY GEODE (2×2): a cracked moonstone geode split open, violet crystals inside, a sliver of gold
N.geode = (m, v) => {
  m.ball(0, 4, 0, 6.5, 5, 6, (x, y, z) => pick(H(x, y, z, 830) > 0.8 ? MOOND : ['#9a94c8', '#8a84b8', '#a8a2d4'], H(z, y, x, 831)));
  m.clear(-1, 3, 1, 7, 10, 7);
  [[2, 3, 3, 6], [4, 3, 2, 4], [1, 3, 5, 3], [3, 4, 4, 5]].forEach(([x, y, z, h], i) => m.box(x, y, z, x + 1, y + h, z + 1, VIOLET[i % 3], i === 0 || (i === 3 && v === 2)));
  m.put(0, 5, 5, GOLD[0]); m.disc(-4, -4, 1.5, 0, 1, MOON);
};

/* ---------------------------------------------------------------- scenery for the island's groves */
N.moontree = (m, v) => { for (let y = 0; y < 8 + v * 2; y++) m.put(0, y, 0, pick(MOOND, y)); const t = 8 + v * 2;
  m.ball(0, t + 1, 0, 2.6, 2, 2.6, LEAF); m.ball(1, t + 3, -1, 1.6, 1.4, 1.6, LEAF); if (v === 2) m.put(-1, t + 3, 1, GOLD[1], true); };
N.shardsprout = (m, v) => { m.box(0, 0, 0, 1, 3 + v, 1, '#e6c46a'); m.put(0, 3 + v, 0, GOLD[1], true); m.box(1, 0, 1, 2, 2 + (v & 1), 2, '#f0d890'); };
N.moonrock = (m, v) => { m.ball(0, 1.2, 0, 2.2 + v * 0.3, 1.6, 2, (x, y, z) => (y > 1 ? pick(MOON, H(x, y, z, 840)) : pick(MOOND, H(x, z, y, 841)))); };
// pale strands hanging from the island's edges (where other islands have vines), with the odd lit star at a tip
N.starvine = (m, v) => { for (let k = 0; k < 3; k++) { const len = 5 + Math.floor(hash(k, v, 845) * 8); for (let j = 0; j < len; j++) m.put(k * 2 - 2, -j, 0, j === len - 1 && k === v ? GOLD[1] : pick(['#c8c0ec', '#b8b0e2', '#d6d0f2'], j + k), j === len - 1 && k === v); } };

/* ---------------------------------------------------------------- places */
// THE CLOUD JETTY (4×1, sand): moonstone boards out over the cloud, brass-capped mooring posts, a moon lantern
X.c_jetty = (m) => {
  const W = m.W / 2;
  m.box(-W, 0, -2, W, 1, 2, (x) => pick(x % 4 ? MOON : MOOND, x));
  [-W + 1, -4, 4, W - 2].forEach((x) => { m.box(x, 0, 2, x + 1, 6, 3, MOOND); m.put(x, 6, 2, BRASS[0]); });
  m.box(W - 3, 0, -3, W - 2, 12, -2, BRASS); m.box(W - 4, 12, -4, W - 1, 13, -1, BRASS); m.glow(W - 3, 10, -3, W - 2, 12, -2, '#dce4ff');
  m.box(-W + 3, 1, -1, -W + 6, 3, 1, '#a89a7a'); m.box(-W + 3, 3, -1, -W + 6, 4, 1, LENS);   // a crate of lens blanks
  m.disc(-4, 0, 1.2, 1, 2, BRASSD); m.disc(-4, 0, 0.5, 1, 2, null);                           // a coil of brass chain
};
// THE CLOUDSTAIR (1×2, path): steps climbing north in two widths, with a faint light-rail along the west side
X.c_cloudstair = (m) => {
  const D2 = m.H / 2;
  for (let i = 0; i < 6; i++) { const z = D2 - 2 - i * 2.4 | 0, y = i; m.box(-4, 0, z - 2, 1, y + 1, z + 1, moon); m.box(1, 0, z - 2, 4, Math.max(1, y), z + 1, MOOND); }
  for (let z = -D2 + 1; z < D2 - 1; z += 3) { m.box(-5, 0, z, -4, 8, z + 1, BRASS); m.put(-5, 8, z, GOLD[0]); }
  for (let z = -D2 + 1; z < D2 - 1; z++) if (z % 2 === 0) m.put(-5, 7, z, VIOLET[1], true);
};
// STARFALL TERRACE (3×1, path): moonstone planting beds in two tiers, star shards growing out of them, moonblooms
X.c_starfall = (m) => {
  const W = m.W / 2;
  m.box(-W, 0, -4, W, 2, -1, moon); m.box(-W + 1, 2, -4, W - 1, 4, -2, moon); band(m, -W, 2, -1, W, 0);
  m.box(-W + 2, 4, -4, W - 2, 5, -2, '#7a6a8a'); m.box(-W, 2, -1, W, 3, 0, '#7a6a8a');
  [[-9, 4, -3, 7], [-3, 4, -3, 10], [4, 4, -3, 6], [9, 4, -3, 8], [-6, 2, -1, 4], [1, 2, -1, 5], [7, 2, -1, 3]].forEach(([x, y, z, h], i) => {
    for (let k = 0; k < h; k++) m.put(x, y + k, z, k > h - 2 ? GOLD[1] : pick(['#f0d890', '#e6c46a'], k + i), k > h - 2);
  });
  [-7, -1, 6].forEach((x) => { m.put(x, 3, 1, '#8fb0a0'); m.put(x, 4, 1, '#f4f0ff'); m.put(x, 5, 1, GOLD[0]); });
};
// THE ORRERY WHEEL (4×1, path): a brass orrery under a cracked glass roof on four posts: a dull bronze sun, bodies on
// long arms, one arm bent down
X.c_orrery = (m) => {
  const W = m.W / 2;
  m.box(-W, 0, -4, W, 1, 4, moon); band(m, -W, 1, -4, W, 4);
  [[-W, -4], [W - 1, -4], [-W, 3], [W - 1, 3]].forEach(([x, z]) => m.box(x, 1, z, x + 1, 22, z + 1, BRASS));
  m.box(-W, 22, -4, W, 23, 4, (x, y, z) => ((x + z) % 7 === 0 ? '#e8f6ff' : (x * 3 + z) % 11 === 0 ? SLATE[0] : pick(LENS, x + z)));  // glass roof (one pane gone)
  m.clear(4, 22, -2, 7, 23, 1);
  m.box(-1, 1, -1, 1, 8, 1, BRASSD); m.ball(0, 11, 0, 3, 3, 3, ['#b8803a', '#a8702e', '#c8904a']);              // pillar and the bronze sun
  // (Phase 20C: the arms and bodies are a separate model, c_orrery_arms, that turns slowly once the Orrery Wheel is cleared)
  m.box(-W + 2, 1, 2, -W + 5, 2, 3, PAPER);                                                                  // a fallen chart
};
// CLOUD SEA CISTERN (2×1, sand): two stone basins brimming with cloud-water, a brass gutter running inland, mist on the rim
X.c_cistern = (m) => {
  const W = m.W / 2;
  [[-W, -4, -1], [1, -3, W]].forEach(([x0, z0, x1]) => { m.box(x0, 0, z0, x1, 5, 4, moon); m.box(x0 + 1, 1, z0 + 1, x1 - 1, 5, 3, null); m.box(x0 + 1, 1, z0 + 1, x1 - 1, 4, 3, WATER); band(m, x0, 5, z0, x1, 4); });
  m.box(-W, 6, 0, W + 2, 7, 1, BRASS); m.box(W + 1, 0, 0, W + 2, 6, 1, BRASSD);
  [[-W + 1, 6, -3], [-W + 3, 7, -2], [3, 6, 2], [5, 7, -2]].forEach(([x, y, z]) => m.ball(x, y, z, 1.8, 1, 1.4, CLOUD));
};
// THE LENS GALLERY (1×2, path): three great lenses in brass frames on moonstone plinths, each turned a little differently
X.c_lens = (m) => {
  const D2 = m.H / 2;
  [[-D2 + 3, 5], [0, 6], [D2 - 3, 5]].forEach(([z, r], i) => { m.box(-3, 0, z - 2, 3, 3, z + 2, moon); band(m, -3, 3, z - 2, 3, z + 2); m.box(-1, 3, z, 1, 6, z + 1, BRASSD); lens(m, 0, 7 + r, z, r - 2, i === 1 ? 'x' : 'z', i === 1 ? '#fff8d8' : null); });
  m.glow(1, 13, 0, 2, 14, 1, '#fff8d8');
};
// THE HALL OF TWO DOORS (1×3, path): a long hall with two doors side by side on its east face, one of pale moonstone and
// one of dark slate, both shut under a single lintel; half the roof slate, half moonstone
X.c_twinhall = (m) => {
  const D2 = m.H / 2;
  m.box(-4, 0, -D2, 3, 18, D2, (x, y, z) => (z < 0 ? moon(x, y, z) : slate(x, y, z)));
  m.gable(-5, -D2 - 1, 4, 1, 18, 'z', MOOND); m.gable(-5, 0, 4, D2 + 1, 18, 'z', SLATED);
  band(m, -4, 12, -D2, 4, D2);
  m.box(3, 0, -6, 4, 11, -1, MOON[2]); m.box(3, 0, 1, 4, 11, 6, SLATED[0]); m.box(3, 11, -7, 5, 13, 7, BRASS);                  // the two doors and their lintel
  m.put(4, 6, -2, BRASS[0]); m.put(4, 6, 2, BRASS[0]); m.glow(4, 13, -1, 5, 14, 1, VIOLET[1]);
  m.box(4, 0, -7, 7, 1, 7, MOOND);
};
// THE CHART ROOM (1×2, path): a square tower on the northern edge, shutters open on a dark room of shelves, a star vane
X.c_chart = (m) => {
  const D2 = m.H / 2;
  m.box(-4, 0, -D2 + 2, 4, 28, D2 - 2, moon); band(m, -4, 9, -D2 + 2, 4, D2 - 2); band(m, -4, 20, -D2 + 2, 4, D2 - 2);
  m.box(-5, 28, -D2 + 1, 5, 29, D2 - 1, SLATED); m.hip(-4, -D2 + 2, 4, D2 - 2, 29, SLATE);
  m.clear(3, 13, -3, 4, 19, 3); m.box(2, 13, -3, 3, 19, 3, (x, y, z) => ((y + z) % 3 ? '#2a2850' : pick(PAPER, y)));         // the room, shelves of charts
  m.box(4, 13, -5, 5, 19, -3, BRASSD); m.box(4, 13, 3, 5, 19, 5, BRASSD);                                                       // open shutters
  m.box(0, 33, 0, 1, 39, 1, BRASS); m.put(0, 39, 0, GOLD[1], true); m.put(-1, 37, 0, BRASS[0]); m.put(1, 37, 0, BRASS[0]);
  m.box(4, 0, D2 - 4, 7, 3, D2 - 1, PAPER); m.box(5, 3, D2 - 3, 6, 4, D2 - 2, PAPER);                                             // rolled charts at the door
};
// THE BELL LOFT (1×3, path): a slender moonstone tower with an open belfry, the great bell inside cracked rim to crown,
// a cupola and a faint violet hum at the crack
X.c_bell = (m) => {
  const D2 = m.H / 2;
  m.box(-4, 0, -5, 4, 24, 5, moon); band(m, -4, 8, -5, 4, 5); m.box(-5, 24, -6, 5, 25, 6, BRASS);
  [[-4, -5], [3, -5], [-4, 4], [3, 4]].forEach(([x, z]) => m.box(x, 25, z, x + 1, 38, z + 1, moon));
  m.box(-5, 38, -6, 5, 40, 6, SLATED); m.hip(-5, -6, 5, 6, 40, SLATE); m.box(0, 45, 0, 1, 49, 1, BRASS); m.put(0, 49, 0, GOLD[1], true);
  m.ball(0, 32, 0, 3.4, 4.5, 3.4, BRASS); m.clear(-2, 26, -2, 2, 29, 2);
  for (let y = 28; y < 37; y++) m.put(3, y, (y % 2), '#4a3a20'); m.put(3, 31, 0, VIOLET[1], true);                                // the crack
  m.box(-3, 0, D2 - 6, 3, 2, D2 - 1, MOOND); m.box(-3, 0, -D2 + 1, 3, 2, -D2 + 6, MOOND);
};
// THE SHADOWED DOME (4×1, path): a low dark slate hall with a dome, painted stars on the slate (a gap where some were
// scraped away), a dark doorway
X.c_dome = (m) => {
  const W = m.W / 2;
  m.box(-W, 0, -4, W, 9, 4, slate); band(m, -W, 9, -4, W, 4);
  m.ball(0, 10, 0, 9, 9, 5.5, slate); m.clear(-W, 0, -9, W, 30, -5); m.clear(-W, 0, 5, W, 30, 9);
  for (let i = 0; i < 26; i++) { const x = Math.round((hash(i, 1, 850) - 0.5) * 16), y = 11 + Math.round(hash(i, 2, 851) * 7); if (x > 2 && x < 6) continue; if (m.has(x, y, 5 - 1)) m.put(x, y, 4, GOLD[hash(i, 3, 852) > 0.5 ? 0 : 1]); }
  m.clear(-3, 0, 3, 3, 7, 4); m.box(-3, 0, 3, 3, 7, 4, '#1e1c3a'); m.box(-4, 7, 3, 4, 8, 5, BRASS);
  m.box(W - 4, 0, -2, W, 4, 2, MOOND); m.put(W - 2, 4, 0, SLATE[0]);
};
// LENSHOLD (1×2, path): broad moonstone steps, a dry fountain, a bench with a low end, a brass plaque worn smooth
X.c_lenshold = (m) => {
  const D2 = m.H / 2;
  for (let i = 0; i < 3; i++) m.box(-4, 0, -D2 + i * 2, 4, 3 - i, -D2 + i * 2 + 2, moon);
  m.disc(0, 3, 3.6, 0, 3, MOOND); m.disc(0, 3, 2.6, 1, 3, null); m.disc(0, 3, 2.6, 1, 2, '#b0a8da'); m.box(0, 1, 3, 1, 7, 4, moon); m.put(0, 7, 3, BRASS[0]);
  m.box(-4, 0, D2 - 3, 3, 2, D2 - 1, MOOND); m.box(-4, 2, D2 - 3, 0, 3, D2 - 1, MOON[2]); m.box(0, 2, D2 - 3, 3, 2, D2 - 1, null);  // the bench, a low end
  m.box(4, 0, -1, 5, 5, 2, BRASSD); m.box(4, 3, -1, 5, 5, 2, BRASS);
};
// THE SILENT OBSERVATORY (the 4×4 landmark slot): a moonstone plinth with steps, a round tower banded in gold under a
// great brass dome with its shutter half open and the telescope pointing out of it; on the terrace, the research left
// where it stood: a caliper, a chair pushed back from a desk of charts, a small armillary, and in front, an ornate lens
// mount on a pedestal holding nothing at all. At the foot of the tower, the Threshold's door (variant: 0 dark, 1 lit,
// 2 cleared), sealed.
X.c_observatory = (m, look) => {
  const W = m.W / 2;
  m.box(-W, 0, -W, W, 3, W, moon); band(m, -W, 3, -W, W, W); m.box(-W + 2, 3, -W + 2, W - 2, 4, W - 2, MOON[3]);
  for (let i = 0; i < 3; i++) m.box(-4, 0, W + i, 4, 3 - i, W + i + 1, MOOND);                                                     // south steps
  // the tower
  m.disc(-2, -2, 9.5, 4, 36, moon); band(m, -12, 14, -12, 8, 8); m.disc(-2, -2, 9.5, 14, 15, BRASS); m.disc(-2, -2, 9.5, 26, 27, BRASS);
  m.disc(-2, -2, 10.5, 36, 37, BRASSD);
  m.ball(-2, 37, -2, 10, 9, 10, (x, y, z) => (y > 37 ? pick(BRASS, H(x, y, z, 860)) : BRASSD[0]));
  m.clear(-3, 38, 2, 0, 47, 9);                                                                                                       // the shutter slit, half open
  m.box(-3, 38, 2, 0, 39, 8, '#2a2850');
  for (let i = 0; i < 9; i++) m.box(-3, 41 + i, 3 + i, -1, 43 + i, 5 + i, i > 6 ? BRASS[2] : BRASS[i & 1]);                         // the telescope
  m.put(-2, 44 + 8, 13, LENS[2]);
  m.box(-3, 45, -3, -1, 49, -1, BRASS); m.put(-2, 49, -2, GOLD[1], true);                                                            // the finial
  // windows: round, three around the tower at two heights
  [[7, 9, -2], [-2, 9, 7], [7, 21, -2], [-2, 21, 7]].forEach(([x, y, z]) => { if (x > 0) { m.box(x, y, z - 1, x + 1, y + 3, z + 2, '#2a2850'); m.put(x + 1, y + 1, z, LENS[0]); } else { m.box(x - 1, y, z, x + 2, y + 3, z + 1, '#2a2850'); m.put(x, y + 1, z + 1, LENS[0]); } });
  // the Threshold's door at the foot of the tower, on the south face: dark slate leaves with a seam
  const lit = look === 1 || look === true, done = look === 2;
  m.box(-5, 4, 6, 1, 13, 8, SLATED); m.box(-6, 4, 7, -5, 14, 9, BRASS); m.box(1, 4, 7, 2, 14, 9, BRASS); m.box(-6, 13, 7, 2, 15, 9, BRASS);
  if (done) m.box(-4, 4, 8, 0, 12, 9, '#1e1c3a'); else for (let y = 5; y < 12; y++) m.put(-2, y, 8, lit ? VIOLET[y % 3] : '#2e2c58', lit);
  if (lit || done) m.glow(-3, 15, 8, -1, 16, 9, done ? GOLD[1] : VIOLET[1]);
  // the terrace: a desk of charts and a chair pushed back, a caliper on a stand, a small armillary
  m.box(9, 4, -12, 14, 7, -9, '#8a6a4a'); m.box(9, 7, -12, 14, 8, -9, PAPER); m.put(13, 8, -11, '#2a2850');
  m.box(11, 4, -7, 13, 6, -5, '#8a6a4a'); m.box(11, 6, -5, 13, 9, -4, '#8a6a4a');                                                // the chair, turned away
  m.box(-13, 4, 9, -12, 14, 10, BRASSD); for (let i = 0; i < 5; i++) { m.put(-13 + i, 14 - i, 9, BRASS[0]); m.put(-13 - i, 14 - i, 9, BRASS[1]); } // the caliper
  m.box(-13, 4, -13, -11, 8, -11, moon); for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; m.put(-12 + Math.round(Math.cos(t) * 3), 11 + Math.round(Math.sin(t) * 3), -12, BRASS[a & 1]); m.put(-12, 11 + Math.round(Math.sin(t) * 3), -12 + Math.round(Math.cos(t) * 3), BRASSD[a & 1]); }
  // THE EMPTY LENS MOUNT (in front, south-east): a moonstone pedestal, an ornate brass ring with four claws, nothing in it
  m.box(9, 4, 9, 13, 9, 13, moon); band(m, 9, 8, 9, 13, 13);
  for (let a = 0; a < 20; a++) { const t = a / 20 * Math.PI * 2, y = 15 + Math.round(Math.sin(t) * 5), z = 11 + Math.round(Math.cos(t) * 5); m.put(11, y, z, BRASS[a % 3 ? 0 : 2]); }
  [[15, 11 - 4], [15, 11 + 4], [10, 11], [20, 11]].forEach(([y, z]) => m.put(11, y, z, GOLD[0]));
  m.box(11, 9, 10, 12, 11, 12, BRASSD);
  // a scatter of fallen charts on the terrace
  [[6, -13], [8, 2], [-9, 12], [13, 1]].forEach(([x, z], i) => m.put(x, 4, z, PAPER[i & 1]));
};

// THE ORRERY WHEEL'S ARMS (Phase 20C): a brass ring and four spokes around the bronze sun, a body on each, one spoke bent.
// Built round its own centre (the sun, voxel y 11 of the Orrery Wheel) so the island can turn it in place, slowly, in the
// plane the camera faces; it stays inside the glass roof and the footprint at every angle.
X.c_orrery_arms = (m) => {
  for (let a = 0; a < 36; a++) { const t = a / 36 * Math.PI * 2; m.put(Math.round(Math.cos(t) * 9.5), Math.round(Math.sin(t) * 9.5), 3, BRASS[a % 3 ? 0 : 2]); }
  [[0, '#8a86c8', 1.6], [Math.PI / 2, LENS[1], 1.3], [Math.PI, '#e8e4fb', 1.4]].forEach(([t, c, r]) => { for (let k = 3; k < 9; k++) m.put(Math.round(Math.cos(t) * k), Math.round(Math.sin(t) * k), 3, BRASS[1]); m.ball(Math.round(Math.cos(t) * 9.5), Math.round(Math.sin(t) * 9.5), 3, r, r, r, c); });
  // the bent spoke: straight for half its length, then kinked down
  for (let k = 3; k < 6; k++) m.put(0, -k, 3, BRASS[1]); for (let k = 0; k < 4; k++) m.put(k, -6 - k, 3, BRASS[1]); m.ball(4, -9, 3, 1.3, 1.3, 1.3, '#c8a8ff');
};
/* ---------------------------------------------------------------- dungeon entrances */
// Two moonstone posts with gold bands and a slate lintel; a door that glows in the dungeon's element when its turn
// has come and stands open, dark, once cleared (with a gold star on the lintel); a pennant on the right post for
// reading the state from across the island; and a small motif of what lies inside.
const GATE = {
  c_cloudstair: { s: 'stair' }, c_starfall: { s: 'shard' }, c_orrery: { s: 'ring' }, c_cistern: { s: 'basin' }, c_lens: { s: 'lens' },
  c_twinhall: { s: 'twin' }, c_chart: { s: 'scroll' }, c_bellloft: { s: 'bell' }, c_dome: { s: 'dome' },
};
function gate(m, id, g, look) {
  const el = { c_cloudstair: 'wind', c_starfall: 'light', c_orrery: 'metal', c_cistern: 'water', c_lens: 'light', c_twinhall: 'dark', c_chart: 'metal', c_bellloft: 'resonance', c_dome: 'dark' }[id];
  const c = EL[el], lit = look === 1 || look === true, done = look === 2;
  const p = (x) => { m.box(x, 0, -1, x + 2, 16, 1, moon); band(m, x, 6, -1, x + 2, 1); band(m, x, 15, -1, x + 2, 1); };
  p(-5); p(3); m.box(-6, 16, -2, 6, 18, 2, SLATED); m.box(-5, 18, -1, 5, 19, 1, BRASS);
  if (done) { m.box(-3, 0, -1, 3, 15, 0, '#1e1c3a'); m.glow(-1, 19, -1, 1, 22, 1, GOLD[1]); m.put(-2, 20, 0, GOLD[0], true); m.put(2, 20, 0, GOLD[0], true); }
  else { m.box(-3, 0, -1, 3, 15, 0, lit ? c : SLATE[1], false); if (lit) { m.glow(-3, 1, 0, 3, 2, 1, c); m.glow(-1, 19, -1, 1, 21, 1, c); } }
  m.box(4, 16, 0, 5, 26, 1, BRASS); m.box(5, 22, 0, 9, 25, 1, done ? GOLD[0] : lit ? c : '#8a86a8', lit || done); m.box(5, 21, 0, 7, 22, 1, done ? GOLD[0] : lit ? c : '#8a86a8');
  const s = g.s;
  if (s === 'stair') for (let i = 0; i < 3; i++) m.box(-4, 0, 1 + i * 2, 4, 3 - i, 3 + i * 2, MOOND);
  if (s === 'shard') { [[6, 3, 7], [7, 5, 4]].forEach(([x, z, h]) => { for (let y = 0; y < h; y++) m.put(x, y, z, y === h - 1 ? GOLD[1] : '#e6c46a', y === h - 1 && (lit || done)); }); }
  if (s === 'ring') { for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; m.put(7 + Math.round(Math.cos(t) * 2), 4 + Math.round(Math.sin(t) * 2), 3, BRASS[a & 1]); } m.box(7, 0, 3, 8, 2, 4, BRASSD); }
  if (s === 'basin') { m.disc(0, 4, 3, 0, 2, moon); m.disc(0, 4, 2, 1, 2, WATER); }
  if (s === 'lens') { m.box(-8, 0, 1, -7, 6, 2, BRASSD); lens(m, -7, 9, 2, 2, 'x', null); }
  if (s === 'twin') { m.box(5, 0, 2, 7, 8, 3, MOON[2]); m.box(7, 0, 2, 9, 8, 3, SLATED[0]); }
  if (s === 'scroll') { m.box(5, 0, 2, 9, 2, 4, PAPER); m.box(6, 2, 2, 8, 3, 4, PAPER); }
  if (s === 'bell') { m.box(-9, 0, 1, -8, 9, 2, BRASSD); m.box(-9, 9, 1, -5, 10, 2, BRASSD); m.ball(-6, 7, 1.5, 1.6, 1.8, 1.6, BRASS); }
  if (s === 'dome') { m.ball(7, 0, 3, 2.6, 3, 2.6, slate); m.put(7, 2, 5, GOLD[0]); }
};
Object.keys(GATE).forEach((id) => { X['c_gate_' + id] = (m, look) => gate(m, id, GATE[id], look); });

extraSize('c_jetty', 4, 1, 16); extraSize('c_cloudstair', 1, 2, 12); extraSize('c_starfall', 3, 1, 16); extraSize('c_orrery', 4, 1, 26);
extraSize('c_cistern', 2, 1, 12); extraSize('c_lens', 1, 2, 22); extraSize('c_twinhall', 1, 3, 26); extraSize('c_chart', 1, 2, 42);
extraSize('c_bell', 1, 3, 52); extraSize('c_dome', 4, 1, 22); extraSize('c_lenshold', 1, 2, 10); extraSize('c_observatory', 4, 4, 56);
Object.keys(GATE).forEach((id) => extraSize('c_gate_' + id, 1, 1, 28)); extraSize('c_orrery_arms', 4, 1, 14);
