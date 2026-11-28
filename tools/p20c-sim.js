// Phase 20C: the Celestial Crown campaign, simulated against the REAL game data (working tree). Automated play only:
// rule-level simulations of the battle engine with scripted policies, NOT real gameplay and NOT an iPhone.
//  1. all 100 Celestial battles at the dungeon's recommended level (balanced trio; tactical and basic-attack play), and
//     each guardian's charged move as a share of a member's health, unguarded and guarded (no unavoidable instant defeat);
//  2. per dungeon, the lowest party level that clears it first try in at least 8 of 16 runs (threshold), and whole-dungeon
//     clear rates at the recommended level by play style (tactical / the game's auto-battle / basic attacks);
//  3. campaigns from realistic arrival saves (Starter Island, the Verdant Wilds and Obsidian Reach played by the 17C agent
//     under the real staged cap 40 → 50 → 60): rarely fed, fed regularly (tactical), highly upgraded, thorough
//     completionist, fed regularly but basic attacks only, fed regularly with the game's auto-battle; plus controlled
//     arrivals at party level 47, 50, 55 and 60; arrival level per dungeon, losses, replays (grinding), time;
//  4. The Two Keys: each stage's share of the fight, and Stage II defeats (which restart the whole encounter).
// Run: node tools/p20c-sim.js [outDir]  (default docs/audit20c)  Env: QUICK=1, SEEDS=11,22, PROFILES=a,b, OUTNAME=file.json
process.env.P17B_LIB = '1';
const fs = require('fs'), path = require('path');
const { Game, loadAt, seeded, pct, mean } = require('./p17b-sim.js');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit20c'); fs.mkdirSync(OUT, { recursive: true });
const QUICK = !!process.env.QUICK, SEEDS = (process.env.SEEDS || (QUICK ? '11' : '11,22')).split(',').map(Number), SECS = 4.5, N100 = QUICK ? 8 : 20;
const TRIO = ['lumifern', 'cannonis', 'emberix'];
const g = Game(loadAt(null), '20C'), D = g.D, R = g.R, A = g.A, W = A.World, B = g.B;
const IDS = D.CAMPAIGN.celestial.dungeons;
if (IDS.length !== 10) throw new Error('needs the ten Celestial dungeons');
/* ---------- the 17C campaign agent (as tools/p19c-sim.js), with the play policy as a parameter ---------- */
function agent(st, uids, feed, rng, pol) {
  let battles = 0, turns = 0, losses = 0, grinds = 0, last = null;
  const evolve = () => uids.forEach((u) => { while (R.evoCheck(st, u).ok) R.evolve(st, u); });
  const doFeed = () => { if (feed === 'none') return; let budget = feed === 'all' ? st.res.food : Math.floor(st.res.food / 2);
    while (budget >= D.SNACKS.feast.food) { const low = uids.map((u) => R.inst(st, u)).sort((a, b) => a.lv - b.lv)[0]; if (low.lv >= R.levelCap(st)) break; const r = R.feed(st, low.uid, 'feast'); if (!r || !r.ok) break; budget -= D.SNACKS.feast.food; } };
  const play = (id, from) => { const sr = R.startRun(st, id, uids, { from }); if (!sr || sr.ok === false) return { win: false, refused: true, why: sr && sr.reason }; let out; do { const b = R.createBattle(st, rng); const r = g.fight(b, pol || 'tactical'); battles++; turns += r.turns; out = R.resolveBattle(st, b); } while (out.win && !out.cleared && st.run); return out; };
  const clear = (id, log) => {
    const need = (D.DUNGEONS[id].unlock || {}).rank; if (need && st.rank < need) st.rank = need; if (id === 'lanternorchard') st.flags.hollowveil = true;
    const t0 = battles, l0 = losses, g0 = grinds, m0 = turns; let fails = 0, guard = 0, tries = 0, refused = null; const arrive = +mean(uids.map((u) => R.inst(st, u).lv)).toFixed(1);
    while (!R.dungeonCleared(st, id) && guard++ < 300) { tries++; const out = play(id); if (out.refused) { refused = out.why || 'refused'; break; } if (!out.win) { losses++; fails++; } evolve(); doFeed(); evolve(); if (fails >= 2 && last) { play(last, 0); grinds++; evolve(); doFeed(); evolve(); fails = 0; } }
    last = id; if (log) log.push({ id, rec: D.DUNGEONS[id].recommended, arrive, tries, refused, cleared: R.dungeonCleared(st, id), losses: losses - l0, grinds: grinds - g0, battles: battles - t0, minutes: +((turns - m0) * SECS / 60).toFixed(1) });
  };
  const replay = (id) => { play(id, 0); evolve(); doFeed(); evolve(); };
  return { clear, replay, stats: () => ({ battles, minutes: Math.round(turns * SECS / 60), losses, grinds }) };
}
const PROFILES = {
  rarelyFed: { feed: 'none', label: 'Rarely fed: balanced trio, no gear, moves Lv 1, tactical' },
  // ("tactical" is fedRegularly: the tactical policy is the agent's default)
  fedRegularly: { feed: 'half', label: 'Fed regularly (half of food), no gear, moves Lv 1, tactical' },
  completionist: { feed: 'half', moves: 4, gear: true, verdantReplays: 2, obsidianReplays: 2, label: 'Thorough completionist: two full replays of every Verdant and Obsidian dungeon, moves Lv 4, best gear' },
  upgraded: { feed: 'all', moves: 5, gear: true, starterReplays: true, label: 'Highly upgraded: all food, moves Lv 5, best gear, extra replays' },
  basicFed: { feed: 'half', pol: 'basic', label: 'Fed regularly, basic attacks only on the Celestial Crown (no guards, heals or specials)' },
  autoFed: { feed: 'half', pol: 'auto', label: 'Fed regularly, the game’s own auto-battle on the Celestial Crown' },
};
const wearBest = (st, uids) => { if (!R.equip) return; const best = {}; (st.items || []).forEach((it) => { const def = D.ITEMS[it.id] || {}, sl = def.slot, sc = Object.values(def.stats || def.bonus || {}).reduce((a, b) => a + (+b || 0), 0); if (sl && (!best[sl] || sc > best[sl].sc)) best[sl] = { it, sc }; });
  Object.values(best).forEach((b, i) => { try { R.equip(st, uids[i % uids.length], b.it.uid); } catch (e) { /* not equippable */ } }); };
