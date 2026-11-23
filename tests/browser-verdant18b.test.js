// Phase 18B, real-browser check (Chromium + Playwright, software WebGL, 844×390 touch; NOT an iPhone): the Verdant
// Wilds on the voxel island, its places and ten dungeon entrances (tap areas, sheets, order, no way in), the
// Wayfinder, save and reload, travel away and back, a future island that is not ready, the level cap of 40 in the
// interface, and draw calls / frame times on both islands (software rendering: relative numbers only).
// Run: node tests/browser-verdant18b.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(90000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = async (n) => { if (!SHOTS) return; await sleep(800); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 85 }); };
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 30000, polling: 50 });
  const tidy = () => ev(async () => { for (let i = 0; i < 30 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 150)); } A.UI.closeAll(); document.querySelectorAll('#toast-root > *').forEach((t) => t.remove()); });
  const setup = (opts) => ev((o) => {
    const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['hollow', 'tidegate', 'moonshrine', 'hatchery'].forEach((k) => { s.struct[k] = true; Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
    ['lumifern', 'acinus', 'kairyu'].forEach((sp, i) => R.addAmina(s, sp, i ? 22 : 30));
    s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' }; s.currentIsland = o.isle || 'verdant';
    if (o.obsidian) s.islands.obsidian = { unlocked: true, obstacles: {}, unlockedAt: Date.now() - 1e7 };
    // the opening tour and the arrival notes are not what this test is about
    s.story = s.story || {}; s.notified = s.notified || {};
    s.res.gold = 3000; s.res.food = 4000; s.res.gems = 20; A.State.state = s; R.drain(); A.State.save(); A.UI.showIsland(true);
  }, opts || {});
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await setup(); await until(() => !!document.querySelector('#world')); await sleep(600); await tidy();
  await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {});

  /* ---------- the Verdant Wilds on the voxel island ---------- */
  const vx = await ev(() => ({ on: A.VoxIsland.ready(), lms: A.IsoArt.landmark('verdant', A.State.state).map((l) => l.kind), has: ['v_landing', 'v_settle', 'v_settle2', 'v_aqueduct', 'v_aqueductw', 'v_archive', 'v_shrine', 'v_choir', 'elderroot'].concat(A.Data.V18.gates.map((g) => 'v_gate_' + g.id)).filter((k) => A.IsoArt.voxHas && A.IsoArt.voxHas('l', k)).length }));
  ok(vx.on, 'the Verdant Wilds draws on the voxel island (it was 2D before Phase 18B)');
  ok(vx.lms.length === 16, 'the island has 16 placed features: the Elder Root, eight other place parts and seven free-standing entrances (' + vx.lms.length + ')');
  ok(vx.has === 19, 'every place and every entrance has its own 3D model (' + vx.has + ' of 19)');
  const hits = await ev(() => [...new Set([...document.querySelectorAll('#objs [data-hit^="v18:"]')].map((e) => e.dataset.hit))]);
  ok(hits.length === 16, 'every place part and entrance has a tap area on the island (' + hits.length + ')');
  await shot('verdant-3d');

  /* ---------- taps open the place sheets; no entrance can be entered ---------- */
  // move the camera to the place, wait until it has stopped (software rendering can be slow), then tap its ground
  const tapAt = async (id) => { await ev((i) => { const p = A.Rules.V18.site(i), g = A.Rules.V18.gate(i), q = p || g; A.UI.focusFoot(q.x, q.y, q.w || 1, q.h || 1, 0.9); }, id);
    const where = (i) => ev((k) => { const e = document.querySelector('#objs [data-hit="v18:' + k + '"]'); if (!e) return null; const b = (e.querySelector('ellipse[fill="transparent"]') || e).getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; }, i);
    let r = null; for (let k = 0; k < 40; k++) { await sleep(150); const n = await where(id); if (n && r && n.x === r.x && n.y === r.y) break; r = n; }
    if (!r) { console.log('  no tap area found for ' + id); return false; } const why = await ev((p) => { const t = document.elementFromPoint(p.x, p.y); return { modal: A.UI.modalOpen(), busy: !!A.UI.busy, top: t ? t.tagName + ':' + ((t.closest('[data-hit]') || { dataset: {} }).dataset.hit || '') + ':' + [...Array(4)].reduce((a, _, j) => { let e = t; for (let q = 0; q < j && e; q++) e = e.parentNode; return a + '/' + (e ? (e.id || (e.getAttribute && e.getAttribute('class')) || e.tagName) : ''); }, '') : null, dlg: !!document.querySelector('.dlg') }; }, r);
    await page.touchscreen.tap(r.x, r.y); await sleep(500); const opened = await ev(() => !!document.querySelector('.v18-sheet')); if (!opened) console.log('  tap on ' + id + ' did not open: ' + JSON.stringify(why)); return true; };
  ok(await tapAt('archive') && await ev(() => !!document.querySelector('.v18-sheet') && /Ivy Archive/.test(document.querySelector('.v18-sheet h2').textContent)), 'tapping the Ivy Archive on the island opens its sheet');
  const arc = await ev(() => ({ ent: (document.querySelector('.v18-ent') || {}).textContent, gate: (document.querySelector('.v18-gate') || {}).textContent, dots: document.querySelectorAll('.v18-dot').length, enter: !!document.querySelector('[data-act="v18Enter"]'), seen: A.Rules.V18.seen(A.State.state, 'archive') }));
  ok(/Entity/.test(arc.ent || '') && /Dungeon 4 of 10/.test(arc.gate || '') && /Locked/.test(arc.gate) && /Spore Hollow/.test(arc.gate) && arc.dots === 10, 'it carries the Entity’s line and its entrance: Dungeon 4 of 10, locked until the Spore Hollow, with the ten in order');
  ok(!arc.enter && arc.seen, 'there is no Enter button, and the visit is recorded');
  await shot('sheet-archive');
  await tidy();
  await tapAt('v_mossgate'); console.log('  sheet: ' + await ev(() => (document.querySelector('.v18-sheet h2') || {}).textContent));
  ok(await ev(() => !!document.querySelector('.v18-gate')) && await ev(() => /Dungeon 1 of 10/.test(document.querySelector('.v18-gate').textContent) && /Open/.test(document.querySelector('.v18-gate').textContent) && !!document.querySelector('[data-act="v18Enter"]')), 'Phase 18C: the first entrance (Mossgate Steps) is open, with an Enter button');
  await shot('sheet-mossgate'); await tidy();
  for (const id of ['shrine', 'choir', 'elderroot', 'settle', 'aqueduct', 'landing']) { await ev((i) => A.UI.v18Open(i), id); await sleep(250); if (SHOTS && (id === 'shrine' || id === 'elderroot' || id === 'choir')) await shot('sheet-' + id); await tidy(); }
  const all = await ev(() => { const s = A.State.state, V = A.Rules.V18; return { prog: V.progress(s), anyOpen: A.Data.V18.gates.some((g) => V.canEnter(s, g.id)), run: A.Rules.startRun(s, 'v_aqueduct', s.aminas.slice(0, 3).map((a) => a.uid)), open: A.Data.V18.gates.filter((g) => V.canEnter(s, g.id)).map((g) => g.id).join() }; });
  ok(all.prog.seen === all.prog.total && all.prog.total === 7, 'all seven places can be visited (' + all.prog.seen + ' of ' + all.prog.total + ')');
  ok(all.open === 'v_mossgate' && all.run.ok === false, 'Phase 18C: only the first entrance is open, and starting a locked Verdant dungeon directly is refused (' + all.run.reason + ')');
  const dd = await ev(() => { A.UI.dungeons(); return [...document.querySelectorAll('.overlay [data-act="dIsle"], .overlay .isle-tab')].map((e) => e.textContent).join('|') + '#' + !!document.querySelector('.overlay'); });
  ok(!/Verdant/.test(dd), 'the Dungeons screen is unchanged: no Verdant tab while it has no playable dungeons');
  await tidy();

  /* ---------- the Wayfinder ---------- */
  await ev(() => A.UI.v18Open('landing')); await sleep(600); // a sheet ignores clicks for its first 400 ms (the tap that opened it)
  await ev(() => document.querySelector('.v18-wp[data-id="choir"]').click()); await sleep(900);
  const wf = await ev(() => ({ modal: !!document.querySelector('.v18-sheet'), guide: (document.querySelector('#guide-root') || {}).textContent, arrow: document.querySelectorAll('#hlx .hl-arrow').length }));
  ok(!wf.modal && /Choir/.test(wf.guide || '') && wf.arrow === 1, 'the Wayfinder closes the sheet, moves the camera to the Choir and points at it');
  await shot('wayfinder-choir');
  await ev(() => A.UI.clearGuide());

  /* ---------- save, reload, travel away and back ---------- */
  await ev(() => A.State.save()); await page.reload(); await page.waitForFunction(() => window.A && A.UI && A.UI.screen);
  await ev(() => { if (A.UI.screen === 'title') { const b = document.querySelector('[data-act="continue"], [data-act="play"]'); if (b) b.click(); } }); await sleep(800);
  await ev(() => { if (A.UI.screen !== 'island') A.UI.showIsland(true); }); await sleep(800); await tidy();
  const rl = await ev(() => ({ isle: A.State.state.currentIsland, seen: A.Rules.V18.progress(A.State.state).seen, hits: document.querySelectorAll('#objs [data-hit^="v18:"]').length, lv: A.State.state.aminas[0].lv }));
  ok(rl.isle === 'verdant' && rl.seen === 7 && rl.hits >= 16, 'after a reload the save is still on the Verdant Wilds, with its seven visits and every tap area');
  const tr = [];
  for (const iid of ['starter', 'verdant', 'starter', 'verdant']) { await ev((i) => A.UI.travelTo(i), iid); await sleep(900); await tidy(); tr.push(await ev(() => ({ i: A.State.state.currentIsland, n: document.querySelectorAll('#objs [data-hit^="v18:"]').length, vox: A.VoxIsland.ready() }))); }
  ok(tr.every((t, k) => t.i === ['starter', 'verdant', 'starter', 'verdant'][k] && t.vox && (t.i === 'verdant' ? t.n >= 16 : t.n === 0)), 'travelling to Starter Island and back twice keeps both islands whole (places only on the Verdant Wilds; voxel island on both)');
  await shot('verdant-after-travel');
  // no GPU geometry, texture or DOM growth across island switches (a pre-existing meadow-detail leak, found here, is fixed)
  // warm-up: Starter Island's imported Hatchery model (and its two textures) loads once, the first time it is drawn; the
  // check below is about growth across trips, so it starts after that one-time load (Phase 18C: an arrival scene now
  // plays on the first trip and moved that load into the measured window)
  await ev(async () => { A.UI.travelTo('starter'); for (let i = 0; i < 100 && !A.VoxIsland.models().some((m) => m.type === 'hatchery'); i++) await new Promise((r) => setTimeout(r, 200)); A.UI.travelTo('verdant'); await new Promise((r) => setTimeout(r, 800)); }); await tidy();
  const lk0 = await ev(() => ({ g: A.VoxIsland.stats().geometries, t: A.VoxIsland.stats().textures, n: document.getElementsByTagName('*').length }));
  for (let k = 0; k < 6; k++) await ev(async () => { A.UI.travelTo('starter'); await new Promise((r) => setTimeout(r, 600)); A.UI.travelTo('verdant'); await new Promise((r) => setTimeout(r, 600)); });
  await sleep(800); await tidy(); const lk1 = await ev(() => ({ g: A.VoxIsland.stats().geometries, t: A.VoxIsland.stats().textures, n: document.getElementsByTagName('*').length }));
  ok(lk1.g === lk0.g && lk1.t === lk0.t && lk1.n === lk0.n, 'six more round trips leave GPU geometries, textures and page nodes where they were (' + JSON.stringify(lk0) + ' → ' + JSON.stringify(lk1) + ')');

  /* ---------- a future island that is not ready ---------- */
  await setup({ obsidian: true, isle: 'verdant' }); await sleep(700); await tidy();
  await ev(() => A.UI.islandMap()); await sleep(400);
  const ob = await ev(() => { const c = document.querySelector('.frag[data-island="obsidian"]'); return { txt: c ? c.textContent : '', travel: !!(c && c.querySelector('[data-act="travel"]')) }; });
  ok(/Not ready/.test(ob.txt) && !ob.travel, 'an Obsidian Reach unlocked by an older build shows “Not ready” on the map, with no Travel button');
  await shot('map-notready');
  const ob2 = await ev(() => { const r = A.UI.travelTo('obsidian'); return { r, isle: A.State.state.currentIsland, kept: !!A.State.state.islands.obsidian.unlocked }; });
  ok(ob2.r === false && ob2.isle === 'verdant' && ob2.kept, 'travel there is refused, and the save keeps its unlock record');
  await tidy();

  /* ---------- level cap 40 in the interface ---------- */
  const lc = await ev(() => { const s = A.State.state, a = s.aminas[0]; const r = A.Rules.addXp(s, a, A.Rules.xpNeed(30) + 5); A.UI.detail(a.sp, { uid: a.uid }); return { lv: a.lv, xp: a.xp, txt: (document.querySelector('.overlay') || {}).textContent || '' }; });
  ok(lc.lv === 31 && lc.xp === 5 && /Lv\s*31/.test(lc.txt) && !/MAX/.test(lc.txt), 'an Amina at level 30 levels to 31 and the detail shows Lv 31, not MAX');
  await shot('detail-lv31'); await tidy();

  /* ---------- the 2D island (3D off): the same places as pictures, the same tap areas ---------- */
  const flat = await ev(async () => { A.State.state.settings.voxIsland = false; A.UI.travelTo('verdant'); A.UI.showIsland(); await new Promise((r) => setTimeout(r, 900));
    return { vox: !!document.querySelector('#world.vox'), hits: new Set([...document.querySelectorAll('#objs [data-hit^="v18:"]')].map((e) => e.dataset.hit)).size, pics: document.querySelectorAll('#objs .lm image.spr, #objs .lm polygon').length }; });
  ok(!flat.vox && flat.hits === 16 && flat.pics >= 16, 'with the voxel island off, the places draw as 2D pictures with the same 16 tap areas');
  await ev(() => A.UI.focusFoot(18, 18, 1, 1, 0.55)); await shot('verdant-2d');
  await ev(async () => { A.State.state.settings.voxIsland = true; A.UI.showIsland(); await new Promise((r) => setTimeout(r, 600)); });
  await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {});

  /* ---------- draw calls and frame times (software WebGL: compare the islands, not absolute speed) ---------- */
  const perf = [];
  for (const iid of ['starter', 'verdant']) {
    await ev((i) => A.UI.travelTo(i), iid); await sleep(1500); await tidy();
    perf.push(await ev(async (i) => { const S0 = A.VoxIsland.stats(), t0 = performance.now(), dts = []; let p = 0; while (performance.now() - t0 < 3000) { const n = await new Promise((r) => requestAnimationFrame(r)); if (p) dts.push(n - p); p = n; } const S1 = A.VoxIsland.stats(); dts.sort((a, b) => a - b);
      return { iid: i, calls: S1.calls, tris: S1.triangles, geos: S1.geometries, p50: +dts[dts.length >> 1].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1) }; }, iid));
  }
  console.log('  perf ' + JSON.stringify(perf));
  ok(perf[1].calls <= perf[0].calls + 4, 'the Verdant Wilds draws in about as many calls as Starter Island (' + perf[1].calls + ' vs ' + perf[0].calls + '): its models merge into the shared meshes');
  // reduced motion: the Choir's light stops moving
  const calm = await ev(() => { A.State.state.settings.reduceMotion = true; A.UI.applySettings ? A.UI.applySettings() : document.body.classList.add('calm'); A.UI.showIsland(); const e = document.querySelector('.v18hum'); return e ? getComputedStyle(e).animationName : 'none'; });
  ok(calm === 'none', 'with reduced motion the Choir’s glimmer is still');

  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'perf.json'), JSON.stringify(perf, null, 1));
  await browser.close(); srv.close();
  console.log('\nbrowser-verdant18b: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
