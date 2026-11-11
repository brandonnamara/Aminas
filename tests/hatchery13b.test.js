// Phase 13B: Hatchery and breeding (rules, no DOM). The breeding rules are unchanged; this checks them (pairings,
// costs, slots, incubation, hatching, upgrades, saves) and the read-outs in src/hatchery.js against what the rules
// really do. Run: node tests/hatchery13b.test.js
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, H = R.Hatch;
R.rng = seeded(131);
let T = 1700000000000; R.now = () => T;
const mk = (lv, opts) => { const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern'; W.validate(st); st.struct.hatchery = true; const b = st.buildings.hatchery; b.level = lv || 1; b.state = 'built'; st.res.gold = 5000; st.res.food = 5000; Object.assign(st.settings, opts || {}); return st; };
const add = (st, sp, lv) => R.addAmina(st, sp, lv || 8);
const snap = (st) => JSON.stringify(st);

/* ---- the rules are what they were ---- */
ok(D.BREED_COST.gold === 40 && D.BREED_COST.food === 25 && D.BREED_MIN_LEVEL === 5 && D.EGG_SECONDS.fast === 20 && D.EGG_SECONDS.normal === 300 && D.MAX_EGG_SLOTS === 5, 'breeding cost (40 gold, 25 food), the level-5 rule, incubation times and the five-slot limit are unchanged');
const HL = D.BUILDINGS.hatchery.levels;
ok(HL.length === 5 && HL.map((l) => l.slots).join() === '1,2,3,4,5' && HL.map((l) => l.cost.gold).join() === '110,500,1500,4000,9000' && HL.map((l) => l.eggTime).join() === '1,0.85,0.7,0.55,0.4', 'the Hatchery has five levels with the same costs; every upgrade adds exactly one breeding slot');
ok(Object.keys(D.BREED).length === 30 && Object.keys(D.BREED).every((k) => D.SPECIES[D.BREED[k].sp] && D.SPECIES[D.BREED[k].sp].stage === 1), 'all 30 pairings are unchanged and every egg is a base form');
[1, 2, 3, 4, 5].forEach((lv) => { const st = mk(lv); if (R.eggSlots(st) !== lv || H.status(st).slots !== lv) ok(false, 'slots at level ' + lv); });
ok(true, 'the number of breeding slots equals the Hatchery level at every level (1 to 5)');

/* ---- eligibility ---- */
let st = mk(2), a = add(st, 'lumifern', 8), b = add(st, 'pyrokai', 8), low = add(st, 'kairyu', 4), dk = add(st, 'umbrit', 9), wt = add(st, 'kairyu', 9), wd = add(st, 'zephyr', 9); R.drain();
const refuse = (u1, u2, why, msg, prep) => { if (prep) prep(); const before = snap(st), r = R.startBreed(st, u1, u2), p = H.pair(st, u1, u2); ok(!r.ok && r.reason === why && snap(st) === before && !p.ok && p.reason === why, msg); };
refuse(a.uid, a.uid, 'same', 'an Amina cannot be paired with itself; nothing is spent');
refuse(a.uid, low.uid, 'level', 'a parent below level 5 is refused; nothing is spent');
refuse(a.uid, null, 'pick', 'one parent alone is refused');
refuse(dk.uid, wt.uid, 'incompat', 'two elements with no pairing (Dark + Water) are refused; nothing is spent');
refuse(a.uid, dk.uid, 'locked', 'the Light + Dark pairing stays locked until the Dormant Spire wakes');
st.res.food = 24; refuse(a.uid, b.uid, 'cost', 'without enough food the pairing is refused and nothing is spent');
let p = H.pair(st, a.uid, b.uid); ok(p.short.food === 1 && p.short.gold === 0 && p.needs.find((n) => n.k === 'cost').ok === false && p.needs.filter((n) => !n.ok).length === 1, 'the panel says exactly what is missing (1 food short), and the other four requirements are met');
st.res.food = 5000;
ok(H.candidate(st, low, null).ok === false && /Lv 5/.test(H.candidate(st, low, null).why) && H.candidate(st, wt, dk).why === 'No match' && H.candidate(st, dk, a).why === 'Locked pairing' && H.candidate(st, a, a).why === 'Already chosen' && H.candidate(st, b, a).ok && H.candidate(st, b, a).sp === 'igniflare', 'the parent picker marks who can breed and says why the others cannot');

/* ---- the preview equals the result, for every pairing ---- */
{ let bad = 0, n = 0; const els = Object.keys(D.ELEMENTS), baseOf = {}; D.ROSTER.forEach((s) => { if (s.stage === 1 && !baseOf[s.el]) baseOf[s.el] = s.id; });
  els.forEach((e1) => els.forEach((e2) => { if (!baseOf[e1] || !baseOf[e2]) return; const s2 = mk(1); s2.flags.r2 = true; const x = add(s2, baseOf[e1], 6), y = add(s2, baseOf[e2], 6); R.drain(); const pv = H.pair(s2, x.uid, y.uid), g0 = s2.res.gold, f0 = s2.res.food, r = R.startBreed(s2, x.uid, y.uid); n++;
    if (pv.ok !== r.ok) bad++; if (r.ok && (pv.outcome.sp !== r.sp || s2.res.gold !== g0 - 40 || s2.res.food !== f0 - 25 || s2.eggs.length !== 1 || s2.eggs[0].readyAt - s2.eggs[0].startedAt !== pv.secs * 1000 || s2.aminas.length !== 2)) bad++; if (!r.ok && (s2.res.gold !== g0 || s2.eggs.length)) bad++; }));
  ok(bad === 0 && n >= 64, 'for every pair of elements (' + n + ' pairs) the panel’s outcome, cost and incubation time equal what breeding really does; parents are kept'); }

/* ---- breeding, slots, incubation ---- */
p = H.pair(st, a.uid, b.uid, 0); const g0 = st.res.gold, f0 = st.res.food;
ok(p.ok && p.outcome.sp === 'igniflare' && !p.outcome.known && p.secs === Math.round(20 * 0.85) && p.slot === 0, 'a valid pair previews its egg (a mystery until discovered), the slot and the incubation time (17 s at Hatchery Lv 2)');
ok(H.status(st).state === 'idle', 'with no eggs the Hatchery is idle');
let r = R.startBreed(st, a.uid, b.uid, 0);
ok(r.ok && st.res.gold === g0 - 40 && st.res.food === f0 - 25 && st.eggs.length === 1 && st.eggs[0].slot === 0 && st.eggs[0].sp === 'igniflare' && st.recipes['fire+light'] === 'igniflare' && st.aminas.length === 6, 'breeding takes exactly 40 gold and 25 food, lays one egg in the chosen slot, records the recipe and keeps both parents');
ok(H.status(st).state === 'incubating' && H.status(st).used === 1 && H.status(st).free === 1 && H.status(st).soonest === 17000, 'the Hatchery is now incubating: 1 of 2 slots, 17 s to go');
let before = snap(st); r = R.startBreed(st, a.uid, b.uid, 0); ok(!r.ok && r.reason === 'egg' && snap(st) === before, 'a slot that already holds an egg cannot be used again (a repeated tap spends nothing)');
r = R.startBreed(st, wt.uid, wd.uid); ok(r.ok && r.slot === 1 && r.sp === 'kairyu' && st.eggs.length === 2 && H.status(st).state === 'full', 'a second pair goes into the next free slot; with every slot in use the Hatchery is fully occupied');
before = snap(st); r = R.startBreed(st, a.uid, b.uid); ok(!r.ok && r.reason === 'egg' && snap(st) === before && H.pair(st, a.uid, b.uid).needs.find((n) => n.k === 'slot').ok === false, 'with every slot in use a third pair is refused and nothing is spent');
before = snap(st); r = R.hatch(st, null, 0); ok(!r.ok && snap(st) === before, 'an egg cannot be hatched before it is ready');
T += 9000; ok(Math.abs(R.eggStatus(st, null, 0).progress - 9 / 17) < 1e-9 && R.eggStatus(st, null, 0).left === 8000 && !R.eggStatus(st, null, 0).ready, 'incubation progress follows the clock (9 of 17 s)');

/* ---- survives closing the game ---- */
S.state = st; S.save(); T += 60000; ok(S.load() && S.state.eggs.length === 2 && S.state.eggs.every((e) => R.eggStatus(S.state, null, e.slot).ready) && H.status(S.state).state === 'ready' && H.status(S.state).ready === 2, 'eggs are saved with the game and keep incubating while it is closed: both are ready after a reload a minute later');
st = S.state; a = R.inst(st, a.uid); b = R.inst(st, b.uid);

/* ---- hatching: once, no duplicates ---- */
const n0 = st.aminas.length, h0 = st.stats.hatched; r = R.hatch(st, null, 0); let evs = R.drain();
ok(r.ok && r.inst.sp === 'igniflare' && r.inst.lv === 1 && st.aminas.length === n0 + 1 && st.eggs.length === 1 && !R.eggIn(st, 0) && st.stats.hatched === h0 + 1 && st.owned.igniflare && evs.filter((e) => e.name === 'hatched').length === 1 && evs.filter((e) => e.name === 'discover').length === 1, 'hatching gives one Lv 1 Amina, empties the slot, counts once and adds it to the collection');
before = snap(st); r = R.hatch(st, null, 0); ok(!r.ok && snap(st) === before, 'hatching the same slot again gives nothing (no duplicate Amina)');
r = R.hatch(st, null, 1); R.drain(); ok(r.ok && r.inst.sp === 'kairyu' && st.eggs.length === 0 && H.status(st).state === 'idle' && new Set(st.aminas.map((x) => x.uid)).size === st.aminas.length, 'the second egg hatches on its own; every Amina has its own id');
ok(H.pair(st, a.uid, b.uid).outcome.known && H.pair(st, a.uid, b.uid).outcome.name === 'Igniflare' && H.book(st).known.length === 2 && H.book(st).hidden === H.book(st).total - 2 && H.book(st).total === 31, 'a discovered pairing now shows its egg by name, and the recipe book lists it (2 of 31, the rest hidden)');

/* ---- several at once ---- */
st = mk(5); const pairs = [['lumifern', 'pyrokai'], ['kairyu', 'zephyr'], ['gaiaroki', 'acinus'], ['emberix', 'sylvaneer'], ['zeep', 'voltar']].map(([x, y]) => [add(st, x, 6), add(st, y, 6)]); R.drain();
const gold0 = st.res.gold; pairs.forEach(([x, y]) => R.startBreed(st, x.uid, y.uid));
ok(st.eggs.length === 5 && new Set(st.eggs.map((e) => e.slot)).size === 5 && st.res.gold === gold0 - 200 && H.status(st).state === 'full', 'five pairs breed at once into five different slots for exactly five costs');
T += 4000; r = R.startBreed(st, pairs[0][0].uid, pairs[0][1].uid); ok(!r.ok && st.eggs.length === 5 && st.res.gold === gold0 - 200, 'a sixth is refused');
T += 60000; const cnt = st.aminas.length; let hatched = 0; for (let i = 0; i < 12; i++) { const h = R.hatch(st); if (h.ok) hatched++; } R.drain();
ok(hatched === 5 && st.aminas.length === cnt + 5 && st.eggs.length === 0 && st.stats.hatched === 5, 'all five hatch exactly once each, however many times Hatch is pressed');

/* ---- no room ---- */
st = mk(1); a = add(st, 'lumifern', 8); b = add(st, 'pyrokai', 8); R.startBreed(st, a.uid, b.uid); T += 60000; while (st.aminas.length < D.MAX_INSTANCES) add(st, 'kairyu', 1); R.drain();
before = snap(st); r = R.hatch(st, null, 0); ok(!r.ok && r.reason === 'full' && snap(st) === before && st.eggs.length === 1, 'with no room for another Amina the egg waits in its slot and nothing is lost');

/* ---- upgrades ---- */
st = mk(1); st.res.gold = 600; let u = H.upgrade(st);
ok(u.level === 1 && u.max === 5 && u.slots === 1 && u.next.level === 2 && u.next.addSlots === 1 && u.next.slots === 2 && u.next.cost.gold === 500 && u.next.eggTime === 0.85 && u.next.ok, 'the upgrade read-out shows the level, the slots now, and the next level’s cost and benefit (+1 slot, faster incubation)');
a = add(st, 'lumifern', 8); b = add(st, 'pyrokai', 8); R.startBreed(st, a.uid, b.uid); const eggBefore = JSON.stringify(st.eggs);
r = W.upgrade(st, 'hatchery'); ok(r.ok && st.res.gold === 600 - 40 - 500 && R.eggSlots(st) === 1 && JSON.stringify(st.eggs) === eggBefore && H.upgrade(st).upgrading, 'upgrading costs what was shown; while it builds the Hatchery keeps its slot and its egg');
T = st.buildings.hatchery.endAt + 1000; W.tick(st); R.drain(); ok(st.buildings.hatchery.level === 2 && R.eggSlots(st) === 2 && R.freeSlot(st) === 1 && JSON.stringify(st.eggs) === eggBefore, 'when the upgrade finishes there is exactly one more slot, and the egg is untouched');
st.res.gold = 10; u = H.upgrade(st); ok(!u.next.ok && u.next.short.gold === 1490, 'when gold is short the read-out says how much more is needed (1,490)');
st = mk(5); u = H.upgrade(st); ok(u.atMax && u.next === null && u.slots === 5, 'at the highest level there is no further upgrade');

/* ---- saves ---- */
const old = S.fresh(); old.phase = 'play'; W.validate(old); old.struct.hatchery = true; old.buildings.hatchery.level = 1; old.buildings.hatchery.state = 'built'; delete old.eggs; old.egg = null;
S.state = old; S.save(); ok(S.load() && Array.isArray(S.state.eggs) && S.state.eggs.length === 0 && H.status(S.state).state === 'idle', 'a save with no egg data loads with an empty Hatchery');
st = mk(3); a = add(st, 'lumifern', 8); b = add(st, 'pyrokai', 8); R.startBreed(st, a.uid, b.uid, 1);
st.eggs.push({ slot: 1, sp: 'kairyu', parents: [], startedAt: T, readyAt: T + 5000 }, { slot: 9, sp: 'kairyu', readyAt: T + 5 }, { slot: 2, sp: 'nosuchthing', readyAt: T + 5 }, null);
S.state = st; S.save(); S.load(); ok(S.state.eggs.length === 1 && S.state.eggs[0].slot === 1 && S.state.eggs[0].sp === 'igniflare', 'a damaged save is repaired: one egg per slot, real species only, slots inside the Hatchery');
st = mk(2); a = add(st, 'lumifern', 8); b = add(st, 'pyrokai', 8); R.startBreed(st, a.uid, b.uid); st.eggs[0].readyAt = T + 40 * 86400000; delete st.eggs[0].startedAt;
S.state = st; S.save(); S.load(); let e = S.state.eggs[0]; ok(e.readyAt - T <= 300000 && e.startedAt > 0 && e.startedAt <= e.readyAt && R.eggStatus(S.state, null, 0).progress >= 0 && R.eggStatus(S.state, null, 0).progress <= 1, 'an egg stranded by a clock change (40 days away) is brought back within the longest incubation (5 minutes)');
st = mk(2); a = add(st, 'lumifern', 8); b = add(st, 'pyrokai', 8); R.startBreed(st, a.uid, b.uid); const good = JSON.stringify(st.eggs); S.state = st; S.save(); S.load();
ok(JSON.stringify(S.state.eggs) === good, 'a healthy egg is not changed by loading');
const s1 = snap(st); H.status(st); H.upgrade(st); H.pair(st, a.uid, b.uid); H.book(st); H.candidate(st, a, b); ok(snap(st) === s1, 'the read-outs never change the game');
done('hatchery13b');
