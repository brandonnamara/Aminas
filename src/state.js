/* Aminas — central game state + local save system (localStorage).
   Save schema is versioned. Old saves are migrated forward, never wiped. Every save keeps the previous good save in a
   backup slot, so a damaged write (or a crash mid-write) can be recovered on the next launch. */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = A.Data;
  const S = (A.State = {});

  S.SCHEMA = 2;
  // The key name is historical (v0.1 used it); keeping it means existing players keep their progress.
  const KEY = () => D.SAVE_KEY, BAK = () => D.SAVE_KEY + '-backup', BAD = () => D.SAVE_KEY + '-corrupt';

  S.fresh = function () {
    const st = {
      schema: S.SCHEMA,
      created: Date.now(),
      phase: 'title',            // title | intro | arrival | play
      introDone: false,
      starter: null,
      res: { gold: D.START.gold, food: D.START.food, gems: D.START.gems },
      rank: 1, rankXp: 0,
      aminas: [],                // {uid, sp, lv, xp}
      active: null,              // uid of the companion
      nextUid: 1,
      seen: {},                  // species encountered in battle
      owned: {},                 // species ever owned
      struct: {},                // restored story buildings {id:true} (kept in sync with building levels)
      flags: {},                 // r1, r2, stone, arcDone, ...
      missions: {},              // quest id -> 'claimed'
      notified: {},              // quest ids already announced as complete
      counters: {},              // event counters for quests (obstacles removed, placed, collected...)
      qbase: {},                 // per-objective counter baselines recorded when a quest becomes available
      stats: { fed: 0, wins: 0, losses: 0, hatched: 0, evolved: 0, explores: {} },
      dungeon: { reliquary: { clears: 0 } },
      pendingFind: null,         // {area, sp}
      pendingR2: false,
      egg: null,                 // {sp, parents:[spA,spB], readyAt, startedAt}
      buildings: {},             // id -> {id,type,island,x,y,rot,level,state,residents[],last,stock,endAt,toLevel}
      islands: {},               // id -> {unlocked, obstacles:{oid:{state,endAt,paid,rewarded}}}
      currentIsland: 'starter',
      nextBid: 1,
      party: [],                 // last chosen party uids
      run: null,                 // active dungeon run
      recipes: {},               // breeding recipes discovered
      settings: { music: true, sfx: true, eggSpeed: 'fast', textSpeed: 'normal', timers: 'normal', grid: true, reduceMotion: false, creatures3d: true, dayNight: true },
      story: { used: {}, slips: {}, asked: {} },
      lastSaved: 0,
    };
    if (A.World) A.World.initWorld(st);
    return st;
  };

  S.state = null;
  S.status = { loaded: false, recovered: false, migratedFrom: null, lastSaveOk: true, lastError: null };

  function storage() {
    try { const ls = root.localStorage; if (!ls) return null; return ls; } catch (e) { return null; }
  }
  const parse = (raw) => { try { const d = JSON.parse(raw); return d && typeof d === 'object' && !Array.isArray(d) ? d : null; } catch (e) { return null; } };
  const playable = (d) => !!(d && Array.isArray(d.aminas) && d.res && typeof d.res === 'object');

  S.hasSave = function () {
    const ls = storage(); if (!ls) return false;
    try { const d = parse(ls.getItem(KEY())) || parse(ls.getItem(BAK())); return !!(d && d.phase && d.phase !== 'title' && d.starter); } catch (e) { return false; }
  };

  // Merge loaded data over a fresh state so older saves gain new fields.
  function merge(base, src) {
    for (const k of Object.keys(src)) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], src[k]);
      else base[k] = src[k];
    }
    return base;
  }

  /* ---------- migrations: each step takes raw saved data of schema N and returns schema N+1 ---------- */
  S.MIGRATIONS = {
    // v0.1 (schema 1): restored structures were flags + st.habitats; v2 turns them into real buildings on a grid.
    1: function (d) {
      const W = A.World, now = Date.now(), struct = d.struct || {}, hab = d.habitats || {};
      const tmp = { struct: {}, counters: {}, qbase: {} }; W.initWorld(tmp);
      Object.keys(tmp.buildings).forEach((id) => {
        const b = tmp.buildings[id];
        if (struct[id]) {
          b.level = 1; b.state = 'built';
          const h = hab[id] || {};
          b.last = +h.last || now; b.stock = Math.max(0, +h.stock || 0);
          if (h.uid != null && id !== 'hollow' && h.uid !== d.active) b.residents = [h.uid];
        }
      });
      d.buildings = tmp.buildings; d.islands = tmp.islands; d.currentIsland = 'starter'; d.nextBid = tmp.nextBid;
      d.counters = d.counters || {}; d.qbase = d.qbase || {};
      delete d.habitats;
      d.settings = Object.assign({ timers: 'normal', grid: true, reduceMotion: false }, d.settings || {});
      d.schema = 2;
      return d;
    },
  };
  S.migrate = function (d) {
    let v = d.schema | 0 || 1;
    const from = v;
    if (v > S.SCHEMA) throw new Error('Save is from a newer version of the game (schema ' + v + ').');
    while (v < S.SCHEMA) { d = S.MIGRATIONS[v](d); v = d.schema; }
    return { data: d, from };
  };

  // Turns raw data into a valid, repaired state (or throws).
  S.hydrate = function (data) {
    if (!playable(data)) throw new Error('not a save');
    const m = S.migrate(JSON.parse(JSON.stringify(data)));
    const st = merge(S.fresh(), m.data);
    st.schema = S.SCHEMA;
    S.sanitize(st);
    return { st, from: m.from };
  };

  S.load = function () {
    const ls = storage();
    S.status = { loaded: false, recovered: false, migratedFrom: null, lastSaveOk: true, lastError: null };
    if (!ls) { S.status.lastError = 'storage-unavailable'; return false; }
    let raw = null; try { raw = ls.getItem(KEY()); } catch (e) { S.status.lastError = 'storage-unavailable'; return false; }
    const tryRaw = (r) => { const d = parse(r); if (!d) return null; try { return S.hydrate(d); } catch (e) { S.status.lastError = e.message; return null; } };
    let res = raw ? tryRaw(raw) : null;
    if (!res) {
      // main slot missing or damaged: keep a copy of the damaged data, fall back to the backup slot
      if (raw) { try { ls.setItem(BAD(), raw); } catch (e) {} }
      let bak = null; try { bak = ls.getItem(BAK()); } catch (e) {}
      res = bak ? tryRaw(bak) : null;
      if (res) S.status.recovered = true;
    }
    if (!res) return false;
    S.state = res.st; S.status.loaded = true;
    if (res.from < S.SCHEMA) { S.status.migratedFrom = res.from; try { ls.setItem(D.SAVE_KEY + '-v' + res.from, raw); } catch (e) {} }
    return true;
  };

  S.sanitize = function (st) {
    st.aminas = (st.aminas || []).filter((a) => a && D.SPECIES[a.sp]);
    const uids = {};
    st.aminas = st.aminas.filter((a) => { if (uids[a.uid]) return false; uids[a.uid] = true; return true; });
    st.aminas.forEach((a) => { a.lv = Math.max(1, Math.min(D.MAX_LEVEL, a.lv | 0)); a.xp = Math.max(0, a.xp | 0); });
    st.nextUid = Math.max(st.nextUid | 0, 1 + st.aminas.reduce((m, a) => Math.max(m, a.uid | 0), 0));
    if (!st.aminas.find((a) => a.uid === st.active)) st.active = st.aminas.length ? st.aminas[0].uid : null;
    ['gold', 'food', 'gems'].forEach((k) => { st.res[k] = Math.max(0, Math.floor(+st.res[k] || 0)); });
    st.rank = Math.max(1, Math.min(30, st.rank | 0)); st.rankXp = Math.max(0, st.rankXp | 0);
    Object.keys(st.missions || {}).forEach((k) => { if (st.missions[k] !== 'claimed') delete st.missions[k]; });
    if (st.egg && !(st.egg.readyAt > 0 && D.SPECIES[st.egg.sp])) st.egg = null;
    if (st.run && !(D.DUNGEONS[st.run.d] && Array.isArray(st.run.uids) && st.run.uids.every((u) => uids[u]))) st.run = null;
    if (['normal', 'quick'].indexOf(st.settings.timers) < 0) st.settings.timers = 'normal';
    if (A.World) A.World.validate(st);
    if (A.Quests) A.Quests.scan(st);
    if (A.Rules) A.Rules.drain();
  };

  // Writes the save. The previous good save is copied to the backup slot first.
  S.save = function () {
    const ls = storage();
    if (!ls || !S.state) { S.status.lastSaveOk = false; S.status.lastError = 'storage-unavailable'; return false; }
    try {
      S.state.lastSaved = Date.now();
      const json = JSON.stringify(S.state);
      try { const prev = ls.getItem(KEY()); if (prev && parse(prev)) ls.setItem(BAK(), prev); } catch (e) { /* backup is best-effort */ }
      ls.setItem(KEY(), json);
      S.status.lastSaveOk = true; S.status.lastError = null;
      return true;
    } catch (e) {
      S.status.lastSaveOk = false; S.status.lastError = (e && e.name) || 'save-failed';
      return false;
    }
  };

  S.reset = function () {
    const ls = storage();
    if (ls) { try { ls.removeItem(KEY()); ls.removeItem(BAK()); } catch (e) {} }
    const keep = S.state && S.state.settings ? Object.assign({}, S.state.settings) : null;
    S.state = S.fresh();
    if (keep) S.state.settings = Object.assign(S.state.settings, keep);
    return S.state;
  };

  S.newGame = function () {
    S.reset();
    S.state.phase = 'intro';
    S.save();
    return S.state;
  };

  // Backup code: base64 of the JSON so players can move saves between devices / browsers. v0.1 codes still import.
  S.exportCode = function () {
    const json = JSON.stringify(S.state);
    const b64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, 'utf8').toString('base64');
    return 'AMINAS1:' + b64;
  };
  S.importCode = function (code) {
    try {
      code = String(code || '').trim();
      if (code.indexOf('AMINAS1:') !== 0) return false;
      const b64 = code.slice(8);
      const json = typeof atob === 'function' ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, 'base64').toString('utf8');
      const res = S.hydrate(JSON.parse(json));
      S.state = res.st;
      S.save();
      return true;
    } catch (e) { return false; }
  };

  S.state = S.fresh();
})(typeof window !== 'undefined' ? window : globalThis);
