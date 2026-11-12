// Phase 13C: equipment and the Forge (rules, no DOM). The rules are unchanged; this checks them (slots, bonuses,
// crafting, merging, the shop, battles, saves) and the read-outs in src/gear-view.js against what the rules really
// do. Run: node tests/gear13c.test.js
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, F = R.Forge, V = R.Gear, B = R.Battle;
R.rng = seeded(133);
const mk = (forgeLv) => { const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern'; W.validate(st); st.struct.forge = true; const b = st.buildings.forge; b.level = forgeLv == null ? 3 : forgeLv; b.state = 'built'; st.res.gold = 20000; st.res.food = 2000; st.res.gems = 100; return st; };
const snap = (st) => JSON.stringify(st), give = (st, id) => R.grantItem(st, id, 'test');
const KEYS = ['hp', 'atk', 'def', 'spd'];

/* ---- the data is what it was ---- */
ok(D.GEAR_SLOTS.join() === 'weapon,armour,charm' && Object.keys(D.ITEMS).length === 47 && Object.keys(D.GEAR_FAMILIES).length === 12 && D.MAX_ITEMS === 150, 'three slots, 47 items (12 lines and three unique items) and the 150-item bag are unchanged');
ok(JSON.stringify(D.ITEMS.driftclub.bonus) === '{"atk":0.06}' && JSON.stringify(D.ITEMS.titanmaul.bonus) === '{"atk":0.15}' && JSON.stringify(D.ITEMS.abyssplate.bonus) === '{"def":0.19,"hp":0.11}' && JSON.stringify(D.ITEMS.entityeye.bonus) === '{"hp":0.06,"atk":0.06,"def":0.06,"spd":0.06}', 'item bonuses are unchanged (spot checks across tiers and the unique items)');
ok(D.FORGE.recipes.length === 12 && D.FORGE.recipes.map((r) => r.cost.gold).join() === '120,150,140,120,100,110,130,220,380,520,450,450' && D.FORGE.shop.map((o) => o.price).join() === '180,220,200,180,160,200,220,480,480,520,900,900,950', 'the 12 recipes and 13 shop prices are unchanged');
ok(JSON.stringify(D.FORGE.merge) === '{"2":{"gold":60,"lv":1},"3":{"gold":180,"lv":2},"4":{"gold":450,"lv":3}}' && D.BUILDINGS.forge.levels.map((l) => l.cost.gold).join() === '300,1500,4500', 'merge costs (60, 180, 450 gold) and the Forge’s three levels are unchanged');

/* ---- equipping: the preview equals the result ---- */
let st = mk(), a = R.addAmina(st, 'lumifern', 11), b = R.addAmina(st, 'pyrokai', 8); R.drain();
let club = give(st, 'driftclub'), iron = give(st, 'ironclub'), vest = give(st, 'barkvest'), charm = give(st, 'moonbead');
let p = V.equipPreview(st, a.uid, club.iid), before = snap(st);
ok(p.ok && p.slot === 'weapon' && !p.current && !p.from && p.before.atk === 23 && p.after.atk === 24 && p.diff.atk === 1 && p.diff.hp === 0 && snap(st) === before, 'the preview shows the stat change of an item before it is equipped (ATK 23 → 24) and changes nothing');
let r = R.equip(st, a.uid, club.iid); ok(r.ok && JSON.stringify(R.statsWithGear(st, a)) === JSON.stringify(p.after) && R.partyFighter(st, a).atk === p.after.atk, 'equipping gives exactly the previewed stats, and the battle fighter has them');
p = V.equipPreview(st, a.uid, iron.iid); ok(p.ok && p.current.iid === club.iid && p.before.atk === 24 && p.after.atk === 25 && p.diff.atk === 1, 'swapping compares with the item already worn (Driftwood Club → Ironbound Club: ATK 24 → 25)');
r = R.equip(st, a.uid, iron.iid); ok(r.ok && a.gear.weapon === iron.iid && !R.wearer(st, club.iid) && R.item(st, club.iid) && R.statsWithGear(st, a).atk === p.after.atk, 'after the swap the old item is back in the bag, not lost');
p = V.equipPreview(st, b.uid, iron.iid); ok(p.ok && p.from.uid === a.uid && p.fromBefore.atk === 25 && p.fromAfter.atk === 23 && p.fromDiff.atk === -2 && p.diff.atk > 0, 'moving an item from another Amina shows what that Amina loses (ATK 25 → 23)');
r = R.equip(st, b.uid, iron.iid); ok(r.ok && r.movedFrom === a.uid && !a.gear.weapon && b.gear.weapon === iron.iid && JSON.stringify(R.statsWithGear(st, a)) === JSON.stringify(p.fromAfter) && JSON.stringify(R.statsWithGear(st, b)) === JSON.stringify(p.after) && V.integrity(st).ok, 'the move gives both Aminas the previewed stats; the item is worn by one Amina only');
p = V.equipPreview(st, b.uid, iron.iid); ok(!p.ok && p.reason === 'same', 'equipping what is already worn is refused');
p = V.unequipPreview(st, b.uid, 'weapon'); r = R.unequip(st, b.uid, 'weapon'); ok(p.ok && p.diff.atk < 0 && r.ok && JSON.stringify(R.statsWithGear(st, b)) === JSON.stringify(p.after) && R.item(st, iron.iid), 'removing shows the loss first, then gives exactly those stats; the item returns to the bag');
ok(!V.unequipPreview(st, b.uid, 'weapon').ok && V.unequipPreview(st, b.uid, 'weapon').reason === 'empty' && !R.unequip(st, b.uid, 'weapon').ok, 'an empty slot cannot be removed from');
// every item on a mid-level Amina: preview == result
{ let bad = 0, n = 0; Object.keys(D.ITEMS).forEach((id) => { const s2 = mk(), x = R.addAmina(s2, 'gaiaroki', 17), it = give(s2, id); const pv = V.equipPreview(s2, x.uid, it.iid); R.equip(s2, x.uid, it.iid); const now = R.statsWithGear(s2, x), f = R.partyFighter(s2, x); n++; if (!pv.ok || JSON.stringify(now) !== JSON.stringify(pv.after) || f.atk !== now.atk || f.def !== now.def || f.spd !== now.spd || f.hpMax !== now.hp || x.gear[D.ITEMS[id].slot] !== it.iid) bad++; });
  ok(bad === 0 && n === 47, 'for all 47 items the preview equals the stats after equipping and the stats the Amina fights with'); }
// three slots together: bonuses add once each
st = mk(); a = R.addAmina(st, 'lumifern', 20); [give(st, 'titanmaul'), give(st, 'abyssplate'), give(st, 'eclipseorb')].forEach((it) => R.equip(st, a.uid, it.iid));
const base = R.statsAt('lumifern', 20), eff = R.statsWithGear(st, a), f1 = R.partyFighter(st, a), f2 = R.partyFighter(st, a);
ok(eff.atk === Math.round(base.atk * 1.15) && eff.def === Math.round(base.def * (1 + 0.19 + 0.07)) && eff.hp === Math.round(base.hp * (1 + 0.11 + 0.12)) && eff.spd === base.spd && f1.atk === eff.atk && f2.atk === eff.atk && f1.hpMax === eff.hp, 'a full set adds each bonus once (weapon + armour + charm), in the details and in battle, however often a fighter is made');
ok(V.slots(st, a).map((x) => x.def.name).join() === 'Titan Maul,Abyss Plate,Eclipse Orb' && V.choices(st, a.uid, 'weapon').length === 1 && V.choices(st, a.uid, null).length === 3, 'the slot read-out lists what is worn; choices are filtered by slot');
// compatibility: any item fits any Amina
{ let bad = 0; D.ROSTER.filter((s) => s.stage === 1).forEach((sp) => { const s2 = mk(), x = R.addAmina(s2, sp.id, 6); ['driftclub', 'barkvest', 'suncharm'].forEach((id) => { const it = give(s2, id); if (!V.equipPreview(s2, x.uid, it.iid).ok || !R.equip(s2, x.uid, it.iid).ok) bad++; }); });
  ok(bad === 0, 'any item fits any Amina (all 21 lines can wear a weapon, an armour and a charm): there is no compatibility rule beyond the slot'); }
// locked during a dungeon run
st = mk(); a = R.addAmina(st, 'lumifern', 11); club = give(st, 'driftclub'); st.run = { d: 'forgottenroad', battle: 0, uids: [a.uid], hp: {} }; before = snap(st);
p = V.equipPreview(st, a.uid, club.iid); r = R.equip(st, a.uid, club.iid); ok(!p.ok && p.reason === 'busy' && !r.ok && snap(st) === before, 'equipment cannot be changed for an Amina in a dungeon run (refused, nothing changed)'); st.run = null;
// between battles: a change applies to the next fighter
R.equip(st, a.uid, club.iid); const fa = R.partyFighter(st, a).atk; R.unequip(st, a.uid, 'weapon'); const fb = R.partyFighter(st, a).atk; ok(fa === 24 && fb === 23, 'equipment changed between battles applies to the next battle (ATK 24 with the club, 23 without)');
// evolution keeps equipment
st = mk(); a = R.addAmina(st, 'lumifern', 12); club = give(st, 'driftclub'); R.equip(st, a.uid, club.iid); st.res.gold = 500; st.res.food = 500; r = R.evolve(st, a.uid); R.drain();
ok(r.ok && a.sp === 'solarbloom' && a.gear.weapon === club.iid && R.statsWithGear(st, a).atk === Math.round(R.statsAt('solarbloom', 12).atk * 1.06), 'evolving keeps the equipment, and the bonus applies to the new form');

/* ---- crafting ---- */
st = mk(1); st.res.gold = 200; st.res.food = 10; st.res.gems = 0;
p = V.craftPreview(st, 'driftclub'); ok(p.ok && p.lines.length === 1 && p.lines[0].need === 120 && p.lines[0].have === 200 && p.lines[0].after === 80 && p.owned === 0, 'a recipe shows its cost against what you have and what will be left (120 of 200 gold, 80 left)');
p = V.craftPreview(st, 'cinderfang'); ok(!p.ok && p.reason === 'cost' && p.lines.find((l) => l.k === 'gems').short === 1 && p.lines.find((l) => l.k === 'gold').ok, 'a recipe you cannot afford says exactly what is missing (1 gem)');
p = V.craftPreview(st, 'shellplate'); ok(!p.ok && p.reason === 'level' && p.need === 2 && !p.unlocked, 'a recipe above the Forge’s level is locked, with the level it needs');
before = snap(st); r = F.craft(st, 'cinderfang', F.newOp('t')); ok(!r.ok && snap(st) === before, 'crafting without the materials is refused and nothing is spent');
let op = F.newOp('t'); r = F.craft(st, 'driftclub', op); let r2 = F.craft(st, 'driftclub', op);
ok(r.ok && !r2.ok && r2.reason === 'duplicate' && st.res.gold === 80 && st.items.length === 1 && st.items[0].id === 'driftclub' && V.craftPreview(st, 'driftclub').owned === 1, 'crafting takes exactly the cost and gives one item; a repeated confirmation is refused (no second charge, no second item)');
{ let bad = 0; D.FORGE.recipes.forEach((rc) => { const s2 = mk(3), pv = V.craftPreview(s2, rc.item), r0 = Object.assign({}, s2.res), x = F.craft(s2, rc.item, F.newOp('t')); if (!pv.ok || !x.ok || s2.items.length !== 1 || s2.items[0].id !== rc.item) bad++; pv.lines.forEach((l) => { if (s2.res[l.k] !== l.after || r0[l.k] - s2.res[l.k] !== l.need) bad++; }); ['gold', 'food', 'gems'].forEach((k) => { if (!(rc.cost[k]) && s2.res[k] !== r0[k]) bad++; }); });
  ok(bad === 0, 'for all 12 recipes the balances after crafting equal the “after” column shown before confirming'); }
st = mk(3); for (let i = 0; i < D.MAX_ITEMS; i++) give(st, 'driftclub'); before = snap(st); p = V.craftPreview(st, 'driftclub'); r = F.craft(st, 'driftclub', F.newOp('t')); ok(!p.ok && p.reason === 'full' && !r.ok && snap(st) === before, 'a full bag (150 items) refuses crafting and spends nothing');

/* ---- shop ---- */
st = mk(1); st.res.gold = 200; p = V.buyPreview(st, 'driftclub'); ok(p.ok && p.price === 180 && p.lines[0].after === 20, 'the shop shows the price against your gold and what will be left (180 of 200, 20 left)');
p = V.buyPreview(st, 'cinderfang'); before = snap(st); r = F.buy(st, 'cinderfang', F.newOp('t')); ok(!p.ok && p.reason === 'gold' && p.lines[0].short === 20 && !r.ok && snap(st) === before, 'with too little gold the shop says how much more is needed (20) and a purchase changes nothing');
op = F.newOp('t'); r = F.buy(st, 'driftclub', op); r2 = F.buy(st, 'driftclub', op); ok(r.ok && !r2.ok && st.res.gold === 20 && st.res.food === 2000 && st.res.gems === 100 && st.items.length === 1, 'buying takes gold only, gives one item, and a repeated confirmation is refused');
ok(D.FORGE.shop.every((o) => Object.keys({ gold: o.price }).length === 1 && o.price > 0) && !Object.keys(D.FORGE).some((k) => /gem|premium/i.test(k)), 'the shop is gold only: nothing is sold for gems');

/* ---- merging ---- */
st = mk(1); a = R.addAmina(st, 'lumifern', 11); let c1 = give(st, 'driftclub'), c2 = give(st, 'driftclub'), c3 = give(st, 'driftclub'), v1 = give(st, 'barkvest'); st.res.gold = 100;
let m = V.mergeable(st); ok(m.length === 1 && m[0].id === 'driftclub' && m[0].count === 3 && m[0].result === 'ironclub' && m[0].ok && m[0].cost.gold === 60, 'the list of possible merges shows two matching items and their fixed result (2 × Driftwood Club → Ironbound Club, 60 gold)');
p = V.mergePreview(st, c1.iid, c2.iid); ok(p.ok && p.result === 'ironclub' && p.random === false && p.bonus[0].k === 'atk' && p.bonus[0].from === 0.06 && p.bonus[0].to === 0.09 && p.lines[0].after === 40 && !p.equipTo, 'a merge previews the one result (no chance involved), the bonus before and after (+6% → +9% ATK) and the gold left');
ok(!V.mergePreview(st, c1.iid, v1.iid).ok && V.mergePreview(st, c1.iid, v1.iid).reason === 'slot' && !V.mergePreview(st, c1.iid, c1.iid).ok && !F.merge(st, c1.iid, v1.iid, F.newOp('t')).ok, 'items of different kinds, or one item with itself, cannot merge');
R.equip(st, a.uid, c1.iid); p = V.mergePreview(st, c1.iid, c2.iid); ok(p.ok && p.equipTo.uid === a.uid && p.before.atk === 24 && p.after.atk === 25 && V.mergeable(st)[0].a !== c1.iid && V.mergeable(st)[0].b !== c1.iid, 'when an input is worn the preview shows its wearer’s stats with the result (ATK 24 → 25); the suggested pair prefers items in the bag');
before = snap(st); r = F.merge(st, c1.iid, c2.iid, F.newOp('t')); ok(!r.ok && r.reason === 'equipped' && snap(st) === before, 'merging a worn item needs the explicit confirmation; without it nothing changes');
op = F.newOp('t'); r = F.merge(st, c1.iid, c2.iid, op, { confirmEquipped: true }); r2 = F.merge(st, c1.iid, c2.iid, op, { confirmEquipped: true });
ok(r.ok && !r2.ok && st.res.gold === 40 && !R.item(st, c1.iid) && !R.item(st, c2.iid) && R.item(st, c3.iid) && st.items.filter((x) => x.id === 'ironclub').length === 1 && a.gear.weapon === r.item.iid && R.statsWithGear(st, a).atk === p.after.atk && V.integrity(st).ok, 'merging uses up exactly the two items and the gold, gives one result worn by the same Amina with the previewed stats, and cannot apply twice');
st.res.gold = 10; give(st, 'driftclub'); m = V.mergeable(st); ok(m.length === 1 && !m[0].ok && m[0].reason === 'gold', 'a merge you cannot afford is listed as not possible yet, with the reason');
st = mk(1); const i1 = give(st, 'ironclub'), i2 = give(st, 'ironclub'); p = V.mergePreview(st, i1.iid, i2.iid); ok(!p.ok && p.reason === 'level' && p.need === 2 && p.result === 'stoneclub', 'a merge above the Forge’s level shows the result and the level it needs');
st = mk(3); const u1 = give(st, 'stormglass'); ok(V.mergeable(st).length === 0 && !F.mergeResult('stormglass', 'stormglass').ok && !F.mergeResult('titanmaul', 'titanmaul').ok, 'unique and top-tier items cannot merge');
// merge chain: 8 tier I -> 1 tier IV, deterministic
st = mk(3); for (let i = 0; i < 8; i++) give(st, 'driftclub'); const gold0 = st.res.gold; let steps = 0; while (V.mergeable(st).length && steps++ < 20) { const x = V.mergeable(st)[0]; F.merge(st, x.a, x.b, F.newOp('t')); }
ok(st.items.length === 1 && st.items[0].id === 'titanmaul' && gold0 - st.res.gold === 4 * 60 + 2 * 180 + 450 && steps === 7 && V.integrity(st).ok, 'eight Driftwood Clubs merge into exactly one Titan Maul in seven merges for 1,050 gold: the same result every time');
// random actions never break the inventory
{ const s2 = mk(3), rng = seeded(7); const us = ['lumifern', 'pyrokai', 'kairyu', 'gaiaroki'].map((sp) => R.addAmina(s2, sp, 10).uid); let bad = 0, gains = 0, loss = 0;
  for (let i = 0; i < 1500; i++) { const k = Math.floor(rng() * 6), n0 = s2.items.length;
    if (k === 0) { const rc = D.FORGE.recipes[Math.floor(rng() * 12)]; if (F.craft(s2, rc.item, F.newOp('t')).ok) gains++; }
    else if (k === 1) { const o = D.FORGE.shop[Math.floor(rng() * 13)]; if (F.buy(s2, o.item, F.newOp('t')).ok) gains++; }
    else if (k === 2 && s2.items.length) R.equip(s2, us[Math.floor(rng() * 4)], s2.items[Math.floor(rng() * s2.items.length)].iid);
    else if (k === 3) R.unequip(s2, us[Math.floor(rng() * 4)], D.GEAR_SLOTS[Math.floor(rng() * 3)]);
    else if (k === 4) { const ms = V.mergeable(s2).filter((x) => x.ok); if (ms.length) { const x = ms[Math.floor(rng() * ms.length)]; if (F.merge(s2, x.a, x.b, F.newOp('t'), { confirmEquipped: true }).ok) loss++; } }
    else if (s2.items.length > 1) { const x = s2.items[Math.floor(rng() * s2.items.length)], y = s2.items[Math.floor(rng() * s2.items.length)]; if (F.merge(s2, x.iid, y.iid, F.newOp('t'), { confirmEquipped: true }).ok) loss++; }
    if (!V.integrity(s2).ok || s2.res.gold < 0 || s2.res.food < 0 || s2.res.gems < 0 || Math.abs(s2.items.length - n0) > 1) bad++; s2.res.gold = Math.max(s2.res.gold, 3000); s2.res.gems = Math.max(s2.res.gems, 20); s2.res.food = Math.max(s2.res.food, 200); }
  ok(bad === 0 && s2.items.length === gains - loss && gains > 100 && loss > 20, '1,500 random craft, buy, equip, remove and merge actions keep the inventory whole (' + gains + ' gained, ' + loss + ' merged away, ' + s2.items.length + ' left; no duplicates, nothing worn twice, no negative balances)'); }

/* ---- saves ---- */
st = mk(2); a = R.addAmina(st, 'lumifern', 11); club = give(st, 'driftclub'); vest = give(st, 'barkvest'); R.equip(st, a.uid, club.iid); F.craft(st, 'suncharm', F.newOp('t')); R.drain(); const statsB = JSON.stringify(R.statsWithGear(st, a)), itemsB = JSON.stringify(st.items);
S.state = st; S.save(); ok(S.load() && JSON.stringify(S.state.items) === itemsB && JSON.stringify(R.statsWithGear(S.state, R.inst(S.state, a.uid))) === statsB && V.integrity(S.state).ok, 'items, what is worn and the resulting stats are the same after saving and loading');
st = S.state; st.items.push({ iid: st.items[0].iid, id: 'driftclub' }, { iid: 999, id: 'nosuchitem' }); R.inst(st, a.uid).gear.armour = 4242; const x2 = R.addAmina(st, 'pyrokai', 5); x2.gear = { weapon: club.iid, armour: null, charm: null };
S.save(); S.load(); ok(V.integrity(S.state).ok && S.state.items.every((i) => D.ITEMS[i.id]) && new Set(S.state.items.map((i) => i.iid)).size === S.state.items.length, 'a damaged save is repaired on load: unknown and duplicate items are dropped, missing items are taken off, and no item is worn twice');
const old = S.fresh(); old.phase = 'play'; W.validate(old); R.addAmina(old, 'lumifern', 5); delete old.items; delete old.forge; old.aminas.forEach((x) => delete x.gear); S.state = old; S.save();
ok(S.load() && Array.isArray(S.state.items) && V.integrity(S.state).ok && V.slots(S.state, S.state.aminas[0]).every((x) => !x.item) && JSON.stringify(R.statsWithGear(S.state, S.state.aminas[0])) === JSON.stringify(R.statsAt('lumifern', 5)), 'a save from before equipment loads with an empty bag and base stats');
st = mk(); a = R.addAmina(st, 'lumifern', 11); club = give(st, 'driftclub'); const s1 = snap(st); V.equipPreview(st, a.uid, club.iid); V.unequipPreview(st, a.uid, 'weapon'); V.choices(st, a.uid); V.slots(st, a); V.craftPreview(st, 'driftclub'); V.buyPreview(st, 'driftclub'); V.mergeable(st); V.mergePreview(st, club.iid, club.iid); V.integrity(st);
ok(snap(st) === s1, 'the read-outs never change the game');
done('gear13c');
