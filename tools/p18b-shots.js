// Phase 18B screenshots: the Verdant Wilds overview (3D and 2D), each landmark close up, the ten entrances, the
// Explore screen and the Island Map. Chromium + software WebGL at 844×390 (NOT an iPhone).
// Run: node tools/p18b-shots.js [outDir]
const { chromium } = require('playwright'); const serve = require('../tests/server'); const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(__dirname, '../docs/ui/screens18b'); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, a) => page.evaluate(fn, a);
  const tidy = () => ev(async () => { for (let i = 0; i < 30 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 150)); } A.UI.closeAll(); A.UI.clearGuide && A.UI.clearGuide(); document.querySelectorAll('#toast-root > *, .qtrack, #quest-track').forEach((t) => t.remove()); });
  const shot = async (n, hideHud) => { await sleep(1200); if (hideHud) await ev(() => document.body.classList.add('p18shot')); await page.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 86 }); if (hideHud) await ev(() => document.body.classList.remove('p18shot')); };
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await page.addStyleTag({ content: 'body.p18shot #hud, body.p18shot .hud, body.p18shot #guide-root, body.p18shot .qtrack, body.p18shot #toast-root, body.p18shot .navbar, body.p18shot .compbox, body.p18shot #nav, body.p18shot .topbar { visibility: hidden !important; }' });
  await ev(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern'; s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {};
    R.addAmina(s, 'lumifern', 30); R.addAmina(s, 'kairyu', 24); R.addAmina(s, 'acinus', 22); s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' }; s.currentIsland = 'verdant'; A.State.state = s; R.drain(); A.State.save(); A.UI.showIsland(true); });
  await sleep(1500); await tidy(); await page.waitForFunction(() => A.VoxIsland.ready(), null, { timeout: 60000 }).catch(() => {});
  await shot('verdant-overview', true);
  const focus = async (x, y, w, h, z) => { await ev((a) => A.UI.focusFoot(a[0], a[1], a[2], a[3], a[4]), [x, y, w, h, z]); await sleep(1800); };
  const close = [['lm-landing-settlement', 12, 27, 8, 2, 1.25], ['lm-aqueduct', 21, 8, 4, 4, 1.05], ['lm-archive', 14, 3, 4, 1, 1.3], ['lm-twinshrine', 17, 13, 1, 3, 1.4], ['lm-choir', 28, 12, 2, 3, 1.35], ['lm-elderroot', 21, 19, 3, 3, 0.95]];
  for (const [n, x, y, w, h, z] of close) { await focus(x, y, w, h, z); await shot(n, true); }
  const gates = await ev(() => A.Data.V18.gates.map((g) => [g.id, g.x, g.y]));
  for (const [id, x, y] of gates) { await focus(x, y, 1, 1, 1.5); await shot('gate-' + id, true); }
  // 2D fallback overview
  await ev(async () => { A.State.state.settings.voxIsland = false; A.UI.showIsland(); await new Promise((r) => setTimeout(r, 900)); });
  await focus(16, 16, 1, 1, 0.5); await shot('verdant-overview-2d', true);
  await focus(16, 27, 1, 1, 1.2); await shot('lm-2d-settlement', true);
  await ev(async () => { A.State.state.settings.voxIsland = true; A.UI.showIsland(); }); await sleep(1500); await tidy();
  // Explore screen (Verdant areas listed, locked) and the Island Map
  await ev(() => { A.UI.exArea = 'glowcap'; A.UI.explore(); }); await shot('explore-verdant'); await tidy();
  await ev(() => A.UI.islandMap()); await shot('island-map'); await tidy();
  await ev(() => A.UI.v18Open('elderroot')); await shot('sheet-elderroot'); await tidy();
  await ev(() => A.UI.v18Open('choir')); await shot('sheet-choir'); await tidy();
  await ev(() => A.UI.v18Open('settle')); await shot('sheet-settlement'); await tidy();
  await ev(() => A.UI.v18Open('v_moonwell')); await shot('sheet-moonwell'); await tidy();
  console.log('errors', errors.length, errors.slice(0, 3)); await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
