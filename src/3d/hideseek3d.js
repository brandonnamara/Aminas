/* Aminas — Hide and Seek, the 3D round (hs-redesign, ES module). Draws the Starter Island exactly as the island
   screen builds it (the same terrain voxels, the same building, tree, rock and dock models, the same materials, the
   same leaf sway and per-specimen tint), the disguised hiders, the Seeker, and the round's short effects.

   A disguised hider is drawn with the same geometry, material and tint rule as the genuine object it copies, as its
   own one-instance batch, so it is indistinguishable by sight; nothing marks it as a player (no face, outline or
   lingering effect). Only the player's own disguise carries a small marker, and only on the player's own screen.

   Seekers: a male and a female voxel seeker built here (temporary, in the island's voxel style). A Tripo export can
   replace either: set D.HIDESEEK.seekerGlb.male / .female to a .glb path and it is loaded instead (clips named
   idle / walk / attack / reveal are used when present; otherwise the parts are animated procedurally).

   Cost: one terrain mesh, instanced batches for scenery, one small draw per player, one instanced mesh for all
   effect cubes. The loop runs only during a round, capped at 30 fps (20 in Battery saver), and stops on exit. Shadows
   are redrawn only when a disguised object moves or changes (at most 8 times a second); Battery saver turns them
   off. Reduce Motion keeps the round fully playable with fewer, shorter effects and no camera shake. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { VoxGrid, meshGrid, hash, pick } from './voxmesh.js';
import { PAL, TV, DV, UNIT_PX, HEIGHT_PX, LIGHT } from './voxstyle.js';
import * as VB from './voxbuild.js';
import './library/vegetation.js'; import './library/terrain.js'; import './library/decor.js';
import { buildTerrain } from './island3d.js';

const A = window.A;
const COARSE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const RIGHT = new THREE.Vector3(1, 0, -1).normalize(), UP = new THREE.Vector3(-16, HEIGHT_PX, -16).normalize();
const BACK = new THREE.Vector3().crossVectors(RIGHT, UP).normalize();
const saver = () => !!(A && A.Perf && (A.Perf.saver() || A.Perf.forceTier === 'saver'));
const calm = () => !!(A && A.State && A.State.state && A.State.state.settings && A.State.state.settings.reduceMotion) || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const tier = () => (A && A.Perf && A.Perf.tier ? A.Perf.tier() : { prCap: COARSE ? 1.5 : 2, shadowMap: COARSE ? 1024 : 2048, natureLod: false });
const SWAY = { oak: 1, pine: 1, bush: 1 };

/* ------------------------------------------------------------------ models for a descriptor (the island's own) */
export function modelFor(d) {
  if (!d) return null;
  if (d.src === 'b') return VB.hasBuilding(d.art, d.cat) ? VB.buildingModel({ type: d.type, level: d.level, state: d.state, rot: d.rot }, { w0: d.w0, h0: d.h0 }, { art: d.art, cat: d.cat }) : null;
  if (d.src === 'o') return VB.hasNature(d.type) ? VB.natureModel(d.type, d.seed, d.w, d.h) : null;
  if (d.src === 's') return VB.hasNature(d.kind) ? VB.natureModel(d.kind, d.seed) : null;
  if (d.src === 'x') return VB.hasExtra(d.kind) ? VB.extraModel(d.kind) : null;
  return null;
}
export const hasModel = (d) => !!modelFor(d);
const swaysFor = (d) => (d.src === 'o' ? !!SWAY[d.type] : d.src === 's' ? !d.still : false);
const natureFor = (d) => d.src === 'o' || d.src === 's';
// the island's per-specimen tint (island3d.js sync0): a sunnier or shadier tree, from its position
const tintAt = (x, z) => { const a = hash(Math.round(x * 16), Math.round(z * 16), 131), w = hash(Math.round(z * 16), Math.round(x * 16), 132) - 0.5, l = 0.9 + a * 0.16; return new THREE.Color(l * (1 + w * 0.08), l, l * (1 - w * 0.1)); };

