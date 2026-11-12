/* Aminas — bridge between the island screen (ui-world.js) and the voxel island (src/3d/island3d.js).
   The 3D module is loaded the first time the island is shown. Until it is ready, or if WebGL is missing, the module
   fails to load, or the player turns "3D voxel island" off in Settings, the classic 2D island is drawn exactly as
   before. When it is ready, #world gets the class "vox": the 2D terrain is hidden and buildings and obstacles that
   have a voxel model hide only their pictures (their hit areas, bubbles, timers and labels stay in the 2D layer). */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, IA = A.IsoArt;
  const V = (A.VoxIsland = {});
  let mod = null, loading = null, failed = false, ctrl = null, lastTerrainKey = null;
  const st = () => A.State.state;
  V.wanted = () => { const s = st(); return !!(s && s.settings && s.settings.voxIsland !== false) && !failed && !!(A.C3D && A.C3D.supported()); };
  V.failed = () => failed;
  V.ready = () => !!ctrl && !!document.querySelector('#world.vox');
  V.ISLANDS = ['starter'];
  function load() {
    if (mod) return Promise.resolve(mod);
    // Phase 3: load timings for the performance test (src/bench.js)
    if (!loading) { V.t0 = V.t0 || performance.now(); }
    if (!loading) loading = import(new URL('src/3d/island3d.js', document.baseURI).href).then((m) => { V.moduleMs = Math.round(performance.now() - V.t0); return (mod = m); }).catch((e) => { failed = true; if (root.console) console.warn('Voxel island unavailable, using the 2D island:', e && e.message); return null; });
    return loading;
  }
  // which objects the 3D layer draws (the 2D layer then hides only their pictures)
  function voxHas(k, art, cat, state) { return !!ctrl && V.on && ctrl.has(k, art, cat, state); }

  // Fixed island scenery placed like the 2D art: the jetty and its skiff, the lighthouse rock.
  function extras(iid, cols) {
    if (iid !== 'starter') return [];
    const out = [], J = IA.jettyCells(), [jx, jy] = J.at, HP = 39.1918, map = D.ISLANDS.starter.map;
    if (jy >= 0) { out.push({ kind: 'jetty', x: jx + 0.5, z: jy + 1 + 2.25 }); out.push({ kind: 'skiff', x: jx + 2.6, y: -0.55, z: jy + 4.2, bob: true });
      // the jetty is a working dock (Phase 2 library props): crates waiting, a barrel, sacks for the boat
      out.push({ kind: 'crate', x: jx + 0.62, z: jy + 2.4 }); out.push({ kind: 'barrel', x: jx + 0.3, z: jy + 2.0 }); out.push({ kind: 'sacks', x: jx + 0.45, z: jy + 4.6 }); }
    let ex = null; cols.forEach((c) => { if (map[c.y] && map[c.y][c.x] && map[c.y][c.x] !== '~' && (!ex || c.x - c.y > ex.x - ex.y)) ex = c; });
    if (ex) out.push({ kind: 'lighthouse', x: ex.x + 2.6, y: -40 / HP, z: ex.y + 0.5 });
    return out;
  }
  // Trees and bushes on hills, ledges and loose chunks (scenery only: those cells are never buildable).
  function scenery(cols) {
    // Phase 1.1 composition: trees grow in groves (a slow noise field picks pine, oak or blossom stands), with
    // open glades between them, rather than an even scatter of mixed species.
    const out = [], HP = 39.1918, hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s), u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
    const at = new Map(); cols.forEach((c) => at.set(c.x + ',' + c.y, c));
    cols.forEach((c) => {
      const v = hash(c.x, c.y, 2), y = Math.round(c.top / HP / 0.5) * 0.5, grove = vn(c.x * 0.22, c.y * 0.22, 6), dense = vn(c.x * 0.3, c.y * 0.3, 7);
      let kind = null;
      if (c.kind === 'hill') {
        // groves (Phase 2 library): pine stands; oak woods with an old oak at their heart; birch and blossom copses
        // with flowering bushes; glades of tall grass, ferns, mushrooms and wildflowers
        if (dense < 0.34 && v < 0.85) kind = v < 0.2 ? 'tallGrass' : v < 0.34 ? 'fernLarge' : v < 0.44 ? 'flowerPatch' : v < 0.52 ? 'mushrooms' : v < 0.62 ? 'roundBush' : null;
        else kind = grove < 0.4 ? (v > 0.22 ? 'pine' : v > 0.1 ? 'fernLarge' : 'bush') : grove < 0.68 ? (v > 0.86 ? 'oakOld' : v > 0.3 ? 'oak' : v > 0.18 ? 'roundBush' : 'mushrooms') : (v > 0.5 ? 'birch' : v > 0.25 ? 'blossom' : 'flowerBush');
      } else if (c.kind === 'chunk' && v > 0.35) kind = v > 0.75 ? 'pine' : v > 0.55 ? 'oak' : 'mossyRock';
      else if (c.kind === 'ledge' && c.top >= -24) kind = v > 0.9 ? 'pine' : v > 0.8 ? 'bush' : v > 0.72 ? 'mossyRock' : v > 0.68 ? 'crystals' : v > 0.6 ? 'tallGrass' : null;
      // Phase 14: a second, sparse layer on the same never-built ground. Old stonework (a standing or fallen column,
      // a rune stone that still glows faintly) in the glades and on the ledges, as if a path once ran here; willows
      // and glowcaps in the deepest groves; weathered stone stacks and exposed roots on the rim; and things people
      // left by the woods (a log pile, a few pots). It has its own random stream, so the existing groves stay put.
      const q = hash(c.x, c.y, 9), q2 = hash(c.x, c.y, 10);
      if (c.kind === 'hill') { if (q < 0.09) kind = q2 < 0.5 ? 'columnRuin' : 'runeStone'; else if (q < 0.16 && dense >= 0.34) kind = grove >= 0.68 ? 'willow' : 'glowcap'; else if (q < 0.19 && dense < 0.34) kind = q2 < 0.5 ? 'logPile' : 'pots'; else if (q < 0.24 && kind === null) kind = 'roots'; }
      else if (c.kind === 'ledge' && c.top >= -24) { if (q < 0.14) kind = q2 < 0.4 ? 'columnRuin' : q2 < 0.7 ? 'stonePillars' : 'runeStone'; else if (q < 0.22 && kind === null) kind = 'roots'; }
      else if (c.kind === 'chunk' && q < 0.3) kind = q2 < 0.5 ? 'runeStone' : 'crystals';
      if (kind && kind in KNOWN) {
        const big = kind === 'oak' ? 0.72 + hash(c.x, c.y, 6) * 0.25 : kind === 'oakOld' ? 0.8 : kind === 'pine' ? 0.8 + hash(c.x, c.y, 6) * 0.35 : 0.85 + hash(c.x, c.y, 6) * 0.25;
        out.push({ kind, seed: Math.floor(v * 1000), cx: c.x, cz: c.y, x: c.x + 0.5 + (hash(c.x, c.y, 3) - 0.5) * 0.3, y, z: c.y + 0.5 + (hash(c.x, c.y, 4) - 0.5) * 0.3, ry: Math.floor(hash(c.x, c.y, 5) * 4) * Math.PI / 2, s: c.kind === 'chunk' ? 0.75 : big, still: STILL[kind] });
      }
      // hanging vines and moss under the rim on the two cliff faces that face the camera (the rim is never built on)
      if ((c.kind === 'grass' || c.kind === 'hill' || c.kind === 'sand') && c.top >= 0) [[1, 0], [0, 1]].forEach(([dx, dz], k) => {
        if (at.has((c.x + dx) + ',' + (c.y + dz)) || hash(c.x, c.y, 30 + k) > 0.16) return;
        const h2 = hash(c.x, c.y, 32 + k); out.push({ kind: h2 > 0.5 ? 'vines' : 'hangingMoss', seed: Math.floor(h2 * 1000), cx: -999, cz: -999, x: c.x + 0.5 + dx * 0.53, y: -0.04, z: c.y + 0.5 + dz * 0.53, ry: dx ? Math.PI / 2 : 0, s: 1, still: true });
      });
    });
    return out;
  }
  const KNOWN = { columnRuin: 1, runeStone: 1, stonePillars: 1, willow: 1, glowcap: 1, roots: 1, logPile: 1, pots: 1, oak: 1, pine: 1, birch: 1, bush: 1, blossom: 1, fern: 1, oakOld: 1, roundBush: 1, flowerBush: 1, flowerPatch: 1, tallGrass: 1, fernLarge: 1, mushrooms: 1, mossyRock: 1, crystals: 1, vines: 1, hangingMoss: 1 };
  const STILL = { columnRuin: true, runeStone: true, stonePillars: true, glowcap: true, roots: true, logPile: true, pots: true, mossyRock: true, crystals: true, mushrooms: true, flowerPatch: true, vines: true, hangingMoss: true }; // no sway
  let sceneryCache = null;

  // Called by UI.renderWorld whenever the island's terrain is (re)drawn.
  V.terrain = function (iid, key, t) {
    V.on = false; const w = document.getElementById('world'); if (w) w.classList.remove('vox');
    // Phase 1 covers the Starter Island; the other islands keep their 2D art until their own phase
    if (!V.wanted() || iid !== 'starter') { IA.voxHas = null; if (ctrl && ctrl.canvas.parentNode) ctrl.canvas.parentNode.removeChild(ctrl.canvas); if (ctrl && ctrl.occCanvas.parentNode) ctrl.occCanvas.parentNode.removeChild(ctrl.occCanvas); return; }
    load().then((m) => {
      if (!m || !V.wanted()) return;
      const world = document.getElementById('world'); if (!world || !t || !t.cols) return;
      if (!ctrl) ctrl = m.createIsland();
      const cv = ctrl.canvas; if (cv.parentNode !== world) world.insertBefore(cv, document.getElementById('iso'));
      if (lastTerrainKey !== key) { ctrl.setTerrain(iid, key, t.cols, extras(iid, t.cols)); sceneryCache = scenery(t.cols); lastTerrainKey = key; }
      V.on = true; IA.voxHas = voxHas;
      if (ctrl.occCanvas.parentNode !== world) world.insertBefore(ctrl.occCanvas, document.getElementById('iso').nextSibling);
      ctrl.setOverlay(overlay);
      if (A.UI.applyCam) A.UI.applyCam();
      if (A.UI.renderObjects) A.UI.renderObjects();
      world.classList.add('vox');
      if (!V.firstMs && V.t0) { V.firstMs = Math.round(performance.now() - V.t0); V.firstAt = Math.round(performance.now()); }
    });
  };
  // Called after every object redraw: the 3D layer mirrors the buildings and obstacles on this island.
  V.sync = function () {
    if (!ctrl || !V.on) return;
    const s = st(), W = A.World, iid = s.currentIsland, hide = A.UI.bm && A.UI.bm.ghost && A.UI.bm.ghost.id, items = [];
    W.buildingsOn(s, iid).forEach((b) => {
      if (b.x == null || b.state === 'stored') return; const d = D.BUILDINGS[b.type], sz = W.size(b.type, b.rot);
      if (b.id === hide) return;
      items.push({ k: 'b', id: b.id, type: b.type, art: d.art || d.id, cat: d.cat, level: b.level, state: b.state, rot: b.rot ? 1 : 0, x: b.x, y: b.y, w: sz.w, h: sz.h, w0: d.w, h0: d.h, draw: ctrl.has('b', d.art || d.id, d.cat, b.state) });
    });
    W.obstaclesOn(s, iid).forEach((o) => { if (o.state === 'cleared') return; const t = D.OBSTACLE_TYPES[o.type]; items.push({ k: 'o', id: o.id, type: o.type, x: o.x, y: o.y, w: t.w, h: t.h, seed: Math.abs(String(o.id).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 1000 }); });
    IA.landmark(iid, s).forEach((l) => items.push({ k: 'l', kind: l.kind, on: l.kind === 'stones' ? !!(s.struct.tidegate && !s.flags.r1) : false, x: l.x, y: l.y, w: l.w, h: l.h }));
    V.items = items.map((i) => i.k + ":" + (i.id || i.kind));
    ctrl.sync(items.map((i) => (i.k === 'b' && !i.draw ? Object.assign({}, i, { k: 'l' }) : i)), sceneryCache);
  };
  /* ---- depth for the 2D overlay (Phase 1.2) ----
     The island's creatures, landmark markers and ground rings are SVG drawn above the 3D canvas, so on their own they
     always cover the buildings. For each of them we hand the 3D layer a proxy in world space: an upright card
     standing at the sprite's feet (creatures, pillars, floating markers) or a flat card on the ground (rings and
     glows). The 3D layer then repaints, on a thin canvas above the SVG, exactly the pixels of 3D objects that are in
     front of those proxies. Interface parts (bubbles, timers, tags, the ghost, quest highlights) are cut out of that
     canvas so they always stay on top. Taps are unchanged: everything interactive is still the SVG. */
  const occludable = () => [...document.querySelectorAll('#objs .creature, #objs .lm, #objs .bld > ellipse.pulse')];
  function worldRect(el) { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return null; const a = A.UI.toWorld(r.left, r.top), b = A.UI.toWorld(r.right, r.bottom); return { r, x0: a[0], y0: a[1], x1: b[0], y1: b[1] }; }
  const visibleFill = (e) => { const f = (e.getAttribute('fill') || '').toLowerCase(); return f !== 'transparent' && f !== 'none' || !!e.getAttribute('stroke'); };
  function overlay() {
    // only on the playable island screen (not behind story dialogue or the arrival scene)
    const world = document.getElementById('world'); if (!world || !V.on || !A.UI.toWorld || A.UI.screen !== 'island' || !A.UI.wv) return null;
    const wr = world.getBoundingClientRect(), up = [], flat = [], cut = []; let ux0 = 1e9, uy0 = 1e9, ux1 = -1e9, uy1 = -1e9;
    const grow = (r) => { ux0 = Math.min(ux0, r.left - wr.left); uy0 = Math.min(uy0, r.top - wr.top); ux1 = Math.max(ux1, r.right - wr.left); uy1 = Math.max(uy1, r.bottom - wr.top); };
    const onScreen = (r) => r.right > wr.left && r.left < wr.right && r.bottom > wr.top && r.top < wr.bottom;
    occludable().forEach((el) => {
      if (el.classList.contains('creature')) {
        // from the creature's logical place (its anchor plus the current walk offset) and its art box, measured once:
        // the idle bob and breathing animations then never count as movement
        const tm = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)(?:\s*scale\(([-\d.]+))?/.exec(el.getAttribute('transform') || ''); // the group's own placement is the truth
        const ax = tm ? +tm[1] : +el.dataset.ax, ay = tm ? +tm[2] : +el.dataset.ay, sc = tm && tm[3] ? +tm[3] : +el.dataset.sc || 1, mv = el.querySelector('.cr-mv'), bob = el.querySelector('.cr-bob');
        if (!mv || !bob || isNaN(ax)) return;
        let box = el._occBox; if (!box) { try { const b = bob.getBBox(); box = el._occBox = [b.x, b.y - 6, b.x + b.width, b.y + b.height]; } catch (e) { return; } }
        const m = new DOMMatrixReadOnly(getComputedStyle(mv).transform === 'none' ? undefined : getComputedStyle(mv).transform), fx = ax + m.e * sc, fy = ay + m.f * sc;
        const x0 = fx + box[0] * sc, x1 = fx + box[2] * sc, y0 = fy + box[1] * sc, y1 = Math.max(fy, fy + box[3] * sc);
        const r = el.querySelector('.cr-mv').getBoundingClientRect(); if (!onScreen(r)) return;
        up.push([x0, x1, y0, y1, fx, 1]); grow(r); return; // 1 = a creature, measured exactly
      }
      if (el.tagName.toLowerCase() === 'ellipse') { const q = worldRect(el); if (q && onScreen(q.r)) { flat.push([q.x0, q.y0, q.x1, q.y1]); grow(q.r); } return; }
      // a landmark: its glows and rings lie on the ground; its pillars and floating marker stand at its centre
      const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(el.getAttribute('transform') || ''), fx = m ? +m[1] : 0, fy = m ? +m[2] : 0;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, any = false;
      [...el.children].forEach((c) => {
        const tag = c.tagName.toLowerCase(); if (tag === 'ellipse' || tag === 'circle') { if (!visibleFill(c)) return; const q = worldRect(c); if (q && onScreen(q.r)) { flat.push([q.x0, q.y0, q.x1, q.y1]); grow(q.r); } return; }
        if ((tag === 'polygon' || tag === 'rect' || tag === 'path') && !visibleFill(c)) return;
        const q = worldRect(c); if (!q || !onScreen(q.r)) return; any = true; x0 = Math.min(x0, q.x0); y0 = Math.min(y0, q.y0); x1 = Math.max(x1, q.x1); y1 = Math.max(y1, q.y1); grow(q.r);
      });
      if (any) up.push([x0, x1, y0, Math.max(y1, fy), fx]);
    });
    if (!up.length && !flat.length) return { sig: '', up, flat, cut, rect: null };
    // interface parts that must never be covered
    document.querySelectorAll('#objs .bld > g:not(.artg), #objs .obs > g:not(.artg), #ghost > *, #hlx > *, #objs .creature .zz, #objs .creature .cr-heart').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && r.height && onScreen(r)) cut.push([r.left - wr.left, r.top - wr.top, r.width, r.height]); });
    const pad = 10, rect = [Math.max(0, Math.floor(ux0 - pad)), Math.max(0, Math.floor(uy0 - pad)), 0, 0]; rect[2] = Math.min(Math.ceil(ux1 + pad), Math.round(wr.width)) - rect[0]; rect[3] = Math.min(Math.ceil(uy1 + pad), Math.round(wr.height)) - rect[1];
    // the signature ignores small wobbles (bobbing markers, pulsing rings, floating z's): creatures are measured
    // exactly, everything else to the nearest 8 px, interface cut-outs to 16 px
    const r1 = (n) => Math.round(n * 2) / 2, r8 = (n) => Math.round(n / 8), r16 = (n) => Math.round(n / 16);
    return { sig: JSON.stringify([up.map((a) => a.slice(0, 5).map(a[5] ? r1 : r8)), flat.map((a) => a.map(r8))]) + '|' + cut.map((c) => c.map(r16).join(',')).join(';'), up, flat, cut, rect: rect[2] > 0 && rect[3] > 0 ? rect : null };
  }
  V.overlay = overlay;
  // Hide and Seek (hs-redesign): the Starter Island as a map, the same data the voxel island draws from, so the mode
  // plays on the real island (its terrain, buildings, trees, rocks and scenery) without touching the island screen.
  V.mapData = function (iid) {
    iid = iid || 'starter'; const s = st(), W = A.World, t = IA.terrain(iid, s), items = [];
    W.buildingsOn(s, iid).forEach((b) => {
      if (b.x == null || b.state === 'stored') return; const d = D.BUILDINGS[b.type], sz = W.size(b.type, b.rot);
      items.push({ k: 'b', id: b.id, type: b.type, name: d.name, art: d.art || d.id, cat: d.cat, level: b.level, state: b.state, rot: b.rot ? 1 : 0, x: b.x, y: b.y, w: sz.w, h: sz.h, w0: d.w, h0: d.h });
    });
    W.obstaclesOn(s, iid).forEach((o) => { if (o.state === 'cleared') return; const ty = D.OBSTACLE_TYPES[o.type]; items.push({ k: 'o', id: o.id, type: o.type, name: ty.name, x: o.x, y: o.y, w: ty.w, h: ty.h, seed: Math.abs(String(o.id).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 1000 }); });
    IA.landmark(iid, s).forEach((l) => items.push({ k: 'l', kind: l.kind, on: l.kind === 'stones' ? !!(s.struct.tidegate && !s.flags.r1) : false, x: l.x, y: l.y, w: l.w, h: l.h }));
    const cols = t.cols.map((c) => ({ x: c.x, y: c.y, kind: c.kind, top: c.top, bot: c.bot }));
    return { iid, cols, items, scenery: scenery(t.cols), extras: extras(iid, t.cols) };
  };
  // true when the 3D layer covers the overlay at this screen point (a tap there belongs to the building, not to
  // the creature hidden behind it)
  V.occludedAt = (x, y) => !!(ctrl && V.on && ctrl.occludedAt(x, y));
  V.view = function (cam, view) { if (ctrl && V.on) ctrl.setView(cam, view); };
  V.redraw = () => { if (ctrl && V.on) ctrl.redraw(); };
  V.stats = () => (ctrl ? ctrl.stats() : null);
  V.breakdown = () => (ctrl && ctrl.breakdown ? ctrl.breakdown() : null);
  V.models = () => (ctrl && ctrl.models ? ctrl.models() : []);
  V.spinModels = (dt) => ctrl && ctrl.spinModels && ctrl.spinModels(dt);
})(typeof window !== 'undefined' ? window : globalThis);
