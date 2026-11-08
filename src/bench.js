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
    // a pause (notification, app switcher, screen dimming) is one huge interval: count it, keep it out of the rates,
    // so a single interruption does not read as thermal throttling
    const pauses = dts.filter((d) => d > 500), pausedMs = pauses.reduce((a, b) => a + b, 0), run = dts.filter((d) => d <= 500);
    const s1 = stats(), secs = (performance.now() - t0) / 1000, draws = (s1.frames || 0) - (s0.frames || 0);
    const drawMs = draws > 0 ? ((s1.avgDrawMs || 0) * (s1.frames || 0) - (s0.avgDrawMs || 0) * (s0.frames || 0)) / draws : 0;
    return {
      phase: name, tier: s1.tier, zoom: r1(z), seconds: r1(secs), fps: r1(run.length / Math.max(0.001, run.reduce((a, b) => a + b, 0) / 1000)), pauses: pauses.length, pausedS: r1(pausedMs / 1000),
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
          const slices = []; for (let k = 0; k < B.SUSTAINED_S / 15 && !cancel; k++) { step.textContent = (i + 1) + '/' + script.length + ': sustained ' + (k * 15) + '/' + B.SUSTAINED_S + ' s'; const r = await phase('sustained ' + (k * 15) + 's', null, 'default', 15, true, base); slices.push({ t: k * 15, fps: r.fps, p95: r.p95, cpu: r.islandCpuMs, pauses: r.pauses }); }
          const f = slices.map((s) => s.fps); out.sustained = { slices, firstMinFps: r1(f.slice(0, 4).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(4, f.length))), lastMinFps: r1(f.slice(-4).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(4, f.length))) };
          out.sustained.dropPct = out.sustained.firstMinFps ? Math.round((1 - out.sustained.lastMinFps / out.sustained.firstMinFps) * 100) : 0; out.sustained.pauses = slices.reduce((a, x) => a + (x.pauses || 0), 0);
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

  /* ---- battle test (Phase 7 measurement; measurement only) ----
     A scripted 3D Island Boss battle, the same on every device: the Heartwood Stag against a fixed party, with a fixed
     random seed, played by the test pressing moves by itself. Everyone's health is multiplied so nobody can faint: the
     battle never reaches a result, so nothing is won, lost or recorded. The game save is not written while it runs
     (saving is suspended and the save is compared before and after).
     For each quality setting (Auto, High, Balanced, Battery saver) the battle is opened fresh, because an arena builds
     its layers for the quality it opens at. Then it measures:
       - turns with the Phase 7 arena effects on, and the same with them off. "Off" hides, for every drawn frame, the
         Phase 7 layers: arena particles, light shafts, distant silhouettes, the boss light pool, attack effects (cubes,
         glows, shockwaves), turn rings and target brackets, and creature outlines. Phase 7 movement, lighting and fog
         stay, so "off" is the arena without its added layers, not a copy of Phase 6;
       - a layer-by-layer cost breakdown and a resolution check (the same frame drawn at 1x), to find the bottleneck.
     Automatic Battery saver is held off during the test (so every setting is measured as itself); each time its rule
     would have fired, the test records when and the exact measurement behind it. The session's own Battery saver
     state is put back afterwards. Optional: 3 minutes of continuous combat on Auto, in 15 s slices, for stability. */
  B.BATTLE = { dungeon: 'heartwood', party: [['lumifern', 30], ['emberix', 30], ['aimza', 30]], seed: 7 };
  B.P7_LAYERS = ['atmo:', 'fx:', 'hull'];
  B.LAYER_PARTS = [['distant silhouettes', ['atmo:backdrop']], ['light shafts', ['atmo:shafts']], ['arena particles', ['atmo:particles']], ['boss light pool', ['atmo:pool']], ['outlines', ['hull']], ['rings and brackets', ['fx:marks']]];
  B.BATTLE_TIERS = [['Auto', null], ['High', 'high'], ['Balanced', 'balanced'], ['Battery saver', 'saver']];
  B.BATTLE_S = { idle: 5, turns: 10 };
  B.EXTENDED_S = 180;

  const seeded = (n) => () => { n = (n + 0x6d2b79f5) | 0; let t = Math.imul(n ^ (n >>> 15), 1 | n); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const stage = () => (A.UI.B && A.UI.B.stage) || null;

  async function openBattle(M) {
    const R = A.Rules, Bt = R.Battle, D = A.Data, d = D.DUNGEONS[B.BATTLE.dungeon];
    const spec = d.battles.find((s) => s.islandBoss) || d.battles[d.battles.length - 1];
    const party = B.BATTLE.party.map(([sp, lv]) => Bt.fighter(sp, lv)), foe = R.enemyFromSpec(spec);
    party.concat([foe]).forEach((f) => { f.hpMax *= 1000; f.hp = f.hpMax; });
    const b = Bt.create(party, foe, { rng: seeded(B.BATTLE.seed) });
    if (A.UI.B) A.UI.leaveBattle(() => {});
    const t0 = performance.now(); let worst = 0, prev = 0;
    A.UI.startBattle({ kind: 'bench', b, d: B.BATTLE.dungeon, env: spec.env || d.env, label: 'Performance test', intro: 'Performance test: a scripted Island Boss battle.', finish: () => {} });
    // wait for the 3D stage (the game gives it up to 4 s) and for the first turn
    while (performance.now() - t0 < 8000) { const now = await nextFrame(); if (prev) worst = Math.max(worst, now - prev); prev = now; const U = A.UI.B; if (U && !U.busy && U.stage && U.stage.is3d) break; if (U && !U.busy && performance.now() - t0 > 4600) break; }
    const U = A.UI.B, is3d = !!(U && U.stage && U.stage.is3d), loadMs = Math.round(performance.now() - t0);
    await sleep(1800); // the boss title card and opening beat finish outside the measurement
    if (is3d) M.resetResolution();
    await sleep(300);
    return { is3d, loadMs, longestFrameWhileLoadingMs: Math.round(worst) };
  }

  function pickMove() {
    const ready = Array.prototype.slice.call(doc.querySelectorAll('#b-actions .abtn.ready'));
    if (!ready.length) return null;
    const sp = ready.find((x) => x.classList.contains('special')); if (sp) return sp;  // ultimates whenever ready (heaviest case)
    const plain = ready.filter((x) => !x.classList.contains('k-guard')); B._mv = (B._mv || 0) + 1;
    return (plain.length ? plain : ready)[B._mv % (plain.length ? plain.length : ready.length)];
  }

  // one measured stretch of the battle; turns: the test presses a move whenever one can be chosen
  async function battlePhase(M, name, o, ctx) {
    ctx.phase = name; M.meterHide(o.off ? B.P7_LAYERS : null); M.meterRead(true); M.meterRecord(true);
    const t0 = performance.now(), logFrom = Math.round(t0), dts = []; let prev = 0, k = 0, turns = 0, ults = 0, lastPress = 0, maxCalls = 0, maxTris = 0, maxCubes = 0, minPr = 9, maxPr = 0;
    const trigBefore = ctx.triggers.length;
    while (!cancel && performance.now() - t0 < o.seconds * 1000) {
      const now = await nextFrame(); if (prev) dts.push(now - prev); prev = now;
      if (++k % 6 === 0) {
        const s = M.stats(); maxCalls = Math.max(maxCalls, s.drawCalls); maxTris = Math.max(maxTris, s.triangles); minPr = Math.min(minPr, s.pixelRatio); maxPr = Math.max(maxPr, s.pixelRatio);
        const st = stage(), dbg = st && st.debug ? st.debug() : null; if (dbg && dbg.fx != null) maxCubes = Math.max(maxCubes, typeof dbg.fx === 'number' ? dbg.fx : dbg.cubes || 0);
      }
      const U = A.UI.B;
      if (o.turns && U && !U.busy && !U.over && !U.b.pending && now - lastPress > 350) { const btn = pickMove(); if (btn) { if (btn.classList.contains('special')) ults++; btn.click(); turns++; lastPress = now; } }
    }
    M.meterRecord(false); M.meterHide(null);
    const m = M.meterRead(true), secs = (performance.now() - t0) / 1000, draws = m.draws.filter((d) => d <= 500), pauses = dts.filter((d) => d > 500);
    const res = M.resolutionLog(logFrom);
    return {
      phase: name, tier: ctx.tierLabel, effects: o.off ? 'off' : 'on', seconds: r1(secs), turns, ultimates: ults, pauses: pauses.length,
      fps3d: r1(draws.length / Math.max(0.001, draws.reduce((a, b) => a + b, 0) / 1000)), budgetFps: m.avgBudgetFps,
      p50: r1(pct(draws, 0.5)), p95: r1(pct(draws, 0.95)), p99: r1(pct(draws, 0.99)), worst: r1(draws.length ? Math.max.apply(null, draws) : 0),
      missedPct: draws.length ? Math.round(m.missed / draws.length * 100) : 0, slowPct: m.judged ? Math.round(m.judgedSlow / m.judged * 100) : 0,
      pageFps: r1(dts.filter((d) => d <= 500).length / Math.max(0.001, dts.filter((d) => d <= 500).reduce((a, b) => a + b, 0) / 1000)),
      cpuUpdateMs: m.updateMs, cpuRenderMs: m.renderMs, cpuMs: r1(m.updateMs + m.renderMs), worstCpuMs: m.worstCpuMs,
      drawCalls: maxCalls, triangles: maxTris, effectCubes: maxCubes, pixelRatio: minPr === maxPr ? maxPr : minPr + '–' + maxPr, canvas: m.canvas,
      resolutionChanges: res.filter((e) => e.result === 'lower-resolution' || e.result === 'raise-resolution').map((e) => e.result + ' at ' + e.pixelRatio + 'x (' + e.slowFrames + '/' + e.frames + ' slow)'),
      batterySaverWouldStart: ctx.triggers.length > trigBefore,
    };
  }

  // the same idle frame drawn with each Phase 7 layer hidden in turn, and once at 1x: what each part costs here
  // Measured at the tier's own resolution; three interleaved rounds, medians, so one slow sample cannot skew a part.
  B.BENCH_N = 16;
  function breakdown(M) {
    M.resetResolution();
    const N = B.BENCH_N, med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1], cfg = [['all', null], ['none', { prefix: B.P7_LAYERS }]].concat(B.LAYER_PARTS.map(([l, pre]) => [l, { prefix: pre }]));
    const first = M.bench(2); if (!first) return null; const ms = {};
    for (let round = 0; round < 3; round++) cfg.forEach(([k, o]) => { const r = M.bench(N, o || undefined); (ms[k] = ms[k] || []).push(r.ms); });
    const base = med(ms.all), parts = {}; B.LAYER_PARTS.forEach(([l]) => { parts[l] = r1(Math.max(0, base - med(ms[l]))); });
    const prNow = first.pixelRatio, at1 = prNow > 1 ? [0, 1, 2].map(() => M.bench(N, { pr: 1 }).ms) : null;
    const spread = Math.round((Math.max.apply(null, ms.all) - Math.min.apply(null, ms.all)) / base * 100);
    return { frameMs: r1(base), drawCalls: first.calls, triangles: first.triangles, pixelRatio: prNow, withoutPhase7Ms: r1(med(ms.none)), phase7LayersMs: r1(Math.max(0, base - med(ms.none))), parts,
      at1xMs: at1 ? r1(med(at1)) : r1(base), resolutionShare: at1 ? Math.max(0, Math.round((1 - med(at1) / base) * 100)) : 0, noisePct: spread };
  }
  // how many frames a second the page itself gets with nothing heavy running (iPhone Low Power Mode caps it at 30)
  async function displayRate() {
    const dts = []; let prev = 0; const t0 = performance.now();
    while (performance.now() - t0 < 1200) { const now = await nextFrame(); if (prev) dts.push(now - prev); prev = now; }
    return r1(1000 / pct(dts, 0.5));
  }

  function verdict(on, off, bd, display) {
    if (!on) return '';
    const ok = on.p95 <= 1000 / Math.max(30, on.budgetFps) * 1.25 && on.missedPct < 5, out = [];
    if (ok) out.push('Keeps up with its frame budget (' + Math.round(on.budgetFps) + ' fps).');
    else if (display && display < 45 && on.budgetFps > 45) out.push('Display-limited: the page only gets about ' + Math.round(display) + ' frames a second (Low Power Mode or the browser caps it), so the 60 fps goal during moves cannot be met and the Battery saver rule counts those frames as slow.');
    else if (on.cpuMs > 10) out.push('CPU-bound: ' + on.cpuUpdateMs + ' ms of animation and effects plus ' + on.cpuRenderMs + ' ms of draw submission per frame.');
    else if (bd && bd.resolutionShare >= 30) out.push('GPU-bound by pixels: the same frame at 1x costs ' + bd.resolutionShare + '% less.');
    else out.push('GPU-bound by scene content.');
    if (off) { const d = r1(on.p95 - off.p95), f = r1(on.fps3d - off.fps3d); out.push('Phase 7 effects: ' + (f >= 0 ? '+' : '') + f + ' fps, p95 ' + (d >= 0 ? '+' : '') + d + ' ms, CPU ' + r1(on.cpuMs - off.cpuMs) + ' ms.'); }
    if (bd) { const top = Object.keys(bd.parts).sort((a, b) => bd.parts[b] - bd.parts[a])[0]; if (top && bd.parts[top] > 0.3) out.push('Biggest Phase 7 layer: ' + top + ' (' + bd.parts[top] + ' ms of ' + bd.frameMs + ' ms).'); }
    return out.join(' ');
  }

  B.runBattle = async function (opts) {
    if (B.running) return null; opts = opts || {}; B.running = true; cancel = false;
    const UI = A.UI, P = A.Perf, S = A.State, out = { test: 'Aminas battle performance test', version: (A.Data && A.Data.VERSION) || '', when: new Date().toISOString(), device: device(), tiers: [], phases: [] };
    const banner = doc.createElement('div'); banner.className = 'bench-banner';
    banner.innerHTML = '<b>Battle test</b> <span class="bench-step">starting…</span> <button class="btn small" type="button">Cancel</button>';
    banner.querySelector('button').onclick = () => { cancel = true; };
    const ctx = { triggers: [], phase: '' }, realReport = P.reportSlow, realSave = S.save, snapshot = JSON.stringify(S.state); let saveCalls = 0;
    const set = S.state.settings || {};
    out.settings = { quality: set.quality || 'auto', batterySaver: !!set.batterySaver, reduceMotion: !!(UI.calm && UI.calm()), creatures3d: set.creatures3d !== false };
    out.batterySaverBefore = { onForThisSession: !!P.autoSaver, reason: P.saverWhy, earlier: P.saverLog ? P.saverLog() : [] };
    const t0 = performance.now(); let M = null;
    try {
      if (!(A.C3D && A.C3D.enabled())) throw new Error('3D battles are off or unavailable (Settings → 3D creatures must be on).');
      M = await A.C3D.load(); if (!M || !M.meterRead) throw new Error('The 3D module did not load.');
      if (UI.closeAll) UI.closeAll();
      out.displayFps = await displayRate();
      S.save = () => { saveCalls++; return true; };
      P.autoSaver = false; P.reportSlow = (why) => { ctx.triggers.push(Object.assign({ phase: ctx.phase, tier: ctx.tierLabel, secondsIntoTest: Math.round((performance.now() - t0) / 1000) }, why || {})); };
      doc.body.appendChild(banner); doc.body.classList.add('bench-on');
      const step = banner.querySelector('.bench-step'), total = B.BATTLE_TIERS.length + (opts.extended ? 1 : 0);
      for (let i = 0; i < B.BATTLE_TIERS.length && !cancel; i++) {
        const [label, tierId] = B.BATTLE_TIERS[i]; ctx.tierLabel = label; P.forceTier = tierId; P.apply();
        step.textContent = (i + 1) + '/' + total + ': ' + label + ', opening the battle';
        const load = await openBattle(M); if (!load.is3d) throw new Error('The battle opened on the 2D stage (the 3D stage took longer than the game allows: ' + load.loadMs + ' ms).');
        const tier = { tier: label, quality: P.quality(), load, atmosphere: (stage() && stage().debug && stage().debug().atmosphere) || null };
        if (i === 0) { step.textContent = '1/' + total + ': ' + label + ', idle'; out.phases.push(await battlePhase(M, 'idle (your turn)', { seconds: B.BATTLE_S.idle }, ctx)); }
        step.textContent = (i + 1) + '/' + total + ': ' + label + ', turns with effects'; const on = await battlePhase(M, 'turns, ' + label + ', effects on', { seconds: B.BATTLE_S.turns, turns: true }, ctx); out.phases.push(on);
        if (cancel) break;
        step.textContent = (i + 1) + '/' + total + ': ' + label + ', turns without effects'; const off = await battlePhase(M, 'turns, ' + label + ', effects off', { seconds: B.BATTLE_S.turns, turns: true, off: true }, ctx); out.phases.push(off);
        // the breakdown needs a still frame: wait for the turn to finish
        for (let w = 0; w < 40 && A.UI.B && A.UI.B.busy; w++) await sleep(100);
        await sleep(400); tier.breakdown = breakdown(M); tier.verdict = verdict(on, off, tier.breakdown, out.displayFps);
        out.tiers.push(tier);
      }
      if (opts.extended && !cancel) {
        // stability: Auto, effects on, continuous combat; resolution adapts as it would in play
        ctx.tierLabel = 'Auto'; P.forceTier = null; P.apply(); step.textContent = total + '/' + total + ': extended combat, opening';
        const load = await openBattle(M); const slices = [];
        for (let k = 0; k < B.EXTENDED_S / 15 && !cancel; k++) {
          step.textContent = total + '/' + total + ': extended combat ' + (k * 15) + '/' + B.EXTENDED_S + ' s';
          const r = await battlePhase(M, 'extended ' + (k * 15) + 's', { seconds: 15, turns: true }, ctx);
          slices.push({ t: k * 15, fps3d: r.fps3d, p95: r.p95, cpuMs: r.cpuMs, pixelRatio: r.pixelRatio, missedPct: r.missedPct, slowPct: r.slowPct, turns: r.turns, pauses: r.pauses });
        }
        const f = slices.map((s) => s.fps3d), avg = (a) => r1(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length));
        out.extended = { load, slices, firstMinFps: avg(f.slice(0, 4)), lastMinFps: avg(f.slice(-4)), firstMinP95: avg(slices.slice(0, 4).map((s) => s.p95)), lastMinP95: avg(slices.slice(-4).map((s) => s.p95)) };
        out.extended.dropPct = out.extended.firstMinFps ? Math.round((1 - out.extended.lastMinFps / out.extended.firstMinFps) * 100) : 0;
      }
      out.cancelled = cancel;
    } catch (e) {
      out.error = e.message;
    } finally {
      P.forceTier = null; P.reportSlow = realReport; P.autoSaver = out.batterySaverBefore.onForThisSession; P.apply();
      if (M) { M.meterHide(null); M.meterRecord(false); }
      try { if (A.UI.B) A.UI.leaveBattle(() => {}); UI.showIsland(); } catch (e) { /* back on the island either way */ }
      S.save = realSave;
      const same = JSON.stringify(S.state) === snapshot;
      if (!same) S.state = JSON.parse(snapshot);   // never keep a change made while the test ran
      out.save = { untouched: same, writesBlocked: saveCalls };
      out.batterySaver = { wouldHaveStarted: ctx.triggers.length > 0, triggers: ctx.triggers.slice(0, 12), note: 'Automatic Battery saver was held off during the test; each entry is a moment its rule would have switched it on, with the measurement behind it.' };
      out.minutes = r1((performance.now() - t0) / 60000);
      out.summary = battleSummary(out);
      try { root.localStorage.setItem('aminas.bench.battle', JSON.stringify(out)); } catch (e) { /* private mode: fine */ }
      banner.remove(); doc.body.classList.remove('bench-on'); B.running = false;
    }
    return out;
  };

  function battleSummary(o) {
    const s = ['Aminas battle perf ' + (o.version || ''), (o.device.gpu || '?') + ', DPR ' + o.device.dpr + ', display ' + o.displayFps + ' fps'];
    o.tiers.forEach((t) => { const on = o.phases.find((p) => p.phase === 'turns, ' + t.tier + ', effects on') || {}, off = o.phases.find((p) => p.phase === 'turns, ' + t.tier + ', effects off') || {};
      s.push(t.tier + ': ' + on.fps3d + '/' + on.budgetFps + ' fps on, ' + off.fps3d + ' off (p95 ' + on.p95 + '/' + off.p95 + ' ms, CPU ' + on.cpuMs + ' ms, ' + on.drawCalls + ' draws, ' + on.pixelRatio + 'x)'); });
    if (o.extended) s.push('extended ' + o.extended.firstMinFps + ' → ' + o.extended.lastMinFps + ' fps (' + o.extended.dropPct + '% drop)');
    s.push('auto Battery saver: ' + (o.batterySaver.wouldHaveStarted ? 'would start (' + o.batterySaver.triggers.length + 'x, first in ' + o.batterySaver.triggers[0].phase + ')' : 'would not start'));
    if (o.batterySaverBefore.onForThisSession) s.push('it was already on before the test' + (o.batterySaverBefore.reason ? ' (' + o.batterySaverBefore.reason.view + ')' : ''));
    s.push('save ' + (o.save.untouched ? 'untouched' : 'CHANGED (restored)'));
    if (o.error) s.push('error: ' + o.error);
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

  B.showBattle = function (o) {
    const UI = A.UI; if (!o) return;
    const row = (p) => '<tr><td>' + esc(p.phase.replace(/^turns, /, '')) + '</td><td>' + p.fps3d + ' / ' + Math.round(p.budgetFps) + '</td><td>' + p.p95 + '</td><td>' + p.cpuMs + '</td><td>' + p.drawCalls + '</td><td>' + Math.round((p.triangles || 0) / 1000) + 'k</td><td>' + p.pixelRatio + '</td></tr>';
    const tiers = (o.tiers || []).map((t) => '<li><b>' + esc(t.tier) + '</b> (opened in ' + t.load.loadMs + ' ms): ' + esc(t.verdict || '') +
      (t.breakdown ? '<br><span class="muted">Still frame ' + t.breakdown.frameMs + ' ms, of which Phase 7 layers ' + t.breakdown.phase7LayersMs + ' ms (' + Object.keys(t.breakdown.parts).map((k) => esc(k) + ' ' + t.breakdown.parts[k]).join(', ') + '); at 1x ' + t.breakdown.at1xMs + ' ms.</span>' : '') + '</li>').join('');
    const bs = o.batterySaver || {}, before = o.batterySaverBefore || {};
    const saver = '<p class="muted" style="font-size:.78rem"><b>Automatic Battery saver:</b> ' + (bs.wouldHaveStarted ? 'its rule would have switched it on ' + bs.triggers.length + ' time(s). First: ' + esc(bs.triggers[0].phase) + ', ' + bs.triggers[0].slowFrames + ' of ' + bs.triggers[0].frames + ' frames slow at ' + bs.triggers[0].pixelRatio + 'x (budget ' + bs.triggers[0].targetFps + ' fps).' : 'its rule never fired during the test.') +
      (before.onForThisSession ? ' It was already on for this session before the test' + (before.reason ? ', switched on in ' + esc(before.reason.view || before.reason.screen || '?') + ' (' + before.reason.slowFrames + ' of ' + before.reason.frames + ' frames slow)' : '') + '.' : '') + '</p>';
    const ext = o.extended ? '<p class="muted" style="font-size:.78rem"><b>Extended combat, 3 min:</b> ' + o.extended.firstMinFps + ' fps in the first minute, ' + o.extended.lastMinFps + ' in the last (' + o.extended.dropPct + '% drop); p95 ' + o.extended.firstMinP95 + ' → ' + o.extended.lastMinP95 + ' ms. A big drop means the phone got hot and slowed down.</p>' : '';
    const body = (o.error ? '<p class="muted">' + esc(o.error) + '</p>' : '') +
      '<p class="muted" style="font-size:.78rem">' + esc(o.device.gpu || '') + ' · DPR ' + o.device.dpr + ' · ' + o.device.viewport.join('×') + (o.cancelled ? ' · <b>cancelled early</b>' : '') + ' · display ' + o.displayFps + ' fps · save ' + (o.save && o.save.untouched ? 'untouched' : 'restored') + '</p>' +
      '<table class="bench-table"><tr><th>Phase</th><th>fps / goal</th><th>p95 ms</th><th>CPU ms</th><th>draws</th><th>tris</th><th>DPR</th></tr>' + (o.phases || []).map(row).join('') + '</table>' +
      '<ul style="font-size:.78rem;padding-left:1.1rem;margin:.5rem 0">' + tiers + '</ul>' + saver + ext +
      '<p class="muted" style="font-size:.74rem">fps: frames the 3D battle drew; goal: its frame budget (60 during moves, 30 when still, 30 in Battery saver). p95: 95 % of frames came at least this fast. CPU: animation, effects and draw submission per frame. GPU time, battery and temperature cannot be read by a web page.</p>' +
      '<textarea class="bench-out" readonly rows="4">' + esc(JSON.stringify(o)) + '</textarea>' +
      '<div class="row-actions"><button class="btn small gold" data-act="benchCopy">Copy results</button><button class="btn small" data-act="benchBattle" data-long="1">Run with extended combat</button><button class="btn small" data-act="benchBattle">Run again</button></div>';
    UI.modal(UI.sheet('Battle test results', body, '<button class="btn gold" data-act="close">Close</button>', 'narrow'));
  };

  if (A.UI && A.UI.act) {
    const UI = A.UI;
    UI.act('benchAsk', () => {
      const last = (() => { try { return JSON.parse(root.localStorage.getItem('aminas.bench')); } catch (e) { return null; } })();
      const lastB = (() => { try { return JSON.parse(root.localStorage.getItem('aminas.bench.battle')); } catch (e) { return null; } })();
      UI.modal(UI.sheet('Performance test', '<p>This measures how smoothly the 3D island runs on this device. It takes about 40 seconds and moves the camera by itself; please don\'t touch the screen until it finishes.</p><p class="muted" style="font-size:.8rem">For a fair result: unplug the charger, turn off Low Power Mode, close other apps, and keep the phone in landscape. The 3-minute heat test also shows whether the phone slows down as it warms up.</p>' +
        '<div class="row-actions"><button class="btn small gold" data-act="benchRun">Start (40 s)</button><button class="btn small" data-act="benchRun" data-long="1">Start with heat test (4 min)</button>' + (last ? '<button class="btn small" data-act="benchLast">Show last result</button>' : '') + '</div>' +
        '<p style="margin-top:.9rem"><b>Battle test.</b> A scripted 3D Island Boss battle at every quality setting, with the Phase 7 arena effects on and off. It plays by itself, records nothing in your save and wins or loses nothing. About 2 minutes, or 5 with 3 minutes of extended combat.</p>' +
        '<div class="row-actions"><button class="btn small gold" data-act="benchBattle">Battle test (2 min)</button><button class="btn small" data-act="benchBattle" data-long="1">With extended combat (5 min)</button>' + (lastB ? '<button class="btn small" data-act="benchBattleLast">Show last battle result</button>' : '') + '</div>', '<button class="btn ghost" data-act="close">Not now</button>', 'narrow'));
    });
    UI.act('benchRun', async (el) => { const long = !!(el && el.dataset && el.dataset.long); if (UI.closeAll) UI.closeAll(); const r = await B.run({ sustained: long }); B.show(r); });
    UI.act('benchBattle', async (el) => { const long = !!(el && el.dataset && el.dataset.long); if (UI.closeAll) UI.closeAll(); const r = await B.runBattle({ extended: long }); B.showBattle(r); });
    UI.act('benchBattleLast', () => { try { B.showBattle(JSON.parse(root.localStorage.getItem('aminas.bench.battle'))); } catch (e) { /* none */ } });
    UI.act('benchLast', () => { try { B.show(JSON.parse(root.localStorage.getItem('aminas.bench'))); } catch (e) { /* none */ } });
    UI.act('benchCopy', (el) => {
      const ta = doc.querySelector('.bench-out'); if (!ta) return; const txt = ta.value;
      const ok = () => UI.toast && UI.toast('Results copied. Paste them into the chat.', 'n');
      const fallback = () => { ta.focus(); ta.select(); try { doc.execCommand('copy'); ok(); } catch (e) { /* select is enough to copy by hand */ } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fallback); else fallback();
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
