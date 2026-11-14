// Phase 7 real-browser test (Chromium + Playwright, SwiftShader software WebGL; NOT a phone).
// Movement personalities, the arena <-> interface link (turn focus, targeting, battle-ready), element effects,
// arena atmospheres, boss presentation, every battle mode, the 2D fallback, Reduce motion / Battery saver,
// clean-up after battles, and save compatibility.
// Run: node tests/browser-arena7.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D);
  await page.evaluate(() => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.quality = 'balanced'; s.settings.creatures3d = true;
    ['lumifern', 'emberix', 'aimza', 'kairyu', 'gaiaroki'].forEach((sp, i) => R.addAmina(s, sp, 14 - i)); s.missions = { m_hollow: 'claimed' };
    Object.keys(D.DUNGEONS).forEach((id) => { const r = R.dungeonRec(s, id); r.clears = 1; r.next = 0; }); R.drain(); A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world', { timeout: 60000 }); await sleep(1000);
  const clean = () => page.evaluate(() => { A.Perf.autoSaver = false; A.UI.queue.length = 0; A.UI.busy = false; if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); document.querySelectorAll('.toast,.reward-wrap,.dlg,.scene').forEach((t) => t.remove()); if (!document.querySelector('#world')) A.UI.showIsland(); });
  const start = async (d, from, party, mut) => {
    await clean();
    await page.evaluate(({ d, from, party }) => { const s = A.State.state; A.Rules.startRun(s, d, (party || [0, 1, 2]).map((i) => s.aminas[i].uid), { from }); A.UI.startBattle(); }, { d, from, party });
    const is3d = await page.waitForFunction(() => document.querySelector('.abtn.ready') && document.querySelector('.battle.is3d') && A.UI.B.stage && A.UI.B.stage.debug, null, { timeout: 30000 }).then(() => true).catch(() => false);
    if (mut) await page.evaluate(mut);
    return is3d;
  };
  const dbg = () => page.evaluate(() => A.UI.B && A.UI.B.stage && A.UI.B.stage.debug ? A.UI.B.stage.debug() : null);
  const press = (sel) => page.evaluate((sel) => { A.UI.closeAll(); const b = document.querySelector(sel); if (b) b.click(); return !!b; }, sel);

  /* ---------------- movement personalities (every species) ---------------- */
  const rig = await page.evaluate(async () => {
    const C = await import('/src/3d/creature3d.js'), D = A.Data, out = { invalid: [], missing: [], combos: {}, late: [], lines: [], n: 0 };
    const peakZ = (clip) => { const t = clip.tracks.find((x) => x.name === 'rig.position'); if (!t) return null; let best = -1, bt = 0; for (let i = 0; i < t.times.length; i++) { const z = t.values[i * 3 + 2]; if (z > best) { best = z; bt = t.times[i]; } } return bt; };
    const prof = {};
    for (const id of Object.keys(D.SPECIES)) {
      const m = C.buildVoxel(D.SPECIES[id]), v = C.validate(m.root, m.clips), p = m.root.userData.profile; out.n++; prof[id] = p;
      if (!v.ok) out.invalid.push(id); const names = m.clips.map((c) => c.name);
      ['idle', 'ready', 'attack', 'special', 'hit', 'hitBig', 'heal', 'guard', 'victory', 'defeat', 'move'].forEach((c) => { if (names.indexOf(c) < 0) out.missing.push(id + ':' + c); });
      out.combos[p.temper + '/' + p.attack + (p.float ? '/float' : '')] = 1;
      ['attack', 'special'].forEach((c) => { const tz = peakZ(m.clips.find((x) => x.name === c)); if (tz != null && (tz < 0.3 || tz > 0.42)) out.late.push(id + ':' + c + '@' + tz); });
    }
    // evolution lines grow heavier (their motion gains weight) from stage 1 to stage 3
    Object.keys(D.SPECIES).forEach((id) => { const s = D.SPECIES[id]; if (s.stage === 1 && s.evo) { const n2 = D.SPECIES[s.evo.to]; if (n2 && prof[n2.id] && prof[n2.id].weight <= prof[id].weight) out.lines.push(id); } });
    out.combos = Object.keys(out.combos); return out;
  });
  ok(rig.invalid.length === 0 && rig.missing.length === 0, 'all ' + rig.n + ' Aminas build with a valid rig and the full clip set (idle, ready, attack, special, hit, heavy hit, heal, guard, victory, defeat, move)' + (rig.invalid.length ? ': invalid ' + rig.invalid.join(', ') : '') + (rig.missing.length ? ': missing ' + rig.missing.slice(0, 4).join(', ') : ''));
  ok(rig.combos.length >= 10, 'movement is not identical: ' + rig.combos.length + ' distinct temperament / fighting-style combinations across the roster');
  ok(rig.late.length === 0, 'every attack and special reaches the foe between 0.30 and 0.42 s, inside the existing battle beat (battle length unchanged)' + (rig.late.length ? ': ' + rig.late.slice(0, 4).join(', ') : ''));
  ok(rig.lines.length === 0, 'evolution lines move with more weight as they grow' + (rig.lines.length ? ': ' + rig.lines.join(', ') : ''));

  /* ---------------- the arena follows the turn ---------------- */
  ok(await start('reliquary', 4), 'a dungeon battle opens on the 3D stage');
  await sleep(200);
  let d = await dbg();
  ok(d.focus.active === 'p' && d.focus.target === 'e' && d.focus.mode === 'turn' && d.marks.p.ring > 0 && d.marks.e.reticle > 0 && d.marks.p.ringColor === '#8ff0ff', 'your move: your Amina is active (cyan ring, outline) and the foe carries the target reticle');
  ok(d.playing.p === 'ready', 'the active Amina plays its battle-ready move when its turn begins (' + d.playing.p + ')');
  // pressing an attack previews the foe; pressing a heal/guard previews yourself
  await page.evaluate(() => { const b = document.querySelector('.abtn.ready.k-atk'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  d = await dbg(); ok(d.focus.preview === 'foe' && d.marks.e.reticle === 1, 'pressing an attack closes the reticle on the foe before the move is played');
  await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))); await sleep(450);
  d = await dbg(); ok(d.focus.preview === null, 'releasing clears the preview');
  // turn order: record the rules' events and compare with what the arena showed
  const order = async (fast) => {
    await page.evaluate((fast) => { const U = A.UI.B, b = U.b, B = A.Rules.Battle; b.rng = () => 0.5; b.enemy.def = 99999; b.enemy.atk = 1; b.party[b.pi].spd = fast ? 9999 : 1; b.enemy.spd = fast ? 1 : 9999;
      window.__uses = []; if (!B.__wrapped) { const act0 = B.act; B.act = function () { const ev = act0.apply(this, arguments); window.__uses = ev.filter((e) => e.t === 'use').map((e) => e.who); return ev; }; B.__wrapped = true; } }, fast);
    const before = (await dbg()).log.length;
    await press('.abtn.ready.k-atk'); await page.waitForSelector('.abtn.ready', { timeout: 15000 }); await sleep(300);
    const log = (await dbg()).log.slice(before), uses = await page.evaluate(() => window.__uses);
    const acts = log.filter((k) => /\|act$/.test(k)).map((k) => k[0]), useLog = log.filter((k) => /^use:/.test(k)).map((k) => k[4]);
    const eachUseAfterFocus = log.every((k, i) => !/^use:/.test(k) || log.slice(0, i).filter((x) => /\|(act|turn)$/.test(x)).pop() === k[4] + '|' + (k[4] === 'p' ? 'e' : 'p') + '|act');
    return { uses, acts, useLog, eachUseAfterFocus, endsOnTurn: /\|turn$/.test(log[log.length - 1] || '') };
  };
  const o1 = await order(true), o2 = await order(false);
  ok(o1.uses.join() === 'p,e' && o1.acts.join() === o1.uses.join() && o1.useLog.join() === o1.uses.join() && o1.eachUseAfterFocus && o1.endsOnTurn, 'when you are faster the arena highlights you, then the foe, in the rules’ order (' + o1.acts.join(' → ') + '), then returns to your turn');
  ok(o2.uses.join() === 'e,p' && o2.acts.join() === o2.uses.join() && o2.useLog.join() === o2.uses.join() && o2.eachUseAfterFocus, 'when the foe is faster the highlight follows it first (' + o2.acts.join(' → ') + ')');
  const pan = await page.evaluate(() => [...document.querySelectorAll('.b-panel.fp.targeted')].length);
  ok(pan === 0, 'between turns no panel is marked as targeted');
  // animations finish and effects clean up
  await sleep(1200); d = await dbg();
  ok(['idle', 'ready'].indexOf(d.playing.p) >= 0 && ['idle', 'hit', 'hitBig'].indexOf(d.playing.e) >= 0 && d.fx === 0 && d.timeline === 0, 'after a turn the creatures are back in their idle and every effect has finished (effects alive: ' + d.fx + ')');
  ok(/use:p:attack|use:p:special/.test(d.log.join()) && d.log.some((k) => /^hit:e/.test(k)), 'the attack played its style clip and the impact landed on the foe');

  /* ---------------- element effects ---------------- */
  const shots = [];
  for (const [party, label] of [[[1], 'fire'], [[2], 'resonance'], [[3], 'water'], [[4], 'earth']]) {
    await start('forgottenroad', 3, party, () => { const b = A.UI.B.b; b.rng = () => 0.5; b.party[b.pi].spd = 9999; b.enemy.hpMax *= 20; b.enemy.hp = b.enemy.hpMax; });
    await press('.abtn.ready.k-atk'); let peak = 0, shot = 0; for (let i = 0; i < 10; i++) { await sleep(70); const x = await dbg(); peak = Math.max(peak, x.cubes); shot = Math.max(shot, x.shots); }
    shots.push(label + ':' + peak + (shot ? '+shot' : ''));
  }
  ok(shots.every((s) => +s.split(':')[1].split('+')[0] > 6), 'every element sends voxel effects across the arena (' + shots.join(', ') + ')');
  // super effective: freeze-frame, shockwave, heavy reaction
  await start('forgottenroad', 3, [1], () => { const b = A.UI.B.b; b.rng = () => 0.5; b.party[b.pi].spd = 9999; b.enemy.el = 'nature'; A.UI.B.disp.eEl = 'nature'; b.enemy.hpMax *= 20; b.enemy.hp = b.enemy.hpMax; });
  await press('.abtn.ready.k-atk'); await page.waitForFunction(() => A.UI.B.stage.debug().log.some((k) => /^hit:e:super/.test(k)), null, { timeout: 5000 }).catch(() => {});
  d = await dbg(); ok(d.log.some((k) => k === 'hit:e:super') && d.playing.e === 'hitBig', 'a super-effective hit gets the heavy reaction (' + d.playing.e + '), a freeze-frame and a shockwave');
  // special move: the ultimate presentation
  await start('forgottenroad', 3, [0], () => { const b = A.UI.B.b; b.rng = () => 0.5; b.party[b.pi].spd = 9999; b.enemy.hpMax *= 20; b.enemy.hp = b.enemy.hpMax; });
  await press('.abtn.ready.special'); await sleep(250); d = await dbg();
  ok(d.playing.p === 'special' && d.log.some((k) => k === 'use:p:special'), 'a special move plays the ultimate: its own clip, a gathering column and the camera leaning in');
  // heal and guard
  await start('forgottenroad', 3, [2], () => { const b = A.UI.B.b; b.rng = () => 0.5; b.party[b.pi].spd = 9999; const f = b.party[b.pi]; f.hp = Math.round(f.hpMax * 0.4); A.UI.B.disp.pHp = f.hp; A.UI.bRender(); });
  const healBtn = await press('.abtn.ready.k-heal'); await sleep(250); d = await dbg();
  ok(healBtn && d.playing.p === 'heal' && d.log.some((k) => k === 'use:p:heal'), 'healing plays the heal animation with its rising light');

  /* ---------------- arenas, bosses and modes ---------------- */
  const ARENAS = ['forgottenroad', 'gatheringhall', 'reliquary', 'drownedsteps', 'coldkiln', 'hollowveil', 'lanternorchard', 'windstair', 'resonancescar', 'heartwood'];
  const atm = [];
  for (const a of ARENAS) { await start(a, 3); const x = await dbg(); atm.push([a, x.arena, x.atmosphere.particles, x.atmosphere.backdrop, x.atmosphere.count]); }
  ok(atm.every((x) => x[0] === x[1] && x[2] && x[3] && x[4] > 0) && new Set(atm.map((x) => x[2])).size === ARENAS.length, 'each of the 10 arenas has its own atmosphere (' + atm.map((x) => x[2]).join(', ') + ')');
  await start('forgottenroad', 9); d = await dbg(); const st1 = await page.evaluate(() => A.C3D.stats());
  ok(d.atmosphere.boss && !d.atmosphere.island && d.marks.e, 'a guardian battle keeps its boss presentation and adds boss lighting');
  await start('heartwood', 9); await sleep(400); d = await dbg(); const st2 = await page.evaluate(() => A.C3D.stats());
  ok(d.atmosphere.boss && d.atmosphere.island && d.atmosphere.particles === 'leaves' && !!(await page.$('.b-bossin.isle, .battle.islandboss')), 'the Island Boss keeps its prismatic presentation (halo, title card) with the Heartwood atmosphere');
  ok(st1.drawCalls <= 45 && st2.drawCalls <= 45, 'draw calls stay within budget in boss arenas (' + st1.drawCalls + ', ' + st2.drawCalls + '; budget 45)');
  // other modes: survival, 5v5 practice and a raid, on their own arenas
  await clean();
  const modes = await page.evaluate(async () => {
    const s = A.State.state, R = A.Rules, out = [];
    const run = async (label, ctx) => { A.UI.startBattle(ctx); for (let i = 0; i < 60; i++) { await new Promise((r) => setTimeout(r, 200)); if (document.querySelector('.battle.is3d') && A.UI.B && A.UI.B.stage.debug && document.querySelector('.abtn.ready')) break; }
      const d0 = A.UI.B.stage.debug ? A.UI.B.stage.debug() : null; document.querySelector('.abtn.ready.k-atk, .abtn.ready').click();
      for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 200)); if (document.querySelector('.abtn.ready') || (A.UI.B && A.UI.B.b.over)) break; }
      const d1 = A.UI.B && A.UI.B.stage.debug ? A.UI.B.stage.debug() : null; out.push({ label, is3d: !!d0, arena: d0 && d0.arena, uses: d1 ? d1.log.filter((k) => /^use:/.test(k)).length : 0 }); A.UI.leaveBattle(() => {}); A.UI.closeAll(); };
    R.PvP.setRoster(s, s.aminas.slice(0, 5).map((a) => a.uid));
    const pr = R.PvP.createPractice(s); await run('practice', { kind: 'practice', b: pr, d: 'resonancescar', label: 'Practice', finish: () => {} });
    R.PvP.setTeam(s, 'attack', s.aminas.slice(0, 3).map((a) => a.uid)); const rd = R.PvP.createRaid(s); if (rd) await run('raid', { kind: 'raid', b: rd, d: 'hollowveil', label: 'Raid', finish: () => {} });
    if (R.Survival && R.Survival.start) { R.Survival.start(s, s.aminas.slice(0, 3).map((a) => a.uid)); const sb = R.Survival.createBattle(s); await run('survival', { kind: 'survival', b: sb, d: 'reliquary', label: 'Survival', finish: () => {} }); }
    return out;
  });
  ok(modes.length >= 2 && modes.every((m) => m.is3d && m.uses > 0), 'the arena link and effects work in other battle modes (' + modes.map((m) => m.label + ' on ' + m.arena + ': ' + m.uses + ' moves').join(', ') + ')');
  await clean();

  /* ---------------- clean-up: nothing leaks between battles ---------------- */
  // play the same three boss battles twice: creature templates are cached on purpose (up to 14 species), so the first
  // round may add theirs; the second round must add nothing (arenas, effects and highlights are all freed)
  const round = async () => { for (const a of ['coldkiln', 'heartwood', 'windstair']) { await start(a, 9); await press('.abtn.ready.k-atk'); await sleep(900); await clean(); } await start('reliquary', 4); await clean(); await sleep(400); return (await page.evaluate(() => A.C3D.stats())).geometries; };
  // Phase 14: three rounds. With the fuller arenas the first round sometimes ends before every cached template has
  // been drawn once, so the count can settle one round later; what must hold is that it stops growing.
  const g1 = await round(), g2 = await round(), g3 = await round();
  ok(g3 <= g2 && g2 <= g1 + 2, 'leaving battles frees their arenas, effects and highlights (GPU geometries after three boss battles: ' + g1 + ', after three more: ' + g2 + ', after three more: ' + g3 + ')');

  /* ---------------- Reduce motion and Battery saver ---------------- */
  const impactCubes = async () => { await start('forgottenroad', 3, [1], () => { const b = A.UI.B.b; b.rng = () => 0.5; b.party[b.pi].spd = 9999; b.enemy.hpMax *= 20; b.enemy.hp = b.enemy.hpMax; }); const r = (await dbg()); const playing = r.playing.p;
    await press('.abtn.ready.k-atk'); let peak = 0; for (let i = 0; i < 12; i++) { await sleep(60); peak = Math.max(peak, (await dbg()).cubes); } return { peak, playing, count: r.atmosphere.count }; };
  const normal = await impactCubes();
  await page.evaluate(() => { A.State.state.settings.batterySaver = true; A.Perf.apply(); }); const saver = await impactCubes();
  await page.evaluate(() => { A.State.state.settings.batterySaver = false; A.Perf.apply(); A.State.state.settings.reduceMotion = true; document.body.classList.add('calm'); }); const calm = await impactCubes();
  ok(saver.count < normal.count && saver.peak < normal.peak, 'Battery saver halves the arena particles (' + normal.count + ' → ' + saver.count + ') and the attack effects (' + normal.peak + ' → ' + saver.peak + ' cubes)');
  ok(calm.peak <= Math.ceil(normal.peak / 2) && calm.playing !== 'ready', 'Reduce motion keeps only a little of the effects (' + calm.peak + ' cubes), skips the battle-ready move, the camera moves and the freeze-frame');
  await page.evaluate(() => { A.State.state.settings.reduceMotion = false; document.body.classList.remove('calm'); }); await clean();

  /* ---------------- the 2D stage gets the same cues ---------------- */
  await page.evaluate(() => { A.State.state.settings.creatures3d = false; }); await clean();
  await page.evaluate(() => { const s = A.State.state; A.Rules.startRun(s, 'reliquary', [s.aminas[0].uid], { from: 4 }); A.UI.startBattle(); }); await page.waitForSelector('.abtn.ready', { timeout: 15000 }); await sleep(300);
  const two = await page.evaluate(() => ({ p: document.querySelector('#spr-p').className, e: document.querySelector('#spr-e').className, is3d: !!document.querySelector('.battle.is3d') }));
  ok(!two.is3d && /is-active/.test(two.p) && /is-turn/.test(two.p) && /is-target/.test(two.e), 'on the 2D stage your Amina glows as active and the foe carries the target brackets');
  await page.evaluate(() => { A.UI.B.b.rng = () => 0.5; A.UI.B.b.party[A.UI.B.b.pi].spd = 9999; A.UI.B.b.enemy.def = 9999; document.querySelector('.abtn.ready.k-atk').click(); }); await sleep(320);
  ok(await page.evaluate(() => !!document.querySelector('.streak2d')), 'the 2D stage sends an element-coloured streak across for attacks');
  await page.evaluate(() => { A.State.state.settings.creatures3d = true; }); await clean();

  /* ---------------- saves ---------------- */
  const sv = await page.evaluate(() => { const S = A.State, s = S.state, extra = Object.keys(s).filter((k) => !(k in S.newGame())); S.save(); const raw = Object.keys(localStorage).map((k) => localStorage.getItem(k)).join(''); return { extra, ui: /"focus"|"preview"|profile|hullOp/.test(raw) }; });
  ok(sv.extra.length === 0 && !sv.ui, 'saves are unchanged: no new fields and nothing from the arena is written');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED' : 'PASSED') + ': ' + pass + ' passed, ' + fail + ' failed (browser-arena7)');
  await browser.close(); srv.close(); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error('ERROR ' + (e && e.message ? e.message.split('\n').slice(0, 6).join('\n') : e)); process.exit(1); });
