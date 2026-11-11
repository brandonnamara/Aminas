// Hide and Seek redesign, real-browser test (Chromium + Playwright, software WebGL; NOT a phone): the lobby and vote,
// the 3D Starter Island round as hider and as Seeker, disguises, movement, the cooldown, attacks, the penalty,
// results, leaving, Battery saver / Reduce Motion, and the other PvP screens.
// Run: node tests/browser-hideseek.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
  const shot = async (n) => { if (SHOTS) { await sleep(300); await page.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
  const clean = () => page.evaluate(async () => { for (let i = 0; i < 15; i++) { await new Promise((r) => setTimeout(r, 80)); document.querySelectorAll('.dlg .dlg-skip').forEach((x) => x.click()); } document.querySelectorAll('.dlg,.toast').forEach((x) => x.remove()); if (A.UI.queue) A.UI.queue.length = 0; A.UI.closeAll(); });
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 60000 });
  // start a round with a chosen Seeker straight from a lobby (the vote itself is tested separately below)
  const round = async (seeker, look) => { await page.evaluate(([seeker, look]) => { A.UI.closeAll(); if (look) A.State.state.hideseek.seekerModel = look; A.UI.HS = { lobby: A.Rules.HideSeek.lobby(A.State.state, 4321), vote: null }; A.UI.HS.assign = { seeker: seeker === 'you' ? 'you' : A.UI.HS.lobby.players[1].id, method: 'vote', tally: {} }; A.UI.hsRound(); }, [seeker, look]); await until(() => A.UI.HSR && A.UI.HSR.view && document.querySelector('.hs-act')); await sleep(400); };
  const freezeBots = () => page.evaluate(() => { const m = A.UI.HSR.m; m.hiders.forEach((h) => { if (h.id !== 'you') h.bot = false; }); m.seeker.bot = m.seeker.id !== 'you' ? false : m.seeker.bot; });

  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.UI.hsRound);
  await page.evaluate(() => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = false; A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world'); await clean();

  /* 1, 2. the lobby and vote work as before, and the vote decides the Seeker of the 3D round */
  await page.evaluate(() => { A.UI.pvpMenu(); document.querySelector('[data-act="hideseek"]').click(); });
  await page.waitForSelector('[data-act="hsStart"]');
  const lob = await page.evaluate(() => ({ acts: ['hsPref', 'hsVote', 'hsNew', 'hsStart'].filter((a) => document.querySelector('[data-act="' + a + '"]')), players: document.querySelectorAll('.hs-pl').length, looks: document.querySelectorAll('[data-act="hsLook"]').length }));
  ok(lob.players === 5 && ['hsPref', 'hsNew', 'hsStart'].every((a) => lob.acts.includes(a)), 'the lobby shows the 5 players, role preference, New lobby and Start the vote, as before');
  await page.click('[data-act="hsPref"][data-p="seeker"]'); await page.waitForSelector('[data-act="hsVote"][data-id="you"]');
  await page.click('[data-act="hsVote"][data-id="you"]'); await shot('01-lobby');
  const expect = await page.evaluate(() => { const L = JSON.parse(JSON.stringify(A.UI.HS.lobby)), v = A.Rules.HideSeek.botVotes(L); v.you = A.UI.HS.vote; return { r: A.Rules.HideSeek.assignSeeker(L, v, JSON.parse(JSON.stringify(A.State.state.hideseek.seekerCount))), before: JSON.stringify(A.State.state.hideseek.seekerCount) }; });
  await page.click('[data-act="hsStart"]'); await page.waitForSelector('[data-act="hsGo"]');
  const asg = await page.evaluate(() => ({ a: A.UI.HS.assign, title: document.querySelector('.sheet h2').textContent, count: A.State.state.hideseek.seekerCount }));
  ok(JSON.stringify(asg.a) === JSON.stringify(expect.r), 'Start the vote counts the votes exactly as the voting rules do (' + asg.a.method + ', Seeker: ' + asg.a.seeker + ')');
  ok(Object.values(asg.count).reduce((a, b) => a + b, 0) === Object.values(JSON.parse(expect.before)).reduce((a, b) => a + b, 0) + 1, 'and records who was Seeker, as before');
  await shot('02-vote');
  await page.click('[data-act="hsGo"]'); await until(() => A.UI.HSR && A.UI.HSR.m && document.querySelector('.hs3d'));
  const st0 = await page.evaluate(() => ({ seeker: A.UI.HSR.m.seeker.id, hiders: A.UI.HSR.m.hiders.map((h) => h.id), ov: !!document.querySelector('.hsround') }));
  ok(st0.ov && st0.seeker === asg.a.seeker && st0.hiders.length === 4 && st0.hiders.indexOf(asg.a.seeker) < 0, 'the round opens on the Starter Island with the voted Seeker seeking and the other four hiding');
  await page.evaluate(() => A.UI.HSR.close());

  /* 3. the male and female seekers */
  const seekers = [];
  for (const look of ['male', 'female']) { await round('you', look); await sleep(300); seekers.push(await page.evaluate(() => A.UI.HSR.view.info().seeker)); if (look === 'female') await shot('03-seeker-female'); await page.evaluate(() => A.UI.HSR.close()); }
  ok(seekers[0] === 'voxel-male' && seekers[1] === 'voxel-female', 'the male and female seekers load (' + seekers.join(', ') + ')');
  const rig = await page.evaluate(async () => { const M = await import(new URL('src/3d/hideseek3d.js', document.baseURI).href); return ['male', 'female'].map((l) => { const o = M.buildSeeker(l, {}), P = o.userData.P; let tris = 0; o.traverse((x) => { if (x.geometry) tris += x.geometry.index.count / 3; }); return { parts: ['legL', 'legR', 'armL', 'armR', 'torso', 'head', 'staff'].every((k) => P[k]), tail: !!P.tail, tris }; }); });
  ok(rig.every((r) => r.parts) && rig[1].tail && !rig[0].tail && rig.every((r) => r.tris < 4000), 'both are rigged for walking, turning, attacking and celebrating, and light for mobile (' + rig.map((r) => r.tris + ' triangles').join(', ') + ')');
  ok(await page.evaluate(() => A.Data.HIDESEEK.seekerGlb && 'male' in A.Data.HIDESEEK.seekerGlb && 'female' in A.Data.HIDESEEK.seekerGlb), 'each has a slot for the Tripo model (.glb) that will replace it');

  /* 4, 5. a hider transforms into an island object that matches the genuine one */
  await round('bot'); await freezeBots();
  ok(await page.evaluate(() => A.UI.HSR.m.phase === 'prep' && !!document.querySelector('.hs-act.disguise')), 'as a hider the round opens in hiding time with the Disguise button');
  await shot('04-hide-start');
  await page.click('.hs-act'); await page.waitForSelector('.hs-tray.on .hs-card');
  const tray = await page.evaluate(() => ({ cards: document.querySelectorAll('.hs-card').length, looks: A.UI.HSR.m.looks.length, imgs: document.querySelectorAll('.hs-card img').length, near: document.querySelectorAll('.hs-card em').length }));
  ok(tray.cards === tray.looks && tray.imgs === tray.cards && tray.near > 0, 'Disguise opens the tray: every eligible island object with its picture (' + tray.cards + '), nearby ones first');
  await shot('05-tray');
  const pick = await page.evaluate(() => document.querySelector('.hs-card').dataset.k);
  await page.click('.hs-card'); await sleep(500);
  const me1 = await page.evaluate(() => { const m = A.UI.HSR.m, h = m.hiders.find((q) => q.id === 'you'); return { key: h.key, look: h.look, cmp: A.UI.HSR.view.compare('you'), wait: A.Rules.HideSeek.morphWait(m, h), tray: document.querySelector('.hs-tray.on') ? 1 : 0, valid: A.Rules.HideSeek.onLand(m, h.shape) && A.Rules.HideSeek.free(m, h.shape, 'you') }; });
  ok(me1.key === pick && me1.tray === 0, 'tapping a card transforms the hider (' + me1.look + ')');
  ok(me1.cmp && me1.cmp.sameGeometry && me1.cmp.sameMaterial && me1.cmp.tintRule && me1.cmp.extraMeshes === 0, 'the disguise uses the genuine object’s own model, material and tint, with nothing extra attached');
  ok(me1.valid, 'and stands on open ground without overlapping anything');
  await shot('06-disguised');
  // a building disguise needs room: walk the spirit next to a building and try; it is either placed clear of everything or refused
  const bld = await page.evaluate(() => { const m = A.UI.HSR.m, H = A.Rules.HideSeek, h = m.hiders.find((q) => q.id === 'you'); m.t += 10; const r = H.disguise(m, 'you', 'b:hatchery'); return { r, ok: !r.ok || H.onLand(m, h.shape) && H.free(m, h.shape, 'you') }; });
  ok(bld.ok, 'a building disguise is only placed where its whole footprint fits (' + (bld.r.ok ? 'placed' : 'refused: ' + bld.r.reason) + ')');

  /* 6. moving while disguised */
  const pos0 = await page.evaluate(() => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return [h.x, h.z, h.key]; });
  await page.keyboard.down('a'); await sleep(900); await page.keyboard.up('a');
  const pos1 = await page.evaluate(() => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return [h.x, h.z, h.key, A.UI.HSR.view.compare('you')]; });
  const dmov = Math.hypot(pos1[0] - pos0[0], pos1[1] - pos0[1]);
  ok(dmov > 0.05 && pos1[2] === pos0[2], 'the hider moves while disguised (' + dmov.toFixed(2) + ' units in 0.9 s, slowly)');
  // the joystick
  const box = await page.evaluate(() => { const r = document.querySelector('.hs-zone').getBoundingClientRect(); return [r.left + r.width * 0.4, r.top + r.height * 0.6]; });
  await page.mouse.move(box[0], box[1]); await page.mouse.down(); await page.mouse.move(box[0] + 40, box[1] - 10, { steps: 4 }); await sleep(600);
  const joy = await page.evaluate(() => { const i = A.UI.HSR.input; return Math.hypot(i.x, i.z); }); await page.mouse.up();
  ok(joy > 0.5 && (await page.evaluate(() => A.UI.HSR.input.x === 0 && A.UI.HSR.input.z === 0)), 'the on-screen joystick steers, and lets go cleanly');

  /* 7, 8. the 10-second cooldown */
  const cd = await page.evaluate(async () => { const m = A.UI.HSR.m, h = m.hiders.find((q) => q.id === 'you'), H = A.Rules.HideSeek; h.nextMorph = 0; const k1 = m.looks.find((k) => k !== h.key && H.look(k).size === 'small');
    const r1 = H.disguise(m, 'you', k1); await new Promise((r) => setTimeout(r, 350)); const label = document.querySelector('.hs-act small').textContent, cool = document.querySelector('.hs-act').classList.contains('cool');
    A.UI.HSR.tray(true); const k2 = m.looks.find((k) => k !== h.key && H.look(k).size === 'small'); document.querySelector('.hs-card[data-k="' + k2 + '"]').click(); await new Promise((r) => setTimeout(r, 120));
    return { r1: r1.ok, label, cool, keyAfter: h.key, k1, msg: document.querySelector('.hs-msg').textContent, head: document.querySelector('.hs-trayhead span') && document.querySelector('.hs-trayhead span').textContent, wait: H.morphWait(m, h) }; });
  ok(cd.r1 && cd.cool && /^\d+\.\ds$/.test(cd.label), 'after a transformation the Disguise button shows the cooldown counting down (' + cd.label + ')');
  ok(cd.keyAfter === cd.k1 && /recharging/.test(cd.msg) && /Ready in/.test(cd.head || ''), 'a change during the cooldown is refused and says how long is left (“' + cd.msg + '”)');
  await page.evaluate(() => { A.UI.HSR.tray(false); A.UI.HSR.tray(true); A.UI.HSR.tray(false); });
  ok((await page.evaluate(() => A.Rules.HideSeek.morphWait(A.UI.HSR.m, A.UI.HSR.m.hiders.find((q) => q.id === 'you')))) <= cd.wait, 'opening and closing the tray does not reset or skip the cooldown');
  await shot('07-cooldown');
  await page.evaluate(() => { const m = A.UI.HSR.m, h = m.hiders.find((q) => q.id === 'you'); m.t = h.nextMorph + 0.05; });
  const after = await page.evaluate(async () => { const m = A.UI.HSR.m, h = m.hiders.find((q) => q.id === 'you'), H = A.Rules.HideSeek; A.UI.HSR.tray(true); const k = m.looks.find((x) => x !== h.key && H.look(x).size !== 'huge'); document.querySelector('.hs-card[data-k="' + k + '"]').click(); await new Promise((r) => setTimeout(r, 120)); return { k, key: h.key }; });
  ok(after.key === after.k, 'when the cooldown is over the hider can change again');

  /* hiding ends: the computer Seeker hunts; then spectating when found */
  await page.evaluate(() => { const m = A.UI.HSR.m; m.seeker.bot = true; m.t = A.Data.HIDESEEK.prep - 0.1; });
  await until(() => A.UI.HSR.m.phase === 'seek'); await until(() => A.UI.HSR.m.seeker.moved > 0.5, null, 60000).catch(() => {});
  const hunt = await page.evaluate(() => { const s = A.UI.HSR.m.seeker; s.bot = false; /* stop it here so the frozen hiders by the start are not all found during a slow screenshot */ return { moved: s.moved, phase: document.querySelector('.hs-phase').textContent }; });
  ok(hunt.moved > 0.5 && hunt.phase === 'Search', 'the search starts and the computer Seeker sets off across the island');
  await shot('08-search');
  await page.evaluate(() => { const m = A.UI.HSR.m, h = m.hiders.find((q) => q.id === 'you'); m.seeker.bot = false; const a = m.props[0]; m.seeker.x = h.x - (h.shape.r || h.shape.hx) - 0.4; m.seeker.z = h.z; m.seeker.face = 0; m.seeker.nextAttack = 0; const t = A.Rules.HideSeek.target(m); if (!t || t.id !== 'you') { h.found = true; h.foundAt = m.t; m.events.push({ type: 'reveal', id: 'you', x: h.x, z: h.z, t: m.t, n: ++m.evN }); } else A.Rules.HideSeek.attack(m); });
  await until(() => document.querySelector('.hsround.spectate')); await sleep(900);
  const spec = await page.evaluate(() => ({ focus: A.UI.HSR.view.focusId === A.UI.HSR.m.seeker.id, skip: getComputedStyle(document.querySelector('.hs-skip')).display !== 'none', msg: document.querySelector('.hs-msg').textContent }));
  ok(spec.focus && spec.skip, 'a found hider watches the Seeker for the rest of the round, with Skip to results');
  await shot('09-found');
  await page.click('.hs-skip'); await page.waitForSelector('.hsresults');
  const res1 = await page.evaluate(() => ({ played: A.State.state.hideseek.played, won: A.State.state.hideseek.won, rows: document.querySelectorAll('.hs-tbl tbody tr').length, seek: !!document.querySelector('.hs-side.seek .hs-stats'), canvas: !!document.querySelector('.hs3d'), live: !!A.UI.HSR }));
  ok(res1.rows === 4 && res1.seek && res1.played === 1 && res1.won === 0, 'the results show both sides and count the game (played 1, won 0)');
  ok(!res1.canvas && !res1.live, 'the round’s 3D view is gone once the results show');
  await shot('10-results-hider');
  await page.evaluate(() => A.UI.closeAll());

  /* 9, 10, 11. as the Seeker: inspecting is free, a hit reveals, scenery costs 3 seconds */
  await round('you', 'male'); await freezeBots();
  ok(await page.evaluate(() => !!document.querySelector('.hs-veil.on') && A.UI.HSR.m.phase === 'prep'), 'as the Seeker, hiding time is spent counting behind a veil');
  await shot('11-counting');
  await page.evaluate(() => { const m = A.UI.HSR.m; m.t = A.Data.HIDESEEK.prep - 0.05; }); await until(() => A.UI.HSR.m.phase === 'seek');
  await page.keyboard.down('w'); await sleep(700); await page.keyboard.up('w'); await page.keyboard.down('d'); await sleep(700); await page.keyboard.up('d');
  const insp = await page.evaluate(() => { const s = A.UI.HSR.m.seeker; return { attacks: s.attacks, pen: A.Rules.HideSeek.penaltyLeft(A.UI.HSR.m), moved: s.moved }; });
  ok(insp.moved > 0.5 && insp.attacks === 0 && insp.pen === 0, 'walking up to and around objects costs nothing (no attack, no penalty)');
  const hit = await page.evaluate(async () => { const m = A.UI.HSR.m, H = A.Rules.HideSeek, h = m.hiders.find((q) => q.key && !q.found); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, d = (h.shape.r != null ? h.shape.r : Math.max(h.shape.hx, h.shape.hz)) + 0.4; m.seeker.x = h.x + Math.cos(a) * d; m.seeker.z = h.z + Math.sin(a) * d; m.seeker.face = a + Math.PI; const t = H.target(m); if (t && t.id === h.id && H.onLand(m, { x: m.seeker.x, z: m.seeker.z, r: 0.28 })) break; }
    m.seeker.nextAttack = 0; await new Promise((r) => setTimeout(r, 250)); const aim = !!H.inspect(m); document.querySelector('.hs-act').click(); await new Promise((r) => setTimeout(r, 450));
    return { found: h.found, name: h.name, aim, msg: document.querySelector('.hs-msg').textContent, left: document.querySelector('.hs-pips b').textContent, got: document.querySelectorAll('.hs-pip.got').length }; });
  ok(hit.aim && hit.found && /Found/.test(hit.msg) && hit.left === '3 left' && hit.got === 1, 'Attack on a disguised hider reveals them: “' + hit.msg + '”, hiders left 3');
  await shot('12-reveal');
  const miss = await page.evaluate(async () => { const m = A.UI.HSR.m, H = A.Rules.HideSeek; m.t += 1; let p = null;
    for (const q of m.props.filter((x) => x.key && x.reach && x.shape.r != null)) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; m.seeker.x = q.x + Math.cos(a) * (q.shape.r + 0.4); m.seeker.z = q.z + Math.sin(a) * (q.shape.r + 0.4); m.seeker.face = a + Math.PI; const t = H.target(m); if (t && t.id === q.id && H.onLand(m, { x: m.seeker.x, z: m.seeker.z, r: 0.28 })) { p = q; break; } } if (p) break; }
    m.seeker.nextAttack = 0; const s0 = { a: m.seeker.attacks, miss: m.seeker.misses }; document.querySelector('.hs-act').click(); await new Promise((r) => setTimeout(r, 300));
    const pen = H.penaltyLeft(m), btn = document.querySelector('.hs-act'), msg = document.querySelector('.hs-msg').textContent, a1 = m.seeker.attacks; document.querySelector('.hs-act').click(); await new Promise((r) => setTimeout(r, 120));
    return { look: p.look, pen, cls: btn.className, label: btn.querySelector('small').textContent, msg, again: m.seeker.attacks === a1, msg2: document.querySelector('.hs-msg').textContent, revealed: m.hiders.filter((h) => h.found).length, miss: m.seeker.misses - s0.miss }; });
  ok(miss.miss === 1 && miss.pen > 2.5 && miss.pen <= 3 && miss.revealed === 1, 'attacking genuine scenery (' + miss.look + ') reveals nobody and starts the 3-second penalty');
  ok(/Just/.test(miss.msg) && /pen/.test(miss.cls) && /\d\.\ds/.test(miss.label), 'with restrained feedback: “' + miss.msg + '” and the button counting down (' + miss.label + ')');
  ok(miss.again && /Penalty/.test(miss.msg2), 'a second attack during the penalty does nothing');
  await shot('13-penalty');
  // a wall between: no reveal through a building
  const wall = await page.evaluate(() => { const m = A.UI.HSR.m, H = A.Rules.HideSeek, b = m.props.find((p) => p.key === 'b:forge'), h = m.hiders.find((q) => !q.found); const sv = [h.x, h.z]; h.x = b.x + b.shape.hx + 0.45; h.z = b.z; h.shape.x = h.x; h.shape.z = h.z; m.seeker.x = b.x - b.shape.hx - 0.35; m.seeker.z = b.z; m.seeker.face = 0; const t = H.target(m, { reach: 8 }); h.x = sv[0]; h.z = sv[1]; h.shape.x = sv[0]; h.shape.z = sv[1]; return !t || t.id !== h.id; });
  ok(wall, 'a hider behind a building cannot be hit through its walls');
  await page.evaluate(() => { const m = A.UI.HSR.m; m.hiders.forEach((h) => { h.found = true; h.foundAt = m.t; }); });
  await page.waitForSelector('.hsresults', { timeout: 20000 });
  const res2 = await page.evaluate(() => ({ played: A.State.state.hideseek.played, won: A.State.state.hideseek.won, title: document.querySelector('.hsresults h2').textContent, h1: document.querySelector('.hsresults h1').textContent }));
  ok(res2.played === 2 && res2.won === 1 && /found everyone/.test(res2.title) && /win/.test(res2.h1), 'finding everyone ends the round: the Seeker wins and the win is counted (played 2, won 1)');
  await shot('14-results-seeker');
  const saved = await page.evaluate(() => { const k = Object.keys(localStorage).find((x) => /aminas/i.test(x) && localStorage.getItem(x).indexOf('"hideseek"') >= 0); return JSON.parse(localStorage.getItem(k)).hideseek; });
  ok(saved.played === 2 && saved.won === 1 && saved.seekerModel === 'male', 'the counters and the Seeker look are saved');
  await page.click('#hs-again'); await page.waitForSelector('[data-act="hsStart"]');
  ok(true, 'New lobby returns to the lobby');

  /* leaving and closing */
  await round('you');
  await page.click('[data-hs="leave"]'); await page.waitForSelector('#cf-yes'); await page.click('#cf-yes'); await page.waitForSelector('.hsresults');
  ok(await page.evaluate(() => !document.querySelector('.hs3d') && !A.UI.HSR && /hiders win/.test(document.querySelector('.hsresults h2').textContent)), 'leaving as the Seeker gives the round to the hiders and closes the 3D view');
  await page.evaluate(() => A.UI.closeAll());
  await round('bot'); const fr0 = await page.evaluate(() => A.UI.HSR.view.stats.frames); await page.evaluate(() => A.UI.closeAll()); await sleep(600);
  ok(await page.evaluate(() => !document.querySelector('.hs3d') && !A.UI.HSR), 'closing every panel mid-round disposes the 3D view and stops its loop');

  /* performance: Battery saver and Reduce Motion */
  await round('bot'); await sleep(1500);
  const perf = await page.evaluate(async () => { const v = A.UI.HSR.view, f0 = v.stats.frames, t0 = performance.now(); await new Promise((r) => setTimeout(r, 2000)); return Object.assign(v.info(), { fps: +((v.stats.frames - f0) / ((performance.now() - t0) / 1000)).toFixed(1), drawMs: v.stats.drawMs }); });
  ok(perf.fps <= 31 && perf.calls < 120, 'the round draws at most 30 frames a second (' + perf.fps + ' here, software graphics), ' + perf.calls + ' draw calls, ' + Math.round(perf.triangles / 1000) + 'k triangles, shadows ' + (perf.shadows ? 'on' : 'off'));
  await page.evaluate(() => A.UI.closeAll());
  await page.evaluate(() => { A.State.state.settings.batterySaver = true; A.Perf.apply && A.Perf.apply(); });
  await round('bot'); await sleep(800);
  const sv = await page.evaluate(() => A.UI.HSR.view.info()); await page.evaluate(() => A.UI.closeAll());
  ok(!sv.shadows && sv.fps === 20, 'Battery saver: no shadows and 20 frames a second');
  await page.evaluate(() => { A.State.state.settings.batterySaver = false; A.State.state.settings.reduceMotion = true; A.Perf.apply && A.Perf.apply(); });
  await round('bot'); await freezeBots(); await sleep(500);
  const rm = await page.evaluate(async () => { const m = A.UI.HSR.m, H = A.Rules.HideSeek, h = m.hiders.find((q) => q.id === 'you'); h.nextMorph = 0; const r = H.disguise(m, 'you', m.looks.find((k) => H.look(k).size === 'small')); await new Promise((r2) => setTimeout(r2, 200)); return { ok: r.ok }; });
  ok(rm.ok, 'with Reduce Motion the round plays the same (shorter, fewer effects; no camera shake)');
  await page.evaluate(() => { A.UI.closeAll(); A.State.state.settings.reduceMotion = false; });

  /* 15. other modes */
  const others = await page.evaluate(async () => { A.UI.closeAll(); A.UI.pvpMenu(); const m = [...document.querySelectorAll('.mcard')].map((x) => x.dataset.act); A.UI.closeAll(); A.UI.pvp5(); const p5 = !!document.querySelector('[data-act="pvpPlay"]'); A.UI.closeAll(); A.UI.defence(); const df = !!document.querySelector('[data-act="defRaid"]'); A.UI.closeAll(); return { m, p5, df }; });
  ok(['pvp5', 'defence', 'hideseek'].every((x) => others.m.includes(x)) && others.p5 && others.df, 'the PvP menu, 5v5 and Island Defence still open as before');
  await page.evaluate(() => A.UI.showIsland()); await sleep(800);
  ok(await page.evaluate(() => !!document.querySelector('#world') && A.UI.screen === 'island' && !document.querySelector('.hsround')), 'the island screen comes back after the round');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-hideseek)'); await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
