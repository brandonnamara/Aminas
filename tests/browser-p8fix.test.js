// Phase 8 follow-up fixes — real-browser test (Chromium + Playwright, SwiftShader software WebGL; NOT a phone).
// After the first iPhone test of Phase 8:
//  1. The details screen opens for a form you befriended but no longer have because it evolved. It used to throw
//     (inst.lv on null) inside the tap, so nothing opened: the polished Umbrit, Cannonis and Aimza could not be
//     opened once they had evolved. It now shows the creature (3D viewer, clips, sounds) and its information.
//  2. Developer panel → Phase 8 showcase: view any polished form, or start a practice battle with one, whether or not
//     you own it. Nothing is written to the save.
//  3. Sound: starts on any tap (touchend, pointerup, click, key), recovers from iOS's "interrupted" state, asks iOS
//     for the "playback" audio session while sound is on (the silent switch no longer mutes it) and hands it back
//     when sound and music are both off; older iOS without that API gets a one-off silent clip; Sound check panel.
// The iPhone-only parts (the silent switch, real interruptions) cannot happen here: the test fakes the browser
// APIs and checks that the game asks for the right things.
// Run: node tests/browser-p8fix.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const IPHONE_OLD = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1';

// A fake Audio Session API (iOS 16.4+) and an AudioContext whose state can be forced to iOS's "interrupted"
const FAKE_SESSION = () => { const s = { type: 'auto', sets: [] }; Object.defineProperty(Navigator.prototype, 'audioSession', { configurable: true, get: () => ({ get type() { return s.type; }, set type(v) { s.type = v; s.sets.push(v); } }) }); window.__session = s; };
const FAKE_INTERRUPT = () => {
  const Real = window.AudioContext; window.__ac = { force: null, resumes: 0, made: 0 };
  class AC extends Real { constructor(o) { super(o); window.__ac.made++; } get state() { return window.__ac.force || super.state; } resume() { window.__ac.resumes++; window.__ac.force = null; return super.resume(); } }
  window.AudioContext = AC;
  // record silent-clip attempts (older iOS fallback)
  const play = HTMLMediaElement.prototype.play; window.__clips = []; HTMLMediaElement.prototype.play = function () { window.__clips.push((this.src || '').slice(0, 22)); try { return play.call(this); } catch (e) { return Promise.resolve(); } };
};

async function boot(browser, srv, o) {
  o = o || {};
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }, o.ctx || {}));
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
  for (const f of o.init || []) await page.addInitScript(f);
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.Showcase && A.Audio);
  return { ctx, page, errors };
}
// a playing save: the given Aminas at level 20; evolve: each one that can evolve is evolved the normal way
const SETUP = ({ ids, evolve }) => {
  const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = s.starter || 'lumifern'; s.settings.creatures3d = true; s.res.food = 50000; s.res.gold = 1e6; s.res.gems = 5000;
  ids.forEach((id) => A.Rules.addAmina(s, id, 20)); const evo = {};
  if (evolve) s.aminas.forEach((a) => { const e = A.Data.SPECIES[a.sp].evo; if (!e) return; a.lv = Math.max(a.lv, e.lv); const from = a.sp, r = A.Rules.evolve(s, a.uid); evo[from] = r.ok ? r.to : 'no: ' + r.reason; });
  A.Rules.drain(); if (A.UI.queue) A.UI.queue.length = 0; // skip the evolution scenes: this test is about the screens afterwards
  A.State.save(); A.UI.closeAll(); A.UI.showIsland(); setTimeout(() => A.UI.closeAll(), 300);
  return { evo, have: s.aminas.map((a) => a.sp), owned: Object.keys(s.owned) };
};
// clears notices and the Entity's story lines (an evolution starts one), so taps reach the screen under them
const settle = (page) => page.evaluate(async () => {
  for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 120)); const d = document.querySelectorAll('.dlg .dlg-skip'); d.forEach((b) => b.click()); A.UI.closeAll(); if (!d.length && i > 6) break; }
  document.querySelectorAll('.dlg').forEach((x) => x.remove()); A.UI.closeAll();
});
const detailOv = (page) => page.evaluate(() => { const o = [...document.querySelectorAll('.overlay')].find((x) => x._detail); if (!o) return null;
  return { sp: o._sp, name: (o.querySelector('.sh-head h2') || {}).textContent, note: (o.querySelector('.ghost-note') || {}).textContent || '', tabs: [...o.querySelectorAll('.dtab')].map((b) => b.dataset.tab), clips: [...o.querySelectorAll('[data-act="vPlay"]')].map((b) => b.dataset.clip), live: !!o.querySelector('.viewer3d.live'), feed: !!o.querySelector('[data-act="detailFeed"]') }; });
