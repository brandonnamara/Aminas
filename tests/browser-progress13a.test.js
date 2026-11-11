// Phase 13A real-browser test (Chromium + Playwright, software WebGL; NOT a phone): the monster details screen's
// progression strip, feeding in place, level-ups, evolution requirements, prompt and ceremony, move levels, gear.
// Run: node tests/browser-progress13a.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
  const shot = async (n) => { if (SHOTS) { await sleep(350); await page.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
  const ev = (fn, arg) => page.evaluate(fn, arg), until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 30000 });
  const clean = () => ev(async () => { for (let i = 0; i < 12; i++) { await new Promise((r) => setTimeout(r, 80)); document.querySelectorAll('.dlg .dlg-skip').forEach((x) => x.click()); } document.querySelectorAll('.dlg,.toast').forEach((x) => x.remove()); if (A.UI.queue) A.UI.queue.length = 0; A.UI.closeAll(); });
  // what the open details screen shows
  const view = () => ev(() => { const ov = [...document.querySelectorAll('#modal-root .overlay')].find((x) => x._detail); if (!ov) return null; const q = (s) => ov.querySelector(s), t = (s) => (q(s) ? q(s).textContent.trim() : null), num = (s) => +String(t(s) || '').replace(/[^0-9]/g, '');
    return { uid: ov._uid, sp: ov._sp, title: t('h2'), lv: num('.pg-lv b'), xpt: t('.pg-xpt'), bar: q('.pg-head .bar > i') ? parseFloat(q('.pg-head .bar > i').style.width) : null, status: t('.pg-status'), statusCls: q('.pg-status') ? q('.pg-status').className : '', food: num('.pg-food b'),
      feeds: [...ov.querySelectorAll('.pg-feed')].map((b) => ({ kind: b.dataset.kind, text: b.textContent.replace(/\s+/g, ' ').trim(), short: b.classList.contains('short'), off: b.classList.contains('off') })),
      stats: Object.fromEntries([...ov.querySelectorAll('.pg-stats .stat')].map((x) => [x.dataset.stat, { v: +x.querySelector('b').textContent, up: x.querySelector('em') ? +x.querySelector('em').textContent : null, gear: x.querySelector('.pg-gear') ? +x.querySelector('.pg-gear').textContent.replace(/[^0-9]/g, '') : 0 }])),
      tab: q('.dtab.on').dataset.tab, scroll: q('.sh-body').scrollTop, rows: [...ov.querySelectorAll('.inst')].map((x) => ({ uid: +x.dataset.uid, lv: x.querySelector('b').textContent, cur: x.classList.contains('cur') })), overlays: document.querySelectorAll('#modal-root .overlay').length, banner: !!document.querySelector('.banner-fx') }; });
  const game = (uid) => ev((uid) => { const s = A.State.state, a = A.Rules.inst(s, uid); return { res: Object.assign({}, s.res), lv: a.lv, xp: a.xp, sp: a.sp, need: A.Rules.xpNeed(a.lv), stats: A.Rules.statsWithGear(s, a), mv: a.mv, evolved: s.stats.evolved, fed: s.stats.fed, ess: A.Rules.Essence.get(s, 'light') }; }, uid);
  const tab = (t) => ev((t) => document.querySelector('#modal-root .dtab[data-tab="' + t + '"]').click(), t);
  const feed = (kind) => ev((kind) => document.querySelector('#modal-root .pg-feed[data-kind="' + kind + '"]').click(), kind);

  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.UI.P13 && A.Rules.Prog);
  const U = await ev(() => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern';
    const a = R.addAmina(s, 'lumifern', 11); a.xp = R.xpNeed(11) - 30; const b = R.addAmina(s, 'lumifern', 3), c = R.addAmina(s, 'pyrokai', 30), d = R.addAmina(s, 'aurelith', 24); s.res.food = 33; s.res.gold = 500; R.Essence.gain(s, 'light', 12); R.drain(); A.State.save(); A.UI.showIsland(); return { a: a.uid, b: b.uid, c: c.uid, d: d.uid }; });
  await page.waitForSelector('#world'); await clean();

  /* ---- the progression strip ---- */
  await ev((u) => A.UI.detail('lumifern', { uid: u }), U.a); await page.waitForSelector('.pg-head'); await sleep(600);
  let v = await view(), g = await game(U.a);
  ok(v.lv === 11 && /219 \/ 249 XP/.test(v.xpt) && /30 to Lv 12/.test(v.xpt) && Math.abs(v.bar - 88) < 1, 'the details screen shows level and experience at the top: Lv 11, “' + v.xpt + '”');
  ok(v.feeds.length === 2 && /Berry Snack 3 → \+18 XP/.test(v.feeds[0].text) && /Honey Feast 10 → \+70 XP · Lv 12/.test(v.feeds[1].text) && v.food === 33, 'each feed says its cost and benefit before it is used (“' + v.feeds[0].text + '”, “' + v.feeds[1].text + '”), with the food in hand (33)');
  ok(/Evolves at Lv 12 \(1 level, 30 XP to go\)/.test(v.status), 'and how far evolution is: “' + v.status + '”');
  await shot('01-strip');
  await tab('battle'); v = await view();
  ok(['hp', 'atk', 'def', 'spd'].every((k) => v.stats[k].v === g.stats[k]) && v.stats.hp.up === 5 && v.stats.atk.up === 1 && v.stats.spd.up === 1, 'Battle shows the four stats with the gain the next level brings (HP ' + v.stats.hp.v + ' +' + v.stats.hp.up + ')');
  await shot('02-battle');

  /* ---- feeding in place ---- */
  await ev(() => { const b = document.querySelector('#modal-root .sh-body'); b.scrollTop = 40; }); const v0 = await view(); const node0 = await ev(() => { const ov = [...document.querySelectorAll('#modal-root .overlay')].find((x) => x._detail); ov.__mark = ov.querySelector('.viewer3d'); ov.__sheet = ov.firstElementChild; return true; });
  await feed('snack'); await sleep(250); v = await view(); let g1 = await game(U.a);
  ok(g1.res.food === 30 && g1.xp === 237 && g1.lv === 11 && g1.res.gold === g.res.gold, 'a Berry Snack takes 3 food and gives 18 XP (food 33 → 30, XP 219 → 237)');
  ok(/\+18 XP/.test(v.status) && /3 food used/.test(v.status) && /237 \/ 249/.test(v.xpt) && v.food === 30 && !v.banner, 'the gain is reported in place (“' + v.status + '”), the numbers update, and nothing pops up over the screen');
  ok(v.overlays === v0.overlays && v.tab === 'battle' && v.scroll === v0.scroll && v.uid === U.a && (await ev(() => { const ov = [...document.querySelectorAll('#modal-root .overlay')].find((x) => x._detail); return ov.__mark === ov.querySelector('.viewer3d') && ov.__sheet === ov.firstElementChild; })), 'feeding keeps the screen open on the same Amina, the same tab and the same scroll position (the page is updated, not rebuilt)');
  await until((w) => Math.abs(parseFloat(document.querySelector('#modal-root .pg-head .bar > i').style.width) - w) < 1.5, Math.round(237 / 249 * 100));
  const trans = await ev(() => getComputedStyle(document.querySelector('#modal-root .pg-head .bar > i')).transitionDuration);
  ok(parseFloat(trans) > 0.2, 'the experience bar slides to its new length (' + trans + ')');
  await shot('03-fed');
  // level-up
  await ev(() => { document.querySelector('#modal-root .sh-body').scrollTop = 0; }); await feed('feast'); await sleep(300); v = await view(); g1 = await game(U.a);
  ok(g1.lv === 12 && g1.xp === 237 + 70 - 249 && g1.res.food === 20, 'a Honey Feast takes 10 food and carries the extra XP over the level-up (Lv 12, 58 XP, food 20)');
  ok(/Level up! Lv 11 → 12/.test(v.status) && /HP \+5 · ATK \+1 · DEF \+1 · SPD \+1/.test(v.status) && /levelup/.test(v.statusCls) && !v.banner, 'the level-up is announced in place with every stat gain: “' + v.status + '”');
  ok(v.lv === 12 && ['hp', 'atk', 'def', 'spd'].every((k) => v.stats[k].v === g1.stats[k]) && v.stats.hp.v === 101 && v.rows.find((r) => r.uid === U.a).lv === 'Lv 12', 'level, stats and the list below all show the new level (HP ' + v.stats.hp.v + ')');
  const early = await ev(() => !!document.querySelector('.evo-ask'));
  await shot('04-level-up');
  ok(!early, 'the “ready to evolve” notice waits while the level-up is shown (they used to land on top of each other)');
  await page.waitForSelector('.evo-ask', { timeout: 15000 });

  /* ---- evolution: prompt, ceremony, results ---- */
  const pr = await ev(() => { const q = document.querySelector('.evo-ask'); return { text: q.textContent.replace(/\s+/g, ' '), stats: [...q.querySelectorAll('.pg-es')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), move: q.querySelector('.pg-newmove') ? q.querySelector('.pg-newmove').textContent.trim() : '', go: !document.querySelector('[data-act="evoGo"]').classList.contains('off') }; });
  ok(pr.go && pr.stats.length === 4 && /HP\s*101\s*→\s*143\s*\+42/.test(pr.stats[0]) && /new signature move replaces Sun Sprout/.test(pr.move), 'the evolution prompt shows what will change before you decide: ' + pr.stats.join(', ') + '; “' + pr.move + '”');
  await shot('05-evo-prompt');
  const before = await game(U.a);
  await ev(() => { const b = document.querySelector('[data-act="evoGo"]'); b.click(); b.click(); });
  await page.waitForSelector('.evolve'); const during = await ev(() => ({ dlg: !!document.querySelector('.dlg'), prompt: !!document.querySelector('.evo-ask') }));
  await page.waitForSelector('.evolve.done .evo-result', { timeout: 20000 }); await sleep(500);
  const cer = await ev(() => { const q = document.querySelector('.evolve'); return { h1: q.querySelector('h1').textContent, name: q.querySelector('.evo-name').textContent, cap: q.querySelector('.evo-result .pg-cap').textContent.trim(), stats: [...q.querySelectorAll('.pg-es')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), move: q.querySelector('.pg-newmove').textContent.trim(), dlg: !!document.querySelector('.dlg'), btn: !q.querySelector('[data-act="close"]').disabled, fits: q.getBoundingClientRect().bottom <= window.innerHeight + 1 && q.querySelector('[data-act="close"]').getBoundingClientRect().bottom <= window.innerHeight }; });
  const after = await game(U.a);
  ok(after.sp === 'solarbloom' && after.lv === before.lv && after.xp === before.xp && after.res.gold === before.res.gold - 60 && after.res.food === before.res.food - 15 && after.evolved === before.evolved + 1, 'Evolve (even double-tapped) evolves once: Lumifern II, level and XP kept, 60 gold and 15 food spent once');
  ok(cer.h1 === 'Evolution!' && cer.name === 'Lumifern II!' && /Stage 2 of 3/i.test(cer.cap) && /Lv 12 kept/i.test(cer.cap), 'the ceremony ends on the new form, by name, with its stage (“' + cer.cap + '”)');
  ok(cer.stats.length === 4 && /HP\s*101\s*→\s*143\s*\+42/.test(cer.stats[0]) && after.stats.hp === 143 && /New move: Radiant Burst \(Lv 1, Power 70\) replaces Sun Sprout/.test(cer.move), 'and shows what changed: ' + cer.stats.join(', ') + '; “' + cer.move + '”');
  ok(!during.dlg && !cer.dlg && cer.btn && cer.fits, 'nothing else talks over the ceremony, and it fits the screen with its button');
  await shot('06-evo-ceremony');
  await ev(() => document.querySelector('.evolve [data-act="close"]').click());
  const story = await page.waitForSelector('.dlg', { timeout: 15000 }).then(() => true, () => false); await clean();
  ok(story, 'the Entity’s remark follows once the ceremony is closed');
  await ev((u) => A.UI.detail('solarbloom', { uid: u }), U.a); await page.waitForSelector('.pg-head'); await tab('battle'); v = await view();
  const moves2 = await ev(() => [...document.querySelectorAll('#modal-root .dpanel[data-panel="battle"] .abil b')].map((x) => x.textContent));
  ok(v.title.indexOf('Lumifern II') === 0 && v.lv === 12 && v.stats.hp.v === 143 && moves2.join() === 'Glow Pulse,Radiant Burst' && /Evolves at Lv 22/.test(v.status), 'the details screen now shows Lumifern II at the same level, with its new move and the next evolution (“' + v.status + '”)');

  /* ---- Growth: requirements ---- */
  await tab('growth'); let gr = await ev(() => { const c = document.querySelector('#modal-root .pg-evo'); return { text: c.textContent.replace(/\s+/g, ' '), req: [...c.querySelectorAll('.evo-req li')].map((x) => x.className + ':' + x.textContent.replace(/\s+/g, ' ').trim()), btn: !!c.querySelector('[data-act="evoAsk"]'), stats: c.querySelectorAll('.pg-es').length }; });
  ok(/^no:/.test(gr.req[0]) && /Level 22 \(now Lv 12 · 10 levels, [\d,]+ XP to go\)/.test(gr.req[0]) && /160 gold \(you have 440\)/.test(gr.req[1]) && /40 food \(you have 5, 35 short\)/.test(gr.req[1]) && !gr.btn && gr.stats === 4, 'Growth lists the next evolution’s requirements and what is still missing: “' + gr.req.join('” · “') + '”');
  await ev(() => { document.querySelector('#modal-root .sh-body').scrollTop = 120; }); await shot('07-growth');
  await ev((u) => { A.UI.closeAll(); A.UI.detail('aurelith', { uid: u }); }, U.d); await tab('growth');
  ok(await ev(() => /Final form/.test(document.querySelector('#modal-root .pg-evo').textContent) && /Final form/.test(document.querySelector('#modal-root .pg-status').textContent)), 'a third-stage Amina is shown as the final form');

  /* ---- not enough food; highest level ---- */
  await ev((u) => { A.UI.closeAll(); A.State.state.res.food = 2; A.UI.detail('solarbloom', { uid: u }); }, U.a); await page.waitForSelector('.pg-head'); v = await view();
  ok(v.feeds.every((f) => f.short) && /need 1 more/.test(v.feeds[0].text) && /need 8 more/.test(v.feeds[1].text), 'when food is short the buttons say how much more is needed (“' + v.feeds[0].text + '”)');
  const b4 = await game(U.a); await feed('feast'); await sleep(200); v = await view(); const a4 = await game(U.a);
  ok(JSON.stringify(a4) === JSON.stringify(b4) && /Not enough food: Honey Feast needs 10, you have 2 \(8 short\)/.test(v.status) && /bad/.test(v.statusCls) && v.overlays === 1, 'a feed without enough food spends nothing and says why, on the screen: “' + v.status + '”');
  await shot('08-not-enough-food');
  await ev((u) => { A.UI.closeAll(); A.State.state.res.food = 50; A.UI.detail('pyrokai', { uid: u }); }, U.c); await page.waitForSelector('.pg-head'); v = await view();
  ok(v.lv === 30 && /Max level/.test(v.xpt) && v.bar === 100 && v.feeds.every((f) => f.off) && v.stats.hp.up === null && /Ready to evolve/.test(v.status) && (await ev(() => A.State.state.res.food)) === 50, 'at the highest level the strip says Max level, shows no further stat gain, and the feeds are switched off');

  /* ---- several of the same species ---- */
  await ev((u) => { A.UI.closeAll(); A.UI.detail('lumifern'); }, U.b); await page.waitForSelector('.pg-head'); v = await view();
  const gb0 = await game(U.b);
  ok(v.uid === U.b && v.lv === 3 && v.rows.length === 1, 'with one Lumifern left (the other evolved), its page shows that one (Lv 3)');
  await feed('snack'); await sleep(200); v = await view(); const gb1 = await game(U.b);
  ok(gb1.xp === gb0.xp + 18 && v.uid === U.b && (await game(U.a)).xp === a4.xp, 'feeding it feeds that one only');
  const U2 = await ev(() => { const s = A.State.state, R = A.Rules; const x = R.addAmina(s, 'lumifern', 7); R.drain(); A.UI.closeAll(); A.UI.detail('lumifern'); return x.uid; }); await page.waitForSelector('.pg-head'); v = await view();
  ok(v.rows.length === 2 && v.uid === U2 && v.rows.find((r) => r.cur).uid === U2, 'with two, the strip shows the higher one and marks it in the list');
  await ev((u) => document.querySelector('#modal-root .inst[data-uid="' + u + '"] [data-act="instPick"]').click(), U.b); await sleep(150); v = await view();
  ok(v.uid === U.b && v.lv === 3 && v.rows.find((r) => r.cur).uid === U.b && v.overlays === 1, 'tapping the other one in the list shows that one in the strip');
  await feed('snack'); await sleep(150); v = await view(); ok(v.uid === U.b && (await game(U.b)).xp === gb1.xp + 18, 'and the strip stays on it after feeding');

  /* ---- moves: five levels ---- */
  await ev((u) => { A.UI.closeAll(); A.UI.detail('solarbloom', { uid: u }); }, U.a); await page.waitForSelector('.pg-head'); await tab('moves');
  let mv = await ev(() => [...document.querySelectorAll('#modal-root .moves .mv')].map((m) => ({ name: m.querySelector('.mv-h b').textContent, lv: m.querySelector('.mv-lv').textContent, pips: m.querySelectorAll('.mv-pips i.on').length, cells: [...m.querySelectorAll('.pg-tl')].map((c) => c.className.replace('pg-tl', '').trim() + ':' + [...c.children].map((x) => x.textContent.trim()).join(' ').trim()), fx: m.querySelector('.mv-fx').textContent.replace(/\s+/g, ' ').trim(), cost: m.querySelector('.mv-cost').textContent.replace(/\s+/g, ' ').trim(), btnOff: m.querySelector('[data-act="mvUp"]') ? m.querySelector('[data-act="mvUp"]').classList.contains('off') : null })));
  ok(mv.length === 2 && mv[0].cells.length === 5 && mv[0].cells[0].indexOf('cur:Lv 1 40') === 0 && /next:Lv 2 43 ?10/.test(mv[0].cells[1]) && /Lv 5 55 ?90/.test(mv[0].cells[4]) && mv[0].pips === 1, 'Moves shows all five levels of each move with its effect and essence cost (' + mv[0].name + ': ' + mv[0].cells.map((c) => c.split(':')[1]).join(' | ') + ')');
  ok(/Power 40.*Power 43/.test(mv[0].fx) && /12 \/ 10 Light Essence/.test(mv[0].cost) && mv[0].btnOff === false, 'with the current effect, the next one, and the essence in hand against the cost before upgrading (“' + mv[0].cost + '”)');
  const e0 = await game(U.a); await ev(() => document.querySelector('#modal-root .moves .mv [data-act="mvUp"]').click()); await sleep(400); const e1 = await game(U.a);
  mv = await ev(() => [...document.querySelectorAll('#modal-root .moves .mv')].map((m) => ({ lv: m.querySelector('.mv-lv').textContent, cur: m.querySelector('.pg-tl.cur small').textContent, done: m.querySelectorAll('.pg-tl.done').length, cost: m.querySelector('.mv-cost').textContent.replace(/\s+/g, ' ').trim(), btnOff: m.querySelector('[data-act="mvUp"]').classList.contains('off') })));
  ok(e1.ess === e0.ess - 10 && e1.mv[0] === 2 && mv[0].lv === 'Lv 2' && mv[0].cur === 'Lv 2' && mv[0].done === 1, 'an upgrade costs exactly the essence shown (12 → 2) and the track moves on to Lv 2');
  ok(mv[0].btnOff && /Needs 23 more Light Essence/.test(mv[0].cost) && /dungeon or survival battles/.test(mv[0].cost), 'when essence is short it says how much more is needed and where it comes from');
  await shot('09-moves');

  /* ---- equipment ---- */
  await ev((u) => { const s = A.State.state, R = A.Rules, it = R.grantItem(s, 'driftclub'); R.equip(s, u, it.iid); R.drain(); A.UI.closeAll(); A.UI.detail('solarbloom', { uid: u }); }, U.a); await page.waitForSelector('.pg-head'); await tab('battle'); v = await view(); const gg = await game(U.a);
  ok(v.stats.atk.v === gg.stats.atk && v.stats.atk.gear === gg.stats.atk - 35 && v.stats.atk.gear > 0 && v.stats.hp.gear === 0 && /equipment/.test(await ev(() => document.querySelector('#modal-root .pg-statnote').textContent)), 'equipment bonuses are shown inside the stats (ATK ' + v.stats.atk.v + ', of which +' + v.stats.atk.gear + ' from the Driftwood Club)');
  await shot('10-gear-in-stats');

  /* ---- Reduce Motion; the island's own feed button ---- */
  const calm = await ev(async () => { A.State.state.settings.reduceMotion = true; document.body.classList.add('calm'); const tr = getComputedStyle(document.querySelector('#modal-root .pg-head .bar > i')).transitionDuration; A.State.state.res.food = 60; document.querySelector('#modal-root .pg-feed[data-kind="feast"]').click(); await new Promise((r) => setTimeout(r, 150)); const an = getComputedStyle(document.querySelector('#modal-root .pg-status')).animationName; A.State.state.settings.reduceMotion = false; document.body.classList.remove('calm'); return { tr, an, st: document.querySelector('#modal-root .pg-status').textContent }; });
  ok(parseFloat(calm.tr) === 0 && calm.an === 'none' && /\+70 XP|Level up/.test(calm.st), 'with Reduce Motion the bar and messages change without animation, and feeding works the same');
  await ev(() => A.UI.closeAll()); await clean();
  const isl = await ev(async (u) => { const s = A.State.state, R = A.Rules, a = R.inst(s, u); R.setActive(s, u); a.xp = R.xpNeed(a.lv) - 5; a.lv = 11; a.sp = 'lumifern'; a.evoNote = null; a.xp = R.xpNeed(11) - 5; s.res.food = 40; A.UI.refresh(); A.UI.doFeed(u, 'snack', document.querySelector('.comp .art'));
    await new Promise((r) => setTimeout(r, 300)); const both = !!document.querySelector('.banner-fx') && !!document.querySelector('.evo-ask'), banner = !!document.querySelector('.banner-fx'), txt = banner ? document.querySelector('.banner-fx p').textContent : ''; return { both, banner, txt }; }, U.b);
  ok(isl.banner && /SPD \+/.test(isl.txt) && !isl.both, 'feeding the companion from the island still shows the level-up banner (now with SPD), and the evolution notice no longer covers it');
  await page.waitForSelector('.evo-ask', { timeout: 15000 }); await ev(() => document.querySelector('[data-act="evoLater"]').click()); await clean();

  /* ---- other screens ---- */
  const others = await ev(async () => { A.UI.collection(); const col = !!document.querySelector('#modal-root .grid .card'); A.UI.closeAll(); A.UI.pvpMenu(); const m = [...document.querySelectorAll('.mcard')].map((x) => x.dataset.act); A.UI.closeAll(); A.UI.detail('umbrit'); const unk = !!document.querySelector('#modal-root .detail') && !document.querySelector('#modal-root .pg-head'); A.UI.closeAll(); return { col, m, unk }; });
  ok(others.col && ['pvp5', 'defence', 'hideseek'].every((x) => others.m.includes(x)) && others.unk, 'the collection, an undiscovered Amina’s page and the PvP menu open as before');
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-progress13a)'); await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
