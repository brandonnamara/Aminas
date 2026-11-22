// Phase 16B, rules side (Node): save export / import validation / apply / undo, the text settings, and the quest
// tracker's dungeon-in-progress rule. Run: node tests/savefile16b.test.js
const { load, seeded, ok, done } = require('./harness');
const c = load(); c.atob = (b) => Buffer.from(b, 'base64').toString('binary'); c.btoa = (t) => Buffer.from(t, 'binary').toString('base64'); // as in a browser
const A = c.A, D = A.Data, R = A.Rules, S = A.State, F = A.SaveFile, Q = A.Quests, ls = c.localStorage;

/* ---------- a real game to export ---------- */
const mk = () => { const s = S.fresh(); s.phase = 'play'; s.starter = 'umbrit'; s.avatar = { made: true, name: 'Rowan', look: null }; R.addAmina(s, 'umbrit', 9); R.addAmina(s, 'acinus', 4); s.res.gold = 1234; s.res.food = 56; s.res.gems = 7; s.missions.m_hollow = 'claimed'; s.dungeon.forgottenroad = { clears: 1, next: 0 }; R.drain(); return S.hydrate(s).st; };
S.state = mk(); S.save();
const ex = F.exportFile();
ok(ex.ok && /^aminas-save-Rowan-\d{8}-\d{4}\.json$/.test(ex.name), 'export names the file after the player and the time (' + ex.name + ')');
const env = JSON.parse(ex.text);
ok(env.format === 'aminas-save' && env.fileVersion === 1 && env.schema === S.SCHEMA && env.checksum === F.checksum(JSON.stringify(env.save)), 'the file says what it is, which save version it holds, and carries a checksum');
ok(JSON.stringify(env.save) === JSON.stringify(S.state), 'the file holds the complete save, unchanged');
ok(!F.exportFile(S.fresh()).ok, 'a game with no starter yet cannot be exported');

/* ---------- validation: good files ---------- */
const p1 = F.parse(ex.text);
ok(p1.ok && p1.kind === 'file' && p1.summary.name === 'Rowan' && p1.summary.aminas === 2 && p1.summary.gold === 1234 && p1.summary.dungeons === 1, 'its own export reads back, with a correct summary');
ok(JSON.stringify(p1.st.aminas) === JSON.stringify(S.state.aminas) && JSON.stringify(p1.st.res) === JSON.stringify(S.state.res) && JSON.stringify(p1.st.missions) === JSON.stringify(S.state.missions), 'Aminas, resources and quest states round-trip exactly');
const raw = ls.getItem(D.SAVE_KEY);
ok(F.parse(raw).ok && F.parse(raw).kind === 'raw', 'a raw save (the JSON the game stores) is accepted');
ok(F.parse(S.exportCode()).ok && F.parse(S.exportCode()).kind === 'code', 'an existing AMINAS1: backup code is accepted');
ok(F.parse('﻿' + ex.text + '\n').ok, 'a byte-order mark or trailing newline does not matter');
// an older save is migrated exactly as on load
const old = JSON.parse(raw); old.schema = 5; delete old.avatar; delete old.essence; delete old.ach;
const p5 = F.parse(JSON.stringify(old));
ok(p5.ok && p5.migratedFrom === 5 && p5.st.schema === S.SCHEMA && p5.warnings.some((w) => /older version/.test(w)), 'an older save version is accepted and updated, with a note');

/* ---------- validation: bad files are refused, with reasons ---------- */
const bad = [
  ['', 'empty'], ['not json at all', 'not-json'], ['[1,2,3]', 'not-save'], ['{"hello":1}', 'not-save'], ['{"format":"something-else","save":{}}', 'not-save'],
  ['AMINAS1:@@@notbase64', 'bad-code'], [JSON.stringify(Object.assign({}, env, { fileVersion: 99 })), 'newer-file'], [JSON.stringify(Object.assign({}, env, { save: null })), 'no-save'],
  [JSON.stringify(Object.assign({}, env, { save: Object.assign({}, env.save, { res: Object.assign({}, env.save.res, { gold: 999999 }) }) })), 'checksum'],
  [JSON.stringify(Object.assign({}, JSON.parse(raw), { schema: S.SCHEMA + 1 })), 'newer-schema'], [JSON.stringify(Object.assign({}, JSON.parse(raw), { aminas: 'x' })), 'not-save'],
  [JSON.stringify(S.fresh()), 'no-game'], [ex.text.slice(0, ex.text.length / 2), 'not-json'], ['x'.repeat(F.MAX_BYTES + 1), 'too-large'], [null, 'unreadable'],
];
bad.forEach(([t, why]) => { const p = F.parse(t); ok(!p.ok && p.reason === why && typeof p.msg === 'string' && p.msg.length > 10, 'refused (' + why + '): "' + (p.msg || '').slice(0, 70) + '"'); });
ok(bad.every(([t]) => { try { F.parse(t); return true; } catch (e) { return false; } }), 'no file, however broken, can make import throw');
const before = ls.getItem(D.SAVE_KEY); bad.forEach(([t]) => F.parse(t));
ok(ls.getItem(D.SAVE_KEY) === before && JSON.stringify(S.state) === JSON.stringify(JSON.parse(before)), 'checking a file never changes the current game or the stored save');