const waitLive = async (page) => { for (let i = 0; i < 60; i++) { const d = await detailOv(page); if (d && d.live) return true; await sleep(200); } return false; };
const tapAct = async (page, sel) => { await page.waitForSelector(sel, { state: 'visible' }); await page.tap(sel); };

(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ARGS });

  /* ================= 1. details screen for forms that evolved ================= */
  {
    const { ctx, page, errors } = await boot(browser, srv);
    const st = await page.evaluate(SETUP, { ids: ['umbrit', 'cannonis', 'aimza', 'lumifern'], evolve: true });
    ok(['umbrit', 'cannonis', 'aimza', 'lumifern'].every((id) => st.owned.includes(id) && !st.have.includes(id)) && Object.values(st.evo).every((v) => !/^no/.test(v)), 'setup: Umbrit, Cannonis, Aimza and Lumifern were befriended and have all evolved (' + JSON.stringify(st.evo) + ')');
    await settle(page);
    // the case that failed on the iPhone, reproduced on the old code path: the details call itself
    const direct = await page.evaluate(() => { try { const ov = A.UI.detail('cannonis'); const r = !!ov && ov._detail; A.UI.closeAll(); return r; } catch (e) { return 'threw: ' + e.message; } });
    ok(direct === true, 'opening an evolved-away form no longer throws (' + direct + ')');
    await tapAct(page, '[data-act="collection"]');
    const opened = {};
    for (const id of ['umbrit', 'cannonis', 'aimza', 'lumifern']) {
      const errs0 = errors.length;
      await page.tap('.card[data-sp="' + id + '"]'); await sleep(400);
      const d = await detailOv(page), live = d ? await waitLive(page) : false;
      opened[id] = { d, live, errs: errors.slice(errs0) };
      if (d) await page.evaluate(() => { const o = [...document.querySelectorAll('.overlay')].find((x) => x._detail); A.UI.close(o); });
      await sleep(200);
    }
    for (const id of ['umbrit', 'cannonis', 'aimza']) {
      const o = opened[id], grown = st.evo[id];
      ok(o.d && o.d.sp === id && o.errs.length === 0, 'tapping ' + id + ' in Creatures opens its details screen (no error)' + (o.errs.length ? ': ' + o.errs[0] : ''));
      ok(o.d && o.live && o.d.clips.includes('special') && o.d.clips.includes('attack'), id + ': the 3D model loads, with the clip buttons and Special');
      ok(o.d && /has grown into/.test(o.d.note) && o.d.note.indexOf(await page.evaluate((g) => A.Data.SPECIES[g].name, grown)) >= 0 && o.d.tabs.join() === 'about,battle,growth' && !o.d.feed, id + ': says what it grew into, has About, Battle and Growth, and no feed buttons (nothing to feed)');
    }
    ok(opened.lumifern.d && opened.lumifern.d.sp === 'lumifern' && opened.lumifern.live && opened.lumifern.d.clips.includes('special'), 'the fix is general: an evolved Lumifern opens too (and, polished in Phase 8B, it has the Special button as well)');
    // tabs, clip buttons and sounds on the evolved-away screen
    await page.tap('.card[data-sp="aimza"]'); await waitLive(page);
    await page.evaluate(() => { const m = A.Audio.monster; window.__mon = []; A.Audio.monster = function (sp, cue, o) { window.__mon.push(sp + ':' + cue); return m.call(this, sp, cue, o); }; });
    const ov = '.overlay:last-child';
    await page.tap(ov + ' .dtab[data-tab="battle"]'); await sleep(150);
    const tabOk = await page.evaluate(() => { const o = [...document.querySelectorAll('.overlay')].find((x) => x._detail); const vis = [...o.querySelectorAll('.dpanel')].filter((p) => !p.hidden).map((p) => p.dataset.panel); return vis.join() === 'battle' && /Echo Wave/.test(o.querySelector('.dpanel[data-panel="battle"]').textContent); });
    ok(tabOk, 'its tabs switch (Battle shows its moves and base stats)');
    await page.tap(ov + ' [data-act="vPlay"][data-clip="special"]'); await sleep(700);
    await page.tap(ov + ' [data-act="vPlay"][data-clip="attack"]'); await sleep(500);
    const played = await page.evaluate(() => { const o = [...document.querySelectorAll('.overlay')].find((x) => x._detail); const r = A.UI.viewOf(o); return { mon: window.__mon.slice(), clip: r && r.v && r.v.debug ? r.v.debug().playing : null }; });
    ok(played.mon.includes('aimza:special') && played.mon.includes('aimza:attack'), 'Special and Attack play the animation and its sound (' + played.mon.join(', ') + ')');
    ok(errors.length === 0, 'no script errors on the details screens' + (errors.length ? ': ' + errors.slice(0, 2).join(' | ') : ''));
    await ctx.close();
  }

  /* ================= 2. developer panel: Phase 8 showcase ================= */
  {
    const { ctx, page, errors } = await boot(browser, srv);
    await page.evaluate(SETUP, { ids: ['lumifern'], evolve: false }); await settle(page);
    const snap = () => page.evaluate(() => { const s = A.State.state; return JSON.stringify({ a: s.aminas, o: s.owned, sn: s.seen, r: s.res, rk: [s.rank, s.rankXp], run: s.run || null, st: s.stats }); });
    const before = await snap();
    await tapAct(page, '[data-act="settings"]');
    for (let i = 0; i < 7; i++) { await page.tap('[data-act="verTap"]'); await sleep(380); }
    ok(await page.isVisible('[data-act="showcase"]') && await page.isVisible('[data-act="soundCheck"]'), 'Settings → tap the version line 7 times → the developer panel has "Monster showcase" and "Sound check"');
    await page.tap('[data-act="showcase"]'); await sleep(300);
    const rows = await page.evaluate(() => [...document.querySelectorAll('[data-act="showView"]')].map((b) => b.dataset.sp + (b.parentNode.querySelector('[data-act="showFight"]') ? '+fight' : '')));
    ok(rows.slice(0, 5).join() === 'umbrit+fight,cannonis+fight,aimza+fight,aimza2+fight,aimza3+fight', 'the showcase lists the five Phase 8 forms first, each with View and Battle (' + rows.slice(0, 5).join(', ') + ')');
    ok(rows.length === 63 && rows.every((r) => /\+fight$/.test(r)) && new Set(rows).size === 63, 'Phase 8B: then the whole roster by line, every form with View and Battle (' + rows.length + ' forms)');
    await page.tap('[data-act="showView"][data-sp="aimza3"]'); await sleep(300);
    const pv = await detailOv(page), pvLive = await waitLive(page);
    ok(pv && pv.sp === 'aimza3' && /Showcase preview/.test(pv.note) && pvLive && pv.clips.includes('special') && !pv.feed, 'View opens Aimza III (not owned) with its 3D model, clip buttons and Special, marked as a preview');
    await page.evaluate(() => { const o = [...document.querySelectorAll('.overlay')].find((x) => x._detail); A.UI.close(o); }); await sleep(200);
    await page.tap('[data-act="showFight"][data-sp="umbrit"]');
    const fight = await page.evaluate(async () => { for (let i = 0; i < 100 && !(A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d); i++) await new Promise((r) => setTimeout(r, 100)); const U = A.UI.B; return U ? { kind: U.ctx.kind, p: U.b.party[U.b.pi].sp, e: U.b.enemy.sp, is3d: !!(U.stage && U.stage.is3d) } : null; });
    ok(fight && fight.kind === 'showcase' && fight.p === 'umbrit' && fight.e === 'cannonis' && fight.is3d, 'Battle starts a 3D practice battle: Umbrit against Cannonis (' + JSON.stringify(fight) + ')');
    // play two turns, then leave
    for (let t = 0; t < 2; t++) {
      await page.waitForFunction(() => A.UI.B && !A.UI.B.busy && document.querySelector('#b-actions .abtn.ready'), null, { timeout: 30000 });
      await page.evaluate(() => document.querySelector('#b-actions .abtn.ready:not(.special)').click());
      await page.waitForFunction(() => A.UI.B && !A.UI.B.busy, null, { timeout: 30000 }); await sleep(200);
    }
    const logged = await page.evaluate(async () => (A.UI.B.stage.debug ? A.UI.B.stage.debug().log.join(' ') : ''));
    ok(/move:p:(shadenip|gloomveil)/.test(logged), 'its moves play their Phase 8 sequences in the practice battle');
    await page.tap('[data-act="bRetreat"]'); await tapAct(page, '#cf-yes'); await sleep(600);
    const back = await page.evaluate(() => ({ screen: A.UI.screen, inBattle: !!A.UI.B, panel: !!document.querySelector('[data-act="showFight"]') }));
    ok(back.screen === 'island' && !back.inBattle && back.panel, 'leaving returns to the island with the showcase still open');
    await page.tap('[data-act="showFight"][data-sp="infernox"]');
    const f2 = await page.evaluate(async () => { for (let i = 0; i < 100 && !(A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d); i++) await new Promise((r) => setTimeout(r, 100)); const U = A.UI.B; return U ? { kind: U.ctx.kind, p: U.b.party[U.b.pi].sp, e: U.b.enemy.sp, is3d: !!(U.stage && U.stage.is3d) } : null; });
    ok(f2 && f2.kind === 'showcase' && f2.p === 'infernox' && f2.e === 'oceanfang' && f2.is3d, 'Phase 8B: any roster form battles too: Emberix III against a rival line\'s third form, Kairyu III (' + JSON.stringify(f2) + ')');
    await page.waitForFunction(() => A.UI.B && !A.UI.B.busy, null, { timeout: 30000 });
    await page.tap('[data-act="bRetreat"]'); await tapAct(page, '#cf-yes'); await sleep(600);
    ok(await snap() === before, 'nothing in the save changed: Aminas, befriended and seen forms, resources, rank, runs and statistics');
    ok(errors.length === 0, 'no script errors in the showcase' + (errors.length ? ': ' + errors.slice(0, 2).join(' | ') : ''));
    await ctx.close();
  }

  /* ================= 3. sound on iPhone ================= */
  {
    const { ctx, page, errors } = await boot(browser, srv, { init: [FAKE_SESSION, FAKE_INTERRUPT] });
    await page.evaluate(SETUP, { ids: ['lumifern'], evolve: false }); await settle(page);
    const a0 = await page.evaluate(() => ({ d: A.Audio.diag(), type: window.__session.type }));
    ok(a0.d.context === 'not started' && a0.type === 'auto', 'before any tap: no sound started and the audio session left alone');
    // a tap on the island (not a button) is enough to start sound
    await page.touchscreen.tap(430, 230); await sleep(400);
    const a1 = await page.evaluate(() => ({ d: A.Audio.diag(), type: window.__session.type, made: window.__ac.made }));
    ok(a1.made === 1 && a1.d.context === 'running', 'a tap anywhere starts the sound (no button needed): ' + a1.d.context);
    ok(a1.type === 'playback' && a1.d.session === 'playback', 'with sound on, the game asks iOS for the "playback" audio session, which the silent switch does not mute');
    // iOS leaves the context "interrupted" after a call, Siri or another app's audio; the old code never resumed it
    await page.evaluate(() => { window.__ac.force = 'interrupted'; });
    const blocked = await page.evaluate(() => { const m = A.Audio.monster('umbrit', 'tap'); return { m, s: A.Audio.ctxState() }; });
    ok(blocked.s === 'interrupted' && blocked.m === false, 'while interrupted nothing can play (as on the phone)');
    const r0 = await page.evaluate(() => window.__ac.resumes);
    await page.touchscreen.tap(430, 230); await sleep(300);
    const a2 = await page.evaluate(() => ({ resumes: window.__ac.resumes, s: A.Audio.ctxState(), m: A.Audio.monster('umbrit', 'tap') }));
    ok(a2.resumes > r0 && a2.s === 'running' && a2.m === true, 'the next tap resumes it, and monster sounds play again');
    // settings: both off hands the session back; sound on asks again
    await tapAct(page, '[data-act="settings"]');
    await page.tap('[data-act="setPref"][data-k="sfx"]'); await sleep(150); await page.tap('[data-act="setPref"][data-k="music"]'); await sleep(150);
    const off = await page.evaluate(() => ({ type: window.__session.type, sfx: A.Audio.sfxOn, music: A.Audio.musicOn, m: A.Audio.monster('umbrit', 'tap') }));
    ok(off.type === 'auto' && !off.sfx && !off.music && off.m === false, 'with sound effects and music both off: silent, and the audio session is handed back to iOS');
    await page.tap('[data-act="setPref"][data-k="sfx"]'); await sleep(150);
    ok(await page.evaluate(() => window.__session.type) === 'playback', 'turning sound effects back on asks for "playback" again');
    // Sound check (developer panel)
    for (let i = 0; i < 7; i++) { await page.tap('[data-act="verTap"]'); await sleep(380); }
    await page.tap('[data-act="soundCheck"]'); await sleep(600);
    const sc = await page.evaluate(() => { const o = [...document.querySelectorAll('.overlay')].pop(); return o.textContent; });
    ok(/Audio:\s*running/.test(sc) && /iOS audio session:\s*playback/.test(sc) && /Sound effects setting:\s*on/.test(sc), 'Sound check shows the audio state, the iOS audio session and the settings');
    await page.evaluate(() => { const m = A.Audio.monster; window.__mon = []; A.Audio.monster = function (sp, cue, o) { const r = m.call(this, sp, cue, o); window.__mon.push(sp + ':' + cue + ':' + r); return r; }; });
    await page.tap('[data-act="scPlay"][data-k="cannonis"]'); await sleep(500);
    ok((await page.evaluate(() => window.__mon)).includes('cannonis:special:true'), 'its buttons play the monster sounds');
    ok(errors.length === 0, 'no script errors (sound)' + (errors.length ? ': ' + errors.slice(0, 2).join(' | ') : ''));
    await ctx.close();
  }
  {
    // older iOS (no Audio Session API): a one-off silent clip in the first tap; desktop browsers: nothing extra
    const old = await boot(browser, srv, { init: [FAKE_INTERRUPT], ctx: { userAgent: IPHONE_OLD } });
    await old.page.evaluate(SETUP, { ids: ['lumifern'], evolve: false }); await settle(old.page);
    await old.page.touchscreen.tap(430, 230); await sleep(400); await old.page.touchscreen.tap(430, 230); await sleep(200);
    const o1 = await old.page.evaluate(() => ({ d: A.Audio.diag(), clips: window.__clips.filter((c) => /^data:audio\/wav/.test(c)).length }));
    ok(o1.d.ios && o1.d.session === 'not available' && o1.d.silentClip && o1.clips === 1 && o1.d.context === 'running', 'older iOS without the Audio Session API: one silent clip on the first tap, then sound runs');
    await old.ctx.close();
    const desk = await boot(browser, srv, { init: [FAKE_INTERRUPT], ctx: { isMobile: false, hasTouch: false } });
    await desk.page.evaluate(SETUP, { ids: ['lumifern'], evolve: false }); await settle(desk.page);
    await desk.page.mouse.click(430, 230); await sleep(400);
    const d1 = await desk.page.evaluate(() => ({ d: A.Audio.diag(), clips: window.__clips.length }));
    ok(!d1.d.ios && !d1.d.silentClip && d1.clips === 0 && d1.d.context === 'running', 'a desktop browser: a click starts the sound, with no silent clip');
    ok(old.errors.length === 0 && desk.errors.length === 0, 'no script errors (older iOS, desktop)');
    await desk.ctx.close();
  }

  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-p8fix)');
  await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
