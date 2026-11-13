/* Aminas — UI part 2: dungeons (island campaign), the battle screen (shared by every mode), hatchery. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Art = A.Art, T = A.Story, Au = A.Audio, UI = A.UI;
  const { esc, pct, chip, artBox, silBox } = UI.h, I = Art.icon;
  const $ = (s, r) => (r || document).querySelector(s);
  const st = () => S.state;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = R.Battle;
  const rwInline = (r) => ['gold', 'food', 'gems'].filter((k) => r && r[k]).map((k) => '<span>' + I(k === 'gems' ? 'gem' : k) + r[k].toLocaleString('en-GB') + '</span>').join('');
  UI.rwInline = rwInline;
  const STATE_TAG = { locked: ['sealed', 'Locked', 'lock'], available: ['play', 'Available', 'arrow'], inprogress: ['prog', 'In progress', 'swords'], completed: ['done', 'Completed', 'check'] };
  const stateTag = (k) => '<span class="tagp ' + STATE_TAG[k][0] + '">' + I(STATE_TAG[k][2]) + ' ' + STATE_TAG[k][1] + '</span>';
  UI.stateTag = stateTag;

  /* ---------- dungeons: island → its ten dungeons → one dungeon's ten battles ---------- */
  // UI.dungeons(ovEx, focusId): the island's dungeon list with the chosen (or current) dungeon open on the right.
  UI.dungeons = function (ovEx, focusId) {
    const s = st();
    let iid = UI.dIsland && D.CAMPAIGN[UI.dIsland] && D.CAMPAIGN[UI.dIsland].dungeons.length ? UI.dIsland : 'starter';
    if (focusId && D.DUNGEONS[focusId]) iid = D.DUNGEONS[focusId].island;
    const c = D.CAMPAIGN[iid], prog = R.islandProgress(s, iid);
    const sel = focusId || UI.dSel && D.DUNGEONS[UI.dSel] && D.DUNGEONS[UI.dSel].island === iid && UI.dSel || (s.run && D.DUNGEONS[s.run.d].island === iid && s.run.d) || prog.current || c.dungeons[c.dungeons.length - 1];
    UI.dIsland = iid; UI.dSel = sel;
    const isles = D.ISLAND_ORDER.filter((i) => D.CAMPAIGN[i].dungeons.length && A.World.islandUnlocked(s, i));
    const list = c.dungeons.map((id) => {
      const d = D.DUNGEONS[id], k = R.dungeonState(s, id), rec = R.dungeonRec(s, id), done = k === 'completed' ? 10 : rec.next;
      return '<button class="dl-row ' + k + (id === sel ? ' sel' : '') + (d.battles[9].islandBoss ? ' isboss' : '') + '" data-act="dSel" data-id="' + id + '" data-hl="dungeon:' + id + '"><span class="dl-n">' + (k === 'completed' ? I('check') : k === 'locked' ? I('lock') : d.index) + '</span><span class="dl-t"><b>' + esc(d.name) + '</b><small>' +
        (k === 'locked' ? esc(R.dungeonLockText(s, id)) : (d.battles[9].islandBoss ? 'Island Boss · ' : '') + 'Battle ' + Math.min(10, done + (k === 'completed' ? 0 : 1)) + ' of 10' + (k === 'completed' ? ' · cleared ' + rec.clears + '×' : '')) + '</small></span><span class="dl-bar"><i style="width:' + done * 10 + '%"></i></span></button>';
    }).join('');
    const body = '<div class="dg"><div class="dg-side"><div class="dg-isle">' + (isles.length > 1 ? isles.map((i) => '<button class="chipbtn ' + (i === iid ? 'on' : '') + '" data-act="dIsle" data-id="' + i + '">' + esc(D.ISLANDS[i].short) + '</button>').join('') : '<b>' + esc(D.ISLANDS[iid].name) + '</b>') +
      '<span class="muted">' + prog.cleared + ' / ' + prog.total + ' dungeons · ' + prog.battles + ' / ' + prog.battlesTotal + ' battles</span></div><div class="dl">' + list + '</div></div><div class="dg-main" id="dg-main">' + dungeonDetail(s, sel) + '</div></div>';
    const html = UI.sheet(I('gate') + ' Dungeons · ' + esc(D.ISLANDS[iid].name), body, '<span class="muted" style="margin-right:auto;font-size:.76rem">Ten battles per dungeon, the tenth is the boss. Your progress is kept: a defeat sends you back to the battle you lost, never further.</span><button class="btn ghost" data-act="journal">' + I('scroll') + ' Journal</button><button class="btn gold" data-act="close">Close</button>', 'wide dsheet');
    const ov = ovEx && ovEx.parentNode ? ((ovEx.innerHTML = html), ovEx) : UI.modal(html);
    UI.applyHl(); const r = $('.dl-row.sel', ov); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' });
    return ov;
  };
  function dungeonDetail(s, id) {
    const d = D.DUNGEONS[id], k = R.dungeonState(s, id), rec = R.dungeonRec(s, id), run = s.run && s.run.d === id ? s.run : null;
    const at = run ? run.battle : k === 'completed' ? -1 : rec.next, boss = d.battles[9], mv = boss.move && D.ABILITIES[boss.move], mech = boss.mech && D.BOSS_MECHS[boss.mech.type];
    const nodes = d.battles.map((x, i) => {
      const seen = s.seen && s.seen[x.sp], beat = k === 'completed' || i < at, here = i === at && k !== 'locked';
      return '<div class="bn' + (x.boss ? ' boss' : '') + (x.islandBoss ? ' island' : '') + (beat ? ' beat' : '') + (here ? ' here' : '') + '" data-hl="stage:' + id + ':' + R.sectionOf(d, i) + '" title="' + esc((seen ? x.title || D.SPECIES[x.sp].name : 'Unknown') + ' · Lv ' + x.lv) + '"><span class="bn-i">' + (seen ? Art.portrait(x.sp) : '<span class="sil">' + Art.portrait(x.sp) + '</span>') + '</span><small>' + (x.boss ? (x.islandBoss ? 'ISLAND BOSS' : 'BOSS') : i + 1) + '</small></div>';
    }).join('');
    const secs = d.sections.map((sc, i) => '<span class="sec ' + (rec.floors[i] ? 'claimed' : '') + '">' + (rec.floors[i] ? I('check') : I('star')) + esc(sc.name) + (rec.floors[i] ? '' : ' <em>' + rwInline(sc.first) + '</em>') + '</span>').join('');
    let actions;
    if (k === 'locked') actions = '<div class="lockmsg">' + I('lock') + ' ' + esc(R.dungeonLockText(s, id)) + '</div><button class="btn ghost" data-act="dWhy" data-id="' + id + '">' + I('arrow') + ' Show me</button>';
    else if (run) actions = '<button class="btn gold" data-act="resumeRun" data-id="' + id + '" data-hl="enter:' + id + '">' + I('swords') + ' Continue · battle ' + (run.battle + 1) + '</button><button class="btn small ghost" data-act="dropRun">Leave the dungeon</button>';
    else if (s.run) actions = '<div class="lockmsg">You are partway through ' + esc(D.DUNGEONS[s.run.d].name) + '. Continue or leave it first.</div><button class="btn" data-act="dSel" data-id="' + s.run.d + '">Go to it</button>';
    else if (k === 'completed') actions = '<button class="btn gold" data-act="enterDungeon" data-id="' + id + '" data-from="0" data-hl="enter:' + id + '">' + I('swords') + ' Replay from battle 1</button><button class="btn small" data-act="enterDungeon" data-id="' + id + '" data-from="9">Fight the boss again</button>';
    else actions = '<button class="btn gold" data-act="enterDungeon" data-id="' + id + '" data-hl="enter:' + id + '">' + I('swords') + ' ' + (at > 0 ? 'Continue · battle ' + (at + 1) : 'Enter · battle 1') + '</button>';
    return '<div class="dd ' + k + ' d-' + id + '"><div class="dd-art">' + (Art.hasEnv(d.battles[Math.max(0, Math.min(9, at))].env || d.env) ? Art.envBg(d.battles[Math.max(0, Math.min(9, at))].env || d.env) : Art.battleBg('', id)) + '<span class="dd-num">' + (boss.islandBoss ? 'ISLAND BOSS · ' : '') + 'DUNGEON ' + d.index + '</span></div>' +
      '<div class="dd-b"><h3>' + esc(d.name) + ' ' + chip(d.el) + ' ' + stateTag(k) + '</h3><div class="dd-a">' + actions + '</div><p>' + esc(d.theme) + '</p><p class="muted small-t"><b>Recommended level</b> ' + d.recommended + ' · <b>Rewards</b> ' + esc(d.rewardText) + '</p>' +
      '<div class="bpath">' + nodes + '</div><div class="secs">' + secs + '</div>' +
      (mv || mech ? '<div class="dn-move' + (boss.islandBoss ? ' prism-t' : '') + '">' + I('warn') + ' ' + esc(boss.title) + (mech ? ': <b>' + esc(mech.name) + '</b> (' + esc(mech.desc) + ')' : '') + (mv ? (mech ? ' and ' : ': ') + '<b>' + esc(mv.name) + '</b>' : '') + '</div>' : '') +
      '</div></div>';
  }
  UI.act('dungeons', () => { UI.closeAll(); UI.dungeons(); });
  UI.act('dSel', (el) => { UI.dSel = el.dataset.id; UI.dungeons(el.closest('.overlay'), el.dataset.id); });
  UI.act('dIsle', (el) => { UI.dIsland = el.dataset.id; UI.dSel = null; UI.dungeons(el.closest('.overlay')); });
  UI.act('dWhy', (el) => { const s = st(), id = el.dataset.id, bl = R.dungeonBlocker(s, id); if (!bl) return; if (bl.dungeon) { UI.dungeons(el.closest('.overlay'), bl.dungeon); return; } UI.go(A.Nav.resolve(s, { id: 'p', type: 'dungeon_clear', dungeon: id })); });
  UI.act('dropRun', (el) => UI.confirm('Leave the dungeon?', 'Your progress is kept: next time you start at the same battle. Health resets when you come back.', 'Leave', () => { R.abandonRun(st()); S.save(); UI.dungeons(el.closest('.overlay')); }));
  UI.act('resumeRun', (el) => { UI.close(el.closest('.overlay')); UI.nextEncounter(); });
  UI.act('enterDungeon', (el) => { const id = el.dataset.id, from = +(el.dataset.from || 0); UI.pickTeam({ size: 3, title: 'Choose your party · ' + D.DUNGEONS[id].name, dungeon: id, go: 'Enter the dungeon', onGo: (sel) => { const r = R.startRun(st(), id, sel, { from }); if (!r.ok) return false; S.save(); UI.closeAll(); UI.nextEncounter(); return true; } }); });

  /* ---------- team picker (dungeons, survival, PvP roster, defence teams) ---------- */
  // o: {size, exact?, title, go, initial?, dungeon?, note?, onGo(sel) -> true closes}
  UI.pickTeam = function (o) {
    const s = st(); const ok = (u) => R.inst(s, u);
    let sel = (o.initial && o.initial.filter(ok).length ? o.initial.filter(ok) : (s.party && s.party.filter(ok).length ? s.party.filter(ok) : R.defaultParty(s))).slice(0, o.size);
    if (o.size > 3) s.aminas.slice().sort((a, b) => b.lv - a.lv).forEach((a) => { if (sel.length < o.size && sel.indexOf(a.uid) < 0) sel.push(a.uid); });
    const d = o.dungeon && D.DUNGEONS[o.dungeon];
    const ov = UI.modal('<div></div>');
    const draw = () => {
      const list = s.aminas.slice().sort((a, b) => b.lv - a.lv);
      const slots = [...Array(o.size)].map((_, i) => { const a = R.inst(s, sel[i]); return '<div class="slot">' + (a ? artBox(a.sp) + '<b>' + esc(D.SPECIES[a.sp].name) + '</b>Lv ' + a.lv : '<span class="muted">Empty</span>') + '</div>'; }).join('');
      const avg = sel.length ? Math.round(sel.reduce((m, u) => m + R.inst(s, u).lv, 0) / sel.length) : 0;
      let info = '';
      if (d) {
        const foeEls = [], counters = [];
        d.battles.forEach((x) => { const e = D.SPECIES[x.sp].el; if (foeEls.indexOf(e) < 0) foeEls.push(e); });
        Object.keys(D.ELEMENTS).forEach((e) => { if (foeEls.some((f) => R.elMult(e, f) > 1.01) && counters.indexOf(e) < 0) counters.push(e); });
        const names = (a) => a.map((e) => D.ELEMENTS[e].name).join(', ').replace(/, ([^,]*)$/, ' and $1');
        info = 'Recommended level ' + d.recommended + '. Your party average: <b class="' + (avg >= d.recommended ? 'good' : 'bad') + '">' + (avg || '–') + '</b>.<br>Foes here are ' + names(foeEls) + ' types.' + (counters.length ? ' ' + names(counters) + (counters.length === 1 ? ' hits' : ' hit') + ' hard.' : '');
      } else info = o.note || '';
      const need = o.exact ? o.size : 1;
      const syn = R.synergies(sel.map((u) => D.SPECIES[R.inst(s, u).sp].el));
      const synHtml = o.size <= 3 ? '<div class="pp-syn">' + (syn.length ? syn.map((k) => '<div>' + UI.synChips([k]) + ' <span class="muted">' + esc(D.SYNERGIES[k].desc) + '</span></div>').join('') : '<span class="muted">No team synergy yet. Pair two of one element (Kindred), bring Light with Dark (Twilight Pact), or Fire, Water and Nature together (Elemental Triangle).</span>') + '</div>' : '';
      ov.innerHTML = UI.sheet(esc(o.title),
        '<div class="party-row' + (o.size > 3 ? ' many' : '') + '">' + slots + '<div class="muted" style="font-size:.8rem;align-self:center">Pick ' + (o.exact ? 'exactly ' : 'up to ') + o.size + '. ' + (o.size <= 3 ? 'The first one fights first. ' : 'They fight in this order. ') + info + '</div></div>' + synHtml + '<div class="grid">' +
        list.map((a) => { const sp = D.SPECIES[a.sp], on = sel.indexOf(a.uid); return '<div class="card ' + (on >= 0 ? 'sel' : '') + '" data-pp="' + a.uid + '">' + artBox(a.sp) + (on >= 0 ? '<span class="cnt">#' + (on + 1) + '</span>' : '') + '<div class="nm">' + esc(sp.name) + '</div><div>' + chip(sp.el) + '</div><div class="lvl">Lv ' + a.lv + '</div></div>'; }).join('') + '</div>',
        '<button class="btn ghost" data-act="close">Back</button><button class="btn gold ' + (sel.length >= need ? '' : 'off') + '" id="pp-go">' + esc(o.go) + '</button>', 'wide');
      ov.querySelectorAll('[data-pp]').forEach((c) => (c.onclick = () => { Au.play('tap'); const u = +c.dataset.pp, i = sel.indexOf(u); if (i >= 0) sel.splice(i, 1); else if (sel.length < o.size) sel.push(u); draw(); }));
      const go = $('#pp-go', ov); if (go) go.onclick = () => { if (sel.length < need) { Au.play('no'); UI.toast(o.exact ? 'Choose ' + o.size + ' Aminas.' : 'Choose at least one Amina.', 't'); return; } if (o.onGo(sel.slice()) !== false && ov.parentNode && o.keepOpen !== true) UI.close(ov); };
    };
    draw();
    return ov;
  };
  UI.partyPicker = (id) => UI.act && UI.acts.enterDungeon({ dataset: { id }, closest: () => null });

  /* ---------- encounter card (before each dungeon battle): where you are, and what the place shows ---------- */
  UI.nextEncounter = function () {
    const s = st(), enc = R.encounter(s);
    if (!enc) { UI.showIsland(); return; }
    const d = D.DUNGEONS[enc.dungeon], spec = enc.spec, sp = D.SPECIES[spec.sp], boss = !!spec.boss, envKey = spec.env || d.env;
    const pips = d.battles.map((x, i) => '<i class="' + (i < enc.battle ? 'on' : i === enc.battle ? 'here' : '') + (x.boss ? ' b' : '') + '"></i>').join('');
    const ov = UI.modal('<div class="sheet panel narrow vcard enc' + (spec.islandBoss ? ' prism-card' : boss ? ' boss-card' : '') + '" style="padding:0"><div class="enc-art">' + (Art.hasEnv(envKey) ? Art.envBg(envKey, { boss }) : Art.battleBg(boss ? 'boss' : '', enc.dungeon)) +
      '<div class="enc-por' + (spec.islandBoss ? ' prism' : '') + '" style="--sc:' + (spec.scale || 1) + '">' + Art.portrait(spec.sp) + '</div></div><div style="padding:.6rem .9rem .9rem">' +
      '<div class="muted enc-where">' + esc(d.name.toUpperCase()) + ' · ' + esc(enc.sectionName.toUpperCase()) + '</div><div class="pips">' + pips + '</div>' +
      '<h1 style="font-size:1.35rem">' + (spec.islandBoss ? 'The Island Boss' : boss ? 'The guardian of ' + esc(d.name.replace(/^The /, 'the ')) : 'Battle ' + (enc.battle + 1) + ' of ' + enc.battles) + '</h1>' +
      (spec.clue ? '<p class="clue">' + esc(spec.clue) + '</p>' : '') +
      '<h2>' + esc(spec.title || sp.name) + ' · Lv ' + spec.lv + '</h2><div>' + chip(spec.mech && spec.mech.type === 'prism' ? spec.mech.els[0] : sp.el) + (spec.mech ? ' <span class="tagp prog">' + esc(D.BOSS_MECHS[spec.mech.type].name) + '</span>' : '') + '</div>' +
      '<p class="muted" style="font-size:.78rem;margin:.35rem 0">' + (spec.mech ? esc(D.BOSS_MECHS[spec.mech.type].desc) : 'Strong against ' + (D.STRONG[sp.el].map((x) => D.ELEMENTS[x].name).join(', ') || 'nothing') + '.') + '</p>' +
      '<div class="row-actions" style="justify-content:center"><button class="btn ghost" id="enc-retreat">Leave</button><button class="btn gold" id="enc-go">' + I('swords') + ' Fight</button></div></div></div>', { dismiss: false });
    $('#enc-go', ov).onclick = () => { UI.close(ov); UI.startBattle(); };
    $('#enc-retreat', ov).onclick = () => UI.confirm('Leave the dungeon?', 'Your progress is kept: next time you start at battle ' + (enc.battle + 1) + '.', 'Leave', () => { UI.close(ov); R.abandonRun(st()); S.save(); UI.showIsland(); });
  };

  /* ---------- battle ---------- */
  function syncDisp() {
    const b = UI.B.b, p = B.cur(b), e = b.enemy;
    UI.B.disp = { pName: p.name, pSp: p.sp, pLv: p.lv, pHp: p.hp, pMax: p.hpMax, pEl: p.el, eName: e.name, eSp: e.sp, eLv: e.lv, eHp: e.hp, eMax: e.hpMax, eEl: e.el,
      pSt: Object.assign({}, p.st), eSt: Object.assign({}, e.st), charging: !!e.charging, eShield: e.shield || 0, eShieldMax: e.shieldMax || 0,
      pWeak: p.weak || 0, eWeak: e.weak || 0, pGuard: !!p.guard, eGuard: !!e.guard };
  }
  const hpCls = (a, m) => (a / m < 0.25 ? 'low' : a / m < 0.5 ? 'mid' : '');

  /* ---------- battle stage ----------
     The rules engine produces a list of events; the stage turns them into motion. Two stages share one interface:
     the live 3D stage (src/3d/runtime.js: arena, animated creatures, particles) and the 2D stage (portrait sprites
     and CSS), which is also the fallback whenever WebGL or the 3D module is unavailable or 3D is switched off.
     playEvents() owns the timing, so a battle takes the same time on either stage. */
  function stage2d() {
    const spr = (w) => $('#spr-' + w);
    return {
      is3d: false,
      anchor(w) { const e = spr(w); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.2 }; },
      use(w, kind, info) { cls(w, kind === 'attack' ? 'lunge-' + w : 'cast', 450); if (kind === 'attack' && info && info.el) setTimeout(() => streak2d(w, info.el, !!(info.special || info.boss)), 200); },
      hit(w, el, eff) { burstAt(w, el); cls(w, eff === 'super' ? 'hurt big' : 'hurt', 450); },
      heal(w) { cls(w, 'healed', 700); }, guard(w) { cls(w, 'guarding', 600); }, victory(w) { const e = spr(w); if (e) e.classList.add('cheer'); },
      // Phase 7: the same turn cues as the 3D arena (an outline glow and a ground ring for the active Amina, a reticle on the target)
      focus(f) { f = f || {}; ['p', 'e'].forEach((x) => { const e = spr(x); if (!e) return; e.classList.toggle('is-active', f.active === x); e.classList.toggle('is-turn', f.active === x && f.mode === 'turn'); e.classList.toggle('is-target', f.target === x); }); },
      preview(kind) { const e = spr('e'), p = spr('p'); if (e) e.classList.toggle('is-aim', kind === 'foe'); if (p) p.classList.toggle('is-aim', kind === 'self'); },
      status(w, color) { const e = spr(w); if (e) { e.style.setProperty('--fx', color); cls(w, 'fxflash', 520); } },
      faint(w) { const e = spr(w); if (e) e.classList.add('faint'); },
      swap(w, sp) { const e = spr(w); if (e) { e.classList.remove('faint'); e.innerHTML = Art.portrait(sp); cls(w, 'in', 500); } return Promise.resolve(); },
      setTelegraph(on) { const e = spr('e'); if (e) e.classList.toggle('charging', !!on); },
      setBarrier(on) { const e = spr('e'); if (e) e.classList.toggle('barrier', !!on); },
      setElement() {},
      dispose() {},
    };
  }
  // Wraps the 3D controller so a failure inside it never interrupts a battle (it falls back to 2D on the spot).
  function guard3d(s3, U) {
    const out = {};
    Object.keys(s3).forEach((k) => {
      if (typeof s3[k] !== 'function') { out[k] = s3[k]; return; }
      out[k] = function () { try { return s3[k].apply(s3, arguments); } catch (err) { if (root.console) console.warn('3D stage error, switching to 2D:', err && err.message); fallback2d(U); return null; } };
    });
    ['setBarrier', 'setElement', 'focus', 'preview', 'debug'].forEach((k) => { if (!out[k]) out[k] = () => {}; });
    return out;
  }
  function fallback2d(U) {
    if (!U.stage || !U.stage.is3d) return; const s3 = U.stage; U.stage = stage2d();
    try { s3.dispose(); } catch (e) { /* already gone */ }
    const bt = $('#battle'); if (bt) bt.classList.remove('is3d');
    const pe = $('#spr-p'), ee = $('#spr-e'); if (pe) pe.innerHTML = Art.portrait(U.disp.pSp); if (ee) ee.innerHTML = Art.portrait(U.disp.eSp);
  }
  // Starts on the 2D stage; upgrades to 3D when the module and models are ready (at most 4s, while the
  // battle is still in its opening beat). A late 3D stage is discarded rather than swapped in mid-fight.
  function mountStage(U) {
    U.stage = stage2d();
    if (!A.C3D || !A.C3D.enabled()) return Promise.resolve(false);
    const host = $('#b-3d'), b = U.b; let settled = false;
    const go = A.C3D.load()
      .then((mod) => (mod && !U.dead && UI.B === U ? mod.createBattle(host, { dungeon: U.d, player: B.cur(b).sp, enemy: b.enemy.sp, boss: !!b.enemy.boss, scale: b.enemy.scale || null, prismatic: !!b.enemy.islandBoss }) : null))
      .then((s3) => {
        if (!s3) return false;
        if (settled || U.dead || UI.B !== U || !$('#battle')) { s3.dispose(); return false; }
        U.stage = guard3d(s3, U); $('#battle').classList.add('is3d'); if (U.disp.charging) U.stage.setTelegraph(true);
        return true;
      })
      .catch((e) => { if (root.console) console.warn('3D battle stage unavailable, using 2D:', e && e.message); return false; });
    return Promise.race([go, sleep(4000)]).then((r) => { settled = true; return r; });
  }
  function endStage(U) { if (!U) return; U.dead = true; if (U.stage) { try { U.stage.dispose(); } catch (e) { /* ignore */ } } U.stage = null; }
  UI.endBattleStage = () => endStage(UI.B);

  const synChips = (syn) => (syn || []).map((k) => '<span class="syn" title="' + esc(D.SYNERGIES[k].desc) + '">' + I('spark') + esc(D.SYNERGIES[k].name) + '</span>').join('');
  UI.synChips = synChips;
  // A dungeon battle (the default) or any other mode: ctx = {kind, b, d (arena), env, label, intro, finish(U), retreat}
  // Phase 14 finalisation: the boss card. Who it is, where, and the one thing to know about how it fights (the same
  // words as its trait in the battle), plus how far into the dungeon this is.
  function bossCard(e0, isl, ctx) {
    const sp = D.SPECIES[e0.sp] || {}, el = D.ELEMENTS[sp.el] || {}, where = ctx && ctx.d && D.DUNGEONS[ctx.d] ? D.DUNGEONS[ctx.d].name : '';
    const spec = ctx && ctx.enc && ctx.enc.spec, mech = spec && spec.mech && D.BOSS_MECHS[spec.mech.type];
    const trait = mech ? mech.name + ': ' + mech.desc : COND.guardian.desc; // the game's own words for it
    return '<div class="b-bossin' + (isl ? ' isle' : '') + '" role="status" aria-live="polite" style="--ec:' + (el.color || '#ffd978') + '"><small>' + (isl ? 'The Island Boss' : 'Guardian' + (where ? ' of ' + esc(where) : '')) + '</small><b>' + esc(e0.name) + '</b>' +
      '<span class="bb-el">' + (Art.elIcon ? Art.elIcon(sp.el) : '') + esc(el.name || '') + (ctx && ctx.enc && ctx.enc.battles ? ' · Battle ' + (ctx.enc.battle + 1) + ' of ' + ctx.enc.battles : '') + '</span><em>' + trait + '</em><i class="bb-tap">Tap to begin</i></div>';
  }
  UI.startBattle = function (ctx) {
    const s = st();
    if (!ctx) {
      const enc = R.encounter(s); if (!enc) { UI.showIsland(); return; }
      const d = D.DUNGEONS[enc.dungeon];
      ctx = { kind: 'dungeon', b: R.createBattle(s), d: enc.dungeon, env: enc.spec.env || d.env, enc,
        label: d.name.replace(/^The /, '') + ' · ' + (enc.battle + 1) + '/' + enc.battles,
        retreat: { title: 'Leave the dungeon?', text: 'Your progress is kept: next time you start at battle ' + (enc.battle + 1) + '.', yes: 'Leave', fn: () => { R.abandonRun(st()); S.save(); } },
        finish: dungeonFinish };
    }
    UI.setScreen('battle');
    Au.setMode('battle');
    const b = ctx.b, e0 = b.enemy;
    const U = (UI.B = { b, busy: true, log: '', over: false, enc: ctx.enc || { spec: { boss: !!e0.boss } }, d: ctx.d || 'reliquary', stage: null, ctx, hp: {}, html: {}, acting: null, chosen: null });
    syncDisp();
    const boss = !!e0.boss, isl = !!e0.islandBoss, envBg = ctx.env && Art.hasEnv(ctx.env) ? Art.envBg(ctx.env, { boss }) : '';
    // Phase 6: each fighter panel is a fixed skeleton; its health bar element lives for the whole battle so damage and
    // healing can animate (see setBar). Only the text parts are re-rendered.
    const fp = (w) => '<div class="b-panel fp fp-' + w + (w === 'p' ? ' pp' : '') + '" id="pan-' + w + '"><div class="fp-head" id="fh-' + w + '"></div>' +
      (w === 'e' ? '<div class="hpb shieldb" id="sb-' + w + '" hidden><i class="hpb-ghost"></i><i class="hpb-fill"></i></div>' : '') +
      '<div class="hpb" id="hb-' + w + '" role="meter" aria-label="Health"><i class="hpb-ghost"></i><i class="hpb-fill"></i><i class="hpb-ticks"></i></div><div class="fp-foot" id="ff-' + w + '"></div><div class="sts" id="fs-' + w + '"></div></div>';
    $('#stage').innerHTML = '<div class="battle d-' + U.d + (boss ? ' boss' : '') + (isl ? ' islandboss' : '') + (b.foes.length > 1 ? ' team' : '') + (b.party.length > 3 ? ' many' : '') + '" id="battle">' + (envBg || Art.battleBg(boss ? 'boss' : '', U.d)) + '<div class="b-3d" id="b-3d"></div>' +
      '<div class="b-field" id="b-field"><div class="b-spr e in' + (isl ? ' prism' : '') + '" id="spr-e" style="--sc:' + (e0.scale || 1) + '"></div><div class="b-spr p in" id="spr-p"></div></div>' +
      '<div class="b-top">' + fp('e') + '<div class="b-topr" style="display:flex;gap:.5rem;align-items:center;pointer-events:auto"><span class="pill b-label" style="font-size:.78rem">' + esc(ctx.label || '') + '</span>' + (ctx.retreat ? '<button class="round" data-act="bRetreat" aria-label="Leave the battle">' + I('close') + '</button>' : '') + '</div></div>' +
      '<div class="b-turn" id="b-turn" role="status" aria-live="polite"><span class="bt-n"></span><span class="bt-w"></span><span class="bt-f"></span></div>' +
      '<div class="b-tele" id="b-tele" hidden role="status" aria-live="polite"></div>' +
      '<div class="b-log" id="b-log" aria-live="polite"></div>' + fp('p') + '<div class="b-party" id="b-party"></div><div class="b-actions" id="b-actions"></div>' +
      '<div class="b-tip" id="b-tip" hidden role="tooltip"></div>' + (calmNow() ? '' : '<div class="b-wipe' + (isl ? ' isle' : boss ? ' boss' : '') + '" aria-hidden="true"><i></i><i></i><i></i></div>') +
      (boss ? bossCard(e0, isl, ctx) : ctx.kind === 'dungeon' && !calmNow() ? '<div class="b-entry" aria-hidden="true"><small>' + esc(D.DUNGEONS[ctx.d].name) + '</small><b>Battle ' + (ctx.enc.battle + 1) + ' of ' + ctx.enc.battles + '</b></div>' : '') + '</div>';
    $('#spr-e').innerHTML = Art.portrait(e0.sp); $('#spr-p').innerHTML = Art.portrait(B.cur(b).sp);
    UI.cleanups.push(() => endStage(U));
    const wipe = $('.b-wipe'); if (wipe) setTimeout(() => wipe.remove(), 900);
    const ent = $('.b-entry'); if (ent) setTimeout(() => ent.remove(), 1100);
    // Phase 14 finalisation: the boss introduction (card, camera and the boss's own move) ends by itself in about two
    // seconds, or at the first tap; the battle itself starts exactly as before
    const bin = $('.b-bossin'); let introOver = null;
    if (bin) { const catcher = document.createElement('button'); catcher.className = 'b-skip'; catcher.setAttribute('aria-label', 'Skip the introduction'); $('#battle').appendChild(catcher);
      introOver = () => { if (!bin.isConnected) return; bin.classList.add('out'); catcher.remove(); setTimeout(() => bin.remove(), 260); if (U.stage && U.stage.skipIntro) U.stage.skipIntro(); };
      catcher.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); introOver(); });
      setTimeout(introOver, calmNow() ? 1600 : 2200); U.introOver = introOver; }
    bLog(ctx.intro || (e0.name !== D.SPECIES[e0.sp].name ? (/^The /.test(e0.name) ? '' : 'The ') + e0.name + (b.foes.length > 1 ? ' leads the other team!' : ' rises!') : 'A wild ' + e0.name + ' appears!'));
    bRender();
    Promise.all([mountStage(U), sleep(700)]).then(() => { if (UI.B !== U || U.dead) return; U.busy = false; bRender(); if (isl) setTele({ t: 'intro' }); if (boss && bin && bin.isConnected && U.stage && U.stage.intro) U.stage.intro(); });
  };
  function bLog(t) { const l = $('#b-log'); if (l) { l.textContent = t; l.classList.toggle('empty', !t); } }

  /* ---------- Phase 6 combat presentation ---------- */
  const calmNow = () => !!(UI.calm && UI.calm()) || document.body.classList.contains('perf-saver');
  const elIco = (el) => (Art.elIcon ? Art.elIcon(el) : '');
  const elVars = (el) => { const E = D.ELEMENTS[el] || D.ELEMENTS.light; return '--ec:' + E.color + ';--ed:' + E.dark; };
  // Every condition a fighter can carry, in one table: buffs help, debuffs hurt, specials are boss traits.
  const COND = {
    burn: { kind: 'debuff' }, stun: { kind: 'debuff' }, soak: { kind: 'debuff' }, silence: { kind: 'debuff' }, regen: { kind: 'buff' },
    weak: { kind: 'debuff', icon: 'weak', name: 'Attack down', short: 'ATK', color: '#ff8a7a', desc: 'Attack lowered by 20% for each stack, up to three stacks. It lasts for the rest of this battle.' },
    guard: { kind: 'buff', icon: 'shield', name: 'Guarding', short: 'Guard', color: '#8fd0ff', desc: 'Braced: the next hit it takes is mostly blocked.' },
    guardian: { kind: 'boss', icon: 'crown', name: 'Guardian', short: 'Guardian', color: '#ffd86b', desc: 'Telegraphs a powerful move one turn ahead and cannot be stunned, except while it is charging.' },
    islandboss: { kind: 'boss isle', icon: 'boss', name: 'Island Boss', short: 'Island Boss', color: '#ff9ee0', desc: 'Shifts its element every few turns and telegraphs a powerful move. Read its colour and guard the big one.' },
  };
  const condInfo = (k) => { const s = D.STATUS[k], c = COND[k] || {}; return { name: c.name || (s && s.name) || k, short: c.short || (s && s.short) || k, color: c.color || (s && s.color) || '#fff', desc: c.desc || (s && s.desc) || '', icon: c.icon || k, kind: c.kind || 'debuff' }; };
  function chipsFor(stMap, weak, guard, extra) {
    const list = Object.keys(stMap || {}).filter((k) => D.STATUS[k] && stMap[k] > 0).map((k) => [k, k === 'stun' ? 0 : stMap[k]]);
    if (weak > 0) list.push(['weak', weak]); if (guard) list.push(['guard', 0]);
    (extra || []).forEach((k) => list.unshift([k, 0]));
    return list.map(([k, n]) => { const c = condInfo(k); const turns = k === 'weak' ? '×' + n : n;
      return '<button class="stx ' + c.kind + '" data-act="bStx" data-k="' + k + '" data-n="' + n + '" style="--c:' + c.color + '" aria-label="' + esc(c.name + (n && k !== 'weak' ? ', ' + n + ' turn' + (n > 1 ? 's' : '') + ' left' : '') + '. ' + c.desc) + '">' + I(c.icon) + '<span>' + esc(c.short) + '</span>' + (n ? '<em>' + turns + '</em>' : '') + '</button>'; }).join('');
  }
  const fxNote = (ab) => { const f = ab.fx; if (!f || f.self) return f && f.k === 'regen' ? 'Regen' : ''; return D.STATUS[f.k].short + (f.p < 1 ? ' ' + Math.round(f.p * 100) + '%' : ''); };
  // Health bars: the fill moves at once; a pale "lost health" band holds for a moment and then drains after it, so
  // the size of a hit stays readable. Healing shows a bright band first and the fill grows into it.
  function setBar(el, key, frac) {
    const U = UI.B; if (!el || !U) return; frac = Math.max(0, Math.min(1, frac));
    const f = el.querySelector('.hpb-fill'), g = el.querySelector('.hpb-ghost'), prev = U.hp[key];
    U.hp[key] = frac; el.setAttribute('aria-valuenow', Math.round(frac * 100));
    const set = (n, v) => { n.style.transform = 'scaleX(' + v.toFixed(4) + ')'; };
    if (el.dataset.k !== key || prev == null || Math.abs(prev - frac) < 1e-4 || calmNow()) { el.dataset.k = key; el.classList.remove('dmg', 'heal'); set(f, frac); set(g, frac); return; }
    clearTimeout(el._t); el.classList.remove('dmg', 'heal'); void el.offsetWidth;
    if (frac < prev) { el.classList.add('dmg'); set(f, frac); set(g, frac); }
    else { el.classList.add('heal'); set(g, frac); set(f, frac); }
    el._t = setTimeout(() => el.classList.remove('dmg', 'heal'), 1100);
  }
  const lvl = (frac) => (frac <= 0 ? 'ko' : frac < 0.25 ? 'low' : frac < 0.5 ? 'mid' : 'ok');
  function putHtml(id, html) { const U = UI.B, el = $('#' + id); if (!el || U.html[id] === html) return el; U.html[id] = html; el.innerHTML = html; return el; }
  function panel(w) {
    const U = UI.B, b = U.b, d = U.disp, e = w === 'e', pan = $('#pan-' + w); if (!pan) return;
    const name = e ? d.eName : d.pName, el = e ? d.eEl : d.pEl, lv = e ? d.eLv : d.pLv, hp = Math.max(0, e ? d.eHp : d.pHp), max = e ? d.eMax : d.pMax, frac = hp / max;
    pan.setAttribute('style', elVars(el));
    putHtml('fh-' + w, '<span class="fp-el" title="' + esc(D.ELEMENTS[el].name) + '">' + elIco(el) + '</span><b class="fp-nm">' + esc(name) + '</b><span class="fp-lv">Lv ' + lv + '</span>');
    if (e) {
      const sb = $('#sb-e'); sb.hidden = !(d.eShield > 0); if (d.eShield > 0) setBar(sb, 'sh' + b.ei, d.eShield / Math.max(1, d.eShieldMax));
    }
    const hb = $('#hb-' + w); hb.className = 'hpb ' + lvl(frac); setBar(hb, w + (e ? b.ei : b.pi), frac);
    const foot = '<span class="hpn"><b>' + hp + '</b> / ' + max + '</span>' + (frac > 0 && frac < 0.25 ? '<span class="crit-t">' + I('warn') + 'Critical</span>' : '') +
      (e && b.foes.length > 1 ? '<span class="foedots" aria-label="' + B.foesLeft(b) + ' foes left">' + b.foes.map((f, i) => '<i class="' + (f.hp <= 0 ? 'ko' : i === b.ei ? 'cur' : '') + '"></i>').join('') + '</span>' : '');
    putHtml('ff-' + w, foot);
    const extra = e ? (b.enemy.islandBoss ? ['islandboss'] : b.enemy.boss ? ['guardian'] : []) : [];
    const sts = chipsFor(e ? d.eSt : d.pSt, e ? d.eWeak : d.pWeak, e ? d.eGuard : d.pGuard, extra) + (e ? '' : synChips(b.syn));
    putHtml('fs-' + w, sts);
    pan.classList.toggle('crit', frac > 0 && frac < 0.25); pan.classList.toggle('acting', U.acting === w);
    pan.classList.toggle('mine', w === 'p' && !U.busy && !b.over && !b.pending);
  }
  function turnBadge() {
    const U = UI.B, b = U.b, t = $('#b-turn'); if (!t) return;
    const mine = !U.busy && !b.over && !b.pending;
    t.className = 'b-turn ' + (b.over ? 'done' : b.pending ? 'pick' : mine ? 'mine' : U.acting === 'e' ? 'foe' : U.acting === 'p' ? 'ally' : 'wait');
    t.querySelector('.bt-n').textContent = 'Turn ' + b.turn;
    // turn order is the game's own rule (the faster Amina acts first; a switch always comes first); shown, never changed
    const first = B.speed(B.cur(b)) >= B.speed(b.enemy), tf = t.querySelector('.bt-f');
    tf.textContent = mine ? (first ? 'You act first' : 'Foe acts first') : ''; tf.className = 'bt-f ' + (first ? 'first' : 'second');
    t.querySelector('.bt-w').textContent = b.over ? (b.result === 'win' ? 'Victory' : 'Defeat') : b.pending ? 'Choose an Amina' : mine ? 'Your move' : U.acting === 'e' ? U.disp.eName + ' acts' : U.acting === 'p' ? U.disp.pName + ' acts' : '…';
  }
  function abilityBtn(a, off, d, en, mvl) {
    const ab = D.ABILITIES[a.id], mlv = mvl[a.id] || 1, U = UI.B;
    const pw = ab.power ? (D.MOVE_LEVELS && mlv > 1 ? Math.round(ab.power * D.MOVE_LEVELS.power[mlv]) : ab.power) : 0;
    const eff = ab.type === 'dmg' || ab.type === 'drain' || ab.type === 'weaken' ? (ab.neutral ? 1 : R.elMult(ab.el, en.el)) : 1;
    const kind = ab.type === 'heal' ? 'heal' : ab.type === 'guard' ? 'guard' : 'atk';
    const hint = d.charging && ab.type === 'guard' ? '<span class="ab-hint good">▲ Blocks the charge</span>' : d.eShield > 0 && ab.cd > 0 && ab.power ? '<span class="ab-hint good">▲ Cracks barrier</span>' : eff > 1.01 ? '<span class="ab-hint good">▲ Strong</span>' : eff < 0.99 ? '<span class="ab-hint bad">▼ Weak</span>' : '';
    const sug = a.ready && ((d.charging && ab.type === 'guard') || (d.eShield > 0 && ab.cd > 0 && ab.power));
    const chosen = U.chosen === a.id, fx = fxNote(ab);
    const what = kind === 'atk' ? 'Pow ' + pw : kind === 'heal' ? 'Heal · self' : 'Guard · self';
    const cost = a.silenced ? '<span class="ab-cd hush" aria-label="Silenced">' + I('silence') + '</span>'
      : a.cd ? '<span class="ab-cd" aria-label="Ready in ' + a.cd + ' turn' + (a.cd > 1 ? 's' : '') + '">' + I('hourglass') + '<b>' + a.cd + '</b><i>turn' + (a.cd > 1 ? 's' : '') + '</i></span>' : '';
    // a special move's cost is its recharge: shown in words on the move itself
    const every = ab.cd > 0 ? '<span class="ab-sp" title="Special move: after use it recharges for ' + ab.cd + ' turn' + (ab.cd > 1 ? 's' : '') + '">Special · every ' + (ab.cd + 1) + '</span>' : '';
    const state = chosen ? ' chosen' + (U.fired === a.id && Date.now() < U.firedUntil ? ' fire' : '') : off || !a.ready ? ' off' : ' ready';
    return '<button class="abtn k-' + kind + state + (a.cd && !a.silenced ? ' cool' : '') + (a.silenced ? ' hushed' : '') + (ab.cd > 0 ? ' special' : '') + (sug ? ' suggest' : '') + '" style="' + elVars(ab.el) + '" data-act="bAbility" data-id="' + a.id + '"' + (off || !a.ready ? ' aria-disabled="true"' : '') + '>' +
      '<span class="ab-gem">' + elIco(ab.el) + '</span><span class="ab-main"><b>' + esc(ab.name) + (mlv > 1 ? '<span class="mlv">Lv' + mlv + '</span>' : '') + '</b><small><span class="ab-pow">' + what + '</span>' + every + (fx ? '<span class="ab-fx">' + esc(fx) + '</span>' : '') + hint + '</small></span>' + cost + '</button>';
  }
  function bRender() {
    const U = UI.B; if (!U || !$('#battle')) return;
    const b = U.b, d = U.disp, en = b.enemy;
    panel('e'); panel('p'); turnBadge(); syncArena();
    $('#b-party').innerHTML = b.party.map((f, i) => '<button class="pm ' + (i === b.pi && !b.pending ? 'cur' : '') + (f.hp <= 0 ? ' ko' : '') + (b.pending && f.hp > 0 ? ' tapme' : '') + (f.hp > 0 && f.hp / f.hpMax < 0.25 ? ' low' : '') + '" style="' + elVars(f.el) + '" data-act="bSwitch" data-i="' + i + '" aria-label="' + esc(f.name) + ', ' + Math.max(0, f.hp) + ' of ' + f.hpMax + ' health' + (i === b.pi ? ', in battle' : '') + '"><div class="art">' + Art.portrait(f.sp) + '</div><span class="pm-n">' + esc(f.name.slice(0, 8)) + '</span><div class="bar hp ' + hpCls(f.hp, f.hpMax) + '"><i style="width:' + pct(f.hp, f.hpMax) + '%"></i></div></button>').join('');
    const off = U.busy || b.over;
    if (b.pending) putHtml('b-actions', '<div class="b-pick" style="grid-column:span 2">' + I('swap') + ' Choose your next Amina</div>');
    else {
      const cf = B.cur(b), mvl = (cf && cf.mvl) || {};
      const pSts = Object.keys(d.pSt || {}).some((k) => d.pSt[k] > 0);
      // only rebuilt when something on the buttons changed, so the activation flash is never cut short
      putHtml('b-actions', B.legal(b).map((a) => abilityBtn(a, off, d, en, mvl)).join('') +
        '<button class="abtn swap ' + (off || B.alive(b) < 2 ? 'off' : '') + '" data-act="bSwapOpen" style="grid-column:span 2"><span class="ab-main"><b>' + I('swap') + ' Switch Amina</b><small>Uses your turn' + (pSts ? ' · clears status effects' : '') + '</small></span></button>');
    }
  }
  UI.bRender = bRender;
  // Phase 7: the arena follows the interface. Your move → your Amina is active (ring, outline, battle-ready move) and
  // the foe is targeted; while a move resolves → whoever is acting is active and the other is targeted. The same
  // state lights the panels, so the interface and the arena always point at the same creatures.
  function syncArena() {
    const U = UI.B; if (!U) return; const b = U.b;
    // the rules resolve a whole turn at once and the interface plays it back, so while it plays back the arena follows
    // the playback (who is acting now), never the final state
    let f = null;
    if (U.busy) { if (U.acting) f = { active: U.acting, target: U.acting === 'p' ? 'e' : 'p', mode: 'act' }; }
    else if (b.over || b.pending) f = {};
    else f = { active: 'p', target: 'e', mode: 'turn' };
    if (!f) return;
    U.focus = f;
    ['p', 'e'].forEach((w) => { const pan = $('#pan-' + w); if (pan) pan.classList.toggle('targeted', f.target === w && f.mode === 'act'); });
    if (U.stage && U.stage.focus) U.stage.focus(f);
  }
  // pressing a move previews what it aims at: the foe for attacks, yourself for heals and guards
  const previewOf = (btn) => { const ab = btn && D.ABILITIES[btn.dataset.id]; return !ab ? null : ab.type === 'heal' || ab.type === 'guard' ? 'self' : 'foe'; };
  const setPreview = (k) => { const U = UI.B; if (U && U.stage && U.stage.preview) U.stage.preview(k); };
  document.addEventListener('pointerdown', (e) => { const btn = e.target.closest && e.target.closest('#b-actions .abtn.ready'); if (btn) setPreview(previewOf(btn)); }, true);
  document.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse') return; const btn = e.target.closest && e.target.closest('#b-actions .abtn.ready'); setPreview(btn ? previewOf(btn) : null); }, true);
  ['pointerup', 'pointercancel'].forEach((t) => document.addEventListener(t, () => setTimeout(() => setPreview(null), 320), true));
  function floatAt(side, text, kind, tag) {
    const fld = $('#b-field'), U = UI.B, a = U && U.stage && U.stage.anchor(side); if (!fld || !a) return;
    const f = fld.getBoundingClientRect();
    const d = document.createElement('div'); d.className = 'float ' + kind + ' s-' + side;
    d.innerHTML = '<b>' + esc(text) + '</b>' + (tag ? '<small>' + esc(tag) + '</small>' : '');
    d.style.cssText = 'left:' + (a.x - f.left) + 'px;top:' + (a.y - f.top - (U.stage.is3d ? 24 : 0)) + 'px';
    fld.appendChild(d); setTimeout(() => d.remove(), 1200);
  }
  // tap a status chip: a small explanation next to it
  UI.act('bStx', (el) => {
    const t = $('#b-tip'), bt = $('#battle'); if (!t || !bt) return; const c = condInfo(el.dataset.k), n = +el.dataset.n;
    t.innerHTML = '<b style="color:' + c.color + '">' + I(c.icon) + esc(c.name) + '</b><span>' + esc(c.desc) + '</span>' + (n && el.dataset.k !== 'weak' ? '<em>' + n + ' turn' + (n > 1 ? 's' : '') + ' left</em>' : el.dataset.k === 'stun' ? '<em>Loses its next action</em>' : '');
    t.className = 'b-tip ' + c.kind; t.hidden = false;
    const r = el.getBoundingClientRect(), br = bt.getBoundingClientRect(), w = Math.min(240, br.width - 16);
    t.style.width = w + 'px'; t.style.left = Math.max(8, Math.min(br.width - w - 8, r.left - br.left)) + 'px';
    const below = r.top - br.top < br.height / 2; t.style.top = below ? (r.bottom - br.top + 6) + 'px' : ''; t.style.bottom = below ? '' : (br.bottom - r.top + 6) + 'px';
    clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, 3400);
  });
  function burstAt(side, el) {
    const spr = $('#spr-' + side), fld = $('#b-field'); if (!spr || !fld) return;
    const r = spr.getBoundingClientRect(), f = fld.getBoundingClientRect(), c = D.ELEMENTS[el].color;
    const d = document.createElement('div'); d.className = 'fxburst';
    d.style.cssText = 'left:' + (r.left - f.left + r.width / 2 - 56) + 'px;top:' + (r.top - f.top + r.height / 2 - 56) + 'px;background:radial-gradient(circle,#fff 0%,' + c + ' 40%,transparent 70%)';
    fld.appendChild(d); setTimeout(() => d.remove(), 600);
  }
  // Phase 7 (2D stage): a short element-coloured streak from attacker to target
  function streak2d(from, el, big) {
    const fld = $('#b-field'), a = $('#spr-' + from), b = $('#spr-' + (from === 'p' ? 'e' : 'p')); if (!fld || !a || !b || UI.calm()) return;
    const f = fld.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x0 = ra.left + ra.width / 2 - f.left, y0 = ra.top + ra.height * 0.45 - f.top, x1 = rb.left + rb.width / 2 - f.left, y1 = rb.top + rb.height * 0.45 - f.top;
    const d = document.createElement('i'); d.className = 'streak2d' + (big ? ' big' : ''); const E = D.ELEMENTS[el] || D.ELEMENTS.light;
    d.style.cssText = 'left:' + x0 + 'px;top:' + y0 + 'px;--dx:' + (x1 - x0) + 'px;--dy:' + (y1 - y0) + 'px;--c:' + E.color;
    fld.appendChild(d); setTimeout(() => d.remove(), 420);
  }
  // c may hold several classes ('hurt big'); classList methods need them one by one (a space throws and froze the 2D battle)
  function cls(side, c, ms) { const e = $('#spr-' + side); if (!e) return; const cs = String(c).split(/\s+/).filter(Boolean); e.classList.remove(...cs); void e.offsetWidth; e.classList.add(...cs); setTimeout(() => e.classList.remove(...cs), ms || 500); }
  // Telegraph banner: what is coming and what the player can do about it, worked out from the real party.
  function setTele(ev) {
    const t = $('#b-tele'), U = UI.B; if (!t || !U) return;
    if (!ev) { t.hidden = true; t.innerHTML = ''; t.className = 'b-tele'; if (U.stage) U.stage.setTelegraph(false); U.disp.charging = false; return; }
    const b = U.b, alive = b.party.filter((f) => f.hp > 0);
    const show = (cl, title, tip) => { t.className = 'b-tele ' + cl; t.innerHTML = '<b>' + I('warn') + ' ' + esc(title) + '</b><span>' + esc(tip) + '</span>'; t.hidden = false; };
    if (ev.t === 'intro') { show('prism', 'Island Boss: ' + b.enemy.name, 'Its element shifts every few turns and it charges Prismfall. Read the colour, change your approach, and guard the big one.'); return; }
    if (ev.t === 'barrierTell') { const sp = alive.some((f) => f.abil.some((a) => D.ABILITIES[a].cd > 0 && D.ABILITIES[a].power)); show('barrier', ev.name + ' will raise a Stone Barrier', sp ? 'It soaks damage. Special abilities (the ones with a cooldown) crack it twice as fast.' : 'It soaks damage until it breaks. Keep hitting.'); return; }
    if (ev.t === 'prismWarn') { const good = Object.keys(D.ELEMENTS).filter((x) => R.elMult(x, ev.el) > 1.01); show('prism', 'Its colours drift towards ' + D.ELEMENTS[ev.el].name, 'Next turn it becomes ' + D.ELEMENTS[ev.el].name + '.' + (good.length ? ' ' + good.map((x) => D.ELEMENTS[x].name).join(' and ') + ' will hit it hard.' : '')); return; }
    const mv = D.ABILITIES[ev.move];
    const canGuard = alive.some((f) => f.abil.some((a) => D.ABILITIES[a].type === 'guard'));
    const canStun = alive.some((f) => f.abil.some((a) => D.ABILITIES[a].fx && D.ABILITIES[a].fx.k === 'stun'));
    const resist = mv.neutral ? [] : Object.keys(D.ELEMENTS).filter((x) => R.elMult(mv.el, x) < 0.99);
    const tips = [];
    if (canGuard) tips.push('Guard to block most of it');
    if (resist.length) tips.push('switch to a ' + resist.map((x) => D.ELEMENTS[x].name).join(' or ') + ' Amina to resist it');
    if (canStun) tips.push('a stun breaks the charge');
    if (!tips.length) tips.push(mv.neutral ? 'It cannot be resisted: heal up or strike first' : 'Heal up or strike hard now');
    show('', mv.name + ' next turn', tips.join('; ').replace(/^./, (c) => c.toUpperCase()) + '.');
    if (U.stage) U.stage.setTelegraph(true); U.disp.charging = true;
  }
  const nameOf = (who) => (who === 'p' ? UI.B.disp.pName : UI.B.disp.eName);
  const STATUS_LOG = {
    burn: (n) => n + ' is burning!', stun: (n) => n + ' is stunned!', soak: (n) => n + ' is soaked and slows down!',
    regen: (n) => n + ' glows with new growth.', silence: (n) => n + ' is silenced: no special abilities next turn!',
  };

  async function playEvents(ev) {
    const U = UI.B, d = U.disp;
    const stSet = (who) => (who === 'p' ? d.pSt : d.eSt);
    const spOf = (who) => (who === 'p' ? d.pSp : d.eSp);
    for (const e of ev) {
      if (!$('#battle') || UI.B !== U) return;
      const stg = U.stage || stage2d();
      switch (e.t) {
        case 'use': {
          const ty = D.ABILITIES[e.abil].type;
          bLog(e.name + ' used ' + e.abName + '!');
          U.acting = e.who; bRender();
          const ab = D.ABILITIES[e.abil];
          stg.use(e.who, ty === 'guard' || ty === 'heal' ? 'cast' : 'attack', { el: e.el, type: ty, special: ab.cd > 0, boss: !!e.boss, power: ab.power || 0, abil: e.abil });
          // Phase 8: the showcase monsters have their own voices for their moves
          const mSp = spOf(e.who); if (Au.hasVoice && Au.hasVoice(mSp)) { const mo = A.Showcase && A.Showcase.moves && A.Showcase.moves[e.abil]; Au.monster(mSp, ty === 'heal' ? 'heal' : ty === 'guard' ? 'guard' : mo && mo.cue ? mo.cue : ab.cd > 0 ? 'special' : 'attack'); }
          if (ty === 'guard') { if (!(Au.hasVoice && Au.hasVoice(mSp))) Au.play('guard'); stg.guard(e.who); }
          if (e.boss) setTele(null);
          await sleep(e.boss ? 620 : 480); break;
        }
        case 'shieldHit':
          d.eShield = e.shield; floatAt('e', e.broke ? 'Barrier broken!' : '-' + e.absorbed + ' barrier', e.broke ? 'super' : 'status');
          Au.play(e.broke ? 'super' : 'guard'); if (e.broke) { stg.setBarrier(false); bLog('The barrier shatters!'); } else bLog(e.special ? 'The special ability cracks the barrier hard!' : 'The barrier absorbs the blow.');
          bRender(); await sleep(e.broke ? 700 : 420); break;
        case 'hit': {
          const side = e.who; if (!e.blocked) { stg.hit(side, e.el, e.eff, { big: !!e.big }); floatAt(side, '-' + e.dmg, e.eff + (e.big ? ' big' : ''), e.eff === 'super' ? 'Super effective' : e.eff === 'weak' ? 'Resisted' : e.guarded ? 'Guarded' : e.big ? 'Heavy blow' : ''); }
          if (side === 'e') { d.eHp = e.hp; d.eGuard = false; } else { d.pHp = e.hp; d.pGuard = false; }
          if (!e.blocked) {
            // Phase 8: a showcase attacker's impact sounds like its move; a showcase victim cries out (at most two sounds)
            const atk = spOf(side === 'p' ? 'e' : 'p'), vic = spOf(side), voiced = Au.hasVoice && Au.hasVoice(atk);
            if (voiced) Au.monster(atk, 'impact', { big: e.eff === 'super' || e.big }); else Au.play(e.eff === 'super' || e.big ? 'super' : e.eff === 'weak' ? 'weak' : 'hit');
            if (Au.hasVoice && Au.hasVoice(vic)) Au.monster(vic, 'hurt', { delay: 0.08, big: e.eff === 'super' || e.big });
          }
          if (!e.blocked) bLog(e.eff === 'super' ? 'It’s super effective!' : e.eff === 'weak' ? 'It’s not very effective…' : (e.guarded ? (e.big ? 'The guard absorbed most of the blow!' : 'The guard softened the blow.') : ''));
          bRender(); await sleep(e.blocked ? 120 : e.eff === 'super' || e.big ? 800 : 620); break;
        }
        case 'heal':
          if (e.who === 'p') d.pHp = e.hp; else d.eHp = e.hp;
          floatAt(e.who === 'p' ? 'p' : 'e', '+' + e.amt, 'heal', e.k === 'regen' ? 'Regen' : ''); stg.heal(e.who); Au.play('heal');
          bLog(e.k === 'regen' ? nameOf(e.who) + ' regenerates.' : e.k === 'twilight' ? 'The Twilight Pact mends ' + nameOf(e.who) + '.' : 'Recovered ' + e.amt + ' health.');
          bRender(); await sleep(e.k ? 440 : 560); break;
        case 'guard': if (e.who === 'p') d.pGuard = true; else d.eGuard = true; bLog(nameOf(e.who) + ' braces for impact.'); bRender(); await sleep(450); break;
        case 'weak': if (e.who === 'p') d.pWeak = (d.pWeak || 0) + 1; else d.eWeak = (d.eWeak || 0) + 1; floatAt(e.who, 'ATK down', 'status'); bLog(nameOf(e.who) + '’s attack fell!'); bRender(); await sleep(450); break;
        case 'status': {
          stSet(e.who)[e.k] = e.n; stg.status(e.who, D.STATUS[e.k].color);
          if (e.k !== 'regen') floatAt(e.who, D.STATUS[e.k].short + '!', 'status');
          bLog(STATUS_LOG[e.k](nameOf(e.who))); bRender(); await sleep(e.k === 'regen' ? 360 : 560); break;
        }
        case 'statusEnd': delete stSet(e.who)[e.k]; if (e.k !== 'regen') bLog(nameOf(e.who) + ' is no longer ' + D.STATUS[e.k].name.toLowerCase() + '.'); bRender(); await sleep(e.k === 'regen' ? 120 : 360); break;
        case 'dot':
          if (e.who === 'p') d.pHp = e.hp; else d.eHp = e.hp;
          stg.status(e.who, D.STATUS.burn.color); floatAt(e.who, '-' + e.dmg, 'burn'); Au.play('hit');
          bLog(nameOf(e.who) + ' is hurt by its burn.'); bRender(); await sleep(560); break;
        case 'stunned':
          delete stSet(e.who).stun; stg.status(e.who, D.STATUS.stun.color);
          bLog(e.stagger ? e.name + ' is still reeling and loses its turn!' : e.name + ' is stunned and can’t move!'); bRender(); await sleep(620); break;
        case 'charge':
          setTele(e); floatAt('e', 'Charging…', 'status'); Au.play('weak');
          bLog(e.tell || (e.name + ' is gathering power…')); bRender(); await sleep(1000); break;
        case 'stagger':
          setTele(null); floatAt(e.who, 'Stagger!', 'super'); Au.play('super');
          bLog('Staggered! The charge is broken.'); bRender(); await sleep(760); break;
        case 'resist': bLog('Guardians shrug off stuns… unless you catch them charging.'); await sleep(560); break;
        case 'barrierTell': setTele(e); floatAt('e', 'Bracing…', 'status'); Au.play('weak'); bLog(e.name + ' plants its feet. The road stones begin to rise.'); await sleep(900); break;
        case 'barrier':
          d.eShield = e.shield; d.eShieldMax = e.shield; stg.setBarrier(true); stg.guard('e'); Au.play('guard'); floatAt('e', 'Stone Barrier', 'status');
          bLog(e.name + ' raises a Stone Barrier!'); bRender(); await sleep(900); setTele(null); break;
        case 'prismWarn': setTele(e); bLog('The light around ' + d.eName + ' shifts colour…'); await sleep(700); break;
        case 'prismShift':
          d.eEl = e.el; stg.status('e', D.ELEMENTS[e.el].color); if (stg.setElement) stg.setElement(e.el); floatAt('e', D.ELEMENTS[e.el].name + '!', 'status'); Au.play('hum');
          bLog(e.name + ' shifts to ' + D.ELEMENTS[e.el].name + '!'); setTele(null); bRender(); await sleep(800); break;
        case 'faint': {
          const sd = e.who; stg.faint(sd); if (sd === 'e') { setTele(null); stg.setBarrier(false); } if (Au.hasVoice && Au.hasVoice(spOf(sd))) Au.monster(spOf(sd), 'defeat'); else Au.play('faint');
          bLog((sd === 'p' ? d.pName : d.eName) + ' was defeated!'); await sleep(900); break;
        }
        case 'foeIn': {
          const f = U.b.foes[e.idx];
          d.eName = f.name; d.eSp = f.sp; d.eLv = f.lv; d.eHp = e.hp; d.eMax = e.hpMax; d.eEl = f.el; d.eSt = {}; d.eShield = 0; d.charging = false; d.eWeak = f.weak || 0; d.eGuard = !!f.guard;
          const sp = $('#spr-e'); if (sp) { sp.classList.remove('faint'); sp.innerHTML = Art.portrait(f.sp); if (!stg.is3d) cls('e', 'in', 500); }
          if (stg.is3d) { const p = stg.swap('e', f.sp); await Promise.race([p || Promise.resolve(), sleep(560)]); }
          bLog(f.name + ' steps in! (' + B.foesLeft(U.b) + ' left)'); bRender(); await sleep(620); break;
        }
        case 'switch': {
          const f = U.b.party[e.idx];
          d.pName = f.name; d.pSp = f.sp; d.pLv = f.lv; d.pHp = e.hp; d.pMax = f.hpMax; d.pEl = f.el; d.pSt = {}; d.pWeak = f.weak || 0; d.pGuard = !!f.guard;
          const sp = $('#spr-p'); if (sp) { sp.classList.remove('faint'); sp.innerHTML = Art.portrait(f.sp); if (!stg.is3d) cls('p', 'in', 500); }
          if (stg.is3d) { const p = stg.swap('p', f.sp); await Promise.race([p || Promise.resolve(), sleep(560)]); } else await sleep(0);
          Au.play('ok'); bLog('Go, ' + f.name + '!'); bRender(); await sleep(stg.is3d ? 260 : 560); break;
        }
        case 'needSwitch': bLog('Choose your next Amina.'); break;
        case 'end': { const w = e.result === 'win' ? 'p' : stg.is3d && U.b.enemy && U.b.enemy.hp > 0 ? 'e' : null; if (w) { stg.victory(w); if (Au.hasVoice && Au.hasVoice(spOf(w))) Au.monster(spOf(w), 'victory', { delay: 0.15 }); } break; }
      }
    }
    // the event list is complete for this action: line the display up with the real battle state
    if (UI.B === U) { const b = U.b, cp = B.cur(b); d.pSt = Object.assign({}, cp.st); d.eSt = Object.assign({}, b.enemy.st); d.eShield = b.enemy.shield || 0; d.eEl = b.enemy.el; d.pWeak = cp.weak || 0; d.eWeak = b.enemy.weak || 0; d.pGuard = !!cp.guard; d.eGuard = !!b.enemy.guard; if (!b.enemy.charging && d.charging) setTele(null); }
    U.acting = null;
  }
  async function bAct(action) {
    const U = UI.B; if (!U || U.busy || U.over) return;
    U.busy = true; if (action.t === 'ab') { U.chosen = action.id; U.fired = action.id; U.firedUntil = Date.now() + 420; } bRender();
    const ev = B.act(U.b, action);
    await playEvents(ev);
    if (UI.B !== U) return;
    if (U.b.over) { U.over = true; U.chosen = null; bRender(); return bFinish(); }
    U.busy = false; U.chosen = null; bRender();
  }
  UI.act('bAbility', (el) => bAct({ t: 'ab', id: el.dataset.id }));
  UI.act('bSwitch', (el) => {
    const U = UI.B; if (!U || U.busy || U.over) return; const i = +el.dataset.i, f = U.b.party[i];
    if (!f || f.hp <= 0 || (i === U.b.pi && !U.b.pending)) return; bAct({ t: 'sw', to: i });
  });
  UI.act('bSwapOpen', () => { const U = UI.B; if (U && !U.busy) UI.toast('Tap one of your Aminas in the bottom-left to switch. It uses your turn.', 'n'); });
  UI.act('bRetreat', () => { const U = UI.B; if (!U || U.busy || !U.ctx.retreat) return; const r = U.ctx.retreat; UI.confirm(r.title, r.text, r.yes, () => { if (UI.B !== U) return; U.over = true; r.fn(); endStage(UI.B); UI.B = null; if (r.after) r.after(); else UI.showIsland(); }); });
  UI.leaveBattle = function (next) { endStage(UI.B); UI.B = null; if (next) next(); else UI.showIsland(); };

  async function bFinish() {
    const U = UI.B;
    await sleep(U.b.result === 'win' && U.stage && U.stage.is3d && !UI.calm() ? 1100 : 500);
    if (UI.B !== U) return; // the player already left the battle
    U.ctx.finish(U);
  }
  function dungeonFinish(U) {
    const s = st(); if (!s.run) return;
    // equipment found in this battle is shown on the result card itself (not as a separate card on top of it)
    const sink = (UI.rewardSink = []);
    let out; try { out = R.resolveBattle(s, U.b); } finally { UI.rewardSink = null; }
    out.items = sink; R.after(s); S.save();
    if (out.win) { Au.play('win'); UI.victory(out); } else { Au.play('lose'); UI.defeat(out); }
  }
  const rewardRow = (r) => ['gold', 'food', 'gems'].filter((k) => r && r[k]).map((k) => '<span>' + I(k === 'gems' ? 'gem' : k) + ' +' + r[k].toLocaleString('en-GB') + '</span>').join('');
  UI.rewardRow = rewardRow;
  // Phase 6: one result card for every battle win. Header (the banner) → progress → what you received (reward tiles,
  // grouped by where it came from) → special moments (new Aminas, a new island) → the party's experience.
  UI.victory = function (out) {
    const s = st(), dn = D.DUNGEONS[out.dungeon || (UI.B && UI.B.d) || 'reliquary'], RW = UI.Rewards;
    const foe = UI.B && UI.B.b ? UI.B.b.enemy : null, cleared = out.cleared, isl = !!out.islandBoss, boss = !!out.boss;
    const dname = dn.name.replace(/^The /, '');
    const rows = out.xp.map((x, i) => {
      const lvl = x.levels.length ? '<div class="lvlup">' + I('xp') + ' Level up! Lv ' + x.levels[0].from + ' → ' + x.levels[x.levels.length - 1].to + '</div>' : '';
      const evo = x.evoReady ? '<div class="lvlup evo">' + I('spark') + ' Ready to evolve (you choose when)</div>' : '';
      return '<div class="xprow' + (x.alive ? ' cheer' : ' down') + '" style="--i:' + i + '"><div class="art">' + Art.portrait(x.sp) + '</div><div class="grow"><b>' + esc(D.SPECIES[x.sp].name) + '</b> <span class="muted">+' + x.gained + ' xp' + (x.alive ? '' : ' (fainted: half)') + '</span>' + lvl + evo + '</div></div>';
    }).join('');
    const groups = [];
    const spoils = [{ k: 'gold', n: out.gold }, { k: 'food', n: out.food }];
    if (out.essence && out.essence.n) spoils.push({ k: 'essence', el: out.essence.el, n: out.essence.n });
    groups.push({ title: 'Battle spoils', list: spoils });
    if (out.sectionFirst) groups.push({ title: out.sectionFirst.name + ' · first clear', icon: 'star', list: RW.fromRes(out.sectionFirst.reward) });
    if (cleared) {
      const list = RW.fromRes(out.reward);
      (out.newSp || []).forEach((sp) => list.push({ k: 'amina', id: sp }));
      groups.push({ title: dname + (out.first ? ' · first clear' : ' cleared'), icon: isl ? 'boss' : 'gate', list });
    }
    if (out.items && out.items.length) groups.push({ title: 'Equipment found', icon: 'anvil', list: out.items.map((id) => ({ k: 'item', id })) });
    const spoilsHtml = groups.filter((g) => g.list.length).map((g) => RW.group(g)).join('');
    const lore = out.lore && out.lore.length ? '<div class="v-note">' + I('book') + ' New journal entr' + (out.lore.length > 1 ? 'ies' : 'y') + ': ' + out.lore.map((k) => '<b>' + esc(D.LORE[k].title) + '</b>') .join(', ') + '</div>' : '';
    const rest = !cleared && out.sectionDone ? '<div class="v-note">' + I('heart') + ' The party rests at a glowing spring and recovers some health.</div>' : '';
    const unlock = out.unlockedIsland ? '<div class="v-unlock">' + I('island') + '<div><small>New island unlocked</small><b>' + esc(D.ISLANDS[out.unlockedIsland].name) + '</b><span>It is now part of the sanctuary.</span></div></div>' : '';
    const prog = '<div class="pips big" aria-label="Battle ' + (out.battle + 1) + ' of ' + dn.battles.length + '">' + dn.battles.map((x, i) => '<i class="' + (i <= out.battle ? 'on' : '') + (x.boss ? ' b' : '') + '"></i>').join('') + '</div>';
    const title = cleared ? (isl ? 'Island Boss defeated!' : 'Dungeon cleared!') : boss ? 'Guardian defeated!' : 'Victory!';
    const kicker = isl ? (foe ? foe.name : 'The Island Boss') + ' · ' + dname : boss ? (foe ? foe.name : 'The guardian') + ' · ' + dname : dname + ' · battle ' + (out.battle + 1) + ' of ' + dn.battles.length;
    const tier = isl ? 'isle' : boss || cleared ? 'boss' : 'win';
    const body = '<div class="vcard vic v-' + tier + '"><div class="v-banner"><span class="v-crest">' + I(isl ? 'boss' : boss || cleared ? 'crown' : 'swords') + '</span><small class="v-kick">' + esc(kicker) + '</small><h1>' + title + '</h1></div>' + prog +
      '<div class="v-spoils">' + spoilsHtml + '</div>' + unlock + lore + rest + '<div class="v-party">' + rows + '</div></div>';
    const nextLbl = cleared ? (out.scene ? 'Continue' : 'Return to the sanctuary') : 'Next: battle ' + (out.battle + 2) + (out.battle + 1 === 9 ? ' · the boss' : '');
    const ov = UI.modal(UI.sheet('Battle result', body, (cleared ? '' : '<button class="btn ghost" id="v-leave">Leave for now</button>') + '<button class="btn gold" id="v-go">' + nextLbl + '</button>', 'narrow res-sheet r-' + tier), { dismiss: false });
    $('.x', ov).remove();
    if (!UI.calm()) UI.sparkles($('.v-banner h1', ov), isl ? 40 : boss || cleared ? 28 : 16, isl ? ['#ff86d6', '#8fe6d6', '#ffd86b', '#9a78e6'] : boss || cleared ? ['#ffd86b', '#fff3c0', '#ffffff', '#ffb46b'] : null);
    RW.celebrate(ov);
    const lv = $('#v-leave', ov); if (lv) lv.onclick = () => { UI.close(ov); R.abandonRun(st()); S.save(); UI.leaveBattle(); };
    $('#v-go', ov).onclick = () => {
      UI.close(ov); endStage(UI.B); UI.B = null;
      if (!cleared && s.run) { UI.nextEncounter(); return; }
      const after = () => { UI.showIsland(); if (out.unlockedIsland) setTimeout(() => UI.islandUnlockedFx(out.unlockedIsland), 400); else if (!out.scene && out.first && A.Scenes.after[out.dungeon]) UI.toast(A.Scenes.after[out.dungeon], 'n'); };
      if (out.scene) UI.playScene(out.scene, after); else after();
    };
    return ov;
  };
  // Defeat: quiet and atmospheric, never a punishment screen. What is kept comes first, then one useful tip.
  UI.defeat = function (out) {
    const dn = D.DUNGEONS[out.dungeon];
    const prog = '<div class="pips big dim">' + dn.battles.map((x, i) => '<i class="' + (i < out.battle ? 'on' : i === out.battle ? 'here' : '') + (x.boss ? ' b' : '') + '"></i>').join('') + '</div>';
    const body = '<div class="vcard defeat"><div class="v-banner"><span class="v-crest">' + I('el_dark') + '</span><small class="v-kick">' + esc(dn.name.replace(/^The /, '')) + ' · battle ' + (out.battle + 1) + '</small><h1>Your party was overwhelmed</h1></div>' + prog +
      '<div class="v-kept"><div>' + I('check') + ' Progress kept: next time you start at <b>battle ' + (out.battle + 1) + '</b></div><div>' + I('check') + ' Every level your Aminas earned stays</div><div class="v-kept-rw">' + I('food') + ' +' + out.food + ' food for the trouble</div></div>' +
      '<p class="v-tip">' + I('info') + '<span>Feed your Aminas, bring three, and use elements: Fire beats Nature. When a guardian starts charging, guard or switch. Barriers crack faster under special abilities.</span></p></div>';
    const ov = UI.modal(UI.sheet('Defeated', body, '<button class="btn ghost" id="v-home">Return to the sanctuary</button><button class="btn gold" id="v-retry">Try again</button>', 'narrow res-sheet r-defeat'), { dismiss: false });
    $('.x', ov).remove(); $('#v-home', ov).onclick = () => { UI.close(ov); UI.leaveBattle(); };
    $('#v-retry', ov).onclick = () => { UI.close(ov); UI.leaveBattle(() => { UI.showIsland(); setTimeout(() => UI.acts.enterDungeon({ dataset: { id: out.dungeon }, closest: () => null }), 200); }); };
    return ov;
  };

  /* ---------- hatchery ---------- */
  const REASONS = { noHatchery: 'Restore the Old Hatchery first.', egg: 'An egg is already incubating.', pick: 'Choose two parents.', same: 'Choose two different Aminas.', level: 'Both parents must be level ' + D.BREED_MIN_LEVEL + ' or higher.', incompat: 'These two don’t resonate. Try another pairing.', locked: 'This pairing needs the Dormant Spire to wake first.', cost: 'You need ' + D.BREED_COST.gold + ' gold and ' + D.BREED_COST.food + ' food.' };
  UI.hSel = [null, null];
  function eggSvg(pct_, ready, cols) {
    cols = cols || ['#ffb8d2', '#9ad4ff', '#b8e8a0'];
    const cracks = pct_ > 0.35 ? '<path d="M40 38l8 10-6 8 8 8" stroke="#8a6a3a" stroke-width="2" fill="none"/>' : '';
    return '<svg class="egg-svg ' + (ready ? 'ready' : 'wob') + '" viewBox="0 0 100 124"><defs><radialGradient id="eg" cx=".4" cy=".3"><stop offset="0" stop-color="#fffbe8"/><stop offset="1" stop-color="#f1d6a0"/></radialGradient></defs><path d="M50 6C28 6 12 52 12 78a38 38 0 0 0 76 0C88 52 72 6 50 6z" fill="url(#eg)" stroke="#b8935a" stroke-width="3"/><circle cx="34" cy="64" r="6" fill="' + cols[0] + '" opacity=".8"/><circle cx="62" cy="52" r="5" fill="' + cols[1] + '" opacity=".8"/><circle cx="58" cy="86" r="7" fill="' + cols[2] + '" opacity=".8"/>' + cracks + (ready ? '<path d="M30 30l12 14-8 8 14 10 6-8 12 6" stroke="#8a6a3a" stroke-width="2.5" fill="none"/>' : '') + '</svg>';
  }
  function eggBox() {
    const s = st(), e = s.egg && R.eggStatus(s);
    if (!s.egg) return '<div class="eggbox" id="eggbox"><div class="muted" style="font-size:.85rem">No egg yet.<br>Choose two parents and start incubation.</div>' + eggSvg(0, false).replace('wob', '').replace('egg-svg ', 'egg-svg " style="opacity:.35') + '</div>';
    const secs = Math.ceil(e.left / 1000), pc = (s.egg.parents || []).map((x) => D.SPECIES[x] && D.ELEMENTS[D.SPECIES[x].el].color).filter(Boolean);
    const cols = pc.length === 2 ? [pc[0], pc[1], pc[0]] : null;
    return '<div class="eggbox" id="eggbox"><b>' + (e.ready ? 'It’s hatching!' : 'Incubating…') + '</b>' + eggSvg(e.progress, e.ready, cols) + '<div class="bar xp"><i style="width:' + Math.round(e.progress * 100) + '%"></i></div><div class="muted" style="font-size:.8rem;margin:.3rem 0">' + (e.ready ? 'Ready!' : (secs >= 60 ? Math.floor(secs / 60) + 'm ' + (secs % 60) + 's' : secs + 's') + ' left') + '</div>' + (e.ready ? '<button class="btn gold" data-act="hHatch">Hatch!</button>' : '') + '</div>';
  }
  UI.hatchery = function (ovEx) {
    const s = st();
    if (!s.struct.hatchery) { UI.toast('The Old Hatchery is still in ruins. Restore it first (it unlocks after the Tide Gate).', 't'); return; }
    const hf = A.World.eggTimeFactor(s);
    const parent = (i) => { const a = R.inst(s, UI.hSel[i]); return '<button class="slot" style="width:100%;background:rgba(0,0,0,.2)" data-act="hPick" data-i="' + i + '">' + (a ? artBox(a.sp) + '<b>' + esc(D.SPECIES[a.sp].name) + '</b>Lv ' + a.lv : I('plus') + '<span class="muted">Choose parent ' + (i + 1) + '</span>') + '</button>'; };
    const a = UI.hSel[0], b = UI.hSel[1], chk = R.breedCheck(s, a, b);
    // outcome preview: breeding is decided by the parents' elements, so the result is shown before paying
    const pa = R.inst(s, a), pb = R.inst(s, b), rec = pa && pb && pa.uid !== pb.uid ? R.recipeFor(D.SPECIES[pa.sp].el, D.SPECIES[pb.sp].el) : null;
    const known = rec && s.recipes && s.recipes[rec.key];
    const preview = pa && pb && pa.uid !== pb.uid ? '<div class="hpreview ' + (rec ? (rec.locked && !s.flags.r2 ? 'locked' : 'ok') : 'none') + '"><div class="hp-p">' + artBox(pa.sp) + '</div><span class="hp-op">+</span><div class="hp-p">' + artBox(pb.sp) + '</div><span class="hp-op">' + I('arrow') + '</span><div class="hp-out">' +
      (rec ? (known || s.owned[rec.sp] ? artBox(rec.sp) : silBox(rec.sp)) + '<small>' + (known || s.owned[rec.sp] ? esc(D.SPECIES[rec.sp].name) : 'Mystery egg') + '</small>' : '<div class="art hp-none">?</div><small>No match</small>') + '</div></div>' : '';
    let msg;
    if (chk.ok) { const known = (s.recipes && s.recipes[chk.key]) || (s.owned[chk.sp] ? chk.sp : null); msg = '<span class="good"><b>Compatible!</b></span> Egg: <b>' + (known ? esc(D.SPECIES[known].name) : 'a mystery egg') + '</b>. Cost: ' + I('gold') + ' ' + D.BREED_COST.gold + ' ' + I('food') + ' ' + D.BREED_COST.food + '. Incubation: ' + A.IsoArt.fmtTime(Math.max(5, Math.round(D.EGG_SECONDS[s.settings.eggSpeed] * hf))) + (hf < 1 ? ' (Hatchery level ' + s.buildings.hatchery.level + ')' : '') + '.'; }
    else msg = '<span class="' + (chk.reason === 'pick' ? 'muted' : 'bad') + '">' + (REASONS[chk.reason] || '') + '</span>';
    const html = UI.sheet('Old Hatchery', '<div class="hatch"><div><div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">' + parent(0) + parent(1) + '</div>' + preview + '<div class="hint-line" style="margin:.5rem 0">' + msg + '</div><div class="row-actions"><button class="btn gold ' + (chk.ok ? '' : 'off') + '" data-act="hStart" data-hl="hStart">' + I('egg') + ' Start incubation</button><button class="btn small ghost" data-act="hBook">Recipe book</button></div></div>' + eggBox() + '</div>',
      '<span class="muted" style="margin-right:auto;font-size:.78rem">Parents must be level ' + D.BREED_MIN_LEVEL + '+. Parents are not consumed. The result is decided by their elements.</span><button class="btn gold" data-act="close">Close</button>', 'wide');
    let ov = ovEx;
    if (ov && ov.parentNode) ov.innerHTML = html; else { ov = UI.modal(html, { onClose: () => { UI.hatchTick = null; UI.refresh(); } }); }
    UI.hatchTick = () => { const box = $('#eggbox', ov); if (!box || !ov.parentNode) { UI.hatchTick = null; return; } if (!s.egg) return; const n = document.createElement('div'); n.innerHTML = eggBox(); box.replaceWith(n.firstChild); };
    return ov;
  };
  UI.act('hatchery', () => {
    if (!st().struct.hatchery) { UI.go(A.Nav.resolve(st(), { type: 'restore', target: 'hatchery' })); return; }
    UI.closeAll(); UI.hatchery(); UI.applyHl();
  });
  UI.act('hPick', (el) => {
    const s = st(), i = +el.dataset.i, other = R.inst(s, UI.hSel[1 - i]), parentOv = el.closest('.overlay');
    const list = s.aminas.slice().sort((x, y) => y.lv - x.lv);
    const ov = UI.modal(UI.sheet('Choose parent ' + (i + 1), '<div class="grid">' + list.map((a) => {
      const sp = D.SPECIES[a.sp]; let why = '';
      if (a.lv < D.BREED_MIN_LEVEL) why = 'Lv ' + D.BREED_MIN_LEVEL + ' needed';
      else if (other && other.uid === a.uid) why = 'Already chosen';
      else if (other) { const r = R.recipeFor(sp.el, D.SPECIES[other.sp].el); if (!r) why = 'No match'; else if (r.locked && !s.flags.r2) why = 'Locked pairing'; }
      return '<div class="card ' + (why ? 'dis' : '') + '" data-act="hSet" data-i="' + i + '" data-uid="' + a.uid + '">' + artBox(a.sp) + '<div class="nm">' + esc(sp.name) + '</div><div>' + chip(sp.el) + '</div><div class="lvl">' + (why || 'Lv ' + a.lv) + '</div></div>';
    }).join('') + '</div>', '<button class="btn ghost" data-act="close">Cancel</button>', 'wide'));
    ov._parent = parentOv;
  });
  UI.act('hSet', (el) => { const ov = el.closest('.overlay'), p = ov._parent; UI.hSel[+el.dataset.i] = +el.dataset.uid; UI.close(ov); if (p && p.parentNode) UI.hatchery(p); });
  UI.act('hStart', (el) => {
    const s = st(), ov = el.closest('.overlay'), r = R.startBreed(s, UI.hSel[0], UI.hSel[1]);
    if (!r.ok) { Au.play('no'); return; }
    UI.hSel = [null, null]; S.save(); UI.flush(); UI.renderHud(); UI.hatchery(ov);
  });
  UI.act('hHatch', (el) => {
    const ov = el.closest('.overlay'), r = R.hatch(st());
    if (!r.ok) return; UI.afterAction(); UI.hatchery(ov);
  });
  UI.act('hBook', () => {
    const s = st(), keys = Object.keys(s.recipes || {});
    const total = Object.keys(D.BREED).length + 1, nm = (k) => k.split('+').map((e) => D.ELEMENTS[e].name).join(' + ');
    UI.modal(UI.sheet('Recipe book · ' + keys.length + ' / ' + total, keys.length ? keys.map((k) => '<div class="inst"><div class="art">' + Art.portrait(s.recipes[k]) + '</div><div class="grow"><b>' + nm(k) + '</b><br><span class="muted">→ ' + esc(D.SPECIES[s.recipes[k]].name) + '</span></div></div>').join('') + '<p class="muted" style="font-size:.8rem">Some pairings stay hidden until the Dormant Spire wakes. Resonance Aminas pair with anything.</p>' : '<p class="muted">No recipes discovered yet. Hatch an egg to record its recipe.</p>', '<button class="btn gold" data-act="close">Close</button>', 'narrow'));
  });
})(typeof window !== 'undefined' ? window : globalThis);
