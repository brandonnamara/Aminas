// Phase 17C, real-browser check (Chromium + Playwright, software WebGL, 844×390 touch; NOT an iPhone): the kept move
// in creature details (level, effect, upgrade), favourites and releasing a duplicate, the Moon Shrine's moonlight,
// Hatch now, the essence exchange, and the reduced-XP note. Run: node tests/browser-progression17c.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(90000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = (n) => (SHOTS ? page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 85 }) : null);
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 30000, polling: 50 });
  const tidy = () => ev(async () => { for (let i = 0; i < 30 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 120)); } A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    R.addAmina(s, 'lumifern', 10); R.addAmina(s, 'berrant', 14); R.addAmina(s, 'acinus', 8); R.addAmina(s, 'acinus', 5);
    s.settings.sfx = false; s.settings.music = false; s.settings.eggSpeed = 'normal'; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['hollow', 'tidegate', 'moonshrine', 'hatchery'].forEach((k) => { s.struct[k] = true; Object.assign(s.buildings[k], { level: k === 'moonshrine' ? 4 : 1, state: 'built' }); });
    s.res.gems = 60; s.res.gold = 2000; s.res.food = 500; R.Essence.gain(s, 'nature', 12); R.drain(); A.State.save(); A.UI.showIsland(true); });
  await until(() => !!document.querySelector('#world')); await sleep(500); await tidy();

  /* ---------- the kept move in creature details ---------- */
  await ev(() => { const s = A.State.state, b = s.aminas.find((a) => a.sp === 'berrant'); A.UI.detail('berrant', { uid: b.uid, tab: 'moves' }); }); await until(() => !!document.querySelector('.moves .mv[data-slot="2"]'));
  const mv = await ev(() => [...document.querySelectorAll('.moves .mv')].map((m) => ({ slot: m.dataset.slot, t: m.textContent.replace(/\s+/g, ' ').slice(0, 160) })));
  ok(mv.length === 3 && /Leaf Guard/.test(mv[2].t) && /Kept from Acinus/.test(mv[2].t) && /Lv 1/.test(mv[2].t) && /Blocks 50%/.test(mv[2].t), 'Berrant’s moves tab shows a third row: Leaf Guard, kept from Acinus, Lv 1, its effect and next level');
  await ev(() => document.querySelector('.moves .mv[data-slot="2"]').scrollIntoView({ block: 'end' })); await sleep(300); await shot('moves-kept'); await ev(() => document.querySelector('.moves .mv[data-slot="2"] [data-act="mvUp"]').click()); await sleep(500);
  const up = await ev(() => ({ lv: A.State.state.aminas.find((a) => a.sp === 'berrant').mv[2], ess: A.Rules.Essence.get(A.State.state, 'nature'), row: document.querySelector('.moves .mv[data-slot="2"]').textContent }));
  ok(up.lv === 2 && up.ess === 2 && /Lv 2/.test(up.row), 'upgrading it there spends 10 Nature Essence once and shows Lv 2');
  await ev(() => document.querySelector('.moves .mv[data-slot="2"]').scrollIntoView({ block: 'end' })); await sleep(300); await shot('moves-kept-upgraded');
  const exBtn = await ev(() => !!document.querySelector('.moves .mv[data-slot="2"] [data-act="essEx"]'));
  ok(exBtn, 'short of essence for the next level: an "Exchange gems" button beside it');
  await ev(() => document.querySelector('.moves .mv[data-slot="2"] [data-act="essEx"]').click()); await until(() => !!document.querySelector('#ex-go'));
  const exT = await ev(() => document.querySelector('#ex-go').closest('.overlay').textContent.replace(/\s+/g, ' '));
  ok(/3 essence per gem/.test(exT) && /30 gems a day/.test(exT), 'the exchange says its rate and daily limit before anything is spent');
  const exState = await ev(() => ({ gems: A.State.state.res.gems, ess: A.Rules.Essence.get(A.State.state, 'nature'), btn: document.querySelector('#ex-go').textContent }));
  await sleep(700); await shot('exchange'); await ev(() => document.querySelector('#ex-go').click()); await sleep(300);
  const exAfter = await ev(() => ({ gems: A.State.state.res.gems, ess: A.Rules.Essence.get(A.State.state, 'nature') }));
  const nGems = parseInt(exState.btn.trim(), 10);
  ok(nGems > 0 && exAfter.gems === exState.gems - nGems && exAfter.ess === exState.ess + 3 * nGems && exAfter.ess >= 24, 'confirming spends exactly the offered gems (' + exState.btn.trim() + ') and covers the next level');
  await tidy();

  /* ---------- favourites and release ---------- */
  await ev(() => { const s = A.State.state, a = s.aminas.filter((x) => x.sp === 'acinus')[1]; A.UI.detail('acinus', { uid: a.uid }); }); await until(() => document.querySelectorAll('[data-act="releaseAsk"]').length === 2);
  ok(await ev(() => document.querySelectorAll('[data-act="favToggle"]').length === 2), 'with two Acinus, each row has a favourite star and Release');
  await ev(() => document.querySelectorAll('[data-act="releaseAsk"]')[1].scrollIntoView({ block: 'center' })); await sleep(700); await shot('duplicates');
  await ev(() => document.querySelectorAll('[data-act="releaseAsk"]')[1].click()); await until(() => !!document.querySelector('.rel17'));
  const rel = await ev(() => document.querySelector('.rel17').closest('.overlay, .modal, .sheet').textContent.replace(/\s+/g, ' '));
  ok(/Lv 5/.test(rel) && /7 Nature Essence/.test(rel) && /Codex keeps Acinus/.test(rel) && /Keep it/.test(rel), 'the release sheet: which one, what it gives (7 Nature Essence), that the Codex keeps Acinus');
  await sleep(700); await shot('release-confirm');
  const n0 = await ev(() => A.State.state.aminas.length);
  await ev(() => document.querySelector('#rel-go').click()); await sleep(400);
  const ess0 = exAfter.ess; const relAfter = await ev(() => ({ n: A.State.state.aminas.length, owned: !!(A.State.state.owned && A.State.state.owned.acinus), codex: JSON.stringify(A.State.state.codex && A.State.state.codex.acinus || A.State.state.seen && A.State.state.seen.acinus || null), ess: A.Rules.Essence.get(A.State.state, 'nature') }));
  ok(relAfter.n === n0 - 1 && relAfter.ess === ess0 + 7 && relAfter.owned, 'confirmed: one Acinus leaves, 7 essence arrives, the Codex still has Acinus ' + JSON.stringify(relAfter));
  ok(await ev(() => !document.querySelector('[data-act="releaseAsk"]')), 'the last Acinus shows no Release button');
  await tidy();

  /* ---------- the Moon Shrine ---------- */
  await ev(() => { const s = A.State.state, W = A.World; const u = s.aminas.find((a) => a.sp === 'lumifern').uid; s.active = s.aminas.find((a) => a.sp === 'berrant').uid; W.assign(s, 'moonshrine', u); s.buildings.moonshrine.moon = { day: W.dayKey(Date.now()), made: 7 }; A.UI.buildingPanel('moonshrine'); });
  await until(() => /Moonlight today/.test(document.body.textContent));
  const ml = await ev(() => document.body.textContent.replace(/\s+/g, ' ').match(/Moonlight today:[^.]*\.[^.]*\./)[0]);
  ok(/7 \/ 18 gems/.test(ml) && /at most 18 gems a day/.test(ml), 'the Moon Shrine panel explains its moonlight: "' + ml + '"');
  await sleep(700); await shot('moonshrine'); await tidy();

  /* ---------- Hatch now ---------- */
  await ev(() => { const s = A.State.state, R = A.Rules; const p = s.aminas.filter((a) => a.lv >= 5); R.startBreed(s, p[0].uid, p[1].uid, 0); A.UI.hatchery(); });
  await until(() => !!document.querySelector('[data-act="hHatchNow"]'));
  await sleep(700); await shot('hatch-now-button'); await ev(() => document.querySelector('[data-act="hHatchNow"]').click()); await until(() => !!document.querySelector('#hn-go'));
  const hn = await ev(() => document.querySelector('#hn-go').closest('.overlay, .modal').textContent.replace(/\s+/g, ' '));
  ok(/1 gem/.test(hn) && /every 6 minutes/.test(hn), 'Hatch now says its price first (1 gem for a 5-minute egg)');
  await ev(() => document.querySelector('#hn-go').click()); await sleep(400);
  const hnAfter = await ev(() => ({ gems: A.State.state.res.gems, e: A.Rules.eggStatus(A.State.state, null, 0) }));
  ok(hnAfter.gems === exAfter.gems - 1 && hnAfter.e && hnAfter.e.ready, 'confirmed: 1 gem, and the egg is ready to hatch ' + JSON.stringify(hnAfter));
  await tidy();

  /* ---------- reduced XP, shown on the result ---------- */
  const note = await ev(() => { const s = A.State.state, R = A.Rules; s.dungeon = {}; R.startRun(s, 'forgottenroad', [s.aminas.find((a) => a.sp === 'berrant').uid]); const b = R.createBattle(s, () => 0.5); b.enemy.hp = 0; b.over = true; b.result = 'win'; const out = R.resolveBattle(s, b); return out.xp[0]; });
  ok(note.scaled === 0.25 && note.gap >= 5, 'a level-14 Amina beating a level-' + (14 - note.gap) + ' foe gets 25% of the XP, and the result knows why');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\n' + (fail ? 'FAILED: ' : '') + pass + ' passed, ' + fail + ' failed (browser-progression17c)'); process.exitCode = fail ? 1 : 0;
})();
