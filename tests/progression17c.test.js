// Phase 17C: XP from much weaker foes, the kept move's upgrade slot, releasing duplicates, the Moon Shrine's daily
// moonlight, gem conveniences, and the healing/guard refinements.
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, B = R.Battle;
let T = Date.UTC(2026, 10, 20, 9, 0, 0); R.now = () => T; // travel in time
const fresh = () => { const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern'; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = st.flags.r2 = true; st.rank = 10; return st; };
const win = (b) => { b.foes.forEach((f) => (f.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; return b; };

/* ---------- XP option A ---------- */
ok([0, 1, 2].every((g) => R.xpScale(10 + g, 10) === 1) && R.xpScale(13, 10) === 0.75 && R.xpScale(14, 10) === 0.5 && R.xpScale(15, 10) === 0.25 && R.xpScale(30, 4) === 0.25, 'XP scale: full up to two levels above the foe, then 75%, 50%, 25%');
ok(R.xpScale(5, 12) === 1, 'a foe above your level always gives full XP (new content is never penalised)');
let st = fresh(); const a = R.addAmina(st, 'lumifern', 10), b2 = R.addAmina(st, 'cannonis', 4); R.startRun(st, 'forgottenroad', [a.uid, b2.uid]);
const out = R.resolveBattle(st, win(R.createBattle(st, seeded(1)))), lv = D.DUNGEONS.forgottenroad.battles[0].lv, base = Math.round(20 + lv * 6);
const xa = out.xp.find((x) => x.uid === a.uid), xb = out.xp.find((x) => x.uid === b2.uid);
ok(xb.gained === base && !xb.scaled, 'an Amina near the foe’s level gets full XP (' + xb.gained + ')');
ok(xa.gained === Math.round(base * R.xpScale(10, lv)) && xa.scaled && xa.gap === 10 - lv, 'one far above it gets less (' + xa.gained + ' of ' + base + ', ' + (10 - lv) + ' levels above)');
const fa = R.inst(st, b2.uid); const x0 = fa.xp, lv0 = fa.lv; R.feed(st, b2.uid, 'feast'); ok(fa.lv > lv0 || fa.xp - x0 === D.SNACKS.feast.xp, 'feeding is unchanged (a Feast still gives 70 XP)');
ok(D.SPECIES.lumifern.evo.lv === 12 && D.SPECIES.solarbloom.evo.lv === 22, 'evolution stays at levels 12 and 22');
D.XP17.on = false; st = fresh(); const a2 = R.addAmina(st, 'lumifern', 10); R.startRun(st, 'forgottenroad', [a2.uid]); const o2 = R.resolveBattle(st, win(R.createBattle(st, seeded(1)))); D.XP17.on = true;
ok(o2.xp[0].gained === base, 'with the switch off, full XP as before');

/* ---------- the kept move's upgrade slot ---------- */
st = fresh(); const ber = R.addAmina(st, 'berrant', 14); ok(JSON.stringify(R.moveSlotIds(ber)) === '["vinewhip","verdantcrash","leafguard"]', 'an evolved Amina has three move slots: basic, signature, kept');
const m2 = R.moveInfo(st, ber, 2); ok(m2 && m2.id === 'leafguard' && m2.lv === 1 && m2.el === 'nature' && m2.cost === 10, 'the kept move: Level 1, upgraded with its own element’s essence (10 for Level 2)');
ok(R.moveInfo(st, R.addAmina(st, 'acinus', 5), 2) === null, 'a first form has no third slot');
R.Essence.gain(st, 'nature', 100); let r = R.upgradeMove(st, ber.uid, 2, 1);
ok(r.ok && ber.mv.length === 3 && ber.mv[2] === 2 && R.Essence.get(st, 'nature') === 90 && ber.mv[1] === 1, 'upgrading it spends 10 once and changes only that slot');
ok(!R.upgradeMove(st, ber.uid, 2, 1).ok && R.Essence.get(st, 'nature') === 90, 'a repeated (stale) tap is refused: no double charge');
ok(R.partyFighter(st, ber).mvl.leafguard === 2, 'the battle uses its level');
const saved = S.hydrate(JSON.parse(JSON.stringify(st))).st; ok(saved.aminas.find((x) => x.uid === ber.uid).mv[2] === 2, 'its level survives saving and loading');
const old = { uid: 99, sp: 'berrant', lv: 14, xp: 0, mv: [3, 4] }; R.moveSlots(old); ok(old.mv.length === 2 && old.mv[0] === 3 && old.mv[1] === 4 && R.moveInfo(st, old, 2).lv === 1, 'an older save (two slots) keeps its upgrades and reads the kept move as Level 1');
ber.lv = 22; R.res = 0; st.res.gold = st.res.food = 999; ok(R.evolve(st, ber.uid).ok && ber.sp === 'calyxar' && ber.mv[2] === 2 && R.moveSlotIds(ber)[2] === 'leafguard', 'after the next evolution the kept move and its level stay');

/* ---------- releasing duplicates ---------- */
st = fresh(); const c1 = R.addAmina(st, 'acinus', 9), c2 = R.addAmina(st, 'acinus', 6), only = R.addAmina(st, 'lumi', 5);
st.active = only.uid;
let c = R.Release.check(st, c2.uid); ok(c.ok && c.gives.total.nature === 2 + 6 && c.gives.el === 'nature', 'a level-6 Acinus with a twin can go, for 8 Nature Essence');
ok(!R.Release.check(st, only.uid).ok && R.Release.check(st, only.uid).reasons.indexOf('last') >= 0, 'your only one of a kind is protected');
st.active = c1.uid; ok(R.Release.check(st, c1.uid).reasons.indexOf('companion') >= 0, 'the companion is protected'); st.active = only.uid;
R.Release.setFav(st, c2.uid, true); ok(R.Release.check(st, c2.uid).reason === 'fav', 'a favourite is protected'); R.Release.setFav(st, c2.uid, false);
const items = Object.keys(D.ITEMS).filter((k) => !D.ITEMS[k].unique); st.items.push({ iid: 1, id: items[0] }); st.nextIid = 2; R.equip(st, c2.uid, 1); ok(R.Release.check(st, c2.uid).reasons.indexOf('gear') >= 0, 'an Amina wearing gear is protected'); R.unequip(st, c2.uid, D.ITEMS[items[0]].slot);
st.dungeon.forgottenroad = { clears: 0, floors: [], next: 0 }; R.startRun(st, 'forgottenroad', [c2.uid]); ok(R.Release.check(st, c2.uid).reasons.indexOf('busy') >= 0, 'an Amina in a run is protected'); st.run = null;
st.defence = { attack: [c2.uid], defence: [], log: [] }; ok(R.Release.check(st, c2.uid).reasons.indexOf('team') >= 0, 'an Amina in a saved team is protected'); st.defence.attack = [];
st.buildings.tidegate = st.buildings.tidegate || { id: 'tidegate', type: 'tidegate', level: 1, residents: [] }; st.buildings.tidegate.residents = [c2.uid]; ok(R.Release.check(st, c2.uid).reasons.indexOf('home') >= 0, 'a resident is protected'); st.buildings.tidegate.residents = [];
st.aminas.push({ uid: 77, sp: 'meta1', lv: 12, xp: 0, mv: [1, 1] }, { uid: 78, sp: 'meta1', lv: 12, xp: 0, mv: [1, 1] }); ok(R.Release.check(st, 77).reasons.indexOf('legendary') >= 0, 'legendaries are protected'); st.aminas = st.aminas.filter((x) => x.uid < 70);
ok(!R.Release.release(st, c2.uid).ok && st.aminas.some((x) => x.uid === c2.uid), 'nothing happens without confirmation');
c2.mv = [3, 2]; const g = R.Release.essenceFor(c2), spent = (10 + 25) + 10;
ok(g.spent === spent && g.total.nature === 2 + 6 + Math.floor((10 + 25) * 0.5) + Math.floor(10 * 0.5), 'half of the essence spent on its moves comes back (' + g.total.nature + ' in all)');
st.party = [c1.uid, c2.uid]; const ess0 = R.Essence.get(st, 'nature'), nu = st.nextUid; r = R.Release.release(st, c2.uid, true);
ok(r.ok && !st.aminas.some((x) => x.uid === c2.uid) && R.Essence.get(st, 'nature') - ess0 === g.total.nature, 'confirmed: it leaves, and the essence arrives');
ok(st.owned.acinus && st.seen.acinus && st.aminas.some((x) => x.sp === 'acinus'), 'the Codex keeps Acinus, and so does your other Acinus');
ok(st.party.indexOf(c2.uid) < 0 && st.nextUid === nu, 'it is taken out of the saved party; ids are never reused');
ok(!R.Release.release(st, c2.uid, true).ok, 'releasing the same Amina again does nothing');
ok(!R.Release.check(st, c1.uid).ok && R.Release.check(st, c1.uid).reasons.indexOf('last') >= 0, 'the remaining Acinus is now protected as the last one');

/* ---------- the Moon Shrine's moonlight ---------- */
st = fresh(); W.place && 0; st.buildings.moonshrine = { id: 'moonshrine', type: 'moonshrine', level: 4, residents: [], state: 'built', stock: 0, last: T, island: 'starter', x: 0, y: 0 };
R.addAmina(st, 'lumifern', 5); const mk = R.addAmina(st, 'lumi', 30); W.assign(st, 'moonshrine', mk.uid); st.buildings.moonshrine.last = T; st.buildings.moonshrine.stock = 0;
const per = W.perMin(st, st.buildings.moonshrine); T += 3 * 3600e3; W.tickProduction(st, T);
const ml = W.moonlight(st, st.buildings.moonshrine, T); const stock3 = W.stock(st, 'moonshrine');
ok(per > 0.4 && ml.cap === 18 && Math.abs(ml.made - 18) < 0.001 && stock3 === 18, 'a Level 4 shrine with a level-30 resident (' + per.toFixed(2) + ' gems/min) stops at 18 gems for the day');
W.collect(st, 'moonshrine'); T += 3 * 3600e3; W.tickProduction(st, T); ok(W.stock(st, 'moonshrine') === 0, 'collecting does not reset the day’s moonlight');
T = Date.UTC(2026, 10, 21, 9, 0, 0); W.tickProduction(st, T); ok(W.stock(st, 'moonshrine') >= 17 && W.moonlight(st, st.buildings.moonshrine, T).made > 0, 'the next day it makes moonlight again');
const before = st.res.gems; W.collect(st, 'moonshrine'); ok(st.res.gems > before, 'and the gems collect as before');
T = Date.UTC(2026, 10, 25, 9, 0, 0); W.tickProduction(st, T); const away = W.stock(st, 'moonshrine'); ok(away > 18 && away <= 5 * 18 && away <= W.capOf(st, st.buildings.moonshrine), 'four days away: each day’s moonlight waits in storage (' + Math.round(away) + ' gems), up to the storage limit as before');
const farm = { id: 'f1', type: 'farm', level: 1, residents: [], state: 'built', stock: 0, last: T, island: 'starter' }; st.buildings.f1 = farm; T += 3600e3; W.tickProduction(st, T); ok(W.stock(st, 'f1') === 180, 'other buildings are unchanged (a Level 1 farm still makes 3 food a minute)');

/* ---------- gem conveniences ---------- */
st = fresh(); st.settings.eggSpeed = 'normal'; st.buildings.hatchery = { id: 'hatchery', type: 'hatchery', level: 1, residents: [] }; const p1 = R.addAmina(st, 'acinus', 6), p2 = R.addAmina(st, 'kairyu', 6); st.res.gold = st.res.food = 500; st.res.gems = 5;
ok(R.startBreed(st, p1.uid, p2.uid, 0).ok, 'an egg is laid'); const cost = R.hatchNowCost(st, 0);
ok(cost === 1, 'Hatch now costs 1 gem for a 5-minute egg (1 per started 6 minutes)');
r = R.hatchNow(st, 0); ok(r.ok && st.res.gems === 4 && R.eggStatus(st, null, 0).ready && !R.hatchNow(st, 0).ok, 'it spends the gem once and the egg is ready');
st.res.gems = 0; R.startBreed(st, p1.uid, p2.uid, 0) ; R.hatch(st, T, 0);
st.res.gems = 100; const eM = R.Essence.get(st, 'metal');
r = R.Essence.exchange(st, 'metal', 10); ok(r.ok && R.Essence.get(st, 'metal') - eM === 30 && st.res.gems === 90, 'Essence exchange: 10 gems → 30 Metal Essence');
ok(!R.Essence.exchange(st, 'metal', 21).ok && R.Essence.exchange(st, 'metal', 20).ok && R.Essence.exchangeLeft(st) === 0, 'at most 30 gems a day');
T += 24 * 3600e3; ok(R.Essence.exchangeLeft(st) === 30, 'the limit resets the next day');
st.res.gems = 2; ok(!R.Essence.exchange(st, 'water', 3).ok && st.res.gems === 2, 'without enough gems nothing is spent');

/* ---------- healing and guarding ---------- */
ok(D.MOVE_LEVELS.heal[1] === 0.3 && D.ABILITIES.mend.fx.n === 3 && D.ABILITIES.hum.fx.n === 3 && /30%/.test(D.ABILITIES.mend.desc), 'Mend and Hum: 30% then a little more for 3 turns (was 25% / 2 turns)');
const pf = (sp, lv) => R.partyFighter({ items: [] }, { uid: 1, sp, lv, xp: 0, mv: [1, 1] });
let bt = B.create([pf('berrant', 14)], B.fighter('gaiaroki', 14), { rng: () => 0.5 }); bt.party[0].spd = 999; const eh = bt.enemy.hp;
const ev = B.act(bt, { t: 'ab', id: 'leafguard' }), hit = ev.find((e) => e.t === 'hit' && e.who === 'p'), back = ev.find((e) => e.t === 'reflect');
ok(back && back.who === 'e' && eh - bt.enemy.hp === back.dmg && back.dmg >= 1, 'a guard turns a quarter of the blow back on the attacker (' + (back && back.dmg) + ' damage)');
ok(D.COMBAT17.tankCounter === 0.5 && D.COMBAT17.counter === 0.3, 'a tank’s counter is 50% (others 30%)');
done('progression17c');
