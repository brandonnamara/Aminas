// Phase 19B: Mastery research (simulation only; NOTHING in the game changes — no Mastery exists in the build).
// The real rules (Phase 19B working tree, with the staged level cap: 40, then 50 after the Forest Crown) are loaded into
// a sandbox. Saves are built by playing Starter Island and the Verdant Wilds with the 17C campaign agent; the Phase 19A
// recommended Obsidian dungeons (cap-50 band, recommended 38–47, tools/p19a-design.js) are added to THE SANDBOX ONLY.
// Four ways to treat XP earned by an Amina standing at its current cap are compared:
//   none   – Phase 19B as built: the XP is not stored (no hidden XP)
//   pct1   – Mastery ranks, +1% to HP/Attack/Defence/Speed each, 10 ranks (max +10%)
//   pct05  – Mastery ranks, +0.5% each, 10 ranks (max +5%)
//   sparks – no stat change: the XP becomes a resource (1 gold-equivalent per 4 XP), a sink for gear/moves later
// A rank costs as much XP as one level at the cap the Amina is held at (R.xpNeed(cap)).
// Measures: ranks / resource earned by profile, Obsidian difficulty (losses, slack over first-try thresholds), Island
// Boss win rates with 0/5/10 ranks, level-equivalents of a rank at 50 and 60 (future island scaling), save size.
// Automated play with a scripted tactical policy; not real gameplay and not an iPhone.
// Run: node tools/p19b-mastery.js [outDir]   (default docs/audit19b)   Env: QUICK=1, SEEDS=11,22
process.env.P17B_LIB = '1';
const fs = require('fs'), path = require('path');
const { Game, loadAt, seeded, mean } = require('./p17b-sim.js');
const DES = require('./p19a-design.js');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit19b'); fs.mkdirSync(OUT, { recursive: true });
const QUICK = !!process.env.QUICK, SEEDS = (process.env.SEEDS || (QUICK ? '11' : '11,22')).split(',').map(Number), SECS = 4.5;
const TRIO = ['lumifern', 'cannonis', 'emberix'];
const g = Game(loadAt(null), '19B'), D = g.D, R = g.R, A = g.A;
if (!R.levelCap) throw new Error('this tool needs the Phase 19B staged level cap (R.levelCap)');

/* ---------- the recommended Obsidian band, sandbox only ---------- */
Object.keys(DES.MOVES).forEach((k) => { D.ABILITIES[k] = Object.assign({}, DES.MOVES[k]); });
D.ISLAND_LIVE.obsidian = true;
const BK = 'cap50', band = DES.BANDS[BK], tier = DES.TIER[BK], IDS = [];
DES.DUNGEONS.forEach((dd, i) => {
  const rec = band.rec[i], lvs = [rec - 3, rec - 3, rec - 2, rec - 2, rec - 1, rec - 1, rec, rec, rec];
  const battles = dd.foes.map((line, k) => ({ sp: g.formAt(line, lvs[k]), lv: lvs[k], tier }));
  battles[8].move = dd.boss.move; battles[8].herald = true;
  battles.push({ sp: g.formAt(dd.boss.line, rec + 3), lv: rec + 3, boss: true, title: dd.boss.title, hpMult: dd.boss.hpMult, scale: 1.5, move: dd.boss.move, mech: dd.boss.mech, islandBoss: !!dd.boss.islandBoss, tier });
  const id = 'sim_' + dd.id;
  D.DUNGEONS[id] = { id, name: dd.name, island: 'obsidian', el: dd.el, playable: true, recommended: rec, theme: dd.theme, unlock: {}, battles,
    sections: [{ name: 'I', from: 0, to: 2, first: { gold: 200, food: 45 } }, { name: 'II', from: 3, to: 5, first: { gold: 210, food: 48 } }, { name: 'III', from: 6, to: 8, first: { gold: 220, food: 50 } }, { name: 'IV', from: 9, to: 9, first: { gold: 400, food: 80 } }],
    first: { gold: 4200 + i * 400, food: 650, gems: 12 }, repeat: { gold: 480 + i * 30, food: 95 }, index: i + 1, prev: i ? 'sim_' + DES.DUNGEONS[i - 1].id : 'v_elderroot' };
  IDS.push(id);
});
const BOSS = IDS[IDS.length - 1]; // the Forge Heart

