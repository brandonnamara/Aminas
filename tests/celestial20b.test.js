// Phase 20B: the Celestial Crown's construction (rules and data, no DOM): the preserved map and obstacles, places and
// entrances on safe cells, building placement, legacy saves and the session-only preview, sealed dungeons (no way in by
// any route), the Starwell Habitat, the Explore areas, story restrictions, and The Two Keys prototype on the real engine.
// Run: node tests/celestial20b.test.js
const { load, ok, done } = require('./harness');
const ctx = load(), A = ctx.A, D = A.Data, R = A.Rules, W = A.World, S = A.State, C = R.C20;
const fresh = () => { const st = S.fresh(); st.phase = 'play'; st.introDone = true; return st; };
const hyd = (st) => S.hydrate(JSON.parse(JSON.stringify(st))).st;
const h = (s) => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x * 33) ^ s.charCodeAt(i)) >>> 0; return x.toString(16); };

/* ---------- 1. the map, obstacles and island record are exactly as before (fingerprints of the 20A commit 00e13d2) ---------- */
const isl = D.ISLANDS.celestial, map = D.MAPS.celestial;
ok(map.length === 34 && map.every((r) => r.length === 34), 'the map is still 34×34');
let land = 0, build = 0; for (let y = 0; y < 34; y++) for (let x = 0; x < 34; x++) { if (isl.land[y][x]) land++; if (isl.buildable[y][x]) build++; }
ok(land === 763 && build === 566, 'still 763 land cells and 566 buildable cells (' + land + ', ' + build + ')');
ok(D.OBSTACLES.celestial.length === 62 && D.OBSTACLES.celestial.every((o, i) => o.id === 'ce-' + (i + 1)), 'all 62 obstacles keep their ids ce-1 … ce-62 in order');
ok(h(map.join('/')) === '3f01024', 'map fingerprint matches the Phase 20A commit');
ok(h(D.OBSTACLES.celestial.map((o) => [o.id, o.type, o.x, o.y].join(':')).join('|')) === '41c8a18e', 'obstacle ids, types and cells match the Phase 20A commit');
ok(h(JSON.stringify(isl.buildable)) === '6fee15cf' && h(JSON.stringify(isl.land)) === 'ffd9ae04', 'buildable and land grids match the Phase 20A commit');
ok(h(JSON.stringify(['floatstone', 'starshard', 'moonbloom', 'pillar', 'cloudpuff', 'geode'].map((t) => D.OBSTACLE_TYPES[t]))) === '97d64953', 'the six obstacle types (sizes, costs, rewards, collision tags) are unchanged');
ok(h(['starter', 'verdant', 'obsidian'].map((k) => D.OBSTACLES[k].map((o) => [o.id, o.type, o.x, o.y].join(':')).join('|')).join('#')) === 'dba96f16', 'every other island’s obstacles are unchanged');
ok(h(JSON.stringify(Object.assign({}, isl, { buildable: 0, land: 0, map: 0 }))) === '12dc0021', 'the island record (name, tier, element, price, grid) is unchanged');
const slot = []; map.forEach((r, y) => r.split('').forEach((c, x) => { if (c === 'x') slot.push([x, y]); }));
ok(slot.length === 16 && slot.every(([x, y]) => x >= 15 && x <= 18 && y >= 15 && y <= 18), 'the observatory’s landmark slot is still the 4×4 block at 15–18');

