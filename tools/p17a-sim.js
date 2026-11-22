// Phase 17A gameplay audit: headless simulations on the game's own rules (src/*.js loaded as the tests load them).
// Nothing in the game is changed; every number comes from R.Battle, R.startRun / R.resolveBattle and the data files.
// Run: node tools/p17a-sim.js [outDir]   (default docs/audit17a). Deterministic: seeded random numbers.
const fs = require('fs'), path = require('path');
const { load, seeded } = require('../tests/harness');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit17a'); fs.mkdirSync(OUT, { recursive: true });
const ctx = load(), A = ctx.A, D = A.Data, R = A.Rules, B = R.Battle;
R.emit = () => {}; // silence events (pure simulation)
const ELS = Object.keys(D.ELEMENTS);
const write = (n, o) => fs.writeFileSync(path.join(OUT, n), JSON.stringify(o, null, 1));
const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const SECS_PER_TURN = 4.5; // assumption for completion-time estimates (one exchange with its animations, normal speed)

/* ------------------------------------------------------------------ species helpers */
const lineIds = (line) => D.LINES[line].ids;
const formAt = (line, lv) => { const ids = lineIds(line); return lv >= 22 ? ids[2] : lv >= 12 ? ids[1] : ids[0]; };
const fighter = (line, lv, o) => B.fighter(formAt(line, lv), lv, Object.assign({ mvl: o && o.mvl }, o || {}));

/* ------------------------------------------------------------------ player policies */
// 'basic': only the move with no cooldown. 'special': best-power move ready, never guards or heals.
// 'auto': the game's own B.autoAction (guards a charge, heals under 30%, picks the best-scored attack).
// 'smart': auto + switches to a better elemental match when the active Amina is resisted, and out of a lost cause.
function policy(name) {
  return function (b) {
    if (b.pending) { // pick the replacement: best matchup among the living
      const alive = b.party.map((p, i) => [p, i]).filter(([p]) => p.hp > 0);
      if (name !== 'smart') return { t: 'sw', to: alive[0][1] };
      alive.sort((x, y) => matchScore(y[0], b.enemy) - matchScore(x[0], b.enemy)); return { t: 'sw', to: alive[0][1] };
    }
    const p = B.cur(b), e = b.enemy, legal = B.legal(b).filter((x) => x.ready);
    if (name === 'basic') return { t: 'ab', id: p.abil.find((id) => D.ABILITIES[id].cd === 0 && B.usable(p, id)) || legal[0].id };
    if (name === 'special') {
      const atk = legal.filter((x) => D.ABILITIES[x.id].power > 0).sort((x, y) => D.ABILITIES[y.id].power - D.ABILITIES[x.id].power);
      return { t: 'ab', id: (atk[0] || legal[0]).id };
    }
    if (name === 'smart' && !e.charging) {
      const mine = matchScore(p, e), better = b.party.map((q, i) => [q, i]).filter(([q, i]) => i !== b.pi && q.hp > q.hpMax * 0.45 && matchScore(q, e) > mine * 1.3);
      if (better.length && (mine < 1 || p.hp < p.hpMax * 0.2)) { better.sort((x, y) => matchScore(y[0], e) - matchScore(x[0], e)); return { t: 'sw', to: better[0][1] }; }
    }
    return B.autoAction(b);
  };
}
// how well q fights e: its best attack's multiplier against e, divided by e's best attack against q
function matchScore(q, e) {
  const off = Math.max(...q.abil.map((id) => { const a = D.ABILITIES[id]; return a.power ? (a.neutral ? 1 : R.elMult(a.el, e.el)) : 0; }));
  const def = Math.max(...e.abil.map((id) => { const a = D.ABILITIES[id]; return a.power ? (a.neutral ? 1 : R.elMult(a.el, q.el)) : 0; }), 0.67);
  return off / def;
}
function fight(b, pol, cap) {
  let t = 0; const P = policy(pol); const use = { basic: 0, special: 0, guard: 0, heal: 0, switch: 0 };
  while (!b.over && t < (cap || 200)) {
    const a = P(b);
    if (a.t === 'sw') use.switch++; else { const ab = D.ABILITIES[a.id]; use[ab.type === 'guard' ? 'guard' : ab.type === 'heal' ? 'heal' : ab.cd === 0 ? 'basic' : 'special']++; }
    B.act(b, a); if (!b.pending) t++;
  }
  return { win: b.result === 'win', turns: t, use, timeout: !b.over };
}

/* ================================================================== 1. element matrix */
const matrix = {}; ELS.forEach((a) => { matrix[a] = {}; ELS.forEach((d) => (matrix[a][d] = +R.elMult(a, d).toFixed(2))); });
const elSummary = ELS.map((e) => ({ el: e, strongVs: ELS.filter((d) => R.elMult(e, d) > 1), weakVs: ELS.filter((d) => R.elMult(e, d) < 1), resists: ELS.filter((a) => R.elMult(a, e) < 1), weakTo: ELS.filter((a) => R.elMult(a, e) > 1),
  species: D.ROSTER.filter((s) => s.el === e && s.stage === 1).length }));
