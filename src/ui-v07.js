/* Aminas — v0.7 interface: voxel portraits, The Entity as an on-screen character, confirmed evolution, the
   multi-slot hatchery, the bottom-left monster selector, and equipment (Weapon / Armour / Charm). */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Art = A.Art, UI = A.UI, V = A.Voxel, Au = A.Audio, W = A.World;
  const { esc, pct, chip, artBox, silBox } = UI.h, I = Art.icon;
  const $ = (s, r) => (r || document).querySelector(s);
  const st = () => S.state;
  const fmtT = (secs) => (A.IsoArt && A.IsoArt.fmtTime ? A.IsoArt.fmtTime(secs) : secs + 's');

  /* ================================================================ portraits */
  // Baked voxel portraits (tools/voxel-bake.js -> assets/portraits/<id>.webp). If one is missing the same model is
  // drawn live from the voxel engine, so a creature is never blank.
  const live = new Map();
  Art.voxelUrl = function (id, size) {
    const s = D.SPECIES[id]; if (!s || !V || !V.has(s.art.vox)) return '';
    const k = id + '@' + (size || 192); if (live.has(k)) return live.get(k);
    let url = ''; try { url = V.dataUrl(s.art.vox, s.art.st, size || 192); } catch (e) { url = ''; }
    live.set(k, url); return url;
  };
  Art.creature = function (id) {
    const s = D.SPECIES[id]; if (!s) return '';
    return '<img class="portrait vox" src="' + Art.voxelUrl(id) + '" alt="' + esc(s.name) + '" draggable="false">';
  };
  Art.portrait = function (id) {
    const s = D.SPECIES[id]; if (!s) return '';
    return '<img class="portrait vox" src="assets/portraits/' + id + '.webp" alt="' + esc(s.name) + '" draggable="false" decoding="async" onerror="this.onerror=null;this.src=A.Art.voxelUrl(\'' + id + '\')">';
  };

  /* ================================================================ The Entity */
  // One voxel figure (from the reference card) with moods shown by its eye and its body language:
  // n neutral, s surprised, a annoyed, c content, w wry, t tired. Idle float, talk, react, enter and exit are CSS.
  let entUrl = null;
  const entSprite = () => entUrl || (entUrl = (V && V.has('entity') ? (() => { try { return V.dataUrl('entity', 1, 220); } catch (e) { return ''; } })() : ''));
  Art.entity = function (mood) {
    mood = mood || 'n';
    return '<div class="ent-vox m-' + mood + '" role="img" aria-label="The Entity"><div class="ent-halo"></div><img src="' + entSprite() + '" alt="" draggable="false"><i class="ent-eye"></i></div>';
  };

  // Dialogue with The Entity on screen: it steps in, talks while text types, reacts to mood changes, steps out.
  UI.script = function (lines, done, opts) {
    opts = opts || {};
    const box = document.createElement('div'); box.className = 'dlg v7';
    box.innerHTML = '<div class="dlg-ctl"><button class="btn small ghost dlg-auto" aria-pressed="false">Auto</button><button class="btn small ghost dlg-skip">Skip</button></div><div class="dlg-ent"></div><div class="dlg-box panel"><div><div class="dlg-name"></div><div class="dlg-text"></div></div></div><div class="dlg-next">▼</div>';
    $('#app').appendChild(box);
    let i = -1, typing = false, tm = null, full = '', mood = null, auto = false, autoTm = null, finished = false;
    const ent = $('.dlg-ent', box), nm = $('.dlg-name', box), tx = $('.dlg-text', box), nx = $('.dlg-next', box);
    const speed = { fast: 8, normal: 18, slow: 30 }[st().settings.textSpeed] || 18, calm = UI.calm && UI.calm();
    const talk = (on) => { const e = $('.ent-vox', ent); if (e) e.classList.toggle('talk', on); };
    const finish = () => {
      if (finished) return; finished = true; clearTimeout(tm); clearTimeout(autoTm);
      box.classList.add('out'); talk(false);
      setTimeout(() => { box.remove(); if (done) done(); }, calm ? 0 : 320);
    };
    const scheduleAuto = () => { clearTimeout(autoTm); if (auto && !typing) autoTm = setTimeout(next, 900 + full.length * 22); };
    const next = () => {
      if (finished) return;
      i++;
      if (i >= lines.length) return finish();
      const ln = lines[i], narr = ln[0] === '*';
      const m = narr ? (mood || 'n') : ln[0];
      if (m !== mood) {
        ent.innerHTML = Art.entity(m);
        if (mood && !calm) { const e = $('.ent-vox', ent); e.classList.add('react'); setTimeout(() => e.classList.remove('react'), 520); }
        mood = m;
      }
      ent.classList.toggle('dim', narr); tx.classList.toggle('stage', narr);
      nm.textContent = narr ? '' : (opts.name || 'The Entity');
      full = ln[1]; tx.textContent = ''; typing = true; nx.style.visibility = 'hidden'; talk(!narr);
      let c = 0;
      const stop = () => { typing = false; nx.style.visibility = 'visible'; talk(false); scheduleAuto(); };
      const step = () => { c += auto ? 3 : 1; tx.textContent = full.slice(0, c); if (c < full.length) tm = setTimeout(step, speed); else stop(); };
      if (calm) { tx.textContent = full; stop(); } else step();
      if (!narr && /\.\.\.|…|—$/.test(ln[1].trim().slice(-2))) Au.play('hum');
    };
    box.addEventListener('click', (e) => {
      if (e.target.closest('.dlg-skip')) return finish();
      if (e.target.closest('.dlg-auto')) { auto = !auto; const b = e.target.closest('.dlg-auto'); b.classList.toggle('on', auto); b.setAttribute('aria-pressed', String(auto)); if (auto && !typing) scheduleAuto(); return; }
      if (typing) { clearTimeout(tm); typing = false; tx.textContent = full; nx.style.visibility = 'visible'; talk(false); scheduleAuto(); } else next();
    });
    requestAnimationFrame(() => box.classList.add('in'));
    setTimeout(next, calm ? 0 : 260);
    return box;
  };

  /* ================================================================ evolution: notice + confirm */
  const COST = (c) => ['gold', 'food', 'gems'].filter((k) => c && c[k]).map((k) => I(k === 'gems' ? 'gem' : k) + ' ' + c[k]).join(' ');
  const EVO_WHY = { level: (c) => 'Reach level ' + c.lv + ' first (' + c.need + ' to go).', cost: (c) => 'Needs ' + c.cost.gold + ' gold and ' + c.cost.food + ' food.', busy: () => 'Finish or leave the dungeon run first.', final: () => 'This is its final form.', invalid: () => '' };
  UI.evoPrompt = function (uid, done, fromNotice) {
    const s = st(), inst = R.inst(s, uid); if (!inst) { if (done) done(); return null; }
    const c = R.evoCheck(s, uid); if (c.reason === 'final' || !c.to) { if (done) done(); return null; }
    const a = D.SPECIES[inst.sp], b = D.SPECIES[c.to], seen = s.owned[c.to];
    const req = '<ul class="evo-req"><li class="' + (inst.lv >= c.lv ? 'ok' : 'no') + '">' + I(inst.lv >= c.lv ? 'check' : 'lock') + ' Level ' + c.lv + ' <span class="muted">(now ' + inst.lv + ')</span></li><li class="' + (R.canAfford(s, c.cost) ? 'ok' : 'no') + '">' + I(R.canAfford(s, c.cost) ? 'check' : 'lock') + ' ' + COST(c.cost) + '</li><li class="ok">' + I('check') + ' Keeps its level, experience and equipment</li></ul>';
    const body = '<div class="evo-ask"><div class="evo-pair"><div class="art">' + Art.portrait(inst.sp) + '<b>' + esc(a.name) + '</b></div><div class="evo-arrow">' + I('arrow') + '</div><div class="art ' + (seen ? '' : 'sil') + '">' + Art.portrait(c.to) + '<b>' + (seen ? esc(b.name) : '???') + '</b></div></div>' +
      '<p>' + (fromNotice ? '<b>' + esc(a.name) + ' is ready to evolve!</b> ' : '') + 'Evolving is your choice. You can do it now or later from its page in Creatures.</p>' + req + (UI.P13 ? UI.P13.evoChanges(R.Prog.evoPreview(s, inst)) : '') + (c.ok ? '' : '<p class="bad">' + esc(EVO_WHY[c.reason](c)) + '</p>') + '</div>';
    let decided = false;
    const ov = UI.modal(UI.sheet('Evolution', body, '<button class="btn ghost" data-act="evoLater">Later</button><button class="btn gold' + (c.ok ? '' : ' off') + '" data-act="evoGo" data-uid="' + uid + '">' + I('spark') + ' Evolve</button>', 'narrow'), { onClose: () => { if (!decided && done) done(); } });
    ov._evoDone = (how) => { decided = true; if (done) done(how); };
    return ov;
  };
  UI.act('evoLater', (el) => { const ov = el.closest('.overlay'); UI.close(ov); });
  UI.act('evoGo', (el) => {
    const ov = el.closest('.overlay'), uid = +el.dataset.uid, r = R.evolve(st(), uid);
    if (!r.ok) { Au.play('no'); return; }
    const cb = ov._evoDone; ov._evoDone = null;
    S.save();
    // The evolve event plays the ceremony (UI.evolveFx). Phase 13A fix: the prompt used to report "finished" twice
    // when it had been opened by the ready notice (once on closing, once here), which let the next story line start
    // while the ceremony was still on screen. It now reports once: decided first, then closed.
    UI.flush();
    if (cb) cb('evolved');
    UI.close(ov);
    UI.refresh(); UI.renderHud && UI.renderHud();
    const det = [...$('#modal-root').children].find((x) => x._detail); if (det) UI.detail(D.SPECIES[R.inst(st(), uid).sp].id, { uid, ov: det });
  });
  UI.act('evoAsk', (el) => UI.evoPrompt(+el.dataset.uid));
  // Notices: every 'evoReady' event becomes a prompt in the beat queue (one at a time, after other beats).
  const flush0 = UI.flush;
  UI.flush = function () {
    const ready = R.q.filter((e) => e.name === 'evoReady').map((e) => e.data.uid);
    flush0();
    ready.forEach((uid) => { Au.play('level'); UI.queue.push({ type: 'fn', fn: (done) => UI.evoPrompt(uid, done, true) }); });
    if (ready.length) UI.pump();
  };

  /* ================================================================ hatchery: one slot per level */
  const REASONS = { noHatchery: 'Restore the Old Hatchery first.', egg: 'Every slot is incubating. Upgrade the Hatchery for another slot.', slot: 'Upgrade the Hatchery to unlock this slot.', pick: 'Choose two parents.', same: 'Choose two different Aminas.', level: 'Both parents must be level ' + D.BREED_MIN_LEVEL + ' or higher.', incompat: 'These two don’t resonate. Try another pairing.', locked: 'This pairing needs the Dormant Spire to wake first.', cost: 'You need ' + D.BREED_COST.gold + ' gold and ' + D.BREED_COST.food + ' food.' };
  function eggArt(e, ready) {
    const pc = (e.parents || []).map((x) => D.SPECIES[x] && D.ELEMENTS[D.SPECIES[x].el].color).filter(Boolean), c1 = pc[0] || '#ffb8d2', c2 = pc[1] || '#9ad4ff';
    return '<div class="vegg' + (ready ? ' ready' : ' wob') + '" style="--c1:' + c1 + ';--c2:' + c2 + '"><i></i><i></i><i></i></div>';
  }
  function slotHtml(s, i, n) {
    if (i >= n) {
      const nextLv = i + 1, h = s.buildings.hatchery, upg = h && h.state === 'upgrading' && h.toLevel === nextLv;
      return '<div class="hslot locked">' + I('lock') + '<b>Slot ' + (i + 1) + '</b><small>' + (upg ? 'Opens when the upgrade finishes' : 'Hatchery level ' + nextLv) + '</small></div>';
    }
    const e = R.eggStatus(s, null, i);
    if (!e) return '<div class="hslot free' + (UI.hSlot === i ? ' sel' : '') + '" data-act="hSlot" data-i="' + i + '">' + I('plus') + '<b>Slot ' + (i + 1) + '</b><small>Empty: breed here</small></div>';
    const egg = R.eggIn(s, i), secs = Math.ceil(e.left / 1000);
    return '<div class="hslot busy' + (e.ready ? ' ready' : '') + '" data-slot="' + i + '">' + eggArt(egg, e.ready) + '<b>Slot ' + (i + 1) + '</b><div class="bar xp"><i style="width:' + Math.round(e.progress * 100) + '%"></i></div><small>' + (e.ready ? 'Ready!' : (secs >= 60 ? Math.floor(secs / 60) + 'm ' + (secs % 60) + 's' : secs + 's') + ' left') + '</small>' + (e.ready ? '<button class="btn small gold" data-act="hHatch" data-i="' + i + '">Hatch!</button>' : '') + '</div>';
  }
  UI.hatchery = function (ovEx) {
    const s = st();
    if (!s.struct.hatchery) { UI.toast('The Old Hatchery is still in ruins. Restore it first (it unlocks after the Tide Gate).', 't'); return; }
    const n = R.eggSlots(s), hf = W.eggTimeFactor(s);
    if (UI.hSlot == null || UI.hSlot >= n || R.eggIn(s, UI.hSlot)) UI.hSlot = R.freeSlot(s);
    const parent = (i) => { const a = R.inst(s, UI.hSel[i]); return '<button class="slot" style="width:100%;background:rgba(0,0,0,.2)" data-act="hPick" data-i="' + i + '">' + (a ? artBox(a.sp) + '<b>' + esc(D.SPECIES[a.sp].name) + '</b>Lv ' + a.lv : I('plus') + '<span class="muted">Choose parent ' + (i + 1) + '</span>') + '</button>'; };
    const a = UI.hSel[0], b = UI.hSel[1], chk = UI.hSlot >= 0 ? R.breedCheck(s, a, b, UI.hSlot) : { ok: false, reason: 'egg' };
    const pa = R.inst(s, a), pb = R.inst(s, b), rec = pa && pb && pa.uid !== pb.uid ? R.recipeFor(D.SPECIES[pa.sp].el, D.SPECIES[pb.sp].el) : null;
    const known = rec && ((s.recipes && s.recipes[rec.key]) || s.owned[rec.sp]);
    const preview = pa && pb && pa.uid !== pb.uid ? '<div class="hpreview ' + (rec ? (rec.locked && !s.flags.r2 ? 'locked' : 'ok') : 'none') + '"><div class="hp-p">' + artBox(pa.sp) + '</div><span class="hp-op">+</span><div class="hp-p">' + artBox(pb.sp) + '</div><span class="hp-op">' + I('arrow') + '</span><div class="hp-out">' +
      (rec ? (known ? artBox(rec.sp) : silBox(rec.sp)) + '<small>' + (known ? esc(D.SPECIES[rec.sp].name) : 'Mystery egg') + '</small>' : '<div class="art hp-none">?</div><small>No match</small>') + '</div></div>' : '';
    const msg = chk.ok ? '<span class="good"><b>Compatible!</b></span> Slot ' + (chk.slot + 1) + '. Cost: ' + I('gold') + ' ' + D.BREED_COST.gold + ' ' + I('food') + ' ' + D.BREED_COST.food + '. Incubation: ' + fmtT(Math.max(5, Math.round(D.EGG_SECONDS[s.settings.eggSpeed] * hf))) + '.'
      : '<span class="' + (chk.reason === 'pick' ? 'muted' : 'bad') + '">' + (REASONS[chk.reason] || '') + '</span>';
    const slots = '<div class="hslots" id="hslots">' + Array.from({ length: D.MAX_EGG_SLOTS }, (_, i) => slotHtml(s, i, n)).join('') + '</div>';
    const html = UI.sheet('Old Hatchery · ' + n + ' slot' + (n > 1 ? 's' : ''), slots + '<div class="hatch v7"><div><div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">' + parent(0) + parent(1) + '</div>' + preview + '<div class="hint-line" style="margin:.5rem 0">' + msg + '</div><div class="row-actions"><button class="btn gold ' + (chk.ok ? '' : 'off') + '" data-act="hStart" data-hl="hStart">' + I('egg') + ' Start incubation</button><button class="btn small ghost" data-act="hBook">Recipe book</button></div></div></div>',
      '<span class="muted" style="margin-right:auto;font-size:.78rem">Each Hatchery level adds one slot; slots run on their own. Parents must be level ' + D.BREED_MIN_LEVEL + '+ and are not consumed.</span><button class="btn gold" data-act="close">Close</button>', 'wide');
    let ov = ovEx;
    if (ov && ov.parentNode) ov.innerHTML = html; else ov = UI.modal(html, { onClose: () => { UI.hatchTick = null; UI.refresh(); } });
    UI.hatchTick = () => { const box = $('#hslots', ov); if (!box || !ov.parentNode) { UI.hatchTick = null; return; } const s2 = st(), n2 = R.eggSlots(s2); if (!R.eggs(s2).length && n2 === n) return; if (n2 !== n) return UI.hatchery(ov); const t = document.createElement('div'); t.innerHTML = Array.from({ length: D.MAX_EGG_SLOTS }, (_, i) => slotHtml(s2, i, n2)).join(''); box.innerHTML = t.innerHTML; };
    return ov;
  };
  UI.act('hSlot', (el) => { UI.hSlot = +el.dataset.i; UI.hatchery(el.closest('.overlay')); });
  UI.act('hStart', (el) => {
    const s = st(), ov = el.closest('.overlay'), r = R.startBreed(s, UI.hSel[0], UI.hSel[1], UI.hSlot);
    if (!r.ok) { Au.play('no'); return; }
    UI.hSel = [null, null]; UI.hSlot = null; S.save(); UI.flush(); UI.renderHud(); UI.hatchery(ov);
  });
  UI.act('hHatch', (el) => {
    const ov = el.closest('.overlay'), r = R.hatch(st(), null, +el.dataset.i);
    if (!r.ok) { if (r.reason === 'full') UI.toast('There is no room for another Amina right now (' + D.MAX_INSTANCES + ' at most). The egg will wait.', 't'); return; }
    UI.afterAction(); UI.hatchery(ov);
  });

  /* ================================================================ bottom-left selector */
  // Shows one Amina at a time and moves to the next one every 3 s. Any interaction (pointer over/on the card,
  // focus, a button, an open panel) pauses it. Feeding and details always act on the uid the card was showing
  // when it was pressed, so an auto-cycle can never redirect a feed to a different Amina.
  UI.SEL_MS = 3000; UI.SEL_PAUSE_MS = 8000;
  UI.selOrder = function (s) {
    const act = R.active(s), rest = s.aminas.filter((a) => !act || a.uid !== act.uid).sort((x, y) => y.lv - x.lv || x.uid - y.uid);
    return (act ? [act] : []).concat(rest).slice(0, 12);
  };
  UI.selCurrent = function (s) {
    const list = UI.selOrder(s); if (!list.length) return null;
    let a = list.find((x) => x.uid === UI.selUid); if (!a) { a = list[0]; UI.selUid = a.uid; }
    return a;
  };
  UI.selPause = (ms) => { UI.selPausedUntil = Date.now() + (ms || UI.SEL_PAUSE_MS); };
  UI.selPaused = () => (A.Perf && (A.Perf.hidden() || A.Perf.resting())) || UI.selHover || Date.now() < (UI.selPausedUntil || 0) || UI.modalOpen() || UI.busy || !!UI.bm || (UI.calm && UI.calm());
  UI.selStep = function (d) {
    const s = st(), list = UI.selOrder(s); if (list.length < 2) return;
    const i = Math.max(0, list.findIndex((x) => x.uid === UI.selUid));
    UI.selUid = list[(i + d + list.length) % list.length].uid; UI.selRender();
  };
  UI.selectorHtml = function (s) {
    const a = UI.selCurrent(s); if (!a) return '';
    const sp = D.SPECIES[a.sp], need = R.xpNeed(a.lv), list = UI.selOrder(s), i = list.findIndex((x) => x.uid === a.uid), evo = sp.evo && a.lv >= sp.evo.lv;
    return '<div class="comp panel sel7" id="comp" data-uid="' + a.uid + '">' +
      '<div class="art" data-act="selDetail" data-uid="' + a.uid + '" role="button" aria-label="Details for ' + esc(sp.name) + '">' + Art.portrait(a.sp) + (evo ? '<span class="evo-badge" title="Ready to evolve">' + I('spark') + '</span>' : '') + '</div>' +
      '<div class="nm"><span class="nmt">' + esc(sp.name) + '</span> ' + chip(sp.el) + (a.uid === s.active ? '<span class="chip light comp-tag">Companion</span>' : '') + '</div>' +
      '<div><div class="bar xp"><i style="width:' + (a.lv >= D.MAX_LEVEL ? 100 : pct(a.xp, need)) + '%"></i></div><div class="xpl"><span>Lv ' + a.lv + '</span><span>' + (a.lv >= D.MAX_LEVEL ? 'MAX' : a.xp + ' / ' + need + ' xp') + '</span></div></div>' +
      '<div class="row"><button class="btn small gold" data-act="feedSel" data-uid="' + a.uid + '" data-kind="snack" data-hl="feed">' + I('food') + 'Snack ' + D.SNACKS.snack.food + '</button><button class="btn small" data-act="feedSel" data-uid="' + a.uid + '" data-kind="feast" data-hl="feed">Feast ' + D.SNACKS.feast.food + '</button></div>' +
      (list.length > 1 ? '<div class="selnav"><button class="round xs" data-act="selPrev" aria-label="Previous Amina">' + I('back') + '</button><span class="seldots">' + (i + 1) + ' / ' + list.length + '</span><button class="round xs" data-act="selNext" aria-label="Next Amina">' + I('arrow') + '</button></div>' : '') +
      '</div>';
  };
  UI.selRender = function () {
    const old = $('#comp'); if (!old) return;
    const t = document.createElement('div'); t.innerHTML = UI.selectorHtml(st()); const n = t.firstChild; if (!n) return;
    if (old.dataset.uid !== n.dataset.uid && !(UI.calm && UI.calm())) n.classList.add('swap');
    // Phase 8: the same Amina (after feeding): update the card in place instead of replacing it
    if (old.dataset.uid === n.dataset.uid && UI.morph) { UI.morph(old, n); if (UI.applyHl) UI.applyHl(); return; }
    old.replaceWith(n); bindSel(n); if (UI.applyHl) UI.applyHl();
  };
  function bindSel(el) {
    if (!el || el._bound) return; el._bound = true;
    el.addEventListener('pointerenter', () => { UI.selHover = true; });
    el.addEventListener('pointerleave', () => { UI.selHover = false; UI.selPause(2500); });
    el.addEventListener('pointerdown', () => UI.selPause());
    el.addEventListener('focusin', () => UI.selPause());
  }
  UI.selBind = () => { bindSel($('#comp')); if (!UI.timers.sel) { UI.selLast = Date.now(); UI.timers.sel = setInterval(UI.selTick, 500); } };
  UI.selTick = function () {
    if (UI.screen !== 'island' || !$('#comp')) return;
    const now = Date.now();
    if (!UI.selLast || UI.selPaused()) { UI.selLast = now; return; }
    if (now - (UI.selLast || 0) >= UI.SEL_MS) { UI.selLast = now; UI.selStep(1); }
  };
  UI.act('selPrev', () => { UI.selPause(); UI.selStep(-1); });
  UI.act('selNext', () => { UI.selPause(); UI.selStep(1); });
  UI.act('selDetail', (el) => { UI.selPause(); const a = R.inst(st(), +el.dataset.uid); if (a) UI.detail(a.sp, { uid: a.uid }); });
  UI.act('feedSel', (el) => { UI.selPause(); const uid = +el.dataset.uid; if (R.inst(st(), uid)) UI.doFeed(uid, el.dataset.kind, el); });
  // the old companion feed button (tutorial highlights) still feeds whatever the card shows
  UI.act('feed', (el) => { UI.selPause(); const c = $('#comp'), uid = c ? +c.dataset.uid : (R.active(st()) || {}).uid; if (uid) UI.doFeed(uid, el.dataset.kind, el); });

  /* ================================================================ equipment */
  const statLine = (b) => Object.keys(b).map((k) => '+' + Math.round(b[k] * 100) + '% ' + { hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD' }[k]).join(', ');
  const RAR = { common: 'Common', rare: 'Rare', epic: 'Epic' };
  UI.itemCard = (it, extra) => { const d = D.ITEMS[it.id]; return '<div class="gitem r-' + d.rarity + '">' + (UI.itemIcon ? UI.itemIcon(it.id, 30) : '') + '<div class="grow"><b>' + esc(d.name) + '</b>' + (d.unique ? ' <span class="chip uniq">Unique</span>' : '') + '<br><small>' + statLine(d.bonus) + ' · ' + (d.unique ? 'Unique' : 'Tier ' + D.GEAR_TIERS[d.tier].name + ' ' + D.RARITY_LABEL[d.rarity]) + '</small></div>' + (extra || '') + '</div>'; };
  UI.gearHtml = function (s, inst) {
    const g = R.gearOf(inst), busy = s.run && (s.run.uids || []).indexOf(inst.uid) >= 0, tot = R.gearBonus(s, inst);
    return '<div class="gear">' + D.GEAR_SLOTS.map((k) => {
      const it = g[k] != null ? R.item(s, g[k]) : null;
      return '<div class="gslot"><small>' + D.GEAR_SLOT_NAMES[k] + '</small>' + (it ? UI.itemCard(it, busy ? '' : '<button class="btn small ghost" data-act="unequip" data-uid="' + inst.uid + '" data-slot="' + k + '">Remove</button>') : '<div class="gitem empty">Empty</div>') +
        (busy ? '' : '<button class="btn small" data-act="gearPick" data-uid="' + inst.uid + '" data-slot="' + k + '">' + (it ? 'Change' : 'Equip') + '</button>') + '</div>';
    }).join('') + '</div><div class="kv muted small-t">' + (busy ? 'Equipment is locked during a dungeon run. ' : '') + 'Total: ' + (Object.values(tot).some((x) => x) ? statLine(Object.fromEntries(Object.entries(tot).filter(([, v]) => v))) : 'no bonuses yet') + '. Items come from dungeon clears, ruin searches and survival milestones.</div>';
  };
  UI.act('gearPick', (el) => {
    const s = st(), uid = +el.dataset.uid, slot = el.dataset.slot, parent = el.closest('.overlay');
    const list = R.items(s).filter((it) => D.ITEMS[it.id].slot === slot);
    const body = list.length ? list.map((it) => { const w = R.wearer(s, it.iid); const on = w && w.uid === uid; return UI.itemCard(it, '<span class="muted small-t">' + (w ? (on ? 'Worn' : 'On ' + esc(D.SPECIES[w.sp].name)) : 'In the bag') + '</span>' + (on ? '' : '<button class="btn small gold" data-act="equipIt" data-uid="' + uid + '" data-iid="' + it.iid + '">Equip</button>')); }).join('') : '<p class="muted">No ' + D.GEAR_SLOT_NAMES[slot].toLowerCase() + ' yet. Clear dungeons, search ruins and reach survival milestones to find equipment.</p>';
    const ov = UI.modal(UI.sheet('Choose a ' + D.GEAR_SLOT_NAMES[slot], body, '<button class="btn ghost" data-act="close">Cancel</button>', 'narrow')); ov._parent = parent;
  });
  const reopen = (ov, uid) => { const p = ov && ov._parent; if (ov) UI.close(ov); const inst = R.inst(st(), uid); if (p && p.parentNode && inst) UI.detail(inst.sp, { uid, ov: p, tab: 'gear' }); };
  UI.act('equipIt', (el) => { const ov = el.closest('.overlay'), uid = +el.dataset.uid, r = R.equip(st(), uid, +el.dataset.iid); if (!r.ok) { Au.play('no'); return; } Au.play('ok'); S.save(); R.drain(); reopen(ov, uid); });
  UI.act('unequip', (el) => { const ov = el.closest('.overlay'), uid = +el.dataset.uid; if (R.unequip(st(), uid, el.dataset.slot).ok) { S.save(); R.drain(); const inst = R.inst(st(), uid); UI.detail(inst.sp, { uid, ov, tab: 'gear' }); } });
  UI.bag = function () {
    const s = st(), items = R.items(s);
    const body = items.length ? D.GEAR_SLOTS.map((k) => { const l = items.filter((it) => D.ITEMS[it.id].slot === k); return '<div class="section-t">' + D.GEAR_SLOT_NAMES[k] + 's</div>' + (l.length ? l.map((it) => { const w = R.wearer(s, it.iid); return UI.itemCard(it, '<span class="muted small-t">' + (w ? 'On ' + esc(D.SPECIES[w.sp].name) + ' (Lv ' + w.lv + ')' : 'In the bag') + '</span>'); }).join('') : '<p class="muted small-t">None yet.</p>'); }).join('') : '<p class="muted">Your bag is empty. Dungeon clears, ruin searches and survival milestones give equipment.</p>';
    return UI.modal(UI.sheet(I('book') + ' Bag · ' + items.length + ' item' + (items.length === 1 ? '' : 's'), body + '<p class="muted small-t">To equip something, open an Amina in Creatures and use its Gear tab.</p>', '<button class="btn gold" data-act="close">Close</button>', 'narrow'));
  };
  UI.act('bag', () => UI.bag());
  // item notices
  R.on((ev) => { if (ev.name === 'item' && UI.rewardSink && !/^forge/.test(ev.data.source || '')) { UI.rewardSink.push(ev.data.id); return; } // Phase 6: shown on the result screen
    if (ev.name === 'item' && !/^forge/.test(ev.data.source || '') && UI.toast && S.state && S.state.phase === 'play') setTimeout(() => { if (UI.itemFound) UI.itemFound(ev.data.id, { from: ev.data.source }); else UI.toast('New equipment: ' + D.ITEMS[ev.data.id].name + '. Equip it from the Forge or a creature’s Gear tab.', 'c'); }, 400); }); // Phase 5: rarity reward card
})(typeof window !== 'undefined' ? window : globalThis);
/* Dev 7: keep the performance body classes in step with panels opening and closing (pauses the island under them) */
(function (root) {
  'use strict';
  const A = root.A, UI = A.UI; if (!A.Perf) return;
  const m0 = UI.modal, c0 = UI.close, ca0 = UI.closeAll;
  UI.modal = function () { const r = m0.apply(this, arguments); A.Perf.apply(); return r; };
  UI.close = function () { const r = c0.apply(this, arguments); setTimeout(A.Perf.apply, 0); return r; };
  if (ca0) UI.closeAll = function () { const r = ca0.apply(this, arguments); setTimeout(A.Perf.apply, 0); return r; };
})(typeof window !== 'undefined' ? window : globalThis);