/* ---------- 2. places and entrances stand only on safe cells ---------- */
const obCell = {}; D.OBSTACLES.celestial.forEach((o) => { const t = D.OBSTACLE_TYPES[o.type]; for (let y = o.y; y < o.y + t.h; y++) for (let x = o.x; x < o.x + t.w; x++) obCell[x + ',' + y] = o.id; });
const used = {}; let bad = [], overlap = [];
D.C20.sites.forEach((s) => { for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) { const k = x + ',' + y; if (!isl.land[y][x] || isl.buildable[y][x] || obCell[k] || (s.slot ? map[y][x] !== 'x' : map[y][x] === 'x')) bad.push(s.id + '@' + k); if (used[k]) overlap.push(k); used[k] = s.id; } });
D.C20.gates.forEach((g) => { const k = g.x + ',' + g.y; if (!isl.land[g.y][g.x] || isl.buildable[g.y][g.x] || obCell[k]) bad.push(g.id + '@' + k); if (!g.inside) { if (used[k]) overlap.push(g.id + '@' + k); used[k] = g.id; } else if (used[k] !== 'observatory') bad.push(g.id + ' not inside'); });
ok(!bad.length, 'every place and entrance is on land that is neither buildable nor under an obstacle (' + (bad.join(' ') || 'none') + ')');
ok(!overlap.length, 'no two places or entrances share a cell');
ok(D.C20.gates.length === 10 && D.C20.gates.map((g) => g.n).join() === '1,2,3,4,5,6,7,8,9,10', 'ten entrances, numbered 1 to 10 in order');
ok(D.C20.gates.map((g) => g.rec).join() === '48,49,50,51,52,53,54,55,56,57', 'recommended levels 48–57 (the approved band)');
ok(D.C20.gates.map((g) => g.x + ',' + g.y).join(' ') === '14,30 14,26 5,17 4,23 5,14 17,10 20,5 28,12 28,16 16,16', 'entrances at the approved Phase 20A positions');
ok(D.C20.gates.filter((g) => g.inside).map((g) => g.id).join() === 'c_threshold', 'only the Threshold is inside the observatory');
ok(D.C20.gates.every((g) => C.site(g.site)), 'every entrance belongs to a place (its sheet shows both)');
ok(D.C20.sites.length === 12 && C.placeIds().length === 12, 'twelve places, including the Silent Observatory and Lenshold');

/* ---------- 3. building placement on the island ---------- */
const st0 = fresh(); st0.struct.hollow = true; st0.islands.celestial = { unlocked: true, obstacles: {}, unlockedAt: 1 }; st0.res.gold = 1e7;
const onSite = D.C20.sites.concat(D.C20.gates).every((p) => !W.canPlace(st0, 'celestial', 'lantern', p.x, p.y, 0).ok);
ok(onSite, 'nothing can be built on a place or an entrance');
const spot = W.findSpot(st0, 'celestial', 'hab_nature', 0, [10, 8]);
ok(spot && W.canPlace(st0, 'celestial', 'hab_nature', spot[0], spot[1], 0).ok, 'a habitat can still be placed on the island’s grass');
const o5 = D.OBSTACLES.celestial.find((o) => o.id === 'ce-5');
ok(W.canPlace(st0, 'celestial', 'lantern', o5.x, o5.y, 0).reason === 'obstacle' && W.canPlace(st0, 'celestial', 'lantern', o5.x + 1, o5.y + 1, 0).reason === 'obstacle', 'a Drifting Stone still blocks all four of its cells');
st0.islands.celestial.obstacles['ce-5'] = { state: 'cleared' };
ok(W.canPlace(st0, 'celestial', 'lantern', o5.x, o5.y, 0).ok, 'once cleared, its cells are free (collision unchanged)');
const rm = W.removeObstacle(st0, 'ce-9');
ok(rm.ok && W.obstacleState(st0, 'ce-9') !== 'present', 'obstacles can still be cleared on an open island');

