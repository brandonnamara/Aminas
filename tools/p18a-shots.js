// Phase 18A: screenshots of what exists today (Starter Island, the Verdant Wilds as currently reachable, the map, dungeons, tasks). Run: node tools/p18a-shots.js docs/ui/screens18a
const { chromium } = require('playwright'); const serve = require('../tests/server');
(async () => { const srv = await serve(); const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(srv.url); await p.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await p.evaluate(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern'; R.addAmina(s, 'lumifern', 22); s.settings.sfx = s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['hollow', 'tidegate', 'moonshrine', 'hatchery'].forEach((k) => { s.struct[k] = true; Object.assign(s.buildings[k], { level: 1, state: 'built' }); }); A.Data.CAMPAIGN.starter.dungeons.forEach((d) => (s.dungeon[d] = { clears: 1, floors: [true, true, true, true], next: 0 })); s.campaign = { bosses: { starter: 1 } };
    A.World.unlockByBoss(s, 'verdant'); A.State.state = s; R.drain(); A.UI.showIsland(true); });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const tidy = () => p.evaluate(async () => { for (let i = 0; i < 30 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 120)); } A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
  await sleep(2500); await tidy(); await p.screenshot({ path: process.argv[2] + '/now-starter.jpg', type: 'jpeg', quality: 85 });
  await p.evaluate(() => A.UI.travelTo('verdant')); await sleep(3500); await tidy(); await sleep(800); await p.screenshot({ path: process.argv[2] + '/now-verdant.jpg', type: 'jpeg', quality: 85 });
  await p.evaluate(() => A.UI.islandMap()); await sleep(900); await p.screenshot({ path: process.argv[2] + '/now-map.jpg', type: 'jpeg', quality: 85 }); await tidy();
  await p.evaluate(() => A.UI.dungeons()); await sleep(900); await p.screenshot({ path: process.argv[2] + '/now-dungeons.jpg', type: 'jpeg', quality: 85 }); await tidy();
  await p.evaluate(() => A.UI.missions()); await sleep(900); await p.screenshot({ path: process.argv[2] + '/now-tasks.jpg', type: 'jpeg', quality: 85 });
  const info = await p.evaluate(() => { const s = A.State.state, Q = A.Quests; return { isle: s.currentIsland, vis: Q.visible(s).map((q) => q.id + ':' + Q.status(s, q)).filter((x) => /wilds|reach|crown/.test(x)), reach: Q.islandReachable(s, 'obsidian'), dungeonsIsles: A.Data.ISLAND_ORDER.filter((i) => A.Data.CAMPAIGN[i].dungeons.length) }; });
  console.log(JSON.stringify(info), 'errors', errs.length, errs.slice(0, 2)); await b.close(); srv.close(); })();
