// Phase 17B: combat refinements (rules only). Each one is checked on its own, and with every switch off the battle
// rules must give exactly the Phase 17A numbers.
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, B = R.Battle, C = D.COMBAT17;
const st = { items: [] }, inst = (sp, lv, uid) => ({ uid: uid || 1, sp, lv, xp: 0, mv: [1, 1] });
const party = (sp, lv) => R.partyFighter(st, inst(sp, lv));
const evs = (ev, t) => ev.filter((e) => e.t === t);

/* ---------- kept first-form moves ---------- */
ok(R.retainedMove('acinus') === null && R.retainedMove('berrant') === 'leafguard' && R.retainedMove('calyxar') === 'leafguard', 'Acinus keeps Leaf Guard after evolving (none needed as a first form)');
ok(R.retainedMove('duskmantle') === 'gloomveil' && R.retainedMove('aeolus') === 'cyclonespin' && R.retainedMove('aimza2') === 'hum' && R.retainedMove('zeep3') === 'ironwall', 'Dark and Wind keep their attack-lowering move, Resonance its heal, Metal its guard');
ok(D.ROSTER.filter((s) => s.stage > 1).every((s) => R.retainedMove(s.id)), 'every evolved form keeps one');
const pf = party('berrant', 14); ok(pf.abil.length === 3 && pf.abil[2] === 'leafguard' && pf.cd.leafguard === 0 && pf.retained === 'leafguard', 'your evolved Amina fights with three moves (its two plus the kept one)');
// Phase 17C: the kept move has its own (third) upgradable slot; before 17C it was always Level 1 and not in moveLevels
ok(D.SPECIES.berrant.abil.length === 2 && R.moveLevels(inst('berrant', 14)).leafguard === 1 && inst('berrant', 14).mv.length === 2, 'species data unchanged; the kept move reads Level 1 from an unupgraded third slot');
ok(B.fighter('berrant', 14).abil.length === 2 && R.enemyFromSpec({ sp: 'berrant', lv: 14 }).abil.length === 2, 'foes keep their two moves');
ok(party('acinus', 5).abil.length === 2, 'a first form is unchanged');

/* ---------- guard: counter, and no stacking ---------- */
let b = B.create([party('berrant', 14)], B.fighter('gaiaroki', 14), { rng: seeded(3) });
let ev = B.act(b, { t: 'ab', id: 'leafguard' });
ok(evs(ev, 'counter').length === 1 && B.cur(b).counter, 'a guard that takes a hit readies a counter');
ok(!B.usable(B.cur(b), 'leafguard'), 'and the guard move recharges: no guarding two turns running');
const e0 = b.enemy.hp; b.rng = () => 0.5; ev = B.act(b, { t: 'ab', id: 'vinewhip' }); const hitC = e0 - b.enemy.hp;
ok(!B.cur(b).counter, 'the counter is spent by the next attack');
const b2 = B.create([party('berrant', 14)], B.fighter('gaiaroki', 14), { rng: () => 0.5 }); b2.enemy.hp = e0; B.act(b2, { t: 'ab', id: 'vinewhip' }); const hitN = e0 - b2.enemy.hp;
// Berrant is a tank: from Phase 17C a tank's counter is 50% (30% for other roles)
ok(hitC > hitN && Math.abs(hitC / hitN - (1 + C.tankCounter)) < 0.08, 'a tank’s counter hits about 50% harder (' + hitN + ' → ' + hitC + ')');


