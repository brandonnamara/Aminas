/* Aminas — Hide and Seek round screen (hs-redesign). Starts after the existing lobby and vote (ui-pve.js, unchanged
   apart from handing over to this screen). Full screen, landscape: the Starter Island in 3D (src/3d/hideseek3d.js),
   a joystick (or WASD / arrow keys), and one action button: Disguise for a hider, Attack for the Seeker.

   Round: hiding (D.HIDESEEK.prep seconds; the Seeker counts with eyes covered), then the search (D.HIDESEEK.seconds,
   the same 75 seconds as before). The rules, cooldowns and computer players are in src/hideseek.js. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Au = A.Audio, UI = A.UI, HS = R.HideSeek;
  const { esc } = UI.h, I = A.Art.icon;
  const $ = (s, r) => (r || document).querySelector(s);
  let mod = null;
  const load = () => (mod ? Promise.resolve(mod) : import(new URL('src/3d/hideseek3d.js', document.baseURI).href).then((m) => (mod = m)));
  UI.HSR = null; // the running round (for the tests and for leaving cleanly)
  const fmt = (t) => { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const article = (n) => (/^[AEIOU]/i.test(n) ? 'an ' : 'a ') + n;

  UI.hsRound = function () {
    const s = S.state, L = UI.HS.lobby, asg = UI.HS.assign, you = 'you', youSeek = asg.seeker === you;
    if (UI.HSR) UI.HSR.close(true);
    const ov = UI.modal('<div class="hsround"><div class="hs-host"></div><div class="hs-load">' + I('compass') + '<b>Setting up the Starter Island…</b></div></div>', { dismiss: false });
    ov.classList.add('hs-ov');
    const box = $('.hsround', ov), host = $('.hs-host', ov);
    const R0 = { ov, closed: false };
    UI.HSR = R0;
    load().then((M) => {
      if (!ov.isConnected) return;
      const map = A.VoxIsland.mapData('starter');
      const avatar = (s.avatar && s.avatar.look) || D.AVATAR_DEFAULT || {};
      const look = youSeek ? (s.hideseek.seekerModel || 'male') : null;
      const m = HS.makeArena(map, L, asg.seeker, { models: M.hasModel, seekerLook: look || undefined });
      let colours = {};
      if (youSeek && D.AVATAR) { const a = A.Pixel && A.Pixel.avatarLook ? A.Pixel.avatarLook(avatar) : avatar; colours = { skin: (D.AVATAR.skin[a.skin] || [])[1], hair: (D.AVATAR.hairCol[a.hairCol] || [])[1] }; }
      R0.m = m; UI.HS.match = m;
      const input = { x: 0, z: 0, attack: false, keys: {} };
      let endAt = 0, ended = false, hudT = 0, lastTick = -1, msgT = 0;
      const view = M.createView(host, map, m, {
        focusId: youSeek ? m.seeker.id : you, mineId: youSeek ? null : you, seekerColours: colours,
        sound: (name, e) => { if (!e || e.x == null) return Au.play(name); const f = view.focusId === m.seeker.id ? m.seeker : m.hiders.find((h) => h.id === view.focusId) || m.seeker; if (Math.hypot(e.x - f.x, e.z - f.z) < (name.indexOf('hs') === 0 && /Leaf|Rock|Wood/.test(name) ? 4.5 : 9)) Au.play(name); },
        tick: (dt) => tick(dt),
      });
      R0.view = view; view.aim = () => (youSeek && m.phase === 'seek' && !m.over ? HS.inspect(m) : null);
      $('.hs-load', ov).remove();
      box.insertAdjacentHTML('beforeend', hud(m, youSeek));
      const H = { time: $('.hs-time b', box), phase: $('.hs-phase', box), pips: $('.hs-pips', box), msg: $('.hs-msg', box), btn: $('.hs-act', box), ring: $('.hs-act .hs-ring', box), btnT: $('.hs-act small', box), veil: $('.hs-veil', box), tray: $('.hs-tray', box), stick: $('.hs-stick', box), knob: $('.hs-stick i', box), look: $('.hs-look', box) };
      const say = (text, cls) => { H.msg.textContent = text; H.msg.className = 'hs-msg on ' + (cls || ''); msgT = 2.4; };
      // ---- the joystick: appears under the thumb anywhere on the left of the screen
      let stickId = null, sx = 0, sy = 0;
      const zone = $('.hs-zone', box);
      zone.addEventListener('pointerdown', (e) => { if (stickId != null) return; stickId = e.pointerId; sx = e.clientX; sy = e.clientY; const r = box.getBoundingClientRect(); H.stick.style.left = (sx - r.left) + 'px'; H.stick.style.top = (sy - r.top) + 'px'; H.stick.classList.add('on'); zone.setPointerCapture && zone.setPointerCapture(e.pointerId); e.preventDefault(); });
      zone.addEventListener('pointermove', (e) => { if (e.pointerId !== stickId) return; let dx = e.clientX - sx, dy = e.clientY - sy; const l = Math.hypot(dx, dy), max = 42; if (l > max) { dx = dx / l * max; dy = dy / l * max; } H.knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; const d = view.dirFromScreen(dx / max, dy / max); input.x = d.x; input.z = d.z; });
      const up = (e) => { if (e.pointerId !== stickId) return; stickId = null; input.x = input.z = 0; H.knob.style.transform = ''; H.stick.classList.remove('on'); };
      zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);
      // the Seeker can also turn to face something by tapping it (turning is free; only an attack costs anything)
      if (youSeek) view.canvas.addEventListener('pointerdown', (e) => { const p = view.groundAt(e.clientX, e.clientY); if (p && m.phase === 'seek') m.seeker.face = Math.atan2(p.z - m.seeker.z, p.x - m.seeker.x); });
      const key = (e, on) => { const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) { input.keys[k] = on; e.preventDefault(); } if (on && (k === ' ' || k === 'j' || k === 'enter')) { e.preventDefault(); act(); } if (on && (k === 'e' || k === 'q') && !youSeek) toggleTray(); };
      const kd = (e) => key(e, true), ku = (e) => key(e, false); document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
      // ---- actions
      function act() {
        if (m.over) return; Au.wake && Au.wake();
        if (youSeek) {
          if (m.phase !== 'seek') return say('Wait — the hiders are still hiding.');
          const r = HS.attack(m);
          if (!r.ok) { if (r.reason === 'penalty') say('Penalty: ' + r.wait.toFixed(1) + 's before you can attack again.', 'warn'); return; }
          if (r.hit === 'hider') { const h = m.hiders.find((q) => q.id === r.id); say('Found ' + h.name + '! They were ' + article(h.look) + '.', 'good'); }
          else if (r.hit === 'scenery') say('Just ' + article(m.props.find((p) => p.id === r.id).look) + '. 3s penalty.', 'warn');
          else Au.play('hsSwing');
          return;
        }
        toggleTray();
      }
      H.btn.addEventListener('click', act);
      function trayHtml() {
        const me = m.hiders.find((h) => h.id === you); if (!me) return '';
        const near = []; m.props.forEach((p) => { if (p.key && Math.hypot(p.x - me.x, p.z - me.z) < 4 && near.indexOf(p.key) < 0) near.push(p.key); });
        const order = near.concat(m.looks.filter((k) => near.indexOf(k) < 0)), wait = HS.morphWait(m, me);
        return '<div class="hs-trayhead"><b>Disguise as…</b><span>' + (wait > 0 ? 'Ready in ' + wait.toFixed(1) + 's' : 'Ready') + '</span><button class="hs-trayx" data-hs="tray-x" aria-label="Close">' + I('close') + '</button></div><div class="hs-cards">' +
          order.map((k) => { const lk = HS.look(k), img = view.thumb(k); return '<button class="hs-card' + (k === me.key ? ' cur' : '') + (wait > 0 ? ' wait' : '') + '" data-k="' + esc(k) + '">' + (near.indexOf(k) >= 0 ? '<em>Nearby</em>' : '') + (img ? '<img alt="" src="' + img + '">' : '<span class="hs-noimg"></span>') + '<small>' + esc(lk.name) + '</small></button>'; }).join('') + '</div>';
      }
      function toggleTray(force) {
        const open = force != null ? force : !H.tray.classList.contains('on');
        if (!H.tray) return;
        if (!open || m.over) { H.tray.classList.remove('on'); H.tray.innerHTML = ''; return; }
        H.tray.innerHTML = trayHtml(); H.tray.classList.add('on');
      }
      if (H.tray) H.tray.addEventListener('click', (e) => {
        if (e.target.closest('[data-hs="tray-x"]')) return toggleTray(false);
        const c = e.target.closest('.hs-card'); if (!c) return; const r = HS.disguise(m, you, c.dataset.k);
        if (r.ok) { say('You are now ' + article(HS.look(r.key).name) + '. Next change in ' + D.HIDESEEK.morphCooldown + 's.', 'good'); toggleTray(false); }
        else if (r.reason === 'cooldown') say('Your disguise is recharging: ' + r.wait.toFixed(1) + 's.', 'warn');
        else if (r.reason === 'room') say('No room for ' + article(HS.look(c.dataset.k).name) + ' here. Move to an open spot.', 'warn');
        else if (r.reason === 'same') toggleTray(false);
      });
      $('[data-hs="leave"]', box).addEventListener('click', () => UI.confirm('Leave the round?', youSeek ? 'If the Seeker leaves, the hiders win.' : 'If you leave, you count as found.', 'Leave', () => { HS.leave(m, you); finish(); }, true));
      $('[data-hs="skip"]', box).addEventListener('click', () => finish());
      // ---- each frame
      function tick(dt) {
        if (ended) return;
        const k = input.keys; let kx = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), ky = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0);
        let dx = input.x, dz = input.z; if (kx || ky) { const l = Math.hypot(kx, ky), d = view.dirFromScreen(kx / l, ky / l); dx = d.x; dz = d.z; }
        if (!m.over && (dx || dz)) HS.move(m, youSeek ? m.seeker.id : you, dx, dz, dt);
        const wasPrep = m.phase === 'prep'; HS.step(m, dt, you);
        if (wasPrep && m.phase === 'seek') { Au.play('hsGo'); say(youSeek ? 'Go! Find ' + m.hiders.length + ' hiders. Attack anything suspicious — but scenery costs 3s.' : 'The Seeker is coming. Keep still… or move slowly.', 'good'); const me = m.hiders.find((h) => h.id === you); if (me && me.auto) say('Time was up, so you became ' + article(me.look) + ' where you stood.', 'warn'); }
        const tl = Math.ceil(HS.timeLeft(m)); if (m.phase === 'prep' && tl <= 3 && tl !== lastTick && tl > 0) { lastTick = tl; Au.play('hsTick'); }
        const me = !youSeek && m.hiders.find((h) => h.id === you);
        if (me && me.found && view.focusId === you) { view.focusId = m.seeker.id; toggleTray(false); box.classList.add('spectate'); say('You were found! Watching the Seeker…', 'warn'); }
        hudT -= dt; msgT -= dt; if (msgT <= 0 && H.msg.classList.contains('on')) H.msg.classList.remove('on');
        if (hudT <= 0) { hudT = 0.1; draw(); }
        if (m.over && !endAt) { endAt = performance.now() + 1400; box.classList.add('over'); say(m.result === 'seeker' ? 'Everyone found!' : 'Time! The hiders survived.', m.result === 'seeker' ? (youSeek ? 'good' : 'warn') : youSeek ? 'warn' : 'good'); Au.play((youSeek ? m.result === 'seeker' : m.result === 'hiders' || (me && !me.found)) ? 'win' : 'lose'); }
        if (endAt && performance.now() > endAt) finish();
      }
      function draw() {
        const prep = m.phase === 'prep';
        H.time.textContent = prep ? Math.ceil(HS.timeLeft(m)) + 's' : fmt(HS.timeLeft(m));
        H.phase.textContent = prep ? (youSeek ? 'Counting…' : 'Hide!') : m.over ? 'Round over' : 'Search';
        box.classList.toggle('prep', prep);
        H.pips.innerHTML = m.hiders.map((h) => '<span class="hs-pip' + (h.found ? ' got' : '') + (h.id === you ? ' me' : '') + '" title="' + esc(h.name) + '">' + (h.found ? esc(h.name.slice(0, 1)) : '?') + '</span>').join('') + '<b>' + m.hiders.filter((h) => !h.found).length + ' left</b>';
        if (H.veil) { H.veil.classList.toggle('on', youSeek && prep); if (youSeek && prep) $('b', H.veil).textContent = Math.ceil(HS.timeLeft(m)); }
        if (youSeek) {
          const pen = HS.penaltyLeft(m), wait = Math.max(0, m.seeker.nextAttack - m.t), tot = pen > 0 ? D.HIDESEEK.missPenalty : D.HIDESEEK.swing;
          H.btn.classList.toggle('off', prep || wait > 0); H.btn.classList.toggle('pen', pen > 0);
          H.ring.style.setProperty('--p', wait > 0 ? String(1 - wait / tot) : '1'); H.btnT.textContent = prep ? 'Wait' : pen > 0 ? pen.toFixed(1) + 's' : 'Attack';
        } else {
          const me2 = m.hiders.find((h) => h.id === you), w = HS.morphWait(m, me2);
          H.btn.classList.toggle('off', me2.found); H.btn.classList.toggle('cool', w > 0);
          H.ring.style.setProperty('--p', w > 0 ? String(1 - w / D.HIDESEEK.morphCooldown) : '1'); H.btnT.textContent = w > 0 ? w.toFixed(1) + 's' : 'Disguise';
          H.look.textContent = me2.found ? 'Found' : me2.key ? me2.look : 'Spirit form';
          if (H.tray.classList.contains('on')) { const sp = $('.hs-trayhead span', H.tray); if (sp) sp.textContent = w > 0 ? 'Ready in ' + w.toFixed(1) + 's' : 'Ready'; H.tray.querySelectorAll('.hs-card').forEach((c) => c.classList.toggle('wait', w > 0)); }
        }
      }
      function finish() {
        if (ended) return; ended = true;
        if (!m.over) { m.over = true; m.result = m.result || (youSeek ? 'hiders' : 'seeker'); m.endT = m.t; }
        const sm = HS.summary(m, you);
        s.hideseek.played++; if (sm.youWon) s.hideseek.won++; S.save();
        R0.summary = sm; close(); results(sm, m);
      }
      function close() { document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); R0.closed = true; if (R0.view) { R0.view.dispose(); R0.view = null; } if (ov.isConnected) UI.close(ov); if (UI.HSR === R0) UI.HSR = null; }
      R0.close = (silent) => { ended = true; close(); };
      R0.finish = finish; R0.act = act; R0.tray = toggleTray; R0.input = input;
      ov._onClose = () => { if (!R0.closed) { ended = true; R0.closed = true; document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); if (R0.view) { R0.view.dispose(); R0.view = null; } if (UI.HSR === R0) UI.HSR = null; } };
      draw(); view.start();
      say(youSeek ? 'You are the Seeker. Count while the hiders hide…' : 'Hide! Walk to a good spot and tap Disguise. ' + D.HIDESEEK.prep + 's.', 'good');
    }).catch((e) => {
      if (root.console) console.warn('Hide and Seek 3D unavailable:', e && e.message);
      const l = $('.hs-load', ov); if (l) l.innerHTML = I('info') + '<b>The 3D island could not start on this device.</b><button class="btn gold" data-act="close">Back</button>';
    });
  };

  function hud(m, youSeek) {
    return '<div class="hs-zone"></div><div class="hs-stick"><i></i></div>' +
      '<div class="hs-top"><button class="btn small ghost" data-hs="leave">' + I('back') + ' Leave</button><div class="hs-clock"><span class="hs-phase"></span><span class="hs-time"><b></b></span></div><div class="hs-pips"></div></div>' +
      '<div class="hs-role ' + (youSeek ? 'seek' : 'hide') + '">' + (youSeek ? I('swords') + ' Seeker' : I('star') + ' Hider · <span class="hs-look"></span>') + '</div>' +
      '<div class="hs-msg"></div>' +
      '<button class="hs-act ' + (youSeek ? 'attack' : 'disguise') + '" aria-label="' + (youSeek ? 'Attack' : 'Disguise') + '"><span class="hs-ring"></span>' + I(youSeek ? 'swords' : 'spark') + '<small></small></button>' +
      (youSeek ? '<div class="hs-veil"><span>The hiders are hiding</span><b></b><small>Counting with your eyes covered…</small></div>' : '<div class="hs-tray"></div>') +
      '<button class="btn small hs-skip" data-hs="skip">Skip to results</button>';
  }

  function results(sm, m) {
    const s = S.state, row = (h) => '<tr class="' + (h.found ? 'got' : 'safe') + (h.id === 'you' ? ' me' : '') + '"><td><b>' + esc(h.name) + '</b></td><td>' + esc(h.look) + '</td><td>' + (h.left ? 'Left' : h.found ? 'Found at ' + fmt(h.at) : 'Survived') + '</td><td>' + h.morphs + '</td><td>' + h.moved + '</td></tr>';
    const head = sm.result === 'seeker' ? 'The Seeker found everyone' : 'The hiders win';
    const sk = sm.seeker;
    const body = '<div class="vcard hs-res"><h1>' + (sm.youWon ? 'You win!' : 'Not this time') + '</h1><p>' + sm.found + ' of ' + sm.total + ' hiders found' + (sm.result === 'seeker' ? ' in ' + fmt(sm.time) : '') + '.</p>' +
      '<div class="hs-sides"><section class="hs-side seek"><h3>' + I('swords') + ' Seeker · ' + esc(sm.youSeek ? 'You' : sk.name) + '</h3><div class="hs-stats"><span><b>' + sk.hits + '</b>found</span><span><b>' + sk.misses + '</b>scenery hit</span><span><b>' + sk.attacks + '</b>attacks</span><span><b>' + sk.accuracy + '%</b>accuracy</span></div></section>' +
      '<section class="hs-side hide"><h3>' + I('star') + ' Hiders</h3><table class="hs-tbl"><thead><tr><th>Player</th><th>Disguise</th><th>Result</th><th>Changes</th><th>Moved</th></tr></thead><tbody>' + sm.hiders.map(row).join('') + '</tbody></table></section></div>' +
      '<p class="muted small-t">Games played: ' + s.hideseek.played + ' · won: ' + s.hideseek.won + '</p></div>';
    const ov = UI.modal(UI.sheet(head, body, '<button class="btn ghost" id="hs-out">Back to the menu</button><button class="btn gold" id="hs-again">New lobby</button>', 'wide hsresults'), { dismiss: false });
    $('.x', ov) && $('.x', ov).remove();
    $('#hs-out', ov).onclick = () => { UI.close(ov); UI.HS = null; UI.battleHub(); UI.pvpMenu($('#modal-root .overlay:last-child')); };
    $('#hs-again', ov).onclick = () => { UI.close(ov); UI.HS = null; UI.hideSeek(); };
  }
})(typeof window !== 'undefined' ? window : globalThis);
