// Phase 15C: rendering cost of the combat presentation, switch off vs on (and Battery Saver, Reduce Motion).
// Peak draw calls, triangles, effect cubes and live geometries during one move, average CPU per frame (update and
// render submission), and the geometry/texture count after the battle ends (nothing left behind).
// Desktop software WebGL (SwiftShader): costs are comparable with each other, NOT iPhone frame times.
// Run: node tools/c15-measure.js  -> docs/ui/screens15c/c15-measure.json
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path');
const CASES = [['atem', 'rockraki', 'overclock'], ['eclipsar', 'calyxar', 1], ['pyrophoenix', 'calyxar', 1], ['aimza3', 'calyxar', 1], ['shellfin', 'infernox', 1], ['atem1', 'rockraki', 'ironwall']];
const MODES = [['off', ''], ['on', '?p15=1'], ['saver', '?p15=1'], ['calm', '?p15=1']];
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const out = {};
  for (const [mode, q] of MODES) {
    const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })).newPage(); page.setDefaultTimeout(900000);
    await page.goto(srv.url + q); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D && A.Proto15);
    await page.evaluate((mode) => { if (mode === 'off') { try { localStorage.setItem('aminas.proto15', '0'); } catch (e) {} } A.Perf.reportSlow = () => {}; const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = true; s.settings.sfx = false; s.settings.batterySaver = mode === 'saver'; s.settings.reduceMotion = mode === 'calm'; A.Rules.drain(); if (A.UI.queue) A.UI.queue.length = 0; A.State.save(); A.UI.showIsland(); if (A.Perf.apply) A.Perf.apply(); if (mode !== 'saver') A.Perf.forceTier = 'high'; }, mode);
    await page.waitForSelector('#world', { timeout: 60000 });
    await page.evaluate(async () => { for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 100)); document.querySelectorAll('.dlg .dlg-skip').forEach((b) => b.click()); A.UI.closeAll(); } document.querySelectorAll('.dlg').forEach((x) => x.remove()); });
    for (const [id, foe, mv] of CASES) {
      out[mode + ':' + id] = await page.evaluate(async ([id, foe, mv]) => {
        const M = await A.C3D.load(), RT = await import('/src/3d/runtime.js'), R = A.Rules, Bt = R.Battle, f = Bt.fighter(id, 30), e = Bt.fighter(foe, 30); [f, e].forEach((x) => { x.hpMax *= 50; x.hp = x.hpMax; }); f.spd = 999; e.atk = 1;
        if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); await new Promise((r) => setTimeout(r, 300)); const before = M.stats();
        A.UI.startBattle({ kind: 'test', b: Bt.create([f], e, { rng: () => 0.5 }), d: 'heartwood', label: 't', finish: () => {} });
        for (let i = 0; i < 150 && !(A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy); i++) await new Promise((r) => setTimeout(r, 100));
        await new Promise((r) => setTimeout(r, 800)); const press = typeof mv === 'number' ? A.Data.SPECIES[id].abil[mv] : mv;
        RT.meterRead(true); const o = { press, draws: 0, tris: 0, cubes: 0, geos: 0 };
        const b = document.querySelector('.abtn.ready[data-id="' + press + '"]'); if (b) b.click();
        for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 50)); const s = M.stats(), d = A.UI.B.stage.debug(); o.draws = Math.max(o.draws, s.drawCalls); o.tris = Math.max(o.tris, s.triangles); o.cubes = Math.max(o.cubes, d.cubes); o.geos = Math.max(o.geos, s.geometries); }
        const m = RT.meterRead(true); o.frames = m.frames; o.updateMs = m.updateMs; o.renderMs = m.renderMs; o.worstCpuMs = m.worstCpuMs;
        A.UI.leaveBattle(() => {}); await new Promise((r) => setTimeout(r, 400)); const after = M.stats(); o.geosBefore = before.geometries; o.geosAfter = after.geometries; o.texBefore = before.textures; o.texAfter = after.textures;
        return o; }, [id, foe, mv]);
      console.log(mode, id, JSON.stringify(out[mode + ':' + id]));
    }
    await page.context().close();
  }
  const dir = path.join(__dirname, '..', 'docs', 'ui', 'screens15c'); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'c15-measure.json'), JSON.stringify(out, null, 1));
  await browser.close(); srv.close();
})();
