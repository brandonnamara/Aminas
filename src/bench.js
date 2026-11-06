/* Aminas — on-device performance test (Environment Phase 3).
   Settings → "Run performance test". Drives the island camera through a fixed script and measures what the device
   actually does: frame rate and frame-time percentiles (from requestAnimationFrame), the island's own CPU draw time,
   triangles, draw calls, resolution, and load timings. Results appear in a sheet with a Copy button, so they can be
   pasted back to the developer. Nothing is saved in the game save; the last result is kept in localStorage only.

   What a web page cannot measure, and this test does not pretend to:
   - GPU time per frame (no timer queries in Safari): a slow GPU shows up as longer frame intervals instead;
   - battery drain and temperature (Safari has no Battery API and no thermal API): the 3-minute sustained run shows
     thermal throttling indirectly, as frame rate falling over time;
   - memory on Safari (performance.memory is Chrome-only): reported as "not available".
   Low Power Mode on an iPhone caps every page at 30 fps; the test reports the display rate it observed. */
(function (root) {
  'use strict';
  const A = root.A, B = (A.Bench = {});
  const doc = root.document;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
  B.running = false;
  let cancel = false;

  // the fixed script: [name, tier override or null, zoom ('default' | 'min' | 'max'), seconds, camera moves?]
  B.SCRIPT = [
    ['idle', null, 'default', 4, false],
    ['pan', null, 'default', 6, true],
    ['pan, widest zoom', null, 'min', 5, true],
    ['pan, closest zoom', null, 'max', 5, true],
    ['pan, High', 'high', 'default', 5, true],
    ['pan, Balanced', 'balanced', 'default', 5, true],
    ['pan, Battery saver', 'saver', 'default', 5, true],
  ];
  B.SUSTAINED_S = 180;

  function pct(a, p) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; }
  const r1 = (x) => Math.round(x * 10) / 10;

  function device() {
    const out = { ua: navigator.userAgent, dpr: root.devicePixelRatio || 1, screen: [screen.width, screen.height], viewport: [root.innerWidth, root.innerHeight], cores: navigator.hardwareConcurrency || null, memoryGB: navigator.deviceMemory || 'not available' };
    try {
      const c = doc.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
      if (gl) { const x = gl.getExtension('WEBGL_debug_renderer_info'); out.gpu = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); out.webgl = gl.getParameter(gl.VERSION); out.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE); const l = gl.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); }
    } catch (e) { out.gpu = 'unknown'; }
    out.standalone = !!(root.navigator.standalone || (root.matchMedia && matchMedia('(display-mode: standalone)').matches));
    return out;
  }
  function loading() {
    const n = performance.getEntriesByType && performance.getEntriesByType('navigation')[0], V = A.VoxIsland || {};
    return { pageInteractiveMs: n ? Math.round(n.domInteractive) : null, pageLoadedMs: n ? Math.round(n.loadEventEnd) : null, island3dModuleMs: V.moduleMs || null, island3dFirstShownMs: V.firstMs || null, island3dShownSincePageStartMs: V.firstAt || null };
  }
  function heap() { const m = performance.memory; return m ? r1(m.usedJSHeapSize / 1048576) : 'not available'; }

  function cam() { return A.UI.cam[A.UI.wv.iid]; }
  function stats() { return (A.VoxIsland && A.VoxIsland.stats()) || {}; }

  // one measured phase: every animation frame records its interval; with move, the camera pans along a figure-of-eight
  async function phase(name, tierId, zoom, seconds, move, base) {
    const P = A.Perf; P.forceTier = tierId; const c = cam();
    c.x = base.x; c.y = base.y; c.z = zoom === 'min' ? 0.01 : zoom === 'max' ? 9 : base.z;
    A.UI.applyCam(); if (A.VoxIsland) A.VoxIsland.redraw();
    await sleep(700); // settle: tier switch, LOD swap, shadow map rebuild happen here, outside the measurement
    const z = cam().z, s0 = stats(), dts = []; let prev = 0, n = 0; const t0 = performance.now();
    while (!cancel && performance.now() - t0 < seconds * 1000) {
      const now = await nextFrame(); if (P._setLastInput) P._setLastInput(Date.now()); // keep the island awake
      if (prev) dts.push(now - prev); prev = now; n++;
      if (move) { const k = (now - t0) / 1000; c.x = base.x + Math.sin(k * 1.3) * 160; c.y = base.y + Math.sin(k * 2.1) * 70; c.z = z; A.UI.applyCam(); }
    }
    const s1 = stats(), secs = (performance.now() - t0) / 1000, draws = (s1.frames || 0) - (s0.frames || 0);
    const drawMs = draws > 0 ? ((s1.avgDrawMs || 0) * (s1.frames || 0) - (s0.avgDrawMs || 0) * (s0.frames || 0)) / draws : 0;
    return {
      phase: name, tier: s1.tier, zoom: r1(z), seconds: r1(secs), fps: r1(dts.length / Math.max(0.001, dts.reduce((a, b) => a + b, 0) / 1000)),
      p50: r1(pct(dts, 0.5)), p95: r1(pct(dts, 0.95)), p99: r1(pct(dts, 0.99)), worst: r1(dts.length ? Math.max.apply(null, dts) : 0),
      over33: dts.length ? Math.round(dts.filter((d) => d > 34).length / dts.length * 100) : 0,
      islandDraws: draws, islandCpuMs: r1(drawMs), triangles: s1.triangles, calls: s1.calls, lod: s1.lod, pixelRatio: s1.pixelRatio, canvas: s1.canvas, shadowMap: s1.shadow ? s1.shadowMap : 0,
    };
  }

  B.run = async function (opts) {
    if (B.running) return null; opts = opts || {}; B.running = true; cancel = false;
    const UI = A.UI, P = A.Perf, out = { test: 'Aminas island performance test', version: (A.Data && A.Data.VERSION) || '', when: new Date().toISOString(), device: device(), loading: loading(), phases: [] };
    const banner = doc.createElement('div'); banner.className = 'bench-banner';
    banner.innerHTML = '<b>Performance test</b> <span class="bench-step">starting…</span> <button class="btn small" type="button">Cancel</button>';
    banner.querySelector('button').onclick = () => { cancel = true; };
    try {
      if (UI.closeAll) UI.closeAll();
      if (UI.screen !== 'island' && UI.showIsland) UI.showIsland();
      for (let i = 0; i < 60 && !(A.VoxIsland && A.VoxIsland.ready()); i++) await sleep(250);
      if (!(A.VoxIsland && A.VoxIsland.ready())) throw new Error('The 3D island is not showing (Settings → 3D voxel island must be on, on the Starter Island).');
      doc.body.appendChild(banner); doc.body.classList.add('bench-on');
      const c = cam(), base = { x: c.x, y: c.y, z: c.z }, step = banner.querySelector('.bench-step');
      out.settings = { quality: (A.State.state.settings || {}).quality, batterySaver: !!(A.State.state.settings || {}).batterySaver, autoSaver: !!P.autoSaver, autoTier: P.autoTier ? P.autoTier() : '' };
      out.heapStartMB = heap();
      const script = B.SCRIPT.slice(); if (opts.sustained) script.push(['sustained', null, 'default', B.SUSTAINED_S, true]);
      for (let i = 0; i < script.length && !cancel; i++) {
        const [name, tierId, zoom, secs, move] = script[i];
        step.textContent = (i + 1) + '/' + script.length + ': ' + name + ' (' + secs + ' s)';
        if (name === 'sustained') {
          // thermal: the same pan for 3 minutes, reported in 15 s slices; a falling frame rate means throttling
          const slices = []; for (let k = 0; k < B.SUSTAINED_S / 15 && !cancel; k++) { step.textContent = (i + 1) + '/' + script.length + ': sustained ' + (k * 15) + '/' + B.SUSTAINED_S + ' s'; const r = await phase('sustained ' + (k * 15) + 's', null, 'default', 15, true, base); slices.push({ t: k * 15, fps: r.fps, p95: r.p95, cpu: r.islandCpuMs }); }
          const f = slices.map((s) => s.fps); out.sustained = { slices, firstMinFps: r1(f.slice(0, 4).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(4, f.length))), lastMinFps: r1(f.slice(-4).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(4, f.length))) };
          out.sustained.dropPct = out.sustained.firstMinFps ? Math.round((1 - out.sustained.lastMinFps / out.sustained.firstMinFps) * 100) : 0;
        } else out.phases.push(await phase(name, tierId, zoom, secs, move, base));
      }
      P.forceTier = null; c.x = base.x; c.y = base.y; c.z = base.z; UI.applyCam(); if (A.VoxIsland) A.VoxIsland.redraw();
      out.heapEndMB = heap(); out.cancelled = cancel;
      out.summary = summary(out);
      try { root.localStorage.setItem('aminas.bench', JSON.stringify(out)); } catch (e) { /* private mode: fine */ }
      return out;
    } catch (e) {
      out.error = e.message; return out;
    } finally {
      P.forceTier = null; banner.remove(); doc.body.classList.remove('bench-on'); B.running = false;
    }
  };

  function summary(o) {
    const ph = (n) => o.phases.find((p) => p.phase === n) || {};
    const s = ['Aminas perf ' + (o.version || ''), (o.device.gpu || '?') + ', DPR ' + o.device.dpr + ', ' + o.device.viewport.join('x'),
      'idle display ' + ph('idle').fps + ' fps', 'pan ' + ph('pan').fps + ' fps (p95 ' + ph('pan').p95 + ' ms, island CPU ' + ph('pan').islandCpuMs + ' ms)',
      'widest ' + ph('pan, widest zoom').fps + ', closest ' + ph('pan, closest zoom').fps, 'High ' + ph('pan, High').fps + ' / Balanced ' + ph('pan, Balanced').fps + ' / Saver ' + ph('pan, Battery saver').fps + ' fps'];
    if (o.sustained) s.push('sustained ' + o.sustained.firstMinFps + ' → ' + o.sustained.lastMinFps + ' fps (' + o.sustained.dropPct + '% drop)');
    s.push('load: page ' + o.loading.pageLoadedMs + ' ms, island first shown ' + o.loading.island3dFirstShownMs + ' ms');
    return s.join(' · ');
  }

  /* ---- the sheet ---- */
  function esc(t) { return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  B.show = function (o) {
    const UI = A.UI; if (!o) return;
    const rows = (o.phases || []).map((p) => '<tr><td>' + esc(p.phase) + '</td><td>' + p.fps + '</td><td>' + p.p95 + '</td><td>' + p.islandCpuMs + '</td><td>' + Math.round((p.triangles || 0) / 1000) + 'k</td><td>' + p.pixelRatio + '</td></tr>').join('');
    const sus = o.sustained ? '<p class="muted" style="font-size:.78rem">Sustained 3 min: ' + o.sustained.firstMinFps + ' fps in the first minute, ' + o.sustained.lastMinFps + ' in the last (' + o.sustained.dropPct + '% drop). A big drop means the phone got hot and slowed down.</p>' : '';
    const body = (o.error ? '<p class="muted">' + esc(o.error) + '</p>' : '') +
      '<p class="muted" style="font-size:.78rem">' + esc(o.device.gpu || '') + ' · DPR ' + o.device.dpr + ' · ' + o.device.viewport.join('×') + (o.cancelled ? ' · <b>cancelled early</b>' : '') + '</p>' +
      '<table class="bench-table"><tr><th>Phase</th><th>fps</th><th>p95 ms</th><th>CPU ms</th><th>tris</th><th>DPR</th></tr>' + rows + '</table>' + sus +
      '<p class="muted" style="font-size:.74rem">fps: frames the page showed. p95: 95 % of frames were at least this fast. CPU: the island\'s own work per drawn frame. GPU time, battery and temperature cannot be read by a web page.</p>' +
      '<textarea class="bench-out" readonly rows="4">' + esc(JSON.stringify(o)) + '</textarea>' +
      '<div class="row-actions"><button class="btn small gold" data-act="benchCopy">Copy results</button><button class="btn small" data-act="benchRun" data-long="1">Run with 3-minute heat test</button><button class="btn small" data-act="benchRun">Run again</button></div>';
    UI.modal(UI.sheet('Performance test results', body, '<button class="btn gold" data-act="close">Close</button>', 'narrow'));
  };

  if (A.UI && A.UI.act) {
    const UI = A.UI;
    UI.act('benchAsk', () => {
      const last = (() => { try { return JSON.parse(root.localStorage.getItem('aminas.bench')); } catch (e) { return null; } })();
      UI.modal(UI.sheet('Performance test', '<p>This measures how smoothly the 3D island runs on this device. It takes about 40 seconds and moves the camera by itself; please don\'t touch the screen until it finishes.</p><p class="muted" style="font-size:.8rem">For a fair result: unplug the charger, turn off Low Power Mode, close other apps, and keep the phone in landscape. The 3-minute heat test also shows whether the phone slows down as it warms up.</p>' +
        '<div class="row-actions"><button class="btn small gold" data-act="benchRun">Start (40 s)</button><button class="btn small" data-act="benchRun" data-long="1">Start with heat test (4 min)</button>' + (last ? '<button class="btn small" data-act="benchLast">Show last result</button>' : '') + '</div>', '<button class="btn ghost" data-act="close">Not now</button>', 'narrow'));
    });
    UI.act('benchRun', async (el) => { const long = !!(el && el.dataset && el.dataset.long); if (UI.closeAll) UI.closeAll(); const r = await B.run({ sustained: long }); B.show(r); });
    UI.act('benchLast', () => { try { B.show(JSON.parse(root.localStorage.getItem('aminas.bench'))); } catch (e) { /* none */ } });
    UI.act('benchCopy', (el) => {
      const ta = doc.querySelector('.bench-out'); if (!ta) return; const txt = ta.value;
      const ok = () => UI.toast && UI.toast('Results copied. Paste them into the chat.', 'n');
      const fallback = () => { ta.focus(); ta.select(); try { doc.execCommand('copy'); ok(); } catch (e) { /* select is enough to copy by hand */ } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fallback); else fallback();
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
