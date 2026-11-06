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
    if (!loading) loading = import(new URL('src/3d/island3d.js', document.baseURI).href).then((m) => (mod = m)).catch((e) => { failed = true; if (root.console) console.warn('Voxel island unavailable, using the 2D island:', e && e.message); return null; });
    return loading;
  }
  // which objects the 3D layer draws (the 2D layer then hides only their pictures)
  function voxHas(k, art, cat, state) { return !!ctrl && V.on && ctrl.has(k, art, cat, state); }

  // Fixed island scenery placed like the 2D art: the jetty and its skiff, the lighthouse rock.
  function extras(iid, cols) {
    if (iid !== 'starter') return [];
    const out = [], J = IA.jettyCells(), [jx, jy] = J.at, HP = 39.1918, map = D.ISLANDS.starter.map;
    if (jy >= 0) { out.push({ kind: 'jetty', x: jx + 0.5, z: jy + 1 + 2.25 }); out.push({ kind: 'skiff', x: jx + 2.6, y: -0.55, z: jy + 4.2, bob: true }); }
    let ex = null; cols.forEach((c) => { if (map[c.y] && map[c.y][c.x] && map[c.y][c.x] !== '~' && (!ex || c.x - c.y > ex.x - ex.y)) ex = c; });
    if (ex) out.push({ kind: 'lighthouse', x: ex.x + 2.6, y: -40 / HP, z: ex.y + 0.5 });
    return out;
  }
  // Trees and bushes on hills, ledges and loose chunks (scenery only: those cells are never buildable).
  function scenery(cols) {
    const out = [], HP = 39.1918, hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    cols.forEach((c) => {
      const v = hash(c.x, c.y, 2), y = Math.round(c.top / HP / 0.5) * 0.5;
      let kind = null;
      if (c.kind === 'hill') kind = v > 0.7 ? 'oak' : v > 0.42 ? 'pine' : v > 0.26 ? 'birch' : v > 0.12 ? 'bush' : 'blossom';
      else if (c.kind === 'chunk' && v > 0.35) kind = v > 0.75 ? 'pine' : 'oak';
      else if (c.kind === 'ledge' && v > 0.78 && c.top >= -24) kind = v > 0.92 ? 'pine' : 'bush';
      if (!kind) return;
      out.push({ kind, seed: Math.floor(v * 1000), cx: c.x, cz: c.y, x: c.x + 0.5 + (hash(c.x, c.y, 3) - 0.5) * 0.3, y, z: c.y + 0.5 + (hash(c.x, c.y, 4) - 0.5) * 0.3, ry: Math.floor(hash(c.x, c.y, 5) * 4) * Math.PI / 2, s: c.kind === 'chunk' ? 0.75 : kind === 'oak' ? 0.8 : 0.95 });
    });
    return out;
  }
  let sceneryCache = null;

  // Called by UI.renderWorld whenever the island's terrain is (re)drawn.
  V.terrain = function (iid, key, t) {
    V.on = false; const w = document.getElementById('world'); if (w) w.classList.remove('vox');
    // Phase 1 covers the Starter Island; the other islands keep their 2D art until their own phase
    if (!V.wanted() || iid !== 'starter') { IA.voxHas = null; if (ctrl && ctrl.canvas.parentNode) ctrl.canvas.parentNode.removeChild(ctrl.canvas); return; }
    load().then((m) => {
      if (!m || !V.wanted()) return;
      const world = document.getElementById('world'); if (!world || !t || !t.cols) return;
      if (!ctrl) ctrl = m.createIsland();
      const cv = ctrl.canvas; if (cv.parentNode !== world) world.insertBefore(cv, document.getElementById('iso'));
      if (lastTerrainKey !== key) { ctrl.setTerrain(iid, key, t.cols, extras(iid, t.cols)); sceneryCache = scenery(t.cols); lastTerrainKey = key; }
      V.on = true; IA.voxHas = voxHas;
      if (A.UI.applyCam) A.UI.applyCam();
      if (A.UI.renderObjects) A.UI.renderObjects();
      world.classList.add('vox');
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
  V.view = function (cam, view) { if (ctrl && V.on) ctrl.setView(cam, view); };
  V.redraw = () => { if (ctrl && V.on) ctrl.redraw(); };
  V.stats = () => (ctrl ? ctrl.stats() : null);
})(typeof window !== 'undefined' ? window : globalThis);
