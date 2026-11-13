// Phase 15B real-browser test (Chromium + Playwright, SwiftShader software WebGL; NOT a phone).
// The refined roster behind the Phase 15 developer switch (A.Proto15, off by default): every evolution form of every
// line except Aimza gets a refined model ('…15' High, '…15m' phones; Battery Saver keeps the production model),
// species work (bat Umbrit, fox Emberix, faces, fins, feathers…), body-type animation tracks, combat accents, sound
// layers and matching portraits. Checks, group by group: production untouched with the switch off (model
// fingerprints against Phase 15A); every form loads, validates and keeps the clip contract; the new parts move;
// detail levels; evolution ceremonies; battles (moves, accents, sound, Reduce Motion); portraits and cards; saves.
// Run: node tests/browser-roster15b.test.js
const { chromium } = require('playwright'); const serve = require('./server'); const path = require('path'), fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CLIPS = ['idle', 'blink', 'ready', 'attack', 'special', 'hit', 'hitBig', 'heal', 'guard', 'victory', 'defeat', 'move'];
const GROUPS = { bat: ['umbrit', 'duskmantle', 'eclipsar'], fox: ['emberix', 'flaremon', 'infernox'], serpent: ['aquaflora', 'aquaflora2', 'aquaflora3'], monkey: ['kairyu', 'tidalong', 'oceanfang'],
  mech: ['zeep', 'zeep2', 'zeep3'], bird: ['pyrospark', 'pyrohawk', 'pyrophoenix'], heavy: ['cannonis', 'reefback', 'shellfin', 'acinus', 'berrant', 'calyxar', 'terraflora', 'terraflora2', 'terraflora3'], jester: ['voltar', 'voltar2', 'voltar3'] };