write('elements.json', { matrix, summary: elSummary });

/* ================================================================== 2. role / line 1v1 duels (mirror levels) */
// Every base line against every other line, both at the same level and stage, 40 seeds each, the 'auto' policy.
function duelTable(lv, pol, seeds) {
  const lines = Object.keys(D.LINES), res = {};
  lines.forEach((a) => {
    let w = 0, n = 0, turns = [];
    lines.forEach((d) => { if (a === d) return; for (let s = 0; s < seeds; s++) { const rng = seeded(1000 * s + lv); const b = B.create([fighter(a, lv)], fighter(d, lv), { rng }); const r = fight(b, pol); n++; if (r.win) w++; turns.push(r.turns); } });
    res[a] = { el: D.LINES[a].el, role: D.LINES[a].role, legendary: D.LINES[a].legendary, winPct: pct(w, n), turns: +mean(turns).toFixed(1) };
  });
  return res;
}
const duels = { lv5: duelTable(5, 'auto', 40), lv15: duelTable(15, 'auto', 40), lv28: duelTable(28, 'auto', 40) };
write('duels.json', duels);

/* ================================================================== 3. strategies against dungeon battles */
// Representative parties. Each is built at a level; forms follow the evolution levels; moves at level 1, no gear
// unless stated. 'gear' adds a typical tier II set (+9% atk, +11% def, +8% spd).
const TEAMS = {
  starter: { name: 'Starter + meadow finds', lines: ['lumifern', 'acinus', 'gaiaroki'] },
  triangle: { name: 'Elemental Triangle', lines: ['cannonis', 'emberix', 'sylvaneer'] },
  kindredFire: { name: 'Fire trio (Kindred)', lines: ['pyrokai', 'emberix', 'igniflare'] },
  twilight: { name: 'Twilight Pact', lines: ['lumifern', 'umbrit', 'cannonis'] },
  tanks: { name: 'Three tanks', lines: ['cannonis', 'acinus', 'zeep'] },
  swift: { name: 'Three swift', lines: ['emberix', 'kairyu', 'zephyr'] },
  legend: { name: 'Legendary metal', lines: ['meta', 'atem', 'cannonis'] },
};
const GEAR2 = { atk: 0.09, def: 0.11, spd: 0.08, hp: 0 };
function party(team, lv, o) {
  o = o || {};
  return TEAMS[team].lines.map((l, i) => B.fighter(formAt(l, lv), lv, { uid: i + 1, gear: o.gear ? GEAR2 : null, mvl: o.mvl ? Object.fromEntries(D.SPECIES[formAt(l, lv)].abil.map((id) => [id, o.mvl])) : null }));
}
// Runs a whole dungeon like the game: health carries over, 40% healed after a win, 50% at each section end, a loss
// restarts the same battle at full health (as R.startRun does), up to `tries` attempts per battle.
function runDungeon(id, team, lv, pol, seed, o) {
  const d = D.DUNGEONS[id]; o = o || {};
  const fresh = () => party(team, lv, o); let pt = fresh(); const hpMax = pt.map((p) => p.hpMax);
  let turns = 0, losses = 0, tries = o.tries || 6, rng = seeded(seed), firstTry = true, use = { basic: 0, special: 0, guard: 0, heal: 0, switch: 0 };
  const per = [];
  for (let i = 0; i < d.battles.length; i++) {
    let won = false, att = 0, bt = 0;
    while (!won && att < tries) {
      att++;
      const party0 = pt.map((p, k) => Object.assign(B.fighter(p.sp, lv, { uid: k + 1, gear: o.gear ? GEAR2 : null, mvl: p.mvl }), { hp: Math.max(0, p.hp) }));
      const e = R.enemyFromSpec(d.battles[i]);
      const b = B.create(party0, e, { rng });
      const r = fight(b, pol); turns += r.turns; bt += r.turns; Object.keys(use).forEach((k) => (use[k] += r.use[k]));
      if (r.win) {
        won = true; pt = b.party.map((p, k) => { const h = p.hp > 0 ? p.hp + Math.round(hpMax[k] * 0.4) : Math.round(hpMax[k] * 0.2); return Object.assign(p, { hp: Math.min(hpMax[k], h) }); });
        const sec = d.sections.findIndex((s) => s.to === i); if (sec >= 0) pt.forEach((p, k) => (p.hp = Math.min(hpMax[k], p.hp + Math.round(hpMax[k] * 0.5))));
      } else { losses++; firstTry = false; pt = fresh(); }
    }
    per.push({ i, lv: d.battles[i].lv, boss: !!d.battles[i].boss, tries: att, won, turns: bt });
    if (!won) return { cleared: false, stuckAt: i, losses, turns, per, use, firstTry: false };
  }
  return { cleared: true, losses, turns, per, use, firstTry };
}
const DUNGEONS = D.CAMPAIGN.starter.dungeons;
function dungeonGrid(pols, offsets, teams, seeds, o) {
  const out = [];
  DUNGEONS.forEach((id) => {
    const rec = D.DUNGEONS[id].recommended;
    teams.forEach((team) => offsets.forEach((off) => pols.forEach((pol) => {
      const lv = Math.max(1, Math.min(30, rec + off)); const rs = [];
      for (let s = 0; s < seeds; s++) rs.push(runDungeon(id, team, lv, pol, 7919 * s + rec * 31 + off, o));
      const cl = rs.filter((r) => r.cleared);
      const bossTries = rs.map((r) => (r.per[9] ? r.per[9].tries : null)).filter((x) => x != null);
      const u = rs.reduce((a, r) => { Object.keys(r.use).forEach((k) => (a[k] = (a[k] || 0) + r.use[k])); return a; }, {}), ut = Object.values(u).reduce((a, b) => a + b, 0);
      out.push({ dungeon: id, rec, team, lv, off, pol, clearPct: pct(cl.length, rs.length), firstTryPct: pct(rs.filter((r) => r.firstTry).length, rs.length),
        lossesAvg: +mean(rs.map((r) => r.losses)).toFixed(2), turnsAvg: +mean(cl.map((r) => r.turns)).toFixed(0), minutes: +(mean(cl.map((r) => r.turns)) * SECS_PER_TURN / 60).toFixed(1),
        bossTriesAvg: +mean(bossTries).toFixed(2), lossByBattle: Array.from({ length: 10 }, (_, i) => +mean(rs.map((r) => (r.per[i] ? r.per[i].tries - (r.per[i].won ? 1 : 0) : 0))).toFixed(2)),
        moveShare: Object.fromEntries(Object.keys(u).map((k) => [k, pct(u[k], ut)])) });
    })));
  });
  return out;
}
console.log('strategies…');
const strat = dungeonGrid(['basic', 'special', 'auto', 'smart'], [0], ['triangle', 'starter'], 80);
write('strategies.json', strat);
console.log('difficulty grid…');
const grid = dungeonGrid(['auto'], [-3, -1, 0, 2, 4], Object.keys(TEAMS), 60);
write('dungeon-grid.json', grid);
console.log('upgrades…');
const upg = dungeonGrid(['auto'], [-2, 0], ['triangle'], 60, { gear: true, mvl: 3 });
write('dungeon-upgraded.json', upg);

