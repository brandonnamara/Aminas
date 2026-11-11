/* Aminas — Phase 13A: progression on the monster details screen (presentation only).
   - A progression strip under the name: level, experience, what each feed costs and gives, and one status line that
     reports a feed, a level-up or a shortage in place (no pop-ups over the screen).
   - Battle: stats with the next level's gain and the share that comes from equipment.
   - Growth: evolution requirements (level and cost, with what is still missing), the stat change at the same level
     and the move that changes; the same summary in the evolution prompt and after the ceremony.
   - Moves: every level of a move (effect and cost) in one track.
   Rules, costs and rates are untouched: everything shown comes from R.Prog (src/progression.js) and the existing
   rules. The one-off effects are short, never loop, and are replaced by plain state changes with Reduce Motion,
   Battery saver or a resting island (body.calm / body.perf-saver). */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Au = A.Audio, UI = A.UI, Art = A.Art;
  const { esc } = UI.h, I = Art.icon, st = () => S.state, $ = (s, r) => (r || document).querySelector(s);
  const P = (UI.P13 = { holdUntil: 0 });
  const quiet = () => (UI.calm && UI.calm()) || document.body.classList.contains('perf-saver') || document.body.classList.contains('calm');
  const STATS = () => R.Prog.STATS;
  const fmt = (n) => Math.floor(n).toLocaleString('en-US');
  const costHtml = (c) => ['gold', 'food', 'gems'].filter((k) => c && c[k]).map((k) => I(k === 'gems' ? 'gem' : k) + ' ' + c[k]).join(' ');

  /* ---------------- the progression strip ---------------- */
  // What the status line says when nothing has just happened.
  P.statusText = function (s, inst) {
    const L = R.Prog.level(inst), e = R.Prog.evoPreview(s, inst);
    if (!e.final && e.levelOk) return { cls: 'ready', text: 'Ready to evolve. See Growth.' };
    if (L.max) return { cls: '', text: 'Highest level reached.' + (e.final ? ' Final form.' : '') };
    if (!e.final) return { cls: '', text: 'Evolves at Lv ' + e.lv + ' (' + e.levelsToGo + ' level' + (e.levelsToGo === 1 ? '' : 's') + ', ' + fmt(e.xpToGo) + ' XP to go).' };
    return { cls: '', text: 'Final form. Feeding still raises its level and stats.' };
  };
  P.feedBtn = function (f, uid, gold) {
    const sub = f.reason === 'max' ? 'Max level' : I('food') + ' ' + f.food + (f.reason === 'food' ? ' · need ' + f.short + ' more' : ' <i class="pg-arrow">→</i> +' + f.xp + ' XP' + (f.levels ? ' · <b class="pg-up">Lv ' + f.lvAfter + '</b>' : ''));
    return '<button class="btn small pg-feed ' + (gold ? 'gold' : '') + (f.reason === 'food' ? ' short' : '') + (f.reason === 'max' ? ' off' : '') + '" data-act="detailFeed" data-uid="' + uid + '" data-kind="' + f.kind + '" aria-label="' + esc(f.name + ': costs ' + f.food + ' food, gives ' + f.xp + ' experience' + (f.reason === 'food' ? ', not enough food' : '')) + '"><span>' + esc(f.name) + '</span><small>' + sub + '</small></button>';
  };
  P.head = function (s, inst) {
    const L = R.Prog.level(inst), feeds = R.Prog.feeds(s, inst), stt = P.statusText(s, inst);
    return '<div class="pg-head" data-uid="' + inst.uid + '">' +
      '<div class="pg-row"><span class="pg-lv" aria-label="Level ' + L.lv + '">Lv <b>' + L.lv + '</b></span><div class="pg-xp"><div class="bar xp" role="progressbar" aria-valuemin="0" aria-valuemax="' + (L.need || 1) + '" aria-valuenow="' + L.xp + '"><i style="width:' + L.pct + '%"></i></div>' +
      '<small class="pg-xpt">' + (L.max ? 'Max level' : '<b>' + fmt(L.xp) + '</b> / ' + fmt(L.need) + ' XP · ' + fmt(L.left) + ' to Lv ' + (L.lv + 1)) + '</small></div></div>' +
      '<div class="pg-row pg-feeds">' + feeds.map((f, i) => P.feedBtn(f, inst.uid, i === 0)).join('') +
      '<div class="pg-status ' + stt.cls + '" role="status" aria-live="polite" data-idle="' + esc(stt.text) + '" data-idle-cls="' + stt.cls + '">' + esc(stt.text) + '</div>' +
      '<span class="pg-food" title="Food you have">' + I('food') + ' <b>' + fmt(s.res.food) + '</b></span></div></div>';
  };

  /* ---------------- Battle tab: stats ---------------- */
  P.stats = function (s, inst) {
    const t = R.Prog.stats(s, inst);
    return '<div class="stats pg-stats">' + STATS().map(([k, name]) => '<div class="stat" data-stat="' + k + '">' + name + '<b>' + t.now[k] + '</b>' + (t.max ? '' : '<em>+' + t.nextGain[k] + '</em>') + (t.gear[k] ? '<small class="pg-gear">' + I('hammer') + '+' + t.gear[k] + '</small>' : '') + '</div>').join('') + '</div>' +
      '<div class="kv muted small-t pg-statnote">' + (t.max ? 'Stats at the highest level.' : 'Stats at Lv ' + inst.lv + '. <em class="good">Green</em>: gained at Lv ' + (inst.lv + 1) + '.') + (t.hasGear ? ' ' + I('hammer') + ' Included from equipment.' : '') + '</div>';
  };

  /* ---------------- evolution: requirements, changes ---------------- */
  // Stats at the same level before and after, and the move that changes. `known` hides the next form's move name
  // until the player has met that form (its name is hidden the same way elsewhere).
  P.evoChanges = function (e, opt) {
    if (!e || e.final) return '';
    opt = opt || {}; const known = opt.known != null ? opt.known : e.known;
    const stats = '<div class="pg-evostats">' + STATS().map(([k, name]) => '<div class="pg-es"><small>' + name + '</small><span>' + e.now[k] + '</span><i>→</i><b>' + e.after[k] + '</b><em>+' + e.gain[k] + '</em></div>').join('') + '</div>';
    const mv = e.newMoves.map((m) => '<div class="pg-newmove">' + I('spark') + '<span><b>' + (known ? esc(m.name) : 'A new signature move') + '</b> replaces ' + esc(m.fromName) + ' and keeps its level (Lv ' + m.lv + ')' + (known ? ': ' + esc(m.was) + ' → <b class="good">' + esc(m.effect) + '</b>' : '') + '.</span></div>').join('');
    return '<div class="pg-evochg"><div class="pg-cap">' + (opt.title || 'At evolution (same level' + (opt.gear === false ? '' : ' and equipment') + ')') + '</div>' + stats + mv + '</div>';
  };
  P.evoCard = function (s, inst) {
    const e = R.Prog.evoPreview(s, inst);
    if (e.final) return '<div class="pg-evo final"><div class="kv">' + I('check') + ' <b>Final form</b> (Stage ' + e.stage + ' of ' + e.stages + '). It keeps growing by level, moves and equipment.</div></div>';
    const lvLine = '<li class="' + (e.levelOk ? 'ok' : 'no') + '">' + I(e.levelOk ? 'check' : 'lock') + ' <span>Level ' + e.lv + ' <span class="muted">(now Lv ' + inst.lv + (e.levelOk ? '' : ' · ' + e.levelsToGo + ' level' + (e.levelsToGo === 1 ? '' : 's') + ', ' + fmt(e.xpToGo) + ' XP to go') + ')</span></span></li>';
    const part = (k, name) => (e.cost[k] ? I(k) + ' ' + e.cost[k] + ' ' + name + ' <span class="muted">(you have ' + fmt(e.have[k]) + (e.short[k] ? ', ' + e.short[k] + ' short' : '') + ')</span>' : '');
    const costLine = e.cost.gold || e.cost.food ? '<li class="' + (e.costOk ? 'ok' : 'no') + '">' + I(e.costOk ? 'check' : 'lock') + ' <span>' + [part('gold', 'gold'), part('food', 'food')].filter(Boolean).join(' · ') + '</span></li>' : '';
    const bar = e.levelOk ? '' : '<div class="bar xp pg-evobar"><i style="width:' + Math.min(100, Math.round(inst.lv / e.lv * 100)) + '%"></i></div>';
    const btn = '<button class="btn small gold evo-btn' + (e.ok ? '' : ' off') + '" data-act="evoAsk" data-uid="' + inst.uid + '">' + I('spark') + 'Evolve</button>';
    const why = e.ok ? 'Evolving is your choice, and keeps its level, experience, moves and equipment.' : e.reason === 'busy' ? 'Finish or leave the dungeon run first.' : e.reason === 'cost' ? 'Level reached. It needs the gold and food above.' : 'Keep feeding or battling to reach Lv ' + e.lv + '.';
    return '<div class="pg-evo' + (e.ok ? ' ready' : '') + '"><div class="pg-cap">Next: ' + (e.known ? esc(e.name) : '???') + ' · Stage ' + e.toStage + ' of ' + e.stages + '</div><ul class="evo-req">' + lvLine + costLine + '</ul>' + bar + P.evoChanges(e) +
      '<div class="pg-evofoot"><span class="muted small-t">' + why + '</span>' + (e.levelOk ? btn : '') + '</div></div>';
  };
  // After the ceremony: what changed, on the ceremony card itself.
  P.evoDone = function (ov, fromSp, toSp, uid) {
    const box = $('.evolve', ov); if (!box || $('.evo-result', box)) return;
    const s = st(), inst = uid != null ? R.inst(s, uid) : null, b = D.SPECIES[toSp];
    // without the Amina (a preview call) the comparison is made at level 1 with no equipment
    const r = R.Prog.evoResult(s, inst && inst.sp === toSp ? inst : { sp: toSp, lv: 1, xp: 0 }, fromSp);
    const pips = '<span class="pg-stage" aria-label="Stage ' + r.stage + ' of ' + r.stages + '">' + Array.from({ length: r.stages }, (_, i) => '<i class="' + (i < r.stage ? 'on' : '') + '"></i>').join('') + '</span>';
    const html = '<div class="evo-result"><div class="pg-cap">' + pips + ' Stage ' + r.stage + ' of ' + r.stages + ' · Lv ' + r.lv + ' kept</div>' +
      '<div class="pg-evostats">' + STATS().map(([k, name]) => '<div class="pg-es"><small>' + name + '</small><span>' + r.before[k] + '</span><i>→</i><b>' + r.after[k] + '</b><em>+' + r.gain[k] + '</em></div>').join('') + '</div>' +
      r.newMoves.map((m) => '<div class="pg-newmove">' + I('spark') + '<span>New move: <b>' + esc(m.name) + '</b> (Lv ' + m.lv + ', ' + esc(m.effect) + ') replaces ' + esc(m.fromName) + '.</span></div>').join('') +
      (r.next ? '<div class="muted small-t">' + esc(b.name) + ' can evolve again at Lv ' + r.next.lv + '.</div>' : '<div class="muted small-t">' + esc(b.name) + ' is this line’s final form.</div>') + '</div>';
    const text = $('.evo-text', box); if (text) text.insertAdjacentHTML('afterend', html); else box.insertAdjacentHTML('beforeend', html);
    box.classList.add('has-result');
    if (Au.hasVoice && Au.hasVoice(toSp) && Au.monster) setTimeout(() => { if (ov.parentNode) Au.monster(toSp, 'victory'); }, quiet() ? 0 : 350);
  };

  /* ---------------- Moves tab: every level of a move ---------------- */
  P.track = function (m) {
    const t = R.Prog.moveTrack(m.id), left = R.Prog.moveCostToMax(m.lv);
    return '<div class="pg-track" aria-label="' + esc(m.ab.name) + ' levels">' + t.map((x) => '<div class="pg-tl' + (x.lv === m.lv ? ' cur' : x.lv < m.lv ? ' done' : x.lv === m.lv + 1 ? ' next' : '') + '"><small>Lv ' + x.lv + '</small><b>' + (x.effect.k === 'power' ? x.effect.v : x.effect.v + '%') + '</b><span>' + (x.lv <= m.lv ? I('check') : Art.essIcon(m.el) + x.cost) + '</span></div>').join('') + '</div>' +
      '<small class="muted pg-trackn">' + (m.now.k === 'power' ? 'Power' : m.now.k === 'guard' ? 'Share of a hit blocked' : 'Share of max HP healed') + ' at each level, and the ' + esc(D.ELEMENTS[m.el].name) + ' Essence each upgrade costs' + (left ? ' (' + left + ' to reach Lv 5)' : '') + '.</small>';
  };
  P.essShort = (m) => 'Needs ' + (m.cost - m.have) + ' more ' + D.ELEMENTS[m.el].name + ' Essence: win dungeon or survival battles against ' + D.ELEMENTS[m.el].name + ' Aminas, search ruins, or set a habitat to make essence.';

  /* ---------------- feeding on the details screen ---------------- */
  let statusTimer = 0;
  const say = function (ov, text, cls, ms) {
    const el = $('.pg-status', ov); if (!el) return;
    el.textContent = text; el.className = 'pg-status ' + (cls || '') + ' said';
    clearTimeout(statusTimer); statusTimer = setTimeout(() => { if (!el.isConnected) return; el.textContent = el.dataset.idle || ''; el.className = 'pg-status ' + (el.dataset.idleCls || ''); }, ms || 3200);
  };
  // The XP bar fills smoothly; across a level-up it fills to the end, then starts the new level from empty.
  const fillBar = function (bar, toPct, levels) {
    if (!bar) return;
    if (!levels || quiet()) { bar.style.width = toPct + '%'; return; }
    bar.style.width = '100%';
    setTimeout(() => { if (!bar.isConnected) return; bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth; bar.style.transition = ''; bar.style.width = toPct + '%'; }, 430);
  };
  const once = (el, cls, ms) => { if (!el || quiet()) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms || 900); };
  UI.act('detailFeed', (el) => {
    const ov = el.closest('.overlay'), uid = +el.dataset.uid, kind = el.dataset.kind, s = st(), inst = R.inst(s, uid); if (!inst) return;
    const pre = R.Prog.feedPreview(s, inst, kind), statsB = R.statsWithGear(s, inst), lvB = inst.lv, food0 = s.res.food;
    if (pre && pre.ok && pre.levels) P.holdUntil = Date.now() + 1700; // an evolution notice waits for the level-up to be seen
    const r = UI.doFeed(uid, kind, el, { inline: true });
    const now = R.inst(st(), uid); if (!now) return;
    UI.detail(now.sp, { uid, ov });
    const col = [...$('#modal-root').children].find((x) => x !== ov && x._collection); if (col) UI.collection(col);
    const head = $('.pg-head', ov);
    if (!r || !r.ok) {
      // nothing was spent: say why, where the player is looking
      const k = D.SNACKS[kind];
      say(ov, r && r.reason === 'max' ? 'Highest level reached: feeding cannot raise it further.' : 'Not enough food: ' + k.name + ' needs ' + k.food + ', you have ' + food0 + ' (' + (k.food - food0) + ' short). Berry farms and rewards give food.', 'bad', 4200);
      once($('.pg-feed[data-kind="' + kind + '"]', ov), 'pg-shake', 400); once($('.pg-food', ov), 'pg-flash', 700);
      return;
    }
    const L = R.Prog.level(now), levels = r.levels.length;
    fillBar($('.pg-head .bar > i', ov), L.pct, levels); fillBar($('.inst[data-uid="' + uid + '"] .bar > i', ov), L.pct, levels);
    once($('.pg-food', ov), 'pg-flash', 700);
    if (!levels) { say(ov, '+' + r.xp + ' XP · ' + D.SNACKS[kind].food + ' food used', 'gain', 2400); return; }
    const a = statsB, b = R.statsWithGear(st(), now);
    say(ov, 'Level up! Lv ' + lvB + ' → ' + now.lv + ' · ' + STATS().map(([k, name]) => name + ' +' + (b[k] - a[k])).join(' · '), 'levelup', 4200);
    Au.play('level'); UI.sparkles($('.detail .big', ov) || head, 12);
    once($('.pg-lv', ov), 'pg-pop', 900); ov.querySelectorAll('.pg-stats .stat').forEach((x) => once(x, 'pg-pulse', 1000));
  });
  // The evolution notice arrives through the event queue as soon as the level is reached. Give the level-up a moment
  // first, so the two never land on top of each other (the banner used to cover the prompt).
  const ep0 = UI.evoPrompt;
  if (ep0) UI.evoPrompt = function (uid, done, fromNotice) {
    const wait = fromNotice ? Math.max(P.holdUntil - Date.now(), document.querySelector('.banner-fx') ? 1800 : 0) : 0;
    if (wait > 0) { setTimeout(() => ep0(uid, done, fromNotice), wait); return null; }
    return ep0(uid, done, fromNotice);
  };
  // choosing one of several of the same species shows that one in the strip
  UI.act('instPick', (el) => { const ov = el.closest('.overlay'), uid = +el.dataset.uid, inst = R.inst(st(), uid); if (inst && ov) UI.detail(inst.sp, { uid, ov }); });
})(typeof window !== 'undefined' ? window : globalThis);
