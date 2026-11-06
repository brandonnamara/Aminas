/* Aminas — Prismatic Fantasy UI behaviour (Phase 5). Small, shared pieces of the design system that need script:
   - UI.itemFound: the reward card for equipment discoveries, with rarity-scaled intensity (replaces a plain toast);
   - legendary reveals: the "New Amina" card of a legendary creature gets the spectrum treatment and a tag;
   - the bottom navigation shows which of its screens is open.
   Styling lives in ui-prism.css; rules in docs/ui/UI_DESIGN_SYSTEM.md. */
(function (root) {
  'use strict';
  const A = root.A, UI = A.UI, D = A.Data, doc = root.document;
  if (!UI) return;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const calm = () => !!(doc.body.classList.contains('calm') || doc.body.classList.contains('perf-saver'));

  /* ---- rarity ladder (one place): label, how long the card stays, and how much celebration it gets ---- */
  UI.RARITY = {
    common:    { label: 'New equipment', ms: 3600, burst: 0 },
    uncommon:  { label: 'Uncommon find', ms: 3800, burst: 0 },
    rare:      { label: 'Rare find', ms: 4200, burst: 10, colors: ['#7fc6ff', '#8ff0ff', '#ffffff', '#b49bff'] },
    epic:      { label: 'Epic find', ms: 4800, burst: 18, colors: ['#cf9bff', '#ff9ee0', '#ffffff', '#8ff0ff'] },
    mythic:    { label: 'Legendary find', ms: 6200, burst: 30, colors: ['#ff9ee0', '#b49bff', '#8ff0ff', '#ffd978'] },
    legendary: { label: 'Legendary', ms: 6200, burst: 30, colors: ['#ff9ee0', '#b49bff', '#8ff0ff', '#ffd978'] },
  };

  let wrap = null;
  UI.itemFound = function (id) {
    const it = D.ITEMS[id]; if (!it) return;
    const r = UI.RARITY[it.rarity] || UI.RARITY.common, app = doc.getElementById('app'); if (!app) return;
    if (!wrap || !wrap.isConnected) { wrap = doc.createElement('div'); wrap.className = 'reward-wrap'; app.appendChild(wrap); }
    wrap.innerHTML = '';
    const card = doc.createElement('div'); card.className = 'reward-card r-' + (it.rarity || 'common'); card.setAttribute('role', 'status');
    card.innerHTML = '<div class="rw-ico">' + (UI.itemIcon ? UI.itemIcon(id, 40) : '') + '</div><small>' + esc(it.unique ? 'Unique · ' + r.label : r.label) + '</small><b>' + esc(it.name) + '</b><div class="rw-sub">Equip it from the Forge or a creature’s Gear tab.</div>';
    wrap.appendChild(card);
    if (r.burst && !calm() && UI.sparkles) UI.sparkles(card.querySelector('.rw-ico'), r.burst, r.colors);
    if (A.Audio && A.Audio.play) A.Audio.play(r.burst >= 18 ? 'discover' : 'ok');
    const kill = () => { if (!card.isConnected) return; card.classList.add('out'); setTimeout(() => card.remove(), 320); };
    card.onclick = kill; setTimeout(kill, r.ms);
    return card;
  };

  /* ---- legendary reveal ---- */
  const reveal0 = UI.reveal;
  if (reveal0) UI.reveal = function (spId, done, o) {
    const out = reveal0.apply(this, arguments), sp = D.SPECIES[spId];
    if (sp && sp.legendary) {
      const cards = doc.querySelectorAll('.vcard.reveal'), card = cards[cards.length - 1];
      if (card && !card.classList.contains('r-legendary')) {
        card.classList.add('r-legendary');
        const h = card.querySelector('h1'); if (h) h.insertAdjacentHTML('afterend', '<div class="rar-tag">Legendary</div>');
        if (!calm() && UI.sparkles) setTimeout(() => UI.sparkles(card.querySelector('.reveal-art'), 24, UI.RARITY.legendary.colors), 350);
      }
    }
    return out;
  };

  /* ---- navigation: the button of the screen that is open stays lit ---- */
  let navOn = null;
  doc.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.nav .nbtn'); if (!b) return;
    if (navOn && navOn !== b) navOn.classList.remove('on');
    navOn = b; setTimeout(() => { if (doc.querySelector('#modal-root .overlay')) b.classList.add('on'); else navOn = null; }, 60);
  }, true);
  const mr = doc.getElementById('modal-root');
  if (mr && root.MutationObserver) new MutationObserver(() => { if (navOn && !mr.querySelector('.overlay')) { navOn.classList.remove('on'); navOn = null; } }).observe(mr, { childList: true });
})(typeof window !== 'undefined' ? window : globalThis);
