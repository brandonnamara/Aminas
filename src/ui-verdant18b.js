/* Aminas — Phase 18B: the Verdant Wilds' places and dungeon entrances on the island screen.
   Tapping a place opens a short sheet: what you see, a line from the Entity, and (for the places with an entrance)
   the dungeon's state in the island's order. A Wayfinder row moves the camera to any place and points at it.
   Nothing here can start a battle: an Enter button exists only for a gate whose state is 'open', which needs the
   campaign switch (D.V18.live) and playable dungeon data that this build does not have. Development previews
   (?dev18 in the address) add each gate's planned guardian, and still offer no way in. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, UI = A.UI, Au = A.Audio;
  const { esc } = UI.h, I = A.Art.icon;
  const st = () => S.state;
  const V = R.V18;
  const dev = () => { try { return /[?&]dev18\b/.test(root.location.search); } catch (e) { return false; } };
  const placeIds = () => D.V18.sites.filter((s) => !s.part).map((s) => s.id);

  const stateTag = (k) => k === 'open' ? '<span class="tagp play">Open</span>' : k === 'sealed' ? '<span class="tagp v18-sealed">' + I('lock') + ' Sealed</span>' : '<span class="tagp sealed">' + I('lock') + ' Locked</span>';
  // the island's ten entrances in order: cleared, open, sealed (its turn has come) or locked
  function order(s, cur) {
    return '<div class="v18-order" aria-label="Dungeon order">' + D.V18.gates.map((g) => {
      const k = V.cleared(s, g.id) ? 'done' : V.gateState(s, g.id).state;
      return '<button class="v18-dot ' + k + (g.id === cur ? ' cur' : '') + '" data-act="v18Go" data-id="' + g.id + '" title="' + esc(g.n + '. ' + g.name) + '">' + g.n + '</button>';
    }).join('') + '</div>';
  }
  function gateCard(s, g) {
    const gs = V.gateState(s, g.id);
    let h = '<div class="v18-gate ' + gs.state + '"><div class="v18-gh"><b>Dungeon ' + g.n + ' of 10 · ' + esc(g.name) + '</b>' + stateTag(gs.state) + '</div>' +
      '<p class="muted small-t">' + esc(g.theme) + ' Recommended level ' + g.rec + (g.boss ? ' · Island Boss' : '') + '.</p><p class="small-t">' + esc(gs.text) + '</p>' + order(s, g.id);
    if (dev()) h += '<p class="v18-dev small-t">Development preview: planned guardian “' + esc(g.plan) + '”. This entrance cannot be entered in this build.</p>';
    if (gs.state === 'open') h += '<div class="row-actions"><button class="btn gold" data-act="v18Enter" data-id="' + g.id + '">' + I('swords') + ' Enter</button></div>';
    return h + '</div>';
  }
  function wayfinder(s, here) {
    return '<div class="v18-way"><span class="muted small-t">Wayfinder</span>' + placeIds().map((id) => {
      const p = V.site(id);
      return '<button class="chip v18-wp' + (id === here ? ' on' : '') + (V.seen(s, id) ? ' seen' : '') + '" data-act="v18Go" data-id="' + id + '">' + esc(p.name.replace(/^The /, '')) + '</button>';
    }).join('') + '</div>';
  }

  UI.v18Open = function (id) {
    const s = st(); const site = V.site(id), gate = V.gate(id);
    if (!site && !gate) return null;
    const main = site && site.part ? V.site(site.part) : site;
    V.visit(s, site ? (site.part || site.id) : id); if (site && site.part) V.visit(s, site.id);
    S.save && S.save();
    const g = gate || D.V18.gates.find((x) => x.site === (main && main.id));
    const pr = V.progress(s);
    let body = '';
    if (site) body += '<p>' + esc(site.text) + '</p><p class="v18-ent"><b>The Entity:</b> “' + esc(site.entity) + '”</p>';
    if (g) body += gateCard(s, g);
    body += wayfinder(s, main ? main.id : null);
    const title = I(gate && !site ? 'gate' : 'compass') + ' ' + esc(site ? site.name : gate.name);
    const foot = '<span class="muted small-t" style="margin-right:auto">Places visited ' + pr.seen + ' of ' + pr.total + '</span><button class="btn gold" data-act="close">Close</button>';
    Au && Au.play && Au.play('ok');
    // opened by a tap on the island: the click that follows the same touch must not land on the backdrop and close it
    const born = Date.now(), ov = UI.modal(UI.sheet(title, '<div class="v18">' + body + '</div>', foot, 'narrow v18-sheet'), { dismiss: false, onClose: () => UI.refresh && UI.refresh() });
    ov.addEventListener('click', (e) => { if (Date.now() - born < 400) { e.stopPropagation(); e.preventDefault(); } }, true); // nor press a button that appeared under the finger
    ov.addEventListener('click', (e) => { if (e.target === ov) UI.close(ov); });
    return ov;
  };

  // taps on the island: "v18:<id>" hotspots (places and entrances)
  const hot0 = UI.hotspot;
  UI.hotspot = function (h) {
    if (typeof h === 'string' && h.indexOf('v18:') === 0) { UI.v18Open(h.slice(4)); return; }
    return hot0.apply(this, arguments);
  };
  // Wayfinder: close the sheet, move the camera to the place and point at it for a while
  UI.v18Go = function (id) {
    const s = st(), site = V.site(id), gate = V.gate(id), p = site || (gate && gate.site ? V.site(gate.site) : null);
    const x = p ? p.x : gate.x, y = p ? p.y : gate.y, w = p ? p.w : 1, h = p ? p.h : 1;
    UI.closeAll();
    if (s.currentIsland !== D.V18.island) { if (!W.islandUnlocked(s, D.V18.island)) { UI.toast && UI.toast('Reach the Verdant Wilds first.'); return; } UI.travelTo(D.V18.island); }
    if (UI.focusFoot) UI.focusFoot(x, y, w, h);
    const hl = 'v18:' + (gate && !gate.site ? gate.id : p ? p.id : id);
    UI.guide = { hl: [hl], msg: (site || gate).name + (gate ? ' · Dungeon ' + gate.n : ''), t: Date.now() };
    UI.renderGuide && UI.renderGuide(); UI.applyHl && UI.applyHl();
  };
  UI.act('v18Go', (el) => UI.v18Go(el.dataset.id));
  UI.act('v18Enter', (el) => { const id = el.dataset.id; if (!V.canEnter(st(), id)) { Au && Au.play && Au.play('no'); return; } UI.closeAll(); UI.dIsland = D.V18.island; UI.dungeons(null, id); });
  UI.act('travelNotReady', () => UI.toast && UI.toast('That island is not ready to visit yet.'));
  // travel refused for an island that is not ready: say so instead of doing nothing
  const travel0 = UI.travelTo;
  if (travel0) UI.travelTo = function (iid) { if (W.islandLive && D.ISLANDS[iid] && !W.islandLive(iid)) { UI.toast && UI.toast(D.ISLANDS[iid].name + ' is not ready to visit yet.'); return false; } return travel0.apply(this, arguments); };
})(typeof window !== 'undefined' ? window : globalThis);
