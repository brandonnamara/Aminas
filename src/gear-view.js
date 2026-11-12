/* Aminas — Phase 13C: equipment and Forge read-outs (pure rules, no DOM). Nothing here changes how equipment
   works: the three slots, the bonuses, crafting recipes, merge rules, shop prices and battle calculations are the
   existing rules (rules.js, forge.js, gear-data.js). These helpers describe a change before it is made: what
   equipping or removing an item does to an Amina's stats (and to whoever wore it), what a recipe, merge or
   purchase costs against what the player has, and whether the inventory is consistent. Checked against the real
   rules in tests/gear13c.test.js. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, F = R.Forge;
  const G = (R.Gear = {});
  const KEYS = ['hp', 'atk', 'def', 'spd'];
  G.STATS = [['hp', 'HP'], ['atk', 'ATK'], ['def', 'DEF'], ['spd', 'SPD']];
  const diff = (a, b) => { const o = {}; KEYS.forEach((k) => (o[k] = b[k] - a[k])); return o; };
  const busy = (st, uid) => !!(st.run && (st.run.uids || []).indexOf(uid) >= 0);
  // an Amina's stats if it wore `gear` (a {weapon, armour, charm} of iids) instead of what it wears now
  const statsWith = (st, inst, gear) => R.statsWithGear(st, Object.assign({}, inst, { gear }));
  const gearNow = (inst) => Object.assign({ weapon: null, armour: null, charm: null }, inst.gear || {});
  G.pct = (b) => Object.keys(b).map((k) => '+' + Math.round(b[k] * 1000) / 10 + '% ' + k.toUpperCase()).join(', ');

  // Every slot of an Amina: what is in it (or nothing).
  G.slots = function (st, inst) {
    const g = gearNow(inst);
    return D.GEAR_SLOTS.map((k) => { const it = g[k] != null ? R.item(st, g[k]) : null; return { slot: k, name: D.GEAR_SLOT_NAMES[k], item: it, def: it ? D.ITEMS[it.id] : null }; });
  };

  // What equipping item `iid` on Amina `uid` would do, without doing it.
  G.equipPreview = function (st, uid, iid) {
    const inst = R.inst(st, uid), it = R.item(st, iid);
    if (!inst || !it) return { ok: false, reason: 'invalid' };
    const d = D.ITEMS[it.id], slot = d.slot, g = gearNow(inst), cur = g[slot] != null ? R.item(st, g[slot]) : null, prev = R.wearer(st, iid);
    const out = { ok: true, reason: null, uid, iid, slot, slotName: D.GEAR_SLOT_NAMES[slot], item: it, def: d, current: cur, currentDef: cur ? D.ITEMS[cur.id] : null, same: !!(cur && cur.iid === iid), from: prev && prev.uid !== uid ? prev : null };
    if (busy(st, uid) || (out.from && busy(st, out.from.uid))) { out.ok = false; out.reason = 'busy'; }
    if (out.same) { out.ok = false; out.reason = 'same'; }
    out.before = R.statsWithGear(st, inst); out.after = statsWith(st, inst, Object.assign({}, g, { [slot]: iid })); out.diff = diff(out.before, out.after);
    // the Amina that gives the item up loses its bonus; the item that was in the slot goes back to the bag
    if (out.from) { const og = gearNow(out.from), ng = Object.assign({}, og); Object.keys(ng).forEach((k) => { if (ng[k] === iid) ng[k] = null; }); out.fromBefore = R.statsWithGear(st, out.from); out.fromAfter = statsWith(st, out.from, ng); out.fromDiff = diff(out.fromBefore, out.fromAfter); }
    return out;
  };
  G.unequipPreview = function (st, uid, slot) {
    const inst = R.inst(st, uid); if (!inst) return { ok: false, reason: 'invalid' };
    const g = gearNow(inst), cur = g[slot] != null ? R.item(st, g[slot]) : null;
    if (!cur) return { ok: false, reason: 'empty', slot };
    const out = { ok: !busy(st, uid), reason: busy(st, uid) ? 'busy' : null, uid, slot, slotName: D.GEAR_SLOT_NAMES[slot], current: cur, currentDef: D.ITEMS[cur.id] };
    out.before = R.statsWithGear(st, inst); out.after = statsWith(st, inst, Object.assign({}, g, { [slot]: null })); out.diff = diff(out.before, out.after);
    return out;
  };
  // Every owned item that fits a slot (or all), with what it would change for this Amina. Any item fits any Amina:
  // the only rules are the slot it belongs to and that an Amina in a dungeon run cannot change equipment.
  G.choices = function (st, uid, slot) {
    const inst = R.inst(st, uid); if (!inst) return [];
    return R.items(st).filter((it) => !slot || D.ITEMS[it.id].slot === slot).map((it) => { const p = G.equipPreview(st, uid, it.iid), w = R.wearer(st, it.iid); return { item: it, def: D.ITEMS[it.id], wearer: w, mine: !!(w && w.uid === uid), preview: p, gain: KEYS.reduce((n, k) => n + p.diff[k], 0) }; });
  };

  // What one more item of kind `id` would change for an Amina if it went into its slot (compared with what it wears).
  G.wouldGive = function (st, inst, id) {
    const d = D.ITEMS[id]; if (!inst || !d) return null;
    const st2 = Object.assign({}, st, { items: R.items(st).concat([{ iid: -1, id }]) }), before = R.statsWithGear(st, inst);
    const after = R.statsWithGear(st2, Object.assign({}, inst, { gear: Object.assign({}, gearNow(inst), { [d.slot]: -1 }) }));
    return { before, after, diff: diff(before, after) };
  };

  // Cost against what the player has: one line per resource.
  G.costLines = function (st, cost) {
    return ['gold', 'food', 'gems'].filter((k) => cost && cost[k]).map((k) => { const have = st.res[k] | 0, need = cost[k]; return { k, need, have, short: Math.max(0, need - have), after: have - need, ok: have >= need }; });
  };
  const owned = (st, id) => R.items(st).filter((x) => x.id === id).length;
  G.craftPreview = function (st, id) {
    const r = F.recipe(id), c = F.craftCheck(st, id); if (!r) return { ok: false, reason: 'invalid' };
    return { ok: c.ok, reason: c.ok ? null : c.reason, need: c.need || r.lv, id, def: D.ITEMS[id], lv: r.lv, unlocked: F.level(st) >= r.lv, cost: r.cost, lines: G.costLines(st, r.cost), owned: owned(st, id), bag: R.items(st).length, bagMax: D.MAX_ITEMS };
  };
  G.buyPreview = function (st, id) {
    const o = F.offer(id), c = F.buyCheck(st, id); if (!o) return { ok: false, reason: 'invalid' };
    return { ok: c.ok, reason: c.ok ? null : c.reason, need: c.need || o.lv, id, def: D.ITEMS[id], lv: o.lv, unlocked: F.level(st) >= o.lv, price: o.price, cost: { gold: o.price }, lines: G.costLines(st, { gold: o.price }), owned: owned(st, id), bag: R.items(st).length, bagMax: D.MAX_ITEMS };
  };
  // A merge: the two inputs, the single fixed result, the cost, and what it does to an Amina that wears an input.
  G.mergePreview = function (st, iidA, iidB) {
    const a = R.item(st, iidA), b = R.item(st, iidB), c = F.mergeCheck(st, iidA, iidB);
    const out = { ok: c.ok, reason: c.ok ? null : c.reason, need: c.need, a, b, result: c.result || null, def: c.result ? D.ITEMS[c.result] : null, tier: c.tier, cost: c.cost || null, lines: c.cost ? G.costLines(st, c.cost) : [], random: false, wearers: (c.wearers || []).map((u) => R.inst(st, u)), equipTo: c.equipTo != null ? R.inst(st, c.equipTo) : null };
    if (a && c.result) { const from = D.ITEMS[a.id].bonus, to = D.ITEMS[c.result].bonus; out.bonus = Object.keys(to).map((k) => ({ k, from: from[k] || 0, to: to[k] })); }
    if (out.equipTo && c.result) {
      // the Amina that receives the result: its stats before and after (both inputs leave whoever wore them)
      const inst = out.equipTo, g = gearNow(inst), slot = D.ITEMS[c.result].slot, fake = { iid: -1, id: c.result };
      out.before = R.statsWithGear(st, inst);
      const st2 = Object.assign({}, st, { items: R.items(st).filter((x) => x.iid !== iidA && x.iid !== iidB).concat([fake]) }), ng = Object.assign({}, g); Object.keys(ng).forEach((k) => { if (ng[k] === iidA || ng[k] === iidB) ng[k] = null; }); ng[slot] = -1;
      out.after = R.statsWithGear(st2, Object.assign({}, inst, { gear: ng })); out.diff = diff(out.before, out.after);
    }
    return out;
  };
  // Pairs that can merge right now: two owned items of the same line and tier, with a next tier to become.
  G.mergeable = function (st) {
    const groups = {}; R.items(st).forEach((it) => { const d = D.ITEMS[it.id]; if (d.unique || !d.family) return; (groups[it.id] = groups[it.id] || []).push(it); });
    return Object.keys(groups).filter((id) => groups[id].length >= 2 && F.mergeResult(id, id).ok).map((id) => {
      // prefer two that are in the bag, so nothing is taken off an Amina unless there is no other pair
      const list = groups[id].slice().sort((x, y) => !!R.wearer(st, x.iid) - !!R.wearer(st, y.iid) || x.iid - y.iid), r = F.mergeResult(id, id), c = F.mergeCheck(st, list[0].iid, list[1].iid);
      return { id, def: D.ITEMS[id], count: list.length, a: list[0].iid, b: list[1].iid, result: r.result, resultDef: D.ITEMS[r.result], cost: r.cost, lv: r.lv, ok: c.ok, reason: c.ok ? null : c.reason, need: c.need };
    }).sort((x, y) => (y.ok - x.ok) || x.def.tier - y.def.tier || x.def.name.localeCompare(y.def.name));
  };

  // Inventory consistency (used by tests and after every Forge action in development builds).
  G.integrity = function (st) {
    const problems = [], items = R.items(st), ids = {}, worn = {};
    items.forEach((it) => { if (!D.ITEMS[it.id]) problems.push('unknown item ' + it.id); if (ids[it.iid]) problems.push('duplicate item id ' + it.iid); ids[it.iid] = true; });
    st.aminas.forEach((a) => { if (!a.gear) return; Object.keys(a.gear).forEach((k) => { const iid = a.gear[k]; if (iid == null) return; const it = R.item(st, iid); if (!it) { problems.push('Amina ' + a.uid + ' wears a missing item'); return; } if (D.ITEMS[it.id].slot !== k) problems.push('item in the wrong slot on Amina ' + a.uid); if (worn[iid]) problems.push('item ' + iid + ' worn twice'); worn[iid] = true; }); });
    if (items.length > D.MAX_ITEMS) problems.push('bag over its limit');
    return { ok: !problems.length, problems, items: items.length, worn: Object.keys(worn).length };
  };
})(typeof window !== 'undefined' ? window : globalThis);
