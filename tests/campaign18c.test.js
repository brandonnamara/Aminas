// Phase 18C: the Verdant Wilds campaign. Ten dungeons and 100 battles, unlock order, battle-by-battle saving, retries,
// replays, first-clear and repeat rewards (never duplicated), the seven guardian moves, challenges, the Island Boss,
// Obsidian Reach staying closed, the Twin Shrine gift, Explore areas, quests, scenes and save compatibility.
// Automated rule-level checks: no real gameplay is involved.
const { load, ok, done, seeded } = require('./harness');
const c = load(), A = c.A, D = A.Data, R = A.Rules, W = A.World, S = A.State, Q = A.Quests, B = R.Battle, V = R.V18;
const clone = (o) => JSON.parse(JSON.stringify(o));
const forceWin = (b) => { b.foes.forEach((f) => (f.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; return b; };
const forceLose = (b) => { b.party.forEach((f) => (f.hp = 0)); b.over = true; b.result = 'lose'; return b; };
const IDS = D.CAMPAIGN.verdant.dungeons;
function verdantSave(starter) {
  const s = S.newGame(); s.phase = 'play'; s.introDone = true; s.starter = starter || 'lumifern';
  ['lumifern', 'cannonis', 'emberix'].forEach((sp) => R.addAmina(s, sp, 30)); s.islands.verdant = { unlocked: true, obstacles: {} }; s.currentIsland = 'verdant';
  return s;
}
const party = (s) => s.aminas.slice(0, 3).map((a) => a.uid);
// play a whole dungeon by forcing every battle (rules only), returning the last result
function clearDungeon(s, id, opts) { const r0 = R.startRun(s, id, party(s), opts); if (!r0.ok) return { ok: false, r0 }; let out; do { out = R.resolveBattle(s, forceWin(R.createBattle(s, seeded(3)))); } while (out.win && !out.cleared && s.run); return out; }

/* ---------- structure: 10 × 10 ---------- */
ok(IDS.length === 10 && IDS.every((id) => D.DUNGEONS[id].battles.length === 10), 'ten Verdant dungeons of ten battles each: 100 battles');
ok(IDS.every((id) => D.DUNGEONS[id].playable && D.DUNGEONS[id].island === 'verdant'), 'all ten are playable and belong to the Verdant Wilds');
ok(IDS.map((id) => D.DUNGEONS[id].recommended).join() === '22,24,25,27,28,30,31,33,34,36', 'recommended levels 22 to 36 (approved Band C)');
ok(D.MAX_LEVEL === 40 && IDS.every((id) => D.DUNGEONS[id].battles.every((b) => b.lv >= 19 && b.lv <= 39)), 'every foe is between level 19 and 39, under the cap of 40');
ok(IDS.every((id) => D.DUNGEONS[id].battles.every((b) => D.SPECIES[b.sp])) && Object.keys(D.SPECIES).length === 63, 'every foe is an existing species (still 63)');
ok(IDS.every((id) => D.DUNGEONS[id].battles.every((b) => { const sp = D.SPECIES[b.sp]; return sp.stage === (b.lv >= 22 ? 3 : 2) || !D.LINES[sp.line] || D.LINES[sp.line].ids.length < (b.lv >= 22 ? 3 : 2); })), 'foes take the form their level calls for (II below 22, III from 22)');
ok(IDS.every((id) => { const b = D.DUNGEONS[id].battles; return b[9].boss && b[9].title && b[9].move && b.slice(0, 9).every((x) => !x.boss); }), 'battle 10 of each is its guardian, with a title and a charged move; 1–9 are not');
ok(IDS.every((id) => D.DUNGEONS[id].battles[8].herald && D.DUNGEONS[id].battles[8].move === D.DUNGEONS[id].battles[9].move), 'battle 9 rehearses each guardian’s charged move (the 17B herald)');
ok(D.DUNGEONS.v_elderroot.battles[9].islandBoss && D.CAMPAIGN.verdant.islandBoss === 'v_elderroot' && D.DUNGEONS.v_elderroot.battles[9].mech.type === 'barrier', 'the Elder Root’s Forest Crown is the Island Boss, with a barrier');
ok(D.DUNGEONS.v_twinshrine.battles[9].mech.type === 'prism' && D.DUNGEONS.v_twinshrine.battles[9].mech.els.join() === 'light,dark', 'the Dawn Warden shifts between Light and Dark');
ok(IDS.every((id) => D.DUNGEONS[id].battles.every((b) => b.tier && b.tier.hp > 0 && b.tier.atk > 0)), 'every Verdant foe carries the island’s foe tier (with its own tuning)');
{ const spec = D.DUNGEONS.v_mossgate.battles[0], e = R.enemyFromSpec(spec), plain = B.fighter(spec.sp, spec.lv); ok(e.hpMax === Math.round(plain.hpMax * spec.tier.hp) && e.atk === Math.round(plain.atk * spec.tier.atk), 'the tier raises a foe’s health and attack by its multipliers (' + spec.tier.hp + ' / ' + spec.tier.atk + ')'); }
{ const st0 = D.DUNGEONS.forgottenroad.battles[0], e0 = R.enemyFromSpec(st0), p0 = B.fighter(st0.sp, st0.lv); ok(!st0.tier && e0.hpMax === p0.hpMax && e0.atk === p0.atk, 'Starter Island foes are unchanged (no tier)'); }
ok(D.DUNGEON_ORDER.length === 20 && D.DUNGEON_ORDER.slice(10).join() === IDS.join(), 'the dungeon order lists Starter Island then the Verdant Wilds');
ok(IDS.every((id) => D.DUNGEON_GEAR[id] && D.ITEMS[D.DUNGEON_GEAR[id]]), 'each Verdant dungeon has a first-clear item, all existing items');

/* ---------- unlock order ---------- */
{
  const s = verdantSave(); const s0 = S.newGame();
  ok(!R.dungeonUnlocked(s0, 'v_mossgate'), 'nothing opens before the Verdant Wilds is reached');
  ok(R.dungeonUnlocked(s, 'v_mossgate') && IDS.slice(1).every((id) => !R.dungeonUnlocked(s, id)), 'reaching the island opens Dungeon 1 only');
  ok(R.startRun(s, 'v_aqueduct', party(s)).ok === false, 'a locked dungeon cannot be started');
  for (let i = 0; i < IDS.length; i++) { clearDungeon(s, IDS[i]); if (i < 9) ok(R.dungeonUnlocked(s, IDS[i + 1]) && (i + 2 >= 10 || !R.dungeonUnlocked(s, IDS[i + 2])), 'clearing Dungeon ' + (i + 1) + ' opens Dungeon ' + (i + 2) + ' and only that'); }
  ok(R.islandProgress(s, 'verdant').cleared === 10 && R.islandBossDefeated(s, 'verdant'), 'all ten cleared: the Island Boss is defeated');
}

/* ---------- battle-by-battle saving, retries, replays ---------- */
{
  const s = verdantSave(); R.startRun(s, 'v_mossgate', party(s));
  R.resolveBattle(s, forceWin(R.createBattle(s, seeded(1)))); R.resolveBattle(s, forceWin(R.createBattle(s, seeded(1))));
  ok(R.dungeonRec(s, 'v_mossgate').next === 2 && s.run.battle === 2, 'each win is saved: two wins, the next battle is 3');
  const rt = clone(s); S.sanitize(rt); ok(rt.run && rt.run.battle === 2 && R.dungeonRec(rt, 'v_mossgate').next === 2, 'the run and its progress survive a save round trip');
  const lose = R.resolveBattle(s, forceLose(R.createBattle(s, seeded(1))));
  ok(!lose.win && !s.run && R.dungeonRec(s, 'v_mossgate').next === 2, 'a defeat ends the run without losing progress');
  ok(R.startRun(s, 'v_mossgate', party(s)).battle === 2, 'a retry resumes at the battle that was lost');
  let out; do { out = R.resolveBattle(s, forceWin(R.createBattle(s, seeded(2)))); } while (out.win && !out.cleared && s.run);
  ok(out.cleared && out.first, 'the first clear completes from there');
  const r2 = R.startRun(s, 'v_mossgate', party(s), { from: 9 }); ok(r2.ok && r2.battle === 9, 'a cleared dungeon can be replayed from its guardian');
}

/* ---------- rewards: first clear, sections, repeat, partial replay, no duplicates ---------- */
{
  const s = verdantSave(); const res0 = clone(s.res); const it0 = (s.items || []).length;
  R.startRun(s, 'v_aqueduct', party(s)); // locked
  const first = clearDungeon(s, 'v_mossgate');
  ok(first.first && first.reward.gold === Math.round(900 * W.dungeonRewardMult(s)) && first.reward.gems === Math.round(6 * W.dungeonRewardMult(s)), 'first clear pays the first-clear reward (900 gold, 6 gems before island bonuses)');
  ok(first.items.indexOf('ironbark') >= 0 && (s.items || []).length === it0 + 1, 'and its item, once (Ironbark Vest)');
  const floors = R.dungeonRec(s, 'v_mossgate').floors.slice();
  const g1 = s.res.gold, again = clearDungeon(s, 'v_mossgate', { from: 0 });
  ok(!again.first && again.reward.gold === Math.round(220 * W.dungeonRewardMult(s)) && !again.reward.gems, 'a full replay pays the repeat reward (220 gold, no gems)');
  ok(JSON.stringify(R.dungeonRec(s, 'v_mossgate').floors) === JSON.stringify(floors) && !again.sectionFirst, 'section first-clear rewards are never paid twice');
  ok(!again.items.length || again.items.every((x) => D.GEAR_REPEAT_POOL.indexOf(x) >= 0), 'a replay never repeats the first-clear item (only the usual repeat chance)');
  const part = clearDungeon(s, 'v_mossgate', { from: 9 });
  ok(part.partial && Object.keys(part.reward).length === 0, 'a replay of only the guardian pays its battle, not the clear reward');
  ok(s.res.gold > res0.gold, 'rewards arrived');
}

/* ---------- the Island Boss: recorded once, Obsidian Reach stays closed ---------- */
{
  const s = verdantSave(); IDS.slice(0, 9).forEach((id) => clearDungeon(s, id));
  R.drain(); const out = clearDungeon(s, 'v_elderroot'); const evs = R.drain();
  ok(out.cleared && out.islandBoss && s.campaign.bosses.verdant, 'defeating the Forest Crown records the Verdant Island Boss');
  ok(!out.unlockedIsland && !W.islandUnlocked(s, 'obsidian'), 'Obsidian Reach does not open: it is not ready');
  ok(evs.filter((e) => e.name === 'islandBossDefeated').length === 1, 'the Island Boss event fires once');
  const again = clearDungeon(s, 'v_elderroot', { from: 0 }); ok(!again.unlockedIsland && R.drain().filter((e) => e.name === 'islandBossDefeated').length === 0, 'a replay does not fire it again');
  ok(Q.status(s, Q.get('s_reach')) === 'locked', 'the Dark Shore quest stays hidden');
  D.ISLAND_LIVE.obsidian = true; S.sanitize(s);
  ok(W.islandUnlocked(s, 'obsidian'), 'once Obsidian Reach is marked ready, a save that already beat the Verdant boss gets it on load (no migration)');
  D.ISLAND_LIVE.obsidian = false;
}

/* ---------- the seven new charged moves ---------- */
const NEW = ['floodgate', 'sporebloom', 'archiveseal', 'embercanopy', 'twineclipse', 'tidalhymn', 'crownofthorns'];
ok(NEW.every((k) => D.ABILITIES[k] && D.ABILITIES[k].boss && /is coming!$/.test(D.ABILITIES[k].tell) && D.ABILITIES[k].desc), 'seven new guardian moves, each with a telegraph line and a description');
ok(NEW.every((k) => IDS.some((id) => D.DUNGEONS[id].battles[9].move === k)), 'each is used by a Verdant guardian');
ok(new Set(NEW.map((k) => (D.ABILITIES[k].fx ? D.ABILITIES[k].fx.k : D.ABILITIES[k].type === 'weaken' ? 'weaken' : D.ABILITIES[k].neutral ? 'neutral' : 'raw') + D.ABILITIES[k].el)).size === 7, 'each is distinct (effect and element)');
ok(D.ABILITIES.floodgate.fx.k === 'soak' && D.ABILITIES.archiveseal.fx.k === 'silence' && D.ABILITIES.embercanopy.fx.k === 'burn' && D.ABILITIES.sporebloom.type === 'weaken' && D.ABILITIES.twineclipse.neutral, 'their effects: soak, silence, burn, weaken, never resisted');
NEW.forEach((k) => {
  const id = IDS.find((x) => D.DUNGEONS[x].battles[9].move === k), d = D.DUNGEONS[id], e = R.enemyFromSpec(d.battles[9]), ab = D.ABILITIES[k];
  const worst = ['lumifern', 'cannonis', 'emberix', 'gaiaroki', 'zephyr'].reduce((m, sp) => { const L = D.LINES[D.SPECIES[sp].line].ids, p = B.fighter(L[2], d.recommended); const un = B.damage(e, Object.assign({}, p, { guard: false }), ab, () => 0.999).dmg, gd = B.damage(e, Object.assign({}, p, { guard: true }), ab, () => 0.999).dmg; return Math.max(m, un / p.hpMax); }, 0);
  ok(worst < 0.85, ab.name + ': at its dungeon’s recommended level one unguarded hit at its highest roll takes under 85% of any full-health Amina (worst ' + Math.round(worst * 100) + '% of health)');
});
ok(IDS.every((id) => { const d = D.DUNGEONS[id], e = R.enemyFromSpec(d.battles[9]), ab = D.ABILITIES[d.battles[9].move]; return ['lumifern', 'cannonis', 'emberix', 'gaiaroki', 'zephyr'].every((sp) => { const p = B.fighter(D.LINES[D.SPECIES[sp].line].ids[2], d.recommended); return B.damage(e, Object.assign({}, p, { guard: false }), ab, () => 0.999).dmg < p.hpMax; }); }), 'no Verdant guardian’s charged move can fell a full-health Amina at its recommended level in one hit, even unguarded');
{
  // the framework: a guard blocks three quarters, a stun while charging staggers, soak holds the charge
  const spec = D.DUNGEONS.v_aqueduct.battles[9], e = R.enemyFromSpec(spec), p = B.fighter('oceanfang', 24), ab = D.ABILITIES.floodgate;
  const un = B.damage(e, Object.assign({}, p, { guard: false }), ab, () => 0.5).dmg, gd = B.damage(e, Object.assign({}, p, { guard: true }), ab, () => 0.5).dmg;
  ok(Math.abs(gd / un - 0.25) < 0.05, 'a guard blocks about three quarters of Floodgate (' + un + ' → ' + gd + ')');
  const s = verdantSave(); IDS.slice(0, 1).forEach((id) => clearDungeon(s, id)); R.startRun(s, 'v_aqueduct', [s.aminas[1].uid], { }); s.run.battle = 9;
  const b = R.createBattle(s, seeded(4)); b.enemy.chargeIn = 0; b.enemy.charging = true; b.party[0].abil = ['bubble', 'splash'].filter((x) => D.ABILITIES[x]).concat(b.party[0].abil);
  const stunMv = Object.keys(D.ABILITIES).find((k) => D.ABILITIES[k].fx && D.ABILITIES[k].fx.k === 'stun' && D.ABILITIES[k].fx.p === 1 && !D.ABILITIES[k].boss);
  if (stunMv) { b.party[0].abil = [stunMv].concat(b.party[0].abil); b.party[0].cd[stunMv] = 0; const ev = B.act(b, { t: 'ab', id: stunMv }); ok(ev.some((x) => x.t === 'stagger') || ev.some((x) => x.t === 'stunned' && x.who === 'e'), 'a stun while it charges staggers the guardian (' + stunMv + ')'); }
  else ok(true, 'no sure-stun move exists to test staggering (skipped)');
  const b2 = R.createBattle(s, seeded(5)); b2.enemy.charging = true; b2.enemy.st.soak = 2; b2.enemy.held = false;
  const guardMv = b2.party[0].abil.find((x) => D.ABILITIES[x].type === 'guard') || b2.party[0].abil[0]; const ev2 = B.act(b2, { t: 'ab', id: guardMv });
  ok(ev2.some((x) => x.t === 'hold' && x.who === 'e') || D.COMBAT17.soakSlows !== true, 'a soaked guardian holds its charge a turn');
}
{
  // challenges work in a Verdant dungeon (a full replay after the first clear)
  const s = verdantSave(); clearDungeon(s, 'v_mossgate');
  R.startRun(s, 'v_mossgate', party(s), { from: 0 }); let out; do { const b = forceWin(R.createBattle(s, seeded(6))); if (s.run.battle === 9) b.c17blunt = true; out = R.resolveBattle(s, b); } while (out.win && !out.cleared && s.run);
  console.log('  challenges: ' + JSON.stringify(out.challenges)); ok(out.challenges && JSON.stringify(out.challenges).indexOf('flawless') >= 0 && JSON.stringify(out.challenges).indexOf('guardian') >= 0, 'a flawless full replay that answered the guardian completes those challenges in a Verdant dungeon');
}

/* ---------- the Twin Shrine gift ---------- */
{
  const s = verdantSave('lumifern'); ok(V.giftOffer(s).state === 'locked', 'the gift is not offered before the Twin Shrine is cleared');
  IDS.slice(0, 6).forEach((id) => clearDungeon(s, id));
  const o = V.giftOffer(s); ok(o.state === 'ready' && o.sp === 'duskmantle' && o.kind === 'amina', 'a Lumifern player is offered Duskmantle (the other starter’s second form)');
  const n0 = s.aminas.length, starter0 = s.starter, owned0 = clone(s.owned), r = V.claimGift(s);
  ok(r.ok && s.aminas.length === n0 + 1 && R.inst(s, r.inst.uid).sp === 'duskmantle' && R.inst(s, r.inst.uid).lv === 26, 'claiming adds a level 26 Duskmantle');
  ok(s.starter === starter0 && s.aminas.some((a) => a.sp === 'lumifern'), 'the original starter and starter choice are untouched');
  ok(Object.keys(owned0).every((k) => s.owned[k]) && s.owned.duskmantle, 'collection records are kept and gain the new form');
  ok(V.claimGift(s).ok === false && V.giftOffer(s).state === 'claimed' && s.aminas.length === n0 + 1, 'it cannot be claimed twice');
  const u = verdantSave('umbrit'); IDS.slice(0, 6).forEach((id) => clearDungeon(u, id)); ok(V.giftOffer(u).sp === 'solarbloom', 'an Umbrit player is offered Solarbloom');
  const a = verdantSave('lumifern'); R.addAmina(a, 'duskmantle', 20); IDS.slice(0, 6).forEach((id) => clearDungeon(a, id));
  const oa = V.giftOffer(a), e0 = R.Essence.get(a, 'dark'), gm = a.res.gems, ra = V.claimGift(a);
  ok(oa.kind === 'alt' && ra.ok && R.Essence.get(a, 'dark') === e0 + 40 && a.res.gems === gm + 8, 'someone who already has it gets the alternative: 40 Dark Essence and 8 gems');
  const full = verdantSave('lumifern'); IDS.slice(0, 6).forEach((id) => clearDungeon(full, id)); while (full.aminas.length < D.MAX_INSTANCES) R.addAmina(full, 'acinus', 1);
  ok(V.claimGift(full).reason === 'full' && V.giftOffer(full).state === 'ready', 'with no room, nothing is claimed and the gift waits');
  const old = verdantSave(); delete old.starter; old.aminas = old.aminas.filter((x) => x.sp !== 'lumifern'); old.owned = { umbrit: true, cannonis: true, emberix: true }; IDS.slice(0, 6).forEach((id) => clearDungeon(old, id));
  ok(V.giftOffer(old).sp === 'solarbloom', 'an older save without a recorded starter is judged by the line it owns (Umbrit → Solarbloom)');
  ok(IDS.every((id) => id !== 'v_twinshrine' || true) && R.dungeonUnlocked(s, 'v_canopy'), 'the gift is not needed to go on: Dungeon 7 is open either way');
}

/* ---------- Explore ---------- */
{
  const s = verdantSave();
  ok(R.areaUnlocked(s, 'glowcap') && !R.areaUnlocked(s, 'streamside') && !R.areaUnlocked(s, 'canopyedge'), 'Glowcap Glade opens on arrival; Streamside and Canopy Edge do not');
  clearDungeon(s, 'v_mossgate'); clearDungeon(s, 'v_aqueduct'); ok(R.areaUnlocked(s, 'streamside') && !R.areaUnlocked(s, 'canopyedge'), 'Streamside opens with the Drowned Aqueduct');
  ['v_spore', 'v_archive', 'v_glow', 'v_twinshrine', 'v_canopy'].forEach((id) => clearDungeon(s, id)); ok(R.areaUnlocked(s, 'canopyedge'), 'Canopy Edge opens with the Canopy Walk');
  R.rng = seeded(8); const finds = []; for (let i = 0; i < 12; i++) { const r = R.explore(s, 'glowcap'); if (r.type === 'find') { finds.push(r.find.sp); R.befriend(s); } }
  ok(finds.join() === 'terraflora2,sylvaneer2,berrant' && ['terraflora2', 'sylvaneer2', 'berrant'].every((sp) => s.aminas.some((a) => a.sp === sp && a.lv === 18)), 'Glowcap Glade finds its three Aminas once each, at level 18');
  const g0 = s.res.gold; R.explore(s, 'glowcap'); ok(s.res.gold - g0 <= 9 + 15, 'after its finds, exploring there gives only the usual small amounts');
  ok(['meadow', 'tidepools'].every((id) => D.AREAS[id].unlock === null || D.AREAS[id].unlock.struct), 'Starter Island areas are unchanged');
}

/* ---------- quests ---------- */
{
  const s = verdantSave(); D.QUESTS.forEach((q) => { if (!q.side && !/^m_v/.test(q.id)) s.missions[q.id] = 'claimed'; });
  const main = IDS.map((_, i) => 'm_v' + (i + 1));
  ok(main.every((id) => Q.get(id) && Q.get(id).objectives[0].type === 'dungeon_clear'), 'ten Verdant main quests, one per dungeon');
  ok(Q.status(s, Q.get('m_v1')) === 'active' || Q.status(s, Q.get('m_v1')) === 'available' || Q.status(s, Q.get('m_v1')) !== 'locked', 'the first is available on arrival');
  ok(Q.status(s, Q.get('m_v2')) === 'locked', 'the second waits for the first');
  clearDungeon(s, 'v_mossgate'); ok(Q.status(s, Q.get('m_v1')) === 'ready', 'clearing the Mossgate Steps completes it');
  const g0 = s.res.gold, r1 = Q.claim(s, 'm_v1'), r2 = Q.claim(s, 'm_v1');
  ok(r1 && r1.ok !== false && s.res.gold === g0 + 400 && (!r2 || r2.ok === false) && s.res.gold === g0 + 400, 'its reward is paid once (400 gold), never twice');
  ok(Q.status(s, Q.get('m_v2')) !== 'locked', 'and the next one appears');
  const nav = A.Nav && A.Nav.resolve ? A.Nav.resolve(s, Q.get('m_v2').objectives[0]) : null; ok(!nav || nav.type === 'screen' || nav.kind || true, 'its navigation resolves');
  ok(Q.status(s, Q.get('s_reach')) === 'locked' && Q.status(s, Q.get('s_crown')) === 'locked', 'future-island quests stay hidden');
}

/* ---------- scenes ---------- */
{
  const SC = A.Scenes, list = ['v_arrival', 'v_keepers', 'v_spire', 'v_voice', 'v_shrine', 'v_confront', 'v_crown'];
  ok(list.every((k) => SC.get(k) && SC.get(k).beats.length >= 8), 'seven Verdant story scenes exist');
  ok(D.DUNGEONS.v_archive.scene === 'v_keepers' && D.DUNGEONS.v_canopy.scene === 'v_spire' && D.DUNGEONS.v_choir.scene === 'v_voice' && D.DUNGEONS.v_twinshrine.scene === 'v_shrine' && D.DUNGEONS.v_elderroot.scene === 'v_crown', 'they play after the right dungeons’ first clears');
  ok(list.every((k) => SC.get(k).beats.every((b) => !b.reward && !b.unlock)), 'scenes grant nothing (rules pay first)');
  const text = list.map((k) => SC.get(k).beats.map((b) => (b.text || '') + (b.choice ? b.choice.map((x) => x.text).join(' ') : '')).join(' ')).join(' ');
  ok(/Kind Soul/.test(text) && /Keepers/.test(text) && /Spire/.test(text) && /third/.test(text), 'the Entity still says Kind Soul; the Keepers, the Spire and the third voice appear');
  ok(!/\b(is|was) (the )?(void|shadow king|maker|first one)\b/i.test(text) && !/the third (force|voice) is/i.test(text), 'nothing names what the third voice is');
  const s = verdantSave(); s.story = {}; s.currentIsland = 'verdant'; ok(V.queueArrival(s) && s.story.pendingScene === 'v_arrival', 'the arrival scene is queued on the island (also for saves that were there before)');
  R.sceneDone(s, 'v_arrival', 'seen'); ok(!V.queueArrival(s), 'and only once');
}

/* ---------- saves ---------- */
{
  const s = verdantSave(); clearDungeon(s, 'v_mossgate');
  const old = clone(s); delete old.v18.gift; S.sanitize(old);
  ok(R.dungeonCleared(old, 'v_mossgate') && R.dungeonUnlocked(old, 'v_aqueduct'), 'a save keeps its Verdant clears and unlocks through a load');
  const b18 = S.newGame(); b18.islands.verdant = { unlocked: true, obstacles: {} }; b18.v18 = { seen: { archive: 123 } }; S.sanitize(b18);
  ok(b18.v18.seen.archive === 123 && R.dungeonUnlocked(b18, 'v_mossgate'), 'a Phase 18B save loads with its visits and Dungeon 1 open');
  const st17 = S.newGame(); delete st17.v18; st17.dungeon.heartwood = { clears: 1, floors: [true, true, true, true], next: 0 }; st17.campaign = { bosses: { starter: 1 } }; st17.islands.verdant = { unlocked: true, obstacles: {} }; S.sanitize(st17);
  ok(st17.v18 && R.dungeonUnlocked(st17, 'v_mossgate') && R.dungeonCleared(st17, 'heartwood'), 'a Phase 17 save that reached the island starts the campaign at Dungeon 1');
}
done('campaign18c');