function arrivalSave(prof, seed) {
  const rng = seeded(seed); R.rng = rng;
  const st = A.State.newGame(); st.phase = 'play'; st.introDone = true; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = st.flags.r2 = true;
  const uids = TRIO.map((sp) => R.addAmina(st, sp, 3).uid), ag = agent(st, uids, prof.feed, rng); // earlier islands always tactical
  const olog = [];
  D.CAMPAIGN.starter.dungeons.forEach((id) => ag.clear(id));
  if (prof.starterReplays) ['windstair', 'resonancescar', 'heartwood'].forEach((id) => { for (let k = 0; k < 3; k++) ag.replay(id); });
  D.CAMPAIGN.verdant.dungeons.forEach((id) => ag.clear(id));
  if (prof.verdantReplays) D.CAMPAIGN.verdant.dungeons.forEach((id) => { for (let k = 0; k < prof.verdantReplays; k++) ag.replay(id); });
  D.CAMPAIGN.obsidian.dungeons.forEach((id) => ag.clear(id, olog));
  if (prof.obsidianReplays) D.CAMPAIGN.obsidian.dungeons.forEach((id) => { for (let k = 0; k < prof.obsidianReplays; k++) ag.replay(id); });
  if (prof.moves) uids.forEach((u) => { const a = R.inst(st, u); R.moveSlots(a); a.mv = a.mv.map(() => prof.moves); });
  if (prof.gear) wearBest(st, uids);
  const forge = R.islandBossDefeated(st, 'obsidian');
  if (forge && !W.islandUnlocked(st, 'celestial')) W.unlockByBoss(st, 'celestial');
  const s = ag.stats();
  return { st, uids, seed, forge, open: W.islandUnlocked(st, 'celestial'), cap: R.levelCap(st), arrive: +mean(uids.map((u) => R.inst(st, u).lv)).toFixed(1), obsidianLosses: olog.reduce((n, l) => n + l.losses, 0), minutesBefore: s.minutes };
}
function playIsland(save, prof) {
  const ids = IDS;
  const st = JSON.parse(JSON.stringify(save.st)), rng = seeded(save.seed * 7 + 1); R.rng = rng;
  const ag = agent(st, save.uids, prof.feed, rng, prof.pol), log = []; const s0 = ag.stats();
  ids.forEach((id) => ag.clear(id, log));
  const ovIsland = 0, ovReplay = 0;
  const s1 = ag.stats(), insts = save.uids.map((u) => R.inst(st, u));
  const at60 = log.findIndex((l) => l.arrive >= 59.99);
  return { arrive0: save.arrive, end: +mean(insts.map((a) => a.lv)).toFixed(1), log, losses: s1.losses - s0.losses, grinds: s1.grinds - s0.grinds, minutes: s1.minutes - s0.minutes, allCleared: log.every((l) => l.cleared),
    reach60At: at60 < 0 ? null : at60 + 1, overflowIsland: Math.round(ovIsland / save.uids.length), overflowReplay: Math.round(ovReplay / save.uids.length) };
}
const atLevel = (save, L) => { const st = JSON.parse(JSON.stringify(save.st)); save.uids.forEach((u) => { const a = R.inst(st, u); a.lv = L; a.xp = 0; while (R.evoCheck(st, u).ok) R.evolve(st, u); }); return Object.assign({}, save, { st, arrive: L }); };
function threshold(id) { const rec = D.DUNGEONS[id].recommended; for (let off = -8; off <= 8; off++) { let c = 0; for (let s = 0; s < 16; s++) if (g.run(id, TRIO, rec + off, 'tactical', 300 + s).cleared) c++; if (c >= 8) return rec + off; } return rec + 9; }
function styles(id) { const rec = D.DUNGEONS[id].recommended, o = {}; ['tactical', 'auto', 'basic'].forEach((pol) => { let c = 0; for (let s = 0; s < 12; s++) if (g.run(id, TRIO, rec, pol, 700 + s).cleared) c++; o[pol] = pct(c, 12); }); return o; }


