// Dev 7 real-browser test (Chromium via Playwright; NOT iOS Safari, NOT a real phone).
// Forge: on the island, restore, open/close, the four tabs in order, crafting / equipping / merging / buying through
// the interface (including a double tap on Confirm), persistence across a reload. Performance and lifecycle: one 3D
// loop after repeated hide/show, no work while hidden, ambient pause, no timer build-up across screen changes.
// Run: node tests/browser-dev7.test.js [screenshotDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'), fs = require('fs');
const SHOTS = process.argv[2] || path.join(__dirname, 'shots-dev7'); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    const w = window; w.__perf = { raf: 0, intervals: new Set() };
    const rAF = w.requestAnimationFrame.bind(w); w.requestAnimationFrame = (f) => { w.__perf.raf++; return rAF(f); };
    const sI = w.setInterval.bind(w), cI = w.clearInterval.bind(w);
    w.setInterval = (f, ms, ...a) => { const id = sI(f, ms, ...a); w.__perf.intervals.add(id); return id; };
    w.clearInterval = (id) => { w.__perf.intervals.delete(id); return cI(id); };
  });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|ServiceWorker/i.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const skipDlg = async () => { for (let i = 0; i < 12; i++) { const d = await page.$('.dlg-skip'); if (d) { await d.click(); await sleep(450); } else break; } };
  const calm = async () => { await skipDlg(); await ev(() => { A.UI.queue.length = 0; A.UI.closeAll(); document.querySelectorAll('#toast-root .toast').forEach((t) => t.remove()); }); };
  await page.goto(srv.url); await page.waitForSelector('.logo');
  await ev(() => {
    const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.settings.creatures3d = false;
    s.res = { gold: 2000, food: 300, gems: 20 };
    ['lumifern', 'kairyu', 'gaiaroki'].forEach((x, i) => R.addAmina(s, x, 8 + i));
    ['hollow', 'tidegate', 'hatchery'].forEach((id) => { s.struct[id] = true; s.buildings[id].level = 1; s.buildings[id].state = 'built'; });
    s.missions = { m_hollow: 'claimed' }; R.drain(); A.State.save(); A.UI.showIsland();
  });
  await sleep(900); await calm(); await page.mouse.move(820, 200);

  /* ---------- the Forge in the world ---------- */
  ok(!!(await page.$('#world [data-bid=forge]')), 'the Old Forge is on the island');
  await shot('01-island-forge-ruin');
  await ev(() => A.UI.buildingPanel('forge')); await page.waitForSelector('[data-act=restore][data-id=forge]');
  ok(/Old Forge/.test(await page.textContent('.overlay .sh-head')), 'tapping it opens its building panel with its name');
  await page.click('[data-act=restore][data-id=forge]'); await sleep(500); await calm();
  ok(await ev(() => A.Rules.Forge.level(A.State.state) === 1), 'it is restored through the normal building system');
  await ev(() => A.UI.buildingPanel('forge')); await page.waitForSelector('[data-act=forge]');
  await shot('02-forge-panel'); await page.click('[data-act=forge]'); await page.waitForSelector('.sheet.forge');
  const tabs = await page.$$eval('.ftab', (els) => els.map((e) => e.textContent.trim()));
  ok(JSON.stringify(tabs) === JSON.stringify(['Crafting', 'Equipment', 'Equipment Merge', 'Equipment Shop']), 'the Forge opens with exactly four tabs, in order: ' + tabs.join(' | '));
  await shot('03-crafting');

  /* ---------- crafting, with a double tap on Confirm ---------- */
  const r0 = await ev(() => Object.assign({}, A.State.state.res));
  await page.click('[data-act=fCraft][data-id=driftclub]'); await page.waitForSelector('[data-act=fConfirm]');
  await shot('04-craft-confirm');
  await page.$eval('[data-act=fConfirm]', (b) => { b.click(); b.click(); b.click(); }); await sleep(400);
  const c1 = await ev(() => ({ n: A.State.state.items.filter((x) => x.id === 'driftclub').length, gold: A.State.state.res.gold }));
  ok(c1.n === 1 && c1.gold === r0.gold - 120, 'Confirm pressed three times crafts one Driftwood Club and charges 120 gold once');
  await page.click('[data-act=fCraft][data-id=driftclub]'); await page.click('[data-act=fConfirm]'); await sleep(300);
  ok((await ev(() => A.State.state.items.filter((x) => x.id === 'driftclub').length)) === 2, 'a second craft makes a second club');
  ok(await page.$eval('[data-act=fCraft][data-id=barkaxe], .fitem.locked', (e) => !!e) , 'higher recipes show as locked behind Forge level');

  /* ---------- equipment ---------- */
  await page.click('.ftab[data-tab=equip]'); await page.waitForSelector('.fmons');
  await page.click('.fmon[data-uid="2"]'); await sleep(150);
  const atk0 = await ev(() => A.Rules.statsWithGear(A.State.state, A.Rules.inst(A.State.state, 2)).atk);
  await page.click('[data-act=fEquip]'); await sleep(200); await page.click('[data-act=gxConfirm]'); await sleep(300); // Phase 13C: equipping shows a preview first
  const eq = await ev(() => { const s = A.State.state, k = A.Rules.inst(s, 2); return { w: k.gear.weapon && A.Rules.item(s, k.gear.weapon).id, atk: A.Rules.statsWithGear(s, k).atk, fighter: A.Rules.partyFighter(s, k).atk }; });
  ok(eq.w === 'driftclub' && eq.atk > atk0 && eq.fighter === eq.atk, 'Equipment tab: equipping raises Kairyu’s battle attack (' + atk0 + ' → ' + eq.atk + ')');
  ok(/Equipped/.test(await page.textContent('.fpanel')), 'the equipped item is marked as equipped');
  await shot('05-equipment');

  /* ---------- merge (one input equipped) ---------- */
  await page.click('.ftab[data-tab=merge]'); await page.waitForSelector('.mslot');
  await page.click('.mslot[data-k=a]'); await page.waitForSelector('[data-act=fPickSet]'); await page.click('[data-act=fPickSet]'); await sleep(200);
  await page.click('.mslot[data-k=b]'); await page.waitForSelector('[data-act=fPickSet]'); await page.click('[data-act=fPickSet]'); await sleep(200);
  ok(/Ironbound Club/.test(await page.textContent('.mres')), 'the merge preview shows the result (Ironbound Club, Tier II) before confirming');
  ok(/Equipped on Kairyu/.test(await page.textContent('.mact')), 'it warns that one input is equipped and where the result goes');
  await shot('06-merge-preview');
  await page.click('[data-act=fMerge]'); await page.waitForSelector('[data-act=fConfirm]'); await shot('07-merge-confirm');
  await page.$eval('[data-act=fConfirm]', (b) => { b.click(); b.click(); }); await sleep(400);
  const mg = await ev(() => { const s = A.State.state, k = A.Rules.inst(s, 2); return { clubs: s.items.filter((x) => x.id === 'driftclub').length, iron: s.items.filter((x) => x.id === 'ironclub').length, worn: k.gear.weapon && A.Rules.item(s, k.gear.weapon).id }; });
  ok(mg.clubs === 0 && mg.iron === 1 && mg.worn === 'ironclub', 'merging (Confirm pressed twice) uses both clubs once and puts the Ironbound Club on Kairyu');

  /* ---------- shop ---------- */
  await page.click('.ftab[data-tab=shop]'); await page.waitForSelector('[data-act=fBuy]');
  const g1 = await ev(() => A.State.state.res.gold);
  await page.click('[data-act=fBuy][data-id=suncharm]'); await page.waitForSelector('[data-act=fConfirm]'); await page.click('[data-act=fConfirm]'); await sleep(300);
  ok((await ev(() => A.State.state.res.gold)) === g1 - 200 && (await ev(() => A.State.state.items.some((x) => x.id === 'suncharm'))), 'buying a Sun Charm charges 200 gold and adds it');
  await ev(() => { A.State.state.res.gold = 10; A.UI.forge('shop', document.querySelector('.overlay:last-child')); }); await sleep(150);
  ok(await page.$eval('[data-act=fBuy][data-id=driftclub]', (b) => b.classList.contains('off')), 'with too little gold the Buy buttons are disabled');
  const n0 = await ev(() => A.State.state.items.length); await page.$eval('[data-act=fBuy][data-id=driftclub]', (b) => b.click()); await sleep(300);
  ok((await ev(() => A.State.state.items.length)) === n0 && !(await page.$('[data-act=fConfirm]')), 'and pressing one changes nothing');
  await shot('08-shop');
  await page.click('.overlay:last-child [data-act=close]'); await sleep(300);
  ok(!(await page.$('.sheet.forge')), 'the Forge closes');

  /* ---------- persistence across a reload ---------- */
  await ev(() => A.State.save()); await page.reload(); await page.waitForSelector('.logo');
  const back = await ev(() => { A.State.load(); const s = A.State.state, k = A.Rules.inst(s, 2); return { items: s.items.map((x) => x.id).sort().join(','), worn: k.gear.weapon && A.Rules.item(s, k.gear.weapon).id, forge: A.Rules.Forge.level(s), gold: s.res.gold }; });
  ok(back.items === 'ironclub,suncharm' && back.worn === 'ironclub' && back.forge === 1 && back.gold === 10, 'after a reload: items, equipment, the Forge and gold are as left (' + back.items + ')');

  /* ---------- performance & lifecycle ---------- */
  await ev(() => A.UI.showIsland()); await sleep(800); await calm(); await page.mouse.move(820, 200);
  const iv0 = await ev(() => window.__perf.intervals.size);
  for (let i = 0; i < 6; i++) { await ev(() => A.UI.showTitle()); await sleep(150); await ev(() => A.UI.showIsland()); await sleep(250); }
  await calm(); const iv1 = await ev(() => window.__perf.intervals.size);
  ok(iv1 <= iv0, 'no timers pile up across 6 screen changes (' + iv0 + ' → ' + iv1 + ' live intervals)');
  const hide = (h) => ev((h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  await hide(true); await sleep(300);
  const hid = await ev(() => ({ cls: document.body.classList.contains('perf-hidden'), running: document.getAnimations().filter((a) => a.playState === 'running').length }));
  ok(hid.cls && hid.running === 0, 'hidden: every island animation is paused (' + hid.running + ' running)');
  await hide(false); await sleep(300);
  ok(await ev(() => !document.body.classList.contains('perf-hidden') && document.getAnimations().some((a) => a.playState === 'running')), 'back: the island animates again');
  await ev(() => { A.Perf._setLastInput(Date.now() - A.Perf.REST_MS - 1000); A.Perf.tick(); }); await sleep(100);
  ok(await ev(() => document.body.classList.contains('perf-rest') && document.getAnimations().filter((a) => a.playState === 'running').every((a) => a.effect.target.closest('.cr-an.walk') || (a instanceof CSSTransition && a.effect.target.classList.contains('cr-mv'))) /* a creature mid-step (its walk transition) is allowed, like its walk animation */), 'a still island (no input for a while) pauses its ambient decoration');
  await page.mouse.click(820, 120); await sleep(100);
  ok(await ev(() => !document.body.classList.contains('perf-rest')), 'any touch wakes it');
  await shot('09-island-forge-built');
  // 3D battle: one loop, frame budget, nothing while hidden, no duplicate after many hide/show cycles
  await ev(() => { const s = A.State.state; s.settings.creatures3d = true; s.res.gold = 999; A.Rules.startRun(s, 'forgottenroad', [1, 2]); A.UI.closeAll(); A.UI.startBattle(); });
  await page.waitForSelector('.battle.is3d canvas', { timeout: 30000 }).catch(() => null); await sleep(2500);
  const has3d = await ev(() => !!(A.C3D && A.C3D.stats && A.C3D.stats()));
  if (has3d) {
    await page.setViewportSize({ width: 360, height: 180 }); await sleep(2500);
    const s0 = await ev(() => A.C3D.stats()); await sleep(2000); const s1 = await ev(() => A.C3D.stats());
    const fps = (s1.drawn - s0.drawn) / 2;
    ok(fps <= 33, 'idle 3D battle renders at the 30 fps budget (' + fps.toFixed(1) + ' frames/s)');
    await hide(true); await sleep(200); const h0 = await ev(() => ({ s: A.C3D.stats(), raf: window.__perf.raf })); await sleep(1500); const h1 = await ev(() => ({ s: A.C3D.stats(), raf: window.__perf.raf }));
    ok(h1.s.drawn === h0.s.drawn && !h1.s.loopRunning && h1.raf - h0.raf < 3, 'hidden: the 3D view draws nothing and requests no frames');
    for (let i = 0; i < 6; i++) { await hide(false); await sleep(60); await hide(true); await sleep(60); }
    await hide(false); await sleep(1500);
    const r0b = await ev(() => window.__perf.raf); await sleep(1000); const r1b = await ev(() => window.__perf.raf);
    ok(r1b - r0b <= 75, 'after 6 more hide/show cycles there is still one render loop (' + (r1b - r0b) + ' frame requests in 1 s)');
    await page.setViewportSize({ width: 844, height: 390 });
  } else ok(true, 'no WebGL here: 3D checks skipped');
  await ev(() => new Promise((r) => A.UI.leaveBattle(() => { A.UI.showIsland(); r(); }))); await sleep(500);
  ok(await ev(() => !A.C3D.stats || !A.C3D.stats().loopRunning), 'leaving the battle stops the 3D loop');

  /* ---------- small screens ---------- */
  for (const [w, h, n] of [[667, 375, '10-forge-iphone-se'], [932, 430, '11-forge-iphone-pro-max']]) {
    await page.setViewportSize({ width: w, height: h }); await calm(); await ev(() => { A.State.state.res.gold = 2000; A.UI.forge('craft'); }); await sleep(250);
    const fit = await page.$eval('.sheet.forge', (e) => { const r = e.getBoundingClientRect(); return r.right <= innerWidth + 1 && r.left >= -1 && r.bottom <= innerHeight + 1; });
    const tabsOk = await page.$$eval('.ftab', (els) => els.every((e) => e.getBoundingClientRect().height >= 36));
    ok(fit && tabsOk, w + '×' + h + ': the Forge fits the screen and its tabs are touch-sized');
    await shot(n); await ev(() => A.UI.closeAll());
  }
  await page.setViewportSize({ width: 390, height: 844 }); await sleep(300);
  ok(await page.$eval('#rotate', (e) => getComputedStyle(e).display !== 'none'), 'portrait: the game asks to rotate (landscape game)');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nbrowser dev7: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
  await browser.close(); srv.close();
})();
