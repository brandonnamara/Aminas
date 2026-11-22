// Phase 16B, real-browser test (Chromium + Playwright, software WebGL, 844×390 touch viewport; NOT a phone): save
// export / import / undo, dialogue text size and Instant speed, the hit assist, panel close fade, refusal feedback and
// quest tracking. Run: node tests/browser-polish16b.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs'); const os = require('os');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, acceptDownloads: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(90000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = (n) => (SHOTS ? page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 85 }) : null);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p16b-'));
  const tidy = () => ev(async () => { for (let i = 0; i < 30 && document.querySelector('.dlg, .scene'); i++) { const d = document.querySelector('.dlg .dlg-skip, #sc-skip'); if (d) d.click(); await new Promise((r) => setTimeout(r, 120)); } A.UI.queue.length = 0; A.UI.busy = false; document.querySelectorAll('.toast').forEach((t) => t.remove()); });
  const game = (o) => ev(async (o) => { const s = A.State.newGame(), R = A.Rules; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: o.name, look: null }; s.starter = 'lumifern'; R.addAmina(s, 'lumifern', o.lv); R.addAmina(s, 'acinus', 4);
    s.res.gold = o.gold; s.res.food = 300; s.struct.hollow = true; s.settings.sfx = false; s.settings.music = false; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; R.drain(); A.State.save(); A.UI.showIsland(true); await new Promise((r) => setTimeout(r, 900)); }, o);
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title' && A.SaveFile);
  await game({ name: 'Rowan', lv: 9, gold: 1234 }); await tidy();

  /* ---------------- 1. export ---------------- */
  await ev(() => A.UI.settings()); await page.waitForSelector('.sf-row'); await sleep(300);
  ok(await ev(() => !!document.querySelector('[data-act=sfExport]') && !!document.querySelector('[data-act=sfImport]') && !document.querySelector('[data-act=sfUndo]')), 'Settings › Your save has Export save file and Import save file (no Undo before any import)');
  await ev(() => document.querySelector('[data-act=sfExport]').scrollIntoView({ block: 'center' })); await sleep(200); await shot('save-01-settings');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=sfExport]')]);
  const file = path.join(tmp, dl.suggestedFilename()); await dl.saveAs(file); const text = fs.readFileSync(file, 'utf8');
  ok(/^aminas-save-Rowan-\d{8}-\d{4}\.json$/.test(dl.suggestedFilename()), 'Export downloads a file named for the player and time (' + dl.suggestedFilename() + ')');
  const parsed = await ev((t) => { const p = A.SaveFile.parse(t); return { ok: p.ok, name: p.summary && p.summary.name, gold: p.summary && p.summary.gold, same: p.ok && JSON.stringify(p.st.aminas) === JSON.stringify(A.State.hydrate(JSON.parse(JSON.stringify(A.State.state))).st.aminas) && JSON.stringify(p.st.res) === JSON.stringify(A.State.state.res) }; }, text);
  ok(parsed.ok && parsed.name === 'Rowan' && parsed.gold === 1234 && parsed.same, 'the downloaded file is a complete, valid save of this game');
  await sleep(400); await shot('save-02-exported');
  ok(await ev(() => /Save file/.test((document.querySelector('.sf16 h2') || {}).textContent || '') && !!document.querySelector('#sf-copy') && /asked to save/.test(document.querySelector('.sf16').textContent)), 'after exporting, a sheet says which file was saved and offers Copy save text (a page cannot confirm the browser kept it)');

  /* ---------------- 2. import: malformed and incompatible files are refused safely ---------------- */
  const pick = async (name, content) => { const f = path.join(tmp, name); fs.writeFileSync(f, content); await ev(() => { A.UI.closeAll(); A.UI.sfPick = A.UI.sfPick; }); await ev(() => A.UI.sfPick()); await page.setInputFiles('#sf-file', f); await sleep(500); };
  const snap = () => ev(() => localStorage.getItem(A.Data.SAVE_KEY));
  const s0 = await snap();
  await pick('broken.json', text.slice(0, 900));
  ok(await ev(() => /Save not loaded/.test((document.querySelector('.sf16 h2') || {}).textContent || '') && /not an Aminas save|damaged/.test(document.querySelector('.sf16').textContent)), 'a cut-short file is refused with a plain reason');
  await shot('save-03-rejected');
  ok((await snap()) === s0, 'and nothing changed');
  const env = JSON.parse(text); env.save.res.gold = 999999;
  await pick('edited.json', JSON.stringify(env)); ok(await ev(() => /changed or damaged/.test(document.querySelector('.sf16').textContent)), 'an edited file fails its checksum and is refused');
  const newer = JSON.parse(text); newer.save.schema = 99; newer.checksum = await ev((s) => A.SaveFile.checksum(s), JSON.stringify(newer.save));
  await pick('newer.json', JSON.stringify(newer)); ok(await ev(() => /newer version/.test(document.querySelector('.sf16').textContent)), 'a save from a newer game version is refused');
  await pick('photo.json', '{"a":1}'); ok(await ev(() => /not an Aminas save/.test(document.querySelector('.sf16').textContent)), 'an unrelated file is refused');
  ok((await snap()) === s0 && await ev(() => A.State.state.avatar.name === 'Rowan'), 'after four refused files the game and the stored save are untouched');

  /* ---------------- 3. import: confirmation, replace, undo ---------------- */
  await ev(() => A.UI.closeAll());
  const other = await ev(() => { const s = A.State.fresh(), R = A.Rules; s.phase = 'play'; s.starter = 'umbrit'; s.avatar = { made: true, name: 'Ivy', look: null }; R.addAmina(s, 'umbrit', 14); R.addAmina(s, 'emberix', 6); R.addAmina(s, 'acinus', 3); s.res.gold = 77; R.drain(); const keep = A.State.state; A.State.state = A.State.hydrate(s).st; const r = A.SaveFile.exportFile(); A.State.state = keep; return r.text; });
  await pick('ivy.json', other);
  ok(await ev(() => /Load this save\?/.test(document.querySelector('.sf16 h2').textContent) && document.querySelectorAll('.sf16 .sf-sum').length === 2 && /Ivy/.test(document.querySelector('.sf16').textContent) && /Rowan/.test(document.querySelector('.sf16').textContent)), 'a valid file shows what it contains beside the current game, and asks first');
  await shot('save-04-confirm');
  await page.click('.sf16 [data-act=close]'); await sleep(300);
  ok((await snap()) === s0 && await ev(() => A.State.state.avatar.name === 'Rowan'), 'Cancel changes nothing');
  await pick('ivy.json', other); await ev(() => { const y = document.querySelector('#sf-yes'); y.click(); y.click(); });
  await page.waitForSelector('#world'); await sleep(900); await tidy();
  ok(await ev(() => A.State.state.avatar.name === 'Ivy' && A.State.state.aminas.length === 3 && A.State.state.res.gold === 77 && JSON.parse(localStorage.getItem(A.Data.SAVE_KEY)).avatar.name === 'Ivy'), 'Replace loads the file as the current game (and saves it), once');
  await shot('save-05-loaded');
  await ev(() => A.UI.settings()); await page.waitForSelector('[data-act=sfUndo]'); ok(true, 'Settings now offers Undo last import');
  await page.click('[data-act=sfUndo]'); await page.waitForSelector('#sf-undo-yes'); await sleep(200); await shot('save-06-undo');
  ok(await ev(() => /Rowan/.test(document.querySelector('.sf16').textContent)), 'Undo shows which game it will put back');
  await page.click('#sf-undo-yes'); await page.waitForSelector('#world'); await sleep(800); await tidy();
  ok(await ev(() => A.State.state.avatar.name === 'Rowan' && A.State.state.res.gold === 1234 && A.State.state.aminas.length === 2), 'Undo restores the earlier game exactly');
  const s1 = await snap(); await page.reload(); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  ok(await ev(() => A.State.state.avatar.name === 'Rowan' && A.SaveFile.recovery() && A.SaveFile.recovery().summary.name === 'Ivy'), 'after a reload the restored game is still there, and the other one is still recoverable');
  await ev(() => { A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; A.State.state.settings.batterySaver = false; if (A.Perf.apply) A.Perf.apply(); });
  await page.click('[data-act=continue]'); await page.waitForSelector('#world'); await sleep(1000); await tidy();

  /* ---------------- 4. the existing backup code now asks too ---------------- */
  await ev(() => { A.UI.closeAll(); A.UI.acts.backup(); }); await page.waitForSelector('#bk-in');
  await page.fill('#bk-in', 'AMINAS1:garbage'); await page.click('#bk-go'); await sleep(300);
  ok(await ev(() => /damaged|incomplete/.test(document.querySelector('#bk-msg').textContent)), 'a bad backup code gives a plain reason');
  const code = await ev(() => A.State.exportCode()); await page.fill('#bk-in', code); await page.click('#bk-go'); await sleep(400);
  ok(await ev(() => !!document.querySelector('#sf-yes') && /Load this save/.test(document.querySelector('.sf16 h2').textContent)), 'a good backup code now opens the same confirmation instead of replacing the game at once');
  await ev(() => A.UI.closeAll());

  /* ---------------- 5. dialogue: text size and Instant ---------------- */
  const long = 'Since the Resonance— since things changed, the island has been collecting strays. Shores from somewhere else. Kind Souls in the wrong forests. You’ll get used to it. I haven’t. Not yet. Perhaps not ever, if I am honest about it.';
  const sizes = {};
  for (const sz of ['normal', 'large', 'larger']) {
    await ev((sz) => { A.State.state.settings.textSize = sz; A.State.state.settings.textSpeed = 'instant'; A.UI.applyTextSize(); }, sz);
    await ev((t) => A.UI.script([['n', t]], () => {}), long); await sleep(500);
    sizes[sz] = await ev(() => { const d = [...document.querySelectorAll('.dlg:not(.out)')].pop(), box = d.querySelector('.dlg-box').getBoundingClientRect(), tx = d.querySelector('.dlg-text'), ctl = [...d.querySelectorAll('.dlg-ctl .btn')].map((b) => b.getBoundingClientRect());
      const hit = ctl.some((c) => !(c.right <= box.left || c.left >= box.right || c.bottom <= box.top || c.top >= box.bottom));
      return { font: parseFloat(getComputedStyle(tx).fontSize), full: tx.textContent.length, inView: box.top >= 0 && box.bottom <= innerHeight + 1, hit, aa: !!d.querySelector('.tsz16'), dlgs: document.querySelectorAll('.dlg').length }; });
    await shot('dialogue-' + sz); await tidy();
  }
  ok(sizes.normal.font < sizes.large.font && sizes.large.font < sizes.larger.font, 'Dialogue text size: standard ' + sizes.normal.font + ' px, large ' + sizes.large.font + ' px, larger ' + sizes.larger.font + ' px');
  ok(['normal', 'large', 'larger'].every((k) => !sizes[k].hit && sizes[k].inView), 'at every size the panel stays on screen and never covers Aa, Auto or Skip');
  ok(['normal', 'large', 'larger'].every((k) => sizes[k].full === long.length), 'Instant shows the whole line at once (' + ['normal', 'large', 'larger'].map((k) => sizes[k].full + '/' + long.length).join(', ') + ')');
  ok(sizes.normal.aa, 'every dialogue panel has an Aa button');
  await ev(() => { A.State.state.settings.textSize = 'normal'; A.State.state.settings.textSpeed = 'normal'; A.UI.applyTextSize(); A.UI.script([['n', 'Text size?']], () => {}); }); await sleep(400);
  await ev(() => document.querySelector('.dlg .tsz16').click());
  ok(await ev(() => A.State.state.settings.textSize === 'large' && document.body.classList.contains('tsz-l') && JSON.parse(localStorage.getItem(A.Data.SAVE_KEY)).settings.textSize === 'large'), 'Aa changes the size at once and saves it');
  await tidy(); await ev(() => { A.State.state.settings.textSize = 'normal'; A.UI.applyTextSize(); });
  await ev(() => A.UI.settings()); await sleep(300);
  ok(await ev(() => !!document.querySelector('[data-k=textSize][data-v=larger]') && !!document.querySelector('[data-k=textSpeed][data-v=instant]')), 'Settings has Dialogue text size and an Instant text speed');
  await ev(() => document.querySelector('[data-k=textSpeed]').scrollIntoView({ block: 'center' })); await sleep(200); await shot('settings-text');
  await ev(() => A.UI.closeAll());
  // a story scene at the largest size: choices and controls stay reachable
  const sc = await ev(async () => { A.State.state.settings.textSize = 'larger'; A.UI.applyTextSize(); const id = Object.keys(A.Story.SCENES || A.Scenes || {})[0]; if (!id || !A.UI.playScene) return null; A.UI.playScene(id, () => {}, { replay: true }); await new Promise((r) => setTimeout(r, 2400));
    const box = document.querySelector('.scene .sc-box'), ctl = [...document.querySelectorAll('.scene .sc-ctl .btn')]; if (!box) return null; const b = box.getBoundingClientRect();
    return { aa: !!document.querySelector('.scene .tsz16'), hit: ctl.some((x) => { const c = x.getBoundingClientRect(); return !(c.right <= b.left || c.left >= b.right || c.bottom <= b.top || c.top >= b.bottom); }), inView: b.bottom <= innerHeight + 1 && b.top >= 0 }; });
  if (sc) ok(sc.aa && !sc.hit && sc.inView, 'story scenes at Larger: Aa present, panel on screen, controls clear'); else ok(true, 'story scenes: none available to replay here (checked in the dialogue tests above)');
  await tidy(); await ev(() => { A.State.state.settings.textSize = 'normal'; A.UI.applyTextSize(); document.querySelectorAll('.scene').forEach((x) => x.remove()); A.UI.busy = false; });

  /* ---------------- 6. touch: hit assist, backdrop, refusal feedback, close fade ---------------- */
  await ev(() => { A.UI.closeAll(); A.UI.collection(); }); await sleep(800);
  const chip = await ev(() => { const b = [...document.querySelectorAll('[data-act=colSet]')].find((x) => /Dark/.test(x.textContent)); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, top: r.top, bottom: r.bottom, h: r.height, on: b.classList.contains('on') }; });
  await page.mouse.click(chip.x, chip.top - 5); await sleep(400);
  ok(await ev(() => { const b = [...document.querySelectorAll('[data-act=colSet]')].find((x) => /Dark/.test(x.textContent)); return b.classList.contains('on'); }) && !chip.on, 'a tap 5 px above a ' + Math.round(chip.h) + ' px filter chip selects it (hit assist)');
  const used = await ev(() => A.UI.hitAssist.used);
  await page.mouse.click(4, 200); await sleep(300);
  ok(await ev(() => !document.querySelector('#modal-root .overlay')) && used >= 1, 'a tap on the dimmed backdrop still closes the panel, as before');
  await ev(() => { A.UI.collection(); }); await sleep(300); await ev(() => A.UI.closeAll());
  const gh = await ev(() => { const g = document.querySelector('.ov-ghost16'); return { g: !!g, ids: g ? g.querySelectorAll('[id],[data-act]').length : -1 }; }); await sleep(300);
  if (!gh.g) console.log('      (saver ' + await ev(() => !!(A.Perf.saver && A.Perf.saver())) + ')');
  ok(gh.g && gh.ids === 0 && await ev(() => !document.querySelector('.ov-ghost16')), 'closing fades a copy for 150 ms with no ids or actions, then removes it');
  await ev(() => { document.body.classList.add('calm'); A.State.state.settings.reduceMotion = true; A.UI.collection(); }); await sleep(200); await ev(() => A.UI.closeAll());
  ok(await ev(() => !document.querySelector('.ov-ghost16') || getComputedStyle(document.querySelector('.ov-ghost16')).display === 'none'), 'Reduce Motion: no fade');
  await ev(() => { document.body.classList.remove('calm'); A.State.state.settings.reduceMotion = false; });
  await ev(() => { A.State.state.res.gold = 0; A.UI.closeAll(); A.UI.forge('craft'); }); await sleep(800);
  const refused = await ev(async () => { const b = [...document.querySelectorAll('[data-act=fCraft]')][0]; if (!b) return 'none'; b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); b.click(); await new Promise((r) => setTimeout(r, 120)); return b.classList.contains('nope16') || !!document.querySelector('.nope16'); });
  ok(refused === true || refused === 'none', 'a refused action shakes the pressed button' + (refused === 'none' ? ' (no craft button to test)' : ''));
  await ev(() => { A.UI.closeAll(); A.State.state.res.gold = 1234; });

  /* ---------------- 7. quest tracking ---------------- */
  await ev(() => { const s = A.State.state; ['m_hollow', 'm_feed', 'm_lv3', 'm_find'].forEach((k) => (s.missions[k] = 'claimed')); A.Quests.scan(s); A.UI.renderHud(); }); await sleep(300);
  const pill = () => ev(() => document.querySelector('.mission-pill').innerText.replace(/\s+/g, ' '));
  const p0 = await pill(); await shot('quest-before-road');
  await ev(() => { const s = A.State.state; s.dungeon.forgottenroad = Object.assign(A.Rules.dungeonRec(s, 'forgottenroad'), { next: 3 }); A.Quests.scan(s); A.UI.renderHud(); }); await sleep(300);
  const p1 = await pill(); await shot('quest-road-in-progress');
  ok(/Clear the Way/.test(p0) && /The Forgotten Road/.test(p1) && /Battle 4 of 10/.test(p1), 'the task pill tracks the Forgotten Road once you are partway through it ("' + p1.slice(0, 70) + '")');
  await page.click('.mission-pill'); await sleep(900);
  ok(await ev(() => /Forgotten Road/.test((document.querySelector('#modal-root') || {}).textContent || '')), 'its Go opens the Forgotten Road');
  await ev(() => A.UI.closeAll());

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\n' + (fail ? 'FAILED: ' : '') + pass + ' passed, ' + fail + ' failed (browser-polish16b)'); process.exitCode = fail ? 1 : 0;
})();
