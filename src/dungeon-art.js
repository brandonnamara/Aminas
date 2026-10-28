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
    const p = (sp, px) => '<image href="assets/portraits/' + sp + '.webp" x="' + px + '" y="' + (y + h * 0.12) + '" width="' + w * 0.36 + '" height="' + h * 0.8 + '" filter="url(#sepia)" opacity=".82" preserveAspectRatio="xMidYMax meet"/>';
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
