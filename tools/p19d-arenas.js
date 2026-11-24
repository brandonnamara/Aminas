// Phase 19D: Obsidian arena furniture, measured (Chromium + SwiftShader software WebGL at 844x390 @2x; NOT an iPhone).
// For each of the ten Obsidian arenas: arena-only draws and triangles at every quality tier (normal and boss rooms),
// then a battle opened in it on High for a screenshot and the renderer's own counts. Run it in the 19C tree and in this
// one (same tool) to compare. Usage: node tools/p19d-arenas.js <out.json> [shotsDir] [prefix]
const { chromium } = require('playwright'); const serve = require('../tests/server'); const path = require('path'); const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const OUTF = process.argv[2], SHOTS = process.argv[3], PRE = process.argv[4] || 'arena'; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const IDS = ['o_cinder', 'o_kilns', 'o_rookery', 'o_quench', 'o_seams', 'o_gallery', 'o_hollows', 'o_orchard', 'o_bellows', 'o_forge'];
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; s.story = s.story || {}; s.story.scenes = Object.assign({}, s.story.scenes, { v_arrival: 1, o_arrival: 1 });
    ['lumifern', 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 45)); s.campaign = { bosses: { starter: true, verdant: true } };
    ['verdant', 'obsidian'].forEach((k) => { s.islands[k] = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' }; });
    Object.keys(D.DUNGEONS).forEach((id) => { const r = R.dungeonRec(s, id); r.clears = 1; r.next = 0; }); s.currentIsland = 'obsidian'; A.State.state = s; A.State.sanitize(s); R.drain(); A.State.save(); A.UI.showIsland(true); });
  await page.waitForSelector('#world', { timeout: 60000 }); await sleep(800);
  const out = { note: 'Chromium + SwiftShader software WebGL; NOT an iPhone.', arenaOnly: [], battles: [] };
  out.arenaOnly = await ev(async (IDS) => {
    const AR = await import('/src/3d/arenas.js'), THREE = (await import('/src/3d/creature3d.js')).THREE, res = [];
    const count = (id, boss, tier) => { const sc = new THREE.Scene(), a = AR.buildArena(sc, id, { boss, tier: () => tier }); let draws = 0, tris = 0;
      sc.traverse((o) => { if (!(o.isMesh || o.isPoints) || !o.visible) return; draws++; const g = o.geometry; const n = g.index ? g.index.count / 3 : g.attributes.position ? g.attributes.position.count / 3 : 0; tris += o.isPoints ? 0 : n * (o.isInstancedMesh ? o.count : 1); });
      const r = { key: a.key, draws, triangles: Math.round(tris) }; if (a.dispose) a.dispose(); return r; };
    for (const id of IDS) for (const boss of [false, true]) for (const tier of ['high', 'balanced', 'saver']) res.push(Object.assign({ id, boss, tier }, count(id, boss, tier)));
    return res; }, IDS).catch((e) => ({ error: e.message }));
  for (const d of IDS) {
    await ev(() => { A.UI.queue.length = 0; A.UI.busy = false; if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); document.querySelectorAll('.dlg,.scene,.toast').forEach((n) => n.remove()); });
    await sleep(300);
    await ev((d) => { const s = A.State.state; const x = A.Rules.startRun(s, d, s.aminas.slice(0, 3).map((a) => a.uid), { from: 0 }); if (!x || x.ok === false) throw new Error(d + ' ' + JSON.stringify(x)); A.UI.startBattle(); }, d);
    await page.waitForFunction(() => document.querySelector('.battle.is3d') && A.UI.B && A.UI.B.stage && A.UI.B.stage.debug && document.querySelector('.abtn.ready'), null, { timeout: 60000 });
    await sleep(2200);
    const r = await ev(async () => { const M = await import('/src/3d/runtime.js'), d = A.UI.B.stage.debug(), b = M.bench(30), st = M.stats(); return { arena: d.arena, ms: b && b.ms, calls: b && b.calls, triangles: b && b.triangles, geometries: st.geometries, textures: st.textures }; });
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, PRE + '-' + d + '.jpg'), type: 'jpeg', quality: 82 });
    out.battles.push(Object.assign({ id: d }, r)); console.log(d, JSON.stringify(r));
  }
  out.errors = errors; if (OUTF) fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));
  console.log('errors', errors.length, errors.slice(0, 3)); await browser.close(); srv.close(); process.exit(0);
})();
