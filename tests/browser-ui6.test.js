// Phase 6 real-browser test (Chromium + Playwright, software WebGL; NOT a phone).
// Combat interface (health bars, turn indicator, ability states, conditions, damage numbers, victory, defeat),
// the prismatic icon collection, the unified reward presentation (every reward kind, the rarity ladder, discoveries,
// boss victories), screen sizes, Reduce motion / Battery saver, and save compatibility.
// Run: node tests/browser-ui6.test.js
const { chromium } = require('playwright'); const serve = require('./server'); const fs = require('fs'); const path = require('path');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const lum = (h) => { const c = h.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  /* ---------------- static checks (no browser) ---------------- */
  // every icon name the game asks for resolves to something (prismatic sprite, currency sprite or line glyph)
  const src = fs.readdirSync(path.join(__dirname, '../src')).filter((f) => /\.js$/.test(f)).map((f) => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
  const used = [...new Set([...src.matchAll(/\bI\('([a-z_]+)'/g)].map((m) => m[1]))];
  // contrast of the new text/surface pairs (darkest point of each surface)
  const pairs = [['turn badge', '#e2dafd', '#2a2062'], ['level tag', '#1a1240', '#ffd978'], ['acts-first tag', '#10204a', '#9feaff'], ['move name', '#fff9f0', '#3c2e8c'], ['move detail', '#e2dafd', '#2c2268'],
    ['special label', '#ffd978', '#2c2268'], ['effect label', '#ffe2a6', '#2c2268'], ['reward label (common)', '#cdc7e2', '#1c1545'], ['reward amount (gold)', '#ffe08a', '#1c1545'], ['defeat text', '#cfc6ee', '#1a1640'],
    ['status: burn', '#ff8a4a', '#0a0620'], ['status: soak', '#52b8ff', '#0a0620'], ['status: regen', '#8cffa0', '#0a0620'], ['status: silence', '#c9b8ff', '#0a0620'], ['status: stun', '#ffd86b', '#0a0620'], ['status: attack down', '#ff8a7a', '#0a0620'], ['status: guard', '#8fd0ff', '#0a0620'], ['boss tag', '#1a1240', '#ffd978']];
  const low = pairs.filter(([, a, b]) => ratio(a, b) < 4.5);
  ok(low.length === 0, 'every new text/surface pair meets WCAG AA 4.5:1 (lowest ' + Math.min(...pairs.map(([, a, b]) => ratio(a, b))).toFixed(1) + (low.length ? '; low: ' + low.map((x) => x[0]).join(', ') : '') + ')');

  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|sw\.js/i.test(m.text())) errors.push(m.text()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.UI.Rewards && A.Icons);
  await page.evaluate(() => { const s = A.State.newGame(), R = A.Rules, D = A.Data; s.phase = 'play'; s.introDone = true; s.starter = 'lumifern'; s.avatar.made = true; s.settings.quality = 'balanced'; s.settings.creatures3d = false;
    R.addAmina(s, 'lumifern', 14); R.addAmina(s, 'kairyu', 13); R.addAmina(s, 'pyrocell', 12); s.missions = { m_hollow: 'claimed' };
    Object.keys(D.DUNGEONS).forEach((id) => { const r = R.dungeonRec(s, id); r.clears = 1; r.next = 0; }); R.drain(); A.State.save(); A.UI.showIsland(); });
  await page.waitForSelector('#world', { timeout: 60000 }); await sleep(1000);
  const clean = () => page.evaluate(() => { A.UI.queue.length = 0; A.UI.busy = false; if (A.UI.B) A.UI.leaveBattle(() => {}); A.UI.closeAll(); document.querySelectorAll('.toast,.ach-toast,.reward-wrap,.dlg,.scene').forEach((t) => t.remove()); A.Perf.autoSaver = false; if (!document.querySelector('#world')) A.UI.showIsland(); });
  await clean();

  /* ---------------- icons ---------------- */
  const ic = await page.evaluate((used) => {
    const names = A.Icons.names(), html = names.map((n) => A.Art.icon(n));
    const sprite = (h) => /viewBox="0 0 16 16"/.test(h) && /crispEdges/.test(h) && /fill="#1c1238"/.test(h);
    const missing = used.filter((n) => { const h = A.Art.icon(n); return !/<(rect|path|circle|ellipse|polygon|line)/.test(h); });
    const line = ['close', 'check', 'plus', 'minus', 'back', 'arrow', 'up', 'rotate', 'move', 'info', 'swap'].filter((n) => !/viewBox="0 0 24 24"/.test(A.Art.icon(n)));
    return { n: names.length, allSprites: html.every(sprite), missing, line, gold: /px-gold/.test(A.Art.icon('gold')), ess: /ess-fire/.test(A.Art.essIcon('fire')), els: Object.keys(A.Data.ELEMENTS).every((e) => /pzi-el_/.test(A.Art.elIcon(e))),
      chip: /pzi-el_fire/.test(A.UI.h.chip('fire')) && A.UI.h.chip('fire').replace(/<[^>]+>/g, '') === 'Fire' };
  }, used);
  ok(ic.n >= 50 && ic.allSprites, 'the prismatic icon collection has ' + ic.n + ' icons, all 16×16 crisp pixel sprites with the shared ink outline');
  ok(ic.missing.length === 0, 'every icon the game uses (' + used.length + ' names) resolves to artwork' + (ic.missing.length ? ': missing ' + ic.missing.join(', ') : ''));
  ok(ic.line.length === 0 && ic.gold && ic.ess, 'control glyphs stay clean line icons and the Dev 8 currency and essence sprites are unchanged');
  ok(ic.els && ic.chip, 'every element has its own glyph, and element chips carry it with their name (colour is never the only cue)');
  const navIcons = await page.evaluate(() => [...document.querySelectorAll('.nav .nbtn .ico')].map((e) => e.classList.contains('pzi')));
  ok(navIcons.length === 6 && navIcons.every(Boolean), 'the main navigation uses the prismatic icons');

  /* ---------------- combat: panels, turn, abilities ---------------- */
  const startBattle = (d, from) => page.evaluate(({ d, from }) => { const s = A.State.state; A.Rules.startRun(s, d, s.aminas.slice(0, 3).map((a) => a.uid), { from }); A.UI.startBattle(); }, { d, from });
  await startBattle('reliquary', 4); await page.waitForSelector('.abtn.ready', { timeout: 10000 });
  const p1 = await page.evaluate(() => { const B = A.Rules.Battle, b = A.UI.B.b, tr = (s) => { const m = /scaleX\(([\d.]+)\)/.exec(document.querySelector(s).style.transform); return m ? +m[1] : -1; };
    const turn = document.querySelector('#b-turn'), legal = B.legal(b);
    return { head: !!document.querySelector('#fh-e .fp-el .ico.pzi') && /Lv \d+/.test(document.querySelector('#fh-e').textContent) && document.querySelector('#fh-p .fp-nm').textContent === B.cur(b).name,
      fillE: tr('#hb-e .hpb-fill'), fracE: b.enemy.hp / b.enemy.hpMax, ticks: !!document.querySelector('#hb-e .hpb-ticks'),
      turn: turn.className, turnTxt: turn.textContent, first: B.speed(B.cur(b)) >= B.speed(b.enemy), mine: document.querySelector('#pan-p').classList.contains('mine'),
      btns: [...document.querySelectorAll('.abtn[data-id]')].map((e) => ({ id: e.dataset.id, cls: e.className, gem: !!e.querySelector('.ab-gem .ico.pzi'), ec: e.style.getPropertyValue('--ec') })), legal: legal.map((x) => x.id) }; });
  ok(p1.head && p1.ticks, 'fighter panels show the element glyph, name and level, and a segmented crystal health bar');
  ok(Math.abs(p1.fillE - p1.fracE) < 0.002, 'the enemy health fill matches the real health (' + p1.fillE.toFixed(3) + ' vs ' + p1.fracE.toFixed(3) + ')');
  ok(/mine/.test(p1.turn) && /Your move/.test(p1.turnTxt) && (p1.first ? /You act first/ : /Foe acts first/).test(p1.turnTxt) && p1.mine, 'the turn indicator says whose move it is and who acts first, using the game’s own speed rule');
  ok(p1.btns.length === p1.legal.length && p1.btns.every((b) => /ready/.test(b.cls) && b.gem && b.ec), 'every move is a ready crystal button with its element gem and colour');
  // cooling, silenced and special states
  const st = await page.evaluate(() => { const U = A.UI.B, b = U.b, f = b.party[b.pi], D = A.Data, sp = f.abil.find((a) => D.ABILITIES[a].cd > 0), basic = f.abil.find((a) => D.ABILITIES[a].cd === 0);
    const special0 = document.querySelector('.abtn[data-id="' + sp + '"] .ab-sp'); const specialTxt = special0 ? special0.textContent : '';
    f.cd[sp] = 2; A.UI.bRender(); const cool = document.querySelector('.abtn[data-id="' + sp + '"]'); const coolInfo = { cls: cool.className, n: cool.querySelector('.ab-cd b').textContent, aria: cool.getAttribute('aria-disabled') };
    f.cd[sp] = 0; f.st.silence = 1; A.UI.bRender(); const hush = document.querySelector('.abtn[data-id="' + sp + '"]').className, basicOk = /ready/.test(document.querySelector('.abtn[data-id="' + basic + '"]').className);
    delete f.st.silence; A.UI.bRender(); return { specialTxt, every: D.ABILITIES[sp].cd + 1, coolInfo, hush, basicOk }; });
  ok(new RegExp('every ' + st.every).test(st.specialTxt), 'a special move states its cost in words (“' + st.specialTxt + '”)');
  ok(/cool/.test(st.coolInfo.cls) && /off/.test(st.coolInfo.cls) && st.coolInfo.n === '2' && st.coolInfo.aria === 'true', 'a recharging move is dimmed, unavailable and shows the turns left (2)');
  ok(/hushed/.test(st.hush) && /off/.test(st.hush) && st.basicOk, 'Silence greys out special moves and leaves basic moves available');

  // using a move: selected state, acting highlight, health animation, damage number
  await page.evaluate(() => { const b = A.UI.B.b; b.party[b.pi].spd = 9999; b.enemy.atk = 1; b.rng = () => 0.5; });
  const basicId = await page.evaluate(() => { const f = A.Rules.Battle.cur(A.UI.B.b); return f.abil.find((a) => A.Data.ABILITIES[a].cd === 0 && A.Data.ABILITIES[a].power); });
  const hpBefore = await page.evaluate(() => A.UI.B.b.enemy.hp);
  await page.click('.abtn[data-id="' + basicId + '"]');
  const sel = await page.evaluate((id) => ({ chosen: document.querySelector('.abtn[data-id="' + id + '"]').className, others: [...document.querySelectorAll('.abtn[data-id]:not([data-id="' + id + '"])')].every((e) => /off/.test(e.className)) }), basicId);
  ok(/chosen/.test(sel.chosen) && /fire/.test(sel.chosen) && sel.others, 'tapping a move lights it as the chosen move (with an activation flash) and the rest wait');
  await page.waitForFunction(() => document.querySelector('#pan-p.acting') || document.querySelector('#b-turn.ally'), null, { timeout: 4000 }).catch(() => {});
  const acting = await page.evaluate(() => ({ pan: document.querySelector('#pan-p').classList.contains('acting'), turn: document.querySelector('#b-turn').className + ' ' + document.querySelector('#b-turn').textContent }));
  ok(acting.pan && /ally/.test(acting.turn) && / acts/.test(acting.turn), 'the acting Amina’s panel lights up and the turn indicator names who is acting');
  await page.waitForFunction(() => document.querySelector('#hb-e.dmg'), null, { timeout: 4000 }).catch(() => {});
  await sleep(250);
  const anim = await page.evaluate(() => { const tr = (s) => { const m = /scaleX\(([\d.]+)\)/.exec(document.querySelector(s).style.transform); return m ? +m[1] : -1; }; const cs = (s) => getComputedStyle(document.querySelector(s)).transform;
    const mx = (t) => { const m = /matrix\(([^,]+)/.exec(t); return m ? +m[1] : 1; };
    return { dmg: document.querySelector('#hb-e').classList.contains('dmg'), target: tr('#hb-e .hpb-fill'), ghostNow: mx(cs('#hb-e .hpb-ghost')), fillNow: mx(cs('#hb-e .hpb-fill')), float: [...document.querySelectorAll('.b-field .float b')].map((e) => e.textContent) }; });
  ok(anim.dmg && anim.ghostNow > anim.fillNow + 0.01, 'damage: the fill drops while a pale “lost health” band holds behind it (fill ' + anim.fillNow.toFixed(2) + ', band ' + anim.ghostNow.toFixed(2) + ')');
  ok(anim.float.some((t) => /^-\d+$/.test(t)), 'a damage number appears over the target (' + anim.float.join(', ') + ')');
  await page.waitForSelector('.abtn.ready', { timeout: 10000 }); await sleep(1300);
  const after = await page.evaluate(() => { const cs = (s) => getComputedStyle(document.querySelector(s)).transform, mx = (t) => { const m = /matrix\(([^,]+)/.exec(t); return m ? +m[1] : 1; }; const b = A.UI.B.b; return { ghost: mx(cs('#hb-e .hpb-ghost')), fill: mx(cs('#hb-e .hpb-fill')), frac: b.enemy.hp / b.enemy.hpMax, hp: b.enemy.hp, num: document.querySelector('#ff-e .hpn b').textContent }; });
  ok(Math.abs(after.ghost - after.fill) < 0.01 && Math.abs(after.fill - after.frac) < 0.01 && after.hp < hpBefore && after.num === String(after.hp), 'the band then drains to the new health, and bar, number and real health agree (' + after.hp + ')');

  // healing, critical health, conditions and their explanations (display state driven exactly as the event player does)
  const cond = await page.evaluate(async () => { const U = A.UI.B, d = U.disp, cs = (s) => getComputedStyle(document.querySelector(s)).transform, mx = (t) => { const m = /matrix\(([^,]+)/.exec(t); return m ? +m[1] : 1; };
    d.pHp = Math.round(d.pMax * 0.15); A.UI.bRender(); const crit = { cls: document.querySelector('#pan-p').className, txt: document.querySelector('#ff-p').textContent, bar: document.querySelector('#hb-p').className };
    d.pHp = Math.round(d.pMax * 0.6); A.UI.bRender(); await new Promise((r) => setTimeout(r, 160)); const heal = { cls: document.querySelector('#hb-p').className, ghost: mx(cs('#hb-p .hpb-ghost')), fill: mx(cs('#hb-p .hpb-fill')) };
    d.eSt = { burn: 2, soak: 1 }; d.eWeak = 2; d.pSt = { regen: 3 }; d.pGuard = true; A.UI.bRender();
    const chips = [...document.querySelectorAll('#pan-e .stx, #pan-p .stx')].map((e) => [e.dataset.k, e.className.replace('stx ', ''), (e.querySelector('em') || {}).textContent || '']);
    return { crit, heal, chips }; });
  ok(/crit/.test(cond.crit.cls) && /Critical/.test(cond.crit.txt) && /low/.test(cond.crit.bar), 'critical health (below 25%) turns the panel and bar red and says “Critical”');
  ok(/heal/.test(cond.heal.cls) && cond.heal.ghost > cond.heal.fill + 0.05, 'healing shows a bright band first and the fill grows into it');
  const ch = Object.fromEntries(cond.chips.map((c) => [c[0], c]));
  ok(ch.burn && /debuff/.test(ch.burn[1]) && ch.burn[2] === '2' && ch.soak && ch.weak && ch.weak[2] === '×2' && ch.regen && /buff/.test(ch.regen[1]) && ch.regen[2] === '3' && ch.guard && /buff/.test(ch.guard[1]), 'conditions show as buffs and debuffs with icons and remaining turns (burn 2, soak 1, attack down ×2, regen 3, guarding)');
  await page.click('#pan-e .stx[data-k="burn"]'); await sleep(200);
  const tip = await page.evaluate(() => { const t = document.querySelector('#b-tip'); const r = t.getBoundingClientRect(); return { vis: !t.hidden, txt: t.textContent, inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }; });
  ok(tip.vis && /Burn/.test(tip.txt) && /6% health/.test(tip.txt) && /2 turns left/.test(tip.txt) && tip.inside, 'tapping a condition explains it in words, with its turns left, on screen');
  await clean();

  // boss traits
  await startBattle('forgottenroad', 9); await page.waitForSelector('.abtn.ready', { timeout: 10000 });
  const g = await page.evaluate(() => ({ chip: !!document.querySelector('#pan-e .stx.boss[data-k="guardian"]'), intro: !!document.querySelector('.b-bossin') || true }));
  await clean(); await startBattle('heartwood', 9); await sleep(300);
  const isl = await page.evaluate(() => ({ intro: (document.querySelector('.b-bossin.isle') || {}).textContent || '', chip: !!document.querySelector('#pan-e .stx.boss.isle') }));
  ok(g.chip && isl.chip && /Island Boss/.test(isl.intro), 'guardians and the Island Boss carry a boss tag, and the Island Boss gets a title card on entry (“' + isl.intro + '”)');
  await clean();

  /* ---------------- layout at several phone sizes ---------------- */
  const sizes = [[667, 375, 'iPhone SE'], [844, 390, 'iPhone 13/14'], [932, 430, 'iPhone Pro Max'], [1024, 768, 'iPad landscape']];
  const lay = [];
  for (const [w, h, name] of sizes) {
    await page.setViewportSize({ width: w, height: h }); await sleep(200);
    for (const [d, from] of [['reliquary', 4], ['heartwood', 9]]) {
      await startBattle(d, from); await page.waitForSelector('.abtn.ready', { timeout: 10000 }); await sleep(300);
      lay.push(await page.evaluate(({ name, d }) => {
        const r = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
        const boxes = { enemy: r('#pan-e'), player: r('#pan-p'), party: r('#b-party'), moves: r('#b-actions'), turn: r('#b-turn'), label: r('.b-topr') };
        const hit = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        const keys = Object.keys(boxes), over = [];
        keys.forEach((a, i) => keys.slice(i + 1).forEach((b) => { if (hit(boxes[a], boxes[b])) over.push(a + '/' + b); }));
        const out = keys.filter((k) => { const b = boxes[k]; return b && (b.left < 0 || b.top < 0 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5); });
        const sz = [...document.querySelectorAll('.abtn, .pm')].map((e) => [Math.round(Math.min(e.getBoundingClientRect().height, e.getBoundingClientRect().width)), e.className.split(' ').slice(0, 2).join('.')]).sort((x, y) => x[0] - y[0]);
        return { name, d, over, out, minBtn: sz[0][0], minEl: sz[0][1] };
      }, { name, d }));
      await clean();
    }
  }
  const bad = lay.filter((l) => l.over.length || l.out.length);
  ok(bad.length === 0, 'battle panels, party, moves and turn indicator never overlap or leave the screen at ' + sizes.map((s) => s[2]).join(', ') + (bad.length ? ': ' + JSON.stringify(bad) : ''));
  const sm = lay.slice().sort((x, y) => x.minBtn - y.minBtn)[0];
  ok(sm.minBtn >= 44, 'moves and party buttons stay at least 44 px in both directions on every size (smallest ' + sm.minBtn + ' px: ' + sm.minEl + ' at ' + sm.name + ')');
  await page.setViewportSize({ width: 390, height: 844 }); await sleep(300);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('#rotate')).display !== 'none'), 'in portrait the game still asks to rotate (landscape only, as before)');
  await page.setViewportSize({ width: 844, height: 390 }); await sleep(300);

  /* ---------------- rewards: every kind, the ladder ---------------- */
  const tiles = await page.evaluate(() => { const R_ = A.UI.Rewards, D = A.Data, item = (r) => Object.keys(D.ITEMS).find((k) => D.ITEMS[k].rarity === r), leg = Object.keys(D.SPECIES).find((k) => D.SPECIES[k].legendary);
    const list = [{ k: 'gold', n: 1200 }, { k: 'food', n: 40 }, { k: 'gems', n: 3 }, { k: 'essence', el: 'fire', n: 5 }, { k: 'xp', n: 66 }, { k: 'rankxp', n: 25 }, { k: 'rank', n: 7 },
      { k: 'item', id: item('common') }, { k: 'item', id: item('uncommon') }, { k: 'item', id: item('rare') }, { k: 'item', id: item('epic') }, { k: 'item', id: item('mythic') }, { k: 'amina', id: 'kairyu' }, { k: 'amina', id: leg }, { k: 'island', id: 'verdant' }];
    const d = document.createElement('div'); d.innerHTML = R_.list(list); document.body.appendChild(d);
    const out = [...d.querySelectorAll('.rtile')].map((t) => ({ cls: t.className, txt: t.textContent, ico: !!t.querySelector('.rt-ico svg, .rt-ico img, .rt-ico .amina-svg') }));
    const looks = [...d.querySelectorAll('.rtile')].map((t) => getComputedStyle(t).backgroundImage.slice(-140));
    d.remove(); return { out, looks }; });
  const kinds = ['gold', 'food', 'gems', 'essence', 'xp', 'rankxp', 'rank', 'item', 'amina', 'island'];
  ok(kinds.every((k) => tiles.out.some((t) => new RegExp('k-' + k + '\\b').test(t.cls))) && tiles.out.every((t) => t.ico), 'one reward tile renders every reward kind with its icon (' + kinds.join(', ') + ')');
  ok(/\+1,200/.test(tiles.out[0].txt) && /Gold/.test(tiles.out[0].txt) && /Fire Essence/.test(tiles.out[3].txt) && /Rank 7/.test(tiles.out[6].txt) && /Legendary Amina/.test(tiles.out[13].txt), 'tiles say what was received and how much (“+1,200 Gold”, “Fire Essence”, “Rank 7”, “Legendary Amina”)');
  const ladder = ['common', 'uncommon', 'rare', 'epic', 'mythic'].map((r, i) => tiles.out[7 + i].cls.includes('r-' + r));
  const distinct = new Set([tiles.looks[0], tiles.looks[8], tiles.looks[9], tiles.looks[10], tiles.looks[13], tiles.looks[11]]).size;
  ok(ladder.every(Boolean) && /r-legendary/.test(tiles.out[13].cls) && distinct === 6, 'the rarity ladder gives six distinct looks: common, uncommon, rare, epic, legendary, mythic');
  // cards: celebration rises with rarity; common is calm
  const cards = await page.evaluate(async () => { const D = A.Data, out = {};
    for (const r of ['common', 'rare', 'epic', 'mythic']) { document.querySelectorAll('.spark, .pxb-wrap i, .reward-wrap').forEach((e) => e.remove()); const id = Object.keys(D.ITEMS).find((k) => D.ITEMS[k].rarity === r); const c = A.UI.itemFound(id, { from: 'dungeon:forgottenroad' });
      out[r] = { cls: c.className, sparks: document.querySelectorAll('.spark, .pxb-wrap i').length, src: (c.querySelector('.rw-src') || {}).textContent || '', ms: A.UI.RARITY[r].ms }; }
    document.querySelectorAll('.reward-wrap').forEach((e) => e.remove()); return out; });
  ok(cards.common.sparks === 0 && cards.rare.sparks > 0 && cards.epic.sparks > cards.rare.sparks && cards.mythic.sparks > cards.epic.sparks && cards.mythic.ms > cards.common.ms,
    'celebration rises with rarity and common stays calm (sparks: ' + ['common', 'rare', 'epic', 'mythic'].map((r) => r + ' ' + cards[r].sparks).join(', ') + ')');
  ok(/Forgotten Road/.test(cards.rare.src), 'a reward card names where the reward came from (“' + cards.rare.src.trim() + '”)');

  /* ---------------- victory, boss victory, Island Boss, equipment on the result, defeat ---------------- */
  const win = async (d, from, setup) => {
    await startBattle(d, from); await page.waitForSelector('.abtn.ready', { timeout: 10000 }); await page.evaluate(setup || (() => {}));
    const before = await page.evaluate(() => ({ gold: A.State.state.res.gold, food: A.State.state.res.food }));
    // panels the game queues after earlier wins (e.g. "ready to evolve") are closed first so they do not cover the moves
    await page.evaluate(() => { A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); const b = A.UI.B.b; b.foes.forEach((f) => { f.hp = 1; f.shield = 0; }); b.party[b.pi].spd = 9999; });
    await page.evaluate(() => { A.UI.closeAll(); document.querySelector('.abtn.ready:not(.k-heal):not(.k-guard)').click(); }); await page.waitForSelector('#v-go', { timeout: 15000 }); await sleep(600);
    return { before };
  };
  const w1 = await win('reliquary', 4);
  const v1 = await page.evaluate((before) => { const s = A.State.state, t = [...document.querySelectorAll('.v-spoils .rtile')].map((e) => e.textContent);
    return { cls: document.querySelector('.vcard.vic').className, title: document.querySelector('.v-banner h1').textContent, kicker: document.querySelector('.v-kick').textContent, tiles: t, dGold: s.res.gold - before.gold, dFood: s.res.food - before.food, card: !!document.querySelector('.reward-wrap .reward-card') }; }, w1.before);
  ok(/v-win/.test(v1.cls) && v1.title === 'Victory!' && /battle 5 of 10/i.test(v1.kicker), 'a normal win gets the victory banner with where it happened (“' + v1.kicker + '”)');
  ok(v1.tiles.some((t) => t.includes('+' + v1.dGold.toLocaleString('en-GB') + 'Gold')) && v1.tiles.some((t) => t.includes('+' + v1.dFood + 'Food')), 'the spoils shown are exactly what the rules paid (+' + v1.dGold + ' gold, +' + v1.dFood + ' food)');
  await clean();
  // first clear of a dungeon with its guardian: the dungeon's own equipment appears on the result, not on top of it
  await win('forgottenroad', 9, () => { A.Rules.dungeonRec(A.State.state, 'forgottenroad').clears = 0; }); // the run is a replay; marking it uncleared makes this its first clear
  const v2 = await page.evaluate(() => ({ cls: document.querySelector('.vcard.vic').className, sheet: document.querySelector('.res-sheet').className, crest: !!document.querySelector('.v-crest .pzi-crown'), eq: [...document.querySelectorAll('.rgroup')].some((g) => /Equipment found/.test(g.textContent) && g.querySelector('.rtile.k-item')), floating: !!document.querySelector('.reward-wrap .reward-card'), fits: (() => { const r = document.querySelector('.overlay .sheet').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 0.5; })() }));
  ok(/v-boss/.test(v2.cls) && /r-boss/.test(v2.sheet) && v2.crest, 'a guardian victory gets the gold crown banner and frame');
  ok(v2.eq && !v2.floating, 'equipment found in the battle is shown on the result card (no card on top of the result any more)');
  ok(v2.fits, 'the result card fits the screen (its contents scroll inside it)');
  await clean();
  await win('heartwood', 9, () => { const s = A.State.state; s.campaign = s.campaign || {}; s.campaign.bosses = {}; });
  const v3 = await page.evaluate(() => ({ cls: document.querySelector('.vcard.vic').className, sheet: document.querySelector('.res-sheet').className, title: document.querySelector('.v-banner h1').textContent, unlock: (document.querySelector('.v-unlock') || {}).textContent || '' }));
  ok(/v-isle/.test(v3.cls) && /r-isle/.test(v3.sheet) && /Island Boss defeated/.test(v3.title), 'the Island Boss victory gets the full spectrum banner and frame');
  ok(/New island unlocked/.test(v3.unlock), 'unlocking a new island is its own highlighted moment on the result (“' + v3.unlock.replace(/\s+/g, ' ').trim() + '”)');
  await clean();
  // defeat
  await startBattle('reliquary', 4); await page.waitForSelector('.abtn.ready', { timeout: 10000 });
  await page.evaluate(() => { const b = A.UI.B.b; b.party.forEach((f, i) => { if (i !== b.pi) f.hp = 0; }); b.party[b.pi].hp = 1; b.party[b.pi].spd = 0; b.enemy.atk = 99999; });
  await page.evaluate(() => { A.UI.closeAll(); document.querySelector('.abtn.ready').click(); }); await page.waitForSelector('#v-retry', { timeout: 15000 });
  const df = await page.evaluate(() => ({ cls: document.querySelector('.vcard.defeat') ? 'defeat' : '', sheet: document.querySelector('.res-sheet').className, kept: document.querySelector('.v-kept').textContent, sparks: document.querySelectorAll('.spark, .pxb-wrap i').length }));
  ok(df.cls && /r-defeat/.test(df.sheet) && /Progress kept/.test(df.kept) && df.sparks === 0, 'defeat is quiet and atmospheric: what is kept comes first, no celebration effects');
  await clean();

  /* ---------------- new Amina discovery ---------------- */
  await page.evaluate(() => { A.UI.closeAll(); A.UI.reveal('kairyu', () => {}); }); await sleep(800); // let the card finish its entrance
  const disc = await page.evaluate(() => { const all = document.querySelectorAll('.vcard.reveal'), c = all[all.length - 1]; const art = c.querySelector('.reveal-art').getBoundingClientRect();
    const o = { cls: c.className, kick: (c.querySelector('.disc-meta') || {}).textContent || '', art: Math.round(art.width), biggest: [...c.children].every((ch) => ch.getBoundingClientRect().height <= art.height + 1 || ch.tagName === 'BUTTON') };
    A.UI.closeAll(); const leg = Object.keys(A.Data.SPECIES).find((k) => A.Data.SPECIES[k].legendary); A.UI.reveal(leg, () => {}); const cs = document.querySelectorAll('.vcard.reveal'), l = cs[cs.length - 1]; o.leg = l.className; o.tag = !!l.querySelector('.rar-tag'); A.UI.closeAll(); return o; });
  ok(/disc/.test(disc.cls) && /r-rare/.test(disc.cls) && /Collection \d+ \/ \d+/.test(disc.kick) && disc.art >= 150 && disc.biggest, 'a new Amina is the largest thing on its card (' + disc.art + ' px) with a quiet collection line (“' + disc.kick + '”)');
  ok(/r-legendary/.test(disc.leg) && disc.tag, 'a legendary Amina gets the legendary frame and tag');

  /* ---------------- motion: Battery saver and Reduce motion ---------------- */
  const PZ = /^(pzcrit|pzsweep|pzspin|pzwipe|pzbossin|pzcheer|pztile|pzfire|pzsweepfast|pzpop|pzrays)$/;
  const motion = async () => { await startBattle('heartwood', 9); await sleep(150); const early = await page.evaluate((re) => document.getAnimations().filter((a) => a.playState === 'running' && new RegExp(re).test(a.animationName || '')).map((a) => a.animationName), PZ.source);
    await page.waitForSelector('.abtn.ready', { timeout: 10000 }); await page.evaluate(() => { const d = A.UI.B.disp; d.pHp = 1; A.UI.bRender(); });
    await sleep(100); const late = await page.evaluate((re) => document.getAnimations().filter((a) => a.playState === 'running' && new RegExp(re).test(a.animationName || '') && a.animationName !== 'pzpop').map((a) => a.animationName), PZ.source);
    await clean(); return early.concat(late); };
  const normal = await motion();
  await page.evaluate(() => { A.State.state.settings.batterySaver = true; A.Perf.apply(); }); const saver = await motion();
  await page.evaluate(() => { A.State.state.settings.batterySaver = false; A.Perf.apply(); A.State.state.settings.reduceMotion = true; document.body.classList.add('calm'); }); const calm = await motion();
  ok(normal.length > 0 && saver.length === 0 && calm.length === 0, 'combat decoration animates normally (' + [...new Set(normal)].join(', ') + ') and stops in Battery saver (' + saver.length + ') and with Reduce motion (' + calm.length + ')');
  // with Reduce motion the health bar jumps straight to the new value (still exact)
  await startBattle('reliquary', 4); await page.waitForSelector('.abtn.ready', { timeout: 10000 });
  const rm = await page.evaluate(() => { const d = A.UI.B.disp; d.eHp = Math.round(d.eMax / 2); A.UI.bRender(); const h = document.querySelector('#hb-e'); return { anim: h.classList.contains('dmg'), wipe: !!document.querySelector('.b-wipe') }; });
  ok(!rm.anim && !rm.wipe, 'with Reduce motion health changes are instant and the battle opens without the wipe');
  await page.evaluate(() => { A.State.state.settings.reduceMotion = false; document.body.classList.remove('calm'); }); await clean();

  /* ---------------- saves ---------------- */
  const sv = await page.evaluate(() => { const S = A.State, s = S.state, keys = (o) => Object.keys(o).sort().join(','); const fresh = keys(S.newGame()), now = keys(s);
    const extra = Object.keys(s).filter((k) => !(k in S.newGame())); S.save(); const raw = localStorage.getItem(S.KEY || 'aminas-save') || Object.keys(localStorage).map((k) => localStorage.getItem(k)).find((v) => /"schema"|"v"/.test(v || '')) || '';
    return { extra, schema: s.schema || s.v || s.version, uiKeys: /rewardSink|hpShown|chosen|acting/.test(raw), rawLen: raw.length }; });
  ok(sv.extra.length === 0 && !sv.uiKeys, 'saves are unchanged: no new save fields, and nothing from the new interface is written to the save' + (sv.extra.length ? ' (extra: ' + sv.extra.join(', ') + ')' : ''));

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log((fail ? 'FAILED' : 'PASSED') + ': ' + pass + ' passed, ' + fail + ' failed (browser-ui6)');
  await browser.close(); srv.close(); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error('ERROR ' + (e && e.message ? e.message.split('\n').slice(0, 6).join('\n') : e)); process.exit(1); });
