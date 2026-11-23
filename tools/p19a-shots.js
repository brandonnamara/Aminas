// Phase 19A: screenshots of Obsidian Reach AS IT EXISTS TODAY (Chromium, 844×390 @2x; NOT an iPhone). The island is
// not reachable in the game (D.ISLAND_LIVE.obsidian is false); for these pictures only, the page is told it is ready and
// a test save is placed there. Nothing is written to the game's files. Also the environment library's Obsidian vignette.
// Run: node tools/p19a-shots.js <outDir>
const { chromium } = require('playwright'); const serve = require('../tests/server'); const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || '/tmp/shots19a'; fs.mkdirSync(OUT, { recursive: true }); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); const ev = (fn, a) => page.evaluate(fn, a); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  const setup = (vox) => ev((vox) => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; s.settings.quality = 'high'; s.settings.voxIsland = vox; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    A.Data.ISLAND_LIVE.obsidian = true; R.addAmina(s, 'lumifern', 40);
    ['verdant', 'obsidian'].forEach((i) => { s.islands[i] = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' }; });
    s.story = s.story || {}; s.story.scenes = Object.assign({}, s.story.scenes, { v_arrival: 'seen' }); s.currentIsland = 'obsidian'; A.State.state = s; R.drain(); A.UI.showIsland(true); }, vox);
  const clean = () => ev(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('.dlg,.toast,.scene').forEach((e) => e.remove()); });
  for (const vox of [true, false]) {
    await setup(vox); await page.waitForSelector('#world'); await page.waitForFunction(() => !A.VoxIsland || !A.VoxIsland.on || A.VoxIsland.ready(), null, { timeout: 60000 }).catch(() => {});
    await sleep(2500); await clean(); await ev(() => { if (A.UI.resetCam) A.UI.resetCam(); }); await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'obsidian-today-' + (vox ? '3d' : '2d') + '.jpg'), type: 'jpeg', quality: 84 });
    await ev(() => A.UI.focusFoot && A.UI.focusFoot(22, 7, 3, 3, 1.5)); await sleep(2000); await clean();
    await page.screenshot({ path: path.join(OUT, 'obsidian-today-forge-' + (vox ? '3d' : '2d') + '.jpg'), type: 'jpeg', quality: 84 });
  }
  // the environment library's "Obsidian Forge" vignette (a design demo from the environment phases, not a game asset)
  await page.goto(srv.url.replace(/\/?$/, '/') + 'tools/library.html?id=v_obsidian&plate=1&bg=%231c0f28'); await sleep(6000);
  await page.screenshot({ path: path.join(OUT, 'library-obsidian-vignette.jpg'), type: 'jpeg', quality: 84 });
  console.log('errors', errors.length, errors.slice(0, 3)); await browser.close(); srv.close(); process.exit(0);
})();
