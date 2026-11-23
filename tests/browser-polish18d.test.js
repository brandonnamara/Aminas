// Phase 18D, real-browser check (Chromium + Playwright, software WebGL, 844×390 touch; NOT an iPhone, and automated:
// no human played these). The ten Verdant arena variations (each dungeon fights in its own arena, at the same draw cost
// as the Starter arena it reuses), guardian effects landing on an unguarded Amina with the right battle-log lines, a
// guarded blow, the rare third-form encounter in Explore, the level-cap victory text, and no page errors.
// Run: node tests/browser-polish18d.test.js [shotsDir]
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000); page.on('pageerror', (e) => errors.push(e.message));
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = async (n) => { if (!SHOTS) return; await sleep(500); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 85 }); };
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 60000, polling: 60 });
  const tidy = () => ev(() => { A.UI.queue.length = 0; A.UI.busy = false; if (A.UI.B) { A.Rules.abandonRun && A.State.state.run && A.Rules.abandonRun(A.State.state); A.UI.leaveBattle(() => {}); } A.UI.closeAll(); document.querySelectorAll('.dlg,.toast,.reward-wrap,.scene').forEach((x) => x.remove()); if (!document.querySelector('#world')) A.UI.showIsland(); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title');
  await ev(() => { const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.avatar = { made: true, name: 'Rowan', look: null }; s.starter = 'lumifern';
    s.settings.sfx = false; s.settings.music = false; s.settings.quality = 'balanced'; A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false;
    ['lumifern', 'cannonis', 'emberix', 'terraflora'].forEach((sp) => R.addAmina(s, sp, 30)); s.islands.verdant = { unlocked: true, obstacles: {}, unlockedAt: Date.now(), by: 'boss' };
    Object.keys(D.DUNGEONS).forEach((id) => { const r = R.dungeonRec(s, id); r.clears = 1; r.next = 0; });
    s.story = s.story || {}; s.story.scenes = Object.assign({}, s.story.scenes, { v_arrival: 'seen', v_confront: 'seen' });
    s.res.gold = 3000; s.res.food = 3000; A.State.state = s; R.drain(); A.State.save(); A.UI.showIsland(true); });
  await until(() => !!document.querySelector('#world')); await sleep(600); await tidy();
  const battle = async (d, from, party) => {
    await tidy(); await sleep(200);
    await ev(({ d, from, party }) => { const s = A.State.state; A.Rules.startRun(s, d, (party || [0, 1, 2]).map((i) => s.aminas[i].uid), { from }); A.UI.startBattle(); }, { d, from, party });
    await until(() => A.UI.B && A.UI.B.b && document.querySelectorAll('#b-actions .abtn').length >= 2 && !A.UI.B.busy, null, 90000);
    await until(() => !A.UI.B.stage || !A.UI.B.stage.is3d || !!A.UI.B.stage.debug, null, 30000).catch(() => {});
    await ev(() => { if (A.UI.introOver) A.UI.introOver(); });
  };

  /* ---------- the ten Verdant arenas ---------- */
  const ids = await ev(() => A.Data.CAMPAIGN.verdant.dungeons.slice());
  const arenas = [];
  for (const id of ids) {
    await battle(id, 0);
    const a = await ev(async () => { const st = A.UI.B.stage, d = st && st.debug ? st.debug() : null, M = await import('/src/3d/runtime.js'), s = M.stats(); return { is3d: !!(st && st.is3d), arena: d && d.arena, atmo: !!(d && d.atmosphere), calls: s.drawCalls }; });
    arenas.push(Object.assign({ id }, a)); if (['v_mossgate', 'v_moonwell', 'v_elderroot'].includes(id)) await shot('arena-' + id);
  }
  ok(arenas.every((a) => a.is3d && a.arena === a.id), 'every Verdant dungeon fights in its own 3D arena (' + arenas.map((a) => a.arena).join(', ') + ')');
  ok(arenas.every((a) => a.atmo), 'each has its own light, fog and particles');
  await battle('forgottenroad', 0); const baseCalls = await ev(async () => (await import('/src/3d/runtime.js')).stats().drawCalls);
  const moss = arenas.find((a) => a.id === 'v_mossgate');
  ok(moss && moss.calls <= baseCalls + 1, 'the Mossgate arena draws no more than the Forgotten Road arena it is built from (' + (moss && moss.calls) + ' vs ' + baseCalls + ' draw calls)');
  ok(await ev(() => A.Data.DUNGEONS.forgottenroad && A.UI.B.stage.debug().arena === 'forgottenroad'), 'Starter dungeons keep their own arenas');

  /* ---------- guardian effects on an unguarded Amina ---------- */
  const EFF = [['v_aqueduct', 'Floodgate', 'soak', /is soaked and slows down!/], ['v_spore', 'Spore Bloom', 'weak', /attack fell!/], ['v_archive', 'Archive Seal', 'silence', /is silenced: no special abilities next turn!/], ['v_glow', 'Ember Canopy', 'burn', /is burning!/]];
  const landed = [];
  for (const [id, name, k, re] of EFF) {
    await battle(id, 9);
    // the player's Amina is made sturdy so the blow cannot knock it out (this checks the effect, not the damage)
    await ev(() => { const b = A.UI.B.b, p = b.party[b.pi]; p.hpMax = p.hp = 5000; b.enemy.chargeIn = 0; b.enemy.charging = false; window.__log = []; const lg = document.querySelector('#b-log'); new MutationObserver(() => window.__log.push(lg.textContent)).observe(lg, { childList: true, subtree: true, characterData: true }); });
    const press = (guard) => ev((guard) => { const bs = [...document.querySelectorAll('#b-actions .abtn.ready')]; const g = guard ? bs.find((b) => /guard/i.test(b.textContent + (b.dataset.id || ''))) : bs.find((b) => b.classList.contains('k-atk')); (g || bs[0]).click(); }, guard);
    await press(false); await until(() => !A.UI.B || (!A.UI.B.busy && A.UI.B.b.enemy.charging), null, 30000).catch(() => {});
    const tele = await ev((name) => new RegExp(name + ' is coming').test((window.__log || []).join(' | ')), name);
    await ev(() => { window.__log = []; }); await press(false); await until(() => !A.UI.B || (!A.UI.B.busy && !A.UI.B.b.enemy.charging), null, 30000).catch(() => {});
    const r = await ev((k) => { const b = A.UI.B.b, p = b.party[b.pi], st = p.status || {}; return { log: (window.__log || []).join(' | '), st: Object.keys(st).filter((x) => st[x]).concat(k === 'weak' && (p.weak || p.atkDown || (st.weak)) ? ['weak'] : []) }; }, k);
    landed.push({ id, tele, line: re.test(r.log), log: r.log.slice(0, 220) });
    if (id === 'v_archive') await shot('guardian-archive-seal');
  }
  landed.forEach((x) => ok(x.tele && x.line, x.id + ': the move is telegraphed, and when it lands unguarded the log names its effect' + (x.line ? '' : ' (log: ' + x.log + ')')));

  /* ---------- a guarded blow (Terraflora knows Leaf Guard) ---------- */
  await battle('v_twinshrine', 9, [3, 0, 1]);
  await ev(() => { const b = A.UI.B.b, p = b.party[b.pi]; p.hpMax = p.hp = 5000; b.enemy.chargeIn = 0; b.enemy.charging = false; window.__log = []; const lg = document.querySelector('#b-log'); new MutationObserver(() => window.__log.push(lg.textContent)).observe(lg, { childList: true, subtree: true, characterData: true }); });
  await ev(() => { const bs = [...document.querySelectorAll('#b-actions .abtn.ready')]; (bs.find((b) => b.classList.contains('k-atk')) || bs[0]).click(); });
  await until(() => !A.UI.B.busy && A.UI.B.b.enemy.charging, null, 30000).catch(() => {});
  const hp0 = await ev(() => A.UI.B.b.party[A.UI.B.b.pi].hp);
  await ev(() => { window.__log = []; const g = [...document.querySelectorAll('#b-actions .abtn.ready')].find((b) => /guard/i.test(b.textContent + (b.dataset.id || ''))); if (g) g.click(); });
  await until(() => !A.UI.B.busy && !A.UI.B.b.enemy.charging, null, 30000).catch(() => {});
  const gd = await ev(() => ({ log: (window.__log || []).join(' | '), hp: A.UI.B.b.party[A.UI.B.b.pi].hp, btn: [...document.querySelectorAll('#b-actions .abtn')].map((b) => b.className.replace('abtn', '') + ':' + b.textContent.trim().slice(0, 14)).join(',') }));
  ok(/The guard absorbed most of the blow!/.test(gd.log), 'guarding the charged Twin Eclipse: “The guard absorbed most of the blow!” (' + (hp0 - gd.hp) + ' damage taken)' + (/absorbed/.test(gd.log) ? '' : ' log: ' + gd.log.slice(0, 300) + ' buttons: ' + gd.btn));

  /* ---------- the rare third-form encounter ---------- */
  await tidy();
  await ev(() => { const s = A.State.state, D = A.Data; s.stats.explores = s.stats.explores || {}; s.stats.explores.glowcap = D.AREAS.glowcap.steps.length; s.v18 = s.v18 || { seen: {} }; s.v18.rare = { glowcap: { n: D.V18.rare.pity - 1 } }; s.pendingFind = null; A.UI.exArea = 'glowcap'; A.UI.explore(); });
  await sleep(300);
  const note = await ev(() => (document.querySelector('.v18-rare-note') || {}).textContent || '');
  ok(/Something rarer lives here/.test(note), 'the Glowcap Glade card says something rarer lives there, without naming it or the day (“' + note.trim() + '”)');
  await shot('rare-note');
  await ev(() => { const b = document.querySelector('[data-act="doExplore"]'); if (b) b.click(); });
  await until(() => !!A.State.state.pendingFind, null, 10000).catch(() => {});
  await ev(() => { const o = document.querySelector('[data-act="openFind"]'); if (o) o.click(); else if (!document.querySelector('.v18-rare-tag')) A.UI.findModal(); });
  await until(() => !!document.querySelector('.v18-rare-tag'), null, 10000).catch(() => {});
  const rare = await ev(() => ({ f: A.State.state.pendingFind, h: ((document.querySelector('.v18-rare-tag') || {}).closest ? document.querySelector('.v18-rare-tag').closest('.overlay').querySelector('h1').textContent : ''), tag: (document.querySelector('.v18-rare-tag') || {}).textContent || '' }));
  ok(rare.f && rare.f.rare && rare.f.sp === 'terraflora3' && /Something rare stirs/.test(rare.h) && /will not come this way again/.test(rare.tag), 'on the pity day the rare Terraflora III appears with its own heading (“' + rare.h + '”)');
  await shot('rare-find');
  const bf = await ev(() => { const s = A.State.state, n0 = s.aminas.length, r = A.Rules.befriend(s); A.UI.closeAll(); const k = s.aminas[s.aminas.length - 1]; return { ok: r && r.ok, n: s.aminas.length - n0, sp: k.sp, lv: k.lv, met: !!s.v18.rare.glowcap.met }; });
  ok(bf.ok && bf.n === 1 && bf.sp === 'terraflora3' && bf.lv === 22 && bf.met, 'befriending it adds one Terraflora III at level 22 and records it as met');
  await ev(() => { A.UI.exArea = 'glowcap'; A.UI.explore(); }); await sleep(200);
  ok(/befriended this glade/.test(await ev(() => (document.querySelector('.v18-rare-note') || {}).textContent || '')), 'afterwards the card says it was befriended');

  /* ---------- level cap: victory text ---------- */
  await tidy();
  await ev(() => { const s = A.State.state, R = A.Rules, k = s.aminas[0]; k.lv = R.levelCap ? R.levelCap(s) : (A.Data.MAX_LEVEL || 40); /* Phase 19B: the current staged cap */ k.xp = 0; });
  await battle('v_mossgate', 0);
  await ev(() => { const b = A.UI.B.b; b.party[b.pi].spd = 9999; b.enemy.hp = 1; b.rng = () => 0.5; const a = document.querySelector('#b-actions .abtn.ready.k-atk') || document.querySelector('#b-actions .abtn.ready'); a.click(); });
  await until(() => !!document.querySelector('.xprow'), null, 40000).catch(() => {});
  const xp = await ev(() => [...document.querySelectorAll('.xprow')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
  ok(xp.length && /Level cap \d+, no more XP/.test(xp[0]), 'an Amina at the level cap shows “Level cap N, no more XP” on the victory screen (Phase 19B: “Max level” only at the final cap) (' + (xp[0] || '').slice(0, 80) + ')');
  ok(await ev(() => A.State.state.aminas[0].lv === A.Rules.levelCap(A.State.state) && A.State.state.aminas[0].xp === 0), 'and it keeps its level at the cap with no stored XP (Phase 19B: the staged cap)');
  await shot('victory-capped');

  /* ---------- hidden: a companion's walking hop in flight is stopped (the browser-dev7 intermittent) ---------- */
  await tidy(); await ev(() => A.UI.showIsland()); await until(() => !!document.querySelector('#objs .creature .cr-mv'), null, 30000).catch(() => {});
  const hop = await ev(async () => { const mv = document.querySelector('#objs .creature .cr-mv'); if (!mv) return null; clearInterval(A.UI.timers.life);
    mv.style.transition = 'transform 3s steps(12, end)'; void mv.getBoundingClientRect(); mv.style.transform = 'translate(40px,10px)'; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const before = mv.getAnimations().filter((a) => a.playState === 'running').length;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 50)); const after = document.getAnimations().filter((a) => a.playState === 'running').length;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange'));
    return { before, after, hidden: document.body.classList.contains('perf-hidden') }; });
  ok(hop && hop.before === 1 && hop.after === 0, 'a companion hop that is mid-way when the app is hidden stops at once (running ' + (hop && hop.before) + ' → ' + (hop && hop.after) + ')');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-polish18d)'); await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})();
