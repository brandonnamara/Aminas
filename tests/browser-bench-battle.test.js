// Battle performance test (measurement only) — real-browser test (Chromium + Playwright, SwiftShader; NOT a phone).
// Checks that the battle test runs every quality setting with the Phase 7 effects on and off, that "off" really hides
// the Phase 7 layers, that it records automatic Battery saver triggers with their reasons, that it leaves the game
// exactly as it found it (save, Battery saver state, quality, battle), and that the instrumentation changes nothing
// in normal play. Timings are shortened here; the numbers themselves are not checked (software rendering).
// Run: node tests/browser-bench-battle.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(600000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D && A.Bench);
  await page.evaluate(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.creatures3d = true;
    R.addAmina(s, 'lumifern', 14); R.addAmina(s, 'emberix', 12); R.drain(); A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world', { timeout: 60000 }); await sleep(1000);
  const saveKey = () => page.evaluate(() => { const k = Object.keys(localStorage).find((x) => /aminas/i.test(x) && !/bench|saverlog|bak/i.test(x)); return k ? localStorage.getItem(k) : null; });

  /* ---------------- normal play is unchanged by the instrumentation ---------------- */
  const play = await page.evaluate(() => { const P = A.Perf, s = A.State.state; const a = P.saver(); s.settings.batterySaver = true; const b = P.saver(); s.settings.batterySaver = false;
    P.forceTier = 'high'; const c = P.saver(), q = P.quality(); P.forceTier = 'saver'; const d = P.saver(); P.forceTier = null; return { a, b, c, d, q, e: P.saver() }; });
  ok(play.a === false && play.b === true && play.e === false, 'Battery saver follows the setting exactly as before when no test is running');
  ok(play.c === false && play.q === 'high' && play.d === true, 'a tier forced by the test decides (High measured uncapped, Saver as Saver)');

  // an earlier automatic Battery saver this session records its reason (view, slow frames, resolution, budget)
  const why = await page.evaluate(() => { A.Perf.reportSlow({ view: 'battle:heartwood:island-boss', slowFrames: 10, frames: 14, pixelRatio: 1, targetFps: 60 }); document.querySelectorAll('.toast').forEach((t) => t.remove());
    return { on: A.Perf.autoSaver, why: A.Perf.saverWhy, log: A.Perf.saverLog() }; });
  ok(why.on && why.why && why.why.view === 'battle:heartwood:island-boss' && why.why.slowFrames === 10 && why.why.when && why.log.length === 1, 'automatic Battery saver keeps the reason it switched on (also across reloads, outside the save)');

  /* ---------------- the battle test ---------------- */
  const saveBefore = await saveKey();
  const before = await page.evaluate(() => ({ save: A.State.save, report: A.Perf.reportSlow, quality: A.State.state.settings.quality }));
  void before;
  const out = await page.evaluate(async () => {
    A.Bench.BATTLE_S = { idle: 2, turns: 4 }; A.Bench.BENCH_N = 3; A.Bench.EXTENDED_S = 30;
    const reportWas = A.Perf.reportSlow, saveWas = A.State.save; const seen = { stages: [], hiddenOff: null, shownOn: null };
    // watch the first "off" and "on" phases from inside: are the Phase 7 layers drawn?
    const M = await A.C3D.load(); const hideWas = M.meterHide; void hideWas;
    const iv = setInterval(() => { const st = A.UI.B && A.UI.B.stage; if (st && st.is3d && !seen.stages.includes(st)) seen.stages.push(st); }, 200);
    const r = await A.Bench.runBattle({ extended: true }); clearInterval(iv);
    return { r, restoredReport: A.Perf.reportSlow === reportWas, restoredSave: A.State.save === saveWas, autoSaver: A.Perf.autoSaver, forceTier: A.Perf.forceTier, inBattle: !!A.UI.B, screen: A.UI.screen, stages: seen.stages.length, bodySaver: document.body.classList.contains('perf-saver'), banner: !!document.querySelector('.bench-banner') };
  });
  const r = out.r;
  ok(!r.error, 'the battle test runs to the end' + (r.error ? ' (' + r.error + ')' : ''));
  ok(r.tiers.length === 4 && ['Auto', 'High', 'Balanced', 'Battery saver'].every((t, i) => r.tiers[i].tier === t), 'it measures every quality setting: Auto, High, Balanced, Battery saver');
  ok(r.tiers.every((t) => t.load && t.load.is3d && t.load.loadMs > 0), 'every setting opens the Island Boss battle fresh on the 3D stage, with its load time');
  ok(r.tiers[1].atmosphere.tier === 'high' && r.tiers[2].atmosphere.tier === 'balanced' && r.tiers[3].atmosphere.tier === 'saver' && r.tiers.every((t) => t.atmosphere.island && t.atmosphere.boss), 'each arena is built for its own quality, in the Island Boss room');
  const ph = (n) => r.phases.find((p) => p.phase === n);
  ok(r.tiers.every((t) => ph('turns, ' + t.tier + ', effects on') && ph('turns, ' + t.tier + ', effects off')), 'every setting has turns with effects on and the same with effects off');
  ok(r.phases.filter((p) => /^turns/.test(p.phase)).every((p) => p.turns >= 1), 'the test plays the battle by itself (moves pressed in every phase)');
  ok(r.phases.some((p) => p.ultimates > 0), 'ultimates are included (the heaviest effects)');
  ok(r.tiers.every((t) => ph('turns, ' + t.tier + ', effects off').drawCalls < ph('turns, ' + t.tier + ', effects on').drawCalls), '"effects off" really hides the Phase 7 layers (fewer draw calls at every setting: ' + r.tiers.map((t) => ph('turns, ' + t.tier + ', effects on').drawCalls + '→' + ph('turns, ' + t.tier + ', effects off').drawCalls).join(', ') + ')');
  const p0 = ph('turns, High, effects on');
  ok(['fps3d', 'budgetFps', 'p50', 'p95', 'p99', 'worst', 'missedPct', 'slowPct', 'cpuUpdateMs', 'cpuRenderMs', 'drawCalls', 'triangles', 'pixelRatio'].every((k) => p0[k] != null) && p0.fps3d > 0 && p0.triangles > 0, 'frame rates, frame times, CPU and rendering workload are recorded per phase');
  ok(r.phases.find((p) => p.phase === 'idle (your turn)') && Math.round(r.phases.find((p) => p.phase === 'idle (your turn)').budgetFps) === 30, 'idle is measured against its 30 fps budget');
  ok(r.tiers.every((t) => t.breakdown && t.breakdown.frameMs > 0 && Object.keys(t.breakdown.parts).length === 6 && t.breakdown.at1xMs > 0), 'each setting has a layer-by-layer cost breakdown and a 1x resolution check');
  ok(r.tiers[1].breakdown.pixelRatio === 2 && r.tiers[2].breakdown.pixelRatio === 1.5 && r.tiers[3].breakdown.pixelRatio === 1, 'the breakdown runs at each setting\'s own resolution (2x, 1.5x, 1x)');
  ok(r.tiers.every((t) => /bound|Keeps up|Display-limited/.test(t.verdict)), 'each setting gets a bottleneck verdict');
  ok(r.displayFps > 0, 'the display rate the page gets is recorded (' + r.displayFps + ' fps)');
  ok(r.extended && r.extended.slices.length === 2 && r.extended.slices.every((s) => s.turns > 0) && r.extended.dropPct != null, 'extended combat is measured in 15 s slices with a first-vs-last comparison');
  ok(r.batterySaverBefore.onForThisSession && r.batterySaverBefore.reason && r.batterySaverBefore.reason.view === 'battle:heartwood:island-boss', 'it reports that Battery saver was already on, and why');
  ok(r.batterySaver && typeof r.batterySaver.wouldHaveStarted === 'boolean' && (!r.batterySaver.wouldHaveStarted || r.batterySaver.triggers.every((t) => t.phase && t.view && t.frames > 0 && t.slowFrames != null && t.pixelRatio && t.targetFps)), 'each time the Battery saver rule would fire, the phase and the measurement behind it are recorded');
  ok(r.save.untouched && out.restoredSave && saveBefore === await saveKey(), 'the game save is untouched (same bytes before and after; saving was suspended)');
  ok(out.restoredReport && out.autoSaver === true && out.bodySaver === true && out.forceTier === null, 'Battery saver, its rule and the quality setting are put back exactly as they were');
  ok(!out.inBattle && out.screen === 'island' && !out.banner, 'the player is back on the island with no battle left open');
  const geo = await page.evaluate(async () => (await A.C3D.load()).stats());
  ok(!geo.live && !geo.loopRunning, 'the 3D loop stops when the test ends');
  const sheet = await page.evaluate((o) => { A.Bench.showBattle(o); const t = document.querySelector('.bench-table'); const n = t ? t.querySelectorAll('tr').length : 0; A.UI.closeAll(); return n; }, r);
  ok(sheet === r.phases.length + 1, 'the results sheet lists every phase');
  ok(await page.evaluate(() => { const t = document.createElement('button'); t.dataset.act = 'benchAsk'; document.body.appendChild(t); t.click(); t.remove(); const n = document.querySelectorAll('.overlay [data-act="benchBattle"]').length, last = !!document.querySelector('.overlay [data-act="benchBattleLast"]'); A.UI.closeAll(); return n === 2 && last; }), 'the battle test is offered in the performance test panel (2 min, 5 min with extended combat, last result)');

  // a battle played normally afterwards: no layers hidden, no recording left on
  const after = await page.evaluate(async () => { const M = await A.C3D.load(); const s = A.State.state; A.Rules.startRun(s, 'forgottenroad', [s.aminas[0].uid], {}); A.UI.startBattle();
    for (let i = 0; i < 80 && !(A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d); i++) await new Promise((r) => setTimeout(r, 100));
    await new Promise((r) => setTimeout(r, 800)); const m = M.meterRead(false); const calls = M.stats().drawCalls; A.UI.leaveBattle(() => {}); A.UI.showIsland(); return { draws: m.draws.length, calls }; });
  ok(after.draws === 0 && after.calls >= 25, 'after the test a normal battle draws all its layers and records nothing');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));

  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-bench-battle)');
  await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
