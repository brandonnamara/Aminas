// Phase 16A, rules side (Node, no browser): the onboarding record, player classification, the prologue steps, the
// starter choice, save compatibility and "no reward or balance change". Run: node tests/onboard16.test.js
const { load, seeded, ok, done } = require('./harness');
const c = load(); const A = c.A, D = A.Data, R = A.Rules, S = A.State, O = A.Onboard16, Q = A.Quests;

/* ---------- the switch ---------- */
ok(O && O.enabled() === false, 'the Phase 16A switch is off by default');
ok(!('onboard' in S.fresh()), 'a fresh state has no onboarding record (nothing is added to saves with the switch off)');

/* ---------- classification ---------- */
let st = S.fresh();
ok(O.kind(st) === 'new', 'a brand-new game with no record is "new"');
O.begin(st);
ok(O.kind(st) === 'interrupted' && O.resumeAt(st) === 'avatar', 'a started new game without a starter is "interrupted" and resumes at the avatar');
st.avatar.made = true; ok(O.resumeAt(st) === 'cine', 'after the avatar it resumes at the cinematic');
st.onboard.cine = 2; ok(O.resumeAt(st) === 'starter', 'after the cinematic it resumes at the starter choice');
const legacy = S.fresh(); legacy.starter = 'umbrit'; R.addAmina(legacy, 'umbrit', 7);
ok(O.kind(legacy) === 'established' && O.current(legacy) === null, 'an existing save (starter, no record) is "established" and gets no prologue');

/* ---------- the starter, exactly once ---------- */
const r1 = O.chooseStarter(st, 'lumifern'), r2 = O.chooseStarter(st, 'umbrit'), r3 = O.chooseStarter(st, 'lumifern');
ok(r1.ok && !r2.ok && !r3.ok, 'the starter can be chosen once; later calls are refused');
ok(st.starter === 'lumifern' && st.aminas.length === 1 && st.aminas[0].sp === 'lumifern' && st.aminas[0].lv === 1, 'exactly one starter is granted, at level 1 (never both)');
ok(st.phase === 'play' && O.kind(st) === 'partial', 'choosing moves the game to play and the prologue begins');
ok(!O.chooseStarter(S.fresh(), 'aimza').ok, 'only the two starters can be chosen');
// same result as the original selection code path (ui.js): starter flag, phase, one Amina at level 1
const orig = S.fresh(); orig.starter = 'lumifern'; orig.phase = 'play'; R.addAmina(orig, 'lumifern', 1);
ok(JSON.stringify(orig.aminas) === JSON.stringify(st.aminas) && JSON.stringify(orig.owned) === JSON.stringify(st.owned) && JSON.stringify(orig.res) === JSON.stringify(st.res), 'the new choice grants exactly what the original selection granted (same Amina, ownership and resources)');

/* ---------- starter facts come from real data ---------- */
['lumifern', 'umbrit'].forEach((id) => {
  const f = O.starterFacts(id), s1 = R.statsAt(id, 1), other = R.statsAt(id === 'lumifern' ? 'umbrit' : 'lumifern', 1);
  const want = ['hp', 'atk', 'def', 'spd'].filter((k) => s1[k] > other[k]).length;
  ok(f.el === D.SPECIES[id].el && JSON.stringify(f.stats) === JSON.stringify(s1) && f.more.length === want && f.moves.length === D.SPECIES[id].abil.length && f.moves.every((m, i) => m.name === D.ABILITIES[D.SPECIES[id].abil[i]].name),
    id + ': the selection screen describes real stats, real moves and the real element (' + f.more.join(', ') + ')');
  ok(f.strong.every((x) => R.elMult(f.el, x) > 1) && f.weakTo.every((x) => R.elMult(x, f.el) > 1), id + ': "strong against" and "weak to" match the element chart');
});

