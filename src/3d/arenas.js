/* Aminas — 3D battle arenas (ES module). Dev 8: every dungeon has its own arena, built from shared voxel parts
   (tiled block floors, stacked-block walls, trees, props) so each place reads differently while the cost stays low:
   static blocks are merged into one mesh per material, floors are one instanced mesh, and the "living pixel" motes
   are one Points object. A boss battle (battle 10) adds a boss room on top of the dungeon's arena: bigger
   architecture and set dressing that belongs to that place (a waystone gate, a lamp shrine, a relic altar, a sunken
   treasure, a glowing kiln mouth, a lectern of unsaid things, a great lantern tree, a weathervane, a crystal crown,
   the heart of the roots). Everything an arena creates is tracked so dispose() frees it when the battle ends. */
import { THREE } from './creature3d.js';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/BufferGeometryUtils.js/+esm';

export function tracker() {
  const geos = [], mats = [], texs = [];
  return {
    g(x) { geos.push(x); return x; }, m(x) { mats.push(x); return x; }, t(x) { texs.push(x); return x; },
    dispose() { geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); texs.forEach((x) => x.dispose()); geos.length = mats.length = texs.length = 0; },
  };
}
function radialTexture(stops, size) {
  const c = document.createElement('canvas'); c.width = c.height = size || 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, c.width / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/* ------------------------------------------------------------------ voxel kit */
// K.box(color, x, y(bottom), z, w, h, d, o) adds one block; K.mat(color, o) caches one material per colour so the
// merge step can join every block of that colour into a single mesh.
export function kit(add, T, r) {
  const geo = T.g(new THREE.BoxGeometry(1, 1, 1)), mats = new Map();
  const K = {
    r,
    mat(c, o) {
      o = o || {}; const k = c + '|' + (o.e || '') + '|' + (o.ei || 0) + '|' + (o.op || 1);
      if (!mats.has(k)) mats.set(k, T.m(new THREE.MeshStandardMaterial({ color: c, roughness: o.rough != null ? o.rough : 0.9, flatShading: true, emissive: o.e || '#000000', emissiveIntensity: o.ei || 0, transparent: (o.op || 1) < 1, opacity: o.op || 1, depthWrite: (o.op || 1) >= 1 })));
      return mats.get(k);
    },
    box(c, x, y, z, w, h, d, o) { o = o || {}; return add(new THREE.Mesh(geo, K.mat(c, o)), { x, y: y + h / 2, z, sx: w, sy: h, sz: d, ry: o.ry || 0, rz: o.rz || 0, rx: o.rx || 0, spin: o.spin }); },
    // a column of blocks with a little jitter, like stacked stone
    stack(c, c2, x, z, n, s, o) { for (let i = 0; i < n; i++) K.box(i % 2 ? c2 : c, x + (r() - 0.5) * 0.05, i * s, z + (r() - 0.5) * 0.05, s * (1 - (o && o.taper ? i * 0.04 : 0)), s, s * (1 - (o && o.taper ? i * 0.04 : 0))); },
    // tiled floor: one instanced mesh, colour per tile from fn(i, j, x, z) (null = no tile)
    floor(fn, o) {
      o = o || {}; const step = o.step || 0.5, rx = o.rx || 6.8, rz = o.rz || 5.2, cells = [];
      for (let x = -rx; x <= rx; x += step) for (let z = -rz - 1; z <= rz - 1; z += step) {
        const nx = x / rx, nz = (z + 1) / rz; if (nx * nx + nz * nz > 1) continue;
        const c = fn(Math.round(x / step), Math.round(z / step), x, z); if (c) cells.push([x, z, c]);
      }
      const mesh = new THREE.InstancedMesh(geo, T.m(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true })), cells.length);
      const m = new THREE.Matrix4(), col = new THREE.Color();
      cells.forEach(([x, z, c], i) => { const h = 0.12 + r() * (o.bump || 0.05); m.compose(new THREE.Vector3(x, h / 2 - 0.1, z), new THREE.Quaternion(), new THREE.Vector3(step * 0.98, h, step * 0.98)); mesh.setMatrixAt(i, m); mesh.setColorAt(i, col.set(c)); });
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      add(mesh); return mesh;
    },
    tree(x, z, s, leaf, leaf2, o) {
      o = o || {}; const trunk = o.trunk || '#6a4424';
      K.box(trunk, x, 0, z, 0.28 * s, 1.1 * s, 0.28 * s);
      K.box(leaf, x, 0.9 * s, z, 1.2 * s, 0.7 * s, 1.2 * s); K.box(leaf2, x + 0.05 * s, 1.5 * s, z - 0.05 * s, 0.85 * s, 0.5 * s, 0.85 * s); K.box(leaf, x, 1.95 * s, z, 0.45 * s, 0.35 * s, 0.45 * s);
      if (o.lanterns) [[-0.5, 1.0], [0.55, 1.15], [0.1, 0.85], [-0.2, 1.45]].forEach(([dx, dy], i) => K.box(i % 2 ? '#ffe9a0' : '#ffd070', x + dx * s, dy * s, z + (i % 2 ? 0.45 : -0.45) * s, 0.16 * s, 0.2 * s, 0.16 * s, { e: '#ffb84a', ei: 1.6, spin: i === 0 ? 'flicker' : null }));
    },
    tuft(x, z, c) { K.box(c, x, 0, z, 0.18, 0.16, 0.18); K.box(c, x + 0.12, 0, z + 0.05, 0.12, 0.24, 0.12); },
  };
  return K;
}

