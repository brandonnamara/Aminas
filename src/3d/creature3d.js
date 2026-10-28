/* Aminas — 3D creature builder, rig contract, animation clips and validation (ES module, no DOM).
   Runs in the browser (runtime.js), in headless Chromium (tools/creature-pipeline.js) and in Node (tests).

   RIG CONTRACT (shared by procedural models and imported GLB models):
     amina            outer node: holds normalisation only (never animated). Y-up, 1 unit = creature height,
                      origin at the feet, facing +Z.
       rig            whole-body motion (hops, lunges, falls). Rest transform = identity.
         body         breathing / squash.        children: tail, wingL, wingR, (head for 2-part bodies)
         head         nods and tilts.             children: eyes (blink), earL, earR, crest
         footL/footR  steps.
     Any node may be missing; clips simply skip absent nodes. Animation clips are named
     idle | move | attack | hit | victory | defeat. All except `defeat` start and end on the rest pose, so a
     one-shot always hands back to `idle` cleanly. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { mergeGeometries, mergeVertices } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/BufferGeometryUtils.js/+esm';

export const VERSION = '1.0.0';
export const CLIP_NAMES = ['idle', 'move', 'attack', 'hit', 'victory', 'defeat'];
export const RIG_NODES = ['amina', 'rig', 'body', 'head', 'eyes', 'earL', 'earR', 'crest', 'tail', 'wingL', 'wingR', 'footL', 'footR'];
export const BUDGET = { tris: 12000, meshes: 40, texture: 1024, heightMin: 0.95, heightMax: 1.2 };
const HOVER = { drop: 1, fish: 1, moth: 1, jelly: 1 };
export const isHover = (art) => !!HOVER[art.body];
// Fixed portrait camera (pipeline + runtime). With these values a creature's feet land at ~PORTRAIT.feetY of the image height.
export const PORTRAIT = { fov: 26, dist: 3.3, target: 0.52, pitch: 0.2, feetY: 0.86 };

/* ---------------------------------------------------------------- colour & materials */
const col = (h) => new THREE.Color(h);
export function shade(h, amt) { const c = col(h); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt))); return '#' + c.getHexString(); }
function matFactory() {
  const cache = new Map();
  return function mat(hex, o) {
    o = o || {};
    const key = hex + '|' + JSON.stringify(o);
    if (cache.has(key)) return cache.get(key);
    const m = new THREE.MeshStandardMaterial({ color: col(hex), roughness: o.rough != null ? o.rough : 0.62, metalness: o.metal || 0 });
    if (o.emissive) { m.emissive = col(o.emissive); m.emissiveIntensity = o.ei != null ? o.ei : 0.8; }
    if (o.opacity != null && o.opacity < 1) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
    if (o.side) m.side = THREE.DoubleSide;
    m.name = o.name || hex.replace('#', 'c');
    cache.set(key, m); return m;
  };
}

/* ---------------------------------------------------------------- geometry helpers */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function mesh(geo, m, pos, rot, scl, name) {
  const me = new THREE.Mesh(geo, m);
  if (pos) me.position.copy(pos);
  if (rot) me.rotation.set(rot[0], rot[1], rot[2]);
  if (scl) me.scale.set(scl[0], scl[1], scl[2]);
  if (name) me.name = name;
  return me;
}
const sphere = (seg) => new THREE.SphereGeometry(1, seg || 24, Math.max(8, Math.round((seg || 24) * 0.66)));
const ell = (m, c, r, seg, rot) => mesh(sphere(seg), m, c, rot, r);
function cone(r, h, seg) { const g = new THREE.ConeGeometry(r, h, seg || 14); g.translate(0, h / 2, 0); return g; } // base at origin
function cyl(r1, r2, h, seg) { const g = new THREE.CylinderGeometry(r2, r1, h, seg || 12); g.translate(0, h / 2, 0); return g; }
// A cone bent forward/outward along its height (horns, curved spikes).
function bentCone(r, h, bend, seg) {
  const g = cone(r, h, seg || 12), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h; p.setX(i, p.getX(i) + bend * y * y); }
  g.computeVertexNormals(); return g;
}
// Leaf blade: a flattened, pointed ellipsoid (pointed at +Y).
function leafGeo(len, wid, thick) {
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(Math.sin(Math.PI * t) * wid * (1 - 0.25 * t), t * len)); }
  const g = new THREE.LatheGeometry(pts, 10); g.scale(1, 1, thick / wid); g.computeVertexNormals(); return g;
}
// Smooth tapered tube along points with radius r0 -> r1 (wisps, tails, tentacles).
function taperTube(points, r0, r1, seg) {
  const curve = new THREE.CatmullRomCurve3(points), tub = 24, rad = seg || 10;
  const g = new THREE.TubeGeometry(curve, tub, 1, rad, false), p = g.attributes.position, n = g.attributes.normal;
  const c = new THREE.Vector3(), pt = new THREE.Vector3();
  for (let i = 0; i <= tub; i++) {
    const t = i / tub, r = r0 + (r1 - r0) * t; curve.getPointAt(t, c);
    for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; pt.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c); p.setXYZ(k, pt.x, pt.y, pt.z); }
  }
  // cap the thin end with a small sphere is done by callers when needed
  g.computeVertexNormals(); void n; return g;
}
function starGeo(r, depth) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: r * 0.08, bevelSegments: 2 });
  g.translate(0, 0, -depth / 2); return g;
}
function crescentGeo(r, thick) {
  const s = new THREE.Shape(); s.absarc(0, 0, r, Math.PI * 0.15, Math.PI * 1.85, false);
  const h = new THREE.Path(); h.absarc(r * 0.38, 0, r * 0.8, Math.PI * 1.75, Math.PI * 0.25, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.3, bevelSize: r * 0.06, bevelSegments: 2 }); g.translate(0, 0, -thick / 2); return g;
}
function noiseDisplace(g, amt, seed) {
  // deterministic lumpy rock: displace along the normal by a hash of the position
  g = g.index ? g.toNonIndexed() : g; const p = g.attributes.position, v = new THREE.Vector3();
  const h = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed) * 43758.5453; return s - Math.floor(s); };
  const done = new Map();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const key = v.x.toFixed(4) + ',' + v.y.toFixed(4) + ',' + v.z.toFixed(4);
    let k = done.get(key); if (k == null) { k = 1 + (h(v.x, v.y, v.z) - 0.5) * amt; done.set(key, k); }
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  g.computeVertexNormals(); return g;
}
const pivot = (name, x, y, z) => { const g = new THREE.Group(); g.name = name; g.position.set(x || 0, y || 0, z || 0); return g; };

/* ---------------------------------------------------------------- face */
// Facial features sit on the ellipsoid the face is painted on (plan.face = { c, r } in head space).
// onFace(x, y, lift) returns the surface point plus an orientation that follows the surface normal.
function faceSurface(face) {
  const c = face.c, r = face.r;
  return function onFace(x, y, lift) {
    const u = (x - c.x) / r[0], v = (y - c.y) / r[1], w = Math.sqrt(Math.max(0, 1 - u * u - v * v));
    const z = c.z + r[2] * w, n = new THREE.Vector3(u / r[0], v / r[1], w / r[2]).normalize();
    const p = new THREE.Vector3(x, y, z).addScaledVector(n, lift || 0);
    return { p, rot: [-Math.atan2(n.y, Math.hypot(n.x, n.z)), Math.atan2(n.x, n.z), 0] };
  };
}
function addFace(head, plan, a, mat) {
  const onFace = faceSurface(plan.face), Fy = plan.Fy;
  const eyes = pivot('eyes', 0, Fy, 0); head.add(eyes);
  const ex = plan.eyeGap || 0.13, er = plan.eyeR || 0.075, dk = '#2a2038';
  const white = mat('#ffffff', { rough: 0.25, name: 'eye_white' }), black = mat(dk, { rough: 0.2, name: 'pupil' }), shine = mat('#ffffff', { rough: 0.1, emissive: '#ffffff', ei: 0.6, name: 'shine' });
  const lidMat = mat(a.c1, { name: 'skin' });
  [-1, 1].forEach((s) => {
    const x = s * ex, at = onFace(x, Fy, -er * 0.3), g = new THREE.Group(); g.position.set(at.p.x, 0, at.p.z); g.rotation.set(at.rot[0], at.rot[1], 0); eyes.add(g);
    switch (a.eyes) {
      case 'sleepy':
        g.add(ell(white, V(0, 0, 0), [er, er * 0.9, er * 0.55], 16));
        g.add(ell(black, V(0, -er * 0.15, er * 0.32), [er * 0.62, er * 0.62, er * 0.4], 14));
        g.add(ell(lidMat, V(0, er * 0.18, er * 0.08), [er * 1.12, er * 0.62, er * 0.62], 16)); // heavy lid
        break;
      case 'sharp':
        g.add(ell(mat(shade(a.c3, 0.2), { rough: 0.25, name: 'iris' }), V(0, 0, 0), [er * 0.85, er, er * 0.5], 16));
        g.add(ell(black, V(0, 0, er * 0.35), [er * 0.22, er * 0.82, er * 0.25], 10));
        g.add(ell(shine, V(-er * 0.3, er * 0.35, er * 0.45), [er * 0.18, er * 0.18, er * 0.1], 8));
        g.add(mesh(new THREE.BoxGeometry(er * 2.2, er * 0.28, er * 0.5), mat(shade(a.c1, -0.35), { name: 'brow' }), V(0, er * 1.05, er * 0.1), [0, 0, s * -0.32]));
        break;
      case 'star':
        g.add(ell(white, V(0, 0, 0), [er, er, er * 0.5], 16));
        g.add(mesh(starGeo(er * 0.85, er * 0.25), mat(a.c3, { emissive: a.c3, ei: 0.5, name: 'star_iris' }), V(0, 0, er * 0.42)));
        g.add(ell(black, V(0, 0, er * 0.55), [er * 0.25, er * 0.25, er * 0.12], 8));
        break;
      case 'lantern':
        g.add(ell(mat(a.c3, { emissive: a.c3, ei: 1.4, name: 'lantern_eye' }), V(0, 0, 0), [er * 0.8, er * 0.8, er * 0.45], 16));
        g.add(ell(shine, V(0, 0, er * 0.3), [er * 0.3, er * 0.3, er * 0.2], 8));
        break;
      default: // big & cute
        g.add(ell(white, V(0, 0, 0), [er, er * 1.08, er * 0.55], 18));
        g.add(ell(black, V(0, -er * 0.05, er * 0.3), [er * 0.75, er * 0.82, er * 0.38], 16));
        g.add(ell(shine, V(-er * 0.28, er * 0.32, er * 0.6), [er * 0.24, er * 0.24, er * 0.12], 8));
        g.add(ell(shine, V(er * 0.26, -er * 0.3, er * 0.6), [er * 0.11, er * 0.11, er * 0.06], 6));
    }
  });
  const mouthM = mat(shade(a.c1, -0.45), { name: 'mouth' });
  const smile = new THREE.TorusGeometry(0.032, 0.0075, 6, 14, Math.PI), m = onFace(0, Fy - 0.1, 0.002);
  head.add(mesh(smile, mouthM, m.p, [m.rot[0], m.rot[1], Math.PI]));
  const blush = mat('#ff8fb0', { rough: 0.9, opacity: 0.75, name: 'blush' });
  [-1, 1].forEach((s) => { const b = onFace(s * (ex + 0.075), Fy - 0.075, 0.004); head.add(ell(blush, b.p, [0.042, 0.025, 0.01], 10, b.rot)); });
  if (a.snout) { const n = onFace(0, Fy - 0.045, 0.012); head.add(ell(mat('#ffb0d8', { name: 'nose' }), n.p, [0.036, 0.026, 0.022], 10, n.rot)); }
  return eyes;
}

