// Phase 15B: bakes portraits from the refined models (developer switch): node tools/roster15-portraits.js [id,...]
//   -> assets/portraits15/<id>.webp (320 px, the same renderer and size as assets/portraits; production portraits untouched)
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright'); const serve = require(path.join(__dirname, '../tests/server.js'));
(async () => {
  const srv = await serve(); const b = await chromium.launch(); const p = await (await b.newContext({ deviceScaleFactor: 2 })).newPage();
  await p.goto(srv.url); await p.waitForFunction(() => window.A && A.Voxel && A.Data && A.Proto15);
  const ids = process.argv[2] ? process.argv[2].split(',') : await p.evaluate(() => Object.keys(A.Data.SPECIES).filter((id) => A.Proto15.voxFor(id, 'h')));
  const dir = path.join(__dirname, '../assets/portraits15'); fs.mkdirSync(dir, { recursive: true });
  for (const id of ids) {
    const url = await p.evaluate((id) => { const s = A.Data.SPECIES[id]; A.Voxel.clearCache(); return A.Voxel.sprite(A.Proto15.voxFor(id, 'h'), s.art.st, 160).toDataURL('image/webp', 0.9); }, id);
    fs.writeFileSync(path.join(dir, id + '.webp'), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('baked', ids.length, 'portraits');
  await b.close(); srv.close();
})();
