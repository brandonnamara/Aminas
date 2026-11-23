// Phase 18B: the Verdant Wilds under construction. Level cap 40, the island's places and ten dungeon entrances (none
// enterable), navigation, three prepared Explore areas, future-island readiness, quest visibility and saves.
const { load, ok, done } = require('./harness');
const c = load(), A = c.A, D = A.Data, R = A.Rules, W = A.World, S = A.State, Q = A.Quests;
const fresh = () => { const s = S.newGame(); s.phase = 'play'; s.introDone = true; return s; };
const h = (str) => { let x = 2166136261; for (const ch of str) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x; };
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ---------- level cap 40 ---------- */
ok(R.levelCap(A.State.newGame()) === 40, 'the level cap is 40 (approved: raised from 30; Phase 19B: 40 until the Forest Crown)');
ok([1, 10, 22, 29, 30, 35, 39].map(R.xpNeed).join() === '25,216,772,1257,1336,1766,2153', 'experience per level is the same formula, continued past 30 (16 + 8·lv + 1.2·lv²)');
ok(JSON.stringify([[10, 10], [20, 15], [25, 20], [30, 26], [35, 30], [40, 33]].map(([a, b]) => R.xpScale(a, b))) === '[1,0.25,0.25,0.5,0.25,0.25]', 'battle XP scaling against weaker foes is unchanged');
{
  const s = fresh(), a = R.addAmina(s, 'lumifern', 30); a.xp = 0;
  const r = R.addXp(s, a, R.xpNeed(30) + 10);
  ok(a.lv === 31 && a.xp === 10, 'an Amina at level 30 levels up to 31 with its XP carried over');
  let n = 0; while (a.lv < 40 && n++ < 100) R.addXp(s, a, R.xpNeed(a.lv));
  ok(a.lv === 40 && a.xp === 0, 'it can reach 40, where XP stops');
  R.addXp(s, a, 5000); ok(a.lv === 40 && a.xp === 0, 'XP past 40 is not stored');
  const f = R.feed ? R.feed(s, a.uid, 'snack') : (A.Progression && A.Progression.feed ? A.Progression.feed(s, a.uid, 'snack') : null);
  ok(!f || f.ok === false, 'feeding an Amina at 40 is refused (max)');
  const s30 = R.statsAt('lumifern', 30), s40 = R.statsAt('lumifern', 40);
  ok(s30.hp === 192 && s30.atk === 46 && s40.hp === 243 && s40.atk === 58, 'stats keep growing on the same line: level 30 is unchanged (192 HP, 46 ATK), level 40 is 243 HP, 58 ATK');
  ok(D.SPECIES.lumifern.evo.lv === 12 && D.SPECIES.solarbloom && D.SPECIES.solarbloom.evo && D.SPECIES.solarbloom.evo.lv === 22, 'evolution stays at 12 and 22');
}
{
  // an older save: an Amina parked at 30 (its XP was discarded at the old cap) is not changed by loading
  const s = fresh(), a = R.addAmina(s, 'kairyu', 30); a.xp = 0; const b = R.addAmina(s, 'acinus', 18); b.xp = 77;
  const before = clone(s.aminas); const t = clone(s); delete t.v18; S.sanitize(t);
  ok(JSON.stringify(t.aminas.map((x) => [x.uid, x.lv, x.xp])) === JSON.stringify(before.map((x) => [x.uid, x.lv, x.xp])), 'loading an older save changes no level or XP (nothing retroactive)');
  const u = clone(s); u.aminas[0].lv = 35; u.aminas[1].lv = 57; S.sanitize(u);
  ok(u.aminas[0].lv === 35 && u.aminas[1].lv === 57, 'a saved level between 31 and 40 loads as is, and (Phase 19B, approved) no saved level is ever lowered');
}

/* ---------- the island is not rebuilt ---------- */
ok(h(JSON.stringify(D.ISLANDS.verdant.map)) === 2177902011 && h(JSON.stringify(D.OBSTACLE_LAYOUT.verdant)) === 3190605555, 'the Verdant map and its 60 obstacles (ids and cells) are exactly as before');
ok(h(JSON.stringify(D.ISLANDS.starter.map)) === 1096025192 && h(JSON.stringify(D.OBSTACLE_LAYOUT.starter)) === 3398081770, 'Starter Island is untouched');
ok(Object.keys(D.SPECIES).length === 63, 'no new species (63)');

