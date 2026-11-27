// Phase 20A: traced copy of the FIRST check of tests/browser-env12.test.js (same save, same focus, same placement,
// same nudge and wait; the assertion is evaluated the same way). For each run it records what changed between the
// placement and the check: the camera (A.UI.cam), re-renders of the objects (UI.renderObjects wrapped to count),
// Life.apply calls, the creature's on-screen shift, and the occlusion alpha at the measured and the real point.
// Env PATCH=prod also stops the production timer at the freeze (the first proposed correction). Not an iPhone.
// Run: node tools/p20a-env12-trace.js [runs]
const { chromium } = require('playwright'); const serve = require('../tests/server');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const RUNS = +process.argv[2] || 10;
(async () => {
  const srv = await serve(); const rows = [];
  for (let run = 0; run < RUNS; run++) {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } }); page.setDefaultTimeout(20000); const ev = (fn, arg) => page.evaluate(fn, arg);
    const calm = () => ev(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('#toast-root .toast,.ach-toast').forEach((t) => t.remove()); });
    await page.goto(srv.url); await page.waitForSelector('.logo');
    await ev(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.creatures3d = false; s.settings.dayNight = false;
      s.res = { gold: 5000, food: 300, gems: 20 }; R.addAmina(s, 'lumifern', 8);
      ['hollow', 'tidegate', 'hatchery'].forEach((id) => { s.struct[id] = true; s.buildings[id].level = 1; s.buildings[id].state = 'built'; });
      s.missions = { m_hollow: 'claimed' }; A.State.save(); A.UI.showIsland(); });
    await page.waitForSelector('#world.vox', { timeout: 30000 }).catch(() => {}); await sleep(1000); await calm();
    await ev(() => { window.__ro = 0; window.__la = 0; const f = A.UI.renderObjects; A.UI.renderObjects = function () { window.__ro++; return f.apply(this, arguments); };
      if (A.Life && A.Life.apply) { const g = A.Life.apply; A.Life.apply = function () { window.__la++; return g.apply(this, arguments); }; } });
    await ev(() => A.UI.focusBuilding('hatchery', 1.4)); await sleep(1200); await calm();
    const p = await ev((patch) => { const hb = A.State.state.buildings.hatchery, sz = A.World.size(hb.type, hb.rot), el = document.querySelector('#objs .creature'); if (!el) return null;
      clearInterval(A.UI.timers.life); if (patch === 'prod') clearInterval(A.UI.timers.prod); const mv = el.querySelector('.cr-mv'); if (mv) { mv.style.transition = 'none'; mv.style.transform = 'none'; }
      const c = [hb.x + sz.w * 0.3, hb.y + sz.h * 0.3], t = A.Iso.top(c[0], c[1]); el.setAttribute('transform', 'translate(' + t[0] + ' ' + t[1] + ') scale(0.9)'); const r = (mv || el).getBoundingClientRect();
      const cam = Object.assign({}, (A.UI.cam || {})[A.State.state.currentIsland] || {}); window.__p = { ro: window.__ro, la: window.__la, cam, el, tf: el.getAttribute('transform'), w: r.width, h: r.height, kids: el.querySelectorAll('*').length };
      window.__occ = null; setTimeout(() => { A.UI.applyCam(); const st = A.VoxIsland.stats(); window.__occ = { at: performance.now(), passes: st && st.occPace ? st.occPace.passes : 0, cam: Object.assign({}, (A.UI.cam || {})[A.State.state.currentIsland] || {}) }; }, 1200);
      return [r.left + r.width / 2, r.top + r.height * 0.6]; }, process.env.PATCH || '');
    const done = await page.waitForFunction(() => { const o = window.__occ, st = A.VoxIsland.stats(); return !!(o && st && st.occPace && st.occPace.passes > o.passes); }, null, { timeout: 15000, polling: 50 }).then(() => true).catch(() => false); await sleep(100);
    const r = await ev(([x, y]) => { const P = window.__p, el = document.querySelector('#objs .creature'), mv = el && el.querySelector('.cr-mv'), rc = (mv || el).getBoundingClientRect(), cx = rc.left + rc.width / 2, cy = rc.top + rc.height * 0.6, c1 = (A.UI.cam || {})[A.State.state.currentIsland] || {};
      const d = (a, b) => (a && b ? +Math.hypot((a.x - b.x) * (b.z || 1), (a.y - b.y) * (b.z || 1)).toFixed(1) + '|z' + (+a.z).toFixed(3) + '→' + (+b.z).toFixed(3) : null);
      return { covered: A.VoxIsland.occludedAt(x, y), coveredReal: A.VoxIsland.occludedAt(cx, cy), shift: Math.round(Math.hypot(cx - x, cy - y)), camPlaceToNudge: d(P.cam, window.__occ && window.__occ.cam), camNudgeToCheck: d(window.__occ && window.__occ.cam, c1),
        rerenders: window.__ro - P.ro, lifeApply: window.__la - P.la, sameEl: el === P.el, mv: mv ? mv.style.transform : null,
        outerMoved: el.getAttribute('transform') !== P.tf, box: [Math.round(P.w), Math.round(P.h), '→', Math.round(rc.width), Math.round(rc.height)].join(' '), kids: P.kids + '→' + el.querySelectorAll('*').length,
        anClass: (el.querySelector('.cr-an') || {}).getAttribute ? el.querySelector('.cr-an').getAttribute('class') : null,
        extra: [...el.querySelectorAll('*')].filter((n) => /bubble|emote|heart|zzz|chat|say|tip|badge|mark/i.test(n.getAttribute('class') || '')).map((n) => n.getAttribute('class')).join('|'),
        inCut: (() => { const o = A.VoxIsland.overlay && A.VoxIsland.overlay(); return !!(o && o.cut.some(([cx2, cy2, cw, ch]) => x >= cx2 && x <= cx2 + cw && y >= cy2 && y <= cy2 + ch)); })(),
        anims: document.getAnimations().filter((a) => a.effect && a.effect.target && el.contains(a.effect.target)).map((a) => a.animationName || a.transitionProperty).join('|') }; }, p);
    rows.push(Object.assign({ run, done }, r)); console.log(JSON.stringify(rows[rows.length - 1]));
    await browser.close();
  }
  const f = rows.filter((x) => !x.covered);
  console.log('\nruns', rows.length, '| not covered', f.length, '| failures: shift', f.map((x) => x.shift).join(','), '| re-renders', f.map((x) => x.rerenders).join(','), '| cam place→nudge', f.map((x) => x.camPlaceToNudge).join(' ; '), '| passes: max shift', Math.max(0, ...rows.filter((x) => x.covered).map((x) => x.shift)));
  srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
