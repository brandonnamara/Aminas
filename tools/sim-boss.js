// Boss-only check: the party enters the boss battle at full health. naive = always the first ready damaging ability;
// smart = B.autoAction (guards charges, uses specials on barriers, heals low). Run: node tools/sim-boss.js [runs] [levelOffset]
const { load, seeded } = require('../tests/harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, B = R.Battle;
const N = +process.argv[2] || 200, OFF = +(process.argv[3] || 0);
const T = { forgottenroad: ['lumifern', 'mossbun'], gatheringhall: ['lumifern', 'mossbun', 'pebblop'], reliquary: ['lumifern', 'mossbun', 'emberkit'], drownedsteps: ['lumifern', 'mossbun', 'pebblop'], coldkiln: ['umbrit', 'ripplet', 'brinefin'], hollowveil: ['solarbloom', 'emberkit', 'ripplet'], lanternorchard: ['duskmantle', 'veilfox', 'gloomole'], windstair: ['solarbloom', 'graniteling', 'emberkit'], resonancescar: ['solarbloom', 'duskmantle', 'emberkit'], heartwood: ['solarbloom', 'duskmantle', 'emberkit'] };
const naive = (b) => { if (b.pending) return { t: 'sw', to: b.party.findIndex((p) => p.hp > 0) }; const l = B.legal(b).filter((x) => x.ready && D.ABILITIES[x.id].power); return { t: 'ab', id: (l[l.length - 1] || B.legal(b).find((x) => x.ready)).id }; };
console.log('boss (party at recommended ' + (OFF >= 0 ? '+' : '') + OFF + ')     naive   smart');
D.CAMPAIGN.starter.dungeons.forEach((id) => {
  const d = D.DUNGEONS[id], lv = d.recommended + OFF, res = {};
  ['naive', 'smart'].forEach((pol) => { let w = 0; for (let k = 0; k < N; k++) { const party = T[id].map((sp) => B.fighter(sp, Math.max(1, lv))); const b = B.create(party, R.enemyFromSpec(d.battles[9]), { rng: seeded(k + 1) }); let t = 0; while (!b.over && t++ < 400) B.act(b, pol === 'smart' ? B.autoAction(b) : naive(b)); if (b.result === 'win') w++; } res[pol] = w; });
  console.log((d.battles[9].title + ' (' + id + ')').padEnd(40) + String(res.naive).padStart(5) + String(res.smart).padStart(8) + '  /' + N);
});
