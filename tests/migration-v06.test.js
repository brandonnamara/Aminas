// Save compatibility: v0.5 saves (schema 2) and v0.1 saves (schema 1) load into v0.6 (schema 3) with nothing lost.
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, B = R.Battle;
// A v0.5 save, written the way v0.5 wrote it: three-floor dungeons, a run in progress, a bought island.
function v05Save() {
  const st = S.fresh(); st.schema = 2; st.phase = 'play'; st.starter = 'umbrit'; st.introDone = true;
  ['umbrit', 'emberkit', 'ripplet', 'gloomole'].forEach((sp, i) => st.aminas.push({ uid: i + 1, sp, lv: 13 + i, xp: 4 })); st.nextUid = 5; st.active = 1;
  st.owned = { umbrit: true, emberkit: true, ripplet: true, gloomole: true, relicwarden: true }; st.res = { gold: 123456, food: 789, gems: 42 }; st.rank = 9;
  Object.assign(st.struct, { hollow: true, tidegate: true, moonshrine: true, reliquarygate: true }); st.flags = { r1: true, r2: true, stone: true };
  st.missions = { m_hollow: 'claimed', m_feed: 'claimed', m_dungeon: 'claimed', m_stone: 'claimed' };
  st.dungeon = { reliquary: { clears: 3, floors: [true, true, true] }, hollowveil: { clears: 0, floors: [true, true, false] } };
  st.run = { d: 'hollowveil', floor: 2, battle: 0, uids: [1, 2, 3], hp: { 1: 80, 2: 70, 3: 60 }, gold: 140, food: 30, xp: {} };
  st.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: 1 }; // bought for 100,000 gold in v0.5
  delete st.campaign; delete st.lore; delete st.ruins; delete st.survival; delete st.pvp; delete st.defence; delete st.hideseek; delete st.story.scenes;
  return JSON.parse(JSON.stringify(st));
}
const raw = v05Save();
const { st, from } = S.hydrate(raw);
ok(from === 2 && st.schema === 3, 'a v0.5 save (schema 2) migrates to schema 3');
ok(st.aminas.length === 4 && st.aminas.every((a, i) => a.lv === raw.aminas[i].lv && a.sp === raw.aminas[i].sp), 'every Amina, level and species kept');
ok(st.res.gold === 123456 && st.res.food === 789 && st.res.gems === 42 && st.rank === 9, 'resources and rank kept');
ok(st.missions.m_dungeon === 'claimed' && st.flags.r2 && st.flags.stone, 'claimed quests and story flags kept');
ok(R.dungeonCleared(st, 'reliquary') && st.dungeon.reliquary.clears === 3, 'the Reliquary stays cleared (3 clears)');
ok(st.dungeon.reliquary.floors.length === 4 && st.dungeon.reliquary.floors.every(Boolean), 'its first-clear rewards stay claimed in the new four sections');
ok(st.dungeon.hollowveil.floors[0] && st.dungeon.hollowveil.floors[1] && !st.dungeon.hollowveil.floors[3], 'partial first-clears carry over');
ok(st.run && st.run.d === 'hollowveil' && st.run.battle === 6 && st.run.uids.length === 3 && st.run.hp[1] === 80, 'the run in progress resumes at the matching battle with its health');
ok(W.islandUnlocked(st, 'verdant'), 'an island bought with gold in v0.5 stays unlocked');
ok(st.campaign && st.lore && st.ruins && st.survival && st.pvp && st.defence && st.story.scenes, 'new save fields get safe defaults');
ok(R.dungeonUnlocked(st, 'reliquary') && R.dungeonUnlocked(st, 'forgottenroad'), 'cleared dungeons stay open; the new Dungeon 1 is open too');
// replaying the legacy dungeon pays its every-clear reward but never a section reward again
const s2 = S.hydrate(v05Save()).st; s2.run = null;
const gems0 = s2.res.gems; R.startRun(s2, 'reliquary', [1, 2, 3], { from: 9 });
let b = R.createBattle(s2, seeded(1)); b.enemy.hp = 0; b.over = true; b.result = 'win'; const out = R.resolveBattle(s2, b);
ok(out.cleared && !out.first && !out.sectionFirst && s2.dungeon.reliquary.clears === 4, 'a replay after migration is a normal replay');
ok(s2.res.gems === gems0 + Math.round(D.DUNGEONS.reliquary.clearReward.gems * W.dungeonRewardMult(s2)), 'only the every-clear reward is paid');
ok(!s2.owned.briarstag || s2.dungeon.reliquary.clears !== 4, 'species rewards follow the clear count as before');
// finishing the migrated run
const s3 = S.hydrate(v05Save()).st; let guard = 0;
while (s3.run && guard++ < 10) { b = R.createBattle(s3, seeded(guard)); b.enemy.hp = 0; b.over = true; b.result = 'win'; R.resolveBattle(s3, b); }
ok(R.dungeonCleared(s3, 'hollowveil') && s3.owned.veilfox && s3.flags.hollowveil, 'the migrated Hollow Veil run can be finished, with its first-clear Veilfox');
// through the real loader (localStorage), including the backup copy of the old save
G._store[D.SAVE_KEY] = JSON.stringify(v05Save());
ok(S.load() && S.status.migratedFrom === 2 && S.state.schema === 3, 'S.load migrates a stored v0.5 save');
ok(!!G._store[D.SAVE_KEY + '-v2'], 'a copy of the v0.5 save is kept');
S.save(); const again = JSON.parse(G._store[D.SAVE_KEY]); ok(again.schema === 3 && again.dungeon.reliquary.clears === 3, 'saving writes schema 3 without losing anything');
// a v0.1 save (schema 1) still migrates all the way
const v01 = { schema: 1, phase: 'play', starter: 'lumifern', introDone: true, res: { gold: 50, food: 20, gems: 1 }, rank: 2, rankXp: 3, aminas: [{ uid: 1, sp: 'lumifern', lv: 4, xp: 0 }], active: 1, nextUid: 2, seen: {}, owned: { lumifern: true },
  struct: { hollow: true }, flags: {}, missions: {}, stats: { fed: 1, wins: 0, losses: 0, hatched: 0, evolved: 0, explores: {} }, dungeon: { reliquary: { clears: 0 } }, habitats: {}, settings: { music: true } };
const m1 = S.hydrate(v01);
ok(m1.from === 1 && m1.st.schema === 3 && m1.st.buildings.hollow.level === 1 && m1.st.aminas[0].lv === 4, 'a v0.1 save still migrates (1 → 2 → 3)');
ok(R.dungeonState(m1.st, 'forgottenroad') === 'available', 'and can start the new Dungeon 1');
// a run left over from v0.5 for a dungeon that cannot be mapped is dropped instead of crashing
const bad = v05Save(); bad.run = { d: 'nowhere', floor: 0, battle: 0, uids: [1] };
ok(S.hydrate(bad).st.run === null, 'an unknown run is dropped safely');
// a newer save is refused, not damaged
const newer = v05Save(); newer.schema = 9; let threw = false; try { S.hydrate(newer); } catch (e) { threw = true; } ok(threw, 'a save from a newer version is refused');
done('migration v0.6');
