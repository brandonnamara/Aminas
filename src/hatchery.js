/* Aminas — Phase 13B: Hatchery read-outs (pure rules, no DOM). Nothing here changes how breeding works: pairings,
   costs, the level-5 rule, incubation times, slots and hatching are the existing rules (rules.js, roster.js,
   world-data.js). These helpers describe that state for the screens: what the Hatchery is doing, what a pairing
   needs and would give, what the next upgrade adds, and which recipes are known. Checked against the real rules in
   tests/hatchery13b.test.js. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules;
  const H = (R.Hatch = {});
  const W = () => A.World;
  const sp = (id) => D.SPECIES[id];

  // What the Hatchery is doing right now. Breeding has no duration of its own in the rules (an egg is laid at once),
  // so the lasting states are: closed (still a ruin), idle, incubating, full (every slot incubating) and ready.
  H.status = function (st, now) {
    now = now || R.now();
    const slots = R.eggSlots(st), eggs = R.eggs(st).filter((e) => e.slot < slots), ready = eggs.filter((e) => e.readyAt <= now).length;
    const waiting = eggs.filter((e) => e.readyAt > now), soonest = waiting.length ? Math.min.apply(null, waiting.map((e) => e.readyAt)) - now : 0;
    const state = !slots ? 'closed' : ready ? 'ready' : !eggs.length ? 'idle' : eggs.length >= slots ? 'full' : 'incubating';
    return { state, slots, used: eggs.length, free: Math.max(0, slots - eggs.length), ready, incubating: waiting.length, soonest, maxSlots: D.MAX_EGG_SLOTS };
  };
  H.STATE_NAME = { closed: 'Closed', idle: 'Idle', incubating: 'Incubating', full: 'Fully occupied', ready: 'Ready to hatch' };

  // Incubation time for an egg laid now (the same arithmetic as R.startBreed).
  H.incubationSecs = (st) => Math.max(5, Math.round((D.EGG_SECONDS[st.settings.eggSpeed] || D.EGG_SECONDS.fast) * W().eggTimeFactor(st)));

  // The Hatchery's level, what it gives, and what the next upgrade costs and adds (one more breeding slot each time).
  H.upgrade = function (st) {
    const b = st.buildings && st.buildings.hatchery, d = D.BUILDINGS.hatchery, max = d.levels.length, lv = R.hatcheryLevel(st);
    const out = { level: lv, max, slots: R.eggSlots(st), eggTime: lv ? d.levels[lv - 1].eggTime : 1, atMax: lv >= max, upgrading: !!(b && b.state === 'upgrading'), endAt: b && b.state === 'upgrading' ? b.endAt : 0, next: null };
    if (lv && lv < max) {
      const nx = d.levels[lv], info = W().upgradeInfo(st, 'hatchery');
      out.next = { level: lv + 1, slots: nx.slots, addSlots: nx.slots - out.slots, eggTime: nx.eggTime, cost: nx.cost, time: W().secs ? W().secs(st, nx.time) : nx.time, ok: !!info.ok, reason: info.ok ? null : info.reason, short: info.short || {}, text: info.ok ? '' : info.text || '' };
    }
    return out;
  };

  // Everything the breeding panel shows for a chosen pair, without changing anything. `ok` equals R.breedCheck's.
  H.pair = function (st, uidA, uidB, slot) {
    const a = R.inst(st, uidA), b = R.inst(st, uidB), chk = R.breedCheck(st, uidA, uidB, slot == null ? undefined : slot);
    const both = !!(a && b), diff = both && a.uid !== b.uid, rec = diff ? R.recipeFor(sp(a.sp).el, sp(b.sp).el) : null;
    const locked = !!(rec && rec.locked && !st.flags.r2), cost = D.BREED_COST;
    const short = { gold: Math.max(0, (cost.gold || 0) - st.res.gold), food: Math.max(0, (cost.food || 0) - st.res.food) };
    const freeSlot = slot != null && slot >= 0 && slot < R.eggSlots(st) && !R.eggIn(st, slot) ? slot : R.freeSlot(st);
    const known = !!(rec && ((st.recipes && st.recipes[rec.key]) || st.owned[rec.sp]));
    return {
      ok: chk.ok, reason: chk.ok ? null : chk.reason, slot: chk.ok ? chk.slot : freeSlot,
      a: a || null, b: b || null,
      needs: [
        { k: 'parents', ok: diff, text: 'Two different Aminas' },
        { k: 'level', ok: both && a.lv >= D.BREED_MIN_LEVEL && b.lv >= D.BREED_MIN_LEVEL, text: 'Both level ' + D.BREED_MIN_LEVEL + ' or higher', low: both ? [a, b].filter((x) => x.lv < D.BREED_MIN_LEVEL).map((x) => x.uid) : [] },
        { k: 'match', ok: !!rec && !locked, text: locked ? 'This pairing needs the Dormant Spire to wake' : rec || !diff ? 'Elements that pair' : 'These two elements do not pair', locked },
        { k: 'slot', ok: freeSlot >= 0, text: freeSlot >= 0 ? 'A free breeding slot (Slot ' + (freeSlot + 1) + ')' : 'A free breeding slot (all ' + R.eggSlots(st) + ' are in use)' },
        { k: 'cost', ok: !short.gold && !short.food, text: cost.gold + ' gold and ' + cost.food + ' food', short },
      ],
      cost, short, have: { gold: st.res.gold, food: st.res.food },
      outcome: rec && !locked ? { sp: rec.sp, key: rec.key, known, name: known ? sp(rec.sp).name : null, el: known ? sp(rec.sp).el : null, owned: st.aminas.filter((x) => x.sp === rec.sp).length } : null,
      secs: H.incubationSecs(st),
    };
  };
  // Would this Amina be a valid partner for `other` (or a valid first pick when nothing is chosen)?
  H.candidate = function (st, inst, other) {
    if (inst.lv < D.BREED_MIN_LEVEL) return { ok: false, why: 'Needs Lv ' + D.BREED_MIN_LEVEL };
    if (other && other.uid === inst.uid) return { ok: false, why: 'Already chosen' };
    if (!other) return { ok: true, why: '' };
    const r = R.recipeFor(sp(inst.sp).el, sp(other.sp).el);
    if (!r) return { ok: false, why: 'No match' };
    if (r.locked && !st.flags.r2) return { ok: false, why: 'Locked pairing' };
    const known = (st.recipes && st.recipes[r.key]) || st.owned[r.sp];
    return { ok: true, why: '', sp: r.sp, known: !!known };
  };

  // The recipe book: discovered pairings in full; the rest only as a count (their results stay hidden, as before).
  H.book = function (st) {
    const total = Object.keys(D.BREED).length + 1, keys = Object.keys(st.recipes || {}).filter((k) => sp(st.recipes[k]));
    return { total, known: keys.map((k) => ({ key: k, els: k.split('+'), sp: st.recipes[k], name: sp(st.recipes[k]).name })), hidden: Math.max(0, total - keys.length) };
  };

  // Load-time repair (called from state validation): an egg can never be further from hatching than the longest
  // incubation, so a device clock that jumped cannot strand an egg for days.
  H.maxSecs = () => Math.max.apply(null, Object.keys(D.EGG_SECONDS).map((k) => D.EGG_SECONDS[k]));
  H.repair = function (st, now) {
    now = now || R.now(); let fixed = 0; const max = H.maxSecs() * 1000;
    R.eggs(st).forEach((e) => {
      if (!(e.startedAt > 0) || e.startedAt > e.readyAt) { e.startedAt = Math.min(e.readyAt, now) - 1000; fixed++; }
      if (e.readyAt - now > max) { e.readyAt = now + max; e.startedAt = Math.min(e.startedAt, now); fixed++; }
      if (!Array.isArray(e.parents)) { e.parents = []; fixed++; }
    });
    return fixed;
  };
})(typeof window !== 'undefined' ? window : globalThis);
