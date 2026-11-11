// Phase 12C (rules, no DOM): proximity points for hiders and who a hider may spectate.
// Uses the real Starter Island map (tests/fixtures/hs-starter-map.json) and a small made-up island with a gap, a
// bridge and a separate islet, for the "cut off by terrain" cases.
// Run: node tests/hideseek12c.test.js
const { load, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, HS = R.HideSeek, C = D.HIDESEEK, SC = C.score;
const MAP = require('./fixtures/hs-starter-map.json');
const hyp = Math.hypot;
const quiet = (m) => { m.hiders.forEach((h) => (h.bot = false)); m.seeker.bot = false; return m; };
const put = (e, x, z) => { e.x = x; e.z = z; if (e.shape) { e.shape.x = x; e.shape.z = z; } };
// two strips of land (z 0..2 and z 5..7, x 0..19) joined only by a bridge at x 18..19, and an islet (x 22..24)
const strips = () => { const cols = []; const land = (x, y) => cols.push({ x, y, kind: 'grass', top: 0, bot: -40 });
  for (let x = 0; x < 20; x++) { for (let y = 0; y < 3; y++) land(x, y); for (let y = 5; y < 8; y++) land(x, y); } for (let x = 18; x < 20; x++) for (let y = 3; y < 5; y++) land(x, y);
  for (let x = 22; x < 25; x++) for (let y = 0; y < 3; y++) land(x, y);
  return { cols, items: [{ k: 'o', id: 'o1', type: 'bush', name: 'Berry Bush', x: 19, y: 7, w: 1, h: 1, seed: 5 }], scenery: [], extras: [] }; };
const arena = (map, seed) => { const st = S.fresh(), L = HS.lobby(st, seed || 99); return quiet(HS.makeArena(map, L, L.players[1].id)); };
const toSeek = (m) => { m.t = C.prep; m.phase = 'seek'; m.scoreT = C.prep; return m; };
// run the clock to exactly `to`, in steps of dt()
const run = (m, to, dt) => { let n = 0; while (m.t < to - 1e-9 && !m.over && n++ < 1e6) HS.step(m, Math.min(dt(), to - m.t), 'you'); };
const M = (units) => +(units * SC.metresPerUnit).toFixed(3);

/* calibration and tiers */
ok(SC.metresPerUnit === 1.25 && JSON.stringify(SC.tiers.map((t) => [t.within, t.pts])) === '[[3,5],[8,3],[15,1]]' && SC.tick === 0.25, 'tiers as specified: 5 a second within 3 m, 3 within 8 m, 1 within 15 m, nothing beyond; one island unit is ' + SC.metresPerUnit + ' m');
let m = toSeek(arena(strips())), me = m.hiders[0], sk = m.seeker; m.hiders.slice(1).forEach((h, i) => put(h, 1.5 + i, 6.5));
put(sk, 0.5, 1.5);
const at = (units) => { put(me, 0.5 + units, 1.5); return HS.proximity(m, me); };
const want = [[1, 5], [2.3, 5], [2.4, 3], [4, 3], [6.4, 3], [6.5, 1], [10, 1], [12, 1], [12.1, 0], [16, 0]];
const got = want.map(([u]) => at(u).rate);
ok(JSON.stringify(got) === JSON.stringify(want.map((w) => w[1])), 'points a second by distance: ' + want.map(([u, r]) => M(u) + ' m → ' + r).join(', '));
{ const p = at(4); ok(p.valid && Math.abs(p.d - 4) < 1e-9 && Math.abs(p.metres - 5) < 1e-9 && p.tier === 1 && p.way === 'direct', 'the distance is the real distance between the hider and the Seeker on the island (4 units = 5 m)'); }

/* accumulation: fixed ticks of the round clock, the same at any frame rate */
const total = (dt, extra) => { const a = toSeek(arena(strips())); const h = a.hiders[0]; a.hiders.slice(1).forEach((q, i) => put(q, 1.5 + i, 6.5)); put(a.seeker, 0.5, 1.5); put(h, 4.5, 1.5); let i = 0;
  while (a.t < C.prep + 10.1 - 1e-9) { HS.step(a, Math.min(dt(i++), C.prep + 10.1 - a.t), 'you'); if (extra) extra(a); } return { pts: HS.points(h), q: h.scoreQ, t: a.t }; };
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rates = { '60 fps': () => 1 / 60, '30 fps': () => 1 / 30, '20 fps': () => 1 / 20, '7 fps': () => 1 / 7, '4 fps': () => 0.25, 'uneven frames': () => 0.004 + rnd() * 0.2 };
const res = Object.keys(rates).map((k) => [k, total(rates[k])]);
ok(res.every(([, r]) => r.q === res[0][1].q) && res[0][1].pts === 30, 'ten seconds at 5 m scores 30 points at every frame rate (' + res.map(([k, r]) => k + ': ' + r.pts).join(', ') + ')');
const dup = total(() => 1 / 30, (a) => { HS.scoreStep(a); HS.scoreStep(a); HS.step(a, 0, 'you'); });
ok(dup.q === res[0][1].q, 'calling the scoring again at the same moment, or stepping with no time passed, adds nothing');
{ const a = toSeek(arena(strips())), h = a.hiders[0]; put(a.seeker, 0.5, 1.5); put(h, 1.5, 1.5); a.hiders.slice(1).forEach((q, i) => put(q, 1.5 + i, 6.5));
  HS.step(a, 30, 'you'); const afterGap = h.scoreQ, t1 = a.t; for (let i = 0; i < 200; i++) HS.step(a, 0, 'you');
  ok(Math.abs(t1 - C.prep - 0.25) < 1e-9 && afterGap === 5 && h.scoreQ === 5, 'a long gap between frames (pausing, the app in the background) moves the round clock by a quarter of a second at most: one tick of points, not thirty seconds’ worth'); }

/* when points are given */
{ const a = arena(strips()), h = a.hiders[0]; put(a.seeker, 0.5, 1.5); put(h, 1.5, 1.5); a.hiders.slice(1).forEach((q, i) => put(q, 1.5 + i, 6.5)); a.hiders.forEach((q) => { q.nextMorph = 0; HS.disguise(a, q.id, 'o:bush'); });
  run(a, C.prep - 0.01, () => 1 / 30); ok(a.phase === 'prep' && h.scoreQ === 0 && HS.proximity(a, h).valid === false, 'no points during hiding time, even right beside the Seeker');
  run(a, C.prep + 4, () => 1 / 30); const q4 = h.scoreQ; ok(a.phase === 'seek' && HS.points(h) === 20, 'points start with the search: 4 seconds beside the Seeker is 20 points');
  h.found = true; h.foundAt = a.t; run(a, C.prep + 8, () => 1 / 30); ok(h.scoreQ === q4 && HS.proximity(a, h).rate === 0, 'a hider stops scoring the moment they are found'); }
{ const a = arena(strips()), h = a.hiders[0], o = a.hiders[1]; put(a.seeker, 0.5, 1.5); put(h, 1.5, 1.5); put(o, 10.5, 1.5); a.hiders.slice(2).forEach((q, i) => put(q, 1.5 + i, 6.5)); a.hiders.forEach((q) => { q.nextMorph = 0; HS.disguise(a, q.id, 'o:bush'); });
  run(a, C.prep + C.seconds + 5, () => 1 / 30); const end = h.scoreQ; for (let i = 0; i < 60; i++) HS.step(a, 1 / 30, 'you');
  ok(a.over && a.result === 'hiders' && HS.points(h) === 5 * C.seconds && HS.points(o) === 1 * C.seconds && h.scoreQ === end, 'a whole search beside the Seeker is ' + 5 * C.seconds + ' points (12.5 m away: ' + C.seconds + '); nothing is added after the round ends'); }
{ // moving changes the rate; standing still keeps earning; other players’ positions never matter
  const a = toSeek(arena(strips())), h = a.hiders[0], o = a.hiders[1]; put(a.seeker, 0.5, 1.5); put(h, 10.5, 1.5); put(o, 1.5, 1.5); a.hiders.slice(2).forEach((q, i) => put(q, 1.5 + i, 6.5));
  run(a, C.prep + 2, () => 1 / 30); const far = HS.points(h); put(h, 2.5, 1.5); run(a, C.prep + 4, () => 1 / 30);
  ok(far === 2 && HS.points(h) === 2 + 10 && HS.points(o) === 20, 'each hider scores from where their own disguise stands (10 m: 1 a second; then 2.5 m: 5 a second), still or moving'); }

/* invalid positions */
m = toSeek(arena(strips())); me = m.hiders[0]; sk = m.seeker; m.hiders.slice(1).forEach((h, i) => put(h, 1.5 + i, 6.5));
put(sk, 2.5, 2.5); put(me, 2.5, 5.5);
{ const p = HS.proximity(m, me); ok(p.valid && p.way === 'round' && p.d > 30 && p.rate === 0 && hyp(me.x - sk.x, me.z - sk.z) === 3, 'across a gap nobody can cross, the distance is the way round on foot: 3.75 m in a straight line but ' + Math.round(p.metres) + ' m to walk, so no points'); }
put(sk, 17.5, 2.5); put(me, 17.5, 5.5);
{ const p = HS.proximity(m, me); ok(p.valid && p.way === 'round' && p.d >= 3 && p.d <= 5.5 && p.rate === 3, 'close to the bridge the walk is short, so the points are what the walk earns (' + p.metres.toFixed(1) + ' m: 3 a second)'); }
put(sk, 19.5, 1.5); put(me, 22.5, 1.5);
{ const p = HS.proximity(m, me); ok(!p.valid && p.why === 'cut-off' && p.rate === 0, 'a player on land the Seeker can never reach scores nothing (3.75 m away across open air)'); }
put(sk, 0.5, 1.5); put(me, -3, 1.5); ok(!HS.proximity(m, me).valid && HS.proximity(m, me).why === 'off-island', 'a position off the island scores nothing');
put(me, 1.5, 1.5); put(sk, 1.5, 3.5); ok(!HS.proximity(m, me).valid, 'nor does anyone score if the Seeker is somehow off the playable island');
{ const a = toSeek(arena(strips())), h = a.hiders[0]; put(a.seeker, 19.5, 1.5); put(h, 22.5, 1.5); a.hiders.slice(1).forEach((q, i) => put(q, 1.5 + i, 6.5)); run(a, C.prep + 5, () => 1 / 30); ok(h.scoreQ === 0, 'and no points build up over time in an invalid position'); }
// the real island
{ const a = toSeek(arena(MAP, 4321)), h = a.hiders[0], cells = [...a.cells.values()]; const ledge = cells.find((c) => c.kind === 'ledge'); put(a.seeker, a.start.x, a.start.z); put(h, ledge.x + 0.5, ledge.z + 0.5);
  ok(!HS.proximity(a, h).valid, 'on the Starter Island a ledge outside the playable area scores nothing');
  put(h, a.start.x + 2, a.start.z); const p = HS.proximity(a, h); ok(p.valid && p.way === 'direct' && Math.abs(p.metres - 2.5) < 1e-6 && p.rate === 5, 'and open ground scores by the straight distance (2 cells from the Seeker = 2.5 m: 5 a second)');
  let checked = 0, bad = 0; cells.filter((c) => c.walk).forEach((c) => { put(h, c.x + 0.5, c.z + 0.5); const q = HS.proximity(a, h); checked++; if (q.valid && q.d + 1e-9 < hyp(h.x - a.seeker.x, h.z - a.seeker.z)) bad++; });
  ok(checked > 450 && bad === 0, 'the distance used is never shorter than the straight line (' + checked + ' places on the island checked)'); }

/* results */
{ const st = S.fresh(), L = HS.lobby(st, 2468); const a = HS.makeArena(MAP, L, L.players[1].id); while (!a.over) HS.step(a, 1 / 30, 'nobody-steers-you'); const sm = HS.summary(a, 'you');
  ok(sm.hiders.every((h) => typeof h.points === 'number' && h.points >= 0 && h.points <= 5 * C.seconds && h.near.length === 3) && sm.youPoints === sm.hiders.find((h) => h.id === 'you').points && sm.topPoints === Math.max(...sm.hiders.map((h) => h.points)), 'the results carry every hider’s points, the player’s own and the best of the round (' + sm.hiders.map((h) => h.name + ' ' + h.points).join(', ') + ')');
  const a2 = HS.makeArena(MAP, L, 'you'); ok(HS.summary(a2, 'you').youPoints === null, 'the Seeker has no proximity points'); }

/* points never change how the round plays */
{ const play = (off) => { const keep = SC.tiers; if (off) SC.tiers = []; const st = S.fresh(), L = HS.lobby(st, 1357); L.players[0].bot = true; const a = HS.makeArena(MAP, L, L.players[2].id); while (!a.over) HS.step(a, 1 / 30, 'x'); SC.tiers = keep; const sm = HS.summary(a, 'x'); return JSON.stringify({ r: sm.result, t: sm.time, s: sm.seeker, h: sm.hiders.map((h) => [h.name, h.look, h.found, h.at, h.morphs, h.moved]) }); };
  ok(play(false) === play(true), 'a round between computer players is identical with scoring switched off: the points change nothing in the round'); }
{ const st = S.fresh(); ok(JSON.stringify(st.hideseek) === JSON.stringify({ pref: 'hider', played: 0, won: 0, seekerCount: {} }) && JSON.stringify(Object.keys(st.res)) === JSON.stringify(Object.keys(S.fresh().res)), 'saves are unchanged: no new fields until a best score exists, and no rewards are attached to points'); }

/* spectating: who may be watched */
{ const st = S.fresh(), L = HS.lobby(st, 31), a = quiet(HS.makeArena(MAP, L, L.players[1].id)); const ids = (x) => x.map((h) => h.id).join();
  let list = HS.spectatable(a, 'you'); ok(list.length === 3 && list.every((h) => h.id !== 'you' && h.id !== a.seeker.id) && list.every((h) => a.hiders.indexOf(h) >= 0), 'a hiding player may watch the three other hiders, never the Seeker (' + list.map((h) => h.name).join(', ') + ')');
  a.hiders[2].found = true; ok(HS.spectatable(a, 'you').length === 2 && HS.spectatable(a, 'you').every((h) => !h.found), 'a hider who has been found drops out of the list');
  const snap = JSON.stringify({ h: a.hiders.map((h) => [h.x, h.z, h.key, h.found, h.scoreQ]), s: [a.seeker.x, a.seeker.z], t: a.t }); HS.spectatable(a, 'you'); HS.spectatable(a, 'you');
  ok(JSON.stringify({ h: a.hiders.map((h) => [h.x, h.z, h.key, h.found, h.scoreQ]), s: [a.seeker.x, a.seeker.z], t: a.t }) === snap, 'asking who can be watched changes nothing in the round');
  a.hiders[0].found = true; ok(ids(HS.spectatable(a, 'you')) === '', 'once found, the hider list no longer applies (the found player watches the Seeker, as before)');
  const b = quiet(HS.makeArena(MAP, L, 'you')); ok(ids(HS.spectatable(b, 'you')) === '', 'the Seeker cannot spectate the hiders');
  const c = quiet(HS.makeArena(MAP, L, L.players[1].id)); c.over = true; ok(ids(HS.spectatable(c, 'you')) === '', 'nobody is watched once the round is over'); }

done('hideseek12c');
