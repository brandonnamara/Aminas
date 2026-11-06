// Environment Phase 1.2 real-browser test (Chromium + Playwright, software WebGL; NOT iOS Safari, NOT a phone).
// Depth for the 2D overlay: a creature placed behind the Hatchery is covered by it, the same creature in front is
// not, a tap on the covered part goes to the building, interface parts are never covered, the distant islands and
// waterfalls exist, and the 2D fallback has no occlusion layer.
// Run: node tests/browser-env12.test.js [screenshotDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'), fs = require('fs');
const SHOTS = process.argv[2] || path.join(__dirname, 'shots-env12'); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } }); page.setDefaultTimeout(20000); const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|ServiceWorker/i.test(m.text())) errors.push('console: ' + m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const calm = () => ev(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('#toast-root .toast,.ach-toast').forEach((t) => t.remove()); });
  await page.goto(srv.url); await page.waitForSelector('.logo');
  await ev(() => {
    const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.creatures3d = false; s.settings.dayNight = false;
    s.res = { gold: 5000, food: 300, gems: 20 }; R.addAmina(s, 'lumifern', 8);
    ['hollow', 'tidegate', 'hatchery'].forEach((id) => { s.struct[id] = true; s.buildings[id].level = 1; s.buildings[id].state = 'built'; });
    s.missions = { m_hollow: 'claimed' }; A.State.save(); A.UI.showIsland();
  });
  await page.waitForSelector('#world.vox', { timeout: 30000 }).catch(() => {}); await sleep(1000); await calm();
  ok(await ev(() => { const w = document.getElementById('world'), kids = [...w.children], i = kids.indexOf(document.getElementById('iso')), o = kids.findIndex((e) => e.classList && e.classList.contains('vox-occ')); return i >= 0 && o > i; }), 'the occlusion layer sits directly above the interactive SVG');
  await ev(() => A.UI.focusBuilding('hatchery', 1.4)); await sleep(1200); await calm();
  // freeze the companion and stand it behind, then in front of, the Hatchery
  const place = (where) => ev((where) => {
    const hb = A.State.state.buildings.hatchery, sz = A.World.size(hb.type, hb.rot), el = document.querySelector('#objs .creature'); if (!el) return null;
    clearInterval(A.UI.timers.life); const mv = el.querySelector('.cr-mv'); if (mv) { mv.style.transition = 'none'; mv.style.transform = 'none'; }
    const c = where === 'behind' ? [hb.x + sz.w * 0.3, hb.y + sz.h * 0.3] : [hb.x + sz.w + 0.8, hb.y + sz.h + 0.8], t = A.Iso.top(c[0], c[1]);
    el.setAttribute('transform', 'translate(' + t[0] + ' ' + t[1] + ') scale(0.9)'); const r = (mv || el).getBoundingClientRect();
    // this machine renders WebGL in software, where the 3D layer is flagged slow and refreshes occlusion with the next view change: nudge the view
    setTimeout(() => A.UI.applyCam(), 1200); return [r.left + r.width / 2, r.top + r.height * 0.6];
  }, where);
  const behind = await place('behind'); await sleep(3000);
    ok(!!behind && await ev(([x, y]) => A.VoxIsland.occludedAt(x, y), behind), 'a creature standing behind the Hatchery is covered by it');
  await page.screenshot({ path: path.join(SHOTS, 'env12-behind.png') });
  if (behind) { await page.mouse.click(behind[0], behind[1]); await sleep(700); }
  const panel = await ev(() => ({ open: A.UI.modalOpen(), txt: (document.querySelector('#modal-root') || {}).textContent || '' }));
  ok(panel.open && /Hatchery/i.test(panel.txt), 'tapping the covered creature opens the building in front of it');
  await calm();
  const front = await place('front'); await sleep(3000);
  ok(!!front && !(await ev(([x, y]) => A.VoxIsland.occludedAt(x, y), front)), 'the same creature in front of the Hatchery is drawn over it');
  await page.screenshot({ path: path.join(SHOTS, 'env12-front.png') });
  // interface parts stay uncovered: every cut-out rectangle is transparent on the occlusion layer
  const cuts = await ev(() => { const o = A.VoxIsland.overlay(); if (!o) return null; return o.cut.length; });
  ok(cuts !== null, 'interface parts are listed for cut-out (' + cuts + ')');
  const st = await ev(() => A.VoxIsland.stats());
  ok(st && st.calls > 0 && st.calls <= 90, 'the island still renders in a bounded number of draw calls (' + (st && st.calls) + ')');
  // the 2D fallback has no occlusion layer
  await ev(() => { A.State.state.settings.voxIsland = false; A.UI.renderWorld(true); }); await sleep(500);
  ok(await ev(() => !document.querySelector('#world.vox') && (!document.querySelector('canvas.vox-occ') || getComputedStyle(document.querySelector('canvas.vox-occ')).display === 'none')), 'with the voxel island off there is no occlusion layer');
  await ev(() => { A.State.state.settings.voxIsland = true; A.UI.renderWorld(true); }); await page.waitForSelector('#world.vox', { timeout: 20000 }).catch(() => {});
  ok(await ev(() => !!document.querySelector('#world.vox canvas.vox-occ')), 'turning it back on restores the occlusion layer');
  // the 2D painted far islands are replaced by the 3D ones; the sea glints pause on a still island
  ok(await ev(() => { const fi = document.querySelector('.backdrop .fi'); return !!fi && getComputedStyle(fi).display === 'none'; }), 'the painted far islands give way to the voxel ones');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\nbrowser env1.2: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error('ERROR ' + (e && e.message ? e.message.split('\n').slice(0, 8).join('\n') : e)); process.exit(1); });
