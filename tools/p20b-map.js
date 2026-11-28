// Phase 20B: writes docs/audit20b/map.json (the Celestial Crown as built: its map, 62 obstacles, twelve places and ten
// entrances from the game data) for the labelled map image (tools/p20b-mapimg.py), checking every cell again.
const { load } = require('../tests/harness'); const D = load().A.Data; const fs = require('fs'), path = require('path');
const m = D.MAPS.celestial, isl = D.ISLANDS.celestial, ob = {};
D.OBSTACLES.celestial.forEach((o) => { const t = D.OBSTACLE_TYPES[o.type]; for (let y = o.y; y < o.y + t.h; y++) for (let x = o.x; x < o.x + t.w; x++) ob[x + ',' + y] = o.id; });
const safe = (x, y, w, h, slot) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (m[yy][xx] === '~' || isl.buildable[yy][xx] || ob[xx + ',' + yy] || (slot ? m[yy][xx] !== 'x' : m[yy][xx] === 'x')) return false; return true; };
const out = { map: m, obstacles: D.OBSTACLES.celestial.map((o) => ({ id: o.id, type: o.type, x: o.x, y: o.y, w: D.OBSTACLE_TYPES[o.type].w, h: D.OBSTACLE_TYPES[o.type].h })),
  sites: D.C20.sites.map((s) => ({ id: s.id, name: s.name, role: s.role, x: s.x, y: s.y, w: s.w, h: s.h, safe: safe(s.x, s.y, s.w, s.h, s.slot) })),
  gates: D.C20.gates.map((g) => ({ id: g.id, n: g.n, name: g.name, rec: g.rec, x: g.x, y: g.y, inside: !!g.inside, safe: safe(g.x, g.y, 1, 1, g.inside) })) };
console.log('all safe:', out.sites.every((s) => s.safe) && out.gates.every((g) => g.safe));
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'audit20b', 'map.json'), JSON.stringify(out));
