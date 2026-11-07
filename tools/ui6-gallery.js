/* Builds tools/ui6-gallery.html from the game's real code: every component below is produced by the same functions
   the game uses (battle panels and buttons by UI.startBattle/bRender, results by UI.victory/UI.defeat, rewards by
   UI.Rewards and UI.itemFound, discoveries by UI.reveal, icons by A.Icons), then moved into the page. */
(function () {
  'use strict';
  const A = window.A, D = A.Data, R = A.Rules, UI = A.UI, I = A.Art.icon;
  const G = document.getElementById('gallery');
  const sec = (title, wide) => { const d = document.createElement('div'); d.className = 'g-sec panel' + (wide ? ' wide' : ''); d.innerHTML = '<b>' + title + '</b>'; G.appendChild(d); return d; };
  const row = (parent) => { const d = document.createElement('div'); d.className = 'g-row'; parent.appendChild(d); return d; };
  const item = (parent, node, cap) => { const w = document.createElement('div'); w.className = 'g-it'; if (typeof node === 'string') w.innerHTML = node; else w.appendChild(node); if (cap) w.insertAdjacentHTML('beforeend', '<div class="g-cap">' + cap + '</div>'); parent.appendChild(w); return w; };
  const strip = (n) => { n.removeAttribute('id'); n.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id')); return n; };
  const clone = (sel) => strip(document.querySelector(sel).cloneNode(true));

  /* ---- a save to render from ---- */
  const s = A.State.newGame(); A.State.state = s; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.creatures3d = false;
  R.addAmina(s, 'lumifern', 14); R.addAmina(s, 'kairyu', 13); R.addAmina(s, 'pyrocell', 12); s.missions = { m_hollow: 'claimed' };
  Object.keys(D.DUNGEONS).forEach((id) => { const r = R.dungeonRec(s, id); r.clears = 1; r.next = 0; }); R.drain();
  const battle = (d, from, mut) => { R.startRun(s, d, s.aminas.slice(0, 3).map((a) => a.uid), { from }); UI.startBattle(); const U = UI.B; U.busy = false; if (mut) mut(U); UI.bRender(); return U; };
  const endBattle = () => { if (UI.endBattleStage) UI.endBattleStage(); UI.B = null; document.getElementById('stage').innerHTML = ''; };
  const fromModal = (fn) => { fn(); const ovs = document.querySelectorAll('#modal-root .overlay'), ov = ovs[ovs.length - 1]; const sh = ov.querySelector('.sheet'); const n = strip(sh); ov.remove(); return n; };

  /* ================= icons ================= */
  const CATS = [
    ['Navigation and places', ['hammer', 'paw', 'scroll', 'swords', 'compass', 'egg', 'map', 'gear', 'chat', 'home', 'island', 'gate']],
    ['Profile, rank and rewards', ['crown', 'xp', 'star', 'trophy', 'box', 'book', 'spark', 'fragment', 'lock']],
    ['Creatures, habitats, hatchery', ['heart', 'breed', 'habitat']],
    ['Forge, equipment, crafting', ['anvil', 'merge', 'axe']],
    ['Battle: moves and conditions', ['claw', 'shield', 'potion', 'hourglass', 'target', 'boss', 'warn', 'burn', 'stun', 'soak', 'regen', 'silence', 'weak']],
    ['Elements', Object.keys(D.ELEMENTS).map((e) => 'el_' + e)],
    ['Settings and accessibility', ['sound', 'motion', 'battery']],
    ['Kept from Dev 8: currencies and essence', ['gold', 'food', 'gem', 'ess_fire', 'ess_water', 'ess_light']],
    ['Kept: control glyphs (clear and universal)', ['close', 'check', 'plus', 'minus', 'back', 'arrow', 'up', 'rotate', 'move', 'info', 'swap']],
  ];
  const ic = sec('Prismatic icon collection · ' + A.Icons.names().length + ' sprites', true);
  CATS.forEach(([t, names]) => { ic.insertAdjacentHTML('beforeend', '<div class="g-cat">' + t + '</div><div class="g-ic">' + names.map((n) => '<div>' + (n.indexOf('ess_') === 0 ? A.Art.essIcon(n.slice(4)) : I(n)) + n.replace('el_', '') + '</div>').join('') + '</div>'); });
  const st = sec('Icon sizes and states');
  st.insertAdjacentHTML('beforeend', '<div class="g-row g-dark">' + [16, 20, 24, 32, 48].map((px) => '<div class="g-it"><span style="width:' + px + 'px;height:' + px + 'px;display:block">' + I('anvil').replace('class="ico', 'style="width:' + px + 'px;height:' + px + 'px" class="ico') + '</span><div class="g-cap">' + px + ' px</div></div>').join('') + '</div>' +
    '<div class="g-row">' + [['', 'normal'], ['is-selected', 'selected'], ['is-active', 'pressed'], ['is-disabled', 'disabled']].map(([c, l]) => '<div class="g-it"><button class="nbtn' + (c === 'is-selected' ? ' on' : '') + (c === 'is-disabled' ? ' locked' : '') + '" style="position:static">' + I('egg', c) + '<span>Hatchery</span></button><div class="g-cap">' + l + '</div></div>').join('') + '</div>' +
    '<div class="g-cat">Rarity frames (the same ladder as rewards)</div><div class="g-row">' + ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map((r) => '<div class="g-it"><span class="pzi-frame r-' + r + '">' + I('anvil') + '</span><div class="g-cap">' + r + '</div></div>').join('') + '</div>');

  /* ================= combat ================= */
  // health bars in each state
  let U = battle('reliquary', 4);
  const hb = sec('Health bars');
  const bar = (frac, cls, ghost, label) => { const b = clone('#hb-e'); b.className = 'hpb ' + cls; b.querySelector('.hpb-fill').style.transform = 'scaleX(' + frac + ')'; b.querySelector('.hpb-ghost').style.transform = 'scaleX(' + (ghost == null ? frac : ghost) + ')'; b.style.width = '12rem'; item(row(hb), b, label); };
  bar(1, 'ok', null, 'full'); bar(0.42, 'mid', null, 'below half: amber'); bar(0.18, 'low', null, 'critical (below 25%): red');
  bar(0.35, 'ok dmg', 0.72, 'just hit: the pale band holds, then drains'); bar(0.5, 'mid heal', 0.82, 'healing: the bright band leads, the fill follows');
  // panels
  const pn = sec('Fighter panels');
  const r1 = row(pn); item(r1, clone('#pan-e'), 'enemy'); item(r1, clone('#pan-p'), 'player: your move (cyan)');
  U.acting = 'e'; UI.bRender(); const r2 = row(pn); item(r2, clone('#pan-e'), 'enemy acting'); U.acting = null;
  U.disp.pHp = Math.round(U.disp.pMax * 0.16); U.disp.pSt = { regen: 3 }; U.disp.pGuard = true; U.disp.eSt = { burn: 2, soak: 1 }; U.disp.eWeak = 2; U.busy = true; UI.bRender();
  item(r2, clone('#pan-p'), 'player critical, with buffs'); item(row(pn), clone('#pan-e'), 'enemy with debuffs');
  // turn indicator
  const tn = sec('Turn indicator');
  U.busy = false; UI.bRender(); item(row(tn), clone('#b-turn'), 'waiting for your move (with turn order)');
  U.busy = true; U.acting = 'p'; UI.bRender(); item(row(tn), clone('#b-turn'), 'your Amina acting');
  U.acting = 'e'; UI.bRender(); item(row(tn), clone('#b-turn'), 'the foe acting'); U.acting = null;
  // ability buttons
  const ab = sec('Moves (ability buttons)', true);
  U.busy = false; U.disp.pHp = U.disp.pMax; UI.bRender();
  const f = U.b.party[U.b.pi], sp = f.abil.find((a) => D.ABILITIES[a].cd > 0), basic = f.abil.find((a) => D.ABILITIES[a].cd === 0);
  const btn = (id) => clone('.abtn[data-id="' + id + '"]');
  const ra = row(ab); item(ra, btn(basic), 'ready'); item(ra, btn(sp), 'ready special (its cost in words)');
  U.chosen = basic; U.busy = true; UI.bRender(); item(ra, btn(basic), 'chosen (cyan, resolving)'); item(ra, btn(sp), 'waiting while a move resolves'); U.chosen = null; U.busy = false;
  f.cd[sp] = 2; UI.bRender(); const rb = row(ab); item(rb, btn(sp), 'recharging: 2 turns left');
  f.cd[sp] = 0; f.st.silence = 1; UI.bRender(); item(rb, btn(sp), 'silenced'); delete f.st.silence;
  endBattle();
  U = battle('forgottenroad', 9, (u) => { u.disp.charging = true; }); const g = U.b.party[U.b.pi];
  const guardId = Object.keys(D.ABILITIES).find((k) => D.ABILITIES[k].type === 'guard');
  g.abil = g.abil.concat([guardId]); g.cd[guardId] = 0; UI.bRender(); item(rb, btn(guardId), 'suggested: guard the charge (gold)'); item(rb, clone('.abtn.swap'), 'switch');
  const rc = row(ab); ['fire', 'water', 'nature', 'dark', 'wind', 'resonance', 'metal', 'earth'].forEach((el) => { const id = Object.keys(D.ABILITIES).find((k) => D.ABILITIES[k].el === el && D.ABILITIES[k].power && !D.ABILITIES[k].boss); if (!id) return; g.abil = [id]; g.cd[id] = 0; UI.bRender(); item(rc, btn(id), D.ELEMENTS[el].name); });
  const bossPanel = (() => { UI.bRender(); return clone('#pan-e'); })();
  endBattle();
  U = battle('heartwood', 9); const islPanel = clone('#pan-e'); endBattle();
  item(row(pn), bossPanel, 'Guardian'); item(pn.lastChild, islPanel, 'Island Boss');
  // conditions and numbers
  const cd = sec('Conditions (tap any of them in battle for an explanation)');
  U = battle('reliquary', 4, (u) => { u.disp.eSt = { burn: 2, stun: 1, soak: 1, silence: 1 }; u.disp.eWeak = 2; u.disp.pSt = { regen: 3 }; u.disp.pGuard = true; });
  item(row(cd), '<div class="sts">' + document.querySelector('#fs-e').innerHTML + document.querySelector('#fs-p').innerHTML + '</div>', 'debuffs ▼ (burn, stun, soak, silence, attack down) · buffs ▲ (regen, guarding)');
  document.querySelector('#fs-e .stx').click(); { const t = clone('#b-tip'); t.hidden = false; t.style.width = '15rem'; item(row(cd), t, 'the explanation shown on tap'); }
  endBattle();
  const fl = sec('Damage and healing numbers'); const fr = row(fl);
  [['-38', 'normal', ''], ['-71', 'super', 'Super effective'], ['-12', 'weak', 'Resisted'], ['-140', 'big', 'Heavy blow'], ['+24', 'heal', 'Regen'], ['Burn!', 'status', '']].forEach(([t, k, tag]) => item(fr, '<div class="b-field" style="position:relative;inset:auto;width:7rem;height:4rem;display:grid;place-items:center"><div class="float ' + k + '"><b>' + t + '</b>' + (tag ? '<small>' + tag + '</small>' : '') + '</div></div>', k));

  /* ================= rewards ================= */
  const itemOf = (r) => Object.keys(D.ITEMS).find((k) => D.ITEMS[k].rarity === r), leg = Object.keys(D.SPECIES).find((k) => D.SPECIES[k].legendary);
  const rw = sec('Reward tiles: every kind', true);
  rw.insertAdjacentHTML('beforeend', UI.Rewards.list([{ k: 'gold', n: 1200 }, { k: 'food', n: 40 }, { k: 'gems', n: 3 }, { k: 'essence', el: 'fire', n: 5 }, { k: 'xp', n: 66 }, { k: 'rankxp', n: 25 }, { k: 'rank', n: 7 }, { k: 'item', id: itemOf('rare') }, { k: 'amina', id: 'kairyu' }, { k: 'island', id: 'verdant' }]));
  const ld = sec('The rarity ladder', true);
  ld.insertAdjacentHTML('beforeend', UI.Rewards.list([{ k: 'item', id: itemOf('common') }, { k: 'item', id: itemOf('uncommon') }, { k: 'item', id: itemOf('rare') }, { k: 'item', id: itemOf('epic') }, { k: 'amina', id: leg }, { k: 'item', id: itemOf('mythic') }]) +
    '<div class="g-cap" style="max-width:none;margin-top:.4rem">common → uncommon → rare → epic → legendary → mythic. Common stays calm; each step adds rim colour, glow, then motion; mythic alone gets the turning spectrum.</div>');
  const cardsSec = sec('Reward cards (pop-up)', true); const cr = row(cardsSec);
  ['common', 'rare', 'epic', 'mythic'].forEach((r) => { const c = UI.itemFound(itemOf(r), { from: 'dungeon:forgottenroad' }); item(cr, strip(c), r); });
  const tc = UI.Rewards.card({ rarity: 'rare', kicker: 'Task complete · bonus', title: 'Clear the Hollow Road', icon: I('scroll'), list: [{ k: 'gold', n: 150 }, { k: 'gems', n: 3 }, { k: 'rankxp', n: 25 }] }); item(cr, strip(tc), 'task reward (what, how much, from which task)');
  document.querySelectorAll('#app .reward-wrap').forEach((e) => e.remove());

  /* ================= results and special moments ================= */
  const res = sec('Results', true); const rr = row(res); rr.classList.add('g-fit');
  const xp = [{ sp: 'lumifern', gained: 66, levels: [], alive: true }, { sp: 'kairyu', gained: 33, levels: [{ from: 13, to: 14 }], alive: false }];
  const lore = Object.keys(D.LORE)[0];
  item(rr, fromModal(() => UI.victory({ win: true, dungeon: 'reliquary', battle: 4, gold: 42, food: 10, essence: { el: 'nature', n: 3 }, xp, cleared: false, sectionDone: true, lore: [], items: [] })), 'victory');
  item(rr, fromModal(() => UI.victory({ win: true, dungeon: 'forgottenroad', battle: 9, boss: true, cleared: true, first: true, gold: 42, food: 10, essence: { el: 'earth', n: 9 }, reward: { gold: 40, food: 12 }, sectionFirst: { name: 'The Road’s End', reward: { gems: 3 } }, items: [itemOf('uncommon')], newSp: [], lore: [lore], xp })), 'guardian defeated, dungeon cleared');
  item(rr, fromModal(() => UI.victory({ win: true, dungeon: 'heartwood', battle: 9, boss: true, islandBoss: true, cleared: true, first: true, gold: 102, food: 10, essence: { el: 'nature', n: 16 }, reward: { gold: 300, food: 60 }, sectionFirst: { name: 'The Heart', reward: { gems: 15 } }, unlockedIsland: 'verdant', items: [itemOf('mythic')], newSp: [], lore: [], xp })), 'the Island Boss defeated');
  item(rr, fromModal(() => UI.defeat({ dungeon: 'reliquary', battle: 4, food: 5 })), 'defeat');
  const sm = sec('Special moments', true); const sr = row(sm); sr.classList.add('g-fit');
  const rev = (sp) => { UI.reveal(sp, () => {}); const ovs = document.querySelectorAll('#modal-root .overlay'), ov = ovs[ovs.length - 1], c = strip(ov.querySelector('.vcard.reveal')); ov.remove(); return c; };
  item(sr, rev('kairyu'), 'a new Amina'); item(sr, rev(leg), 'a legendary Amina');
  UI.islandUnlockedFx('verdant'); { const ovs = document.querySelectorAll('#modal-root .overlay'), ov = ovs[ovs.length - 1]; item(sr, strip(ov.querySelector('.vcard')), 'a new island'); ov.remove(); }
  document.body.classList.add('g-ready');
})();
