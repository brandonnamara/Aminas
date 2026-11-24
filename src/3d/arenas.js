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
      const km = mats.get(k); km.userData.kit = true; return km;
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
      const mesh = new THREE.InstancedMesh(geo, T.m(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true })), cells.length); mesh.material.userData.kit = true;
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
const ALIAS = { survival: 'resonancescar', pvp: 'hollowveil', raid: 'reliquary', practice: 'windstair',
  // Phase 18C: the Verdant dungeons reuse the arena whose setting fits them (no new arena geometry)
  v_mossgate: 'forgottenroad', v_aqueduct: 'drownedsteps', v_spore: 'reliquary', v_archive: 'gatheringhall', v_glow: 'coldkiln',
  v_twinshrine: 'lanternorchard', v_canopy: 'windstair', v_moonwell: 'drownedsteps', v_choir: 'resonancescar', v_elderroot: 'heartwood' };
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

/* ------------------------------------------------------------------ Phase 14: set dressing
   Every arena gets a middle distance: a band of sharp voxel structures between the arena floor and the soft far
   backdrop (so the place has depth and architecture, not just a floor), small ground details at the edges, and
   in a boss room a marked boss ground with braziers in the place's own light, banners, and old treasure where the
   dungeon does not already have its own. All of it is plain blocks, which the merge step folds into the arena's
   single mesh: no extra draw calls except two shared glow materials. Nothing here touches the fighters' lane. */
const DRESS = {
  forgottenroad:  { band: ['tree', 'ruinwall', 'tree', 'column', 'tree', 'arch', 'tree', 'rock'], a: '#8f959f', b: '#7d838d', leaf: ['#3f8a3a', '#57a84a', '#2f7430'], trunk: '#6a4424', ground: ['#9aa0a8', '#6fbf55', '#fff2a8'], glow: '#ffd86b', banner: '#d8b24a', treasure: true },
  gatheringhall:  { band: ['pillar', 'beam', 'pillar', 'table', 'pillar', 'beam', 'pillar', 'barrels'], a: '#5a3c26', b: '#472e1c', ground: ['#6a4a30', '#8a6844', '#ffd890'], glow: '#ffb84a', banner: '#a8392e', treasure: true },
  reliquary:      { band: ['column', 'arch', 'tree', 'ruinwall', 'column', 'tree', 'arch', 'rock'], a: '#7f8f7a', b: '#6a7a66', leaf: ['#3a7a44', '#4f9a52', '#2a6236'], trunk: '#5a4428', ground: ['#8a9a86', '#5aa04a', '#d8ffb0'], glow: '#b8ff9a', banner: '#4f9a52', treasure: false },
  drownedsteps:   { band: ['rock', 'coral', 'arch', 'rock', 'coral', 'column', 'rock', 'coral'], a: '#4a6a7c', b: '#3c586a', coral: ['#ff8a8a', '#ffb070', '#c48aff'], ground: ['#5a7a8c', '#7fd6d0', '#bfefff'], glow: '#7fe9ff', banner: '#3aa6c4', treasure: false },
  coldkiln:       { band: ['chimney', 'ruinwall', 'chimney', 'rock', 'arch', 'chimney', 'ruinwall', 'chimney'], a: '#7a3a26', b: '#62301f', ground: ['#5a3020', '#3a2a26', '#ff9a4a'], glow: '#ff8a3a', banner: '#c4502a', treasure: true },
  hollowveil:     { band: ['arch', 'column', 'arch', 'shelf', 'arch', 'column', 'shelf', 'arch'], a: '#342a52', b: '#2a2144', ground: ['#3a3058', '#5a4a8a', '#c9b8ff'], glow: '#b9a2ff', banner: '#6a4ab8', treasure: true },
  lanternorchard: { band: ['lantree', 'fence', 'lantree', 'lantree', 'fence', 'lantree', 'rock', 'lantree'], a: '#5a4a3a', b: '#4a3c30', leaf: ['#4a5a8a', '#5a6aa0', '#3a4870'], trunk: '#4a3626', ground: ['#5a5a7a', '#7a7aa0', '#ffe9a0'], glow: '#ffd070', banner: '#e0b84a', treasure: true },
  windstair:      { band: ['cliff', 'column', 'cliff', 'arch', 'cliff', 'rock', 'cliff', 'column'], a: '#9aa8b4', b: '#8494a2', ground: ['#aab8c4', '#c8d8e0', '#e8fff8'], glow: '#bff4ff', banner: '#4ab8c4', treasure: true },
  resonancescar:  { band: ['shard', 'rock', 'shard', 'shard', 'arch', 'shard', 'rock', 'shard'], a: '#4a3a6a', b: '#3c2e58', ground: ['#5a4a7a', '#8a5ab0', '#ff9ede'], glow: '#ff8ad8', banner: '#b84a9a', treasure: true },
  heartwood:      { band: ['root', 'tree', 'root', 'rock', 'root', 'tree', 'root', 'tree'], a: '#4a3626', b: '#3a2a1e', leaf: ['#2a5a34', '#3a7444', '#1e4428'], trunk: '#3a2a1e', ground: ['#4a3a2a', '#3a6a3a', '#fff4c0'], glow: '#ffe9a0', banner: '#5a9a4a', treasure: true },
};
/* ------------------------------------------------------------------ Phase 18D: Verdant Wilds arena variations
   Each Verdant dungeon fights in its own variation of the Starter arena whose setting fits: the SAME geometry (the base
   build, block for block, so the same merged meshes and draw calls), recoloured through the island's palette (jungle
   greens, moss-grey stone, loam), with its own light rig, fog, particles, far backdrop colours and set dressing.
   Battery saver and Reduce motion apply exactly as for the base arenas. */
