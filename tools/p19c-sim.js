// Phase 19C: the Obsidian Reach campaign, simulated against the REAL game data (working tree). Automated play only:
// rule-level simulations of the battle engine with scripted policies, NOT real gameplay and NOT an iPhone.
//  1. all 100 Obsidian battles at the dungeon's recommended level (balanced trio; tactical and basic-attack play);
//  2. per dungeon, the lowest party level that clears it first try at least half the time (threshold), and whole-dungeon
//     clear rates at the recommended level by play style (tactical / the game's auto-battle / basic attacks / a team
//     picked for the elemental matchup);
//  3. campaigns from realistic arrival saves (Starter Island and the Verdant Wilds played by the 17C agent, staged cap):
//     rarely fed, fed regularly, highly upgraded, all optional Verdant content, and fed regularly but basic attacks only;
//     arrival level per dungeon, slack over the threshold, losses, replays (grinding), time; plus controlled arrivals at
//     party level 38, 40, 43 and 46;
//  4. each guardian's charged move: one hit unguarded vs guarded, as a share of a member's health at the recommended level.
// Run: node tools/p19c-sim.js [outDir]   (default docs/audit19c)   Env: QUICK=1, PROFILES=a,b, OUTNAME=file.json
process.env.P17B_LIB = '1';
const fs = require('fs'), path = require('path');
const { Game, loadAt, seeded, pct, mean } = require('./p17b-sim.js');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit19c'); fs.mkdirSync(OUT, { recursive: true });
const QUICK = !!process.env.QUICK, SEEDS = QUICK ? [11] : [11, 22], TRIES = QUICK ? 6 : 10, N100 = QUICK ? 8 : 20, SECS = 4.5;
const g = Game(loadAt(null), '19C'), D = g.D, R = g.R, B = g.B, A = g.A;
const IDS = D.CAMPAIGN.obsidian.dungeons, TRIO = ['lumifern', 'cannonis', 'emberix'];
if (IDS.length !== 10) throw new Error('needs the ten Obsidian dungeons');
const lim = (fn) => (QUICK && process.env.ONLY ? null : fn());

/* 1. all 100 battles */
function battleRates() {
  const out = [];
  IDS.forEach((id) => { const d = D.DUNGEONS[id], rec = d.recommended;
    d.battles.forEach((spec, i) => { const row = { id, i: i + 1, sp: spec.sp, lv: spec.lv, boss: !!spec.boss, move: spec.move || null };
      ['tactical', 'basic'].forEach((pol) => { let w = 0, turns = 0; for (let s = 0; s < N100; s++) { R.rng = seeded(500 + s); const b = B.create(g.party(TRIO, rec), R.enemyFromSpec(spec), { rng: R.rng }); const r = g.fight(b, pol); if (r.win) w++; turns += r.turns; } row[pol] = pct(w, N100); row[pol + 'Turns'] = +(turns / N100).toFixed(1); });
      out.push(row); }); });
  return out;
}
/* 2. thresholds and play styles */
function threshold(id) { const rec = D.DUNGEONS[id].recommended; for (let off = -8; off <= 6; off++) { let c = 0; for (let s = 0; s < 16; s++) if (g.run(id, TRIO, rec + off, 'tactical', 300 + s).cleared) c++; if (c >= 8) return rec + off; } return rec + 7; }
function counterLines(id) { const boss = D.DUNGEONS[id].battles[9], el = D.SPECIES[boss.sp].el, lines = Object.keys(D.LINES).filter((l) => !D.LINES[l].legendary);
  const val = (l) => { const e2 = D.LINES[l].el; return R.elMult(e2, el) * 2 + 1 / R.elMult(el, e2); }; return lines.sort((a, b) => val(b) - val(a)).slice(0, 3); }
