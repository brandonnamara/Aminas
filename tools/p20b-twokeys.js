// Phase 20B: The Two Keys, a development-only prototype on the real battle engine (src/rules.js). NOT part of the game:
// nothing here is loaded by index.html, no dungeon or campaign data is added, and no reward is granted. It answers the
// Phase 20B question "can the existing multi-opponent framework run the approved final boss?" and measures it.
// The encounter: the door's defence takes the shapes of the two Keepers. Stage 1 is a pale Keeper in Lumifern III's
// shape, stage 2 a dark Keeper in Umbrit III's shape (defensive manifestations, not the starters themselves), in one
// continuous battle: the second steps in when the first falls, and the player's team carries its health, statuses and
// cooldowns across. Each has its own charged move and a barrier at half health; the second arrives ready to charge.
// Usage: node tools/p20b-twokeys.js [outJson]   (as a library: require('./tools/p20b-twokeys.js'))
'use strict';
const { load, seeded } = require('../tests/harness');

// prototype-only moves (existing effects only: burn, never-resisted damage); added to a sandbox copy of the game data
const MOVES = {
  keepersdawn: { name: 'Keeper’s Dawn', el: 'light', type: 'dmg', power: 84, cd: 0, boss: true, fx: { k: 'burn', p: 1, n: 2 }, tell: 'The pale Keeper lifts its light. Keeper’s Dawn is coming!', desc: 'A charged light blow that burns. Guard it; a heal clears the burn.' },
  closingdoor: { name: 'The Closing Door', el: 'resonance', type: 'dmg', power: 90, cd: 0, boss: true, neutral: true, tell: 'The door begins to swing. The Closing Door is coming!', desc: 'Never resisted. Guard it.' },
  // the Phase 20A stand-in (one Aimza III, two barriers, double health) for comparison
  standin: { name: 'The Closing Door', el: 'resonance', type: 'dmg', power: 90, cd: 0, boss: true, neutral: true, tell: 'The door begins to swing. The Closing Door is coming!' },
};
const TIER = { hp: 1.3, atk: 1.18 }; // Obsidian's foe tier, approved for the Crown
const STAGES = (hpMult) => [
  { sp: 'aurelith', lv: 60, title: 'The Pale Key', hpMult, tier: TIER, boss: true, islandBoss: true, move: 'keepersdawn', mech: { type: 'barrier', at: [0.5], amt: 0.2 }, scale: 1.45 },
  { sp: 'eclipsar', lv: 60, title: 'The Dark Key', hpMult, tier: TIER, boss: true, islandBoss: true, move: 'closingdoor', mech: { type: 'barrier', at: [0.5], amt: 0.2 }, scale: 1.45, enters: 'charging' },
];
const STANDIN = { sp: 'aimza3', lv: 60, title: 'The Unanswered Door', hpMult: 2.0, tier: TIER, boss: true, islandBoss: true, move: 'standin', mech: { type: 'barrier', at: [0.66, 0.33], amt: 0.2 }, scale: 1.45 };

function sandbox() { const ctx = load(), A = ctx.A, D = A.Data; Object.keys(MOVES).forEach((k) => { D.ABILITIES[k] = Object.assign({}, MOVES[k]); }); return A; }
// what Phase 20C would add to R.createBattle: a battle spec with stages becomes one battle with several foes
function foesFor(A, spec) {
  const R = A.Rules;
  if (!spec.stages) return R.enemyFromSpec(spec);
  return spec.stages.map((s) => { const e = R.enemyFromSpec(s); if (s.enters === 'charging') e.chargeIn = 0; return e; });
}
function party(A, team, lv) { const B = A.Rules.Battle; return team.map((sp) => { const f = B.fighter(sp, lv, {}); f.uid = sp; return f; }); }
// one battle with a policy ('auto': the game's own auto-battle; 'basic': first move only; 'noguard': never guards)
function fight(A, team, lv, spec, seed, policy) {
  const B = A.Rules.Battle, rng = seeded(seed), D = A.Data;
  const b = B.create(party(A, team, lv), foesFor(A, spec), { rng }), team0 = b.party.slice();
  const log = []; let turns = 0, guardedCharges = 0, charges = 0;
  while (!b.over && turns < 400) {
    let a = B.autoAction(b);
    if (policy === 'basic' && a.t === 'ab') a = { t: 'ab', id: B.cur(b).abil[0] };
    if (policy === 'noguard' && a.t === 'ab' && D.ABILITIES[a.id].type === 'guard') a = { t: 'ab', id: B.cur(b).abil[0] };
    const ev = B.act(b, a); turns++;
    ev.forEach((e) => { if (e.t === 'charge') charges++; if (e.t === 'hit' && e.big && e.guarded) guardedCharges++; if (['charge', 'barrier', 'barrierTell', 'faint', 'foeIn', 'end', 'switch'].indexOf(e.t) >= 0) log.push(Object.assign({ turn: b.turn }, e, e.t === 'foeIn' ? { party: b.party.map((p) => [p.hp, p.hpMax]), shield: b.enemy.shield || 0, same: b.party.every((p, i) => p === team0[i]) } : {})); });
  }
  return { b, win: b.result === 'win', turns, log, charges, guardedCharges, partyHp: b.party.map((p) => [p.sp, p.hp, p.hpMax]) };
}
const TEAMS = { light: ['lumi3', 'aimza3', 'zeep3'], dark: ['voltar3', 'aimza3', 'rockraki'], mixed: ['aurelith', 'eclipsar', 'stormbringer'], water: ['oceanfang', 'calyxar', 'pyrophoenix'] };