/* ------------------------------------------------------------------ the arenas */
// Each: sky (2D backdrop key, informational), mood (lights), fog, motes (living-pixel colour), build(add, T, r, K, o)
// where o.boss adds the boss room.
export const ARENAS = {
  // Starter Island, Dungeon 1. Grass over an old flagstone road, foundations, a leaning signpost; the boss stands
  // under a gate of standing stones whose runes still glow.
  forgottenroad: { mood: 'day', fog: '#9ec8a0', motes: '#fffbe0', build(add, T, r, K, o) {
    K.floor((i, j, x) => (Math.abs(x + (j * 0.05)) < 1.1 ? (r() < 0.22 ? (r() < 0.5 ? '#5aa046' : '#4a8c3c') : (r() < 0.5 ? '#9aa0a8' : '#8a9098')) : (r() < 0.5 ? '#62ad4c' : '#57a044')));
    [[-3.2, -1.6], [-3.6, -0.4], [-2.8, -2.4]].forEach(([x, z]) => K.box('#a39a8a', x, 0, z, 0.9, 0.35, 0.5));
    [[3.0, -2.2], [3.6, -1.2]].forEach(([x, z]) => K.box('#a39a8a', x, 0, z, 0.8, 0.3, 0.5));
    K.box('#8a6040', 3.9, 0, -2.2, 0.14, 1.5, 0.14, { rz: -0.14 }); K.box('#a07a50', 3.6, 1.15, -2.2, 0.7, 0.2, 0.06, { rz: -0.14 }); K.box('#93704a', 4.15, 0.85, -2.2, 0.65, 0.18, 0.06, { rz: -0.1 });
    K.tree(-4.6, -3.0, 1.15, '#3f8a3a', '#4fa046'); K.tree(4.8, -3.4, 1.3, '#3f8a3a', '#4fa046'); K.tree(-5.4, -0.4, 0.9, '#4a9640', '#5aae4c');
    for (let i = 0; i < 18; i++) K.tuft((r() - 0.5) * 10, (r() - 0.5) * 6 - 1, r() < 0.5 ? '#5fb04a' : '#4a9a3c');
    if (o.boss) {
      [-1.2, 2.8].forEach((x, i) => { K.stack('#9096a0', '#878d97', x, -4.6, 6, 0.46); K.box('#ffe9a0', x, 0.9 + i * 0.5, -4.35, 0.16, 0.16, 0.04, { e: '#ffd86b', ei: 1.6 }); });
      K.box('#878d97', 0.8, 2.76, -4.6, 4.6, 0.46, 0.56); K.box('#ffe9a0', 0.8, 2.9, -4.3, 0.5, 0.14, 0.04, { e: '#ffd86b', ei: 1.4 });
      [[-2.8, -2.6], [3.6, -2.4]].forEach(([x, z]) => { K.box('#a8a090', x, 0, z, 0.36, 0.8, 0.3); K.box('#ffe9a0', x, 0.5, z + 0.16, 0.1, 0.1, 0.02, { e: '#ffd86b', ei: 1.2 }); });
      K.box('#ffe9a0', 0.8, 0.01, -1.6, 2.4, 0.02, 1.6, { e: '#ffd86b', ei: 0.5, op: 0.35 });
    }
  } },
  // Dungeon 2. A long hall: plank floor, long tables set for many guests, lanterns; the boss keeps the last lamp.
  gatheringhall: { mood: 'dusk', fog: '#3a2a2a', motes: '#ffd890', build(add, T, r, K, o) {
    K.floor((i, j) => (j % 2 ? (i % 4 === 0 ? '#5a432f' : '#6a5038') : (i % 4 === 2 ? '#5a432f' : '#735a40')), { bump: 0.02 });
    for (let x = -5.5; x <= 5.5; x += 1.1) K.box(x % 2.2 ? '#5a4a40' : '#54453c', x, 0, -4.2, 1.08, 2.6, 0.4);
    [-4.6, -1.6, 1.6, 4.6].forEach((x) => K.box('#4a3a30', x, 0, -3.9, 0.4, 2.9, 0.4));
    [[-3.6, -1.4], [3.4, -1.9]].forEach(([x, z]) => { K.box('#8a6644', x, 0.5, z, 2.2, 0.12, 0.7); [-0.9, 0.9].forEach((dx) => K.box('#6a4a30', x + dx, 0, z, 0.1, 0.5, 0.5)); for (let k = 0; k < 4; k++) K.box('#d8d0c0', x - 0.75 + k * 0.5, 0.62, z, 0.18, 0.06, 0.18); K.box('#7a5a3a', x, 0, z + 0.6, 2.0, 0.28, 0.24); });
    [-3, 0, 3].forEach((x, i) => { K.box('#3a2a20', x, 2.2, -3.4, 0.04, 0.5, 0.04); K.box('#ffd890', x, 1.95, -3.4, 0.22, 0.26, 0.22, { e: '#ffb84a', ei: i === 1 && o.boss ? 0 : 1.2, spin: 'flicker' }); });
    if (o.boss) {
      K.box('#4a3a30', -0.2, 0, -3.2, 1.6, 0.5, 0.9); K.box('#5a4636', -0.2, 0.5, -3.2, 1.3, 0.25, 0.7);
      K.box('#3a2a20', -0.2, 0.75, -3.2, 0.08, 1.3, 0.08); K.box('#ffe2a0', -0.2, 2.05, -3.2, 0.42, 0.5, 0.42, { e: '#ffb040', ei: 2.4, spin: 'flicker' });
      [[-1.2, -3.0], [0.8, -3.0]].forEach(([x, z]) => { K.box('#8a7a5a', x, 0, z, 0.1, 0.9, 0.1); K.box('#efe6d0', x, 0.9, z, 0.08, 0.2, 0.08); K.box('#ffd27a', x, 1.12, z, 0.06, 0.08, 0.06, { e: '#ffb84a', ei: 2 }); });
      K.box('#8a6644', 2.8, 0.6, -3.85, 1.4, 1.0, 0.08); for (let k = 0; k < 9; k++) K.box('#3a2a20', 2.25 + (k % 3) * 0.55, 0.85 + Math.floor(k / 3) * 0.3, -3.8, 0.04, 0.04, 0.02);
    }
  } },
  // Dungeon 3 (the original Overgrown Reliquary), now with a relic altar and chest in its boss room.
  reliquary: { mood: 'day', fog: '#3f7a5a', motes: '#d8ffb0', build(add, T, r, K, o) {
    const stone = T.m(new THREE.MeshStandardMaterial({ color: '#8a9a7a', roughness: 0.9 })), moss = T.m(new THREE.MeshStandardMaterial({ color: '#5fae55', roughness: 1 }));
    const root = T.m(new THREE.MeshStandardMaterial({ color: '#4a3a24', roughness: 0.8, emissive: '#7aff8a', emissiveIntensity: 0.12 }));
    add(new THREE.Mesh(T.g(new THREE.CircleGeometry(6.5, 48)), T.m(new THREE.MeshStandardMaterial({ map: T.t(radialTexture([[0, '#7fae6a'], [0.55, '#5f8f52'], [1, '#2f5a38']])), roughness: 1 }))), { rx: -Math.PI / 2 });
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, d = 2.2 + r() * 2.6; add(new THREE.Mesh(T.g(new THREE.CylinderGeometry(0.45, 0.5, 0.06, 6)), stone), { x: Math.cos(a) * d, y: 0.02, z: Math.sin(a) * d - 0.6, ry: r() * 3 }); }
    [[-3.6, -2.6, 2.4], [3.4, -3.2, 1.6], [-4.4, 0.4, 1.1], [4.6, -0.6, 2.9]].forEach(([x, z, h]) => {
      add(new THREE.Mesh(T.g(new THREE.CylinderGeometry(0.34, 0.4, h, 10)), stone), { x, y: h / 2, z });
      add(new THREE.Mesh(T.g(new THREE.TorusGeometry(0.39, 0.06, 6, 18)), moss), { x, y: h * 0.4, z, rx: Math.PI / 2 + 0.3 });
      add(new THREE.Mesh(T.g(new THREE.SphereGeometry(0.42, 12, 8)), moss), { x, y: h + 0.05, z, sy: 0.35 });
    });
    for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, pts = []; for (let k = 0; k < 5; k++) pts.push(new THREE.Vector3(Math.cos(a) * (2 + k * 0.7), 0.05 + Math.sin(k) * 0.08, Math.sin(a) * (2 + k * 0.7) - 1)); add(new THREE.Mesh(T.g(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.07, 6)), root)); }
    if (o.boss) {
      [0, 1, 2].forEach((k) => K.box(k % 2 ? '#7a8a6a' : '#8a9a7a', 0.6, k * 0.25, -3.3 + k * 0.05, 2.4 - k * 0.5, 0.25, 1.2 - k * 0.2));
      K.box('#6a4424', 0.1, 0.75, -3.25, 0.7, 0.42, 0.45); K.box('#d8a830', 0.1, 1.17, -3.25, 0.74, 0.08, 0.49, { rough: 0.4 }); K.box('#ffe27a', 0.1, 0.92, -3.0, 0.12, 0.12, 0.02, { e: '#ffd86b', ei: 1.4 });
      for (let k = 0; k < 7; k++) K.box(k % 2 ? '#ffd86b' : '#f0b030', 1.0 + (r() - 0.5) * 0.6, 0.75 + (k % 3) * 0.06, -3.2 + (r() - 0.5) * 0.4, 0.14, 0.05, 0.14, { e: '#c88a10', ei: 0.4, rough: 0.35 });
      K.box('#9ae8a0', 1.1, 0.75, -3.4, 0.22, 0.5, 0.22, { e: '#5fe08a', ei: 1.2 });
    }
  } },
  // Dungeon 4. Wet steps going down into the sea, coral and kelp; the boss room has a drowned arch and a pearl clam.
  drownedsteps: { mood: 'dusk', fog: '#2a5a7a', motes: '#bfefff', build(add, T, r, K, o) {
    K.floor((i, j, x, z) => (z < -2.6 ? null : (i + j) % 2 ? '#7a8a94' : '#6a7a86'), { bump: 0.03 });
    add(new THREE.Mesh(T.g(new THREE.PlaneGeometry(18, 6)), T.m(new THREE.MeshStandardMaterial({ color: '#2a7ab0', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.78, emissive: '#1a4a7a', emissiveIntensity: 0.35 }))), { y: -0.05, z: -5.6, rx: -Math.PI / 2, spin: 'bob' });
    for (let k = 0; k < 4; k++) K.box(k % 2 ? '#6a7a86' : '#5a6a76', 0, -0.12 - k * 0.14, -3.0 - k * 0.45, 4.4 - k * 0.4, 0.14, 0.45);
    [[-3.8, -1.8, '#ff8a9a'], [-4.4, -0.6, '#ffb070'], [3.8, -2.0, '#ff7ab0'], [4.4, -0.8, '#ff9a7a']].forEach(([x, z, c]) => { K.box(c, x, 0, z, 0.2, 0.6, 0.2); K.box(c, x + 0.18, 0.3, z, 0.4, 0.14, 0.14); K.box(c, x + 0.35, 0.44, z, 0.12, 0.32, 0.12); K.box(c, x - 0.15, 0.25, z + 0.1, 0.12, 0.36, 0.12); });
    [[-2.8, -2.4], [2.9, -2.6], [-5.0, -1.2]].forEach(([x, z]) => { for (let k = 0; k < 5; k++) K.box(k % 2 ? '#3a8a5a' : '#2f7a4a', x + Math.sin(k) * 0.06, k * 0.28, z, 0.12, 0.28, 0.12); });
    [[-3.3, 0.6], [3.2, 0.4]].forEach(([x, z]) => K.box('#cfc0a0', x, 0, z, 0.24, 0.1, 0.18));
    if (o.boss) {
      [-1.4, 2.6].forEach((x) => { K.stack('#5a7a86', '#4f6f7a', x, -3.6, 5, 0.42); K.box('#3a8a5a', x + 0.2, 1.2, -3.36, 0.06, 0.6, 0.04); });
      K.box('#4f6f7a', 0.6, 2.1, -3.6, 4.4, 0.36, 0.5); K.box('#ff8ab0', -0.2, 2.46, -3.6, 0.3, 0.22, 0.3);
      K.box('#c8b8d8', -2.6, 0, -2.2, 0.9, 0.22, 0.7); K.box('#b8a8c8', -2.6, 0.22, -2.45, 0.9, 0.45, 0.12, { rx: -0.5 }); K.box('#ffffff', -2.6, 0.26, -2.15, 0.26, 0.26, 0.26, { e: '#bfe8ff', ei: 1.6, rough: 0.2 });
      for (let k = 0; k < 6; k++) K.box('#ffd86b', -1.8 + r() * 0.8, 0, -2.0 + r() * 0.6, 0.14, 0.04, 0.14, { e: '#c88a10', ei: 0.35, rough: 0.35 });
    }
  } },
  // Dungeon 5. Brick floor, ash heaps and the walls of an enormous kiln; the boss room opens the kiln mouth.
  coldkiln: { mood: 'dusk', fog: '#4a2a20', motes: '#ffb070', build(add, T, r, K, o) {
    K.floor((i, j) => ((j % 2 ? i + 1 : i) % 3 === 0 ? '#7a3a2a' : (i + j) % 2 ? '#8a4a32' : '#93543a'), { bump: 0.03 });
    for (let x = -5.5; x <= 5.5; x += 0.9) for (let y = 0; y < 3; y++) K.box((x * 10 + y) % 2 ? '#7a3a28' : '#6a3222', x + (y % 2) * 0.45, y * 0.62, -4.2, 0.86, 0.6, 0.6);
    K.stack('#5a2a1e', '#4a2218', -3.8, -3.6, 7, 0.5, { taper: true });
    [[-3.0, -1.0], [3.2, -1.6], [-4.4, 0.4]].forEach(([x, z]) => { K.box('#6a6a6a', x, 0, z, 0.7, 0.2, 0.6); K.box('#7a7a7a', x + 0.05, 0.2, z, 0.4, 0.14, 0.35); });
    [[2.6, -2.6, 0.5], [3.3, -2.9, 0.7], [-2.4, -2.8, 0.6]].forEach(([x, z, h]) => { K.box('#b07a4a', x, 0, z, 0.36, h, 0.36); K.box('#c08a5a', x, h, z, 0.24, 0.1, 0.24); });
    if (o.boss) {
      K.box('#5a2a1e', 0.6, 0, -3.7, 3.4, 2.4, 0.5); K.box('#2a0c06', 0.6, 0.2, -3.44, 1.6, 1.4, 0.05);
      K.box('#ff8a3a', 0.6, 0.25, -3.4, 1.4, 1.2, 0.04, { e: '#ff6a1a', ei: 2.2, spin: 'flicker' });
      [-0.9, 2.1].forEach((x) => K.box('#ff7a2a', x, 0.005, -2.6, 0.14, 0.02, 2.2, { e: '#ff5a10', ei: 1.6 }));
      [[-1.7, -3.0], [-2.1, -2.7], [2.9, -3.1], [3.3, -2.7]].forEach(([x, z], i) => { const h = 0.4 + (i % 2) * 0.25; K.box(i % 2 ? '#d8a050' : '#c08040', x, 0, z, 0.3, h, 0.3, { e: '#ffb040', ei: 0.25 }); K.box('#ffd86b', x, h, z, 0.18, 0.06, 0.18, { e: '#ffb040', ei: 0.8 }); });
    }
  } },
  // Dungeon 6 (the original Hollow Veil): ink floor, arches, candles and drifting pages; the boss keeps a lectern of
  // books nobody wrote.
  hollowveil: { mood: 'dark', fog: '#1a1430', motes: '#c9b8ff', build(add, T, r, K, o) {
    add(new THREE.Mesh(T.g(new THREE.CircleGeometry(6.5, 48)), T.m(new THREE.MeshStandardMaterial({ map: T.t(radialTexture([[0, '#4a3a6a'], [0.6, '#2a2040'], [1, '#120c20']])), roughness: 0.85 }))), { rx: -Math.PI / 2 });
    const arch = T.m(new THREE.MeshStandardMaterial({ color: '#5a4a72', roughness: 0.7 })), wax = T.m(new THREE.MeshStandardMaterial({ color: '#efe6d0', roughness: 0.6 }));
    const flame = T.m(new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb84a', emissiveIntensity: 2 })), page = T.m(new THREE.MeshStandardMaterial({ color: '#f4ecd8', roughness: 0.9, side: THREE.DoubleSide }));
    [[-3.8, -2.8], [0.2, -4.4], [4.2, -2.6]].forEach(([x, z]) => add(new THREE.Mesh(T.g(new THREE.TorusGeometry(1.2, 0.16, 8, 20, Math.PI)), arch), { x, y: 0, z, ry: Math.atan2(-x, -z - 6) }));
    for (let i = 0; i < 9; i++) { const x = (r() - 0.5) * 9, z = -1.2 - r() * 3, h = 0.15 + r() * 0.3; add(new THREE.Mesh(T.g(new THREE.CylinderGeometry(0.07, 0.08, h, 8)), wax), { x, y: h / 2, z }); add(new THREE.Mesh(T.g(new THREE.SphereGeometry(0.05, 8, 6)), flame), { x, y: h + 0.06, z, sy: 1.6, spin: 'flicker' }); }
    for (let i = 0; i < 10; i++) add(new THREE.Mesh(T.g(new THREE.PlaneGeometry(0.28, 0.36)), page), { x: (r() - 0.5) * 8, y: 1.2 + r() * 2, z: -1 - r() * 3.5, rx: r(), ry: r() * 3, spin: 'drift' });
    const ink = T.m(new THREE.MeshBasicMaterial({ color: '#0a0614', transparent: true, opacity: 0.6, depthWrite: false }));
    for (let i = 0; i < 5; i++) add(new THREE.Mesh(T.g(new THREE.CircleGeometry(0.4 + r() * 0.6, 20)), ink), { x: (r() - 0.5) * 8, y: 0.012, z: (r() - 0.5) * 4 - 1, rx: -Math.PI / 2, sx: 1.6 });
    if (o.boss) {
      [-2.6, -2.0, 3.0, 3.6].forEach((x, i) => { for (let k = 0; k < 4 + (i % 2) * 2; k++) K.box(['#6a3a4a', '#3a4a6a', '#5a5a3a', '#4a3a6a'][k % 4], x + (r() - 0.5) * 0.08, k * 0.2, -3.0 - (i % 2) * 0.3, 0.5, 0.2, 0.36, { ry: (r() - 0.5) * 0.4 }); });
      K.box('#3a2a4a', 0.6, 0, -3.4, 0.5, 1.0, 0.4); K.box('#4a3a5a', 0.6, 1.0, -3.4, 0.9, 0.12, 0.6, { rx: 0.35 }); K.box('#f4ecd8', 0.6, 1.1, -3.35, 0.7, 0.04, 0.46, { rx: 0.35, e: '#c9b8ff', ei: 0.5 });
      K.box('#c9b8ff', 0.6, 1.6, -3.4, 0.14, 0.14, 0.14, { e: '#9a78e6', ei: 2, spin: 'orbit' });
    }
  } },
  // Dungeon 7. Lantern-trees planted in straight rows; the boss room holds the oldest, brightest tree.
  lanternorchard: { mood: 'dusk', fog: '#3a3050', motes: '#ffe9a0', build(add, T, r, K, o) {
    K.floor((i, j) => (Math.abs(i) % 4 === 0 ? '#7a6a4a' : (i + j) % 2 ? '#4f8a44' : '#58964a'));
    [-4.6, -2.6, 2.8, 4.8].forEach((x, a) => [-3.4, -1.4].forEach((z, b) => K.tree(x, z + (a % 2) * 0.3, 0.85 + ((a + b) % 2) * 0.15, '#3f7a4a', '#4f8a54', { lanterns: true, trunk: '#5a3a24' })));
    for (let i = 0; i < 12; i++) K.tuft((r() - 0.5) * 10, (r() - 0.5) * 5 - 0.5, '#6abf5a');
    if (o.boss) {
      K.box('#5a3a24', 0.7, 0, -3.6, 0.6, 2.2, 0.6); K.box('#4a3020', 0.4, 0, -3.3, 0.9, 0.3, 0.9);
      [[0, 2.1, 2.6, 1.0], [0.1, 2.8, 2.0, 0.8], [0, 3.4, 1.2, 0.6]].forEach(([dx, y, w, h], i) => K.box(i % 2 ? '#4f8a54' : '#3f7a4a', 0.7 + dx, y, -3.6, w, h, w));
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; K.box(k % 3 ? '#ffd070' : '#fff3c0', 0.7 + Math.cos(a) * 1.3, 2.0 + (k % 4) * 0.35, -3.6 + Math.sin(a) * 1.1, 0.18, 0.22, 0.18, { e: '#ffb84a', ei: 2, spin: k % 4 === 0 ? 'flicker' : null }); }
      K.box('#ffe9a0', 0.7, 0.005, -2.4, 2.6, 0.02, 1.6, { e: '#ffd86b', ei: 0.6, op: 0.35 });
    }
  } },
  // Dungeon 8. A cliff stair below the Spire: wind-worn steps, pennants, loose rocks drifting; the boss room has
  // the tower of the Weathervane.
  windstair: { mood: 'day', fog: '#9ad0e8', motes: '#e8fff8', build(add, T, r, K, o) {
    K.floor((i, j, x, z) => (z > 1.8 && Math.abs(x) > 4 ? null : (i + j) % 3 ? '#a8b0b8' : '#98a0aa'), { bump: 0.06 });
    for (let k = 0; k < 6; k++) K.box(k % 2 ? '#a0a8b0' : '#8e96a0', -4.8 + k * 0.55, 0, -3.0 - k * 0.15, 0.6, 0.3 + k * 0.3, 1.2);
    [[3.2, -2.6], [-2.6, -2.8]].forEach(([x, z], i) => { K.box('#7a6a5a', x, 0, z, 0.08, 1.8, 0.08); K.box(i ? '#8fe6d6' : '#ffd86b', x + 0.3, 1.4, z, 0.55, 0.3, 0.02, { spin: 'sway' }); });
    for (let i = 0; i < 6; i++) K.box('#9aa2ac', (r() - 0.5) * 9, 1.6 + r() * 1.8, -1.6 - r() * 2.6, 0.3 + r() * 0.3, 0.25 + r() * 0.2, 0.3, { spin: 'orbit' });
    if (o.boss) {
      K.stack('#a0a8b0', '#8e96a0', 0.8, -3.7, 8, 0.48, { taper: true });
      K.box('#6a5a4a', 0.8, 3.84, -3.7, 0.08, 0.8, 0.08);
      K.box('#ffd86b', 0.8, 4.4, -3.7, 1.2, 0.12, 0.08, { e: '#c88a10', ei: 0.5, spin: 'vane', rough: 0.35 });
      K.box('#ffd86b', 0.25, 4.34, -3.7, 0.2, 0.24, 0.08, { e: '#c88a10', ei: 0.5 });
      [[-1.6, -2.6], [3.0, -2.2]].forEach(([x, z]) => { K.box('#8fe6d6', x, 0, z, 0.3, 0.6, 0.3, { e: '#5fd8c0', ei: 0.9 }); K.box('#c8fff4', x, 0.6, z, 0.18, 0.3, 0.18, { e: '#8fe6d6', ei: 1.2 }); });
    }
  } },
  // Dungeon 9 (the original Resonance Scar), with a crown of shattered sky crystals over its boss.
  resonancescar: { mood: 'dusk', fog: '#3a2a5a', motes: '#ff9ede', build(add, T, r, K, o) {
    const shard = T.m(new THREE.MeshStandardMaterial({ color: '#6a5a8a', roughness: 0.8, flatShading: true }));
    add(new THREE.Mesh(T.g(new THREE.CircleGeometry(6.5, 48)), T.m(new THREE.MeshStandardMaterial({ map: T.t(radialTexture([[0, '#8a6aa8'], [0.5, '#5a4a7a'], [1, '#1e1838']])), roughness: 0.9 }))), { rx: -Math.PI / 2 });
    for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2, d = 2.4 + r() * 3; add(new THREE.Mesh(T.g(new THREE.CylinderGeometry(0.4 + r() * 0.5, 0.5 + r() * 0.5, 0.18, 5)), shard), { x: Math.cos(a) * d, y: 0.05 + r() * 0.15, z: Math.sin(a) * d - 1, rx: (r() - 0.5) * 0.3, rz: (r() - 0.5) * 0.3, ry: r() * 3 }); }
    const crys = [T.m(new THREE.MeshStandardMaterial({ color: '#ff9ede', emissive: '#ff5fc8', emissiveIntensity: 0.6, roughness: 0.2 })), T.m(new THREE.MeshStandardMaterial({ color: '#9ae8ff', emissive: '#5fd8ff', emissiveIntensity: 0.6, roughness: 0.2 }))];
    for (let i = 0; i < 8; i++) { const x = (r() - 0.5) * 10, z = -1.8 - r() * 3, h = 0.6 + r() * 1.6; add(new THREE.Mesh(T.g(new THREE.OctahedronGeometry(0.3, 0)), crys[i % 2]), { x, y: h / 2, z, sy: h / 0.6, rz: (r() - 0.5) * 0.4 }); }
    const rock = T.m(new THREE.MeshStandardMaterial({ color: '#8a7aa8', roughness: 0.9, flatShading: true }));
    for (let i = 0; i < 7; i++) add(new THREE.Mesh(T.g(new THREE.DodecahedronGeometry(0.25 + r() * 0.3, 0)), rock), { x: (r() - 0.5) * 9, y: 1.6 + r() * 1.8, z: -1.5 - r() * 3, spin: 'orbit' });
    if (o.boss) {
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; add(new THREE.Mesh(T.g(new THREE.OctahedronGeometry(0.22, 0)), crys[k % 2]), { x: 1.35 + Math.cos(a) * 1.5, y: 2.7 + Math.sin(a * 2) * 0.15, z: -0.95 + Math.sin(a) * 0.9, sy: 2.2, spin: 'orbit' }); }
      K.box('#2a1a4a', 1.3, 0, -3.6, 2.6, 0.3, 1.0); K.box('#ff9ede', 1.3, 0.3, -3.6, 0.3, 1.4, 0.3, { e: '#ff5fc8', ei: 1.2 });
    }
  } },
  // Dungeon 10, the Island Boss. The roots under the island meet here; glowing veins run through the floor and,
  // for the Island Boss, a heart of roots pulses behind it in shifting prismatic light.
  heartwood: { mood: 'dark', fog: '#16261c', motes: '#fff4c0', build(add, T, r, K, o) {
    K.floor((i, j) => ((i * 7 + j * 3) % 11 === 0 ? '#5a4630' : (i + j) % 2 ? '#2f4a2c' : '#35522f'), { bump: 0.06 });
    const vein = (x0, z0, x1, z1) => { const n = 8; for (let k = 0; k <= n; k++) K.box('#7aff8a', x0 + (x1 - x0) * k / n, 0.02, z0 + (z1 - z0) * k / n, 0.12, 0.04, 0.12, { e: '#4fdf6a', ei: 1.1 }); };
    vein(-4, 1, -1, -2); vein(4, 0.6, 1.6, -2.4); vein(-2, 2, 0.4, -0.4);
    [[-4.2, -3.2, 0.6], [4.4, -3.0, 0.55], [-5.0, -0.8, 0.45]].forEach(([x, z, s]) => { for (let k = 0; k < 7; k++) K.box(k % 2 ? '#4a3a24' : '#5a4630', x + Math.sin(k * 0.8) * 0.5, k * s * 0.6, z + k * 0.08, s, s * 0.6, s); });
    for (let k = 0; k < 10; k++) K.box(k % 2 ? '#4a3a24' : '#5a4630', -5 + k * 1.1, 2.6 + Math.sin(k) * 0.3, -4.0, 1.1, 0.4, 0.4);
    if (o.boss) {
      for (let y = 0; y < 5; y++) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + y * 0.4, rr = 0.9 - Math.abs(y - 2) * 0.18; K.box(k % 2 ? '#5a4630' : '#4a3a24', 1.2 + Math.cos(a) * rr, 0.4 + y * 0.42, -3.6 + Math.sin(a) * rr * 0.7, 0.5, 0.42, 0.5); }
      K.box('#ffffff', 1.2, 1.1, -3.6, 0.6, 0.6, 0.6, { e: '#ffffff', ei: 1.6, spin: 'prism' });
      [[-1.8, -2.8], [3.6, -2.6]].forEach(([x, z]) => { K.box('#6a7a6a', x, 0, z, 0.5, 1.1, 0.3); K.box('#fff4c0', x, 0.7, z + 0.16, 0.1, 0.1, 0.02, { e: '#ffd86b', ei: 1.4 }); });
    }
  } },
};
// battles outside the dungeons use the arena that fits them best
const ALIAS = { survival: 'resonancescar', pvp: 'hollowveil', raid: 'reliquary', practice: 'windstair' };
export const arenaFor = (id) => (ARENAS[id] ? id : ARENAS[ALIAS[id]] ? ALIAS[id] : 'reliquary');

