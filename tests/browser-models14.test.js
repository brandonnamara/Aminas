// Phase 14 real-browser test (Chromium + Playwright, software WebGL; NOT a phone): building model slots. A test-only
// stand-in .glb (tests/fixtures/make-glb.js: NOT a Tripo model) is put in the Farm, Hatchery and Fire habitat slots
// to prove the pipeline: loading, inspection, fitting to the footprint, fallback, animation, and that the buildings
// behave exactly as before. Run: node tests/browser-models14.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
require('./fixtures/make-glb')(path.join(__dirname, 'fixtures', 'standin.glb'));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [], reqs = [];
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true })).newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('request', (r) => { if (/\.glb|GLTFLoader/.test(r.url())) reqs.push(r.url()); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const setup = () => ev(() => { A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; const s = A.State.newGame(), R = A.Rules, W = A.World; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.quality = 'high';
    Object.keys(s.buildings).forEach((id) => { const b = s.buildings[id]; if (b.state === 'ruined' && id !== 'reliquarygate') { b.state = 'built'; b.level = 1; s.struct[id] = true; } }); s.rank = 12; s.res.gold = 50000; s.res.food = 500;
    const a = R.addAmina(s, 'lumifern', 8), f = R.addAmina(s, 'pyrokai', 8); const out = { ids: {} };
    ['farm', 'hab_fire'].forEach((t) => { const sp = W.findSpot(s, 'starter', t, 0); const r = W.buildNew(s, 'starter', t, sp[0], sp[1], 0); out.ids[t] = r.id || (r.building && r.building.id); });
    Object.values(s.buildings).forEach((b) => { if (b.state === 'constructing') { b.state = 'built'; b.level = Math.max(1, b.level); delete b.endAt; } }); out.fire = f.uid; R.drain(); A.State.save(); A.UI.showIsland(); return out; });
  const tidy = async () => { await page.waitForSelector('#world.vox', { timeout: 60000 }); await sleep(1200); await ev(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('.dlg,.toast').forEach((x) => x.remove()); }); };
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland);

  /* ---- empty slots: nothing is loaded, nothing changes ---- */
  const shipped = await ev(() => { const m = A.Data.BUILDING_MODELS, j = JSON.parse(JSON.stringify(m)); Object.keys(m).forEach((k) => (m[k] = null)); return j; }); const slots0 = await ev(() => JSON.stringify(A.Data.BUILDING_MODELS)); let U = await setup(); await tidy();
  const base = await ev(() => ({ b: A.VoxIsland.breakdown(), st: ['hatchery', 'farm', 'hab_fire'].map((t) => A.ModelSlots.status(t).state) }));
  ok(slots0 === '{"hatchery":null,"farm":null,"hab_fire":null}' && base.st.join() === 'empty,empty,empty' && reqs.length === 0, 'with the slots emptied, no model and no loader is fetched');
  ok(U.ids.farm && U.ids.hab_fire && base.b.buildings > 0, 'a Farm and a Fire habitat are on the island, drawn from the built-in voxel models');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'slots-empty-voxel.png') });

  /* ---- a failing model falls back ---- */
  await ev(() => { A.Data.BUILDING_MODELS.farm = { url: 'assets/models/does-not-exist.glb' }; A.UI.showIsland(); }); await sleep(2500);
  const bad = await ev(() => ({ s: A.ModelSlots.status('farm'), b: A.VoxIsland.breakdown() }));
  ok(bad.s.state === 'failed' && /404/.test(bad.s.error) && bad.b.buildings === base.b.buildings && errors.length === 0, 'a missing model file is reported and the voxel Farm stays (no script error, same picture)');
  await ev(() => A.ModelSlots.forget('farm'));

  /* ---- stand-in model in all three slots ---- */
  await ev(() => { const u = 'tests/fixtures/standin.glb'; A.Data.BUILDING_MODELS.farm = { url: u, spin: 'sail|blade' }; A.Data.BUILDING_MODELS.hatchery = { url: u }; A.Data.BUILDING_MODELS.hab_fire = { url: u, yaw: 90 }; A.State.state.buildings[Object.keys(A.State.state.buildings).find((k) => A.State.state.buildings[k].type === 'farm')].stock = 0; A.UI.showIsland(); });
  await page.waitForFunction(() => ['farm', 'hatchery', 'hab_fire'].every((t) => A.ModelSlots.status(t).state === 'ready'), null, { timeout: 30000 }); await sleep(900);
  const m = await ev(() => ({ i: A.ModelSlots.status('farm').info, b: A.VoxIsland.breakdown(), g: A.VoxIsland.models ? A.VoxIsland.models() : null }));
  ok(m.i.triangles === 24 && m.i.meshes === 2 && m.i.materials === 1 && m.i.textures.length === 0 && m.i.size.join() === '4,3.7,2.3' && !m.i.pivotAtBase && !m.i.pivotCentred && m.i.warnings.length === 0 && m.i.bytes === 2712, 'the model is inspected on load: 24 triangles, 2 meshes, 1 material, no textures, size 4 × 3.7 × 2.3, pivot off-centre and above its base, 2.7 KB, within the mobile budget');
  ok(m.i.spinParts.join() === 'windmill_sails' && m.i.animations.length === 0, 'its separate “windmill_sails” part is found for the windmill turn');
  ok(m.g && m.g.length === 3 && m.g.every((g) => Math.abs(g.minY) < 0.02 && g.w <= g.fw + 0.01 && g.d <= g.fd + 0.01 && Math.abs(g.cx - g.fx) < 0.02 && Math.abs(g.cz - g.fz) < 0.02), 'each model stands on the ground, centred on its building, inside the footprint (whatever its own pivot and scale)');
  const farm = m.g.find((g) => g.type === 'farm'), fire = m.g.find((g) => g.type === 'hab_fire');
  ok(Math.max(farm.w / farm.fw, farm.d / farm.fd) > 0.94 && Math.abs(fire.w / fire.d - 2.3 / 4) < 0.05, 'the Farm model fills its 3 × 2 footprint; the yaw option turns the habitat model a quarter turn');
  ok(m.b.buildings < base.b.buildings && m.b.buildings > 0, 'the three voxel models are replaced, the other buildings are still voxel (' + base.b.buildings + ' → ' + m.b.buildings + ' building triangles)');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'slots-standin-test-model.png') });
  // the sails are turned by the island's ambient tick (which stops at rest, for Reduce Motion and in Battery saver)
  const spin = await ev(() => { const read = () => A.VoxIsland.models().find((g) => g.type === 'farm').spin; const a = read(); A.VoxIsland.spinModels(1); return { a, b: read() }; });
  ok(Math.abs(spin.b - spin.a - Math.PI * 2 * 6 / 60) < 1e-6, 'one second of the ambient tick turns the sails 36° (6 turns a minute); nothing else moves');

  /* ---- the buildings behave as before ---- */
  const play = await ev((U) => { const s = A.State.state, W = A.World, R = A.Rules, out = {}; const farm = s.buildings[U.ids.farm], hab = s.buildings[U.ids.hab_fire];
    out.rate = W.perMin(s, farm); farm.last = Date.now() - 30 * 60000; farm.stock = 0; W.tickProduction(s, Date.now()); const f0 = s.res.food; out.stock = Math.floor(farm.stock); const c = W.collect(s, U.ids.farm); out.got = s.res.food - f0;
    const g0 = s.res.gold, up = W.upgradeInfo(s, U.ids.farm); out.up = W.upgrade(s, U.ids.farm).ok; out.paid = g0 - s.res.gold; out.cost = up.cost.gold; farm.state = 'built'; farm.level = 2; delete farm.endAt; delete farm.toLevel;
    out.assign = W.assign(s, U.ids.hab_fire, U.fire).ok; out.res = (hab.residents || []).length; out.habRate = W.perMin(s, hab) > 0;
    const sp = W.findSpot(s, 'starter', 'farm', 1, null, U.ids.farm); out.move = W.move(s, U.ids.farm, sp[0], sp[1], 1).ok; out.rot = farm.rot;
    out.breed = R.startBreed(s, s.aminas[0].uid, s.aminas[1].uid).ok; out.eggs = s.eggs.length; R.drain(); A.State.save(); A.UI.showIsland(); return out; }, U);
  ok(play.stock > 0 && play.got === play.stock && play.rate > 0, 'Farm: food is produced and collected as before (' + play.got + ' food after 30 minutes)');
  ok(play.up && play.paid === play.cost, 'Farm: the upgrade costs what it did (' + play.cost + ' gold)');
  ok(play.assign && play.res === 1 && play.habRate, 'Fire habitat: an Amina is assigned and it produces');
  ok(play.move && play.rot === 1, 'the Farm can be moved and turned'); await sleep(900);
  const after = await ev(() => A.VoxIsland.models());
  ok(after.length === 3 && after.every((g) => Math.abs(g.cx - g.fx) < 0.02 && Math.abs(g.cz - g.fz) < 0.02 && g.w <= g.fw + 0.01 && g.d <= g.fd + 0.01), 'after moving and turning, the model follows the building and still fits its (turned) footprint');
  ok(play.breed && play.eggs === 1, 'Hatchery: breeding still lays an egg');
  await ev(() => A.UI.hatchery()); await sleep(300); ok(await ev(() => !!document.querySelector('#modal-root .overlay .hx-slot')), 'the Hatchery screen opens as before'); await ev(() => A.UI.closeAll());
  // the building's hit area on the 2D layer is still there and opens its panel
  const hit = await ev((id) => { const e = document.querySelector('[data-bid="' + id + '"], [data-id="' + id + '"]'); return !!e; }, U.ids.farm);
  ok(hit, 'the Farm keeps its tap area on the island');
  // save and reload: nothing about the model is saved
  const saved = await ev(() => { A.State.save(); const raw = localStorage.getItem(A.Data.SAVE_KEY); return { glb: /glb|BUILDING_MODELS|modelslot/i.test(raw), n: Object.keys(A.State.state.buildings).length }; });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland); const re = await ev(() => { A.Perf.reportSlow = () => {}; const okL = A.State.load(); A.UI.showIsland(); return { okL, n: Object.keys(A.State.state.buildings).length, eggs: A.State.state.eggs.length }; }); await tidy();
  ok(!saved.glb && re.okL && re.n === saved.n && re.eggs === 1, 'nothing about models is written to the save; the game reloads with the same buildings and egg');

  /* ---- the shipped models (the Tripo Hatchery and Farm) ---- */
  const touchLite = await ev(async () => { for (let i = 0; i < 300; i++) { await new Promise((r) => setTimeout(r, 200)); if (['farm', 'hatchery'].every((t) => /ready|failed/.test(A.ModelSlots.status(t).state))) break; } const r = ['farm', 'hatchery'].map((t) => A.ModelSlots.status(t).lite); A.ModelSlots.forceFull = true; A.UI.showIsland(); return r; });
  ok(touchLite.every(Boolean), 'on a touch screen (a phone) the lighter files are loaded, even at the High tier');
  ok(shipped.hatchery && shipped.farm && shipped.hab_fire && Object.keys(shipped).length === 3, 'shipped slots: Hatchery, Farm and Fire habitat are filled; no other building type has a model');
  await page.waitForFunction(() => ['farm', 'hatchery', 'hab_fire'].every((t) => /ready|failed/.test(A.ModelSlots.status(t).state)), null, { timeout: 90000 }); await sleep(1500);
  const real = await ev(() => ({ f: A.ModelSlots.status('farm'), h: A.ModelSlots.status('hatchery'), x: A.ModelSlots.status('hab_fire'), g: A.VoxIsland.models(), b: A.VoxIsland.breakdown(), fire: A.ModelSlots.status('hab_fire').state, B: A.Data.MODEL_BUDGET }));
  [['Farm', real.f], ['Hatchery', real.h], ['Fire habitat', real.x]].forEach(([n, r]) => { const i = r.info || {};
    ok(r.state === 'ready' && i.ok && i.warnings.length === 0 && i.triangles <= real.B.triangles && i.maxTexture > 0 && i.maxTexture <= real.B.textureSize && i.textures.length <= real.B.textures && i.bytes <= real.B.bytes, n + ' model loads within the mobile budget: ' + (i.triangles || 0).toLocaleString('en-GB') + ' triangles, ' + (i.textures || []).map((t) => t.slot + ' ' + t.w + '×' + t.h).join(', ') + ', ' + ((i.bytes || 0) / 1048576).toFixed(1) + ' MB, about ' + i.textureMemoryMB + ' MB of texture memory');
    ok(i.meshes === 1 && i.materials === 1 && i.transparentMaterials === 0 && !i.skinned && i.animations.length === 0, n + ' model: one mesh, one opaque material, no skeleton or animation (so no separate moving parts)'); });
  const rg = (t) => real.g.find((g) => g.type === t);
  ok(real.g.length === 3 && real.g.every((g) => g.minY <= 0.001 && g.minY > -0.7 && Math.abs(g.cx - g.fx) < 0.03 && Math.abs(g.cz - g.fz) < 0.03) && rg('hatchery').w <= 3.01 && rg('hatchery').d <= 3.01 && rg('hatchery').height > 2, 'all three are centred on their buildings with their own ground base sunk into the terrain (' + real.g.map((g) => g.type + ' ' + (-g.minY).toFixed(2)).join(', ') + ' cells); the Hatchery fills its 3 × 3 plot');
  ok(rg('hab_fire').height < 2.4 && real.x.info.size[1] < 0.5, 'Fire habitat: the figure is gone (the model is ' + real.x.info.size[1] + ' units tall; with the figure the export was 1.0)');
  if (SHOTS) { await ev(() => { A.UI.closeAll(); document.querySelectorAll('.dlg,.toast').forEach((x) => x.remove()); }); await page.screenshot({ path: path.join(SHOTS, 'tripo-hatchery-farm.png') }); }
  // lower tiers get the lighter files
  const lite = await ev(async () => { A.ModelSlots.forceFull = false; A.ModelSlots.forget('farm'); A.ModelSlots.forget('hatchery'); A.ModelSlots.forget('hab_fire'); A.State.state.settings.quality = 'balanced'; A.UI.showIsland(); for (let i = 0; i < 300; i++) { await new Promise((r) => setTimeout(r, 200)); if (['farm', 'hatchery'].every((t) => /ready|failed/.test(A.ModelSlots.status(t).state))) break; } return ['farm', 'hatchery'].map((t) => { const s = A.ModelSlots.status(t); return { lite: s.lite, url: s.url, tris: s.info && s.info.triangles, tex: s.info && s.info.maxTexture, mb: s.info && s.info.bytes / 1048576 }; }); });
  ok(lite.every((l) => l.lite && /-lite\.glb$/.test(l.url) && l.tris <= 27000 && l.tex <= 1024 && l.mb < 1), 'the lighter files: ' + lite.map((l) => l.tris.toLocaleString('en-GB') + ' triangles, ' + l.tex + ' px, ' + l.mb.toFixed(1) + ' MB').join(' and '));
  const sv = await ev(async () => { A.State.state.settings.batterySaver = true; A.UI.showIsland(); for (let i = 0; i < 300; i++) { await new Promise((r) => setTimeout(r, 200)); if (['farm', 'hatchery', 'hab_fire'].every((t) => A.ModelSlots.status(t).saver && /ready|failed/.test(A.ModelSlots.status(t).state))) break; } const r = ['farm', 'hatchery', 'hab_fire'].map((t) => { const s = A.ModelSlots.status(t); return { saver: s.saver, state: s.state, tris: s.info && s.info.triangles }; }); A.State.state.settings.batterySaver = false; A.UI.showIsland(); return r; });
  ok(sv.every((x) => x.saver && x.state === 'ready' && x.tris <= 13000), 'in Battery saver the much lighter files are loaded: ' + sv.map((x) => (x.tris || 0).toLocaleString('en-GB')).join(', ') + ' triangles');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-models14)'); await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