const hex2hsl = (h) => { const n = parseInt(h.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let hh = 0, ss = 0; if (mx !== mn) { const d = mx - mn; ss = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh /= 6; } return [hh * 360, ss, l]; };
const hsl2hex = (h, s2, l) => { h = ((h % 360) + 360) % 360 / 360; const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; let r, g, b; if (!s2) r = g = b = l; else { const q = l < 0.5 ? l * (1 + s2) : l + s2 - l * s2, p = 2 * l - q; r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3); } return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join(''); };
function verdantColour(c, tint, vivid) {
  if (typeof c !== 'string' || c[0] !== '#' || c.length !== 7) return c;
  let [h, s2, l] = hex2hsl(c);
  if (s2 < 0.16) { h = 110; s2 = Math.max(s2, 0.1); l = l * 0.94; }                    // grey stone → moss-grey stone
  else if (h >= 65 && h <= 165) { h = h + 14; s2 = Math.min(1, s2 * 1.05); l = l * 0.86; } // meadow green → deep jungle green
  else if (h >= 15 && h < 65 && l < 0.55) { s2 = s2 * 0.85; l = l * 0.9; }                // wood and earth → darker loam
  else if (vivid && s2 >= 0.35) { h = vivid.h; s2 = s2 * (vivid.s || 1); l = Math.min(0.92, l * (vivid.l || 1)); } // coral, crystal, banners → this place's own accent
  const out = hsl2hex(h, s2, l);
  if (!tint) return out;
  const a = parseInt(out.slice(1), 16), b = parseInt(tint.slice(1), 16), k = 0.16, mix = (sh) => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k);
  return '#' + [16, 8, 0].map((sh) => mix(sh).toString(16).padStart(2, '0')).join('');
}
function verdantKit(K, tint, vivid) {
  const m = (c) => verdantColour(c, tint, vivid), K2 = Object.create(K);
  K2.box = (c, ...a) => K.box(m(c), ...a);
  K2.stack = (a, b, ...rest) => K.stack(m(a), m(b), ...rest);
  K2.floor = (fn, ...rest) => K.floor((...q) => m(fn(...q)), ...rest);
  if (K.tree) K2.tree = (x, z, sc, l1, l2, o) => K.tree(x, z, sc, m(l1), m(l2), Object.assign({}, o, { trunk: m((o && o.trunk) || '#6a4424') }));
  if (K.tuft) K2.tuft = (x, z, c) => K.tuft(x, z, m(c));
  return K2;
}
const VARENA = {
  v_mossgate:   { base: 'forgottenroad', tint: '#3f9a4a', mood: 'day', fog: '#8cc4a0', motes: '#f4ffc0', light: { key: ['#f4ffe0', 2.3], rim: ['#d8ffd0', 1.5], hemi: ['#d0f0e0', '#4a6a3a', 1.25] }, particles: { kind: 'pollen', colors: ['#f4ffc0', '#d8ff9a', '#ffffff'], n: 30 }, backdrop: ['#2f7a44', '#6aa898'], dress: { a: '#8a9a88', b: '#76866f', leaf: ['#2f8f48', '#3fa858', '#26783c'], trunk: '#5a3c22' } },
  v_aqueduct:   { vivid: { h: 128, s: 0.8 }, base: 'drownedsteps', tint: '#3db4c4', mood: 'day', fog: '#8ad0d8', motes: '#e8fdff', light: { key: ['#effcff', 2.2], rim: ['#9ff0ff', 1.7], hemi: ['#c0f0f0', '#2a5a5a', 1.3] }, particles: { kind: 'bubbles', colors: ['#e8fdff', '#bff4ff', '#ffffff'], n: 26 }, backdrop: ['#2a6a6a', '#7ac8c8'], dress: { a: '#8a9a88', b: '#6e7e70', coral: ['#4fbf63', '#3fa858', '#9ad85a'] } },
  v_spore:      { vivid: { h: 48, s: 0.9 }, base: 'reliquary', tint: '#d8b860', mood: 'dusk', fog: '#3a4a2a', motes: '#ffe48a', light: { key: ['#fff0c0', 1.9], rim: ['#ffd86b', 1.8], hemi: ['#d8d0a0', '#2a3a1a', 1.1] }, particles: { kind: 'spores', colors: ['#ffe48a', '#ffd060', '#fff6c0'], n: 34 }, backdrop: ['#2a4a2a', '#8a8a4a'], dress: { leaf: ['#3f7a3a', '#5a8a3a', '#2a5a2a'] } },
  v_archive:    { base: 'gatheringhall', tint: '#3f9a4a', mood: 'dusk', fog: '#2a3a30', motes: '#ffe9b0', light: { key: ['#ffe8c0', 2.0], rim: ['#c8ffb0', 1.5], hemi: ['#b8c8a8', '#1a241a', 1.05] }, particles: { kind: 'dust', colors: ['#ffe9b0', '#e8ffd0', '#fff6e0'], n: 24 }, backdrop: ['#2a3a2a', '#5a6a4a'], dress: { a: '#4a3c2a', b: '#3a2e20', glow: '#ffd890', banner: '#3f9a4a' } },
  v_glow:       { base: 'coldkiln', tint: '#9ad85a', mood: 'dusk', fog: '#3a3020', motes: '#ffd25a', light: { key: ['#ffe0a0', 2.2], rim: ['#ffd25a', 1.9], hemi: ['#e8d0a0', '#2a2010', 1.1] }, particles: { kind: 'embers', colors: ['#ffd25a', '#d8ff7a', '#ffa43a'], n: 32 }, backdrop: ['#3a2a1a', '#6a5a2a'], dress: { a: '#6a5a3a', b: '#5a4a2e', glow: '#ffd25a' } },
  v_twinshrine: { base: 'lanternorchard', tint: '#c9a8ff', mood: 'dusk', fog: '#3a3450', motes: '#fff6c0', light: { key: ['#fff3d8', 2.1], rim: ['#c9a8ff', 2.0], hemi: ['#e8dcff', '#1e1a30', 1.15] }, particles: { kind: 'fireflies', colors: ['#fff6c0', '#c9a8ff', '#ffffff'], n: 26 }, backdrop: ['#2e2848', '#ece6d6'], dress: { leaf: ['#3a7a5a', '#4a8a6a', '#2a5a44'] } },
  v_canopy:     { base: 'windstair', tint: '#4fbf63', mood: 'day', fog: '#a8e0c8', motes: '#ffffff', light: { key: ['#ffffff', 2.4], rim: ['#d8ffe8', 1.5], hemi: ['#e0fff0', '#5a7a5a', 1.35] }, particles: { kind: 'leaves', colors: ['#7ad44a', '#4fbf63', '#d8ff9a'], n: 26 }, backdrop: ['#2f8f48', '#bfe8d0'], dress: { a: '#6a5a3a', b: '#5a4a2e' } },
  v_moonwell:   { vivid: { h: 252, s: 0.75, l: 1.05 }, base: 'drownedsteps', tint: '#5a6ad8', mood: 'dark', fog: '#1a2040', motes: '#e2d4ff', light: { key: ['#dcd8ff', 1.8], rim: ['#b8a8ff', 1.9], hemi: ['#8a8ad8', '#0e1024', 1.0] }, particles: { kind: 'wisps', colors: ['#e2d4ff', '#bfe0ff', '#ffffff'], n: 22 }, backdrop: ['#141a30', '#3a4a8a'], dress: { a: '#3a4458', b: '#2c3446', coral: ['#9a8aff', '#7aa8ff', '#e2d4ff'], glow: '#c9b8ff' } },
  v_choir:      { vivid: { h: 160, s: 0.45, l: 1.25 }, base: 'resonancescar', tint: '#e8fff0', mood: 'dusk', fog: '#4a4a6a', motes: '#e8fff0', light: { key: ['#f4f0ff', 2.0], rim: ['#e8fff0', 1.9], hemi: ['#d8d0f0', '#2a2440', 1.15] }, particles: { kind: 'glitter', colors: ['#e8fff0', '#cfe8ff', '#ffd0f0'], n: 26 }, backdrop: ['#3a3458', '#8a84a8'], dress: { a: '#dcd8e8', b: '#c4c0d4', glow: '#e8fff0' } },
  v_elderroot:  { base: 'heartwood', tint: '#2f8f48', mood: 'dark', fog: '#10201a', motes: '#9af2ff', light: { key: ['#e0ffe8', 1.8], rim: ['#9af2ff', 1.9], hemi: ['#98d0b0', '#0a140e', 1.0] }, particles: { kind: 'fireflies', colors: ['#9af2ff', '#d8ffb0', '#bff7a8'], n: 28 }, backdrop: ['#10261a', '#2f6a44'], dress: { leaf: ['#1e5a30', '#2f7a44', '#164024'] } },
};
Object.keys(VARENA).forEach((id) => {
  const v = VARENA[id], b = ARENAS[v.base];
  ARENAS[id] = Object.assign({}, b, { mood: v.mood, fog: v.fog, motes: v.motes, verdant: true, build(add, T, r, K, o) { return b.build.call(this, add, T, r, verdantKit(K, v.tint, v.vivid), o); } });
  const at = ATMOS[v.base] || {};
  ATMOS[id] = Object.assign({}, at, { light: v.light, particles: v.particles, fog: at.fog, shafts: at.shafts ? Object.assign({}, at.shafts, { color: verdantColour(at.shafts.color, v.tint) }) : null, backdrop: at.backdrop ? Object.assign({}, at.backdrop, { colors: v.backdrop }) : null });
  const dd = DRESS[v.base]; if (dd) DRESS[id] = Object.assign({}, dd, { ground: (dd.ground || []).map((c) => verdantColour(c, v.tint, v.vivid)), leaf: dd.leaf ? dd.leaf.map((c) => verdantColour(c, v.tint, v.vivid)) : dd.leaf }, v.dress);
  delete ALIAS[id];
});
export const verdantArenas = () => Object.keys(VARENA).map((id) => ({ id, base: VARENA[id].base }));
/* Phase 19C: Obsidian Reach's ten arenas, recoloured from the existing arenas the same way (no new geometry, so every
   quality tier, Battery Saver and Reduce Motion behave exactly as before). Grey stone becomes violet basalt, greens become
   ash, wood and earth go darker, and each place's accent (crystal, glass, ember, forge light) replaces the bright tones. */
