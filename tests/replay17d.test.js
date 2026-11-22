// Phase 17D: daily tasks, Codex milestones, dungeon challenges, starter guidance, release re-checks, and the Moon
// Shrine under clock changes, saves and long absences.
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, B = R.Battle;
let T = new Date(2026, 10, 20, 9, 0, 0).getTime(); R.now = () => T; // local 09:00, travel in time
const DAY = 864e5;
const fresh = () => { const st = S.fresh(); st.phase = 'play'; st.introDone = true; st.starter = 'lumifern'; ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true)); st.flags.r1 = st.flags.r2 = true; st.rank = 10; return st; };
const win = (b) => { b.foes.forEach((f) => (f.hp = 0)); b.enemy.hp = 0; b.over = true; b.result = 'win'; return b; };
const clear = (st, id) => { st.dungeon[id] = { clears: 1, floors: D.DUNGEONS[id].sections.map(() => true), next: 0 }; };
const reload = (st) => S.hydrate(JSON.parse(JSON.stringify(st))).st;
const emit = (n, k) => { for (let i = 0; i < (k || 1); i++) R.emit(n, {}); };

/* ======================================================= daily tasks */
let st = fresh(); A.State.state = st; R.addAmina(st, 'lumifern', 6);
ok(R.Daily.list(st) === null && R.Daily.ready(st) === 0, 'no daily tasks before the Forgotten Road is cleared (the opening stays uncluttered)');
clear(st, 'forgottenroad');
let L = R.Daily.list(st); const keys = L.today.map((x) => x.k);
ok(L && L.today.length === 3 && new Set(keys).size === 3, 'after it: three different tasks for today (' + keys.join(', ') + ')');
ok(keys.every((k) => R.Daily.available(st, k)) && keys.indexOf('raid') < 0 && keys.indexOf('moveUp') < 0, 'only tasks the player can do: no Island Defence with one Amina, no move upgrade without essence');
const st0 = fresh(); A.State.state = st0; R.addAmina(st0, 'lumifern', 6); clear(st0, 'forgottenroad'); st0.struct.hatchery = false;
const pool0 = D.DAILY17.order.filter((k) => R.Daily.available(st0, k)); ok(pool0.indexOf('hatch') < 0 && pool0.indexOf('collect') < 0, 'no Hatchery and no producing building: no hatching or collecting tasks (' + pool0.join(', ') + ')');
A.State.state = st;
ok(JSON.stringify(reload(st).d17.daily.tasks.map((x) => x.k)) === JSON.stringify(keys) && JSON.stringify(R.Daily.list(st).today.map((x) => x.k)) === JSON.stringify(keys), 'the same three after saving, reloading or reopening the same day');
// progress comes from real events; claims pay once
const t0 = L.today[0], ev0 = { battles: 'battleWon', feed: 'fed', collect: 'collected', moveUp: 'moveUp', hatch: 'hatched', raid: 'raidWon', explore: 'explored' };
ok(!R.Daily.claim(st, t0.id).ok, 'an unfinished task cannot be claimed');
emit(ev0[t0.k], t0.need - 1); ok(R.Daily.list(st).today[0].cur === t0.need - 1 && !R.Daily.list(st).today[0].ready, 'progress counts from today’s set (' + (t0.need - 1) + '/' + t0.need + ')');
emit(ev0[t0.k]); let g0 = st.res.gold, rr = R.Daily.claim(st, t0.id);
ok(rr.ok && st.res.gold - g0 === D.DAILY17.tasks[t0.k].reward.gold, 'finished: it pays ' + JSON.stringify(rr.reward));
g0 = st.res.gold; ok(!R.Daily.claim(st, t0.id).ok && st.res.gold === g0 && R.Daily.claim(st, t0.id).reason === 'claimed', 'claiming again pays nothing');
const st2 = reload(st); A.State.state = st2; ok(!R.Daily.claim(st2, t0.id).ok, 'and still nothing after a reload (the claim is saved)');
A.State.state = st;
ok(!R.Daily.claim(st, L.day + ':bonus').ok, 'the all-three extra waits for all three claims');
// finish the second, leave the third unfinished, then a new day
const t1 = L.today[1], t2 = L.today[2]; emit(ev0[t1.k], t1.need);
T += DAY; L = R.Daily.list(st);
ok(L.day === R.dayNum(T) && L.today.length === 3 && L.today.every((x) => x.cur === 0), 'a new day brings three new tasks, starting from zero');
ok(L.carry.length === 1 && L.carry[0].k === t1.k && L.carry[0].ready, 'yesterday’s finished-but-unclaimed task is still claimable (nothing finished is lost)');
ok(!L.carry.some((x) => x.k === t2.k && x.day === t2.day && !x.ready), 'an unfinished one simply lapses; there is no streak to lose');
g0 = st.res.gold; rr = R.Daily.claim(st, L.carry[0].id); ok(rr.ok && st.res.gold > g0 && R.Daily.list(st).carry.length === 0 && !R.Daily.claim(st, L.carry[0].id).ok, 'it pays once from the earlier day, then is gone');
// clock turned back: no new set, no re-claim
const dayNow = R.Daily.list(st).day; T -= 3 * DAY; L = R.Daily.list(st);
ok(L.day === dayNow && !R.Daily.claim(st, t0.id).ok, 'the clock turned back three days: today’s tasks stay, nothing earlier can be claimed again');
T += 3 * DAY;
// skip a week: nothing is punished
T += 7 * DAY; L = R.Daily.list(st); ok(L.today.length === 3 && L.carry.length === 0 && st.res.gold >= g0, 'away a week: just a fresh set, nothing taken away');
// all three + bonus
L.today.forEach((x) => emit(ev0[x.k], x.need)); L.today.forEach((x) => R.Daily.claim(st, x.id)); let gm = st.res.gems; rr = R.Daily.claim(st, L.day + ':bonus');
ok(rr.ok && st.res.gems - gm === 2 && !R.Daily.claim(st, L.day + ':bonus').ok, 'all three claimed: +2 gems, once');
// a day's total stays modest
const most = D.DAILY17.order.map((k) => D.DAILY17.tasks[k].reward.gold || 0).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0);
ok(most <= 300 && D.DAILY17.bonus.gems === 2 && !D.DAILY17.order.some((k) => D.DAILY17.tasks[k].reward.gems), 'a day pays at most ' + most + ' gold, some food and 2 gems (no gems from single tasks)');
// availability as the save grows
R.addAmina(st, 'acinus', 6); R.addAmina(st, 'kairyu', 6); ok(R.Daily.available(st, 'raid'), 'with three Aminas, Island Defence tasks can appear');
R.Essence.gain(st, 'light', 30); ok(R.Daily.available(st, 'moveUp'), 'with essence for an upgrade, move tasks can appear');
// Island Defence wins are counted
const c0 = st.d17.c.raid | 0; R.emit('raidWon', {}); ok((st.d17.c.raid | 0) === c0 + 1, 'an Island Defence raid win counts');

