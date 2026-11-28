// Phase 20B: the Celestial Crown's performance (developer construction preview) in Chromium + software WebGL (NOT an
// iPhone; relative numbers only), against the three completed islands. Per island: first and second visit build times,
// draw calls / triangles / geometries / estimated graphics memory per quality tier, frame times while the camera pans,
// triangles by layer; on the Crown: landmark interactions (sheet open, Wayfinder move); the 2D fallback (frame times and
// page nodes); and a long session (thirty four-island round trips: GPU geometries, textures, nodes, JS heap).
// Run: node tools/p20b-perf.js → docs/audit20b/perf.json
const { chromium } = require('playwright'); const serve = require('../tests/server'); const path = require('path'); const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ISL = ['starter', 'verdant', 'obsidian', 'celestial'];
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(180000); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, a) => page.evaluate(fn, a);
  const tidy = () => ev(async () => { for (let i = 0; i < 40 && (document.querySelector('.dlg') || document.querySelector('#sc-skip')); i++) { const d = document.querySelector('.dlg .dlg-skip') || document.querySelector('#sc-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 150)); } A.UI.closeAll(); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'R', look: null }; s.starter = 'lumifern'; s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['hollow', 'tidegate', 'moonshrine', 'hatchery'].forEach((k) => { s.struct[k] = true; Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
    R.addAmina(s, 'lumifern', 50); R.addAmina(s, 'aimza3', 50); ['verdant', 'obsidian'].forEach((k) => { s.islands[k] = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'boss' }; });
    s.campaign = s.campaign || {}; s.campaign.bosses = Object.assign({}, s.campaign.bosses, { verdant: true, obsidian: true }); s.story = s.story || {}; s.story.scenes = Object.assign({}, s.story.scenes, { o_arrival: 1, v_arrival: 1 });
    s.currentIsland = 'starter'; A.State.state = s; R.drain(); A.State.save(); A.UI.showIsland(true); });
  await page.waitForFunction(() => A.VoxIsland.ready(), null, { timeout: 90000 }); await sleep(2000); await tidy();
  await ev(() => { A.Rules.C20.preview(A.State.state); A.State.save(); });
  // warm-ups: the Starter Hatchery's imported model and each island's own arrival lines, so they are not measured
  for (const i of ['verdant', 'obsidian', 'starter']) { await ev((x) => A.UI.travelTo(x), i); await sleep(2500); await tidy(); }
  const out = { note: 'Chromium + SwiftShader (software WebGL) at 844×390, DPR 2. Not an iPhone: compare the islands, not absolute speed.' };
  // first and second visits to each island: travel call → island drawn
  const visit = (i) => ev(async (iid) => { const t0 = performance.now(); A.UI.travelTo(iid); let n = 0; while (!(A.VoxIsland.ready() && A.State.state.currentIsland === iid && A.VoxIsland.stats().frames > 0) && n++ < 600) await new Promise((r) => setTimeout(r, 25)); return Math.round(performance.now() - t0); }, i);
  out.visits = {};
  for (const i of ['celestial', 'obsidian', 'verdant']) { out.visits[i] = { first: await visit(i) }; await sleep(1500); await tidy(); }
  for (const i of ['celestial', 'obsidian', 'verdant', 'starter']) { await ev(() => A.UI.travelTo('starter')); await sleep(1000); (out.visits[i] = out.visits[i] || {}).second = await visit(i); await sleep(1500); await tidy(); }
  const measure = (iid) => ev(async (i) => { A.UI.travelTo(i); await new Promise((r) => setTimeout(r, 1800)); const c = A.UI.cam && A.UI.cam[i]; const base = c ? { x: c.x, y: c.y } : null; const dts = []; let p = 0; const t0 = performance.now();
    while (performance.now() - t0 < 4000) { const n = await new Promise((r) => requestAnimationFrame(r)); if (p) dts.push(n - p); p = n; if (base) { const k = (n - t0) / 1000; c.x = base.x + Math.sin(k * 1.3) * 140; c.y = base.y + Math.sin(k * 2.1) * 60; A.UI.applyCam && A.UI.applyCam(); } }
    if (base) { c.x = base.x; c.y = base.y; A.UI.applyCam && A.UI.applyCam(); }
    const S = A.VoxIsland.stats(); dts.sort((a, b) => a - b); return { island: i, tier: A.Perf.quality(), calls: S.calls, triangles: S.triangles, geometries: S.geometries, textures: S.textures, gpu: A.VoxIsland.gpuMem(), layers: A.VoxIsland.breakdown(), avgDrawMs: S.avgDrawMs, p50: +dts[dts.length >> 1].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1), heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null }; }, iid);
  out.tiers = [];
  for (const t of ['high', 'balanced', 'saver']) { await ev((x) => { A.Perf.forceTier = x; A.Perf.apply(); }, t); for (const i of ISL) { out.tiers.push(await measure(i)); await tidy(); } }
  await ev(() => { A.Perf.forceTier = null; A.Perf.apply(); });
  // landmark interactions on the Crown: opening each place's sheet, and the Wayfinder's camera move
  await ev(() => A.UI.travelTo('celestial')); await sleep(2000); await tidy();
  out.interactions = await ev(async () => { const C = A.Rules.C20, open = [], go = [];
    for (const id of C.placeIds()) { const t0 = performance.now(); A.UI.c20Open(id); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); open.push(Math.round(performance.now() - t0)); A.UI.closeAll(); await new Promise((r) => setTimeout(r, 150)); }
    for (const id of ['orrery', 'bell', 'jetty', 'chart', 'observatory']) { const c = A.UI.cam.celestial, t0 = performance.now(); A.UI.c20Go(id); let last = null, still = 0, n = 0; while (still < 4 && n++ < 200) { await new Promise((r) => requestAnimationFrame(r)); const k = c.x.toFixed(1) + ',' + c.y.toFixed(1) + ',' + (c.z || 0); still = k === last ? still + 1 : 0; last = k; } go.push(Math.round(performance.now() - t0)); A.UI.clearGuide && A.UI.clearGuide(); }
    open.sort((a, b) => a - b); go.sort((a, b) => a - b); return { sheetOpenMs: { p50: open[open.length >> 1], max: open[open.length - 1], n: open.length }, wayfinderSettleMs: { p50: go[go.length >> 1], max: go[go.length - 1], n: go.length } }; });
  // the 2D fallback (voxel island off): frame times while panning and page nodes, per island
  out.flat = [];
  await ev(() => { A.State.state.settings.voxIsland = false; A.UI.showIsland(); });
  for (const i of ISL) out.flat.push(await ev(async (iid) => { A.UI.travelTo(iid); await new Promise((r) => setTimeout(r, 1500)); const c = A.UI.cam && A.UI.cam[iid]; const base = c ? { x: c.x, y: c.y } : null; const dts = []; let p = 0; const t0 = performance.now();
    while (performance.now() - t0 < 4000) { const n = await new Promise((r) => requestAnimationFrame(r)); if (p) dts.push(n - p); p = n; if (base) { const k = (n - t0) / 1000; c.x = base.x + Math.sin(k * 1.3) * 140; c.y = base.y + Math.sin(k * 2.1) * 60; A.UI.applyCam && A.UI.applyCam(); } }
    if (base) { c.x = base.x; c.y = base.y; A.UI.applyCam && A.UI.applyCam(); } dts.sort((a, b) => a - b);
    return { island: iid, vox: !!document.querySelector('#world.vox'), nodes: document.getElementsByTagName('*').length, svgNodes: document.querySelectorAll('#world *').length, p50: +dts[dts.length >> 1].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1) }; }, i));
  await ev(() => { A.State.state.settings.voxIsland = true; A.UI.showIsland(); }); await page.waitForFunction(() => A.VoxIsland.ready(), null, { timeout: 90000 }); await sleep(1500); await tidy();
  // long session: thirty four-island round trips
  const snap = () => ev(() => { const S = A.VoxIsland.stats(); return { geometries: S.geometries, textures: S.textures, nodes: document.getElementsByTagName('*').length, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null }; });
  await ev(async (L) => { for (const i of L) { A.UI.travelTo(i); await new Promise((r) => setTimeout(r, 1200)); } }, ISL); await tidy(); const before = await snap(); const tl = Date.now(), mid = [];
  for (let k = 0; k < 30; k++) { await ev(async (L) => { for (const i of L) { A.UI.travelTo(i); await new Promise((r) => setTimeout(r, 600)); } }, ISL); if (k % 10 === 9) { await tidy(); mid.push(await snap()); } }
  await sleep(1500); await tidy(); const after = await snap(); out.leak = { trips: 30, islandsPerTrip: 4, before, at10_20_30: mid, after, avgTravelMs: Math.round((Date.now() - tl) / 120) };
  out.errors = errors; console.log(JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(__dirname, process.env.PERF_OUT || '../docs/audit20b/perf.json'), JSON.stringify(out, null, 1)); await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