/* ---------- places and entrances ---------- */
const isl = D.ISLANDS.verdant, V = R.V18;
const feats = D.V18.sites.map((s) => ({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h, slot: s.slot })).concat(D.V18.gates.filter((g) => !g.site).map((g) => ({ id: g.id, x: g.x, y: g.y, w: 1, h: 1 })));
const cells = (f) => { const out = []; for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) out.push([x, y]); return out; };
ok(feats.every((f) => cells(f).every(([x, y]) => !isl.buildable[y][x] && isl.map[y][x] !== '~')), 'every place and entrance stands on sand, path, water, bridge or the old landmark slot: never on buildable grass or the sea');
ok(D.V18.gates.filter((g) => g.site).every((g) => { const s = V.site(g.site); return g.x >= s.x && g.x < s.x + s.w && g.y >= s.y && g.y < s.y + s.h; }), 'the three entrances inside a place (Archive, Twin Shrine, Elder Root) lie within it');
{
  const used = {}; let clash = 0; feats.forEach((f) => cells(f).forEach(([x, y]) => { if (used[x + ',' + y]) clash++; used[x + ',' + y] = f.id; }));
  const occ = {}; D.OBSTACLE_LAYOUT.verdant.forEach(([id, t, x, y]) => { const T = D.OBSTACLE_TYPES[t]; for (let j = 0; j < T.h; j++) for (let i = 0; i < T.w; i++) occ[(x + i) + ',' + (y + j)] = id; });
  ok(clash === 0 && Object.keys(used).every((k) => !occ[k]), 'no two features share a cell, and none sits on an obstacle');
}
ok(D.V18.sites.find((s) => s.slot).x === 21 && D.V18.sites.find((s) => s.slot).kind === 'elderroot' && isl.map[20].slice(21, 24) === 'xxx', 'the Elder Root is the island’s existing landmark slot (21–23, 20–22)');
ok(D.V18.gates.length === 10 && D.V18.gates.map((g) => g.n).join() === '1,2,3,4,5,6,7,8,9,10' && new Set(D.V18.gates.map((g) => g.id)).size === 10, 'ten entrances, numbered in the Phase 18A order, each with its own id');
ok(D.V18.gates.map((g) => g.rec).join() === '22,24,25,27,28,30,31,33,34,36', 'recommended levels follow Band C (22 to 36)');
// Phase 18C: the campaign now exists. Every entrance has playable dungeon data with its own id, in order.
ok(D.V18.gates.every((g, i) => D.DUNGEONS[g.id] && D.DUNGEONS[g.id].playable && D.CAMPAIGN.verdant.dungeons[i] === g.id), 'Phase 18C: each entrance has its playable dungeon, in the same order as the island campaign');

/* ---------- gate states (Phase 18C: open, in order) ---------- */
{
  const s = fresh();
  ok(V.gates(s).every((g) => g.state === 'locked'), 'before the Verdant Wilds is reached every entrance is locked');
  s.islands.verdant = { unlocked: true, obstacles: {} };
  const gs = V.gates(s);
  ok(gs[0].state === 'open' && gs.slice(1).every((g) => g.state === 'locked'), 'once there, Dungeon 1 is open and 2–10 are locked behind the one before');
  ok(/Opens after the Mossgate Steps/.test(gs[1].text) && /Opens after the Choir of Roots/.test(gs[9].text), 'a locked entrance names the dungeon that opens it');
  const run2 = R.startRun(s, 'v_elderroot', s.aminas.map((a) => a.uid));
  ok(run2.ok === false && !s.run, 'a locked Verdant dungeon cannot be started directly');
  // the campaign switch still closes everything (a safety valve for later islands' patterns)
  D.V18.live = false;
  ok(V.gateState(s, 'v_mossgate').state === 'sealed' && R.startRun(s, 'v_mossgate', []).ok === false, 'with the campaign switch off, the open entrance goes back to sealed and cannot be entered');
  D.V18.live = true;
}

