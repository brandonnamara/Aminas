// Phase 19C: per-dungeon tuning search (simulation only). For each Obsidian dungeon, the threshold (lowest party level
// clearing first try in at least half of 16 runs, balanced trio, tactical play) under a range of health multipliers on
// top of the island tier, so each dungeon can be set to sit about two levels under its recommended level.
// Run: node tools/p19c-tune.js [id,id]   Not real gameplay.
process.env.P17B_LIB = '1';
const { Game, loadAt } = require('./p17b-sim.js');
const g = Game(loadAt(null), '19C'), D = g.D, TRIO = ['lumifern', 'cannonis', 'emberix'];
const ids = process.argv[2] ? process.argv[2].split(',') : D.CAMPAIGN.obsidian.dungeons;
const KS = (process.env.KS || '0.8,0.9,1,1.1,1.2,1.3').split(',').map(Number), AK = +(process.env.ATK || 1);
function threshold(id) { const rec = D.DUNGEONS[id].recommended; for (let off = -9; off <= 6; off++) { let c = 0; for (let s = 0; s < 16; s++) if (g.run(id, TRIO, rec + off, 'tactical', 300 + s).cleared) c++; if (c >= 8) return rec + off; } return rec + 7; }
ids.forEach((id) => { const d = D.DUNGEONS[id], base = d.battles.map((b) => Object.assign({}, b.tier)), row = [];
  KS.forEach((k) => { d.battles.forEach((b, i) => { b.tier = { hp: +(base[i].hp * k).toFixed(3), atk: +(base[i].atk * AK).toFixed(3) }; }); row.push(k + ':' + (threshold(id) - d.recommended)); });
  d.battles.forEach((b, i) => { b.tier = base[i]; }); console.log(id.padEnd(10), 'rec', d.recommended, ' offset by hp×', row.join('  ')); });