/* ================================================================== 4. per-battle difficulty curve */
// Enemy strength index for each battle: enemy HP × attack relative to a recommended-level party member, so the
// curve can be read without a fight.
const curve = DUNGEONS.map((id) => {
  const d = D.DUNGEONS[id];
  return { dungeon: id, rec: d.recommended, battles: d.battles.map((s, i) => { const e = R.enemyFromSpec(s); const ref = B.fighter(formAt('cannonis', d.recommended), d.recommended); return { i, lv: s.lv, sp: s.sp, boss: !!s.boss, hp: e.hpMax, atk: e.atk, power: +((e.hpMax * e.atk) / (ref.hpMax * ref.atk)).toFixed(2), move: s.move || null, mech: s.mech ? s.mech.type : null }; }) };
});
write('dungeon-curve.json', curve);

/* ================================================================== 5. mechanic usefulness */
// (a) guarding against a boss charge vs not; (b) heal vs no heal; (c) burn/stun/soak; (d) weaken stacks
function bossDuel(id, team, lv, pol, seeds) { let w = 0, t = []; for (let s = 0; s < seeds; s++) { const b = B.create(party(team, lv), R.enemyFromSpec(D.DUNGEONS[id].battles[9]), { rng: seeded(s * 13 + 5) }); const r = fight(b, pol); if (r.win) w++; t.push(r.turns); } return { winPct: pct(w, seeds), turns: +mean(t).toFixed(1) }; }
const noGuard = function (b) { const a = policy('auto')(b); if (a.t === 'ab' && D.ABILITIES[a.id].type === 'guard') { const alt = B.legal(b).filter((x) => x.ready && D.ABILITIES[x.id].power > 0)[0]; return { t: 'ab', id: (alt || { id: a.id }).id }; } return a; };
const mech = {};
['gatheringhall', 'drownedsteps', 'coldkiln', 'lanternorchard', 'windstair', 'heartwood', 'reliquary', 'hollowveil', 'resonancescar', 'forgottenroad'].forEach((id) => {
  const rec = D.DUNGEONS[id].recommended, team = 'tanks';
  const withG = bossDuel(id, team, rec, 'auto', 60);
  let w = 0; for (let s = 0; s < 60; s++) { const b = B.create(party(team, rec), R.enemyFromSpec(D.DUNGEONS[id].battles[9]), { rng: seeded(s * 13 + 5) }); let t = 0; while (!b.over && t < 200) { B.act(b, noGuard(b)); if (!b.pending) t++; } if (b.result === 'win') w++; }
  mech[id] = { boss: D.DUNGEONS[id].battles[9].title, move: D.DUNGEONS[id].battles[9].move || null, mechType: (D.DUNGEONS[id].battles[9].mech || {}).type || null, guardTeamAuto: withG.winPct, guardTeamNeverGuard: pct(w, 60) };
});
// Status value: expected damage share. Compare a fire Amina with/without burn proc (patch p=0) over 400 duels.
function statusValue(line, lv, foe, patch) {
  const keep = {}; patch.forEach(([id, k, v]) => { keep[id] = D.ABILITIES[id][k]; D.ABILITIES[id][k] = v; });
  let w = 0, t = []; for (let s = 0; s < 300; s++) { const b = B.create([fighter(line, lv)], fighter(foe, lv), { rng: seeded(s + 77) }); const r = fight(b, 'auto'); if (r.win) w++; t.push(r.turns); }
  patch.forEach(([id, k]) => { D.ABILITIES[id][k] = keep[id]; });
  return { winPct: pct(w, 300), turns: +mean(t).toFixed(2) };
}
const fxOff = (ids) => ids.map((id) => [id, 'fx', undefined]);
const status = {
  burn: { with: statusValue('pyrokai', 10, 'zeep', []), without: statusValue('pyrokai', 10, 'zeep', fxOff(['emberflick', 'flarebite'])) },
  stun: { with: statusValue('gaiaroki', 10, 'zephyr', []), without: statusValue('gaiaroki', 10, 'zephyr', fxOff(['boulderroll'])) },
  soak: { with: statusValue('kairyu', 10, 'emberix', []), without: statusValue('kairyu', 10, 'emberix', fxOff(['tidalsurge'])) },
  weaken: { with: statusValue('umbrit', 10, 'kairyu', []), without: statusValue('umbrit', 10, 'kairyu', [['gloomveil', 'type', 'dmg']]) },
  guardMove: { with: statusValue('acinus', 10, 'gaiaroki', []), note: 'Acinus at stage 1 has only Vine Whip + Leaf Guard' },
  healMove: { with: statusValue('aimza', 10, 'lumi', []), without: statusValue('aimza', 10, 'lumi', [['hum', 'type', 'dmg'], ['hum', 'power', 0]]) },
};
// Synergy value: same team with the bonus removed
function synergyValue(team, lv, seeds) {
  const run = () => { let c = 0; for (let s = 0; s < seeds; s++) if (runDungeon('lanternorchard', team, lv, 'auto', s * 3 + 1).cleared) c++; return pct(c, seeds); };
  const k = D.SYNERGIES.kindred.atk, tr = D.SYNERGIES.triangle.atk, tw = D.STATUS_RULES.twilight;
  const withS = run(); D.SYNERGIES.kindred.atk = 1; D.SYNERGIES.triangle.atk = 1; D.STATUS_RULES.twilight = 0; const without = run();
  D.SYNERGIES.kindred.atk = k; D.SYNERGIES.triangle.atk = tr; D.STATUS_RULES.twilight = tw; return { with: withS, without };
}
const synergy = { triangle: synergyValue('triangle', 12, 30), kindredFire: synergyValue('kindredFire', 12, 30), twilight: synergyValue('twilight', 12, 30) };
write('mechanics.json', { bossGuard: mech, status, synergy });