/* ======================================================= Codex milestones */
st = fresh(); A.State.state = st;
const cn = R.Codex.counts(st); ok(cn.total === D.ROSTER.length && cn.total === 63 && cn.linesTotal === 21 && cn.evolvedTotal === 42, 'every one of the 63 species can be obtained today: 42 evolved forms, 21 evolution lines');
ok(R.Codex.list(st).every((m) => !m.ready) && R.Codex.ready(st) === 0, 'a new save has nothing to claim');
['lumifern', 'acinus', 'kairyu', 'cannonis', 'gaiaroki'].forEach((sp) => R.addAmina(st, sp, 5));
let M = R.Codex.list(st); ok(M.find((m) => m.id === 'sp5').ready && !M.find((m) => m.id === 'sp10').ready, 'five species befriended: the first milestone is ready, the next is not');
gm = st.res.gems; rr = R.Codex.claim(st, 'sp5'); ok(rr.ok && st.res.gems - gm === 1 && !R.Codex.claim(st, 'sp5').ok && !R.Codex.claim(reload(st), 'sp5').ok, 'it pays once (also after a reload)');
ok(!R.Codex.claim(st, 'sp10').ok && R.Codex.claim(st, 'sp10').reason === 'notyet', 'one not reached cannot be claimed');
// release a duplicate: history stays
const d1 = R.addAmina(st, 'acinus', 5); st.active = st.aminas[0].uid; const before = R.Codex.counts(st).species;
ok(R.Release.release(st, d1.uid, true).ok && R.Codex.counts(st).species === before && st.owned.acinus, 'releasing a duplicate leaves the Codex and its counts as they were');
// a fully grown line
['solarbloom', 'aurelith'].forEach((sp) => R.addAmina(st, sp, 25)); M = R.Codex.list(st);
ok(M.find((m) => m.id === 'ln1').ready && M.find((m) => m.id === 'ev1').ready && R.Codex.counts(st).lines === 1, 'all three Lumifern forms: a complete line and an evolved form');
// an existing save that already has a big Codex can claim what it earned
const big = fresh(); D.ROSTER.slice(0, 40).forEach((x) => (big.owned[x.id] = true)); M = R.Codex.list(big);
ok(['sp5', 'sp10', 'sp25', 'sp50'].every((id) => M.find((m) => m.id === id).ready) && !M.find((m) => m.id === 'sp75').ready, 'an existing save with 40 species finds 5, 10, 25% and 50% ready (no backdated penalty or double pay)');
const allGems = D.CODEX17.reduce((a, m) => a + (m.reward.gems || 0), 0), allGold = D.CODEX17.reduce((a, m) => a + (m.reward.gold || 0), 0);
ok(allGems <= 80 && allGold <= 7000, 'all fifteen milestones together: ' + allGems + ' gems and ' + allGold + ' gold, once');
// an unavailable species is never required
D.SPECIES.ghost17 = { id: 'ghost17', name: 'Test', el: 'light', line: 'ghost17', stage: 1, src: [{ t: 'area', area: 'nowhere' }] }; D.ROSTER.push(D.SPECIES.ghost17);
ok(!R.obtainable('ghost17') && R.Codex.counts(big).total === 63, 'a species that cannot be obtained (test entry) is not counted towards milestones');
D.ROSTER.pop(); delete D.SPECIES.ghost17;

