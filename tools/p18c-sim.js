// Phase 18C: the Verdant Wilds campaign, simulated against the REAL game data (working tree). Automated play only:
// these are rule-level simulations of the battle engine with scripted policies, not real gameplay.
//  1. every one of the 100 battles at its own level band (win rate of a balanced trio, tactical and basic play);
//  2. per dungeon, the lowest party level that clears it first try at least half the time (threshold);
//  3. campaigns from realistic end-of-Starter-Island saves (rarely fed / fed regularly / prepared): arrival level per
//     dungeon, slack over the threshold, losses, replays (grinding), time;
//  4. each guardian's charged move: damage taken unguarded vs guarded, as a share of a member's health.
// Run: node tools/p18c-sim.js [outDir]   (default docs/audit18c)   Env: QUICK=1 for fewer seeds.
process.env.P17B_LIB = '1';
const fs = require('fs'), path = require('path');
const { Game, loadAt, seeded, pct, mean } = require('./p17b-sim.js');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit18c'); fs.mkdirSync(OUT, { recursive: true });
const QUICK = !!process.env.QUICK, SEEDS = QUICK ? [11] : [11, 22, 33], TRIES = QUICK ? 6 : 12, N100 = QUICK ? 8 : 24, SECS = 4.5;
const g = Game(loadAt(null), '18C'), D = g.D, R = g.R, B = g.B;
const IDS = D.CAMPAIGN.verdant.dungeons, TRIO = ['lumifern', 'cannonis', 'emberix'];

