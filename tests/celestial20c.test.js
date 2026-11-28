// Phase 20C: the Celestial Crown campaign and the end of the main story, rule level (automated; no real gameplay).
// Activation and old saves, 100 battles and the guardians, The Two Keys (two stages, team carried over, Stage II defeat
// restarts the whole encounter, rewards once), the story in order (Ending A, the grief line, both starters), the
// Watcher's Lens at the mount, the Keeper's Emblem, the completion state, the Starwell Habitat, Explore and the rare
// encounters, quests, and the four-island journey on a new and a legacy save with export/import at every milestone.
// Run: node tests/celestial20c.test.js
const { load, ok, done, seeded } = require('./harness');
const c = load(), A = c.A, D = A.Data, R = A.Rules, W = A.World, S = A.State, Q = A.Quests, F = A.SaveFile, C = R.C20, SC = A.Scenes, B = R.Battle;
const IDS = D.CAMPAIGN.celestial.dungeons, MOVES = ['updraft', 'starfall', 'orreryturn', 'cloudburst', 'focalray', 'twindusk', 'hourseal', 'belltoll', 'umbralhush'];
const clone = (o) => JSON.parse(JSON.stringify(o));
const hyd = (st) => S.hydrate(clone(st)).st;
const forceWin = (b) => { b.foes.forEach((f) => (f.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; return b; };
const forceLose = (b) => { b.party.forEach((f) => (f.hp = 0)); b.over = true; b.result = 'lose'; return b; };
const team = (s) => s.aminas.slice(0, 3).map((a) => a.uid);
process.env.P17B_LIB = '1'; const SIM = require('../tools/p17b-sim.js'), G = SIM.Game(SIM.loadAt(null), '20C'); // evolved, levelled parties (the sim library)
const claimAll = (s) => { let n = 0; for (let k = 0; k < 5; k++) D.QUESTS.forEach((q) => { if (['ready', 'claimable'].indexOf(Q.status(s, q)) >= 0) { const r = Q.claim(s, q.id); if (r && r.ok) n++; } }); return n; };
function play(s, id, opts) { const r0 = R.startRun(s, id, team(s), opts); if (!r0.ok) return { ok: false, reason: r0.reason }; let out; do { out = R.resolveBattle(s, forceWin(R.createBattle(s, seeded(5)))); } while (out.win && !out.cleared && s.run); return out; }
const snap = (s) => JSON.stringify({ am: s.aminas.map((a) => [a.uid, a.sp, a.lv, a.xp]), res: s.res, items: (s.items || []).map((i) => i.id).sort(), dun: Object.keys(s.dungeon).sort().map((k) => [k, s.dungeon[k].clears]), miss: s.missions, isl: s.islands, c20: s.c20, camp: s.campaign, story: s.story, b: s.buildings });
let stage = 0;
function checkpoint(s, label) { stage++; const ex = F.exportFile(s), p = F.parse(ex.text), same = p.ok && snap(p.st) === snap(s); ok(ex.ok && p.ok && same, 'save ' + stage + ' (' + label + '): exports and imports with nothing changed' + (p.ok ? '' : ' — ' + p.msg)); return p.ok ? p.st : s; }
// a save at the end of Obsidian Reach's ninth dungeon (the Forge Heart still standing)
const forgeReady = (starter) => { const s = S.newGame(); s.phase = 'play'; s.introDone = true; s.starter = starter || 'lumifern'; s.avatar = { made: true, name: 'Rowan', look: null };
  [s.starter, 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 50)); s.res.food = 3000; s.rank = 20;
  ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => { s.struct[k] = true; if (s.buildings[k]) Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
  s.flags.r1 = s.flags.r2 = true; s.flags.hollowveil = true;
  s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'boss' }; s.islands.obsidian = { unlocked: true, obstacles: {}, unlockedAt: 2, by: 'boss' };
  D.CAMPAIGN.starter.dungeons.concat(D.CAMPAIGN.verdant.dungeons, D.CAMPAIGN.obsidian.dungeons.slice(0, 9)).forEach((id) => { s.dungeon[id] = { clears: 1, next: 0, floors: 4 }; });
  s.campaign = s.campaign || {}; s.campaign.bosses = Object.assign({}, s.campaign.bosses, { starter: true, verdant: true });
  D.QUESTS.forEach((q) => { if (!q.side && q.id !== 'm_o10' && !/^m_c/.test(q.id)) s.missions[q.id] = 'claimed'; });
  return s; };

/* ================= data: ten dungeons, 100 battles, guardians, The Two Keys ================= */
{
  ok(IDS.length === 10 && IDS.join() === D.C20.gates.map((g) => g.id).join(), 'ten dungeons, in the order and with the ids of the ten entrances');
  ok(IDS.every((id, i) => { const d = D.DUNGEONS[id]; return d.playable && d.island === 'celestial' && d.index === i + 1 && d.prev === (i ? IDS[i - 1] : null) && d.recommended === 48 + i && d.recommended === D.C20.gates[i].rec; }), 'each is playable, on the Celestial Crown, in sequence, recommended level 48–57');
  const all = IDS.flatMap((id) => D.DUNGEONS[id].battles), sps = all.flatMap((b) => R.specSpecies(b));
  ok(all.length === 100 && IDS.every((id) => D.DUNGEONS[id].battles.length === 10), '10 dungeons × 10 battles = 100 battles');
  ok(sps.every((sp) => D.SPECIES[sp] && !D.SPECIES[sp].legendary && !D.LINES[D.SPECIES[sp].line].legendary), 'every foe (both Keys included) is an existing, non-legendary species');
  ok(Object.keys(D.SPECIES).filter((k) => D.SPECIES[k].legendary).length === Object.keys(D.LINES).filter((l) => D.LINES[l].legendary).reduce((n, l) => n + Object.keys(D.SPECIES).filter((k) => D.SPECIES[k].line === l).length, 0), 'no new legendary species (every legendary belongs to an existing legendary line)');
  const g = IDS.map((id) => D.DUNGEONS[id].battles[9]);
  ok(g.every((b, i) => b.boss && b.title && b.lv === 51 + i), 'a guardian at battle 10 of each, levels 51–60');
  ok(g.slice(0, 9).map((b) => b.move).join() === MOVES.join() && g[9].stages.map((x) => x.move).join() === 'keepersdawn,closingdoor', 'the approved charged moves: one per guardian, two for The Two Keys');
  ok(IDS.every((id) => { const b9 = D.DUNGEONS[id].battles[8], b10 = D.DUNGEONS[id].battles[9]; return b9.herald && b9.move === (b10.stages ? b10.stages[0].move : b10.move); }), 'battle 9 heralds each guardian’s charged move (the 17B rule)');
  ok(JSON.stringify(D.CAMPAIGN.celestial.foeTier) === JSON.stringify({ hp: 1.3, atk: 1.18 }) && all.every((b) => b.tier && b.tier.hp > 1 && b.tier.hp < 1.7 && b.tier.atk > 1 && b.tier.atk < 1.5), 'the Obsidian tier (×1.3 / ×1.18) with the approved adjustments, nothing extreme');
  ok(D.DUNGEONS.c_starfall.tune && D.DUNGEONS.c_cistern.tune && D.DUNGEONS.c_cistern.field, 'the two approved adjustments (Starfall Terrace, the Drowned Cistern) and the Cistern’s steam field');
  ok(D.MAX_LEVEL === 60 && R.levelCap(forgeReady()) === 50, 'the cap stays 60 (50 before the Forge Heart); no new cap step');
  // every charged move: a warning, a description, and no single hit that can defeat a fresh member at the recommended level
  const mv = MOVES.concat(['keepersdawn', 'closingdoor']).map((k) => D.ABILITIES[k]);
  ok(mv.every((m) => m && m.boss && m.tell && m.tell.length > 10 && m.desc && /Guard/i.test(m.desc)), 'every charged move has its own warning and a description that names the counter (guard)');
  ok(new Set(mv.map((m) => m.name)).size === 11 && new Set(mv.map((m) => m.el + (m.fx ? m.fx.k : '') + m.power)).size >= 9, 'eleven distinct moves (names, elements and effects)');
  let worst = 0, worstG = 0;
  IDS.forEach((id) => { const d = D.DUNGEONS[id], b10 = d.battles[9]; [].concat(R.foesFromSpec(b10)).forEach((e) => { const m = D.ABILITIES[e.move];
    G.party(['lumifern', 'cannonis', 'emberix'], d.recommended).forEach((p) => { for (let s = 0; s < 6; s++) { worst = Math.max(worst, B.damage(e, p, m, seeded(30 + s)).dmg / p.hpMax); worstG = Math.max(worstG, B.damage(e, Object.assign({}, p, { guard: true }), m, seeded(30 + s)).dmg / p.hpMax); } }); }); });
  ok(worst < 0.8 && worstG < 0.25, 'no charged move defeats a fresh Amina at the recommended level in one hit (worst ' + Math.round(worst * 100) + '% unguarded, ' + Math.round(worstG * 100) + '% guarded)');
  { const p0 = G.party(['lumifern'], 48)[0]; ok(B.damage(R.enemyFromSpec(g[0]), Object.assign({}, p0, { guard: true }), D.ABILITIES.updraft, seeded(1)).dmg < B.damage(R.enemyFromSpec(g[0]), p0, D.ABILITIES.updraft, seeded(1)).dmg / 3, 'a guard blocks three-quarters of a charged move (the guard-priority rule is unchanged)'); }
  // The Two Keys
  const tk = g[9], fk = R.foesFromSpec(tk);
  ok(tk.islandBoss && D.CAMPAIGN.celestial.islandBoss === 'c_threshold' && tk.stages.length === 2, 'The Two Keys: the Island Boss, one battle in two stages');
  ok(fk[0].sp === 'aurelith' && fk[0].name === 'The Light Key' && fk[1].sp === 'eclipsar' && fk[1].name === 'The Shadow Key', 'Stage I the Light Key (Lumifern III), Stage II the Shadow Key (Umbrit III), with player-facing names');
  ok(fk[0].hpMax === fk[1].hpMax && fk[0].stage === 1 && fk[1].stage === 2 && fk[1].chargeIn === 0 && fk[0].chargeIn !== 0, 'equal health; the Shadow Key steps in already charging');
  ok(fk.every((f) => f.keeper && f.scale >= 1.5 && f.mech && f.mech.type === 'barrier'), 'each stage is boss-scale, has its own light, and raises a barrier at half health');
  ok(!/vs\.?|versus|opponent|PvP|rival/i.test(JSON.stringify(tk) + D.ABILITIES.keepersdawn.tell + D.ABILITIES.closingdoor.tell), 'no PvP wording in the encounter');
}

/* ================= activation and old saves ================= */
{
  const s = forgeReady(); ok(!W.islandUnlocked(s, 'celestial') && W.travel(s, 'celestial').ok === false, 'before the Forge Heart: the Crown is closed');
  // an older save whose Forge Heart fell before this build (the island did not open then): it opens on load, once
  const o = forgeReady(); o.dungeon.o_forge = { clears: 1, next: 0 }; o.campaign.bosses.obsidian = true; o.rank = 20; const rk0 = o.rankXp | 0;
  const oH = hyd(o); ok(W.islandUnlocked(oH, 'celestial') && oH.islands.celestial.by === 'boss', 'a save that beat the Forge Heart in an earlier build finds the Crown open on load');
  const oH2 = hyd(oH); ok(JSON.stringify(oH2.islands.celestial) === JSON.stringify(oH.islands.celestial) && (oH2.rankXp | 0) === (oH.rankXp | 0), 'loading again changes nothing (no second unlock, no second reward)');
  ok(C.gates(oH)[0].state === 'open' && C.gates(oH).slice(1).every((x) => x.state === 'locked'), 'its Dungeon 1 is open and the rest wait in order');
  // a purchase in an early build (gold): kept, with its buildings, but waits for the Forge Heart
  const lg = forgeReady(); lg.islands.celestial = { unlocked: true, obstacles: { 'ce-3': { state: 'cleared' } }, unlockedAt: 7 }; lg.currentIsland = 'celestial';
  lg.buildings.b_old = { id: 'b_old', type: 'lantern', island: 'celestial', x: 10, y: 20, rot: 0, level: 1, state: 'built', residents: [], last: 0, stock: 0 };
  const lgH = hyd(lg);
  ok(!W.islandUnlocked(lgH, 'celestial') && lgH.currentIsland === 'obsidian' && lgH.islands.celestial.unlockedAt === 7 && lgH.islands.celestial.obstacles['ce-3'].state === 'cleared', 'an early-build purchase is kept but waits for the Forge Heart (the save is on Obsidian Reach)');
  ok(lgH.buildings.b_old.island === 'celestial' && lgH.buildings.b_old.x === 10 && lgH.buildings.b_old.y === 20, 'its building stays exactly where it was');
  ok(C.gates(lgH).every((x) => x.state === 'locked') && D.C20.areas.every((a) => !R.areaUnlocked(lgH, a)), 'no dungeon or Explore area opens through the purchase');
  const r0 = lgH.rankXp | 0, fh = play(lgH, 'o_forge');
  ok(fh.cleared && W.islandUnlocked(lgH, 'celestial') && lgH.buildings.b_old.island === 'celestial' && lgH.islands.celestial.unlockedAt === 7, 'when the Forge Heart falls the purchase opens, with its building and records as they were');
  ok(W.travel(lgH, 'celestial').ok && lgH.currentIsland === 'celestial', 'and travel works');
  // no developer shortcut
  ok(!C.preview(forgeReady()).ok && C.devHabitat(true) === false && Object.isFrozen(C.dev), 'no developer shortcut opens the island, a dungeon or the habitat');
  const fz = forgeReady(); fz.c20 = { seen: {}, done: 123, mastery: 'eligible', celebrate: 1 }; const fzH = hyd(fz);
  ok(!fzH.c20.done && !fzH.c20.mastery && !fzH.c20.celebrate, 'a forged completion state is removed on load');
  ok(!R.startRun(oH, 'c_threshold', team(oH)).ok && !R.startRun(oH, 'c_starfall', team(oH)).ok, 'later dungeons refuse to start out of order');
}

/* ================= the four-island journey (new save), with export/import at every milestone ================= */
let s = (() => { const n = forgeReady(); n.dungeon = {}; n.islands = { starter: n.islands.starter }; n.campaign.bosses = {}; n.missions = {}; n.aminas.forEach((a) => { a.lv = 30; a.xp = 0; }); return n; })();
{
  // 1-2. Starter Island and the Verdant Wilds (forced wins: the rules, not the fights, are under test here)
  D.CAMPAIGN.starter.dungeons.forEach((id) => { const need = (D.DUNGEONS[id].unlock || {}).rank; if (need && s.rank < need) s.rank = need; play(s, id); if (s.story.pendingScene) R.sceneDone(s, s.story.pendingScene, 'seen'); });
  ok(R.islandBossDefeated(s, 'starter') && W.islandUnlocked(s, 'verdant'), '1. Starter Island complete; the Verdant Wilds open');
  s = checkpoint(s, 'Starter Island complete');
  s.aminas.forEach((a) => { a.lv = 40; });
  D.CAMPAIGN.verdant.dungeons.forEach((id) => { play(s, id); if (s.story.pendingScene) R.sceneDone(s, s.story.pendingScene, 'seen'); });
  ok(R.islandBossDefeated(s, 'verdant') && R.levelCap(s) === 50 && W.islandUnlocked(s, 'obsidian'), '2-3. the Forest Crown falls: cap 50, Obsidian Reach opens');
  s = checkpoint(s, 'the Forest Crown');
  s.aminas.forEach((a) => { a.lv = 50; });
  D.CAMPAIGN.obsidian.dungeons.forEach((id) => { const out = play(s, id); if (s.story.pendingScene) R.sceneDone(s, s.story.pendingScene, 'seen'); if (id === 'o_forge') ok(out.islandBoss && out.unlockedIsland === 'celestial', '5. the Forge Heart falls and opens the Celestial Crown'); });
  ok(R.levelCap(s) === 60 && W.islandUnlocked(s, 'celestial'), '4-6. Obsidian Reach complete: cap 60, the Celestial Crown unlocked');
  // the earlier islands' quests (their objectives include building and exploring, not played here) as a finished save has them
  D.QUESTS.forEach((q) => { if (!q.side && !/^m_c/.test(q.id)) s.missions[q.id] = 'claimed'; }); s = checkpoint(s, 'the Forge Heart');
  W.travel(s, 'celestial'); ok(s.currentIsland === 'celestial' && s.story.pendingScene === 'c_arrival', 'travel to the Cloud Jetty; the arrival scene is queued once'); R.sceneDone(s, 'c_arrival', 'seen');
  W.travel(s, 'obsidian'); R.sceneDone(s, 'o_arrival', 'seen'); W.travel(s, 'celestial'); ok(!s.story.pendingScene, 'the arrival scene does not repeat');
  ok(Q.status(s, Q.get('m_c1')) !== 'locked', 'the first Celestial quest is listed');
  s = checkpoint(s, 'arrived on the Celestial Crown');
}
const EXPECT_SCENE = { c_starfall: 'c_charts', c_lens: 'c_mount', c_twinhall: 'c_cups', c_chart: 'c_ledger', c_bellloft: 'c_bell', c_dome: 'c_outline', c_threshold: 'c_ending' };
const AREAS_AT = { 0: 'cloudshelf', 3: 'moonbloombeds', 6: 'starfield' };
let finalOut = null;
s.aminas.forEach((a) => { a.lv = 55; });
IDS.forEach((id, i) => {
  const d = D.DUNGEONS[id];
  if (i < 9) ok(!C.canEnter(s, IDS[i + 1]) && R.startRun(s, IDS[i + 1], team(s)).ok === false, (i + 1) + '. ' + d.name + ': the next dungeon is still locked');
  if (i === 2) { // defeat and retry: the progress is saved battle by battle
    R.startRun(s, id, team(s)); R.resolveBattle(s, forceWin(R.createBattle(s, seeded(1)))); const ol = R.resolveBattle(s, forceLose(R.createBattle(s, seeded(2))));
    const sH = hyd(s); ok(!ol.win && !R.dungeonCleared(s, id) && (s.dungeon[id].next | 0) >= 1 && (sH.dungeon[id].next | 0) === (s.dungeon[id].next | 0), '3. the Orrery Wheel: a defeat after a win keeps the battle won, also after a reload'); }
  if (i === 7) ok(!R.reqMet(s, D.BUILDINGS.hab_resonance.req) && W.canBuildInfo(s, 'hab_resonance', 'starter').reason === 'locked', '8. before the Bell Loft: the Starwell Habitat is locked');
  const res0 = clone(s.res), items0 = (s.items || []).length;
  if (id === 'c_threshold') { ok(!s.story.pendingScene && !(s.story.scenes || {}).c_door, '10. before the Threshold: The Two Keys’ introduction has not played yet (the game plays c_door on entry)'); }
  const out = play(s, id, i === 2 ? { from: s.dungeon[id] ? s.dungeon[id].next | 0 : 0 } : undefined);
  ok(out.cleared && R.dungeonCleared(s, id) && C.cleared(s, id), (i + 1) + '. ' + d.name + ' cleared');
  const got = (s.items || []).slice(items0).map((x) => x.id);
  if (D.DUNGEON_GEAR[id]) ok(got.indexOf(D.DUNGEON_GEAR[id]) >= 0, (i + 1) + '. its first-clear item: ' + D.ITEMS[D.DUNGEON_GEAR[id]].name);
  ok(s.res.gems - res0.gems >= d.first.gems, (i + 1) + '. first-clear gems paid (' + d.first.gems + ')');
  const want = EXPECT_SCENE[id] || null;
  ok((s.story.pendingScene || null) === want, (i + 1) + '. story: ' + (want ? 'scene ' + want + ' queued' : 'no scene (an after-line: ' + (SC.after[id] ? 'yes' : 'none') + ')'));
  if (want) R.sceneDone(s, want, 'seen');
  if (AREAS_AT[i]) ok(R.areaUnlocked(s, AREAS_AT[i]), (i + 1) + '. Explore area ' + D.AREAS[AREAS_AT[i]].name + ' opens');
  if (i === 7) { ok(R.reqMet(s, D.BUILDINGS.hab_resonance.req), '8. the Bell Loft opens the Starwell Habitat'); s = checkpoint(s, 'the Starwell Habitat'); }
  if (i === 9) { finalOut = out; ok(out.islandBoss && out.campaignComplete && C.complete(s) && C.masteryEligible(s), '10. The Two Keys fall: Island Boss recorded, main story complete, Resonance Mastery eligibility recorded');
    ok(got.indexOf('keeperemblem') >= 0 && (s.items || []).filter((x) => x.id === 'keeperemblem').length === 1, '10. the Keeper’s Emblem is received, once');
    ok(Array.isArray(out.essenceList) && out.essenceList.length === 2 && out.essenceList[0].el === 'light' && out.essenceList[1].el === 'dark', '10. essence for both stages (Light, then Dark)'); }
  if (i === 4) s = checkpoint(s, 'the Lens Gallery');
});
s = checkpoint(s, 'campaign complete');
{
  // completion is persistent; play continues; replays pay no first-clear reward and change nothing
  const gems0 = s.res.gems, em0 = (s.items || []).filter((x) => x.id === 'keeperemblem').length, done0 = s.c20.done;
  const rp = play(s, 'c_threshold', { from: 0 });
  ok(rp.cleared && !rp.first && !rp.campaignComplete && s.c20.done === done0 && s.res.gems === gems0, 'a replay of the Threshold: no first-clear gems, no second completion');
  ok((s.items || []).filter((x) => x.id === 'keeperemblem').length === em0, 'and no second Keeper’s Emblem');
  const sH = hyd(s); ok(C.complete(sH) && C.masteryEligible(sH) && sH.c20.done === done0, 'the completion state survives a reload');
  ok(R.startRun(s, 'c_cloudstair', team(s)).ok && (s.run = null, true), 'every dungeon stays playable after the ending');
  claimAll(s); ok(Q.status(s, Q.get('m_c10')) === 'claimed' && Q.get('m_c10').finale, 'the final quest, the main story’s finale, is claimed');
  ok(!('starlight' in s.res) && !('resonanceMastery' in s) && !s.c20.mxp, 'no Mastery, Starlight or new resource is added');
}

/* ================= The Two Keys on the real engine ================= */
{
  const t = forgeReady(); t.dungeon.o_forge = { clears: 1 }; t.campaign.bosses.obsidian = true; t.islands.celestial = { unlocked: true, obstacles: {}, by: 'boss' };
  IDS.slice(0, 9).forEach((id) => { t.dungeon[id] = { clears: 1, next: 0 }; }); t.aminas.forEach((a) => { a.lv = 60; });
  // a real fight (tactical policy from the sim library), the team carried between stages
  const g = G;
  let won = null, lost = null;
  for (let sd = 1; sd < 60 && (!won || !lost); sd++) { const b = g.B.create(g.party(['lumifern', 'cannonis', 'emberix'], sd < 30 ? 60 : 50), g.R.foesFromSpec(g.D.DUNGEONS.c_threshold.battles[9]), { rng: seeded(sd) }); const P = g.policy('tactical'), log = []; let t = 0; while (!b.over && t++ < 400) { const a = P(b); if (!a) break; const ev = g.B.act(b, a); if (Array.isArray(ev)) log.push(...ev); else if (ev && ev.ev) log.push(...ev.ev); } b.log = log; const r = { log }; if (b.result === 'win' && !won) won = { b, r }; if (b.result === 'lose' && !lost && b.log.some((e) => e.t === 'foeIn')) lost = { b, r }; }
  ok(won, 'The Two Keys can be won with tactical play at level 60');
  const L = won.b.log, fi = L.findIndex((e) => e.t === 'foeIn');
  ok(fi > 0 && L[fi].name === 'The Shadow Key' && L.slice(0, fi).some((e) => e.t === 'faint'), 'the Shadow Key steps in when the Light Key falls, in the same battle');
  const tells = [...new Set(L.filter((e) => e.t === 'charge').map((e) => e.tell))];
  ok(tells.some((x) => /Keeper’s Dawn/.test(x)) && tells.some((x) => /Closing Door/.test(x)), 'each stage has its own warning');
  const nc = L.slice(fi + 1).find((e) => e.t === 'charge'); ok(nc && /Closing Door/.test(nc.tell), 'the Shadow Key’s first action is its charge');
  ok(L[fi].party && L[fi].party.some(([hp, max]) => hp < max), 'the team’s health is carried into Stage II (no reset)');
  // Stage II defeat restarts the whole encounter (no checkpoint)
  const u = clone(t); u.dungeon.c_threshold = { clears: 0, next: 9 }; R.startRun(u, 'c_threshold', team(u), { from: 9 }); const b1 = R.createBattle(u, seeded(3));
  b1.foes[0].hp = 0; forceLose(b1); const lo = R.resolveBattle(u, b1);
  ok(!lo.win && !R.dungeonCleared(u, 'c_threshold') && (u.dungeon.c_threshold.next | 0) === 9 && !C.complete(u), 'a defeat in Stage II records nothing: the Threshold waits at battle 10');
  R.startRun(u, 'c_threshold', team(u), { from: 9 }); const b2 = R.createBattle(u, seeded(4));
  ok(b2.foes.length === 2 && b2.foes.every((f) => f.hp === f.hpMax && !f.shield) && b2.enemy.stage === 1, 'the retry starts again at Stage I, both Keys at full health');
  u.run = null; const uH = hyd(u); ok(!C.complete(uH) && (uH.dungeon.c_threshold.next | 0) === 9, 'and so it stays after a reload');
}

/* ================= story ================= */
{
  const L = SC.list, all = ['c_arrival', 'c_charts', 'c_mount', 'c_cups', 'c_ledger', 'c_bell', 'c_outline', 'c_door', 'c_ending', 'c_lensmount'];
  ok(all.every((k) => L[k] && L[k].beats.length), 'the ten Celestial scenes exist');
  const mount = L.c_mount.beats.filter((b) => b.who === 'entity');
  ok(L.c_mount.beats.some((b) => b.who === 'entity' && b.text === 'I left that here. I meant to come back.'), 'the grief scene at the empty mount has the exact line');
  ok(L.c_mount.beats.length <= 6 && mount.every((b) => b.text.length < 140), 'it is brief (' + L.c_mount.beats.length + ' beats), with no exposition');
  const txt = (k) => L[k].beats.map((b) => (b.text || '') + ' ' + (b.choice || []).map((c2) => c2.text).join(' ')).join(' ');
  const ending = txt('c_ending') + ' ' + txt('c_door');
  ok(/door/i.test(ending) && /key/i.test(ending) && /blame/i.test(ending) && /Kind Souls/.test(ending), 'Ending A names the door, the two keys and the blame, and the Entity still says “Kind Souls”');
  ok(!/emergence|third party|beyond the world|where I came|Starter Island (was|began)|outside the world|knock/i.test(all.map(txt).join(' ')), 'nothing reveals the third party, the Emergence, the Entity’s origins, Starter Island’s origin or the presence beyond');
  ok(!/to be continued|someday|one day we|but something|not over/i.test(txt('c_ending')), 'the ending is concluded (no cliffhanger)');
  // both starters take part, whoever the player chose, owned or not; the Twin Shrine gift is not needed
  ['lumifern', 'umbrit'].forEach((st0) => { const p = forgeReady(st0); S.state = p; const e = SC.get('c_ending'), sh = e.beats.filter((b) => b.show).map((b) => D.SPECIES[b.show.sp].line);
    ok(sh.indexOf(D.SPECIES.lumifern.line) >= 0 && sh.indexOf(D.SPECIES.umbrit.line) >= 0 && !/\{(mine|other|otherHalf|mineHalf)\}/.test(JSON.stringify(e.beats)), 'starter ' + st0 + ' (other line not owned): both starters appear in the ending, every placeholder resolved');
    const p2 = forgeReady(st0); R.addAmina(p2, st0 === 'lumifern' ? 'umbrit' : 'lumifern', 30); S.state = p2; const e2 = SC.get('c_ending');
    ok(e2.beats.length >= 1 && e2.beats.filter((b) => b.show).length >= 2, 'starter ' + st0 + ' with the other line owned: the ending plays its owned variant'); });
  ok(!/twinshrine|twin shrine/i.test(JSON.stringify(D.QUESTS.filter((q) => /^m_c/.test(q.id)))) && !JSON.stringify(L.c_ending).includes('flags.twin'), 'the Twin Shrine gift is never required');
  ok(/you|your/i.test(txt('c_ending')) && !/you are (one of|a) (Keeper|us)/i.test(txt('c_ending')), 'the player stays an outsider');
}

/* ================= the Watcher's Lens at the mount ================= */
{
  const t = clone(s); t.items = (t.items || []).filter((x) => x.id !== 'entityeye');
  ok(!C.hasLens(t) && C.lensMoment(t).reason === 'nolens', 'without the Lens: no interaction (nothing is required)');
  const lens = { iid: 'lensX', id: 'entityeye' }; t.items.push(lens); delete t.story.scenes.c_mount;
  ok(C.hasLens(t) && C.lensMoment(t).reason === 'later', 'held, but before the mount scene: not yet');
  t.story.scenes.c_mount = 'seen'; const stats0 = JSON.stringify(t.aminas), r1 = C.lensMoment(t), r2 = C.lensMoment(t);
  ok(r1.ok && r1.first && r2.ok && !r2.first && r1.scene === 'c_lensmount', 'held in the bag: the interaction plays, and can be repeated');
  ok(t.items.some((x) => x.id === 'entityeye') && JSON.stringify(t.aminas) === stats0, 'the Lens is not consumed and gives no combat advantage');
  const eq = t.aminas[0]; R.equip(t, eq.uid, 'lensX'); ok(C.hasLens(t) && C.lensMoment(t).ok, 'equipped on an Amina: recognised too');
  ok(D.SURVIVAL_GEAR[20] === 'entityeye' && !Object.keys(D.DUNGEON_GEAR).some((k) => D.DUNGEON_GEAR[k] === 'entityeye'), 'it remains the Survival wave-20 reward only');
  const lm = SC.list.c_lensmount.beats.map((b) => b.text || '').join(' ');
  ok(!/emergence|third|origin|beyond|who I was/i.test(lm), 'no new mystery in the Lens moment');
}

/* ================= the Keeper's Emblem ================= */
{
  const it = D.ITEMS.keeperemblem;
  ok(it && it.slot === 'charm' && it.unique && it.rarity === 'mythic' && it.desc === 'Two keys. One purpose.' && it.name === 'Keeper’s Emblem', 'a unique endgame charm: “Two keys. One purpose.”');
  ok(JSON.stringify(it.bonus) === JSON.stringify({ hp: 0.06, def: 0.08, atk: 0.03, spd: 0.02 }), 'HP +6%, DEF +8%, ATK +3%, SPD +2%');
  ok(JSON.stringify(it.bonus) !== JSON.stringify(D.ITEMS.entityeye.bonus) && D.GEAR_SLOTS.join() === 'weapon,armour,charm', 'not a copy of the Watcher’s Lens; no new slot');
  const sum = (b) => Object.values(b).reduce((a, x) => a + x, 0), charms = Object.keys(D.ITEMS).filter((k) => D.ITEMS[k].slot === 'charm' && k !== 'keeperemblem').map((k) => sum(D.ITEMS[k].bonus));
  ok(sum(it.bonus) <= Math.max(...charms) && sum(it.bonus) >= 0.15, 'in line with high-tier charms (total ' + sum(it.bonus).toFixed(2) + ', best other ' + Math.max(...charms).toFixed(2) + ')');
  ok(D.DUNGEON_GEAR.c_threshold === 'keeperemblem' && Object.keys(D.DUNGEON_GEAR).filter((k) => D.DUNGEON_GEAR[k] === 'keeperemblem').length === 1, 'given only by the first Threshold clear');
}

/* ================= the Starwell Habitat ================= */
{
  const h = clone(s); h.res.gold = 1e7; h.struct.hollow = true;
  let n = 0; for (let k = 0; k < 6; k++) { const sp = W.findSpot(h, 'celestial', 'hab_resonance', 0, [6 + k * 4, 6]); if (!sp) break; const r = W.buildNew(h, 'celestial', 'hab_resonance', sp[0], sp[1], 0); if (r.ok) { n++; Object.assign(h.buildings[r.id], { state: 'built', level: 1 }); delete h.buildings[r.id].endAt; } }
  ok(n === 4 && W.canBuildInfo(h, 'hab_resonance', 'celestial').reason === 'limit', 'after the Bell Loft: four Starwell Habitats on an island, and no fifth');
  const f = forgeReady(); f.dungeon.c_bellloft = { clears: 1 }; f.c20 = { seen: {} };
  ok(!R.reqMet(f, D.BUILDINGS.hab_resonance.req), 'a forged Bell Loft clear does not open it');
}

/* ================= Explore: areas, levels, rare third forms ================= */
{
  ok(D.AREAS.cloudshelf.unlock.c20 === 'c_cloudstair' && D.AREAS.moonbloombeds.unlock.c20 === 'c_cistern' && D.AREAS.starfield.unlock.c20 === 'c_chart', 'areas open with dungeons 1, 4 and 7');
  const finds = D.C20.areas.flatMap((a) => D.AREAS[a].steps.filter((x) => x[0] === 'find').map((x) => x[1]));
  ok(finds.every((sp) => D.SPECIES[sp] && !D.SPECIES[sp].legendary && D.SPECIES[sp].stage === 2), 'every find is an existing second form: ' + finds.join(', '));
  ok(D.C20.areas.every((a) => R.areaUnlocked(s, a)) && D.C20.areas.every((a) => R.explore(clone(s), a).ok !== false), 'all three areas can be explored on the completed save');
  ok(D.V18.rare.lvOf.cloudshelf <= 49 && D.V18.rare.lvOf.moonbloombeds <= 52 && D.V18.rare.lvOf.starfield <= 55, 'rare third forms join no higher than the dungeon ahead');
  ok(finds.every((sp) => D.SPECIES[sp]) && D.C20.areas.every((a) => D.SPECIES[D.V18.rare.of[a]] && D.SPECIES[D.V18.rare.of[a]].stage === 3), 'each area’s rare encounter is a third form (Codex and habitats know every species already)');
  // once a day, pity, once ever; no second roll through a reload or by turning the clock back
  const e = clone(s); e.stats.explores = e.stats.explores || {}; e.stats.explores.starfield = D.AREAS.starfield.steps.length;
  let met = null, days = 0, day = 0; const dn0 = Date.now, rn0 = R.now; R.now = () => 1.9e12 + day * 864e5; Date.now = () => 1.9e12 + day * 864e5; R.rng = () => 0.99;
  for (; days < 10 && !met; days++, day++) { const r = R.explore(e, 'starfield'); if (r && r.rare) met = r; }
  const bf = met && R.befriend(e); const e2 = hyd(e); day -= 3; let again = false; for (let k = 0; k < 6; k++, day++) { const r = R.explore(e2, 'starfield'); if (r && r.rare) again = true; }
  Date.now = dn0; R.now = rn0;
  ok(met && met.find.sp === D.V18.rare.of.starfield && days <= 8 && bf && bf.ok, 'the Star Shard Field’s rare third form appears by the 8th day and joins');
  ok(!again && R.V18.rareState(e2, 'starfield').state === 'met', 'it never appears again, after a reload or with the clock turned back');
}

/* ================= quests ================= */
{
  const M = Array.from({ length: 10 }, (_, i) => Q.get('m_c' + (i + 1)));
  ok(M.every((q, i) => q && q.objectives[0].type === 'dungeon_clear' && q.objectives[0].dungeon === IDS[i] && q.after[0] === (i ? 'm_c' + i : 'm_o10')), 'ten main quests, one per dungeon, after Heart of the Forge');
  ok(M[9].finale && M.every((q) => q.objectives.every((o) => o.hint)), 'every objective has a hint; the last is the main story’s finale');
  const side = D.QUESTS.filter((q) => /^s_c_/.test(q.id)); ok(side.length >= 8 && side.every((q) => q.side && q.objectives.every((o) => o.hint)), side.length + ' side quests with clear objectives');
  // retroactive: the completed save's quests can all be claimed, each once
  const qs = clone(s); const ids = M.map((q) => q.id); let paid = 0; ids.forEach((id) => { delete qs.missions[id]; }); // as a save that finished the dungeons before the quests existed
  ids.forEach((id) => { if (['ready', 'claimable'].indexOf(Q.status(qs, Q.get(id))) >= 0) { const r = Q.claim(qs, id); if (r && r.ok) paid++; } });
  ok(paid === 10 && ids.every((id) => Q.status(qs, Q.get(id)) === 'claimed'), 'all ten main quests complete retroactively and are claimed once');
  ok(ids.every((id) => !(Q.claim(qs, id) || {}).ok), 'claiming again pays nothing');
  ok(side.every((q) => q.objectives.every((o) => ['dungeon_clear', 'dungeon_stage', 'creature_level', 'build', 'upgrade', 'befriend', 'remove_obstacle', 'unlock_island', 'visit_island'].indexOf(o.type) >= 0)), 'every side objective uses an existing objective type');
  ok(D.QUESTS.find((q) => q.id === 's_c_chart').objectives[0].species.length === D.C20.nonLegendary.length && D.C20.nonLegendary.every((k) => !D.SPECIES[k].legendary), 'Starchart asks for every non-legendary species (no legendary needed)');
}

/* ================= the same journey from a legacy save (an earlier build, all of Obsidian done) ================= */
{
  const lg = forgeReady('umbrit'); lg.dungeon.o_forge = { clears: 2, next: 0 }; lg.campaign.bosses.obsidian = true; D.QUESTS.forEach((q) => { if (q.id === 'm_o10') lg.missions[q.id] = 'claimed'; });
  delete lg.c20; let L = hyd(lg);
  ok(W.islandUnlocked(L, 'celestial') && L.c20 && typeof L.c20.seen === 'object', 'legacy: the Crown opens on load and the record is created');
  L.aminas.forEach((a) => { a.lv = 60; }); W.travel(L, 'celestial'); R.sceneDone(L, 'c_arrival', 'seen');
  IDS.forEach((id) => { play(L, id); if (L.story.pendingScene) R.sceneDone(L, L.story.pendingScene, 'seen'); });
  ok(C.complete(L) && (L.items || []).some((x) => x.id === 'keeperemblem'), 'legacy: the campaign completes; the Emblem is received');
  L = checkpoint(L, 'legacy save complete');
}

done('celestial20c');