/* ================================================================== 5b. mechanics at the margin */
// Outcomes at the recommended level are decided before the fight, so each test below is run at the party level
// where the 'auto' player wins the boss about half the time; only there can a mechanic change the result.
function bossWin(id, team, lv, polFn, seeds, o) {
  let w = 0, t = 0; for (let s = 0; s < seeds; s++) { const b = B.create(party(team, lv, o), R.enemyFromSpec(D.DUNGEONS[id].battles[9]), { rng: seeded(s * 17 + 3) }); let k = 0; while (!b.over && k < 200) { B.act(b, polFn(b)); if (!b.pending) k++; } if (b.result === 'win') w++; t += k; }
  return { winPct: pct(w, seeds), turns: +(t / seeds).toFixed(1) };
}
function marginLevel(id, team) { let prev = null; for (let lv = 2; lv <= 30; lv++) { const r = bossWin(id, team, lv, policy('auto'), 60); if (r.winPct >= 30) return lv; prev = lv; } return 30; }
const noHeal = function (b) { const a = policy('auto')(b); if (a.t === 'ab' && D.ABILITIES[a.id].type === 'heal') { const alt = B.legal(b).filter((x) => x.ready && D.ABILITIES[x.id].power > 0)[0]; return { t: 'ab', id: (alt || { id: a.id }).id }; } return a; };
const alwaysGuardFirst = function (b) { const a = policy('auto')(b); return a; };
const weakenFirst = function (b) { const a = policy('auto')(b); if (b.pending || a.t !== 'ab') return a; const w = B.legal(b).find((x) => x.ready && D.ABILITIES[x.id].type === 'weaken'); return w && b.enemy.weak < 3 ? { t: 'ab', id: w.id } : a; };
const margin = {};
DUNGEONS.forEach((id) => {
  const team = 'twilight', lv = marginLevel(id, team), n = 400; // twilight team: has heal (Lumifern at stage 1? no) — see healers below
  margin[id] = { boss: D.DUNGEONS[id].battles[9].title, recommended: D.DUNGEONS[id].recommended, marginLevel: lv,
    auto: bossWin(id, team, lv, policy('auto'), n), basicOnly: bossWin(id, team, lv, policy('basic'), n), neverGuard: bossWin(id, team, lv, noGuard, n),
    smartSwitch: bossWin(id, team, lv, policy('smart'), n), plus1Level: bossWin(id, team, lv + 1, policy('auto'), n), gearII: bossWin(id, team, lv, policy('auto'), n, { gear: true }), moves3: bossWin(id, team, lv, policy('auto'), n, { mvl: 3 }) };
});
// heal value: a team with a healer (Aimza: Hum; Terraflora II+? no) — Aimza + Cannonis + Acinus
TEAMS.healer = { name: 'Healer team', lines: ['aimza', 'cannonis', 'acinus'] };
const healTest = {};
['drownedsteps', 'coldkiln', 'lanternorchard', 'heartwood'].forEach((id) => { const lv = marginLevel(id, 'healer'); healTest[id] = { marginLevel: lv, auto: bossWin(id, 'healer', lv, policy('auto'), 400), neverHeal: bossWin(id, 'healer', lv, noHeal, 400), neverGuard: bossWin(id, 'healer', lv, noGuard, 400) }; });
// statuses on the player's side only: a copy of each move without its effect, used by the player alone
function playerSideWithout(id, team, lv, ids) {
  const map = {}; ids.forEach((a) => { const c = Object.assign({}, D.ABILITIES[a]); delete c.fx; if (c.type === 'weaken') c.type = 'dmg'; D.ABILITIES['nofx_' + a] = c; map[a] = 'nofx_' + a; });
  const mk = () => party(team, lv).map((f) => { f.abil = f.abil.map((a) => map[a] || a); f.cd = {}; f.abil.forEach((a) => (f.cd[a] = 0)); return f; });
  let w = 0; for (let s = 0; s < 400; s++) { const b = B.create(mk(), R.enemyFromSpec(D.DUNGEONS[id].battles[9]), { rng: seeded(s * 17 + 3) }); let k = 0; while (!b.over && k < 200) { B.act(b, policy('auto')(b)); if (!b.pending) k++; } if (b.result === 'win') w++; }
  return pct(w, 400);
}
TEAMS.status = { name: 'Status team', lines: ['pyrokai', 'gaiaroki', 'kairyu'] }; // burn, stun, soak at stage 1
TEAMS.weaken = { name: 'Weaken team', lines: ['umbrit', 'zephyr', 'voltar'] };     // Gloom Veil, Cyclone Spin
const statusMargin = {};
['gatheringhall', 'drownedsteps', 'lanternorchard', 'heartwood'].forEach((id) => {
  const lv = marginLevel(id, 'status'), lw = marginLevel(id, 'weaken');
  statusMargin[id] = { statusTeam: { lv, all: bossWin(id, 'status', lv, policy('auto'), 400).winPct, noBurn: playerSideWithout(id, 'status', lv, ['emberflick', 'flarebite', 'blazerush', 'inferno']), noStun: playerSideWithout(id, 'status', lv, ['boulderroll', 'quakeslam']), noSoak: playerSideWithout(id, 'status', lv, ['tidalsurge', 'riptide']), noneAtAll: playerSideWithout(id, 'status', lv, ['emberflick', 'flarebite', 'blazerush', 'boulderroll', 'quakeslam', 'tidalsurge', 'riptide']) },
    weakenTeam: { lv: lw, all: bossWin(id, 'weaken', lw, policy('auto'), 400).winPct, usesWeakenMoves: bossWin(id, 'weaken', lw, weakenFirst, 400).winPct, noWeaken: playerSideWithout(id, 'weaken', lw, ['gloomveil', 'cyclonespin', 'mountainfall', 'overclock']) } };
});
// synergy at the margin
function synMargin(team, id) {
  const lv = marginLevel(id, team), withS = bossWin(id, team, lv, policy('auto'), 400).winPct;
  const k = D.SYNERGIES.kindred.atk, tr = D.SYNERGIES.triangle.atk, tw = D.STATUS_RULES.twilight; D.SYNERGIES.kindred.atk = 1; D.SYNERGIES.triangle.atk = 1; D.STATUS_RULES.twilight = 0;
  const without = bossWin(id, team, lv, policy('auto'), 400).winPct; D.SYNERGIES.kindred.atk = k; D.SYNERGIES.triangle.atk = tr; D.STATUS_RULES.twilight = tw;
  return { lv, with: withS, without };
}
const synergyMargin = { triangle: synMargin('triangle', 'lanternorchard'), kindredFire: synMargin('kindredFire', 'lanternorchard'), twilight: synMargin('twilight', 'lanternorchard'), triangleKiln: synMargin('triangle', 'coldkiln') };
// elemental counter-picking: the boss of each dungeon fought by its best and worst single-element trio at margin
const counter = {};
DUNGEONS.forEach((id) => {
  const boss = D.DUNGEONS[id].battles[9], el0 = D.SPECIES[boss.sp].el, lvRef = margin[id].marginLevel;
  const trio = (el) => Object.keys(D.LINES).filter((l) => D.LINES[l].el === el && !D.LINES[l].legendary).slice(0, 3);
  const res = {};
  ELS.forEach((el) => { const ls = trio(el); if (!ls.length) return; while (ls.length < 3) ls.push(ls[0]); TEAMS['mono_' + el] = { name: el, lines: ls }; res[el] = bossWin(id, 'mono_' + el, lvRef, policy('auto'), 200).winPct; });
  counter[id] = { bossEl: el0, level: lvRef, byElement: res };
});
write('mechanics-margin.json', { margin, healTest, statusMargin, synergyMargin, counter });