/* 1. all 100 battles */
function battleRates() {
  const out = [];
  IDS.forEach((id) => {
    const d = D.DUNGEONS[id], rec = d.recommended;
    d.battles.forEach((spec, i) => {
      const row = { id, i: i + 1, sp: spec.sp, lv: spec.lv, boss: !!spec.boss, move: spec.move || null };
      ['tactical', 'basic'].forEach((pol) => { let w = 0, turns = 0; for (let s = 0; s < N100; s++) { R.rng = seeded(500 + s); const b = B.create(g.party(TRIO, rec), R.enemyFromSpec(spec), { rng: R.rng }); const r = g.fight(b, pol); if (r.win) w++; turns += r.turns; } row[pol] = pct(w, N100); row[pol + 'Turns'] = +(turns / N100).toFixed(1); });
      out.push(row);
    });
  });
  return out;
}
/* 2. thresholds */
function threshold(id) {
  const rec = D.DUNGEONS[id].recommended;
  for (let off = -8; off <= 4; off++) { let c = 0; for (let s = 0; s < 16; s++) if (g.run(id, TRIO, rec + off, 'tactical', 300 + s).cleared) c++; if (c >= 8) return rec + off; }
  return rec + 5;
}
/* 3. campaigns (the 18A agent, on real data) */
function agent(st, uids, feed, rng) {
  let battles = 0, turns = 0, losses = 0, grinds = 0, last = null;
  const evolve = () => uids.forEach((u) => { while (R.evoCheck(st, u).ok) R.evolve(st, u); });
  const doFeed = () => { if (feed === 'none') return; let budget = feed === 'all' ? st.res.food : Math.floor(st.res.food / 2); while (budget >= D.SNACKS.feast.food) { const low = uids.map((u) => R.inst(st, u)).sort((a, b) => a.lv - b.lv)[0]; if (low.lv >= D.MAX_LEVEL) break; if (!R.feed(st, low.uid, 'feast').ok) break; budget -= D.SNACKS.feast.food; } };
  const play = (id, from) => { R.startRun(st, id, uids, { from }); let out; do { const b = R.createBattle(st, rng); const r = g.fight(b, 'tactical'); battles++; turns += r.turns; out = R.resolveBattle(st, b); } while (out.win && !out.cleared && st.run); return out; };
  const clear = (id, log) => {
    const need = (D.DUNGEONS[id].unlock || {}).rank; if (need && st.rank < need) st.rank = need; if (id === 'lanternorchard') st.flags.hollowveil = true;
    const t0 = battles, l0 = losses, g0 = grinds; let fails = 0, guard = 0, tries = 0; const arrive = +mean(uids.map((u) => R.inst(st, u).lv)).toFixed(1);
    while (!R.dungeonCleared(st, id) && guard++ < 300) { tries++; const out = play(id); if (!out.win) { losses++; fails++; } evolve(); doFeed(); evolve(); if (fails >= 2 && last) { play(last, 0); grinds++; evolve(); doFeed(); evolve(); fails = 0; } }
    last = id; if (log) log.push({ id, rec: D.DUNGEONS[id].recommended, arrive, tries, losses: losses - l0, grinds: grinds - g0, battles: battles - t0 });
  };
  return { clear, stats: () => ({ battles, minutes: Math.round(turns * SECS / 60), losses, grinds }) };
}
const PROFILES = {
  rarelyFed: { feed: 'none', label: 'Rarely fed, balanced trio, no gear, moves Lv 1' },
  fedRegularly: { feed: 'half', label: 'Fed regularly (half of food), balanced trio' },
  prepared: { feed: 'half', moves: 4, gear: true, label: 'Fed regularly, moves Lv 4, gear worn' },
};
function starterSave(prof, seed) {
  const A = g.A, rng = seeded(seed); R.rng = rng;
  const st = A.State.newGame(); st.phase = 'play'; st.introDone = true; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = st.flags.r2 = true;
  const uids = TRIO.map((sp) => R.addAmina(st, sp, 3).uid), ag = agent(st, uids, prof.feed, rng);
  D.CAMPAIGN.starter.dungeons.forEach((id) => ag.clear(id));
  if (prof.moves) uids.forEach((u) => { const a = R.inst(st, u); R.moveSlots(a); a.mv = a.mv.map(() => prof.moves); });
  if (prof.gear && R.equip) { const best = {}; (st.items || []).forEach((it) => { const def = D.ITEMS[it.id] || {}, sl = def.slot, sc = Object.values(def.stats || def.bonus || {}).reduce((a, b) => a + (+b || 0), 0); if (sl && (!best[sl] || sc > best[sl].sc)) best[sl] = { it, sc }; }); uids.forEach((u, k) => Object.values(best).forEach((b, j) => { if ((j + k) % uids.length === 0) R.equip(st, u, b.it.iid); })); }
  return { st, uids, ag, end: +mean(uids.map((u) => R.inst(st, u).lv)).toFixed(1), stats0: ag.stats() };
}
function firstTry(st, uids, id) {
  let c = 0; for (let s = 0; s < TRIES; s++) { const cp = JSON.parse(JSON.stringify(st)); R.rng = seeded(900 + s); R.startRun(cp, id, uids, { from: 0 }); let o; do { const b = R.createBattle(cp, R.rng); g.fight(b, 'tactical'); o = R.resolveBattle(cp, b); } while (o.win && !o.cleared && cp.run); if (o.cleared) c++; }
  return pct(c, TRIES);
}
/* 4. charged moves: one hit on a member at the dungeon's recommended level, unguarded and guarded */
function moveHits() {
  return IDS.map((id) => {
    const d = D.DUNGEONS[id], spec = d.battles[9], ab = D.ABILITIES[spec.move], rec = d.recommended, e = R.enemyFromSpec(spec), rows = [];
    TRIO.forEach((line) => { const p = g.member(line, rec, 1); const un = [], gu = []; for (let s = 0; s < 40; s++) { const r1 = seeded(70 + s); un.push(B.damage(e, Object.assign({}, p, { guard: false }), ab, r1).dmg); gu.push(B.damage(e, Object.assign({}, p, { guard: true }), ab, seeded(70 + s)).dmg); }
      rows.push({ member: p.sp, hp: p.hpMax, unguarded: Math.round(mean(un)), guarded: Math.round(mean(gu)), unguardedPct: Math.round(mean(un) / p.hpMax * 100), guardedPct: Math.round(mean(gu) / p.hpMax * 100) }); });
    return { id, guardian: spec.title, move: ab.name, el: ab.el, power: ab.power, fx: ab.fx ? ab.fx.k : ab.type === 'weaken' ? 'weaken' : ab.neutral ? 'never resisted' : null, rows, worstUnguardedPct: Math.max(...rows.map((r) => r.unguardedPct)) };
  });
}

