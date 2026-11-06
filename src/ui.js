/* Aminas — UI core. DOM rendering and input; all rules live in rules.js. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Art = A.Art, T = A.Story, Au = A.Audio;
  const UI = (A.UI = { queue: [], busy: false, screen: 'title', acts: {}, timers: {}, lastIdle: 0 });
  const $ = (s, r) => (r || document).querySelector(s);
  const st = () => S.state;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (a, b) => Math.max(0, Math.min(100, b ? (a / b) * 100 : 0));
  const I = Art.icon;
  const chip = (el) => '<span class="chip ' + el + '">' + D.ELEMENTS[el].name + '</span>';
  const artBox = (sp, cls) => '<div class="art ' + (cls || '') + '">' + Art.portrait(sp) + '</div>';
  const silBox = (sp, cls) => '<div class="art sil ' + (cls || '') + '">' + Art.portrait(sp) + '</div>';
  UI.h = { esc, pct, chip, artBox, silBox };

  /* ---------- modal system ---------- */
  UI.modal = function (html, o) {
    o = o || {};
    // a story remark already on screen gets out of the way of a panel that opens after it
    const st0 = $('#toast-root .toast.story'); if (st0) st0.remove();
    const ov = document.createElement('div'); ov.className = 'overlay'; ov.innerHTML = html;
    if (o.dismiss !== false) ov.addEventListener('click', (e) => { if (e.target === ov) UI.close(ov); });
    ov._onClose = o.onClose; $('#modal-root').appendChild(ov); return ov;
  };
  UI.close = function (ov) {
    if (!ov || !ov.parentNode) return; UI.disposeViews(ov); ov.remove(); if (ov._onClose) ov._onClose();
    // the Entity's remarks wait politely until panels are closed
    if (!UI.modalOpen() && UI.heldToasts.length) { const t = UI.heldToasts.pop(); UI.heldToasts.length = 0; setTimeout(() => UI.toast(t.text, t.mood), 250); }
  };
  UI.heldToasts = [];
  // Live 3D creature viewer inside a panel (details, hatch reveal, evolution). The baked portrait stays underneath,
  // so nothing is lost if 3D is off, still loading or fails. Only one live viewer exists at a time; it is disposed
  // with its panel.
  let liveView = null;
  UI.mountViewer = function (ov, host, spId, o) {
    if (!host || !A.C3D || !A.C3D.enabled()) return null;
    if (liveView) UI.disposeView(liveView);
    const rec = (liveView = { dead: false, v: null, host });
    (ov._views || (ov._views = [])).push(rec);
    A.C3D.load().then((mod) => (mod && !rec.dead && host.isConnected ? mod.createViewer(host, spId, o) : null)).then((v) => {
      if (!v) return; if (rec.dead || !host.isConnected) { v.dispose(); return; }
      rec.v = v; host.classList.add('live');
    }).catch((e) => { if (root.console) console.warn('3D viewer unavailable:', e && e.message); });
    return rec;
  };
  UI.disposeView = function (rec) { if (!rec || rec.dead) return; rec.dead = true; if (rec.v) { try { rec.v.dispose(); } catch (e) { /* gone */ } rec.v = null; } if (rec.host) rec.host.classList.remove('live'); if (liveView === rec) liveView = null; };
  UI.disposeViews = (ov) => { if (ov && ov._views) ov._views.splice(0).forEach(UI.disposeView); };
  UI.viewOf = (ov) => (ov && ov._views ? ov._views.find((r) => !r.dead && r.v) : null);
  UI.closeAll = () => { const r = $('#modal-root'); while (r.firstChild) UI.close(r.firstChild); };
  UI.modalOpen = () => !!$('#modal-root').firstChild;
  UI.sheet = (title, body, foot, cls) => '<div class="sheet panel ' + (cls || '') + '"><div class="sh-head"><h2>' + title + '</h2><button class="x" data-act="close" aria-label="Close">' + I('close') + '</button></div><div class="sh-body">' + body + '</div>' + (foot ? '<div class="sh-foot">' + foot + '</div>' : '') + '</div>';
  UI.confirm = function (title, text, yesLabel, onYes, danger) {
    const ov = UI.modal(UI.sheet(title, '<p style="margin:.2rem 0">' + text + '</p>', '<button class="btn ghost" data-act="close">Cancel</button><button class="btn ' + (danger ? '' : 'gold') + '" id="cf-yes">' + yesLabel + '</button>', 'narrow'));
    $('#cf-yes', ov).onclick = () => { UI.close(ov); onYes(); };
  };

  /* ---------- toasts / fx ---------- */
  UI.toast = function (text, mood) {
    const r = $('#toast-root'); r.innerHTML = '';
    const d = document.createElement('div'); d.className = 'toast panel';
    d.innerHTML = '<div class="ep">' + Art.entity(mood || 'n') + '</div><div>' + esc(text) + '</div>';
    r.appendChild(d);
    const kill = () => { if (!d.parentNode) return; d.classList.add('out'); setTimeout(() => d.remove(), 300); };
    d.onclick = kill; setTimeout(kill, 3800 + text.length * 45);
  };
  UI.sparkles = function (el, n, colors) {
    const rc = (el || $('#app')).getBoundingClientRect(), app = $('#app').getBoundingClientRect();
    for (let i = 0; i < (n || 12); i++) {
      const s = document.createElement('div'); s.className = 'spark';
      const ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 70;
      s.style.cssText = 'left:' + (rc.left - app.left + rc.width / 2) + 'px;top:' + (rc.top - app.top + rc.height / 2) + 'px;background:' + (colors || ['#ffd86b', '#fff', '#ff9ee0', '#8fe6d6'])[i % 4] + ';--dx:' + Math.cos(ang) * dist + 'px;--dy:' + Math.sin(ang) * dist + 'px';
      $('#app').appendChild(s); setTimeout(() => s.remove(), 1000);
    }
  };
  UI.gainFloat = function (el, text, color) {
    const rc = (el || $('#app')).getBoundingClientRect(), app = $('#app').getBoundingClientRect();
    const f = document.createElement('div'); f.className = 'gainf'; f.textContent = text;
    f.style.cssText = 'left:' + (rc.left - app.left + rc.width / 2 - 20) + 'px;top:' + (rc.top - app.top) + 'px;color:' + (color || '#ffd86b');
    $('#app').appendChild(f); setTimeout(() => f.remove(), 1200);
  };
  UI.banner = function (title, sub) {
    const d = document.createElement('div'); d.className = 'banner-fx'; d.innerHTML = '<h1>' + esc(title) + '</h1><p>' + (sub || '') + '</p>';
    $('#app').appendChild(d); setTimeout(() => d.remove(), 2000);
  };
  UI.levelFx = function (inst, from, to, anchor) {
    const sp = D.SPECIES[inst.sp], a = R.statsAt(inst.sp, from), b = R.statsAt(inst.sp, to);
    Au.play('level'); UI.sparkles(anchor, 22);
    UI.banner('LEVEL UP!', esc(sp.name) + ' Lv ' + from + ' → ' + to + ' &nbsp; HP +' + (b.hp - a.hp) + ' · ATK +' + (b.atk - a.atk) + ' · DEF +' + (b.def - a.def));
  };

  /* ---------- dialogue ---------- */
  UI.script = function (lines, done, opts) {
    opts = opts || {};
    const box = document.createElement('div'); box.className = 'dlg';
    box.innerHTML = '<button class="btn small ghost dlg-skip">Skip</button><div class="dlg-box panel"><div class="dlg-por"></div><div><div class="dlg-name"></div><div class="dlg-text"></div></div></div><div class="dlg-next">▼</div>';
    $('#app').appendChild(box);
    let i = -1, typing = false, tm = null, full = '', mood = null;
    const por = $('.dlg-por', box), nm = $('.dlg-name', box), tx = $('.dlg-text', box), nx = $('.dlg-next', box);
    const speed = { fast: 8, normal: 18, slow: 30 }[st().settings.textSpeed] || 18;
    const finish = () => { clearTimeout(tm); box.remove(); if (done) done(); };
    const next = () => {
      i++;
      if (i >= lines.length) return finish();
      const ln = lines[i], narr = ln[0] === '*';
      const m = narr ? (mood || 'n') : ln[0];
      if (m !== mood) { por.innerHTML = Art.entity(m); mood = m; }
      por.classList.toggle('dim', narr); tx.classList.toggle('stage', narr);
      nm.textContent = narr ? '' : (opts.name || 'The Entity');
      full = ln[1]; tx.textContent = ''; typing = true; nx.style.visibility = 'hidden';
      let c = 0;
      const step = () => { c++; tx.textContent = full.slice(0, c); if (c < full.length) tm = setTimeout(step, speed); else { typing = false; nx.style.visibility = 'visible'; } };
      step();
      if (!narr && /\.\.\.|…|—$/.test(ln[1].trim().slice(-2))) Au.play('hum');
    };
    box.addEventListener('click', (e) => {
      if (e.target.closest('.dlg-skip')) return finish();
      if (typing) { clearTimeout(tm); typing = false; tx.textContent = full; nx.style.visibility = 'visible'; } else next();
    });
    next();
  };
  UI.queueBeats = (beats) => { beats.forEach((b) => UI.queue.push(b)); UI.pump(); };
  UI.pump = function () {
    if (UI.busy || UI.screen === 'battle' || UI.screen === 'title') return;
    const b = UI.queue.shift(); if (!b) return;
    if (b.type === 'toast') { if (UI.modalOpen()) UI.heldToasts.push(b); else { UI.toast(b.text, b.mood); const t = $('#toast-root .toast'); if (t) t.classList.add('story'); } return UI.pump(); }
    UI.busy = true;
    const done = () => { UI.busy = false; UI.refresh(); setTimeout(UI.pump, 80); };
    if (b.type === 'script') UI.script(b.lines, done);
    else if (b.type === 'reveal') UI.reveal(b.sp, done);
    else if (b.type === 'fn') b.fn(done);
    else done();
  };
  // Convert the rules' event queue into UI beats + sounds.
  UI.flush = function () {
    const evs = R.drain(), s = st(), batchDisc = {};
    evs.forEach((e) => { if (e.name === 'discover') batchDisc[e.data.sp] = true; });
    let lastToast = null;
    evs.forEach((ev) => {
      const d = ev.data;
      switch (ev.name) {
        case 'restored': Au.play('restore'); break;
        case 'missionReady': Au.play('ok'); break;
        case 'resonance': Au.play('hum'); break;
        case 'dungeonWin': Au.play('win'); break;
        case 'rankUp': UI.banner('RANK ' + d.rank, 'Player Rank increased'); Au.play('level'); break;
        case 'achievement': if (UI.achToast) UI.achToast(d.id); break;
        case 'moveUp': break;
        case 'discover': if (s.starter && d.sp !== s.starter) { Au.play('discover'); UI.queue.push({ type: 'reveal', sp: d.sp }); } break;
        case 'hatched': Au.play('hatch'); if (!batchDisc[d.sp]) UI.queue.push({ type: 'reveal', sp: d.sp }); break;
        case 'evolve': UI.queue.push({ type: 'fn', fn: (done) => UI.evolveFx(d.from, d.to, done) }); break;
        case 'eggStart': Au.play('ok'); break;
      }
      T.beats(s, ev).forEach((b) => { if (b.type === 'toast') lastToast = b; else UI.queue.push(b); });
    });
    if (lastToast) UI.queue.push(lastToast);
    UI.pump();
  };
  UI.afterAction = function () {
    R.after(st());
    if (!S.save() && Date.now() - (UI.saveWarned || 0) > 60000) { UI.saveWarned = Date.now(); UI.toast('I couldn’t save just now (' + (S.status.lastError || 'storage unavailable') + '). Progress is kept while the game stays open. Private Browsing or full storage can cause this.', 't'); }
    UI.flush(); UI.refresh();
  };

  UI.reveal = function (spId, done, o) {
    const sp = D.SPECIES[spId]; o = o || {};
    const ov = UI.modal('<div class="sheet panel narrow vcard reveal" style="padding:1rem"><h1>' + (o.title || 'New Amina!') + '</h1><div class="art viewer3d reveal-art" style="width:11rem;height:11rem;margin:.2rem auto">' + Art.portrait(spId) + '</div><h2 style="margin:.2rem 0">' + esc(sp.name) + '</h2><div>' + chip(sp.el) + '</div><p class="muted" style="margin:.5rem 0 .8rem">' + esc(o.text || sp.pers) + '</p><button class="btn gold" data-act="close">' + (o.button || 'Welcome, Kind Soul') + '</button></div>', { onClose: done });
    UI.sparkles($('.art', ov), 26); Au.play('discover');
    UI.mountViewer(ov, $('.viewer3d', ov), spId, { intro: 'victory' });
  };
  // Evolution ceremony: the old form glows white, flashes, and the new form appears (live 3D when available).
  UI.evolveFx = function (fromSp, toSp, done) {
    const a = D.SPECIES[fromSp], b = D.SPECIES[toSp];
    const ov = UI.modal('<div class="sheet panel narrow vcard evolve" style="padding:1rem"><h1>What’s happening?</h1><div class="evo-stage"><div class="art evo-from">' + Art.portrait(fromSp) + '</div><div class="art viewer3d evo-to">' + Art.portrait(toSp) + '</div><div class="evo-flash"></div></div><h2 class="evo-name" style="margin:.2rem 0">' + esc(a.name) + '…</h2><p class="muted evo-text" style="margin:.4rem 0 .8rem">' + esc(a.name) + ' is glowing!</p><button class="btn gold" data-act="close" disabled>…</button></div>', { onClose: done, dismiss: false });
    const box = $('.evolve', ov), btn = $('[data-act=close]', ov), calm = UI.calm && UI.calm();
    const finish = () => {
      if (!ov.parentNode) return; box.classList.add('done'); $('.evo-name', ov).textContent = b.name + '!'; $('.evo-text', ov).textContent = a.name + ' evolved into ' + b.name + '!';
      $('h1', ov).textContent = 'Evolution!'; btn.disabled = false; btn.textContent = 'Wonderful'; Au.play('level'); UI.sparkles($('.evo-to', ov), 30);
      UI.mountViewer(ov, $('.evo-to', ov), toSp, { intro: 'victory' });
    };
    Au.play('hum'); box.classList.add('glow');
    if (calm) finish(); else setTimeout(() => { box.classList.add('flash'); setTimeout(finish, 450); }, 1700);
  };

  /* ---------- dispatcher ---------- */
  UI.act = (name, fn) => { UI.acts[name] = fn; };
  UI.act('close', (el) => UI.close(el.closest('.overlay')));
  UI.act('noop', () => {});
  // Ignores a second activation of the same control within 350 ms, so a double-tap can never buy/claim twice.
  let lastAct = { el: null, t: 0 };
  function dispatch(e) {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = UI.acts[el.dataset.act]; if (!fn) return;
    const now = Date.now(); if (lastAct.el === el && now - lastAct.t < 350) return; lastAct = { el, t: now };
    if (el.classList.contains('off') || el.disabled) { Au.play('no'); return; }
    Au.unlock(); Au.play('tap'); fn(el, e);
  }

  /* ---------- screens ---------- */
  function stage() { return $('#stage'); }
  // Cleanups registered by a screen (live 3D views, listeners) run when the next screen opens.
  UI.cleanups = [];
  function setScreen(name) { UI.cleanups.splice(0).forEach((f) => { try { f(); } catch (e) { if (root.console) console.warn('cleanup failed', e); } }); UI.screen = name; Object.values(UI.timers).forEach(clearInterval); UI.timers = {}; UI.bm = null; UI.guide = null; document.body.classList.toggle('calm', !!(S.state && S.state.settings.reduceMotion)); }
  UI.setScreen = setScreen;
  function installBanner() {
    const standalone = root.navigator.standalone || (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches);
    if (standalone) return '';
    const ios = /iphone|ipad|ipod/i.test(root.navigator.userAgent);
    if (UI.deferredPrompt) return '<div class="banner">Install Aminas on your device <button class="btn small gold" data-act="installNow">Install</button></div>';
    if (ios) return '<div class="banner">Play full screen: Share <b>⎙</b> → Add to Home Screen <button class="btn small ghost" data-act="installHelp">How</button></div>';
    return '';
  }
  UI.showTitle = function () {
    setScreen('title'); UI.queue.length = 0; UI.busy = false; UI.closeAll();
    const has = S.hasSave();
    stage().innerHTML = '<div class="screen">' + Art.titleBg() + '</div><div class="title-wrap"><div class="logo"><div class="a">AMINAS</div><div class="b">LIGHT <i>&amp;</i> SHADOW</div></div><div class="menu">' +
      (has ? '<button class="btn gold" data-act="continue">Continue</button>' : '') +
      '<button class="btn ' + (has ? '' : 'gold') + '" data-act="newgame">New Game</button><button class="btn ghost" data-act="howto">How to Play</button><button class="btn ghost" data-act="settings">Settings</button></div></div>' +
      installBanner() + (S.status && S.status.lastError === 'storage-unavailable' ? '<div class="banner warn">This browser is not allowing saves (Private Browsing?). You can play, but progress will be lost when the page closes.</div>' : '') + '<div class="title-foot">v' + D.VERSION + ' · provisional title · saves on this device only</div>';
    Au.setMode('light');
  };
  UI.act('continue', () => { if (S.load() && st().starter) { UI.showIsland(true); if (UI.bootNote) { UI.toast(UI.bootNote, 'n'); UI.bootNote = null; } } else UI.act_newgame(); });
  // Dev 8: a new player makes their avatar first (after the title screen, before the story begins)
  UI.act_newgame = function () { S.newGame(); if (UI.avatarCreator) UI.avatarCreator({ first: true, done: () => UI.playIntro() }); else UI.playIntro(); };
  UI.act('newgame', () => { if (S.hasSave()) UI.confirm('Start a new game?', 'This will erase your current save on this device.', 'Erase and begin', () => UI.act_newgame(), true); else UI.act_newgame(); });
  UI.act('howto', () => UI.modal(UI.sheet('How to Play',
    '<div class="section-t">The loop</div><ol class="steps"><li>Follow <b>The Entity’s</b> tasks (top-left). Tap <b>Go</b> and the game takes you to exactly where the task happens; tap <b>Claim</b> when it is done.</li><li><b>Restore ruins</b> and <b>build</b> farms, mines, habitats and decorations with <b>Build</b>. Drag to place, rotate, move or store them. Tap a building for its upgrades and actions.</li><li><b>Clear</b> trees, bushes and rocks to make room. Each costs a little gold, takes a little time and gives something back.</li><li>Buildings with residents produce gold, food or gems. Tap the bubble to collect.</li><li><b>Feed</b> your companion to level it up. Starters evolve at level 12. <b>Explore</b> to befriend new Aminas.</li><li>Enter the <b>Overgrown Reliquary</b> with up to three Aminas. Fire&gt;Nature&gt;Water&gt;Fire; Light and Dark counter each other.</li><li>Open the <b>Map</b> to unlock the Verdant Wilds (100,000 gold), Obsidian Reach (200,000) and Celestial Crown (400,000). Each island has its own layout.</li></ol><p class="muted">Your progress saves automatically on this device. Settings has a backup code.</p>', '<button class="btn gold" data-act="close">Got it</button>', 'narrow')));
  UI.act('installNow', () => { if (UI.deferredPrompt) { UI.deferredPrompt.prompt(); UI.deferredPrompt = null; } });
  UI.act('installHelp', () => UI.modal(UI.sheet('Add to Home Screen (iPhone)', '<ol class="steps"><li>Open this page in <b>Safari</b> (not inside another app).</li><li>Tap the <b>Share</b> button (square with an arrow).</li><li>Scroll and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Open <b>Aminas</b> from your Home Screen. It launches full screen and works offline after the first load.</li></ol><p class="muted">Tip: play it once while online so everything is cached.</p>', '<button class="btn gold" data-act="close">OK</button>', 'narrow')));

  /* ---- intro ---- */
  UI.playIntro = function () {
    setScreen('intro'); let i = 0; const cards = T.introCards;
    const draw = () => {
      stage().innerHTML = '<div class="intro"><div class="orb"></div><button class="btn small ghost skip" data-act="introSkip">Skip</button><p>' + esc(cards[i]) + '</p><div class="tapnote">tap to continue</div></div>';
    };
    draw();
    UI.introTap = () => { i++; if (i >= cards.length) UI.arrival(); else draw(); };
  };
  UI.act('introSkip', (el, e) => { e.stopPropagation(); UI.introTap = null; UI.arrival(); });
  document.addEventListener('click', (e) => { if (UI.screen === 'intro' && UI.introTap && !e.target.closest('[data-act]')) UI.introTap(); });

  UI.arrival = function () {
    setScreen('arrival'); st().phase = 'arrival'; S.save(); Au.setMode('light');
    UI.renderBackdropIsland();
    setTimeout(() => UI.script(T.scripts.arrival, () => UI.starterSelect()), 500);
  };
  UI.starterSelect = function () {
    const opts = ['lumifern', 'umbrit']; let pick = null;
    const card = (id) => { const s = D.SPECIES[id]; return '<div class="card" data-act="pickStarter" data-id="' + id + '" style="padding:.6rem"><div class="art" style="width:8rem;height:8rem">' + Art.portrait(id) + '</div><div class="nm" style="font-size:1.1rem">' + s.name + '</div><div>' + chip(s.el) + '</div><div class="muted" style="font-size:.78rem;margin-top:.3rem">' + esc(s.pers) + '</div></div>'; };
    const ov = UI.modal(UI.sheet('Choose your companion', '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem">' + card('lumifern') + card('umbrit') + '</div><p class="muted center" style="font-size:.8rem;margin:.5rem 0 0">Light and Dark are not good and evil. Both can be kind, and both can be wrong. You will meet the other one eventually.</p>',
      '<span class="muted" id="st-note">Tap one to choose</span><button class="btn gold off" id="st-go">Choose</button>', 'narrow wide'), { dismiss: false });
    ov.querySelector('.x').remove();
    UI.acts.pickStarter = (el) => { pick = el.dataset.id; ov.querySelectorAll('.card').forEach((c) => c.classList.toggle('sel', c === el)); $('#st-go', ov).classList.remove('off'); $('#st-go', ov).textContent = 'Choose ' + D.SPECIES[pick].name; $('#st-note', ov).textContent = D.SPECIES[pick].lore; };
    $('#st-go', ov).onclick = () => {
      if (!pick) return; UI.close(ov);
      const s = st(); s.starter = pick; s.phase = 'play'; R.addAmina(s, pick, 1); R.drain(); S.save(); Au.play('discover');
      UI.showIsland(false); UI.sparkles($('.comp .art'), 20);
      setTimeout(() => UI.script(T.scripts.starterChosen[pick], () => { UI.afterAction(); }), 400);
    };
  };

  /* ---------- island: see ui-world.js (world view, HUD, Build Mode, panels, quests, navigation) ---------- */

  /* ---- feeding ---- */
  UI.doFeed = function (uid, kind, anchor) {
    const s = st(), inst = R.inst(s, uid); if (!inst) return null;
    const before = inst.lv, spBefore = inst.sp;
    const r = R.feed(s, uid, kind);
    if (!r.ok) {
      Au.play('no');
      if (r.reason === 'food') UI.gainFloat(anchor, 'Not enough food', '#ff9b8c');
      if (r.reason === 'max') UI.toast('Maximum level. There is nothing left to eat that will help. Not that it will stop them.', 't');
      UI.afterAction(); return r;
    }
    Au.play('feed'); UI.sparkles(anchor || $('.comp .art'), 8);
    UI.gainFloat(anchor, '+' + r.xp + ' xp', '#fff0a8');
    if (r.levels.length) UI.levelFx(inst, before, inst.lv, anchor || $('.comp .art'));
    S.save(); UI.flush(); UI.refresh();
    return r;
  };
  UI.act('feed', (el) => { const a = R.active(st()); if (a) UI.doFeed(a.uid, el.dataset.kind, el); });

  function reqText(req) { return A.World.reqText(req) || (req && req.flag === 'r2' ? 'Something big has to wake up first.' : ''); }
  UI.reqText = reqText;

  /* ---- collection & detail ---- */
  // Collection: filter by element or ownership and sort; progress per element. State lives in UI.col.
  UI.col = { el: 'all', show: 'all', sort: 'dex' };
  UI.collection = function (ovEx) {
    const s = st(), f = UI.col, dex = D.ROSTER.map((x) => x.id);
    const topLv = (id) => s.aminas.filter((a) => a.sp === id).reduce((m, a) => Math.max(m, a.lv), 0);
    let list = D.ROSTER.filter((sp) => (f.el === 'all' || sp.el === f.el) && (f.show === 'all' || (f.show === 'owned' ? R.status(s, sp.id) === 'owned' : R.status(s, sp.id) !== 'owned')));
    const by = { dex: (a, b) => dex.indexOf(a.id) - dex.indexOf(b.id), level: (a, b) => topLv(b.id) - topLv(a.id) || dex.indexOf(a.id) - dex.indexOf(b.id), name: (a, b) => ((R.status(s, a.id) === 'unknown') - (R.status(s, b.id) === 'unknown')) || a.name.localeCompare(b.name), element: (a, b) => Object.keys(D.ELEMENTS).indexOf(a.el) - Object.keys(D.ELEMENTS).indexOf(b.el) || dex.indexOf(a.id) - dex.indexOf(b.id) };
    list = list.slice().sort(by[f.sort] || by.dex);
    const cards = list.map((sp) => {
      const status = R.status(s, sp.id), mine = s.aminas.filter((a) => a.sp === sp.id), top = topLv(sp.id), no = '#' + String(dex.indexOf(sp.id) + 1).padStart(2, '0');
      if (status === 'unknown') return '<div class="card unknown" data-act="detail" data-sp="' + sp.id + '"><span class="dexno">' + no + '</span>' + silBox(sp.id) + '<div class="nm">???</div><div class="lvl">Undiscovered</div></div>';
      return '<div class="card ' + status + '" data-act="detail" data-sp="' + sp.id + '"><span class="dexno">' + no + '</span>' + (status === 'seen' ? silBox(sp.id) : artBox(sp.id)) + (mine.length > 1 ? '<span class="cnt">×' + mine.length + '</span>' : '') + '<div class="nm">' + esc(sp.name) + '</div><div>' + chip(sp.el) + '</div><div class="lvl">' + (status === 'owned' ? (top ? 'Lv ' + top : 'Befriended') : 'Sighted') + '</div></div>';
    }).join('') || '<p class="muted">Nothing matches these filters yet.</p>';
    const elBtn = (k, label, extra) => '<button class="fchip ' + (f.el === k ? 'on' : '') + (k !== 'all' ? ' el-' + k : '') + '" data-act="colSet" data-k="el" data-v="' + k + '">' + label + (extra || '') + '</button>';
    const cnt = (el) => { const all = D.ROSTER.filter((x) => x.el === el); return ' <small>' + all.filter((x) => s.owned[x.id]).length + '/' + all.length + '</small>'; };
    const seg = (k, opts) => '<span class="seg">' + opts.map(([v, t]) => '<button class="' + (f[k] === v ? 'on' : '') + '" data-act="colSet" data-k="' + k + '" data-v="' + v + '">' + t + '</button>').join('') + '</span>';
    const bar = '<div class="colbar"><div class="fchips">' + elBtn('all', 'All') + Object.keys(D.ELEMENTS).map((e) => elBtn(e, esc(D.ELEMENTS[e].name), cnt(e))).join('') + '</div><div class="colctl">' + seg('show', [['all', 'All'], ['owned', 'Befriended'], ['missing', 'Missing']]) + seg('sort', [['dex', 'No.'], ['level', 'Level'], ['element', 'Element'], ['name', 'A–Z']]) + '</div></div>';
    const html = UI.sheet('Creature Collection · ' + R.ownedCount(s) + ' / ' + D.ROSTER.length, bar + '<div class="grid">' + cards + '</div>', '<span class="muted" style="margin-right:auto;font-size:.8rem">Tap any entry. Undiscovered entries tell you how to find them.</span><button class="btn ghost" data-act="bag">' + I('book') + ' Bag</button><button class="btn gold" data-act="close">Close</button>', 'wide');
    if (ovEx && ovEx.parentNode) { const sc = $('.sh-body', ovEx).scrollTop; ovEx.innerHTML = html; $('.sh-body', ovEx).scrollTop = sc; return ovEx; }
    const ov = UI.modal(html); ov._collection = true; return ov;
  };
  UI.act('collection', () => UI.collection());
  UI.act('colSet', (el) => { UI.col[el.dataset.k] = el.dataset.v; UI.collection(el.closest('.overlay')); });

  UI.effLines = function (el) {
    const strong = D.STRONG[el] || [], weak = Object.keys(D.STRONG).filter((k) => D.STRONG[k].indexOf(el) >= 0);
    return '<div class="kv"><b>Strong against:</b> ' + (strong.length ? strong.map((x) => D.ELEMENTS[x].name).join(', ') : '—') + ' &nbsp; <b>Weak to:</b> ' + (weak.length ? weak.map((x) => D.ELEMENTS[x].name).join(', ') : '—') + '</div>';
  };
  // Evolution family of a species: [base, evolved] in order (one or two stages in this roster).
  UI.family = function (spId) { return D.LINES[D.SPECIES[spId].line].ids.slice(); };
  const CLIP_LABEL = { idle: 'Idle', move: 'Hop', attack: 'Attack', hit: 'Ouch', victory: 'Cheer', defeat: 'Faint' };
  UI.detail = function (spId, o) {
    o = o || {}; const s = st(), W = A.World;
    let inst = o.uid ? R.inst(s, o.uid) : null; if (inst) spId = inst.sp;
    const sp = D.SPECIES[spId], status = R.status(s, spId), mine = s.aminas.filter((a) => a.sp === spId);
    if (!inst && mine.length) inst = mine.slice().sort((a, b) => b.lv - a.lv)[0];
    const tab = (o.ov && o.ov._tab) || o.tab || 'about';
    let body, live = false;
    if (status === 'unknown') {
      body = '<div class="detail"><div class="big sil art">' + Art.portrait(spId) + '</div><div><h2>???</h2><div class="kv"><b>How to find it:</b> ' + esc(sp.find) + '</div><p class="muted" style="font-size:.85rem">You have not met this Amina yet.</p></div></div>';
    } else if (status === 'seen') {
      body = '<div class="detail"><div class="big sil art">' + Art.portrait(spId) + '</div><div><h2>' + esc(sp.name) + ' ' + chip(sp.el) + '</h2><p class="muted">Sighted, but not yet befriended.</p><div class="kv"><b>How to find it:</b> ' + esc(sp.find) + '</div>' + UI.effLines(sp.el) + '</div></div>';
    } else {
      live = true;
      const lv = inst.lv, stt = R.statsWithGear(s, inst), next = lv < D.MAX_LEVEL ? R.statsWithGear(s, Object.assign({}, inst, { lv: lv + 1 })) : stt;
      const evo = sp.evo ? 'Can evolve into <b>' + (s.owned[sp.evo.to] ? D.SPECIES[sp.evo.to].name : '???') + '</b> from level ' + sp.evo.lv + ' (you decide when).' : 'Final form.';
      const fam = UI.family(spId);
      const famHtml = '<div class="evo-path">' + fam.map((id, i) => { const known = R.status(s, id) !== 'unknown', own = !!s.owned[id], d = D.SPECIES[id], ev = i ? D.SPECIES[fam[i - 1]].evo : null;
        return (i ? '<div class="evo-arrow">' + I('arrow') + '<small>Lv ' + ev.lv + '</small></div>' : '') + '<div class="evo-node' + (id === spId ? ' cur' : '') + (own ? '' : ' unknown') + '">' + (own ? artBox(id) : silBox(id)) + '<b>' + (known ? esc(d.name) : '???') + '</b><small>Stage ' + d.stage + '</small></div>'; }).join('') + '</div>' +
        (sp.evo && inst ? '<div class="kv" style="margin-top:.3rem"><b>Progress:</b> Lv ' + inst.lv + ' / ' + sp.evo.lv + '</div><div class="bar xp"><i style="width:' + Math.min(100, Math.round((inst.lv / sp.evo.lv) * 100)) + '%"></i></div>' : '');
      const recipes = Object.keys(D.BREED).filter((k) => D.BREED[k].sp === spId);
      const breedHtml = recipes.length ? '<div class="kv"><b>Hatches from:</b> ' + recipes.map((k) => (s.recipes && s.recipes[k] ? k.split('+').map((e) => chip(e)).join(' + ') : '<span class="muted">an undiscovered pairing</span>')).join(' · ') + '</div>' : '';
      const homeType = 'hab_' + sp.el, home = D.BUILDINGS[homeType];
      const homeHtml = home ? '<div class="kv"><b>Best home:</b> ' + esc(home.name) + ' <span class="muted">(' + esc(D.ELEMENTS[sp.el].name) + ' residents earn 50% more)</span></div>' : '';
      const tabs = '<div class="dtabs" role="tablist">' + [['about', 'About'], ['battle', 'Battle'], ['moves', 'Moves'], ['gear', 'Gear'], ['growth', 'Growth']].map(([k, t]) => '<button class="dtab ' + (tab === k ? 'on' : '') + '" role="tab" aria-selected="' + (tab === k) + '" data-act="dTab" data-tab="' + k + '">' + t + '</button>').join('') + '</div>';
      const about = '<div class="dpanel" data-panel="about"' + (tab === 'about' ? '' : ' hidden') + '><div class="kv"><b>Personality:</b> ' + esc(sp.pers) + '</div><div class="kv">' + esc(sp.lore) + '</div><div class="kv"><b>Found:</b> ' + esc(sp.find) + '</div><div class="entnote"><div class="ep">' + Art.entity('n') + '</div><div>“' + esc(sp.ent) + '”</div></div></div>';
      const battle = '<div class="dpanel" data-panel="battle"' + (tab === 'battle' ? '' : ' hidden') + '><div class="stats">' + [['HP', 'hp'], ['ATK', 'atk'], ['DEF', 'def'], ['SPD', 'spd']].map((k) => '<div class="stat">' + k[0] + '<b>' + stt[k[1]] + '</b>' + (lv < D.MAX_LEVEL ? '<em>+' + (next[k[1]] - stt[k[1]]) + '</em>' : '') + '</div>').join('') + '</div>' + UI.effLines(sp.el) +
        sp.abil.map((id) => { const ab = D.ABILITIES[id], mlv = (R.moveLevels ? R.moveLevels(inst)[id] : 1) || 1; return '<div class="abil"><b>' + ab.name + '</b> ' + chip(ab.el) + ' <span class="muted">Lv ' + mlv + ' · ' + (R.moveEffect ? esc(R.moveEffect(id, mlv).text) : ab.power ? 'Power ' + ab.power : 'Utility') + (ab.cd ? ' · every ' + (ab.cd + 1) + ' turns' : '') + '</span><br>' + esc(ab.desc) + '</div>'; }).join('') + '<button class="btn small" data-act="dTabGo" data-tab="moves">' + I('up') + 'Upgrade moves</button></div>';
      const gearP = '<div class="dpanel" data-panel="gear"' + (tab === 'gear' ? '' : ' hidden') + '>' + UI.gearHtml(s, inst) + '</div>' +
        '<div class="dpanel" data-panel="moves"' + (tab === 'moves' ? '' : ' hidden') + '>' + (UI.movesHtml ? UI.movesHtml(s, inst) : '') + '</div>';
      const growth = '<div class="dpanel" data-panel="growth"' + (tab === 'growth' ? '' : ' hidden') + '>' + famHtml + '<div class="kv"><b>Evolution:</b> ' + evo + '</div>' + breedHtml + homeHtml + '</div>';
      const clips = A.C3D && A.C3D.enabled() ? '<div class="clipbar">' + ['move', 'attack', 'hit', 'victory'].map((c) => '<button class="fchip" data-act="vPlay" data-clip="' + c + '">' + CLIP_LABEL[c] + '</button>').join('') + '</div>' : '';
      body = '<div class="detail"><div><div class="big art viewer3d">' + Art.portrait(spId) + '</div>' + clips + '</div><div><h2>' + esc(sp.name) + ' ' + chip(sp.el) + '</h2>' + (sp.title ? '<div class="sp-title muted">' + esc(sp.title) + ' · Stage ' + sp.stage + '</div>' : '') + tabs + about + battle + gearP + growth + '</div></div>';
      body += '<div class="section-t">Your ' + esc(sp.name) + (mine.length > 1 ? 's' : '') + '</div>' + mine.map((a) => {
        const need = R.xpNeed(a.lv), isAct = a.uid === s.active, hm = W.homeOf(s, a.uid);
        return '<div class="inst"><div class="art">' + Art.portrait(a.sp) + '</div><div class="grow"><b>Lv ' + a.lv + '</b> ' + (isAct ? '<span class="chip light">Companion</span>' : '') + ' <span class="muted" style="font-size:.7rem">' + (hm ? 'Lives in the ' + esc(W.def(hm).name) : isAct ? '' : 'Roams the island') + '</span><div class="bar xp" style="margin-top:.2rem"><i style="width:' + (a.lv >= D.MAX_LEVEL ? 100 : pct(a.xp, need)) + '%"></i></div><span class="muted" style="font-size:.7rem">' + (a.lv >= D.MAX_LEVEL ? 'MAX' : a.xp + ' / ' + need + ' xp') + '</span></div>' +
          '<button class="btn small gold" data-act="detailFeed" data-uid="' + a.uid + '" data-kind="snack">Snack ' + D.SNACKS.snack.food + '</button><button class="btn small" data-act="detailFeed" data-uid="' + a.uid + '" data-kind="feast">Feast ' + D.SNACKS.feast.food + '</button>' + (isAct ? '' : '<button class="btn small ghost" data-act="makeActive" data-uid="' + a.uid + '">Companion</button>') + (D.SPECIES[a.sp].evo && a.lv >= D.SPECIES[a.sp].evo.lv ? '<button class="btn small gold evo-btn" data-act="evoAsk" data-uid="' + a.uid + '">' + I('spark') + 'Evolve</button>' : '') + '</div>';
      }).join('');
    }
    const html = UI.sheet(esc(status === 'unknown' ? 'Undiscovered Amina' : sp.name), body, '<button class="btn gold" data-act="close">Close</button>', 'wide');
    if (o.ov && o.ov.parentNode) {
      // keep a running 3D viewer when the same species is redrawn (feeding, companion change)
      const keep = o.ov._sp === spId ? $('.viewer3d.live', o.ov) : null; if (!keep) UI.disposeViews(o.ov); else keep.remove();
      const sc = $('.sh-body', o.ov).scrollTop; o.ov.innerHTML = html; $('.sh-body', o.ov).scrollTop = sc; o.ov._sp = spId;
      const slot = $('.viewer3d', o.ov); if (keep && slot) slot.replaceWith(keep); else if (live) UI.mountViewer(o.ov, slot, spId);
      return o.ov;
    }
    const ov = UI.modal(html, { onClose: () => UI.refresh() }); ov._sp = spId; ov._detail = true; ov._tab = tab;
    if (live) UI.mountViewer(ov, $('.viewer3d', ov), spId, { intro: 'move' });
    return ov;
  };
  UI.act('dTab', (el) => { const ov = el.closest('.overlay'), k = el.dataset.tab; ov._tab = k; ov.querySelectorAll('.dtab').forEach((b) => { b.classList.toggle('on', b === el); b.setAttribute('aria-selected', b === el); }); ov.querySelectorAll('.dpanel').forEach((p) => (p.hidden = p.dataset.panel !== k)); });
  UI.act('dTabGo', (el) => { const b = el.closest('.overlay') && el.closest('.overlay').querySelector('.dtab[data-tab="' + el.dataset.tab + '"]'); if (b) b.click(); });
  UI.act('vPlay', (el) => { const r = UI.viewOf(el.closest('.overlay')); if (r && r.v) r.v.play(el.dataset.clip); });
  UI.act('detail', (el) => UI.detail(el.dataset.sp));
  UI.act('detailFeed', (el) => {
    const ov = el.closest('.overlay'), uid = +el.dataset.uid;
    UI.doFeed(uid, el.dataset.kind, el);
    const inst = R.inst(st(), uid); if (inst) UI.detail(inst.sp, { uid, ov });
    const col = [...$('#modal-root').children].find((x) => x !== ov && x._collection); if (col) UI.collection(col);
  });
  UI.act('makeActive', (el) => {
    const ov = el.closest('.overlay'), uid = +el.dataset.uid; R.setActive(st(), uid); S.save(); Au.play('ok');
    UI.detail(R.inst(st(), uid).sp, { uid, ov }); UI.refresh();
  });

  /* ---- missions: see ui-world.js ---- */

  /* ---- explore ---- */
  UI.exArea = 'meadow';
  UI.explore = function (ovEx) {
    const s = st(), a = D.AREAS[UI.exArea], unlocked = R.areaUnlocked(s, UI.exArea);
    const tabs = D.AREA_ORDER.map((id) => { const u = R.areaUnlocked(s, id); return '<button class="tab ' + (id === UI.exArea ? 'on' : '') + (u ? '' : ' lock') + '" data-act="exTab" data-id="' + id + '" data-hl="area:' + id + '">' + (u ? I('compass') : I('lock')) + esc(D.AREAS[id].name) + '</button>'; }).join('');
    const finds = a.steps.filter((x) => x[0] === 'find').map((x) => x[1]);
    const resid = finds.map((id) => '<div class="mini">' + (s.owned[id] ? artBox(id) : s.seen[id] ? silBox(id) : silBox(id)) + (s.owned[id] ? esc(D.SPECIES[id].name) : s.seen[id] ? esc(D.SPECIES[id].name) + '?' : '???') + '</div>').join('');
    let main;
    if (!unlocked) main = '<div class="areacard"><h2>' + esc(a.name) + '</h2><p class="muted">' + esc(a.blurb) + '</p><p><b>Locked.</b> ' + esc(UI.reqText(a.unlock)) + '</p></div>';
    else main = '<div class="areacard"><h2>' + esc(a.name) + '</h2><p class="muted" style="margin:.2rem 0">' + esc(a.blurb) + '</p><div class="muted" style="font-size:.78rem">Residents · ' + finds.filter((x) => s.owned[x]).length + ' / ' + finds.length + ' befriended</div><div class="res-list">' + resid + '</div>' +
      (s.pendingFind ? '<div class="result">Something is waiting for you. <button class="btn small gold" data-act="openFind">Meet it</button></div>' : '') +
      '<button class="btn gold" data-act="doExplore" data-hl="explore">' + I('compass') + ' Explore</button><div id="ex-result">' + (UI.exMsg || '') + '</div></div>';
    const html = UI.sheet('Explore', '<div class="explore"><div class="tabs">' + tabs + '</div>' + main + '</div>', '<span class="muted" style="margin-right:auto;font-size:.78rem">Befriending an Amina costs ' + D.BEFRIEND_COST + ' food. Exploring is free.</span><button class="btn gold" data-act="close">Close</button>', 'wide');
    if (ovEx && ovEx.parentNode) { ovEx.innerHTML = html; UI.applyHl && UI.applyHl(); return ovEx; }
    UI.exMsg = ''; const ov = UI.modal(html, { onClose: () => UI.refresh() }); UI.applyHl && UI.applyHl(); return ov;
  };
  UI.act('explore', () => UI.explore());
  UI.act('exTab', (el) => { UI.exArea = el.dataset.id; UI.exMsg = ''; UI.explore(el.closest('.overlay')); });
  UI.act('doExplore', (el) => {
    const ov = el.closest('.overlay'), r = R.explore(st(), UI.exArea);
    if (!r.ok) { Au.play('no'); return; }
    if (r.type === 'res') {
      UI.exMsg = '<div class="result">' + (r.note === 'known' ? 'You find a trail of familiar tracks and a few coins. ' : 'You gather supplies: ') + I('gold') + ' ' + r.gold + (r.food ? ' &nbsp; ' + I('food') + ' ' + r.food : '') + '</div>'; Au.play('ok');
      S.save(); R.after(st()); UI.flush(); UI.refresh(); UI.explore(ov);
    } else {
      Au.play('discover'); S.save(); UI.flush(); UI.explore(ov); UI.findModal(ov);
    }
  });
  UI.act('openFind', (el) => UI.findModal(el.closest('.overlay')));
  UI.findModal = function (parentOv) {
    const s = st(), f = s.pendingFind; if (!f) return; const sp = D.SPECIES[f.sp];
    const ov = UI.modal('<div class="sheet panel narrow vcard" style="padding:1rem"><h1 style="font-size:1.4rem">Something rustles…</h1><div class="art" style="width:8rem;height:8rem;margin:.2rem auto">' + Art.portrait(f.sp) + '</div><h2>' + esc(sp.name) + '</h2><div>' + chip(sp.el) + '</div><p class="muted" style="margin:.4rem 0">' + esc(sp.pers) + '</p><div class="row-actions" style="justify-content:center"><button class="btn ghost" data-act="close">Not now</button><button class="btn gold ' + (s.res.food >= D.BEFRIEND_COST ? '' : 'off') + '" data-act="befriend">Offer ' + D.BEFRIEND_COST + ' food</button></div>' + (s.res.food >= D.BEFRIEND_COST ? '' : '<p class="bad" style="font-size:.8rem">You need ' + (D.BEFRIEND_COST - s.res.food) + ' more food. It will wait.</p>') + '</div>');
    ov._parent = parentOv;
  };
  UI.act('befriend', (el) => {
    const ov = el.closest('.overlay'), parent = ov._parent, r = R.befriend(st());
    if (!r.ok) { Au.play('no'); return; }
    ov._onClose = null; ov.remove(); UI.exMsg = '';
    UI.afterAction(); if (parent && parent.parentNode) UI.explore(parent);
  });

  /* ---- Ask The Entity ---- */
  UI.ask = function () {
    const s = st(); const topics = Object.keys(T.ask).filter((k) => !T.ask[k].gate || T.ask[k].gate(s));
    const ov = UI.modal(UI.sheet('Ask The Entity', '<div style="display:grid;grid-template-columns:7rem 1fr;gap:.8rem;align-items:start"><div style="width:7rem;height:7rem" id="ask-por">' + Art.entity('t') + '</div><div><div id="ask-say" class="panel" style="padding:.6rem .8rem;min-height:5rem;font-size:.95rem;line-height:1.4">“Hm? Yes? I’m very busy. Ask.”</div><div class="row-actions" style="margin-top:.6rem">' + topics.map((k) => '<button class="btn small" data-act="askTopic" data-k="' + k + '">' + esc(T.ask[k].label) + '</button>').join('') + '</div></div></div>', '<button class="btn gold" data-act="close">Thanks</button>', 'narrow wide'));
    ov._ask = true;
  };
  UI.act('ask', () => UI.ask());
  UI.act('askTopic', (el) => {
    const ov = el.closest('.overlay'), k = el.dataset.k, r = T.askLines(st(), k);
    if (r.lines) { UI.close(ov); UI.script(r.lines, () => S.save()); }
    else { $('#ask-say', ov).textContent = '“' + r.text + '”'; $('#ask-por', ov).innerHTML = Art.entity(['n', 'w', 't', 'a'][Math.floor(Math.random() * 4)]); S.save(); }
    if (k === 'you' && T.ask.you.slipAfter && st().story.asked.you === T.ask.you.slipAfter && !st().story.used.once_askslip) {
      st().story.used.once_askslip = [1]; setTimeout(() => { UI.close(ov); UI.script([['a', 'You know… I keep asking myself the same question.'], ['t', 'Never mind. Ask me something simpler. The weather. The tide.']], () => {}); }, 900);
    }
  });

  /* ---- Settings ---- */
  UI.settings = function (ovEx) {
    const s = st().settings, has = !!st().starter;
    const tog = (k, label, sub) => '<div class="toggle"><span>' + label + (sub ? '<small class="muted"> ' + sub + '</small>' : '') + '</span><button class="sw ' + (s[k] ? 'on' : '') + '" data-act="setPref" data-k="' + k + '" aria-label="' + label + '" role="switch" aria-checked="' + (s[k] ? 'true' : 'false') + '"></button></div>';
    const seg = (k, label, opts) => '<div class="toggle"><span>' + label + '</span><span class="seg">' + opts.map(([v, t]) => '<button class="' + (s[k] === v ? 'on' : '') + '" data-act="setSeg" data-k="' + k + '" data-v="' + v + '">' + t + '</button>').join('') + '</span></div>';
    const st2 = S.status || {};
    const body = tog('music', 'Music') + tog('sfx', 'Sound effects') + tog('reduceMotion', 'Reduce motion', '(also follows your device setting)') + tog('gridAlways', 'Show the build grid all the time') +
      tog('creatures3d', '3D creatures', A.C3D && !A.C3D.supported() ? '(this device has no WebGL: 2D art is used)' : A.C3D && A.C3D.failed() ? '(3D could not load here: 2D art is used)' : '(turn off on older devices for the classic 2D art)') + tog('voxIsland', '3D voxel island', A.C3D && !A.C3D.supported() ? '(this device has no WebGL: the 2D island is used)' : A.VoxIsland && A.VoxIsland.failed() ? '(could not load here: the 2D island is used)' : '(turn off on older devices for the 2D island)') + tog('dayNight', 'Day and night light on the island') + tog('batterySaver', 'Battery saver', '(30 fps 3D, fewer island effects. Switches on by itself for a session if this device struggles.)') +
      seg('timers', 'Build & clearing timers', [['normal', 'Standard'], ['quick', 'Quick (testing)']]) + seg('eggSpeed', 'Egg timer', [['fast', '20 sec (test)'], ['normal', '5 min']]) + seg('textSpeed', 'Text speed', [['slow', 'slow'], ['normal', 'normal'], ['fast', 'fast']]) +
      '<div class="row-actions">' + (has ? '<button class="btn small" data-act="saveNow">Save now</button>' : '') + '<button class="btn small" data-act="backup">Backup / restore code</button><button class="btn small" data-act="installHelp">Add to Home Screen</button>' + (UI.deferredPrompt ? '<button class="btn small gold" data-act="installNow">Install app</button>' : '') + '<button class="btn small ghost" data-act="howto">How to play</button></div>' +
      '<div class="section-t">Your save</div><p class="muted" style="font-size:.78rem;margin:.2rem 0">Progress is stored only on this device, in this browser (no account, no cloud). Clearing Safari website data or using Private Browsing removes it, and Safari may clear data for websites you have not opened for a few weeks — adding Aminas to your Home Screen avoids that. Keep a backup code. ' + (st2.lastSaveOk === false ? '<b class="bad">The last save failed: ' + esc(st2.lastError || '') + '.</b>' : 'Last saved ' + (st().lastSaved ? new Date(st().lastSaved).toLocaleTimeString() : 'not yet') + '.') + '</p>' +
      '<div class="section-t">Danger zone</div><button class="btn small" style="background:#8a2a3a" data-act="resetAsk">Reset all progress</button>' +
      '<p class="muted center" style="font-size:.7rem" data-act="verTap">Aminas: Light &amp; Shadow v' + D.VERSION + ' · save schema ' + S.SCHEMA + ' · offline · no ads, no tracking</p>';
    const html = UI.sheet('Settings', body, (has ? '<button class="btn ghost" data-act="toTitle">Title screen</button>' : '') + '<button class="btn gold" data-act="close">Close</button>', 'narrow');
    if (ovEx && ovEx.parentNode) { ovEx.innerHTML = html; return ovEx; }
    return UI.modal(html);
  };
  UI.act('settings', () => UI.settings());
  UI.act('setPref', (el) => { const s = st().settings; s[el.dataset.k] = !s[el.dataset.k]; if (el.dataset.k === 'batterySaver' && A.Perf) { if (!s.batterySaver) A.Perf.autoSaver = false; A.Perf.apply(); } Au.setPrefs(s); S.save(); Au.unlock(); document.body.classList.toggle('calm', !!s.reduceMotion); UI.settings(el.closest('.overlay')); if (UI.screen === 'island') { UI.renderWorld(el.dataset.k === 'voxIsland' || el.dataset.k === 'batterySaver'); UI.renderHud(); UI.daylight(); } });
  UI.act('setSeg', (el) => { st().settings[el.dataset.k] = el.dataset.v; S.save(); UI.settings(el.closest('.overlay')); });
  UI.act('saveNow', (el) => { S.save(); UI.gainFloat(el, 'Saved', '#8cffa0'); });
  UI.act('toTitle', () => { S.save(); UI.showTitle(); });
  UI.act('resetAsk', () => UI.confirm('Reset all progress?', 'Your island, Aminas, resources and story progress on this device will be erased. This cannot be undone.', 'Yes, erase everything', () => { UI.closeAll(); S.reset(); Au.setPrefs(st().settings); UI.showTitle(); }, true));
  UI.act('backup', () => {
    const ov = UI.modal(UI.sheet('Backup code', '<p class="muted" style="margin:0 0 .3rem;font-size:.82rem">Copy this code somewhere safe. Paste a code below and tap Restore to load a save.</p><textarea class="code" id="bk-code" readonly></textarea><div class="row-actions"><button class="btn small gold" data-act="copyCode">Copy</button></div><div class="section-t">Restore from code</div><textarea class="code" id="bk-in" placeholder="Paste a code starting with AMINAS1:"></textarea><div class="row-actions"><button class="btn small" id="bk-go">Restore</button><span id="bk-msg" class="muted" style="font-size:.8rem"></span></div>', '<button class="btn gold" data-act="close">Close</button>', 'narrow'));
    $('#bk-code', ov).value = st().starter ? S.exportCode() : 'Start a game first.';
    $('#bk-go', ov).onclick = () => { if (S.importCode($('#bk-in', ov).value)) { UI.closeAll(); UI.showIsland(false); } else $('#bk-msg', ov).textContent = 'That code did not work.'; };
  });
  UI.act('copyCode', (el) => { const ta = $('#bk-code', el.closest('.overlay')); ta.select(); try { (root.navigator.clipboard ? root.navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => UI.gainFloat(el, 'Copied', '#8cffa0'), () => document.execCommand && document.execCommand('copy')); } catch (e) { try { document.execCommand('copy'); } catch (e2) {} } });
  let verTaps = 0, verT = 0;
  UI.act('verTap', () => { if (!D.DEV_TOOLS) return; verTaps++; clearTimeout(verT); verT = setTimeout(() => (verTaps = 0), 2000); if (verTaps >= 7) { verTaps = 0; UI.devPanel(); } });
  UI.devPanel = function () {
    if (!st().starter) return;
    UI.modal(UI.sheet('Developer testing panel', '<p class="muted" style="font-size:.8rem">Testing shortcuts. Nothing here runs unless you tap it. Reset the save from Settings to clear their effects.</p><div class="row-actions"><button class="btn small" data-act="dev" data-k="res">+500 gold, +200 food, +20 gems</button><button class="btn small" data-act="dev" data-k="ess">+50 of every essence</button><button class="btn small" data-act="lpScene">Living-pixel test scene</button><button class="btn small" data-act="dev" data-k="lv">Companion +1 level</button><button class="btn small" data-act="dev" data-k="egg">Finish egg now</button><button class="btn small" data-act="dev" data-k="rank">+1 rank</button><button class="btn small" data-act="dev" data-k="all">Befriend every Amina (Lv 5)</button><button class="btn small" data-act="dev" data-k="gold100k">+100,000 gold</button><button class="btn small" data-act="dev" data-k="timers">Finish all timers</button><button class="btn small" data-act="dev" data-k="prod">Fill all production</button><button class="btn small" data-act="dev" data-k="dboss">Next dungeon: go to its boss</button><button class="btn small" data-act="dev" data-k="dclear">Next dungeon: mark cleared</button></div>', '<button class="btn gold" data-act="close">Close</button>', 'narrow'));
  };
  UI.act('dev', (el) => {
    const s = st(), k = el.dataset.k;
    if (k === 'ess' && R.Essence) { D.ESSENCES.forEach((e) => R.Essence.gain(s, e, 50, 'dev')); S.save(); UI.refresh(); UI.toast('+50 of every essence.', 'n'); return; }
    if (k === 'res') R.addRes(s, { gold: 500, food: 200, gems: 20 });
    if (k === 'lv') { const a = R.active(s); if (a && a.lv < D.MAX_LEVEL) R.addXp(s, a, R.xpNeed(a.lv) - a.xp); }
    if (k === 'egg') (s.eggs || []).forEach((e) => (e.readyAt = Date.now() - 1));
    if (k === 'rank') R.gainRankXp(s, D.RANK_NEED(s.rank) - s.rankXp);
    if (k === 'all') D.ROSTER.forEach((sp) => { if (!s.owned[sp.id]) R.addAmina(s, sp.id, 5); });
    if (k === 'gold100k') R.addRes(s, { gold: 100000 });
    if (k === 'timers') { Object.values(s.buildings).forEach((b) => { if (b.endAt) b.endAt = Date.now() - 1; }); Object.values(s.islands).forEach((i) => Object.values(i.obstacles).forEach((o) => { if (o.endAt) o.endAt = Date.now() - 1; })); }
    if (k === 'dboss' || k === 'dclear') {
      const iid = D.CAMPAIGN[s.currentIsland] && D.CAMPAIGN[s.currentIsland].dungeons.length ? s.currentIsland : 'starter', nx = R.islandProgress(s, iid).current;
      if (nx) { const rec = R.dungeonRec(s, nx); if (k === 'dboss') { rec.next = 9; if (s.run && s.run.d === nx) s.run.battle = 9; } else { rec.clears = 1; rec.next = 0; s.run = s.run && s.run.d === nx ? null : s.run; } UI.toast((k === 'dboss' ? 'Next fight in ' : 'Marked cleared: ') + D.DUNGEONS[nx].name + (k === 'dclear' ? ' (no rewards; the Island Boss must still be beaten for real)' : ''), 'n'); }
    }
    if (k === 'prod') Object.values(s.buildings).forEach((b) => { if (A.World.def(b).produces && b.level >= 1 && b.state !== 'stored') b.stock = A.World.capOf(s, b); });
    s.flags.dev = true; Au.play('ok'); UI.afterAction();
  });

  /* ---------- boot ---------- */
  UI.boot = function () {
    S.load(); Au.setPrefs(st().settings);
    UI.bootNote = S.status.recovered ? 'Your last save was damaged, so I restored the one before it. Nothing much should be missing.' : S.status.migratedFrom ? 'Welcome back. Your sanctuary has been moved onto the new island grid, buildings and all. A copy of your old save is kept on this device.' : S.status.lastError === 'storage-unavailable' ? 'This browser is not letting me save (Private Browsing?). You can play, but progress will be lost when you close the page.' : null;
    document.addEventListener('click', dispatch);
    document.addEventListener('pointerdown', () => Au.unlock(), { once: true });
    const save = () => { if (st().starter) S.save(); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    root.addEventListener('pagehide', save); root.addEventListener('beforeunload', save);
    if (/[?&]scene=livingpixel/.test(root.location.search) && UI.livingPixelScene) { UI.livingPixelScene(); return; }
    UI.showTitle();
  };
})(typeof window !== 'undefined' ? window : globalThis);