function obsidianColour(c, tint, vivid) {
  if (typeof c !== 'string' || c[0] !== '#' || c.length !== 7) return c;
  let [h, s2, l] = hex2hsl(c);
  if (s2 < 0.16) { h = 268; s2 = Math.max(s2, 0.1); l = l * 0.72; }                         // grey stone → violet basalt
  else if (h >= 65 && h <= 175) { h = 285; s2 = s2 * 0.22; l = Math.min(0.62, l * 0.92); }   // greens → violet ash
  else if (h >= 15 && h < 65 && l < 0.55) { s2 = s2 * 0.7; l = l * 0.72; }                    // wood and earth → scorched
  else if (vivid && s2 >= 0.35) { h = vivid.h; s2 = Math.min(1, s2 * (vivid.s || 1)); l = Math.min(0.9, l * (vivid.l || 1)); } // accent
  const out = hsl2hex(h, s2, l);
  if (!tint) return out;
  const a = parseInt(out.slice(1), 16), b = parseInt(tint.slice(1), 16), k = 0.18, mix = (sh) => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k);
  return '#' + [16, 8, 0].map((sh) => mix(sh).toString(16).padStart(2, '0')).join('');
}
function obsidianKit(K, tint, vivid) {
  const m = (c) => obsidianColour(c, tint, vivid), K2 = Object.create(K);
  K2.box = (c, ...a) => K.box(m(c), ...a);
  K2.stack = (a, b, ...rest) => K.stack(m(a), m(b), ...rest);
  K2.floor = (fn, ...rest) => K.floor((...q) => m(fn(...q)), ...rest);
  if (K.tree) K2.tree = (x, z, sc, l1, l2, o) => K.tree(x, z, sc, m(l1), m(l2), Object.assign({}, o, { trunk: m((o && o.trunk) || '#6a4424') }));
  if (K.tuft) K2.tuft = (x, z, c) => K.tuft(x, z, m(c));
  return K2;
}
const OARENA = {
  o_cinder:  { base: 'forgottenroad', vivid: { h: 22, s: 1.1 }, tint: '#ff8a3a', mood: 'dusk', fog: '#4a3a40', motes: '#ffd27a', light: { key: ['#ffd8b0', 2.0], rim: ['#ff9a5a', 1.8], hemi: ['#c8a8a8', '#1a1420', 1.05] }, particles: { kind: 'embers', colors: ['#ff8a3a', '#ffd27a', '#ffb05a'], n: 30 }, backdrop: ['#2a2232', '#8a5a4a'] },
  o_kilns:   { base: 'coldkiln', vivid: { h: 28, s: 1.1 }, tint: '#ffb05a', mood: 'dusk', fog: '#3a2a2a', motes: '#ffd27a', light: { key: ['#ffe0b8', 2.1], rim: ['#ffb05a', 1.9], hemi: ['#d8b8a0', '#1a1214', 1.05] }, particles: { kind: 'embers', colors: ['#ffb05a', '#ffe8c0', '#ff8a3a'], n: 30 }, backdrop: ['#2a1e22', '#a06a4a'] },
  o_rookery: { base: 'windstair', vivid: { h: 18, s: 1.0 }, tint: '#c8a0a8', mood: 'dusk', fog: '#6a5a6a', motes: '#ffe0c0', light: { key: ['#ffe8d8', 2.2], rim: ['#ffb898', 1.7], hemi: ['#d8c0c8', '#2a2030', 1.2] }, particles: { kind: 'embers', colors: ['#ffe0c0', '#ff9a5a', '#ffffff'], n: 24 }, backdrop: ['#3a3048', '#c0a0a8'] },
  o_quench:  { base: 'drownedsteps', vivid: { h: 200, s: 0.8 }, tint: '#6a9ac0', mood: 'dark', fog: '#2a3a4a', motes: '#dff4ff', light: { key: ['#e0f0ff', 1.9], rim: ['#9ad0ff', 1.8], hemi: ['#a8c0d8', '#10161e', 1.05] }, particles: { kind: 'bubbles', colors: ['#dff4ff', '#bfe0ff', '#ffffff'], n: 26 }, backdrop: ['#1a2a3a', '#5a7a9a'] },
  o_seams:   { base: 'hollowveil', vivid: { h: 268, s: 0.7 }, tint: '#4a3a5a', mood: 'dark', fog: '#14101c', motes: '#c8b8e8', light: { key: ['#d8d0f0', 1.6], rim: ['#a898d8', 1.7], hemi: ['#8a80a8', '#08060c', 0.9] }, particles: { kind: 'dust', colors: ['#c8b8e8', '#8a80a8', '#e8e0ff'], n: 20 }, backdrop: ['#0e0c14', '#3a3048'] },
  o_gallery: { base: 'gatheringhall', vivid: { h: 262, s: 0.9 }, tint: '#c9a8ff', mood: 'dark', fog: '#1e1a2c', motes: '#e8e0ff', light: { key: ['#f0e8ff', 1.8], rim: ['#c9a8ff', 2.0], hemi: ['#b0a8d0', '#100c18', 1.0] }, particles: { kind: 'glitter', colors: ['#e8e0ff', '#c9a8ff', '#a8d8e8'], n: 24 }, backdrop: ['#14101e', '#4a3a6a'] },
  o_hollows: { base: 'resonancescar', vivid: { h: 318, s: 1.1, l: 1.05 }, tint: '#e64ab8', mood: 'dark', fog: '#2a1a30', motes: '#ff8ad8', light: { key: ['#ffd8f0', 1.8], rim: ['#ff8ad8', 2.1], hemi: ['#c8a0c0', '#14081a', 1.0] }, particles: { kind: 'glitter', colors: ['#ff8ad8', '#e64ab8', '#fff0a8'], n: 30 }, backdrop: ['#1e1426', '#7a2a6a'] },
  o_orchard: { base: 'lanternorchard', vivid: { h: 318, s: 1.0 }, tint: '#a89aa0', mood: 'dusk', fog: '#5a5060', motes: '#d8d0e0', light: { key: ['#f0e8f0', 2.0], rim: ['#ff9ad8', 1.6], hemi: ['#c8c0c8', '#2a2430', 1.15] }, particles: { kind: 'leaves', colors: ['#9a94a0', '#e64ab8', '#d8d0e0'], n: 26 }, backdrop: ['#3a3444', '#a89aa0'] },
  o_bellows: { base: 'reliquary', vivid: { h: 24, s: 1.0 }, tint: '#8a5a3a', mood: 'dusk', fog: '#3a2a28', motes: '#ffe0c0', light: { key: ['#ffe0c8', 2.0], rim: ['#ff9a5a', 1.8], hemi: ['#c8a898', '#1a1210', 1.05] }, particles: { kind: 'dust', colors: ['#ffe0c0', '#c8a080', '#ff9a5a'], n: 24 }, backdrop: ['#2a1e1c', '#8a5a3a'] },
  o_forge:   { base: 'heartwood', vivid: { h: 26, s: 1.15, l: 1.05 }, tint: '#ff7a3a', mood: 'dark', fog: '#1a0e0c', motes: '#ffd27a', light: { key: ['#ffd8b0', 1.9], rim: ['#ff8a3a', 2.2], hemi: ['#c09080', '#0c0606', 1.0] }, particles: { kind: 'embers', colors: ['#ff8a3a', '#ffd27a', '#ffffff'], n: 34 }, backdrop: ['#140a0a', '#6a2a14'] },
};
/* Phase 19D: each Obsidian arena also gets a little of the forge's own furniture on its back line and outer edges,
   beyond the recolour: basalt pillars, a kiln with a lit mouth, glass panes on iron frames, forge machinery (a gear and
   a piston), and bars cooling from orange to iron. Plain boxes join the arena's one shared vertex-coloured mesh; every
   glow in an arena uses that arena's single glow colour, so each arena adds at most one merged glow mesh and one small
   animated mesh (a kiln mouth or a piston). The animation stops under Reduce Motion like everything else, and the
   pieces stand in front of the base arenas' back walls (z -3.0 to -3.6) and outside both fighters' silhouettes
   (x <= -3.8 left of the player, x >= 2.9 right of the foe; only low pieces between them), above the action buttons. */
