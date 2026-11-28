// Phase 19C, real-browser check (Chromium + Playwright, software WebGL, 844×390 touch; NOT an iPhone): the Obsidian
// Reach campaign as a player meets it. The Forest Crown opens the Reach; travelling there plays the existing arrival
// lines and then the arrival scene; the gates open in order; the party picker and the dungeon's 3D arena; each of the
// ten guardians telegraphs its charged move with its own warning; the story scenes with their backdrops; the
// confrontation before the Forge Heart; the 2D backdrops when 3D is off; the cap-60 notice; transition times.
// Run: node tests/browser-obsidian19c.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(90000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = async (n) => { if (!SHOTS) return; await sleep(600); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 85 }); };
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 30000, polling: 100 });
  const skipAll = async () => { for (let i = 0; i < 40; i++) { const on = await ev(() => { const b = document.querySelector('#sc-skip') || document.querySelector('.dlg .dlg-skip'); if (b) b.click(); return !!b; }); if (!on) break; await sleep(250); } };
  const tidy = () => ev(() => { A.UI.closeAll(); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  // a save that has just beaten the Forest Crown (in an older build: no Reach record yet), standing on the Verdant Wilds
  await ev(() => { const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; s.settings.batterySaver = false;
    ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => { s.struct[k] = true; if (s.buildings[k]) Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
    ['lumifern', 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 47)); s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'boss' };
    D.CAMPAIGN.starter.dungeons.concat(D.CAMPAIGN.verdant.dungeons).forEach((id) => { s.dungeon[id] = { clears: 1, next: 0, floors: 4 }; }); s.campaign = { bosses: { starter: true, verdant: true } };
    D.QUESTS.forEach((q) => { if (!q.side && !/^m_o/.test(q.id)) s.missions[q.id] = 'claimed'; });
    s.story = { scenes: { v_arrival: 1, v_crown: 1 }, used: {} }; s.o19 = { seen: {}, cap: 50 }; s.currentIsland = 'verdant'; s.rank = 15; s.res.gold = 90000; s.res.food = 9000; s.res.gems = 50;
    A.State.state = s; A.State.sanitize(s); A.State.save(); A.UI.showIsland(true); });
  await until(() => !!document.querySelector('#world')); await sleep(1500);
  let unlockLines = '', prev = null; for (let i = 0; i < 40; i++) { unlockLines = await ev(() => (document.querySelector('.dlg .dlg-text') || {}).textContent || ''); if (unlockLines && unlockLines === prev) break; prev = unlockLines; await sleep(300); }
  await shot('unlock-lines'); await skipAll(); await tidy();
  const open = await ev(() => ({ u: A.World.islandUnlocked(A.State.state, 'obsidian'), cap: A.Rules.levelCap(A.State.state), q: A.Quests.visible(A.State.state).map((q) => q.id) }));
  ok(open.u && open.cap === 50, 'a save that beat the Forest Crown before this build has Obsidian Reach on load, cap 50');
  ok(open.q.indexOf('s_reach') >= 0 && open.q.indexOf('m_o1') >= 0 && open.q.indexOf('s_crown') < 0, 'The Dark Shore and the first Obsidian quest are listed; the Celestial quest is not');

  /* ---------- arrival: the existing lines, then the scene ---------- */
  await ev(() => { window.__toasts = []; const t0 = A.UI.toast; A.UI.toast = function (t) { window.__toasts.push(String(t)); return t0.apply(this, arguments); }; });
  await ev(() => A.UI.travelTo('obsidian')); let hello = '';
  for (let i = 0; i < 30 && !/experience/.test(hello); i++) { await sleep(200); hello += await ev(() => [...document.querySelectorAll('.toast')].map((e) => e.textContent).join('|')); }
  await shot('arrival-lines');
  let sawScene = false, title = '';
  for (let i = 0; i < 60 && !sawScene; i++) { sawScene = await ev(() => !!document.querySelector('.scene')); if (sawScene) title = await ev(() => document.querySelector('.scene').textContent.slice(0, 200)); else { await ev(() => { const b = document.querySelector('.dlg .dlg-skip'); if (b) b.click(); else { const d = document.querySelector('.dlg'); if (d) d.click(); } }); await sleep(300); } }
  ok(/I didn’t think you’d get here so soon/.test(unlockLines), 'the island’s existing unlock lines play (“' + unlockLines.slice(0, 50) + '…”)');
  ok(sawScene && /Warm Stone|Obsidian Reach/.test(title), 'and then the arrival scene, Warm Stone');
  await sleep(500); await shot('arrival-scene'); await skipAll();
  for (let i = 0; i < 25 && !/experience/.test(hello); i++) { await sleep(200); hello += await ev(() => window.__toasts.join('|') + [...document.querySelectorAll('.toast')].map((e) => e.textContent).join('|')); }
  // the first-visit greeting is the existing story beat (unchanged); check that a first visit produces it, word for word
  const greet = await ev(() => { const T = A.Story, st = JSON.parse(JSON.stringify(A.State.state)); st.story.used = {}; const out = T.beats(st, { name: 'traveled', data: { island: 'obsidian', changed: true } }); return out.map((b) => b.text).join('|'); });
  ok(/Warm stone, quiet crystals\. Don’t lick anything\. I say that from experience\./.test(greet + '|' + hello), 'the existing first-visit greeting is kept word for word');
  await sleep(600); await tidy();
  ok(await ev(() => !!(A.State.state.story.scenes && A.State.state.story.scenes.o_arrival) && A.State.state.story.pendingScene !== 'o_arrival'), 'the arrival scene is recorded as seen');

  /* ---------- gates, dungeons screen, party picker, the arena ---------- */
  await ev(() => A.UI.o19Open('o_cinder')); await sleep(400);
  const g1 = await ev(() => ({ enter: !!document.querySelector('[data-act="o19Enter"]'), txt: (document.querySelector('.v18-gate') || {}).textContent || '' }));
  ok(g1.enter && /Recommended level 38/.test(g1.txt), 'Dungeon 1’s gate is open: an Enter button and its recommended level');
  await shot('gate-1'); await tidy();
  await ev(() => A.UI.o19Open('o_kilns')); await sleep(300);
  ok(!(await ev(() => !!document.querySelector('[data-act="o19Enter"]'))), 'Dungeon 2 waits for Dungeon 1 (no Enter button)'); await tidy();
  await ev(() => A.UI.o19Open('o_cinder'));
  // Phase 20C: wait for the sheet's input lock (400 ms, so the tap that opened it cannot press a button) to end, by its marker
  await until(() => { const o = [...document.querySelectorAll('.overlay')].pop(); return !!(o && o.dataset.inputReady && o.querySelector('[data-act="o19Enter"]')); }, null, 5000).catch(() => {});
  await ev(() => document.querySelector('[data-act="o19Enter"]').click()); await sleep(900);
  const dscr = await ev(() => (document.querySelector('.overlay') || {}).textContent || '');
  ok(/Obsidian Reach/.test(dscr) && /The Cinder Steps/.test(dscr) && /0 \/ 10 dungeons/.test(dscr), 'Enter opens the Dungeons screen on Obsidian Reach: ten dungeons, the first ready');
  await shot('dungeons-reach');
  await ev(() => { A.UI.closeAll(); A.UI.acts.enterDungeon({ dataset: { id: 'o_cinder' } }); }); await sleep(700);
  await ev(() => { const b = [...document.querySelectorAll('.overlay button')].find((x) => /Enter the dungeon/.test(x.textContent)); if (b) b.click(); }); await sleep(1200);
  const t0 = Date.now(); await ev(() => { const b = document.querySelector('#enc-go'); if (b) b.click(); });
  await until(() => A.UI.screen === 'battle' && A.UI.B && A.UI.B.b, null, 30000).catch(() => {}); const enterMs = Date.now() - t0;
  await sleep(2500);
  const bt = await ev(() => ({ scr: A.UI.screen, d: A.UI.B && A.UI.B.d, env: A.UI.B && A.UI.B.ctx && A.UI.B.ctx.env, canvas: !!document.querySelector('#battle canvas, .b3d canvas, canvas'), foe: A.UI.B && A.UI.B.b.enemy.sp }));
  ok(bt.scr === 'battle' && bt.d === 'o_cinder' && bt.env === 'o_cinder' && bt.canvas, 'the party picker starts the Cinder Steps in its own arena (3D canvas, environment o_cinder)');
  await shot('battle-cinder');
  await ev(() => A.UI.leaveBattle()); await sleep(800); await tidy();

  /* ---------- the ten guardians: each warns before its charged move ---------- */
  const tells = [];
  for (const id of await ev(() => A.Data.CAMPAIGN.obsidian.dungeons)) {
    await ev((d) => { const s = A.State.state, D = A.Data; D.CAMPAIGN.obsidian.dungeons.forEach((x) => { if (x !== d && !s.dungeon[x]) s.dungeon[x] = { clears: 1, next: 0, floors: 4 }; }); s.dungeon[d] = { clears: 1, next: 0, floors: 4 };
      s.story.scenes.o_confront = 1; A.UI.closeAll(); const r = A.Rules.startRun(s, d, s.aminas.slice(0, 3).map((a) => a.uid), { from: 9 }); A.State.save(); A.UI.nextEncounter(); return r; }, id);
    await sleep(900); await ev(() => { const b = document.querySelector('#enc-go'); if (b) b.click(); });
    await until(() => A.UI.screen === 'battle' && A.UI.B && A.UI.B.b && !A.UI.B.busy, null, 30000).catch(() => {}); await sleep(800);
    await ev(() => { const b = A.UI.B.b; b.enemy.chargeIn = 0; b.enemy.charging = false; b.party.forEach((f) => { f.hpMax = f.hp = 99999; }); });
    await ev(() => { const x = document.querySelector('[data-act="bAbility"]'); if (x) x.click(); });
    let log = ''; for (let i = 0; i < 40; i++) { log = await ev(() => (document.querySelector('#b-log') || {}).textContent || ''); if (/coming!/.test(log)) break; await sleep(150); }
    const want = await ev((d) => A.Data.ABILITIES[A.Data.DUNGEONS[d].battles[9].move].tell, id);
    tells.push({ id, ok: log === want });
    await shot('guardian-' + id);
    await until(() => !A.UI.B || !A.UI.B.busy, null, 15000).catch(() => {});
    await ev(() => A.UI.leaveBattle()); await sleep(600); await tidy();
  }
  ok(tells.every((t) => t.ok), 'each of the ten guardians shows its own warning a turn before its charged move (' + tells.filter((t) => t.ok).length + ' of 10)');

  /* ---------- story scenes and backdrops ---------- */
  const scn = [];
  for (const id of ['o_kilns', 'o_mould', 'o_crystals', 'o_ledger', 'o_confront', 'o_heart']) {
    await ev((i) => { A.UI.closeAll(); A.UI.playScene(i, () => {}, { replay: true }); }, id); await sleep(1400);
    const r = await ev(() => { const sc = document.querySelector('.scene'); return { on: !!sc, bg: !!(sc && sc.querySelector('svg')), title: sc ? sc.textContent.slice(0, 80) : '' }; });
    scn.push(r.on && r.bg); await shot('scene-' + id); await skipAll(); await sleep(400);
  }
  ok(scn.every(Boolean), 'the six Obsidian story scenes play with their own backdrops (' + scn.filter(Boolean).length + ' of 6)');
  ok(await ev(() => A.Data.CAMPAIGN.obsidian.dungeons.every((id) => A.Art.hasEnv(id))), 'every Obsidian dungeon has a 2D backdrop');

  /* ---------- the confrontation plays before the Forge Heart's first entry ---------- */
  await ev(() => { const s = A.State.state; delete s.story.scenes.o_confront; A.UI.closeAll(); A.UI.acts.enterDungeon({ dataset: { id: 'o_forge' } }); }); await sleep(1500);
  const conf = await ev(() => { const sc = document.querySelector('.scene'); return sc ? sc.textContent.slice(0, 120) : ''; });
  ok(/Still Warm|Great Forge/.test(conf), 'entering the Heart of the Forge for the first time plays the confrontation first');
  await skipAll(); await sleep(800); const picker = await ev(() => [...document.querySelectorAll('.overlay button')].some((x) => /Enter the dungeon/.test(x.textContent)));
  ok(picker, 'then the party picker opens'); await tidy();

  /* ---------- 2D: the dungeon backdrop when 3D is off ---------- */
  await ev(() => { const s = A.State.state; s.settings.voxBattle = false; s.settings.battle3d = false; s.settings.batterySaver = true; if (A.Perf.apply) A.Perf.apply(); A.Rules.startRun(s, 'o_gallery', s.aminas.slice(0, 3).map((a) => a.uid), { from: 0 }); A.State.save(); A.UI.nextEncounter(); });
  await sleep(900); await ev(() => { const b = document.querySelector('#enc-go'); if (b) b.click(); }); await until(() => A.UI.screen === 'battle', null, 30000).catch(() => {}); await sleep(1500);
  const flat = await ev(() => ({ scr: A.UI.screen, env: A.UI.B && A.UI.B.ctx && A.UI.B.ctx.env, svg: !!document.querySelector('#battle svg, .b-bg svg, .battle svg') }));
  ok(flat.scr === 'battle' && flat.env === 'o_gallery', 'with Battery Saver on, an Obsidian battle still uses its own environment (' + flat.env + ')');
  await shot('battle-gallery-saver'); await ev(() => A.UI.leaveBattle()); await sleep(600); await tidy();
  await ev(() => { const s = A.State.state; s.settings.batterySaver = false; if (A.Perf.apply) A.Perf.apply(); });

  /* ---------- the Forge Heart's victory: cap 60, announced once ---------- */
  // (the guardian demos above marked every dungeon cleared; put the Forge Heart back to unbeaten, as a real save has it)
  await ev(() => { const s = A.State.state; s.dungeon.o_forge = { clears: 0, next: 0, floors: 0 }; delete s.campaign.bosses.obsidian; s.o19.cap = 50; A.UI.showIsland(); }); await sleep(2600);
  await ev(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
  await ev(() => { const s = A.State.state; s.campaign.bosses.obsidian = true; A.UI.showIsland(); }); await sleep(2600);
  const toast = await ev(() => ({ t: [...document.querySelectorAll('.toast')].map((e) => e.textContent).join('|'), cap: A.Rules.levelCap(A.State.state), rec: A.State.state.o19.cap }));
  if (!/Level cap raised to 60/.test(toast.t)) console.log('  cap toast state ' + JSON.stringify(toast) + ' ' + JSON.stringify(await ev(() => ({ scr: A.UI.screen, modal: A.UI.modalOpen(), sb: !!A.UI.sceneBox, dlg: !!document.querySelector('.dlg'), q: A.UI.queue.length, busy: A.UI.busy }))));
  ok(/Level cap raised to 60/.test(toast.t) && toast.cap === 60 && toast.rec === 60, 'the Forge Heart raises the cap to 60, announced once');
  await shot('cap-60'); await ev(() => { document.querySelectorAll('.toast').forEach((t) => t.remove()); A.UI.showIsland(); }); await sleep(2200);
  ok(!(await ev(() => [...document.querySelectorAll('.toast')].some((e) => /Level cap raised/.test(e.textContent)))), 'and not again');

  console.log('  timing ' + JSON.stringify({ enterBattleMs: enterMs }));
  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\nbrowser-obsidian19c: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