/* ---------- navigation: everything is reachable on foot from the landing ---------- */
{
  const s = fresh(); s.islands.verdant = { unlocked: true, obstacles: {} };
  const reach = (st) => {
    const occ = W.occupancy(st, 'verdant'), ok2 = (x, y) => isl.land[y] && isl.land[y][x] && !occ.has(x + ',' + y);
    const seen = new Set(['16,28']), q = [[16, 28]];
    while (q.length) { const [x, y] = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && ok2(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } }); }
    return seen;
  };
  const near = (seen, f) => cells(f).some(([x, y]) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy))));
  const r0 = reach(s), miss = feats.filter((f) => !near(r0, f)).map((f) => f.id);
  ok(miss.length === 0, 'with every obstacle still standing, each place and entrance can be walked to from the Landing Cove' + (miss.length ? ' (missing ' + miss.join(', ') + ')' : ''));
  // with the obstacles cleared (as players do), every land cell is one connected piece
  const s2 = fresh(); s2.islands.verdant = { unlocked: true, obstacles: {} };   const occ0 = W.occupancy; W.occupancy = () => new Set(); const r1 = reach(s2); W.occupancy = occ0;
  const land = []; for (let y = 0; y < isl.grid.h; y++) for (let x = 0; x < isl.grid.w; x++) if (isl.land[y][x]) land.push(x + ',' + y);
  ok(land.every((k) => r1.has(k)), 'with the obstacles cleared, all ' + land.length + ' land cells connect to the landing');
  const free = land.filter((k) => !W.occupancy(s, 'verdant').has(k)), cut = free.filter((k) => !r0.has(k));
  console.log('  note: with every obstacle standing, ' + cut.length + ' of ' + free.length + ' free cells are pockets enclosed by obstacles (the original layout; no feature is in one)');
  ok(W.occupancy(s, 'verdant').size === W.occupancy(fresh(), 'verdant').size, 'the places and entrances add nothing to the occupancy grid: they block no building, creature or route');
}

/* ---------- three prepared Explore areas ---------- */
{
  const ids = ['glowcap', 'streamside', 'canopyedge'];
  ok(ids.every((id) => D.AREAS[id] && D.AREA_ORDER.indexOf(id) >= 0 && D.AREAS[id].island === 'verdant'), 'three Verdant Explore areas exist: Glowcap Glade, Streamside, Canopy Edge');
  const finds = ids.flatMap((id) => D.AREAS[id].steps.filter((x) => x[0] === 'find').map((x) => x[1]));
  ok(finds.length === 9 && finds.every((sp) => D.SPECIES[sp]), 'each offers three existing species (' + finds.join(', ') + ')');
  ok(finds.every((sp) => D.SPECIES[sp].stage >= 2), 'all of them second or third forms (they help the evolved-forms milestones)');
  const s = fresh();
  ok(ids.every((id) => !R.areaListed(s, id)) && ['meadow', 'tidepools'].every((id) => R.areaListed(s, id)), 'they are not listed on the Explore screen before the island is reached');
  s.islands.verdant = { unlocked: true, obstacles: {} };
  ok(ids.every((id) => R.areaListed(s, id)) && R.areaUnlocked(s, 'glowcap') && !R.areaUnlocked(s, 'streamside') && !R.areaUnlocked(s, 'canopyedge'), 'once it is reached they are listed: Glowcap Glade open on arrival (Phase 18C), the other two locked');
  ok(/Drowned Aqueduct/.test(W.reqText(D.AREAS.streamside.unlock)) && /Canopy Walk/.test(W.reqText(D.AREAS.canopyedge.unlock)), 'the locked two say which dungeon opens them');
  const e = R.explore(s, 'streamside'); ok(e.ok === false && e.reason === 'locked' && !(s.stats.explores || {}).streamside, 'exploring a locked one is refused and counts nothing');
  ok(R.AREA_LV.glowcap === 18 && R.AREA_LV.canopyedge === 24 && R.AREA_LV.meadow === 2, 'befriend levels are set for later (18, 20, 24); the old areas keep theirs');
  ok(R.reqMet(s, { struct: 'hollow' }) === R.reqMet(s, { struct: 'hollow', island: 'verdant' }) && R.reqMet(fresh(), { island: 'verdant' }) === false, 'requirements gain an island condition without changing the others');
}

