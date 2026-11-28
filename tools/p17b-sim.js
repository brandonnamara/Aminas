// Phase 17B: combat and dungeon comparison. The same seeds and the same simulated players run against two copies of
// the game: the Phase 17A code (commit 316fa38, read from git) and the working tree. Nothing here changes the game.
// Run: node tools/p17b-sim.js [outDir]  (default docs/audit17b). Deterministic. Times assume 4.5 s per turn.
const fs = require('fs'), path = require('path'), vm = require('vm'), { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), OUT = process.argv[2] || path.join(ROOT, 'docs', 'audit17b'); fs.mkdirSync(OUT, { recursive: true });
const BASE_REF = process.env.BASE_REF || '316fa38'; // Phase 17C compares against 17B: BASE_REF=8ded42a
function loadAt(ref) { // the rule scripts, in index.html order, from a git commit (ref) or the working tree (null)
  const read = (f) => (ref ? execSync('git show ' + ref + ':' + f, { cwd: ROOT, maxBuffer: 64e6 }).toString() : fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const store = {}, ctx = { console, Math, Date, JSON, setTimeout, clearTimeout, localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } } };
  ctx.globalThis = ctx; vm.createContext(ctx);
  const html = read('index.html'), files = [...html.matchAll(/src="src\/([^"]+)"/g)].map((m) => m[1]).filter((f) => !/^(ui|art|c3d|island|audio|main|dungeon-art)/.test(f));
  files.forEach((f) => vm.runInContext(read('src/' + f), ctx, { filename: f }));
  ctx.A.Rules.emit = () => {}; return ctx.A;
}
const seeded = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0), mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const write = (n, o) => fs.writeFileSync(path.join(OUT, n), JSON.stringify(o, null, 1));
const SEEDS = +process.env.SEEDS || 60;

