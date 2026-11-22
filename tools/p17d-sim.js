// Phase 17D: dungeon challenge feasibility, starter-team guidance, and reward totals. Working tree only (the systems are
// new); the starter comparison also runs Phase 17C (f0b9308) to show its campaign is unchanged.
// Run: node tools/p17d-sim.js [outDir]  (default docs/audit17d). Deterministic; times assume 4.5 s per turn.
process.env.P17B_LIB = '1';
const fs = require('fs'), path = require('path');
const { Game, loadAt, seeded, pct, mean } = require('./p17b-sim.js');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit17d'); fs.mkdirSync(OUT, { recursive: true });
const write = (n, o) => fs.writeFileSync(path.join(OUT, n), JSON.stringify(o, null, 1));
const SECS = 4.5, N = +process.env.SEEDS || 100;
const g = Game(loadAt(null), '17D'), D = g.D, R = g.R, B = g.B, DUN = D.CAMPAIGN.starter.dungeons;

/* A player going for "Answer the guardian": against an unanswered guardian, it holds back the finishing blows until the
   charged move is coming (or the barrier is up), then guards it, soaks it or breaks the barrier with a special. */
const pol0 = g.policy;
g.policy = function (kind) {
  if (kind !== 'answer') return pol0(kind);
  const tac = pol0('tactical');
  return function (b) {
    const e = b.enemy, p = B.cur(b); if (b.pending || !e.boss || b.c17blunt) return tac(b);
    const legal = B.legal(b).filter((x) => x.ready), of = (k) => legal.find((x) => D.ABILITIES[x.id].type === k);
    if (e.mech && e.mech.type === 'barrier' && !(e.shield > 0)) return tac(b);
    if (e.shield > 0) { const sp = legal.filter((x) => D.ABILITIES[x.id].cd > 0 && D.ABILITIES[x.id].power).sort((a, c) => D.ABILITIES[c.id].power - D.ABILITIES[a.id].power)[0]; if (sp) return { t: 'ab', id: sp.id }; }
    // it charges this turn (the game shows the countdown): raise a guard now, or soak it so it sputters; once charging, guard
    if (e.move && (e.charging || e.chargeIn <= 0)) { const gd = of('guard'); if (gd) return { t: 'ab', id: gd.id }; const sk = legal.find((x) => (D.ABILITIES[x.id].fx || {}).k === 'soak'); if (sk && !e.charging) return { t: 'ab', id: sk.id }; const sn = legal.find((x) => (D.ABILITIES[x.id].fx || {}).k === 'stun'); if (sn && e.charging) return { t: 'ab', id: sn.id }; }
    if (e.move && !(e.mech && e.mech.type === 'barrier')) { const gd = of('guard'), h = of('heal'), w = of('weaken'); const hold = gd && !e.charging ? null : h || w; if (hold) return { t: 'ab', id: hold.id }; const weak = legal.filter((x) => D.ABILITIES[x.id].power).sort((a, c) => D.ABILITIES[a.id].power - D.ABILITIES[c.id].power)[0]; if (weak) return { t: 'ab', id: weak.id }; }
    return tac(b);
  };
};
/* ================================================================== 1. challenges: how often a replay meets each */
// The dungeon as the game runs it (health carries over; a loss ends the run), recording what the challenges look at:
// did anyone faint, and was the guardian's charged move (or barrier) answered.
function replay(id, lines, lv, seed, pol) {
  const d = D.DUNGEONS[id], rng = seeded(seed), pt0 = g.party(lines, lv), hpMax = pt0.map((p) => p.hpMax); let pt = pt0, lost = false, blunt = false, turns = 0;
  for (let i = 0; i < d.battles.length; i++) {
    const party = g.party(lines, lv).map((f, k) => Object.assign(f, { hp: Math.max(0, pt[k].hp) }));
    const b = B.create(party, R.enemyFromSpec(d.battles[i]), { rng }), r = g.fight(b, pol || 'tactical'); turns += r.turns;
    if (!r.win) return { cleared: false, lost: true, blunt, turns };
    if (b.party.some((p) => p.hp <= 0)) lost = true; if (b.c17blunt) blunt = true;
    pt = b.party.map((p, k) => Object.assign(p, { hp: Math.min(hpMax[k], p.hp > 0 ? p.hp + Math.round(hpMax[k] * 0.4) : Math.round(hpMax[k] * 0.2)) }));
    if (d.sections.findIndex((s) => s.to === i) >= 0) pt.forEach((p, k) => (p.hp = Math.min(hpMax[k], p.hp + Math.round(hpMax[k] * 0.5))));
  }
  return { cleared: true, lost, blunt, turns };
}
const KIN = { nature: ['acinus', 'terraflora', 'sylvaneer'], water: ['cannonis', 'kairyu', 'aquaflora'], fire: ['emberix', 'pyrokai', 'igniflare'] };
const trio = Object.keys(KIN).filter((k) => KIN[k].length === 3 && KIN[k].every((l) => D.SPECIES[l].el === k));
const ch = DUN.map((id) => {
  const rec = D.DUNGEONS[id].recommended, row = { id, rec, levels: {} };
  [0, 3, 6].forEach((off) => {
    const lv = rec + off, bal = [], ans = []; for (let s = 0; s < N; s++) { bal.push(replay(id, ['lumifern', 'cannonis', 'emberix'], lv, 7000 + s)); ans.push(replay(id, D.DUNGEONS[id].battles[9].move ? ['acinus', 'cannonis', 'emberix'] : ['lumifern', 'cannonis', 'emberix'], lv, 7000 + s, 'answer')); }
    const kin = {}; trio.forEach((el) => { let c = 0; for (let s = 0; s < N; s++) if (replay(id, KIN[el], lv, 7000 + s).cleared) c++; kin[el] = pct(c, N); });
    const best = Object.keys(kin).sort((a, b) => kin[b] - kin[a])[0];
    row.levels[off] = { lv, clear: pct(bal.filter((x) => x.cleared).length, N), flawless: pct(bal.filter((x) => x.cleared && !x.lost).length, N), guardian: pct(bal.filter((x) => x.cleared && x.blunt).length, N), guardianTrying: pct(ans.filter((x) => x.cleared && x.blunt).length, N), kindredBest: best + ' ' + kin[best] + '%', kindred: kin };
  });
  return row;
});
ch.forEach((r) => console.log(r.id.padEnd(15), [0, 3, 6].map((o) => '+' + o + ': clear ' + r.levels[o].clear + ' flawless ' + r.levels[o].flawless + ' guardian ' + r.levels[o].guardian + '/' + r.levels[o].guardianTrying + ' kin ' + r.levels[o].kindredBest).join(' | ')));
const C = D.CHALLENGE17, chTotals = { perDungeon: { gold: C.reward.gold * 3, essence: C.reward.essence * 3, gems: C.allThree.gems }, island: { gold: C.reward.gold * 3 * DUN.length, essence: C.reward.essence * 3 * DUN.length, gems: C.allThree.gems * DUN.length } };
write('challenges.json', { seeds: N, team: 'Lumifern, Cannonis, Emberix (tactical player); guardianTrying: a player going for the guardian challenge (Acinus, Cannonis, Emberix; for the barrier guardian Lumifern, Cannonis, Emberix); kindred: best of ' + trio.join('/') + ' trios', dungeons: ch, totals: chTotals });

