// Phase 17B experiment: Cold Kiln options on the 17B rules (first-try clears at party levels 9/10/11/12, 150 runs).
process.env.P17B_LIB = '1';
const { Game, loadAt, pct } = require('../p17b-sim.js');
const g = Game(loadAt(null), 'mod'), D = g.D, boss = D.DUNGEONS.coldkiln.battles[9], keep = Object.assign({}, boss);
const teams = { basicOnly: [['lumifern', 'cannonis', 'emberix'], 'basic'], advantage: [['cannonis', 'kairyu', 'aquaflora'], 'tactical'], balanced: [['lumifern', 'cannonis', 'emberix'], 'tactical'], healStatus: [['aimza', 'pyrokai', 'kairyu'], 'tactical'], defensive: [['acinus', 'zeep', 'terraflora'], 'tactical'], swiftWind: [['zephyr', 'kairyu', 'umbrit'], 'tactical'] };
const opts = { asBefore: { lv: 12 }, lv11: { lv: 11 }, hp135: { lv: 12, hpMult: 1.35 }, hp125: { lv: 12, hpMult: 1.25 } };
for (const [on, o] of Object.entries(opts)) {
  Object.assign(boss, keep, o);
  const row = Object.entries(teams).map(([tn, [lines, pol]]) => tn + ' ' + [9, 10, 11, 12].map((lv) => { let c = 0; for (let s = 0; s < 150; s++) if (g.run('coldkiln', lines, lv, pol, 9000 + s).cleared) c++; return pct(c, 150); }).join('/'));
  console.log(on.padEnd(10), row.join(' | '));
}
