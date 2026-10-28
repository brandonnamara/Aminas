// Baseline check of the v0.5 rules before the dungeon work (kept as a regression test).
const { load, seeded, ok, done } = require('./harness');
const G = load(), A = G.A, D = A.Data, R = A.Rules, S = A.State;
const st = S.fresh(); st.phase = 'play'; st.starter = 'lumifern';
R.addAmina(st, 'lumifern', 8); R.addAmina(st, 'emberkit', 8); R.addAmina(st, 'ripplet', 8);
ok(Object.keys(D.SPECIES).length === 28, '28 species');
ok(D.DUNGEON_ORDER.length >= 3, 'dungeons defined: ' + D.DUNGEON_ORDER.join(','));
st.struct.reliquarygate = true;
// v0.6: dungeons open in order, so the two dungeons before the Reliquary count as cleared here
st.dungeon.forgottenroad = { clears: 1 }; st.dungeon.gatheringhall = { clears: 1 };
ok(R.dungeonUnlocked(st, 'reliquary'), 'reliquary unlocks with the gate');
const r = R.startRun(st, 'reliquary', st.aminas.map((a) => a.uid)); ok(r.ok, 'run starts');
let guard = 0, last;
while (st.run && guard++ < 40) { const b = R.createBattle(st, seeded(guard)); let t = 0; while (!b.over && t++ < 80) { if (b.pending) { const i = b.party.findIndex((p) => p.hp > 0); R.Battle.act(b, { t: 'sw', to: i }); continue; } const l = R.Battle.legal(b).find((x) => x.ready); R.Battle.act(b, { t: 'ab', id: l.id }); } last = R.resolveBattle(st, b); if (!last.win) break; }
ok(last && (last.cleared || !last.win), 'run resolves (cleared=' + (last && last.cleared) + ')');
done('baseline');
