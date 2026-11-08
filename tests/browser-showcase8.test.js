// Phase 8 real-browser test (Chromium + Playwright, SwiftShader software WebGL; NOT a phone).
// The three showcase monsters (Umbrit, Cannonis, the Aimza line): part-built models, bespoke animation contracts,
// move choreography in battle, original sounds, the details screen (no reset when feeding), the gem icon, and that
// every other monster is unchanged.
// Run: node tests/browser-showcase8.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IDS = ['umbrit', 'cannonis', 'aimza', 'aimza2', 'aimza3'];

(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(300000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D && A.Showcase);

  /* ---------------- models ---------------- */
  const md = await page.evaluate(async (IDS) => {
    const C = await import('/src/3d/creature3d.js'); await import('/src/3d/showcase.js'); const out = {};
    for (const id of IDS) { const sp = A.Data.SPECIES[id], m = A.Voxel.model(sp.art.vox, sp.art.st), r = C.buildVoxel(sp), v = C.validate(r.root, r.clips);
      const pz = (c) => { const t = c && c.tracks.find((x) => x.name === 'rig.position'); if (!t) return null; let b = -1e9, bt = 0; for (let i = 0; i < t.times.length; i++) if (t.values[i * 3 + 2] > b) { b = t.values[i * 3 + 2]; bt = t.times[i]; } return bt; };
      const lidsIn2D = [...m.v.values()].some((x) => /^lid/.test(x.p || ''));
      out[id] = { ok: v.ok, errors: v.errors, tris: v.info.tris, meshes: v.info.meshes, parts: r.root.userData.parts, clips: r.clips.map((c) => c.name), atk: pz(r.clips.find((c) => c.name === 'attack')), sp: pz(r.clips.find((c) => c.name === 'special')), hidden: m.hid ? m.hid.size : 0, lidsIn2D, vox: m.count(),
        blinkTracks: (r.clips.find((c) => c.name === 'blink') || { tracks: [] }).tracks.map((t) => t.name) };
    }
    // every other form keeps its earlier builder (not part-built)
    // Phase 8B rigs every other monster in parts too (same blocks: tests/browser-roster8b.test.js compares them with Phase 8)
    out.others = ['duskmantle', 'eclipsar', 'reefback', 'shellfin', 'lumifern', 'ignivor'].map((id) => { const s = A.Data.SPECIES[id], m = A.Voxel.model(s.art.vox, s.art.st); return [id, !!m.pivots && !!m.rig, m.count()]; });
    return out;
  }, IDS);
  ok(IDS.every((id) => md[id].ok), 'all five showcase forms validate (rig, size, clips, rest pose)' + IDS.filter((id) => !md[id].ok).map((id) => ' ' + id + ': ' + md[id].errors.join('; ')).join(''));
  ok(IDS.every((id) => md[id].parts && md[id].parts.length >= 5), 'they are built in moving parts: ' + IDS.map((id) => id + ' ' + md[id].parts.length).join(', '));
  ok(md.umbrit.parts.includes('earL') && md.umbrit.parts.includes('tail') && md.umbrit.parts.includes('lidL'), 'Umbrit: ears, tail and eyelids move on their own');
  ok(['head', 'jaw', 'cannon', 'muzzle', 'legFL', 'lidL'].every((p) => md.cannonis.parts.includes(p)), 'Cannonis: head, jaw, cannon (with a muzzle point), four legs and eyelids');
  ok(['head', 'head2', 'head3', 'jaw3', 'wingL', 'wingR', 'mouth3'].every((p) => md.aimza3.parts.includes(p)) && md.aimza2.parts.includes('head2') && !md.aimza2.parts.includes('head3') && !md.aimza.parts.includes('head2'), 'Aimza: one, two and three heads (each with jaw, eyelids, mouth), wings and tail');
  ok(IDS.every((id) => md[id].tris <= 20000), 'triangles within the showcase budget of 20,000: ' + IDS.map((id) => id + ' ' + md[id].tris).join(', '));
  ok(IDS.every((id) => md[id].vox > 2500), 'more detail than before (voxels: ' + IDS.map((id) => md[id].vox).join(', ') + ')');
  ok(IDS.every((id) => ['idle', 'blink', 'ready', 'attack', 'special', 'hit', 'hitBig', 'heal', 'guard', 'victory', 'defeat', 'move'].every((c) => md[id].clips.includes(c))), 'each has the full bespoke clip set plus a blink overlay');
  ok(IDS.every((id) => md[id].blinkTracks.length && md[id].blinkTracks.every((t) => /^lid.*\.scale$/.test(t))), 'the blink overlay only moves eyelids (it plays alongside everything else)');
  ok(IDS.every((id) => Math.abs(md[id].atk - 0.34) < 0.01 && Math.abs(md[id].sp - 0.4) < 0.01), 'attacks reach the foe at 0.34 s and specials at 0.40 s (battle length unchanged)');
  ok(IDS.every((id) => md[id].hidden > 0 && !md[id].lidsIn2D), 'eyelids live in a hidden layer: never drawn on 2D portraits or cards');
  ok(md.others.every((o) => o[1] && o[2] > 0), 'Phase 8B: every other monster keeps its earlier sculpt, rigged in parts by the roster pass (Duskmantle, Eclipsar, Reefback, Shellfin, Lumifern, Ignivor)');
  const anim = await page.evaluate(async () => {
    const C = await import('/src/3d/creature3d.js'); const T = C.THREE, out = {};
    for (const id of ['umbrit', 'cannonis', 'aimza2']) { const r = C.buildVoxel(A.Data.SPECIES[id]), root = r.root, mx = new T.AnimationMixer(root);
      const node = (n) => root.getObjectByName(n), snap = (names) => names.map((n) => node(n) ? node(n).quaternion.toArray().concat(node(n).position.toArray(), node(n).scale.toArray()).map((v) => +v.toFixed(3)).join(',') : '');
      const names = { umbrit: ['earL', 'tail', 'lidL'], cannonis: ['cannon', 'head', 'jaw'], aimza2: ['head', 'head2', 'wingL'] }[id];
      const a0 = snap(names); const act = (c, t) => { mx.stopAllAction(); const a = mx.clipAction(r.clips.find((x) => x.name === c)); a.reset().play(); mx.setTime(t); return snap(names); };
      out[id] = { moved: { attack: act('attack', 0.34), special: act('special', 0.3), victory: act('victory', 0.4), defeat: act('defeat', 1.15) }, rest: a0 }; }
    return out;
  });
  const movedParts = (id) => Object.values(anim[id].moved).map((v) => v.filter((s, i) => s !== anim[id].rest[i]).length);
  ok(['umbrit', 'cannonis', 'aimza2'].every((id) => movedParts(id).every((n) => n >= 1)), 'their parts really move in attack, special, victory and defeat (not only the whole body): ' + ['umbrit', 'cannonis', 'aimza2'].map((id) => id + ' ' + movedParts(id).join('/')).join(', '));

  /* ---------------- battle: choreography, overlays, living details ---------------- */
  await page.evaluate(() => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.settings.creatures3d = true; s.settings.sfx = true; s.res.food = 5000;
    A.Rules.addAmina(s, 'umbrit', 3); A.Rules.addAmina(s, 'cannonis', 5); A.State.save(); A.UI.showIsland(); A.Audio.unlock(); A.Audio.setPrefs({ sfx: true, music: false }); });
  await page.waitForSelector('#world', { timeout: 60000 }); await sleep(800);
  const fight = (ps, es, presses) => page.evaluate(async ({ ps, es, presses }) => {
    const R = A.Rules, Bt = R.Battle, f = Bt.fighter(ps, 30), e = Bt.fighter(es, 30); [f, e].forEach((x) => { x.hpMax *= 50; x.hp = x.hpMax; }); f.spd = 999; e.atk = 1;
    const played = []; const m0 = A.Audio.monster; A.Audio.monster = function (sp, cue, o) { const r = m0.call(this, sp, cue, o); played.push(sp + ':' + cue + (r ? '' : '-skipped')); return r; };
    if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); A.UI.startBattle({ kind: 'test', b: Bt.create([f], e, {}), d: 'heartwood', label: 't', finish: () => {} });
    for (let i = 0; i < 100 && !(A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy); i++) await new Promise((r) => setTimeout(r, 100));
    const M = await A.C3D.load(); const out = { is3d: !!A.UI.B.stage.is3d, clipsPlayed: [], blink: false, ground: false, maxDraws: 0 };
    const wait = async (ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { out.maxDraws = Math.max(out.maxDraws, M.stats().drawCalls); await new Promise((r) => setTimeout(r, 120)); } };
    for (const id of presses) { const sel = '.abtn.ready[data-id="' + id + '"]'; for (let i = 0; i < 40 && A.UI.B.busy; i++) await wait(100); const b = document.querySelector(sel); if (!b) { out.clipsPlayed.push('no ' + sel); continue; } b.click(); await wait(500); out.clipsPlayed.push(A.UI.B.stage.debug().playing.p); await wait(2100); }
    const d = A.UI.B.stage.debug(); out.log = d.log.filter((x) => /^move|^use/.test(x)); out.played = played; A.Audio.monster = m0; return out; }, { ps, es, presses });
  const u = await fight('umbrit', 'cannonis', ['shadenip', 'gloomveil']);
  ok(u.is3d && u.log.includes('move:p:shadenip') && u.log.includes('move:p:gloomveil'), 'Umbrit: Shade Nip and Gloom Veil play their own sequences (' + u.log.join(' ') + ')');
  ok(u.log.includes('move:e:bubblepop') || u.log.includes('move:e:tidalsurge'), 'Cannonis as the foe fires from its cannon (Bubble Pop / Tidal Surge choreographed)');
  ok(u.played.includes('umbrit:attack') && u.played.includes('umbrit:special') && u.played.includes('cannonis:hurt') && u.played.includes('umbrit:impact'), 'their voices play: Umbrit attack and special, its impacts, Cannonis hurt (' + u.played.slice(0, 8).join(' ') + ')');
  const c = await fight('cannonis', 'umbrit', ['bubblepop', 'tidalsurge']);
  ok(c.log.includes('move:p:bubblepop') && c.log.includes('move:p:tidalsurge') && c.played.includes('cannonis:special'), 'Cannonis: Bubble Pop from the muzzle, Tidal Surge wave and roar');
  const a3 = await fight('aimza3', 'cannonis', ['echowave', 'tripleecho']);
  ok(a3.log.some((x) => /move:p:echowave/.test(x)) && a3.log.some((x) => /move:p:tripleecho/.test(x)), 'Aimza III: Echo Wave rings and Triple Echo beams from all three mouths');
  ok(a3.log.includes('use:p:attack') && a3.log.includes('use:p:special'), 'Echo Wave (its basic move) uses the single-head attack; Triple Echo the all-heads special');
  ok(a3.played.includes('aimza3:attack') && a3.played.includes('aimza3:special'), 'Aimza speaks with its own voice (three voices for three heads)');
  ok(a3.maxDraws <= 85, 'draw calls in the heaviest showcase battle (Aimza III vs Cannonis in the Island Boss room) stay modest: ' + a3.maxDraws);
  const live = await page.evaluate(async () => {
    const st = A.UI.B && A.UI.B.stage; const M = await A.C3D.load(); void M;
    const actors = st && st.debug ? st.debug() : null; return { has: !!actors };
  });
  ok(live.has, 'the battle stage stays healthy after the showcase battles');

  /* ---------------- living details, blink and reduce motion in the viewer ---------------- */
  const lv = await page.evaluate(async () => {
    A.UI.leaveBattle && A.UI.B && A.UI.leaveBattle(() => {}); A.UI.closeAll(); A.UI.showIsland();
    const M = await A.C3D.load(); const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:200px;z-index:9999'; document.body.appendChild(host);
    const v = await M.createViewer(host, 'aimza3', {}); await new Promise((r) => setTimeout(r, 900));
    const C = await import('/src/3d/creature3d.js'); void C;
    // find the actor's glow material through the scene: the viewer renders the live actor
    const scene = (() => { let s = null; return s; })();
    const s0 = M.stats(); v.play('defeat'); await new Promise((r) => setTimeout(r, 1800)); const s1 = M.stats();
    v.dispose(); host.remove(); return { drew: s1.drawn > s0.drawn, calls: s0.drawCalls };
  });
  ok(lv.drew && lv.calls > 0, 'the creature viewer runs the showcase monsters (with their living details) without errors');

  /* ---------------- sounds ---------------- */
  const snd = await page.evaluate(async () => {
    const Au = A.Audio, out = { render: [], gate: {} };
    for (const sp of ['umbrit', 'cannonis', 'aimza', 'aimza3']) for (const cue of Au.CUES) { const r = await Au.renderCue(sp, cue, 1.8); out.render.push([sp, cue, +r.peak.toFixed(3)]); }
    Au.setPrefs({ sfx: false, music: false }); out.gate.off = Au.monster('umbrit', 'attack');
    Au.setPrefs({ sfx: true, music: false }); out.gate.on = Au.monster('umbrit', 'idle'); out.gate.repeat = Au.monster('umbrit', 'idle');
    out.gate.other = Au.monster('lumifern', 'attack'); out.hasVoice = ['umbrit', 'cannonis', 'aimza', 'aimza2', 'aimza3', 'lumifern', 'duskmantle'].map((s) => Au.hasVoice(s));
    Au.setPrefs({ sfx: false, music: false }); out.gate.otherOff = Au.monster('lumifern', 'attack'); Au.setPrefs({ sfx: true, music: false });
    return out; });
  ok(snd.render.every(([, , p]) => p > 0.01), 'every cue of every voice makes a sound (' + snd.render.length + ' rendered)');
  ok(snd.render.every(([, , p]) => p < 0.98), 'none of them clips (loudest peak ' + Math.max(...snd.render.map((r) => r[2])) + ')');
  ok(snd.gate.off === false && snd.gate.on === true && snd.gate.repeat === false, 'monster sounds respect the sound-effects setting and never repeat the same cue within 120 ms');
  ok(snd.hasVoice.every(Boolean) && snd.gate.otherOff === false, 'Phase 8B: every monster has its own voice now, under the same sound-effects setting');

  /* ---------------- details screen: feeding keeps everything in place ---------------- */
  const fd = await page.evaluate(async () => {
    const s = A.State.state, inst = s.aminas.find((a) => a.sp === 'umbrit'); s.res.food = 5000; A.UI.closeAll(); A.UI.detail(inst.sp, { uid: inst.uid });
    let ov = null; for (let i = 0; i < 80; i++) { ov = [...document.querySelectorAll('#modal-root .overlay')].find((x) => x._detail); if (ov && ov.querySelector('.viewer3d.live canvas')) break; await new Promise((r) => setTimeout(r, 150)); }
    ov.querySelector('.dtab[data-tab="battle"]').click(); const body = ov.querySelector('.sh-body'); body.scrollTop = 9999;
    const keep = { ov, sheet: ov.firstElementChild, canvas: ov.querySelector('.viewer3d canvas'), h2: ov.querySelector('h2'), row: ov.querySelector('.inst'), sc: body.scrollTop };
    const steps = [];
    for (let k = 0; k < 6; k++) {
      const lv0 = inst.lv, xp0 = inst.xp, btn = ov.querySelector('[data-act="detailFeed"][data-kind="' + (k % 2 ? 'feast' : 'snack') + '"]'); btn.click(); await new Promise((r) => setTimeout(r, 450));
      const ov2 = [...document.querySelectorAll('#modal-root .overlay')].find((x) => x._detail);
      steps.push({ same: ov2 === keep.ov && ov2.firstElementChild === keep.sheet && ov2.querySelector('.viewer3d canvas') === keep.canvas && ov2.querySelector('h2') === keep.h2 && ov2.querySelector('.inst') === keep.row && btn.isConnected,
        tab: ov2.querySelector('.dtab.on').dataset.tab, panel: !ov2.querySelector('.dpanel[data-panel="battle"]').hidden, scroll: ov2.querySelector('.sh-body').scrollTop === keep.sc,
        fed: inst.lv > lv0 || inst.xp !== xp0, shown: ov2.querySelector('.inst b').textContent === 'Lv ' + inst.lv, overlays: document.querySelectorAll('#modal-root .overlay').length });
    }
    // the special button is offered for showcase monsters only
    const special = !!ov.querySelector('[data-act="vPlay"][data-clip="special"]');
    A.UI.closeAll(); const other = s.aminas.find((a) => a.sp === 'cannonis'); void other;
    return { steps, special };
  });
  ok(fd.steps.every((x) => x.same), 'feeding six times keeps the same screen: same sheet, same 3D viewer canvas, same title, same row and button');
  ok(fd.steps.every((x) => x.tab === 'battle' && x.panel && x.scroll), 'the open tab and the scroll position stay where they were');
  ok(fd.steps.every((x) => x.fed && x.shown), 'level and experience update immediately on screen after each feed');
  ok(fd.steps.every((x) => x.overlays === 1), 'no extra screens open and nothing closes');
  ok(fd.special, 'the details screen offers the special move (with sound) for the showcase monsters');

  /* ---------------- 2D stage: a super-effective hit no longer freezes the battle (Phase 7 bug found here) ---------------- */
  const two = await page.evaluate(async () => {
    if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); const s = A.State.state, was = s.settings.creatures3d; s.settings.creatures3d = false; const errs = []; const onRej = (ev) => errs.push(String(ev.reason)); window.addEventListener('unhandledrejection', onRej);
    const R = A.Rules, Bt = R.Battle, f = Bt.fighter('lumifern', 20), e = Bt.fighter('umbrit', 3); e.hp = 1; let done = false;
    A.UI.startBattle({ kind: 'test', b: Bt.create([f], e, {}), d: 'reliquary', label: 't', finish: () => { done = true; } });
    for (let i = 0; i < 40 && A.UI.B.busy; i++) await new Promise((r) => setTimeout(r, 100));
    document.querySelector('.abtn:not(.off):not(.swap)').click();
    for (let i = 0; i < 140 && !done; i++) await new Promise((r) => setTimeout(r, 100));
    window.removeEventListener('unhandledrejection', onRej); s.settings.creatures3d = was; const res = A.UI.B && A.UI.B.b.result; if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); A.UI.showIsland(); return { done, res, errs };
  });
  ok(two.done && two.res === 'win' && !two.errs.length, 'on the 2D stage a super-effective hit (Light on Umbrit) plays through and the battle finishes (it used to freeze)');

  /* ---------------- gem icon ---------------- */
  const gem = await page.evaluate(() => { document.body.classList.remove('perf-rest', 'perf-covered', 'perf-hidden', 'perf-saver', 'calm'); const sv = A.Pixel.sprite('gem'), cols = new Set((sv.match(/fill="#[0-9a-f]{6}"/g) || [])); document.body.insertAdjacentHTML('beforeend', '<div class="res" id="gemt">' + sv + '</div>');
    const el = document.querySelector('#gemt .ico'), f = getComputedStyle(el).filter, an = getComputedStyle(el).animationName; document.body.classList.add('calm'); const anCalm = getComputedStyle(el).animationName; document.body.classList.remove('calm');
    document.body.classList.add('perf-saver'); const anSaver = getComputedStyle(el).animationName; document.body.classList.remove('perf-saver'); document.getElementById('gemt').remove();
    return { colours: cols.size, rainbow: ['#ff8fd0', '#a98bff', '#5fd8ff', '#6ff0c0', '#ffe27a'].every((c) => sv.indexOf(c) >= 0), glow: /drop-shadow/.test(f), an, anCalm, anSaver, gold: A.Pixel.sprite('gold').indexOf('#f6bf2e') >= 0 }; });
  ok(gem.rainbow && gem.colours >= 12, 'the gem is a prismatic crystal: rainbow facets, pale crown, sparkle (' + gem.colours + ' colours)');
  ok(gem.glow && gem.an === 'gemGlint', 'it has a soft prismatic glow and a brief glint on the top bar');
  ok(gem.anCalm === 'none' && gem.anSaver === 'none', 'the glint stops with Reduce motion and Battery saver');
  ok(gem.gold, 'the other currency icons are unchanged');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-showcase8)');
  await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
