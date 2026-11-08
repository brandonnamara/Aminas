// Phase 7 performance fix — real-browser regression test (Chromium + Playwright, SwiftShader; NOT a phone).
// Automatic performance protection must judge frames against the frame rate the page can actually get:
//   - a page capped at 30 fps (Low Power Mode, an in-app browser) that runs steadily must not lose resolution or
//     switch Battery saver on;
//   - a device that is really struggling must still be caught: at 60 fps with heavy frames, at 30 fps with frames
//     slower than 30, and when the GPU cannot keep up (frames come at 30 but the GPU is still busy).
// The 30 fps page is made by delivering every second animation frame to the page (as a capped browser does). A tiny
// viewport keeps software rendering fast enough to stand in for a phone GPU with headroom.
// Run: node tests/browser-perf-fix.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// every page gets a switchable frame-rate divider: __rafDiv(2) delivers every second frame (60 → 30 fps)
const RAF_DIVIDER = `(() => { const raw = window.requestAnimationFrame.bind(window); let div = 1, frame = 0;
  raw(function f() { frame++; raw(f); });
  window.__rafDiv = (n) => { div = n; };
  window.requestAnimationFrame = (cb) => { const go = (t) => { if (div > 1 && frame % div) return raw(go); cb(t); }; return raw(go); };
  // a main-thread hog: something taking ms of every frame (a device that cannot keep up)
  let hog = 0; window.__hog = (ms) => { hog = ms; };
  raw(function h() { if (hog) { const t = performance.now(); while (performance.now() - t < hog) {} } raw(h); });
})();`;