/* ------------------------------------------------------------------ one game version */
function Game(A, name) {
  const D = A.Data, R = A.Rules, B = R.Battle, g = { A, D, R, B, name };
  g.formAt = (line, lv) => { const ids = D.LINES[line].ids; return lv >= 22 ? ids[2] : lv >= 12 ? ids[1] : ids[0]; };
  // a party Amina built the way a dungeon builds it (R.partyFighter), so version differences such as kept moves apply
  g.member = (line, lv, uid, o) => { const sp = g.formAt(line, lv), inst = { uid, sp, lv, xp: 0, mv: o && o.mvl ? [o.mvl, o.mvl] : [1, 1] }; return R.partyFighter({ items: [] }, inst); };
  g.party = (lines, lv, o) => lines.map((l, i) => g.member(l, lv, i + 1, o));
  const T = (id) => D.ABILITIES[id].type;
  const score = (p, e, id) => { const ab = D.ABILITIES[id]; if (!ab.power) return -1; return ab.power * (ab.neutral ? 1 : R.elMult(ab.el, e.el)) * (ab.el === p.el ? 1.2 : 1) * (e.shield > 0 && ab.cd > 0 ? 2 : 1); };
  g.policy = function (kind) {
    return function (b) {
      if (b.pending) { const i = b.party.findIndex((p) => p.hp > 0); return { t: 'sw', to: i }; }
      const p = B.cur(b), e = b.enemy, legal = B.legal(b).filter((x) => x.ready), of = (k) => legal.find((x) => T(x.id) === k);
      if (kind === 'basic') { const m = legal.find((x) => D.ABILITIES[x.id].cd === 0 && D.ABILITIES[x.id].power) || legal[0]; if (!m) { const o = b.party.findIndex((q, k) => k !== b.pi && q.hp > 0); return o >= 0 ? { t: 'sw', to: o } : null; } return { t: 'ab', id: m.id }; }
      if (kind === 'auto') { if (!legal.length) { const o = b.party.findIndex((q, k) => k !== b.pi && q.hp > 0); return o >= 0 ? { t: 'sw', to: o } : null; } return B.autoAction(b); }
      // 'tactical': the same strategic player in both versions (it can only use the moves each version gives it)
      if (e.charging) { const gd = of('guard'); if (gd) return { t: 'ab', id: gd.id }; }
      if (kind === 'guardCycle') { const gd = of('guard'); if (gd && e.hp > e.hpMax * 0.25 && !p.counter) return { t: 'ab', id: gd.id }; } // guard whenever it is ready, then strike with the counter
      const h = of('heal'); if (h && (g.healRule ? g.healRule(b, p, e) : e.hp > e.hpMax * 0.3 && (p.hp < p.hpMax * 0.45 || (p.st.burn > 0 && p.hp < p.hpMax * 0.7)))) return { t: 'ab', id: h.id };
      const w = of('weaken'); if (w && e.weak < 2 && e.hp > e.hpMax * 0.45 && (e.boss || e.move || e.hpMax > p.hpMax)) return { t: 'ab', id: w.id };
      const sk = legal.filter((x) => (D.ABILITIES[x.id].fx || {}).k === 'soak').sort((x, y) => D.ABILITIES[y.id].fx.p - D.ABILITIES[x.id].fx.p)[0]; if (sk && e.move && !e.charging && e.chargeIn <= 0 && !(e.st.soak > 0)) return { t: 'ab', id: sk.id };
      const gd = of('guard'); if (gd && p.hp < p.hpMax * 0.5 && e.hp > e.hpMax * 0.3 && e.abil.some((id) => D.ABILITIES[id].cd > 0 && B.usable(e, id))) return { t: 'ab', id: gd.id };
      const best = legal.filter((x) => D.ABILITIES[x.id].power).sort((a, c) => score(p, e, c.id) - score(p, e, a.id))[0];
      if (!best && !legal.length) { const o = b.party.findIndex((q, k) => k !== b.pi && q.hp > 0); return o >= 0 ? { t: 'sw', to: o } : null; } // no usable move (17A: a silenced Aimza)
      return { t: 'ab', id: (best || legal[0]).id };
    };
  };
  g.softlocks = 0; g.fight = function (b, pol) { let t = 0; const P = g.policy(pol), use = {}; while (!b.over && t < 200) { const a = P(b); if (!a) { g.softlocks++; b.over = true; b.result = 'lose'; break; } const k = a.t === 'sw' ? 'switch' : D.ABILITIES[a.id].type === 'dmg' && D.ABILITIES[a.id].cd === 0 ? 'basic' : D.ABILITIES[a.id].type; use[k] = (use[k] || 0) + 1; B.act(b, a); if (!b.pending) t++; } return { win: b.result === 'win', turns: t, use }; };
  // a whole dungeon, as the game runs it (health carries over, 40% after a win, 50% at a section end, a loss restarts
  // the battle at full health); tries = attempts allowed per battle
  g.run = function (id, lines, lv, pol, seed, o) {
    o = o || {}; const d = D.DUNGEONS[id], rng = seeded(seed), fresh = () => g.party(lines, lv, o); let pt = fresh(); const hpMax = pt.map((p) => p.hpMax);
    let turns = 0, losses = 0, first = true; const per = [], use = {};
    for (let i = o.from || 0; i < d.battles.length; i++) {
      let won = false, att = 0;
      while (!won && att < (o.tries || 1)) {
        att++; const party = fresh().map((f, k) => Object.assign(f, { hp: Math.max(0, pt[k].hp) }));
        const b = B.create(party, (R.foesFromSpec || R.enemyFromSpec)(d.battles[i]), { rng }); const r = g.fight(b, pol); turns += r.turns; Object.keys(r.use).forEach((k) => (use[k] = (use[k] || 0) + r.use[k]));
        if (r.win) { won = true; pt = b.party.map((p, k) => Object.assign(p, { hp: Math.min(hpMax[k], p.hp > 0 ? p.hp + Math.round(hpMax[k] * 0.4) : Math.round(hpMax[k] * 0.2)) })); const sc = d.sections.findIndex((s) => s.to === i); if (sc >= 0) pt.forEach((p, k) => (p.hp = Math.min(hpMax[k], p.hp + Math.round(hpMax[k] * 0.5)))); }
        else { losses++; first = false; pt = fresh(); }
      }
      per.push({ i, won, att });
      if (!won) return { cleared: false, at: i, turns, losses, first: false, per, use };
    }
    return { cleared: true, turns, losses, first, per, use };
  };
  return g;
}
module.exports = { Game, loadAt, seeded, pct, mean };
if (process.env.P17B_LIB) return; // used as a library by experiments
const base = Game(loadAt(BASE_REF), process.env.BASE_NAME || 'Phase 17A'), mod = Game(loadAt(null), process.env.MOD_NAME || 'Phase 17B');
const DUN = base.D.CAMPAIGN.starter.dungeons;
const NAME = Object.fromEntries(DUN.map((id) => [id, base.D.DUNGEONS[id].name.replace(/^The /, '')]));

