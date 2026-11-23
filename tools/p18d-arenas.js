// Phase 18D: Verdant arena variations vs the Starter arenas they were aliased to before (Chromium + SwiftShader
// software WebGL; NOT an iPhone). For every Verdant dungeon: opens a battle in it, then a battle in its base Starter
// dungeon, and records the arena key, draw calls, triangles, geometries/textures and a 40-frame render cost at each
// quality tier, plus screenshots. Writes docs/audit18d/arenas.json and shots to the directory given.
// Run: node tools/p18d-arenas.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('../tests/server'); const path = require('path'); const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const PAIRS = [['v_mossgate', 'forgottenroad'], ['v_aqueduct', 'drownedsteps'], ['v_spore', 'reliquary'], ['v_archive', 'gatheringhall'], ['v_glow', 'coldkiln'],
  ['v_twinshrine', 'lanternorchard'], ['v_canopy', 'windstair'], ['v_moonwell', 'drownedsteps'], ['v_choir', 'resonancescar'], ['v_elderroot', 'heartwood']];
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; s.story = s.story || {}; s.story.scenes = Object.assign({}, s.story.scenes, { v_arrival: 1 });
    ['lumifern', 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 30)); s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' };
    Object.keys(D.DUNGEONS).forEach((id) => { const r = R.dungeonRec(s, id); r.clears = 1; r.next = 0; });
    A.State.state = s; R.drain(); A.State.save(); A.UI.showIsland(true); });
  await page.waitForSelector('#world', { timeout: 60000 }); await sleep(800);
  const open = async (d, q) => {
    await ev((q) => { const s = A.State.state; A.UI.queue.length = 0; A.UI.busy = false; if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); document.querySelectorAll('.dlg,.scene,.toast,.reward-wrap').forEach((x) => x.remove()); s.settings.quality = q; A.Perf.apply && A.Perf.apply(); }, q);
    await sleep(300);
    await ev((d) => { const s = A.State.state; A.Rules.startRun(s, d, s.aminas.slice(0, 3).map((a) => a.uid), { from: 0 }); A.UI.startBattle(); }, d);
    await page.waitForFunction(() => document.querySelector('.battle.is3d') && A.UI.B && A.UI.B.stage && A.UI.B.stage.debug && document.querySelector('.abtn.ready'), null, { timeout: 60000 });
    await sleep(2200); // the intro camera (1.6 s) settles before measuring; nothing is asserted on timing here
    return ev(async () => { const M = await import('/src/3d/runtime.js'), d = A.UI.B.stage.debug(), b = M.bench(40), st = M.stats(); return { arena: d.arena, ms: b && b.ms, calls: b && b.calls, triangles: b && b.triangles, geometries: st.geometries, textures: st.textures, programs: st.programs }; });
  };
  const out = { note: 'Chromium + SwiftShader software WebGL at 844x390 @2x; NOT an iPhone. ms = mean CPU+GPU cost of 40 back-to-back renders of the battle view.', tiers: {}, pairs: [] };
  for (const q of ['high', 'balanced']) {
    out.tiers[q] = [];
    for (const [v, base] of PAIRS) {
      if (process.env.ONLY_ARENA) continue; const a = await open(v, q); if (SHOTS && q === 'high') await page.screenshot({ path: path.join(SHOTS, 'arena-' + v + '.jpg'), type: 'jpeg', quality: 82 });
      const b = await open(base, q); if (SHOTS && q === 'high') await page.screenshot({ path: path.join(SHOTS, 'arena-' + v + '-before.jpg'), type: 'jpeg', quality: 82 });
      out.tiers[q].push({ id: v, base, verdant: a, before: b }); console.log(q, v, JSON.stringify(a), '| before', JSON.stringify(b));
    }
  }
  // arena-only geometry (no fighters): every arena built into its own empty scene, counted by traversal
  out.arenaOnly = await ev(async (PAIRS) => {
    const AR = await import('/src/3d/arenas.js'), THREE = (await import('/src/3d/creature3d.js')).THREE, res = [];
    const count = (id, boss, tier) => { const sc = new THREE.Scene(), a = AR.buildArena(sc, id, { boss, tier: () => tier }); let draws = 0, tris = 0;
      sc.traverse((o) => { if (!(o.isMesh || o.isPoints) || !o.visible) return; draws++; const g = o.geometry; const n = g.index ? g.index.count / 3 : g.attributes.position ? g.attributes.position.count / 3 : 0; tris += o.isPoints ? 0 : n * (o.isInstancedMesh ? o.count : 1); });
      const r = { key: a.key, draws, triangles: Math.round(tris) }; if (a.dispose) a.dispose(); return r; };
    for (const [v, base] of PAIRS) for (const boss of [false, true]) for (const tier of ['high', 'balanced', 'saver']) res.push({ id: v, base, boss, tier, verdant: count(v, boss, tier), before: count(base, boss, tier) });
    return res; }, PAIRS).catch((e) => ({ error: e.message }));
  console.log('arena-only', JSON.stringify(out.arenaOnly).slice(0, 1500));
  out.errors = errors; fs.mkdirSync(path.join(__dirname, '../docs/audit18d'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../docs/audit18d/arenas.json'), JSON.stringify(out, null, 1));
  console.log('errors', errors.length, errors.slice(0, 3)); await browser.close(); srv.close(); process.exit(0);
})();
