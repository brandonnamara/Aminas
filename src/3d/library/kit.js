/* Aminas — architectural component kit (Environment Phase 2, art bible section 9).
   Every building is assembled from these parts, so all buildings share materials, proportions and construction
   logic while each keeps its own silhouette. All sizes are in prop voxels (1/8 cell); +z is the front (the lit,
   lower-left face on screen), +x the right side. A part never decides colour on its own: it takes a material from
   MAT, so a building (or a whole island tradition, see biomes.js) can swap materials without changing shapes. */
import { PAL, EL, MAGIC } from '../voxstyle.js';
import { pick } from '../voxmesh.js';
import { H, stoneWork, planks, shingles, windowZ, windowX } from '../voxbuild.js';

/* ---------------------------------------------------------------- materials */
// A material is a colour spec the Model understands: '#hex', a palette (hashed per voxel) or fn(x,y,z).
export const MAT = {
  // masonry
  ashlar: stoneWork(['#c9c1b2', '#bdb4a3', '#d3ccbe']),              // dressed pale stone: halls, hatcheries
  stone: stoneWork(PAL.stone),                                       // coursed grey stone: foundations, towers
  rubble: (x, y, z) => pick(PAL.stone.concat(PAL.stoneDark, PAL.rock), H(x, y, z, 71)),   // field stone: walls, ruins
  brick: stoneWork(PAL.brick, '#7a3a28'),                            // smithies, chimneys, fire buildings
  slateStone: stoneWork(['#6a6488', '#5e587a', '#726c92']),          // dusk and moon buildings
  // timber and plaster
  plank: planks(PAL.wood), plankLight: planks(PAL.plank), log: (x, y, z) => ((y % 3) === 2 ? PAL.woodDark[0] : pick(PAL.wood, H(0, y >> 1, x + z, 72))),
  beam: PAL.woodDark, plaster: PAL.plaster,
  // roofs
  roof: (name) => shingles(PAL.roof[name] || name), thatch: (x, y, z) => ((x + z + y) % 4 === 0 ? '#b8964a' : pick(['#e8c46a', '#d8b05a', '#f2d47c'], H(x, y, z, 73))), turf: (x, y, z) => pick(PAL.grass, H(x, y, z, 74)),
  // metal and trim
  iron: ['#5a5e68', '#4e525c'], gold: PAL.gold, trimDark: PAL.woodDark[0],
};

/* ---------------------------------------------------------------- placement */
// at(m, dx, dy, dz): the same model, shifted, so any part or asset can be composed into a larger scene. Every Model
// method that draws goes through put/clear/has, so overriding those three is enough.
export function at(m, dx, dy, dz) {
  const p = Object.create(m), base = m;
  p.put = (x, y, z, c, g) => base.put(x + dx, y + dy, z + dz, c, g);
  p.clear = (x0, y0, z0, x1, y1, z1) => base.clear(x0 + dx, y0 + dy, z0 + dz, x1 + dx, y1 + dy, z1 + dz);
  p.has = (x, y, z) => base.has(x + dx, y + dy, z + dz);
  return p;
}

/* ---------------------------------------------------------------- foundations */
// style: 'stepped' (two courses, the benchmark), 'plinth' (one course and a dark skirt), 'deck' (timber posts and
// boards, for wet or uneven ground), 'rubble' (field stone, rural and ruined)
export function foundation(m, x0, z0, x1, z1, o) {
  o = o || {}; const h = o.h || 2, style = o.style || 'plinth', mat = o.mat || MAT.stone;
  if (style === 'deck') { for (let x = x0; x < x1; x += 4) for (let z = z0; z < z1; z += 4) m.box(x, 0, z, x + 1, h, z + 1, PAL.woodDark); m.box(x0, h, z0, x1, h + 1, z1, MAT.plankLight); return h + 1; }
  m.box(x0, 0, z0, x1, h, z1, style === 'rubble' ? MAT.rubble : mat);
  m.box(x0 - 1, 0, z0 - 1, x1 + 1, 1, z1 + 1, PAL.stoneDark);                       // the dark footing course
  if (style === 'stepped') m.box(x0 + 1, h, z0 + 1, x1 - 1, h + 1, z1 - 1, mat);
  if (o.cornerstones !== false) [[x0, z0], [x1 - 2, z0], [x0, z1 - 2], [x1 - 2, z1 - 2]].forEach(([x, z]) => m.box(x, 0, z, x + 2, h, z + 2, PAL.stoneDark.concat(['#8a857c'])));
  return h + (style === 'stepped' ? 1 : 0);
}