/* ================================================================== 2. starter guidance: a lone starter vs recruiting */
// The 17C campaign agent (dungeons in order, tactical, replay the last dungeon after two defeats in a row), no feeding.
// 'recruit' follows the party picker's advice: before a dungeon from the Gathering Hall on, while the party is under
// three, it befriends the next Aminas Explore offers (Meadow first, then the Tide Pools), at the level Explore gives.
function campaign(gm, seed, plan) {
  const A = gm.A, Dd = gm.D, Rr = gm.R, rng = seeded(seed); Rr.rng = rng;
  const st = A.State.newGame(); st.phase = 'play'; st.introDone = true; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = st.flags.r2 = true;
  const uids = [Rr.addAmina(st, 'lumifern', 3).uid], finds = [['acinus', 2], ['gaiaroki', 2], ['cannonis', 3]];
  let battles = 0, turns = 0, losses = 0, grinds = 0, recruitedAt = []; const log = [];
  const avg = () => mean(uids.map((u) => Rr.inst(st, u).lv)), evolve = () => uids.forEach((u) => { while (Rr.evoCheck(st, u).ok) Rr.evolve(st, u); });
  const play = (id, from) => { Rr.startRun(st, id, uids, { from }); let out; do { const b = Rr.createBattle(st, rng); const r = gm.fight(b, 'tactical'); battles++; turns += r.turns; out = Rr.resolveBattle(st, b); } while (out.win && !out.cleared && st.run); return out; };
  let last = null;
  for (const id of Dd.CAMPAIGN.starter.dungeons) {
    const need = (Dd.DUNGEONS[id].unlock || {}).rank; if (need && st.rank < need) st.rank = need; if (id === 'lanternorchard') st.flags.hollowveil = true;
    if (plan === 'recruit' && Dd.DUNGEONS[id].index >= 2) while (uids.length < 3 && finds.length) { const [sp, lv] = finds.shift(); uids.push(Rr.addAmina(st, sp, lv).uid); recruitedAt.push(sp + ' before ' + id); }
    let fails = 0, guard = 0, tries = 0; const arrive = +avg().toFixed(1);
    while (!Rr.dungeonCleared(st, id) && guard++ < 300) { tries++; const out = play(id); if (!out.win) { losses++; fails++; } evolve(); if (fails >= 2 && last) { play(last, 0); grinds++; evolve(); fails = 0; } }
    last = id; log.push({ id, arrive, tries });
  }
  return { plan, losses, grinds, battles, minutes: Math.round(turns * SECS / 60), end: +avg().toFixed(1), party: uids.map((u) => Rr.inst(st, u).sp + ' ' + Rr.inst(st, u).lv), recruitedAt, log };
}
const g17c = Game(loadAt('f0b9308'), '17C');
const guide = {};
[['17C', g17c], ['17D', g]].forEach(([name, gm]) => ['solo', 'recruit'].forEach((plan) => { const runs = [5, 11, 22].map((s) => campaign(gm, s, plan)); guide[name + ' ' + plan] = { losses: +mean(runs.map((r) => r.losses)).toFixed(1), grinds: +mean(runs.map((r) => r.grinds)).toFixed(1), minutes: Math.round(mean(runs.map((r) => r.minutes))), end: +mean(runs.map((r) => r.end)).toFixed(1), example: runs[0] }; }));
Object.keys(guide).forEach((k) => console.log(k.padEnd(12), 'losses', guide[k].losses, 'grinds', guide[k].grinds, 'min', guide[k].minutes, 'end', guide[k].end));
// what the picker says, dungeon by dungeon, to a lone starter
const adv = DUN.map((id) => { const st = g.A.State.newGame(); const u = g.R.addAmina(st, 'lumifern', 5).uid; const a = g.R.partyAdvice(st, id, [u]); return { id, advice: a ? a.k + (a.hard ? ' (hard)' : '') : null }; });
write('guidance.json', { note: '3 seeds each, no feeding; recruit = befriend Acinus, Gaiaroki (Meadow, Lv 2) before the Gathering Hall, as the picker advises', results: guide, advice: adv });

