// Phase 19A: level-cap study for Obsidian Reach (design only; nothing in the game changes).
// The real rules (working tree, Phase 18D) are loaded into a sandbox. Realistic saves are built by playing Starter Island
// and the Verdant Wilds with the 17C campaign agent (tactical player, evolves when it can, replays after two defeats).
// The proposed Obsidian dungeons (tools/p19a-design.js) are added to THAT SANDBOX ONLY, once per option:
//   cap50  – level cap raised to 50, recommended levels 38–47
//   cap60  – level cap raised to 60, recommended levels 38–51
//   cap40m – cap stays 40; past it XP fills Mastery ranks (+2% stats each, 10 ranks), recommended 37–40, stronger foe tier
// Automated play only; these are rule-level simulations with a scripted policy, not real gameplay.
// Run: node tools/p19a-sim.js [outDir]   (default docs/audit19a)   Env: QUICK=1, SEEDS=11,22
process.env.P17B_LIB = '1';
const fs = require('fs'), path = require('path');
const { Game, loadAt, seeded, mean } = require('./p17b-sim.js');
const DES = require('./p19a-design.js');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit19a'); fs.mkdirSync(OUT, { recursive: true });
const QUICK = !!process.env.QUICK, SEEDS = (process.env.SEEDS || (QUICK ? '11' : '11,22')).split(',').map(Number), SECS = 4.5;
const TRIO = ['lumifern', 'cannonis', 'emberix'];
const g = Game(loadAt(null), '19A'), D = g.D, R = g.R, A = g.A;
const CAP0 = D.MAX_LEVEL;

/* ---------- the proposed island, three times (one per option), sandbox only ---------- */
Object.keys(DES.MOVES).forEach((k) => { D.ABILITIES[k] = Object.assign({}, DES.MOVES[k]); });
D.ISLAND_LIVE.obsidian = true;
const form = (line, lv) => g.formAt(line, lv);
const BANDIDS = {};
Object.keys(DES.BANDS).forEach((bk) => {
  const band = DES.BANDS[bk], tier = DES.TIER[bk], ids = [];
  DES.DUNGEONS.forEach((dd, i) => {
    const rec = band.rec[i], lvs = [rec - 3, rec - 3, rec - 2, rec - 2, rec - 1, rec - 1, rec, rec, rec];
    const battles = dd.foes.map((line, k) => ({ sp: form(line, lvs[k]), lv: lvs[k], tier }));
    battles[8].move = dd.boss.move; battles[8].herald = true;
    battles.push({ sp: form(dd.boss.line, rec + 3), lv: rec + 3, boss: true, title: dd.boss.title, hpMult: dd.boss.hpMult, scale: 1.5, move: dd.boss.move, mech: dd.boss.mech, islandBoss: !!dd.boss.islandBoss, tier });
    const id = bk + '_' + dd.id;
    D.DUNGEONS[id] = { id, name: dd.name, island: 'obsidian', el: dd.el, playable: true, recommended: rec, theme: dd.theme, unlock: {}, battles,
      sections: [{ name: 'I', from: 0, to: 2, first: { gold: 200, food: 45 } }, { name: 'II', from: 3, to: 5, first: { gold: 210, food: 48 } }, { name: 'III', from: 6, to: 8, first: { gold: 220, food: 50 } }, { name: 'IV', from: 9, to: 9, first: { gems: 6 } }],
      first: { gold: 4200 + i * 400, food: 650, gems: 12 }, repeat: { gold: 480 + i * 30, food: 95 }, index: i + 1, prev: i ? bk + '_' + DES.DUNGEONS[i - 1].id : 'v_elderroot' };
    ids.push(id);
  });
  BANDIDS[bk] = ids;
});

