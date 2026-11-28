// Phase 20B, real-browser check (Chromium + Playwright, software WebGL, 844×390 touch; NOT an iPhone): the Celestial
// Crown through the developer construction preview (the island is not live): the Silent Observatory on the voxel island,
// twelve places and nine outdoor entrances with 3D models and tap areas, the six obstacle types in 3D, 62 obstacles in
// place, sheets with no way in, the Wayfinder, a real tap, the Starwell Habitat in 3D and 2D with developer access, the
// Codex line, reload (the preview ends and the island closes, records kept), travel round trips without growth, the 2D
// fallback, and draw calls / frame times against the three completed islands (relative only).
// Run: node tests/browser-celestial20b.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = async (n) => { if (!SHOTS) return; await sleep(900); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 85 }); };
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 30000, polling: 50 });
  const tidy = () => ev(async () => { for (let i = 0; i < 40 && (document.querySelector('.dlg') || document.querySelector('#sc-skip')); i++) { const d = document.querySelector('.dlg .dlg-skip') || document.querySelector('#sc-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 150)); } A.UI.closeAll(); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => {
    const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['hollow', 'tidegate', 'moonshrine', 'hatchery'].forEach((k) => { s.struct[k] = true; Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
    ['lumifern', 'aimza3', 'zeep3'].forEach((sp, i) => R.addAmina(s, sp, 50 + i));
    ['verdant', 'obsidian'].forEach((k) => { s.islands[k] = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' }; });
    s.campaign = s.campaign || {}; s.campaign.bosses = Object.assign({}, s.campaign.bosses, { verdant: true, obsidian: true });
    s.story = s.story || {}; s.story.scenes = Object.assign({}, s.story.scenes, { o_arrival: 1, v_arrival: 1 }); s.notified = s.notified || {}; s.rank = 12;
    s.res.gold = 400000; s.res.food = 9000; s.res.gems = 200; s.currentIsland = 'obsidian'; A.State.state = s; R.drain(); A.State.save(); A.UI.showIsland(true);
  });
  await until(() => !!document.querySelector('#world')); await sleep(1200); await tidy();
  await until(() => A.VoxIsland.ready(), null, 90000).catch(() => {});

  /* ---------- normal play: the Crown is not offered, even with the Forge Heart beaten ---------- */
  const np = await ev(() => ({ live: A.World.islandLive('celestial'), r: A.UI.travelTo('celestial'), isle: A.State.state.currentIsland, unl: A.World.islandUnlocked(A.State.state, 'celestial'), flag: A.Data.C20.live }));
  ok(!np.live && np.r === false && np.isle === 'obsidian' && !np.unl && np.flag === false, 'the Celestial Crown is not live: a save with the Forge Heart beaten cannot travel there');
  const map0 = await ev(() => { A.UI.worldMap && A.UI.worldMap(); const t = (document.querySelector('.overlay') || document.body).textContent; A.UI.closeAll(); return t; });
  ok(!/Celestial Crown[^.]*Travel/.test(map0), 'the world map does not offer travel there');

  /* ---------- the developer construction preview (session only) ---------- */
  await ev(() => { A.UI.devPanel(); }); await sleep(300);
  ok(await ev(() => !!document.querySelector('[data-act="c20Preview"]') && !!document.querySelector('[data-act="c20Hab"]')), 'the developer panel offers the Celestial Crown preview and Starwell Habitat access');
  await ev(() => document.querySelector('[data-act="c20Preview"]').click()); await sleep(2500); await tidy();
  await until(() => A.VoxIsland.ready() && A.State.state.currentIsland === 'celestial', null, 120000).catch(() => {});
  const vx = await ev(() => { const s = A.State.state, D = A.Data, kinds = A.IsoArt.landmark('celestial', s).map((l) => l.kind);
    const want = D.C20.sites.map((x) => x.kind).concat(D.C20.gates.filter((g) => !g.inside).map((g) => 'c_gate_' + g.id));
    return { on: A.VoxIsland.ready(), isle: s.currentIsland, by: s.islands.celestial.by, kinds: kinds.length, has: want.filter((k) => A.IsoArt.voxHas('l', k)).length, want: want.length,
      obTypes: ['floatstone', 'starshard', 'moonbloom', 'pillar', 'cloudpuff', 'geode'].filter((t) => A.IsoArt.voxHas('n', t)).length,
      hits: [...new Set([...document.querySelectorAll('#objs [data-hit^="c20:"]')].map((e) => e.dataset.hit))].length, expect: D.C20.sites.length + D.C20.gates.filter((g) => !g.inside).length,
      obs: A.Data.OBSTACLES.celestial.filter((o) => A.World.obstacleState(s, o.id) === 'present').length, items: A.VoxIsland.items.filter((i) => /^o:ce-/.test(i)).length };
  });
  ok(vx.on && vx.isle === 'celestial' && vx.by === 'preview', 'the preview opens the Crown on the voxel island for this session');
  ok(vx.has === vx.want && vx.want === 21, 'every place and outdoor entrance has its own 3D model (' + vx.has + ' of ' + vx.want + ')');
  ok(vx.obTypes === 6, 'all six obstacle types have 3D models (' + vx.obTypes + ' of 6)');
  ok(vx.obs === 62 && vx.items === 62, 'all 62 obstacles stand where they were and every one is drawn in 3D (' + vx.obs + ', ' + vx.items + ')');
  ok(vx.hits === vx.expect, 'every place and outdoor entrance has a tap area (' + vx.hits + ' of ' + vx.expect + ')');
  // no obstacle blocks construction while invisible: every present obstacle is in the 3D layer's item list with a model
  const inv = await ev(() => { const s = A.State.state, ids = new Set(A.VoxIsland.items); return A.Data.OBSTACLES.celestial.filter((o) => A.World.obstacleState(s, o.id) === 'present' && !(ids.has('o:' + o.id) && A.IsoArt.voxHas('n', o.type))).map((o) => o.id); });
  ok(inv.length === 0, 'no obstacle blocks building while being invisible in 3D (' + (inv.join(',') || 'none') + ')');
  await ev(() => A.UI.focusFoot(16, 16, 2, 2, 0.5)); await shot('c-3d-whole');

  /* ---------- sheets: places, entrances, no way in ---------- */
  for (const id of ['jetty', 'orrery', 'observatory', 'bell', 'lenshold']) { await ev((i) => A.UI.c20Open(i), id); await sleep(300); if (id === 'observatory' || id === 'orrery') await shot('sheet-' + id); await tidy(); }
  await ev(() => A.UI.c20Open('c_cloudstair')); await sleep(300);
  const g1 = await ev(() => { const sh = [...document.querySelectorAll('.c20-sheet')].filter((e) => /Cloudstair Landing/.test((e.querySelector('h2') || {}).textContent || '')).pop() || document.createElement('div'); return { gate: (sh.querySelector('.v18-gate') || {}).textContent || '', enter: !!document.querySelector('[data-act="c20Enter"]'), dots: sh.querySelectorAll('.c20-order .v18-dot').length, ent: (sh.querySelector('.v18-ent') || {}).textContent || '' }; });
  ok(/Dungeon 1 of 10/.test(g1.gate) && /Sealed/.test(g1.gate) && !g1.enter && g1.dots === 10, 'Dungeon 1 is sealed with no Enter button, and shows the ten-step order');
  if (!/Sealed/.test(g1.gate)) console.log('  gate1 ' + JSON.stringify(g1));
  ok(/The Entity/.test(g1.ent), 'its sheet carries an introductory Entity line');
  await shot('sheet-gate1'); await tidy();
  const sealed = await ev(() => { const s = A.State.state, C = A.Rules.C20, uids = s.aminas.slice(0, 3).map((a) => a.uid);
    const runs = A.Data.C20.gates.map((g) => A.Rules.startRun(s, g.id, uids)); A.UI.c20Open('c_threshold'); const enter = !!document.querySelector('[data-act="c20Enter"]'), txt = (([...document.querySelectorAll('.c20-sheet')].filter((e) => /Threshold/.test((e.querySelector('h2') || {}).textContent || '')).pop() || document.createElement('div')).querySelector('.v18-gate') || {}).textContent || ''; A.UI.closeAll();
    A.UI.dIsland = 'celestial'; A.UI.dungeons(); const tabs = [...document.querySelectorAll('.overlay [data-act="dIsle"], .overlay .isle-tab')].map((e) => e.textContent).join('|'), ids = [...document.querySelectorAll('.overlay [data-act="enterDungeon"]')].map((e) => e.dataset.id); A.UI.closeAll();
    return { runs: runs.every((r) => r && r.ok === false), enter, txt, celestialEnter: ids.filter((i) => /^c_/.test(i)).length, run: s.run, prog: C.progress(s) }; });
  ok(sealed.runs && !sealed.enter && /Dungeon 10 of 10/.test(sealed.txt) && /Locked/.test(sealed.txt), 'no Celestial dungeon can be started, the Threshold included');
  if (!/Locked/.test(sealed.txt)) console.log('  sealed ' + JSON.stringify(sealed));
  ok(sealed.celestialEnter === 0 && !sealed.run, 'the Dungeons screen offers no way into a Celestial dungeon');
  await ev(() => { const el = document.createElement('button'); el.dataset.act = 'c20Enter'; el.dataset.id = 'c_cloudstair'; document.body.appendChild(el); el.click(); el.remove(); }); await sleep(300);
  ok(await ev(() => !A.State.state.run && !document.querySelector('.battle')), 'a forged Enter button does nothing');

  /* ---------- a real tap on the island, and the Wayfinder ---------- */
  const tapAt = async (id) => { await ev((i) => { const C = A.Rules.C20, q = C.site(i) || C.gate(i); A.UI.focusFoot(q.x, q.y, q.w || 1, q.h || 1, 0.9); }, id);
    const where = (i) => ev((k) => { const e = document.querySelector('#objs [data-hit="c20:' + k + '"]'); if (!e) return null; const b = (e.querySelector('ellipse[fill="transparent"]') || e).getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; }, i);
    let r = null; for (let k = 0; k < 40; k++) { await sleep(150); const n = await where(id); if (n && r && n.x === r.x && n.y === r.y) break; r = n; }
    if (!r) return false; await page.touchscreen.tap(r.x, r.y); await sleep(500); return ev(() => !!document.querySelector('.c20-sheet')); };
  ok(await tapAt('dome') && await ev(() => /Shadowed Dome/.test(document.querySelector('.c20-sheet h2').textContent)), 'tapping the Shadowed Dome on the island opens its sheet');
  await tidy();
  ok(await tapAt('c_bellloft') && await ev(() => /Bell Loft/.test(document.querySelector('.c20-sheet h2').textContent) && /Dungeon 8 of 10/.test(document.querySelector('.c20-sheet').textContent)), 'tapping entrance 8 opens its sheet with the Bell Loft’s place and dungeon');
  await tidy();
  await ev(() => A.UI.c20Open('jetty')); await sleep(600);
  await ev(() => document.querySelector('.v18-wp[data-id="orrery"]').click()); await sleep(1000);
  const wf = await ev(() => ({ modal: !!document.querySelector('.c20-sheet'), guide: (document.querySelector('#guide-root') || {}).textContent, arrow: document.querySelectorAll('#hlx .hl-arrow').length }));
  ok(!wf.modal && /Orrery Wheel/.test(wf.guide || '') && wf.arrow === 1, 'the Wayfinder closes the sheet, moves the camera to the Orrery Wheel and points at it');
  await shot('wayfinder-orrery'); await ev(() => A.UI.clearGuide());
  const allSeen = await ev(() => { A.Rules.C20.placeIds().forEach((i) => { A.UI.c20Open(i); A.UI.closeAll(); }); return A.Rules.C20.progress(A.State.state); });
  ok(allSeen.seen === allSeen.total && allSeen.total === 12, 'every place can be visited and is remembered (' + allSeen.seen + ' of ' + allSeen.total + ')');

  /* ---------- the Starwell Habitat (developer access) ---------- */
  const hab = await ev(async () => { const s = A.State.state, W = A.World, R = A.Rules, C = R.C20; const locked = !R.reqMet(s, A.Data.BUILDINGS.hab_resonance.req);
    C.devHabitat(true); const sp = W.findSpot(s, 'celestial', 'hab_resonance', 0, [22, 22]), r = W.buildNew(s, 'celestial', 'hab_resonance', sp[0], sp[1], 0), b = s.buildings[r.id]; b.state = 'built'; b.level = 3; delete b.endAt;
    R.drain && R.drain(); A.UI.showIsland(); return { locked, ok: r.ok, id: r.id, x: sp[0], y: sp[1] }; });
  ok(hab.locked && hab.ok, 'the Starwell Habitat is locked in normal play and can be placed with developer access');
  await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {}); await sleep(1500); await tidy();
  const hab3 = await ev((h) => { const e = document.querySelector('#objs [data-bid="' + h.id + '"]'); return { model: !!(e && e.classList.contains('vx')) && A.IsoArt.voxHas('b', 'habitat', 'habitat', 'built') }; }, hab);
  ok(hab3.model, 'it draws as a 3D habitat on the voxel island');
  await ev((h) => A.UI.focusFoot(h.x, h.y, 3, 3, 1.15), hab); await shot('habitat-starwell-3d');
  const cx = await ev(() => { const s = A.State.state, a = s.aminas.find((x) => x.sp === 'aimza3'); const last = () => [...document.querySelectorAll('#modal-root .overlay')].filter((o) => o.querySelector('.detail')).pop(); A.UI.detail(a.sp, { uid: a.uid }); const t = (last().querySelector('.c20-home') || {}).textContent || ''; A.UI.closeAll(); const b = s.aminas.find((x) => x.sp === 'zeep3'); A.UI.detail(b.sp, { uid: b.uid }); const t2 = !!last().querySelector('.c20-home'); A.UI.closeAll(); return { t, t2 }; });
  ok(/Starwell Habitat/.test(cx.t) && !cx.t2, 'the Codex shows the Starwell Habitat as the home of a Resonance Amina (and not of a Metal one)');

  /* ---------- the 2D island (3D off) ---------- */
  const flat = await ev(async () => { A.State.state.settings.voxIsland = false; A.UI.showIsland(); await new Promise((r) => setTimeout(r, 1200));
    return { vox: !!document.querySelector('#world.vox'), hits: new Set([...document.querySelectorAll('#objs [data-hit^="c20:"]')].map((e) => e.dataset.hit)).size, want: A.Data.C20.sites.length + A.Data.C20.gates.filter((g) => !g.inside).length,
      obs: document.querySelectorAll('#objs [data-oid^="ce-"], #objs .obs').length }; });
  ok(!flat.vox && flat.hits === flat.want, 'with the voxel island off, the places draw as 2D pictures with the same ' + flat.want + ' tap areas');
  await ev(() => A.UI.focusFoot(16, 16, 2, 2, 0.5)); await shot('c-2d');
  await ev((h) => A.UI.focusFoot(h.x, h.y, 3, 3, 1.15), hab); await shot('habitat-starwell-2d');
  await ev(() => { A.State.state.settings.voxIsland = true; A.UI.showIsland(); }); await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {}); await sleep(1500); await tidy();

  /* ---------- travel round trips: no growth ---------- */
  await ev(async () => { A.UI.travelTo('starter'); for (let i = 0; i < 100 && !A.VoxIsland.models().some((m) => m.type === 'hatchery'); i++) await new Promise((r) => setTimeout(r, 200)); A.UI.travelTo('obsidian'); await new Promise((r) => setTimeout(r, 900)); A.UI.travelTo('celestial'); await new Promise((r) => setTimeout(r, 900)); });
  await tidy(); const lk0 = await ev(() => ({ g: A.VoxIsland.stats().geometries, t: A.VoxIsland.stats().textures, n: document.getElementsByTagName('*').length }));
  const t0 = Date.now();
  for (let k = 0; k < 6; k++) await ev(async () => { A.UI.travelTo('obsidian'); await new Promise((r) => setTimeout(r, 600)); A.UI.travelTo('celestial'); await new Promise((r) => setTimeout(r, 600)); });
  const trip = Math.round((Date.now() - t0) / 12);
  await sleep(900); await tidy(); const lk1 = await ev(() => ({ g: A.VoxIsland.stats().geometries, t: A.VoxIsland.stats().textures, n: document.getElementsByTagName('*').length }));
  ok(lk1.g === lk0.g && lk1.t === lk0.t && lk1.n === lk0.n, 'six Obsidian ↔ Celestial round trips leave GPU geometries, textures and page nodes where they were (' + JSON.stringify(lk0) + ' → ' + JSON.stringify(lk1) + ')');

  /* ---------- draw calls and frame times (software WebGL: compare the islands, not absolute speed) ---------- */
  const perf = [];
  for (const iid of ['starter', 'verdant', 'obsidian', 'celestial']) {
    const tl = Date.now(); await ev((i) => A.UI.travelTo(i), iid); await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {}); const load = Date.now() - tl; await sleep(1500); await tidy();
    perf.push(Object.assign({ load }, await ev(async (i) => { const dts = [], t0 = performance.now(); let p = 0; while (performance.now() - t0 < 3000) { const n = await new Promise((r) => requestAnimationFrame(r)); if (p) dts.push(n - p); p = n; } dts.sort((a, b) => a - b); const S1 = A.VoxIsland.stats();
      return { iid: i, calls: S1.calls, tris: S1.triangles, geos: S1.geometries, tex: S1.textures, p50: +dts[dts.length >> 1].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; }, iid)));
  }
  perf.push({ iid: 'trip', ms: trip });
  console.log('  perf ' + JSON.stringify(perf));
  ok(perf[3].calls <= perf[2].calls + 6, 'the Celestial Crown draws in about as many calls as Obsidian Reach (' + perf[3].calls + ' vs ' + perf[2].calls + '): its places and obstacles merge into one mesh');
  ok(perf[3].tris <= perf[2].tris * 1.25, 'and with a comparable triangle count (' + perf[3].tris + ' vs ' + perf[2].tris + ')');

  /* ---------- reload: the preview ends; the island closes; records stay ---------- */
  await ev(() => { A.UI.travelTo('celestial'); A.State.save(); }); await sleep(800);
  await page.reload(); await page.waitForFunction(() => window.A && A.UI && A.State.state, null, { timeout: 60000 }); await sleep(2500); await tidy();
  const rl = await ev((h) => { const s = A.State.state; return { live: A.World.islandLive('celestial'), unl: A.World.islandUnlocked(s, 'celestial'), isle: s.currentIsland, hab: !!(s.buildings[h.id] && s.buildings[h.id].island === 'celestial'), seen: A.Rules.C20.progress(s).seen, dev: A.Rules.C20.dev.habitat || A.Rules.C20.dev.preview, req: A.Rules.reqMet(s, A.Data.BUILDINGS.hab_resonance.req) }; }, hab);
  ok(!rl.live && !rl.unl && rl.isle !== 'celestial', 'after a reload the preview is over: the Crown is closed again and the save stands on a ready island');
  ok(rl.hab && rl.seen === 12, 'the habitat built during the preview and the visit records are kept');
  ok(!rl.dev && !rl.req, 'developer access is not saved: the Starwell Habitat is locked again');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\nbrowser celestial20b: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
