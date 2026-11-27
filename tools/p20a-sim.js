// Phase 20A: level-progression study for the PROPOSED Celestial Crown (design only; nothing in the game changes).
// The real rules and data (working tree, Phase 19D) are loaded into a sandbox. Realistic saves are built by playing
// Starter Island, the Verdant Wilds and Obsidian Reach with the 17C campaign agent under the REAL staged level cap
// (40 → 50 → 60). The proposed Celestial dungeons (tools/p20a-design.js) are added to THAT SANDBOX ONLY, once per
// candidate band × foe tier. Automated play with scripted policies: rule-level simulation, NOT real gameplay or an iPhone.
//   thresholds  per dungeon: lowest party level (trio, no gear, moves Lv 1, tactical) that clears first try in ≥ 8 of 16
//   campaigns   profiles below, from their own arrival saves, plus controlled arrivals at party level 47, 50, 55, 60
//   overflow    XP each Amina earns while already at 60 (what a Mastery resource would receive), island + replays
// Run: node tools/p20a-sim.js [outDir]  (default docs/audit20a)  Env: QUICK=1, SEEDS=11,22, BANDS=b49, TIERS=t140, PROFILES=a,b
process.env.P17B_LIB = '1';
const fs = require('fs'), path = require('path');
const { Game, loadAt, seeded, pct, mean } = require('./p17b-sim.js');
const DES = require('./p20a-design.js');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit20a'); fs.mkdirSync(OUT, { recursive: true });
const QUICK = !!process.env.QUICK, SEEDS = (process.env.SEEDS || (QUICK ? '11' : '11,22')).split(',').map(Number), SECS = 4.5;
const TRIO = ['lumifern', 'cannonis', 'emberix'];
const g = Game(loadAt(null), '20A'), D = g.D, R = g.R, A = g.A, W = A.World;
const pick = (env, all) => (process.env[env] ? process.env[env].split(',') : Object.keys(all));
const BAND_KEYS = pick('BANDS', DES.BANDS), TIER_KEYS = pick('TIERS', DES.TIERS);

/* ---------- the proposed island, once per band × tier (sandbox only) ---------- */
Object.keys(DES.MOVES).forEach((k) => { D.ABILITIES[k] = Object.assign({ desc: '' }, DES.MOVES[k]); });
D.ISLAND_LIVE.celestial = true;
const VARIANTS = {};
BAND_KEYS.forEach((bk) => TIER_KEYS.forEach((tk) => {
  const band = DES.BANDS[bk], tier = DES.TIERS[tk], vk = bk + '_' + tk, ids = [];
  DES.DUNGEONS.forEach((dd, i) => {
    const rec = band.rec[i], lvs = [rec - 3, rec - 3, rec - 2, rec - 2, rec - 1, rec - 1, rec, rec, rec];
    // per-dungeon tuning (as 19C/19D tuned the Quench Pools), applied only with TUNED=1 so both versions can be compared
    const tu = process.env.TUNED ? (dd.tune || {}) : {}, tb = { hp: +(tier.hp * (tu.hp || 1)).toFixed(3), atk: +(tier.atk * (tu.atk || 1)).toFixed(3) }, tg = { hp: +(tb.hp * ((tu.guardian || {}).hp || 1)).toFixed(3), atk: +(tb.atk * ((tu.guardian || {}).atk || 1)).toFixed(3) };
    const battles = dd.foes.map((line, k) => ({ sp: g.formAt(line, lvs[k]), lv: lvs[k], tier: Object.assign({}, tb), field: dd.field }));
    battles[8].move = dd.boss.move; battles[8].herald = true;
    battles.push({ sp: g.formAt(dd.boss.line, rec + 3), lv: rec + 3, boss: true, title: dd.boss.title, hpMult: dd.boss.hpMult, scale: 1.5, move: dd.boss.move, mech: dd.boss.mech, islandBoss: !!dd.boss.islandBoss, tier: tg, field: dd.field });
    const id = 'c' + vk + '_' + dd.id;
    D.DUNGEONS[id] = { id, name: dd.name, island: 'celestial', el: dd.el, playable: true, recommended: rec, theme: dd.theme, unlock: {}, battles,
      sections: [0, 1, 2].map((k) => ({ name: ['I', 'II', 'III'][k], from: k * 3, to: k * 3 + 2, first: { gold: 300 + i * 10 + k * 10, food: 58 + i * 2 + k * 2 } })).concat([{ name: 'IV', from: 9, to: 9, first: { gems: 7 } }]), // Obsidian's section rewards +15%
      first: { gold: DES.REWARDS.gold[i], food: DES.REWARDS.food[i], gems: DES.REWARDS.gems[i] }, repeat: { gold: DES.REWARDS.repeat[i], food: DES.REWARDS.repeatFood[i] }, index: i + 1, prev: i ? ids[i - 1] : 'o_forge' };
    ids.push(id);
  });
  VARIANTS[vk] = { bk, tk, ids, label: band.label + ', foe tier ×' + tier.hp + ' HP / ×' + tier.atk + ' attack' };
}));
const useVariant = (vk) => { const v = VARIANTS[vk]; D.CAMPAIGN.celestial.dungeons = v.ids; D.CAMPAIGN.celestial.islandBoss = v.ids[9]; };

