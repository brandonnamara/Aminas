// Phase 13D: a model of the current economy, computed from the game's own data and rule functions (nothing here is
// used by the game). Run: node tools/economy-model.js [--json]
// Every figure comes from src/ (data tables and rules); where player behaviour has to be assumed it is listed under
// "assumptions" in the output. This script changes nothing.
const { load } = require('../tests/harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, W = A.World, S = A.State;
const sum = (a) => a.reduce((x, y) => x + y, 0), r1 = (n) => Math.round(n * 10) / 10, r0 = Math.round;
const out = {};

/* ---------- 1. one Amina ---------- */
const xpTo = (a, b) => { let n = 0; for (let l = a; l < b; l++) n += R.xpNeed(l); return n; };
const feast = D.SNACKS.feast, snack = D.SNACKS.snack;
const foodFor = (xp) => Math.ceil(xp / feast.xp) * feast.food;
out.levels = [[1, 12], [12, 22], [22, 30], [1, 30]].map(([a, b]) => ({ from: a, to: b, xp: xpTo(a, b), feasts: Math.ceil(xpTo(a, b) / feast.xp), food: foodFor(xpTo(a, b)) }));
out.feed = { snack: { food: snack.food, xp: snack.xp, xpPerFood: r1(snack.xp / snack.food) }, feast: { food: feast.food, xp: feast.xp, xpPerFood: r1(feast.xp / feast.food) } };
out.evolution = Object.keys(D.EVO_REQ).map((k) => ({ stage: +k, lv: D.EVO_REQ[k].lv, cost: D.EVO_REQ[k].cost }));
out.moves = { perUpgrade: D.MOVE_LEVELS.cost.slice(2), perMove: sum(D.MOVE_LEVELS.cost), perAmina: 2 * sum(D.MOVE_LEVELS.cost), power: D.MOVE_LEVELS.power.slice(1) };
out.breeding = { cost: D.BREED_COST, minLevel: D.BREED_MIN_LEVEL, eggSeconds: D.EGG_SECONDS, hatchery: D.BUILDINGS.hatchery.levels.map((l, i) => ({ lv: i + 1, gold: l.cost.gold, slots: l.slots, eggTime: l.eggTime })) };
out.oneAminaTotal = { food: out.levels[3].food + sum(out.evolution.map((e) => e.cost.food)), gold: sum(out.evolution.map((e) => e.cost.gold)), essence: out.moves.perAmina };

/* ---------- 2. equipment ---------- */
const fam = (id) => D.ITEMS[id].family, rec = (id) => D.FORGE.recipes.find((r) => r.item === id), shop = (id) => D.FORGE.shop.find((r) => r.item === id);
// cheapest gold route to one item of a given tier in a family: craft or buy the lowest available tier, merge up
function tierCost(family, tier) {
  const ids = D.GEAR_FAMILIES[family].tiers; let best = null;
  for (let t = 1; t <= tier; t++) { const id = ids[t - 1]; if (!id) continue; const n = Math.pow(2, tier - t);
    let merges = 0; for (let u = t + 1; u <= tier; u++) merges += Math.pow(2, tier - u) * D.FORGE.merge[u].gold;
    [['craft', rec(id) && rec(id).cost], ['shop', shop(id) && { gold: shop(id).price }]].forEach(([how, c]) => { if (!c) return; const tot = { how, from: id, items: n, gold: n * (c.gold || 0) + merges, food: n * (c.food || 0), gems: n * (c.gems || 0), merges }; if (!best || tot.gold + tot.gems * 100 < best.gold + best.gems * 100) best = tot; }); }
  return best;
}
out.gear = { slots: D.GEAR_SLOTS, tiers: Object.keys(D.GEAR_TIERS).map((t) => ({ tier: +t, label: D.GEAR_TIERS[t].label })), merge: D.FORGE.merge, recipes: D.FORGE.recipes.length, shop: D.FORGE.shop.length, families: Object.keys(D.GEAR_FAMILIES).length, items: Object.keys(D.ITEMS).length,
  bonusRange: [1, 2, 3, 4].map((t) => { const b = Object.values(D.ITEMS).filter((i) => i.tier === t && !i.unique).map((i) => sum(Object.values(i.bonus))); return { tier: t, min: r1(Math.min(...b) * 100), max: r1(Math.max(...b) * 100) }; }),
  routes: ['club', 'vest', 'sun'].map((f) => ({ family: f, slot: D.GEAR_FAMILIES[f].slot, t1: tierCost(f, 1), t2: tierCost(f, 2), t3: tierCost(f, 3), t4: tierCost(f, 4) })),
  forge: D.BUILDINGS.forge.levels.map((l, i) => ({ lv: i + 1, gold: l.cost.gold })) };
out.gear.fullSetT4 = ['club', 'vest', 'sun'].map((f) => tierCost(f, 4)).reduce((o, c) => ({ gold: o.gold + c.gold, food: o.food + c.food, gems: o.gems + c.gems, items: o.items + c.items }), { gold: 0, food: 0, gems: 0, items: 0 });
out.gear.fullSetT1 = ['club', 'vest', 'sun'].map((f) => tierCost(f, 1)).reduce((o, c) => ({ gold: o.gold + c.gold, food: o.food + c.food, gems: o.gems + c.gems }), { gold: 0, food: 0, gems: 0 });

/* ---------- 3. battles ---------- */
const battleXp = (lv, boss) => Math.round((20 + lv * 6) * (boss ? 1.5 : 1));
out.dungeons = D.DUNGEON_ORDER.map((id) => { const d = D.DUNGEONS[id], bs = d.battles;
  const gold = sum(bs.map((b) => 10 + b.lv * 3 + (b.boss ? 20 : 0))), food = sum(bs.map((b) => 4 + (b.boss ? 6 : 0))), xp = sum(bs.map((b) => battleXp(b.lv, b.boss)));
  const ess = {}; bs.forEach((b) => { const el = D.SPECIES[b.sp].el; ess[el] = (ess[el] || 0) + D.ESS_SOURCES.battle(b.lv, !!b.boss); });
  const first = d.clearReward || d.first || {}, rep = d.clearReward || d.repeat || {}, sec = d.sections.reduce((o, s) => { Object.keys(s.first || {}).forEach((k) => (o[k] = (o[k] || 0) + s.first[k])); return o; }, {});
  return { id, name: d.name, lv: [bs[0].lv, bs[bs.length - 1].lv], battles: bs.length, battleGold: gold, battleFood: food, xpEach: xp, essence: ess, essTotal: sum(Object.values(ess)), firstClear: first, sectionFirsts: sec, repeatClear: rep, gear: D.DUNGEON_GEAR[id] }; });
out.firstClearTotals = out.dungeons.reduce((o, d) => { [d.firstClear, d.sectionFirsts].forEach((r) => Object.keys(r).forEach((k) => (o[k] = (o[k] || 0) + r[k]))); o.gold += d.battleGold; o.food += d.battleFood; return o; }, { gold: 0, food: 0, gems: 0 });
out.survival = { perWave: D.SURVIVAL.perWave, milestones: D.SURVIVAL.milestones, gear: D.SURVIVAL_GEAR, toWave: [5, 10, 15, 20].map((w) => ({ wave: w, gold: sum(Array.from({ length: w }, (_, i) => D.SURVIVAL.perWave.gold * (i + 1))), food: sum(Array.from({ length: w }, (_, i) => D.SURVIVAL.perWave.food * (i + 1))), essence: w - Math.floor(w / 5) + 3 * Math.floor(w / 5) })) };
out.ruins = D.RUIN_ORDER.map((id) => { const r = D.RUINS[id]; return { id, name: r.name, cooldownMin: r.cooldownMin, gold: (r.loot.gold[0] + r.loot.gold[1]) / 2, food: (r.loot.food[0] + r.loot.food[1]) / 2, gems: r.gemChance, essence: (D.ESS_SOURCES.ruinAmt[0] + D.ESS_SOURCES.ruinAmt[1]) / 2, charm: D.RUIN_CHARM_CHANCE }; });
const tiers = D.PVP.raid.tiers, tw = sum(tiers.map((t) => t.w)), avgMult = sum(tiers.map((t) => t.w * (t.mult[0] + t.mult[1]) / 2)) / tw;
out.pvp = { dailyRewardedWins: D.PVP.practiceDailyRewards, practice: D.PVP.practiceReward, raidBase: D.PVP.raid.base, raidAvgMult: r1(avgMult * 100) / 100, raidAvg: { gold: r0(D.PVP.raid.base.gold * avgMult), food: r0(D.PVP.raid.base.food * avgMult) }, raidRange: { gold: [r0(D.PVP.raid.base.gold * 0.6), r0(D.PVP.raid.base.gold * 2)] }, dailyMax: { gold: r0(D.PVP.raid.base.gold * avgMult * 5), food: r0(D.PVP.raid.base.food * avgMult * 5) } };
out.quests = { count: D.QUESTS.length, total: D.QUESTS.reduce((o, q) => { Object.keys(q.reward || {}).forEach((k) => (o[k] = (o[k] || 0) + q.reward[k])); return o; }, {}) };

/* ---------- 4. production (measured with the game's own production functions) ---------- */
function world(spec) {
  const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern'; W.validate(st); st.rank = spec.rank || 1; let t0 = 1700000000000;
  const set = (id, lv) => { const b = st.buildings[id]; if (!b) return null; b.level = lv; b.state = 'built'; st.struct[id] = true; b.last = t0; b.stock = 0; return b; };
  Object.keys(spec.story || {}).forEach((k) => set(k, spec.story[k]));
  let n = 0; const place = (type, lv) => { const id = type + '_m' + (++n); st.buildings[id] = { id, type, level: lv, state: 'built', island: 'starter', x: 0, y: 0, rot: 0, residents: [], last: t0, stock: 0 }; return st.buildings[id]; };
  (spec.farms || []).forEach((lv) => place('farm', lv)); (spec.mines || []).forEach((lv) => place('mine', lv));
  const team = []; (spec.team || []).forEach((lv, i) => team.push(R.addAmina(st, ['lumifern', 'pyrokai', 'kairyu'][i % 3], lv)));
  const res = (b, lvs) => lvs.forEach((lv) => { const a = R.addAmina(st, D.ROSTER.find((s) => s.stage === 1 && (W.def(b).affinity || [W.def(b).el]).indexOf(s.el) >= 0 || false) ? D.ROSTER.find((s) => s.stage === 1 && (W.def(b).affinity || [W.def(b).el]).indexOf(s.el) >= 0).id : 'lumifern', lv); b.residents = (b.residents || []).concat([a.uid]); });
  (spec.habs || []).forEach((h) => res(place('hab_' + h.el, h.lv), h.res));
  ['hollow', 'tidegate', 'moonshrine'].forEach((k) => { if (spec.storyRes && spec.storyRes[k] && st.buildings[k].level >= 1) res(st.buildings[k], spec.storyRes[k]); });
  R.drain();
  // production per minute and what one collection holds when left to fill
  const per = { gold: 0, food: 0, gems: 0 }, cap = { gold: 0, food: 0, gems: 0 }, capMin = [];
  Object.values(st.buildings).forEach((b) => { const d = W.def(b); if (!d || !d.produces || b.level < 1) return; const k = W.prodKind(b); if (per[k] == null) return; per[k] += W.perMin(st, b); cap[k] += W.capOf(st, b); capMin.push(W.levelData(b).capMin); });
  // collections per day: each fills for (24h / visits), capped per building
  const daily = (visits) => { const o = { gold: 0, food: 0, gems: 0 }, gap = 24 * 60 / visits; Object.values(st.buildings).forEach((b) => { const d = W.def(b); if (!d || !d.produces || b.level < 1) return; const k = W.prodKind(b); if (o[k] == null) return; o[k] += visits * Math.min(W.capOf(st, b), W.perMin(st, b) * gap); }); return { gold: r0(o.gold), food: r0(o.food), gems: r1(o.gems) }; };
  // one habitat switched from gold to its element's essence (an existing option): what it makes per day
  const hab = Object.values(st.buildings).find((b) => W.def(b) && W.def(b).cat === 'habitat'); let essHab = null;
  if (hab) { const keep = hab.prod; hab.prod = 'ess_' + W.def(hab).el; const pm = W.perMin(st, hab), cp = W.capOf(st, hab); essHab = (visits) => r0(visits * Math.min(cp, pm * 24 * 60 / visits)); essHab.perMin = r1(pm); essHab.goldPerMin = 0; hab.prod = keep; essHab.goldPerMin = r1(W.perMin(st, hab)); }
  // cross-check with the game's own clock-driven production: let every building fill for 30 minutes, then count
  const t1 = t0 + 30 * 60000, chk = { gold: 0, food: 0, gems: 0 }; W.tickProduction(st, t1); Object.values(st.buildings).forEach((b) => { const d = W.def(b); if (d && d.produces && chk[W.prodKind(b)] != null) chk[W.prodKind(b)] += b.stock || 0; });
  return { st, perMin: { gold: r1(per.gold), food: r1(per.food), gems: r1(per.gems * 100) / 100 }, fullCollection: { gold: r0(cap.gold), food: r0(cap.food), gems: r1(cap.gems) }, daily, mult: W.dungeonRewardMult(st), essHab, check30: { gold: r0(chk.gold), food: r0(chk.food), gems: r1(chk.gems) } };
}
const STAGES = {
  new: { label: 'New player (first days, Rank 1–3)', rank: 2, story: { hollow: 1, tidegate: 1 }, storyRes: { hollow: [4], tidegate: [4] }, farms: [1], mines: [1], team: [4, 4, 3], dungeon: 'forgottenroad', survivalWave: 0, ruins: ['toll'] },
  mid: { label: 'Mid-game (Rank 6–8, half the dungeons cleared)', rank: 7, story: { hollow: 2, tidegate: 2, moonshrine: 1, hatchery: 2, reliquarygate: 2, forge: 1 }, storyRes: { hollow: [12, 10], tidegate: [12], moonshrine: [10] }, farms: [2, 2], mines: [2, 2], habs: [{ el: 'nature', lv: 2, res: [10, 10] }, { el: 'water', lv: 2, res: [10, 10] }], team: [12, 12, 11], dungeon: 'coldkiln', survivalWave: 8, ruins: ['toll', 'tower', 'cellar'] },
  adv: { label: 'Advanced (Rank 10+, every dungeon cleared)', rank: 12, story: { hollow: 4, tidegate: 4, moonshrine: 3, hatchery: 4, reliquarygate: 4, forge: 3 }, storyRes: { hollow: [24, 22, 22], tidegate: [24, 22], moonshrine: [22, 22] }, farms: [4, 4, 4, 4], mines: [4, 4, 4], habs: ['nature', 'water', 'fire', 'light'].map((el) => ({ el, lv: 4, res: [22, 22, 22] })), team: [24, 24, 23], dungeon: 'heartwood', survivalWave: 15, ruins: ['toll', 'tower', 'cellar'] },
};
const PLAY = {
  casual: { label: 'Casual (two short visits a day)', visits: 2, runs: 1, pvpWins: 2, ruinSearches: 2, survivalRuns: 0 },
  intensive: { label: 'Intensive (six visits, long sessions)', visits: 6, runs: 4, pvpWins: 5, ruinSearches: 8, survivalRuns: 1 },
};
out.assumptions = [
  'Every battle that is fought is won (dungeon runs complete all 10 battles; raids and practice are wins).',
  'Production is collected at evenly spaced visits; each building stops filling at its storage limit, as in the game.',
  'A dungeon run is a repeat run of the dungeon named for the stage (first-clear rewards are one-off and are listed separately).',
  'Raid loot uses the average of the four guard tiers weighted by how often each is offered (×' + out.pvp.raidAvgMult + ').',
  'Ruin searches are spread across the unlocked ruins and limited by their cooldowns.',
  'Survival: a run ends at the wave named for the stage (new: none, mid: 8, advanced: 15). How far a player gets depends on skill.',
  'The building sets for each stage are examples of a typical island at that point, not measured from players.',
  'Timers are at the normal setting.',
];
out.scenarios = [];
Object.keys(STAGES).forEach((sk) => { const sp = STAGES[sk], w = world(sp), dn = out.dungeons.find((d) => d.id === sp.dungeon);
  Object.keys(PLAY).forEach((pk) => { const pl = PLAY[pk], prod = w.daily(pl.visits);
    const rep = dn.repeatClear, runG = dn.battleGold + r0((rep.gold || 0) * w.mult), runF = dn.battleFood + r0((rep.food || 0) * w.mult), runGems = r0((rep.gems || 0) * w.mult);
    const sv = pl.survivalRuns && sp.survivalWave ? { gold: sum(Array.from({ length: sp.survivalWave }, (_, i) => 12 * (i + 1))), food: sum(Array.from({ length: sp.survivalWave }, (_, i) => 3 * (i + 1))), ess: sp.survivalWave + 2 * Math.floor(sp.survivalWave / 5) } : { gold: 0, food: 0, ess: 0 };
    const ruinList = sp.ruins.map((id) => out.ruins.find((r) => r.id === id)), nSearch = Math.min(pl.ruinSearches, sum(ruinList.map((r) => Math.floor(pl.visits * 1)))), per = ruinList.length ? nSearch / ruinList.length : 0;
    const ru = { gold: r0(sum(ruinList.map((r) => r.gold * per))), food: r0(sum(ruinList.map((r) => r.food * per))), gems: r1(sum(ruinList.map((r) => r.gems * per))), ess: r0(sum(ruinList.map((r) => r.essence * per))) };
    const pv = { gold: out.pvp.raidAvg.gold * pl.pvpWins, food: out.pvp.raidAvg.food * pl.pvpWins };
    const gold = prod.gold + runG * pl.runs + sv.gold * pl.survivalRuns + ru.gold + pv.gold, food = prod.food + runF * pl.runs + sv.food * pl.survivalRuns + ru.food + pv.food, gems = r1(prod.gems + runGems * pl.runs + ru.gems);
    const essence = dn.essTotal * pl.runs + sv.ess * pl.survivalRuns + ru.ess, xpEach = dn.xpEach * pl.runs; // survival XP left out (depends on wave levels)
    // time to develop one newly hatched Amina
    const need = out.oneAminaTotal, foodDays = need.food / food, essMain = Math.max(...Object.values(dn.essence)), essDays = need.essence / Math.max(1, essMain * pl.runs + (sv.ess + ru.ess) / 9);
    out.scenarios.push({ stage: sk, play: pk, perMin: w.perMin, check30: w.check30, fullCollection: w.fullCollection, essenceHabitat: w.essHab ? { perDay: w.essHab(pl.visits), perMin: w.essHab.perMin, goldGivenUpPerMin: w.essHab.goldPerMin } : null, stageLabel: sp.label, playLabel: pl.label, production: prod, perRun: { gold: runG, food: runF, gems: runGems, xpEach: dn.xpEach, essence: dn.essTotal, dungeon: dn.name }, sources: { production: prod, dungeon: { gold: runG * pl.runs, food: runF * pl.runs }, survival: { gold: sv.gold * pl.survivalRuns, food: sv.food * pl.survivalRuns }, ruins: ru, pvp: pv }, daily: { gold: r0(gold), food: r0(food), gems, essence, battleXpEach: xpEach },
      days: { foodToMaxOne: r1(foodDays), feedsToMaxPerDay: r1(food / need.food), essenceOneAminaMoves: r1(essDays), t4Set: r1(out.gear.fullSetT4.gold / gold), hatcheryNext: null }, productionShare: r0(100 * prod.gold / gold), foodSurplusAfterOneAminaPerDay: r0(food - need.food / Math.max(1, foodDays)) });
  });
});
/* ---------- 5. sinks: what there is to spend on ---------- */
const lvCosts = (id) => D.BUILDINGS[id].levels.map((l) => l.cost.gold || 0);
out.sinks = { buildings: { story: sum(D.STORY_BUILDINGS.map((id) => sum(lvCosts(id)))), farmsAll: 4 * sum(lvCosts('farm')), minesAll: 3 * sum(lvCosts('mine')), oneHabitatMax: sum(lvCosts('hab_nature')), hatcheryAll: sum(lvCosts('hatchery')), forgeAll: sum(lvCosts('forge')) },
  perAmina: out.oneAminaTotal, gearT4Set: out.gear.fullSetT4, breedingEach: D.BREED_COST, gems: { finishTimersPerMin: D.FINISH_GEMS_PER_MIN, craftingMaxPerItem: Math.max(...D.FORGE.recipes.map((r) => r.cost.gems || 0)) } };
out.sinks.buildings.total = out.sinks.buildings.story + out.sinks.buildings.farmsAll + out.sinks.buildings.minesAll;
out.sinks.rosterAll = { aminas: 21, food: 21 * out.oneAminaTotal.food, gold: 21 * out.oneAminaTotal.gold, essence: 21 * out.oneAminaTotal.essence };

if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
const t = (rows) => rows.map((r) => '| ' + r.join(' | ') + ' |').join('\n'), f = (n) => Math.round(n).toLocaleString('en-GB');
console.log('ONE AMINA\n' + t(out.levels.map((l) => ['Lv ' + l.from + ' → ' + l.to, f(l.xp) + ' XP', l.feasts + ' feasts', f(l.food) + ' food'])));
console.log('total per Amina:', JSON.stringify(out.oneAminaTotal));
console.log('\nGEAR routes\n' + t(out.gear.routes.map((r) => [r.family, r.slot, 'T1 ' + JSON.stringify(r.t1), 'T4 ' + JSON.stringify(r.t4)])), '\nfull T1 set', JSON.stringify(out.gear.fullSetT1), 'full T4 set', JSON.stringify(out.gear.fullSetT4), 'bonus', JSON.stringify(out.gear.bonusRange));
console.log('\nDUNGEONS\n' + t(out.dungeons.map((d) => [d.name, 'Lv ' + d.lv.join('–'), f(d.battleGold) + 'g ' + d.battleFood + 'f', d.xpEach + ' XP each', d.essTotal + ' ess ' + JSON.stringify(d.essence), 'first ' + JSON.stringify(d.firstClear) + '+' + JSON.stringify(d.sectionFirsts), 'repeat ' + JSON.stringify(d.repeatClear)])));
console.log('first clears in total:', JSON.stringify(out.firstClearTotals), ' quests:', JSON.stringify(out.quests));
console.log('\nSURVIVAL', JSON.stringify(out.survival.toWave), '\nRUINS', JSON.stringify(out.ruins), '\nPVP', JSON.stringify(out.pvp));
console.log('\nSCENARIOS\n' + t(out.scenarios.map((s) => [s.stage + '/' + s.play, 'gold ' + f(s.daily.gold) + ' (' + s.productionShare + '% production)', 'food ' + f(s.daily.food), 'gems ' + s.daily.gems, 'ess ' + s.daily.essence, 'XP each ' + f(s.daily.battleXpEach), 'max Aminas/day by food ' + s.days.feedsToMaxPerDay, 'days ess 350: ' + s.days.essenceOneAminaMoves, 'days T4 set: ' + s.days.t4Set, 'perMin ' + JSON.stringify(s.perMin) + ' 30min-check ' + JSON.stringify(s.check30), 'essence habitat/day ' + (s.essenceHabitat ? s.essenceHabitat.perDay : '-')])));
console.log('\nSINKS', JSON.stringify(out.sinks));