/* ---------- 4. readiness: closed to normal play, the Forge Heart still opens it once it is ready ---------- */
ok(D.ISLAND_LIVE.celestial === false && D.C20.live === false, 'the Crown is not live and its campaign switch is off');
ok(D.CAMPAIGN.celestial.dungeons.length === 0 && D.CAMPAIGN.obsidian.next === 'celestial' && D.CAMPAIGN.celestial.islandBoss === null, 'no Celestial dungeon exists; the Forge Heart is still what opens the Crown');
const sb = fresh(); sb.islands.obsidian = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'boss' }; sb.campaign = sb.campaign || {}; sb.campaign.bosses = Object.assign({}, sb.campaign.bosses, { verdant: true, obsidian: true });
const ub = W.unlockByBoss(sb, 'celestial');
ok(!ub.ok && ub.reason === 'notready' && !W.islandUnlocked(sb, 'celestial'), 'beating the Forge Heart does not open the Crown while it is not ready');
ok(W.travel(sb, 'celestial').ok === false, 'travel there is refused');
const sbH = hyd(sb); ok(!W.islandUnlocked(sbH, 'celestial'), 'reloading such a save does not open it either');
const qC = D.QUESTS.find((q) => q.id === 's_crown'); ok(qC && !A.Quests.reachable(sb, qC), 'the "Above the Clouds" quest stays hidden');

/* ---------- 5. legacy saves that bought the Crown in an early build ---------- */
const lg = fresh(); lg.struct.hollow = true; lg.res.gold = 500000; lg.rank = 10;
lg.islands.celestial = { unlocked: true, unlockedAt: 12345, obstacles: { 'ce-1': { state: 'cleared' }, 'ce-30': { state: 'cleared' } } };
const lgSpot = W.findSpot(lg, 'celestial', 'hab_light', 0, [22, 22]); const lgB = W.buildNew(lg, 'celestial', 'hab_light', lgSpot[0], lgSpot[1], 0);
lg.buildings[lgB.id].state = 'built'; lg.buildings[lgB.id].level = 3; delete lg.buildings[lgB.id].endAt; lg.currentIsland = 'celestial';
lg.d17 = lg.d17 || { c: {} }; lg.stats.wins = 77; const goldBefore = lg.res.gold, gemsBefore = lg.res.gems;
const lgH = hyd(lg);
ok(lgH.islands.celestial.unlocked === true && lgH.islands.celestial.unlockedAt === 12345, 'a legacy purchase keeps its ownership record');
ok(lgH.islands.celestial.obstacles['ce-1'].state === 'cleared' && lgH.islands.celestial.obstacles['ce-30'].state === 'cleared', 'its cleared obstacles stay cleared');
const lb = lgH.buildings[lgB.id]; ok(lb && lb.island === 'celestial' && lb.x === lgSpot[0] && lb.y === lgSpot[1] && lb.level === 3 && lb.state === 'built', 'its building stays where it was, at its level');
ok(lgH.res.gold === goldBefore && lgH.res.gems === gemsBefore && lgH.stats.wins === 77, 'its currencies and progress are unchanged by loading');
ok(lgH.currentIsland !== 'celestial', 'a legacy save standing on the Crown is moved to a ready island (records kept)');
ok(C.gates(lgH).every((g) => g.state !== 'open'), 'a legacy owner still finds every entrance shut');
const hab0 = Object.keys(lgH.buildings).filter((k) => lgH.buildings[k].type === 'hab_resonance').length; ok(hab0 === 0, 'no Starwell Habitat appears in a legacy save');

