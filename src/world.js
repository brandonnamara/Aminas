/* Aminas — world rules (no DOM): economy service, story restoration, building placement, obstacles, upgrades,
   islands, residents and production. Every gameplay mutation is validated here, never only in the UI.
   Based on the milestone-2 work-in-progress module; integrated with rules.js and fixed (see CHANGES.md). */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = A.Data;
  const E = (A.Economy = {});
  const W = (A.World = {});
  const KINDS = ['gold', 'food', 'gems'];
  const emit = (n, d) => { if (A.Rules && A.Rules.emit) A.Rules.emit(n, d); };
  const now = () => (A.Rules && A.Rules.now ? A.Rules.now() : Date.now());
  const all = (st) => Object.keys(st.buildings).map((k) => st.buildings[k]);

  /* ================= Economy service ================= */
  // All spending and earning goes through here: validates first, never goes negative, reports the shortfall.
  const clean = (c) => { const o = {}; KINDS.forEach((k) => { const v = Math.floor(Number(c && c[k]) || 0); if (v > 0) o[k] = v; }); return o; };
  E.clean = clean;
  E.shortfall = function (st, cost) { const c = clean(cost), s = {}; Object.keys(c).forEach((k) => { const need = c[k] - st.res[k]; if (need > 0) s[k] = need; }); return s; };
  E.canAfford = (st, cost) => Object.keys(E.shortfall(st, cost)).length === 0;
  E.spend = function (st, cost) {
    const c = clean(cost), short = E.shortfall(st, c);
    if (Object.keys(short).length) return { ok: false, reason: 'insufficient', short };
    Object.keys(c).forEach((k) => (st.res[k] -= c[k]));
    return { ok: true, spent: c };
  };
  E.gain = function (st, r) { const c = clean(r); Object.keys(c).forEach((k) => (st.res[k] += c[k])); return c; };
  E.fmt = (c) => { const x = clean(c); return Object.keys(x).map((k) => x[k].toLocaleString('en-US') + ' ' + k).join(', ') || 'free'; };

  /* ================= setup ================= */
  W.storyBuilding = (id) => { const p = D.DEFAULT_POS[id]; return { id, type: id, island: 'starter', x: p[0], y: p[1], rot: 0, level: 0, state: 'ruined', residents: [], last: 0, stock: 0 }; };
  W.initWorld = function (st) {
    st.buildings = {}; st.islands = { starter: { unlocked: true, obstacles: {} } }; st.currentIsland = 'starter'; st.nextBid = 1;
    st.counters = st.counters || {}; st.qbase = st.qbase || {};
    D.STORY_BUILDINGS.forEach((id) => (st.buildings[id] = W.storyBuilding(id)));
    return st;
  };
  W.def = (b) => D.BUILDINGS[b.type];
  W.timeScale = (st) => D.TIMER_SCALE[(st.settings && st.settings.timers) || 'normal'] || 1;
  W.secs = (st, base) => Math.max(0, Math.round(base * W.timeScale(st)));
  W.levelData = (b, lvl) => W.def(b).levels[Math.max(0, Math.min(W.def(b).levels.length, lvl == null ? b.level : lvl) - 1)];
  W.maxLevel = (b) => W.def(b).levels.length;
  W.isActive = (b) => b.level >= 1 && (b.state === 'built' || b.state === 'upgrading');

  /* ================= geometry / placement ================= */
  W.size = function (typeId, rot) { const d = D.BUILDINGS[typeId]; return rot ? { w: d.h, h: d.w } : { w: d.w, h: d.h }; };
  W.cellsOf = function (w, h, x, y) { const c = []; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) c.push([xx, yy]); return c; };
  W.footprint = function (typeId, x, y, rot) { const s = W.size(typeId, rot); return W.cellsOf(s.w, s.h, x, y); };
  W.obstacleRec = function (st, oid) { const o = D.obstacleById[oid]; if (!o) return null; const s = st.islands[o.island]; return (s && s.obstacles[oid]) || null; };
  W.obstacleState = function (st, oid) { if (!D.obstacleById[oid]) return null; const r = W.obstacleRec(st, oid); return r ? r.state : 'present'; };
  W.obstaclesOn = (st, iid) => (D.OBSTACLES[iid] || []).map((o) => Object.assign({}, o, { state: W.obstacleState(st, o.id), rec: W.obstacleRec(st, o.id), info: D.obstacleInfo(iid, o.type) }));
  // Occupied cells on an island: key 'x,y' -> {kind,id}. Obstacles being removed still occupy their cells.
  W.occupancy = function (st, iid, ignoreId) {
    const m = new Map();
    (D.OBSTACLES[iid] || []).forEach((o) => { if (W.obstacleState(st, o.id) === 'cleared') return; const t = D.OBSTACLE_TYPES[o.type]; W.cellsOf(t.w, t.h, o.x, o.y).forEach((c) => m.set(c[0] + ',' + c[1], { kind: 'obstacle', id: o.id })); });
    all(st).forEach((b) => { if (b.island !== iid || b.state === 'stored' || b.id === ignoreId || b.x == null) return; W.footprint(b.type, b.x, b.y, b.rot).forEach((c) => m.set(c[0] + ',' + c[1], { kind: 'building', id: b.id })); });
    return m;
  };
  // Validate a placement: integer cells, inside the map, on buildable land, not on obstacles or other buildings.
  W.canPlace = function (st, iid, typeId, x, y, rot, ignoreId) {
    if (!D.ISLANDS[iid] || !D.BUILDINGS[typeId] || !Number.isInteger(x) || !Number.isInteger(y)) return { ok: false, reason: 'invalid', cells: [] };
    const occ = W.occupancy(st, iid, ignoreId), cells = W.footprint(typeId, x, y, rot ? 1 : 0), isl = D.ISLANDS[iid];
    const blockers = []; let terrain = null;
    for (const [cx, cy] of cells) {
      if (cx < 0 || cy < 0 || cx >= isl.grid.w || cy >= isl.grid.h) { terrain = terrain || 'bounds'; continue; }
      if (!isl.land[cy][cx]) terrain = terrain || 'water';
      else if (!isl.buildable[cy][cx]) terrain = terrain || 'terrain';
      const o = occ.get(cx + ',' + cy); if (o) blockers.push(o);
    }
    if (terrain) return { ok: false, reason: terrain, cells, blockers };
    if (blockers.length) return { ok: false, reason: blockers.some((b) => b.kind === 'obstacle') ? 'obstacle' : 'building', cells, blockers };
    return { ok: true, cells };
  };
  W.REASON_TEXT = { invalid: 'That spot is not valid.', bounds: 'That is off the edge of the island.', water: 'Buildings cannot go on water.', terrain: 'Paths, sand and landmarks must stay clear.', obstacle: 'Something is in the way. Remove the obstacle first.', building: 'That overlaps another building.' };
  // Nearest valid top-left cell around a target (used to drop new/stored buildings near the view centre).
  W.findSpot = function (st, iid, typeId, rot, near, ignoreId) {
    const isl = D.ISLANDS[iid], nx = near ? near[0] : Math.floor(isl.grid.w / 2), ny = near ? near[1] : Math.floor(isl.grid.h / 2);
    let best = null, bd = 1e9;
    for (let y = 0; y < isl.grid.h; y++) for (let x = 0; x < isl.grid.w; x++) {
      const d = (x - nx) * (x - nx) + (y - ny) * (y - ny); if (d >= bd) continue;
      if (W.canPlace(st, iid, typeId, x, y, rot, ignoreId).ok) { best = [x, y]; bd = d; }
    }
    return best;
  };

  /* ================= queries ================= */
  W.buildingsOn = (st, iid) => all(st).filter((b) => b.island === iid && b.state !== 'stored');
  W.stored = (st) => all(st).filter((b) => b.state === 'stored');
  W.count = function (st, typeId, o) { o = o || {}; return all(st).filter((b) => b.type === typeId && b.state !== 'ruined' && (!o.island || b.island === o.island)).length; };
  W.maxLevelOf = (st, typeId) => all(st).filter((b) => b.type === typeId && b.state !== 'ruined').reduce((m, b) => Math.max(m, b.level), 0);
  W.islandUnlocked = (st, id) => !!(st.islands[id] && st.islands[id].unlocked);
  W.reqText = function (req) {
    if (!req) return '';
    const out = [];
    if (req.struct) out.push('Restore the ' + D.BUILDINGS[req.struct].name + ' first.');
    if (req.flag === 'r1') out.push('Investigate the Resonance disturbance first.');
    if (req.flag === 'r2') out.push('Complete the Overgrown Reliquary first.');
    if (req.rank) out.push('Reach Caretaker Rank ' + req.rank + '.');
    return out.join(' ');
  };
  const reqMet = (st, req) => (A.Rules ? A.Rules.reqMet(st, req) : true);
  // First unmet part of a requirement (so navigation can point at exactly one prerequisite).
  W.unmetReq = function (st, req) {
    if (!req) return null;
    if (req.struct && !st.struct[req.struct]) return { struct: req.struct };
    if (req.flag && !st.flags[req.flag]) return { flag: req.flag };
    if (req.rank && st.rank < req.rank) return { rank: req.rank };
    return null;
  };
  // Why a catalog building can/can't be built right now.
  W.canBuildInfo = function (st, typeId, iid) {
    const d = D.BUILDINGS[typeId]; iid = iid || st.currentIsland;
    if (!d || d.story) return { ok: false, reason: 'invalid', text: 'This cannot be built.' };
    if (!W.islandUnlocked(st, iid)) return { ok: false, reason: 'island', text: 'Unlock this island first.' };
    if (d.season && A.Events && !A.Events.buildable(st, typeId)) return { ok: false, reason: 'season', text: 'Only during the ' + D.SEASONS[d.season].name + ' (or once you finish its tasks).' };
    if (!reqMet(st, d.req)) return { ok: false, reason: 'locked', text: W.reqText(W.unmetReq(st, d.req)), req: W.unmetReq(st, d.req) };
    if (d.maxCount && W.count(st, typeId, { island: iid }) >= d.maxCount) return { ok: false, reason: 'limit', text: 'Limit of ' + d.maxCount + ' on this island.' };
    const short = E.shortfall(st, d.levels[0].cost);
    if (Object.keys(short).length) return { ok: false, reason: 'insufficient', short, text: 'Need ' + E.fmt(short) + ' more.' };
    return { ok: true };
  };
  W.upgradeInfo = function (st, id) {
    const b = st.buildings[id]; if (!b) return { ok: false, reason: 'invalid', text: 'Unknown building.' };
    const d = W.def(b);
    if (b.state === 'ruined') return { ok: false, reason: 'ruined', text: 'Restore it first.' };
    if (b.state === 'stored') return { ok: false, reason: 'stored', text: 'Place it on an island first.' };
    if (b.level >= d.levels.length) return { ok: false, reason: 'max', text: 'Maximum level reached.' };
    if (b.state !== 'built') return { ok: false, reason: 'busy', text: b.state === 'constructing' ? 'Still under construction.' : 'Already upgrading.' };
    const nx = d.levels[b.level];
    const base = { cost: nx.cost, time: W.secs(st, nx.time), toLevel: b.level + 1, next: nx, cur: W.levelData(b) };
    if (nx.req && !reqMet(st, nx.req)) return Object.assign(base, { ok: false, reason: 'locked', text: W.reqText(W.unmetReq(st, nx.req)), req: W.unmetReq(st, nx.req) });
    const short = E.shortfall(st, nx.cost);
    if (Object.keys(short).length) return Object.assign(base, { ok: false, reason: 'insufficient', short, text: 'Need ' + E.fmt(short) + ' more.' });
    return Object.assign(base, { ok: true });
  };

  /* ================= actions ================= */
  // Story ruins: restoring = paying level 1 and finishing immediately (keeps the story pacing snappy).
  W.restoreInfo = function (st, id) {
    const b = st.buildings[id], d = D.BUILDINGS[id];
    if (!b || !d || !d.story) return { ok: false, reason: 'invalid' };
    if (st.struct[id] || b.state !== 'ruined') return { ok: false, reason: 'done' };
    if (!reqMet(st, d.req)) return { ok: false, reason: 'locked', text: W.reqText(W.unmetReq(st, d.req)), req: W.unmetReq(st, d.req) };
    const short = E.shortfall(st, d.levels[0].cost);
    if (Object.keys(short).length) return { ok: false, reason: 'gold', short, need: short.gold || 0, text: 'Need ' + E.fmt(short) + ' more.' };
    return { ok: true, cost: d.levels[0].cost };
  };
  W.restore = function (st, id) {
    const info = W.restoreInfo(st, id); if (!info.ok) return info;
    const sp = E.spend(st, info.cost); if (!sp.ok) return { ok: false, reason: 'gold', short: sp.short };
    const b = st.buildings[id];
    b.level = 1; b.state = 'built'; b.last = now(); b.stock = 0; b.endAt = 0;
    st.struct[id] = true;
    if (A.Rules) A.Rules.gainRankXp(st, 20);
    emit('restored', { id });
    return { ok: true };
  };
  W.buildNew = function (st, iid, typeId, x, y, rot) {
    const info = W.canBuildInfo(st, typeId, iid); if (!info.ok) return info;
    const p = W.canPlace(st, iid, typeId, x, y, rot ? 1 : 0); if (!p.ok) return p;
    const d = D.BUILDINGS[typeId], sp = E.spend(st, d.levels[0].cost); if (!sp.ok) return sp;
    const id = 'b' + st.nextBid++, t = W.secs(st, d.levels[0].time);
    st.buildings[id] = { id, type: typeId, island: iid, x, y, rot: rot ? 1 : 0, level: 0, state: 'constructing', toLevel: 1, startAt: now(), endAt: now() + t * 1000, residents: [], last: 0, stock: 0 };
    emit('placed', { id, type: typeId, cat: d.cat, island: iid });
    if (t === 0) W.tick(st);
    return { ok: true, id };
  };
  W.upgrade = function (st, id) {
    const info = W.upgradeInfo(st, id); if (!info.ok) return info;
    W.tickProduction(st); // bank production at the old rate first
    const sp = E.spend(st, info.cost); if (!sp.ok) return sp;
    const b = st.buildings[id]; b.state = 'upgrading'; b.toLevel = info.toLevel; b.startAt = now(); b.endAt = now() + info.time * 1000;
    emit('upgradeStarted', { id, type: b.type, toLevel: info.toLevel });
    if (info.time === 0) W.tick(st);
    return { ok: true, toLevel: info.toLevel, time: info.time };
  };
  W.canMove = (b) => !!b && W.def(b).canMove && ['built', 'upgrading', 'constructing'].indexOf(b.state) >= 0;
  W.move = function (st, id, x, y, rot) {
    const b = st.buildings[id];
    if (!W.canMove(b)) return { ok: false, reason: 'immovable' };
    const r = rot == null ? b.rot : rot ? 1 : 0;
    if (r !== b.rot && !W.def(b).canRotate) return { ok: false, reason: 'norotate' };
    if (x === b.x && y === b.y && r === b.rot) return { ok: true, unchanged: true };
    const p = W.canPlace(st, b.island, b.type, x, y, r, id); if (!p.ok) return p;
    b.x = x; b.y = y; b.rot = r; emit('moved', { id, type: b.type, island: b.island });
    return { ok: true };
  };
  W.store = function (st, id) {
    const b = st.buildings[id];
    if (!b || !W.def(b).canStore) return { ok: false, reason: 'ineligible' };
    if (b.state !== 'built') return { ok: false, reason: 'busy' };
    if (W.def(b).produces) W.collect(st, id);
    b.residents = []; b.island = null; b.x = b.y = null; b.state = 'stored'; b.stock = 0;
    emit('stored', { id, type: b.type });
    return { ok: true };
  };
  W.unstore = function (st, id, iid, x, y, rot) {
    const b = st.buildings[id]; if (!b || b.state !== 'stored') return { ok: false, reason: 'invalid' };
    if (!W.islandUnlocked(st, iid)) return { ok: false, reason: 'island' };
    const d = W.def(b);
    if (d.maxCount && W.buildingsOn(st, iid).filter((x2) => x2.type === b.type).length >= d.maxCount) return { ok: false, reason: 'limit' };
    const r = rot ? 1 : 0, p = W.canPlace(st, iid, b.type, x, y, r, id); if (!p.ok) return p;
    b.island = iid; b.x = x; b.y = y; b.rot = r; b.state = 'built'; b.last = now(); b.stock = 0;
    emit('placed', { id, type: b.type, cat: d.cat, island: iid, fromStorage: true });
    return { ok: true };
  };
  // Obstacles: pay once, then wait; the reward is granted exactly once when the timer completes.
  W.removeObstacle = function (st, oid) {
    const o = D.obstacleById[oid]; if (!o) return { ok: false, reason: 'invalid' };
    if (!W.islandUnlocked(st, o.island)) return { ok: false, reason: 'island' };
    if (W.obstacleState(st, oid) !== 'present') return { ok: false, reason: 'already' };
    const info = D.obstacleInfo(o.island, o.type), sp = E.spend(st, info.cost); if (!sp.ok) return sp;
    const t = W.secs(st, info.time);
    st.islands[o.island].obstacles[oid] = { state: 'removing', startAt: now(), endAt: now() + t * 1000, paid: info.cost, rewarded: false };
    emit('obstacleStarted', { id: oid, type: o.type, island: o.island });
    if (t === 0) W.tick(st);
    return { ok: true, time: t };
  };
  W.islandPrice = (id) => D.ISLANDS[id].price;
  W.unlockIsland = function (st, id) {
    const isl = D.ISLANDS[id]; if (!isl) return { ok: false, reason: 'invalid' };
    if (W.islandUnlocked(st, id)) return { ok: false, reason: 'already' };
    const sp = E.spend(st, { gold: isl.price }); if (!sp.ok) return { ok: false, reason: 'insufficient', short: sp.short };
    st.islands[id] = { unlocked: true, obstacles: (st.islands[id] && st.islands[id].obstacles) || {}, unlockedAt: now() };
    if (A.Rules) A.Rules.gainRankXp(st, 40);
    emit('islandUnlocked', { island: id, price: isl.price });
    return { ok: true, price: isl.price };
  };
  W.travel = function (st, id) {
    if (!D.ISLANDS[id] || !W.islandUnlocked(st, id)) return { ok: false, reason: 'locked' };
    const changed = st.currentIsland !== id; st.currentIsland = id;
    emit('traveled', { island: id, changed });
    return { ok: true, changed };
  };

  /* ================= timers ================= */
  // Remaining seconds for anything with endAt (buildings or obstacle records).
  W.remaining = (x, t) => Math.max(0, Math.ceil((((x && x.endAt) || 0) - (t || now())) / 1000));
  W.finishCost = (secs) => (secs <= 0 ? 0 : Math.max(1, Math.ceil((secs / 60) * D.FINISH_GEMS_PER_MIN)));
  // Spend earned gems to complete a timer now. kind: 'building' | 'obstacle'.
  W.finishNow = function (st, kind, id) {
    const rec = kind === 'obstacle' ? W.obstacleRec(st, id) : st.buildings[id];
    const busy = rec && (kind === 'obstacle' ? rec.state === 'removing' : rec.state === 'constructing' || rec.state === 'upgrading');
    if (!busy) return { ok: false, reason: 'idle' };
    const gems = W.finishCost(W.remaining(rec));
    const sp = E.spend(st, { gems }); if (!sp.ok) return { ok: false, reason: 'insufficient', short: sp.short };
    rec.endAt = now(); W.tick(st);
    return { ok: true, gems };
  };
  W.tick = function (st, t) {
    t = t || now();
    all(st).forEach((b) => {
      if ((b.state === 'constructing' || b.state === 'upgrading') && b.endAt <= t) {
        if (b.state === 'upgrading') W.tickProduction(st, b.endAt);
        const was = b.state; b.level = b.toLevel; b.state = 'built'; b.endAt = 0; b.startAt = 0; b.stock = b.stock || 0;
        if (was === 'constructing') { b.last = t; emit('built', { id: b.id, type: b.type, level: b.level, island: b.island }); }
        else emit('upgraded', { id: b.id, type: b.type, level: b.level, island: b.island });
      }
    });
    Object.keys(st.islands).forEach((iid) => {
      const obs = st.islands[iid].obstacles || {};
      Object.keys(obs).forEach((oid) => {
        const r = obs[oid];
        if (r.state === 'removing' && r.endAt <= t) {
          r.state = 'cleared'; r.endAt = 0;
          if (!r.rewarded && D.obstacleById[oid]) {
            r.rewarded = true;
            const o = D.obstacleById[oid], info = D.obstacleInfo(iid, o.type);
            E.gain(st, info.reward); if (A.Rules) A.Rules.gainRankXp(st, info.xp);
            emit('obstacleRemoved', { id: oid, type: o.type, island: iid, tags: info.tags, reward: info.reward });
          }
        }
      });
    });
  };

  /* ================= residents & production ================= */
  W.capacity = (b) => (W.def(b).perResident && b.level >= 1 ? W.levelData(b).capacity || 0 : 0);
  // Residents of a building. The Sunlit Hollow always houses the companion first.
  W.residents = function (st, b) {
    if (!b || b.level < 1 || b.state === 'stored') return [];
    const out = [], act = A.Rules.active(st);
    if (b.type === 'hollow' && act) out.push(act);
    (b.residents || []).map((u) => A.Rules.inst(st, u)).filter(Boolean).forEach((a) => { if (out.indexOf(a) < 0) out.push(a); });
    return out.slice(0, W.capacity(b));
  };
  W.residentOf = (st, b) => W.residents(st, b)[0] || null;
  W.perMin = function (st, b) {
    const d = W.def(b); if (!d.produces || !W.isActive(b)) return 0;
    const ld = W.levelData(b);
    if (!d.perResident) return ld.rate;
    return W.residents(st, b).reduce((s, a) => s + ld.rate * (1 + a.lv * 0.08) * ((d.affinity || []).indexOf(D.SPECIES[a.sp].el) >= 0 ? 1.5 : 1), 0);
  };
  W.capOf = (st, b) => { const ld = b.level >= 1 ? W.levelData(b) : null; return ld && ld.capMin ? W.perMin(st, b) * ld.capMin : 0; };
  const TICK_MS = 60000;
  W.tickProduction = function (st, t) {
    t = t || now();
    all(st).forEach((b) => {
      if (!W.def(b).produces || b.level < 1 || b.state === 'stored' || b.state === 'ruined' || b.state === 'constructing') return;
      const per = W.perMin(st, b), cap = W.capOf(st, b);
      if (!per) { b.last = t; return; }
      if (!b.last || b.last > t) b.last = t;
      const ticks = Math.floor((t - b.last) / TICK_MS);
      if (ticks > 0) { b.stock = Math.min(cap, (b.stock || 0) + ticks * per); b.last += ticks * TICK_MS; }
      if ((b.stock || 0) >= cap) { b.stock = cap; b.last = t; }
    });
  };
  W.stock = (st, id) => (st.buildings[id] ? Math.floor(st.buildings[id].stock || 0) : 0);
  W.collect = function (st, id) {
    W.tickProduction(st);
    const b = st.buildings[id], n = W.stock(st, id);
    if (!b || !W.def(b).produces || n < 1) return { ok: false, reason: 'empty' };
    const kind = W.def(b).produces; b.stock -= n; E.gain(st, { [kind]: n });
    emit('collected', { id, kind, n, type: b.type, island: b.island });
    return { ok: true, kind, n };
  };
  // Total ready to collect on an island (HUD hint).
  W.readyOn = (st, iid) => W.buildingsOn(st, iid).filter((b) => W.def(b).produces && W.stock(st, b.id) >= 1);
  W.freeSlots = (st, b) => W.capacity(b) - W.residents(st, b).length;
  W.homeOf = (st, uid) => all(st).find((b) => (b.residents || []).indexOf(uid) >= 0) || null;
  W.assign = function (st, id, uid) {
    const b = st.buildings[id]; if (!b || !W.def(b).perResident || !W.isActive(b)) return { ok: false, reason: 'invalid' };
    if (!A.Rules.inst(st, uid)) return { ok: false, reason: 'invalid' };
    if (uid === st.active) return { ok: false, reason: 'companion' };
    W.tickProduction(st);
    if (b.residents.indexOf(uid) >= 0) return { ok: true, unchanged: true };
    if (W.freeSlots(st, b) <= 0) return { ok: false, reason: 'full' };
    all(st).forEach((x) => { x.residents = (x.residents || []).filter((u) => u !== uid); });
    b.residents.push(uid);
    emit('assigned', { id, uid });
    return { ok: true };
  };
  W.unassign = function (st, id, uid) { const b = st.buildings[id]; if (!b) return { ok: false }; W.tickProduction(st); b.residents = (b.residents || []).filter((u) => u !== uid); return { ok: true }; };
  W.eggTimeFactor = function (st) { const h = st.buildings.hatchery; return h && h.level >= 1 ? W.levelData(h).eggTime || 1 : 1; };
  W.dungeonRewardMult = function (st) { const g = st.buildings.reliquarygate; return g && g.level >= 1 ? W.levelData(g).rewardMult || 1 : 1; };

  /* ================= load-time validation & repair ================= */
  // Guarantees a consistent world after loading ANY save: valid islands, story buildings present, struct flags in sync
  // with building levels, no overlaps or invalid placements (offenders move to the nearest free spot, else go to storage).
  W.validate = function (st) {
    const fixes = [];
    if (!st.buildings || typeof st.buildings !== 'object' || Array.isArray(st.buildings)) { W.initWorld(st); fixes.push('world reset'); }
    if (!st.islands || typeof st.islands !== 'object') st.islands = {};
    st.islands.starter = st.islands.starter || { obstacles: {} }; st.islands.starter.unlocked = true;
    Object.keys(st.islands).forEach((iid) => { if (!D.ISLANDS[iid]) delete st.islands[iid]; else { st.islands[iid].obstacles = st.islands[iid].obstacles && typeof st.islands[iid].obstacles === 'object' ? st.islands[iid].obstacles : {}; Object.keys(st.islands[iid].obstacles).forEach((oid) => { const r = st.islands[iid].obstacles[oid]; if (!D.obstacleById[oid] || !r || ['removing', 'cleared'].indexOf(r.state) < 0) delete st.islands[iid].obstacles[oid]; }); } });
    if (!W.islandUnlocked(st, st.currentIsland)) st.currentIsland = 'starter';
    st.counters = st.counters && typeof st.counters === 'object' ? st.counters : {}; st.qbase = st.qbase && typeof st.qbase === 'object' ? st.qbase : {};
    D.STORY_BUILDINGS.forEach((id) => { if (!st.buildings[id]) st.buildings[id] = W.storyBuilding(id); });
    Object.keys(st.buildings).forEach((id) => {
      const b = st.buildings[id];
      if (!b || !D.BUILDINGS[b.type] || b.id !== id) { delete st.buildings[id]; fixes.push('removed unknown building ' + id); return; }
      const d = D.BUILDINGS[b.type];
      b.residents = Array.isArray(b.residents) ? b.residents.filter((u, i, a) => A.Rules && A.Rules.inst(st, u) && u !== st.active && a.indexOf(u) === i) : [];
      b.rot = b.rot && d.canRotate ? 1 : 0; b.level = Math.max(0, Math.min(d.levels.length, b.level | 0)); b.stock = Math.max(0, +b.stock || 0);
      if (['ruined', 'constructing', 'built', 'upgrading', 'stored'].indexOf(b.state) < 0) b.state = b.level >= 1 ? 'built' : d.story ? 'ruined' : 'constructing';
      if (d.story) { if (b.state === 'stored') b.state = 'built'; b.island = 'starter'; if (b.state === 'ruined' && st.struct[id]) { b.level = Math.max(1, b.level); b.state = 'built'; } if (b.level >= 1 && b.state !== 'ruined') st.struct[id] = true; else { b.state = 'ruined'; b.level = 0; delete st.struct[id]; } }
      if ((b.state === 'constructing' || b.state === 'upgrading') && !(b.endAt > 0)) b.endAt = now();
      if (b.state === 'upgrading' && !(b.toLevel > b.level)) { b.state = 'built'; }
      if (b.state === 'constructing') { b.toLevel = 1; b.level = 0; }
    });
    // keep residents within capacity and in only one home
    const seen = {};
    Object.keys(st.buildings).sort().forEach((id) => { const b = st.buildings[id]; b.residents = b.residents.filter((u) => { if (seen[u]) return false; seen[u] = true; return true; }); const room = W.capacity(b) - (b.type === 'hollow' && st.active ? 1 : 0); if (b.residents.length > Math.max(0, room)) b.residents = b.residents.slice(0, Math.max(0, room)); });
    Object.keys(st.buildings).sort((a, b) => (D.BUILDINGS[st.buildings[b].type].story ? 1 : 0) - (D.BUILDINGS[st.buildings[a].type].story ? 1 : 0) || (a < b ? -1 : 1)).forEach((id) => {
      const b = st.buildings[id];
      if (b.state === 'stored') { b.island = null; b.x = b.y = null; return; }
      if (!W.islandUnlocked(st, b.island)) { b.island = 'starter'; b.x = b.y = null; }
      const ok = Number.isInteger(b.x) && Number.isInteger(b.y) && W.canPlace(st, b.island, b.type, b.x, b.y, b.rot, id).ok;
      if (!ok) {
        const pref = D.BUILDINGS[b.type].story && D.DEFAULT_POS[id] ? D.DEFAULT_POS[id] : Number.isInteger(b.x) ? [b.x, b.y] : null;
        let spot = W.findSpot(st, b.island, b.type, b.rot, pref, id);
        if (!spot && b.rot) { spot = W.findSpot(st, b.island, b.type, 0, pref, id); if (spot) b.rot = 0; }
        if (spot) { b.x = spot[0]; b.y = spot[1]; fixes.push('moved ' + id); }
        else if (D.BUILDINGS[b.type].canStore && b.state === 'built') { b.state = 'stored'; b.island = null; b.x = b.y = null; fixes.push('stored ' + id); }
      }
    });
    st.nextBid = Math.max(st.nextBid | 0, 1 + Object.keys(st.buildings).reduce((m, k) => Math.max(m, /^b\d+$/.test(k) ? parseInt(k.slice(1), 10) : 0), 0));
    return fixes;
  };
})(typeof window !== 'undefined' ? window : globalThis);
