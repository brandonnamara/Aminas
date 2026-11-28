// Phase 19B: Obsidian Reach construction. The island's map, obstacles and saves are preserved; the staged level cap
// (40 → 50 after the Forest Crown → 60 after the Forge Heart); ten dungeon entrances in order (sealed in 19B, open since 19C);
// places with save-safe visits; three prepared Explore areas; the Forge (Metal) Habitat; readiness unchanged.
const { load, ok, done } = require('./harness');
const c = load(), A = c.A, D = A.Data, R = A.Rules, W = A.World, S = A.State, Q = A.Quests, O = R.O19;
const fresh = () => { const s = S.newGame(); s.phase = 'play'; s.introDone = true; return s; };
const builder = () => { const s = fresh(); s.struct.hollow = true; s.buildings.hollow.level = 1; s.buildings.hollow.state = 'built'; s.res.gold = 100000; s.rank = 5; return s; };
const h = (str) => { let x = 2166136261; for (const ch of str) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x; };
const clone = (o) => JSON.parse(JSON.stringify(o));
const beatVerdant = (s) => { s.campaign = s.campaign || {}; s.campaign.bosses = s.campaign.bosses || {}; s.campaign.bosses.verdant = true; };
const beatObsidian = (s) => { beatVerdant(s); s.campaign.bosses.obsidian = true; };

/* ---------- the existing island is preserved (fingerprints taken from the Phase 19A commit 0bd4d7f) ---------- */
{
  const I = D.ISLANDS.obsidian;
  ok(h(JSON.stringify(D.OBSTACLES.obsidian)) === 2342460501, 'the 59 Obsidian obstacles are unchanged: same ids, types and cells');
  ok(D.OBSTACLES.obsidian.length === 59 && [...new Set(D.OBSTACLES.obsidian.map((o) => o.type))].sort().join() === 'basalt,charred,crystal,embervent,obsidianshard,slagheap', 'still 59 obstacles of the same six types');
  ok(h(JSON.stringify(I)) === 850400893 && I.grid.w === 32 && I.grid.h === 32, 'the 32×32 map, buildable cells, price and island record are unchanged');
  ok(h(JSON.stringify(D.OBSTACLES)) === 3967827709, 'no other island’s obstacles changed');
  // every new place and gate stands on land, off every obstacle and off every buildable cell
  const occ = new Set(); D.OBSTACLES.obsidian.forEach((o) => { const t = D.OBSTACLE_TYPES[o.type]; for (let x = o.x; x < o.x + t.w; x++) for (let y = o.y; y < o.y + t.h; y++) occ.add(x + ',' + y); });
  const cells = []; D.O19.sites.forEach((s) => { for (let x = s.x; x < s.x + (s.w || 1); x++) for (let y = s.y; y < s.y + (s.h || 1); y++) cells.push([s.id, x, y]); });
  D.O19.gates.forEach((g) => cells.push([g.id, g.x, g.y]));
  const bad = cells.filter(([, x, y]) => !I.land[y][x] || I.buildable[y][x] || occ.has(x + ',' + y));
  ok(bad.length === 0, 'every place and entrance stands on land, never on a buildable cell or an obstacle' + (bad.length ? ' ' + JSON.stringify(bad) : ''));
}

