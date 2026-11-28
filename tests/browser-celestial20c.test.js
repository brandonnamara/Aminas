// Phase 20C, real-browser check (Chromium + Playwright, software WebGL, 844×390 touch; NOT an iPhone): the Celestial
// Crown campaign as the game plays it. Arrival, Dungeon 1 from its gate, the ten battle environments (3D arenas and 2D
// backdrops), the nine guardians' warnings, The Two Keys (two-portrait card, Stage II banner, light change, boss-scale
// swap, a Stage II defeat restarting the encounter, the win), Ending A, the completion screen and marks, the grief scene,
// the Watcher's Lens at the mount, the Orrery Wheel turning (and not with Reduce Motion), and a four-island performance
// comparison: draw calls, triangles, graphics memory, heap, island and battle loading, camera moves, the three quality
// tiers, repeated transitions, an extended battle session, the two-stage transition and the 2D fallback.
// Run: node tests/browser-celestial20c.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const PERF_OUT = process.env.PERF_OUT || null;
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); page.on('pageerror', (e) => errors.push(e.message)); const slowLog = []; page.on('console', (m) => { if (/slow frames/.test(m.text())) slowLog.push(m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = async (n) => { if (!SHOTS) return; await sleep(700); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 85 }); };
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 30000, polling: 100 });
  const skipAll = async () => { for (let i = 0; i < 60; i++) { const on = await ev(() => { const b = document.querySelector('#sc-skip') || document.querySelector('.dlg .dlg-skip'); if (b) b.click(); return !!b; }); if (!on) break; await sleep(250); } };
  const tidy = async () => { await skipAll(); await ev(() => { A.UI.closeAll(); document.querySelectorAll('.toast').forEach((t) => t.remove()); }); };
  const go = async () => { await sleep(800); await ev(() => { const b = document.querySelector('#enc-go'); if (b) b.click(); }); await until(() => A.UI.screen === 'battle' && A.UI.B && A.UI.B.b && !A.UI.B.busy, null, 40000).catch(() => {}); await sleep(600); };
  const leave = async () => { await ev(() => { if (A.UI.screen === 'battle') A.UI.leaveBattle(); }); await sleep(700); await tidy(); };
  const press = () => ev(() => { const x = document.querySelector('[data-act="bAbility"]'); if (x) x.click(); return !!x; });
  const startAt = (d, from) => ev((a) => { const s = A.State.state; A.UI.closeAll(); if (a.from && (!s.dungeon[a.d] || (s.dungeon[a.d].next | 0) < a.from) && !A.Rules.dungeonCleared(s, a.d)) s.dungeon[a.d] = Object.assign({ clears: 0, floors: 0 }, s.dungeon[a.d], { next: a.from }); // (a save that has reached that battle)
    const r = A.Rules.startRun(s, a.d, s.aminas.slice(0, 3).map((x) => x.uid), { from: a.from }); A.State.save(); A.UI.nextEncounter(); return r.ok; }, { d, from });
  const markCleared = (upto) => ev((n) => { const s = A.State.state; A.Data.CAMPAIGN.celestial.dungeons.slice(0, n).forEach((x) => { s.dungeon[x] = Object.assign({ next: 0, floors: 4 }, s.dungeon[x], { clears: Math.max(1, (s.dungeon[x] || {}).clears | 0) }); }); A.State.save(); }, upto);

  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => {
    const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate', 'forge'].forEach((k) => { s.struct[k] = true; if (s.buildings[k]) Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
    ['aurelith', 'stormbringer', 'oceanfang'].forEach((sp) => R.addAmina(s, sp, 60));
    ['verdant', 'obsidian'].forEach((k) => { s.islands[k] = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' }; });
    D.CAMPAIGN.starter.dungeons.concat(D.CAMPAIGN.verdant.dungeons, D.CAMPAIGN.obsidian.dungeons).forEach((id) => { s.dungeon[id] = { clears: 1, next: 0, floors: 4 }; });
    s.campaign = s.campaign || {}; s.campaign.bosses = Object.assign({}, s.campaign.bosses, { starter: true, verdant: true, obsidian: true });
    D.QUESTS.forEach((q) => { if (!q.side && !/^m_c/.test(q.id)) s.missions[q.id] = 'claimed'; });
    s.story = s.story || {}; s.story.scenes = Object.assign({}, s.story.scenes, { o_arrival: 1, v_arrival: 1, o_heart: 1 }); s.flags.r1 = s.flags.r2 = s.flags.hollowveil = true; s.rank = 25;
    s.res.gold = 400000; s.res.food = 9000; s.res.gems = 200; s.currentIsland = 'obsidian'; A.State.state = s; A.State.sanitize(s); R.drain(); A.State.save(); A.UI.showIsland(true);
  });
  await until(() => !!document.querySelector('#world')); await sleep(1200); await tidy();
  await until(() => A.VoxIsland.ready(), null, 90000).catch(() => {});

  /* ---------- arrival ---------- */
  ok(await ev(() => A.World.islandUnlocked(A.State.state, 'celestial') && A.State.state.islands.celestial.by === 'boss'), 'the Forge Heart’s save has the Celestial Crown open');
  await ev(() => A.UI.travelTo('celestial')); await sleep(1500);
  await until(() => !!document.querySelector('.scene'), null, 20000).catch(() => {});
  const arr = await ev(() => { const sc = document.querySelector('.scene'); return sc ? sc.textContent : ''; });
  ok(/Above the Clouds|Celestial Crown|skiff/.test(arr), 'travelling there plays the arrival scene'); await shot('arrival');
  await skipAll(); await sleep(800); await tidy(); await until(() => A.VoxIsland.ready(), null, 90000).catch(() => {}); await sleep(1500);

  /* ---------- Dungeon 1 from its gate ---------- */
  await ev(() => A.UI.c20Open('c_cloudstair'));
  await until(() => { const o = [...document.querySelectorAll('.overlay')].pop(); return !!(o && o.dataset.inputReady && o.querySelector('[data-act="c20Enter"]')); }, null, 5000).catch(() => {});
  const g1 = await ev(() => { const o = [...document.querySelectorAll('.overlay')].pop(); return { t: o ? o.textContent : '', enter: !!(o && o.querySelector('[data-act="c20Enter"]')) }; });
  ok(g1.enter && /Recommended level 48/.test(g1.t), 'Cloudstair Landing’s gate offers Enter with its recommended level'); await shot('gate-1-open');
  await ev(() => { const o = [...document.querySelectorAll('.overlay')].pop(); o.querySelector('[data-act="c20Enter"]').click(); }); await sleep(900);
  const dscr = await ev(() => [...document.querySelectorAll('.overlay')].map((o) => o.textContent).join(' '));
  ok(/Celestial Crown/.test(dscr) && /Cloudstair Landing/.test(dscr) && /0 \/ 10 dungeons/.test(dscr), 'Enter opens the Dungeons screen on the Celestial Crown: ten dungeons, the first ready'); await shot('dungeons-crown');
  await tidy();

  /* ---------- ten battle environments, 3D and 2D, with load times ---------- */
  const ids = await ev(() => A.Data.CAMPAIGN.celestial.dungeons), envs = [], loadMs = {};
  await markCleared(9);
  for (const id of ids) {
    const t0 = Date.now(); await startAt(id, 0); await go(); loadMs[id] = Date.now() - t0;
    envs.push(await ev((d) => ({ id: d, scr: A.UI.screen, env: A.UI.B && A.UI.B.ctx && A.UI.B.ctx.env, is3d: !!(A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d), has2d: A.Art.hasEnv(d) }), id));
    await shot('env-' + id); await leave();
  }
  ok(envs.every((e) => e.scr === 'battle' && e.env === e.id && e.is3d), 'each of the ten dungeons fights in its own 3D arena (' + envs.filter((e) => e.is3d && e.env === e.id).length + ' of 10)');
  ok(envs.every((e) => e.has2d), 'and each has its own 2D backdrop for the 2D fallback');
  const arenas = await ev(async () => { const m = await import(new URL('src/3d/arenas.js', document.baseURI).href); const c = m.celestialArenas ? m.celestialArenas() : []; return { n: c.length, distinct: new Set(c.map((a) => JSON.stringify([m.ATMOS[a.id] && m.ATMOS[a.id].light, m.ARENAS[a.id] && m.ARENAS[a.id].fog]))).size }; });
  ok(arenas.n === 10 && arenas.distinct === 10, 'ten distinct arena variants (' + arenas.distinct + ')');

  /* ---------- the nine guardians warn before their charged moves ---------- */
  const tells = [];
  for (const id of ids.slice(0, 9)) {
    await startAt(id, 9); await go();
    await ev(() => { const b = A.UI.B.b; b.enemy.chargeIn = 0; b.enemy.charging = false; b.party.forEach((f) => { f.hpMax = f.hp = 99999; }); });
    await press();
    let log = ''; for (let i = 0; i < 40; i++) { log = await ev(() => (document.querySelector('#b-log') || {}).textContent || ''); if (/coming!/.test(log)) break; await sleep(150); }
    const want = await ev((d) => A.Data.ABILITIES[A.Data.DUNGEONS[d].battles[9].move].tell, id); tells.push(log === want);
    await shot('guardian-' + id); await until(() => !A.UI.B || !A.UI.B.busy, null, 15000).catch(() => {}); await leave();
  }
  ok(tells.every(Boolean), 'each of the nine guardians shows its own warning before its charged move (' + tells.filter(Boolean).length + ' of 9)');

  /* ---------- The Two Keys ---------- */
  await ev(() => { const s = A.State.state; delete s.story.scenes.c_door; A.UI.closeAll(); A.UI.acts.enterDungeon({ dataset: { id: 'c_threshold' } }); }); await sleep(1500);
  const door = await ev(() => { const sc = document.querySelector('.scene'); return sc ? sc.textContent.slice(0, 200) : ''; });
  ok(door.length > 0, 'entering the Threshold for the first time plays the door’s introduction'); await shot('scene-c_door'); await skipAll(); await sleep(800); await tidy();
  await startAt('c_threshold', 9); await sleep(900);
  const card = await ev(() => { const o = [...document.querySelectorAll('.overlay')].pop(); return { duo: !!(o && o.querySelector('.enc-por.duo')), por: o ? o.querySelectorAll('.enc-por.duo > *').length : 0, t: o ? o.textContent : '' }; });
  ok(card.duo && card.por >= 2 && /The Light Key/.test(card.t) && /The Shadow Key/.test(card.t), 'the encounter card shows both Keys, with a line for each stage'); await shot('twokeys-card');
  ok(/starts the encounter again/i.test(card.t) && !/PvP|versus|opponent/i.test(card.t), 'it says a defeat starts the encounter again, with no PvP wording');
  await go();
  const b1 = await ev(() => ({ dots: (document.querySelector('.foedots.stages') || {}).textContent || '', lab: (document.querySelector('.foedots.stages') || { getAttribute: () => '' }).getAttribute('aria-label') || '', keeper: A.UI.B.stage.keeper ? A.UI.B.stage.keeper() : null, name: A.UI.B.b.enemy.name, log: (document.querySelector('#b-log') || {}).textContent || '' }));
  ok(b1.name === 'The Light Key' && b1.keeper === 'light', 'Stage I: the Light Key in the gold Keeper light'); await shot('twokeys-stage1');
  const fd = await ev(() => { const e = document.querySelector('.foedots.stages'); return e ? e.getAttribute('aria-label') : ''; }); if (!fd) console.log('  foedots ' + (await ev(() => { const e = document.querySelector('.foedots'); return e ? e.outerHTML.slice(0, 300) : 'none; ' + ((document.querySelector('#battle') || {}).innerHTML || '').slice(0, 200); }))); ok(/Stage 1 of 2/.test(fd), 'the foe markers read as stages (' + fd + ')');
  // Stage I falls: the Shadow Key steps through
  await ev(() => { const b = A.UI.B.b; b.foes[0].hp = 1; b.foes[0].shield = 0; b.foes[0].mechDone = true; b.party.forEach((f) => { f.hpMax = f.hp = 99999; }); });
  const tT = Date.now(); await press();
  let banner = null; for (let i = 0; i < 60 && !banner; i++) { banner = await ev(() => { const e = document.querySelector('.b-stage'); return e ? e.textContent : null; }); if (!banner) await sleep(100); }
  await shot('twokeys-stage2-banner');
  await until(() => A.UI.B && A.UI.B.b && A.UI.B.b.enemy.stage === 2 && !A.UI.B.busy, null, 20000).catch(() => {}); const transMs = Date.now() - tT;
  const b2 = await ev(() => ({ keeper: A.UI.B.stage.keeper ? A.UI.B.stage.keeper() : null, name: A.UI.B.b.enemy.name, party: A.UI.B.b.party.map((f) => f.hp), log: (document.querySelector('#b-log') || {}).textContent || '', st: A.State.state.run && A.State.state.run.battle }));
  ok(/Stage II of II/.test(banner || '') && /The Shadow Key/.test(banner || ''), 'a banner announces Stage II: the Shadow Key');
  ok(b2.name === 'The Shadow Key' && b2.keeper === 'shadow', 'the arena light turns to the Shadow Keeper’s violet');
  ok(b2.party.every((h) => h > 0) && b2.st === 9, 'the same team carries on, in the same battle');
  await sleep(1200); await shot('twokeys-stage2');
  await press(); let tl = ''; for (let i = 0; i < 40; i++) { tl = await ev(() => (document.querySelector('#b-log') || {}).textContent || ''); if (/Closing Door/.test(tl)) break; await sleep(150); }
  ok(/Closing Door/.test(tl), 'the Shadow Key’s warning is its own (Closing Door)'); await until(() => !A.UI.B || !A.UI.B.busy, null, 15000).catch(() => {});
  // a defeat in Stage II
  await ev(() => { const b = A.UI.B.b; b.party.forEach((f) => { f.hp = 1; f.hpMax = Math.max(f.hpMax, 1); }); b.enemy.atk = 99999; b.enemy.chargeIn = 9; b.enemy.charging = false; });
  for (let i = 0; i < 12 && (await ev(() => A.UI.screen === 'battle' && A.UI.B && A.UI.B.b && !A.UI.B.b.over)); i++) { await press(); await sleep(900); await until(() => !A.UI.B || !A.UI.B.busy, null, 15000).catch(() => {}); }
  await sleep(1500); await shot('twokeys-defeat');
  const df = await ev(() => { const s = A.State.state; return { cleared: A.Rules.dungeonCleared(s, 'c_threshold'), next: (s.dungeon.c_threshold || {}).next | 0, done: A.Rules.C20.complete(s) }; });
  ok(!df.cleared && df.next === 9 && !df.done, 'losing in Stage II records nothing; the Threshold waits at battle 10');
  await leave(); await startAt('c_threshold', 9); await go();
  const rt = await ev(() => ({ stage: A.UI.B.b.enemy.stage, full: A.UI.B.b.foes.every((f) => f.hp === f.hpMax), keeper: A.UI.B.stage.keeper ? A.UI.B.stage.keeper() : null }));
  ok(rt.stage === 1 && rt.full && rt.keeper === 'light', 'the retry starts again at Stage I, both Keys at full health');
  // the win
  await ev(() => { const b = A.UI.B.b; b.foes.forEach((f) => { f.hp = 1; f.shield = 0; f.mechDone = true; f.chargeIn = 9; f.charging = false; }); b.party.forEach((f) => { f.hpMax = f.hp = 99999; f.atk = 99999; }); });
  let won = false, doneBanner = '';
  for (let i = 0; i < 16 && !won; i++) { await press(); await sleep(700); doneBanner = doneBanner || (await ev(() => { const e = document.querySelector('.b-stage.done'); return e ? e.textContent : ''; })); won = await ev(() => !!(A.UI.B && A.UI.B.b && A.UI.B.b.over && A.UI.B.b.result === 'win') || A.UI.screen !== 'battle'); await until(() => !A.UI.B || !A.UI.B.busy, null, 15000).catch(() => {}); }
  await sleep(1200); if (!doneBanner) doneBanner = await ev(() => { const e = document.querySelector('.b-stage.done'); return e ? e.textContent : ''; });
  await shot('twokeys-victory');
  ok(won && /The door is still/.test(doneBanner), 'the win: “The door is still”');
  // through the victory screen, Ending A and the completion screen
  let endTxt = '', completeTxt = '', sawComplete = false; const SHOTS_ENDING = {};
  for (let i = 0; i < 160 && !sawComplete; i++) {
    const st = await ev(() => { const sc = document.querySelector('.scene'), done = document.querySelector('.c20-done'); return { sc: sc ? sc.textContent : '', done: done ? done.textContent : '', scr: A.UI.screen, btn: [...document.querySelectorAll('.overlay button, .result button, .b-end button')].map((b) => b.textContent.trim()).slice(0, 6) }; });
    if (st.done) { completeTxt = st.done; sawComplete = true; break; }
    if (st.sc) { if (!endTxt) await shot('ending-a'); endTxt += ' ' + st.sc; await ev(() => { const ch = [...document.querySelectorAll('#sc-choices button')]; if (ch.length) ch[ch.length - 1].click(); else { const n = document.querySelector('#sc-next') || document.querySelector('.sc-box'); if (n) n.click(); } }); await sleep(500); if (/blame/i.test(st.sc) && !SHOTS_ENDING.b) { SHOTS_ENDING.b = 1; await shot('ending-a-blame'); } continue; }
    await ev(() => { const b = [...document.querySelectorAll('.overlay button, .result button, .b-end button')].find((x) => /Continue|Collect|OK|Done|Back to island|Leave/i.test(x.textContent)); if (b) b.click(); else if (A.UI.screen === 'battle' && A.UI.B && A.UI.B.b && A.UI.B.b.over) A.UI.leaveBattle(); }); await sleep(700);
  }
  ok(/Kind Souls/.test(endTxt) && /key/i.test(endTxt), 'Ending A plays: the Keepers’ Door, the two keys, and the Entity still says “Kind Souls”');
  ok(/both the starters|Lumifern|Umbrit/.test(endTxt), 'both starters take part in the ending');
  ok(sawComplete && /Main story|Keepers’ Door is whole/.test(completeTxt) && /Keeper’s Emblem/.test(completeTxt), 'the completion screen appears once, with the Keeper’s Emblem'); await shot('completion');
  await ev(() => { const b = [...document.querySelectorAll('.overlay button')].find((x) => /Continue/.test(x.textContent)); if (b) b.click(); }); await sleep(900); await tidy();
  const cs = await ev(() => { const s = A.State.state; return { done: A.Rules.C20.complete(s), mastery: A.Rules.C20.masteryEligible(s), celebrate: s.c20.celebrate, emblem: (s.items || []).filter((x) => x.id === 'keeperemblem').length }; });
  ok(cs.done && cs.mastery && !cs.celebrate && cs.emblem === 1, 'campaign complete (Resonance Mastery eligibility recorded, nothing else), the Emblem received once');
  await ev(() => A.UI.showIsland()); await sleep(2200);
  ok(!(await ev(() => !!document.querySelector('.c20-done'))), 'the completion screen does not repeat on the next visit to the island');
  const mk = await ev(() => { A.UI.islandMap(); const a = !!document.querySelector('.overlay .c20-mark'); A.UI.closeAll(); A.UI.journal && A.UI.journal(); const b = !!document.querySelector('.overlay .c20-mark'); return { a, b }; });
  ok(mk.a && mk.b, 'the island map and the Journal show “Main story complete”'); await shot('journal-complete'); await tidy();
  // the Emblem in the bag
  await ev(() => { const b = A.State.state.buildings.forge; if (b) Object.assign(b, { level: Math.max(1, b.level | 0), state: 'built' }); A.UI.forge('equip'); }); await sleep(900);
  const em = await ev(() => { const t = [...document.querySelectorAll('.overlay')].map((o) => o.textContent).join(' '); return /Keeper’s Emblem/.test(t); });
  await shot('emblem-bag'); await tidy();
  ok(em, 'the Keeper’s Emblem is listed with the gear');

  /* ---------- the grief scene, and the Watcher's Lens at the mount ---------- */
  await ev(() => { A.UI.closeAll(); A.UI.playScene('c_mount', () => {}, { replay: true }); }); await sleep(900);
  let grief = false; for (let i = 0; i < 20 && !grief; i++) { grief = await ev(() => /I left that here\. I meant to come back\./.test((document.querySelector('.scene') || {}).textContent || '')); if (grief) { await shot('grief'); break; } await ev(() => { const n = document.querySelector('#sc-next') || document.querySelector('.sc-box'); if (n) n.click(); }); await sleep(700); }
  ok(grief, 'the grief scene at the empty mount shows “I left that here. I meant to come back.”'); await skipAll(); await sleep(500); await tidy();
  await ev(() => { const s = A.State.state; s.story.scenes.c_mount = 'seen'; A.State.save(); }); // (the Lens Gallery's first clear plays it; here its dungeons were marked cleared)
  const lensBtn0 = await ev(() => { A.UI.c20Open('observatory'); const o = [...document.querySelectorAll('.overlay')].pop(); const r = { mount: !!o.querySelector('[data-act="c20Mount"]'), lens: !!o.querySelector('[data-act="c20Lens"]') }; A.UI.closeAll(); return r; });
  ok(lensBtn0.mount && !lensBtn0.lens, 'without the Lens the observatory offers the mount scene only');
  await ev(() => { const s = A.State.state; A.Rules.items(s).push({ iid: 'lens1', id: 'entityeye' }); A.Rules.equip(s, s.aminas[0].uid, 'lens1'); A.State.save(); });
  await ev(() => A.UI.c20Open('observatory'));
  await until(() => { const o = [...document.querySelectorAll('.overlay')].pop(); return !!(o && o.dataset.inputReady && o.querySelector('[data-act="c20Lens"]')); }, null, 5000).catch(() => {});
  await shot('observatory-lens');
  await ev(() => { const o = [...document.querySelectorAll('.overlay')].pop(); const b = o && o.querySelector('[data-act="c20Lens"]'); if (b) b.click(); }); await sleep(1200);
  const lensSc = await ev(() => ({ on: !!document.querySelector('.scene'), t: ((document.querySelector('.scene') || {}).textContent || '').slice(0, 200) }));
  await shot('lens-moment'); await skipAll(); await sleep(500); await tidy();
  const lensAfter = await ev(() => ({ kept: A.Rules.items(A.State.state).some((x) => x.id === 'entityeye'), n: A.State.state.c20.lens }));
  ok(lensSc.on && lensAfter.kept && lensAfter.n === 1, 'with the Lens equipped: the optional moment plays; the Lens is kept');

  /* ---------- the Orrery Wheel turns slowly (and not with Reduce Motion or Battery Saver) ----------
     Measured on fresh pages: the island's long-standing slow-device guard switches every ambient animation off for the
     rest of the session once frames are slow, which software WebGL reaches within seconds of loading. */
  const orrery = async (opt) => { const c2 = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); const p2 = await c2.newPage(); let slowN = 0; p2.on('console', (m) => { if (/slow frames/.test(m.text())) slowN++; }); p2.on('pageerror', (e) => errors.push(e.message));
    await p2.goto(srv.url); await p2.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
    await p2.evaluate((o) => { const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'R', look: null }; s.starter = 'lumifern'; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
      ['verdant', 'obsidian'].forEach((k) => { s.islands[k] = { unlocked: true, obstacles: {}, by: 'boss' }; }); D.CAMPAIGN.obsidian.dungeons.concat(D.CAMPAIGN.celestial.dungeons.slice(0, o.n)).forEach((id) => { s.dungeon[id] = { clears: 1, next: 0 }; });
      s.campaign.bosses = { starter: true, verdant: true, obsidian: true }; s.story.scenes = { c_arrival: 1 }; s.settings.reduceMotion = !!o.calm; s.settings.batterySaver = !!o.saver; s.currentIsland = 'celestial'; A.State.state = s; A.State.sanitize(s); s.currentIsland = 'celestial'; R.drain(); A.State.save(); A.Perf.apply && A.Perf.apply(); A.UI.showIsland(true); }, opt);
    await p2.waitForFunction(() => A.VoxIsland.ready(), null, { timeout: 90000 }).catch(() => {}); await sleep(3500);
    const r = await p2.evaluate(() => ({ sp: A.VoxIsland.spinners(), geos: A.VoxIsland.stats().geometries })); await sleep(1500); const g2 = await p2.evaluate(() => A.VoxIsland.stats().geometries);
    if (opt.shot && SHOTS) { await p2.evaluate(() => { const o = A.Rules.C20.site('orrery'); A.UI.focusFoot(o.x, o.y, o.w, o.h, 1.25); }); await sleep(1500); await p2.screenshot({ path: path.join(SHOTS, 'orrery-' + opt.shot + '.jpg'), type: 'jpeg', quality: 85 }); }
    await c2.close(); return Object.assign(r, { slowN, g2 }); };
  const o1 = await orrery({ n: 3, shot: 'turned' }), o2 = await orrery({ n: 3, calm: true }), o3 = await orrery({ n: 3, saver: true }), o0 = await orrery({ n: 2 });
  ok(o1.sp.length === 1 && o1.sp[0].kind === 'c_orrery_arms' && o1.sp[0].on && o1.sp[0].a > 0 && o1.sp[0].a < 0.18 * 4.5, 'once the Orrery Wheel is cleared its arms turn, slowly (' + (o1.sp[0] ? o1.sp[0].a : '?') + ' rad' + (o1.slowN ? '; then the slow-device guard stopped all ambient motion' : '') + ')');
  ok(o2.sp[0] && o2.sp[0].a === 0, 'with Reduce Motion the wheel stays still');
  ok(o3.sp[0] && o3.sp[0].a === 0, 'with Battery Saver the wheel stays still');
  ok(o0.sp[0] && !o0.sp[0].on && o0.sp[0].a === 0, 'before the Orrery Wheel is cleared it does not turn (“It has not turned in a very long time”)');
  ok(o1.g2 === o1.geos, 'turning creates no geometry (' + o1.geos + ' → ' + o1.g2 + ')');

  /* ---------- four-island performance (software WebGL: relative, not absolute) ---------- */
  const perf = { islands: [], tiers: [], battles: [], transitions: {}, session: {} };
  const measure = (ms) => ev(async (dur) => { const dts = [], t0 = performance.now(); let p = 0; while (performance.now() - t0 < dur) { const n = await new Promise((r) => requestAnimationFrame(r)); if (p) dts.push(n - p); p = n; } dts.sort((a, b) => a - b); return { p50: +dts[dts.length >> 1].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1) }; }, ms);
  for (const iid of ['starter', 'verdant', 'obsidian', 'celestial']) {
    const t0 = Date.now(); await ev((i) => A.UI.travelTo(i), iid); await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {}); const load = Date.now() - t0; await sleep(1500); await tidy();
    const st = await ev(() => { const S1 = A.VoxIsland.stats(), m = A.VoxIsland.gpuMem ? A.VoxIsland.gpuMem() : null; return { calls: S1.calls, tris: S1.triangles, geos: S1.geometries, tex: S1.textures, gpuMB: m ? m.totalMB : null, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; });
    const idle = await measure(2500);
    // camera moves: pan across the island
    const cam = await ev(async () => { const dts = []; let p = 0; for (let k = 0; k < 6; k++) { A.UI.focusFoot(6 + k * 4, 8 + (k % 2) * 14, 2, 2, 0.8); const t0 = performance.now(); while (performance.now() - t0 < 300) { const n = await new Promise((r) => requestAnimationFrame(r)); if (p) dts.push(n - p); p = n; } } dts.sort((a, b) => a - b); return { p50: +dts[dts.length >> 1].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1) }; });
    perf.islands.push(Object.assign({ iid, load }, st, { idle, cam }));
    for (const tier of ['high', 'balanced', 'saver']) {
      await ev((t) => { const s = A.State.state.settings; s.batterySaver = t === 'saver'; s.quality = t === 'saver' ? 'auto' : t; A.Perf.apply && A.Perf.apply(); A.UI.showIsland(); }, tier); await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {}); await sleep(1300); await tidy();
      const s2 = await ev(() => { const S1 = A.VoxIsland.stats(); return { calls: S1.calls, tris: S1.triangles }; }); perf.tiers.push(Object.assign({ iid, tier }, s2, await measure(1500)));
    }
    await ev(() => { const s = A.State.state.settings; s.batterySaver = false; s.quality = 'auto'; A.Perf.apply && A.Perf.apply(); A.UI.showIsland(); }); await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {}); await sleep(800);
  }
  // battle loading, one dungeon per island (boss battle, 3D)
  for (const [iid, d] of [['starter', 'heartwood'], ['verdant', 'v_elderroot'], ['obsidian', 'o_forge'], ['celestial', 'c_threshold']]) {
    const t0 = Date.now(); await startAt(d, 9); await go(); const ms = Date.now() - t0; const c3 = await ev(() => A.C3D.stats()); const fr = await measure(2000);
    perf.battles.push({ iid, d, loadMs: ms, calls: c3 && c3.drawCalls, tris: c3 && c3.triangles, geos: c3 && c3.geometries, tex: c3 && c3.textures, fps: fr, heap: await ev(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null)) }); await leave();
  }
  perf.transitions.twoKeysMs = transMs;
  // repeated island transitions: no growth
  await tidy(); const r0 = await ev(() => ({ g: A.VoxIsland.stats().geometries, t: A.VoxIsland.stats().textures, n: document.getElementsByTagName('*').length }));
  const tt = Date.now(); for (let k = 0; k < 4; k++) for (const iid of ['starter', 'verdant', 'obsidian', 'celestial']) { await ev((i) => A.UI.travelTo(i), iid); await until(() => A.VoxIsland.ready(), null, 60000).catch(() => {}); await sleep(300); }
  perf.transitions.roundMs = Math.round((Date.now() - tt) / 16); await sleep(900); await tidy();
  const r1 = await ev(() => ({ g: A.VoxIsland.stats().geometries, t: A.VoxIsland.stats().textures, n: document.getElementsByTagName('*').length }));
  ok(r1.g <= r0.g && r1.t <= r0.t && Math.abs(r1.n - r0.n) <= 2, 'four full four-island round trips do not grow geometries, textures or page nodes (' + JSON.stringify(r0) + ' → ' + JSON.stringify(r1) + ')');
  // an extended battle session: twelve battles back to back, two of them The Two Keys with a stage transition
  const sess0 = await ev(() => A.C3D.stats());
  for (let k = 0; k < 12; k++) { const d = ids[k % 10]; await startAt(d, k % 2 ? 9 : 0); await go(); if (d === 'c_threshold') { await ev(() => { const b = A.UI.B.b; b.foes[0].hp = 1; b.foes[0].mechDone = true; b.party.forEach((f) => { f.hpMax = f.hp = 99999; }); }); await press(); await until(() => A.UI.B && A.UI.B.b && A.UI.B.b.enemy.stage === 2 && !A.UI.B.busy, null, 20000).catch(() => {}); } else { await press(); await sleep(900); } await leave(); }
  const sess1 = await ev(() => A.C3D.stats());
  perf.session = { before: { geos: sess0 && sess0.geometries, tex: sess0 && sess0.textures, templates: sess0 && sess0.templates }, after: { geos: sess1 && sess1.geometries, tex: sess1 && sess1.textures, templates: sess1 && sess1.templates }, heap: await ev(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null)) };
  ok(sess1 && sess0 && sess1.textures <= sess0.textures + 4 && sess1.geometries <= sess0.geometries + 60, 'an extended session of twelve battles (two with the stage change) does not keep growing (geometries ' + (sess0 && sess0.geometries) + ' → ' + (sess1 && sess1.geometries) + ', textures ' + (sess0 && sess0.textures) + ' → ' + (sess1 && sess1.textures) + ')');
  // the 2D fallback: The Two Keys with 3D off
  await ev(() => { A.State.state.settings.creatures3d = false; }); await startAt('c_threshold', 9); await go();
  const flat = await ev(() => ({ scr: A.UI.screen, is3d: !!(A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d), env: A.UI.B && A.UI.B.ctx && A.UI.B.ctx.env }));
  await ev(() => { const b = A.UI.B.b; b.foes[0].hp = 1; b.foes[0].mechDone = true; b.party.forEach((f) => { f.hpMax = f.hp = 99999; }); }); await press();
  let fb = null; for (let i = 0; i < 60 && !fb; i++) { fb = await ev(() => { const e = document.querySelector('.b-stage'); return e ? e.textContent : null; }); if (!fb) await sleep(100); }
  await until(() => A.UI.B && A.UI.B.b && A.UI.B.b.enemy.stage === 2 && !A.UI.B.busy, null, 20000).catch(() => {}); await shot('twokeys-2d');
  ok(flat.scr === 'battle' && !flat.is3d && flat.env === 'c_threshold' && /Stage II/.test(fb || ''), 'with 3D off, The Two Keys plays on its 2D backdrop and the stage change still shows');
  await leave(); await ev(() => { A.State.state.settings.creatures3d = true; });

  console.log('  perf ' + JSON.stringify(perf));
  if (PERF_OUT) fs.writeFileSync(PERF_OUT, JSON.stringify(perf, null, 1));
  const I = (k) => perf.islands.find((x) => x.iid === k);
  ok(I('celestial').calls <= I('obsidian').calls + 6 && I('celestial').tris <= I('obsidian').tris * 1.25, 'the Celestial Crown draws in no more than Obsidian Reach’s calls and triangles (' + I('celestial').calls + '/' + I('celestial').tris + ' vs ' + I('obsidian').calls + '/' + I('obsidian').tris + ')');
  ok(I('celestial').idle.p95 <= Math.max(...perf.islands.map((x) => x.idle.p95)) + 2 && I('celestial').cam.p95 <= Math.max(...['starter', 'verdant', 'obsidian'].map((k) => I(k).cam.p95)) * 1.25 + 2, 'its idle and camera-move frame times are in line with the other islands');
  const B4 = perf.battles.find((x) => x.iid === 'celestial'), B3 = perf.battles.find((x) => x.iid === 'obsidian');
  ok(B4 && B3 && B4.calls <= B3.calls * 1.3 + 10, 'The Two Keys’ battle draws in line with the Forge Heart’s (' + (B4 && B4.calls) + ' vs ' + (B3 && B3.calls) + ' calls)');
  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\nbrowser-celestial20c: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