/* ======================================================= dungeon challenges */
function fullRun(st, id, uids, opts) {
  opts = opts || {}; const r = R.startRun(st, id, uids, { from: opts.from || 0 }); if (!r.ok) return null; let out;
  do { const b = R.createBattle(st, seeded(5)); win(b); if (opts.faint && st.run.battle === 3) b.party[0].hp = 0; if (opts.blunt && st.run.battle === 9) b.c17blunt = true; out = R.resolveBattle(st, b); } while (st.run && out.win);
  return out;
}
st = fresh(); A.State.state = st; clear(st, 'forgottenroad'); const k1 = R.addAmina(st, 'acinus', 12), k2 = R.addAmina(st, 'terraflora', 12), k3 = R.addAmina(st, 'sylvaneer', 12), mx = R.addAmina(st, 'kairyu', 12);
let o = fullRun(st, 'gatheringhall', [k1.uid, k2.uid, k3.uid]);
ok(o.cleared && o.first && !o.challenges, 'a first clear never counts for challenges (first clears stay as they were)');
const g1 = st.res.gold; o = fullRun(st, 'gatheringhall', [k1.uid, k2.uid, mx.uid], { faint: true });
ok(o.cleared && o.challenges && !o.challenges.met.flawless && !o.challenges.met.kindred && !o.challenges.met.guardian && o.challenges.fresh.length === 0, 'a replay where one fainted, mixed elements, no answer to the guardian: nothing');
ok(JSON.stringify(o.reward) === JSON.stringify(D.DUNGEONS.gatheringhall.repeat), 'the normal replay reward is unchanged (' + JSON.stringify(o.reward) + ')');
let rwEss = 0; const eg0 = R.Essence.gain; R.Essence.gain = function (s_, el, n, src) { if (src === 'reward') rwEss += n; return eg0.apply(this, arguments); };
o = fullRun(st, 'gatheringhall', [k1.uid, k2.uid, k3.uid]);
ok(o.challenges.met.flawless && o.challenges.met.kindred && !o.challenges.met.guardian && o.challenges.fresh.join() === 'flawless,kindred' && rwEss === 12, 'no faints, three Nature Aminas: Flawless and One element, 2 × 6 Dark Essence');
rwEss = 0; o = fullRun(st, 'gatheringhall', [k1.uid, k2.uid, k3.uid]); ok(o.challenges.fresh.length === 0 && rwEss === 0, 'repeating them pays nothing more'); R.Essence.gain = eg0;
gm = st.res.gems; o = fullRun(st, 'gatheringhall', [k1.uid, k2.uid, mx.uid], { blunt: true });
ok(o.challenges.fresh.join() === 'guardian' && o.challenges.all && st.res.gems - gm === 2 + (D.DUNGEONS.gatheringhall.repeat.gems || 0), 'answering the guardian completes all three: +2 gems, once');
const cs = R.Challenge.status(st, 'gatheringhall'); ok(cs.all && cs.list.every((x) => x.done), 'the dungeon card shows all three done');
o = fullRun(st, 'gatheringhall', [k1.uid, k2.uid, k3.uid], { from: 9 }); ok(o.partial && !o.challenges, '“Fight the boss again” (a partial replay) never counts');
ok(R.Challenge.desc('forgottenroad', 'guardian').indexOf('barrier') >= 0 && R.Challenge.desc('coldkiln', 'guardian').indexOf('charged move') >= 0, 'the guardian challenge matches the guardian (a barrier on the Forgotten Road, a charged move elsewhere)');
// the guardian detection, in a real battle: guard the charged move
st = fresh(); A.State.state = st; clear(st, 'gatheringhall'); const gd = R.addAmina(st, 'acinus', 9); R.startRun(st, 'gatheringhall', [gd.uid], { from: 9 });
let bb = R.createBattle(st, seeded(2)); bb.enemy.charging = true; bb.enemy.st = {}; const pf = B.cur(bb); pf.abil.forEach((x) => (pf.cd[x] = 0)); const gid = pf.abil.find((x) => D.ABILITIES[x].type === 'guard');
pf.guard = true; B.act(bb, { t: 'ab', id: pf.abil[0] }); ok(!!gid && bb.c17blunt === true, 'a guard raised the turn before the guardian unleashes its charged move is recognised in a real battle');
bb = R.createBattle(st, seeded(2)); B.act(bb, { t: 'ab', id: pf.abil[0] }); ok(!bb.c17blunt, 'an ordinary exchange is not');
// a run from before this update is not judged
st = fresh(); A.State.state = st; clear(st, 'gatheringhall'); const lg = [R.addAmina(st, 'acinus', 12), R.addAmina(st, 'terraflora', 12), R.addAmina(st, 'sylvaneer', 12)].map((x) => x.uid);
R.startRun(st, 'gatheringhall', lg, { from: 0 }); delete st.run.c17; let oo; do { oo = R.resolveBattle(st, win(R.createBattle(st, seeded(1)))); } while (st.run);
ok(oo.cleared && !oo.challenges, 'a run already under way before the update is never judged (no guesswork)');

