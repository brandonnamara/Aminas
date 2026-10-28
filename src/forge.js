/* Aminas — Forge rules (Dev 7): crafting, merging and buying equipment. Pure rules, no DOM.
   Everything works on the one equipment inventory from v0.7 (st.items + aminas[].gear), so items made here are the
   same items the Gear tab equips and the battle engine reads (R.partyFighter applies their bonuses).

   Safety:
   - Every action is checked completely before anything changes, then applied in one step.
   - Merge also keeps a snapshot and restores it if anything goes wrong part-way (atomic for the player).
   - Every action carries an operation id; an id that was already applied is refused, so a double tap, a repeated
     request or a replayed click can never pay or grant twice. Recent ids are saved with the game. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules;
  const F = (R.Forge = {});
  D.MAX_ITEMS = 150;

  F.rec = (st) => {
    const f = (st.forge = st.forge && typeof st.forge === 'object' ? st.forge : {});
    f.ops = Array.isArray(f.ops) ? f.ops : [];
    f.stats = Object.assign({ crafted: 0, merged: 0, bought: 0 }, f.stats || {});
    return f;
  };
  // Forge level: 0 while it is a ruin; upgrades in progress keep the current level
  F.level = (st) => { const b = st.buildings && st.buildings.forge; return b && b.level >= 1 && (b.state === 'built' || b.state === 'upgrading') ? b.level : 0; };
  F.open = (st) => F.level(st) >= 1;
  let opSeq = 0;
  F.newOp = (kind) => kind + ':' + Date.now().toString(36) + ':' + (++opSeq).toString(36) + ':' + Math.floor(Math.random() * 1e6).toString(36);
  const seen = (st, op) => !!op && F.rec(st).ops.indexOf(op) >= 0;
  const remember = (st, op) => { if (!op) return; const f = F.rec(st); f.ops.push(op); if (f.ops.length > D.FORGE.opsKept) f.ops.splice(0, f.ops.length - D.FORGE.opsKept); };
  const busyUids = (st) => (st.run && st.run.uids) || [];

  /* ---------- crafting ---------- */
  F.recipe = (id) => D.FORGE.recipes.find((r) => r.item === id) || null;
  F.recipes = (st) => D.FORGE.recipes.map((r) => Object.assign({}, r, { unlocked: F.level(st) >= r.lv }));
  F.craftCheck = function (st, id) {
    const r = F.recipe(id);
    if (!r || !D.ITEMS[id]) return { ok: false, reason: 'invalid' };
    if (!F.open(st)) return { ok: false, reason: 'closed' };
    if (F.level(st) < r.lv) return { ok: false, reason: 'level', need: r.lv };
    if (R.items(st).length >= D.MAX_ITEMS) return { ok: false, reason: 'full' };
    const short = A.Economy.shortfall(st, r.cost);
    if (Object.keys(short).length) return { ok: false, reason: 'cost', short, cost: r.cost };
    return { ok: true, cost: r.cost, item: id };
  };
  F.craft = function (st, id, op) {
    if (seen(st, op)) return { ok: false, reason: 'duplicate' };
    const c = F.craftCheck(st, id); if (!c.ok) return c;
    if (!A.Economy.spend(st, c.cost).ok) return { ok: false, reason: 'cost' };
    const it = R.grantItem(st, id, 'forge:craft');
    remember(st, op); F.rec(st).stats.crafted++;
    R.emit('forgeCraft', { id, iid: it.iid });
    return { ok: true, item: it, cost: c.cost };
  };

  /* ---------- shop ---------- */
  F.offer = (id) => D.FORGE.shop.find((o) => o.item === id) || null;
  F.shop = (st) => D.FORGE.shop.map((o) => Object.assign({}, o, { unlocked: F.level(st) >= o.lv }));
  F.buyCheck = function (st, id) {
    const o = F.offer(id);
    if (!o || !D.ITEMS[id]) return { ok: false, reason: 'invalid' };
    if (!F.open(st)) return { ok: false, reason: 'closed' };
    if (F.level(st) < o.lv) return { ok: false, reason: 'level', need: o.lv };
    if (R.items(st).length >= D.MAX_ITEMS) return { ok: false, reason: 'full' };
    if ((st.res.gold | 0) < o.price) return { ok: false, reason: 'gold', short: { gold: o.price - (st.res.gold | 0) }, price: o.price };
    return { ok: true, price: o.price, item: id };
  };
  F.buy = function (st, id, op) {
    if (seen(st, op)) return { ok: false, reason: 'duplicate' };
    const c = F.buyCheck(st, id); if (!c.ok) return c;
    if (!A.Economy.spend(st, { gold: c.price }).ok) return { ok: false, reason: 'gold' };
    const it = R.grantItem(st, id, 'forge:shop');
    remember(st, op); F.rec(st).stats.bought++;
    R.emit('forgeBuy', { id, iid: it.iid, price: c.price });
    return { ok: true, item: it, price: c.price };
  };

  /* ---------- merging ---------- */
  // Two items of the same family and tier -> that family's next tier. The result is fixed by data (visible before
  // confirming). Unique items, the top tier and families without a next tier cannot merge.
  F.mergeResult = function (idA, idB) {
    const a = D.ITEMS[idA], b = D.ITEMS[idB];
    if (!a || !b) return { ok: false, reason: 'invalid' };
    if (a.unique || b.unique) return { ok: false, reason: 'unique' };
    if (a.family !== b.family) return { ok: false, reason: a.slot !== b.slot ? 'slot' : 'family' };
    if (a.tier !== b.tier) return { ok: false, reason: 'tier' };
    const fam = D.GEAR_FAMILIES[a.family], next = fam && fam.tiers[a.tier];   // tiers[] is 0-based: index tier = next tier
    if (!next) return { ok: false, reason: 'max' };
    const m = D.FORGE.merge[a.tier + 1];
    return { ok: true, result: next, tier: a.tier + 1, cost: { gold: m.gold }, lv: m.lv };
  };
  F.mergeCheck = function (st, iidA, iidB) {
    if (!F.open(st)) return { ok: false, reason: 'closed' };
    const ia = R.item(st, iidA), ib = R.item(st, iidB);
    if (!ia || !ib) return { ok: false, reason: 'owned' };
    if (ia.iid === ib.iid) return { ok: false, reason: 'same' };
    const r = F.mergeResult(ia.id, ib.id); if (!r.ok) return r;
    if (F.level(st) < r.lv) return Object.assign({}, r, { ok: false, reason: 'level', need: r.lv });
    const wa = R.wearer(st, ia.iid), wb = R.wearer(st, ib.iid), wearers = [wa, wb].filter(Boolean);
    if (wearers.some((w) => busyUids(st).indexOf(w.uid) >= 0)) return Object.assign({}, r, { ok: false, reason: 'busy' });
    if ((st.res.gold | 0) < r.cost.gold) return Object.assign({}, r, { ok: false, reason: 'gold', short: { gold: r.cost.gold - (st.res.gold | 0) } });
    // where the result goes: back onto whoever wore the first input (else the second), same slot
    const to = wa || wb || null;
    return Object.assign({}, r, { ok: true, wearers: wearers.map((w) => w.uid), equipTo: to ? to.uid : null });
  };
  // opts.confirmEquipped must be true when an input is worn: the player has been told the item leaves that Amina
  // and that the result goes back onto it.
  F.merge = function (st, iidA, iidB, op, opts) {
    opts = opts || {};
    if (seen(st, op)) return { ok: false, reason: 'duplicate' };
    const c = F.mergeCheck(st, iidA, iidB); if (!c.ok) return c;
    if (c.wearers.length && !opts.confirmEquipped) return Object.assign({}, c, { ok: false, reason: 'equipped' });
    const snap = JSON.stringify({ res: st.res, items: st.items, nextIid: st.nextIid, gear: st.aminas.map((a) => [a.uid, a.gear]) });
    try {
      if (!A.Economy.spend(st, c.cost).ok) throw new Error('cost');
      const slot = D.ITEMS[c.result].slot;
      st.aminas.forEach((a) => { if (!a.gear) return; Object.keys(a.gear).forEach((k) => { if (a.gear[k] === iidA || a.gear[k] === iidB) a.gear[k] = null; }); });
      st.items = R.items(st).filter((x) => x.iid !== iidA && x.iid !== iidB);
      st.nextIid = Math.max(st.nextIid | 0, 1);
      const it = { iid: st.nextIid++, id: c.result, from: 'forge:merge', at: R.now() };
      st.items.push(it);
      if (c.equipTo != null) { const inst = R.inst(st, c.equipTo); if (inst) R.gearOf(inst)[slot] = it.iid; }
      remember(st, op); F.rec(st).stats.merged++;
      R.emit('forgeMerge', { id: c.result, iid: it.iid, tier: c.tier, equipTo: c.equipTo });
      return { ok: true, item: it, cost: c.cost, equipTo: c.equipTo };
    } catch (e) {
      const s = JSON.parse(snap);
      st.res = s.res; st.items = s.items; st.nextIid = s.nextIid;
      s.gear.forEach(([uid, g]) => { const a = st.aminas.find((x) => x.uid === uid); if (a) a.gear = g; });  // no rules calls here: restoring must not fail
      return { ok: false, reason: 'failed', error: e.message };
    }
  };
  // Every item an item could merge with right now (for the picker)
  F.partners = (st, iid) => { const a = R.item(st, iid); if (!a) return []; return R.items(st).filter((b) => b.iid !== iid && F.mergeResult(a.id, b.id).ok); };

  // Explanations for the interface
  F.WHY = {
    closed: 'Restore the Old Forge first.', level: (c) => 'Needs Forge level ' + c.need + '.', full: 'Your bag is full (' + D.MAX_ITEMS + ' items).',
    cost: 'Not enough resources.', gold: 'Not enough gold.', invalid: 'That item is not available.', duplicate: 'Already done.',
    owned: 'You no longer own one of these items.', same: 'Choose two different items.', unique: 'Unique items cannot be merged.',
    slot: 'Only items of the same kind can merge (weapon with weapon, and so on).', family: 'Only two of the same item line can merge (for example two Driftwood Clubs).',
    tier: 'Both items must be the same tier.', max: 'This item is already the top tier of its line.', busy: 'One of these items is worn by an Amina in a dungeon run.',
    equipped: 'One of these items is equipped. Confirm to take it off; the result goes back onto that Amina.', failed: 'Something went wrong; nothing was changed.',
  };
  F.why = (c) => { const w = F.WHY[c.reason]; return typeof w === 'function' ? w(c) : w || ''; };
})(typeof window !== 'undefined' ? window : globalThis);
