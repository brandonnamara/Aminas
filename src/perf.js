/* Aminas — mobile performance and lifecycle (Dev 7).
   What this controls:
   - A frame budget for the 3D views: 30 fps while nothing is happening, 60 fps for a short window after an action
     (an attack, a hit, a drag), 30 fps always in Battery saver. Read by src/3d/runtime.js.
   - Island "rest": after a while with no input, and whenever a panel covers the island, the ambient decoration
     (clouds, butterflies, glints) pauses, so a static screen stops repainting. Any touch resumes it.
   - App lifecycle: when the page is hidden (home button, app switcher, another tab) audio is suspended, island
     animations pause and the game's periodic timers skip their work; on return everything resumes once (no
     duplicate loops) and the clock-based systems (production, eggs, timers) simply catch up.
   - Battery saver (Settings): also switches itself on for the session if the 3D view keeps missing its frame
     budget at the lowest resolution. JavaScript cannot read a phone's temperature; this uses frame timing only. */
(function (root) {
  'use strict';
  const A = root.A;
  const P = (A.Perf = {});
  const doc = root.document;
  P.IDLE_FPS = 30; P.ACTION_FPS = 60; P.SAVER_FPS = 30; P.BOOST_MS = 1400; P.REST_MS = 45000;
  P.autoSaver = false;         // set for this session when the device struggles
  let boostUntil = 0, lastInput = Date.now(), restOn = false;
  const settings = () => (A.State && A.State.state && A.State.state.settings) || {};
  // while the performance test forces a tier, that tier decides (so High and Balanced are measured uncapped even if
  // Battery saver is on for the session); in play P.forceTier is always null
  P.saver = () => (P.forceTier ? P.forceTier === 'saver' : !!settings().batterySaver || P.autoSaver);

  /* ---- graphics quality tiers (Environment Phase 3) ----
     One table read by the voxel island (src/3d/island3d.js) and the 3D creature runtime (src/3d/runtime.js).
     settings.quality: 'auto' (default), 'high' or 'balanced'. Battery saver (manual or automatic) always wins.
     Auto starts at High everywhere (the iPhone test: an A14/A15-class phone holds 60 fps at High with ~2 ms of island
     CPU) and steps down to Balanced for the session if the island's camera-move frames run slow (median over 20 ms
     across ~1.5 s of continuous drawing); Battery saver still switches on by itself after that if frames stay
     bad. Budgets per iPhone generation are in docs/perf/PERFORMANCE_STANDARDS.md. P.forceTier is for the performance
     test only (never saved). */
  const COARSE = !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches);
  P.TIERS = {
    high:     { id: 'high', label: 'High', prCap: 2, shadowMap: 2048, shadowSoft: 'vsm', shadowRadius: 3, detail: 1, shadows: true, natureLod: false, buildingLod: false },
    balanced: { id: 'balanced', label: 'Balanced', prCap: 1.5, shadowMap: 1024, shadowSoft: 'pcf', shadowRadius: 2, detail: 0.85, shadows: true, natureLod: false, buildingLod: false },
    saver:    { id: 'saver', label: 'Battery saver', prCap: 1, shadowMap: 512, shadowSoft: 'pcf', shadowRadius: 1, detail: 0.55, shadows: true, natureLod: true, buildingLod: true },
  };
  P.QUALITY = ['auto', 'high', 'balanced'];
  P.forceTier = null;
  P.autoStep = null;           // 'balanced' once Auto has stepped down this session
  P.autoTier = () => P.autoStep || 'high';
  let samples = [];
  // the island reports the interval between frames it draws while the camera moves (src/3d/island3d.js)
  P.sample = function (dt) {
    if (P.forceTier || P.saver() || P.autoStep || (settings().quality && settings().quality !== 'auto')) { samples.length = 0; return; }
    samples.push(dt); if (samples.length < 90) return;
    const med = samples.slice().sort((a, b) => a - b)[45]; samples = [];
    // slow means slower than the page can go: 20 ms on a 60 fps page (as before), 40 ms when the page only gets 30
    if (med > Math.max(20, P.displayMs() * 1.2)) {
      P.autoStep = 'balanced'; P.events.push({ t: Date.now(), autoStep: 'balanced', medianMs: Math.round(med), displayFps: P.displayInfo().fps });
      if (A.UI && A.UI.applyCam) A.UI.applyCam();
    }
  };
  /* ---- the frame rate the page can actually get (Phase 7 performance fix) ----
     A browser can deliver fewer frames than the screen shows: Low Power Mode, iOS "Limit Frame Rate", or an in-app
     browser throttling the page (the first iPhone battle test measured 30 fps in the Claude app). A frame that is only
     late because frames cannot come any faster is not a sign of a struggling device. The 3D views report the
     interval between frame callbacks after a callback where the game did little work (a skipped frame; or a light
     draw whose GPU work had already finished): those intervals are set by the browser and screen, not by the game.
     The estimate is the median of the last 40, snapped to a frame rate, and only used when they are steady (70% within
     15% of it); otherwise, or with too few samples, the screen is assumed to give 60 fps, as before. A device that is
     really struggling produces heavy or irregular frames, so it keeps the 60 fps assumption and is still caught. */
  const display = { s: [], ms: 1000 / 60, steady: false };
  const SNAP = [1000 / 120, 1000 / 60, 1000 / 40, 1000 / 30, 1000 / 24, 1000 / 20];
  P.noteFrame = function (ms) {
    if (!(ms > 4 && ms < 120)) return;
    const s = display.s; s.push(ms); if (s.length > 40) s.shift(); if (s.length < 20) return;
    const med = s.slice().sort((a, b) => a - b)[s.length >> 1];
    const snap = SNAP.reduce((b, x) => (Math.abs(x - med) < Math.abs(b - med) ? x : b), SNAP[0]);
    const near = s.filter((x) => Math.abs(x - snap) <= snap * 0.15).length / s.length;
    display.steady = near >= 0.7 && Math.abs(snap - med) <= snap * 0.15;
    display.ms = display.steady ? Math.max(1000 / 60, snap) : 1000 / 60;
  };
  // the shortest frame interval the page can get (ms); never below a 60 fps frame, so faster screens change nothing
  P.displayMs = () => display.ms;
  P.displayInfo = () => ({ fps: Math.round(1000 / display.ms * 10) / 10, steady: display.steady, samples: display.s.length });
  P._resetDisplay = () => { display.s = []; display.ms = 1000 / 60; display.steady = false; };
  P._coarse = COARSE;
  P.quality = function () {
    if (P.forceTier && P.TIERS[P.forceTier]) return P.forceTier;
    if (P.saver()) return 'saver';
    const q = settings().quality; return q === 'high' || q === 'balanced' ? q : P.autoTier();
  };
  P.tier = () => P.TIERS[P.quality()];
  P.hidden = () => !!(doc && doc.hidden);
  // called by 3D views and UI when something animated starts (clips, bursts, drags)
  P.boost = (ms) => { boostUntil = Math.max(boostUntil, Date.now() + (ms || P.BOOST_MS)); };
  P.boosting = () => Date.now() < boostUntil;
  P.targetFps = () => (P.saver() || P.forceTier === 'saver' ? P.SAVER_FPS : P.boosting() ? P.ACTION_FPS : P.IDLE_FPS);
  // the 3D runtime reports when it is already at its lowest resolution and still slow; why = the measurement behind it
  // (which view, how many of its frames were slow, resolution, frame budget). The reason is kept for the performance
  // test, in memory and in localStorage ('aminas.saverlog', never in the game save).
  P.saverWhy = null;
  P.saverLog = function () { try { return JSON.parse(root.localStorage.getItem('aminas.saverlog')) || []; } catch (e) { return []; } };
  P.reportSlow = function (why) {
    if (P.autoSaver || settings().batterySaver) return;
    P.autoSaver = true;
    P.saverWhy = Object.assign({ when: new Date().toISOString(), screen: (A.UI && A.UI.screen) || null, quality: settings().quality || 'auto' }, why || {});
    P.events.push({ t: Date.now(), autoSaver: P.saverWhy.view || true });
    try { const log = P.saverLog(); log.push(P.saverWhy); root.localStorage.setItem('aminas.saverlog', JSON.stringify(log.slice(-5))); } catch (e) { /* private mode: fine */ }
    P.apply();
    if (A.UI && A.UI.toast) A.UI.toast('This device is working hard, so I switched on Battery saver for now. You can change it in Settings.', 't');
  };

  // body classes drive the CSS: .perf-saver (fewer effects), .perf-rest / .perf-covered / .perf-hidden (pause ambient)
  P.apply = function () {
    if (!doc || !doc.body) return;
    const b = doc.body.classList, UI = A.UI;
    b.toggle('perf-saver', P.saver());
    b.toggle('perf-hidden', P.hidden());
    b.toggle('perf-rest', restOn);
    b.toggle('perf-covered', !!(UI && UI.modalOpen && UI.screen === 'island' && (UI.modalOpen() || UI.busy)));
  };
  function input() {
    lastInput = Date.now();
    if (restOn) { restOn = false; P.apply(); }
  }
  // cheap check, driven by the island's existing 1 s tick (no extra timer)
  P.tick = function () {
    const rest = A.UI && A.UI.screen === 'island' && Date.now() - lastInput > P.REST_MS;
    if (rest !== restOn) restOn = rest;
    P.apply();
  };
  P.resting = () => restOn;
  P.lastInput = () => lastInput;
  P._setLastInput = (t) => { lastInput = t; };   // tests

  /* ---------- lifecycle ---------- */
  let wasHidden = false;
  function onVisibility() {
    const h = P.hidden();
    if (h === wasHidden) return;   // ignore repeats: never double-pause or double-resume
    wasHidden = h;
    if (A.Audio) { if (h) A.Audio.suspend && A.Audio.suspend(); else A.Audio.resume && A.Audio.resume(); }
    if (!h) { input(); P._resetDisplay(); if (A.UI && A.UI.screen === 'island' && A.UI.tick) A.UI.tick(); } // Low Power Mode may have changed while away
    P.apply();
    P.events.push({ t: Date.now(), hidden: h });
    if (P.events.length > 20) P.events.shift();
  }
  P.events = [];
  if (doc) {
    doc.addEventListener('visibilitychange', onVisibility);
    root.addEventListener('pagehide', () => { if (!wasHidden) { wasHidden = true; if (A.Audio && A.Audio.suspend) A.Audio.suspend(); P.apply(); } });
    root.addEventListener('pageshow', () => { if (wasHidden && !P.hidden()) { wasHidden = false; if (A.Audio && A.Audio.resume) A.Audio.resume(); input(); P.apply(); } });
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((e) => root.addEventListener(e, input, { passive: true, capture: true }));
  }
})(typeof window !== 'undefined' ? window : globalThis);
