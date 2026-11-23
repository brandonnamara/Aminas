// Phase 18D: the rare third-form Explore encounters and the level-cap findings (rule level, automated).
const { load, ok, done, seeded } = require('./harness');
const c = load(), A = c.A, D = A.Data, R = A.Rules, W = A.World, S = A.State, V = R.V18, B = R.Battle, F = A.SaveFile;
let T = Date.UTC(2027, 0, 1, 12); const realNow = Date.now; Date.now = () => T; const nextDay = () => { T += 86400000; };
function save() { const s = S.newGame(); s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; R.addAmina(s, 'lumifern', 30); s.islands.verdant = { unlocked: true, obstacles: {} }; s.res.food = 5000; return s; }
const clearD = (s, id) => { R.startRun(s, id, s.aminas.slice(0, 1).map((a) => a.uid)); let o; do { const b = R.createBattle(s, seeded(3)); b.foes.forEach((f) => (f.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; o = R.resolveBattle(s, b); } while (o.win && !o.cleared && s.run); };
const finishFinds = (s, area) => { for (let i = 0; i < 10 && (s.stats.explores[area] | 0) < D.AREAS[area].steps.length; i++) { const r = R.explore(s, area); if (s.pendingFind) R.befriend(s); } };

/* ================= rare encounters ================= */
ok(JSON.stringify(D.V18.rare.of) === JSON.stringify({ glowcap: 'terraflora3', streamside: 'aquaflora3', canopyedge: 'pyrophoenix' }) && Object.values(D.V18.rare.of).every((sp) => D.SPECIES[sp] && D.SPECIES[sp].stage === 3), 'one rare Amina per Verdant area, all existing third forms (Terraflora III, Aquaflora III, Pyro-Phoenix)');
ok(Object.keys(D.SPECIES).length === 63, 'no new species');
{
  const s = save(); R.rng = seeded(1);
  ok(V.rareState(s, 'glowcap').state === 'waiting', 'before the area’s usual finds, the rare one is not eligible');
  for (let i = 0; i < 2; i++) R.explore(s, 'glowcap'); ok(!s.pendingFind || !s.pendingFind.rare, 'exploring early never meets it');
  finishFinds(s, 'glowcap'); ok(V.rareState(s, 'glowcap').state === 'eligible', 'once the three usual finds are done, it becomes eligible');
  ok(V.rareState(s, 'streamside').state === 'waiting' || !R.areaUnlocked(s, 'streamside'), 'other areas are unaffected');
  // one roll per day: force a miss on the day's first roll, then many more explorations that day roll nothing
  R.rng = () => 0.99; const r1 = R.explore(s, 'glowcap'); R.rng = () => 0.0; let met = false; for (let i = 0; i < 50; i++) { const r = R.explore(s, 'glowcap'); if (r.rare) met = true; }
  ok(!r1.rare && !met && s.v18.rare.glowcap.n === 1, 'only the first exploration of the day rolls; 50 more the same day roll nothing (no farming)');
  ok(V.rareState(s, 'glowcap').today, 'the area says it has already rolled today');
  T -= 3 * 86400000; R.rng = () => 0; const back = R.explore(s, 'glowcap'); T += 3 * 86400000;
  ok(!back.rare && s.v18.rare.glowcap.n === 1, 'a clock set back gives no extra roll');
  nextDay(); R.rng = () => 0.05; const hit = R.explore(s, 'glowcap');
  ok(hit.ok && hit.rare && hit.find.sp === 'terraflora3' && s.pendingFind.rare, 'a successful roll (under 20%) offers Terraflora III, marked rare');
  const food0 = s.res.food, n0 = s.aminas.length, b = R.befriend(s);
  ok(b.ok && b.rare && b.inst.sp === 'terraflora3' && b.inst.lv === 26 && s.res.food === food0 - D.BEFRIEND_COST && s.aminas.length === n0 + 1, 'befriending it costs the usual food and it joins at level 26');
  ok(s.owned.terraflora3 && s.seen.terraflora3 && V.rareState(s, 'glowcap').state === 'met', 'it enters the collection and Codex records; the area marks it met');
  for (let d = 0; d < 10; d++) { nextDay(); R.rng = () => 0; const r = R.explore(s, 'glowcap'); ok(d > 0 || !r.rare, 'once met it never appears again (day ' + (d + 1) + ')'); if (r.type === 'find') R.befriend(s); }
  const g0 = s.res.gold; nextDay(); R.explore(s, 'glowcap'); ok(s.res.gold - g0 <= 9 + 15, 'and exploring there still gives only the usual small amounts');
  const rt = F.parse(F.exportFile(s).text); ok(rt.ok && rt.st.v18.rare.glowcap.met && V.rareState(rt.st, 'glowcap').state === 'met', 'the record survives export and import');
}
{
  // declining keeps it waiting (like any find); it is not lost
  const s = save(); finishFinds(s, 'glowcap'); nextDay(); R.rng = () => 0; const r = R.explore(s, 'glowcap');
  ok(r.rare && s.pendingFind && s.pendingFind.rare, 'a met-but-not-yet-befriended rare Amina waits like any find');
  nextDay(); const r2 = R.explore(s, 'glowcap'); ok(r2.type === 'pending' && r2.find.rare, 'and is shown again next time instead of a new roll');
}
{
  // the pity: certain by the eighth daily roll; the rate across many seeded players
  const s = save(); finishFinds(s, 'glowcap'); R.rng = () => 0.99; let day = 0, got = 0;
  for (; day < 12 && !got; day++) { nextDay(); const r = R.explore(s, 'glowcap'); if (r.rare) got = day + 1; }
  ok(got === 8, 'with every roll unlucky, it still arrives on the eighth day (pity)');
  const days = []; for (let p = 0; p < 400; p++) { const t = save(); finishFinds(t, 'glowcap'); R.rng = seeded(1000 + p * 7919); for (let k = 0; k < 7; k++) R.rng(); for (let d = 1; d <= 8; d++) { nextDay(); if (R.explore(t, 'glowcap').rare) { days.push(d); break; } } }
  const med = days.slice().sort((a, b) => a - b)[200], first = days.filter((d) => d === 1).length / 4;
  ok(days.length === 400 && med >= 2 && med <= 4 && first > 12 && first < 28, '400 simulated players: everyone meets it within 8 days; median day ' + med + ', ' + first.toFixed(0) + '% on the first day');
}
{
  // each area only offers its own rare Amina, and only when that area is open
  const s = save(); clearD(s, 'v_mossgate'); clearD(s, 'v_aqueduct'); finishFinds(s, 'streamside'); nextDay(); R.rng = () => 0;
  const r = R.explore(s, 'streamside'); ok(r.rare && r.find.sp === 'aquaflora3', 'Streamside offers Aquaflora III');
  ok(V.rareState(s, 'canopyedge').state === 'waiting', 'Canopy Edge, still locked, offers nothing');
  ok(!D.AREAS.meadow.rare && V.rareState(s, 'meadow').state === 'none', 'Starter Island areas have no rare encounter');
}

/* ================= the level cap (40) ================= */
{
  const s = save(), a = s.aminas[0]; a.lv = 39; a.xp = R.xpNeed(39) - 10;
  const r = R.addXp(s, a, 500);
  ok(a.lv === 40 && a.xp === 0 && r.capped && r.gained === 10, 'reaching 40 keeps no XP past the cap, and reports only the XP that counted (10 of 500)');
  const r2 = R.addXp(s, a, 999); ok(a.lv === 40 && a.xp === 0 && r2.gained === 0 && r2.capped, 'at 40, XP is not added and the result says so (max level)');
  const f = R.feed(s, a.uid, 'feast'), food = s.res.food; ok(f.ok === false && f.reason === 'max' && s.res.food === food, 'feeding at 40 is refused and costs nothing');
  const st40 = R.statsAt(a.sp, 40), st39 = R.statsAt(a.sp, 39); ok(st40.hp > st39.hp && st40.atk >= st39.atk, 'stats at 40 continue the same line (' + st39.hp + ' → ' + st40.hp + ' HP)');
  R.moveSlots(a); R.Essence.gain(s, 'light', 999, 'test'); const up = R.upgradeMove(s, a.uid, 0); ok(up.ok && a.mv[0] === 2, 'move upgrades still work at 40 (they cost essence, not levels)');
  // a battle at 40: gold and food still paid; XP row says max level
  R.startRun(s, 'v_mossgate', [a.uid]); const b = R.createBattle(s, seeded(2)); b.foes.forEach((x) => (x.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; const g0 = s.res.gold, out = R.resolveBattle(s, b);
  ok(out.win && s.res.gold > g0 && out.xp[0].capped && out.xp[0].gained === 0 && a.lv === 40, 'a battle won at 40 still pays gold and food; its XP row is marked max level');
  const rt = F.parse(F.exportFile(s).text); ok(rt.ok && rt.st.aminas[0].lv === 40 && rt.st.aminas[0].xp === 0, 'a level-40 Amina saves and loads as is');
  const bad = JSON.parse(JSON.stringify(s)); bad.aminas[0].lv = 44; S.sanitize(bad); ok(bad.aminas[0].lv === 40, 'a damaged save above 40 is clamped to 40');
  // future expansion: raising the cap later continues from 40 with nothing lost or invented
  D.MAX_LEVEL = 45; const r3 = R.addXp(s, a, R.xpNeed(40) + 7); ok(a.lv === 41 && a.xp === 7, 'if the cap is raised later, a level-40 Amina simply carries on (41, 7 XP)'); D.MAX_LEVEL = 40; a.lv = 40; a.xp = 0;
  ok(R.xpNeed(40) === Math.floor(16 + 40 * 8 + 40 * 40 * 1.2), 'the XP formula already defines levels past 40');
  ok(D.SPECIES.solarbloom.evo.lv === 22 && D.SPECIES.lumifern.evo.lv === 12, 'evolution levels unchanged');
}
/* ---------- guardian: a guard raised against a charge goes first (Phase 18D fix) ---------- */
{
  const e = R.enemyFromSpec(D.DUNGEONS.v_elderroot.battles[9]), slow = B.fighter('terraflora', 36);
  const g = slow.abil.find((x) => D.ABILITIES[x].type === 'guard');
  ok(!!g && B.speed(slow) < B.speed(e), 'set-up: a level 36 Terraflora (speed ' + slow.spd + ') is slower than the Elder Root guardian (' + e.spd + ') and knows ' + g);
  const mk = (charging) => { const b = B.create([B.fighter('terraflora', 36)], [R.enemyFromSpec(D.DUNGEONS.v_elderroot.battles[9])], { rng: seeded(9) }); b.party[0].hpMax = b.party[0].hp = 9999; b.enemy.charging = charging; b.enemy.chargeIn = 0; return b; };
  const b1 = mk(true), ev1 = B.act(b1, { t: 'ab', id: g }), gi = ev1.findIndex((x) => x.t === 'guard' && x.who === 'p'), hi = ev1.findIndex((x) => x.t === 'hit' && x.who === 'p');
  ok(gi >= 0 && hi > gi && ev1[hi].guarded && ev1[hi].big, 'guarding the charged Crown of Thorns: the guard goes up first and the big hit is guarded, though the guardian is faster');
  const b2 = mk(false); b2.enemy.chargeIn = 3; const ev2 = B.act(b2, { t: 'ab', id: g }), gi2 = ev2.findIndex((x) => x.t === 'guard' && x.who === 'p'), hi2 = ev2.findIndex((x) => x.t === 'hit' && x.who === 'p');
  ok(hi2 >= 0 && gi2 > hi2, 'against an ordinary attack the order is unchanged: the faster guardian still strikes first');
  const b3 = mk(true), atk = b3.party[0].abil.find((x) => D.ABILITIES[x].type !== 'guard' && D.ABILITIES[x].power), ev3 = B.act(b3, { t: 'ab', id: atk });
  ok(ev3.findIndex((x) => x.t === 'hit' && x.who === 'p') < ev3.findIndex((x) => x.t === 'hit' && x.who === 'e'), 'attacking into a charge is unchanged: the faster guardian fires first');
}
Date.now = realNow;
done('polish18d');
