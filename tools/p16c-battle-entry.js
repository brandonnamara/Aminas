// usage: node tools/p16c-battle-entry.js <repoDir> normal|slow
// battle entry: longest task and total blocking during the first 4 s after the battle opens. argv: repoDir normal|slow
const dir = process.argv[2]; const { chromium } = require('playwright'); const serve = require(dir + '/tests/server'); const cond = process.argv[3];
(async () => { const srv = await serve(); const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const page = await ctx.newPage(); page.setDefaultTimeout(180000); const cdp = await ctx.newCDPSession(page);
 await page.addInitScript(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true }); });
 await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
 if (cond === 'slow') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
 await page.evaluate(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'R', look: null }; s.starter = 'lumifern'; ['lumifern', 'acinus', 'emberix', 'cannonis'].forEach((sp, i) => R.addAmina(s, sp, 10 - i)); s.settings.sfx = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; R.drain(); A.State.save(); A.UI.showIsland(true); });
 await page.waitForFunction(() => A.VoxIsland.stats() && A.VoxIsland.stats().frames >= 2); await page.waitForTimeout(4000);
 const r = await page.evaluate(async () => { const s = A.State.state; A.Rules.startRun(s, 'forgottenroad', s.aminas.slice(0, 3).map((a) => a.uid)); __lt.length = 0; const t0 = performance.now(); A.UI.startBattle();
   while (!(A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d && A.C3D.stats() && A.C3D.stats().drawn >= 1) && performance.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 20));
   const first = performance.now() - t0; await new Promise((r) => setTimeout(r, 4000)); const lt = __lt.filter(([st]) => st >= t0 - 1);
   return { firstMs: Math.round(first), maxTask: Math.round(Math.max(0, ...lt.map((x) => x[1]))), blockingMs: Math.round(lt.reduce((a, [, d]) => a + Math.max(0, d - 50), 0)) }; });
 console.log(JSON.stringify(r)); await b.close(); srv.close(); })();
