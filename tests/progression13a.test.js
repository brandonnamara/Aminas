// Phase 13A: monster progression (rules, no DOM). The progression rules themselves are unchanged; this checks them
// (feeding, experience, levels, stats, evolution, move upgrades, saves) and the new read-outs in src/progression.js
// against what the rules really do. Run: node tests/progression13a.test.js
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, P = R.Prog, B = R.Battle;
const mk = (sp, lv, xp) => { const st = S.fresh(); st.phase = 'play'; st.starter = sp || 'lumifern'; const a = R.addAmina(st, sp || 'lumifern', lv || 1); a.xp = xp || 0; R.drain(); return { st, a }; };
const snap = (st) => JSON.stringify(st);
R.rng = seeded(13);

/* ---- the balance is what it was ---- */
ok([1, 5, 10, 20, 29].map(R.xpNeed).join() === '25,86,216,656,1257' && D.MAX_LEVEL === 30, 'experience needed per level and the level cap (30) are unchanged');
ok(JSON.stringify(D.SNACKS.snack) === JSON.stringify({ name: 'Berry Snack', food: 3, xp: 18, desc: 'A small, cheerful snack.' }) && D.SNACKS.feast.food === 10 && D.SNACKS.feast.xp === 70 && Object.keys(D.SNACKS).length === 2, 'the two feeds cost and give what they did (3 food → 18 XP, 10 food → 70 XP)');
ok(JSON.stringify(R.statsAt('lumifern', 1)) === '{"hp":46,"atk":11,"def":10,"spd":10}' && JSON.stringify(R.statsAt('lumifern', 11)) === '{"hp":96,"atk":23,"def":21,"spd":21}', 'stat growth per level is unchanged (Lumifern Lv 1 and Lv 11)');
const evos = D.ROSTER.filter((s) => s.evo); ok(D.ROSTER.length === 63 && evos.length === 42 && evos.every((s) => (D.SPECIES[s.id].stage === 1 ? s.evo.lv === 12 && s.evo.cost.gold === 60 && s.evo.cost.food === 15 : s.evo.lv === 22 && s.evo.cost.gold === 160 && s.evo.cost.food === 40)), 'all 63 forms and 42 evolutions keep their requirements (Lv 12 for 60 gold and 15 food; Lv 22 for 160 gold and 40 food)');
ok(Object.values(D.LINES).length === 21 && Object.values(D.LINES).every((l) => { const n = l.ids.map((i) => D.SPECIES[i].name); return n.length === 3 && n[1] === n[0] + ' II' && n[2] === n[0] + ' III'; }), 'all 21 lines keep the naming Name, Name II, Name III');
ok(D.MOVE_MAX === 5 && D.MOVE_LEVELS.cost.join() === '0,0,10,25,50,90' && D.MOVE_LEVELS.power.join() === '1,1,1.08,1.17,1.27,1.38', 'moves have five levels with the same essence costs (10, 25, 50, 90) and power steps');

/* ---- feeding and resources ---- */
let { st, a } = mk('lumifern', 11, 219); st.res.food = 33;
let r = R.feed(st, a.uid, 'snack');
ok(r.ok && r.xp === 18 && st.res.food === 30 && a.xp === 237 && a.lv === 11 && st.stats.fed === 1, 'a Berry Snack takes exactly 3 food and gives 18 XP');
r = R.feed(st, a.uid, 'feast');
ok(r.ok && st.res.food === 20 && a.lv === 12 && a.xp === 237 + 70 - 249 && r.levels.length === 1 && r.evoReady && r.evoReady.to === 'solarbloom', 'a Honey Feast takes 10 food, gives 70 XP, carries the extra XP over the level-up and reports that evolution is now possible');
st.res.food = 2; let before = snap(st); r = R.feed(st, a.uid, 'snack');
ok(!r.ok && r.reason === 'food' && r.need === 1 && snap(st) === before, 'without enough food nothing is spent and nothing changes (1 food short)');
({ st, a } = mk('lumifern', 30, 0)); st.res.food = 50; before = snap(st); r = R.feed(st, a.uid, 'feast');
ok(!r.ok && r.reason === 'max' && snap(st) === before, 'at the highest level feeding is refused and costs nothing');
({ st, a } = mk('lumifern', 29, R.xpNeed(29) - 5)); st.res.food = 50; r = R.feed(st, a.uid, 'feast');
ok(a.lv === 30 && a.xp === 0 && st.res.food === 40, 'reaching the highest level stops at Lv 30 with no stray experience');
({ st, a } = mk('lumifern', 1, 0)); st.res.food = 1000; let n = 0; while (a.lv < 12 && n++ < 500) R.feed(st, a.uid, 'feast');
let need = 0; for (let l = 1; l < 12; l++) need += R.xpNeed(l);
ok(a.lv === 12 && n === Math.ceil(need / 70) && st.res.food === 1000 - n * 10, 'levelling 1 → 12 by feasts costs what the XP table says (' + n + ' feasts, ' + n * 10 + ' food)');