(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 420, height: 200 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(RAF_DIVIDER);
  const page = await ctx.newPage(); page.setDefaultTimeout(300000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D && A.Perf.noteFrame);

  /* ---------------- the estimate itself ---------------- */
  const est = await page.evaluate(() => { const P = A.Perf, out = {};
    const feed = (arr) => { P._resetDisplay(); arr.forEach((x) => P.noteFrame(x)); return Object.assign({ ms: +P.displayMs().toFixed(1) }, P.displayInfo()); };
    const rep = (v, n) => Array.from({ length: n }, (_, i) => (typeof v === 'function' ? v(i) : v));
    out.none = feed([]); out.few = feed(rep(33.3, 10));
    out.p60 = feed(rep((i) => 16.7 + ((i * 7) % 3 - 1) * 0.4, 40)); out.p30 = feed(rep((i) => 33.3 + ((i * 5) % 3 - 1) * 0.8, 40));
    out.p120 = feed(rep(8.3, 40)); out.jank = feed(rep((i) => [16.7, 33.4, 50, 16.7, 70, 22][i % 6], 40));
    out.mostly30 = feed(rep((i) => (i % 10 === 0 ? 50 : 33.3), 40));
    out.back = (() => { feed(rep(33.3, 40)); rep(16.7, 40).forEach((x) => P.noteFrame(x)); return { ms: +P.displayMs().toFixed(1) }; })();
    P._resetDisplay(); return out; });
  ok(est.none.ms === 16.7 && est.few.ms === 16.7, 'with no evidence the page is assumed to get 60 fps (exactly the earlier rule)');
  ok(est.p60.ms === 16.7 && est.p60.steady, 'a steady 60 fps page is read as 60 fps');
  ok(est.p30.ms === 33.3 && est.p30.steady && est.p30.fps === 30, 'a steady 30 fps page is read as 30 fps');
  ok(est.mostly30.ms === 33.3, 'a 30 fps page with the odd late frame is still read as 30 fps');
  ok(est.p120.ms === 16.7, 'a 120 Hz screen changes nothing (budgets never go below a 60 fps frame)');
  ok(est.jank.ms === 16.7 && !est.jank.steady, 'irregular, janky frames are not mistaken for a capped page');
  ok(est.back.ms === 16.7, 'the estimate follows the page back to 60 fps (e.g. Low Power Mode turned off)');

  /* ---------------- the live render loop ---------------- */
  // The rule lives in the shared 3D render loop (the same loop and rule for battles and the creature viewer). The
  // Heartwood boss room is too heavy for software rendering here (~24 ms a frame even at 200x100), so the live cases
  // use the creature viewer (~4 ms a frame), held in the 60 fps "something is moving" budget for the whole run. The
  // boss battle itself is measured on the iPhone with the battle performance test.
  await page.evaluate(() => { const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.settings.creatures3d = true; s.settings.quality = 'auto'; });
  const run = (o) => page.evaluate(async (o) => {
    const P = A.Perf, M = await A.C3D.load(); P.autoSaver = false; P._resetDisplay(); window.__rafDiv(o.div); window.__hog(0);
    const seen = []; const real = P.reportSlow; P.reportSlow = (why) => seen.push(why);
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:160px;height:120px;z-index:99999'; document.body.appendChild(host);
    const v = await M.createViewer(host, 'lumifern'); let gl = null, realSync = null;
    if (o.gpuBusy) { gl = document.querySelector('canvas.c3d-canvas').getContext('webgl2'); realSync = gl.getSyncParameter; gl.getSyncParameter = function (x, p) { return p === gl.SYNC_STATUS ? gl.UNSIGNALED : realSync.call(gl, x, p); }; }
    await new Promise((r) => setTimeout(r, 1200)); M.resetResolution(); const prStart = M.stats().pixelRatio;
    const t0 = performance.now(); window.__hog(o.hog || 0); M.meterRead(true); M.meterRecord(true);
    const keep = setInterval(() => P.boost(800), 300); P.boost(800);
    await new Promise((r) => setTimeout(r, o.ms || 6000)); clearInterval(keep); window.__hog(0);
    M.meterRecord(false); const m = M.meterRead(true), log = M.resolutionLog(Math.round(t0));
    if (gl) gl.getSyncParameter = realSync;
    const out = { prStart, prEnd: M.stats().pixelRatio, display: P.displayInfo(), saverWouldStart: seen.length, firstWhy: seen[0] || null, lowered: log.filter((e) => e.result === 'lower-resolution').length, judged: log.length, slowPct: m.judged ? Math.round(m.judgedSlow / m.judged * 100) : 0, fps: m.draws.length ? Math.round(m.draws.length / (m.draws.reduce((a, b) => a + b, 0) / 1000) * 10) / 10 : 0, saverNow: P.saver() };
    P.reportSlow = real; P.autoSaver = false; v.dispose(); host.remove(); window.__rafDiv(1); return out;
  }, o);

  const fast = await run({ div: 1 });
  console.log('       60 fps page, light frames:', JSON.stringify(fast));
  ok(fast.prStart === 2 && fast.prEnd === 2 && fast.slowPct < 20 && fast.saverWouldStart === 0 && fast.lowered === 0, 'a healthy 60 fps 3D view stays at full resolution (2x) with no Battery saver (as before)');

  const capped = await run({ div: 2 });
  console.log('       30 fps page, light frames:', JSON.stringify(capped));
  ok(capped.display.fps === 30 && capped.display.steady, 'a 3D view on a page capped at 30 fps reads the page as 30 fps');
  ok(capped.fps >= 26 && capped.fps <= 31, 'and draws a steady ~30 fps (' + capped.fps + ')');
  ok(capped.slowPct < 20, 'steady 30 fps frames are not counted as slow during moves (' + capped.slowPct + '% slow; the old rule counted ~88% on the iPhone)');
  ok(capped.prStart === 2 && capped.lowered === 0 && capped.prEnd === 2, 'stable 30 fps does not lower the resolution (stays at 2x)');
  ok(capped.saverWouldStart === 0 && !capped.saverNow, 'stable 30 fps does not switch Battery saver on');

  const hog60 = await run({ div: 1, hog: 45, ms: 11000 });
  console.log('       60 fps page, struggling  :', JSON.stringify(hog60));
  ok(hog60.lowered >= 4 && hog60.prEnd === 1, 'a device that is really struggling at 60 fps first steps its resolution down (2x → 1x, ' + hog60.lowered + ' steps)');
  ok(hog60.slowPct > 50 && hog60.saverWouldStart > 0, 'and, still slow at 1x, switches Battery saver on');
  ok(hog60.display.fps === 60, 'its heavy frames do not talk the estimate down to a lower frame rate');
  ok(hog60.firstWhy && hog60.firstWhy.view === 'viewer:lumifern' && hog60.firstWhy.displayFps === 60 && hog60.firstWhy.slowFrames > hog60.firstWhy.frames / 2, 'the reason is recorded (view, slow frames, the page frame rate it judged against)');

  const hog30 = await run({ div: 2, hog: 50, ms: 11000 });
  console.log('       30 fps page, struggling  :', JSON.stringify(hog30));
  ok(hog30.lowered >= 4 && hog30.slowPct > 50 && hog30.saverWouldStart > 0, 'on a 30 fps page, frames slower than 30 fps still lower the resolution and trigger Battery saver');

  const gpu = await run({ div: 2, gpuBusy: true, ms: 11000 });
  console.log('       30 fps, GPU always behind:', JSON.stringify(gpu));
  ok(gpu.display.fps === 60 && gpu.slowPct > 50 && gpu.saverWouldStart > 0, 'frames that come at 30 fps because the GPU cannot keep up are still caught (no evidence of a capped page)');

  // the island's Auto step-down follows the same rule
  const isl = await page.evaluate(() => { const P = A.Perf, out = {};
    const tryIt = (disp, med) => { P._resetDisplay(); P.autoStep = null; for (let i = 0; i < 40; i++) P.noteFrame(disp); for (let i = 0; i < 90; i++) P.sample(med); const r = P.autoStep; P.autoStep = null; return r; };
    out.capped = tryIt(33.3, 33.4); out.cappedSlow = tryIt(33.3, 50); out.fast = tryIt(16.7, 16.8); out.fastSlow = tryIt(16.7, 25); P._resetDisplay(); return out; });
  ok(isl.capped === null && isl.cappedSlow === 'balanced', 'island Auto quality: a steady 30 fps page stays on High; frames slower than that still step down to Balanced');
  ok(isl.fast === null && isl.fastSlow === 'balanced', 'island Auto quality on a 60 fps page works exactly as before');

  // real visibility change resets the estimate (Low Power Mode may change while the app is away)
  const vis = await page.evaluate(async () => { const P = A.Perf; for (let i = 0; i < 40; i++) P.noteFrame(33.3); const a = P.displayMs(); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; return { a: +a.toFixed(1), b: +P.displayMs().toFixed(1) }; });
  ok(vis.a === 33.3 && vis.b === 16.7, 'returning to the app starts a fresh estimate');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));

  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-perf-fix)');
  await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