/* ---------------------------------------------------------------- ears / crests (attached to the head) */
function addEars(head, top, a, mat, w) {
  const dk = shade(a.c1, -0.15), inner = mat(a.c3, { name: 'ear_inner' }), base = mat(dk, { name: 'ear' });
  const mk = (name, s) => { const p = pivot(name, top.x + s * w, top.y, top.z); head.add(p); return p; };
  switch (a.ears) {
    case 'leaf': [-1, 1].forEach((s) => { const p = mk(s < 0 ? 'earL' : 'earR', s); p.rotation.z = -s * 0.85; p.rotation.x = -0.15;
      p.add(mesh(leafGeo(0.32, 0.12, 0.035), mat(shade(a.c1, -0.08), { name: 'leaf' })));
      p.add(mesh(cyl(0.009, 0.004, 0.27, 6), mat(a.c3, { name: 'vein' }), V(0, 0.01, 0.022))); }); break;
    case 'pointy': [-1, 1].forEach((s) => { const p = mk(s < 0 ? 'earL' : 'earR', s); p.rotation.z = -s * 0.32;
      p.add(mesh(cone(0.1, 0.26, 4), base, null, [0, Math.PI / 4, 0], [1, 1, 0.55]));
      p.add(mesh(cone(0.06, 0.18, 4), inner, V(0, 0.02, 0.03), [0, Math.PI / 4, 0], [1, 1, 0.35])); }); break;
    case 'round': [-1, 1].forEach((s) => { const p = mk(s < 0 ? 'earL' : 'earR', s * 1.15); p.rotation.z = -s * 0.25;
      p.add(ell(base, V(0, 0.06, 0), [0.1, 0.1, 0.05], 14)); p.add(ell(inner, V(0, 0.06, 0.03), [0.055, 0.055, 0.03], 10)); }); break;
    case 'long': [-1, 1].forEach((s) => { const p = mk(s < 0 ? 'earL' : 'earR', s * 0.8); p.rotation.z = -s * 0.22;
      p.add(ell(mat(a.c1, { name: 'skin' }), V(0, 0.2, 0), [0.065, 0.22, 0.045], 14)); p.add(ell(inner, V(0, 0.2, 0.03), [0.035, 0.16, 0.02], 10)); }); break;
    case 'horn': [-1, 1].forEach((s) => { const p = mk(s < 0 ? 'earL' : 'earR', s * 0.8); p.rotation.z = -s * 0.35;
      p.add(mesh(bentCone(0.06, 0.26, s * 0.08, 12), mat(a.c3, { rough: 0.4, name: 'horn' }))); }); break;
    case 'crown': { const p = pivot('crest', top.x, top.y - 0.04, top.z); head.add(p);
      for (let i = 0; i < 7; i++) { const ang = (i - 3) * 0.42; const q = new THREE.Group(); q.rotation.z = ang; q.rotation.x = -0.25; p.add(q);
        q.add(mesh(leafGeo(0.2, 0.075, 0.03), mat(i % 2 ? a.c3 : shade(a.c3, 0.15), { name: 'petal' }), V(0, 0.02, 0))); } break; }
    case 'antler': [-1, 1].forEach((s) => { const p = mk(s < 0 ? 'earL' : 'earR', s * 0.6); p.rotation.z = -s * 0.3; const am = mat(a.c3, { rough: 0.55, name: 'antler' });
      p.add(mesh(bentCone(0.025, 0.32, s * 0.06, 8), am)); p.add(mesh(bentCone(0.018, 0.14, s * 0.05, 8), am, V(0, 0.14, 0), [0, 0, -s * 0.9]));
      p.add(mesh(bentCone(0.016, 0.12, -s * 0.04, 8), am, V(0, 0.22, 0), [0.6, 0, s * 0.5])); p.add(ell(mat('#ff9ec7', { name: 'bud' }), V(s * 0.1, 0.22, 0), [0.025, 0.025, 0.025], 8)); }); break;
    case 'antenna': [-1, 1].forEach((s) => { const p = mk(s < 0 ? 'earL' : 'earR', s * 0.45); p.rotation.z = -s * 0.45;
      p.add(mesh(bentCone(0.012, 0.26, s * 0.08, 6), mat(shade(a.c1, -0.3), { name: 'stalk' }))); p.add(ell(mat(a.c3, { emissive: a.glow ? a.c3 : null, ei: 0.6, name: 'tip' }), V(s * 0.08, 0.27, 0), [0.04, 0.04, 0.04], 10)); }); break;
    case 'fin': [-1, 1].forEach((s) => { const p = mk(s < 0 ? 'earL' : 'earR', s * 1.25); p.rotation.z = -s * 1.1;
      p.add(mesh(leafGeo(0.22, 0.1, 0.02), mat(shade(a.c1, -0.25), { name: 'fin' }))); }); break;
    case 'crest': { const p = pivot('crest', top.x, top.y - 0.02, top.z - 0.02); head.add(p);
      [-0.3, 0, 0.3].forEach((r, i) => p.add(mesh(leafGeo(i === 1 ? 0.22 : 0.16, 0.06, 0.03), mat(a.c3, { name: 'crest' }), V(0, 0, -i * 0.01), [-0.35, 0, r]))); break; }
    case 'halo': { const p = pivot('crest', top.x, top.y + 0.12, top.z); head.add(p);
      p.add(mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 32), mat(a.c3, { emissive: a.c3, ei: 1.2, rough: 0.3, name: 'halo' }), null, [Math.PI / 2 - 0.25, 0, 0])); break; }
    case 'crystal': [-1, 1].forEach((s) => { const p = mk(s < 0 ? 'earL' : 'earR', s * 0.75); p.rotation.z = -s * 0.4;
      p.add(mesh(new THREE.OctahedronGeometry(0.08, 0), mat(a.c3, { rough: 0.15, metal: 0.1, emissive: a.c3, ei: 0.35, name: 'crystal' }), V(0, 0.12, 0), null, [0.7, 1.9, 0.7])); }); break;
    default: break;
  }
}

/* ---------------------------------------------------------------- tails (pivot at the back of the body) */
function addTail(body, at, a, mat) {
  if (!a.tail || a.tail === 'none') return null;
  const t = pivot('tail', at.x, at.y, at.z); body.add(t);
  switch (a.tail) {
    case 'leaf': t.add(mesh(leafGeo(0.34, 0.13, 0.035), mat(a.c3, { name: 'leaf' }), null, [-1.05, 0, 0])); t.add(mesh(cyl(0.008, 0.004, 0.28, 6), mat(shade(a.c3, -0.3), { name: 'vein' }), V(0, 0.02, -0.01), [-1.05, 0, 0])); break;
    case 'flame': {
      t.add(mesh(bentCone(0.1, 0.36, -0.12, 14), mat(a.c3, { emissive: a.c3, ei: 0.9, rough: 0.5, name: 'flame' }), null, [-0.7, 0, 0]));
      t.add(mesh(bentCone(0.06, 0.24, -0.08, 12), mat('#fff6b0', { emissive: '#fff2a0', ei: 1.4, name: 'flame_core' }), V(0, 0.02, 0.02), [-0.7, 0, 0])); break; }
    case 'fin': t.add(mesh(leafGeo(0.3, 0.16, 0.025), mat(shade(a.c1, -0.25), { name: 'fin' }), null, [-1.4, 0, 0])); break;
    case 'fluff': t.add(ell(mat(a.c2, { rough: 0.95, name: 'fluff' }), V(0, 0.02, -0.06), [0.12, 0.12, 0.12], 16)); break;
    case 'wisp': t.add(mesh(taperTube([V(0, 0, 0), V(0, 0.08, -0.14), V(0.06, 0.24, -0.2), V(0.02, 0.36, -0.12)], 0.07, 0.012), mat(a.c2, { rough: 0.5, name: 'wisp' }))); break;
    case 'ribbon': [-1, 1].forEach((s) => t.add(mesh(taperTube([V(0, 0, 0), V(s * 0.06, 0.06, -0.14), V(s * 0.14, 0.02, -0.26), V(s * 0.2, 0.09, -0.36)], 0.035, 0.01), mat(a.c3, { name: 'ribbon' }), null, null, [1, 0.45, 1]))); break;
    case 'cloud': [[0, 0, -0.04, 0.09], [0.07, 0.05, -0.1, 0.07], [-0.06, 0.06, -0.09, 0.06]].forEach(([x, y, z, r]) => t.add(ell(mat('#ffffff', { rough: 0.95, name: 'cloud' }), V(x, y, z), [r, r, r], 12))); break;
    case 'curl': t.add(mesh(new THREE.TorusGeometry(0.1, 0.028, 8, 20, Math.PI * 1.4), mat(a.c3, { name: 'curl' }), V(0, 0.1, -0.06), [0, Math.PI / 2, 0])); break;
  }
  return t;
}

