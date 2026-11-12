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
  const G = () => R.Gear, P = () => UI.P13C;
  const NAMES = { hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD' }, num = (n) => n.toLocaleString('en-GB');
  const pctLine = (b) => Object.keys(b).map((k) => '+' + Math.round(b[k] * 1000) / 10 + '% ' + NAMES[k]).join(', ');
  const tierTag = (d) => '<span class="tier t-' + d.rarity + '">' + (d.unique ? 'Unique' : 'Tier ' + D.GEAR_TIERS[d.tier].name + ' · ' + D.RARITY_LABEL[d.rarity]) + '</span>';
  const resIco = (k) => I(k === 'gems' ? 'gem' : k), unit = (k, n) => (k === 'gems' ? (n === 1 ? 'gem' : 'gems') : k);
  const costChips = (s, c) => ['gold', 'food', 'gems'].filter((k) => c && c[k]).map((k) => '<span class="cost ' + ((s.res[k] | 0) >= c[k] ? '' : 'short') + '">' + resIco(k) + num(c[k]) + '</span>').join('');
  const itemRow = (id, extra, cls, attrs, more) => { const d = D.ITEMS[id]; return '<div class="fitem ' + (cls || '') + '" ' + (attrs || '') + '>' + UI.itemIcon(id) + '<div class="fi-b"><b>' + esc(d.name) + '</b> ' + tierTag(d) + '<div class="fi-fx">' + D.GEAR_SLOT_NAMES[d.slot] + ' · ' + pctLine(d.bonus) + '</div><div class="fi-d muted">' + esc(d.desc) + '</div>' + (more || '') + '</div>' + (extra || '') + '</div>'; };
  const resBar = (s) => '<div class="fres">' + ['gold', 'food', 'gems'].map((k) => '<span>' + resIco(k) + '<b>' + num(s.res[k] | 0) + '</b></span>').join('') + '</div>';
  const andList = (a) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const missing = (lines) => andList(lines.filter((l) => !l.ok).map((l) => num(l.short) + ' ' + unit(l.k, l.short)));
  const ownedTag = (n) => (n ? '<div class="fown small-t good">Owned ×' + n + '</div>' : '');
  // cost against what the player has, and what is left afterwards
  const costTable = (lines) => '<table class="fcost"><tr><th></th><th>Cost</th><th>You have</th><th>Left</th></tr>' + lines.map((l) => '<tr class="' + (l.ok ? '' : 'short') + '"><td>' + resIco(l.k) + ' ' + l.k + '</td> <td>' + num(l.need) + '</td> <td>' + num(l.have) + '</td> <td>' + (l.ok ? num(l.after) : '<span class="bad">' + num(l.short) + ' short</span>') + '</td></tr>').join('') + '</table>';
  const companion = (s) => R.inst(s, s.active) || s.aminas[0] || null;
  // what a new item would do for the companion, in one line
  const forCompanion = (s, id) => { const c = companion(s), w = c && G().wouldGive(s, c, id); if (!w) return ''; const ks = Object.keys(NAMES).filter((k) => w.diff[k]); return '<p class="small-t fex">On ' + esc(D.SPECIES[c.sp].name) + ' (Lv ' + c.lv + ') that is ' + (ks.length ? ks.map((k) => NAMES[k] + ' ' + (w.diff[k] > 0 ? '+' : '−') + Math.abs(w.diff[k])).join(', ') : 'no change') + ' compared with what it wears now.</p>'; };
  const bagLine = (s) => '<p class="small-t muted fex">It goes to your bag (' + R.items(s).length + ' of ' + D.MAX_ITEMS + ' items).';

  /* ---------- the panel ---------- */
  UI.forgeState = { tab: 'craft', mon: null, a: null, b: null, slot: null, fresh: null };
  UI.forge = function (tab, ovEx) {
    const s = st(), fs = UI.forgeState;
    if (!F.open(s)) { UI.toast('The Old Forge is still cold. Restore it first (after the Hatchery).', 't'); return null; }
    if (tab) fs.tab = tab;
    const lv = F.level(s), n = P().note, live = n && Date.now() - n.at <= 6000;
    const tabs = '<div class="ftabs" role="tablist">' + TABS.map(([k, t]) => '<button class="ftab ' + (fs.tab === k ? 'on' : '') + '" role="tab" aria-selected="' + (fs.tab === k) + '" data-act="fTab" data-tab="' + k + '">' + t + '</button>').join('') + '</div>';
    const bar = '<div class="fbar">' + P().noteHtml(live && n.goEquip != null && R.item(s, n.goEquip) && fs.tab !== 'equip' ? '<button class="btn small" data-act="fGoEquip" data-iid="' + n.goEquip + '">Equip it</button>' : '') + resBar(s) + '</div>';
    const body = tabs + bar + '<div class="fpanel">' + (fs.tab === 'craft' ? craftTab(s, lv) : fs.tab === 'equip' ? equipTab(s) : fs.tab === 'merge' ? mergeTab(s, lv) : shopTab(s, lv)) + '</div>';
    const up = D.BUILDINGS.forge.levels[lv], cnt = R.items(s).length;
    const html = UI.sheet(I('hammer') + ' Old Forge <span class="lv">Lv ' + lv + '</span>', body, '<span class="muted small-t" style="margin-right:auto">' + cnt + ' of ' + D.MAX_ITEMS + ' items in your bag. ' + (up ? 'Forge Lv ' + (lv + 1) + ' adds recipes, higher merges and more stock.' : 'The Forge is at its highest level.') + '</span><button class="btn gold" data-act="close">Close</button>', 'wide forge');
    let ov = ovEx && ovEx.parentNode ? ovEx : null;
    if (ov) { const sc = $('.sh-body', ov).scrollTop; ov.innerHTML = html; $('.sh-body', ov).scrollTop = sc; } else { ov = UI.modal(html, { onClose: () => UI.refresh() }); }
    ov._forge = true; fs.fresh = null;
    return ov;
  };
  const forgeOv = () => [...$('#modal-root').children].reverse().find((x) => x._forge) || null;
  const refresh = () => { const ov = forgeOv(); if (ov) UI.forge(null, ov); };
  UI.act('forge', () => { UI.closeAll(); UI.forge('craft'); });
  UI.act('fTab', (el) => { UI.forgeState.tab = el.dataset.tab; UI.forge(null, el.closest('.overlay')); });
  // "Equip it": the Equipment tab on the companion, showing the new item's slot
  UI.act('fGoEquip', (el) => { const s = st(), fs = UI.forgeState, it = R.item(s, +el.dataset.iid), c = companion(s); if (c) fs.mon = c.uid; fs.slot = it ? D.ITEMS[it.id].slot : null; fs.tab = 'equip'; P().note = null; const ov = el.closest('.overlay'); UI.forge(null, ov); $('.sh-body', ov).scrollTop = 0; });
  const refuse = (text) => { Au.play('no'); P().say(text, 'bad'); refresh(); };

  // A confirmation sheet. The op id is made once, when the sheet opens; Confirm is disabled after the first press.
  function confirmSheet(title, html, label, run) {
    const op = F.newOp('ui');
    const ov = UI.modal(UI.sheet(title, html, '<button class="btn ghost" data-act="close">Cancel</button><button class="btn gold" data-act="fConfirm">' + label + '</button>', 'narrow fconfirm'));
    ov._run = (btn) => { if (ov._done) return; ov._done = true; btn.disabled = true; const r = run(op); UI.close(ov); after(r); };
    return ov;
  }
  UI.act('fConfirm', (el) => { const ov = el.closest('.overlay'); if (ov && ov._run) ov._run(el); });
  // The result is reported in the Forge itself (the line beside the balances), not in a pop-up.
  function after(r) {
    if (r && r.ok) { Au.play(r.snd || 'ok'); S.save(); R.drain(); UI.renderHud && UI.renderHud(); if (r.msg) P().say(r.msg, 'good', r.note); }
    else if (r) { Au.play('no'); if (r.reason !== 'duplicate') P().say((F.why(r) || 'That did not work.') + ' Nothing was spent.', 'bad'); }
    refresh();
  }

  /* ---------- Tab 1: Crafting ---------- */
  function craftTab(s, lv) {
    const fs = UI.forgeState;
    return '<p class="muted small-t">Craft equipment from gold, food and gems. Crafted items go to your bag and can be equipped in the Equipment tab.</p>' +
      F.recipes(s).map((r) => {
        const p = G().craftPreview(s, r.item), why = p.ok || !r.unlocked ? '' : p.reason === 'cost' ? 'Missing ' + missing(p.lines) + '.' : F.why(p);
        return itemRow(r.item, '<div class="fi-act"><div class="fi-cost">' + costChips(s, r.cost) + '</div>' + (r.unlocked ? '<button class="btn small ' + (p.ok ? 'gold' : 'off') + '" data-act="fCraft" data-id="' + r.item + '"' + (p.ok ? '' : ' aria-disabled="true"') + '>Craft</button>' : '<span class="tagp sealed">' + I('lock') + ' Forge Lv ' + r.lv + '</span>') + (why ? '<small class="bad">' + esc(why) + '</small>' : '') + '</div>', (r.unlocked ? (p.ok ? 'can' : 'cannot') : 'locked') + (fs.fresh === r.item && !P().quiet() ? ' fresh' : ''), 'data-id="' + r.item + '"', ownedTag(p.owned));
      }).join('');
  }
  UI.act('fCraft', (el) => {
    const s = st(), id = el.dataset.id, p = G().craftPreview(s, id); if (!p.ok) return refuse(p.reason === 'cost' ? D.ITEMS[id].name + ': missing ' + missing(p.lines) + '.' : F.why(p));
    const d = D.ITEMS[id];
    confirmSheet('Craft ' + esc(d.name) + '?', itemRow(id) + forCompanion(s, id) + costTable(p.lines) + bagLine(s) + (p.owned ? ' You already own ' + p.owned + '.' : '') + '</p>', I('hammer') + ' Craft', (op) => { const r = F.craft(st(), id, op); if (r.ok) { r.msg = 'Crafted ' + d.name + '. It is in your bag.'; r.note = { goEquip: r.item.iid }; UI.forgeState.fresh = id; } return r; });
  });

  /* ---------- Tab 2: Equipment ---------- */
  function equipTab(s) {
    const fs = UI.forgeState, list = s.aminas.slice().sort((a, b) => (b.uid === s.active) - (a.uid === s.active) || b.lv - a.lv);
    if (!list.length) return '<p class="muted">You have no Aminas yet.</p>';
    if (!R.inst(s, fs.mon)) fs.mon = list[0].uid;
    if (fs.slot && D.GEAR_SLOTS.indexOf(fs.slot) < 0) fs.slot = null;
    const inst = R.inst(s, fs.mon), sp = D.SPECIES[inst.sp], base = R.statsAt(inst.sp, inst.lv), eff = R.statsWithGear(s, inst), busy = s.run && (s.run.uids || []).indexOf(inst.uid) >= 0;
    const mons = '<div class="fmons">' + list.map((a) => { const g = R.gearOf(a); return '<button class="fmon ' + (a.uid === fs.mon ? 'on' : '') + '" data-act="fMon" data-uid="' + a.uid + '" aria-label="' + esc(D.SPECIES[a.sp].name) + ', level ' + a.lv + ', ' + D.GEAR_SLOTS.filter((k) => g[k] != null).length + ' of 3 slots filled">' + artBox(a.sp) + '<small>' + esc(D.SPECIES[a.sp].name) + ' · ' + a.lv + '</small><span class="fpips">' + D.GEAR_SLOTS.map((k) => '<i class="' + (g[k] != null ? 'on' : '') + '"></i>').join('') + '</span></button>'; }).join('') + '</div>';
    const stats = '<div class="fstats">' + G().STATS.map(([k, t]) => '<div class="stat" data-stat="' + k + '">' + t + ' <b>' + eff[k] + '</b> <em class="' + (eff[k] !== base[k] ? 'good' : 'muted') + '">' + (eff[k] !== base[k] ? '+' + (eff[k] - base[k]) + ' from gear' : 'base') + '</em></div>').join('') + '</div>';
    const slots = '<div class="fslots">' + G().slots(s, inst).map((x) => '<div class="fslot' + (fs.slot === x.slot ? ' on' : '') + (x.def ? ' r-' + x.def.rarity : '') + '" data-slot="' + x.slot + '"><small>' + x.name + '</small>' + (x.item ? UI.itemIcon(x.item.id, 30) + '<b>' + esc(x.def.name) + '</b><span class="fi-fx">' + pctLine(x.def.bonus) + '</span>' : '<span class="muted">Empty</span>') + (busy ? '' : '<div class="fslot-b">' + (x.item ? '<button class="btn small ghost" data-act="fUnequip" data-slot="' + x.slot + '">Remove</button>' : '') + '<button class="btn small ghost" data-act="fFilt" data-slot="' + x.slot + '">' + (x.item ? 'Change' : 'Choose') + '</button></div>') + '</div>').join('') + '</div>';
    const all = R.items(s), cnt = (k) => all.filter((it) => D.ITEMS[it.id].slot === k).length;
    const filt = '<div class="ffilt">' + [[null, 'All', all.length], ['weapon', 'Weapons', cnt('weapon')], ['armour', 'Armour', cnt('armour')], ['charm', 'Charms', cnt('charm')]].map(([k, t, n]) => '<button class="fchip' + ((fs.slot || null) === k ? ' on' : '') + '" data-act="fFilt" data-slot="' + (k || '') + '">' + t + ' <span class="muted">' + n + '</span></button>').join('') + '</div>';
    const rows = G().choices(s, inst.uid, fs.slot || null).sort((x, y) => D.GEAR_SLOTS.indexOf(x.def.slot) - D.GEAR_SLOTS.indexOf(y.def.slot) || (y.mine - x.mine) || y.gain - x.gain || y.def.tier - x.def.tier || x.item.iid - y.item.iid);
    const inv = rows.length ? rows.map((c) => {
      const w = c.wearer, wBusy = c.preview.reason === 'busy';
      const tag = w ? '<span class="wtag ' + (c.mine ? 'mine' : '') + '">' + (c.mine ? 'Equipped' : 'On ' + esc(D.SPECIES[w.sp].name) + ' (Lv ' + w.lv + ')') + '</span>' : '<span class="wtag free">In the bag</span>';
      const btn = busy || wBusy ? (wBusy && !busy ? '<small class="muted">Its wearer is in a dungeon run</small>' : '') : c.mine ? '<button class="btn small ghost" data-act="fUnequip" data-slot="' + c.def.slot + '">Remove</button>' : '<button class="btn small gold" data-act="fEquip" data-iid="' + c.item.iid + '">' + (w ? 'Move here' : 'Equip') + '</button>';
      return itemRow(c.item.id, '<div class="fi-act">' + tag + btn + '</div>', w ? 'worn' : '', 'data-id="' + c.item.id + '" data-iid="' + c.item.iid + '"', c.mine ? '' : '<div class="gx-ds">' + P().deltaChips(c.preview.diff) + '</div>');
    }).join('') : '<p class="muted">' + (all.length ? 'No ' + (fs.slot === 'armour' ? 'armour' : fs.slot + 's') + ' yet.' : 'No equipment yet.') + ' Craft, merge or buy some in the other tabs.</p>';
    return mons + '<div class="fsel"><div class="fsel-art">' + artBox(inst.sp) + '</div><div><h3>' + esc(sp.name) + ' ' + chip(sp.el) + ' <span class="muted">Lv ' + inst.lv + '</span></h3>' + stats + (busy ? '<p class="bad small-t">' + I('lock') + ' In a dungeon run: equipment is locked until the run ends.</p>' : '') + slots + '</div></div><div class="section-t">Equipment</div>' + filt +
      '<p class="muted small-t fhint">Any item fits any Amina: one weapon, one armour, one charm. Each item shows what it would change for ' + esc(sp.name) + ' compared with what it wears now.</p>' + inv;
  }
  UI.act('fMon', (el) => { UI.forgeState.mon = +el.dataset.uid; refresh(); });
  UI.act('fFilt', (el) => { const fs = UI.forgeState, k = el.dataset.slot || null; fs.slot = el.classList.contains('fchip') ? k : (fs.slot === k ? null : k); refresh(); });
  UI.act('fEquip', (el) => P().equipAsk(UI.forgeState.mon, +el.dataset.iid));
  UI.act('fUnequip', (el) => P().unequipAsk(UI.forgeState.mon, el.dataset.slot));

  /* ---------- Tab 3: Equipment Merge ---------- */
  const bonusLine = (p) => (p.bonus || []).map((x) => NAMES[x.k] + ' ' + (x.from ? '+' + Math.round(x.from * 1000) / 10 + '%' : 'none') + ' → <b>+' + Math.round(x.to * 1000) / 10 + '%</b>').join(', ');
  function mergeTab(s, lv) {
    const fs = UI.forgeState;
    if (fs.a != null && !R.item(s, fs.a)) fs.a = null; if (fs.b != null && !R.item(s, fs.b)) fs.b = null;
    const ready = G().mergeable(s);
    const list = '<div class="section-t">Ready to merge</div>' + (ready.length ? ready.map((m) => '<div class="fitem fready ' + (m.ok ? 'can' : 'cannot') + '" data-id="' + m.id + '">' + UI.itemIcon(m.id, 30) + '<span class="mop">2 ×</span> <div class="fi-b"><b>' + esc(m.def.name) + '</b> <span class="muted small-t">(you own ' + m.count + ')</span><div class="fi-fx">' + I('arrow') + ' ' + esc(m.resultDef.name) + ' ' + tierTag(m.resultDef) + ' · ' + pctLine(m.resultDef.bonus) + '</div></div><div class="fi-act"><div class="fi-cost">' + costChips(s, m.cost) + '</div>' + (m.reason === 'level' ? '<span class="tagp sealed">' + I('lock') + ' Forge Lv ' + m.need + '</span>' : '<button class="btn small ' + (m.ok ? 'gold' : 'off') + '" data-act="fReady" data-a="' + m.a + '" data-b="' + m.b + '">Choose</button>') + (m.ok || m.reason === 'level' ? '' : '<small class="bad">' + esc(m.reason === 'gold' ? 'Need ' + num(m.cost.gold - (s.res.gold | 0)) + ' more gold.' : F.why(m)) + '</small>') + '</div></div>').join('') : '<p class="muted small-t">Nothing can be merged yet: you need two of the same item (for example two Driftwood Clubs).</p>');
    const slotBox = (k) => { const it = fs[k] != null ? R.item(s, fs[k]) : null, w = it && R.wearer(s, it.iid); return '<button class="mslot ' + (it ? 'set' : '') + '" data-act="fPick" data-k="' + k + '">' + (it ? UI.itemIcon(it.id, 44) + '<b>' + esc(D.ITEMS[it.id].name) + '</b>' + tierTag(D.ITEMS[it.id]) + '<small>' + pctLine(D.ITEMS[it.id].bonus) + '</small>' + (w ? '<span class="wtag">On ' + esc(D.SPECIES[w.sp].name) + '</span>' : '') : I('plus') + '<span class="muted">Choose item ' + (k === 'a' ? '1' : '2') + '</span>') + '</button>'; };
    let preview = '<div class="mres empty muted">Choose two of the same item. The result is shown here before you confirm.</div>', act = '';
    if (fs.a != null && fs.b != null) {
      const p = G().mergePreview(s, fs.a, fs.b);
      if (p.result) preview = '<div class="mres">' + UI.itemIcon(p.result, 52) + '<b>' + esc(p.def.name) + '</b>' + tierTag(p.def) + '<small class="good">' + bonusLine(p) + '</small><div class="kv">Cost: ' + costChips(s, p.cost) + '</div></div>';
      if (p.ok) act = (p.wearers.length ? '<p class="warn small-t">' + I('lock') + ' Equipped on ' + esc(andList(p.wearers.map((w) => D.SPECIES[w.sp].name))) + '. Merging takes it off; the new item goes back onto ' + esc(D.SPECIES[p.equipTo.sp].name) + '.</p>' : '') + '<button class="btn gold" data-act="fMerge">' + I('spark') + ' Merge</button><button class="btn ghost small" data-act="fClear">Clear</button>';
      else act = '<p class="bad small-t">' + esc(p.reason === 'gold' ? 'Need ' + missing(p.lines) + ' more.' : F.why(p)) + '</p><button class="btn ghost small" data-act="fClear">Clear</button>';
    }
    const rules = '<details class="mrules"><summary>How merging works</summary><ul><li>Two of the same item make one item of the next tier (I → II → III → IV) in the same line.</li><li>The result is fixed: there is no chance involved, and it is shown before you confirm.</li><li>Both items and the gold are used up.</li><li>Cost: Tier II ' + D.FORGE.merge[2].gold + ' gold, Tier III ' + D.FORGE.merge[3].gold + ' gold (Forge Lv ' + D.FORGE.merge[3].lv + '), Tier IV ' + D.FORGE.merge[4].gold + ' gold (Forge Lv ' + D.FORGE.merge[4].lv + ').</li><li>If one of the items is worn, the result goes back onto that Amina.</li><li>Unique items and top-tier items cannot be merged.</li></ul></details>';
    return '<div class="mrow">' + slotBox('a') + '<span class="mop">+</span>' + slotBox('b') + '<span class="mop">' + I('arrow') + '</span>' + preview + '</div><div class="mact">' + act + '</div>' + list + rules;
  }
  UI.act('fReady', (el) => { if (el.classList.contains('off')) return; const fs = UI.forgeState; fs.a = +el.dataset.a; fs.b = +el.dataset.b; const ov = el.closest('.overlay'); UI.forge(null, ov); $('.sh-body', ov).scrollTop = 0; });
  UI.act('fClear', () => { UI.forgeState.a = UI.forgeState.b = null; refresh(); });
  UI.act('fPick', (el) => {
    const s = st(), fs = UI.forgeState, k = el.dataset.k, other = fs[k === 'a' ? 'b' : 'a'], o = other != null ? R.item(s, other) : null;
    const items = R.items(s).slice().sort((x, y) => (D.ITEMS[x.id].family || 'z').localeCompare(D.ITEMS[y.id].family || 'z') || D.ITEMS[x.id].tier - D.ITEMS[y.id].tier);
    const rows = items.map((it) => {
      let why = '';
      if (o && it.iid === o.iid) why = 'Already chosen';
      else if (o) { const r = F.mergeResult(o.id, it.id); if (!r.ok) why = F.why(r); }
      else if (D.ITEMS[it.id].unique) why = F.WHY.unique;
      else if (!F.partners(s, it.iid).length) why = F.mergeResult(it.id, it.id).ok ? 'You need a second ' + D.ITEMS[it.id].name : F.why(F.mergeResult(it.id, it.id));
      const w = R.wearer(s, it.iid);
      return { why, html: itemRow(it.id, '<div class="fi-act">' + (w ? '<span class="wtag">On ' + esc(D.SPECIES[w.sp].name) + '</span>' : '<span class="wtag free">In the bag</span>') + (why ? '<small class="muted">' + esc(why) + '</small>' : '<button class="btn small gold" data-act="fPickSet" data-k="' + k + '" data-iid="' + it.iid + '">Choose</button>') + '</div>', why ? 'dis' : '') };
    }).sort((x, y) => !!x.why - !!y.why).map((x) => x.html).join('') || '<p class="muted">Your bag is empty.</p>';
    UI.modal(UI.sheet('Choose item ' + (k === 'a' ? '1' : '2'), '<p class="muted small-t">Items that can merge' + (o ? ' with ' + esc(D.ITEMS[o.id].name) : '') + ' are listed first.</p>' + rows, '<button class="btn ghost" data-act="close">Cancel</button>', 'wide'));
  });
  UI.act('fPickSet', (el) => { UI.forgeState[el.dataset.k] = +el.dataset.iid; UI.close(el.closest('.overlay')); refresh(); });
  UI.act('fMerge', () => {
    const s = st(), fs = UI.forgeState, p = G().mergePreview(s, fs.a, fs.b); if (!p.ok) return refuse(F.why(p));
    const d = p.def, eq = p.wearers.length > 0, an = D.ITEMS[p.a.id].name, bn = D.ITEMS[p.b.id].name, to = p.equipTo;
    const html = '<div class="mconf">' + UI.itemIcon(p.a.id, 40) + '<span class="mop">+</span>' + UI.itemIcon(p.b.id, 40) + '<span class="mop">' + I('arrow') + '</span>' + UI.itemIcon(p.result, 52) + '</div>' + itemRow(p.result) +
      '<p class="small-t fex"><b>Used up:</b> ' + esc(an) + ' and ' + esc(bn) + ', and ' + num(p.cost.gold) + ' gold.<br><b>You get:</b> one ' + esc(d.name) + ', every time (' + bonusLine(p) + ').</p>' + costTable(p.lines) +
      (to ? P().statRows(p.before, p.after, esc(D.SPECIES[to.sp].name) + ' · Lv ' + to.lv + ' wears the result') + (p.wearers.length > 1 || p.wearers[0].uid !== to.uid ? '<p class="small-t warn">' + esc(andList(p.wearers.filter((w) => w.uid !== to.uid).map((w) => D.SPECIES[w.sp].name))) + ' loses the item it wore.</p>' : '') : '<p class="small-t muted fex">The result goes to your bag.</p>');
    const ia = fs.a, ib = fs.b;
    confirmSheet('Merge into ' + esc(d.name) + '?', html, I('spark') + ' Merge', (op) => { const r = F.merge(st(), ia, ib, op, { confirmEquipped: eq }); if (r.ok) { r.msg = 'Merged into ' + d.name + '. ' + (to ? D.SPECIES[to.sp].name + ' is wearing it.' : 'It is in your bag.'); r.note = to ? {} : { goEquip: r.item.iid }; UI.forgeState.a = UI.forgeState.b = null; } return r; });
  });

  /* ---------- Tab 4: Equipment Shop ---------- */
  function shopTab(s, lv) {
    const fs = UI.forgeState;
    return '<p class="muted small-t">Buy equipment with gold only. Crafting the same item costs less gold but also uses food or gems.</p>' +
      F.shop(s).map((o) => { const p = G().buyPreview(s, o.item), why = p.ok || !o.unlocked ? '' : p.reason === 'gold' ? 'Need ' + num(p.lines[0].short) + ' more gold.' : F.why(p);
        return itemRow(o.item, '<div class="fi-act"><div class="fi-cost"><span class="cost ' + ((s.res.gold | 0) >= o.price ? '' : 'short') + '">' + I('gold') + num(o.price) + '</span></div>' + (o.unlocked ? '<button class="btn small ' + (p.ok ? 'gold' : 'off') + '" data-act="fBuy" data-id="' + o.item + '"' + (p.ok ? '' : ' aria-disabled="true"') + '>Buy</button>' : '<span class="tagp sealed">' + I('lock') + ' Forge Lv ' + o.lv + '</span>') + (why ? '<small class="bad">' + esc(why) + '</small>' : '') + '</div>', (o.unlocked ? (p.ok ? 'can' : 'cannot') : 'locked') + (fs.fresh === o.item && !P().quiet() ? ' fresh' : ''), 'data-id="' + o.item + '"', ownedTag(p.owned)); }).join('');
  }
  UI.act('fBuy', (el) => {
    const s = st(), id = el.dataset.id, p = G().buyPreview(s, id); if (!p.ok) return refuse(p.reason === 'gold' ? D.ITEMS[id].name + ': you need ' + num(p.lines[0].short) + ' more gold.' : F.why(p));
    const d = D.ITEMS[id];
    confirmSheet('Buy ' + esc(d.name) + '?', itemRow(id) + forCompanion(s, id) + costTable(p.lines) + bagLine(s) + (p.owned ? ' Note: you already own ' + p.owned + '.' : '') + '</p>', I('gold') + ' Buy', (op) => { const r = F.buy(st(), id, op); if (r.ok) { r.msg = 'Bought ' + d.name + ' for ' + num(r.price) + ' gold. It is in your bag.'; r.note = { goEquip: r.item.iid }; UI.forgeState.fresh = id; } return r; });
  });
})(typeof window !== 'undefined' ? window : globalThis);
