// Phase 19D: do the three replay challenges still ask something of an overlevelled player? Rule-level simulation of
// full replays (battles 1–10) of each Obsidian dungeon with the real battle engine and the 17B scripted policies; NOT real
// gameplay, NOT an iPhone. For party levels rec, rec+5, rec+10 (≤ 60) and three play styles it records how often a
// replay is Flawless (nobody faints), answers the guardian (a guard, soak, stun or barrier break on its charge, as the
// game records it), and how often a one-element team (the best three lines of one element for that dungeon) clears.
// Run: OUTF=docs/audit19d/challenges.json node tools/p19d-challenges.js   (env N = replays per cell, default 40)
process.env.P17B_LIB = '1';
const fs = require('fs'), path = require('path');
const { Game, loadAt, seeded } = require('./p17b-sim.js');
const g = Game(loadAt(null), '19D'), D = g.D, R = g.R, B = g.B;
const IDS = D.CAMPAIGN.obsidian.dungeons, TRIO = ['lumifern', 'cannonis', 'emberix'], N = +process.env.N || 40;
const byEl = {}; Object.keys(D.LINES).filter((l) => !D.LINES[l].legendary && D.LINES[l].el !== 'resonance').forEach((l) => (byEl[D.LINES[l].el] = byEl[D.LINES[l].el] || []).push(l));
const kin = (id) => { const el = D.DUNGEONS[id].battles[9].el || D.SPECIES[D.DUNGEONS[id].battles[9].sp].el; let best = null, bv = -1;
  Object.keys(byEl).filter((e) => byEl[e].length >= 3).forEach((e) => { const v = R.elMult(e, el) * 2 + 1 / R.elMult(el, e); if (v > bv) { bv = v; best = e; } }); return byEl[best].slice(0, 3); };
function replay(id, lines, lv, pol, seed) {
  const d = D.DUNGEONS[id], rng = seeded(seed); let pt = g.party(lines, lv); const hpMax = pt.map((p) => p.hpMax); let fainted = false, blunt = false;
  for (let i = 0; i < d.battles.length; i++) {
    const party = g.party(lines, lv).map((f, k) => Object.assign(f, { hp: Math.max(0, pt[k].hp) })); const b = B.create(party, R.enemyFromSpec(d.battles[i]), { rng }); g.fight(b, pol);
    if (b.result !== 'win') return { cleared: false, flawless: false, blunt };
    if (b.party.some((p) => p.hp <= 0)) fainted = true; if (i === 9 && b.c17blunt) blunt = true;
    pt = b.party.map((p, k) => Object.assign(p, { hp: Math.min(hpMax[k], p.hp > 0 ? p.hp + Math.round(hpMax[k] * 0.4) : Math.round(hpMax[k] * 0.2)) }));
    const sc = d.sections.findIndex((s) => s.to === i); if (sc >= 0) pt.forEach((p, k) => (p.hp = hpMax[k]));
  }
  return { cleared: true, flawless: !fainted, blunt };
}
const out = { note: 'Rule-level simulation; NOT real gameplay or an iPhone. % of ' + N + ' seeded full replays.', rows: [] };
IDS.forEach((id) => { const rec = D.DUNGEONS[id].recommended; [rec, rec + 5, Math.min(60, rec + 10)].forEach((lv, k) => ['tactical', 'auto', 'basic'].forEach((pol) => {
  let fl = 0, bl = 0, cl = 0, kc = 0; const kl = kin(id);
  for (let s = 0; s < N; s++) { const r = replay(id, TRIO, lv, pol, 500 + s); if (r.cleared) cl++; if (r.flawless) fl++; if (r.blunt) bl++; if (replay(id, kl, lv, pol, 900 + s).cleared) kc++; }
  const row = { id, lv, off: ['rec', '+5', '+10'][k], pol, clear: Math.round(cl / N * 100), flawless: Math.round(fl / N * 100), guardian: Math.round(bl / N * 100), kindredClear: Math.round(kc / N * 100), kindred: kl.join('/') };
  out.rows.push(row); console.log(id.padEnd(10), ('lv' + lv).padEnd(5), pol.padEnd(8), 'clear', row.clear, 'flawless', row.flawless, 'guardian', row.guardian, 'one-element', row.kindredClear, '(' + row.kindred + ')'); })); });
if (process.env.OUTF) fs.writeFileSync(process.env.OUTF, JSON.stringify(out, null, 1));
