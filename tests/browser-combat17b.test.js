// Phase 17B, real-browser check (Chromium + Playwright, software WebGL, 844×390 touch; NOT an iPhone): the guardian
// brief in the party picker, three moves in battle (kept move) laid out with Switch, the new battle messages, and the
// boss-only replay label. Run: node tests/browser-combat17b.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(90000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = (n) => (SHOTS ? page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 85 }) : null);
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 30000, polling: 50 });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    R.addAmina(s, 'reefback', 14); R.addAmina(s, 'berrant', 14); R.addAmina(s, 'flaremon', 14); s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (s.struct[k] = true)); s.flags.r1 = true;
    ['forgottenroad', 'gatheringhall', 'reliquary', 'drownedsteps'].forEach((id) => (s.dungeon[id] = { clears: 1, floors: [true, true, true, true], next: 0 })); R.drain(); A.State.save(); A.UI.showIsland(true); });
  await until(() => !!document.querySelector('#world')); await sleep(600);
  await ev(async () => { for (let i = 0; i < 30 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 120)); } A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); });

  /* ---------- the dungeon card and the party picker ---------- */
  await ev(() => A.UI.dungeons(null, 'drownedsteps')); await sleep(500);
  ok(await ev(() => /Fight the boss again · battle reward only/.test(document.body.textContent) && /Replays: 80 gold, 20 food/.test(document.body.textContent)), 'a cleared dungeon: "Fight the boss again · battle reward only", and its replay reward');
  await shot('dungeon-card'); await ev(() => A.UI.closeAll());
  await ev(() => A.UI.acts.enterDungeon({ dataset: { id: 'coldkiln' }, closest: () => null })); await until(() => !!document.querySelector('.pp-boss'));
  const unmet = await ev(() => document.querySelector('.pp-boss').textContent);
  ok(/The Kiln Mother/.test(unmet) && /Not met yet/.test(unmet) && !/Earth/.test(unmet) && /Kiln Flare/.test(unmet), 'party picker, guardian not met: its title and an answer to Kiln Flare, no element (' + unmet.replace(/\s+/g, ' ').slice(0, 120) + ')');
  await shot('picker-unmet'); await ev(() => A.UI.closeAll());
  await ev(() => { A.State.state.seen.pyroforge = true; A.UI.acts.enterDungeon({ dataset: { id: 'coldkiln' }, closest: () => null }); }); await until(() => !!document.querySelector('.pp-boss'));
  const met = await ev(() => { const b = document.querySelector('.pp-boss'), r = b.getBoundingClientRect(), sh = b.closest('.sheet, .modal, .ov') || document.body; return { t: b.textContent, chips: b.querySelectorAll('.chip').length, w: r.width, right: r.right, vw: innerWidth }; });
  ok(/Weak to/.test(met.t) && /Water/.test(met.t) && /Nature/.test(met.t) && /resists/.test(met.t) && met.chips >= 4, 'once met: its element, what it is weak to and what it resists, as element chips');
  ok(/hit its weakness|hits its weakness/.test(met.t) && /guard when it charges Kiln Flare/.test(met.t), 'advice for the chosen party: Reefback hits its weakness; Berrant’s kept Leaf Guard answers the charge');
  ok(met.right <= met.vw + 1, 'the brief fits inside the screen');
  await shot('picker-met'); await ev(() => A.UI.closeAll());

  /* ---------- battle: three moves and Switch ---------- */
  await ev(() => { const s = A.State.state, R = A.Rules; R.startRun(s, 'coldkiln', [s.aminas[1].uid, s.aminas[0].uid, s.aminas[2].uid]); A.UI.startBattle(); });
  await until(() => A.UI.B && A.UI.B.b && document.querySelectorAll('#b-actions .abtn').length >= 3 && !A.UI.B.busy, null, 90000);
  const lay = await ev(() => { const bs = [...document.querySelectorAll('#b-actions .abtn')].map((b) => { const r = b.getBoundingClientRect(); return { id: b.dataset.id || 'swap', l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    const overlap = bs.some((a, i) => bs.some((c, j) => j > i && a.l < c.r - 1 && c.l < a.r - 1 && a.t < c.b - 1 && c.t < a.b - 1)); return { bs, overlap, vh: innerHeight, vw: innerWidth }; });
  ok(lay.bs.length === 4 && lay.bs.map((b) => b.id).join(',') === 'vinewhip,verdantcrash,leafguard,swap', 'Berrant (Acinus II) shows Vine Whip, Verdant Crash, its kept Leaf Guard, and Switch');
  ok(!lay.overlap && lay.bs.every((b) => b.b <= lay.vh + 1 && b.r <= lay.vw + 1), 'four buttons in two rows of two: nothing overlaps or leaves the screen');
  ok(Math.abs(lay.bs[2].t - lay.bs[3].t) < 2 && lay.bs[3].t > lay.bs[0].t + 5, 'the kept move and Switch share the second row');
  await shot('battle-three-moves');
  // guard, take the hit, see the counter message
  await ev(() => { A.UI.B.b.rng = () => 0.99; const B = A.Rules.Battle, act0 = B.act; window.__ev = []; window.__log = []; const lg = document.querySelector('#b-log'); new MutationObserver(() => window.__log.push(lg.textContent)).observe(lg, { childList: true, subtree: true, characterData: true }); B.act = function () { const r = act0.apply(this, arguments); window.__ev.push(...r.map((e) => e.t + (e.who ? ':' + e.who : ''))); return r; }; document.querySelector('#b-actions .abtn[data-id="leafguard"]').click(); });
  await until(() => !A.UI.B.busy && document.querySelector('#b-actions .abtn.ready'), null, 30000);
  const evT = await ev(() => window.__ev.join(' '));
  // Phase 17C: guard recoil now follows the counter message in the log, so read every line shown, not just the last.
  const logT = await ev(() => window.__log.join(' | ') + ' | ' + document.querySelector('#b-log').textContent);
  ok(/hit:p counter:p/.test(evT) && /ready to strike back/.test(logT), 'guarding a hit readies a counter, and the battle log says so (events: ' + evT + ')');
  await shot('battle-counter');
  await ev(() => { A.UI.leaveBattle(() => {}); A.Rules.abandonRun(A.State.state); });
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\n' + (fail ? 'FAILED: ' : '') + pass + ' passed, ' + fail + ' failed (browser-combat17b)'); process.exitCode = fail ? 1 : 0;
})();