/* ---------- staged level cap ---------- */
{
  const s = fresh();
  ok(D.MAX_LEVEL === 60 && D.CAP_BASE === 40, 'the absolute ceiling is 60; the starting cap is 40');
  ok(R.levelCap(s) === 40 && R.nextCap(s).cap === 50 && R.nextCap(s).boss === 'verdant', 'a new save is capped at 40, next 50 after the Forest Crown');
  beatVerdant(s); ok(R.levelCap(s) === 50 && R.nextCap(s).cap === 60, 'after the Forest Crown the cap is 50, next 60');
  beatObsidian(s); ok(R.levelCap(s) === 60 && R.nextCap(s) === null, 'after the Forge Heart it is 60, with nothing further');
  // the Forest Crown cleared the old way (its dungeon) counts too
  const t = fresh(), vc = D.CAMPAIGN && D.CAMPAIGN.verdant;
  if (vc && vc.islandBoss) { t.dungeon = t.dungeon || {}; t.dungeon[vc.islandBoss] = { clears: 1 }; ok(R.levelCap(t) === 50, 'an old save whose Island Boss dungeon is cleared gets the 50 cap'); }
  else ok(true, 'campaign boss dungeon not defined; boss flag path covered above');
  // XP stops at the cap and is not banked
  const u = fresh(), a = R.addAmina(u, 'lumifern', 39); a.xp = 0;
  R.addXp(u, a, R.xpNeed(39)); ok(a.lv === 40 && a.xp === 0, 'an Amina reaches 40 and stops');
  R.addXp(u, a, 99999); ok(a.lv === 40 && a.xp === 0, 'XP past the cap is not stored as hidden XP');
  beatVerdant(u); ok(a.lv === 40 && a.xp === 0, 'raising the cap grants nothing retroactively');
  R.addXp(u, a, R.xpNeed(40) + 3); ok(a.lv === 41 && a.xp === 3, 'after the raise it levels normally');
  let n = 0; while (a.lv < 50 && n++ < 200) R.addXp(u, a, R.xpNeed(a.lv)); R.addXp(u, a, 99999);
  ok(a.lv === 50 && a.xp === 0, 'it stops again at 50');
  // saves: nothing lowered
  const L = fresh(), hi = R.addAmina(L, 'lumifern', 47), mx = R.addAmina(L, 'lumifern', 60); hi.xp = 123;
  const raw = clone(L); S.sanitize(raw);
  const h2 = raw.aminas ? (Array.isArray(raw.aminas) ? raw.aminas : Object.values(raw.aminas)) : [];
  ok(h2.some((x) => x.uid === hi.uid && x.lv === 47 && x.xp === 123) && h2.some((x) => x.uid === mx.uid && x.lv === 60), 'a saved level above the current cap is never lowered on load (47 stays 47, XP kept; 60 stays 60)');
  const v = R.addXp(L, hi, 5000); ok(hi.lv === 47, 'an Amina already above the cap gains no levels until the cap reaches it');
  // the one-time notice
  const nS = fresh(); ok(O.capNotice(nS) === null && nS.o19.cap === 40, 'no notice on a new save');
  beatVerdant(nS); ok(O.capNotice(nS) === 50 && O.capNotice(nS) === null, 'the raise to 50 is announced once');
  const old = fresh(); beatVerdant(old); delete old.o19.cap; ok(O.capNotice(old) === 50, 'an old save with the Forest Crown beaten is told its cap is 50, once');
  const dm = fresh(); dm.o19.cap = 'x'; S.sanitize(dm); ok(dm.o19.cap === 40 && !('capSeen' in dm), 'a damaged cap record is repaired');
  ok(!('mastery' in fresh()) && !D.MASTERY, 'no Mastery system or permanent bonus exists yet');
}

/* ---------- dungeon entrances: none can be entered ---------- */
{
  ok(D.O19.gates.length === 10 && D.O19.gates.map((g) => g.n).join() === '1,2,3,4,5,6,7,8,9,10', 'ten entrances numbered 1–10');
  ok(D.O19.gates.map((g) => g.rec).join() === '38,39,40,41,42,43,44,45,46,47', 'recommended levels 38–47');
  ok(new Set(D.O19.gates.map((g) => g.x + ',' + g.y)).size === 10, 'each entrance has its own cell');
  const s = fresh(), st = (x) => O.gates(x).map((g) => g.state);
  ok(st(s).every((x) => x === 'locked'), 'without the Reach, every entrance is locked');
  s.islands.obsidian = { unlocked: true, obstacles: {}, unlockedAt: 1 };
  ok(st(s).every((x) => x === 'locked') && /Forest Crown/.test(O.gateState(s, 'o_cinder').text), 'with the Reach but not the Forest Crown, Dungeon 1 says why it is locked');
  beatObsidian(s);
  // Phase 19C: the ten dungeons are built, so entrances open in order instead of staying sealed
  ok(O.gateState(s, 'o_cinder').state === 'open' && st(s).slice(1).every((x) => x === 'locked'), 'with the Forest Crown beaten, Dungeon 1 is open (Phase 19C) and the rest wait in order');
  const early = D.O19.gates.slice(1).map((g) => R.startRun(s, g.id)); ok(early.every((r) => r && r.ok === false), 'starting a later Obsidian dungeon out of order is refused');
  D.O19.gates.forEach((g) => { s.dungeon = s.dungeon || {}; s.dungeon[g.id] = { clears: 1 }; });
  ok(st(s).every((x) => x === 'open') && D.O19.gates.every((g) => O.canEnter(s, g.id)), 'once each is cleared, every entrance is open');
  ok(D.O19.live === true && D.O19.gates.every((g) => O.built(g.id)), 'the campaign switch is on and all ten dungeons are built (Phase 19C)');
  // Explore areas wait on unbuilt dungeons
  ok(['ashplain', 'glassbeach', 'crystalvein'].every((id) => D.AREAS[id] && D.AREAS[id].island === 'obsidian' && D.AREAS[id].unlock.o19), 'three Explore areas are prepared');
  const f = fresh(); ok(['ashplain', 'glassbeach', 'crystalvein'].every((id) => !R.reqMet(f, D.AREAS[id].unlock)), 'none is open in a new save');
  ok(D.AREAS.ashplain.steps.filter((x) => x[0] === 'find').every((x) => D.SPECIES[x[1]]), 'their finds are existing species');
}

