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
  // plain (not glowing, not see-through) blocks all share one vertex-coloured material, so the merge step joins every
  // one of them into a single mesh: one draw call for most of an arena
  const vmat = T.m(new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.9, flatShading: true })); vmat.userData.vcol = true;
  const K = {
    r, vmat,
    mat(c, o) {
      o = o || {}; const k = c + '|' + (o.e || '') + '|' + (o.ei || 0) + '|' + (o.op || 1);
      if (!mats.has(k)) mats.set(k, T.m(new THREE.MeshStandardMaterial({ color: c, roughness: o.rough != null ? o.rough : 0.9, flatShading: true, emissive: o.e || '#000000', emissiveIntensity: o.ei || 0, transparent: (o.op || 1) < 1, opacity: o.op || 1, depthWrite: (o.op || 1) >= 1 })));
      return mats.get(k);
    },
    box(c, x, y, z, w, h, d, o) {
      o = o || {}; const plain = !o.e && !o.ei && (o.op || 1) >= 1 && o.rough == null && !o.spin;
      const m = add(new THREE.Mesh(geo, plain ? vmat : K.mat(c, o)), { x, y: y + h / 2, z, sx: w, sy: h, sz: d, ry: o.ry || 0, rz: o.rz || 0, rx: o.rx || 0, spin: o.spin });
      if (plain) m.userData.col = c; return m;
    },
    // a column of blocks with a little jitter, like stacked stone
    stack(c, c2, x, z, n, s, o) { for (let i = 0; i < n; i++) K.box(i % 2 ? c2 : c, x + (r() - 0.5) * 0.05, i * s, z + (r() - 0.5) * 0.05, s * (1 - (o && o.taper ? i * 0.04 : 0)), s, s * (1 - (o && o.taper ? i * 0.04 : 0))); },
    // tiled floor: one instanced mesh, colour per tile from fn(i, j, x, z) (null = no tile)
    floor(fn, o) {
      o = o || {}; const step = o.step || 0.6, rx = o.rx || 6.6, rz = o.rz || 5.0, cells = [];
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
    if (list.length < 2 && !(mat.userData && mat.userData.vcol)) return;
    const vc = !!(mat.userData && mat.userData.vcol), tmp = new THREE.Color();
    const geos = list.map((m) => { m.updateMatrix(); let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrix);
      Object.keys(g.attributes).forEach((k) => { if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k); });
      if (vc) { tmp.set(m.userData.col || '#ffffff'); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = tmp.r; a[i * 3 + 1] = tmp.g; a[i * 3 + 2] = tmp.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
      return g; });
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
/* ------------------------------------------------------------------ Phase 7: atmospheres
   Each arena gets its own air: a light rig (key, rim and sky colours), fog distance, an ambient particle behaviour
   built from small cubes (embers in the kiln, bubbles on the drowned steps, fireflies in the orchard, falling leaves
   in the Heartwood…), soft light shafts where the place has an open sky or a high window, and two layers of distant
   voxel silhouettes so the arena has depth behind it. Guardians and the Island Boss change the light: dimmer key,
   a coloured rim, a pool of light under the boss; for the Island Boss the rim slowly cycles through the spectrum.
   Cost: one instanced mesh for the particles, one merged mesh for the shafts, two instanced meshes for the
   silhouettes. Battery saver halves the particles and stills the shafts; Reduce motion stills everything. */
export const ATMOS = {
  forgottenroad:  { light: { key: ['#fff1d6', 2.4], rim: ['#ffffff', 1.5], hemi: ['#d6ecff', '#7a8a5a', 1.3] }, fog: [8, 18], particles: { kind: 'pollen', colors: ['#fffbe0', '#fff2a8', '#ffffff'], n: 30 }, shafts: { color: '#fff4c8', n: 3, op: 0.16 }, backdrop: { kind: 'trees', colors: ['#4f8a44', '#7aa8a0'] } },
  gatheringhall:  { light: { key: ['#ffd9a8', 2.2], rim: ['#ffc070', 1.7], hemi: ['#c8a890', '#3a2a22', 1.1] }, fog: [6, 15], particles: { kind: 'dust', colors: ['#ffe2b0', '#ffd890', '#fff3d8'], n: 26 }, shafts: { color: '#ffd28a', n: 2, op: 0.18 }, backdrop: { kind: 'hall', colors: ['#3a2a24', '#2a1e1a'] } },
  reliquary:      { light: { key: ['#f2ffe0', 2.2], rim: ['#c8ffd0', 1.6], hemi: ['#d8ffe0', '#3a5a3a', 1.25] }, fog: [7, 16], particles: { kind: 'spores', colors: ['#d8ffb0', '#a8ff9a', '#ffffff'], n: 32 }, shafts: { color: '#e0ffd0', n: 4, op: 0.17 }, backdrop: { kind: 'pillars', colors: ['#4a6a4a', '#5a8a7a'] } },
  drownedsteps:   { light: { key: ['#e8f4ff', 2.1], rim: ['#8fdcff', 1.8], hemi: ['#a8d8ff', '#1a3a5a', 1.3] }, fog: [7, 17], particles: { kind: 'bubbles', colors: ['#dff6ff', '#bfefff', '#ffffff'], n: 28 }, shafts: { color: '#bfe8ff', n: 3, op: 0.15 }, backdrop: { kind: 'reef', colors: ['#2f6a7a', '#3a7a9a'] } },
  coldkiln:       { light: { key: ['#ffd0a0', 2.3], rim: ['#ff8a3a', 2.0], hemi: ['#ffb890', '#3a1a12', 1.15] }, fog: [6, 15], particles: { kind: 'embers', colors: ['#ffdf7a', '#ffa43a', '#ff6a2a'], n: 34 }, shafts: null, backdrop: { kind: 'kiln', colors: ['#4a2418', '#5a2e20'] }, flicker: true },
  hollowveil:     { light: { key: ['#e0d4ff', 2.0], rim: ['#b49bff', 1.9], hemi: ['#9a88d8', '#160f26', 1.1] }, fog: [6, 14], particles: { kind: 'wisps', colors: ['#c9b8ff', '#e8dcff', '#9a78e6'], n: 24 }, shafts: { color: '#c9b8ff', n: 2, op: 0.12 }, backdrop: { kind: 'arches', colors: ['#2a2040', '#1e1830'] } },
  lanternorchard: { light: { key: ['#ffe2b8', 2.1], rim: ['#ffd070', 1.8], hemi: ['#c0b0e8', '#2a2a3a', 1.15] }, fog: [7, 16], particles: { kind: 'fireflies', colors: ['#fff3a0', '#ffe070', '#d8ff9a'], n: 26 }, shafts: null, backdrop: { kind: 'orchard', colors: ['#2f5a3a', '#3a4a5a'] } },
  windstair:      { light: { key: ['#ffffff', 2.5], rim: ['#d8fff4', 1.5], hemi: ['#e0f4ff', '#7a8a9a', 1.4] }, fog: [9, 20], particles: { kind: 'gusts', colors: ['#ffffff', '#e8fff8', '#c8f4ec'], n: 22 }, shafts: { color: '#ffffff', n: 2, op: 0.12 }, backdrop: { kind: 'spires', colors: ['#8a98a8', '#a8c4d8'] } },
  resonancescar:  { light: { key: ['#ffe4f6', 2.1], rim: ['#9fe8ff', 2.0], hemi: ['#d0b8ff', '#2a1a40', 1.2] }, fog: [7, 16], particles: { kind: 'glitter', colors: ['#ff9ede', '#9fe8ff', '#fff0a8', '#c8b4ff'], n: 30 }, shafts: { color: '#ffd2f0', n: 3, op: 0.13 }, backdrop: { kind: 'crystals', colors: ['#3a2a5a', '#4a3a7a'] } },
  heartwood:      { light: { key: ['#e8ffd0', 1.9], rim: ['#9affb0', 1.9], hemi: ['#a8d8a0', '#0e1a10', 1.05] }, fog: [6, 15], particles: { kind: 'leaves', colors: ['#7ad44a', '#5ab83a', '#b8e86a', '#e8c85a'], n: 28 }, shafts: { color: '#e8ffc0', n: 5, op: 0.2 }, backdrop: { kind: 'roots', colors: ['#2a2418', '#1e2a1e'] } },
};
const BOSS_LIGHT = { key: 0.82, rim: 1.25, hemi: 0.78 };

// ambient particles: small cubes with a behaviour per arena (one InstancedMesh)
function ambient(T, cfg, n, still) {
  const geo = T.g(new THREE.BoxGeometry(1, 1, 1)), mat = T.m(new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false }));
  const mesh = new THREE.InstancedMesh(geo, mat, n); mesh.frustumCulled = false; mesh.name = 'atmo:particles';
  const P = [], col = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const k = cfg.kind;
  for (let i = 0; i < n; i++) {
    const p = { x: (Math.random() - 0.5) * 11, y: Math.random() * 3.2, z: -0.6 - Math.random() * 4.4 + (k === 'gusts' ? 1.5 : 0), ph: Math.random() * 6.28, s: 0.035 + Math.random() * 0.035, r: Math.random() * 3 };
    if (k === 'leaves') { p.s = 0.06 + Math.random() * 0.04; p.y = Math.random() * 4; }
    if (k === 'gusts') { p.s = 0.03; p.len = 0.4 + Math.random() * 0.5; }
    if (k === 'bubbles') p.s = 0.03 + Math.random() * 0.05;
    P.push(p); mesh.setColorAt(i, col.set(cfg.colors[i % cfg.colors.length]));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  const write = (t) => {
    for (let i = 0; i < n; i++) { const p = P[i]; let sx = p.s, sy = p.s, sz = p.s, rx = p.r, ry = p.r * 0.7;
      if (k === 'gusts') { sx = p.len; sy = p.s * 0.6; sz = p.s * 0.6; rx = 0; ry = 0; }
      if (k === 'fireflies') { const b = 0.5 + 0.5 * Math.sin(t * 2.2 + p.ph * 3); sx = sy = sz = p.s * (0.35 + b * 0.9); }
      if (k === 'embers') { const b = 0.6 + 0.4 * Math.sin(t * 9 + p.ph * 5); sx = sy = sz = p.s * b; }
      if (k === 'leaves') { sy = p.s * 0.3; }
      m.compose(v.set(p.x, p.y, p.z), q.setFromEuler(e.set(rx, ry, k === 'leaves' ? p.r * 0.5 : 0)), sc.set(sx, sy, sz)); mesh.setMatrixAt(i, m); }
    mesh.instanceMatrix.needsUpdate = true;
  };
  write(0);
  return {
    mesh,
    update(t, dt) {
      if (still()) return; dt = Math.min(0.05, dt || 0.016);
      for (let i = 0; i < n; i++) { const p = P[i];
        if (k === 'pollen' || k === 'dust') { p.x += dt * (k === 'pollen' ? 0.18 : 0.06); p.y += Math.sin(t * 0.8 + p.ph) * dt * 0.08; p.r += dt * 0.5; if (p.x > 5.6) p.x = -5.6; }
        else if (k === 'spores' || k === 'wisps') { p.y += dt * (k === 'spores' ? 0.16 : 0.06); p.x += Math.sin(t * 0.6 + p.ph) * dt * 0.12; p.z += Math.cos(t * 0.5 + p.ph) * dt * (k === 'wisps' ? 0.1 : 0.04); p.r += dt; if (p.y > 3.4) p.y = 0.05; }
        else if (k === 'bubbles') { p.y += dt * (0.3 + p.s * 4); p.x += Math.sin(t * 3 + p.ph) * dt * 0.1; if (p.y > 3.4) { p.y = 0.02; p.x = (Math.random() - 0.5) * 11; } }
        else if (k === 'embers') { p.y += dt * (0.45 + (i % 4) * 0.12); p.x += Math.sin(t * 1.4 + p.ph) * dt * 0.2; p.r += dt * 3; if (p.y > 3.4) { p.y = 0.02; p.x = (Math.random() - 0.5) * 11; } }
        else if (k === 'fireflies') { p.x += Math.sin(t * 0.7 + p.ph) * dt * 0.25; p.y += Math.cos(t * 0.9 + p.ph * 2) * dt * 0.18; p.z += Math.sin(t * 0.5 + p.ph * 3) * dt * 0.12; if (p.y < 0.2) p.y = 0.2; if (p.y > 2.8) p.y = 2.8; }
        else if (k === 'gusts') { p.x += dt * (3.2 + (i % 3)); if (p.x > 6.5) { p.x = -6.5; p.y = 0.3 + Math.random() * 2.6; } }
        else if (k === 'glitter') { p.y -= dt * 0.12; p.r += dt * 1.6; if (p.y < 0.05) p.y = 3.3; }
        else if (k === 'leaves') { p.y -= dt * (0.28 + (i % 3) * 0.06); p.x += Math.sin(t * 1.3 + p.ph) * dt * 0.35; p.r += dt * 1.8; if (p.y < 0.04) { p.y = 3.6 + Math.random(); p.x = (Math.random() - 0.5) * 11; } } }
      write(t);
    },
  };
}
// soft light shafts: tall additive quads with a vertical fade, merged into one mesh; their opacity breathes slowly
function shafts(T, cfg, r) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  const tex = T.t(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = T.m(new THREE.MeshBasicMaterial({ map: tex, color: cfg.color, transparent: true, opacity: cfg.op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false }));
  const geos = [];
  const n = Math.min(cfg.n, cfg.max || 3);
  for (let i = 0; i < n; i++) { const w = 0.5 + r() * 0.5, h = 4.2, q = new THREE.PlaneGeometry(w, h); const x = -4 + (i / Math.max(1, n - 1)) * 8 + (r() - 0.5) * 1.2;
    q.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, h / 2 + 0.2, -2.8 - r() * 1.6), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (r() - 0.5) * 0.4, -0.38)), new THREE.Vector3(1, 1, 1))); geos.push(q); }
  const merged = T.g(mergeGeometries(geos, false)); geos.forEach((x) => x.dispose());
  const mesh = new THREE.Mesh(merged, mat); mesh.renderOrder = 3; mesh.name = 'atmo:shafts';
  return { mesh, update(t, still) { if (!still) mat.opacity = cfg.op * (0.75 + Math.sin(t * 0.5) * 0.25); } };
}
// distant voxel silhouettes: two layers of blocks, tinted towards the fog so they read as depth, not as props
function backdrop(T, cfg, fog, r, layers) {
  const geo = T.g(new THREE.BoxGeometry(1, 1, 1)), out = [], fogC = new THREE.Color(fog), m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  [[0, -6.8, 0.45], [1, -9.4, 0.7]].slice(0, layers || 2).forEach(([li, z, mix]) => {
    const blocks = [], base = new THREE.Color(cfg.colors[li]).lerp(fogC, mix), push = (x, y, zz, w, h, d, c) => blocks.push([x, y, zz, w, h, d, c || base]);
    for (let x = -13; x <= 13; x += 0.9 + r() * 0.8) {
      const k = cfg.kind, h = 1 + r() * 2.2 + li * 0.8, zz = z + (r() - 0.5) * 1.2;
      if (k === 'trees' || k === 'orchard') { push(x, 0, zz, 0.3, h * 0.6, 0.3); const cw = 1 + r() * 0.8; push(x, h * 0.55, zz, cw, h * 0.5, cw); push(x, h * 1.02, zz, cw * 0.6, h * 0.3, cw * 0.6); if (k === 'orchard' && r() < 0.6) push(x + 0.3, h * 0.6, zz + 0.5, 0.14, 0.18, 0.14, new THREE.Color('#ffd070')); }
      else if (k === 'pillars' || k === 'arches') { push(x, 0, zz, 0.55, h * 1.2, 0.55); if (k === 'arches' && r() < 0.5) push(x + 0.7, h * 1.2, zz, 1.9, 0.4, 0.5); }
      else if (k === 'reef') { push(x, 0, zz, 0.4, h * 0.8, 0.4); push(x + 0.25, h * 0.5, zz, 0.5, 0.25, 0.3); }
      else if (k === 'kiln' || k === 'hall') { push(x, 0, zz, 0.95, h * 1.3, 0.8); if (k === 'kiln' && r() < 0.3) push(x, h * 1.3, zz, 0.4, 1.2, 0.4); }
      else if (k === 'spires') { push(x, 0, zz, 0.7, h * 1.6, 0.7); push(x, h * 1.6, zz, 0.4, h * 0.6, 0.4); }
      else if (k === 'crystals') { push(x, 0, zz, 0.45, h * 1.4, 0.45, null); }
      else if (k === 'roots') { push(x, 0, zz, 1.0 + r() * 0.6, h * 1.6, 1.0); if (r() < 0.5) push(x + 0.8, h * 1.1, zz, 1.6, 0.45, 0.6); }
      else push(x, 0, zz, 0.9, h, 0.9);
    }
    const mesh = new THREE.InstancedMesh(geo, T.m(new THREE.MeshBasicMaterial({ color: '#ffffff', fog: true })), blocks.length);
    blocks.forEach(([x, y, zz, w, h, d, c], i) => { const tilt = cfg.kind === 'crystals' ? (r() - 0.5) * 0.4 : 0; m.compose(new THREE.Vector3(x, y + h / 2, zz), q.setFromEuler(new THREE.Euler(0, r() * 0.4, tilt)), new THREE.Vector3(w, h, d)); mesh.setMatrixAt(i, m); mesh.setColorAt(i, col.copy(c)); });
    mesh.name = 'atmo:backdrop'; mesh.renderOrder = 1; // drawn after the arena, so the parts hidden behind it cost nothing
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; out.push(mesh);
  });
  return out;
}

