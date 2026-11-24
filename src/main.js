/* Aminas — bootstrap: PWA install hooks, storage persistence, start the game. */
(function (root) {
  'use strict';
  const A = root.A;
  root.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); A.UI.deferredPrompt = e; if (A.UI.screen === 'title') A.UI.showTitle(); });
  root.addEventListener('appinstalled', () => { A.UI.deferredPrompt = null; });
  // Block pinch-zoom / double-tap zoom gestures on iOS.
  ['gesturestart', 'gesturechange'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault()));
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  /* Phase 19D: the service-worker registration was removed. It asked for `sw.js`, which this repository has never had
     (the 404 in every browser console). The only known `sw.js` belongs to the early flat build: it precaches files at the
     site root (./art.js, ./data.js …) that no longer exist since the move to src/, so even where it is deployed its
     install would fail and nothing would work offline. Offline play needs a new worker whose precache list is generated
     from the current files; that is a recommendation for Phase 20A (docs/PHASE19D.md), not something to fake here. */
  // Ask the browser to keep this site's storage (reduces the chance Safari/Chrome evicts the save under pressure).
  function persistStorage() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {} }
  const start = () => { A.UI.boot(); persistStorage(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
