// Phase 18B: the labelled Verdant Wilds map (SVG) and the level-cap tables, straight from the game data.
// Run: node tools/p18b-map.js  → docs/ui/screens18b/verdant-map.svg, docs/audit18b/levelcap.json
const { load } = require('../tests/harness'); const fs = require('fs'), path = require('path');
const c = load(), D = c.A.Data, R = c.A.Rules, ROOT = path.join(__dirname, '..');
const isl = D.ISLANDS.verdant, C = 22, PAD = 30, N = 32, W = N * C + PAD * 2 + 250, H = N * C + PAD * 2;
const col = { '~': '#cfe6f2', s: '#efe0b0', g: '#a9d98a', p: '#dcc398', w: '#6cc0ea', b: '#b48a58', x: '#7c9a5a', h: '#93c070', r: '#a8a29a' };
let g = '';
isl.map.forEach((row, y) => row.split('').forEach((ch, x) => { g += '<rect x="' + (PAD + x * C) + '" y="' + (PAD + y * C) + '" width="' + C + '" height="' + C + '" fill="' + (col[ch] || '#ccc') + '" stroke="#ffffff" stroke-opacity=".35" stroke-width=".5"/>'; }));
D.OBSTACLE_LAYOUT.verdant.forEach(([id, t, x, y]) => { const T = D.OBSTACLE_TYPES[t]; g += '<rect x="' + (PAD + x * C + 3) + '" y="' + (PAD + y * C + 3) + '" width="' + (T.w * C - 6) + '" height="' + (T.h * C - 6) + '" rx="4" fill="#3f6a3a" opacity=".55"/>'; });
const lab = (x, y, t, a) => '<text x="' + x + '" y="' + y + '" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="700" fill="#1d2a1a" text-anchor="' + (a || 'middle') + '">' + t + '</text>';
D.V18.sites.forEach((s, i) => {
  g += '<rect x="' + (PAD + s.x * C + 1) + '" y="' + (PAD + s.y * C + 1) + '" width="' + (s.w * C - 2) + '" height="' + (s.h * C - 2) + '" rx="5" fill="#f2d16b" fill-opacity=".85" stroke="#7a5a10" stroke-width="2"/>';
  const L = String.fromCharCode(65 + i); g += lab(PAD + (s.x + s.w / 2) * C, PAD + (s.y + s.h / 2) * C + 4, L);
});
D.V18.gates.forEach((q) => { const cx = PAD + (q.x + 0.5) * C, cy = PAD + (q.y + 0.5) * C; g += '<circle cx="' + cx + '" cy="' + cy + '" r="9" fill="' + (q.boss ? '#c0392b' : '#2d4a8a') + '" stroke="#fff" stroke-width="2"/><text x="' + cx + '" y="' + (cy + 4) + '" font-family="Inter,Arial,sans-serif" font-size="10" font-weight="800" fill="#fff" text-anchor="middle">' + q.n + '</text>'; });
let ky = PAD + 6; const kx = PAD + N * C + 16; let key = '<text x="' + kx + '" y="' + ky + '" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="800" fill="#1d2a1a">Places</text>'; ky += 18;
D.V18.sites.forEach((s, i) => { key += lab(kx, ky, String.fromCharCode(65 + i) + '  ' + s.name.replace(/^The /, '') + (s.part ? ' (2)' : '') + '  (' + s.x + ',' + s.y + ')', 'start'); ky += 15; });
ky += 10; key += '<text x="' + kx + '" y="' + ky + '" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="800" fill="#1d2a1a">Dungeon entrances</text>'; ky += 18;
D.V18.gates.forEach((q) => { key += lab(kx, ky, q.n + '  ' + q.name + '  Lv ' + q.rec + '  (' + q.x + ',' + q.y + ')', 'start'); ky += 15; });
ky += 10; key += lab(kx, ky, 'Dark green: obstacles (60, unchanged)', 'start'); ky += 15; key += lab(kx, ky, 'Pale green: buildable grass (never used)', 'start');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '"><rect width="100%" height="100%" fill="#f7f4ea"/>' + g + key + '</svg>';
fs.writeFileSync(path.join(ROOT, 'docs/ui/screens18b/verdant-map.svg'), svg);
// level cap tables
const rows = []; let cum = 0; for (let lv = 1; lv < 40; lv++) { cum += R.xpNeed(lv); if (lv >= 28) rows.push({ lv, need: R.xpNeed(lv), toNext: lv + 1, cum, feasts: Math.ceil(R.xpNeed(lv) / D.SNACKS.feast.xp), food: Math.ceil(R.xpNeed(lv) / D.SNACKS.feast.xp) * D.SNACKS.feast.food }); }
const stats = ['lumifern', 'umbrit', 'gaiaroki', 'kairyu'].filter((s) => D.SPECIES[s]).map((sp) => ({ sp, at: [22, 30, 35, 40].map((lv) => Object.assign({ lv }, R.statsAt(sp, lv))) }));
const cum30 = rows.find((r) => r.lv === 29).cum, cum40 = rows.find((r) => r.lv === 39).cum;
fs.writeFileSync(path.join(ROOT, 'docs/audit18b/levelcap.json'), JSON.stringify({ cap: D.MAX_LEVEL, rows, stats, xpTo30: cum30, xpTo40: cum40, extra30to40: cum40 - cum30 }, null, 1));
console.log('xp to 30', cum30, 'to 40', cum40, 'extra', cum40 - cum30); console.log(JSON.stringify(stats.map((s) => s.sp + ' ' + s.at.map((a) => a.lv + ':' + a.hp + '/' + a.atk).join(' '))));