/* ---------------------------------------------------------------- wings */
function addWings(body, at, a, mat, big) {
  [-1, 1].forEach((s) => {
    const p = pivot(s < 0 ? 'wingL' : 'wingR', at.x + s * at.w, at.y, at.z); body.add(p);
    if (big) {
      const wm = mat(a.c1, { rough: 0.5, side: true, opacity: 0.94, name: 'wing' });
      p.add(ell(wm, V(s * 0.26, 0.1, -0.02), [0.3, 0.24, 0.012], 20, [0, 0, s * 0.35]));
      p.add(ell(wm, V(s * 0.2, -0.12, -0.01), [0.18, 0.14, 0.012], 16, [0, 0, -s * 0.4]));
      p.add(ell(mat(a.c3, { emissive: a.glow ? a.c3 : null, ei: 0.4, name: 'wing_spot' }), V(s * 0.3, 0.12, 0.004), [0.07, 0.07, 0.014], 12));
    } else {
      p.add(ell(mat(a.c3, { name: 'wing' }), V(s * 0.12, -0.02, -0.02), [0.16, 0.09, 0.035], 16, [0.2, 0, s * -0.5]));
    }
  });
}

/* ---------------------------------------------------------------- body plans
   Each returns { head, face: { c, r } (the ellipsoid the face sits on, head space), Fy (eye line), earTop, earW, tailAt,
   wingAt, feet: [[x, z, r]...] } */
function bodyPlan(a, body, mat) {
  const skin = mat(a.c1, { name: 'skin' }), belly = mat(a.c2, { rough: 0.75, name: 'belly' });
  const head = pivot('head');
  switch (a.body) {
    case 'tall': {
      body.add(ell(skin, V(0, 0.5, 0), [0.32, 0.47, 0.3], 28)); body.add(ell(belly, V(0, 0.4, 0.17), [0.21, 0.28, 0.16], 20));
      head.position.set(0, 0.74, 0); body.add(head);
      return { head, face: { c: V(0, -0.24, 0), r: [0.32, 0.47, 0.3] }, Fy: 0.0, earTop: V(0, 0.2, 0), earW: 0.17, tailAt: V(0, 0.3, -0.26), wingAt: { x: 0, y: 0.55, z: -0.18, w: 0.2 }, feet: [[-0.15, 0.06, 0.1], [0.15, 0.06, 0.1]] };
    }
    case 'long': {
      body.add(ell(skin, V(0, 0.36, -0.06), [0.28, 0.25, 0.4], 26)); body.add(ell(belly, V(0, 0.28, 0.0), [0.2, 0.15, 0.3], 18));
      head.position.set(0, 0.6, 0.26); body.add(head);
      head.add(ell(skin, V(0, 0, 0), [0.26, 0.24, 0.24], 26)); head.add(ell(belly, V(0, -0.07, 0.15), [0.15, 0.1, 0.1], 14));
      return { head, face: { c: V(0, 0, 0), r: [0.26, 0.24, 0.24] }, Fy: 0.02, earTop: V(0, 0.18, -0.02), earW: 0.15, tailAt: V(0, 0.42, -0.42), wingAt: { x: 0, y: 0.5, z: -0.1, w: 0.18 },
        feet: [[-0.16, 0.2, 0.09], [0.16, 0.2, 0.09], [-0.16, -0.28, 0.085], [0.16, -0.28, 0.085]], legs: 0.14 };
    }
    case 'drop': {
      const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20, y = t * 0.95; const r = t < 0.62 ? Math.sin((t / 0.62) * Math.PI * 0.5) * 0.36 + 0.02 * Math.sin(t * 9) * 0 : 0.36 * Math.pow(Math.cos(((t - 0.62) / 0.38) * Math.PI * 0.5), 1.25); pts.push(new THREE.Vector2(Math.max(0.0001, r), y)); }
      const g = new THREE.LatheGeometry(pts, 28); body.add(mesh(g, skin));
      body.add(ell(belly, V(0, 0.26, 0.2), [0.22, 0.17, 0.14], 18));
      head.position.set(0, 0.42, 0); body.add(head);
      return { head, face: { c: V(0, 0.12, 0), r: [0.36, 0.44, 0.355] }, Fy: 0.0, earTop: V(0, 0.18, 0.05), earW: 0.2, tailAt: V(0, 0.25, -0.3), wingAt: { x: 0, y: 0.4, z: -0.2, w: 0.2 }, feet: [] };
    }
    case 'fish': {
      body.add(ell(skin, V(0, 0.42, -0.04), [0.3, 0.3, 0.4], 26)); body.add(ell(belly, V(0, 0.32, 0.08), [0.22, 0.16, 0.26], 18));
      body.add(mesh(leafGeo(0.24, 0.1, 0.02), mat(shade(a.c1, -0.25), { name: 'fin' }), V(0, 0.66, -0.05), [-0.5, 0, 0]));
      [-1, 1].forEach((s) => body.add(mesh(leafGeo(0.18, 0.08, 0.02), mat(shade(a.c1, -0.25), { name: 'fin' }), V(s * 0.28, 0.34, 0.05), [0.4, 0, s * 1.9])));
      head.position.set(0, 0.46, 0.08); body.add(head);
      return { head, face: { c: V(0, -0.04, -0.12), r: [0.3, 0.3, 0.4] }, Fy: 0.04, earTop: V(0, 0.18, 0), earW: 0.2, tailAt: V(0, 0.42, -0.42), wingAt: { x: 0, y: 0.45, z: -0.1, w: 0.25 }, feet: [] };
    }
    case 'bird': {
      body.add(ell(skin, V(0, 0.42, 0), [0.34, 0.36, 0.32], 26)); body.add(ell(belly, V(0, 0.34, 0.16), [0.22, 0.22, 0.16], 18));
      head.position.set(0, 0.5, 0); body.add(head);
      head.add(mesh(cone(0.05, 0.12, 10), mat(a.c3, { rough: 0.4, name: 'beak' }), V(0, -0.05, 0.31), [Math.PI / 2, 0, 0]));
      return { head, face: { c: V(0, -0.08, 0), r: [0.34, 0.36, 0.32] }, Fy: 0.07, earTop: V(0, 0.32, -0.02), earW: 0.05, tailAt: V(0, 0.3, -0.3), wingAt: { x: 0, y: 0.45, z: -0.04, w: 0.3 }, feet: [[-0.1, 0.06, 0.06], [0.1, 0.06, 0.06]], thinFeet: true };
    }
    case 'moth': {
      body.add(ell(skin, V(0, 0.42, 0), [0.17, 0.26, 0.17], 22)); body.add(ell(belly, V(0, 0.36, 0.08), [0.11, 0.17, 0.1], 14));
      head.position.set(0, 0.7, 0.02); body.add(head); head.add(ell(skin, V(0, 0, 0), [0.17, 0.16, 0.16], 22));
      return { head, face: { c: V(0, 0, 0), r: [0.17, 0.16, 0.16] }, Fy: 0.0, earTop: V(0, 0.12, 0), earW: 0.08, tailAt: V(0, 0.2, -0.1), wingAt: { x: 0, y: 0.5, z: -0.1, w: 0.1 }, feet: [], eyeR: 0.055, eyeGap: 0.075 };
    }
    case 'rock': {
      const g = noiseDisplace(new THREE.IcosahedronGeometry(1, 2), 0.18, 3.1); body.add(mesh(g, mat(a.c1, { rough: 0.92, name: 'stone' }), V(0, 0.42, 0), null, [0.42, 0.38, 0.38]));
      [[0.24, 0.62, 0.12], [-0.28, 0.5, 0.06], [0.1, 0.72, -0.14]].forEach(([x, y, z], i) => body.add(mesh(noiseDisplace(new THREE.DodecahedronGeometry(1, 0), 0.2, i), mat(a.c2, { rough: 0.9, name: 'stone_light' }), V(x, y, z), null, [0.09, 0.07, 0.08])));
      head.position.set(0, 0.46, 0); body.add(head);
      return { head, face: { c: V(0, -0.04, 0), r: [0.42, 0.38, 0.4] }, Fy: 0.03, earTop: V(0, 0.34, 0), earW: 0.17, tailAt: V(0, 0.3, -0.36), wingAt: { x: 0, y: 0.5, z: -0.2, w: 0.3 }, feet: [[-0.18, 0.05, 0.11], [0.18, 0.05, 0.11]] };
    }
    case 'snail': {
      body.add(ell(skin, V(0, 0.15, 0.04), [0.24, 0.15, 0.44], 24));
      head.position.set(0, 0.36, 0.3); body.add(head); head.add(ell(skin, V(0, 0, 0), [0.17, 0.18, 0.16], 22));
      const sh = mat(a.c3, { rough: 0.55, name: 'shell' }), sh2 = mat(shade(a.c3, -0.2), { name: 'shell_dark' });
      const spiral = []; for (let i = 0; i <= 16; i++) { const t = i / 16, ang = t * Math.PI * 3.1, r = 0.2 * (1 - t * 0.8); spiral.push(V(0, 0.42 + Math.sin(ang) * r, -0.12 + Math.cos(ang) * r)); }
      body.add(mesh(taperTube(spiral, 0.17, 0.035, 16), sh, null, null, [0.85, 1, 1]));
      body.add(mesh(taperTube(spiral.map((v) => V(v.x + 0.001, v.y, v.z)), 0.175, 0.03, 16), sh2, V(0.008, 0, 0), null, [0.84, 0.97, 0.97]));
      body.add(ell(sh2, spiral[16], [0.03, 0.03, 0.03], 10));
      return { head, face: { c: V(0, 0, 0), r: [0.17, 0.18, 0.16] }, Fy: 0.0, earTop: V(0, 0.15, 0), earW: 0.06, tailAt: V(0, 0.1, -0.4), wingAt: { x: 0, y: 0.4, z: -0.1, w: 0.2 }, feet: [], eyeR: 0.055, eyeGap: 0.07 };
    }
    case 'cap': {
      body.add(ell(belly, V(0, 0.27, 0), [0.22, 0.27, 0.21], 22));
      const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(0.44 * Math.cos(t * Math.PI * 0.5), 0.28 * Math.sin(t * Math.PI * 0.5))); }
      pts.unshift(new THREE.Vector2(0.001, -0.04)); pts.splice(1, 0, new THREE.Vector2(0.4, -0.05));
      const capG = new THREE.LatheGeometry(pts.slice().reverse().map((p) => p).reverse(), 30);
      body.add(mesh(capG, mat(a.c3, { rough: 0.6, name: 'cap' }), V(0, 0.48, 0)));
      [[0.18, 0.66, 0.24], [-0.2, 0.62, 0.22], [0.02, 0.75, 0.1], [0.3, 0.55, -0.1], [-0.28, 0.58, -0.14]].forEach(([x, y, z]) => body.add(ell(mat('#ffffff', { rough: 0.9, name: 'spot' }), V(x, y, z), [0.055, 0.03, 0.055], 10)));
      head.position.set(0, 0.3, 0); body.add(head);
      return { head, face: { c: V(0, -0.03, 0), r: [0.22, 0.27, 0.21] }, Fy: -0.02, earTop: V(0, 0.5, 0), earW: 0.1, tailAt: V(0, 0.2, -0.2), wingAt: { x: 0, y: 0.3, z: -0.1, w: 0.2 }, feet: [[-0.12, 0.04, 0.08], [0.12, 0.04, 0.08]], eyeR: 0.055, eyeGap: 0.085 };
    }
    case 'jelly': {
      const pts = []; for (let i = 0; i <= 18; i++) { const t = i / 18; pts.push(new THREE.Vector2(Math.max(0.001, 0.36 * Math.sin(t * Math.PI * 0.5 + Math.PI * 0.5)) * (1 + 0.04 * Math.sin(t * 30)), 0.36 * Math.cos(t * Math.PI * 0.5 + Math.PI * 0.5) * -1)); }
      const dome = new THREE.LatheGeometry(pts, 30); body.add(mesh(dome, mat(a.c1, { rough: 0.3, opacity: 0.92, name: 'jelly' }), V(0, 0.48, 0)));
      body.add(ell(mat(a.c2, { emissive: a.glow || null, ei: 0.3, opacity: 0.85, name: 'jelly_core' }), V(0, 0.62, 0), [0.18, 0.12, 0.18], 18));
      const tm = mat(shade(a.c1, -0.08), { rough: 0.4, opacity: 0.9, name: 'tentacle' });
      for (let i = 0; i < 6; i++) { const ang = (i / 6) * Math.PI * 2, x = Math.cos(ang) * 0.2, z = Math.sin(ang) * 0.2;
        body.add(mesh(taperTube([V(x, 0.5, z), V(x * 1.1, 0.36, z * 1.1 + 0.02), V(x * 0.9, 0.22, z * 0.9 - 0.02), V(x * 1.15, 0.08, z * 1.15)], 0.035, 0.012), tm)); }
      head.position.set(0, 0.62, 0); body.add(head);
      return { head, face: { c: V(0, -0.14, 0), r: [0.36, 0.36, 0.36] }, Fy: -0.02, earTop: V(0, 0.22, 0), earW: 0.2, tailAt: V(0, 0.55, -0.3), wingAt: { x: 0, y: 0.55, z: -0.2, w: 0.3 }, feet: [] };
    }
    default: { // round — the classic chibi blob: head and body are one shape
      body.add(ell(skin, V(0, 0.43, 0), [0.41, 0.39, 0.37], 30)); body.add(ell(belly, V(0, 0.3, 0.2), [0.25, 0.2, 0.17], 22));
      head.position.set(0, 0.5, 0); body.add(head);
      return { head, face: { c: V(0, -0.07, 0), r: [0.41, 0.39, 0.37] }, Fy: 0.02, earTop: V(0, 0.29, -0.02), earW: 0.2, tailAt: V(0, 0.3, -0.34), wingAt: { x: 0, y: 0.45, z: -0.22, w: 0.28 }, feet: [[-0.17, 0.05, 0.13], [0.17, 0.05, 0.13]] };
    }
  }
}

