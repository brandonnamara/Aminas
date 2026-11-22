// Phase 18A: level progression into a second island, from realistic Starter Island completion saves.
// The game's real rules (working tree, Phase 17D) are loaded into a sandbox; the proposed Verdant Wilds dungeons from
// tools/p18a-design.js are added to THAT SANDBOX ONLY, for three candidate level bands. Nothing in the game changes.
// Run: node tools/p18a-sim.js [outDir]   (default docs/audit18a)
process.env.P17B_LIB = '1';
const fs = require('fs'), path = require('path');
const { Game, loadAt, seeded, pct, mean } = require('./p17b-sim.js');
const DES = require('./p18a-design.js');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit18a'); fs.mkdirSync(OUT, { recursive: true });
const write = (n, o) => fs.writeFileSync(path.join(OUT, n), JSON.stringify(o, null, 1));
const SECS = 4.5, SEEDS = [11, 22], TRIES = +process.env.TRIES || 10;

// a sandboxed game with the proposed island added for one band
function build(bandKey) {
  const g = Game(loadAt(null), '18A-' + bandKey), D = g.D, band = DES.BANDS[bandKey];
  D.MAX_LEVEL = band.cap;
  Object.keys(DES.MOVES).forEach((k) => { D.ABILITIES[k] = Object.assign({}, DES.MOVES[k]); });
  const form = (spId, lv) => { const s = D.SPECIES[spId], L = D.LINES[s.line]; const want = lv >= 22 ? 3 : lv >= 12 ? 2 : 1; return want > s.stage ? L.ids[want - 1] : spId; };
  const ids = [];
  DES.DUNGEONS.forEach((dd, i) => {
    const rec = band.rec[i], lvs = [rec - 3, rec - 3, rec - 2, rec - 2, rec - 1, rec - 1, rec, rec, rec];
    const battles = dd.foes.map((sp, k) => ({ sp: form(sp, lvs[k]), lv: lvs[k] }));
    battles[8].move = dd.boss.move; battles[8].herald = true; if (dd.boss.mech && dd.boss.mech.type === 'barrier') battles[8].mech = { type: 'barrier', at: [0.5], amt: dd.boss.mech.amt };
    battles.push({ sp: form(dd.boss.sp, rec + 3), lv: rec + 3, boss: true, title: dd.boss.title, hpMult: dd.boss.hpMult, scale: 1.5, move: dd.boss.move, mech: dd.boss.mech, islandBoss: !!dd.boss.islandBoss });
    D.DUNGEONS[dd.id] = { id: dd.id, name: dd.name, island: 'verdant', el: dd.el, playable: true, recommended: rec, theme: dd.theme, unlock: {}, battles,
      sections: [{ name: 'I', from: 0, to: 2, first: { gold: 300, food: 60 } }, { name: 'II', from: 3, to: 5, first: { gold: 300, food: 60 } }, { name: 'III', from: 6, to: 8, first: { gold: 300, food: 60 } }, { name: 'IV', from: 9, to: 9, first: {} }],
      first: { gold: 1500 + i * 200, food: 250, gems: 10 }, repeat: { gold: 350 + i * 30, food: 60 }, index: i + 1, prev: i ? DES.DUNGEONS[i - 1].id : null };
    ids.push(dd.id);
  });
  D.CAMPAIGN.verdant.dungeons = ids; D.CAMPAIGN.verdant.islandBoss = ids[9];
  // optional "island tier" for the second island's foes (TIER=hp,atk multipliers), a proposal tested here only
  const tier = (process.env.TIER || '').split(',').map(Number);
  if (tier.length === 2 && tier[0]) { const ef0 = g.R.enemyFromSpec; g.R.enemyFromSpec = function (spec) { const e = ef0.apply(this, arguments); if (ids.some((id) => D.DUNGEONS[id].battles.indexOf(spec) >= 0)) { e.hpMax = e.hp = Math.round(e.hp * tier[0]); e.atk = Math.round(e.atk * tier[1]); } return e; }; }
  return g;
}

