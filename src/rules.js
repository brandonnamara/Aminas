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
    const out = { levels: [], evolved: null, gained: 0 };
    if (inst.lv >= D.MAX_LEVEL || amt <= 0) return out;
    inst.xp += amt; out.gained = amt;
    while (inst.lv < D.MAX_LEVEL && inst.xp >= R.xpNeed(inst.lv)) {
      inst.xp -= R.xpNeed(inst.lv);
      out.levels.push({ from: inst.lv, to: inst.lv + 1 });
      inst.lv++;
      R.emit('creatureLevel', { uid: inst.uid, sp: inst.sp, from: inst.lv - 1, to: inst.lv });
    }
    if (inst.lv >= D.MAX_LEVEL) inst.xp = 0;
    const evo = sp(inst.sp).evo;
    if (evo && inst.lv >= evo.lv) {
      const from = inst.sp;
      inst.sp = evo.to;
      st.stats.evolved++;
      const first = !st.owned[evo.to];
      st.owned[evo.to] = true; st.seen[evo.to] = true;
      out.evolved = { from, to: evo.to };
      R.emit('evolve', { uid: inst.uid, from, to: evo.to, first });
      R.gainRankXp(st, 15);
    }
    return out;
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
    R.addAmina(st, 'resonyx', 3);
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
    if ((elA === 'resonance') !== (elB === 'resonance')) return { key, sp: 'chimerrow', locked: true };
    return null;
  };
  R.breedCheck = function (st, uidA, uidB) {
    const a = R.inst(st, uidA), b = R.inst(st, uidB);
    if (!st.struct.hatchery) return { ok: false, reason: 'noHatchery' };
    if (st.egg) return { ok: false, reason: 'egg' };
    if (!a || !b) return { ok: false, reason: 'pick' };
    if (a.uid === b.uid) return { ok: false, reason: 'same' };
    if (a.lv < D.BREED_MIN_LEVEL || b.lv < D.BREED_MIN_LEVEL) return { ok: false, reason: 'level' };
    const r = R.recipeFor(sp(a.sp).el, sp(b.sp).el);
    if (!r) return { ok: false, reason: 'incompat' };
    if (r.locked && !st.flags.r2) return { ok: false, reason: 'locked' };
    if (!R.canAfford(st, D.BREED_COST)) return { ok: false, reason: 'cost' };
    return { ok: true, sp: r.sp, key: r.key };
  };
  R.startBreed = function (st, uidA, uidB) {
    const c = R.breedCheck(st, uidA, uidB);
    if (!c.ok) return c;
    const a = R.inst(st, uidA), b = R.inst(st, uidB);
    if (!A.Economy.spend(st, D.BREED_COST).ok) return { ok: false, reason: 'cost' };
    const secs = Math.max(5, Math.round((D.EGG_SECONDS[st.settings.eggSpeed] || D.EGG_SECONDS.fast) * A.World.eggTimeFactor(st)));
    const now = R.now();
    st.egg = { sp: c.sp, parents: [a.sp, b.sp], startedAt: now, readyAt: now + secs * 1000 };
    st.recipes = st.recipes || {};
    st.recipes[c.key] = c.sp;
    R.emit('eggStart', { sp: c.sp });
    return { ok: true, sp: c.sp };
  };
  R.eggStatus = function (st, now) {
    if (!st.egg) return null;
    now = now || R.now();
    const total = st.egg.readyAt - st.egg.startedAt, left = Math.max(0, st.egg.readyAt - now);
    return { ready: left === 0, left, progress: total > 0 ? 1 - left / total : 1 };
  };
  R.hatch = function (st, now) {
    const s = R.eggStatus(st, now);
    if (!s || !s.ready) return { ok: false };
    const spId = st.egg.sp;
    const inst = R.addAmina(st, spId, 1);
    st.egg = null;
    if (!inst) return { ok: false, reason: 'full' };
    st.stats.hatched++;
    R.gainRankXp(st, 15);
    R.emit('hatched', { sp: spId, uid: inst.uid });
    return { ok: true, inst };
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
    const s = sp(spId), st = R.statsAt(spId, lv);
    const hpMax = Math.round(st.hp * (opts.hpMult || 1));
    const f = { sp: spId, uid: opts.uid || null, name: opts.name || s.name, lv, el: s.el, hpMax,
      hp: opts.hp != null ? Math.max(0, Math.min(hpMax, Math.round(opts.hp))) : hpMax,
      atk: st.atk, def: st.def, spd: st.spd, abil: s.abil.slice(), cd: {}, weak: 0, guard: false, st: {}, boost: 1 };
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
    if (enemy.move && enemy.chargeIn == null) enemy.chargeIn = 1;
    return { party, pi: Math.max(0, party.findIndex((p) => p.hp > 0)), enemy, turn: 1, over: false, result: null,
      pending: false, rng: (opts && opts.rng) || R.rng, syn };
  };
  B.cur = (b) => b.party[b.pi];
  B.damage = function (att, def, ab, rng) {
    const eff = ab.neutral ? 1 : R.elMult(ab.el, def.el);
    const stab = ab.el === att.el ? 1.2 : 1;
    const A_ = att.atk * (att.boost || 1) * (1 - 0.2 * Math.min(3, att.weak));
    const base = ((2 * att.lv / 5 + 2) * ab.power * A_ / Math.max(1, def.def)) / DIV + 2;
    const rand = 0.92 + rng() * 0.16;
    let dmg = Math.max(1, Math.round(base * stab * eff * rand * (def.guard ? (ab.boss ? 0.25 : 0.5) : 1)));
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
      const ab = D.ABILITIES[id];
      att.cd[id] = ab.cd;
      ev.push({ t: 'use', who, name: att.name, abil: id, abName: ab.name, el: ab.el, boss: !!ab.boss });
      if (ab.boss) { att.charging = false; att.chargeIn = att.hp < att.hpMax * 0.5 ? 1 : 2; }
      if (ab.type === 'guard') { att.guard = true; ev.push({ t: 'guard', who }); return; }
      if (ab.type === 'heal') {
        const amt = Math.min(att.hpMax - att.hp, Math.round(att.hpMax * 0.25));
        att.hp += amt; ev.push({ t: 'heal', who, amt, hp: att.hp });
        if (ab.fx) applyFx(b, att, ab.fx, who, ev);
        return;
      }
      const r = B.damage(att, def, ab, b.rng);
      def.hp = Math.max(0, def.hp - r.dmg);
      const hadGuard = def.guard; def.guard = false;
      ev.push({ t: 'hit', who: foe, dmg: r.dmg, eff: R.effLabel(r.eff), hp: def.hp, guarded: hadGuard, el: ab.el, big: !!ab.boss });
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
      if (f.st.burn > 0) { const dmg = Math.max(1, Math.round(f.hpMax * SR.burn)); f.hp = Math.max(0, f.hp - dmg); ev.push({ t: 'dot', who, k: 'burn', dmg, hp: f.hp }); }
      const twi = who === 'p' && b.syn && b.syn.indexOf('twilight') >= 0;
      const rate = (f.st.regen > 0 ? SR.regen : 0) + (twi ? SR.twilight : 0);
      if (rate && f.hp > 0 && f.hp < f.hpMax) { const amt = Math.min(f.hpMax - f.hp, Math.max(1, Math.round(f.hpMax * rate))); f.hp += amt; ev.push({ t: 'heal', who, amt, hp: f.hp, k: f.st.regen > 0 ? 'regen' : 'twilight' }); }
      ['burn', 'soak', 'regen', 'silence'].forEach((k) => { if (f.st[k] > 0) { f.st[k]--; if (!f.st[k]) { delete f.st[k]; ev.push({ t: 'statusEnd', who, k }); } } });
    });
    const e = b.enemy; if (e.move && !e.charging && e.hp > 0) e.chargeIn--;
    checkEnd(b, ev);
  }

  B.enemyChoice = function (b) {
    const e = b.enemy, p = B.cur(b), opts = e.abil.filter((a) => B.usable(e, a));
    // guardians telegraph: one turn charging, then the move lands on the next
    if (e.move) { if (e.charging) return e.move; if (e.chargeIn <= 0) return 'charge'; }
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

  function checkEnd(b, ev) {
    if (b.enemy.hp <= 0) { ev.push({ t: 'faint', who: 'e' }); b.over = true; b.result = 'win'; ev.push({ t: 'end', result: 'win' }); return true; }
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

  /* ---------- dungeon runs ---------- */
  // Per-dungeon record. `floors[i]` marks a floor's first clear (added in v0.4; older saves that had already
  // cleared a dungeon count every floor as first-cleared, so nothing is paid twice).
  R.dungeonRec = function (st, id) {
    const rec = st.dungeon[id] = st.dungeon[id] || { clears: 0 };
    const n = D.DUNGEONS[id] ? D.DUNGEONS[id].floors.length : 0;
    if (!Array.isArray(rec.floors)) rec.floors = [];
    for (let i = 0; i < n; i++) if (rec.floors[i] == null) rec.floors[i] = rec.clears > 0;
    return rec;
  };
  R.dungeonUnlocked = function (st, id) {
    const d = D.DUNGEONS[id];
    return !!d && d.playable && R.reqMet(st, d.unlock);
  };
  R.defaultParty = function (st) {
    const sorted = st.aminas.slice().sort((a, b) => b.lv - a.lv);
    const out = [];
    const act = R.active(st);
    if (act) out.push(act.uid);
    sorted.forEach((a) => { if (out.length < 3 && out.indexOf(a.uid) < 0) out.push(a.uid); });
    return out;
  };
  R.startRun = function (st, id, uids) {
    if (!R.dungeonUnlocked(st, id)) return { ok: false, reason: 'locked' };
    uids = (uids || []).filter((u, i, a) => R.inst(st, u) && a.indexOf(u) === i).slice(0, 3);
    if (!uids.length) return { ok: false, reason: 'party' };
    const hp = {};
    uids.forEach((u) => { const i = R.inst(st, u); hp[u] = R.statsAt(i.sp, i.lv).hp; });
    st.run = { d: id, floor: 0, battle: 0, uids, hp, gold: 0, food: 0, xp: {} };
    st.party = uids.slice();
    return { ok: true };
  };
  R.encounter = function (st) {
    const run = st.run; if (!run) return null;
    const d = D.DUNGEONS[run.d], fl = d.floors[run.floor];
    return fl ? { floor: run.floor, floorName: fl.name, battle: run.battle, battles: fl.battles.length, spec: fl.battles[run.battle], floors: d.floors.length } : null;
  };
  R.createBattle = function (st, rng) {
    const run = st.run, enc = R.encounter(st);
    const party = run.uids.map((u) => { const i = R.inst(st, u); return B.fighter(i.sp, i.lv, { uid: u, hp: run.hp[u] }); });
    const sPec = enc.spec;
    const enemy = B.fighter(sPec.sp, sPec.lv, { name: sPec.title || null, hpMult: sPec.hpMult });
    if (sPec.boss) enemy.boss = true;
    if (sPec.move) { enemy.move = sPec.move; enemy.chargeIn = 1; }
    st.seen[sPec.sp] = true;
    return B.create(party, enemy, { rng });
  };
  R.resolveBattle = function (st, b) {
    const run = st.run, enc = R.encounter(st), d = D.DUNGEONS[run.d];
    const out = { win: b.result === 'win', cleared: false, xp: [], gold: 0, food: 0, newSp: [], first: false, boss: !!enc.spec.boss };
    if (!out.win) {
      st.run = null; st.stats.losses++;
      R.addRes(st, { food: 5 }); out.food = 5;
      R.emit('dungeonLose', { d: run.d });
      return out;
    }
    st.stats.wins++; R.emit('battleWon', { d: run.d, boss: !!enc.spec.boss });
    const baseXp = Math.round((20 + enc.spec.lv * 6) * (enc.spec.boss ? 1.5 : 1));
    out.gold = 10 + enc.spec.lv * 3 + (enc.spec.boss ? 20 : 0); out.food = 4 + (enc.spec.boss ? 6 : 0);
    R.addRes(st, { gold: out.gold, food: out.food });
    run.gold += out.gold; run.food += out.food;
    b.party.forEach((f) => {
      const inst = R.inst(st, f.uid);
      const alive = f.hp > 0;
      const r = R.addXp(st, inst, alive ? baseXp : Math.round(baseXp / 2));
      out.xp.push({ uid: f.uid, sp: inst.sp, gained: r.gained, levels: r.levels, evolved: r.evolved, alive });
      const hpMax = R.statsAt(inst.sp, inst.lv).hp;
      const prev = alive ? f.hp : Math.round(hpMax * 0.2);
      run.hp[f.uid] = Math.min(hpMax, prev + (alive ? Math.round(hpMax * 0.4) : 0));
      // level-ups grow max hp: keep current hp ratio sensible
      run.hp[f.uid] = Math.max(run.hp[f.uid], 1);
    });
    R.gainRankXp(st, 8);
    run.battle++;
    const fl = d.floors[run.floor];
    if (run.battle >= fl.battles.length) {
      run.floor++; run.battle = 0;
      b.party.forEach((f) => { const inst = R.inst(st, f.uid), hpMax = R.statsAt(inst.sp, inst.lv).hp; run.hp[f.uid] = Math.min(hpMax, run.hp[f.uid] + Math.round(hpMax * 0.5)); });
      out.floorDone = true;
      // first time this floor is cleared: one-off reward (stored per floor, so it is never paid twice)
      const fi = run.floor - 1, rec0 = R.dungeonRec(st, run.d);
      if (!rec0.floors[fi]) {
        rec0.floors[fi] = true;
        const fr = fl.first || {}; if (Object.keys(fr).length) { A.Economy.gain(st, fr); out.floorFirst = { floor: fi, name: fl.name, reward: Object.assign({}, fr) }; }
      }
      R.emit('stageCleared', { d: run.d, floor: run.floor - 1 });
    }
    if (run.floor >= d.floors.length) {
      out.cleared = true;
      const rec = R.dungeonRec(st, run.d);
      rec.clears++;
      out.first = rec.clears === 1;
      const mult = A.World.dungeonRewardMult(st), reward = {};
      Object.keys(d.clearReward).forEach((k) => (reward[k] = Math.round(d.clearReward[k] * mult)));
      A.Economy.gain(st, reward);
      out.reward = reward;
      R.gainRankXp(st, 50);
      if (run.d === 'reliquary') {
        if (rec.clears === 1 && !st.owned.relicwarden) { R.addAmina(st, 'relicwarden', 6); out.newSp.push('relicwarden'); }
        if (rec.clears === 2 && !st.owned.briarstag) { R.addAmina(st, 'briarstag', 8); out.newSp.push('briarstag'); }
        if (rec.clears === 1) st.pendingR2 = true;
      } else if (run.d === 'hollowveil') {
        st.flags.hollowveil = true;
        if (rec.clears === 1 && !st.owned.veilfox) { R.addAmina(st, 'veilfox', 12); out.newSp.push('veilfox'); }
      } else if (run.d === 'resonancescar' && rec.clears === 1 && !st.owned.echolyn) {
        R.addAmina(st, 'echolyn', 18); out.newSp.push('echolyn');
      }
      st.run = null;
      R.emit('dungeonWin', { d: run.d, first: out.first, n: rec.clears });
    }
    return out;
  };
  R.abandonRun = function (st) { st.run = null; };

  // Convenience: run all after-action bookkeeping.
  R.after = function (st) { A.World.tick(st); A.World.tickProduction(st); A.Quests.scan(st); };
})(typeof window !== 'undefined' ? window : globalThis);
