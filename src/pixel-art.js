/* Aminas — Dev 8 "living pixel" sprites: the currencies (gold, food, gems), the nine elemental essences and the
   player avatar, all drawn as small pixel grids and output as crisp SVG (one <rect> per horizontal run, cached).
   Art.icon() keeps working for every other icon; only these names are replaced by full-colour pixel sprites. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, Art = A.Art;
  const PX = (A.Pixel = {});

  // grid: array of strings, one char per pixel ('.' = empty); pal: char -> colour
  PX.svg = function (grid, pal, cls, title) {
    const h = grid.length, w = grid[0].length; let out = '';
    for (let y = 0; y < h; y++) {
      let x = 0; const row = grid[y];
      while (x < w) {
        const c = row[x]; if (c === '.' || !pal[c]) { x++; continue; }
        let n = 1; while (x + n < w && row[x + n] === c) n++;
        out += '<rect x="' + x + '" y="' + y + '" width="' + n + '" height="1" fill="' + pal[c] + '"/>';
        x += n;
      }
    }
    return '<svg class="ico px ' + (cls || '') + '" viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges" aria-hidden="true"' + (title ? ' role="img"' : '') + '>' + (title ? '<title>' + title + '</title>' : '') + out + '</svg>';
  };
  const blank = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
  const toRows = (g) => g.map((r) => r.join(''));

  /* ---- gold: a thick minted coin with a stamped spark, rim, and a top-left highlight ---- */
  function coin() {
    const g = blank(14, 14), cx = 6.5, cy = 6.5;
    for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
      const d = Math.hypot(x - cx, y - cy); if (d > 6.6) continue;
      let c = d > 5.7 ? 'o' : d > 4.7 ? 'r' : 'g';
      if (c === 'r' && x + y < 9) c = 'l';            // rim catches the light
      if (c === 'r' && x + y > 18) c = 'd';
      if (c === 'g' && x + y > 15) c = 'd';
      if (c === 'g' && (x - 4) * (x - 4) + (y - 4) * (y - 4) < 2.2) c = 'w';
      g[y][x] = c;
    }
    // stamped four-point spark in the middle
    [[6, 4], [7, 4], [6, 5], [7, 5], [4, 6], [5, 6], [8, 6], [9, 6], [4, 7], [5, 7], [8, 7], [9, 7], [6, 8], [7, 8], [6, 9], [7, 9], [6, 6], [7, 6], [6, 7], [7, 7]].forEach(([x, y]) => { g[y][x] = 's'; });
    [[6, 6], [7, 7]].forEach(([x, y]) => { g[y][x] = 'l'; });
    return toRows(g);
  }
  /* ---- food: a plump honey-berry with a leaf and stalk (red/green, never confused with gold or gems) ---- */
  function berry() {
    const g = blank(14, 14), cx = 6.6, cy = 8;
    for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
      const d = Math.hypot((x - cx) * 1.05, (y - cy) * 1.1); if (d > 5.6) continue;
      let c = d > 4.8 ? 'o' : 'r';
      if (c === 'r' && x + y > 17) c = 'd';
      if (c === 'r' && (x - 4.5) * (x - 4.5) + (y - 6) * (y - 6) < 2.4) c = 'w';
      if (c === 'r' && x === 5 && y === 8) c = 'p';
      g[y][x] = c;
    }
    [[7, 1], [7, 2], [6, 2]].forEach(([x, y]) => { g[y][x] = 'b'; });                         // stalk
    [[8, 1], [9, 1], [10, 1], [8, 2], [9, 2], [10, 2], [11, 2], [9, 3], [10, 3]].forEach(([x, y]) => { g[y][x] = 'f'; }); // leaf
    [[9, 1], [10, 2]].forEach(([x, y]) => { g[y][x] = 'e'; });
    [[4, 3], [5, 3]].forEach(([x, y]) => { g[y][x] = 'n'; });                                  // little honey drop
    return toRows(g);
  }
  /* ---- gems (Phase 8): a brilliant-cut prismatic crystal. A pale table and crown catch the light; the pavilion splits
     it into rainbow facets (rose, violet, cyan, mint, gold) that darken towards the point; one white sparkle. ---- */
  function gem() {
    // the earlier gem's silhouette (it reads well at 16 px); only the colouring is new
    const SHAPE = ['...oooooooo...', '..o........o..', '.o..........o.', 'o............o', 'o............o', '.o..........o.', '.o..........o.', '..o........o..', '...o......o...', '....o....o....', '.....o..o.....', '......oo......', '..............', '..............'];
    const g = SHAPE.map((r) => r.split(''));
    for (let y = 1; y <= 10; y++) { const row = g[y], a = row.indexOf('o'), b = row.lastIndexOf('o');
      for (let x = a + 1; x < b; x++) {
        let c;
        if (y <= 3) c = (x >= 5 && x <= 8) ? (y === 1 ? 'T' : 't') : x < 5 ? 'L' : 'l';                  // crown: table and side facets
        else if (y === 4) c = 'G';                                                                        // girdle
        else { const f = (x - a - 1) / Math.max(1, b - a - 2), band = Math.min(4, Math.floor(f * 5)); c = 'PVCMY'[band]; if (y >= 8) c = c.toLowerCase(); if (x === a + 1 && y <= 8) c = 'H'; }
        row[x] = c; } }
    [[4, 1], [5, 1], [3, 2]].forEach(([x, y]) => { g[y][x] = 'w'; });     // sparkle on the upper-left facet
    g[2][10] = 'w';
    return g.map((r) => r.join(''));
  }
  const GEM = gem();
  /* ---- essence: a living crystal shard with drifting pixels (the "radiating" look) ---- */
  const SHARD = [
    '......o.......',
    '..x..olo....x.',
    '.....olmo.....',
    '....olwmmo....',
    '....olmmmo..x.',
    '...olwmmmdo...',
    '...olmmmmdo...',
    'x..olmmmmdo...',
    '...olmmmmdo...',
    '....olmmdo....',
    '....olmmdo..x.',
    '.....olmo.....',
    '..x...oo......',
    '..............',
  ];
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))))); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); };

  const SPRITES = {};
  SPRITES.gold = [coin(), { o: '#6b3a08', r: '#d9971c', l: '#ffe27a', d: '#b06d0e', g: '#f6bf2e', w: '#fff6c8', s: '#c47f10' }];
  SPRITES.food = [berry(), { o: '#5a1222', r: '#ff5a6e', d: '#c22a48', w: '#ffd0d6', p: '#ff9aa8', b: '#6a4220', f: '#4fbf4a', e: '#9ae86a', n: '#ffcf4a' }];
  SPRITES.gem = [GEM, { o: '#2a1a5e', w: '#ffffff', T: '#effcff', t: '#c8f4ff', L: '#ffd2f4', l: '#d8fff0', G: '#a8e8ff', P: '#ff8fd0', V: '#a98bff', C: '#5fd8ff', M: '#6ff0c0', Y: '#ffe27a', p: '#c4509a', v: '#6a4ad0', c: '#2a9ad8', m: '#2fb48a', y: '#d9a83a', H: '#f4fbff' }];
  D.ESSENCES = Object.keys(D.ELEMENTS);
  D.ESSENCES.forEach((el) => {
    const c = D.ELEMENTS[el].color;
    SPRITES['ess_' + el] = [SHARD, { o: shade(c, -0.62), l: shade(c, 0.55), w: '#ffffff', m: c, d: shade(c, -0.3), x: shade(c, 0.3) }];
  });
  const cache = {};
  PX.sprite = function (name, cls) {
    const k = name + '|' + (cls || ''); if (cache[k]) return cache[k];
    const s = SPRITES[name]; if (!s) return '';
    return (cache[k] = PX.svg(s[0], s[1], 'px-' + name.replace('ess_', 'ess ess-') + ' ' + (cls || '')));
  };
  PX.has = (name) => !!SPRITES[name];
  // the same sprite as a nested <svg> for use inside another SVG (island bubbles, battle rewards)
  PX.inline = function (name, x, y, size) {
    const sv = PX.sprite(name); if (!sv) return '';
    return sv.replace(/^<svg class="[^"]*"/, '<svg x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '"');
  };
  // Art.icon: pixel sprites for the currencies and essences, the original line icons for everything else.
  if (Art && Art.icon) { // (absent in the Node test harness, which only needs the data)
    const icon0 = Art.icon;
    Art.icon = (n, cls) => (SPRITES[n] ? PX.sprite(n, cls) : icon0(n, cls));
    Art.essIcon = (el, cls) => PX.sprite('ess_' + el, cls);
  }
  PX.essName = (el) => (D.ELEMENTS[el] ? D.ELEMENTS[el].name + ' Essence' : 'Essence');

  /* ================================================================ the player avatar */
  // A pixel head-and-shoulders bust, 16×16, built from parts. Every option is drawn here (no image files).
  D.AVATAR = {
    skin: [['Fair', '#ffe0c8'], ['Rose', '#f7c4a4'], ['Golden', '#e8b07c'], ['Olive', '#c99464'], ['Brown', '#9a6640'], ['Deep', '#6a4228']],
    hair: [['Short', 'short'], ['Tousled', 'messy'], ['Long', 'long'], ['Buns', 'buns'], ['Mohawk', 'mohawk'], ['Shaved', 'shaved']],
    hairCol: [['Ink', '#2a2238'], ['Chestnut', '#7a4a2a'], ['Honey', '#e0a640'], ['Ember', '#e0542e'], ['Moss', '#5aa046'], ['Moon', '#d8d8f0'], ['Dusk', '#8a5ad8']],
    eyes: [['Round', 'round'], ['Sleepy', 'sleepy'], ['Bright', 'bright'], ['Glow', 'glow']],
    outfit: [['Sun', '#ffb43a'], ['Leaf', '#5ab86a'], ['Tide', '#3a8ad8'], ['Plum', '#8a4ac8'], ['Cinder', '#d84a3a'], ['Slate', '#5a6a80']],
    acc: [['None', 'none'], ['Leaf pin', 'leaf'], ['Cap', 'cap'], ['Headband', 'band'], ['Goggles', 'goggles'], ['Crown of sparks', 'sparks']],
  };
  D.AVATAR_DEFAULT = { skin: 1, hair: 0, hairCol: 1, eyes: 0, outfit: 0, acc: 0 };
  PX.avatarLook = function (av) {
    const o = Object.assign({}, D.AVATAR_DEFAULT, av || {});
    Object.keys(D.AVATAR).forEach((k) => { const n = D.AVATAR[k].length; o[k] = Math.max(0, Math.min(n - 1, o[k] | 0)); });
    return o;
  };
  PX.avatar = function (av, cls) {
    const o = PX.avatarLook(av), g = blank(16, 16);
    const skin = D.AVATAR.skin[o.skin][1], hairC = D.AVATAR.hairCol[o.hairCol][1], fit = D.AVATAR.outfit[o.outfit][1];
    const pal = { k: shade(skin, -0.55), s: skin, S: shade(skin, -0.16), h: hairC, H: shade(hairC, 0.28), j: shade(hairC, -0.35), f: fit, F: shade(fit, -0.3), L: shade(fit, 0.35), e: '#241a34', w: '#ffffff', c: '#ff8a9a', a: '#ffd86b', A: '#fff3b0', g: '#7ae0ff', G: '#2a3a5a', m: '#5fbf4a', M: '#a8f06a', b: '#e04a5a' };
    const put = (x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c); };
    // shoulders and outfit
    rect(2, 13, 13, 15, 'f'); rect(3, 12, 12, 12, 'f'); rect(2, 15, 13, 15, 'F'); rect(7, 12, 8, 14, 'L'); put(2, 13, 'F'); put(13, 13, 'F');
    rect(6, 11, 9, 12, 'S'); // neck
    // head
    rect(4, 3, 11, 10, 's'); rect(5, 2, 10, 2, 's'); rect(5, 11, 10, 11, 's'); rect(11, 4, 11, 10, 'S'); rect(5, 11, 10, 11, 'S');
    put(3, 6, 's'); put(3, 7, 'S'); put(12, 6, 'S'); put(12, 7, 'S'); // ears
    put(5, 9, 'c'); put(10, 9, 'c'); // cheeks
    rect(7, 9, 8, 9, 'k'); // mouth
    // eyes
    const eye = D.AVATAR.eyes[o.eyes][1];
    if (eye === 'sleepy') { rect(5, 7, 6, 7, 'e'); rect(9, 7, 10, 7, 'e'); }
    else if (eye === 'bright') { rect(5, 6, 6, 7, 'e'); rect(9, 6, 10, 7, 'e'); put(5, 6, 'w'); put(9, 6, 'w'); rect(5, 5, 6, 5, 'k'); rect(9, 5, 10, 5, 'k'); }
    else if (eye === 'glow') { rect(5, 6, 6, 7, 'g'); rect(9, 6, 10, 7, 'g'); put(5, 6, 'w'); put(9, 6, 'w'); }
    else { rect(5, 6, 6, 7, 'e'); rect(9, 6, 10, 7, 'e'); put(6, 6, 'w'); put(10, 6, 'w'); }
    // hair
    const hair = D.AVATAR.hair[o.hair][1];
    if (hair === 'short') { rect(4, 1, 11, 3, 'h'); rect(3, 3, 4, 5, 'h'); rect(11, 3, 12, 5, 'h'); rect(5, 1, 8, 1, 'H'); put(9, 4, 'h'); put(6, 4, 'h'); }
    else if (hair === 'messy') { rect(4, 1, 11, 3, 'h'); rect(3, 2, 4, 6, 'h'); rect(11, 2, 12, 6, 'h'); put(5, 0, 'h'); put(8, 0, 'h'); put(11, 1, 'h'); put(5, 4, 'h'); put(8, 4, 'h'); put(10, 4, 'h'); rect(6, 1, 7, 1, 'H'); }
    else if (hair === 'long') { rect(4, 1, 11, 3, 'h'); rect(3, 2, 4, 12, 'h'); rect(11, 2, 12, 12, 'h'); rect(5, 1, 7, 1, 'H'); put(5, 4, 'h'); put(10, 4, 'h'); rect(3, 12, 4, 13, 'j'); rect(11, 12, 12, 13, 'j'); }
    else if (hair === 'buns') { rect(4, 1, 11, 3, 'h'); rect(2, 0, 4, 2, 'h'); rect(11, 0, 13, 2, 'h'); put(2, 0, 'H'); put(11, 0, 'H'); rect(3, 3, 4, 5, 'h'); rect(11, 3, 12, 5, 'h'); }
    else if (hair === 'mohawk') { rect(7, 0, 8, 3, 'h'); rect(6, 1, 9, 2, 'h'); put(7, 0, 'H'); rect(4, 3, 5, 3, 'j'); rect(10, 3, 11, 3, 'j'); }
    else { rect(4, 2, 11, 2, 'j'); rect(4, 3, 4, 4, 'j'); rect(11, 3, 11, 4, 'j'); }
    // accessory
    const acc = D.AVATAR.acc[o.acc][1];
    if (acc === 'leaf') { put(10, 1, 'm'); put(11, 1, 'M'); put(11, 2, 'm'); put(12, 2, 'm'); }
    else if (acc === 'cap') { rect(4, 0, 11, 2, 'b'); rect(3, 3, 13, 3, 'b'); rect(5, 0, 7, 0, 'c'); }
    else if (acc === 'band') { rect(4, 3, 11, 3, 'b'); put(12, 4, 'b'); put(12, 5, 'b'); }
    else if (acc === 'goggles') { rect(4, 3, 11, 3, 'G'); rect(5, 2, 6, 3, 'g'); rect(9, 2, 10, 3, 'g'); }
    else if (acc === 'sparks') { put(5, 0, 'a'); put(8, 0, 'A'); put(11, 0, 'a'); put(6, 1, 'a'); put(10, 1, 'a'); put(8, 1, 'a'); }
    return PX.svg(toRows(g), pal, 'avatar-px ' + (cls || ''));
  };
})(typeof window !== 'undefined' ? window : globalThis);
