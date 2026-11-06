// Environment Phase 4 real-browser test (Chromium + Playwright, software WebGL; NOT a phone).
// Visual refinement: graded warm light, soft shadows per tier, denser meadow detail per tier, individual tints on
// nature, the moving sea, and that saves, tiers and Battery saver still behave.
// Run: node tests/browser-env4.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js/i.test(m.text())) errors.push(m.text()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland);
  await page.evaluate(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.quality = 'high'; R.addAmina(s, 'lumifern', 8); Object.keys(s.buildings).forEach((id) => { const b = s.buildings[id]; if (b.state === 'ruined' && id !== 'reliquarygate') { b.state = 'built'; b.level = 1; s.struct[id] = true; } }); s.missions = { m_hollow: 'claimed' }; R.drain(); A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world.vox', { timeout: 60000 }); await page.waitForTimeout(1500);
  await page.evaluate(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); A.Perf.autoSaver = false; A.Perf.autoStep = null; A.VoxIsland.redraw(); }); await page.waitForTimeout(800);
  const read = () => page.evaluate(() => ({ st: A.VoxIsland.stats(), b: A.VoxIsland.breakdown() }));
  // a tier switch recompiles shaders and rebuilds the detail on the next drawn frame; software GL can take seconds
  const settle = (tierId) => page.waitForFunction((t) => { const s = A.VoxIsland.stats(); A.VoxIsland.redraw(); return s.tier === t && window.__lastDetail !== undefined && s.detail !== window.__lastDetail; }, tierId, { timeout: 30000, polling: 500 }).catch(() => null);
  const mark = () => page.evaluate(() => { window.__lastDetail = A.VoxIsland.stats().detail; });
  const hi = await read();
  ok(hi.st.grade && hi.st.grade.toneMapping === 'neutral' && hi.st.grade.exposure > 1, 'the island is colour-graded (neutral tone mapping, exposure ' + (hi.st.grade && hi.st.grade.exposure) + ')');
  ok(hi.st.tier === 'high' && hi.st.shadowType === 'vsm' && hi.st.shadowMap === 2048, 'High draws soft (variance) shadows from a 2048 map');
  ok(hi.st.detail > 1500, 'the meadow carries dense detail on High (' + hi.st.detail + ' pieces)');
  ok(hi.st.tinted > 5, 'trees, bushes and rocks carry individual tints (' + hi.st.tinted + ' tinted batches)');
  await mark(); await page.evaluate(() => { A.State.state.settings.quality = 'balanced'; A.UI.renderWorld(true); A.VoxIsland.redraw(); }); await settle('balanced'); await page.waitForTimeout(500);
  const bal = await read();
  ok(bal.st.tier === 'balanced' && bal.st.shadowType === 'pcf' && bal.st.shadowMap === 1024 && bal.st.detail < hi.st.detail && bal.st.detail > hi.st.detail * 0.7, 'Balanced: PCF shadows from a 1024 map, slightly thinner meadow detail than High (' + hi.st.detail + ' → ' + bal.st.detail + ')');
  await mark(); await page.evaluate(() => { A.State.state.settings.batterySaver = true; A.Perf.apply(); A.UI.renderWorld(true); A.VoxIsland.redraw(); }); await settle('saver'); await page.waitForTimeout(500);
  const sv = await read();
  ok(sv.st.tier === 'saver' && sv.st.shadowType === 'pcf' && sv.st.detail < bal.st.detail * 0.75 && sv.st.detail > 0, 'Battery saver thins the meadow detail (' + bal.st.detail + ' → ' + sv.st.detail + ') and keeps cheap shadows');
  const sea = await page.evaluate(() => { const w = document.querySelector('.backdrop .sea-waves .wv'), ss = document.querySelector('.backdrop .sea-sun'); return { waves: document.querySelectorAll('.backdrop .sea-waves .wv').length, sun: !!ss, anim: w ? getComputedStyle(w).animationName : '' }; });
  ok(sea.waves === 3 && sea.sun && sea.anim === 'none', 'the sea has three wave rows and a sun path, held still in Battery saver');
  await mark(); await page.evaluate(() => { A.State.state.settings.batterySaver = false; A.Perf.apply(); A.UI.renderWorld(true); A.VoxIsland.redraw(); }); await settle('balanced'); await page.waitForTimeout(500);
  const back = await read(); const anim = await page.evaluate(() => getComputedStyle(document.querySelector('.backdrop .sea-waves .wv')).animationName);
  ok(back.st.detail === bal.st.detail && back.st.tier === 'balanced' && anim === 'seaWave', 'leaving Battery saver restores the detail and the moving sea');
  ok(hi.b.buildings === bal.b.buildings && bal.b.buildings > 40000, 'architecture keeps full detail on High and Balanced (' + bal.b.buildings + ' triangles)');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED' : 'PASSED') + ': ' + pass + ' passed, ' + fail + ' failed (browser-env4)');
  await browser.close(); srv.close(); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error('ERROR ' + (e && e.message ? e.message.split('\n').slice(0, 6).join('\n') : e)); process.exit(1); });