/* ---- the read-outs agree with the rules ---- */
let agree = 0, total = 0; const rnd = seeded(99);
for (let i = 0; i < 400; i++) {
  const lv = 1 + Math.floor(rnd() * 30), o = mk(['lumifern', 'pyrokai', 'solarbloom', 'aurelith'][i % 4], lv, lv >= 30 ? 0 : Math.floor(rnd() * R.xpNeed(lv))), kind = i % 2 ? 'feast' : 'snack'; o.st.res.food = Math.floor(rnd() * 14);
  const pre = P.feedPreview(o.st, o.a, kind), res = R.feed(o.st, o.a.uid, kind); total++;
  if (pre.ok === res.ok && (res.ok ? pre.lvAfter === o.a.lv && pre.xpAfter === o.a.xp && pre.levels === res.levels.length && pre.evoReady === !!res.evoReady : pre.reason === res.reason && (res.reason !== 'food' || pre.short === res.need))) agree++;
}
ok(agree === total, 'what a feed button promises is what the feed does, on 400 random Aminas (level after, XP after, level-ups, evolution ready, or the reason it cannot)');
({ st, a } = mk('lumifern', 11, 219)); st.res.food = 33; st.res.gold = 500; const q0 = R.q.length; before = snap(st);
const L = P.level(a), feeds = P.feeds(st, a), stats = P.stats(st, a), ev = P.evoPreview(st, a), tr = P.moveTrack('glowpulse');
ok(snap(st) === before && R.q.length === q0, 'reading progression changes nothing and raises no events');
ok(L.lv === 11 && L.xp === 219 && L.need === 249 && L.left === 30 && L.pct === 88 && !L.max, 'level read-out: Lv 11, 219 / 249 XP, 30 to go');
ok(feeds.length === 2 && feeds[0].food === 3 && feeds[0].xp === 18 && feeds[0].levels === 0 && feeds[1].lvAfter === 12 && feeds[1].evoReady, 'feed read-out: cost, XP, and that a Honey Feast would reach Lv 12');
const up = R.statsWithGear(st, Object.assign({}, a, { lv: 12 }));
ok(JSON.stringify(stats.now) === JSON.stringify(R.statsWithGear(st, a)) && ['hp', 'atk', 'def', 'spd'].every((k) => stats.nextGain[k] === up[k] - stats.now[k]) && !stats.hasGear, 'stat read-out: the current stats and the exact gain at the next level');
ok(P.xpTo(a, 12) === 30 && P.xpTo(a, 13) === 30 + R.xpNeed(12) && P.xpTo(a, 11) === 0, 'experience still needed to a later level adds up from the XP table');
// equipment
const it = R.grantItem(st, 'driftclub'); R.equip(st, a.uid, it.iid); const sg = P.stats(st, a);
ok(sg.hasGear && sg.gear.atk === sg.now.atk - sg.base.atk && sg.gear.atk > 0 && sg.gear.hp === 0 && JSON.stringify(sg.now) === JSON.stringify(R.statsWithGear(st, a)) && B.fighter && R.partyFighter(st, a).atk === sg.now.atk, 'equipment: the share of a stat that comes from gear is shown, and the total is what the Amina fights with');

