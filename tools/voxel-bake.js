// Bakes voxel portraits: node tools/voxel-bake.js [id,id,...]  -> assets/portraits/<id>.webp (320 px: 160 px at 2x)
// Uses the game's own voxel engine in a headless browser, so a portrait always matches the model.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright'); const serve = require(path.join(__dirname, '../tests/server.js'));
const ids = (process.argv[2] || 'umbrit,cannonis,aimza,aimza2,aimza3').split(',');
(async () => {
  const srv = await serve(); const b = await chromium.launch(); const p = await (await b.newContext({ deviceScaleFactor: 2 })).newPage();
  await p.goto(srv.url); await p.waitForFunction(() => window.A && A.Voxel && A.Data);
  for (const id of ids) {
    const url = await p.evaluate((id) => { const s = A.Data.SPECIES[id]; A.Voxel.clearCache(); return A.Voxel.sprite(s.art.vox, s.art.st, 160).toDataURL('image/webp', 0.9); }, id);
    const file = path.join(__dirname, '../assets/portraits/' + id + '.webp'); fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log('baked', id, fs.statSync(file).size, 'bytes');
  }
  await b.close(); srv.close();
})();