/* ---------- 6. the developer construction preview is for the session only ---------- */
const pv = fresh(); pv.struct.hollow = true; pv.res.gold = 100000;
const pr = C.preview(pv);
ok(pr.ok && W.islandLive('celestial') && W.islandUnlocked(pv, 'celestial') && pv.islands.celestial.by === 'preview', 'the preview opens the island for this session (marked as a preview)');
ok(W.travel(pv, 'celestial').ok, 'and travel works during the preview');
ok(C.gates(pv).every((g) => g.state === 'locked' || g.state === 'sealed') && D.C20.gates.every((g) => !R.startRun(pv, g.id, [pv.active]).ok), 'the preview opens no dungeon');
ok(D.C20.areas.every((a) => !R.areaUnlocked(pv, a)), 'the preview opens no Explore area');
ok(!A.Quests.islandReachable(pv, 'celestial') && !A.Quests.reachable(pv, qC), 'the preview makes no Celestial quest reachable (no reward can be earned through it)');
const pvB = W.buildNew(pv, 'celestial', 'lantern', W.findSpot(pv, 'celestial', 'lantern', 0, [10, 20])[0], W.findSpot(pv, 'celestial', 'lantern', 0, [10, 20])[1], 0);
pv.islands.celestial.obstacles['ce-12'] = { state: 'cleared' };
D.ISLAND_LIVE.celestial = false; C.dev.preview = false;   // a reload: module state starts again
const pvH = hyd(pv);
ok(!W.islandUnlocked(pvH, 'celestial') && !pvH.islands.celestial.by && pvH.currentIsland !== 'celestial', 'after a reload the preview unlock is gone and the save is on a ready island');
ok(pvH.buildings[pvB.id] && pvH.buildings[pvB.id].island === 'celestial' && pvH.islands.celestial.obstacles['ce-12'].state === 'cleared', 'what was built and cleared in the preview is kept, as old-build records are');
ok(!('c20dev' in pvH) && Object.keys(pvH.c20).join() === 'seen', 'no developer switch is saved');

/* ---------- 7. dungeons: sealed by every route ---------- */
const dg = fresh(); dg.islands.celestial = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'boss' }; dg.campaign = dg.campaign || {}; dg.campaign.bosses = Object.assign({}, dg.campaign.bosses, { obsidian: true });
const gs = C.gates(dg);
ok(gs[0].state === 'sealed' && gs.slice(1).every((g) => g.state === 'locked'), 'with the Forge Heart beaten: Dungeon 1 sealed, the other nine locked in order');
ok(!C.gates(fresh()).some((g) => g.state !== 'locked') && /Reach the Celestial Crown/.test(C.gateState(fresh(), 'c_cloudstair').text), 'a new save sees ten locked entrances');
ok(D.C20.gates.every((g) => !D.DUNGEONS[g.id]), 'none of the ten dungeons exists as battle data');
// forged clears, a forged run and the campaign switch: still no way in
D.C20.gates.forEach((g) => { dg.dungeon[g.id] = { clears: 3, next: 0 }; });
const sr = D.C20.gates.map((g) => R.startRun(dg, g.id, [dg.active]));
ok(sr.every((r) => !r.ok), 'forged clear records do not open any entrance (startRun refuses all ten)');
ok(D.C20.gates.every((g) => !R.dungeonUnlocked(dg, g.id) && !C.cleared(dg, g.id)), 'nor do they count as cleared');
dg.run = { d: 'c_threshold', battle: 9, start: 0, uids: [dg.active], hp: {}, gold: 0, food: 0 };
ok(hyd(dg).run === null, 'a forged run inside the Threshold is dropped on load');
D.C20.live = true; ok(D.C20.gates.every((g) => !C.canEnter(dg, g.id)), 'even with the campaign switch on, an entrance without dungeon data stays shut'); D.C20.live = false;
ok(C.look(dg, 'c_cloudstair') === 1 && C.look(dg, 'c_starfall') === 0, 'entrance looks: lit when its turn has come, dark while locked');

