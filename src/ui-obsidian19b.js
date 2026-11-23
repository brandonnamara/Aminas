/* Aminas — Phase 19B: Obsidian Reach's places and dungeon entrances on the island screen, the level-cap display and
   notice, and the developer panel's construction preview.
   Tapping a place opens a short sheet: what you see, a line from the Entity, and (for places with an entrance) the
   dungeon's state in the island's order. A Wayfinder row moves the camera to any place and points at it. Nothing here
   can start a battle: an Enter button exists only for an entrance whose state is 'open', which needs the campaign
   switch (D.O19.live) and playable dungeon data that this build does not have. The sheet reuses the Verdant sheet's
   styles (src/ui-polish16b.css, .v18-*), so both islands read the same. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, UI = A.UI, Au = A.Audio;
  const { esc } = UI.h, I = A.Art.icon;
  const st = () => S.state;
  const O = R.O19;
  const placeIds = () => D.O19.sites.filter((s) => !s.part).map((s) => s.id);

  const stateTag = (k) => k === 'open' ? '<span class="tagp play">Open</span>' : k === 'sealed' ? '<span class="tagp v18-sealed">' + I('lock') + ' Sealed</span>' : '<span class="tagp sealed">' + I('lock') + ' Locked</span>';
  function order(s, cur) {
    return '<div class="v18-order o19-order" aria-label="Dungeon order">' + D.O19.gates.map((g) => {
      const k = O.cleared(s, g.id) ? 'done' : O.gateState(s, g.id).state;
      return '<button class="v18-dot ' + k + (g.id === cur ? ' cur' : '') + '" data-act="o19Go" data-id="' + g.id + '" title="' + esc(g.n + '. ' + g.name) + '">' + g.n + '</button>';
    }).join('') + '</div>';
  }
  function gateCard(s, g) {
    const gs = O.gateState(s, g.id);
    let h = '<div class="v18-gate ' + gs.state + '"><div class="v18-gh"><b>Dungeon ' + g.n + ' of 10 · ' + esc(g.name) + '</b>' + stateTag(gs.state) + '</div>' +
      '<p class="muted small-t">' + esc(g.theme) + ' Recommended level ' + g.rec + (g.boss ? ' · Island Boss' : '') + '.</p><p class="small-t">' + esc(gs.text) + '</p>' + order(s, g.id);
    if (gs.state === 'open') h += '<div class="row-actions"><button class="btn gold" data-act="o19Enter" data-id="' + g.id + '">' + I('swords') + ' Enter</button></div>';
    return h + '</div>';
  }
  function wayfinder(s, here) {
    return '<div class="v18-way"><span class="muted small-t">Wayfinder</span>' + placeIds().map((id) => {
      const p = O.site(id);
      return '<button class="chip v18-wp' + (id === here ? ' on' : '') + (O.seen(s, id) ? ' seen' : '') + '" data-act="o19Go" data-id="' + id + '">' + esc(p.name.replace(/^The /, '')) + '</button>';
    }).join('') + '<button class="chip v18-wp" data-act="o19Go" data-id="' + D.O19.gates[0].id + '">Dungeon 1</button></div>';
  }
  UI.o19Open = function (id) {
    const s = st(); const site = O.site(id), gate = O.gate(id);
    if (!site && !gate) return null;
    const main = site && site.part ? O.site(site.part) : site;
    O.visit(s, site ? (site.part || site.id) : id); if (site && site.part) O.visit(s, site.id);
    S.save && S.save();
    const g = gate || D.O19.gates.find((x) => x.site === (main && main.id));
    const pr = O.progress(s);
    let body = '';
    if (site) body += '<p>' + esc(site.text) + '</p><p class="v18-ent"><b>The Entity:</b> “' + esc(site.entity) + '”</p>';
    if (g) body += gateCard(s, g);
    body += wayfinder(s, main ? main.id : null);
    const title = I(gate && !site ? 'gate' : 'compass') + ' ' + esc(site ? site.name : gate.name);
    const foot = '<span class="muted small-t" style="margin-right:auto">Places visited ' + pr.seen + ' of ' + pr.total + '</span><button class="btn gold" data-act="close">Close</button>';
    Au && Au.play && Au.play('ok');
    const born = Date.now(), ov = UI.modal(UI.sheet(title, '<div class="v18 o19">' + body + '</div>', foot, 'narrow v18-sheet o19-sheet'), { dismiss: false, onClose: () => UI.refresh && UI.refresh() });
    ov.addEventListener('click', (e) => { if (Date.now() - born < 400) { e.stopPropagation(); e.preventDefault(); } }, true); // the tap that opened it must not close it
    ov.addEventListener('click', (e) => { if (e.target === ov) UI.close(ov); });
    return ov;
  };
  const hot0 = UI.hotspot;
  UI.hotspot = function (h) {
    if (typeof h === 'string' && h.indexOf('o19:') === 0) { UI.o19Open(h.slice(4)); return; }
    return hot0.apply(this, arguments);
  };
  UI.o19Go = function (id) {
    const s = st(), site = O.site(id), gate = O.gate(id), p = site || (gate && gate.site ? O.site(gate.site) : null);
    const x = p ? p.x : gate.x, y = p ? p.y : gate.y, w = p ? p.w : 1, h = p ? p.h : 1;
    UI.closeAll();
    if (s.currentIsland !== D.O19.island) { if (!W.islandUnlocked(s, D.O19.island) || (W.islandLive && !W.islandLive(D.O19.island))) { UI.toast && UI.toast('Obsidian Reach is not ready to visit yet.'); return; } UI.travelTo(D.O19.island); }
    if (UI.focusFoot) UI.focusFoot(x, y, w, h);
    const hl = 'o19:' + (gate && !gate.site ? gate.id : p ? p.id : id);
    UI.guide = { hl: [hl], msg: (site || gate).name + (gate ? ' · Dungeon ' + gate.n : ''), t: Date.now() };
    UI.renderGuide && UI.renderGuide(); UI.applyHl && UI.applyHl();
  };
  UI.act('o19Go', (el) => UI.o19Go(el.dataset.id));
  UI.act('o19Enter', (el) => { const id = el.dataset.id; if (!O.canEnter(st(), id)) { Au && Au.play && Au.play('no'); return; } UI.closeAll(); UI.dIsland = D.O19.island; UI.dungeons(null, id); });

  /* ---------- level cap: shown on the creature screen, and announced once when it rises ---------- */
  UI.capLine = function (s, inst) {
    const cap = R.levelCap(s), nx = R.nextCap(s);
    if (inst.lv < cap) return '';
    const how = nx ? ' Defeat ' + (nx.boss === 'verdant' ? 'the Forest Crown, the Verdant Wilds’ Island Boss,' : 'the Forge Heart, Obsidian Reach’s Island Boss,') + ' to raise it to ' + nx.cap + '.' : '';
    return '<p class="o19-cap small-t">' + I('star') + ' Level cap ' + cap + ' reached: no more XP for now.' + esc(how) + '</p>';
  };
  const detail0 = UI.detail;
  if (detail0) UI.detail = function (spId, opts) {
    const r = detail0.apply(this, arguments), s = st(), uid = opts && opts.uid, inst = uid ? R.inst(s, uid) : (s.aminas || []).find((a) => a.sp === spId);
    try { const ov = [...document.querySelectorAll('#modal-root .overlay')].pop(), at = ov && ov.querySelector('.dpanel[data-panel="battle"], .detail .stats'); if (inst && at && !ov.querySelector('.o19-cap')) { const h = UI.capLine(s, inst); if (h) at.insertAdjacentHTML('beforebegin', h); } } catch (e) { /* the screen still works without the line */ }
    return r;
  };
  UI.capCheck = function () {
    const s = st(); if (!s || !O.capNotice) return;
    const raised = O.capNotice(s); if (!raised) return;
    S.save && S.save();
    if (UI.toast) UI.toast('Level cap raised to ' + raised + '. Your Aminas can grow again.', 'w');
  };
  if (R.on) R.on('islandBossDefeated', () => setTimeout(() => UI.capCheck(), 0));
  const showIsland0 = UI.showIsland;
  // shown once the island is calm: after any arrival scene, dialogue or open sheet (checked again every 1.5 s, up to 2 min)
  let capTimer = 0;
  const capLater = (n) => { clearTimeout(capTimer); capTimer = setTimeout(() => { if (UI.screen !== 'island') return; if (UI.modalOpen() || UI.sceneBox || document.querySelector('.dlg')) { if (n < 80) capLater(n + 1); return; } UI.capCheck(); }, n ? 1500 : 1200); };
  if (showIsland0) UI.showIsland = function () { const r = showIsland0.apply(this, arguments); capLater(0); return r; };

  /* ---------- developer panel: Obsidian Reach construction preview ---------- */
  const dev0 = UI.devPanel;
  if (dev0) UI.devPanel = function () {
    const r = dev0.apply(this, arguments);
    const ov = [...document.querySelectorAll('#modal-root .overlay')].pop(), at = ov && ov.querySelector('.row-actions');
    if (at) at.insertAdjacentHTML('beforeend', '<button class="btn small" data-act="o19Preview">Obsidian Reach construction preview</button>');
    return r;
  };
  UI.act('o19Preview', () => {
    const s = st(); O.preview(s); S.save && S.save(); UI.closeAll();
    UI.toast && UI.toast('Construction preview: Obsidian Reach is open for this session only. Its dungeons stay sealed.', 'w');
    UI.travelTo('obsidian');
  });
})(typeof window !== 'undefined' ? window : globalThis);
