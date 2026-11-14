// Phase 16A review screenshots (desktop Chromium, software WebGL, 844×390 at 2×; NOT a phone): the character-creation
// and starter-selection before/after, and the guided Starter Island walkthrough, step by step.
// Run: node tools/o16-shots.js -> docs/ui/screens16a/*.jpg
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'docs', 'ui', 'screens16a'); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const fresh = async (q) => { const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage(); page.setDefaultTimeout(120000);
    await page.goto(srv.url + (q || '')); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title'); await page.evaluate(() => { A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; }); return page; };
  const shot = (page, n) => page.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 85 });
  const skipTalk = (page) => page.evaluate(async () => { for (let i = 0; i < 40 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 120)); } A.UI.queue.length = 0; A.UI.busy = false; document.querySelectorAll('.toast').forEach((t) => t.remove()); });
  // before (switch off)
  let page = await fresh(''); await page.click('[data-act=newgame]'); await page.waitForSelector('.avc.first'); await sleep(400); await shot(page, 'before-avatar');
  await page.click('#avc-ok'); await page.waitForSelector('.intro'); await sleep(300); await shot(page, 'before-intro-card');
  await page.click('[data-act=introSkip]'); await page.waitForSelector('.dlg'); await sleep(1500); await shot(page, 'before-dialogue');
  await skipTalk(page); await page.waitForSelector('[data-act=pickStarter]'); await sleep(500); await shot(page, 'before-starter');
  await page.click('[data-act=pickStarter][data-id=lumifern]'); await sleep(400); await shot(page, 'before-starter-picked'); await page.context().close();
  // after (switch on)
  page = await fresh('?p16=1'); await shot(page, 'after-title');
  await page.click('[data-act=newgame]'); await page.waitForSelector('.avc.o16'); await sleep(400); await shot(page, 'after-avatar');
  await page.fill('#avc-name', 'Rowan'); await page.click('#avc-ok'); await page.waitForSelector('.o16-cine'); await page.click('.o16-cine .c-skip');
  await page.waitForSelector('.o16-start'); await sleep(600); await shot(page, 'after-starter');
  await page.click('.o16-sc[data-id=lumifern]'); await sleep(2500); await shot(page, 'after-starter-picked');
  await page.click('#o16-go'); await page.waitForSelector('#o16-yes'); await sleep(300); await shot(page, 'after-starter-confirm');
  await page.click('#o16-yes'); await page.waitForSelector('.dlg.o16'); await sleep(2400); await shot(page, 'walk-01-chosen');
  await skipTalk(page); await sleep(800); await shot(page, 'walk-02-prologue-3');
  await page.click('.mission-pill'); await sleep(1500); await shot(page, 'walk-03-inspect'); await page.evaluate(() => A.UI.closeAll()); await sleep(600); await shot(page, 'walk-04-inspect-aside');
  await skipTalk(page); await page.click('.mission-pill'); await sleep(1500); await shot(page, 'walk-05-hollow-go');
  await page.evaluate(() => { A.UI.closeAll(); const s = A.State.state; A.Rules.restore(s, 'hollow'); A.UI.afterAction(); }); await sleep(1200); await shot(page, 'walk-06-first-restore');
  await skipTalk(page); await page.evaluate(() => { A.Quests.claim(A.State.state, 'm_hollow'); A.UI.afterAction(); }); await sleep(900); await skipTalk(page); await shot(page, 'walk-07-feed');
  await page.evaluate(() => { const s = A.State.state; s.res.food = 400; A.Rules.feed(s, s.aminas[0].uid, 'snack'); A.UI.afterAction(); A.Quests.claim(s, 'm_feed'); A.UI.afterAction(); }); await sleep(900); await skipTalk(page); await shot(page, 'walk-08-level3');
  await page.evaluate(() => { const s = A.State.state; for (let i = 0; i < 60 && s.aminas[0].lv < 3; i++) A.Rules.feed(s, s.aminas[0].uid, 'snack'); A.UI.afterAction(); A.Quests.claim(s, 'm_lv3'); A.UI.afterAction(); }); await sleep(900); await skipTalk(page); await page.evaluate(() => A.UI.closeAll()); await shot(page, 'walk-09-friend');
  await page.evaluate(() => { const s = A.State.state; A.Rules.addAmina(s, 'acinus', 2); A.UI.afterAction(); A.Quests.claim(s, 'm_find'); A.UI.afterAction(); }); await sleep(900); await page.evaluate(() => A.UI.closeAll()); await skipTalk(page); await page.evaluate(() => A.UI.closeAll()); await sleep(400); await shot(page, 'walk-10-battle-menu-step');
  await page.click('.mission-pill'); await sleep(700); await shot(page, 'walk-11-battle-highlight');
  await page.click('[data-act=battle]'); await sleep(1200); await shot(page, 'walk-12-battle-hub');
  await page.evaluate(() => { A.UI.closeAll(); A.UI.dungeons(null, 'forgottenroad'); }); await page.waitForSelector('.dlg.o16'); await sleep(2500); await shot(page, 'walk-13-dungeon-intro');
  await skipTalk(page); await sleep(500); await shot(page, 'walk-14-dungeon-list'); await page.context().close();
  await browser.close(); srv.close(); console.log('done');
})();
