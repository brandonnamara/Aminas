// Phase 19B: Obsidian Reach performance (developer construction preview) in Chromium + software WebGL (NOT an iPhone;
// relative numbers only), against Starter Island and the Verdant Wilds. First-visit build time, draw calls / triangles /
// geometries per quality tier on all three islands, frame times while the camera pans, the 2D fallback (frame times and
// page nodes), and a long-session leak check (thirty three-island round trips: GPU geometries, textures, nodes, heap).
// Run: node tools/p19b-perf.js → docs/audit19b/perf.json
const { chromium } = require('playwright'); const serve = require('../tests/server'); const path = require('path'); const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, a) => page.evaluate(fn, a);
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'R', look: null }; s.starter = 'lumifern'; s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    R.addAmina(s, 'lumifern', 30); R.addAmina(s, 'kairyu', 24); s.islands.verdant = { unlocked: true, obstacles: {} }; s.currentIsland = 'starter'; s.campaign = s.campaign || {}; s.campaign.bosses = Object.assign({}, s.campaign.bosses, { verdant: true }); s.o19.cap = 50; s.story.scenes = Object.assign(s.story.scenes || {}, { v_arrival: 'seen' }); A.State.state = s; R.drain(); A.UI.showIsland(true); });
  await page.waitForFunction(() => A.VoxIsland.ready(), null, { timeout: 60000 }); await sleep(2000);
  await ev(() => { A.Rules.O19.preview(A.State.state); A.State.save(); });
  // the Verdant arrival scene plays once on a first trip there; get it out of the way so it is not measured
  await ev(async () => { A.UI.travelTo('verdant'); await new Promise((r) => setTimeout(r, 1500)); for (let i = 0; i < 10; i++) { const b = document.querySelector('#sc-skip'); if (b) b.click(); await new Promise((r) => setTimeout(r, 300)); } A.UI.closeAll(); A.UI.travelTo('starter'); await new Promise((r) => setTimeout(r, 1200)); });
  const out = { note: 'Chromium + SwiftShader (software WebGL) at 844×390, DPR 2. Not an iPhone: compare the islands, not absolute speed.' };
  // first visit: time from the travel call to the island drawn (models built and merged)
  out.firstVisitMs = await ev(async () => { const t0 = performance.now(); A.UI.travelTo('obsidian'); let n = 0; while (!(A.VoxIsland.ready() && A.VoxIsland.stats() && A.VoxIsland.stats().frames > 0) && n++ < 400) await new Promise((r) => setTimeout(r, 10)); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t0); });
  out.secondVisitMs = await ev(async () => { A.UI.travelTo('starter'); await new Promise((r) => setTimeout(r, 800)); const t0 = performance.now(); A.UI.travelTo('obsidian'); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t0); });
  const measure = (iid) => ev(async (i) => { A.UI.travelTo(i); await new Promise((r) => setTimeout(r, 1500)); const c = A.UI.cam && A.UI.cam[i]; const base = c ? { x: c.x, y: c.y } : null; const dts = []; let p = 0; const t0 = performance.now();
    while (performance.now() - t0 < 4000) { const n = await new Promise((r) => requestAnimationFrame(r)); if (p) dts.push(n - p); p = n; if (base) { const k = (n - t0) / 1000; c.x = base.x + Math.sin(k * 1.3) * 140; c.y = base.y + Math.sin(k * 2.1) * 60; A.UI.applyCam && A.UI.applyCam(); } }
    if (base) { c.x = base.x; c.y = base.y; A.UI.applyCam && A.UI.applyCam(); }
    const S = A.VoxIsland.stats(); dts.sort((a, b) => a - b); return { island: i, tier: A.Perf.quality(), calls: S.calls, triangles: S.triangles, geometries: S.geometries, textures: S.textures, avgDrawMs: S.avgDrawMs, p50: +dts[dts.length >> 1].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1) }; }, iid);
  out.tiers = [];
  for (const t of ['high', 'balanced', 'saver']) { await ev((x) => { A.Perf.forceTier = x; A.Perf.apply(); }, t); for (const i of ['starter', 'verdant', 'obsidian']) out.tiers.push(await measure(i)); }
  await ev(() => { A.Perf.forceTier = null; A.Perf.apply(); });
  // the 2D fallback (voxel island off): frame times while panning and page nodes, per island
  out.flat = [];
  await ev(() => { A.State.state.settings.voxIsland = false; A.UI.showIsland(); });
  for (const i of ['starter', 'verdant', 'obsidian']) out.flat.push(await ev(async (iid) => { A.UI.travelTo(iid); await new Promise((r) => setTimeout(r, 1500)); const c = A.UI.cam && A.UI.cam[iid]; const base = c ? { x: c.x, y: c.y } : null; const dts = []; let p = 0; const t0 = performance.now();
    while (performance.now() - t0 < 4000) { const n = await new Promise((r) => requestAnimationFrame(r)); if (p) dts.push(n - p); p = n; if (base) { const k = (n - t0) / 1000; c.x = base.x + Math.sin(k * 1.3) * 140; c.y = base.y + Math.sin(k * 2.1) * 60; A.UI.applyCam && A.UI.applyCam(); } }
    if (base) { c.x = base.x; c.y = base.y; A.UI.applyCam && A.UI.applyCam(); } dts.sort((a, b) => a - b);
    return { island: iid, vox: !!document.querySelector('#world.vox'), nodes: document.getElementsByTagName('*').length, svgNodes: document.querySelectorAll('#world *').length, p50: +dts[dts.length >> 1].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1) }; }, i));
  await ev(() => { A.State.state.settings.voxIsland = true; A.UI.showIsland(); }); await page.waitForFunction(() => A.VoxIsland.ready(), null, { timeout: 60000 }); await sleep(1500);
  // long session: thirty three-island round trips (starter → verdant → obsidian)
  const snap = () => ev(() => { const S = A.VoxIsland.stats(); return { geometries: S.geometries, textures: S.textures, nodes: document.getElementsByTagName('*').length, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null }; });
  await ev(async () => { for (const i of ['starter', 'verdant', 'obsidian']) { A.UI.travelTo(i); await new Promise((r) => setTimeout(r, 1200)); } }); const before = await snap(); const tl = Date.now(), mid = [];
  for (let k = 0; k < 30; k++) { await ev(async () => { for (const i of ['starter', 'verdant', 'obsidian']) { A.UI.travelTo(i); await new Promise((r) => setTimeout(r, 600)); } }); if (k % 10 === 9) mid.push(await snap()); }
  await sleep(1500); const after = await snap(); out.leak = { trips: 30, islandsPerTrip: 3, before, at10_20_30: mid, after, avgTravelMs: Math.round((Date.now() - tl) / 90) };
  out.errors = errors; console.log(JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(__dirname, process.env.PERF_OUT || '../docs/audit19b/perf.json'), JSON.stringify(out, null, 1)); await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