/* ---------------------------------------------------------------- marks, spikes, moss */
function addMarks(head, body, plan, a, mat) {
  const onFace = faceSurface(plan.face), Fy = plan.Fy, m3 = mat(a.c3, { emissive: a.glow ? a.c3 : null, ei: 0.55, name: 'mark' });
  const top = Math.min(Fy + 0.15, plan.face.c.y + plan.face.r[1] * 0.92);
  switch (a.mark) {
    case 'star': { const q = onFace(0, top, 0.006); head.add(mesh(starGeo(0.05, 0.012), m3, q.p, q.rot)); break; }
    case 'rune': { const q = onFace(0, top, 0.006); head.add(mesh(new THREE.TorusGeometry(0.04, 0.009, 6, 4), m3, q.p, [q.rot[0], q.rot[1], Math.PI / 4]));
      head.add(mesh(new THREE.BoxGeometry(0.11, 0.012, 0.012), m3, q.p, q.rot)); break; }
    case 'spots': [[-0.17, 0.12], [0.18, 0.07], [0.05, 0.19]].forEach(([x, y]) => { const q = onFace(x, Math.min(Fy + y, top), 0.003); head.add(ell(mat(a.c3, { opacity: 0.9, name: 'spot' }), q.p, [0.036, 0.036, 0.012], 10, q.rot)); }); break;
    case 'stripes': [-0.09, 0, 0.09].forEach((x) => { const q = onFace(x, top, 0.004); head.add(mesh(new THREE.CapsuleGeometry(0.012, 0.07, 4, 8), mat(a.c3, { opacity: 0.9, name: 'stripe' }), q.p, [q.rot[0] - 0.2, q.rot[1], x * 2])); }); break;
  }
  if (a.spikes) [[0, 0.62, -0.2], [0, 0.55, -0.32], [0, 0.44, -0.4]].forEach(([x, y, z], i) => body.add(mesh(cone(0.05 - i * 0.008, 0.12, 8), mat(shade(a.c1, -0.35), { name: 'spike' }), V(x, y, z), [-0.6 - i * 0.2, 0, 0])));
  if (a.moss) [[-0.1, 0.92, 0.0, 0.13], [0.12, 0.9, 0.05, 0.1], [0.0, 0.94, -0.1, 0.11]].forEach(([x, y, z, r]) => body.add(ell(mat('#6fbf5a', { rough: 0.95, name: 'moss' }), V(x, y, z), [r, r * 0.45, r], 12)));
  if (a.split) body.add(ell(mat(a.c2, { opacity: 0.55, name: 'split' }), V(0.12, 0.5, 0.02), [0.22, 0.42, 0.28], 20));
}

/* ---------------------------------------------------------------- hero recipes
   Hand-tuned extras for the first hero creatures (the starters and their evolutions). They extend the parametric
   base so every Amina shares one rig; the pipeline exports these as GLB files with the six clips. */