/* ------------------------------------------------------------------ the voxel seekers (temporary) */
// Built from parts so they can walk, turn, swing and celebrate. Faces +x. look: 'male' | 'female'; colours: skin,
// hair (the player's avatar colours when the player is the Seeker).
const SV = 0.085;
function part(fill, nx, ny, nz, ox, oy, oz) { const g = new VoxGrid(0, 0, 0, nx, ny, nz); fill(g); return meshGrid(g, { size: SV, origin: [ox * SV, oy * SV, oz * SV] }); }
export function buildSeeker(look, colours) {
  const fem = look === 'female', skin = colours.skin || '#f7c4a4', hair = colours.hair || (fem ? '#7a4a2a' : '#2a2238');
  const tunic = fem ? ['#8a5ad8', '#7a4cc4'] : ['#2fa7a0', '#278f8a'], trim = fem ? '#ffd6f4' : '#ffd86b', dark = '#3a2a44', boot = '#5a3a1e', trous = fem ? '#4a3a6a' : '#34485e';
  const mats = { solid: new THREE.MeshLambertMaterial({ vertexColors: true }), glow: new THREE.MeshBasicMaterial({ vertexColors: true }) };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const mk = (geo, mat) => { const m = new THREE.Mesh(geo, mat || mats.solid); m.castShadow = false; return m; };
  const P = {};
  // legs: pivot at the hip (y = 5 voxels)
  [-1, 1].forEach((side, i) => {
    const g = new THREE.Group(); g.position.set(0, 5 * SV, side * 1.1 * SV);
    g.add(mk(part((v) => { v.box(0, 0, 0, 2, 2, 2, boot); v.box(0, 2, 0, 2, 5, 2, trous); v.set(1, 0, 0, '#3a2412'); }, 2, 5, 2, -1, -5, -1)));
    body.add(g); P[i ? 'legR' : 'legL'] = g;
  });
  // torso
  const torso = new THREE.Group(); torso.position.set(0, 5 * SV, 0); body.add(torso); P.torso = torso;
  torso.add(mk(part((v) => { v.box(0, 0, 0, 3, 6, 5, (x, y, z) => ((x + y + z) % 3 ? tunic[0] : tunic[1])); v.box(0, 0, 0, 3, 1, 5, trim); v.set(2, 0, 2, '#fff3b0'); v.box(0, 5, 0, 3, 6, 5, trim); if (fem) { v.box(0, 0, 0, 3, 1, 5, trim); v.box(-0, 1, 0, 3, 2, 5, tunic[1]); } else { v.set(2, 3, 1, trim); v.set(2, 3, 3, trim); } }, 3, 6, 5, -1.5, 0, -2.5)));
  if (fem) torso.add(mk(part((v) => { v.box(0, 0, 0, 4, 2, 6, tunic[1]); v.box(0, 0, 0, 4, 1, 6, trim); }, 4, 2, 6, -2, -1.6, -3))); // a flared skirt hem
  // head: pivot at the neck
  const head = new THREE.Group(); head.position.set(0, 6 * SV, 0); torso.add(head); P.head = head;
  head.add(mk(part((v) => {
    v.box(0, 0, 0, 5, 5, 5, skin); v.set(4, 2, 1, dark); v.set(4, 2, 3, dark); v.set(4, 3, 1, '#ffffff'); v.set(4, 3, 3, '#ffffff'); v.set(4, 1, 2, '#e89a8a');
    v.box(0, 4, 0, 5, 6, 5, hair); v.box(0, 1, 0, 1, 5, 5, hair); v.box(1, 2, 0, 4, 5, 1, hair); v.box(1, 2, 4, 4, 5, 5, hair); v.box(4, 4, 0, 5, 5, 5, hair);
    if (fem) { v.box(0, -3, 0, 1, 2, 5, hair); v.box(0, -2, 0, 2, 2, 1, hair); v.box(0, -2, 4, 2, 2, 5, hair); v.set(4, 4, 2, '#ffd6f4'); } else { v.set(4, 5, 1, hair); v.set(4, 5, 2, hair); }
  }, 5, 7, 5, -2.5, 0, -2.5)));
  if (fem) { const tail = new THREE.Group(); tail.position.set(-2.5 * SV, 4.5 * SV, 0); head.add(tail); P.tail = tail; tail.add(mk(part((v) => { v.box(0, 0, 0, 2, 2, 2, hair); v.box(-1, -4, 0, 1, 1, 2, hair); v.box(-1, -3, 0, 1, 0, 2, hair); v.box(0, -3, 0, 1, 0, 2, hair); v.set(1, 0, 0, trim); }, 2, 2, 2, -2, -1, -1))); tail.add(mk(part((v) => v.box(0, 0, 0, 1, 4, 2, hair), 1, 4, 2, -2.6, -4.6, -1))); }
  // arms: pivot at the shoulder; the right hand holds the prism staff
  [-1, 1].forEach((side, i) => {
    const g = new THREE.Group(); g.position.set(0, 5.6 * SV, side * 3.2 * SV); torso.add(g);
    g.add(mk(part((v) => { v.box(0, 0, 0, 2, 5, 2, tunic[1]); v.box(0, 0, 0, 2, 1, 2, trim); v.box(0, -1, 0, 2, 0, 2, skin); v.box(0, -2, 0, 2, -1, 2, skin); }, 2, 5, 2, -1, -5, -1)));
    g.add(mk(part((v) => v.box(0, 0, 0, 2, 1, 2, skin), 2, 1, 2, -1, -6, -1)));
    P[i ? 'armR' : 'armL'] = g;
  });
  // the prism staff: a dark rod with a glowing prism head, held forward
  const staff = new THREE.Group(); staff.position.set(0.4 * SV, -5.5 * SV, 0); P.armR.add(staff); P.staff = staff;
  staff.add(mk(part((v) => { v.box(0, 0, 0, 1, 12, 1, '#5a3a2a'); v.set(0, 11, 0, '#ffd86b'); }, 1, 12, 1, -0.5, -4, -0.5)));
  const gem = mk(part((v) => { v.box(1, 0, 1, 2, 4, 2, '#a8e4ff'); v.box(0, 1, 1, 3, 3, 2, '#e2d4ff'); v.box(1, 1, 0, 2, 3, 3, '#ffd6f4'); v.set(1, 4, 1, '#ffffff'); }, 3, 5, 3, -1.5, 8, -1.5), mats.glow);
  staff.add(gem); P.gem = gem; staff.rotation.z = -0.2; staff.position.z = 1.1 * SV;
  root.userData = { P, mats, h: 16 * SV };
  return root;
}

/* ------------------------------------------------------------------ the spirit (a hider before it disguises) */
function buildWisp() {
  const g = new VoxGrid(-2, 0, -2, 5, 6, 5); const c = ['#a8e4ff', '#e2d4ff', '#ffd6f4', '#fff3b0'];
  for (let y = 0; y < 6; y++) { const r = y < 3 ? y : 5 - y; for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) if (Math.abs(x) + Math.abs(z) <= r) g.set(x, y, z, c[(x + y + z + 9) % 4]); }
  return meshGrid(g, { size: 0.07, origin: [-0.035, 0, -0.035], ao: false });
}

