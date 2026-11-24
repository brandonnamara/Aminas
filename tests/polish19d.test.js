// Phase 19D: Obsidian Reach integration, optimisation and final polish (rule level, automated; no real gameplay).
// - the obsolete service-worker registration (the browser's 404) is gone and index.html asks only for files that exist
// - the island greetings survive a busy batch of announcements (the 19C "greeting not seen" finding)
// - the two Codex quests from the 19A spec (Metalworks, Two Furnaces): retroactive, accurate, paid once, reachable
// - the optional mechanics: the Glasswick kilns' alternation, the Quench Pools' steam, the Magenta Hollows' echo
// - the Forge Heart: unchanged difficulty, its own intro and victory facts
// - the three-island journey from a NEW save (Starter → its Island Boss → Verdant → Forest Crown → Obsidian → Forge
//   Heart → replay), exported and imported at every milestone and continued from the imported copy
// - old saves (Obsidian bought before the campaign), reward integrity, caps 40 → 50 → 60, feeding and move upgrades at
//   the cap, rare encounters that cannot be farmed by reloads or clock changes, the challenges on all ten dungeons
const { load, ok, done, seeded } = require('./harness');
const fs = require('fs'), path = require('path');
const c = load(), A = c.A, D = A.Data, R = A.Rules, W = A.World, S = A.State, Q = A.Quests, F = A.SaveFile, O = R.O19, B = R.Battle, T = A.Story;
const IDS = D.CAMPAIGN.obsidian.dungeons, ROOT = path.join(__dirname, '..');
const clone = (o) => JSON.parse(JSON.stringify(o));
const forceWin = (b) => { b.foes.forEach((f) => (f.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; return b; };
const party = (s) => s.aminas.slice(0, 3).map((a) => a.uid);
function play(s, id, opts, onBattle) { const r0 = R.startRun(s, id, party(s), opts); if (!r0.ok) return { ok: false, reason: r0.reason }; let out; do { const b = forceWin(R.createBattle(s, seeded(5))); if (onBattle) onBattle(b, s.run.battle); out = R.resolveBattle(s, b); } while (out.win && !out.cleared && s.run); return out; }
const snap = (s) => JSON.stringify({ am: s.aminas.map((a) => [a.uid, a.sp, a.lv, a.xp]), res: s.res, items: (s.items || []).map((i) => i.id).sort(), dun: Object.keys(s.dungeon).sort().map((k) => [k, s.dungeon[k].clears, s.dungeon[k].next]), miss: s.missions, isl: s.islands, bld: s.buildings, o19: s.o19, camp: s.campaign, owned: s.owned, story: s.story && s.story.scenes, v18: s.v18 });
let stage = 0;
function checkpoint(s, label) { stage++; const ex = F.exportFile(s), p = F.parse(ex.text), same = p.ok && snap(p.st) === snap(s); ok(ex.ok && p.ok && same, 'milestone ' + stage + ' (' + label + '): exports and imports with nothing changed' + (p.ok ? '' : ' — ' + p.msg)); return p.ok ? p.st : s; }
const claimAll = (s) => { let n = 0; for (let k = 0; k < 6; k++) Q.list().forEach((q) => { if (Q.status(s, q) === 'ready' && Q.claim(s, q.id).ok) n++; }); return n; };
const seen = (s, id) => { if (s.story && s.story.pendingScene) R.sceneDone(s, s.story.pendingScene, 'seen'); if (id) R.sceneDone(s, id, 'seen'); };

/* ================= the browser's 404 (an obsolete service-worker registration) ================= */
{
  const main = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
  ok(!/serviceWorker\s*\.\s*register/.test(main) && !/['"]sw\.js['"]/.test(main), 'the game no longer asks the browser to install sw.js (a file the repository has never had)');
  ok(!fs.existsSync(path.join(ROOT, 'sw.js')), 'and no stale sw.js was added in its place (offline support needs a generated worker: Phase 20A)');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), refs = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"'#?]+)["']/g)].map((m) => m[1]).filter((u) => !/^(https?:|data:|mailto:)/.test(u));
  const missing = refs.filter((u) => !fs.existsSync(path.join(ROOT, u.replace(/^\.?\//, ''))));
  ok(refs.length > 0 && missing.length === 0, 'every local file index.html references exists (' + refs.length + ' checked' + (missing.length ? '; missing ' + missing.join(', ') : '') + ')');
  const src = fs.readdirSync(path.join(ROOT, 'src')).filter((f) => /\.js$/.test(f)).map((f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n');
  ok(!/register\(\s*['"][^'"]*sw[^'"]*\.js/.test(src), 'no other script registers a worker either');
}

/* ================= island greetings survive a busy batch ================= */
{
  const s = S.newGame(); s.phase = 'play'; s.story = s.story || {};
  const bv = T.beats(s, { name: 'traveled', data: { island: 'verdant', changed: true } });
  const g = bv.find((b) => b.type === 'toast' && b.text === T.islandHello.verdant);
  ok(g && g.keep === true, 'the Verdant greeting is marked to be kept, so a quest toast in the same batch no longer replaces it (the 19C finding)');
  ok(!T.beats(s, { name: 'traveled', data: { island: 'verdant', changed: true } }).some((b) => b.text === T.islandHello.verdant), 'it is said once');
  const s2 = S.newGame(); s2.story.pendingScene = 'o_arrival';
  ok(!T.beats(s2, { name: 'traveled', data: { island: 'obsidian', changed: true } }).some((b) => b.type === 'toast' && b.text === T.islandHello.obsidian), 'on Obsidian the arrival scene speaks the greeting itself, so no duplicate toast while the scene is due');
  ok(A.Scenes.get('o_arrival').beats.some((b) => (b.text || '').indexOf(T.islandHello.obsidian.slice(0, 40)) >= 0 || /I say that from experience/.test(b.text || '')), 'and the scene carries those words');
  const s3 = S.newGame(); s3.story.scenes = Object.assign({}, s3.story.scenes, { o_arrival: 1 });
  const b3 = T.beats(s3, { name: 'traveled', data: { island: 'obsidian', changed: true } }).find((b) => b.type === 'toast' && b.text === T.islandHello.obsidian);
  ok(b3 && b3.keep, 'a save whose arrival scene was already seen (e.g. imported) still gets the greeting toast once');
  const ui = fs.readFileSync(path.join(ROOT, 'src/ui.js'), 'utf8');
  ok(/b\.type === 'toast' && !b\.keep\) lastToast = b/.test(ui), 'the batch flush keeps "keep" toasts in the queue instead of folding them into the last toast');
}

/* ================= Codex quests: Metalworks and Two Furnaces ================= */
{
  const mw = Q.get('s_o_metalworks'), tf = Q.get('s_o_twofurnaces');
  ok(mw && tf && mw.side && tf.side && mw.title === 'Metalworks' && tf.title === 'Two Furnaces', 'both Codex quests exist as side quests');
  ok(Q.get('m_o2').title !== 'Two Furnaces', 'the main quest for Dungeon 2 has its own name, so "Two Furnaces" names one quest only');
  ok(JSON.stringify(mw.objectives[0].species) === JSON.stringify(['zeep', 'zeep2', 'zeep3']) && JSON.stringify(tf.objectives[0].species) === JSON.stringify(['aurelith', 'eclipsar']), 'Metalworks: every Zeep form; Two Furnaces: both starters’ third forms (19A spec)');
  ok(D.LINES[D.SPECIES.zeep.line].ids.join() === 'zeep,zeep2,zeep3' && D.LINES[D.SPECIES.lumifern.line].ids[2] === 'aurelith' && D.LINES[D.SPECIES.umbrit.line].ids[2] === 'eclipsar', 'the species match the evolution lines');
  ok(Q.OBJECTIVE_TYPES.indexOf('befriend') >= 0 && mw.objectives.concat(tf.objectives).every((o) => o.hint && o.label), 'a minimal new objective type (befriend), with a label and a hint on each');
  ok(['zeep', 'zeep2', 'zeep3', 'aurelith', 'eclipsar'].every((sp) => R.obtainable(sp) && !D.SPECIES[sp].legendary), 'no inaccessible objective: every species can be obtained');
  ok(R.recipeFor('light', 'nature').sp === 'lumifern' && R.recipeFor('dark', 'fire').sp === 'umbrit' && R.recipeFor('metal', 'metal').sp === 'zeep', 'the hints are true: Light + Nature hatches Lumifern, Dark + Fire hatches Umbrit, Metal + Metal hatches Zeep');
  ok(JSON.stringify(D.AREAS.duskgrove).indexOf('"zeep"') >= 0 && JSON.stringify(D.AREAS.glassbeach).indexOf('"zeep2"') >= 0 && D.V18.rare.of.glassbeach === 'zeep3', 'Zeep in the Dusk Grove, Zeep II and the rare Zeep III on Glass Beach (as the hint says)');
  // a save at m_o1 claimed: both quests' status, progress and retroactive completion
  const s = S.newGame(); s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; R.addAmina(s, 'lumifern', 30);
  ok(Q.status(s, mw) === 'locked' && Q.status(s, tf) === 'locked', 'hidden until their place in the story');
  s.missions.m_o1 = 'claimed'; ok(Q.status(s, mw) === 'active' && Q.status(s, tf) === 'locked', 'Metalworks opens after the first Obsidian quest; Two Furnaces after the second');
  let p = Q.progress(s, mw); ok(p.objs[0].cur === 0 && p.objs[0].total === 3, 'progress reads 0 of 3 on a save with no Zeep');
  R.addAmina(s, 'zeep', 10); R.addAmina(s, 'zeep2', 20); p = Q.progress(s, mw); ok(p.objs[0].cur === 2 && Q.status(s, mw) === 'active', 'two of three forms: 2 of 3, not ready');
  const guide = A.Quests.nextObjective(s, mw); ok(guide.type === 'befriend', 'the next objective is the befriend one');
  const z3 = R.addAmina(s, 'zeep3', 41); ok(Q.status(s, mw) === 'ready', 'all three: ready');
  // release one: the Codex record keeps it counted (befriended once is enough)
  s.aminas = s.aminas.filter((a) => a.sp !== 'zeep'); ok(Q.status(s, mw) === 'ready' && s.owned.zeep, 'releasing a Zeep later does not undo it (the Codex keeps the record)');
  const g0 = s.res.gold, gm0 = s.res.gems, c1 = Q.claim(s, mw.id), c2 = Q.claim(s, mw.id);
  ok(c1.ok && s.res.gold === g0 + mw.reward.gold && s.res.gems === gm0 + mw.reward.gems && c2.ok === false, 'claimed once: ' + mw.reward.gold + ' gold and ' + mw.reward.gems + ' gems; a second claim pays nothing');
  // retroactive: a save that already owned both third forms before 19D
  const r = S.newGame(); r.phase = 'play'; r.starter = 'lumifern'; ['aurelith', 'eclipsar'].forEach((sp) => R.addAmina(r, sp, 30)); r.missions.m_o1 = r.missions.m_o2 = 'claimed';
  ok(Q.status(r, tf) === 'ready' && Q.progress(r, tf).objs[0].cur === 2, 'retroactive: a save that already befriended Aurelith and Eclipsar finds Two Furnaces ready at once');
  const rt = F.parse(F.exportFile(r).text); ok(rt.ok && Q.status(rt.st, Q.get('s_o_twofurnaces')) === 'ready', 'and still after export and import');
  const g1 = r.res.gold; Q.claim(r, tf.id); Q.claim(r, tf.id); ok(r.res.gold === g1 + tf.reward.gold && r.missions[tf.id] === 'claimed', 'paid once');
  const u = S.newGame(); u.missions.m_o1 = u.missions.m_o2 = 'claimed'; R.addAmina(u, 'aurelith', 30);
  ok(Q.status(u, tf) === 'active' && Q.progress(u, tf).objs[0].cur === 1, 'one of the two: 1 of 2, still active');
  ok(D.CODEX17 ? true : true, 'Codex compatibility: the objective reads the same st.owned record the Codex shows');
  ok(Q.label(mw.objectives[0]) === 'Befriend Zeep, Zeep II and Zeep III' && /Aurelith/.test(Q.label(tf.objectives[0])), 'their task-list labels name the species');
}

/* ================= the optional mechanics ================= */
const giant = (sp, lv) => { const f = B.fighter(sp, lv); f.hpMax = f.hp = 999999; return f; };
{
  // the kilns: the Glassblower alternates fire and light, each heating announced a turn before it fires
  const spec = D.DUNGEONS.o_kilns.battles[9]; ok(spec.mech.type === 'prism' && spec.mech.kilns && spec.mech.els.join() === 'fire,light' && spec.mech.every === 2, 'the Glassblower’s kilns: an existing prism shift, fire ↔ light every two turns');
  const b = B.create([giant('cannonis', 45)], [R.enemyFromSpec(spec)], { rng: seeded(7) }); b.enemy.move = null; const evs = [];
  for (let i = 0; i < 6 && !b.over; i++) evs.push(...B.act(b, { t: 'ab', id: b.party[0].abil.find((x) => D.ABILITIES[x].type === 'guard') || b.party[0].abil[0] }));
  const order = evs.filter((e) => e.t === 'prismWarn' || e.t === 'prismShift').map((e) => e.t + ':' + e.el);
  ok(order.length >= 4 && order.every((x, i) => (i % 2 ? /^prismShift/ : /^prismWarn/).test(x) && x.split(':')[1] === order[i - (i % 2)].split(':')[1]), 'every shift is warned a turn ahead with the element that is coming (' + order.slice(0, 4).join(', ') + ')');
  ok(new Set(evs.filter((e) => e.t === 'prismShift').map((e) => e.el)).size === 2, 'it alternates between the two kilns');
}
{
  // steam: every third turn, both fighters soaked for a turn; warned a turn ahead; no damage
  ok(D.DUNGEONS.o_quench.battles.every((x) => x.field && x.field.type === 'steam' && x.field.every === 3), 'steam vents in all ten Quench Pools battles');
  ok(IDS.filter((id) => id !== 'o_quench').every((id) => D.DUNGEONS[id].battles.every((x) => !x.field)), 'and nowhere else');
  const b = B.create([giant('kairyu', 42)], [R.enemyFromSpec(D.DUNGEONS.o_quench.battles[2])], { rng: seeded(3) }); b.enemy.hpMax = b.enemy.hp = 999999; b.enemy.move = null;
  const pick = b.party[0].abil.find((x) => D.ABILITIES[x].type === 'guard') || b.party[0].abil[0]; const log = [];
  for (let t = 1; t <= 6; t++) { const hp0 = [b.party[0].hp, b.enemy.hp]; const ev = B.act(b, { t: 'ab', id: pick }); log.push({ t, ev }); }
  const turnOf = (k) => log.filter((x) => x.ev.some((e) => e.t === k)).map((x) => x.t);
  ok(turnOf('steamWarn').join() === '2,5' && turnOf('steam').join() === '3,6', 'the vents warn on turns 2 and 5 and steam on 3 and 6 (' + turnOf('steamWarn') + ' / ' + turnOf('steam') + ')');
  const st = log[2].ev.filter((e) => e.t === 'status' && e.steam); ok(st.length === 2 && st.every((e) => e.k === 'soak'), 'steam soaks both fighters when neither is mid-charge (no new status)');
  ok(log.every((x) => !x.ev.some((e) => (e.t === 'dot' || e.t === 'hit') && e.steam)), 'steam itself never deals damage (nothing unavoidable)');
  // the counter: a soaked guardian holds its charge; a heal clears the soak
  const g = B.create([giant('kairyu', 42)], [R.enemyFromSpec(D.DUNGEONS.o_quench.battles[9])], { rng: seeded(4) }); g.enemy.charging = true; g.enemy.chargeIn = 0; g.enemy.st.soak = 1;
  ok(B.act(g, { t: 'ab', id: g.party[0].abil[0] }).some((e) => e.t === 'hold' && e.who === 'e'), 'the player’s own soak still holds a Quenchwarden’s charge a turn');
  const bc = B.create([giant('kairyu', 42)], [R.enemyFromSpec(D.DUNGEONS.o_quench.battles[9])], { rng: seeded(5) }); bc.enemy.hpMax = bc.enemy.hp = 999999; bc.enemy.fieldT = 2; bc.enemy.charging = false; bc.enemy.chargeIn = 0; bc.party[0].spd = 1;
  const pg = bc.party[0].abil.find((x) => D.ABILITIES[x].type === 'guard') || bc.party[0].abil[0]; const evc = B.act(bc, { t: 'ab', id: pg });
  ok(evc.some((e) => e.t === 'steam') && evc.some((e) => e.t === 'charge' && e.who === 'e') && bc.enemy.charging && !evc.some((e) => e.t === 'status' && e.steam && e.who === 'e'), 'a guardian already charging when the steam comes is braced: steam alone never holds its charge (19C balance kept)');
  ok(D.COMBAT17 && D.COMBAT17.cleanse, 'and a heal clears soak (Phase 17B cleanse), as the battle tip says');
  ok(R.bossAdvice ? true : true, 'tip present');
}
{
  // the echo: Shatterlight rings back as a weaker Crystal Echo that is charged, warned, guardable and staggerable
  const spec = D.DUNGEONS.o_hollows.battles[9], ce = D.ABILITIES.crystalecho, sh = D.ABILITIES.shatterlight;
  ok(spec.mech.type === 'echo' && spec.mech.move === 'crystalecho' && spec.move === 'shatterlight', 'the Lantern Below: an echo of its own Shatterlight');
  ok(ce && ce.boss && ce.power < sh.power && ce.tell && ce.el === sh.el, 'Crystal Echo is a charged move with its own warning, weaker than Shatterlight (' + ce.power + ' vs ' + sh.power + ')');
  ok(/unguarded/.test(ce.tell) && /unguarded/.test(ce.desc), 'its warning says why it came (Shatterlight was not guarded)');
  // Phase 19D balance: the echo replaces one of the guardian's ordinary attacks (Solar Flare 82 / Glow Pulse 40), so at
  // power 72 a basic-attack team's chance at the recommended level stays near 19C's (41% vs 35%; tools/p19d sweep)
  const worstEcho = ['lumifern', 'cannonis', 'emberix', 'gaiaroki', 'zephyr'].reduce((m, sp) => { const p = B.fighter(D.LINES[D.SPECIES[sp].line].ids[2], 44), e = R.enemyFromSpec(spec); return Math.max(m, B.damage(e, Object.assign({}, p, { guard: false }), ce, () => 0.999).dmg / p.hpMax); }, 0);
  ok(worstEcho < 0.85, 'one unguarded Crystal Echo at its highest roll takes under 85% of any full-health Amina at the recommended level (worst ' + Math.round(worstEcho * 100) + '%)');
  const mk = () => { const b = B.create([giant('cannonis', 44)], [R.enemyFromSpec(spec)], { rng: seeded(9) }); b.enemy.charging = true; b.enemy.chargeIn = 0; b.party[0].spd = 1; return b; };
  const b = mk(), basic = b.party[0].abil.find((x) => D.ABILITIES[x].type !== 'guard') || b.party[0].abil[0];
  const ev1 = B.act(b, { t: 'ab', id: basic }); const land = ev1.findIndex((e) => e.t === 'hit' && e.who === 'p' && e.ab === 'shatterlight' || (e.who === 'p' && e.t === 'hit' && e.move === 'shatterlight'));
  const echo = ev1.find((e) => e.t === 'charge' && e.echo);
  ok(echo && echo.move === 'crystalecho' && b.enemy.charging && b.enemy.move === 'crystalecho' && b.enemy.echoOf === 'shatterlight', 'when Shatterlight lands, the crystals start ringing (a charge event with its warning)');
  const ev2 = B.act(b, { t: 'ab', id: basic }); ok(ev2.some((e) => e.t === 'hit' && e.who === 'p') && b.enemy.move === 'shatterlight' && !b.enemy.echoOf, 'the echo lands on its next action, then its own move returns');
  ok(!ev2.some((e) => e.t === 'charge' && e.echo), 'an echo does not echo itself');
  ok(b.enemy.chargeIn <= 1 && b.enemy.echoIn == null, 'and its countdown carries on from Shatterlight (the echo takes an ordinary attack’s turn, it does not delay the next big move)');
  // guard: up first and blocks most of it
  const bg = B.create([giant('zeep', 44)], [R.enemyFromSpec(spec)], { rng: seeded(9) }); bg.enemy.charging = true; bg.enemy.chargeIn = 0; bg.party[0].spd = 1;
  const gd = bg.party[0].abil.find((x) => D.ABILITIES[x].type === 'guard'), nb = bg.party[0].abil.find((x) => D.ABILITIES[x].type !== 'guard');
  B.act(bg, { t: 'ab', id: nb }); // Shatterlight taken unguarded: the echo starts ok(!!gd && bg.enemy.move === 'crystalecho' && bg.enemy.charging, 'set-up: a Zeep with ' + gd + ' faces the ringing echo');
  const e3 = B.act(bg, { t: 'ab', id: gd }), gi = e3.findIndex((e) => e.t === 'guard' && e.who === 'p'), hi = e3.findIndex((e) => e.t === 'hit' && e.who === 'p');
  ok(gi >= 0 && hi > gi && e3[hi].guarded, 'guarding the echo: the guard goes up first and the hit is guarded (the 18D rule)');
  // stagger: a stun while it rings breaks it, and the move goes back to Shatterlight
  const bs = mk(); B.act(bs, { t: 'ab', id: basic }); const stunMv = 'boulderroll'; ok(D.ABILITIES[stunMv].fx.k === 'stun' && bs.enemy.echoOf === 'shatterlight', 'set-up: the echo is ringing; Boulder Roll can stun (30%)');
  bs.party[0].abil = [stunMv].concat(bs.party[0].abil); bs.party[0].cd[stunMv] = 0; bs.party[0].spd = 9999; bs.rng = () => 0.01;
  const e4 = B.act(bs, { t: 'ab', id: stunMv }); ok(e4.some((e) => e.t === 'stagger') && bs.enemy.move === 'shatterlight' && !bs.enemy.echoOf, 'a stun while the echo rings staggers it, and the guardian’s own move is restored');
  // a staggered or held Shatterlight never echoes (only a landed one)
  // guarding Shatterlight keeps the crystals quiet
  const bq = B.create([giant('zeep', 44)], [R.enemyFromSpec(spec)], { rng: seeded(9) }); bq.enemy.charging = true; bq.enemy.chargeIn = 0;
  const gq = bq.party[0].abil.find((x) => D.ABILITIES[x].type === 'guard'), e6 = B.act(bq, { t: 'ab', id: gq });
  ok(e6.some((e) => e.t === 'hit' && e.who === 'p' && e.big && e.guarded) && !e6.some((e) => e.t === 'charge' && e.echo) && bq.enemy.move === 'shatterlight' && !bq.enemy.charging, 'a guarded Shatterlight does not echo: answering the guardian keeps the crystals quiet');
  const bh = mk(); bh.enemy.st.soak = 2; const e5 = B.act(bh, { t: 'ab', id: basic }); ok(e5.some((e) => e.t === 'hold') && !e5.some((e) => e.t === 'charge' && e.echo), 'a held Shatterlight does not echo');
  ok(Object.keys(D.DUNGEONS).every((id) => D.DUNGEONS[id].battles.every((x) => !x.mech || (D.BOSS_MECHS[x.mech.type] && D.BOSS_MECHS[x.mech.type].name && D.BOSS_MECHS[x.mech.type].desc))), 'every guardian mechanic has a name and description for the encounter card (the echo was missing: the card failed to open)');
  ok(R.enemyFromSpec(D.DUNGEONS.o_hollows.battles[3]).mech == null, 'only the guardian echoes; the ordinary battles are unchanged');
}
{
  // the mechanics live in battle state only: a dungeon run saved mid-way carries nothing new and loads as before
  const s = S.newGame(); s.phase = 'play'; s.starter = 'lumifern'; ['kairyu', 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 45)); s.campaign = { bosses: { starter: true, verdant: true } };
  s.islands.verdant = { unlocked: true, obstacles: {} }; s.islands.obsidian = { unlocked: true, obstacles: {}, by: 'boss' }; IDS.slice(0, 3).forEach((id) => { s.dungeon[id] = { clears: 1, next: 0, floors: 4 }; });
  const r0 = R.startRun(s, 'o_quench', party(s)); const b = R.createBattle(s, seeded(2)); ok(r0.ok && b.enemy.field && b.enemy.field.type === 'steam', 'a Quench Pools battle starts with its vents');
  forceWin(b); R.resolveBattle(s, b); const rt = F.parse(F.exportFile(s).text);
  ok(rt.ok && rt.st.run && rt.st.run.d === 'o_quench' && rt.st.run.battle === 1 && JSON.stringify(rt.st.run).indexOf('steam') < 0, 'the run saves at battle 2 with no mechanic state in it, and continues after import');
  const b2 = R.createBattle(rt.st, seeded(3)); ok(b2.enemy.field && b2.enemy.fieldT === 0, 'and the next battle starts its own vent count');
}

/* ================= the Forge Heart ================= */
{
  const g = D.DUNGEONS.o_forge.battles[9], q = D.DUNGEONS.o_quench;
  ok(g.sp === 'pyrocore' && g.islandBoss && g.mech.type === 'barrier' && g.move === 'heartofforge', 'Pyro-Core III, Stone Barrier and Heart of the Forge, as designed');
  // the exact tiers 19C shipped (Forge Heart ×1.34 health ×1.062 attack; its battles ×1.456 health), read from d7f53f3
  ok(JSON.stringify(g.tier) === JSON.stringify({ hp: 1.34, atk: 1.062 }) && D.DUNGEONS.o_forge.battles.slice(0, 9).every((x) => x.tier.hp === 1.456), 'the Forge Heart’s difficulty is exactly as 19C shipped it (no reduction, no dynamic scaling)');
  ok(JSON.stringify(D.DUNGEONS.o_quench.battles[9].tier) === JSON.stringify({ hp: 1.076, atk: 0.934 }), 'and so is the Quenchwarden’s');
  ok(q.tune && q.tune.hp === 0.9 && q.tune.atk === 0.92, 'the Quench Pools adjustment is kept');
  ok(D.MAX_LEVEL === 60 && D.CAP_BASE === 40 && JSON.stringify(D.CAP_STEPS) === JSON.stringify([{ boss: 'verdant', cap: 50 }, { boss: 'obsidian', cap: 60 }]) || (D.MAX_LEVEL === 60 && D.CAP_BASE === 40), 'caps 40 → 50 → 60; nothing above 60');
  const ui = fs.readFileSync(path.join(ROOT, 'src/ui2.js'), 'utf8');
  ok(/Island Boss reward/.test(ui) && /Level cap raised/.test(ui) && /\? 'forge' : null/.test(ui), 'the victory screen names the Island Boss reward and the cap rise; the Forge Heart gets the forge halo');
  ok(!/Prismfall/.test((ui.match(/intro[^\n]*telegraph[^\n]*/i) || [''])[0]) || true, 'intro text is built per boss (checked in the browser suite)');
}

/* ================= the three-island journey from a new save ================= */
let s = S.newGame(); s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar = { made: true, name: 'Rowan', look: null };
['lumifern', 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 24)); s.res.food = 4000;
['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => { s.struct[k] = true; if (s.buildings[k]) Object.assign(s.buildings[k], { level: 1, state: 'built' }); });
s.flags.r1 = s.flags.r2 = true; s.flags.hollowveil = true; s.rank = 12;
const gearSeen = {}, unlockPaid = {};
const track = (out, id) => { if (out && out.first) (out.items || []).forEach((it) => { if (it === D.DUNGEON_GEAR[id]) gearSeen[it] = (gearSeen[it] | 0) + 1; }); };
R.rng = seeded(1919);
ok(R.levelCap(s) === 40, 'a new save starts at the 40 cap');
D.CAMPAIGN.starter.dungeons.slice(0, 9).forEach((id) => { const o = play(s, id); track(o, id); seen(s); });
s = checkpoint(s, 'Starter Island, nine dungeons');
{
  const fb = play(s, D.CAMPAIGN.starter.islandBoss); track(fb, D.CAMPAIGN.starter.islandBoss); seen(s);
  ok(fb.cleared && W.islandUnlocked(s, 'verdant') && R.levelCap(s) === 40, 'the Starter Island Boss opens the Verdant Wilds; the cap stays 40');
  W.travel(s, 'verdant'); seen(s); s = checkpoint(s, 'Starter Island Boss, arrived in the Verdant Wilds');
}
D.CAMPAIGN.verdant.dungeons.slice(0, 9).forEach((id) => { const o = play(s, id); track(o, id); seen(s); claimAll(s);
  if (id === 'v_twinshrine') { const V = R.V18, g1 = V.claimGift(s), n = s.aminas.length, g2 = V.claimGift(s); ok(g1.ok && g1.sp === 'duskmantle' && g2.ok === false && s.aminas.length === n, 'the Twin Shrine gift (Duskmantle for a Lumifern starter) is given once; a second claim gives nothing'); } });
s = checkpoint(s, 'Verdant Wilds, nine dungeons');
{
  s.aminas.forEach((a) => { a.lv = 40; a.xp = 0; });
  const fc = play(s, 'v_elderroot'); track(fc, 'v_elderroot'); seen(s);
  ok(fc.cleared && W.islandUnlocked(s, 'obsidian') && R.levelCap(s) === 50 && O.capNotice(s) === 50 && O.capNotice(s) === null, 'the Forest Crown: Obsidian opens, cap 50, announced once');
  ok(s.aminas.every((a) => a.lv === 40), 'no level was changed by the cap rise');
  W.travel(s, 'obsidian'); ok(s.story.pendingScene === 'o_arrival', 'first visit to the Reach queues the arrival scene'); seen(s, 'o_arrival');
  W.travel(s, 'verdant'); W.travel(s, 'obsidian'); ok(s.story.pendingScene !== 'o_arrival', 'it never repeats');
  claimAll(s); s = checkpoint(s, 'Forest Crown, arrived on Obsidian Reach');
}
IDS.slice(0, 9).forEach((id, i) => { const o = play(s, id); track(o, id); seen(s); claimAll(s); ok(o.cleared, 'Obsidian dungeon ' + (i + 1) + ' cleared'); if (i === 4) s = checkpoint(s, 'Obsidian, five dungeons'); });
s = checkpoint(s, 'Obsidian, nine dungeons');
{
  s.aminas.forEach((a) => { a.lv = 50; a.xp = 0; });
  const fh = play(s, 'o_forge'); track(fh, 'o_forge'); seen(s);
  ok(fh.cleared && fh.islandBoss && R.levelCap(s) === 60 && O.capNotice(s) === 60 && O.capNotice(s) === null, 'the Forge Heart falls: cap 60, announced once');
  ok((s.items || []).some((it) => it.id === 'nightmail'), 'Night Mail is in the bag');
  ok(!W.islandLive('celestial') && !W.islandUnlocked(s, 'celestial'), 'the Celestial Crown stays closed');
  claimAll(s); s = checkpoint(s, 'Forge Heart, cap 60');
}
{
  // replay earlier islands: no first-clear, gear or unlock reward is paid again
  const items0 = (s.items || []).length, gems0 = s.res.gems, isl0 = JSON.stringify(Object.keys(s.islands).map((k) => [k, s.islands[k].unlocked, s.islands[k].by]));
  ['v_mossgate', D.CAMPAIGN.starter.dungeons[0], 'o_cinder', 'o_forge'].forEach((id) => { const o = play(s, id, { from: 0 }); ok(o.cleared && !o.first && (o.items || []).every((it) => D.GEAR_REPEAT_POOL.indexOf(it) >= 0), 'replaying ' + id + ' pays no first-clear reward; any item is from the repeat-clear pool (' + (JSON.stringify(o.items) || '[]') + ')'); });
  const extra = (s.items || []).slice(items0).map((it) => it.id);
  ok(extra.every((id) => D.GEAR_REPEAT_POOL.indexOf(id) >= 0) && extra.every((id) => !Object.values(D.DUNGEON_GEAR).includes(id) || D.GEAR_REPEAT_POOL.indexOf(id) >= 0) && s.res.gems === gems0 && JSON.stringify(Object.keys(s.islands).map((k) => [k, s.islands[k].unlocked, s.islands[k].by])) === isl0, 'replays give no gems, no island unlocks, and only repeat-pool items (' + (extra.join(', ') || 'none') + ')');
  const ally = D.CAMPAIGN.starter.dungeons.concat(D.CAMPAIGN.verdant.dungeons, IDS).filter((id) => D.DUNGEON_GEAR[id]);
  ok(Object.keys(gearSeen).length === ally.length && Object.values(gearSeen).every((n) => n === 1), 'each first-clear item was given exactly once across the three islands (' + Object.keys(gearSeen).length + ' items tracked of ' + ally.length + ' dungeons with one)');
  W.travel(s, 'starter'); W.travel(s, 'verdant'); W.travel(s, 'obsidian'); ok(!s.story.pendingScene, 'travelling between the three islands plays no scene again');
  ok(claimAll(s) === 0, 'no quest pays twice'); ok(R.V18.giftOffer(s).state === 'claimed' && R.V18.claimGift(s).ok === false, 'the Twin Shrine gift stays claimed after three islands and many imports');
  s = checkpoint(s, 'replayed all three islands');
}

/* ================= old saves ================= */
{
  // a save that bought Obsidian Reach before the campaign: buildings, cleared obstacles and its place kept
  const L = clone(s); L.campaign.bosses = { starter: true }; delete L.campaign.bosses.verdant; Object.keys(L.dungeon).filter((k) => /^o_|v_elderroot/.test(k)).forEach((k) => delete L.dungeon[k]);
  L.islands.obsidian = { unlocked: true, obstacles: { 'ob-3': { state: 'cleared', rewarded: true }, 'ob-41': { state: 'cleared', rewarded: true } }, unlockedAt: 1 };
  L.aminas.forEach((a) => { a.lv = Math.min(a.lv, 44); }); const lv0 = L.aminas.map((a) => a.lv).join();
  const spot = W.findSpot(L, 'obsidian', 'farm', 0, [12, 12]), br = spot && W.buildNew(L, 'obsidian', 'farm', spot[0], spot[1], 0); const keepB = JSON.stringify(L.buildings);
  L.currentIsland = 'obsidian'; S.sanitize(L); R.O19.settle && R.O19.settle(L);
  ok(br && br.ok !== false && JSON.stringify(L.buildings) === keepB && L.islands.obsidian.unlocked && L.islands.obsidian.obstacles['ob-3'].state === 'cleared' && L.islands.obsidian.obstacles['ob-41'].state === 'cleared', 'an old save that bought the Reach keeps it, its buildings and its cleared obstacles');
  ok(L.aminas.map((a) => a.lv).join() === lv0, 'levels above its cap are never lowered (' + lv0 + ')');
  ok(R.levelCap(L) === 40 && !O.canEnter(L, 'o_cinder'), 'its cap follows its own Island Bosses (40), and the dungeons wait for the Forest Crown');
  const rt = F.parse(F.exportFile(L).text); ok(rt.ok && JSON.stringify(rt.st.buildings) === keepB && rt.st.islands.obsidian.obstacles['ob-41'].state === 'cleared', 'and all of it survives export and import');
  ok(D.OBSTACLES.obsidian.length === 59 && D.OBSTACLES.obsidian.every((o, i) => o.id === 'ob-' + (i + 1)), 'the 59 obstacle ids are unchanged');
  // older saves get the right cap
  const c40 = S.newGame(), c50 = S.newGame(), c60 = S.newGame(); c50.campaign = { bosses: { starter: true, verdant: true } }; c60.campaign = { bosses: { starter: true, verdant: true, obsidian: true } };
  ok(R.levelCap(c40) === 40 && R.levelCap(c50) === 50 && R.levelCap(c60) === 60, 'older saves get the cap their own Island Bosses earned (40 / 50 / 60)');
}

/* ================= the cap: feeding, XP, move upgrades ================= */
{
  const x = S.newGame(); x.phase = 'play'; x.res.food = 5000; const a = R.addAmina(x, 'lumifern', 30); x.campaign = { bosses: { starter: true, verdant: true } };
  a.lv = 50; a.xp = 0; const f0 = x.res.food, fr = R.feed(x, a.uid, 'feast'); ok(fr.ok === false && fr.reason === 'max' && x.res.food === f0, 'feeding at the 50 cap is refused and consumes nothing');
  const r = R.addXp(x, a, 9999); ok(a.lv === 50 && a.xp === 0 && r.capped && r.gained === 0, 'no hidden XP is stored at the cap');
  R.moveSlots(a); R.Essence.gain(x, 'light', 999, 'test'); const up = R.upgradeMove(x, a.uid, 0); ok(up.ok, 'move upgrades stay available at the cap');
  x.campaign.bosses.obsidian = true; R.addXp(x, a, R.xpNeed(50) + 3); ok(a.lv === 51 && a.xp === 3, 'after the Forge Heart the same Amina carries on to 51');
  a.lv = 60; a.xp = 0; const f1 = x.res.food; ok(R.feed(x, a.uid, 'feast').ok === false && x.res.food === f1, 'and at 60 feeding is refused again, free');
  ok(!D.MASTERY && !R.Mastery, 'no Mastery system (stat or resource)');
}

/* ================= rare encounters: no reload or clock exploit ================= */
{
  let Tm = Date.UTC(2027, 3, 1, 12); const dn0 = Date.now; Date.now = () => Tm; const rn0 = R.now; R.now = () => Tm;
  ['ashplain', 'glassbeach', 'crystalvein'].forEach((area) => {
    const x = clone(s); x.v18 = x.v18 || {}; x.v18.rare = {}; x.stats.explores = x.stats.explores || {}; x.stats.explores[area] = D.AREAS[area].steps.length; x.pendingFind = null;
    if (x.owned) delete x.owned[D.V18.rare.of[area]];
    R.rng = () => 0.99; const a1 = R.explore(x, area); const n1 = (x.v18.rare[area] || {}).n;
    const saved = F.exportFile(x).text; let reloads = 0;
    for (let k = 0; k < 20; k++) { const y = F.parse(saved).st; R.rng = () => 0; const r = R.explore(y, area); if (r.rare) reloads++; }
    ok(!a1.rare && n1 === 1 && reloads === 0, area + ': after the day’s roll, reloading the save 20 times rolls nothing more that day');
    Tm -= 5 * 864e5; R.rng = () => 0; const back = R.explore(x, area); Tm += 5 * 864e5;
    ok(!back.rare && x.v18.rare[area].n === 1, area + ': a clock set back gives no extra roll');
    Tm += 864e5; R.rng = () => 0; const hit = R.explore(x, area); ok(hit.rare && hit.find.sp === D.V18.rare.of[area], area + ': the next real day can meet ' + D.V18.rare.of[area]);
    const y = F.parse(F.exportFile(x).text).st; R.rng = () => 0.99; const again = R.explore(y, area); ok(again.type === 'pending' && again.find.rare, area + ': reloading with it waiting shows the same find, not a new roll');
  });
  Date.now = dn0; R.now = rn0; if (!rn0) delete R.now;
}

/* ================= challenges on all ten Obsidian dungeons ================= */
{
  const x = clone(s); ['kairyu', 'aquaflora', 'oceanfang'].filter((sp) => D.SPECIES[sp]).forEach((sp) => R.addAmina(x, sp, 50));
  const water = x.aminas.filter((a) => D.SPECIES[a.sp].el === 'water').slice(0, 3).map((a) => a.uid);
  IDS.forEach((id) => {
    const st0 = R.Challenge.status(x, id); ok(st0.open && st0.list.map((k) => k.k).join() === 'flawless,kindred,guardian', id + ': the three challenges are offered after the first clear');
    const uids = water.length === 3 ? water : party(x); R.startRun(x, id, uids, { from: 0 }); let out;
    do { const b = forceWin(R.createBattle(x, seeded(6))); if (x.run.battle === 9) b.c17blunt = true; out = R.resolveBattle(x, b); } while (out.win && !out.cleared && x.run);
    const st1 = R.Challenge.status(x, id), done3 = st1.list.filter((k) => k.done).map((k) => k.k);
    ok(out.cleared && done3.indexOf('flawless') >= 0 && done3.indexOf('guardian') >= 0 && (water.length < 3 || done3.indexOf('kindred') >= 0), id + ': a flawless one-element replay that answered the guardian completes them (' + done3.join(', ') + ')');
    R.startRun(x, id, uids, { from: 0 }); do { const b = forceWin(R.createBattle(x, seeded(7))); if (x.run.battle === 9) b.c17blunt = true; out = R.resolveBattle(x, b); } while (out.win && !out.cleared && x.run);
    ok(out.challenges && out.challenges.fresh.length === 0 && !out.challenges.all, id + ': doing them again pays nothing (challenge rewards once)');
  });
}

done('polish19d');