/* 3. campaigns (the 17C agent, on real data, under the real staged level cap) */
function agent(st, uids, feed, rng, pol) {
  let battles = 0, turns = 0, losses = 0, grinds = 0, last = null;
  const evolve = () => uids.forEach((u) => { while (R.evoCheck(st, u).ok) R.evolve(st, u); });
  const doFeed = () => { if (feed === 'none') return; let budget = feed === 'all' ? st.res.food : Math.floor(st.res.food / 2);
    while (budget >= D.SNACKS.feast.food) { const low = uids.map((u) => R.inst(st, u)).sort((a, b) => a.lv - b.lv)[0]; if (low.lv >= R.levelCap(st)) break; const r = R.feed(st, low.uid, 'feast'); if (!r || !r.ok) break; budget -= D.SNACKS.feast.food; } };
  const play = (id, from) => { const sr = R.startRun(st, id, uids, { from }); if (!sr || sr.ok === false) return { win: false, refused: true }; let out; do { const b = R.createBattle(st, rng); const r = g.fight(b, pol || 'tactical'); battles++; turns += r.turns; out = R.resolveBattle(st, b); } while (out.win && !out.cleared && st.run); return out; };
  const clear = (id, log) => {
    const need = (D.DUNGEONS[id].unlock || {}).rank; if (need && st.rank < need) st.rank = need; if (id === 'lanternorchard') st.flags.hollowveil = true;
    const t0 = battles, l0 = losses, g0 = grinds, m0 = turns; let fails = 0, guard = 0, tries = 0, refused = 0; const arrive = +mean(uids.map((u) => R.inst(st, u).lv)).toFixed(1);
    while (!R.dungeonCleared(st, id) && guard++ < 300) { tries++; const out = play(id); if (out.refused) { refused++; break; } if (!out.win) { losses++; fails++; } evolve(); doFeed(); evolve(); if (fails >= 2 && last) { play(last, 0); grinds++; evolve(); doFeed(); evolve(); fails = 0; } }
    last = id; if (log) log.push({ id, rec: D.DUNGEONS[id].recommended, arrive, tries, refused, cleared: R.dungeonCleared(st, id), losses: losses - l0, grinds: grinds - g0, battles: battles - t0, minutes: +((turns - m0) * SECS / 60).toFixed(1) });
  };
  const replay = (id) => { play(id, 0); evolve(); doFeed(); evolve(); };
  return { clear, replay, stats: () => ({ battles, minutes: Math.round(turns * SECS / 60), losses, grinds }) };
}
const PROFILES = {
  rarelyFed: { feed: 'none', label: 'Rarely fed: balanced trio, no gear, moves Lv 1' },
  fedRegularly: { feed: 'half', label: 'Fed regularly (half of food), no gear, moves Lv 1' },
  upgraded: { feed: 'all', moves: 5, gear: true, starterReplays: true, label: 'Highly upgraded: all food, moves Lv 5, best gear, extra replays' },
  verdantAll: { feed: 'half', moves: 4, gear: true, verdantReplays: 2, label: 'All optional Verdant content: two full replays of every Verdant dungeon after the Forest Crown' },
  basicFed: { feed: 'half', pol: 'basic', label: 'Fed regularly, relying on basic attacks only (no guards, heals or specials)' },
};
const wearBest = (st, uids) => { if (!R.equip) return; const best = {}; (st.items || []).forEach((it) => { const def = D.ITEMS[it.id] || {}, sl = def.slot, sc = Object.values(def.stats || def.bonus || {}).reduce((a, b) => a + (+b || 0), 0); if (sl && (!best[sl] || sc > best[sl].sc)) best[sl] = { it, sc }; });
  Object.values(best).forEach((b, i) => { try { R.equip(st, uids[i % uids.length], b.it.uid); } catch (e) { /* not equippable */ } }); };
