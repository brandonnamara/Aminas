// Phase 17C: progression and economy simulations, Phase 17B (8ded42a, read from git) against the working tree.
// Run: node tools/p17c-sim.js [outDir]  (default docs/audit17c). Deterministic; times assume 4.5 s per turn.
process.env.P17B_LIB = '1';
const fs = require('fs'), path = require('path');
const { Game, loadAt, seeded, pct, mean } = require('./p17b-sim.js');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit17c'); fs.mkdirSync(OUT, { recursive: true });
const write = (n, o) => fs.writeFileSync(path.join(OUT, n), JSON.stringify(o, null, 1));
const SECS = 4.5, BASE = '8ded42a';

/* ================================================================== 1. XP: full Starter Island campaigns */
// The 17B agent from p17b-xp.js: a balanced team from level 3, dungeons in order, the tactical player, a full replay
// of the last cleared dungeon after two defeats in a row; feed none / half / all of its food as Feasts.
function campaign(g, feed, seed, team) {
  const A = g.A, D = g.D, R = g.R, S = A.State, rng = seeded(seed); R.rng = rng;
  const st = S.newGame(); st.phase = 'play'; st.introDone = true; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = true; st.flags.r2 = true;
  const uids = (team || ['lumifern', 'cannonis', 'emberix']).map((sp) => R.addAmina(st, sp, 3).uid);
  let battles = 0, turns = 0, losses = 0, grinds = 0, fed = 0, scaledXp = 0, fullXp = 0; const reach = {}, log = [];
  const avg = () => mean(uids.map((u) => R.inst(st, u).lv));
  const mark = () => { [12, 22].forEach((L) => { if (reach[L] == null && uids.every((u) => R.inst(st, u).lv >= L)) reach[L] = { battles, minutes: Math.round(turns * SECS / 60) }; }); };
  const evolve = () => uids.forEach((u) => { while (R.evoCheck(st, u).ok) R.evolve(st, u); });
  const doFeed = () => { if (feed === 'none') return; let budget = feed === 'all' ? st.res.food : Math.floor(st.res.food / 2); while (budget >= D.SNACKS.feast.food) { const low = uids.map((u) => R.inst(st, u)).sort((a, b) => a.lv - b.lv)[0]; if (low.lv >= 30) break; if (!R.feed(st, low.uid, 'feast').ok) break; budget -= D.SNACKS.feast.food; fed += D.SNACKS.feast.food; } };
  const play = (id, from) => { R.startRun(st, id, uids, { from }); let out; do { const b = R.createBattle(st, rng); const r = g.fight(b, 'tactical'); battles++; turns += r.turns; out = R.resolveBattle(st, b); (out.xp || []).forEach((x) => { if (x.scaled) scaledXp++; else fullXp++; }); mark(); } while (out.win && !out.cleared && st.run); return out; };
  let last = null;
  for (const id of D.CAMPAIGN.starter.dungeons) {
    const need = (D.DUNGEONS[id].unlock || {}).rank; if (need && st.rank < need) st.rank = need; if (id === 'lanternorchard') st.flags.hollowveil = true;
    const arrive = +avg().toFixed(1), rec = D.DUNGEONS[id].recommended; let fails = 0, guard = 0, tries = 0;
    while (!R.dungeonCleared(st, id) && guard++ < 300) { tries++; const out = play(id); if (!out.win) { losses++; fails++; } evolve(); doFeed(); evolve(); if (fails >= 2 && last) { play(last, 0); grinds++; evolve(); doFeed(); evolve(); fails = 0; } }
    last = id; log.push({ id, rec, arrive, ready: +(arrive - rec).toFixed(1), leave: +avg().toFixed(1), tries, battles, minutes: Math.round(turns * SECS / 60) });
  }
  return { feed, end: +avg().toFixed(1), battles, minutes: Math.round(turns * SECS / 60), losses, grinds, fed, reach12: reach[12] || null, reach22: reach[22] || null, scaledShare: pct(scaledXp, scaledXp + fullXp), log, st, uids };
}
const g0 = Game(loadAt(BASE), '17B'), g1 = Game(loadAt(null), '17C');
if (process.env.XP_SCALE) g1.D.XP17.scale = JSON.parse(process.env.XP_SCALE); // try other reductions: XP_SCALE='{"3":0.85,"4":0.6,"5":0.35}'
const xp = [];
[['17B', g0], ['17C', g1]].forEach(([name, g]) => ['none', 'half', 'all'].forEach((feed) => {
  const runs = [11, 22, 33].map((s) => campaign(g, feed, s));
  const r0 = runs[0]; delete r0.st; delete r0.uids; runs.slice(1).forEach((r) => { delete r.st; delete r.uids; });
  xp.push({ version: name, feed, endAvg: +mean(runs.map((r) => r.end)).toFixed(1), lossesAvg: +mean(runs.map((r) => r.losses)).toFixed(1), grindsAvg: +mean(runs.map((r) => r.grinds)).toFixed(1), minutesAvg: Math.round(mean(runs.map((r) => r.minutes))), fed: r0.fed, reach12: r0.reach12, reach22: r0.reach22, scaledShare: r0.scaledShare, log: r0.log });
  console.log(name, feed, 'end', xp[xp.length - 1].endAvg, 'losses', xp[xp.length - 1].lossesAvg, 'grinds', xp[xp.length - 1].grindsAvg, '12@', JSON.stringify(r0.reach12), '22@', JSON.stringify(r0.reach22), 'scaled', r0.scaledShare + '%');
}));
// Completion rates: the same campaign for a team that does not play tactically (basic attacks only), and a new
// player (one starter Amina, no feeding) — the cases most exposed to less XP.
function basicCampaign(g, feed) { const save = g.policy; g.policy = (k) => save(k === 'tactical' ? 'basic' : k); const r = campaign(g, feed, 7); g.policy = save; delete r.st; delete r.uids; return r; }
const exposed = { basic17B: basicCampaign(g0, 'half'), basic17C: basicCampaign(g1, 'half') };
['17B', '17C'].forEach((n, i) => { const g = i ? g1 : g0; const r = campaign(g, 'none', 5, ['lumifern']); delete r.st; delete r.uids; exposed['solo' + n] = r; });
console.log('basic-attack player: 17B losses', exposed.basic17B.losses, 'grinds', exposed.basic17B.grinds, '| 17C losses', exposed.basic17C.losses, 'grinds', exposed.basic17C.grinds);
// Existing players: an established save replaying early dungeons (XP per full replay) and a level-30 save.
function replayXp(g, id, lv) { const A = g.A, R = g.R, st = A.State.newGame(); st.flags.r1 = st.flags.r2 = true; st.rank = 10; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); g.D.CAMPAIGN.starter.dungeons.forEach((d) => (st.dungeon[d] = { clears: 1, floors: [true, true, true, true], next: 0 })); st.flags.hollowveil = true;
  const u = R.addAmina(st, 'cannonis', lv); const x0 = R.inst(st, u.uid); let gained = 0; R.startRun(st, id, [u.uid], { from: 0 }); let o; do { const b = R.createBattle(st, seeded(3)); b.foes.forEach((f) => (f.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; o = R.resolveBattle(st, b); gained += o.xp[0].gained; } while (st.run); return gained; }
const existing = ['forgottenroad', 'coldkiln', 'lanternorchard', 'heartwood'].map((id) => ({ id, lv18: [replayXp(g0, id, 18), replayXp(g1, id, 18)], lv25: [replayXp(g0, id, 25), replayXp(g1, id, 25)] }));
write('xp.json', { results: xp, exposed, existing, note: 'Existing levels are never reduced; a level-30 Amina gains no XP in either version.' });

/* ================================================================== 2. healing over whole dungeons */
function healValue(g) { const lines = ['aimza', 'acinus', 'kairyu'], DUN = g.D.CAMPAIGN.starter.dungeons; const run = () => mean(DUN.map((id) => { let c = 0; for (let s = 0; s < 60; s++) if (g.run(id, lines, g.D.DUNGEONS[id].recommended - 1, 'tactical', 2000 + s).cleared) c++; return pct(c, 60); }));
  g.healRule = null; const w = run(); g.healRule = () => false; const n = run(); g.healRule = null; return { withHeal: +w.toFixed(1), neverHeal: +n.toFixed(1), value: +(w - n).toFixed(1) }; }
write('heal.json', { '17B': healValue(g0), '17C': healValue(g1) });
console.log('heal value', JSON.stringify({ b: healValue(g0), c: healValue(g1) }));

/* ================================================================== 3. economy */
// Gems a day from the Moon Shrine for four ways of playing (collected whenever the storage is half full, during the
// hours the player is around), and the gem sinks that exist.
function shrineDay(g, level, residentLv, hoursPlayed, days) {
  const A = g.A, R = g.R, W = A.World, st = A.State.newGame(); let T = Date.UTC(2026, 10, 20, 7, 0, 0); R.now = () => T;
  st.struct.moonshrine = true; Object.assign(st.buildings.moonshrine, { level, state: 'built', stock: 0, last: T, residents: [] });
  R.addAmina(st, 'lumifern', 5); const cap = W.levelData(st.buildings.moonshrine).capacity; for (let i = 0; i < cap; i++) { const m = R.addAmina(st, 'lumi', residentLv); W.assign(st, 'moonshrine', m.uid); }
  st.buildings.moonshrine.last = T; const g0gems = st.res.gems;
  for (let d = 0; d < days; d++) { const dayStart = Date.UTC(2026, 10, 20 + d, 7, 0, 0); for (let h = 0; h < 24; h++) { T = dayStart + h * 3600e3; W.tickProduction(st, T); if (h < hoursPlayed) W.collect(st, 'moonshrine'); } }
  T = Date.UTC(2026, 10, 20 + days, 7, 0, 0); W.tickProduction(st, T); W.collect(st, 'moonshrine');
  R.now = () => Date.now(); return +((st.res.gems - g0gems) / days).toFixed(1);
}
const shrine = []; [[2, 10], [4, 20], [4, 30]].forEach(([lv, rl]) => [16, 4].forEach((h) => shrine.push({ level: lv, residentLv: rl, hoursPlayed: h, before: shrineDay(g0, lv, rl, h, 7), after: shrineDay(g1, lv, rl, h, 7) })));
shrine.push({ level: 4, residentLv: 30, hoursPlayed: 0, note: 'away for a week, then collects once', before: shrineDay(g0, 4, 30, 0, 7), after: shrineDay(g1, 4, 30, 0, 7) });
console.table(shrine);
// gem sources and sinks (per day where they repeat)
const D1 = g1.D, ruinsGemsDay = ['toll', 'tower', 'cellar'].reduce((a, k) => a + (16 * 60 / D1.RUINS[k].cooldownMin) * D1.RUINS[k].gemChance, 0);
const gemFlow = { oneTime: { quests: D1.QUESTS.reduce((a, q) => a + ((q.reward || {}).gems || 0), 0), dungeons: D1.CAMPAIGN.starter.dungeons.reduce((a, id) => { const d = D1.DUNGEONS[id]; return a + ((d.first || {}).gems || 0) + d.sections.reduce((x, s) => x + ((s.first || {}).gems || 0), 0); }, 0), survival: Object.values(D1.SURVIVAL.milestones).reduce((a, m) => a + m.gems, 0) },
  perDayLate: { moonShrineBefore: shrine.find((x) => x.level === 4 && x.residentLv === 30 && x.hoursPlayed === 16).before, moonShrineAfter: shrine.find((x) => x.level === 4 && x.residentLv === 30 && x.hoursPlayed === 16).after, ruinsIfSearchedAllDay: +ruinsGemsDay.toFixed(1), legacyBossFarm17A: 'closed in 17B' },
  sinks: { forgeRecipesTotal: D1.FORGE.recipes.reduce((a, r) => a + (r.cost.gems || 0), 0), essenceExchangePerDayMax: D1.GEMS17.exchangeDaily, hatchNowPerEgg: '1 gem per started 6 minutes left (an egg at "normal" speed: 1-5)', finishNow: '1 gem per started 6 minutes of a building timer' } };
write('economy.json', { shrine, gemFlow });

/* ================================================================== 4. releasing duplicates: what it is worth */
// Essence from releasing at different levels, against the essence a move needs, and the breeding loop (an egg
// costs 40 gold and 25 food; the hatchling is level 1).
const RL = g1.D.RELEASE, rel = [1, 5, 10, 20, 30].map((lv) => ({ lv, stage: lv >= 22 ? 3 : lv >= 12 ? 2 : 1, essence: RL.base + RL.perLevel * lv + RL.perStage * ((lv >= 22 ? 3 : lv >= 12 ? 2 : 1) - 1) }));
const moveToMax = [2, 3, 4, 5].reduce((a, l) => a + g1.D.MOVE_LEVELS.cost[l], 0), eggs = Math.ceil(moveToMax / rel[0].essence);
const loop = { essencePerHatchling: rel[0].essence, moveToLevel5: moveToMax, hatchlingsPerMove: eggs, goldPerMove: eggs * g1.D.BREED_COST.gold, foodPerMove: eggs * g1.D.BREED_COST.food,
  vsFeedingUp: 'feeding a duplicate from 1 to 10 costs about 150 food (Feasts) and adds 9 essence: ~17 food per essence', exchange: '1 gem = ' + g1.D.GEMS17.exchangeRate + ' essence (30 gems a day)' };
write('release.json', { table: rel, loop });
console.log('release', JSON.stringify(loop));
console.log('→', OUT);
