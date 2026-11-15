// Phase 16A, real-browser test (Chromium + Playwright, software WebGL, 844×390 touch viewport; NOT a phone): the new
// opening with the Phase 16A switch on, and the original opening with it off. Run: node tests/browser-onboard16.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(90000);
  page.on('pageerror', (e) => errors.push(e.message)); const ev = (fn, arg) => page.evaluate(fn, arg);
  const shot = (n) => (SHOTS ? page.screenshot({ path: path.join(SHOTS, n + '.png') }) : null);
  const boot = async (q, prep, arg) => { await page.evaluate(() => { if (window.A && A.State) { A.State.save = () => true; } }).catch(() => {}); await page.goto(srv.url + (q || '')); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title'); if (prep) { await ev(prep, arg); } };
  const skipTalk = () => ev(async () => { for (let i = 0; i < 40 && document.querySelector('.dlg'); i++) { const d = document.querySelector('.dlg .dlg-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 120)); } });
  const inView = (sel) => ev((sel) => [...document.querySelectorAll(sel)].every((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }), sel);

  /* ---------------- 1. switch off: the original opening, untouched ---------------- */
  await boot('', () => { localStorage.clear(); });
  ok(await ev(() => A.Onboard16 && !A.Onboard16.enabled()), 'the Phase 16A switch is off by default');
  await page.click('[data-act=newgame]'); await page.waitForSelector('.avc.first');
  ok(!(await page.$('.avc.o16')) && !(await page.$('.o16-aside')), 'switch off: the avatar creator is the original one');
  await page.click('#avc-ok'); await page.waitForSelector('.intro'); ok(!!(await page.$('[data-act=introSkip]')) && !(await page.$('.o16-cine')), 'switch off: the original intro cards play (no cinematic)');
  await page.click('[data-act=introSkip]'); await page.waitForSelector('.dlg'); ok(!(await page.$('.dlg.o16')), 'switch off: the original dialogue panel');
  await skipTalk(); await page.waitForSelector('[data-act=pickStarter]'); ok(!(await page.$('.o16-start')), 'switch off: the original starter selection');
  ok(await ev(() => !('onboard' in A.State.state)), 'switch off: nothing is added to the save');

  /* ---------------- 2. switch on: title, avatar step ---------------- */
  await boot('', () => { localStorage.clear(); });
  await page.click('[data-act=o16Toggle]'); ok(await ev(() => A.Onboard16.enabled() && localStorage.getItem('aminas.onboard16') === '1' && document.querySelector('.o16-chip.on') !== null), 'the title-screen chip turns the switch on and remembers it in this browser');
  await page.click('[data-act=newgame]'); await page.waitForSelector('.avc.o16.first'); await sleep(300); await shot('o16-avatar');
  ok(await ev(() => !!document.querySelector('.avc.o16 .o16-stepn') && /changed later/.test(document.querySelector('.o16-later').textContent)), 'the avatar step shows "1 of 2" and says what can be changed later');
  ok(await inView('.avc.o16 #avc-ok') && await inView('.avc.o16 .o16-later'), 'the whole avatar step fits an iPhone landscape screen (confirm button and note on screen)');
  ok(await ev(() => A.State.state.onboard && A.State.state.onboard.at === 'avatar' && !A.State.state.starter), 'a new game records where it is (avatar)');
  await page.fill('#avc-name', 'Rowan'); await page.click('#avc-ok');
  await page.waitForSelector('.o16-cine');
  ok(await ev(() => A.State.state.avatar.made && A.State.state.avatar.name === 'Rowan'), 'the avatar choice is saved');

  /* ---------------- 3. cinematic: shots, pause while hidden, audio interruption ---------------- */
  ok(await ev(() => document.querySelectorAll('.o16-cine .c-shard').length === 4 && !!document.querySelector('.o16-cine .c-skip')), 'the cinematic has four fragments of other places and a Skip button');
  ok(await ev(() => { const b = document.querySelector('.o16-cine .c-skip').getBoundingClientRect(); return b.width >= 44 && b.height >= 44; }), 'Skip is a comfortable touch target (44 pt or more)');
  await sleep(1200);
  const paused = await ev(async () => { const C = A.UI.o16Cine; Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
    const e0 = C.elapsed(); await new Promise((r) => setTimeout(r, 1500)); const e1 = C.elapsed(), p = C.cine.classList.contains('paused');
    delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); return { e0, e1, p }; });
  ok(paused.p && Math.abs(paused.e1 - paused.e0) < 5, 'the cinematic pauses while the app is hidden (timeline frozen: ' + Math.round(paused.e0) + ' ms → ' + Math.round(paused.e1) + ' ms) and resumes on return');
  await ev(() => { if (A.Audio.suspend) A.Audio.suspend(); }); await sleep(400); await ev(() => { if (A.Audio.resume) A.Audio.resume(); });
  await shot('o16-cine-shards');
  await page.waitForSelector('.dlg.o16', { timeout: 30000 }); await page.waitForFunction(() => !document.querySelector('.o16-cine'), null, { timeout: 5000 }).catch(() => {});
  ok(await ev(() => !document.querySelector('.o16-cine') && A.UI.o16CineOver === 'seen' && A.State.state.onboard.cine === 2), 'the cinematic plays to its end through an audio interruption and hands over to the first conversation');
  ok(await ev(() => A.State.state.phase === 'arrival' && A.State.state.onboard.met), 'the save records that the Entity has been met');

  /* ---------------- 4. the Entity's dialogue ---------------- */
  await sleep(600); await shot('o16-dialogue');
  ok(await inView('.dlg.o16 .dlg-box') && await inView('.dlg.o16 .dlg-skip') && await inView('.dlg.o16 .o16-spd'), 'the dialogue panel, Skip and Speed fit the screen');
  const sp = await ev(async () => { const s = A.State.state, b = document.querySelector('.dlg.o16 .o16-spd'), a = s.settings.textSpeed; b.click(); const c = s.settings.textSpeed; b.click(); b.click(); return [a, c, s.settings.textSpeed, b.textContent.trim()]; });
  ok(sp[0] === 'normal' && sp[1] === 'fast' && sp[2] === 'normal', 'Speed cycles the existing text-speed setting (normal → fast → slow → normal) and saves it');
  const adv = await ev(async () => { const t = () => document.querySelector('.dlg.o16 .dlg-text').textContent; document.querySelector('.dlg.o16 .dlg-box').click(); await new Promise((r) => setTimeout(r, 60)); const a = t(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await new Promise((r) => setTimeout(r, 400)); return [a, t()]; });
  ok(adv[0].length > 0 && adv[1] !== adv[0], 'a tap finishes the line, and Enter (or Space) moves on');
  // walk the whole conversation and collect it
  const lines = await ev(async () => { const out = []; let guard = 0; while (document.querySelector('.dlg.o16') && guard++ < 60) { const d = document.querySelector('.dlg.o16'); if (d.querySelector('.dlg-next').style.visibility !== 'visible') d.querySelector('.dlg-box').click(); await new Promise((r) => setTimeout(r, 30)); out.push([d.querySelector('.dlg-name').textContent, d.querySelector('.dlg-text').textContent]); d.querySelector('.dlg-box').click(); await new Promise((r) => setTimeout(r, 300)); } return out; });
  ok(lines.some((l) => l[0] === 'Rowan' && /Rowan/.test(l[1])) && lines.some((l) => /Kind Souls/.test(l[1])), 'the conversation uses the player’s name for their own line and calls Aminas "Kind Souls"');
  if (!lines.some((l) => l[0] === 'Rowan')) console.log('      lines seen: ' + JSON.stringify(lines).slice(0, 600));
  const words = await ev(() => A.Onboard16.transcript());
  const all = JSON.stringify(words);
  ok(!/third force|the Presence|Emergence/i.test(all), 'the hidden force is never named or explained in the new lines');
  ok(words.arrival.every((l) => l[1].length <= 190), 'every opening line fits one panel (190 characters or fewer)');

  /* ---------------- 5. starter choice ---------------- */
  await page.waitForSelector('.o16-start'); await sleep(400); await shot('o16-starter');
  ok(await ev(() => document.querySelectorAll('.o16-sc').length === 2 && !!document.querySelector('#o16-art-lumifern img, #o16-art-lumifern svg') && !!document.querySelector('#o16-art-umbrit img, #o16-art-umbrit svg')), 'both starters are shown with their own model portraits');
  const facts = await ev(() => ['lumifern', 'umbrit'].map((id) => { const c = document.querySelector('.o16-sc[data-id=' + id + ']'), D = A.Data; return { name: c.querySelector('.o16-nm b').textContent === D.SPECIES[id].name, pers: c.querySelector('.o16-pers').textContent === D.SPECIES[id].pers, moves: [...c.querySelectorAll('.o16-moves li span')].map((x) => x.textContent).join() === D.SPECIES[id].abil.map((m) => D.ABILITIES[m].name).join() }; }));
  ok(facts.every((f) => f.name && f.pers && f.moves), 'names, personalities and moves on the cards are the game’s own data');
  ok(await inView('.o16-sc') && await inView('#o16-go') && await inView('.o16-top'), 'the starter screen fits iPhone landscape');
  ok(await ev(() => document.querySelector('#o16-go').classList.contains('off')), 'nothing can be chosen before a starter is selected');
  await page.click('.o16-sc[data-id=lumifern]'); await sleep(300); await page.click('.o16-sc[data-id=umbrit]'); await sleep(1500); await shot('o16-starter-picked');
  ok(await ev(() => document.querySelector('.o16-sc[data-id=umbrit]').classList.contains('sel') && document.querySelector('.o16-sc[data-id=lumifern]').classList.contains('away') && /Umbrit/.test(document.querySelector('#o16-go').textContent)), 'selecting shows clearly which starter is picked (the other turns away)');
  await page.click('#o16-go'); await page.waitForSelector('#o16-yes');
  ok(await ev(() => /Umbrit/.test(document.querySelector('#o16-yes').textContent) && /Umbrit/.test(document.querySelector('.o16-confirm').textContent)), 'the confirmation names the chosen starter');
  await page.click('[data-act=close]'); await sleep(300); ok(await ev(() => !A.State.state.starter), 'Back cancels: nothing is granted');
  await page.click('#o16-go'); await page.waitForSelector('#o16-yes');
  await ev(() => { const y = document.querySelector('#o16-yes'); y.click(); y.click(); y.click(); });
  await page.waitForSelector('#world'); await sleep(500);
  ok(await ev(() => { const s = A.State.state; return s.starter === 'umbrit' && s.aminas.length === 1 && s.aminas[0].sp === 'umbrit' && !s.owned.lumifern; }), 'one starter, exactly once, even with repeated taps (never both)');
  ok(await ev(() => { const raw = JSON.parse(localStorage.getItem(A.Data.SAVE_KEY)); return raw.starter === 'umbrit' && raw.aminas.length === 1 && raw.onboard.at === 'play'; }), 'the choice is saved at once');
  await skipTalk(); await sleep(400);

  /* ---------------- 6. prologue objective ---------------- */
  const pill = () => ev(() => { const p = document.querySelector('.mission-pill'); return p ? p.innerText.replace(/\s+/g, ' ') : ''; });
  ok(/Prologue · 3 of 12/i.test(await pill()) && /companion/i.test(await pill()), 'the HUD shows the prologue step (3 of 12: look at your companion)');
  await shot('o16-island');
  await page.click('.mission-pill'); await sleep(900);
  ok(await ev(() => !!document.querySelector('.overlay') && !!A.State.state.onboard.seen.inspect), 'Go opens the companion, and looking at it completes the step');
  await ev(() => A.UI.closeAll()); await sleep(800);
  ok(/Make Room for Kind Souls/.test(await pill()) && /Prologue · 4 of 12/i.test(await pill()), 'the next step is the existing first quest, with its own Go and reward');
  ok(await ev(() => A.Onboard16.kind(A.State.state) === 'partial'), 'the player is "partly through" the prologue');

  /* ---------------- 7. interrupted and returning players ---------------- */
  const mk = (o) => ev((o) => { A.State.save = () => true; if (A.State.state) A.State.state.starter = null; localStorage.clear(); localStorage.setItem('aminas.onboard16', '1'); const s = A.State.fresh(); s.phase = o.phase; if (o.rec) { s.onboard = A.Onboard16.fresh(); Object.assign(s.onboard, o.rec); } if (o.made) s.avatar = { made: true, name: 'Ivy', look: null }; if (o.starter) { s.starter = o.starter; A.Rules.addAmina(s, o.starter, o.lv || 1); } if (o.dungeon) s.dungeon.forgottenroad = o.dungeon; localStorage.setItem(A.Data.SAVE_KEY, JSON.stringify(s)); }, o);
  await mk({ phase: 'arrival', rec: { at: 'cine', cine: 1 }, made: true }); await boot('');
  ok(await ev(() => !!document.querySelector('[data-act=o16Resume]')), 'a game interrupted during the cinematic offers Continue on the title screen');
  await page.click('[data-act=o16Resume]'); await page.waitForSelector('.o16-cine'); ok(true, 'Continue replays the (skippable) cinematic');
  await page.click('.o16-cine .c-skip'); await page.waitForSelector('.o16-start');
  ok(await ev(() => A.State.state.onboard.cine === 2 && A.UI.o16CineOver === 'skipped'), 'Skip goes straight to the starter choice and is remembered');
  await mk({ phase: 'arrival', rec: { at: 'starter', cine: 2, met: true }, made: true }); await boot('');
  await page.click('[data-act=o16Resume]'); await page.waitForSelector('.dlg.o16'); await skipTalk(); await page.waitForSelector('.o16-start');
  ok(true, 'a game interrupted at the starter choice resumes there (after one line from the Entity)');
  await mk({ phase: 'intro', rec: { at: 'avatar' } }); await boot('');
  await page.click('[data-act=o16Resume]'); await page.waitForSelector('.avc.o16.first'); ok(true, 'a game interrupted before the avatar was confirmed resumes at the avatar');
  await mk({ phase: 'play', starter: 'lumifern', lv: 9 }); await boot('');
  ok(await ev(() => !!document.querySelector('[data-act=continue]') && !document.querySelector('[data-act=o16Resume]')), 'an existing save shows the normal Continue');
  await page.click('[data-act=continue]'); await page.waitForSelector('#world'); await sleep(1500); await skipTalk();
  ok(await ev(() => !document.querySelector('.o16-cine,.o16-start,.o16p') && A.Onboard16.kind(A.State.state) === 'established'), 'an existing player is never sent through the introduction, character creation or starter choice');
  await ev(() => { const s = A.State.state; s.res.food = 99; A.UI.doFeed(s.aminas[0].uid, 'snack'); A.UI.afterAction(); });
  ok(await ev(() => !('onboard' in A.State.state) && !('onboard' in JSON.parse(localStorage.getItem(A.Data.SAVE_KEY)))), 'an existing save never gains an onboarding record');
  await mk({ phase: 'play', starter: 'umbrit', lv: 5, rec: { at: 'play', cine: 2, met: true }, dungeon: { clears: 0, next: 4, floors: [true] } }); await boot('');
  await page.click('[data-act=continue]'); await page.waitForSelector('#world'); await sleep(1500);
  ok(await ev(() => { const c = A.Onboard16.current(A.State.state); return c && c.id === 'hollow'; }) , 'a partly played first dungeon keeps its place; already-done steps count (next: the first quest)');
  await mk({ phase: 'play', starter: 'umbrit', lv: 8, rec: { at: 'play', cine: 2, met: true }, dungeon: { clears: 1, next: 0 } }); await boot('');
  await page.click('[data-act=continue]'); await page.waitForSelector('#world'); await sleep(1500); await ev(() => A.UI.afterAction());
  ok(await ev(() => A.Onboard16.kind(A.State.state) === 'complete' && !document.querySelector('.o16p')), 'a player who already cleared the first dungeon has the prologue closed for them');

  /* ---------------- 8. first battle: coach, no balance change, 2D fallback ---------------- */
  const battleSetup = (o) => ev(async (o) => { localStorage.setItem('aminas.onboard16', o.on ? '1' : '0'); A.Onboard16.set(o.on); const s = A.State.newGame(), R = A.Rules; if (o.on) A.Onboard16.begin(s); s.avatar.made = true; s.phase = 'play'; s.starter = 'lumifern'; R.addAmina(s, 'lumifern', 3); R.addAmina(s, 'acinus', 2); if (s.onboard) { s.onboard.at = 'play'; s.onboard.cine = 2; s.onboard.met = true; }
    s.struct.hollow = true; if (s.buildings.hollow) { s.buildings.hollow.level = 1; s.buildings.hollow.state = 'built'; } s.settings.creatures3d = o.c3d; s.settings.sfx = false; s.settings.reduceMotion = !!o.calm; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; R.drain(); A.State.save(); A.UI.showIsland(true);
    await new Promise((r) => setTimeout(r, 600)); A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('.dlg,.toast').forEach((x) => x.remove());
    R.startRun(s, 'forgottenroad', s.aminas.map((a) => a.uid)); const b = R.createBattle(s, () => 0.5); const enc = R.encounter(s), d = A.Data.DUNGEONS.forgottenroad;
    A.UI.startBattle({ kind: 'dungeon', b, d: 'forgottenroad', env: enc.spec.env || d.env, enc, label: 'Forgotten Road', finish: () => {} });
    for (let i = 0; i < 200 && (!A.UI.B || A.UI.B.busy); i++) await new Promise((r) => setTimeout(r, 100)); }, o);
  const play = () => ev(async () => { const log = []; for (let t = 0; t < 60; t++) { const U = A.UI.B; if (!U || U.b.over) break; if (U.b.pending && !U.busy) { const pm = document.querySelector('#b-party .pm.tapme'); if (pm) pm.click(); await new Promise((r) => setTimeout(r, 600)); continue; } const btn = document.querySelector('#b-actions .abtn.ready'); if (!btn) { await new Promise((r) => setTimeout(r, 100)); continue; } await new Promise((r) => setTimeout(r, 700)); if (!btn.isConnected) continue; btn.click(); log.push(btn.dataset.id); for (let i = 0; i < 300 && A.UI.B && A.UI.B.busy; i++) await new Promise((r) => setTimeout(r, 50)); }
    const b = A.UI.B && A.UI.B.b; return { log, hp: b ? [b.enemy.hp].concat(b.party.map((f) => f.hp)) : null, result: b && b.result, turn: b && b.turn }; });
  await battleSetup({ on: true, c3d: true }); await sleep(600);
  ok(await ev(() => { const c = document.querySelector('.o16-coach'); return c && !c.hidden && /Tap an attack/.test(c.textContent); }), 'first battle, first turn: one short callout ("Your move. Tap an attack.")');
  await shot('o16-coach-moves');
  ok(await ev(() => { const c = document.querySelector('.o16-coach').getBoundingClientRect(); return [...document.querySelectorAll('#b-actions .abtn')].every((b) => { const r = b.getBoundingClientRect(); return r.right <= c.left || r.left >= c.right || r.bottom <= c.top || r.top >= c.bottom; }); }), 'the callout never covers a move button');
  await ev(() => document.querySelector('#b-actions .abtn.ready').click()); await sleep(300);
  ok(await ev(() => document.querySelector('.o16-coach').hidden), 'the callout goes away as soon as the player acts');
  const on3 = await play();
  const tips = await ev(() => Object.keys(A.State.state.onboard.tips));
  ok(tips.indexOf('moves') >= 0 && tips.indexOf('health') >= 0 && tips.indexOf('turn') >= 0, 'later turns teach health and the turn indicator, one at a time (' + tips.join(', ') + ')');
  await battleSetup({ on: false, c3d: true }); const off3 = await play();
  await battleSetup({ on: true, c3d: true }); await ev(() => document.querySelector('#b-actions .abtn.ready').click()); await sleep(200); const on3b = await play();
  ok(JSON.stringify(off3.hp) === JSON.stringify(on3b.hp) && off3.result === on3b.result && off3.turn === on3b.turn, 'the same battle ends identically with the switch on and off (health ' + JSON.stringify(off3.hp) + ', ' + off3.result + ' on turn ' + off3.turn + ')');
  await battleSetup({ on: true, c3d: false }); await sleep(600);
  ok(await ev(() => !A.UI.B.stage.is3d && !!document.querySelector('.o16-coach:not([hidden])')), '2D battle fallback: the coach works the same way');
  await shot('o16-coach-2d');
  const r2d = await play(); ok(r2d.result === 'win', '2D fallback: the first battle is played to a win');

  /* ---------------- 9. dungeon introduction, first win, handoff ---------------- */
  await battleSetup({ on: true, c3d: false }); await ev(() => { A.UI.leaveBattle(() => {}); A.Rules.abandonRun(A.State.state); });
  await ev(() => { const s = A.State.state; s.onboard.tips = {}; s.missions = { m_hollow: 'claimed', m_feed: 'claimed', m_lv3: 'claimed', m_find: 'claimed' }; A.UI.showIsland(true); }); await sleep(900); await skipTalk();
  ok(/Open the Battle menu/.test(await pill()), 'after the four quests the prologue asks for the Battle menu');
  await ev(() => { A.UI.closeAll(); A.UI.acts.battle(); }); await sleep(600);
  ok(await ev(() => !!A.State.state.onboard.seen.battle), 'opening the Battle menu completes that step');
  await ev(() => { A.UI.closeAll(); A.UI.dungeons(null, 'forgottenroad'); }); await page.waitForSelector('.dlg.o16'); await sleep(300); await shot('o16-dungeon-intro');
  const dl = await ev(async () => { const out = []; for (let g = 0; g < 20 && document.querySelector('.dlg.o16'); g++) { const d = document.querySelector('.dlg.o16'); if (d.querySelector('.dlg-next').style.visibility !== 'visible') d.querySelector('.dlg-box').click(); await new Promise((r) => setTimeout(r, 30)); out.push(d.querySelector('.dlg-text').textContent); d.querySelector('.dlg-box').click(); await new Promise((r) => setTimeout(r, 300)); } return out; });
  ok(dl.some((t) => /Ten on this island, ten battles/.test(t)) && dl.some((t) => /tenth battle is the guardian/.test(t)) && dl.some((t) => /start again at the battle that beat you/.test(t)), 'the first visit to Dungeons explains the structure: ten and ten, the guardian, defeats resume at that battle');
  ok(dl.some((t) => t.indexOf('level ' + 4) >= 0), 'it quotes the dungeon’s own recommended level');
  await ev(() => A.UI.closeAll()); await ev(() => { A.UI.dungeons(null, 'forgottenroad'); }); await sleep(500);
  ok(await ev(() => !document.querySelector('.dlg')), 'the dungeon introduction plays only once');
  await ev(() => A.UI.closeAll());
  await battleSetup({ on: true, c3d: false }); await ev(() => { A.State.state.onboard.tips = {}; A.State.state.missions = { m_hollow: 'claimed', m_feed: 'claimed', m_lv3: 'claimed', m_find: 'claimed' }; A.State.state.onboard.seen.battle = 1; A.UI.B.ctx.finish = null; });
  await ev(() => { const s = A.State.state; A.Rules.abandonRun(s); A.UI.leaveBattle(() => {}); A.Rules.startRun(s, 'forgottenroad', s.aminas.map((a) => a.uid)); A.UI.startBattle(); });
  for (let i = 0; i < 100 && await ev(() => !A.UI.B || A.UI.B.busy); i++) await sleep(100);
  await play(); await page.waitForSelector('.vcard', { timeout: 30000 }); await sleep(500); await shot('o16-first-win');
  ok(await ev(() => { const t = document.querySelector('.o16-vtip'); if (!t) return false; const r = t.getBoundingClientRect(); return /Saved/.test(t.textContent) && r.bottom <= innerHeight; }), 'the first victory card says the win is saved (visible without scrolling)');
  ok(/Return to the sanctuary/.test(await ev(() => A.Onboard16.current(A.State.state).label)), 'after the first win the step is "Return to the sanctuary"');
  await ev(() => { const v = document.querySelector('.vcard').closest('.overlay'); const b = [...v.querySelectorAll('button')].find((x) => /Leave/.test(x.textContent)); if (b) b.click(); });
  await page.waitForSelector('#world'); await page.waitForSelector('.dlg.o16', { timeout: 20000 }); await shot('o16-handoff');
  const ho = await ev(async () => { const out = []; for (let g = 0; g < 20 && document.querySelector('.dlg.o16'); g++) { const d = document.querySelector('.dlg.o16'); if (d.querySelector('.dlg-next').style.visibility !== 'visible') d.querySelector('.dlg-box').click(); await new Promise((r) => setTimeout(r, 30)); out.push(d.querySelector('.dlg-text').textContent); d.querySelector('.dlg-box').click(); await new Promise((r) => setTimeout(r, 300)); } return out; });
  await sleep(600);
  ok(ho.some((t) => /done it before/.test(t)) && ho.some((t) => /tasks are top left/.test(t)), 'back home, the Entity hands over (with one slip about the player)');
  ok(await ev(() => A.Onboard16.kind(A.State.state) === 'complete' && !document.querySelector('.o16p') && !!document.querySelector('.mission-pill')), 'the prologue completes and the HUD returns to the ordinary task list');
  ok(await ev(() => A.State.state.dungeon.forgottenroad.next === 1 && A.State.state.dungeon.forgottenroad.clears === 0), 'dungeon progress is the game’s own: battle 2 is next, nothing extra cleared');

  /* ---------------- 10. Reduce Motion and Battery Saver ---------------- */
  const cineMode = async (o) => { await boot('', (o) => { localStorage.clear(); localStorage.setItem('aminas.onboard16', '1'); A.Onboard16.set(true); const s = A.State.newGame(); A.Onboard16.begin(s); s.avatar.made = true; s.settings.reduceMotion = !!o.calm; s.settings.batterySaver = !!o.saver; s.settings.sfx = false; A.State.save(); if (A.Perf.apply) A.Perf.apply(); document.body.classList.toggle('calm', !!o.calm); A.UI.o16Cinematic(); }, o); };
  await cineMode({ calm: true }); await sleep(2500);
  const calmS = await ev(() => { const c = document.querySelector('.o16-cine'); const sh = [...c.querySelectorAll('.c-shard')].map((x) => getComputedStyle(x).animationName); return { still: c.classList.contains('still'), anim: sh.every((a) => a === 'none'), push: document.querySelector('#world').classList.contains('o16-push') }; });
  ok(calmS.still && calmS.anim && !calmS.push, 'Reduce Motion: cross-fades only (no drifting fragments, no camera push)');
  await shot('o16-cine-calm');
  await page.waitForSelector('.dlg.o16', { timeout: 30000 }); await sleep(300);
  ok(await ev(() => { const t = document.querySelector('.dlg.o16 .dlg-text').textContent; return t.length > 20; }), 'Reduce Motion: each line of dialogue appears at once');
  await cineMode({ saver: true }); await sleep(2500);
  ok(await ev(() => document.querySelector('.o16-cine').classList.contains('lite') && document.querySelectorAll('.o16-cine .c-shard').length === 2 && !document.querySelector('#world').classList.contains('o16-push')), 'Battery Saver: two fragments instead of four, no blur, no camera push');
  await shot('o16-cine-saver');
  const dom = await ev(() => ({ nodes: document.querySelector('.o16-cine').querySelectorAll('*').length }));
  ok(dom.nodes < 2500, 'the cinematic stays light: ' + dom.nodes + ' elements under Battery Saver');
  await page.click('.o16-cine .c-skip'); await page.waitForSelector('.o16-start'); ok(true, 'Skip works under Battery Saver too');

  /* ---------------- 11. other systems untouched ---------------- */
  await boot('', () => { localStorage.setItem('aminas.onboard16', '1'); A.Onboard16.set(true); const s = A.State.newGame(); A.Onboard16.begin(s); s.avatar.made = true; A.Onboard16.chooseStarter(s, 'lumifern'); s.struct.hatchery = true; s.res.gold = 5000; A.State.save(); A.UI.showIsland(true); });
  await sleep(1200); await skipTalk();
  const before = await ev(() => JSON.stringify({ res: A.State.state.res, items: A.State.state.items, eggs: A.State.state.eggs, aminas: A.State.state.aminas }));
  await ev(() => { A.UI.closeAll(); A.UI.hatchery(); }); await sleep(500); await ev(() => A.UI.closeAll()); await ev(() => { if (A.UI.forge) A.UI.forge(); }); await sleep(500); await ev(() => A.UI.closeAll());
  const after = await ev(() => JSON.stringify({ res: A.State.state.res, items: A.State.state.items, eggs: A.State.state.eggs, aminas: A.State.state.aminas }));
  ok(before === after && await ev(() => !!A.State.state.onboard.tips.hatchery), 'opening the Hatchery and Forge only adds a one-time line from the Entity; nothing else in the save changes');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\n' + (fail ? 'FAILED: ' : '') + pass + ' passed, ' + fail + ' failed (browser-onboard16)'); process.exitCode = fail ? 1 : 0;
})();
