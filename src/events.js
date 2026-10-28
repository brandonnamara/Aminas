/* Aminas — seasonal events (v0.4). Each season is data: a yearly date window (device local time), a short task
   chain, a limited decoration you can keep once its last task is claimed, and festival dressing for the island.
   Outside its window a season does nothing. Its tasks are ordinary quests with per-year ids (ev_<season>_<year>_<key>),
   so progress, claims and saves go through the existing quest system unchanged. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data;
  const Ev = (A.Events = {});
  const o = (type, extra) => Object.assign({ id: 'o1', type }, extra || {});

  D.SEASONS = {
    duskfall: {
      name: 'Duskfall Festival', from: [10, 20], to: [11, 9], color: '#ffb05a', decor: 'festlantern',
      blurb: 'Once a year the Spire’s shadow stretches across the whole sanctuary. The Aminas light lanterns so nobody loses their way home.',
      quests: [
        { key: 'lanterns', title: 'Lanterns for the Lost', desc: 'The festival needs lantern oil and full bellies. Gather gold and share a few meals.',
          objectives: [o('collect', { resource: 'gold', amount: 300, hint: 'Collect gold from your mines and habitats.' }), o('feed', { id: 'o2', count: 3, fresh: true, hint: 'Feed any Amina three times during the festival.' })], reward: { food: 30, gems: 2 } },
        { key: 'shadow', title: 'Into the Long Shadow', desc: 'The shadows are longest in the dungeons. Push through a few dungeon sections while the lanterns burn.', after: ['lanterns'],
          objectives: [o('dungeon_stage', { dungeon: 'any', count: 3, hint: 'Clear any three dungeon sections.' })], reward: { gold: 250, gems: 3 } },
        { key: 'home', title: 'Light the Way Home', desc: 'Hang a Duskfall Lantern on your island. Keep it: it will remember the way next year too.', after: ['shadow'],
          objectives: [o('place', { building: 'festlantern', count: 1, hint: 'Open Build, Decor, and place a Duskfall Lantern.' }), o('hatch', { id: 'o2', count: 1, fresh: true, optional: true, hint: 'Hatch an egg during the festival.' })],
          reward: { gold: 150, gems: 5 }, keep: 'festlantern' },
      ],
    },
  };
  // The festival's own decoration: buildable while the season runs, and forever once its last task is claimed.
  D.BUILDINGS.festlantern = { id: 'festlantern', name: 'Duskfall Lantern', cat: 'decor', w: 1, h: 1, canMove: true, canStore: true, canRotate: true, req: { struct: 'hollow' }, maxCount: 6, art: 'festlantern', season: 'duskfall',
    desc: 'A paper lantern on a crooked pole. Lit for the Duskfall Festival; it never quite goes out.', levels: [{ cost: { gold: 60 }, time: 0 }] };
  if (D.CATALOG.indexOf('festlantern') < 0) D.CATALOG.push('festlantern');

  Ev.now = () => Date.now(); // tests replace this to travel in time
  const DAY = 864e5;
  // The window of a season that contains time t, or the next one to come. Windows may cross New Year.
  Ev.window = function (id, t) {
    const s = D.SEASONS[id]; if (!s) return null;
    const now = t == null ? Ev.now() : t, y = new Date(now).getFullYear();
    for (const yy of [y - 1, y, y + 1]) {
      const start = +new Date(yy, s.from[0] - 1, s.from[1]); let end = +new Date(yy, s.to[0] - 1, s.to[1], 23, 59, 59, 999);
      if (end < start) end = +new Date(yy + 1, s.to[0] - 1, s.to[1], 23, 59, 59, 999);
      if (now <= end) return { id, year: yy, start, end, active: now >= start, daysLeft: Math.max(0, Math.ceil((end - now) / DAY)), startsIn: Math.max(0, Math.ceil((start - now) / DAY)) };
    }
    return null;
  };
  Ev.active = (t) => Object.keys(D.SEASONS).map((id) => Ev.window(id, t)).filter((w) => w && w.active);
  Ev.isActive = (id, year, t) => { const w = Ev.window(id, t); return !!(w && w.active && (year == null || w.year === year)); };
  Ev.questId = (w, key) => 'ev_' + w.id + '_' + w.year + '_' + key;
  const cache = {};
  // Quest objects for the seasons running now (stable objects per season-year, so the quest system can cache baselines).
  Ev.quests = function (t) {
    const out = [];
    Ev.active(t).forEach((w) => {
      const k = w.id + '_' + w.year;
      if (!cache[k]) cache[k] = D.SEASONS[w.id].quests.map((q) => Object.assign({}, q, { id: Ev.questId(w, q.key), after: (q.after || []).map((a) => Ev.questId(w, a)), side: true, season: w.id, year: w.year }));
      out.push(...cache[k]);
    });
    return out;
  };
  // A seasonal building is available while its season runs, or for good once the player earned it.
  Ev.buildable = function (st, typeId, t) {
    const d = D.BUILDINGS[typeId]; if (!d || !d.season) return true;
    return Ev.isActive(d.season, null, t) || !!(st.flags && st.flags['keep_' + typeId]);
  };
})(typeof window !== 'undefined' ? window : globalThis);
