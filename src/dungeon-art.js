/* Aminas — dungeon environment art (SVG, block style to match the voxel island).
   Art.envBg(key, o) draws the backdrop for one battle of a dungeon that tells its story through the environment
   (The Forgotten Road, The Gathering Hall) and the backgrounds of story scenes. Unknown keys return '' so callers
   fall back to the dungeon's usual sky (Art.battleBg). Pure strings, no DOM. */
(function (root) {
  'use strict';
  const A = root.A, Art = A.Art;
  const NS = 'http://www.w3.org/2000/svg';
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))))); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); };
  // one lit block: face, a lighter top strip and a darker right edge
  const blk = (x, y, s, c, h) => { h = h || s; return '<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + h + '" fill="' + c + '"/><rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + Math.max(2, s * 0.18) + '" fill="' + shade(c, 0.22) + '"/><rect x="' + (x + s - Math.max(2, s * 0.16)) + '" y="' + y + '" width="' + Math.max(2, s * 0.16) + '" height="' + h + '" fill="' + shade(c, -0.25) + '"/>'; };
  const rnd = (seed) => { let x = seed >>> 0 || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
  const svg = (inner, cls) => '<svg class="bg-svg env ' + (cls || '') + '" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" xmlns="' + NS + '">' + inner + '</svg>';
  const sky = (id, a, b, c) => '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset=".62" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient>' +
    '<filter id="sepia"><feColorMatrix type="matrix" values=".39 .77 .19 0 0  .35 .69 .17 0 0  .27 .53 .13 0 0  0 0 0 1 0"/></filter></defs><rect width="1000" height="500" fill="url(#' + id + ')"/>';
  // rolling hills made of block columns
  function hills(seed, top, side, base, y0, amp) {
    const r = rnd(seed); let out = '';
    for (let x = 0; x < 1000; x += 40) { const h = Math.round(y0 + Math.sin(x / 140 + seed) * amp + r() * 10); out += blk(x, h, 40, top, 18) + '<rect x="' + x + '" y="' + (h + 18) + '" width="40" height="' + (500 - h) + '" fill="' + side + '"/>'; }
    return out + '<rect y="' + (y0 + amp + 60) + '" width="1000" height="200" fill="' + base + '" opacity=".0"/>';
  }
  // the road: flagstones in perspective, grass blocks growing over them (more overgrown = more grass)
  function road(over, seed) {
    const r = rnd(seed); let out = '';
    for (let row = 0; row < 9; row++) {
      const y = 300 + row * 24, w = 140 + row * 70, n = 4 + row, s = w / n, x0 = 500 - w / 2;
      for (let i = 0; i < n; i++) {
        const g = r() < over * (1 - row * 0.06);
        out += blk(Math.round(x0 + i * s), y, Math.ceil(s) - 1, g ? (r() < 0.5 ? '#5aa046' : '#4a8c3c') : (r() < 0.5 ? '#9aa0a8' : '#8a9098'), 23);
      }
    }
    return out;
  }
  const tuft = (x, y, s) => blk(x, y, s, '#5fb04a') + blk(x + s, y + s * 0.4, s * 0.8, '#4a9a3c');
  const tree = (x, y, s) => blk(x + s, y + s * 2, s * 0.8, '#7a4f2a', s * 2) + blk(x, y, s * 2.8, '#3f8a3a', s * 2.2) + blk(x + s * 0.5, y - s * 0.9, s * 1.8, '#4fa046', s);
  const building = (x, y, w, h, roof) => blk(x, y, w, '#b9a88a', h) + (roof ? blk(x - 8, y - 22, w + 16, '#7a5a44', 22) : '') + '<rect x="' + (x + w * 0.38) + '" y="' + (y + h * 0.35) + '" width="' + w * 0.24 + '" height="' + h * 0.65 + '" fill="#3a3028"/>' + '<rect x="' + (x + w * 0.12) + '" y="' + (y + h * 0.2) + '" width="' + w * 0.16 + '" height="' + w * 0.14 + '" fill="#4a4036"/>';
  function signpost(x, y) {
    return '<g transform="rotate(-9 ' + x + ' ' + (y + 120) + ')">' + blk(x, y, 14, '#8a6040', 130) + '<path d="M' + (x - 70) + ' ' + (y + 14) + 'h80v28h-80l-18-14z" fill="#a07a50"/><path d="M' + (x + 4) + ' ' + (y + 52) + 'h80l18 14-18 14h-80z" fill="#93704a"/>' +
      '<path d="M' + (x - 60) + ' ' + (y + 28) + 'h50M' + (x + 14) + ' ' + (y + 66) + 'h56" stroke="#6a5030" stroke-width="3" stroke-dasharray="6 7" opacity=".6"/></g>';
  }
  // carved lintel: tall walking figures and small round ones walking with them (nobody leading)
  function lintel(x, y) {
    const fig = (fx, tall) => tall ? '<rect x="' + fx + '" y="' + (y + 16) + '" width="10" height="34" rx="2"/><circle cx="' + (fx + 5) + '" cy="' + (y + 10) + '" r="7"/><rect x="' + (fx + 1) + '" y="' + (y + 50) + '" width="3" height="10"/><rect x="' + (fx + 6) + '" y="' + (y + 50) + '" width="3" height="10"/>'
      : '<ellipse cx="' + (fx + 7) + '" cy="' + (y + 48) + '" rx="10" ry="9"/><path d="M' + (fx + 1) + ' ' + (y + 40) + 'l-3-8 6 4zM' + (fx + 13) + ' ' + (y + 40) + 'l3-8-6 4z"/>';
    return blk(x, y - 12, 420, '#a89a86', 84) + '<g fill="#6f6556" opacity=".9">' + [0, 1, 2, 3, 4, 5, 6].map((i) => fig(x + 30 + i * 54, i % 2 === 0)).join('') + '</g>';
  }
  // the mural: two portraits painted on a wall (sepia), uncovered in stages by removing moss blocks
  function mural(x, y, w, h, reveal, seed) {
    const r = rnd(seed); let moss = '';
    const cols = 12, rows = 6, cw = w / cols, ch = h / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const t = i / (cols - 1); // reveal runs left to right: the leaf-eared figure first, then the dark crested one
      const covered = reveal >= 4 ? r() < 0.02 : reveal >= 3 ? r() < 0.08 : reveal === 2 ? t > 0.78 || r() < 0.22 : t > 0.44 || r() < 0.35;
      if (covered) moss += blk(Math.round(x + i * cw), Math.round(y + j * ch), Math.ceil(cw), r() < 0.5 ? '#4f8a3c' : '#5f9a46', Math.ceil(ch));
    }
    const p = (sp, px) => '<image href="' + (A.Art && A.Art.portraitSrc ? A.Art.portraitSrc(sp) : 'assets/portraits/' + sp + '.webp') + '" x="' + px + '" y="' + (y + h * 0.12) + '" width="' + w * 0.36 + '" height="' + h * 0.8 + '" filter="url(#sepia)" opacity=".82" preserveAspectRatio="xMidYMax meet"/>';
    return blk(x - 24, y - 24, w + 48, '#8f8576', h + 48) + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#d8c8a4"/>' +
      '<rect x="' + x + '" y="' + (y + h * 0.86) + '" width="' + w + '" height="' + h * 0.14 + '" fill="#b89f78"/>' + p('lumifern', x + w * 0.12) + p('umbrit', x + w * 0.5) +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#6a4a2a" opacity=".12"/>' + moss;
  }
  function stones(x, y, glow) {
    return [0, 1, 2, 3].map((i) => blk(x + i * 130 - (i > 1 ? 0 : 0), y - (i === 1 || i === 2 ? 40 : 0), 46, '#9096a0', 170 + (i === 1 || i === 2 ? 40 : 0))).join('') +
      blk(x + 116, y - 70, 196, '#878d97', 34) + (glow ? '<ellipse cx="' + (x + 214) + '" cy="' + (y + 175) + '" rx="150" ry="18" fill="#ffe9a0" opacity="' + glow + '"/>' : '');
  }
  const motes = (c) => '<g class="motes">' + [0, 1, 2, 3, 4, 5].map((i) => '<rect class="ff f' + (i % 3) + '" x="' + (120 + i * 150) + '" y="' + (90 + (i * 57) % 200) + '" width="5" height="5" fill="' + c + '" style="animation-delay:' + i * 0.6 + 's"/>').join('') + '</g>';

  const ROADSKY = (boss) => sky('rs', boss ? '#5a3a5e' : '#7ec4ef', boss ? '#e09a6a' : '#cfe9f4', '#e8d6a8');
  const SCENES = {
    road1: () => ROADSKY() + hills(3, '#62ad4c', '#4f7a3a', '#3f6a30', 250, 18) + tree(90, 170, 26) + tree(820, 160, 30) + road(0.55, 11) + tuft(180, 300, 16) + tuft(760, 310, 18) + motes('#fffbe0'),
    road2: () => ROADSKY() + hills(5, '#62ad4c', '#4f7a3a', '#3f6a30', 250, 16) + tree(860, 165, 28) + road(0.4, 12) +
      [0, 1, 2, 3, 4].map((i) => blk(80 + i * 46, 300, 44, '#a39a8a', 26)).join('') + [0, 1, 2].map((i) => blk(700 + i * 46, 296, 44, '#a39a8a', 26)).join('') + motes('#fffbe0'),
    signs: () => ROADSKY() + hills(7, '#5aa046', '#4a7036', '#3a6030', 246, 14) + building(70, 190, 120, 110, true) + building(780, 180, 130, 120, false) + blk(780, 160, 60, '#a89878', 22) + road(0.32, 13) + signpost(640, 170) + motes('#fffbe0'),
    carving: () => ROADSKY() + hills(9, '#5aa046', '#4a7036', '#3a6030', 260, 12) + building(40, 200, 110, 100, true) + lintel(290, 120) + blk(290, 192, 30, '#a89a86', 120) + blk(680, 192, 30, '#a89a86', 120) +
      '<rect x="320" y="192" width="360" height="120" fill="#2e2620"/>' + road(0.3, 14) + motes('#fffbe0'),
    mural1: () => ROADSKY() + hills(11, '#5aa046', '#4a7036', '#3a6030', 270, 10) + mural(300, 90, 400, 190, 1, 21) + road(0.3, 15),
    mural2: () => ROADSKY() + hills(11, '#5aa046', '#4a7036', '#3a6030', 270, 10) + mural(300, 90, 400, 190, 2, 21) + road(0.25, 16),
    mural3: () => ROADSKY() + hills(11, '#5aa046', '#4a7036', '#3a6030', 270, 10) + mural(300, 90, 400, 190, 3, 21) + road(0.2, 17),
    mural: () => sky('rm', '#3a2a3e', '#8a6a5e', '#c8a07a') + mural(170, 60, 660, 330, 4, 23) + '<rect y="430" width="1000" height="70" fill="#4a3a2e"/>',
    roadend: (o) => ROADSKY(o && o.boss) + hills(13, '#4f9a44', '#3f6a34', '#30552a', 268, 10) + stones(290, 140, o && o.boss ? 0.35 : 0.2) + road(0.25, 18) + motes('#ffe0a0'),
    roadopen: () => ROADSKY() + hills(13, '#4f9a44', '#3f6a34', '#30552a', 268, 10) + stones(290, 140, 0) + '<path d="M420 500L470 310h60l50 190z" fill="#c8b890" opacity=".65"/>' + road(0.15, 19) + motes('#fff7c0'),
    heart: (o) => sky('hh', '#0e1418', '#1f3326', '#2c4a30') + '<defs><radialGradient id="pz"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".3" stop-color="#ffd86b" stop-opacity=".5"/><stop offset=".55" stop-color="#8fe6d6" stop-opacity=".3"/><stop offset=".8" stop-color="#ff86d6" stop-opacity=".15"/><stop offset="1" stop-color="#9a78e6" stop-opacity="0"/></radialGradient></defs>' +
      '<circle class="pz-glow" cx="500" cy="230" r="' + (o && o.boss ? 230 : 170) + '" fill="url(#pz)"/>' +
      [...Array(14)].map((_, i) => { const x = 40 + i * 70, w = 18 + (i % 3) * 8; return blk(x, 120 + (i % 4) * 30, w, i % 2 ? '#4a3a2a' : '#5a4630', 400); }).join('') +
      [0, 1, 2, 3, 4, 5].map((i) => blk(120 + i * 140, 360 - (i % 2) * 20, 120, '#3a5a34', 26)).join('') + motes('#fff4c0'),
    hall1: () => sky('hs', '#2a2230', '#4a3a3a', '#5a4436') + hallRoom(0) + motes('#ffd890'),
    hall2: () => sky('hs', '#2a2230', '#4a3a3a', '#5a4436') + hallRoom(1) + motes('#ffd890'),
    hall3: (o) => sky('hs', o && o.boss ? '#140f1c' : '#2a2230', '#3a2e32', '#4a3a30') + hallRoom(2) + motes('#ffd890'),
  };
  /* ---- Dev 8: backdrops for the dungeons that used to share one generic sky, each with a boss-room version ---- */
  const stars = (n, seed, c) => { const r = rnd(seed); return [...Array(n)].map(() => '<rect class="tw" x="' + Math.round(r() * 1000) + '" y="' + Math.round(r() * 200) + '" width="3" height="3" fill="' + (c || '#fff') + '" opacity="' + (0.3 + r() * 0.6).toFixed(2) + '"/>').join(''); };
  const glowE = (cx, cy, rx, ry, c, op) => '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + c + '" opacity="' + (op || 0.35) + '"/>';
  // the Overgrown Reliquary: a vault of mossy stacks and humming roots; boss room: the relic altar under a root dome
  SCENES.vault = (o) => sky('vs', o.boss ? '#122a20' : '#1f3a34', o.boss ? '#2c5a3a' : '#3f7a5a', '#2c5a3a') +
    [...Array(9)].map((_, i) => blk(40 + i * 110, 110 + (i % 3) * 26, 46, i % 2 ? '#5a6a52' : '#4f5f48', 330)).join('') +
    [...Array(9)].map((_, i) => blk(36 + i * 110, 100 + (i % 3) * 26, 54, '#5fae55', 18)).join('') +
    '<path d="M0 150Q240 60 500 130T1000 120" stroke="#4a3a24" stroke-width="14" fill="none"/><path d="M0 150Q240 60 500 130T1000 120" stroke="#7aff8a" stroke-width="2" fill="none" opacity=".35"/>' +
    (o.boss ? '<path d="M200 330Q500 20 800 330" stroke="#4a3a24" stroke-width="30" fill="none"/><path d="M200 330Q500 20 800 330" stroke="#7aff8a" stroke-width="3" fill="none" opacity=".4"/>' + blk(380, 250, 240, '#7a8a6a', 50) + blk(420, 210, 160, '#8a9a7a', 40) + blk(470, 170, 60, '#d8a830', 40) + glowE(500, 190, 110, 40, '#ffe27a', 0.25) : '') +
    '<rect y="380" width="1000" height="120" fill="#24402c"/>' + motes('#d8ffb0');
  // the Drowned Steps: a sea cave mouth, stone steps going down into blue; boss room: a drowned arch and its treasure
  SCENES.tide = (o) => sky('ts', o.boss ? '#0a1a34' : '#1a3a6a', o.boss ? '#1a4a7a' : '#3a8ac0', '#2a6a9a') + stars(o.boss ? 20 : 8, 31, '#bfefff') +
    '<path d="M0 0H1000V130Q860 40 700 120T380 110 0 140z" fill="#14243a"/>' + [...Array(7)].map((_, i) => blk(460 - i * 8, 230 + i * 22, 80 + i * 16, i % 2 ? '#6a7a86' : '#5a6a76', 22)).join('') +
    '<rect y="300" width="1000" height="200" fill="#2a7ab0" opacity=".85"/>' + [0, 1, 2, 3].map((i) => '<rect x="' + (80 + i * 240) + '" y="' + (318 + (i % 2) * 18) + '" width="120" height="4" fill="#bfefff" opacity=".4"/>').join('') +
    (o.boss ? blk(300, 120, 50, '#4f6f7a', 200) + blk(650, 120, 50, '#4f6f7a', 200) + blk(290, 100, 410, '#5a7a86', 40) + blk(470, 260, 60, '#c8b8d8', 30) + glowE(500, 270, 60, 26, '#ffffff', 0.35) +
      [0, 1, 2, 3, 4].map((i) => blk(400 + i * 44, 292, 16, '#ffd86b', 8)).join('') : blk(140, 180, 40, '#4f6f7a', 140) + blk(820, 170, 44, '#4f6f7a', 150)) + motes('#bfefff');
  // the Cold Kiln: brick walls and a chimney against a smoky dusk; boss room: the kiln mouth burning again
  SCENES.kiln = (o) => sky('ks', o.boss ? '#1a0a08' : '#2a1a1a', o.boss ? '#5a2a18' : '#6a3a2a', '#4a2a20') +
    [...Array(12)].map((_, i) => [...Array(5)].map((__, j) => blk(i * 86 + (j % 2) * 43 - 20, 140 + j * 40, 84, (i + j) % 2 ? '#7a3a28' : '#6a3222', 38)).join('')).join('') +
    blk(120, 20, 90, '#4a2218', 160) + '<rect x="130" y="0" width="70" height="30" fill="#6a6a6a" opacity=".5"/>' +
    (o.boss ? blk(330, 160, 340, '#4a2218', 200) + '<path d="M390 360V250Q500 170 610 250V360z" fill="#2a0c06"/><path d="M410 360V260Q500 196 590 260V360z" fill="#ff7a2a" class="pz-glow"/>' + glowE(500, 330, 220, 60, '#ff8a3a', 0.35) +
      [0, 1, 2].map((i) => blk(220 + i * 40, 330 - i * 30, 34, '#d8a050', 30 + i * 30)).join('') + [0, 1].map((i) => blk(700 + i * 50, 320 - i * 20, 38, '#c08040', 40 + i * 20)).join('') : '') +
    '<rect y="380" width="1000" height="120" fill="#3a2018"/>' + motes('#ffb070');
  // the Lantern Orchard: rows of lantern-trees going off into the dusk; boss room: the oldest, brightest tree
  SCENES.orchard = (o) => sky('os', '#1e1838', '#5a4a7a', '#8a6a7a') + stars(18, 41, '#ffe9a0') +
    [0, 1, 2].map((row) => [...Array(8)].map((_, i) => { const x = 40 + i * 128 + row * 40, y = 210 - row * 30, s = 1 - row * 0.25; return blk(x + 18 * s, y + 40 * s, 12 * s, '#4a3020', 80 * s) + blk(x, y, 48 * s, row ? '#2f5a3a' : '#3f7a4a', 46 * s) + blk(x + 14 * s, y + 36 * s, 8 * s, '#ffd070', 10 * s); }).join('')).join('') +
    (o.boss ? blk(460, 140, 80, '#4a3020', 240) + blk(330, 60, 340, '#3f7a4a', 120) + blk(380, 20, 240, '#4f8a54', 60) + [...Array(12)].map((_, i) => blk(350 + (i % 6) * 56, 90 + Math.floor(i / 6) * 70, 14, '#ffd070', 18)).join('') + glowE(500, 160, 260, 120, '#ffd070', 0.22) : '') +
    '<rect y="380" width="1000" height="120" fill="#3a5a34"/>' + motes('#ffe9a0');
  // the Windworn Stair: cliffs and sky below the Spire; boss room: the tower of the Weathervane
  SCENES.stair = (o) => sky('ws', o.boss ? '#3a5a8a' : '#7ec4ef', o.boss ? '#a8c8e8' : '#cfe9f4', '#e8f4f8') +
    '<g fill="#fff" opacity=".8"><rect x="120" y="70" width="140" height="22"/><rect x="150" y="54" width="70" height="20"/><rect x="700" y="100" width="160" height="22"/><rect x="740" y="84" width="80" height="20"/></g>' +
    [...Array(10)].map((_, i) => blk(i * 104, 260 - (i % 4) * 30, 104, i % 2 ? '#98a0aa' : '#a8b0b8', 260)).join('') + [...Array(6)].map((_, i) => blk(80 + i * 60, 330 - i * 26, 60, '#8e96a0', 24)).join('') +
    (o.boss ? blk(560, 60, 90, '#a0a8b0', 300) + blk(580, 20, 50, '#8e96a0', 44) + '<rect x="603" y="-10" width="4" height="34" fill="#6a5a4a"/><path d="M560 -6h90l-14 10 14 10h-90z" fill="#ffd86b"/>' + glowE(605, 200, 120, 220, '#8fe6d6', 0.15) : '') +
    '<rect y="400" width="1000" height="100" fill="#8e96a0"/>' + motes('#ffffff');
  /* ---- Phase 18C: the Verdant Wilds' ten dungeons, each with its own backdrop (normal and boss room), in the
     island's jungle palette: mossy green-grey stone, deep greens, teal water, gold spores. Same flat voxel style. ---- */
  const VS = { moss: '#5fa34e', mossD: '#3f7a3a', stone: '#8a9a88', stoneD: '#5e6e5c', leaf: '#2f8f48', leafL: '#4fbf63', water: '#3db4c4', bark: '#6a4a2c' };
  // flat blocks for wide pieces (blk's top light grows with width, which suits columns but not long slabs)
  const fr = (x, y, w, h, c) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"/><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + Math.min(4, h) + '" fill="' + shade(c, 0.22) + '"/><rect x="' + (x + w - Math.min(6, w * 0.1)) + '" y="' + y + '" width="' + Math.min(6, w * 0.1) + '" height="' + h + '" fill="' + shade(c, -0.25) + '"/>';
  const vstone = (x, y, w, h) => fr(x, y, w, h, VS.stone) + fr(x, y, w, Math.max(5, Math.round(h * 0.15)), VS.moss);
  const vfloor = (c) => '<rect y="390" width="1000" height="110" fill="' + c + '"/>';
  SCENES.v_mossgate = (o) => sky('vm', o.boss ? '#1f4a3a' : '#7ec8a8', o.boss ? '#3f7a5a' : '#c8ecd0', '#9ad0a0') + hills(31, VS.leafL, VS.leaf, '#2a6a38', 250, 14) +
    [...Array(7)].map((_, i) => vstone(330 + i * 10, 380 - i * 34, 340 - i * 20, 34)).join('') + [0, 1].map((i) => vstone(260 + i * 440, 180, 40, 210)).join('') + (o.boss ? vstone(250, 150, 500, 40) + glowE(500, 200, 120, 60, '#bff7a8', 0.3) : '') + vfloor('#3f6a3a') + motes('#fff4c0');
  SCENES.v_aqueduct = (o) => sky('va', o.boss ? '#0f2a3a' : '#5ab0c8', o.boss ? '#1f5a6a' : '#a8e0e8', '#6ab8c8') +
    [...Array(6)].map((_, i) => vstone(40 + i * 170, 120, 40, 270)).join('') + vstone(20, 100, 960, 36) + '<rect x="20" y="96" width="960" height="8" fill="' + VS.water + '"/>' +
    '<rect y="330" width="1000" height="170" fill="' + VS.water + '" opacity=".85"/>' + [0, 1, 2, 3].map((i) => '<rect x="' + (90 + i * 230) + '" y="' + (350 + (i % 2) * 18) + '" width="120" height="6" fill="#d8fbff" opacity=".6"/>').join('') +
    (o.boss ? vstone(420, 190, 160, 140) + fr(450, 220, 100, 110, '#1a3a4a') + glowE(500, 280, 90, 40, '#8fe4ff', 0.35) : '') + motes('#d8fbff');
  SCENES.v_spore = (o) => sky('vsp', '#1a2a1e', o.boss ? '#3a4a20' : '#2f5a32', '#3a6a3a') + stars(o.boss ? 26 : 14, 61, '#ffe9a0') +
    [...Array(8)].map((_, i) => { const x = 60 + i * 120, h = 90 + (i % 3) * 40; return blk(x + 20, 390 - h, 16, '#e8e0c8', h) + fr(x - 10, 390 - h - 30, 76, 34, i % 2 ? '#c8a050' : '#d8b860'); }).join('') +
    (o.boss ? blk(420, 160, 30, '#e8e0c8', 230) + fr(330, 110, 210, 60, '#e0b04a') + glowE(435, 140, 160, 70, '#ffe48a', 0.4) : '') + vfloor('#2a4a2a') + motes('#ffe48a');
  SCENES.v_archive = (o) => sky('var', o.boss ? '#14181c' : '#2a3430', '#3a4a40', '#4a5a4a') +
    [...Array(5)].map((_, i) => { const x = 40 + i * 200; return fr(x, 70, 160, 300, '#5a4a3a') + [...Array(5)].map((__, j) => fr(x + 10, 86 + j * 56, 140, 18, j % 2 ? '#d8cfa8' : '#c4b88e')).join('') + fr(x, 70, 160, 14, '#3f9a4a'); }).join('') +
    (o.boss ? fr(380, 220, 240, 150, '#4a5a6a') + glowE(500, 250, 140, 50, '#bfe0ff', 0.3) : '') + vfloor('#3a3a34') + motes('#ffe9b0');
  SCENES.v_glow = (o) => sky('vg', o.boss ? '#2a0e08' : '#4a2a1a', o.boss ? '#7a3a18' : '#8a4a2a', '#5a3a28') +
    [0, 1, 2, 3].map((i) => vstone(0, 200 + i * 50, 1000, 50 - i * 4)).join('') + [...Array(10)].map((_, i) => blk(40 + i * 100, 186 + (i % 4) * 50, 14, i % 2 ? '#2a2236' : '#ffd25a', 18)).join('') +
    (o.boss ? glowE(500, 200, 220, 90, '#ff9a4a', 0.35) + fr(440, 120, 120, 40, '#ff9a4a') : '') + vfloor('#4a3020') + motes('#ffb070');
  SCENES.v_twinshrine = (o) => '<rect width="500" height="500" fill="' + (o.boss ? '#e8dcb0' : '#f2ead0') + '"/><rect x="500" width="500" height="500" fill="' + (o.boss ? '#1a1630' : '#2e2848') + '"/>' +
    [0, 1, 2].map((i) => blk(80 + i * 130, 120, 40, '#e4dccb', 270) + blk(560 + i * 130, 120, 40, '#423a62', 270)).join('') + '<rect x="480" y="0" width="40" height="500" fill="' + VS.water + '" opacity=".8"/>' +
    fr(420, 330, 160, 14, '#8a6a4a') + (o.boss ? glowE(300, 180, 100, 50, '#fff6c0', 0.45) + glowE(700, 180, 100, 50, '#c9a8ff', 0.45) : '') + vfloor('#6a6a5a') + motes('#ffffff');
  SCENES.v_canopy = (o) => sky('vc', o.boss ? '#3a6a8a' : '#8ad0f0', '#cfeef8', '#e8f8f4') +
    [...Array(6)].map((_, i) => blk(40 + i * 180, 0, 50, VS.bark, 500) + fr(i * 180, 40 + (i % 2) * 30, 140, 70, i % 2 ? VS.leaf : VS.leafL)).join('') +
    [0, 1].map((r) => [...Array(20)].map((_, i) => fr(i * 50, 260 + r * 90 + Math.round(Math.abs(i - 10) * 2), 48, 8, '#c8a46a')).join('')).join('') +
    (o.boss ? fr(380, 200, 240, 20, '#a08060') + glowE(500, 160, 160, 60, '#ffffff', 0.4) : '') + motes('#ffffff');
  SCENES.v_moonwell = (o) => sky('vmw', '#0a0e24', o.boss ? '#1a2050' : '#222a5a', '#2a3a6a') + stars(30, 81, '#e2d4ff') +
    '<path d="M0 0H1000V160Q800 80 500 130T0 120z" fill="#141a30"/>' + [...Array(9)].map((_, i) => blk(i * 115, 120, 22, VS.bark, 120 + (i % 3) * 30)).join('') +
    '<rect y="300" width="1000" height="200" fill="#1a3a6a"/><ellipse cx="500" cy="360" rx="300" ry="40" fill="#e2d4ff" opacity="' + (o.boss ? 0.35 : 0.18) + '"/>' + motes('#e2d4ff');
  SCENES.v_choir = (o) => sky('vch', o.boss ? '#2a1a3a' : '#4a3a6a', '#7a6a9a', '#8a7aa0') +
    [...Array(7)].map((_, i) => { const x = 60 + i * 140, h = 140 + (i % 3) * 40; return fr(x, 390 - h, 54, h, '#dcd8e8') + fr(x, 390 - h, 54, 10, '#f2efff') + blk(x + 20, 390 - h + 40, 14, i === 3 ? '#e8fff0' : '#a8e4ff', 14); }).join('') +
    '<path d="M0 390Q250 340 500 380T1000 370V400H0z" fill="' + VS.bark + '"/>' + (o.boss ? glowE(500, 220, 260, 110, '#e8fff0', 0.25) : '') + vfloor('#3a3048') + motes('#ffd0f0');
  SCENES.v_elderroot = (o) => sky('ver', '#0a140e', o.boss ? '#1a3a20' : '#22422a', '#2c4a30') +
    fr(380, 0, 240, 420, VS.bark) + [...Array(8)].map((_, i) => '<path d="M' + (500 + (i - 3.5) * 40) + ' 380Q' + (500 + (i - 3.5) * 120) + ' 300 ' + (500 + (i - 3.5) * 150) + ' 420" stroke="' + VS.bark + '" stroke-width="26" fill="none"/>').join('') +
    fr(440, 260, 120, 160, '#1a0e08') + [...Array(6)].map((_, i) => fr(80 + i * 160, 60 + (i % 2) * 40, 120, 60, i % 2 ? VS.leaf : '#26783c')).join('') +
    (o.boss ? glowE(500, 300, 180, 90, '#9af2ff', 0.3) : '') + vfloor('#1f3326') + motes('#9af2ff');
  // the Hollow Veil and the Resonance Scar keep their v0.4 skies; their boss rooms get set dressing in front of them
  function hallRoom(stage) {
    let out = '';
    for (let x = 0; x < 1000; x += 50) for (let y = 40; y < 300; y += 50) out += '<rect x="' + x + '" y="' + y + '" width="49" height="49" fill="' + ((x + y) % 100 ? '#5a4a40' : '#54453c') + '"/>';
    out += '<rect y="300" width="1000" height="200" fill="#6a5440"/>';
    for (let x = 0; x < 1000; x += 60) out += '<rect x="' + x + '" y="300" width="58" height="200" fill="' + (x % 120 ? '#735c46' : '#6a543f') + '"/>';
    [140, 470, 800].forEach((x) => { out += '<circle cx="' + x + '" cy="110" r="44" fill="#ffd890" opacity=".18"/>' + blk(x - 8, 92, 16, '#e8c070', 26); });
    if (stage === 0) [0, 1].forEach((t) => { out += blk(120 + t * 420, 330 + t * 40, 340, '#8a6644', 22) + [0, 1, 2, 3, 4, 5].map((i) => blk(140 + t * 420 + i * 52, 318 + t * 40, 18, '#d8d0c0', 12)).join(''); });
    if (stage === 1) [0, 1, 2].forEach((i) => { out += blk(160 + i * 260, 360, 150, '#8a7a6a', 50) + '<rect x="' + (172 + i * 260) + '" y="366" width="126" height="14" fill="#a89888"/>'; });
    if (stage === 2) { out += blk(380, 130, 240, '#8a6644', 150) + '<rect x="396" y="146" width="208" height="118" fill="#b89a70"/>' + [...Array(9)].map((_, i) => '<circle cx="' + (420 + (i % 3) * 80) + '" cy="' + (166 + Math.floor(i / 3) * 36) + '" r="2.5" fill="#4a3a2a"/>').join(''); }
    return out;
  }
  Art.envBg = function (key, o) { const f = SCENES[key]; return f ? svg(f(o || {}), key) : ''; };
  Art.hasEnv = (key) => !!SCENES[key];
})(typeof window !== 'undefined' ? window : globalThis);
