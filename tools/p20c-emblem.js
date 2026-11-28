// Phase 20C: the Keeper's Emblem against the other charms and the high-tier gear (real item data, working tree).
// Stat totals and what each charm adds to a level-60 Lumifern III. Run: node tools/p20c-emblem.js [out.json]
const path = require('path'), fs = require('fs');
const { load } = require('../tests/harness');
const A = load().A, D = A.Data, R = A.Rules, B = R.Battle;
const base = B.fighter('aurelith', 60), keys = ['hp', 'atk', 'def', 'spd'], st = { hp: base.hpMax, atk: base.atk, def: base.def, spd: base.spd };
const rows = Object.keys(D.ITEMS).map((id) => { const it = D.ITEMS[id], b = it.bonus || {}; const sum = keys.reduce((a, k) => a + (b[k] || 0), 0);
  return { id, name: it.name, slot: it.slot, rarity: it.rarity, tier: it.tier, unique: !!it.unique, bonus: b, sum: +sum.toFixed(3), onLumifern60: keys.reduce((o, k) => (o[k] = Math.round(st[k] * (b[k] || 0)), o), {}) }; })
  .filter((r) => r.slot === 'charm' || r.unique || r.tier >= 4).sort((a, b) => b.sum - a.sum);
const out = { note: 'Item bonuses from the real data. onLumifern60: points each item adds to a level-60 Lumifern III (' + JSON.stringify(st) + ').', rows };
const em = rows.find((r) => r.id === 'keeperemblem'), lens = rows.find((r) => r.id === 'entityeye'), charms = rows.filter((r) => r.slot === 'charm' && !r.unique);
out.summary = { emblem: em.sum, lens: lens.sum, bestNonUniqueCharm: charms[0].id + ' ' + charms[0].sum, emblemRank: rows.filter((r) => r.slot === 'charm').findIndex((r) => r.id === 'keeperemblem') + 1, sameAsLens: JSON.stringify(em.bonus) === JSON.stringify(lens.bonus) };
const f = process.argv[2] || path.join(__dirname, '..', 'docs', 'audit20c', 'emblem.json'); fs.writeFileSync(f, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.summary)); rows.filter((r) => r.slot === 'charm').slice(0, 8).forEach((r) => console.log(r.id.padEnd(14), r.rarity.padEnd(9), JSON.stringify(r.bonus), r.sum, JSON.stringify(r.onLumifern60)));
