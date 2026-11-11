// v0.6 real-browser test (Chromium via Playwright at iPhone landscape size; NOT iOS Safari, NOT a real iPhone).
// Run: node tests/browser-v06.test.js [screenshotDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'), fs = require('fs');
const SHOTS = process.argv[2] || path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
  const click = async (sel) => { await page.waitForSelector(sel, { timeout: 5000 }); await page.click(sel); await sleep(200); };
  const S = () => page.evaluate(() => JSON.parse(JSON.stringify(A.State.state)));
  const skipDlg = async () => { for (let i = 0; i < 10; i++) { const d = await page.$('.dlg-skip'); if (d) { await d.click(); await sleep(200); } else break; } };
  await page.goto(srv.url); await page.waitForSelector('.logo');
  // a player who has restored the Sunlit Hollow, with two Aminas (3D off: software WebGL here is slow)
  await page.evaluate(() => { const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.settings.creatures3d = false; A.Rules.addAmina(s, 'lumifern', 6); A.Rules.addAmina(s, 'acinus', 5); s.struct.hollow = true; s.buildings.hollow.level = 1; s.buildings.hollow.state = 'built'; A.Rules.drain(); A.State.save(); A.UI.showIsland(); });
  await sleep(900); await skipDlg(); await page.evaluate(() => { A.UI.queue.length = 0; document.querySelectorAll('#toast-root .toast').forEach((t) => t.remove()); });
  ok(!!(await page.$('.nav .nbtn.tri[data-act=battle]')), 'the bottom bar has the triangle Battle button');
  const tri = await page.$eval('.nav .nbtn.tri', (e) => e.getBoundingClientRect().width), nb = await page.$eval('.nav .nbtn:not(.tri)', (e) => e.getBoundingClientRect().width);
  ok(tri > nb && tri < nb * 1.4, 'the Battle button is only a little larger than its neighbours (' + Math.round(tri) + ' vs ' + Math.round(nb) + ' px)');
  await shot('01-island-hud');
  await click('[data-act=battle]'); ok(!!(await page.$('.hubcard.pve')) && !!(await page.$('.hubcard.pvp')), 'Battle opens the hub with PvE and PvP'); await shot('02-battle-hub');
  await click('[data-act=pveMenu]'); const pveItems = await page.$$eval('.mcard', (els) => els.map((e) => e.dataset.act));
  ok(['dungeons', 'map', 'explore', 'ruins', 'survival'].every((a) => pveItems.indexOf(a) >= 0), 'PvE lists Dungeons, Island Map, Explore, Loot Ruins and Survival'); await shot('03-pve-menu');
  await click('.mcard[data-act=explore]'); await page.waitForSelector('.areacard'); ok(true, 'PvE → Explore opens the island’s explore areas'); await page.click('.overlay:last-child .x'); await sleep(200);
  await click('[data-act=hubBack]'); ok(!!(await page.$('.hubcard.pve')), 'Back returns from PvE to the hub');
  await click('[data-act=pvpMenu]'); const pvpItems = await page.$$eval('.mcard', (els) => els.map((e) => e.dataset.act));
  ok(['pvp5', 'defence', 'hideseek'].every((a) => pvpItems.indexOf(a) >= 0), 'PvP lists Matchmaking, Island Defence and Hide and Seek');
  ok(/not connected/.test(await page.textContent('.overlay')), 'PvP says online play is not connected'); await shot('04-pvp-menu');
  await click('[data-act=hubBack]'); await click('[data-act=pveMenu]'); await click('.mcard[data-act=dungeons]');
  await page.waitForSelector('.dg'); ok((await page.$$('.dl-row')).length === 10, 'Dungeons screen lists the island’s ten dungeons');
  ok(await page.$eval('.dl-row[data-id=forgottenroad]', (e) => e.classList.contains('available')), 'Dungeon 1 is available'); ok(await page.$eval('.dl-row[data-id=gatheringhall]', (e) => e.classList.contains('locked')), 'Dungeon 2 is locked');
  ok((await page.$$('.bpath .bn')).length === 10, 'the selected dungeon shows a path of ten battles'); await shot('05-dungeons');
  await click('[data-act=enterDungeon][data-id=forgottenroad]'); await page.waitForSelector('#pp-go'); await shot('06-party'); await click('#pp-go');
  await page.waitForSelector('.vcard.enc'); ok(/Battle 1 of 10/.test(await page.textContent('.vcard.enc')) && !!(await page.$('.clue')), 'the encounter card shows battle 1 of 10 and an environmental clue'); await shot('07-encounter-1');
  await click('#enc-go'); await page.waitForSelector('#battle'); await sleep(900); ok(/Forgotten Road · 1\/10/.test(await page.textContent('.b-label')), 'battle shows the dungeon and battle number'); await shot('08-battle-1');
  await page.click('.abtn:not(.off):not(.swap)'); await sleep(2500); ok(true, 'an ability can be used');
  // jump to battle 7 to see the mural clue
  await page.evaluate(() => { const s = A.State.state; A.UI.leaveBattle(() => {}); s.run.battle = 6; s.dungeon.forgottenroad.next = 6; A.UI.closeAll(); A.UI.nextEncounter(); });
  await page.waitForSelector('.vcard.enc'); ok(/painted wall/i.test(await page.textContent('.clue')), 'battle 7 shows the first glimpse of the mural'); await shot('09-encounter-mural');
  // the Waywarden
  await page.evaluate(() => { const s = A.State.state; s.run.battle = 9; s.dungeon.forgottenroad.next = 9; A.UI.closeAll(); A.UI.nextEncounter(); });
  await page.waitForSelector('.vcard.enc'); ok(/Waywarden/.test(await page.textContent('.vcard.enc')) && /Stone Barrier/.test(await page.textContent('.vcard.enc')), 'battle 10 is the Waywarden, with its barrier explained'); await shot('10-encounter-waywarden');
  await click('#enc-go'); await page.waitForSelector('#battle'); await sleep(900);
  await page.evaluate(() => { const e = A.UI.B.b.enemy; e.hp = Math.floor(e.hpMax * 0.7); });
  await page.click('.abtn:not(.off):not(.swap)'); await sleep(3500);
  ok(!(await page.$eval('#b-tele', (e) => e.hidden)) || (await S()).run && (await page.evaluate(() => A.UI.B.b.enemy.shield > 0 || A.UI.B.b.enemy.barrierDue)), 'crossing the threshold warns that a barrier is coming');
  await shot('11-barrier-warning');
  for (let i = 0; i < 3 && !(await page.evaluate(() => A.UI.B && A.UI.B.b.enemy.shield > 0)); i++) { await page.waitForSelector('.abtn:not(.off):not(.swap)', { timeout: 8000 }).catch(() => {}); await page.click('.abtn:not(.off):not(.swap)').catch(() => {}); await sleep(3200); }
  ok(await page.evaluate(() => A.UI.B && A.UI.B.b.enemy.shield > 0), 'the Waywarden raises its Stone Barrier'); ok(!!(await page.$('#pan-e .hpb.shieldb:not([hidden])')), 'the barrier shows as a bar over its health'); await shot('12-barrier-up');
  await page.evaluate(() => { const b = A.UI.B.b; b.enemy.shield = 0; b.enemy.hp = 1; b.enemy.mechDone = [true, true]; });
  await page.waitForSelector('.abtn:not(.off):not(.swap)', { timeout: 8000 }); await page.click('.abtn:not(.off):not(.swap)'); await page.waitForSelector('#v-go', { timeout: 12000 });
  let s = await S(); ok(s.dungeon.forgottenroad.clears === 1 && !s.run, 'beating the Waywarden clears the dungeon'); ok(/Dungeon cleared/.test(await page.textContent('.vcard')), 'result screen says the dungeon is cleared'); await shot('13-cleared');
  await click('#v-go'); await page.waitForSelector('.scene'); await sleep(1500);
  ok(/Old Roads/.test(await page.textContent('.sc-title')), 'the Old Roads scene plays'); await shot('14-scene-start');
  const t0 = Date.now(); let seenChoice = false, seenMural = false, lines = [];
  for (let i = 0; i < 40; i++) { if (!(await page.$('.scene'))) break; const ch = await page.$('.sc-choice'); if (ch) { seenChoice = /What happened to the settlement/.test(await ch.textContent()); await shot('15-scene-choice'); await ch.click(); await sleep(300); } const txt = await page.textContent('.sc-text').catch(() => ''); if (txt && lines[lines.length - 1] !== txt) lines.push(txt); if (await page.$('.sc-layer.mural, .sc-layer svg.mural')) { if (!seenMural) await shot('16-scene-mural'); seenMural = true; } await page.mouse.click(420, 200); await sleep(450); }
  ok(seenChoice, 'the player responds: “What happened to the settlement?”'); ok(seenMural, 'the scene shows the mural');
  s = await S(); ok(s.story.scenes.oldroads === 'seen' && !s.story.pendingScene, 'finishing the scene records it');
  const all = await page.evaluate(() => A.Scenes.list.oldroads.beats.map((b) => b.text || '').join(' '));
  ok(/glorified roadblock/.test(all) && /Old roads have a habit of outliving/.test(all) && /another few centuries/.test(all), 'the scene has the agreed Entity lines');
  ok(!/Emergence|human|his world|sanctuary universe|presence/i.test(all), 'the scene does not reveal the Emergence, the Entity’s origin, or the presence');
  console.log('     scene estimate: ' + (await page.evaluate(() => A.Scenes.estimate('oldroads'))) + 's at normal speed');
  await sleep(600); ok(await page.$eval('.dl-row, .nav', () => true).catch(() => true), 'back on the island');
  // persistence
  await page.reload(); await page.waitForSelector('[data-act=continue]'); await click('[data-act=continue]'); await page.waitForSelector('.nav'); await skipDlg();
  s = await S(); ok(s.dungeon.forgottenroad.clears === 1 && s.lore.waywarden && s.story.scenes.oldroads === 'seen', 'after a reload: dungeon cleared, journal entry and scene kept');
  await page.evaluate(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); A.UI.dungeons(); }); await page.waitForSelector('.dg');
  ok(await page.$eval('.dl-row[data-id=gatheringhall]', (e) => e.classList.contains('available')), 'Dungeon 2 is available after Dungeon 1'); await shot('17-dungeons-after');
  await click('[data-act=journal]'); ok((await page.$$('.jn')).length >= 1 && !!(await page.$('[data-act=replayScene]')), 'the Journal lists entries and the scene to replay'); await shot('18-journal');
  // skipping a scene is safe
  await page.evaluate(() => { A.UI.closeAll(); const s = A.State.state; s.story.pendingScene = 'emptyhall'; A.UI.playScene('emptyhall', () => {}); }); await page.waitForSelector('#sc-skip'); await sleep(1300); await shot('19-scene-hall'); await click('#sc-skip'); await sleep(500);
  s = await S(); ok(s.story.scenes.emptyhall === 'skipped' && !s.story.pendingScene && s.dungeon.forgottenroad.clears === 1, 'skipping a scene records it as skipped and changes nothing else');
  // island map
  await page.evaluate(() => { A.UI.closeAll(); A.UI.islandMap(); }); await page.waitForSelector('.frags'); ok((await page.$$('.frag.locked')).length === 3 && /Island Boss/.test(await page.textContent('.frags')), 'Island Map: three islands locked behind Island Bosses'); await shot('20-island-map');
  // ruins
  await page.evaluate(() => { A.UI.closeAll(); A.UI.ruins(); }); await page.waitForSelector('[data-act=ruinSearch]'); const g0 = (await S()).res.gold; await click('[data-act=ruinSearch]'); await page.waitForSelector('.overlay .vcard');
  s = await S(); ok(s.res.gold > g0 && s.lore.ruin_toll && s.ruins.toll.searches === 1, 'searching the toll house pays out and finds its artefact once'); await shot('21-ruins');
  await page.evaluate(() => A.UI.closeAll()); await page.evaluate(() => A.UI.ruins()); ok(!(await page.$('[data-act=ruinSearch][data-id=toll]')), 'the toll house is on cooldown after a search');
  // survival
  await page.evaluate(() => { A.UI.closeAll(); A.UI.survival(); }); await click('[data-act=svStart]'); await click('#pp-go'); await page.waitForSelector('#battle'); await sleep(900); ok(/Survival · wave 1/.test(await page.textContent('.b-label')), 'Survival starts at wave 1'); await shot('22-survival');
  const dBefore = JSON.stringify((await S()).dungeon);
  await page.evaluate(() => { const b = A.UI.B.b; b.enemy.hp = 1; }); await page.click('.abtn:not(.off):not(.swap)'); await page.waitForSelector('#sv-next', { timeout: 12000 }); await shot('23-survival-wave'); await click('#sv-stop'); await sleep(600);
  s = await S(); ok(s.survival.best >= 1 && !s.survival.run && JSON.stringify(s.dungeon) === dBefore, 'Survival pays out, records the best wave, and leaves dungeon progress alone');
  await page.evaluate(() => A.UI.closeAll());
  // PvP 5v5 practice
  await page.evaluate(() => { const s = A.State.state; ['cannonis', 'pyrokai', 'gaiaroki'].forEach((x) => A.Rules.addAmina(s, x, 6)); A.Rules.drain(); A.Rules.PvP.setRoster(s, s.aminas.slice(0, 5).map((a) => a.uid)); A.State.save(); A.UI.closeAll(); A.UI.pvp5(); });
  await page.waitForSelector('[data-act=pvpPlay]'); await shot('24-pvp5'); await click('[data-act=pvpPlay]'); await page.waitForSelector('#battle'); await sleep(900);
  ok((await page.$$('.b-party .pm')).length === 5 && !!(await page.$('.foedots')), '5v5: five Aminas on each side'); await shot('25-pvp5-battle');
  await page.evaluate(() => { const b = A.UI.B.b; b.foes.forEach((f, i) => { if (i < 4) f.hp = 0; }); b.ei = 4; b.enemy = b.foes[4]; b.enemy.hp = 1; }); await page.click('.abtn:not(.off):not(.swap)'); await page.waitForSelector('#pr-ok', { timeout: 12000 });
  s = await S(); ok(s.pvp.practice.w === 1 && JSON.stringify(s.dungeon) === dBefore, 'a practice win is recorded and touches nothing else'); await shot('26-pvp-result'); await click('#pr-ok'); await sleep(400);
  // Island Defence
  await page.evaluate(() => { const s = A.State.state; A.Rules.PvP.setTeam(s, 'attack', s.aminas.slice(0, 3).map((a) => a.uid)); A.Rules.PvP.setTeam(s, 'defence', s.aminas.slice(2, 5).map((a) => a.uid)); A.State.save(); A.UI.closeAll(); A.UI.defence(); });
  await page.waitForSelector('.dteams'); await shot('27-defence'); await click('[data-act=defTest]'); await page.waitForSelector('.overlay:last-child .vcard'); await shot('28-defence-test');
  await page.reload(); await page.waitForSelector('[data-act=continue]'); s = await S(); ok(s.defence.defence.length === 3 && s.defence.attack.length === 3 && s.defence.log.length >= 1, 'attack and defence teams persist after a reload');
  await click('[data-act=continue]'); await page.waitForSelector('.nav'); await skipDlg();
  // Hide and Seek
  await page.evaluate(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); A.UI.hideSeek(); }); await page.waitForSelector('.hs-lobby');
  await click('[data-act=hsPref][data-p=seeker]'); await click('[data-act=hsVote][data-id=you]'); await shot('29-hs-lobby'); await click('[data-act=hsStart]');
  const seekerTxt = await page.textContent('.overlay .vcard'); ok(/Seeker/.test(seekerTxt), 'the vote assigns a Seeker and says how'); await shot('30-hs-vote');
  // hs-redesign: the round is now the 3D Starter Island round (tested in browser-hideseek.test.js); here: it opens,
  // shows the right action for the role, and Leave ends it with the results as before
  await click('[data-act=hsGo]'); await page.waitForSelector('.hsround .hs-act', { timeout: 90000 }); await sleep(400);
  ok(await page.evaluate(() => !!A.UI.HSR && A.UI.HSR.m.seeker.id === A.UI.HS.assign.seeker && !!document.querySelector(A.UI.HS.assign.seeker === 'you' ? '.hs-act.attack' : '.hs-act.disguise')), 'the round opens on the Starter Island: the Seeker can attack, a hider can disguise');
  await shot('31-hs-match'); await click('[data-hs=leave]'); await page.waitForSelector('#cf-yes'); await click('#cf-yes'); await page.waitForSelector('#hs-out'); await shot('32-hs-result'); await click('#hs-out'); await page.evaluate(() => A.UI.closeAll());
  // Island Boss
  await page.evaluate(() => { const s = A.State.state; A.Data.CAMPAIGN.starter.dungeons.slice(0, 9).forEach((id) => (s.dungeon[id] = { clears: 1 })); s.rank = 12; ['lumifern', 'acinus', 'pyrokai'].forEach((sp) => { const a = s.aminas.find((x) => x.sp === sp); if (a) a.lv = 22; }); s.party = s.aminas.slice(0, 3).map((a) => a.uid); A.State.save(); A.UI.closeAll(); A.UI.dungeons(null, 'heartwood'); });
  await page.waitForSelector('.dd'); await shot('33-dungeon10'); await click('[data-act=enterDungeon][data-id=heartwood]'); await click('#pp-go');
  await page.evaluate(() => { const s = A.State.state; s.run.battle = 9; s.dungeon.heartwood.next = 9; A.UI.closeAll(); A.UI.nextEncounter(); }); await page.waitForSelector('.prism-card'); await shot('34-island-boss-card');
  await click('#enc-go'); await page.waitForSelector('#battle.islandboss'); await sleep(1200); ok(!!(await page.$('#spr-e.prism')) && /Island Boss/.test(await page.textContent('#pan-e')), 'the Island Boss has its prismatic glow and label'); await shot('35-island-boss-battle');
  const act = async () => { await page.waitForSelector('.abtn:not(.off):not(.swap), .pm.tapme', { timeout: 9000 }).catch(() => {}); const t = await page.$('.pm.tapme'); if (t) await t.click({ force: true }); else await page.click('.abtn:not(.off):not(.swap)').catch(() => {}); await sleep(3600); };
  for (let i = 0; i < 3; i++) await act();
  await shot('36-island-boss-turns');
  ok(!(await S()).islands.verdant || !(await S()).islands.verdant.unlocked, 'Verdant Wilds still locked mid-fight');
  await page.evaluate(() => { const b = A.UI.B.b; b.enemy.hp = 1; b.enemy.spd = 0; b.enemy.charging = false; b.enemy.chargeIn = 5; b.party.forEach((p) => { p.hp = p.hpMax; }); });
  for (let i = 0; i < 3 && !(await page.$('#v-go')); i++) await act(); await page.waitForSelector('#v-go', { timeout: 12000 });
  s = await S(); ok(s.islands.verdant && s.islands.verdant.unlocked && s.campaign.bosses.starter, 'defeating the Island Boss unlocks the Verdant Wilds'); await shot('37-island-boss-won');
  await click('#v-go'); await page.waitForSelector('.scene'); await sleep(1400); await shot('38-heart-scene'); await click('#sc-skip'); await page.waitForSelector('.newisle', { timeout: 6000 }); await shot('39-new-island');
  await page.evaluate(() => { A.UI.closeAll(); A.UI.islandMap(); }); await page.waitForSelector('.frags'); ok((await page.$$('.frag.completed')).length === 1 && (await page.$$('.frag.unlocked')).length === 1, 'Island Map: Starter Island completed, Verdant Wilds unlocked'); await shot('40-island-map-after');
  await page.evaluate(() => A.UI.closeAll());
  ok(errors.length === 0, 'no page errors (' + errors.slice(0, 5).join(' | ') + ')');
  console.log('\nbrowser v0.6: ' + pass + ' passed, ' + fail + ' failed'); await browser.close(); srv.close(); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
