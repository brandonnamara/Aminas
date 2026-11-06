/* Aminas — island UI: isometric world view, camera, Build Mode, building / obstacle panels, catalog, storage,
   island map, quest list and the universal quest-navigation executor. Gameplay rules stay in world.js / quests.js:
   this file only renders state and calls validated rule functions. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, E = A.Economy, Q = A.Quests, Nav = A.Nav;
  const Art = A.Art, IA = A.IsoArt, Iso = A.Iso, T = A.Story, Au = A.Audio, UI = A.UI;
  const { esc, pct, chip } = UI.h, I = Art.icon;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const st = () => S.state;
  const fmt = (n) => Math.floor(n).toLocaleString('en-US');
  const costHtml = (c) => ['gold', 'food', 'gems'].filter((k) => c && c[k]).map((k) => '<span class="c-' + k + '">' + I(k === 'gems' ? 'gem' : k) + ' ' + fmt(c[k]) + '</span>').join(' ') || 'free';
  const NS = 'http://www.w3.org/2000/svg';

  /* =========================================================== camera */
  UI.cam = {};
  const Z_MAX = 1.5;
  function view() { const el = $('#world'); return el ? { w: el.clientWidth, h: el.clientHeight } : { w: 844, h: 390 }; }
  function zMin() { const b = UI.wv && UI.wv.bounds, v = view(); if (!b) return 0.3; return Math.max(0.22, Math.min(v.w / (b.x1 - b.x0 + 120), v.h / (b.y1 - b.y0 + 220))); }
  function camFor(iid) {
    if (UI.cam[iid]) return UI.cam[iid];
    const isl = D.ISLANDS[iid], v = view(), c = Iso.top(isl.grid.w / 2, isl.grid.h / 2 + 1);
    const z = Math.min(Z_MAX, Math.max(zMin(), Math.min(0.8, v.w / ((isl.grid.w + isl.grid.h) * Iso.TW * 0.42))));
    return (UI.cam[iid] = { x: c[0], y: c[1] - 20, z });
  }
  function clampCam(c) {
    const b = UI.wv && UI.wv.bounds; if (!b) return c;
    c.z = Math.max(zMin(), Math.min(Z_MAX, c.z));
    c.x = Math.max(b.x0, Math.min(b.x1, c.x)); c.y = Math.max(b.y0 - 60, Math.min(b.y1, c.y));
    return c;
  }
  let camRaf = 0;
  // The camera moves the whole SVG layer with a CSS transform (GPU-composited: panning does not repaint the island).
  // The SVG's own coordinate system is the world, offset by the layer origin UI.wv.o.
  function applyCam() {
    if (camRaf) return;
    camRaf = requestAnimationFrame(() => {
      camRaf = 0; const svg = $('#iso'); if (!svg || !UI.wv) return;
      const c = clampCam(camFor(UI.wv.iid)), v = view(), o = UI.wv.o;
      svg.style.transform = 'translate(' + (v.w / 2 - (c.x - o.x) * c.z).toFixed(1) + 'px,' + (v.h / 2 - (c.y - o.y) * c.z).toFixed(1) + 'px) scale(' + c.z.toFixed(4) + ')';
      if (A.VoxIsland) A.VoxIsland.view(c, v);
      // gentle parallax on the backdrop
      const bd = $('#backdrop-wrap'); if (bd) bd.style.transform = 'translate(' + (-(c.x - (UI.wv.cx0 || 0)) * 0.03).toFixed(1) + 'px,' + (-(c.y - (UI.wv.cy0 || 0)) * 0.02).toFixed(1) + 'px) scale(1.06)';
    });
  }
  UI.applyCam = applyCam;
  function toWorld(px, py) { const r = $('#world').getBoundingClientRect(), c = camFor(UI.wv.iid), v = view(); return [(px - r.left - v.w / 2) / c.z + c.x, (py - r.top - v.h / 2) / c.z + c.y]; }
  function toScreen(wx, wy) { const r = $('#world').getBoundingClientRect(), c = camFor(UI.wv.iid), v = view(); return [r.left + v.w / 2 + (wx - c.x) * c.z, r.top + v.h / 2 + (wy - c.y) * c.z]; }
  UI.toWorld = toWorld;
  UI.toScreen = toScreen;
  // Smoothly centre the camera on a world point (respects reduced motion).
  UI.panTo = function (wx, wy, z) {
    const c = camFor(UI.wv.iid), to = clampCam({ x: wx, y: wy, z: z || Math.max(c.z, 0.62) });
    if (UI.calm()) { Object.assign(c, to); applyCam(); return; }
    const from = { x: c.x, y: c.y, z: c.z }, t0 = performance.now(), dur = 420;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); c.x = from.x + (to.x - from.x) * e; c.y = from.y + (to.y - from.y) * e; c.z = from.z + (to.z - from.z) * e; applyCam(); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  UI.focusFoot = function (x, y, w, h, z) { const [cx, cy] = Iso.center(x, y, w, h); UI.panTo(cx, cy - 30, z); };
  UI.focusBuilding = function (id, z) { const b = st().buildings[id]; if (!b || b.x == null) return; const s = W.size(b.type, b.rot); UI.focusFoot(b.x, b.y, s.w, s.h, z); };
  UI.calm = () => !!(st().settings.reduceMotion || (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches));

  /* =========================================================== world rendering */
  // Terrain is cached per island + the flags that change it; objects re-render on every refresh.
  UI.renderWorld = function (forceTerrain) {
    const s = st(), iid = s.currentIsland, svg = $('#iso'); if (!svg) return;
    const key = iid + '|' + (s.flags.r1 ? 1 : 0) + (s.flags.r2 ? 1 : 0);
    if (!UI.wv || UI.wv.iid !== iid || UI.wv.key !== key || forceTerrain) {
      const t = IA.terrain(iid, s), c = Iso.top(D.ISLANDS[iid].grid.w / 2, D.ISLANDS[iid].grid.h / 2), b = t.bounds;
      // layer box = island bounds plus room for tall sprites, bubbles and clouds
      const o = { x: Math.floor(b.x0 - 260), y: Math.floor(b.y0 - 300), w: Math.ceil(b.x1 - b.x0 + 520), h: Math.ceil(b.y1 - b.y0 + 520) };
      UI.wv = { iid, key, bounds: b, cx0: c[0], cy0: c[1], o };
      svg.setAttribute('viewBox', o.x + ' ' + o.y + ' ' + o.w + ' ' + o.h); svg.setAttribute('width', o.w); svg.setAttribute('height', o.h);
      $('#terrain').innerHTML = t.svg;
      if (A.VoxIsland) A.VoxIsland.terrain(iid, key, t); // Environment Phase 1: the voxel island draws underneath
      $('#gridl').innerHTML = IA.grid(iid);
      $('#amb').innerHTML = IA.ambient(iid);
      $('#backdrop-wrap').innerHTML = IA.backdrop(iid, s);
      $('#world').dataset.island = iid;
    }
    $('#world').classList.toggle('building', !!UI.bm);
    $('#world').classList.toggle('showgrid', !!UI.bm || !!s.settings.gridAlways);
    UI.renderObjects(); UI.renderGhost(); applyCam();
  };
  UI.renderObjects = function () {
    const g = $('#objs'); if (!g) return;
    const s = st(), hide = UI.bm && UI.bm.ghost && UI.bm.ghost.id;
    const items = IA.objectItems(s, s.currentIsland, { hide, selected: UI.bm && UI.bm.ghost && UI.bm.ghost.id }), prev = g._items;
    // Only replace what changed (most redraws change one timer or one bubble): unchanged buildings keep their
    // elements, so the browser does not have to draw their pictures again.
    if (prev && prev.length === items.length && g.children.length === items.length && prev.every((p, i) => p.id === items[i].id)) {
      items.forEach((it, i) => { if (it.svg === prev[i].svg) return; const t = document.createElementNS(NS, 'g'); t.innerHTML = it.svg; if (t.firstElementChild) g.replaceChild(t.firstElementChild, g.children[i]); });
    } else g.innerHTML = items.map((i) => i.svg).join('');
    g._items = items;
    if (A.VoxIsland) A.VoxIsland.sync();
    if (A.Life) A.Life.apply();
    UI.applyHl();
  };

  /* =========================================================== island screen */
  UI.showIsland = function (resumed) {
    UI.setScreen('island'); UI.closeAll(); UI.bm = null;
    const s = st(); W.validate(s);
    $('#stage').innerHTML = '<div id="world" class="world"><div id="backdrop-wrap" class="backdrop-wrap"></div>' +
      '<svg id="iso" class="iso" xmlns="' + NS + '"><g id="cam"><g id="terrain"></g><g id="gridl"></g><g id="fp"></g><g id="objs"></g><g id="ghost"></g><g id="amb"></g><g id="hlx"></g></g></svg><div id="fest-root"></div><div class="vignette" id="daylight" aria-hidden="true"></div></div>' +
      '<div class="hud" id="hud"></div><div id="guide-root"></div><div id="bbar-root"></div>';
    Au.setMode('light'); R.tickHabitats(s); UI.daylight();
    UI.festival = A.Events ? A.Events.active()[0] || null : null;
    $('#fest-root').innerHTML = UI.festival ? IA.festivalLayer(UI.festival.id) : '';
    UI.wv = null; UI.renderWorld(true); UI.renderHud(); bindInput();
    UI.timers.tick = setInterval(UI.tick, 1000);
    if (A.Life) A.Life.start();
    UI.timers.prod = setInterval(() => { if (UI.screen === 'island' && !UI.dragging) { W.tickProduction(st()); UI.renderObjects(); } }, 15000);
    if (s.pendingR2) R.awakenSpire(s);
    UI.afterAction();
    // a story scene that was due when the game last closed plays now (rewards were already given by the battle)
    if (s.story && s.story.pendingScene && A.Scenes && A.Scenes.get(s.story.pendingScene) && !UI.sceneBox) { const id = s.story.pendingScene; UI.queue.unshift({ type: 'fn', fn: (done) => UI.playScene(id, () => done()) }); UI.pump(); }
    if (resumed && !UI.queue.length && Date.now() - UI.lastIdle > 60000 && Math.random() < 0.6) { UI.lastIdle = Date.now(); UI.toast(T.pick(s, 'idle'), 'n'); }
  };
  // Non-interactive island used behind the arrival dialogue.
  UI.renderBackdropIsland = function () {
    $('#stage').innerHTML = '<div id="world" class="world flicker"><div id="backdrop-wrap" class="backdrop-wrap"></div><svg id="iso" class="iso" xmlns="' + NS + '"><g id="cam"><g id="terrain"></g><g id="gridl"></g><g id="fp"></g><g id="objs"></g><g id="ghost"></g><g id="amb"></g><g id="hlx"></g></g></svg><div class="vignette"></div></div>';
    UI.wv = null; UI.renderWorld(true);
  };
  UI.refresh = function () { if (UI.screen === 'island') { UI.renderHud(); UI.renderWorld(); UI.renderBuildBar(); UI.renderGuide(); } };

  // Time-of-day light over the island (local clock): dawn, day, dusk, night. Settings can turn it off.
  UI.daylight = function () {
    const el = $('#daylight'), w = $('#world'); if (!el || !w) return;
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60, on = st().settings.dayNight !== false;
    const phase = !on ? 'day' : h >= 5 && h < 7.5 ? 'dawn' : h < 17.5 && h >= 7.5 ? 'day' : h >= 17.5 && h < 20.5 ? 'dusk' : 'night';
    if (el.dataset.phase !== phase) { el.className = 'vignette ' + phase; el.dataset.phase = phase; w.dataset.phase = phase; }
  };
  UI.tick = function () {
    const s = st(); if (UI.screen !== 'island') return;
    if (A.Perf) { A.Perf.tick(); if (A.Perf.hidden()) return; }  // hidden: skip the work, the clocks catch up on return
    UI.tickN = (UI.tickN || 0) + 1; if (UI.tickN % 60 === 0) UI.daylight();
    const before = R.q.length; W.tick(s);
    if (R.q.length > before) { UI.afterAction(); }
    else if (!UI.dragging) {
      const busy = W.buildingsOn(s, s.currentIsland).some((b) => b.state === 'constructing' || b.state === 'upgrading') || W.obstaclesOn(s, s.currentIsland).some((o) => o.state === 'removing');
      if (busy) UI.renderObjects();
    }
    const nReady = R.eggsReady(s);
    if (nReady > (UI.eggNotified | 0)) { UI.renderHud(); UI.toast(nReady > 1 ? nReady + ' eggs in the Hatchery are making noises. I’d look into it. Quietly.' : 'Something in the Hatchery is making noises. I’d look into it. Quietly.', 'a'); Au.play('ok'); }
    UI.eggNotified = nReady;
    if (UI.hatchTick) UI.hatchTick();
    // live timers in an open building / obstacle panel
    const ov = $('#modal-root .overlay:last-child');
    if (ov && ov._live) ov._live();
  };

  /* =========================================================== HUD */
  // The Battle button (PvE and PvP): a triangle in the middle of the bottom bar, only a little larger than the others.
  function battleBtn(s) {
    const inRun = !!(s.run || (s.survival && s.survival.run));
    return '<button class="nbtn tri' + (inRun ? ' live' : '') + '" data-act="battle" data-hl="battle" aria-label="Battle: PvE and PvP"><svg class="tri-bg" viewBox="0 0 100 90" aria-hidden="true"><path d="M50 4L96 86H4Z"/></svg>' + I('swords') + '<span>Battle</span>' + (inRun ? '<span class="badge">!</span>' : '') + '</button>';
  }
  function navBtn(act, icon, label, extra) { extra = extra || {}; return '<button class="nbtn ' + (extra.cls || '') + '" data-act="' + act + '" data-hl="' + (extra.hl || act) + '">' + I(icon) + '<span>' + label + '</span>' + (extra.badge ? '<span class="badge">' + extra.badge + '</span>' : '') + '</button>'; }
  UI.hudHtml = function () {
    const s = st(), a = R.active(s), cm = Q.current(s), ready = Q.claimable(s), need = D.RANK_NEED(s.rank), isl = D.ISLANDS[s.currentIsland];
    let h = '<div class="hud-top">' + (UI.avatarBtn ? UI.avatarBtn(s) : '') + '<button class="pill rank" data-act="profile" aria-label="Player Rank ' + s.rank + ', open profile"><small>PLAYER RANK ' + s.rank + '</small><div class="bar xp"><i style="width:' + pct(s.rankXp, need) + '%"></i></div></button>' +
      '<button class="pill isle" data-act="map" data-hl="map" aria-label="Island map">' + I('map') + '<span>' + esc(isl.name) + '</span></button>' +
      '<button class="pill res" data-act="wallet" aria-label="Wallet: currencies and essences"><span class="gold" id="r-gold">' + I('gold') + '<b>' + fmt(s.res.gold) + '</b></span><span class="food" id="r-food">' + I('food') + '<b>' + fmt(s.res.food) + '</b></span><span class="gems" id="r-gems">' + I('gem') + '<b>' + fmt(s.res.gems) + '</b></span></button>' +
      '<button class="round" data-act="ask" aria-label="Ask The Entity">' + I('chat') + '</button><button class="round" data-act="settings" aria-label="Settings">' + I('gear') + '</button></div>';
    if (UI.bm) return h + '<div class="bm-tag pill">' + I('hammer') + ' BUILD MODE</div>' + zoomBtns();
    const fest = A.Events ? A.Events.active()[0] : null;
    if (fest) { const left = Q.list().filter((q) => q.season === fest.id && q.year === fest.year && s.missions[q.id] !== 'claimed').length;
      h += '<button class="pill fest-pill" data-act="missions" data-hl="season:' + fest.id + '" style="--fc:' + D.SEASONS[fest.id].color + '">' + I('spark') + '<span><b>' + esc(D.SEASONS[fest.id].name) + '</b><small>' + (left ? left + ' task' + (left > 1 ? 's' : '') + ' · ' : '') + (fest.daysLeft <= 1 ? 'last day' : fest.daysLeft + ' days left') + '</small></span></button>'; }
    if (cm) {
      const rdy = Q.status(s, cm) === 'ready', ob = Q.nextObjective(s, cm), p = Q.progress(s, cm), op = p.objs.find((o) => o.ob === ob);
      h += '<button class="pill mission-pill ' + (rdy ? 'ready' : '') + '" data-act="questGo" data-id="' + cm.id + '"><b>' + (rdy ? 'Ready to claim' : 'Current task') + '</b><span class="mt">' + esc(cm.title) + '</span>' +
        '<span class="mo">' + (rdy ? 'Tap to claim your reward.' : esc(Q.label(ob)) + (op && op.total > 1 ? ' · ' + fmt(op.cur) + '/' + fmt(op.total) : '')) + '</span><span class="go">' + (rdy ? 'Claim' : 'Go') + ' ' + I('arrow') + '</span></button>';
    } else if (s.flags.arcDone) h += '<button class="pill mission-pill" data-act="missions"><b>Chapter One complete</b><span class="mt">Sanctuary tasks remain</span></button>';
    if (a && UI.selectorHtml) h += UI.selectorHtml(s);
    const eggReady = R.eggsReady(s) > 0;
    h += '<div class="nav">' + navBtn('build', 'hammer', 'Build') + navBtn('collection', 'paw', 'Creatures') + navBtn('missions', 'scroll', 'Tasks', { badge: ready || '', hl: 'quests' }) + battleBtn(s) + navBtn('explore', 'compass', 'Explore') + navBtn('hatchery', 'egg', 'Hatchery', { cls: s.struct.hatchery ? '' : 'locked', badge: eggReady ? '!' : '' }) + '</div>';
    return h + zoomBtns();
  };
  const zoomBtns = () => '<div class="zoom"><button class="round sm" data-act="zoom" data-d="1" aria-label="Zoom in">' + I('plus') + '</button><button class="round sm" data-act="zoom" data-d="-1" aria-label="Zoom out">' + I('minus') + '</button></div>';
  UI.renderHud = function () { const h = $('#hud'); if (h) { h.innerHTML = UI.hudHtml(); UI.applyHl(); if (UI.selBind) UI.selBind(); } };
  UI.act('zoom', (el) => { const c = camFor(UI.wv.iid); c.z = c.z * (+el.dataset.d > 0 ? 1.25 : 0.8); clampCam(c); applyCam(); });

  /* =========================================================== input: pan, pinch, tap, drag ghost */
  let ptrs = new Map(), drag = null, pinch = null, flingRaf = 0;
  // Camera fling: a released drag keeps gliding and slows down (skipped with reduced motion).
  function fling(vx, vy) {
    cancelAnimationFrame(flingRaf); flingRaf = 0; if (UI.calm() || Math.hypot(vx, vy) < 0.15) return;
    let last = performance.now(); const c = camFor(UI.wv.iid);
    const step = (t) => {
      const dt = Math.min(48, t - last); last = t; c.x -= (vx * dt) / c.z; c.y -= (vy * dt) / c.z; const k = Math.pow(0.9945, dt); vx *= k; vy *= k; applyCam();
      flingRaf = Math.hypot(vx, vy) > 0.02 && UI.screen === 'island' && !ptrs.size ? requestAnimationFrame(step) : 0;
    };
    flingRaf = requestAnimationFrame(step);
  }
  function bindInput() {
    const svg = $('#world'); if (!svg) return; // listen on the whole viewport, not only where the island layer is
    svg.addEventListener('pointerdown', onDown); svg.addEventListener('pointermove', onMove); svg.addEventListener('pointerup', onUp); svg.addEventListener('pointercancel', onCancel);
    svg.addEventListener('wheel', (e) => { e.preventDefault(); const c = camFor(UI.wv.iid), [wx, wy] = toWorld(e.clientX, e.clientY), z0 = c.z; c.z = Math.max(zMin(), Math.min(Z_MAX, c.z * (e.deltaY < 0 ? 1.12 : 0.89))); c.x = wx - (wx - c.x) * (z0 / c.z); c.y = wy - (wy - c.y) * (z0 / c.z); applyCam(); }, { passive: false });
  }
  function onDown(e) {
    if (UI.busy && UI.screen !== 'island') return;
    Au.unlock(); cancelAnimationFrame(flingRaf); flingRaf = 0;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) {}
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], c = camFor(UI.wv.iid);
      pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), z0: c.z, mid: toWorld((a.x + b.x) / 2, (a.y + b.y) / 2) }; if (drag) drag.cancelled = true; return;
    }
    const c = camFor(UI.wv.iid), onGhost = !!(UI.bm && UI.bm.ghost && e.target.closest('[data-ghost]'));
    const g = UI.bm && UI.bm.ghost, cell = Iso.cell(...toWorld(e.clientX, e.clientY));
    drag = { sx: e.clientX, sy: e.clientY, moved: false, cam: { x: c.x, y: c.y }, mode: onGhost ? 'ghost' : 'pan', target: e.target, grab: g ? [cell[0] - g.x, cell[1] - g.y] : [0, 0], t0: Date.now() };
  }
  function onMove(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], c = camFor(UI.wv.iid), d = Math.hypot(a.x - b.x, a.y - b.y);
      c.z = Math.max(zMin(), Math.min(Z_MAX, pinch.z0 * d / Math.max(10, pinch.d0)));
      const v = view(), r = $('#world').getBoundingClientRect(), mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      c.x = pinch.mid[0] - (mx - v.w / 2) / c.z; c.y = pinch.mid[1] - (my - v.h / 2) / c.z; UI.dragging = true; applyCam(); return;
    }
    if (!drag || drag.cancelled) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > 8) { drag.moved = true; UI.dragging = true; $('#world').classList.add('dragging'); }
    if (!drag.moved) return;
    if (drag.mode === 'ghost') {
      const cell = Iso.cell(...toWorld(e.clientX, e.clientY));
      UI.ghostTo(cell[0] - drag.grab[0], cell[1] - drag.grab[1]);
    } else {
      const c = camFor(UI.wv.iid); c.x = drag.cam.x - dx / c.z; c.y = drag.cam.y - dy / c.z; applyCam();
      const h = drag.hist || (drag.hist = []); h.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (h.length > 6) h.shift();
    }
  }
  function onUp(e) {
    const wasPinch = !!pinch; ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) {
      const d = drag; drag = null; UI.dragging = false; const w = $('#world'); if (w) w.classList.remove('dragging');
      if (d && !d.moved && !d.cancelled && !wasPinch) tap(d.target, e.clientX, e.clientY);
      else if (d && d.moved && d.mode === 'ghost' && !wasPinch && UI.ghostRelease) UI.ghostRelease();
      else if (d && d.moved && d.mode === 'pan' && !wasPinch && d.hist && d.hist.length > 1) { const a = d.hist[0], b = d.hist[d.hist.length - 1], dt = b.t - a.t; if (dt > 0 && performance.now() - b.t < 90) fling((b.x - a.x) / dt, (b.y - a.y) / dt); }
    }
  }
  function onCancel(e) { ptrs.delete(e.pointerId); if (!ptrs.size) { drag = null; pinch = null; UI.dragging = false; } }

  function tap(target, px, py) {
    if (UI.screen !== 'island' || UI.busy || UI.modalOpen()) return;
    const s = st(), el = target && target.closest ? target : null;
    const col = el && el.closest('[data-collect]'), ob = el && el.closest('[data-oid]'), bl = el && el.closest('[data-bid]'), hit = el && el.closest('[data-hit]'), gh = el && el.closest('[data-ghost]');
    if (UI.bm) {
      if (gh) return; // taps on the ghost do nothing; drag it instead
      if (UI.bm.ghost) {
        if (bl && bl.dataset.bid !== UI.bm.ghost.id && !UI.bm.ghost.isNew && !UI.bm.ghost.fromStorage) { UI.selectForMove(bl.dataset.bid); return; }
        const cell = Iso.cell(...toWorld(px, py)), sz = W.size(UI.bm.ghost.type, UI.bm.ghost.rot);
        UI.ghostTo(cell[0] - Math.floor(sz.w / 2), cell[1] - Math.floor(sz.h / 2)); if (UI.ghostRelease) UI.ghostRelease(); return;
      }
      if (bl) { UI.selectForMove(bl.dataset.bid); return; }
      if (ob) { UI.obstaclePanel(ob.dataset.oid); return; }
      return;
    }
    if (col) { UI.collectAt(col.dataset.collect, px, py); return; }
    // creatures react to a tap first; residents then open their home, the companion and roamers their details
    const cr = el && el.closest('[data-cr]');
    if (cr && A.Life) {
      A.Life.react(cr);
      if (cr.dataset.bid) { UI.buildingPanel(cr.dataset.bid); return; }
      if (cr.dataset.hit) { UI.hotspot(cr.dataset.hit); return; }
      const uid = +cr.dataset.cr, sp = cr.dataset.sp; setTimeout(() => { if (UI.screen === 'island' && !UI.modalOpen()) UI.detail(sp, { uid }); }, UI.calm() ? 0 : 380); return;
    }
    if (hit) { UI.hotspot(hit.dataset.hit); return; }
    if (ob) { UI.obstaclePanel(ob.dataset.oid); return; }
    if (bl) { UI.buildingPanel(bl.dataset.bid); return; }
    // double-tap on open ground zooms in towards that spot (or back out when already close)
    const now = Date.now(), lt = UI.lastTap;
    if (lt && now - lt.t < 330 && Math.hypot(px - lt.x, py - lt.y) < 40) {
      UI.lastTap = null; const c = camFor(UI.wv.iid), [wx, wy] = toWorld(px, py);
      UI.panTo(wx, wy, c.z < Z_MAX * 0.8 ? Math.min(Z_MAX, c.z * 1.7) : Math.max(zMin(), c.z / 2.2)); return;
    }
    UI.lastTap = { t: now, x: px, y: py };
  }
  UI.hotspot = function (h) {
    const s = st();
    switch (h) {
      case 'companion': { const a = R.active(s); if (a) UI.detail(a.sp, { uid: a.uid }); break; }
      case 'disturbance': { const r = R.investigate(s); if (r.ok) UI.afterAction(); break; }
      case 'stones': UI.toast('The stones are quiet now. Politely, almost. I wouldn’t trust it.', 'a'); break;
      case 'stones-dormant': UI.toast('Old standing stones. Nothing to see. Probably. Restore the Tide Gate and ask me again.', 't'); break;
      case 'stone': { const r = R.examineStone(s); if (r.ok) UI.afterAction(); else UI.toast('Still humming. Only when you’re near it. Funny, that.', 'a'); break; }
      case 'mark': UI.toast(T.pick(s, 'arrivalMark'), 'a'); break;
    }
  };
  UI.collectAt = function (id, px, py) {
    const r = W.collect(st(), id);
    if (!r.ok) return;
    const col = W.isEss(r.kind) ? D.ELEMENTS[r.kind.slice(4)].color : r.kind === 'gold' ? '#ffd86b' : r.kind === 'food' ? '#ffb0a0' : '#9ae0ff';
    Au.play('ok'); floatAt(px, py, '+' + fmt(r.n) + ' ' + W.kindName(r.kind), col);
    if (UI.pixelBurst) UI.pixelBurst(px, py, { color: col, n: 14 });
    if (!W.isEss(r.kind)) bump('r-' + (r.kind === 'gems' ? 'gems' : r.kind));
    UI.afterAction();
  };
  function floatAt(px, py, text, color) { const app = $('#app').getBoundingClientRect(), f = document.createElement('div'); f.className = 'gainf'; f.textContent = text; f.style.cssText = 'left:' + (px - app.left - 30) + 'px;top:' + (py - app.top - 30) + 'px;color:' + color; $('#app').appendChild(f); setTimeout(() => f.remove(), 1200); }
  function bump(id) { const el = document.getElementById(id); if (!el) return; el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 250); }
  UI.floatAt = floatAt;

  /* =========================================================== Build Mode */
  // UI.bm = { ghost: {type, x, y, rot, id?, isNew?, fromStorage?, orig?} | null }
  UI.enterBuild = function () {
    if (!st().struct.hollow) { UI.toast('Restore the Sunlit Hollow first. Building on an empty stomach is frowned upon.', 't'); return false; }
    UI.closeAll(); UI.bm = { ghost: null }; UI.refresh(); return true;
  };
  UI.exitBuild = function () { UI.bm = null; $('#ghost') && ($('#ghost').innerHTML = ''); $('#fp') && ($('#fp').innerHTML = ''); UI.refresh(); };
  UI.act('build', () => { if (UI.bm) UI.exitBuild(); else UI.enterBuild(); });
  UI.act('bmDone', () => UI.exitBuild());
  UI.act('bmCatalog', () => UI.catalog());
  UI.act('bmStorage', () => UI.storage());
  UI.selectForMove = function (id) {
    const s = st(), b = s.buildings[id]; if (!b) return;
    if (b.state === 'ruined') { UI.buildingPanel(id); return; }
    if (!W.canMove(b)) { UI.toast(W.def(b).name + ' cannot be moved.', 't'); return; }
    if (b.island !== s.currentIsland) return;
    UI.bm = UI.bm || { ghost: null };
    UI.bm.ghost = { type: b.type, x: b.x, y: b.y, rot: b.rot, id, orig: { x: b.x, y: b.y, rot: b.rot }, start: { x: b.x, y: b.y, rot: b.rot }, live: true };
    UI.refresh(); UI.focusBuilding(id);
  };
  UI.startPlace = function (type) {
    const s = st(), info = W.canBuildInfo(s, type, s.currentIsland);
    if (!info.ok) { Au.play('no'); UI.toast(info.text || 'You cannot build that here yet.', 't'); return; }
    const c = camFor(s.currentIsland), near = Iso.cell(c.x, c.y + 20), sp = W.findSpot(s, s.currentIsland, type, 0, near);
    if (!sp) { UI.toast('There is no free space for that. Clear some obstacles or move things around.', 't'); return; }
    UI.closeAll(); UI.bm = UI.bm || { ghost: null }; UI.bm.ghost = { type, x: sp[0], y: sp[1], rot: 0, isNew: true };
    UI.refresh(); const sz = W.size(type, 0); UI.focusFoot(sp[0], sp[1], sz.w, sz.h);
  };
  UI.startUnstore = function (id) {
    const s = st(), b = s.buildings[id]; if (!b || b.state !== 'stored') return;
    const c = camFor(s.currentIsland), sp = W.findSpot(s, s.currentIsland, b.type, 0, Iso.cell(c.x, c.y + 20), id);
    if (!sp) { UI.toast('There is no free space for that on this island.', 't'); return; }
    UI.closeAll(); UI.bm = UI.bm || { ghost: null }; UI.bm.ghost = { type: b.type, x: sp[0], y: sp[1], rot: 0, id, fromStorage: true };
    UI.refresh(); const sz = W.size(b.type, 0); UI.focusFoot(sp[0], sp[1], sz.w, sz.h);
  };
  UI.ghostTo = function (x, y) {
    const g = UI.bm && UI.bm.ghost; if (!g) return;
    const isl = D.ISLANDS[st().currentIsland]; x = Math.max(-2, Math.min(isl.grid.w, x)); y = Math.max(-2, Math.min(isl.grid.h, y));
    if (g.x === x && g.y === y) return; g.x = x; g.y = y; UI.renderGhost(); UI.renderBuildBar();
  };
  UI.ghostCheck = function () { const g = UI.bm && UI.bm.ghost; if (!g) return null; return W.canPlace(st(), st().currentIsland, g.type, g.x, g.y, g.rot, g.id); };
  UI.renderGhost = function () {
    const gEl = $('#ghost'), fp = $('#fp'); if (!gEl) return;
    const g = UI.bm && UI.bm.ghost; if (!g) { gEl.innerHTML = ''; fp.innerHTML = ''; return; }
    const chk = UI.ghostCheck(), s = W.size(g.type, g.rot), [cx, cy] = Iso.center(g.x, g.y, s.w, s.h);
    fp.innerHTML = IA.footprint(chk.cells || W.footprint(g.type, g.x, g.y, g.rot), chk.ok);
    const b = g.id ? Object.assign({}, st().buildings[g.id], { x: g.x, y: g.y, rot: g.rot, state: st().buildings[g.id].state === 'stored' ? 'built' : st().buildings[g.id].state }) : { type: g.type, level: 1, rot: g.rot, state: 'built' };
    const hgt = IA.heightOf(b);
    gEl.innerHTML = '<g data-ghost="1" class="ghost ' + (chk.ok ? 'ok' : 'bad') + '" transform="translate(' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')"><g opacity=".85">' + IA.building(b, st()) + '</g>' +
      '<polygon points="' + IA.foot(s.w, s.h).map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + '" fill="none" stroke="' + (chk.ok ? '#5dff8a' : '#ff5a6a') + '" stroke-width="3" stroke-dasharray="8 5" opacity=".95"/>' +
      '<polygon points="' + IA.foot(s.w + 1.2, s.h + 1.2).map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + '" fill="transparent"/><rect x="' + (-(s.w + s.h) * 16) + '" y="' + (-hgt) + '" width="' + ((s.w + s.h) * 32) + '" height="' + hgt + '" fill="transparent"/>' +
      '<g class="drag-hint" transform="translate(0 ' + (-hgt - 18) + ')"><circle r="15" fill="#2b2147" stroke="#fff" stroke-width="2"/><path d="M-8 0h16M0 -8v16M-8 0l3 -3M-8 0l3 3M8 0l-3 -3M8 0l-3 3M0 -8l-3 3M0 -8l3 3M0 8l-3 -3M0 8l3 -3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></g></g>';
  };
  UI.renderBuildBar = function () {
    const r = $('#bbar-root'); if (!r) return;
    if (!UI.bm || UI.screen !== 'island') { r.innerHTML = ''; return; }
    const g = UI.bm.ghost, s = st();
    let h = '';
    if (!g) {
      h = '<div class="bbar panel"><span class="bb-msg">Tap a building to move it, or add something new.</span><button class="btn small gold" data-act="bmCatalog" data-hl="build">' + I('plus') + 'Catalog</button><button class="btn small" data-act="bmStorage" data-hl="storage">' + I('box') + 'Storage' + (W.stored(s).length ? ' (' + W.stored(s).length + ')' : '') + '</button><button class="btn small ghost" data-act="bmDone">' + I('close') + 'Exit build</button></div>';
    } else {
      const d = D.BUILDINGS[g.type], chk = UI.ghostCheck(), b = g.id && s.buildings[g.id];
      const changed = g.isNew || g.fromStorage || g.x !== g.orig.x || g.y !== g.orig.y || g.rot !== g.orig.rot;
      if (g.live) {
        // Dev 8: a placed building moves for real the moment it is dropped on a valid spot (no Done button)
        const moved = g.start && (g.orig.x !== g.start.x || g.orig.y !== g.start.y || g.orig.rot !== g.start.rot);
        const msg = UI.bm.note ? UI.bm.note : chk.ok ? (moved ? 'Moved. Drag again, or tap ✕ when you are happy.' : 'Drag the ' + esc(d.name) + ' to move it. It stays where you drop it.') : '<span class="bad">' + esc(W.REASON_TEXT[chk.reason] || 'Not here.') + '</span>';
        h = '<div class="bbar panel sel live"><span class="bb-msg">' + msg + '</span>' +
          (moved ? '<button class="btn small ghost" data-act="bmCancel" aria-label="Undo move">' + I('back') + 'Undo</button>' : '') +
          (d.canRotate ? '<button class="btn small" data-act="bmRotate" aria-label="Rotate">' + I('rotate') + 'Rotate</button>' : '') +
          (b && d.canStore && b.state === 'built' ? '<button class="btn small" data-act="bmStore" data-hl="store">' + I('box') + 'Store</button>' : '') +
          (b ? '<button class="btn small ghost" data-act="bmInfo" aria-label="Details">' + I('info') + '</button>' : '') +
          '<button class="round sm" data-act="bmDeselect" data-hl="move" aria-label="Finished moving">' + I('close') + '</button></div>';
        r.innerHTML = h; UI.applyHl(); return;
      }
      const msg = chk.ok ? (g.isNew ? 'Place the ' + esc(d.name) + ' (' + costHtml(d.levels[0].cost) + ')' : g.fromStorage ? 'Place the ' + esc(d.name) + ' from storage' : changed ? 'Looks good here.' : 'Drag the ' + esc(d.name) + ' to move it.') : '<span class="bad">' + esc(W.REASON_TEXT[chk.reason] || 'Not here.') + '</span>';
      h = '<div class="bbar panel sel"><span class="bb-msg">' + msg + '</span>' +
        '<button class="btn small ghost" data-act="bmCancel" aria-label="Cancel">' + I('close') + 'Cancel</button>' +
        (d.canRotate ? '<button class="btn small" data-act="bmRotate" aria-label="Rotate">' + I('rotate') + 'Rotate</button>' : '') +
        (b && !g.fromStorage && d.canStore && b.state === 'built' ? '<button class="btn small" data-act="bmStore" data-hl="store">' + I('box') + 'Store</button>' : '') +
        (b && !g.fromStorage ? '<button class="btn small ghost" data-act="bmInfo" aria-label="Details">' + I('info') + '</button>' : '') +
        '<button class="btn small gold ' + (chk.ok ? '' : 'off') + '" data-act="bmConfirm" data-hl="move">' + I('check') + (g.isNew ? 'Build' : g.fromStorage ? 'Place' : 'Done') + '</button></div>';
    }
    r.innerHTML = h; UI.applyHl();
  };
  UI.act('bmCancel', () => {
    const g = UI.bm && UI.bm.ghost; if (!g) return;
    if (g.live && g.start && (g.orig.x !== g.start.x || g.orig.y !== g.start.y || g.orig.rot !== g.start.rot)) {
      const r = W.move(st(), g.id, g.start.x, g.start.y, g.start.rot);
      if (r.ok) { Object.assign(g, { x: g.start.x, y: g.start.y, rot: g.start.rot }); g.orig = Object.assign({}, g.start); UI.bm.note = 'Back where it started.'; Au.play('ok'); UI.afterAction(); UI.bm.note = null; return; }
    }
    UI.bm.ghost = null; UI.refresh();
  });
  UI.act('bmDeselect', () => { if (UI.bm) { UI.bm.ghost = null; UI.bm.note = null; UI.refresh(); } });
  UI.act('bmRotate', () => { const g = UI.bm && UI.bm.ghost; if (!g) return; g.rot = g.rot ? 0 : 1; UI.renderGhost(); if (g.live) UI.ghostRelease(); else UI.renderBuildBar(); });
  // Commits a live move when the ghost is released on a valid spot; an invalid drop snaps back to the last valid
  // spot (the saved position never changes until a move succeeds, so the island can never end up overlapping).
  UI.ghostRelease = function () {
    const g = UI.bm && UI.bm.ghost; if (!g || !g.live || !g.id) return;
    const s = st(), b = s.buildings[g.id]; if (!b) return;
    if (g.x === b.x && g.y === b.y && g.rot === b.rot) { UI.bm.note = null; UI.renderBuildBar(); return; }
    const r = W.move(s, g.id, g.x, g.y, g.rot);
    if (!r.ok) {
      Au.play('no'); const why = W.REASON_TEXT[r.reason] || 'Not there.';
      Object.assign(g, { x: b.x, y: b.y, rot: b.rot }); UI.bm.note = '<span class="bad">' + esc(why) + '</span> It stays where it was.';
      UI.renderGhost(); UI.renderBuildBar(); setTimeout(() => { if (UI.bm && UI.bm.ghost === g) { UI.bm.note = null; UI.renderBuildBar(); } }, 2600); return;
    }
    g.orig = { x: b.x, y: b.y, rot: b.rot }; UI.bm.note = null; Au.play('tap');
    const sz = W.size(g.type, g.rot), [cx, cy] = Iso.center(g.x, g.y, sz.w, sz.h), [px, py] = toScreen(cx, cy - 10);
    if (UI.pixelBurst) UI.pixelBurst(px, py, { n: 10, color: '#8fe6d6' });
    UI.afterAction();
  };
  UI.act('bmInfo', () => { const g = UI.bm && UI.bm.ghost; if (g && g.id) UI.buildingPanel(g.id); });
  UI.act('bmStore', () => {
    const g = UI.bm && UI.bm.ghost; if (!g || !g.id) return;
    const r = W.store(st(), g.id);
    if (!r.ok) { Au.play('no'); UI.toast(r.reason === 'busy' ? 'Wait until it has finished building or upgrading.' : 'That cannot be stored.', 't'); return; }
    Au.play('ok'); UI.bm.ghost = null; UI.afterAction(); UI.toast(D.BUILDINGS[g.type].name + ' is safe in storage. Open Storage to place it again.', 'n');
  });
  UI.act('bmConfirm', () => {
    const s = st(), g = UI.bm && UI.bm.ghost; if (!g) return;
    let r;
    if (g.isNew) r = W.buildNew(s, s.currentIsland, g.type, g.x, g.y, g.rot);
    else if (g.fromStorage) r = W.unstore(s, g.id, s.currentIsland, g.x, g.y, g.rot);
    else if (g.x === g.orig.x && g.y === g.orig.y && g.rot === g.orig.rot) r = { ok: true, unchanged: true };
    else r = W.move(s, g.id, g.x, g.y, g.rot);
    if (!r.ok) { Au.play('no'); UI.toast(r.text || W.REASON_TEXT[r.reason] || 'That did not work.', 't'); UI.renderBuildBar(); return; }
    Au.play(g.isNew || g.fromStorage ? 'restore' : 'ok');
    const [cx, cy] = Iso.center(g.x, g.y, W.size(g.type, g.rot).w, W.size(g.type, g.rot).h), [px, py] = toScreen(cx, cy - 40);
    if (g.isNew) floatAt(px, py, '-' + fmt(D.BUILDINGS[g.type].levels[0].cost.gold || 0) + ' gold', '#ffd86b');
    UI.sparklesAt(px, py);
    UI.bm.ghost = null; UI.afterAction();
  });
  UI.sparklesAt = function (px, py) { const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:' + px + 'px;top:' + py + 'px;width:1px;height:1px'; $('#app').appendChild(d); UI.sparkles(d, 16); setTimeout(() => d.remove(), 1100); };

  /* =========================================================== thumbnails */
  UI.thumb = function (b) {
    const s = W.size(b.type, b.rot || 0), hgt = IA.heightOf(b), wd = (s.w + s.h) * 18 + 8;
    return '<svg class="thumb" viewBox="' + (-wd) + ' ' + (-hgt - 12) + ' ' + (wd * 2) + ' ' + (hgt + (s.w + s.h) * 9 + 20) + '" xmlns="' + NS + '">' + IA.building(b, st()) + '</svg>';
  };
  UI.obsThumb = function (type) { const t = D.OBSTACLE_TYPES[type], hgt = IA.obstacleHeight(type), wd = (t.w + t.h) * 30; return '<svg class="thumb" viewBox="' + (-wd) + ' ' + (-hgt - 10) + ' ' + wd * 2 + ' ' + (hgt + 34) + '" xmlns="' + NS + '">' + IA.obstacle({ type }) + '</svg>'; };

  /* =========================================================== building panel */
  const fxRows = (d, a, b) => {
    const rows = [];
    const unit = d.produces ? d.produces + (d.perResident ? '/min per resident' : '/min') : '';
    if (a.rate != null || b.rate != null) rows.push(['Production', a.rate != null ? a.rate + ' ' + unit : '–', b.rate != null ? b.rate + ' ' + unit : '–']);
    if (a.capMin != null) rows.push(['Storage', a.capMin + ' min', b.capMin + ' min']);
    if (a.capacity != null) rows.push(['Residents', a.capacity, b.capacity]);
    if (a.eggTime != null) rows.push(['Incubation', Math.round(a.eggTime * 100) + '%', Math.round(b.eggTime * 100) + '%']);
    if (a.rewardMult != null) rows.push(['Dungeon rewards', '×' + a.rewardMult, '×' + b.rewardMult]);
    if (a.slots != null) rows.push(['Breeding slots', a.slots, b.slots]);
    if (a.forge != null && D.FORGE) { const n = (k, lv) => D.FORGE[k].filter((x) => x.lv <= lv).length; rows.push(['Recipes', n('recipes', a.forge), n('recipes', b.forge)], ['Shop items', n('shop', a.forge), n('shop', b.forge)], ['Highest merge', 'Tier ' + Math.max(...Object.keys(D.FORGE.merge).filter((t) => D.FORGE.merge[t].lv <= a.forge)), 'Tier ' + Math.max(...Object.keys(D.FORGE.merge).filter((t) => D.FORGE.merge[t].lv <= b.forge))]); }
    // v0.4: habitats change their look with each level (island-art.js B.habitat)
    const LOOK = ['', 'Cottage', 'Front garden', 'Pennant and lit windows', 'Crystal crown', 'Golden trim'];
    if (d.cat === 'habitat') { const lv = d.levels.indexOf(b) + 1; if (LOOK[lv]) rows.push(['Look', LOOK[lv - 1] || '–', LOOK[lv]]); }
    return rows;
  };
  UI.buildingPanel = function (id, ovEx) {
    const s = st(), b = s.buildings[id]; if (!b) return;
    const d = W.def(b);
    W.tick(s); W.tickProduction(s);
    let body = '<div class="bp"><div class="bp-art">' + UI.thumb(b) + '</div><div class="bp-main"><p class="bp-desc">' + esc(d.desc) + '</p>';
    let foot = '';
    if (b.state === 'ruined') {
      const info = W.restoreInfo(s, id);
      if (info.reason === 'locked') { body += '<p class="muted"><b>Locked.</b> ' + esc(info.text) + '</p>'; foot += '<button class="btn small" data-act="navReq" data-id="' + id + '">' + I('arrow') + 'Show me how</button>'; }
      else {
        const ok = info.ok;
        body += '<div class="kv"><b>Restore cost:</b> ' + costHtml(d.levels[0].cost) + ' &nbsp; <span class="' + (ok ? 'good' : 'bad') + '">' + (ok ? 'You can afford this.' : esc(info.text)) + '</span></div>';
        foot += '<button class="btn gold ' + (ok ? '' : 'off') + '" data-act="restore" data-id="' + id + '" data-hl="restore">' + I('spark') + 'Restore</button>';
      }
    } else {
      body += '<div class="kv"><b>Level</b> ' + b.level + ' / ' + d.levels.length + (b.island !== s.currentIsland && b.island ? ' · on ' + esc(D.ISLANDS[b.island].name) : '') + '</div>';
      if (b.state === 'constructing' || b.state === 'upgrading') {
        const left = W.remaining(b), tot = Math.max(1, (b.endAt - (b.startAt || b.endAt)) / 1000), gems = W.finishCost(left);
        body += '<div class="timer-box"><b>' + (b.state === 'constructing' ? 'Under construction' : 'Upgrading to level ' + b.toLevel) + '</b><div class="bar"><i style="width:' + pct(tot - left, tot) + '%"></i></div><span class="muted" data-live="left">' + IA.fmtTime(left) + ' left</span></div>';
        foot += '<button class="btn small ' + (s.res.gems >= gems ? '' : 'off') + '" data-act="finishNow" data-kind="building" data-id="' + id + '">' + I('gem') + 'Finish now (' + gems + ')</button>';
      }
      if (d.produces && b.level >= 1) {
        const per = W.perMin(s, b), cap = W.capOf(s, b), stock = W.stock(s, id), kind = W.prodKind(b), kn = esc(W.kindName(kind)), ic = I(kind === 'gems' ? 'gem' : kind), opts = W.prodOptions(b);
        // Dev 8: habitats choose between basic gold and their element's essence
        if (opts.length > 1) {
          const ld = W.levelData(b), base = W.isEss(kind) ? per / W.essRate() : per;
          body += '<div class="section-t">Production</div><div class="prodsel" role="radiogroup">' + opts.map((k) => { const on = k === kind, rate = W.isEss(k) ? base * W.essRate() : base;
            return '<button class="prodopt' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-act="setProd" data-id="' + id + '" data-k="' + k + '">' + I(k) + '<b>' + esc(W.kindName(k) === 'gold' ? 'Gold' : W.kindName(k)) + '</b><small>' + (rate ? (rate < 1 ? rate.toFixed(2) : rate.toFixed(1)) + ' / min' : 'needs a resident') + ' · stores ' + ld.capMin + ' min</small>' + (on ? '<em>Active</em>' : '') + '</button>'; }).join('') + '</div>' +
            '<p class="muted small-t">Switching collects whatever is stored first, in the resource it was made as. Nothing is lost or converted.</p>';
        }
        body += '<div class="kv"><b>Produces:</b> ' + (per ? (per < 1 ? per.toFixed(2) : per.toFixed(1)) + ' ' + kn + ' / min' : '<span class="bad">nothing yet</span>' + (d.perResident ? ' — it needs a resident.' : '')) + '</div>';
        body += '<div class="kv"><b>Ready:</b> ' + fmt(stock) + ' / ' + fmt(cap) + ' ' + kn + '<div class="bar"><i style="width:' + pct(stock, cap) + '%"></i></div></div>';
        if (d.affinity && d.affinity.length && d.perResident) body += '<div class="kv muted">+50% for ' + d.affinity.map((e) => D.ELEMENTS[e].name).join(' or ') + ' residents.</div>';
        foot += '<button class="btn gold ' + (stock >= 1 ? '' : 'off') + '" data-act="collectB" data-id="' + id + '" data-hl="collect">' + ic + 'Collect ' + (stock >= 1 ? fmt(stock) : '') + '</button>';
      }
      if (d.perResident && b.level >= 1) {
        const res = W.residents(s, b), cap = W.capacity(b);
        body += '<div class="section-t">Residents ' + res.length + ' / ' + cap + '</div><div class="res-row">' + res.map((a) => '<div class="rchip">' + '<div class="art">' + Art.portrait(a.sp) + '</div><span>' + esc(D.SPECIES[a.sp].name) + ' · ' + a.lv + '</span>' + (a.uid === s.active ? '<em>companion</em>' : '<button class="x sm" data-act="unassign" data-id="' + id + '" data-uid="' + a.uid + '" aria-label="Move out">' + I('close') + '</button>') + '</div>').join('') +
          (res.length < cap ? '<button class="rchip add" data-act="assignPick" data-id="' + id + '">' + I('plus') + '<span>Add resident</span></button>' : '') + '</div>';
      }
      // upgrade
      if (b.level < d.levels.length && b.state !== 'stored') {
        const info = W.upgradeInfo(s, id), cur = W.levelData(b), nx = d.levels[b.level];
        const rows = fxRows(d, cur, nx);
        body += '<div class="section-t">Upgrade to level ' + (b.level + 1) + '</div>' + (rows.length ? '<table class="fx">' + rows.map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + I('arrow') + '</td><td class="good">' + r[2] + '</td></tr>').join('') + '</table>' : '') +
          '<div class="kv"><b>Cost:</b> ' + costHtml(nx.cost) + ' · <b>Time:</b> ' + IA.fmtTime(W.secs(s, nx.time)) + (info.ok ? '' : ' <span class="bad">' + esc(info.text || '') + '</span>') + '</div>';
        if (info.reason !== 'busy') foot += '<button class="btn ' + (info.ok ? 'gold' : 'off') + '" data-act="upgrade" data-id="' + id + '" data-hl="upgrade">' + I('up') + 'Upgrade</button>';
      } else if (b.level >= d.levels.length) body += '<p class="good"><b>Maximum level.</b></p>';
    }
    body += '</div></div>';
    // contextual actions (only what this building supports)
    let acts = '';
    if (b.state !== 'ruined' && b.island === s.currentIsland && d.canMove) acts += '<button class="btn small ghost" data-act="bpMove" data-id="' + id + '" data-hl="move">' + I('move') + 'Move</button>';
    if (b.state === 'built' && d.canStore) acts += '<button class="btn small ghost" data-act="bpStore" data-id="' + id + '" data-hl="store">' + I('box') + 'Store</button>';
    if (id === 'hatchery' && b.level >= 1) acts += '<button class="btn small" data-act="hatchery">' + I('egg') + 'Open Hatchery</button>';
    if (id === 'forge' && b.level >= 1) acts += '<button class="btn small gold" data-act="forge" data-hl="forge">' + I('hammer') + 'Open Forge</button>';
    if (id === 'reliquarygate' && b.level >= 1) acts += '<button class="btn small" data-act="dungeons">' + I('gate') + 'Dungeons</button>';
    const html = UI.sheet(esc(d.name) + (b.level >= 1 ? ' <span class="lv">Lv ' + b.level + '</span>' : b.state === 'ruined' ? ' <span class="lv ruin">Ruin</span>' : ''), body, acts + '<span class="sp"></span>' + foot, 'narrow wide bpanel');
    let ov = ovEx;
    if (ov && ov.parentNode) ov.innerHTML = html; else ov = UI.modal(html, { onClose: () => UI.refresh() });
    ov._bid = id;
    ov._live = () => { const bb = st().buildings[id]; if (!bb) return; if (bb.state === 'constructing' || bb.state === 'upgrading' || (W.def(bb).produces && Date.now() % 15000 < 1000)) UI.buildingPanel(id, ov); };
    UI.applyHl();
    return ov;
  };
  const panelOf = (el) => el.closest('.overlay');
  UI.act('setProd', (el) => {
    const id = el.dataset.id, k = el.dataset.k, ov = panelOf(el), s = st(), b = s.buildings[id]; if (!b || W.prodKind(b) === k) return;
    W.tickProduction(s);
    const go = () => { const r = W.setProd(st(), id, k); if (!r.ok) { Au.play('no'); return; } Au.play('ok'); S.save();
      if (r.settled) UI.toast('Collected ' + fmt(r.settled.n) + ' ' + W.kindName(r.settled.kind) + ' first. Now making ' + W.kindName(k) + '.', 'n'); else UI.toast('Now making ' + W.kindName(k) + '.', 'n');
      R.drain(); UI.flush && UI.flush(); UI.refresh(); if (ov && ov.parentNode) UI.buildingPanel(id, ov); };
    const n = W.stock(s, id);
    if (n >= 1) UI.confirm('Switch to ' + W.kindName(k) + '?', 'The ' + fmt(n) + ' ' + W.kindName(W.prodKind(b)) + ' stored here is collected first. Then it starts making ' + W.kindName(k) + '.', 'Collect and switch', go); else go();
  });
  UI.act('restore', (el) => {
    const id = el.dataset.id, r = W.restore(st(), id), ov = panelOf(el);
    if (!r.ok) { Au.play('no'); return; }
    UI.close(ov); UI.afterAction(); UI.focusBuilding(id); const b = st().buildings[id], s2 = W.size(b.type, b.rot), [cx, cy] = Iso.center(b.x, b.y, s2.w, s2.h); const [px, py] = toScreen(cx, cy - 40); UI.sparklesAt(px, py);
  });
  UI.act('collectB', (el) => {
    const id = el.dataset.id, r = W.collect(st(), id), ov = panelOf(el);
    if (!r.ok) return; Au.play('ok'); const rc = el.getBoundingClientRect(); floatAt(rc.left + rc.width / 2, rc.top, '+' + fmt(r.n) + ' ' + W.kindName(r.kind), '#fff');
    S.save(); R.after(st()); UI.flush(); UI.renderHud(); UI.renderObjects(); UI.buildingPanel(id, ov);
  });
  UI.act('upgrade', (el) => {
    const id = el.dataset.id, s = st(), info = W.upgradeInfo(s, id), ov = panelOf(el);
    if (!info.ok) { Au.play('no'); return; }
    const go = () => { const r = W.upgrade(s, id); if (!r.ok) { Au.play('no'); return; } Au.play('restore'); UI.afterAction(); if (ov.parentNode) UI.buildingPanel(id, ov); };
    // confirm expensive upgrades (more than 500 gold or a quarter of the player's gold)
    const g = info.cost.gold || 0;
    if (g >= 500 || g >= s.res.gold * 0.25) UI.confirm('Upgrade ' + W.def(s.buildings[id]).name + '?', 'Level ' + info.toLevel + ' costs ' + costHtml(info.cost) + ' and takes ' + IA.fmtTime(info.time) + '. You will have ' + fmt(s.res.gold - g) + ' gold left.', 'Upgrade', go);
    else go();
  });
  UI.act('finishNow', (el) => {
    const s = st(), kind = el.dataset.kind, id = el.dataset.id, rec = kind === 'obstacle' ? W.obstacleRec(s, id) : s.buildings[id], gems = W.finishCost(W.remaining(rec)), ov = panelOf(el);
    UI.confirm('Finish now?', 'Spend ' + gems + ' gem' + (gems > 1 ? 's' : '') + ' to finish immediately? Gems are earned in play; nothing here costs real money.', 'Finish now', () => {
      const r = W.finishNow(s, kind, id); if (!r.ok) { Au.play('no'); UI.toast('Not enough gems.', 't'); return; }
      Au.play('ok'); UI.afterAction(); if (ov && ov.parentNode) { if (kind === 'obstacle') UI.close(ov); else UI.buildingPanel(id, ov); }
    });
  });
  UI.act('bpMove', (el) => { const id = el.dataset.id; UI.closeAll(); if (!UI.bm && !UI.enterBuild()) return; UI.selectForMove(id); });
  UI.act('bpStore', (el) => {
    const id = el.dataset.id, s = st(), ov = panelOf(el), nm = W.def(s.buildings[id]).name;
    UI.confirm('Store the ' + nm + '?', 'It goes to Storage with its level intact (anything ready is collected first). You can place it again on any unlocked island.', 'Store', () => {
      const r = W.store(s, id); if (!r.ok) { Au.play('no'); UI.toast('Wait until it has finished building or upgrading.', 't'); return; }
      Au.play('ok'); if (ov && ov.parentNode) UI.close(ov); UI.afterAction();
    });
  });
  UI.act('navReq', (el) => { const d = D.BUILDINGS[el.dataset.id]; UI.closeAll(); UI.go(Nav.resolve(st(), { type: 'restore', target: el.dataset.id })); });
  UI.act('assignPick', (el) => {
    const id = el.dataset.id, s = st(), ovParent = panelOf(el), b = s.buildings[id], d = W.def(b);
    const list = s.aminas.filter((a) => a.uid !== s.active && (b.residents || []).indexOf(a.uid) < 0);
    if (!list.length) { UI.toast('Every Amina already has a job, or it’s your companion. Explore to befriend more.', 't'); return; }
    const ov = UI.modal(UI.sheet('Choose a resident for the ' + esc(d.name), '<div class="grid">' + list.map((a) => { const sp = D.SPECIES[a.sp], fits = (d.affinity || []).indexOf(sp.el) >= 0, home = W.homeOf(s, a.uid); return '<div class="card" data-act="assign" data-id="' + id + '" data-uid="' + a.uid + '">' + UI.h.artBox(a.sp) + '<div class="nm">' + esc(sp.name) + '</div><div>' + chip(sp.el) + '</div><div class="lvl">Lv ' + a.lv + (fits ? ' · <span class="good">+50%</span>' : '') + (home ? '<br>lives in ' + esc(W.def(home).name) : '') + '</div></div>'; }).join('') + '</div>', '<button class="btn ghost" data-act="close">Cancel</button>', 'narrow wide'));
    ov._parent = ovParent;
  });
  UI.act('assign', (el) => { const ov = panelOf(el), r = W.assign(st(), el.dataset.id, +el.dataset.uid); if (!r.ok) { Au.play('no'); UI.toast(r.reason === 'full' ? 'That building is full. Upgrade it for more room.' : 'That did not work.', 't'); return; } Au.play('ok'); S.save(); const p = ov._parent; UI.close(ov); if (p && p.parentNode) UI.buildingPanel(el.dataset.id, p); UI.renderObjects(); });
  UI.act('unassign', (el) => { const ov = panelOf(el); W.unassign(st(), el.dataset.id, +el.dataset.uid); S.save(); UI.buildingPanel(el.dataset.id, ov); UI.renderObjects(); });
  UI.structPanel = (id) => UI.buildingPanel(id); // legacy name

  /* =========================================================== obstacle panel */
  UI.obstaclePanel = function (oid, ovEx) {
    const s = st(), o = D.obstacleById[oid]; if (!o) return;
    const info = D.obstacleInfo(o.island, o.type), state = W.obstacleState(s, oid), rec = W.obstacleRec(s, oid);
    let body = '<div class="bp"><div class="bp-art">' + UI.obsThumb(o.type) + '</div><div class="bp-main">', foot = '';
    if (state === 'removing') {
      const left = W.remaining(rec), tot = Math.max(1, (rec.endAt - (rec.startAt || rec.endAt)) / 1000), gems = W.finishCost(left);
      body += '<div class="timer-box"><b>Clearing…</b><div class="bar"><i style="width:' + pct(tot - left, tot) + '%"></i></div><span class="muted">' + IA.fmtTime(left) + ' left · reward ' + costHtml(info.reward) + '</span></div>';
      foot = '<button class="btn small ' + (s.res.gems >= gems ? '' : 'off') + '" data-act="finishNow" data-kind="obstacle" data-id="' + oid + '">' + I('gem') + 'Finish now (' + gems + ')</button><button class="btn gold" data-act="close">OK</button>';
    } else {
      const short = E.shortfall(s, info.cost), ok = !Object.keys(short).length;
      body += '<p class="bp-desc">Clearing it frees ' + (info.w * info.h) + ' tile' + (info.w * info.h > 1 ? 's' : '') + ' for building.</p>' +
        '<div class="kv"><b>Cost:</b> ' + costHtml(info.cost) + ' · <b>Time:</b> ' + IA.fmtTime(W.secs(s, info.time)) + '</div><div class="kv"><b>You get:</b> ' + costHtml(info.reward) + ' + ' + info.xp + ' rank xp</div>' +
        (ok ? '' : '<p class="bad">Need ' + esc(E.fmt(short)) + ' more.</p>');
      foot = '<button class="btn ghost" data-act="close">Keep it</button><button class="btn gold ' + (ok ? '' : 'off') + '" data-act="removeObs" data-id="' + oid + '" data-hl="remove">' + I('axe') + 'Remove</button>';
    }
    body += '</div></div>';
    const html = UI.sheet(esc(info.name), body, foot, 'narrow');
    let ov = ovEx; if (ov && ov.parentNode) ov.innerHTML = html; else ov = UI.modal(html, { onClose: () => UI.refresh() });
    ov._live = () => { if (W.obstacleState(st(), oid) === 'removing') UI.obstaclePanel(oid, ov); else if (W.obstacleState(st(), oid) === 'cleared') UI.close(ov); };
    UI.applyHl(); return ov;
  };
  UI.act('removeObs', (el) => {
    const oid = el.dataset.id, ov = panelOf(el), r = W.removeObstacle(st(), oid);
    if (!r.ok) { Au.play('no'); UI.toast(r.reason === 'already' ? 'Already being cleared.' : r.reason === 'insufficient' ? 'Not enough gold yet.' : 'That cannot be removed right now.', 't'); return; }
    Au.play('ok'); UI.close(ov); UI.afterAction();
  });

  /* =========================================================== catalog & storage */
  UI.catTab = 'production';
  UI.catalog = function (focus, ovEx) {
    const s = st(), iid = s.currentIsland;
    if (focus) UI.catTab = D.BUILDINGS[focus].cat;
    const tabs = D.CATALOG_CATS.map(([k, label]) => '<button class="seg-b ' + (UI.catTab === k ? 'on' : '') + '" data-act="catTab" data-k="' + k + '">' + label + '</button>').join('');
    const cards = D.CATALOG.filter((k) => D.BUILDINGS[k].cat === UI.catTab).map((k) => {
      const d = D.BUILDINGS[k], info = W.canBuildInfo(s, k, iid), n = W.buildingsOn(s, iid).filter((b) => b.type === k).length;
      const why = info.ok ? '' : info.reason === 'insufficient' ? '<span class="bad">' + esc(info.text) + '</span>' : '<span class="muted">' + esc(info.text || '') + '</span>';
      return '<div class="card bcard ' + (info.reason === 'locked' || info.reason === 'limit' ? 'lockd' : '') + '" data-act="catPick" data-id="' + k + '" data-hl="cat:' + k + '">' + UI.thumb({ type: k, level: 1, state: 'built', rot: 0 }) +
        '<div class="nm">' + esc(d.name) + '</div><div class="lvl">' + costHtml(d.levels[0].cost) + ' · ' + d.w + '×' + d.h + (d.levels[0].time ? ' · ' + IA.fmtTime(W.secs(s, d.levels[0].time)) : '') + '</div>' +
        '<div class="lvl">' + (d.maxCount ? n + '/' + d.maxCount + ' here' : '') + (d.produces ? ' · makes ' + d.produces : '') + '</div>' + (why ? '<div class="why">' + why + '</div>' : '') + (info.reason === 'locked' ? '<span class="lockico">' + I('lock') + '</span>' : '') + '</div>';
    }).join('');
    const html = UI.sheet('Build · ' + esc(D.ISLANDS[iid].name), '<div class="seg cat-tabs">' + tabs + '</div><div class="grid bgrid">' + cards + '</div>', '<span class="muted sp" style="font-size:.78rem">Pick something, drag it onto free grass, then tap Build.</span><button class="btn gold" data-act="close">Close</button>', 'wide');
    let ov = ovEx; if (ov && ov.parentNode) ov.innerHTML = html; else ov = UI.modal(html);
    UI.applyHl();
    const t = focus && $('[data-hl="cat:' + focus + '"]', ov); if (t) t.scrollIntoView({ block: 'nearest' });
    return ov;
  };
  UI.act('catTab', (el) => { UI.catTab = el.dataset.k; UI.catalog(null, panelOf(el)); });
  UI.act('catPick', (el) => { if (!UI.bm) UI.bm = { ghost: null }; UI.startPlace(el.dataset.id); });
  UI.storage = function (focus) {
    const s = st(), list = W.stored(s);
    const body = list.length ? '<div class="grid bgrid">' + list.map((b) => '<div class="card bcard" data-act="unstorePick" data-id="' + b.id + '" data-hl="stored:' + b.id + '">' + UI.thumb(Object.assign({}, b, { state: 'built' })) + '<div class="nm">' + esc(W.def(b).name) + '</div><div class="lvl">Level ' + b.level + '</div></div>').join('') + '</div>' :
      '<div class="empty">' + I('box') + '<p>Storage is empty.</p><p class="muted">In Build mode, select a farm, mine, habitat or decoration and tap <b>Store</b> to keep it here. Stored buildings keep their level and can go on any unlocked island.</p></div>';
    const ov = UI.modal(UI.sheet('Storage', body, '<button class="btn gold" data-act="close">Close</button>', 'wide'));
    UI.applyHl(); return ov;
  };
  UI.act('unstorePick', (el) => { if (!UI.bm) UI.bm = { ghost: null }; UI.startUnstore(el.dataset.id); });

  /* =========================================================== island map */
  // Island map thumbnail: a small floating block island in the island's own materials, with its signature feature.
  UI.isleThumb = (iid) => isleThumb(iid);
  function isleThumb(iid) {
    const V = IA.VP[iid], d = (c, a) => A.Art.shade(c, a);
    const top = 'M-48 -2L0 -26 48 -2 0 22Z', L1 = 'M-48 -2L0 22V36L-48 12Z', R1 = 'M0 22L48 -2V12L0 36Z';
    const L2 = 'M-34 12L0 30V46L-34 28Z', R2 = 'M0 30L34 12V28L0 46Z', L3 = 'M-16 28L0 38V52L-16 42Z', R3 = 'M0 38L16 28V42L0 52Z';
    return '<svg viewBox="-60 -40 120 96" class="isle-thumb" xmlns="' + NS + '">' +
      '<path d="' + L3 + '" fill="' + d(V.deep[0], -0.07) + '"/><path d="' + R3 + '" fill="' + d(V.deep[0], -0.25) + '"/><path d="' + L2 + '" fill="' + d(V.stone[0], -0.07) + '"/><path d="' + R2 + '" fill="' + d(V.stone[0], -0.25) + '"/>' +
      '<path d="' + L1 + '" fill="' + d(V.dirt[0], -0.07) + '"/><path d="' + R1 + '" fill="' + d(V.dirt[0], -0.25) + '"/><path d="M-48 -2L0 22V27L-48 3Z" fill="' + d(V.lip[0], -0.07) + '"/><path d="M0 22L48 -2V3L0 27Z" fill="' + d(V.lip[0], -0.25) + '"/>' +
      '<path d="' + top + '" fill="' + d(V.grass[0], 0.1) + '"/><path d="M-24 -2L0 -14 24 -2 0 10Z" fill="' + d(V.grass[2], 0.12) + '" opacity=".6"/>' +
      { starter: '<rect x="-20" y="-24" width="6" height="12" fill="#7a5536"/><rect x="-27" y="-36" width="20" height="14" fill="#4fae3c"/><rect x="6" y="-20" width="20" height="14" fill="#d9cfb6"/><rect x="6" y="-26" width="20" height="6" fill="#c4b998"/><rect x="12" y="-16" width="8" height="10" fill="#ffe7a8"/>',
        verdant: '<rect x="-4" y="-30" width="8" height="22" fill="#7a5636"/><rect x="-16" y="-44" width="32" height="16" fill="#2f8f48"/><rect x="-8" y="-50" width="16" height="8" fill="#4fbf63"/><path d="M-40 0h22v3h-22zM18 4h22v3h-22z" fill="#3fd9cf"/>',
        obsidian: '<rect x="-14" y="-28" width="10" height="24" fill="#2a2236"/><rect x="-2" y="-20" width="8" height="16" fill="#33294a"/><rect x="14" y="-18" width="5" height="12" fill="#e64ab8"/><rect x="-26" y="-8" width="4" height="4" fill="#ff8a4a"/>',
        celestial: '<rect x="-12" y="-18" width="24" height="12" fill="#e8e4fb"/><rect x="-14" y="-26" width="28" height="8" fill="#8a86c8"/><rect x="-8" y="-32" width="16" height="6" fill="#7a76b8"/><rect x="-14" y="-18" width="28" height="2" fill="#ffd86b"/><rect x="22" y="-26" width="4" height="4" fill="#fff3b0"/>' }[iid] + '</svg>';
  }
  UI.islandMap = function () {
    const s = st();
    const cards = D.ISLAND_ORDER.map((iid) => {
      const isl = D.ISLANDS[iid], un = W.islandUnlocked(s, iid), here = s.currentIsland === iid, short = Math.max(0, isl.price - s.res.gold);
      const nb = W.buildingsOn(s, iid).filter((b) => b.state !== 'ruined').length, cleared = W.obstaclesOn(s, iid).filter((o) => o.state === 'cleared').length;
      let act;
      if (here) act = '<span class="tagp play">You are here</span>';
      else if (un) act = '<button class="btn gold small" data-act="travel" data-id="' + iid + '" data-hl="travel:' + iid + '">' + I('arrow') + 'Travel</button>';
      else act = '<button class="btn small ' + (short ? 'ghost short' : 'gold') + '" data-act="unlockIsle" data-id="' + iid + '" data-hl="unlock:' + iid + '">' + I('lock') + 'Unlock · ' + fmt(isl.price) + '</button>' + (short ? '<div class="bad small-t">Need ' + fmt(short) + ' more gold</div>' : '');
      return '<div class="icard ' + (un ? 'un' : 'lk') + (here ? ' here' : '') + '" data-hl="island:' + iid + '" data-island="' + iid + '">' + isleThumb(iid) + '<div class="ic-b"><h3>' + esc(isl.name) + '</h3><p class="blurb">' + esc(isl.blurb) + '</p>' +
        (un ? '<p class="muted small-t">' + nb + ' building' + (nb === 1 ? '' : 's') + ' · ' + cleared + ' / ' + D.OBSTACLES[iid].length + ' cleared</p>' : '<p class="muted small-t">' + (isl.price ? 'Unlock price: ' + fmt(isl.price) + ' gold' : 'Free') + '</p>') + '</div><div class="ic-a">' + act + '</div></div>';
    }).join('');
    const ov = UI.modal(UI.sheet('Islands', '<div class="imap">' + cards + '</div>', '<span class="muted sp" style="font-size:.78rem">Each island keeps its own buildings and obstacles. Unlocks are permanent.</span><button class="btn gold" data-act="close">Close</button>', 'wide'));
    UI.applyHl(); const t = $('.hl', ov); if (t) t.scrollIntoView({ block: 'nearest' });
    return ov;
  };
  UI.act('map', () => { if (UI.bm) UI.exitBuild(); UI.islandMap(); });
  UI.act('unlockIsle', (el) => {
    const s = st(), iid = el.dataset.id, isl = D.ISLANDS[iid];
    if (W.islandUnlocked(s, iid)) return;
    if (s.res.gold < isl.price) { Au.play('no'); UI.toast('You need ' + fmt(isl.price - s.res.gold) + ' more gold for the ' + isl.name + '. Nothing was spent.', 't'); return; }
    UI.confirm('Unlock ' + isl.name + '?', 'This costs <b>' + fmt(isl.price) + ' gold</b>. You have ' + fmt(s.res.gold) + ' and will have ' + fmt(s.res.gold - isl.price) + ' left. Unlocks are permanent.', 'Unlock for ' + fmt(isl.price), () => {
      const r = W.unlockIsland(s, iid);
      if (!r.ok) { Au.play('no'); UI.toast(r.reason === 'already' ? 'Already unlocked.' : 'Not enough gold. Nothing was spent.', 't'); return; }
      Au.play('discover'); UI.afterAction(); UI.closeAll(); UI.banner(isl.name.toUpperCase(), 'Island unlocked!'); UI.travelTo(iid);
    });
  });
  UI.travelTo = function (iid) {
    const r = W.travel(st(), iid); if (!r.ok) return false;
    if (UI.bm) UI.bm = null;
    UI.closeAll(); UI.afterAction(); UI.wv = null; UI.renderWorld(true); applyCam();
    const w = $('#world'); if (w && !UI.calm()) { w.classList.remove('arrive'); void w.offsetWidth; w.classList.add('arrive'); }
    return true;
  };
  UI.act('travel', (el) => { Au.play('ok'); UI.travelTo(el.dataset.id); });

  /* =========================================================== quests list */
  UI.missions = function (ovEx, focusId) {
    const s = st();
    const row = (q) => {
      const status = Q.status(s, q), p = Q.progress(s, q), rw = q.reward;
      const rewards = ['gold', 'food', 'gems'].filter((k) => rw[k]).map((k) => '<span>' + I(k === 'gems' ? 'gem' : k) + ' ' + fmt(rw[k]) + '</span>').join('');
      const objs = status === 'claimed' ? '' : '<ul class="objs">' + p.objs.map((o) => '<li class="' + (o.done ? 'ok' : '') + '">' + (o.done ? I('check') : '<i class="dot"></i>') + esc(Q.label(o.ob)) + (o.total > 1 ? ' <span class="muted">' + fmt(o.cur) + '/' + fmt(o.total) + '</span>' : '') + (o.ob.optional ? ' <em class="opt">bonus</em>' : '') + '</li>').join('') + '</ul>';
      const btn = status === 'ready' ? '<button class="btn gold" data-act="claim" data-id="' + q.id + '" data-hl="claim:' + q.id + '">Claim</button>' : status === 'claimed' ? '' : '<button class="btn small" data-act="questGo" data-id="' + q.id + '">' + I('arrow') + 'Go</button>';
      return '<div class="mrow ' + (status === 'ready' ? 'ready' : status === 'claimed' ? 'done' : '') + '" data-q="' + q.id + '"><div><h3>' + esc(q.title) + (status === 'claimed' ? ' ✓' : '') + '</h3><p>' + esc(q.desc) + '</p>' + objs + '<div class="rw">' + rewards + '</div></div>' + btn + '</div>';
    };
    const vis = (q) => Q.status(s, q) !== 'locked';
    const all = Q.list(), story = all.filter((q) => !q.side && vis(q) && s.missions[q.id] !== 'claimed'), side = all.filter((q) => q.side && !q.season && vis(q) && s.missions[q.id] !== 'claimed');
    const done = all.filter((q) => s.missions[q.id] === 'claimed');
    // a running season gets its own section with the time left and its story blurb
    const seasons = A.Events ? A.Events.active().map((w) => { const sd = D.SEASONS[w.id], qs = all.filter((q) => q.season === w.id && q.year === w.year && vis(q) && s.missions[q.id] !== 'claimed');
      return '<div class="section-t season-t" data-hl="season:' + w.id + '">' + esc(sd.name) + ' <span class="muted">· ' + (w.daysLeft <= 1 ? 'last day' : w.daysLeft + ' days left') + '</span></div><p class="muted season-blurb">' + esc(sd.blurb) + '</p>' + (qs.map(row).join('') || '<p class="muted">Every festival task is done. Happy Duskfall!</p>'); }).join('') : '';
    const body = seasons + '<div class="section-t">The Entity’s tasks</div>' + (story.map(row).join('') || '<p class="muted">Nothing new from the Entity right now.</p>') + (side.length ? '<div class="section-t">Sanctuary tasks</div>' + side.map(row).join('') : '') + (done.length ? '<details class="donel"><summary class="section-t">Completed (' + done.length + ')</summary>' + done.map(row).join('') + '</details>' : '');
    const html = UI.sheet('Tasks', body, '<span class="muted sp" style="font-size:.78rem">Tap Go and you will be taken to exactly where the task happens.</span><button class="btn gold" data-act="close">Close</button>', '');
    let ov = ovEx;
    if (ov && ov.parentNode) { const sc = $('.sh-body', ov).scrollTop; ov.innerHTML = html; $('.sh-body', ov).scrollTop = sc; } else ov = UI.modal(html);
    UI.applyHl();
    if (focusId) { const r = $('[data-q="' + focusId + '"]', ov); if (r) { r.scrollIntoView({ block: 'nearest' }); r.classList.add('flash'); } }
    return ov;
  };
  UI.act('missions', () => UI.missions());
  UI.act('claim', (el) => {
    if (el.dataset.busy) return; el.dataset.busy = '1';
    const ov = panelOf(el), r = Q.claim(st(), el.dataset.id);
    if (!r.ok) return; Au.play('ok'); UI.sparkles(el, 14);
    const rc = el.getBoundingClientRect(); floatAt(rc.left, rc.top, '+' + ['gold', 'food', 'gems'].filter((k) => r.reward[k]).map((k) => fmt(r.reward[k] + ((r.bonus && r.bonus[k]) || 0)) + ' ' + k).join(' '), '#ffd86b');
    UI.clearGuide(); UI.afterAction(); if (ov && ov.parentNode) UI.missions(ov);
  });
  UI.act('questGo', (el) => {
    const q = Q.get(el.dataset.id); if (!q) return;
    if (Q.status(st(), q) === 'ready') { UI.closeAll(); UI.missions(null, q.id); UI.guide = { hl: ['claim:' + q.id], msg: 'Done! Claim your reward.', quest: q.id, t: Date.now() }; UI.applyHl(); return; }
    UI.go(Nav.forQuest(st(), q), q);
  });

  /* =========================================================== navigation executor ===========
     Executes a plan from Nav.resolve(). One generic path for every quest and objective type. */
  UI.guide = null;
  UI.go = function (plan, quest) {
    if (!plan) return;
    UI.closeAll();
    if (plan.type === 'locked') {
      const next = Nav.actionable(plan);
      const ok = next && next.type !== 'locked';
      const ov = UI.modal(UI.sheet('Not yet', '<p style="margin:.2rem 0 .5rem">' + esc(plan.message) + '</p>' + (ok ? '<p class="muted">First: ' + esc(next.message) + '</p>' : ''), '<button class="btn ghost" data-act="close">OK</button>' + (ok ? '<button class="btn gold" id="go-pre">' + I('arrow') + 'Show me</button>' : ''), 'narrow'));
      if (ok) $('#go-pre', ov).onclick = () => UI.go(next, quest);
      return;
    }
    const s = st();
    if (plan.travel && plan.travel !== s.currentIsland) {
      if (!W.islandUnlocked(s, plan.travel)) { UI.go(Nav.resolve(s, { type: 'unlock_island', island: plan.travel }), quest); return; }
      UI.travelTo(plan.travel);
    }
    UI.guide = { hl: plan.highlight.slice(), msg: plan.message, quest: quest && quest.id, key: quest ? questKey(quest) : null, t: Date.now(), plan };
    if (plan.type !== 'build_edit' && plan.type !== 'build_catalog' && plan.type !== 'build_storage' && UI.bm) UI.bm = null;
    switch (plan.type) {
      case 'building': {
        const b = s.buildings[plan.buildingId];
        if (b) { UI.focusBuilding(plan.buildingId); setTimeout(() => { if (UI.screen === 'island' && !UI.modalOpen()) UI.buildingPanel(plan.buildingId); }, UI.calm() ? 0 : 450); }
        break;
      }
      case 'build_catalog': if (!UI.bm) UI.enterBuild(); setTimeout(() => UI.catalog(plan.catalog), 60); break;
      case 'build_storage': if (!UI.bm) UI.enterBuild(); setTimeout(() => UI.storage(plan.buildingId), 60); break;
      case 'build_edit': if (!UI.bm) UI.enterBuild(); UI.selectForMove(plan.buildingId); break;
      case 'obstacles': {
        const o = D.obstacleById[plan.obstacleIds[0]], t = D.OBSTACLE_TYPES[o.type]; UI.focusFoot(o.x, o.y, t.w, t.h, 0.75); break;
      }
      case 'hotspot': {
        const lm = IA.landmark(s.currentIsland, s).find((l) => (plan.hit === 'stone' ? l.kind === 'plaza' : l.kind === 'stones'));
        if (lm) UI.focusFoot(lm.x, lm.y, lm.w, lm.h, 0.8); break;
      }
      case 'island_map': UI.islandMap(); break;
      case 'quests': UI.missions(null, plan.quest); break;
      case 'screen':
        if (plan.screen === 'dungeons') UI.dungeons(null, plan.dungeon);
        else if (plan.screen === 'explore') { UI.exArea = plan.area || UI.exArea; UI.explore(); }
        else if (plan.screen === 'hatchery') UI.hatchery();
        else if (plan.screen === 'collection') UI.collection();
        break;
    }
    UI.refresh(); UI.applyHl();
  };
  const questKey = (q) => JSON.stringify(Q.progress(st(), q).objs.map((o) => o.cur));
  UI.clearGuide = function () { UI.guide = null; UI.renderGuide(); UI.applyHl(); };
  UI.act('guideClose', () => UI.clearGuide());
  UI.renderGuide = function () {
    const r = $('#guide-root'); if (!r) return;
    const g = UI.guide;
    // the guide ends when its quest progresses/completes or after a few minutes
    if (g && g.quest) { const q = Q.get(g.quest); if (!q || Q.status(st(), q) === 'claimed' || (g.key && questKey(q) !== g.key && Q.status(st(), q) !== 'ready')) { UI.guide = null; } }
    if (UI.guide && Date.now() - UI.guide.t > 240000) UI.guide = null;
    if (!UI.guide || !UI.guide.msg) { r.innerHTML = ''; return; }
    r.innerHTML = '<div class="guide pill" role="status">' + I('spark') + '<span>' + esc(UI.guide.msg) + '</span><button class="x sm" data-act="guideClose" aria-label="Dismiss">' + I('close') + '</button></div>';
  };
  // Highlights: any element with data-hl matching a token of the active guide gets .hl (pulse + arrow).
  UI.applyHl = function () {
    // in Build Mode only build-related guidance stays visible, so the editing view is not cluttered
    const g = UI.guide, buildPlan = g && g.plan && /^build_/.test(g.plan.type);
    const toks = (g && (!UI.bm || buildPlan || !g.plan) && g.hl) || [];
    $$('.hl').forEach((el) => { if (toks.indexOf(el.getAttribute('data-hl')) < 0) el.classList.remove('hl'); });
    if (!toks.length) { const h = $('#hlx'); if (h) h.innerHTML = ''; return; }
    toks.forEach((t) => $$('[data-hl="' + t.replace(/"/g, '') + '"]').forEach((el) => el.classList.add('hl')));
    // bouncing arrows over highlighted world objects
    const h = $('#hlx'); if (!h || UI.screen !== 'island') return;
    const s = st(); let out = '';
    toks.slice(0, 6).forEach((t) => {
      let pos = null;
      if (t.indexOf('bld:') === 0) { const b = s.buildings[t.slice(4)]; if (b && b.island === s.currentIsland && b.x != null) { const sz = W.size(b.type, b.rot), c = Iso.center(b.x, b.y, sz.w, sz.h); pos = [c[0], c[1] - IA.heightOf(b) - 30]; } }
      else if (t.indexOf('obs:') === 0) { const o = D.obstacleById[t.slice(4)]; if (o && o.island === s.currentIsland) { const ty = D.OBSTACLE_TYPES[o.type], c = Iso.center(o.x, o.y, ty.w, ty.h); pos = [c[0], c[1] - IA.obstacleHeight(o.type) - 22]; } }
      else if (t.indexOf('hit:') === 0) { const lm = IA.landmark(s.currentIsland, s).find((l) => (t === 'hit:stone' ? l.kind === 'plaza' : l.kind === 'stones')); if (lm) { const c = Iso.center(lm.x, lm.y, lm.w, lm.h); pos = [c[0], c[1] - (t === 'hit:stone' ? 110 : 80)]; } }
      if (pos) out += '<g class="hl-arrow" transform="translate(' + pos[0].toFixed(1) + ' ' + pos[1].toFixed(1) + ')"><g class="bob"><path d="M-14 -26h28v16h12L0 10 -26 -10h12z" fill="#ffd86b" stroke="#5a2a10" stroke-width="3" stroke-linejoin="round"/></g></g>';
    });
    h.innerHTML = out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