export const HEROES = {
  lumifern(g, a, mat) {
    const { head, body } = g;
    // a two-leaf sprout on the crown and soft cheek fluff
    const sprout = head.getObjectByName('crest') ? new THREE.Group() : pivot('crest', 0, 0.33, -0.05); if (!sprout.name) sprout.position.set(0, 0.36, -0.05); head.add(sprout);
    sprout.add(mesh(cyl(0.014, 0.01, 0.12, 8), mat('#5fa84a', { name: 'stem' })));
    [-1, 1].forEach((s) => sprout.add(mesh(leafGeo(0.13, 0.055, 0.02), mat(s < 0 ? '#9fe36a' : '#7fcf5a', { name: 'sprout_leaf' }), V(0, 0.11, 0), [0, 0, -s * 1.1])));
    [-1, 1].forEach((s) => head.add(ell(mat('#fff7c8', { rough: 0.95, name: 'fluff' }), V(s * 0.33, -0.12, 0.16), [0.08, 0.06, 0.06], 12)));
    // sun-specks on the back that glow faintly (stored sunlight)
    [[-0.14, 0.62, -0.28], [0.1, 0.7, -0.24], [0.2, 0.52, -0.3], [-0.04, 0.5, -0.36]].forEach(([x, y, z]) => body.add(ell(mat('#ffe9a0', { emissive: '#ffd86b', ei: 0.9, name: 'speck' }), V(x, y, z), [0.022, 0.022, 0.012], 8)));
    // little toe beans
    g.feet.forEach((f) => f.add(ell(mat('#ffb8c8', { name: 'bean' }), V(0, 0.01, 0.05), [0.03, 0.012, 0.02], 8)));
  },
  umbrit(g, a, mat) {
    const { head, body } = g;
    // moon-pale crescent crest that glows softly
    const crest = pivot('crest', 0, 0.23, 0.2); head.add(crest); crest.rotation.x = -0.6;
    crest.add(mesh(crescentGeo(0.075, 0.018), mat('#f4e9ff', { emissive: '#d9c8ff', ei: 0.8, name: 'moon' })));
    // velvet sheen patch and a shadow puddle under the feet
    body.add(ell(mat(shade(a.c1, 0.12), { rough: 0.35, name: 'sheen' }), V(-0.12, 0.62, 0.12), [0.12, 0.08, 0.06], 12, [0.3, -0.4, 0]));
    g.rig.add(mesh(new THREE.CircleGeometry(0.42, 28), mat('#1a1030', { opacity: 0.22, rough: 1, name: 'shadow_pool' }), V(0, 0.005, 0), [-Math.PI / 2, 0, 0]));
  },
  solarbloom(g, a, mat) {
    HEROES.lumifern(g, a, mat);
    const { body } = g;
    // a sunflower mane of petals radiating behind the face
    for (let i = 0; i < 14; i++) { const ang = (i / 14) * Math.PI * 2; const q = new THREE.Group(); q.position.set(Math.cos(ang) * 0.3, 0.45 + Math.sin(ang) * 0.29, -0.16); q.rotation.set(0, 0, ang - Math.PI / 2); body.add(q);
      q.add(mesh(leafGeo(0.2, 0.085, 0.03), mat(i % 2 ? '#ffcf4a' : '#ffe27a', { name: 'petal' }), null, [-0.25, 0, 0])); }
  },
  duskmantle(g, a, mat) {
    const { body, head } = g;
    // a living-twilight mantle over the shoulders
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.27 + 0.13 * Math.pow(t, 1.3), 0.8 - t * 0.7)); }
    const cloak = new THREE.LatheGeometry(pts, 30, 0.75, Math.PI * 2 - 1.5); // open at the front (+Z)
    body.add(mesh(cloak, mat(shade(a.c1, -0.18), { side: true, rough: 0.45, name: 'mantle' })));
    const hem = []; for (let i = 0; i <= 30; i++) { const ph = 0.75 + (i / 30) * (Math.PI * 2 - 1.5); hem.push(V(Math.sin(ph) * 0.405, 0.1 + 0.025 * Math.sin(i * 1.3), Math.cos(ph) * 0.405)); }
    body.add(mesh(taperTube(hem, 0.018, 0.018, 6), mat(a.c3, { emissive: '#b9a2ff', ei: 0.5, name: 'hem' })));
    [-1, 1].forEach((s) => body.add(ell(mat(a.c3, { emissive: '#b9a2ff', ei: 0.4, name: 'clasp' }), V(s * 0.18, 0.78, 0.2), [0.035, 0.035, 0.02], 10)));
    const crest = pivot('crest', 0, 0.2, 0.2); head.add(crest); crest.rotation.x = -0.55;
    crest.add(mesh(crescentGeo(0.055, 0.016), mat('#f0e4ff', { emissive: '#d9c8ff', ei: 0.9, name: 'moon' })));
    g.rig.add(mesh(new THREE.CircleGeometry(0.42, 28), mat('#1a1030', { opacity: 0.22, rough: 1, name: 'shadow_pool' }), V(0, 0.005, 0), [-Math.PI / 2, 0, 0]));
  },

  // ---- the three dungeon guardians (v0.4). Arms hang on the wing pivots, so the shared clips swing them.
  relicwarden(g, a, mat) {
    const { body } = g;
    const stone = mat('#9aa58c', { rough: 0.95, name: 'stone' }), stoneDk = mat('#6f7a64', { rough: 0.95, name: 'stone_dark' });
    const rootM = mat(a.c3, { rough: 0.8, name: 'root' }), glow = mat('#c8f0a8', { emissive: '#9aff7a', ei: 1.0, name: 'root_glow' });
    // stone pauldrons on the shoulders
    [-1, 1].forEach((s) => body.add(mesh(noiseDisplace(new THREE.IcosahedronGeometry(1, 1), 0.16, 7 + s), stone, V(s * 0.27, 0.74, -0.03), [0.1, 0, -s * 0.5], [0.15, 0.1, 0.15])));
    // stubby arms ending in stone fists
    [-1, 1].forEach((s) => { const p = pivot(s < 0 ? 'wingL' : 'wingR', s * 0.29, 0.64, 0.02); body.add(p);
      p.add(mesh(new THREE.CapsuleGeometry(0.07, 0.15, 4, 10), mat(a.c1, { name: 'skin' }), V(s * 0.05, -0.12, 0.03), [0, 0, s * 0.3]));
      p.add(mesh(noiseDisplace(new THREE.DodecahedronGeometry(1, 0), 0.15, 3 + s), stoneDk, V(s * 0.09, -0.25, 0.05), null, [0.085, 0.075, 0.085])); });
    // a relic plate on the chest carrying the glowing rune
    const plate = new THREE.Group(); plate.position.set(0, 0.43, 0.338); plate.rotation.x = -0.12; body.add(plate);
    plate.add(mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.03, 6), stone, null, [Math.PI / 2, 0, 0]));
    plate.add(mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 4), glow, V(0, 0, 0.018), [0, 0, Math.PI / 4]));
    plate.add(mesh(new THREE.BoxGeometry(0.12, 0.014, 0.01), glow, V(0, 0, 0.018)));
    // roots climbing from the ground up the flanks, glowing at the tips (the Reliquary's humming roots)
    // (each root hugs the egg-shaped body: radius at height y is the body ellipsoid's, plus a little)
    const rxy = (y) => 0.32 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 0.5) / 0.47, 2)));
    const along = (s, ys, a0, a1, off) => ys.map((y, i) => { const th = s * (a0 + (a1 - a0) * (i / (ys.length - 1))), r = Math.max(0.1, rxy(y)) + off; return V(Math.sin(th) * r, y, Math.cos(th) * r); });
    [-1, 1].forEach((s) => {
      const p1 = along(s, [0.02, 0.12, 0.24, 0.36, 0.46], 2.3, 1.05, 0.03);
      body.add(mesh(taperTube(p1, 0.042, 0.012, 8), rootM)); body.add(ell(glow, p1[4], [0.02, 0.02, 0.02], 8));
      const p2 = along(s, [0.02, 0.14, 0.27, 0.38], 2.9, 2.2, 0.025);
      body.add(mesh(taperTube(p2, 0.034, 0.01, 8), rootM)); body.add(ell(glow, p2[3], [0.016, 0.016, 0.016], 8));
    });
    // tiny flowers in the moss crown
    [[-0.1, 0.97, 0.04, '#ffd0e8'], [0.13, 0.95, 0.07, '#fff3a8'], [0.02, 0.99, -0.08, '#ffd0e8']].forEach(([x, y, z, c]) => body.add(ell(mat(c, { name: 'bloom' }), V(x, y, z), [0.022, 0.014, 0.022], 8)));
  },
  whisperhusk(g, a, mat) {
    const { body, head } = g;
    const husk = mat(shade(a.c1, -0.1), { side: true, rough: 0.85, name: 'husk' }), seam = mat(shade(a.c1, -0.28), { rough: 0.9, name: 'husk_seam' });
    const light = mat('#fff2b0', { emissive: a.c3, ei: 1.4, name: 'lantern_light' }), metal = mat('#4a3e52', { rough: 0.5, metal: 0.4, name: 'lantern_frame' });
    // a papery husk hood over the head and back, open at the front so the lantern eyes show; it follows the head
    const rx = (y) => 0.32 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 0.5) / 0.47, 2)));
    const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14, y = 1.03 - t * 0.66; pts.push(new THREE.Vector2(i === 0 ? 0.004 : rx(Math.min(y, 0.955)) + 0.035 + t * 0.03, y - 0.74)); }
    head.add(mesh(new THREE.LatheGeometry(pts, 28, 1.0, Math.PI * 2 - 2.0), husk));
    [-1.6, Math.PI, 1.6].forEach((ph) => head.add(mesh(taperTube(pts.slice(1, 13).map((p) => V(Math.sin(ph) * (p.x + 0.004), p.y, Math.cos(ph) * (p.x + 0.004))), 0.008, 0.006, 5), seam)));
    head.add(mesh(bentCone(0.045, 0.11, -0.05, 10), husk, V(0, 0.27, -0.04), [-0.6, 0, 0])); // the hood's tip, curling back
    // one arm holds a little lantern, the other is tucked in
    const pr = pivot('wingR', 0.3, 0.6, 0.04); body.add(pr);
    pr.add(mesh(new THREE.CapsuleGeometry(0.05, 0.14, 4, 8), mat(a.c1, { name: 'skin' }), V(0.05, -0.08, 0.06), [0.9, 0, 0.4]));
    const lan = new THREE.Group(); lan.position.set(0.1, -0.2, 0.17); pr.add(lan);
    lan.add(mesh(new THREE.TorusGeometry(0.025, 0.006, 5, 12, Math.PI), metal, V(0, 0.07, 0)));
    lan.add(mesh(cyl(0.05, 0.03, 0.03, 6), metal, V(0, 0.04, 0))); lan.add(mesh(cyl(0.04, 0.05, 0.015, 6), metal, V(0, -0.06, 0)));
    lan.add(ell(light, V(0, -0.01, 0), [0.035, 0.045, 0.035], 12));
    lan.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 6, 1, true), mat('#fff6d8', { opacity: 0.35, side: true, rough: 0.2, name: 'lantern_glass' }), V(0, -0.01, 0)));
    const pl = pivot('wingL', -0.3, 0.58, 0.02); body.add(pl);
    pl.add(mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 8), mat(a.c1, { name: 'skin' }), V(-0.04, -0.1, 0.02), [0, 0, -0.35]));
    // scraps of pages nobody finished writing, drifting close by
    [[-0.36, 0.86, 0.06, 0.4], [0.38, 0.92, -0.1, -0.5], [-0.3, 0.42, -0.2, 0.9]].forEach(([x, y, z, r]) => {
      const pg = new THREE.PlaneGeometry(0.1, 0.13, 3, 1), p = pg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.pow(p.getX(i) / 0.05, 2) * 0.012); pg.computeVertexNormals();
      body.add(mesh(pg, mat('#f4ecd8', { side: true, rough: 0.9, name: 'page' }), V(x, y, z), [0.3, r, r * 0.4]));
      body.add(mesh(new THREE.BoxGeometry(0.06, 0.006, 0.002), mat('#6c5a78', { name: 'ink' }), V(x, y + 0.02, z + 0.012), [0.3, r, r * 0.4]));
    });
    // ink drips at the hem
    [-0.2, 0.05, 0.24].forEach((x, i) => body.add(ell(mat('#2a1e36', { rough: 0.3, name: 'ink_drip' }), V(x, 0.12 + i * 0.02, -0.22 - (i % 2) * 0.05), [0.03, 0.05, 0.03], 8)));
  },
  echolyn(g, a, mat) {
    const { body, head } = g;
    const ringA = mat('#ffb0e4', { emissive: '#ff5fc8', ei: 1.0, rough: 0.3, name: 'ring_a' }), ringB = mat('#b0eeff', { emissive: '#5fd8ff', ei: 1.0, rough: 0.3, name: 'ring_b' });
    // two resonance rings circling the body at odd angles (gravity, weather and time arguing)
    body.add(mesh(new THREE.TorusGeometry(0.44, 0.011, 6, 56), ringA, V(0, 0.54, 0), [Math.PI / 2 + 0.38, 0.22, 0]));
    body.add(mesh(new THREE.TorusGeometry(0.4, 0.009, 6, 56), ringB, V(0, 0.46, 0), [Math.PI / 2 - 0.32, -0.3, 0]));
    // a floating prism above the head
    const crest = pivot('crest', 0, 0.38, 0); head.add(crest);
    crest.add(mesh(new THREE.OctahedronGeometry(0.07, 0), mat('#fff2c8', { emissive: '#ffd0f0', ei: 1.1, rough: 0.15, name: 'prism' }), null, [0, 0.6, 0], [0.8, 1.4, 0.8]));
    crest.add(mesh(new THREE.TorusGeometry(0.1, 0.006, 5, 32), ringB, V(0, -0.02, 0), [Math.PI / 2, 0, 0]));
    // sound-wave chevrons on the belly
    [0.06, 0.1, 0.14].forEach((r, i) => body.add(mesh(new THREE.TorusGeometry(r, 0.008, 5, 16, Math.PI * 0.55), mat(a.c3, { emissive: a.c3, ei: 0.5, name: 'wave' }), V(0, 0.3, 0.336 + i * 0.004), [0, 0, Math.PI * 0.225])));
    // little arms with crystal tips
    [-1, 1].forEach((s) => { const p = pivot(s < 0 ? 'wingL' : 'wingR', s * 0.3, 0.6, 0.02); body.add(p);
      p.add(mesh(new THREE.CapsuleGeometry(0.045, 0.13, 4, 8), mat(a.c1, { name: 'skin' }), V(s * 0.04, -0.1, 0.03), [0, 0, s * 0.4]));
      p.add(mesh(new THREE.OctahedronGeometry(0.04, 0), mat(a.c3, { rough: 0.15, emissive: a.c3, ei: 0.4, name: 'crystal' }), V(s * 0.08, -0.2, 0.05), null, [0.8, 1.4, 0.8])); });
  },
};
export const HERO_IDS = Object.keys(HEROES);