const OKIT = {
  pillar(K, x, z, h) { K.stack('#2f2838', '#3e3446', x, z, h, 0.42); K.box('#8a8090', x, h * 0.42, z, 0.46, 0.06, 0.46); },
  kiln(K, x, z, g, animate) { K.box('#5e423f', x, 0, z, 1.0, 0.9, 0.8); K.box('#6a4a48', x, 0.9, z, 0.7, 0.35, 0.6); K.box('#523a38', x, 1.25, z, 0.3, 0.9, 0.3);
    K.box(g, x, 0.18, z + 0.41, 0.42, 0.34, 0.04, { e: g, ei: 1.4, spin: animate ? 'flicker' : undefined }); },
  panes(K, x, z, n, g) { for (let i = 0; i < n; i++) { const px = x + i * 0.55; K.box('#4e444c', px, 0, z, 0.06, 1.6, 0.06); K.box(i % 2 ? '#9fd8e8' : '#b8e6f0', px + 0.27, 0.3, z, 0.44, 1.1, 0.04); }
    K.box('#4e444c', x + n * 0.55, 0, z, 0.06, 1.6, 0.06); K.box(g, x + 0.27, 1.0, z + 0.03, 0.1, 0.1, 0.02, { e: g, ei: 1.4 }); },
  gear(K, x, z) { for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; K.box(i % 2 ? '#5a4e56' : '#66585f', x + Math.cos(t) * 0.55, 0.75 + Math.sin(t) * 0.55, z, 0.2, 0.2, 0.14); } K.box('#a8603a', x, 0.66, z, 0.22, 0.22, 0.16); K.box('#4e444c', x, 0, z - 0.08, 0.12, 0.7, 0.08); },
  piston(K, x, z, g, animate) { K.box('#4e444c', x, 0, z, 0.5, 0.25, 0.5); K.box('#5a4e56', x, 0.25, z, 0.16, 1.6, 0.16); K.box('#66585f', x, 1.0, z, 0.3, 0.3, 0.3, animate ? { spin: 'piston', e: '#000000' } : {}); K.box(g, x, 1.86, z, 0.12, 0.08, 0.12, { e: g, ei: 1.4 }); },
  bars(K, x, z, g) { [g, '#ff7a3a', '#b44a2a', '#6a3a32', '#4e444c'].forEach((c, i) => K.box(c, x + i * 0.22, 0.32, z, 0.14, 0.08, 0.6, i ? undefined : { e: g, ei: 1.4 })); K.box('#4e444c', x - 0.1, 0, z, 0.06, 0.32, 0.6); K.box('#4e444c', x + 1.0, 0, z, 0.06, 0.32, 0.6); },
  shards(K, x, z) { [[0, 0, 0.9, 0.2], [0.25, 0.15, 0.6, -0.25], [-0.2, 0.2, 0.5, 0.3]].forEach(([dx, dz, h, rz]) => K.box('#221a30', x + dx, 0, z + dz, 0.16, h, 0.12, { rz })); K.box('#6a5a9a', x, 0.7, z + 0.07, 0.08, 0.08, 0.02); },
};
// what each arena is furnished with (left-to-right on the back line, then the edges)
const OFURN = {
  o_cinder:  (K, g, a) => { OKIT.pillar(K, -4.4, -3.2, 4); OKIT.shards(K, 3.4, -3.0); OKIT.kiln(K, 4.2, -3.6, g, a); },
  o_kilns:   (K, g, a) => { OKIT.kiln(K, -4.2, -3.4, g, a); OKIT.kiln(K, 3.6, -3.4, g, false); OKIT.bars(K, -0.4, -3.6, g); },
  o_rookery: (K, g, a) => { OKIT.pillar(K, -4.4, -3.2, 6); OKIT.pillar(K, 3.8, -3.4, 5); OKIT.shards(K, 0.0, -3.6); },
  o_quench:  (K, g, a) => { OKIT.piston(K, -4.2, -3.2, g, a); OKIT.bars(K, 2.9, -3.4, g); OKIT.pillar(K, 4.4, -3.2, 3); },
  o_seams:   (K, g, a) => { OKIT.pillar(K, -4.4, -3.2, 5); OKIT.shards(K, 3.4, -3.2); OKIT.shards(K, 0.0, -3.6); OKIT.gear(K, 4.2, -3.6); },
  o_gallery: (K, g, a) => { OKIT.panes(K, -4.8, -3.4, 2, g); OKIT.panes(K, 3.0, -3.6, 3, g); OKIT.shards(K, -0.2, -3.6); },
  o_hollows: (K, g, a) => { OKIT.shards(K, -4.0, -3.0); OKIT.shards(K, 3.2, -3.0); OKIT.pillar(K, -4.6, -3.6, 4); OKIT.pillar(K, 4.2, -3.6, 6); },
  o_orchard: (K, g, a) => { OKIT.pillar(K, -4.4, -3.4, 3); OKIT.kiln(K, 3.8, -3.4, g, a); },
  o_bellows: (K, g, a) => { OKIT.piston(K, -4.2, -3.2, g, a); OKIT.piston(K, 4.2, -3.4, g, false); OKIT.gear(K, 3.2, -3.6); OKIT.bars(K, -0.5, -3.6, g); },
  o_forge:   (K, g, a) => { OKIT.kiln(K, -4.2, -3.4, g, a); OKIT.gear(K, 3.4, -3.6); OKIT.piston(K, 4.4, -3.2, g, false); OKIT.bars(K, -0.5, -3.6, g); },
};
const OGLOW = { o_cinder: '#ff8a3a', o_kilns: '#ffb05a', o_rookery: '#ff9a5a', o_quench: '#5ab8e8', o_seams: '#b8c4d4', o_gallery: '#b89aff', o_hollows: '#ff6ad0', o_orchard: '#ff6ad0', o_bellows: '#ff9a5a', o_forge: '#ff7a3a' };
Object.keys(OARENA).forEach((id) => {
  const v = OARENA[id], b = ARENAS[v.base];
  ARENAS[id] = Object.assign({}, b, { mood: v.mood, fog: v.fog, motes: v.motes, obsidian: true, build(add, T, r, K, o) {
    // Phase 19D: some base arenas (the Great Bellows' reliquary) make their floor, pillars and moss from their own
    // materials, not the kit, so the 19C recolour never reached them and the Bellows stayed bright green. Those
    // materials are recoloured here too (the kit's own materials are tagged and already recoloured; a textured floor
    // gets a violet-ash multiplier, since its texture can't be re-hued).
    const done = new Set(), fix = (mat) => { if (!mat || done.has(mat) || (mat.userData && (mat.userData.kit || mat.userData.vcol))) return; done.add(mat);
      if (mat.map) mat.color.set('#b08aa8'); else if (mat.color) mat.color.set(obsidianColour('#' + mat.color.getHexString(), v.tint, v.vivid));
      if (mat.emissive && mat.emissive.getHex()) mat.emissive.set(obsidianColour('#' + mat.emissive.getHexString(), v.tint, v.vivid)); };
    const addO = (mesh, p) => { if (mesh && mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(fix); return add(mesh, p); };
    const out = b.build.call(this, addO, T, r, obsidianKit(K, v.tint, v.vivid), o);
    if (OFURN[id]) OFURN[id](K, OGLOW[id], !(o && o.still && o.still()));
    return out;
  } });
  const at = ATMOS[v.base] || {};
  ATMOS[id] = Object.assign({}, at, { light: v.light, particles: v.particles, fog: at.fog, shafts: at.shafts ? Object.assign({}, at.shafts, { color: obsidianColour(at.shafts.color, v.tint) }) : null, backdrop: at.backdrop ? Object.assign({}, at.backdrop, { colors: v.backdrop }) : null });
  const dd = DRESS[v.base]; if (dd) DRESS[id] = Object.assign({}, dd, { ground: (dd.ground || []).map((c) => obsidianColour(c, v.tint, v.vivid)), leaf: dd.leaf ? dd.leaf.map((c) => obsidianColour(c, v.tint, v.vivid)) : dd.leaf }, dd.a ? { a: obsidianColour(dd.a, v.tint, v.vivid) } : {}, dd.b ? { b: obsidianColour(dd.b, v.tint, v.vivid) } : {}, dd.glow ? { glow: obsidianColour(dd.glow, v.tint, v.vivid) } : {});
  delete ALIAS[id];
});
export const obsidianArenas = () => Object.keys(OARENA).map((id) => ({ id, base: OARENA[id].base }));


function dress(K, r, key, def, o) {
  const d = DRESS[key]; if (!d) return 0;
  const fog = new THREE.Color(def.fog || '#808080'), tmp = new THREE.Color(); let n = 0;
  // colours sink toward the arena's fog with distance, which is what separates the layers
  const far = (c, t) => '#' + tmp.set(c).lerp(fog, t).getHexString();
  const B = (c, x, y, z, w, h, dd, opt) => { n++; return K.box(c, x, y, z, w, h, dd, opt); };
  const pick = (a) => a[Math.floor(r() * a.length)];
  const P = {
    column(x, z, s, t) { const h = 3 + Math.floor(r() * 4), broken = r() < 0.45; for (let i = 0; i < h; i++) B(far(i % 2 ? d.a : d.b, t), x + (r() - 0.5) * 0.04, i * 0.5 * s, z, 0.52 * s, 0.5 * s, 0.52 * s); B(far(d.b, t), x, 0, z, 0.8 * s, 0.18 * s, 0.8 * s); if (!broken) B(far(d.a, t), x, h * 0.5 * s, z, 0.78 * s, 0.2 * s, 0.78 * s); else B(far(d.a, t), x + 0.7 * s, 0, z + 0.3, 0.5 * s, 0.4 * s, 0.9 * s, { ry: 0.5 }); },
    pillar(x, z, s, t) { for (let i = 0; i < 9; i++) B(far(i % 3 ? d.a : d.b, t), x, i * 0.5 * s, z, 0.5 * s, 0.5 * s, 0.5 * s); B(far(d.b, t), x, 0, z, 0.8 * s, 0.3 * s, 0.8 * s); B(far(d.b, t), x, 4.3 * s, z, 1.3 * s, 0.26 * s, 0.6 * s); B(d.glow, x, 2.1 * s, z + 0.3 * s, 0.2 * s, 0.26 * s, 0.14 * s, { e: d.glow, ei: 1.5 }); },
    beam(x, z, s, t) { B(far(d.b, t), x, 4.0 * s, z, 2.6 * s, 0.3 * s, 0.4 * s); B(far(d.banner, t * 0.6), x, 2.6 * s, z + 0.05, 0.7 * s, 1.4 * s, 0.06); B(far(d.glow, t * 0.5), x, 3.0 * s, z + 0.1, 0.3 * s, 0.3 * s, 0.03); },
    arch(x, z, s, t) { const h = 5 + Math.floor(r() * 2); [-0.9, 0.9].forEach((dx) => { for (let i = 0; i < h; i++) B(far(i % 2 ? d.a : d.b, t), x + dx * s, i * 0.5 * s, z, 0.5 * s, 0.5 * s, 0.5 * s); }); B(far(d.a, t), x, h * 0.5 * s, z, 2.5 * s, 0.4 * s, 0.56 * s); B(far(d.b, t), x, (h * 0.5 + 0.4) * s, z, 1.3 * s, 0.3 * s, 0.5 * s); B(far(d.b, t), x - 0.5 * s, (h * 0.5 - 0.3) * s, z, 0.3 * s, 0.3 * s, 0.5 * s); B(far(d.b, t), x + 0.5 * s, (h * 0.5 - 0.3) * s, z, 0.3 * s, 0.3 * s, 0.5 * s); },
    ruinwall(x, z, s, t) { for (let i = -2; i <= 2; i++) { const h = 1 + Math.floor(r() * 3) + (Math.abs(i) === 2 ? 1 : 0); for (let j = 0; j < h; j++) if (r() > 0.08) B(far((i + j) % 2 ? d.a : d.b, t), x + i * 0.52 * s + (j % 2) * 0.12, j * 0.42 * s, z, 0.5 * s, 0.42 * s, 0.46 * s); } B(far(d.b, t), x + 1.7 * s, 0, z + 0.5, 0.5 * s, 0.3 * s, 0.4 * s, { ry: 0.7 }); },
    rock(x, z, s, t) { B(far(d.b, t), x, 0, z, 1.5 * s, 0.6 * s, 1.1 * s); B(far(d.a, t), x + 0.15 * s, 0.6 * s, z, 1.0 * s, 0.5 * s, 0.8 * s); B(far(d.b, t), x - 0.1 * s, 1.1 * s, z, 0.5 * s, 0.35 * s, 0.45 * s); B(far(d.a, t), x + 1.0 * s, 0, z + 0.2, 0.5 * s, 0.35 * s, 0.5 * s); },
    cliff(x, z, s, t) { const h = 4 + Math.floor(r() * 4); for (let i = 0; i < h; i++) B(far(i % 2 ? d.a : d.b, t), x + (r() - 0.5) * 0.5, i * 0.7 * s, z, (2.2 - i * 0.18) * s, 0.7 * s, 1.2 * s); B(far('#ffffff', t + 0.2), x, h * 0.7 * s, z, 0.9 * s, 0.14 * s, 0.8 * s); },
    tree(x, z, s, t) { const L = d.leaf, tr = far(d.trunk, t); B(tr, x, 0, z, 0.34 * s, 1.5 * s, 0.34 * s); B(far(L[0], t), x, 1.2 * s, z, 1.7 * s, 0.7 * s, 1.5 * s); B(far(L[1], t), x - 0.25 * s, 1.8 * s, z, 1.3 * s, 0.6 * s, 1.2 * s); B(far(L[2], t), x + 0.5 * s, 1.5 * s, z + 0.2, 0.8 * s, 0.6 * s, 0.9 * s); B(far(L[1], t), x + 0.1 * s, 2.35 * s, z, 0.8 * s, 0.45 * s, 0.8 * s); B(far(L[0], t), x, 2.75 * s, z, 0.4 * s, 0.3 * s, 0.4 * s); },
    lantree(x, z, s, t) { P.tree(x, z, s, t); [[-0.6, 1.3], [0.7, 1.6], [0.1, 1.05]].forEach(([dx, dy]) => B(d.glow, x + dx * s, dy * s, z + 0.6 * s, 0.16 * s, 0.22 * s, 0.16 * s, { e: d.glow, ei: 1.5 })); },
    fence(x, z, s, t) { for (let i = -2; i <= 2; i++) B(far(d.a, t), x + i * 0.6 * s, 0, z, 0.12 * s, 0.7 * s, 0.12 * s); B(far(d.b, t), x, 0.45 * s, z, 2.6 * s, 0.1 * s, 0.08 * s); B(far(d.b, t), x, 0.2 * s, z, 2.6 * s, 0.1 * s, 0.08 * s); },
    table(x, z, s, t) { B(far(d.a, t), x, 0.5 * s, z, 2.4 * s, 0.14 * s, 0.9 * s); [-1, 1].forEach((k) => B(far(d.b, t), x + k * 1.0 * s, 0, z, 0.16 * s, 0.5 * s, 0.7 * s)); B(far('#e8dcc0', t), x - 0.5 * s, 0.64 * s, z, 0.3 * s, 0.06 * s, 0.3 * s); B(d.glow, x + 0.4 * s, 0.64 * s, z, 0.12 * s, 0.3 * s, 0.12 * s, { e: d.glow, ei: 1.5 }); },
    barrels(x, z, s, t) { [[0, 0, 0], [0.7, 0, 0.1], [0.35, 0.7, 0.05]].forEach(([dx, dy, dz]) => { B(far(d.a, t), x + dx * s, dy * s, z + dz, 0.6 * s, 0.7 * s, 0.6 * s); B(far('#8a8a90', t), x + dx * s, (dy + 0.25) * s, z + dz, 0.64 * s, 0.08 * s, 0.64 * s); }); },
    shelf(x, z, s, t) { B(far(d.b, t), x, 0, z, 1.8 * s, 3.2 * s, 0.4 * s); for (let j = 0; j < 4; j++) for (let i = -2; i <= 2; i++) if (r() > 0.2) B(far(pick(['#7a4a8a', '#4a6a9a', '#9a8a5a', '#8a4a5a']), t), x + i * 0.3 * s, (0.3 + j * 0.75) * s, z + 0.2 * s, 0.22 * s, (0.4 + r() * 0.2) * s, 0.1 * s); },
    chimney(x, z, s, t) { const h = 6 + Math.floor(r() * 4); for (let i = 0; i < h; i++) B(far(i % 3 === 2 ? '#3a2a26' : i % 2 ? d.a : d.b, t), x, i * 0.5 * s, z, (0.9 - i * 0.03) * s, 0.5 * s, (0.9 - i * 0.03) * s); B(far('#3a2a26', t), x, h * 0.5 * s, z, 0.9 * s, 0.2 * s, 0.9 * s); B(d.glow, x, 0.5 * s, z + 0.46 * s, 0.4 * s, 0.4 * s, 0.04, { e: d.glow, ei: 1.5 }); },
    shard(x, z, s, t) { const h = 2.4 + r() * 2.6, tilt = (r() - 0.5) * 0.5; B(far(d.a, t), x, 0, z, 0.7 * s, h * s, 0.6 * s, { rz: tilt }); B(far(d.b, t), x + 0.5 * s, 0, z + 0.2, 0.4 * s, h * 0.55 * s, 0.4 * s, { rz: tilt - 0.2 }); B(d.glow, x - Math.sin(tilt) * h * s, h * s * Math.cos(tilt), z, 0.34 * s, 0.4 * s, 0.3 * s, { e: d.glow, ei: 1.5 }); },
    coral(x, z, s, t) { const c = d.coral; for (let i = 0; i < 5; i++) { const cc = far(pick(c), t), bx = x + (r() - 0.5) * 1.4 * s, h = (0.6 + r() * 1.2) * s; B(cc, bx, 0, z + (r() - 0.5) * 0.5, 0.2 * s, h, 0.2 * s); B(cc, bx + 0.22 * s, h * 0.5, z, 0.3 * s, 0.16 * s, 0.16 * s); B(cc, bx + 0.36 * s, h * 0.5, z, 0.14 * s, 0.5 * s, 0.14 * s); } B(far(d.b, t), x, 0, z, 1.6 * s, 0.3 * s, 0.9 * s); },
    root(x, z, s, t) { for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; B(far(i % 2 ? d.a : d.b, t), x - Math.cos(a) * 1.6 * s, Math.sin(a) * 2.2 * s, z, 0.6 * s, 0.55 * s, 0.6 * s); } B(far(d.b, t), x - 1.6 * s, 0, z, 0.9 * s, 0.5 * s, 0.9 * s); B(far(d.b, t), x + 1.6 * s, 0, z, 0.9 * s, 0.5 * s, 0.9 * s); B(d.glow, x, 1.5 * s, z, 0.16 * s, 0.2 * s, 0.16 * s, { e: d.glow, ei: 1.5 }); },
  };
  // the band: a near row just past the floor's back edge and a larger, hazier row behind it; two flanking pieces
  d.band.forEach((k, i) => { const x = -8.2 + i * 2.35 + (r() - 0.5) * 0.7; if (o.boss && Math.abs(x - 0.8) < 3.2) return; P[k](x, -5.5 - r() * 0.5, 1.05, 0.14); });
  d.band.forEach((k, i) => { const kk = d.band[(i + 3) % d.band.length]; P[kk](-9.6 + i * 2.75 + (r() - 0.5) * 0.9, -8.6 - r() * 0.8, 1.35, 0.42); });
  P[d.band[0]](-6.6, -3.0, 1, 0.06); P[d.band[2]](6.8, -3.3, 1, 0.06); P[d.band[3]](-7.6, -0.6, 0.9, 0.1); P[d.band[1] === 'beam' ? d.band[0] : d.band[1]](7.8, -1.0, 0.9, 0.1);
  // ground details at the edges of the floor (never in the fighters' lane)
  for (let i = 0; i < 34; i++) { const a = r() * Math.PI * 2, rad = 0.72 + r() * 0.26, x = Math.cos(a) * 6.4 * rad, z = Math.sin(a) * 4.8 * rad - 1; if (Math.abs(x) < 3.3 && z > -3.2) continue; const c = d.ground[i % 3 === 2 ? 2 : i % 2], sz = 0.1 + r() * 0.16; B(c, x, 0, z, sz, i % 3 === 2 ? 0.06 : sz * (0.5 + r()), sz); }
  if (o.boss) {
    // the boss's ground: a low stone frame with glowing corner studs
    const bx = 0.8, bz = -1.6, w = 3.5, dd = 2.5;
    [[0, -dd / 2, w, 0.16], [0, dd / 2, w, 0.16], [-w / 2, 0, 0.16, dd], [w / 2, 0, 0.16, dd]].forEach(([dx, dz, sx, sz]) => B(d.b, bx + dx, 0, bz + dz, sx, 0.07, sz));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => { B(d.a, bx + i * w / 2, 0, bz + j * dd / 2, 0.3, 0.2, 0.3); B(d.glow, bx + i * w / 2, 0.2, bz + j * dd / 2, 0.16, 0.1, 0.16, { e: d.glow, ei: 1.5 }); });
    // braziers in the place's own light, and banners
    [[-2.3, -3.3], [4.0, -3.3]].forEach(([x, z], i) => { B(d.b, x, 0, z, 0.6, 0.3, 0.6); B(d.a, x, 0.3, z, 0.32, 0.9, 0.32); B(d.b, x, 1.2, z, 0.7, 0.18, 0.7); K.box(d.glow, x, 1.38, z, 0.4, 0.34, 0.4, { e: d.glow, ei: 1.5, spin: i ? null : 'flicker' }); n++; });
    [[-4.2, -5.2], [5.8, -5.2]].forEach(([x, z]) => { B(d.b, x, 0, z, 0.14, 3.4, 0.14); B(d.banner, x + 0.42, 1.9, z, 0.7, 1.4, 0.05); B(d.glow, x + 0.42, 2.5, z + 0.04, 0.26, 0.26, 0.03, { e: d.glow, ei: 1.5 }); B(d.banner, x + 0.42, 1.7, z, 0.34, 0.2, 0.05); });
    // what the boss has been keeping: an old chest, spilled coins, a fallen column
    if (d.treasure) { const tx = 5.0, tz = -2.4; B('#6a4424', tx, 0, tz, 0.8, 0.44, 0.52); B('#8a5a30', tx, 0.44, tz - 0.06, 0.8, 0.2, 0.4, { rx: -0.35 }); B('#e8c04a', tx, 0.16, tz + 0.27, 0.84, 0.08, 0.02); B('#e8c04a', tx, 0.3, tz + 0.27, 0.14, 0.14, 0.03);
      for (let i = 0; i < 9; i++) B(i % 3 ? '#ffd86b' : '#fff0a8', tx - 0.2 + (r() - 0.3) * 1.3, 0, tz + 0.5 + r() * 0.6, 0.1, 0.04, 0.1);
      B(d.a, tx + 0.9, 0, tz - 0.9, 0.5, 0.5, 1.7, { ry: 0.5 }); B(d.b, tx + 0.2, 0, tz - 1.2, 0.6, 0.3, 0.6); }
  }
  return n;
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
  const dressed = dress(K, rnd(key.length * 131 + (o.boss ? 5 : 3)), key, def, o); // Phase 14 (own random stream: the arena's own build is unchanged)
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
    atmo: { tier, backdropLayers: bd.length, particles: AT.particles ? AT.particles.kind : null, count: amb ? amb.mesh.count : 0, shafts: sh ? Math.min(AT.shafts.n, shMax) : 0, backdrop: AT.backdrop ? AT.backdrop.kind : null, boss: !!o.boss, island: !!o.island, dressed },
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
        else if (a.kind === 'piston') m.position.y = a.y0 + (Math.sin(t * 1.3 + a.ph) * 0.5 + 0.5) * 0.45;      // Phase 19D: a forge piston
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