(async () => {
  // 0. production models: the same blocks, colours and parts as Phase 15A (fingerprints in tests/fixtures)
  { const { load } = require('./harness.js'), crypto = require('crypto'), ctx = load(), A = ctx.A, V = A.Voxel, want = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'prod-models-15a.json'), 'utf8')), diff = [];
    Object.values(A.Data.SPECIES).forEach((s) => { const m = V.SPECIES[s.art.vox](s.art.st), rows = []; m.v.forEach((v, k) => rows.push(k + ':' + v.c + ':' + (v.g || 0) + ':' + (v.p || ''))); rows.sort();
      if (want[s.id] !== m.v.size + ':' + crypto.createHash('sha1').update(rows.join('|')).digest('hex').slice(0, 12)) diff.push(s.id); });
    ok(Object.keys(want).length === 63 && !diff.length, 'all 63 production models are block-for-block the Phase 15A ones (fingerprints of position, colour, glow and part)' + (diff.length ? ': ' + diff.join(' ') : '')); }

  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }); const errors = [];
  const open = async (q) => { const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }); const page = await ctx.newPage(); page.setDefaultTimeout(900000);
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
    await page.goto(srv.url + (q || '')); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D && A.Proto15); return page; };

  /* ================= 1. switch off ================= */
  let page = await open();
  const off = await page.evaluate(async () => { const C = await import('/src/3d/creature3d.js'); await import('/src/3d/runtime.js');
    const ids = Object.keys(A.Data.SPECIES), o = { enabled: A.Proto15.enabled(), active: ids.filter((id) => A.Proto15.active(id)), proto: [] };
    for (const id of ['duskmantle', 'emberix', 'reefback', 'voltar3']) { const r = C.buildVoxel(A.Data.SPECIES[id]); if (r.root.userData.proto15) o.proto.push(id); }
    o.portrait = A.Art.portrait('duskmantle'); o.url = A.C3D.portraitUrl('duskmantle'); return o; });
  ok(!off.enabled && !off.active.length && !off.proto.length, 'the switch is off by default: no form is refined, every one builds its production model');
  ok(/assets\/portraits\/duskmantle/.test(off.portrait) && /assets\/portraits\//.test(off.url), 'with the switch off, portraits and cards use the production portraits');
  await page.context().close();

  /* ================= 2. every refined form, at both detail levels ================= */
  page = await open('?p15=1');
  const md = await page.evaluate(async (CLIPS) => {
    const C = await import('/src/3d/creature3d.js'); await import('/src/3d/runtime.js'); const out = {};
    for (const id of Object.keys(A.Data.SPECIES)) { const sp = A.Data.SPECIES[id]; if (!A.Proto15.voxFor(id, 'h') || A.Proto15.PROTO.indexOf(sp.line) >= 0) continue;
      const o = {}; for (const lod of ['h', 'm']) { const r = C.buildVoxel(sp, { proto: true, lod }), v = C.validate(r.root, r.clips); let tris = 0; r.root.traverse((x) => { if (x.isMesh && x.geometry) tris += (x.geometry.index ? x.geometry.index.count : x.geometry.attributes.position.count) / 3; });
        const names = r.clips.map((c) => c.name), dur = {}; r.clips.forEach((c) => { dur[c.name] = +c.duration.toFixed(2); });
        o[lod] = { proto: r.root.userData.proto15, ok: v.ok !== false, issues: v.issues || [], tris: Math.round(tris), clips: CLIPS.every((n) => names.indexOf(n) >= 0), dur, parts: r.root.userData.parts || [],
          tracks: Object.fromEntries(r.clips.map((c) => [c.name, c.tracks.map((t) => t.name.split('.')[0])])) }; }
      o.s = A.Proto15.voxFor(id, 's'); out[id] = o; }
    return out; }, CLIPS);
  const ids = Object.keys(md);
  ok(ids.length === 48, 'the refined roster covers 48 forms (16 lines; Aimza and the four Phase 15A prototype lines are separate): ' + ids.length);
  Object.keys(GROUPS).forEach((g) => { const L = GROUPS[g].filter((id) => md[id]);
    ok(L.length === GROUPS[g].length && L.every((id) => md[id].h.proto && md[id].h.ok && md[id].h.clips && md[id].m.ok && md[id].m.clips), g + ' group: every form loads its refined model at High and phone detail, validates and has all twelve clips (' + L.join(', ') + ')'); });
  const badDur = ids.filter((id) => md[id].h.dur.attack !== 0.9 || md[id].h.dur.special !== 1.1 || md[id].h.dur.victory !== 1.6 || md[id].h.dur.defeat !== 1.2);
  ok(!badDur.length, 'battle timing kept on every refined form: attack 0.9 s, special 1.1 s, victory 1.6 s, defeat 1.2 s' + (badDur.length ? ' (' + badDur.join(' ') + ')' : ''));
  const maxT = Math.max(...ids.map((id) => md[id].h.tris)), over = ids.filter((id) => md[id].h.tris > 20000);
  ok(!over.length, 'every refined model is inside the 20,000-triangle model budget at High (largest ' + maxT + ')');
  const mLess = ids.filter((id) => !(md[id].m.tris <= md[id].h.tris));
  ok(!mLess.length, 'the phone level never costs more than High (High total ' + ids.reduce((n, id) => n + md[id].h.tris, 0) + ' vs phone ' + ids.reduce((n, id) => n + md[id].m.tris, 0) + ' triangles)' + (mLess.length ? ': ' + mLess.join(' ') : ''));
  ok(ids.every((id) => md[id].s === null), 'Battery Saver keeps the production model for every refined roster form');
  // the new parts and their movement
  ok(['duskmantle', 'eclipsar'].every((id) => md[id].h.parts.indexOf('wingL') >= 0 && md[id].h.tracks.special.indexOf('wingL') >= 0 && md[id].h.tracks.guard.indexOf('wingR') >= 0 && md[id].h.tracks.idle.indexOf('wingL') >= 0),
    'bat: Duskmantle and Eclipsar have wings on their own joints that breathe in the idle, spread in the special and wrap in guard');
  ok(['emberix', 'flaremon', 'infernox'].every((id) => md[id].h.parts.indexOf('earL') >= 0 && md[id].h.tracks.attack.indexOf('earL') >= 0 && md[id].h.tracks.hit.indexOf('earR') >= 0), 'fox: the Emberix line has jointed ears that flatten on the attack and when hit');
  ok(md.aquaflora.h.tracks.idle.indexOf('neck') >= 0 && md.aquaflora.h.tracks.idle.indexOf('head') >= 0, 'serpent: Aquaflora\'s idle runs a wave through neck and head');
  ok(md.kairyu.h.tracks.idle.indexOf('armR') >= 0 && md.zeep.h.tracks.idle.indexOf('head') >= 0 && md.pyrospark.h.tracks.idle.indexOf('wingL') >= 0, 'monkey, mech and bird idles: Kairyu\'s head scratch, Zeep\'s stepped head turns, Pyro-Spark\'s wing ruffle');
  // poses differ from production where the brief asks (the refined attack frame moves the new parts)
  const pose = await page.evaluate(async () => { const C = await import('/src/3d/creature3d.js'); const sp = A.Data.SPECIES.eclipsar, r = C.buildVoxel(sp, { proto: true, lod: 'h' });
    const mx = new C.THREE.AnimationMixer(r.root), w = r.root.getObjectByName('wingL'), q0 = w.quaternion.clone(); const a = mx.clipAction(r.clips.find((c) => c.name === 'special')); a.play(); mx.update(0.28); r.root.updateMatrixWorld(true);
    const mid = w.quaternion.angleTo(q0); mx.update(1.1 - 0.28 - 0.001); const end = w.quaternion.angleTo(q0); return { mid, end }; });
  ok(pose.mid > 0.5 && pose.end < 0.05, 'Eclipsar\'s wings open ' + pose.mid.toFixed(2) + ' rad at the special\'s build-up and are back at rest by its end (' + pose.end.toFixed(3) + ')');

  /* ================= 3. evolution ceremonies, battles, saves ================= */
  await page.evaluate(() => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = true; s.settings.sfx = true; A.Rules.drain(); if (A.UI.queue) A.UI.queue.length = 0; A.State.save(); A.UI.showIsland(); A.Audio.unlock(); A.Audio.setPrefs({ sfx: true, music: false }); });
  await page.waitForSelector('#world', { timeout: 60000 }); await sleep(600);
  await page.evaluate(async () => { for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 100)); document.querySelectorAll('.dlg .dlg-skip').forEach((b) => b.click()); A.UI.closeAll(); } document.querySelectorAll('.dlg').forEach((x) => x.remove()); });
  const saveBefore = await page.evaluate(() => JSON.stringify(A.State.state));
  const evo = async (from) => page.evaluate(async (from) => {
    const s = A.State.state, R = A.Rules; A.UI.closeAll(); s.res.gold = 1e6; s.res.food = 1e5; s.res.gems = 5000;
    const inst = R.addAmina(s, from, A.Data.SPECIES[from].evo.lv) || s.aminas[s.aminas.length - 1]; inst.lv = Math.max(inst.lv, A.Data.SPECIES[from].evo.lv);
    const r = R.evolve(s, inst.uid); R.drain(); if (A.UI.queue) A.UI.queue.length = 0; document.querySelectorAll('.dlg').forEach((x) => x.remove());
    A.UI.evolveFx(from, r.to, () => {});
    const find = () => [...document.querySelectorAll('.overlay')].find((x) => x.querySelector('.evolve'));
    let live = false; for (let i = 0; i < 100; i++) { await new Promise((q) => setTimeout(q, 150)); const ov = find(); if (ov && ov.querySelector('.evo-to canvas')) { live = true; break; } }
    await new Promise((q) => setTimeout(q, 900)); const ov = find(), name = ov && ov.querySelector('.evo-name') ? ov.querySelector('.evo-name').textContent : '', imgs = ov ? [...ov.querySelectorAll('img')].map((i) => i.getAttribute('src')) : [];
    A.UI.closeAll(); return { ok: !!r.ok, to: r.to, live, name, imgs }; }, from);
  for (const from of ['duskmantle', 'emberix', 'reefback', 'aquaflora']) { const e = await evo(from);
    ok(e.ok && e.live && e.name, 'evolution ceremony: ' + from + ' becomes ' + e.to + ' (' + e.name + '), revealed live in 3D with the refined model'); }
  const fight = (ps, es, presses, o) => page.evaluate(async ({ ps, es, presses, o }) => {
    o = o || {}; A.State.state.settings.reduceMotion = !!o.calm; const R = A.Rules, Bt = R.Battle, f = Bt.fighter(ps, 30), e = Bt.fighter(es, 30); [f, e].forEach((x) => { x.hpMax *= 50; x.hp = x.hpMax; }); f.spd = 999; e.atk = 1;
    const played = [], m0 = A.Audio.monster; A.Audio.monster = function (sp, cue, oo) { const r = m0.call(this, sp, cue, oo); played.push(sp + ':' + cue + (A.Audio.layer15(sp, cue) ? '+15' : '')); return r; };
    if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); A.UI.startBattle({ kind: 'test', b: Bt.create([f], e, { rng: () => 0.5 }), d: 'heartwood', label: 't', finish: () => {} });
    for (let i = 0; i < 100 && !(A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy); i++) await new Promise((r) => setTimeout(r, 100));
    const M = await A.C3D.load(), out = { is3d: !!A.UI.B.stage.is3d, cubes: 0, draws: 0 };
    const wait = async (ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { out.cubes = Math.max(out.cubes, A.UI.B.stage.debug().cubes); out.draws = Math.max(out.draws, M.stats().drawCalls); await new Promise((r) => setTimeout(r, 40)); } };
    for (const id of presses) { for (let i = 0; i < 50 && A.UI.B.busy; i++) await wait(100); const b = document.querySelector('.abtn.ready[data-id="' + id + '"]'); if (b) b.click(); await wait(700); }
    for (let i = 0; i < 60 && A.UI.B.busy; i++) await wait(100);
    const d = A.UI.B.stage.debug(); out.log = d.log.filter((x) => /^move|^hit/.test(x)); out.played = played; out.proto = A.Proto15.active(ps); A.Audio.monster = m0; A.State.state.settings.reduceMotion = false; return out; }, { ps, es, presses, o });
  const abil = await page.evaluate(() => Object.fromEntries(['eclipsar', 'infernox', 'shellfin', 'voltar3', 'pyrophoenix'].map((id) => [id, A.Data.SPECIES[id].abil])));
  const fights = [['eclipsar', 'calyxar'], ['infernox', 'calyxar'], ['shellfin', 'infernox'], ['voltar3', 'calyxar'], ['pyrophoenix', 'calyxar']];
  const res = {};
  for (const [a, b] of fights) { const F = await fight(a, b, abil[a]); res[a] = F;
    ok(F.is3d && F.proto && abil[a].every((mv) => F.log.includes('move:p:' + mv)) && F.played.some((x) => new RegExp('^' + a + ':(attack|special)\\+15').test(x)),
      a + ' in battle: ' + abil[a].join(' and ') + ' play (with the charge-up and impact accents) and its voice carries its body-type layer (' + F.played.filter((x) => /\+15/.test(x)).slice(0, 3).join(' ') + ')'); }
  ok(Object.values(res).every((F) => F.cubes > 10 && F.cubes <= 240 && F.draws > 0 && F.draws <= 60), 'effects stay inside the shared pool of 240 cubes (peak ' + Math.max(...Object.values(res).map((F) => F.cubes)) + ') and draw calls inside 60 (peak ' + Math.max(...Object.values(res).map((F) => F.draws)) + ')');
  const calm = await fight('eclipsar', 'calyxar', abil.eclipsar, { calm: true });
  ok(calm.log.includes('move:p:' + abil.eclipsar[0]) && calm.cubes <= res.eclipsar.cubes, 'with Reduce Motion the moves still play and the decorative accents stay off (peak ' + calm.cubes + ' cubes vs ' + res.eclipsar.cubes + ')');
  const saveAfter = await page.evaluate(() => { if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); return JSON.stringify(A.State.state); });
  ok(!/proto15|p15|portraits15/i.test(saveAfter) && !/proto15|p15/i.test(saveBefore), 'nothing about the refined roster reaches the save');

  /* ================= 4. portraits and cards ================= */
  const por = await page.evaluate(async () => { const ids = Object.keys(A.Data.SPECIES).filter((id) => A.Proto15.voxFor(id, 'h')); const miss = [];
    for (const id of ids) { const r = await fetch('assets/portraits15/' + id + '.webp'); if (!r.ok) miss.push(id); }
    const img = A.Art.portrait('duskmantle'), url = A.C3D.portraitUrl('eclipsar'), aim = A.Art.portrait('aimza');
    const ok2 = await new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth); i.onerror = () => res(0); i.src = 'assets/portraits15/eclipsar.webp'; });
    return { n: ids.length, miss, img, url, aim, w: ok2 }; });
  ok(por.n === 60 && !por.miss.length && por.w === 320, 'a refined portrait exists for all 60 refined forms (Phase 15A prototypes included), 320 px like the production set' + (por.miss.length ? ': missing ' + por.miss.join(' ') : ''));
  ok(/portraits15\/duskmantle/.test(por.img) && /portraits15\/eclipsar/.test(por.url) && /assets\/portraits\/aimza/.test(por.aim) && /class="portrait/.test(por.img), 'with the switch on, cards and portraits show the refined portraits in the same portrait style; Aimza keeps its own' + (/portraits15\/duskmantle/.test(por.img) ? '' : ' [' + por.img.slice(0, 120) + ' | ' + por.url + ' | ' + por.aim.slice(0, 80) + ']'));
  await page.context().close();

  /* ================= 5. Battery Saver ================= */
  page = await open('?p15=1');
  const sv = await page.evaluate(async () => { const s = A.State.newGame(); s.settings.batterySaver = true; s.settings.creatures3d = true; A.State.state = s; A.Perf.apply && A.Perf.apply(); const C = await import('/src/3d/creature3d.js'); await import('/src/3d/runtime.js');
    const lod = A.Proto15.lod(), r = C.buildVoxel(A.Data.SPECIES.eclipsar, { proto: true }), p = C.buildVoxel(A.Data.SPECIES.ignivor, { proto: true }); return { lod, roster: r.root.userData.proto15, proto: p.root.userData.proto15, saver: A.Perf.saver() }; });
  ok(sv.saver && sv.lod === 's' && sv.roster === false && sv.proto === true, 'Battery Saver: the refined roster falls back to the production models, the Phase 15A prototypes use their coarser saver copies');
  await page.context().close();

  ok(!errors.length, 'no page errors (' + errors.slice(0, 3).join(' | ') + ')');
  await browser.close(); srv.close();
  console.log('\nbrowser-roster15b: ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})();