/* ================================================================== 6. progression: XP and food per level */
const xpCurve = []; let cum = 0; for (let lv = 1; lv < D.MAX_LEVEL; lv++) { cum += R.xpNeed(lv); xpCurve.push({ lv, need: R.xpNeed(lv), cum, snacks: Math.ceil(R.xpNeed(lv) / D.SNACKS.snack.xp), feastFood: Math.ceil(R.xpNeed(lv) / D.SNACKS.feast.xp) * D.SNACKS.feast.food }); }
const dungeonXp = DUNGEONS.map((id) => { const d = D.DUNGEONS[id]; const xp = d.battles.reduce((a, s) => a + Math.round((20 + s.lv * 6) * (s.boss ? 1.5 : 1)), 0); const bossXp = Math.round((20 + d.battles[9].lv * 6) * 1.5); return { dungeon: id, rec: d.recommended, xpPerMember: xp, bossOnlyXp: bossXp }; });
// stat growth: level vs evolution vs gear
const statGrowth = { perLevel: 0.11, stageMult: [1, 1.42, 1.85], gearMax: { atk: 0.17, def: 0.19, hp: 0.15, spd: 0.16 }, moveMax: 1.38 };
write('progression.json', { xpCurve, dungeonXp, statGrowth });

/* ================================================================== 7. campaign agent: real rules, real rewards */
// A player who plays dungeons in order with one party, feeds leftover food as Feasts to the weakest member, evolves
// when possible, and replays the last cleared dungeon (boss only, as the "Fight the boss again" button allows) when
// the next one is lost twice in a row. Buildings are left out on purpose: this measures the dungeon loop alone.
function campaignAgent(team, mode, seed) {
  const st = A.State.newGame(); const rng = seeded(seed); R.rng = rng;
  st.phase = 'play'; st.introDone = true; st.avatar = { made: true, name: 'Sim', look: null };
  ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate'].forEach((k) => (st.struct[k] = true));
  st.flags.r1 = true;
  const uids = TEAMS[team].lines.map((l) => R.addAmina(st, lineIds(l)[0], 3).uid);
  const log = []; let battles = 0, turns = 0, losses = 0, replays = 0, minutes = 0;
  const feed = () => { if (mode === 'noFeed') return; while (st.res.food >= D.SNACKS.feast.food) { const low = uids.map((u) => R.inst(st, u)).sort((a, b) => a.lv - b.lv)[0]; if (low.lv >= 30) break; R.feed(st, low.uid, 'feast'); } };
  const evolve = () => uids.forEach((u) => { while (R.evoCheck(st, u).ok) R.evolve(st, u); });
  const playBattle = () => { const b = R.createBattle(st, rng); const r = fight(b, 'auto'); battles++; turns += r.turns; minutes += r.turns * SECS_PER_TURN / 60; return R.resolveBattle(st, b); };
  let order = DUNGEONS.slice(), guard = 0, lastCleared = null;
  for (const id of order) {
    if (id === 'windstair') st.flags.r2 = true; // woken by a story step after the Reliquary
    const need = (D.DUNGEONS[id].unlock || {}).rank, rankAtArrival = st.rank;
    if (need && st.rank < need) { st.rank = need; } // rank also comes from building and quests, which this agent skips
    let fails = 0;
    while (!R.dungeonCleared(st, id) && guard++ < 4000) {
      if (!R.dungeonUnlocked(st, id)) { log.push({ id, blocked: R.dungeonLockText(st, id) }); break; }
      R.startRun(st, id, uids);
      let out; do { out = playBattle(); } while (out.win && !out.cleared && st.run);
      if (!out.win) { losses++; fails++; }
      feed(); evolve();
      if (fails >= 2 && lastCleared) { // grind: boss-only replays of the last cleared dungeon (or full replays)
        for (let k = 0; k < 3; k++) { R.startRun(st, lastCleared, uids, { from: mode === 'bossOnly' ? 9 : 0 }); let o2; do { o2 = playBattle(); } while (o2.win && !o2.cleared && st.run); replays++; feed(); evolve(); }
        fails = 0;
      }
    }
    lastCleared = id;
    const lvs = uids.map((u) => R.inst(st, u).lv);
    log.push({ id, rec: D.DUNGEONS[id].recommended, rankNeed: need || null, rankFromDungeonsAlone: rankAtArrival, clearedAfterBattles: battles, minutes: Math.round(minutes), levels: lvs, gold: st.res.gold, food: st.res.food, gems: st.res.gems, losses, replays });
  }
  return { team, mode, log, essence: Object.assign({}, st.essence), items: st.items.length, rank: st.rank };
}
console.log('campaign agents…');
const agents = [];
['triangle', 'starter', 'kindredFire'].forEach((team) => ['full', 'noFeed'].forEach((mode) => agents.push(campaignAgent(team, mode, 4242))));
// starter alone: the real opening (one Amina) for the first two dungeons
TEAMS.solo = { name: 'Starter alone', lines: ['lumifern'] }; agents.push(campaignAgent('solo', 'noFeed', 4242));
write('campaign-agents.json', agents);

