/* Aminas — island life (v0.4): the sanctuary's Aminas wander, hop, look around, nap at night and react to taps.
   Positions stay deterministic (who stands where comes from the save); only the small idle motions are random.
   One interval drives everything while the island screen is open (registered in UI.timers, so leaving the screen
   stops it); motion itself is CSS transitions on a few small SVG groups. Reduced motion: creatures stand still. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data;
  const Life = (A.Life = {});
  const MAX_ROAMERS = 5;
  let tickN = 0, pos = {}, islandKey = '', walk = null, walkKey = '', roamKey = '', roamVal = [];

  // Cells a creature may stand on: land that is not covered by a building or an obstacle (paths and sand are fine).
  Life.walkable = function (st, iid) {
    const W = A.World, key = iid + '|' + Object.values(st.buildings).filter((b) => b.island === iid).map((b) => b.id + b.x + ',' + b.y + b.state).join(';') + '|' + (D.OBSTACLES[iid] || []).map((o) => W.obstacleState(st, o.id)[0]).join('');
    if (walk && walkKey === key) return walk;
    const isl = D.ISLANDS[iid], occ = W.occupancy(st, iid), set = new Set();
    for (let y = 1; y < isl.grid.h - 1; y++) for (let x = 1; x < isl.grid.w - 1; x++) if (isl.land[y][x] && !occ.has(x + ',' + y)) set.add(x + ',' + y);
    walk = set; walkKey = key; return set;
  };
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  // Aminas without a home (and not the companion) gather around the middle of the island: up to five, spread out.
  Life.roamers = function (st, iid) {
    const W = A.World, act = st.active, isl = D.ISLANDS[iid];
    const free = st.aminas.filter((a) => a.uid !== act && !W.homeOf(st, a.uid)).sort((a, b) => b.lv - a.lv || a.uid - b.uid).slice(0, MAX_ROAMERS);
    if (!free.length) return [];
    const ok = Life.walkable(st, iid), cx = isl.grid.w / 2, cy = isl.grid.h / 2 + 1;
    const key = walkKey + '|' + free.map((a) => a.uid + a.sp).join(','); if (key === roamKey) return roamVal; // placements only change with the map or the roamers
    const cells = [...ok].map((k) => k.split(',').map(Number)).filter(([x, y]) => Math.hypot(x - cx, y - cy) < Math.min(isl.grid.w, isl.grid.h) * 0.32)
      .sort((p, q) => (hash(p + iid) % 997) - (hash(q + iid) % 997));
    const out = [];
    free.forEach((a) => {
      const pick = cells.find((c) => out.every((o) => Math.hypot(o.x - c[0], o.y - c[1]) >= 3)) || cells[0];
      if (pick) out.push({ uid: a.uid, sp: a.sp, x: pick[0], y: pick[1] });
    });
    roamKey = key; roamVal = out; return out;
  };
  // Markup for one creature. anchor = world px of its feet; r = how far (in cells) it may wander.
  Life.markup = function (a, cx, cy, sc, o) {
    o = o || {};
    const f1 = (n) => (Math.round(n * 10) / 10).toString();
    return '<g class="creature' + (o.cls ? ' ' + o.cls : '') + '" data-cr="' + a.uid + '" data-sp="' + a.sp + '" data-r="' + (o.r || 1) + '"' + (o.attrs || '') + ' transform="translate(' + f1(cx) + ' ' + f1(cy) + ') scale(' + sc + ')" data-ax="' + f1(cx) + '" data-ay="' + f1(cy) + '" data-sc="' + sc + '">' +
      '<g class="cr-mv"><g class="cr-an"><g class="cr-bob">' + A.IsoArt.critter(a.sp) + '</g><circle cx="0" cy="-40" r="40" fill="transparent"/></g>' +
      '<g class="zz" aria-hidden="true"><text x="22" y="-92">z</text><text x="34" y="-110">z</text></g><g class="cr-heart" aria-hidden="true"><path d="M0 -112c-6-9-20-6-18 5 1 7 12 13 18 18 6-5 17-11 18-18 2-11-12-14-18-5z"/></g></g></g>';
  };

  /* ---------------- behaviour ---------------- */
  const UI = () => A.UI;
  const night = () => { const h = new Date().getHours(); return h >= 21 || h < 6; };
  function els() { return [...document.querySelectorAll('#objs .creature[data-cr]')]; }
  function setMv(el, p, dur) {
    const mv = el.querySelector('.cr-mv'), an = el.querySelector('.cr-an'); if (!mv || !an) return;
    const sc = +el.dataset.sc || 1;
    // Dev 7: walking moves in small hops (4 a second) instead of a 60 fps glide: each move repaints the island SVG
    mv.style.transition = dur ? 'transform ' + dur + 's steps(' + Math.max(2, Math.round(dur * 4)) + ', end)' : 'none';
    mv.style.transform = 'translate(' + (p.dx / sc).toFixed(1) + 'px,' + (p.dy / sc).toFixed(1) + 'px)';
    an.classList.toggle('flip', !!p.flip);
    an.classList.toggle('sleep', p.mode === 'sleep');
  }
  // Re-apply wander offsets after the objects layer is redrawn (it is rebuilt on many state changes).
  Life.apply = function () {
    const st = A.State.state; if (!st) return;
    const key = st.currentIsland; if (key !== islandKey) { pos = {}; islandKey = key; }
    els().forEach((el) => { const p = pos[el.dataset.cr]; if (p) setMv(el, p, 0); });
  };
  function wander(el, p) {
    const st = A.State.state, iid = st.currentIsland, ok = Life.walkable(st, iid), Iso = A.Iso;
    const ax = +el.dataset.ax, ay = +el.dataset.ay, r = +el.dataset.r || 1;
    const home = Iso.cell(ax, ay), cur = Iso.cell(ax + p.dx, ay + p.dy), opts = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = home[0] + dx, y = home[1] + dy; if ((x === cur[0] && y === cur[1]) || !ok.has(x + ',' + y)) continue; opts.push([x, y]);
    }
    if (!opts.length) return false;
    const t = opts[Math.floor(Math.random() * opts.length)], c = Iso.center(t[0], t[1], 1, 1);
    const nx = c[0] - ax + (Math.random() - 0.5) * 10, ny = c[1] - ay + (Math.random() - 0.5) * 6;
    const dist = Math.hypot(nx - p.dx, ny - p.dy); if (dist < 4) return false;
    p.flip = nx > p.dx; p.dx = nx; p.dy = ny; p.mode = 'walk';
    const dur = Math.max(0.6, dist / 34);
    // start on the shared 250 ms beat, so every walker hops on the same frames (fewer repaints of the island)
    const wait = 250 - (Date.now() % 250); p.mode = 'walk';
    clearTimeout(p.tw); p.tw = setTimeout(() => {
      if (!el.isConnected) { p.mode = ''; return; }
      setMv(el, p, dur);
      const an = el.querySelector('.cr-an'); an.classList.add('walk'); p.tw = setTimeout(() => { an.classList.remove('walk'); p.mode = ''; }, dur * 1000);
    }, wait);
    return true;
  }
  function once(el, cls, ms) { const an = el.querySelector('.cr-an'); if (!an) return; an.classList.remove(cls); void an.getBoundingClientRect(); an.classList.add(cls); setTimeout(() => an.classList.remove(cls), ms); }
  function step() {
    const U = UI(); if (!U || U.screen !== 'island' || document.hidden || U.dragging || U.bm || U.calm()) return;
    const P = A.Perf; if (P && (P.resting() || U.modalOpen() || (P.saver() && (tickN = (tickN + 1) % 2)))) return; // still scene or saver: move less
    const list = els(); if (!list.length) return;
    const n = Math.min(list.length, 1 + (Math.random() < 0.4 ? 1 : 0));
    for (let i = 0; i < n; i++) {
      const el = list[Math.floor(Math.random() * list.length)], uid = el.dataset.cr, p = pos[uid] || (pos[uid] = { dx: 0, dy: 0, flip: false, mode: '' });
      if (p.mode === 'walk' || p.busyUntil > Date.now()) continue;
      const roll = Math.random();
      if (p.mode === 'sleep') { if (!night() || roll < 0.15) { p.mode = ''; setMv(el, p, 0); once(el, 'hop', 700); } continue; }
      if (night() && roll < 0.35) { p.mode = 'sleep'; setMv(el, p, 0); continue; }
      if (roll < 0.5) { if (!wander(el, p)) once(el, 'hop', 700); }
      else if (roll < 0.72) once(el, 'hop', 700);
      else if (roll < 0.9) { p.flip = !p.flip; setMv(el, p, 0); }
      else if (!night() && roll < 0.95) { p.mode = 'sleep'; setMv(el, p, 0); p.busyUntil = Date.now() + 6000; }
    }
  }
  Life.start = function () { const U = UI(); pos = {}; islandKey = A.State.state.currentIsland; U.timers.life = setInterval(step, 1300); };
  // Tap reaction: wake up, jump with a little heart, chirp.
  Life.react = function (el) {
    const uid = el && el.dataset.cr; if (!uid) return;
    const p = pos[uid] || (pos[uid] = { dx: 0, dy: 0, flip: false, mode: '' });
    p.mode = ''; p.busyUntil = Date.now() + 2500; setMv(el, p, 0);
    once(el, 'happy', 900);
    if (A.Audio) A.Audio.play('ok');
  };
  Life.reset = () => { pos = {}; walk = null; walkKey = ''; roamKey = ''; };
})(typeof window !== 'undefined' ? window : globalThis);
