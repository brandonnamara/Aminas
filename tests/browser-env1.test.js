// Environment Phase 1 real-browser test (Chromium via Playwright with software WebGL; NOT iOS Safari, NOT a phone).
// The voxel Starter Island: it replaces the 2D terrain, buildings and obstacles still respond to taps through the 2D
// hit layer, build mode hides the building being moved, other islands keep their 2D art, the setting falls back to
// the 2D island, the save is unchanged in shape and survives a reload, and no script errors.
// Run: node tests/browser-env1.test.js [screenshotDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'), fs = require('fs');
const SHOTS = process.argv[2] || path.join(__dirname, 'shots-env1'); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } }); page.setDefaultTimeout(15000); const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|ServiceWorker/i.test(m.text())) errors.push('console: ' + m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const calm = () => ev(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('#toast-root .toast,.ach-toast').forEach((t) => t.remove()); });
  await page.goto(srv.url); await page.waitForSelector('.logo');
  await ev(() => {
    const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.creatures3d = false;
    s.res = { gold: 5000, food: 300, gems: 20 }; R.addAmina(s, 'lumifern', 8);
    ['hollow', 'tidegate', 'hatchery'].forEach((id) => { s.struct[id] = true; s.buildings[id].level = 1; s.buildings[id].state = 'built'; });
    s.missions = { m_hollow: 'claimed' }; A.State.save(); A.UI.showIsland();
  });
  await page.waitForSelector('#world.vox', { timeout: 30000 }).catch(() => {}); await sleep(1200); await calm();

  /* ---------- the voxel island replaces the 2D terrain ---------- */
  const v = await ev(() => ({ vox: !!document.querySelector('#world.vox'), cv: !!document.querySelector('#world > canvas.vox3d'), order: [...document.getElementById('world').children].map((e) => e.id || e.tagName.toLowerCase()).join(','),
    terr: getComputedStyle(document.getElementById('terrain')).display, saved: A.State.state.settings.voxIsland, st: A.VoxIsland.stats(), items: A.VoxIsland.items || [] }));
  ok(v.saved === true, 'new games have the 3D voxel island on');
  ok(v.vox && v.cv, 'the Starter Island is drawn by the voxel layer (canvas present, #world.vox)');
  ok(v.order.indexOf('canvas') >= 0 && v.order.indexOf('canvas') < v.order.indexOf('iso'), 'the 3D canvas sits under the interactive 2D layer');
  ok(v.terr === 'none', 'the 2D terrain is hidden while the voxel island shows');
  ok(v.st && v.st.frames > 0 && v.st.calls > 0 && v.st.calls <= 80, 'it renders (' + (v.st && v.st.calls) + ' draw calls, ' + (v.st && v.st.triangles) + ' triangles)');
  ok(['b:hollow', 'b:tidegate', 'b:hatchery'].every((k) => v.items.includes(k)) && v.items.some((k) => k.startsWith('o:')), 'built buildings and obstacles are mirrored into 3D');
  const hid = await ev(() => { const g = document.querySelector('[data-bid="hatchery"]'); return { vx: g && g.classList.contains('vx'), op: g && getComputedStyle(g.querySelector('.artg')).opacity }; });
  ok(hid.vx && hid.op === '0', 'the Hatchery\'s 2D picture is hidden (opacity 0) but its group stays in the hit layer');
  await page.screenshot({ path: path.join(SHOTS, 'env1-island.png') });

  /* ---------- taps still work ---------- */
  await ev(() => A.UI.focusBuilding('hatchery', 1.2)); await sleep(900); await calm();
  const pt = await ev(() => { const g = document.querySelector('[data-bid="hatchery"]'), r = g.getBoundingClientRect(); for (let dy = 0.55; dy < 0.95; dy += 0.05) { const x = r.left + r.width / 2, y = r.top + r.height * dy, e = document.elementFromPoint(x, y); if (e && e.closest('[data-bid="hatchery"]')) return [x, y]; } return null; });
  ok(!!pt, 'a point on the Hatchery reaches its 2D hit area');
  if (pt) { await page.mouse.click(pt[0], pt[1]); await sleep(700); }
  const panel = await ev(() => ({ open: A.UI.modalOpen(), txt: (document.querySelector('#modal-root') || {}).textContent || '' }));
  ok(panel.open && /Hatchery/i.test(panel.txt), 'tapping the voxel Hatchery opens its panel');
  await calm();
  const op = await ev(() => { const g = [...document.querySelectorAll('[data-oid]')].find((o) => { const r = o.getBoundingClientRect(); return r.width > 8 && r.left > 60 && r.right < innerWidth - 60 && r.top > 80 && r.bottom < innerHeight - 90; }); if (!g) return null; const r = g.getBoundingClientRect(); for (let dy = 0.4; dy < 0.95; dy += 0.05) { const x = r.left + r.width / 2, y = r.top + r.height * dy, e = document.elementFromPoint(x, y); if (e && e.closest('[data-oid="' + g.dataset.oid + '"]')) return [x, y]; } return null; });
  if (!op) { await ev(() => { const o = A.World.obstaclesOn(A.State.state, 'starter').find((x) => x.state !== 'cleared'); if (o) { const c = A.UI.cam.starter, t = A.IsoArt.Iso.top(o.x + 0.5, o.y + 0.5); c.x = t[0]; c.y = t[1]; A.UI.applyCam(); } }); await sleep(800); }
  const op2 = op || await ev(() => { const g = [...document.querySelectorAll('[data-oid]')].find((o) => { const r = o.getBoundingClientRect(); return r.width > 8 && r.left > 60 && r.right < innerWidth - 60 && r.top > 80 && r.bottom < innerHeight - 90; }); if (!g) return null; const r = g.getBoundingClientRect(); for (let dy = 0.4; dy < 0.95; dy += 0.05) { const x = r.left + r.width / 2, y = r.top + r.height * dy, e = document.elementFromPoint(x, y); if (e && e.closest('[data-oid]')) return [x, y]; } return null; });
  if (op2) { await page.mouse.click(op2[0], op2[1]); await sleep(700); }
  ok(op2 && await ev(() => A.UI.modalOpen()), 'tapping a voxel obstacle opens its clearing panel');
  await calm();

  /* ---------- build mode: the building being moved leaves the 3D layer, and comes back ---------- */
  await ev(() => { A.UI.enterBuild(); A.UI.selectForMove('hatchery'); }); await sleep(500);
  ok(!(await ev(() => A.VoxIsland.items.includes('b:hatchery'))), 'moving the Hatchery hides its 3D model (the ghost shows instead)');
  await ev(() => A.UI.exitBuild()); await sleep(400);
  ok(await ev(() => A.VoxIsland.items.includes('b:hatchery')), 'leaving build mode puts it back');

  /* ---------- other islands keep their 2D art ---------- */
  const other = await ev(() => { const s = A.State.state; s.unlocked = s.unlocked || {}; const iid = Object.keys(A.Data.ISLANDS).find((k) => k !== 'starter'); if (!iid) return null; const prev = s.currentIsland; s.currentIsland = iid; A.UI.renderWorld(true); const r = { iid, vox: !!document.querySelector('#world.vox'), cv: !!document.querySelector('#world > canvas.vox3d'), terr: getComputedStyle(document.getElementById('terrain')).display }; s.currentIsland = prev; A.UI.renderWorld(true); return r; });
  ok(other && !other.vox && !other.cv && other.terr !== 'none', 'other islands (' + (other && other.iid) + ') keep the 2D island art');
  await sleep(1500);
  ok(await ev(() => !!document.querySelector('#world.vox')), 'returning to the Starter Island brings the voxel island back');

  /* ---------- the setting falls back to the 2D island ---------- */
  await ev(() => { A.State.state.settings.voxIsland = false; A.State.save(); A.UI.renderWorld(true); }); await sleep(600);
  const off = await ev(() => ({ vox: !!document.querySelector('#world.vox'), cv: !!document.querySelector('#world > canvas.vox3d'), terr: getComputedStyle(document.getElementById('terrain')).display, art: getComputedStyle(document.querySelector('[data-bid="hatchery"] .artg')).opacity }));
  ok(!off.vox && !off.cv && off.terr !== 'none' && off.art === '1', 'turning "3D voxel island" off restores the 2D island and its pictures');
  await page.screenshot({ path: path.join(SHOTS, 'env1-2d-fallback.png') });
  await ev(() => { A.State.state.settings.voxIsland = true; A.State.save(); A.UI.renderWorld(true); }); await page.waitForSelector('#world.vox', { timeout: 20000 }).catch(() => {});
  ok(await ev(() => !!document.querySelector('#world.vox')), 'turning it back on returns to the voxel island');

  /* ---------- saves ---------- */
  const before = await ev(() => { A.State.save(); return JSON.parse(localStorage.getItem(A.Data.SAVE_KEY)); });
  ok(before && before.settings.voxIsland === true && Object.keys(before.buildings).length > 0, 'the save stores the new setting next to the unchanged island data');
  await page.reload(); await page.waitForSelector('.logo'); await page.click('[data-act=continue]'); await page.waitForSelector('#world.vox', { timeout: 30000 }).catch(() => {}); await sleep(800); await calm();
  const after = await ev(() => ({ vox: !!document.querySelector('#world.vox'), b: Object.keys(A.State.state.buildings).length, hx: A.State.state.buildings.hatchery.x, hy: A.State.state.buildings.hatchery.y }));
  ok(after.vox && after.b === Object.keys(before.buildings).length && after.hx === before.buildings.hatchery.x && after.hy === before.buildings.hatchery.y, 'after a reload the island, its buildings and their places are unchanged');
  const old = await ev(() => { const s = JSON.parse(localStorage.getItem(A.Data.SAVE_KEY)); delete s.settings.voxIsland; A.State.sanitize(s); return s.settings.voxIsland; });
  ok(old === true, 'an older save without the setting gets the voxel island on (' + old + ')');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\nbrowser env1: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error('ERROR ' + (e && e.message ? e.message.split('\n').slice(0, 8).join('\n') : e)); process.exit(1); });
