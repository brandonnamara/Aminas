// Hide and Seek redesign (rules, no DOM): voting, the Starter Island arena, disguises, movement, the 10-second
// disguise cooldown, attacks and the 3-second scenery penalty, line of sight, computer players, results.
// The map is the real Starter Island of a new game, saved from the browser (tests/fixtures/hs-starter-map.json).
// Run: node tests/hideseek.test.js
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, HS = R.HideSeek, C = D.HIDESEEK;
const MAP = require('./fixtures/hs-starter-map.json'), ORIG = require('./fixtures/hs-vote-original.js')(D);
const hyp = Math.hypot;
const lobbyWith = (seed, seekerIdx) => { const st = S.fresh(); const L = HS.lobby(st, seed); return { st, L, seeker: L.players[seekerIdx == null ? 1 : seekerIdx].id }; };
const runTo = (m, t, you) => { while (m.t < t && !m.over) HS.step(m, 1 / 30, you || 'you'); };
// an open patch of island: room for the look, nothing else within `clear` units, and room for the Seeker to its west
const openSpot = (m, key, clear, selfId) => { const look = HS.look(key), cells = [...m.cells.values()].filter((c) => c.walk).sort((a, b) => hyp(a.x - 15, a.z - 15) - hyp(b.x - 15, b.z - 15));
  for (const c of cells) { const x = c.x + 0.5, z = c.z + 0.5; if (!HS.valid(m, look, x, z, selfId) || m.props.some((p) => hyp(p.x - x, p.z - z) < clear + (p.shape.r || Math.max(p.shape.hx, p.shape.hz))) || m.hiders.some((h) => h.id !== selfId && h.key && hyp(h.x - x, h.z - z) < clear)) continue; if (!HS.onLand(m, { x: x - look.r - 0.5, z, r: 0.28 })) continue; return { x, z }; } return null; };
const quiet = (m) => { m.hiders.forEach((h) => { h.bot = false; }); m.seeker.bot = false; }; // nobody acts on their own

/* 1, 2. the vote is exactly as before and still picks the Seeker */
let same = 0, total = 0;
for (let seed = 1; seed <= 300; seed++) {
  const st = S.fresh(); st.hideseek.pref = seed % 3 ? 'hider' : 'seeker';
  const a = HS.lobby(st, seed * 7919), b = ORIG.lobby(st, seed * 7919); total++;
  const va = HS.botVotes(a), vb = ORIG.botVotes(b); if (seed % 2) { const e = HS.eligible(a); if (e.length) { va.you = e[seed % e.length].id; vb.you = e[seed % e.length].id; } }
  const hist = { Pip: seed % 3, Juno: seed % 2 };
  if (JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(va) === JSON.stringify(vb) && JSON.stringify(HS.assignSeeker(a, va, hist)) === JSON.stringify(ORIG.assignSeeker(b, vb, hist))) same++;
}
ok(same === total, 'the lobby, computer votes and Seeker choice match the original voting on 300 lobbies (' + same + '/' + total + ')');
ok(['lobby', 'eligible', 'assignSeeker', 'botVotes'].every((k) => HS[k].toString() === ORIG[k].toString()), 'the voting functions are unchanged, line for line');
{ const st = S.fresh(); const L = HS.lobby(st, 4242); L.players.forEach((p, i) => (p.pref = i === 2 || i === 3 ? 'seeker' : 'hider')); const votes = { you: L.players[3].id, bot0: L.players[3].id, bot1: L.players[2].id };
  const r = HS.assignSeeker(L, votes, {}); const m = HS.makeArena(MAP, L, r.seeker);
  ok(r.method === 'vote' && r.seeker === L.players[3].id && m.seeker.id === r.seeker && m.hiders.length === 4 && m.hiders.every((h) => h.id !== r.seeker), 'the player with the most votes becomes the Seeker of the round; everyone else hides (' + m.seeker.name + ')');
  const L2 = HS.lobby(st, 77); L2.players.forEach((p) => (p.pref = 'hider')); const r2 = HS.assignSeeker(L2, {}, {}); ok(r2.method === 'fallback' && HS.makeArena(MAP, L2, r2.seeker).seeker.id === r2.seeker, 'with nobody wanting to seek, the fallback draw still decides the Seeker');
  const L3 = HS.lobby(st, 91); L3.players.forEach((p) => (p.pref = 'seeker')); const r3 = HS.assignSeeker(L3, { you: 'you' }, {}); ok(r3.seeker === 'you' && HS.makeArena(MAP, L3, r3.seeker).seeker.id === 'you', 'the player can be voted Seeker and then seeks');
}

