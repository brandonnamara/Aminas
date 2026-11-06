// Phase 5 real-browser test (Chromium + Playwright, software WebGL; NOT a phone).
// The Prismatic Fantasy UI: the design system is applied to the shared components, text keeps its contrast, tap
// targets keep their size, the rarity reward card and legendary reveal work, the navigation shows the open screen,
// and decorative motion stops in Battery saver and with Reduce motion.
// Run: node tests/browser-ui5.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
// WCAG contrast ratio of two hex colours
const lum = (h) => { const c = h.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
(async () => {
  // contrast of the system's text/surface pairs (the darkest or lightest point of each surface gradient)
  const pairs = [['primary button', '#3a2208', '#f5ab3e'], ['secondary button', '#fff9f0', '#7058d8'], ['panel text', '#fff9f0', '#3a2c7c'], ['muted text', '#cfc6ee', '#3a2c7c'],
    ['unselected tab', '#cfc6ee', '#2e2470'], ['selected tab', '#0f1d48', '#a9eeff'], ['nav label', '#f4efff', '#5a46b6'], ['gold label', '#ffd978', '#3a2c7c'], ['toggle choice', '#10204a', '#79c8ff']];
  const low = pairs.filter(([, a, b]) => ratio(a, b) < 4.5);
  ok(low.length === 0, 'every text/surface pair meets WCAG AA 4.5:1 (' + pairs.map(([n, a, b]) => n + ' ' + ratio(a, b).toFixed(1)).join(', ') + ')');

  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 667, height: 375 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }); // the smallest supported iPhone in landscape (SE)
  const page = await ctx.newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js/i.test(m.text())) errors.push(m.text()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.UI.itemFound);
  await page.evaluate(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.quality = 'balanced'; R.addAmina(s, 'lumifern', 8); R.addAmina(s, 'kairyu', 6); s.missions = { m_hollow: 'claimed' }; R.drain(); A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world.vox', { timeout: 60000 }); await page.waitForTimeout(1200);
  await page.evaluate(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); A.Perf.autoSaver = false; document.querySelectorAll('.toast,.ach-toast').forEach((t) => t.remove()); });

  const sys = await page.evaluate(() => { const b = document.querySelector('.nav .nbtn'), btn = document.querySelector('.btn') || document.querySelector('.pill'), pill = document.querySelector('.pill'); const cs = (e) => getComputedStyle(e);
    return { sheet: [...document.styleSheets].some((s) => /ui-prism\.css/.test(s.href || '')), facet: /polygon\(6px 0px|polygon\(7px 0px/.test(cs(pill).clipPath), rim: /gradient/.test(cs(pill).backgroundImage), nav: /gradient/.test(cs(b).backgroundImage) }; });
  ok(sys.sheet && sys.facet && sys.rim && sys.nav, 'the design system is loaded and applied to the HUD (faceted corners, spectral rims, glass navigation)');

  // tap targets on the HUD and in a panel, at the smallest landscape iPhone. The real hit area is measured: how far
  // from the centre a tap still lands on the control (up to 20 px each way); controls scrolled out of view are skipped
  const measure = (sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent).map((e) => {
    const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, hit = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t)); };
    if (!hit(cx, cy)) return null; let h = 0, w = 0; for (let d = 1; d <= 20; d++) { if (hit(cx, cy - d) && hit(cx, cy + d)) h = d * 2; if (hit(cx - d, cy) && hit(cx + d, cy)) w = d * 2; }
    return [e.className.split(' ').slice(0, 2).join('.'), Math.min(h, w)]; }).filter(Boolean), sel);
  const hudTaps = await measure('.hud .nbtn, .hud .round, .avatar-btn, .comp .btn, .comp .round');
  await page.evaluate(() => A.UI.settings()); await page.waitForTimeout(500);
  const taps = hudTaps.concat(await measure('.overlay .btn, .overlay .x, .overlay .sw'));
  const small = taps.filter(([, s]) => s < 26);
  ok(taps.length > 8 && small.length === 0, 'tap targets stay comfortable on an iPhone SE in landscape (' + taps.length + ' checked, smallest ' + Math.min(...taps.map((t) => t[1])) + ' px' + (small.length ? '; too small: ' + JSON.stringify(small) : '') + ')');
  const sheetFits = await page.evaluate(() => { const r = document.querySelector('.overlay .sheet').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0 && r.bottom <= innerHeight + 0.5; });
  ok(sheetFits, 'panels fit inside the iPhone SE landscape screen');
  await page.evaluate(() => A.UI.closeAll());

  // navigation shows the open screen
  await page.click('.nav .nbtn[data-act="collection"]').catch(() => {}); await page.waitForTimeout(400);
  const navOn = await page.evaluate(() => { const b = document.querySelector('.nav .nbtn[data-act="collection"]'); return !!(b && b.classList.contains('on')) && !!document.querySelector('.overlay'); });
  await page.evaluate(() => A.UI.closeAll()); await page.waitForTimeout(300);
  const navOff = await page.evaluate(() => !document.querySelector('.nav .nbtn.on'));
  ok(navOn && navOff, 'the navigation button stays lit while its screen is open and clears when it closes');

  // rarity reward cards
  const rw = await page.evaluate(() => { const common = Object.keys(A.Data.ITEMS).find((k) => A.Data.ITEMS[k].rarity === 'common'); const c1 = A.UI.itemFound(common); const r1 = c1.className, sp1 = document.querySelectorAll('.spark, .pxb-wrap i').length; const c2 = A.UI.itemFound('coralaegis'); return { r1, sp1, r2: c2.className, sp2: document.querySelectorAll('.spark, .pxb-wrap i').length, txt: c2.textContent }; });
  ok(/r-common/.test(rw.r1) && rw.sp1 === 0, 'a common find gets a calm card with no burst');
  ok(/r-mythic/.test(rw.r2) && rw.sp2 >= 25 && /Legendary find/.test(rw.txt), 'a unique mythic find gets the spectrum card and the full burst (' + rw.sp2 + ' sparks)');
  await page.waitForTimeout(7000);
  ok(await page.evaluate(() => !document.querySelector('.reward-card')), 'reward cards leave by themselves');
  // the game's own discovery path now uses the card (equipment from a dungeon, not from the Forge)
  await page.evaluate(() => { A.Rules.grantItem(A.State.state, 'coralaegis', 'dungeon:forgottenroad'); }); await page.waitForTimeout(900);
  ok(await page.evaluate(() => !!document.querySelector('.reward-card.r-mythic')), 'a dungeon equipment drop shows the reward card instead of a plain toast');
  await page.evaluate(() => document.querySelectorAll('.reward-card').forEach((c) => c.remove()));

  // legendary reveal
  const rev = await page.evaluate(() => { A.UI.reveal('kairyu', () => {}); const a = document.querySelector('.vcard.reveal'), plain = !a.classList.contains('r-legendary'); A.UI.closeAll(); A.UI.reveal('meta1', () => {}); const cards = document.querySelectorAll('.vcard.reveal'), b = cards[cards.length - 1]; const out = { plain, leg: b.classList.contains('r-legendary'), tag: !!b.querySelector('.rar-tag') }; A.UI.closeAll(); return out; });
  ok(rev.plain && rev.leg && rev.tag, 'a legendary creature’s reveal gets the spectrum card and a Legendary tag; an ordinary one does not');

  // motion budget
  const running = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && /^pz/.test(a.animationName || '')).map((a) => a.animationName));
  await page.evaluate(() => { const u = A.State.state.aminas[0].uid; A.UI.selUid = u; A.UI.selPicked = u; A.UI.selRender(); A.UI.itemFound('coralaegis'); }); await page.waitForTimeout(800);
  const normal = await running();
  await page.evaluate(() => { A.State.state.settings.batterySaver = true; A.Perf.apply(); }); await page.waitForTimeout(200); const saver = await running();
  await page.evaluate(() => { A.State.state.settings.batterySaver = false; A.Perf.apply(); document.body.classList.add('calm'); }); await page.waitForTimeout(200); const calm = await running();
  ok(normal.length > 0 && saver.length === 0 && calm.length === 0, 'decorative UI motion runs normally (' + normal.length + ') and stops completely in Battery saver (' + saver.length + ') and with Reduce motion (' + calm.length + ')');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED' : 'PASSED') + ': ' + pass + ' passed, ' + fail + ' failed (browser-ui5)');
  await browser.close(); srv.close(); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error('ERROR ' + (e && e.message ? e.message.split('\n').slice(0, 6).join('\n') : e)); process.exit(1); });
