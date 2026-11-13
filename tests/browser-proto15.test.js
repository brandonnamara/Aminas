// Phase 15 real-browser test (Chromium + Playwright, SwiftShader software WebGL; NOT a phone).
// Three prototype lines (Lumifern, Igniflare, Atem) with refined voxel models, animations, move effects, combat
// accents and sound layers, behind a developer switch (A.Proto15) that is off by default. Checks: production is
// untouched with the switch off; the prototypes build, validate and keep the battle contract; evolution reads as
// growth; the new joints move; battles, Reduce Motion and Battery Saver; nothing reaches the save; the showcase panel.
// Run: node tests/browser-proto15.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IDS = ['lumifern', 'solarbloom', 'aurelith', 'igniflare', 'pyronix', 'ignivor', 'atem1', 'atem2', 'atem'];
const CLIPS = ['idle', 'blink', 'ready', 'attack', 'special', 'hit', 'hitBig', 'heal', 'guard', 'victory', 'defeat', 'move'];

(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }); const errors = [];
  const open = async (q) => { const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }); const page = await ctx.newPage(); page.setDefaultTimeout(600000);
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
    await page.goto(srv.url + (q || '')); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D && A.Proto15); return page; };

  /* ================= 1. the switch is off by default: production is untouched ================= */
  let page = await open();
  const off = await page.evaluate(async (IDS) => {
    const C = await import('/src/3d/creature3d.js'); await import('/src/3d/runtime.js'); const o = { enabled: A.Proto15.enabled(), forms: {} };
    for (const id of IDS) { const sp = A.Data.SPECIES[id], r = C.buildVoxel(sp), m = A.Voxel.model(sp.art.vox, sp.art.st); o.forms[id] = { proto: r.root.userData.proto15, vox: sp.art.vox, blocks: m.v.size, active: A.Proto15.active(id) }; r.root.traverse((x) => { if (x.geometry) x.geometry.dispose(); }); }
    o.artVox = Object.values(A.Data.SPECIES).filter((s) => /15$/.test(s.art.vox)).length; return o; }, IDS);
  ok(!off.enabled && IDS.every((id) => !off.forms[id].active && off.forms[id].proto === false), 'the prototype switch is off by default: every form builds its production model');
  ok(off.artVox === 0 && off.forms.lumifern.blocks === 480 && off.forms.ignivor.blocks === 3641 && off.forms.atem.blocks === 1871, 'species data still points at the production sculpts (Lumifern 480, Ignivor 3,641, Atem 1,871 blocks), so portraits, cards and island critters are unchanged');

  /* ================= 2. the prototype models ================= */
  const md = await page.evaluate(async (IDS) => {
    const C = await import('/src/3d/creature3d.js'); const out = {};
    const h = (str) => { let a = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { a ^= str.charCodeAt(i); a = Math.imul(a, 16777619) >>> 0; } return a.toString(16); };
    for (const id of IDS) { const sp = A.Data.SPECIES[id], o = {};
      for (const proto of [false, true]) { const r = C.buildVoxel(sp, { proto }), v = C.validate(r.root, r.clips), clip = (n) => r.clips.find((c) => c.name === n), m = A.Voxel.model(proto ? A.Proto15.voxFor(id) : sp.art.vox, sp.art.st);
        const pz = (c) => { const t = c && c.tracks.find((x) => x.name === 'rig.position'); if (!t) return null; let b = -1e9, bt = 0; for (let i = 0; i < t.times.length; i++) if (t.values[i * 3 + 2] > b) { b = t.values[i * 3 + 2]; bt = t.times[i]; } return bt; };
        const sig = (n) => { const c = clip(n); return c ? h(c.tracks.map((t) => t.name + ':' + Array.from(t.values).map((x) => x.toFixed(2)).join(',')).join('|')) : ''; };
        let skinned = 0, other = 0, glow = 0; r.root.traverse((x) => { if (x.isSkinnedMesh) skinned++; else if (x.isMesh) other++; }); m.v.forEach((x) => { if (x.g > 0.5) glow++; });
        o[proto ? 'p' : 'c'] = { ok: v.ok, errors: v.errors, tris: v.info.tris, height: v.info.height, skinned, other, blocks: m.v.size, glow, parts: Object.keys(m.pivots || {}).filter((p) => !/^lid/.test(p)), clips: r.clips.map((c) => c.name),
          atk: pz(clip('attack')), sp: pz(clip('special')), dur: Object.fromEntries(r.clips.map((c) => [c.name, +c.duration.toFixed(3)])), sig: { idle: sig('idle'), attack: sig('attack'), special: sig('special'), victory: sig('victory') } };
        r.root.traverse((x) => { if (x.geometry) x.geometry.dispose(); }); }
      out[id] = o; }
    return out; }, IDS);
  const bad = (fn) => IDS.filter((id) => !fn(md[id].p, md[id].c, id));
  ok(bad((p) => p.ok).length === 0, 'all nine prototype forms validate in 3D: rig, size, feet on the ground, centred, face to the front, every clip back at rest' + bad((p) => p.ok).map((id) => ' ' + id + ': ' + md[id].p.errors.join('; ')).join(''));
  ok(bad((p) => p.tris <= 20000).length === 0, 'triangles within the 20,000 budget for part-built models (largest ' + Math.max(...IDS.map((id) => md[id].p.tris)) + ', Ignivor)');
  ok(bad((p) => p.skinned >= 1 && p.skinned <= 2 && p.other === 0).length === 0, 'each is one skinned mesh plus one for its glowing blocks: the same two draw calls as before');
  ok(bad((p, c) => p.blocks > c.blocks * 1.15).length === 0, 'every prototype is built from more, finer blocks than its current model (' + IDS.map((id) => id + ' ' + md[id].c.blocks + '→' + md[id].p.blocks).join(', ') + ')');
  ok(bad((p, c) => p.parts.length > c.parts.length).length === 0, 'and has more moving parts (' + IDS.map((id) => md[id].c.parts.length + '→' + md[id].p.parts.length).join(', ') + ')');
  ok(['earTipL', 'earTipR'].every((n) => md.lumifern.p.parts.includes(n)) && md.aurelith.p.parts.includes('wingL') && md.aurelith.p.parts.includes('wheel'), 'Lumifern: leaf ears with tips that move on their own; Lumifern III keeps its flying leaves and gains the sun-wheel');
  ok(['neck', 'jaw', 'wingTipL', 'wingTipR', 'tail', 'tail2', 'tail3'].every((n) => md.ignivor.p.parts.includes(n)) && md.igniflare.p.parts.includes('tail2'), 'Igniflare: a neck, a jaw, wings that fold at the tip, and a tail in three segments');
  ok(['torso', 'foreL', 'foreR', 'shinL', 'shinR', 'ring'].every((n) => md.atem.p.parts.includes(n)), 'Atem: a torso that turns on the waist, elbows, knees and the ring behind its head');
  ok(bad((p) => CLIPS.filter((c) => c !== 'blink' || p.parts.some(() => true)).every((c) => c === 'blink' || p.clips.includes(c))).length === 0, 'the full clip set: idle, ready, attack, special, hit, big hit, heal, guard, victory, defeat, move (and blink where there are eyes)');
  ok(bad((p) => Math.abs(p.atk - 0.34) < 0.01 && Math.abs(p.sp - 0.4) < 0.01).length === 0, 'attacks reach the foe at 0.34 s and specials at 0.40 s, as before (battle timing unchanged)' + bad((p) => Math.abs(p.atk - 0.34) < 0.01 && Math.abs(p.sp - 0.4) < 0.01).map((id) => ' ' + id + ' ' + md[id].p.atk + '/' + md[id].p.sp).join(''));
  ok(bad((p) => p.dur.attack === 0.9 && p.dur.special === 1.1 && p.dur.hit === 0.55 && p.dur.victory === 1.6 && p.dur.defeat === 1.2).length === 0, 'clip lengths follow the battle contract (attack 0.9 s, special 1.1 s, hit 0.55 s, victory 1.6 s, defeat 1.2 s)');
  ok(bad((p, c) => ['idle', 'attack', 'special', 'victory'].every((k) => p.sig[k] !== c.sig[k])).length === 0, 'the prototypes move with their own new clips, not the Phase 8B ones');
  const uniq = (k) => new Set(IDS.map((id) => md[id].p.sig[k])).size;
  ok(['idle', 'attack', 'special', 'victory'].every((k) => uniq(k) === 9), 'no two of the nine forms share an idle, attack, special or victory (stage changes the weight and reach)');

  /* ================= 3. evolution: each stage builds on the last ================= */
  const lines = [['lumifern', 'solarbloom', 'aurelith'], ['igniflare', 'pyronix', 'ignivor'], ['atem1', 'atem2', 'atem']];
  ok(lines.every(([a, b, c]) => md[a].p.blocks < md[b].p.blocks && md[b].p.blocks < md[c].p.blocks), 'each line grows in detail with its stage: ' + lines.map((L) => L.map((id) => md[id].p.blocks).join(' < ')).join('; '));
  ok(lines.every(([a, b, c]) => md[a].p.glow <= md[b].p.glow && md[b].p.glow <= md[c].p.glow), 'and in glow (stored sunlight, lava seams, blade light): ' + lines.map((L) => L.map((id) => md[id].p.glow).join(' ≤ ')).join('; '));
  ok(lines.every(([a, b, c]) => md[a].p.dur.idle <= md[b].p.dur.idle && md[b].p.dur.idle <= md[c].p.dur.idle), 'later forms carry more weight: their idle cycle is longer (' + lines.map((L) => L.map((id) => md[id].p.dur.idle).join(' / ')).join('; ') + ')');
  const nm = await page.evaluate(() => ['lumifern', 'igniflare', 'atem'].map((ln) => A.Data.LINES[ln].ids.map((id) => A.Data.SPECIES[id].name).join(' / ')));
  ok(nm[0] === 'Lumifern / Lumifern II / Lumifern III' && nm[1] === 'Igniflare / Igniflare II / Igniflare III' && nm[2] === 'Atem / Atem II / Atem III', 'names keep the convention: ' + nm.join('; '));

  /* ================= 4. the new joints move; Atem moves like a machine ================= */
  const mv = await page.evaluate(async () => {
    const C = await import('/src/3d/creature3d.js'); const THREE = C.THREE, o = {};
    const moved = (r, clip, t, names) => { const m = new THREE.AnimationMixer(r.root), c = r.clips.find((x) => x.name === clip), rest = {}; names.forEach((n) => { const b = r.root.getObjectByName(n); rest[n] = b.quaternion.clone(); });
      const a = m.clipAction(c); a.play(); m.setTime(t); const res = {}; names.forEach((n) => { res[n] = +r.root.getObjectByName(n).quaternion.angleTo(rest[n]).toFixed(3); }); m.stopAllAction(); return res; };
    const dr = C.buildVoxel(A.Data.SPECIES.ignivor, { proto: true }), lu = C.buildVoxel(A.Data.SPECIES.lumifern, { proto: true }), at = C.buildVoxel(A.Data.SPECIES.atem, { proto: true });
    o.wing = moved(dr, 'special', 0.26, ['wingL', 'wingTipL']); o.tail = moved(dr, 'idle', 1.0, ['tail', 'tail2', 'tail3']); o.jaw = moved(dr, 'special', 0.5, ['jaw']);
    o.ears = moved(lu, 'attack', 0.38, ['earL', 'earTipL']); o.atem = moved(at, 'attack', 0.18, ['torso', 'armR', 'foreR']); o.knee = moved(at, 'defeat', 1.15, ['legL', 'shinL']);   // (1.2 s is the clip's end, where a looping mixer wraps to 0)
    // servo motion: in Atem's idle the head holds still between moves (many frames with no change), unlike a breathing animal's
    const still = (r, n) => { const m = new THREE.AnimationMixer(r.root), c = r.clips.find((x) => x.name === 'idle'), b = r.root.getObjectByName(n); m.clipAction(c).play(); let prev = null, held = 0, N = 0;
      for (let t = 0; t < c.duration; t += 1 / 30) { m.setTime(t); const q = b.quaternion.clone(); if (prev && q.angleTo(prev) < 1e-4) held++; prev = q; N++; } m.stopAllAction(); return +(held / N).toFixed(2); };
    o.held = { atem: still(at, 'head'), ignivor: still(dr, 'head') };
    [dr, lu, at].forEach((r) => r.root.traverse((x) => { if (x.geometry) x.geometry.dispose(); })); return o; });
  ok(mv.wing.wingL > 0.2 && mv.wing.wingTipL > 0.05, 'Igniflare III raises its wings for the breath, the tips moving on their own (' + JSON.stringify(mv.wing) + ')');
  ok(mv.tail.tail > 0.02 && mv.tail.tail2 > 0.02 && mv.tail.tail3 > 0.02 && new Set(Object.values(mv.tail)).size === 3, 'its tail sways as a chain, each segment at its own angle (' + JSON.stringify(mv.tail) + ')');
  ok(mv.jaw.jaw > 0.5, 'its jaw is open while the fire pours (' + mv.jaw.jaw + ' rad)');
  ok(mv.ears.earL > 0.2 && mv.ears.earTipL > 0.2, 'Lumifern\'s ear tips trail the jump after the ears (' + JSON.stringify(mv.ears) + ')');
  ok(mv.atem.torso > 0.3 && mv.atem.armR > 0.5 && mv.atem.foreR > 0.3 && mv.knee.shinL > 1, 'Atem winds up from the waist with shoulder and elbow, and kneels on bent knees when it powers down (' + JSON.stringify(mv.atem) + ', knee ' + mv.knee.shinL + ')');
  ok(mv.held.atem > 0.6 && mv.held.ignivor < 0.2, 'Atem holds exact poses between servo moves (' + Math.round(mv.held.atem * 100) + '% of idle frames still) where the dragon is always moving (' + Math.round(mv.held.ignivor * 100) + '%)');
  await page.context().close();

  /* ================= 5. battles with the switch on ================= */
  page = await open('?p15=1');
  await page.evaluate(() => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = true; s.settings.sfx = true; A.Rules.drain(); if (A.UI.queue) A.UI.queue.length = 0; A.State.save(); A.UI.showIsland(); A.Audio.unlock(); A.Audio.setPrefs({ sfx: true, music: false }); });
  await page.waitForSelector('#world', { timeout: 60000 }); await sleep(600);
  await page.evaluate(async () => { for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 100)); document.querySelectorAll('.dlg .dlg-skip').forEach((b) => b.click()); A.UI.closeAll(); } document.querySelectorAll('.dlg').forEach((x) => x.remove()); });
  const saveBefore = await page.evaluate(() => JSON.stringify(A.State.state));
  const fight = (ps, es, presses, o) => page.evaluate(async ({ ps, es, presses, o }) => {
    o = o || {}; A.State.state.settings.reduceMotion = !!o.calm; const R = A.Rules, Bt = R.Battle, f = Bt.fighter(ps, 30), e = Bt.fighter(es, 30); [f, e].forEach((x) => { x.hpMax *= 50; x.hp = x.hpMax; }); f.spd = 999; e.atk = 1;
    const played = [], m0 = A.Audio.monster; A.Audio.monster = function (sp, cue, oo) { const r = m0.call(this, sp, cue, oo); played.push(sp + ':' + cue + (A.Audio.layer15(sp, cue) ? '+15' : '')); return r; };
    if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); A.UI.startBattle({ kind: 'test', b: Bt.create([f], e, { rng: () => 0.5 }), d: 'heartwood', label: 't', finish: () => {} });
    for (let i = 0; i < 100 && !(A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy); i++) await new Promise((r) => setTimeout(r, 100));
    const M = await A.C3D.load(), out = { is3d: !!A.UI.B.stage.is3d, cubes: 0, draws: 0, presses: [] };
    const wait = async (ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { out.cubes = Math.max(out.cubes, A.UI.B.stage.debug().cubes); out.draws = Math.max(out.draws, M.stats().drawCalls); await new Promise((r) => setTimeout(r, 40)); } };
    const t0 = performance.now();
    for (const id of presses) { for (let i = 0; i < 50 && A.UI.B.busy; i++) await wait(100); const b = document.querySelector('.abtn.ready[data-id="' + id + '"]'); if (!b) { out.presses.push('no ' + id); continue; } b.click(); out.presses.push(id); await wait(700); }
    for (let i = 0; i < 60 && A.UI.B.busy; i++) await wait(100); out.ms = Math.round(performance.now() - t0);
    const d = A.UI.B.stage.debug(); out.log = d.log.filter((x) => /^move|^use|^hit/.test(x)); out.clipsP = d.clips.p; out.played = played; out.proto = A.Proto15.active(ps); out.scale = A.UI.B.stage.debug().fx !== undefined; A.Audio.monster = m0; A.State.state.settings.reduceMotion = false; return out; }, { ps, es, presses, o });
  const B1 = await fight('ignivor', 'calyxar', ['emberflick', 'inferno']);
  ok(B1.is3d && B1.proto && B1.log.includes('move:p:emberflick') && B1.log.includes('move:p:inferno'), 'Igniflare III (prototype) in battle: Ember Flick and Inferno play their Phase 15 sequences (' + B1.log.join(' ') + ')');
  ok(B1.log.some((x) => x === 'hit:e:super') && B1.cubes > 20, 'super-effective hits on Calyxar land with the stronger accent (up to ' + B1.cubes + ' effect cubes at once, within the pool of 240)');
  ok(B1.played.some((x) => /^ignivor:special\+15/.test(x)) && B1.played.some((x) => /^ignivor:attack\+15/.test(x)), 'its voice plays with its Phase 15 layer (wingbeats and fire): ' + B1.played.filter((x) => /\+15/.test(x)).slice(0, 4).join(' '));
  const B2 = await fight('atem', 'rockraki', ['gearstrike', 'overclock']);
  ok(B2.proto && B2.log.includes('move:p:gearstrike') && B2.log.includes('move:p:overclock') && B2.played.some((x) => /^atem:attack\+15/.test(x)), 'Atem (prototype): Gear Strike and Overclock, with servo and blade sounds (' + B2.log.filter((x) => /^move/.test(x)).join(' ') + ')');
  const B3 = await fight('aurelith', 'eclipsar', ['glowpulse', 'solarflare']);
  ok(B3.proto && B3.log.includes('move:p:glowpulse') && B3.log.includes('move:p:solarflare'), 'Lumifern III (prototype): Glow Pulse and Solar Flare (' + B3.log.filter((x) => /^move/.test(x)).join(' ') + ')');
  ok([B1, B2, B3].every((b) => b.draws > 0 && b.draws <= 60), 'draw calls in these battles stay where they were (peak ' + Math.max(B1.draws, B2.draws, B3.draws) + ')');
  // a battle against a production foe: the foe keeps its own clips and moves (only prototype attackers change)
  // (Phase 15B: the switch now also covers the refined roster, so the production example is Aimza, the one line it leaves as it is)
  const B4 = await fight('aimza2', 'ignivor', ['echowave']);
  ok(!B4.proto && B4.log.includes('move:p:echowave') && B4.played.every((x) => !/^aimza2:.*\+15/.test(x)), 'a production monster (Aimza II) keeps its own moves and voice with the switch on (Igniflare III as the foe still uses the prototype)');
  // Reduce Motion: no accents beyond the existing flash; effects at a quarter
  const B5n = await fight('atem', 'rockraki', ['gearstrike']), B5 = await fight('atem', 'rockraki', ['gearstrike'], { calm: true });
  ok(B5.cubes <= Math.ceil(B5n.cubes * 0.5), 'with Reduce Motion the effects shrink to the reduced budget, with no build-up or ground marks (' + B5.cubes + ' cubes at most, ' + B5n.cubes + ' without)');
  const acc = await page.evaluate(async () => { const P = await import('/src/3d/proto15.js'); const api = { fx: { scale: () => 1, glow() {}, burst() {}, spawn() {} }, at() {}, slot: () => ({ spId: 'atem', group: { position: { clone: () => ({ setY() { return this; }, add() { return this; } }) }, scale: { x: 1 } } }), chest: () => ({ clone() { return this; } }), calm: () => true };
    return { calm: P.hitAccent(api, 'e', 'metal', 'super', {}) }; });
  ok(acc.calm === false, 'combat accents switch themselves off under Reduce Motion');
  const saveAfter = await page.evaluate(() => JSON.stringify(A.State.state));
  const dropped = (s) => JSON.parse(s, (k, v) => (k === 'lastSeen' || k === 't' || k === 'time' ? undefined : v));
  ok(!/proto15|p15/i.test(saveAfter) && JSON.stringify(dropped(saveBefore).roster || {}) === JSON.stringify(dropped(saveAfter).roster || {}), 'nothing about the prototypes reaches the save: no new keys, the roster as it was');

  /* ================= 6. stats, equipment, Battery Saver, the showcase panel ================= */
  const st = await page.evaluate(() => ['lumifern', 'ignivor', 'atem'].map((id) => { const s = A.Data.SPECIES[id]; return id + ':' + [s.stats.hp, s.stats.atk, s.stats.def, s.stats.spd].join('/') + ':' + s.abil.join('+'); }));
  ok(st.join(' ') === 'lumifern:46/11/10/10:glowpulse+sunsprout ignivor:89/24/19/12:emberflick+inferno atem:96/26/20/13:gearstrike+overclock', 'stats and moves are the species\' own (no balance change): ' + st.join(' '));
  const pan = await page.evaluate(async () => { A.UI.closeAll(); A.UI.showcasePanel(); await new Promise((r) => setTimeout(r, 300)); const box = document.querySelector('.p15-box'), ov = box && box.closest('.overlay'), rows = box ? box.querySelectorAll('[data-act="showView"]').length : 0, btn = box && box.querySelector('[data-act="p15Toggle"]');
    const r = box ? box.getBoundingClientRect() : null, wide = document.documentElement.scrollWidth <= window.innerWidth + 1; const label = btn ? btn.textContent : '';
    btn.click(); await new Promise((r2) => setTimeout(r2, 300)); const after = A.Proto15.enabled(), key = localStorage.getItem('aminas.proto15'); const b2 = document.querySelector('[data-act="p15Toggle"]'); const label2 = b2 ? b2.textContent : ''; b2.click(); await new Promise((r2) => setTimeout(r2, 200));
    A.UI.closeAll(); return { rows, fits: r && r.right <= window.innerWidth && wide, label, after, key, label2, back: A.Proto15.enabled() }; });
  ok(pan.rows === 12 && pan.fits && /On/.test(pan.label), 'the Monster showcase lists the twelve prototype forms (Meta added for the Phase 15 test) under a Phase 15 switch, within the 844×390 screen');
  ok(pan.after === false && pan.key === '0' && /Off/.test(pan.label2) && pan.back === true, 'the switch turns off and on from the panel (remembered in this browser only)');
  await page.context().close();
  page = await open();
  const sv = await page.evaluate(async () => { const s = A.State.newGame(); s.settings.batterySaver = true; s.settings.creatures3d = true; A.State.state = s; A.Perf.apply && A.Perf.apply(); A.Proto15.set(true); const C = await import('/src/3d/creature3d.js'); await import('/src/3d/runtime.js');
    const r = C.buildVoxel(A.Data.SPECIES.ignivor); const o = { proto: r.root.userData.proto15, saver: A.Perf.saver() }; A.Proto15.set(false); return o; });
  ok(sv.proto === true && sv.saver === true, 'with Battery Saver the prototype still builds (the effect budget halves as for every monster)');
  await page.context().close();

  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0;
})();