/* ---------------------------------------------------------------- build */
// build(spec) where spec = { id, art } (a roster entry works). Returns { root, clips, info }.
export function buildAmina(spec, opts) {
  opts = opts || {};
  const a = spec.art, mat = opts.mat || matFactory();
  const root = pivot('amina'), rig = pivot('rig'); root.add(rig);
  const body = pivot('body'); rig.add(body);
  const plan = bodyPlan(a, body, mat), head = plan.head;
  addFace(head, plan, a, mat);
  addEars(head, plan.earTop, a, mat, plan.earW);
  addMarks(head, body, plan, a, mat);
  addTail(body, plan.tailAt, a, mat);
  if (a.wings) addWings(body, plan.wingAt, a, mat, a.body === 'moth');
  const feet = [];
  const footMat = mat(shade(a.c1, -0.18), { name: 'foot' });
  plan.feet.forEach(([x, z, r], i) => {
    const name = plan.feet.length > 2 ? (x < 0 ? 'footL' : 'footR') + (z < 0 ? 'B' : '') : x < 0 ? 'footL' : 'footR';
    const f = pivot(name, x, r * 0.55, z); rig.add(f); feet.push(f);
    f.add(plan.thinFeet ? mesh(cyl(0.018, 0.018, 0.12, 6), mat(a.c3, { name: 'leg' }), V(0, -0.02, 0)) : ell(footMat, V(0, 0, 0.02), [r, r * 0.6, r * 1.15], 14));
    if (plan.legs) f.add(mesh(new THREE.CapsuleGeometry(r * 0.62, plan.legs, 4, 12), mat(a.c1, { name: 'skin' }), V(0, plan.legs * 0.55, 0)));
    if (plan.thinFeet) f.add(ell(mat(a.c3, { name: 'toe' }), V(0, -0.04, 0.03), [0.04, 0.015, 0.05], 8));
  });
  const g = { root, rig, body, head, feet, plan };
  if (HEROES[spec.id] && opts.hero !== false) HEROES[spec.id](g, a, mat);
  // hovering bodies float a little above their shadow
  if (isHover(a)) rig.position.y = 0;
  normalise(root, a);
  if (opts.merge !== false) mergeStatic(root);
  root.userData = { id: spec.id, hover: isHover(a), glow: a.glow || null, version: VERSION, hero: !!HEROES[spec.id] };
  const clips = makeClips(root, { hover: isHover(a), wingsBig: a.body === 'moth' });
  return { root, clips, info: summarise(root, clips) };
}

// Scale to a height of 1 (1.08 for "big" creatures), feet on y=0 (hover bodies sit 0.12 up), centred on x.
export function normalise(root, a) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
  const target = (a && a.big ? 1.08 : 1) * (a && isHover(a) ? 0.9 : 1);
  const k = target / Math.max(0.0001, size.y);
  root.scale.setScalar(k);
  root.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(root);
  root.position.x -= (b2.min.x + b2.max.x) / 2;
  root.position.y -= b2.min.y - (a && isHover(a) ? 0.12 : 0);
  root.updateMatrixWorld(true);
  return root;
}

// Merge every static mesh under each animated pivot into one mesh per material (fewer draw calls on iPhone).
export function mergeStatic(root) {
  const pivots = new Set(); root.traverse((o) => { if (RIG_NODES.indexOf(o.name) >= 0 || /^foot/.test(o.name)) pivots.add(o); });
  pivots.forEach((pv) => {
    const groups = new Map(); const kill = [];
    const visit = (o, m) => {
      o.children.forEach((c) => {
        if (pivots.has(c)) return; // a child pivot is merged separately
        const cm = new THREE.Matrix4().multiplyMatrices(m, new THREE.Matrix4().compose(c.position, c.quaternion, c.scale));
        if (c.isMesh) {
          const geo = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
          ['uv', 'uv1', 'uv2'].forEach((k) => geo.deleteAttribute(k)); geo.applyMatrix4(cm);
          if (!geo.attributes.normal) geo.computeVertexNormals();
          const key = c.material.uuid; if (!groups.has(key)) groups.set(key, { mat: c.material, geos: [] }); groups.get(key).geos.push(geo);
          kill.push(c);
        }
        visit(c, cm);
        if (!c.isMesh && c.children.every((x) => x.isMesh || kill.indexOf(x) >= 0)) kill.push(c);
      });
    };
    visit(pv, new THREE.Matrix4());
    kill.forEach((o) => { if (o.parent && !pivots.has(o)) o.parent.remove(o); });
    groups.forEach(({ mat, geos }) => { const merged = mergeVertices(mergeGeometries(geos, false), 1e-4); geos.forEach((x) => x.dispose()); const me = new THREE.Mesh(merged, mat); me.name = pv.name + ':' + mat.name; pv.add(me); });
  });
  return root;
}

