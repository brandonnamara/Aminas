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
    heal:  [0.3, 0.3, 0.33, 0.36, 0.4, 0.45], // share of max HP a healing move restores at once (Phase 17C: +5 points at every level)
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
    const out = [0, 1].map((i) => Math.max(1, Math.min(D.MOVE_MAX, (m[i] | 0) || 1)));
    // Phase 17B/17C: a third slot for the move an evolved Amina keeps from its first form. It is only stored once it
    // has been upgraded, so existing saves (two slots) are unchanged and read it as Level 1.
    if (m.length > 2 && (m[2] | 0) > 1) out.push(Math.max(1, Math.min(D.MOVE_MAX, m[2] | 0)));
    inst.mv = out;
    return inst.mv;
  };
  // ability id -> level, for the fighter built from this Amina (current form's moves)
  R.moveLevels = function (inst) {
    const sp = D.SPECIES[inst.sp], mv = R.moveSlots(inst), out = {};
    sp.abil.forEach((id, i) => { out[id] = mv[i] || 1; });
    const keep = R.retainedMove && D.COMBAT17 && D.COMBAT17.retain ? R.retainedMove(inst.sp) : null; if (keep && out[keep] == null) out[keep] = mv[2] || 1;
    return out;
  };
  // What a move does at a level, in words and numbers (used by every move panel).
  R.moveEffect = function (id, lv) {
    const ab = D.ABILITIES[id], M = D.MOVE_LEVELS;
    if (ab.type === 'guard') return { k: 'guard', v: Math.round(M.guard[lv] * 100), text: 'Blocks ' + Math.round(M.guard[lv] * 100) + '% of the next hit' };
    if (ab.type === 'heal') return { k: 'heal', v: Math.round(M.heal[lv] * 100), text: 'Heals ' + Math.round(M.heal[lv] * 100) + '% of max HP' };
    return { k: 'power', v: Math.round(ab.power * M.power[lv]), text: 'Power ' + Math.round(ab.power * M.power[lv]) };
  };
  // The slots that exist for this Amina: 0 basic, 1 signature, and 2 the kept first-form move of an evolved Amina.
  R.moveSlotIds = function (inst) { const sp = D.SPECIES[inst.sp], keep = R.retainedMove && D.COMBAT17 && D.COMBAT17.retain ? R.retainedMove(inst.sp) : null; return keep ? sp.abil.concat([keep]) : sp.abil.slice(); };
  R.moveInfo = function (st, inst, slot) {
    const id = R.moveSlotIds(inst)[slot]; if (!id) return null;
    const ab = D.ABILITIES[id], lv = R.moveSlots(inst)[slot] || 1;
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
    const inst = R.inst(st, uid); if (!inst || (slot !== 0 && slot !== 1 && slot !== 2)) return { ok: false, reason: 'invalid' };
    const info = R.moveInfo(st, inst, slot); if (!info) return { ok: false, reason: 'invalid' };
    if (fromLv != null && fromLv !== info.lv) return { ok: false, reason: 'stale', lv: info.lv };
    if (!info.ok) return { ok: false, reason: info.reason, short: info.cost - info.have };
    const sp = R.Essence.spend(st, info.el, info.cost); if (!sp.ok) return sp;
    if (slot === 2) while (inst.mv.length < 3) inst.mv.push(1);
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

/* Phase 17C: releasing a duplicate Amina to the wild, for essence of its element. Never automatic: the player asks,
   sees what it gives and confirms. Only a duplicate can go (another Amina of the same species stays), and never one
   that is busy or important: the companion, anyone in a run, a saved team or the PvP roster, a resident, anyone
   wearing gear, a favourite, or a legendary. The Codex (owned/seen) is not touched. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules;
  D.RELEASE = { base: 2, perLevel: 1, perStage: 5, moveRefund: 0.5 };
  const Rel = (R.Release = {});
  Rel.essenceFor = function (inst) {
    const sp = D.SPECIES[inst.sp], X = D.RELEASE, mv = R.moveSlots(inst);
    let spent = 0; mv.forEach((lv) => { for (let l = 2; l <= lv; l++) spent += D.MOVE_LEVELS.cost[l]; });
    // essence spent on its moves comes back by half, in each move's own element
    const back = {}; R.moveSlotIds(inst).forEach((id, i) => { let c = 0; for (let l = 2; l <= (mv[i] || 1); l++) c += D.MOVE_LEVELS.cost[l]; if (c) { const el = D.ABILITIES[id].el; back[el] = (back[el] || 0) + Math.floor(c * X.moveRefund); } });
    const main = X.base + X.perLevel * inst.lv + X.perStage * (sp.stage - 1);
    const out = Object.assign({}, back); out[sp.el] = (out[sp.el] || 0) + main;
    return { el: sp.el, main, back, total: out, spent };
  };
  Rel.why = { invalid: 'That Amina is not here.', last: 'It is your only one of its kind.', companion: 'It is your companion.', busy: 'It is in a dungeon run or Survival.', team: 'It is in a saved team (Island Defence or the 5v5 roster).', home: 'It lives in a building. Move it out first.', gear: 'It is wearing equipment. Take it off first.', fav: 'It is a favourite.', legendary: 'Legendary Aminas cannot be released.' };
  Rel.check = function (st, uid) {
    const inst = R.inst(st, uid); if (!inst) return { ok: false, reason: 'invalid' };
    const sp = D.SPECIES[inst.sp], reasons = [];
    if (sp.legendary) reasons.push('legendary');
    if (st.aminas.filter((a) => a.sp === inst.sp && a.uid !== uid).length < 1) reasons.push('last');
    if (st.active === uid) reasons.push('companion');
    const inRun = (st.run && (st.run.uids || []).indexOf(uid) >= 0) || (st.survival && st.survival.run && (st.survival.run.uids || []).indexOf(uid) >= 0);
    if (inRun) reasons.push('busy');
    const teams = [].concat((st.pvp && st.pvp.roster) || [], (st.defence && st.defence.attack) || [], (st.defence && st.defence.defence) || []);
    if (teams.indexOf(uid) >= 0) reasons.push('team');
    if (A.World && A.World.homeOf && A.World.homeOf(st, uid)) reasons.push('home');
    if (inst.gear && Object.keys(inst.gear).some((k) => inst.gear[k] != null)) reasons.push('gear');
    if (inst.fav) reasons.push('fav');
    return { ok: !reasons.length, reason: reasons[0] || null, reasons, gives: Rel.essenceFor(inst), inst };
  };
  // confirm must be true: the panel only sends it from its confirmation button
  Rel.release = function (st, uid, confirm) {
    if (confirm !== true) return { ok: false, reason: 'confirm' };
    const c = Rel.check(st, uid); if (!c.ok) return c;
    const g = c.gives; Object.keys(g.total).forEach((el) => R.Essence.gain(st, el, g.total[el], 'release'));
    st.aminas = st.aminas.filter((a) => a.uid !== uid);
    if (Array.isArray(st.party)) st.party = st.party.filter((u) => u !== uid);
    st.stats.released = (st.stats.released | 0) + 1;
    R.emit('released', { uid, sp: c.inst.sp, essence: g.total });
    return { ok: true, sp: c.inst.sp, lv: c.inst.lv, essence: g.total };
  };
  Rel.setFav = function (st, uid, on) { const inst = R.inst(st, uid); if (!inst) return false; if (on) inst.fav = true; else delete inst.fav; return true; };
})(typeof window !== 'undefined' ? window : globalThis);

/* Phase 17C: gem conveniences (no paid currency exists; gems are only earned in play).
   - Hatch now: an incubating egg hatches at once for gems, priced like "Finish now" on buildings (1 gem per started
     6 minutes left, at least 1).
   - Essence exchange: gems for essence of an element you choose, 3 essence per gem, at most 30 gems a day. It helps
     elements that are hard to earn (Metal and Resonance have no habitat), and never buys anything else. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules;
  D.GEMS17 = { exchangeRate: 3, exchangeDaily: 30 };
  const W = () => A.World, today = () => { const d = new Date(R.now()); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  R.hatchNowCost = function (st, slot) { const e = R.eggStatus(st, null, slot); if (!e || e.ready) return 0; return W().finishCost(Math.ceil(e.left / 1000)); };
  R.hatchNow = function (st, slot) {
    const egg = R.eggIn(st, slot), e = R.eggStatus(st, null, slot); if (!egg || !e) return { ok: false, reason: 'invalid' };
    if (e.ready) return { ok: false, reason: 'ready' };
    const gems = R.hatchNowCost(st, slot), sp = A.Economy.spend(st, { gems }); if (!sp.ok) return { ok: false, reason: 'gems', short: gems - st.res.gems };
    egg.readyAt = R.now(); st.stats.gemsSpent = (st.stats.gemsSpent | 0) + gems; R.emit('hatchNow', { slot, gems });
    return { ok: true, gems };
  };
  const exRec = (st) => { const k = today(); if (!st.essEx || st.essEx.day !== k) st.essEx = { day: k, gems: 0 }; return st.essEx; };
  R.Essence.exchangeLeft = (st) => Math.max(0, D.GEMS17.exchangeDaily - exRec(st).gems);
  R.Essence.exchange = function (st, el, gems) {
    gems = Math.floor(+gems || 0); if (!D.ELEMENTS[el] || gems <= 0) return { ok: false, reason: 'invalid' };
    if (gems > R.Essence.exchangeLeft(st)) return { ok: false, reason: 'daily', left: R.Essence.exchangeLeft(st) };
    const sp = A.Economy.spend(st, { gems }); if (!sp.ok) return { ok: false, reason: 'gems', short: gems - st.res.gems };
    exRec(st).gems += gems; st.stats.gemsSpent = (st.stats.gemsSpent | 0) + gems;
    const n = gems * D.GEMS17.exchangeRate; R.Essence.gain(st, el, n, 'exchange');
    return { ok: true, el, n, gems, left: R.Essence.exchangeLeft(st) };
  };
})(typeof window !== 'undefined' ? window : globalThis);