/* ---------------------------------------------------------------- walls */
// A hollow rectangular storey. kind: 'stone' | 'brick' | 'plank' | 'log' | 'timber' (plaster panels in a dark frame)
// | 'slate'. quoins: darker corner blocks on masonry. Returns the top y.
export function storey(m, x0, y, z0, x1, z1, h, kind, o) {
  o = o || {}; const top = y + h;
  const mat = { stone: MAT.stone, ashlar: MAT.ashlar, brick: MAT.brick, plank: MAT.plank, log: MAT.log, slate: MAT.slateStone, rubble: MAT.rubble }[kind];
  for (let yy = y; yy < top; yy++) for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) {
    if (x !== x0 && x !== x1 - 1 && z !== z0 && z !== z1 - 1) continue;
    if (kind === 'timber') { const beam = (x - x0) % 4 === 0 || (z - z0) % 4 === 0 || yy === y || yy === top - 1 || x === x1 - 1 || z === z1 - 1; m.put(x, yy, z, beam ? MAT.beam : MAT.plaster); }
    else m.put(x, yy, z, mat);
  }
  if (o.quoins && kind !== 'timber' && kind !== 'plank' && kind !== 'log') [[x0, z0], [x1 - 1, z0], [x0, z1 - 1], [x1 - 1, z1 - 1]].forEach(([x, z]) => { for (let yy = y; yy < top; yy++) if ((yy - y) % 2 === 0) m.put(x, yy, z, PAL.stoneDark[0]); });
  if (o.band) m.box(x0 - 1, top - 1, z0 - 1, x1 + 1, top, z1 + 1, o.band);           // a string course / jetty beam
  return top;
}

/* ---------------------------------------------------------------- roofs */
// shape: 'hip' | 'gable-x' | 'gable-z' | 'cone' (round towers) | 'shed' (lean-to) | 'pyramid' (steep hip).
// overhang: eaves beyond the walls (1 is the standard). Returns the ridge / apex y.
export function roof(m, x0, y, z0, x1, z1, shape, mat, o) {
  o = o || {}; const ov = o.overhang == null ? 1 : o.overhang, trim = o.trim || MAT.trimDark; x0 -= ov; z0 -= ov; x1 += ov; z1 += ov;
  if (shape === 'hip') return m.hip(x0, z0, x1, z1, y, mat, trim);
  if (shape === 'pyramid') { let i = 0, yy = y; while (x0 + i < x1 - i && z0 + i < z1 - i) { m.box(x0 + i, yy, z0 + i, x1 - i, yy + 2, z1 - i, i === 0 ? trim : mat); yy += 2; i++; } return yy; }
  if (shape === 'gable-x' || shape === 'gable-z') { const t = m.gable(x0, z0, x1, z1, y, shape === 'gable-x' ? 'x' : 'z', mat, o.gableWall || null, trim); ridge(m, x0, z0, x1, z1, t - 1, shape === 'gable-x' ? 'x' : 'z', o.ridge); return t; }
  if (shape === 'cone') { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; let r = (x1 - x0) / 2, yy = y; while (r > 0.6) { m.disc(cx, cz, r, yy, yy + 1, yy === y ? trim : mat); yy++; r -= 0.75; } m.box(Math.floor(cx), yy, Math.floor(cz), Math.floor(cx) + 1, yy + 3, Math.floor(cz) + 1, MAT.trimDark); return yy + 3; }
  if (shape === 'shed') { // a lean-to: o.fall is the side it drains to ('+x' or '+z')
    if (o.fall === '+x') { const n = x1 - x0; for (let i = 0; i < n; i++) m.box(x0 + i, y + Math.floor((n - i) / 2), z0, x0 + i + 1, y + Math.floor((n - i) / 2) + 1, z1, i === n - 1 ? trim : mat); return y + (n >> 1); }
    const n = z1 - z0; for (let i = 0; i < n; i++) m.box(x0, y + Math.floor((n - i) / 2), z0 + i, x1, y + Math.floor((n - i) / 2) + 1, z0 + i + 1, i === n - 1 ? trim : mat); return y + (n >> 1); }
  return y;
}
// a darker ridge cap along the top of a gable
export function ridge(m, x0, z0, x1, z1, y, axis, col) { col = col || MAT.trimDark; if (axis === 'x') { const z = Math.floor((z0 + z1) / 2) - 1; m.box(x0, y, z, x1, y + 1, z + 2, col); } else { const x = Math.floor((x0 + x1) / 2) - 1; m.box(x, y, z0, x + 2, y + 1, z1, col); } }