/* ---------- apply, recovery and undo ---------- */
const other = mk(); other.avatar.name = 'Ivy'; other.res.gold = 50; R.addAmina(other, 'emberix', 2); const otherText = JSON.stringify(other);
const cur = ls.getItem(D.SAVE_KEY);
ok(F.recovery() === null, 'before any import there is no recovery copy');
const ap = F.apply(F.parse(otherText));
ok(ap.ok && S.state.avatar.name === 'Ivy' && S.state.aminas.length === 3 && JSON.parse(ls.getItem(D.SAVE_KEY)).avatar.name === 'Ivy', 'applying makes the imported save the current one and writes it');
const rec = F.recovery();
ok(rec && rec.summary && rec.summary.name === 'Rowan' && rec.summary.gold === 1234, 'the replaced save is kept, with its summary');
S.state.res.gold += 5; S.save(); S.save(); S.save();
ok(F.recovery().summary.name === 'Rowan', 'ordinary saving never overwrites the recovery copy (unlike the backup slot)');
const un = F.undoImport();
ok(un.ok && S.state.avatar.name === 'Rowan' && S.state.res.gold === 1234 && JSON.parse(ls.getItem(D.SAVE_KEY)).avatar.name === 'Rowan', 'undo puts the earlier game back exactly');
ok(F.recovery().summary.name === 'Ivy', 'and keeps the undone game, so undo can itself be undone');
ok(JSON.stringify(JSON.parse(cur).aminas) === JSON.stringify(S.state.aminas), 'the restored game has the same Aminas as before the import');
ok(!F.apply({ ok: false }).ok, 'an unchecked or refused file can never be applied');

/* ---------- settings ---------- */
const fr = S.fresh(); ok(fr.settings.textSize === 'normal' && fr.settings.textSpeed === 'normal', 'new games start with standard text size and normal speed');
const sz = S.hydrate(Object.assign(JSON.parse(raw), { settings: Object.assign({}, JSON.parse(raw).settings, { textSize: 'huge', textSpeed: 'warp' }) })).st;
ok(sz.settings.textSize === 'normal' && sz.settings.textSpeed === 'normal', 'unknown text settings are repaired to the defaults');
const si = S.hydrate(Object.assign(JSON.parse(raw), { settings: Object.assign({}, JSON.parse(raw).settings, { textSize: 'larger', textSpeed: 'instant' }) })).st;
ok(si.settings.textSize === 'larger' && si.settings.textSpeed === 'instant', 'Instant speed and Larger text are kept');
const legacy = JSON.parse(raw); delete legacy.settings.textSize; ok(S.hydrate(legacy).st.settings.textSize === 'normal', 'older saves without a text size get the standard size');

/* ---------- quest tracker: a dungeon you are partway through is tracked first ---------- */
const q = S.fresh(); q.starter = 'lumifern'; R.addAmina(q, 'lumifern', 4); R.addAmina(q, 'acinus', 2); q.struct.hollow = true;
['m_hollow', 'm_feed', 'm_lv3', 'm_find'].forEach((id) => (q.missions[id] = 'claimed')); Q.scan(q);
ok(Q.current(q).id === 'm_clear', 'before the road is started, the tracker keeps the existing order (Clear the Way)');
R.startRun(q, 'forgottenroad', q.aminas.map((a) => a.uid));
ok(Q.current(q).id === 'm_road' && Q.dungeonStep(q, Q.current(q)) === 'Battle 1 of 10', 'once inside the Forgotten Road, it tracks The Forgotten Road (Battle 1 of 10)');
const b = R.createBattle(q, seeded(3)); let g = 0; while (!b.over && g++ < 80) { if (b.pending) { R.Battle.act(b, { t: 'sw', to: b.party.findIndex((f) => f.hp > 0) }); continue; } const l = R.Battle.legal(b).filter((a) => a.ready); R.Battle.act(b, { t: 'ab', id: l[0].id }); }
R.resolveBattle(q, b); R.abandonRun(q);
ok(b.result === 'win' && Q.current(q).id === 'm_road' && Q.dungeonStep(q, Q.current(q)) === 'Battle 2 of 10', 'after leaving with one battle won it still tracks the road (Battle 2 of 10)');
const claimsBefore = JSON.stringify(q.missions), resBefore = JSON.stringify(q.res);
ok(Q.status(q, Q.get('m_clear')) === 'active' && Q.status(q, Q.get('m_road')) === 'active', 'nothing is locked or unlocked differently: both quests stay open');
q.dungeon.forgottenroad.clears = 1; q.dungeon.forgottenroad.next = 0; Q.scan(q);
ok(Q.current(q).id === 'm_road' && Q.status(q, Q.get('m_road')) === 'ready', 'when the road is cleared, its quest is ready to claim and still first');
const cl = Q.claim(q, 'm_road');
ok(cl.ok && cl.reward.gold === Q.get('m_road').reward.gold && Q.current(q).id === 'm_clear', 'claiming pays the existing reward and the tracker returns to the existing order');
ok(JSON.stringify(Object.assign({}, JSON.parse(claimsBefore), { m_road: 'claimed' })) === JSON.stringify(q.missions), 'only the claimed quest changed state');
// no in-progress dungeon: identical to the old rule for every quest-state combination reachable in order
let same = true; const z = S.fresh(); z.starter = 'umbrit'; R.addAmina(z, 'umbrit', 30);
D.QUESTS.filter((x) => !x.side).forEach((x) => { const old = D.QUESTS.filter((y) => !y.side).find((y) => z.missions[y.id] !== 'claimed' && Q.status(z, y) !== 'locked') || null; if ((old && old.id) !== (Q.current(z) && Q.current(z).id)) same = false; z.missions[x.id] = 'claimed'; });
ok(same, 'with no dungeon in progress the tracked quest is exactly the old rule’s, at every step of the main chain');
done('savefile16b');