/* ================================================================== teams */
// the elemental-advantage team is chosen per dungeon from the boss's element (best three non-legendary lines)
function counterLines(g, id) {
  const boss = g.D.DUNGEONS[id].battles[9], el = g.D.SPECIES[boss.sp].el, lines = Object.keys(g.D.LINES).filter((l) => !g.D.LINES[l].legendary);
  const val = (l) => { const e2 = g.D.LINES[l].el; return g.R.elMult(e2, el) * 2 + 1 / g.R.elMult(el, e2); };
  return lines.sort((a, b) => val(b) - val(a)).slice(0, 3);
}
const TEAMS = {
  basicOnly: { label: 'Basic attacks only', lines: ['lumifern', 'cannonis', 'emberix'], pol: 'basic' },
  advantage: { label: 'Elemental advantage', lines: null, pol: 'tactical' },
  defensive: { label: 'Defensive (guard)', lines: ['acinus', 'zeep', 'terraflora'], pol: 'tactical' },
  healStatus: { label: 'Healing and status', lines: ['aimza', 'pyrokai', 'kairyu'], pol: 'tactical' },
  balanced: { label: 'Balanced roles', lines: ['lumifern', 'cannonis', 'emberix'], pol: 'tactical' },
  swiftWind: { label: 'Swift and Wind', lines: ['zephyr', 'kairyu', 'umbrit'], pol: 'tactical' },
  autoBattle: { label: 'Game auto-battle (balanced)', lines: ['lumifern', 'cannonis', 'emberix'], pol: 'auto' },
  defensiveCycle: { label: 'Defensive, guard-and-counter play', lines: ['acinus', 'zeep', 'terraflora'], pol: 'guardCycle' },
};
const OFFS = [-2, -1, 0, 1, 2];

/* ================================================================== 1. dungeon grid: first-try clears by team and level */
function grid(g) {
  const out = [];
  DUN.forEach((id) => { const rec = g.D.DUNGEONS[id].recommended;
    Object.keys(TEAMS).forEach((tk) => { const T = TEAMS[tk], lines = T.lines || counterLines(g, id);
      OFFS.forEach((off) => { const lv = Math.max(2, Math.min(30, rec + off)); let first = 0, boss = 0, reachB = 0; const tn = [], use = {}, lossAt = Array(10).fill(0);
        for (let s = 0; s < SEEDS; s++) { const r = g.run(id, lines, lv, T.pol, 1000 + s * 7 + rec); if (r.cleared) { first++; tn.push(r.turns); } else lossAt[r.at]++; if (r.cleared || r.at === 9) { reachB++; if (r.cleared) boss++; } Object.keys(r.use).forEach((k) => (use[k] = (use[k] || 0) + r.use[k])); }
        const ut = Object.values(use).reduce((a, b) => a + b, 0);
        out.push({ id, rec, team: tk, lines, off, lv, firstTry: pct(first, SEEDS), bossGivenReach: pct(boss, reachB), minutes: +(mean(tn) * 4.5 / 60).toFixed(1), turns: +mean(tn).toFixed(1), lossAt, use: Object.fromEntries(Object.keys(use).map((k) => [k, pct(use[k], ut)])) }); }); }); });
  return out;
}
console.log('grid…'); const G0 = grid(base), G1 = grid(mod); write('grid.json', { base: G0, mod: G1 });

