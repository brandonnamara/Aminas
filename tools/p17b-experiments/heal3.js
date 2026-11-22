// Phase 17B experiment: when healing pays off over whole dungeons (Aimza, Acinus, Kairyu; 80 runs a dungeon).
process.env.P17B_LIB = '1';
const { Game, loadAt, seeded, pct, mean } = require('../p17b-sim.js');
const g = Game(loadAt(null), 'mod'), D = g.D;
const lines = ['aimza', 'acinus', 'kairyu'], DUN = D.CAMPAIGN.starter.dungeons;
const rules = { never: () => false, current: (b, p, e) => e.hp > e.hpMax * 0.3 && (p.hp < p.hpMax * 0.45 || (p.st.burn > 0 && p.hp < p.hpMax * 0.7)),
  topUp: (b, p, e) => (!e.boss && e.hp < e.hpMax * 0.3 && p.hp < p.hpMax * 0.6) || (p.st.burn > 0 && p.hp < p.hpMax * 0.6) || (g.B.alive(b) === 1 && p.hp < p.hpMax * 0.35 && e.hp > e.hpMax * 0.3) };
for (const br of [0, 0.25]) { D.COMBAT17.healBrace = br;
 for (const [rn, fn] of Object.entries(rules)) { g.healRule = fn; const row = []; for (const off of [-2, -1, 0]) { const v = []; DUN.forEach((id) => { const lv = D.DUNGEONS[id].recommended + off; let c = 0; for (let s = 0; s < 80; s++) if (g.run(id, lines, lv, 'tactical', 300 + s).cleared) c++; v.push(pct(c, 80)); }); row.push(off + ':' + mean(v).toFixed(1)); } console.log('brace', br, rn.padEnd(8), row.join('  ')); } }
