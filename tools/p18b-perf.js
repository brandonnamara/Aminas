// Phase 18B: Verdant Wilds performance in Chromium + software WebGL (NOT an iPhone; relative numbers only).
// First-visit build time, draw calls / triangles / geometries per quality tier on both islands, frame times while the
// camera pans, and a leak check (GPU geometries, textures and DOM nodes after ten round trips).
// Run: node tools/p18b-perf.js → docs/audit18b/perf.json
const { chromium } = require('playwright'); const serve = require('../tests/server'); const path = require('path'); const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, a) => page.evaluate(fn, a);
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'R', look: null }; s.starter = 'lumifern'; s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    R.addAmina(s, 'lumifern', 30); R.addAmina(s, 'kairyu', 24); s.islands.verdant = { unlocked: true, obstacles: {} }; s.currentIsland = 'starter'; s.story.scenes = Object.assign(s.story.scenes || {}, { v_arrival: 'seen' }); A.State.state = s; R.drain(); A.UI.showIsland(true); });
  await page.waitForFunction(() => A.VoxIsland.ready(), null, { timeout: 60000 }); await sleep(2000);
  const out = { note: 'Chromium + SwiftShader (software WebGL) at 844×390, DPR 2. Not an iPhone: compare the islands, not absolute speed.' };
  // first visit: time from the travel call to the island drawn (models built and merged)
  out.firstVisitMs = await ev(async () => { const t0 = performance.now(); A.UI.travelTo('verdant'); let n = 0; while (!(A.VoxIsland.ready() && A.VoxIsland.stats() && A.VoxIsland.stats().frames > 0) && n++ < 400) await new Promise((r) => setTimeout(r, 10)); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t0); });
  out.secondVisitMs = await ev(async () => { A.UI.travelTo('starter'); await new Promise((r) => setTimeout(r, 800)); const t0 = performance.now(); A.UI.travelTo('verdant'); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t0); });
  const measure = (iid) => ev(async (i) => { A.UI.travelTo(i); await new Promise((r) => setTimeout(r, 1500)); const c = A.UI.cam && A.UI.cam[i]; const base = c ? { x: c.x, y: c.y } : null; const dts = []; let p = 0; const t0 = performance.now();
    while (performance.now() - t0 < 4000) { const n = await new Promise((r) => requestAnimationFrame(r)); if (p) dts.push(n - p); p = n; if (base) { const k = (n - t0) / 1000; c.x = base.x + Math.sin(k * 1.3) * 140; c.y = base.y + Math.sin(k * 2.1) * 60; A.UI.applyCam && A.UI.applyCam(); } }
    if (base) { c.x = base.x; c.y = base.y; A.UI.applyCam && A.UI.applyCam(); }
    const S = A.VoxIsland.stats(); dts.sort((a, b) => a - b); return { island: i, tier: A.Perf.quality(), calls: S.calls, triangles: S.triangles, geometries: S.geometries, textures: S.textures, avgDrawMs: S.avgDrawMs, p50: +dts[dts.length >> 1].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1) }; }, iid);
  out.tiers = [];
  for (const t of ['high', 'balanced', 'saver']) { await ev((x) => { A.Perf.forceTier = x; A.Perf.apply(); }, t); for (const i of ['starter', 'verdant']) out.tiers.push(await measure(i)); }
  await ev(() => { A.Perf.forceTier = null; A.Perf.apply(); });
  // leak check: ten round trips
  const snap = () => ev(() => { const S = A.VoxIsland.stats(); return { geometries: S.geometries, textures: S.textures, nodes: document.getElementsByTagName('*').length, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null }; });
  await ev(async () => { A.UI.travelTo('verdant'); await new Promise((r) => setTimeout(r, 1200)); }); const before = await snap();
  for (let k = 0; k < 10; k++) await ev(async () => { A.UI.travelTo('starter'); await new Promise((r) => setTimeout(r, 700)); A.UI.travelTo('verdant'); await new Promise((r) => setTimeout(r, 700)); });
  await sleep(1500); const after = await snap(); out.leak = { before, after };
  out.errors = errors; console.log(JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(__dirname, process.env.PERF_OUT || '../docs/audit18b/perf.json'), JSON.stringify(out, null, 1)); await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