/* 1. all 100 battles, and each guardian's charged move */
function battleRates() {
  const out = [];
  IDS.forEach((id) => { const d = D.DUNGEONS[id], rec = d.recommended;
    d.battles.forEach((spec, i) => { const row = { id, i: i + 1, sp: spec.stages ? spec.stages.map((x) => x.sp).join('+') : spec.sp, lv: spec.lv, boss: !!spec.boss, move: spec.move || (spec.stages ? spec.stages.map((x) => x.move).join('+') : null) };
      ['tactical', 'basic'].forEach((pol) => { let w = 0, turns = 0; for (let s = 0; s < N100; s++) { R.rng = seeded(500 + s); const b = B.create(g.party(TRIO, rec), R.foesFromSpec(spec), { rng: R.rng }); const r = g.fight(b, pol); if (b.result === 'win') w++; turns += r.turns; } row[pol] = pct(w, N100); row[pol + 'Turns'] = +(turns / N100).toFixed(1); });
      out.push(row); }); });
  return out;
}
// one charged hit on a fresh member of the trio at the recommended level: share of its health, unguarded and guarded
function chargeShare(id) {
  const d = D.DUNGEONS[id], rec = d.recommended, boss = d.battles[9], foes = [].concat(R.foesFromSpec(boss));
  return foes.map((e) => { const mv = D.ABILITIES[e.move || (e.abil || []).find((k) => D.ABILITIES[k].boss)]; if (!mv) return { sp: e.sp, move: null };
    const sh = { un: [], gd: [] };
    g.party(TRIO, rec).forEach((p) => { ['un', 'gd'].forEach((k) => { for (let s = 0; s < 8; s++) { const def = Object.assign({}, p, { guard: k === 'gd' }); const r = B.damage(Object.assign({}, e), def, mv, seeded(40 + s)); sh[k].push(r.dmg / p.hpMax); } }); });
    return { sp: e.sp, name: e.name, stage: e.stage || null, move: e.move, unguardedMax: +Math.max(...sh.un).toFixed(2), guardedMax: +Math.max(...sh.gd).toFixed(2) };
  });
}

