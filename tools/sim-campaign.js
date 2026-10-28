// Balance simulation for the v0.6 campaign. The computer plays the player's side (B.autoAction: guards charges,
// heals when low, prefers strong elements). Reports, per dungeon: clears in one sitting, and attempts needed when
// progress is kept between attempts (the real rule). Run: node tools/sim-campaign.js [runs]
const { load, seeded } = require('../tests/harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, B = R.Battle;
const N = +process.argv[2] || 100, OFF = +(process.argv[4] || 0), POL = process.argv[5] || 'smart';
const naive = (b) => { if (b.pending) return { t: 'sw', to: b.party.findIndex((p) => p.hp > 0) }; const l = B.legal(b).filter((x) => x.ready && D.ABILITIES[x.id].power); return { t: 'ab', id: (l[l.length - 1] || B.legal(b).find((x) => x.ready)).id }; };
const pick = (b) => (POL === 'naive' ? naive(b) : B.autoAction(b));
const PARTIES = {
  forgottenroad: [['lumifern', 4], ['mossbun', 3]], gatheringhall: [['lumifern', 5], ['mossbun', 4], ['pebblop', 4]],
  reliquary: [['lumifern', 6], ['mossbun', 5], ['emberkit', 5]], drownedsteps: [['lumifern', 8], ['mossbun', 7], ['pebblop', 7]],
  coldkiln: [['umbrit', 10], ['ripplet', 9], ['brinefin', 9]], hollowveil: [['solarbloom', 12], ['emberkit', 11], ['ripplet', 11]],
  lanternorchard: [['duskmantle', 14], ['veilfox', 13], ['gloomole', 13]], windstair: [['solarbloom', 16], ['graniteling', 15], ['emberkit', 15]],
  resonancescar: [['solarbloom', 18], ['duskmantle', 17], ['emberkit', 17]], heartwood: [['solarbloom', 20], ['duskmantle', 20], ['emberkit', 19]],
};
function setup(id, team) {
  const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern';
  team.forEach(([sp, lv]) => R.addAmina(st, sp, Math.max(1, lv + OFF)));
  Object.assign(st.struct, { hollow: true, reliquarygate: true, tidegate: true, moonshrine: true }); st.flags.r1 = st.flags.r2 = st.flags.hollowveil = true; st.rank = 12;
  const d = D.DUNGEONS[id]; if (d.prev) st.dungeon[d.prev] = { clears: 1 };
  return st;
}
function attempt(st, id, k) {
  R.startRun(st, id, st.aminas.map((a) => a.uid));
  while (st.run) { const b = R.createBattle(st, seeded(k * 7919 + st.run.battle * 31 + 1)); let t = 0; while (!b.over && t++ < 400) B.act(b, pick(b)); const o = R.resolveBattle(st, b); R.drain(); if (!o.win) return false; }
  return R.dungeonCleared(st, id);
}
const ids = process.argv[3] && process.argv[3] !== 'all' ? [process.argv[3]] : D.CAMPAIGN.starter.dungeons;
console.log('policy ' + POL + ', level offset ' + OFF);
console.log('dungeon            party                        one sitting   mean attempts (progress kept)');
ids.forEach((id) => {
  const team = PARTIES[id]; let one = 0, tot = 0;
  for (let k = 0; k < N; k++) {
    const st = setup(id, team); if (attempt(st, id, k)) one++;
    const s2 = setup(id, team); let a = 1; while (!attempt(s2, id, k * 13 + a) && a < 30) a++; tot += a;
  }
  console.log(id.padEnd(18) + ' ' + team.map((t) => t[0] + ' ' + t[1]).join(', ').padEnd(28) + ' ' + (one + '/' + N).padEnd(13) + ' ' + (tot / N).toFixed(2));
});