/* ---------- 8. the Starwell Habitat ---------- */
const hb = D.BUILDINGS.hab_resonance, hm = D.BUILDINGS.hab_metal;
ok(hb && hb.cat === 'habitat' && hb.el === 'resonance' && hb.w === 3 && hb.h === 3 && hb.art === 'habitat', 'the Starwell Habitat uses the existing habitat framework (3×3, Resonance)');
ok(hb.maxCount === 4 && hb.affinity.join() === 'resonance' && hb.produces === 'gold' && hb.perResident, 'at most four; Resonance residents earn more; it produces gold like every habitat');
ok(hb.levels.every((l, i) => ['rate', 'capMin', 'capacity'].every((k) => l[k] === hm.levels[i][k])), 'the same production, storage and capacity per level as every habitat');
ok(hb.levels.map((l) => l.cost.gold).join() === '3000,6500,12000,20000,36000' && Object.keys(hb.levels[0].cost).join() === 'gold', 'costs 3,000 → 36,000 gold, no new currency');
ok(D.CATALOG.indexOf('hab_resonance') === D.CATALOG.indexOf('hab_metal') + 1, 'it is listed after the Forge Habitat');
const hs = fresh(); hs.struct.hollow = true; hs.res.gold = 1e6; hs.islands.celestial = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'boss' };
hs.dungeon.c_bellloft = { clears: 1 };
ok(!R.reqMet(hs, hb.req) && W.canBuildInfo(hs, 'hab_resonance', 'starter').reason === 'locked' && /Bell Loft/.test(W.canBuildInfo(hs, 'hab_resonance', 'starter').text), 'locked until the Bell Loft, and a forged Bell Loft record does not count');
// the rule itself, with a stand-in Bell Loft (Phase 20C will add the real one)
D.DUNGEONS.c_bellloft = { playable: true, island: 'celestial', battles: [], sections: [] };
ok(R.reqMet(hs, hb.req), 'once the Bell Loft exists and is cleared, the habitat opens'); delete D.DUNGEONS.c_bellloft;
ok(!R.reqMet(hs, hb.req), '(and closes again without it)');
// developer access: session only
C.devHabitat(true);
const sp1 = W.findSpot(hs, 'starter', 'hab_resonance', 0, [12, 12]), b1 = W.buildNew(hs, 'starter', 'hab_resonance', sp1[0], sp1[1], 0);
ok(b1.ok, 'developer access lets this session build one');
const bb = hs.buildings[b1.id]; bb.state = 'built'; bb.level = 2; delete bb.endAt; bb.toLevel = undefined;
for (let i = 0; i < 3; i++) { const sp = W.findSpot(hs, 'starter', 'hab_resonance', 0, [8 + i * 4, 20]); const r = W.buildNew(hs, 'starter', 'hab_resonance', sp[0], sp[1], 0); if (r.ok) Object.assign(hs.buildings[r.id], { state: 'built', level: 1 }); }
ok(W.canBuildInfo(hs, 'hab_resonance', 'starter').reason === 'limit', 'a fifth is refused (the limit of four)');
const hD = hyd(hs); C.devHabitat(false);
ok(!R.reqMet(hD, hb.req) && hD.buildings[b1.id] && hD.buildings[b1.id].type === 'hab_resonance', 'developer access ends with the session; a habitat already built is kept');
// production: identical to the Forge Habitat at the same level and residents, +50% for a Resonance resident
const pa = fresh(); pa.struct.hollow = true; const z = R.addAmina(pa, 'aimza3', 40), v = R.addAmina(pa, 'voltar3', 40);
const mk = (type, uid) => { const id = 'bt' + type + uid; pa.buildings[id] = { id, type, island: 'starter', x: 0, y: 0, rot: 0, level: 2, state: 'built', residents: [uid], last: 0, stock: 0 }; return pa.buildings[id]; };
const perMin = (b) => W.perMin(pa, b);
ok(Math.abs(perMin(mk('hab_resonance', v.uid)) - perMin(mk('hab_metal', v.uid))) < 1e-9, 'a non-Resonance resident earns exactly what it would in the Forge Habitat');
ok(Math.abs(perMin(mk('hab_resonance', z.uid)) / perMin(mk('hab_resonance', v.uid)) - 1.5) < 1e-9, 'an Aimza III earns 50% more there (the existing affinity rule)');

