/* Aminas — Dev 8: elemental essences and five-level move upgrades (pure rules, no DOM).
   - One essence per element in the game's type system (Light, Dark, Nature, Fire, Water, Earth, Wind, Resonance, Metal),
     kept in st.essence. Earned from dungeon battles, ruin searches, survival waves and habitats set to make essence.
   - Every Amina has two move slots (its basic move and its signature move). Each slot goes from Level 1 (the move as
     it has always been) to Level 5. A level belongs to the slot, so it carries over when the Amina evolves and its
     signature move grows into the next form's move.
   - An upgrade costs essence of the move's own element (moves always share their Amina's element in this roster;
     if that ever changes, the move's element is the one that counts). Upgrades change the real combat numbers
     (rules.js doAbility): damage moves gain power, guard moves block more, healing moves heal more. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules;

  D.MOVE_MAX = 5;
  // index = level (index 0 unused). cost[n] = essence to reach level n.
  D.MOVE_LEVELS = {
    cost:  [0, 0, 10, 25, 50, 90],
    power: [1, 1, 1.08, 1.17, 1.27, 1.38],   // damage, drain and weaken moves
    guard: [0.5, 0.5, 0.55, 0.6, 0.65, 0.7], // share of a hit a guard move blocks
    heal:  [0.25, 0.25, 0.28, 0.31, 0.35, 0.4], // share of max HP a healing move restores at once
  };
  D.ESS_SOURCES = {
    battle: (lv, boss) => (boss ? 8 + Math.floor(lv / 3) : 2 + Math.floor(lv / 6)), // a won dungeon battle: the foe's element
    survival: (boss) => (boss ? 3 : 1),                                             // a won survival wave: the foe's element
    ruins: { toll: ['earth', 'nature', 'light'], tower: ['wind', 'metal', 'dark'], cellar: ['fire', 'water', 'resonance'] }, ruinAmt: [3, 6],
    habitatRate: 0.1, // a habitat set to essence makes 10% of its gold rate as its element's essence (same storage time)
  };
  const ELS = () => Object.keys(D.ELEMENTS);
  const Es = (R.Essence = {});
  Es.rec = function (st) {
    const e = (st.essence = st.essence && typeof st.essence === 'object' ? st.essence : {});
    ELS().forEach((k) => { e[k] = Math.max(0, Math.floor(+e[k] || 0)); });
    Object.keys(e).forEach((k) => { if (!D.ELEMENTS[k]) delete e[k]; });
    return e;
  };
  Es.get = (st, el) => Es.rec(st)[el] || 0;
  Es.gain = function (st, el, n, source) {
    n = Math.floor(+n || 0); if (!D.ELEMENTS[el] || n <= 0) return 0;
    Es.rec(st)[el] += n;
    st.stats = st.stats || {}; st.stats.essence = (st.stats.essence | 0) + n;
    R.emit('essence', { el, n, source: source || '' });
    return n;
  };
  Es.spend = function (st, el, n) {
    const e = Es.rec(st); n = Math.floor(+n || 0);
    if (!D.ELEMENTS[el] || n < 0) return { ok: false, reason: 'invalid' };
    if (e[el] < n) return { ok: false, reason: 'essence', short: n - e[el] };
    e[el] -= n; return { ok: true };
  };

  /* ---------------- move levels ---------------- */
  R.moveSlots = function (inst) {
    const m = Array.isArray(inst.mv) ? inst.mv : [];
    inst.mv = [0, 1].map((i) => Math.max(1, Math.min(D.MOVE_MAX, (m[i] | 0) || 1)));
    return inst.mv;
  };
  // ability id -> level, for the fighter built from this Amina (current form's moves)
  R.moveLevels = function (inst) {
    const sp = D.SPECIES[inst.sp], mv = R.moveSlots(inst), out = {};
    sp.abil.forEach((id, i) => { out[id] = mv[i] || 1; });
    return out;
  };
  // What a move does at a level, in words and numbers (used by every move panel).
  R.moveEffect = function (id, lv) {
    const ab = D.ABILITIES[id], M = D.MOVE_LEVELS;
    if (ab.type === 'guard') return { k: 'guard', v: Math.round(M.guard[lv] * 100), text: 'Blocks ' + Math.round(M.guard[lv] * 100) + '% of the next hit' };
    if (ab.type === 'heal') return { k: 'heal', v: Math.round(M.heal[lv] * 100), text: 'Heals ' + Math.round(M.heal[lv] * 100) + '% of max HP' };
    return { k: 'power', v: Math.round(ab.power * M.power[lv]), text: 'Power ' + Math.round(ab.power * M.power[lv]) };
  };
  R.moveInfo = function (st, inst, slot) {
    const sp = D.SPECIES[inst.sp], id = sp.abil[slot], ab = D.ABILITIES[id], lv = R.moveSlots(inst)[slot];
    const el = ab.el, max = lv >= D.MOVE_MAX, cost = max ? 0 : D.MOVE_LEVELS.cost[lv + 1], have = R.Essence.get(st, el);
    const busy = !!(st.run && (st.run.uids || []).indexOf(inst.uid) >= 0) || !!(st.survival && st.survival.run && (st.survival.run.uids || []).indexOf(inst.uid) >= 0);
    let reason = null;
    if (max) reason = 'max'; else if (busy) reason = 'busy'; else if (have < cost) reason = 'essence';
    return { slot, id, ab, el, lv, max, cost, have, now: R.moveEffect(id, lv), next: max ? null : R.moveEffect(id, lv + 1), ok: !reason, reason };
  };
  R.MOVE_WHY = { max: 'This move is at Level 5, its highest level.', busy: 'Finish the current run first: moves are locked while an Amina is fighting.', essence: 'Not enough essence.' };
  // Upgrades one slot by one level. fromLv must match the slot's current level, so a repeated tap (or a stale
  // panel) can never spend twice or skip a level.
  R.upgradeMove = function (st, uid, slot, fromLv) {
    const inst = R.inst(st, uid); if (!inst || (slot !== 0 && slot !== 1)) return { ok: false, reason: 'invalid' };
    const info = R.moveInfo(st, inst, slot);
    if (fromLv != null && fromLv !== info.lv) return { ok: false, reason: 'stale', lv: info.lv };
    if (!info.ok) return { ok: false, reason: info.reason, short: info.cost - info.have };
    const sp = R.Essence.spend(st, info.el, info.cost); if (!sp.ok) return sp;
    inst.mv[slot] = info.lv + 1;
    st.stats.moveUps = (st.stats.moveUps | 0) + 1;
    R.emit('moveUp', { uid, slot, id: info.id, lv: inst.mv[slot], el: info.el, cost: info.cost });
    return { ok: true, lv: inst.mv[slot], id: info.id, el: info.el, cost: info.cost };
  };

  /* ---------------- earning essence ---------------- */
  // Wraps the existing results so nothing about battles, rewards or progression changes except the extra essence.
  const resolve0 = R.resolveBattle;
  R.resolveBattle = function (st, b) {
    const run = st.run, spec = run && D.DUNGEONS[run.d] && D.DUNGEONS[run.d].battles[run.battle];
    const out = resolve0.apply(this, arguments);
    if (out && out.win && spec && b && b.enemy) {
      const el = D.SPECIES[spec.sp] ? D.SPECIES[spec.sp].el : b.enemy.el, n = D.ESS_SOURCES.battle(spec.lv, !!spec.boss);
      out.essence = { el, n: Es.gain(st, el, n, 'dungeon:' + (run ? run.d : '')) };
    }
    return out;
  };
  if (R.Survival) {
    const sv0 = R.Survival.resolve;
    R.Survival.resolve = function (st, b) {
      const out = sv0.apply(this, arguments);
      if (out && out.win && b && b.enemy) { const el = b.enemy.el, n = D.ESS_SOURCES.survival(!!b.enemy.boss); out.essence = { el, n: Es.gain(st, el, n, 'survival') }; }
      return out;
    };
  }
  if (R.Ruins) {
    const ru0 = R.Ruins.search;
    R.Ruins.search = function (st, id) {
      const out = ru0.apply(this, arguments);
      if (out && out.ok) {
        const pool = D.ESS_SOURCES.ruins[id] || ELS(), el = pool[Math.floor(R.rng() * pool.length)], a = D.ESS_SOURCES.ruinAmt;
        out.essence = { el, n: Es.gain(st, el, a[0] + Math.floor(R.rng() * (a[1] - a[0] + 1)), 'ruin:' + id) };
      }
      return out;
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
