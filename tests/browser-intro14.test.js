// Phase 14 finalisation, real-browser test (Chromium + Playwright, software WebGL; NOT a phone): battle entry card,
// boss introduction (card, camera, skip) and that battles play exactly as before. Run: node tests/browser-intro14.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true })).newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message)); const ev = (fn, arg) => page.evaluate(fn, arg);
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D);
  await ev(() => { A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.quality = 'balanced'; s.settings.creatures3d = true;
    ['lumifern', 'emberix', 'aimza'].forEach((sp, i) => R.addAmina(s, sp, 14 - i)); s.missions = { m_hollow: 'claimed' }; Object.keys(D.DUNGEONS).forEach((id) => { const r = R.dungeonRec(s, id); r.clears = 1; r.next = 0; }); R.drain(); A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world', { timeout: 60000 }); await sleep(800);
  const tidy = () => ev(() => { A.UI.queue.length = 0; A.UI.busy = false; if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); document.querySelectorAll('.dlg,.toast,.reward-wrap,.scene').forEach((x) => x.remove()); if (!document.querySelector('#world')) A.UI.showIsland(); });
  const enter = async (d, from) => { await tidy(); const save0 = await ev(() => JSON.stringify(A.State.state.dungeon)); await ev(({ d, from }) => { const s = A.State.state; A.Rules.startRun(s, d, [0, 1, 2].map((i) => s.aminas[i].uid), { from }); A.UI.startBattle(); }, { d, from }); return save0; };
  const ids = await ev(() => A.Data.DUNGEON_ORDER);

  /* ---- an ordinary dungeon battle: the entry card ---- */
  await enter(ids[4], 3); await sleep(250);
  const e1 = await ev(() => { const e = document.querySelector('.b-entry'); return { txt: e ? e.textContent.replace(/\s+/g, ' ') : null, boss: !!document.querySelector('.b-bossin'), skip: !!document.querySelector('.b-skip') }; });
  ok(/Battle 4 of 10/.test(e1.txt || '') && !e1.boss && !e1.skip, 'an ordinary dungeon battle opens with its place and number (“' + e1.txt + '”), no boss card and nothing to tap through');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'entry-card.png') });
  await page.waitForFunction(() => document.querySelector('.abtn.ready'), null, { timeout: 40000 }); await sleep(1300);
  ok(await ev(() => !document.querySelector('.b-entry')), 'the entry card is gone after about a second, and the battle is ready as before');

  /* ---- a Guardian ---- */
  const t0 = Date.now(); await enter(ids[4], 9); await sleep(300);
  const g = await ev(() => { const e = document.querySelector('.b-bossin'); return { txt: e ? e.textContent.replace(/\s+/g, ' ') : null, skip: !!document.querySelector('.b-skip') }; });
  ok(/Guardian of The Cold Kiln|Guardian of /.test(g.txt || '') && /Battle 10 of 10/.test(g.txt) && /Tap to begin/.test(g.txt) && g.skip, 'the boss card names it as the dungeon’s Guardian, its element, “Battle 10 of 10” and how to begin (“' + (g.txt || '').slice(0, 120) + '…”)');
  const mechOk = await ev((d) => { const sp = A.Data.DUNGEONS[d].battles[9], m = sp.mech && A.Data.BOSS_MECHS[sp.mech.type], txt = document.querySelector('.b-bossin').textContent; return m ? txt.includes(m.desc) : /Telegraphs a powerful move/.test(txt); }, ids[4]);
  ok(mechOk, 'its fighting trait is the game’s own description of it (the boss mechanic, or the Guardian trait)');
  await page.waitForFunction(() => A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d && A.UI.B.stage.introOn, null, { timeout: 40000 }).catch(() => {});
  const cam = await ev(async () => { const st = A.UI.B.stage, on = st.introOn(); await new Promise((r) => setTimeout(r, 150)); return { on, is3d: st.is3d }; });
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'boss-intro.png') });
  ok(cam.is3d && cam.on, 'in the 3D arena the camera opens close on the boss while the card is up');
  // a tap ends it at once and does not count as a move
  const before = await ev(() => ({ turn: A.UI.B.b.turn, log: A.UI.B.b.log ? A.UI.B.b.log.length : 0, hp: A.UI.B.b.enemy.hp }));
  await page.mouse.click(420, 200); await sleep(400);
  const after = await ev(() => ({ card: !!document.querySelector('.b-bossin:not(.out)'), skip: !!document.querySelector('.b-skip'), cam: A.UI.B.stage.introOn ? A.UI.B.stage.introOn() : false, turn: A.UI.B.b.turn, hp: A.UI.B.b.enemy.hp }));
  ok(!after.card && !after.skip && !after.cam && after.turn === before.turn && after.hp === before.hp, 'one tap ends the introduction (card, camera) and changes nothing in the battle');
  // the battle is unchanged: a move lands
  await page.waitForFunction(() => document.querySelector('.abtn.ready.k-atk'), null, { timeout: 40000 });
  const fight = await ev(async () => { const B = A.UI.B; B.b.rng = () => 0.5; B.b.party[B.b.pi].spd = 9999; const hp0 = B.b.enemy.hp; document.querySelector('.abtn.ready.k-atk').click(); for (let i = 0; i < 140 && B.b.enemy.hp === hp0 && !B.over; i++) await new Promise((r) => setTimeout(r, 150)); return { hp0, hp: B.b.enemy.hp }; });
  ok(fight.hp < fight.hp0, 'the boss battle then plays as before (the boss took ' + (fight.hp0 - fight.hp) + ' damage from one move)');

  /* ---- untouched: it ends by itself ---- */
  await enter(ids[0], 9); await sleep(2900);
  ok(await ev(() => !document.querySelector('.b-bossin') && !document.querySelector('.b-skip') && !(A.UI.B.stage.introOn && A.UI.B.stage.introOn())), 'left alone, the introduction ends by itself within about 2.5 seconds');

  /* ---- Island Boss ---- */
  const isl = ids.find((d) => 0) || null; const ib = await ev(() => A.Data.DUNGEON_ORDER.find((d) => A.Data.DUNGEONS[d].battles[9].islandBoss));
  if (ib) { await enter(ib, 9); await sleep(300); const t = await ev(() => { const e = document.querySelector('.b-bossin.isle'); return e ? e.textContent.replace(/\s+/g, ' ') : null; }); ok(/The Island Boss/.test(t || '') && /Prism|colour|element/i.test(t || ''), 'the Island Boss card keeps its own title and states its mechanic (“' + (t || '').slice(0, 110) + '…”)'); if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'island-boss-intro.png') }); }

  /* ---- Reduce Motion / Battery saver ---- */
  await ev(() => { A.State.state.settings.reduceMotion = true; A.Perf.apply && A.Perf.apply(); document.body.classList.add('calm'); }); await enter(ids[2], 3); await sleep(200);
  const calm1 = await ev(() => !document.querySelector('.b-entry') && !document.querySelector('.b-wipe'));
  await enter(ids[2], 9); await page.waitForFunction(() => A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d, null, { timeout: 40000 }).catch(() => {}); await sleep(900);
  const calm2 = await ev(() => ({ card: !!document.querySelector('.b-bossin'), cam: A.UI.B.stage.introOn ? A.UI.B.stage.introOn() : false, anim: getComputedStyle(document.querySelector('.b-bossin') || document.body).animationName }));
  ok(calm1 && calm2.card && !calm2.cam && calm2.anim === 'none', 'with Reduce Motion: no entry card or wipe; the boss card still names the boss, with no camera move and no animation');
  await ev(() => { A.State.state.settings.reduceMotion = false; document.body.classList.remove('calm'); A.Perf.apply && A.Perf.apply(); });
  // progression and saves are untouched by the presentation
  await tidy(); const runAfter = await ev(() => ({ run: !!A.State.state.run, rec: A.Rules.dungeonRec(A.State.state, A.Data.DUNGEON_ORDER[4]).clears }));
  ok(runAfter.rec === 1, 'dungeon records are unchanged by entering and leaving battles (clears still 1)');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-intro14)'); await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
