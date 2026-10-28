const { chromium } = require('playwright'); const serve = require('./server');
(async () => { const srv = await serve(); const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push('pageerror ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
  await p.goto(srv.url); await p.waitForSelector('.logo');
  await p.evaluate(() => { const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; A.Rules.addAmina(s, 'lumifern', 6); A.Rules.drain(); A.State.save(); A.UI.showIsland(); });
  await p.waitForTimeout(1500); await p.evaluate(() => { document.querySelectorAll('.dlg-skip').forEach((x) => x.click()); }); await p.waitForTimeout(500);
  await p.screenshot({ path: process.argv[2] || '/tmp/smoke.png' });
  console.log(JSON.stringify(errs.slice(0, 20), null, 1)); await b.close(); srv.close(); })();
