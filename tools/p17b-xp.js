// Phase 17B: the three XP approaches from the Phase 17A audit, simulated on the 17B rules. None is implemented in
// the game: each is applied here, inside the simulation only, by wrapping or patching the loaded rules.
//   A  less XP from foes well below an Amina's level (the gentlest): 3 levels below 75%, 4 below 50%, 5+ below 25%
//   B  dungeon levels raised to where players arrive: recommended 6, 8, 10, 12, 14, 17, 19, 21, 24, 27 (every battle
//      of a dungeon moves up by the same amount; the cap stays 30)
//   C  a steeper XP curve after level 12: each level needs 15% more per level past 12 (level 20 needs 2.2x)
// Run: node tools/p17b-xp.js [outDir]  (default docs/audit17b)
process.env.P17B_LIB = '1';
const fs = require('fs'), path = require('path');
const { Game, loadAt, seeded, mean } = require('./p17b-sim.js');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit17b'); fs.mkdirSync(OUT, { recursive: true });
const NEW_REC = [6, 8, 10, 12, 14, 17, 19, 21, 24, 27];
const SECS = 4.5;

function variant(opt) {
  const A = loadAt(null), g = Game(A, opt), D = A.Data, R = A.Rules;
  const DUN = D.CAMPAIGN.starter.dungeons;
  if (opt === 'A') { const add0 = R.addXp; R.addXp = function (st, inst, amt) { if (g.foeLv != null) { const d = inst.lv - g.foeLv; amt = Math.round(amt * (d >= 5 ? 0.25 : d === 4 ? 0.5 : d === 3 ? 0.75 : 1)); } return add0.call(this, st, inst, amt); }; }
  if (opt === 'B') DUN.forEach((id, i) => { const d = D.DUNGEONS[id], k = NEW_REC[i] - d.recommended; d.recommended = NEW_REC[i]; d.battles.forEach((b) => (b.lv = Math.min(30, b.lv + k))); });
  if (opt === 'C') { const n0 = R.xpNeed; R.xpNeed = (lv) => Math.floor(n0(lv) * (lv > 12 ? 1 + 0.15 * (lv - 12) : 1)); }
  return g;
}
// One player: the 17B balanced team from level 3, dungeons in order, the tactical policy; after two defeats in a row
// it replays the last cleared dungeon in full (grinding) before trying again. feed: 'none' | 'half' | 'all' of the
// food it holds, as Feasts to its lowest Amina, after every run (evolution costs are paid first when due).
function campaign(opt, feed, seed) {
  const g = variant(opt), A = g.A, D = g.D, R = g.R, S = A.State, rng = seeded(seed); R.rng = rng;
  const st = S.newGame(); st.phase = 'play'; st.introDone = true; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = true; st.flags.r2 = true;
  const uids = ['lumifern', 'cannonis', 'emberix'].map((sp) => R.addAmina(st, sp, 3).uid);
  let battles = 0, turns = 0, losses = 0, grinds = 0, fed = 0; const reach = {}, log = [];
  const avg = () => mean(uids.map((u) => R.inst(st, u).lv));
  const mark = () => { [12, 22].forEach((L) => { if (reach[L] == null && uids.every((u) => R.inst(st, u).lv >= L)) reach[L] = { battles, minutes: Math.round(turns * SECS / 60) }; }); };
  const evolve = () => uids.forEach((u) => { while (R.evoCheck(st, u).ok) R.evolve(st, u); });
  const doFeed = () => { if (feed === 'none') return; let budget = feed === 'all' ? st.res.food : Math.floor(st.res.food / 2); while (budget >= D.SNACKS.feast.food) { const low = uids.map((u) => R.inst(st, u)).sort((a, b) => a.lv - b.lv)[0]; if (low.lv >= 30) break; if (!R.feed(st, low.uid, 'feast').ok) break; budget -= D.SNACKS.feast.food; fed += D.SNACKS.feast.food; } };
  const play = (id, from) => { R.startRun(st, id, uids, { from }); let out; do { const b = R.createBattle(st, rng); g.foeLv = st.run && D.DUNGEONS[id].battles[st.run.battle].lv; const r = g.fight(b, 'tactical'); battles++; turns += r.turns; out = R.resolveBattle(st, b); g.foeLv = null; mark(); } while (out.win && !out.cleared && st.run); return out; };
  let last = null;
  for (const id of D.CAMPAIGN.starter.dungeons) {
    const need = (D.DUNGEONS[id].unlock || {}).rank; if (need && st.rank < need) st.rank = need; if (id === 'lanternorchard') st.flags.hollowveil = true;
    const arrive = +avg().toFixed(1), rec = D.DUNGEONS[id].recommended; let fails = 0, guard = 0;
    while (!R.dungeonCleared(st, id) && guard++ < 300) { const out = play(id); if (!out.win) { losses++; fails++; } evolve(); doFeed(); evolve();
      if (fails >= 2 && last) { play(last, 0); grinds++; evolve(); doFeed(); evolve(); fails = 0; } }
    last = id; log.push({ id, rec, arrive, ready: +(arrive - rec).toFixed(1), leave: +avg().toFixed(1), battles, minutes: Math.round(turns * SECS / 60), losses, grinds });
  }
  return { opt, feed, end: +avg().toFixed(1), battles, minutes: Math.round(turns * SECS / 60), losses, grinds, fed, reach12: reach[12] || null, reach22: reach[22] || null, log };
}
const res = [];
['base', 'A', 'B', 'C'].forEach((opt) => ['none', 'half', 'all'].forEach((feed) => { const runs = [11, 22, 33].map((s) => campaign(opt, feed, s)); res.push(Object.assign({}, runs[0], { endAvg: +mean(runs.map((r) => r.end)).toFixed(1), lossesAvg: +mean(runs.map((r) => r.losses)).toFixed(1), grindsAvg: +mean(runs.map((r) => r.grinds)).toFixed(1), minutesAvg: Math.round(mean(runs.map((r) => r.minutes))) })); console.log(opt, feed, 'end', res[res.length - 1].endAvg, 'losses', res[res.length - 1].lossesAvg, 'grinds', res[res.length - 1].grindsAvg, 'min', res[res.length - 1].minutesAvg, 'lv12@', JSON.stringify(runs[0].reach12), 'lv22@', JSON.stringify(runs[0].reach22)); }));
// an existing high-level save: what each option means for a party already at level 30 (and one at 25)
const high = ['base', 'A', 'B', 'C'].map((opt) => { const g = variant(opt), D = g.D; return { opt, heartwoodRec: D.DUNGEONS.heartwood.recommended, xpNeed25: g.R.xpNeed(25), xpFromHeartwoodAt25: opt === 'A' ? 'reduced to 25-75% on battles 5+ levels below' : 'full', partyAt30: 'keeps its levels (no option takes levels away)' }; });
fs.writeFileSync(path.join(OUT, 'xp-options.json'), JSON.stringify({ newRec: NEW_REC, results: res, highLevelSaves: high }, null, 1));
console.log('→', OUT);
