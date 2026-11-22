// dialogue, Instant + large text: sample the text length and control overlap every 25 ms for 1.5 s after it opens
const { chromium } = require('playwright'); const serve = require('../tests/server');
(async () => { const srv = await serve(); const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 const page = await (await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })).newPage(); page.setDefaultTimeout(90000);
 await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
 await page.evaluate(async () => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'R', look: null }; s.starter = 'lumifern'; R.addAmina(s, 'lumifern', 9); s.settings.sfx = false; A.Perf.reportSlow = () => {}; R.drain(); A.State.save(); A.UI.showIsland(true); await new Promise((r) => setTimeout(r, 1500)); for (let i = 0; i < 30 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 120)); } A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); });
 for (const sz of ['normal', 'large', 'larger', 'large', 'normal']) {
  const r = await page.evaluate(async (sz) => { const long = 'Since the Resonance— since things changed, the island has been collecting strays. Shores from somewhere else. Kind Souls in the wrong forests. You’ll get used to it. I haven’t. Not yet. Perhaps not ever, if I am honest about it.';
   A.State.state.settings.textSize = sz; A.State.state.settings.textSpeed = 'instant'; A.UI.applyTextSize(); A.UI.script([['n', long]], () => {}); const t0 = performance.now(), out = [];
   while (performance.now() - t0 < 1500) { await new Promise((r) => setTimeout(r, 25)); const d = [...document.querySelectorAll('.dlg:not(.out)')].pop(); if (!d) { out.push([Math.round(performance.now() - t0), 'none']); continue; }
     const box = d.querySelector('.dlg-box').getBoundingClientRect(), tx = d.querySelector('.dlg-text'), ctl = [...d.querySelectorAll('.dlg-ctl .btn')].map((b) => b.getBoundingClientRect());
     const hit = ctl.some((c) => !(c.right <= box.left || c.left >= box.right || c.bottom <= box.top || c.top >= box.bottom)); out.push([Math.round(performance.now() - t0), tx.textContent.length, hit ? 'HIT' : '', Math.round(box.top), Math.round(Math.max(...ctl.map((c) => c.bottom)))]); }
   for (let i = 0; i < 30 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 120)); } A.UI.queue.length = 0; A.UI.busy = false;
   const firstFull = out.find((x) => x[1] === 228), hits = out.filter((x) => x[2] === 'HIT'); return { sz, firstFullMs: firstFull ? firstFull[0] : null, hitFrom: hits.length ? hits[0][0] : null, hitTo: hits.length ? hits[hits.length - 1][0] : null, hits: hits.length, n: out.length, sample: hits.slice(0, 3) }; }, sz);
  console.log(JSON.stringify(r)); }
 await b.close(); srv.close(); })();