function sweep(A, spec, levels, policies, seeds) {
  const out = {};
  Object.keys(TEAMS).forEach((t) => levels.forEach((lv) => policies.forEach((p) => {
    let w = 0, tt = 0; for (let s = 1; s <= seeds; s++) { const r = fight(A, TEAMS[t], lv, spec, s * 7919 + lv, p); if (r.win) w++; tt += r.turns; }
    out[t + '|' + lv + '|' + p] = { win: +(w / seeds).toFixed(2), turns: +(tt / seeds).toFixed(1) };
  })));
  return out;
}

// The reward and save path, end to end, inside the sandbox only: the Forge Heart's battle slot (the last battle of the
// Heart of the Forge) is given The Two Keys, and R.createBattle builds a foe list from a staged spec (the change Phase 20C
// would make). The real resolveBattle, first-clear rewards, Island Boss flag and save hydration then run unchanged.
function hostDungeon(A) {
  const D = A.Data, R = A.Rules, B = R.Battle, d = D.DUNGEONS.o_forge, last = d.battles.length - 1;
  d.battles[last] = Object.assign({}, d.battles[last], { sp: 'aurelith', lv: 60, title: 'The Two Keys', hpMult: 1, stages: STAGES(1.0), move: undefined, mech: undefined });
  R.createBattle = function (st, rng) { const run = st.run, enc = R.encounter(st); const party = run.uids.map((u) => R.partyFighter(st, R.inst(st, u), { hp: run.hp[u] }));
    (enc.spec.stages || [enc.spec]).forEach((x) => { st.seen[x.sp] = true; }); return B.create(party, foesFor(A, enc.spec), { rng }); };
  return { id: 'o_forge', last };
}
function protoSave(A, lv, team) {
  const S = A.State, R = A.Rules, st = S.fresh(); st.phase = 'play'; st.introDone = true;
  ['verdant', 'obsidian'].forEach((k) => { st.islands[k] = { unlocked: true, obstacles: {}, unlockedAt: 1, by: 'boss' }; });
  st.campaign = st.campaign || {}; st.campaign.bosses = Object.assign({}, st.campaign.bosses, { verdant: true });
  A.Data.CAMPAIGN.obsidian.dungeons.forEach((id) => { if (id !== 'o_forge') st.dungeon[id] = { clears: 1 }; });
  st.dungeon.o_forge = { clears: 0, next: 9 };
  const uids = team.map((sp) => R.addAmina(st, sp, lv).uid); return { st, uids };
}
function playBoss(A, st, uids, seed) {
  const R = A.Rules, B = R.Battle, r = R.startRun(st, 'o_forge', uids, { from: 9 }); if (!r.ok) return { ok: false, r };
  const b = R.createBattle(st, seeded(seed)); const stages = []; let n = 0;
  while (!b.over && n++ < 600) { const ev = B.act(b, B.autoAction(b)); ev.forEach((e) => { if (e.t === 'foeIn') stages.push({ name: e.name, hp: e.hp, hpMax: e.hpMax, party: b.party.map((p) => p.hp) }); }); }
  const out = R.resolveBattle(st, b); return { ok: true, b, out, stages };
}
module.exports = { MOVES, STAGES, STANDIN, sandbox, foesFor, fight, TEAMS, sweep, hostDungeon, protoSave, playBoss };

if (require.main === module) {
  const A = sandbox(), fs = require('fs');
  // 1. a traced battle: what the player sees happen
  const tr = fight(A, TEAMS.light, 60, { stages: STAGES(1.15) }, 11, 'auto');
  console.log('Traced battle (team light, level 60, seed 11):', tr.win ? 'win' : 'loss', 'in', tr.turns, 'turns');
  tr.log.forEach((e) => console.log('  turn', e.turn, e.t, e.name || e.abName || e.who || '', e.tell || ''));
  // 2. tuning: health per stage so the whole encounter is about as long and hard as the 20A stand-in
  const levels = [55, 57, 60], seeds = +(process.env.SEEDS || 60), res = { standin: sweep(A, STANDIN, levels, ['auto', 'basic'], seeds) };
  [1.0, 1.15, 1.3].forEach((h) => { res['twokeys_' + h] = sweep(A, { stages: STAGES(h) }, levels, ['auto', 'basic'], seeds); });
  const rows = Object.keys(res.standin);
  console.log('\nWin rate / turns (' + seeds + ' seeds each)\n' + ['case'].concat(Object.keys(res)).join('\t'));
  rows.forEach((k) => console.log([k].concat(Object.keys(res).map((v) => res[v][k].win + ' / ' + res[v][k].turns)).join('\t')));
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ trace: tr.log, result: tr.win, turns: tr.turns, sweep: res, stages: STAGES(1.15), standin: STANDIN, moves: MOVES }, null, 1));
}
