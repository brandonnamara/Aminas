// Phase 18D visual comparison (Chromium + SwiftShader; NOT an iPhone). Takes the same island views from whichever
// checkout the server comes from, so the 18C code and the 18D code can be shot identically.
// Run: node tools/p18d-shots.js <repoRoot> <outDir> <prefix>
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..')), OUT = process.argv[3] || '/tmp/shots', PRE = process.argv[4] || 'x';
const { chromium } = require('playwright'); const serve = require(path.join(ROOT, 'tests/server'));
fs.mkdirSync(OUT, { recursive: true }); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// [name, island, tile x, tile y, zoom]
const VIEWS = [['starter', 'starter', null, null, null], ['verdant', 'verdant', null, null, null], ['mossgate', 'verdant', 16, 25, 1.5], ['aqueduct', 'verdant', 24, 9, 1.4],
  ['archive', 'verdant', 15, 3, 1.5], ['shrine', 'verdant', 17, 14, 1.6], ['choir', 'verdant', 28, 14, 1.4], ['elderroot', 'verdant', 22, 21, 1.4], ['moonwell', 'verdant', 5, 20, 1.5]];
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); const ev = (fn, a) => page.evaluate(fn, a);
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; s.settings.quality = 'high'; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['lumifern', 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 30)); s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' };
    // the first three Verdant dungeons cleared, the fourth open: done, open and locked entrances are all on screen
    ['v_mossgate', 'v_aqueduct', 'v_spore'].forEach((id) => { const r = R.dungeonRec(s, id); r.clears = 1; r.next = 0; r.floors = [true, true, true, true]; });
    s.story = s.story || {}; s.story.scenes = Object.assign({}, s.story.scenes, { v_arrival: 'seen' }); A.State.state = s; R.drain(); A.State.save(); A.UI.showIsland(true); });
  await page.waitForSelector('#world'); await sleep(1500);
  for (const [name, isl, x, y, z] of VIEWS) {
    await ev(async (isl) => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('.dlg,.toast,.scene').forEach((e) => e.remove());
      if (A.State.state.currentIsland !== isl) { A.State.state.currentIsland = isl; A.UI.showIsland(true); } }, isl);
    await page.waitForFunction(() => !A.VoxIsland || !A.VoxIsland.on || A.VoxIsland.ready(), null, { timeout: 60000 }).catch(() => {}); await sleep(800);
    await ev(({ x, y, z }) => { A.UI.closeAll(); document.querySelectorAll('.dlg,.toast,.scene').forEach((e) => e.remove()); if (x != null) A.UI.focusFoot(x, y, 1, 1, z); else if (A.UI.resetCam) A.UI.resetCam(); }, { x, y, z });
    await sleep(2200); await page.screenshot({ path: path.join(OUT, PRE + '-' + name + '.jpg'), type: 'jpeg', quality: 84 }); console.log('shot', name);
  }
  await browser.close(); srv.close(); process.exit(0);
})();