/* ------------------------------------------------------------------ the view */
export function createView(host, map, m, opts) {
  opts = opts || {};
  const R = new THREE.WebGLRenderer({ antialias: !COARSE, alpha: true, powerPreference: 'default' });
  R.setClearColor(0x000000, 0); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping; R.toneMappingExposure = LIGHT.exposure || 1;
  const useShadows = !saver() && tier().shadows !== false; R.shadowMap.enabled = useShadows; R.shadowMap.type = THREE.PCFShadowMap; R.shadowMap.autoUpdate = false;
  R.domElement.className = 'hs3d'; host.appendChild(R.domElement);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 200); camera.up.copy(UP);
  scene.add(new THREE.HemisphereLight(LIGHT.sky, LIGHT.ground, LIGHT.hemi));
  const sun = new THREE.DirectionalLight(LIGHT.sun, LIGHT.sunI); sun.castShadow = useShadows; scene.add(sun); scene.add(sun.target);
  if (useShadows) { const sm = Math.min(2048, tier().shadowMap || 1024); sun.shadow.mapSize.set(sm, sm); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3; }
  const uni = { uTime: { value: 0 } }, dispose = [];
  const matSolid = new THREE.MeshLambertMaterial({ vertexColors: true }), matGlow = new THREE.MeshBasicMaterial({ vertexColors: true }), matTerrain = new THREE.MeshLambertMaterial({ vertexColors: true });
  // the island's leaf sway (island3d.js matSway), the same shader
  const matSway = new THREE.MeshLambertMaterial({ vertexColors: true });
  matSway.onBeforeCompile = (sh) => { sh.uniforms.uTime = uni.uTime; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;\n#else\nfloat ph = 0.0;\n#endif\nfloat k = max(0.0, position.y - 0.6) * 0.035;\ntransformed.x += sin(uTime * 1.3 + ph) * k;\ntransformed.z += cos(uTime * 1.1 + ph) * k * 0.6;'); };
  matTerrain.onBeforeCompile = (sh) => {
    sh.uniforms.uHaze = { value: new THREE.Color(LIGHT.depthHaze) }; sh.uniforms.uDepth = { value: new THREE.Vector3(LIGHT.depthFrom, LIGHT.depthTo, LIGHT.depthMax) };
    sh.vertexShader = 'varying float vWy;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWy = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = 'uniform vec3 uHaze; uniform vec3 uDepth; varying float vWy;\n' + sh.fragmentShader.replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, smoothstep(uDepth.x, uDepth.y, vWy) * uDepth.z);\n#include <tonemapping_fragment>');
  };
  [matSolid, matGlow, matTerrain, matSway].forEach((x) => dispose.push(x));
  const lod = !!tier().natureLod;
  const geoOf = (md) => (lod && md.lod && md.lod.geo ? md.lod.geo : md.geo), glowOf = (md) => (lod && md.lod && md.lod.geo ? md.lod.glow : md.glow);

  /* ---- terrain (the island's own builder) ---- */
  const terr = buildTerrain(map.cols, (map.extras || []).filter((e) => e.kind === 'jetty' || e.kind === 'skiff').map((e) => [e.x, e.z]));
  const tg = meshGrid(terr.g, { size: TV, shadeFaces: false }); dispose.push(tg);
  const tm = new THREE.Mesh(tg, matTerrain); tm.castShadow = true; tm.receiveShadow = true; scene.add(tm);
  // meadow detail (the island's grass tufts, flowers and path stones, a lighter mix), under everything alike, so a
  // disguise standing on the grass looks the same as the real thing
  {
    const list = [], dens = saver() ? 0.45 : COARSE ? 0.75 : 1;
    terr.colAt.forEach((v, k) => { const [X, Z] = k.split(',').map(Number), c = v.c, y0 = v.top * TV, h = hash(X, Z, 91);
      if ((c.kind === 'grass' || c.kind === 'hill') && v.top >= 0) {
        if (h < 0.22 * dens) { const bx = X * TV + 0.08 + hash(X, Z, 93) * 0.3, bz = Z * TV + 0.08 + hash(Z, X, 94) * 0.3, n = 2 + Math.floor(hash(X, Z, 92) * 3); for (let i = 0; i < n; i++) { const hg = 1 + Math.floor(hash(i, X * 97, 95) * 2); list.push([bx + (i % 2) * DV, y0, bz + (i >> 1) * DV, 1, hg, 1, pick([PAL.grass[3], PAL.grassDark ? PAL.grassDark[0] : PAL.grass[2], PAL.grass[2]], hash(i, Z, 96))]); } }
        else if (h > 0.93 && h < 0.93 + 0.05 * dens) { const fx = X * TV + 0.15 + hash(X, Z, 96) * 0.2, fz = Z * TV + 0.15 + hash(Z, X, 97) * 0.2; list.push([fx, y0, fz, 1, 2, 1, PAL.leafDark[0]]); list.push([fx - DV / 2, y0 + 2 * DV, fz - DV / 2, 2, 1, 2, pick(PAL.flowers, hash(X, Z, 98))]); }
      } else if (c.kind === 'path' && h < 0.12) list.push([X * TV + 0.1 + hash(X, Z, 99) * 0.3, y0, Z * TV + 0.15, 2, 1, 2, pick(PAL.pathStone, h * 8)]); });
    if (list.length) { const geo = new THREE.BoxGeometry(DV, DV, DV); geo.translate(DV / 2, DV / 2, DV / 2); dispose.push(geo); const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), list.length), mx = new THREE.Matrix4(), c = new THREE.Color(); dispose.push(im.material);
      list.forEach(([x, y, z, sx, sy, sz, col], i) => { mx.makeScale(sx, sy, sz).setPosition(x, y, z); im.setMatrixAt(i, mx); im.setColorAt(i, c.set(col)); }); im.receiveShadow = true; scene.add(im); dispose.push(im); }
  }
  // the jetty, skiff and lighthouse, and the plaza and stones landmarks (scenery that is not a disguise)
  const addStatic = (md, x, y, z, ry) => { if (!md) return; const g = new THREE.Group(); if (md.geo) { const mm = new THREE.Mesh(geoOf(md), matSolid); mm.castShadow = true; mm.receiveShadow = true; g.add(mm); } if (md.glow) g.add(new THREE.Mesh(glowOf(md), matGlow)); g.position.set(x, y || 0, z); g.rotation.y = ry || 0; scene.add(g); };
  (map.extras || []).forEach((e) => { if (e.kind === 'crate' || e.kind === 'barrel' || e.kind === 'sacks') return; addStatic(VB.extraModel(e.kind), e.x, e.y, e.z, e.ry); });
  map.items.forEach((it) => { if (it.k === 'l' && VB.hasExtra(it.kind)) addStatic(VB.extraModel(it.kind, it.on), it.x + it.w / 2, 0, it.y + it.h / 2, 0); });
  // hanging vines and moss under the rim (still scenery, never disguises)
  (map.scenery || []).forEach((sc) => { if (sc.cx >= 0) return; const md = VB.natureModel(sc.kind, sc.seed); if (md) { const g = new THREE.Group(); if (md.geo) g.add(new THREE.Mesh(md.geo, matSolid)); g.position.set(sc.x, sc.y, sc.z); g.rotation.y = sc.ry; g.scale.setScalar(sc.s); scene.add(g); } });

  /* ---- genuine scenery: instanced batches, as on the island ---- */
  const batches = new Map(), Q = new THREE.Quaternion(), YAX = new THREE.Vector3(0, 1, 0);
  const matOf = (d, glow) => (glow ? matGlow : swaysFor(d) ? matSway : matSolid);
  const matrixOf = (x, y, z, ry, s) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), Q.clone().setFromAxisAngle(YAX, ry || 0), new THREE.Vector3(s || 1, s || 1, s || 1));
  m.props.forEach((p) => {
    if (!p.model) return; const md = modelFor(p.model); if (!md) return; const s = p.model.s || 1;
    [[geoOf(md), false], [glowOf(md), true]].forEach(([geo, gl]) => { if (!geo) return; const mat = matOf(p.model, gl), k = geo.uuid + mat.uuid; let b = batches.get(k); if (!b) batches.set(k, (b = { geo, mat, list: [], nature: natureFor(p.model) })); b.list.push(matrixOf(p.x, p.y, p.z, p.ry, s)); });
  });
  batches.forEach((b) => {
    const im = new THREE.InstancedMesh(b.geo, b.mat, b.list.length);
    b.list.forEach((mx, i) => { im.setMatrixAt(i, mx); if (b.nature && b.mat !== matGlow) im.setColorAt(i, tintAt(mx.elements[12], mx.elements[14])); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    if (b.mat !== matGlow) { im.castShadow = true; im.receiveShadow = true; } im.computeBoundingSphere(); scene.add(im); dispose.push(im);
  });

  /* ---- sun and shadow framing ---- */
  const b0 = terr.bounds, cx = (b0.minX + b0.maxX) / 2 + 0.5, cz = (b0.minZ + b0.maxZ) / 2 + 0.5, span = Math.max(b0.maxX - b0.minX, b0.maxZ - b0.minZ) * 0.8 + 6;
  sun.target.position.set(cx, 0, cz); sun.position.set(cx - 9, 22, cz + 17);
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 70 }); sun.shadow.camera.updateProjectionMatrix();
  let shadowDirty = true, lastShadow = 0;

  /* ---- players ---- */
  const wispGeo = buildWisp(); dispose.push(wispGeo);
  const wispMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 }); dispose.push(wispMat);
  const blobGeo = new THREE.CircleGeometry(0.3, 16); blobGeo.rotateX(-Math.PI / 2); dispose.push(blobGeo);
  const blobMat = new THREE.MeshBasicMaterial({ color: '#1b2a3a', transparent: true, opacity: 0.28, depthWrite: false }); dispose.push(blobMat);
  const views = new Map(); // id -> { group, key, inst: [InstancedMesh], wisp, anim }
  function hiderView(h) {
    let v = views.get(h.id); if (!v) { v = { group: new THREE.Group(), key: undefined, inst: [], wisp: null, pop: 0, x: h.x, z: h.z, roll: 0, lean: 0, bob: 0 }; scene.add(v.group); views.set(h.id, v); }
    if (v.key !== h.key) {
      v.inst.forEach((im) => { v.group.remove(im); im.dispose(); }); v.inst = [];
      if (v.wisp) { v.group.remove(v.wisp); v.wisp = null; }
      if (h.key && h.model) {
        const md = modelFor(h.model);
        [[geoOf(md), false], [glowOf(md), true]].forEach(([geo, gl]) => { if (!geo) return; const im = new THREE.InstancedMesh(geo, matOf(h.model, gl), 1); if (natureFor(h.model) && !gl) im.setColorAt(0, tintAt(h.x, h.z)); if (!gl) { im.castShadow = true; im.receiveShadow = true; } im.frustumCulled = false; v.group.add(im); v.inst.push(im); });
        v.tx = h.x; v.tz = h.z;
      } else { const w = new THREE.Group(); w.add(new THREE.Mesh(wispGeo, wispMat)); const bl = new THREE.Mesh(blobGeo, blobMat); bl.scale.setScalar(0.8); w.add(bl); w.userData.blob = bl; v.wisp = w; v.group.add(w); }
      v.key = h.key; shadowDirty = true;
    }
    return v;
  }
  // the Seeker
  const sk = m.seeker, glb = A.Data.HIDESEEK.seekerGlb || {}; let seekerObj = buildSeeker(sk.look, opts.seekerColours || {}), mixer = null, clips = {};
  scene.add(seekerObj); const sBlob = new THREE.Mesh(blobGeo, blobMat); scene.add(sBlob);
  if (glb[sk.look]) import('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js/+esm').then(({ GLTFLoader }) => new GLTFLoader().load(glb[sk.look], (g) => {
    if (disposed) return; const o = g.scene; const box = new THREE.Box3().setFromObject(o), hgt = box.max.y - box.min.y || 1; o.scale.setScalar(1.36 / hgt);
    const wrap = new THREE.Group(); wrap.add(o); wrap.userData = { glb: true, P: {} }; scene.remove(seekerObj); seekerObj = wrap; scene.add(wrap);
    if (g.animations && g.animations.length) { mixer = new THREE.AnimationMixer(o); g.animations.forEach((c) => { const n = c.name.toLowerCase(); ['idle', 'walk', 'attack', 'reveal'].forEach((k) => { if (n.indexOf(k) >= 0 && !clips[k]) clips[k] = mixer.clipAction(c); }); }); if (clips.idle) clips.idle.play(); }
  }, undefined, (e) => console.warn('Seeker model could not be loaded, using the voxel seeker:', e && e.message)));
  const sAnim = { x: sk.x, z: sk.z, yaw: -sk.face, walk: 0, phase: 0, swing: -9, reveal: -9, slump: -9 };

  /* ---- effects: one instanced mesh of small cubes, plus a few rings ---- */
  const FXN = 72, fxGeo = new THREE.BoxGeometry(1, 1, 1); dispose.push(fxGeo);
  const fxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false }); dispose.push(fxMat);
  const fx = new THREE.InstancedMesh(fxGeo, fxMat, FXN); fx.frustumCulled = false; fx.count = 0; scene.add(fx); dispose.push(fx);
  const parts = []; const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color();
  const burst = (x, y, z, n, cols, sp, life, size) => { if (calm()) n = Math.ceil(n / 3); else if (saver()) n = Math.ceil(n / 2); for (let i = 0; i < n && parts.length < FXN; i++) { const a = Math.random() * Math.PI * 2, u = Math.random(); parts.push({ x, y: y + Math.random() * 0.3, z, vx: Math.cos(a) * sp * (0.4 + u), vy: sp * (0.8 + Math.random()), vz: Math.sin(a) * sp * (0.4 + u), t: 0, life: life * (0.7 + Math.random() * 0.5), s: size * (0.7 + Math.random() * 0.6), c: cols[i % cols.length] }); } };
  const rings = [];
  const ringGeo = new THREE.RingGeometry(0.82, 1, 40); ringGeo.rotateX(-Math.PI / 2); dispose.push(ringGeo);
  const arcGeo = new THREE.RingGeometry(0.55, 1.05, 18, 1, -0.9, 1.8); arcGeo.rotateX(-Math.PI / 2); dispose.push(arcGeo);
  const ring = (x, y, z, r0, r1, col, life, geo) => { const mt = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }); const mm = new THREE.Mesh(geo || ringGeo, mt); mm.position.set(x, y + 0.04, z); mm.renderOrder = 3; scene.add(mm); rings.push({ mm, r0, r1, life, t: 0 }); return mm; };
  // the Seeker's aim: a thin ring under whatever an attack would hit (never says whether it is a player)
  const aimMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }); dispose.push(aimMat);
  const aim = new THREE.Mesh(ringGeo, aimMat); aim.visible = false; aim.renderOrder = 3; scene.add(aim);
  // the player's own marker (only on the player's screen): a small prism floating above their disguise
  const mine = new THREE.Mesh(wispGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })); mine.scale.setScalar(0.6); mine.visible = false; mine.renderOrder = 4; scene.add(mine); dispose.push(mine.material);

  /* ---- labels (names over revealed hiders) ---- */
  const labels = document.createElement('div'); labels.className = 'hs-labels'; host.appendChild(labels); const tags = [];
  const tag = (text, x, y, z, cls, life) => { const el = document.createElement('div'); el.className = 'hs-tag3 ' + (cls || ''); el.textContent = text; labels.appendChild(el); tags.push({ el, x, y, z, t: 0, life }); };

  /* ---- camera ---- */
  const view = { w: 1, h: 1, zoom: opts.zoom || 1.3 }, focus = new THREE.Vector3(m.start.x, 0, m.start.z), fTarget = focus.clone();
  let shake = 0;
  function resize() { const r = host.getBoundingClientRect(); view.w = Math.max(1, Math.round(r.width)); view.h = Math.max(1, Math.round(r.height)); const pr = Math.min(window.devicePixelRatio || 1, tier().prCap || 2); R.setPixelRatio(pr); R.setSize(view.w, view.h, true); }
  function placeCamera() {
    const ppu = UNIT_PX * view.zoom * Math.min(1.25, Math.max(0.8, view.h / 390));
    camera.left = -view.w / 2 / ppu; camera.right = view.w / 2 / ppu; camera.top = view.h / 2 / ppu; camera.bottom = -view.h / 2 / ppu;
    const t = focus.clone(); if (shake > 0 && !calm()) { t.addScaledVector(RIGHT, (Math.random() - 0.5) * shake * 0.12); t.y += (Math.random() - 0.5) * shake * 0.08; }
    camera.position.copy(t).addScaledVector(BACK, 60); camera.lookAt(t); camera.updateProjectionMatrix();
  }
  resize(); const ro = window.ResizeObserver ? new ResizeObserver(resize) : null; if (ro) ro.observe(host);

  /* ---- reading the round's state each frame ---- */
  let seenEv = 0, disposed = false, raf = 0, lastT = 0, clock = 0, soundT = 0;
  const groundY = (x, z) => { const c = m.cells.get(Math.floor(x) + ',' + Math.floor(z)); return c ? Math.max(0, c.y) : 0; };
  function onEvent(e) {
    const y = groundY(e.x || 0, e.z || 0);
    if (e.type === 'morph') { burst(e.x, y + 0.2, e.z, 16, ['#a8e4ff', '#e2d4ff', '#ffd6f4', '#fff3b0'], 1.4, 0.5, 0.07); ring(e.x, y, e.z, 0.3, 1.2, '#e2d4ff', 0.45); if (opts.sound) opts.sound('hsMorph', e); }
    else if (e.type === 'reveal') {
      const h = m.hiders.find((q) => q.id === e.id), v = views.get(e.id); if (v) v.pop = 0.001;
      burst(e.x, y + 0.4, e.z, 30, ['#ffd86b', '#a8e4ff', '#ffd6f4', '#a8ffc0', '#ffffff'], 2.2, 0.8, 0.09); ring(e.x, y, e.z, 0.4, 1.8, '#ffd86b', 0.6); shake = 1; sAnim.reveal = clock;
      tag(h && h.id === 'you' ? 'You were found!' : (h && h.name) + ' found!', e.x, y + 1.4, e.z, 'found', 2.2); if (opts.sound) opts.sound('hsReveal', e);
    } else if (e.type === 'miss') { burst(e.x, y + 0.3, e.z, 7, ['#c8c0b0', '#a89f90', '#e8e0d0'], 0.9, 0.45, 0.06); sAnim.slump = clock; if (opts.sound) opts.sound('hsMiss', e); }
    else if (e.type === 'whiff') { if (opts.sound) opts.sound('hsSwing', e); }
  }
  function sync(dt) {
    for (const e of m.events) if (e.n > seenEv) { seenEv = e.n; if (e.type === 'reveal' || e.type === 'miss' || e.type === 'whiff') sAnim.swing = clock; if (e.type !== 'whiff' && (e.type === 'reveal' || e.type === 'miss')) setTimeout(() => !disposed && onEvent(e), 120); else onEvent(e); }
    const t = clock, mo = calm();
    m.hiders.forEach((h) => {
      const v = hiderView(h); const dx = h.x - v.x, dz = h.z - v.z, d = Math.hypot(dx, dz);
      v.x = h.x; v.z = h.z; const moving = d > 1e-4; v.speed = moving ? d / Math.max(dt, 1e-3) : v.speed * 0.8;
      if (moving && h.key) shadowDirty = true;
      const y = groundY(h.x, h.z); v.y = v.y == null ? y : v.y + (y - v.y) * Math.min(1, dt * 10);
      if (h.found) { // the disguise pops away, the spirit rises and fades
        if (v.pop) { v.pop += dt; const k = Math.max(0, 1 - v.pop / 0.3); v.inst.forEach((im) => { im.setMatrixAt(0, matrixOf(h.x, v.y, h.z, h.ry, (h.ys || 1) * k)); im.instanceMatrix.needsUpdate = true; });
          if (v.pop > 0.3 && !v.risen) { v.risen = true; v.inst.forEach((im) => (im.visible = false)); shadowDirty = true; const w = new THREE.Mesh(wispGeo, wispMat.clone()); v.group.add(w); v.rise = w; w.position.set(h.x, v.y + 0.2, h.z); }
          if (v.rise) { v.rise.position.y += dt * 0.9; v.rise.rotation.y += dt * 3; v.rise.material.opacity = Math.max(0, 1 - (v.pop - 0.3) / 1.6); if (v.pop > 2) { v.group.remove(v.rise); v.rise.material.dispose(); v.rise = null; } } }
        else v.group.visible = false;
        return;
      }
      if (!h.key) { // the spirit: floats and turns slowly
        const w = v.wisp; w.position.set(h.x, v.y + 0.25 + (mo ? 0 : Math.sin(t * 2.4 + h.x) * 0.06), h.z); w.rotation.y = mo ? 0 : t * 1.2; w.userData.blob.position.y = -0.24 - (mo ? 0 : Math.sin(t * 2.4 + h.x) * 0.06); return;
      }
      // a moving disguise moves like the thing it is: trees lean and sway, rocks rock and roll, small things hop,
      // buildings shudder; at rest it stands exactly like its genuine twin
      const look = A.Rules.HideSeek.look(h.key), go = Math.min(1, (v.speed || 0) / 0.6);
      v.walk = (v.walk || 0) + go * dt * 6; const ph = v.walk;
      let rx = 0, rz = 0, yo = 0;
      const fwdX = Math.cos(h.face), fwdZ = Math.sin(h.face);
      if (!mo && go > 0.02) {
        if (look.move === 'tree') { rx = fwdZ * 0.08 * go + Math.sin(ph) * 0.03 * go; rz = -fwdX * 0.08 * go + Math.cos(ph) * 0.03 * go; }
        else if (look.move === 'rock') { v.roll += (v.speed || 0) * dt * 2.2; rx = Math.sin(v.roll) * 0.12 * fwdZ; rz = -Math.sin(v.roll) * 0.12 * fwdX; yo = Math.abs(Math.sin(v.roll)) * 0.04; }
        else if (look.move === 'bush' || look.move === 'deco' || look.move === 'wood') { yo = Math.abs(Math.sin(ph * 1.4)) * 0.08 * go; rz = Math.sin(ph * 1.4) * 0.06 * go; }
        else if (look.move === 'building') { rx = Math.sin(ph * 3) * 0.008; rz = Math.cos(ph * 3.3) * 0.008; yo = Math.abs(Math.sin(ph * 3)) * 0.015; }
      }
      v.lean += (rx - v.lean) * Math.min(1, dt * 8); v.lean2 = (v.lean2 || 0) + (rz - (v.lean2 || 0)) * Math.min(1, dt * 8); v.yo = (v.yo || 0) + (yo - (v.yo || 0)) * Math.min(1, dt * 10);
      const s = h.ys || 1, mx = new THREE.Matrix4().compose(new THREE.Vector3(h.x, v.y + v.yo, h.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(v.lean, h.ry, v.lean2, 'XYZ')), new THREE.Vector3(s, s, s));
      v.inst.forEach((im) => { im.setMatrixAt(0, mx); im.instanceMatrix.needsUpdate = true; });
      if (go > 0.2 && opts.sound && t - (v.sndT || 0) > (look.move === 'rock' ? 0.45 : 0.32)) { v.sndT = t; opts.sound(look.move === 'rock' || look.move === 'building' ? 'hsRock' : look.move === 'wood' || look.move === 'deco' ? 'hsWood' : 'hsLeaf', h); }
    });
    // the Seeker: walks, turns smoothly, swings, celebrates, slumps after a miss, covers its eyes while counting
    const S = m.seeker, so = seekerObj, P = so.userData.P || {};
    const sdx = S.x - sAnim.x, sdz = S.z - sAnim.z, sd = Math.hypot(sdx, sdz); sAnim.x = S.x; sAnim.z = S.z;
    sAnim.walk += ((sd > 1e-4 ? 1 : 0) - sAnim.walk) * Math.min(1, dt * 10); sAnim.phase += sAnim.walk * dt * 11;
    let yawT = -S.face, dy = ((yawT - sAnim.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; sAnim.yaw += dy * Math.min(1, dt * 12);
    const sy = groundY(S.x, S.z); sAnim.y = sAnim.y == null ? sy : sAnim.y + (sy - sAnim.y) * Math.min(1, dt * 10);
    so.position.set(S.x, sAnim.y + (mo ? 0 : Math.abs(Math.sin(sAnim.phase)) * 0.05 * sAnim.walk), S.z); so.rotation.y = sAnim.yaw; sBlob.position.set(S.x, sAnim.y + 0.02, S.z);
    if (P.legL) {
      const w = mo ? sAnim.walk * 0.35 : sAnim.walk, sw = Math.sin(sAnim.phase) * 0.7 * w;
      P.legL.rotation.z = sw; P.legR.rotation.z = -sw; P.armL.rotation.z = -sw * 0.8; P.armR.rotation.z = sw * 0.5 - 0.35; P.armR.rotation.x = 0; P.armL.rotation.x = 0; P.head.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0);
      if (!mo) P.torso.position.y = 5 * SV + Math.sin(t * 2) * 0.008;
      if (P.tail) P.tail.rotation.z = Math.sin(sAnim.phase) * 0.25 * w + (mo ? 0 : Math.sin(t * 1.7) * 0.05);
      const as = clock - sAnim.swing, ar = clock - sAnim.reveal, al = clock - sAnim.slump;
      if (m.phase === 'prep') { P.armL.rotation.set(-0.6, 0, 2.5); P.armR.rotation.set(0.6, 0, 2.5); P.head.rotation.z = -0.25; } // counting, eyes covered
      if (as < 0.4) { // wind up overhead, strike down in front, recover
        const base = P.armR.rotation.z, k = as < 0.1 ? as / 0.1 : as < 0.24 ? (as - 0.1) / 0.14 : (as - 0.24) / 0.16, ease = (x) => x * x * (3 - 2 * x);
        P.armR.rotation.z = as < 0.1 ? base + (2.8 - base) * ease(k) : as < 0.24 ? 2.8 - 2.4 * ease(k) : 0.4 + (base - 0.4) * ease(k);
        P.torso.rotation.y = as < 0.1 ? 0.25 * k : as < 0.24 ? 0.25 - 0.55 * ease(k) : -0.3 * (1 - ease(k)); P.armL.rotation.z = as < 0.24 ? 0.5 : 0.5 * (1 - k);
      }
      if (ar < 0.9) { const k = Math.sin(Math.min(1, ar / 0.9) * Math.PI); P.armR.rotation.z = -0.35 + k * 3.0; P.armL.rotation.z = k * 2.4; if (!mo) so.position.y += k * 0.12; }
      if (al < 0.6 && as >= 0.4) { const k = Math.sin(Math.min(1, al / 0.6) * Math.PI); P.head.rotation.y = Math.sin(al * 22) * 0.25 * k; P.torso.rotation.z = -0.12 * k; }
      if (P.gem) { const pen = A.Rules.HideSeek.penaltyLeft(m) > 0; P.gem.visible = !pen || Math.floor(clock * 4) % 2 === 0; }
    }
    if (mixer) { mixer.update(dt); const want = clock - sAnim.swing < 0.4 && clips.attack ? 'attack' : clock - sAnim.reveal < 0.9 && clips.reveal ? 'reveal' : sAnim.walk > 0.3 && clips.walk ? 'walk' : 'idle'; if (want !== sAnim.clip && clips[want]) { if (sAnim.clip && clips[sAnim.clip]) clips[sAnim.clip].fadeOut(0.15); clips[want].reset().fadeIn(0.15).play(); sAnim.clip = want; } }
    // the swing's light arc
    if (clock - sAnim.swing < 0.02 && !sAnim.arcDone) { sAnim.arcDone = true; const a = ring(S.x + Math.cos(S.face) * 0.15, sAnim.y + 0.5, S.z + Math.sin(S.face) * 0.15, 1, 1.25, '#fff3b0', 0.22, arcGeo); a.rotation.y = -S.face; }
    if (clock - sAnim.swing > 0.05) sAnim.arcDone = false;
  }
  function step(dt) {
    // particles
    let n = 0; for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; if (p.t > p.life) { parts.splice(i, 1); continue; } p.vy -= 5 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
    parts.forEach((p) => { const k = 1 - p.t / p.life, s = p.s * (0.4 + 0.6 * k); tmpM.makeScale(s, s, s).setPosition(p.x, p.y, p.z); fx.setMatrixAt(n, tmpM); fx.setColorAt(n, tmpC.set(p.c)); n++; });
    fx.count = n; if (n) { fx.instanceMatrix.needsUpdate = true; if (fx.instanceColor) fx.instanceColor.needsUpdate = true; }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const k = r.t / r.life; if (k >= 1) { scene.remove(r.mm); r.mm.material.dispose(); rings.splice(i, 1); continue; } const s = r.r0 + (r.r1 - r.r0) * (1 - (1 - k) * (1 - k)); r.mm.scale.setScalar(s); r.mm.material.opacity = 0.8 * (1 - k); }
    for (let i = tags.length - 1; i >= 0; i--) { const g = tags[i]; g.t += dt; if (g.t > g.life) { g.el.remove(); tags.splice(i, 1); continue; } const p = new THREE.Vector3(g.x, g.y + g.t * 0.35, g.z).project(camera); g.el.style.transform = 'translate(' + ((p.x + 1) / 2 * view.w).toFixed(1) + 'px,' + ((1 - p.y) / 2 * view.h).toFixed(1) + 'px) translate(-50%,-100%)'; g.el.style.opacity = String(Math.min(1, (g.life - g.t) / 0.4)); }
    shake = Math.max(0, shake - dt * 3);
  }
  function render(now) {
    raf = 0; if (disposed) return;
    const fps = saver() ? 20 : 30, gap = 1000 / fps;
    if (lastT && now - lastT < gap - 2) { raf = requestAnimationFrame(render); return; }
    const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 1 / fps; lastT = now; clock += dt;
    if (!calm()) uni.uTime.value = clock;
    // a fault in one frame must not freeze the round: report it and keep drawing
    try { if (opts.tick) opts.tick(dt); if (disposed) return; sync(dt); step(dt); } catch (e) { console.error('Hide and Seek frame error:', e && e.stack || e); if (disposed) return; }
    // camera follows the player (or whoever the player is watching)
    const fid = api.focusId, fe = fid === m.seeker.id ? m.seeker : m.hiders.find((q) => q.id === fid);
    if (fe) fTarget.set(fe.x, groundY(fe.x, fe.z) + 0.6, fe.z);
    focus.lerp(fTarget, Math.min(1, dt * (calm() ? 12 : 6))); placeCamera();
    // aim ring and own marker
    const tgt = api.aim ? api.aim() : null;
    if (tgt) { const o = m.props.find((p) => p.id === tgt.id) || m.hiders.find((h) => h.id === tgt.id), sh = o.shape, r = sh.r != null ? sh.r + 0.12 : Math.max(sh.hx, sh.hz) + 0.15; aim.visible = true; aim.position.set(sh.x, groundY(sh.x, sh.z) + 0.05, sh.z); aim.scale.setScalar(r); aimMat.opacity = 0.35 + 0.2 * Math.sin(clock * 6); aimMat.color.set(A.Rules.HideSeek.attackReady(m) ? '#ffffff' : '#ff9a8a'); } else aim.visible = false;
    const me = api.mineId && m.hiders.find((h) => h.id === api.mineId && !h.found && h.key);
    if (me) { const look = A.Rules.HideSeek.look(me.key), md = modelFor(me.model), top = (md && md.geo && md.geo.boundingBox ? md.geo.boundingBox.max.y * (me.ys || 1) : 1.5); mine.visible = true; mine.position.set(me.x, groundY(me.x, me.z) + Math.min(top, 6) + 0.3 + (calm() ? 0 : Math.sin(clock * 3) * 0.06), me.z); mine.rotation.y = calm() ? 0 : clock * 1.5; } else mine.visible = false;
    if (useShadows && shadowDirty && now - lastShadow > 125) { R.shadowMap.needsUpdate = true; shadowDirty = false; lastShadow = now; }
    const s0 = performance.now(); R.render(scene, camera); api.stats.drawMs = +(performance.now() - s0).toFixed(2); api.stats.frames++;
    raf = requestAnimationFrame(render);
  }
  const api = {
    canvas: R.domElement, focusId: opts.focusId || null, mineId: opts.mineId || null, aim: null, stats: { frames: 0, drawMs: 0 },
    start() { if (!raf && !disposed) { lastT = 0; raf = requestAnimationFrame(render); } },
    stop() { if (raf) cancelAnimationFrame(raf); raf = 0; },
    running: () => !!raf,
    // a joystick direction on screen (x right, y down) as a direction on the island
    dirFromScreen(jx, jy) { const up = -jy; return { x: Math.SQRT1_2 * (jx - up), z: Math.SQRT1_2 * (-jx - up) }; },
    // the island point under a screen position (for tap-to-face)
    groundAt(clientX, clientY) { const r = R.domElement.getBoundingClientRect(), nd = new THREE.Vector2((clientX - r.left) / r.width * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), rc = new THREE.Raycaster(); rc.setFromCamera(nd, camera); const p = new THREE.Vector3(); rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -focus.y), p); return p ? { x: p.x, z: p.z } : null; },
    screenOf(x, y, z) { const p = new THREE.Vector3(x, y, z).project(camera); return { x: (p.x + 1) / 2 * view.w, y: (1 - p.y) / 2 * view.h }; },
    setZoom(z) { view.zoom = Math.max(0.6, Math.min(4, z)); placeCamera(); },
    snapFocus() { const fe = api.focusId === m.seeker.id ? m.seeker : m.hiders.find((q) => q.id === api.focusId); if (fe) { focus.set(fe.x, groundY(fe.x, fe.z) + 0.6, fe.z); fTarget.copy(focus); } placeCamera(); },
    renderOnce() { sync(0.016); step(0.016); api.snapFocus(); if (useShadows) R.shadowMap.needsUpdate = true; R.render(scene, camera); },
    info() { let tris = 0, calls = 0; R.info.reset && R.info.reset(); R.render(scene, camera); tris = R.info.render.triangles; calls = R.info.render.calls; return { triangles: tris, calls, geometries: R.info.memory.geometries, shadows: useShadows, lod, fps: saver() ? 20 : 30, seeker: seekerObj.userData.glb ? 'glb' : 'voxel-' + m.seeker.look }; },
    // what a disguised hider looks like next to its genuine twin: their model, material and tint (for the tests)
    compare(hid) { const h = m.hiders.find((q) => q.id === hid); if (!h || !h.key) return null; const v = views.get(hid), src = A.Rules.HideSeek.sourceFor(m, h.key, h.x, h.z), md = modelFor(src.model), b = [...batches.values()].find((x) => x.geo === geoOf(md));
      return { sameGeometry: !!b && v.inst[0].geometry === b.geo, sameMaterial: !!b && v.inst[0].material === b.mat, tintRule: !natureFor(h.model) || (!!v.inst[0].instanceColor && Math.abs(v.inst[0].instanceColor.getX(0) - tintAt(v.tx, v.tz).r) < 1e-5 && Math.abs(v.inst[0].instanceColor.getZ(0) - tintAt(v.tx, v.tz).b) < 1e-5), extraMeshes: v.group.children.length - v.inst.length, model: h.model, look: h.look }; },
    thumb(key) { return thumb(key); },
    dispose() {
      disposed = true; api.stop(); if (ro) ro.disconnect();
      views.forEach((v) => v.inst.forEach((im) => im.dispose()));
      rings.forEach((r) => r.mm.material.dispose()); dispose.forEach((d) => d.dispose && d.dispose());
      const disp = (o) => o.traverse((x) => { if (x.geometry && x.geometry !== wispGeo && x.geometry !== blobGeo) x.geometry.dispose(); });
      disp(seekerObj); if (seekerObj.userData.mats) Object.values(seekerObj.userData.mats).forEach((x) => x.dispose());
      if (thumbRT) thumbRT.dispose(); R.dispose(); R.forceContextLoss && R.forceContextLoss(); R.domElement.remove(); labels.remove();
    },
  };
  // small pictures of each disguise for the tray, rendered once with the same models and light
  let thumbRT = null; const thumbCache = {};
  function thumb(key) {
    if (thumbCache[key]) return thumbCache[key];
    const src = m.props.find((p) => p.key === key); if (!src) return null; const md = modelFor(src.model); if (!md) return null;
    const S = 96; if (!thumbRT) thumbRT = new THREE.WebGLRenderTarget(S, S, { colorSpace: THREE.SRGBColorSpace });
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(LIGHT.sky, LIGHT.ground, LIGHT.hemi)); const sl = new THREE.DirectionalLight(LIGHT.sun, LIGHT.sunI); sl.position.set(-9, 22, 17); sc.add(sl);
    const g = new THREE.Group(); if (md.geo) g.add(new THREE.Mesh(md.geo, matSolid)); if (md.glow) g.add(new THREE.Mesh(md.glow, matGlow)); g.rotation.y = src.ry; sc.add(g);
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()), r = Math.max(sz.x, sz.y, sz.z) * 0.62;
    const cam = new THREE.OrthographicCamera(-r, r, r, -r, -50, 50); cam.up.copy(UP); cam.position.copy(c).addScaledVector(BACK, 20); cam.lookAt(c); cam.updateProjectionMatrix();
    const prev = R.getRenderTarget(), sh = R.shadowMap.enabled; R.shadowMap.enabled = false; R.setRenderTarget(thumbRT); R.setClearColor(0x000000, 0); R.clear(); R.render(sc, cam); const px = new Uint8Array(S * S * 4); R.readRenderTargetPixels(thumbRT, 0, 0, S, S, px); R.setRenderTarget(prev); R.shadowMap.enabled = sh;
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S; const cx2 = cv.getContext('2d'), id = cx2.createImageData(S, S);
    for (let y = 0; y < S; y++) id.data.set(px.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
    cx2.putImageData(id, 0, 0); return (thumbCache[key] = cv.toDataURL());
  }
  api.snapFocus();
  return api;
}
