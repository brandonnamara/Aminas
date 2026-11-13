// Phase 15B: triangles, draw calls (meshes) and blocks for every refined form at each detail level, against production.
// Software WebGL in a desktop browser: these are model costs, NOT iPhone frame times.  node tools/roster15-measure.js [out.json]
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs');
(async () => {
  const srv = await serve(); const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage(); p.setDefaultTimeout(900000);
  await p.goto(srv.url + '?p15=1'); await p.waitForFunction(() => window.A && A.C3D && A.Proto15);
  const res = await p.evaluate(async () => { const C = await import('/src/3d/creature3d.js'); await import('/src/3d/runtime.js'); const out = {};
    const cost = (r) => { let t = 0, d = 0; r.root.traverse((x) => { if (x.isMesh && x.geometry) { d++; t += (x.geometry.index ? x.geometry.index.count : x.geometry.attributes.position.count) / 3; } }); return [Math.round(t), d]; };
    for (const id of Object.keys(A.Data.SPECIES)) { const sp = A.Data.SPECIES[id]; if (!A.Proto15.voxFor(id, 'h')) continue; const o = { line: sp.line, proto: A.Proto15.PROTO.indexOf(sp.line) >= 0 };
      o.prod = cost(C.buildVoxel(sp)).concat(A.Voxel.model(sp.art.vox, sp.art.st).v.size);
      for (const l of ['h', 'm', 's']) { const vx = A.Proto15.voxFor(id, l); o[l] = vx ? cost(C.buildVoxel(sp, { proto: true, lod: l })).concat(A.Voxel.model(vx, sp.art.st).v.size) : null; }
      out[id] = o; }
    return out; });
  fs.writeFileSync(process.argv[2] || 'docs/ui/screens15b/roster15b-measure.json', JSON.stringify(res, null, 1)); console.log(Object.keys(res).length, 'forms measured');
  await b.close(); srv.close();
})();
