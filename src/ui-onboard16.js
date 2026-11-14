/* Aminas — Phase 16A interface: the opening cinematic, the refined Entity dialogue panel, the avatar step, the
   Light/Dark starter choice, the prologue objective in the HUD, contextual asides, the first-battle coach and the
   dungeon introduction. Everything here runs only while the Phase 16A switch (A.Onboard16) is on; with it off every
   wrapped function behaves exactly as before.
   Rules: no reward, damage, cooldown or progression number is changed here. Steps and tips read real game state. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Art = A.Art, Au = A.Audio, UI = A.UI, O = A.Onboard16, PX = A.Pixel;
  if (!O || !UI) return;
  const { esc } = UI.h, I = Art.icon;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const st = () => S.state;
  const on = () => O.enabled();
  const calm = () => !!(UI.calm && UI.calm());
  const saver = () => !!(A.Perf && A.Perf.saver && A.Perf.saver());
  const nameOf = () => { const a = st() && st().avatar; return (a && a.name && a.name.trim()) || 'Kind Soul'; };
  const fill = (t) => String(t).replace(/\{name\}/g, nameOf());
  const L = (m, x) => [m, x];
  // a small, still Entity for callouts and notes (the full figure is for conversations)
  const mini = () => { const m = /src="([^"]*)"/.exec(Art.entity('n')); return '<span class="o16-mini" aria-hidden="true">' + (m && m[1] ? '<img src="' + m[1] + '" alt="">' : '') + '</span>'; };

  /* ================================================================ the words */
  // The Entity: dry, tired, reluctant, secretive, useful. It calls Aminas Kind Souls. It never names or explains what
  // it suspects about the player; it slips, then changes the subject. It never explains the starters' quarrel.
  const W16 = O.WORDS;
  // keep Entity lines short enough for one panel at iPhone landscape (tested)
  O.transcript = () => W16;

  /* ================================================================ sounds */
  const snd = (k) => { try { Au.play(k); } catch (e) {} };

  /* ================================================================ dialogue panel */
  // The refined Entity panel. Same contract as UI.script (lines [[mood|'*'|'you', text]], done, opts) so every story
  // beat in the game uses it while the switch is on. Typing pauses briefly at punctuation, so a hesitation reads as
  // one; the Entity's portrait reacts when its mood changes; Speed (slow / normal / fast, the existing setting), Auto
  // and Skip are always available; Space, Enter or a tap advances. Reduce Motion shows each line at once.
  const SPEEDS = ['slow', 'normal', 'fast'], SPEED_MS = { slow: 30, normal: 18, fast: 8 }, SPEED_T = { slow: 'Slow', normal: 'Normal', fast: 'Fast' };
  UI.o16Talk = function (lines, done, opts) {
    opts = opts || {};
    const box = document.createElement('div'); box.className = 'dlg v7 o16' + (opts.cls ? ' ' + opts.cls : '');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Conversation with the Entity');
    const s0 = st(), sp0 = (s0 && s0.settings.textSpeed) || 'normal';
    box.innerHTML = '<div class="dlg-ctl"><button class="btn small ghost o16-spd" aria-label="Text speed">' + I('hourglass') + '<span>' + SPEED_T[sp0] + '</span></button><button class="btn small ghost dlg-auto" aria-pressed="false">Auto</button><button class="btn small ghost dlg-skip">Skip</button></div>' +
      '<div class="dlg-ent o16-ent"></div><div class="o16-you" aria-hidden="true"><span class="av-head">' + (PX ? PX.avatar(s0 && s0.avatar && s0.avatar.look) : '') + '</span></div>' +
      '<div class="dlg-box panel o16-panel"><div class="o16-plate"><b class="dlg-name"></b></div><div class="dlg-text" aria-live="polite"></div><div class="o16-dots" aria-hidden="true"></div></div><div class="dlg-next" aria-hidden="true">▼</div>';
    $('#app').appendChild(box);
    const ent = $('.o16-ent', box), you = $('.o16-you', box), nm = $('.dlg-name', box), tx = $('.dlg-text', box), nx = $('.dlg-next', box), dots = $('.o16-dots', box);
    dots.innerHTML = lines.map(() => '<i></i>').join('');
    let i = -1, typing = false, tm = null, full = '', mood = null, auto = false, autoTm = null, finished = false, c = 0;
    const speed = () => SPEED_MS[(st() && st().settings.textSpeed) || 'normal'] || 18;
    const talk = (v) => { const e = $('.ent-vox', ent); if (e) e.classList.toggle('talk', v); };
    const keys = (e) => { if (!box.isConnected) return; if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); adv(); } else if (e.key === 'Escape') finish(); };
    const finish = () => {
      if (finished) return; finished = true; clearTimeout(tm); clearTimeout(autoTm); document.removeEventListener('keydown', keys);
      box.classList.add('out'); talk(false);
      setTimeout(() => { box.remove(); if (done) done(); }, calm() ? 0 : 280);
    };
    const scheduleAuto = () => { clearTimeout(autoTm); if (auto && !typing) autoTm = setTimeout(next, 900 + full.length * 22); };
    const stop = () => { typing = false; tx.textContent = full; nx.style.visibility = 'visible'; talk(false); scheduleAuto(); };
    // a short extra hold after punctuation, so "No. That isn’t quite right." reads as two thoughts
    const hold = (ch) => (/[.!?]/.test(ch) ? 7 : ch === '…' ? 9 : ch === '—' ? 6 : /[,;:]/.test(ch) ? 3 : 0);
    const step = () => {
      if (finished) return;
      c += auto ? 3 : 1; tx.textContent = full.slice(0, c);
      if (c >= full.length) return stop();
      if (!narr && c % 3 === 0) snd('o16type');
      const ch = full[c - 1], nxt = full[c];
      tm = setTimeout(step, speed() * (1 + (nxt === ' ' || nxt === undefined ? hold(ch) : 0)));
    };
    let narr = false;
    const next = () => {
      if (finished) return;
      i++;
      if (i >= lines.length) return finish();
      const ln = lines[i], who = ln[0];
      narr = who === '*'; const mine = who === 'you';
      const m = narr || mine ? mood || 'n' : who;
      if (m !== mood) {
        ent.innerHTML = Art.entity(m);
        if (mood && !calm()) { const e = $('.ent-vox', ent); if (e) { e.classList.add('react'); setTimeout(() => e.classList.remove('react'), 520); } }
        mood = m;
      }
      box.classList.toggle('narr', narr); box.classList.toggle('mine', mine);
      ent.classList.toggle('dim', narr || mine); tx.classList.toggle('stage', narr);
      nm.textContent = narr ? '' : mine ? nameOf() : opts.name || 'The Entity';
      $$('i', dots).forEach((d, k) => d.classList.toggle('on', k <= i));
      full = mine ? '“' + fill(ln[1]) + '”' : fill(ln[1]); tx.textContent = ''; typing = true; nx.style.visibility = 'hidden'; talk(!narr && !mine); c = 0;
      if (calm()) stop(); else step();
      if (!narr && !mine && /…$|—$/.test(full.trim())) snd('hum');
    };
    const adv = () => { if (finished) return; if (typing) { clearTimeout(tm); stop(); } else next(); };
    box.addEventListener('click', (e) => {
      if (e.target.closest('.dlg-skip')) return finish();
      if (e.target.closest('.dlg-auto')) { auto = !auto; const b = e.target.closest('.dlg-auto'); b.classList.toggle('on', auto); b.setAttribute('aria-pressed', String(auto)); if (auto && !typing) scheduleAuto(); return; }
      if (e.target.closest('.o16-spd')) { const s = st(); if (!s) return; const k = SPEEDS[(SPEEDS.indexOf(s.settings.textSpeed) + 1) % SPEEDS.length]; s.settings.textSpeed = k; S.save(); $('.o16-spd span', box).textContent = SPEED_T[k]; return; }
      adv();
    });
    document.addEventListener('keydown', keys);
    requestAnimationFrame(() => box.classList.add('in'));
    setTimeout(next, calm() ? 0 : 240);
    box._o16 = { finish, adv };
    return box;
  };
  // While the switch is on, every Entity conversation uses the refined panel (same arguments, same behaviour).
  const script7 = UI.script;
  UI.script = function (lines, done, opts) { return on() ? UI.o16Talk(lines, done, opts) : script7.apply(this, arguments); };

  /* ================================================================ title screen + new game */
  const showTitle0 = UI.showTitle;
  UI.showTitle = function () {
    showTitle0.apply(this, arguments);
    if (!D.DEV_TOOLS) return;
    const wrap = $('.title-wrap'); if (!wrap) return;
    const s = st(), resume = on() && O.kind(s) === 'interrupted' && O.resumeAt(s);
    if (resume && !$('[data-act="continue"]', wrap)) { const m = $('.menu', wrap); if (m) m.insertAdjacentHTML('afterbegin', '<button class="btn gold" data-act="o16Resume">Continue</button>'); const ng = $('[data-act="newgame"]', wrap); if (ng) ng.classList.remove('gold'); }
    const chip = document.createElement('button'); chip.className = 'o16-chip' + (on() ? ' on' : ''); chip.dataset.act = 'o16Toggle'; chip.setAttribute('aria-pressed', String(on()));
    chip.innerHTML = '<small>Developer preview</small><b>Phase 16A opening: ' + (on() ? 'On' : 'Off') + '</b>';
    wrap.appendChild(chip);
  };
  UI.act('o16Toggle', () => { O.set(!O.enabled()); UI.showTitle(); });
  UI.act('o16Resume', () => O.resumeFlow());
  const newgame0 = UI.act_newgame;
  UI.act_newgame = function () {
    if (!on()) return newgame0.apply(this, arguments);
    const s = S.newGame(); O.begin(s); s.phase = 'intro'; S.save();
    UI.avatarCreator({ first: true, done: () => { const o = O.rec(st()); if (o) o.at = 'cine'; S.save(); UI.o16Cinematic(); } });
  };
  // a new game that stopped before its starter was chosen picks up where it stopped
  O.resumeFlow = function () {
    const s = st(), at = O.resumeAt(s);
    if (at === 'avatar') UI.avatarCreator({ first: true, done: () => { const o = O.rec(st()); if (o) o.at = 'cine'; S.save(); UI.o16Cinematic(); } });
    else if (at === 'cine') UI.o16Cinematic();
    else if (at === 'starter') { UI.setScreen('o16intro'); UI.renderBackdropIsland(); UI.script(W16.resume, () => UI.o16Starters()); }
    else UI.showIsland(true);
  };

  /* ================================================================ avatar step */
  const avc0 = UI.avatarCreator;
  UI.avatarCreator = function (o) {
    const ov = avc0.apply(this, arguments);
    if (!on() || !o || !o.first || !ov) return ov;
    const sh = $('.avc', ov); if (!sh) return ov;
    sh.classList.add('o16');
    const head = $('.sh-head h2', sh); if (head) head.insertAdjacentHTML('beforebegin', '<span class="o16-stepn">1 of 2</span>');
    const body = $('.sh-body', sh);
    if (body) {
      if (head) head.insertAdjacentHTML('afterend', '<div class="o16-aside">' + mini() + '<p>Hold still. I like to know what I’m talking to.</p></div>');
      const note = $('.muted.small-t.center', body);
      const later = '<div class="o16-later">' + I('check') + '<span>Your name, look and outfit can all be changed later from your profile (your head, top left). Nothing else depends on them.</span></div>';
      if (note) note.outerHTML = later; else body.insertAdjacentHTML('beforeend', later);
    }
    return ov;
  };

  /* ================================================================ the opening cinematic */
  // Shots: the Resonance (a widening ring of colour) → fragments of other places drift past → the starter island →
  // a ring of light in the grass and the player in it → the Entity notices → the first conversation.
  // Built from the game's own art: the shards show real dungeon backdrops, the island is the real island view.
  // Skippable at every moment (Skip goes straight to the starter choice). Pauses while the app is hidden and carries
  // on when it returns. Reduce Motion: cross-fades only, nothing moves. Battery Saver: two shards instead of four, no
  // blur, no camera push. Nothing it shows can trap the player: Skip, and the timeline's own end, both always finish.
  UI.o16Cinematic = function (done) {
    const s = st(), o = O.rec(s) || O.begin(s);
    o.cine = Math.max(o.cine, 1); o.at = 'cine'; s.phase = 'arrival'; S.save();
    UI.setScreen('o16intro'); Au.setMode('dark');
    UI.renderBackdropIsland();
    const lite = saver(), still = calm();
    const SHARDS = lite ? ['heart', 'mural'] : ['heart', 'hall3', 'roadend', 'mural'];
    const pos = [[-30, -18, -9], [28, -24, 7], [-22, 20, 5], [26, 16, -6]];
    const cine = document.createElement('div'); cine.className = 'o16-cine' + (lite ? ' lite' : '') + (still ? ' still' : '');
    cine.setAttribute('role', 'region'); cine.setAttribute('aria-label', 'Opening');
    cine.innerHTML = '<div class="c-void"></div><div class="c-ring"><i></i><i></i></div>' +
      '<div class="c-shards">' + SHARDS.map((k, i) => '<div class="c-shard s' + i + '" style="--x:' + pos[i][0] + 'vw;--y:' + pos[i][1] + 'vh;--r:' + pos[i][2] + 'deg"><div class="c-shard-in">' + (Art.hasEnv && Art.hasEnv(k) ? Art.envBg(k) : '') + '</div></div>').join('') + '</div>' +
      '<p class="c-cap c0">' + esc(W16.captions[0]) + '</p><p class="c-cap c1">' + esc(W16.captions[1]) + '</p><div class="c-flash"></div>' +
      '<div class="c-mark"><i class="c-col"></i><i class="c-ring2"></i><span class="c-av av-head">' + (PX ? PX.avatar(s.avatar && s.avatar.look) : '') + '</span></div>' +
      '<div class="c-ent">' + Art.entity('s') + '</div>' +
      '<button class="btn small ghost c-skip" aria-label="Skip the introduction">Skip</button>';
    $('#app').appendChild(cine);
    const world = $('#world'); if (world && !still && !lite) world.classList.add('o16-hold');
    // the timeline: [time in ms, class to add]
    const CUES = [[60, 'p-ring', 'o16res'], [700, 'p-c0'], [1500, 'p-shards', 'o16shard'], [3400, 'p-c1'], [5000, 'p-crack', 'o16shard'], [5500, 'p-island'], [7300, 'p-arrive', 'o16land'], [8900, 'p-ent'], [10300, 'end']];
    let t0 = performance.now(), elapsed = 0, timers = [], finished = false;
    const fire = (cue) => {
      if (finished) return;
      if (cue[1] === 'end') return finish('seen');
      cine.classList.add(cue[1]); if (cue[2]) snd(cue[2]);
      if (cue[1] === 'p-island' && world) { world.classList.remove('o16-hold'); if (!still && !lite) world.classList.add('o16-push'); }
    };
    const schedule = () => { timers.forEach(clearTimeout); timers = []; t0 = performance.now(); CUES.forEach((c) => { if (c[0] >= elapsed) timers.push(setTimeout(() => fire(c), c[0] - elapsed)); }); };
    const vis = () => {
      if (finished) return;
      if (document.hidden) { elapsed += performance.now() - t0; timers.forEach(clearTimeout); timers = []; cine.classList.add('paused'); }
      else { cine.classList.remove('paused'); schedule(); }
    };
    function finish(how) {
      if (finished) return; finished = true;
      timers.forEach(clearTimeout); document.removeEventListener('visibilitychange', vis);
      const s2 = st(), o2 = O.rec(s2); if (o2) { o2.cine = 2; o2.met = true; o2.at = 'starter'; o2.cineHow = how; } S.save();
      cine.classList.add('out'); if (world) world.classList.remove('o16-hold');
      setTimeout(() => { cine.remove(); if (world) world.classList.remove('o16-push'); }, still ? 0 : 450);
      UI.o16CineOver = how;
      if (how === 'skipped') UI.o16Starters();
      else UI.script(W16.arrival, () => UI.o16Starters());
      if (done) done(how);
    }
    $('.c-skip', cine).addEventListener('click', (e) => { e.stopPropagation(); finish('skipped'); });
    document.addEventListener('visibilitychange', vis);
    UI.cleanups.push(() => { if (!finished) { finished = true; timers.forEach(clearTimeout); document.removeEventListener('visibilitychange', vis); cine.remove(); } });
    schedule();
    UI.o16Cine = { finish, cine, elapsed: () => elapsed + (document.hidden ? 0 : performance.now() - t0) };
    return cine;
  };

  /* ================================================================ the starter choice */
  // Both starters on one stage, using their real models (baked portraits of the 3D models; the chosen one comes alive
  // in the 3D viewer, or stays a portrait in the 2D fallback). What it says about them comes from the game's data:
  // element, personality, real moves, which real level-1 stats are higher, element matchups. Choosing asks once more,
  // then grants exactly one starter through the same rules as before.
  UI.o16Starters = function () {
    const s = st(); if (s.starter) { UI.showIsland(true); return; }
    UI.setScreen('o16starter'); Au.setMode('light');
    const o = O.rec(s); if (o) { o.at = 'starter'; S.save(); }
    const card = (id) => {
      const f = O.starterFacts(id), sp = D.SPECIES[id], E = D.ELEMENTS[f.el];
      const moves = f.moves.map((m) => '<li style="--ec:' + D.ELEMENTS[m.el].color + '">' + (Art.elIcon ? Art.elIcon(m.el) : '') + '<span>' + esc(m.name) + '</span>' + (m.cd ? '<em>special</em>' : m.type === 'heal' ? '<em>heals</em>' : m.type === 'guard' ? '<em>guards</em>' : '') + '</li>').join('');
      const strong = f.strong.map((x) => D.ELEMENTS[x].name).join(', '), weak = f.weakTo.map((x) => D.ELEMENTS[x].name).join(', ');
      return '<button class="o16-sc k-' + id + '" data-act="o16Pick" data-id="' + id + '" style="--ec:' + E.color + ';--ed:' + E.dark + '" aria-pressed="false">' +
        '<div class="o16-art art" id="o16-art-' + id + '">' + Art.portrait(id) + '</div>' +
        '<div class="o16-info"><div class="o16-nm"><b>' + esc(sp.name) + '</b>' + UI.h.chip(f.el) + '</div>' +
        '<p class="o16-pers">' + esc(sp.pers) + '</p>' +
        '<div class="o16-fight"><small>In battle</small><span>' + (f.more.length ? 'More ' + f.more.map((x) => x.toLowerCase()).join(' and ') + ' than the other' : 'Evenly matched') + '</span>' +
        (strong ? '<span>Strong against ' + esc(strong) + (weak ? ' · weak to ' + esc(weak) : '') + '</span>' : '') + '</div>' +
        '<ul class="o16-moves">' + moves + '</ul></div></button>';
    };
    $('#stage').innerHTML = '<div class="o16-start" id="o16-start"><div class="o16-split"><i class="lt"></i><i class="dk"></i></div>' +
      '<svg class="o16-mural" viewBox="0 0 120 80" aria-hidden="true"><g fill="currentColor"><circle cx="46" cy="36" r="9"/><path d="M38 47h16l3 22H35z"/><path d="M40 28l-4-9 8 6z"/><circle cx="74" cy="36" r="9"/><path d="M66 47h16l3 22H63z"/><path d="M78 26l6-8-2 10z"/></g><path d="M60 14v62" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" opacity=".6"/></svg>' +
      '<div class="o16-top"><span class="o16-stepn">2 of 2</span><span class="o16-ent-s">' + Art.entity('n') + '</span><p class="o16-line" id="o16-line" aria-live="polite"></p><button class="btn small ghost o16-more" data-act="o16Line" aria-label="Next line">' + I('arrow') + '</button></div>' +
      '<div class="o16-cards">' + card('lumifern') + card('umbrit') + '</div>' +
      '<div class="o16-foot"><span class="muted" id="o16-hint">Tap one to meet it properly.</span><button class="btn gold off" id="o16-go" data-act="o16Choose">Choose</button></div></div>';
    let li = 0, pick = null;
    const stageEl = $('#o16-start'); UI.cleanups.push(() => UI.disposeViews(stageEl));
    const line = (ln) => { const p = $('#o16-line'), e = $('.o16-ent-s'); if (!p) return; p.textContent = fill(ln[1]); if (e) e.innerHTML = Art.entity(ln[0]); p.classList.remove('in'); void p.offsetWidth; p.classList.add('in'); };
    line(W16.starterIntro[0]);
    UI.o16StarterState = () => ({ pick, line: li });
    UI.acts.o16Line = () => { li = Math.min(W16.starterIntro.length - 1, li + 1); line(W16.starterIntro[li]); if (li >= W16.starterIntro.length - 1) { const b = $('.o16-more'); if (b) b.hidden = true; } };
    UI.acts.o16Pick = (el) => {
      const id = el.dataset.id; if (pick === id) return; pick = id;
      $$('.o16-sc').forEach((c) => { const me = c.dataset.id === id; c.classList.toggle('sel', me); c.classList.toggle('away', !me); c.setAttribute('aria-pressed', String(me)); });
      const go = $('#o16-go'); go.classList.remove('off'); go.textContent = 'Choose ' + D.SPECIES[id].name;
      $('#o16-hint').textContent = 'You can look at both before you decide.';
      line(W16.starterAside[id]); snd(id === 'lumifern' ? 'o16pickL' : 'o16pickD');
      const host = $('#o16-art-' + id);
      if (host && stageEl) { UI.disposeViews(stageEl); UI.mountViewer(stageEl, host, id, { intro: 'victory' }); }
    };
    UI.acts.o16Choose = () => {
      if (!pick) return; const id = pick, sp = D.SPECIES[id];
      const ov = UI.modal(UI.sheet('Your companion', '<div class="o16-confirm"><div class="art">' + Art.portrait(id) + '</div><div><p><b>' + esc(sp.name) + '</b> will be your companion.</p><p class="muted">This choice is for good. The other one stays on the island; you will cross paths again.</p></div></div>',
        '<button class="btn ghost" data-act="close">Back</button><button class="btn gold" id="o16-yes">' + I('check') + 'Yes, ' + esc(sp.name) + '</button>', 'narrow o16'));
      $('#o16-yes', ov).onclick = () => {
        if (ov._done) return; ov._done = true;
        const r = O.chooseStarter(st(), id); UI.close(ov);
        if (!r.ok) { UI.showIsland(true); return; }
        R.drain(); S.save(); snd('discover');
        UI.showIsland(false); UI.sparkles($('.comp .art') || $('#app'), 20);
        setTimeout(() => UI.script(W16.starterChosen[id], () => UI.afterAction()), 400);
      };
    };
  };

  /* ================================================================ prologue objective in the HUD */
  const hud0 = UI.hudHtml;
  UI.hudHtml = function () {
    const h = hud0.apply(this, arguments), s = st();
    if (!on() || UI.bm) return h;
    const cur = O.current(s); if (!cur) return h;
    const tag = '<span class="o16-pro">Prologue · ' + cur.n + ' of ' + cur.of + '</span>';
    if (cur.quest) {
      // the existing quest, with its own Go and Claim; only the prologue count is added
      const q = A.Quests.get(cur.quest); if (!q) return h;
      const rdy = A.Quests.status(s, q) === 'ready', ob = A.Quests.nextObjective(s, q);
      const pill = '<button class="pill mission-pill o16p ' + (rdy ? 'ready' : '') + '" data-act="questGo" data-id="' + q.id + '">' + tag + '<span class="mt">' + esc(q.title) + '</span><span class="mo">' + (rdy ? 'Tap to claim your reward.' : esc(A.Quests.label(ob))) + '</span><span class="go">' + (rdy ? 'Claim' : 'Go') + ' ' + I('arrow') + '</span></button>';
      return swapPill(h, pill);
    }
    const pill = '<button class="pill mission-pill o16p" data-act="o16Go" data-step="' + cur.id + '">' + tag + '<span class="mt">' + esc(cur.label) + '</span><span class="mo">' + esc(cur.hint || '') + '</span><span class="go">Go ' + I('arrow') + '</span></button>';
    return swapPill(h, pill);
  };
  function swapPill(h, pill) {
    const re = /<button class="pill mission-pill[^"]*"[\s\S]*?<\/button>/;
    if (re.test(h)) return h.replace(re, pill);
    const i = h.indexOf('<div class="nav">'); return i < 0 ? h + pill : h.slice(0, i) + pill + h.slice(i);
  }
  UI.act('o16Go', (el) => {
    const s = st(), id = el.dataset.step;
    if (id === 'inspect') { UI.closeAll(); const a = R.active(s) || s.aminas[0]; if (a) UI.detail(a.sp, { uid: a.uid }); return; }
    if (id === 'battle') { UI.closeAll(); UI.guide = { hl: ['battle'], msg: 'Tap Battle, the triangle at the bottom.', t: Date.now() }; UI.renderGuide(); UI.applyHl(); return; }
    if (id === 'road' || id === 'win') { UI.go(A.Nav.resolve(s, { id: 'p', type: 'dungeon_clear', dungeon: 'forgottenroad', count: 1 })); return; }
    if (id === 'home' || id === 'next') { maybeHandoff(true); return; }
  });

  /* ================================================================ marks, asides and the handoff */
  const aside = (text, mood) => { UI.queue.push({ type: 'toast', text, mood: mood || 'n' }); UI.pump(); };
  const detail0 = UI.detail;
  UI.detail = function (spId, o) {
    const r = detail0.apply(this, arguments), s = st();
    if (on() && O.rec(s) && s.starter && s.aminas.some((a) => a.sp === spId) && O.mark(s, 'inspect')) { S.save(); aside(W16.inspect, 'w'); if (UI.screen === 'island') UI.renderHud(); }
    return r;
  };
  if (UI.acts.battle) { const b0 = UI.acts.battle; UI.acts.battle = function () { const r = b0.apply(this, arguments), s = st(); if (on() && O.active(s) && O.mark(s, 'battle')) { S.save(); aside(W16.battleMenu, 'n'); if (UI.renderHud) UI.renderHud(); } return r; }; }
  const dungeons0 = UI.dungeons;
  UI.dungeons = function () {
    const r = dungeons0.apply(this, arguments), s = st();
    if (on() && O.active(s) && O.tip(s, 'dungeons')) {
      O.mark(s, 'battle'); S.save(); const tr = $('#toast-root'); if (tr) tr.innerHTML = '';
      const rec = (D.DUNGEONS.forgottenroad && D.DUNGEONS.forgottenroad.recommended) || 4;
      // the Battle-menu line is superseded by this conversation: drop it if it is still waiting or showing
      UI.heldToasts = (UI.heldToasts || []).filter((x) => x.text !== W16.battleMenu); for (let i = UI.queue.length - 1; i >= 0; i--) if (UI.queue[i].text === W16.battleMenu) UI.queue.splice(i, 1);
      setTimeout(() => { const tr2 = $('#toast-root'); if (tr2) tr2.innerHTML = ''; UI.script(W16.dungeons.map((l) => [l[0], l[1].replace('{rec}', rec)]), () => {}); }, calm() ? 0 : 250);
    }
    return r;
  };
  const once = (k, text, mood) => { const s = st(); if (on() && O.rec(s) && s.starter && O.tip(s, k)) { S.save(); aside(text, mood); } };
  if (UI.hatchery) { const h0 = UI.hatchery; UI.hatchery = function () { const r = h0.apply(this, arguments); once('hatchery', W16.hatchery, 'n'); return r; }; }
  ['forge', 'forgePanel', 'openForge'].forEach((k) => { if (typeof UI[k] === 'function') { const f0 = UI[k]; UI[k] = function () { const r = f0.apply(this, arguments); once('forge', W16.forge, 't'); return r; }; } });
  // Back on the island after the first win: the Entity hands over to the ordinary task list, once.
  function maybeHandoff(force) {
    const s = st(); if (!on() || !O.active(s) || s.run) return;
    const list = O.steps(s), win = list.find((x) => x.id === 'win');
    if (!win || !win.done) return;
    if (O.mark(s, 'home')) S.save();
    const o = O.rec(s); if (o.seen.handoff && !force) return;
    if (UI.o16Handing) return; UI.o16Handing = true;
    UI.queue.push({ type: 'fn', fn: (done) => UI.script(W16.handoff, () => { UI.o16Handing = false; O.mark(st(), 'handoff'); O.update(st()); S.save(); UI.refresh(); done(); }) });
    UI.pump();
  }
  const showIsland0 = UI.showIsland;
  UI.showIsland = function () { const r = showIsland0.apply(this, arguments); if (on()) setTimeout(() => { if (UI.screen === 'island') maybeHandoff(false); }, calm() ? 0 : 600); return r; };
  const after0 = UI.afterAction;
  UI.afterAction = function () { const s = st(); if (on() && O.rec(s) && O.update(s)) S.save(); return after0.apply(this, arguments); };

  /* ================================================================ first-battle coach */
  // During the prologue's dungeon battles: one short callout at a time, each shown once, pointing at the part of the
  // battle screen it is about. It never blocks a button, disappears as soon as you act, and teaches only what the
  // battle already shows (moves, health, turn order, element hints, recharge, status). It changes nothing.
  const startBattle0 = UI.startBattle;
  UI.startBattle = function (ctx) {
    const r = startBattle0.apply(this, arguments), s = st(), U = UI.B;
    if (!on() || !U || !(O.active(s) || (O.rec(s) && !O.rec(s).done)) || U.ctx.kind !== 'dungeon') return r;
    let timer = 0, shown = null, lastTurn = -1, tipsThisTurn = 0;
    const bubble = $('#battle') && document.createElement('div');
    if (!bubble) return r;
    bubble.className = 'o16-coach'; bubble.hidden = true; bubble.setAttribute('role', 'status');
    $('#battle').appendChild(bubble);
    const hide = () => { if (shown) { const t = $(shown.sel); if (t) t.classList.remove('o16-focus'); } shown = null; bubble.hidden = true; };
    const place = (sel, text) => {
      const t = $(sel), bt = $('#battle'); if (!t || !bt) return false;
      const r1 = t.getBoundingClientRect(), br = bt.getBoundingClientRect(); if (!r1.width) return false;
      bubble.innerHTML = mini() + '<span class="o16-coach-t">' + esc(text) + '</span><button class="o16-coach-x" aria-label="Got it">' + I('check') + '</button>';
      bubble.hidden = false;
      const w = Math.min(260, br.width - 24); bubble.style.width = w + 'px';
      const above = r1.top - br.top > br.height * 0.45;
      bubble.style.left = Math.max(12, Math.min(br.width - w - 12, r1.left - br.left + r1.width / 2 - w / 2)) + 'px';
      if (above) { bubble.style.top = ''; bubble.style.bottom = (br.bottom - r1.top + 10) + 'px'; } else { bubble.style.bottom = ''; bubble.style.top = (r1.bottom - br.top + 10) + 'px'; }
      bubble.classList.toggle('up', !above); t.classList.add('o16-focus');
      return true;
    };
    bubble.addEventListener('click', (e) => { e.stopPropagation(); hide(); });
    const show = (k, sel, text) => { if (!O.tip(st(), k)) return false; if (!place(sel, text)) { delete O.rec(st()).tips[k]; return false; } shown = { k, sel }; tipsThisTurn++; S.save(); return true; };
    const tick = () => {
      const U2 = UI.B; if (!U2 || U2 !== U || !$('#battle')) return stop();
      const b = U2.b, mine = !U2.busy && !b.over && !b.pending;
      if (!mine) { if (shown) hide(); return; }
      if (b.turn !== lastTurn) { lastTurn = b.turn; tipsThisTurn = 0; }
      if (shown || tipsThisTurn) return;
      const enc = U2.enc || {}; const spec = enc.spec || {};
      if (spec.boss && show('boss', '#b-turn', W16.coach.boss)) return;
      if (show('moves', '#b-actions', W16.coach.moves)) return;
      const strong = $('#b-actions .abtn.ready .ab-hint.good'), weakH = $('#b-actions .abtn.ready .ab-hint.bad');
      if (strong || weakH) {
        const btn = (strong || weakH).closest('.abtn'), ab = D.ABILITIES[btn.dataset.id], en = b.enemy;
        const txt = (strong ? W16.coach.element : W16.coach.elementWeak).replace('{a}', D.ELEMENTS[ab.el].name).replace('{b}', D.ELEMENTS[en.el].name);
        if (show('element', '#b-actions .abtn[data-id="' + btn.dataset.id + '"]', txt)) return;
      }
      if (b.enemy.hp < b.enemy.hpMax && show('health', '#hb-e', W16.coach.health)) return;
      if (b.turn >= 3 && show('turn', '#b-turn', W16.coach.turn)) return;
      if ($('#b-actions .abtn.cool') && show('special', '#b-actions .abtn.cool', W16.coach.special)) return;
      if ($('#fs-p .stx, #fs-e .stx:not(.boss)') && show('status', $('#fs-p .stx') ? '#fs-p' : '#fs-e', W16.coach.status)) return;
    };
    function stop() { clearInterval(timer); timer = 0; hide(); }
    timer = setInterval(tick, 250);
    UI.cleanups.push(stop);
    U.o16Coach = { tick, hide, bubble };
    return r;
  };
  const victory0 = UI.victory;
  UI.victory = function (out) {
    const ov = victory0.apply(this, arguments), s = st();
    if (!on() || !ov || !O.rec(s) || O.rec(s).done) return ov;
    const notes = [];
    if (O.tip(s, 'win')) notes.push(W16.coach.win);
    if (out && out.sectionFirst && O.tip(s, 'section')) notes.push(W16.coach.section);
    if (notes.length) {
      S.save();
      const card = $('.vcard', ov) || $('.sh-body', ov), pips = card && $('.pips', card);
      if (pips) pips.insertAdjacentHTML('afterend', notes.map((n) => '<p class="v-tip o16-vtip">' + mini() + '<span>' + esc(n) + '</span></p>').join(''));
      else if (card) card.insertAdjacentHTML('afterbegin', notes.map((n) => '<p class="v-tip o16-vtip">' + mini() + '<span>' + esc(n) + '</span></p>').join(''));
    }
    return ov;
  };
})(typeof window !== 'undefined' ? window : globalThis);
