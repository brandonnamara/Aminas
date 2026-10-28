// Dev 7 Forge rules: crafting, merging, shop, equipment in battle, save safety, migration.
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, B = R.Battle, F = R.Forge;
const fresh = (forgeLv) => {
  const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern'; st.introDone = true;
  ['hollow', 'tidegate', 'hatchery'].forEach((id) => { st.struct[id] = true; st.buildings[id].level = 1; st.buildings[id].state = 'built'; });
  if (forgeLv) { st.struct.forge = true; st.buildings.forge.level = forgeLv; st.buildings.forge.state = 'built'; }
  st.res = { gold: 5000, food: 500, gems: 50 }; return st;
};
const snap = (st) => JSON.stringify({ res: st.res, items: st.items, gear: st.aminas.map((a) => a.gear) });

/* ---------- the building ---------- */
let st = S.fresh();
ok(st.buildings.forge && st.buildings.forge.state === 'ruined' && st.buildings.forge.island === 'starter', 'a new game has the Old Forge ruin on the starter island');
ok(W.canPlace(st, 'starter', 'forge', st.buildings.forge.x, st.buildings.forge.y, 0, 'forge').ok, 'it sits on free, buildable land (no path, obstacle or building under it)');
ok(!F.open(st) && W.restoreInfo(st, 'forge').reason === 'locked', 'it is locked until the Hatchery is restored');
st = fresh(0);
ok(W.restoreInfo(st, 'forge').ok && W.restore(st, 'forge').ok && F.level(st) === 1 && st.struct.forge, 'after the Hatchery it can be restored (level 1)');
ok(W.upgradeInfo(st, 'forge').ok, 'and upgraded through the normal building system');
ok(!D.STRUCT_ORDER.includes('forge'), 'the Forge does not change the story chain ("restore all" quests keep their count)');

/* ---------- crafting ---------- */
st = fresh(1); const g0 = st.res.gold, f0 = st.res.food;
const op1 = F.newOp('t');
let r = F.craft(st, 'barkvest', op1);
ok(r.ok && st.items.length === 1 && st.items[0].id === 'barkvest', 'crafting adds the item to the inventory');
ok(st.res.gold === g0 - 120 && st.res.food === f0 - 15, 'and takes exactly its cost (120 gold, 15 food)');
const s1 = snap(st); r = F.craft(st, 'barkvest', op1);
ok(!r.ok && r.reason === 'duplicate' && snap(st) === s1, 'the same request twice (double tap) is applied once');
ok(F.craftCheck(st, 'barkaxe').reason === 'level' && !F.craft(st, 'barkaxe', F.newOp('t')).ok, 'recipes above the Forge level are refused');
st.res = { gold: 50, food: 0, gems: 0 }; const s2 = snap(st);
r = F.craft(st, 'driftclub', F.newOp('t')); ok(!r.ok && r.reason === 'cost' && snap(st) === s2, 'not enough resources: nothing changes');
ok(!F.craft(st, 'stormglass', F.newOp('t')).ok && !F.craft(st, 'nonsense', F.newOp('t')).ok, 'unique and unknown items cannot be crafted');
ok(D.FORGE.recipes.every((x) => D.ITEMS[x.item] && !D.ITEMS[x.item].unique && Object.keys(x.cost).every((k) => ['gold', 'food', 'gems'].includes(k))), 'every recipe uses existing resources and a real item');

/* ---------- shop ---------- */
st = fresh(1); st.res.gold = 200;
r = F.buy(st, 'driftclub', 'buy-1');
ok(r.ok && st.res.gold === 20 && st.items.length === 1, 'buying charges the gold price once and adds the item');
ok(!F.buy(st, 'driftclub', 'buy-1').ok && st.res.gold === 20 && st.items.length === 1, 'a repeated purchase request is refused');
const s3 = snap(st); r = F.buy(st, 'cinderfang', 'buy-2');
ok(!r.ok && r.reason === 'gold' && snap(st) === s3, 'not enough gold: the purchase fails safely');
ok(F.buyCheck(fresh(1), 'tidespear').reason === 'level' && F.buyCheck(fresh(3), 'tidespear').ok, 'stronger stock opens with Forge level 3');
ok(D.FORGE.shop.every((o) => D.ITEMS[o.item] && o.price > 0 && !D.ITEMS[o.item].unique), 'the shop sells real, non-unique items for gold');
ok(D.FORGE.shop.every((o) => { const rc = F.recipe(o.item); return !rc || o.price > rc.cost.gold; }), 'shop prices sit above the gold part of crafting');

