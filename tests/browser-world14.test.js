// Phase 14 real-browser test (Chromium + Playwright, software WebGL; NOT a phone): island scenery layer and old
// road, arena set dressing and boss grounds, and the Loot Ruins presentation. Run: node tests/browser-world14.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true })).newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message)); const ev = (fn, arg) => page.evaluate(fn, arg);
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D);
  await ev(() => { A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.quality = 'balanced'; s.settings.creatures3d = true;
    ['lumifern', 'emberix', 'aimza'].forEach((sp, i) => R.addAmina(s, sp, 14 - i)); s.missions = { m_hollow: 'claimed' }; Object.keys(s.buildings).forEach((id) => { const b = s.buildings[id]; if (b.state === 'ruined' && id !== 'reliquarygate') { b.state = 'built'; b.level = 1; s.struct[id] = true; } });
    Object.keys(D.DUNGEONS).forEach((id) => { const r = R.dungeonRec(s, id); r.clears = 1; r.next = 0; }); s.rank = 12; R.drain(); A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world.vox', { timeout: 60000 }); await sleep(1500);
  const tidy = () => ev(() => { A.UI.queue.length = 0; A.UI.busy = false; if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); document.querySelectorAll('.dlg,.toast,.reward-wrap,.scene').forEach((x) => x.remove()); if (!document.querySelector('#world')) A.UI.showIsland(); }); await tidy();

  /* ---- island: scenery layer ---- */
  const isl = await ev(() => { const md = A.VoxIsland.mapData('starter'), kinds = {}; md.scenery.forEach((sc) => (kinds[sc.kind] = (kinds[sc.kind] || 0) + 1)); const st = A.VoxIsland.stats(), b = A.VoxIsland.breakdown();
    const occ = new Set(); md.items.forEach((it) => { for (let y = it.y; y < it.y + it.h; y++) for (let x = it.x; x < it.x + it.w; x++) occ.add(x + ',' + y); });
    const cells = new Map(md.cols.map((c) => [c.x + ',' + c.y, c.kind])); const onBuildable = md.scenery.filter((sc) => sc.cx > -900 && ['grass', 'path', 'sand'].includes(cells.get(sc.cx + ',' + sc.cz))).length;
    return { kinds, calls: st.calls, tris: st.triangles, b, onBuildable, n: md.scenery.length }; });
  const NEW = ['columnRuin', 'runeStone', 'stonePillars', 'willow', 'glowcap', 'roots', 'logPile', 'pots'], have = NEW.filter((k) => isl.kinds[k]);
  ok(have.length >= 2 && (isl.kinds.columnRuin || 0) + (isl.kinds.runeStone || 0) >= 3, 'the island gains old stonework as scenery: ' + have.map((k) => k + ' ×' + isl.kinds[k]).join(', '));
  ok(isl.onBuildable === 0, 'none of the scenery stands on ground that can be built on (' + isl.n + ' pieces, all on hills, ledges and loose chunks)');
  ok(isl.kinds.oak > 0 && isl.kinds.pine > 0 && isl.kinds.vines > 0, 'the existing groves, bushes and vines are still there');
  ok(isl.calls <= 90 && isl.tris < 300000, 'island cost with the scenery, the old road and the Hatchery model: ' + isl.calls + ' draw calls, ' + isl.tris.toLocaleString('en-GB') + ' triangles (software rendering; a count, not a frame rate)');
  // placement is unchanged: the same cells accept a Farm as the rules say (the road is drawn, never stored)
  const build = await ev(() => { const s = A.State.state, W = A.World; let n = 0; for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) if (W.canPlace(s, 'starter', 'farm', x, y, 0).ok) n++; return { n, saved: /columnRuin|runeStone|stonePillars|glowcap/.test(JSON.stringify(s)) }; });
  ok(build.n > 0 && !build.saved, 'placement is untouched (' + build.n + ' places a Farm fits) and none of the new scenery is written to the save');
  if (SHOTS) { await ev(() => A.UI.showIsland()); await sleep(1500); await tidy(); await page.screenshot({ path: path.join(SHOTS, 'island.png') }); }

  /* ---- arenas ---- */
  const arena = async (d, from) => { await tidy(); await ev(({ d, from }) => { const s = A.State.state; A.Rules.startRun(s, d, [0, 1, 2].map((i) => s.aminas[i].uid), { from }); A.UI.startBattle(); }, { d, from });
    await page.waitForFunction(() => document.querySelector('.abtn.ready') && A.UI.B.stage && A.UI.B.stage.debug, null, { timeout: 40000 }); await sleep(900); return ev(() => { const x = A.UI.B.stage.debug(), c = A.C3D.stats(); return { dressed: x.atmosphere.dressed, boss: x.atmosphere.boss, calls: c.drawCalls, tris: c.triangles, is3d: !!document.querySelector('.battle.is3d') }; }); };
  const ids = await ev(() => A.Data.DUNGEON_ORDER); const res = {};
  for (const d of [ids[0], ids[4], ids[9]]) { res[d] = [await arena(d, 3), await arena(d, 9)]; }
  const all = Object.values(res);
  ok(all.every(([a, b]) => a.is3d && b.is3d && a.dressed > 60 && b.dressed > a.dressed), 'every arena tested has its middle-distance dressing, and its boss room has more (blocks added: ' + Object.keys(res).map((d) => d + ' ' + res[d][0].dressed + ' / boss ' + res[d][1].dressed).join(', ') + ')');
  ok(all.every(([a, b]) => a.calls <= 48 && b.calls <= 52 && b.tris < 30000), 'battle cost stays low: up to ' + Math.max(...all.map(([a, b]) => Math.max(a.calls, b.calls))) + ' draw calls and ' + Math.max(...all.map(([a, b]) => Math.max(a.tris, b.tris))).toLocaleString('en-GB') + ' triangles');
  // the battle itself is unchanged: a move resolves and the foe takes damage
  const fight = await ev(async () => { const B = A.UI.B, E = () => B.b.enemy; B.b.rng = () => 0.5; B.b.party[B.b.pi].spd = 9999; const hp0 = E().hp; for (let i = 0; i < 100 && !document.querySelector('.abtn.ready.k-atk'); i++) await new Promise((r) => setTimeout(r, 150)); document.querySelector('.abtn.ready.k-atk').click(); for (let i = 0; i < 140 && E().hp === hp0 && !B.over; i++) await new Promise((r) => setTimeout(r, 150)); return { hp0, hp: E().hp, boss: !!E().boss }; });
  ok(fight.boss && fight.hp < fight.hp0, 'a boss battle plays as before in the dressed arena (the boss took ' + (fight.hp0 - fight.hp) + ' damage from one move)');
  await tidy();

  /* ---- Loot Ruins ---- */
  const ru = await ev(async () => { const s = A.State.state, R = A.Rules, D = A.Data, out = {}; A.Rules.rng = (() => { let i = 0; const seq = [0.5, 0.5, 0.9, 0.01, 0.2, 0.5, 0.5]; return () => seq[i++ % seq.length]; })();
    A.UI.ruins(); const t = (q) => { const e = document.querySelector(q); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    out.prog0 = t('.ruin-prog'); const id = D.RUIN_ORDER.find((k) => R.Ruins.status(s, k).ready); out.id = id; out.hidden = t('.ruin[data-ruin="' + id + '"] .ruin-tag.hidden'); out.charmLine = /a charm, now and then/.test(t('.ruin[data-ruin="' + id + '"]'));
    const items0 = s.items.length, g0 = s.res.gold; document.querySelector('[data-act="ruinSearch"][data-id="' + id + '"]').click(); await new Promise((r) => setTimeout(r, 400));
    await new Promise((r) => setTimeout(r, 700)); out.banner = !!document.querySelector('.reward-wrap'); out.res = t('.ruin-res'); out.newDisc = !!document.querySelector('.ruin-res .ruin-find .ruin-new'); out.gotItem = s.items.length - items0; out.itemName = s.items.length ? D.ITEMS[s.items[s.items.length - 1].id].name : null; out.gold = s.res.gold - g0; out.lo = D.RUINS[id].loot.gold;
    out.fits = (() => { const r = document.querySelector('.ruin-res').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1; })(); return out; });
  ok(/Stories found/.test(ru.prog0) && /0 of 3/.test(ru.prog0) && /Something is still hidden here/.test(ru.hidden || '') && ru.charmLine, 'Loot Ruins shows “Stories found 0 of 3”, marks a ruin that still hides something, and says a charm can turn up');
  ok(ru.newDisc && /New discovery/.test(ru.res) && /Added to your Journal/.test(ru.res), 'the first search presents its story as a new discovery');
  ok(ru.gotItem === 1 && ru.res.includes(ru.itemName) && /in your bag/.test(ru.res) && !ru.banner, 'a charm found in the ruin is shown among the finds (' + ru.itemName + '), with where to equip it, instead of a separate banner that covered the sheet title');
  ok(ru.gold >= ru.lo[0] && ru.gold <= ru.lo[1], 'the loot is within the ruin’s unchanged range (' + ru.gold + ' gold, range ' + ru.lo.join(' to ') + ')');
  ok(ru.fits, 'the result fits a phone in landscape');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'ruin-result.png') });
  const ru2 = await ev(async (id) => { document.querySelector('.ruin-res [data-act="close"]').click(); await new Promise((r) => setTimeout(r, 300)); const t = (q) => { const e = document.querySelector(q); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    const g0 = A.State.state.res.gold, r = A.Rules.Ruins.search(A.State.state, id); return { prog: t('.ruin-prog'), found: t('.ruin[data-ruin="' + id + '"] .ruin-tag.found'), row: t('.ruin[data-ruin="' + id + '"]'), again: r.ok, reason: r.reason, gold: A.State.state.res.gold - g0 }; }, ru.id);
  ok(/1 of 3/.test(ru2.prog) && ru2.found && /Searched 1 time/.test(ru2.row) && /again in/.test(ru2.row), 'back on the list: “1 of 3”, the story named on its ruin, “Searched 1 time”, and the rest timer');
  ok(!ru2.again && ru2.reason === 'cooldown' && ru2.gold === 0, 'a second search during the rest is refused and pays nothing (the rule is unchanged)');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'ruins-list.png') });
  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-world14)'); await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
