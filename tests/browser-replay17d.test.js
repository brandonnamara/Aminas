// Phase 17D, real-browser check (Chromium + Playwright, software WebGL, 844×390 touch; NOT an iPhone): daily tasks
// and Codex milestones in the Tasks sheet, the Milestones button, dungeon challenges on the card, in the party picker
// and on the result, starter advice, and a release refused because the Amina changed after the sheet opened.
// Run: node tests/browser-replay17d.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(90000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = async (n) => { if (!SHOTS) return; await sleep(700); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 85 }); };
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 30000, polling: 50 });
  const tidy = () => ev(async () => { for (let i = 0; i < 30 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 120)); } A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('.toast,.reward-wrap').forEach((t) => (t.innerHTML = '')); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['hollow', 'tidegate', 'moonshrine', 'hatchery'].forEach((k) => { s.struct[k] = true; Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
    ['lumifern', 'acinus', 'kairyu', 'cannonis', 'gaiaroki'].forEach((sp, i) => R.addAmina(s, sp, i ? 12 : 14)); R.addAmina(s, 'terraflora', 12); R.addAmina(s, 'sylvaneer', 12);
    s.dungeon.forgottenroad = { clears: 1, floors: D.DUNGEONS.forgottenroad.sections.map(() => true), next: 0 }; s.dungeon.gatheringhall = { clears: 1, floors: D.DUNGEONS.gatheringhall.sections.map(() => true), next: 0 };
    s.res.gold = 2000; s.res.food = 500; s.res.gems = 20; A.State.state = s; R.drain(); A.State.save(); A.UI.showIsland(true); });
  await until(() => !!document.querySelector('#world')); await sleep(500); await tidy();

  /* ---------- daily tasks and Codex milestones in the Tasks sheet ---------- */
  const badge = await ev(() => { A.UI.renderHud(); const b = document.querySelector('.nbtn[data-act="missions"] .badge'); return b ? +b.textContent : 0; });
  const codexReady = await ev(() => A.Rules.Codex.ready(A.State.state));
  ok(codexReady >= 1 && badge >= codexReady, 'the Tasks badge counts the Codex milestones ready (' + codexReady + ' of ' + badge + ')');
  await ev(() => A.UI.missions()); await until(() => !!document.querySelector('.m17 [data-hl="daily"]'));
  const tk = await ev(() => ({ daily: document.querySelectorAll('.m17 .mrow.d17:not(.bonus)').length, head: document.querySelector('[data-hl="daily"]').textContent + document.querySelector('.d17-note').textContent, codex: document.querySelectorAll('.m17 .mrow.cx17').length, first: document.querySelector('.sh-body').firstElementChild.className }));
  ok(tk.daily === 3 && /optional/.test(tk.head) && /nothing is lost/i.test(tk.head) && tk.first === 'm17', 'Tasks opens with “Today’s tasks”: three optional tasks, labelled as optional with nothing lost for skipping');
  ok(tk.codex >= 3, 'and lists Codex milestones (ready ones and the next goal of each kind)');
  await shot('tasks-daily');
  // finish one daily task through real play events, then claim it
  const t0 = await ev(() => { const s = A.State.state, L = A.Rules.Daily.list(s), t = L.today[0]; s.d17.c[t.k] = (s.d17.c[t.k] | 0) + t.need; /* as if played: the counters come from game events, covered by the Node tests */ A.UI.missions(document.querySelector('.overlay')); return t; });
  await until(() => !!document.querySelector('[data-act="dClaim"]'));
  const g0 = await ev(() => A.State.state.res.gold); await ev(() => document.querySelector('[data-act="dClaim"]').click()); await sleep(500);
  const g1 = await ev(() => A.State.state.res.gold), exp = await ev((k) => A.Data.DAILY17.tasks[k].reward.gold, t0.k);
  ok(g1 - g0 === exp && await ev(() => !document.querySelector('[data-act="dClaim"]')), 'a finished daily task claims once from the sheet (+' + exp + ' gold) and its button goes');
  await shot('tasks-daily-claimed');
  await ev(() => document.querySelector('[data-hl="codex"]').scrollIntoView({ block: 'start' })); await sleep(300); await shot('tasks-codex');
  const gm0 = await ev(() => A.State.state.res.gems); await ev(() => document.querySelector('[data-act="cxClaim"]').click()); await sleep(500);
  ok(await ev((gm0) => A.State.state.res.gems > gm0 && !!(A.State.state.d17.codex && A.State.state.d17.codex.sp5), gm0), 'a Codex milestone claims from the same sheet (Five friends)');
  await tidy();
  await ev(() => A.UI.collection()); await until(() => !!document.querySelector('[data-act="cxOpen"]'));
  ok(await ev(() => /Milestones/.test(document.querySelector('[data-act="cxOpen"]').textContent)), 'the Creature Collection has a Milestones button beside Bag');
  await shot('collection-milestones'); await ev(() => document.querySelector('[data-act="cxOpen"]').click()); await until(() => !!document.querySelector('[data-hl="codex"]'));
  ok(true, 'which opens the Tasks sheet at the Codex milestones'); await tidy();

  /* ---------- dungeon challenges ---------- */
  await ev(() => A.UI.dungeons(null, 'gatheringhall')); await until(() => !!document.querySelector('.ch17'));
  const chT = await ev(() => document.querySelector('.ch17').textContent.replace(/\s+/g, ' '));
  ok(/Optional challenges/.test(chT) && /replay from battle 1/.test(chT) && /Flawless/.test(chT) && /One element/.test(chT) && /Answer the guardian/.test(chT), 'a cleared dungeon’s card lists its three optional challenges, how to try them and what they pay');
  await ev(() => document.querySelector('.ch17').scrollIntoView({ block: 'center' })); await shot('dungeon-challenges');
  await ev(() => document.querySelector('[data-act="enterDungeon"][data-from="0"]').click()); await until(() => !!document.querySelector('.pp-ch17'));
  const pick = await ev(() => document.querySelector('.pp-ch17').textContent);
  ok(/Optional challenges/.test(pick) && /Flawless/.test(pick), 'the party picker for a replay shows the challenges too');
  await shot('picker-challenges'); await tidy();
  // a full replay with three Nature Aminas, no faints: the result card shows the two challenges
  const out = await ev(() => { const s = A.State.state, R = A.Rules, u = s.aminas.filter((a) => A.Data.SPECIES[a.sp].el === 'nature').map((a) => a.uid).slice(0, 3); R.startRun(s, 'gatheringhall', u, { from: 0 }); let o; do { const b = R.createBattle(s, () => 0.5); b.foes.forEach((f) => (f.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; o = R.resolveBattle(s, b); } while (s.run && o.win); A.UI.B = null; A.UI.victory(o); return { fresh: o.challenges && o.challenges.fresh, reward: o.reward }; });
  await until(() => /Challenges complete/.test(document.body.textContent));
  ok(out.fresh && out.fresh.join() === 'flawless,kindred', 'a flawless replay with three Nature Aminas completes Flawless and One element');
  ok(await ev(() => /Challenges complete: Flawless, One element/.test(document.querySelector('.v-spoils').textContent)), 'the result card names them in their own reward group, beside the normal replay reward');
  await shot('result-challenges'); await tidy();

  /* ---------- starter advice ---------- */
  await ev(() => { const s = A.State.state; A.UI.pickTeam({ size: 3, title: 'Choose your party · The Reliquary', dungeon: 'reliquary', from: 0, go: 'Enter', initial: [s.aminas[0].uid], onGo: () => false }); });
  await until(() => !!document.querySelector('.pp-adv17'));
  ok(await ev(() => /up to three/.test(document.querySelector('.pp-adv17').textContent)), 'one Amina picked while owning more: the picker suggests bringing up to three (and still lets you go)');
  await shot('picker-advice');
  await tidy();

  /* ---------- release re-check ---------- */
  await ev(() => { const s = A.State.state, R = A.Rules; s.active = s.aminas[0].uid; R.addAmina(s, 'acinus', 6); const a = s.aminas.filter((x) => x.sp === 'acinus')[1]; A.UI.detail('acinus', { uid: a.uid }); });
  await until(() => document.querySelectorAll('[data-act="releaseAsk"]').length === 2);
  await ev(() => document.querySelectorAll('[data-act="releaseAsk"]')[1].click()); await until(() => !!document.querySelector('#rel-go'));
  const n0 = await ev(() => A.State.state.aminas.length);
  await ev(() => { const s = A.State.state, a = s.aminas.filter((x) => x.sp === 'acinus')[1]; A.Rules.addXp(s, a, 5000); }); // it levels up while the sheet is open
  await ev(() => document.querySelector('#rel-go').click()); await sleep(500);
  ok(await ev((n0) => A.State.state.aminas.length === n0, n0), 'it levelled up while the release sheet was open: Release is refused and the Amina stays');
  ok(await ev(() => /changed since you opened this/.test(document.body.textContent)), 'with a message saying it changed');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\n' + (fail ? 'FAILED: ' : '') + pass + ' passed, ' + fail + ' failed (browser-replay17d)'); process.exitCode = fail ? 1 : 0;
})();
