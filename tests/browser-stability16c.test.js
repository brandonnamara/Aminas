// Phase 16C, real-browser stability test (Chromium + Playwright, SwiftShader software WebGL, 844×390 touch; NOT an
// iPhone). Simulates what an iPhone does to a web game: graphics context loss and restore, the app going to the
// background mid-drag or mid-cinematic, audio suspension, and repeated screen changes; checks the save survives.
// Run: node tests/browser-stability16c.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); page.on('pageerror', (e) => errors.push(e.message)); const cdp = await ctx.newCDPSession(page);
  const ev = (fn, arg) => page.evaluate(fn, arg), until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 30000, polling: 50 });
  const tidy = () => ev(async () => { for (let i = 0; i < 30 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 100)); } A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('.toast,.ach-toast').forEach((t) => t.remove()); });
  const hide = (h) => ev((h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern'; ['lumifern', 'acinus', 'emberix', 'cannonis'].forEach((sp, i) => R.addAmina(s, sp, 12 - i));
    s.res.gold = 2000; s.struct.hollow = true; s.struct.hatchery = true; s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; R.drain(); A.State.save(); A.UI.showIsland(true); });
  await until(() => A.VoxIsland.stats() && A.VoxIsland.stats().frames >= 2, null, 90000); await tidy();

  const is = await ev(() => A.VoxIsland.stats());
  // the picture itself, from the screen (the canvas cannot be read back), compared in the page
  const shot = async () => 'data:image/png;base64,' + (await page.screenshot({ clip: { x: 0, y: 60, width: 844, height: 300 } })).toString('base64');
  const diff = (a, b) => ev(async ([a, b]) => { const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; }), px = async (u) => { const i = await load(u), c = document.createElement('canvas'); c.width = 211; c.height = 75; const g = c.getContext('2d'); g.drawImage(i, 0, 0, 211, 75); return g.getImageData(0, 0, 211, 75).data; };
    const x = await px(a), y = await px(b); let d = 0; for (let i = 0; i < x.length; i += 4) d += Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]); return +(d / (x.length / 4) / 3).toFixed(2); }, [a, b]);
  const pic0 = await shot();

  /* ---------------- 2. island: graphics context lost and restored ---------------- */
  const loseIsland = () => ev(() => { const c = document.querySelector('canvas.vox3d'), gl = c.getContext('webgl2') || c.getContext('webgl'); window.__lc = gl.getExtension('WEBGL_lose_context'); window.__lc.loseContext(); });
  await loseIsland(); await until(() => A.VoxIsland.stats().ctx.lost);
  const f0 = await ev(() => A.VoxIsland.stats().frames); await ev(() => A.VoxIsland.redraw && A.VoxIsland.redraw()); await sleep(800);
  ok((await ev(() => A.VoxIsland.stats().frames)) === f0, 'while the island’s context is lost it does not try to draw');
  await ev(() => window.__lc.restoreContext()); await until(() => !A.VoxIsland.stats().ctx.lost && A.VoxIsland.stats().ctx.events.restored >= 1);
  await until((f0) => A.VoxIsland.stats().frames > f0, f0, 60000);
  // what the renderer reports for the frames it draws after the restore, against the frame before the loss
  // (reading the canvas back is not reliable here: without preserveDrawingBuffer it is cleared once shown)
  await ev(() => A.VoxIsland.redraw && A.VoxIsland.redraw()); await until((f0) => A.VoxIsland.stats().frames > f0 + 1, f0, 60000);
  const rs = await ev(() => A.VoxIsland.stats());
  await sleep(1000); const dRestore = await diff(pic0, await shot());
  ok(dRestore < 8, 'and it looks as it did before the loss, shadows included (mean colour difference ' + dRestore + ' of 255; the 16B build measured ~29 here, its shadow map left empty)');
  ok(rs.calls >= is.calls * 0.9 && rs.triangles >= is.triangles * 0.9 && rs.shadow, 'when the context comes back the island redraws by itself, scene and shadows (' + rs.calls + ' draw calls / ' + rs.triangles + ' triangles, ' + is.calls + ' / ' + is.triangles + ' before the loss)');

  /* ---------------- 3. battle: context lost and restored ---------------- */
  await ev(() => { const s = A.State.state, R = A.Rules; R.startRun(s, 'forgottenroad', s.aminas.slice(0, 3).map((a) => a.uid)); A.UI.startBattle(); });
  await until(() => A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy && A.C3D.stats().drawn > 2, null, 90000);
  await ev(() => { const c = document.querySelector('canvas.c3d-canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'); window.__bl = gl.getExtension('WEBGL_lose_context'); window.__bl.loseContext(); });
  await until(() => A.C3D.stats().ctx.lost && !A.C3D.stats().loopRunning);
  ok(true, 'losing the battle’s context pauses its loop (and says so)');
  const d0 = await ev(() => A.C3D.stats().drawn); await ev(() => window.__bl.restoreContext());
  await until((d0) => !A.C3D.stats().ctx.lost && A.C3D.stats().drawn > d0 + 2, d0, 60000);
  ok(await ev(() => A.C3D.stats().loopRunning), 'when it comes back the battle carries on drawing without reopening the screen (it used to stay frozen)');
  ok(await ev(() => !!document.querySelector('#b-actions .abtn.ready')), 'the battle is still playable');
  await ev(() => { A.UI.leaveBattle(() => {}); A.Rules.abandonRun(A.State.state); A.UI.showIsland(true); }); await until(() => !!document.querySelector('#world')); await tidy();

  /* ---------------- 4. touches taken away by the system ---------------- */
  await until(() => A.VoxIsland.stats().frames >= 1);
  await ev(() => { const w = document.querySelector('#world'); w.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, clientX: 400, clientY: 200, bubbles: true, pointerType: 'touch', isPrimary: true })); w.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX: 440, clientY: 210, bubbles: true, pointerType: 'touch' })); });
  const p1 = await ev(() => A.UI.pointerState());
  await hide(true); const p2 = await ev(() => A.UI.pointerState()); await hide(false);
  ok(p1.pointers === 1 && p2.pointers === 0 && !p2.drag && !p2.pinch && await ev(() => !A.UI.dragging && !document.querySelector('#world').classList.contains('dragging')), 'a finger still down when the app goes to the background is forgotten (so the next drag is not read as a pinch)');
  const cam = await ev(() => { const w = document.querySelector('#world'), v0 = JSON.stringify(A.UI.wv && A.UI.camFor ? A.UI.camFor(A.UI.wv.iid) : null); w.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 8, clientX: 400, clientY: 200, bubbles: true, pointerType: 'touch', isPrimary: true })); for (let i = 1; i <= 6; i++) w.dispatchEvent(new PointerEvent('pointermove', { pointerId: 8, clientX: 400 + i * 12, clientY: 200, bubbles: true, pointerType: 'touch' })); const st = A.UI.pointerState(); w.dispatchEvent(new PointerEvent('pointerup', { pointerId: 8, clientX: 472, clientY: 200, bubbles: true, pointerType: 'touch' })); return { st, after: A.UI.pointerState() }; });
  ok(cam.st.pointers === 1 && cam.st.drag && !cam.st.pinch && cam.after.pointers === 0, 'the next one-finger drag is a drag, and lifting the finger clears it');

  /* ---------------- 5. the save survives interruption ---------------- */
  await ev(() => { A.State.state.res.gold = 4321; });
  await hide(true); await sleep(100);
  ok(await ev(() => JSON.parse(localStorage.getItem(A.Data.SAVE_KEY)).res.gold === 4321), 'going to the background saves straight away');
  await hide(false); await ev(() => { A.State.state.res.gold = 4444; window.dispatchEvent(new Event('pagehide')); });
  ok(await ev(() => JSON.parse(localStorage.getItem(A.Data.SAVE_KEY)).res.gold === 4444), 'closing the page (pagehide) saves too');
  await ev(() => window.dispatchEvent(new Event('pageshow')));

  /* ---------------- 6. audio interrupted and recovered ---------------- */
  const au = await ev(async () => { A.State.state.settings.sfx = true; A.Audio.setPrefs(A.State.state.settings); A.Audio.unlock && A.Audio.unlock(); const c = A.Audio.context && A.Audio.context(); if (!c) return { none: true };
    await c.suspend(); const s1 = c.state; document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.dispatchEvent(new Event('touchend', { bubbles: true })); await new Promise((r) => setTimeout(r, 300)); const s2 = c.state; A.State.state.settings.sfx = false; A.Audio.setPrefs(A.State.state.settings); return { s1, s2 }; });
  if (au.none) ok(true, 'audio: no audio context in this headless browser (resume path not exercised here)');
  else ok(au.s1 === 'suspended' && au.s2 === 'running', 'audio suspended by the system resumes on the next touch (' + au.s1 + ' → ' + au.s2 + ')');

  /* ---------------- 7. repeated screen changes: memory after one warm-up round ---------------- */
  const metrics = async () => { await cdp.send('HeapProfiler.collectGarbage'); await sleep(100); await cdp.send('HeapProfiler.collectGarbage'); await cdp.send('Performance.enable'); const m = (await cdp.send('Performance.getMetrics')).metrics, g = (k) => (m.find((x) => x.name === k) || {}).value;
    const r = await ev(() => ({ c: A.C3D.stats(), i: A.VoxIsland.stats() })); return { heap: g('JSHeapUsedSize') / 1048576, nodes: g('Nodes'), listeners: g('JSEventListeners'), cg: r.c ? r.c.geometries : 0, ct: r.c ? r.c.textures : 0, tp: r.c ? r.c.templates : 0, ig: r.i ? r.i.geometries : 0, it: r.i ? r.i.textures : 0 }; };
  const cycle = () => ev(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)), until = async (f, ms) => { const e = Date.now() + ms; while (!f() && Date.now() < e) await w(50); };
    A.UI.closeAll(); A.UI.collection(); await w(400); A.UI.closeAll(); A.UI.buildingPanel('hatchery'); await w(300); A.UI.closeAll();
    const a = A.State.state.aminas[1]; A.UI.detail(a.sp, { uid: a.uid }); await until(() => document.querySelector('.overlay .viewer3d.live'), 8000); await w(400); A.UI.closeAll();
    const s = A.State.state, R = A.Rules; R.startRun(s, 'forgottenroad', s.aminas.slice(0, 3).map((x) => x.uid)); A.UI.startBattle(); await until(() => A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy && A.C3D.stats().drawn > 2, 60000); await w(300);
    A.UI.leaveBattle(() => {}); R.abandonRun(s); A.UI.showIsland(true); await w(600); A.UI.dungeons(null, 'forgottenroad'); await w(300); A.UI.closeAll(); await w(400);
    for (let i = 0; i < 20 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await w(100); } A.UI.queue.length = 0; A.UI.busy = false; });
  await cycle(); // unmeasured warm-up: fills the deliberate creature cache
  const m0 = await metrics(); for (let i = 0; i < 4; i++) await cycle(); const m4 = await metrics();
  console.log('  info  after warm-up → after 4 more cycles: heap ' + m0.heap.toFixed(2) + ' → ' + m4.heap.toFixed(2) + ' MB, nodes ' + m0.nodes + ' → ' + m4.nodes + ', listeners ' + m0.listeners + ' → ' + m4.listeners + ', battle geometries ' + m0.cg + ' → ' + m4.cg + ', textures ' + m0.ct + ' → ' + m4.ct + ', templates ' + m0.tp + ' → ' + m4.tp + ', island geometries ' + m0.ig + ' → ' + m4.ig);
  ok(m4.cg <= m0.cg && m4.ct <= m0.ct && m4.ig <= m0.ig && m4.it <= m0.it, 'four rounds of island → collection → building → creature view → battle → dungeons leave no extra GPU geometry or textures');
  ok(m4.listeners <= m0.listeners && m4.nodes <= m0.nodes + 50, 'no event listeners or page elements pile up (' + m0.listeners + ' → ' + m4.listeners + ' listeners)');
  ok(m4.heap - m0.heap < 2, 'the JavaScript heap stays level (' + (m4.heap - m0.heap).toFixed(2) + ' MB over four rounds)');

  /* ---------------- 8. Phase 16A opening: cleanup and interruption ---------------- */
  const base = await metrics();
  await ev(() => { localStorage.setItem('aminas.onboard16', '1'); A.Onboard16.set(true); const s = A.State.newGame(); A.Onboard16.begin(s); s.avatar.made = true; s.settings.sfx = false; A.State.save(); A.UI.o16Cinematic(); });
  await until(() => !!document.querySelector('.o16-cine')); await sleep(1200);
  await hide(true); const paused = await ev(() => document.querySelector('.o16-cine').classList.contains('paused')); await sleep(600); await hide(false);
  await ev(() => document.querySelector('.o16-cine .c-skip').click()); await until(() => !!document.querySelector('.o16-start'));
  await sleep(600);
  const cl = await ev(() => ({ cine: !!document.querySelector('.o16-cine'), hold: document.querySelector('#world') ? document.querySelector('#world').className : '', }));
  ok(paused && !cl.cine && !/o16-(hold|push)/.test(cl.hold), 'the cinematic pauses in the background, and after Skip leaves nothing behind (no overlay, no camera classes)');
  await ev(() => { A.UI.setScreen('title'); A.UI.showTitle(); }); const after = await metrics();
  ok(after.listeners <= base.listeners + 2, 'its listeners are removed when it ends (' + base.listeners + ' before → ' + after.listeners + ' after)');
  await ev(() => { const s = A.State.newGame(); A.Onboard16.begin(s); s.avatar.made = true; A.State.save(); A.UI.o16Cinematic(); }); await until(() => !!document.querySelector('.o16-cine')); await sleep(800);
  await ev(() => { A.UI.setScreen('title'); A.UI.showTitle(); }); await sleep(300);
  ok(await ev(() => !document.querySelector('.o16-cine')), 'leaving mid-cinematic (another screen opens) removes it cleanly');
  await ev(() => { A.Onboard16.set(false); localStorage.setItem('aminas.onboard16', '0'); });

  /* ---------------- 9. save fidelity through export and import ---------------- */
  const fid = await ev(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.avatar = { made: true, name: 'Ivy', look: null }; s.starter = 'umbrit'; ['umbrit', 'acinus', 'emberix'].forEach((sp, i) => R.addAmina(s, sp, 15 - i * 3)); s.res = { gold: 3210, food: 456, gems: 78 };
    s.missions = { m_hollow: 'claimed', m_feed: 'claimed', m_lv3: 'claimed' }; s.dungeon.forgottenroad = Object.assign(R.dungeonRec(s, 'forgottenroad'), { clears: 1, next: 0 }); s.struct.hollow = true; s.struct.hatchery = true; R.drain();
    const ids = Object.keys(A.Data.ITEMS).slice(0, 3); ids.forEach((id, i) => s.items.push({ iid: i + 1, id })); s.nextIid = 4; const slot = A.Data.ITEMS[ids[0]].slot; A.Rules.gearOf(s.aminas[0])[slot] = 1; A.State.state = A.State.hydrate(s).st; A.State.save();
    const before = JSON.parse(JSON.stringify(A.State.state)); const text = A.SaveFile.exportFile().text; const p = A.SaveFile.parse(text); const r = A.SaveFile.apply(p); const now = A.State.state;
    const same = (k) => JSON.stringify(before[k]) === JSON.stringify(now[k]);
    return { ok: p.ok && r.ok, keys: ['aminas', 'res', 'items', 'missions', 'dungeon', 'struct', 'buildings', 'owned', 'avatar', 'essence', 'eggs', 'rank'].filter((k) => !same(k)) }; });
  ok(fid.ok && fid.keys.length === 0, 'a mid-game save goes through export and import unchanged: Aminas, gear, items, quests, currencies, dungeons, buildings' + (fid.keys.length ? ' (differs: ' + fid.keys.join(', ') + ')' : ''));
  const bad = await ev(() => { const before = localStorage.getItem(A.Data.SAVE_KEY); const r = ['{', '', '{"aminas":[]}', 'AMINAS1:zzz', JSON.stringify({ format: 'aminas-save', fileVersion: 1, save: { aminas: 'x' } })].map((t) => A.SaveFile.parse(t).ok); return { any: r.some(Boolean), same: localStorage.getItem(A.Data.SAVE_KEY) === before }; });
  ok(!bad.any && bad.same, 'malformed files are refused and never reach the stored save');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\n' + (fail ? 'FAILED: ' : '') + pass + ' passed, ' + fail + ' failed (browser-stability16c)'); process.exitCode = fail ? 1 : 0;
})();