/* ---------- heal: cleanse and brace ---------- */
b = B.create([party('aimza2', 14)], B.fighter('pyrokai', 14), { rng: () => 0.99 }); // 0.99: the foe's burn chance never procs
const me = B.cur(b); me.hp = Math.round(me.hpMax * 0.4); me.st = { burn: 2, soak: 2 }; me.weak = 2;
ev = B.act(b, { t: 'ab', id: 'hum' });
ok(evs(ev, 'cleanse').length === 1 && !me.st.burn && !me.st.soak && !me.st.silence && me.weak === 1, 'healing clears burn and soak and one stack of lowered attack');
const braced = (on) => { C.healBrace = on ? 0.25 : 0; const bb = B.create([party('aimza2', 14)], B.fighter('pyrokai', 14), { rng: () => 0.5 }); bb.party[0].spd = 999; bb.enemy.abil = ['emberflick']; const h0 = bb.party[0].hp; B.act(bb, { t: 'ab', id: 'hum' }); return evs(B.act(bb, { t: 'ab', id: 'echowave' }), 'hit').concat([]).length, bb; };
C.healBrace = 0.25; let bb = B.create([party('aimza2', 14)], B.fighter('pyrokai', 14), { rng: () => 0.5 }); bb.party[0].spd = 999; bb.party[0].hp = 30; let hv = evs(B.act(bb, { t: 'ab', id: 'hum' }), 'hit').find((h) => h.who === 'p');
C.healBrace = 0; let bc = B.create([party('aimza2', 14)], B.fighter('pyrokai', 14), { rng: () => 0.5 }); bc.party[0].spd = 999; bc.party[0].hp = 30; let hw = evs(B.act(bc, { t: 'ab', id: 'hum' }), 'hit').find((h) => h.who === 'p');
C.healBrace = 0.25;
ok(hv && hw && hv.dmg < hw.dmg && Math.abs(hv.dmg / hw.dmg - 0.75) < 0.08, 'after healing, the next hit lands 25% softer (' + hw.dmg + ' → ' + hv.dmg + ')');

/* ---------- soak stalls a charging guardian ---------- */
const guardian = () => { const g = R.enemyFromSpec(D.DUNGEONS.drownedsteps.battles[9]); g.hp = g.hpMax = 99999; return g; }; // it must outlast the test
b = B.create([party('reefback', 16)], guardian(), { rng: () => 0.99 }); b.party[0].spd = 999; // 0.99: no chance-based effects fire
b.enemy.chargeIn = 0; ev = B.act(b, { t: 'ab', id: 'bubblepop' }); ok(b.enemy.charging && evs(ev, 'charge').length === 1, 'the guardian charges');
b.enemy.st.soak = 2; ev = B.act(b, { t: 'ab', id: 'bubblepop' });
ok(evs(ev, 'hold').length === 1 && b.enemy.charging && !evs(ev, 'use').some((u) => u.who === 'e'), 'soaked while charging, it sputters: the charged move waits a turn');
b.enemy.st.soak = 2; ev = B.act(b, { t: 'ab', id: 'bubblepop' });
ok(evs(ev, 'use').some((u) => u.who === 'e' && u.abil === 'undertow'), 'only once per charge: the next turn it lands');
C.soakSlows = false; b = B.create([party('reefback', 16)], guardian(), { rng: () => 0.99 }); b.party[0].spd = 999; b.enemy.chargeIn = 0; B.act(b, { t: 'ab', id: 'bubblepop' }); b.enemy.st.soak = 2; ev = B.act(b, { t: 'ab', id: 'bubblepop' }); C.soakSlows = true;
ok(evs(ev, 'use').some((u) => u.who === 'e' && u.abil === 'undertow'), '(without the rule it lands at once, as before)');
b = B.create([party('reefback', 16)], guardian(), { rng: seeded(1) }); b.enemy.chargeIn = 0;
ok(B.autoAction(b).id === 'tidalsurge', 'the auto-battle soaks a guardian on the turn it charges');