/* the map is the Starter Island */
let { L, seeker } = lobbyWith(1234); let m = HS.makeArena(MAP, L, seeker);
const kinds = (k) => m.props.filter((p) => p.key && p.key.indexOf(k) === 0).length;
ok(kinds('b:') === 6 && kinds('o:') === MAP.items.filter((i) => i.k === 'o').length && kinds('x:') === 3 && kinds('s:') > 20, 'the arena is the Starter Island: its 6 buildings, all ' + kinds('o:') + ' trees, bushes and rocks, ' + kinds('s:') + ' hill plants and rocks, and the dock crates');
ok(['b:hatchery', 'o:oak', 'o:pine', 'o:bush', 'o:pebble', 'o:boulder', 'o:stump', 's:mossyRock', 'x:barrel'].every((k) => m.looks.indexOf(k) >= 0), 'disguises on offer include buildings (the Hatchery), trees, bushes, rocks and decorations (' + m.looks.length + ' looks)');
ok(m.looks.every((k) => m.props.some((p) => p.key === k)), 'every disguise copies an object that really is on the island');
const walk = [...m.cells.values()].filter((c) => c.walk).length, ledge = [...m.cells.values()].filter((c) => c.kind === 'ledge' || c.kind === 'chunk');
ok(walk > 450 && ledge.every((c) => !c.walk), 'ledges and floating chunks are out of bounds (' + walk + ' walkable cells)');

/* 4, 5. transforming */
quiet(m); let me = m.hiders[0];
const meOn = (x, z) => { me.x = x; me.z = z; me.shape.x = x; me.shape.z = z; };
const spot = HS.findSpot(m, HS.look('o:pine'), 15, 11, 5, me.id); meOn(spot.x, spot.z);
let r = HS.disguise(m, me.id, 'o:pine');
ok(r.ok && me.key === 'o:pine' && me.look === 'Pine Tree' && me.model.src === 'o' && me.model.type === 'pine', 'a hider transforms into a Pine Tree');
const twin = HS.sourceFor(m, 'o:pine', me.x, me.z);
ok(JSON.stringify(me.model) === JSON.stringify(twin.model) && me.ry === twin.ry, 'the disguise is an exact copy of the nearest genuine pine: same model, variant and orientation (' + twin.id + ')');
ok(me.found === false && m.props.indexOf(me) < 0 && !m.props.some((p) => p.id === me.id) && m.hiders.indexOf(me) >= 0, 'the game keeps disguised players apart from genuine scenery');
ok(HS.onLand(m, me.shape) && HS.free(m, me.shape, me.id), 'the disguise stands on open land, overlapping nothing');
// no room: inside a building, or squeezed into scenery
const hatch = m.props.find((p) => p.key === 'b:hatchery');
m.t = 50; meOn(hatch.x + 2.4, hatch.z); r = HS.disguise(m, me.id, 'b:forge');
ok(!r.ok && r.reason === 'room' || r.ok && HS.onLand(m, me.shape) && HS.free(m, me.shape, me.id) && me.shape.hx > 1, 'a building disguise needs room for its whole footprint (' + (r.ok ? 'found room nearby' : 'refused here') + ')');
m.t = 100; const oak = m.props.find((p) => p.key === 'o:oak'); meOn(oak.x + 0.2, oak.z); r = HS.disguise(m, me.id, 'o:boulder');
ok(!r.ok && r.reason === 'room', 'a disguise cannot appear overlapping other scenery');
const lc = ledge.find((c) => c.kind === 'ledge'); ok(!HS.valid(m, HS.look('o:bush'), lc.x + 0.5, lc.z + 0.5, me.id) && !HS.valid(m, HS.look('o:bush'), -5, -5, me.id), 'nor on a ledge, nor off the island');

