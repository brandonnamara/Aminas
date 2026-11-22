// Phase 17C experiment: candidate healing and defensive refinements on the 17B rules, one at a time and together.
// For each variant: first-try dungeon clears (all ten dungeons, 40 runs each) at recommended -1 and 0 for five teams,
// and how often healing beats never healing (Aimza, Acinus, Kairyu over whole dungeons, 60 runs each at -1).
process.env.P17B_LIB = '1';
const { Game, loadAt, pct, mean } = require('../p17b-sim.js');
const g = Game(loadAt(null), 'exp'), D = g.D, C = D.COMBAT17, DUN = D.CAMPAIGN.starter.dungeons;
const H0 = D.MOVE_LEVELS.heal.slice(), N0 = { mend: D.ABILITIES.mend.fx.n, hum: D.ABILITIES.hum.fx.n }, keep = Object.assign({}, C);
const reset = () => { Object.assign(C, keep); D.MOVE_LEVELS.heal = H0.slice(); D.ABILITIES.mend.fx.n = N0.mend; D.ABILITIES.hum.fx.n = N0.hum; };
const VARIANTS = {
  '17B': () => {},
  'heal +5%': () => { D.MOVE_LEVELS.heal = H0.map((x) => x + 0.05); },
  'regen 3 turns': () => { D.ABILITIES.mend.fx.n = 3; D.ABILITIES.hum.fx.n = 3; },
  'heal +5% & regen 3': () => { D.MOVE_LEVELS.heal = H0.map((x) => x + 0.05); D.ABILITIES.mend.fx.n = 3; D.ABILITIES.hum.fx.n = 3; },
  'tank counter 60%': () => { C.tankCounter = 0.6; },
  'guard recoil 25%': () => { C.guardReflect = 0.25; },
  'guard recoil 40%': () => { C.guardReflect = 0.4; },
  'recoil 25% & tank counter 50%': () => { C.guardReflect = 0.25; C.tankCounter = 0.5; },
  'heal +5% & regen 3 & recoil 25%': () => { D.MOVE_LEVELS.heal = H0.map((x) => x + 0.05); D.ABILITIES.mend.fx.n = 3; D.ABILITIES.hum.fx.n = 3; C.guardReflect = 0.25; },
};
const TEAMS = { defensive: ['acinus', 'zeep', 'terraflora'], healStatus: ['aimza', 'pyrokai', 'kairyu'], balanced: ['lumifern', 'cannonis', 'emberix'], swiftWind: ['zephyr', 'kairyu', 'umbrit'], basic: ['lumifern', 'cannonis', 'emberix'] };
const clears = (lines, off, pol, n) => mean(DUN.map((id) => { let c = 0; for (let s = 0; s < n; s++) if (g.run(id, lines, g.D.DUNGEONS[id].recommended + off, pol, 2000 + s).cleared) c++; return pct(c, n); }));
const out = {};
for (const [name, apply] of Object.entries(VARIANTS)) {
  reset(); apply(); const r = {};
  Object.entries(TEAMS).forEach(([t, l]) => { r[t] = [-1, 0].map((o) => +clears(l, o, t === 'basic' ? 'basic' : 'tactical', 40).toFixed(1)); });
  r.defensiveGuardCycle = [-1, 0].map((o) => +clears(TEAMS.defensive, o, 'guardCycle', 40).toFixed(1)); r.balancedGuardCycle = [-1, 0].map((o) => +clears(TEAMS.balanced, o, 'guardCycle', 40).toFixed(1));
  g.healRule = null; const withHeal = clears(['aimza', 'acinus', 'kairyu'], -1, 'tactical', 60); g.healRule = () => false; const noHeal = clears(['aimza', 'acinus', 'kairyu'], -1, 'tactical', 60); g.healRule = null;
  r.healValue = +(withHeal - noHeal).toFixed(1);
  out[name] = r; console.log(name.padEnd(34), JSON.stringify(r));
}
reset();
require('fs').writeFileSync(require('path').join(__dirname, '..', '..', 'docs', 'audit17c', 'heal-defence-variants.json'), JSON.stringify(out, null, 1));
