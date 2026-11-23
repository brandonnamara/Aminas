// Phase 19B: labelled map of Obsidian Reach as built (data from the game's own rules, not a drawing).
// 32×32 cells: sea, land, buildable ground, the 59 obstacles (by type), the Cooling Forge places and the ten dungeon
// entrances in order, with the path between them. Run: node tools/p19b-map.js [out.svg]  (default docs/audit19b/map.svg)
const path = require('path'), fs = require('fs');
process.chdir(path.join(__dirname, '..'));
const { load } = require('../tests/harness'); const c = load(), D = c.A.Data;
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit19b', 'map.svg'); fs.mkdirSync(path.dirname(OUT), { recursive: true });
const I = D.ISLANDS.obsidian, C = 24, PAD = 30, W = I.grid.w * C + PAD * 2 + 250, H = I.grid.h * C + PAD * 2;
const OBC = { basalt: '#4a4658', crystal: '#d84aa8', embervent: '#ff7a3a', charred: '#6a4a3a', obsidianshard: '#2a2236', slagheap: '#8a6a5a' };
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter, system-ui, sans-serif">`;
s += `<rect width="${W}" height="${H}" fill="#14101c"/>`;
for (let y = 0; y < I.grid.h; y++) for (let x = 0; x < I.grid.w; x++) {
  const ch = I.map[y][x], X = PAD + x * C, Y = PAD + y * C;
  const fill = !I.land[y][x] ? (ch === 'w' ? '#2a3a6a' : '#1c2240') : I.buildable[y][x] ? '#4a3f5c' : '#3a3046';
  s += `<rect x="${X}" y="${Y}" width="${C}" height="${C}" fill="${fill}" stroke="#14101c" stroke-width="0.5"/>`;
}
D.OBSTACLES.obsidian.forEach((o) => { const t = D.OBSTACLE_TYPES[o.type]; s += `<rect x="${PAD + o.x * C + 2}" y="${PAD + o.y * C + 2}" width="${t.w * C - 4}" height="${t.h * C - 4}" rx="3" fill="${OBC[o.type]}" stroke="#000" stroke-opacity=".4"><title>${esc(o.id + ' · ' + t.name)}</title></rect>`; });
// the dungeon order as a path
const gs = D.O19.gates; s += `<polyline fill="none" stroke="#ffb05a" stroke-opacity=".55" stroke-width="2.5" stroke-dasharray="6 5" points="${gs.map((g) => (PAD + g.x * C + C / 2) + ',' + (PAD + g.y * C + C / 2)).join(' ')}"/>`;
D.O19.sites.forEach((p) => { const X = PAD + p.x * C, Y = PAD + p.y * C;
  s += `<rect x="${X}" y="${Y}" width="${(p.w || 1) * C}" height="${(p.h || 1) * C}" rx="4" fill="#ffe0a8" fill-opacity=".18" stroke="#ffd27a" stroke-width="2"/>`;
  if (!p.part) s += `<text x="${X + (p.w || 1) * C / 2}" y="${Y - 5}" text-anchor="middle" font-size="11" font-weight="700" fill="#ffe8c0" stroke="#14101c" stroke-width="3" paint-order="stroke">${esc(p.name.replace(/^The /, ''))}</text>`; });
gs.forEach((g) => { const X = PAD + g.x * C + C / 2, Y = PAD + g.y * C + C / 2;
  s += `<circle cx="${X}" cy="${Y}" r="10" fill="${g.boss ? '#c83a3a' : '#2a1e14'}" stroke="#ffb05a" stroke-width="2"/><text x="${X}" y="${Y + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="#ffe8c0">${g.n}</text>`; });
// legend
const LX = PAD * 2 + I.grid.w * C; let ly = PAD + 4;
const row = (sw, label) => { s += sw(LX, ly) + `<text x="${LX + 26}" y="${ly + 12}" font-size="12" fill="#e8e0f0">${esc(label)}</text>`; ly += 22; };
s += `<text x="${LX}" y="${ly + 10}" font-size="15" font-weight="800" fill="#ffe8c0">Obsidian Reach · Phase 19B</text>`; ly += 30;
row((x, y) => `<rect x="${x}" y="${y}" width="18" height="16" fill="#4a3f5c"/>`, 'Buildable ground');
row((x, y) => `<rect x="${x}" y="${y}" width="18" height="16" fill="#3a3046"/>`, 'Land (not buildable)');
row((x, y) => `<rect x="${x}" y="${y}" width="18" height="16" fill="#1c2240"/>`, 'Sea');
Object.keys(OBC).forEach((k) => row((x, y) => `<rect x="${x}" y="${y}" width="18" height="16" rx="3" fill="${OBC[k]}"/>`, D.OBSTACLE_TYPES[k].name + ' (' + D.OBSTACLES.obsidian.filter((o) => o.type === k).length + ')'));
row((x, y) => `<rect x="${x}" y="${y}" width="18" height="16" rx="3" fill="#ffe0a8" fill-opacity=".18" stroke="#ffd27a" stroke-width="2"/>`, 'Place (tap for its sheet)');
row((x, y) => `<circle cx="${x + 9}" cy="${y + 8}" r="8" fill="#2a1e14" stroke="#ffb05a" stroke-width="2"/>`, 'Dungeon entrance (sealed)');
row((x, y) => `<circle cx="${x + 9}" cy="${y + 8}" r="8" fill="#c83a3a" stroke="#ffb05a" stroke-width="2"/>`, 'Island Boss entrance');
ly += 8; gs.forEach((g) => { s += `<text x="${LX}" y="${ly + 12}" font-size="11.5" fill="#d8cce8"><tspan font-weight="800" fill="#ffb05a">${g.n}</tspan>  ${esc(g.name)} · Lv ${g.rec} · ${esc(g.el)}</text>`; ly += 18; });
s += '</svg>';
fs.writeFileSync(OUT, s); console.log('wrote', OUT, s.length, 'bytes');