/* ================================================================== 2. tactical play against extra levels */
// Does a tactical team at level L beat a basic-attack team one or two levels higher? First-try boss-reach-and-clear
// across all dungeons; same seeds.
function versus(G) {
  const at = (tk, off) => mean(G.filter((r) => r.team === tk && r.off === off).map((r) => r.firstTry));
  const rows = {}; Object.keys(TEAMS).forEach((tk) => { rows[tk] = OFFS.map((o) => +at(tk, o).toFixed(1)); }); return rows;
}
write('versus.json', { offsets: OFFS, base: versus(G0), mod: versus(G1), labels: Object.fromEntries(Object.keys(TEAMS).map((k) => [k, TEAMS[k].label])) });

/* ================================================================== 3. duels by element and role */
function duels(g, lv) {
  const lines = Object.keys(g.D.LINES), res = {};
  lines.forEach((a) => { let w = 0, n = 0; lines.forEach((d) => { if (a === d) return; for (let s = 0; s < 30; s++) { const b = g.B.create([g.member(a, lv, 1)], g.B.fighter(g.formAt(d, lv), lv), { rng: seeded(s * 31 + lv) }); if (g.fight(b, 'tactical').win) w++; n++; } }); res[a] = { el: g.D.LINES[a].el, role: g.D.LINES[a].role, leg: g.D.LINES[a].legendary, win: pct(w, n) }; });
  const by = (k) => { const m = {}; Object.values(res).filter((r) => !r.leg).forEach((r) => { (m[r[k]] = m[r[k]] || []).push(r.win); }); return Object.fromEntries(Object.keys(m).map((x) => [x, +mean(m[x]).toFixed(1)])); };
  return { lines: res, el: by('el'), role: by('role') };
}
console.log('duels…'); write('duels.json', { lv15: { base: duels(base, 15), mod: duels(mod, 15) }, lv25: { base: duels(base, 25), mod: duels(mod, 25) } });

/* ================================================================== 4. each refinement on its own (ablation) */
// Modified game, one switch off at a time, tactical teams at recommended -1, first-try clears averaged over dungeons.
function ablate() {
  const C = mod.D.COMBAT17, keep = Object.assign({}, C), out = {};
  const score = () => { const rs = {}; ['defensive', 'healStatus', 'balanced', 'swiftWind', 'advantage'].forEach((tk) => { const v = []; DUN.forEach((id) => { const rec = mod.D.DUNGEONS[id].recommended, lines = TEAMS[tk].lines || counterLines(mod, id); let c = 0; for (let s = 0; s < 40; s++) if (mod.run(id, lines, rec - 1, 'tactical', 5000 + s).cleared) c++; v.push(pct(c, 40)); }); rs[tk] = +mean(v).toFixed(1); }); return rs; };
  out.all = score();
  [['retain', false], ['counter', 0], ['cleanse', false], ['healBrace', 0], ['soakSlows', false], ['swift', 0], ['tailwind', false]].forEach(([k, v]) => { C[k] = v; out['no_' + k] = score(); C[k] = keep[k]; });
  return out;
}
console.log('ablation…'); write('ablation.json', ablate());