/* ---------- places and visits ---------- */
{
  const ids = D.O19.sites.map((x) => x.id);
  ok(['landing', 'glasswick', 'gallery', 'bellows', 'forge'].every((id) => ids.indexOf(id) >= 0), 'the landing, Glasswick, the Mirror Gallery, the Great Bellows and the Great Forge are places');
  ok(D.O19.sites.filter((x) => !x.part).every((x) => x.entity && x.text), 'each has a description and a short Entity line');
  const all = D.O19.sites.map((x) => x.text + ' ' + x.entity).join(' ');
  ok(!/Forge Heart is|the Shadow is|you are the/i.test(all), 'no story reveal in the place texts');
  const s = fresh(); ok(s.o19 && typeof s.o19.seen === 'object', 'a new game has st.o19 = { seen: {} }');
  const r1 = O.visit(s, 'gallery'), r2 = O.visit(s, 'gallery'), r3 = O.visit(s, 'nowhere');
  ok(r1.first && !r2.first && r3.ok === false && O.seen(s, 'gallery'), 'a visit is recorded once; an unknown place is refused');
  ok(O.progress(s).seen === 1 && O.progress(s).total === D.O19.sites.filter((x) => !x.part).length, 'progress counts visited places');
  const old = clone(s); delete old.o19; S.sanitize(old); ok(old.o19 && Object.keys(old.o19.seen).length === 0, 'a save from before Phase 19B gains an empty record');
  const bad = clone(s); bad.o19 = { seen: { gallery: 'x', bogus: 5 } }; S.sanitize(bad); ok(bad.o19.seen.gallery === 1 && !('bogus' in bad.o19.seen), 'a damaged record is repaired');
  const story = clone(fresh()); const s2 = fresh(); O.visit(s2, 'forge'); ok(JSON.stringify(s2.missions) === JSON.stringify(story.missions) && JSON.stringify(s2.campaign) === JSON.stringify(story.campaign), 'visiting the Great Forge advances no quest or story');
}

