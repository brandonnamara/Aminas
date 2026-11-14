// Phase 16A: rendering costs of the new opening, measured in desktop Chromium with software WebGL at 844×390 (NOT an
// iPhone). For each mode: DOM size, how many layers animate at once, frame pacing over the cinematic (requestAnimationFrame
// intervals), the starter screen's live 3D viewer, and the battle coach's own polling cost.
// Run: node tools/o16-measure.js -> docs/ui/screens16a/o16-measure.json
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path');
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const out = { note: 'Desktop Chromium, SwiftShader software WebGL, 844x390, deviceScaleFactor 1. Not an iPhone measurement.', at: new Date().toISOString(), cinematic: {}, starter: {}, coach: {} };
  for (const mode of ['normal', 'saver', 'calm']) {
    const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })).newPage(); page.setDefaultTimeout(120000);
    await page.goto(srv.url + '?p16=1'); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
    out.cinematic[mode] = await page.evaluate(async (mode) => {
      const s = A.State.newGame(); A.Onboard16.begin(s); s.avatar.made = true; s.settings.sfx = false; s.settings.music = false; s.settings.batterySaver = mode === 'saver'; s.settings.reduceMotion = mode === 'calm'; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; if (A.Perf.apply) A.Perf.apply(); document.body.classList.toggle('calm', mode === 'calm'); A.State.save();
      const frames = []; let last = performance.now(), run = true; const loop = (t) => { frames.push(t - last); last = t; if (run) requestAnimationFrame(loop); }; requestAnimationFrame(loop);
      const t0 = performance.now(); A.UI.o16Cinematic(); let peakAnim = 0, nodes = 0;
      while (document.querySelector('.o16-cine') && performance.now() - t0 < 20000) { const c = document.querySelector('.o16-cine'); nodes = Math.max(nodes, c.querySelectorAll('*').length); peakAnim = Math.max(peakAnim, c.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length); await new Promise((r) => setTimeout(r, 100)); }
      run = false; const dur = performance.now() - t0; frames.sort((a, b) => a - b); const p = (q) => +frames[Math.floor(frames.length * q)].toFixed(1);
      const svgBytes = [...document.querySelectorAll('.o16-cine .c-shard-in')].reduce((n, e) => n + e.innerHTML.length, 0);
      return { durationMs: Math.round(dur), frames: frames.length, frameMsMedian: p(0.5), frameMsP95: p(0.95), peakDomNodes: nodes, peakRunningAnimations: peakAnim, shards: mode === 'saver' ? 2 : 4, c3d: A.C3D.stats() };
    }, mode);
    await page.context().close();
  }
  { const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })).newPage(); page.setDefaultTimeout(120000);
    await page.goto(srv.url + '?p16=1'); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
    out.starter = await page.evaluate(async () => { const s = A.State.newGame(); A.Onboard16.begin(s); s.avatar.made = true; s.onboard.cine = 2; s.settings.sfx = false; A.State.save(); A.UI.o16Starters();
      const dom = document.querySelector('.o16-start').querySelectorAll('*').length; document.querySelector('.o16-sc[data-id=lumifern]').click();
      for (let i = 0; i < 100 && !document.querySelector('#o16-art-lumifern.live'); i++) await new Promise((r) => setTimeout(r, 100)); await new Promise((r) => setTimeout(r, 1500));
      const live = !!document.querySelector('#o16-art-lumifern.live'), st = A.C3D.stats(); document.querySelector('.o16-sc[data-id=umbrit]').click(); await new Promise((r) => setTimeout(r, 2500));
      const views = document.querySelectorAll('.o16-art.live').length; return { domNodes: dom, liveViewer: live, liveViewersAfterSwitching: views, drawCalls: st && st.drawCalls, triangles: st && st.triangles, geometries: st && st.geometries }; });
    await page.context().close(); }
  { const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })).newPage(); page.setDefaultTimeout(120000);
    await page.goto(srv.url + '?p16=1'); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
    out.coach = await page.evaluate(async () => { const s = A.State.newGame(), R = A.Rules; A.Onboard16.begin(s); s.avatar.made = true; A.Onboard16.chooseStarter(s, 'lumifern'); R.addAmina(s, 'acinus', 2); s.struct.hollow = true; s.settings.creatures3d = false; A.Perf.autoSaver = false; R.drain(); A.State.save(); A.UI.showIsland(true);
      await new Promise((r) => setTimeout(r, 600)); A.UI.queue.length = 0; A.UI.busy = false; document.querySelectorAll('.dlg,.toast').forEach((x) => x.remove()); R.startRun(s, 'forgottenroad', s.aminas.map((a) => a.uid)); A.UI.startBattle();
      for (let i = 0; i < 100 && (!A.UI.B || A.UI.B.busy); i++) await new Promise((r) => setTimeout(r, 100));
      const c = A.UI.B.o16Coach, N = 400, t0 = performance.now(); for (let i = 0; i < N; i++) c.tick(); const per = (performance.now() - t0) / N;
      return { pollEveryMs: 250, msPerCheck: +per.toFixed(3), shareOfFrameAt30fps: +(per / 33.3 * 100).toFixed(2) + '% of one frame, four times a second' }; });
    await page.context().close(); }
  fs.mkdirSync(path.join(__dirname, '..', 'docs', 'ui', 'screens16a'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'ui', 'screens16a', 'o16-measure.json'), JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 2));
  await browser.close(); srv.close();
})();
