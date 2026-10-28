/* Aminas — 3D battle arenas (ES module). One low-poly environment per dungeon, built from shared primitives.
   Everything an arena creates is tracked so dispose() can free its GPU resources when the battle ends. */
import { THREE } from './creature3d.js';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/BufferGeometryUtils.js/+esm';

function tracker() {
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
const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

export const ARENAS = {
  // The Overgrown Reliquary: mossy flagstones, broken pillars wrapped in vines, glowing roots, drifting spores.
  reliquary: { sky: 'reliquary', mood: 'day', fog: '#3f7a5a', build(add, T, r) {
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
  } },
  // The Hollow Veil: ink-dark floor, standing arches, candle stubs and pages that drift in the air.
  hollowveil: { sky: 'hollowveil', mood: 'dark', fog: '#1a1430', build(add, T, r) {
    add(new THREE.Mesh(T.g(new THREE.CircleGeometry(6.5, 48)), T.m(new THREE.MeshStandardMaterial({ map: T.t(radialTexture([[0, '#4a3a6a'], [0.6, '#2a2040'], [1, '#120c20']])), roughness: 0.85 }))), { rx: -Math.PI / 2 });
    const arch = T.m(new THREE.MeshStandardMaterial({ color: '#5a4a72', roughness: 0.7 })), wax = T.m(new THREE.MeshStandardMaterial({ color: '#efe6d0', roughness: 0.6 }));
    const flame = T.m(new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb84a', emissiveIntensity: 2 })), page = T.m(new THREE.MeshStandardMaterial({ color: '#f4ecd8', roughness: 0.9, side: THREE.DoubleSide }));
    [[-3.8, -2.8], [0.2, -4.4], [4.2, -2.6]].forEach(([x, z]) => add(new THREE.Mesh(T.g(new THREE.TorusGeometry(1.2, 0.16, 8, 20, Math.PI)), arch), { x, y: 0, z, ry: Math.atan2(-x, -z - 6) }));
    for (let i = 0; i < 9; i++) { const x = (r() - 0.5) * 9, z = -1.2 - r() * 3, h = 0.15 + r() * 0.3; add(new THREE.Mesh(T.g(new THREE.CylinderGeometry(0.07, 0.08, h, 8)), wax), { x, y: h / 2, z }); add(new THREE.Mesh(T.g(new THREE.SphereGeometry(0.05, 8, 6)), flame), { x, y: h + 0.06, z, sy: 1.6, spin: 'flicker' }); }
    for (let i = 0; i < 10; i++) add(new THREE.Mesh(T.g(new THREE.PlaneGeometry(0.28, 0.36)), page), { x: (r() - 0.5) * 8, y: 1.2 + r() * 2, z: -1 - r() * 3.5, rx: r(), ry: r() * 3, spin: 'drift' });
    const ink = T.m(new THREE.MeshBasicMaterial({ color: '#0a0614', transparent: true, opacity: 0.6, depthWrite: false }));
    for (let i = 0; i < 5; i++) add(new THREE.Mesh(T.g(new THREE.CircleGeometry(0.4 + r() * 0.6, 20)), ink), { x: (r() - 0.5) * 8, y: 0.012, z: (r() - 0.5) * 4 - 1, rx: -Math.PI / 2, sx: 1.6 });
  } },
  // The Resonance Scar: a cracked floor of tilted shards, crystal spires and rocks that orbit slowly.
  resonancescar: { sky: 'resonancescar', mood: 'dusk', fog: '#3a2a5a', build(add, T, r) {
    const shard = T.m(new THREE.MeshStandardMaterial({ color: '#6a5a8a', roughness: 0.8, flatShading: true }));
    add(new THREE.Mesh(T.g(new THREE.CircleGeometry(6.5, 48)), T.m(new THREE.MeshStandardMaterial({ map: T.t(radialTexture([[0, '#8a6aa8'], [0.5, '#5a4a7a'], [1, '#1e1838']])), roughness: 0.9 }))), { rx: -Math.PI / 2 });
    for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2, d = 2.4 + r() * 3; add(new THREE.Mesh(T.g(new THREE.CylinderGeometry(0.4 + r() * 0.5, 0.5 + r() * 0.5, 0.18, 5)), shard), { x: Math.cos(a) * d, y: 0.05 + r() * 0.15, z: Math.sin(a) * d - 1, rx: (r() - 0.5) * 0.3, rz: (r() - 0.5) * 0.3, ry: r() * 3 }); }
    const crys = [T.m(new THREE.MeshStandardMaterial({ color: '#ff9ede', emissive: '#ff5fc8', emissiveIntensity: 0.6, roughness: 0.2 })), T.m(new THREE.MeshStandardMaterial({ color: '#9ae8ff', emissive: '#5fd8ff', emissiveIntensity: 0.6, roughness: 0.2 }))];
    for (let i = 0; i < 8; i++) { const x = (r() - 0.5) * 10, z = -1.8 - r() * 3, h = 0.6 + r() * 1.6; add(new THREE.Mesh(T.g(new THREE.OctahedronGeometry(0.3, 0)), crys[i % 2]), { x, y: h / 2, z, sy: h / 0.6, rz: (r() - 0.5) * 0.4 }); }
    const rock = T.m(new THREE.MeshStandardMaterial({ color: '#8a7aa8', roughness: 0.9, flatShading: true }));
    for (let i = 0; i < 7; i++) add(new THREE.Mesh(T.g(new THREE.DodecahedronGeometry(0.25 + r() * 0.3, 0)), rock), { x: (r() - 0.5) * 9, y: 1.6 + r() * 1.8, z: -1.5 - r() * 3, spin: 'orbit' });
  } },
};
// Static props that share a material become one mesh (one draw call per material instead of one per prop).
function mergeStatic(group, animated, T) {
  const byMat = new Map();
  group.children.forEach((m) => { if (!m.isMesh || animated.has(m)) return; (byMat.get(m.material) || byMat.set(m.material, []).get(m.material)).push(m); });
  byMat.forEach((list, mat) => {
    if (list.length < 2) return;
    const geos = list.map((m) => { m.updateMatrix(); let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrix);
      Object.keys(g.attributes).forEach((k) => { if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k); }); return g; });
    const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose()); if (!merged) return;
    list.forEach((m) => group.remove(m));
    group.add(new THREE.Mesh(T.g(merged), mat));
  });
}
// Builds an arena into `scene`; returns { group, update(t), dispose() }.
export function buildArena(scene, id) {
  const def = ARENAS[id] || ARENAS.reliquary, T = tracker(), group = new THREE.Group(), anim = [], r = rnd(id.length * 977 + 13);
  const add = (mesh, o) => {
    o = o || {}; mesh.position.set(o.x || 0, o.y || 0, o.z || 0); mesh.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
    if (o.sx || o.sy || o.sz) mesh.scale.set(o.sx || 1, o.sy || 1, o.sz || 1);
    if (o.spin) anim.push({ mesh, kind: o.spin, y0: mesh.position.y, ph: r() * 6.28 });
    group.add(mesh); return mesh;
  };
  def.build(add, T, r);
  mergeStatic(group, new Set(anim.map((a) => a.mesh)), T);
  scene.add(group);
  scene.fog = new THREE.Fog(def.fog, 7, 16);
  return {
    def, group,
    update(t) {
      anim.forEach((a) => {
        if (a.kind === 'drift') { a.mesh.position.y = a.y0 + Math.sin(t * 0.6 + a.ph) * 0.15; a.mesh.rotation.y += 0.004; }
        else if (a.kind === 'orbit') { a.mesh.position.y = a.y0 + Math.sin(t * 0.5 + a.ph) * 0.25; a.mesh.rotation.x += 0.003; a.mesh.rotation.y += 0.005; }
        else if (a.kind === 'flicker') a.mesh.scale.y = 1.5 + Math.sin(t * 13 + a.ph) * 0.25;
      });
    },
    dispose() { scene.remove(group); scene.fog = null; T.dispose(); },
  };
}