// the 17C campaign agent: dungeons in order, tactical player, a full replay of the last cleared dungeon after two
// defeats in a row; feeds none / half / all of its food as Feasts; evolves whenever it can.
function agent(g, st, uids, feed, rng) {
  const D = g.D, R = g.R; let battles = 0, turns = 0, losses = 0, grinds = 0, last = null;
  const evolve = () => uids.forEach((u) => { while (R.evoCheck(st, u).ok) R.evolve(st, u); });
  const doFeed = () => { if (feed === 'none') return; let budget = feed === 'all' ? st.res.food : Math.floor(st.res.food / 2); while (budget >= D.SNACKS.feast.food) { const low = uids.map((u) => R.inst(st, u)).sort((a, b) => a.lv - b.lv)[0]; if (low.lv >= D.MAX_LEVEL) break; if (!R.feed(st, low.uid, 'feast').ok) break; budget -= D.SNACKS.feast.food; } };
  const play = (id, from) => { R.startRun(st, id, uids, { from }); let out; do { const b = R.createBattle(st, rng); const r = g.fight(b, 'tactical'); battles++; turns += r.turns; out = R.resolveBattle(st, b); } while (out.win && !out.cleared && st.run); return out; };
  const clear = (id, log) => {
    const need = (D.DUNGEONS[id].unlock || {}).rank; if (need && st.rank < need) st.rank = need; if (id === 'lanternorchard') st.flags.hollowveil = true;
    const t0 = battles, l0 = losses, g0 = grinds; let fails = 0, guard = 0, tries = 0;
    const arrive = +mean(uids.map((u) => R.inst(st, u).lv)).toFixed(1);
    while (!R.dungeonCleared(st, id) && guard++ < 300) { tries++; const out = play(id); if (!out.win) { losses++; fails++; } evolve(); doFeed(); evolve(); if (fails >= 2 && last) { play(last, 0); grinds++; evolve(); doFeed(); evolve(); fails = 0; } }
    last = id; if (log) log.push({ id, rec: D.DUNGEONS[id].recommended, arrive, ready: +(arrive - D.DUNGEONS[id].recommended).toFixed(1), tries, losses: losses - l0, grinds: grinds - g0, battles: battles - t0 });
  };
  return { clear, stats: () => ({ battles, minutes: Math.round(turns * SECS / 60), losses, grinds }) };
}
// realistic end-of-Starter-Island save for a profile
const PROFILES = {
  rarelyFed: { feed: 'none', label: 'Rarely fed, balanced trio' },
  fedRegularly: { feed: 'half', label: 'Fed regularly (half of food), balanced trio' },
  fedAll: { feed: 'all', label: 'Fed with all food, balanced trio' },
  prepared: { feed: 'half', moves: 4, gear: true, label: 'Fed regularly + moves at Lv 4 + best gear worn' },
  challenger: { feed: 'half', moves: 5, gear: true, replays: true, label: 'Prepared + every Starter challenge done (moves Lv 5, extra replays)' },
};
function starterSave(g, prof, seed) {
  const A = g.A, D = g.D, R = g.R, rng = seeded(seed); R.rng = rng;
  const st = A.State.newGame(); st.phase = 'play'; st.introDone = true; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = st.flags.r2 = true;
  const uids = ['lumifern', 'cannonis', 'emberix'].map((sp) => R.addAmina(st, sp, 3).uid);
  const ag = agent(g, st, uids, prof.feed, rng);
  D.CAMPAIGN.starter.dungeons.forEach((id) => ag.clear(id));
  // Starter challenges: three extra full replays of each late dungeon (Flawless needs a stronger party)
  if (prof.replays) ['windstair', 'resonancescar', 'heartwood'].forEach((id) => { for (let k = 0; k < 3; k++) { R.startRun(st, id, uids, { from: 0 }); let o; do { const b = R.createBattle(st, rng); g.fight(b, 'tactical'); o = R.resolveBattle(st, b); } while (o.win && !o.cleared && st.run); } });
  if (prof.moves) uids.forEach((u) => { const a = R.inst(st, u); R.moveSlots(a); a.mv = a.mv.map(() => prof.moves); });
  if (prof.gear) { const slots = {}; (st.items || []).slice().sort((x, y) => { const sx = D.ITEMS[x.id].stats || {}, sy = D.ITEMS[y.id].stats || {}; return Object.values(sy).reduce((a, b) => a + b, 0) - Object.values(sx).reduce((a, b) => a + b, 0); }).forEach((it) => { const sl = D.ITEMS[it.id].slot; slots[sl] = slots[sl] || []; slots[sl].push(it.iid); }); uids.forEach((u, i) => Object.keys(slots).forEach((sl) => { if (slots[sl][i] != null) R.equip(st, u, slots[sl][i]); })); }
  return { st, uids, end: +mean(uids.map((u) => R.inst(st, u).lv)).toFixed(1), ag, stats0: ag.stats() };
}
// first-try chance at a dungeon from the save as it stands (copies of the save, fresh seeds)
function firstTry(g, st, uids, id) {
  const R = g.R; let c = 0;
  for (let s = 0; s < TRIES; s++) { const cp = JSON.parse(JSON.stringify(st)); R.rng = seeded(900 + s); R.startRun(cp, id, uids, { from: 0 }); let o; do { const b = R.createBattle(cp, R.rng); g.fight(b, 'tactical'); o = R.resolveBattle(cp, b); } while (o.win && !o.cleared && cp.run); if (o.cleared) c++; }
  return pct(c, TRIES);
}

