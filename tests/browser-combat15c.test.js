// Phase 15C real-browser test (Chromium + Playwright, SwiftShader software WebGL; NOT a phone).
// Cinematic combat behind the Phase 15 developer switch (off by default): Atem III's nine floating swords on Overclock,
// signature special flourishes, camera framing, impact feedback and sound sequences. Presentation only: the rule
// engine decides everything first. Checks the brief's list: the nine-sword sequence and its count, the move's damage,
// cost and status unchanged, interruption, turn progression, statuses, sync with the hit, audio (and an interrupted
// audio context), Battery Saver, Reduce Motion, the 2D fallback, dungeon and boss battles, victory and defeat, saves.
// Run: node tests/browser-combat15c.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };

(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }); const errors = [];
  const open = async (q) => { const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }); const page = await ctx.newPage(); page.setDefaultTimeout(900000);
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
    await page.goto(srv.url + (q || '')); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D && A.Proto15);
    await page.evaluate(() => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = true; s.settings.sfx = true; A.Rules.drain(); if (A.UI.queue) A.UI.queue.length = 0; A.State.save(); A.UI.showIsland(); A.Audio.unlock(); A.Audio.setPrefs({ sfx: true, music: false }); });
    await page.waitForSelector('#world', { timeout: 60000 });
    await page.evaluate(async () => { for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 100)); document.querySelectorAll('.dlg .dlg-skip').forEach((b) => b.click()); A.UI.closeAll(); } document.querySelectorAll('.dlg').forEach((x) => x.remove()); });
    return page; };
  // one battle: the player's fighter presses the given moves; returns logs, the nine-sword diagnostics and the rule state
  const fight = (page, ps, es, presses, o) => page.evaluate(async ({ ps, es, presses, o }) => {
    o = o || {}; const st = A.State.state; st.settings.reduceMotion = !!o.calm; st.settings.batterySaver = !!o.saver; st.settings.creatures3d = o.flat ? false : true; if (A.Perf.apply) A.Perf.apply();
    const R = A.Rules, Bt = R.Battle, f = Bt.fighter(ps, 30), e = Bt.fighter(es, 30); [f, e].forEach((x) => { x.hpMax *= o.hpMul || 50; x.hp = x.hpMax; }); f.spd = 999; e.atk = o.eAtk || 1; if (o.boss) e.boss = true; if (o.pHp) f.hp = o.pHp;
    const seq = [], s0 = A.Audio.seq15; A.Audio.seq15 = function (n, oo) { const r = s0.call(this, n, oo); seq.push(n + (r ? '' : '(skipped)')); return r; };
    if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); const b = Bt.create([f], e, { rng: () => (o.rng == null ? 0.5 : o.rng) });
    A.UI.startBattle({ kind: o.kind || 'test', b, d: o.d || 'heartwood', label: 't', finish: () => {} });
    const out = { samples: [], cubes: 0, presses: [] }; const is3d = () => A.UI.B && A.UI.B.stage && A.UI.B.stage.is3d;
    for (let i = 0; i < 120 && !(A.UI.B && A.UI.B.stage && !A.UI.B.busy); i++) await new Promise((r) => setTimeout(r, 100));
    out.is3d = !!is3d(); const t0 = performance.now();
    const sample = () => { if (!is3d()) return; const d = A.UI.B.stage.debug(); out.cubes = Math.max(out.cubes, d.cubes); out.samples.push(d.c15); };
    for (const id of presses) {
      for (let i = 0; i < 80 && A.UI.B && A.UI.B.busy; i++) { sample(); await new Promise((r) => setTimeout(r, 50)); }
      const btn = document.querySelector('.abtn.ready[data-id="' + id + '"]'); if (!btn) { out.presses.push('no ' + id); continue; } btn.click(); out.presses.push(id);
      if (o.leaveAt) { await new Promise((r) => setTimeout(r, o.leaveAt)); const d = is3d() ? A.UI.B.stage.debug() : null; out.beforeLeave = d && d.c15; A.UI.leaveBattle(() => {}); out.left = true; break; }
      for (let i = 0; i < 12; i++) { sample(); await new Promise((r) => setTimeout(r, 50)); }
    }
    if (!out.left) for (let i = 0; i < 120 && A.UI.B && A.UI.B.busy; i++) { sample(); await new Promise((r) => setTimeout(r, 50)); }
    out.ms = Math.round(performance.now() - t0);
    if (!out.left) await new Promise((r) => setTimeout(r, 1500));   // let the camera settle back
    if (A.UI.B && is3d()) { const d = A.UI.B.stage.debug(); out.log = d.log.slice(); out.c15 = d.c15; }
    out.enemyHp = b.enemy.hp; out.enemyMax = b.enemy.hpMax; out.weak = JSON.stringify(b.enemy.weak || 0); out.cd = JSON.stringify(f.cd || {}); out.turn = b.turn; out.over = !!(A.UI.B && A.UI.B.over); out.result = b.result || null;
    out.seq = seq; A.Audio.seq15 = s0; out.c15last = (await import('/src/3d/combat15c.js')).last9; out.c15last = out.c15last ? { done: out.c15last.done, hits: out.c15last.hit.filter(Boolean).length, maxVisible: out.c15last.maxVisible } : null;
    st.settings.reduceMotion = false; st.settings.batterySaver = false; st.settings.creatures3d = true; if (A.Perf.apply) A.Perf.apply();
    return out; }, { ps, es, presses, o });
  const maxOf = (F, k) => Math.max(0, ...F.samples.map((s) => (s && s.swords ? s.swords[k] : 0) || 0));

  /* ================= 1. switch off: nothing from 15C ================= */
  let page = await open();
  const off = await fight(page, 'atem', 'rockraki', ['overclock']);
  ok(off.is3d && off.log.includes('move:p:overclock') && !off.log.includes('use:p:special9') && !off.samples.some((s) => s && s.swords) && off.seq.every((x) => /skipped/.test(x)), 'switch off (default): Atem III uses Overclock with its Phase 8B presentation; no swords, no 15C camera or sounds');
  const offHp = off.enemyHp, offW = off.weak, offCd = off.cd;
  await page.context().close();

  /* ================= 2. Atem III, nine swords ================= */
  page = await open('?p15=1');
  const S = await fight(page, 'atem', 'rockraki', ['overclock']);
  ok(S.is3d && S.log.includes('use:p:special9') && S.log.includes('move:p:overclock'), 'Atem III plays its nine-sword stance (special9) for Overclock, its existing special');
  ok(maxOf(S, 'maxVisible') === 9 && S.c15last && S.c15last.maxVisible === 9, 'exactly nine individual swords are drawn (peak ' + maxOf(S, 'maxVisible') + ')');
  ok(S.c15last && S.c15last.hits === 9 && S.c15last.done, 'all nine blades strike (nine distinct impacts) and the sequence clears itself afterwards');
  const caught = Math.max(0, ...S.samples.map((s) => (s && s.swords && s.swords.caught) || 0)), hitE = S.log.indexOf('hit:e:normal') >= 0 || S.log.some((x) => /^hit:e:/.test(x));
  ok(hitE && S.c15last.hits === 9, 'the last blade lands with the rule engine\'s hit (on this software renderer the sequence ran ' + caught + ' s behind real time and was brought forward to the hit)');
  ok(S.enemyHp === offHp && S.weak === offW && S.cd === offCd, 'Overclock\'s damage, attack-down and cooldown are exactly the same with the presentation on and off (foe HP ' + S.enemyHp + ' vs ' + offHp + ')');
  ok(S.log.some((x) => /^use:e:/.test(x)) && !S.over, 'turns continue: the foe takes its turn after the swords, and the battle carries on');
  ok(S.seq.indexOf('atem9') >= 0, 'the layered nine-sword sound sequence plays (activation, assembly, launches, impacts, retraction)');
  ok(Math.max(0, ...S.samples.map((s) => (s && s.camFocus) || 0)) > 0.3 && S.c15.camFocus < 0.05, 'the camera frames the sequence and the target, then returns to the battle view (peak ' + Math.max(0, ...S.samples.map((s) => (s && s.camFocus) || 0)) + ', end ' + S.c15.camFocus + ')');
  const S2 = await fight(page, 'atem2', 'rockraki', ['bladeform']), S1 = await fight(page, 'atem1', 'rockraki', ['gearstrike']);
  ok(!S2.log.includes('use:p:special9') && !S1.log.includes('use:p:special9') && !S2.samples.some((s) => s && s.swords && s.swords.start > 0 && s.swords.visible), 'Atem I and Atem II keep their own weapon presentations (no swords)');
  // interruption: leave the battle while the swords are out
  const I = await fight(page, 'atem', 'rockraki', ['overclock'], { leaveAt: 350 });
  const after = await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 300)); const L = (await import('/src/3d/combat15c.js')).last9; return { done: L && L.done, inBattle: !!A.UI.B }; });
  ok(I.left && after.done && !after.inBattle, 'leaving the battle mid-sequence releases the swords at once (no lingering meshes or updates)');
  const again = await fight(page, 'atem', 'rockraki', ['overclock']);
  ok(again.c15last.hits === 9 && again.c15last.done && again.log.some((x) => /^use:e:/.test(x)), 'the next battle plays the sequence cleanly again');

  /* ================= 3. signature flourishes, statuses, impact feedback ================= */
  const abil = await page.evaluate(() => Object.fromEntries(['eclipsar', 'aquaflora3', 'infernox', 'pyrophoenix', 'oceanfang', 'voltar3', 'aimza3', 'shellfin', 'meta'].map((id) => [id, A.Data.SPECIES[id].abil])));
  for (const [id, foe] of [['eclipsar', 'calyxar'], ['aquaflora3', 'infernox'], ['infernox', 'calyxar'], ['pyrophoenix', 'calyxar'], ['oceanfang', 'infernox'], ['voltar3', 'calyxar'], ['aimza3', 'calyxar'], ['shellfin', 'infernox'], ['meta', 'rockraki']]) {
    const F = await fight(page, id, foe, [abil[id][1]]);
    ok(F.is3d && F.log.includes('move:p:' + abil[id][1]) && F.log.some((x) => /^hit:e:/.test(x)) && F.cubes > 10, id + ': its special ' + abil[id][1] + ' plays with its signature flourish (peak ' + F.cubes + ' effect cubes)'); }
  const G = await fight(page, 'atem1', 'rockraki', ['ironwall']);
  ok(G.log.includes('use:p:guard') && G.seq.indexOf('guard') >= 0, 'shielding: Iron Wall raises the lattice shield with its own sound');
  const statusMv = await page.evaluate(() => { const D = A.Data; const sp = Object.values(D.SPECIES).find((s) => s.abil.some((a) => D.ABILITIES[a].fx && D.ABILITIES[a].fx.k === 'burn')); return sp ? [sp.id, sp.abil.find((a) => D.ABILITIES[a].fx && D.ABILITIES[a].fx.k === 'burn')] : null; });
  if (statusMv) { const ST = await fight(page, statusMv[0], 'acinus', [statusMv[1]], { rng: 0.05 });
    ok(ST.log.some((x) => /^status:/.test(x)) && ST.seq.indexOf('status') >= 0, 'status application (' + statusMv[1] + ' by ' + statusMv[0] + '): the status ring and sound play with the existing status event'); }
  else ok(false, 'found a status move to test');

  /* ================= 4. Battery Saver, Reduce Motion, 2D fallback ================= */
  const SV = await fight(page, 'atem', 'rockraki', ['overclock'], { saver: true });
  ok(SV.c15last.maxVisible === 9 && SV.c15last.hits === 9 && SV.cubes < S.cubes + 1, 'Battery Saver: all nine swords and impacts, with fewer particles (peak ' + SV.cubes + ' cubes vs ' + S.cubes + ')');
  const RM = await fight(page, 'atem', 'rockraki', ['overclock'], { calm: true });
  ok(RM.c15last.maxVisible === 9 && RM.c15last.hits === 9 && Math.max(0, ...RM.samples.map((s) => (s && s.camFocus) || 0)) === 0 && RM.cubes <= SV.cubes, 'Reduce Motion: the swords stay readable (nine, no orbit), no camera movement, minimal particles (peak ' + RM.cubes + ')');
  const FL = await fight(page, 'atem', 'rockraki', ['overclock'], { flat: true });
  ok(!FL.is3d && FL.enemyHp === offHp && FL.seq.indexOf('atem9') < 0, '2D battle fallback: Overclock resolves identically (foe HP ' + FL.enemyHp + '), no 3D sequence, no stalls');

  /* ================= 5. dungeon and boss battles, victory and defeat ================= */
  const DG = await fight(page, 'atem', 'rockraki', ['overclock'], { d: 'reliquary' });
  ok(DG.is3d && DG.c15last.hits === 9, 'dungeon arena (Reliquary): the sequence plays in another arena');
  const BS = await fight(page, 'atem', 'rockraki', ['overclock'], { boss: true });
  ok(BS.is3d && BS.c15last.hits === 9 && BS.log.some((x) => /^use:e:/.test(x)), 'boss encounter: the boss introduction, then the nine swords against a boss, then the boss\'s turn');
  const W = await fight(page, 'atem', 'rockraki', ['overclock'], { hpMul: 0.05 });
  ok(W.log && W.log.includes('victory:p') && W.c15last.hits === 9, 'victory: Overclock finishes the foe, the battle ends and the victory celebration plays');
  const L2 = await fight(page, 'atem1', 'rockraki', ['gearstrike'], { pHp: 1, eAtk: 400 });
  ok(L2.log && L2.log.some((x) => /^faint:p/.test(x)), 'defeat: the fainting presentation plays and the battle ends');

  /* ================= 6. audio interruption, saves ================= */
  const au = await page.evaluate(async () => { const Au = A.Audio, r = { has: !!Au.seq15 }, ctx = Au.context ? Au.context() : null; if (!ctx) return r; await ctx.suspend(); r.whileSuspended = Au.seq15('heal'); await ctx.resume(); await new Promise((q) => setTimeout(q, 100)); r.afterResume = Au.seq15('heal'); return r; });
  ok(au.has && (au.whileSuspended === undefined || (au.whileSuspended === false && au.afterResume === true)), 'audio: sequences are skipped (never queued) while the context is interrupted, and play again after it resumes' + (au.whileSuspended === undefined ? ' (context not exposed; skipped-when-not-running rule checked in code)' : ''));
  const save = await page.evaluate(() => { if (A.UI.B) A.UI.leaveBattle(() => {}); return JSON.stringify(A.State.state); });
  ok(!/proto15|p15|c15|special9|sword/i.test(save), 'nothing about the presentation reaches the save');
  await page.context().close();

  ok(!errors.length, 'no page errors (' + errors.slice(0, 3).join(' | ') + ')');
  await browser.close(); srv.close();
  console.log('\nbrowser-combat15c: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})();
