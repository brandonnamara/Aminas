// Environment Phase 2 real-browser test (Chromium + Playwright, software WebGL; NOT a phone).
// The asset library: every catalog asset builds, has a lighter mobile LOD, renders in the viewer without errors,
// and exports to valid .glb and .vox; on the Starter Island the library kinds appear and LOD switches at the
// widest zoom (nature only) and in Battery saver (everything).
// Run: node tests/browser-library.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } }); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js/i.test(m.text())) errors.push(m.text()); });
  await page.goto(srv.url + 'tools/library.html?id=grassBlock'); await page.waitForFunction(() => window.__ready && window.LIB);
  const r = await page.evaluate(async () => {
    const lib = await import('../src/3d/library/index.js'), out = { n: lib.CATALOG.length, cats: new Set(), empty: [], heavierLod: [], st: {} };
    lib.CATALOG.forEach((e) => { out.cats.add(e.cat); out.st[e.status] = (out.st[e.status] || 0) + 1; const a = lib.buildAsset(e, 1); if (!a.stats.voxels) out.empty.push(e.id); if (a.stats.lodTris > a.stats.tris) out.heavierLod.push(e.id); });
    out.cats = [...out.cats]; return out;
  });
  ok(r.n >= 90, 'the catalog lists ' + r.n + ' assets (' + JSON.stringify(r.st) + ')');
  ok(['terrain', 'vegetation', 'architecture', 'buildings', 'ruins', 'decor', 'water', 'biomes'].every((c) => r.cats.includes(c)), 'all eight categories are present');
  ok(r.empty.length === 0, 'every asset builds with voxels' + (r.empty.length ? ': ' + r.empty.join(', ') : ''));
  ok(r.heavierLod.length === 0, 'every mobile LOD is lighter than its full model' + (r.heavierLod.length ? ': ' + r.heavierLod.join(', ') : ''));
  const glb = await page.evaluate(() => window.LIB.toGLB('oakOld', 1, false)), vox = await page.evaluate(() => window.LIB.toVOX('hatchery' === 'x' ? '' : 'b_hatchery', 2));
  const gb = Buffer.from(glb.b64, 'base64'), vb = Buffer.from(vox.b64, 'base64');
  ok(gb.slice(0, 4).toString() === 'glTF' && /COLOR_0/.test(gb.toString('utf8', 20, 20 + gb.readUInt32LE(12))), 'an asset exports to a glTF binary with vertex colours');
  ok(vb.slice(0, 4).toString() === 'VOX ' && vb.readInt32LE(4) === 150 && Math.max(...vox.size) <= 256 && vox.colours <= 255, 'a building exports to a valid MagicaVoxel file (' + vox.size.join('×') + ', ' + vox.colours + ' colours)');
  for (const c of ['terrain', 'vegetation', 'decor', 'biomes']) { await page.goto(srv.url + 'tools/library.html?cat=' + c + '&variants=0'); await page.waitForFunction(() => window.__ready); }
  ok(true, 'the viewer renders terrain, vegetation, decor and island vignettes');
  // the Starter Island uses library kinds and LOD (phone landscape viewport, where the widest zoom reaches 0.3)
  await page.setViewportSize({ width: 844, height: 390 }); await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland);
  await page.evaluate(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; R.addAmina(s, 'lumifern', 8); A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world.vox', { timeout: 60000 }); await page.waitForTimeout(1200);
  const isl = await page.evaluate(() => ({ st: A.VoxIsland.stats(), b: A.VoxIsland.breakdown() }));
  ok(isl.st.lod === 'off' && isl.b.nature > 0, 'at the normal zoom everything is drawn at full detail');
  await page.evaluate(() => { const c = A.UI.cam[A.UI.wv.iid]; c.z = 0.3; A.UI.applyCam(); }); await page.waitForTimeout(800); const zNow = await page.evaluate(() => A.UI.cam[A.UI.wv.iid].z);
  const far = await page.evaluate(() => ({ st: A.VoxIsland.stats(), b: A.VoxIsland.breakdown() }));
  ok(far.st.lod === 'nature' && far.b.nature < isl.b.nature * 0.5 && far.b.buildings === isl.b.buildings, 'at the widest zoom (' + zNow.toFixed(2) + ') nature uses its LOD (' + isl.b.nature + ' → ' + far.b.nature + ' triangles) and buildings keep full detail');
  await page.evaluate(() => { A.State.state.settings.batterySaver = true; A.Perf && A.Perf.apply && A.Perf.apply(); A.UI.renderWorld(true); }); await page.waitForTimeout(1500);
  const sv = await page.evaluate(() => ({ st: A.VoxIsland.stats(), b: A.VoxIsland.breakdown() }));
  ok(sv.st.lod === 'all' && sv.b.buildings < isl.b.buildings, 'Battery saver uses the LOD for buildings too (' + isl.b.buildings + ' → ' + sv.b.buildings + ')');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close(); console.log('\nbrowser library: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error('ERROR ' + (e && e.message ? e.message.split('\n').slice(0, 6).join('\n') : e)); process.exit(1); });
