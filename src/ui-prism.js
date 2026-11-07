/* Aminas — Prismatic Fantasy UI behaviour (Phase 5). Small, shared pieces of the design system that need script:
   - legendary reveals: the "New Amina" card of a legendary creature gets the spectrum treatment and a tag;
   - the bottom navigation shows which of its screens is open.
   Styling lives in ui-prism.css; rules in docs/ui/UI_DESIGN_SYSTEM.md. */
(function (root) {
  'use strict';
  const A = root.A, UI = A.UI, D = A.Data, doc = root.document;
  if (!UI) return;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const calm = () => !!(doc.body.classList.contains('calm') || doc.body.classList.contains('perf-saver'));

  /* The rarity ladder (UI.RARITY) and the equipment card (UI.itemFound) moved to ui-rewards.js in Phase 6, where every
     reward shares one presentation. */

  /* ---- legendary reveal ---- */
  const reveal0 = UI.reveal;
  if (reveal0) UI.reveal = function (spId, done, o) {
    const out = reveal0.apply(this, arguments), sp = D.SPECIES[spId];
    if (sp && sp.legendary) {
      const cards = doc.querySelectorAll('.vcard.reveal'), card = cards[cards.length - 1];
      if (card && !card.classList.contains('r-legendary')) {
        card.classList.add('r-legendary');
        const h = card.querySelector('h1'); if (h) h.insertAdjacentHTML('afterend', '<div class="rar-tag">Legendary</div>');
        if (!calm() && UI.sparkles) setTimeout(() => UI.sparkles(card.querySelector('.reveal-art'), 24, (UI.RARITY && UI.RARITY.legendary.colors) || ['#ffd978', '#fff3c0', '#ffffff', '#ffb46b']), 350);
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
