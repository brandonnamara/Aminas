// Phase 13C real-browser test (Chromium + Playwright, software WebGL; NOT a phone): the Forge's four tabs
// (Crafting, Equipment, Equipment Merge, Equipment Shop), equipment previews, the Gear tab of the details screen,
// and equipment in battle. Run: node tests/browser-gear13c.test.js [shotsDir]
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
  const txt = (sel) => ev((s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
  const game = () => ev(() => { const s = A.State.state, R = A.Rules; return { res: Object.assign({}, s.res), items: s.items.map((i) => i.id).sort(), n: s.items.length, gear: Object.fromEntries(s.aminas.map((a) => [a.uid, Object.fromEntries(Object.entries(a.gear || {}).map(([k, v]) => [k, v != null && R.item(s, v) ? R.item(s, v).id : null]))])), stats: Object.fromEntries(s.aminas.map((a) => [a.uid, R.statsWithGear(s, a)])), fight: Object.fromEntries(s.aminas.map((a) => [a.uid, (({ atk, def, spd, hpMax }) => ({ atk, def, spd, hp: hpMax }))(R.partyFighter(s, a))])), ok: R.Gear.integrity(s).ok, overlays: document.querySelectorAll('#modal-root .overlay').length }; });
  const forge = () => ev(() => { const o = [...document.querySelectorAll('#modal-root .overlay')].find((x) => x._forge); if (!o) return null; const t = (s) => { const e = o.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    return { tab: o.querySelector('.ftab.on').dataset.tab, note: t('.gx-note'), noteCls: (o.querySelector('.gx-note') || {}).className, res: t('.fres'), scroll: o.querySelector('.sh-body').scrollTop, foot: t('.sh-foot'),
      rows: [...o.querySelectorAll('.fpanel > .fitem')].map((r) => ({ id: r.dataset.id || null, iid: r.dataset.iid ? +r.dataset.iid : null, cls: r.className.replace('fitem', '').trim(), name: r.querySelector('.fi-b b').textContent, text: r.textContent.replace(/\s+/g, ' ').trim(), btn: (r.querySelector('.fi-act .btn') || {}).textContent || null, off: r.querySelector('.fi-act .btn') ? r.querySelector('.fi-act .btn').classList.contains('off') : null })) }; });
  await page.goto(srv.url); await until(() => window.A && A.UI && A.UI.showIsland);
  const U = await ev(() => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = false;
    ['hollow', 'tidegate', 'hatchery', 'forge'].forEach((k) => { s.struct[k] = true; s.buildings[k].level = 1; s.buildings[k].state = 'built'; }); s.buildings.forge.level = 2;
    const u = { a: R.addAmina(s, 'lumifern', 11).uid, b: R.addAmina(s, 'pyrokai', 8).uid, c: R.addAmina(s, 'kairyu', 6).uid }; s.res.gold = 400; s.res.food = 30; s.res.gems = 0;
    R.drain(); A.State.save(); A.UI.showIsland(); return u; });
  await sleep(1200); await clean();

  /* ---- Crafting ---- */
  await ev(() => A.UI.forge('craft')); let f = await forge();
  ok(f && f.tab === 'craft' && f.rows.length === 12 && (await ev(() => A.UI.FORGE_TABS.join('|'))) === 'Crafting|Equipment|Equipment Merge|Equipment Shop', 'the Forge opens on Crafting with its four tabs and all 12 recipes');
  const row = (id) => f.rows.find((r) => r.id === id);
  ok(/can/.test(row('driftclub').cls) && row('driftclub').off === false && /Tier I · Common/.test(row('driftclub').text) && /\+6% ATK/.test(row('driftclub').text) && /120/.test(row('driftclub').text), 'a recipe you can afford shows its rarity, bonus and cost, with Craft on');
  ok(/cannot/.test(row('cinderfang').cls) && row('cinderfang').off && /Missing 1 gem\./.test(row('cinderfang').text), 'a recipe you cannot afford says exactly what is missing (“Missing 1 gem.”) and Craft is off');
  ok(/locked/.test(row('basaltmail').cls) && /Forge Lv 3/.test(row('basaltmail').text), 'a recipe above the Forge’s level is locked with the level it needs');
  await shot('01-craft');
  let g0 = await game(); await click('[data-act="fCraft"][data-id="cinderfang"]'); await sleep(150); ok((await game()).overlays === 1 && (await game()).res.gold === g0.res.gold, 'pressing a disabled Craft opens nothing and spends nothing');
  await click('[data-act="fCraft"][data-id="driftclub"]'); await sleep(200); let cf = await txt('.fconfirm');
  ok(cf && /Craft Driftwood Club\?/.test(cf) && /On Lumifern \(Lv 11\) that is ATK \+1/.test(cf) && /gold 120 400 280/.test(cf.replace(/[^A-Za-z0-9 ]/g, ' ').replace(/ +/g, ' ')) && /It goes to your bag \(0 of 150 items\)/.test(cf) && (await game()).res.gold === 400, 'Craft asks first: the item, what it adds to your companion, the cost against what you have (120 of 400, 280 left); nothing is spent yet');
  await shot('02-craft-confirm');
  await ev(() => { const b = document.querySelector('[data-act="fConfirm"]'); b.click(); b.click(); b.click(); }); await sleep(350); let g1 = await game(); f = await forge();
  ok(g1.res.gold === 280 && g1.n === 1 && g1.items[0] === 'driftclub' && g1.overlays === 1, 'confirming (tapped three times) crafts once: 120 gold, one Driftwood Club');
  ok(/Crafted Driftwood Club\. It is in your bag\./.test(f.note) && /good/.test(f.noteCls) && /Owned ×1/.test(f.rows.find((r) => r.id === 'driftclub').text) && !(await ev(() => !!document.querySelector('#toast-root .toast'))), 'the result is reported in the Forge itself (no pop-up), and the recipe now shows “Owned ×1”');
  await shot('03-crafted');

  /* ---- Equipment ---- */
  await click('.gx-note [data-act="fGoEquip"]'); await sleep(200); f = await forge();
  let eq = await ev(() => { const o = document.querySelector('#modal-root .overlay'); return { mons: [...o.querySelectorAll('.fmon')].map((m) => m.textContent.trim()), on: o.querySelector('.fmon.on').dataset.uid, stats: [...o.querySelectorAll('.fstats .stat')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), slots: [...o.querySelectorAll('.fslot')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), filt: [...o.querySelectorAll('.ffilt .fchip')].map((c) => c.textContent.replace(/\s+/g, ' ').trim() + (c.classList.contains('on') ? '*' : '')), hint: o.querySelector('.fhint').textContent }; });
  ok(f.tab === 'equip' && eq.mons.length === 3 && +eq.on === U.a && eq.slots.length === 3 && eq.slots.every((s) => /Empty/.test(s)) && /Weapons 1\*/.test(eq.filt[1]), '“Equip it” opens the Equipment tab on the companion with its three slots (all empty) and the weapons shown');
  ok(/ATK23base/.test(eq.stats[1].replace(/ /g, '')) && /Any item fits any Amina/.test(eq.hint), 'its stats are shown (ATK 23, base), and the screen says any item fits any Amina');
  ok(f.rows.length === 1 && /In the bag/.test(f.rows[0].text) && /ATK \+1/.test(f.rows[0].text) && f.rows[0].btn === 'Equip', 'each item shows where it is and what it would change for this Amina (ATK +1)');
  await shot('04-equipment');
  g0 = await game(); await click('.fpanel [data-act="fEquip"]'); await sleep(200); cf = await txt('.gx-confirm'); g1 = await game();
  ok(cf && /Equip Driftwood Club\?/.test(cf) && /Empty slot/.test(cf) && /From your bag/.test(cf) && /HP 96 → 96 no change/.test(cf) && /ATK 23 → 24 \+1/.test(cf) && /DEF 21 → 21 no change/.test(cf) && /SPD 21 → 21 no change/.test(cf) && JSON.stringify(g1.gear) === JSON.stringify(g0.gear), 'Equip shows HP, ATK, DEF and SPD before and after (ATK 23 → 24) before anything changes');
  await shot('05-equip-preview');
  await click('.gx-confirm [data-act="close"]'); await sleep(100); ok(JSON.stringify((await game()).gear) === JSON.stringify(g0.gear), 'Cancel changes nothing');
  await click('.fpanel [data-act="fEquip"]'); await sleep(150); await ev(() => { const b = document.querySelector('[data-act="gxConfirm"]'); b.click(); b.click(); }); await sleep(300); g1 = await game(); f = await forge();
  ok(g1.gear[U.a].weapon === 'driftclub' && g1.stats[U.a].atk === 24 && g1.fight[U.a].atk === 24 && g1.ok && /Lumifern now wears Driftwood Club: ATK 23 → 24\./.test(f.note), 'confirming equips it: the stats are the previewed ones, the battle fighter has them, and the Forge says so');
  eq = await ev(() => { const o = document.querySelector('#modal-root .overlay'); return { slot: o.querySelector('.fslot[data-slot="weapon"]').textContent.replace(/\s+/g, ' ').trim(), atk: o.querySelector('.fstats .stat[data-stat="atk"]').textContent.replace(/\s+/g, ' ').trim(), pips: o.querySelectorAll('.fmon.on .fpips i.on').length }; });
  ok(/Driftwood Club/.test(eq.slot) && /\+6% ATK/.test(eq.slot) && /24/.test(eq.atk) && /\+1 from gear/.test(eq.atk) && eq.pips === 1 && /Equipped/.test(f.rows[0].text) && f.rows[0].btn === 'Remove', 'the slot, the stat (“+1 from gear”), the Amina’s slot pips and the item row all show it as equipped');
  // moving it to another Amina
  await ev((u) => document.querySelector('.fmon[data-uid="' + u + '"]').click(), U.b); await sleep(150); f = await forge();
  ok(/On Lumifern \(Lv 11\)/.test(f.rows[0].text) && f.rows[0].btn === 'Move here', 'on another Amina the item shows who wears it, with “Move here”');
  await click('.fpanel [data-act="fEquip"]'); await sleep(200); cf = await txt('.gx-confirm');
  ok(/Move Driftwood Club\?/.test(cf) && /From Lumifern/.test(cf) && /Pyrokai · Lv 8/.test(cf) && /Lumifern · Lv 11 gives it up/.test(cf) && /ATK 24 → 23 −1/.test(cf), 'moving it shows both sides: what Pyrokai gains and what Lumifern loses (ATK 24 → 23)');
  await shot('06-move-preview');
  await click('[data-act="gxConfirm"]'); await sleep(300); g1 = await game();
  ok(g1.gear[U.b].weapon === 'driftclub' && !g1.gear[U.a].weapon && g1.stats[U.a].atk === 23 && g1.ok && g1.n === 1, 'after the move one Amina wears it, the other is back to base, and there is still exactly one item');
  await click('.fslot[data-slot="weapon"] [data-act="fUnequip"]'); await sleep(200); cf = await txt('.gx-confirm');
  ok(/Remove Driftwood Club\?/.test(cf) && /goes back to your bag/.test(cf) && /ATK \d+ → \d+ −1/.test(cf), 'Remove also shows the change first, and says the item returns to the bag');
  await click('[data-act="gxConfirm"]'); await sleep(300); g1 = await game(); ok(!g1.gear[U.b].weapon && g1.n === 1 && g1.ok && /back in your bag/.test((await forge()).note), 'after removing, the item is in the bag');

  /* ---- Shop ---- */
  await click('.ftab[data-tab="shop"]'); await sleep(150); f = await forge();
  ok(f.tab === 'shop' && f.rows.length === 13 && f.rows.find((r) => r.id === 'driftclub').off === false && /180/.test(f.rows.find((r) => r.id === 'driftclub').text) && /Owned ×1/.test(f.rows.find((r) => r.id === 'driftclub').text) && /Need 200 more gold\./.test(f.rows.find((r) => r.id === 'ironclub').text) && f.rows.find((r) => r.id === 'ironclub').off && /Forge Lv 3/.test(f.rows.find((r) => r.id === 'tidespear').text), 'the shop lists 13 items with price, rarity and bonus; what you cannot afford says how much more gold is needed; higher stock is locked');
  await shot('07-shop');
  await click('[data-act="fBuy"][data-id="driftclub"]'); await sleep(200); cf = await txt('.fconfirm');
  ok(/Buy Driftwood Club\?/.test(cf) && /gold 180 280 100/.test(cf.replace(/[^A-Za-z0-9 ]/g, ' ').replace(/ +/g, ' ')) && /you already own 1/.test(cf), 'Buy asks first, with the price against your gold and what will be left (180 of 280, 100 left)');
  await shot('08-buy-confirm');
  await ev(() => { const b = document.querySelector('[data-act="fConfirm"]'); b.click(); b.click(); }); await sleep(300); g1 = await game(); f = await forge();
  ok(g1.res.gold === 100 && g1.res.food === 30 && g1.items.join() === 'driftclub,driftclub' && /Bought Driftwood Club for 180 gold/.test(f.note), 'buying takes exactly 180 gold (gold only) and adds one item, once');
  g0 = await game(); await click('[data-act="fBuy"][data-id="cinderfang"]'); await sleep(150); g1 = await game(); ok(g1.res.gold === 100 && g1.n === 2 && g1.overlays === 1, 'with too little gold Buy is off and pressing it changes nothing');

  /* ---- Merge ---- */
  await click('.ftab[data-tab="merge"]'); await sleep(150);
  let mg = await ev(() => { const o = document.querySelector('#modal-root .overlay'); return { ready: [...o.querySelectorAll('.fready')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()), res: o.querySelector('.mres').textContent.replace(/\s+/g, ' ').trim(), rules: o.querySelector('.mrules').textContent }; });
  ok(mg.ready.length === 1 && /Ironbound Club/.test(mg.ready[0]) && /2 × Driftwood Club/.test(mg.ready[0]) && /60/.test(mg.ready[0]) && /no chance involved/.test(mg.rules), 'the Merge tab lists what can be merged now (2 × Driftwood Club → Ironbound Club, 60 gold) and says there is no chance involved');
  await shot('09-merge-ready');
  await click('[data-act="fReady"]'); await sleep(150);
  mg = await ev(() => { const o = document.querySelector('#modal-root .overlay'); return { a: o.querySelector('.mslot[data-k="a"]').textContent.replace(/\s+/g, ' ').trim(), b: o.querySelector('.mslot[data-k="b"]').textContent.replace(/\s+/g, ' ').trim(), res: o.querySelector('.mres').textContent.replace(/\s+/g, ' ').trim(), go: !!o.querySelector('[data-act="fMerge"]') }; });
  ok(/Driftwood Club/.test(mg.a) && /Driftwood Club/.test(mg.b) && /Ironbound Club/.test(mg.res) && /ATK \+6% → \+9%/.test(mg.res) && mg.go, 'choosing it fills both slots and previews the result with the bonus before and after (ATK +6% → +9%)');
  await ev((u) => { const s = A.State.state; A.Rules.equip(s, u, A.UI.forgeState.a); A.Rules.drain(); A.UI.forge(null, document.querySelector('#modal-root .overlay')); }, U.a);
  await click('[data-act="fMerge"]'); await sleep(200); cf = await txt('.fconfirm'); g0 = await game();
  ok(/Merge into Ironbound Club\?/.test(cf) && /Used up: Driftwood Club and Driftwood Club, and 60 gold/.test(cf) && /You get: one Ironbound Club, every time/.test(cf) && /gold 60 100 40/.test(cf.replace(/[^A-Za-z0-9 ]/g, ' ').replace(/ +/g, ' ')) && /Lumifern · Lv 11 wears the result/.test(cf) && /ATK 24 → 25 \+1/.test(cf) && g0.n === 2, 'Merge asks first: what is used up, the one result, the gold left, and the wearer’s stats with the result (ATK 24 → 25)');
  await shot('10-merge-confirm');
  await ev(() => { const b = document.querySelector('[data-act="fConfirm"]'); b.click(); b.click(); }); await sleep(350); g1 = await game(); f = await forge();
  ok(g1.items.join() === 'ironclub' && g1.res.gold === 40 && g1.gear[U.a].weapon === 'ironclub' && g1.stats[U.a].atk === 25 && g1.fight[U.a].atk === 25 && g1.ok && /Merged into Ironbound Club\. Lumifern is wearing it\./.test(f.note), 'merging removes both items, takes 60 gold, and the result is on the same Amina with the previewed stats (once)');
  await shot('11-merged');

  /* ---- details Gear tab ---- */
  await ev((u) => { const s = A.State.state, R = A.Rules; R.grantItem(s, 'driftclub'); R.grantItem(s, 'barkvest'); R.drain(); A.UI.closeAll(); A.UI.detail('lumifern', { uid: u, tab: 'gear' }); }, U.a); await page.waitForSelector('.gx-slot');
  let gt = await ev(() => { const o = document.querySelector('#modal-root .overlay'); return { slots: [...o.querySelectorAll('.gx-slot')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), kv: o.querySelector('[data-panel="gear"] .kv').textContent.replace(/\s+/g, ' ').trim(), tab: o.querySelector('.dtab.on').dataset.tab }; });
  ok(gt.tab === 'gear' && /Ironbound Club/.test(gt.slots[0]) && /Tier II · Uncommon/.test(gt.slots[0]) && /\+9% ATK/.test(gt.slots[0]) && /Empty · 1 to choose from/.test(gt.slots[1]) && /With equipment: ATK 23 → 25/.test(gt.kv) && /Any item fits any Amina/.test(gt.kv), 'the details Gear tab shows each slot’s item with rarity and bonus, what is available, and the stats with equipment (ATK 23 → 25)');
  await click('.gx-slot[data-slot="weapon"] [data-act="gearPick"]'); await sleep(200);
  let pk = await ev(() => [...document.querySelectorAll('#modal-root .overlay:last-child .gx-choice')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
  ok(pk.length === 1 && /Driftwood Club/.test(pk[0]) && /ATK −1/.test(pk[0]) && /In the bag/.test(pk[0]), 'Change lists the other weapons with what each would change compared with the one worn (Driftwood Club: ATK −1)');
  await shot('12-gear-pick');
  await click('.overlay:last-child [data-act="close"]'); await sleep(100); await click('.gx-slot[data-slot="armour"] [data-act="gearPick"]'); await sleep(150); await click('[data-act="equipIt"]'); await sleep(200); cf = await txt('.gx-confirm');
  ok(/Equip Bark Vest\?/.test(cf) && /DEF 21 → 23 \+2/.test(cf), 'choosing one opens the same before-and-after preview (Bark Vest: DEF 21 → 23)');
  await click('[data-act="gxConfirm"]'); await sleep(350);
  gt = await ev(() => { const o = [...document.querySelectorAll('#modal-root .overlay')].find((x) => x._detail); return o ? { n: document.querySelectorAll('#modal-root .overlay').length, tab: o.querySelector('.dtab.on').dataset.tab, uid: o._uid, armour: o.querySelector('.gx-slot[data-slot="armour"]').textContent.replace(/\s+/g, ' ').trim(), note: (o.querySelector('.gx-note') || {}).textContent } : null; }); g1 = await game();
  ok(gt && gt.n === 1 && gt.tab === 'gear' && gt.uid === U.a && /Bark Vest/.test(gt.armour) && /now wears Bark Vest: DEF 21 → 23/.test(gt.note) && g1.gear[U.a].armour === 'barkvest' && g1.stats[U.a].def === 23 && g1.ok, 'after confirming, the details screen is still on the same Amina and tab, shows the vest, and reports the change');
  await shot('13-gear-tab');
  await click('.dtab[data-tab="battle"]'); await sleep(150); const bt = await ev(() => Object.fromEntries([...document.querySelectorAll('.pg-stats .stat')].map((x) => [x.dataset.stat, +x.querySelector('b').textContent])));
  ok(bt.atk === 25 && bt.def === 23 && bt.atk === g1.fight[U.a].atk && bt.def === g1.fight[U.a].def && bt.hp === g1.fight[U.a].hp, 'the Battle tab and the battle fighter agree with the equipment (ATK 25, DEF 23)');

  /* ---- team selection and a real battle use the equipment ---- */
  const team = await ev((u) => { const s = A.State.state, R = A.Rules; A.UI.closeAll(); R.startRun(s, 'forgottenroad', [u]); const b = R.createBattle(s, () => 0.5); const f = b.party[0]; const out = { atk: f.atk, def: f.def, hp: f.hpMax, runHp: s.run.hp[u] }; R.abandonRun(s); return out; }, U.a);
  ok(team.atk === 25 && team.def === 23 && team.hp === g1.stats[U.a].hp && team.runHp === g1.stats[U.a].hp, 'a dungeon run starts with the equipped stats (ATK 25, DEF 23)');
  // locked during a run
  await ev((u) => { const s = A.State.state; s.run = { d: 'forgottenroad', battle: 0, start: 0, uids: [u], hp: {}, gold: 0, food: 0 }; A.UI.forgeState.mon = u; A.UI.forgeState.slot = null; A.UI.forge('equip'); }, U.a); await sleep(150);
  const lk = await ev(() => { const o = document.querySelector('#modal-root .overlay'); return { msg: o.querySelector('.fsel').textContent.replace(/\s+/g, ' '), btns: o.querySelectorAll('.fpanel [data-act="fEquip"], .fpanel [data-act="fUnequip"]').length }; });
  ok(/In a dungeon run: equipment is locked/.test(lk.msg) && lk.btns === 0, 'during a dungeon run the Amina’s equipment is locked, and the screen says so'); await ev(() => { A.State.state.run = null; });

  /* ---- reload ---- */
  await ev(() => { A.State.save(); A.UI.closeAll(); }); const saved = await game(); await page.goto(srv.url); await until(() => window.A && A.UI && A.UI.showIsland); await ev(() => { A.Perf.reportSlow = () => {}; A.State.load(); A.UI.showIsland(); }); await sleep(800); await clean(); g1 = await game();
  ok(JSON.stringify(g1.items) === JSON.stringify(saved.items) && JSON.stringify(g1.gear) === JSON.stringify(saved.gear) && JSON.stringify(g1.stats) === JSON.stringify(saved.stats) && g1.ok, 'after a reload the items, what is worn and the stats are the same');

  /* ---- fits a phone; reduce motion ---- */
  for (const tab of ['craft', 'equip', 'merge', 'shop']) { await ev((t) => { A.UI.closeAll(); A.UI.forge(t); }, tab); await sleep(120); const fit = await ev(() => { const e = document.querySelector('.sheet.forge'), r = e.getBoundingClientRect(), b = e.querySelector('.sh-body'); return r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && b.scrollWidth <= b.clientWidth + 1; }); if (!fit) ok(false, 'the ' + tab + ' tab fits the screen'); }
  ok(true, 'all four tabs fit a phone in landscape with no sideways scrolling');
  await ev(() => { document.body.classList.add('calm'); A.State.state.res.gold = 500; A.UI.closeAll(); A.UI.forge('craft'); }); await click('[data-act="fCraft"][data-id="driftclub"]'); await sleep(100); await click('[data-act="fConfirm"]'); await sleep(250);
  const calm = await ev(() => { const n = document.querySelector('.gx-note'); return { text: n.textContent, anim: getComputedStyle(n).animationName }; });
  ok(/Crafted Driftwood Club/.test(calm.text) && calm.anim === 'none', 'with Reduce Motion the result line appears without animation, with the same message');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-gear13c)'); await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