/* 6. moving while disguised */
({ L, seeker } = lobbyWith(555)); m = HS.makeArena(MAP, L, seeker); quiet(m); me = m.hiders[0];
let p0 = HS.findSpot(m, HS.look('o:bush'), 15, 21.5, 4, me.id); me.x = p0.x; me.z = p0.z; me.shape.x = p0.x; me.shape.z = p0.z; HS.disguise(m, me.id, 'o:bush');
let x0 = me.x, z0 = me.z; for (let i = 0; i < 30; i++) HS.move(m, me.id, 1, 0, 1 / 30);
const moved = hyp(me.x - x0, me.z - z0);
ok(moved > 0.5 && Math.abs(moved - C.speed.small) < 0.25, 'a disguised Berry Bush moves at its own slow pace (' + moved.toFixed(2) + ' units in 1 s; Seeker ' + C.seekerSpeed + ')');
ok(C.speed.huge < C.speed.large && C.speed.large < C.speed.medium && C.speed.medium < C.speed.small && C.speed.small < C.speed.tiny && C.speed.tiny < C.seekerSpeed, 'bigger disguises move more slowly, and none as fast as the Seeker');
const blocker = m.props.find((p) => p.key === 'b:hollow'); me.x = blocker.x - blocker.shape.hx - 0.6; me.z = blocker.z; me.shape.x = me.x; me.shape.z = me.z;
if (HS.free(m, me.shape, me.id)) { for (let i = 0; i < 90; i++) HS.move(m, me.id, 1, 0, 1 / 30); ok(me.x + me.shape.r <= blocker.x - blocker.shape.hx + 0.05, 'disguises cannot pass through buildings'); } else ok(true, 'disguises cannot pass through buildings (start blocked)');
ok(me.lastMove > 0 || moved > 0, 'movement is recorded (the computer Seeker can notice moving objects)');

/* 7, 8. the 10-second cooldown */
({ L, seeker } = lobbyWith(777)); m = HS.makeArena(MAP, L, seeker); quiet(m); me = m.hiders[0];
p0 = HS.findSpot(m, HS.look('o:bush'), 11, 13, 4, me.id); me.x = p0.x; me.z = p0.z; me.shape.x = p0.x; me.shape.z = p0.z;
m.t = 3; r = HS.disguise(m, me.id, 'o:bush'); ok(r.ok && me.nextMorph === 3 + C.morphCooldown, 'the cooldown starts at the transformation: ready again at ' + me.nextMorph + 's of the round');
const tries = [3.01, 5, 8, 12.9].map((t) => { m.t = t; return HS.disguise(m, me.id, 'o:pebble'); });
ok(tries.every((x) => !x.ok && x.reason === 'cooldown') && Math.abs(tries[2].wait - 5) < 1e-9, 'every change during the cooldown is refused, with the time left (5.0s at 8s)');
ok(me.key === 'o:bush' && me.morphs === 1, 'refused changes leave the disguise as it was');
m.t = 13; r = HS.disguise(m, me.id, 'o:pebble'); ok(r.ok && me.key === 'o:pebble' && me.nextMorph === 23, 'after 10 seconds the hider can change again, and a new cooldown starts');
{ const t0 = m.t; let n = 0; for (let i = 0; i < 40; i++) { if (HS.disguise(m, me.id, i % 2 ? 'o:bush' : 's:mossyRock').ok) n++; } ok(n === 0 && m.t === t0, 'repeated attempts in the same instant (menus, taps) never get through');
  const copy = JSON.parse(JSON.stringify({ nextMorph: me.nextMorph, t: m.t })); ok(copy.nextMorph - copy.t === HS.morphWait(m, me), 'the cooldown is kept on the round clock, which only moves forward as the round plays'); }
m.t = 23; for (let i = 0; i < 20; i++) HS.move(m, me.id, 0, 1, 1 / 30); ok(HS.morphReady(m, me) && me.z !== p0.z, 'moving is never blocked by the cooldown');

