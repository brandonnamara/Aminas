/* Aminas — quest engine + universal objective navigation (no DOM).
   Progress comes only from real game state and real gameplay events; navigation is resolved from structured
   objective data only (never from visible text). Based on the milestone-2 WIP module, integrated and extended. */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = A.Data, W = A.World, E = A.Economy;
  const Q = (A.Quests = {});
  const Nav = (A.Nav = {});
  const R = () => A.Rules;

  /* ================= events -> counters =================
     Rules emit events; this listener turns the ones that are not already tracked in st.stats into persistent counters.
     It runs synchronously inside R.emit, so a counter can never be missed or counted twice. */
  Q.onEvent = function (st, ev) {
    if (!st) return;
    st.counters = st.counters || {};
    const c = st.counters, inc = (k, n) => { c[k] = (c[k] || 0) + (n == null ? 1 : n); }, d = ev.data || {};
    switch (ev.name) {
      case 'collected': inc('collected.' + d.kind, d.n); break;
      case 'obstacleRemoved': inc('obstacles.total'); inc('obstacles.type.' + d.type); inc('obstacles.island.' + d.island); (d.tags || []).forEach((t) => inc('obstacles.tag.' + t)); break;
      case 'placed':
        if (d.fromStorage) inc('placed.storage');
        else { inc('placed.total'); inc('placed.type.' + d.type); inc('placed.cat.' + d.cat); inc('placed.island.' + d.island); }
        break;
      case 'stored': inc('stored.total'); break;
      case 'moved': inc('moved.total'); break;
      case 'stageCleared': inc('stages.' + d.d); inc('stages.total'); break;
      case 'fed': inc('fed.total'); break;           // v0.4: counters for "during the event" objectives
      case 'hatched': inc('hatched.total'); break;
      case 'traveled': inc('visits.' + d.island); break;
    }
  };
  const counter = (st, k) => (st.counters && st.counters[k]) || 0;
  // Which counter (if any) an objective measures. Shared by progress and baselines so they can never disagree.
  Q.counterKey = function (ob) {
    switch (ob.type) {
      case 'place': return ob.fromStorage ? 'placed.storage' : ob.building ? 'placed.type.' + ob.building : ob.cat ? 'placed.cat.' + ob.cat : ob.island ? 'placed.island.' + ob.island : 'placed.total';
      case 'store': return 'stored.total';
      case 'move': return 'moved.total';
      case 'remove_obstacle': return ob.island ? 'obstacles.island.' + ob.island : ob.tag ? 'obstacles.tag.' + ob.tag : ob.obstacle ? 'obstacles.type.' + ob.obstacle : 'obstacles.total';
      case 'collect': return 'collected.' + ob.resource;
      case 'dungeon_stage': return ob.dungeon === 'any' ? 'stages.total' : 'stages.' + (ob.dungeon || 'reliquary');
      // `fresh` objectives count only what happens after the quest appears (seasonal tasks)
      case 'feed': return ob.fresh ? 'fed.total' : null;
      case 'hatch': return ob.fresh ? 'hatched.total' : null;
      default: return null;
    }
  };
  const baseKey = (q, ob) => q.id + '.' + ob.id;
  const base = (st, q, ob) => (st.qbase && st.qbase[baseKey(q, ob)]) || 0;

  /* ================= objective progress ================= */
  const maxLv = (st) => st.aminas.reduce((a, b) => Math.max(a, b.lv), 0);
  Q.objProgress = function (st, q, ob) {
    const key = Q.counterKey(ob);
    if (key) {
      // counter objectives count only what happens after the quest became available
      const total = ob.type === 'collect' ? ob.amount : ob.count || 1;
      return [Math.max(0, counter(st, key) - base(st, q, ob)), total];
    }
    switch (ob.type) {
      case 'restore': return [st.struct[ob.target] ? 1 : 0, 1];
      case 'build': return [Object.keys(st.buildings).map((k) => st.buildings[k]).filter((b) => b.type === ob.building && b.level >= 1 && b.state !== 'ruined' && (!ob.island || b.island === ob.island)).length, ob.count || 1];
      case 'upgrade': return [W.maxLevelOf(st, ob.building), ob.level];
      case 'feed': return [st.stats.fed, ob.count || 1];
      case 'unlock_island': return [W.islandUnlocked(st, ob.island) ? 1 : 0, 1];
      case 'visit_island': return [counter(st, 'visits.' + ob.island) > 0 ? 1 : 0, 1];
      case 'dungeon_clear': return [(st.dungeon[ob.dungeon] || { clears: 0 }).clears, ob.count || 1];
      case 'creature_level': return [maxLv(st), ob.count];
      case 'own_aminas': return [st.aminas.length, ob.count];
      case 'species': return [R().ownedCount(st), ob.count];
      case 'resonance': return [st.flags[ob.flag] ? 1 : 0, 1];
      case 'hatch': return [st.stats.hatched, ob.count || 1];
      case 'evolve': return [st.stats.evolved, ob.count || 1];
      case 'win_battles': return [st.stats.wins, ob.count];
      case 'restore_all': return [D.STRUCT_ORDER.filter((id) => st.struct[id]).length, D.STRUCT_ORDER.length];
      default: return [0, 1];
    }
  };
  Q.OBJECTIVE_TYPES = ['restore', 'build', 'place', 'store', 'move', 'upgrade', 'remove_obstacle', 'feed', 'collect', 'unlock_island', 'visit_island', 'dungeon_stage', 'dungeon_clear', 'creature_level', 'own_aminas', 'species', 'resonance', 'hatch', 'evolve', 'win_battles', 'restore_all'];

  // All quests the game knows right now: the static list plus the tasks of any running season (src/events.js).
  Q.list = () => (A.Events ? D.QUESTS.concat(A.Events.quests()) : D.QUESTS);
  Q.get = (id) => Q.list().find((q) => q.id === id) || null;
  Q.progress = function (st, q) {
    const objs = q.objectives.map((ob) => { const [cur, total] = Q.objProgress(st, q, ob); return { ob, cur: Math.min(cur, total), total, done: cur >= total }; });
    const req = objs.filter((o) => !o.ob.optional);
    return { objs, done: req.filter((o) => o.done).length, total: req.length, complete: req.every((o) => o.done), bonus: objs.some((o) => o.ob.optional && o.done) };
  };
  Q.status = function (st, q) {
    if (st.missions[q.id] === 'claimed') return 'claimed';
    if (q.season && !(A.Events && A.Events.isActive(q.season, q.year))) return 'locked'; // the season is over
    if (!q.after.every((a) => st.missions[a] === 'claimed')) return 'locked';
    return Q.progress(st, q).complete ? 'ready' : 'active';
  };
  Q.nextObjective = function (st, q) {
    const p = Q.progress(st, q);
    return (p.objs.find((o) => !o.done && !o.ob.optional) || p.objs.find((o) => !o.done) || p.objs[0]).ob;
  };
  // Claiming is state-validated: only 'ready' quests pay out, exactly once (the claimed flag is persisted).
  Q.claim = function (st, id) {
    const q = Q.get(id); if (!q || Q.status(st, q) !== 'ready') return { ok: false, reason: q ? Q.status(st, q) : 'invalid' };
    const p = Q.progress(st, q); st.missions[id] = 'claimed';
    const reward = Object.assign({}, q.reward), bonus = p.bonus ? { gold: Math.max(10, Math.round((q.reward.gold || 0) * 0.5)), gems: 1 } : null;
    E.gain(st, reward); if (bonus) E.gain(st, bonus);
    if (q.keep) st.flags['keep_' + q.keep] = true; // a seasonal decoration stays buildable after its season
    R().gainRankXp(st, q.side ? 15 : 25);
    if (q.finale) { st.flags.arcDone = true; R().emit('arcDone', {}); }
    R().emit('missionClaimed', { id });
    Q.scan(st);
    return { ok: true, reward, bonus };
  };
  // Records baselines for newly available quests and announces completion once.
  Q.scan = function (st) {
    st.qbase = st.qbase || {}; st.notified = st.notified || {};
    Q.list().forEach((q) => {
      const s = Q.status(st, q);
      if (s === 'locked' || s === 'claimed') return;
      q.objectives.forEach((ob) => { const k = baseKey(q, ob), key = Q.counterKey(ob); if (st.qbase[k] == null) st.qbase[k] = key ? counter(st, key) : 0; });
      if (Q.status(st, q) === 'ready' && !st.notified[q.id]) { st.notified[q.id] = true; R().emit('missionReady', { id: q.id }); }
    });
  };
  Q.visible = (st) => Q.list().filter((q) => Q.status(st, q) !== 'locked');
  Q.current = (st) => D.QUESTS.filter((q) => !q.side).find((q) => st.missions[q.id] !== 'claimed' && Q.status(st, q) !== 'locked') || null;
  Q.claimable = (st) => Q.list().filter((q) => Q.status(st, q) === 'ready').length;

  // Short human label for an objective (built from ids + data, never parsed back).
  Q.label = function (ob) {
    const bn = (id) => (D.BUILDINGS[id] ? D.BUILDINGS[id].name : id), isl = (id) => (D.ISLANDS[id] ? D.ISLANDS[id].name : id), n = ob.count || 1, s = n > 1 ? 's' : '';
    const catName = { habitat: 'habitat', production: 'production building', decor: 'decoration' };
    switch (ob.type) {
      case 'restore': return 'Restore the ' + bn(ob.target);
      case 'build': return 'Build ' + (n > 1 ? n + ' × ' : 'a ') + bn(ob.building) + (ob.island ? ' on ' + isl(ob.island) : '');
      case 'place': return ob.fromStorage ? 'Place a building from storage' : 'Place ' + (n > 1 ? n + ' ' : 'a ') + (ob.building ? bn(ob.building) : ob.cat ? catName[ob.cat] + s : 'building' + s);
      case 'store': return 'Put ' + (n > 1 ? n + ' buildings' : 'a building') + ' in storage';
      case 'move': return 'Move ' + (n > 1 ? n + ' buildings' : 'a building');
      case 'upgrade': return 'Upgrade the ' + bn(ob.building) + ' to level ' + ob.level;
      case 'remove_obstacle': return 'Remove ' + n + ' ' + (ob.tag ? ob.tag + s : ob.obstacle ? D.OBSTACLE_TYPES[ob.obstacle].name.toLowerCase() + s : 'obstacle' + s) + (ob.island ? ' on ' + isl(ob.island) : '');
      case 'feed': return 'Feed an Amina' + (n > 1 ? ' ' + n + ' times' : '');
      case 'collect': return 'Collect ' + ob.amount.toLocaleString('en-US') + ' ' + ob.resource;
      case 'unlock_island': return 'Unlock ' + isl(ob.island);
      case 'visit_island': return 'Visit ' + isl(ob.island);
      case 'dungeon_stage': return 'Clear ' + n + ' dungeon section' + s;
      case 'dungeon_clear': return 'Clear ' + D.DUNGEONS[ob.dungeon].name.replace(/^The /, 'the ');
      case 'creature_level': return 'Raise an Amina to level ' + ob.count;
      case 'own_aminas': return 'Have ' + ob.count + ' Aminas';
      case 'species': return 'Befriend ' + ob.count + ' different Aminas';
      case 'resonance': return ob.flag === 'stone' ? 'Examine the standing stone' : ob.flag === 'r1' ? 'Investigate the humming stones' : 'Wake the Dormant Spire';
      case 'hatch': return 'Hatch ' + n + ' egg' + s;
      case 'evolve': return 'Evolve an Amina';
      case 'win_battles': return 'Win ' + ob.count + ' battles';
      case 'restore_all': return 'Restore every ruin';
      default: return ob.type;
    }
  };

  /* ================= universal contextual navigation =================
     Nav.resolve(st, objective) -> plan. Plan types the UI executes:
       building | build_catalog | build_storage | build_edit | obstacles | screen | island_map | hotspot | locked | quests
     Every plan has: type, message, highlight[] (tokens matched against data-hl attributes in the UI) and optional
     island / buildingId / catalog / obstacleIds / screen / travel (island to travel to first).
     A locked plan carries `prerequisite`: the plan that fixes the blocker, so the player is never sent to a dead end. */
  const plan = (type, o) => Object.assign({ type, highlight: [], message: '' }, o);
  const cur = (st) => st.currentIsland;
  function locked(reason, text, prereq) { return plan('locked', { reason, message: text, prerequisite: prereq || null }); }
  function prereqPlan(st, req) {
    req = W.unmetReq(st, req) || req;
    if (!req) return null;
    if (req.struct) return Nav.resolve(st, { id: 'p', type: 'restore', target: req.struct });
    if (req.flag === 'r1') return Nav.resolve(st, { id: 'p', type: 'resonance', flag: 'r1' });
    if (req.flag === 'r2') return Nav.resolve(st, { id: 'p', type: 'dungeon_clear', dungeon: 'reliquary', count: 1 });
    if (req.dungeon) return Nav.resolve(st, { id: 'p', type: 'dungeon_clear', dungeon: req.dungeon, count: 1 });
    if (req.island) return Nav.resolve(st, { id: 'p', type: 'unlock_island', island: req.island });
    if (req.flag === 'hollowveil') return Nav.resolve(st, { id: 'p', type: 'dungeon_clear', dungeon: 'hollowveil', count: 1 });
    if (req.rank) return plan('quests', { message: 'Reach Caretaker Rank ' + req.rank + ' (you are rank ' + st.rank + '). Tasks, battles, restoring and clearing obstacles all give rank xp.', highlight: ['quests'] });
    return null;
  }
  // Island access: locked island -> map with the island highlighted; another unlocked island -> caller adds a travel step.
  function islandGate(st, iid) {
    if (!iid || iid === cur(st) || W.islandUnlocked(st, iid)) return null;
    return Nav.resolve(st, { id: 'p', type: 'unlock_island', island: iid });
  }
  const withTravel = (st, p, iid) => { if (iid && iid !== cur(st)) p.travel = iid; return p; };
  const blds = (st) => Object.keys(st.buildings).map((k) => st.buildings[k]);

  Nav.resolve = function (st, ob) {
    const hint = ob.hint || '';
    switch (ob.type) {
      case 'restore': {
        const b = st.buildings[ob.target], d = D.BUILDINGS[ob.target];
        if (!b || !d) return locked('invalid', 'Nothing to restore here.');
        if (st.struct[ob.target]) return withTravel(st, plan('building', { island: b.island, buildingId: ob.target, highlight: ['bld:' + ob.target], message: d.name + ' is already restored.' }), b.island);
        if (!R().reqMet(st, d.req)) return locked('requirement', W.reqText(W.unmetReq(st, d.req)), prereqPlan(st, d.req));
        const info = W.restoreInfo(st, ob.target);
        const msg = info.ok ? (hint || 'Tap the glowing ruin and Restore it (' + E.fmt(d.levels[0].cost) + ').') : 'Restoring costs ' + E.fmt(d.levels[0].cost) + '. ' + (info.text || '') + ' Collect from your buildings or explore for gold.';
        return withTravel(st, plan('building', { island: b.island, buildingId: ob.target, highlight: ['bld:' + ob.target, 'restore'], message: msg }), b.island);
      }
      case 'build': case 'place': {
        if (ob.type === 'place' && ob.fromStorage) {
          const stored = W.stored(st);
          if (!stored.length) return locked('nothing_stored', 'Nothing is in storage yet. Store a building first.', Nav.resolve(st, { id: 'p', type: 'store', count: 1 }));
          return plan('build_storage', { island: cur(st), buildingId: stored[0].id, highlight: ['storage', 'stored:' + stored[0].id], message: hint || 'Open Storage, pick the building and place it.' });
        }
        const iid0 = ob.island || cur(st);
        const type = ob.building || D.CATALOG.find((k) => (!ob.cat || D.BUILDINGS[k].cat === ob.cat) && W.canBuildInfo(st, k, iid0).ok) || D.CATALOG.find((k) => (!ob.cat || D.BUILDINGS[k].cat === ob.cat) && R().reqMet(st, D.BUILDINGS[k].req)) || D.CATALOG.find((k) => !ob.cat || D.BUILDINGS[k].cat === ob.cat);
        const d = D.BUILDINGS[type]; if (!d) return locked('invalid', 'Unknown building.');
        if (!R().reqMet(st, d.req)) return locked('requirement', W.reqText(W.unmetReq(st, d.req)), prereqPlan(st, d.req));
        const g = islandGate(st, ob.island); if (g) return g;
        const iid = ob.island || cur(st), info = W.canBuildInfo(st, type, iid);
        const msg = info.reason === 'insufficient' ? 'The ' + d.name + ' costs ' + E.fmt(d.levels[0].cost) + '. ' + info.text : info.reason === 'limit' ? info.text : (hint || 'Pick the ' + d.name + ', drag it onto free grass and confirm.');
        return withTravel(st, plan('build_catalog', { island: iid, catalog: type, highlight: ['build', 'cat:' + type], message: msg }), iid);
      }
      case 'store': case 'move': {
        const ok = (b) => b.island && W.islandUnlocked(st, b.island) && (ob.type === 'store' ? W.def(b).canStore && b.state === 'built' : W.canMove(b));
        const cand = blds(st).filter(ok).sort((a, b) => (a.island === cur(st) ? 0 : 1) - (b.island === cur(st) ? 0 : 1) || (W.def(a).story ? 1 : 0) - (W.def(b).story ? 1 : 0));
        if (!cand.length) return locked('nothing_to_' + ob.type, ob.type === 'store' ? 'Only built farms, mines, habitats and decorations can be stored. Build one first.' : 'Restore or build something first.', Nav.resolve(st, ob.type === 'store' ? { id: 'p', type: 'build', building: 'farm', count: 1 } : { id: 'p', type: 'restore', target: 'hollow' }));
        const b = cand[0];
        return withTravel(st, plan('build_edit', { island: b.island, buildingId: b.id, action: ob.type, highlight: ['build', 'bld:' + b.id, ob.type], message: hint || (ob.type === 'store' ? 'In Build mode, select the building and tap Store.' : 'In Build mode, select a building, drag it somewhere new and confirm.') }), b.island);
      }
      case 'upgrade': {
        const d = D.BUILDINGS[ob.building]; if (!d) return locked('invalid', 'Unknown building.');
        const b = blds(st).filter((x) => x.type === ob.building && x.level >= 1 && x.state !== 'stored' && x.state !== 'ruined').sort((x, y) => y.level - x.level)[0];
        if (!b) {
          const placedNotDone = blds(st).find((x) => x.type === ob.building && x.state === 'constructing');
          if (placedNotDone) return withTravel(st, plan('building', { island: placedNotDone.island, buildingId: placedNotDone.id, highlight: ['bld:' + placedNotDone.id], message: d.name + ' is still being built. Come back when it is finished.' }), placedNotDone.island);
          if (d.story) return Nav.resolve(st, { id: 'p', type: 'restore', target: ob.building });
          const stored = blds(st).find((x) => x.type === ob.building && x.state === 'stored');
          if (stored) return plan('build_storage', { island: cur(st), buildingId: stored.id, highlight: ['storage', 'stored:' + stored.id], message: 'Your ' + d.name + ' is in storage. Place it first.' });
          return Nav.resolve(st, { id: 'p', type: 'build', building: ob.building, count: 1 });
        }
        if (b.level >= ob.level) return withTravel(st, plan('building', { island: b.island, buildingId: b.id, highlight: ['bld:' + b.id], message: d.name + ' is already level ' + b.level + '.' }), b.island);
        const info = W.upgradeInfo(st, b.id);
        if (info.reason === 'locked') return locked('requirement', info.text, info.req ? prereqPlan(st, info.req) : null);
        const msg = info.reason === 'insufficient' ? 'Upgrading costs ' + E.fmt(info.cost) + '. ' + info.text : info.reason === 'busy' ? info.text + ' Wait for it to finish.' : (hint || 'Tap Upgrade on the ' + d.name + '.');
        return withTravel(st, plan('building', { island: b.island, buildingId: b.id, highlight: ['bld:' + b.id, 'upgrade'], message: msg }), b.island);
      }
      case 'remove_obstacle': {
        const g = islandGate(st, ob.island); if (g) return g;
        let iid = ob.island || cur(st);
        const match = (id) => W.obstaclesOn(st, id).filter((o) => o.state === 'present' && (!ob.tag || o.info.tags.indexOf(ob.tag) >= 0) && (!ob.obstacle || o.type === ob.obstacle));
        let list = match(iid);
        if (!list.length && !ob.island) { const other = D.ISLAND_ORDER.find((id) => W.islandUnlocked(st, id) && match(id).length); if (other) { iid = other; list = match(other); } }
        const busy = W.obstaclesOn(st, iid).filter((o) => o.state === 'removing');
        if (!list.length) return busy.length ? withTravel(st, plan('obstacles', { island: iid, obstacleIds: busy.map((o) => o.id), highlight: busy.map((o) => 'obs:' + o.id), message: 'Clearing is under way. Wait for the timers to finish.' }), iid) : plan('island_map', { island: iid, highlight: [], message: 'No matching obstacles are left on ' + D.ISLANDS[iid].name + '. Try another island.' });
        // closest to the island centre first, so the camera lands somewhere sensible
        const isl = D.ISLANDS[iid], cx = isl.grid.w / 2, cy = isl.grid.h / 2;
        list.sort((a, b) => (a.x - cx) ** 2 + (a.y - cy) ** 2 - ((b.x - cx) ** 2 + (b.y - cy) ** 2));
        const pick = list.slice(0, 12);
        const cheapest = pick.reduce((m, o) => Math.min(m, o.info.cost.gold || 0), 1e9);
        const msg = st.res.gold < cheapest ? 'Removing costs at least ' + cheapest + ' gold. Collect from your buildings or explore for more.' : (hint || 'Tap a glowing obstacle, then confirm Remove.');
        return withTravel(st, plan('obstacles', { island: iid, obstacleIds: pick.map((o) => o.id), highlight: pick.map((o) => 'obs:' + o.id), message: msg }), iid);
      }
      case 'feed': return plan('screen', { screen: 'feed', highlight: ['feed'], message: hint || 'Tap Snack or Feast on your companion card.' });
      case 'creature_level': return plan('screen', { screen: 'feed', highlight: ['feed'], message: hint || 'Feed your Aminas to level them up. Battles give experience too.' });
      case 'collect': {
        const kind = ob.resource;
        const prod = blds(st).filter((b) => W.def(b).produces === kind && b.level >= 1 && b.island && W.islandUnlocked(st, b.island) && b.state !== 'stored' && b.state !== 'ruined');
        if (!prod.length) {
          const make = kind === 'gold' ? 'mine' : kind === 'food' ? 'farm' : null;
          if (make) return locked('no_producer', 'Nothing is producing ' + kind + ' yet. Build a ' + D.BUILDINGS[make].name + '.', Nav.resolve(st, { id: 'p', type: 'build', building: make, count: 1 }));
          return locked('no_producer', 'Restore the Moon Shrine to produce gems.', Nav.resolve(st, { id: 'p', type: 'restore', target: 'moonshrine' }));
        }
        prod.sort((a, b) => (b.island === cur(st) ? 1 : 0) - (a.island === cur(st) ? 1 : 0) || W.stock(st, b.id) - W.stock(st, a.id)); const b = prod[0];
        const ready = W.stock(st, b.id) >= 1;
        return withTravel(st, plan('building', { island: b.island, buildingId: b.id, highlight: prod.filter((x) => x.island === b.island).map((x) => 'bld:' + x.id).concat(['collect']), message: ready ? (hint || 'Tap the building and Collect.') : W.def(b).name + ' is still producing. Tap it again in a minute and Collect.' }), b.island);
      }
      case 'unlock_island': {
        const isl = D.ISLANDS[ob.island]; if (!isl) return locked('invalid', 'Unknown island.');
        if (W.islandUnlocked(st, ob.island)) return plan('island_map', { island: ob.island, highlight: ['island:' + ob.island], message: isl.name + ' is already unlocked.' });
        // islands open when the Island Boss of the island before is defeated (end of its tenth dungeon)
        const by = W.islandUnlockedBy(ob.island), c = by && D.CAMPAIGN[by];
        if (!by || !c || !c.dungeons.length) return locked('requirement', isl.name + ' cannot be reached yet.');
        if (!W.islandUnlocked(st, by)) return Nav.resolve(st, { id: 'p', type: 'unlock_island', island: by });
        const next = c.dungeons.find((id) => !R().dungeonCleared(st, id)) || c.islandBoss;
        const pl = Nav.resolve(st, { id: 'p', type: 'dungeon_clear', dungeon: next, count: 1 });
        if (pl.type !== 'locked') pl.message = 'Defeat the Island Boss of ' + D.ISLANDS[by].name + ' (Dungeon 10) to reach ' + isl.name + '. Next: ' + D.DUNGEONS[next].name + '.';
        return pl;
      }
      case 'visit_island': {
        if (!W.islandUnlocked(st, ob.island)) return Nav.resolve(st, { id: 'p', type: 'unlock_island', island: ob.island });
        return plan('island_map', { island: ob.island, highlight: ['island:' + ob.island, 'travel:' + ob.island], message: 'Tap Travel on ' + D.ISLANDS[ob.island].name + '.' });
      }
      case 'dungeon_stage': case 'dungeon_clear': case 'win_battles': {
        // 'any' dungeon: the one with a run in progress, else the furthest one that is open
        const any = ob.dungeon === 'any' ? (st.run && st.run.d) || D.DUNGEON_ORDER.slice().reverse().find((x) => R().dungeonUnlocked(st, x)) || 'reliquary' : null;
        const id = any || ob.dungeon || 'reliquary', d = D.DUNGEONS[id];
        if (!R().dungeonUnlocked(st, id)) return locked('requirement', R().dungeonLockText(st, id), prereqPlan(st, R().dungeonBlocker(st, id)));
        const rec = R().dungeonRec(st, id), at = st.run && st.run.d === id ? st.run.battle : rec.next, sec = R().sectionOf(d, at);
        return plan('screen', { screen: 'dungeons', dungeon: id, highlight: ['dungeon:' + id, 'stage:' + id + ':' + sec, 'enter:' + id], message: hint || 'Tap ' + (st.run && st.run.d === id ? 'Continue' : 'Enter') + ', choose up to three Aminas and fight through the ten battles.' });
      }
      case 'own_aminas': case 'species': {
        const area = D.AREA_ORDER.find((a) => R().areaUnlocked(st, a) && D.AREAS[a].steps.some((s) => s[0] === 'find' && !st.owned[s[1]])) || D.AREA_ORDER.find((a) => R().areaUnlocked(st, a)) || 'meadow';
        return plan('screen', { screen: 'explore', area, highlight: ['area:' + area, 'explore'], message: hint || 'Explore ' + D.AREAS[area].name + ' and befriend what you find.' });
      }
      case 'evolve': return plan('screen', { screen: 'feed', highlight: ['feed'], message: hint || 'Starters can evolve at level 12. Keep feeding your companion, then confirm the evolution when it is offered.' });
      case 'hatch': {
        if (!st.struct.hatchery) return Nav.resolve(st, { id: 'p', type: 'restore', target: 'hatchery' });
        return plan('screen', { screen: 'hatchery', highlight: ['hatchery', 'hStart'], message: hint || 'Pick two level 5+ Aminas and start incubation.' });
      }
      case 'resonance': {
        if (ob.flag === 'r1') {
          if (st.flags.r1) return plan('screen', { screen: 'none', message: 'You already investigated the stones.' });
          if (!st.struct.tidegate) return locked('requirement', 'Restore the Tide Gate first.', Nav.resolve(st, { id: 'p', type: 'restore', target: 'tidegate' }));
          return withTravel(st, plan('hotspot', { island: 'starter', hit: 'disturbance', highlight: ['hit:disturbance'], message: hint || 'Tap the glowing ring of stones on the east shore.' }), 'starter');
        }
        if (ob.flag === 'stone') {
          if (!st.flags.r2) return locked('requirement', 'The standing stone appears after the Reliquary is cleared.', Nav.resolve(st, { id: 'p', type: 'dungeon_clear', dungeon: 'reliquary', count: 1 }));
          return withTravel(st, plan('hotspot', { island: 'starter', hit: 'stone', highlight: ['hit:stone'], message: hint || 'Tap the pale standing stone in the plaza.' }), 'starter');
        }
        return Nav.resolve(st, { id: 'p', type: 'dungeon_clear', dungeon: 'reliquary', count: 1 });
      }
      case 'restore_all': {
        const next = D.STRUCT_ORDER.find((id) => !st.struct[id] && R().reqMet(st, D.BUILDINGS[id].req)) || D.STRUCT_ORDER.find((id) => !st.struct[id]);
        return next ? Nav.resolve(st, { id: 'p', type: 'restore', target: next }) : plan('screen', { screen: 'none', message: 'Everything is restored.' });
      }
      default: return locked('invalid', 'Unknown objective.');
    }
  };
  // For a quest: plan for its next incomplete objective (or the claim screen if it is ready).
  Nav.forQuest = function (st, q) {
    if (Q.status(st, q) === 'ready') return plan('quests', { quest: q.id, highlight: ['claim:' + q.id], message: 'Done! Claim your reward.' });
    return Nav.resolve(st, Q.nextObjective(st, q));
  };
  // Follow the prerequisite chain to the first actionable plan (used when a target is locked).
  Nav.actionable = function (p) { let guard = 0; const via = []; while (p && p.type === 'locked' && p.prerequisite && guard++ < 8) { via.push(p.message); p = p.prerequisite; } return p ? Object.assign({}, p, { via }) : p; };

  /* ================= legacy API aliases used by older code/tests ================= */
  const Rr = A.Rules;
  Rr.mission = Q.get; Rr.missionStatus = Q.status; Rr.claim = Q.claim; Rr.scanMissions = Q.scan; Rr.currentMission = Q.current; Rr.claimable = Q.claimable;
  Rr.progress = (st, q) => { const p = Q.progress(st, q); return [p.done, p.total]; };
  Rr.on((ev) => Q.onEvent(A.State && A.State.state, ev));
})(typeof window !== 'undefined' ? window : globalThis);
