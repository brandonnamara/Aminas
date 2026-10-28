// v0.6 modes: Survival, Loot Ruins, PvP practice, Island Defence, Hide and Seek, lore journal, quests/navigation.
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, B = R.Battle, Q = A.Quests, Nav = A.Nav;
const mk = () => { const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern'; ['lumifern', 'acinus', 'pyrokai', 'cannonis', 'gaiaroki', 'voltar'].forEach((sp) => R.addAmina(st, sp, 8)); st.struct.hollow = true; R.drain(); return st; };
const win = (b) => { b.foes.forEach((f) => (f.hp = 0)); b.over = true; b.result = 'win'; return b; };
const lose = (b) => { b.party.forEach((f) => (f.hp = 0)); b.over = true; b.result = 'lose'; return b; };

/* Survival */
let st = mk(); const dun = JSON.stringify(st.dungeon), isl = JSON.stringify(st.islands);
ok(R.Survival.start(st, st.aminas.slice(0, 3).map((a) => a.uid)).ok && st.survival.run.wave === 1, 'survival starts at wave 1');
const lv1 = R.Survival.spec(st).lv; for (let i = 0; i < 4; i++) R.Survival.resolve(st, win(R.Survival.createBattle(st, seeded(i))));
ok(st.survival.run.wave === 5 && R.Survival.spec(st).boss && R.Survival.spec(st).lv > lv1, 'difficulty rises and wave 5 is a Champion');
let o = R.Survival.resolve(st, win(R.Survival.createBattle(st, seeded(9))));
ok(o.milestone && o.milestone.wave === 5, 'wave 5 pays its one-time milestone');
const g0 = st.res.gold; o = R.Survival.resolve(st, lose(R.Survival.createBattle(st, seeded(10))));
ok(!st.survival.run && o.waves === 5 && st.res.gold > g0 && st.survival.best === 5, 'a defeat ends the run, pays what was earned and records the best');
R.Survival.start(st, [st.aminas[0].uid]); for (let i = 0; i < 5; i++) o = R.Survival.resolve(st, win(R.Survival.createBattle(st, seeded(i))));
ok(!o.milestone, 'milestones are paid only once per save');
ok(JSON.stringify(st.dungeon) === dun && JSON.stringify(st.islands) === isl, 'survival never touches dungeon progress or islands');
ok(R.Survival.cashOut(st).ok && !st.survival.run, 'cash out ends the run');

/* Loot Ruins */
st = mk();
ok(!R.Ruins.status(st, 'toll').unlocked && R.Ruins.search(st, 'toll').reason === 'locked', 'ruins open with their dungeon');
st.dungeon.forgottenroad = { clears: 1 };
let t = 1e12, r = R.Ruins.search(st, 'toll', t);
ok(r.ok && r.loot.gold >= 30 && r.artefact === 'ruin_toll' && st.lore.ruin_toll, 'first search: loot and the artefact');
ok(R.Ruins.search(st, 'toll', t + 1000).reason === 'cooldown', 'a second search waits for the cooldown');
r = R.Ruins.search(st, 'toll', t + 31 * 60000);
ok(r.ok && !r.artefact && st.ruins.toll.searches === 2, 'after the cooldown: more loot, no second artefact');
st.settings.timers = 'quick'; ok(R.Ruins.cooldownMs(st, 'toll') === 30000, 'quick timers shorten the cooldown for testing');

/* PvP practice */
st = mk();
ok(!R.PvP.setRoster(st, st.aminas.slice(0, 4).map((a) => a.uid)).ok, 'a roster needs exactly five');
ok(R.PvP.setRoster(st, st.aminas.slice(0, 5).map((a) => a.uid)).ok, 'a roster of five is saved');
let b = R.PvP.createPractice(st, seeded(1), 7);
ok(b.party.length === 5 && b.foes.length === 5, 'practice match: five against five');
let t2 = 0; while (!b.over && t2++ < 600) B.act(b, B.autoAction(b));
ok(b.over && (b.result === 'win' ? b.foes.every((f) => f.hp <= 0) : b.party.every((f) => f.hp <= 0)), 'the match plays to a clear result');
const before = JSON.stringify({ d: st.dungeon, i: st.islands, c: st.campaign }); o = R.PvP.resolvePractice(st, b);
ok(st.pvp.practice.w + st.pvp.practice.l === 1 && JSON.stringify({ d: st.dungeon, i: st.islands, c: st.campaign }) === before, 'the result is recorded and nothing else changes');
for (let i = 0; i < 7; i++) R.PvP.resolvePractice(st, win(R.PvP.createPractice(st, seeded(i), i)));
ok(st.pvp.rewardsToday === D.PVP.practiceDailyRewards, 'practice rewards stop at the daily limit');
ok(D.PVP.online === false, 'no online service is claimed');

/* Island Defence */
ok(!R.PvP.setTeam(st, 'defence', [1, 2]).ok && R.PvP.setTeam(st, 'defence', [1, 2, 3]).ok && R.PvP.setTeam(st, 'attack', [4, 5, 6]).ok, 'attack and defence teams of three');
const saved = S.hydrate(JSON.parse(JSON.stringify(st))).st;
ok(JSON.stringify(R.PvP.team(saved, 'defence')) === '[1,2,3]' && JSON.stringify(R.PvP.team(saved, 'attack')) === '[4,5,6]', 'both teams survive a save and load');
const sim = R.PvP.simulateDefence(st, seeded(3), 11);
ok(sim.ok && typeof sim.held === 'boolean' && sim.turns > 0 && st.defence.log[0].kind === 'defence', 'a defence test resolves and is logged');
b = R.PvP.createRaid(st, seeded(2), 5); ok(b.party.length === 3 && b.foes.length === 3, 'a practice raid is three against three');
R.PvP.resolveRaid(st, win(b)); ok(st.defence.log[0].kind === 'raid' && st.defence.log[0].win, 'raid result logged');

/* Hide and Seek */
const L = R.HideSeek.lobby(st, 1234);
ok(L.players.length === D.HIDESEEK.lobbySize && L.players[0].id === 'you', 'a lobby of five with you in it');
L.players.forEach((p, i) => (p.pref = i === 1 || i === 2 ? 'seeker' : 'hider'));
let a = R.HideSeek.assignSeeker(L, { you: L.players[1].id, bot0: L.players[1].id, bot1: L.players[2].id });
ok(a.seeker === L.players[1].id && a.method === 'vote', 'most votes wins');
a = R.HideSeek.assignSeeker(L, { you: L.players[0].id, bot0: L.players[3].id });
ok(a.method === 'tiebreak' && [L.players[1].id, L.players[2].id].indexOf(a.seeker) >= 0, 'votes for players who did not choose Seeker are ignored (tie between the eligible)');
a = R.HideSeek.assignSeeker(L, { you: L.players[1].id, bot0: L.players[2].id }, { [L.players[1].name]: 3 });
ok(a.seeker === L.players[2].id && a.method === 'tiebreak', 'a tie goes to whoever has been Seeker least often');
L.players.forEach((p) => (p.pref = 'hider')); a = R.HideSeek.assignSeeker(L, {});
ok(a.method === 'fallback' && L.players.some((p) => p.id === a.seeker), 'nobody wants to seek: the Seeker is drawn from everyone');
const m = R.HideSeek.newMatch(L, 'bot0', { morph: 'barrel', x: 0, y: 0 });
const me = m.hiders.find((h) => h.id === 'you');
ok(me && me.morph === 'barrel' && me.x === 0 && me.y === 0 && m.hiders.length === 4, 'your Morph and hiding spot are used');
ok(!m.props.some((p) => p.x === 0 && p.y === 0), 'a hider never shares a cell with a real prop');
const s1 = R.HideSeek.search(m, 0, 0); ok(s1.found === 'you' && me.found, 'searching your cell finds you');
ok(R.HideSeek.search(m, 0, 0).reason === 'searched', 'a cell cannot be searched twice');
const m2 = R.HideSeek.newMatch(L, 'you'); m2.hiders.forEach((h) => R.HideSeek.search(m2, h.x, h.y));
ok(m2.over && m2.result === 'seeker', 'finding every hider wins for the Seeker');
const m3 = R.HideSeek.newMatch(L, 'you'); R.HideSeek.timeUp(m3); ok(m3.result === 'hiders', 'time running out wins for the hiders');
const m4 = R.HideSeek.newMatch(L, 'bot1'); const rnd = R.HideSeek.rng(5); let n = 0; while (!m4.over && n++ < 50) R.HideSeek.botSearch(m4, rnd);
ok(m4.over && m4.searchesLeft >= 0, 'the computer Seeker plays a match to the end');

/* quests and navigation */
st = mk(); ['m_hollow', 'm_feed', 'm_lv3', 'm_find'].forEach((k) => (st.missions[k] = 'claimed'));
const road = D.QUESTS.find((q) => q.id === 'm_road'); ok(road && Q.status(st, road) !== 'locked', 'the Forgotten Road quest opens after the first steps');
let p = Nav.resolve(st, road.objectives[0]); ok(p.type === 'screen' && p.screen === 'dungeons' && p.dungeon === 'forgottenroad', 'its navigation opens the Dungeons screen on Dungeon 1');
p = Nav.resolve(st, { type: 'dungeon_clear', dungeon: 'reliquary' });
ok(p.type === 'locked' && /Gathering Hall/.test(p.message) && Nav.actionable(p).dungeon === 'forgottenroad', 'a locked dungeon points back along the chain to the first one still to clear');
p = Nav.resolve(st, { type: 'unlock_island', island: 'verdant' }); ok(/Island Boss/.test(p.message || '') || p.type === 'locked', 'unlocking an island points at the Island Boss path');
st.dungeon.forgottenroad = { clears: 1 }; Q.scan(st); ok(Q.status(st, road) === 'ready', 'clearing Dungeon 1 completes its quest');
done('modes');