/* ---------- merging ---------- */
st = fresh(1);
const a = R.grantItem(st, 'driftclub'), b = R.grantItem(st, 'driftclub'), c = R.grantItem(st, 'barkvest'), d = R.grantItem(st, 'stormglass'), e = R.grantItem(st, 'ironclub');
const mon = R.addAmina(st, 'gaiaroki', 10), mon2 = R.addAmina(st, 'kairyu', 10);
let chk = F.mergeCheck(st, a.iid, b.iid);
ok(chk.ok && chk.result === 'ironclub' && chk.tier === 2 && chk.cost.gold === 60, 'two Tier I Driftwood Clubs preview an Ironbound Club (Tier II) for 60 gold');
const bad = [[a.iid, c.iid, 'slot'], [a.iid, e.iid, 'tier'], [a.iid, d.iid, 'unique'], [a.iid, a.iid, 'same'], [a.iid, 9999, 'owned']];
const s4 = snap(st);
bad.forEach(([x, y, why]) => { const m = F.merge(st, x, y, F.newOp('t'), { confirmEquipped: true }); ok(!m.ok && m.reason === why, 'refused: ' + why + ' (' + F.why(m) + ')'); });
ok(snap(st) === s4, 'invalid merges never consume items or gold');
R.equip(st, mon.uid, a.iid);
let m = F.merge(st, a.iid, b.iid, 'm-1');
ok(!m.ok && m.reason === 'equipped' && snap(st) !== s4 && R.item(st, a.iid), 'merging an equipped item needs explicit confirmation first (nothing consumed)');
const goldBefore = st.res.gold;
m = F.merge(st, a.iid, b.iid, 'm-1', { confirmEquipped: true });
ok(m.ok && m.item.id === 'ironclub' && !R.item(st, a.iid) && !R.item(st, b.iid), 'a merge consumes both inputs and grants one Ironbound Club');
ok(st.res.gold === goldBefore - 60, 'and charges the merge cost once');
ok(mon.gear.weapon === m.item.iid, 'the result goes back onto the Amina that wore the input');
ok(!F.merge(st, a.iid, b.iid, 'm-1', { confirmEquipped: true }).ok && st.items.filter((x) => x.id === 'ironclub').length === 2, 'replaying the merge request does nothing');
// tier gating and the top tier
const t2a = R.grantItem(st, 'ironclub'); ok(F.mergeCheck(st, e.iid, t2a.iid).reason === 'level', 'Tier III merges need Forge level 2');
st.buildings.forge.level = 3; const t3a = R.grantItem(st, 'titanmaul'), t3b = R.grantItem(st, 'titanmaul');
ok(F.mergeCheck(st, t3a.iid, t3b.iid).reason === 'max', 'the top tier cannot be merged further');
ok(F.mergeCheck(st, e.iid, t2a.iid).ok && F.mergeCheck(st, e.iid, t2a.iid).result === 'stoneclub', 'at Forge level 2+ two Tier II clubs make a Tier III Stonebreaker');
// two wearers: both lose it, the first wearer gets the result
const s1a = R.grantItem(st, 'suncharm'), s1b = R.grantItem(st, 'suncharm'); R.equip(st, mon.uid, s1a.iid); R.equip(st, mon2.uid, s1b.iid);
m = F.merge(st, s1a.iid, s1b.iid, F.newOp('t'), { confirmEquipped: true });
ok(m.ok && mon.gear.charm === m.item.iid && mon2.gear.charm === null, 'when both inputs are worn, the result goes to the first wearer and the other slot is emptied');
// during a run
const v1 = R.grantItem(st, 'barkvest'), v2 = R.grantItem(st, 'barkvest'); R.equip(st, mon2.uid, v1.iid);
st.run = { d: 'forgottenroad', battle: 0, uids: [mon2.uid], hp: {} };
ok(F.mergeCheck(st, v1.iid, v2.iid).reason === 'busy', 'items worn in an ongoing dungeon run cannot be merged');
st.run = null;
// atomic: a failure part-way restores everything
const s5 = snap(st), inst0 = R.inst; R.inst = (s, u) => { if (u === mon2.uid) throw new Error('boom'); return inst0(s, u); };
m = F.merge(st, v1.iid, v2.iid, F.newOp('t'), { confirmEquipped: true }); R.inst = inst0;
ok(!m.ok && m.reason === 'failed' && snap(st) === s5, 'a merge that fails part-way leaves items, equipment and gold exactly as they were');
// data rules
const fams = Object.values(D.GEAR_FAMILIES);
ok(fams.every((f) => f.tiers.every((id, i) => !id || (D.ITEMS[id].tier === i + 1 && D.ITEMS[id].family === f.id && D.ITEMS[id].slot === f.slot))), 'every family has consistent tiers and one slot');
ok(fams.every((f) => f.tiers.filter(Boolean).every((id, i, arr) => i === 0 || Object.values(D.ITEMS[id].bonus).reduce((x, y) => x + y, 0) > Object.values(D.ITEMS[arr[i - 1]].bonus).reduce((x, y) => x + y, 0))), 'each tier is stronger than the one before');
ok(Object.values(D.ITEMS).every((x) => Object.values(x.bonus).reduce((p, q) => p + q, 0) <= 0.30 + 1e-9), 'no single item adds more than +30% in total (bounded power)');
ok(['driftclub', 'emberfang', 'tidespear', 'rootsplit', 'barkvest', 'shellplate', 'mossmantle', 'obsidmail', 'suncharm', 'moonbead', 'echoshell', 'feathertok', 'stormglass', 'coralaegis', 'entityeye'].every((id) => D.ITEMS[id]), 'every v0.7 item still exists');

