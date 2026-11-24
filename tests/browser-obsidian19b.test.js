// Phase 19B, real-browser check (Chromium + Playwright, software WebGL, 844×390 touch; NOT an iPhone): Obsidian Reach
// (since Phase 19C opened as a player has it, not through the retired construction preview): voxel island with the Cooling Forge places, ten sealed entrances, 59
// obstacles, tap areas, sheets with no way in, Wayfinder, reload (the island closes again for a normal load), travel
// round trips without growth, the 2D fallback, the Forge (Metal) Habitat in 3D and 2D, the level cap in the interface
// and its one-time notice, and draw calls / frame times against Starter Island and the Verdant Wilds (relative only).
// Run: node tests/browser-obsidian19b.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(90000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = async (n) => { if (!SHOTS) return; await sleep(800); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 85 }); };
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 30000, polling: 50 });
  const tidy = () => ev(async () => { for (let i = 0; i < 30 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 150)); } A.UI.closeAll(); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
  const skipScenes = async () => { for (let i = 0; i < 8; i++) { const on = await ev(() => { const b = document.querySelector('#sc-skip'); if (b) b.click(); return !!b; }); if (!on) break; await sleep(500); } };
  const setup = (opts) => ev((o) => {
    const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['hollow', 'tidegate', 'moonshrine', 'hatchery'].forEach((k) => { s.struct[k] = true; Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
    ['lumifern', 'acinus', 'kairyu'].forEach((sp, i) => R.addAmina(s, sp, i ? 22 : 40));
    s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' }; s.currentIsland = o.isle || 'verdant';
    if (o.boss) { s.campaign = s.campaign || {}; s.campaign.bosses = Object.assign({}, s.campaign.bosses, { verdant: true }); }
    if (o.capSeen) s.o19.cap = o.capSeen;
    s.story = s.story || {}; s.notified = s.notified || {}; s.rank = 6;
    s.res.gold = 60000; s.res.food = 4000; s.res.gems = 20; A.State.state = s; R.drain(); A.State.save(); A.UI.showIsland(true);
  }, opts || {});
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await setup(); await until(() => !!document.querySelector('#world')); await sleep(600); await tidy();
  await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {});

  /* ---------- normal players: the Reach is not offered ---------- */
  // Phase 19C: the island is live; a save that has not opened it (no Forest Crown) still cannot travel there
  const np = await ev(() => ({ live: A.World.islandLive('obsidian'), r: A.UI.travelTo('obsidian'), isle: A.State.state.currentIsland, flag: A.Data.O19.live, pv: A.Rules.O19.preview(A.State.state).ok }));
  ok(np.live && np.r === false && np.isle === 'verdant' && np.flag === true && np.pv === false, 'Obsidian Reach is live (Phase 19C), but a save without the Forest Crown cannot travel there, and the developer shortcut cannot open it');

  /* ---------- an old-build save that bought the Reach travels there (Phase 19C; it was the 19B preview) ---------- */
  await ev(() => { const s = A.State.state; s.islands.obsidian = { unlocked: true, obstacles: {}, unlockedAt: 1 }; s.story.scenes = Object.assign({}, s.story.scenes, { o_arrival: 1 }); A.State.save(); A.UI.travelTo('obsidian'); }); await sleep(1500); await tidy();
  await until(() => A.VoxIsland.ready() && A.State.state.currentIsland === 'obsidian', null, 90000).catch(() => {});
  const vx = await ev(() => { const s = A.State.state, D = A.Data, kinds = A.IsoArt.landmark('obsidian', s).map((l) => l.kind);
    const want = D.O19.sites.map((x) => x.kind).concat(D.O19.gates.map((g) => 'o_gate_' + g.id));
    return { on: A.VoxIsland.ready(), isle: s.currentIsland, kinds, has: want.filter((k) => A.IsoArt.voxHas('l', k)).length, want: want.length,
      obs: document.querySelectorAll('#objs [data-hit^="o:"], #objs .ob, #objs [data-ob]').length, obTypes: ['basalt', 'crystal', 'embervent', 'charred', 'obsidianshard', 'slagheap'].filter((t) => A.IsoArt.voxHas('n', t)).length,
      hits: [...new Set([...document.querySelectorAll('#objs [data-hit^="o19:"]').values()].map((e) => e.dataset.hit))].length,
      expect: D.O19.sites.length + D.O19.gates.filter((g) => !g.site).length };
  });
  ok(vx.on && vx.isle === 'obsidian', 'Obsidian Reach draws on the voxel island (it was always 2D before Phase 19B)');
  ok(vx.has === vx.want, 'every place and entrance has its own 3D model (' + vx.has + ' of ' + vx.want + ')');
  ok(vx.obTypes === 6, 'all six obstacle types have 3D models (' + vx.obTypes + ' of 6)');
  ok(vx.hits === vx.expect, 'every place part and free-standing entrance has a tap area (' + vx.hits + ' of ' + vx.expect + ')');
  const ob = await ev(() => { const s = A.State.state; return A.Data.OBSTACLES.obsidian.filter((o) => !A.World.obstacleRec(s, o.id)).length; });
  ok(ob === 59, 'all 59 obstacles stand where they were (' + ob + ')');
  await ev(() => A.UI.focusFoot(16, 16, 1, 1, 0.55)); await shot('obsidian-3d-whole');

  /* ---------- sheets: places, entrances, no way in ---------- */
  for (const id of ['landing', 'glasswick', 'gallery', 'bellows', 'forge']) { await ev((i) => A.UI.o19Open(i), id); await sleep(300); if (id === 'gallery' || id === 'forge') await shot('sheet-' + id); await tidy(); }
  await ev(() => A.UI.o19Open('o_cinder')); await sleep(300);
  const g1 = await ev(() => ({ gate: (document.querySelector('.v18-gate') || {}).textContent || '', enter: !!document.querySelector('[data-act="o19Enter"]'), dots: [...document.querySelectorAll('.o19-sheet')].pop().querySelectorAll('.o19-order .v18-dot').length }));
  ok(/Dungeon 1 of 10/.test(g1.gate) && /Locked/.test(g1.gate) && /Forest Crown/.test(g1.gate) && !g1.enter && g1.dots === 10, 'Dungeon 1 says it is locked until the Forest Crown, with no Enter button and the ten-step order');
  await shot('sheet-gate1'); await tidy();
  const all = await ev(() => { const s = A.State.state, O = A.Rules.O19; s.campaign = s.campaign || {}; s.campaign.bosses = Object.assign({}, s.campaign.bosses, { verdant: true });
    const st = O.gates(s).map((g) => g.state), runs = A.Data.O19.gates.slice(1).map((g) => A.Rules.startRun(s, g.id, s.aminas.slice(0, 3).map((a) => a.uid)));
    A.UI.o19Open('o_cinder'); const enter = !!document.querySelector('[data-act="o19Enter"]'), txt = (document.querySelector('.v18-gate') || {}).textContent || ''; A.UI.closeAll();
    delete s.campaign.bosses.verdant; return { st, runs: runs.every((r) => r && r.ok === false), enter, txt, prog: O.progress(s) }; });
  ok(all.st[0] === 'open' && all.st.slice(1).every((x) => x === 'locked') && all.enter && /Recommended level 38/.test(all.txt), 'with the Forest Crown beaten, Dungeon 1 is open with an Enter button (Phase 19C) and the rest wait in order');
  ok(all.runs, 'starting a later Obsidian dungeon out of order is refused');
  ok(all.prog.seen === all.prog.total, 'every place can be visited (' + all.prog.seen + ' of ' + all.prog.total + ')');
  const dd = await ev(() => { A.UI.dungeons(); const t = [...document.querySelectorAll('.overlay [data-act="dIsle"], .overlay .isle-tab')].map((e) => e.textContent).join('|'); A.UI.closeAll(); return t; });
  ok(/Reach|Obsidian/.test(dd), 'the Dungeons screen has an Obsidian Reach tab (Phase 19C)');

  /* ---------- tap on the island and the Wayfinder ---------- */
  const tapAt = async (id) => { await ev((i) => { const O = A.Rules.O19, q = O.site(i) || O.gate(i); A.UI.focusFoot(q.x, q.y, q.w || 1, q.h || 1, 0.9); }, id);
    const where = (i) => ev((k) => { const e = document.querySelector('#objs [data-hit="o19:' + k + '"]'); if (!e) return null; const b = (e.querySelector('ellipse[fill="transparent"]') || e).getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; }, i);
    let r = null; for (let k = 0; k < 40; k++) { await sleep(150); const n = await where(id); if (n && r && n.x === r.x && n.y === r.y) break; r = n; }
    if (!r) return false; await page.touchscreen.tap(r.x, r.y); await sleep(500); return ev(() => !!document.querySelector('.o19-sheet')); };
  ok(await tapAt('bellows') && await ev(() => /Bellows/.test(document.querySelector('.o19-sheet h2').textContent)), 'tapping the Great Bellows on the island opens its sheet');
  await tidy();
  await ev(() => A.UI.o19Open('landing')); await sleep(600);
  await ev(() => document.querySelector('.v18-wp[data-id="gallery"]').click()); await sleep(900);
  const wf = await ev(() => ({ modal: !!document.querySelector('.o19-sheet'), guide: (document.querySelector('#guide-root') || {}).textContent, arrow: document.querySelectorAll('#hlx .hl-arrow').length }));
  ok(!wf.modal && /Mirror Gallery/.test(wf.guide || '') && wf.arrow === 1, 'the Wayfinder closes the sheet, moves the camera to the Mirror Gallery and points at it');
  await shot('wayfinder-gallery'); await ev(() => A.UI.clearGuide());

  /* ---------- travel round trips: no growth ---------- */
  // warm-up: Starter Island's imported Hatchery model loads once, and the Verdant Wilds' arrival scene plays on the first trip
  await ev(async () => { A.UI.travelTo('starter'); for (let i = 0; i < 100 && !A.VoxIsland.models().some((m) => m.type === 'hatchery'); i++) await new Promise((r) => setTimeout(r, 200)); A.UI.travelTo('verdant'); await new Promise((r) => setTimeout(r, 900)); A.UI.travelTo('obsidian'); await new Promise((r) => setTimeout(r, 900)); });
  await tidy(); const lk0 = await ev(() => ({ g: A.VoxIsland.stats().geometries, t: A.VoxIsland.stats().textures, n: document.getElementsByTagName('*').length }));
  const t0 = Date.now();
  for (let k = 0; k < 6; k++) await ev(async () => { A.UI.travelTo('verdant'); await new Promise((r) => setTimeout(r, 600)); A.UI.travelTo('obsidian'); await new Promise((r) => setTimeout(r, 600)); });
  const trip = Math.round((Date.now() - t0) / 12);
  await sleep(800); await tidy(); const lk1 = await ev(() => ({ g: A.VoxIsland.stats().geometries, t: A.VoxIsland.stats().textures, n: document.getElementsByTagName('*').length }));
  ok(lk1.g === lk0.g && lk1.t === lk0.t && lk1.n === lk0.n, 'six Verdant ↔ Obsidian round trips leave GPU geometries, textures and page nodes where they were (' + JSON.stringify(lk0) + ' → ' + JSON.stringify(lk1) + ')');

  /* ---------- draw calls and frame times (software WebGL: compare the islands, not absolute speed) ---------- */
  const perf = [];
  for (const iid of ['starter', 'verdant', 'obsidian']) {
    const tl = Date.now(); await ev((i) => A.UI.travelTo(i), iid); await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {}); const load = Date.now() - tl; await sleep(1500); await tidy();
    perf.push(Object.assign({ load }, await ev(async (i) => { const dts = [], t0 = performance.now(); let p = 0; while (performance.now() - t0 < 3000) { const n = await new Promise((r) => requestAnimationFrame(r)); if (p) dts.push(n - p); p = n; } dts.sort((a, b) => a - b); const S1 = A.VoxIsland.stats();
      return { iid: i, calls: S1.calls, tris: S1.triangles, geos: S1.geometries, tex: S1.textures, p50: +dts[dts.length >> 1].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; }, iid)));
  }
  perf.push({ iid: 'trip', ms: trip });
  console.log('  perf ' + JSON.stringify(perf));
  ok(perf[2].calls <= Math.max(perf[0].calls, perf[1].calls) + 6, 'Obsidian Reach draws in about as many calls as the other islands (' + perf[2].calls + ' vs ' + perf[0].calls + ' / ' + perf[1].calls + '): its models merge into the shared meshes');
  ok(perf[2].tris <= Math.max(perf[0].tris, perf[1].tris) * 1.25, 'and with a comparable triangle count (' + perf[2].tris + ' vs ' + perf[0].tris + ' / ' + perf[1].tris + ')');

  /* ---------- the 2D island (3D off) ---------- */
  const flat = await ev(async () => { A.State.state.settings.voxIsland = false; A.UI.travelTo('obsidian'); A.UI.showIsland(); await new Promise((r) => setTimeout(r, 900));
    return { vox: !!document.querySelector('#world.vox'), hits: new Set([...document.querySelectorAll('#objs [data-hit^="o19:"]')].map((e) => e.dataset.hit)).size, want: A.Data.O19.sites.length + A.Data.O19.gates.filter((g) => !g.site).length }; });
  ok(!flat.vox && flat.hits === flat.want, 'with the voxel island off, the places draw as 2D pictures with the same ' + flat.want + ' tap areas');
  await ev(() => A.UI.focusFoot(16, 16, 1, 1, 0.55)); await shot('obsidian-2d');

  /* ---------- the Forge (Metal) Habitat ---------- */
  const hab = await ev(async () => { const s = A.State.state, W = A.World, R = A.Rules; A.UI.travelTo('starter'); A.UI.showIsland(); await new Promise((r) => setTimeout(r, 600));
    const locked = R.reqMet(s, A.Data.BUILDINGS.hab_metal.req);
    s.campaign = s.campaign || {}; s.campaign.bosses = Object.assign({}, s.campaign.bosses, { verdant: true });
    const sp = W.findSpot(s, 'starter', 'hab_metal', 0, [14, 14]), r = W.buildNew(s, 'starter', 'hab_metal', sp[0], sp[1], 0), b = s.buildings[r.id]; b.state = 'built'; b.level = 1; delete b.endAt;
    R.drain && R.drain(); A.UI.showIsland(); return { locked, ok: r.ok, id: r.id, x: sp[0], y: sp[1] }; });
  ok(hab.locked === false && hab.ok, 'the Forge Habitat is locked before the Forest Crown and can be placed after it');
  await sleep(600); await skipScenes(); await tidy();
  await ev((h) => A.UI.focusFoot(h.x, h.y, 3, 3, 1.1), hab); await shot('habitat-metal-2d');
  await ev(async () => { A.State.state.settings.voxIsland = true; A.UI.showIsland(); }); await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {}); await sleep(1500); await skipScenes(); await tidy();
  const hab3 = await ev((h) => { const e = document.querySelector('#objs [data-bid="' + h.id + '"]'); return { vox: A.VoxIsland.ready(), model: !!(e && e.classList.contains('vx')) && A.IsoArt.voxHas('b', 'habitat', 'habitat', 'built') }; }, hab);
  ok(hab3.vox && hab3.model, 'it draws as a 3D habitat on the voxel island');
  await ev((h) => A.UI.focusFoot(h.x, h.y, 3, 3, 1.1), hab); await shot('habitat-metal-3d');

  /* ---------- level cap in the interface ---------- */
  const lc = await ev(() => { const s = A.State.state, a = s.aminas[0]; delete s.campaign.bosses.verdant; A.UI.closeAll(); A.UI.detail(a.sp, { uid: a.uid }); const t = (document.querySelector('.overlay') || {}).textContent || ''; A.UI.closeAll(); A.UI.selUid = a.uid; A.UI.selRender && A.UI.selRender(); const c = document.querySelector('#comp'); return { lv: a.lv, t, hud: c ? c.textContent : '' }; });
  ok(lc.lv === 40 && /Level cap 40 reached/.test(lc.t) && /Forest Crown/.test(lc.t), 'a level-40 Amina’s screen says the cap is 40 and how to raise it');
  ok(!/MAX/.test(lc.hud) && /Cap 40/.test(lc.hud), 'the companion card reads “Cap 40”, not MAX (' + lc.hud.trim() + ')');
  // an arrival scene may play first (the Forest Crown beaten); the notice waits for it and shows on the calm island
  await setup({ boss: true, isle: 'starter', capSeen: 40 }); await sleep(1400);
  const sceneFirst = await ev(() => !!A.UI.sceneBox && !document.querySelector('.toast'));
  for (let i = 0; i < 6; i++) { await ev(() => { const b = document.querySelector('#sc-skip'); if (b) b.click(); }); await sleep(400); }
  await sleep(2000);
  console.log('  a scene played first: ' + sceneFirst);
  const toast = await ev(() => ({ t: [...document.querySelectorAll('.toast')].map((e) => e.textContent).join('|'), seen: A.State.state.o19.cap }));
  if (!/Level cap raised to 50/.test(toast.t)) console.log('  toast state ' + JSON.stringify(toast) + ' ' + JSON.stringify(await ev(() => ({ modal: A.UI.modalOpen(), scr: A.UI.screen, sb: !!A.UI.sceneBox, dlg: !!document.querySelector('.dlg') }))));
  ok(/Level cap raised to 50/.test(toast.t) && toast.seen === 50, 'an old save with the Forest Crown beaten is told once that the cap is now 50');
  await shot('cap-raised');
  await ev(() => { document.querySelectorAll('.toast').forEach((t) => t.remove()); A.UI.showIsland(); }); await sleep(2000);
  ok(!(await ev(() => [...document.querySelectorAll('.toast')].some((e) => /Level cap raised/.test(e.textContent)))), 'and only once');

  /* ---------- reload: a 19B construction-preview unlock without the Forest Crown closes again (Phase 19C) ---------- */
  await ev(() => { const s0 = A.State.state; if (s0.campaign && s0.campaign.bosses) delete s0.campaign.bosses.verdant; delete s0.dungeon.v_elderroot; A.State.state.islands.obsidian = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'preview' }; A.State.state.currentIsland = 'obsidian'; A.State.save(); });
  await page.reload(); await page.waitForFunction(() => window.A && A.UI && A.UI.screen);
  const rl = await ev(() => { const s = A.State.state; return { live: A.World.islandLive('obsidian'), isle: s ? s.currentIsland : null, open: !!(s && s.islands.obsidian && s.islands.obsidian.unlocked), kept: !!(s && s.islands.obsidian && s.islands.obsidian.obstacles) }; });
  ok(rl.live && rl.isle !== 'obsidian' && !rl.open && rl.kept, 'after a reload a preview unlock without the Forest Crown is closed: the save moves to a ready island and keeps its island record');

  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'perf.json'), JSON.stringify(perf, null, 1));
  await browser.close(); srv.close();
  console.log('\nbrowser-obsidian19b: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
