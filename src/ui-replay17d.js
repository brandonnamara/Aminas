/* Aminas — Phase 17D UI: daily tasks and Codex milestones inside the existing Tasks sheet (same rows, same Claim and
   Go buttons), a Milestones button in the Creature Collection footer, and the Tasks badge counting what is ready.
   No new menu, HUD element or navigation. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Q = A.Quests, UI = A.UI, Au = A.Audio;
  const $ = (q, el) => (el || document).querySelector(q), st = () => S.state, I = (n) => (A.Art && A.Art.icon ? A.Art.icon(n) : '');
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), fmt = (n) => Number(n).toLocaleString('en-GB');
  const rw = (r) => ['gold', 'food', 'gems'].filter((k) => r[k]).map((k) => '<span>' + I(k === 'gems' ? 'gem' : k) + ' ' + fmt(r[k]) + '</span>').join('');

  // the Tasks badge also counts daily tasks and Codex milestones that are ready to claim
  const cl0 = Q.claimable;
  Q.claimable = function (s) { let n = cl0.apply(this, arguments); try { n += (R.Daily.ready(s) | 0) + (R.Codex.ready(s) | 0); } catch (e) {} return n; };

  function dailyHtml(s) {
    const L = R.Daily.list(s); if (!L) return '';
    const row = (x) => '<div class="mrow d17 ' + (x.ready ? 'ready' : x.claimed ? 'done' : '') + '" data-q="daily:' + x.k + '"><div><h3>' + esc(x.title) + (x.claimed ? ' ✓' : '') + (x.carried ? ' <span class="tagp">from an earlier day</span>' : '') + '</h3><p>' + esc(x.desc) + '</p>' +
      (x.claimed ? '' : '<ul class="objs"><li class="' + (x.cur >= x.need ? 'ok' : '') + '">' + (x.cur >= x.need ? I('check') : '<i class="dot"></i>') + esc(x.title) + ' <span class="muted">' + x.cur + '/' + x.need + '</span></li></ul>') + '<div class="rw">' + rw(x.reward) + '</div></div>' +
      (x.ready ? '<button class="btn gold" data-act="dClaim" data-id="' + x.id + '">Claim</button>' : x.claimed ? '' : '<button class="btn small" data-act="dGo" data-go="' + x.go + '">' + I('arrow') + 'Go</button>') + '</div>';
    const b = L.bonus, bonus = '<div class="mrow d17 bonus ' + (b.ready ? 'ready' : b.claimed ? 'done' : '') + '" data-q="daily:bonus"><div><h3>All three' + (b.claimed ? ' ✓' : '') + '</h3><p>Claim all of today’s tasks for a small extra.</p><div class="rw">' + rw(b.reward) + '</div></div>' + (b.ready ? '<button class="btn gold" data-act="dClaim" data-id="' + L.day + ':bonus">Claim</button>' : '') + '</div>';
    return '<div class="section-t" data-hl="daily">Today’s tasks <span class="muted">· optional</span></div><p class="muted small-t d17-note">New ones each day. Nothing is lost for skipping a day, and a finished task can still be claimed tomorrow.</p>' + L.carry.map(row).join('') + L.today.map(row).join('') + (L.today.length ? bonus : '');
  }
  function codexHtml(s) {
    const L = R.Codex.list(s), c = R.Codex.counts(s), T = D.CODEX17_TRACKS;
    // per track: whatever is ready, then the next one to work towards; claimed ones are counted, not listed
    const rows = Object.keys(T).map((tk) => { const ms = L.filter((m) => m.track === tk), ready = ms.filter((m) => m.ready), next = ms.find((m) => !m.claimed && !m.ready), got = ms.filter((m) => m.claimed).length;
      return ready.concat(next ? [next] : []).map((m) => '<div class="mrow cx17 ' + (m.ready ? 'ready' : '') + '" data-q="codex:' + m.id + '"><div><h3>' + esc(m.title) + '</h3><p>' + esc(T[tk].name) + ' · ' + got + ' of ' + ms.length + ' milestones claimed</p><ul class="objs"><li class="' + (m.ready ? 'ok' : '') + '">' + (m.ready ? I('check') : '<i class="dot"></i>') + esc(T[tk].name) + ' <span class="muted">' + m.cur + '/' + m.goal + '</span></li></ul><div class="rw">' + rw(m.reward) + '</div></div>' +
        (m.ready ? '<button class="btn gold" data-act="cxClaim" data-id="' + m.id + '">Claim</button>' : '<button class="btn small" data-act="collection">' + I('paw') + 'Codex</button>') + '</div>').join('') || '<p class="muted">' + esc(T[tk].name) + ': every milestone claimed.</p>'; }).join('');
    return '<div class="section-t" data-hl="codex">Codex milestones <span class="muted">· ' + c.species + ' of ' + c.total + ' species</span></div>' + rows;
  }
  const missions0 = UI.missions;
  UI.missions = function (ovEx, focusId) {
    const ov = missions0.call(this, ovEx, focusId && /^(daily|codex)/.test(focusId) ? null : focusId), s = st(), body = ov && $('.sh-body', ov);
    if (!body) return ov;
    const sc = body.scrollTop, d = document.createElement('div'); d.className = 'm17'; d.innerHTML = dailyHtml(s);
    body.insertBefore(d, body.firstChild);
    const cx = document.createElement('div'); cx.className = 'm17'; cx.innerHTML = codexHtml(s);
    const done = $('.donel', body); if (done) body.insertBefore(cx, done); else body.appendChild(cx);
    body.scrollTop = sc; if (UI.applyHl) UI.applyHl();
    if (focusId && /^(daily|codex)/.test(focusId)) { const t = $('[data-hl="' + focusId + '"]', ov); if (t) t.scrollIntoView({ block: 'start' }); }
    return ov;
  };
  const card = (kicker, title, r) => { const list = UI.Rewards.fromRes(r); if (UI.Rewards.card) UI.Rewards.card({ rarity: r.gems ? 'rare' : 'common', kicker, title, icon: I('scroll'), list }); };
  UI.act('dClaim', (el) => {
    if (el.dataset.busy) return; el.dataset.busy = '1';
    const ov = el.closest('.overlay'), r = R.Daily.claim(st(), el.dataset.id);
    if (!r.ok) { Au.play('no'); UI.toast(r.reason === 'claimed' ? 'Already claimed.' : 'Not finished yet.', 't'); if (ov) UI.missions(ov); return; }
    S.save(); Au.play('ok'); if (UI.sparkles) UI.sparkles(el, 12);
    const k = el.dataset.id.split(':')[1]; card('Daily task', k === 'bonus' ? 'All three' : D.DAILY17.tasks[k].title, r.reward);
    UI.afterAction(); if (ov && ov.parentNode) UI.missions(ov);
  });
  UI.act('cxClaim', (el) => {
    if (el.dataset.busy) return; el.dataset.busy = '1';
    const ov = el.closest('.overlay'), r = R.Codex.claim(st(), el.dataset.id);
    if (!r.ok) { Au.play('no'); if (ov) UI.missions(ov); return; }
    S.save(); Au.play('discover'); if (UI.sparkles) UI.sparkles(el, 16);
    card('Codex milestone', (D.CODEX17.find((m) => m.id === el.dataset.id) || {}).title || 'Milestone', r.reward);
    UI.afterAction(); if (ov && ov.parentNode) UI.missions(ov);
  });
  UI.act('dGo', (el) => {
    const g = el.dataset.go; UI.closeAll();
    if (g === 'dungeons' && UI.dungeons) UI.dungeons(); else if (g === 'collection') UI.collection(); else if (g === 'hatchery' && UI.hatchery) UI.hatchery();
    else if (g === 'defence' && UI.defence) UI.defence(); else if (g === 'explore' && UI.explore) UI.explore(); else UI.toast('Tap a building on your island when it has something ready.', 't');
  });
  // Creature Collection: a Milestones button beside Bag, with how many are ready
  const col0 = UI.collection;
  UI.collection = function () {
    const ov = col0.apply(this, arguments), s = st(), bag = ov && $('[data-act="bag"]', ov);
    if (bag && !$('[data-act="cxOpen"]', ov)) { const n = R.Codex.ready(s), b = document.createElement('button'); b.className = 'btn ghost'; b.dataset.act = 'cxOpen'; b.innerHTML = I('star') + ' Milestones' + (n ? ' <span class="badge17">' + n + '</span>' : ''); bag.parentNode.insertBefore(b, bag); }
    return ov;
  };
  UI.act('cxOpen', () => { UI.closeAll(); UI.missions(null, 'codex'); });
})(typeof window !== 'undefined' ? window : globalThis);