/* ---------- option 3: Mastery ranks (sandbox only) ---------- */
let MASTERY = false;
const rankOf = (inst) => Math.min(DES.MASTERY.ranks, Math.floor((inst.mxp || 0) / R.xpNeed(D.MAX_LEVEL)));
const addXp0 = R.addXp; let OVERFLOW = 0;
R.addXp = function (st, inst, amt) {
  if (!MASTERY && inst.lv >= D.MAX_LEVEL && amt > 0) OVERFLOW += amt; // XP a capped Amina would have earned (dropped since 18D)
  if (MASTERY && inst.lv >= D.MAX_LEVEL && amt > 0) { inst.mxp = (inst.mxp || 0) + amt; return { levels: [], evolved: null, evoReady: null, gained: amt, capped: true }; }
  return addXp0.apply(this, arguments);
};
const pf0 = R.partyFighter;
R.partyFighter = function (st, inst) {
  const f = pf0.apply(this, arguments), k = MASTERY ? 1 + DES.MASTERY.perRank * rankOf(inst) : 1;
  if (k > 1) { const hp0 = f.hpMax; ['atk', 'def', 'spd'].forEach((s) => (f[s] = Math.round(f[s] * k))); f.hpMax = Math.round(f.hpMax * k); f.hp = Math.round(f.hp * f.hpMax / hp0); }
  return f;
};