/* ---------- swift and Wind ---------- */
const hitBy = (f, foe, id) => { const bx = B.create([f], foe, { rng: () => 0.5 }); f.spd = 999; const h = B.enemy; const e1 = bx.enemy.hp; B.act(bx, { t: 'ab', id }); return e1 - bx.enemy.hp; };
const sw = hitBy(party('kairyu', 15), B.fighter('acinus', 15), 'bubblepop'); C.swift = 0; const sw0 = hitBy(party('kairyu', 15), B.fighter('acinus', 15), 'bubblepop'); C.swift = 0.15;
ok(Math.abs(sw / sw0 - 1.15) < 0.06, 'your swift Amina acting first hits 15% harder (' + sw0 + ' → ' + sw + ')');
const ew = B.fighter('emberix', 15); ew.spd = 999; const eb = B.create([party('acinus', 15)], ew, { rng: () => 0.5 }); ok(!ew.swiftEdge, 'a swift foe gets no edge (it applies to your Aminas)');
ok(R.elMult('wind', 'fire') < 1, 'the element chart is unchanged');
const tw = hitBy(party('zephyr', 10), B.fighter('pyrokai', 10), 'gust'); C.tailwind = false; const tw0 = hitBy(party('zephyr', 10), B.fighter('pyrokai', 10), 'gust'); C.tailwind = true;
ok(Math.abs(tw / tw0 - 1.5) < 0.12, 'Wind moves are no longer resisted (Gust into Fire: ' + tw0 + ' → ' + tw + ')');
ok(R.elMult('fire', 'wind') > 1, 'Wind still takes super-effective hits from Fire and Earth');

/* ---------- silence never leaves an Amina without a move ---------- */
b = B.create([party('aimza2', 14)], B.fighter('zeep2', 14), { rng: seeded(1) }); b.party[0].st.silence = 1; b.party[0].cd.echowave = 0;
ok(B.legal(b).filter((x) => x.ready).length >= 1 && B.usable(b.party[0], 'echowave'), 'a silenced Aimza can still use Echo Wave (before this fix it had no move and the battle could not continue)');
ok(!B.usable(b.party[0], 'doubleecho'), 'its special is still silenced');

/* ---------- the auto-battle uses support moves when they help ---------- */
b = B.create([party('aimza2', 14)], B.fighter('pyrokai', 14), { rng: seeded(1) }); b.party[0].hp = Math.round(b.party[0].hpMax * 0.4);
ok(B.autoAction(b).id === 'hum', 'heals below 45% health while the foe is healthy');
b = B.create([party('duskmantle', 16)], R.enemyFromSpec(D.DUNGEONS.lanternorchard.battles[9]), { rng: seeded(1) });
ok(D.ABILITIES[B.autoAction(b).id].type === 'weaken', 'lowers a guardian’s attack');
b = B.create([party('berrant', 16)], guardian(), { rng: seeded(1) }); b.enemy.charging = true;
ok(B.autoAction(b).id === 'leafguard', 'guards a charge with a kept guard move');

/* ---------- every switch off = the Phase 17A rules ---------- */
const keep = Object.assign({}, C);
function duel(seed) { const bx = B.create([party('reefback', 16)], R.enemyFromSpec(D.DUNGEONS.drownedsteps.battles[9]), { rng: seeded(seed) }); const log = []; let t = 0; while (!bx.over && t++ < 60) { const ev2 = B.act(bx, B.autoAction(bx)); ev2.filter((e) => e.t === 'hit').forEach((e) => log.push(e.who + e.dmg)); } return log.join(','); }
Object.keys(C).forEach((k) => (C[k] = typeof C[k] === 'number' ? 0 : false)); const off = [1, 2, 3].map(duel);
Object.assign(C, keep); const on = [1, 2, 3].map(duel);
// recorded from the Phase 17A code (commit 316fa38) with the same duel and seeds
ok(JSON.stringify(off) === JSON.stringify(['p15,e105,e63', 'p16,e106,e61', 'p16,e106,e68']), 'with every switch off, a battle plays out exactly as in Phase 17A');
ok(off.join('|') !== on.join('|'), 'with them on it differs');
ok(D.ABILITIES.gloomveil.power === 40, 'Gloom Veil now matches the basic move’s power (was 35)');
done('combat17b');
