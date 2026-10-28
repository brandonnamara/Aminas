/* Aminas — story scene player. Plays a scene from A.Scenes (scenes.js): backdrop, the creature on stage, the
   Entity stepping in and out, typed dialogue with speaker names, player responses, Skip and Auto (fast-forward).
   Completion is recorded through A.Rules.sceneDone; a replay from the Journal records nothing. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Art = A.Art, Au = A.Audio, UI = A.UI;
  const { esc } = UI.h;
  const $ = (s, r) => (r || document).querySelector(s);
  const st = () => S.state;

  UI.playScene = function (id, done, opts) {
    opts = opts || {};
    const sc = A.Scenes.get(id);
    if (!sc) { if (done) done(); return null; }
    UI.busy = true;
    const box = document.createElement('div'); box.className = 'scene tone-' + (sc.tone || 'n'); box.dataset.scene = id;
    box.innerHTML = '<div class="sc-bg" id="sc-bg"></div><div class="sc-actor" id="sc-actor"></div><div class="sc-ent" id="sc-ent"></div>' +
      '<div class="sc-title"><small>' + (opts.replay ? 'REPLAY' : 'STORY') + '</small><b>' + esc(sc.title) + '</b></div>' +
      '<div class="sc-ctl"><button class="btn small ghost" id="sc-auto" aria-pressed="false">Auto</button><button class="btn small ghost" id="sc-skip">Skip</button></div>' +
      '<div class="sc-box panel"><div class="sc-name" id="sc-name"></div><div class="sc-text" id="sc-text"></div><div class="sc-choices" id="sc-choices"></div><div class="sc-next" id="sc-next">▼</div></div>';
    $('#app').appendChild(box);
    const bg = $('#sc-bg', box), actor = $('#sc-actor', box), ent = $('#sc-ent', box), nm = $('#sc-name', box), tx = $('#sc-text', box), ch = $('#sc-choices', box), nx = $('#sc-next', box);
    const speed = { fast: 8, normal: 18, slow: 30 }[st().settings.textSpeed] || 18;
    const calm = UI.calm && UI.calm();
    let i = -1, typing = false, tm = null, auto = false, autoTm = null, full = '', finished = false, curBg = null, waiting = false;
    const setBg = (k) => { if (!k || k === curBg) return; curBg = k; box.dataset.bg = k; const html = Art.hasEnv(k) ? Art.envBg(k) : Art.battleBg('', sc.dungeon); const n = document.createElement('div'); n.className = 'sc-layer'; n.innerHTML = html; bg.appendChild(n); requestAnimationFrame(() => n.classList.add('on')); setTimeout(() => { while (bg.children.length > 1) bg.firstChild.remove(); }, 700); };
    const setActor = (s) => { if (!s) return; actor.className = 'sc-actor on pose-' + (s.pose || 'idle'); if (actor.dataset.sp !== s.sp) { actor.dataset.sp = s.sp; actor.innerHTML = Art.portrait(s.sp); } };
    const setEnt = (m, how) => { if (how === 'in') ent.classList.add('on'); if (how === 'out') ent.classList.remove('on'); if (m && ent.dataset.m !== m) { ent.dataset.m = m; ent.innerHTML = Art.entity(m); } };
    const finish = (how) => {
      if (finished) return; finished = true; clearTimeout(tm); clearTimeout(autoTm);
      box.classList.add('out'); setTimeout(() => box.remove(), calm ? 0 : 350);
      if (!opts.replay) { R.sceneDone(st(), id, how); S.save(); R.drain(); }
      UI.busy = false;
      if (done) done(how);
    };
    const idx = (k) => sc.beats.findIndex((b) => b.id === k);
    const scheduleAuto = () => { clearTimeout(autoTm); if (auto && !typing && !waiting) autoTm = setTimeout(next, 900 + full.length * 22 + (sc.beats[i] && sc.beats[i].pause || 0)); };
    const show = (b) => {
      if (b.bg) setBg(b.bg);
      if (b.show) setActor(b.show);
      setEnt(b.who === 'entity' ? b.mood || 'n' : ent.dataset.m || 'n', b.entity);
      if (b.who === 'entity') ent.classList.add('on', 'talk'); else ent.classList.remove('talk');
      box.classList.toggle('narr', b.who === '*');
      ch.innerHTML = ''; waiting = false;
      if (b.choice) {
        nm.textContent = 'You'; tx.textContent = ''; nx.style.visibility = 'hidden'; waiting = true;
        ch.innerHTML = b.choice.map((c, k) => '<button class="btn small sc-choice" data-k="' + k + '">' + esc(c.text) + '</button>').join('');
        ch.querySelectorAll('.sc-choice').forEach((btn) => (btn.onclick = (e) => {
          e.stopPropagation(); const c = b.choice[+btn.dataset.k]; Au.play('tap');
          if (c.set) Object.assign(st().flags, c.set);
          ch.innerHTML = ''; waiting = false; full = c.text; tx.textContent = '“' + c.text + '”'; nx.style.visibility = 'visible';
          jumpTo = c.goto ? idx(c.goto) : null; scheduleAuto();
        }));
        return;
      }
      const cast = sc.cast && sc.cast[b.who];
      nm.textContent = b.who === '*' ? '' : b.who === 'entity' ? 'The Entity' : b.who === 'you' ? 'You' : cast ? cast.name : b.who;
      full = b.text || ''; tx.textContent = ''; typing = true; nx.style.visibility = 'hidden';
      let c = 0;
      const step = () => { c += auto ? 3 : 1; tx.textContent = full.slice(0, c); if (c < full.length) tm = setTimeout(step, speed); else { typing = false; nx.style.visibility = 'visible'; scheduleAuto(); } };
      if (calm) { tx.textContent = full; typing = false; nx.style.visibility = 'visible'; scheduleAuto(); } else step();
      if (b.who === 'entity' && /…$/.test(full)) Au.play('hum');
    };
    let jumpTo = null;
    const next = () => {
      if (finished || waiting) return;
      const b = sc.beats[i];
      i = jumpTo != null ? jumpTo : b && b.goto ? idx(b.goto) : i + 1; jumpTo = null;
      if (i < 0 || i >= sc.beats.length) return finish('seen');
      show(sc.beats[i]);
    };
    box.addEventListener('click', (e) => {
      if (e.target.closest('.sc-ctl') || e.target.closest('.sc-choice')) return;
      if (typing) { clearTimeout(tm); typing = false; tx.textContent = full; nx.style.visibility = 'visible'; scheduleAuto(); } else next();
    });
    $('#sc-skip', box).onclick = (e) => { e.stopPropagation(); finish('skipped'); };
    $('#sc-auto', box).onclick = (e) => { e.stopPropagation(); auto = !auto; e.currentTarget.classList.toggle('on', auto); e.currentTarget.setAttribute('aria-pressed', String(auto)); if (auto && !typing) scheduleAuto(); };
    setBg(sc.bg); setEnt('n');
    Au.play('hum');
    setTimeout(() => { box.classList.add('started'); next(); }, calm ? 0 : 1100);
    UI.sceneBox = box;
    return box;
  };

  /* ---------- the Journal: lore found so far, and story scenes to replay ---------- */
  UI.journal = function () {
    const s = st(), found = Object.keys(D.LORE).filter((k) => s.lore && s.lore[k]);
    const scenes = Object.keys(A.Scenes.list).filter((k) => s.story && s.story.scenes && s.story.scenes[k]);
    const body = '<div class="journal"><div><h3>' + Art.icon('scroll') + ' Notes</h3>' + (found.length ? found.map((k) => '<div class="jn"><b>' + esc(D.LORE[k].title) + '</b><p>' + esc(D.LORE[k].text) + '</p></div>').join('') : '<p class="muted">Nothing yet. Dungeons, and the ruins on the island, leave things behind for people who look.</p>') +
      '<p class="muted small-t">' + found.length + ' of ' + Object.keys(D.LORE).length + ' found.</p></div>' +
      '<div><h3>' + Art.icon('book') + ' Story</h3>' + (scenes.length ? scenes.map((k) => '<button class="btn small" data-act="replayScene" data-id="' + k + '">' + Art.icon('arrow') + esc(A.Scenes.list[k].title) + '</button>').join('') : '<p class="muted">Story scenes you have seen can be replayed here.</p>') + '</div></div>';
    return UI.modal(UI.sheet('Journal', body, '<button class="btn gold" data-act="close">Close</button>', 'wide'));
  };
  UI.act('journal', () => UI.journal());
  UI.act('replayScene', (el) => { UI.closeAll(); UI.playScene(el.dataset.id, () => UI.journal(), { replay: true }); });
})(typeof window !== 'undefined' ? window : globalThis);