/* ======================================================= starter guidance */
st = fresh(); const solo = R.addAmina(st, 'lumifern', 6);
let adv = R.partyAdvice(st, 'reliquary', [solo.uid]); ok(adv && adv.k === 'recruit' && adv.hard && /Explore/.test(adv.t), 'one Amina before the Reliquary: advice to recruit, pointing at Explore');
ok(R.partyAdvice(st, 'forgottenroad', [solo.uid]).k === 'recruit', 'also on the first dungeon (gently)');
const s2 = R.addAmina(st, 'acinus', 3); adv = R.partyAdvice(st, 'reliquary', [solo.uid]); ok(adv.k === 'room' && /up to three/.test(adv.t), 'owning more but bringing one: a reminder that three can come');
const s3 = R.addAmina(st, 'gaiaroki', 3); ok(R.partyAdvice(st, 'reliquary', [solo.uid, s2.uid, s3.uid]) === null, 'a full party: no advice');
ok(R.startRun(st, 'forgottenroad', [solo.uid]).ok, 'advice never blocks: a lone Amina can still go in');

/* ======================================================= release re-checks */
st = fresh(); A.State.state = st; const keep = R.addAmina(st, 'lumi', 5); st.active = keep.uid; const r1 = R.addAmina(st, 'acinus', 8), r2 = R.addAmina(st, 'acinus', 6);
const sheet = R.Release.check(st, r2.uid), shown = { lv: sheet.inst.lv, total: JSON.parse(JSON.stringify(sheet.gives.total)) }; ok(sheet.ok, 'the sheet opens for a duplicate');
const it = R.grantItem(st, D.DUNGEON_GEAR.forgottenroad, 'test'); R.equip(st, r2.uid, it.iid);
ok(!R.Release.release(st, r2.uid, true, shown).ok && R.Release.release(st, r2.uid, true, shown).reason === 'gear' && R.inst(st, r2.uid), 'equipped after the sheet opened: refused, the Amina stays');
R.unequip ? R.unequip(st, r2.uid, D.ITEMS[it.id].slot) : (r2.gear = {}); r2.gear = {};
R.Release.setFav(st, r2.uid, true); ok(R.Release.release(st, r2.uid, true, shown).reason === 'fav', 'made a favourite after: refused'); R.Release.setFav(st, r2.uid, false);
R.PvP.setTeam(st, 'defence', [r2.uid, r1.uid, keep.uid]); ok(R.Release.release(st, r2.uid, true, shown).reason === 'team', 'put in the defence team after: refused'); st.defence.defence = [];
R.startRun(st, 'forgottenroad', [r2.uid]); ok(R.Release.release(st, r2.uid, true, shown).reason === 'busy', 'sent into a dungeon after: refused'); R.abandonRun(st);
st.active = r2.uid; ok(R.Release.release(st, r2.uid, true, shown).reason === 'companion', 'made the companion after: refused'); st.active = keep.uid;
R.Release.release(st, r1.uid, true); ok(R.Release.release(st, r2.uid, true, shown).reason === 'last', 'its twin released first: now the last of its kind, refused');
const r3 = R.addAmina(st, 'acinus', 6); const sh3 = R.Release.check(st, r3.uid), shown3 = { lv: sh3.inst.lv, total: JSON.parse(JSON.stringify(sh3.gives.total)) };
R.addXp(st, r3, 5000); ok(R.Release.release(st, r3.uid, true, shown3).reason === 'changed' && R.inst(st, r3.uid), 'levelled up after the sheet opened: refused as changed (what it would give is no longer what was shown)');
const sh4 = R.Release.check(st, r3.uid); ok(R.Release.release(st, r3.uid, true, { lv: sh4.inst.lv, total: sh4.gives.total }).ok, 'a fresh sheet then works');