/* ---------------------------------------------------------------- openings */
export { windowZ, windowX };
// a round window (porthole / rose) on the +z face
export function roundWindow(m, cx, cy, z, r, lit) { for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const d = Math.hypot(x + 0.5, y + 0.5); if (d <= r) m.put(cx + x, cy + y, z, lit ? PAL.glow : '#3a3a52', lit); else if (d <= r + 1) m.put(cx + x, cy + y, z, MAT.trimDark); } }
// doors on the +z face: 'plank' (square, iron hinges), 'arched' (stone arch, warm light), 'round' (burrow door),
// 'double' (wide hall doors). Returns nothing; the opening glows warm behind a part-open leaf.
export function door(m, cx, y, z, kind, o) {
  o = o || {}; const w = kind === 'double' ? 6 : 4, h = kind === 'round' ? 5 : 7, x0 = cx - (w >> 1);
  m.clear(x0, y, z - 1, x0 + w, y + h, z + 1);
  m.glow(x0, y, z - 1, x0 + w, y + h, z, o.light || PAL.glowWarm);
  if (kind === 'arched' || kind === 'double') { m.clear(x0 + 1, y + h, z - 1, x0 + w - 1, y + h + 1, z + 1); m.glow(x0 + 1, y + h, z - 1, x0 + w - 1, y + h + 1, z, o.light || PAL.glowWarm); for (let yy = y; yy <= y + h; yy++) { m.put(x0 - 1, yy, z, PAL.stoneDark[0]); m.put(x0 + w, yy, z, PAL.stoneDark[0]); } m.box(x0, y + h + 1, z, x0 + w, y + h + 2, z + 1, PAL.stoneDark[0]); }
  else if (kind === 'round') { for (let x = x0 - 1; x <= x0 + w; x++) m.put(x, y + h, z, MAT.trimDark); m.put(x0 - 1, y + h - 1, z, MAT.trimDark); m.put(x0 + w, y + h - 1, z, MAT.trimDark); m.box(x0, y, z, x0 + 1, y + h, z + 1, '#4a8a3a'); }
  else { m.box(x0 - 1, y, z, x0, y + h + 1, z + 1, MAT.trimDark); m.box(x0 + w, y, z, x0 + w + 1, y + h + 1, z + 1, MAT.trimDark); m.box(x0 - 1, y + h, z, x0 + w + 1, y + h + 1, z + 1, MAT.trimDark); }
  // the leaf, ajar on its left hinge
  m.box(x0, y, z, x0 + 1, y + h, z + 2, o.leaf || MAT.plank); m.put(x0, y + 2, z + 2, MAT.iron[0]); m.put(x0, y + h - 2, z + 2, MAT.iron[0]);
  if (o.step !== false) m.box(x0 - 1, y - 1, z, x0 + w + 1, y, z + 3, MAT.stone);
}