/* ---------- 9. exploration ---------- */
ok(D.C20.areas.every((a) => D.AREAS[a] && D.AREAS[a].island === 'celestial' && D.AREA_ORDER.indexOf(a) >= 0), 'three Explore areas on the Crown: Cloud Shelf, Moonbloom Beds, Star Shard Field');
ok(D.AREAS.cloudshelf.unlock.c20 === 'c_cloudstair' && D.AREAS.moonbloombeds.unlock.c20 === 'c_cistern' && D.AREAS.starfield.unlock.c20 === 'c_chart', 'each opens with its dungeon (1, 4 and 7)');
const finds = D.C20.areas.map((a) => D.AREAS[a].steps.filter((s) => s[0] === 'find').map((s) => s[1]));
ok(finds.every((f) => f.length === 3) && [].concat(...finds).every((sp) => D.SPECIES[sp] && !D.SPECIES[sp].legendary), 'three finds each, all existing non-legendary species');
const rare = D.V18.rare; ok(rare.of.cloudshelf === 'stormbringer' && rare.of.moonbloombeds === 'calyxar' && rare.of.starfield === 'voltar3' && ['stormbringer', 'calyxar', 'voltar3'].every((sp) => D.SPECIES[sp] && !D.SPECIES[sp].evo), 'rare third forms: Zephyr III, Acinus III, Voltar III');
ok(rare.lvOf.cloudshelf === 48 && rare.lvOf.moonbloombeds === 51 && rare.lvOf.starfield === 54 && D.C20.areas.every((a) => R.AREA_LV[a] < 53), 'encounter levels never above the dungeon ahead');
ok(D.C20.areas.every((a) => !R.areaUnlocked(dg, a) && !R.areaUnlocked(lgH, a)), 'locked in normal play, including on legacy and Forge-Heart saves');
ok(R.explore(dg, 'starfield').ok === false, 'exploring there is refused');

/* ---------- 10. story restrictions and the save record ---------- */
const words = JSON.stringify(D.C20.sites.map((s) => [s.text, s.entity]));
ok(!/Emergence|third key|refused|I left that here|meant to come back|asked me too|Keeper/i.test(words), 'no place text reveals the third party, the Emergence, the Entity’s past or the ending’s beats');
ok(/lens mount holds nothing/.test(C.site('observatory').text), 'the observatory shows the empty lens mount (no line about it yet)');
const vs = fresh(); const ev = []; R.on && R.on('c20visit', (e) => ev.push(e.id));
const v1 = C.visit(vs, 'orrery'), v2 = C.visit(vs, 'orrery'), v3 = C.visit(vs, 'c_orrery'), v4 = C.visit(vs, 'nowhere');
ok(v1.first && !v2.first && v3.ok && !v4.ok && C.progress(vs).seen === 1, 'a visit is remembered once; entrances are remembered too; unknown ids are refused');
vs.c20.seen.junk = 5; vs.c20.seen.chart = 'x'; vs.c20.extra = 1;
const vsH = hyd(vs); ok(!vsH.c20.seen.junk && vsH.c20.seen.chart === 1 && vsH.c20.seen.orrery && !('extra' in vsH.c20), 'the visit record is cleaned on load');
const bad1 = hyd(Object.assign(fresh(), { c20: [1, 2] })); ok(bad1.c20 && typeof bad1.c20.seen === 'object' && !Array.isArray(bad1.c20), 'a damaged record is repaired');