const t0 = Date.now();
const rates = battleRates(); console.log('100 battles: tactical mean', mean(rates.map((r) => r.tactical)).toFixed(1), '% | basic mean', mean(rates.map((r) => r.basic)).toFixed(1), '%');
const thr = IDS.map(threshold);
// whole-dungeon clear rate at the recommended level by play style (tactical: guards the charge, heals, weakens, soaks;
// auto: the game's own auto-battle; basic: always the first damaging move)
const styles = IDS.map((id) => { const rec = D.DUNGEONS[id].recommended, o = { id }; ['tactical', 'auto', 'basic'].forEach((pol) => { let c = 0; for (let s2 = 0; s2 < 16; s2++) if (g.run(id, TRIO, rec, pol, 700 + s2).cleared) c++; o[pol] = pct(c, 16); }); return o; });
console.log('clear at rec  tactical', styles.map((x) => x.tactical).join(' '), '| auto', styles.map((x) => x.auto).join(' '), '| basic', styles.map((x) => x.basic).join(' ')); console.log('thresholds', IDS.map((id, i) => id.slice(2) + ' ' + D.DUNGEONS[id].recommended + '→' + thr[i]).join(' | '));
const hits = moveHits(); hits.forEach((h) => console.log('move', h.move.padEnd(16), 'worst unguarded', h.worstUnguardedPct + '%', 'guarded', Math.max(...h.rows.map((r) => r.guardedPct)) + '%'));
const camp = {};
Object.keys(PROFILES).forEach((pk) => {
  const prof = PROFILES[pk], runs = [];
  SEEDS.forEach((seed) => { const sv = starterSave(prof, seed), log = [], ft = []; IDS.forEach((id) => { ft.push(firstTry(sv.st, sv.uids, id)); sv.ag.clear(id, log); }); const s1 = sv.ag.stats();
    runs.push({ starterEnd: sv.end, end: +mean(sv.uids.map((u) => R.inst(sv.st, u).lv)).toFixed(1), log, firstTry: ft, losses: s1.losses - sv.stats0.losses, grinds: s1.grinds - sv.stats0.grinds, minutes: s1.minutes - sv.stats0.minutes, battles: s1.battles - sv.stats0.battles }); });
  const c = { label: prof.label, starterEnd: +mean(runs.map((r) => r.starterEnd)).toFixed(1), end: +mean(runs.map((r) => r.end)).toFixed(1), losses: +mean(runs.map((r) => r.losses)).toFixed(1), grinds: +mean(runs.map((r) => r.grinds)).toFixed(1), minutes: Math.round(mean(runs.map((r) => r.minutes))), battles: Math.round(mean(runs.map((r) => r.battles))),
    arrive: IDS.map((_, i) => +mean(runs.map((r) => r.log[i].arrive)).toFixed(1)), slack: IDS.map((_, i) => +(mean(runs.map((r) => r.log[i].arrive)) - thr[i]).toFixed(1)), lossesPer: IDS.map((_, i) => +mean(runs.map((r) => r.log[i].losses)).toFixed(1)), grindsPer: IDS.map((_, i) => +mean(runs.map((r) => r.log[i].grinds)).toFixed(1)), firstTry: IDS.map((_, i) => Math.round(mean(runs.map((r) => r.firstTry[i])))) };
  camp[pk] = c; console.log(pk.padEnd(13), 'start', c.starterEnd, 'end', c.end, 'losses', c.losses, 'grinds', c.grinds, 'min', c.minutes, '| arrive', c.arrive.join(' '), '| slack', c.slack.join(' '), '| first-try', c.firstTry.join(' '));
});
fs.writeFileSync(path.join(OUT, process.env.OUTNAME || 'sim.json'), JSON.stringify({ note: 'Automated rule-level simulation with scripted policies (tools/p18c-sim.js), not real gameplay.', seeds: SEEDS, n100: N100, tries: TRIES, trio: TRIO, thresholds: IDS.map((id, i) => ({ id, rec: D.DUNGEONS[id].recommended, threshold: thr[i] })), styles, battles: rates, moves: hits, campaigns: camp, secs: Math.round((Date.now() - t0) / 1000) }, null, 1));
console.log('done in', Math.round((Date.now() - t0) / 1000), 's →', OUT);
