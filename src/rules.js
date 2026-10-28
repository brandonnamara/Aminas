/* Aminas — game rules (no DOM). All progression logic lives here so it can be tested in Node. */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = A.Data;
  const R = (A.Rules = {});

  /* ---------- runtime plumbing ---------- */
  R.q = [];
  R.listeners = [];
  R.on = (fn) => { R.listeners.push(fn); };
  // Events are queued for the UI and passed synchronously to listeners (quest counters) so nothing is ever missed.
  R.emit = (name, data) => { const ev = { name, data: data || {} }; R.q.push(ev); R.listeners.forEach((fn) => { try { fn(ev); } catch (e) { /* a listener must never break gameplay */ } }); };
  R.drain = () => { const q = R.q; R.q = []; return q; };
  R.rng = () => Math.random();
  R.now = () => Date.now();

  const sp = (id) => D.SPECIES[id];
  R.sp = sp;

  /* ---------- levels & stats ---------- */
  R.xpNeed = (lv) => Math.floor(16 + lv * 8 + lv * lv * 1.2);
  R.statsAt = function (spId, lv) {
    const b = sp(spId).stats, f = 1 + 0.11 * (lv - 1);
    return { hp: Math.floor(b.hp * f), atk: Math.floor(b.atk * f), def: Math.floor(b.def * f), spd: Math.floor(b.spd * f) };
  };
  R.inst = (st, uid) => st.aminas.find((a) => a.uid === uid) || null;
  R.active = (st) => R.inst(st, st.active);

  // Legacy helpers kept for older call sites; new code uses A.Economy (world.js) which validates before spending.
  R.addRes = function (st, r) {
    ['gold', 'food', 'gems'].forEach((k) => { if (r && r[k]) st.res[k] = Math.max(0, st.res[k] + Math.floor(r[k])); });
  };
  R.canAfford = (st, r) => A.Economy.canAfford(st, r);

  R.gainRankXp = function (st, n) {
    st.rankXp += n;
    while (st.rank < 30 && st.rankXp >= D.RANK_NEED(st.rank)) {
      st.rankXp -= D.RANK_NEED(st.rank);
      st.rank++;
      R.emit('rankUp', { rank: st.rank });
    }
  };

  /* ---------- owning Aminas ---------- */
  R.addAmina = function (st, spId, lv) {
    if (st.aminas.length >= D.MAX_INSTANCES) return null;
    const inst = { uid: st.nextUid++, sp: spId, lv: lv || 1, xp: 0 };
    st.aminas.push(inst);
    const first = !st.owned[spId];
    st.owned[spId] = true;
    st.seen[spId] = true;
    if (!st.active) st.active = inst.uid;
    if (first) { R.gainRankXp(st, 10); R.emit('discover', { sp: spId, uid: inst.uid }); }
    return inst;
  };
  R.ownedCount = (st) => Object.keys(st.owned).length;
  R.status = (st, spId) => (st.owned[spId] ? 'owned' : st.seen[spId] ? 'seen' : 'unknown');

  R.setActive = function (st, uid) {
    if (!R.inst(st, uid)) return false;
    A.World.tickProduction(st);
    st.active = uid;
    // the companion always lives in the Sunlit Hollow, so it leaves any other home
    Object.keys(st.buildings).forEach((k) => { st.buildings[k].residents = (st.buildings[k].residents || []).filter((u) => u !== uid); });
    return true;
  };

  /* ---------- xp / feeding ---------- */
  R.addXp = function (st, inst, amt) {
    const out = { levels: [], evolved: null, evoReady: null, gained: 0 };
    if (inst.lv >= D.MAX_LEVEL || amt <= 0) return out;
    inst.xp += amt; out.gained = amt;
    while (inst.lv < D.MAX_LEVEL && inst.xp >= R.xpNeed(inst.lv)) {
      inst.xp -= R.xpNeed(inst.lv);
      out.levels.push({ from: inst.lv, to: inst.lv + 1 });
      inst.lv++;
      R.emit('creatureLevel', { uid: inst.uid, sp: inst.sp, from: inst.lv - 1, to: inst.lv });
    }
    if (inst.lv >= D.MAX_LEVEL) inst.xp = 0;
    // v0.7: evolution is never automatic. When the next form becomes available the player is told once, and it
    // only happens when they confirm (R.evolve). Level, XP, equipment and the uid are kept through it.
    const evo = sp(inst.sp).evo;
    if (evo && inst.lv >= evo.lv && inst.evoNote !== evo.to) {
      inst.evoNote = evo.to;
      out.evoReady = { from: inst.sp, to: evo.to };
      R.emit('evoReady', { uid: inst.uid, from: inst.sp, to: evo.to });
    }
    return out;
  };

  /* ---------- evolution (player-confirmed) ---------- */
  // Requirements: the species has a next form, the Amina has reached its level, and the gold/food cost is affordable.
  R.evoCheck = function (st, uid) {
    const inst = R.inst(st, uid); if (!inst) return { ok: false, reason: 'invalid' };
    const evo = sp(inst.sp).evo; if (!evo) return { ok: false, reason: 'final' };
    const out = { to: evo.to, lv: evo.lv, cost: evo.cost || {}, from: inst.sp };
    if (st.run && (st.run.uids || []).indexOf(uid) >= 0) return Object.assign(out, { ok: false, reason: 'busy' });
    if (inst.lv < evo.lv) return Object.assign(out, { ok: false, reason: 'level', need: evo.lv - inst.lv });
    if (evo.cost && !R.canAfford(st, evo.cost)) return Object.assign(out, { ok: false, reason: 'cost' });
    return Object.assign(out, { ok: true });
  };
  R.canEvolve = (st, uid) => R.evoCheck(st, uid).ok;
  // Every Amina whose next form is available right now (for notices and badges).
  R.evoReadyList = (st) => st.aminas.filter((a) => { const e = sp(a.sp).evo; return e && a.lv >= e.lv; }).map((a) => a.uid);
  R.evolve = function (st, uid) {
    const c = R.evoCheck(st, uid); if (!c.ok) return c;
    if (c.cost && (c.cost.gold || c.cost.food || c.cost.gems) && !A.Economy.spend(st, c.cost).ok) return Object.assign(c, { ok: false, reason: 'cost' });
    const inst = R.inst(st, uid), from = inst.sp;
    inst.sp = c.to; inst.evoNote = null;          // lv, xp, gear, uid and home are unchanged
    st.stats.evolved++;
    const first = !st.owned[c.to];
    st.owned[c.to] = true; st.seen[c.to] = true;
    R.emit('evolve', { uid, from, to: c.to, first });
    R.gainRankXp(st, 15);
    return { ok: true, from, to: c.to, first };
  };

  R.feed = function (st, uid, kind) {
    const k = D.SNACKS[kind]; const inst = R.inst(st, uid);
    if (!k || !inst) return { ok: false, reason: 'invalid' };
    if (inst.lv >= D.MAX_LEVEL) return { ok: false, reason: 'max' };
    if (st.res.food < k.food) { R.emit('feedEmpty', {}); return { ok: false, reason: 'food', need: k.food - st.res.food }; }
    st.res.food -= k.food;
    st.stats.fed++;
    const r = R.addXp(st, inst, k.xp);
    R.emit('fed', { uid, kind });
    return Object.assign({ ok: true, xp: k.xp }, r);
  };

  /* ---------- structures (story ruins) — delegated to world.js ---------- */
  R.reqMet = function (st, req) {
    if (!req) return true;
    if (req.struct && !st.struct[req.struct]) return false;
    if (req.flag && !st.flags[req.flag]) return false;
    if (req.rank && st.rank < req.rank) return false;
    if (req.dungeon && !R.dungeonCleared(st, req.dungeon)) return false;
    return true;
  };
  R.structState = function (st, id) {
    if (st.struct[id]) return 'restored';
    return R.reqMet(st, A.Data.BUILDINGS[id].req) ? 'available' : 'hidden';
  };
  R.restore = (st, id) => A.World.restore(st, id);

  /* ---------- habitats (passive production) — delegated to world.js ---------- */
  R.residentOf = (st, id) => A.World.residentOf(st, st.buildings[id]);
  R.perTick = (st, id) => (st.buildings[id] ? A.World.perMin(st, st.buildings[id]) : 0);
  R.tickHabitats = function (st, now) { A.World.tick(st, now); A.World.tickProduction(st, now); };
  R.stockOf = (st, id) => A.World.stock(st, id);
  R.collect = (st, id) => A.World.collect(st, id);
  R.assign = function (st, id, uid) {
    if (uid === null) { const b = st.buildings[id]; if (!b) return { ok: false, reason: 'invalid' }; A.World.tickProduction(st); b.residents = []; return { ok: true }; }
    if (id === 'hollow') { const b = st.buildings.hollow; if (b && A.World.capacity(b) <= 1) return { ok: false, reason: 'invalid' }; }
    return A.World.assign(st, id, uid);
  };

  /* ---------- missions: see quests.js (structured quests + navigation); aliases are installed there ---------- */

  /* ---------- exploration ---------- */
  R.areaUnlocked = (st, id) => R.reqMet(st, D.AREAS[id].unlock);
  const AREA_LV = { meadow: 2, tidepools: 3, emberridge: 4, duskgrove: 4, windbluff: 6, driftisle: 6 };
  R.explore = function (st, id) {
    const a = D.AREAS[id];
    if (!a) return { ok: false, reason: 'invalid' };
    if (!R.areaUnlocked(st, id)) return { ok: false, reason: 'locked' };
    if (st.pendingFind) return { ok: true, type: 'pending', find: st.pendingFind };
    const n = st.stats.explores[id] || 0;
    const step = a.steps[n];
    st.stats.explores[id] = n + 1;
    if (step && step[0] === 'find') {
      if (st.owned[step[1]]) { // already have it (e.g. hatched): small bonus instead
        const g = 15 + Math.floor(R.rng() * 10); R.addRes(st, { gold: g });
        return { ok: true, type: 'res', gold: g, food: 0, note: 'known' };
      }
      st.pendingFind = { area: id, sp: step[1] };
      st.seen[step[1]] = true;
      R.emit('found', { sp: step[1], area: id });
      return { ok: true, type: 'find', find: st.pendingFind, cost: D.BEFRIEND_COST };
    }
    let gold, food;
    if (step) { gold = step[1] + Math.floor(R.rng() * 6); food = step[2]; }
    else { gold = 3 + Math.floor(R.rng() * 6); food = 2 + Math.floor(R.rng() * 4); }
    R.addRes(st, { gold, food });
    R.emit('explored', { id, gold, food });
    return { ok: true, type: 'res', gold, food };
  };
  R.befriend = function (st) {
    const f = st.pendingFind;
    if (!f) return { ok: false, reason: 'none' };
    if (st.res.food < D.BEFRIEND_COST) return { ok: false, reason: 'food', need: D.BEFRIEND_COST - st.res.food };
    st.res.food -= D.BEFRIEND_COST;
    const inst = R.addAmina(st, f.sp, AREA_LV[f.area] || 2);
    st.pendingFind = null;
    return { ok: true, inst };
  };
  R.letGo = function (st) { /* declining keeps the Amina waiting; nothing changes */ return { ok: true }; };

  /* ---------- World Resonance events ---------- */
  R.disturbanceVisible = (st) => !!st.struct.tidegate && !st.flags.r1;
  R.investigate = function (st) {
    if (!st.struct.tidegate || st.flags.r1) return { ok: false };
    st.flags.r1 = true;
    R.addAmina(st, 'aimza', 3);
    R.addRes(st, { gold: 30 });
    R.gainRankXp(st, 25);
    R.emit('resonance', { id: 'r1' });
    return { ok: true };
  };
  R.awakenSpire = function (st) {
    if (!st.pendingR2 || st.flags.r2) return { ok: false };
    st.pendingR2 = false; st.flags.r2 = true;
    const other = st.starter === 'lumifern' ? 'umbrit' : 'lumifern';
    const evo = st.starter === 'lumifern' ? 'duskmantle' : 'solarbloom';
    if (!st.owned[other] && !st.owned[evo]) R.addAmina(st, other, 3);
    R.gainRankXp(st, 25);
    R.emit('resonance', { id: 'r2' });
    return { ok: true };
  };
  R.examineStone = function (st) {
    if (!st.flags.r2 || st.flags.stone) return { ok: false };
    st.flags.stone = true;
    R.gainRankXp(st, 25);
    R.emit('resonance', { id: 'stone' });
    return { ok: true };
  };

  /* ---------- breeding ---------- */
  R.recipeFor = function (elA, elB) {
    const key = [elA, elB].sort().join('+');
    if (D.BREED[key]) return Object.assign({ key }, D.BREED[key]);
    if ((elA === 'resonance') !== (elB === 'resonance')) return { key, sp: D.RESONANCE_CHILD, locked: true };
    return null;
  };
  // v0.7: the hatchery has one breeding slot per level (each upgrade adds exactly one). Slots run independently.
  R.hatcheryLevel = (st) => { const h = st.buildings && st.buildings.hatchery; return st.struct.hatchery && h ? Math.max(1, h.level | 0) : 0; };
  R.eggSlots = (st) => Math.min(D.MAX_EGG_SLOTS, R.hatcheryLevel(st));
  R.eggs = (st) => (st.eggs = Array.isArray(st.eggs) ? st.eggs : []);
  R.eggIn = (st, slot) => R.eggs(st).find((e) => e && e.slot === slot) || null;
  R.freeSlot = function (st) { for (let i = 0; i < R.eggSlots(st); i++) if (!R.eggIn(st, i)) return i; return -1; };
  // parents incubating in another slot can still breed (they are not consumed); the same pair just can't be used twice at once
  R.breedCheck = function (st, uidA, uidB, slot) {
    const a = R.inst(st, uidA), b = R.inst(st, uidB);
    if (!st.struct.hatchery) return { ok: false, reason: 'noHatchery' };
    if (slot == null) slot = R.freeSlot(st);
    if (slot < 0 || slot >= R.eggSlots(st)) return { ok: false, reason: R.freeSlot(st) < 0 ? 'egg' : 'slot' };
    if (R.eggIn(st, slot)) return { ok: false, reason: 'egg' };
    if (!a || !b) return { ok: false, reason: 'pick' };
    if (a.uid === b.uid) return { ok: false, reason: 'same' };
    if (a.lv < D.BREED_MIN_LEVEL || b.lv < D.BREED_MIN_LEVEL) return { ok: false, reason: 'level' };
    const r = R.recipeFor(sp(a.sp).el, sp(b.sp).el);
    if (!r) return { ok: false, reason: 'incompat' };
    if (r.locked && !st.flags.r2) return { ok: false, reason: 'locked' };
    if (!R.canAfford(st, D.BREED_COST)) return { ok: false, reason: 'cost' };
    return { ok: true, sp: r.sp, key: r.key, slot };
  };
  R.startBreed = function (st, uidA, uidB, slot) {
    const c = R.breedCheck(st, uidA, uidB, slot);
    if (!c.ok) return c;
    const a = R.inst(st, uidA), b = R.inst(st, uidB);
    if (!A.Economy.spend(st, D.BREED_COST).ok) return { ok: false, reason: 'cost' };
    const secs = Math.max(5, Math.round((D.EGG_SECONDS[st.settings.eggSpeed] || D.EGG_SECONDS.fast) * A.World.eggTimeFactor(st)));
    const now = R.now();
    R.eggs(st).push({ slot: c.slot, sp: c.sp, parents: [a.sp, b.sp], startedAt: now, readyAt: now + secs * 1000 });
    st.recipes = st.recipes || {};
    st.recipes[c.key] = c.sp;
    R.emit('eggStart', { sp: c.sp, slot: c.slot });
    return { ok: true, sp: c.sp, slot: c.slot };
  };
  R.eggStatus = function (st, now, slot) {
    const e = slot == null ? R.eggs(st)[0] : R.eggIn(st, slot);
    if (!e) return null;
    now = now || R.now();
    const total = e.readyAt - e.startedAt, left = Math.max(0, e.readyAt - now);
    return { slot: e.slot, sp: e.sp, ready: left === 0, left, progress: total > 0 ? 1 - left / total : 1 };
  };
  R.eggsReady = (st, now) => R.eggs(st).filter((e) => e.readyAt <= (now || R.now())).length;
  R.hatch = function (st, now, slot) {
    if (slot == null) { const r = R.eggs(st).find((e) => e.readyAt <= (now || R.now())); if (!r) return { ok: false }; slot = r.slot; }
    const s = R.eggStatus(st, now, slot);
    if (!s || !s.ready) return { ok: false };
    const e = R.eggIn(st, slot), spId = e.sp;
    const inst = R.addAmina(st, spId, 1);
    if (!inst) return { ok: false, reason: 'full' };   // the egg stays in its slot until there is room
    st.eggs = R.eggs(st).filter((x) => x !== e);
    st.stats.hatched++;
    R.gainRankXp(st, 15);
    R.emit('hatched', { sp: spId, uid: inst.uid, slot });
    return { ok: true, inst, slot };
  };

  /* ---------- equipment ---------- */
  // Items are owned instances {iid, id} in st.items. inst.gear = {weapon, armour, charm} holds iids.
  // An item instance is worn by at most one Amina. Bonuses are percentages, applied once when a fighter is created.
  R.gearOf = (inst) => (inst.gear = inst.gear || { weapon: null, armour: null, charm: null });
  R.items = (st) => (st.items = Array.isArray(st.items) ? st.items : []);
  R.item = (st, iid) => R.items(st).find((x) => x.iid === iid) || null;
  R.wearer = (st, iid) => st.aminas.find((a) => a.gear && Object.keys(a.gear).some((k) => a.gear[k] === iid)) || null;
  R.grantItem = function (st, id, source) {
    const d = D.ITEMS[id]; if (!d) return null;
    if (d.unique && R.items(st).some((x) => x.id === id)) { A.Economy.gain(st, { gold: d.dupGold || 100 }); R.emit('itemDup', { id, gold: d.dupGold || 100 }); return null; }
    st.nextIid = Math.max(st.nextIid | 0, 1);
    const it = { iid: st.nextIid++, id, from: source || null, at: R.now() };
    R.items(st).push(it);
    R.emit('item', { id, iid: it.iid, source });
    return it;
  };
  R.equip = function (st, uid, iid) {
    const inst = R.inst(st, uid), it = R.item(st, iid);
    if (!inst || !it) return { ok: false, reason: 'invalid' };
    if (st.run && (st.run.uids || []).indexOf(uid) >= 0) return { ok: false, reason: 'busy' };
    const slot = D.ITEMS[it.id].slot, prev = R.wearer(st, iid);
    if (prev && prev.uid !== uid && st.run && (st.run.uids || []).indexOf(prev.uid) >= 0) return { ok: false, reason: 'busy' };
    if (prev) Object.keys(prev.gear).forEach((k) => { if (prev.gear[k] === iid) prev.gear[k] = null; });
    R.gearOf(inst)[slot] = iid;
    R.emit('equip', { uid, iid, slot });
    return { ok: true, slot, movedFrom: prev && prev.uid !== uid ? prev.uid : null };
  };
  R.unequip = function (st, uid, slot) {
    const inst = R.inst(st, uid); if (!inst) return { ok: false, reason: 'invalid' };
    if (st.run && (st.run.uids || []).indexOf(uid) >= 0) return { ok: false, reason: 'busy' };
    const g = R.gearOf(inst); if (!g[slot]) return { ok: false, reason: 'empty' };
    g[slot] = null; R.emit('unequip', { uid, slot });
    return { ok: true };
  };
  // Total bonus (fractions) from everything an Amina wears.
  R.gearBonus = function (st, inst) {
    const out = { hp: 0, atk: 0, def: 0, spd: 0 };
    if (!st || !inst || !inst.gear) return out;
    Object.keys(inst.gear).forEach((k) => { const it = inst.gear[k] != null && R.item(st, inst.gear[k]); const d = it && D.ITEMS[it.id]; if (d && d.slot === k) Object.keys(d.bonus).forEach((s) => (out[s] += d.bonus[s])); });
    return out;
  };
  // A party fighter for an owned Amina, with its equipment applied exactly once.
  R.partyFighter = function (st, inst, opts) {
    return B.fighter(inst.sp, inst.lv, Object.assign({ uid: inst.uid, gear: R.gearBonus(st, inst), mvl: R.moveLevels ? R.moveLevels(inst) : null }, opts || {}));
  };
  R.statsWithGear = function (st, inst) {
    const b = R.statsAt(inst.sp, inst.lv), g = R.gearBonus(st, inst);
    return { hp: Math.round(b.hp * (1 + g.hp)), atk: Math.round(b.atk * (1 + g.atk)), def: Math.round(b.def * (1 + g.def)), spd: Math.round(b.spd * (1 + g.spd)) };
  };

  /* ---------- battle ---------- */
  const DIV = 16;
  R.elMult = function (att, def) {
    if (D.STRONG[att] && D.STRONG[att].indexOf(def) >= 0) return 1.5;
    if (D.STRONG[def] && D.STRONG[def].indexOf(att) >= 0) return 1 / 1.5;
    return 1;
  };
  R.effLabel = (m) => (m > 1.01 ? 'super' : m < 0.99 ? 'weak' : 'normal');

  const B = (R.Battle = {});
  B.fighter = function (spId, lv, opts) {
    opts = opts || {};
    const s = sp(spId), st = R.statsAt(spId, lv), g = opts.gear || { hp: 0, atk: 0, def: 0, spd: 0 };
    ['hp', 'atk', 'def', 'spd'].forEach((k) => (st[k] = Math.round(st[k] * (1 + (g[k] || 0)))));  // equipment, applied once here
    const hpMax = Math.round(st.hp * (opts.hpMult || 1));
    const f = { sp: spId, uid: opts.uid || null, name: opts.name || s.name, lv, el: s.el, hpMax,
      hp: opts.hp != null ? Math.max(0, Math.min(hpMax, Math.round(opts.hp))) : hpMax,
      atk: st.atk, def: st.def, spd: st.spd, abil: s.abil.slice(), cd: {}, weak: 0, guard: false, st: {}, boost: 1, gear: !!opts.gear, mvl: opts.mvl || {} };
    f.abil.forEach((a) => (f.cd[a] = 0));
    return f;
  };
  // Team synergies come from the elements of the whole party (see D.SYNERGIES).
  R.synergies = function (els) {
    const n = {}; els.forEach((e) => (n[e] = (n[e] || 0) + 1));
    const out = [];
    if (Object.keys(n).some((k) => n[k] >= 2)) out.push('kindred');
    if (n.light && n.dark) out.push('twilight');
    if (n.fire && n.water && n.nature) out.push('triangle');
    return out;
  };
  B.create = function (party, enemy, opts) {
    const syn = R.synergies(party.map((p) => p.el)), cnt = {};
    party.forEach((p) => (cnt[p.el] = (cnt[p.el] || 0) + 1));
    party.forEach((p) => {
      p.boost = 1;
      if (syn.indexOf('kindred') >= 0 && cnt[p.el] >= 2) p.boost *= D.SYNERGIES.kindred.atk;
      if (syn.indexOf('triangle') >= 0) p.boost *= D.SYNERGIES.triangle.atk;
    });
    // one foe (dungeons) or a team of foes (PvP, raids): the next foe steps in when the current one faints
    const foes = Array.isArray(enemy) ? enemy : [enemy];
    foes.forEach((f) => { if (f.move && f.chargeIn == null) f.chargeIn = 1; });
    return { party, pi: Math.max(0, party.findIndex((p) => p.hp > 0)), foes, ei: 0, enemy: foes[0], turn: 1, over: false, result: null,
      pending: false, rng: (opts && opts.rng) || R.rng, syn };
  };
  B.cur = (b) => b.party[b.pi];
  B.damage = function (att, def, ab, rng) {
    const eff = ab.neutral ? 1 : R.elMult(ab.el, def.el);
    const stab = ab.el === att.el ? 1.2 : 1;
    const A_ = att.atk * (att.boost || 1) * (1 - 0.2 * Math.min(3, att.weak));
    const base = ((2 * att.lv / 5 + 2) * ab.power * A_ / Math.max(1, def.def)) / DIV + 2;
    const rand = 0.92 + rng() * 0.16;
    // a guard lets through half a hit (less with an upgraded guard move); a guardian move is three-quarters blocked
    let dmg = Math.max(1, Math.round(base * stab * eff * rand * (def.guard ? (ab.boss ? 0.25 : (typeof def.guard === 'number' ? def.guard : 0.5)) : 1)));
    return { dmg, eff };
  };
  B.ready = (f, id) => f.cd[id] === 0;
  // Silence blocks every ability with a cooldown (the "special" ones); basic abilities stay usable.
  B.silenced = (f, id) => !!(f.st && f.st.silence > 0 && D.ABILITIES[id].cd > 0);
  B.usable = (f, id) => B.ready(f, id) && !B.silenced(f, id);
  B.speed = (f) => f.spd * (f.st && f.st.soak > 0 ? D.STATUS_RULES.soak : 1);

  // Applies a status effect. Guardians cannot be stunned; a stun that lands while one is charging staggers it
  // instead (the charge is broken and it loses its next action).
  function applyFx(b, f, fx, who, ev) {
    if (fx.p < 1 && b.rng() >= fx.p) return;
    if (fx.k === 'stun' && f.boss) {
      if (f.charging) { f.charging = false; f.st.stun = 1; f.chargeIn = 2; ev.push({ t: 'stagger', who }); }
      else ev.push({ t: 'resist', who, k: 'stun' });
      return;
    }
    const had = f.st[fx.k] > 0;
    f.st[fx.k] = Math.max(f.st[fx.k] || 0, fx.n);
    ev.push({ t: 'status', who, k: fx.k, n: f.st[fx.k], refresh: had });
  }

  function doAbility(b, who, ev) {
    const att = who === 'p' ? B.cur(b) : b.enemy, def = who === 'p' ? b.enemy : B.cur(b), foe = who === 'p' ? 'e' : 'p';
    return function (id) {
      const ab0 = D.ABILITIES[id], mlv = (att.mvl && att.mvl[id]) || 1, MV = D.MOVE_LEVELS;
      // Dev 8: an upgraded move (levels 1-5) hits harder, guards better or heals more. Level 1 is the original move.
      const ab = mlv > 1 && MV && ab0.power ? Object.assign({}, ab0, { power: Math.round(ab0.power * MV.power[mlv]) }) : ab0;
      att.cd[id] = ab.cd;
      ev.push({ t: 'use', who, name: att.name, abil: id, abName: ab.name, el: ab.el, boss: !!ab.boss, lv: mlv });
      if (ab.boss) { att.charging = false; att.chargeIn = att.hp < att.hpMax * 0.5 ? 1 : 2; }
      if (ab.type === 'guard') { att.guard = mlv > 1 && MV ? 1 - MV.guard[mlv] : true; ev.push({ t: 'guard', who, lv: mlv }); return; }
      if (ab.type === 'heal') {
        const amt = Math.min(att.hpMax - att.hp, Math.round(att.hpMax * (MV ? MV.heal[mlv] : 0.25)));
        att.hp += amt; ev.push({ t: 'heal', who, amt, hp: att.hp });
        if (ab.fx) applyFx(b, att, ab.fx, who, ev);
        return;
      }
      const r = B.damage(att, def, ab, b.rng);
      let dmg = r.dmg;
      // a barrier soaks damage first; special abilities (with a cooldown) crack it twice as fast
      if (def.shield > 0) {
        const special = ab.cd > 0 || !!ab.boss, toShield = special ? dmg * 2 : dmg, broke = toShield >= def.shield;
        const absorbed = Math.min(def.shield, toShield); def.shield -= absorbed;
        dmg = broke ? Math.round((toShield - absorbed) / (special ? 2 : 1)) : 0;
        ev.push({ t: 'shieldHit', who: foe, absorbed, shield: def.shield, max: def.shieldMax, broke, special });
      }
      def.hp = Math.max(0, def.hp - dmg);
      const hadGuard = def.guard; def.guard = false;
      ev.push({ t: 'hit', who: foe, dmg, eff: R.effLabel(r.eff), hp: def.hp, guarded: hadGuard, el: ab.el, big: !!ab.boss, blocked: dmg === 0 });
      thresholds(def, foe, ev);
      if (ab.type === 'drain') {
        const amt = Math.min(att.hpMax - att.hp, Math.ceil(r.dmg / 2));
        if (amt > 0) { att.hp += amt; ev.push({ t: 'heal', who, amt, hp: att.hp }); }
      }
      if (ab.type === 'weaken' && def.hp > 0 && def.weak < 3) { def.weak++; ev.push({ t: 'weak', who: foe }); }
      if (ab.fx && def.hp > 0) applyFx(b, ab.fx.self ? att : def, ab.fx, ab.fx.self ? who : foe, ev);
      if (ab.after === 'guard' && att.hp > 0) { att.guard = true; ev.push({ t: 'guard', who }); }
    };
  }
  // End of a full turn: burn and regen tick on the two active fighters, then timed effects count down.
  function endOfTurn(b, ev) {
    const SR = D.STATUS_RULES;
    [['p', B.cur(b)], ['e', b.enemy]].forEach(([who, f]) => {
      if (f.hp <= 0) return;
      if (f.st.burn > 0) { const dmg = Math.max(1, Math.round(f.hpMax * SR.burn)); f.hp = Math.max(0, f.hp - dmg); ev.push({ t: 'dot', who, k: 'burn', dmg, hp: f.hp }); thresholds(f, who, ev); }
      const twi = who === 'p' && b.syn && b.syn.indexOf('twilight') >= 0;
      const rate = (f.st.regen > 0 ? SR.regen : 0) + (twi ? SR.twilight : 0);
      if (rate && f.hp > 0 && f.hp < f.hpMax) { const amt = Math.min(f.hpMax - f.hp, Math.max(1, Math.round(f.hpMax * rate))); f.hp += amt; ev.push({ t: 'heal', who, amt, hp: f.hp, k: f.st.regen > 0 ? 'regen' : 'twilight' }); }
      ['burn', 'soak', 'regen', 'silence'].forEach((k) => { if (f.st[k] > 0) { f.st[k]--; if (!f.st[k]) { delete f.st[k]; ev.push({ t: 'statusEnd', who, k }); } } });
    });
    const e = b.enemy; if (e.move && !e.charging && e.hp > 0) e.chargeIn--;
    if (e.mech && e.mech.type === 'prism' && e.hp > 0) {
      const m = e.mech, next = m.els[(e.prismI + 1) % m.els.length];
      e.prismT = (e.prismT || 0) + 1;
      if (e.prismT === m.every - 1) ev.push({ t: 'prismWarn', who: 'e', el: next });
      if (e.prismT >= m.every) { e.prismT = 0; e.prismI = (e.prismI + 1) % m.els.length; e.el = next; ev.push({ t: 'prismShift', who: 'e', el: next, name: e.name }); }
    }
    checkEnd(b, ev);
  }
  // Boss health thresholds: crossing one makes a barrier boss raise its barrier on its next action (announced now).
  function thresholds(f, who, ev) {
    if (!f.mech || f.mech.type !== 'barrier' || f.hp <= 0) return;
    f.mechDone = f.mechDone || [];
    f.mech.at.forEach((t, i) => { if (!f.mechDone[i] && f.hp <= f.hpMax * t) { f.mechDone[i] = true; f.barrierDue = true; ev.push({ t: 'barrierTell', who, name: f.name }); } });
  }

  B.enemyChoice = function (b) {
    const e = b.enemy, p = B.cur(b), opts = e.abil.filter((a) => B.usable(e, a));
    // guardians telegraph: one turn charging, then the move lands on the next
    if (e.move && e.charging) return e.move;
    if (e.barrierDue) return 'barrier';
    if (e.move && e.chargeIn <= 0) return 'charge';
    const low = e.hp < e.hpMax * 0.35;
    const util = opts.filter((a) => ['guard', 'heal'].indexOf(D.ABILITIES[a].type) >= 0);
    if (low && util.length && b.rng() < 0.4) return util[0];
    const dmgs = opts.filter((a) => ['guard', 'heal'].indexOf(D.ABILITIES[a].type) < 0);
    if (!dmgs.length) return opts[0] || e.abil[0];
    const special = dmgs.filter((a) => D.ABILITIES[a].cd > 0);
    if (special.length && b.rng() < 0.65) return special[0];
    const basics = dmgs.filter((a) => D.ABILITIES[a].cd === 0);
    return (basics[0] || dmgs[0]);
  };

  B.legal = function (b) {
    const f = B.cur(b);
    return f.abil.map((id) => ({ id, ready: B.usable(f, id), cd: f.cd[id], silenced: B.silenced(f, id) }));
  };
  B.alive = (b) => b.party.filter((p) => p.hp > 0).length;
  B.foesLeft = (b) => b.foes.filter((f) => f.hp > 0).length;
  // A sensible move for the player's side when the computer plays it (defence simulation, tests, auto-battle).
  B.autoAction = function (b) {
    if (b.pending) { const i = b.party.findIndex((p) => p.hp > 0); return { t: 'sw', to: i }; }
    const p = B.cur(b), e = b.enemy, legal = B.legal(b).filter((x) => x.ready);
    if (e.charging) { const g = legal.find((x) => D.ABILITIES[x.id].type === 'guard'); if (g) return { t: 'ab', id: g.id }; }
    if (p.hp < p.hpMax * 0.3) { const h = legal.find((x) => D.ABILITIES[x.id].type === 'heal'); if (h) return { t: 'ab', id: h.id }; }
    const score = (id) => { const ab = D.ABILITIES[id]; if (!ab.power) return -1; return ab.power * (ab.neutral ? 1 : R.elMult(ab.el, e.el)) * (ab.el === p.el ? 1.2 : 1) * (e.shield > 0 && ab.cd > 0 ? 2 : 1); };
    const best = legal.slice().sort((a, c) => score(c.id) - score(a.id))[0];
    return { t: 'ab', id: (best || legal[0] || { id: p.abil[0] }).id };
  };

  function checkEnd(b, ev) {
    if (b.enemy.hp <= 0) {
      ev.push({ t: 'faint', who: 'e' });
      const nx = b.foes.findIndex((f) => f.hp > 0);
      if (nx >= 0) { b.ei = nx; b.enemy = b.foes[nx]; ev.push({ t: 'foeIn', idx: nx, name: b.enemy.name, sp: b.enemy.sp, hp: b.enemy.hp, hpMax: b.enemy.hpMax, el: b.enemy.el, lv: b.enemy.lv }); return true; }
      b.over = true; b.result = 'win'; ev.push({ t: 'end', result: 'win' }); return true;
    }
    if (B.cur(b).hp <= 0) {
      ev.push({ t: 'faint', who: 'p' });
      if (B.alive(b) === 0) { b.over = true; b.result = 'lose'; ev.push({ t: 'end', result: 'lose' }); return true; }
      b.pending = true; ev.push({ t: 'needSwitch' });
      return true;
    }
    return false;
  }

  // action: {t:'ab', id} | {t:'sw', to}
  B.act = function (b, action) {
    const ev = [];
    if (b.over) return ev;
    const doSwitch = (to) => {
      const t = b.party[to];
      if (!t || t.hp <= 0 || to === b.pi) return false;
      const out = B.cur(b); if (out.st && Object.keys(out.st).length) out.st = {}; // switching out clears status effects
      b.pi = to; ev.push({ t: 'switch', who: 'p', name: t.name, idx: to, hp: t.hp, sp: t.sp });
      return true;
    };
    if (b.pending) {
      if (action.t === 'sw' && doSwitch(action.to)) b.pending = false;
      return ev;
    }
    const p = B.cur(b), e = b.enemy;
    if (action.t === 'ab' && !(p.abil.indexOf(action.id) >= 0 && B.usable(p, action.id))) return ev;
    if (action.t === 'sw' && !doSwitch(action.to)) return ev;
    const eId = B.enemyChoice(b);
    const order = [];
    if (action.t === 'ab') {
      if (B.speed(p) >= B.speed(e)) order.push(['p', action.id], ['e', eId]); else order.push(['e', eId], ['p', action.id]);
    } else order.push(['e', eId]);
    for (const [who, id] of order) {
      if (b.over || b.pending) break;
      const fighter = who === 'p' ? B.cur(b) : b.enemy;
      if (fighter.hp <= 0) continue;
      if (fighter.st.stun > 0) { fighter.st.stun = 0; delete fighter.st.stun; ev.push({ t: 'stunned', who, name: fighter.name, stagger: !!fighter.boss }); continue; }
      if (id === 'barrier') { fighter.barrierDue = false; fighter.shield = fighter.shieldMax = Math.max(1, Math.round(fighter.hpMax * (fighter.mech.amt || 0.2))); ev.push({ t: 'barrier', who, name: fighter.name, shield: fighter.shield }); continue; }
      if (id === 'charge') { fighter.charging = true; const mv = D.ABILITIES[fighter.move]; ev.push({ t: 'charge', who, name: fighter.name, move: fighter.move, abName: mv.name, el: mv.el, tell: mv.tell }); continue; }
      if (who === 'e' && fighter.move && id === fighter.move && !fighter.charging) continue; // charge was broken
      doAbility(b, who, ev)(id);
      if (checkEnd(b, ev)) break;
    }
    if (!b.over && !b.pending) endOfTurn(b, ev);
    if (!b.over && !b.pending) {
      [B.cur(b), b.enemy].forEach((f) => Object.keys(f.cd).forEach((k) => { if (f.cd[k] > 0) f.cd[k]--; }));
      b.turn++;
    } else if (b.pending) {
      [b.enemy].forEach((f) => Object.keys(f.cd).forEach((k) => { if (f.cd[k] > 0) f.cd[k]--; }));
    }
    return ev;
  };

  /* ---------- campaign: islands, dungeons, battles ----------
     An island has ten dungeons (D.CAMPAIGN); a dungeon has ten battles (battle 10 is its boss). Dungeons open in order.
     Progress is kept per battle: losing never advances, and the next attempt starts at the battle that was lost.
     Clearing the tenth dungeon defeats the Island Boss, which unlocks the next island exactly once. */
  const NB = () => D.BATTLES_PER_DUNGEON;
  R.dungeonCleared = (st, id) => !!(st.dungeon && st.dungeon[id] && st.dungeon[id].clears > 0);
  R.dungeonRec = function (st, id) {
    const rec = (st.dungeon[id] = st.dungeon[id] || { clears: 0 });
    const d = D.DUNGEONS[id], n = d ? d.sections.length : 0;
    rec.clears = Math.max(0, rec.clears | 0);
    if (!Array.isArray(rec.floors)) rec.floors = [];
    for (let i = 0; i < n; i++) if (rec.floors[i] == null) rec.floors[i] = rec.clears > 0;
    rec.floors.length = Math.max(rec.floors.length, n);
    rec.next = rec.clears > 0 ? 0 : Math.max(0, Math.min(NB() - 1, rec.next | 0));
    return rec;
  };
  R.dungeonUnlocked = function (st, id) {
    const d = D.DUNGEONS[id];
    if (!d || !d.playable) return false;
    if (R.dungeonCleared(st, id)) return true; // anything already cleared stays open (also for older saves)
    if (d.island && A.World && !A.World.islandUnlocked(st, d.island)) return false;
    if (d.prev && !R.dungeonCleared(st, d.prev)) return false;
    return R.reqMet(st, d.unlock);
  };
  // Why a dungeon is locked, as a requirement the navigation can act on: {dungeon} | {struct} | {flag} | {rank} | {island}
  R.dungeonBlocker = function (st, id) {
    const d = D.DUNGEONS[id];
    if (!d || R.dungeonUnlocked(st, id)) return null;
    if (d.island && A.World && !A.World.islandUnlocked(st, d.island)) return { island: d.island };
    if (d.prev && !R.dungeonCleared(st, d.prev)) return { dungeon: d.prev };
    return (A.World && A.World.unmetReq(st, d.unlock)) || d.unlock;
  };
  R.dungeonLockText = function (st, id) {
    const bl = R.dungeonBlocker(st, id), d = D.DUNGEONS[id];
    if (!bl) return '';
    if (bl.island) return 'Unlock ' + D.ISLANDS[bl.island].name + ' first.';
    if (bl.dungeon) return 'Clear ' + D.DUNGEONS[bl.dungeon].name.replace(/^The /, 'the ') + ' first.';
    return d.unlockText || 'Not open yet.';
  };
  // locked | available | inprogress | completed
  R.dungeonState = function (st, id) {
    if (R.dungeonCleared(st, id)) return 'completed';
    if (!R.dungeonUnlocked(st, id)) return 'locked';
    const rec = R.dungeonRec(st, id);
    return rec.next > 0 || (st.run && st.run.d === id) ? 'inprogress' : 'available';
  };
  R.islandBossDefeated = function (st, iid) {
    const c = D.CAMPAIGN[iid];
    return !!((st.campaign && st.campaign.bosses && st.campaign.bosses[iid]) || (c && c.islandBoss && R.dungeonCleared(st, c.islandBoss)));
  };
  R.islandProgress = function (st, iid) {
    const c = D.CAMPAIGN[iid] || { dungeons: [] };
    const cleared = c.dungeons.filter((id) => R.dungeonCleared(st, id)).length;
    const battles = c.dungeons.reduce((n, id) => n + (R.dungeonCleared(st, id) ? NB() : R.dungeonRec(st, id).next), 0);
    const current = c.dungeons.find((id) => !R.dungeonCleared(st, id)) || null;
    return { cleared, total: c.dungeons.length, battles, battlesTotal: c.dungeons.length * NB(), current, boss: R.islandBossDefeated(st, iid) };
  };
  R.unlockLore = function (st, key) {
    if (!D.LORE[key] || (st.lore && st.lore[key])) return false;
    st.lore = st.lore || {}; st.lore[key] = Date.now() || 1; R.emit('lore', { key }); return true;
  };
  R.defaultParty = function (st) {
    const sorted = st.aminas.slice().sort((a, b) => b.lv - a.lv);
    const out = [];
    const act = R.active(st);
    if (act) out.push(act.uid);
    sorted.forEach((a) => { if (out.length < 3 && out.indexOf(a.uid) < 0) out.push(a.uid); });
    return out;
  };
  const cleanUids = (st, uids, n) => (uids || []).filter((u, i, a) => R.inst(st, u) && a.indexOf(u) === i).slice(0, n);
  R.cleanUids = cleanUids;
  // opts.from: replays of a cleared dungeon may start at any battle; a first run always continues where it stopped.
  R.startRun = function (st, id, uids, opts) {
    if (!R.dungeonUnlocked(st, id)) return { ok: false, reason: 'locked' };
    uids = cleanUids(st, uids, 3);
    if (!uids.length) return { ok: false, reason: 'party' };
    const rec = R.dungeonRec(st, id);
    const start = rec.clears > 0 ? Math.max(0, Math.min(NB() - 1, (opts && opts.from) | 0)) : rec.next;
    const hp = {};
    uids.forEach((u) => { const i = R.inst(st, u); hp[u] = R.statsWithGear(st, i).hp; });
    st.run = { d: id, battle: start, start, uids, hp, gold: 0, food: 0 };
    st.party = uids.slice();
    return { ok: true, battle: start };
  };
  R.sectionOf = (d, i) => Math.max(0, d.sections.findIndex((s) => i >= s.from && i <= s.to));
  R.encounter = function (st) {
    const run = st.run; if (!run) return null;
    const d = D.DUNGEONS[run.d]; if (!d) return null;
    const spec = d.battles[run.battle]; if (!spec) return null;
    const si = R.sectionOf(d, run.battle), sc = d.sections[si];
    return { dungeon: run.d, battle: run.battle, battles: d.battles.length, spec, section: si, sectionName: sc.name, sections: d.sections.length,
      floor: si, floors: d.sections.length, floorName: sc.name, boss: !!spec.boss, islandBoss: !!spec.islandBoss };
  };
  // Builds an enemy fighter from a battle spec (dungeons, survival champions).
  R.enemyFromSpec = function (spec) {
    const e = B.fighter(spec.sp, spec.lv, { name: spec.title || null, hpMult: spec.hpMult });
    if (spec.boss) e.boss = true;
    if (spec.islandBoss) e.islandBoss = true;
    if (spec.move) { e.move = spec.move; e.chargeIn = 1; }
    if (spec.mech) {
      e.mech = JSON.parse(JSON.stringify(spec.mech));
      if (e.mech.type === 'prism') { e.prismI = 0; e.prismT = 0; e.el = e.mech.els[0]; }
      if (e.mech.type === 'barrier') { e.mechDone = []; e.shield = 0; }
    }
    e.scale = spec.scale || (spec.boss ? 1.3 : 1);
    return e;
  };
  R.createBattle = function (st, rng) {
    const run = st.run, enc = R.encounter(st);
    const party = run.uids.map((u) => R.partyFighter(st, R.inst(st, u), { hp: run.hp[u] }));
    st.seen[enc.spec.sp] = true;
    return B.create(party, R.enemyFromSpec(enc.spec), { rng });
  };
  // xp and carry-over health for a won battle (shared by dungeons and survival)
  function partyAfterWin(st, b, baseXp, hpStore, heal) {
    const xp = [];
    b.party.forEach((f) => {
      const inst = R.inst(st, f.uid); if (!inst) return;
      const alive = f.hp > 0;
      const r = R.addXp(st, inst, alive ? baseXp : Math.round(baseXp / 2));
      xp.push({ uid: f.uid, sp: inst.sp, gained: r.gained, levels: r.levels, evolved: r.evolved, evoReady: r.evoReady, alive });
      const hpMax = R.statsWithGear(st, inst).hp;
      const prev = alive ? f.hp : Math.round(hpMax * 0.2);
      hpStore[f.uid] = Math.max(1, Math.min(hpMax, prev + (alive ? Math.round(hpMax * heal) : 0)));
    });
    return xp;
  }
  R.resolveBattle = function (st, b) {
    const run = st.run;
    if (!run || !b.over) return { win: false, invalid: true };
    const d = D.DUNGEONS[run.d], idx = run.battle, spec = d.battles[idx], rec = R.dungeonRec(st, run.d), wasCleared = rec.clears > 0;
    const out = { win: b.result === 'win', cleared: false, xp: [], gold: 0, food: 0, newSp: [], first: false, boss: !!spec.boss, islandBoss: !!spec.islandBoss,
      battle: idx, battles: d.battles.length, dungeon: run.d, sectionDone: null, sectionFirst: null, unlockedIsland: null, scene: null, lore: [] };
    if (!out.win) {
      // a defeat never advances the dungeon: the next attempt starts at this same battle
      st.run = null; st.stats.losses++;
      R.addRes(st, { food: 5 }); out.food = 5;
      R.emit('dungeonLose', { d: run.d, battle: idx });
      return out;
    }
    st.stats.wins++; R.emit('battleWon', { d: run.d, boss: !!spec.boss, battle: idx });
    const baseXp = Math.round((20 + spec.lv * 6) * (spec.boss ? 1.5 : 1));
    out.gold = 10 + spec.lv * 3 + (spec.boss ? 20 : 0); out.food = 4 + (spec.boss ? 6 : 0);
    R.addRes(st, { gold: out.gold, food: out.food });
    run.gold += out.gold; run.food += out.food;
    out.xp = partyAfterWin(st, b, baseXp, run.hp, 0.4);
    R.gainRankXp(st, spec.boss ? 15 : 8);
    run.battle = idx + 1;
    if (!wasCleared) rec.next = Math.min(NB() - 1, Math.max(rec.next, run.battle));
    // end of a section: rest at the spring, and its one-time first-clear reward
    const si = d.sections.findIndex((x) => x.to === idx);
    if (si >= 0) {
      const sc = d.sections[si]; out.sectionDone = { index: si, name: sc.name };
      run.uids.forEach((u) => { const inst = R.inst(st, u); if (!inst) return; const hpMax = R.statsWithGear(st, inst).hp; run.hp[u] = Math.min(hpMax, run.hp[u] + Math.round(hpMax * 0.5)); });
      if (!rec.floors[si]) {
        rec.floors[si] = true;
        if (sc.first && Object.keys(sc.first).length) { A.Economy.gain(st, sc.first); out.sectionFirst = { index: si, name: sc.name, reward: Object.assign({}, sc.first) }; }
        if (sc.lore && R.unlockLore(st, sc.lore)) out.lore.push(sc.lore);
      }
      out.floorDone = true; out.floorFirst = out.sectionFirst ? { floor: si, name: sc.name, reward: out.sectionFirst.reward } : null; // older names
      R.emit('stageCleared', { d: run.d, floor: si });
    }
    if (idx === d.battles.length - 1) {
      out.cleared = true;
      rec.clears++; rec.next = 0;
      out.first = rec.clears === 1;
      const base = d.clearReward || (out.first ? d.first : d.repeat) || {};
      const mult = A.World.dungeonRewardMult(st), reward = {};
      Object.keys(base).forEach((k) => (reward[k] = Math.round(base[k] * mult)));
      A.Economy.gain(st, reward);
      out.reward = reward;
      R.gainRankXp(st, 50);
      st.flags['cleared_' + run.d] = true;
      // equipment: the dungeon's own item on the first clear, then a chance at a common/rare one on later clears
      out.items = [];
      const gearId = out.first ? D.DUNGEON_GEAR[run.d] : (R.rng() < D.GEAR_REPEAT_CHANCE ? D.GEAR_REPEAT_POOL[Math.floor(R.rng() * D.GEAR_REPEAT_POOL.length)] : null);
      if (gearId) { const it = R.grantItem(st, gearId, 'dungeon:' + run.d); if (it) out.items.push(it.id); }
      if (run.d === 'reliquary') {
        if (rec.clears === 1 && !st.owned.terraki) { R.addAmina(st, 'terraki', 6); out.newSp.push('terraki'); }
        if (rec.clears === 2 && !st.owned.sylvaneer2) { R.addAmina(st, 'sylvaneer2', 8); out.newSp.push('sylvaneer2'); }
        if (rec.clears === 1) st.pendingR2 = true;
      } else if (run.d === 'hollowveil') {
        st.flags.hollowveil = true;
        if (rec.clears === 1 && !st.owned.meta1) { R.addAmina(st, 'meta1', 12); out.newSp.push('meta1'); }
      } else if (run.d === 'resonancescar' && rec.clears === 1 && !st.owned.atem1) {
        R.addAmina(st, 'atem1', 18); out.newSp.push('atem1');
      }
      // the Island Boss: defeating it the first time unlocks the next island (once; replays never repeat it)
      if (spec.islandBoss) {
        const iid = d.island, c = D.CAMPAIGN[iid];
        st.campaign = st.campaign || { bosses: {} }; st.campaign.bosses = st.campaign.bosses || {};
        const firstBoss = !st.campaign.bosses[iid];
        st.campaign.bosses[iid] = st.campaign.bosses[iid] || (Date.now() || 1);
        if (firstBoss) {
          R.emit('islandBossDefeated', { island: iid, d: run.d });
          if (c && c.next) { const u = A.World.unlockByBoss(st, c.next); if (u.ok) out.unlockedIsland = c.next; }
        }
      }
      if (d.scene && out.first) { out.scene = d.scene; st.story = st.story || {}; st.story.pendingScene = d.scene; }
      if (out.first && D.LORE[run.d] && R.unlockLore(st, run.d)) out.lore.push(run.d);
      st.run = null;
      R.emit('dungeonWin', { d: run.d, first: out.first, n: rec.clears, island: d.island });
    }
    return out;
  };
  R.abandonRun = function (st) { st.run = null; };
  // Story scenes: 'seen' or 'skipped'. Marking one also clears it from the pending slot (a scene that was due when
  // the game closed plays the next time the island opens).
  R.sceneDone = function (st, id, how) {
    st.story = st.story || {}; st.story.scenes = st.story.scenes || {};
    if (st.story.scenes[id] !== 'seen') st.story.scenes[id] = how === 'skipped' ? 'skipped' : 'seen';
    if (st.story.pendingScene === id) st.story.pendingScene = null;
    R.emit('sceneDone', { id, how: st.story.scenes[id] });
  };

  /* ---------- Survival: successive battles, rising difficulty; separate from the story ---------- */
  const SV = (R.Survival = {});
  const svRec = (st) => (st.survival = Object.assign({ best: 0, runs: 0, milestones: {}, run: null }, st.survival || {}));
  SV.rec = svRec;
  SV.start = function (st, uids) {
    const rec = svRec(st);
    uids = cleanUids(st, uids, D.SURVIVAL.party);
    if (!uids.length) return { ok: false, reason: 'party' };
    const hp = {}; uids.forEach((u) => { const i = R.inst(st, u); hp[u] = R.statsWithGear(st, i).hp; });
    rec.run = { wave: 1, uids, hp, earned: { gold: 0, food: 0 }, seed: Math.floor(R.rng() * 1e9) };
    rec.runs++;
    return { ok: true };
  };
  SV.spec = function (st) {
    const run = svRec(st).run; if (!run) return null;
    const lvs = run.uids.map((u) => (R.inst(st, u) || { lv: 1 }).lv), avg = Math.round(lvs.reduce((a, b) => a + b, 0) / lvs.length);
    const w = run.wave, lv = Math.max(2, Math.min(D.MAX_LEVEL, avg - 3 + Math.floor(w * 0.6)));
    const pick = (arr, k) => arr[(run.seed + k * 7919) % arr.length];
    if (w % 5 === 0) return { sp: pick(D.SURVIVAL.champions, w), lv: lv + 1, boss: true, title: 'Wave ' + w + ' Champion', hpMult: 1.15 + w * 0.01, move: pick(D.SURVIVAL.championMoves, w) };
    return { sp: pick(D.SURVIVAL.pool, w), lv };
  };
  SV.createBattle = function (st, rng) {
    const run = svRec(st).run, spec = SV.spec(st);
    const party = run.uids.filter((u) => R.inst(st, u)).map((u) => R.partyFighter(st, R.inst(st, u), { hp: run.hp[u] }));
    st.seen[spec.sp] = true;
    return B.create(party, R.enemyFromSpec(spec), { rng });
  };
  function svEnd(st, out) {
    const rec = svRec(st), run = rec.run;
    const reached = run.wave - (out.win ? 0 : 1); // waves actually beaten
    A.Economy.gain(st, run.earned);
    out.paid = Object.assign({}, run.earned); out.waves = Math.max(0, reached);
    if (out.waves > rec.best) { rec.best = out.waves; out.newBest = true; }
    rec.run = null;
    R.emit('survivalEnd', { waves: out.waves });
    return out;
  }
  SV.resolve = function (st, b) {
    const rec = svRec(st), run = rec.run;
    if (!run || !b.over) return { invalid: true };
    const spec = SV.spec(st), out = { win: b.result === 'win', wave: run.wave, xp: [], milestone: null };
    if (!out.win) { st.stats.losses++; return svEnd(st, out); }
    st.stats.wins++;
    out.xp = partyAfterWin(st, b, Math.round((10 + spec.lv * 3) * (spec.boss ? 1.5 : 1)), run.hp, D.SURVIVAL.healBetween);
    run.earned.gold += D.SURVIVAL.perWave.gold * run.wave; run.earned.food += D.SURVIVAL.perWave.food * run.wave;
    const ms = D.SURVIVAL.milestones[run.wave];
    if (ms && !rec.milestones[run.wave]) {
      rec.milestones[run.wave] = true; A.Economy.gain(st, ms); out.milestone = { wave: run.wave, reward: Object.assign({}, ms) };
      const gid = D.SURVIVAL_GEAR[run.wave]; if (gid) { const it = R.grantItem(st, gid, 'survival:' + run.wave); if (it) out.milestone.item = it.id; }
    }
    if (run.wave > rec.best) rec.best = run.wave;
    run.wave++;
    out.next = run.wave; out.earned = Object.assign({}, run.earned);
    R.emit('survivalWave', { wave: out.wave });
    return out;
  };
  SV.cashOut = function (st) { const run = svRec(st).run; if (!run) return { ok: false }; return Object.assign({ ok: true }, svEnd(st, { win: true, wave: run.wave })); };

  /* ---------- Loot Ruins: repeatable searches with a cooldown ---------- */
  const RU = (R.Ruins = {});
  RU.unlocked = (st, id) => !!D.RUINS[id] && R.reqMet(st, D.RUINS[id].unlock);
  RU.cooldownMs = (st, id) => D.RUINS[id].cooldownMin * 60000 / (st.settings && st.settings.timers === 'quick' ? 60 : 1);
  RU.status = function (st, id, now) {
    now = now || R.now(); const r = (st.ruins || {})[id] || {};
    const left = r.last ? Math.max(0, r.last + RU.cooldownMs(st, id) - now) : 0;
    return { unlocked: RU.unlocked(st, id), ready: RU.unlocked(st, id) && left === 0, left, searches: r.searches || 0, artefact: !!r.artefact };
  };
  RU.search = function (st, id, now) {
    now = now || R.now(); const site = D.RUINS[id];
    if (!site) return { ok: false, reason: 'invalid' };
    const s = RU.status(st, id, now);
    if (!s.unlocked) return { ok: false, reason: 'locked' };
    if (!s.ready) return { ok: false, reason: 'cooldown', left: s.left };
    st.ruins = st.ruins || {}; const r = (st.ruins[id] = st.ruins[id] || { searches: 0 });
    const roll = (a) => a[0] + Math.floor(R.rng() * (a[1] - a[0] + 1));
    const loot = { gold: roll(site.loot.gold), food: roll(site.loot.food) };
    if (R.rng() < site.gemChance) loot.gems = 1;
    A.Economy.gain(st, loot);
    r.searches++; r.last = now;
    let artefact = null;
    if (!r.artefact && site.artefact) { r.artefact = true; if (R.unlockLore(st, site.artefact)) artefact = site.artefact; }
    let item = null;
    if (R.rng() < D.RUIN_CHARM_CHANCE) { const it = R.grantItem(st, D.RUIN_CHARMS[Math.floor(R.rng() * D.RUIN_CHARMS.length)], 'ruin:' + id); if (it) item = it.id; }
    R.emit('ruinSearched', { id, loot, artefact, item });
    return { ok: true, loot, artefact, item };
  };

  /* ---------- PvP foundations (local only: there is no server yet) ---------- */
  const PV = (R.PvP = {});
  const pvRec = (st) => (st.pvp = Object.assign({ roster: [], practice: { w: 0, l: 0 }, rewardDay: '', rewardsToday: 0 }, st.pvp || {}));
  const dfRec = (st) => (st.defence = Object.assign({ attack: [], defence: [], log: [] }, st.defence || {}));
  PV.rec = pvRec; PV.defRec = dfRec;
  PV.setRoster = function (st, uids) {
    uids = cleanUids(st, uids, D.PVP.rosterSize);
    if (uids.length !== D.PVP.rosterSize) return { ok: false, reason: 'size' };
    pvRec(st).roster = uids; return { ok: true };
  };
  PV.roster = (st) => cleanUids(st, pvRec(st).roster, D.PVP.rosterSize);
  // A local practice opponent: n Aminas around the given level, chosen from a fixed pool with a seed.
  PV.aiTeam = function (lv, n, seed) {
    const pool = D.SURVIVAL.pool.concat(['lumifern', 'umbrit', 'aimza', 'igniflare', 'zeep']);
    const out = [];
    for (let i = 0; i < n; i++) { const sp = pool[(seed + i * 104729) % pool.length]; out.push(B.fighter(sp, Math.max(1, Math.min(D.MAX_LEVEL, lv + ((seed >> i) % 3) - 1)), { name: 'Rival ' + D.SPECIES[sp].name })); }
    return out;
  };
  const avgLv = (st, uids) => Math.round(uids.reduce((a, u) => a + (R.inst(st, u) || { lv: 1 }).lv, 0) / Math.max(1, uids.length));
  PV.createPractice = function (st, rng, seed) {
    const uids = PV.roster(st); if (uids.length !== D.PVP.rosterSize) return null;
    const party = uids.map((u) => R.partyFighter(st, R.inst(st, u)));
    return B.create(party, PV.aiTeam(avgLv(st, uids), D.PVP.rosterSize, seed == null ? Math.floor((rng || R.rng)() * 1e6) : seed), { rng });
  };
  const today = () => { const d = new Date(R.now()); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function practiceReward(st) {
    const r = pvRec(st), t = today();
    if (r.rewardDay !== t) { r.rewardDay = t; r.rewardsToday = 0; }
    if (r.rewardsToday >= D.PVP.practiceDailyRewards) return null;
    r.rewardsToday++; A.Economy.gain(st, D.PVP.practiceReward); return Object.assign({}, D.PVP.practiceReward);
  }
  PV.resolvePractice = function (st, b) {
    if (!b.over) return { invalid: true };
    const r = pvRec(st), win = b.result === 'win';
    if (win) r.practice.w++; else r.practice.l++;
    const reward = win ? practiceReward(st) : null;
    R.emit('pvpPractice', { win });
    return { win, reward, record: Object.assign({}, r.practice) };
  };
  // Island Defence: saved attack and defence teams (three each).
  PV.setTeam = function (st, kind, uids) {
    if (kind !== 'attack' && kind !== 'defence') return { ok: false, reason: 'invalid' };
    uids = cleanUids(st, uids, D.PVP.defenceSize);
    if (uids.length !== D.PVP.defenceSize) return { ok: false, reason: 'size' };
    dfRec(st)[kind] = uids; return { ok: true };
  };
  PV.team = (st, kind) => cleanUids(st, dfRec(st)[kind], D.PVP.defenceSize);
  PV.createRaid = function (st, rng, seed) {
    const uids = PV.team(st, 'attack'); if (uids.length !== D.PVP.defenceSize) return null;
    const party = uids.map((u) => R.partyFighter(st, R.inst(st, u)));
    const foes = PV.aiTeam(avgLv(st, uids), D.PVP.defenceSize, seed == null ? Math.floor((rng || R.rng)() * 1e6) : seed);
    foes.forEach((f) => (f.name = f.name.replace('Rival', 'Defender')));
    return B.create(party, foes, { rng });
  };
  function logDef(st, entry) { const r = dfRec(st); r.log.unshift(Object.assign({ t: R.now() }, entry)); r.log.length = Math.min(r.log.length, 10); }
  PV.resolveRaid = function (st, b) {
    if (!b.over) return { invalid: true };
    const win = b.result === 'win'; logDef(st, { kind: 'raid', win });
    const reward = win ? practiceReward(st) : null;
    return { win, reward };
  };
  // Computer raiders attack your saved defence team; both sides are played by the computer. Nothing is spent or lost.
  PV.simulateDefence = function (st, rng, seed) {
    const uids = PV.team(st, 'defence'); if (uids.length !== D.PVP.defenceSize) return { ok: false, reason: 'size' };
    rng = rng || R.rng;
    const defenders = uids.map((u) => R.partyFighter(st, R.inst(st, u)));
    const raiders = PV.aiTeam(avgLv(st, uids), D.PVP.defenceSize, seed == null ? Math.floor(rng() * 1e6) : seed);
    raiders.forEach((f) => (f.name = f.name.replace('Rival', 'Raider')));
    const b = B.create(defenders, raiders, { rng });
    let turns = 0;
    while (!b.over && turns < 200) { B.act(b, B.autoAction(b)); turns++; }
    const held = b.result === 'win';
    logDef(st, { kind: 'defence', win: held, turns });
    return { ok: true, held, turns, defendersLeft: B.alive(b), raidersLeft: B.foesLeft(b), raiders: raiders.map((f) => ({ sp: f.sp, lv: f.lv })) };
  };

  /* ---------- Hide and Seek (rules for the lobby, role vote and match; local bots until a server exists) ---------- */
  const HS = (R.HideSeek = {});
  const seededRng = (seed) => { let x = (seed >>> 0) || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
  HS.rng = seededRng;
  HS.lobby = function (st, seed) {
    const rnd = seededRng(seed), C = D.HIDESEEK, names = C.bots.slice();
    const players = [{ id: 'you', name: 'You', bot: false, pref: (st.hideseek && st.hideseek.pref) || 'hider' }];
    for (let i = 0; i < C.lobbySize - 1; i++) { const n = names.splice(Math.floor(rnd() * names.length), 1)[0]; players.push({ id: 'bot' + i, name: n, bot: true, pref: rnd() < 0.4 ? 'seeker' : 'hider' }); }
    return { seed, players };
  };
  HS.eligible = (lobby) => lobby.players.filter((p) => p.pref === 'seeker');
  // Votes go only to players who chose the Seeker preference. Most votes wins; a tie goes to whoever has been Seeker
  // least often, then to a seeded draw. If nobody chose Seeker, the Seeker is drawn from everyone (fallback).
  HS.assignSeeker = function (lobby, votes, history) {
    const rnd = seededRng(lobby.seed + 17), elig = HS.eligible(lobby), ids = elig.map((p) => p.id); history = history || {};
    if (!elig.length) { const p = lobby.players[Math.floor(rnd() * lobby.players.length)]; return { seeker: p.id, method: 'fallback', tally: {} }; }
    const tally = {}; ids.forEach((id) => (tally[id] = 0));
    Object.keys(votes || {}).forEach((voter) => { const c = votes[voter]; if (ids.indexOf(c) >= 0 && lobby.players.some((p) => p.id === voter)) tally[c]++; });
    const max = Math.max.apply(null, ids.map((id) => tally[id]));
    let top = ids.filter((id) => tally[id] === max);
    if (top.length === 1) return { seeker: top[0], method: 'vote', tally };
    const name = (id) => lobby.players.find((p) => p.id === id).name;
    const least = Math.min.apply(null, top.map((id) => history[name(id)] || 0));
    top = top.filter((id) => (history[name(id)] || 0) === least);
    return { seeker: top.length === 1 ? top[0] : top[Math.floor(rnd() * top.length)], method: 'tiebreak', tally };
  };
  HS.botVotes = function (lobby) {
    const rnd = seededRng(lobby.seed + 5), elig = HS.eligible(lobby), v = {};
    lobby.players.filter((p) => p.bot).forEach((p) => { if (elig.length) v[p.id] = elig[Math.floor(rnd() * elig.length)].id; });
    return v;
  };
  // Map: a grid with props. Every hider morphs into a prop kind and hides on a free cell, so it looks like scenery.
  HS.newMatch = function (lobby, seekerId, mine) {
    const C = D.HIDESEEK, rnd = seededRng(lobby.seed + 99), w = C.map.w, h = C.map.h, cells = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push([x, y]);
    const take = () => cells.splice(Math.floor(rnd() * cells.length), 1)[0];
    const props = []; for (let i = 0; i < Math.round(w * h * 0.35); i++) { const c = take(); props.push({ x: c[0], y: c[1], type: C.morphs[Math.floor(rnd() * C.morphs.length)] }); }
    const hiders = lobby.players.filter((p) => p.id !== seekerId).map((p) => {
      let c, morph;
      if (!p.bot && mine && mine.x != null) { c = [mine.x, mine.y]; const i = cells.findIndex((q) => q[0] === c[0] && q[1] === c[1]); if (i >= 0) cells.splice(i, 1); morph = C.morphs.indexOf(mine.morph) >= 0 ? mine.morph : C.morphs[0]; }
      else { c = take(); morph = C.morphs[Math.floor(rnd() * C.morphs.length)]; }
      return { id: p.id, name: p.name, bot: p.bot, x: c[0], y: c[1], morph, found: false };
    });
    return { w, h, props, hiders, seeker: seekerId, searched: {}, searchesLeft: C.searches, over: false, result: null, seed: lobby.seed };
  };
  HS.freeCells = function (m) { const out = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (!m.props.some((p) => p.x === x && p.y === y)) out.push([x, y]); return out; };
  HS.search = function (m, x, y) {
    if (m.over || m.searchesLeft <= 0) return { ok: false, reason: 'over' };
    const key = x + ',' + y; if (m.searched[key]) return { ok: false, reason: 'searched' };
    m.searched[key] = true; m.searchesLeft--;
    const h = m.hiders.find((q) => q.x === x && q.y === y && !q.found);
    if (h) h.found = true;
    HS.check(m);
    return { ok: true, found: h ? h.id : null };
  };
  HS.check = function (m) {
    if (m.over) return m.result;
    if (m.hiders.every((q) => q.found)) { m.over = true; m.result = 'seeker'; }
    else if (m.searchesLeft <= 0) { m.over = true; m.result = 'hiders'; }
    return m.result;
  };
  HS.timeUp = (m) => { if (!m.over) { m.over = true; m.result = 'hiders'; } return m.result; };
  // The computer seeker searches props and cells that look like props (morphed hiders), with a little luck.
  HS.botSearch = function (m, rnd) {
    const cand = [];
    m.props.forEach((p) => cand.push([p.x, p.y]));
    m.hiders.forEach((q) => { if (!q.found) cand.push([q.x, q.y]); });
    const open = cand.filter((c) => !m.searched[c[0] + ',' + c[1]]);
    if (!open.length) return null;
    const c = open[Math.floor(rnd() * open.length)];
    return Object.assign({ x: c[0], y: c[1] }, HS.search(m, c[0], c[1]));
  };

  // Convenience: run all after-action bookkeeping.
  R.after = function (st) { A.World.tick(st); A.World.tickProduction(st); A.Quests.scan(st); };
})(typeof window !== 'undefined' ? window : globalThis);
