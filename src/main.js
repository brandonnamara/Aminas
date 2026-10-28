/* Aminas — bootstrap: PWA install hooks, service worker, start the game. */
(function (root) {
  'use strict';
  const A = root.A;
  root.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); A.UI.deferredPrompt = e; if (A.UI.screen === 'title') A.UI.showTitle(); });
  root.addEventListener('appinstalled', () => { A.UI.deferredPrompt = null; });
  // Block pinch-zoom / double-tap zoom gestures on iOS.
  ['gesturestart', 'gesturechange'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault()));
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  function registerSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            const b = document.createElement('div'); b.className = 'banner'; b.style.zIndex = 90;
            b.innerHTML = 'A new version is ready <button class="btn small gold" id="upd">Reload</button>';
            document.body.appendChild(b); document.getElementById('upd').onclick = () => location.reload();
          }
        });
      });
    }).catch(() => {});
  }
  // Ask the browser to keep this site's storage (reduces the chance Safari/Chrome evicts the save under pressure).
  function persistStorage() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {} }
  const start = () => { A.UI.boot(); registerSW(); persistStorage(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
