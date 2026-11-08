// Phase 12A real-browser test (Chromium + Playwright, software WebGL; NOT a phone): the Raid Preview screen.
// Run: node tests/browser-raid12a.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
  const shot = async (n) => { if (SHOTS) { await sleep(350); await page.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
  const clean = () => page.evaluate(async () => { for (let i = 0; i < 15; i++) { await new Promise((r) => setTimeout(r, 80)); document.querySelectorAll('.dlg .dlg-skip').forEach((x) => x.click()); } document.querySelectorAll('.dlg,.toast').forEach((x) => x.remove()); if (A.UI.queue) A.UI.queue.length = 0; A.UI.closeAll(); });
  const shown = () => page.evaluate(() => { const ov = document.querySelector('.raidsheet'); if (!ov) return null; const n = (sel) => +ov.querySelector(sel).textContent.replace(/[^0-9]/g, '');
    return { name: ov.querySelector('.rp-names b').textContent, isle: ov.querySelector('.rp-names > span').textContent, gold: n('.rp-tile.gold b'), food: n('.rp-tile.food b'), value: n('.rp-total b'),
      foes: [...ov.querySelectorAll('.rp-def .slot')].map((x) => x.querySelector('b').textContent + ' ' + x.textContent.match(/Lv (\d+)/)[1]), attack: !ov.querySelector('.rp-attack.off'), skip: !!ov.querySelector('[data-act="raidSkip"]'), spent: !!ov.querySelector('.rp-loot.spent') }; });
  const saved = () => page.evaluate(() => { const k = Object.keys(localStorage).find((x) => /aminas/i.test(x) && localStorage.getItem(x).indexOf('"defence"') >= 0); const s = JSON.parse(localStorage.getItem(k)); return { target: s.defence.target, res: s.res, log: s.defence.log }; });

  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.Rules.PvP.raidPreview);
  await page.evaluate(() => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = false;
    ['lumifern', 'acinus', 'pyrokai', 'cannonis', 'gaiaroki', 'voltar'].forEach((sp) => R.addAmina(s, sp, 10)); R.drain(); R.PvP.setTeam(s, 'attack', s.aminas.slice(0, 3).map((a) => a.uid)); A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world'); await clean();

  /* 1, 2. entering shows an island and loot that matches the raid calculation */
  await page.evaluate(() => A.UI.defence()); await page.click('[data-act="defRaid"]'); await page.waitForSelector('.raidsheet');
  let v = await shown(), sv = await saved(), t = await page.evaluate(() => A.State.state.defence.target);
  ok(v && v.name === t.name && v.isle === t.isle && v.skip && v.attack, 'Island Defence → “Find an island to raid” opens the Raid Preview: ' + v.name + ' of ' + v.isle + ', Skip and Attack buttons');
  ok(v.gold === t.loot.gold && v.food === t.loot.food && v.value === t.loot.gold + t.loot.food * 3, 'the coins, food and total value shown are the island’s raid loot (' + v.gold + ' coins, ' + v.food + ' food, ' + v.value + ' total)');
  const want = await page.evaluate(() => A.State.state.defence.target.foes.map((f) => A.Data.SPECIES[f.sp].name + ' ' + f.lv));
  ok(v.foes.length === 3 && JSON.stringify(v.foes) === JSON.stringify(want), 'the three defenders the raid will fight are shown with their levels (' + v.foes.join(', ') + ')');
  ok(sv.target && sv.target.id === t.id, 'the island on offer is kept in the save');
  await shot('01-raid-preview');

  /* 3, 4. skip */
  const res0 = await page.evaluate(() => JSON.stringify(A.State.state.res)); const names = [v.name];
  for (let i = 0; i < 4; i++) { await page.click('[data-act="raidSkip"]'); await sleep(150); names.push((await shown()).name); }
  v = await shown(); t = await page.evaluate(() => A.State.state.defence.target);
  ok(names.every((n, i) => i === 0 || n !== names[i - 1]) && new Set(names).size === names.length, 'Skip opponent shows a different island each time (' + names.join(' → ') + ')');
  ok(v.gold === t.loot.gold && v.food === t.loot.food, 'and each new island shows its own loot, matching its raid calculation');
  ok((await page.evaluate(() => JSON.stringify(A.State.state.res))) === res0 && !(await page.evaluate(() => !!(A.UI.B))), 'skipping costs nothing and starts no battle');
  await shot('02-after-skip');

  /* 8a. restart keeps the same island */
  await page.reload(); await page.waitForFunction(() => window.A && A.UI && A.State); await page.evaluate(() => { const c = document.querySelector('[data-act=continue]'); if (c) c.click(); });
  await page.waitForSelector('#world'); await clean(); await page.evaluate(() => A.UI.raidPreview());
  const v2 = await shown();
  ok(v2.name === v.name && v2.gold === v.gold && v2.food === v.food, 'after restarting the game the same island and loot are offered (' + v2.name + ')');

  /* 5, 6. attack the island shown, win, get exactly its loot */
  const before = await page.evaluate(() => Object.assign({}, A.State.state.res)); t = await page.evaluate(() => A.State.state.defence.target);
  await page.click('[data-act="raidAttack"]');
  await page.waitForFunction(() => A.UI.B && A.UI.B.b && !A.UI.B.busy, null, { timeout: 60000 });
  const bt = await page.evaluate(() => ({ kind: A.UI.B.ctx.kind, id: A.UI.B.b.raidTarget, foes: A.UI.B.b.foes.map((f) => f.sp + ':' + f.lv), locked: A.State.state.defence.target.locked, label: A.UI.B.ctx.label }));
  ok(bt.kind === 'raid' && bt.id === t.id && JSON.stringify(bt.foes) === JSON.stringify(t.foes.map((f) => f.sp + ':' + f.lv)) && bt.locked, 'Attack starts the raid against the island shown, with the defenders shown, locked (' + bt.label + ')');
  await shot('03-raid-battle');
  await page.evaluate(() => { const U = A.UI.B; U.b.foes.forEach((f) => (f.hp = 0)); U.b.over = true; U.b.result = 'win'; U.ctx.finish(U); });
  await page.waitForSelector('#rr-ok');
  const after = await page.evaluate(() => Object.assign({}, A.State.state.res)), resTxt = await page.evaluate(() => document.querySelector('.v-spoils').textContent);
  ok(after.gold === before.gold + t.loot.gold && after.food === before.food + t.loot.food && after.gems === before.gems, 'a successful raid pays exactly the loot shown: +' + t.loot.gold + ' coins, +' + t.loot.food + ' food, no gems');
  ok(resTxt.indexOf(String(t.loot.gold)) >= 0 && resTxt.indexOf(t.isle) >= 0, 'the result screen shows what was raided and from where');
  await shot('04-raid-won');
  await page.click('#rr-ok'); await page.waitForSelector('.raidsheet'); v = await shown();
  ok(v.name !== t.name || v.isle !== t.isle, 'Continue returns to a new island to raid (the raided one is used up)');
  sv = await saved(); ok(sv.res.gold === after.gold && sv.log[0].win && sv.log[0].isle === t.isle, 'the reward and the log entry are saved');

  /* 7. a lost (called-off) raid follows the old rules */
  t = await page.evaluate(() => A.State.state.defence.target); const r1 = await page.evaluate(() => JSON.stringify(A.State.state.res));
  await page.click('[data-act="raidAttack"]'); await page.waitForFunction(() => A.UI.B && A.UI.B.b && !A.UI.B.busy, null, { timeout: 60000 });
  await page.evaluate(() => A.UI.B.ctx.retreat.fn()); await page.evaluate(() => A.UI.leaveBattle(() => { A.UI.showIsland(); A.UI.raidPreview(); }));
  await page.waitForSelector('.raidsheet'); v = await shown();
  ok((await page.evaluate(() => JSON.stringify(A.State.state.res))) === r1 && v.name === t.name && (await page.evaluate(() => A.State.state.defence.log[0].win === false)), 'calling off a raid counts as lost: nothing gained or lost, and the same island stays on offer');

  /* 8b. no extra rewards from repeating the result or reopening */
  const r2 = await page.evaluate(() => JSON.stringify(A.State.state.res));
  for (let i = 0; i < 3; i++) { await page.evaluate(() => { A.UI.closeAll(); A.UI.defence(); }); await page.click('[data-act="defRaid"]'); await page.waitForSelector('.raidsheet'); }
  ok((await page.evaluate(() => JSON.stringify(A.State.state.res))) === r2 && (await shown()).name === v.name, 'opening and closing the preview again pays nothing and keeps the island');

  /* motion */
  const anim = await page.evaluate(async () => { document.body.classList.add('calm'); document.querySelector('[data-act="raidSkip"]').click(); await new Promise((r) => setTimeout(r, 60)); const s = document.querySelector('.rp.rp-new > section'); const a = s ? getComputedStyle(s).animationName : '?'; document.body.classList.remove('calm'); return a; });
  ok(anim === 'none', 'the short entrance for a new island is off in calm mode (Reduce motion, Battery saver, resting)');

  /* 9. the other PvP screens still open */
  const others = await page.evaluate(async () => { A.UI.closeAll(); A.UI.pvpMenu(); const m = [...document.querySelectorAll('.mcard')].map((x) => x.dataset.act); A.UI.closeAll(); A.UI.pvp5(); const p5 = !!document.querySelector('[data-act="pvpPlay"]'); A.UI.closeAll(); A.UI.hideSeek(); const hs = !!document.querySelector('.overlay .sheet'); A.UI.closeAll(); return { m, p5, hs }; });
  ok(['pvp5', 'defence', 'hideseek'].every((x) => others.m.includes(x)) && others.p5 && others.hs, 'the PvP menu still lists 5v5, Island Defence and Hide and Seek, and their screens open');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-raid12a)'); await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