/* ---------- the variants (sandbox only) ---------- */
const VARIANTS = {
  none: { label: 'No Mastery (Phase 19B as built: XP at the cap is not stored)' },
  pct1: { label: 'Mastery +1% per rank, 10 ranks (max +10%)', per: 0.01, ranks: 10 },
  pct05: { label: 'Mastery +0.5% per rank, 10 ranks (max +5%)', per: 0.005, ranks: 10 },
  sparks: { label: 'No stat change: XP at the cap becomes Forge Sparks (1 gold-equivalent per 4 XP)', spark: 0.25 },
};
let V = VARIANTS.none, FORCE = null;
const rankOf = (inst) => FORCE != null ? FORCE : V.per ? Math.min(V.ranks, inst.mrank || 0) : 0;
const addXp0 = R.addXp;
R.addXp = function (st, inst, amt) {
  const cap = R.levelCap(st);
  if (inst.lv >= cap && amt > 0) {
    inst.capXp = (inst.capXp || 0) + amt;
    if (V.per) { inst.mxp = (inst.mxp || 0) + amt; while ((inst.mrank || 0) < V.ranks && inst.mxp >= R.xpNeed(cap)) { inst.mxp -= R.xpNeed(cap); inst.mrank = (inst.mrank || 0) + 1; } }
    if (V.spark) inst.sparks = (inst.sparks || 0) + amt * V.spark;
    return { levels: [], evolved: null, evoReady: null, gained: 0, capped: true };
  }
  return addXp0.apply(this, arguments);
};
const pf0 = R.partyFighter;
R.partyFighter = function (st, inst) {
  const f = pf0.apply(this, arguments), per = V.per || 0, k = 1 + per * rankOf(inst);
  if (k > 1) { const hp0 = f.hpMax; ['atk', 'def', 'spd'].forEach((s) => (f[s] = Math.round(f[s] * k))); f.hpMax = Math.round(f.hpMax * k); f.hp = Math.round(f.hp * f.hpMax / hp0); }
  return f;
};

/* ---------- the 17C campaign agent (as in tools/p19a-sim.js) ---------- */
function agent(st, uids, feed, rng) {
  let battles = 0, turns = 0, losses = 0, grinds = 0, last = null;
  const evolve = () => uids.forEach((u) => { while (R.evoCheck(st, u).ok) R.evolve(st, u); });
  const doFeed = () => { if (feed === 'none') return; let budget = feed === 'all' ? st.res.food : Math.floor(st.res.food / 2);
    while (budget >= D.SNACKS.feast.food) { const low = uids.map((u) => R.inst(st, u)).sort((a, b) => a.lv - b.lv)[0]; if (low.lv >= R.levelCap(st)) break; const r = R.feed(st, low.uid, 'feast'); if (!r || !r.ok) break; budget -= D.SNACKS.feast.food; } };
  const play = (id, from) => { R.startRun(st, id, uids, { from }); let out; do { const b = R.createBattle(st, rng); const r = g.fight(b, 'tactical'); battles++; turns += r.turns; out = R.resolveBattle(st, b); } while (out.win && !out.cleared && st.run); return out; };
  const clear = (id, log) => {
    const need = (D.DUNGEONS[id].unlock || {}).rank; if (need && st.rank < need) st.rank = need; if (id === 'lanternorchard') st.flags.hollowveil = true;
    const l0 = losses, tt0 = turns; let fails = 0, guard = 0, tries = 0;
    const arrive = +mean(uids.map((u) => R.inst(st, u).lv)).toFixed(1), ranks = +mean(uids.map((u) => rankOf(R.inst(st, u)))).toFixed(1);
    while (!R.dungeonCleared(st, id) && guard++ < 300) { tries++; const out = play(id); if (!out || !out.win) { losses++; fails++; } evolve(); doFeed(); evolve(); if (fails >= 2 && last) { play(last, 0); grinds++; evolve(); doFeed(); evolve(); fails = 0; } }
    last = id; if (log) log.push({ id, arrive, ranks, cleared: R.dungeonCleared(st, id), tries, losses: losses - l0, minutes: +((turns - tt0) * SECS / 60).toFixed(1) });
  };
  const replay = (id) => { play(id, 0); evolve(); doFeed(); evolve(); };
  return { clear, replay, stats: () => ({ battles, minutes: Math.round(turns * SECS / 60), losses, grinds }) };
}
const PROFILES = {
  rarelyFed: { feed: 'none', label: 'Rarely fed: balanced trio, no gear, moves Lv 1' },
  fedRegularly: { feed: 'half', label: 'Fed regularly (half of food), no gear, moves Lv 1' },
  balanced: { feed: 'half', moves: 3, gear: true, label: 'Balanced: fed regularly, moves Lv 3, best gear' },
  upgraded: { feed: 'all', moves: 5, gear: true, starterReplays: true, label: 'Highly upgraded: all food, moves Lv 5, best gear, extra replays' },
  verdantAll: { feed: 'half', moves: 4, gear: true, verdantReplays: 2, label: 'All optional Verdant content: two full replays of every Verdant dungeon' },
};
const wearBest = (st, uids) => { if (!R.equip) return; const best = {}; (st.items || []).forEach((it) => { const def = D.ITEMS[it.id] || {}, sl = def.slot, sc = Object.values(def.stats || def.bonus || {}).reduce((a, b) => a + (+b || 0), 0); if (sl && (!best[sl] || sc > best[sl].sc)) best[sl] = { it, sc }; });
  Object.values(best).forEach((b, i) => { try { R.equip(st, uids[i % uids.length], b.it.uid); } catch (e) { /* not equippable */ } }); };
