/* Aminas — Battle hub (PvE / PvP), the Island Map, Loot Ruins, Survival, and the local PvP foundations
   (5v5 practice, Island Defence, Hide and Seek). Online play is not connected: every screen that would need a
   server says so, and the local versions are labelled as practice against the computer. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Art = A.Art, Au = A.Audio, UI = A.UI, W = A.World;
  const { esc, pct, chip, artBox } = UI.h, I = Art.icon;
  const $ = (s, r) => (r || document).querySelector(s);
  const st = () => S.state;
  const fmt = (n) => Math.floor(n).toLocaleString('en-GB');
  const OFFLINE = '<div class="offline">' + I('info') + ' Online play is not connected yet. This runs on your device against the computer.</div>';
  const back = (act) => '<button class="btn ghost" data-act="' + act + '">' + I('back') + ' Back</button>';
  const menuCard = (act, icon, title, sub, o) => { o = o || {}; return '<button class="mcard ' + (o.cls || '') + '" data-act="' + act + '" data-hl="' + (o.hl || act) + '"' + (o.id ? ' data-id="' + o.id + '"' : '') + '><span class="mc-i">' + I(icon) + '</span><span class="mc-t"><b>' + title + '</b><small>' + sub + '</small></span>' + (o.tag ? '<span class="mc-tag">' + o.tag + '</span>' : '') + '</button>'; };
  const open = (ovEx, html) => (ovEx && ovEx.parentNode ? ((ovEx.innerHTML = html), ovEx) : UI.modal(html));

  /* ---------- Battle hub ---------- */
  UI.battleHub = function (ovEx) {
    const s = st(), p = R.islandProgress(s, s.currentIsland in D.CAMPAIGN && D.CAMPAIGN[s.currentIsland].dungeons.length ? s.currentIsland : 'starter');
    const body = '<div class="hub2"><button class="hubcard pve" data-act="pveMenu" data-hl="pve"><span class="hc-glyph">' + I('gate') + '</span><b>PvE</b><small>Dungeons, the Island Map, Explore, Loot Ruins and Survival</small><span class="hc-meta">' + p.cleared + ' / ' + p.total + ' dungeons cleared</span></button>' +
      '<button class="hubcard pvp" data-act="pvpMenu" data-hl="pvp"><span class="hc-glyph">' + I('swords') + '</span><b>PvP</b><small>5v5 Matchmaking, Island Defence and Hide and Seek</small><span class="hc-meta">Practice against the computer</span></button></div>';
    return open(ovEx, UI.sheet(I('swords') + ' Battle', body, '<button class="btn gold" data-act="close">Close</button>', 'wide hubsheet'));
  };
  UI.act('battle', () => { if (UI.bm) UI.exitBuild(); UI.closeAll(); UI.battleHub(); });
  UI.act('hubBack', (el) => UI.battleHub(el.closest('.overlay')));

  UI.pveMenu = function (ovEx) {
    const s = st(), iid = D.CAMPAIGN[s.currentIsland] && D.CAMPAIGN[s.currentIsland].dungeons.length ? s.currentIsland : 'starter', p = R.islandProgress(s, iid);
    const cur = p.current ? D.DUNGEONS[p.current] : null, run = s.run ? D.DUNGEONS[s.run.d] : null;
    const dSub = run ? 'In progress: ' + esc(run.name) + ' · battle ' + (s.run.battle + 1) + ' of 10' : cur ? 'Next: Dungeon ' + cur.index + ' · ' + esc(cur.name) + (R.dungeonUnlocked(s, p.current) ? '' : ' (locked)') : 'Every dungeon on ' + esc(D.ISLANDS[iid].name) + ' is cleared';
    const ruinsReady = D.RUIN_ORDER.filter((id) => R.Ruins.status(s, id).ready).length, sv = R.Survival.rec(s);
    const body = '<div class="mgrid">' + menuCard('dungeons', 'gate', 'Dungeons', dSub, { tag: p.cleared + '/' + p.total, cls: 'main' }) +
      menuCard('map', 'map', 'Island Map', 'The islands of the sanctuary and how far you have come', { tag: D.ISLAND_ORDER.filter((i) => W.islandUnlocked(s, i)).length + '/' + D.ISLAND_ORDER.length }) +
      menuCard('explore', 'compass', 'Explore', 'Wander the island’s areas and befriend the Aminas you meet') +
      menuCard('ruins', 'box', 'Loot Ruins', 'Search old buildings for resources and things left behind', { tag: ruinsReady ? ruinsReady + ' ready' : '' }) +
      menuCard('survival', 'heart', 'Survival', sv.run ? 'Run in progress · wave ' + sv.run.wave : 'How many waves can you last? Best: ' + sv.best, { tag: sv.run ? 'Resume' : '' }) + '</div>';
    return open(ovEx, UI.sheet(I('gate') + ' PvE', body, back('hubBack') + '<button class="btn gold" data-act="close">Close</button>', 'wide'));
  };
  UI.act('pveMenu', (el) => UI.pveMenu(el.closest('.overlay')));
  UI.pvpMenu = function (ovEx) {
    const s = st(), pv = R.PvP.rec(s), df = R.PvP.defRec(s);
    const body = OFFLINE + '<div class="mgrid">' + menuCard('pvp5', 'swords', 'Matchmaking · 5v5', 'Choose five Aminas and battle another team of five. Practice record ' + pv.practice.w + '–' + pv.practice.l, { tag: 'Practice', cls: 'main' }) +
      menuCard('defence', 'shield', 'Island Defence', 'Set a team of three to attack and a team of three to defend your island', { tag: R.PvP.team(s, 'defence').length === 3 ? 'Defence set' : 'Set up' }) +
      menuCard('hideseek', 'compass', 'Hide and Seek', 'Morph into the scenery, or be the Seeker. Lobby, role vote and match', { tag: 'Local bots' }) + '</div>';
    return open(ovEx, UI.sheet(I('swords') + ' PvP', body, back('hubBack') + '<button class="btn gold" data-act="close">Close</button>', 'wide'));
  };
  UI.act('pvpMenu', (el) => UI.pvpMenu(el.closest('.overlay')));

  /* ---------- Island Map: fragments of the sanctuary ---------- */
  const isleState = (s, iid) => !W.islandUnlocked(s, iid) ? 'locked' : R.islandBossDefeated(s, iid) ? 'completed' : 'unlocked';
  UI.islandMap = function (ovEx) {
    const s = st();
    const cards = D.ISLAND_ORDER.map((iid, n) => {
      const isl = D.ISLANDS[iid], c = D.CAMPAIGN[iid], k = isleState(s, iid), here = s.currentIsland === iid, p = R.islandProgress(s, iid);
      const by = W.islandUnlockedBy(iid);
      let status, act = '';
      if (k === 'locked') status = by ? (c.dungeons.length || D.CAMPAIGN[by].dungeons.length ? 'Defeat the Island Boss of ' + esc(D.ISLANDS[by].name) + ' to reach it.' : 'Not reachable yet.') : 'Locked.';
      else if (!c.dungeons.length) status = 'Its dungeons have not opened yet. You can build and explore here.';
      else status = p.cleared + ' of ' + p.total + ' dungeons · ' + (p.boss ? 'Island Boss defeated' : 'Island Boss waiting in Dungeon 10');
      if (here) act = '<span class="tagp play">You are here</span>';
      else if (k !== 'locked') act = '<button class="btn gold small" data-act="travel" data-id="' + iid + '" data-hl="travel:' + iid + '">' + I('arrow') + 'Travel</button>';
      else act = '<button class="btn small ghost" data-act="isleWhy" data-id="' + iid + '" data-hl="unlock:' + iid + '">' + I('lock') + ' How to reach it</button>';
      const tag = k === 'completed' ? '<span class="tagp done">' + I('check') + ' Island Boss defeated</span>' : k === 'unlocked' ? '<span class="tagp play">Unlocked</span>' : '<span class="tagp sealed">' + I('lock') + ' Locked</span>';
      return '<div class="frag ' + k + (here ? ' here' : '') + ' el-' + isl.el + '" style="--tilt:' + [-2, 3, -3, 2][n % 4] + 'deg" data-hl="island:' + iid + '" data-island="' + iid + '"><div class="frag-art">' + UI.isleThumb(iid) + '<i class="seam"></i></div><div class="frag-b"><h3>' + esc(k === 'locked' ? '???' : isl.name) + ' ' + tag + '</h3>' +
        '<p class="blurb">' + esc(k === 'locked' ? c.hint : isl.blurb) + '</p>' + (c.dungeons.length && k !== 'locked' ? '<div class="bar xp"><i style="width:' + pct(p.battles, p.battlesTotal) + '%"></i></div>' : '') + '<p class="muted small-t">' + status + '</p></div><div class="frag-a">' + act + '</div></div>';
    }).join('<div class="frag-gap"></div>');
    const ov = open(ovEx, UI.sheet(I('map') + ' Island Map', '<p class="muted sanct">Every island in the sanctuary is a piece of somewhere else.</p><div class="frags">' + cards + '</div>', '<span class="muted sp" style="font-size:.78rem">Defeating an island’s Island Boss, at the end of its tenth dungeon, brings the next island within reach.</span><button class="btn gold" data-act="close">Close</button>', 'wide'));
    UI.applyHl(); const t = $('.hl', ov); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest' });
    return ov;
  };
  UI.act('map', () => { if (UI.bm) UI.exitBuild(); UI.closeAll(); UI.islandMap(); });
  UI.act('isleWhy', (el) => { const by = W.islandUnlockedBy(el.dataset.id); if (by && D.CAMPAIGN[by].dungeons.length && W.islandUnlocked(st(), by)) { UI.closeAll(); UI.dIsland = by; UI.dungeons(null, D.CAMPAIGN[by].islandBoss); } else UI.toast(by ? 'First the ' + D.ISLANDS[by].name + ' has to be reached, and its Island Boss defeated.' : 'Not reachable yet.', 't'); });
  UI.act('unlockIsle', (el) => UI.acts.isleWhy(el));
  // Shown after an Island Boss falls: the new island drifts into view.
  UI.islandUnlockedFx = function (iid) {
    const isl = D.ISLANDS[iid]; Au.play('discover');
    const ov = UI.modal('<div class="sheet panel narrow vcard newisle" style="padding:1rem"><div class="ni-art">' + UI.isleThumb(iid) + '</div><h1>' + esc(isl.name) + '</h1><p class="muted">' + esc(isl.blurb) + '</p><p class="small-t">A new piece of the sanctuary is within reach.</p><div class="row-actions" style="justify-content:center"><button class="btn ghost" data-act="close">Later</button><button class="btn gold" data-act="travel" data-id="' + iid + '">' + I('arrow') + ' Travel there</button></div></div>');
    UI.sparkles($('.ni-art', ov), 30, ['#ff86d6', '#8fe6d6', '#ffd86b', '#9a78e6']);
    return ov;
  };

  /* ---------- Loot Ruins ---------- */
  const left = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m > 1 ? m + ' min' : Math.ceil(ms / 1000) + 's'; };
  UI.ruins = function (ovEx) {
    const s = st();
    const rows = D.RUIN_ORDER.map((id) => {
      const r = D.RUINS[id], x = R.Ruins.status(s, id);
      const btn = !x.unlocked ? '<span class="tagp sealed">' + I('lock') + ' ' + esc(r.unlockText) + '</span>' : x.ready ? '<button class="btn gold small" data-act="ruinSearch" data-id="' + id + '" data-hl="ruin:' + id + '">' + I('compass') + ' Search</button>' : '<span class="tagp prog" data-left="' + id + '">Searched · again in ' + left(x.left) + '</span>';
      return '<div class="ruin ' + (x.unlocked ? '' : 'lk') + '"><div class="ruin-i">' + I('box') + '</div><div><b>' + esc(r.name) + '</b><p class="muted small-t">' + esc(r.blurb) + '</p><p class="small-t">' + rwRange(r) + (x.artefact ? ' · ' + I('check') + ' something found here' : x.unlocked ? ' · ' + I('star') + ' something is still hidden here' : '') + '</p></div><div>' + btn + '</div></div>';
    }).join('');
    const ov = open(ovEx, UI.sheet(I('box') + ' Loot Ruins', '<p class="muted small-t">Old buildings on the island. Each can be searched again after a rest. The first search of each one turns up something worth keeping.</p>' + rows, back('pveMenu') + '<button class="btn gold" data-act="close">Close</button>', 'wide'));
    ov._live = () => { if (ov.querySelector('[data-left]') && ov.parentNode) { const anyReady = D.RUIN_ORDER.some((id) => { const x = R.Ruins.status(st(), id); return x.unlocked && x.ready && ov.querySelector('[data-left="' + id + '"]'); }); if (anyReady) UI.ruins(ov); } };
    UI.applyHl(); return ov;
  };
  const rwRange = (r) => I('gold') + r.loot.gold[0] + '–' + r.loot.gold[1] + ' ' + I('food') + r.loot.food[0] + '–' + r.loot.food[1] + (r.gemChance ? ' ' + I('gem') + ' sometimes' : '');
  UI.act('ruins', (el) => UI.ruins(el.closest('.overlay')));
  UI.act('ruinSearch', (el) => {
    const s = st(), id = el.dataset.id, r = R.Ruins.search(s, id);
    if (!r.ok) { Au.play('no'); UI.toast(r.reason === 'cooldown' ? 'Already searched. Try again in ' + left(r.left) + '.' : 'Not open yet.', 't'); return; }
    UI.afterAction(); Au.play('ok');
    const ov = el.closest('.overlay');
    const art = r.artefact ? '<div class="panel" style="padding:.5rem;margin:.4rem 0"><b>' + I('scroll') + ' ' + esc(D.LORE[r.artefact].title) + '</b><p class="muted small-t" style="margin:.2rem 0">' + esc(D.LORE[r.artefact].text) + '</p><small class="muted">Added to your Journal.</small></div>' : '';
    const m = UI.modal(UI.sheet('You searched ' + esc(D.RUINS[id].name), '<div class="vcard vic v-win"><div class="v-spoils">' + UI.Rewards.group({ title: 'Found in the ruins', icon: 'box', list: UI.Rewards.fromRes(r.loot).concat(r.essence && r.essence.n ? [{ k: 'essence', el: r.essence.el, n: r.essence.n }] : []) }) + '</div>' + art + '</div>', '<button class="btn gold" data-act="close">Good</button>', 'narrow res-sheet'), { onClose: () => { if (ov && ov.parentNode) UI.ruins(ov); } });
    UI.Rewards.celebrate(m); if (!UI.calm()) UI.sparkles($('.rgrid', m), 12);
  });

  /* ---------- Survival ---------- */
  UI.survival = function (ovEx) {
    const s = st(), rec = R.Survival.rec(s), C = D.SURVIVAL;
    const ms = Object.keys(C.milestones).map((w) => '<span class="sec ' + (rec.milestones[w] ? 'claimed' : '') + '">' + (rec.milestones[w] ? I('check') : I('star')) + 'Wave ' + w + ' <em>' + UI.rwInline(C.milestones[w]) + '</em></span>').join('');
    const body = '<div class="sv"><p>Battle wave after wave, each a little harder. Every fifth wave is a Champion with a telegraphed move. Your party heals a little between waves. When you stop, or fall, you collect what you earned: ' + C.perWave.gold + ' gold and ' + C.perWave.food + ' food times the wave number, for every wave you beat.</p>' +
      '<p class="muted small-t">Survival is separate from the story: it never changes your dungeon progress or island unlocks.</p><div class="secs">' + ms + '</div><p><b>Best:</b> ' + rec.best + ' waves · <b>Runs:</b> ' + rec.runs + '</p></div>';
    const foot = back('pveMenu') + (rec.run ? '<button class="btn" data-act="svCash">Collect and stop (' + UI.rwInline(rec.run.earned) + ')</button><button class="btn gold" data-act="svGo">Continue · wave ' + rec.run.wave + '</button>' : '<button class="btn gold" data-act="svStart" data-hl="svStart">' + I('swords') + ' Start a run</button>');
    return open(ovEx, UI.sheet(I('heart') + ' Survival', body, foot, 'wide'));
  };
  UI.act('survival', (el) => UI.survival(el.closest('.overlay')));
  UI.act('svStart', () => UI.pickTeam({ size: D.SURVIVAL.party, title: 'Survival · choose your party', go: 'Start wave 1', note: 'Pick the three who will face every wave.', onGo: (sel) => { const r = R.Survival.start(st(), sel); if (!r.ok) return false; S.save(); UI.closeAll(); svBattle(); return true; } }));
  UI.act('svGo', () => { UI.closeAll(); svBattle(); });
  UI.act('svCash', () => { const out = R.Survival.cashOut(st()); UI.afterAction(); UI.closeAll(); svSummary(out); });
  function svBattle() {
    const s = st(), run = R.Survival.rec(s).run; if (!run) { UI.showIsland(); return; }
    const spec = R.Survival.spec(s);
    UI.startBattle({ kind: 'survival', b: R.Survival.createBattle(s), d: 'reliquary', label: 'Survival · wave ' + run.wave, intro: spec.boss ? 'Wave ' + run.wave + ': a Champion steps forward!' : 'Wave ' + run.wave + ': a wild ' + D.SPECIES[spec.sp].name + ' appears!',
      retreat: { title: 'Stop the run?', text: 'You collect what you have earned so far: ' + UI.rwInline(run.earned) + '. The wave you are in does not count.', yes: 'Collect and stop', fn: () => { const out = R.Survival.cashOut(st()); S.save(); UI.svLast = out; }, after: () => { UI.showIsland(); svSummary(UI.svLast); } },
      finish: (U) => {
        const out = R.Survival.resolve(st(), U.b); R.after(st()); S.save();
        if (out.win) {
          Au.play('win');
          const ov = UI.modal(UI.sheet('Wave ' + out.wave + ' cleared', '<div class="vcard vic v-win"><div class="v-banner"><span class="v-crest">' + I('swords') + '</span><small class="v-kick">Survival</small><h1>Wave ' + out.wave + '!</h1></div><div class="v-spoils">' + (out.milestone ? UI.Rewards.group({ title: 'Milestone: wave ' + out.milestone.wave, icon: 'star', list: UI.Rewards.fromRes(out.milestone.reward) }) : '') + (out.essence && out.essence.n ? UI.Rewards.group({ title: 'Battle spoils', list: [{ k: 'essence', el: out.essence.el, n: out.essence.n }] }) : '') + '</div><p>Earned so far: <b>' + UI.rwInline(out.earned) + '</b></p><p class="muted small-t">Your party recovers a little. Next: wave ' + out.next + (out.next % 5 === 0 ? ' (a Champion)' : '') + '.</p></div>',
            '<button class="btn ghost" id="sv-stop">Collect and stop</button><button class="btn gold" id="sv-next">Next wave</button>', 'narrow res-sheet'), { dismiss: false });
          $('.x', ov).remove(); UI.Rewards.celebrate(ov);
          $('#sv-next', ov).onclick = () => { UI.close(ov); UI.leaveBattle(() => svBattle()); };
          $('#sv-stop', ov).onclick = () => { UI.close(ov); const o2 = R.Survival.cashOut(st()); UI.afterAction(); UI.leaveBattle(() => { UI.showIsland(); svSummary(o2); }); };
        } else { Au.play('lose'); UI.leaveBattle(() => { UI.showIsland(); svSummary(out); }); }
      } });
  }
  function svSummary(out) {
    if (!out) return;
    UI.modal(UI.sheet('Survival run over', '<div class="vcard vic v-win"><div class="v-banner"><span class="v-crest">' + I('trophy') + '</span><small class="v-kick">Survival run over' + (out.newBest ? ' · a new best!' : '') + '</small><h1>' + out.waves + ' wave' + (out.waves === 1 ? '' : 's') + '</h1></div><div class="v-spoils">' + (UI.Rewards.fromRes(out.paid).length ? UI.Rewards.group({ title: 'Collected', list: UI.Rewards.fromRes(out.paid) }) : '<p class="muted">Nothing earned this time.</p>') + '</div></div>', '<button class="btn gold" data-act="close">Done</button>', 'narrow res-sheet'));
  }

  /* ---------- PvP: 5v5 practice ---------- */
  const teamRow = (s, uids, n) => '<div class="party-row many">' + [...Array(n)].map((_, i) => { const a = R.inst(s, uids[i]); return '<div class="slot">' + (a ? artBox(a.sp) + '<b>' + esc(D.SPECIES[a.sp].name) + '</b>Lv ' + a.lv : '<span class="muted">Empty</span>') + '</div>'; }).join('') + '</div>';
  UI.pvp5 = function (ovEx) {
    const s = st(), roster = R.PvP.roster(s), pv = R.PvP.rec(s), N = D.PVP.rosterSize, enough = s.aminas.length >= N;
    const body = OFFLINE + '<h3>Your roster</h3>' + teamRow(s, roster, N) +
      '<p class="muted small-t">Turn-based, five against five: when one of yours faints you choose the next; when one of theirs faints, the next steps in. Practice matches use the same battle rules as dungeons and never change your story progress. ' + D.PVP.practiceDailyRewards + ' practice wins a day pay ' + UI.rwInline(D.PVP.practiceReward) + '.</p>' +
      '<p><b>Practice record:</b> ' + pv.practice.w + ' won, ' + pv.practice.l + ' lost</p>' + (!enough ? '<p class="bad">You need at least ' + N + ' Aminas for a 5v5 team (you have ' + s.aminas.length + ').</p>' : '') +
      '<div class="todo"><b>Still needed for real matchmaking:</b> an account and match server, a matchmaking queue and rating, turn synchronisation between two devices, server-side battle resolution (so results cannot be faked), disconnect handling.</div>';
    const foot = back('pvpMenu') + '<button class="btn' + (enough ? '' : ' off') + '" data-act="pvpRoster">Edit roster</button><button class="btn gold' + (roster.length === N ? '' : ' off') + '" data-act="pvpPlay">' + I('swords') + ' Practice match</button>';
    return open(ovEx, UI.sheet(I('swords') + ' Matchmaking · 5v5', body, foot, 'wide'));
  };
  UI.act('pvp5', (el) => UI.pvp5(el.closest('.overlay')));
  UI.act('pvpRoster', (el) => { const ov = el.closest('.overlay'); UI.pickTeam({ size: D.PVP.rosterSize, exact: true, title: '5v5 roster', go: 'Save roster', initial: R.PvP.roster(st()), note: 'Five Aminas, in fighting order.', onGo: (sel) => { const r = R.PvP.setRoster(st(), sel); if (!r.ok) return false; S.save(); if (ov && ov.parentNode) UI.pvp5(ov); return true; } }); });
  UI.act('pvpPlay', () => {
    const s = st(), b = R.PvP.createPractice(s); if (!b) { UI.toast('Set a roster of five first.', 't'); return; }
    UI.closeAll();
    UI.startBattle({ kind: 'practice', b, d: 'resonancescar', label: 'Practice 5v5 · computer opponent', intro: 'Practice match: your five against the computer’s five.',
      retreat: { title: 'Forfeit the practice match?', text: 'It counts as a loss in your practice record.', yes: 'Forfeit', fn: () => { b.over = true; b.result = 'lose'; R.PvP.resolvePractice(st(), b); S.save(); }, after: () => { UI.showIsland(); UI.pvp5(); } },
      finish: (U) => { const out = R.PvP.resolvePractice(st(), U.b); S.save(); Au.play(out.win ? 'win' : 'lose'); pvpResult(out.win ? 'You won the practice match' : 'The computer won this one', out, () => UI.pvp5()); } });
  });
  function pvpResult(title, out, again) {
    const ov = UI.modal(UI.sheet('Practice result', '<div class="vcard vic ' + (out.win ? 'v-win' : 'defeat') + '"><div class="v-banner"><span class="v-crest">' + I(out.win ? 'swords' : 'el_dark') + '</span><small class="v-kick">Practice</small><h1>' + esc(title) + '</h1></div>' + (out.reward ? '<div class="v-spoils">' + UI.Rewards.group({ title: 'Practice reward', list: UI.Rewards.fromRes(out.reward) }) + '</div>' : out.win ? '<p class="muted small-t">No reward: today’s practice rewards are used up.</p>' : '') + (out.record ? '<p>Practice record: ' + out.record.w + '–' + out.record.l + '</p>' : '') + '<p class="muted small-t">Local practice against the computer. Nothing here is ranked.</p></div>', '<button class="btn gold" id="pr-ok">Continue</button>', 'narrow res-sheet'), { dismiss: false });
    $('.x', ov).remove(); $('#pr-ok', ov).onclick = () => { UI.close(ov); UI.leaveBattle(() => { UI.showIsland(); again(); }); };
  }

  /* ---------- PvP: Island Defence ---------- */
  UI.defence = function (ovEx) {
    const s = st(), N = D.PVP.defenceSize, at = R.PvP.team(s, 'attack'), df = R.PvP.team(s, 'defence'), log = R.PvP.defRec(s).log;
    const body = OFFLINE + '<div class="dteams"><div class="dteam atk"><h3>' + I('swords') + ' Attack team</h3><p class="muted small-t">Raids other islands.</p>' + teamRow(s, at, N) + '<button class="btn small" data-act="defEdit" data-kind="attack">Edit attack team</button></div>' +
      '<div class="dteam def"><h3>' + I('shield') + ' Defence team</h3><p class="muted small-t">Guards your island while you are away. Saved on this device.</p>' + teamRow(s, df, N) + '<button class="btn small" data-act="defEdit" data-kind="defence">Edit defence team</button></div></div>' +
      (log.length ? '<h3>Recent</h3><div class="dlog">' + log.slice(0, 5).map((l) => '<div>' + (l.kind === 'raid' ? I('swords') + ' Raid' + (l.isle ? ' on ' + esc(l.isle) : '') + ': ' + (l.win ? '<span class="good">won</span>' : '<span class="bad">' + (l.left ? 'called off' : 'lost') + '</span>') : I('shield') + ' Defence test: ' + (l.win ? '<span class="good">held</span>' : '<span class="bad">fell</span>') + (l.turns ? ' in ' + l.turns + ' turns' : '')) + '</div>').join('') + '</div>' : '') +
      '<div class="todo"><b>Still needed for real Island Defence:</b> a server that stores defence teams, finds islands to raid, runs the defence side for an absent player, and records results for both players.</div>';
    const foot = back('pvpMenu') + '<button class="btn' + (df.length === N ? '' : ' off') + '" data-act="defTest">' + I('shield') + ' Test my defence</button><button class="btn gold' + (at.length === N ? '' : ' off') + '" data-act="defRaid">' + I('swords') + ' Find an island to raid</button>';
    return open(ovEx, UI.sheet(I('shield') + ' Island Defence', body, foot, 'wide'));
  };
  UI.act('defence', (el) => UI.defence(el.closest('.overlay')));
  UI.act('defEdit', (el) => { const kind = el.dataset.kind, ov = el.closest('.overlay'); UI.pickTeam({ size: D.PVP.defenceSize, exact: true, title: (kind === 'attack' ? 'Attack' : 'Defence') + ' team', go: 'Save team', initial: R.PvP.team(st(), kind), note: kind === 'attack' ? 'These three raid other islands.' : 'These three defend your island.', onGo: (sel) => { const r = R.PvP.setTeam(st(), kind, sel); if (!r.ok) return false; S.save(); if (ov && ov.parentNode) UI.defence(ov); return true; } }); });
  /* ---------- Island Defence: Raid Preview (Phase 12A) ----------
     One computer-owned island at a time: its owner, its defenders and exactly what a win pays. Skip offers another
     island (free, changes nothing else); Attack locks the island shown for that battle. The island on offer is kept
     in the save, so leaving or restarting shows the same one. */
  const lootTile = (k, n, lab, dim) => '<div class="rp-tile ' + k + (dim ? ' dim' : '') + '"><span class="rp-ti">' + I(k) + '</span><b>' + fmt(n) + '</b><small>' + lab + '</small></div>';
  UI.raidPreview = function (ovEx, fresh) {
    const s = st(), P = R.PvP.raidPreview(s), t = P.target, N = D.PVP.defenceSize, at = R.PvP.team(s, 'attack'), ready = at.length === N, pays = P.rewardsLeft > 0, lim = D.PVP.practiceDailyRewards;
    S.save();
    const mine = at.map((u) => R.inst(s, u)).filter(Boolean), sum = (xs) => xs.reduce((a, x) => a + x.lv, 0);
    const odds = !mine.length ? '' : sum(t.foes) > sum(mine) + 2 ? 'Tougher than your team' : sum(t.foes) < sum(mine) - 2 ? 'Weaker than your team' : 'An even match';
    const foe = '<section class="rp-foe"><div class="rp-who"><span class="rp-av" aria-hidden="true">' + A.Pixel.avatar(t.look) + '</span><div class="rp-names"><small>Island owner · computer</small><b>' + esc(t.name) + '</b><span>' + esc(t.isle) + '</span>' +
      '<span class="rp-guard g-' + t.tier + '">' + I('shield') + ' ' + esc(t.guard) + '</span></div></div><div class="rp-isle" aria-hidden="true">' + UI.isleThumb(t.biome) + '</div></section>';
    const loot = '<section class="rp-loot' + (pays ? '' : ' spent') + '" aria-label="Loot on this island"><h3>' + I('box') + ' Loot you can raid</h3><div class="rp-tiles">' +
      lootTile('gold', t.loot.gold, 'Gold', !pays) + lootTile('food', t.loot.food, 'Food', !pays) +
      '<div class="rp-total"><small>Total value</small><b>' + fmt(P.value) + '</b><small>gold · each food counts as ' + D.PVP.raid.foodValue + '</small></div></div>' +
      (pays ? '<p class="rp-note">Win the raid to take all of it. <b>' + P.rewardsLeft + ' of ' + lim + '</b> rewarded wins left today (shared with 5v5 practice). Gems can’t be raided.</p>'
        : '<p class="rp-note warn">' + I('warn') + ' Today’s ' + lim + ' rewarded wins are used up, so a win now pays nothing. They come back tomorrow. Gems can’t be raided.</p>') + '</section>';
    const defs = '<section class="rp-def"><h3>' + I('shield') + ' Defenders' + (odds ? ' <span class="rp-odds">' + odds + '</span>' : '') + '</h3><div class="party-row many">' +
      t.foes.map((f) => '<div class="slot">' + artBox(f.sp) + '<b>' + esc(D.SPECIES[f.sp].name) + '</b>Lv ' + f.lv + '</div>').join('') + '</div>' +
      '<p class="muted small-t">' + (mine.length ? 'Your attack team: ' + mine.map((a) => esc(D.SPECIES[a.sp].name) + ' Lv ' + a.lv).join(' · ') : 'You have no attack team yet.') + '</p></section>';
    const body = OFFLINE + '<div class="rp' + (fresh ? ' rp-new' : '') + '">' + foe + loot + defs + (ready ? '' : '<p class="bad">Set an attack team of three on the Island Defence screen first.</p>') + '</div>';
    const foot = back('defence') + '<button class="btn rp-skip" data-act="raidSkip">' + I('arrow') + ' Skip opponent</button><button class="btn gold rp-attack' + (ready ? '' : ' off') + '" data-act="raidAttack"' + (ready ? '' : ' aria-disabled="true"') + '>' + I('swords') + ' Attack</button>';
    return open(ovEx, UI.sheet(I('swords') + ' Raid preview', body, foot, 'wide raidsheet'));
  };
  UI.act('defRaid', (el) => UI.raidPreview(el.closest('.overlay')));
  UI.act('raidSkip', (el) => { const r = R.PvP.skipRaid(st()); if (!r.ok) return; S.save(); Au.play('tap'); UI.raidPreview(el.closest('.overlay'), true); });
  UI.act('raidAttack', () => {
    const s = st(), b = R.PvP.attackRaid(s); if (!b) { UI.toast('Set an attack team of three first.', 't'); return; }
    const t = R.PvP.defRec(s).target; S.save(); UI.closeAll();
    UI.startBattle({ kind: 'raid', b, d: 'hollowveil', label: 'Raid · ' + t.isle, intro: 'Raid on ' + t.isle + ': ' + t.name + '’s three defenders stand in your way.',
      retreat: { title: 'Call off the raid?', text: 'It counts as a lost raid. The island stays on offer.', yes: 'Call it off', fn: () => { b.over = true; b.result = 'lose'; R.PvP.resolveRaid(st(), b); S.save(); }, after: () => { UI.showIsland(); UI.raidPreview(); } },
      finish: (U) => { const out = R.PvP.resolveRaid(st(), U.b); S.save(); Au.play(out.win ? 'win' : 'lose'); raidResult(out); } });
  });
  function raidResult(out) {
    const t = out.target || {}, title = out.win ? 'Raid on ' + (t.isle || 'the island') + ' succeeded' : t.name ? t.name + '’s defenders held' : 'The defenders held';
    const spoils = out.reward ? '<div class="v-spoils">' + UI.Rewards.group({ title: 'Raided from ' + (t.isle || 'the island'), list: UI.Rewards.fromRes(out.reward) }) + '</div>'
      : out.win ? '<p class="muted small-t">No loot: today’s rewarded wins were already used up.</p>' : '<p class="muted small-t">Nothing is lost. The island is still on offer if you want another go, or skip it for another.</p>';
    const ov = UI.modal(UI.sheet('Raid result', '<div class="vcard vic ' + (out.win ? 'v-win' : 'defeat') + '"><div class="v-banner"><span class="v-crest">' + I(out.win ? 'swords' : 'shield') + '</span><small class="v-kick">Island Defence</small><h1>' + esc(title) + '</h1></div>' + spoils + '</div>', '<button class="btn gold" id="rr-ok">Continue</button>', 'narrow'));
    $('.x', ov) && $('.x', ov).remove(); $('#rr-ok', ov).onclick = () => { UI.close(ov); UI.leaveBattle(() => { UI.showIsland(); UI.raidPreview(); }); };
  }
  UI.act('defTest', (el) => {
    const s = st(), r = R.PvP.simulateDefence(s); if (!r.ok) return; S.save();
    const ov = el.closest('.overlay');
    UI.modal(UI.sheet('Defence test', '<div class="vcard"><h1>' + (r.held ? 'Your defence held' : 'Your defence fell') + '</h1><p>Three computer raiders (' + r.raiders.map((x) => esc(D.SPECIES[x.sp].name) + ' Lv ' + x.lv).join(', ') + ') attacked your defence team. ' + (r.held ? r.defendersLeft + ' of your defenders were still standing' : r.raidersLeft + ' raider' + (r.raidersLeft === 1 ? ' was' : 's were') + ' left') + ' after ' + r.turns + ' turns.</p><p class="muted small-t">The computer played both sides. Nothing was spent or lost.</p></div>', '<button class="btn gold" data-act="close">OK</button>', 'narrow'), { onClose: () => { if (ov && ov.parentNode) UI.defence(ov); } });
  });

  /* ---------- PvP: Hide and Seek (local prototype with computer players) ---------- */
  const PROP = {
    bush: '<rect x="4" y="10" width="24" height="16" fill="#4fa046"/><rect x="8" y="4" width="16" height="10" fill="#62b850"/><rect x="4" y="10" width="24" height="3" fill="#7fd06a"/>',
    rock: '<rect x="5" y="12" width="22" height="14" fill="#8a909a"/><rect x="9" y="7" width="13" height="8" fill="#9aa0aa"/><rect x="21" y="12" width="6" height="14" fill="#6a707a"/>',
    barrel: '<rect x="8" y="5" width="16" height="22" fill="#a0683a"/><rect x="8" y="9" width="16" height="2" fill="#5a3a1e"/><rect x="8" y="20" width="16" height="2" fill="#5a3a1e"/><rect x="20" y="5" width="4" height="22" fill="#7a4e2a"/>',
    stump: '<rect x="7" y="13" width="18" height="13" fill="#7a4f2a"/><rect x="7" y="11" width="18" height="4" fill="#c8a070"/><rect x="21" y="13" width="4" height="13" fill="#5a3a1e"/>',
    lantern: '<rect x="14" y="4" width="4" height="22" fill="#4a3a2a"/><rect x="9" y="6" width="14" height="10" fill="#ffd86b"/><rect x="9" y="6" width="14" height="2" fill="#fff3b0"/>',
    crate: '<rect x="6" y="8" width="20" height="18" fill="#c09060"/><path d="M6 8l20 18M26 8L6 26" stroke="#8a6040" stroke-width="2"/><rect x="22" y="8" width="4" height="18" fill="#9a7048"/>',
  };
  const propSvg = (t, cls) => '<svg class="hs-prop ' + (cls || '') + '" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' + PROP[t] + '</svg>';
  UI.HS = null;
  UI.hideSeek = function (ovEx) {
    const s = st(); s.hideseek = s.hideseek || { pref: 'hider', played: 0, won: 0, seekerCount: {} };
    if (!UI.HS || UI.HS.match) UI.HS = { lobby: R.HideSeek.lobby(s, (Date.now() % 1e6) | 0), vote: null };
    const L = UI.HS.lobby, me = L.players[0]; me.pref = s.hideseek.pref;
    const elig = R.HideSeek.eligible(L);
    const players = L.players.map((p) => '<div class="hs-pl"><span class="hs-av">' + (p.bot ? I('paw') : I('star')) + '</span><b>' + esc(p.name) + '</b>' + (p.bot ? '<small class="muted">computer</small>' : '') + '<span class="tagp ' + (p.pref === 'seeker' ? 'prog' : 'play') + '">' + (p.pref === 'seeker' ? 'Wants to seek' : 'Hider') + '</span>' +
      (p.pref === 'seeker' ? '<button class="btn small ' + (UI.HS.vote === p.id ? 'gold' : 'ghost') + '" data-act="hsVote" data-id="' + p.id + '">' + (UI.HS.vote === p.id ? 'Your vote' : 'Vote') + '</button>' : '') + '</div>').join('');
    const body = OFFLINE + '<div class="hs-lobby"><div><h3>Lobby</h3>' + players + '</div><div><h3>Your role preference</h3><div class="row-actions"><button class="btn small ' + (me.pref === 'hider' ? 'gold' : 'ghost') + '" data-act="hsPref" data-p="hider">Hider</button><button class="btn small ' + (me.pref === 'seeker' ? 'gold' : 'ghost') + '" data-act="hsPref" data-p="seeker">Seeker</button></div>' +
      '<p class="muted small-t">Everyone votes for a Seeker among the players who chose the Seeker preference. Most votes wins. A tie goes to whoever has been Seeker least often, then to a random draw. If nobody wants to seek, the Seeker is drawn from everyone.</p>' +
      '<p class="small-t"><b>' + elig.length + '</b> player' + (elig.length === 1 ? '' : 's') + ' can be voted for.</p><p class="muted small-t">Hiders Morph into a piece of scenery and choose where to stand. The Seeker has ' + D.HIDESEEK.seconds + ' seconds and ' + D.HIDESEEK.searches + ' searches to find everyone.</p></div></div>' +
      '<div class="todo"><b>Still needed for online play:</b> shared lobbies, live positions and timers synced between devices, and votes counted by a server.</div>';
    return open(ovEx, UI.sheet(I('compass') + ' Hide and Seek · lobby', body, back('pvpMenu') + '<button class="btn" data-act="hsNew">New lobby</button><button class="btn gold" data-act="hsStart" data-hl="hsStart">Start the vote</button>', 'wide'));
  };
  UI.act('hideseek', (el) => { UI.HS = null; UI.hideSeek(el.closest('.overlay')); });
  UI.act('hsNew', (el) => { UI.HS = null; UI.hideSeek(el.closest('.overlay')); });
  UI.act('hsPref', (el) => { const s = st(); s.hideseek.pref = el.dataset.p; UI.HS.lobby.players[0].pref = el.dataset.p; if (UI.HS.vote === 'you' && el.dataset.p !== 'seeker') UI.HS.vote = null; S.save(); UI.hideSeek(el.closest('.overlay')); });
  UI.act('hsVote', (el) => { UI.HS.vote = el.dataset.id; UI.hideSeek(el.closest('.overlay')); });
  UI.act('hsStart', (el) => {
    const s = st(), L = UI.HS.lobby, votes = R.HideSeek.botVotes(L);
    if (UI.HS.vote) votes.you = UI.HS.vote;
    const r = R.HideSeek.assignSeeker(L, votes, s.hideseek.seekerCount);
    const name = (id) => L.players.find((p) => p.id === id).name;
    s.hideseek.seekerCount[name(r.seeker)] = (s.hideseek.seekerCount[name(r.seeker)] || 0) + 1; S.save();
    UI.HS.assign = r;
    const tally = Object.keys(r.tally).map((id) => esc(name(id)) + ': ' + r.tally[id]).join(' · ');
    const how = r.method === 'vote' ? 'Most votes.' : r.method === 'tiebreak' ? 'A tie, settled for whoever has been Seeker least often.' : 'Nobody chose Seeker, so the Seeker was drawn from everyone.';
    open(el.closest('.overlay'), UI.sheet('The Seeker is ' + esc(r.seeker === 'you' ? 'you' : name(r.seeker)), '<div class="vcard"><h1>' + (r.seeker === 'you' ? 'You are the Seeker' : esc(name(r.seeker)) + ' is the Seeker') + '</h1><p>' + how + '</p>' + (tally ? '<p class="muted small-t">Votes: ' + tally + '</p>' : '') + '<p>' + (r.seeker === 'you' ? 'Tap the scenery to search it. You have ' + D.HIDESEEK.searches + ' searches and ' + D.HIDESEEK.seconds + ' seconds.' : 'Choose what to Morph into and where to hide.') + '</p></div>', '<button class="btn gold" data-act="hsGo">' + (r.seeker === 'you' ? 'Start searching' : 'Choose a disguise') + '</button>', 'narrow'));
  });
  UI.act('hsGo', () => { UI.closeAll(); const r = UI.HS.assign; if (r.seeker === 'you') hsMatch(null); else hsMorph(); });
  function hsMorph() {
    let morph = D.HIDESEEK.morphs[0], cell = null;
    const pre = R.HideSeek.newMatch(UI.HS.lobby, UI.HS.assign.seeker, null); // preview of the scenery (same seed)
    const ov = UI.modal('<div></div>', { dismiss: false });
    const draw = () => {
      ov.innerHTML = UI.sheet('Morph and hide', '<div class="hs-morphs">' + D.HIDESEEK.morphs.map((m) => '<button class="hs-m ' + (m === morph ? 'on' : '') + '" data-m="' + m + '">' + propSvg(m) + '<small>' + m + '</small></button>').join('') + '</div><p class="muted small-t">Pick a disguise that blends in, then tap an empty spot on the map. Hiding near the same kind of thing helps.</p>' + hsGrid(pre, { pick: cell, ghost: morph }),
        '<button class="btn gold ' + (cell ? '' : 'off') + '" id="hs-hide">Morph and hide</button>', 'wide');
      $('.x', ov) && $('.x', ov).remove();
      ov.querySelectorAll('.hs-m').forEach((b) => (b.onclick = () => { morph = b.dataset.m; draw(); }));
      ov.querySelectorAll('.hs-c.free').forEach((c) => (c.onclick = () => { cell = [+c.dataset.x, +c.dataset.y]; draw(); }));
      const go = $('#hs-hide', ov); go.onclick = () => { if (!cell) return; UI.close(ov); hsMatch({ morph, x: cell[0], y: cell[1] }); };
    };
    draw();
  }
  function hsGrid(m, o) {
    o = o || {}; let h = '<div class="hs-map" style="--w:' + m.w + '">';
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const p = m.props.find((q) => q.x === x && q.y === y), hd = m.hiders.find((q) => q.x === x && q.y === y), key = x + ',' + y, sr = m.searched[key];
      const mine = o.pick && o.pick[0] === x && o.pick[1] === y;
      let inner = '', cl = '';
      if (hd && (o.reveal || hd.found)) inner = propSvg(hd.morph, 'm found') + '<span class="hs-tag">' + esc(hd.name) + '</span>';
      else if (hd && o.showMine && hd.id === 'you') inner = propSvg(hd.morph, 'm me') + '<span class="hs-tag">You</span>';
      else if (hd) inner = propSvg(hd.morph, 'm');
      else if (p) inner = propSvg(p.type);
      else if (mine) inner = propSvg(o.ghost, 'ghost');
      if (!p && !hd) cl = ' free';
      h += '<div class="hs-c' + cl + (sr ? ' sr' : '') + (mine ? ' pick' : '') + '" data-x="' + x + '" data-y="' + y + '">' + inner + (sr && !(hd && hd.found) ? '<i class="hs-x"></i>' : '') + '</div>';
    }
    return h + '</div>';
  }
  function hsMatch(mine) {
    const s = st(), L = UI.HS.lobby, m = R.HideSeek.newMatch(L, UI.HS.assign.seeker, mine), youSeek = m.seeker === 'you';
    UI.HS.match = m;
    const rnd = R.HideSeek.rng(L.seed + 3); let t0 = Date.now(), tick = null, botT = null;
    const ov = UI.modal('<div></div>', { dismiss: false });
    const end = () => {
      clearInterval(tick); clearTimeout(botT);
      const youWon = youSeek ? m.result === 'seeker' : m.result === 'hiders' || !m.hiders.find((q) => q.id === 'you').found;
      s.hideseek.played++; if (youWon) s.hideseek.won++; S.save();
      ov.innerHTML = UI.sheet(m.result === 'seeker' ? 'The Seeker found everyone' : 'The hiders win', '<div class="vcard"><h1>' + (youWon ? 'You win!' : 'Not this time') + '</h1><p>' + m.hiders.filter((q) => q.found).length + ' of ' + m.hiders.length + ' hiders found.</p>' + hsGrid(m, { reveal: true }) + '<p class="muted small-t">Games played: ' + s.hideseek.played + ' · won: ' + s.hideseek.won + '</p></div>', '<button class="btn ghost" id="hs-out">Back to the menu</button><button class="btn gold" id="hs-again">New lobby</button>', 'wide');
      $('.x', ov) && $('.x', ov).remove();
      $('#hs-out', ov).onclick = () => { UI.close(ov); UI.HS = null; UI.battleHub(); UI.pvpMenu($('#modal-root .overlay:last-child')); };
      $('#hs-again', ov).onclick = () => { UI.close(ov); UI.HS = null; UI.hideSeek(); };
    };
    const draw = () => {
      const secs = Math.max(0, D.HIDESEEK.seconds - Math.floor((Date.now() - t0) / 1000));
      ov.innerHTML = UI.sheet((youSeek ? 'You are seeking' : 'You are hiding as a ' + mine.morph) + ' <span class="pill hs-time">' + secs + 's · ' + m.searchesLeft + ' searches</span>', hsGrid(m, { showMine: !youSeek }) + '<p class="muted small-t">' + (youSeek ? 'Tap anything that looks out of place. Disguised players sometimes give themselves away with a tiny wobble.' : 'Stay still. ' + esc(L.players.find((p) => p.id === m.seeker).name) + ' is searching.') + ' Found: ' + m.hiders.filter((q) => q.found).length + '/' + m.hiders.length + '.</p>', '<button class="btn ghost" id="hs-quit">Leave the match</button>', 'wide');
      $('.x', ov) && $('.x', ov).remove();
      $('#hs-quit', ov).onclick = () => { m.over = true; m.result = youSeek ? 'hiders' : 'seeker'; if (!youSeek) m.hiders.forEach((q) => { if (q.id === 'you') q.found = true; }); end(); };
      if (youSeek) ov.querySelectorAll('.hs-c').forEach((c) => (c.onclick = () => { if (m.over) return; const r = R.HideSeek.search(m, +c.dataset.x, +c.dataset.y); if (!r.ok) return; Au.play(r.found ? 'discover' : 'tap'); if (r.found) UI.toast('Found ' + m.hiders.find((q) => q.id === r.found).name + '!', 'w'); if (m.over) end(); else draw(); }));
    };
    const botTurn = () => { if (m.over) return; R.HideSeek.botSearch(m, rnd); if (m.over) end(); else { draw(); botT = setTimeout(botTurn, 2200 + rnd() * 2000); } };
    tick = setInterval(() => { if (!ov.parentNode) { clearInterval(tick); clearTimeout(botT); return; } if (Date.now() - t0 >= D.HIDESEEK.seconds * 1000) { R.HideSeek.timeUp(m); end(); } else { const t = $('.hs-time', ov); if (t) t.textContent = Math.max(0, D.HIDESEEK.seconds - Math.floor((Date.now() - t0) / 1000)) + 's · ' + m.searchesLeft + ' searches'; } }, 1000);
    draw();
    if (!youSeek) botT = setTimeout(botTurn, 2500);
  }
})(typeof window !== 'undefined' ? window : globalThis);
