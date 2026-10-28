// Performance probe (Chromium via Playwright + Chrome DevTools Protocol). NOT a phone: software GPU, desktop CPU.
// Numbers are for before/after comparison of the same scenario on the same machine, not absolute phone figures.
// Usage: node tests/perf.js [out.json]
const { chromium } = require('playwright'); const serve = require('./server'); const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  // count timers / animation frames requested by the page (installed before any game script runs)
  await page.addInitScript(() => {
    const w = window; w.__perf = { raf: 0, intervals: new Set(), timeouts: 0 };
    const rAF = w.requestAnimationFrame.bind(w); w.requestAnimationFrame = (f) => { w.__perf.raf++; return rAF(f); };
    const sI = w.setInterval.bind(w), cI = w.clearInterval.bind(w);
    w.setInterval = (f, ms, ...a) => { const id = sI(f, ms, ...a); w.__perf.intervals.add(id); return id; };
    w.clearInterval = (id) => { w.__perf.intervals.delete(id); return cI(id); };
    const sT = w.setTimeout.bind(w); w.setTimeout = (f, ms, ...a) => { w.__perf.timeouts++; return sT(f, ms, ...a); };
  });
  const metrics = async () => { const m = {}; (await cdp.send('Performance.getMetrics')).metrics.forEach((x) => (m[x.name] = x.value)); return m; };
  // Compositor/raster work: count trace events while a scenario runs.
  async function window_(label, ms, extra) {
    await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'cc', 'gpu'] });
    const m0 = await metrics(), p0 = await page.evaluate(() => ({ raf: window.__perf.raf, to: window.__perf.timeouts }));
    await sleep(ms);
    const m1 = await metrics(), p1 = await page.evaluate(() => ({ raf: window.__perf.raf, to: window.__perf.timeouts, intervals: window.__perf.intervals.size,
      anims: document.getAnimations().filter((a) => a.playState === 'running').length, infinite: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).length,
      nodes: document.getElementsByTagName('*').length, canvases: document.querySelectorAll('canvas').length, c3d: window.A && A.C3D && A.C3D.stats ? A.C3D.stats() : null }));
    const trace = JSON.parse((await browser.stopTracing()).toString());
    const ev = trace.traceEvents || trace; const cnt = (n) => ev.filter((e) => e.name === n).length;
    const sec = ms / 1000, d = (k) => +((m1[k] - m0[k]) / sec * 1000).toFixed(1);
    const out = { label, seconds: sec,
      mainThreadMsPerSec: d('TaskDuration'), scriptMsPerSec: d('ScriptDuration'), styleMsPerSec: d('RecalcStyleDuration'), layoutMsPerSec: d('LayoutDuration'),
      paintsPerSec: +(cnt('Paint') / sec).toFixed(1), rasterTasksPerSec: +(cnt('RasterTask') / sec).toFixed(1), framesDrawnPerSec: +((cnt('DrawFrame') || cnt('Graphics.Pipeline.DrawFrame')) / sec).toFixed(1),
      rafPerSec: +((p1.raf - p0.raf) / sec).toFixed(1), timeoutsPerSec: +((p1.to - p0.to) / sec).toFixed(1), liveIntervals: p1.intervals,
      runningAnimations: p1.anims, infiniteAnimations: p1.infinite, domNodes: p1.nodes, canvases: p1.canvases, heapMB: +(m1.JSHeapUsedSize / 1048576).toFixed(1), c3d: p1.c3d, ...(extra || {}) };
    console.log(JSON.stringify(out)); return out;
  }
  const res = [];
  const t0 = Date.now(); await page.goto(srv.url); await page.waitForSelector('.logo'); const loadMs = Date.now() - t0;
  res.push(await window_('title screen (idle)', 5000, { loadMs }));
  await page.evaluate(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.settings.creatures3d = true; s.settings.music = true;
    ['lumifern', 'kairyu', 'acinus', 'gaiaroki', 'pyrokai', 'zeep', 'voltar'].forEach((x, i) => R.addAmina(s, x, 8 + i));
    ['hollow', 'tidegate', 'hatchery', 'moonshrine', 'reliquarygate'].forEach((id) => { s.struct[id] = true; s.buildings[id].level = 1; s.buildings[id].state = 'built'; });
    s.missions = { m_hollow: 'claimed' }; R.drain(); A.State.save(); A.UI.showIsland(); });
  await sleep(1500); for (let i = 0; i < 10; i++) { const d = await page.$('.dlg-skip'); if (d) { await d.click(); await sleep(400); } else break; }
  await page.evaluate(() => { A.UI.queue.length = 0; A.UI.closeAll(); }); await page.mouse.move(820, 200); await sleep(1000);
  res.push(await window_('island idle (no input)', 10000));
  // creature viewer (detail screen)
  await page.evaluate(() => A.UI.detail('kairyu', { uid: 2 })); await sleep(3000);
  res.push(await window_('creature page with live 3D viewer, idle', 8000));
  await page.evaluate(() => A.UI.closeAll()); await sleep(800);
  // 3D battle idle (waiting for the player's input)
  const heap0 = (await metrics()).JSHeapUsedSize;
  await page.evaluate(() => { const s = A.State.state; A.Rules.startRun(s, 'forgottenroad', [1, 2]); A.UI.closeAll(); A.UI.startBattle(); });
  await page.waitForSelector('.battle.is3d canvas', { timeout: 30000 }).catch(() => null); await sleep(3000);
  res.push(await window_('3D battle, waiting for input', 8000));
  // the same battle in a small window, so this machine's software GPU is not the limit (shows the frame budget itself)
  await page.setViewportSize({ width: 360, height: 180 }); await sleep(2500);
  res.push(await window_('3D battle in a small window, idle (frame budget visible)', 6000));
  await page.evaluate(() => { const v = A.UI.B && A.UI.B.stage; if (v && v.attack) { v.attack('p'); setTimeout(() => v.hit('e', 'water', 'super'), 500); } });
  res.push(await window_('3D battle in a small window, during an attack', 1500));
  await page.setViewportSize({ width: 844, height: 390 }); await sleep(1500);
  // background / resume (simulated: headless Chromium keeps a page "visible", so the page is told it is hidden)
  const hide = (h) => page.evaluate((h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  await hide(true); await sleep(300);
  res.push(await window_('game hidden during a battle (simulated visibilitychange)', 6000, { audio: await page.evaluate(() => (A.Audio && A.Audio.ctxState ? A.Audio.ctxState() : 'n/a')) }));
  await hide(false); await sleep(1500);
  for (let i = 0; i < 5; i++) { await hide(true); await sleep(100); await hide(false); await sleep(100); }
  await sleep(1000);
  res.push(await window_('battle after returning (and 5 more hide/show cycles)', 5000, { audio: await page.evaluate(() => (A.Audio && A.Audio.ctxState ? A.Audio.ctxState() : 'n/a')) }));
  if (false) {
  const bg = await ctx.newPage(); await bg.goto('about:blank'); await bg.bringToFront(); await sleep(500);
  const vis = await page.evaluate(() => document.visibilityState);
  res.push(await window_('game hidden (another tab in front) during a battle', 6000, { visibility: vis, audio: await page.evaluate(() => (A.Audio && A.Audio.ctxState ? A.Audio.ctxState() : 'n/a')) }));
  await page.bringToFront(); await bg.close(); await sleep(1500);
  res.push(await window_('battle after returning', 5000, { visibility: await page.evaluate(() => document.visibilityState) }));
  }
  // repeated battle enter / leave: memory and leaked GPU resources
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => new Promise((r) => { A.UI.leaveBattle ? A.UI.leaveBattle(() => { A.UI.showIsland(); r(); }) : (A.UI.showIsland(), r()); }));
    await sleep(700);
    await page.evaluate(() => { const s = A.State.state; s.run = null; A.Rules.startRun(s, 'forgottenroad', [1, 2]); A.UI.closeAll(); A.UI.startBattle(); });
    await page.waitForSelector('.battle.is3d canvas', { timeout: 30000 }).catch(() => null); await sleep(1200);
  }
  await page.evaluate(() => new Promise((r) => { A.UI.leaveBattle ? A.UI.leaveBattle(() => { A.UI.showIsland(); r(); }) : (A.UI.showIsland(), r()); }));
  await page.evaluate(() => { A.UI.queue.length = 0; A.UI.closeAll(); }); await sleep(1500);
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  res.push(await window_('island after 9 battles (idle)', 6000, { heapGrowthMB: +(((await metrics()).JSHeapUsedSize - heap0) / 1048576).toFixed(1) }));
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(res, null, 1));
  await browser.close(); srv.close();
})();