/* ================================================================== 5. support moves at the boss margin */
// Each boss at the lowest level where the tactical balanced team wins 30%+; then: never guard / never heal / never
// weaken / never soak, same seeds, 300 fights. Both versions.
function marginTests(g) {
  const out = {};
  const bossWin = (id, lines, lv, pol, n, filter) => { let w = 0; for (let s = 0; s < n; s++) { const b = g.B.create(g.party(lines, lv), g.R.enemyFromSpec(g.D.DUNGEONS[id].battles[9]), { rng: seeded(s * 17 + 3) }); const P = g.policy(pol); let k = 0; while (!b.over && k < 200) { let a = P(b); if (filter && a.t === 'ab' && filter(a.id)) { const alt = g.B.legal(b).filter((x) => x.ready && g.D.ABILITIES[x.id].power && !filter(x.id))[0]; if (alt) a = { t: 'ab', id: alt.id }; } g.B.act(b, a); if (!b.pending) k++; } if (b.result === 'win') w++; } return pct(w, n); };
  const lines = ['aimza', 'acinus', 'kairyu']; // heal, guard, soak (and Acinus/Kairyu keep them after evolving in 17B)
  DUN.forEach((id) => {
    let lv = 2; for (; lv <= 30; lv++) if (bossWin(id, lines, lv, 'tactical', 40) >= 30) break;
    const T = (k) => (id2) => g.D.ABILITIES[id2].type === k, soak = (id2) => (g.D.ABILITIES[id2].fx || {}).k === 'soak';
    const wl = ['umbrit', 'zephyr', 'voltar']; let lw = 2; for (; lw <= 30; lw++) if (bossWin(id, wl, lw, 'tactical', 40) >= 30) break;
    out[id] = { lv, lvWeaken: lw, weakenTeam: bossWin(id, wl, lw, 'tactical', 300), weakenTeamNoWeaken: bossWin(id, wl, lw, 'tactical', 300, T('weaken')), tactical: bossWin(id, lines, lv, 'tactical', 300), noGuard: bossWin(id, lines, lv, 'tactical', 300, T('guard')), noHeal: bossWin(id, lines, lv, 'tactical', 300, T('heal')), noSoak: bossWin(id, lines, lv, 'tactical', 300, soak), basic: bossWin(id, lines, lv, 'basic', 300), plus1: bossWin(id, lines, lv + 1, 'basic', 300) };
  });
  return out;
}
console.log('margin…'); write('margin.json', { base: marginTests(base), mod: marginTests(mod) });

/* ================================================================== 6. Cold Kiln */
function kiln(g) {
  const out = {}; const id = 'coldkiln', rec = g.D.DUNGEONS[id].recommended;
  Object.keys(TEAMS).forEach((tk) => { const lines = TEAMS[tk].lines || counterLines(g, id); out[tk] = OFFS.map((off) => { let c = 0, cAny = 0; for (let s = 0; s < 200; s++) { if (g.run(id, lines, rec + off, TEAMS[tk].pol, 9000 + s).cleared) c++; if (g.run(id, lines, rec + off, TEAMS[tk].pol, 9000 + s, { tries: 6 }).cleared) cAny++; } return { off, lv: rec + off, firstTry: pct(c, 200), within6: pct(cAny, 200) }; }); });
  return { rec, boss: Object.assign({}, g.D.DUNGEONS[id].battles[9]), teams: out };
}
/* ================================================================== 7. difficulty curve inside each dungeon */
// enemy health × attack against a party Amina of the recommended level (Cannonis line, form by level), per battle
function curve(g) { return DUN.map((id) => { const d = g.D.DUNGEONS[id], ref = g.member('cannonis', d.recommended, 1); return { id, rec: d.recommended, battles: d.battles.map((s, i) => { const e = g.R.enemyFromSpec(s); return { i, sp: s.sp, lv: s.lv, power: +((e.hpMax * e.atk) / (ref.hpMax * ref.atk)).toFixed(2), move: s.move || null, herald: !!s.herald }; }) }; }); }
write('curve.json', { base: curve(base), mod: curve(mod) });
console.log('kiln…'); write('coldkiln.json', { base: kiln(base), mod: kiln(mod) });
write('softlocks.json', { base: base.softlocks, mod: mod.softlocks, note: 'battles where the active Amina had no usable move and nobody to switch to (counted as a loss)' });
console.log('done →', OUT, 'softlocks', base.softlocks, mod.softlocks);
