// Phase 16B: interface audit (desktop Chromium, software WebGL, 844×390 touch viewport; NOT a phone). For each main
// screen: interactive controls whose touch area is under 44×44 CSS px, visible text under 11 px, and panels whose
// content is clipped without being scrollable. Optional screenshots. Run: node tools/ui16b-audit.js [label] [shotsDir]
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path');
const LABEL = process.argv[2] || 'now', SHOTS = process.argv[3]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SCREENS = [
  ['island', null], ['settings', 'A.UI.settings()'], ['collection', 'A.UI.collection()'], ['detail', "A.UI.detail(A.State.state.aminas[0].sp, { uid: A.State.state.aminas[0].uid })"],
  ['hatchery', 'A.UI.acts.hatchery()'], ['forge', "A.UI.forge('craft')"], ['bag', 'A.UI.bag()'], ['battlehub', 'A.UI.battleHub()'], ['dungeons', "A.UI.dungeons(null, 'forgottenroad')"],
  ['journal', 'A.UI.journal()'], ['profile', 'A.UI.profile()'], ['dialogue', "A.UI.script([['n', 'Kind Souls. Aminas, if you insist on being formal. The small ones who live here. Some are considerably kinder than others.']], () => {})"],
  ['battle', "(() => { const s = A.State.state, R = A.Rules; R.startRun(s, 'forgottenroad', s.aminas.slice(0, 3).map((a) => a.uid)); A.UI.startBattle(); })()"],
];
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true })).newPage(); page.setDefaultTimeout(90000);
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await page.evaluate(async () => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.avatar.name = 'Rowan'; s.starter = 'lumifern'; R.addAmina(s, 'lumifern', 12); R.addAmina(s, 'acinus', 9); R.addAmina(s, 'emberix', 8); R.addAmina(s, 'umbrit', 6);
    s.res.gold = 5000; s.res.food = 800; s.res.gems = 40; s.struct.hollow = true; s.struct.hatchery = true; s.struct.forge = true; s.missions = { m_hollow: 'claimed', m_feed: 'claimed' }; s.settings.sfx = false; s.settings.music = false;
    A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; R.drain(); A.State.save(); A.UI.showIsland(true); });
  await page.waitForSelector('#world'); await sleep(1500);
  const report = {};
  for (const [name, open] of SCREENS) {
    await page.evaluate(async () => { for (let i = 0; i < 20 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 100)); } A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('.toast').forEach((t) => t.remove()); if (A.UI.screen !== 'island') A.UI.showIsland(true); });
    await sleep(500);
    if (open) { await page.evaluate(open).catch((e) => console.log(name, 'open failed', e.message)); await sleep(name === 'battle' ? 4000 : 1200); }
    const r = await page.evaluate(() => {
      const vis = (e) => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && b.width > 0 && b.height > 0 && b.right > 0 && b.bottom > 0 && b.left < innerWidth && b.top < innerHeight; };
      // the touch area: the element's box, grown by a ::after hit-area extension if one is set
      // with the Phase 16B hit assist, a tap that misses lands on the nearest small control within its 44×44 margin; this
      // measures what a tap actually reaches: probe points around the control, on whatever element is under them
      const area = (e) => { const b = e.getBoundingClientRect(); if (!A.UI.hitTarget) return [b.width, b.height]; const cx = b.left + b.width / 2, cy = b.top + b.height / 2, reach = (x, y) => { const el = document.elementFromPoint(x, y); if (!el) return false; const c = el.closest('button, [data-act], a[href], input, select, textarea, [role=button]'); return c === e || A.UI.hitTarget(x, y, el) === e; };
        let w = b.width, h = b.height; const hx = Math.max(b.width, 44) / 2 - 1, hy = Math.max(b.height, 44) / 2 - 1; if (b.width < 44 && reach(cx - hx, cy) && reach(cx + hx, cy)) w = 44; if (b.height < 44 && reach(cx, cy - hy) && reach(cx, cy + hy)) h = 44; return [w, h]; };
      const top = document.querySelector('.overlay:last-of-type') || document.querySelector('.dlg') || document;
      const ctl = [...document.querySelectorAll('button, [data-act], a[href], input, select, textarea, [role=button]')].filter(vis).filter((e) => !e.closest('[aria-hidden=true]') && !e.parentElement.closest('button,[data-act]'));
      const small = ctl.map((e) => { const [w, h] = area(e); return { w: Math.round(w), h: Math.round(h), t: (e.getAttribute('aria-label') || e.textContent || e.dataset.act || e.className).trim().replace(/\s+/g, ' ').slice(0, 28), act: e.dataset.act || '' }; }).filter((x) => x.w < 44 || x.h < 44);
      const texts = [...document.querySelectorAll('body *')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1) && vis(e));
      const tiny = texts.map((e) => ({ px: +parseFloat(getComputedStyle(e).fontSize).toFixed(1), t: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), c: e.tagName.toLowerCase() + '.' + String(e.className || '').split(' ').join('.') + ' < ' + String((e.parentElement || {}).className || '').split(' ')[0] })).filter((x) => x.px < 10.5);
      const clipped = [...document.querySelectorAll('.sh-body, .panel, .sheet, .overlay *')].filter(vis).filter((e) => { const s = getComputedStyle(e); return (s.overflowY === 'hidden' || s.overflowY === 'clip') && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 60; }).map((e) => (e.className || e.tagName).toString().slice(0, 40));
      const offscreen = ctl.filter((e) => { const b = e.getBoundingClientRect(); return b.bottom > innerHeight + 1 || b.right > innerWidth + 1; }).map((e) => (e.textContent || e.dataset.act || '').trim().slice(0, 20));
      return { controls: ctl.length, small: small.length, smallList: small.slice(0, 40), tinyText: tiny.length, tinyList: tiny.slice(0, 15), clipped, offscreen: offscreen.slice(0, 10) };
    });
    report[name] = r; console.log(name.padEnd(11), 'controls', r.controls, 'under44', r.small, 'tinyText', r.tinyText, 'clipped', r.clipped.length, 'offscreen', r.offscreen.length);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, LABEL + '-' + name + '.jpg'), type: 'jpeg', quality: 85 });
    if (name === 'battle') await page.evaluate(() => { const s = A.State.state; A.UI.leaveBattle && A.UI.leaveBattle(() => {}); A.Rules.abandonRun(s); });
  }
  const out = path.join(__dirname, '..', 'docs', 'ui', 'screens16b'); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'audit-' + LABEL + '.json'), JSON.stringify(report, null, 1));
  await browser.close(); srv.close();
})();
