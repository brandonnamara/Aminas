// Phase 18D long-session check (Chromium + SwiftShader software WebGL at 844×390 @2x; NOT an iPhone, relative numbers
// only). Against whichever checkout serves the page: 12 island round trips (Starter ↔ Verdant), then 10 Verdant battles
// entered and left, then 12 more round trips. Records JS heap, GPU geometries/textures/programs, DOM nodes, island
// switch time, battle open time and the battle frame pacing meter, at each step.
// Run: node tools/p18d-session.js <repoRoot> <out.json>
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..')), OUT = process.argv[3] || '/tmp/session.json';
const { chromium } = require('playwright'); const serve = require(path.join(ROOT, 'tests/server')); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); const errors = []; page.on('pageerror', (e) => errors.push(e.message)); const ev = (fn, a) => page.evaluate(fn, a);
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; s.settings.quality = 'balanced'; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['lumifern', 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 30)); s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' };
    Object.keys(D.DUNGEONS).forEach((id) => { const r = R.dungeonRec(s, id); r.clears = 1; r.next = 0; });
    s.story = s.story || {}; s.story.scenes = Object.assign({}, s.story.scenes, { v_arrival: 'seen' }); A.State.state = s; R.drain(); A.State.save(); A.UI.showIsland(true); });
  await page.waitForSelector('#world'); await sleep(1500);
  const snap = (label) => ev(async (label) => { if (window.gc) { window.gc(); await new Promise((r) => setTimeout(r, 300)); window.gc(); } await new Promise((r) => setTimeout(r, 100)); const v = A.VoxIsland && A.VoxIsland.stats ? A.VoxIsland.stats() : null, c = A.C3D && A.C3D.stats ? A.C3D.stats() : null;
    return { label, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, nodes: document.getElementsByTagName('*').length,
      island: v ? { geometries: v.geometries, textures: v.textures, programs: v.programs, calls: v.calls } : null, battle: c ? { geometries: c.geometries, textures: c.textures, programs: c.programs, templates: c.templates, live: c.live } : null }; }, label);
  const travel = async (to) => { const t = Date.now(); await ev((to) => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('.dlg,.toast,.scene').forEach((e) => e.remove()); A.UI.travelTo(to); }, to);
    await page.waitForFunction((to) => A.State.state.currentIsland === to && document.querySelector('#world') && (!A.VoxIsland || !A.VoxIsland.on || A.VoxIsland.ready()), to, { timeout: 60000 }); await ev(() => { A.UI.closeAll(); document.querySelectorAll('.dlg,.scene').forEach((e) => e.remove()); }); return Date.now() - t; };
  const out = { root: path.basename(ROOT), note: 'Chromium + SwiftShader at 844x390 @2x; NOT an iPhone. Relative numbers only.', steps: [], travelMs: [], battles: [], errors };
  out.steps.push(await snap('start'));
  for (let i = 0; i < 12; i++) { out.travelMs.push(await travel('verdant')); out.travelMs.push(await travel('starter')); }
  out.steps.push(await snap('after 12 round trips'));
  await travel('verdant');
  const ids = await ev(() => A.Data.CAMPAIGN.verdant.dungeons.slice());
  for (const id of ids) {
    const t = Date.now();
    await ev((d) => { const s = A.State.state; A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); A.Rules.startRun(s, d, s.aminas.slice(0, 3).map((a) => a.uid), { from: 0 }); A.UI.startBattle(); }, id);
    await page.waitForFunction(() => document.querySelector('.battle.is3d') && A.UI.B && A.UI.B.stage && document.querySelector('.abtn.ready'), null, { timeout: 60000 }); const openMs = Date.now() - t;
    const m = await ev(async () => { const M = await import('/src/3d/runtime.js'); M.meterRead(true); await new Promise((r) => setTimeout(r, 3000)); return M.meterRead(true); });
    out.battles.push({ id, openMs, frames: m.frames, renderMs: m.renderMs, updateMs: m.updateMs, worstCpuMs: m.worstCpuMs, missed: m.missed });
    await ev(() => { A.Rules.abandonRun(A.State.state); A.UI.leaveBattle(() => {}); }); await sleep(600); await ev(() => { A.UI.closeAll(); document.querySelectorAll('.dlg,.toast,.reward-wrap,.scene').forEach((e) => e.remove()); if (!document.querySelector('#world')) A.UI.showIsland(); });
    await page.waitForFunction(() => document.querySelector('#world') && (!A.VoxIsland || !A.VoxIsland.on || A.VoxIsland.ready()), null, { timeout: 60000 });
  }
  out.steps.push(await snap('after 10 battles'));
  for (let i = 0; i < 12; i++) { out.travelMs.push(await travel('starter')); out.travelMs.push(await travel('verdant')); }
  out.steps.push(await snap('after 24 round trips and 10 battles'));
  const tm = out.travelMs.slice().sort((a, b) => a - b); out.travelP50 = tm[tm.length >> 1]; out.travelP95 = tm[Math.floor(tm.length * 0.95)];
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.steps)); console.log('travel p50', out.travelP50, 'p95', out.travelP95, 'battles', JSON.stringify(out.battles.map((b) => [b.id, b.openMs, b.renderMs]))); console.log('errors', errors.length);
  await browser.close(); srv.close(); process.exit(0);
})();
