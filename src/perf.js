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
  P.saver = () => !!settings().batterySaver || P.autoSaver;
  P.hidden = () => !!(doc && doc.hidden);
  // called by 3D views and UI when something animated starts (clips, bursts, drags)
  P.boost = (ms) => { boostUntil = Math.max(boostUntil, Date.now() + (ms || P.BOOST_MS)); };
  P.boosting = () => Date.now() < boostUntil;
  P.targetFps = () => (P.saver() ? P.SAVER_FPS : P.boosting() ? P.ACTION_FPS : P.IDLE_FPS);
  // the 3D runtime reports when it is already at its lowest resolution and still slow
  P.reportSlow = function () {
    if (P.autoSaver || settings().batterySaver) return;
    P.autoSaver = true; P.apply();
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
    if (!h) { input(); if (A.UI && A.UI.screen === 'island' && A.UI.tick) A.UI.tick(); }
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