function arrivalSave(prof, seed) {
  const rng = seeded(seed); R.rng = rng;
  const st = A.State.newGame(); st.phase = 'play'; st.introDone = true; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = st.flags.r2 = true;
  const uids = TRIO.map((sp) => R.addAmina(st, sp, 3).uid), ag = agent(st, uids, prof.feed, rng);
  D.CAMPAIGN.starter.dungeons.forEach((id) => ag.clear(id));
  if (prof.starterReplays) ['windstair', 'resonancescar', 'heartwood'].forEach((id) => { for (let k = 0; k < 3; k++) ag.replay(id); });
  if (!A.World.islandUnlocked(st, 'verdant')) A.World.unlockByBoss(st, 'verdant');
  D.CAMPAIGN.verdant.dungeons.forEach((id) => ag.clear(id));
  if (prof.verdantReplays) D.CAMPAIGN.verdant.dungeons.forEach((id) => { for (let k = 0; k < prof.verdantReplays; k++) ag.replay(id); });
  if (prof.moves) uids.forEach((u) => { const a = R.inst(st, u); R.moveSlots(a); a.mv = a.mv.map(() => prof.moves); });
  if (prof.gear) wearBest(st, uids);
  st.islands.obsidian = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' };
  return { st, uids, seed, cap: R.levelCap(st), bossFlag: R.islandBossDefeated(st, 'verdant') };
}
// first-try thresholds for the band (no Mastery): lowest party level clearing first try in half of 16 runs
function threshold(id) { const keep = V; V = VARIANTS.none; const rec = D.DUNGEONS[id].recommended; let out = rec + 9;
  for (let off = -8; off <= 8; off++) { let c = 0; for (let s = 0; s < 16; s++) if (g.run(id, TRIO, rec + off, 'tactical', 300 + s).cleared) c++; if (c >= 8) { out = rec + off; break; } }
  V = keep; return out; }
