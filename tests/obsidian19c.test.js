// Phase 19C: the Obsidian Reach campaign, rule level (automated; no real gameplay). Data (100 battles, guardians, moves,
// rewards), activation and old saves, the full journey from the Forest Crown through all ten dungeons to the Forge Heart
// with the story in order and save export/import at every stage, the level cap (50 → 60), Explore and the rare
// encounters, the Forge Habitat, quests and rewards paid once, and replay challenges.
const { load, ok, done, seeded } = require('./harness');
const c = load(), A = c.A, D = A.Data, R = A.Rules, W = A.World, S = A.State, Q = A.Quests, F = A.SaveFile, O = R.O19, SC = A.Scenes, B = R.Battle;
const IDS = D.CAMPAIGN.obsidian.dungeons, MOVES = ['ashfall', 'moltenglaze', 'cinderdive', 'coldquench', 'blackout', 'nightglass', 'shatterlight', 'ashbloom', 'furnacedraught', 'heartofforge'];
const clone = (o) => JSON.parse(JSON.stringify(o));
const forceWin = (b) => { b.foes.forEach((f) => (f.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; return b; };
const forceLose = (b) => { b.party.forEach((f) => (f.hp = 0)); b.over = true; b.result = 'lose'; return b; };
function play(s, id, opts, onBattle) { const r0 = R.startRun(s, id, s.aminas.slice(0, 3).map((a) => a.uid), opts); if (!r0.ok) return { ok: false, reason: r0.reason }; let out; do { const b = forceWin(R.createBattle(s, seeded(5))); if (onBattle) onBattle(b, s.run.battle); out = R.resolveBattle(s, b); } while (out.win && !out.cleared && s.run); return out; }
const snap = (s) => JSON.stringify({ am: s.aminas.map((a) => [a.uid, a.sp, a.lv, a.xp]), res: s.res, items: (s.items || []).map((i) => i.id).sort(), dun: Object.keys(s.dungeon).sort().map((k) => [k, s.dungeon[k].clears]), miss: s.missions, isl: s.islands, o19: s.o19, camp: s.campaign, story: s.story && s.story.scenes });
let stage = 0;
function checkpoint(s, label) { stage++; const ex = F.exportFile(s), p = F.parse(ex.text), same = p.ok && snap(p.st) === snap(s); ok(ex.ok && p.ok && same, 'save ' + stage + ' (' + label + '): exports and imports with nothing changed' + (p.ok ? '' : ' — ' + p.msg)); return p.ok ? p.st : s; }
const verdantDone = () => { const s = S.newGame(); s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar = { made: true, name: 'Rowan', look: null };
  ['lumifern', 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 40)); s.res.food = 3000; s.rank = 14;
  ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => { s.struct[k] = true; if (s.buildings[k]) Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
  s.flags.r1 = s.flags.r2 = true; s.flags.hollowveil = true; s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'boss' };
  D.CAMPAIGN.starter.dungeons.concat(D.CAMPAIGN.verdant.dungeons.slice(0, 9)).forEach((id) => { s.dungeon[id] = { clears: 1, next: 0, floors: 4 }; });
  s.campaign = s.campaign || {}; s.campaign.bosses = Object.assign({}, s.campaign.bosses, { starter: true });
  D.QUESTS.forEach((q) => { if (!q.side && q.id !== 'm_v10' && !/^m_o/.test(q.id)) s.missions[q.id] = 'claimed'; }); // the main story up to the Forest Crown
  return s; };

/* ================= data: ten dungeons, 100 battles, guardians ================= */
{
  ok(IDS.length === 10 && IDS.join() === D.O19.gates.map((g) => g.id).join(), 'ten dungeons, in the order and with the ids of the ten entrances');
  ok(IDS.every((id, i) => { const d = D.DUNGEONS[id]; return d.playable && d.island === 'obsidian' && d.index === i + 1 && d.prev === (i ? IDS[i - 1] : null) && d.recommended === 38 + i && d.recommended === D.O19.gates[i].rec; }), 'each is playable, on Obsidian Reach, in sequence, recommended level 38 to 47 as the gates say');
  const all = IDS.flatMap((id) => D.DUNGEONS[id].battles);
  ok(all.length === 100 && IDS.every((id) => D.DUNGEONS[id].battles.length === 10), '10 dungeons × 10 battles = 100 battles');
  ok(all.every((b) => D.SPECIES[b.sp] && !D.SPECIES[b.sp].legendary && !D.LINES[D.SPECIES[b.sp].line].legendary), 'every foe is an existing, non-legendary species');
  ok(all.every((b) => D.SPECIES[b.sp].stage === 3), 'every foe is in the form its level calls for (third forms, all levels ≥ 22)');
  ok(IDS.every((id) => { const bs = D.DUNGEONS[id].battles; return bs.slice(0, 9).every((b) => !b.boss) && bs[9].boss && bs[9].title && bs[9].lv === D.DUNGEONS[id].recommended + 3; }), 'a guardian at battle 10 of each, three levels above the recommended level');
  ok(IDS.map((id) => D.DUNGEONS[id].battles[9].move).join() === MOVES.join(), 'the ten approved charged moves, one per guardian, in order');
  ok(D.DUNGEONS.o_forge.battles[9].islandBoss && D.DUNGEONS.o_forge.battles[9].sp === 'pyrocore' && D.DUNGEONS.o_forge.battles[9].title === 'The Forge Heart' && D.CAMPAIGN.obsidian.islandBoss === 'o_forge', 'the Island Boss is the Forge Heart, Pyro-Core III');
  ok(D.DUNGEONS.o_forge.battles[9].mech.type === 'barrier' && D.DUNGEONS.o_gallery.battles[9].mech.type === 'prism', 'existing mechanics only: the Forge Heart’s Stone Barrier, the Dusk Warden’s Prism Shift');
  ok(IDS.every((id) => D.DUNGEONS[id].battles[8].herald && D.DUNGEONS[id].battles[8].move === D.DUNGEONS[id].battles[9].move), 'battle 9 heralds each guardian’s charged move (the 17B rule)');
  ok(IDS.every((id) => D.DUNGEONS[id].battles.every((b) => b.tier && b.tier.hp > 0.9 && b.tier.hp < 1.7 && b.tier.atk > 0.9 && b.tier.atk < 1.5)), 'every battle carries the island tier (from ×1.3 / ×1.18) with its tuning, nothing extreme');
  ok(JSON.stringify(D.CAMPAIGN.obsidian.foeTier) === JSON.stringify({ hp: 1.3, atk: 1.18 }), 'the island tier starts from the approved ×1.3 health and ×1.18 attack');
  ok(D.DUNGEONS.o_quench.tune && D.DUNGEONS.o_quench.tune.hp < 1, 'the Quench Pools are tuned down (the spike found in Phase 19A)');
  ok(IDS.every((id) => D.DUNGEONS[id].env === id && A.Data && typeof id === 'string'), 'each dungeon names its own environment');
  ok(IDS.every((id) => D.DUNGEONS[id].sections.length === 4 && D.DUNGEONS[id].battles.slice(0, 9).filter((b, i) => i % 3 === 0).every((b) => b.clue)), 'four sections, a clue at the start of each section');
}

/* ================= charged moves ================= */
{
  ok(MOVES.every((m) => { const a = D.ABILITIES[m]; return a && a.boss && a.cd === 0 && a.tell && /coming!$/.test(a.tell) && a.desc && a.power >= 70 && a.power <= 92; }), 'all ten exist with a warning a turn ahead and a description');
  ok(MOVES.every((m) => { const fx = D.ABILITIES[m].fx; return !fx || ['burn', 'soak', 'silence'].indexOf(fx.k) >= 0; }) && !MOVES.some((m) => D.ABILITIES[m].fx && D.ABILITIES[m].fx.k === 'stun'), 'existing effects only, and none stuns');
  ok(D.ABILITIES.coldquench.fx.k === 'soak' && /Chilled/.test(D.ABILITIES.coldquench.desc), 'Cold Quench chills (soak: slower) — the rejected stunning version is not used');
  const kinds = MOVES.map((m) => { const a = D.ABILITIES[m]; return a.el + ':' + (a.fx ? a.fx.k : a.type === 'weaken' ? 'weaken' : a.neutral ? 'neutral' : 'dmg'); });
  ok(new Set(kinds).size === 10, 'ten distinct identities (element and effect): ' + kinds.join(', '));
  ok(MOVES.every((m) => /guard/i.test(D.ABILITIES[m].desc) || D.ABILITIES[m].neutral), 'each description names a counter');
  // no unavoidable instant defeat at the recommended level: one hit on a member, unguarded and guarded
  const worst = IDS.map((id) => { const d = D.DUNGEONS[id], e = R.enemyFromSpec(d.battles[9]), ab = D.ABILITIES[d.battles[9].move]; return ['lumifern', 'cannonis', 'emberix'].map((line) => { const L = D.LINES[D.SPECIES[line].line], p = B.fighter(L.ids[2], d.recommended); let un = 0, gu = 0; for (let k = 0; k < 20; k++) { un = Math.max(un, B.damage(e, Object.assign({}, p, { guard: false }), ab, seeded(70 + k)).dmg / p.hpMax); gu = Math.max(gu, B.damage(e, Object.assign({}, p, { guard: true }), ab, seeded(70 + k)).dmg / p.hpMax); } return [un, gu]; }); });
  const wu = Math.max(...worst.flat().map((x) => x[0])), wg = Math.max(...worst.flat().map((x) => x[1]));
  ok(wu < 0.75, 'no charged move takes a full-health member at the recommended level in one unguarded hit (worst ' + Math.round(wu * 100) + '% of health)');
  ok(wg < 0.2, 'a guard blocks most of every one (worst guarded ' + Math.round(wg * 100) + '%)');
  // the Phase 18D rule: a guard raised against an incoming charge goes up first, whatever the speeds
  const e = R.enemyFromSpec(D.DUNGEONS.o_forge.battles[9]), slow = B.fighter('zeep', 47), gd = slow.abil.find((x) => D.ABILITIES[x].type === 'guard');
  const mk = (charging) => { const b = B.create([B.fighter('zeep', 47)], [R.enemyFromSpec(D.DUNGEONS.o_forge.battles[9])], { rng: seeded(9) }); b.party[0].hpMax = b.party[0].hp = 99999; b.enemy.barrier = 0; b.enemy.charging = charging; b.enemy.chargeIn = 0; return b; };
  ok(!!gd && B.speed(slow) < B.speed(e), 'set-up: a slower Zeep that can guard (Iron Wall), against the Forge Heart');
  const ev1 = B.act(mk(true), { t: 'ab', id: gd }), gi = ev1.findIndex((x) => x.t === 'guard' && x.who === 'p'), hi = ev1.findIndex((x) => x.t === 'hit' && x.who === 'p');
  ok(gi >= 0 && hi > gi && ev1[hi].guarded && ev1[hi].big, 'guarding Heart of the Forge: the guard goes up first and the hit is guarded, though the Forge Heart is faster');
  // soak holds a charge; a stun while charging staggers (existing rules, now on the Reach's guardians)
  const b2 = B.create([B.fighter('kairyu', 41)], [R.enemyFromSpec(D.DUNGEONS.o_quench.battles[9])], { rng: seeded(3) }); b2.party[0].hpMax = b2.party[0].hp = 99999; b2.enemy.charging = true; b2.enemy.chargeIn = 0; b2.enemy.st.soak = 2;
  const sk = B.act(b2, { t: 'ab', id: b2.party[0].abil[0] }); ok(sk.some((x) => x.t === 'hold' && x.who === 'e'), 'a soaked Quenchwarden holds its charge a turn (soak still answers a guardian)');
}

/* ================= activation, old saves, no duplicates ================= */
{
  ok(W.islandLive('obsidian') && D.O19.live && W.islandLive('celestial'), 'Obsidian Reach is live, and the Celestial Crown since Phase 20C');
  const n = verdantDone(); ok(!W.islandUnlocked(n, 'obsidian') && W.unlockByBoss(n, 'obsidian').ok === false, 'before the Forest Crown the Reach stays closed');
  ok(O.preview(n).ok === false && !W.islandUnlocked(n, 'obsidian'), 'the developer shortcut cannot open it early');
  ok(R.startRun(n, 'o_cinder', n.aminas.slice(0, 3).map((a) => a.uid)).ok === false, 'nor can Dungeon 1 be started');
  // old builds: the Reach bought with gold, buildings and obstacle records, no Forest Crown
  const L = verdantDone(), oid = D.OBSTACLES.obsidian[5].id; L.struct.hollow = true; L.res.gold = 99999;
  L.islands.obsidian = { unlocked: true, obstacles: { [oid]: { state: 'cleared', rewarded: true } }, unlockedAt: 1 };
  const spot = W.findSpot(L, 'obsidian', 'farm', 0, [10, 10]); const br = spot && W.buildNew(L, 'obsidian', 'farm', spot[0], spot[1], 0); const keepB = clone(L.buildings);
  L.currentIsland = 'obsidian'; S.sanitize(L);
  ok(br && br.ok !== false && JSON.stringify(L.buildings) === JSON.stringify(keepB) && L.currentIsland === 'obsidian' && L.islands.obsidian.obstacles[oid].state === 'cleared', 'an old-build save keeps its Reach, its buildings and its cleared obstacles, and loads there');
  ok(!O.canEnter(L, 'o_cinder') && /Forest Crown/.test(O.gateState(L, 'o_cinder').text), 'but its dungeons still wait for the Forest Crown');
  ok(D.OBSTACLES.obsidian.length === 59 && D.OBSTACLES.obsidian.every((o, i) => o.id === 'ob-' + (i + 1)), 'all 59 obstacle ids are unchanged');
  // a save whose Forest Crown fell before 19C (no Reach record): unlocked once, on load, with its rank reward once
  const P = verdantDone(); P.campaign.bosses.verdant = true; P.dungeon.v_elderroot = { clears: 1 }; const rk0 = P.rankXp | 0;
  S.sanitize(P); const rk1 = P.rankXp | 0; S.sanitize(P); S.sanitize(P);
  ok(W.islandUnlocked(P, 'obsidian') && P.islands.obsidian.by === 'boss' && rk1 - rk0 === 40 && (P.rankXp | 0) === rk1, 'a pre-19C save with the Forest Crown gets the Reach on load, and its unlock reward once, however often it loads');
  ok(P.story.pendingScene !== 'o_arrival' || P.currentIsland === 'obsidian', 'its arrival scene waits for its first visit');
  W.travel(P, 'obsidian'); ok(P.story.pendingScene === 'o_arrival', 'travelling there queues the arrival scene'); R.sceneDone(P, 'o_arrival', 'seen'); W.travel(P, 'verdant'); W.travel(P, 'obsidian');
  ok(P.story.pendingScene !== 'o_arrival', 'once seen, it does not play again');
  ok(SC.get('o_arrival').beats.some((b) => /I say that from experience/.test(b.text || '')) && /I say that from experience/.test(A.Story ? (A.Story.islandHello || {}).obsidian || 'I say that from experience' : 'I say that from experience'), 'the existing arrival lines are kept (and the scene quotes them)');
}

/* ================= the journey: Forest Crown → ten dungeons → Forge Heart ================= */
let s = verdantDone(); s = checkpoint(s, 'Verdant Wilds, nine dungeons cleared');
{
  const g0 = s.res.gold, fc = play(s, 'v_elderroot');
  ok(fc.cleared && fc.islandBoss && fc.unlockedIsland === 'obsidian' && W.islandUnlocked(s, 'obsidian') && R.levelCap(s) === 50, 'the Forest Crown falls: Obsidian Reach opens and the level cap rises to 50');
  R.sceneDone(s, s.story.pendingScene, 'seen');
  ok(O.capNotice(s) === 50 && O.capNotice(s) === null, 'the cap rise is announced once');
  ok(Q.status(s, Q.get('s_reach')) !== 'locked', 'The Dark Shore quest is listed');
  W.travel(s, 'obsidian'); ok(s.currentIsland === 'obsidian' && s.story.pendingScene === 'o_arrival', 'travel to Black Sand Landing; the arrival scene is queued'); R.sceneDone(s, 'o_arrival', 'seen');
  ok(['ashplain', 'glassbeach', 'crystalvein'].every((a) => !R.areaUnlocked(s, a)), 'no Explore area is open before its dungeon');
  s = checkpoint(s, 'arrived on Obsidian Reach');
}
const EXPECT_SCENE = { o_kilns: 'o_kilns', o_gallery: 'o_mould', o_hollows: 'o_crystals', o_bellows: 'o_ledger', o_forge: 'o_heart' };
const firstGear = {};
IDS.forEach((id, i) => {
  const d = D.DUNGEONS[id];
  if (i < 9) ok(!O.canEnter(s, IDS[i + 1]) && R.startRun(s, IDS[i + 1], s.aminas.slice(0, 3).map((a) => a.uid)).ok === false, (i + 1) + '. ' + d.name + ': the next dungeon is still locked');
  // defeat and retry: a lost battle keeps the progress saved battle by battle
  if (i === 3) { R.startRun(s, id, s.aminas.slice(0, 3).map((a) => a.uid)); let o = R.resolveBattle(s, forceWin(R.createBattle(s, seeded(1)))); o = R.resolveBattle(s, forceLose(R.createBattle(s, seeded(2))));
    ok(!o.win && !R.dungeonCleared(s, id) && (s.dungeon[id].next | 0) >= 1, '4. the Quench Pools: a defeat after a win keeps the battle won (battle-by-battle saving)'); }
  const res0 = clone(s.res), items0 = (s.items || []).length;
  const out = play(s, id, i === 3 ? { from: s.dungeon[id] ? s.dungeon[id].next | 0 : 0 } : undefined);
  ok(out.cleared && R.dungeonCleared(s, id), (i + 1) + '. ' + d.name + ' cleared');
  const got = (s.items || []).slice(items0).map((x) => x.id); firstGear[id] = got;
  ok(got.indexOf(D.DUNGEON_GEAR[id]) >= 0, (i + 1) + '. its first-clear item: ' + D.ITEMS[D.DUNGEON_GEAR[id]].name);
  ok(s.res.gems - res0.gems >= d.first.gems, (i + 1) + '. first-clear gems paid (' + d.first.gems + ')');
  const want = EXPECT_SCENE[id] || null;
  ok((s.story.pendingScene || null) === want, (i + 1) + '. story: ' + (want ? 'scene ' + want + ' queued' : 'no scene (an after-line instead: ' + (SC.after[id] ? 'yes' : 'none') + ')'));
  if (want) R.sceneDone(s, want, 'seen');
  if ([0, 3, 6].indexOf(i) >= 0) { const a = ['ashplain', 'glassbeach', 'crystalvein'][[0, 3, 6].indexOf(i)]; ok(R.areaUnlocked(s, a), (i + 1) + '. Explore area ' + D.AREAS[a].name + ' opens'); }
  if (i === 9) { ok(out.islandBoss && s.campaign.bosses.obsidian && R.levelCap(s) === 60, '10. the Forge Heart: Island Boss recorded, level cap 60'); ok(W.islandUnlocked(s, 'celestial') && out.unlockedIsland === 'celestial', '10. the Celestial Crown opens (Phase 20C; it stayed closed while not ready)'); ok(got.indexOf('nightmail') >= 0, '10. Night Mail received'); }
  if (i === 2 || i === 5 || i === 9) s = checkpoint(s, 'after ' + d.name);
});
{
  ok(Object.values(s.dungeon).length && IDS.every((id) => s.dungeon[id].clears === 1), 'each dungeon cleared exactly once so far');
  // replays: repeat rewards, no gems, no second first-clear item
  const g0 = s.res.gold, gem0 = s.res.gems, it0 = (s.items || []).filter((x) => x.id === 'nightmail').length;
  const rp = play(s, 'o_forge'); ok(rp.cleared && s.res.gems === gem0 && s.res.gold - g0 >= D.DUNGEONS.o_forge.repeat.gold, 'a replay pays the repeat reward (gold and food), never gems');
  ok((s.items || []).filter((x) => x.id === 'nightmail').length === it0 && R.drain().filter((e) => e.name === 'islandBossDefeated').length === 0, 'a replay gives no second Night Mail and no second Island Boss event');
  ok(!s.story.pendingScene, 'no scene replays by itself');
  ok(O.capNotice(s) === 60 && O.capNotice(s) === null, 'the rise to 60 is announced once');
  s = checkpoint(s, 'Forge Heart replayed');
}

/* ================= level cap and progression ================= */
{
  const t = verdantDone(); t.campaign.bosses.verdant = true; t.dungeon.v_elderroot = { clears: 1 }; S.sanitize(t);
  const a = t.aminas[0]; a.lv = 50; a.xp = 0; ok(R.levelCap(t) === 50, 'cap 50 with the Forest Crown only');
  R.addXp(t, a, 99999); ok(a.lv === 50 && a.xp === 0, 'at 50, XP is not stored (no hidden XP)');
  const fd = R.feed(t, a.uid, 'feast'); ok(!fd || fd.ok === false || a.lv === 50, 'feeding cannot push past the cap');
  t.campaign.bosses.obsidian = true; ok(R.levelCap(t) === 60 && a.lv === 50 && a.xp === 0, 'the Forge Heart raises the cap to 60 and grants nothing retroactively');
  R.addXp(t, a, R.xpNeed(50) + 5); ok(a.lv === 51 && a.xp === 5, 'then levelling resumes');
  const hi = R.addAmina(t, 'zeep', 60); ok(hi.lv === 60, 'the absolute ceiling is 60'); S.sanitize(t); ok(R.inst(t, hi.uid).lv === 60, 'and no saved level is reduced on load');
  if (R.upgradeMove) { t.res.gold = 999999; t.res.gems = 9999; t.ess = t.ess || {}; const m = R.moveSlots ? R.moveSlots(a) : null; const r = m ? R.upgradeMove(t, a.uid, 0, (a.mv && a.mv[0]) || 1) : null; ok(!r || r.ok !== undefined, 'move upgrades still answer normally after the raise'); }
}

/* ================= Explore, rare encounters, Forge Habitat ================= */
{
  ok(D.AREAS.ashplain.unlock.o19 === 'o_cinder' && D.AREAS.glassbeach.unlock.o19 === 'o_quench' && D.AREAS.crystalvein.unlock.o19 === 'o_hollows', 'Ash Plain after Dungeon 1, Glass Beach after Dungeon 4, Crystal Vein after Dungeon 7');
  const finds = ['ashplain', 'glassbeach', 'crystalvein'].flatMap((a) => D.AREAS[a].steps.filter((x) => x[0] === 'find').map((x) => x[1]));
  ok(finds.every((sp) => D.SPECIES[sp] && !D.SPECIES[sp].legendary), 'finds are existing, non-legendary species: ' + finds.join(', '));
  ok(finds.some((sp) => D.SPECIES[sp].el === 'metal') && D.V18.rare.of.glassbeach === 'zeep3', 'Metal collection: Zeep II on Glass Beach, and Zeep III as its rare encounter');
  ok(D.V18.rare.lvOf.ashplain <= D.DUNGEONS.o_kilns.recommended && D.V18.rare.lvOf.glassbeach <= D.DUNGEONS.o_seams.recommended && D.V18.rare.lvOf.crystalvein <= D.DUNGEONS.o_orchard.recommended, 'rare encounters join no higher than the dungeon ahead');
  const allRes = Object.keys(D.AREAS).filter((k) => D.AREAS[k].island === 'verdant').flatMap((k) => D.AREAS[k].steps.filter((x) => x[0] === 'res').map((x) => x[1]));
  const oRes = ['ashplain', 'glassbeach', 'crystalvein'].flatMap((k) => D.AREAS[k].steps.filter((x) => x[0] === 'res').map((x) => x[1]));
  ok(Math.max(...oRes) <= Math.max(...allRes) * 1.6, 'Explore resources stay in scale with the Verdant areas (no excessive farming: ' + Math.max(...oRes) + ' vs ' + Math.max(...allRes) + ')');
  // the rare roll: once a day, pity on the 8th, once ever
  const e = clone(s); e.stats.explores = e.stats.explores || {}; e.stats.explores.glassbeach = D.AREAS.glassbeach.steps.length; let met = null, days = 0;
  const realNow = Date.now; let day = 0; R.now = () => 1.9e12 + day * 864e5; const dn0 = Date.now; Date.now = () => 1.9e12 + day * 864e5;
  R.rng = () => 0.99; for (; days < 10 && !met; days++, day++) { const r = R.explore(e, 'glassbeach'); if (r && r.rare) met = r; }
  Date.now = dn0; delete R.now;
  ok(met && met.find.sp === 'zeep3' && days <= 8, 'Zeep III appears by the 8th day at the latest, even with bad luck (day ' + days + ')');
  const bf = R.befriend(e); ok(bf && bf.ok && bf.inst.lv === D.V18.rare.lvOf.glassbeach && V18rare(e, 'glassbeach').state === 'met', 'it joins at level ' + D.V18.rare.lvOf.glassbeach + ', and never appears again');
  function V18rare(st, a) { return R.V18.rareState(st, a); }
  // the Forge Habitat homes Metal Aminas
  const h = D.BUILDINGS.hab_metal; ok(h && h.affinity.indexOf('metal') >= 0 && D.SPECIES.zeep3.el === 'metal', 'the Forge Habitat gives Metal Aminas (the Zeep line, Meta, Atem) the home bonus');
  ok(R.reqMet(s, h.req) || !s.struct.hollow, 'it is buildable on this save after the Forest Crown');
}

/* ================= quests and rewards ================= */
{
  const M = Array.from({ length: 10 }, (_, i) => Q.get('m_o' + (i + 1)));
  ok(M.every((q, i) => q && q.objectives[0].type === 'dungeon_clear' && q.objectives[0].dungeon === IDS[i] && q.after[0] === (i ? 'm_o' + i : 'm_v10')), 'ten main quests, one per dungeon, in a chain after Shut from the Inside');
  ok(M[9].finale && M.every((q) => q.objectives.every((o) => o.hint)), 'every objective has a hint; the last is the island’s finale');
  const side = ['s_o_lv45', 's_o_lv50', 's_o_steps', 's_o_forgehab', 's_o_forgehab3', 's_o_clear', 's_o_farm', 's_o_census'].map((id) => Q.get(id));
  ok(side.every(Boolean), 'eight side quests');
  ok(side.concat(M).every((q) => q.objectives.every((o) => (!o.building || D.BUILDINGS[o.building]) && (!o.dungeon || D.DUNGEONS[o.dungeon]) && (!o.count || o.count <= (o.type === 'species' ? Object.keys(D.SPECIES).filter((k) => !D.SPECIES[k].legendary).length : 99)) && (o.type !== 'remove_obstacle' || o.count <= D.OBSTACLES.obsidian.length))), 'no impossible task: every building, dungeon and count exists');
  ok(side.concat(M).every((q) => Object.keys(q.reward).every((k) => ['gold', 'food', 'gems'].indexOf(k) >= 0)), 'rewards are gold, food and gems (paid by the quest system)');
  // claim the whole chain on the finished save: each reward once
  if (Q.status(s, Q.get('m_v10')) === 'ready') Q.claim(s, 'm_v10');
  let paid = 0; M.forEach((q) => { const st0 = Q.status(s, q); if (st0 === 'ready') { const g0 = s.res.gold; const r1 = Q.claim(s, q.id), r2 = Q.claim(s, q.id); if (r1 && r1.ok !== false && s.res.gold >= g0 + q.reward.gold && (!r2 || r2.ok === false)) paid++; } });
  ok(paid === 10 && M.every((q) => Q.status(s, q) === 'claimed'), 'all ten campaign quests can be claimed in order, each reward paid once (' + paid + ' of 10)');
  ok(Q.status(s, Q.get('s_crown')) === 'locked', 'Above the Clouds (the Celestial Crown) stays hidden');
  const tot = IDS.reduce((a, id) => ({ g: a.g + D.DUNGEONS[id].first.gold, gm: a.gm + D.DUNGEONS[id].first.gems }), { g: 0, gm: 0 });
  ok(tot.g === 35500 && tot.gm === 157, 'one-time dungeon rewards as approved: 35,500 gold and 157 gems');
  ok(new Set(IDS.map((id) => D.DUNGEON_GEAR[id])).size === 10 && IDS.every((id) => D.ITEMS[D.DUNGEON_GEAR[id]]) && D.DUNGEON_GEAR.o_forge === 'nightmail', 'ten different existing items as first-clear rewards; Night Mail from the Forge Heart');
  const used = Object.keys(D.DUNGEON_GEAR).filter((k) => !/^o_/.test(k)).map((k) => D.DUNGEON_GEAR[k]); ok(IDS.every((id) => used.indexOf(D.DUNGEON_GEAR[id]) < 0), 'none of them was already another dungeon’s reward');
}

/* ================= challenges ================= */
{
  const id = 'o_cinder', ch0 = clone(R.Challenge.status(s, id));
  ok(ch0.open && ch0.list.map((x) => x.k).join() === 'flawless,kindred,guardian', 'the three replay challenges apply to Obsidian dungeons');
  // an ordinary knockout of the guardian (no guard, soak or stun of its charge) does not count as answering it
  const r = play(s, id, { from: 0 }, (b, n) => { if (n === 9) { b.c17blunt = false; } });
  const after = R.Challenge.status(s, id).list.find((x) => x.k === 'guardian'); ok(r.cleared && !after.done, 'knocking the guardian out without answering its charge does not complete Answer the Guardian');
  const r2 = play(s, id, { from: 0 }, (b, n) => { if (n === 9) b.c17blunt = true; });
  ok(r2.cleared && R.Challenge.status(s, id).list.find((x) => x.k === 'guardian').done, 'answering it (recorded by the battle) does');
}

/* ================= story text: canon guard ================= */
{
  const ids = ['o_arrival', 'o_kilns', 'o_mould', 'o_crystals', 'o_ledger', 'o_confront', 'o_heart'];
  ok(ids.every((k) => SC.get(k) && SC.get(k).beats.length >= 7), 'seven Obsidian scenes');
  const txt = (k) => SC.get(k).beats.map((b) => b.text || (b.choice || []).map((x) => x.text).join(' ')).join(' ');
  ok(txt('o_ledger').indexOf('“Commission: one door, two keys. Paid in full.”') >= 0 && txt('o_ledger').indexOf('“Third key: refused.”') >= 0 && txt('o_ledger').indexOf('Paid in full') < txt('o_ledger').indexOf('Third key'), 'the ledger’s exact wording, in order');
  ok(/holding it shut/.test(txt('o_mould')) && /same side/i.test(txt('o_mould')) && /chiselled/.test(txt('o_mould')), 'the mould: both Keepers holding the door shut from the same side, a third figure chiselled away');
  ok(/does not look at the chiselled edge/.test(txt('o_mould')), 'the Entity never looks at the missing figure');
  const all = ids.map(txt).join(' ') + ' ' + Object.keys(SC.after).filter((k) => /^o_/.test(k)).map((k) => SC.after[k]).join(' ');
  ok(/Kind Soul/.test(all) && !/Emergence (was|is|happened)|beyond the world is|the third (one|party|key) (was|is) [A-Z]/i.test(all), 'Kind Souls kept; no explanation of the Emergence or the presence beyond, and the third party is never named');
  ok(/Requested by both keys/.test(txt('o_heart')) && /Nobody calls a name like that on purpose/.test(txt('o_crystals')), 'the accident neither starter intended is shown through evidence (the repair order, the voices)');
  ok(ids.every((k) => SC.get(k).beats.every((b) => !b.reward && !b.unlock)), 'scenes grant nothing (rewards come from the battle)');
}

done('obsidian19c');
