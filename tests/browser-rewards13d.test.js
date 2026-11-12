// Phase 13D real-browser test (Chromium + Playwright; NOT a phone): the 5v5 practice screen says how many rewarded
// wins are left today (the limit shared with Island Defence raids). Run: node tests/browser-rewards13d.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })).newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland);
  const out = await page.evaluate(() => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = false;
    ['lumifern', 'pyrokai', 'kairyu', 'gaiaroki', 'lumifern'].forEach((sp) => R.addAmina(s, sp, 10)); R.drain(); A.UI.showIsland(); A.UI.closeAll();
    const read = () => { A.UI.closeAll(); A.UI.pvp5(); const e = document.querySelector('#modal-root .overlay:last-child'); const t = e.textContent.replace(/\s+/g, ' '); return { left: (e.querySelector('.pv-left') || {}).textContent, text: t }; };
    const a = read(), g0 = s.res.gold; for (let i = 0; i < 2; i++) R.PvP.resolvePractice(s, { over: true, result: 'win' }); const b = read(), g1 = s.res.gold;
    for (let i = 0; i < 4; i++) R.PvP.resolvePractice(s, { over: true, result: 'win' }); const c = read();
    return { a, b, c, paid2: g1 - g0, paidAll: s.res.gold - g0, fits: (() => { const r = document.querySelector('#modal-root .overlay:last-child .sheet').getBoundingClientRect(); return r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; })() }; });
  ok(out.a.left === '5 of 5' && /rewarded wins left today \(shared with Island Defence raids\)/.test(out.a.text), 'the practice screen says “5 of 5 rewarded wins left today (shared with Island Defence raids)”');
  ok(out.b.left === '3 of 5' && out.paid2 === 120, 'after two rewarded wins (60 gold each) it says 3 of 5');
  ok(out.c.left === '0 of 5' && out.paidAll === 300, 'after six wins it says 0 of 5, and only five were paid (300 gold): the limit itself is unchanged');
  ok(out.fits, 'the screen still fits a phone in landscape');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-rewards13d)'); await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