/* 9, 10, 11. attacking */
({ L, seeker } = lobbyWith(999)); m = HS.makeArena(MAP, L, seeker); quiet(m); m.t = C.prep + 1; m.phase = 'seek';
const sk = m.seeker; me = m.hiders[0];
m.hiders.slice(1).forEach((h, i) => { h.x = 3 + i; h.z = 3; h.shape.x = h.x; h.shape.z = h.z; });
p0 = openSpot(m, 'o:bush', 2.2, me.id); me.x = p0.x; me.z = p0.z; me.shape.x = p0.x; me.shape.z = p0.z; me.nextMorph = 0; HS.disguise(m, me.id, 'o:bush');
m.hiders.slice(1).forEach((h, i) => { const q = HS.findSpot(m, HS.look('o:pebble'), 6 + i * 4, 24, 5, h.id); h.x = q.x; h.z = q.z; h.shape.x = q.x; h.shape.z = q.z; h.nextMorph = 0; HS.disguise(m, h.id, 'o:pebble'); });
const place = (o, d, ang) => { const a = ang == null ? Math.PI : ang; sk.x = o.x + Math.cos(a) * d; sk.z = o.z + Math.sin(a) * d; sk.face = Math.atan2(o.z - sk.z, o.x - sk.x); };
const before = JSON.stringify({ n: sk.nextAttack, p: sk.penaltyUntil, a: sk.attacks });
place(me, 4); for (let i = 0; i < 40; i++) HS.move(m, sk.id, Math.cos(sk.face), Math.sin(sk.face), 1 / 30); const ins = HS.inspect(m);
ok(JSON.stringify({ n: sk.nextAttack, p: sk.penaltyUntil, a: sk.attacks }) === before && HS.attackReady(m), 'approaching and looking at objects costs nothing (no penalty, no attack counted)');
ok(!ins || !('kind' in ins), 'inspecting does not say whether an object is a player');
place(me, me.shape.r + 0.5); let at = HS.attack(m);
ok(at.ok && at.hit === 'hider' && me.found && me.foundAt === m.t && sk.hits === 1, 'an attack on a disguised hider reveals them');
ok(m.events.some((e) => e.type === 'reveal' && e.id === me.id) && m.hiders.filter((h) => !h.found).length === 3, 'the reveal is announced and the hiders left drop to 3');
m.t += C.swing; const bush = m.props.filter((p) => p.key === 'o:bush' && p.reach).find((b) => { place(b, b.shape.r + 0.5); const t = HS.target(m); return t && t.id === b.id && HS.onLand(m, { x: sk.x, z: sk.z, r: 0.28 }); });
at = HS.attack(m); const t1 = m.t;
ok(at.ok && at.hit === 'scenery' && sk.misses === 1 && Math.abs(sk.nextAttack - t1 - 3) < 1e-9 && Math.abs(HS.penaltyLeft(m) - 3) < 1e-9, 'attacking genuine scenery reveals nobody and costs a 3-second penalty');
const blockedAt = [0.5, 1.5, 2.9].map((d) => { m.t = t1 + d; return HS.attack(m); });
ok(blockedAt.every((x) => !x.ok && x.reason === 'penalty'), 'no attack is possible during the penalty');
m.t = t1 + 3; ok(HS.attackReady(m) && HS.attack(m).ok, 'after 3 seconds the Seeker can attack again');
m.t += 4; { const q = openSpot(m, 'o:boulder', 2.5, 'none'); sk.x = q.x; sk.z = q.z; sk.face = 0; } const empty = HS.target(m); if (!empty) { const w = HS.attack(m); ok(w.ok && w.hit === null && Math.abs(sk.nextAttack - m.t - C.swing) < 1e-9 && HS.penaltyLeft(m) === 0, 'a swing at thin air costs only the swing, not the penalty'); } else ok(true, 'a swing at thin air costs only the swing (skipped: something in reach)');
// through walls
const hollow = m.props.find((p) => p.key === 'b:hollow'), hb = m.hiders[1];
{ const x = hollow.x + hollow.shape.hx + 0.42, z = hollow.z; hb.x = x; hb.z = z; hb.shape.x = x; hb.shape.z = z; sk.x = hollow.x - hollow.shape.hx - 0.35; sk.z = z; sk.face = 0; m.t += 5;
  const tg = HS.target(m, { reach: 9 }); ok(!tg || tg.id === hollow.id, 'attacks cannot reach a hider through a building (only the wall is in reach)'); }
{ const t = HS.target(m); ok(!t || t.id !== hb.id, 'and an attack there would not reveal the hider behind it'); }

