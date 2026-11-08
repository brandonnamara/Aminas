// Phase 8B real-browser test (Chromium + Playwright, SwiftShader software WebGL; NOT a phone).
// The rest of the roster (58 forms in 20 lines) gets the Phase 8 treatment: each is rigged in parts from exactly the
// blocks it had in Phase 8 (2D portraits unchanged), built in 3D as one skinned mesh, with its own idle, quirk,
// attack, special, reactions, victory and defeat (stage-aware: Monster / Monster II / Monster III), choreography for
// every roster move, and its own voice. The three showcase monsters are covered by browser-showcase8.test.js.
// Run: node tests/browser-roster8b.test.js
const { chromium } = require('playwright'); const serve = require('./server');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TRIO = ['umbrit', 'cannonis', 'aimza', 'aimza2', 'aimza3'];
// Phase 8 block hashes (position, colour and glow of every block, as drawn in 2D) of every roster form, taken from the
// approved Phase 8 build (5e48592). Phase 8B must not change a single block.
const PHASE8 = { lumifern: 'e099b520/480', solarbloom: 'a86d7785/1227', aurelith: '72dae93b/2404', duskmantle: '87935860/2358', eclipsar: 'df21f60d/4160', reefback: '2d1dc513/6628', shellfin: 'c175aa50/11331', kairyu: '55d33337/1681', tidalong: '3821b234/2939', oceanfang: '259b91f4/4934', aquaflora: 'cccfcb0c/902', aquaflora2: '6024e828/1355', aquaflora3: 'd1f3b812/2974', gaiaroki: '834e614b/1693', terraki: '24fd8064/2991', rockraki: 'bdb0b768/5165', pyrocell: '40d6358d/723', pyroforge: '11fe542f/1219', pyrocore: 'e05e0f21/2327', acinus: '8687ff3f/1905', berrant: '75454a5e/3661', calyxar: '7c60004e/6366', sylvaneer: 'b7aec06b/1247', sylvaneer2: '42c5c687/2019', sylvaneer3: 'e015b0bf/3105', terraflora: 'f69885f8/889', terraflora2: '70b38142/867', terraflora3: '3979186c/2043', emberix: '8d983fb7/1244', flaremon: '333b5801/2205', infernox: '49b0d397/3609', pyrokai: '411cdf4c/1669', emberkai: '62a374cb/2902', infernokai: '14eb292/4844', igniflare: 'c01df6c5/710', pyronix: '2b011b6c/1956', ignivor: '8501d809/3641', pyrospark: 'a69b6c14/358', pyrohawk: 'e7049e7a/774', pyrophoenix: '9e55a28c/1589', zephyr: '9573f9b6/826', aeolus: '53157e95/1857', stormbringer: 'ca70bd7d/3337', voltar: 'bed26591/526', voltar2: 'cc764c03/1001', voltar3: '3311514e/2025', zeep: 'c0750742/802', zeep2: '7f038d8a/2180', zeep3: 'db68b437/4692', lumi: 'b54816a6/685', lumi2: '920feb7a/1471', lumi3: '66f917ff/2866', meta1: '25e42829/411', meta2: 'f30f0a46/670', meta: '8f655d17/1073', atem1: 'cab9f37a/766', atem2: '930bcf97/1143', atem: '8d601835/1871' };
const IDS = Object.keys(PHASE8);
const CLIPS = ['idle', 'blink', 'ready', 'attack', 'special', 'hit', 'hitBig', 'heal', 'guard', 'victory', 'defeat', 'move'];

