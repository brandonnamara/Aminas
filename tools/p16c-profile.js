// Phase 16C: rendering and memory profile. Desktop Chromium with SwiftShader software WebGL at 844×390, touch, DPR 2.
// NOT an iPhone. Two conditions: "normal" (no throttling) and "slow" (Chrome DevTools CPU throttling ×4, a simulated
// slow device). For each scene: time to first frame, long tasks while it settles, sustained frame pacing, renderer
// counters. Then repeated transitions (island → collection → building panel → creature details → battle → dungeon list)
// with garbage collection between cycles: JS heap, DOM nodes, event listeners, GPU geometries and textures.
// Run: node tools/p16c-profile.js <label> [normal|slow|both] [cycles]  -> docs/ui/screens16c/profile-<label>-<cond>.json
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path');
const LABEL = process.argv[2] || 'now', CONDS = (process.argv[3] || 'both') === 'both' ? ['normal', 'slow'] : [process.argv[3]], CYCLES = +(process.argv[4] || 8);
const OUT = path.join(__dirname, '..', 'docs', 'ui', 'screens16c'); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  for (const cond of CONDS) {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage(); page.setDefaultTimeout(180000); const cdp = await ctx.newCDPSession(page); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await cdp.send('Performance.enable');
    if (cond === 'slow') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const metrics = async () => { await cdp.send('HeapProfiler.collectGarbage').catch(() => {}); await sleep(150); await cdp.send('HeapProfiler.collectGarbage').catch(() => {}); const m = (await cdp.send('Performance.getMetrics')).metrics, g = (k) => (m.find((x) => x.name === k) || {}).value;
      const r = await page.evaluate(() => ({ c3d: A.C3D && A.C3D.stats ? A.C3D.stats() : null, isl: A.VoxIsland && A.VoxIsland.stats ? A.VoxIsland.stats() : null, ghosts: document.querySelectorAll('.ov-ghost16').length, overlays: document.querySelectorAll('#modal-root > *').length, canvases: document.querySelectorAll('canvas').length }));
      return { heapMB: +(g('JSHeapUsedSize') / 1048576).toFixed(2), nodes: g('Nodes'), listeners: g('JSEventListeners'), docs: g('Documents'), c3dGeo: r.c3d ? r.c3d.geometries : null, c3dTex: r.c3d ? r.c3d.textures : null, templates: r.c3d ? r.c3d.templates : null, c3dLoop: r.c3d ? r.c3d.loopRunning : null, islGeo: r.isl ? r.isl.geometries : null, islTex: r.isl ? r.isl.textures : null, canvases: r.canvases, overlays: r.overlays }; };
    // frame pacing and long tasks inside the page
    await page.addInitScript(() => { window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true }); } catch (e) {} });
    const t0 = Date.now(); await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title'); const titleMs = Date.now() - t0;
    const pace = (ms) => page.evaluate((ms) => new Promise((res) => { const f = []; let last = performance.now(); const end = last + ms; const loop = (t) => { f.push(t - last); last = t; if (t < end) requestAnimationFrame(loop); else { f.sort((a, b) => a - b); const p = (q) => +f[Math.min(f.length - 1, Math.floor(f.length * q))].toFixed(1); res({ frames: f.length, fps: +(1000 * f.length / ms).toFixed(1), median: p(0.5), p95: p(0.95), worst: +f[f.length - 1].toFixed(1), over50: f.filter((x) => x > 50).length }); } }; requestAnimationFrame(loop); }), ms);
    const lt = (since) => page.evaluate((since) => { const l = window.__lt.filter((e) => e[0] >= since); return { count: l.length, totalMs: Math.round(l.reduce((n, e) => n + e[1], 0)), maxMs: Math.round(l.reduce((n, e) => Math.max(n, e[1]), 0)) }; }, since);
    const now = () => page.evaluate(() => performance.now());
    const tidy = () => page.evaluate(async () => { for (let i = 0; i < 30 && document.querySelector('.dlg, .scene'); i++) { const d = document.querySelector('.dlg .dlg-skip, #sc-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 100)); } A.UI.queue.length = 0; A.UI.busy = false; document.querySelectorAll('.toast,.ach-toast').forEach((t) => t.remove()); });
    const scene = async (name, act, ready, settle) => { const s = await now(), w0 = Date.now(); await page.evaluate(act); if (ready) await page.waitForFunction(ready, null, { timeout: 120000 }); const firstMs = Date.now() - w0; await sleep(settle || 2500); const l = await lt(s); const p = await pace(4000);
      const st = await page.evaluate(() => ({ c3d: A.C3D && A.C3D.stats && A.C3D.stats() ? (({ drawCalls, triangles, geometries, textures, pixelRatio, c3dFps }) => ({ drawCalls, triangles, geometries, textures, pixelRatio, c3dFps }))(A.C3D.stats()) : null, isl: A.VoxIsland && A.VoxIsland.stats && A.VoxIsland.stats() ? (({ calls, triangles, geometries, textures, avgDrawMs, shadowMap }) => ({ calls, triangles, geometries, textures, avgDrawMs, shadowMap }))(A.VoxIsland.stats()) : null, dom: document.getElementsByTagName('*').length, saver: !!(A.Perf.saver && A.Perf.saver()) }));
      return { firstMs, longTasks: l, pace: p, stats: st }; };
    // a mid-game save: starter, several Aminas, buildings, the first dungeon partly done
    await page.evaluate(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
      ['lumifern', 'acinus', 'emberix', 'umbrit', 'cannonis', 'zephyr'].forEach((sp, i) => R.addAmina(s, sp, 12 - i)); s.res.gold = 9000; s.res.food = 900; s.struct.hollow = true; s.struct.hatchery = true; s.struct.forge = true;
      s.missions = { m_hollow: 'claimed', m_feed: 'claimed', m_lv3: 'claimed', m_find: 'claimed' }; s.dungeon.forgottenroad = Object.assign(R.dungeonRec(s, 'forgottenroad'), { next: 3 }); s.settings.sfx = false; s.settings.music = false;
      A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; R.drain(); A.State.save(); });
    const res = { label: LABEL, cond, note: 'Desktop Chromium + SwiftShader software WebGL, 844x390 at DPR 2' + (cond === 'slow' ? ', CPU throttled x4 (simulated slow device)' : '') + '. Not an iPhone.', titleMs, scenes: {}, memory: [] };
    res.scenes.island = await scene('island', () => A.UI.showIsland(true), () => !!document.querySelector('#world') && A.VoxIsland && A.VoxIsland.stats && (A.VoxIsland.stats() || {}).frames > 2, 3000); await tidy();
    res.scenes.collection = await scene('collection', () => { A.UI.closeAll(); A.UI.collection(); }, () => !!document.querySelector('.overlay .card, .overlay [data-act=colSet]'));
    res.scenes.building = await scene('building', () => { A.UI.closeAll(); A.UI.buildingPanel('hatchery'); }, () => !!document.querySelector('.overlay'));
    res.scenes.detail = await scene('detail', () => { A.UI.closeAll(); const a = A.State.state.aminas.find((x) => x.sp === 'cannonis') || A.State.state.aminas[0]; A.UI.detail(a.sp, { uid: a.uid }); }, () => !!document.querySelector('.overlay .viewer3d.live, .overlay .viewer3d canvas, .overlay .viewer3d img'));
    res.scenes.dungeons = await scene('dungeons', () => { A.UI.closeAll(); A.UI.dungeons(null, 'forgottenroad'); }, () => !!document.querySelector('.overlay [data-act=dSel]'));
    res.scenes.combat = await scene('combat', () => { A.UI.closeAll(); const s = A.State.state, R = A.Rules; R.startRun(s, 'forgottenroad', s.aminas.slice(0, 3).map((a) => a.uid)); A.UI.startBattle(); }, () => A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy, 2500);
    res.scenes.combatBig = await scene('combatBig', () => { const R = A.Rules, Bt = R.Battle; A.UI.leaveBattle(() => {}); R.abandonRun(A.State.state); const f = Bt.fighter('cannonis', 30), e = Bt.fighter('zephyr', 30); [f, e].forEach((x) => { x.hpMax *= 50; x.hp = x.hpMax; }); A.UI.startBattle({ kind: 'test', b: Bt.create([f], e, { rng: () => 0.5 }), d: 'heartwood', label: 'profile', finish: () => {} }); }, () => A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy, 2500);
    await page.evaluate(() => { A.UI.leaveBattle(() => {}); A.Rules.abandonRun(A.State.state); A.UI.showIsland(true); }); await sleep(2000); await tidy();
    // repeated transitions
    res.memory.push(Object.assign({ cycle: 0 }, await metrics()));
    for (let c = 1; c <= CYCLES; c++) {
      await page.evaluate(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)), until = async (f, ms) => { const e = Date.now() + ms; while (!f() && Date.now() < e) await w(50); };
        A.UI.closeAll(); A.UI.collection(); await w(500); A.UI.closeAll(); await w(200);
        A.UI.buildingPanel('hatchery'); await w(400); A.UI.closeAll(); await w(200);
        const a = A.State.state.aminas[1]; A.UI.detail(a.sp, { uid: a.uid }); await until(() => document.querySelector('.overlay .viewer3d.live'), 8000); await w(600); A.UI.closeAll(); await w(200);
        const s = A.State.state, R = A.Rules; R.startRun(s, 'forgottenroad', s.aminas.slice(0, 3).map((x) => x.uid)); A.UI.startBattle(); await until(() => A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy, 60000); await w(800);
        A.UI.leaveBattle(() => {}); R.abandonRun(s); A.UI.showIsland(true); await w(800);
        A.UI.dungeons(null, 'forgottenroad'); await w(400); A.UI.closeAll(); await w(600);
        for (let i = 0; i < 20 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await w(100); } A.UI.queue.length = 0; A.UI.busy = false; });
      res.memory.push(Object.assign({ cycle: c }, await metrics()));
    }
    res.errors = errors;
    fs.writeFileSync(path.join(OUT, 'profile-' + LABEL + '-' + cond + '.json'), JSON.stringify(res, null, 1));
    const m = res.memory, f = m[1], l = m[m.length - 1];
    console.log('[' + cond + '] title ' + titleMs + ' ms'); Object.keys(res.scenes).forEach((k) => { const s = res.scenes[k]; console.log('  ' + k.padEnd(10), 'first', s.firstMs, 'ms | long tasks', s.longTasks.count, 'total', s.longTasks.totalMs, 'max', s.longTasks.maxMs, '| fps', s.pace.fps, 'median', s.pace.median, 'p95', s.pace.p95, 'worst', s.pace.worst, '| ', JSON.stringify(s.stats.c3d && k.startsWith('combat') ? s.stats.c3d : s.stats.isl)); });
    console.log('  memory cycle1→' + l.cycle + ': heap ' + f.heapMB + '→' + l.heapMB + ' MB, nodes ' + f.nodes + '→' + l.nodes + ', listeners ' + f.listeners + '→' + l.listeners + ', c3d geo ' + f.c3dGeo + '→' + l.c3dGeo + ' tex ' + f.c3dTex + '→' + l.c3dTex + ' templates ' + f.templates + '→' + l.templates + ', island geo ' + f.islGeo + '→' + l.islGeo + ', canvases ' + f.canvases + '→' + l.canvases + (errors.length ? ' | ERRORS ' + errors.slice(0, 2).join(' | ') : ''));
    await ctx.close();
  }
  await browser.close(); srv.close();
})();
