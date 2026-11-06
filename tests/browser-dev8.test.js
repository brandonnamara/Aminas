// Dev 8 real-browser test (Chromium via Playwright at iPhone landscape sizes; NOT iOS Safari, NOT a real phone).
// Avatar creator (new player only), top-left avatar and profile, Player Rank wording, pixel currencies, the smaller
// monster preview with feeding only after a pick, moves upgraded from different screens, live building placement
// (no Done), habitat production switching, distinct dungeon backdrops, pixel bursts cleaned up, no console errors.
// Run: node tests/browser-dev8.test.js [screenshotDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'), fs = require('fs');
const SHOTS = process.argv[2] || path.join(__dirname, 'shots-dev8'); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const srv = await serve(); const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); page.setDefaultTimeout(8000); const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|ServiceWorker/i.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const calm = async () => { for (let i = 0; i < 12; i++) { const d = await page.$('.dlg-skip'); if (d) { await d.click(); await sleep(400); } else break; } await ev(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); document.querySelectorAll('#toast-root .toast, .ach-toast').forEach((t) => t.remove()); }); };

  /* ---------- a brand-new player: the avatar creator comes first ---------- */
  await page.goto(srv.url); await page.waitForSelector('.logo');
  await ev(() => { try { localStorage.clear(); } catch (e) {} A.UI.showTitle(); });
  await page.click('[data-act=newgame]'); await page.waitForSelector('.avc.first');
  ok(!!(await page.$('.avc.first')) && !(await page.$('.intro')), 'New Game opens the avatar creator before the story starts');
  ok(!(await page.$('.avc.first .x')), 'the first-time creator cannot be dismissed without confirming');
  await page.click('.overlay', { position: { x: 5, y: 5 } }); await sleep(200);
  ok(!!(await page.$('.avc.first')), 'tapping outside does not skip it');
  await page.click('[data-act=avStep][data-k=hair][data-d="1"]'); await page.click('[data-act=avStep][data-k=hairCol][data-d="1"]'); await page.click('[data-act=avStep][data-k=acc][data-d="1"]');
  await page.fill('#avc-name', 'Tester<script>'); await shot('01-creator');
  await page.click('#avc-ok'); await page.click('#avc-ok').catch(() => {}); await sleep(600);
  const av = await ev(() => A.State.state.avatar);
  ok(av.made && av.look.hair === 1 && av.look.hairCol === 2 && av.look.acc === 1 && av.name === 'Testerscript', 'the chosen look and a cleaned-up name are saved');
  ok(!!(await page.$('.intro')), 'confirming continues into the story');
  // skip the intro and the starter choice
  await page.click('[data-act=introSkip]'); await sleep(900); await calm(); await sleep(300);
  await ev(() => { const s = A.State.state; if (!s.starter) { s.starter = 'lumifern'; s.phase = 'play'; A.Rules.addAmina(s, 'lumifern', 1); A.State.save(); } });
  await page.reload(); await page.waitForSelector('.logo'); await page.click('[data-act=continue]'); await sleep(1000); await calm();
  ok(!(await page.$('.avc')) && !!(await page.$('#world')), 'a returning player loads straight into the island (no creator)');
  ok(await ev(() => A.State.state.avatar.look.hair === 1), 'the avatar survives a reload');

  /* ---------- an existing (pre-Dev 8) save ---------- */
  await ev(() => {
    const s = A.State.fresh(); s.schema = 5; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.settings.creatures3d = false; s.res = { gold: 6000, food: 400, gems: 20 }; s.rank = 6;
    ['lumifern', 'kairyu', 'pyrokai'].forEach((sp, i) => s.aminas.push({ uid: i + 1, sp, lv: 10 + i, xp: 0, gear: { weapon: null, armour: null, charm: null } })); s.nextUid = 4; s.active = 1; s.owned = { lumifern: true, kairyu: true, pyrokai: true };
    ['hollow', 'tidegate', 'hatchery'].forEach((id) => { s.struct[id] = true; s.buildings[id].level = 1; s.buildings[id].state = 'built'; });
    s.missions = { m_hollow: 'claimed' }; delete s.avatar; delete s.essence; delete s.ach; s.aminas.forEach((a) => delete a.mv);
    A.State.save = () => true; // stop the page's unload handler from writing the current game over the injected save
    localStorage.setItem(A.Data.SAVE_KEY, JSON.stringify(s)); localStorage.removeItem(A.Data.SAVE_KEY + '-backup');
  });
  await page.reload(); await page.waitForSelector('.logo'); await page.click('[data-act=continue]'); await sleep(1100); await calm();
  ok(!(await page.$('.avc')) && !!(await page.$('#world')), 'an existing save loads into the island without forcing the creator');
  ok(await ev(() => A.State.state.schema === 6 && A.State.state.res.gold === 6000 && A.State.state.aminas.length === 3), 'it migrated to schema 6 with progress intact');
  await page.mouse.move(820, 200); await shot('02-island');

  /* ---------- HUD: avatar, Player Rank, pixel currencies ---------- */
  const hud = await ev(() => { const a = document.querySelector('.hud-top .avatar-btn'), r = a && a.getBoundingClientRect(); return { a: !!a, left: r && r.left, top: r && r.top, px: document.querySelectorAll('.pill.res svg.ico.px').length, text: document.body.innerText }; });
  ok(hud.a && hud.left < 40 && hud.top < 30, 'the player’s avatar head sits in the top-left corner');
  ok(/PLAYER RANK 6/.test(hud.text) && !/CARETAKER RANK|Caretaker Rank/i.test(hud.text), 'the HUD says Player Rank (no Caretaker Rank)');
  ok(hud.px === 3, 'gold, food and gems use the new pixel sprites');
  ok(await ev(() => !!document.querySelector('.avatar-btn .badge.dot')), 'a not-yet-customised avatar shows a gentle hint, not a forced screen');
  await page.click('.avatar-btn'); await page.waitForSelector('.profile');
  const tabs = await ev(() => [...document.querySelectorAll('.profile .dtab')].map((b) => b.textContent.replace(/\d+$/, '').trim()));
  ok(tabs.join('|') === 'Player Stats|Achievements|Customisation', 'tapping it opens the profile: Player Stats, Achievements, Customisation');
  ok(await ev(() => /Player Rank/.test(document.querySelector('.profile').innerText) && /Battles won/.test(document.querySelector('.profile').innerText)), 'Player Stats shows rank and real statistics');
  await page.click('[data-act=pfTab][data-tab=ach]'); await sleep(200);
  ok(await ev(() => document.querySelectorAll('.profile .ach').length >= 15 && !!document.querySelector('.profile .ach .bar')), 'Achievements lists progress');
  await shot('03-profile-ach');
  await page.click('[data-act=pfTab][data-tab=cust]'); await page.click('[data-act=avOpen]'); await page.waitForSelector('.avc:not(.first)');
  await page.click('[data-act=avStep][data-k=outfit][data-d="1"]'); await page.click('#avc-ok'); await sleep(600);
  ok(await ev(() => A.State.state.avatar.made && A.State.state.avatar.look.outfit === 1 && !document.querySelector('.avatar-btn .badge.dot')), 'Customisation reopens the creator and saves the change');
  await calm();

  /* ---------- the monster preview ---------- */
  const comp = await ev(() => { const c = document.querySelector('#comp'); return { w: c.getBoundingClientRect().width, feed: !!c.querySelector('[data-act=feedSel]') }; });
  ok(comp.w <= 252, 'the monster preview is smaller (' + Math.round(comp.w) + 'px wide, was 354px)');
  ok(!comp.feed, 'no feed buttons until a monster is picked');
  await ev(() => { A.UI.selStep(1); }); const shown = await ev(() => +document.querySelector('#comp').dataset.uid);
  await page.click('#comp .art'); await sleep(200);
  const pk = await ev(() => ({ picked: A.UI.selPicked, txt: document.querySelector('#comp .feedfor').textContent, feed: document.querySelectorAll('#comp [data-act=feedSel]').length }));
  ok(pk.picked === shown && pk.feed === 2 && /Feeding/.test(pk.txt), 'tapping it picks that monster and shows who will be fed, then Snack and Feast');
  await shot('04-picked');
  await ev(() => { A.UI.selLast = Date.now() - 10000; A.UI.selTick(); });
  ok(await ev((u) => +document.querySelector('#comp').dataset.uid === u, shown), 'the card holds still while a monster is picked');
  const f0 = await ev(() => ({ food: A.State.state.res.food, xp: A.Rules.inst(A.State.state, A.UI.selPicked).xp, others: A.State.state.aminas.filter((a) => a.uid !== A.UI.selPicked).map((a) => a.xp).join() }));
  await page.click('#comp [data-act=feedSel][data-kind=snack]'); await sleep(400);
  const f1 = await ev(() => ({ food: A.State.state.res.food, xp: A.Rules.inst(A.State.state, A.UI.selPicked).xp, others: A.State.state.aminas.filter((a) => a.uid !== A.UI.selPicked).map((a) => a.xp).join() }));
  ok(f1.food === f0.food - 3 && f1.xp > f0.xp && f1.others === f0.others, 'a Snack costs 3 food and feeds only the picked monster');
  await ev(() => { A.UI.queue.length = 0; A.UI.closeAll(); }); await page.click('#comp [data-act=selUnpick]'); await sleep(200);
  ok(await ev(() => !A.UI.selPicked && !document.querySelector('#comp [data-act=feedSel]')), 'closing the pick hides the feed buttons again');
  await ev(() => { const a = A.State.state.aminas[0]; a.lv = 30; A.UI.selUid = a.uid; A.UI.selPicked = a.uid; A.UI.selRender(); });
  ok(await ev(() => !document.querySelector('#comp [data-act=feedSel]') && /no more food/.test(document.querySelector('#comp').innerText)), 'at the level cap the feed buttons are hidden');
  await ev(() => { A.State.state.aminas[0].lv = 10; A.UI.selPicked = null; A.UI.selRender(); });

  /* ---------- moves: same data from every screen ---------- */
  await ev(() => { A.Rules.Essence.gain(A.State.state, 'light', 40); A.State.save(); const a = A.State.state.aminas[0]; A.UI.selUid = a.uid; A.UI.selPicked = a.uid; A.UI.selRender(); });
  await page.click('#comp [data-act=mvOpen]'); await page.waitForSelector('.overlay .moves');
  const mvBtn = '.overlay .moves [data-act=mvUp][data-slot="0"]';
  await page.click(mvBtn); await page.click(mvBtn).catch(() => {}); await sleep(500);
  const mv = await ev(() => ({ lv: A.State.state.aminas[0].mv[0], ess: A.Rules.Essence.get(A.State.state, 'light'), shown: document.querySelector('.overlay .moves .mv .mv-lv').textContent }));
  ok(mv.lv === 2 && mv.ess === 30 && mv.shown === 'Lv 2', 'upgrading from the preview spends 10 Light Essence once (double tap) and shows Lv 2');
  await calm();
  await ev(() => A.UI.detail('lumifern', { uid: A.State.state.aminas[0].uid, tab: 'moves' })); await sleep(300);
  ok(await ev(() => /Lv 2/.test(document.querySelector('.overlay [data-panel=moves]').innerText) && /Lv 2/.test(document.querySelector('.overlay [data-panel=battle]').textContent)), 'the Creatures detail (Moves and Battle tabs) shows the same Lv 2');
  await sleep(800); await page.click('.overlay [data-panel=moves] [data-act=mvUp][data-slot="0"]'); await sleep(400);
  ok(await ev(() => A.State.state.aminas[0].mv[0] === 3 && A.Rules.Essence.get(A.State.state, 'light') === 5), 'and can upgrade there too (Lv 3, 25 more essence)');
  await shot('05-moves-detail'); await calm();

  /* ---------- live building placement (no Done) ---------- */
  await ev(() => { const s = A.State.state, W = A.World; const sp = W.findSpot(s, 'starter', 'lantern', 0, [8, 12]); const r = W.buildNew(s, 'starter', 'lantern', sp[0], sp[1], 0); A.Rules.drain(); A.State.save(); A.UI.refresh(); });
  const lid = await ev(() => Object.keys(A.State.state.buildings).find((k) => A.State.state.buildings[k].type === 'lantern'));
  await ev(() => A.UI.enterBuild()); await ev((id) => A.UI.selectForMove(id), lid); await sleep(300);
  ok(!(await page.$('[data-act=bmConfirm]')) && !/\bDone\b/.test(await page.textContent('#bbar-root')), 'moving a placed building has no Done button');
  const p0 = await ev((id) => { const b = A.State.state.buildings[id]; return { x: b.x, y: b.y }; }, lid);
  const target = await ev((id) => { const s = A.State.state, W = A.World, b = s.buildings[id]; for (let d = 2; d < 8; d++) for (const [dx, dy] of [[d, 0], [0, d], [-d, 0], [0, -d]]) if (W.canPlace(s, 'starter', 'lantern', b.x + dx, b.y + dy, 0, id).ok) return [b.x + dx, b.y + dy]; return null; }, lid);
  await ev((t) => { A.UI.ghostTo(t[0], t[1]); A.UI.ghostRelease(); }, target); await sleep(300);
  const p1 = await ev((id) => { const b = A.State.state.buildings[id]; return { x: b.x, y: b.y }; }, lid);
  ok(p1.x === target[0] && p1.y === target[1], 'dropping it on a valid spot moves it for real, straight away');
  const bad = await ev((id) => { const s = A.State.state, W = A.World; const h = s.buildings.hollow; return [h.x, h.y]; }, lid);
  await ev((t) => { A.UI.ghostTo(t[0], t[1]); A.UI.ghostRelease(); }, bad); await sleep(200);
  const p2 = await ev((id) => { const b = A.State.state.buildings[id], g = A.UI.bm.ghost; return { x: b.x, y: b.y, gx: g.x, gy: g.y, msg: document.querySelector('#bbar-root').innerText }; }, lid);
  ok(p2.x === p1.x && p2.y === p1.y && p2.gx === p1.x && /stays where it was/.test(p2.msg), 'an invalid drop is refused and it snaps back, with a reason');
  await shot('06-placement');
  await page.reload(); await page.waitForSelector('.logo'); await page.click('[data-act=continue]'); await sleep(900); await calm();
  ok(await ev((a) => { const b = A.State.state.buildings[a[0]]; return b.x === a[1] && b.y === a[2]; }, [lid, p1.x, p1.y]), 'the new position survives a reload');
  await ev((id) => { A.UI.enterBuild(); A.UI.selectForMove(id); }, lid); await sleep(200);
  await ev((t) => { A.UI.ghostTo(t[0] + 0, t[1]); }, [p1.x, p1.y]);
  const t2 = await ev((id) => { const s = A.State.state, W = A.World, b = s.buildings[id]; for (let d = 1; d < 8; d++) for (const [dx, dy] of [[d, 0], [0, d], [-d, 0], [0, -d]]) if (W.canPlace(s, 'starter', 'lantern', b.x + dx, b.y + dy, 0, id).ok) return [b.x + dx, b.y + dy]; return null; }, lid);
  await ev((t) => { A.UI.ghostTo(t[0], t[1]); A.UI.ghostRelease(); }, t2); await sleep(200);
  await page.click('[data-act=bmCancel]'); await sleep(200);
  ok(await ev((a) => { const b = A.State.state.buildings[a[0]]; return b.x === a[1] && b.y === a[2]; }, [lid, p1.x, p1.y]), 'Undo puts it back where this move started');
  await ev(() => { A.UI.exitBuild(); });

  /* ---------- habitat production ---------- */
  const hid = await ev(() => { const s = A.State.state, W = A.World; s.res.gold += 3000; const sp = W.findSpot(s, 'starter', 'hab_water', 0, [10, 10]); W.buildNew(s, 'starter', 'hab_water', sp[0], sp[1], 0); const id = Object.keys(s.buildings).find((k) => s.buildings[k].type === 'hab_water'); const b = s.buildings[id]; b.state = 'built'; b.level = 1; delete b.endAt; W.assign(s, id, s.aminas[1].uid); b.stock = 25; A.State.save(); A.UI.refresh(); return id; });
  await ev((id) => A.UI.buildingPanel(id), hid); await page.waitForSelector('.prodsel');
  ok(await ev(() => [...document.querySelectorAll('.prodopt b')].map((b) => b.textContent).join('|') === 'Gold|Water Essence'), 'a Water Habitat offers Gold or Water Essence');
  const g0 = await ev(() => A.State.state.res.gold);
  await page.click('.prodopt[data-k=ess_water]'); await page.waitForSelector('#cf-yes'); await page.click('#cf-yes'); await sleep(400);
  const hp = await ev((a) => ({ k: A.World.prodKind(A.State.state.buildings[a]), gold: A.State.state.res.gold }), hid);
  ok(hp.k === 'ess_water' && hp.gold === g0 + 25, 'switching asks first, collects the 25 stored gold, then makes Water Essence');
  await shot('07-habitat');
  await page.reload(); await page.waitForSelector('.logo'); await page.click('[data-act=continue]'); await sleep(800); await calm();
  ok(await ev((a) => A.World.prodKind(A.State.state.buildings[a]) === 'ess_water', hid), 'the choice persists after a reload');

  /* ---------- wallet ---------- */
  await page.click('.pill.res'); await page.waitForSelector('.wallet');
  ok(await ev(() => document.querySelectorAll('.wallet .wrow').length === 12), 'the wallet lists gold, food, gems and nine essences');
  await calm();

  /* ---------- dungeon battle scenery ---------- */
  const bgs = await ev(() => { const D = A.Data, out = {}; Object.keys(D.DUNGEONS).forEach((id) => { const d = D.DUNGEONS[id], n = d.battles[3], bo = d.battles[9]; const draw = (spec, boss) => { const env = spec.env || d.env; return A.Art.hasEnv(env) ? A.Art.envBg(env, { boss }) : A.Art.battleBg(boss ? 'boss' : '', id); }; out[id] = [draw(n, false), draw(bo, true)]; }); return out; });
  const normals = Object.values(bgs).map((x) => x[0]);
  ok(new Set(normals).size === normals.length, 'every dungeon has its own battle backdrop (' + normals.length + ' different)');
  ok(Object.values(bgs).every((x) => x[0] !== x[1]), 'every boss room looks different from that dungeon’s normal battles');

  /* ---------- pixel bursts are cleaned up ---------- */
  await ev(() => { for (let i = 0; i < 5; i++) A.UI.pixelBurst(300 + i * 20, 200, { n: 14 }); });
  const n1 = await ev(() => document.querySelectorAll('.pxb-wrap').length); await sleep(1100);
  const n2 = await ev(() => document.querySelectorAll('.pxb-wrap').length);
  ok(n1 === 5 && n2 === 0, 'pixel bursts remove themselves (5 → 0 after a second)');

  /* ---------- other phone sizes ---------- */
  for (const [w, h] of [[667, 375], [932, 430]]) {
    await page.setViewportSize({ width: w, height: h }); await sleep(400);
    const fit = await ev(() => { const r = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; }; const c = r('#comp'), n = r('.nav'), a = r('.avatar-btn'); return { overlap: !!(c && n && c.right > n.left && c.bottom > n.top), inside: c && a && c.left >= 0 && a.top >= 0 && c.bottom <= innerHeight }; });
    ok(!fit.overlap && fit.inside, w + '×' + h + ': avatar, preview and buttons fit without overlapping');
  }
  ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\nbrowser dev8: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error('ERROR ' + (e && e.message ? e.message.split('\n').slice(0,14).join('\n') : e)); process.exit(1); });