/* ---------- the 17C campaign agent ---------- */
function agent(st, uids, feed, rng) {
  let battles = 0, turns = 0, losses = 0, grinds = 0, last = null;
  const evolve = () => uids.forEach((u) => { while (R.evoCheck(st, u).ok) R.evolve(st, u); });
  const doFeed = () => { if (feed === 'none') return; let budget = feed === 'all' ? st.res.food : Math.floor(st.res.food / 2);
    while (budget >= D.SNACKS.feast.food) { const low = uids.map((u) => R.inst(st, u)).sort((a, b) => a.lv - b.lv)[0]; if (low.lv >= D.MAX_LEVEL) break; const r = R.feed(st, low.uid, 'feast'); if (!r || !r.ok) break; budget -= D.SNACKS.feast.food; } };
  const play = (id, from) => { R.startRun(st, id, uids, { from }); let out; do { const b = R.createBattle(st, rng); const r = g.fight(b, 'tactical'); battles++; turns += r.turns; out = R.resolveBattle(st, b); } while (out.win && !out.cleared && st.run); return out; };
  const clear = (id, log) => {
    const need = (D.DUNGEONS[id].unlock || {}).rank; if (need && st.rank < need) st.rank = need; if (id === 'lanternorchard') st.flags.hollowveil = true;
    const t0 = battles, l0 = losses, g0 = grinds, tt0 = turns; let fails = 0, guard = 0, tries = 0;
    const arrive = +mean(uids.map((u) => R.inst(st, u).lv)).toFixed(1);
    while (!R.dungeonCleared(st, id) && guard++ < 300) { tries++; const out = play(id); if (!out || !out.win) { losses++; fails++; } evolve(); doFeed(); evolve(); if (fails >= 2 && last) { play(last, 0); grinds++; evolve(); doFeed(); evolve(); fails = 0; } }
    last = id; if (log) log.push({ id, rec: D.DUNGEONS[id].recommended, arrive, cleared: R.dungeonCleared(st, id), tries, losses: losses - l0, grinds: grinds - g0, battles: battles - t0, minutes: +((turns - tt0) * SECS / 60).toFixed(1) });
  };
  const replay = (id) => { play(id, 0); evolve(); doFeed(); evolve(); };
  return { clear, replay, play, stats: () => ({ battles, minutes: Math.round(turns * SECS / 60), losses, grinds }) };
}
const PROFILES = {
  rarelyFed: { feed: 'none', label: 'Rarely fed: balanced trio, no gear, moves Lv 1' },
  fedRegularly: { feed: 'half', label: 'Fed regularly (half of food), no gear, moves Lv 1' },
  balanced: { feed: 'half', moves: 3, gear: true, label: 'Balanced team: fed regularly, moves Lv 3, best gear worn' },
  upgraded: { feed: 'all', moves: 5, gear: true, starterReplays: true, label: 'Highly upgraded: fed with all food, moves Lv 5, best gear, extra replays' },
  arrive40: { feed: 'half', at40: true, moves: 3, gear: true, label: 'Arrives at level 40 (fed regularly, moves Lv 3, gear)' },
  verdantAll: { feed: 'half', moves: 4, gear: true, verdantReplays: 2, label: 'All optional Verdant content: two full replays of every Verdant dungeon, moves Lv 4, gear' },
};
// best item per slot, shared out across the trio (the 18C simulator's rule)
const wearBest = (st, uids) => { if (!R.equip) return; const best = {}; (st.items || []).forEach((it) => { const def = D.ITEMS[it.id] || {}, sl = def.slot, sc = Object.values(def.stats || def.bonus || {}).reduce((a, b) => a + (+b || 0), 0); if (sl && (!best[sl] || sc > best[sl].sc)) best[sl] = { it, sc }; }); uids.forEach((u, k) => Object.values(best).forEach((b, j) => { if ((j + k) % uids.length === 0) R.equip(st, u, b.it.iid); })); };
function arrivalSave(prof, seed) {
  const rng = seeded(seed); R.rng = rng; D.MAX_LEVEL = CAP0; MASTERY = false;
  const st = A.State.newGame(); st.phase = 'play'; st.introDone = true; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = st.flags.r2 = true;
  const uids = TRIO.map((sp) => R.addAmina(st, sp, 3).uid), ag = agent(st, uids, prof.feed, rng);
  D.CAMPAIGN.starter.dungeons.forEach((id) => ag.clear(id));
  if (prof.starterReplays) ['windstair', 'resonancescar', 'heartwood'].forEach((id) => { for (let k = 0; k < 3; k++) ag.replay(id); });
  if (!A.World.islandUnlocked(st, 'verdant')) A.World.unlockByBoss(st, 'verdant');
  const vlog = []; D.CAMPAIGN.verdant.dungeons.forEach((id) => ag.clear(id, vlog));
  if (prof.verdantReplays) D.CAMPAIGN.verdant.dungeons.forEach((id) => { for (let k = 0; k < prof.verdantReplays; k++) ag.replay(id); });
  if (prof.moves) uids.forEach((u) => { const a = R.inst(st, u); R.moveSlots(a); a.mv = a.mv.map(() => prof.moves); });
  if (prof.gear) wearBest(st, uids);
  if (prof.at40) uids.forEach((u) => { const a = R.inst(st, u); a.lv = CAP0; a.xp = 0; while (R.evoCheck(st, u).ok) R.evolve(st, u); });
  st.islands.obsidian = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' };
  const s = ag.stats();
  return { st, uids, seed, arrive: +mean(uids.map((u) => R.inst(st, u).lv)).toFixed(1), verdantArrive: vlog.map((l) => l.arrive), verdantMinutes: s.minutes, verdantLosses: s.losses };
}
function playIsland(save, prof, bk) {
  const band = DES.BANDS[bk], st = JSON.parse(JSON.stringify(save.st)), rng = seeded(save.seed * 7 + 1); R.rng = rng;
  D.MAX_LEVEL = band.cap; MASTERY = !!band.mastery;
  const ag = agent(st, save.uids, prof.feed, rng), log = [], s0 = ag.stats(); OVERFLOW = 0;
  BANDIDS[bk].forEach((id) => ag.clear(id, log));
  // then one full replay of each of the island's last three dungeons (what a player does for challenges and gear)
  const ov0 = OVERFLOW; BANDIDS[bk].slice(7).forEach((id) => ag.replay(id)); const overflow = Math.round(OVERFLOW / save.uids.length), overflowReplays = Math.round((OVERFLOW - ov0) / save.uids.length);
  const s1 = ag.stats(), insts = save.uids.map((u) => R.inst(st, u));
  const end = +mean(insts.map((a) => a.lv)).toFixed(1), ranks = +mean(insts.map(rankOf)).toFixed(1);
  const capAt = log.findIndex((l) => l.arrive >= band.cap - 0.01);
  // XP still needed from the island's end to the cap (in "battles like the last guardian's section")
  const xpToCap = Math.round(mean(insts.map((a) => { let need = 0; for (let l = a.lv; l < band.cap; l++) need += R.xpNeed(l); return Math.max(0, need - (a.xp || 0)); })));
  D.MAX_LEVEL = CAP0; MASTERY = false;
  return { overflow, overflowReplays, overflowRanks: +(overflow / R.xpNeed(band.cap)).toFixed(1), log, end, ranks, capAt: capAt < 0 ? null : capAt + 1, headroom: +(band.cap - end).toFixed(1), xpToCap, battles: s1.battles - s0.battles, minutes: s1.minutes - s0.minutes, losses: s1.losses - s0.losses, grinds: s1.grinds - s0.grinds };
}
// threshold: lowest party level (balanced trio, no gear, moves Lv 1, tactical) clearing first try in at least half of 16 runs
function threshold(id, bk) {
  const band = DES.BANDS[bk], rec = D.DUNGEONS[id].recommended; D.MAX_LEVEL = 99; MASTERY = false;
  let out = rec + 9;
  for (let off = -8; off <= 8; off++) { let c = 0; for (let s = 0; s < 16; s++) if (g.run(id, TRIO, rec + off, 'tactical', 300 + s).cleared) c++; if (c >= 8) { out = rec + off; break; } }
  D.MAX_LEVEL = CAP0; return out;
}
/* ---------- XP economics: what one level costs, and what a battle pays, around the cap ---------- */
function xpTable() {
  const rows = [];
  for (let lv = 30; lv <= 60; lv += 5) { const need = R.xpNeed(lv), statK = 1 + 0.11 * (lv - 1), next = 1 + 0.11 * lv;
    rows.push({ lv, xpForNextLevel: need, statGainOfNextLevelPct: +(100 * (next / statK - 1)).toFixed(2), statFactor: +statK.toFixed(2) }); }
  return rows;
}