/* ---------------------------------------------------------------- animation clips */
const qOf = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
function track(node, prop, keys, rest) {
  // keys: [[t, value]] where value is an offset from the rest pose ([x,y,z] for position/rotation, [x,y,z] multipliers for scale)
  const times = keys.map((k) => k[0]); let values = [];
  if (prop === 'position') keys.forEach(([, v]) => values.push(rest.position.x + v[0], rest.position.y + v[1], rest.position.z + v[2]));
  else if (prop === 'scale') keys.forEach(([, v]) => values.push(rest.scale.x * v[0], rest.scale.y * v[1], rest.scale.z * v[2]));
  else { keys.forEach(([, v]) => { const q = rest.quaternion.clone().multiply(qOf(v[0], v[1], v[2])); values.push(q.x, q.y, q.z, q.w); }); }
  const T = prop === 'quaternion' ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
  return new T(node.name + '.' + prop, times, values);
}
// makeClips(root): builds the six clips for whichever rig nodes exist under root (works for imported models too).
export function makeClips(root, o) {
  o = o || {};
  const n = {}; root.traverse((x) => { if (x.name && !n[x.name]) n[x.name] = x; });
  const has = (k) => !!n[k];
  const T = (k, prop, keys) => (has(k) ? [track(n[k], prop, keys, n[k])] : []);
  const ears = (keysL) => T('earL', 'quaternion', keysL).concat(T('earR', 'quaternion', keysL.map(([t, v]) => [t, [v[0], -v[1], -v[2]]])));
  const wings = (keysL) => T('wingL', 'quaternion', keysL).concat(T('wingR', 'quaternion', keysL.map(([t, v]) => [t, [v[0], -v[1], -v[2]]])));
  const feetAlt = (dur, amp) => {
    const out = []; Object.keys(n).filter((k) => /^foot/.test(k)).forEach((k, i) => { const ph = (i % 2) ? 0.5 : 0; const s = (t) => [Math.sin((t / dur + ph) * Math.PI * 2) * amp, 0, 0];
      out.push(...T(k, 'quaternion', [0, 0.25, 0.5, 0.75, 1].map((f) => [f * dur, s(f * dur)]))); out.push(...T(k, 'position', [0, 0.25, 0.5, 0.75, 1].map((f) => [f * dur, [0, Math.max(0, Math.sin((f + ph) * Math.PI * 2)) * 0.04, 0]]))); });
    return out;
  };
  const zero = [0, 0, 0], one = [1, 1, 1], hv = o.hover ? 1 : 0;
  const clips = [];
  // idle — a breathing loop with a blink, ear sway and a lazy tail
  const idleD = 2.4;
  clips.push(new THREE.AnimationClip('idle', idleD, [
    ...T('rig', 'position', [[0, zero], [idleD / 2, [0, 0.012 + hv * 0.035, 0]], [idleD, zero]]),
    ...T('body', 'scale', [[0, one], [idleD / 2, [0.985, 1.03, 0.985]], [idleD, one]]),
    ...T('head', 'quaternion', [[0, zero], [0.6, [0.04, 0, 0.05]], [1.2, zero], [1.8, [0.04, 0, -0.05]], [idleD, zero]]),
    ...ears([[0, zero], [0.8, [0, 0, 0.14]], [1.6, [0, 0, -0.05]], [idleD, zero]]),
    ...T('crest', 'quaternion', [[0, zero], [1.2, [0.08, 0, 0]], [idleD, zero]]),
    ...T('tail', 'quaternion', [[0, zero], [0.6, [0, 0.35, 0.1]], [1.2, zero], [1.8, [0, -0.35, -0.1]], [idleD, zero]]),
    ...wings(o.wingsBig ? [[0, zero], [0.3, [0, 0.45, 0]], [0.6, zero], [0.9, [0, 0.45, 0]], [1.2, zero], [1.5, [0, 0.45, 0]], [1.8, zero], [2.1, [0, 0.45, 0]], [idleD, zero]]
      : [[0, zero], [1.2, [0, 0, 0.15]], [idleD, zero]]),
    ...T('eyes', 'scale', [[0, one], [1.95, one], [2.03, [1, 0.12, 1]], [2.11, one], [idleD, one]]),
  ]));
  // move — two happy hops with squash and stretch
  const mvD = 0.8;
  clips.push(new THREE.AnimationClip('move', mvD, [
    ...T('rig', 'position', [[0, zero], [0.2, [0, 0.1, 0]], [0.4, zero], [0.6, [0, 0.1, 0]], [mvD, zero]]),
    ...T('rig', 'scale', [[0, one], [0.08, [1.06, 0.92, 1.06]], [0.2, [0.96, 1.06, 0.96]], [0.36, [1.04, 0.95, 1.04]], [0.4, one], [0.48, [1.06, 0.92, 1.06]], [0.6, [0.96, 1.06, 0.96]], [0.76, [1.04, 0.95, 1.04]], [mvD, one]]),
    ...T('tail', 'quaternion', [[0, zero], [0.2, [0, 0.4, 0]], [0.4, zero], [0.6, [0, -0.4, 0]], [mvD, zero]]),
    ...ears([[0, zero], [0.2, [-0.25, 0, 0]], [0.4, zero], [0.6, [-0.25, 0, 0]], [mvD, zero]]),
    ...wings([[0, zero], [0.1, [0, 0, 0.6]], [0.2, zero], [0.3, [0, 0, 0.6]], [0.4, zero], [0.5, [0, 0, 0.6]], [0.6, zero], [0.7, [0, 0, 0.6]], [mvD, zero]]),
    ...feetAlt(mvD, 0.5),
  ]));
  // attack — anticipation, lunge forward (+Z, towards the foe), snap back
  const atD = 0.9;
  clips.push(new THREE.AnimationClip('attack', atD, [
    ...T('rig', 'position', [[0, zero], [0.18, [0, 0.02, -0.1]], [0.36, [0, 0.06, 0.6]], [0.48, [0, 0, 0.58]], [atD, zero]]),
    ...T('rig', 'quaternion', [[0, zero], [0.18, [-0.2, 0, 0]], [0.36, [0.25, 0, 0]], [0.6, [0.05, 0, 0]], [atD, zero]]),
    ...T('rig', 'scale', [[0, one], [0.18, [1.07, 0.9, 1.07]], [0.36, [0.93, 1.1, 0.93]], [0.6, one], [atD, one]]),
    ...T('head', 'quaternion', [[0, zero], [0.18, [-0.15, 0, 0]], [0.36, [0.3, 0, 0]], [atD, zero]]),
    ...ears([[0, zero], [0.18, [-0.4, 0, 0]], [0.36, [-0.6, 0, 0]], [atD, zero]]),
    ...T('tail', 'quaternion', [[0, zero], [0.36, [0.5, 0, 0]], [atD, zero]]),
    ...wings([[0, zero], [0.18, [0, 0, 0.7]], [0.36, [0, 0, -0.3]], [atD, zero]]),
  ]));
  // hit — recoil, wince, recover
  const hD = 0.55;
  clips.push(new THREE.AnimationClip('hit', hD, [
    ...T('rig', 'position', [[0, zero], [0.1, [0, 0, -0.24]], [0.3, [0, 0, -0.05]], [hD, zero]]),
    ...T('rig', 'quaternion', [[0, zero], [0.1, [-0.28, 0, 0.06]], [0.3, [0.05, 0, 0]], [hD, zero]]),
    ...T('rig', 'scale', [[0, one], [0.1, [1.1, 0.86, 1.1]], [0.25, [0.97, 1.04, 0.97]], [hD, one]]),
    ...T('eyes', 'scale', [[0, one], [0.08, [1, 0.15, 1]], [0.4, [1, 0.15, 1]], [hD, one]]),
    ...ears([[0, zero], [0.1, [0, 0, 0.5]], [hD, zero]]),
  ]));
  // victory — crouch, spin jump, bounce
  const vD = 1.5;
  const spin = [0, 0.25, 0.5, 0.75, 1].map((f) => [0.15 + f * 0.6, [0, f * Math.PI * 2, 0]]);
  clips.push(new THREE.AnimationClip('victory', vD, [
    ...T('rig', 'position', [[0, zero], [0.15, [0, -0.03, 0]], [0.45, [0, 0.45, 0]], [0.75, zero], [1.0, [0, 0.18, 0]], [1.2, zero], [vD, zero]]),
    ...T('rig', 'quaternion', [[0, zero], ...spin, [vD, zero]]),
    ...T('rig', 'scale', [[0, one], [0.15, [1.08, 0.88, 1.08]], [0.3, [0.92, 1.1, 0.92]], [0.75, [1.08, 0.9, 1.08]], [0.9, one], [1.2, [1.05, 0.93, 1.05]], [1.32, one], [vD, one]]),
    ...ears([[0, zero], [0.3, [0, 0, -0.3]], [0.75, [0, 0, 0.25]], [1.1, [0, 0, -0.2]], [vD, zero]]),
    ...wings([[0, zero], [0.2, [0, 0, 0.8]], [0.35, zero], [0.5, [0, 0, 0.8]], [0.65, zero], [0.8, [0, 0, 0.8]], [vD, zero]]),
    ...T('tail', 'quaternion', [[0, zero], [0.3, [0, 0.6, 0]], [0.6, [0, -0.6, 0]], [0.9, [0, 0.6, 0]], [1.2, [0, -0.6, 0]], [vD, zero]]),
  ]));
  // defeat — wobble and topple over (holds its last pose)
  const dD = 1.2;
  clips.push(new THREE.AnimationClip('defeat', dD, [
    ...T('rig', 'position', [[0, zero], [0.2, [0, 0.04, 0]], [0.8, [0.18, -0.04 - hv * 0.1, 0]], [dD, [0.2, -0.05 - hv * 0.1, 0]]]),
    ...T('rig', 'quaternion', [[0, zero], [0.2, [0, 0, -0.15]], [0.8, [0, 0, 1.4]], [0.95, [0, 0, 1.3]], [dD, [0, 0, 1.38]]]),
    ...T('eyes', 'scale', [[0, one], [0.4, [1, 0.1, 1]], [dD, [1, 0.1, 1]]]),
    ...ears([[0, zero], [0.6, [0.6, 0, 0.4]], [dD, [0.6, 0, 0.4]]]),
    ...T('tail', 'quaternion', [[0, zero], [dD, [0.8, 0, 0]]]),
  ]));
  return clips;
}

/* ---------------------------------------------------------------- validation (pipeline + tests) */
export function summarise(root, clips) {
  root.updateMatrixWorld(true);
  let tris = 0, meshes = 0; const mats = new Set(), names = new Set(); let maxTex = 0;
  root.traverse((o) => {
    if (o.name) names.add(o.name);
    if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { mats.add(m); ['map', 'normalMap', 'emissiveMap', 'roughnessMap'].forEach((k) => { const t = m[k]; if (t && t.image) maxTex = Math.max(maxTex, t.image.width || 0, t.image.height || 0); }); }); }
  });
  const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
  return { tris: Math.round(tris), meshes, materials: mats.size, maxTexture: maxTex, height: +size.y.toFixed(3), width: +size.x.toFixed(3), depth: +size.z.toFixed(3),
    minY: +box.min.y.toFixed(3), centerX: +((box.min.x + box.max.x) / 2).toFixed(3), nodes: [...names], clips: (clips || []).map((c) => ({ name: c.name, duration: +c.duration.toFixed(3), tracks: c.tracks.length })) };
}
// Returns { ok, errors[], warnings[], info }. Used by tools/creature-pipeline.js and the tests.
export function validate(root, clips, o) {
  o = o || {};
  const info = summarise(root, clips), errors = [], warnings = [];
  if (root.name !== 'amina') errors.push('root node must be named "amina"');
  if (info.nodes.indexOf('rig') < 0) errors.push('missing "rig" node');
  const hMin = o.hover ? 0.85 : BUDGET.heightMin;
  if (info.height < hMin || info.height > BUDGET.heightMax) errors.push('height ' + info.height + ' outside ' + hMin + '–' + BUDGET.heightMax);
  if (info.minY < -0.02 || info.minY > (o.hover ? 0.2 : 0.03)) errors.push('feet not on the ground (min y ' + info.minY + ')');
  if (Math.abs(info.centerX) > 0.06) errors.push('not centred on x (' + info.centerX + ')');
  if (info.tris > BUDGET.tris) errors.push('too many triangles: ' + info.tris + ' > ' + BUDGET.tris);
  if (info.meshes > BUDGET.meshes) errors.push('too many meshes/draw calls: ' + info.meshes + ' > ' + BUDGET.meshes);
  if (info.maxTexture > BUDGET.texture) errors.push('texture larger than ' + BUDGET.texture + 'px: ' + info.maxTexture);
  CLIP_NAMES.forEach((c) => { if (!(clips || []).some((x) => x.name === c)) errors.push('missing clip "' + c + '"'); });
  (clips || []).forEach((c) => {
    c.tracks.forEach((t) => { const nn = t.name.split('.')[0]; if (info.nodes.indexOf(nn) < 0) errors.push('clip ' + c.name + ' targets missing node ' + nn); });
    if (c.name !== 'defeat') c.tracks.forEach((t) => { const s = t.getValueSize(), v = t.values, L = v.length; for (let i = 0; i < s; i++) if (Math.abs(v[i] - v[L - s + i]) > 1e-4) { errors.push('clip ' + c.name + ' does not return to its start pose (' + t.name + ')'); break; } });
  });
  const head = root.getObjectByName('head'), body = root.getObjectByName('body');
  if (head && body) { const eyes = root.getObjectByName('eyes') || head; const ez = new THREE.Box3().setFromObject(eyes).getCenter(new THREE.Vector3()).z, rz = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3()).z; if (ez < rz - 0.01) errors.push('face points away from +Z'); }
  else warnings.push('no head/body nodes: only whole-body animation is possible');
  ['earL', 'tail', 'eyes'].forEach((k) => { if (info.nodes.indexOf(k) < 0) warnings.push('no "' + k + '" node'); });
  return { ok: !errors.length, errors, warnings: [...new Set(warnings)], info };
}

