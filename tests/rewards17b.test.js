// Phase 17B: reward integrity, the dungeon run-up, Cold Kiln, quest availability and the guardian brief.
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, Q = A.Quests, B = R.Battle;
const fresh = () => { const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern'; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = true; st.flags.r2 = true; st.rank = 10; return st; };
// marks every dungeon before `id` cleared, so `id` can be entered
const opened = (st, id) => { const L = D.CAMPAIGN.starter.dungeons; L.slice(0, L.indexOf(id)).forEach((x) => (st.dungeon[x] = { clears: 1, floors: [true, true, true, true], next: 0 })); if (L.indexOf(id) > 5) st.flags.hollowveil = true; return st; };
const win = (b) => { b.foes.forEach((f) => (f.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; return b; };
const lose = (b) => { b.party.forEach((f) => (f.hp = 0)); b.over = true; b.result = 'lose'; return b; };
const team = (st) => ['lumifern', 'cannonis', 'acinus'].map((sp) => R.addAmina(st, sp, 20).uid);
const res = (st) => ({ gold: st.res.gold, food: st.res.food, gems: st.res.gems });
// plays battles from the current one to the end (or n battles), every one a win
function runTo(st, end) { let out; let g = 0; while (st.run && g++ < 20) { out = R.resolveBattle(st, win(R.createBattle(st, seeded(g)))); if (end != null && out.battle >= end) break; } return out; }

/* ---------- the three legacy dungeons follow first/repeat rules ---------- */
['reliquary', 'hollowveil', 'resonancescar'].forEach((id) => { const d = D.DUNGEONS[id]; ok(!d.clearReward && d.first && d.repeat && d.first.gems > 0 && !d.repeat.gems, D.DUNGEONS[id].name + ': a first-clear reward with gems and a repeat reward without'); });
ok(D.CAMPAIGN.starter.dungeons.every((id) => !D.DUNGEONS[id].clearReward && D.DUNGEONS[id].first && D.DUNGEONS[id].repeat), 'all ten dungeons now use the same first-clear and repeat model');
ok(D.DUNGEONS.forgottenroad.first.gold === 120 && D.DUNGEONS.forgottenroad.repeat.gold === 40 && D.DUNGEONS.heartwood.first.gems === 30 && D.DUNGEONS.heartwood.repeat.gold === 300, 'the other seven dungeons keep their rewards');

/* ---------- first clear, full replay, boss-only replay ---------- */
let st = opened(fresh(), 'reliquary'); const uids = team(st); const mult = () => W.dungeonRewardMult(st);
R.startRun(st, 'reliquary', uids); let r0 = res(st); let out = runTo(st);
const battleGold = D.DUNGEONS.reliquary.battles.reduce((a, x) => a + 10 + x.lv * 3 + (x.boss ? 20 : 0), 0), secGold = D.DUNGEONS.reliquary.sections.reduce((a, x) => a + ((x.first || {}).gold || 0), 0);
ok(out.cleared && out.first && st.res.gems - r0.gems === Math.round(5 * mult()) + 2 && st.owned.terraki && out.items.indexOf('barkvest') >= 0, 'first clear: its gems (and section gems), Gaiaroki II and its own item');
ok(st.res.gold - r0.gold === battleGold + secGold + Math.round(150 * mult()), 'first clear: battle gold + section rewards + the first-clear gold, exactly');
r0 = res(st); R.startRun(st, 'reliquary', uids, { from: 0 }); out = runTo(st);
// Phase 17D: a full replay may also complete optional challenges, paid separately (100 gold each, 2 gems for all three);
// the dungeon's own replay reward checked here is unchanged.
const chG = out.challenges ? out.challenges.fresh.length * D.CHALLENGE17.reward.gold : 0, chGems = out.challenges && out.challenges.all ? D.CHALLENGE17.allThree.gems : 0;
ok(out.cleared && !out.first && !out.partial && st.res.gems - chGems === r0.gems && st.res.gold - chG - r0.gold === battleGold + Math.round(50 * mult()), 'full replay: battle gold + the repeat reward, no gems, no section rewards again' + (chG ? ' (plus ' + chG + ' challenge gold, paid separately)' : ''));
ok(st.dungeon.reliquary.clears === 2 && st.owned.sylvaneer2, 'the second clear still gives Sylvaneer II');
r0 = res(st); const items0 = st.items.length; R.startRun(st, 'reliquary', uids, { from: 9 }); out = runTo(st);
const bossGold = 10 + D.DUNGEONS.reliquary.battles[9].lv * 3 + 20;
ok(out.cleared && out.partial && st.res.gold - r0.gold === bossGold && st.res.gems === r0.gems && st.items.length === items0, '"Fight the boss again": the boss battle\'s own gold only (no clear reward, no gems, no gear roll)');
ok(st.dungeon.reliquary.clears === 3 && out.xp.length === 3 && out.essence && out.essence.n > 0, 'it still counts as a clear and still gives XP and essence');
// the old farm: twenty boss-only replays of the Resonance Scar
st = opened(fresh(), 'resonancescar'); team(st); st.dungeon.resonancescar = { clears: 1, floors: [true, true, true, true], next: 0 };
r0 = res(st); for (let i = 0; i < 20; i++) { R.startRun(st, 'resonancescar', st.aminas.map((a) => a.uid), { from: 9 }); runTo(st); }
ok(st.res.gems === r0.gems && st.res.gold - r0.gold === 20 * (10 + 20 * 3 + 20), 'twenty boss-only Resonance Scar replays: 0 gems and 1,800 gold (before 17B: 500 gems and 19,800 gold)');

/* ---------- a first clear finished from the boss after a defeat still pays in full ---------- */
st = opened(fresh(), 'gatheringhall'); team(st); R.startRun(st, 'gatheringhall', st.aminas.map((a) => a.uid));
runTo(st, 8); ok(st.run && st.run.battle === 9, 'reached the boss');
R.resolveBattle(st, lose(R.createBattle(st, seeded(1)))); ok(!st.run && st.dungeon.gatheringhall.next === 9, 'a defeat keeps the place');
r0 = res(st); R.startRun(st, 'gatheringhall', st.aminas.map((a) => a.uid)); ok(st.run.start === 9, 'the retry starts at the boss');
out = runTo(st); ok(out.first && !out.partial && st.res.gems - r0.gems === Math.round(3 * W.dungeonRewardMult(st)) + 3, 'its first clear pays in full (first-clear gems and the boss section\'s gems)');
const g1 = st.res.gems; R.startRun(st, 'gatheringhall', st.aminas.map((a) => a.uid), { from: 9 }); runTo(st); ok(st.res.gems === g1, 'and the next boss-only fight pays no gems');

/* ---------- one-time rewards are not repeated by retrying, reloading or importing ---------- */
st = fresh(); team(st); R.startRun(st, 'forgottenroad', st.aminas.map((a) => a.uid)); runTo(st, 2); // section 1 done
const afterSec = res(st); R.startRun(st, 'forgottenroad', st.aminas.map((a) => a.uid)); R.resolveBattle(st, lose(R.createBattle(st, seeded(2))));
R.startRun(st, 'forgottenroad', st.aminas.map((a) => a.uid)); ok(st.run.battle === 3 && st.dungeon.forgottenroad.floors[0], 'after a defeat the run resumes at battle 4, section 1 still claimed');
const saved = JSON.stringify(st); const st2 = S.hydrate(JSON.parse(saved)).st; ok(st2.run && st2.run.battle === 3 && st2.dungeon.forgottenroad.floors[0], 'a saved and reloaded run keeps its place and its claimed sections');
out = runTo(st2); ok(out.first && st2.res.gold > afterSec.gold, 'finishing after a reload pays the first clear once');
const twice = R.resolveBattle(st2, win(B.create([B.fighter('lumifern', 5)], B.fighter('acinus', 2))));
ok(twice.invalid && st2.dungeon.forgottenroad.clears === 1, 'resolving again after the run has ended is refused (no double payment)');
if (A.SaveFile) {
  const p = A.SaveFile.parse(A.SaveFile.exportFile ? (S.state = st2, A.SaveFile.exportFile().text) : JSON.stringify(st2));
  if (p && p.ok) { A.SaveFile.apply(p); const st3 = S.state; const gm = st3.res.gems; R.startRun(st3, 'forgottenroad', st3.aminas.map((a) => a.uid), { from: 0 }); out = runTo(st3);
    ok(!out.first && st3.res.gems === gm && st3.dungeon.forgottenroad.clears === 2, 'an imported save replays as a repeat: no first-clear reward again'); }
  else ok(false, 'export/import round trip (' + (p && p.reason) + ')');
} else ok(true, 'save files: covered by savefile16b (no SaveFile in this harness)');
// an old save from before Phase 17B: a run without a start, and a legacy dungeon already cleared several times
st = opened(fresh(), 'reliquary'); team(st); st.dungeon.reliquary = { clears: 4, floors: [true, true, true, true], next: 0 }; st.run = { d: 'reliquary', battle: 9, uids: st.aminas.map((a) => a.uid), hp: {}, gold: 0, food: 0 }; st.aminas.forEach((a) => (st.run.hp[a.uid] = 999));
r0 = res(st); out = runTo(st); ok(out.cleared && !out.partial && st.res.gems === r0.gems && st.res.gold - r0.gold === 10 + 6 * 3 + 20 + Math.round(50 * W.dungeonRewardMult(st)), 'an older save mid-run (no start recorded) finishes as a full replay: the repeat reward, no gems');

/* ---------- the run-up to the boss ---------- */
const DUN = D.CAMPAIGN.starter.dungeons;
ok(DUN.every((id) => D.DUNGEONS[id].battles.length === 10 && D.DUNGEONS[id].battles[9].boss), 'still ten dungeons of ten battles, the tenth a boss');
ok(DUN.every((id) => { const b8 = D.DUNGEONS[id].battles[8], boss = D.DUNGEONS[id].battles[9]; return b8.herald && (boss.move ? b8.move === boss.move : b8.mech && b8.mech.type === 'barrier'); }), 'battle 9 rehearses each boss: its charged move, or a single barrier');
ok(DUN.every((id) => D.DUNGEONS[id].battles.slice(6, 9).every((b) => { const s = D.SPECIES[b.sp]; return s.stage >= (b.lv >= 22 ? 3 : b.lv >= 12 ? 2 : 1); })), 'battles 7-9 use the form their level calls for');
ok(DUN.every((id) => D.DUNGEONS[id].battles.slice(0, 6).every((b) => b.sp === b.base17.sp)), 'battles 1-6 are unchanged');
ok(DUN.every((id) => D.DUNGEONS[id].battles.every((b) => D.SPECIES[b.base17.sp].line === D.SPECIES[b.sp].line)), 'every foe is still of the same line as before (only its form changes)');
ok(D.DUNGEONS.coldkiln.battles[9].lv === 11 && D.DUNGEONS.coldkiln.battles[9].sp === 'pyroforge' && D.DUNGEONS.coldkiln.battles[9].hpMult === 1.55 && D.DUNGEONS.coldkiln.battles[9].move === 'kilnflare', 'the Kiln Mother: level 12 → 11, the same evolved form, health and Kiln Flare');

/* ---------- quests that point at islands nobody can open yet ---------- */
st = fresh(); ['m_wilds', 'm_stone'].forEach(() => {}); D.QUESTS.forEach((q) => { if (!q.side && q.id !== 'm_wilds') st.missions[q.id] = 'claimed'; });
st.missions.m_wilds = 'claimed';
// Phase 19C: Obsidian Reach is ready, so The Dark Shore is listed once Beyond the Shallows is done (the Forest Crown,
// which opens it, can be fought); Above the Clouds stays hidden while the Celestial Crown is not ready.
ok(Q.status(st, Q.get('s_reach')) !== 'locked' && Q.status(st, Q.get('s_crown')) === 'locked', 'The Dark Shore is listed (Phase 19C: Obsidian Reach is ready); Above the Clouds stays hidden: nothing can open the Celestial Crown yet');
ok(Q.status(st, Q.get('s_wilds_farm')) !== 'locked' && Q.status(st, Q.get('s_wilds_clear')) !== 'locked', 'quests on the Verdant Wilds (which can be opened) are unaffected');
ok(Q.visible(st).some((q) => q.id === 's_reach') && !Q.visible(st).some((q) => q.id === 's_crown'), 'only The Dark Shore appears in the quest list');
st.missions.s_crown = 'claimed'; ok(Q.status(st, Q.get('s_crown')) === 'claimed', 'a quest already claimed keeps its state'); st.missions.s_crown = undefined;
// Phase 18B: a save that opened the Celestial Crown in an older version keeps its quest hidden, record untouched, until it is ready.
st.missions.s_reach = 'claimed'; st.islands.celestial = { unlocked: true, obstacles: {} }; ok(Q.status(st, Q.get('s_crown')) !== 'locked' && Q.status(st, Q.get('s_crown')) !== 'claimable' && !W.islandUnlocked(st, 'celestial'), 'a save where the Celestial Crown was bought in an older version: since Phase 20C the quest is listed, but cannot be completed until the Forge Heart opens the island (the purchase alone no longer counts)');
D.ISLAND_LIVE.celestial = true; if (D.C20) D.C20.live = true; ok(Q.status(st, Q.get('s_crown')) !== 'locked', 'and would show it once the Celestial Crown is marked ready, with its campaign (Phase 20B: both switches; after The Dark Shore)'); D.ISLAND_LIVE.celestial = false; if (D.C20) D.C20.live = false; delete st.islands.celestial; st.missions.s_reach = undefined;
ok(D.QUESTS.some((q) => q.id === 's_reach') && D.QUESTS.some((q) => q.id === 's_crown'), 'the quest data itself is untouched');

/* ---------- the guardian brief ---------- */
st = fresh(); const u2 = team(st);
let bb = R.bossBrief(st, 'coldkiln', u2); ok(bb && !bb.known && !bb.els && bb.title === 'The Kiln Mother' && bb.move === 'Kiln Flare', 'before you meet the Kiln Mother: its title and charged move only (as the dungeon card shows), not its element');
st.seen.pyroforge = true; bb = R.bossBrief(st, 'coldkiln', u2);
ok(bb.known && bb.els[0] === 'earth' && bb.weakTo.indexOf('water') >= 0 && bb.weakTo.indexOf('nature') >= 0 && bb.resists.indexOf('wind') >= 0, 'once met: Earth, weak to Water and Nature, resists Wind');
ok(bb.advice.some((x) => x.k === 'good' && /weakness/.test(x.t)) && bb.advice.some((x) => /guard|soak/i.test(x.t)), 'advice about the chosen party: who hits its weakness, and an answer to its charge');
bb = R.bossBrief(st, 'heartwood', u2); ok(!bb.known && bb.advice.some((x) => /shifts/.test(x.t)), 'the Heartwood Stag: an unmet guardian, with the prism tip');
done('rewards17b');
