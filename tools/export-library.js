// Exports the environment library: every catalog asset and variant as glTF binary (.glb, for Godot 4) and
// MagicaVoxel (.vox), plus assets/library/manifest.json with category, footprint, status, triangle counts and files.
// Usage: node tools/export-library.js [outDir=assets/library]
const { chromium } = require('playwright'); const serve = require('../tests/server.js'); const path = require('path'), fs = require('fs');
(async () => {
  const out = process.argv[2] || path.join(__dirname, '..', 'assets', 'library'); const srv = await serve();
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await br.newPage({ viewport: { width: 400, height: 300 } }); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(srv.url + 'tools/library.html?id=grassBlock'); await p.waitForFunction(() => window.__ready && window.LIB, null, { timeout: 120000 });
  const cat = await p.evaluate(() => window.LIB.CATALOG); const manifest = { generated: new Date().toISOString(), unit: '1 unit = 1 island cell (glb); 1 voxel = 1/8 cell (vox)', assets: [] };
  for (const e of cat) {
    const rec = Object.assign({}, e, { files: [], stats: [] });
    for (let v = 1; v <= e.variants; v++) {
      const suf = e.variants > 1 ? '_' + v : '', dir = (k) => { const d = path.join(out, k, e.cat); fs.mkdirSync(d, { recursive: true }); return d; };
      const g = await p.evaluate(([id, v]) => window.LIB.toGLB(id, v, false), [e.id, v]); fs.writeFileSync(path.join(dir('glb'), e.id + suf + '.glb'), Buffer.from(g.b64, 'base64'));
      const x = await p.evaluate(([id, v]) => window.LIB.toVOX(id, v), [e.id, v]); fs.writeFileSync(path.join(dir('vox'), e.id + suf + '.vox'), Buffer.from(x.b64, 'base64'));
      rec.files.push('glb/' + e.cat + '/' + e.id + suf + '.glb', 'vox/' + e.cat + '/' + e.id + suf + '.vox'); rec.stats.push(Object.assign({ variant: v, voxSize: x.size, colours: x.colours, colourBits: x.bits }, g.stats));
    }
    manifest.assets.push(rec); process.stdout.write('.');
  }
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log('\nassets:', manifest.assets.length, 'files:', manifest.assets.reduce((s, a) => s + a.files.length, 0), 'errors:', errs.join(' | ') || 'none');
  await br.close(); srv.close();
})();