function arrivalSave(prof, seed) {
  const rng = seeded(seed); R.rng = rng;
  const st = A.State.newGame(); st.phase = 'play'; st.introDone = true; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = st.flags.r2 = true;
  const uids = TRIO.map((sp) => R.addAmina(st, sp, 3).uid), ag = agent(st, uids, prof.feed, rng); // earlier islands always played tactically
  D.CAMPAIGN.starter.dungeons.forEach((id) => ag.clear(id));
  if (prof.starterReplays) ['windstair', 'resonancescar', 'heartwood'].forEach((id) => { for (let k = 0; k < 3; k++) ag.replay(id); });
  D.CAMPAIGN.verdant.dungeons.forEach((id) => ag.clear(id));
  if (prof.verdantReplays) D.CAMPAIGN.verdant.dungeons.forEach((id) => { for (let k = 0; k < prof.verdantReplays; k++) ag.replay(id); });
  if (prof.moves) uids.forEach((u) => { const a = R.inst(st, u); R.moveSlots(a); a.mv = a.mv.map(() => prof.moves); });
  if (prof.gear) wearBest(st, uids);
  return { st, uids, seed, open: A.World.islandUnlocked(st, 'obsidian'), cap: R.levelCap(st), stats0: ag.stats() };
}
function firstTry(st, uids, id, pol) {
  let c = 0; for (let s = 0; s < TRIES; s++) { const cp = JSON.parse(JSON.stringify(st)); R.rng = seeded(900 + s); const sr = R.startRun(cp, id, uids, { from: 0 }); if (!sr || sr.ok === false) continue; let o; do { const b = R.createBattle(cp, R.rng); g.fight(b, pol || 'tactical'); o = R.resolveBattle(cp, b); } while (o.win && !o.cleared && cp.run); if (o.cleared) c++; }
  return pct(c, TRIES);
}
function playIsland(save, prof, thr, label) {
  const st = JSON.parse(JSON.stringify(save.st)), rng = seeded(save.seed * 7 + 1); R.rng = rng;
  const ag = agent(st, save.uids, prof.feed, rng, prof.pol), log = [], ft = []; const s0 = ag.stats(), g0 = st.res.gold;
  IDS.forEach((id) => { ft.push(firstTry(st, save.uids, id, prof.pol)); ag.clear(id, log); });
  const s1 = ag.stats(), insts = save.uids.map((u) => R.inst(st, u));
  return { label, arrive0: +mean(save.uids.map((u) => R.inst(save.st, u).lv)).toFixed(1), end: +mean(insts.map((a) => a.lv)).toFixed(1), capAfter: R.levelCap(st), log, firstTry: ft, losses: s1.losses - s0.losses, grinds: s1.grinds - s0.grinds, minutes: s1.minutes - s0.minutes, gold: st.res.gold - g0, bossFlag: !!(st.campaign && st.campaign.bosses && st.campaign.bosses.obsidian), nightMail: (st.items || []).some((it) => it.id === 'nightmail'), slack: log.map((l, i) => +(l.arrive - thr[i]).toFixed(1)) };
}
// controlled arrival: a fed-regularly save, its trio set to level L (evolved as the level allows) before the island
function atLevel(save, L) {
  const st = JSON.parse(JSON.stringify(save.st)); save.uids.forEach((u) => { const a = R.inst(st, u); a.lv = L; a.xp = 0; while (R.evoCheck(st, u).ok) R.evolve(st, u); });
  return Object.assign({}, save, { st });
}
/* 4. charged moves */
function moveHits() {
  return IDS.map((id) => { const d = D.DUNGEONS[id], spec = d.battles[9], ab = D.ABILITIES[spec.move], rec = d.recommended, e = R.enemyFromSpec(spec), rows = [];
    TRIO.forEach((line) => { const p = g.member(line, rec, 1); const un = [], gu = []; for (let s = 0; s < 40; s++) { un.push(B.damage(e, Object.assign({}, p, { guard: false }), ab, seeded(70 + s)).dmg); gu.push(B.damage(e, Object.assign({}, p, { guard: true }), ab, seeded(70 + s)).dmg); }
      rows.push({ member: p.sp, hp: p.hpMax, unguarded: Math.round(mean(un)), guarded: Math.round(mean(gu)), unguardedPct: Math.round(mean(un) / p.hpMax * 100), guardedPct: Math.round(mean(gu) / p.hpMax * 100) }); });
    return { id, guardian: spec.title, move: ab.name, el: ab.el, power: ab.power, fx: ab.fx ? ab.fx.k : ab.type === 'weaken' ? 'weaken' : ab.neutral ? 'never resisted' : null, rows, worstUnguardedPct: Math.max(...rows.map((r) => r.unguardedPct)), worstGuardedPct: Math.max(...rows.map((r) => r.guardedPct)) };
  });
}

const t0 = Date.now(), out = { note: 'Automated rule-level simulation with scripted policies (tools/p19c-sim.js), not real gameplay and not an iPhone.', seeds: SEEDS, n100: N100, tries: TRIES, trio: TRIO,
  tune: Object.fromEntries(IDS.map((id) => [id, { dungeon: D.DUNGEONS[id].tune || null, guardian: D.DUNGEONS[id].battles[9].tune || null, tier: D.DUNGEONS[id].battles.map((b) => b.tier) }])) };
if (!process.env.SKIP_GRID) {
  out.battles = battleRates(); console.log('100 battles: tactical mean', mean(out.battles.map((r) => r.tactical)).toFixed(1), '% | basic mean', mean(out.battles.map((r) => r.basic)).toFixed(1), '%; lowest tactical', Math.min(...out.battles.map((r) => r.tactical)));
}
const thr = IDS.map(threshold); out.thresholds = IDS.map((id, i) => ({ id, rec: D.DUNGEONS[id].recommended, threshold: thr[i] }));
console.log('thresholds', IDS.map((id, i) => id.slice(2) + ' ' + D.DUNGEONS[id].recommended + '→' + thr[i]).join(' | '));
out.styles = IDS.map((id) => { const rec = D.DUNGEONS[id].recommended, o = { id, rec, counter: counterLines(id) }; ['tactical', 'auto', 'basic'].forEach((pol) => { let c = 0; for (let s2 = 0; s2 < 16; s2++) if (g.run(id, TRIO, rec, pol, 700 + s2).cleared) c++; o[pol] = pct(c, 16); });
  let c = 0; for (let s2 = 0; s2 < 16; s2++) if (g.run(id, o.counter, rec, 'tactical', 700 + s2).cleared) c++; o.matchup = pct(c, 16); return o; });