/* ================================================================== 3. reward totals and daily income */
const T = D.DAILY17.tasks, ord = D.DAILY17.order, best3 = ord.map((k) => T[k].reward.gold || 0).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0), food3 = ord.map((k) => T[k].reward.food || 0).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0);
const codex = D.CODEX17.reduce((a, m) => ({ gold: a.gold + (m.reward.gold || 0), gems: a.gems + (m.reward.gems || 0) }), { gold: 0, gems: 0 });
const legacyOneTime = { quests: D.QUESTS.reduce((a, q) => a + ((q.reward || {}).gems || 0), 0), dungeons: DUN.reduce((a, id) => { const d = D.DUNGEONS[id]; return a + ((d.first || {}).gems || 0) + d.sections.reduce((x, s) => x + ((s.first || {}).gems || 0), 0); }, 0), survival: Object.values(D.SURVIVAL.milestones).reduce((a, m) => a + m.gems, 0) };
const econ = { daily: { goldMax: best3, foodMax: food3, gems: D.DAILY17.bonus.gems, gemsPer30Days: D.DAILY17.bonus.gems * 30 }, moonShrineLv4PerDay: 18, codexOnce: codex, challengesOnce: chTotals.island, existingOneTimeGems: legacyOneTime };
write('economy.json', econ); console.log(JSON.stringify(econ));
console.log('→', OUT);