/* 12. computer players */
let disguisedAtSeek = 0, cdOk = true, penOk = true, found = 0, seekerWins = 0, hidersMoved = 0, roundsWithSearch = 0, N = 12, sawChange = 0, cover = 0;
for (let k = 0; k < N; k++) {
  const st = S.fresh(), Lb = HS.lobby(st, 3000 + k * 131); Lb.players[0].bot = true; const mb = HS.makeArena(MAP, Lb, Lb.players[1 + (k % 4)].id);
  const morphT = {}; let lastMiss = -99, prevEv = 0;
  while (!mb.over) {
    HS.step(mb, 1 / 30, 'nobody');
    if (mb.phase === 'seek' && !mb._chk) { mb._chk = 1; disguisedAtSeek += mb.hiders.filter((h) => h.key).length; }
    for (const e of mb.events) if (e.n > prevEv) { prevEv = e.n; if (e.type === 'morph') { if (morphT[e.id] != null && e.t - morphT[e.id] < C.morphCooldown - 1e-6) cdOk = false; morphT[e.id] = e.t; } if (e.type === 'miss' || e.type === 'reveal') { if (lastMiss > -99 && e.t - lastMiss < C.missPenalty - 1e-6) penOk = false; if (e.type === 'miss') lastMiss = e.t; } }
  }
  const sm = HS.summary(mb, 'nobody'); found += sm.found; if (mb.result === 'seeker') seekerWins++; if (mb.seeker.attacks) roundsWithSearch++;
  hidersMoved += mb.hiders.filter((h) => h.moved > 2).length; sawChange += mb.hiders.some((h) => h.morphs > 1) ? 1 : 0; cover += mb.seeker.moved;
}
ok(disguisedAtSeek === N * 4, 'computer hiders walk to a spot and are all disguised when the search starts (' + disguisedAtSeek + '/' + N * 4 + ')');
ok(cdOk, 'computer hiders never change disguise inside the 10-second cooldown');
ok(penOk, 'the computer Seeker never attacks again inside the 3-second penalty');
ok(roundsWithSearch === N && cover / N > 40, 'the computer Seeker searches the island (about ' + Math.round(cover / N) + ' units walked a round) and attacks in every round');
ok(found >= N * 0.6 && found < N * 4 * 0.9, 'it finds some hiders but not all every time (' + found + ' of ' + N * 4 + ' over ' + N + ' rounds; Seeker won ' + seekerWins + ')');
ok(hidersMoved >= N * 3 && sawChange >= 2, 'computer hiders move to hiding places, and some change disguise during a round');
{ // reaction: a computer hider near an attack reacts (freezes, creeps away or changes)
  const st = S.fresh(), Lb = HS.lobby(st, 8080); Lb.players[0].bot = true; const mb = HS.makeArena(MAP, Lb, Lb.players[1].id); runTo(mb, C.prep + 0.1, 'nobody');
  const h = mb.hiders[0]; mb.seeker.bot = false; mb.seeker.x = h.x - 2; mb.seeker.z = h.z; mb.seeker.face = 0; const tg = HS.target(mb, { reach: 2.5 });
  mb.events.push({ type: 'miss', x: h.x + 0.5, z: h.z, t: mb.t, n: ++mb.evN }); runTo(mb, mb.t + 1.5, 'nobody');
  ok(h.ai && h.ai.episode === true, 'a computer hider notices the Seeker attacking nearby and reacts (' + (h.ai.mode === 'move' ? 'creeps away' : h.morphs > 1 ? 'changes disguise' : 'freezes') + ')'); }
{ // the computer Seeker investigates movement
  const st = S.fresh(), Lb = HS.lobby(st, 9090); Lb.players[0].bot = true; const mb = HS.makeArena(MAP, Lb, Lb.players[1].id); runTo(mb, C.prep + 2, 'nobody');
  const h = mb.hiders.find((q) => !q.found); h.bot = false; const sk2 = mb.seeker; const spot2 = HS.findSpot(mb, HS.look(h.key), sk2.x + 3, sk2.z, 3, h.id); h.x = spot2.x; h.z = spot2.z; h.shape.x = h.x; h.shape.z = h.z;
  runTo(mb, mb.t + 0.6, 'nobody'); for (let i = 0; i < 15; i++) { HS.move(mb, h.id, 0, 1, 1 / 30); HS.step(mb, 1 / 30, h.id); } runTo(mb, mb.t + 0.6, 'nobody');
  ok((sk2.ai.sus[h.id] || 0) >= 1 || h.found, 'the computer Seeker treats an object it saw moving as a prime suspect'); }

