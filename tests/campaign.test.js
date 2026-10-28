// v0.6 campaign: ten dungeons per island, ten battles per dungeon, Island Boss unlocks the next island.
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, B = R.Battle;
const fresh = () => { const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern'; return st; };
// Plays one battle to the end with the computer choosing the player's moves too.
function play(b, cap) { let t = 0; while (!b.over && t++ < (cap || 300)) B.act(b, B.autoAction(b)); return b; }
function forceWin(b) { b.foes.forEach((f) => (f.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; return b; }
function forceLose(b) { b.party.forEach((f) => (f.hp = 0)); b.over = true; b.result = 'lose'; return b; }

/* ---------- structure ---------- */
const C = D.CAMPAIGN;
ok(C.starter.dungeons.length === 10, 'Starter Island has ten dungeons');
ok(C.starter.dungeons.every((id) => D.DUNGEONS[id].battles.length === 10), 'every dungeon has ten battles');
ok(C.starter.dungeons.every((id) => D.DUNGEONS[id].battles.slice(0, 9).every((x) => !x.boss)), 'battles 1-9 are ordinary encounters');
ok(C.starter.dungeons.every((id) => D.DUNGEONS[id].battles[9].boss), 'battle 10 of every dungeon is its boss');
ok(D.DUNGEONS[C.starter.dungeons[9]].battles[9].islandBoss && C.starter.islandBoss === C.starter.dungeons[9], 'the tenth dungeon ends with the Island Boss');
ok(C.starter.dungeons.slice(0, 9).every((id) => !D.DUNGEONS[id].battles[9].islandBoss), 'no other dungeon has an Island Boss');
ok(D.DUNGEONS.forgottenroad.index === 1 && D.DUNGEONS.forgottenroad.battles[9].title === 'The Waywarden', 'Dungeon 1 is The Forgotten Road, guarded by the Waywarden');
ok(Object.keys(D.DUNGEONS).every((id) => D.DUNGEONS[id].battles.every((x) => D.SPECIES[x.sp]) && D.DUNGEONS[id].battles.every((x) => !x.move || D.ABILITIES[x.move])), 'all encounters use existing species and valid moves');
ok(D.ISLAND_ORDER.every((i) => C[i]), 'every island has campaign data');
ok(C.verdant.unlockedBy === 'starter' && C.obsidian.unlockedBy === 'verdant', 'each island is unlocked by the boss of the one before');

/* ---------- order and states ---------- */
let st = fresh(); R.addAmina(st, 'lumifern', 6);
ok(R.dungeonState(st, 'forgottenroad') === 'locked', 'Dungeon 1 locked before the Sunlit Hollow is restored');
st.struct.hollow = true;
ok(R.dungeonState(st, 'forgottenroad') === 'available', 'Dungeon 1 available after the Sunlit Hollow');
ok(R.dungeonState(st, 'gatheringhall') === 'locked' && /Forgotten Road/.test(R.dungeonLockText(st, 'gatheringhall')), 'Dungeon 2 locked until Dungeon 1 is cleared (and says so)');
ok(R.dungeonBlocker(st, 'gatheringhall').dungeon === 'forgottenroad', 'blocker points at the previous dungeon');

/* ---------- progression inside a dungeon ---------- */
let r = R.startRun(st, 'forgottenroad', [st.aminas[0].uid]);
ok(r.ok && st.run.battle === 0, 'run starts at battle 1');
ok(R.dungeonState(st, 'forgottenroad') === 'inprogress', 'state is in progress during a run');
for (let i = 0; i < 4; i++) { const b = forceWin(R.createBattle(st, seeded(i))); R.resolveBattle(st, b); }
ok(st.run.battle === 4 && R.dungeonRec(st, 'forgottenroad').next === 4, 'four wins: next battle is 5, and it is saved');
ok(st.dungeon.forgottenroad.floors[0] === true && st.lore.road_stones, 'clearing battles 1-3 claims the section and its journal entry');
// defeat
let gold0 = st.res.gold; let b = forceLose(R.createBattle(st, seeded(9))); let out = R.resolveBattle(st, b);
ok(!out.win && st.run === null && R.dungeonRec(st, 'forgottenroad').next === 4, 'a defeat ends the run without advancing the dungeon');
ok(!R.dungeonCleared(st, 'forgottenroad'), 'a defeated player cannot complete the dungeon');
// resume after reload
let saved = JSON.parse(JSON.stringify(st)); st = S.hydrate(saved).st;
r = R.startRun(st, 'forgottenroad', [st.aminas[0].uid]);
ok(r.ok && st.run.battle === 4, 'after a reload the next attempt starts at battle 5');
// battle after the end cannot act
b = R.createBattle(st, seeded(3)); forceWin(b); const evs = B.act(b, { t: 'ab', id: b.party[0].abil[0] });
ok(evs.length === 0, 'no actions are accepted after a battle has ended');
R.resolveBattle(st, b);
for (let i = 5; i < 9; i++) { b = forceWin(R.createBattle(st, seeded(i))); R.resolveBattle(st, b); }
ok(R.encounter(st).spec.boss && R.encounter(st).battle === 9, 'battle 10 is the boss');
// resolving a battle that is not finished does nothing
b = R.createBattle(st, seeded(1)); const before = JSON.stringify(st.dungeon); out = R.resolveBattle(st, b);
ok(out.invalid && JSON.stringify(st.dungeon) === before, 'an unfinished battle cannot be resolved');
const gems0 = st.res.gems; b = forceWin(b); out = R.resolveBattle(st, b);
ok(out.cleared && out.first && R.dungeonCleared(st, 'forgottenroad') && st.run === null, 'beating the boss completes the dungeon');
ok(out.scene === 'oldroads', 'the Old Roads scene is requested after the first clear');
ok(st.res.gems >= gems0 + D.DUNGEONS.forgottenroad.first.gems, 'first-clear reward paid');
ok(R.dungeonState(st, 'gatheringhall') === 'available', 'Dungeon 2 opens after Dungeon 1');
// replay
const firstFlags = JSON.stringify(st.dungeon.forgottenroad.floors), g1 = st.res.gems;
r = R.startRun(st, 'forgottenroad', [st.aminas[0].uid], { from: 9 });
ok(r.ok && st.run.battle === 9, 'a cleared dungeon can be replayed from any battle');
b = forceWin(R.createBattle(st, seeded(2))); out = R.resolveBattle(st, b);
ok(out.cleared && !out.first && !out.scene && !out.sectionFirst, 'replay: no first-clear reward, no repeated scene');
ok(st.res.gems === g1 && JSON.stringify(st.dungeon.forgottenroad.floors) === firstFlags, 'replay does not pay one-time rewards again');
ok(st.dungeon.forgottenroad.clears === 2, 'replay counts as another clear');

/* ---------- Island Boss and island unlock ---------- */
st = fresh(); R.addAmina(st, 'lumifern', 25); st.struct.hollow = true; st.rank = 12;
ok(!W.islandUnlocked(st, 'verdant'), 'Verdant Wilds locked at the start');
ok(W.unlockIsland(st, 'verdant').reason === 'boss' && !W.islandUnlocked(st, 'verdant'), 'the next island cannot be bought or unlocked without the Island Boss');
C.starter.dungeons.slice(0, 9).forEach((id) => (st.dungeon[id] = { clears: 1 }));
ok(R.dungeonUnlocked(st, 'heartwood'), 'Dungeon 10 opens after Dungeon 9');
R.startRun(st, 'heartwood', [st.aminas[0].uid], {});
for (let i = 0; i < 9; i++) { b = forceWin(R.createBattle(st, seeded(i))); R.resolveBattle(st, b); }
ok(!W.islandUnlocked(st, 'verdant'), 'nine wins in Dungeon 10 do not unlock anything');
b = R.createBattle(st, seeded(4));
ok(b.enemy.islandBoss && b.enemy.boss && b.enemy.mech.type === 'prism', 'the Island Boss is flagged and has its prism mechanic');
forceLose(b); R.resolveBattle(st, b);
ok(!W.islandUnlocked(st, 'verdant') && !R.islandBossDefeated(st, 'starter'), 'losing to the Island Boss unlocks nothing');
R.startRun(st, 'heartwood', [st.aminas[0].uid]); ok(st.run.battle === 9, 'retry starts at the Island Boss');
b = forceWin(R.createBattle(st, seeded(5))); out = R.resolveBattle(st, b);
ok(out.islandBoss && out.unlockedIsland === 'verdant' && W.islandUnlocked(st, 'verdant'), 'defeating the Island Boss unlocks the Verdant Wilds');
ok(R.islandBossDefeated(st, 'starter') && R.islandProgress(st, 'starter').cleared === 10, 'island progress shows 10/10 and the boss defeated');
const evs2 = R.drain().filter((e) => e.name === 'islandUnlocked'); ok(evs2.length === 1, 'island unlock event fired once');
R.startRun(st, 'heartwood', [st.aminas[0].uid], { from: 9 }); b = forceWin(R.createBattle(st, seeded(6))); out = R.resolveBattle(st, b);
ok(!out.unlockedIsland && R.drain().filter((e) => e.name === 'islandUnlocked').length === 0, 'replaying the Island Boss does not unlock again');
ok(!W.islandUnlocked(st, 'obsidian') && W.unlockIsland(st, 'obsidian').reason === 'boss', 'Obsidian Reach still needs its own Island Boss');

/* ---------- combat mechanics ---------- */
// Waywarden barrier: thresholds, a tell, then a barrier that specials crack twice as fast
st = fresh(); R.addAmina(st, 'acinus', 6); st.struct.hollow = true;
R.startRun(st, 'forgottenroad', [st.aminas[0].uid]); st.run.battle = 9;
b = R.createBattle(st, seeded(7)); const w = b.enemy;
ok(w.name === 'The Waywarden' && w.mech.type === 'barrier' && w.scale > 1.3, 'the Waywarden is a larger boss with a barrier');
w.hp = Math.floor(w.hpMax * 0.7);
let ev = B.act(b, { t: 'ab', id: 'vinewhip' });
ok(ev.some((e) => e.t === 'barrierTell') && w.barrierDue, 'crossing 66% announces the barrier');
ev = B.act(b, { t: 'ab', id: 'vinewhip' });
ok(ev.some((e) => e.t === 'barrier' && e.shield > 0), 'the Waywarden raises its barrier on its next action');
const sh = w.shield, hp1 = w.hp; b.party[0].cd.leafguard = 0;
const evA = B.act(b, { t: 'ab', id: 'vinewhip' }); const sh1 = evA.find((e) => e.t === 'shieldHit');
ok(sh1 && !sh1.special && w.hp === hp1 - (sh1.broke ? evA.find((e) => e.t === 'hit' && e.who === 'e').dmg : 0), 'the barrier absorbs damage from basic attacks');
// specials double damage to the barrier
const f2 = B.fighter('acinus', 6), w2 = R.enemyFromSpec(D.DUNGEONS.forgottenroad.battles[9]); w2.shield = w2.shieldMax = 500;
const b2 = B.create([f2], w2, { rng: seeded(1) });
const fakeSpecial = 'flarebite'; b2.party[0].abil = ['vinewhip', fakeSpecial]; b2.party[0].cd[fakeSpecial] = 0;
const e1 = B.act(b2, { t: 'ab', id: fakeSpecial }).find((e) => e.t === 'shieldHit');
ok(e1 && e1.special && e1.absorbed > 0, 'special abilities hit the barrier as specials');
// prism shift
const isb = R.enemyFromSpec(D.DUNGEONS.heartwood.battles[9]); const b3 = B.create([B.fighter('solarbloom', 22)], isb, { rng: seeded(2) });
const el0 = isb.el; let shifted = false, warned = false;
for (let i = 0; i < 4 && !b3.over; i++) { const e = B.act(b3, B.autoAction(b3)); if (e.some((x) => x.t === 'prismWarn')) warned = true; if (e.some((x) => x.t === 'prismShift')) shifted = true; }
ok(warned && shifted && isb.el !== el0, 'the Island Boss warns, then shifts its element every few turns');
ok(isb.chargeIn != null, 'the Island Boss also telegraphs a charged move');
// multi-foe battles
const team = R.PvP.aiTeam(8, 3, 42), b4 = B.create([B.fighter('pyrokai', 30)], team, { rng: seeded(3) });
play(b4, 400);
ok(b4.over && b4.result === 'win' && b4.foes.every((f) => f.hp <= 0), 'a team of foes is beaten one after another');

/* ---------- canon guard: new story text never reveals what must stay hidden ---------- */
const sc = A.Scenes.list, texts = [];
Object.keys(sc).forEach((k) => sc[k].beats.forEach((b) => { if (b.text) texts.push(b.text); (b.choice || []).forEach((c) => texts.push(c.text)); }));
Object.keys(D.LORE).forEach((k) => texts.push(D.LORE[k].title + ' ' + D.LORE[k].text));
Object.keys(D.DUNGEONS).forEach((k) => { texts.push(D.DUNGEONS[k].theme); D.DUNGEONS[k].battles.forEach((b) => b.clue && texts.push(b.clue)); });
Object.keys(A.Scenes.after).forEach((k) => texts.push(A.Scenes.after[k]));
const all = texts.join(' \n ');
ok(!/emergence/i.test(all), 'no new text names or explains the Emergence');
ok(!/\bhumans?\b|human-like|my world|his world|came from|where I (was|grew)/i.test(all), 'no new text says where the Entity came from or that he was human-like');
ok(!/(saved|rescued|preserv\w*) (these|the) (islands|fragments)|endangered/i.test(all), 'no new text says why the sanctuary was made');
ok(!/presence|the thing neither side/i.test(all), 'no new text names the presence beyond the world');
ok(!/(friends|friendship|betray|why they (fight|fought))/i.test(all), 'the starter species’ shared past is only shown, never explained');
ok(/side by side/.test(sc.oldroads.beats.map((b) => b.text || '').join(' ')) && /two small figures/.test(D.LORE.road_mural.text), 'the mural shows the two starter species together');
ok(A.Scenes.estimate('oldroads') >= 35 && A.Scenes.estimate('oldroads') <= 50, 'Old Roads plays in about 35-50 seconds (' + A.Scenes.estimate('oldroads') + 's)');

/* ---------- balance (computer plays both sides) ---------- */
function trial(id, team, n) {
  let wins = 0;
  for (let k = 0; k < n; k++) {
    const s2 = fresh(); team.forEach(([sp, lv]) => R.addAmina(s2, sp, lv)); s2.struct.hollow = true; s2.rank = 10; s2.struct.reliquarygate = s2.struct.tidegate = s2.struct.moonshrine = true; s2.flags.r1 = s2.flags.r2 = s2.flags.hollowveil = true;
    const d = D.DUNGEONS[id]; if (d.prev) s2.dungeon[d.prev] = { clears: 1 };
    let tries = 0;
    R.startRun(s2, id, s2.aminas.map((a) => a.uid));
    while (!R.dungeonCleared(s2, id) && tries < 1) {
      if (!s2.run) { tries++; break; }
      const bb = play(R.createBattle(s2, seeded(k * 31 + s2.run.battle + 1))); const o = R.resolveBattle(s2, bb); R.drain();
      if (!o.win) { tries++; }
    }
    if (R.dungeonCleared(s2, id)) wins++;
  }
  return wins;
}
const t1 = trial('forgottenroad', [['lumifern', 4], ['acinus', 3]], 40);
console.log('     Forgotten Road, Lumifern 4 + Mossbun 3, one sitting: ' + t1 + '/40');
ok(t1 >= 20, 'Dungeon 1 is clearable in one sitting by a recommended-level pair most of the time');
const t1b = trial('forgottenroad', [['umbrit', 5]], 40);
console.log('     Forgotten Road, a lone Umbrit 5, one sitting: ' + t1b + '/40');
done('campaign');
