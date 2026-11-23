// Phase 18C, real-browser check (Chromium + Playwright, software WebGL, 844×390 touch; NOT an iPhone, and automated:
// no human played these). The arrival scene, the Verdant Dungeons tab and its ten cards, an entrance opening the
// Dungeons screen, the party picker's guardian brief, a Verdant battle starting in its arena, the seven new guardian
// telegraphs, the Twin Shrine scene and gift, the Elder Root confrontation, Glowcap Glade, island switches without
// GPU growth, and no page errors.
// Run: node tests/browser-campaign18c.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = async (n) => { if (!SHOTS) return; await sleep(900); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 85 }); };
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 60000, polling: 60 });
  const tidy = () => ev(async () => { for (let i = 0; i < 30 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 150)); } A.UI.closeAll(); document.querySelectorAll('#toast-root > *').forEach((t) => t.remove()); });
  const skipScene = () => ev(async () => { const b = document.querySelector('.scene #sc-skip'); if (b) b.click(); await new Promise((r) => setTimeout(r, 700)); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['lumifern', 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 30)); s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' }; s.currentIsland = 'starter';
    s.res.gold = 3000; s.res.food = 3000; s.res.gems = 20; A.State.state = s; R.drain(); A.State.save(); A.UI.showIsland(true); });
  await until(() => !!document.querySelector('#world')); await sleep(800); await tidy();

  /* ---------- arrival ---------- */
  await ev(() => A.UI.travelTo('verdant'));
  await until(() => !!document.querySelector('.scene[data-scene="v_arrival"]'), null, 20000).catch(() => {});
  ok(await ev(() => !!document.querySelector('.scene[data-scene="v_arrival"]')), 'travelling to the Verdant Wilds plays the arrival scene');
  await sleep(1500); await shot('scene-arrival');
  await skipScene(); ok(await ev(() => !!(A.State.state.story.scenes && A.State.state.story.scenes.v_arrival) && !A.State.state.story.pendingScene), 'it is recorded once (skipping counts)');
  await tidy(); await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {}); await shot('verdant-palette');

  /* ---------- the Dungeons screen ---------- */
  await ev(() => { A.UI.dIsland = 'verdant'; A.UI.dSel = null; A.UI.dungeons(); }); await sleep(500);
  const dd = await ev(() => ({ tab: !!document.querySelector('[data-act="dIsle"][data-id="verdant"]'), cards: document.querySelectorAll('.overlay .dd').length, first: (document.querySelector('.overlay .dd') || {}).className || '', txt: (document.querySelector('.overlay') || {}).textContent || '' }));
  dd.cards = await ev(() => document.querySelectorAll('.overlay [data-act="dSel"]').length);
  ok(dd.tab && dd.cards === 10, 'the Dungeons screen has a Verdant Wilds tab with ten dungeons (' + dd.cards + ')');
  ok(/Mossgate Steps/.test(dd.txt) && /available|inprogress/.test(dd.first), 'the Mossgate Steps is first and available');
  await shot('dungeons-verdant'); await tidy();

  /* ---------- an entrance on the island opens it ---------- */
  await ev(() => A.UI.v18Open('v_mossgate')); await sleep(600);
  ok(await ev(() => /Open/.test(document.querySelector('.v18-gate').textContent) && !!document.querySelector('[data-act="v18Enter"]')), 'the Mossgate entrance sheet now says Open, with an Enter button');
  await shot('gate-open');
  await ev(() => document.querySelector('[data-act="v18Enter"]').click()); await sleep(700);
  ok(await ev(() => !!document.querySelector('.overlay .dd.d-v_mossgate') && /Mossgate/.test(document.querySelector('.overlay').textContent)), 'Enter opens the Dungeons screen on the Mossgate Steps');
  await tidy();
  await ev(() => A.UI.acts.enterDungeon({ dataset: { id: 'v_mossgate' }, closest: () => null })); await until(() => !!document.querySelector('.pp-boss'), null, 20000).catch(() => {});
  ok(await ev(() => /Moss Bastion/.test((document.querySelector('.pp-boss') || {}).textContent || '') && /Root Crush/.test(document.querySelector('.pp-boss').textContent)), 'the party picker names the guardian and its charged move');
  await shot('picker-mossgate'); await tidy();

  /* ---------- a Verdant battle ---------- */
  await ev(() => { const s = A.State.state, R = A.Rules; R.startRun(s, 'v_mossgate', s.aminas.slice(0, 3).map((a) => a.uid)); A.UI.startBattle(); });
  await until(() => A.UI.B && A.UI.B.b && document.querySelectorAll('#b-actions .abtn').length >= 2 && !A.UI.B.busy, null, 90000);
  const bt = await ev(() => ({ foe: A.UI.B.b.enemy.sp, lv: A.UI.B.b.enemy.lv, hp: A.UI.B.b.enemy.hpMax, tier: JSON.stringify(A.Data.DUNGEONS.v_mossgate.battles[0].tier) }));
  ok(bt.foe === 'terraki' && bt.lv === 19, 'battle 1 is a level 19 Terraki (' + bt.tier + ' tier)');
  await shot('battle-mossgate'); await ev(() => { A.Rules.abandonRun(A.State.state); A.UI.leaveBattle(); }); await sleep(800); await tidy();

  /* ---------- the seven new guardian telegraphs ---------- */
  const NEW = [['v_aqueduct', 'Floodgate'], ['v_spore', 'Spore Bloom'], ['v_archive', 'Archive Seal'], ['v_glow', 'Ember Canopy'], ['v_twinshrine', 'Twin Eclipse'], ['v_moonwell', 'Tidal Hymn'], ['v_elderroot', 'Crown of Thorns']];
  await ev(() => { const s = A.State.state; A.Data.CAMPAIGN.verdant.dungeons.forEach((id) => { s.dungeon[id] = { clears: 1, floors: [true, true, true, true], next: 0 }; }); s.story.scenes = Object.assign(s.story.scenes || {}, { v_confront: 'seen' }); });
  const tells = [];
  for (const [id, name] of NEW) {
    await ev((d) => { const s = A.State.state, R = A.Rules; R.startRun(s, d, s.aminas.slice(0, 3).map((a) => a.uid), { from: 9 }); A.UI.startBattle(); }, id);
    await until(() => A.UI.B && A.UI.B.b && document.querySelectorAll('#b-actions .abtn').length >= 2 && !A.UI.B.busy, null, 90000);
    await ev(() => { const b = A.UI.B.b; b.enemy.chargeIn = 0; b.enemy.charging = false; window.__log = []; const lg = document.querySelector('#b-log'); new MutationObserver(() => window.__log.push(lg.textContent)).observe(lg, { childList: true, subtree: true, characterData: true }); });
    await ev(() => { const g = [...document.querySelectorAll('#b-actions .abtn.ready')].find((b) => /guard/i.test(b.textContent + (b.dataset.id || ''))) || document.querySelector('#b-actions .abtn.ready'); if (g) g.click(); });
    await until(() => !A.UI.B || (!A.UI.B.busy && A.UI.B.b.enemy.charging), null, 30000).catch(() => {});
    const t = await ev(() => (window.__log || []).join(' | ') + ' ' + ((document.querySelector('#b-log') || {}).textContent || ''));
    tells.push(new RegExp(name + ' is coming').test(t));
    if (SHOTS) await shot('tell-' + id);
    await ev(() => { A.Rules.abandonRun(A.State.state); A.UI.leaveBattle(); }); await sleep(700); await tidy();
  }
  ok(tells.every(Boolean), 'each of the seven new moves is telegraphed in the battle log a turn ahead (' + tells.filter(Boolean).length + ' of 7)');

  /* ---------- the Twin Shrine: scene, then the gift ---------- */
  await ev(() => { const s = A.State.state; s.story.pendingScene = 'v_shrine'; A.UI.showIsland(); });
  await until(() => !!document.querySelector('.scene[data-scene="v_shrine"]'), null, 20000).catch(() => {});
  const why = await ev(() => ({ busy: A.UI.busy, q: A.UI.queue.length, pend: A.State.state.story.pendingScene, scr: A.UI.screen, modal: A.UI.modalOpen() }));
  ok(await ev(() => !!document.querySelector('.scene[data-scene="v_shrine"]')), 'the Twin Shrine scene plays' + (why.pend ? ' ' + JSON.stringify(why) : ''));
  await sleep(1200); await shot('scene-shrine'); await skipScene();
  await until(() => !!document.querySelector('.v18-gift [data-act="v18Gift"]'), null, 15000).catch(() => {});
  const gift = await ev(() => (document.querySelector('.v18-gift') || {}).textContent || '');
  ok(/Umbrit II/.test(gift) && /Optional/.test(gift), 'after it, the shrine offers Umbrit II, the other starter’s second form (optional, once)');
  await shot('gift-offer');
  await sleep(500); await ev(() => document.querySelector('[data-act="v18Gift"]').click()); await sleep(900);
  const got = await ev(() => ({ n: A.State.state.aminas.filter((a) => a.sp === 'duskmantle').length, starter: A.State.state.starter, lumi: A.State.state.aminas.some((a) => a.sp === 'lumifern'), rec: A.State.state.v18.gift && A.State.state.v18.gift.kind }));
  ok(got.n === 1 && got.starter === 'lumifern' && got.lumi && got.rec === 'amina', 'accepting adds Duskmantle; the starter stays Lumifern');
  await shot('gift-detail'); await tidy();
  await ev(() => A.UI.v18Open('shrine')); await sleep(500); ok(await ev(() => !document.querySelector('[data-act="v18Gift"]') && /joined you/.test(document.querySelector('.v18-gift').textContent)), 'the shrine then shows the gift as received, with no second claim'); await tidy();

  /* ---------- the Elder Root confrontation ---------- */
  await ev(() => { const s = A.State.state; delete s.story.scenes.v_confront; A.UI.acts.enterDungeon({ dataset: { id: 'v_elderroot' }, closest: () => null }); });
  await until(() => !!document.querySelector('.scene[data-scene="v_confront"]'), null, 20000).catch(() => {});
  ok(await ev(() => !!document.querySelector('.scene[data-scene="v_confront"]')), 'entering the Elder Root the first time plays the confrontation');
  await sleep(1200); await shot('scene-confront'); await skipScene();
  await until(() => !!document.querySelector('.pp-boss'), null, 15000).catch(() => {});
  ok(await ev(() => /Forest Crown/.test((document.querySelector('.pp-boss') || {}).textContent || '')), 'then the party picker for the Forest Crown');
  await tidy();
  await ev(() => A.UI.playScene('v_crown', null, { replay: true })); await sleep(2500); await shot('scene-crown'); await skipScene(); await tidy();

  /* ---------- Explore ---------- */
  await ev(() => { A.UI.exArea = 'glowcap'; A.UI.explore(); }); await sleep(400);
  const ex = await ev(() => ({ lock: /Locked/.test(document.querySelector('.areacard').textContent), btn: !!document.querySelector('[data-act="doExplore"]'), tabs: [...document.querySelectorAll('.explore .tab')].map((t) => t.textContent).join('|') }));
  ok(!ex.lock && ex.btn && /Streamside/.test(ex.tabs) && /Canopy Edge/.test(ex.tabs), 'Glowcap Glade is open to explore; Streamside and Canopy Edge are listed');
  await shot('explore-glowcap'); await tidy();

  /* ---------- island switches: the 18B memory fix holds ---------- */
  await ev(async () => { A.UI.travelTo('starter'); await new Promise((r) => setTimeout(r, 800)); A.UI.travelTo('verdant'); await new Promise((r) => setTimeout(r, 1200)); }); await tidy();
  const g0 = await ev(() => A.VoxIsland.stats().geometries);
  for (let k = 0; k < 5; k++) await ev(async () => { A.UI.travelTo('starter'); await new Promise((r) => setTimeout(r, 600)); A.UI.travelTo('verdant'); await new Promise((r) => setTimeout(r, 600)); });
  await sleep(800); const g1 = await ev(() => A.VoxIsland.stats().geometries);
  ok(g1 === g0, 'five more round trips leave GPU geometries where they were (' + g0 + ' → ' + g1 + ')');

  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\nbrowser-campaign18c: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
