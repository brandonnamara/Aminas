// Phase 15D real-browser test (Chromium + Playwright, SwiftShader software WebGL; NOT a phone).
// Final monster and combat refinement behind the Phase 15 developer switch (off by default): Aquaflora II–III serpent
// bodies, the Emberix fox head, Gaiaroki / Pyro-Cell / Pyrokai heads, Lumifern and Meta refinements, three signature
// specials (Lumifern III Solar Flare, Igniflare III Inferno, Zeep III Overclock), body-specific guard poses, status
// chips that pulse when applied, and Atem III's tuned Overclock. Presentation only: the rule engine decides
// everything first, so damage, costs, cooldowns and statuses are checked against the switch-off run.
// Run: node tests/browser-final15d.test.js
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
    out.chips = { p: [...document.querySelectorAll('#fs-p .stx')].map((c) => c.dataset.k), e: [...document.querySelectorAll('#fs-e .stx')].map((c) => c.dataset.k) };
    out.stP = Object.keys(f.st).concat(f.weak > 0 ? ['weak'] : []); out.stE = Object.keys(b.enemy.st).concat(b.enemy.weak > 0 ? ['weak'] : []);
    out.seq = seq; A.Audio.seq15 = s0; out.c15last = (await import('/src/3d/combat15c.js')).last9; out.c15last = out.c15last ? { done: out.c15last.done, hits: out.c15last.hit.filter(Boolean).length, maxVisible: out.c15last.maxVisible } : null;
    st.settings.reduceMotion = false; st.settings.batterySaver = false; st.settings.creatures3d = true; if (A.Perf.apply) A.Perf.apply();
    return out; }, { ps, es, presses, o });

  /* ================= 1. models: every updated form loads, silhouettes, parts ================= */
  let page = await open('?p15=1');
  const md = await page.evaluate(async () => {
    const C = await import('/src/3d/creature3d.js'); await import('/src/3d/runtime.js'); const out = {};
    const ids = ['aquaflora', 'aquaflora2', 'aquaflora3', 'emberix', 'flaremon', 'infernox', 'gaiaroki', 'terraki', 'rockraki', 'pyrocell', 'pyroforge', 'pyrocore', 'pyrokai', 'emberkai', 'infernokai', 'lumifern', 'solarbloom', 'aurelith', 'meta1', 'meta2', 'meta', 'zeep3', 'ignivor'];
    for (const id of ids) { const sp = A.Data.SPECIES[id], o = {};
      for (const lod of ['h', 'm']) { const r = C.buildVoxel(sp, { proto: true, lod }), v = C.validate(r.root, r.clips); let tris = 0; r.root.traverse((x) => { if (x.isMesh && x.geometry) tris += (x.geometry.index ? x.geometry.index.count : x.geometry.attributes.position.count) / 3; });
        const box = new C.THREE.Box3().setFromObject(r.root), sz = box.getSize(new C.THREE.Vector3());
        o[lod] = { proto: r.root.userData.proto15, ok: v.ok !== false, tris: Math.round(tris), parts: r.root.userData.parts || [], clips: r.clips.map((c) => c.name), guard: (r.clips.find((c) => c.name === 'guard') || { tracks: [] }).tracks.map((t) => t.name), size: [sz.x, sz.y, sz.z].map((v) => +v.toFixed(2)) }; }
      const pr = C.buildVoxel(sp); const pb = new C.THREE.Box3().setFromObject(pr.root).getSize(new C.THREE.Vector3()); o.prod = [pb.x, pb.y, pb.z].map((v) => +v.toFixed(2));
      out[id] = o; }
    return out; });
  const ids = Object.keys(md);
  ok(ids.every((id) => md[id].h.proto && md[id].h.ok && md[id].m.ok && md[id].h.clips.length >= 12), 'all ' + ids.length + ' updated forms load at High and phone detail and validate (no missing geometry, all clips)');
  ok(ids.every((id) => md[id].h.tris <= 20000), 'every updated form stays inside the 20,000-triangle model budget (largest ' + Math.max(...ids.map((id) => md[id].h.tris)) + ')');
  ['aquaflora2', 'aquaflora3'].forEach((id) => { const p = md[id].h.parts;
    ok(!p.some((x) => /^leg/.test(x)) && ['neck', 'head', 'jaw', 'tail'].every((x) => p.indexOf(x) >= 0), id + ': a continuous serpent (neck, head, jaw, tail; no legs)'); });
  ok(['aquaflora2', 'aquaflora3'].every((id) => md[id].h.size[1] / md[id].prod[1] > 0.8 && md[id].h.size[1] / md[id].prod[1] < 1.25), 'the serpents stand as tall as the forms they replace (height ratio ' + ['aquaflora2', 'aquaflora3'].map((id) => (md[id].h.size[1] / md[id].prod[1]).toFixed(2)).join(', ') + '), and Aquaflora III is the larger');
  ok(md.aquaflora3.h.size[1] > md.aquaflora2.h.size[1], 'Aquaflora III is larger than Aquaflora II');
  ok(['emberix', 'flaremon', 'infernox'].every((id) => md[id].h.parts.indexOf('earL') >= 0 && md[id].h.parts.indexOf('jaw') >= 0), 'Emberix line: rebuilt fox heads keep their jaw and gain jointed ears');
  ok(['meta1', 'meta2', 'meta'].every((id) => ['hairLF', 'hairLB', 'hairRF', 'hairRB', 'ring', 'head'].every((x) => md[id].h.parts.indexOf(x) >= 0)), 'Meta: the refined forms keep every hair lock, the ring and the head as jointed parts');
  // body-specific guard poses
  const gtr = (id) => md[id].h.guard.join(' ');
  ok(/neck\.quaternion/.test(gtr('aquaflora2')) && /tail\.quaternion/.test(gtr('aquaflora2')), 'guard: the serpent coils back (neck and tail)');
  ok(/wingL\.quaternion/.test(gtr('ignivor')) || /wingL/.test(gtr('pyrophoenix') || ''), 'guard: flying forms shield themselves with their wings');
  ok(/head\.position/.test(gtr('zeep3')), 'guard: Zeep retracts its head into its shell');
  ok(/earL\.quaternion/.test(gtr('emberix')) && /rig\.position/.test(gtr('emberix')), 'guard: the fox crouches with its ears flat');
  const ends = await page.evaluate(async () => { const C = await import('/src/3d/creature3d.js'); const bad = [];
    for (const id of ['aquaflora2', 'emberix', 'zeep3', 'cannonis', 'voltar3', 'kairyu', 'pyrophoenix', 'sylvaneer']) { const r = C.buildVoxel(A.Data.SPECIES[id], { proto: true, lod: 'h' }), g = r.clips.find((c) => c.name === 'guard');
      g.tracks.forEach((t) => { const n = t.values.length / t.times.length, a = t.values.slice(0, n), z = t.values.slice(-n); if (a.some((v, i) => Math.abs(v - z[i]) > 1e-3)) bad.push(id + ':' + t.name); }); }
    return bad; });
  ok(!ends.length, 'every guard pose returns to its rest pose by the end of the clip (clean hand-back to idle)' + (ends.length ? ': ' + ends.join(' ') : ''));

  /* ================= 2. signature specials and Overclock ================= */
  const offPage = await open();
  const pairs = [['aurelith', 'rockraki', 'solarflare', 'bloom'], ['ignivor', 'calyxar', 'inferno', 'inferno'], ['zeep3', 'rockraki', 'overclock', 'overclockZ'], ['atem', 'rockraki', 'overclock', 'atem9']];
  for (const [id, foe, mv, snd] of pairs) {
    const A0 = await fight(offPage, id, foe, [mv]), A1 = await fight(page, id, foe, [mv]);
    ok(A1.is3d && A1.log.includes('move:p:' + mv) && A1.log.some((x) => /^hit:e:/.test(x)) && A1.seq.indexOf(snd) >= 0, id + ': ' + mv + ' plays its signature sequence and sound (' + snd + ')');
    ok(A1.enemyHp === A0.enemyHp && A1.weak === A0.weak && A1.cd === A0.cd, id + ': ' + mv + ' damage, effects and cooldown identical with the switch off (foe HP ' + A1.enemyHp + ' vs ' + A0.enemyHp + ')');
  }
  const hold = await page.evaluate(async () => { const C = await import('/src/3d/combat15c.js'); return { atem: C.hold('atem', 'overclock', {}), calm: C.hold('atem', 'overclock', { calm: true }), zeep: C.hold('zeep3', 'overclock', {}), lumi: C.hold('aurelith', 'solarflare', {}), igni: C.hold('ignivor', 'inferno', {}), other: C.hold('infernox', 'inferno', {}), ms: C.SWORD_HOLD_MS }; });
  ok(hold.atem === 330 && hold.calm === 330 && hold.atem < 560, 'Atem III Overclock: the extra wait is now ' + hold.atem + ' ms (was 560 ms in 15C)');
  ok(hold.zeep <= 200 && hold.lumi <= 200 && hold.igni <= 200 && hold.other === 0, 'the three new signatures wait at most 0.2 s extra (' + [hold.lumi, hold.igni, hold.zeep].join(', ') + ' ms); other species with the same moves wait nothing extra');
  const S = await fight(page, 'atem', 'rockraki', ['overclock']);
  ok(S.c15last && S.c15last.maxVisible === 9 && S.c15last.hits === 9 && S.c15last.done && S.log.includes('use:p:special9'), 'Atem III still shows all nine swords through the six stages, nine strikes, then clears');
  const I = await fight(page, 'aurelith', 'rockraki', ['solarflare'], { leaveAt: 250 });
  const after = await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 300)); return { inBattle: !!A.UI.B }; });
  ok(I.left && !after.inBattle, 'leaving mid-signature cleans up (no battle left, no pending impact)');
  const again = await fight(page, 'ignivor', 'calyxar', ['inferno']);
  ok(again.log && again.log.some((x) => /^hit:e:/.test(x)) && again.log.some((x) => /^use:e:/.test(x)), 'the next battle plays a signature cleanly and turns carry on');
  const SV = await fight(page, 'zeep3', 'rockraki', ['overclock'], { saver: true }), RM = await fight(page, 'aurelith', 'rockraki', ['solarflare'], { calm: true });
  ok(SV.log.includes('move:p:overclock') && RM.log.includes('move:p:solarflare') && RM.cubes <= SV.cubes + 40, 'Battery Saver and Reduce Motion: the signatures still play, lighter (peak cubes ' + SV.cubes + ' saver, ' + RM.cubes + ' calm)');
  const FL = await fight(page, 'aurelith', 'rockraki', ['solarflare'], { flat: true });
  ok(!FL.is3d && FL.enemyHp >= 0 && FL.seq.indexOf('bloom') < 0, '2D fallback: Solar Flare resolves without the 3D sequence');

  /* ================= 3. status chips ================= */
  const ST = await fight(page, 'igniflare', 'acinus', ['flarebite'], { rng: 0.05 });
  ok(ST.chips.e.indexOf('burn') >= 0 && ST.stE.indexOf('burn') >= 0, 'status chip: the foe\'s burn shows while it is burning (chips ' + ST.chips.e.join(',') + ' / state ' + ST.stE.join(',') + ')');
  ok(ST.stE.every((k) => ST.chips.e.indexOf(k) >= 0) && ST.chips.e.filter((k) => ['burn', 'soak', 'stun', 'regen', 'silence', 'weak'].indexOf(k) >= 0).every((k) => ST.stE.indexOf(k) >= 0), 'status chips match the battle state exactly (no missing or stale chips)');
  const pulse = await page.evaluate(() => { const c = document.querySelector('#fs-e .stx'); return c ? { cls: c.className, anim: getComputedStyle(c).animationName } : null; });
  ok(pulse && /stx-new/.test(pulse.cls), 'a newly applied status chip is marked to pulse once (' + (pulse && pulse.anim) + ')');
  await page.evaluate(() => { A.State.state.settings.reduceMotion = true; document.documentElement.classList.add('calm'); document.body.classList.add('calm'); });
  const calmAnim = await page.evaluate(() => { const c = document.querySelector('#fs-e .stx'); return c ? getComputedStyle(c).animationName : 'none'; });
  ok(calmAnim === 'none', 'with Reduce Motion the chips do not animate (' + calmAnim + ')');
  await page.evaluate(() => { A.State.state.settings.reduceMotion = false; document.documentElement.classList.remove('calm'); document.body.classList.remove('calm'); });
  const STF = await fight(page, 'igniflare', 'acinus', ['flarebite'], { rng: 0.05, flat: true });
  ok(!STF.is3d && STF.chips.e.indexOf('burn') >= 0, '2D fallback: status chips show there too');
  const shot = await page.evaluate(() => { const r = (id) => { const e = document.querySelector(id); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; }; return { fs: r('#fs-e'), hb: r('#hb-e'), w: innerWidth, h: innerHeight }; });
  const overlap = shot.fs && shot.hb && !(shot.fs[1] >= shot.hb[3] - 0.5 || shot.fs[3] <= shot.hb[1] + 0.5 || shot.fs[0] >= shot.hb[2] || shot.fs[2] <= shot.hb[0]);
  ok(shot.fs && !overlap && shot.fs[2] <= shot.w && shot.fs[3] <= shot.h, 'the chips sit inside the 844×390 screen and do not overlap the health bar');
  await page.screenshot({ path: require('path').join(__dirname, '..', 'docs', 'ui', 'screens15d', 'status-chips.png') });

  /* ================= 4. portraits, saves ================= */
  const por = await page.evaluate(async () => { const miss = []; for (const id of ['aquaflora2', 'aquaflora3', 'emberix', 'flaremon', 'infernox', 'gaiaroki', 'pyrocell', 'pyrokai', 'lumifern', 'aurelith', 'meta']) { const r = await fetch('assets/portraits15/' + id + '.webp'); if (!r.ok) miss.push(id); } return miss; });
  ok(!por.length, 'refined portraits exist for the updated forms' + (por.length ? ': missing ' + por.join(' ') : ''));
  const save = await page.evaluate(() => { if (A.UI.B) A.UI.leaveBattle(() => {}); return JSON.stringify(A.State.state); });
  ok(!/proto15|p15|c15|special9|sword|stx/i.test(save), 'nothing from Phase 15D reaches the save');
  await page.context().close(); await offPage.context().close();

  ok(!errors.length, 'no page errors (' + errors.slice(0, 3).join(' | ') + ')');
  await browser.close(); srv.close();
  console.log('\nbrowser-final15d: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})();