(async () => {
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(600000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js|GL Driver/i.test(m.text())) errors.push(m.text()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D && A.Showcase && A.Audio);

  /* ================= 1. models: same blocks, rigged in parts, one skinned mesh, the full clip set ================= */
  const md = await page.evaluate(async ({ IDS, TRIO }) => {
    const C = await import('/src/3d/creature3d.js'); const SC = await import('/src/3d/showcase.js'); const RO = await import('/src/3d/roster.js');
    const h = (str) => { let a = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { a ^= str.charCodeAt(i); a = Math.imul(a, 16777619) >>> 0; } return a.toString(16); };
    const out = { forms: {}, roster: Object.keys(A.Data.SPECIES).filter((id) => TRIO.indexOf(id) < 0), rosterIds: RO.ROSTER_IDS.slice(), lines: {} };
    for (const id of IDS) {
      const sp = A.Data.SPECIES[id], m = A.Voxel.model(sp.art.vox, sp.art.st), rows = [];
      m.v.forEach((v, k) => rows.push(k + ':' + v.c + ':' + (v.g || 0))); rows.sort();
      const t0 = performance.now(), r = C.buildVoxel(sp), ms = performance.now() - t0, v = C.validate(r.root, r.clips), clip = (n) => r.clips.find((c) => c.name === n);
      const pz = (c) => { const t = c && c.tracks.find((x) => x.name === 'rig.position'); if (!t) return null; let b = -1e9, bt = 0; for (let i = 0; i < t.times.length; i++) if (t.values[i * 3 + 2] > b) { b = t.values[i * 3 + 2]; bt = t.times[i]; } return bt; };
      const sig = (n) => { const c = clip(n); return c ? h(c.tracks.map((t) => t.name + ':' + Array.from(t.values).map((x) => x.toFixed(2)).join(',')).join('|')) : ''; };
      let skinned = 0, bones = 0, other = 0; r.root.traverse((o) => { if (o.isSkinnedMesh) skinned++; else if (o.isMesh) other++; if (o.isBone) bones++; });
      out.forms[id] = { line: sp.line, stage: sp.stage, name: sp.name, hash: h(rows.join('|')) + '/' + rows.length, rig: !!(m.rig && m.rig.done), pivots: Object.keys(m.pivots || {}).length,
        ok: v.ok, errors: v.errors, tris: v.info.tris, meshes: v.info.meshes, skinned, other, bones, parts: r.root.userData.parts || [], clips: r.clips.map((c) => c.name),
        atk: pz(clip('attack')), sp: pz(clip('special')), dur: Object.fromEntries(r.clips.map((c) => [c.name, +c.duration.toFixed(3)])), ms: Math.round(ms),
        eyes: m.rig ? m.rig.eyes.length : 0, hidden: m.hid ? m.hid.size : 0, lidsIn2D: [...m.v.values()].some((x) => /^lid/.test(x.p || '')),
        blinkTracks: (clip('blink') || { tracks: [] }).tracks.map((t) => t.name), hook: !!C.CLIP_HOOKS[id], living: !!SC.LIVING[id], view: SC.VIEW_YAW[id],
        sig: { idle: sig('idle'), attack: sig('attack'), special: sig('special'), victory: sig('victory'), defeat: sig('defeat'), move: sig('move'), hit: sig('hit') } };
      r.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    Object.keys(RO.PERSONA).forEach((ln) => { const p = RO.PERSONA[ln]; out.lines[ln] = [p.atk, p.sp, p.vic, p.def, p.quirk]; });
    return out;
  }, { IDS, TRIO });
  const F = md.forms, bad = (fn) => IDS.filter((id) => !fn(F[id], id));
  ok(md.roster.length === 58 && IDS.every((id) => md.roster.includes(id)), 'the roster outside the three showcase monsters is 58 forms in 20 lines, all covered (' + md.roster.length + ')');
  ok(md.rosterIds.length === 58 && IDS.every((id) => md.rosterIds.includes(id)), 'every one of the 58 has the Phase 8B treatment registered (animation hook, viewer angle, living details)');
  ok(bad((f, id) => f.hash === PHASE8[id]).length === 0, 'every form keeps exactly the blocks it had in Phase 8 (silhouette, colours, glow): 2D portraits, cards and island critters are unchanged' + bad((f, id) => f.hash === PHASE8[id]).map((id) => ' ' + id + ' ' + F[id].hash).join(''));
  ok(bad((f) => f.rig && f.pivots >= 4).length === 0, 'every form is rigged in parts by its body plan (4 to ' + Math.max(...IDS.map((id) => F[id].pivots)) + ' moving parts and points each)' + bad((f) => f.rig && f.pivots >= 4).map((id) => ' ' + id + ' ' + F[id].pivots).join(''));
  ok(bad((f) => f.ok).length === 0, 'all 58 validate in 3D: rig, size, clip lengths, rest pose at the end of every clip, face to the front' + bad((f) => f.ok).map((id) => ' ' + id + ': ' + F[id].errors.join('; ')).join(''));
  ok(bad((f) => f.skinned >= 1 && f.skinned <= 2 && f.other === 0).length === 0, 'each is one skinned mesh (plus one for its glowing blocks): no extra draw calls for its parts' + bad((f) => f.skinned >= 1 && f.skinned <= 2 && f.other === 0).map((id) => ' ' + id + ' ' + F[id].skinned + '+' + F[id].other).join(''));
  ok(bad((f) => f.tris <= 20000).length === 0, 'triangles within the Phase 8 budget of 20,000 (largest ' + Math.max(...IDS.map((id) => F[id].tris)) + ')');
  ok(bad((f) => f.ms < 1500).length === 0, 'each builds quickly enough to open without a stall (slowest ' + Math.max(...IDS.map((id) => F[id].ms)) + ' ms here, software rendering)');
  ok(bad((f) => CLIPS.every((c) => f.clips.includes(c))).length === 0, 'each has the full bespoke clip set: idle, blink, ready, attack, special, hit, big hit, heal, guard, victory, defeat, move');
  ok(bad((f) => Math.abs(f.atk - 0.34) < 0.01 && Math.abs(f.sp - 0.4) < 0.01).length === 0, 'attacks reach the foe at 0.34 s and specials at 0.40 s, as before (battle timing unchanged)' + bad((f) => Math.abs(f.atk - 0.34) < 0.01 && Math.abs(f.sp - 0.4) < 0.01).map((id) => ' ' + id + ' ' + F[id].atk + '/' + F[id].sp).join(''));
  ok(bad((f) => f.dur.attack === 0.9 && f.dur.special === 1.1 && f.dur.victory === 1.6 && f.dur.defeat === 1.2 && f.dur.hit === 0.55).length === 0, 'clip lengths follow the battle contract (attack 0.9 s, special 1.1 s, hit 0.55 s, victory 1.6 s, defeat 1.2 s)');
  const blinkers = IDS.filter((id) => F[id].eyes > 0);
  ok(blinkers.length >= 50 && blinkers.every((id) => F[id].hidden > 0 && F[id].parts.some((p) => /^lid/.test(p)) && F[id].blinkTracks.length && F[id].blinkTracks.every((t) => /^lid.*\.scale$/.test(t))), 'eyelids are added in front of the eyes and blink (' + blinkers.length + ' of 58 forms have eyes); the blink only moves eyelids');
  ok(IDS.every((id) => !F[id].lidsIn2D), 'eyelids live in the hidden layer: never drawn in 2D');
  ok(bad((f) => f.hook && f.living && typeof f.view === 'number').length === 0, 'each has its viewer angle and living details (glow breathing, ground light or pool)');

  /* ================= 2. individuality and evolution stages ================= */
  const uniq = (k) => new Set(IDS.map((id) => F[id].sig[k])).size;
  const KINDS = ['idle', 'move', 'attack', 'special', 'hit', 'victory', 'defeat'];
  ok(KINDS.every((k) => uniq(k) === 58), 'no animation is copied: all 58 idles, gaits, attacks, specials, hit reactions, victories and defeats differ (' + KINDS.map((k) => k + ' ' + uniq(k)).join(', ') + ')');
  const L = md.lines, lns = Object.keys(L), tuple = new Set(lns.map((n) => L[n].join('/'))), quirks = new Set(lns.map((n) => L[n][4]));
  ok(lns.length === 20 && tuple.size === 20 && quirks.size === 20, 'each of the 20 lines has its own personality: its own idle quirk, and its own mix of attack, special, victory and defeat (' + lns.map((n) => n + ' ' + L[n].join('/')).slice(0, 4).join('; ') + '; …)');
  const styles = (i) => new Set(lns.map((n) => L[n][i])).size;
  ok(styles(0) >= 12 && styles(1) >= 15 && styles(2) >= 14 && styles(3) >= 10, 'a broad repertoire: ' + styles(0) + ' attack styles, ' + styles(1) + ' specials, ' + styles(2) + ' victories, ' + styles(3) + ' defeats across the lines');
  const byLine = {}; IDS.forEach((id) => { (byLine[F[id].line] = byLine[F[id].line] || [])[F[id].stage - 1] = id; });
  const full = Object.keys(byLine).filter((ln) => byLine[ln].filter(Boolean).length === 3);
  ok(full.length === 18 && full.every((ln) => { const [a, b, c] = byLine[ln].map((id) => F[id].dur.idle); return a < b && b < c; }), 'evolution: in every full line the later forms breathe and move with more weight (idle cycle I < II < III: ' + full.slice(0, 3).map((ln) => byLine[ln].map((id) => F[id].dur.idle.toFixed(1)).join('<')).join(', ') + ' …)');
  const nm = await page.evaluate(() => { const L = {}; Object.values(A.Data.SPECIES).forEach((s) => { (L[s.line] = L[s.line] || [])[s.stage - 1] = s.name; }); return L; });
  const conv = Object.keys(nm).filter((ln) => nm[ln].length === 3 && !(nm[ln][1] === nm[ln][0] + ' II' && nm[ln][2] === nm[ln][0] + ' III'));
  ok(Object.keys(nm).length === 21 && conv.length === 0, 'evolution names keep the convention Monster / Monster II / Monster III in all 21 lines: ' + nm.lumi.join(' / ') + ', ' + nm.pyrocell.join(' / ') + conv.map((ln) => ' broken: ' + nm[ln].join(' / ')).join(''));

  /* ================= 3. the parts really move ================= */
  const mv = await page.evaluate(async (IDS) => {
    const C = await import('/src/3d/creature3d.js'); const T = C.THREE, out = {};
    for (const id of IDS) {
      const r = C.buildVoxel(A.Data.SPECIES[id]), root = r.root, mx = new T.AnimationMixer(root), bones = [];
      root.traverse((o) => { if (o.isBone && o.name !== 'core' && !/^lid/.test(o.name) && !/^(mouth\d?|hand[LR]|chest|muzzle)$/.test(o.name)) bones.push(o); });
      const rest = bones.map((b) => [b.quaternion.clone(), b.position.clone(), b.scale.clone()]);
      const key = (b) => b.quaternion.toArray().concat(b.position.toArray(), b.scale.toArray()).map((v) => v.toFixed(3)).join(',');
      const rest0 = bones.map(key);
      const at = (c, t) => { mx.stopAllAction(); bones.forEach((b, i) => { b.quaternion.copy(rest[i][0]); b.position.copy(rest[i][1]); b.scale.copy(rest[i][2]); });
        const a = mx.clipAction(r.clips.find((x) => x.name === c)); a.reset().play(); mx.setTime(t); return bones.filter((b, i) => key(b) !== rest0[i]).length; };
      out[id] = { n: bones.length, idle: at('idle', 1.3), attack: at('attack', 0.3), special: at('special', 0.36), victory: at('victory', 0.5), defeat: at('defeat', 1.15), hit: at('hit', 0.18) };
      mx.stopAllAction(); root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    return out;
  }, IDS);
  const still = IDS.filter((id) => ['idle', 'attack', 'special', 'victory', 'defeat', 'hit'].some((c) => mv[id][c] < Math.min(2, mv[id].n)));
  const few = IDS.filter((id) => mv[id].n < 3);
  ok(still.length === 0 && few.length <= 2, 'in every form the parts themselves move in idle, attack, special, hit, victory and defeat, not only the whole body (two or more parts each, except the two smallest first forms with fewer limbs: ' + few.map((id) => id + ' ' + mv[id].n).join(', ') + ')' + still.map((id) => ' ' + id + ' ' + JSON.stringify(mv[id])).join(''));

  /* ================= 4. choreography: every roster move has its own sequence ================= */
  const ch = await page.evaluate(async (IDS) => {
    const SC = await import('/src/3d/showcase.js'); await import('/src/3d/roster.js'); const D = A.Data, out = { missing: [], moves: new Set(), el: {} };
    IDS.forEach((id) => D.SPECIES[id].abil.forEach((ab) => { const st = SC.MOVES[ab]; if (!st || typeof SC.STYLE[st] !== 'function') out.missing.push(id + ':' + ab); else { out.moves.add(ab); out.el[ab] = D.ABILITIES[ab].el; } }));
    return { missing: out.missing, moves: [...out.moves], el: out.el };
  }, IDS);
  ok(ch.missing.length === 0 && ch.moves.length >= 30, 'every move a roster monster knows has a choreographed sequence (' + ch.moves.length + ' moves: ' + ch.moves.slice(0, 8).join(', ') + ' …)' + ch.missing.map((x) => ' missing ' + x).join(''));

  /* ================= 5. battles through the real battle screen: moves, effects and voices ================= */
  await page.evaluate(() => { A.Perf.reportSlow = () => {}; const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = true; s.settings.sfx = true; s.res.food = 5000;
    ['tidalong', 'zeep3', 'emberix'].forEach((id, i) => A.Rules.addAmina(s, id, 12 + i)); A.Rules.drain(); if (A.UI.queue) A.UI.queue.length = 0; A.State.save(); A.UI.showIsland(); A.Audio.unlock(); A.Audio.setPrefs({ sfx: true, music: false }); });
  await page.waitForSelector('#world', { timeout: 60000 }); await sleep(800);
  await page.evaluate(async () => { for (let i = 0; i < 25; i++) { await new Promise((r) => setTimeout(r, 120)); document.querySelectorAll('.dlg .dlg-skip').forEach((b) => b.click()); A.UI.closeAll(); } document.querySelectorAll('.dlg').forEach((x) => x.remove()); });
  const fight = (ps, es, presses) => page.evaluate(async ({ ps, es, presses }) => {
    const R = A.Rules, Bt = R.Battle, f = Bt.fighter(ps, 30), e = Bt.fighter(es, 30); [f, e].forEach((x) => { x.hpMax *= 50; x.hp = x.hpMax; }); f.spd = 999; e.atk = 1;
    const played = []; const m0 = A.Audio.monster; A.Audio.monster = function (sp, cue, o) { const r = m0.call(this, sp, cue, o); played.push(sp + ':' + cue + (r ? '' : '-skipped')); return r; };
    if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); A.UI.startBattle({ kind: 'test', b: Bt.create([f], e, { rng: () => 0.5 }), d: 'heartwood', label: 't', finish: () => {} });   // fixed rolls: no stun or miss to skip a pressed move
    for (let i = 0; i < 100 && !(A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy); i++) await new Promise((r) => setTimeout(r, 100));
    const M = await A.C3D.load(); const out = { is3d: !!A.UI.B.stage.is3d, maxDraws: 0, presses: [] };
    const wait = async (ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { out.maxDraws = Math.max(out.maxDraws, M.stats().drawCalls); await new Promise((r) => setTimeout(r, 120)); } };
    for (const id of presses) { const sel = '.abtn.ready[data-id="' + id + '"]'; for (let i = 0; i < 50 && A.UI.B.busy; i++) await wait(100); const b = document.querySelector(sel); if (!b) { out.presses.push('no ' + id); continue; } b.click(); out.presses.push(id); await wait(600); }
    for (let i = 0; i < 50 && A.UI.B.busy; i++) await wait(100); await wait(900);
    const d = A.UI.B.stage.debug(); out.log = d.log.filter((x) => /^move|^use/.test(x)); out.played = played; A.Audio.monster = m0; return out; }, { ps, es, presses });
  const B1 = await fight('flaremon', 'tidalong', ['emberflick', 'blazerush']);
  ok(B1.is3d && B1.log.includes('move:p:emberflick') && B1.log.includes('move:p:blazerush'), 'Emberix II (quadruped): Ember Flick and Blaze Rush play their own sequences in 3D (' + B1.log.join(' ') + ')');
  ok(B1.played.includes('flaremon:attack') && B1.played.includes('flaremon:special') && B1.played.some((x) => /^tidalong:(hurt|impact)/.test(x) || /^flaremon:impact/.test(x)), 'its own voice plays: attack, special, and the hits land with sound (' + B1.played.slice(0, 8).join(' ') + ')');
  ok(B1.log.some((x) => /^move:e:/.test(x)), 'Kairyu II as the foe answers with its own choreographed moves (' + B1.log.filter((x) => /:e:/.test(x)).join(' ') + ')');
  const B2 = await fight('rockraki', 'pyronix', ['pebbletoss', 'mountainfall']);
  ok(B2.log.includes('move:p:pebbletoss') && B2.log.includes('move:p:mountainfall') && B2.played.includes('rockraki:special'), 'Gaiaroki III (primate): Pebble Toss from its fist, Mountainfall with its own roar');
  const B3 = await fight('zeep3', 'lumi3', ['gearstrike', 'overclock']);
  ok(B3.log.includes('move:p:gearstrike') && B3.log.includes('move:p:overclock') && B3.played.includes('zeep3:attack'), 'Zeep III (construct): Gear Strike and Overclock, with its beeping voice' + (B3.log.includes('move:p:overclock') && B3.played.includes('zeep3:attack') ? '' : ' (' + B3.presses.join(' ') + ' | ' + B3.log.join(' ') + ' | ' + B3.played.join(' ') + ')'));
  const B4 = await fight('acinus', 'voltar2', ['vinewhip', 'leafguard']);
  ok(B4.log.includes('move:p:vinewhip') && B4.log.includes('use:p:guard') && B4.played.includes('acinus:guard'), 'Acinus: Vine Whip, and Leaf Guard plays its guard with a leaf shield and a guard sound');
  ok(B4.log.some((x) => /^move:e:(shadenip|duskrend)/.test(x)), 'Voltar II as the foe uses Shade Nip / Dusk Rend in its own palette (' + B4.log.filter((x) => /:e:/.test(x)).join(' ') + ')');
  const draws = Math.max(B1.maxDraws, B2.maxDraws, B3.maxDraws, B4.maxDraws);
  ok(draws <= 85, 'draw calls in these battles stay within the Phase 8 limit (85): ' + [B1, B2, B3, B4].map((b) => b.maxDraws).join(', '));

  /* ================= 6. the arena runs every form's moves (and the foe side), within the effects budget ================= */
  const cov = await page.evaluate(async (IDS) => {
    const st = A.UI.B.stage, D = A.Data, out = { done: [], missing: [], maxCubes: 0, maxShots: 0, foe: [], calmCubes: 0, calm: [] };
    const watch = async (ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { const d = st.debug(); out.maxCubes = Math.max(out.maxCubes, d.cubes); out.maxShots = Math.max(out.maxShots, d.shots); await new Promise((r) => setTimeout(r, 90)); } };
    const run = async (who, id, list) => {
      for (const ab of D.SPECIES[id].abil) { const a = D.ABILITIES[ab], cast = a.type === 'guard' || a.type === 'heal';
        const p = st.use(who, cast ? 'cast' : 'attack', { el: a.el, type: a.type, special: a.cd > 0, power: a.power || 0, abil: ab }); const lg = st.debug().log, last = lg[lg.length - 1];
        const good = cast ? last === 'use:' + who + ':' + a.type : last === 'move:' + who + ':' + ab; (good ? list : out.missing).push(id + ':' + ab + (good ? '' : ' (' + last + ')'));
        const tgt = who === 'p' ? 'e' : 'p'; if (!cast) setTimeout(() => st.hit(tgt, a.el, null, {}), 480);
        await Promise.race([p, new Promise((r) => setTimeout(r, 1600))]); await watch(250); }
    };
    for (const id of IDS) { await st.swap('p', id); await watch(150); await run('p', id, out.done); }
    // the foe side (mirrored): each line's third form
    for (const id of IDS.filter((x) => D.SPECIES[x].stage === 3)) { await st.swap('e', id); await watch(150); await run('e', id, out.foe); }
    // Reduce motion: the same moves with a quarter of the effects
    A.State.state.settings.reduceMotion = true; const c0 = out.maxCubes; out.maxCubes = 0;
    for (const id of ['infernox', 'aurelith', 'stormbringer', 'calyxar']) { await st.swap('p', id); await run('p', id, out.calm); }
    out.calmCubes = out.maxCubes; out.maxCubes = c0; A.State.state.settings.reduceMotion = false;
    return out;
  }, IDS);
  ok(cov.missing.length === 0 && cov.done.length === 116, 'in the battle arena all 58 forms play both of their moves with their own sequence (' + cov.done.length + ' of 116)' + cov.missing.slice(0, 6).map((x) => ' missing ' + x).join(''));
  ok(cov.foe.length === 40, 'as the foe (mirrored) each line\'s third form plays its moves too (' + cov.foe.length + ' of 40)');
  ok(cov.maxCubes <= 240, 'effects stay within the Phase 7 particle budget (at most ' + cov.maxCubes + ' of 240 cubes alive, ' + cov.maxShots + ' projectiles)');
  ok(cov.calm.length === 8 && cov.calmCubes <= 60, 'with Reduce motion the same moves play with a quarter of the effects (at most ' + cov.calmCubes + ' cubes)');

  /* ================= 7. details screen: live 3D, Special with sound, feeding keeps the screen ================= */
  const dt = await page.evaluate(async () => {
    if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); A.UI.showIsland(); await new Promise((r) => setTimeout(r, 400));
    const s = A.State.state, inst = s.aminas.find((a) => a.sp === 'tidalong'); s.res.food = 5000; A.UI.closeAll(); A.UI.detail(inst.sp, { uid: inst.uid });
    let ov = null; for (let i = 0; i < 80; i++) { ov = [...document.querySelectorAll('#modal-root .overlay')].find((x) => x._detail); if (ov && ov.querySelector('.viewer3d.live canvas')) break; await new Promise((r) => setTimeout(r, 150)); }
    const live = !!(ov && ov.querySelector('.viewer3d.live canvas'));
    const played = []; const m0 = A.Audio.monster; A.Audio.monster = function (sp, cue, o) { played.push(sp + ':' + cue); return m0.call(this, sp, cue, o); };
    const clips = [...ov.querySelectorAll('[data-act="vPlay"]')].map((b) => b.dataset.clip);
    for (const c of clips) { ov.querySelector('[data-act="vPlay"][data-clip="' + c + '"]').click(); await new Promise((r) => setTimeout(r, 700)); }
    const keep = { ov, canvas: ov.querySelector('.viewer3d canvas'), h2: ov.querySelector('h2'), row: ov.querySelector('.inst') }, steps = [];
    for (let k = 0; k < 3; k++) { const lv0 = inst.lv, xp0 = inst.xp; ov.querySelector('[data-act="detailFeed"][data-kind="snack"]').click(); await new Promise((r) => setTimeout(r, 450));
      const ov2 = [...document.querySelectorAll('#modal-root .overlay')].find((x) => x._detail);
      steps.push(ov2 === keep.ov && ov2.querySelector('.viewer3d canvas') === keep.canvas && ov2.querySelector('h2') === keep.h2 && ov2.querySelector('.inst') === keep.row && (inst.lv > lv0 || inst.xp !== xp0)); }
    A.Audio.monster = m0; A.UI.closeAll();
    return { live, clips, played, steps };
  });
  ok(dt.live && dt.clips.includes('special'), 'Kairyu II\'s details screen shows it live in 3D with Move, Attack, Hit, Victory and Special (' + dt.clips.join(', ') + ')');
  ok(['move', 'attack', 'hurt', 'victory', 'special'].every((c) => dt.played.includes('tidalong:' + c)), 'each clip button plays the matching animation with its own sound (' + dt.played.join(' ') + ')');
  ok(dt.steps.length === 3 && dt.steps.every(Boolean), 'feeding a roster monster keeps the same screen (no reset): same sheet, 3D viewer, title and row, level updated');

  /* ================= 7b. evolution: unchanged rules; the ceremony shows the new form's own victory and voice ================= */
  const ev = await page.evaluate(async () => {
    const s = A.State.state, R = A.Rules; A.UI.closeAll(); s.res.gold = 1e6; s.res.food = 1e5; s.res.gems = 5000;
    const inst = s.aminas.find((a) => a.sp === 'emberix'), evo = A.Data.SPECIES.emberix.evo; inst.lv = Math.max(inst.lv, evo.lv);
    const r = R.evolve(s, inst.uid); R.drain(); if (A.UI.queue) A.UI.queue.length = 0; document.querySelectorAll('.dlg').forEach((x) => x.remove());
    const played = []; const m0 = A.Audio.monster; A.Audio.monster = function (sp, cue, o) { played.push(sp + ':' + cue); return m0.call(this, sp, cue, o); };
    A.UI.evolveFx('emberix', r.to, () => {});
    const find = () => [...document.querySelectorAll('.overlay')].find((x) => x.querySelector('.evolve'));
    let live = false; for (let i = 0; i < 100; i++) { await new Promise((q) => setTimeout(q, 150)); const ov = find(); if (ov && ov.querySelector('.evo-to canvas')) { live = true; break; } }
    await new Promise((q) => setTimeout(q, 1200)); A.Audio.monster = m0;
    const ov = find(), name = ov && ov.querySelector('.evo-name') ? ov.querySelector('.evo-name').textContent : '';
    A.UI.closeAll();
    return { ok: !!r.ok, to: r.to, have: s.aminas.some((a) => a.sp === r.to), live, played, name };
  });
  ok(ev.ok && ev.to === 'flaremon' && ev.have && /Emberix II/.test(ev.name), 'evolution works as before: Emberix becomes Emberix II (same rules, same name convention): ' + ev.name);
  ok(ev.live && ev.played.includes('flaremon:idle'), 'the evolution ceremony reveals Emberix II live in 3D, playing its own victory with its own voice (' + ev.played.join(' ') + ')');

  /* ================= 8. floating parts drift, and stay still with Reduce motion ================= */
  const aura = await page.evaluate(async (IDS) => {
    const C = await import('/src/3d/creature3d.js'); const SC = await import('/src/3d/showcase.js'); const out = { forms: [], moving: 0, calmStill: 0 };
    for (const id of IDS) {
      const r = C.buildVoxel(A.Data.SPECIES[id]); let spin = null; r.root.traverse((o) => { if (o.isBone && (o.name === 'aura' || o.name === 'halo') && !spin) spin = o; }); if (!spin) continue;
      const mats = []; r.root.traverse((o) => { if (o.material) mats.push(o.material); }); const actor = { spId: id, root: r.root, mats, group: new C.THREE.Group() };
      let calm = false; const lv = SC.living(actor, () => calm); const y0 = spin.rotation.y; for (let i = 0; i < 30; i++) lv.update(1 / 30); const y1 = spin.rotation.y;
      calm = true; for (let i = 0; i < 30; i++) lv.update(1 / 30); const y2 = spin.rotation.y; lv.dispose();
      out.forms.push(id + ':' + spin.name); if (Math.abs(y1 - y0) > 0.05) out.moving++; if (y2 === y1) out.calmStill++;
    }
    return out;
  }, IDS);
  ok(aura.forms.length >= 6 && aura.moving === aura.forms.length, 'floating stones, crystals, cards, wisps and rings drift slowly around their creature (' + aura.forms.join(', ') + ')');
  ok(aura.calmStill === aura.forms.length, 'and they stay still with Reduce motion (no animation loop of their own)');

  /* ================= 9. voices ================= */
  const snd = await page.evaluate(async (IDS) => {
    const Au = A.Audio, out = { voiced: IDS.filter((id) => Au.hasVoice(id)).length, peaks: [], low: [], high: [], deeper: {} };
    for (const id of IDS) for (const cue of Au.CUES) { const r = await Au.renderCue(id, cue, 1.6); out.peaks.push(r.peak); if (r.peak < 0.01) out.low.push(id + ':' + cue); if (r.peak > 0.6) out.high.push(id + ':' + cue + ' ' + r.peak.toFixed(2)); }
    const zcr = (ab) => { const dv = new DataView(ab), n = (ab.byteLength - 44) / 2; let z = 0, prev = 0, act = 0; for (let i = 0; i < n; i++) { const v = dv.getInt16(44 + i * 2, true); if (Math.abs(v) > 300) { act++; if ((v > 0) !== (prev > 0)) z++; prev = v; } } return act ? z / act * 22050 : 0; };
    const lines = {}; IDS.forEach((id) => { const s = A.Data.SPECIES[id]; (lines[s.line] = lines[s.line] || {})[s.stage] = id; });
    for (const ln of Object.keys(lines)) { const l = lines[ln]; if (!l[1] || !l[3]) continue; const a = zcr((await Au.renderCue(l[1], 'hurt', 1.0)).wav), c = zcr((await Au.renderCue(l[3], 'hurt', 1.0)).wav); out.deeper[ln] = [Math.round(a), Math.round(c)]; }
    out.trio = []; for (const id of ['umbrit', 'cannonis', 'aimza3']) for (const cue of Au.CUES) out.trio.push((await Au.renderCue(id, cue, 1.6)).peak);
    Au.setPrefs({ sfx: false, music: false }); out.off = Au.monster('infernox', 'attack'); Au.setPrefs({ sfx: true, music: false }); out.on = Au.monster('infernox', 'victory'); out.repeat = Au.monster('infernox', 'victory');
    return out;
  }, IDS);
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  ok(snd.voiced === 58, 'every roster form has its own voice (' + snd.voiced + ' of 58)');
  ok(snd.peaks.length === 58 * 11 && snd.low.length === 0, 'all 11 cues of every voice make a sound (' + snd.peaks.length + ' rendered: tap, idle, move, attack, special, impact, hurt, heal, guard, victory, defeat)' + snd.low.slice(0, 5).map((x) => ' silent ' + x).join(''));
  ok(snd.high.length === 0 && Math.max(...snd.peaks) < 0.98, 'none of them clips or towers over the rest (loudest peak ' + Math.max(...snd.peaks).toFixed(2) + ')' + snd.high.slice(0, 5).map((x) => ' ' + x).join(''));
  ok(med(snd.peaks) > med(snd.trio) * 0.5 && med(snd.peaks) < med(snd.trio) * 2, 'balanced with the Phase 8 voices: median peak ' + med(snd.peaks).toFixed(3) + ' against ' + med(snd.trio).toFixed(3) + ' for Umbrit, Cannonis and Aimza III');
  const dl = Object.keys(snd.deeper);
  ok(dl.length === 18 && dl.every((ln) => snd.deeper[ln][1] < snd.deeper[ln][0]), 'evolution in sound: every line\'s third form calls lower than its first (' + dl.slice(0, 5).map((ln) => ln + ' ' + snd.deeper[ln].join('→') + ' Hz').join(', ') + ' …)');
  ok(snd.off === false && snd.on === true && snd.repeat === false, 'roster voices respect the sound-effects setting and the 120 ms repeat guard');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED: ' : 'PASSED: ') + pass + ' passed, ' + fail + ' failed (browser-roster8b)'); await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