/* ---------------------------------------------------------------- vertical elements */
// chimney: kind 'stone' | 'brick'; smoke: a soft glow at the top (ember) for lit hearths
export function chimney(m, x, y, z, h, kind, o) { o = o || {}; const mat = kind === 'brick' ? MAT.brick : MAT.stone; m.box(x, y, z, x + 3, y + h, z + 3, mat); m.box(x - 1, y + h, z - 1, x + 4, y + h + 1, z + 4, PAL.stoneDark); m.clear(x + 1, y + h, z + 1, x + 2, y + h + 1, z + 2); if (o.lit !== false) m.glow(x + 1, y + h - 1, z + 1, x + 2, y + h, z + 2, PAL.glowWarm); }
// a round tower body (for turrets, lighthouses, mage towers); returns top y
export function roundTower(m, cx, cz, r, y, h, mat, o) { o = o || {}; m.disc(cx, cz, r, y, y + h, mat); if (o.hollow) m.disc(cx, cz, r - 1, y + 1, y + h, null); if (o.band) m.disc(cx, cz, r + 0.6, y + h - 1, y + h, o.band); return y + h; }
// stairs climbing toward -z from (x0, y, z0), n steps, w wide
export function stairs(m, x0, y, z0, w, n, mat) { for (let i = 0; i < n; i++) m.box(x0, y, z0 - i, x0 + w, y + i + 1, z0 - i + 1, mat || MAT.stone); }
// a balcony on the +z face at height y: deck, brackets, a railing with balusters
export function balcony(m, x0, x1, y, z, depth, o) {
  o = o || {}; const d = depth || 3; m.box(x0, y, z, x1, y + 1, z + d, MAT.plankLight);
  for (let x = x0; x < x1; x += 3) { m.put(x, y - 1, z, MAT.trimDark); m.put(x, y - 2, z, MAT.trimDark); }
  for (let x = x0; x < x1; x++) { m.put(x, y + 3, z + d - 1, MAT.trimDark); if (x % 2 === 0) { m.put(x, y + 1, z + d - 1, MAT.trimDark); m.put(x, y + 2, z + d - 1, MAT.trimDark); } }
  for (let zz = z; zz < z + d; zz++) { m.put(x0, y + 3, zz, MAT.trimDark); m.put(x1 - 1, y + 3, zz, MAT.trimDark); }
  if (o.flowers) for (let x = x0 + 1; x < x1 - 1; x += 2) m.put(x, y + 1, z + d - 2, pick(PAL.flowers, H(x, y, z, 75)));
}
// fences along x (axis 'x') or z: 'picket' (boards with points), 'rail' (posts and two rails), 'stone' (low wall)
export function fence(m, x0, z0, len, axis, kind) {
  for (let i = 0; i < len; i++) { const x = axis === 'x' ? x0 + i : x0, z = axis === 'x' ? z0 : z0 + i;
    if (kind === 'stone') { m.box(x, 0, z, x + 1, 2 + (H(x, 0, z, 76) > 0.7 ? 1 : 0), z + 1, MAT.rubble); continue; }
    if (kind === 'picket') { if (i % 2 === 0) { m.box(x, 0, z, x + 1, 3, z + 1, '#f2e6c4'); m.put(x, 3, z, '#e2d6b4'); } m.put(x, 2, z, '#e2d6b4'); continue; }
    if (i % 4 === 0) m.box(x, 0, z, x + 1, 4, z + 1, PAL.woodDark); m.put(x, 1, z, PAL.wood[0]); m.put(x, 3, z, PAL.wood[0]); }
}
// a plank bridge along x from x0 to x1 with an arch of `rise`, rails on both sides
export function bridge(m, x0, x1, z0, w, rise, o) {
  o = o || {}; const n = x1 - x0;
  for (let i = 0; i < n; i++) { const t = i / (n - 1), y = Math.round(Math.sin(t * Math.PI) * rise); m.box(x0 + i, y, z0, x0 + i + 1, y + 1, z0 + w, i % 2 ? PAL.plank[0] : PAL.plank[1]);
    if (i % 3 === 0) { m.box(x0 + i, y + 1, z0, x0 + i + 1, y + 4, z0 + 1, PAL.woodDark); m.box(x0 + i, y + 1, z0 + w - 1, x0 + i + 1, y + 4, z0 + w, PAL.woodDark); }
    m.put(x0 + i, y + 3, z0, PAL.wood[0]); m.put(x0 + i, y + 3, z0 + w - 1, PAL.wood[0]); }
  if (o.lantern) { m.box(x0, 1, z0 + w - 1, x0 + 1, 7, z0 + w, PAL.woodDark); m.glow(x0, 7, z0 + w - 1, x0 + 1, 9, z0 + w, PAL.glow); }
}
// a raised platform (stage, dais, landing) with steps on the front
export function platform(m, x0, z0, x1, z1, h, mat) { m.box(x0, 0, z0, x1, h, z1, mat || MAT.stone); m.box(x0 - 1, h - 1, z0 - 1, x1 + 1, h, z1 + 1, PAL.stoneDark); stairs(m, (x0 + x1 >> 1) - 2, 0, z1 + h - 1, 4, h, mat || MAT.stone); return h; }

/* ---------------------------------------------------------------- details */
// small things that make a building feel lived in; each is placed against the +z face unless noted
export const detail = {
  beamEnds(m, x0, x1, y, z) { for (let x = x0; x < x1; x += 4) m.put(x, y, z, MAT.trimDark); },
  bracket(m, x, y, z) { m.put(x, y, z, MAT.trimDark); m.put(x, y - 1, z - 1, MAT.trimDark); },
  flowerBox(m, x, y, z, w) { m.box(x, y, z, x + w, y + 1, z + 1, PAL.woodDark); for (let i = 0; i < w; i++) m.put(x + i, y + 1, z, i % 2 ? pick(PAL.flowers, H(x + i, y, z, 77)) : PAL.leaf[0]); },
  banner(m, x, y, z, len, el) { const c = EL[el] || EL.light; for (let i = 0; i < len; i++) m.box(x, y - i, z, x + 2, y - i + 1, z + 1, i === len - 1 ? c[1] : c[0]); m.box(x - 1, y + 1, z, x + 3, y + 2, z + 1, MAT.trimDark); },
  weathervane(m, x, y, z) { m.box(x, y, z, x + 1, y + 4, z + 1, MAT.iron[0]); m.box(x - 1, y + 3, z, x + 2, y + 4, z + 1, MAT.gold); },
  lanternHook(m, x, y, z) { m.put(x, y, z, MAT.trimDark); m.put(x, y, z + 1, MAT.trimDark); m.glow(x, y - 2, z + 1, x + 1, y, z + 2, PAL.glowWarm); },
  sign(m, x, y, z, col) { m.put(x, y + 3, z, MAT.trimDark); m.put(x, y + 3, z + 1, MAT.trimDark); m.box(x - 1, y, z + 1, x + 2, y + 3, z + 2, col || PAL.plank[0]); },
  crystal(m, x, y, z, hue, h) { const c = MAGIC[hue] || MAGIC.egg; m.glow(x, y, z, x + 1, y + (h || 3), z + 1, c); m.put(x + 1, y, z, c, true); m.put(x, y, z + 1, c, true); },
};