/* ================================================================== 8. farming value per minute */
// What one minute of each repeatable activity pays, at the level it is designed for (auto policy, triangle team at
// recommended +2): full replay, boss-only replay, ruins, survival (to the wave a recommended team reaches), raids.
const farm = DUNGEONS.map((id) => {
  const d = D.DUNGEONS[id], lv = Math.min(30, d.recommended + 2); const full = [], boss = [];
  for (let s = 0; s < 12; s++) { const r = runDungeon(id, 'triangle', lv, 'auto', 500 + s); if (r.cleared) full.push(r.turns); const bt = bossDuel(id, 'triangle', lv, 'auto', 1); boss.push(bt.turns); }
  const base = d.clearReward || d.repeat || {}, battlesGold = d.battles.reduce((a, s) => a + 10 + s.lv * 3 + (s.boss ? 20 : 0), 0), battlesFood = d.battles.reduce((a, s) => a + 4 + (s.boss ? 6 : 0), 0);
  const bossGold = 10 + d.battles[9].lv * 3 + 20, bossFood = 10;
  const fm = mean(full) * SECS_PER_TURN / 60, bm = mean(boss) * SECS_PER_TURN / 60 + 0.25; // +15 s of menus for a boss-only run
  return { dungeon: id, legacyEveryClear: !!d.clearReward, full: { minutes: +fm.toFixed(1), gold: (base.gold || 0) + battlesGold, food: (base.food || 0) + battlesFood, gems: base.gems || 0, goldPerMin: +(((base.gold || 0) + battlesGold) / fm).toFixed(0), gemsPerHour: +((base.gems || 0) / fm * 60).toFixed(1) },
    bossOnly: { minutes: +bm.toFixed(1), gold: (base.gold || 0) + bossGold, food: (base.food || 0) + bossFood, gems: base.gems || 0, goldPerMin: +(((base.gold || 0) + bossGold) / bm).toFixed(0), gemsPerHour: +((base.gems || 0) / bm * 60).toFixed(1), gearChance: D.GEAR_REPEAT_CHANCE, essence: D.ESS_SOURCES.battle(d.battles[9].lv, true) } };
});
write('farming.json', farm);

