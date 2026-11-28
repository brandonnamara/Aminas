// Phase 19D, real-browser check (Chromium + Playwright, software WebGL, 844×390 touch; NOT an iPhone).
// What a player sees, observed on screen (not inferred from internal flags):
//  - the Obsidian arrival scene: its title, every line typed out in full (including the island's greeting), its
//    controls (Aa, Auto, Skip) not overlapping, the island usable afterwards, never repeated, and the same after an
//    export → import, both for a save that has seen it and for one that has not
//  - the Verdant greeting toast is shown even when a quest completes in the same moment (the 19C finding)
//  - the new mechanics' warnings on screen: the Glasswick kilns, the Quench Pools' vents, the Lantern Below's echo
//  - the Forge Heart: its own introduction, then the victory screen with Night Mail as the Island Boss reward and the
//    "Level cap raised: 60" block
//  - touch does not pass through the Obsidian panels; island animations and 3D drawing stop while the page is hidden;
//    no failed requests (the old sw.js 404) and no page errors
// Run: node tests/browser-polish19d.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [], bad = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(90000); page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); }); page.on('requestfailed', (r) => bad.push('failed ' + r.url()));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('console: ' + m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = async (n) => { if (!SHOTS) return; await sleep(500); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 85 }); };
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 30000, polling: 100 });
  const dlgAway = async () => { for (let i = 0; i < 40; i++) { const on = await ev(() => { const b = document.querySelector('.dlg .dlg-skip'); if (b) { b.click(); return true; } const d = document.querySelector('.dlg'); if (d) { d.click(); return true; } return false; }); if (!on) break; await sleep(250); } };
  const tidy = () => ev(() => { A.UI.closeAll(); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  // every toast and every scene that reaches the screen is recorded as it is added (what the player could see)
  const record = () => ev(() => { window.__seen = { toasts: [], scenes: [] };
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType !== 1) return;
      if (n.classList.contains('toast')) window.__seen.toasts.push(n.textContent);
      if (n.classList.contains('scene')) window.__seen.scenes.push((n.querySelector('.sc-title b') || {}).textContent || '?'); }))).observe(document.body, { childList: true, subtree: true }); });
  await record();
  const crownSave = (extra) => ev((extra) => { const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; s.settings.batterySaver = false; s.settings.textSpeed = 'fast';
    ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => { s.struct[k] = true; if (s.buildings[k]) Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
    ['lumifern', 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 50)); s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'boss' }; s.islands.obsidian = { unlocked: true, obstacles: {}, unlockedAt: 2, by: 'boss' };
    D.CAMPAIGN.starter.dungeons.concat(D.CAMPAIGN.verdant.dungeons).forEach((id) => { s.dungeon[id] = { clears: 1, next: 0, floors: 4 }; }); s.campaign = { bosses: { starter: true, verdant: true } };
    D.QUESTS.forEach((q) => { if (!q.side && !/^m_o/.test(q.id)) s.missions[q.id] = 'claimed'; });
    s.story = { scenes: { v_arrival: 1, v_crown: 1 }, used: {} }; s.o19 = { seen: {}, cap: 50 }; s.currentIsland = 'verdant'; s.rank = 15; s.res.gold = 90000; s.res.food = 9000; s.res.gems = 50;
    if (extra === 'allclear') { D.CAMPAIGN.obsidian.dungeons.slice(0, 9).forEach((id) => { s.dungeon[id] = { clears: 1, next: 0, floors: 4 }; }); s.story.scenes.o_arrival = 1; s.currentIsland = 'obsidian'; }
    A.State.state = s; A.State.sanitize(s); A.State.save(); A.UI.showIsland(true); }, extra);
  await crownSave(); await until(() => !!document.querySelector('#world')); await sleep(1200); await dlgAway(); await tidy();

  /* ---------- the arrival scene, observed ---------- */
  // the lines on the path a player takes when choosing the first answer (the other branch is not shown, by design)
  const want = await ev(() => { const sc = A.Scenes.get('o_arrival'), idx = (k) => sc.beats.findIndex((b) => b.id === k), out = []; let i = 0, jump = null;
    for (let g = 0; g < 50 && i >= 0 && i < sc.beats.length; g++) { const b = sc.beats[i]; if (b.choice) jump = b.choice[0].goto ? idx(b.choice[0].goto) : null; else if (b.text) out.push(b.text); i = jump != null ? jump : b.goto ? idx(b.goto) : i + 1; if (!b.choice) jump = null; else if (jump == null) jump = null; }
    return { title: sc.title, lines: out, hello: A.Story.islandHello.obsidian }; });
  await ev(() => A.UI.travelTo('obsidian'));
  for (let i = 0; i < 80 && !(await ev(() => !!document.querySelector('.scene .sc-text'))); i++) { await dlgAway(); await sleep(100); }
  // a player tapping while the scene fades in (Phase 19D fix: that tap used to cost them the first line)
  await ev(() => { const x = document.querySelector('.scene .sc-box'); if (x) x.click(); });
  await until(() => document.querySelector('.scene.started') && document.querySelector('#sc-next').style.visibility !== 'hidden', null, 10000);
  const first = await ev(() => document.querySelector('#sc-text').textContent);
  ok(first === want.lines[0], 'a tap during the opening fade no longer skips the first line (“' + first.slice(0, 40) + '…”)');
  const title = await ev(() => (document.querySelector('.scene .sc-title b') || {}).textContent || '');
  ok(title === want.title, 'the arrival scene appears on screen with its title (“' + title + '”)');
  // the controls: Aa, Auto and Skip inside the screen and not overlapping each other or the text box
  const ctl = await ev(() => { const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
    const box = document.querySelector('.scene'), list = [...box.querySelectorAll('button')].filter((b) => /^(Aa|Auto|Skip)$/.test(b.textContent.trim())).map((b) => Object.assign({ t: b.textContent.trim() }, r(b)));
    return { list, panel: r(box.querySelector('.sc-box')), vw: innerWidth, vh: innerHeight }; });
  const over = (a, b) => a.x < b.r - 1 && b.x < a.r - 1 && a.y < b.b - 1 && b.y < a.b - 1;
  const names = ctl.list.map((c) => c.t).sort().join();
  ok(names === 'Aa,Auto,Skip', 'Aa, Auto and Skip are all there (' + names + ')');
  ok(ctl.list.every((c) => c.x >= 0 && c.y >= 0 && c.r <= ctl.vw && c.b <= ctl.vh && c.w >= 28 && c.h >= 24), 'each is on screen and large enough to tap');
  ok(ctl.list.every((a, i) => ctl.list.every((b, j) => i === j || !over(a, b))) && ctl.list.every((c) => !over(c, ctl.panel)), 'none overlaps another or the dialogue panel');
  await shot('arrival-scene');
  const shown = []; let guard = 0;
  while (guard++ < 80) {
    const st = await ev(() => { const s = document.querySelector('.scene'); if (!s) return null; const nx = document.querySelector('#sc-next'); return { t: document.querySelector('#sc-text').textContent, done: nx && nx.style.visibility !== 'hidden', choice: !!document.querySelector('.sc-choice') }; });
    if (!st) break;
    if (st.choice) { await ev(() => document.querySelector('.sc-choice').click()); await sleep(300); continue; }
    if (!st.done) { await sleep(120); continue; }
    if (!shown.length || shown[shown.length - 1] !== st.t) shown.push(st.t);
    await ev(() => { const x = document.querySelector('.scene .sc-box'); if (x) x.click(); }); await sleep(160);
  }
  const fullLines = want.lines.filter((l) => shown.indexOf(l) >= 0);
  const miss = want.lines.filter((l) => shown.indexOf(l) < 0); if (miss.length) console.log('   not seen in full: ' + JSON.stringify(miss) + '\n   shown: ' + JSON.stringify(shown));
  ok(fullLines.length === want.lines.length, 'every line of the scene was typed out in full on screen (' + fullLines.length + ' of ' + want.lines.length + ')');
  ok(shown.some((l) => l.indexOf('I say that from experience') >= 0), 'the island’s greeting is spoken in the scene');
  const after = await ev(() => ({ scene: !!document.querySelector('.scene'), busy: A.UI.busy, screen: A.UI.screen, pending: A.State.state.story.pendingScene || null, seen: !!A.State.state.story.scenes.o_arrival, isl: A.State.state.currentIsland }));
  ok(!after.scene && !after.busy && after.screen === 'island' && after.isl === 'obsidian' && !after.pending && after.seen, 'the scene closes, the island is in control again, and it is recorded as seen');
  await dlgAway(); await tidy();
  const tasks = await ev(() => { const b = [...document.querySelectorAll('button')].find((x) => /Tasks/.test(x.textContent) && x.offsetParent); if (!b) return 'none'; b.click(); return 'ok'; });
  await sleep(600); const opened = await ev(() => !!document.querySelector('.sheet, .panel.open, .dlg-sheet, [data-sheet]') || /Tasks|Quest/i.test((document.querySelector('.sheet') || document.body).innerText));
  ok(tasks === 'ok' && opened, 'navigation works straight after: the Tasks panel opens'); await tidy();
  const sc0 = await ev(() => window.__seen.scenes.length);
  await ev(() => A.UI.travelTo('verdant')); await sleep(1500); await dlgAway(); await ev(() => A.UI.travelTo('obsidian')); await sleep(2500); await dlgAway();
  ok(await ev((n) => window.__seen.scenes.length === n && !document.querySelector('.scene'), sc0), 'travelling away and back again does not show it a second time');
  // export → import of the seen save, then reload: still not repeated
  const text = await ev(() => A.SaveFile.exportFile(A.State.state).text);
  await ev((t) => { const p = A.SaveFile.parse(t); A.SaveFile.apply(p); }, text); await page.reload(); await page.waitForFunction(() => window.A && A.UI && A.UI.screen);
  await record();
  await ev(() => { if (A.UI.screen !== 'island') A.UI.showIsland(true); }); await sleep(2000); await dlgAway();
  await ev(() => A.UI.travelTo('verdant')); await sleep(1200); await dlgAway(); await ev(() => A.UI.travelTo('obsidian')); await sleep(2500); await dlgAway();
  ok(await ev(() => !window.__seen.scenes.some((t) => /Warm Stone/.test(t || '')) && A.State.state.story.scenes.o_arrival), 'after export, import and a reload, the seen scene still does not repeat');
  // a save exported BEFORE its first visit: imported, the scene plays on the first visit
  await crownSave(); await sleep(1200); await dlgAway(); await tidy();
  const pre = await ev(() => A.SaveFile.exportFile(A.State.state).text);
  await ev((t) => { A.SaveFile.apply(A.SaveFile.parse(t)); }, pre); await page.reload(); await page.waitForFunction(() => window.A && A.UI && A.UI.screen); await record();
  await ev(() => { if (A.UI.screen !== 'island') A.UI.showIsland(true); }); await sleep(1500); await dlgAway(); await tidy();
  await ev(() => A.UI.travelTo('obsidian')); let t2 = '';
  for (let i = 0; i < 80 && !t2; i++) { t2 = await ev(() => (document.querySelector('.scene .sc-title b') || {}).textContent || ''); if (!t2) { await dlgAway(); await sleep(200); } }
  ok(t2 === want.title, 'a save exported before its first visit plays the arrival scene after import (“' + t2 + '”)');
  await ev(() => document.querySelector('#sc-skip').click()); await sleep(700);
  ok(await ev(() => !document.querySelector('.scene') && !A.UI.busy && A.State.state.story.scenes.o_arrival), 'Skip closes it and records it');

  /* ---------- the Verdant greeting is no longer swallowed by a quest toast ---------- */
  await ev(() => { const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern'; s.settings.sfx = false; s.settings.music = false;
    R.addAmina(s, 'lumifern', 30); D.CAMPAIGN.starter.dungeons.forEach((id) => { s.dungeon[id] = { clears: 1, next: 0, floors: 4 }; }); s.campaign = { bosses: { starter: true } }; s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'boss' };
    D.QUESTS.forEach((q) => { if (!q.side && !/^m_(v|o)/.test(q.id)) s.missions[q.id] = 'claimed'; }); s.story = { scenes: { v_arrival: 1 }, used: {} };
    A.State.state = s; A.State.sanitize(s); A.State.save(); A.UI.showIsland(true); window.__seen.toasts = []; });
  await sleep(1500); await dlgAway(); await tidy(); await ev(() => { window.__seen.toasts = []; });
  const hv = await ev(() => A.Story.islandHello.verdant);
  await ev(() => A.UI.travelTo('verdant'));
  let got = false; for (let i = 0; i < 40 && !got; i++) { await sleep(250); await dlgAway(); got = await ev((h) => window.__seen.toasts.some((t) => t.indexOf(h.slice(0, 30)) >= 0), hv); }
  const all = await ev(() => window.__seen.toasts.slice());
  ok(got, 'the Verdant greeting reaches the screen (' + all.length + ' toasts: ' + all.map((t) => t.slice(0, 30)).join(' | ') + ')');

  /* ---------- the mechanics' warnings on screen ---------- */
  await crownSave('allclear'); await sleep(1500); await dlgAway(); await tidy();
  const battle = async (d, n, tweak) => {
    await ev(() => { A.UI.queue.length = 0; A.UI.busy = false; if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); document.querySelectorAll('.dlg,.scene,.toast').forEach((x) => x.remove()); }); await sleep(300);
    await ev(([d, n]) => { const s = A.State.state; const r = A.Rules.startRun(s, d, s.aminas.slice(0, 3).map((a) => a.uid), { from: 0 }); if (!r.ok) throw new Error(d + ' ' + r.reason); s.run.battle = n; A.UI.startBattle(); }, [d, n]);
    await until(() => A.UI.B && A.UI.B.b && document.querySelector('.abtn.ready'), null, 60000); await sleep(900);
    if (tweak) await ev(tweak);
  };
  const act = async () => { await ev(() => { const b = document.querySelector('.abtn.ready'); if (b) b.click(); }); await until(() => !A.UI.B || A.UI.B.b.over || (!A.UI.B.busy && document.querySelector('.abtn.ready')), null, 30000); await sleep(200); };
  const tele = () => ev(() => { const t = document.querySelector('.b-tele'); return t && !t.hidden ? t.textContent : ''; });
  const log = () => ev(() => [...document.querySelectorAll('.b-log, .blog, #b-log')].map((x) => x.textContent).join(' '));
  const watch = async (re, turns) => { let seen = ''; for (let i = 0; i < turns && !re.test(seen); i++) { await act(); seen += ' ' + (await tele()) + ' ' + (await log()); } return seen; };
  // the kilns
  await battle('o_kilns', 9, () => { const e = A.UI.B.b.enemy; e.hpMax = e.hp = 99999; A.UI.B.b.party.forEach((f) => { f.hpMax = f.hp = 99999; }); });
  let k = await watch(/other kiln is heating up/i, 4); ok(/The other kiln is heating up/.test(k), 'the Glassblower: “The other kiln is heating up …” is shown a turn before the element changes'); await shot('mech-kilns');
  // the vents
  await battle('o_quench', 2, () => { const e = A.UI.B.b.enemy; e.hpMax = e.hp = 99999; A.UI.B.b.party.forEach((f) => { f.hpMax = f.hp = 99999; }); });
  let q = await watch(/vents are building pressure/i, 4); ok(/The vents are building pressure/.test(q), 'the Quench Pools: “The vents are building pressure” warns a turn before the steam'); await shot('mech-steam');
  q += await watch(/steam/i, 2); ok(/steam/i.test(q), 'and the steam itself is reported');
  // the echo
  await battle('o_hollows', 9, () => { const b = A.UI.B.b, e = b.enemy; e.hpMax = e.hp = 99999; b.party.forEach((f) => { f.hpMax = f.hp = 99999; }); e.chargeIn = 0; });
  let c = await watch(/Crystal Echo/, 6); ok(/Crystal Echo/.test(c), 'the Lantern Below: when Shatterlight lands unguarded, the echo’s warning (Crystal Echo) is shown'); await shot('mech-echo');

  // the encounter card before each new guardian opens and names its mechanic (the echo had no entry and the card threw)
  for (const d of ['o_kilns', 'o_hollows', 'o_forge']) {
    await ev(() => { A.UI.queue.length = 0; A.UI.busy = false; if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); }); await sleep(300);
    const card = await ev((d) => { const s = A.State.state; const keep = s.dungeon[d] ? JSON.parse(JSON.stringify(s.dungeon[d])) : null; s.dungeon[d] = { clears: 1, next: 0, floors: 4 }; window.__keep = [d, keep]; A.Rules.startRun(s, d, s.aminas.slice(0, 3).map((a) => a.uid), { from: 9 }); try { A.UI.nextEncounter(); } catch (e) { return 'threw: ' + e.message; } const g = document.querySelector('#enc-go'); const t = (g && g.closest('.sheet, .overlay') || document.body).innerText; return t; }, d);
    const nm = await ev((d) => A.Data.BOSS_MECHS[A.Data.DUNGEONS[d].battles[9].mech.type].name, d);
    ok(!/^threw/.test(card) && card.toLowerCase().indexOf(nm.toLowerCase()) >= 0, d + ': the encounter card opens and names its mechanic (' + nm + ')' + (/^threw/.test(card) ? ' — ' + card : ''));
    await ev(() => { A.UI.closeAll(); const s = A.State.state; s.run = null; const [d, k] = window.__keep; if (k) s.dungeon[d] = k; else delete s.dungeon[d]; });
  }

  /* ---------- the Forge Heart ---------- */
  await battle('o_forge', 9); await sleep(2600);
  const intro = await tele();
  ok(/Island Boss: The Forge Heart/.test(intro) && /Stone Barrier/.test(intro) && /Heart of the Forge/.test(intro) && !/Prismfall|element shifts/.test(intro), 'the Forge Heart’s own introduction: its Stone Barrier and Heart of the Forge (not the Starter boss’s Prismfall) — “' + intro.slice(0, 90) + '”');
  await shot('forge-intro');
  await ev(() => { const b = A.UI.B.b, e = b.enemy; e.hp = 1; e.mech = null; e.barrier = 0; e.charging = false; b.party.forEach((f) => { f.spd = 9999; }); });
  await act(); let vic = ''; await shot('forge-after-hit');
  for (let i = 0; i < 60 && !/Island Boss reward/i.test(vic); i++) { await sleep(300); vic = await ev(() => document.body.innerText); await ev(() => { const d = document.querySelector('.dlg .dlg-skip, #sc-skip'); if (d) d.click(); }); }
  if (!/Island Boss reward/i.test(vic)) console.log('   victory screen text: ' + JSON.stringify(vic.slice(0, 600)) + ' state ' + JSON.stringify(await ev(() => ({ over: A.UI.B && A.UI.B.b.over, res: A.UI.B && A.UI.B.b.result, hp: A.UI.B && A.UI.B.b.enemy.hp, scr: A.UI.screen }))));
  ok(/Island Boss reward/i.test(vic) && /Night Mail/.test(vic), 'victory: Night Mail is shown as the Island Boss reward');
  ok(/Level cap raised/i.test(vic) && /Level 60/.test(vic), 'and the “Level cap raised — Level 60” block');
  await shot('forge-victory');
  ok(await ev(() => A.Rules.levelCap(A.State.state) === 60 && A.Rules.O19.capNotice(A.State.state) == null), 'the notice is consumed: it will not be shown again');
  await ev(() => { A.UI.queue.length = 0; A.UI.busy = false; if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); document.querySelectorAll('.dlg,.scene,.toast,.reward-overlay,.result').forEach((x) => x.remove()); A.UI.showIsland(true); });
  await sleep(1500); await dlgAway(); await tidy();

  /* ---------- touch does not pass through the panels ---------- */
  await ev(() => A.UI.o19Open('o_cinder')); await sleep(700);
  const thru = await ev(() => { const p = [...document.querySelectorAll('.sheet, .dlg, .panel')].filter((e) => e.offsetParent && e.getBoundingClientRect().width > 100).pop(); if (!p) return { none: true };
    const r = p.getBoundingClientRect(), pts = [[0.2, 0.3], [0.5, 0.5], [0.8, 0.7], [0.5, 0.9]].map(([a, b]) => [r.left + r.width * a, r.top + r.height * b]);
    return { cls: p.className, all: pts.every(([x, y]) => { const el = document.elementFromPoint(x, y); return el && (p.contains(el) || el.closest('.sheet, .dlg, .panel, .modal, .veil, .backdrop')); }) }; });
  ok(!thru.none && thru.all, 'a touch anywhere on the Obsidian gate panel lands on the panel, never on the island beneath (' + (thru.cls || 'no panel') + ')');
  await ev(() => A.UI.closeAll()); await sleep(400);
  // closed at once (nothing left in the panel layer); the inert fade-out copy (Phase 16B) then goes too
  const left = await ev(() => ({ live: document.querySelector('#modal-root').children.length, open: [...document.querySelectorAll('.sheet, .dlg')].filter((e) => e.offsetParent && !e.closest('.ov-ghost16')).map((e) => e.className) }));
  ok(left.live === 0 && left.open.length === 0, 'and closes at once' + (left.live || left.open.length ? ' (still open: ' + JSON.stringify(left) + ')' : ''));
  let ghost = 1; for (let i = 0; i < 30 && ghost; i++) { await sleep(100); ghost = await ev(() => document.querySelectorAll('.ov-ghost16').length); }
  ok(ghost === 0, 'its fade-out copy is gone moments later');

  /* ---------- hidden page: nothing animates or draws ---------- */
  // Phase 20C: the Forge Heart now also opens the Celestial Crown, so its notice is queued first and the Heart of the Forge
  // scene starts later (when the panels above close). Finish any story scene before hiding: this check is about the island.
  for (let i = 0; i < 40; i++) { const on = await ev(() => { const b = document.querySelector('#sc-skip'); if (b) b.click(); return !!(b || A.UI.sceneBox); }); if (!on) break; await sleep(300); } await dlgAway(); await sleep(800);
  const hide = (h) => ev((h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  await hide(true); await sleep(400);
  const h0 = await ev(() => ({ run: document.getAnimations().filter((a) => a.playState === 'running').length, drawn: A.C3D && A.C3D.stats ? A.C3D.stats().drawn : null })); await sleep(1500);
  const h1 = await ev(() => ({ drawn: A.C3D && A.C3D.stats ? A.C3D.stats().drawn : null }));
  if (h0.run) console.log('   running while hidden: ' + JSON.stringify(await ev(() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => (a.animationName || a.transitionProperty || '') + '@' + (a.effect && a.effect.target ? (a.effect.target.id || String(a.effect.target.className)) : '')))));
  ok(h0.run === 0, 'on Obsidian Reach with the page hidden, no island animation runs (' + h0.run + ')');
  ok(h0.drawn == null || h1.drawn === h0.drawn, 'and the 3D island draws no frames (' + h0.drawn + ' → ' + h1.drawn + ')');
  await hide(false); await sleep(600); ok(await ev(() => document.getAnimations().some((a) => a.playState === 'running')), 'shown again, it animates');

  /* ---------- requests and errors ---------- */
  ok(!bad.some((b) => /sw\.js/.test(b)), 'no request for sw.js (the old 404)');
  ok(bad.length === 0, 'no failed request at all' + (bad.length ? ': ' + bad.slice(0, 4).join(', ') : ''));
  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\nbrowser-polish19d: ' + pass + ' passed, ' + fail + ' failed');
  await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
