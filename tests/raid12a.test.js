// Phase 12A: Island Defence Raid Preview and Opponent Skip (rules, no DOM).
// Run: node tests/raid12a.test.js
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, P = R.PvP, B = R.Battle;
const mk = () => { const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern'; ['lumifern', 'acinus', 'pyrokai', 'cannonis', 'gaiaroki', 'voltar'].forEach((sp) => R.addAmina(st, sp, 10)); P.setTeam(st, 'attack', st.aminas.slice(0, 3).map((a) => a.uid)); P.setTeam(st, 'defence', st.aminas.slice(3, 6).map((a) => a.uid)); return st; };
const win = (b) => { b.foes.forEach((f) => (f.hp = 0)); b.over = true; b.result = 'win'; return b; };
const lose = (b) => { b.party.forEach((f) => (f.hp = 0)); b.over = true; b.result = 'lose'; return b; };
const res = (st) => JSON.stringify(st.res), snap = (st) => JSON.stringify({ res: st.res, aminas: st.aminas, def: st.defence.defence, atk: st.defence.attack, pvp: st.pvp, buildings: st.buildings, islands: st.islands });
R.rng = seeded(7);

/* 1. entering shows an island and its loot */
let st = mk();
let pv = P.raidPreview(st), t = pv.target;
ok(t && t.name && t.isle && t.biome && t.look && t.foes.length === D.PVP.defenceSize && t.loot.gold > 0 && t.loot.food > 0, 'entering Island Defence offers an island: owner, island, look, three defenders and loot (' + t.name + ', ' + t.isle + ', ' + t.loot.gold + ' coins, ' + t.loot.food + ' food)');
ok(Object.keys(t.loot).sort().join() === 'food,gold' && !('gems' in t.loot), 'only coins and food are raidable; gems never appear in loot');
ok(pv.value === t.loot.gold + t.loot.food * D.PVP.raid.foodValue && pv.rewardsLeft === D.PVP.practiceDailyRewards && JSON.stringify(pv.pays) === JSON.stringify(t.loot), 'the preview shows the total value and that a win pays exactly this loot');
ok(P.raidPreview(st).target.id === t.id && P.raidPreview(st).target.loot.gold === t.loot.gold, 'viewing again shows the same island and the same loot (no reroll by looking)');
const tiers = D.PVP.raid.tiers, tier = tiers.find((x) => x.id === t.tier), base = D.PVP.raid.base;
ok(t.loot.gold >= Math.round(base.gold * tier.mult[0] / 5) * 5 && t.loot.gold <= Math.round(base.gold * tier.mult[1] / 5) * 5, 'loot sits in its guard tier’s range around the old raid reward (' + tier.label + ')');

/* 3, 4. skipping */
const before = snap(st), seen = [t.bot]; let repeatsSoon = 0;
for (let i = 0; i < 30; i++) { const prev = P.defRec(st).target; const r = P.skipRaid(st); if (!r.ok || r.target.bot === prev.bot) repeatsSoon++; seen.push(r.target.bot); }
ok(repeatsSoon === 0, 'every skip offers a different island than the one before (30 skips)');
const window = D.PVP.raid.recent; let early = 0; for (let i = window; i < seen.length; i++) if (seen.slice(i - window, i).indexOf(seen[i]) >= 0) early++;
ok(early === 0 && new Set(seen).size === D.PVP.raid.bots.length, 'an island is not offered again until ' + window + ' others have been (all ' + D.PVP.raid.bots.length + ' islands came round)');
ok(snap(st) === before, 'skipping 30 times changes no resources, Aminas, teams, rewarded-win count, buildings or islands');
ok(P.skipRaid(st).target.loot.gold > 0, 'each new island has its own loot, calculated when it is offered');

/* 5. attack is against the island shown, locked */
st = mk(); t = P.raidPreview(st).target;
let b = P.attackRaid(st, seeded(3));
ok(b && b.raidTarget === t.id && JSON.stringify(b.foes.map((f) => [f.sp, f.lv])) === JSON.stringify(t.foes.map((f) => [f.sp, f.lv])), 'Attack starts the battle against the defenders shown, at the levels shown');
ok(P.defRec(st).target.locked && !P.skipRaid(st).ok && P.defRec(st).target.id === t.id && !P.attackRaid(st), 'once attacked the island is locked: it cannot be skipped, replaced or attacked twice');

/* 6. a win pays exactly the loot shown, once */
let r0 = Object.assign({}, st.res), out = P.resolveRaid(st, win(b));
ok(out.win && JSON.stringify(out.reward) === JSON.stringify(t.loot) && st.res.gold === r0.gold + t.loot.gold && st.res.food === r0.food + t.loot.food && st.res.gems === r0.gems, 'a successful raid adds exactly the coins and food shown, and no gems');
ok(P.rewardsLeft(st) === D.PVP.practiceDailyRewards - 1, 'it uses one of the day’s rewarded wins, as raids did before');
ok(!P.defRec(st).target && st.defence.log[0].kind === 'raid' && st.defence.log[0].win && st.defence.log[0].isle === t.isle, 'the raided island is used up and the raid is logged with its name');
r0 = res(st); out = P.resolveRaid(st, b);
ok(out.invalid && res(st) === r0, 'resolving the same battle again pays nothing');
ok(P.raidPreview(st).target.id !== t.id, 'the next visit offers a new island');

/* 7. a defeat follows the old rules: nothing gained or lost */
st = mk(); t = P.raidPreview(st).target; b = P.attackRaid(st, seeded(4)); r0 = res(st); out = P.resolveRaid(st, lose(b));
ok(!out.win && !out.reward && res(st) === r0 && st.defence.log[0].win === false, 'a lost raid gains and loses nothing and is logged');
ok(P.defRec(st).target.id === t.id && !P.defRec(st).target.locked && P.rewardsLeft(st) === D.PVP.practiceDailyRewards, 'the island stays on offer, unlocked, and no rewarded win is used');
ok(P.resolveRaid(st, win(b)).invalid && res(st) === r0, 'a finished battle cannot be turned into a win afterwards');

/* 8. no duplication through restarts or changing screens */
st = mk(); t = P.raidPreview(st).target;
let st2 = JSON.parse(JSON.stringify(st));
ok(P.raidPreview(st2).target.id === t.id && P.raidPreview(st2).target.loot.food === t.loot.food, 'after a restart (save and load) the same island and loot are offered');
b = P.attackRaid(st, seeded(5)); st2 = JSON.parse(JSON.stringify(st)); r0 = res(st2);
const pv2 = P.raidPreview(st2);
ok(res(st2) === r0 && st2.defence.log[0].left && !st2.defence.log[0].win && pv2.target.id === t.id && !pv2.target.locked, 'closing the game mid-raid counts as a called-off raid on return (nothing paid, island still offered)');
ok(P.resolveRaid(st2, win(b)).invalid && res(st2) === r0, 'the abandoned battle cannot pay out later');
st = mk(); for (let i = 0; i < D.PVP.practiceDailyRewards; i++) { P.raidPreview(st); P.resolveRaid(st, win(P.attackRaid(st, seeded(10 + i)))); }
pv = P.raidPreview(st); r0 = res(st);
ok(pv.rewardsLeft === 0 && JSON.stringify(pv.pays) === '{}', 'after the day’s rewarded wins the preview says a win pays nothing');
out = P.resolveRaid(st, win(P.attackRaid(st, seeded(30))));
ok(out.win && !out.reward && out.capped && res(st) === r0, 'and a win then pays nothing, as before');
P.setRoster(st, st.aminas.slice(0, 5).map((a) => a.uid)); const pr = P.createPractice(st, seeded(31)); ok(P.resolvePractice(st, win(pr)).reward === null && res(st) === r0, '5v5 practice shares the same daily limit');

/* 9. other modes */
st = mk(); P.setRoster(st, st.aminas.slice(0, 5).map((a) => a.uid));
const p5 = P.createPractice(st, seeded(40)); r0 = st.res.gold;
ok(p5.party.length === 5 && p5.foes.length === 5 && P.resolvePractice(st, win(p5)).reward && st.res.gold === r0 + D.PVP.practiceReward.gold, '5v5 practice matchmaking is unchanged');
const old = P.createRaid(st, seeded(41), 5); ok(old.party.length === 3 && old.foes.length === 3 && !old.raidTarget && P.resolveRaid(st, win(old)).win, 'the older direct raid still works and pays the old reward');
const lob = R.HideSeek.lobby(st, 12345); ok(lob.players.length === D.HIDESEEK.lobbySize && R.HideSeek.newMatch(lob, lob.players[1].id, null).hiders.length === D.HIDESEEK.lobbySize - 1, 'Hide and Seek lobby and match are unchanged');
ok(P.simulateDefence(st, seeded(42)).ok, 'testing your defence is unchanged');

/* 10. save compatibility */
st = mk(); const saved = JSON.parse(JSON.stringify(st)); delete saved.defence.target; delete saved.defence.recent; saved.defence.log = [{ t: 1, kind: 'raid', win: true }];
pv = P.raidPreview(saved);
ok(pv.target && saved.defence.attack.length === 3 && saved.defence.defence.length === 3 && saved.defence.log.length >= 1, 'a save from before Phase 12A opens the preview and keeps its teams and log (no migration)');
ok(Object.keys(st.defence).sort().join() === 'attack,defence,log', 'nothing new is written to a save until the raid preview is opened');

done('raid12a');
