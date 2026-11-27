// Phase 20A: checks the PROPOSED Celestial Crown places against the real map (land, not buildable, no obstacle) and
// writes them with the map to docs/audit20a/map.json for the labelled map image. Design only: nothing is placed.
const { load } = require('../tests/harness'); const D = load().A.Data; const fs = require('fs'), path = require('path');
const m = D.MAPS.celestial, isl = D.ISLANDS.celestial, ob = {};
D.OBSTACLES.celestial.forEach((o) => { const t = D.OBSTACLE_TYPES[o.type]; for (let y = o.y; y < o.y + t.h; y++) for (let x = o.x; x < o.x + t.w; x++) ob[x + ',' + y] = o.id; });
const SITES = [
  { n: 1, id: 'cloudstair', name: 'Cloudstair Landing', x: 14, y: 30 }, { n: 2, id: 'starfall', name: 'Starfall Terrace', x: 14, y: 26 },
  { n: 3, id: 'orrery', name: 'The Orrery Wheel', x: 5, y: 17 }, { n: 4, id: 'cloudsea', name: 'Cloud Sea Cistern', x: 4, y: 23 },
  { n: 5, id: 'lensgallery', name: 'The Lens Gallery', x: 5, y: 14 }, { n: 6, id: 'twinhall', name: 'Hall of Two Doors', x: 17, y: 10 },
  { n: 7, id: 'hours', name: 'The Chart Room', x: 20, y: 5 }, { n: 8, id: 'bellloft', name: 'The Bell Loft', x: 28, y: 12 },
  { n: 9, id: 'umbra', name: 'The Shadowed Dome', x: 28, y: 16 }, { n: 10, id: 'threshold', name: 'The Threshold (beneath the Observatory)', x: 16, y: 16, landmark: true },
];
const PLACES = [
  { name: 'The Silent Observatory (hub, existing landmark)', x: 15, y: 15, w: 4, h: 4 }, { name: 'Landing jetty', x: 14, y: 32, w: 2, h: 1 },
  { name: 'Lenshold steps (hub square)', x: 17, y: 19, w: 1, h: 2 }, { name: 'Cloud pond (existing water)', x: 7, y: 21, w: 4, h: 4 },
];
const check = (x, y) => ({ land: m[y][x] !== '~', buildable: !!isl.buildable[y][x], obstacle: ob[x + ',' + y] || null, tile: m[y][x] });
const out = { map: m, obstacles: D.OBSTACLES.celestial.map((o) => ({ id: o.id, type: o.type, x: o.x, y: o.y, w: D.OBSTACLE_TYPES[o.type].w, h: D.OBSTACLE_TYPES[o.type].h })), sites: SITES.map((s) => Object.assign({}, s, check(s.x, s.y))), places: PLACES };
out.sites.forEach((s) => console.log(String(s.n).padStart(2), s.name.padEnd(42), s.x + ',' + s.y, 'tile', s.tile, 'land', s.land, 'buildable', s.buildable, 'obstacle', s.obstacle));
const okAll = out.sites.every((s) => s.land && !s.buildable && !s.obstacle); console.log('all sites on free non-buildable land:', okAll);
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'audit20a', 'map.json'), JSON.stringify(out));
