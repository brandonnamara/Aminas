/* Aminas — Phase 20B: the Celestial Crown's places and dungeon entrances on the island screen, the Starwell Habitat's
   line in the Codex, and the developer panel's session-only construction preview and habitat access.
   Tapping a place (or an entrance) opens a short sheet: what you see, a line from the Entity, and the dungeon there with
   its state in the island's order. A Wayfinder row moves the camera to any place and points at it. Nothing here can start
   a battle: an Enter button exists only for an entrance whose state is 'open', which needs the campaign switch
   (D.C20.live) and playable dungeon data that this build does not have. The sheet reuses the Verdant sheet's styles
   (src/ui-polish16b.css, .v18-*), so all three islands read the same. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, UI = A.UI, Au = A.Audio;
  const { esc } = UI.h, I = A.Art.icon;
  const st = () => S.state;
  const C = R.C20;

  const stateTag = (k) => k === 'open' ? '<span class="tagp play">Open</span>' : k === 'done' ? '<span class="tagp play">' + I('check') + ' Cleared</span>' : k === 'sealed' ? '<span class="tagp v18-sealed">' + I('lock') + ' Sealed</span>' : '<span class="tagp sealed">' + I('lock') + ' Locked</span>';
  function order(s, cur) {
    return '<div class="v18-order c20-order" aria-label="Dungeon order">' + D.C20.gates.map((g) => {
      const k = C.cleared(s, g.id) ? 'done' : C.gateState(s, g.id).state;
      return '<button class="v18-dot ' + k + (g.id === cur ? ' cur' : '') + '" data-act="c20Go" data-id="' + g.id + '" title="' + esc(g.n + '. ' + g.name) + '">' + g.n + '</button>';
    }).join('') + '</div>';
  }
  function gateCard(s, g) {
    const gs = C.gateState(s, g.id), k = C.cleared(s, g.id) ? 'done' : gs.state;
    let h = '<div class="v18-gate ' + gs.state + '"><div class="v18-gh"><b>Dungeon ' + g.n + ' of 10 · ' + esc(g.name) + '</b>' + stateTag(k) + '</div>' +
      '<p class="muted small-t">' + esc(g.theme) + ' Recommended level ' + g.rec + (g.boss ? ' · Island Boss' : '') + '.</p><p class="small-t">' + esc(gs.text) + '</p>' + order(s, g.id);
    if (gs.state === 'open') h += '<div class="row-actions"><button class="btn gold" data-act="c20Enter" data-id="' + g.id + '">' + I('swords') + ' Enter</button></div>';
    return h + '</div>';
  }
  function wayfinder(s, here) {
    return '<div class="v18-way"><span class="muted small-t">Wayfinder</span>' + C.placeIds().map((id) => {
      const p = C.site(id);
      return '<button class="chip v18-wp' + (id === here ? ' on' : '') + (C.seen(s, id) ? ' seen' : '') + '" data-act="c20Go" data-id="' + id + '">' + esc(p.name.replace(/^The /, '')) + '</button>';
    }).join('') + '<button class="chip v18-wp" data-act="c20Go" data-id="' + D.C20.gates[0].id + '">Dungeon 1</button></div>';
  }
  UI.c20Open = function (id) {
    const s = st(), gate0 = C.gate(id), site = C.site(id) || (gate0 && C.site(gate0.site));
    if (!site && !gate0) return null;
    C.visit(s, site.id); if (gate0) C.visit(s, gate0.id);
    S.save && S.save();
    const g = gate0 || C.gateFor(site.id);
    const pr = C.progress(s);
    let body = '<p>' + esc(site.text) + '</p><p class="v18-ent"><b>The Entity:</b> “' + esc(site.entity) + '”</p>';
    if (g) body += gateCard(s, g);
    body += wayfinder(s, site.id);
    const title = I(gate0 ? 'gate' : 'compass') + ' ' + esc(gate0 ? gate0.name : site.name);
    const foot = '<span class="muted small-t" style="margin-right:auto">Places visited ' + pr.seen + ' of ' + pr.total + '</span><button class="btn gold" data-act="close">Close</button>';
    Au && Au.play && Au.play('ok');
    const born = Date.now(), ov = UI.modal(UI.sheet(title, '<div class="v18 c20">' + body + '</div>', foot, 'narrow v18-sheet c20-sheet'), { dismiss: false, onClose: () => UI.refresh && UI.refresh() });
    ov.addEventListener('click', (e) => { if (Date.now() - born < 400) { e.stopPropagation(); e.preventDefault(); } }, true); // the tap that opened it must not close it
    ov.addEventListener('click', (e) => { if (e.target === ov) UI.close(ov); });
    return ov;
  };
  const hot0 = UI.hotspot;
  UI.hotspot = function (h) {
    if (typeof h === 'string' && h.indexOf('c20:') === 0) { UI.c20Open(h.slice(4)); return; }
    return hot0.apply(this, arguments);
  };
  UI.c20Go = function (id) {
    const s = st(), site = C.site(id), gate = C.gate(id), p = site || (gate && gate.inside ? C.site(gate.site) : null);
    const x = p ? p.x : gate.x, y = p ? p.y : gate.y, w = p ? p.w : 1, h = p ? p.h : 1;
    UI.closeAll();
    if (s.currentIsland !== D.C20.island) { if (!W.islandUnlocked(s, D.C20.island) || (W.islandLive && !W.islandLive(D.C20.island))) { UI.toast && UI.toast('The Celestial Crown is not ready to visit yet.'); return; } UI.travelTo(D.C20.island); }
    if (UI.focusFoot) UI.focusFoot(x, y, w, h);
    const hl = 'c20:' + (gate && !gate.inside ? gate.id : p ? p.id : id);
    UI.guide = { hl: [hl], msg: (site || gate).name + (gate ? ' · Dungeon ' + gate.n : ''), t: Date.now() };
    UI.renderGuide && UI.renderGuide(); UI.applyHl && UI.applyHl();
  };
  UI.act('c20Go', (el) => UI.c20Go(el.dataset.id));
  UI.act('c20Enter', (el) => { const id = el.dataset.id; if (!C.canEnter(st(), id)) { Au && Au.play && Au.play('no'); return; } UI.closeAll(); UI.dIsland = D.C20.island; UI.dungeons(null, id); });

  /* ---------- the Codex: where a Resonance Amina feels at home ---------- */
  UI.c20HomeLine = function (s, spId) {
    const sp = D.SPECIES[spId], h = D.BUILDINGS.hab_resonance; if (!sp || !h || sp.el !== 'resonance') return '';
    const open = R.reqMet(s, h.req);
    return '<p class="c20-home small-t">' + I('home') + ' Home: the ' + esc(h.name) + ' (Resonance residents earn 50% more).' + (open ? '' : ' ' + esc('Opens with the Bell Loft on the Celestial Crown.')) + '</p>';
  };
  const detail0 = UI.detail;
  if (detail0) UI.detail = function (spId) {
    const r = detail0.apply(this, arguments);
    try { const ov = r && r.nodeType === 1 ? r : [...document.querySelectorAll('#modal-root .overlay')].filter((o) => o.querySelector('.detail')).pop(), at = ov && ov.querySelector('.dpanel[data-panel="battle"], .detail .stats'); if (at && !ov.querySelector('.c20-home')) { const h = UI.c20HomeLine(st(), spId); if (h) at.insertAdjacentHTML('beforebegin', h); } } catch (e) { /* the screen still works without the line */ }
    return r;
  };

  /* ---------- developer panel (session only; developer builds) ----------
     The construction preview opens the Crown for this session (see C.preview in src/celestial20b.js); the habitat switch
     lets this session build the Starwell Habitat without the Bell Loft. Neither is saved, and neither opens a dungeon. */
  const dev0 = UI.devPanel;
  if (dev0) UI.devPanel = function () {
    const r = dev0.apply(this, arguments);
    const ov = [...document.querySelectorAll('#modal-root .overlay')].pop(), at = ov && ov.querySelector('.row-actions');
    if (at) at.insertAdjacentHTML('beforeend', '<button class="btn small" data-act="c20Preview">Celestial Crown preview (session)</button><button class="btn small" data-act="c20Hab">' + (C.dev.habitat ? 'Starwell Habitat: on (session)' : 'Starwell Habitat (session)') + '</button>');
    return r;
  };
  UI.act('c20Preview', () => {
    const s = st(), r = C.preview(s); UI.closeAll();
    if (!r.ok) { UI.toast && UI.toast(r.text, 'w'); return; }
    S.save && S.save(); UI.travelTo('celestial');
    UI.toast && UI.toast('Construction preview: the Celestial Crown is open for this session. Its dungeons stay sealed.', 'w');
  });
  UI.act('c20Hab', () => { const on = C.devHabitat(!C.dev.habitat); UI.closeAll(); UI.toast && UI.toast(on ? 'Starwell Habitat can be built in this session (developer access).' : 'Starwell Habitat developer access is off.', 'w'); });
})(typeof window !== 'undefined' ? window : globalThis);
