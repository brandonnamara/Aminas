// Phase 19B: Obsidian Reach screenshots (Chromium + SwiftShader at 844×390 @2x; NOT an iPhone). Opens the island through
// the developer construction preview (R.O19.preview), as a tester would, then takes the same views in 3D and in the 2D
// fallback. Run: node tools/p19b-shots.js <outDir> [prefix]
const { chromium } = require('playwright'); const serve = require('../tests/server'); const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || '/tmp/shots19b', PRE = process.argv[3] || 'o'; fs.mkdirSync(OUT, { recursive: true }); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEWS = [['whole', null], ['glasswick', [11, 17, 5, 2, 1.5]], ['forge', [22, 7, 3, 3, 1.4]], ['gallery', [15, 13, 4, 2, 1.6]], ['bellows', [22, 19, 4, 3, 1.5]], ['landing', [14, 24, 4, 4, 1.4]], ['rookery', [6, 8, 4, 3, 1.6]], ['obstacles', [3, 18, 6, 5, 1.5]]];
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); const ev = (fn, a) => page.evaluate(fn, a); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const boot = async (vox) => {
    await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
    await ev((vox) => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
      s.settings.sfx = false; s.settings.music = false; s.settings.quality = 'high'; s.settings.voxIsland = vox; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
      R.addAmina(s, 'lumifern', 40); s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' };
      s.story = s.story || {}; s.story.scenes = Object.assign({}, s.story.scenes, { v_arrival: 'seen' }); s.o19.cap = 40;
      A.State.state = s; R.drain(); R.O19.preview(s); s.currentIsland = 'obsidian'; A.State.save(); A.UI.showIsland(true); }, vox);
    await page.waitForSelector('#world'); await page.waitForFunction(() => !A.VoxIsland || !A.VoxIsland.on || A.VoxIsland.ready(), null, { timeout: 60000 }).catch(() => {}); await sleep(2500);
  };
  const clean = () => ev(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('.dlg,.toast,.scene').forEach((e) => e.remove()); });
  for (const vox of [true, false]) {
    await boot(vox);
    for (const [name, f] of VIEWS) {
      if (!vox && ['rookery', 'obstacles', 'landing'].includes(name)) continue;
      await clean(); await ev((f) => { if (f) A.UI.focusFoot(f[0], f[1], f[2], f[3], f[4]); else if (A.UI.resetCam) A.UI.resetCam(); }, f); await sleep(2200); await clean();
      await page.screenshot({ path: path.join(OUT, PRE + '-' + (vox ? '3d' : '2d') + '-' + name + '.jpg'), type: 'jpeg', quality: 84 });
    }
  }
  // a place sheet and an entrance sheet (3D)
  await boot(true); await clean(); await ev(() => A.UI.o19Open('glasswick')); await sleep(700); await page.screenshot({ path: path.join(OUT, PRE + '-sheet-glasswick.jpg'), type: 'jpeg', quality: 84 });
  await clean(); await ev(() => A.UI.o19Open('o_cinder')); await sleep(700); await page.screenshot({ path: path.join(OUT, PRE + '-sheet-gate.jpg'), type: 'jpeg', quality: 84 });
  console.log('errors', errors.length, errors.slice(0, 3)); await browser.close(); srv.close(); process.exit(0);
})();