const t0 = process.hrtime.bigint();
const thresholds = {}; Object.keys(BANDIDS).forEach((bk) => { thresholds[bk] = BANDIDS[bk].map((id) => threshold(id, bk)); console.log('threshold', bk, thresholds[bk].join(' ')); });
const results = {}, saves = {};
Object.keys(PROFILES).filter((p) => !process.env.PROFILES || process.env.PROFILES.split(',').indexOf(p) >= 0).forEach((pk) => {
  const prof = PROFILES[pk]; results[pk] = { label: prof.label, bands: {} };
  const sv = SEEDS.map((seed) => arrivalSave(prof, seed));
  saves[pk] = { arrive: +mean(sv.map((s) => s.arrive)).toFixed(1), verdantArrive: sv[0].verdantArrive.map((v, i) => +mean(sv.map((s) => s.verdantArrive[i])).toFixed(1)) };
  results[pk].arrive = saves[pk].arrive; results[pk].verdantArrive = saves[pk].verdantArrive;
  Object.keys(BANDIDS).forEach((bk) => {
    const runs = sv.map((s) => playIsland(s, prof, bk)), m = (f) => +mean(runs.map(f)).toFixed(1);
    const arrive = runs[0].log.map((l, i) => +mean(runs.map((r) => r.log[i].arrive)).toFixed(1));
    const r = { overflowXp: Math.round(mean(runs.map((x) => x.overflow))), overflowRanks: m((x) => x.overflowRanks), end: m((x) => x.end), ranks: m((x) => x.ranks), headroom: m((x) => x.headroom), xpToCap: Math.round(mean(runs.map((x) => x.xpToCap))), losses: m((x) => x.losses), grinds: m((x) => x.grinds), minutes: Math.round(mean(runs.map((x) => x.minutes))), battles: Math.round(mean(runs.map((x) => x.battles))),
      capAt: runs.map((x) => x.capAt), arrive, slack: arrive.map((a, i) => +(a - thresholds[bk][i]).toFixed(1)), cleared: runs.every((x) => x.log.every((l) => l.cleared)) };
    results[pk].bands[bk] = r;
    console.log(pk.padEnd(13), bk.padEnd(6), 'overflowXp', r.overflowXp, '(' + r.overflowRanks + ' ranks)', 'arrive', results[pk].arrive, 'end', r.end, 'ranks', r.ranks, 'headroom', r.headroom, 'losses', r.losses, 'grinds', r.grinds, 'min', r.minutes, 'cap@', JSON.stringify(r.capAt), '| slack', r.slack.join(' '));
  });
});
/* ---------- what a GLOBAL cap of 50 (not tied to the island) would do to the Verdant Wilds ---------- */
const verdantThr = D.CAMPAIGN.verdant.dungeons.map((id) => threshold(id));
const globalCap = {};
['fedRegularly', 'upgraded', 'verdantAll'].filter((pk) => results[pk]).forEach((pk) => {
  const prof = PROFILES[pk], rows = SEEDS.map((seed) => { const keep = CAP0; const sv0 = (() => { const f = arrivalSave; return f; })(); D.MAX_LEVEL = 50; const CAPX = 50;
    const rng = seeded(seed); R.rng = rng; const st = A.State.newGame(); st.phase = 'play'; st.introDone = true; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = st.flags.r2 = true;
    const uids = TRIO.map((sp) => R.addAmina(st, sp, 3).uid), ag = agent(st, uids, prof.feed, rng); const realCap = D.MAX_LEVEL;
    const ag2 = ag; D.MAX_LEVEL = CAPX; D.CAMPAIGN.starter.dungeons.forEach((id) => ag2.clear(id)); if (prof.starterReplays) ['windstair', 'resonancescar', 'heartwood'].forEach((id) => { for (let k = 0; k < 3; k++) ag2.replay(id); });
    if (!A.World.islandUnlocked(st, 'verdant')) A.World.unlockByBoss(st, 'verdant'); const vlog = []; D.CAMPAIGN.verdant.dungeons.forEach((id) => ag2.clear(id, vlog));
    if (prof.verdantReplays) D.CAMPAIGN.verdant.dungeons.forEach((id) => { for (let k = 0; k < prof.verdantReplays; k++) ag2.replay(id); });
    const endLv = +mean(uids.map((u) => R.inst(st, u).lv)).toFixed(1); D.MAX_LEVEL = keep; return { arrive: vlog.map((l) => l.arrive), end: endLv }; });
  const arrive = rows[0].arrive.map((v, i) => +mean(rows.map((r) => r.arrive[i])).toFixed(1));
  globalCap[pk] = { verdantArrive50: arrive, verdantArrive40: results[pk].verdantArrive, slack50: arrive.map((a, i) => +(a - verdantThr[i]).toFixed(1)), slack40: results[pk].verdantArrive.map((a, i) => +(a - verdantThr[i]).toFixed(1)), endOfVerdant50: +mean(rows.map((r) => r.end)).toFixed(1) };
  console.log('global50', pk, 'verdant arrive', arrive.join(' '), '| end', globalCap[pk].endOfVerdant50, '| vs cap 40', results[pk].verdantArrive.join(' '));
});
fs.writeFileSync(path.join(OUT, 'levelcap.json'), JSON.stringify({ note: 'Sandbox only: the Obsidian dungeons, new moves, cap changes and Mastery exist only in this simulation. Automated play with a scripted tactical policy; not real gameplay, not an iPhone.',
  seeds: SEEDS, verdantThresholds: verdantThr, globalCap50OnVerdant: globalCap, bands: DES.BANDS, tier: DES.TIER, mastery: DES.MASTERY, thresholds, xpTable: xpTable(), profiles: PROFILES, results, seconds: Number((process.hrtime.bigint() - t0) / 1000000000n) }, null, 1));
console.log('done in', Number((process.hrtime.bigint() - t0) / 1000000000n), 's →', OUT);