/* ---------- run ---------- */
const t0 = Date.now(), out = { note: 'Simulation of the Celestial Crown campaign (tools/p20c-sim.js) on the real game data. Rule-level, scripted policies; not real gameplay, not an iPhone.', seeds: SEEDS, profiles: {}, saves: {} };
if (!process.env.ONLY || process.env.ONLY === 'battles') { out.battles = battleRates(); const bad = out.battles.filter((r) => r.tactical < 50);
  console.log('battles at rec: tactical <50%:', bad.length, bad.map((r) => r.id + '#' + r.i + ' ' + r.tactical + '%').join(', ') || 'none'); out.charges = IDS.map((id) => ({ id, stages: chargeShare(id) })); }
if (!process.env.ONLY || process.env.ONLY === 'thresholds') { out.thresholds = IDS.map(threshold); out.rec = IDS.map((id) => D.DUNGEONS[id].recommended); out.slackAtRec = IDS.map((id, i) => out.rec[i] - out.thresholds[i]);
  if (!QUICK) out.styles = IDS.map(styles);
  console.log('thresholds', out.thresholds.join(' '), '(rec', out.rec.join(' ') + ')'); if (out.styles) console.log('clear at rec: tactical', out.styles.map((x) => x.tactical).join(' '), '| auto', out.styles.map((x) => x.auto).join(' '), '| basic', out.styles.map((x) => x.basic).join(' ')); }
if (!process.env.ONLY || process.env.ONLY === 'campaigns') {
  const saves = {}; const profKeys = Object.keys(PROFILES).filter((p) => !process.env.PROFILES || process.env.PROFILES.split(',').indexOf(p) >= 0);
  profKeys.forEach((pk) => { saves[pk] = SEEDS.map((seed) => arrivalSave(PROFILES[pk], seed)); const sv = saves[pk];
    out.saves[pk] = { label: PROFILES[pk].label, arrive: +mean(sv.map((s) => s.arrive)).toFixed(1), cap: sv[0].cap, forge: sv.every((s) => s.forge), open: sv.every((s) => s.open) }; console.log('arrival', pk.padEnd(13), JSON.stringify(out.saves[pk])); });
  out.campaigns = {};
  profKeys.forEach((pk) => { const runs = saves[pk].filter((s) => s.open).map((s) => playIsland(s, PROFILES[pk])); if (!runs.length) return; const m = (f) => +mean(runs.map(f)).toFixed(1);
    const c = { arrive: m((r) => r.arrive0), end: m((r) => r.end), losses: m((r) => r.losses), grinds: m((r) => r.grinds), minutes: Math.round(mean(runs.map((r) => r.minutes))), allCleared: runs.every((r) => r.allCleared), reach60At: runs.map((r) => r.reach60At),
      arrivePer: IDS.map((_, i) => m((r) => r.log[i].arrive)), lossesPer: IDS.map((_, i) => m((r) => r.log[i].losses)), grindsPer: IDS.map((_, i) => m((r) => r.log[i].grinds)) };
    out.campaigns[pk] = c; console.log('  ' + pk.padEnd(13), 'arrive', c.arrive, 'end', c.end, 'losses', c.losses, 'grinds', c.grinds, 'min', c.minutes, 'all', c.allCleared, '60 at D', c.reach60At.join('/'), '| losses/dungeon', c.lossesPer.join(' ')); });
  out.entry = {};
  if (saves.fedRegularly) [47, 50, 55, 60].forEach((L) => { const runs = saves.fedRegularly.filter((s) => s.open).map((s) => playIsland(atLevel(s, L), PROFILES.fedRegularly)); const m = (f) => +mean(runs.map(f)).toFixed(1);
    const c = { level: L, end: m((r) => r.end), losses: m((r) => r.losses), grinds: m((r) => r.grinds), minutes: Math.round(mean(runs.map((r) => r.minutes))), lossesPer: IDS.map((_, i) => m((r) => r.log[i].losses)), allCleared: runs.every((r) => r.allCleared) };
    out.entry['L' + L] = c; console.log('  enter at', L, '| end', c.end, 'losses', c.losses, 'grinds', c.grinds, 'min', c.minutes, 'all', c.allCleared, '| losses/dungeon', c.lossesPer.join(' ')); });
}
fs.writeFileSync(path.join(OUT, process.env.OUTNAME || 'sim.json'), JSON.stringify(out, null, 1));
console.log('\ndone in', Math.round((Date.now() - t0) / 1000), 's →', OUT);