/* ======================================================= Moon Shrine reliability */
function shrine(lv) { const s = fresh(); A.State.state = s; s.buildings.moonshrine = { id: 'moonshrine', type: 'moonshrine', level: lv || 4, residents: [], state: 'built', stock: 0, last: T, island: 'starter', x: 0, y: 0 }; R.addAmina(s, 'lumifern', 5); W.assign(s, 'moonshrine', R.addAmina(s, 'lumi', 30).uid); s.buildings.moonshrine.last = T; return s; }
const sb = (s) => s.buildings.moonshrine;
T = new Date(2026, 10, 20, 9, 0, 0).getTime(); st = shrine();
T += 6 * 3600e3; W.tickProduction(st, T); ok(W.stock(st, 'moonshrine') === 18, 'six hours: the day’s 18 gems, no more');
let gb = st.res.gems; W.collect(st, 'moonshrine'); W.collect(st, 'moonshrine'); W.collect(st, 'moonshrine'); ok(st.res.gems - gb === 18, 'collecting three times in a row pays 18 once');
const rl = reload(st); ok(rl.buildings.moonshrine.moon && rl.buildings.moonshrine.moon.made === 18, 'save and reload keep today’s moonlight count');
A.State.state = rl; T += 3600e3; W.tickProduction(rl, T); ok(W.stock(rl, 'moonshrine') === 0, 'so reloading the same day cannot restart it');
// clock forward three days, collect, clock back: nothing extra until real time catches up
A.State.state = st; const realT = T; T += 3 * DAY; W.tickProduction(st, T); gb = st.res.gems; W.collect(st, 'moonshrine'); const fwd = st.res.gems - gb;
ok(fwd === 3 * 18, 'clock three days ahead: three days of moonlight (' + fwd + '), as if the days had passed');
T = realT + 3600e3; W.tickProduction(st, T); ok(W.stock(st, 'moonshrine') === 0 && sb(st).last > T, 'clock set back: the shrine waits, nothing new');
for (let h = 0; h < 72; h += 6) { T = realT + h * 3600e3; W.tickProduction(st, T); } gb = st.res.gems; W.collect(st, 'moonshrine');
ok(st.res.gems - gb === 0, 'and as real time passes those three days again, it pays nothing twice');
T = realT + 4 * DAY; W.tickProduction(st, T); ok(W.stock(st, 'moonshrine') === 18, 'once real time passes where the clock had been, it makes the next day’s 18 as normal');
// day key going backwards (time zone change) never resets the count
st = shrine(); T = new Date(2026, 10, 22, 9, 0, 0).getTime(); sb(st).last = T; sb(st).moon = { day: W.dayKey(T + DAY), made: 18 }; T += 3600e3; W.tickProduction(st, T);
ok(W.stock(st, 'moonshrine') === 0, 'a stored day later than the clock’s (a time-zone jump back) does not restart the count');
// a long absence: only what storage holds
st = shrine(); T = new Date(2026, 10, 1, 9, 0, 0).getTime(); sb(st).last = T; sb(st).stock = 0; T += 60 * DAY; W.tickProduction(st, T);
ok(W.stock(st, 'moonshrine') === Math.floor(W.capOf(st, sb(st))) && W.stock(st, 'moonshrine') <= 60 * 18, 'sixty days away: a full store (' + W.stock(st, 'moonshrine') + '), never more');
// legitimate stock is never lost to a clock change
st = shrine(); T = new Date(2026, 10, 10, 9, 0, 0).getTime(); sb(st).last = T; T += 2 * DAY; W.tickProduction(st, T); const held = W.stock(st, 'moonshrine'); T -= 5 * DAY; W.tickProduction(st, T);
ok(held > 0 && W.stock(st, 'moonshrine') === held, 'turning the clock back keeps the gems already made (' + held + ')');
// other buildings are as before
st = shrine(); st.buildings.f1 = { id: 'f1', type: 'farm', level: 1, residents: [], state: 'built', stock: 0, last: T, island: 'starter' }; T += 3600e3; W.tickProduction(st, T); ok(W.stock(st, 'f1') > 0, 'other buildings produce as before');

done('replay17d');
