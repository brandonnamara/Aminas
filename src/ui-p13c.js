/* Aminas — Phase 13C: equipment changes with a preview (presentation only).
   Equipping, moving or removing an item now shows what it does before anything changes: the item that leaves the
   slot, the item that goes in, the Amina's HP, ATK, DEF and SPD before and after, and what the Amina that gives the
   item up loses. One sheet serves the Forge's Equipment tab and the Gear tab of the monster details screen.
   The rules (three slots, any item fits any Amina, locked during a dungeon run, bonuses applied once in battle) are
   untouched; the numbers come from R.Gear (src/gear-view.js) and are checked against the real result in tests. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Au = A.Audio, UI = A.UI, Art = A.Art, F = R.Forge, G = R.Gear;
  const { esc } = UI.h, I = Art.icon, st = () => S.state, $ = (s, r) => (r || document).querySelector(s);
  const P = (UI.P13C = {});
  const quiet = () => (UI.calm && UI.calm()) || document.body.classList.contains('perf-saver') || document.body.classList.contains('calm');
  P.quiet = quiet;
  const NAMES = { hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD' };
  const pctLine = (b) => Object.keys(b).map((k) => '+' + Math.round(b[k] * 1000) / 10 + '% ' + NAMES[k]).join(', ');
  P.pctLine = pctLine;
  const tierTag = (d) => '<span class="tier t-' + d.rarity + '">' + (d.unique ? 'Unique' : 'Tier ' + D.GEAR_TIERS[d.tier].name + ' · ' + D.RARITY_LABEL[d.rarity]) + '</span>';
  P.tierTag = tierTag;
  const nameOf = (inst) => D.SPECIES[inst.sp].name;

  // HP, ATK, DEF, SPD before and after a change. Unchanged stats are shown plainly; gains green, losses red.
  P.statRows = function (before, after, cap) {
    return (cap ? '<div class="pg-cap">' + cap + '</div>' : '') + '<div class="pg-evostats gx-stats">' + G.STATS.map(([k, name]) => { const d = after[k] - before[k]; return '<div class="pg-es ' + (d > 0 ? 'up' : d < 0 ? 'down' : 'same') + '" data-stat="' + k + '"><small>' + name + '</small> <span>' + before[k] + '</span> <i>→</i> <b>' + after[k] + '</b> <em>' + (d > 0 ? '+' + d : d < 0 ? '−' + -d : 'no change') + '</em></div>'; }).join('') + '</div>';
  };
  // the short form used in lists: only the stats that change
  P.deltaChips = function (diff) {
    const ks = Object.keys(NAMES).filter((k) => diff[k]);
    return ks.length ? ks.map((k) => '<span class="gx-d ' + (diff[k] > 0 ? 'up' : 'down') + '">' + NAMES[k] + ' ' + (diff[k] > 0 ? '+' : '−') + Math.abs(diff[k]) + '</span>').join('') : '<span class="gx-d same">No change</span>';
  };
  P.itemBox = function (it, label) {
    if (!it) return '<div class="gx-item empty"><div class="gx-q">' + I('plus') + '</div><div><small>' + (label || '') + '</small><b class="muted">Empty slot</b></div></div>';
    const d = D.ITEMS[it.id];
    return '<div class="gx-item r-' + d.rarity + '">' + UI.itemIcon(it.id, 34) + '<div><small>' + (label || '') + '</small><b>' + esc(d.name) + '</b> ' + tierTag(d) + '<div class="fi-fx">' + pctLine(d.bonus) + '</div></div></div>';
  };

  // Whoever is showing equipment redraws from the game after a change.
  P.refreshAll = function (uid) {
    [...$('#modal-root').children].forEach((ov) => {
      if (ov._forge && UI.forge) UI.forge(null, ov);
      else if (ov._detail && ov._uid != null) { const inst = R.inst(st(), ov._uid); if (inst && (uid == null || inst.uid === uid || true)) UI.detail(inst.sp, { uid: inst.uid, ov, tab: (ov.querySelector('.dtab.on') || {}).dataset ? ov.querySelector('.dtab.on').dataset.tab : undefined }); }
    });
    UI.renderHud && UI.renderHud();
  };
  const WHY = { busy: 'In a dungeon run: equipment is locked until the run ends.', invalid: 'That item is no longer there.', same: 'It is already wearing this.', empty: 'That slot is already empty.' };
  P.note = null; // the last result, shown in place by the Forge and the Gear tab
  const say = (text, cls, extra) => { P.note = Object.assign({ text, cls: cls || 'good', at: Date.now() }, extra || {}); };
  P.say = say; P.WHY = WHY;

  // Equip (or move) an item: the preview, then one confirmation that can only apply once.
  P.equipAsk = function (uid, iid) {
    const s = st(), p = G.equipPreview(s, uid, iid);
    if (!p.ok) { Au.play('no'); say(WHY[p.reason] || 'That did not work.', 'bad'); P.refreshAll(uid); return null; }
    const inst = R.inst(s, uid);
    const body = '<div class="gx-swap">' + P.itemBox(p.current, 'Now in ' + p.slotName.toLowerCase() + ' slot') + '<span class="mop">' + I('arrow') + '</span>' + P.itemBox(p.item, p.from ? 'From ' + nameOf(p.from) : 'From your bag') + '</div>' +
      P.statRows(p.before, p.after, esc(nameOf(inst)) + ' · Lv ' + inst.lv) +
      (p.from ? P.statRows(p.fromBefore, p.fromAfter, esc(nameOf(p.from)) + ' · Lv ' + p.from.lv + ' gives it up') : '') +
      '<p class="small-t muted gx-fine">' + (p.current ? esc(p.currentDef.name) + ' goes back to your bag. ' : '') + 'Any item fits any Amina; these numbers are what it fights with.</p>';
    const ov = UI.modal(UI.sheet((p.from ? 'Move ' : 'Equip ') + esc(p.def.name) + '?', body, '<button class="btn ghost" data-act="close">Cancel</button><button class="btn gold" data-act="gxConfirm">' + I('check') + (p.from ? ' Move here' : p.current ? ' Swap' : ' Equip') + '</button>', 'narrow gx-confirm'));
    ov._run = (btn) => {
      if (ov._done) return; ov._done = true; btn.disabled = true;
      const r = R.equip(st(), uid, iid); UI.close(ov);
      if (r.ok) { Au.play('ok'); S.save(); R.drain(); say(nameOf(inst) + ' now wears ' + p.def.name + ': ' + (Object.keys(NAMES).filter((k) => p.diff[k]).map((k) => NAMES[k] + ' ' + p.before[k] + ' → ' + p.after[k]).join(', ') || 'no change') + '.', 'good', { uid, slot: p.slot }); }
      else { Au.play('no'); say(WHY[r.reason] || 'That did not work. Nothing was changed.', 'bad'); }
      P.refreshAll(uid);
    };
    return ov;
  };
  P.unequipAsk = function (uid, slot) {
    const s = st(), p = G.unequipPreview(s, uid, slot);
    if (!p.ok) { Au.play('no'); say(WHY[p.reason] || 'That did not work.', 'bad'); P.refreshAll(uid); return null; }
    const inst = R.inst(s, uid);
    const body = '<div class="gx-swap">' + P.itemBox(p.current, 'Now in ' + p.slotName.toLowerCase() + ' slot') + '<span class="mop">' + I('arrow') + '</span>' + P.itemBox(null, 'After') + '</div>' + P.statRows(p.before, p.after, esc(nameOf(inst)) + ' · Lv ' + inst.lv) +
      '<p class="small-t muted gx-fine">' + esc(p.currentDef.name) + ' goes back to your bag. Nothing is lost.</p>';
    const ov = UI.modal(UI.sheet('Remove ' + esc(p.currentDef.name) + '?', body, '<button class="btn ghost" data-act="close">Cancel</button><button class="btn gold" data-act="gxConfirm">Remove</button>', 'narrow gx-confirm'));
    ov._run = (btn) => {
      if (ov._done) return; ov._done = true; btn.disabled = true;
      const r = R.unequip(st(), uid, slot); UI.close(ov);
      if (r.ok) { Au.play('ok'); S.save(); R.drain(); say(p.currentDef.name + ' is back in your bag.', 'good', { uid, slot }); } else { Au.play('no'); say(WHY[r.reason] || 'That did not work. Nothing was changed.', 'bad'); }
      P.refreshAll(uid);
    };
    return ov;
  };
  UI.act('gxConfirm', (el) => { const ov = el.closest('.overlay'); if (ov && ov._run) ov._run(el); });
  // a result line that stays a few seconds where the player is looking
  P.noteHtml = function (extra) {
    const n = P.note; if (!n || Date.now() - n.at > 6000) return '<div class="gx-note" role="status" aria-live="polite"></div>';
    return '<div class="gx-note ' + n.cls + (Date.now() - n.at < 400 && !quiet() ? ' said' : '') + '" role="status" aria-live="polite">' + I(n.cls === 'bad' ? 'close' : 'check') + '<span>' + esc(n.text) + '</span>' + (extra || '') + '</div>';
  };

  /* ---------------- the Gear tab of the monster details screen ---------------- */
  UI.gearHtml = function (s, inst) {
    const busy = s.run && (s.run.uids || []).indexOf(inst.uid) >= 0, tot = R.gearBonus(s, inst), base = R.statsAt(inst.sp, inst.lv), eff = R.statsWithGear(s, inst);
    const rows = G.slots(s, inst).map((x) => {
      const n = R.items(s).filter((it) => D.ITEMS[it.id].slot === x.slot && !(x.item && it.iid === x.item.iid)).length;
      return '<div class="gslot gx-slot" data-slot="' + x.slot + '"><small>' + x.name + '</small>' + (x.item ? '<div class="gitem r-' + x.def.rarity + '">' + UI.itemIcon(x.item.id, 30) + '<div class="grow"><b>' + esc(x.def.name) + '</b> ' + tierTag(x.def) + '<br><small class="fi-fx">' + pctLine(x.def.bonus) + '</small></div></div>' : '<div class="gitem empty">Empty' + (n ? ' · ' + n + ' to choose from' : '') + '</div>') +
        (busy ? '' : '<div class="gx-btns">' + (x.item ? '<button class="btn small ghost" data-act="unequip" data-uid="' + inst.uid + '" data-slot="' + x.slot + '">Remove</button>' : '') + '<button class="btn small' + (n ? '' : ' off') + '" data-act="gearPick" data-uid="' + inst.uid + '" data-slot="' + x.slot + '">' + (x.item ? 'Change' : 'Equip') + '</button></div>') + '</div>';
    }).join('');
    const total = G.STATS.filter(([k]) => eff[k] !== base[k]).map(([k, name]) => name + ' ' + base[k] + ' → <b class="good">' + eff[k] + '</b>').join(' · ');
    return '<div class="gear">' + rows + '</div>' + (P.note && P.note.uid === inst.uid ? P.noteHtml() : '') +
      '<div class="kv muted small-t">' + (busy ? I('lock') + ' Equipment is locked during a dungeon run. ' : '') + (total ? 'With equipment: ' + total + ' (' + pctLine(Object.fromEntries(Object.entries(tot).filter(([, v]) => v))) + ').' : 'No equipment yet: stats are the base values.') +
      ' Any item fits any Amina. Equipment comes from the Forge, dungeon clears, ruin searches and survival milestones.' + (F.open(s) ? ' <button class="btn small ghost gx-forge" data-act="gxForge" data-uid="' + inst.uid + '">' + I('hammer') + 'Open Forge</button>' : '') + '</div>';
  };
  UI.act('gxForge', (el) => { UI.closeAll(); UI.forgeState.mon = +el.dataset.uid; UI.forge('equip'); });
  UI.act('gearPick', (el) => {
    if (el.classList.contains('off')) return;
    const s = st(), uid = +el.dataset.uid, slot = el.dataset.slot, parent = el.closest('.overlay');
    const list = G.choices(s, uid, slot).filter((c) => !c.mine).sort((a, b) => b.gain - a.gain || b.def.tier - a.def.tier);
    const body = list.length ? list.map((c) => '<div class="fitem gx-choice' + (c.preview.ok ? '' : ' dis') + '">' + UI.itemIcon(c.item.id) + '<div class="fi-b"><b>' + esc(c.def.name) + '</b> ' + tierTag(c.def) + '<div class="fi-fx">' + pctLine(c.def.bonus) + '</div><div class="gx-ds">' + P.deltaChips(c.preview.diff) + '</div></div><div class="fi-act"><span class="wtag ' + (c.wearer ? '' : 'free') + '">' + (c.wearer ? 'On ' + esc(nameOf(c.wearer)) + ' (Lv ' + c.wearer.lv + ')' : 'In the bag') + '</span>' +
      (c.preview.ok ? '<button class="btn small gold" data-act="equipIt" data-uid="' + uid + '" data-iid="' + c.item.iid + '">' + (c.wearer ? 'Move here' : 'Equip') + '</button>' : '<small class="bad">' + esc(WHY[c.preview.reason] || '') + '</small>') + '</div></div>').join('')
      : '<p class="muted">No other ' + D.GEAR_SLOT_NAMES[slot].toLowerCase() + ' yet. Craft or buy one at the Forge, or find one in dungeons, ruins and Survival.</p>';
    const ov = UI.modal(UI.sheet('Choose a ' + D.GEAR_SLOT_NAMES[slot].toLowerCase() + ' <span class="muted small-t">· for ' + esc(nameOf(R.inst(s, uid))) + '</span>', '<p class="muted small-t">Each item shows what it would change for this Amina compared with what it wears now.</p>' + body, '<button class="btn ghost" data-act="close">Cancel</button>', 'wide gx-pick')); ov._parent = parent;
  });
  UI.act('equipIt', (el) => { const ov = el.closest('.overlay'), uid = +el.dataset.uid, iid = +el.dataset.iid; UI.close(ov); P.equipAsk(uid, iid); });
  UI.act('unequip', (el) => P.unequipAsk(+el.dataset.uid, el.dataset.slot));
})(typeof window !== 'undefined' ? window : globalThis);