/* ---------- equipment in battle ---------- */
st = fresh(1); const x = R.addAmina(st, 'pyrokai', 12); F.craft(st, 'cinderfang', F.newOp('t'));
const base = B.fighter('pyrokai', 12); R.equip(st, x.uid, st.items[0].iid);
const geared = R.partyFighter(st, x);
ok(geared.atk === Math.round(R.statsAt('pyrokai', 12).atk * 1.07) && geared.atk > base.atk, 'a crafted Cinder Fang raises the real attack stat used in battle');
const foe = () => R.enemyFromSpec({ sp: 'acinus', lv: 12 });
const dmg = (f) => { const bb = B.create([f], foe(), { rng: seeded(5) }); return B.damage(f, bb.enemy, D.ABILITIES.emberflick, seeded(9)).dmg; };
ok(dmg(geared) > dmg(B.fighter('pyrokai', 12)), 'and the damage it deals');
R.startRun(st, 'forgottenroad', [x.uid]); const b1 = R.createBattle(st, seeded(1)), b2 = R.createBattle(st, seeded(1));
ok(b1.party[0].atk === geared.atk && b2.party[0].atk === geared.atk, 'restarting a battle never applies the bonus twice');
st.run = null; R.unequip(st, x.uid, 'weapon'); ok(R.partyFighter(st, x).atk === base.atk, 'unequipping removes the bonus');
R.equip(st, x.uid, st.items[0].iid); x.lv = 12; st.res.gold = 999; st.res.food = 99; ok(R.evolve(st, x.uid).ok && x.gear.weapon === st.items[0].iid && R.partyFighter(st, x).atk === Math.round(R.statsAt('emberkai', 12).atk * 1.07), 'equipment stays on through evolution and keeps working');
const sv = R.Survival.start(st, [x.uid]); ok(sv.ok && R.Survival.createBattle(st, seeded(2)).party[0].atk === Math.round(R.statsAt('emberkai', 12).atk * 1.07), 'Survival uses the same equipment bonus');
st.survival.run = null; R.PvP.setRoster && R.PvP.setRoster(st, [x.uid]);

/* ---------- save / load ---------- */
st = fresh(2); const y = R.addAmina(st, 'acinus', 8); F.craft(st, 'shellplate', F.newOp('t')); F.buy(st, 'ironbark', F.newOp('t')); R.equip(st, y.uid, st.items[0].iid);
S.state = st; S.save(); const back = S.hydrate(JSON.parse(G._store[D.SAVE_KEY])).st;
ok(back.items.length === 2 && R.inst(back, y.uid).gear.armour === st.items[0].iid && back.res.gold === st.res.gold && back.forge.ops.length === 2, 'items, equipment, gold and Forge history survive save and load');
ok(back.buildings.forge.level === 2 && back.struct.forge, 'the Forge keeps its level');
const opsSt = fresh(1); for (let i = 0; i < 50; i++) { opsSt.res.gold = 999; F.craft(opsSt, 'driftclub', 'op' + i); } ok(opsSt.forge.ops.length === D.FORGE.opsKept, 'only the recent operation ids are kept (save stays small)');

/* ---------- migration from v0.7 (schema 4) ---------- */
const v07 = fresh(0); v07.schema = 4; delete v07.forge; delete v07.buildings.forge;
v07.items = [{ iid: 1, id: 'tidespear' }, { iid: 2, id: 'stormglass' }]; v07.nextIid = 3; const k = R.addAmina(v07, 'kairyu', 9); k.gear = { weapon: 1, armour: null, charm: null };
const mig = S.hydrate(JSON.parse(JSON.stringify(v07))).st;
ok(mig.schema === S.SCHEMA && mig.buildings.forge && mig.buildings.forge.state === 'ruined' && mig.forge && Array.isArray(mig.forge.ops), 'a v0.7 save gains the Forge ruin and empty Forge records');
ok(mig.items.length === 2 && R.inst(mig, k.uid).gear.weapon === 1 && mig.res.gold === v07.res.gold, 'its items, equipment and gold are unchanged');
// a player who built on the Forge's default spot keeps their building; the ruin moves to the nearest free spot
const crowd = fresh(0); crowd.schema = 4; delete crowd.forge; delete crowd.buildings.forge;
const fp = D.DEFAULT_POS.forge; crowd.buildings.b1 = { id: 'b1', type: 'mine', island: 'starter', x: fp[0], y: fp[1], rot: 0, level: 1, state: 'built', residents: [], last: 0, stock: 0 }; crowd.nextBid = 2;
const mc = S.hydrate(JSON.parse(JSON.stringify(crowd))).st;
ok(mc.buildings.b1.x === fp[0] && mc.buildings.b1.y === fp[1] && mc.buildings.forge && W.canPlace(mc, 'starter', 'forge', mc.buildings.forge.x, mc.buildings.forge.y, 0, 'forge').ok, 'if the spot is taken, the player’s building stays and the Forge goes to the nearest free spot');
done('forge');
