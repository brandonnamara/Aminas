/* Aminas — Phase 13A: progression read-outs (pure rules, no DOM). Nothing here changes how Aminas grow: levels, XP,
   feeding, evolution, move upgrades and gear are computed by the existing rules (rules.js, essence.js). These helpers
   only describe that progression for the screens: where an Amina stands, what a feed would do, what evolving would
   change, and what each move level gives. Previews use the same formulas as the rules and are checked against the
   real results in tests/progression13a.test.js. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules;
  const P = (R.Prog = {});
  const KEYS = ['hp', 'atk', 'def', 'spd'];
  P.STATS = [['hp', 'HP'], ['atk', 'ATK'], ['def', 'DEF'], ['spd', 'SPD']];
  const withGear = (st, inst) => R.statsWithGear(st, inst);
  // move levels without touching the Amina (R.moveSlots fills in a missing record; a read-out must not write)
  const mvOf = (inst) => [0, 1].map((i) => Math.max(1, Math.min(D.MOVE_MAX || 5, ((Array.isArray(inst.mv) ? inst.mv[i] : 1) | 0) || 1)));
  const diff = (a, b) => { const o = {}; KEYS.forEach((k) => (o[k] = b[k] - a[k])); return o; };

  // Level and experience, as the screens show them.
  P.level = function (inst) {
    const max = inst.lv >= D.MAX_LEVEL, need = max ? 0 : R.xpNeed(inst.lv);
    return { lv: inst.lv, max, xp: max ? 0 : inst.xp, need, left: max ? 0 : Math.max(0, need - inst.xp), pct: max ? 100 : Math.max(0, Math.min(100, Math.round(inst.xp / need * 100))) };
  };
  // Stats now (with equipment), the part that comes from equipment, and what the next level adds.
  P.stats = function (st, inst) {
    const base = R.statsAt(inst.sp, inst.lv), now = withGear(st, inst), max = inst.lv >= D.MAX_LEVEL;
    const next = max ? now : withGear(st, Object.assign({}, inst, { lv: inst.lv + 1 }));
    return { now, base, gear: diff(base, now), nextGain: diff(now, next), max, hasGear: KEYS.some((k) => now[k] !== base[k]) };
  };
  // What feeding `kind` would do right now, without doing it.
  P.feedPreview = function (st, inst, kind) {
    const k = D.SNACKS[kind]; if (!k || !inst) return null;
    const out = { kind, name: k.name, food: k.food, xp: k.xp, have: st.res.food, ok: true, reason: null, short: 0 };
    if (inst.lv >= D.MAX_LEVEL) return Object.assign(out, { ok: false, reason: 'max' });
    if (st.res.food < k.food) Object.assign(out, { ok: false, reason: 'food', short: k.food - st.res.food });
    // the same arithmetic as R.addXp, on numbers only (no events are raised for a preview)
    let lv = inst.lv, xp = inst.xp + k.xp;
    while (lv < D.MAX_LEVEL && xp >= R.xpNeed(lv)) { xp -= R.xpNeed(lv); lv++; }
    if (lv >= D.MAX_LEVEL) xp = 0;
    out.lvAfter = lv; out.xpAfter = xp; out.levels = lv - inst.lv;
    const evo = D.SPECIES[inst.sp].evo; out.evoReady = !!(evo && lv >= evo.lv && inst.evoNote !== evo.to); // as R.addXp reports it
    return out;
  };
  P.feeds = (st, inst) => Object.keys(D.SNACKS).map((k) => P.feedPreview(st, inst, k));
  // XP still needed to reach a level from where the Amina is now.
  P.xpTo = function (inst, lv) { let n = 0; for (let l = inst.lv; l < Math.min(lv, D.MAX_LEVEL); l++) n += R.xpNeed(l) - (l === inst.lv ? inst.xp : 0); return Math.max(0, n); };

  // What evolving would change: requirements, stats at the same level (with the same equipment), and moves.
  P.evoPreview = function (st, inst) {
    const sp = D.SPECIES[inst.sp], evo = sp.evo; if (!evo) return { final: true, stage: sp.stage, stages: D.LINES[sp.line].ids.length };
    const c = R.evoCheck(st, inst.uid), to = D.SPECIES[evo.to], cost = evo.cost || {};
    const now = withGear(st, inst), after = withGear(st, Object.assign({}, inst, { sp: evo.to }));
    const mv = mvOf(inst);
    const moves = to.abil.map((id, i) => ({ slot: i, id, name: D.ABILITIES[id].name, from: sp.abil[i], fromName: D.ABILITIES[sp.abil[i]].name, isNew: id !== sp.abil[i], lv: mv[i] || 1, effect: R.moveEffect ? R.moveEffect(id, mv[i] || 1).text : '', was: R.moveEffect ? R.moveEffect(sp.abil[i], mv[i] || 1).text : '' }));
    return {
      final: false, to: evo.to, name: to.name, known: !!st.owned[evo.to], stage: sp.stage, toStage: to.stage, stages: D.LINES[sp.line].ids.length,
      lv: evo.lv, levelOk: inst.lv >= evo.lv, levelsToGo: Math.max(0, evo.lv - inst.lv), xpToGo: P.xpTo(inst, evo.lv),
      cost, costOk: R.canAfford(st, cost), have: { gold: st.res.gold, food: st.res.food, gems: st.res.gems },
      short: { gold: Math.max(0, (cost.gold || 0) - st.res.gold), food: Math.max(0, (cost.food || 0) - st.res.food) },
      ok: c.ok, reason: c.ok ? null : c.reason, now, after, gain: diff(now, after), moves, newMoves: moves.filter((m) => m.isNew),
    };
  };
  // The same comparison for an evolution that has just happened (the ceremony): from-form against to-form.
  P.evoResult = function (st, inst, fromSp) {
    const a = D.SPECIES[fromSp], b = D.SPECIES[inst.sp], before = withGear(st, Object.assign({}, inst, { sp: fromSp })), after = withGear(st, inst), mv = mvOf(inst);
    const moves = b.abil.map((id, i) => ({ slot: i, id, name: D.ABILITIES[id].name, fromName: D.ABILITIES[a.abil[i]].name, isNew: id !== a.abil[i], lv: mv[i] || 1, effect: R.moveEffect ? R.moveEffect(id, mv[i] || 1).text : '', was: R.moveEffect ? R.moveEffect(a.abil[i], mv[i] || 1).text : '' }));
    return { lv: inst.lv, stage: b.stage, stages: D.LINES[b.line].ids.length, before, after, gain: diff(before, after), moves, newMoves: moves.filter((m) => m.isNew), next: b.evo ? { lv: b.evo.lv } : null };
  };
  // Every level of a move: what it does and what reaching it costs (essence of the move's element).
  P.moveTrack = function (id) {
    const out = []; for (let lv = 1; lv <= D.MOVE_MAX; lv++) out.push({ lv, cost: D.MOVE_LEVELS.cost[lv], effect: R.moveEffect(id, lv) });
    return out;
  };
  P.moveCostToMax = function (lv) { let n = 0; for (let l = lv + 1; l <= D.MOVE_MAX; l++) n += D.MOVE_LEVELS.cost[l]; return n; };
})(typeof window !== 'undefined' ? window : globalThis);
