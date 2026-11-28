// Phase 20B: The Keeper's Emblem, stat proposals measured against the Watcher's Lens (design only; nothing is added to
// the game). Every member of a level-50, 52 or 55 team (below the boss's 60, where the charms differ) wears the charm (bonuses applied as gear is, once, to the
// fighter's stats), against The Two Keys prototype (tools/p20b-twokeys.js, stage health ×1.0) and the Forge Heart's
// tier. Output: win rate and turns per option. Run: node tools/p20b-emblem.js → docs/audit20b/emblem.json
'use strict';
const T = require('./p20b-twokeys.js'), { seeded } = require('../tests/harness'), fs = require('fs'), path = require('path');
const A = T.sandbox(), B = A.Rules.Battle, D = A.Data;
const OPTIONS = {
  none: null,
  watcherLens: D.ITEMS.entityeye.bonus,                                  // existing unique charm (Survival wave 20)
  A_steadfast: { hp: 0.08, def: 0.10, atk: 0.04, spd: 0.02 },              // recommended: holds the door
  B_twinKeys: { atk: 0.08, def: 0.08, hp: 0.04, spd: 0.04 },
  C_crossing: { hp: 0.06, atk: 0.06, def: 0.06, spd: 0.06 },               // the 20A "Crossing Key": the Lens's exact line (rejected)
  epicChoir: D.ITEMS.choirshell.bonus,                                     // the best Celestial-era epic charm for scale
};
const wear = (f, b) => { if (!b) return f; f.hpMax = Math.round(f.hpMax * (1 + (b.hp || 0))); f.hp = f.hpMax; f.atk = Math.round(f.atk * (1 + (b.atk || 0))); f.def = Math.round(f.def * (1 + (b.def || 0))); f.spd = Math.round(f.spd * (1 + (b.spd || 0))); return f; };
const out = { note: 'Bare fighters (no other gear, moves at level 1), auto-battle policy, 80 seeds per cell. Relative comparison only.', options: OPTIONS, rows: {} };
for (const [name, bonus] of Object.entries(OPTIONS)) for (const lv of [50, 52, 55]) for (const team of ['light', 'dark', 'water']) {
  let w = 0, t = 0; const N = 80;
  for (let s = 1; s <= N; s++) { const party = T.TEAMS[team].map((sp) => wear(B.fighter(sp, lv, {}), bonus)), b = B.create(party, T.foesFor(A, { stages: T.STAGES(1.0) }), { rng: seeded(s * 31 + lv) });
    let n = 0; while (!b.over && n++ < 400) B.act(b, B.autoAction(b)); if (b.result === 'win') w++; t += n; }
  out.rows[name + '|' + lv + '|' + team] = { win: +(w / N).toFixed(2), turns: +(t / N).toFixed(1) };
}
const sum = (b) => b ? +Object.values(b).reduce((a, c) => a + c, 0).toFixed(2) : 0;
Object.keys(OPTIONS).forEach((k) => console.log(k.padEnd(12), 'budget', sum(OPTIONS[k]), [50, 52, 55].map((lv) => lv + ': ' + ['light', 'dark', 'water'].map((t) => out.rows[k + '|' + lv + '|' + t].win).join('/')).join('   ')));
fs.writeFileSync(path.join(__dirname, '../docs/audit20b/emblem.json'), JSON.stringify(out, null, 1));