function playIsland(save, prof, vk, extra) {
  V = VARIANTS[vk]; const st = JSON.parse(JSON.stringify(save.st)), rng = seeded(save.seed * 7 + 1); R.rng = rng;
  const ag = agent(st, save.uids, prof.feed, rng), log = [], g0 = st.res.gold;
  IDS.forEach((id) => ag.clear(id, log));
  const s1 = ag.stats(), atEnd = save.uids.map((u) => R.inst(st, u));
  const end = { lv: +mean(atEnd.map((a) => a.lv)).toFixed(1), ranks: +mean(atEnd.map(rankOf)).toFixed(2), capXp: Math.round(mean(atEnd.map((a) => a.capXp || 0))), sparks: Math.round(mean(atEnd.map((a) => a.sparks || 0))), gold: st.res.gold - g0 };
  // then the island's last three dungeons replayed `extra` times each (a player farming challenges and gear)
  IDS.slice(7).forEach((id) => { for (let k = 0; k < extra; k++) ag.replay(id); });
  const atFarm = save.uids.map((u) => R.inst(st, u));
  const farm = { ranks: +mean(atFarm.map(rankOf)).toFixed(2), capXp: Math.round(mean(atFarm.map((a) => a.capXp || 0))), sparks: Math.round(mean(atFarm.map((a) => a.sparks || 0))), gold: st.res.gold - g0 };
  V = VARIANTS.none;
  return { log, end, farm, losses: s1.losses, grinds: s1.grinds, minutes: s1.minutes };
}
// the Forge Heart alone (full health, one attempt), and its whole dungeon first try, at fixed levels and ranks
function bossRates() {
  const d = D.DUNGEONS[BOSS], spec = d.battles[d.battles.length - 1], out = [];
  ['pct1', 'pct05'].forEach((vk) => { [41, 43, 45, 47].forEach((lv) => { [0, 5, 10].forEach((rk) => {
    V = VARIANTS[vk]; FORCE = rk; let w = 0, dun = 0; const N = QUICK ? 16 : 40;
    for (let s = 0; s < N; s++) { const b = g.B.create(g.party(TRIO, lv), R.enemyFromSpec(spec), { rng: seeded(900 + s) }); if (g.fight(b, 'tactical').win) w++; if (g.run(BOSS, TRIO, lv, 'tactical', 1300 + s).cleared) dun++; }
    out.push({ variant: vk, lv, ranks: rk, bossWinPct: Math.round(100 * w / N), dungeonFirstTryPct: Math.round(100 * dun / N) }); FORCE = null; V = VARIANTS.none;
  }); }); });
  return out;
}
// how many levels of stats one full Mastery track is worth (stats scale with 1 + 0.11·(lv − 1) in R.statsAt)
// at the final cap (60, both Island Bosses beaten): how fast ranks / sparks build while replaying the island's last three
// dungeons (the only Mastery-relevant phase under staged caps: below the final cap, XP mostly raises levels instead)
function capFarm(save, prof, vk, rounds) {
  V = VARIANTS[vk]; const st = JSON.parse(JSON.stringify(save.st)), rng = seeded(save.seed * 13 + 5); R.rng = rng;
  st.campaign = st.campaign || {}; st.campaign.bosses = Object.assign({}, st.campaign.bosses, { verdant: true, obsidian: true });
  IDS.forEach((id) => { st.dungeon[id] = st.dungeon[id] || { clears: 1 }; });
  save.uids.forEach((u) => { const a = R.inst(st, u); a.lv = R.levelCap(st); a.xp = 0; a.mxp = 0; a.mrank = 0; a.capXp = 0; a.sparks = 0; while (R.evoCheck(st, u).ok) R.evolve(st, u); });
  const ag = agent(st, save.uids, prof.feed, rng), track = []; const m0 = ag.stats().minutes;
  for (let k = 1; k <= rounds; k++) { IDS.slice(7).forEach((id) => ag.replay(id)); const xs = save.uids.map((u) => R.inst(st, u));
    track.push({ round: k, minutes: ag.stats().minutes - m0, ranks: +mean(xs.map(rankOf)).toFixed(2), capXp: Math.round(mean(xs.map((a) => a.capXp || 0))), sparks: Math.round(mean(xs.map((a) => a.sparks || 0))) }); }
  V = VARIANTS.none; return { cap: R.levelCap(st), rankCost: R.xpNeed(R.levelCap(st)), track };
}
function levelEquivalents() {
  const f = (lv) => 1 + 0.11 * (lv - 1);
  return [40, 50, 60].map((lv) => ({ lv, plus5pct: +(0.05 * f(lv) / 0.11).toFixed(1), plus10pct: +(0.10 * f(lv) / 0.11).toFixed(1), oneLevelPct: +(100 * 0.11 / f(lv)).toFixed(2) }));
}