/* ---------- future islands are not ready: travel, unlock, quests ---------- */
{
  ok(W.islandLive('starter') && W.islandLive('verdant') && !W.islandLive('obsidian') && !W.islandLive('celestial'), 'Obsidian Reach and the Celestial Crown are marked not ready; the first two islands are');
  const s = fresh(); s.islands.verdant = { unlocked: true, obstacles: {} };
  ok(W.unlockByBoss(s, 'obsidian').ok === false && W.unlockIsland(s, 'obsidian').ok === false && !s.islands.obsidian, 'they cannot be unlocked in a new save');
  const vq = (st) => Q.visible(st).map((q) => q.id);
  ok(vq(s).indexOf('s_reach') < 0 && vq(s).indexOf('s_crown') < 0, 'their quests stay hidden');
  // an older save that unlocked Obsidian Reach (bought with gold in an early build), quest progress recorded
  const L = fresh(); L.islands.verdant = { unlocked: true, obstacles: {} }; L.islands.obsidian = { unlocked: true, obstacles: {}, unlockedAt: 1 };
  S.sanitize(L); const keep = clone({ islands: L.islands, missions: L.missions, buildings: L.buildings }); // as an older build saved it
  L.currentIsland = 'obsidian'; S.sanitize(L);
  ok(L.currentIsland === 'verdant' && L.islands.obsidian.unlocked && JSON.stringify(L.islands.obsidian) === JSON.stringify(keep.islands.obsidian), 'a save standing on Obsidian Reach loads on the Verdant Wilds; its Obsidian unlock and obstacle records are kept as they were');
  const tr = W.travel(L, 'obsidian'); ok(tr.ok === false && tr.reason === 'notready' && L.currentIsland === 'verdant', 'travel to Obsidian Reach is refused with a reason');
  ok(W.travel(L, 'starter').ok && W.travel(L, 'verdant').ok, 'travel between Starter Island and the Verdant Wilds still works');
  ok(vq(L).indexOf('s_reach') < 0, 'its Obsidian quest is hidden rather than pointing at an island that cannot be visited');
  ok(JSON.stringify(L.missions) === JSON.stringify(keep.missions), 'quest records are untouched');
  // activation later: one flag, no migration
  D.ISLAND_LIVE.obsidian = true;
  ok(W.travel(L, 'obsidian').ok && L.currentIsland === 'obsidian' && Q.islandReachable(L, 'obsidian'), 'marking Obsidian Reach ready is the whole activation: the same save travels there');
  D.ISLAND_LIVE.obsidian = false; W.travel(L, 'verdant');
}

/* ---------- saves ---------- */
{
  const s = fresh(); ok(s.v18 && typeof s.v18.seen === 'object', 'a new game has st.v18 = { seen: {} }');
  s.islands.verdant = { unlocked: true, obstacles: {} };
  const r1 = V.visit(s, 'archive'), r2 = V.visit(s, 'archive'), r3 = V.visit(s, 'nowhere');
  ok(r1.first && !r2.first && r3.ok === false && V.seen(s, 'archive'), 'a visit is recorded once; an unknown place is refused');
  const old = clone(s); delete old.v18; S.sanitize(old); ok(old.v18 && Object.keys(old.v18.seen).length === 0, 'a save from before Phase 18B gains an empty record');
  const bad = clone(s); bad.v18 = { seen: { archive: 'x', bogus: 5 } }; S.sanitize(bad); ok(bad.v18.seen.archive === 1 && !('bogus' in bad.v18.seen), 'a damaged record is repaired: unknown places dropped, times made numbers');
  const rt = clone(s); S.sanitize(rt); ok(JSON.stringify(rt.v18) === JSON.stringify(s.v18) && V.progress(rt).seen === 1, 'a save round-trips with its visits');
  ok(V.progress(s).total === 7, 'seven places to visit (the second Settlement and Aqueduct parts count with their first)');
}
done('verdant18b');
