// Phase 20A: diagnostic for the intermittent browser-env12 failure ("a creature standing behind the Hatchery is
// covered by it"). Repeats the test's own steps (same save, same placement, same view nudge, same wait for the
// occlusion pass counter) many times in one session and records, for every attempt: the result, whether the world's
// objects were re-rendered between placement and check (UI.renderObjects is wrapped to count calls; nothing else
// changes), whether the creature was still where the test put it, whether the point lay inside the occlusion region,
// and the occlusion alpha there. Chromium + SwiftShader; NOT an iPhone. Run: node tools/p20a-hatchery-diag.js [n]
// Env MODE=repro: force one UI.renderObjects() straight after each placement (what the 15 s production tick does by
// chance). MODE=fix: stop the production timer during each check, the proposed test-side correction.
const { chromium } = require('playwright'); const serve = require('../tests/server');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const N = +process.argv[2] || 24;
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } }); page.setDefaultTimeout(20000); const ev = (fn, arg) => page.evaluate(fn, arg);
  const calm = () => ev(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('#toast-root .toast,.ach-toast').forEach((t) => t.remove()); });
  await page.goto(srv.url); await page.waitForSelector('.logo');
  await ev(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.creatures3d = false; s.settings.dayNight = false;
    s.res = { gold: 5000, food: 300, gems: 20 }; R.addAmina(s, 'lumifern', 8);
    ['hollow', 'tidegate', 'hatchery'].forEach((id) => { s.struct[id] = true; s.buildings[id].level = 1; s.buildings[id].state = 'built'; });
    s.missions = { m_hollow: 'claimed' }; A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world.vox', { timeout: 30000 }).catch(() => {}); await sleep(1000); await calm();
  await ev(() => { window.__ro = 0; window.__roT = 0; const f = A.UI.renderObjects; A.UI.renderObjects = function () { window.__ro++; window.__roT = performance.now(); return f.apply(this, arguments); };
    const st0 = A.VoxIsland.stats; window.__passT = []; let lastP = 0; setInterval(() => { const s = A.VoxIsland.stats(); const n = s && s.occPace ? s.occPace.passes : 0; if (n !== lastP) { window.__passT.push(performance.now()); lastP = n; if (window.__passT.length > 50) window.__passT.shift(); } }, 20); });
  await ev(() => A.UI.focusBuilding('hatchery', 1.4)); await sleep(1200); await calm();
  await ev((m) => { window.__MODE = m; }, process.env.MODE || '');
  const rows = [];
  for (let k = 0; k < N; k++) {
    const p = await ev(() => { const hb = A.State.state.buildings.hatchery, sz = A.World.size(hb.type, hb.rot), el = document.querySelector('#objs .creature'); if (!el) return null;
      clearInterval(A.UI.timers.life); const mv = el.querySelector('.cr-mv'); if (mv) { mv.style.transition = 'none'; mv.style.transform = 'none'; }
      const c = [hb.x + sz.w * 0.3, hb.y + sz.h * 0.3], t = A.Iso.top(c[0], c[1]), tf = 'translate(' + t[0] + ' ' + t[1] + ') scale(0.9)'; el.setAttribute('transform', tf); const r = (mv || el).getBoundingClientRect();
      window.__ro0 = window.__ro; window.__tf = tf; window.__el = el;
      if (window.__MODE === 'fix') clearInterval(A.UI.timers.prod); window.__occ = null;
      setTimeout(() => { A.UI.applyCam(); const st = A.VoxIsland.stats(); window.__occ = { at: performance.now(), passes: st && st.occPace ? st.occPace.passes : 0 }; }, 1200);
      return [r.left + r.width / 2, r.top + r.height * 0.6]; });
    if (process.env.MODE === 'repro') await ev(() => A.UI.renderObjects());
    // MODE=offset: give the creature's mover a walking offset away from the building (what Life.apply restores after a
    // re-render when the companion had wandered that way before the freeze), then compare the old and the real point
    if (process.env.MODE === 'offset') await ev((k) => { const mv = document.querySelector('#objs .creature .cr-mv'); const o = [[-70, 30], [60, 40], [-40, -50], [80, -20]][k % 4]; mv.style.transition = 'none'; mv.style.transform = 'translate(' + o[0] + 'px,' + o[1] + 'px)'; }, k);
    const t0 = Date.now(); const done = await page.waitForFunction(() => { const o = window.__occ, st = A.VoxIsland.stats(); return !!(o && st && st.occPace && st.occPace.passes > o.passes); }, null, { timeout: 15000, polling: 50 }).then(() => true).catch(() => false); await sleep(100);
    const r = await ev(([x, y]) => { const el = document.querySelector('#objs .creature'), o = A.VoxIsland.overlay && A.VoxIsland.overlay();
      const mv = el && el.querySelector('.cr-mv'), rc = (mv || el).getBoundingClientRect(), cx = rc.left + rc.width / 2, cy = rc.top + rc.height * 0.6;
      const real = [cx, cy], hb = A.State.state.buildings.hatchery, bEl = document.querySelector('#objs [data-id="hatchery"], #objs [data-b="hatchery"]'), br = bEl ? bEl.getBoundingClientRect() : null;
      return { covered: A.VoxIsland.occludedAt(x, y), coveredAtReal: A.VoxIsland.occludedAt(cx, cy), realBehindBuilding: br ? (cx >= br.left && cx <= br.right && cy >= br.top && cy <= br.bottom) : null, rerender: window.__ro - window.__ro0, moved: !el || el.getAttribute('transform') !== window.__tf, sameEl: el === window.__el,
        mvTransform: mv ? (mv.style.transform || getComputedStyle(mv).transform) : null, shiftPx: Math.round(Math.hypot(cx - x, cy - y)),
        inRect: !!(o && o.rect && x >= o.rect[0] && x <= o.rect[0] + o.rect[2] && y >= o.rect[1] && y <= o.rect[1] + o.rect[3]),
        now: Math.round(performance.now()), nudgeAgo: window.__occ ? Math.round(performance.now() - window.__occ.at) : null, renderAgo: window.__roT ? Math.round(performance.now() - window.__roT) : null,
        lastPassAgo: window.__passT.length ? Math.round(performance.now() - window.__passT[window.__passT.length - 1]) : null, passesSinceRender: window.__passT.filter((t) => t > window.__roT).length,
        up: o ? o.up.length : null, flat: o ? o.flat.length : null, sig: o ? String(o.sig).length : null,
        alpha: (() => { const c = document.querySelector('canvas.vox-occ'); if (!c) return null; const r = c.getBoundingClientRect(), pr = c.width / r.width; try { return c.getContext('2d').getImageData(Math.floor((x - r.left) * pr), Math.floor((y - r.top) * pr), 1, 1).data[3]; } catch (e) { return 'err'; } })(),
        cuts: o ? o.cut.length : null, inCut: !!(o && o.cut.some(([cx, cy, cw, ch]) => x >= cx && x <= cx + cw && y >= cy && y <= cy + ch)),
        cutWhat: o ? [...document.querySelectorAll('#objs [data-cut], #objs .bld-badge, #objs .badge, #objs .prod, #objs .ready, #objs .bubble')].filter((e) => { const r = e.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }).map((e) => e.getAttribute('class')).join('|') : '' }; }, p);
    rows.push(Object.assign({ k, ms: Date.now() - t0, done }, r)); console.log(JSON.stringify(rows[rows.length - 1]));
    await sleep(500 + (k % 5) * 900); // spread attempts across the 15-second production tick
  }
  const fails = rows.filter((r) => !r.covered), withRe = rows.filter((r) => r.rerender > 0);
  console.log('\nattempts', rows.length, '| not covered', fails.length, '| re-rendered between place and check', withRe.length,
    '| failures with a re-render', fails.filter((r) => r.rerender > 0).length, '| failures without one', fails.filter((r) => !r.rerender).length,
    '| re-renders that still passed', withRe.filter((r) => r.covered).length, '| creature moved on failures', fails.filter((r) => r.moved).length, '| element replaced on failures', fails.filter((r) => !r.sameEl).length, '| shift on failures (px)', fails.map((r) => r.shiftPx).join(','), '| max shift on passes', Math.max(...rows.filter((r) => r.covered).map((r) => r.shiftPx)), '| point inside a cut-out on failures', fails.filter((r) => r.inCut).length, '| point inside a cut-out on passes', rows.filter((r) => r.covered && r.inCut).length);
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