/* ---------- XP earned while already at 60 (dropped today; what Mastery would receive) ---------- */
let OVERFLOW = 0; const addXp0 = R.addXp;
R.addXp = function (st, inst, amt) { if (amt > 0 && inst.lv >= R.levelCap(st) && R.levelCap(st) >= 60) OVERFLOW += amt; return addXp0.apply(this, arguments); };

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
  fedRegularly: { feed: 'half', label: 'Fed regularly (half of food), no gear, moves Lv 1, tactical' },
  completionist: { feed: 'half', moves: 4, gear: true, verdantReplays: 2, obsidianReplays: 2, label: 'Thorough completionist: two full replays of every Verdant and Obsidian dungeon, moves Lv 4, best gear' },
  upgraded: { feed: 'all', moves: 5, gear: true, starterReplays: true, label: 'Highly upgraded: all food, moves Lv 5, best gear, extra replays' },
  basicFed: { feed: 'half', pol: 'basic', label: 'Fed regularly, basic attacks only on the Celestial Crown (no guards, heals or specials)' },
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
function playIsland(save, prof, vk) {
  useVariant(vk); const ids = VARIANTS[vk].ids;
  const st = JSON.parse(JSON.stringify(save.st)), rng = seeded(save.seed * 7 + 1); R.rng = rng;
  const ag = agent(st, save.uids, prof.feed, rng, prof.pol), log = []; const s0 = ag.stats(); OVERFLOW = 0;
  ids.forEach((id) => ag.clear(id, log));
  const ovIsland = OVERFLOW; ids.forEach((id) => ag.replay(id)); const ovReplay = OVERFLOW - ovIsland; // one full replay of the island afterwards
  const s1 = ag.stats(), insts = save.uids.map((u) => R.inst(st, u));
  const at60 = log.findIndex((l) => l.arrive >= 59.99);
  return { arrive0: save.arrive, end: +mean(insts.map((a) => a.lv)).toFixed(1), log, losses: s1.losses - s0.losses, grinds: s1.grinds - s0.grinds, minutes: s1.minutes - s0.minutes, allCleared: log.every((l) => l.cleared),
    reach60At: at60 < 0 ? null : at60 + 1, overflowIsland: Math.round(ovIsland / save.uids.length), overflowReplay: Math.round(ovReplay / save.uids.length) };
}
const atLevel = (save, L) => { const st = JSON.parse(JSON.stringify(save.st)); save.uids.forEach((u) => { const a = R.inst(st, u); a.lv = L; a.xp = 0; while (R.evoCheck(st, u).ok) R.evolve(st, u); }); return Object.assign({}, save, { st, arrive: L }); };
function threshold(id) { const rec = D.DUNGEONS[id].recommended; for (let off = -8; off <= 8; off++) { let c = 0; for (let s = 0; s < 16; s++) if (g.run(id, TRIO, rec + off, 'tactical', 300 + s).cleared) c++; if (c >= 8) return rec + off; } return rec + 9; }
function styles(id) { const rec = D.DUNGEONS[id].recommended, o = {}; ['tactical', 'auto', 'basic'].forEach((pol) => { let c = 0; for (let s = 0; s < 12; s++) if (g.run(id, TRIO, rec, pol, 700 + s).cleared) c++; o[pol] = pct(c, 12); }); return o; }

