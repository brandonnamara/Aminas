/* Aminas — Phase 17D: reasons to come back (pure rules, no DOM).
   1. Daily tasks: three optional tasks a day, picked from things the player can already do. Nothing is lost by skipping
      a day (there are no streaks), a finished task can still be claimed the next day, and every claim pays once.
   2. Codex milestones: one-time rewards for befriending species, evolved forms and complete evolution lines, read from
      the Codex (st.owned), which releasing a duplicate never touches. Only species that can be obtained count.
   3. Dungeon challenges: three optional goals for a full replay (from battle 1) of a dungeon already cleared.
      Each pays once; normal rewards, progression and difficulty are untouched.
   4. Starter guidance: what the party picker says about a small party (advice only; nothing is forced).
   Days follow the device's local date and never go backwards: if the clock is turned back, today's tasks stay. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, E = A.Economy;
  const now = () => (R.now ? R.now() : Date.now());
  const W = () => A.World;
  const dayNum = (t) => { const d = new Date(t); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  R.dayNum = dayNum;
  const giveRes = (st, rw) => { const res = {}; ['gold', 'food', 'gems'].forEach((k) => { if (rw[k]) res[k] = rw[k]; }); if (Object.keys(res).length) E.gain(st, res); if (rw.ess) Object.keys(rw.ess).forEach((el) => R.Essence.gain(st, el, rw.ess[el], 'reward')); };

  /* ====================================================================== counters */
  // Counted only from Phase 17D on, in their own record (st.d17.c), from events the game already emits.
  const rec = (st) => { st.d17 = st.d17 && typeof st.d17 === 'object' ? st.d17 : {}; st.d17.c = st.d17.c || {}; return st.d17; };
  const COUNT = { battleWon: 'battles', fed: 'feed', collected: 'collect', moveUp: 'moveUp', hatched: 'hatch', raidWon: 'raid', explored: 'explore', found: 'explore' };
  R.on((ev) => { const st = A.State && A.State.state, k = COUNT[ev.name]; if (!st || !k) return; const c = rec(st).c; c[k] = (c[k] | 0) + 1; });
  // Island Defence: a won raid is announced (resolveRaid had no event of its own)
  if (R.PvP && R.PvP.resolveRaid) { const rr0 = R.PvP.resolveRaid; R.PvP.resolveRaid = function (st, b) { const r = rr0.apply(this, arguments); if (r && r.win && !r.invalid && b && b.raidTarget) R.emit('raidWon', { target: b.raidTarget }); return r; }; }

  /* ====================================================================== 1. daily tasks */
  D.DAILY17 = {
    gate: 'forgottenroad', // daily tasks appear once the first dungeon is cleared, so they never crowd the opening
    perDay: 3,
    bonus: { gems: 2 },     // for claiming all of a day's tasks
    tasks: {
      battles: { title: 'Dungeon patrol', desc: 'Win 3 dungeon battles. Any dungeon counts, replays included.', need: 3, reward: { gold: 90, food: 15 }, go: 'dungeons' },
      feed:    { title: 'Snack time', desc: 'Feed your Aminas twice.', need: 2, reward: { gold: 50, food: 20 }, go: 'collection' },
      collect: { title: 'Rounds of the island', desc: 'Collect from your buildings 3 times.', need: 3, reward: { gold: 60, food: 20 }, go: 'island' },
      moveUp:  { title: 'Practice makes perfect', desc: 'Upgrade a move with essence.', need: 1, reward: { gold: 80 }, go: 'collection' },
      hatch:   { title: 'New arrival', desc: 'Hatch an egg.', need: 1, reward: { gold: 70, food: 25 }, go: 'hatchery' },
      raid:    { title: 'Island Defence', desc: 'Win an Island Defence raid.', need: 1, reward: { gold: 90 }, go: 'defence' },
      explore: { title: 'Out and about', desc: 'Explore 3 times. Any open area counts.', need: 3, reward: { gold: 50, food: 15 }, go: 'explore' },
    },
    order: ['battles', 'feed', 'collect', 'moveUp', 'hatch', 'raid', 'explore'],
    carryMax: 3, // finished-but-unclaimed tasks kept from earlier days
  };
  const DY = (R.Daily = {});
  // Can the player do this task today with what they already have? (No task ever needs a locked island or feature.)
  DY.available = function (st, k) {
    switch (k) {
      case 'battles': return Object.keys(D.DUNGEONS).some((id) => R.dungeonUnlocked(st, id));
      case 'feed': return st.aminas.length > 0;
      case 'collect': return Object.values(st.buildings || {}).some((b) => b && b.level >= 1 && b.state !== 'stored' && b.state !== 'ruined' && b.state !== 'constructing' && W().def(b).produces);
      case 'moveUp': return st.aminas.some((a) => [0, 1, 2].some((sl) => { const m = R.moveInfo && R.moveInfo(st, a, sl); return m && m.ok; }));
      case 'hatch': return !!st.struct.hatchery && (R.eggs(st).length > 0 || st.aminas.filter((a) => a.lv >= D.BREED_MIN_LEVEL).length >= 2);
      case 'raid': return st.aminas.length >= D.PVP.defenceSize;
      case 'explore': return D.AREA_ORDER.some((id) => R.areaUnlocked(st, id));
      default: return false;
    }
  };
  DY.unlocked = (st) => R.dungeonCleared(st, D.DAILY17.gate);
  const hash = (n) => { let x = (n ^ 0x9e3779b9) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0; x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0; return (x ^ (x >>> 16)) >>> 0; };
  function pick(st, day) {
    const r = rec(st); if (r.salt == null) r.salt = Math.floor(Math.random() * 1e9);
    const pool = D.DAILY17.order.filter((k) => DY.available(st, k));
    let seed = hash(day + r.salt); const out = [];
    while (pool.length && out.length < D.DAILY17.perDay) { seed = hash(seed); out.push(pool.splice(seed % pool.length, 1)[0]); }
    return out.map((k) => ({ k, need: D.DAILY17.tasks[k].need, from: r.c[k] | 0, claimed: false }));
  }
  // Brings the day up to date: a new local date gets a new set; a clock turned back keeps the current set.
  DY.sync = function (st, t) {
    if (!st || st.phase !== 'play' || !DY.unlocked(st)) return null;
    const r = rec(st), day = dayNum(t == null ? now() : t);
    if (r.daily && r.daily.day >= day) return r.daily;
    if (r.daily) {
      // finished tasks that were never claimed stay claimable (at most carryMax, newest first); unfinished ones lapse
      const keep = r.daily.tasks.filter((x) => !x.claimed && DY.cur(st, x) >= x.need).map((x) => Object.assign({ day: r.daily.day }, x));
      r.carry = keep.concat(r.carry || []).slice(0, D.DAILY17.carryMax);
    }
    r.daily = { day, tasks: pick(st, day), bonus: false };
    return r.daily;
  };
  DY.cur = (st, x) => Math.max(0, (rec(st).c[x.k] | 0) - (x.from | 0));
  const view = (st, x, day) => { const T = D.DAILY17.tasks[x.k], cur = Math.min(x.need, DY.cur(st, x)); return { id: day + ':' + x.k, k: x.k, day, title: T.title, desc: T.desc, need: x.need, cur, reward: T.reward, go: T.go, claimed: !!x.claimed, ready: !x.claimed && cur >= x.need }; };
  DY.list = function (st, t) {
    const d = DY.sync(st, t); if (!d) return null; const r = rec(st);
    const today = d.tasks.map((x) => view(st, x, d.day)), carry = (r.carry || []).map((x) => Object.assign(view(st, x, x.day), { carried: true }));
    const all = d.tasks.length > 0 && d.tasks.every((x) => x.claimed);
    return { day: d.day, today, carry, bonus: { reward: D.DAILY17.bonus, ready: all && !d.bonus, claimed: !!d.bonus } };
  };
  DY.ready = (st) => { const l = DY.list(st); return l ? l.today.filter((x) => x.ready).length + l.carry.filter((x) => x.ready).length + (l.bonus.ready ? 1 : 0) : 0; };
  // Claim by id ('<day>:<task>' or '<day>:bonus'). Pays exactly once; anything stale or unfinished is refused.
  DY.claim = function (st, id) {
    const d = DY.sync(st); if (!d) return { ok: false, reason: 'locked' };
    const r = rec(st), [dayS, k] = String(id).split(':'), day = +dayS;
    if (k === 'bonus') {
      if (day !== d.day || d.bonus || !d.tasks.length || !d.tasks.every((x) => x.claimed)) return { ok: false, reason: d.bonus ? 'claimed' : 'notyet' };
      d.bonus = true; giveRes(st, D.DAILY17.bonus); R.emit('dailyClaimed', { id, bonus: true }); return { ok: true, reward: Object.assign({}, D.DAILY17.bonus) };
    }
    const fromCarry = day !== d.day, list = fromCarry ? (r.carry || []) : d.tasks, x = list.find((y) => y.k === k && (!fromCarry || y.day === day));
    if (!x) return { ok: false, reason: 'invalid' };
    if (x.claimed) return { ok: false, reason: 'claimed' };
    if (DY.cur(st, x) < x.need) return { ok: false, reason: 'notyet' };
    x.claimed = true; const rw = D.DAILY17.tasks[k].reward; giveRes(st, rw);
    if (fromCarry) r.carry = r.carry.filter((y) => y !== x);
    st.stats.dailies = (st.stats.dailies | 0) + 1;
    R.emit('dailyClaimed', { id }); return { ok: true, reward: Object.assign({}, rw) };
  };

  /* ====================================================================== 2. Codex milestones */
  // A species counts toward milestones when it can be obtained in the game as it is: a starter, found in an area that
  // exists, given by a playable dungeon, hatched from a pairing, or evolved from one of those.
  R.obtainable = function (spId) {
    const sp = D.SPECIES[spId]; if (!sp) return false;
    if (sp.stage > 1) { const base = D.ROSTER.find((x) => x.line === sp.line && x.stage === 1); return !!base && R.obtainable(base.id); }
    return (sp.src || []).some((s) => s.t === 'starter' || s.t === 'gift' || s.t === 'breed' || (s.t === 'area' && D.AREAS[s.area]) || (s.t === 'dungeon'));
  };
  const pool = () => D.ROSTER.filter((x) => R.obtainable(x.id));
  const owned = (st) => pool().filter((x) => st.owned && st.owned[x.id]);
  const lines = () => { const L = {}; pool().forEach((x) => (L[x.line] = L[x.line] || []).push(x.id)); return L; };
  const CX = (R.Codex = {});
  CX.counts = function (st) {
    const all = pool(), mine = owned(st), L = lines();
    return { species: mine.length, total: all.length, evolved: mine.filter((x) => x.stage > 1).length, evolvedTotal: all.filter((x) => x.stage > 1).length,
      lines: Object.keys(L).filter((k) => L[k].every((id) => st.owned[id])).length, linesTotal: Object.keys(L).length };
  };
  // Goals as percentages resolve against what can be obtained, so a species that cannot be had is never required.
  D.CODEX17 = [
    { id: 'sp5', track: 'species', goal: 5, title: 'Five friends', reward: { gold: 100, gems: 1 } },
    { id: 'sp10', track: 'species', goal: 10, title: 'Ten friends', reward: { gold: 150, gems: 2 } },
    { id: 'sp25', track: 'species', pct: 25, title: 'A quarter of the Codex', reward: { gold: 250, gems: 3 } },
    { id: 'sp50', track: 'species', pct: 50, title: 'Half the Codex', reward: { gold: 400, gems: 5 } },
    { id: 'sp75', track: 'species', pct: 75, title: 'Three quarters of the Codex', reward: { gold: 600, gems: 8 } },
    { id: 'sp100', track: 'species', pct: 100, title: 'The complete Codex', reward: { gold: 1000, gems: 15 } },
    { id: 'ev1', track: 'evolved', goal: 1, title: 'A new form', reward: { gold: 80, gems: 1 } },
    { id: 'ev5', track: 'evolved', goal: 5, title: 'Five evolved forms', reward: { gold: 200, gems: 2 } },
    { id: 'ev15', track: 'evolved', goal: 15, title: 'Fifteen evolved forms', reward: { gold: 400, gems: 4 } },
    { id: 'ev30', track: 'evolved', goal: 30, title: 'Thirty evolved forms', reward: { gold: 700, gems: 6 } },
    { id: 'ln1', track: 'lines', goal: 1, title: 'A whole family', reward: { gold: 150, gems: 2 } },
    { id: 'ln3', track: 'lines', goal: 3, title: 'Three whole families', reward: { gold: 300, gems: 3 } },
    { id: 'ln7', track: 'lines', goal: 7, title: 'Seven whole families', reward: { gold: 500, gems: 5 } },
    { id: 'ln14', track: 'lines', goal: 14, title: 'Fourteen whole families', reward: { gold: 800, gems: 8 } },
    { id: 'lnAll', track: 'lines', pct: 100, title: 'Every family', reward: { gold: 1200, gems: 12 } },
  ];
  D.CODEX17_TRACKS = { species: { name: 'Species befriended', of: 'total' }, evolved: { name: 'Evolved forms', of: 'evolvedTotal' }, lines: { name: 'Complete evolution lines', of: 'linesTotal' } };
  CX.goal = (m, c) => (m.pct ? Math.max(1, Math.ceil(c[D.CODEX17_TRACKS[m.track].of] * m.pct / 100)) : Math.min(m.goal, c[D.CODEX17_TRACKS[m.track].of]));
  CX.list = function (st) {
    const c = CX.counts(st), got = (st.d17 && st.d17.codex) || {};
    return D.CODEX17.map((m) => { const goal = CX.goal(m, c), cur = Math.min(goal, c[m.track]); return { id: m.id, track: m.track, title: m.title, goal, cur, reward: m.reward, claimed: !!got[m.id], ready: !got[m.id] && cur >= goal }; });
  };
  CX.ready = (st) => CX.list(st).filter((m) => m.ready).length;
  CX.claim = function (st, id) {
    const m = CX.list(st).find((x) => x.id === id); if (!m) return { ok: false, reason: 'invalid' };
    if (m.claimed) return { ok: false, reason: 'claimed' }; if (!m.ready) return { ok: false, reason: 'notyet' };
    const r = rec(st); r.codex = r.codex || {}; r.codex[id] = now() || 1; giveRes(st, m.reward);
    R.emit('codexMilestone', { id }); return { ok: true, reward: Object.assign({}, m.reward) };
  };

  /* ====================================================================== 3. dungeon challenges */
  D.CHALLENGE17 = {
    reward: { gold: 100, essence: 6 }, // each challenge, once per dungeon (essence of the dungeon's element)
    allThree: { gems: 2 },             // once per dungeon, when its three challenges are done
    list: {
      flawless: { name: 'Flawless', desc: 'No Amina faints in any of the ten battles.' },
      kindred: { name: 'One element', desc: 'Your party is three Aminas of one element.' },
      guardian: { name: 'Answer the guardian', desc: 'Blunt the guardian’s charged move (guard it, soak it or stun it), then win.', barrier: 'Break the guardian’s barrier with a special move, then win.' },
    },
  };
  const CH = (R.Challenge = {});
  CH.ids = ['flawless', 'kindred', 'guardian'];
  CH.open = (st, id) => R.dungeonCleared(st, id); // challenges are for replays of a dungeon already cleared
  CH.desc = (id, k) => { const L = D.CHALLENGE17.list[k], boss = D.DUNGEONS[id].battles[D.DUNGEONS[id].battles.length - 1]; return k === 'guardian' && !boss.move && boss.mech && boss.mech.type === 'barrier' ? L.barrier : L.desc; };
  CH.status = function (st, id) {
    const done = (rec(st).ch || {})[id] || {};
    return { open: CH.open(st, id), list: CH.ids.map((k) => ({ k, name: D.CHALLENGE17.list[k].name, desc: CH.desc(id, k), done: !!done[k] })), all: !!done.all,
      reward: { gold: D.CHALLENGE17.reward.gold, ess: { [D.DUNGEONS[id].el]: D.CHALLENGE17.reward.essence } }, allReward: D.CHALLENGE17.allThree };
  };
  CH.kindred = (st, uids) => uids.length === 3 && uids.every((u) => { const a = R.inst(st, u); return a && D.SPECIES[a.sp].el === D.SPECIES[R.inst(st, uids[0]).sp].el; });
  // Called once a full replay clears the dungeon: records what this run achieved and pays each new challenge once.
  CH.complete = function (st, id, run) {
    const r = rec(st); r.ch = r.ch || {}; const done = (r.ch[id] = r.ch[id] || {}), fresh = [];
    const met = { flawless: !run.c17.lost, kindred: CH.kindred(st, run.uids), guardian: !!run.c17.blunt };
    CH.ids.forEach((k) => { if (met[k] && !done[k]) { done[k] = now() || 1; fresh.push(k); giveRes(st, { gold: D.CHALLENGE17.reward.gold, ess: { [D.DUNGEONS[id].el]: D.CHALLENGE17.reward.essence } }); } });
    let all = false; if (!done.all && CH.ids.every((k) => done[k])) { done.all = now() || 1; all = true; giveRes(st, D.CHALLENGE17.allThree); }
    if (fresh.length) R.emit('challengeDone', { d: id, list: fresh, all });
    return { met, fresh, all, el: D.DUNGEONS[id].el };
  };
  // runs remember their challenge record from the first battle; runs from before this update are not eligible
  const sr0 = R.startRun;
  R.startRun = function (st) { const r = sr0.apply(this, arguments); if (r && r.ok && st.run) st.run.c17 = { lost: false, blunt: false }; return r; };
  const B = R.Battle, act0 = B.act;
  B.act = function (b, action) {
    const e = b && b.enemy, wasCh = !!(e && e.boss && e.charging), ev = act0.apply(this, arguments);
    if (e && e.boss && !b.c17blunt) for (const x of ev) {
      if ((x.t === 'hit' && x.who === 'p' && x.big && x.guarded) || (x.t === 'hold' && x.who === 'e') || (x.t === 'stagger' && x.who === 'e') || (x.t === 'stunned' && x.who === 'e' && wasCh) || (x.t === 'shieldHit' && x.who === 'e' && x.broke && x.special)) { b.c17blunt = true; break; }
    }
    return ev;
  };
  const rb0 = R.resolveBattle;
  R.resolveBattle = function (st, b) {
    const run = st && st.run; let pre = null;
    if (run && b && b.over) {
      if (!run.c17) run.c17 = { lost: false, blunt: false, legacy: true };
      if (b.result === 'win') { if ((b.party || []).some((f) => f.hp <= 0)) run.c17.lost = true; if (b.c17blunt) run.c17.blunt = true; }
      pre = { d: run.d, start: run.start | 0, uids: (run.uids || []).slice(), c17: Object.assign({}, run.c17), wasCleared: R.dungeonCleared(st, run.d) };
    }
    const out = rb0.apply(this, arguments);
    if (pre && out && out.win && out.cleared && !out.partial && pre.wasCleared && pre.start === 0 && !pre.c17.legacy) out.challenges = CH.complete(st, pre.d, pre);
    return out;
  };

  // saves: the Phase 17D record always has a valid shape (older saves simply start without one)
  if (A.State && A.State.sanitize) { const san0 = A.State.sanitize; A.State.sanitize = function (st) { const r = san0.apply(this, arguments);
    if (st.d17 != null) { if (typeof st.d17 !== 'object') st.d17 = {}; const d = st.d17; if (!d.c || typeof d.c !== 'object') d.c = {};
      if (d.daily && !(Array.isArray(d.daily.tasks) && typeof d.daily.day === 'number')) delete d.daily; if (d.carry && !Array.isArray(d.carry)) d.carry = [];
      if (d.codex && typeof d.codex !== 'object') d.codex = {}; if (d.ch && typeof d.ch !== 'object') d.ch = {}; }
    return r; }; }

  /* ====================================================================== 4. starter guidance */
  // Advice for the party picker. It never blocks a choice; it only says what tends to help.
  R.partyAdvice = function (st, id, uids) {
    const d = D.DUNGEONS[id]; if (!d) return null;
    const n = uids.length, have = st.aminas.length, hard = d.index >= 3 || d.recommended >= 6;
    if (n >= 3) return null;
    if (have > n) return { k: 'room', t: 'You can bring up to three. A second Amina takes hits while the first recovers, and covers more elements.' };
    if (!hard && n >= 2) return null;
    return { k: 'recruit', t: (n === 1 ? 'A lone Amina has no one to switch to when it tires. ' : '') + 'Explore finds new Aminas (the Sunlit Meadow has two near the start), and the Hatchery breeds more. A party of three makes guardians much easier.', hard };
  };
})(typeof window !== 'undefined' ? window : globalThis);
