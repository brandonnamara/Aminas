/* Aminas — Phase 13B: the Hatchery screen, breeding flow and hatching (presentation only).
   Rules, pairings, costs, timers and slots are untouched (rules.js); everything shown comes from R.Hatch
   (src/hatchery.js) and the existing rules.
   - One screen, two columns: the breeding slots with their state and the Hatchery's level and next upgrade on the
     left; choosing parents, the requirements, the outcome and the cost on the right.
   - Breeding asks for confirmation before anything is spent; the confirmation can only apply once.
   - Hatching: the egg cracks and opens, then the Amina is shown with its element, role, stage and stats, and whether
     it is new to the collection.
   - A small marker over the Hatchery on the island says when eggs are incubating or ready.
   Effects are one-off and short; with Reduce Motion, Battery saver or a resting island they are skipped and the same
   information appears at once. Incubating eggs no longer wobble all the time (only a ready egg moves). */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Au = A.Audio, UI = A.UI, Art = A.Art, W = A.World;
  const { esc, chip, artBox, silBox } = UI.h, I = Art.icon, st = () => S.state, $ = (s, r) => (r || document).querySelector(s);
  const H = R.Hatch, P = (UI.P13B = {});
  const quiet = () => (UI.calm && UI.calm()) || document.body.classList.contains('perf-saver') || document.body.classList.contains('calm');
  const fmt = (n) => Math.floor(n).toLocaleString('en-US');
  const fmtT = (secs) => (A.IsoArt && A.IsoArt.fmtTime ? A.IsoArt.fmtTime(secs) : Art.fmtTime ? Art.fmtTime(secs) : secs + 's');
  const ROLE_NAME = { balanced: 'Balanced', swift: 'Swift', tank: 'Tank', bruiser: 'Bruiser', mystic: 'Mystic' };
  const elCol = (spId) => { const s = D.SPECIES[spId]; return s ? D.ELEMENTS[s.el].color : null; };

  /* ---------------- the egg (a pixel sprite; speckles take the parents' element colours) ---------------- */
  const EGG = ['....###....', '...#####...', '..#######..', '..#######..', '.#########.', '.#########.', '###########', '###########', '###########', '###########', '.#########.', '.#########.', '..#######..', '...#####...'];
  const SPECK1 = ['3,3', '7,6', '2,8', '6,10', '4,12'], SPECK2 = ['6,2', '3,6', '8,8', '4,9', '7,11'];
  const CRACK = [[], ['5,5', '4,6', '5,7'], ['5,5', '4,6', '5,7', '6,8', '5,9', '3,7'], ['5,5', '4,6', '5,7', '6,8', '5,9', '3,7', '7,7', '8,6', '4,10', '6,4', '2,6']];
  P.egg = function (parents, o) {
    o = o || {}; const pc = (parents || []).map(elCol).filter(Boolean), c1 = pc[0] || '#ffb8d2', c2 = pc[1] || pc[0] || '#9ad4ff', crack = CRACK[o.crack | 0] || [];
    const at = (x, y) => y >= 0 && y < EGG.length && EGG[y][x] === '#';
    let r = '';
    EGG.forEach((row, y) => row.split('').forEach((ch, x) => {
      if (ch !== '#') return; const k = x + ',' + y, edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      const col = crack.indexOf(k) >= 0 ? '#3a2a4a' : edge ? '#a8834c' : SPECK1.indexOf(k) >= 0 ? c1 : SPECK2.indexOf(k) >= 0 ? c2 : x <= 3 && y <= 4 ? '#ffffff' : x >= 7 || y >= 11 ? '#ecd6a6' : '#fff4d6';
      r += '<rect x="' + x + '" y="' + y + '" width="1.03" height="1.03" fill="' + col + '"/>';
    }));
    return '<svg class="pegg' + (o.cls ? ' ' + o.cls : '') + '" viewBox="-0.5 -0.5 12 15" width="' + (o.size || 30) + '" height="' + Math.round((o.size || 30) * 1.25) + '" shape-rendering="crispEdges" aria-hidden="true">' + r + '</svg>';
  };
  // an egg is named once its species has been met; a first egg stays a mystery until it hatches
  const eggName = (s, e) => (s.owned[e.sp] ? D.SPECIES[e.sp].name + ' egg' : 'Mystery egg');

  /* ---------------- slots ---------------- */
  const leftText = (ms) => { const secs = Math.ceil(ms / 1000); return (secs >= 60 ? Math.floor(secs / 60) + 'm ' + (secs % 60) + 's' : secs + 's') + ' left'; };
  function slotRow(s, i, n) {
    if (i >= n) {
      const h = s.buildings.hatchery, upg = h && h.state === 'upgrading' && h.toLevel === i + 1;
      return '<div class="hx-slot locked" data-slot="' + i + '">' + I('lock') + '<div class="hx-sb"><b>Slot ' + (i + 1) + '</b><small>' + (upg ? 'Opens when the upgrade finishes' : 'Opens at Hatchery Lv ' + (i + 1)) + '</small></div></div>';
    }
    const e = R.eggStatus(s, null, i);
    if (!e) return '<button class="hx-slot free' + (UI.hSlot === i ? ' sel' : '') + '" data-act="hSlot" data-i="' + i + '" data-slot="' + i + '">' + I('plus') + '<div class="hx-sb"><b>Slot ' + (i + 1) + '</b><small>' + (UI.hSlot === i ? 'Empty: the next egg goes here' : 'Empty') + '</small></div></button>';
    const egg = R.eggIn(s, i), full = e.ready && s.aminas.length >= D.MAX_INSTANCES;
    return '<div class="hx-slot busy' + (e.ready ? ' ready' : '') + (P.laid === i ? ' laid' : '') + '" data-slot="' + i + '">' + P.egg(egg.parents, { size: 26, crack: e.ready ? 1 : 0, cls: e.ready ? 'wob' : '' }) +
      '<div class="hx-sb"><b>Slot ' + (i + 1) + ' <span class="muted">· ' + esc(eggName(s, egg)) + '</span></b><div class="bar xp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(e.progress * 100) + '"><i style="width:' + Math.round(e.progress * 100) + '%"></i></div>' +
      '<small class="hx-left">' + (e.ready ? (full ? 'Ready, but there is no room (' + D.MAX_INSTANCES + ' Aminas at most)' : 'Ready to hatch') : leftText(e.left)) + '</small></div>' +
      (e.ready ? '<button class="btn small gold" data-act="hHatch" data-i="' + i + '">' + I('egg') + 'Hatch</button>' : '') + '</div>';
  }
  const slotsHtml = (s, n) => Array.from({ length: D.MAX_EGG_SLOTS }, (_, i) => slotRow(s, i, n)).join('');
  const stateChip = (x) => '<span class="hx-state s-' + x.state + '">' + H.STATE_NAME[x.state] + (x.state === 'ready' && x.ready > 1 ? ' · ' + x.ready : '') + '</span>';
  const stateLine = (x) => x.state === 'idle' ? 'No eggs yet. Choose two parents to breed.' : x.state === 'ready' ? x.ready + ' egg' + (x.ready === 1 ? ' is' : 's are') + ' ready to hatch.' + (x.incubating ? ' ' + x.incubating + ' still incubating.' : '')
    : x.state === 'full' ? 'Every slot is incubating. Next egg in ' + fmtT(Math.ceil(x.soonest / 1000)) + '.' : x.used + ' of ' + x.slots + ' slots incubating. Next egg in ' + fmtT(Math.ceil(x.soonest / 1000)) + '.';

  /* ---------------- level and upgrade ---------------- */
  const costHtml = (c) => ['gold', 'food', 'gems'].filter((k) => c && c[k]).map((k) => I(k === 'gems' ? 'gem' : k) + ' ' + fmt(c[k])).join(' ');
  function upgradeHtml(s) {
    const u = H.upgrade(s), pc = (v) => Math.round(v * 100) + '%';
    const head = '<div class="hx-up-h"><b>Hatchery Lv ' + u.level + ' of ' + u.max + '</b><span>' + u.slots + ' breeding slot' + (u.slots === 1 ? '' : 's') + (u.eggTime < 1 ? ' · incubation ' + pc(u.eggTime) : '') + '</span></div>';
    if (u.atMax) return '<div class="hx-up max">' + head + '<small class="good">Highest level: all ' + u.slots + ' slots are open.</small></div>';
    const nx = u.next, short = Object.keys(nx.short || {}).length ? 'Need ' + Object.keys(nx.short).map((k) => fmt(nx.short[k]) + ' more ' + k).join(' and ') + '.' : '';
    return '<div class="hx-up">' + head + '<div class="hx-up-n"><small>Next, Lv ' + nx.level + ': <b class="good">+1 slot</b> (' + nx.slots + ' in all)' + (nx.eggTime !== u.eggTime ? ', incubation ' + pc(u.eggTime) + ' → <b class="good">' + pc(nx.eggTime) + '</b>' : '') + '</small>' +
      '<small>' + (u.upgrading ? 'Upgrading now: ' + fmtT(Math.max(0, Math.ceil((u.endAt - R.now()) / 1000))) + ' left.' : costHtml(nx.cost) + ' · ' + fmtT(nx.time) + (short ? ' <span class="bad">' + short + '</span>' : nx.ok ? '' : ' <span class="bad">' + esc(nx.text) + '</span>')) + '</small></div>' +
      (u.upgrading ? '' : '<button class="btn small ' + (nx.ok ? '' : 'ghost') + '" data-act="hUpgrade">' + I('up') + 'Upgrade</button>') + '</div>';
  }

  /* ---------------- breeding panel ---------------- */
  const WHY = {
    egg: 'Every slot is in use. Hatch an egg, or upgrade the Hatchery for another slot.', slot: 'That slot is not open yet.', pick: 'Choose two parents.', same: 'Choose two different Aminas.',
    level: 'Both parents must be level ' + D.BREED_MIN_LEVEL + ' or higher. Feed them or battle to level up.', incompat: 'These two elements do not pair. Try another partner.', locked: 'This pairing needs the Dormant Spire to wake first.', noHatchery: 'Restore the Old Hatchery first.',
  };
  const whyText = (p) => p.reason === 'cost' ? 'Not enough ' + ['gold', 'food'].filter((k) => p.short[k]).map((k) => k + ' (' + p.short[k] + ' short)').join(' and ') + '.' : WHY[p.reason] || '';
  function parentBtn(s, i) {
    const a = R.inst(s, UI.hSel[i]);
    return '<button class="hx-parent' + (a ? ' set' : '') + '" data-act="hPick" data-i="' + i + '" aria-label="Choose parent ' + (i + 1) + '">' + (a ? artBox(a.sp) + '<b>' + esc(D.SPECIES[a.sp].name) + '</b><small>' + chip(D.SPECIES[a.sp].el) + ' Lv ' + a.lv + '</small>' : I('plus') + '<span class="muted">Parent ' + (i + 1) + '</span>') + '</button>';
  }
  function outcomeBox(s, p) {
    if (!p.a || !p.b || p.a.uid === p.b.uid) return '<div class="hx-out none"><div class="hx-q">?</div><small class="muted">Egg</small></div>';
    if (!p.outcome) return '<div class="hx-out bad"><div class="hx-q">' + I(p.needs[2].locked ? 'lock' : 'close') + '</div><small>' + (p.needs[2].locked ? 'Locked' : 'No match') + '</small></div>';
    const o = p.outcome;
    return '<div class="hx-out ok">' + (o.known ? artBox(o.sp) : silBox(o.sp)) + '<small><b>' + (o.known ? esc(o.name) : 'Mystery egg') + '</b></small></div>';
  }
  function breedHtml(s) {
    const x = H.status(s), p = H.pair(s, UI.hSel[0], UI.hSel[1], UI.hSlot >= 0 ? UI.hSlot : null), picked = p.a && p.b;
    const need = (n) => '<li class="' + (n.ok ? 'ok' : picked || n.k === 'slot' || n.k === 'cost' ? 'no' : 'wait') + '">' + I(n.ok ? 'check' : 'lock') + '<span>' + esc(n.text) + (n.k === 'cost' && (n.short.gold || n.short.food) ? ' <span class="bad">(' + ['gold', 'food'].filter((k) => n.short[k]).map((k) => n.short[k] + ' ' + k + ' short').join(', ') + ')</span>' : '') + '</span></li>';
    const outNote = !picked ? 'The egg is decided by the two parents’ elements.' : p.outcome ? (p.outcome.known ? 'These two always lay ' + esc(p.outcome.name) + ' eggs (hatches at Lv 1).' : 'A pairing you have not tried: the egg is a mystery until it hatches.') : whyText(p);
    return '<div class="hx-breed"><div class="hx-cap">Breed' + (x.free ? ' <span class="muted">· into Slot ' + ((p.slot >= 0 ? p.slot : 0) + 1) + '</span>' : '') + '</div>' +
      '<div class="hx-pair">' + parentBtn(s, 0) + '<span class="hx-op">+</span>' + parentBtn(s, 1) + '<span class="hx-op">' + I('arrow') + '</span>' + outcomeBox(s, p) + '</div>' +
      '<small class="hx-note ' + (picked && !p.outcome ? 'bad' : 'muted') + '">' + outNote + '</small>' +
      '<ul class="hx-needs">' + p.needs.map(need).join('') + '</ul>' +
      '<div class="hx-go"><span class="hx-cost">' + I('gold') + ' ' + p.cost.gold + ' ' + I('food') + ' ' + p.cost.food + ' <span class="muted">· hatches in ' + fmtT(p.secs) + ' · parents are kept</span></span>' +
      '<button class="btn gold ' + (p.ok ? '' : 'off') + '" data-act="hStart" data-hl="hStart"' + (p.ok ? '' : ' aria-disabled="true"') + '>' + I('egg') + ' Breed</button></div>' +
      '<div class="hx-status" role="status" aria-live="polite">' + (P.note ? esc(P.note) : '') + '</div></div>';
  }

  /* ---------------- the screen ---------------- */
  UI.hSel = UI.hSel || [null, null];
  UI.hatchery = function (ovEx) {
    const s = st();
    if (!s.struct.hatchery) { UI.toast('The Old Hatchery is still in ruins. Restore it first (it unlocks after the Tide Gate).', 't'); return; }
    const n = R.eggSlots(s), x = H.status(s);
    UI.hSel = [0, 1].map((i) => (R.inst(s, UI.hSel[i]) ? UI.hSel[i] : null));
    if (UI.hSlot == null || UI.hSlot >= n || UI.hSlot < 0 || R.eggIn(s, UI.hSlot)) UI.hSlot = R.freeSlot(s);
    const body = '<div class="hx"><div class="hx-left-col"><div class="hx-cap">Breeding slots <span class="muted">· ' + x.used + ' of ' + x.slots + ' in use</span></div><div class="hx-slots" id="hslots">' + slotsHtml(s, n) + '</div>' + upgradeHtml(s) + '</div>' + breedHtml(s) + '</div>';
    const html = UI.sheet(I('egg') + ' Old Hatchery <span class="lv">Lv ' + R.hatcheryLevel(s) + '</span> ' + stateChip(x), body,
      '<span class="muted small-t hx-foot" id="hx-line">' + esc(stateLine(x)) + '</span><button class="btn small ghost" data-act="hBook">' + I('scroll') + 'Recipe book</button><button class="btn gold" data-act="close">Close</button>', 'wide hatch13');
    let ov = ovEx && ovEx.parentNode ? ovEx : null;
    if (ov) { const sb = $('.sh-body', ov), top = sb ? sb.scrollTop : 0; ov.innerHTML = html; const nb = $('.sh-body', ov); if (nb) nb.scrollTop = top; }
    else ov = UI.modal(html, { onClose: () => { UI.hatchTick = null; P.note = ''; UI.refresh(); } });
    ov._hatchery = true; P.laid = null;
    // every second: bars and times change in place; the screen is only redrawn when an egg becomes ready or the
    // number of slots changes
    let sig = x.state + ':' + x.ready + ':' + x.used + ':' + n;
    UI.hatchTick = () => {
      if (!ov.parentNode) { UI.hatchTick = null; return; }
      const s2 = st(), x2 = H.status(s2), sig2 = x2.state + ':' + x2.ready + ':' + x2.used + ':' + R.eggSlots(s2);
      if (sig2 !== sig) { sig = sig2; UI.hatchery(ov); return; }
      ov.querySelectorAll('.hx-slot.busy:not(.ready)').forEach((row) => { const e = R.eggStatus(s2, null, +row.dataset.slot); if (!e) return; const bar = $('.bar > i', row), t = $('.hx-left', row); if (bar) bar.style.width = Math.round(e.progress * 100) + '%'; if (t) t.textContent = leftText(e.left); });
      const line = $('#hx-line', ov); if (line) line.textContent = stateLine(x2);
      const up = $('.hx-up', ov); if (up && H.upgrade(s2).upgrading) { const t = document.createElement('div'); t.innerHTML = upgradeHtml(s2); up.replaceWith(t.firstChild); }
    };
    return ov;
  };
  const hatchOv = () => [...$('#modal-root').children].reverse().find((x) => x._hatchery) || null;
  UI.act('hSlot', (el) => { UI.hSlot = +el.dataset.i; UI.hatchery(el.closest('.overlay')); });
  UI.act('hUpgrade', () => { UI.closeAll(); UI.buildingPanel('hatchery'); });

  // choosing a parent: valid partners first, each with what the pair would lay; the rest say why not
  UI.act('hPick', (el) => {
    const s = st(), i = +el.dataset.i, other = R.inst(s, UI.hSel[1 - i]), parentOv = el.closest('.overlay');
    const list = s.aminas.map((a) => ({ a, c: H.candidate(s, a, other) })).sort((x, y) => (y.c.ok - x.c.ok) || y.a.lv - x.a.lv);
    const nOk = list.filter((x) => x.c.ok).length;
    const cards = list.map(({ a, c }) => {
      const sp = D.SPECIES[a.sp], sub = c.ok ? (c.sp ? '<span class="hx-lays">' + I('egg') + (c.known ? esc(D.SPECIES[c.sp].name) : 'Mystery egg') + '</span>' : '') : '<span class="hx-why">' + esc(c.why) + '</span>';
      return '<div class="card hx-cand ' + (c.ok ? '' : 'dis') + (UI.hSel[i] === a.uid ? ' cur' : '') + '"' + (c.ok ? ' data-act="hSet" data-i="' + i + '" data-uid="' + a.uid + '"' : ' aria-disabled="true"') + '>' + artBox(a.sp) + '<div class="nm">' + esc(sp.name) + '</div><div>' + chip(sp.el) + '</div><div class="lvl">Lv ' + a.lv + '</div>' + sub + '</div>';
    }).join('');
    const ov = UI.modal(UI.sheet('Choose parent ' + (i + 1) + ' <span class="muted small-t">· ' + nOk + ' can breed' + (other ? ' with ' + esc(D.SPECIES[other.sp].name) : '') + '</span>', '<div class="grid hx-cands">' + cards + '</div>',
      '<span class="muted small-t" style="margin-right:auto">Parents must be level ' + D.BREED_MIN_LEVEL + '+. They are not used up, and can stay in battle teams and homes.</span>' + (UI.hSel[i] != null ? '<button class="btn small ghost" data-act="hClear" data-i="' + i + '">Clear</button>' : '') + '<button class="btn ghost" data-act="close">Cancel</button>', 'wide'));
    ov._parent = parentOv;
  });
  UI.act('hSet', (el) => { const ov = el.closest('.overlay'), p = ov._parent; UI.hSel[+el.dataset.i] = +el.dataset.uid; P.note = ''; UI.close(ov); if (p && p.parentNode) UI.hatchery(p); });
  UI.act('hClear', (el) => { const ov = el.closest('.overlay'), p = ov._parent; UI.hSel[+el.dataset.i] = null; UI.close(ov); if (p && p.parentNode) UI.hatchery(p); });

  // Breed: a confirmation with the pair, the egg, the slot, the time and what will be left. It applies once.
  UI.act('hStart', (el) => {
    const s = st(), ov = el.closest('.overlay'), p = H.pair(s, UI.hSel[0], UI.hSel[1], UI.hSlot >= 0 ? UI.hSlot : null);
    if (!p.ok) { Au.play('no'); P.note = whyText(p); const line = $('.hx-status', ov); if (line) { line.textContent = P.note; line.className = 'hx-status bad said'; } return; }
    const a = p.a, b = p.b, o = p.outcome, ids = [a.uid, b.uid], slot = p.slot;
    const html = '<div class="hx-conf"><div class="hx-pair">' + '<div class="hx-parent set">' + artBox(a.sp) + '<b>' + esc(D.SPECIES[a.sp].name) + '</b><small>Lv ' + a.lv + '</small></div><span class="hx-op">+</span><div class="hx-parent set">' + artBox(b.sp) + '<b>' + esc(D.SPECIES[b.sp].name) + '</b><small>Lv ' + b.lv + '</small></div><span class="hx-op">' + I('arrow') + '</span>' +
      '<div class="hx-out ok">' + P.egg([a.sp, b.sp], { size: 34 }) + '<small><b>' + (o.known ? esc(o.name) + ' egg' : 'Mystery egg') + '</b></small></div></div>' +
      '<div class="kv"><b>Cost:</b> ' + I('gold') + ' ' + p.cost.gold + ' ' + I('food') + ' ' + p.cost.food + ' <span class="muted">· you will have ' + I('gold') + ' ' + fmt(p.have.gold - p.cost.gold) + ' ' + I('food') + ' ' + fmt(p.have.food - p.cost.food) + ' left</span></div>' +
      '<div class="kv"><b>Slot ' + (slot + 1) + '</b> · ready to hatch in ' + fmtT(p.secs) + '. Both parents stay with you.</div></div>';
    const cf = UI.modal(UI.sheet('Breed these two?', html, '<button class="btn ghost" data-act="close">Cancel</button><button class="btn gold" data-act="hbConfirm">' + I('egg') + ' Breed</button>', 'narrow hx-confirm'));
    cf._run = (btn) => {
      if (cf._done) return; cf._done = true; btn.disabled = true;
      const r = R.startBreed(st(), ids[0], ids[1], slot); UI.close(cf);
      if (!r.ok) { Au.play('no'); P.note = whyText(H.pair(st(), ids[0], ids[1], slot)) || 'That did not work. Nothing was spent.'; }
      else { UI.hSel = [null, null]; UI.hSlot = null; P.note = 'Egg laid in Slot ' + (r.slot + 1) + '. Ready to hatch in ' + fmtT(p.secs) + '.'; S.save(); UI.flush(); UI.renderHud(); }
      const h = ov && ov.parentNode ? ov : hatchOv(); if (h) { UI.hatchery(h); if (r.ok) { const row = $('.hx-slot[data-slot="' + r.slot + '"]', h); if (row && !quiet()) row.classList.add('laid'); const line = $('.hx-status', h); if (line) line.className = 'hx-status good said'; } else { const line = $('.hx-status', h); if (line) line.className = 'hx-status bad said'; } }
    };
  });
  UI.act('hbConfirm', (el) => { const ov = el.closest('.overlay'); if (ov && ov._run) ov._run(el); });

  UI.act('hHatch', (el) => {
    if (el._busy) return; el._busy = true;
    const ov = el.closest('.overlay'), slot = +el.dataset.i, egg = R.eggIn(st(), slot), parents = egg ? egg.parents.slice() : [];
    P.hatching = { slot, parents };
    const r = R.hatch(st(), null, slot);
    if (!r.ok) { el._busy = false; P.hatching = null; Au.play('no'); if (r.reason === 'full') { P.note = 'No room for another Amina (' + D.MAX_INSTANCES + ' at most). The egg will wait in its slot.'; UI.hatchery(ov); const line = $('.hx-status', ov); if (line) line.className = 'hx-status bad said'; } return; }
    P.note = ''; UI.afterAction(); UI.hatchery(ov);
  });

  UI.act('hBook', () => {
    const s = st(), b = H.book(s), nm = (els) => els.map((e) => chip(e)).join(' + ');
    const rows = b.known.map((k) => '<div class="inst hx-rec"><div class="art">' + Art.portrait(k.sp) + '</div><div class="grow"><b>' + nm(k.els) + '</b><br><span class="muted">' + I('arrow') + ' ' + esc(k.name) + '</span></div>' + (s.owned[k.sp] ? '<span class="chip good">Owned</span>' : '') + '</div>').join('');
    UI.modal(UI.sheet(I('scroll') + ' Recipe book · ' + b.known.length + ' / ' + b.total, (rows || '<p class="muted">No recipes discovered yet. Breed two Aminas to record their pairing.</p>') +
      (b.hidden ? '<div class="inst hx-rec hidden-rec"><div class="art hx-q">?</div><div class="grow"><b>' + b.hidden + ' pairing' + (b.hidden === 1 ? '' : 's') + ' still to discover</b><br><span class="muted">A pairing is recorded the first time you breed it.</span></div></div>' : '') +
      '<p class="muted small-t">The egg is decided by the two parents’ elements. Some pairings stay locked until the Dormant Spire wakes. Resonance Aminas pair with anything.</p>', '<button class="btn gold" data-act="close">Close</button>', 'narrow'));
  });

  /* ---------------- hatching ---------------- */
  // The egg wobbles, cracks in three steps and opens; then the Amina is shown. `d` is the rules' hatched event.
  UI.hatchFx = function (d, done, o) {
    o = o || {}; const s = st(), sp = D.SPECIES[d.sp], inst = R.inst(s, d.uid) || { sp: d.sp, lv: 1, xp: 0 }, parents = (P.hatching && P.hatching.slot === d.slot ? P.hatching.parents : o.parents) || [];
    P.hatching = null;
    const isNew = !!o.isNew, count = s.aminas.filter((a) => a.sp === d.sp).length, owned = R.ownedCount(s), total = Object.keys(D.SPECIES).length, stats = R.statsWithGear(s, inst), line = D.LINES[sp.line];
    const rec = parents.length === 2 && D.SPECIES[parents[0]] && D.SPECIES[parents[1]] ? R.recipeFor(D.SPECIES[parents[0]].el, D.SPECIES[parents[1]].el) : null;
    const info = '<div class="hf-info" hidden>' + (sp.legendary ? '<div class="rar-tag">Legendary</div>' : '') + '<h2>' + esc(sp.name) + '</h2><div class="hf-title muted">' + esc(sp.title || '') + '</div>' +
      '<div class="hf-chips">' + chip(sp.el) + '<span class="chip">' + (ROLE_NAME[line.role] || 'Amina') + '</span><span class="chip">Stage ' + sp.stage + ' of ' + line.ids.length + '</span><span class="chip">Lv ' + inst.lv + '</span></div>' +
      '<div class="pg-evostats hf-stats">' + R.Prog.STATS.map(([k, name]) => '<div class="pg-es"><small>' + name + '</small><b>' + stats[k] + '</b></div>').join('') + '</div>' +
      '<div class="hf-line ' + (isNew ? 'new' : '') + '">' + (isNew ? I('spark') + ' New to your collection: ' + owned + ' of ' + total + ' forms found.' : 'You now have ' + count + ' ' + esc(sp.name) + '.') + (rec ? ' <span class="muted">Recipe: ' + rec.key.split('+').map((e) => D.ELEMENTS[e].name).join(' + ') + '.</span>' : '') + '</div>' +
      '<div class="hf-btns"><button class="btn ghost small" data-act="hfDetail">' + I('info') + 'Details</button><button class="btn gold" data-act="close">Welcome, Kind Soul</button></div></div>';
    const ov = UI.modal('<div class="sheet panel vcard reveal hatchfx' + (sp.legendary ? ' r-legendary' : '') + '"><h1>' + (quiet() ? (isNew ? 'New Amina!' : 'It hatched!') : 'The egg is hatching…') + '</h1><div class="hf-main"><div class="hf-stage"><div class="hf-egg">' + P.egg(parents, { size: 84 }) + '</div><div class="hf-flash"></div><div class="art viewer3d reveal-art hf-art" hidden>' + Art.portrait(d.sp) + '</div></div>' + info + '</div></div>', { onClose: done, dismiss: false });
    ov._hatch = { sp: d.sp, uid: d.uid };
    const box = $('.hatchfx', ov), eggBox = $('.hf-egg', ov), setCrack = (n) => { if (ov.parentNode) eggBox.innerHTML = P.egg(parents, { size: 84, crack: n }); };
    const open = () => {
      if (!ov.parentNode) return; box.classList.add('open'); $('h1', ov).textContent = isNew ? 'New Amina!' : 'It hatched!'; eggBox.hidden = true; $('.hf-art', ov).hidden = false; $('.hf-info', ov).hidden = false;
      Au.play('hatch'); if (isNew) setTimeout(() => ov.parentNode && Au.play('discover'), 380);
      UI.sparkles($('.hf-art', ov), isNew ? 24 : 14, parents.map(elCol).filter(Boolean).concat(['#ffffff', '#ffd86b']).slice(0, 4));
      UI.mountViewer(ov, $('.hf-art', ov), d.sp, { intro: 'victory' });
      if (Au.hasVoice && Au.hasVoice(d.sp) && Au.monster) setTimeout(() => { if (ov.parentNode) Au.monster(d.sp, 'victory'); }, quiet() ? 0 : 500);
    };
    if (quiet()) { open(); return ov; }
    box.classList.add('wob');
    [[650, 1], [1150, 2], [1600, 3]].forEach(([t, n]) => setTimeout(() => { if (!ov.parentNode) return; setCrack(n); Au.play('tap'); box.classList.remove('jolt'); void box.offsetWidth; box.classList.add('jolt'); }, t));
    setTimeout(() => { if (ov.parentNode) box.classList.add('flash'); }, 1950);
    setTimeout(open, 2150);
    return ov;
  };
  UI.act('hfDetail', (el) => { const ov = el.closest('.overlay'), h = ov && ov._hatch; UI.close(ov); if (h) setTimeout(() => { const i = R.inst(st(), h.uid); if (i) UI.detail(i.sp, { uid: i.uid }); }, 120); });

  /* ---------------- the island marker ---------------- */
  // Drawn by island-art.js above the Hatchery; redrawn only when the Hatchery's state changes.
  P.markerSig = (s) => { const x = H.status(s); return x.state + ':' + x.ready + ':' + x.used + ':' + x.slots; };
  let lastSig = null;
  P.tick = function () {
    const s = st(); if (!s || !s.struct.hatchery) return;
    const sig = P.markerSig(s); if (sig === lastSig) return;
    const first = lastSig == null; lastSig = sig;
    if (!first && UI.screen === 'island' && UI.renderObjects && !UI.dragging) { UI.renderObjects(); UI.renderHud && UI.renderHud(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
