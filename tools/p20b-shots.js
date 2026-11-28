// Phase 20B: screenshots of the Celestial Crown (Chromium, software WebGL, 844×390 at DPR 2; NOT an iPhone), through the
// developer construction preview on a save that beat the Forge Heart. Usage: node tools/p20b-shots.js <dir> [names...]
const { chromium } = require('playwright'); const serve = require('../tests/server'); const path = require('path'); const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const OUT = process.argv[2] || '/tmp/look'; fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv.slice(3);
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const want = (n) => !ONLY.length || ONLY.includes(n);
  const shot = async (n) => { if (!want(n)) return; await sleep(900); await page.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 86 }); console.log('shot', n); };
  const tidy = () => ev(async () => { for (let i = 0; i < 40 && (document.querySelector('.dlg') || document.querySelector('#sc-skip')); i++) { const d = document.querySelector('.dlg .dlg-skip') || document.querySelector('#sc-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 150)); } A.UI.closeAll(); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => {
    const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['hollow', 'tidegate', 'moonshrine', 'hatchery'].forEach((k) => { s.struct[k] = true; Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
    ['lumifern', 'aimza3', 'zeep3'].forEach((sp, i) => R.addAmina(s, sp, 50 + i));
    ['verdant', 'obsidian'].forEach((k) => { s.islands[k] = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' }; });
    s.campaign = s.campaign || {}; s.campaign.bosses = Object.assign({}, s.campaign.bosses, { verdant: true, obsidian: true });
    s.story = s.story || {}; s.story.scenes = Object.assign({}, s.story.scenes, { o_arrival: 1, v_arrival: 1 }); s.notified = s.notified || {}; s.rank = 12;
    s.res.gold = 200000; s.res.food = 9000; s.res.gems = 200; s.currentIsland = 'obsidian'; A.State.state = s; R.drain(); A.State.save(); A.UI.showIsland(true);
  });
  await sleep(1500); await tidy();
  await ev(() => { A.Rules.C20.preview(A.State.state); A.UI.travelTo('celestial'); }); await sleep(2500); await tidy();
  await page.waitForFunction(() => A.VoxIsland.ready() && A.State.state.currentIsland === 'celestial', null, { timeout: 120000 }).catch(() => console.log('vox not ready'));
  await sleep(1500); await tidy();
  const F = async (n, x, y, w, h, z) => { if (!want(n)) return; await ev(([x, y, w, h, z]) => A.UI.focusFoot(x, y, w, h, z), [x, y, w, h, z]); await sleep(1200); await shot(n); };
  await F('c-3d-whole', 16, 16, 2, 2, 0.5);
  await F('c-3d-observatory', 15, 15, 4, 4, 1.5);
  await F('c-3d-south', 14, 28, 3, 4, 1.1);
  await F('c-3d-west', 4, 16, 5, 8, 1.0);
  await F('c-3d-north', 17, 6, 5, 6, 1.0);
  await F('c-3d-east', 26, 13, 4, 5, 1.0);
  await F('c-3d-obstacles', 10, 10, 6, 6, 1.3);
  // the six obstacle types, close up (the first of each type on the map)
  for (const t of ['floatstone', 'starshard', 'moonbloom', 'pillar', 'cloudpuff', 'geode']) { const o = await ev((ty) => A.Data.OBSTACLES.celestial.find((x) => x.type === ty), t); const w = t === 'floatstone' || t === 'geode' ? 2 : 1; await F('obstacle-' + t, o.x, o.y, w, w, 2.2); }
  await F('c-3d-lensmount', 17, 17, 2, 2, 2.0);
  // entrance looks: dark (locked), lit (its turn), cleared: a stand-in Dungeon 1 record, in this throwaway browser profile only
  if (want('gate-looks')) { await ev(() => { A.Data.DUNGEONS.c_cloudstair = { playable: true, island: 'celestial', battles: [], sections: [] }; A.State.state.dungeon.c_cloudstair = { clears: 1 }; A.UI.showIsland(); }); await sleep(2500); await F('gate-looks', 14, 27, 2, 4, 1.5); await ev(() => { delete A.Data.DUNGEONS.c_cloudstair; delete A.State.state.dungeon.c_cloudstair; A.UI.showIsland(); }); await sleep(2000); }
  if (want('c-2d')) { await ev(() => { A.State.state.settings.voxIsland = false; A.UI.showIsland(true); }); await sleep(1500); await ev(() => A.UI.focusFoot(16, 16, 2, 2, 0.5)); await sleep(800); await shot('c-2d'); await ev(() => { A.State.state.settings.voxIsland = true; A.UI.showIsland(true); }); await sleep(2500); }
  console.log('errors', errors);
  await browser.close(); srv.close();
})();
