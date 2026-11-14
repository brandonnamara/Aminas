/* Aminas — Phase 16A: first-time player experience (rules side, no DOM).
   A developer switch (A.Onboard16, separate from the Phase 15 switch, off by default) turns on the new opening:
   cinematic, refined Entity dialogue, the Light/Dark starter choice and a short guided prologue. With the switch off
   nothing here runs and nothing is written to the save.

   The save gains one optional record, st.onboard. It is created only for a game started with the switch on; older
   saves never get one and are treated as established players (no prologue, no replayed introduction). No schema
   change and no migration: the loader keeps unknown fields, and a save without the record behaves exactly as before.

   The prologue is a list of steps. Each step is worked out from real game state every time it is read, so it can
   never disagree with what the player actually did, and doing things in another order never leaves anyone stuck.
   Four steps are the existing quests (Sunlit Hollow, First Meal, Growing Pains, A Friend of the Meadow): their rewards
   are the quests' own and are claimed exactly as before. The other steps give no rewards at all. */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = A.Data;
  const O = (A.Onboard16 = {});
  const R = () => A.Rules, Q = () => A.Quests;

  /* ---------- the switch (developer builds only; remembered in this browser, never in the save) ---------- */
  const KEY = 'aminas.onboard16';
  const devOK = !!(D && D.DEV_TOOLS);
  let on = false;
  try {
    const q = root.location ? root.location.search + ' ' + root.location.hash : '';
    on = devOK && (/[?&]p16=1\b/.test(q) || /#p16\b/.test(q) || (root.localStorage && root.localStorage.getItem(KEY) === '1'));
  } catch (e) { on = false; }
  O.enabled = () => on;
  O.set = function (v) { on = !!v && devOK; try { if (root.localStorage) root.localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} return on; };

  /* ---------- the record ---------- */
  O.V = 1;
  O.fresh = () => ({ v: O.V, at: 'avatar', cine: 0, met: false, seen: {}, tips: {}, done: false, startedAt: Date.now() });
  O.rec = (st) => (st && st.onboard && typeof st.onboard === 'object' ? st.onboard : null);
  // Starts the record for a brand-new game (called by the new-game flow when the switch is on).
  O.begin = function (st) { st.onboard = O.fresh(); return st.onboard; };
  // where a new game that has not chosen its starter yet should resume: 'avatar' | 'cine' | 'starter'
  O.resumeAt = function (st) {
    const o = O.rec(st); if (!o || (st && st.starter)) return null;
    if (!(st.avatar && st.avatar.made)) return 'avatar';
    if (o.cine < 2) return 'cine';
    return 'starter';
  };
  O.mark = function (st, k) { const o = O.rec(st); if (!o) return false; if (o.seen[k]) return false; o.seen[k] = Date.now(); return true; };
  O.tip = function (st, k) { const o = O.rec(st); if (!o || o.done) return false; if (o.tips[k]) return false; o.tips[k] = Date.now(); return true; };
  O.tipSeen = (st, k) => { const o = O.rec(st); return !!(o && o.tips[k]); };

  /* ---------- who is this player? ---------- */
  // 'new'          no starter yet, never started this flow (or the switch is off)
  // 'interrupted'  started the new flow and stopped before choosing a starter
  // 'partial'      has a starter, prologue not finished
  // 'complete'     prologue finished
  // 'established'  a save from before Phase 16A (or made with the switch off): never shown the prologue
  O.kind = function (st) {
    const o = O.rec(st);
    if (!st || !st.starter) return o ? 'interrupted' : 'new';
    if (!o) return 'established';
    return o.done ? 'complete' : 'partial';
  };
  O.active = (st) => on && O.kind(st) === 'partial';

  /* ---------- the prologue ---------- */
  const road = (st) => (st.dungeon && st.dungeon.forgottenroad) || { clears: 0, next: 0 };
  const roadStarted = (st) => !!((st.run && st.run.d === 'forgottenroad') || road(st).next > 0 || road(st).clears > 0 || (st.counters && st.counters['stages.forgottenroad']));
  const firstWin = (st) => (st.stats && st.stats.wins > 0) || road(st).next > 0 || road(st).clears > 0;
  const qClaimed = (st, id) => st.missions && st.missions[id] === 'claimed';
  // soft steps teach where something is; once the player has clearly moved past them they count as passed
  O.STEPS = [
    { id: 'meet', label: 'Meet the Entity', done: (st, o) => !!(o.met || st.starter) },
    { id: 'choose', label: 'Choose your Amina', done: (st) => !!st.starter },
    { id: 'inspect', label: 'Look at your companion', soft: true, done: (st, o) => !!o.seen.inspect, hint: 'Tap Creatures, then your companion.' },
    { id: 'hollow', quest: 'm_hollow' },
    { id: 'feed', quest: 'm_feed' },
    { id: 'grow', quest: 'm_lv3' },
    { id: 'friend', quest: 'm_find' },
    { id: 'battle', label: 'Open the Battle menu', soft: true, done: (st, o) => !!o.seen.battle || roadStarted(st), hint: 'Tap Battle, the triangle at the bottom.' },
    { id: 'road', label: 'Enter the Forgotten Road', done: (st) => roadStarted(st), hint: 'Battle, then Dungeons, then the Forgotten Road.' },
    { id: 'win', label: 'Win your first battle', done: (st) => firstWin(st), hint: 'Pick a move. Strong moves are marked ▲.' },
    { id: 'home', label: 'Return to the sanctuary', soft: true, done: (st, o) => !!o.seen.home, hint: 'Leave the dungeon when you are ready. Your progress is kept.' },
    { id: 'next', label: 'Hear what comes next', done: (st, o) => !!o.seen.handoff },
  ];
  O.stepLabel = (s) => (s.quest ? (Q().get(s.quest) || { title: s.quest }).title : s.label);
  O.steps = function (st) {
    const o = O.rec(st) || O.fresh(), raw = O.STEPS.map((s) => {
      let done;
      if (s.quest) done = qClaimed(st, s.quest);
      else done = !!s.done(st, o);
      return { id: s.id, quest: s.quest || null, soft: !!s.soft, label: O.stepLabel(s), hint: s.hint || '', done };
    });
    // a soft step counts as passed once any step after it is done
    for (let i = 0; i < raw.length; i++) if (raw[i].soft && !raw[i].done && raw.slice(i + 1).some((x) => x.done && !x.soft)) { raw[i].done = true; raw[i].passed = true; }
    return raw;
  };
  O.current = function (st) { if (!O.active(st)) return null; const list = O.steps(st), i = list.findIndex((x) => !x.done); return i < 0 ? null : Object.assign({ n: i + 1, of: list.length }, list[i]); };
  // Called after every action (UI.afterAction). Finishes the prologue when every step is done, or when the player is
  // already well past it (the Forgotten Road cleared), so it can never linger. Returns true if it just finished.
  O.update = function (st) {
    const o = O.rec(st); if (!o || o.done || !st.starter) return false;
    if (o.at !== 'play') o.at = 'play';
    const list = O.steps(st);
    if (list.every((x) => x.done) || road(st).clears > 0) { o.done = true; o.doneAt = Date.now(); return true; }
    return false;
  };

  /* ---------- the starters (only real data: no invented numbers) ---------- */
  O.STARTERS = ['lumifern', 'umbrit'];
  // What the selection screen says about a starter's fighting style, worked out from its real level-1 stats compared
  // with the other starter, and its real moves. Nothing here changes any number.
  O.starterFacts = function (id) {
    const other = id === 'lumifern' ? 'umbrit' : 'lumifern', a = R().statsAt(id, 1), b = R().statsAt(other, 1), sp = D.SPECIES[id];
    const names = { hp: 'Health', atk: 'Attack', def: 'Defence', spd: 'Speed' };
    const more = Object.keys(names).filter((k) => a[k] > b[k]).map((k) => names[k]);
    const moves = (sp.abil || []).map((m) => D.ABILITIES[m]).filter(Boolean).map((ab) => ({ name: ab.name, el: ab.el, type: ab.type, cd: ab.cd || 0, power: ab.power || 0 }));
    return { id, name: sp.name, el: sp.el, stats: a, more, moves, strong: (D.STRONG[sp.el] || []).slice(), weakTo: Object.keys(D.STRONG).filter((k) => (D.STRONG[k] || []).indexOf(sp.el) >= 0) };
  };
  // Chooses the starter exactly once. Same rules as the original selection: one Amina at level 1, the starter flag,
  // phase 'play'. A second call (double tap, a stale button) does nothing.
  O.chooseStarter = function (st, id) {
    if (!st || st.starter || O.STARTERS.indexOf(id) < 0) return { ok: false, reason: st && st.starter ? 'chosen' : 'invalid' };
    st.starter = id; st.phase = 'play'; R().addAmina(st, id, 1);
    const o = O.rec(st); if (o) { o.at = 'play'; o.met = true; o.choseAt = Date.now(); }
    return { ok: true };
  };
  /* ---------- the words (Phase 16A) ----------
     The Entity: dry, tired, reluctant, secretive, useful. It calls Aminas Kind Souls. It never names or explains what it
     suspects about the player; it slips, then changes the subject. It never explains the starters' quarrel. */
  const L = (m, x) => [m, x];
  O.WORDS = {
    captions: ['Some places were never meant to meet.', 'They met anyway.'],
    arrival: [
      L('*', 'A ring of light fades from the grass. You are standing in the middle of it.'),
      L('s', '…You again.'),
      L('a', 'No. That isn’t quite right. I don’t believe we’ve met.'),
      L('t', 'I’m the Entity. I look after this island. It looks after me back, when it remembers to.'),
      L('you', 'I’m {name}. Where is this?'),
      L('w', '{name}. Fine. This is the sanctuary. My island, for my sins.'),
      L('a', 'It came a very long way to be here. So, by the look of you, did you.'),
      L('t', 'Since the Resonance— since things changed, the island has been collecting strays. Shores from somewhere else. Kind Souls in the wrong forests. You’ll get used to it. I haven’t.'),
      L('n', 'Kind Souls. Aminas, if you insist on being formal. The small ones who live here. Some are considerably kinder than others.'),
      L('t', 'Two of them have been waiting for someone to take an interest. I’d rather it wasn’t you, but I’ve been told not to be choosy.'),
    ],
    resume: [L('t', 'Where were we. Ah. You were about to choose. Take your time. Not too much of it.')],
    starterIntro: [
      L('n', 'Lumifern. Umbrit. Light and Dark, if you like labels.'),
      L('a', 'They were inseparable once, those two lines. Once.'),
      L('t', 'Don’t ask. Pick one. The other will manage. It has had centuries of practice.'),
    ],
    starterAside: {
      lumifern: L('n', 'Lumifern. Holds sunlight in its leaves like a miser. Gentle, until it decides it isn’t.'),
      umbrit: L('w', 'Umbrit. Small, dark, suspicious of everyone. We get along perfectly.'),
    },
    starterChosen: {
      lumifern: [
        L('n', 'Lumifern. Good. It likes you already, which says more about it than about you.'),
        L('*', 'For a moment, both of them look at you instead of at each other.'),
        L('s', '…Hm. They don’t usually agree on anything.'),
        L('t', 'Never mind. Your companion needs a home. The Sunlit Hollow, the ruin by the plaza. Start there.'),
      ],
      umbrit: [
        L('n', 'Umbrit. Of course. The quiet ones always find each other.'),
        L('*', 'For a moment, both of them look at you instead of at each other.'),
        L('s', '…Hm. They don’t usually agree on anything.'),
        L('t', 'Never mind. Your companion needs a home. The Sunlit Hollow, the ruin by the plaza. Start there.'),
      ],
    },
    inspect: 'Yes, that’s your companion. Health, attack, defence, speed. And opinions. The opinions aren’t listed.',
    battleMenu: 'The Battle menu. Dungeons first. The guardians in there at least have an excuse.',
    dungeons: [
      L('n', 'Dungeons. Ten on this island, ten battles in each.'),
      L('t', 'The tenth battle is the guardian. Beat it and the dungeon is cleared. Beat the last guardian on the island and the island lets you go further. Islands are like that.'),
      L('w', 'Lose, and you start again at the battle that beat you, not at the beginning. I’m not a monster.'),
      L('n', 'Start with the Forgotten Road. It expects Kind Souls around level {rec}. Bring a friend.'),
    ],
    hatchery: 'The Hatchery. Two Kind Souls, one egg, and a great deal of waiting. I don’t ask how. Neither should you.',
    forge: 'The Forge. Old, hot and temperamental. It makes and mends equipment. Don’t lean on it.',
    handoff: [
      L('n', 'Back in one piece. Mostly.'),
      L('a', 'You held that line like someone who had done it before. Have you?'),
      L('*', 'The Entity doesn’t wait for an answer.'),
      L('t', 'The road has more battles and a guardian at the end. Finish it when you’re ready; it will keep your place.'),
      L('n', 'Your tasks are top left. I’ll stop hovering now. Try to look as if you’ll miss it.'),
    ],
    coach: {
      moves: 'Your move. Tap an attack.',
      health: 'These bars are health. Empty theirs before they empty yours.',
      turn: 'Whose turn it is, and who acts first. The faster one goes first.',
      element: '▲ Strong and ▼ Weak are elements. {a} hits {b} harder.',
      elementWeak: '▼ Weak: {b} shrugs off {a}. Another move may do better.',
      special: 'Special moves recharge. The number is turns until it’s ready.',
      status: 'Status effects sit here. Tap one to read what it does.',
      boss: 'The guardian. Watch the top of the screen: it warns you before its big moves.',
      win: 'Saved. A battle you win stays won. You can stop and come back.',
      section: 'First time through a section pays extra. Replays don’t.',
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
