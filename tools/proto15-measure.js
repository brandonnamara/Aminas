// Phase 15: cost measurements for the three prototype lines against their current models. Headless Chromium with
// software WebGL (SwiftShader) on a desktop: triangle, draw-call, bone, track and particle counts are real; times are
// desktop CPU times, NOT iPhone figures. Run: node tools/proto15-measure.js  -> docs/ui/screens15/proto15-measure.json
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path');
const IDS = ['lumifern', 'solarbloom', 'aurelith', 'igniflare', 'pyronix', 'ignivor', 'atem1', 'atem2', 'atem'];
const FIGHTS = [['aurelith', 'eclipsar', ['glowpulse', 'solarflare']], ['ignivor', 'calyxar', ['emberflick', 'inferno']], ['atem', 'rockraki', ['gearstrike', 'overclock']]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = { models: {}, battles: {} };
  // 1. models: build cost (first build includes sculpting the blocks), size, materials, bones, clip tracks and keys,
  //    and the cost of sampling the idle animation
  { const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage(); page.setDefaultTimeout(900000);
    await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.C3D && A.Proto15);
    out.models = await page.evaluate(async (IDS) => {
      const C = await import('/src/3d/creature3d.js'); await import('/src/3d/runtime.js'); const THREE = C.THREE, res = {};
      for (const id of IDS) { res[id] = {};
        for (const proto of [false, true]) {
          const sp = A.Data.SPECIES[id], t0 = performance.now(); let r = C.buildVoxel(sp, { proto }); const cold = performance.now() - t0;
          const ws = []; for (let i = 0; i < 3; i++) { const t1 = performance.now(); const r2 = C.buildVoxel(sp, { proto }); ws.push(performance.now() - t1); r2.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
          let tris = 0, meshes = 0, bones = 0, verts = 0, bytes = 0; const mats = new Set();
          r.root.traverse((o) => { if (o.isBone) bones++; if (o.isMesh) { meshes++; mats.add(o.material.uuid); const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; verts += g.attributes.position.count; Object.values(g.attributes).forEach((a) => (bytes += a.array.byteLength)); if (g.index) bytes += g.index.array.byteLength; } });
          let tracks = 0, keys = 0; r.clips.forEach((c) => c.tracks.forEach((t) => { tracks++; keys += t.times.length; }));
          const idle = r.clips.find((c) => c.name === 'idle'), mixer = new THREE.AnimationMixer(r.root); mixer.clipAction(idle).play();
          const t2 = performance.now(); for (let i = 0; i < 2000; i++) { mixer.update(1 / 60); r.root.updateMatrixWorld(true); } const anim = (performance.now() - t2) / 2000;
          res[id][proto ? 'p15' : 'cur'] = { tris: Math.round(tris), drawCalls: meshes, materials: mats.size, textures: 0, vertices: verts, geometryKB: Math.round(bytes / 1024), bones, clips: r.clips.length, tracks, keys,
            idleTracks: idle.tracks.length, buildColdMs: Math.round(cold), buildWarmMs: +(ws.sort((a, b) => a - b)[1]).toFixed(1), animMsPerFrame: +anim.toFixed(4) };
          mixer.stopAllAction(); r.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
        } }
      return res; }, IDS);
    await page.close(); }
  // 2. battles: the same practice battle with the switch off and on, Balanced and Battery Saver: peak draw calls and
  //    triangles in the arena, and the peak number of effect cubes alive during each move
  for (const [id, foe, presses] of FIGHTS) for (const saver of [false, true]) for (const on of [false, true]) {
    const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })).newPage(); page.setDefaultTimeout(600000);
    await page.goto(srv.url + (on ? '?p15=1' : '')); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D && A.Proto15);
    await page.evaluate((saver) => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = true; s.settings.sfx = false; if (saver) s.settings.batterySaver = true; A.Rules.drain(); if (A.UI.queue) A.UI.queue.length = 0; A.State.save(); A.UI.showIsland(); if (A.Perf.apply) A.Perf.apply(); }, saver);
    await page.waitForSelector('#world', { timeout: 60000 }); await sleep(500);
    await page.evaluate(async () => { for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 100)); document.querySelectorAll('.dlg .dlg-skip').forEach((b) => b.click()); A.UI.closeAll(); } document.querySelectorAll('.dlg').forEach((x) => x.remove()); });
    const r = await page.evaluate(async ({ id, foe, presses }) => {
      const R = A.Rules, Bt = R.Battle, f = Bt.fighter(id, 30), e = Bt.fighter(foe, 30); [f, e].forEach((x) => { x.hpMax *= 50; x.hp = x.hpMax; }); f.spd = 999; e.atk = 1;
      A.UI.closeAll(); const t0 = performance.now(); A.UI.startBattle({ kind: 'test', b: Bt.create([f], e, { rng: () => 0.5 }), d: 'heartwood', label: 'measure', finish: () => {} });
      for (let i = 0; i < 150 && !(A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy); i++) await new Promise((r) => setTimeout(r, 50));
      const ready = performance.now() - t0, M = await A.C3D.load(), o = { readyMs: Math.round(ready), saver: document.body.classList.contains('perf-saver'), proto: A.Proto15.active(id), draws: 0, tris: 0, moves: {} };
      const watch = async (ms, key) => { const t1 = performance.now(); let fxMax = 0; while (performance.now() - t1 < ms) { const s = M.stats(), d = A.UI.B.stage.debug(); o.draws = Math.max(o.draws, s.drawCalls); o.tris = Math.max(o.tris, s.triangles); fxMax = Math.max(fxMax, d.cubes); await new Promise((r) => setTimeout(r, 30)); } if (key) o.moves[key] = Math.max(o.moves[key] || 0, fxMax); };
      await watch(800);
      for (const mv of presses) { for (let i = 0; i < 80 && A.UI.B.busy; i++) await watch(100); const b = document.querySelector('.abtn.ready[data-id="' + mv + '"]'); if (b) b.click(); await watch(1600, mv); }
      return o; }, { id, foe, presses });
    out.battles[id + (saver ? ' saver' : '') + (on ? ' p15' : ' cur')] = r; console.log(id, saver ? 'saver' : 'balanced', on ? 'p15' : 'cur', JSON.stringify(r));
    await page.context().close();
  }
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'ui', 'screens15', 'proto15-measure.json'), JSON.stringify(out, null, 1));
  Object.entries(out.models).forEach(([id, o]) => console.log(id.padEnd(11), JSON.stringify(o.cur), '\n           ', JSON.stringify(o.p15)));
  await browser.close(); srv.close();
})();
