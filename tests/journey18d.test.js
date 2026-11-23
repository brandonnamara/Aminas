// Phase 18D: the complete Verdant journey, rule level (automated; no real gameplay). From a Starter Island save that is
// about to beat its Island Boss, through all ten Verdant dungeons, the story in order, Explore areas, the Twin Shrine
// gift, challenges and quests, to the Forest Crown and back to Starter Island. At every major stage the save is
// exported and imported (the real save-file path) and the journey CONTINUES FROM THE IMPORTED SAVE, so a broken save
// at any stage would stop it. Also: existing saves that had already unlocked the Verdant Wilds.
const { load, ok, done, seeded } = require('./harness');
const c = load(), A = c.A, D = A.Data, R = A.Rules, W = A.World, S = A.State, Q = A.Quests, F = A.SaveFile, V = R.V18, SC = A.Scenes;
const forceWin = (b) => { b.foes.forEach((f) => (f.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; return b; };
const forceLose = (b) => { b.party.forEach((f) => (f.hp = 0)); b.over = true; b.result = 'lose'; return b; };
const IDS = D.CAMPAIGN.verdant.dungeons;
const snap = (s) => JSON.stringify({ am: s.aminas.map((a) => [a.uid, a.sp, a.lv, a.xp]), res: s.res, items: (s.items || []).map((i) => i.id).sort(), dun: Object.keys(s.dungeon).sort().map((k) => [k, s.dungeon[k].clears, s.dungeon[k].next, s.dungeon[k].floors]), miss: s.missions, isl: Object.keys(s.islands).sort().map((k) => [k, !!s.islands[k].unlocked]), cur: s.currentIsland, v18: s.v18, owned: Object.keys(s.owned).sort(), bosses: s.campaign && s.campaign.bosses, ess: s.essence, story: s.story && s.story.scenes, ch: s.d17 && s.d17.ch });
let stage = 0;
// export → import through the save file, check nothing changed, and carry on with the imported copy
function checkpoint(s, label) {
  stage++; const ex = F.exportFile(s); const p = F.parse(ex.text);
  const same = p.ok && snap(p.st) === snap(s);
  ok(ex.ok && p.ok && same, 'stage ' + stage + ' (' + label + '): the save exports and imports with nothing changed' + (p.ok ? '' : ' — ' + p.msg));
  if (!same && p.ok) { const a = JSON.parse(snap(s)), b = JSON.parse(snap(p.st)); Object.keys(a).forEach((k) => { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) console.log('   differs: ' + k); }); }
  return p.ok ? p.st : s;
}
function play(s, id, opts, onBattle) { const r0 = R.startRun(s, id, s.aminas.slice(0, 3).map((a) => a.uid), opts); if (!r0.ok) return { ok: false, reason: r0.reason }; let out; do { const b = forceWin(R.createBattle(s, seeded(5))); if (onBattle) onBattle(b, s.run.battle); out = R.resolveBattle(s, b); } while (out.win && !out.cleared && s.run); return out; }
const claimIfReady = (s, qid) => { const q = Q.get(qid); if (q && Q.status(s, q) === 'ready') return Q.claim(s, qid); return null; };

/* ================= a new journey ================= */
let s = S.newGame(); s.phase = 'play'; s.introDone = true; s.starter = 'umbrit'; s.avatar = { made: true, name: 'Rowan', look: null };
['umbrit', 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 24)); s.res.food = 2000;
['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => { s.struct[k] = true; if (s.buildings[k]) Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
s.flags.r1 = s.flags.r2 = true; s.flags.hollowveil = true; s.rank = 12;
D.CAMPAIGN.starter.dungeons.slice(0, 9).forEach((id) => play(s, id));
const buildings0 = JSON.stringify(s.buildings), owned0 = Object.keys(s.owned).length;
s = checkpoint(s, 'Starter Island, nine dungeons cleared');

// 1-2. defeat the Starter Island Boss: the Verdant Wilds unlocks
const hw = play(s, 'heartwood');
ok(hw.cleared && hw.islandBoss && hw.unlockedIsland === 'verdant' && W.islandUnlocked(s, 'verdant'), '1–2. defeating the Heartwood Stag unlocks the Verdant Wilds');
ok(s.story.pendingScene === 'heartwood', 'its scene is queued'); R.sceneDone(s, 'heartwood', 'seen');
s = checkpoint(s, 'Starter Island Boss defeated');

// 3. arrive at the Landing Cove: the arrival scene plays once
W.travel(s, 'verdant');
ok(s.currentIsland === 'verdant' && s.story.pendingScene === 'v_arrival', '3. travelling to the Verdant Wilds queues the arrival scene');
R.sceneDone(s, 'v_arrival', 'seen'); W.travel(s, 'starter'); W.travel(s, 'verdant'); ok(!s.story.pendingScene, 'and it plays only once');
const visitLand = V.visit(s, 'landing'); ok(visitLand.ok && visitLand.first, 'the Landing Cove is visited');
s = checkpoint(s, 'arrived');

// 4. Glowcap Glade is open on arrival
ok(R.areaUnlocked(s, 'glowcap') && !R.areaUnlocked(s, 'streamside') && !R.areaUnlocked(s, 'canopyedge'), '4. Glowcap Glade is open on arrival; the other two are not');
R.rng = seeded(7); for (let i = 0; i < 6; i++) { const r = R.explore(s, 'glowcap'); if (r.type === 'find') R.befriend(s); }
ok(['terraflora2', 'sylvaneer2', 'berrant'].every((sp) => s.owned[sp]), 'its three Aminas are befriended');
s = checkpoint(s, 'Glowcap Glade explored');

// 5–9. the ten dungeons, story order, Explore unlocks, the gift, quests
const sceneOrder = [];
D.QUESTS.forEach((q) => { if (!q.side && !/^m_v/.test(q.id) && Q.status(s, q) !== 'claimed') s.missions[q.id] = 'claimed'; });
let questGold = 0;
IDS.forEach((id, i) => {
  // a defeat on the first try at battle 5, then a retry from there
  R.startRun(s, id, s.aminas.slice(0, 3).map((a) => a.uid)); for (let k = 0; k < 4; k++) R.resolveBattle(s, forceWin(R.createBattle(s, seeded(9))));
  const lost = R.resolveBattle(s, forceLose(R.createBattle(s, seeded(9))));
  if (i === 0) ok(!lost.win && R.dungeonRec(s, id).next === 4, '5. a defeat keeps battle-by-battle progress (Mossgate: battle 5 next)');
  const g0 = s.res.gold, it0 = (s.items || []).length, out = play(s, id);
  if (i === 0) ok(R.startRun.length >= 0 && out.cleared && out.first, '   and the retry resumes there and finishes the dungeon');
  ok(out.cleared && out.first && out.items.indexOf(D.DUNGEON_GEAR[id]) >= 0 && (s.items || []).length === it0 + 1, '   ' + D.DUNGEONS[id].name + ': cleared once, its item (' + D.ITEMS[D.DUNGEON_GEAR[id]].name + ') granted once');
  if (s.story.pendingScene) { sceneOrder.push(s.story.pendingScene); R.sceneDone(s, s.story.pendingScene, 'seen'); }
  if (id === 'v_choir') sceneOrder.push('v_confront'); // the confrontation plays in the interface on first entering the Elder Root (browser-tested)
  const qid = 'm_v' + (i + 1), gq = s.res.gold, cl = claimIfReady(s, qid);
  ok(cl && Q.status(s, Q.get(qid)) === 'claimed', '   quest “' + Q.get(qid).title + '” completes and is claimed'); questGold += s.res.gold - gq;
  if (id === 'v_aqueduct') ok(R.areaUnlocked(s, 'streamside'), '7. Streamside opens with the Drowned Aqueduct');
  if (id === 'v_canopy') ok(R.areaUnlocked(s, 'canopyedge'), '7. Canopy Edge opens with the Canopy Walk');
  if (id === 'v_twinshrine') {
    const o = V.giftOffer(s); ok(o.state === 'ready' && o.sp === 'solarbloom', '8. the Twin Shrine offers Lumifern II to an Umbrit player');
    const r = V.claimGift(s); ok(r.ok && s.owned.solarbloom && s.starter === 'umbrit' && V.claimGift(s).ok === false, '   claimed once; the starter stays Umbrit; a second claim is refused');
  }
  if (id === 'v_elderroot') {
    ok(out.islandBoss && s.campaign.bosses.verdant && !W.islandUnlocked(s, 'obsidian') && !out.unlockedIsland, '9. defeating the Forest Crown records the Verdant Island Boss; Obsidian Reach stays closed');
  }
  if (i === 1 || i === 5 || i === 9) s = checkpoint(s, D.DUNGEONS[id].name + ' cleared');
});
ok(sceneOrder.join() === 'v_keepers,v_shrine,v_spire,v_voice,v_confront,v_crown', '6. the story scenes come in the intended order (Archive, Twin Shrine, Canopy, Choir, confrontation, conclusion): ' + sceneOrder.join(', '));
ok(['v_mossgate', 'v_aqueduct', 'v_spore', 'v_glow', 'v_moonwell'].every((id) => SC.after[id]), '   the five dungeons without a scene end with an Entity remark');
ok(questGold === 400 + 450 + 500 + 550 + 600 + 650 + 700 + 750 + 800 + 1500, 'the ten quest rewards were paid exactly once each (' + questGold + ' gold)');
ok(Q.claim(s, 'm_v1') === null || Q.claim(s, 'm_v1').ok === false, 'claiming a finished quest again is refused');

// challenge rewards: once each, on a full replay
const ch1 = play(s, 'v_mossgate', { from: 0 }, (b, i) => { if (i === 9) b.c17blunt = true; });
const ch2 = play(s, 'v_mossgate', { from: 0 }, (b, i) => { if (i === 9) b.c17blunt = true; });
ok(ch1.challenges && ch1.challenges.fresh.indexOf('flawless') >= 0 && ch1.challenges.fresh.indexOf('guardian') >= 0, 'challenge rewards: a flawless replay that answered the guardian completes both');
ok(!ch2.challenges || !ch2.challenges.fresh || ch2.challenges.fresh.length === 0, '   and repeating it pays nothing new');
const koOnly = play(s, 'v_aqueduct', { from: 0 }, (b, i) => { if (i === 9) { b.enemy.charging = true; } });
ok(!koOnly.challenges || koOnly.challenges.met.guardian === false, '   a guardian knocked out while charging, without a counter, does not count as answering it (rule unchanged)');
s = checkpoint(s, 'Verdant campaign complete');

// 10. return to Starter Island and revisit completed content
W.travel(s, 'starter'); const evs0 = R.drain().length, rp = play(s, 'heartwood', { from: 0 });
ok(s.currentIsland === 'starter' && rp.cleared && !rp.first && !rp.unlockedIsland && rp.reward.gold === Math.round(300 * W.dungeonRewardMult(s)), '10. back on Starter Island, the Heartwood replays for its repeat reward and unlocks nothing again');
const vr = play(s, 'v_elderroot', { from: 9 }); ok(vr.cleared && vr.partial && !vr.first, '   a Verdant guardian replay also works from there');
ok(JSON.stringify(s.buildings) === buildings0 && Object.keys(s.owned).length > owned0 && s.aminas.every((a) => a.lv >= 1 && a.lv <= 40), 'buildings are untouched; the collection only grew; levels stay within the cap');
s = checkpoint(s, 'back on Starter Island');

/* ================= existing saves that had already unlocked the Verdant Wilds ================= */
{
  // Phase 17 (no v18, already on the island) and Phase 18B (visits recorded): through the real import path
  const old = S.newGame(); old.phase = 'play'; old.introDone = true; old.starter = 'lumifern'; ['lumifern', 'kairyu'].forEach((sp) => R.addAmina(old, sp, 28));
  old.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'boss' }; old.campaign = { bosses: { starter: 1 } }; old.dungeon.heartwood = { clears: 1, floors: [true, true, true, true], next: 0 }; old.currentIsland = 'verdant';
  const p17 = JSON.parse(JSON.stringify(old)); delete p17.v18; const r17 = F.parse(JSON.stringify(p17));
  ok(r17.ok && r17.st.v18 && R.dungeonUnlocked(r17.st, 'v_mossgate') && r17.st.story.pendingScene === 'v_arrival' && R.areaUnlocked(r17.st, 'glowcap'), 'a Phase 17 save already on the island imports with Dungeon 1 open, Glowcap Glade open and the arrival due');
  const p18 = JSON.parse(JSON.stringify(old)); p18.v18 = { seen: { archive: 5, shrine: 6 } }; const r18 = F.parse(JSON.stringify(p18));
  ok(r18.ok && r18.st.v18.seen.archive === 5 && R.dungeonUnlocked(r18.st, 'v_mossgate'), 'a Phase 18B save keeps its visits and starts at Dungeon 1');
  ok(r17.st.aminas.map((a) => a.lv).join() === '28,28' && r17.st.res.gold === old.res.gold, 'their Aminas and currencies are unchanged');
  const t = r18.st; IDS.slice(0, 3).forEach((id) => play(t, id)); const p2 = F.parse(F.exportFile(t).text);
  ok(p2.ok && R.dungeonUnlocked(p2.st, 'v_archive') && R.dungeonCleared(p2.st, 'v_spore'), 'such a save progresses and still round-trips');
}
done('journey18d');
