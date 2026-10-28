/* Aminas — Dev 8: achievements (pure rules). The game had no achievement system before, so each achievement here is
   worked out from data the game already tracks (owned species, stats, dungeon records, buildings, Forge and move
   levels). Progress is read from the save, never invented; st.ach only records when each one was first earned.
   Two achievements count things the game only started counting in Dev 8 (essence gathered, move upgrades); their
   descriptions say so. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules;
  const cleared = (st) => Object.keys(D.DUNGEONS).filter((id) => R.dungeonCleared(st, id)).length;
  const own = (st) => Object.keys(st.owned || {}).filter((k) => D.SPECIES[k]).length;
  const finalForms = (st) => Object.keys(st.owned || {}).filter((k) => D.SPECIES[k] && D.SPECIES[k].stage === 3).length;
  const built = (st) => Object.values(st.buildings || {}).filter((b) => b && b.level >= 1 && b.state !== 'stored' && b.state !== 'ruined' && (D.STORY_BUILDINGS || []).indexOf(b.type) < 0).length;
  const forged = (st) => { const f = (st.forge && st.forge.stats) || {}; return (f.crafted | 0) + (f.merged | 0) + (f.bought | 0); };
  const topMove = (st) => (st.aminas || []).reduce((m, a) => Math.max(m, ...(Array.isArray(a.mv) ? a.mv : [1])), 1);
  const ruins = (st) => Object.values(st.ruins || {}).reduce((n, r) => n + ((r && r.searches) | 0), 0);
  const S = (st) => st.stats || {};
  D.ACHIEVEMENTS = [
    { id: 'friend', name: 'A Second Friend', desc: 'Befriend an Amina besides your starter.', goal: 2, cur: own, icon: 'paw' },
    { id: 'col10', name: 'Growing Family', desc: 'Own 10 different forms.', goal: 10, cur: own, icon: 'paw' },
    { id: 'col30', name: 'Keeper of Many', desc: 'Own 30 different forms.', goal: 30, cur: own, icon: 'paw' },
    { id: 'fed50', name: 'Second Helpings', desc: 'Feed your Aminas 50 times.', goal: 50, cur: (st) => S(st).fed | 0, icon: 'food' },
    { id: 'hatch1', name: 'First Crack', desc: 'Hatch an egg.', goal: 1, cur: (st) => S(st).hatched | 0, icon: 'egg' },
    { id: 'hatch10', name: 'Busy Nest', desc: 'Hatch 10 eggs.', goal: 10, cur: (st) => S(st).hatched | 0, icon: 'egg' },
    { id: 'evo1', name: 'Something New', desc: 'Evolve an Amina.', goal: 1, cur: (st) => S(st).evolved | 0, icon: 'spark' },
    { id: 'final', name: 'Full Bloom', desc: 'Own a third-stage form (Name III).', goal: 1, cur: finalForms, icon: 'spark' },
    { id: 'road', name: 'Old Roads', desc: 'Clear The Forgotten Road.', goal: 1, cur: (st) => (R.dungeonCleared(st, 'forgottenroad') ? 1 : 0), icon: 'gate' },
    { id: 'dun5', name: 'Deep Delver', desc: 'Clear 5 different dungeons.', goal: 5, cur: cleared, icon: 'gate' },
    { id: 'isle', name: 'World Fragment', desc: 'Defeat an Island Boss.', goal: 1, cur: (st) => Object.keys((st.campaign && st.campaign.bosses) || {}).length, icon: 'map' },
    { id: 'win50', name: 'Seasoned', desc: 'Win 50 battles.', goal: 50, cur: (st) => S(st).wins | 0, icon: 'swords' },
    { id: 'rank10', name: 'Rising Rank', desc: 'Reach Player Rank 10.', goal: 10, cur: (st) => st.rank | 0, icon: 'up' },
    { id: 'build10', name: 'Island Planner', desc: 'Have 10 buildings, habitats or decorations of your own.', goal: 10, cur: built, icon: 'hammer' },
    { id: 'forge1', name: 'Smith’s Apprentice', desc: 'Craft, merge or buy equipment at the Forge.', goal: 1, cur: forged, icon: 'hammer' },
    { id: 'ruin5', name: 'Treasure Hunter', desc: 'Search ruins 5 times.', goal: 5, cur: ruins, icon: 'compass' },
    { id: 'surv10', name: 'Still Standing', desc: 'Reach wave 10 in Survival Mode.', goal: 10, cur: (st) => (st.survival && st.survival.best) | 0, icon: 'swords' },
    { id: 'ess100', name: 'Essence Gatherer', desc: 'Gather 100 elemental essence (counted from this update on).', goal: 100, cur: (st) => S(st).essence | 0, icon: 'ess_light' },
    { id: 'move5', name: 'Mastered Move', desc: 'Upgrade any move to Level 5.', goal: 5, cur: topMove, icon: 'ess_fire' },
  ];
  const Ach = (R.Ach = {});
  Ach.list = function (st) {
    const got = st.ach || {};
    return D.ACHIEVEMENTS.map((a) => { const cur = Math.max(0, a.cur(st) | 0); return { id: a.id, name: a.name, desc: a.desc, icon: a.icon, goal: a.goal, cur: Math.min(cur, a.goal), done: !!got[a.id] || cur >= a.goal, at: got[a.id] || null }; });
  };
  // Records newly earned achievements. quiet: record without announcing (used when an older save is first loaded).
  Ach.check = function (st, quiet) {
    st.ach = st.ach && typeof st.ach === 'object' ? st.ach : {};
    const fresh = [];
    D.ACHIEVEMENTS.forEach((a) => { if (!st.ach[a.id] && (a.cur(st) | 0) >= a.goal) { st.ach[a.id] = R.now() || 1; fresh.push(a.id); } });
    if (!quiet) fresh.forEach((id) => R.emit('achievement', { id }));
    return fresh;
  };
  Ach.count = (st) => D.ACHIEVEMENTS.filter((a) => st.ach && st.ach[a.id]).length;
  // checked after every action that goes through R.after (feeding, battles, building, hatching...)
  const after0 = R.after;
  R.after = function (st) { const r = after0.apply(this, arguments); if (st && st.phase === 'play') Ach.check(st); return r; };
})(typeof window !== 'undefined' ? window : globalThis);
