/* Aminas — the Forge interface (Dev 7). Four tabs on one shared equipment inventory:
   Crafting, Equipment, Equipment Merge, Equipment Shop. Every paying action asks for confirmation; the confirmation
   carries one operation id, so tapping Confirm twice (or a repeated click) can only apply once (R.Forge refuses a
   repeated id). Item icons are small pixel sprites drawn in the tier's colour. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, Art = A.Art, UI = A.UI, Au = A.Audio, F = A.Rules.Forge;
  const { esc, chip, artBox } = UI.h, I = Art.icon;
  const $ = (s, r) => (r || document).querySelector(s);
  const st = () => S.state;
  const TABS = [['craft', 'Crafting'], ['equip', 'Equipment'], ['merge', 'Equipment Merge'], ['shop', 'Equipment Shop']];
  UI.FORGE_TABS = TABS.map((t) => t[1]);

  /* ---------- pixel icons (12×12) ---------- */
  const PIX = {
    club: ['.......####.', '......######', '......######', '.......####.', '......##....', '.....##.....', '....##......', '...##.......', '..##........', '.##.........', '##..........', '............'],
    fang: ['....##......', '...####.....', '...#####....', '....#####...', '.....#####..', '......####..', '.......###..', '........##..', '.........#..', '............', '............', '............'],
    spear: ['..........##', '.........###', '........###.', '.......##...', '......##....', '.....##.....', '....##......', '...##.......', '..##........', '.##.........', '##..........', '............'],
    axe: ['.......####.', '......######', '......######', '.....##.###.', '....##......', '...##.......', '..##........', '.##.........', '##..........', '............', '............', '............'],
    blade: ['..........#.', '.........###', '........###.', '.......###..', '......###...', '.....###....', '..#.###.....', '...###......', '..##.#......', '.##.........', '##..........', '............'],
    vest: ['..##....##..', '.####..####.', '############', '############', '.##########.', '.##########.', '.##########.', '.##########.', '.##########.', '..########..', '............', '............'],
    shell: ['....####....', '..########..', '.###.##.###.', '############', '##.##.##.###', '############', '.###.##.###.', '..########..', '....####....', '............', '............', '............'],
    mantle: ['....####....', '...######...', '..########..', '..########..', '.##########.', '.##########.', '############', '############', '###.####.###', '##..####..##', '............', '............'],
    obsidian: ['.....##.....', '....####....', '...######...', '..########..', '.###.##.###.', '############', '.##########.', '..########..', '...######...', '....####....', '.....##.....', '............'],
    sun: ['.....##.....', '..#..##..#..', '...######...', '..########..', '##########.#', '.##########.', '..########..', '...######...', '..#..##..#..', '.....##.....', '............', '............'],
    moon: ['....####....', '..######....', '.#####......', '.####.......', '####........', '####........', '####........', '.####.......', '.#####......', '..######....', '....####....', '............'],
    echo: ['....####....', '...######...', '..##....##..', '.##..##..##.', '.##.####.##.', '.##.####.##.', '.##..##..##.', '..##....##..', '...######...', '....####....', '............', '............'],
    feather: ['.........###', '........####', '.......####.', '......####..', '.....####...', '....####....', '...####.....', '..###.......', '.##.........', '#...........', '............', '............'],
    eye: ['............', '...######...', '.##########.', '###..##..###', '##..####..##', '##..####..##', '###..##..###', '.##########.', '...######...', '............', '............', '............'],
  };
  const TIER_COL = { common: ['#c9c2b0', '#8f8a83'], uncommon: ['#8fe08a', '#3f9a3f'], rare: ['#7cc4ff', '#2f6fc4'], epic: ['#d7a0ff', '#8a4ad8'], mythic: ['#ffd86b', '#c9962a'] };
  const iconCache = {};
  UI.itemIcon = function (id, size) {
    const d = D.ITEMS[id]; if (!d) return '';
    const k = id + '@' + (size || 40); if (iconCache[k]) return iconCache[k];
    const g = PIX[d.icon] || PIX.vest, [c1, c2] = TIER_COL[d.rarity] || TIER_COL.common;
    let r = '';
    g.forEach((row, y) => row.split('').forEach((ch, x) => { if (ch === '#') r += '<rect x="' + x + '" y="' + y + '" width="1.02" height="1.02" fill="' + ((x + y) % 5 === 0 || y > 7 ? c2 : c1) + '"/>'; }));
    return (iconCache[k] = '<svg class="gicon r-' + d.rarity + '" viewBox="-1 -1 14 14" width="' + (size || 40) + '" height="' + (size || 40) + '" aria-hidden="true" shape-rendering="crispEdges"><rect x="-1" y="-1" width="14" height="14" rx="2" fill="rgba(0,0,0,.28)"/>' + r + '</svg>');
  };
  const pctLine = (b) => Object.keys(b).map((k) => '+' + Math.round(b[k] * 100) + '% ' + { hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD' }[k]).join(', ');
  const tierTag = (d) => '<span class="tier t-' + d.rarity + '">' + (d.unique ? 'Unique' : 'Tier ' + D.GEAR_TIERS[d.tier].name + ' · ' + D.RARITY_LABEL[d.rarity]) + '</span>';
  const costChips = (s, c) => ['gold', 'food', 'gems'].filter((k) => c && c[k]).map((k) => '<span class="cost ' + ((s.res[k] | 0) >= c[k] ? '' : 'short') + '">' + I(k === 'gems' ? 'gem' : k) + c[k].toLocaleString('en-GB') + '</span>').join('');
  const itemRow = (id, extra, cls, attrs) => { const d = D.ITEMS[id]; return '<div class="fitem ' + (cls || '') + '" ' + (attrs || '') + '>' + UI.itemIcon(id) + '<div class="fi-b"><b>' + esc(d.name) + '</b> ' + tierTag(d) + '<div class="fi-fx">' + D.GEAR_SLOT_NAMES[d.slot] + ' · ' + pctLine(d.bonus) + '</div><div class="fi-d muted">' + esc(d.desc) + '</div></div>' + (extra || '') + '</div>'; };
  const resBar = (s) => '<div class="fres">' + ['gold', 'food', 'gems'].map((k) => '<span>' + I(k === 'gems' ? 'gem' : k) + '<b>' + (s.res[k] | 0).toLocaleString('en-GB') + '</b></span>').join('') + '</div>';

  /* ---------- the panel ---------- */
  UI.forgeState = { tab: 'craft', mon: null, a: null, b: null };
  UI.forge = function (tab, ovEx) {
    const s = st(), fs = UI.forgeState;
    if (!F.open(s)) { UI.toast('The Old Forge is still cold. Restore it first (after the Hatchery).', 't'); return null; }
    if (tab) fs.tab = tab;
    const lv = F.level(s);
    const tabs = '<div class="ftabs" role="tablist">' + TABS.map(([k, t]) => '<button class="ftab ' + (fs.tab === k ? 'on' : '') + '" role="tab" aria-selected="' + (fs.tab === k) + '" data-act="fTab" data-tab="' + k + '">' + t + '</button>').join('') + '</div>';
    const body = tabs + resBar(s) + '<div class="fpanel">' + (fs.tab === 'craft' ? craftTab(s, lv) : fs.tab === 'equip' ? equipTab(s) : fs.tab === 'merge' ? mergeTab(s, lv) : shopTab(s, lv)) + '</div>';
    const html = UI.sheet(I('hammer') + ' Old Forge <span class="lv">Lv ' + lv + '</span>', body, '<span class="muted small-t" style="margin-right:auto">' + R.items(s).length + ' item' + (R.items(s).length === 1 ? '' : 's') + ' in your bag. Upgrade the Forge for more recipes, higher merges and more stock.</span><button class="btn gold" data-act="close">Close</button>', 'wide forge');
    let ov = ovEx && ovEx.parentNode ? ovEx : null;
    if (ov) { const sc = $('.sh-body', ov).scrollTop; ov.innerHTML = html; $('.sh-body', ov).scrollTop = sc; } else { ov = UI.modal(html, { onClose: () => UI.refresh() }); }
    ov._forge = true;
    return ov;
  };
  const forgeOv = () => [...$('#modal-root').children].reverse().find((x) => x._forge) || null;
  const refresh = () => { const ov = forgeOv(); if (ov) UI.forge(null, ov); };
  UI.act('forge', () => { UI.closeAll(); UI.forge('craft'); });
  UI.act('fTab', (el) => { UI.forgeState.tab = el.dataset.tab; UI.forge(null, el.closest('.overlay')); });

  // A confirmation sheet. The op id is made once, when the sheet opens; Confirm is disabled after the first press.
  function confirmSheet(title, html, label, run) {
    const op = F.newOp('ui');
    const ov = UI.modal(UI.sheet(title, html, '<button class="btn ghost" data-act="close">Cancel</button><button class="btn gold" data-act="fConfirm">' + label + '</button>', 'narrow fconfirm'));
    ov._run = (btn) => { if (ov._done) return; ov._done = true; btn.disabled = true; const r = run(op); UI.close(ov); after(r); };
    return ov;
  }
  UI.act('fConfirm', (el) => { const ov = el.closest('.overlay'); if (ov && ov._run) ov._run(el); });
  function after(r) {
    if (r && r.ok) { Au.play('ok'); S.save(); R.drain(); UI.renderHud && UI.renderHud(); }
    else if (r) { Au.play('no'); if (r.reason !== 'duplicate') UI.toast(F.why(r) || 'That did not work.', 't'); }
    refresh();
    if (r && r.ok && r.msg) UI.toast(r.msg, 'c');
  }

  /* ---------- Tab 1: Crafting ---------- */
  function craftTab(s, lv) {
    return '<p class="muted small-t">Craft equipment from gold, food and gems. Crafted items go to your bag and can be equipped in the Equipment tab.</p>' +
      F.recipes(s).map((r) => {
        const c = F.craftCheck(s, r.item), why = c.ok ? '' : F.why(c);
        return itemRow(r.item, '<div class="fi-act"><div class="fi-cost">' + costChips(s, r.cost) + '</div>' + (r.unlocked ? '<button class="btn small ' + (c.ok ? 'gold' : 'off') + '" data-act="fCraft" data-id="' + r.item + '">Craft</button>' : '<span class="tagp sealed">' + I('lock') + ' Forge Lv ' + r.lv + '</span>') + (why && r.unlocked ? '<small class="bad">' + esc(why) + '</small>' : '') + '</div>', r.unlocked ? '' : 'locked');
      }).join('');
  }
  UI.act('fCraft', (el) => {
    const s = st(), id = el.dataset.id, c = F.craftCheck(s, id); if (!c.ok) { Au.play('no'); UI.toast(F.why(c), 't'); return; }
    const d = D.ITEMS[id];
    confirmSheet('Craft ' + esc(d.name) + '?', itemRow(id) + '<div class="kv"><b>Cost:</b> ' + costChips(s, c.cost) + '</div>', I('hammer') + ' Craft', (op) => { const r = F.craft(st(), id, op); if (r.ok) r.msg = 'Crafted ' + d.name + '. It is in your bag.'; return r; });
  });

  /* ---------- Tab 2: Equipment ---------- */
  function equipTab(s) {
    const fs = UI.forgeState, list = s.aminas.slice().sort((a, b) => (b.uid === s.active) - (a.uid === s.active) || b.lv - a.lv);
    if (!list.length) return '<p class="muted">You have no Aminas yet.</p>';
    if (!R.inst(s, fs.mon)) fs.mon = list[0].uid;
    const inst = R.inst(s, fs.mon), sp = D.SPECIES[inst.sp], base = R.statsAt(inst.sp, inst.lv), eff = R.statsWithGear(s, inst), busy = s.run && (s.run.uids || []).indexOf(inst.uid) >= 0;
    const mons = '<div class="fmons">' + list.map((a) => '<button class="fmon ' + (a.uid === fs.mon ? 'on' : '') + '" data-act="fMon" data-uid="' + a.uid + '">' + artBox(a.sp) + '<small>' + esc(D.SPECIES[a.sp].name) + ' · ' + a.lv + '</small></button>').join('') + '</div>';
    const stats = '<div class="fstats">' + [['HP', 'hp'], ['ATK', 'atk'], ['DEF', 'def'], ['SPD', 'spd']].map(([t, k]) => '<div class="stat">' + t + '<b>' + eff[k] + '</b><em class="' + (eff[k] > base[k] ? 'good' : 'muted') + '">' + (eff[k] > base[k] ? '+' + (eff[k] - base[k]) : 'base ' + base[k]) + '</em></div>').join('') + '</div>';
    const g = R.gearOf(inst);
    const slots = '<div class="fslots">' + D.GEAR_SLOTS.map((k) => { const it = g[k] != null ? R.item(s, g[k]) : null; return '<div class="fslot"><small>' + D.GEAR_SLOT_NAMES[k] + '</small>' + (it ? UI.itemIcon(it.id, 34) + '<b>' + esc(D.ITEMS[it.id].name) + '</b>' + (busy ? '' : '<button class="btn small ghost" data-act="fUnequip" data-slot="' + k + '">Remove</button>') : '<span class="muted">Empty</span>') + '</div>'; }).join('') + '</div>';
    const items = R.items(s).slice().sort((x, y) => D.GEAR_SLOTS.indexOf(D.ITEMS[x.id].slot) - D.GEAR_SLOTS.indexOf(D.ITEMS[y.id].slot) || D.ITEMS[y.id].tier - D.ITEMS[x.id].tier || x.iid - y.iid);
    const inv = items.length ? items.map((it) => {
      const w = R.wearer(s, it.iid), mine = w && w.uid === inst.uid, wBusy = w && s.run && (s.run.uids || []).indexOf(w.uid) >= 0;
      const tag = w ? '<span class="wtag ' + (mine ? 'mine' : '') + '">' + (mine ? 'Equipped' : 'On ' + esc(D.SPECIES[w.sp].name) + ' (Lv ' + w.lv + ')') + '</span>' : '<span class="wtag free">In the bag</span>';
      const btn = busy || wBusy ? '' : mine ? '<button class="btn small ghost" data-act="fUnequip" data-slot="' + D.ITEMS[it.id].slot + '">Remove</button>' : '<button class="btn small" data-act="fEquip" data-iid="' + it.iid + '">' + (w ? 'Move here' : 'Equip') + '</button>';
      return itemRow(it.id, '<div class="fi-act">' + tag + btn + '</div>', w ? 'worn' : '');
    }).join('') : '<p class="muted">No equipment yet. Craft, merge or buy some in the other tabs.</p>';
    return mons + '<div class="fsel"><div class="fsel-art">' + artBox(inst.sp) + '</div><div><h3>' + esc(sp.name) + ' ' + chip(sp.el) + ' <span class="muted">Lv ' + inst.lv + '</span></h3>' + stats + (busy ? '<p class="bad small-t">In a dungeon run: equipment is locked until the run ends.</p>' : '') + slots + '</div></div><div class="section-t">All equipment</div>' + inv;
  }
  UI.act('fMon', (el) => { UI.forgeState.mon = +el.dataset.uid; refresh(); });
  UI.act('fEquip', (el) => { const r = R.equip(st(), UI.forgeState.mon, +el.dataset.iid); after(r.ok ? r : Object.assign(r, { reason: r.reason === 'busy' ? 'busy' : 'invalid' })); });
  UI.act('fUnequip', (el) => { const r = R.unequip(st(), UI.forgeState.mon, el.dataset.slot); after(r.ok ? r : { ok: false, reason: 'busy' }); });

  /* ---------- Tab 3: Equipment Merge ---------- */
  function mergeTab(s, lv) {
    const fs = UI.forgeState;
    if (fs.a != null && !R.item(s, fs.a)) fs.a = null; if (fs.b != null && !R.item(s, fs.b)) fs.b = null;
    const slotBox = (k) => { const it = fs[k] != null ? R.item(s, fs[k]) : null; return '<button class="mslot ' + (it ? 'set' : '') + '" data-act="fPick" data-k="' + k + '">' + (it ? UI.itemIcon(it.id, 44) + '<b>' + esc(D.ITEMS[it.id].name) + '</b>' + tierTag(D.ITEMS[it.id]) + '<small>' + pctLine(D.ITEMS[it.id].bonus) + '</small>' : I('plus') + '<span class="muted">Choose item ' + (k === 'a' ? '1' : '2') + '</span>') + '</button>'; };
    let preview = '<div class="mres empty muted">Choose two items of the same line and tier.</div>', act = '';
    if (fs.a != null && fs.b != null) {
      const c = F.mergeCheck(s, fs.a, fs.b);
      if (c.result) {
        const d = D.ITEMS[c.result];
        preview = '<div class="mres">' + UI.itemIcon(c.result, 52) + '<b>' + esc(d.name) + '</b>' + tierTag(d) + '<small class="good">' + pctLine(d.bonus) + '</small><div class="kv">Cost: ' + costChips(s, c.cost) + '</div></div>';
      }
      if (c.ok) {
        const w = c.wearers.map((u) => D.SPECIES[R.inst(s, u).sp].name);
        act = (w.length ? '<p class="warn small-t">' + I('lock') + ' Equipped on ' + esc(w.join(' and ')) + '. Merging takes it off; the new item goes back onto ' + esc(D.SPECIES[R.inst(s, c.equipTo).sp].name) + '.</p>' : '') + '<button class="btn gold" data-act="fMerge">' + I('spark') + ' Merge</button>';
      } else act = '<p class="bad small-t">' + esc(F.why(c)) + '</p>';
    }
    const rules = '<details class="mrules"><summary>How merging works</summary><ul><li>Two items of the same line and tier make one item of the next tier (I → II → III → IV).</li><li>Both items are used up. The result is shown before you confirm.</li><li>Cost: Tier II ' + D.FORGE.merge[2].gold + ' gold, Tier III ' + D.FORGE.merge[3].gold + ' gold (Forge Lv ' + D.FORGE.merge[3].lv + '), Tier IV ' + D.FORGE.merge[4].gold + ' gold (Forge Lv ' + D.FORGE.merge[4].lv + ').</li><li>Unique items and top-tier items cannot be merged.</li></ul></details>';
    return '<div class="mrow">' + slotBox('a') + '<span class="mop">+</span>' + slotBox('b') + '<span class="mop">' + I('arrow') + '</span>' + preview + '</div><div class="mact">' + act + '</div>' + rules;
  }
  UI.act('fPick', (el) => {
    const s = st(), fs = UI.forgeState, k = el.dataset.k, other = fs[k === 'a' ? 'b' : 'a'], o = other != null ? R.item(s, other) : null;
    const items = R.items(s).slice().sort((x, y) => (D.ITEMS[x.id].family || 'z').localeCompare(D.ITEMS[y.id].family || 'z') || D.ITEMS[x.id].tier - D.ITEMS[y.id].tier);
    const rows = items.map((it) => {
      let why = '';
      if (o && it.iid === o.iid) why = 'Already chosen';
      else if (o) { const r = F.mergeResult(o.id, it.id); if (!r.ok) why = F.why(r); }
      else if (D.ITEMS[it.id].unique) why = F.WHY.unique;
      else if (!F.partners(s, it.iid).length) why = 'No matching item to merge with yet';
      const w = R.wearer(s, it.iid);
      return itemRow(it.id, '<div class="fi-act">' + (w ? '<span class="wtag">On ' + esc(D.SPECIES[w.sp].name) + '</span>' : '') + (why ? '<small class="muted">' + esc(why) + '</small>' : '<button class="btn small gold" data-act="fPickSet" data-k="' + k + '" data-iid="' + it.iid + '">Choose</button>') + '</div>', why ? 'dis' : '');
    }).join('') || '<p class="muted">Your bag is empty.</p>';
    UI.modal(UI.sheet('Choose item ' + (k === 'a' ? '1' : '2'), rows, '<button class="btn ghost" data-act="close">Cancel</button>', 'wide'));
  });
  UI.act('fPickSet', (el) => { UI.forgeState[el.dataset.k] = +el.dataset.iid; UI.close(el.closest('.overlay')); refresh(); });
  UI.act('fMerge', () => {
    const s = st(), fs = UI.forgeState, c = F.mergeCheck(s, fs.a, fs.b); if (!c.ok) { Au.play('no'); UI.toast(F.why(c), 't'); return; }
    const d = D.ITEMS[c.result], a = R.item(s, fs.a), b = R.item(s, fs.b), eq = c.wearers.length > 0;
    const html = '<div class="mconf">' + UI.itemIcon(a.id, 40) + '<span class="mop">+</span>' + UI.itemIcon(b.id, 40) + '<span class="mop">' + I('arrow') + '</span>' + UI.itemIcon(c.result, 52) + '</div>' + itemRow(c.result) +
      '<div class="kv"><b>Cost:</b> ' + costChips(s, c.cost) + '</div><p class="small-t">' + esc(D.ITEMS[a.id].name) + ' and ' + esc(D.ITEMS[b.id].name) + ' will be used up.' + (eq ? ' The equipped item is taken off, and ' + esc(d.name) + ' goes onto ' + esc(D.SPECIES[R.inst(s, c.equipTo).sp].name) + '.' : '') + '</p>';
    const ia = fs.a, ib = fs.b;
    confirmSheet('Merge into ' + esc(d.name) + '?', html, I('spark') + ' Merge', (op) => { const r = F.merge(st(), ia, ib, op, { confirmEquipped: eq }); if (r.ok) { r.msg = 'Merged into ' + d.name + '.'; UI.forgeState.a = UI.forgeState.b = null; } return r; });
  });

  /* ---------- Tab 4: Equipment Shop ---------- */
  function shopTab(s, lv) {
    return '<p class="muted small-t">Buy equipment with gold. Prices reflect each item’s strength; crafting is cheaper in gold but also uses food or gems.</p>' +
      F.shop(s).map((o) => { const c = F.buyCheck(s, o.item), why = c.ok ? '' : F.why(c);
        return itemRow(o.item, '<div class="fi-act"><div class="fi-cost"><span class="cost ' + ((s.res.gold | 0) >= o.price ? '' : 'short') + '">' + I('gold') + o.price.toLocaleString('en-GB') + '</span></div>' + (o.unlocked ? '<button class="btn small ' + (c.ok ? 'gold' : 'off') + '" data-act="fBuy" data-id="' + o.item + '">Buy</button>' : '<span class="tagp sealed">' + I('lock') + ' Forge Lv ' + o.lv + '</span>') + (why && o.unlocked ? '<small class="bad">' + esc(why) + '</small>' : '') + '</div>', o.unlocked ? '' : 'locked'); }).join('');
  }
  UI.act('fBuy', (el) => {
    const s = st(), id = el.dataset.id, c = F.buyCheck(s, id); if (!c.ok) { Au.play('no'); UI.toast(F.why(c), 't'); return; }
    const d = D.ITEMS[id];
    confirmSheet('Buy ' + esc(d.name) + '?', itemRow(id) + '<div class="kv"><b>Price:</b> ' + I('gold') + ' ' + c.price.toLocaleString('en-GB') + ' · <b>Your gold:</b> ' + (s.res.gold | 0).toLocaleString('en-GB') + ' → ' + ((s.res.gold | 0) - c.price).toLocaleString('en-GB') + '</div>', I('gold') + ' Buy', (op) => { const r = F.buy(st(), id, op); if (r.ok) r.msg = 'Bought ' + d.name + '. It is in your bag.'; return r; });
  });
})(typeof window !== 'undefined' ? window : globalThis);
