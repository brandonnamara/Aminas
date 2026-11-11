// Phase 13B real-browser test (Chromium + Playwright, software WebGL; NOT a phone): the Hatchery screen, choosing
// parents, the breeding confirmation, incubation, hatching, the upgrade read-out, the island marker and reloads.
// Run: node tests/browser-hatchery13b.test.js [shotsDir]
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
  const clean = (keep) => ev(async (keep) => { for (let i = 0; i < 10; i++) { await new Promise((r) => setTimeout(r, 70)); document.querySelectorAll('.dlg .dlg-skip').forEach((x) => x.click()); } document.querySelectorAll('.dlg,.toast,.ach-toast').forEach((x) => x.remove()); if (!keep) { if (A.UI.queue) A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); } else if (!document.querySelector('.dlg')) A.UI.busy = false; }, keep);
  const click = (sel) => ev((s) => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
  const start = async () => { await page.goto(srv.url); await until(() => window.A && A.UI && A.UI.showIsland); };
  const view = () => ev(() => { const ov = [...document.querySelectorAll('#modal-root .overlay')].find((x) => x._hatchery); if (!ov) return null; const t = (s) => { const e = ov.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    return { title: t('h2'), state: t('.hx-state'), cap: t('.hx-left-col .hx-cap'), slots: [...ov.querySelectorAll('.hx-slot')].map((r) => ({ cls: r.className.replace('hx-slot', '').trim(), text: r.textContent.replace(/\s+/g, ' ').trim(), bar: r.querySelector('.bar > i') ? parseFloat(r.querySelector('.bar > i').style.width) : null, hatch: !!r.querySelector('[data-act="hHatch"]') })),
      up: t('.hx-up'), upBtn: !!ov.querySelector('[data-act="hUpgrade"]'), parents: [...ov.querySelectorAll('.hx-breed .hx-parent')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), out: t('.hx-breed .hx-out'), outCls: ov.querySelector('.hx-breed .hx-out').className, note: t('.hx-note'),
      needs: [...ov.querySelectorAll('.hx-needs li')].map((l) => l.className + ':' + l.textContent.replace(/\s+/g, ' ').trim()), cost: t('.hx-cost'), breedOff: ov.querySelector('[data-act="hStart"]').classList.contains('off'), status: t('.hx-status'), foot: t('#hx-line'),
      overlays: document.querySelectorAll('#modal-root .overlay').length, fits: (() => { const b = ov.querySelector('.sh-body'); return b.scrollHeight <= b.clientHeight + 2; })() }; });
  const game = () => ev(() => { const s = A.State.state; return { gold: s.res.gold, food: s.res.food, eggs: JSON.parse(JSON.stringify(s.eggs)), n: s.aminas.length, hatched: s.stats.hatched, recipes: Object.keys(s.recipes || {}), slots: A.Rules.eggSlots(s), st: A.Rules.Hatch.status(s), owned: Object.keys(s.owned).length }; });
  const setup = (o) => ev((o) => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = false; s.settings.eggSpeed = 'fast'; s.settings.reduceMotion = !!o.calm;
    ['hollow', 'tidegate', 'hatchery'].forEach((k) => { s.struct[k] = true; s.buildings[k].level = 1; s.buildings[k].state = 'built'; }); s.buildings.hatchery.level = o.lv || 2;
    const u = {}; [['lumifern', 11], ['pyrokai', 8], ['kairyu', 6], ['zephyr', 7], ['gaiaroki', 3], ['umbrit', 9]].forEach(([sp, lv]) => { u[sp] = R.addAmina(s, sp, lv).uid; });
    s.res.food = o.food == null ? 220 : o.food; s.res.gold = o.gold == null ? 900 : o.gold; R.drain(); A.State.save(); A.UI.showIsland(); window.__u = u; return u; }, o || {});

  await start(); const U = await setup({}); await sleep(1200); await clean();

  /* ---- the screen ---- */
  await ev(() => A.UI.hatchery()); let v = await view();
  ok(v && /Old Hatchery/.test(v.title) && /Lv 2/.test(v.title) && v.state === 'Idle' && /0 of 2 in use/.test(v.cap), 'the Hatchery opens with its level, its state (Idle) and how many slots are in use');
  ok(v.slots.length === 5 && v.slots.filter((s) => /free/.test(s.cls)).length === 2 && v.slots.filter((s) => /locked/.test(s.cls)).length === 3 && /Opens at Hatchery Lv 3/.test(v.slots[2].text) && /sel/.test(v.slots[0].cls), 'all five slots are listed: two open (the first chosen for the next egg), three locked with the level that opens each');
  ok(/Hatchery Lv 2 of 5/.test(v.up) && /2 breeding slots/.test(v.up) && /\+1 slot \(3 in all\)/.test(v.up) && /1,500/.test(v.up) && /Need 600 more gold/.test(v.up) && v.upBtn, 'the upgrade card shows the capacity now, the next level’s benefit (+1 slot, 3 in all), its cost (1,500 gold) and what is short (“' + v.up + '”)');
  ok(v.breedOff && v.needs.length === 5 && /^ok:.*40 gold and 25 food/.test(v.needs[4]) && /ok:.*free breeding slot \(Slot 1\)/.test(v.needs[3]) && /40 25/.test(v.cost.replace(/[^0-9 ]/g, '').replace(/ +/g, ' ')) && /hatches in 17s/.test(v.cost), 'before choosing parents the panel lists the five requirements, the cost and the incubation time, and Breed is off');
  ok(v.fits, 'the whole screen fits a phone in landscape without scrolling' + (v.fits ? '' : ' ' + JSON.stringify(await ev(() => { const b = document.querySelector('#modal-root .sh-body'); return [b.scrollHeight, b.clientHeight]; })))); await shot('01-hatchery-idle');
  let g0 = await game(); await click('[data-act="hStart"]'); await sleep(150); let g1 = await game(); v = await view();
  ok(g1.gold === g0.gold && g1.eggs.length === 0 && v.overlays === 1 && v.needs.filter((n) => /^wait:/.test(n)).length === 3, 'pressing Breed with no parents does nothing and spends nothing; the list shows what is still needed');

  /* ---- choosing parents ---- */
  await click('.hx-breed [data-act="hPick"][data-i="0"]'); await sleep(150);
  let pick = await ev(() => [...document.querySelectorAll('#modal-root .overlay:last-child .hx-cand')].map((c) => ({ name: c.querySelector('.nm').textContent, dis: c.classList.contains('dis'), act: c.dataset.act || null, sub: (c.querySelector('.hx-lays, .hx-why') || {}).textContent || '' })));
  ok(pick.length === 6 && pick.filter((c) => !c.dis).length === 5 && pick[5].name === 'Gaiaroki' && pick[5].dis && !pick[5].act && /Needs Lv 5/.test(pick[5].sub), 'the picker lists every Amina, eligible ones first; the Lv 3 Gaiaroki is marked “Needs Lv 5” and cannot be chosen');
  await ev((u) => document.querySelector('#modal-root .hx-cand[data-uid="' + u + '"]').click(), U.lumifern); await sleep(150);
  await click('.hx-breed [data-act="hPick"][data-i="1"]'); await sleep(150);
  pick = await ev(() => [...document.querySelectorAll('#modal-root .overlay:last-child .hx-cand')].map((c) => ({ name: c.querySelector('.nm').textContent, dis: c.classList.contains('dis'), sub: (c.querySelector('.hx-lays, .hx-why') || {}).textContent || '' })));
  const by = (n) => pick.find((c) => c.name === n);
  ok(by('Lumifern').dis && /Already chosen/.test(by('Lumifern').sub) && by('Umbrit').dis && /Locked pairing/.test(by('Umbrit').sub) && !by('Pyrokai').dis && /Mystery egg/.test(by('Pyrokai').sub) && !by('Zephyr').dis, 'for the second parent each partner shows what the pair would lay (a mystery egg until discovered); the chosen one and a locked pairing cannot be picked');
  await shot('02-pick-parent');
  await ev((u) => document.querySelector('#modal-root .hx-cand[data-uid="' + u + '"]').click(), U.pyrokai); await sleep(150); v = await view();
  ok(/Lumifern/.test(v.parents[0]) && /Lv 11/.test(v.parents[0]) && /Pyrokai/.test(v.parents[1]) && /Mystery egg/.test(v.out) && /ok/.test(v.outCls) && v.needs.every((n) => /^ok:/.test(n)) && !v.breedOff && v.overlays === 1, 'with a valid pair every requirement is ticked, the egg is shown (a mystery egg) and Breed is on');
  await shot('03-pair-ready');

  /* ---- confirmation ---- */
  g0 = await game(); await click('[data-act="hStart"]'); await sleep(200);
  let cf = await ev(() => { const c = document.querySelector('#modal-root .hx-confirm'); return c ? c.textContent.replace(/\s+/g, ' ').trim() : null; }); g1 = await game();
  ok(cf && /Breed these two\?/.test(cf) && /Lumifern/.test(cf) && /Pyrokai/.test(cf) && /Mystery egg/.test(cf) && /Cost: 40 25/.test(cf) && /860 195 left/.test(cf) && /Slot 1/.test(cf) && /17s/.test(cf) && /parents stay/.test(cf) && g1.gold === g0.gold && g1.eggs.length === 0, 'Breed asks first: the pair, the egg, the cost, what will be left, the slot and the time; nothing is spent yet');
  await shot('04-breed-confirm');
  await click('.hx-confirm [data-act="close"]'); await sleep(150); g1 = await game(); ok(g1.gold === g0.gold && g1.food === g0.food && g1.eggs.length === 0 && (await view()).overlays === 1, 'Cancel spends nothing');
  await click('[data-act="hStart"]'); await sleep(200);
  await ev(() => { const b = document.querySelector('[data-act="hbConfirm"]'); b.click(); b.click(); b.click(); }); await sleep(300); await clean(true); g1 = await game(); v = await view();
  ok(g1.gold === g0.gold - 40 && g1.food === g0.food - 25 && g1.eggs.length === 1 && g1.eggs[0].slot === 0 && g1.n === g0.n, 'confirming (even tapped three times) breeds once: exactly 40 gold and 25 food, one egg, both parents kept');
  ok(v.state === 'Incubating' && /1 of 2 in use/.test(v.cap) && /busy/.test(v.slots[0].cls) && /Mystery egg/.test(v.slots[0].text) && /\d+s left/.test(v.slots[0].text) && /Egg laid in Slot 1/.test(v.status) && /Parent 1/.test(v.parents[0]) && /sel/.test(v.slots[1].cls), 'the screen stays open: the egg is in Slot 1 with its time left, a message confirms it, and the next free slot is chosen');
  await shot('05-incubating');
  const b0 = v.slots[0].bar; await sleep(2300); v = await view(); ok(v.slots[0].bar > b0 && v.overlays === 1, 'the progress bar moves with the clock (' + b0 + '% → ' + v.slots[0].bar + '%)');

  /* ---- a second egg, full, and survival across a reload ---- */
  await ev((u) => { A.UI.hSel = [u.kairyu, u.zephyr]; A.UI.hatchery(document.querySelector('#modal-root .overlay')); }, U); await click('[data-act="hStart"]'); await sleep(150); await click('[data-act="hbConfirm"]'); await sleep(300); await clean(true); v = await view(); g1 = await game();
  ok(g1.eggs.length === 2 && v.state === 'Fully occupied' && v.slots.filter((s) => /busy/.test(s.cls)).length === 2 && /Every slot is incubating/.test(v.foot) && /all 2 are in use/.test(v.needs[3]) && v.breedOff, 'a second pair fills the second slot; the Hatchery reads “Fully occupied” and Breed is off until a slot is free');
  await shot('06-full');
  const eggsSaved = g1.eggs; await ev(() => A.UI.closeAll()); await sleep(200);
  const marker = await ev(() => { A.UI.renderObjects(); const m = document.querySelector('#objs .hatch-b'); return m ? { cls: m.getAttribute('class'), text: m.textContent.trim() } : null; });
  ok(marker && /full/.test(marker.cls) && /2 \/ 2 full/.test(marker.text), 'on the island a marker over the Hatchery shows it is full (“' + (marker && marker.text) + '”)'); await shot('07-island-full');
  await start(); await ev(() => { A.Perf.reportSlow = () => {}; A.State.load(); A.UI.showIsland(); }); await sleep(900); await clean(); g1 = await game();
  ok(JSON.stringify(g1.eggs) === JSON.stringify(eggsSaved), 'both eggs survive closing and reopening the game, unchanged');
  await ev(() => { A.State.state.eggs.forEach((e) => { e.readyAt = Date.now() - 1; }); A.State.save(); }); await sleep(1300); await clean();
  const mk2 = await ev(() => { const m = document.querySelector('#objs .hatch-b'), b = document.querySelector('.nav [data-act="hatchery"] .badge'); return { cls: m ? m.getAttribute('class') : '', text: m ? m.textContent.trim() : '', badge: b ? b.textContent : '' }; });
  ok(/ready/.test(mk2.cls) && /Hatch ×2/.test(mk2.text) && mk2.badge === '2', 'when the eggs are ready the island marker turns to “Hatch ×2” by itself and the Hatchery button shows 2'); await shot('08-island-ready');
  const tap = await ev(() => { const m = document.querySelector('#objs .hatch-b rect'), r = m.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.touchscreen.tap(tap.x, tap.y); await sleep(400); v = await view();
  ok(v && v.state === 'Ready to hatch · 2' && v.slots.filter((s) => s.hatch).length === 2 && /2 eggs are ready/.test(v.foot), 'tapping the marker opens the Hatchery, which reads “Ready to hatch” with a Hatch button on both eggs');
  await shot('09-ready');

  /* ---- hatching ---- */
  g0 = await game(); await ev(() => { const b = document.querySelector('.hx-slot[data-slot="0"] [data-act="hHatch"]'); b.click(); b.click(); }); await sleep(250); await clean(true); await sleep(300);
  let fx = await ev(() => { const c = document.querySelector('.hatchfx'); return c ? { h1: c.querySelector('h1').textContent, egg: !!c.querySelector('.hf-egg svg'), infoHidden: c.querySelector('.hf-info').hidden, n: document.querySelectorAll('.hatchfx').length } : null; }); g1 = await game();
  ok(fx && fx.n === 1 && fx.egg && fx.infoHidden && /hatching/.test(fx.h1) && g1.n === g0.n + 1 && g1.eggs.length === 1 && g1.hatched === g0.hatched + 1, 'Hatch (tapped twice) hatches one egg once: one new Amina, one ceremony, the egg on screen first');
  if (SHOTS) { await sleep(900); await page.screenshot({ path: path.join(SHOTS, '10-hatching.png') }); }
  await until(() => document.querySelector('.hatchfx.open'), null, 8000); await sleep(300);
  fx = await ev(() => { const c = document.querySelector('.hatchfx'), t = (s) => c.querySelector(s).textContent.replace(/\s+/g, ' ').trim(), r = c.getBoundingClientRect(); return { h1: t('h1'), name: t('h2'), title: t('.hf-title'), chips: [...c.querySelectorAll('.hf-chips .chip')].map((x) => x.textContent.trim()), stats: [...c.querySelectorAll('.hf-stats .pg-es')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), line: t('.hf-line'), eggHidden: c.querySelector('.hf-egg').hidden, fits: r.top >= 0 && r.bottom <= innerHeight + 1 && c.querySelector('.hf-btns').getBoundingClientRect().bottom <= r.bottom, btns: [...c.querySelectorAll('.hf-btns button')].map((b) => b.textContent.trim()) }; });
  ok(fx.h1 === 'New Amina!' && fx.name === 'Igniflare' && fx.title === 'The Kindled Hatchling' && fx.eggHidden, 'the egg opens to show the new Amina by name and title (Igniflare, The Kindled Hatchling)');
  ok(fx.chips.join('|') === 'Fire|Bruiser|Stage 1 of 3|Lv 1' && fx.stats.join('|').replace(/ /g, '') === 'HP48|ATK13|DEF10|SPD8', 'with its element, role, stage and level, and its four stats (' + fx.stats.join(', ') + ')');
  ok(/New to your collection: 7 of 63/.test(fx.line) && /Recipe: Fire \+ Light/.test(fx.line) && fx.btns.length === 2 && fx.fits, 'it says the Amina is new to the collection (7 of 63) and which recipe was recorded, and fits the screen');
  await shot('11-hatched-new');
  await click('.hatchfx [data-act="close"]'); await sleep(400); await clean(true); v = await view();
  ok(v && v.overlays === 1 && v.state === 'Ready to hatch' && /free/.test(v.slots[0].cls) && v.slots[1].hatch, 'closing it returns to the Hatchery: Slot 1 is free again and the other egg still waits');
  // a second of the same species: hatched again from the same pair
  await ev((u) => { const s = A.State.state; A.Rules.startBreed(s, u.lumifern, u.pyrokai, 0); s.eggs.find((e) => e.slot === 0).readyAt = Date.now() - 1; A.Rules.drain(); A.UI.hatchery(document.querySelector('#modal-root .overlay')); }, U);
  v = await view(); ok(/Igniflare egg/.test(v.slots[0].text), 'an egg from a known pairing is named (Igniflare egg)');
  await click('.hx-slot[data-slot="0"] [data-act="hHatch"]'); await until(() => document.querySelector('.hatchfx.open'), null, 8000);
  fx = await ev(() => { const c = document.querySelector('.hatchfx'); return { h1: c.querySelector('h1').textContent, line: c.querySelector('.hf-line').textContent.replace(/\s+/g, ' ').trim() }; });
  ok(fx.h1 === 'It hatched!' && /You now have 2 Igniflare/.test(fx.line), 'a second Igniflare is announced as “It hatched!” with how many you now have, not as a new discovery');
  await shot('12-hatched-again');
  await click('.hatchfx [data-act="hfDetail"]'); await sleep(500); await clean(true); await sleep(300); const det = await ev(() => { const o = [...document.querySelectorAll('#modal-root .overlay')].find((x) => x._detail); return o ? { sp: o._sp, lv: o.querySelector('.pg-lv b') ? o.querySelector('.pg-lv b').textContent : null } : null; });
  ok(det && det.sp === 'igniflare' && det.lv === '1', 'Details opens the new Amina’s page'); await clean();

  /* ---- recipe book ---- */
  await ev(() => A.UI.hatchery()); await click('[data-act="hBook"]'); await sleep(150);
  const book = await ev(() => { const o = document.querySelector('#modal-root .overlay:last-child'); return { title: o.querySelector('h2').textContent.trim(), rows: [...o.querySelectorAll('.hx-rec')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()) }; });
  ok(/2 \/ 31/.test(book.title) && book.rows.length === 3 && book.rows.some((r) => /Fire.*Light.*Igniflare/.test(r)) && /29 pairings still to discover/.test(book.rows[2]), 'the recipe book lists the two discovered pairings and counts the 29 still hidden, without revealing them'); await shot('13-recipe-book'); await clean();

  /* ---- not enough resources, no room ---- */
  await ev((u) => { const s = A.State.state; s.eggs = []; s.res.gold = 12; s.res.food = 30; A.UI.hSel = [u.kairyu, u.zephyr]; A.UI.hatchery(); }, U); v = await view();
  ok(v.breedOff && /^no:.*\(28 gold short\)/.test(v.needs[4]) && v.needs.slice(0, 4).every((n) => /^ok:/.test(n)), 'when gold is short the cost line says how much (28 gold short) and Breed is off');
  g0 = await game(); await click('[data-act="hStart"]'); await sleep(150); g1 = await game(); v = await view();
  ok(g1.gold === 12 && g1.eggs.length === 0 && v.overlays === 1 && !(await ev(() => !!document.querySelector('.hx-confirm'))), 'pressing it anyway opens nothing and spends nothing'); await shot('14-not-enough');
  await ev((u) => { const s = A.State.state, R = A.Rules; s.res.gold = 900; s.res.food = 500; R.startBreed(s, u.kairyu, u.zephyr, 0); s.eggs[0].readyAt = Date.now() - 1; while (s.aminas.length < A.Data.MAX_INSTANCES) R.addAmina(s, 'kairyu', 1); R.drain(); A.UI.hatchery(document.querySelector('#modal-root .overlay')); }, U);
  g0 = await game(); await click('[data-act="hHatch"]'); await sleep(200); g1 = await game(); v = await view();
  ok(g1.n === g0.n && g1.eggs.length === 1 && /No room for another Amina/.test(v.status) && !(await ev(() => !!document.querySelector('.hatchfx'))), 'with no room for another Amina the egg waits in its slot, and the screen says so'); await clean();

  /* ---- upgrade ---- */
  await ev(() => { const s = A.State.state; s.aminas.length = 6; s.eggs = []; s.res.gold = 2000; A.UI.hatchery(); }); await click('[data-act="hUpgrade"]'); await sleep(200);
  const bp = await ev(() => { const o = document.querySelector('#modal-root .overlay'); return o && o._bid === 'hatchery' ? o.textContent.replace(/\s+/g, ' ') : null; });
  ok(bp && /Breeding slots ?2 ?3/.test(bp.replace(/[^A-Za-z0-9 ]/g, ' ').replace(/ +/g, ' ')) && /1,500/.test(bp), 'Upgrade opens the Hatchery’s building panel with the same figures (slots 2 → 3, 1,500 gold)');
  await ev(() => { const s = A.State.state; A.World.upgrade(s, 'hatchery'); const b = s.buildings.hatchery; b.endAt = Date.now() - 1; A.World.tick(s); A.Rules.drain(); A.UI.closeAll(); A.UI.hatchery(); }); v = await view(); g1 = await game();
  ok(g1.slots === 3 && /Lv 3/.test(v.title) && v.slots.filter((s) => /free/.test(s.cls)).length === 3 && /\+1 slot \(4 in all\)/.test(v.up), 'after the upgrade there is exactly one more slot (3), and the card shows the next step'); await clean();

  /* ---- reduce motion ---- */
  await ev((u) => { const s = A.State.state; s.settings.reduceMotion = true; A.UI.applySettings && A.UI.applySettings(); document.body.classList.add('calm'); s.res.gold = 900; s.res.food = 500; A.Rules.startBreed(s, u.kairyu, u.zephyr, 0); s.eggs[0].readyAt = Date.now() - 1; A.Rules.drain(); A.UI.hatchery(); }, U);
  const anim = await ev(() => getComputedStyle(document.querySelector('.hx-slot.ready .pegg')).animationName); await click('[data-act="hHatch"]'); await sleep(250);
  fx = await ev(() => { const c = document.querySelector('.hatchfx'); return c ? { open: c.classList.contains('open'), h1: c.querySelector('h1').textContent, info: !c.querySelector('.hf-info').hidden } : null; });
  ok(anim === 'none' && fx && fx.open && fx.info && /Amina|hatched/.test(fx.h1), 'with Reduce Motion the ready egg does not rock and hatching shows the Amina at once, with the same information'); await clean();

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-hatchery13b)'); await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
