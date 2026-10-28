// Dev 8 rules: naming convention, Player Rank wording, essences, five-level moves in real combat, habitat production
// choice (no duplication, no loss), achievements from real stats, essence rewards, save schema 6 migration.
const fs = require('fs'), path = require('path');
const { load, seeded, ok, done, ROOT } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, B = R.Battle;
const play = () => { const st = S.fresh(); st.phase = 'play'; st.introDone = true; st.starter = 'lumifern'; R.addAmina(st, 'lumifern', 10); return st; };

/* ---------- names ---------- */
const lines = Object.values(D.LINES);
ok(lines.length === 21 && lines.every((L) => L.ids.length === 3), '21 lines of three forms');
ok(lines.every((L) => { const n = L.ids.map((id) => D.SPECIES[id].name); return n[1] === n[0] + ' II' && n[2] === n[0] + ' III'; }), 'every line is named Name, Name II, Name III');
ok(D.SPECIES.aimza.name === 'Aimza' && D.SPECIES.aimza2.name === 'Aimza II' && D.SPECIES.aimza3.name === 'Aimza III', 'Aimza, Aimza II, Aimza III');
ok(D.SPECIES.reefback.name === 'Cannonis II' && D.SPECIES.shellfin.name === 'Cannonis III', 'Cannonis keeps its name when it evolves');
ok(D.SPECIES.meta.name === 'Meta III' && D.SPECIES.meta1.name === 'Meta', 'card-named lines use the card name (Meta)');
ok(Object.keys(D.SPECIES).length === 63 && D.SPECIES.reefback.id === 'reefback', 'species ids are unchanged (saves keep working)');
const src = fs.readdirSync(path.join(ROOT, 'src')).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n');
const strings = (src.match(/'[^'\n]*'|"[^"\n]*"/g) || []).join('\n');
ok(!/Caretaker Rank|CARETAKER RANK|Caretaker rank/.test(strings), 'no player-facing "Caretaker Rank" text is left (Player Rank everywhere)');
ok(/PLAYER RANK/.test(strings) && /Player Rank/.test(strings), 'the HUD and messages say Player Rank');

/* ---------- essences ---------- */
ok(D.ESSENCES.length === Object.keys(D.ELEMENTS).length && D.ESSENCES.length === 9, 'one essence for each of the 9 elements in the type system');
let st = play();
ok(R.Essence.get(st, 'fire') === 0 && R.Essence.gain(st, 'fire', 12) === 12 && R.Essence.get(st, 'fire') === 12, 'essence can be earned');
ok(!R.Essence.spend(st, 'fire', 13).ok && R.Essence.get(st, 'fire') === 12, 'cannot spend more essence than you have');
ok(R.Essence.gain(st, 'plasma', 5) === 0 && !st.essence.plasma, 'no essence for a type that does not exist');

/* ---------- move levels ---------- */
st = play(); const lf = st.aminas[0];
ok(JSON.stringify(R.moveSlots(lf)) === '[1,1]', 'moves start at Level 1');
let r = R.upgradeMove(st, lf.uid, 0, 1);
ok(!r.ok && r.reason === 'essence' && lf.mv[0] === 1, 'no upgrade without essence');
R.Essence.gain(st, 'light', 175);
const costs = [];
for (let lv = 1; lv < 5; lv++) { const before = R.Essence.get(st, 'light'); r = R.upgradeMove(st, lf.uid, 0, lv); costs.push(before - R.Essence.get(st, 'light')); }
ok(lf.mv[0] === 5 && costs.join(',') === '10,25,50,90' && R.Essence.get(st, 'light') === 0, 'Level 1 → 5 costs 10, 25, 50 and 90 Light Essence, each spent exactly once');
ok(R.upgradeMove(st, lf.uid, 0, 5).reason === 'max' && lf.mv[0] === 5, 'Level 5 is the maximum');
R.Essence.gain(st, 'light', 30);
ok(R.upgradeMove(st, lf.uid, 1, 1).ok && !R.upgradeMove(st, lf.uid, 1, 1).ok && lf.mv[1] === 2 && R.Essence.get(st, 'light') === 20, 'a repeated (stale) upgrade request is refused: one level, one payment');
st.run = { d: 'forgottenroad', battle: 0, uids: [lf.uid], hp: {}, gold: 0, food: 0, xp: {} };
ok(R.upgradeMove(st, lf.uid, 1, 2).reason === 'busy', 'moves are locked while that Amina is in a dungeon run');
st.run = null;
ok(R.moveInfo(st, lf, 0).id === 'glowpulse' && D.ABILITIES.glowpulse.el === 'light', 'the essence used is the move’s element');
// evolution keeps move levels
lf.lv = 12; R.addRes(st, { gold: 500, food: 200 }); const ev = R.evolve(st, lf.uid);
ok(ev && ev.ok !== false && lf.sp === 'solarbloom' && lf.mv[0] === 5 && lf.mv[1] === 2, 'evolving keeps both move levels');
// combat: an upgraded move really hits harder; a guard blocks more; a heal heals more
function dmgAt(lv) {
  const s2 = play(), a = s2.aminas[0]; a.mv = [lv, 1];
  const f = R.partyFighter(s2, a), e = B.fighter('gaiaroki', 10), b = B.create([f], e, { rng: seeded(5) });
  const hp0 = e.hp; B.act(b, { t: 'ab', id: 'glowpulse' }); return hp0 - e.hp;
}
const d1 = dmgAt(1), d5 = dmgAt(5);
ok(d5 > d1 && d5 / d1 > 1.25, 'a Level 5 move deals more real damage than Level 1 (' + d1 + ' → ' + d5 + ')');
{ const s2 = play(); R.addAmina(s2, 'acinus', 10); const ac = s2.aminas[1]; ac.mv = [1, 5];
  const f = R.partyFighter(s2, ac); ok(f.mvl.leafguard === 5, 'the fighter carries its move levels into battle');
  const b = B.create([f], B.fighter('gaiaroki', 10), { rng: seeded(2) }); f.spd = 999; const gev = B.act(b, { t: 'ab', id: 'leafguard' });
  const hit = gev.find((x) => x.t === 'hit' && x.who === 'p');
  ok(gev.some((x) => x.t === 'guard' && x.lv === 5) && hit && hit.guarded, 'a Level 5 guard goes up and takes the next hit');
  const pebble = B.damage(b.enemy, Object.assign({}, f, { guard: 0.3 }), D.ABILITIES.pebbletoss, () => 0.5).dmg, plain = B.damage(b.enemy, Object.assign({}, f, { guard: true }), D.ABILITIES.pebbletoss, () => 0.5).dmg;
  ok(pebble < plain, 'the upgraded guard blocks more than the Level 1 guard (' + plain + ' → ' + pebble + ')'); }
{ const s2 = play(); R.addAmina(s2, 'aimza', 10); const am = s2.aminas[1]; am.mv = [1, 5];
  const f = R.partyFighter(s2, am); f.hp = 1; const b = B.create([f], B.fighter('gaiaroki', 1), { rng: seeded(3) }); const evs = B.act(b, { t: 'ab', id: 'hum' });
  const heal = evs.find((x) => x.t === 'heal' && x.who === 'p'); ok(heal && heal.amt === Math.round(f.hpMax * 0.4), 'a Level 5 healing move restores 40% at once'); }
ok(R.partyFighter(play(), play().aminas[0]).mvl.glowpulse === 1 && dmgAt(1) === dmgAt(1), 'Level 1 moves behave exactly as before');

/* ---------- habitat production ---------- */
st = play(); R.addAmina(st, 'pyrokai', 10); st.struct.hollow = true; st.buildings.hollow.level = 1; st.buildings.hollow.state = 'built'; st.res.gold = 10000; st.rank = 5;
const spot = W.findSpot(st, 'starter', 'hab_fire', 0, [10, 10]); W.buildNew(st, 'starter', 'hab_fire', spot[0], spot[1], 0);
const hid = Object.keys(st.buildings).find((k) => st.buildings[k].type === 'hab_fire'), hb = st.buildings[hid]; hb.state = 'built'; hb.level = 1; delete hb.endAt;
W.assign(st, hid, st.aminas[1].uid);
ok(JSON.stringify(W.prodOptions(hb)) === '["gold","ess_fire"]', 'a Fire Habitat offers gold or Fire Essence');
ok(W.prodOptions(st.buildings.hollow).length === 1 && JSON.stringify(W.prodOptions({ type: 'farm' })) === '["food"]' && JSON.stringify(W.prodOptions({ type: 'mine' })) === '["gold"]', 'other buildings keep their single product');
ok(W.prodKind(hb) === 'gold', 'habitats make gold unless you choose otherwise');
const gRate = W.perMin(st, hb);
let t = Date.now(); R.now = () => t; hb.last = t; hb.stock = 0;
t += 30 * 60000; W.tickProduction(st, t);
const stored = W.stock(st, hid), gold0 = st.res.gold;
r = W.setProd(st, hid, 'ess_fire');
ok(r.ok && r.settled && r.settled.kind === 'gold' && r.settled.n === stored && st.res.gold === gold0 + stored && hb.stock === 0, 'switching collects the stored gold first (' + stored + '), nothing converted or lost');
ok(Math.abs(W.perMin(st, hb) - gRate * 0.1) < 1e-9, 'essence is made at 10% of the gold rate');
t += 60 * 60000; W.tickProduction(st, t); const n = W.stock(st, hid), e0 = R.Essence.get(st, 'fire'), g1 = st.res.gold;
const c = W.collect(st, hid);
ok(c.ok && c.kind === 'ess_fire' && R.Essence.get(st, 'fire') === e0 + n && st.res.gold === g1, 'collecting gives Fire Essence, not gold');
ok(W.setProd(st, hid, 'ess_fire').unchanged && !W.setProd(st, hid, 'ess_water').ok && !W.setProd(st, hid, 'gems').ok, 'only the options that fit the habitat are accepted');
const saved = JSON.parse(JSON.stringify(st)); const back = S.hydrate(saved).st;
ok(W.prodKind(back.buildings[hid]) === 'ess_fire', 'the choice survives saving and loading');
R.now = () => Date.now();

/* ---------- essence rewards ---------- */
st = play(); st.struct.hollow = true;
R.startRun(st, 'forgottenroad', [st.aminas[0].uid]);
let bt = R.createBattle(st, seeded(1)); const foeEl = D.SPECIES[bt.enemy.sp].el; bt.enemy.hp = 0; bt.over = true; bt.result = 'win';
let out = R.resolveBattle(st, bt);
ok(out.essence && out.essence.el === foeEl && out.essence.n > 0 && R.Essence.get(st, foeEl) === out.essence.n, 'a won dungeon battle gives essence of the foe’s element');
bt = R.createBattle(st, seeded(2)); bt.over = true; bt.result = 'lose'; const ess0 = JSON.stringify(st.essence); out = R.resolveBattle(st, bt);
ok(!out.essence && JSON.stringify(st.essence) === ess0, 'a lost battle gives no essence');

/* ---------- achievements ---------- */
st = play();
let list = R.Ach.list(st); const fed = list.find((a) => a.id === 'fed50');
ok(D.ACHIEVEMENTS.length >= 15 && fed.cur === 0 && !fed.done, 'achievements read real progress (fed 0 / 50)');
st.stats.fed = 50; const fresh = R.Ach.check(st);
ok(fresh.indexOf('fed50') >= 0 && st.ach.fed50 > 0 && R.Ach.check(st).indexOf('fed50') < 0, 'an achievement is earned once and never again');
ok(R.Ach.list(st).find((a) => a.id === 'fed50').done && R.Ach.count(st) >= 1, 'earned achievements show as done');

/* ---------- save schema 6 ---------- */
ok(S.SCHEMA === 6, 'save schema is 6');
const old = S.fresh(); old.schema = 5; old.phase = 'play'; old.starter = 'umbrit'; old.introDone = true;
['umbrit', 'kairyu'].forEach((sp, i) => old.aminas.push({ uid: i + 1, sp, lv: 9 + i, xp: 3, gear: { weapon: null, armour: null, charm: null } })); old.nextUid = 3; old.active = 1; old.owned = { umbrit: true, kairyu: true };
old.res = { gold: 4321, food: 77, gems: 9 }; old.stats.fed = 60; old.buildings.habx = { id: 'habx', type: 'hab_water', island: 'starter', x: 3, y: 3, rot: 0, level: 2, state: 'built', residents: [2], stock: 40, last: Date.now() };
delete old.avatar; delete old.essence; delete old.ach; old.aminas.forEach((a) => delete a.mv);
const m = S.hydrate(JSON.parse(JSON.stringify(old)));
ok(m.from === 5 && m.st.schema === 6, 'a Dev 7 save (schema 5) migrates to schema 6');
ok(m.st.res.gold === 4321 && m.st.aminas.length === 2 && m.st.aminas[1].lv === 10 && m.st.active === 1, 'resources, Aminas and levels are kept');
ok(m.st.avatar && m.st.avatar.made === false && m.st.avatar.look && m.st.avatar.legacy, 'existing players get a default avatar and are not forced to make one');
ok(m.st.aminas.every((a) => a.mv[0] === 1 && a.mv[1] === 1) && Object.values(m.st.essence).every((v) => v === 0), 'every move starts at Level 1 with no essence');
ok(m.st.buildings.habx && W.prodKind(m.st.buildings.habx) === 'gold' && m.st.buildings.habx.stock === 40, 'habitats keep making gold, with their stored amount intact');
ok(m.st.ach.fed50 > 0, 'achievements already met are recorded quietly on load');
const again = S.hydrate(JSON.parse(JSON.stringify(m.st)));
ok(again.from === 6 && JSON.stringify(again.st.aminas) === JSON.stringify(m.st.aminas) && again.st.ach.fed50 === m.st.ach.fed50, 'loading the migrated save again changes nothing (idempotent)');
const weird = JSON.parse(JSON.stringify(m.st)); weird.avatar = { made: 1, name: '<b>Bran</b>don the Very Long', look: { skin: 99, hair: -3 } }; weird.essence = { fire: -5, water: '7', bogus: 3 }; weird.aminas[0].mv = [9, 'x'];
const w2 = S.hydrate(weird).st;
ok(w2.avatar.name.indexOf('<') < 0 && w2.avatar.name.length <= 14 && w2.avatar.look.skin === D.AVATAR.skin.length - 1 && w2.avatar.look.hair === 0, 'odd avatar data is repaired, never trusted');
ok(w2.essence.fire === 0 && w2.essence.water === 7 && !('bogus' in w2.essence) && w2.aminas[0].mv[0] === 5 && w2.aminas[0].mv[1] === 1, 'odd essence and move data is repaired');
done('dev8');