const thresholds = IDS.map(threshold); console.log('thresholds', thresholds.join(' '));
const results = {}, EXTRA = QUICK ? 2 : 5;
Object.keys(PROFILES).filter((p) => !process.env.PROFILES || process.env.PROFILES.split(',').indexOf(p) >= 0).forEach((pk) => {
  const prof = PROFILES[pk], saves = SEEDS.map((s) => arrivalSave(prof, s));
  results[pk] = { label: prof.label, arrive: +mean(saves.map((s) => mean(s.uids.map((u) => R.inst(s.st, u).lv)))).toFixed(1), capOnArrival: saves[0].cap, bossFlag: saves.every((s) => s.bossFlag), variants: {} };
  Object.keys(VARIANTS).forEach((vk) => {
    const runs = saves.map((s) => playIsland(s, prof, vk, EXTRA)), m = (f) => +mean(runs.map(f)).toFixed(2);
    const arrive = IDS.map((_, i) => +mean(runs.map((r) => r.log[i].arrive)).toFixed(1)), ranksIn = IDS.map((_, i) => +mean(runs.map((r) => r.log[i].ranks)).toFixed(1));
    results[pk].variants[vk] = { losses: m((r) => r.losses), grinds: m((r) => r.grinds), minutes: m((r) => r.minutes), endLv: m((r) => r.end.lv), endRanks: m((r) => r.end.ranks), endCapXp: Math.round(m((r) => r.end.capXp)), endSparks: Math.round(m((r) => r.end.sparks)), islandGold: Math.round(m((r) => r.end.gold)),
      farmRanks: m((r) => r.farm.ranks), farmSparks: Math.round(m((r) => r.farm.sparks)), farmGold: Math.round(m((r) => r.farm.gold)), arrive, ranksIn, slack: arrive.map((a, i) => +(a - thresholds[i]).toFixed(1)), cleared: runs.every((r) => r.log.every((l) => l.cleared)) };
    const r = results[pk].variants[vk];
    console.log(pk.padEnd(13), vk.padEnd(7), 'arrive', results[pk].arrive, 'cap', results[pk].capOnArrival, '| losses', r.losses, 'min', r.minutes, '| end lv', r.endLv, 'ranks', r.endRanks, 'capXp', r.endCapXp, 'sparks', r.endSparks, '| after', EXTRA + 'x farm: ranks', r.farmRanks, 'sparks', r.farmSparks, 'gold', r.farmGold);
  });
});
const farm = {}; { const prof = PROFILES.balanced, save = arrivalSave(prof, SEEDS[0]), rounds = QUICK ? 4 : 12;
  ['pct1', 'pct05', 'sparks'].forEach((vk) => { farm[vk] = capFarm(save, prof, vk, rounds); const t = farm[vk].track, last = t[t.length - 1], full = t.find((x) => x.ranks >= 10);
    console.log('farm@cap', vk, 'cap', farm[vk].cap, 'rank cost', farm[vk].rankCost, '| after', last.round, 'rounds (' + last.minutes + ' min): ranks', last.ranks, 'capXp', last.capXp, 'sparks', last.sparks, '| 10 ranks after', full ? full.minutes + ' min' : '> ' + last.minutes + ' min'); }); }
const boss = bossRates(); boss.forEach((b) => console.log('boss', b.variant, 'lv', b.lv, 'ranks', b.ranks, 'win', b.bossWinPct + '%', 'dungeon first try', b.dungeonFirstTryPct + '%'));
const leq = levelEquivalents(); console.log('level equivalents', JSON.stringify(leq));
// save cost of a Mastery record (per Amina: { mxp, mrank }) for a 60-Amina collection
const saveBytes = JSON.stringify({ a: Array.from({ length: 60 }, () => ({ mxp: 12345, mrank: 7 })) }).length - JSON.stringify({ a: Array.from({ length: 60 }, () => ({})) }).length;
fs.writeFileSync(path.join(OUT, 'mastery.json'), JSON.stringify({ note: 'Sandbox only: the Obsidian dungeons and every Mastery variant exist only in this simulation. Automated play with a scripted tactical policy; not real gameplay, not an iPhone.',
  seeds: SEEDS, farmReplays: EXTRA, band: band, thresholds, variants: VARIANTS, profiles: PROFILES, results, farmAtCap: farm, boss, levelEquivalents: leq, saveBytesFor60Aminas: saveBytes }, null, 1)); // (no timing: the simulation library fixes Date.now for determinism)
console.log('done →', OUT);
