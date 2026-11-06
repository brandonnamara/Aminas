// Environment Phase 3 real-browser test (Chromium + Playwright, software WebGL; NOT a phone).
// Quality tiers (setting, save compatibility, what the island does in each tier), the improved LOD twins, and the
// on-device performance test (it runs, reports, restores the tier, shows a copyable sheet).
// Run: node tests/browser-env3.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js/i.test(m.text())) errors.push(m.text()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.Bench);

  // save compatibility: a save from before Phase 3 has no quality setting; a bad value is repaired
  const sv = await page.evaluate(() => { const S = A.State, a = S.fresh(); delete a.settings.quality; S.sanitize(a); const b = S.fresh(); b.settings.quality = 'ultra'; S.sanitize(b); const c = S.fresh(); c.settings.quality = 'high'; S.sanitize(c); return [a.settings.quality, b.settings.quality, c.settings.quality, S.fresh().settings.quality]; });
  ok(sv[0] === 'auto' && sv[1] === 'auto' && sv[2] === 'high' && sv[3] === 'auto', 'quality setting: old saves read as Auto, bad values are repaired, valid ones kept (' + sv.join(', ') + ')');

  const tiers = await page.evaluate(() => { const P = A.Perf, s = A.State.state.settings, out = {}; out.auto = P.quality(); s.quality = 'high'; out.high = P.quality(); s.quality = 'balanced'; out.bal = P.quality(); s.batterySaver = true; out.saver = P.quality(); s.batterySaver = false; s.quality = 'auto'; P.forceTier = 'high'; out.forced = P.quality(); P.forceTier = null; return out; });
  ok(tiers.auto === 'balanced', 'Auto picks Balanced on a touch device');
  ok(tiers.high === 'high' && tiers.bal === 'balanced' && tiers.saver === 'saver' && tiers.forced === 'high', 'the chosen tier is used, Battery saver overrides it, and the test override wins');

  await page.evaluate(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; R.addAmina(s, 'lumifern', 8); Object.keys(s.buildings).forEach((id) => { const b = s.buildings[id]; if (b.state === 'ruined' && id !== 'reliquarygate') { b.state = 'built'; b.level = 1; s.struct[id] = true; } }); s.missions = { m_hollow: 'claimed' }; R.drain(); A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world.vox', { timeout: 60000 }); await page.waitForTimeout(1200);
  await page.evaluate(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); A.Perf.autoSaver = false; });
  const read = () => page.evaluate(() => ({ st: A.VoxIsland.stats(), b: A.VoxIsland.breakdown() }));
  const bal = await read();
  ok(bal.st.tier === 'balanced' && bal.st.pixelRatio === 1.5 && bal.st.shadowMap === 1024 && bal.st.shadow, 'Balanced: pixel ratio 1.5, shadow map 1024, shadows on (the Phase 2 phone settings)');
  // switch through the Settings control
  await page.evaluate(() => A.UI.settings()); await page.click('[data-act="setSeg"][data-k="quality"][data-v="high"]'); await page.waitForTimeout(1500);
  const hi = await read();
  ok(hi.st.tier === 'high' && hi.st.pixelRatio === 2 && hi.st.shadowMap === 2048 && hi.st.lod === 'off', 'Settings → 3D detail → High: pixel ratio 2, shadow map 2048, full detail');
  ok(await page.$('[data-act="benchAsk"]') !== null, 'Settings offers "Run performance test"');
  await page.click('[data-act="setSeg"][data-k="quality"][data-v="auto"]'); await page.evaluate(() => A.UI.closeAll());
  await page.evaluate(() => { A.State.state.settings.batterySaver = true; A.Perf.apply(); A.UI.renderWorld(true); }); await page.waitForTimeout(1500);
  const sav = await read();
  ok(sav.st.tier === 'saver' && sav.st.pixelRatio === 1 && sav.st.lod === 'all' && sav.st.shadow && sav.st.shadowMap === 512, 'Battery saver: pixel ratio 1, LOD everywhere, shadows kept at 512');
  ok(sav.b.buildings < bal.b.buildings * 0.4 && sav.b.nature < bal.b.nature * 0.5, 'Battery saver draws far fewer triangles (buildings ' + bal.b.buildings + ' → ' + sav.b.buildings + ', nature ' + bal.b.nature + ' → ' + sav.b.nature + ')');
  await page.evaluate(() => { A.State.state.settings.batterySaver = false; A.Perf.apply(); A.UI.renderWorld(true); }); await page.waitForTimeout(1200);
  const back = await read();
  ok(back.st.tier === 'balanced' && back.st.lod === 'off' && back.st.pixelRatio === 1.5, 'turning Battery saver off returns to the chosen tier');

  // the improved LOD twins keep the visible colours: the colour of each building's top faces at half resolution is
  // closer to the full model's than the Phase 2 rule (majority of all voxels, hidden core included) gave
  const lod = await page.evaluate(async () => {
    const u = (p) => new URL(p, document.baseURI).href, lib = await import(u('src/3d/library/index.js')), VM = await import(u('src/3d/voxmesh.js')), VS = await import(u('src/3d/voxstyle.js'));
    const top = (geo) => { const n = geo.attributes.normal.array, c = geo.attributes.color.array, s = [0, 0, 0]; let k = 0; for (let i = 0; i < n.length; i += 3) if (n[i + 1] > 0.5) { s[0] += c[i]; s[1] += c[i + 1]; s[2] += c[i + 2]; k++; } return s.map((x) => x / Math.max(1, k)); };
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const out = []; for (const id of ['b_forge', 'b_hatchery', 'b_moonshrine', 'b_habitat']) {
      const a = lib.buildAsset(lib.find(id), 1), ref = top(a.full.geo);
      const oldG = VM.meshGrid(VM.halfGrid(a.model.g, 3), { size: VS.PV * 2 }), newG = a.lod.geo;
      out.push({ id, old: +dist(top(oldG), ref).toFixed(3), now: +dist(top(newG), ref).toFixed(3), tris: a.stats.tris, lodTris: a.stats.lodTris });
    } return out;
  });
  const avg = (k) => lod.reduce((a, x) => a + x[k], 0) / lod.length;
  ok(avg('now') < avg('old') * 0.6 && lod.every((x) => x.now <= x.old + 0.02), 'LOD twins keep the visible top colours closer on average than the Phase 2 rule, none much worse (' + lod.map((x) => x.id + ' ' + x.old + ' → ' + x.now).join(', ') + ')');
  ok(lod.every((x) => x.lodTris < x.tris * 0.4), 'building LODs stay light (' + lod.map((x) => x.id + ' ' + x.tris + ' → ' + x.lodTris).join(', ') + ')');

  // the performance test: a shortened script runs end to end
  const r = await page.evaluate(async () => { A.Bench.SCRIPT = [['idle', null, 'default', 1, false], ['pan', null, 'default', 1.5, true], ['pan, Battery saver', 'saver', 'default', 1, true]]; const out = await A.Bench.run({}); return { out, forced: A.Perf.forceTier, tier: A.VoxIsland.stats().tier, banner: !!document.querySelector('.bench-banner') }; });
  const o = r.out;
  ok(!o.error && o.phases.length === 3 && o.phases.every((p) => p.fps > 0 && p.p95 > 0 && p.triangles > 0), 'the performance test runs every phase and records frame rate, p95 frame time and triangles' + (o.error ? ': ' + o.error : ''));
  ok(o.phases[2].tier === 'saver' && o.phases[2].pixelRatio === 1 && r.forced === null && r.tier === 'balanced' && !r.banner, 'it measures each tier and restores the player\'s tier afterwards');
  ok(o.device && o.device.dpr === 3 && o.device.gpu && o.loading && o.loading.island3dFirstShownMs > 0 && /fps/.test(o.summary), 'it reports the device, GPU string, load timings and a one-line summary');
  ok(o.heapStartMB !== undefined && o.device.memoryGB !== undefined, 'memory is reported, or marked "not available" where the browser cannot read it');
  await page.evaluate((o) => A.Bench.show(o), o); await page.waitForTimeout(300);
  const sheet = await page.evaluate(() => ({ rows: document.querySelectorAll('.bench-table tr').length, copy: !!document.querySelector('[data-act="benchCopy"]'), json: (() => { try { return !!JSON.parse(document.querySelector('.bench-out').value).phases; } catch (e) { return false; } })() }));
  ok(sheet.rows === 4 && sheet.copy && sheet.json, 'the results sheet lists each phase and holds copyable JSON');
  const saved = await page.evaluate(() => { const g = A.State.state; return { inSave: JSON.stringify(g).indexOf('Aminas island performance test') >= 0, kept: !!localStorage.getItem('aminas.bench') }; });
  ok(!saved.inSave && saved.kept, 'the result is kept for "Show last result" but never written into the game save');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED' : 'PASSED') + ': ' + pass + ' passed, ' + fail + ' failed (browser-env3)');
  await browser.close(); srv.close(); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error('ERROR ' + (e && e.message ? e.message.split('\n').slice(0, 6).join('\n') : e)); process.exit(1); });