/* ---------- run ---------- */
const t0 = Date.now(), out = { note: 'Design simulation of a PROPOSED island (tools/p20a-sim.js + tools/p20a-design.js) in a sandbox. Rule-level, scripted policies; not real gameplay, not an iPhone.', seeds: SEEDS, variants: {}, profiles: {}, saves: {} };
// arrival saves (real three islands) first: they do not depend on the variant
const saves = {};
const profKeys = Object.keys(PROFILES).filter((p) => !process.env.PROFILES || process.env.PROFILES.split(',').indexOf(p) >= 0);
profKeys.forEach((pk) => { saves[pk] = SEEDS.map((seed) => arrivalSave(PROFILES[pk], seed));
  const sv = saves[pk]; out.saves[pk] = { label: PROFILES[pk].label, arrive: +mean(sv.map((s) => s.arrive)).toFixed(1), cap: sv[0].cap, forge: sv.every((s) => s.forge), open: sv.every((s) => s.open), obsidianLosses: +mean(sv.map((s) => s.obsidianLosses)).toFixed(1), hoursBefore: +(mean(sv.map((s) => s.minutesBefore)) / 60).toFixed(1) };
  console.log('arrival', pk.padEnd(13), JSON.stringify(out.saves[pk])); });
Object.keys(VARIANTS).forEach((vk) => {
  useVariant(vk); const v = VARIANTS[vk], ids = v.ids, res = { label: v.label, rec: DES.BANDS[v.bk].rec };
  res.thresholds = ids.map(threshold); res.slackAtRec = ids.map((id, i) => D.DUNGEONS[id].recommended - res.thresholds[i]);
  if (!QUICK) res.styles = ids.map(styles);
  console.log('\n' + vk, v.label, '\n  thresholds', res.thresholds.join(' '), '(rec', res.rec.join(' ') + ')');
  if (res.styles) console.log('  clear at rec: tactical', res.styles.map((x) => x.tactical).join(' '), '| auto', res.styles.map((x) => x.auto).join(' '), '| basic', res.styles.map((x) => x.basic).join(' '));
  res.campaigns = {};
  profKeys.forEach((pk) => { const runs = saves[pk].filter((s) => s.open).map((s) => playIsland(s, PROFILES[pk], vk)); if (!runs.length) return; const m = (f) => +mean(runs.map(f)).toFixed(1);
    const c = { arrive: m((r) => r.arrive0), end: m((r) => r.end), losses: m((r) => r.losses), grinds: m((r) => r.grinds), minutes: Math.round(mean(runs.map((r) => r.minutes))), allCleared: runs.every((r) => r.allCleared), reach60At: runs.map((r) => r.reach60At), overflowIsland: Math.round(mean(runs.map((r) => r.overflowIsland))), overflowReplay: Math.round(mean(runs.map((r) => r.overflowReplay))),
      arrivePer: ids.map((_, i) => m((r) => r.log[i].arrive)), lossesPer: ids.map((_, i) => m((r) => r.log[i].losses)), grindsPer: ids.map((_, i) => m((r) => r.log[i].grinds)) };
    res.campaigns[pk] = c; console.log('  ' + pk.padEnd(13), 'arrive', c.arrive, 'end', c.end, 'losses', c.losses, 'grinds', c.grinds, 'min', c.minutes, 'all', c.allCleared, '60 at D', c.reach60At.join('/'), 'overflow', c.overflowIsland, '+', c.overflowReplay, '| losses/dungeon', c.lossesPer.join(' ')); });
  res.entry = {};
  if (saves.fedRegularly) [47, 50, 55, 60].forEach((L) => { const runs = saves.fedRegularly.filter((s) => s.open).map((s) => playIsland(atLevel(s, L), PROFILES.fedRegularly, vk)); const m = (f) => +mean(runs.map(f)).toFixed(1);
    const c = { level: L, end: m((r) => r.end), losses: m((r) => r.losses), grinds: m((r) => r.grinds), minutes: Math.round(mean(runs.map((r) => r.minutes))), overflowIsland: Math.round(mean(runs.map((r) => r.overflowIsland))), overflowReplay: Math.round(mean(runs.map((r) => r.overflowReplay))), lossesPer: ids.map((_, i) => m((r) => r.log[i].losses)) };
    res.entry['L' + L] = c; console.log('  enter at', L, '| end', c.end, 'losses', c.losses, 'grinds', c.grinds, 'min', c.minutes, 'overflow', c.overflowIsland, '+', c.overflowReplay, '| losses/dungeon', c.lossesPer.join(' ')); });
  out.variants[vk] = res;
});
out.xpNeed = [55, 58, 59, 60].map((l) => ({ lv: l, xp: R.xpNeed(l) }));
fs.writeFileSync(path.join(OUT, process.env.OUTNAME || 'sim.json'), JSON.stringify(out, null, 1));
console.log('\ndone in', Math.round((Date.now() - t0) / 1000), 's →', OUT);