/* ---- evolution ---- */
ok(!ev.final && ev.to === 'solarbloom' && !ev.known && ev.lv === 12 && !ev.levelOk && ev.levelsToGo === 1 && ev.xpToGo === 30 && ev.costOk && !ev.ok && ev.reason === 'level', 'evolution read-out before the level: 1 level and 30 XP to go, cost affordable');
ok(!R.evolve(st, a.uid).ok && a.sp === 'lumifern', 'evolution is refused below the required level');
R.feed(st, a.uid, 'feast'); st.res.gold = 10; let e2 = P.evoPreview(st, a);
ok(e2.levelOk && !e2.costOk && e2.short.gold === 50 && e2.short.food === 0 && e2.reason === 'cost' && !R.evolve(st, a.uid).ok && a.sp === 'lumifern', 'with the level but not the gold it says how much is missing (50 gold) and refuses');
st.res.gold = 500; st.run = { uids: [a.uid] }; ok(P.evoPreview(st, a).reason === 'busy' && !R.evolve(st, a.uid).ok, 'an Amina in a dungeon run cannot evolve until the run ends'); delete st.run;
R.upgradeMove && (R.Essence.gain(st, 'light', 40), R.upgradeMove(st, a.uid, 1, 1)); R.drain();
e2 = P.evoPreview(st, a); const keep = { lv: a.lv, xp: a.xp, uid: a.uid, gear: JSON.stringify(a.gear), mv: JSON.stringify(a.mv) }, res0 = Object.assign({}, st.res), rank0 = st.rankXp + st.rank * 1e6, evolved0 = st.stats.evolved;
ok(e2.ok && e2.newMoves.length === 1 && e2.newMoves[0].name === 'Radiant Burst' && e2.newMoves[0].fromName === 'Sun Sprout' && e2.newMoves[0].lv === 2 && e2.moves[0].isNew === false, 'evolution read-out when ready: Radiant Burst replaces Sun Sprout at the level already earned (Lv 2); Glow Pulse stays');
r = R.evolve(st, a.uid);
ok(r.ok && a.sp === 'solarbloom' && a.lv === keep.lv && a.xp === keep.xp && a.uid === keep.uid && JSON.stringify(a.gear) === keep.gear && JSON.stringify(a.mv) === keep.mv, 'evolving changes the form and keeps level, experience, equipment and move levels');
ok(st.res.gold === res0.gold - 60 && st.res.food === res0.food - 15 && st.res.gems === res0.gems && st.stats.evolved === evolved0 + 1 && st.owned.solarbloom, 'it costs exactly 60 gold and 15 food, once, and the new form joins the collection');
ok(JSON.stringify(R.statsWithGear(st, a)) === JSON.stringify(e2.after) && ['hp', 'atk', 'def', 'spd'].every((k) => e2.gain[k] === e2.after[k] - e2.now[k] && e2.gain[k] > 0), 'the stats promised before evolving are the stats afterwards (with the same equipment)');
const res1 = snap(st.res), rank1 = st.rankXp + st.rank * 1e6; r = R.evolve(st, a.uid);
ok(!r.ok && r.reason === 'level' && snap(st.res) === res1 && st.stats.evolved === evolved0 + 1 && st.rankXp + st.rank * 1e6 === rank1 && rank1 > rank0 && a.sp === 'solarbloom', 'a repeated evolve (a second tap) does nothing: no second charge, no second reward, no skipped stage');
const er = P.evoResult(st, a, 'lumifern');
ok(JSON.stringify(er.after) === JSON.stringify(R.statsWithGear(st, a)) && JSON.stringify(er.before) === JSON.stringify(e2.now) && er.stage === 2 && er.stages === 3 && er.newMoves[0].name === 'Radiant Burst' && er.next.lv === 22, 'the ceremony summary: before and after stats, Stage 2 of 3, the new move, and the next evolution level');
{ const o = mk('aurelith', 25, 10); const f = P.evoPreview(o.st, o.a); ok(f.final && f.stage === 3 && R.evoCheck(o.st, o.a.uid).reason === 'final', 'a third-stage Amina is reported as the final form'); }
{ let okAll = true; D.ROSTER.filter((s) => s.evo).forEach((s) => { const o = mk(s.id, s.evo.lv, 0); o.st.res.gold = 999; o.st.res.food = 999; const p = P.evoPreview(o.st, o.a), rr = R.evolve(o.st, o.a.uid); if (!(p.ok && rr.ok && o.a.sp === s.evo.to && JSON.stringify(R.statsWithGear(o.st, o.a)) === JSON.stringify(p.after) && p.moves.every((m) => D.SPECIES[s.evo.to].abil[m.slot] === m.id))) okAll = false; }); ok(okAll, 'every one of the 42 evolutions gives the form, stats and moves its preview shows'); }