/* ================================================================== 9. idle economy by stage */
// Gold/food/gems per hour from buildings for three plausible islands (counts and levels are assumptions, stated),
// with collection at cap and resident levels as given.
function perMin(type, lv, residents) { const d = D.BUILDINGS[type], ld = d.levels[lv - 1]; if (!d.perResident) return ld.rate; return residents.reduce((s, r) => s + ld.rate * (1 + r.lv * 0.08) * (r.aff ? 1.5 : 1), 0); }
const stages = {
  early: { note: 'After the Gathering Hall: Hollow 1, Tide Gate 1, 1 farm L1, 1 mine L1, no habitat.', b: [['hollow', 1, [{ lv: 6, aff: true }]], ['tidegate', 1, [{ lv: 4, aff: true }]], ['farm', 1], ['mine', 1]] },
  mid: { note: 'Around the Hollow Veil: Hollow 3, Tide Gate 3, Moon Shrine 2, 2 farms L3, 2 mines L3, 2 habitats L2 with level-10 residents (half matching).', b: [['hollow', 3, [{ lv: 12, aff: true }, { lv: 10, aff: false }]], ['tidegate', 3, [{ lv: 10, aff: true }, { lv: 10, aff: false }]], ['moonshrine', 2, [{ lv: 10, aff: true }]], ['farm', 3], ['farm', 3], ['mine', 3], ['mine', 3], ['hab_water', 2, [{ lv: 10, aff: true }, { lv: 10, aff: false }]], ['hab_fire', 2, [{ lv: 10, aff: true }, { lv: 10, aff: false }]]] },
  late: { note: 'After the Heartwood: every story building at max, 4 farms L5, 3 mines L5, 6 habitats L4 with three level-20 matching residents each.', b: [['hollow', 5, [{ lv: 24, aff: true }, { lv: 20, aff: true }, { lv: 20, aff: false }]], ['tidegate', 5, [{ lv: 20, aff: true }, { lv: 20, aff: true }, { lv: 20, aff: false }]], ['moonshrine', 4, [{ lv: 20, aff: true }, { lv: 20, aff: true }]]]
    .concat(Array(4).fill(['farm', 5])).concat(Array(3).fill(['mine', 5])).concat(Array(6).fill(['hab_fire', 4, [{ lv: 20, aff: true }, { lv: 20, aff: true }, { lv: 20, aff: true }]])) },
};
const idle = {}; Object.keys(stages).forEach((k) => { const tot = { gold: 0, food: 0, gems: 0 }; stages[k].b.forEach(([t, lv, res]) => { tot[D.BUILDINGS[t].produces] += perMin(t, lv, res || []) * 60; }); idle[k] = { note: stages[k].note, perHour: { gold: Math.round(tot.gold), food: Math.round(tot.food), gems: +tot.gems.toFixed(1) } }; });
// sinks: every building level, every forge recipe and merge, evolutions, breeding
const sinks = { buildingsToMax: 0 };
Object.keys(D.BUILDINGS).forEach((k) => { const d = D.BUILDINGS[k]; if (d.cat === 'decor' || d.season) return; const one = d.levels.reduce((a, l) => a + (l.cost.gold || 0), 0); sinks[k] = one * (d.maxCount ? Math.min(d.maxCount, d.cat === 'habitat' ? 1 : d.maxCount) : 1); sinks.buildingsToMax += sinks[k]; });
sinks.habitatsAll7AtMax = D.BUILDINGS.hab_fire.levels.reduce((a, l) => a + l.cost.gold, 0) * 7;
sinks.gearTierIV = 8 * 120 + 4 * 60 + 2 * 180 + 450; // eight crafted tier I clubs merged up
sinks.evolveOne = 60 + 160; sinks.evolveFoodOne = 15 + 40;
const gemSinks = { forgeRecipes: D.FORGE.recipes.reduce((a, r) => a + (r.cost.gems || 0), 0), finishNowPerHour: Math.ceil(60 * D.FINISH_GEMS_PER_MIN) };
const gemSources = { questsTotal: D.QUESTS.reduce((a, q) => a + ((q.reward && q.reward.gems) || 0), 0), dungeonFirstClears: DUNGEONS.reduce((a, id) => { const d = D.DUNGEONS[id]; return a + ((d.first || d.clearReward || {}).gems || 0) + d.sections.reduce((x, s) => x + ((s.first || {}).gems || 0), 0); }, 0), survivalMilestones: Object.values(D.SURVIVAL.milestones).reduce((a, m) => a + m.gems, 0) };
write('economy.json', { idle, sinks, gemSinks, gemSources, raid: D.PVP.raid.base, practiceDaily: D.PVP.practiceDailyRewards, ruins: D.RUINS });

/* ================================================================== 10. survival and practice reach */
function survivalReach(team, lv, seeds) {
  const out = [];
  for (let s = 0; s < seeds; s++) {
    const st = A.State.newGame(); const uids = TEAMS[team].lines.map((l) => R.addAmina(st, formAt(l, lv), lv).uid); R.rng = seeded(s + 900);
    R.Survival.start(st, uids); let wave = 0, guard = 0;
    while (st.survival.run && guard++ < 80) { const b = R.Survival.createBattle(st, R.rng); fight(b, 'auto'); const r = R.Survival.resolve(st, b); if (!r.win) break; wave = r.wave; }
    out.push(wave);
  }
  return { avg: +mean(out).toFixed(1), max: Math.max(...out), min: Math.min(...out) };
}
const survivalNote = 'lv30 parties hit the 80-wave simulation cap: enemy level stops at 30, so the run never gets harder.';
const survival = { note: survivalNote, lv10: survivalReach('triangle', 10, 30), lv20: survivalReach('triangle', 20, 30), lv30: survivalReach('triangle', 30, 30) };
write('survival.json', survival);

/* ------------------------------------------------------------------ console summary */
console.log('done →', OUT);