// Static props that share a material become one mesh (one draw call per material instead of one per prop).
function mergeStatic(group, animated, T) {
  const byMat = new Map();
  group.children.forEach((m) => { if (!m.isMesh || m.isInstancedMesh || animated.has(m)) return; (byMat.get(m.material) || byMat.set(m.material, []).get(m.material)).push(m); });
  byMat.forEach((list, mat) => {
    if (list.length < 2) return;
    const geos = list.map((m) => { m.updateMatrix(); let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrix);
      Object.keys(g.attributes).forEach((k) => { if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k); }); return g; });
    const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose()); if (!merged) return;
    list.forEach((m) => group.remove(m));
    group.add(new THREE.Mesh(T.g(merged), mat));
  });
}
// Living-pixel motes: small square points that rise slowly through the arena and loop (one draw call; positions
// updated in place, no allocation per frame). More and brighter in a boss room.
export function motes(T, color, n) {
  const g = T.g(new THREE.BufferGeometry()), pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 10; pos[i * 3 + 1] = Math.random() * 3.2; pos[i * 3 + 2] = -0.5 - Math.random() * 4; seed[i] = Math.random() * 6.28; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, T.m(new THREE.PointsMaterial({ color, size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })));
  pts.userData = { pos, seed, n };
  return pts;
}
// Builds an arena into `scene`; returns { def, group, update(t), dispose() }. o: { boss, island }
export function buildArena(scene, id, o) {
  o = o || {}; const key = arenaFor(id);
  const def = ARENAS[key], T = tracker(), group = new THREE.Group(), anim = [], r = rnd(key.length * 977 + 13 + (o.boss ? 7 : 0));
  const add = (mesh, p) => {
    p = p || {}; mesh.position.set(p.x || 0, p.y || 0, p.z || 0); mesh.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
    if (p.sx || p.sy || p.sz) mesh.scale.set(p.sx || 1, p.sy || 1, p.sz || 1);
    if (p.spin) anim.push({ mesh, kind: p.spin, y0: mesh.position.y, ph: r() * 6.28, sy: mesh.scale.y });
    group.add(mesh); return mesh;
  };
  const K = kit(add, T, r);
  def.build(add, T, r, K, o);
  mergeStatic(group, new Set(anim.map((a) => a.mesh)), T);
  const mt = motes(T, def.motes || '#ffffff', o.boss ? 46 : 26); group.add(mt);
  scene.add(group);
  scene.fog = new THREE.Fog(def.fog, 7, 16);
  const col = new THREE.Color();
  return {
    def, group, key,
    update(t, dt) {
      anim.forEach((a) => {
        const m = a.mesh;
        if (a.kind === 'drift') { m.position.y = a.y0 + Math.sin(t * 0.6 + a.ph) * 0.15; m.rotation.y += 0.004; }
        else if (a.kind === 'orbit') { m.position.y = a.y0 + Math.sin(t * 0.5 + a.ph) * 0.25; m.rotation.x += 0.003; m.rotation.y += 0.005; }
        else if (a.kind === 'flicker') m.scale.y = a.sy * (1 + Math.sin(t * 13 + a.ph) * 0.15);
        else if (a.kind === 'bob') m.position.y = a.y0 + Math.sin(t * 0.8) * 0.03;
        else if (a.kind === 'sway') m.rotation.y = Math.sin(t * 1.6 + a.ph) * 0.35;
        else if (a.kind === 'vane') m.rotation.y = Math.sin(t * 0.35) * 1.2;
        else if (a.kind === 'prism') { col.setHSL((t * 0.12) % 1, 0.85, 0.62); m.material.emissive.copy(col); m.material.color.copy(col); m.rotation.y += 0.01; m.scale.setScalar(0.6 * (1 + Math.sin(t * 2.2) * 0.08)); }
      });
      // motes rise and wrap; a little sideways drift
      const u = mt.userData, p = u.pos, step = Math.min(0.05, dt || 0.016);
      for (let i = 0; i < u.n; i++) { p[i * 3 + 1] += step * (0.22 + (i % 5) * 0.05); p[i * 3] += Math.sin(t * 0.7 + u.seed[i]) * step * 0.08; if (p[i * 3 + 1] > 3.4) p[i * 3 + 1] = 0.05; }
      mt.geometry.attributes.position.needsUpdate = true;
    },
    dispose() { scene.remove(group); scene.fog = null; T.dispose(); },
  };
}