/* ---- move upgrades ---- */
({ st, a } = mk('lumifern', 5, 0)); R.Essence.gain(st, 'light', 200); R.drain();
ok(tr.length === 5 && tr.map((x) => x.cost).join() === '0,10,25,50,90' && tr.map((x) => x.effect.v).join() === '40,43,47,51,55' && P.moveCostToMax(1) === 175 && P.moveCostToMax(5) === 0, 'move track: Glow Pulse power 40, 43, 47, 51, 55 for 10, 25, 50 and 90 essence (175 in all)');
let spent = 0; for (let lv = 1; lv < 5; lv++) { const i0 = R.moveInfo(st, a, 0), e0 = R.Essence.get(st, 'light'); const u = R.upgradeMove(st, a.uid, 0, lv); spent += e0 - R.Essence.get(st, 'light'); if (!(u.ok && u.lv === lv + 1 && e0 - R.Essence.get(st, 'light') === i0.cost && i0.next.text === R.moveEffect('glowpulse', lv + 1).text)) spent = -999; }
ok(spent === 175 && R.moveSlots(a)[0] === 5 && R.moveInfo(st, a, 0).max && !R.upgradeMove(st, a.uid, 0, 5).ok, 'upgrading a move four times costs exactly what the track shows and stops at Level 5');
ok(!R.upgradeMove(st, a.uid, 1, 3).ok && R.moveSlots(a)[1] === 1, 'a stale or repeated upgrade tap is refused');
{ const e0 = R.Essence.get(st, 'light'); R.Essence.spend(st, 'light', e0); const i1 = R.moveInfo(st, a, 1); ok(!i1.ok && i1.reason === 'essence' && i1.cost === 10 && i1.have === 0 && !R.upgradeMove(st, a.uid, 1, 1).ok, 'without the essence an upgrade is refused and says what is missing'); }
{ const f1 = B.fighter('lumifern', 5, { mvl: { glowpulse: 1 } }), f5 = B.fighter('lumifern', 5, { mvl: { glowpulse: 5 } }); ok(JSON.stringify(R.moveLevels(a)) === '{"glowpulse":5,"sunsprout":1}' && R.partyFighter(st, a).mvl.glowpulse === 5 && f1.atk === f5.atk, 'battles read the same move levels the screen shows; upgrades change the move, not the Amina’s stats'); }

/* ---- saves ---- */
({ st, a } = mk('lumifern', 11, 219)); st.res.food = 33; R.feed(st, a.uid, 'snack'); R.Essence.gain(st, 'light', 10); R.upgradeMove(st, a.uid, 0, 1);
const loaded = JSON.parse(JSON.stringify(st)), la = loaded.aminas[0];
ok(la.lv === a.lv && la.xp === a.xp && JSON.stringify(la.mv) === JSON.stringify(a.mv) && JSON.stringify(P.level(la)) === JSON.stringify(P.level(a)) && JSON.stringify(P.evoPreview(loaded, la)) === JSON.stringify(P.evoPreview(st, a)), 'after saving and loading, level, experience, move levels and every read-out are the same');
ok(Object.keys(S.fresh()).sort().join() === Object.keys(JSON.parse(JSON.stringify(S.fresh()))).sort().join() && Object.keys(mk().a).sort().join() === 'lv,sp,uid,xp', 'Phase 13A adds nothing to the save: a new Amina still has only its id, species, level and experience');
{ const old = { uid: 7, sp: 'pyrokai', lv: 9, xp: 12 }; const o = S.fresh(); o.aminas.push(old); o.res.food = 20; ok(P.level(old).lv === 9 && P.feeds(o, old).length === 2 && P.stats(o, old).now.hp === R.statsAt('pyrokai', 9).hp && !P.evoPreview(o, old).final && R.feed(o, 7, 'snack').ok, 'an Amina from an older save (no move levels, no gear) reads and feeds normally'); }

/* ---- battles ---- */
{ const o = mk('lumifern', 12, 0); const pf = R.partyFighter(o.st, o.a), bf = B.fighter('lumifern', 12); ok(pf.hp === bf.hp && pf.atk === bf.atk && pf.def === bf.def && pf.spd === bf.spd && pf.maxHp === bf.maxHp, 'battle fighters are built as before (stats at Lv 12 unchanged)'); }
done('progression13a');