// Builds an arena into `scene`; returns { def, group, update(t), dispose() }. o: { boss, island }
export function buildArena(scene, id, o) {
  o = o || {}; const key = arenaFor(id);
  const def = ARENAS[key], T = tracker(), group = new THREE.Group(), anim = [], r = rnd(key.length * 977 + 13 + (o.boss ? 7 : 0));
  const AT = ATMOS[key] || {}, still = o.still || (() => false), saver = o.saver || (() => false);
  const add = (mesh, p) => {
    p = p || {}; mesh.position.set(p.x || 0, p.y || 0, p.z || 0); mesh.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
    if (p.sx || p.sy || p.sz) mesh.scale.set(p.sx || 1, p.sy || 1, p.sz || 1);
    if (p.spin) anim.push({ mesh, kind: p.spin, y0: mesh.position.y, ph: r() * 6.28, sy: mesh.scale.y });
    group.add(mesh); return mesh;
  };
  const K = kit(add, T, r);
  def.build(add, T, r, K, o);
  mergeStatic(group, new Set(anim.map((a) => a.mesh)), T);
  // Phase 7 atmosphere (the living-pixel motes stay for boss rooms, on top of the arena's own particles)
  const mt = o.boss ? motes(T, def.motes || '#ffffff', 30) : null; if (mt) group.add(mt);
  const amb = AT.particles ? ambient(T, AT.particles, Math.max(8, Math.round(AT.particles.n * (saver() ? 0.5 : 1) * (o.boss ? 1.2 : 1))), () => still() || false) : null; if (amb) group.add(amb.mesh);
  // light shafts are the costliest layer to draw (large see-through quads): up to three on High, two on Balanced, none in Battery saver
  const tier = o.tier ? o.tier() : 'high', shMax = saver() || tier === 'saver' ? 0 : tier === 'balanced' ? 2 : 3;
  const sh = AT.shafts && shMax ? shafts(T, Object.assign({}, AT.shafts, { max: shMax }, o.island ? { color: '#ffd2f0', op: AT.shafts.op * 1.2 } : {}), r) : null; if (sh) group.add(sh.mesh);
  // the distant silhouettes paint sky that was empty before: two layers on High, the near one on Balanced, none in Battery saver
  const bd = AT.backdrop && !(saver() || tier === 'saver') ? backdrop(T, AT.backdrop, def.fog, rnd(key.length * 31 + 5), tier === 'high' ? 2 : 1) : []; bd.forEach((m) => group.add(m));
  // a pool of light under the boss
  let pool = null;
  if (o.boss) { pool = new THREE.Mesh(T.g(new THREE.CircleGeometry(1.7, 40)), T.m(new THREE.MeshBasicMaterial({ map: T.t(radialTexture([[0, 'rgba(255,255,255,0.75)'], [0.6, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']], 128)), color: o.island ? '#ffd2f0' : '#ffe2a0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
    pool.name = 'atmo:pool'; pool.rotation.x = -Math.PI / 2; pool.position.set(1.35, 0.025, -0.95); pool.scale.set(1, 0.8, 1); group.add(pool); }
  scene.add(group);
  const fog = AT.fog || [7, 16]; scene.fog = new THREE.Fog(def.fog, fog[0] - (o.boss ? 0.5 : 0), fog[1] - (o.boss ? 1 : 0));
  // the light rig the runtime builds with (studioLights override), dimmer and rim-lit for a boss
  const L = AT.light ? { key: AT.light.key.slice(), rim: AT.light.rim.slice(), hemi: AT.light.hemi.slice() } : null;
  if (L && o.boss) { L.key[1] *= BOSS_LIGHT.key; L.rim = [o.island ? '#ff9ee0' : '#ffd070', L.rim[1] * BOSS_LIGHT.rim]; L.hemi[2] *= BOSS_LIGHT.hemi; }
  let rig = null; const col = new THREE.Color(), key0 = L ? L.key[1] : 0;
  return {
    def, group, key, light: L,
    atmo: { tier, backdropLayers: bd.length, particles: AT.particles ? AT.particles.kind : null, count: amb ? amb.mesh.count : 0, shafts: sh ? Math.min(AT.shafts.n, shMax) : 0, backdrop: AT.backdrop ? AT.backdrop.kind : null, boss: !!o.boss, island: !!o.island },
    bindLights(g) { rig = g; },
    update(t, dt) {
      const quiet = still();
      anim.forEach((a) => {
        const m = a.mesh;
        if (quiet && a.kind !== 'prism') return;
        if (a.kind === 'drift') { m.position.y = a.y0 + Math.sin(t * 0.6 + a.ph) * 0.15; m.rotation.y += 0.004; }
        else if (a.kind === 'orbit') { m.position.y = a.y0 + Math.sin(t * 0.5 + a.ph) * 0.25; m.rotation.x += 0.003; m.rotation.y += 0.005; }
        else if (a.kind === 'flicker') m.scale.y = a.sy * (1 + Math.sin(t * 13 + a.ph) * 0.15);
        else if (a.kind === 'bob') m.position.y = a.y0 + Math.sin(t * 0.8) * 0.03;
        else if (a.kind === 'sway') m.rotation.y = Math.sin(t * 1.6 + a.ph) * 0.35;
        else if (a.kind === 'vane') m.rotation.y = Math.sin(t * 0.35) * 1.2;
        else if (a.kind === 'prism') { col.setHSL((t * 0.12) % 1, 0.85, 0.62); m.material.emissive.copy(col); m.material.color.copy(col); if (!quiet) m.rotation.y += 0.01; m.scale.setScalar(0.6 * (1 + (quiet ? 0 : Math.sin(t * 2.2) * 0.08))); }
      });
      if (amb) amb.update(t, dt);
      if (sh) sh.update(t, quiet || saver());
      if (pool && !quiet) pool.material.opacity = 0.75 + Math.sin(t * 1.4) * 0.2;
      // the light itself: a kiln's key flickers; the Island Boss's rim walks the spectrum
      if (rig && !quiet) {
        const kl = rig.children[1], rl = rig.children[2];
        if (AT.flicker && kl) kl.intensity = key0 * (0.94 + Math.sin(t * 7) * 0.03 + Math.sin(t * 13.1) * 0.03);
        if (o.island && rl) rl.color.setHSL((t * 0.05) % 1, 0.7, 0.72);
      }
      if (mt) { const u = mt.userData, p = u.pos, step = Math.min(0.05, dt || 0.016);
        if (!quiet) { for (let i = 0; i < u.n; i++) { p[i * 3 + 1] += step * (0.22 + (i % 5) * 0.05); p[i * 3] += Math.sin(t * 0.7 + u.seed[i]) * step * 0.08; if (p[i * 3 + 1] > 3.4) p[i * 3 + 1] = 0.05; }
          mt.geometry.attributes.position.needsUpdate = true; } }
    },
    dispose() { scene.remove(group); scene.fog = null; T.dispose(); },
  };
}
