// usage: node tools/p16c-context-restore.js <repoDir> <label>  (writes before/after screenshots to the temp folder)
// island: lose and restore the WebGL context, then count frames drawn in the 4 s after the restore
const { chromium } = require('playwright'); const serve = require(process.argv[2] + '/tests/server');
(async () => { const srv = await serve(); const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 const page = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage(); page.setDefaultTimeout(120000);
 await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
 await page.evaluate(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'R', look: null }; s.starter = 'lumifern'; ['lumifern', 'acinus'].forEach((sp, i) => R.addAmina(s, sp, 10 - i)); s.settings.sfx = false; R.drain(); A.State.save(); A.UI.showIsland(true); });
 await page.waitForFunction(() => A.VoxIsland.stats() && A.VoxIsland.stats().frames >= 2); await page.waitForTimeout(3000);
 const shot = async () => (await page.screenshot({ clip: { x: 0, y: 60, width: 844, height: 300 } }));
 await page.evaluate(() => { A.Perf.reportSlow = () => {}; }); const a = await shot();
 const r = await page.evaluate(async () => { const c = document.querySelector('canvas.vox3d'), gl = c.getContext('webgl2') || c.getContext('webgl'), x = gl.getExtension('WEBGL_lose_context'); x.loseContext(); await new Promise((r) => setTimeout(r, 500)); const f0 = A.VoxIsland.stats().frames; x.restoreContext(); await new Promise((r) => setTimeout(r, 4000)); const s = A.VoxIsland.stats(); return { framesAfterRestore: s.frames - f0, calls: s.calls }; });

 await page.waitForTimeout(1500); const bimg = await shot(); const PNG = (x) => x; require('fs').writeFileSync(require('os').tmpdir() + '/ctx-' + process.argv[3] + '-a.png', a); require('fs').writeFileSync(require('os').tmpdir() + '/ctx-' + process.argv[3] + '-b.png', bimg);
 console.log(JSON.stringify(r)); await b.close(); srv.close(); })();