/* ---------------------------------------------------------------- lighting
   One lighting recipe for every 3D view (battle, viewer, portraits) so creatures look the same everywhere:
   a warm key from the upper left (matches the island art), a cool sky fill and a strong back rim light that
   separates the silhouette from busy backgrounds. */
export function studioLights(scene, mood) {
  const m = { day: ['#fff3dc', '#cfe4ff', '#7a8a6a', '#ffffff'], dusk: ['#ffd9b0', '#b8b0ff', '#4a3a5a', '#ffd0f0'], dark: ['#e8dcff', '#8a7ad8', '#2a2040', '#c8b8ff'], studio: ['#fff6e8', '#dfeaff', '#6a6a80', '#ffffff'] }[mood || 'studio'];
  const g = new THREE.Group(); g.name = 'lights';
  const hemi = new THREE.HemisphereLight(m[1], m[2], 1.25); g.add(hemi);
  const key = new THREE.DirectionalLight(m[0], 2.3); key.position.set(-2.5, 4, 3.2); g.add(key);
  const rim = new THREE.DirectionalLight(m[3], 1.7); rim.position.set(2.2, 2.4, -3.5); g.add(rim);
  const fill = new THREE.DirectionalLight(m[1], 0.45); fill.position.set(3, 1, 2.5); g.add(fill);
  scene.add(g); return g;
}

/* ---------------------------------------------------------------- import helpers (external GLB → rig contract) */
// Wrap an arbitrary loaded scene (e.g. a Meshy/Blender export) into amina > rig > model, turn it Y-up and facing +Z,
// normalise it, guess pivots from part names (head/tail/wing/ear/leg), merge static meshes and generate clips.
export function adoptModel(scene, o) {
  o = o || {};
  const root = pivot('amina'), rig = pivot('rig'); root.add(rig);
  const holder = new THREE.Group(); holder.name = 'model'; rig.add(holder); holder.add(scene);
  scene.traverse((x) => { if (RIG_NODES.indexOf(x.name) >= 0 || /^foot/.test(x.name)) x.name += '_src'; });
  // 1) up axis: Z-up sources (trimesh, many CAD tools) are turned Y-up. 2) facing: the source's "front" axis, given in
  // source coordinates (+x, -x, +y, -y, +z, -z), is turned to +Z after the up conversion.
  const upQ = new THREE.Quaternion(); if (o.up === 'z') upQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const ax = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] }[o.facing || '+z'] || [0, 0, 1];
  const f = new THREE.Vector3(...ax).applyQuaternion(upQ); const yaw = Math.atan2(f.x, f.z);
  holder.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw).multiply(upQ));
  root.updateMatrixWorld(true);
  // pivots from names
  const report = { pivots: {}, floating: [] };
  const meshes = []; scene.traverse((m) => { if (m.isMesh) meshes.push(m); });
  const bodyBox = new THREE.Box3(); meshes.forEach((m) => { if (/torso|body|core|chest/i.test(m.name + ' ' + (m.parent && m.parent.name))) bodyBox.expandByObject(m); });
  if (bodyBox.isEmpty()) meshes.forEach((m) => bodyBox.expandByObject(m));
  const all = new Box3All(meshes);
  const rules = [['head', /head|skull|muzzle|snout|jaw|eye|brow|nose|horn|ear|crest|forehead/i], ['tail', /tail/i], ['wing', /wing/i], ['foot', /leg|foot|paw|claw|thigh|shin|knee|toe|hip/i]];
  const buckets = { head: [], tail: [], wingL: [], wingR: [], footL: [], footR: [] };
  meshes.forEach((m) => {
    const nm = m.name + ' ' + (m.parent ? m.parent.name : ''); const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()); const side = c.x < all.cx ? 'L' : 'R';
    for (const [k, re] of rules) if (re.test(nm)) { if (k === 'wing') buckets['wing' + side].push(m); else if (k === 'foot') buckets['foot' + side].push(m); else buckets[k].push(m); break; }
  });
  const reparent = (name, list, where) => {
    if (!list.length) return null; const box = new THREE.Box3(); list.forEach((m) => box.expandByObject(m));
    const p = where(box); const pv = pivot(name, 0, 0, 0); pv.position.copy(rig.worldToLocal(p.clone())); rig.add(pv); pv.updateMatrixWorld(true);
    list.forEach((m) => pv.attach(m)); report.pivots[name] = list.length; return pv;
  };
  reparent('head', buckets.head, (b) => new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2));
  reparent('tail', buckets.tail, (b) => new THREE.Vector3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, b.max.z));
  reparent('wingL', buckets.wingL, (b) => new THREE.Vector3(b.max.x, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2));
  reparent('wingR', buckets.wingR, (b) => new THREE.Vector3(b.min.x, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2));
  reparent('footL', buckets.footL, (b) => new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2));
  reparent('footR', buckets.footR, (b) => new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2));
  // detached parts: group meshes whose (slightly expanded) boxes touch; every group except the biggest is detached
  const size = all.box.getSize(new THREE.Vector3()).length() * 0.01;
  const boxes = meshes.map((m) => new THREE.Box3().setFromObject(m).expandByScalar(size)), parent = meshes.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < meshes.length; i++) for (let j = i + 1; j < meshes.length; j++) if (boxes[i].intersectsBox(boxes[j])) parent[find(i)] = find(j);
  const groups = {}; meshes.forEach((m, i) => { (groups[find(i)] = groups[find(i)] || []).push(m.name || '(unnamed)'); });
  const sorted = Object.values(groups).sort((x, y) => y.length - x.length);
  report.floating = sorted.slice(1).map((g) => g.join(' + '));
  // left/right balance: limbs present on one side only
  report.asymmetric = ['wing', 'foot'].filter((k) => !!buckets[k + 'L'].length !== !!buckets[k + 'R'].length);
  const body = pivot('body'); rig.add(body); body.attach(holder);
  normalise(root, { big: false });
  mergeStatic(root);
  const clips = makeClips(root, { hover: false });
  return { root, clips, report };
}
function Box3All(meshes) { const box = new THREE.Box3(); meshes.forEach((m) => box.expandByObject(m)); this.box = box; this.cx = (box.min.x + box.max.x) / 2; }

export { THREE };

/* ---------------------------------------------------------------- v0.7 voxel creatures */
// Builds a creature from the same voxel model the 2D portraits use (window.A.Voxel), so 2D and 3D always match.
// Greedy meshing merges same-coloured faces into larger quads (a few thousand triangles per creature). Glowing
// voxels go in a second mesh with brightened colours. The model faces +x; it is turned to face +z like every
// other creature here, then normalised and animated with the shared clips (rig / body pivots).
export function voxelGeometry(m, glowPass) {
  const pos = [], col = [], idx = [], c = new THREE.Color();
  const lo = m.min, hi = m.max;
  const get = (x, y, z) => m.get(x, y, z);
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, v = (d + 2) % 3, du = hi[u] - lo[u] + 1, dv = hi[v] - lo[v] + 1;
    for (const sgn of [1, -1]) {
      for (let s = lo[d]; s <= hi[d]; s++) {
        const mask = new Array(du * dv).fill(null), p = [0, 0, 0];
        for (let j = 0; j < dv; j++) for (let i = 0; i < du; i++) {
          p[d] = s; p[u] = lo[u] + i; p[v] = lo[v] + j;
          const a = get(p[0], p[1], p[2]); if (!a || (a.g > 0.5) !== glowPass) continue;
          p[d] = s + sgn; if (m.has(p[0], p[1], p[2])) continue;
          mask[i + j * du] = a.c + (a.g ? '|' + a.g : '');
        }
        for (let j = 0; j < dv; j++) for (let i = 0; i < du; ) {
          const k = mask[i + j * du]; if (!k) { i++; continue; }
          let w = 1; while (i + w < du && mask[i + w + j * du] === k) w++;
          let h = 1; grow: for (; j + h < dv; h++) for (let q = 0; q < w; q++) if (mask[i + q + (j + h) * du] !== k) break grow;
          for (let y = 0; y < h; y++) for (let q = 0; q < w; q++) mask[i + q + (j + y) * du] = null;
          const plane = s + (sgn > 0 ? 1 : 0), base = pos.length / 3;
          const corner = (a2, b2) => { const q = [0, 0, 0]; q[d] = plane; q[u] = lo[u] + a2; q[v] = lo[v] + b2; pos.push(q[0], q[1], q[2]); };
          corner(i, j); corner(i + w, j); corner(i + w, j + h); corner(i, j + h);
          const hex = k.split('|')[0]; c.set(hex); if (glowPass) c.multiplyScalar(1.9);
          // a little baked light: tops brighter, undersides darker (reads well even under flat lighting)
          const lift = d === 1 ? (sgn > 0 ? 1.12 : 0.62) : d === 0 ? 0.95 : 0.86; if (!glowPass) c.multiplyScalar(lift);
          for (let n = 0; n < 4; n++) col.push(c.r, c.g, c.b);
          if (sgn > 0) idx.push(base, base + 1, base + 2, base, base + 2, base + 3); else idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
          i += w;
        }
      }
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
export function buildVoxel(spec) {
  const Vx = window.A && window.A.Voxel, art = spec.art;
  const m = Vx.model(art.vox, art.st || 1);
  const root = pivot('amina'), rig = pivot('rig'); root.add(rig);
  const body = pivot('body'); rig.add(body);
  const holder = new THREE.Group(); holder.rotation.y = -Math.PI / 2; body.add(holder);
  const cx = (m.min[0] + m.max[0] + 1) / 2, cz = (m.min[2] + m.max[2] + 1) / 2;
  const solid = voxelGeometry(m, false), glow = voxelGeometry(m, true);
  if (solid) { solid.translate(-cx, 0, -cz); const me = new THREE.Mesh(solid, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true, name: 'voxel' })); me.name = 'body:voxel'; holder.add(me); }
  if (glow) { glow.translate(-cx, 0, -cz); const me = new THREE.Mesh(glow, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, flatShading: true, emissive: '#000000', name: 'voxelGlow', toneMapped: false })); me.name = 'body:glow'; holder.add(me); }
  normalise(root, { big: spec.stage === 3 });
  root.userData = { id: spec.id, hover: false, glow: null, version: VERSION, voxel: true };
  const clips = makeClips(root, {});
  return { root, clips, info: summarise(root, clips) };
}
