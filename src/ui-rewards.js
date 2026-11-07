/* Aminas — unified reward presentation (Phase 6).
   One vocabulary for everything the player receives, wherever it comes from:
   - a reward TILE (icon in a rarity frame + amount or name + what it is), used in lists and result screens;
   - a reward GROUP (a short heading naming the source, e.g. "Forgotten Road · first clear", and its tiles);
   - a reward CARD (the pop-up announcement: kicker, title, optional tiles, source line), used for equipment finds,
     task rewards and other moments that happen outside a result screen.
   The rarity ladder is defined once here (UI.RARITY) and drives the frame, the glow, the motion and the burst:
   common (calm) → uncommon → rare → epic → legendary (gold prism) → mythic (full spectrum, the most celebrated).
   Nothing here changes what is received: every amount comes from the rules as it always has.
   Styling: ui-combat.css ("rewards"). */
(function (root) {
  'use strict';
  const A = root.A, UI = A.UI, D = A.Data, Art = A.Art, doc = root.document;
  if (!UI) return;
  const I = (n, c) => Art.icon(n, c);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmt = (n) => Number(n || 0).toLocaleString('en-GB');
  const calm = () => !!(doc.body.classList.contains('calm') || doc.body.classList.contains('perf-saver') || (UI.calm && UI.calm()));

  /* ---- the rarity ladder: label, how long a card stays, how much celebration ---- */
  const SPEC = ['#ff9ee0', '#b49bff', '#8ff0ff', '#ffd978'];
  UI.RARITY = {
    common:    { rank: 0, label: 'Common', find: 'New equipment', ms: 3600, burst: 0 },
    uncommon:  { rank: 1, label: 'Uncommon', find: 'Uncommon find', ms: 3800, burst: 0 },
    rare:      { rank: 2, label: 'Rare', find: 'Rare find', ms: 4200, burst: 10, colors: ['#7fc6ff', '#8ff0ff', '#ffffff', '#b49bff'] },
    epic:      { rank: 3, label: 'Epic', find: 'Epic find', ms: 4800, burst: 18, colors: ['#cf9bff', '#ff9ee0', '#ffffff', '#8ff0ff'] },
    legendary: { rank: 4, label: 'Legendary', find: 'Legendary find', ms: 5600, burst: 24, colors: ['#ffd978', '#fff3c0', '#ffffff', '#ffb46b'] },
    mythic:    { rank: 5, label: 'Mythic', find: 'Mythic find', ms: 6400, burst: 30, colors: SPEC },
  };
  const rar = (k) => UI.RARITY[k] || UI.RARITY.common;

  /* ---- what each kind of reward looks like ---- */
  const KIND = {
    gold:    { icon: () => I('gold'), label: 'Gold', rarity: 'common' },
    food:    { icon: () => I('food'), label: 'Food', rarity: 'common' },
    gems:    { icon: () => I('gem'), label: 'Gems', rarity: 'rare' },
    essence: { icon: (r) => (Art.essIcon ? Art.essIcon(r.el) : I('spark')), label: (r) => (D.ELEMENTS[r.el] ? D.ELEMENTS[r.el].name + ' Essence' : 'Essence'), rarity: 'uncommon' },
    xp:      { icon: () => I('xp'), label: 'Experience', rarity: 'common' },
    rankxp:  { icon: () => I('crown'), label: 'Rank XP', rarity: 'common' },
    rank:    { icon: () => I('crown'), label: 'Player Rank', rarity: 'epic' },
    item:    { icon: (r) => (UI.itemIcon ? UI.itemIcon(r.id, 40) : I('anvil')), label: (r) => D.ITEMS[r.id].name, rarity: (r) => D.ITEMS[r.id].rarity || 'common' },
    amina:   { icon: (r) => Art.portrait(r.id), label: (r) => D.SPECIES[r.id].name, rarity: (r) => (D.SPECIES[r.id].legendary ? 'legendary' : 'rare') },
    island:  { icon: () => I('island'), label: (r) => D.ISLANDS[r.id].name, rarity: 'mythic' },
  };
  const val = (v, r) => (typeof v === 'function' ? v(r) : v);
  const R_ = UI.Rewards = {};
  R_.rarityOf = (r) => r.rarity || val(KIND[r.k].rarity, r);
  // {gold, food, gems} → a list of rewards (order: gold, food, gems)
  R_.fromRes = (o) => ['gold', 'food', 'gems'].filter((k) => o && o[k]).map((k) => ({ k, n: o[k] }));
  R_.tile = function (r, i) {
    const K = KIND[r.k]; if (!K) return '';
    const rk = R_.rarityOf(r), named = r.k === 'item' || r.k === 'amina' || r.k === 'island';
    const sub = r.k === 'item' ? rar(rk).label + (D.ITEMS[r.id].unique ? ' · Unique' : '') + ' · ' + (D.GEAR_SLOT_NAMES && D.GEAR_SLOT_NAMES[D.ITEMS[r.id].slot] || 'Equipment')
      : r.k === 'amina' ? (D.SPECIES[r.id].legendary ? 'Legendary Amina' : 'New Amina') : r.k === 'island' ? 'New island' : val(K.label, r);
    const main = named ? val(K.label, r) : r.k === 'rank' ? 'Rank ' + r.n : '+' + fmt(r.n);
    return '<div class="rtile r-' + rk + ' k-' + r.k + '" style="--i:' + (i || 0) + '" role="listitem" aria-label="' + esc((named ? main + ', ' + sub : main + ' ' + sub)) + '"><span class="rt-ico">' + K.icon(r) + '</span><span class="rt-t"><b>' + esc(main) + '</b><small>' + esc(sub) + '</small></span></div>';
  };
  R_.list = (list) => '<div class="rgrid" role="list">' + list.map((r, i) => R_.tile(r, i)).join('') + '</div>';
  R_.group = (g) => '<div class="rgroup">' + (g.title ? '<div class="rg-t">' + (g.icon ? I(g.icon) : '') + '<span>' + esc(g.title) + '</span></div>' : '') + R_.list(g.list) + '</div>';
  // after a result screen opens: the best reward in it gets its burst (legendary and above), never with reduced motion
  R_.celebrate = function (scope) {
    if (!scope || calm() || !UI.sparkles) return;
    let best = null, bk = -1;
    scope.querySelectorAll('.rtile').forEach((t) => { const m = /r-(\w+)/.exec(t.className), k = m ? rar(m[1]).rank : 0; if (k > bk) { bk = k; best = t; } });
    if (best && bk >= 3) { const m = /r-(\w+)/.exec(best.className); setTimeout(() => { if (best.isConnected) UI.sparkles(best.querySelector('.rt-ico'), rar(m[1]).burst, rar(m[1]).colors); }, 380); }
  };

  /* ---- the reward card (pop-up) ---- */
  let wrap = null;
  R_.card = function (o) {
    const app = doc.getElementById('app'); if (!app) return null;
    if (!wrap || !wrap.isConnected) { wrap = doc.createElement('div'); wrap.className = 'reward-wrap'; app.appendChild(wrap); }
    wrap.innerHTML = '';
    const r = rar(o.rarity), card = doc.createElement('div');
    card.className = 'reward-card r-' + (o.rarity || 'common') + (o.list ? ' has-list' : ''); card.setAttribute('role', 'status');
    card.innerHTML = '<div class="rw-ico">' + (o.icon || '') + '</div><small>' + esc(o.kicker || r.find) + '</small><b>' + esc(o.title || '') + '</b>' +
      (o.sub ? '<div class="rw-sub">' + esc(o.sub) + '</div>' : '') + (o.list ? R_.list(o.list) : '') + (o.source ? '<div class="rw-src">' + I('map') + esc(o.source) + '</div>' : '');
    wrap.appendChild(card);
    if (r.burst && !calm() && UI.sparkles) UI.sparkles(card.querySelector('.rw-ico'), r.burst, r.colors);
    if (A.Audio && A.Audio.play) A.Audio.play(r.rank >= 3 ? 'discover' : 'ok');
    const kill = () => { if (!card.isConnected) return; card.classList.add('out'); setTimeout(() => card.remove(), 320); };
    card.onclick = kill; setTimeout(kill, o.ms || r.ms);
    return card;
  };
  // where an item came from, in words ("dungeon:forgottenroad" → "The Forgotten Road")
  R_.sourceName = function (src) {
    if (!src) return '';
    const m = /^(\w+):(\w+)/.exec(src); if (!m) return '';
    if (m[1] === 'dungeon' && D.DUNGEONS[m[2]]) return D.DUNGEONS[m[2]].name;
    if (m[1] === 'ruin' && D.RUINS && D.RUINS[m[2]]) return D.RUINS[m[2]].name;
    return '';
  };

  /* ---- equipment finds: the card (Phase 5's UI.itemFound, now on the shared ladder) ---- */
  UI.itemFound = function (id, o) {
    const it = D.ITEMS[id]; if (!it) return null; o = o || {};
    // while a result screen is being built, the find goes onto that screen instead
    if (UI.rewardSink) { UI.rewardSink.push(id); return null; }
    const rk = it.rarity || 'common', r = rar(rk);
    return R_.card({ rarity: rk, kicker: (it.unique ? 'Unique · ' : '') + r.find, title: it.name, icon: UI.itemIcon ? UI.itemIcon(id, 40) : I('anvil'),
      sub: 'Equip it from the Forge or a creature’s Gear tab.', source: o.source || R_.sourceName(o.from) });
  };

  /* ---- special moments ---- */
  // A new Amina: the creature is the hero. The card adds a quiet "discovered" line with its place in the collection;
  // the light stays behind the creature (ui-combat.css), and legendary creatures keep Phase 5's spectrum treatment.
  const reveal0 = UI.reveal;
  if (reveal0) UI.reveal = function (spId, done, o) {
    const out = reveal0.apply(this, arguments), sp = D.SPECIES[spId];
    const cards = doc.querySelectorAll('.vcard.reveal'), card = cards[cards.length - 1];
    if (card && sp && !card.classList.contains('disc')) {
      card.classList.add('disc', sp.legendary ? 'r-legendary' : 'r-rare');
      // one quiet line above the title: where it sits in the collection (the rarity tag, if any, comes from ui-prism.js)
      const owned = A.Rules && A.Rules.ownedCount && A.State.state ? A.Rules.ownedCount(A.State.state) : 0, total = D.ROSTER ? D.ROSTER.length : 0;
      const h = card.querySelector('h1'); if (h && owned && total) h.insertAdjacentHTML('beforebegin', '<small class="v-kick disc-meta">' + I('book') + 'Collection ' + owned + ' / ' + total + '</small>');
    }
    return out;
  };
  // A new island: the spectrum frame, a kicker, and the island as the picture.
  const isle0 = UI.islandUnlockedFx;
  if (isle0) UI.islandUnlockedFx = function (iid) {
    const ov = isle0.apply(this, arguments), card = ov && ov.querySelector('.newisle');
    if (card) { card.classList.add('r-mythic'); const h = card.querySelector('h1'); if (h) h.insertAdjacentHTML('beforebegin', '<small class="v-kick">New island unlocked</small>'); }
    return ov;
  };
})(typeof window !== 'undefined' ? window : globalThis);
