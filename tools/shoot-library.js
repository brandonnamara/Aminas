// Screenshots of the library viewer (real renders of the catalog). Usage: node tools/shoot-library.js outDir "query" name [w h] ...
const { chromium } = require('playwright'); const serve = require('../tests/server.js'); const path = require('path'), fs = require('fs');
(async () => {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true }); const jobs = []; for (let i = 3; i < process.argv.length; i += 2) jobs.push([process.argv[i], process.argv[i + 1]]);
  const srv = await serve(); const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
  for (const [qs, name] of jobs) {
    const m = /(?:^|&)size=(\d+)x(\d+)/.exec(qs), w = m ? +m[1] : 1600, h = m ? +m[2] : 1000;
    const p = await br.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); p.on('pageerror', (e) => errs.push(name + ': ' + e.message)); p.on('console', (c) => { if (c.type() === 'error') errs.push(name + ': ' + c.text()); });
    await p.goto(srv.url + 'tools/library.html?' + qs); await p.waitForFunction(() => window.__ready, null, { timeout: 120000 }); await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(out, name + '.png') }); const items = await p.evaluate(() => window.__items); fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(items)); await p.close();
  }
  console.log('errors:', errs.join(' | ') || 'none'); await br.close(); srv.close();
})();
