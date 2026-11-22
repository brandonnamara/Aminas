/* Aminas — Phase 16B interface polish. Refinements only: no menu, HUD or theme is replaced.
   1. Touch: a hit assist lets a tap that lands just outside a small control (within the margin needed to make it
      44×44 pt) activate the nearest one, with no change to how anything looks; a pressed state on chips and tabs;
      a short shake on a control whose action was refused.
   2. Dialogue: a text-size setting (standard / large / larger, also an Aa button on every dialogue panel) and an
      Instant text speed. Larger text scrolls inside the panel and never covers its buttons.
   3. Panels close with a short fade instead of vanishing (not with Reduce Motion or Battery Saver).
   4. Save files: export to a file, import with validation, confirmation and an undo (A.SaveFile).
   Nothing here changes rules, rewards, progression or the save schema. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, S = A.State, Art = A.Art, Au = A.Audio, UI = A.UI, F = A.SaveFile;
  if (!UI) return;
  const { esc } = UI.h, I = Art.icon, $ = (s, r) => (r || document).querySelector(s);
  const st = () => S.state;
  const calm = () => !!(UI.calm && UI.calm());
  const lite = () => !!(A.Perf && A.Perf.saver && A.Perf.saver());

  /* ================================================================ 1. touch */
  const CTL = 'button, [data-act], a[href], input, select, textarea, [role=button]';
  const MIN = 44;
  // Hit assist: a tap that misses every control but lands within the margin that would make a small control 44×44
  // activates the nearest such control in the same layer. Never for taps on the island or battle canvases, never
  // through a panel's backdrop to something behind it, never for a disabled control.
  UI.hitAssist = { on: true, used: 0 };
  const layerOf = (el) => el.closest('#modal-root > .overlay:last-child, .dlg, .scene, .o16-start, .o16-cine, #battle, #hud, .hud, #toast-root') || null;
  const usable = (e) => { if (e.disabled || e.getAttribute('aria-disabled') === 'true' || e.classList.contains('off')) return false; const s = getComputedStyle(e); if (s.pointerEvents === 'none' || s.visibility === 'hidden' || s.display === 'none' || +s.opacity < 0.1) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  UI.hitTarget = function (x, y, target) {
    if (!target || target.closest(CTL)) return null;
    if (target.closest('canvas, .world, .iso, .c3d-canvas, .hs-zone, .hs-camzone, input, textarea, select')) return null;
    // a tap on a panel's own backdrop closes the panel, as before
    if (target.classList && target.classList.contains('overlay')) return null;
    const layer = layerOf(target); if (!layer) return null;
    let best = null, bd = 1e9;
    layer.querySelectorAll(CTL).forEach((e) => {
      if (e.parentElement && e.parentElement.closest(CTL)) return;
      const b = e.getBoundingClientRect(); if (b.width >= MIN && b.height >= MIN) return;
      const px = Math.max(0, (MIN - b.width) / 2), py = Math.max(0, (MIN - b.height) / 2);
      const dx = Math.max(b.left - x, 0, x - b.right), dy = Math.max(b.top - y, 0, y - b.bottom);
      if (dx > px || dy > py) return;
      if (!usable(e)) return;
      const d = dx + dy; if (d < bd) { bd = d; best = e; }
    });
    return best;
  };
  document.addEventListener('click', (e) => {
    if (!UI.hitAssist.on || !e.isTrusted) return;
    const t = UI.hitTarget(e.clientX, e.clientY, e.target); if (!t) return;
    e.preventDefault(); e.stopPropagation(); UI.hitAssist.used++;
    if (t.focus && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) t.focus(); else t.click();
  }, true);
  // the control most recently pressed, for refusal feedback
  let lastPress = null, lastAt = 0;
  document.addEventListener('pointerdown', (e) => { const c = e.target.closest && e.target.closest(CTL); if (c) { lastPress = c; lastAt = performance.now(); } }, true);
  // a refused action (the game's own "no" sound) gives the pressed control a short shake
  if (Au && Au.play) { const play0 = Au.play; Au.play = function (k) { if (k === 'no' && lastPress && performance.now() - lastAt < 800 && lastPress.isConnected && !calm()) { const c = lastPress; c.classList.remove('nope16'); void c.offsetWidth; c.classList.add('nope16'); setTimeout(() => c.classList.remove('nope16'), 420); } return play0.apply(this, arguments); }; }

  /* ================================================================ 2. dialogue text size and speed */
  const SIZES = ['normal', 'large', 'larger'], SIZE_T = { normal: 'Standard', large: 'Large', larger: 'Larger' };
  UI.applyTextSize = function () { const k = (st() && st().settings.textSize) || 'normal'; document.body.classList.toggle('tsz-l', k === 'large'); document.body.classList.toggle('tsz-xl', k === 'larger'); };
  const cycleSize = () => { const s = st(); if (!s) return 'normal'; const k = SIZES[(SIZES.indexOf(s.settings.textSize) + 1) % SIZES.length]; s.settings.textSize = k; S.save(); UI.applyTextSize(); return k; };
  // an Aa button on every dialogue panel (the original, the refined Phase 16A one, and story scenes)
  const addAa = (box) => {
    if (!box || box.querySelector('.tsz16')) return;
    const row = box.querySelector('.dlg-ctl, .sc-ctl'); if (!row) return;
    const b = document.createElement('button'); b.className = 'btn small ghost tsz16'; b.type = 'button';
    const label = () => { const k = (st() && st().settings.textSize) || 'normal'; b.setAttribute('aria-label', 'Text size: ' + SIZE_T[k] + '. Tap to change.'); b.innerHTML = '<span aria-hidden="true">A<small>a</small></span>'; b.dataset.size = k; };
    label(); b.addEventListener('click', (e) => { e.stopPropagation(); cycleSize(); label(); }); row.insertBefore(b, row.firstChild);
    // the v7 controls sit just above the panel, at a fixed height; a long line (or larger text) made the panel taller
    // than that and it slid under Skip. Now the controls follow the panel's actual top edge.
    const panel = box.querySelector('.dlg-box');
    if (box.classList.contains('v7') && panel && root.ResizeObserver) {
      const fit = () => { if (!box.isConnected) return ro.disconnect(); const top = panel.getBoundingClientRect().top, app = ($('#app') || document.body).getBoundingClientRect(), h = row.getBoundingClientRect().height || 40;
        if (top - h - 8 < app.top + 4) { row.style.top = '6px'; row.style.bottom = 'auto'; } else { row.style.top = 'auto'; row.style.bottom = Math.round(app.bottom - top + 6) + 'px'; } };
      const ro = new ResizeObserver(fit); ro.observe(panel); fit();
    }
  };
  const script0 = UI.script; UI.script = function () { const box = script0.apply(this, arguments); addAa(box); return box; };
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1 && (n.classList.contains('dlg') || n.classList.contains('scene'))) addAa(n); }))).observe($('#app') || document.body, { childList: true });
  if (UI.acts.setSeg) { const ss0 = UI.acts.setSeg; UI.acts.setSeg = function (el) { const r = ss0.apply(this, arguments); if (el && el.dataset.k === 'textSize') UI.applyTextSize(); return r; }; }
  ['showTitle', 'showIsland'].forEach((k) => { if (UI[k]) { const f0 = UI[k]; UI[k] = function () { UI.applyTextSize(); return f0.apply(this, arguments); }; } });

  /* ================================================================ 3. panel close transition */
  // The panel is taken out of the game straight away (exactly as before, so nothing waits on it); a faded copy of its
  // last frame, inert, with every id and action removed, plays a 150 ms fade underneath any panel that opens next.
  const close0 = UI.close;
  UI.close = function (ov) {
    let ghost = null;
    if (ov && ov.parentNode && !calm() && !lite() && !ov.querySelector('canvas, video')) {
      try {
        ghost = ov.cloneNode(true); ghost.className = 'ov-ghost16'; ghost.inert = true; ghost.setAttribute('aria-hidden', 'true'); ghost.removeAttribute('id');
        ghost.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id')); ghost.querySelectorAll('[data-act]').forEach((n) => n.removeAttribute('data-act'));
      } catch (e) { ghost = null; }
    }
    const r = close0.apply(this, arguments);
    // appended after everything (so a search of the page finds a live panel first) but drawn just under the panels
    if (ghost) { ($('#app') || document.body).appendChild(ghost); setTimeout(() => ghost.remove(), 160); }
    return r;
  };

  /* ================================================================ 4. save files */
  const when = (t) => (t ? new Date(t).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'unknown');
  const sumRows = (sm) => !sm ? '<p class="muted">No details.</p>' : '<div class="sf-sum"><span><small>Player</small><b>' + esc(sm.name || '—') + '</b></span><span><small>Rank</small><b>' + sm.rank + '</b></span><span><small>Aminas</small><b>' + sm.aminas + '</b></span>' +
    '<span><small>Strongest</small><b>' + (sm.best ? esc(sm.best.name) + ' Lv ' + sm.best.lv : '—') + '</b></span><span><small>Gold</small><b>' + sm.gold.toLocaleString() + '</b></span><span><small>Dungeons cleared</small><b>' + sm.dungeons + '</b></span><span><small>Saved</small><b>' + when(sm.lastSaved) + '</b></span></div>';
  UI.sfExport = async function (btn) {
    const r = F.exportFile(); if (!r.ok) { UI.toast(r.msg, 'w'); Au.play('no'); return r; }
    const blob = new Blob([r.text], { type: 'application/json' }); let how = 'download';
    try {
      const file = typeof File === 'function' ? new File([blob], r.name, { type: 'application/json' }) : null;
      // on iPhone the share sheet ("Save to Files") is the reliable way to keep a file; elsewhere a normal download
      if (file && navigator.canShare && navigator.share && /iPhone|iPad|iPod/.test(navigator.userAgent) && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Aminas save' }); how = 'share'; }
      else { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = r.name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
    } catch (e) { if (e && e.name === 'AbortError') return { ok: false, reason: 'cancelled' }; how = 'failed'; }
    UI.sfLast = { name: r.name, bytes: r.bytes, how };
    if (how === 'failed') { UI.toast('The file could not be saved here. Use Backup code instead and keep the code somewhere safe.', 'w'); return { ok: false, reason: 'blocked' }; }
    Au.play('ok'); if (btn) UI.gainFloat(btn, 'Exported', '#8cffa0');
    UI.toast('Save exported as ' + r.name + ' (' + Math.ceil(r.bytes / 1024) + ' KB). Keep it somewhere safe.', 'n');
    return { ok: true, name: r.name, how };
  };
  UI.sfPick = function () {
    let inp = $('#sf-file'); if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.id = 'sf-file'; inp.accept = '.json,application/json,text/plain,.txt'; inp.hidden = true; document.body.appendChild(inp); inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; inp.value = ''; if (f) UI.sfReadFile(f); }); }
    inp.click();
  };
  UI.sfReadFile = function (file) {
    if (file.size > F.MAX_BYTES) return UI.sfRejected({ msg: 'That file is far too large to be an Aminas save.' });
    const rd = new FileReader();
    rd.onload = () => UI.sfOffer(F.parse(String(rd.result || '')), file.name);
    rd.onerror = () => UI.sfRejected({ msg: 'That file could not be read.' });
    rd.readAsText(file);
  };
  UI.sfRejected = function (p) {
    Au.play('no');
    return UI.modal(UI.sheet('Save not loaded', '<p style="margin:.2rem 0">' + esc(p.msg || 'That file is not an Aminas save.') + '</p><p class="muted small-t">Nothing was changed. Your current game is exactly as it was.</p>', '<button class="btn gold" data-act="close">OK</button>', 'narrow sf16'));
  };
  // shows what the file contains next to the current game, and asks before replacing anything
  UI.sfOffer = function (p, fname) {
    if (!p.ok) return UI.sfRejected(p);
    const cur = st() && st().starter ? F.summary(st()) : null;
    const body = '<p style="margin:.1rem 0 .4rem">' + (fname ? '<b>' + esc(fname) + '</b> ' : '') + 'is a valid Aminas save' + (p.exportedAt ? ', exported ' + esc(when(Date.parse(p.exportedAt))) : '') + '.</p>' +
      (p.warnings.length ? '<p class="small-t warn16">' + p.warnings.map(esc).join(' ') + '</p>' : '') +
      '<div class="sf-cmp"><div><div class="section-t">In the file</div>' + sumRows(p.summary) + '</div>' + (cur ? '<div><div class="section-t">Your current game</div>' + sumRows(cur) + '</div>' : '') + '</div>' +
      (cur ? '<p class="small-t">Loading it replaces your current game on this device. A copy of your current game is kept, and <b>Undo last import</b> in Settings puts it back.</p>' : '');
    const ov = UI.modal(UI.sheet('Load this save?', body, '<button class="btn ghost" data-act="close">Cancel</button><button class="btn gold" id="sf-yes">' + I('check') + (cur ? 'Replace my game' : 'Load save') + '</button>', 'sf16'));
    $('#sf-yes', ov).onclick = () => {
      if (ov._done) return; ov._done = true;
      const r = F.apply(p); UI.closeAll();
      if (!r.ok) return UI.sfRejected({ msg: r.msg || 'The save could not be loaded.' });
      Au.setPrefs(st().settings); document.body.classList.toggle('calm', !!st().settings.reduceMotion); if (A.Perf && A.Perf.apply) A.Perf.apply();
      Au.play('ok'); UI.showIsland(false); setTimeout(() => UI.toast('Save loaded. Welcome back' + (st().avatar && st().avatar.name ? ', ' + st().avatar.name : '') + '.', 'n'), 300);
    };
    return ov;
  };
  UI.sfUndo = function () {
    const rec = F.recovery(); if (!rec) return UI.sfRejected({ msg: 'There is no earlier save to restore.' });
    const ov = UI.modal(UI.sheet('Undo last import?', '<p style="margin:.2rem 0">This puts back the game you had before your last import (kept ' + esc(when(rec.at)) + ').</p>' + sumRows(rec.summary) + '<p class="small-t">The game you have now is kept the same way, so this can be undone too.</p>',
      '<button class="btn ghost" data-act="close">Cancel</button><button class="btn gold" id="sf-undo-yes">Restore it</button>', 'narrow sf16'));
    $('#sf-undo-yes', ov).onclick = () => { if (ov._done) return; ov._done = true; const r = F.undoImport(); UI.closeAll(); if (!r.ok) return UI.sfRejected({ msg: r.msg }); Au.play('ok'); UI.showIsland(false); setTimeout(() => UI.toast('Your earlier game is back.', 'n'), 300); };
    return ov;
  };
  UI.act('sfExport', (el) => UI.sfExport(el));
  UI.act('sfImport', () => UI.sfPick());
  UI.act('sfUndo', () => UI.sfUndo());
  // the existing backup code restore now goes through the same checks and confirmation (and keeps the undo copy)
  if (UI.acts.backup) { const bk0 = UI.acts.backup; UI.acts.backup = function () { const r = bk0.apply(this, arguments); const ov = $('#modal-root > .overlay:last-child'), go = ov && $('#bk-go', ov);
    if (go) go.onclick = () => { const p = F.parse($('#bk-in', ov).value || ''); if (!p.ok) { $('#bk-msg', ov).textContent = p.msg; Au.play('no'); return; } UI.sfOffer(p, null); }; return r; }; }
  // Settings: three buttons in the existing "Your save" section
  const settings0 = UI.settings;
  UI.settings = function () {
    const ov = settings0.apply(this, arguments); const s = st();
    const sec = ov && [...ov.querySelectorAll('.section-t')].find((x) => /Your save/.test(x.textContent));
    if (sec && !ov.querySelector('.sf-row')) {
      const rec = F.recovery();
      sec.nextElementSibling.insertAdjacentHTML('afterend', '<div class="row-actions sf-row">' + (s && s.starter ? '<button class="btn small gold" data-act="sfExport">' + I('arrow') + 'Export save file</button>' : '') +
        '<button class="btn small" data-act="sfImport">Import save file</button>' + (rec ? '<button class="btn small ghost" data-act="sfUndo">Undo last import</button>' : '') + '</div>');
    }
    return ov;
  };

  UI.applyTextSize();
})(typeof window !== 'undefined' ? window : globalThis);