// the lowest party level (balanced trio, no gear, moves Lv 1, tactical) that clears a dungeon first try at least half
// the time: how much slack a profile has is its arrival level minus this
function threshold(g, id) {
  const rec = g.D.DUNGEONS[id].recommended;
  for (let off = -8; off <= 3; off++) { let c = 0; for (let s = 0; s < 20; s++) if (g.run(id, ['lumifern', 'cannonis', 'emberix'], rec + off, 'tactical', 300 + s).cleared) c++; if (c >= 10) return rec + off; }
  return rec + 4;
}
const results = {}, thresholds = {}, ONLY = (process.env.BANDS || 'A,B,C').split(','), ONLYP = process.env.PROFILES ? process.env.PROFILES.split(',') : null;
Object.keys(DES.BANDS).filter((b) => ONLY.indexOf(b) >= 0).forEach((bk) => {
  const g = build(bk); results[bk] = {}; thresholds[bk] = g.D.CAMPAIGN.verdant.dungeons.map((id) => threshold(g, id));
  if (bk === 'A') thresholds.starter = g.D.CAMPAIGN.starter.dungeons.map((id) => threshold(g, id));
  console.log(bk, 'thresholds', thresholds[bk].join(' '), bk === 'A' ? '| starter ' + thresholds.starter.join(' ') : '');
  Object.keys(PROFILES).filter((p) => !ONLYP || ONLYP.indexOf(p) >= 0).forEach((pk) => {
    const prof = PROFILES[pk], runs = [];
    SEEDS.forEach((seed) => {
      const sv = starterSave(g, prof, seed), log = [], ft = [];
      g.D.CAMPAIGN.verdant.dungeons.forEach((id) => { ft.push(firstTry(g, sv.st, sv.uids, id)); sv.ag.clear(id, log); });
      const s1 = sv.ag.stats(), capAt = log.findIndex((l) => l.arrive >= g.D.MAX_LEVEL);
      const slack = log.map((l, i) => +(l.arrive - thresholds[bk][i]).toFixed(1));
      runs.push({ slack, starterEnd: sv.end, end: +mean(sv.uids.map((u) => g.R.inst(sv.st, u).lv)).toFixed(1), battles: s1.battles - sv.stats0.battles, minutes: s1.minutes - sv.stats0.minutes, losses: s1.losses - sv.stats0.losses, grinds: s1.grinds - sv.stats0.grinds, capAtDungeon: capAt >= 0 ? capAt + 1 : null, firstTry: ft, log });
    });
    const r = { label: prof.label, starterEnd: +mean(runs.map((x) => x.starterEnd)).toFixed(1), end: +mean(runs.map((x) => x.end)).toFixed(1), losses: +mean(runs.map((x) => x.losses)).toFixed(1), grinds: +mean(runs.map((x) => x.grinds)).toFixed(1), minutes: Math.round(mean(runs.map((x) => x.minutes))),
      firstTry: runs[0].firstTry.map((v, i) => +mean(runs.map((x) => x.firstTry[i])).toFixed(0)), ready: runs[0].log.map((l, i) => +mean(runs.map((x) => x.log[i].ready)).toFixed(1)), slack: runs[0].slack.map((v, i) => +mean(runs.map((x) => x.slack[i])).toFixed(1)), capAt: runs.map((x) => x.capAtDungeon) };
    results[bk][pk] = r;
    console.log(bk, pk.padEnd(13), 'start', r.starterEnd, 'end', r.end, 'losses', r.losses, 'grinds', r.grinds, 'min', r.minutes, 'cap@', JSON.stringify(r.capAt), 'first-try', r.firstTry.join(' '), '| ready', r.ready.join(' '), '| slack', r.slack.join(' '));
  });
});
write(process.env.OUTNAME || 'progression.json', { tier: process.env.TIER || null, thresholds, bands: DES.BANDS, profiles: PROFILES, seeds: SEEDS, triesPerFirstTry: TRIES, results, note: 'Sandbox only: the proposed dungeons and any level cap change exist only inside the simulator.' });
console.log('→', OUT);
