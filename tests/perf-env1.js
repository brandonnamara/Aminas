// Environment Phase 1 performance probe: the same Starter Island with the 2D island vs the 3D voxel island.
// Chromium via Playwright, software WebGL (SwiftShader) on a desktop CPU. NOT a phone: use for before/after
// comparison on the same machine only. Usage: node tests/perf-env1.js [out.json]
const { chromium } = require('playwright'); const serve = require('./server'); const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(vox) {
  const srv = await serve(); const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await br.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Performance.enable');
  await p.goto(srv.url); await p.waitForFunction(() => window.A && A.UI && A.UI.showIsland);
  await p.evaluate((vox) => { const s = A.State.newGame(), R = A.Rules, W = A.World; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.dayNight = false; s.settings.voxIsland = vox; s.settings.creatures3d = false;
    R.addAmina(s, 'lumifern', 10); s.res = { gold: 99999, food: 9999, gems: 99 };
    Object.keys(s.buildings).forEach((id) => { const b = s.buildings[id]; if (b.state === 'ruined' && id !== 'reliquarygate') { b.state = 'built'; b.level = 1; s.struct[id] = true; } });
    ['hab_nature', 'farm', 'mine', 'lantern', 'flowerbed', 'bench'].forEach((t, i) => { const sp = W.findSpot(s, 'starter', t, 0, [8 + i * 3, 10]); if (sp) { W.buildNew(s, 'starter', t, sp[0], sp[1], 0); const id = Object.keys(s.buildings).filter((k) => s.buildings[k].type === t).pop(); if (id) { s.buildings[id].state = 'built'; s.buildings[id].level = 1; delete s.buildings[id].endAt; } } });
    s.missions = { m_hollow: 'claimed' }; R.drain(); A.State.save(); A.Perf && (A.Perf.autoSaver = false); window.__t0 = performance.now(); A.UI.showIsland(); }, vox);
  if (vox) await p.waitForSelector('#world.vox', { timeout: 30000 }); const ready = await p.evaluate(() => Math.round(performance.now() - __t0));
  await sleep(1500); await p.evaluate(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('.toast,.ach-toast').forEach((t) => t.remove()); if (A.State.state.settings.batterySaver) { A.State.state.settings.batterySaver = false; A.Perf && A.Perf.apply && A.Perf.apply(); } });
  const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  const busy = async (ms, act) => { const a = await m(); const t = Date.now(); if (act) await act(); else await sleep(ms); const b = await m(); const dt = (Date.now() - t) / 1000; return +(((b.TaskDuration - a.TaskDuration) * 1000) / dt).toFixed(0); };
  const idle = await busy(5000);
  const pan = await busy(0, async () => { const t = Date.now(); let i = 0; await p.mouse.move(420, 200); await p.mouse.down(); while (Date.now() - t < 3000) { i++; await p.mouse.move(420 + Math.sin(i / 6) * 160, 200 + Math.cos(i / 9) * 60); await sleep(16); } await p.mouse.up(); });
  const fr = await p.evaluate(() => new Promise((res) => { let n = 0; const t = performance.now(), c = A.UI.cam[A.UI.wv.iid], x0 = c.x; const f = () => { n++; c.x = x0 + Math.sin(n / 5) * 40; A.UI.applyCam(); if (performance.now() - t < 3000) requestAnimationFrame(f); else res(+(n / ((performance.now() - t) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }));
  const mm = await m(); const st = await p.evaluate(() => (A.VoxIsland && A.VoxIsland.stats()) || null);
  const nodes = await p.evaluate(() => document.querySelectorAll('#iso *').length);
  await br.close(); srv.close();
  return { mode: vox ? 'voxel 3D' : '2D', readyMs: ready, idleMainMsPerS: idle, panMainMsPerS: pan, panFps: fr, heapMB: +(mm.JSHeapUsedSize / 1048576).toFixed(1), svgNodes: nodes, gl: st };
}
(async () => { const out = []; for (const v of [false, true, false, true]) { const r = await run(v); console.log(JSON.stringify(r)); out.push(r); } if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); })();