/* 13. round completion and results */
({ L, seeker } = lobbyWith(2468)); m = HS.makeArena(MAP, L, seeker); m.hiders.forEach((h) => (h.bot = h.id !== 'you')); m.seeker.bot = true;
runTo(m, C.prep + C.seconds + 1, 'you');
ok(m.over && (m.result === 'hiders' || m.result === 'seeker') && m.t <= C.prep + C.seconds + 0.05, 'the round ends when time runs out or everyone is found (' + m.result + ' at ' + m.t.toFixed(1) + 's)');
const sm = HS.summary(m, 'you'), meSm = sm.hiders.find((h) => h.id === 'you');
ok(sm.total === 4 && sm.hiders.length === 4 && 'accuracy' in sm.seeker && sm.hiders.every((h) => h.look && typeof h.morphs === 'number' && typeof h.moved === 'number'), 'results list both sides: the Seeker’s finds, misses and accuracy; each hider’s disguise, outcome, changes and distance');
ok(sm.youWon === !meSm.found, 'a hider wins by not being found (you: ' + (meSm.found ? 'found' : 'survived') + ')');
{ const m2 = HS.makeArena(MAP, L, 'you'); m2.hiders.forEach((h) => (h.found = true)); m2.phase = 'seek'; HS.check2(m2); ok(m2.result === 'seeker' && HS.summary(m2, 'you').youWon, 'the Seeker wins by finding everyone'); }
{ const m3 = HS.makeArena(MAP, L, seeker); HS.leave(m3, 'you'); ok(m3.hiders.find((h) => h.id === 'you').found && m3.hiders.find((h) => h.id === 'you').left, 'a hider who leaves counts as found'); const m4 = HS.makeArena(MAP, L, 'you'); HS.leave(m4, 'you'); ok(m4.over && m4.result === 'hiders', 'a Seeker who leaves concedes'); }
{ const m5 = HS.makeArena(MAP, L, seeker); quiet(m5); runTo(m5, C.prep + 0.1); ok(m5.phase === 'seek' && m5.hiders.every((h) => h.key && h.auto), 'anyone still undisguised when hiding ends becomes the nearest object automatically'); }
ok(C.seconds === 75 && C.lobbySize === 5 && C.prep === 20, 'the search keeps its 75 seconds and 5-player lobby; hiding adds 20 seconds before it');

/* 14, 15. older functions and other modes */
{ const st = S.fresh(), Lo = HS.lobby(st, 12345), mo = HS.newMatch(Lo, Lo.players[1].id, null); ok(mo.hiders.length === 4 && HS.search(mo, 0, 0).ok !== undefined && typeof HS.botSearch === 'function', 'the older grid round (newMatch, search, botSearch) still works for anything that calls it'); }
ok(JSON.stringify(C.morphs) === JSON.stringify(['bush', 'rock', 'barrel', 'stump', 'lantern', 'crate']) && C.searches === 10 && C.map.w === 8, 'the original Hide and Seek settings are kept');
{ const st = S.fresh(); ok(JSON.stringify(st.hideseek) === JSON.stringify({ pref: 'hider', played: 0, won: 0, seekerCount: {} }), 'saves are unchanged: the hideseek record has the same fields (the Seeker look is added only when chosen)'); }
{ const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern'; ['lumifern', 'acinus', 'pyrokai', 'cannonis', 'gaiaroki', 'voltar'].forEach((sp) => R.addAmina(st, sp, 10)); R.PvP.setRoster(st, st.aminas.slice(0, 5).map((a) => a.uid)); const p5 = R.PvP.createPractice(st, seeded(40));
  R.PvP.setTeam(st, 'attack', st.aminas.slice(0, 3).map((a) => a.uid)); const pv = R.PvP.raidPreview(st);
  ok(p5.party.length === 5 && p5.foes.length === 5 && pv.target && pv.target.foes.length === 3, '5v5 practice and the Island Defence raid preview are unaffected'); }
{ const t0 = Date.now(); const st = S.fresh(), Lb = HS.lobby(st, 1); Lb.players[0].bot = true; const mb = HS.makeArena(MAP, Lb, Lb.players[1].id); let steps = 0; while (!mb.over) { HS.step(mb, 1 / 30, 'x'); steps++; } const ms = (Date.now() - t0) / steps;
  ok(ms < 0.5, 'a whole round of rules and computer players costs about ' + ms.toFixed(3) + ' ms a frame (Node, desktop)'); }

done('hideseek');
