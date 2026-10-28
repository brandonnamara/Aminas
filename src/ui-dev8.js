/* Aminas — Dev 8 interface: living-pixel effects, the player avatar (creator, top-left head, profile with stats,
   achievements and customisation), the wallet (currencies and essences), move upgrades in every monster screen,
   and the reworked bottom-left monster preview (feeding only after a monster is picked). */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Art = A.Art, UI = A.UI, Au = A.Audio, W = A.World, PX = A.Pixel;
  const { esc, pct, chip } = UI.h, I = Art.icon;
  const $ = (s, r) => (r || document).querySelector(s);
  const st = () => S.state;
  const fmt = (n) => Math.floor(n).toLocaleString('en-US');
  const saver = () => !!(A.Perf && A.Perf.saver && A.Perf.saver());

  /* ================================================================ living-pixel effects */
  // A short burst of pixel fragments at a screen point. Used for meaningful moments only (collecting, building,
  // upgrades, evolution, move upgrades, boss entrances). Fragments are plain DOM squares with a stepped CSS
  // animation and are removed after 0.9 s; fewer in battery saver, a few still ones with reduced motion.
  UI.pixelBurst = function (px, py, o) {
    o = o || {}; const app = $('#app'); if (!app) return;
    const ar = app.getBoundingClientRect(), calm = UI.calm && UI.calm();
    const n = Math.max(3, Math.round((o.n || 14) * (saver() ? 0.4 : 1) * (calm ? 0.3 : 1)));
    const cols = o.colors || [o.color || '#ffd86b', '#ffffff', o.color2 || '#fff3b0'];
    const wrap = document.createElement('div'); wrap.className = 'pxb-wrap' + (calm ? ' calm' : '') + (o.big ? ' big' : '');
    wrap.style.cssText = 'left:' + (px - ar.left) + 'px;top:' + (py - ar.top) + 'px';
    let h = '';
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5, dist = (o.big ? 50 : 26) + Math.random() * (o.big ? 70 : 40), sz = [4, 5, 6, 8][i % 4];
      h += '<i style="--dx:' + Math.round(Math.cos(ang) * dist) + 'px;--dy:' + Math.round(Math.sin(ang) * dist - (o.rise ? 30 : 0)) + 'px;width:' + sz + 'px;height:' + sz + 'px;background:' + cols[i % cols.length] + ';animation-delay:' + (i % 3) * 40 + 'ms"></i>';
    }
    wrap.innerHTML = h; app.appendChild(wrap); setTimeout(() => wrap.remove(), 950);
  };
  UI.pixelBurstAt = function (el, o) { if (!el) return; const r = el.getBoundingClientRect(); UI.pixelBurst(r.left + r.width / 2, r.top + r.height / 2, o); };
  // every existing sparkle moment (restoring, levelling, hatching, evolving, building) also sheds pixel fragments
  const sp0 = UI.sparkles;
  UI.sparkles = function (el, n, colors) { sp0.call(this, el, Math.min(n || 12, 10), colors); UI.pixelBurstAt(el || $('#app'), { n: Math.min(24, (n || 12) + 4), colors: colors || ['#ffd86b', '#ffffff', '#8fe6d6', '#ff9ee0'], rise: true }); };

  /* ================================================================ avatar */
  const look = () => (st() && st().avatar ? st().avatar.look : D.AVATAR_DEFAULT);
  UI.avatarBtn = function (s) {
    const av = s.avatar || {};
    return '<button class="avatar-btn" data-act="profile" aria-label="Player profile' + (av.name ? ': ' + esc(av.name) : '') + '"><span class="av-head">' + PX.avatar(av.look) + '</span>' + (av.made ? '' : '<span class="badge dot" title="Make your avatar">!</span>') + '</button>';
  };
  UI.act('profile', () => UI.profile('stats'));

  // The creator: shown once for a new player (after the title screen, before the story begins) and again from
  // Profile > Customisation. First time it cannot be dismissed without confirming.
  UI.avatarCreator = function (o) {
    o = o || {}; const s = st();
    const draft = { look: Object.assign({}, PX.avatarLook(s.avatar && s.avatar.look)), name: (s.avatar && s.avatar.name) || '' };
    const PARTS = [['skin', 'Skin'], ['hair', 'Hair'], ['hairCol', 'Hair colour'], ['eyes', 'Eyes'], ['outfit', 'Outfit'], ['acc', 'Extra']];
    const swatch = (k, i) => { const v = D.AVATAR[k][i][1]; return /^#/.test(v) ? '<i class="avc-sw" style="background:' + v + '"></i>' : ''; };
    const rows = () => PARTS.map(([k, lab]) => '<div class="avc-row"><span class="avc-l">' + lab + '</span><button class="round xs" data-act="avStep" data-k="' + k + '" data-d="-1" aria-label="Previous ' + lab + '">' + I('back') + '</button>' +
      '<span class="avc-v">' + swatch(k, draft.look[k]) + esc(D.AVATAR[k][draft.look[k]][0]) + '</span><button class="round xs" data-act="avStep" data-k="' + k + '" data-d="1" aria-label="Next ' + lab + '">' + I('arrow') + '</button></div>').join('');
    const html = '<div class="sheet panel avc' + (o.first ? ' first' : '') + '"><div class="sh-head"><h2>' + (o.first ? 'Who are you?' : 'Customise your avatar') + '</h2>' + (o.first ? '' : '<button class="x" data-act="close" aria-label="Close">' + I('close') + '</button>') + '</div>' +
      '<div class="sh-body"><div class="avc-grid"><div class="avc-stage"><div class="avc-pv av-idle">' + PX.avatar(draft.look) + '</div><div class="avc-plinth"></div>' +
      '<label class="avc-name">Name <input id="avc-name" maxlength="14" autocomplete="off" spellcheck="false" placeholder="Kind Soul" value="' + esc(draft.name) + '"></label></div>' +
      '<div class="avc-rows">' + rows() + '</div></div>' + (o.first ? '<p class="muted small-t center">You can change any of this later from your profile (tap your head, top left).</p>' : '') + '</div>' +
      '<div class="sh-foot"><button class="btn ghost" data-act="avRandom">' + I('spark') + 'Surprise me</button><span class="sp"></span>' + (o.first ? '' : '<button class="btn ghost" data-act="close">Cancel</button>') + '<button class="btn gold" id="avc-ok">' + I('check') + (o.first ? 'This is me' : 'Save') + '</button></div></div>';
    const ov = UI.modal(html, { dismiss: !o.first }); ov._avc = draft;
    const redraw = () => { $('.avc-pv', ov).innerHTML = PX.avatar(draft.look); $('.avc-rows', ov).innerHTML = rows(); };
    ov._redraw = redraw;
    $('#avc-name', ov).addEventListener('input', (e) => { draft.name = e.target.value.replace(/[<>]/g, '').slice(0, 14); });
    $('#avc-ok', ov).onclick = () => {
      if (ov._done) return; ov._done = true; // one confirm only, however many taps
      const s2 = st(); s2.avatar = { made: true, name: draft.name.trim(), look: PX.avatarLook(draft.look) };
      S.save(); Au.play('ok'); UI.pixelBurstAt($('.avc-pv', ov), { n: 26, big: true, colors: ['#ffd86b', '#fff', '#8fe6d6', '#ff9ee0'] });
      setTimeout(() => { UI.close(ov); if (UI.renderHud && UI.screen === 'island') UI.renderHud(); if (o.done) o.done(); }, 260);
    };
    return ov;
  };
  UI.act('avStep', (el) => { const ov = el.closest('.overlay'), d = ov && ov._avc; if (!d) return; const k = el.dataset.k, n = D.AVATAR[k].length; d.look[k] = (d.look[k] + (+el.dataset.d) + n) % n; Au.play('tap'); ov._redraw(); });
  UI.act('avRandom', (el) => { const ov = el.closest('.overlay'), d = ov && ov._avc; if (!d) return; Object.keys(D.AVATAR).forEach((k) => { d.look[k] = Math.floor(Math.random() * D.AVATAR[k].length); }); Au.play('tap'); ov._redraw(); });

  /* ================================================================ profile */
  UI.profile = function (tab, ovEx) {
    const s = st(), av = s.avatar || {}, need = D.RANK_NEED(s.rank), stt = s.stats || {};
    tab = tab || 'stats';
    const cleared = Object.keys(D.DUNGEONS).filter((id) => R.dungeonCleared(s, id)).length;
    const forms = Object.keys(s.owned).filter((k) => D.SPECIES[k]).length;
    const items = (s.items || []).length, bosses = Object.keys((s.campaign && s.campaign.bosses) || {}).length;
    const stat = (label, v, sub) => '<div class="pst"><small>' + label + '</small><b>' + v + '</b>' + (sub ? '<em>' + sub + '</em>' : '') + '</div>';
    const stats = '<div class="pstats">' + stat('Player Rank', s.rank, fmt(s.rankXp) + ' / ' + fmt(need) + ' xp') + stat('Aminas', s.aminas.length) + stat('Forms owned', forms + ' / ' + D.ROSTER.length) +
      stat('Battles won', fmt(stt.wins | 0), fmt(stt.losses | 0) + ' lost') + stat('Dungeons cleared', cleared + ' / ' + Object.keys(D.DUNGEONS).length) + stat('Island Bosses', bosses) +
      stat('Eggs hatched', fmt(stt.hatched | 0)) + stat('Evolutions', fmt(stt.evolved | 0)) + stat('Times fed', fmt(stt.fed | 0)) +
      stat('Survival best', 'Wave ' + ((s.survival && s.survival.best) | 0)) + stat('Equipment', items) + stat('Move upgrades', fmt(stt.moveUps | 0)) + '</div>' +
      '<div class="section-t">Essence</div><div class="ess-grid">' + D.ESSENCES.map((el) => '<div class="ess-c" title="' + esc(PX.essName(el)) + '">' + Art.essIcon(el) + '<b>' + fmt(R.Essence.get(s, el)) + '</b><small>' + esc(D.ELEMENTS[el].name) + '</small></div>').join('') + '</div>' +
      '<p class="muted small-t">Playing since ' + new Date(s.created || Date.now()).toLocaleDateString() + '. Every number here comes from your save on this device.</p>';
    const list = R.Ach.list(s), done = list.filter((a) => a.done).length;
    const ach = '<div class="ach-head"><b>' + done + ' / ' + list.length + '</b> earned</div><div class="ach-list">' + list.map((a) => '<div class="ach' + (a.done ? ' done' : '') + '"><span class="ach-i">' + I(a.icon) + '</span><div class="grow"><b>' + esc(a.name) + '</b><small>' + esc(a.desc) + '</small>' +
      (a.done ? '<small class="good">Earned' + (a.at ? ' · ' + new Date(a.at).toLocaleDateString() : '') + '</small>' : '<div class="bar"><i style="width:' + pct(a.cur, a.goal) + '%"></i></div><small>' + fmt(a.cur) + ' / ' + fmt(a.goal) + '</small>') + '</div></div>').join('') + '</div>';
    const cust = '<div class="pcust"><div class="avc-pv av-idle">' + PX.avatar(av.look) + '</div><div><p>Change your look and your name. Your progress is not affected.</p><button class="btn gold" data-act="avOpen">' + I('spark') + 'Open the avatar creator</button></div></div>';
    const tabs = '<div class="dtabs" role="tablist">' + [['stats', 'Player Stats'], ['ach', 'Achievements'], ['cust', 'Customisation']].map(([k, t]) => '<button class="dtab ' + (tab === k ? 'on' : '') + '" role="tab" aria-selected="' + (tab === k) + '" data-act="pfTab" data-tab="' + k + '">' + t + (k === 'ach' ? ' <small>' + done + '</small>' : '') + '</button>').join('') + '</div>';
    const head = '<div class="phead"><span class="av-head big av-idle">' + PX.avatar(av.look) + '</span><div><h2>' + esc(av.name || 'Kind Soul') + '</h2><div class="muted">Player Rank ' + s.rank + '</div><div class="bar xp"><i style="width:' + pct(s.rankXp, need) + '%"></i></div></div></div>';
    const html = UI.sheet('Profile', head + tabs + '<div class="ppanel">' + (tab === 'stats' ? stats : tab === 'ach' ? ach : cust) + '</div>', '<button class="btn gold" data-act="close">Close</button>', 'wide profile');
    if (ovEx && ovEx.parentNode) { ovEx.innerHTML = html; ovEx._tab = tab; return ovEx; }
    const ov = UI.modal(html, { onClose: () => UI.refresh && UI.refresh() }); ov._profile = true; ov._tab = tab; return ov;
  };
  UI.act('pfTab', (el) => UI.profile(el.dataset.tab, el.closest('.overlay')));
  UI.act('avOpen', (el) => { const ov = el.closest('.overlay'); UI.avatarCreator({ done: () => { if (ov && ov.parentNode) UI.profile('cust', ov); } }); });
  UI.achToast = function (id) {
    const a = D.ACHIEVEMENTS.find((x) => x.id === id); if (!a) return;
    const d = document.createElement('div'); d.className = 'ach-toast panel'; d.innerHTML = '<span class="ach-i">' + I(a.icon) + '</span><div><small>Achievement</small><b>' + esc(a.name) + '</b></div>';
    $('#app').appendChild(d); Au.play('ok'); setTimeout(() => UI.pixelBurstAt(d, { n: 16 }), 60); setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 300); }, 3200);
  };

  /* ================================================================ wallet (currencies and essences) */
  UI.wallet = function () {
    const s = st();
    const row = (ic, name, v, how) => '<div class="wrow">' + ic + '<div class="grow"><b>' + name + '</b><small>' + how + '</small></div><b class="wv">' + fmt(v) + '</b></div>';
    const body = '<div class="section-t">Currencies</div>' + row(I('gold'), 'Gold', s.res.gold, 'Mines, habitats, battles and rewards. Spent on building, upgrades and the Forge.') +
      row(I('food'), 'Food', s.res.food, 'Berry farms and rewards. Feeds your Aminas so they level up.') + row(I('gem'), 'Gems', s.res.gems, 'Rare. Dungeon clears, tasks and Island Bosses. Finishes timers early.') +
      '<div class="section-t">Elemental essence</div><p class="muted small-t">Essence upgrades moves (Level 1 to 5). Each move uses its own element’s essence.</p>' +
      D.ESSENCES.map((el) => row(Art.essIcon(el), esc(PX.essName(el)), R.Essence.get(s, el), essHow(el))).join('');
    return UI.modal(UI.sheet(I('gold') + ' Wallet', body, '<button class="btn gold" data-act="close">Close</button>', 'narrow wallet'));
  };
  function essHow(el) {
    const hab = D.BUILDINGS['hab_' + el], ru = Object.keys(D.ESS_SOURCES.ruins).filter((k) => D.ESS_SOURCES.ruins[k].indexOf(el) >= 0).map((k) => D.RUINS[k] && D.RUINS[k].name).filter(Boolean);
    const parts = ['Beat ' + D.ELEMENTS[el].name + ' foes in dungeons and Survival'];
    if (hab) parts.push('set a ' + hab.name + ' to make it');
    if (ru.length) parts.push('search ' + ru.join(' or '));
    return esc(parts.join(', ') + '.');
  }
  UI.act('wallet', () => UI.wallet());

  /* ================================================================ moves */
  const pips = (lv) => '<span class="mv-pips" aria-label="Level ' + lv + ' of 5">' + [1, 2, 3, 4, 5].map((i) => '<i class="' + (i <= lv ? 'on' : '') + '"></i>').join('') + '</span>';
  UI.movesHtml = function (s, inst) {
    const sp = D.SPECIES[inst.sp];
    return '<div class="moves" data-uid="' + inst.uid + '">' + [0, 1].map((slot) => {
      const m = R.moveInfo(s, inst, slot), ab = m.ab;
      const kind = ab.cd ? 'Signature move · every ' + (ab.cd + 1) + ' turns' : 'Basic move';
      const btn = m.max ? '<span class="chip good">Level 5</span>' : '<button class="btn small ' + (m.ok ? 'gold' : 'off') + '" data-act="mvUp" data-uid="' + inst.uid + '" data-slot="' + slot + '" data-lv="' + m.lv + '"' + (m.ok ? '' : ' aria-disabled="true"') + '>' + I('up') + 'Upgrade · ' + Art.essIcon(m.el) + m.cost + '</button>';
      return '<div class="mv"><div class="mv-h"><b>' + esc(ab.name) + '</b> ' + chip(ab.el) + ' <span class="mv-lv">Lv ' + m.lv + '</span>' + pips(m.lv) + '</div><small class="muted">' + kind + ' · ' + esc(ab.desc) + '</small>' +
        '<div class="mv-fx"><span>' + esc(m.now.text) + '</span>' + (m.next ? I('arrow') + '<span class="good">' + esc(m.next.text) + '</span>' : '') + '</div>' +
        '<div class="mv-cost">' + (m.max ? '<span class="muted">Fully upgraded.</span>' : '<span>' + Art.essIcon(m.el) + ' ' + fmt(m.have) + ' / ' + m.cost + ' ' + esc(PX.essName(m.el)) + '</span>' + (m.reason && m.reason !== 'max' ? ' <span class="bad">' + esc(R.MOVE_WHY[m.reason]) + '</span>' : '')) + btn + '</div></div>';
    }).join('') + '<p class="muted small-t">Move levels stay with ' + esc(sp.name) + ' when it evolves: its signature move grows into the next form’s move at the same level.</p></div>';
  };
  const mvLast = {};
  UI.act('mvUp', (el) => {
    if (el.classList.contains('off') || el._busy) { Au.play('no'); return; }
    el._busy = true;
    const uid = +el.dataset.uid, slot = +el.dataset.slot, from = +el.dataset.lv, s = st();
    // the panel redraws after an upgrade, so a fast double tap would land on the new button: ignore taps on the same
    // move for a moment after an upgrade (a deliberate second upgrade a second later still works)
    const key = uid + ':' + slot, now = Date.now(); if (now - (mvLast[key] || 0) < 700) return;
    const r = R.upgradeMove(s, uid, slot, from);
    if (!r.ok) { Au.play('no'); if (r.reason !== 'stale') UI.toast(R.MOVE_WHY[r.reason] || 'That did not work.', 't'); UI.refreshMoves(uid); return; }
    mvLast[key] = now; S.save(); R.drain(); R.after(s); Au.play('level');
    UI.pixelBurstAt(el, { n: 22, big: true, color: D.ELEMENTS[r.el].color, color2: '#ffffff', rise: true });
    UI.banner(D.ABILITIES[r.id].name + ' · Lv ' + r.lv, R.moveEffect(r.id, r.lv).text);
    UI.flush && UI.flush(); UI.refreshMoves(uid);
  });
  // Every open screen that shows this Amina's moves redraws from the same data.
  UI.refreshMoves = function (uid) {
    const inst = R.inst(st(), uid); if (!inst) return;
    document.querySelectorAll('.moves[data-uid="' + uid + '"]').forEach((box) => { const t = document.createElement('div'); t.innerHTML = UI.movesHtml(st(), inst); box.replaceWith(t.firstChild); });
    if (UI.selRender && $('#comp')) UI.selRender();
  };
  UI.movesSheet = function (uid) {
    const inst = R.inst(st(), uid); if (!inst) return null;
    return UI.modal(UI.sheet(esc(D.SPECIES[inst.sp].name) + ' · Moves', UI.movesHtml(st(), inst), '<button class="btn ghost" data-act="mvDetail" data-uid="' + uid + '">' + I('info') + 'Details</button><button class="btn gold" data-act="close">Close</button>', 'narrow'));
  };
  UI.act('mvOpen', (el) => { UI.selPause && UI.selPause(); UI.movesSheet(+el.dataset.uid); });
  UI.act('mvDetail', (el) => { const inst = R.inst(st(), +el.dataset.uid); if (!inst) return; UI.close(el.closest('.overlay')); UI.detail(inst.sp, { uid: inst.uid, tab: 'moves' }); });

  /* ================================================================ bottom-left monster preview */
  // Browsing: a compact card that cycles through your Aminas (portrait, name, level). Tap it to pick that Amina:
  // the card then holds still and shows who will be fed, the Snack and Feast buttons, Details and Moves.
  UI.selPicked = null;
  const sel0 = UI.selPaused;
  UI.selPaused = () => !!UI.selPicked || sel0();
  UI.selectorHtml = function (s) {
    const a = UI.selCurrent(s); if (!a) return '';
    if (UI.selPicked && !R.inst(s, UI.selPicked)) UI.selPicked = null;
    const picked = UI.selPicked === a.uid, sp = D.SPECIES[a.sp], need = R.xpNeed(a.lv), list = UI.selOrder(s), i = list.findIndex((x) => x.uid === a.uid), evo = sp.evo && a.lv >= sp.evo.lv, max = a.lv >= D.MAX_LEVEL;
    const xp = '<div class="bar xp"><i style="width:' + (max ? 100 : pct(a.xp, need)) + '%"></i></div><div class="xpl"><span>Lv ' + a.lv + '</span><span>' + (max ? 'MAX' : a.xp + ' / ' + need + ' xp') + '</span></div>';
    let h = '<div class="comp panel sel7 sel8' + (picked ? ' picked' : '') + '" id="comp" data-uid="' + a.uid + '">' +
      '<div class="art" data-act="' + (picked ? 'selDetail' : 'selPick') + '" data-uid="' + a.uid + '" role="button" aria-label="' + (picked ? 'Details for ' : 'Pick ') + esc(sp.name) + '"' + (picked ? '' : ' data-hl="feed"') + '>' + Art.portrait(a.sp) + (evo ? '<span class="evo-badge" title="Ready to evolve">' + I('spark') + '</span>' : '') + '</div>' +
      '<div class="nm"><span class="nmt">' + esc(sp.name) + '</span> ' + chip(sp.el) + (a.uid === s.active ? '<span class="chip light comp-tag">Companion</span>' : '') + '</div>' + xp;
    if (picked) {
      const short = (k) => s.res.food < D.SNACKS[k].food;
      h += '<div class="feedfor">' + (max ? 'Level 30: no more food needed.' : 'Feeding <b>' + esc(sp.name) + '</b> · you have ' + I('food') + fmt(s.res.food)) + '</div>' +
        (max ? '' : '<div class="row"><button class="btn small gold' + (short('snack') ? ' off' : '') + '" data-act="feedSel" data-uid="' + a.uid + '" data-kind="snack" data-hl="feed">' + I('food') + 'Snack ' + D.SNACKS.snack.food + '</button><button class="btn small' + (short('feast') ? ' off' : '') + '" data-act="feedSel" data-uid="' + a.uid + '" data-kind="feast" data-hl="feed">Feast ' + D.SNACKS.feast.food + '</button></div>') +
        '<div class="row sub"><button class="btn small ghost" data-act="selDetail" data-uid="' + a.uid + '">' + I('info') + 'Details</button><button class="btn small ghost" data-act="mvOpen" data-uid="' + a.uid + '">' + I('up') + 'Moves</button><button class="round xs selx" data-act="selUnpick" aria-label="Done">' + I('close') + '</button></div>';
    } else if (list.length > 1) {
      h += '<div class="selnav"><button class="round xs" data-act="selPrev" aria-label="Previous Amina">' + I('back') + '</button><span class="seldots">' + (i + 1) + ' / ' + list.length + '</span><button class="round xs" data-act="selNext" aria-label="Next Amina">' + I('arrow') + '</button></div>';
    } else h += '<div class="selnav"><span class="seldots muted">Tap to feed</span></div>';
    return h + '</div>';
  };
  UI.act('selPick', (el) => { const uid = +el.dataset.uid; if (!R.inst(st(), uid)) return; UI.selUid = uid; UI.selPicked = uid; Au.play('tap'); UI.selRender(); });
  UI.act('selUnpick', () => { UI.selPicked = null; UI.selPause(2500); UI.selRender(); });
  // stepping to another Amina while one is picked keeps the card picked on the newly shown one
  UI.act('selPrev', () => { UI.selPause(); UI.selStep(-1); if (UI.selPicked) { UI.selPicked = UI.selUid; UI.selRender(); } });
  UI.act('selNext', () => { UI.selPause(); UI.selStep(1); if (UI.selPicked) { UI.selPicked = UI.selUid; UI.selRender(); } });
  // feeding only ever applies to the picked Amina (the uid on the button), never to whatever a timer shows
  UI.act('feedSel', (el) => {
    UI.selPause(); const uid = +el.dataset.uid;
    if (el.classList.contains('off')) { Au.play('no'); UI.gainFloat(el, 'Not enough food', '#ff9b8c'); return; }
    if (UI.selPicked !== uid || !R.inst(st(), uid)) return;
    UI.doFeed(uid, el.dataset.kind, el); UI.selRender();
  });
  // the old companion feed action (tutorial highlights) picks the shown Amina first instead of feeding blindly
  UI.act('feed', () => { const c = $('#comp'); if (!c) return; const uid = +c.dataset.uid; UI.selUid = uid; UI.selPicked = uid; UI.selRender(); });

  /* ================================================================ living-pixel test scene */
  // The reference scene for Dev 8's art direction (open with ?scene=livingpixel, or Settings > version x7 > Developer
  // panel). Top: the 3D runtime with terrain, a building, a normal creature (Acinus), a glowing creature (Lumi) and
  // pixel motes. Bottom: the 2D island building, the currency, essence and avatar sprites, and a "moment" button.
  UI.livingPixelScene = function () {
    UI.setScreen('lpscene'); UI.closeAll();
    const IA = A.IsoArt, b = { type: 'forge', level: 2, rot: 0, state: 'built' };
    const sprites = ['gold', 'food', 'gem'].concat(D.ESSENCES.map((e) => 'ess_' + e)).map((n) => '<span class="lp-sp" title="' + n + '">' + PX.sprite(n) + '</span>').join('');
    $('#stage').innerHTML = '<div class="lpscene"><div class="lp-3d" id="lp-3d"><div class="lp-note">Loading the 3D scene…</div></div>' +
      '<div class="lp-side panel"><h2>Living pixel · reference scene</h2><p class="muted small-t">Terrain, a building, a normal creature, a glowing creature and pixel effects, built with the same parts and budget as the game.</p>' +
      '<div class="lp-bld">' + (IA && IA.building ? '<svg viewBox="-110 -150 220 200" class="lp-svg">' + IA.building(b, st() || S.fresh()) + '</svg>' : '') + '<div class="lp-av">' + PX.avatar(D.AVATAR_DEFAULT) + '</div></div>' +
      '<div class="lp-sps">' + sprites + '</div><div class="lp-stats" id="lp-stats"></div>' +
      '<div class="row-actions"><button class="btn gold" id="lp-go">' + I('spark') + 'Play a moment</button><button class="btn ghost" id="lp-back">' + I('back') + 'Back</button></div></div></div>';
    let sc = null, dead = false;
    const host = $('#lp-3d');
    if (A.C3D && A.C3D.enabled()) A.C3D.load().then((mod) => (mod && !dead && mod.createTestScene ? mod.createTestScene(host) : null)).then((x) => { if (!x) { const n = $('.lp-note', host); if (n) n.textContent = '3D is off or unavailable here.'; return; } if (dead) { x.dispose(); return; } sc = x; const n = $('.lp-note', host); if (n) n.remove(); });
    else { const n = $('.lp-note', host); if (n) n.textContent = '3D is off or unavailable here.'; }
    const tick = setInterval(() => { const s3 = A.C3D && A.C3D.stats && A.C3D.stats(), el = $('#lp-stats'); if (!el) return; el.textContent = s3 ? 'fps ' + s3.c3dFps + ' (target ' + s3.targetFps + ') · draw calls ' + s3.drawCalls + ' · triangles ' + s3.triangles + ' · pixel ratio ' + s3.pixelRatio : ''; }, 1000);
    UI.timers.lp = tick;
    UI.cleanups.push(() => { dead = true; clearInterval(tick); if (sc) sc.dispose(); sc = null; });
    $('#lp-go').onclick = () => { if (sc) sc.moment(); UI.pixelBurstAt($('.lp-bld svg'), { n: 24, big: true, colors: ['#ffd86b', '#fff', '#ff8a3a', '#8fe6d6'], rise: true }); Au.play('restore'); };
    $('#lp-back').onclick = () => { if (st() && st().starter) UI.showIsland(); else UI.showTitle(); };
  };
  UI.act('lpScene', () => UI.livingPixelScene());
})(typeof window !== 'undefined' ? window : globalThis);
