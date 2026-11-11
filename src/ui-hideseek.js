/* Aminas — Hide and Seek round screen (hs-redesign; controls, camera, spectating and points: Phase 12C). Starts after
   the existing lobby and vote (ui-pve.js, unchanged apart from handing over to this screen). Full screen, landscape:
   the Starter Island in 3D (src/3d/hideseek3d.js).

   Controls
   * Left of the screen: a joystick that appears under the thumb. It has a dead zone, reaches full speed before the
     edge, and its base follows a thumb that slides past the edge, so a change of direction is always short. It moves
     the player relative to the screen, whichever way the camera is turned.
   * Right of the screen: drag to turn the camera (any direction round, a limited tilt). The camera only looks: it
     never turns the player or a disguise. A short tap there turns the Seeker to face the spot tapped.
   * Buttons sit above both areas and take their own touches, so a camera drag never presses one and a press never
     turns the camera. Each touch is followed by its own id, so moving, looking and pressing work together.
   * Keyboard (desktop): WASD or arrows move, Space / J / Enter act, E or Q open the disguises, Z and C turn the
     camera, V spectates. The mouse drags the camera on the right.

   Round: hiding (D.HIDESEEK.prep seconds; the Seeker counts with eyes covered), then the search (D.HIDESEEK.seconds,
   the same 75 seconds as before). The rules, cooldowns, points and computer players are in src/hideseek.js. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Au = A.Audio, UI = A.UI, HS = R.HideSeek;
  const { esc } = UI.h, I = A.Art.icon;
  const $ = (s, r) => (r || document).querySelector(s);
  const EYE = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const CHEV = (flip) => '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (flip ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7') + '"/></svg>';
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
      // sx, sy: the joystick on screen (x right, y down, strength 0..1). x, z: a direction on the island given
      // directly (the tests and recordings use it). keys: movement and camera keys held.
      const input = { sx: 0, sy: 0, x: 0, z: 0, keys: {} };
      const CAMC = D.HIDESEEK.camera, SK = D.HIDESEEK.stick, SCC = D.HIDESEEK.score;
      let endAt = 0, ended = false, hudT = 0, lastTick = -1, msgT = 0, spec = null, specHintT = 0, foundMode = false, lastTier = -1, lookUsed = false, hintT = 0;
      const view = M.createView(host, map, m, {
        focusId: youSeek ? m.seeker.id : you, mineId: youSeek ? null : you, seekerColours: colours, silhouette: youSeek,
        sound: (name, e) => { if (!e || e.x == null) return Au.play(name); const f = view.focusId === m.seeker.id ? m.seeker : m.hiders.find((h) => h.id === view.focusId) || m.seeker; if (Math.hypot(e.x - f.x, e.z - f.z) < (name.indexOf('hs') === 0 && /Leaf|Rock|Wood/.test(name) ? 4.5 : 9)) Au.play(name); },
        tick: (dt) => tick(dt),
      });
      R0.view = view; view.aim = () => (youSeek && m.phase === 'seek' && !m.over ? HS.inspect(m) : null);
      $('.hs-load', ov).remove();
      box.insertAdjacentHTML('beforeend', hud(m, youSeek));
      const H = { time: $('.hs-time b', box), phase: $('.hs-phase', box), pips: $('.hs-pips', box), msg: $('.hs-msg', box), btn: $('.hs-act', box), ring: $('.hs-act .hs-ring', box), btnT: $('.hs-act small', box), veil: $('.hs-veil', box), tray: $('.hs-tray', box), stick: $('.hs-stick', box), knob: $('.hs-stick i', box), look: $('.hs-look', box),
        score: $('.hs-score', box), pts: $('.hs-score b', box), bonus: $('.hs-score span', box), specBtn: $('.hs-specbtn', box), specBar: $('.hs-specbar', box), specName: $('.hs-specbar b', box), specN: $('.hs-specbar em', box), hint: $('.hs-hint', box) };
      const say = (text, cls) => { H.msg.textContent = text; H.msg.className = 'hs-msg on ' + (cls || ''); msgT = 2.4; };
      const meH = () => m.hiders.find((h) => h.id === you);
      const capture = (el, id) => { try { el.setPointerCapture(id); } catch (e) { /* a synthetic or already-ended pointer */ } };

      /* ---- the joystick (left of the screen) ---- */
      let stick = null; // { id, bx, by }: the pointer steering and where the stick's base is
      const zone = $('.hs-zone', box);
      const stickR = () => Math.max(SK.min, Math.min(SK.max, box.clientHeight * SK.radius));
      const placeBase = () => { const r = box.getBoundingClientRect(); H.stick.style.left = (stick.bx - r.left) + 'px'; H.stick.style.top = (stick.by - r.top) + 'px'; };
      function stickMove(cx, cy) {
        const Rm = stickR(); let dx = cx - stick.bx, dy = cy - stick.by, l = Math.hypot(dx, dy);
        // past the edge: the base follows the thumb, so reversing never needs more than one radius of travel
        if (l > Rm) { stick.bx += dx / l * (l - Rm); stick.by += dy / l * (l - Rm); dx = dx / l * Rm; dy = dy / l * Rm; l = Rm; placeBase(); }
        H.knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
        const dead = SK.dead * Rm, full = SK.full * Rm;
        if (l <= dead) { input.sx = input.sy = 0; return; } // dead zone: a resting thumb does not creep
        const mag = SK.minSpeed + (1 - SK.minSpeed) * Math.min(1, (l - dead) / (full - dead)); // full speed before the edge
        input.sx = dx / l * mag; input.sy = dy / l * mag;
      }
      const stickEnd = () => { stick = null; input.sx = input.sy = 0; H.knob.style.transform = ''; H.stick.classList.remove('on'); H.stick.style.left = ''; H.stick.style.top = ''; };
      zone.addEventListener('pointerdown', (e) => { if (stick) return; e.preventDefault(); stick = { id: e.pointerId, bx: e.clientX, by: e.clientY }; placeBase(); H.stick.classList.add('on'); capture(zone, e.pointerId); stickMove(e.clientX, e.clientY); });
      zone.addEventListener('pointermove', (e) => { if (stick && e.pointerId === stick.id) stickMove(e.clientX, e.clientY); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => zone.addEventListener(n, (e) => { if (stick && e.pointerId === stick.id) stickEnd(); }));

      /* ---- the camera (right of the screen): drag to look; a short tap turns the Seeker to face that spot ---- */
      let lookP = null; // { id, x, y, moved, t0 }
      const camzone = $('.hs-camzone', box);
      camzone.addEventListener('pointerdown', (e) => { if (lookP) return; e.preventDefault(); lookP = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t0: performance.now() }; capture(camzone, e.pointerId); });
      camzone.addEventListener('pointermove', (e) => {
        if (!lookP || e.pointerId !== lookP.id) return; const dx = e.clientX - lookP.x, dy = e.clientY - lookP.y; lookP.x = e.clientX; lookP.y = e.clientY; lookP.moved += Math.abs(dx) + Math.abs(dy);
        if (lookP.moved < 6) return; // a tap that wobbles is still a tap
        view.rotate(dx * CAMC.sens, dy * CAMC.pitchSens); if (!lookUsed) { lookUsed = true; if (H.hint) H.hint.classList.add('gone'); }
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => camzone.addEventListener(n, (e) => {
        if (!lookP || e.pointerId !== lookP.id) return; const tap = n === 'pointerup' && lookP.moved < 10 && performance.now() - lookP.t0 < 350; lookP = null;
        if (tap && youSeek && m.phase === 'seek' && !m.over) { const p = view.groundAt(e.clientX, e.clientY); if (p) m.seeker.face = Math.atan2(p.z - m.seeker.z, p.x - m.seeker.x); }
      }));
      // the page must not scroll, zoom or pop a menu under the round (the disguise strip keeps its sideways scroll)
      const stopTouch = (e) => { if (!e.target.closest || !e.target.closest('.hs-cards')) e.preventDefault(); };
      box.addEventListener('touchmove', stopTouch, { passive: false }); ['gesturestart', 'contextmenu', 'dblclick'].forEach((n) => box.addEventListener(n, (e) => e.preventDefault()));
      // leaving the app (or losing focus) lets go of everything, so nothing stays held down
      const letGo = () => { if (stick) stickEnd(); lookP = null; input.keys = {}; input.sx = input.sy = 0; };
      const onVis = () => { if (document.hidden) letGo(); };
      document.addEventListener('visibilitychange', onVis); window.addEventListener('blur', letGo);

      const MOVE = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
      const key = (e, on) => {
        const k = e.key.toLowerCase(); if (MOVE.indexOf(k) >= 0 || k === 'z' || k === 'c') { input.keys[k] = on; e.preventDefault(); }
        if (on && !e.repeat && (k === ' ' || k === 'j' || k === 'enter')) { e.preventDefault(); act(); }
        if (on && !e.repeat && (k === 'e' || k === 'q') && !youSeek && !spec) toggleTray();
        if (on && !e.repeat && k === 'v' && !youSeek) { if (spec) specStop('Back to your disguise.'); else specStart(); }
      };
      const kd = (e) => key(e, true), ku = (e) => key(e, false); document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
      const moving = () => !!(input.sx || input.sy || input.x || input.z || MOVE.some((k) => input.keys[k]));

      /* ---- actions ---- */
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
        if (spec) return specStop('Back to your disguise.'); // while spectating the button is Return to my disguise
        toggleTray();
      }
      // Pointer events, not clicks: on a phone a second finger (the thumb on the joystick is the first) never produces a
      // click, and the Seeker must be able to attack while moving. A click that follows the same press is ignored.
      // The click the browser sends after a press is swallowed by a flag, not by a short time window, so a press whose
      // work takes a while on a slow phone can never count twice. A click with no press before it (keyboard,
      // assistive tech) still works.
      const press = (el, fn) => { if (!el) return; let pressed = false, t = 0; el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); pressed = true; fn(e); t = performance.now(); }); el.addEventListener('click', (e) => { const dup = pressed && performance.now() - t < 1500; pressed = false; if (!dup) fn(e); }); };
      press(H.btn, act);
      function trayHtml() {
        const me = meH(); if (!me) return '';
        const near = []; m.props.forEach((p) => { if (p.key && Math.hypot(p.x - me.x, p.z - me.z) < 4 && near.indexOf(p.key) < 0) near.push(p.key); });
        const order = near.concat(m.looks.filter((k) => near.indexOf(k) < 0)), wait = HS.morphWait(m, me);
        return '<div class="hs-trayhead"><b>Disguise as…</b><span>' + (wait > 0 ? 'Ready in ' + wait.toFixed(1) + 's' : 'Ready') + '</span><button class="hs-trayx" data-hs="tray-x" aria-label="Close">' + I('close') + '</button></div><div class="hs-cards">' +
          order.map((k) => { const lk = HS.look(k), img = view.thumb(k); return '<button class="hs-card' + (k === me.key ? ' cur' : '') + (wait > 0 ? ' wait' : '') + '" data-k="' + esc(k) + '">' + (near.indexOf(k) >= 0 ? '<em>Nearby</em>' : '') + (img ? '<img alt="" src="' + img + '">' : '<span class="hs-noimg"></span>') + '<small>' + esc(lk.name) + '</small></button>'; }).join('') + '</div>';
      }
      function toggleTray(force) {
        if (!H.tray) return;
        const open = force != null ? force : !H.tray.classList.contains('on');
        if (!open || m.over || spec) { H.tray.classList.remove('on'); H.tray.innerHTML = ''; return; }
        H.tray.innerHTML = trayHtml(); H.tray.classList.add('on');
      }
      // the tray: a tap picks a card (also with another finger down); a drag scrolls the strip
      let tp = null, tapT = 0;
      const choose = (target) => {
        if (target.closest('[data-hs="tray-x"]')) return toggleTray(false);
        const c = target.closest('.hs-card'); if (!c) return; const r = HS.disguise(m, you, c.dataset.k);
        if (r.ok) { say('You are now ' + article(HS.look(r.key).name) + '. Next change in ' + D.HIDESEEK.morphCooldown + 's.', 'good'); toggleTray(false); }
        else if (r.reason === 'cooldown') say('Your disguise is recharging: ' + r.wait.toFixed(1) + 's.', 'warn');
        else if (r.reason === 'room') say('No room for ' + article(HS.look(c.dataset.k).name) + ' here. Move to an open spot.', 'warn');
        else if (r.reason === 'same') toggleTray(false);
      };
      if (H.tray) {
        H.tray.addEventListener('pointerdown', (e) => { tp = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
        let tapped = false;
        H.tray.addEventListener('pointerup', (e) => { if (tp && tp.id === e.pointerId && Math.hypot(e.clientX - tp.x, e.clientY - tp.y) < 10) { tapped = true; choose(e.target); tapT = performance.now(); } tp = null; });
        H.tray.addEventListener('click', (e) => { const dup = tapped && performance.now() - tapT < 1500; tapped = false; if (!dup) choose(e.target); });
      }
      $('[data-hs="leave"]', box).addEventListener('click', () => UI.confirm('Leave the round?', youSeek ? 'If the Seeker leaves, the hiders win.' : 'If you leave, you count as found.', 'Leave', () => { HS.leave(m, you); finish(); }, true));
      $('[data-hs="skip"]', box).addEventListener('click', () => finish());

      /* ---- spectating (a hider watching the other hiders): only the camera changes ---- */
      const others = () => HS.spectatable(m, you);
      function specShow() { const list = others(), i = list.findIndex((h) => h.id === spec), h = list[i]; if (!h) return; H.specName.textContent = h.name; H.specN.textContent = (i + 1) + ' of ' + list.length; }
      function specSet(id) { spec = id; view.focusId = id; toggleTray(false); box.classList.add('spec-on'); specShow(); draw(); }
      function specStart() {
        if (youSeek || m.over || spec) return; const me = meH(); if (!me || me.found) return;
        if (!me.key) return say('Disguise yourself first. Then you can watch the other hiders.', 'warn');
        if (moving()) return say('Stand still to spectate.', 'warn');
        const list = others(); if (!list.length) return say('No other hiders are left to watch.', 'warn');
        list.sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z)); specSet(list[0].id);
        say('Spectating ' + list[0].name + '. Your disguise stays where it is.', 'good');
      }
      function specCycle(dir) { if (!spec) return; const list = others(); if (!list.length) return specStop('No other hiders are left to watch.'); let i = list.findIndex((h) => h.id === spec); i = ((i < 0 ? 0 : i + dir) + list.length) % list.length; specSet(list[i].id); }
      function specStop(msg, cls) { if (!spec) return; spec = null; box.classList.remove('spec-on'); const me = meH(); if (me && !me.found) view.focusId = you; if (msg) say(msg, cls || 'good'); draw(); }
      press(H.specBtn, specStart);
      press($('[data-hs="spec-prev"]', box), () => specCycle(-1)); press($('[data-hs="spec-next"]', box), () => specCycle(1));
      press($('[data-hs="spec-back"]', box), () => specStop('Back to your disguise.'));

      /* ---- each frame ---- */
      // the disguise pictures are drawn one a frame from the start of the round, so the tray opens without a hitch
      const thumbQ = youSeek ? [] : m.looks.slice();
      function tick(dt) {
        if (ended) return;
        if (thumbQ.length) view.thumb(thumbQ.shift());
        const k = input.keys; const kx = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), ky = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0);
        if (k.z || k.c) view.rotate(((k.c ? 1 : 0) - (k.z ? 1 : 0)) * CAMC.keyRate * dt, 0);
        // movement is relative to the screen, so it follows the camera however it is turned
        let d = { x: input.x, z: input.z };
        if (kx || ky) { const l = Math.hypot(kx, ky); d = view.dirFromScreen(kx / l, ky / l); } else if (input.sx || input.sy) d = view.dirFromScreen(input.sx, input.sy);
        if (d.x || d.z) {
          if (spec) { specHintT -= dt; if (specHintT <= 0) { specHintT = 3; say('Your disguise stays put while you spectate. Return to it to move.', 'warn'); } }
          else if (!m.over) HS.move(m, youSeek ? m.seeker.id : you, d.x, d.z, dt);
        } else specHintT = 0;
        const wasPrep = m.phase === 'prep'; HS.step(m, dt, you);
        if (wasPrep && m.phase === 'seek') { Au.play('hsGo'); say(youSeek ? 'Go! Find ' + m.hiders.length + ' hiders. Attack anything suspicious — but scenery costs 3s.' : 'The Seeker is coming. Stay near it for points — but do not get found.', 'good'); const me0 = meH(); if (me0 && me0.auto) say('Time was up, so you became ' + article(me0.look) + ' where you stood.', 'warn'); }
        const tl = Math.ceil(HS.timeLeft(m)); if (m.phase === 'prep' && tl <= 3 && tl !== lastTick && tl > 0) { lastTick = tl; Au.play('hsTick'); }
        const me = !youSeek && meH();
        // spectating ends by itself when it is no longer valid: the round is over, the player is found, or the hider
        // being watched is found
        if (spec) { const t = m.hiders.find((h) => h.id === spec); if (m.over || (me && me.found)) specStop(); else if (!t || t.found) specStop((t ? t.name : 'That hider') + ' was found. Back to your disguise.', 'warn'); }
        if (me && me.found && !foundMode) { foundMode = true; view.focusId = m.seeker.id; toggleTray(false); box.classList.add('spectate'); say('You were found! Watching the Seeker…', 'warn'); }
        // the Seeker coming very close to the player's own disguise is worth a warning while they are watching elsewhere
        if (me && !me.found && m.phase === 'seek') { const p = HS.proximity(m, me); if (p.tier === 0 && lastTier !== 0 && spec) say('The Seeker is very close to your disguise!', 'warn'); lastTier = p.tier; }
        if (hintT < 7 && !(youSeek && m.phase === 'prep')) { hintT += dt; if (hintT >= 7 && H.hint) H.hint.classList.add('gone'); } // the two hints show for the first seconds of play
        hudT -= dt; msgT -= dt; if (msgT <= 0 && H.msg.classList.contains('on')) H.msg.classList.remove('on');
        if (hudT <= 0) { hudT = 0.1; draw(); }
        if (m.over && !endAt) { endAt = performance.now() + 1400; box.classList.add('over'); say(m.result === 'seeker' ? 'Everyone found!' : 'Time! The hiders survived.', m.result === 'seeker' ? (youSeek ? 'good' : 'warn') : youSeek ? 'warn' : 'good'); Au.play((youSeek ? m.result === 'seeker' : m.result === 'hiders' || (me && !me.found)) ? 'win' : 'lose'); }
        if (endAt && performance.now() > endAt) finish();
      }
      function draw() {
        const prep = m.phase === 'prep';
        H.time.textContent = prep ? Math.ceil(HS.timeLeft(m)) + 's' : fmt(HS.timeLeft(m));
        H.phase.textContent = prep ? (youSeek ? 'Counting…' : 'Hide!') : m.over ? 'Round over' : 'Search';
        box.classList.toggle('prep', prep); box.classList.toggle('veiled', youSeek && prep);
        H.pips.innerHTML = m.hiders.map((h) => '<span class="hs-pip' + (h.found ? ' got' : '') + (h.id === you ? ' me' : '') + '" title="' + esc(h.name) + '">' + (h.found ? esc(h.name.slice(0, 1)) : '?') + '</span>').join('') + '<b>' + m.hiders.filter((h) => !h.found).length + ' left</b>';
        if (H.veil) { H.veil.classList.toggle('on', youSeek && prep); if (youSeek && prep) $('b', H.veil).textContent = Math.ceil(HS.timeLeft(m)); }
        if (youSeek) {
          const pen = HS.penaltyLeft(m), wait = Math.max(0, m.seeker.nextAttack - m.t), tot = pen > 0 ? D.HIDESEEK.missPenalty : D.HIDESEEK.swing;
          H.btn.classList.toggle('off', prep || wait > 0); H.btn.classList.toggle('pen', pen > 0);
          H.ring.style.setProperty('--p', wait > 0 ? String(1 - wait / tot) : '1'); H.btnT.textContent = prep ? 'Wait' : pen > 0 ? pen.toFixed(1) + 's' : 'Attack';
        } else {
          const me2 = meH(), w = HS.morphWait(m, me2);
          H.btn.classList.toggle('off', me2.found); H.btn.classList.toggle('cool', w > 0 && !spec); H.btn.classList.toggle('ret', !!spec);
          H.ring.style.setProperty('--p', w > 0 && !spec ? String(1 - w / D.HIDESEEK.morphCooldown) : '1'); H.btnT.textContent = spec ? 'Return' : w > 0 ? w.toFixed(1) + 's' : 'Disguise';
          H.btn.setAttribute('aria-label', spec ? 'Return to my disguise' : 'Disguise');
          H.look.textContent = me2.found ? 'Found' : me2.key ? me2.look : 'Spirit form';
          if (H.tray.classList.contains('on')) { const sp = $('.hs-trayhead span', H.tray); if (sp) sp.textContent = w > 0 ? 'Ready in ' + w.toFixed(1) + 's' : 'Ready'; H.tray.querySelectorAll('.hs-card').forEach((c) => c.classList.toggle('wait', w > 0)); }
          // points and the bonus for being near the Seeker: always for the player's own disguise, whoever is on screen
          const p = HS.proximity(m, me2); H.pts.textContent = HS.points(me2);
          H.bonus.textContent = me2.found ? 'found' : prep ? 'starts with the search' : p.rate > 0 ? '+' + p.rate + '/s · ' + SCC.tiers[p.tier].name : '+0/s';
          H.score.className = 'hs-score t' + (me2.found || prep ? 'x' : p.tier < 0 ? 'n' : p.tier);
          H.specBtn.classList.toggle('off', !me2.key || me2.found || !others().length);
          if (spec) specShow();
        }
      }
      function finish() {
        if (ended) return; ended = true;
        // skipping or leaving: the computer players finish the round at once, so the results are the real ones
        if (!m.over) HS.finish(m, you);
        const sm = HS.summary(m, you);
        s.hideseek.played++; if (sm.youWon) s.hideseek.won++;
        // points are a score only (no coins, food or gems); the player's best as a hider is remembered
        sm.best = s.hideseek.best || 0; sm.newBest = !sm.youSeek && sm.youPoints > sm.best; if (sm.newBest) s.hideseek.best = sm.youPoints;
        S.save();
        R0.summary = sm; close(); results(sm, m);
      }
      const unhook = () => { document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', letGo); };
      function close() { unhook(); R0.closed = true; if (R0.view) { R0.view.dispose(); R0.view = null; } if (ov.isConnected) UI.close(ov); if (UI.HSR === R0) UI.HSR = null; }
      R0.close = () => { ended = true; close(); };
      R0.finish = finish; R0.act = act; R0.tray = toggleTray; R0.input = input;
      R0.spec = { start: specStart, stop: () => specStop('Back to your disguise.'), cycle: specCycle, id: () => spec };
      ov._onClose = () => { if (!R0.closed) { ended = true; R0.closed = true; unhook(); if (R0.view) { R0.view.dispose(); R0.view = null; } if (UI.HSR === R0) UI.HSR = null; } };
      draw(); view.start();
      say(youSeek ? 'You are the Seeker. Count while the hiders hide…' : 'Hide! Walk to a good spot and tap Disguise. ' + D.HIDESEEK.prep + 's.', 'good');
    }).catch((e) => {
      if (root.console) console.warn('Hide and Seek 3D unavailable:', e && e.message);
      const l = $('.hs-load', ov); if (l) l.innerHTML = I('info') + '<b>The 3D island could not start on this device.</b><button class="btn gold" data-act="close">Back</button>';
    });
  };

  function hud(m, youSeek) {
    return '<div class="hs-zone"></div><div class="hs-camzone"></div><div class="hs-stick"><i></i></div>' +
      '<div class="hs-hint"><span class="l">' + I('move') + ' Move</span><span class="r">' + I('rotate') + ' Drag to look around</span></div>' +
      '<div class="hs-top"><button class="btn small ghost" data-hs="leave">' + I('back') + ' Leave</button>' +
      (youSeek ? '' : '<div class="hs-score tx" title="Points for staying near the Seeker">' + I('star') + '<b>0</b><span></span></div>') +
      '<div class="hs-clock"><span class="hs-phase"></span><span class="hs-time"><b></b></span></div><div class="hs-pips"></div></div>' +
      '<div class="hs-role ' + (youSeek ? 'seek' : 'hide') + '">' + (youSeek ? I('swords') + ' Seeker' : I('star') + ' Hider · <span class="hs-look"></span>') + '</div>' +
      '<div class="hs-msg"></div>' +
      '<button class="hs-act ' + (youSeek ? 'attack' : 'disguise') + '" aria-label="' + (youSeek ? 'Attack' : 'Disguise') + '"><span class="hs-ring"></span>' + I(youSeek ? 'swords' : 'spark') + '<small></small></button>' +
      (youSeek ? '<div class="hs-veil"><span>The hiders are hiding</span><b></b><small>Counting with your eyes covered…</small></div>'
        : '<button class="hs-specbtn" aria-label="Spectate the other hiders">' + EYE + '<small>Spectate</small></button>' +
          '<div class="hs-specbar"><button class="hs-specnav" data-hs="spec-prev" aria-label="Previous hider">' + CHEV(false) + '</button><span class="hs-specwho"><small>Spectating</small><b></b><em></em></span><button class="hs-specnav" data-hs="spec-next" aria-label="Next hider">' + CHEV(true) + '</button><button class="btn small gold hs-specback" data-hs="spec-back">Return to my disguise</button></div>' +
          '<div class="hs-tray"></div>') +
      '<button class="btn small hs-skip" data-hs="skip">Skip to results</button>';
  }

  function results(sm, m) {
    const s = S.state, top = sm.topPoints > 0 ? sm.topPoints : -1;
    const row = (h) => '<tr class="' + (h.found ? 'got' : 'safe') + (h.id === 'you' ? ' me' : '') + (h.points === top ? ' top' : '') + '"><td><b>' + esc(h.name) + '</b></td><td>' + esc(h.look) + '</td><td>' + (h.left ? 'Left' : h.found ? 'Found at ' + fmt(h.at) : 'Survived') + '</td><td class="pts">' + h.points + '</td><td>' + h.morphs + '</td><td>' + h.moved + '</td></tr>';
    const head = sm.result === 'seeker' ? 'The Seeker found everyone' : 'The hiders win';
    const sk = sm.seeker;
    const mine = sm.youSeek ? '' : '<p class="hs-mypts">' + I('star') + ' You scored <b>' + sm.youPoints + '</b> point' + (sm.youPoints === 1 ? '' : 's') + ' for staying near the Seeker' + (sm.newBest ? ', a new best!' : sm.best ? ' (best: ' + sm.best + ').' : '.') + '</p>';
    const body = '<div class="vcard hs-res"><h1>' + (sm.youWon ? 'You win!' : 'Not this time') + '</h1><p>' + sm.found + ' of ' + sm.total + ' hiders found' + (sm.result === 'seeker' ? ' in ' + fmt(sm.time) : '') + '.</p>' + mine +
      '<div class="hs-sides"><section class="hs-side seek"><h3>' + I('swords') + ' Seeker · ' + esc(sm.youSeek ? 'You' : sk.name) + '</h3><div class="hs-stats"><span><b>' + sk.hits + '</b>found</span><span><b>' + sk.misses + '</b>scenery hit</span><span><b>' + sk.attacks + '</b>attacks</span><span><b>' + sk.accuracy + '%</b>accuracy</span></div></section>' +
      '<section class="hs-side hide"><h3>' + I('star') + ' Hiders</h3><table class="hs-tbl"><thead><tr><th>Player</th><th>Disguise</th><th>Result</th><th>Points</th><th>Changes</th><th>Moved</th></tr></thead><tbody>' + sm.hiders.map(row).join('') + '</tbody></table></section></div>' +
      '<p class="muted small-t">Points while hidden, by distance from the Seeker: ' + D.HIDESEEK.score.tiers.map((t) => t.pts + ' a second within ' + t.within + ' m').join(', ') + '. Games played: ' + s.hideseek.played + ' · won: ' + s.hideseek.won + '</p></div>';
    const ov = UI.modal(UI.sheet(head, body, '<button class="btn ghost" id="hs-out">Back to the menu</button><button class="btn gold" id="hs-again">New lobby</button>', 'wide hsresults'), { dismiss: false });
    $('.x', ov) && $('.x', ov).remove();
    $('#hs-out', ov).onclick = () => { UI.close(ov); UI.HS = null; UI.battleHub(); UI.pvpMenu($('#modal-root .overlay:last-child')); };
    $('#hs-again', ov).onclick = () => { UI.close(ov); UI.HS = null; UI.hideSeek(); };
  }
})(typeof window !== 'undefined' ? window : globalThis);
