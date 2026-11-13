/* Aminas — procedural original art (SVG strings). No external image assets. */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = A.Data;
  const Art = (A.Art = {});
  let uidc = 0;

  /* ---------- colour helpers ---------- */
  function hex2rgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function shade(h, amt) {
    const c = hex2rgb(h).map((v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt))));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  Art.shade = shade;

  /* ---------- icons (24x24, stroke) ---------- */
  const ICONS = {
    gold: '<circle cx="12" cy="12" r="8" fill="currentColor" fill-opacity=".25"/><circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.5c0-1 1-1.6 2.5-1.6s2.5.6 2.5 1.6-1 1.5-2.5 1.9-2.5.9-2.5 2 1 1.7 2.5 1.7 2.5-.7 2.5-1.7"/>',
    food: '<path d="M12 8c-3-2.5-7 0-7 5 0 4 3 7 7 7s7-3 7-7c0-5-4-7.500-7-5z" fill="currentColor" fill-opacity=".25"/><path d="M12 8c-3-2.5-7 0-7 5 0 4 3 7 7 7s7-3 7-7c0-5-4-7.500-7-5z"/><path d="M12 8c0-2 1-3.500 3-4.500"/><path d="M12 8c-1-1.500-3-2-4-1.500"/>',
    gem: '<path d="M6 4h12l4 6-10 11L2 10z" fill="currentColor" fill-opacity=".25"/><path d="M6 4h12l4 6-10 11L2 10zM2 10h20M9 4l-2 6 5 11 5-11-2-6"/>',
    paw: '<ellipse cx="12" cy="16" rx="5" ry="4" fill="currentColor" fill-opacity=".25"/><ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="5.500" cy="11" r="2"/><circle cx="9.500" cy="6.500" r="2"/><circle cx="14.500" cy="6.500" r="2"/><circle cx="18.500" cy="11" r="2"/>',
    scroll: '<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2V4z" fill="currentColor" fill-opacity=".2"/><path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2V4zM6 4a2 2 0 0 0-2 2v1h2M10 9h6M10 13h6"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.500 8.500l-2 5-5 2 2-5z" fill="currentColor" fill-opacity=".3"/><path d="M15.500 8.500l-2 5-5 2 2-5z"/>',
    gate: '<path d="M4 21V10a8 8 0 0 1 16 0v11" fill="currentColor" fill-opacity=".2"/><path d="M4 21V10a8 8 0 0 1 16 0v11M8 21v-8a4 4 0 0 1 8 0v8M2 21h20"/>',
    egg: '<path d="M12 3c-4 0-7 6-7 11a7 7 0 0 0 14 0c0-5-3-11-7-11z" fill="currentColor" fill-opacity=".25"/><path d="M12 3c-4 0-7 6-7 11a7 7 0 0 0 14 0c0-5-3-11-7-11zM8 13l2 2 2-2 2 2 2-2"/>',
    chat: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="currentColor" fill-opacity=".2"/><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 10h8M8 13h5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2l1.500 3a7 7 0 0 1 2.500 1l3.200-1 1.500 2.600-2.300 2.300a7 7 0 0 1 0 2.200l2.300 2.300-1.500 2.600-3.200-1a7 7 0 0 1-2.500 1L12 22l-1.500-3a7 7 0 0 1-2.500-1l-3.200 1-1.500-2.600 2.300-2.300a7 7 0 0 1 0-2.200L3.300 8.600 4.800 6l3.200 1a7 7 0 0 1 2.500-1z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" fill-opacity=".25"/><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    close: '<path d="M5 5l14 14M19 5L5 19"/>',
    star: '<path d="M12 3l2.600 5.600 6.100.7-4.500 4.200 1.200 6L12 16.500 6.600 19.500l1.200-6L3.300 9.300l6.100-.7z" fill="currentColor" fill-opacity=".3"/><path d="M12 3l2.600 5.600 6.100.7-4.500 4.200 1.200 6L12 16.500 6.600 19.500l1.200-6L3.300 9.300l6.100-.7z"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.500 4.500 0 0 1 8-2.500A4.500 4.500 0 0 1 20 9c0 6-8 11-8 11z" fill="currentColor" fill-opacity=".3"/><path d="M12 20s-8-5-8-11a4.500 4.500 0 0 1 8-2.500A4.500 4.500 0 0 1 20 9c0 6-8 11-8 11z"/>',
    check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    swords: '<path d="M20 4l-10.5 10.5M20 4h-3.2M20 4v3.2M6.2 12.8l5 5M8.6 15.4L4 20"/><path d="M4 4l10.5 10.5M4 4h3.2M4 4v3.2M17.8 12.8l-5 5M15.4 15.4L20 20"/>',
    spark: '<path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800z" fill="currentColor" fill-opacity=".3"/><path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800z"/>',
    swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" fill="currentColor" fill-opacity=".2"/><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21a2 2 0 0 1 2-2h13v2z"/>',
    home: '<path d="M4 11l8-7 8 7v9H4z" fill="currentColor" fill-opacity=".2"/><path d="M4 11l8-7 8 7v9H4zM10 20v-6h4v6"/>',
    map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="currentColor" fill-opacity=".2"/><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>',
    hammer: '<path d="M14 4l6 6-3 3-6-6z" fill="currentColor" fill-opacity=".3"/><path d="M14 4l6 6-3 3-6-6zM11 7L4 14a1.5 1.5 0 0 0 0 2l2 2a1.5 1.5 0 0 0 2 0l7-7"/>',
    minus: '<path d="M5 12h14"/>',
    arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
    box: '<path d="M3 8l9-4 9 4v9l-9 4-9-4z" fill="currentColor" fill-opacity=".2"/><path d="M3 8l9 4 9-4M12 12v9M3 8l9-4 9 4v9l-9 4-9-4z"/>',
    rotate: '<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    up: '<path d="M12 19V6M6 11l6-6 6 6"/>',
    move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
    axe: '<path d="M14 4c4 0 6 3 6 6l-6-1z" fill="currentColor" fill-opacity=".3"/><path d="M14 4c4 0 6 3 6 6l-6-1zM15 7L4 18l2 2L17 9"/>',
    // v0.4 battle statuses
    burn: '<path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-6 2 1 2 3 2 3 1-3 1-5 2-8z" fill="currentColor" fill-opacity=".3"/><path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-6 2 1 2 3 2 3 1-3 1-5 2-8z"/>',
    stun: '<path d="M13 2L5 13h6l-1 9 8-11h-6z" fill="currentColor" fill-opacity=".3"/><path d="M13 2L5 13h6l-1 9 8-11h-6z"/>',
    soak: '<path d="M12 3c3 5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6 6-11z" fill="currentColor" fill-opacity=".3"/><path d="M12 3c3 5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6 6-11z"/>',
    regen: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" fill="currentColor" fill-opacity=".3"/><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19l7-7"/>',
    silence: '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" fill-opacity=".3"/><path d="M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6"/>',
    shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" fill="currentColor" fill-opacity=".3"/><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
    warn: '<path d="M12 3l10 18H2z" fill="currentColor" fill-opacity=".3"/><path d="M12 3l10 18H2zM12 10v5M12 18v.5"/>',
  };
  Art.icon = (n, cls) => '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';

  /* ---------- Amina creatures ---------- */
  function star(cx, cy, r, fill) {
    const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p.push((cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1)); }
    return '<polygon points="' + p.join(' ') + '" fill="' + fill + '"/>';
  }

  Art.creature = function (id, opt) {
    opt = opt || {};
    const s = D.SPECIES[id]; if (!s) return '';
    const a = s.art, u = 'g' + ++uidc;
    const c1 = a.c1, c2 = a.c2, c3 = a.c3, ln = shade(c1, -0.5), dk = shade(c1, -0.3);
    let back = '', body = '', head, feet = true, shadowW = 26;

    // --- body shape ---
    switch (a.body) {
      case 'tall': head = { cx: 50, cy: 56, rx: 24, ry: 31 }; body = '<ellipse cx="50" cy="58" rx="24" ry="31" fill="' + c1 + '"/><ellipse cx="50" cy="72" rx="16" ry="18" fill="' + c2 + '" opacity=".75"/>'; break;
      case 'long':
        head = { cx: 50, cy: 46, rx: 23, ry: 21 };
        body = '<ellipse cx="50" cy="73" rx="31" ry="16" fill="' + c1 + '"/><ellipse cx="50" cy="78" rx="21" ry="9" fill="' + c2 + '" opacity=".75"/><ellipse cx="50" cy="46" rx="23" ry="21" fill="' + c1 + '"/>'; break;
      case 'drop':
        head = { cx: 50, cy: 62, rx: 25, ry: 24 }; feet = false;
        body = '<path d="M50 14C50 14 21 50 21 66a29 27 0 0 0 58 0C79 50 50 14 50 14z" fill="' + c1 + '"/><ellipse cx="50" cy="74" rx="17" ry="13" fill="' + c2 + '" opacity=".7"/>'; break;
      case 'fish':
        head = { cx: 44, cy: 56, rx: 26, ry: 21 }; feet = false;
        back = '<path d="M68 56l24-16v32z" fill="' + dk + '"/>';
        body = '<ellipse cx="48" cy="58" rx="31" ry="23" fill="' + c1 + '"/><path d="M26 66a28 14 0 0 0 44 4 28 18 0 0 1-44-4z" fill="' + c2 + '" opacity=".7"/><path d="M48 36l6-12 6 14z" fill="' + dk + '"/>'; break;
      case 'bird':
        head = { cx: 50, cy: 58, rx: 26, ry: 24 };
        body = '<ellipse cx="50" cy="60" rx="27" ry="25" fill="' + c1 + '"/><ellipse cx="50" cy="70" rx="17" ry="13" fill="' + c2 + '" opacity=".8"/><path d="M45 62l5 7 5-7z" fill="' + c3 + '"/>'; break;
      case 'moth':
        head = { cx: 50, cy: 54, rx: 17, ry: 20 };
        body = '<ellipse cx="50" cy="62" rx="16" ry="22" fill="' + c1 + '"/><ellipse cx="50" cy="66" rx="10" ry="14" fill="' + c2 + '" opacity=".9"/>'; break;
      case 'rock':
        head = { cx: 50, cy: 58, rx: 27, ry: 22 };
        body = '<path d="M20 72Q16 44 42 33Q66 26 78 44Q88 62 78 78Q50 90 20 72Z" fill="' + c1 + '"/><path d="M30 40l10 4-6 8zM66 36l8 10-10 2z" fill="' + c2 + '" opacity=".55"/>'; break;
      case 'snail':
        head = { cx: 34, cy: 62, rx: 17, ry: 16 };
        back = '<circle cx="64" cy="54" r="25" fill="' + c3 + '"/><path d="M64 54m-17 0a17 17 0 1 1 17 17M64 54m-9 0a9 9 0 1 1 9 9" fill="none" stroke="' + shade(c3, -0.35) + '" stroke-width="3" stroke-linecap="round"/>';
        body = '<path d="M14 80Q14 68 30 66L66 70Q86 72 88 82Q60 90 14 80Z" fill="' + c1 + '"/><ellipse cx="34" cy="62" rx="17" ry="16" fill="' + c1 + '"/>'; feet = false; break;
      case 'cap':
        head = { cx: 50, cy: 70, rx: 15, ry: 17 };
        body = '<ellipse cx="50" cy="72" rx="16" ry="19" fill="' + c2 + '"/><path d="M14 52a36 30 0 0 1 72 0c0 6-10 8-36 8s-36-2-36-8z" fill="' + c3 + '"/><circle cx="32" cy="42" r="5" fill="#fff" opacity=".8"/><circle cx="52" cy="34" r="6" fill="#fff" opacity=".8"/><circle cx="70" cy="46" r="4.500" fill="#fff" opacity=".8"/>'; break;
      case 'jelly':
        head = { cx: 50, cy: 48, rx: 27, ry: 25 }; feet = false;
        back = '<path d="M30 62q-4 14 2 24M42 66q-2 14 2 26M58 66q2 14-2 26M70 62q4 14-2 24" fill="none" stroke="' + shade(c1, -0.1) + '" stroke-width="5" stroke-linecap="round" opacity=".8"/>';
        body = '<path d="M22 56a28 30 0 0 1 56 0c0 6-8 8-12 6s-8 4-16 4-10-6-16-4-12 0-12-6z" fill="' + c1 + '"/><ellipse cx="50" cy="40" rx="16" ry="10" fill="' + c2 + '" opacity=".6"/>'; break;
      default: // round
        head = { cx: 50, cy: 60, rx: 30, ry: 27 };
        body = '<ellipse cx="50" cy="62" rx="30" ry="27" fill="' + c1 + '"/><ellipse cx="50" cy="73" rx="19" ry="13" fill="' + c2 + '" opacity=".75"/>';
    }

    // --- wings ---
    if (a.wings) {
      const wc = a.body === 'moth' ? c1 : c3, big = a.body === 'moth';
      back = '<g class="a-wing">' + (big
        ? '<path d="M44 56C22 30 6 40 10 62c3 14 22 16 34 4z" fill="' + wc + '" opacity=".92"/><path d="M56 56C78 30 94 40 90 62c-3 14-22 16-34 4z" fill="' + wc + '" opacity=".92"/><circle cx="22" cy="54" r="5" fill="' + c3 + '" opacity=".7"/><circle cx="78" cy="54" r="5" fill="' + c3 + '" opacity=".7"/>'
        : '<path d="M28 58C10 44 6 62 14 74c6 8 18 2 22-6z" fill="' + wc + '"/><path d="M72 58C90 44 94 62 86 74c-6 8-18 2-22-6z" fill="' + wc + '"/>') + '</g>' + back;
    }

    // --- tail ---
    let tail = '';
    const tx = a.body === 'long' ? 80 : a.body === 'snail' ? 90 : 76, ty = a.body === 'long' ? 70 : 70;
    switch (a.tail) {
      case 'leaf': tail = '<path d="M' + tx + ' ' + ty + 'q22-4 20-24q-20 2-20 24z" fill="' + c3 + '"/><path d="M' + tx + ' ' + ty + 'q10-8 18-20" stroke="' + shade(c3, -0.3) + '" stroke-width="1.500" fill="none"/>'; break;
      case 'flame': tail = '<path d="M' + tx + ' ' + ty + 'q4-16 14-20-1 8 6 10-4 12-12 18-6 2-8-8z" fill="' + c3 + '"/><path d="M' + (tx + 6) + ' ' + (ty - 2) + 'q2-8 8-12-1 8 4 10-2 8-8 10z" fill="#fff6b0"/>'; break;
      case 'fin': tail = '<path d="M' + tx + ' ' + ty + 'l20-12v24z" fill="' + dk + '"/>'; break;
      case 'fluff': tail = '<circle cx="' + (tx + 8) + '" cy="' + (ty - 2) + '" r="9" fill="' + c2 + '"/>'; break;
      case 'wisp': tail = '<path d="M' + tx + ' ' + ty + 'c14 0 18-12 14-24 8 8 4 26-8 32-4 2-8 0-6-8z" fill="' + c2 + '" opacity=".85"/>'; break;
      case 'ribbon': tail = '<path d="M' + (tx - 4) + ' ' + (ty + 2) + 'q20 0 22 18-12-6-24-4zM' + (tx - 8) + ' ' + ty + 'q24-10 26-26-14 8-30 12z" fill="' + c3 + '"/>'; break;
      case 'cloud': tail = '<circle cx="' + (tx + 6) + '" cy="' + (ty + 4) + '" r="8" fill="#fff" opacity=".85"/><circle cx="' + (tx + 14) + '" cy="' + (ty) + '" r="6" fill="#fff" opacity=".8"/>'; break;
      case 'curl': tail = '<path d="M' + tx + ' ' + ty + 'q20-4 16-22" stroke="' + c3 + '" stroke-width="5" fill="none" stroke-linecap="round"/>'; break;
    }

    // --- feet ---
    let feetSvg = '';
    if (feet) {
      const fy = a.body === 'long' ? 87 : a.body === 'tall' ? 88 : a.body === 'rock' ? 85 : 86;
      feetSvg = '<ellipse cx="38" cy="' + fy + '" rx="8" ry="5" fill="' + dk + '"/><ellipse cx="62" cy="' + fy + '" rx="8" ry="5" fill="' + dk + '"/>';
    }

    // --- ears / crown ---
    let ears = ''; const top = head.cy - head.ry, L = head.cx - head.rx * 0.62, Rr = head.cx + head.rx * 0.62;
    switch (a.ears) {
      case 'leaf': ears = '<path d="M' + L + ' ' + (top + 5) + 'q-24 0-22-24 20 6 22 24z" fill="' + shade(c1, -0.12) + '"/><path d="M' + Rr + ' ' + (top + 5) + 'q24 0 22-24-20 6-22 24z" fill="' + shade(c1, -0.12) + '"/><path d="M' + L + ' ' + (top + 3) + 'q-10-4-14-14M' + Rr + ' ' + (top + 3) + 'q10-4 14-14" stroke="' + c3 + '" stroke-width="2" fill="none" stroke-linecap="round"/>'; break;
      case 'pointy': ears = '<path d="M' + (L - 8) + ' ' + (top + 12) + 'L' + (L - 2) + ' ' + (top - 14) + 'L' + (L + 12) + ' ' + (top + 4) + 'z" fill="' + dk + '"/><path d="M' + (Rr + 8) + ' ' + (top + 12) + 'L' + (Rr + 2) + ' ' + (top - 14) + 'L' + (Rr - 12) + ' ' + (top + 4) + 'z" fill="' + dk + '"/><path d="M' + (L - 3) + ' ' + (top + 4) + 'l2-10 6 6zM' + (Rr + 3) + ' ' + (top + 4) + 'l-2-10-6 6z" fill="' + c3 + '" opacity=".6"/>'; break;
      case 'round': ears = '<circle cx="' + (L - 4) + '" cy="' + (top + 6) + '" r="8" fill="' + dk + '"/><circle cx="' + (Rr + 4) + '" cy="' + (top + 6) + '" r="8" fill="' + dk + '"/><circle cx="' + (L - 4) + '" cy="' + (top + 6) + '" r="4" fill="' + c3 + '" opacity=".6"/><circle cx="' + (Rr + 4) + '" cy="' + (top + 6) + '" r="4" fill="' + c3 + '" opacity=".6"/>'; break;
      case 'long': ears = '<ellipse cx="' + (L - 2) + '" cy="' + (top - 6) + '" rx="6" ry="17" fill="' + c1 + '" transform="rotate(-14 ' + L + ' ' + top + ')"/><ellipse cx="' + (Rr + 2) + '" cy="' + (top - 6) + '" rx="6" ry="17" fill="' + c1 + '" transform="rotate(14 ' + Rr + ' ' + top + ')"/><ellipse cx="' + (L - 2) + '" cy="' + (top - 4) + '" rx="3" ry="11" fill="' + c3 + '" opacity=".7" transform="rotate(-14 ' + L + ' ' + top + ')"/><ellipse cx="' + (Rr + 2) + '" cy="' + (top - 4) + '" rx="3" ry="11" fill="' + c3 + '" opacity=".7" transform="rotate(14 ' + Rr + ' ' + top + ')"/>'; break;
      case 'horn': ears = '<path d="M' + (L + 2) + ' ' + (top + 6) + 'q-12-6-8-24 10 8 14 20z" fill="' + c3 + '"/><path d="M' + (Rr - 2) + ' ' + (top + 6) + 'q12-6 8-24-10 8-14 20z" fill="' + c3 + '"/>'; break;
      case 'crown': { let p = ''; for (let i = 0; i < 5; i++) { const ang = -90 + (i - 2) * 30; const cx = head.cx + Math.cos(ang * Math.PI / 180) * (head.rx - 2), cy = head.cy + Math.sin(ang * Math.PI / 180) * (head.ry - 2); p += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + (cy - 7).toFixed(1) + '" rx="6" ry="11" fill="' + c3 + '" transform="rotate(' + ((i - 2) * 30) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')"/>'; } ears = p; break; }
      case 'antler': ears = '<g stroke="' + c3 + '" stroke-width="3" fill="none" stroke-linecap="round"><path d="M' + (L + 2) + ' ' + (top + 4) + 'q-8-14-4-26M' + (L - 3) + ' ' + (top - 8) + 'q-6-2-9-8M' + (L - 1) + ' ' + (top - 16) + 'q4-4 4-10"/><path d="M' + (Rr - 2) + ' ' + (top + 4) + 'q8-14 4-26M' + (Rr + 3) + ' ' + (top - 8) + 'q6-2 9-8M' + (Rr + 1) + ' ' + (top - 16) + 'q-4-4-4-10"/></g><circle cx="' + (L - 12) + '" cy="' + (top - 16) + '" r="3" fill="#ff9ec7"/><circle cx="' + (Rr + 12) + '" cy="' + (top - 16) + '" r="3" fill="#ff9ec7"/>'; break;
      case 'antenna': ears = '<g stroke="' + dk + '" stroke-width="2.500" fill="none" stroke-linecap="round"><path d="M' + (head.cx - 6) + ' ' + (top + 2) + 'q-8-12-14-14M' + (head.cx + 6) + ' ' + (top + 2) + 'q8-12 14-14"/></g><circle cx="' + (head.cx - 21) + '" cy="' + (top - 13) + '" r="3.500" fill="' + c3 + '"/><circle cx="' + (head.cx + 21) + '" cy="' + (top - 13) + '" r="3.500" fill="' + c3 + '"/>'; break;
      case 'fin': ears = '<path d="M' + (L - 4) + ' ' + (top + 14) + 'q-18-8-16-24 14 4 20 20z" fill="' + dk + '"/><path d="M' + (Rr + 4) + ' ' + (top + 14) + 'q18-8 16-24-14 4-20 20z" fill="' + dk + '"/>'; break;
      case 'crest': ears = '<path d="M' + (head.cx - 6) + ' ' + (top + 3) + 'q-4-14 4-20 2 10 6 12 2-8 8-10-2 14-6 20z" fill="' + c3 + '"/>'; break;
      case 'halo': ears = '<ellipse cx="' + head.cx + '" cy="' + (top - 6) + '" rx="16" ry="5" fill="none" stroke="' + c3 + '" stroke-width="3.500"/><ellipse cx="' + head.cx + '" cy="' + (top - 6) + '" rx="16" ry="5" fill="none" stroke="#fff" stroke-width="1" opacity=".7"/>'; break;
      case 'crystal': ears = '<path d="M' + (L + 1) + ' ' + (top + 8) + 'l-9-6 3-20 12 14z" fill="' + c3 + '"/><path d="M' + (Rr - 1) + ' ' + (top + 8) + 'l9-6-3-20-12 14z" fill="' + c3 + '"/><path d="M' + (L - 4) + ' ' + (top - 12) + 'l3 6" stroke="#fff" stroke-width="1.500" opacity=".8"/>'; break;
    }

    // --- spikes / moss ---
    let deco = '';
    if (a.spikes) deco += '<path d="M34 ' + (head.cy + 6) + 'l-6-8 10 2zM46 ' + (head.cy - 18) + 'l-3-9 8 4zM58 ' + (head.cy - 18) + 'l3-9-8 4z" fill="' + shade(c1, -0.35) + '"/>';
    if (a.moss) deco += '<ellipse cx="40" cy="' + (top + 8) + '" rx="9" ry="4" fill="#78c85a"/><ellipse cx="62" cy="' + (top + 6) + '" rx="7" ry="3.500" fill="#5fb446"/>';

    // --- markings ---
    let marks = '';
    if (a.mark === 'spots') marks = '<circle cx="' + (head.cx - 14) + '" cy="' + (head.cy - 10) + '" r="3.500" fill="' + c3 + '" opacity=".65"/><circle cx="' + (head.cx + 16) + '" cy="' + (head.cy - 6) + '" r="3" fill="' + c3 + '" opacity=".65"/><circle cx="' + (head.cx + 4) + '" cy="' + (head.cy - 16) + '" r="2.500" fill="' + c3 + '" opacity=".65"/>';
    else if (a.mark === 'stripes') marks = '<path d="M' + (head.cx - 14) + ' ' + (top + 4) + 'q4 6 0 12M' + (head.cx + 14) + ' ' + (top + 4) + 'q-4 6 0 12M' + head.cx + ' ' + (top + 2) + 'v8" stroke="' + c3 + '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/>';
    else if (a.mark === 'star') marks = star(head.cx, top + 9, 5.5, c3);
    else if (a.mark === 'rune') marks = '<path d="M' + head.cx + ' ' + (top + 4) + 'l4 6-4 6-4-6zM' + (head.cx - 7) + ' ' + (top + 10) + 'h14" stroke="' + c3 + '" stroke-width="2" fill="none" stroke-linecap="round"/>';

    // --- split (Echolyn) ---
    let split = '';
    if (a.split) split = '<clipPath id="' + u + 'c"><rect x="50" y="0" width="50" height="100"/></clipPath><ellipse cx="50" cy="58" rx="24" ry="31" fill="' + c2 + '" opacity=".6" clip-path="url(#' + u + 'c)"/>';

    // --- face ---
    const fx = head.cx, fy = head.cy + 2, ex = Math.min(11, head.rx * 0.42), ey = fy - 2;
    let eyes = '';
    const eyeAt = (x, flip) => {
      switch (a.eyes) {
        case 'sleepy': return '<ellipse cx="' + x + '" cy="' + ey + '" rx="5.500" ry="5" fill="#fff"/><circle cx="' + x + '" cy="' + (ey + 1) + '" r="3.500" fill="#2a2038"/><path d="M' + (x - 6.500) + ' ' + (ey - 0.5) + 'h13v-6h-13z" fill="' + c1 + '"/><path d="M' + (x - 6) + ' ' + (ey - 0.5) + 'h12" stroke="' + ln + '" stroke-width="1.600" stroke-linecap="round"/>';
        case 'sharp': return '<ellipse cx="' + x + '" cy="' + ey + '" rx="5" ry="6" fill="' + shade(c3, 0.35) + '"/><ellipse cx="' + x + '" cy="' + ey + '" rx="1.800" ry="5" fill="#2a2038"/><circle cx="' + (x - 1.500) + '" cy="' + (ey - 2.500) + '" r="1.300" fill="#fff"/><path d="M' + (x - 6) + ' ' + (ey - 6 + (flip ? 3 : 0)) + 'l12 ' + (flip ? -3 : 3) + '" stroke="' + ln + '" stroke-width="1.500" stroke-linecap="round"/>';
        case 'star': return star(x, ey, 6.500, c3) + '<circle cx="' + x + '" cy="' + ey + '" r="2" fill="#2a2038"/>';
        case 'lantern': return '<circle cx="' + x + '" cy="' + ey + '" r="6.500" fill="' + c3 + '" opacity=".35"/><circle cx="' + x + '" cy="' + ey + '" r="4" fill="' + c3 + '"/><circle cx="' + x + '" cy="' + ey + '" r="1.800" fill="#fff"/>';
        default: return '<ellipse cx="' + x + '" cy="' + ey + '" rx="6" ry="6.500" fill="#fff"/><circle cx="' + x + '" cy="' + (ey + 0.5) + '" r="4.600" fill="#2a2038"/><circle cx="' + (x - 1.800) + '" cy="' + (ey - 2) + '" r="1.800" fill="#fff"/><circle cx="' + (x + 1.600) + '" cy="' + (ey + 2) + '" r="0.900" fill="#fff"/>';
      }
    };
    eyes = '<g class="a-blink">' + eyeAt(fx - ex, false) + eyeAt(fx + ex, true) + '</g>';
    const cheeks = '<ellipse cx="' + (fx - ex - 6) + '" cy="' + (fy + 6) + '" rx="3.600" ry="2.400" fill="#ff8fb0" opacity=".5"/><ellipse cx="' + (fx + ex + 6) + '" cy="' + (fy + 6) + '" rx="3.600" ry="2.400" fill="#ff8fb0" opacity=".5"/>';
    const mouth = opt.mood === 'sad' ? '<path d="M' + (fx - 3.500) + ' ' + (fy + 9) + 'q3.500-3 7 0" stroke="' + ln + '" stroke-width="1.600" fill="none" stroke-linecap="round"/>'
      : '<path d="M' + (fx - 3.500) + ' ' + (fy + 6.500) + 'q3.500 4 7 0" stroke="' + ln + '" stroke-width="1.600" fill="none" stroke-linecap="round"/>';
    const snout = a.snout ? '<ellipse cx="' + fx + '" cy="' + (fy + 3.500) + '" rx="3.500" ry="2.500" fill="#ffb0d8"/>' : '';
    const glow = a.glow ? '<defs><radialGradient id="' + u + 'g"><stop offset="0" stop-color="' + a.glow + '" stop-opacity=".75"/><stop offset="1" stop-color="' + a.glow + '" stop-opacity="0"/></radialGradient></defs><circle class="a-glow" cx="50" cy="56" r="48" fill="url(#' + u + 'g)"/>' : '';

    const scale = a.big ? ' transform="translate(50 92) scale(1.08) translate(-50 -92)"' : '';
    return '<svg class="amina-svg" width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + s.name + '">' + glow +
      '<ellipse cx="50" cy="91" rx="' + shadowW + '" ry="4.500" fill="#000" opacity=".22"/>' +
      '<g class="a-bob"><g' + scale + '>' + back + '<g class="a-tail">' + tail + '</g>' + body + split + feetSvg + deco + marks + ears + cheeks + snout + eyes + mouth + '</g></g></svg>';
  };

  /* ---------- Portraits ----------
     The game shows creatures as baked 3D portraits (assets/portraits/<id>.webp, made by tools/creature-pipeline.js).
     With 3D creatures switched off in Settings — or if an image fails to load — the classic SVG art is used. */
  const use3d = () => { const st = A.State && A.State.state; return !(st && st.settings && st.settings.creatures3d === false); };
  Art.use3d = use3d;
  Art.portrait = function (id, opt) {
    const s = D.SPECIES[id]; if (!s) return '';
    if (!use3d() || (opt && opt.mood)) return Art.creature(id, opt);
    // Phase 15B: with the developer switch on, refined creatures show portraits baked from their refined models
    const dir = A.Proto15 && A.Proto15.active(id) ? 'assets/portraits15/' : 'assets/portraits/';
    return '<img class="portrait" src="' + dir + id + '.webp" alt="' + s.name + '" draggable="false" decoding="async" onerror="this.outerHTML=A.Art.creature(\'' + id + '\')">';
  };

  /* ---------- The Entity portrait ---------- */
  Art.entity = function (mood) {
    mood = mood || 'n';
    const eyeCol = '#ffe9a8';
    let eyes;
    const E = (x) => {
      switch (mood) {
        case 's': return '<ellipse cx="' + x + '" cy="51" rx="4.600" ry="5.200" fill="' + eyeCol + '"/><circle cx="' + x + '" cy="51" r="1.600" fill="#1a1020"/>';
        case 'a': return '<ellipse cx="' + x + '" cy="51" rx="4.200" ry="3.400" fill="' + eyeCol + '"/><circle cx="' + (x + 2) + '" cy="51.500" r="1.600" fill="#1a1020"/><path d="M' + (x - 5) + ' 47.500h10" stroke="#0f1626" stroke-width="3.400"/>';
        case 'c': return '<path d="M' + (x - 4.500) + ' 51q4.500 3.500 9 0" stroke="' + eyeCol + '" stroke-width="1.800" fill="none" stroke-linecap="round"/>';
        case 'w': return '<ellipse cx="' + x + '" cy="51" rx="4.200" ry="3.600" fill="' + eyeCol + '"/><circle cx="' + x + '" cy="51.500" r="1.500" fill="#1a1020"/><path d="M' + (x - 5) + ' 48.500h10" stroke="#0f1626" stroke-width="2.600"/>';
        case 't': return '<ellipse cx="' + x + '" cy="52" rx="4.200" ry="3" fill="' + eyeCol + '"/><circle cx="' + x + '" cy="52.500" r="1.500" fill="#1a1020"/><path d="M' + (x - 5) + ' 49.500h10" stroke="#0f1626" stroke-width="3.800"/>';
        default: return '<ellipse cx="' + x + '" cy="51.500" rx="4.200" ry="3.600" fill="' + eyeCol + '"/><circle cx="' + x + '" cy="52" r="1.500" fill="#1a1020"/><path d="M' + (x - 5) + ' 48.500h10" stroke="#0f1626" stroke-width="2.800"/>';
      }
    };
    const brow = mood === 's' ? '<path d="M37 43q6-4 11 0M52 43q6-4 11 0" stroke="#dfe6f2" stroke-width="2.200" fill="none" stroke-linecap="round"/>'
      : mood === 'w' ? '<path d="M37 45q6-1 11 1M52 41q6-3 11 0" stroke="#dfe6f2" stroke-width="2.200" fill="none" stroke-linecap="round"/>'
      : '<path d="M37 45q6 1 11 3M52 48q6-2 11-3" stroke="#dfe6f2" stroke-width="2.200" fill="none" stroke-linecap="round"/>';
    return '<svg class="ent-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Entity">' +
      '<defs><radialGradient id="entg"><stop offset="0" stop-color="#a8dcff" stop-opacity=".55"/><stop offset="1" stop-color="#a8dcff" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="50" cy="52" r="50" fill="url(#entg)"/>' +
      '<g class="ent-float">' +
      '<path d="M14 100Q14 58 32 40Q50 16 68 40Q86 58 86 100Z" fill="#2a3b5c"/><path d="M14 100Q14 58 32 40Q50 16 68 40Q86 58 86 100" fill="none" stroke="#5f82b4" stroke-width="2"/>' +
      '<ellipse cx="50" cy="52" rx="20" ry="22" fill="#0d1424"/>' + eyes_(E) + brow +
      '<path d="M32 57Q34 82 50 92Q66 82 68 57Q58 70 50 66Q42 70 32 57Z" fill="#eef1f8"/><path d="M40 62q5 6 10 2 5 4 10-2" stroke="#c4cddd" stroke-width="1.800" fill="none" stroke-linecap="round"/>' +
      '<g class="ent-clip" transform="rotate(10 78 76)"><rect x="68" y="62" width="20" height="26" rx="2.500" fill="#eadbb2"/><rect x="73" y="59" width="10" height="5" rx="1.500" fill="#8b6f3d"/><path d="M71 70h14M71 75h14M71 80h9" stroke="#8b6f3d" stroke-width="1.400" stroke-linecap="round"/></g>' +
      '</g></svg>';
    function eyes_(f) { return f(43) + f(57); }
  };

  /* Island scenes are drawn by island-art.js (isometric). */

  /* ---------- Backdrops ---------- */
  // Per-dungeon battle skies (v0.4). The Reliquary keeps the original backdrop; the 3D arena stands in front.
  const SKIES = {
    hollowveil: (boss) => '<svg class="bg-svg" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="hv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (boss ? '#0c0818' : '#120c24') + '"/><stop offset=".75" stop-color="' + (boss ? '#2a1a40' : '#3a2a5c') + '"/></linearGradient><radialGradient id="hvg"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="1000" height="500" fill="url(#hv)"/>' +
      '<g fill="#0a0716" opacity=".7"><path d="M40 500V170q70-90 140 0v330h-30V190q-40-50-80 0v310z"/><path d="M820 500V150q75-95 150 0v350h-32V172q-43-55-86 0v328z"/><path d="M420 330q80-110 160 0v170h-26V340q-54-70-108 0v160h-26z" opacity=".6"/></g>' +
      [140, 300, 700, 880].map((x, i) => '<circle cx="' + x + '" cy="' + (210 + (i % 2) * 40) + '" r="46" fill="url(#hvg)"/><rect x="' + (x - 3) + '" y="' + (226 + (i % 2) * 40) + '" width="6" height="16" fill="#efe6d0" opacity=".8"/>').join('') +
      '<g class="motes">' + [0, 1, 2, 3, 4, 5, 6].map((i) => '<rect class="ff f' + (i % 3) + '" x="' + (90 + i * 130) + '" y="' + (70 + (i * 61) % 200) + '" width="12" height="15" rx="1" fill="#f4ecd8" opacity=".5" transform="rotate(' + (i * 23 - 40) + ' ' + (96 + i * 130) + ' ' + (78 + (i * 61) % 200) + ')" style="animation-delay:' + i * 0.5 + 's"/>').join('') + '</g></svg>',
    resonancescar: (boss) => '<svg class="bg-svg" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (boss ? '#140c2a' : '#1e1440') + '"/><stop offset=".55" stop-color="#5a3a8a"/><stop offset="1" stop-color="#c46aa8"/></linearGradient><linearGradient id="rsc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9ae8ff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#ff9ede" stop-opacity="0"/></linearGradient></defs>' +
      '<rect width="1000" height="500" fill="url(#rs)"/>' +
      [...Array(26)].map((_, i) => '<circle cx="' + ((i * 151) % 1000) + '" cy="' + ((i * 67) % 230) + '" r="' + (1 + (i % 3) * 0.7) + '" fill="#fff" opacity="' + (0.35 + (i % 4) * 0.15) + '" class="tw" style="animation-delay:' + (i % 7) * 0.4 + 's"/>').join('') +
      '<path d="M0 140L240 170 380 120 520 190 700 130 1000 175" stroke="url(#rsc)" stroke-width="3" fill="none"/>' +
      '<g fill="#2a1a4a" opacity=".85"><path d="M120 120l40-20 50 10 10 30-40 28-55-12z"/><path d="M760 80l60-14 40 24-12 34-62 6-30-26z"/><path d="M470 60l30-8 26 16-8 24-34 4z" opacity=".7"/></g>' +
      '<g fill="#1a1030"><path d="M0 330l120-30 90 26 140-46 160 40 140-34 170 30 180-20v204H0z"/></g></svg>',
  };
  Art.battleBg = function (kind, dungeon) {
    if (SKIES[dungeon]) return SKIES[dungeon](kind === 'boss');
    const pal = kind === 'boss' ? ['#241a3a', '#4a3a6a', '#2c4a38'] : ['#1f3a34', '#3f7a5a', '#2c5a3a'];
    return '<svg class="bg-svg" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + pal[0] + '"/><stop offset=".7" stop-color="' + pal[1] + '"/></linearGradient></defs>' +
      '<rect width="1000" height="500" fill="url(#bb)"/>' +
      '<g opacity=".5" fill="' + pal[2] + '"><path d="M0 300q100-80 200-20t200-40 200 30 200-40 200 30v240H0z"/></g>' +
      '<g fill="#0f1c1a" opacity=".55"><rect x="80" y="120" width="40" height="300"/><rect x="880" y="100" width="46" height="320"/><path d="M60 120q60-60 120 0zM860 100q60-60 120 0z"/></g>' +
      '<g stroke="#5fe08a" stroke-width="3" fill="none" opacity=".35"><path d="M100 120q-30 60 10 120M900 100q30 70-10 140"/></g>' +
      '<ellipse cx="260" cy="400" rx="150" ry="28" fill="#183626"/><ellipse cx="740" cy="300" rx="130" ry="24" fill="#183626"/>' +
      '<g class="motes">' + [0, 1, 2, 3, 4, 5].map((i) => '<circle class="ff f' + (i % 3) + '" cx="' + (150 + i * 140) + '" cy="' + (100 + (i * 53) % 250) + '" r="2.500" fill="#d8ffb0" style="animation-delay:' + i * 0.6 + 's"/>').join('') + '</g></svg>';
  };
  Art.titleBg = function () {
    return '<svg class="bg-svg" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#171845"/><stop offset=".6" stop-color="#6a4a9a"/><stop offset="1" stop-color="#f0a8a0"/></linearGradient><radialGradient id="tg"><stop offset="0" stop-color="#fff4c8" stop-opacity=".8"/><stop offset="1" stop-color="#fff4c8" stop-opacity="0"/></radialGradient><clipPath id="tl"><rect x="0" y="0" width="860" height="500"/></clipPath></defs>' +
      '<rect width="1000" height="500" fill="url(#tb)"/>' +
      [...Array(40)].map((_, i) => '<circle cx="' + ((i * 137) % 1000) + '" cy="' + ((i * 71) % 250) + '" r="' + (1 + (i % 3) * 0.6) + '" fill="#fff" opacity="' + (0.4 + (i % 4) * 0.15) + '" class="tw" style="animation-delay:' + (i % 7) * 0.4 + 's"/>').join('') +
      '<circle cx="780" cy="130" r="120" fill="url(#tg)"/><circle cx="780" cy="130" r="54" fill="#ffe9a0"/><path d="M780 76a54 54 0 0 0 0 108z" fill="#4a3590"/>' +
      '<rect y="330" width="1000" height="170" fill="#243c8a"/><rect y="330" width="1000" height="170" fill="#8a64c8" opacity=".25"/>' +
      '<path d="M120 360Q200 290 320 296Q430 270 560 292Q700 284 800 340Q760 380 640 386Q480 400 320 392Q180 392 120 360Z" fill="#20233e"/>' +
      '<path d="M420 296l12-60 8 24 10-40 8 36 14-12 6 52z" fill="#1c1e36"/>' +
      '<g class="drift"><ellipse cx="300" cy="190" rx="40" ry="8" fill="#1c1e36"/></g></svg>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