/* ---------- 11. The Two Keys: the development-only prototype on the real engine ---------- */
const TK = require('../tools/p20b-twokeys.js');
const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
ok(!/p20b-twokeys/.test(html) && !D.ABILITIES.keepersdawn && !D.ABILITIES.closingdoor, 'the prototype is not part of the game (not loaded, no moves added)');
const PA = TK.sandbox(), PB = PA.Rules.Battle;
const foes = TK.foesFor(PA, { stages: TK.STAGES(1.0) });
ok(foes.length === 2 && foes[0].sp === 'aurelith' && foes[1].sp === 'eclipsar' && foes.every((f) => f.boss && f.islandBoss), 'two stages in one battle: the pale Keeper (Lumifern III’s shape), then the dark Keeper (Umbrit III’s)');
let tr = null; for (let s = 1; s < 40 && !tr; s++) { const r = TK.fight(PA, TK.TEAMS.light, 60, { stages: TK.STAGES(1.0) }, s, 'auto'); if (r.win) tr = r; }
const fi = tr && tr.log.findIndex((e) => e.t === 'foeIn');
ok(tr && fi > 0 && tr.log[fi].name === 'The Dark Key' && tr.log[fi - 1].t === 'faint', 'the second steps in as the first falls, in the same battle');
const tells = tr ? [...new Set(tr.log.filter((e) => e.t === 'charge').map((e) => e.tell))] : [];
ok(tells.length === 2 && /Keeper’s Dawn/.test(tells[0]) && /Closing Door/.test(tells[1]), 'each stage has its own charged-move warning');
const nextCharge = tr && tr.log.slice(fi + 1).find((e) => e.t === 'charge');
ok(nextCharge && nextCharge.turn <= tr.log[fi].turn + 1, 'the second arrives ready: it charges on its first action');
// the team carries over: the same fighters, their health not reset, and the first Keeper's barrier gone
const tin = tr && tr.log[fi];
ok(tin && tin.same && tin.party.some(([hp, max]) => hp < max) && tin.party.every(([hp, max]) => hp <= max), 'the player’s team keeps its fighters and their health between stages (no reset)');
ok(tin && tin.shield === 0, 'the first Keeper’s barrier does not carry over to the second');
// defeat and retry: a loss ends the battle; a new attempt starts both stages at full health
const lose = TK.fight(PA, ['lumi', 'zeep', 'aimza'], 25, { stages: TK.STAGES(1.0) }, 9, 'auto');
const again = TK.foesFor(PA, { stages: TK.STAGES(1.0) });
ok(!lose.win && lose.b.result === 'lose' && again.every((f) => f.hp === f.hpMax && !f.shield), 'a defeat ends the encounter; a retry starts both stages fresh');
// rewards and saves through the real resolveBattle (inside the sandbox: the Forge Heart's battle slot hosts the encounter)
TK.hostDungeon(PA); const P = TK.protoSave(PA, 60, ['lumi3', 'aimza3', 'zeep3']), g0 = P.st.res.gold, gem0 = P.st.res.gems;
let run1 = null; for (let s = 1; s < 30; s++) { const snap = JSON.parse(JSON.stringify(P.st)); const r = TK.playBoss(PA, P.st, P.uids, s); if (r.out.cleared) { run1 = r; break; } Object.keys(P.st).forEach((k) => delete P.st[k]); Object.assign(P.st, snap); }
ok(run1 && run1.out.first && run1.out.islandBoss && PA.Rules.islandBossDefeated(P.st, 'obsidian'), 'winning completes the dungeon and records the Island Boss (save-safe flags)');
const g1 = P.st.res.gold, gem1 = P.st.res.gems;
ok(gem1 - gem0 >= 40 && g1 - g0 >= 7000, 'the first clear pays its one-time reward');
const P2 = PA.State.hydrate(JSON.parse(JSON.stringify(P.st))).st;
ok(PA.Rules.dungeonCleared(P2, 'o_forge') && PA.Rules.islandBossDefeated(P2, 'obsidian'), 'the completion survives a save and reload');
let run2 = null; for (let s = 31; s < 60 && !run2; s++) { const r = TK.playBoss(PA, P2, P.uids, s); if (r.out.cleared) run2 = r; }
ok(run2 && !run2.out.first && P2.res.gems === gem1, 'a replay pays no first-clear reward again (no gems)');
const P3 = TK.protoSave(PA, 20, ['lumi', 'zeep', 'aimza']), r3 = TK.playBoss(PA, P3.st, P3.uids, 4);
ok(r3.b.result === 'lose' && !r3.out.win && !PA.Rules.islandBossDefeated(P3.st, 'obsidian') && P3.st.dungeon.o_forge.next === 9 && !P3.st.run, 'a defeat records nothing and the next attempt starts at the same battle');

done('celestial20b');
