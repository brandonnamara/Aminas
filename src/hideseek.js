/* Aminas — Hide and Seek on the Starter Island (hs-redesign). The round's rules, with no DOM: an arena built from the
   island's own map data (terrain columns, buildings, obstacles, landmarks, hill scenery and the dock props), hiders
   who disguise themselves as island objects, a seeker who attacks suspicious objects, and the computer players.

   The lobby, preferences and the vote that chooses the Seeker live in rules.js (R.HideSeek.lobby / assignSeeker /
   botVotes) and are not changed here. The older grid round (newMatch / search / botSearch) is also left in place.

   Units: one island cell is one unit; x runs along the island's columns and z along its rows (a cell's centre is at
   x + 0.5, z + 0.5), the same space the voxel island draws in. Time is the match clock m.t, advanced only by
   HS.step, so cooldowns and penalties are measured in round time and cannot be skipped by leaving a menu. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, HS = R.HideSeek;
  const C = () => D.HIDESEEK, HP = 39.1918;

  /* ------------------------------------------------------------------ disguises (looks) */
  // Every object a hider can become. size: how fast it may move; r: its collision circle (box for buildings);
  // block: it stops attacks behind it; move: how it moves (the 3D layer animates it); group: the tray section.
  const L = (name, size, r, move, group, o) => Object.assign({ name, size, r, move, group }, o || {});
  const LOOKS = HS.LOOKS = {
    'o:oak': L('Old Oak', 'large', 0.72, 'tree', 'Trees', { block: 0.5 }),
    'o:pine': L('Pine Tree', 'medium', 0.3, 'tree', 'Trees'),
    'o:bush': L('Berry Bush', 'small', 0.34, 'bush', 'Bushes'),
    'o:pebble': L('Rock', 'tiny', 0.3, 'rock', 'Rocks'),
    'o:boulder': L('Boulder', 'large', 0.8, 'rock', 'Rocks', { block: 0.75 }),
    'o:stump': L('Old Stump', 'small', 0.32, 'wood', 'Trees'),
    's:pine': L('Hill Pine', 'medium', 0.28, 'tree', 'Trees'),
    's:oak': L('Young Oak', 'medium', 0.32, 'tree', 'Trees'),
    's:oakOld': L('Ancient Oak', 'large', 0.5, 'tree', 'Trees', { block: 0.4 }),
    's:birch': L('Birch', 'medium', 0.28, 'tree', 'Trees'),
    's:blossom': L('Blossom Tree', 'medium', 0.3, 'tree', 'Trees'),
    's:bush': L('Hill Bush', 'small', 0.32, 'bush', 'Bushes'),
    's:roundBush': L('Round Bush', 'small', 0.32, 'bush', 'Bushes'),
    's:flowerBush': L('Flowering Bush', 'small', 0.32, 'bush', 'Bushes'),
    's:fernLarge': L('Fern', 'small', 0.3, 'bush', 'Bushes'),
    's:tallGrass': L('Tall Grass', 'tiny', 0.26, 'bush', 'Bushes'),
    's:flowerPatch': L('Wildflowers', 'tiny', 0.26, 'bush', 'Bushes'),
    's:mushrooms': L('Mushrooms', 'tiny', 0.24, 'deco', 'Decorations'),
    's:mossyRock': L('Mossy Rock', 'small', 0.34, 'rock', 'Rocks'),
    's:crystals': L('Crystals', 'small', 0.3, 'deco', 'Rocks'),
    'x:crate': L('Crate', 'small', 0.3, 'deco', 'Decorations'),
    'x:barrel': L('Barrel', 'small', 0.26, 'deco', 'Decorations'),
    'x:sacks': L('Sacks', 'small', 0.3, 'deco', 'Decorations'),
  };
  const lookOfBuilding = (it) => 'b:' + it.type;
  HS.look = (key) => LOOKS[key] || (key && key.indexOf('b:') === 0 ? HS._bLooks[key] : null);
  HS._bLooks = {};
  const WISP = { name: 'Spirit', size: 'wisp', r: 0.26, move: 'wisp' };
  HS.speedOf = (look) => (!look || look.size === 'wisp' ? C().wispSpeed : C().speed[look.size] || 0.8);

  /* ------------------------------------------------------------------ geometry helpers */
  const hyp = Math.hypot;
  // a shape is { x, z, r } (circle) or { x, z, hx, hz } (box)
  function shapeOf(look, x, z) { return look.hx ? { x, z, hx: look.hx, hz: look.hz } : { x, z, r: look.r }; }
  function overlap(a, b, pad) {
    pad = pad || 0;
    if (a.r != null && b.r != null) return hyp(a.x - b.x, a.z - b.z) < a.r + b.r + pad;
    if (a.r == null && b.r == null) return Math.abs(a.x - b.x) < a.hx + b.hx + pad && Math.abs(a.z - b.z) < a.hz + b.hz + pad;
    const c = a.r != null ? a : b, q = a.r != null ? b : a;
    const nx = Math.max(q.x - q.hx, Math.min(c.x, q.x + q.hx)), nz = Math.max(q.z - q.hz, Math.min(c.z, q.z + q.hz));
    return hyp(c.x - nx, c.z - nz) < c.r + pad;
  }
  // nearest point of a shape to (px, pz) and the distance to its surface
  function nearest(s, px, pz) {
    if (s.r != null) { const d = hyp(px - s.x, pz - s.z) || 1e-6; return { x: s.x + (px - s.x) / d * s.r, z: s.z + (pz - s.z) / d * s.r, d: Math.max(0, d - s.r) }; }
    const nx = Math.max(s.x - s.hx, Math.min(px, s.x + s.hx)), nz = Math.max(s.z - s.hz, Math.min(pz, s.z + s.hz));
    return { x: nx, z: nz, d: hyp(px - nx, pz - nz) };
  }
  // does the segment (ax,az)-(bx,bz) pass through a shape (shrunk by k)?
  function segHits(s, ax, az, bx, bz, k) {
    const steps = Math.max(2, Math.ceil(hyp(bx - ax, bz - az) / 0.1));
    const t = s.r != null ? { x: s.x, z: s.z, r: s.r * k } : { x: s.x, z: s.z, hx: s.hx * k, hz: s.hz * k };
    for (let i = 1; i < steps; i++) { const f = i / steps, x = ax + (bx - ax) * f, z = az + (bz - az) * f; if (t.r != null ? hyp(x - t.x, z - t.z) < t.r : Math.abs(x - t.x) < t.hx && Math.abs(z - t.z) < t.hz) return true; }
    return false;
  }
  const yOf = (top) => Math.round(top / HP / 0.5) * 0.5;

  /* ------------------------------------------------------------------ the arena */
  // map: { cols, items, scenery, extras } from A.VoxIsland.mapData('starter') (or a saved copy of it in the tests).
  // opts.models(desc) may say a model is missing (the 3D layer cannot draw it); such objects are left out.
  HS.makeArena = function (map, lobby, seekerId, opts) {
    opts = opts || {}; const cfg = C(), rnd = HS.rng((lobby.seed >>> 0) + 4242);
    const cells = new Map(); let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    map.cols.forEach((c) => {
      const walk = (c.kind === 'grass' || c.kind === 'path' || c.kind === 'sand' || c.kind === 'plaza' || c.kind === 'hill') && c.top >= 0;
      cells.set(c.x + ',' + c.y, { x: c.x, z: c.y, kind: c.kind, y: c.kind === 'water' ? -1 : yOf(c.top), walk, block: false });
      if (walk) { minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x + 1); minZ = Math.min(minZ, c.y); maxZ = Math.max(maxZ, c.y + 1); }
    });
    const props = [], occupied = new Set(); let n = 0;
    const add = (look, key, model, x, z, ry, y, extra) => { const shape = shapeOf(look, x, z); const p = Object.assign({ id: 'p' + n++, key, look: look.name, model, x, z, y: y == null ? null : y, ry: ry || 0, shape, block: look.block ? (shape.r != null ? Object.assign({}, shape, { r: look.block }) : shape) : null, genuine: true }, extra || {}); props.push(p); return p; };
    const can = (d) => !opts.models || opts.models(d);
    map.items.forEach((it) => {
      for (let y = it.y; y < it.y + it.h; y++) for (let x = it.x; x < it.x + it.w; x++) occupied.add(x + ',' + y);
      const cx = it.x + it.w / 2, cz = it.y + it.h / 2;
      if (it.k === 'b') {
        const model = { src: 'b', type: it.type, art: it.art, cat: it.cat, level: it.level, state: it.state, rot: it.rot, w0: it.w0, h0: it.h0, w: it.w, h: it.h };
        if (!can(model)) return;
        const key = lookOfBuilding(it), look = HS._bLooks[key] || (HS._bLooks[key] = { name: (it.name || it.type) + (it.state === 'ruined' ? ' (ruins)' : ''), size: 'huge', hx: it.w / 2 * 0.9, hz: it.h / 2 * 0.9, move: 'building', group: 'Buildings', block: true, w: it.w, h: it.h });
        add(look, key, model, cx, cz, 0, 0);
      } else if (it.k === 'o') {
        const key = 'o:' + it.type, look = LOOKS[key], model = { src: 'o', type: it.type, seed: it.seed, w: it.w, h: it.h };
        if (!look || !can(model)) return; add(look, key, model, cx, cz, (it.seed % 4) * Math.PI / 2, 0);
      } else if (it.k === 'l' && it.kind === 'stones') {
        // the standing stones: solid, not a disguise
        props.push({ id: 'p' + n++, key: null, look: 'Standing Stones', model: null, x: cx, z: cz, ry: 0, shape: { x: cx, z: cz, r: 1.1 }, block: { x: cx, z: cz, r: 0.9 }, genuine: true, fixed: true });
      }
    });
    (map.scenery || []).forEach((sc) => {
      if (sc.cx < 0 || occupied.has(sc.cx + ',' + sc.cz)) return; const key = 's:' + sc.kind, look = LOOKS[key];
      const model = { src: 's', kind: sc.kind, seed: sc.seed, s: sc.s, still: !!sc.still };
      if (!look || !can(model)) return;
      const shape = shapeOf(look, sc.x, sc.z); shape.r *= Math.min(1, sc.s); const p = add(look, key, model, sc.x, sc.z, sc.ry, sc.y); p.shape = shape;
    });
    (map.extras || []).forEach((e) => { const key = 'x:' + e.kind, look = LOOKS[key], model = { src: 'x', kind: e.kind }; if (!look || !can(model)) return; add(look, key, model, e.x, e.z, e.ry || 0, e.y || 0, { dock: true }); });
    props.forEach((p) => { const c = cells.get(Math.floor(p.x) + ',' + Math.floor(p.z)); if (p.y == null) p.y = c ? Math.max(0, c.y) : 0; p.reach = !!(c && c.walk); });
    // cells a computer player should route around: inside buildings, boulders, old oaks and the stones
    cells.forEach((c) => { if (!c.walk) return; const pt = { x: c.x + 0.5, z: c.z + 0.5, r: 0.3 }; if (props.some((p) => overlap(pt, p.shape))) c.block = true; });
    // the disguises on offer: every eligible look on the island, buildings first
    const looks = [], seen = {};
    props.forEach((p) => { if (!p.key || seen[p.key]) return; seen[p.key] = 1; looks.push(p.key); });
    const gOrder = ['Buildings', 'Trees', 'Bushes', 'Rocks', 'Decorations'];
    looks.sort((a, b) => gOrder.indexOf(HS.look(a).group) - gOrder.indexOf(HS.look(b).group));
    // where everyone starts: the plaza (or the middle of the island)
    const plaza = map.items.find((it) => it.k === 'l' && it.kind === 'plaza');
    let sx = plaza ? plaza.x + plaza.w / 2 : (minX + maxX) / 2, sz = plaza ? plaza.y + plaza.h / 2 : (minZ + maxZ) / 2;
    const m = { v: 2, t: 0, phase: 'prep', over: false, result: null, seed: lobby.seed, cells, props, looks, bounds: { minX, maxX, minZ, maxZ }, events: [], evN: 0, start: { x: sx, z: sz } };
    const sp = lobby.players.find((p) => p.id === seekerId);
    m.seeker = { id: sp.id, name: sp.name, bot: sp.bot, x: sx, z: sz, face: Math.PI * 0.75, nextAttack: 0, penaltyUntil: 0, attacks: 0, hits: 0, misses: 0, whiffs: 0, swingAt: -9, moved: 0, look: opts.seekerLook || (cfg.seekerLook && cfg.seekerLook[sp.name]) || 'male' };
    const hs = lobby.players.filter((p) => p.id !== seekerId);
    m.hiders = hs.map((p, i) => { const a = (i / hs.length) * Math.PI * 2 + 0.4, h = { id: p.id, name: p.name, bot: p.bot, x: sx + Math.cos(a) * 1.4, z: sz + Math.sin(a) * 1.4, face: a, key: null, look: null, model: null, shape: null, nextMorph: 0, morphs: 0, moved: 0, found: false, foundAt: null, lastMove: -9, ry: 0 }; h.shape = { x: h.x, z: h.z, r: WISP.r }; return h; });
    m.hiders.forEach((h) => { if (!HS.free(m, h.shape, h.id)) { const q = HS.findSpot(m, WISP, h.x, h.z, 3, h.id); if (q) { h.x = q.x; h.z = q.z; h.shape.x = q.x; h.shape.z = q.z; } } });
    m.rnd = rnd;
    return m;
  };
  HS.cell = (m, x, z) => m.cells.get(Math.floor(x) + ',' + Math.floor(z));
  HS.groundY = (m, x, z) => { const c = HS.cell(m, x, z); return c ? Math.max(0, c.y) : 0; };
  // is a shape standing fully on walkable land with no step higher than half a unit across it?
  HS.onLand = function (m, s) {
    const pts = s.r != null ? [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]].map(([a, b]) => [s.x + a * s.r, s.z + b * s.r])
      : [[0, 0], [1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [s.x + a * s.hx, s.z + b * s.hz]);
    let lo = 1e9, hi = -1e9;
    for (const [x, z] of pts) { const c = HS.cell(m, x, z); if (!c || !c.walk) return false; lo = Math.min(lo, c.y); hi = Math.max(hi, c.y); }
    return hi - lo <= 0.5 + 1e-6 || s.r != null && s.r < 0.35;
  };
  // is a shape clear of every other object (genuine scenery, other hiders, the seeker)?
  HS.free = function (m, s, selfId, pad) {
    pad = pad == null ? 0.02 : pad;
    for (const p of m.props) if (overlap(s, p.shape, pad)) return false;
    for (const h of m.hiders) if (h.id !== selfId && !h.found && overlap(s, h.shape, pad)) return false;
    if (selfId !== m.seeker.id && overlap(s, { x: m.seeker.x, z: m.seeker.z, r: 0.28 }, pad)) return false;
    return true;
  };
  HS.valid = (m, look, x, z, selfId) => { const s = shapeOf(look, x, z); return HS.onLand(m, s) && HS.free(m, s, selfId); };
  // the nearest valid spot for a look within `max` units of (x, z), searched in rings
  HS.findSpot = function (m, look, x, z, max, selfId) {
    if (HS.valid(m, look, x, z, selfId)) return { x, z };
    for (let r = 0.15; r <= max; r += 0.15) { const n = Math.max(8, Math.round(r * 12)); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (HS.valid(m, look, px, pz, selfId)) return { x: px, z: pz }; } }
    return null;
  };
  // which genuine object each look should copy: the nearest one (so a disguise is an exact twin of a neighbour)
  HS.sourceFor = function (m, key, x, z) {
    let best = null, bd = 1e9; m.props.forEach((p) => { if (p.key !== key) return; const d = hyp(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }); return best;
  };
  const ev = (m, e) => { e.t = m.t; e.n = ++m.evN; m.events.push(e); if (m.events.length > 60) m.events.shift(); return e; };

  /* ------------------------------------------------------------------ hiders */
  HS.morphReady = (m, h) => m.t >= h.nextMorph;
  HS.morphWait = (m, h) => Math.max(0, h.nextMorph - m.t);
  // Disguise a hider as an island object. The 10-second cooldown starts at a successful transformation and is kept
  // on the match clock. If the hider's spot is too tight for the object, the nearest spot within half a unit is used.
  HS.disguise = function (m, id, key) {
    const h = m.hiders.find((q) => q.id === id), look = HS.look(key);
    if (!h || m.over) return { ok: false, reason: 'over' };
    if (h.found) return { ok: false, reason: 'found' };
    if (!look || m.looks.indexOf(key) < 0) return { ok: false, reason: 'look' };
    if (!HS.morphReady(m, h)) return { ok: false, reason: 'cooldown', wait: HS.morphWait(m, h) };
    if (key === h.key) return { ok: false, reason: 'same' };
    const spot = HS.findSpot(m, look, h.x, h.z, look.size === 'huge' ? 0.9 : 0.5, h.id);
    if (!spot) return { ok: false, reason: 'room' };
    const src = HS.sourceFor(m, key, spot.x, spot.z);
    h.x = spot.x; h.z = spot.z; h.key = key; h.look = look.name; h.model = Object.assign({}, src.model); h.ry = src.ry; h.ys = src.model.s || 1;
    h.shape = shapeOf(look, h.x, h.z); if (h.shape.r != null && src.shape.r != null) h.shape.r = src.shape.r;
    h.nextMorph = m.t + C().morphCooldown; h.morphs++;
    ev(m, { type: 'morph', id: h.id, key, x: h.x, z: h.z });
    return { ok: true, key, x: h.x, z: h.z };
  };
  // Move an entity (a hider or the seeker) by a direction (|d| <= 1) for dt seconds at its speed. Disguised objects
  // move at their own slow pace; nobody can pass through scenery, other players, or off the land.
  HS.move = function (m, id, dx, dz, dt) {
    if (m.over) return 0;
    const isS = id === m.seeker.id, e = isS ? m.seeker : m.hiders.find((q) => q.id === id);
    if (!e || e.found) return 0;
    if (isS && m.phase === 'prep') return 0; // the Seeker waits while the hiders hide
    const len = hyp(dx, dz); if (len < 0.05) return 0;
    if (len > 1) { dx /= len; dz /= len; }
    const sp = isS ? (e.bot ? C().botSeekerSpeed : C().seekerSpeed) : HS.speedOf(e.key ? HS.look(e.key) : null);
    const step = Math.min(dt, 0.25) * sp, mx = dx * step, mz = dz * step;
    const shapeAt = (x, z) => (isS ? { x, z, r: 0.28 } : e.shape.r != null ? { x, z, r: e.shape.r } : { x, z, hx: e.shape.hx, hz: e.shape.hz });
    const ok = (x, z) => { const s = shapeAt(x, z); if (!HS.onLand(m, s)) return false; const c0 = HS.cell(m, e.x, e.z), c1 = HS.cell(m, x, z); if (c0 && c1 && Math.abs(c1.y - c0.y) > 0.5 + 1e-6) return false; return HS.free(m, s, e.id, 0); };
    let nx = e.x, nz = e.z;
    if (ok(e.x + mx, e.z + mz)) { nx = e.x + mx; nz = e.z + mz; } else if (ok(e.x + mx, e.z)) nx = e.x + mx; else if (ok(e.x, e.z + mz)) nz = e.z + mz;
    const d = hyp(nx - e.x, nz - e.z);
    e.face = Math.atan2(dz, dx);
    if (d > 1e-4) { e.x = nx; e.z = nz; e.moved += d; if (!isS) { e.shape.x = nx; e.shape.z = nz; e.lastMove = m.t; } }
    return d;
  };

  /* ------------------------------------------------------------------ the seeker */
  // What the Seeker would hit now: the nearest object within reach, in front (within the cone), with nothing solid
  // in between. Looking at it changes nothing (no penalty for approaching or inspecting).
  HS.target = function (m, opt) {
    const s = m.seeker, cfg = C(), reach = (opt && opt.reach) || cfg.reach, cone = cfg.cone * Math.PI / 180;
    const fx = Math.cos(s.face), fz = Math.sin(s.face), objs = [];
    m.props.forEach((p) => { if (p.reach !== false || p.dock) objs.push({ o: p, kind: 'prop', shape: p.shape }); });
    m.hiders.forEach((h) => { if (!h.found) objs.push({ o: h, kind: 'hider', shape: h.shape }); });
    let best = null;
    objs.forEach((c) => {
      const q = nearest(c.shape, s.x, s.z); if (q.d > reach) return;
      if (q.d > 0.2) { const vx = q.x - s.x, vz = q.z - s.z, l = hyp(vx, vz) || 1; const vc = c.shape.r != null ? hyp(c.shape.x - s.x, c.shape.z - s.z) : 0; const cx = c.shape.x - s.x, cz = c.shape.z - s.z; const a1 = Math.acos(Math.max(-1, Math.min(1, (vx * fx + vz * fz) / l))), a2 = vc ? Math.acos(Math.max(-1, Math.min(1, (cx * fx + cz * fz) / vc))) : a1; if (Math.min(a1, a2) > cone) return; }
      // line of sight: nothing solid between the Seeker and the object (walls, boulders, big trees, disguised buildings)
      const blocked = m.props.some((p) => p !== c.o && p.block && segHits(p.block, s.x, s.z, q.x, q.z, 0.92)) || m.hiders.some((h) => h !== c.o && !h.found && h.key && h.key.indexOf('b:') === 0 && segHits(h.shape, s.x, s.z, q.x, q.z, 0.92));
      if (blocked) return;
      if (!best || q.d < best.d) best = { id: c.o.id, d: q.d, x: c.shape.x, z: c.shape.z, kind: c.kind };
    });
    return best;
  };
  HS.inspect = (m) => { const t = HS.target(m); return t ? { id: t.id, x: t.x, z: t.z, d: t.d } : null; }; // no kind: it does not tell
  HS.attackReady = (m) => m.phase === 'seek' && !m.over && m.t >= m.seeker.nextAttack;
  HS.penaltyLeft = (m) => Math.max(0, m.seeker.penaltyUntil - m.t);
  // An attack. A disguised hider is revealed; genuine scenery costs a 3-second penalty; a swing at nothing costs only
  // the swing itself.
  HS.attack = function (m) {
    if (m.over || m.phase !== 'seek') return { ok: false, reason: 'phase' };
    const s = m.seeker; if (m.t < s.nextAttack) return { ok: false, reason: s.penaltyUntil > m.t ? 'penalty' : 'swing', wait: s.nextAttack - m.t };
    const t = HS.target(m); s.attacks++; s.swingAt = m.t;
    if (!t) { s.whiffs++; s.nextAttack = m.t + C().swing; ev(m, { type: 'whiff', x: s.x + Math.cos(s.face) * 0.8, z: s.z + Math.sin(s.face) * 0.8 }); return { ok: true, hit: null }; }
    if (t.kind === 'hider') {
      const h = m.hiders.find((q) => q.id === t.id); h.found = true; h.foundAt = m.t; s.hits++; s.nextAttack = m.t + C().swing;
      ev(m, { type: 'reveal', id: h.id, key: h.key, x: h.x, z: h.z }); HS.check2(m);
      return { ok: true, hit: 'hider', id: h.id };
    }
    s.misses++; s.nextAttack = s.penaltyUntil = m.t + C().missPenalty;
    ev(m, { type: 'miss', id: t.id, x: t.x, z: t.z });
    return { ok: true, hit: 'scenery', id: t.id };
  };
  HS.check2 = function (m) {
    if (m.over) return m.result;
    if (m.hiders.every((h) => h.found)) { m.over = true; m.result = 'seeker'; m.endT = m.t; ev(m, { type: 'end', result: 'seeker' }); }
    else if (m.phase === 'seek' && m.t >= C().prep + C().seconds) { m.over = true; m.result = 'hiders'; m.endT = m.t; ev(m, { type: 'end', result: 'hiders' }); }
    return m.result;
  };
  HS.timeLeft = (m) => (m.phase === 'prep' ? C().prep - m.t : Math.max(0, C().prep + C().seconds - m.t));
  // Leaving the round early: a Seeker who leaves concedes; a hider who leaves counts as found.
  HS.leave = function (m, id) { if (m.over) return; if (id === m.seeker.id) { m.over = true; m.result = 'hiders'; m.endT = m.t; m.left = id; } else { const h = m.hiders.find((q) => q.id === id); if (h && !h.found) { h.found = true; h.foundAt = m.t; h.left = true; } m.left = id; HS.check2(m); } };

  /* ------------------------------------------------------------------ the clock */
  // Advance the round by dt seconds and let the computer players act. `you` is the player's id (never driven here).
  HS.step = function (m, dt, you) {
    if (m.over) return;
    dt = Math.min(Math.max(dt, 0), 0.25); m.t += dt;
    if (m.phase === 'prep' && m.t >= C().prep) {
      // hiding time is over: anyone still in spirit form takes the look of the nearest object
      m.hiders.forEach((h) => { if (!h.found && !h.key) HS.autoDisguise(m, h); });
      m.phase = 'seek'; ev(m, { type: 'seek' });
    }
    m.hiders.forEach((h) => { if (h.bot && h.id !== you && !h.found) HS.botHider(m, h, dt); });
    if (m.seeker.bot && m.seeker.id !== you && m.phase === 'seek') HS.botSeeker(m, dt);
    HS.check2(m);
  };
  HS.autoDisguise = function (m, h) {
    // the nearest genuine look that fits here; if nothing fits, the nearest place where a small one does
    const by = m.props.filter((p) => p.key).map((p) => ({ p, d: hyp(p.x - h.x, p.z - h.z) })).sort((a, b) => a.d - b.d);
    const tried = {};
    for (const { p } of by) { if (tried[p.key]) continue; tried[p.key] = 1; const look = HS.look(p.key); if (look.size === 'huge') continue; h.nextMorph = 0; if (HS.disguise(m, h.id, p.key).ok) { h.auto = true; return true; } if (Object.keys(tried).length > 6) break; }
    const small = m.looks.find((k) => HS.look(k).size === 'small') || m.looks[0], look = HS.look(small), q = HS.findSpot(m, look, h.x, h.z, 6, h.id);
    if (q) { h.x = q.x; h.z = q.z; h.shape = shapeOf(WISP, q.x, q.z); h.nextMorph = 0; if (HS.disguise(m, h.id, small).ok) { h.auto = true; return true; } }
    return false;
  };

  /* ------------------------------------------------------------------ routes for computer players */
  // A* over walkable cells (route around buildings and big rocks), then straightened where the line is clear.
  HS.path = function (m, x0, z0, x1, z1) {
    const key = (x, z) => x + ',' + z, sx = Math.floor(x0), sz = Math.floor(z0), tx = Math.floor(x1), tz = Math.floor(z1);
    const okc = (x, z) => { const c = m.cells.get(key(x, z)); return c && c.walk && (!c.block || (x === tx && z === tz) || (x === sx && z === sz)); };
    if (!okc(tx, tz)) return null;
    const open = [[sx, sz]], g = new Map([[key(sx, sz), 0]]), from = new Map(), hcost = (x, z) => Math.abs(x - tx) + Math.abs(z - tz);
    const f = new Map([[key(sx, sz), hcost(sx, sz)]]); let guard = 0;
    while (open.length && guard++ < 2000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (f.get(key(...open[i])) < f.get(key(...open[bi]))) bi = i;
      const [cx, cz] = open.splice(bi, 1)[0];
      if (cx === tx && cz === tz) { const out = []; let k = key(cx, cz); while (from.has(k)) { const [a, b] = k.split(',').map(Number); out.unshift([a + 0.5, b + 0.5]); k = from.get(k); } if (out.length) out.pop(); out.push([x1, z1]); return smooth(m, x0, z0, out); }
      const c0 = m.cells.get(key(cx, cz));
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx + dx, nz = cz + dz; if (!okc(nx, nz)) continue;
        if (dx && dz && (!okc(cx + dx, cz) || !okc(cx, cz + dz))) continue;
        const c1 = m.cells.get(key(nx, nz)); if (Math.abs(c1.y - c0.y) > 0.5) continue;
        const ng = g.get(key(cx, cz)) + (dx && dz ? 1.414 : 1); if (g.has(key(nx, nz)) && g.get(key(nx, nz)) <= ng) continue;
        g.set(key(nx, nz), ng); f.set(key(nx, nz), ng + hcost(nx, nz)); from.set(key(nx, nz), key(cx, cz)); if (!open.some((o) => o[0] === nx && o[1] === nz)) open.push([nx, nz]);
      }
    }
    return null;
  };
  // drop waypoints that a straight walk can skip (nothing solid on the line, all of it walkable at one level)
  function smooth(m, x0, z0, pts) {
    const clear = (ax, az, bx, bz) => { const n = Math.ceil(hyp(bx - ax, bz - az) / 0.2); const c0 = HS.cell(m, ax, az); for (let i = 1; i <= n; i++) { const f = i / n, x = ax + (bx - ax) * f, z = az + (bz - az) * f, c = HS.cell(m, x, z), q = { x, z, r: 0.36 }; if (!c || !c0 || Math.abs(c.y - c0.y) > 0.01 || !HS.onLand(m, q)) return false; for (const p of m.props) if (overlap(q, p.shape)) return false; } return true; };
    const out = []; let cx = x0, cz = z0, i = 0;
    while (i < pts.length) { let j = pts.length - 1; while (j > i && !clear(cx, cz, pts[j][0], pts[j][1])) j--; out.push(pts[j]); cx = pts[j][0]; cz = pts[j][1]; i = j + 1; }
    return out;
  }
  // walk an entity along its route; returns true on arrival
  function follow(m, e, ai, dt, tol) {
    if (!ai.route || !ai.route.length) return true;
    const [wx, wz] = ai.route[0], dx = wx - e.x, dz = wz - e.z, d = hyp(dx, dz);
    // progress towards the waypoint: no closer for a while means stuck; stuck right next to it counts as there
    if (ai.wp !== ai.route[0]) { ai.wp = ai.route[0]; ai.pd = d; ai.pt = 0; } else if (d < ai.pd - 0.05) { ai.pd = d; ai.pt = 0; } else ai.pt += dt;
    if (d < (ai.route.length === 1 ? tol || 0.25 : 0.35) || ai.pt > 0.6 && d < 1.2) { ai.route.shift(); ai.stuck = 0; return !ai.route.length; }
    let moved = HS.move(m, e.id, dx / d, dz / d, dt);
    // blocked (by another player or a corner): try slanting around it
    if (moved < 1e-4) { const a0 = Math.atan2(dz, dx); for (const da of [0.7, -0.7, 1.4, -1.4]) { const sgn = ai.side || 1; moved = HS.move(m, e.id, Math.cos(a0 + da * sgn), Math.sin(a0 + da * sgn), dt); if (moved > 1e-4) break; } if (moved < 1e-4) ai.side = -(ai.side || 1); }
    ai.stuck = ai.pt;
    return false;
  }
  const routeTo = (m, e, ai, x, z) => { const r = HS.path(m, e.x, e.z, x, z); ai.route = r || [[x, z]]; ai.stuck = 0; return !!r; };

  /* ------------------------------------------------------------------ computer hiders */
  // Pick a believable disguise and a spot near genuine objects of the same kind, walk there and transform. During
  // the search: mostly keep still, now and then shift a little when the Seeker is far away, and react when the
  // Seeker comes close or attacks something nearby (freeze, creep away, or change disguise if the cooldown allows).
  function planHide(m, h, near) {
    const r = m.rnd, cand = m.props.filter((p) => p.key && p.reach && HS.look(p.key).size !== 'huge' && (!near || hyp(p.x - near.x, p.z - near.z) < near.r));
    if (!cand.length) return null;
    const taken = m.hiders.filter((q) => q !== h && q.ai && q.ai.goal).map((q) => q.ai.goal);
    for (let tries = 0; tries < 30; tries++) {
      const p = cand[Math.floor(r() * cand.length)], look = HS.look(p.key), a = r() * Math.PI * 2, dd = (p.shape.r || 0.6) + look.r + 0.25 + r() * 1.1;
      const x = p.x + Math.cos(a) * dd, z = p.z + Math.sin(a) * dd;
      if (taken.some((g) => hyp(g.x - x, g.z - z) < 2.2)) continue;
      if (hyp(x - m.seeker.x, z - m.seeker.z) < (near ? 2.5 : 4)) continue;
      if (!HS.valid(m, look, x, z, h.id) || !HS.valid(m, h.key ? HS.look(h.key) : WISP, x, z, h.id)) continue;
      return { x, z, key: p.key };
    }
    return null;
  }
  HS.botHider = function (m, h, dt) {
    const ai = h.ai || (h.ai = { mode: 'go', think: 0, goal: null, route: null, stuck: 0, nextShift: 18 + m.rnd() * 14, episode: false });
    ai.think -= dt;
    if (m.phase === 'prep') {
      if (!ai.goal) { ai.goal = planHide(m, h) || { x: h.x, z: h.z, key: (HS.sourceFor(m, m.looks.find((k) => HS.look(k).size === 'small'), h.x, h.z) || {}).key }; routeTo(m, h, ai, ai.goal.x, ai.goal.z); }
      if (!h.key) {
        const there = follow(m, h, ai, dt, 0.3);
        if (there || ai.stuck > 1.2 || m.t > C().prep - 2.5) { if (!HS.disguise(m, h.id, ai.goal.key).ok) { ai.goal = planHide(m, h, { x: h.x, z: h.z, r: 4 }) || ai.goal; routeTo(m, h, ai, ai.goal.x, ai.goal.z); if (m.t > C().prep - 2.5) HS.autoDisguise(m, h); } else { ai.mode = 'hide'; ai.route = null; } }
      } else if (ai.route && ai.route.length) follow(m, h, ai, dt, 0.3);
      return;
    }
    if (!h.key) { HS.autoDisguise(m, h); return; }
    if (ai.mode === 'move') { if (follow(m, h, ai, dt, 0.3) || ai.stuck > 1) { ai.mode = 'hide'; ai.route = null; } return; }
    if (ai.think > 0) return; ai.think = 0.4 + m.rnd() * 0.3;
    const s = m.seeker, d = hyp(s.x - h.x, s.z - h.z), toMe = Math.atan2(h.z - s.z, h.x - s.x), facing = Math.cos(toMe - s.face) > 0.6;
    const nearHit = m.events.some((e) => (e.type === 'miss' || e.type === 'reveal') && m.t - e.t < 1.2 && hyp(e.x - h.x, e.z - h.z) < 3);
    if (d > 5.5) ai.episode = false;
    if (!ai.episode && (d < 3.4 && facing || nearHit)) {
      ai.episode = true; const r = m.rnd();
      if (r < 0.55) return; // freeze: the best disguise is a still one
      if (r < 0.85 || !HS.morphReady(m, h)) { // creep away from the Seeker
        const look = HS.look(h.key); for (let i = 0; i < 12; i++) { const a = toMe + (m.rnd() - 0.5) * 1.6, dd = 2 + m.rnd() * 2, x = h.x + Math.cos(a) * dd, z = h.z + Math.sin(a) * dd; if (HS.valid(m, look, x, z, h.id)) { ai.route = [[x, z]]; ai.mode = 'move'; return; } }
        return;
      }
      // change disguise to another look that is common right here
      const near = m.props.filter((p) => p.key && p.key !== h.key && HS.look(p.key).size !== 'huge' && hyp(p.x - h.x, p.z - h.z) < 4);
      if (near.length) HS.disguise(m, h.id, near[Math.floor(m.rnd() * near.length)].key);
      return;
    }
    if (d > 8 && m.t > C().prep + ai.nextShift) {
      ai.nextShift = m.t - C().prep + 16 + m.rnd() * 18;
      if (m.rnd() < 0.5) { const g = planHide(m, h, { x: h.x, z: h.z, r: 5 }); if (g && g.key === h.key) { routeTo(m, h, ai, g.x, g.z); ai.mode = 'move'; return; } }
      // a lonely disguise (nothing like it nearby) takes the look of its neighbours when the cooldown allows
      const twins = m.props.some((p) => p.key === h.key && hyp(p.x - h.x, p.z - h.z) < 3.5);
      if (!twins && HS.morphReady(m, h)) { const n2 = m.props.filter((p) => p.key && HS.look(p.key).size !== 'huge' && hyp(p.x - h.x, p.z - h.z) < 3.5); if (n2.length) HS.disguise(m, h.id, n2[0].key); }
    }
  };

  /* ------------------------------------------------------------------ computer seeker */
  // Sweeps the island along a tour of waypoints, watching what it can see. Anything it sees move becomes a target at
  // once; an object it does not remember from the island (a disguise), a building twin, or something alone among
  // different scenery may catch its eye; now and then it suspects genuine scenery too (and pays the penalty).
  function tour(m) {
    const pts = []; m.cells.forEach((c) => { if (c.walk && !c.block && c.x % 4 === 1 && c.z % 4 === 1) pts.push([c.x + 0.5, c.z + 0.5]); });
    const out = []; let cur = [m.seeker.x, m.seeker.z];
    while (pts.length) { let bi = 0, bd = 1e9; pts.forEach((p, i) => { const d = hyp(p[0] - cur[0], p[1] - cur[1]); if (d < bd) { bd = d; bi = i; } }); cur = pts.splice(bi, 1)[0]; out.push(cur); }
    return out;
  }
  const sees = (m, x, z, tx, tz, R0) => hyp(tx - x, tz - z) < R0 && !m.props.some((p) => p.block && segHits(p.block, x, z, tx, tz, 0.9));
  HS.botSeeker = function (m, dt) {
    const s = m.seeker, r = m.rnd;
    const ai = s.ai || (s.ai = { tour: tour(m), ti: 0, route: null, sus: {}, seen: {}, cleared: {}, think: 0, target: null, recall: {} });
    if (!ai.recallSet) { ai.recallSet = 1; m.props.forEach((p) => (ai.recall[p.id] = r() < 0.94)); }
    // a moment to look around before the hunt starts (no instant pounce on whatever stands by the start)
    if (m.t < C().prep + 1.5) { s.face += dt * 1.6; return; }
    ai.think -= dt;
    if (ai.think <= 0) {
      ai.think = 0.25;
      // look around
      const objs = m.props.filter((p) => p.reach || p.dock).map((p) => ({ id: p.id, x: p.x, z: p.z, key: p.key, gen: true })).concat(m.hiders.filter((h) => !h.found).map((h) => ({ id: h.id, x: h.x, z: h.z, key: h.key, gen: false, h })));
      objs.forEach((o) => {
        if (!sees(m, s.x, s.z, o.x, o.z, 6.5)) return;
        const prev = ai.seen[o.id];
        if (prev && hyp(prev.x - o.x, prev.z - o.z) > 0.08) { ai.sus[o.id] = Math.max(ai.sus[o.id] || 0, 1); ai.cleared[o.id] = false; } // it moved!
        // a first look from afar, and a second, closer look when it passes within 2.5 units
        const close = hyp(o.x - s.x, o.z - s.z) < 2.5;
        if (!prev || close && !prev.close) {
          let p = 0;
          if (o.gen) p = ai.recall[o.id] ? 0 : 0.35; // a genuine object it does not remember well
          else { p = 0.42; if (o.key && o.key.indexOf('b:') === 0) p += 0.45; if (!m.props.some((q) => q.key === o.key && hyp(q.x - o.x, q.z - o.z) < 3.5)) p += 0.2; if (!o.key) p = 1; }
          if (prev) p *= 0.8;
          if (r() < p) ai.sus[o.id] = Math.max(ai.sus[o.id] || 0, 0.6 + r() * 0.3);
        }
        ai.seen[o.id] = { x: o.x, z: o.z, close: close || !!(prev && prev.close) };
      });
      // choose what to investigate: the most suspicious object nearby that it has not cleared
      let best = null, bs = 0; Object.keys(ai.sus).forEach((id) => { const sc = ai.sus[id]; if (sc < 0.5 || ai.cleared[id]) return; const o = objs.find((q) => q.id === id); if (!o) { delete ai.sus[id]; return; } const d = hyp(o.x - s.x, o.z - s.z); const v = sc - d * 0.04; if (d < 10 && v > bs) { bs = v; best = o; } });
      if (best && (!ai.target || ai.target.id !== best.id)) { ai.target = { id: best.id, tt: 0, ang: 0 }; ai.route = null; }
      if (!best) ai.target = null;
    }
    if (ai.target) {
      const p = m.props.find((q) => q.id === ai.target.id), h = m.hiders.find((q) => q.id === ai.target.id && !q.found);
      const o = p || h; if (!o) { ai.target = null; return; }
      ai.target.tt += dt; if (ai.target.tt > 6) { ai.cleared[o.id] = true; ai.target = null; ai.route = null; return; } // cannot get at it: move on
      const sh = o.shape, q = nearest(sh, s.x, s.z);
      if (q.d < C().reach * 0.8) {
        s.face = Math.atan2(sh.z - s.z, sh.x - s.x);
        const t = HS.target(m);
        if (t && t.id === o.id) { if (HS.attackReady(m)) { const res = HS.attack(m); if (res.hit) { ai.cleared[o.id] = true; ai.sus[o.id] = 0; ai.target = null; } } return; }
        // something else is in the way: step around
        HS.move(m, s.id, Math.cos(s.face + 1.2), Math.sin(s.face + 1.2), dt); return;
      }
      if (!ai.route || !ai.route.length || ai.stuck > 0.8) { const a = Math.atan2(s.z - sh.z, s.x - sh.x) + ai.target.ang; ai.target.ang += 1.1; const ln = (sh.r != null ? sh.r : Math.max(sh.hx, sh.hz)) + 0.55; routeTo(m, s, ai, sh.x + Math.cos(a) * ln, sh.z + Math.sin(a) * ln); }
      follow(m, s, ai, dt, 0.3); return;
    }
    // sweep: walk the tour, glancing around
    if (!ai.route || !ai.route.length || ai.stuck > 0.8) { const w = ai.tour[ai.ti % ai.tour.length]; ai.ti++; routeTo(m, s, ai, w[0], w[1]); }
    follow(m, s, ai, dt, 0.5);
  };

  /* ------------------------------------------------------------------ results */
  HS.summary = function (m, you) {
    const s = m.seeker, found = m.hiders.filter((h) => h.found && !h.left).length;
    const youSeek = s.id === you, me = m.hiders.find((h) => h.id === you);
    const youWon = youSeek ? m.result === 'seeker' : !!me && !me.found; // a hider wins by not being found
    return {
      result: m.result, youSeek, youWon, found, total: m.hiders.length, time: Math.round((m.endT || m.t) - C().prep),
      seeker: { name: s.name, attacks: s.attacks, hits: s.hits, misses: s.misses, whiffs: s.whiffs, accuracy: s.attacks ? Math.round(s.hits / Math.max(1, s.hits + s.misses) * 100) : 0 },
      hiders: m.hiders.map((h) => ({ id: h.id, name: h.name, look: h.look || 'Spirit', found: h.found, left: !!h.left, at: h.foundAt == null ? null : Math.max(0, Math.round(h.foundAt - C().prep)), morphs: h.morphs, moved: +h.moved.toFixed(1) })),
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