console.log('clear at rec  tactical', out.styles.map((x) => x.tactical).join(' '), '| matchup', out.styles.map((x) => x.matchup).join(' '), '| auto', out.styles.map((x) => x.auto).join(' '), '| basic', out.styles.map((x) => x.basic).join(' '));
out.moves = moveHits(); out.moves.forEach((h) => console.log('move', h.move.padEnd(18), 'worst unguarded', h.worstUnguardedPct + '%', 'guarded', h.worstGuardedPct + '%'));
out.campaigns = {};
const fedSaves = {};
Object.keys(PROFILES).filter((p) => !process.env.PROFILES || process.env.PROFILES.split(',').indexOf(p) >= 0).forEach((pk) => {
  const prof = PROFILES[pk], runs = SEEDS.map((seed) => { const sv = arrivalSave(prof, seed); if (pk === 'fedRegularly') fedSaves[seed] = sv; return Object.assign(playIsland(sv, prof, thr, pk), { open: sv.open, capOnArrival: sv.cap }); });
  const m = (f) => +mean(runs.map(f)).toFixed(1);
  const c = { label: prof.label, open: runs.every((r) => r.open), capOnArrival: runs[0].capOnArrival, arrive: m((r) => r.arrive0), end: m((r) => r.end), capAfter: runs[0].capAfter, losses: m((r) => r.losses), grinds: m((r) => r.grinds), minutes: Math.round(mean(runs.map((r) => r.minutes))), gold: Math.round(mean(runs.map((r) => r.gold))),
    allCleared: runs.every((r) => r.log.every((l) => l.cleared)), bossFlag: runs.every((r) => r.bossFlag), nightMail: runs.every((r) => r.nightMail),
    arrivePer: IDS.map((_, i) => m((r) => r.log[i].arrive)), slack: IDS.map((_, i) => m((r) => r.slack[i])), lossesPer: IDS.map((_, i) => m((r) => r.log[i].losses)), grindsPer: IDS.map((_, i) => m((r) => r.log[i].grinds)), minutesPer: IDS.map((_, i) => m((r) => r.log[i].minutes)), firstTry: IDS.map((_, i) => Math.round(mean(runs.map((r) => r.firstTry[i])))) };
  out.campaigns[pk] = c;
  console.log(pk.padEnd(13), 'open', c.open, 'cap', c.capOnArrival, '→', c.capAfter, '| arrive', c.arrive, 'end', c.end, 'losses', c.losses, 'grinds', c.grinds, 'min', c.minutes, 'all', c.allCleared, 'NightMail', c.nightMail, '\n   arrive/dungeon', c.arrivePer.join(' '), '\n   slack', c.slack.join(' '), '\n   losses', c.lossesPer.join(' '), '| first-try', c.firstTry.join(' '));
});
if (!process.env.SKIP_LEVELS && Object.keys(fedSaves).length) {
  out.entryLevels = {};
  [38, 40, 43, 46].forEach((L) => { const runs = SEEDS.map((seed) => playIsland(atLevel(fedSaves[seed], L), PROFILES.fedRegularly, thr, 'L' + L)); const m = (f) => +mean(runs.map(f)).toFixed(1);
    const c = { level: L, end: m((r) => r.end), losses: m((r) => r.losses), grinds: m((r) => r.grinds), minutes: Math.round(mean(runs.map((r) => r.minutes))), arrivePer: IDS.map((_, i) => m((r) => r.log[i].arrive)), slack: IDS.map((_, i) => m((r) => r.slack[i])), lossesPer: IDS.map((_, i) => m((r) => r.log[i].losses)), firstTry: IDS.map((_, i) => Math.round(mean(runs.map((r) => r.firstTry[i])))) };
    out.entryLevels['L' + L] = c; console.log('enter at', L, '| end', c.end, 'losses', c.losses, 'grinds', c.grinds, 'min', c.minutes, '| slack', c.slack.join(' '), '| first-try', c.firstTry.join(' ')); });
}
fs.writeFileSync(path.join(OUT, process.env.OUTNAME || 'sim.json'), JSON.stringify(out, null, 1));
console.log('done in', Math.round((Date.now() - t0) / 1000), 's →', OUT);
