// Phase 13D: the economy model (tools/economy-model.js) against the game. The model is analysis only; this checks
// that its figures are what the rules really do, so the report's numbers can be trusted, and that nothing in the
// economy was changed in Phase 13. Run: node tests/economy13d.test.js
const { execFileSync } = require('child_process'); const path = require('path');
const { load, seeded, ok, done } = require('./harness');
const M = JSON.parse(execFileSync('node', [path.join(__dirname, '..', 'tools', 'economy-model.js'), '--json'], { maxBuffer: 1 << 26 }).toString());
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, F = R.Forge; R.rng = seeded(134);
const mk = () => { const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern'; W.validate(st); return st; };

/* ---- the values are what they were (no balance change in Phase 13) ---- */
ok(D.SNACKS.snack.food === 3 && D.SNACKS.snack.xp === 18 && D.SNACKS.feast.food === 10 && D.SNACKS.feast.xp === 70 && D.MAX_LEVEL === 30 && R.xpNeed(1) === 25 && R.xpNeed(10) === 216 && R.xpNeed(29) === 1257, 'feeding and the XP table are unchanged');
ok(JSON.stringify(D.EVO_REQ) === JSON.stringify({ 2: { lv: 12, cost: { gold: 60, food: 15 } }, 3: { lv: 22, cost: { gold: 160, food: 40 } } }) && D.MOVE_LEVELS.cost.join() === '0,0,10,25,50,90', 'evolution requirements and move-upgrade costs are unchanged');
ok(JSON.stringify(D.BREED_COST) === '{"gold":40,"food":25}' && D.BREED_MIN_LEVEL === 5 && D.BUILDINGS.hatchery.levels.map((l) => l.slots).join() === '1,2,3,4,5', 'breeding cost and the Hatchery’s slots (one more per level) are unchanged');
ok(D.PVP.practiceDailyRewards === 5 && JSON.stringify(D.PVP.practiceReward) === '{"gold":60,"food":10}' && JSON.stringify(D.PVP.raid.base) === '{"gold":60,"food":10}' && D.SURVIVAL.perWave.gold === 12 && D.SURVIVAL.perWave.food === 3, 'the five shared daily rewarded wins, raid and practice rewards and survival pay are unchanged');

/* ---- one Amina: the model equals really feeding it ---- */
let st = mk(), a = R.addAmina(st, 'lumifern', 1); st.res.food = 1e6; st.res.gold = 1e6; R.drain();
const spent = {}; let food0 = st.res.food, evos = 0;
[12, 22, 30].forEach((lv) => { while (a.lv < lv) R.feed(st, a.uid, 'feast'); spent[lv] = food0 - st.res.food; });
ok(Math.abs(spent[12] - M.levels[0].food) <= 10 && Math.abs(spent[22] - M.levels[0].food - M.levels[1].food) <= 10 && Math.abs(spent[30] - M.levels[3].food) <= 10 && M.levels[3].xp === 14198, 'feeding an Amina from Lv 1 costs what the model says: ' + spent[12] + ' food to Lv 12, ' + spent[22] + ' to Lv 22, ' + spent[30] + ' to Lv 30 (model: ' + M.levels[0].food + ', ' + (M.levels[0].food + M.levels[1].food) + ', ' + M.levels[3].food + ')');
st = mk(); a = R.addAmina(st, 'lumifern', 22); st.res.gold = 1000; st.res.food = 1000; a.sp = 'lumifern'; a.lv = 12; let g0 = st.res.gold, f0 = st.res.food; R.evolve(st, a.uid); a.lv = 22; R.evolve(st, a.uid); R.drain();
ok(D.SPECIES[a.sp].stage === 3 && g0 - st.res.gold === M.oneAminaTotal.gold && f0 - st.res.food === M.oneAminaTotal.food - M.levels[3].food, 'both evolutions cost the model’s 220 gold and 55 food');
st = mk(); a = R.addAmina(st, 'lumifern', 5); Object.keys(D.ELEMENTS).forEach((k) => { st.essence = st.essence || {}; st.essence[k] = 1000; });
const e0 = Object.values(st.essence).reduce((x, y) => x + y, 0); let ups = 0; for (let i = 0; i < 2; i++) for (let k = 0; k < 6; k++) { const r = R.upgradeMove(st, a.uid, i); if (r && r.ok) ups++; }
ok(ups === 8 && e0 - Object.values(st.essence).reduce((x, y) => x + y, 0) === M.moves.perAmina && M.moves.perAmina === 350, 'fully upgrading both moves takes eight upgrades and the model’s 350 essence');

/* ---- equipment: the model's cheapest route equals really crafting and merging ---- */
st = mk(); st.struct.forge = true; st.buildings.forge.level = 3; st.buildings.forge.state = 'built'; st.res.gold = 1e5; g0 = st.res.gold;
for (let i = 0; i < 8; i++) F.craft(st, 'driftclub', F.newOp('t')); let n = 0; while (R.Gear.mergeable(st).length && n++ < 20) { const x = R.Gear.mergeable(st)[0]; F.merge(st, x.a, x.b, F.newOp('t')); }
ok(st.items.length === 1 && D.ITEMS[st.items[0].id].tier === 4 && g0 - st.res.gold === M.gear.routes[0].t4.gold, 'a top-tier weapon by crafting and merging costs the model’s ' + M.gear.routes[0].t4.gold.toLocaleString('en-GB') + ' gold');

/* ---- battles ---- */
const dn = M.dungeons[0], d = D.DUNGEONS[D.DUNGEON_ORDER[0]];
ok(dn.battles === d.battles.length && dn.battleGold === d.battles.reduce((s, b) => s + 10 + b.lv * 3 + (b.boss ? 20 : 0), 0) && M.dungeons.length === D.DUNGEON_ORDER.length, 'the model covers all ' + M.dungeons.length + ' dungeons with the game’s battle tables');
// a real run of the first dungeon pays what the model says per run (battle rewards)
st = mk(); const team = ['lumifern', 'pyrokai', 'kairyu'].map((sp) => R.addAmina(st, sp, 30).uid); st.struct.hollow = true; R.drain(); g0 = st.res.gold; f0 = st.res.food; let won = 0;
R.startRun(st, D.DUNGEON_ORDER[0], team);
for (let i = 0; i < d.battles.length && st.run; i++) { const b = R.createBattle(st, seeded(i + 1)); b.result = 'win'; b.over = true; const out = R.finishBattle ? R.finishBattle(st, b) : R.resolveBattle(st, b); if (out && out.win) won++; }
const rec = R.dungeonRec(st, D.DUNGEON_ORDER[0]);
ok(won === d.battles.length && rec.clears === 1, 'a full run of The Forgotten Road is ' + won + ' won battles and one clear');
ok(st.res.gold - g0 >= dn.battleGold && st.res.food - f0 >= dn.battleFood, 'that run pays at least the model’s battle rewards (' + dn.battleGold + ' gold, ' + dn.battleFood + ' food) plus its first-clear rewards (got ' + (st.res.gold - g0) + ' gold, ' + (st.res.food - f0) + ' food)');

/* ---- daily limit ---- */
st = mk(); let paid = 0; for (let i = 0; i < 8; i++) { const b = { result: 'win', kind: 'practice', over: true }; const before = st.res.gold; try { R.PvP.resolvePractice(st, b); } catch (e) { /* needs a full battle object */ } if (st.res.gold > before) paid++; }
ok(paid === 5 && R.PvP.rewardsLeft(st) === 0 && M.pvp.dailyRewardedWins === 5, 'only five wins a day are rewarded (eight wins paid five times), as the model assumes');

/* ---- production: the model's rates are the game's ---- */
ok(M.scenarios.every((s) => Math.abs(s.check30.gold - Math.min(s.fullCollection.gold, s.perMin.gold * 30)) <= Math.max(3, s.perMin.gold * 0.5)), 'the model’s production rates agree with the game’s own production clock over 30 minutes in every scenario');
ok(M.scenarios.length === 6 && M.assumptions.length >= 6, 'six scenarios (new, mid-game, advanced × casual, intensive) with their assumptions listed');
done('economy13d');
