// Phase 12C real-browser test (Chromium + Playwright, software WebGL; NOT a phone): the joystick, the independent
// camera, spectating for hiders and the proximity points, with real multi-touch input injected through Chrome's touch
// pipeline (so several fingers are down at once, as on a phone). Touch feel on an actual iPhone is not tested here.
// Run: node tests/browser-hideseek12c.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); const cdp = await ctx.newCDPSession(page);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
  const shot = async (n) => { if (SHOTS) { await sleep(300); await page.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 60000 });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // fingers: every call sends the whole set of touches now on the glass, as a phone does
  const fingers = new Map();
  const send = (type) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...fingers.values()].map((t) => ({ x: t.x, y: t.y, id: t.id, radiusX: 9, radiusY: 9, force: 1 })) });
  const down = async (id, x, y) => { fingers.set(id, { id, x, y }); await send('touchStart'); };
  const moveTo = async (id, x, y, steps) => { const f = fingers.get(id), x0 = f.x, y0 = f.y; steps = steps || 6; for (let i = 1; i <= steps; i++) { f.x = x0 + (x - x0) * i / steps; f.y = y0 + (y - y0) * i / steps; await send('touchMove'); } };
  const up = async (id) => { fingers.delete(id); await send(fingers.size ? 'touchEnd' : 'touchEnd'); };
  const tapEl = async (sel, id) => { const r = await ev((s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, sel); await down(id || 9, r[0], r[1]); await up(id || 9); };
  const frames = (n) => ev((n) => new Promise((res) => { const v = A.UI.HSR.view, f0 = v.stats.frames; const t = setInterval(() => { if (!A.UI.HSR || !A.UI.HSR.view || A.UI.HSR.view.stats.frames >= f0 + n) { clearInterval(t); res(); } }, 30); }), n || 2);
  const settle = () => until(() => { const c = A.UI.HSR.view.camera(); return Math.abs(c.yaw - c.targetYaw) < 1e-3 && Math.abs(c.pitch - c.targetPitch) < 1e-3; });
  const camNow = () => ev(() => A.UI.HSR.view.camera());
  // wait until the player's disguise has stopped settling (it leans and hops for a moment after it is moved)
  const still = async () => { let a = await ev(() => A.UI.HSR.view.disguiseMatrix('you')); for (let i = 0; i < 60; i++) { await frames(3); const b = await ev(() => A.UI.HSR.view.disguiseMatrix('you')); if (a && b && a.every((x, k) => Math.abs(x - b[k]) < 1e-9)) return b; a = b; } return a; };
  const round = async (seeker, look) => { await ev(([seeker, look]) => { A.UI.closeAll(); if (look) A.State.state.hideseek.seekerModel = look; A.UI.HS = { lobby: A.Rules.HideSeek.lobby(A.State.state, 4321), vote: null }; A.UI.HS.assign = { seeker: seeker === 'you' ? 'you' : A.UI.HS.lobby.players[1].id, method: 'vote', tally: {} }; A.UI.hsRound(); }, [seeker, look]); await until(() => A.UI.HSR && A.UI.HSR.view && document.querySelector('.hs-act')); await sleep(300); };
  const freeze = () => ev(() => { const m = A.UI.HSR.m; m.hiders.forEach((h) => { if (h.id !== 'you') h.bot = false; }); if (m.seeker.id !== 'you') m.seeker.bot = false; });
  // put everyone somewhere known: the player's disguise in the open, the other hiders disguised well away from it
  const stage = () => ev(() => { const m = A.UI.HSR.m, H = A.Rules.HideSeek, me = m.hiders.find((h) => h.id === 'you'); const set = (e, x, z) => { e.x = x; e.z = z; if (e.shape) { e.shape.x = x; e.shape.z = z; } };
    const open = (look, cx, cz, clear) => { const cells = [...m.cells.values()].filter((c) => c.walk).sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz)); for (const c of cells) { const x = c.x + 0.5, z = c.z + 0.5; if (H.valid(m, look, x, z, 'none') && !m.props.some((p) => Math.hypot(p.x - x, p.z - z) < clear + (p.shape.r || Math.max(p.shape.hx, p.shape.hz))) && !m.hiders.some((h) => h.key && Math.hypot(h.x - x, h.z - z) < clear)) return { x, z }; } return null; };
    m.hiders.forEach((h, i) => { if (h.id === 'you') return; set(h, 2 + i, 2); }); set(m.seeker, 3, 27);
    if (me) { const q = open(H.look('o:bush'), 15, 15, 2.4); set(me, q.x, q.z); me.nextMorph = 0; H.disguise(m, 'you', 'o:bush'); me.nextMorph = 0; }
    const far = [[6, 22], [24, 20], [22, 6], [9, 9]]; m.hiders.filter((h) => h.id !== 'you').forEach((h, i) => { const q = open(H.look('o:pebble'), far[i][0], far[i][1], 1.2); set(h, q.x, q.z); h.nextMorph = 0; H.disguise(m, h.id, 'o:pebble'); });
    const s = open({ r: 0.28 }, 3, 26, 0.8); if (m.seeker.id !== 'you') set(m.seeker, s.x, s.z); return me ? { x: me.x, z: me.z } : null; });
  // The tests take much longer than a round, so the round clock is held where each part needs it: `hold` keeps the
  // round in hiding time, `long` keeps the search from timing out, `normal` puts the real timings back.
  const CFG = { prep: 0, seconds: 0 };
  const hold = () => ev(() => { A.Data.HIDESEEK.prep = 1e6; }), long = () => ev(() => { A.Data.HIDESEEK.seconds = 1e5; });
  const normal = () => ev((c) => { A.Data.HIDESEEK.prep = c.prep; A.Data.HIDESEEK.seconds = c.seconds; }, CFG);
  // move the player's spirit to a wide open patch (room to walk two units any way)
  const openSpirit = () => ev(() => { const m = A.UI.HSR.m, H = A.Rules.HideSeek, me = m.seeker.id === 'you' ? m.seeker : m.hiders.find((h) => h.id === 'you'); const cells = [...m.cells.values()].filter((c) => c.walk).sort((a, b) => Math.hypot(a.x - 15, a.z - 15) - Math.hypot(b.x - 15, b.z - 15));
    for (const c of cells) { const x = c.x + 0.5, z = c.z + 0.5; if ([0, 1, 2, 3, 4, 5, 6, 7].every((i) => [0.6, 1.2, 1.8].every((r) => H.valid(m, { r: 0.26 }, x + Math.cos(i / 8 * Math.PI * 2) * r, z + Math.sin(i / 8 * Math.PI * 2) * r, 'you')))) { me.x = x; me.z = z; if (me.shape) { me.shape.x = x; me.shape.z = z; } return [x, z]; } } return null; });
  const toSeek = async () => { await ev(() => { const m = A.UI.HSR.m; m.t = A.Data.HIDESEEK.prep - 0.02; }); await until(() => A.UI.HSR.m.phase === 'seek'); };

  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.UI.hsRound);
  await ev(() => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = false; A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world'); await ev(async () => { for (let i = 0; i < 12; i++) { await new Promise((r) => setTimeout(r, 80)); document.querySelectorAll('.dlg .dlg-skip').forEach((x) => x.click()); } document.querySelectorAll('.dlg,.toast').forEach((x) => x.remove()); if (A.UI.queue) A.UI.queue.length = 0; A.UI.closeAll(); });
  const res0 = await ev(() => JSON.stringify(A.State.state.res));
  Object.assign(CFG, await ev(() => ({ prep: A.Data.HIDESEEK.prep, seconds: A.Data.HIDESEEK.seconds })));

  /* ============ 1. the joystick ============ */
  await round('bot'); await freeze(); await hold();
  const geo = await ev(() => { const z = document.querySelector('.hs-zone').getBoundingClientRect(), c = document.querySelector('.hs-camzone').getBoundingClientRect(), S = A.Data.HIDESEEK.stick, R = Math.max(S.min, Math.min(S.max, document.querySelector('.hsround').clientHeight * S.radius)); return { z: [z.left, z.top, z.right, z.bottom], c: [c.left, c.top, c.right, c.bottom], R, dead: S.dead * R, full: S.full * R, min: S.minSpeed }; });
  ok(geo.z[2] <= geo.c[0] + 0.5 && geo.z[0] === 0 && Math.abs(geo.c[2] - 844) < 1, 'the left of the screen is the joystick area and the right is the camera area; they do not overlap');
  const J = { x: 150, y: 260 }, inp = () => ev(() => { const i = A.UI.HSR.input; return { sx: i.sx, sy: i.sy, on: document.querySelector('.hs-stick').classList.contains('on') }; });
  await down(1, J.x, J.y); let i0 = await inp();
  ok(i0.on && i0.sx === 0 && i0.sy === 0, 'the joystick appears under the thumb and does nothing until it is pushed');
  await moveTo(1, J.x + geo.dead * 0.6, J.y, 2); const iDead = await inp();
  ok(iDead.sx === 0 && iDead.sy === 0, 'dead zone: a resting or trembling thumb (' + (geo.dead * 0.6).toFixed(1) + ' px) does not move the player');
  await moveTo(1, J.x + (geo.dead + geo.full) / 2, J.y, 3); const iHalf = await inp();
  ok(iHalf.sx > geo.min && iHalf.sx < 0.9 && Math.abs(iHalf.sy) < 1e-6, 'a part push gives a part speed (' + iHalf.sx.toFixed(2) + ' of full)');
  await moveTo(1, J.x + geo.full + 1, J.y, 2); const iFull = await inp();
  ok(Math.abs(iFull.sx - 1) < 1e-6, 'full speed is reached before the edge of the stick (' + geo.full.toFixed(0) + ' of ' + geo.R.toFixed(0) + ' px)');
  await moveTo(1, J.x + 40, J.y - 40, 3); const iDiag = await inp();
  ok(Math.abs(Math.hypot(iDiag.sx, iDiag.sy) - 1) < 1e-6 && Math.abs(iDiag.sx - Math.SQRT1_2) < 0.02 && Math.abs(iDiag.sy + Math.SQRT1_2) < 0.02, 'a diagonal push is a true diagonal at the same full speed, not faster (' + iDiag.sx.toFixed(2) + ', ' + iDiag.sy.toFixed(2) + ')');
  await moveTo(1, J.x + 150, J.y, 5); const iFar = await inp(); await moveTo(1, J.x + 150 - geo.R * 1.5, J.y, 4); const iRev = await inp();
  ok(Math.hypot(iFar.sx, iFar.sy) > 0.999 && iFar.sx > 0.9 && iRev.sx < -0.3, 'when the thumb slides far past the edge (150 px) the stick follows it, so turning back takes about one stick radius of travel (' + (geo.R * 1.5).toFixed(0) + ' px here), not the whole way back');
  await up(1); const iUp = await inp();
  ok(!iUp.on && iUp.sx === 0 && iUp.sy === 0, 'lifting the thumb stops the player at once');
  const nd = await ev(() => { const v = A.UI.HSR.view, n = (a, b) => { const d = v.dirFromScreen(a, b); return Math.hypot(d.x, d.z); }; return [n(1, 0), n(0, -1), n(1, -1), n(0.7071, -0.7071), n(0.5, 0)]; });
  ok(nd.slice(0, 4).every((x) => Math.abs(x - 1) < 1e-4) && Math.abs(nd[4] - 0.5) < 1e-6, 'on the island, every direction moves at the same speed for the same push');
  // the stick moves the player, in the direction it points on screen
  await ev(() => A.UI.HSR.view.setCamera(0, null)); await openSpirit();
  let p0 = await ev(() => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return [h.x, h.z]; });
  await down(1, J.x, J.y); await moveTo(1, J.x, J.y - 50, 3); await until((p) => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return Math.hypot(h.x - p[0], h.z - p[1]) > 0.35; }, p0); await up(1);
  let p1 = await ev(() => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return [h.x, h.z]; }); let dir = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
  ok(Math.abs(dir) < 0.2, 'pushing the stick up moves the player away from the camera (the way the camera faces)');
  await ev(() => A.UI.HSR.view.setCamera(Math.PI / 2, null)); p0 = await openSpirit();
  await down(1, J.x, J.y); await moveTo(1, J.x, J.y - 50, 3); await until((p) => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return Math.hypot(h.x - p[0], h.z - p[1]) > 0.35; }, p0); await up(1);
  p1 = await ev(() => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return [h.x, h.z]; }); dir = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
  ok(Math.abs(dir - Math.PI / 2) < 0.2, 'after the camera is turned a quarter turn, the same push moves the player the new way: movement follows the screen');
  await ev(() => A.UI.HSR.view.setCamera(-Math.PI * 0.75, null));

  /* ============ 2. the camera ============ */
  const sens = await ev(() => A.Data.HIDESEEK.camera);
  let c0 = await camNow();
  ok(Math.abs(c0.yaw + Math.PI * 0.75) < 1e-6 && Math.abs(c0.pitch - sens.pitch * Math.PI / 180) < 1e-6, 'the round opens with the island’s familiar view');
  const C = { x: 600, y: 220 };
  // standing still (a spirit, not yet disguised)
  let me0 = await ev(() => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return [h.x, h.z, h.face]; });
  await down(2, C.x, C.y); await moveTo(2, C.x + 120, C.y, 8); const cDrag = await camNow(); await up(2); await settle(); let c1 = await camNow();
  const turned = c1.yaw - c0.yaw;
  ok(Math.abs(Math.abs(turned) - 120 * sens.sens) < 0.08 && Math.abs(c1.pitch - c0.pitch) < 1e-6, 'dragging on the right turns the camera while standing still (' + (turned * 180 / Math.PI).toFixed(0) + '° for a 120 px drag)');
  ok(Math.abs(cDrag.targetYaw - c1.yaw) < 1e-6 && Math.abs(cDrag.yaw - cDrag.targetYaw) > 1e-4 || Math.abs(cDrag.yaw - c1.yaw) < 1e-3, 'the turn is smoothed: the view eases to where the finger put it');
  let me1 = await ev(() => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return [h.x, h.z, h.face]; });
  ok(JSON.stringify(me0) === JSON.stringify(me1), 'turning the camera does not move or turn the player');
  await down(2, C.x, C.y); await moveTo(2, C.x - 120, C.y, 8); await up(2); await settle(); const cBack = await camNow();
  ok(Math.abs(cBack.yaw - c0.yaw) < 0.02, 'dragging back the other way turns it back');
  // tilt and its limits
  await down(2, C.x, C.y); await moveTo(2, C.x, C.y + 150, 6); await moveTo(2, C.x, C.y + 600, 6); await up(2); await settle(); const cHi = await camNow();
  await down(2, C.x, 380); await moveTo(2, C.x, 200, 6); await moveTo(2, C.x, -800, 8); await up(2); await settle(); const cLo = await camNow();
  ok(Math.abs(Math.max(cHi.pitch, cLo.pitch) - cHi.max) < 1e-6 && Math.abs(Math.min(cHi.pitch, cLo.pitch) - cHi.min) < 1e-6 && cHi.min > 0.3, 'dragging up and down tilts the camera, stopped at its limits (' + (cHi.min * 180 / Math.PI).toFixed(0) + '° to ' + (cHi.max * 180 / Math.PI).toFixed(0) + '°), so it never goes under the ground or flat overhead');
  await ev(() => A.UI.HSR.view.setCamera(-Math.PI * 0.75, 30 * Math.PI / 180));
  // while moving: one thumb on the stick, another finger turning the camera
  await openSpirit(); p0 = await ev(() => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return [h.x, h.z]; }); c0 = await camNow();
  await down(1, J.x, J.y); await moveTo(1, J.x - 50, J.y, 3); await down(2, C.x, C.y); await moveTo(2, C.x + 90, C.y, 6);
  await until((p) => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return Math.hypot(h.x - p[0], h.z - p[1]) > 0.3; }, p0);
  const both = await ev(() => ({ in: A.UI.HSR.input.sx, cam: A.UI.HSR.view.camera().targetYaw })); await up(2); await up(1); await settle();
  ok(Math.abs(both.in + 1) < 1e-6 && Math.abs(Math.abs(both.cam - c0.yaw) - 90 * sens.sens) < 0.08, 'moving and turning the camera work at the same time, each finger on its own');
  await shot('01-camera-turned');
  // while disguised: the disguise is never turned by the camera
  await stage(); await still();
  const mx0 = await ev(() => ({ m: A.UI.HSR.view.disguiseMatrix('you'), ry: A.UI.HSR.m.hiders.find((q) => q.id === 'you').ry }));
  await down(2, C.x, C.y); await moveTo(2, C.x + 200, C.y - 40, 10); await up(2); await settle(); await frames(3);
  const mx1 = await ev(() => ({ m: A.UI.HSR.view.disguiseMatrix('you'), ry: A.UI.HSR.m.hiders.find((q) => q.id === 'you').ry, cam: A.UI.HSR.view.camera().yaw }));
  ok(mx0.m && mx1.m && mx0.m.every((x, i) => Math.abs(x - mx1.m[i]) < 1e-6) && mx0.ry === mx1.ry && Math.abs(mx1.cam + Math.PI * 0.75) > 0.5, 'turning the camera while disguised leaves the disguise exactly as it stood (same position and orientation)');
  const cmp = await ev(() => A.UI.HSR.view.compare('you')); ok(cmp.sameGeometry && cmp.sameMaterial && cmp.extraMeshes === 0, 'and it still matches its genuine twin from every side');
  await shot('02-disguised-other-angle');
  // buttons and the camera do not interfere
  c0 = await camNow(); await tapEl('.hs-act'); await frames(2);
  ok(await ev(() => !!document.querySelector('.hs-tray.on')) && Math.abs((await camNow()).targetYaw - c0.targetYaw) < 1e-9, 'pressing Disguise opens the disguises and does not turn the camera');
  const cards = await ev(() => { const r = document.querySelector('.hs-cards').getBoundingClientRect(); return [r.left + 60, r.top + r.height / 2, document.querySelector('.hs-cards').scrollLeft]; });
  const key0 = await ev(() => A.UI.HSR.m.hiders.find((q) => q.id === 'you').key);
  await down(3, cards[0] + 200, cards[1]); await moveTo(3, cards[0], cards[1], 6); await up(3); await frames(2);
  ok(Math.abs((await camNow()).targetYaw - c0.targetYaw) < 1e-9 && (await ev(() => A.UI.HSR.m.hiders.find((q) => q.id === 'you').key)) === key0, 'swiping the disguise strip scrolls it: it does not turn the camera or pick a disguise');
  await ev(() => A.UI.HSR.tray(false));
  const btn = await ev(() => { const b = document.querySelector('.hs-act').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
  await down(2, btn[0] - 190, btn[1] - 60); await moveTo(2, btn[0], btn[1], 8); await moveTo(2, btn[0] + 5, btn[1] + 5, 2); await up(2); await settle();
  ok(!(await ev(() => !!document.querySelector('.hs-tray.on'))) && Math.abs((await camNow()).yaw - c0.yaw) > 0.5, 'a camera drag that passes over a button keeps turning the camera and does not press the button');
  ok(await ev(() => !document.querySelector('.hs-camzone') || !!document.querySelector('.hsround .hs-camzone')), 'the camera area exists only inside the round');
  // desktop: keys still work
  p0 = await ev(() => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return [h.x, h.z]; }); c0 = await camNow();
  await page.keyboard.down('d'); await until((p) => { const h = A.UI.HSR.m.hiders.find((q) => q.id === 'you'); return Math.hypot(h.x - p[0], h.z - p[1]) > 0.1; }, p0); await page.keyboard.up('d');
  await page.keyboard.down('c'); await until((y) => Math.abs(A.UI.HSR.view.camera().targetYaw - y) > 0.15, c0.targetYaw); await page.keyboard.up('c'); await settle();
  ok(true, 'desktop controls are kept: WASD or the arrow keys move, and Z / C turn the camera');
  // letting go when the app loses focus
  await down(1, J.x, J.y); await moveTo(1, J.x + 50, J.y, 3); await ev(() => window.dispatchEvent(new Event('blur'))); const blur = await inp(); await up(1);
  ok(blur.sx === 0 && blur.sy === 0, 'if the app loses focus mid-touch, the stick lets go (nobody keeps walking)');
  const info = await ev(() => A.UI.HSR.view.info());
  ok(info.markerOnTop && info.silhouette === 0, 'scenery between the camera and the player: the marker over the player’s own disguise is drawn on top, and a hiding player gets no see-through view of anyone');

  /* ============ 3. spectating ============ */
  await ev(() => A.UI.HSR.view.setCamera(-Math.PI * 0.75, 30 * Math.PI / 180));
  const sb = await ev(() => { const b = document.querySelector('.hs-specbtn'); return { text: b.textContent.trim(), aria: b.getAttribute('aria-label'), off: b.classList.contains('off'), shown: getComputedStyle(b).display !== 'none' }; });
  ok(sb.shown && sb.text === 'Spectate' && /Spectate/.test(sb.aria) && !sb.off, 'a disguised hider has a clearly labelled Spectate button');
  // not while moving
  await down(1, J.x, J.y); await moveTo(1, J.x + 50, J.y, 3); await tapEl('.hs-specbtn', 4); await frames(1);
  const mv = await ev(() => ({ id: A.UI.HSR.spec.id(), msg: document.querySelector('.hs-msg').textContent })); await up(1);
  ok(mv.id === null && /Stand still/.test(mv.msg), 'spectating is for a hider standing still: while moving it says “' + mv.msg + '”');
  const before = await ev(() => { const m = A.UI.HSR.m, h = m.hiders.find((q) => q.id === 'you'); return { x: h.x, z: h.z, key: h.key, found: h.found, mx: A.UI.HSR.view.disguiseMatrix('you') }; });
  const mxStill = await still();
  await tapEl('.hs-specbtn', 4); await frames(2);
  const s1 = await ev(() => { const R0 = A.UI.HSR, m = R0.m; return { id: R0.spec.id(), focus: R0.view.focusId, mine: R0.view.mineId, bar: getComputedStyle(document.querySelector('.hs-specbar')).display !== 'none', name: document.querySelector('.hs-specbar b').textContent, n: document.querySelector('.hs-specbar em').textContent, back: document.querySelector('.hs-specback').textContent, act: document.querySelector('.hs-act small').textContent, seeker: m.seeker.id, hid: m.hiders.map((h) => h.id), names: Object.fromEntries(m.hiders.map((h) => [h.id, h.name])) }; });
  ok(s1.id && s1.id !== 'you' && s1.id !== s1.seeker && s1.focus === s1.id && s1.bar && s1.name === s1.names[s1.id] && /^[123] of 3$/.test(s1.n), 'Spectate moves the camera to another hider (' + s1.name + ', ' + s1.n + '), never the Seeker');
  ok(/Return to my disguise/.test(s1.back) && s1.act === 'Return' && s1.mine === 'you', 'with a Return to my disguise button; the player’s own marker stays on their own disguise');
  await shot('03-spectating');
  const seen = [s1.id]; for (let i = 0; i < 3; i++) { await tapEl('[data-hs="spec-next"]', 4); await frames(1); seen.push(await ev(() => A.UI.HSR.spec.id())); }
  await tapEl('[data-hs="spec-prev"]', 4); await frames(1); const prev = await ev(() => A.UI.HSR.spec.id());
  ok(new Set(seen.slice(0, 3)).size === 3 && seen[3] === seen[0] && prev === seen[2] && seen.every((x) => x !== 'you' && x !== s1.seeker), 'the arrows cycle through the other hiders and round again (' + seen.map((x) => s1.names[x]).join(' → ') + ')');
  // only the camera changes: the stick does not move the disguise, and nothing marks the watched hider
  await down(1, J.x, J.y); await moveTo(1, J.x + 50, J.y - 20, 3); await frames(6); await up(1);
  const during = await ev(() => { const R0 = A.UI.HSR, m = R0.m, h = m.hiders.find((q) => q.id === 'you'); return { x: h.x, z: h.z, key: h.key, found: h.found, mx: R0.view.disguiseMatrix('you'), msg: document.querySelector('.hs-msg').textContent, cmp: R0.view.compare(R0.spec.id()), tray: !!document.querySelector('.hs-tray.on') }; });
  ok(during.x === before.x && during.z === before.z && during.key === before.key && !during.found && during.mx.every((x, i) => Math.abs(x - mxStill[i]) < 1e-6), 'while spectating, the player’s disguise stays exactly where it is, even if the stick is pushed (“' + during.msg + '”)');
  ok(during.cmp && during.cmp.extraMeshes === 0 && during.cmp.sameMaterial, 'the watched hider is shown as it is: no marker, outline or label is added to it');
  c0 = await camNow(); await down(2, C.x, C.y); await moveTo(2, C.x + 100, C.y, 6); await up(2); await settle();
  ok(Math.abs((await camNow()).yaw - c0.yaw) > 0.4 && (await ev(() => A.UI.HSR.spec.id())) === prev, 'the camera can be turned while spectating');
  await ev(() => A.UI.HSR.view.setCamera(-Math.PI * 0.75, null));
  // points keep coming from the player's own disguise, not the watched hider
  // (the clock is put just before the search and the real hiding time restored in one go, so the round never sees the clock jump)
  await ev((c) => { const m = A.UI.HSR.m; m.t = c.prep - 0.02; A.Data.HIDESEEK.prep = c.prep; A.Data.HIDESEEK.seconds = 1e5; }, CFG); await until(() => A.UI.HSR.m.phase === 'seek'); await ev(() => { const m = A.UI.HSR.m, H = A.Rules.HideSeek, me = m.hiders.find((h) => h.id === 'you'), s = m.seeker; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, x = me.x + Math.cos(a) * 1.8, z = me.z + Math.sin(a) * 1.8; if (H.valid(m, { r: 0.28 }, x, z, s.id)) { s.x = x; s.z = z; s.face = a; break; } } });
  const q0 = await ev(() => { const m = A.UI.HSR.m, H = A.Rules.HideSeek, me = m.hiders.find((h) => h.id === 'you'), w = m.hiders.find((h) => h.id === A.UI.HSR.spec.id()); return { me: me.scoreQ, w: w.scoreQ, pm: H.proximity(m, me), pw: H.proximity(m, w), t: m.t, ticks: Math.round((m.scoreT - A.Data.HIDESEEK.prep) / A.Data.HIDESEEK.score.tick) }; });
  await until((t) => A.UI.HSR.m.t > t + 2.1, q0.t, 120000);
  const q1 = await ev(() => { const m = A.UI.HSR.m, H = A.Rules.HideSeek, me = m.hiders.find((h) => h.id === 'you'), w = m.hiders.find((h) => h.id === A.UI.HSR.spec.id()); return { me: me.scoreQ, w: w.scoreQ, t: m.t, ticks: Math.round((m.scoreT - A.Data.HIDESEEK.prep) / A.Data.HIDESEEK.score.tick), hud: document.querySelector('.hs-score b').textContent, bonus: document.querySelector('.hs-score span').textContent, pts: H.points(me), spec: A.UI.HSR.spec.id(), focus: A.UI.HSR.view.focusId }; });
  ok(q0.pm.rate === 5 && q0.pw.rate < 5 && q1.spec && q1.focus !== 'you' && q1.ticks - q0.ticks >= 8 && q1.me - q0.me === 5 * (q1.ticks - q0.ticks) && q1.w - q0.w === q0.pw.rate * (q1.ticks - q0.ticks), 'while watching ' + s1.names[q1.spec] + ' (' + q0.pw.rate + ' a second where they stand), the player keeps scoring from their own disguise beside the Seeker: 5 a second (' + (q1.me - q0.me) / 4 + ' points in ' + ((q1.ticks - q0.ticks) / 4).toFixed(2) + ' s)');
  ok(q1.hud === String(q1.pts) || Math.abs(+q1.hud - q1.pts) <= 2, 'the score on screen is the player’s own (' + q1.hud + ', ' + q1.bonus + ')');
  await shot('04-spectating-scoring');
  // frame-rate independence, live: the total is exactly (ticks of round clock) x rate, whatever the frames did
  ok(q1.me - q0.me === 5 * (q1.ticks - q0.ticks), 'points are counted by the round clock, not by frames: ' + (q1.ticks - q0.ticks) + ' quarter-second ticks × 5 a second = ' + (q1.me - q0.me) / 4 + ' points, whatever the frame rate (' + (await ev(() => A.UI.HSR.view.stats.frames)) + ' frames drawn so far)');
  // pausing the round: no points while paused, none added on resume
  const pz0 = await ev(() => { const R0 = A.UI.HSR; R0.view.stop(); return { t: R0.m.t, q: R0.m.hiders.find((h) => h.id === 'you').scoreQ }; });
  await sleep(2500); const pz1 = await ev(() => { const R0 = A.UI.HSR, r = { t: R0.m.t, q: R0.m.hiders.find((h) => h.id === 'you').scoreQ }; R0.view.start(); return r; }); await frames(2);
  const pz2 = await ev(() => { const R0 = A.UI.HSR; return { t: R0.m.t, q: R0.m.hiders.find((h) => h.id === 'you').scoreQ }; });
  ok(pz1.t === pz0.t && pz1.q === pz0.q && pz2.t - pz0.t < 0.45 && pz2.q - pz0.q <= 10, 'a 2.5-second pause (the app in the background) adds no points, and resuming does not catch up on the time away');
  // return
  await tapEl('[data-hs="spec-back"]', 4); await frames(2);
  const ret = await ev(() => ({ id: A.UI.HSR.spec.id(), focus: A.UI.HSR.view.focusId, bar: getComputedStyle(document.querySelector('.hs-specbar')).display !== 'none', act: document.querySelector('.hs-act small').textContent }));
  ok(ret.id === null && ret.focus === 'you' && !ret.bar && ret.act !== 'Return', 'Return to my disguise brings the camera back to the player');
  // automatic return: the watched hider is found
  await ev(() => A.UI.HSR.spec.start()); await frames(2); const w1 = await ev(() => A.UI.HSR.spec.id());
  await ev(() => { const m = A.UI.HSR.m, h = m.hiders.find((q) => q.id === A.UI.HSR.spec.id()); h.found = true; h.foundAt = m.t; m.events.push({ type: 'reveal', id: h.id, key: h.key, x: h.x, z: h.z, t: m.t, n: ++m.evN }); }); await frames(3);
  const a1 = await ev(() => ({ id: A.UI.HSR.spec.id(), focus: A.UI.HSR.view.focusId, msg: document.querySelector('.hs-msg').textContent }));
  ok(w1 && a1.id === null && a1.focus === 'you' && /was found/.test(a1.msg), 'if the hider being watched is found, the camera returns to the player by itself (“' + a1.msg + '”)');
  // the player is found while watching someone else: still vulnerable
  await ev(() => A.UI.HSR.spec.start()); await frames(2);
  const vul = await ev(() => { const m = A.UI.HSR.m, H = A.Rules.HideSeek, me = m.hiders.find((h) => h.id === 'you'), s = m.seeker; const was = A.UI.HSR.spec.id(); s.face = Math.atan2(me.z - s.z, me.x - s.x); let t = H.target(m); if (!t || t.id !== 'you') { const d = me.shape.r + 0.45; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; s.x = me.x + Math.cos(a) * d; s.z = me.z + Math.sin(a) * d; s.face = a + Math.PI; t = H.target(m); if (t && t.id === 'you') break; } } s.nextAttack = 0; const r = H.attack(m); return { was, hit: r.hit, id: r.id, q: me.scoreQ }; });
  await until(() => document.querySelector('.hsround.spectate')); await frames(3);
  const fnd = await ev(() => { const R0 = A.UI.HSR, m = R0.m, me = m.hiders.find((h) => h.id === 'you'); return { spec: R0.spec.id(), focus: R0.view.focusId, seeker: m.seeker.id, q: me.scoreQ, bonus: document.querySelector('.hs-score span').textContent, btn: getComputedStyle(document.querySelector('.hs-specbtn')).display }; });
  ok(vul.was && vul.hit === 'hider' && vul.id === 'you' && fnd.spec === null && fnd.focus === fnd.seeker, 'the player’s disguise can still be found while they watch someone else; spectating ends and, as before, a found hider watches the Seeker');
  await frames(8); const q2 = await ev(() => A.UI.HSR.m.hiders.find((h) => h.id === 'you').scoreQ);
  ok(q2 === vul.q && fnd.bonus === 'found' && fnd.btn === 'none', 'being found stops the points, and the Spectate button goes away');
  await shot('05-found-while-spectating');
  // results carry the points; nothing is paid
  await ev(() => A.UI.HSR.finish()); await page.waitForSelector('.hsresults');
  const rs = await ev(() => { const sm = null, rows = [...document.querySelectorAll('.hs-tbl tbody tr')].map((r) => [...r.children].map((c) => c.textContent)); return { head: [...document.querySelectorAll('.hs-tbl th')].map((x) => x.textContent), rows, mine: document.querySelector('.hs-mypts') && document.querySelector('.hs-mypts').textContent, best: A.State.state.hideseek.best, res: JSON.stringify(A.State.state.res), live: !!A.UI.HSR }; });
  const myRow = rs.rows.find((r) => r[0] === 'You');
  ok(rs.head.indexOf('Points') >= 0 && myRow && +myRow[rs.head.indexOf('Points')] === Math.floor(q2 / 4) && rs.rows.length === 4 && rs.rows.every((r) => /^\d+$/.test(r[rs.head.indexOf('Points')])), 'the results list every hider’s points (you: ' + myRow[rs.head.indexOf('Points')] + ')');
  ok(new RegExp('scored ' + Math.floor(q2 / 4) + ' point').test(rs.mine) && rs.best === Math.floor(q2 / 4) && rs.res === res0, 'your score and best are shown and remembered; no coins, food or gems are paid (rewards unchanged)');
  await shot('06-results-points'); await ev(() => A.UI.closeAll()); await normal();

  /* round end while spectating; no spectating before disguising */
  await round('bot'); await freeze();
  await tapEl('.hs-specbtn', 4); await frames(1);
  const nod = await ev(() => ({ id: A.UI.HSR.spec.id(), msg: document.querySelector('.hs-msg').textContent, off: document.querySelector('.hs-specbtn').classList.contains('off') }));
  ok(nod.id === null && nod.off && /Disguise yourself first/.test(nod.msg), 'before disguising there is nothing to leave standing, so Spectate waits (“' + nod.msg + '”)');
  await stage(); await toSeek(); await ev(() => A.UI.HSR.spec.start()); await frames(2);
  ok(await ev(() => !!A.UI.HSR.spec.id()), 'spectating again in a new round');
  await ev(() => { const m = A.UI.HSR.m; m.t = A.Data.HIDESEEK.prep + A.Data.HIDESEEK.seconds - 0.2; }); await until(() => A.UI.HSR && A.UI.HSR.m.over); await frames(2).catch(() => {});
  const endS = await ev(() => (A.UI.HSR ? { id: A.UI.HSR.spec.id(), bar: getComputedStyle(document.querySelector('.hs-specbar')).display } : { id: null, bar: 'none' }));
  ok(endS.id === null && endS.bar === 'none', 'when the round ends, spectating ends with it');
  await page.waitForSelector('.hsresults', { timeout: 30000 }); await ev(() => A.UI.closeAll());

  /* ============ 4. as the Seeker ============ */
  await round('you', 'female'); await freeze(); await long(); await stage(); await toSeek();
  const sk0 = await ev(() => ({ spec: !!document.querySelector('.hs-specbtn'), score: !!document.querySelector('.hs-score'), info: A.UI.HSR.view.info(), list: A.Rules.HideSeek.spectatable(A.UI.HSR.m, 'you').length }));
  ok(!sk0.spec && sk0.list === 0 && !sk0.score, 'the Seeker has no Spectate button and no proximity score');
  ok(sk0.info.silhouette > 0, 'the player’s own Seeker shows through scenery as a silhouette, so a building or tree between it and the camera never hides it');
  let f0 = await ev(() => A.UI.HSR.m.seeker.face); c0 = await camNow();
  await down(2, C.x, C.y); await moveTo(2, C.x + 150, C.y + 20, 8); await up(2); await settle();
  ok((await ev(() => A.UI.HSR.m.seeker.face)) === f0 && Math.abs((await camNow()).yaw - c0.yaw) > 0.6, 'turning the camera does not turn the Seeker');
  await ev(() => A.UI.HSR.view.setCamera(-Math.PI * 0.75, null)); await frames(2);
  await down(2, C.x + 60, C.y - 40); await up(2); await frames(1);
  ok((await ev(() => A.UI.HSR.m.seeker.face)) !== f0, 'a short tap on the island still turns the Seeker to face that spot (a drag does not)');
  // three fingers: walking, turning the camera and attacking together
  await openSpirit(); const a0 = await ev(() => { const s = A.UI.HSR.m.seeker; s.nextAttack = 0; return { a: s.attacks, x: s.x, z: s.z }; }); c0 = await camNow();
  await down(1, J.x, J.y); await moveTo(1, J.x + 50, J.y, 3); await down(2, C.x, C.y); await moveTo(2, C.x + 80, C.y, 5); await tapEl('.hs-act', 3);
  await until((p) => { const s = A.UI.HSR.m.seeker; return Math.hypot(s.x - p.x, s.z - p.z) > 0.25; }, a0); const tri = await ev(() => ({ a: A.UI.HSR.m.seeker.attacks, cam: A.UI.HSR.view.camera().targetYaw })); await up(2); await up(1);
  ok(tri.a === a0.a + 1 && Math.abs(tri.cam - c0.targetYaw) > 0.3, 'with a thumb on the stick and a finger turning the camera, Attack still works: all three at once');
  // a camera drag never attacks
  const a1c = await ev(() => { const s = A.UI.HSR.m.seeker; s.nextAttack = 0; return s.attacks; });
  await down(2, btn[0] - 200, btn[1] - 80); await moveTo(2, btn[0], btn[1], 8); await up(2); await frames(1);
  ok((await ev(() => A.UI.HSR.m.seeker.attacks)) === a1c, 'a camera drag that ends on the Attack button does not attack (no accidental penalty)');
  // regression: the attack rules are untouched
  await ev(() => A.UI.HSR.view.setCamera(1.1, null));
  const reg = await ev(async () => { const m = A.UI.HSR.m, H = A.Rules.HideSeek, s = m.seeker; const h = m.hiders.find((q) => q.key && !q.found); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, d = h.shape.r + 0.4; s.x = h.x + Math.cos(a) * d; s.z = h.z + Math.sin(a) * d; s.face = a + Math.PI; const t = H.target(m); if (t && t.id === h.id && H.onLand(m, { x: s.x, z: s.z, r: 0.28 })) break; } s.nextAttack = 0; const r1 = H.attack(m); m.t += 1;
    let p = null; for (const q of m.props.filter((x) => x.key && x.reach && x.shape.r != null)) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s.x = q.x + Math.cos(a) * (q.shape.r + 0.4); s.z = q.z + Math.sin(a) * (q.shape.r + 0.4); s.face = a + Math.PI; const t = H.target(m); if (t && t.id === q.id) { p = q; break; } } if (p) break; } s.nextAttack = 0; const r2 = H.attack(m); return { r1: r1.hit, r2: r2.hit, pen: H.penaltyLeft(m), cd: A.Data.HIDESEEK.morphCooldown, miss: A.Data.HIDESEEK.missPenalty }; });
  ok(reg.r1 === 'hider' && reg.r2 === 'scenery' && Math.abs(reg.pen - 3) < 1e-6 && reg.cd === 10 && reg.miss === 3, 'unchanged with the camera turned: an attack reveals a hider, scenery costs the 3-second penalty, the disguise cooldown is 10 seconds');
  await shot('07-seeker-camera');
  // Reduce Motion: the camera goes straight to where it is put
  await ev(() => { A.State.state.settings.reduceMotion = true; }); const cr0 = await camNow();
  await down(2, C.x, C.y); await moveTo(2, C.x + 100, C.y, 5); await frames(1); const cr = await camNow(); await up(2);
  ok(Math.abs(cr.yaw - cr.targetYaw) < 1e-6 && Math.abs(cr.yaw - cr0.yaw) > 0.4, 'with Reduce Motion the camera turns without easing');
  await ev(() => { A.State.state.settings.reduceMotion = false; A.UI.closeAll(); }); await normal();
  ok(await ev(() => !document.querySelector('.hs3d') && !A.UI.HSR), 'closing the round removes its view and controls');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-hideseek12c)'); await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
