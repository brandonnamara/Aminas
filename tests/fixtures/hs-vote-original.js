// The Hide and Seek lobby and vote exactly as they were before the redesign (src/rules.js at 4e969c7, Phase 12A),
// kept so tests/hideseek.test.js can check the live voting still behaves identically. Not loaded by the game.
module.exports = function (D) {
  const R = {};
  const HS = (R.HideSeek = {});
  const seededRng = (seed) => { let x = (seed >>> 0) || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
  HS.rng = seededRng;
  HS.lobby = function (st, seed) {
    const rnd = seededRng(seed), C = D.HIDESEEK, names = C.bots.slice();
    const players = [{ id: 'you', name: 'You', bot: false, pref: (st.hideseek && st.hideseek.pref) || 'hider' }];
    for (let i = 0; i < C.lobbySize - 1; i++) { const n = names.splice(Math.floor(rnd() * names.length), 1)[0]; players.push({ id: 'bot' + i, name: n, bot: true, pref: rnd() < 0.4 ? 'seeker' : 'hider' }); }
    return { seed, players };
  };
  HS.eligible = (lobby) => lobby.players.filter((p) => p.pref === 'seeker');
  // Votes go only to players who chose the Seeker preference. Most votes wins; a tie goes to whoever has been Seeker
  // least often, then to a seeded draw. If nobody chose Seeker, the Seeker is drawn from everyone (fallback).
  HS.assignSeeker = function (lobby, votes, history) {
    const rnd = seededRng(lobby.seed + 17), elig = HS.eligible(lobby), ids = elig.map((p) => p.id); history = history || {};
    if (!elig.length) { const p = lobby.players[Math.floor(rnd() * lobby.players.length)]; return { seeker: p.id, method: 'fallback', tally: {} }; }
    const tally = {}; ids.forEach((id) => (tally[id] = 0));
    Object.keys(votes || {}).forEach((voter) => { const c = votes[voter]; if (ids.indexOf(c) >= 0 && lobby.players.some((p) => p.id === voter)) tally[c]++; });
    const max = Math.max.apply(null, ids.map((id) => tally[id]));
    let top = ids.filter((id) => tally[id] === max);
    if (top.length === 1) return { seeker: top[0], method: 'vote', tally };
    const name = (id) => lobby.players.find((p) => p.id === id).name;
    const least = Math.min.apply(null, top.map((id) => history[name(id)] || 0));
    top = top.filter((id) => (history[name(id)] || 0) === least);
    return { seeker: top.length === 1 ? top[0] : top[Math.floor(rnd() * top.length)], method: 'tiebreak', tally };
  };
  HS.botVotes = function (lobby) {
    const rnd = seededRng(lobby.seed + 5), elig = HS.eligible(lobby), v = {};
    lobby.players.filter((p) => p.bot).forEach((p) => { if (elig.length) v[p.id] = elig[Math.floor(rnd() * elig.length)].id; });
    return v;
  };
  return HS;
};
