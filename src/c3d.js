/* Aminas — bridge between the classic game scripts and the on-demand 3D runtime (src/3d/runtime.js).
   The 3D module (three.js + creature builder) is only downloaded the first time a live 3D view is needed.
   If WebGL is missing, the module fails to load, or the player turns 3D creatures off in Settings, the game keeps
   using the baked portraits (or the classic SVG art) and CSS animations — nothing else changes. */
(function (root) {
  'use strict';
  const A = root.A;
  const C3D = (A.C3D = {});
  let mod = null, loading = null, failed = false, webgl = null;
  C3D.supported = function () {
    if (webgl != null) return webgl;
    try { const c = document.createElement('canvas'); webgl = !!(root.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { webgl = false; }
    return webgl;
  };
  const style = () => { const st = A.State && A.State.state; return st && st.settings && st.settings.creatures3d === false ? '2d' : '3d'; };
  C3D.style = style;
  // Live 3D views (battle stage, creature viewer) are used only when all of these hold.
  C3D.enabled = () => style() === '3d' && !failed && C3D.supported();
  C3D.failed = () => failed;
  C3D.load = function () {
    if (mod) return Promise.resolve(mod);
    if (!C3D.enabled()) return Promise.resolve(null);
    if (!loading) {
      const url = new URL('src/3d/runtime.js', document.baseURI).href;
      loading = import(url).then((m) => (mod = m)).catch((e) => { failed = true; if (root.console) console.warn('3D runtime unavailable, using 2D art:', e && e.message); return null; });
    }
    return loading;
  };
  C3D.portraitUrl = (id) => (window.A.Proto15 && window.A.Proto15.active(id) ? 'assets/portraits15/' : 'assets/portraits/') + id + '.webp';   // Phase 15B: refined portraits behind the switch
  C3D.stats = () => (mod ? mod.stats() : null);
})(typeof window !== 'undefined' ? window : globalThis);