/* ---------- the prologue steps follow real state ---------- */
const ids = (s) => O.steps(s).filter((x) => !x.done).map((x) => x.id);
const on = (fn) => { const was = O.enabled(); O.set(true); try { return fn(); } finally { O.set(was); } };
c.localStorage.setItem('aminas.onboard16', '0');
ok(O.set(true) === true && O.enabled(), 'the switch turns on in a developer build'); O.set(false);
on(() => {
  ok(O.current(st).id === 'inspect' && O.current(st).n === 3 && O.current(st).of === O.STEPS.length, 'after choosing, the current step is "Look at your companion" (3 of ' + O.STEPS.length + ')');
  O.mark(st, 'inspect'); ok(O.current(st).id === 'hollow' && O.current(st).quest === 'm_hollow', 'next is the existing quest "Make Room for Kind Souls"');
  // out of order: feed before restoring the Hollow
  st.res.food = 500; R.feed(st, st.aminas[0].uid, 'snack'); Q.scan(st);
  st.res.gold = 500; R.restore(st, 'hollow'); Q.scan(st);
  ok(Q.status(st, Q.get('m_hollow')) === 'ready' && O.current(st).id === 'hollow', 'a completed quest step waits to be claimed (its reward is the quest’s own)');
  const before = JSON.stringify(st.res); Q.claim(st, 'm_hollow'); const paid = JSON.parse(JSON.stringify(st.res));
  ok(paid.gold - JSON.parse(before).gold === Q.get('m_hollow').reward.gold, 'claiming pays exactly the existing quest reward');
  ok(Q.status(st, Q.get('m_feed')) === 'ready', 'feeding done earlier counts at once: the player is never stuck for doing things in another order');
  Q.claim(st, 'm_feed');
  for (let i = 0; i < 60 && st.aminas[0].lv < 3; i++) R.feed(st, st.aminas[0].uid, 'snack');
  Q.scan(st); Q.claim(st, 'm_lv3'); R.addAmina(st, 'acinus', 2); Q.scan(st); Q.claim(st, 'm_find');
  ok(O.current(st).id === 'battle', 'after the four quests: open the Battle menu');
  // the player goes straight into the dungeon without the Battle menu step: soft steps pass
  R.startRun(st, 'forgottenroad', st.aminas.map((a) => a.uid));
  ok(O.current(st).id === 'win' && O.steps(st).find((x) => x.id === 'battle').done && O.steps(st).find((x) => x.id === 'road').done, 'going straight into the dungeon completes "Open the Battle menu" and "Enter the Forgotten Road" (nothing blocks)');
  { const t = S.fresh(); O.begin(t); O.chooseStarter(t, 'umbrit'); t.res.gold = 500; R.restore(t, 'hollow'); Q.scan(t); Q.claim(t, 'm_hollow'); ok(O.steps(t).find((x) => x.id === 'inspect').passed && O.current(t).id !== 'inspect', 'skipping "Look at your companion" does not block: it counts as passed once a later step is done'); }
  const b = R.createBattle(st, seeded(3)); let g = 0;
  while (!b.over && g++ < 80) { if (b.pending) { R.Battle.act(b, { t: 'sw', to: b.party.findIndex((f) => f.hp > 0) }); continue; } const l = R.Battle.legal(b).filter((a) => a.ready).map((a) => [a.id, (D.ABILITIES[a.id].power || 0) * R.elMult(D.ABILITIES[a.id].el, b.enemy.el)]).sort((x, y) => y[1] - x[1]); R.Battle.act(b, { t: 'ab', id: l[0][0] }); }
  ok(b.result === 'win', 'with the prologue’s own preparation (level 3 and a second Amina) the first battle is won (seeded)');
  R.resolveBattle(st, b);
  ok(O.current(st).id === 'home', 'after the first win: return to the sanctuary');
  R.abandonRun(st); O.mark(st, 'home');
  ok(O.current(st).id === 'next' && !O.update(st), 'then the Entity’s handoff; the prologue is not finished before it');
  O.mark(st, 'handoff'); ok(O.update(st) === true && O.kind(st) === 'complete' && O.current(st) === null, 'after the handoff the prologue is complete and the HUD returns to the ordinary task list');
});

/* ---------- returning players ---------- */
on(() => {
  const p = S.fresh(); O.begin(p); O.chooseStarter(p, 'umbrit'); p.dungeon.forgottenroad = { clears: 0, next: 4, floors: [true] };
  ok(['inspect', 'battle', 'road', 'win'].every((k) => O.steps(p).find((x) => x.id === k).done), 'a partly cleared first dungeon: inspect, battle menu, entering and the first win all count as done');
  const q = S.fresh(); O.begin(q); O.chooseStarter(q, 'umbrit'); q.dungeon.forgottenroad = { clears: 1, next: 0 };
  ok(O.update(q) && O.kind(q) === 'complete', 'a player who already cleared the first dungeon is never sent back through the prologue');
});

/* ---------- save compatibility ---------- */
const old = JSON.parse(JSON.stringify(legacy)); delete old.onboard;
const loaded = S.hydrate(JSON.parse(JSON.stringify(old))).st;
ok(!loaded.onboard && O.kind(loaded) === 'established', 'an existing save loads without gaining an onboarding record');
ok(JSON.stringify(Object.keys(loaded).sort()) === JSON.stringify(Object.keys(S.hydrate(JSON.parse(JSON.stringify(old))).st).sort()) && loaded.schema === S.SCHEMA, 'no schema change and no migration (schema ' + S.SCHEMA + ')');
const withRec = S.fresh(); O.begin(withRec); O.chooseStarter(withRec, 'lumifern'); O.mark(withRec, 'inspect');
const back = S.hydrate(JSON.parse(JSON.stringify(withRec))).st;
ok(back.onboard && back.onboard.seen.inspect && back.starter === 'lumifern' && back.aminas.length === 1, 'the onboarding record survives a save and load');
ok(S.hydrate(JSON.parse(JSON.stringify(Object.assign({}, withRec, { onboard: 'junk' })))) && O.kind(Object.assign({}, withRec, { onboard: 'junk' })) === 'established', 'a damaged record is ignored safely (treated as an established player)');

/* ---------- no reward or balance change ---------- */
ok(O.STEPS.every((s) => !s.reward), 'prologue steps carry no rewards of their own');
const sim = (withOnboard) => { const s = S.fresh(); if (withOnboard) O.begin(s); s.starter = 'lumifern'; s.phase = 'play'; R.addAmina(s, 'lumifern', 4); R.addAmina(s, 'acinus', 2); s.struct.hollow = true; R.startRun(s, 'forgottenroad', s.aminas.map((a) => a.uid)); const b = R.createBattle(s, seeded(11)); const evs = [];
  let g = 0; while (!b.over && g++ < 80) { if (b.pending) { evs.push(R.Battle.act(b, { t: 'sw', to: b.party.findIndex((f) => f.hp > 0) })); continue; } evs.push(R.Battle.act(b, { t: 'ab', id: R.Battle.legal(b).find((a) => a.ready).id })); }
  const out = R.resolveBattle(s, b); return JSON.stringify({ evs, res: s.res, xp: s.aminas.map((a) => [a.lv, a.xp]), out: { gold: out.gold, food: out.food, win: out.win } }); };
on(() => ok(sim(true) === sim(false), 'a battle plays and pays identically with and without the onboarding record (seeded event log and rewards)'));
done('onboard16');