/* ---------- the Forge (Metal) Habitat ---------- */
{
  const b = D.BUILDINGS.hab_metal;
  ok(b && b.el === 'metal' && b.cat === D.BUILDINGS.hab_wind.cat && b.w === 3 && b.h === 3, 'a Metal habitat exists, 3×3, in the habitat category');
  ok(D.CATALOG.indexOf('hab_metal') === D.CATALOG.indexOf('hab_wind') + 1, 'it is listed after the Wind habitat');
  // Phase 20B (approved): the Resonance habitat (the Starwell Habitat) now exists, locked behind the Celestial Crown's Bell Loft
  ok(D.BUILDINGS.hab_resonance && D.BUILDINGS.hab_resonance.req.c20 === 'c_bellloft' && !R.reqMet(S.fresh(), D.BUILDINGS.hab_resonance.req), 'the Resonance habitat (Phase 20B) stays locked behind the Bell Loft');
  const w = D.BUILDINGS.hab_wind, lv = (x) => x.levels.map((l) => JSON.stringify([l.rate, l.capMin, l.capacity])).join();
  ok(lv(b) === lv(w), 'production rate, storage and capacity match the other habitats (no excess production)');
  ok(b.levels.map((l) => l.cost.gold).join() === '2000,4500,9000,16000,30000', 'costs 2000 → 30000 gold');
  const s = builder();
  ok(!R.reqMet(s, b.req) && /Island Boss/.test(W.reqText(b.req)), 'locked before the Forest Crown, with the reason in words');
  beatVerdant(s); ok(R.reqMet(s, b.req), 'available after the Forest Crown');
  const spot = W.findSpot(s, 'starter', 'hab_metal', 0, [10, 10]); const r = spot && W.buildNew(s, 'starter', 'hab_metal', spot[0], spot[1], 0);
  const id = Object.keys(s.buildings).find((k) => s.buildings[k].type === 'hab_metal');
  ok(spot && r && r.ok !== false && id, 'it can be placed on a free spot');
  const before = clone(s.buildings); S.sanitize(s); ok(JSON.stringify(s.buildings) === JSON.stringify(before), 'placing it moves no existing building and survives a reload');
  ok(JSON.stringify(b.affinity) === '["metal"]' && b.produces === w.produces && b.perResident === w.perResident, 'Metal Aminas get the habitat affinity bonus, through the same rule as every habitat');
  ok(b.maxCount <= w.maxCount, 'no more Forge Habitats can be built than any other kind');
}

/* ---------- old saves with buildings on the Reach; readiness unchanged ---------- */
{
  ok(W.islandLive('obsidian'), 'Obsidian Reach is live (Phase 19C)');
  const L = builder(); L.islands.verdant = { unlocked: true, obstacles: {} }; const oid = D.OBSTACLES.obsidian[0].id; L.islands.obsidian = { unlocked: true, obstacles: { [oid]: { state: 'cleared', rewarded: true } }, unlockedAt: 1 };
  const spot = W.findSpot(L, 'obsidian', 'hab_fire', 0, [10, 10]); const br = spot && W.buildNew(L, 'obsidian', 'hab_fire', spot[0], spot[1], 0);
  const keep = clone(L.buildings); L.currentIsland = 'obsidian'; S.sanitize(L);
  ok(br && br.ok !== false && JSON.stringify(L.buildings) === JSON.stringify(keep) && Object.values(L.buildings).some((x) => x.island === 'obsidian'), 'a building already on the Reach (old build) is kept exactly where it was');
  ok(L.currentIsland === 'obsidian' && L.islands.obsidian.unlocked && L.islands.obsidian.obstacles[oid] && L.islands.obsidian.obstacles[oid].state === 'cleared', 'the save stays on the Reach (Phase 19C: it is ready); its unlock and obstacle records are kept');
  ok(Q.islandReachable(L, 'obsidian'), 'quests can point at the Reach again');
  // Phase 19C: the developer shortcut cannot skip progression
  const p = fresh(); const pr = O.preview(p); ok(pr.ok === false && !W.islandUnlocked(p, 'obsidian'), 'the developer shortcut never unlocks the island on a save that has not opened it');
  const q = fresh(); q.islands.obsidian = { unlocked: true, obstacles: { [oid]: { state: 'cleared', rewarded: true } }, unlockedAt: 1, by: 'preview' }; q.currentIsland = 'obsidian'; S.sanitize(q);
  ok(!W.islandUnlocked(q, 'obsidian') && q.currentIsland !== 'obsidian' && q.islands.obsidian.obstacles[oid].state === 'cleared', 'a 19B construction-preview unlock without the Forest Crown is closed on load; its obstacle record is kept');
  const r = fresh(); beatVerdant(r); r.islands.verdant = { unlocked: true, obstacles: {} }; r.islands.obsidian = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'preview' }; S.sanitize(r);
  ok(W.islandUnlocked(r, 'obsidian') && r.islands.obsidian.by === 'boss', 'with the Forest Crown beaten it becomes the normal unlock');
}

done('obsidian19b');
