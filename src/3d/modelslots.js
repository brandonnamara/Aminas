/* Aminas — Phase 14: imported building models (ES module). Loads the .glb named in D.BUILDING_MODELS (see
   src/model-slots.js), measures it, fits it to the building's footprint and hands out instances for the island.
   The model is used as it is: geometry, normals, UVs, textures and colours are not altered (no smoothing, no
   re-meshing), so a voxel model keeps its blocks. Only these are set: shadows on, and see-through textures drawn
   as cut-outs so they sort correctly on the island. The loader itself is fetched only when a slot is filled. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
const A = window.A, D = A.Data;
const cache = new Map(); // type -> { state: 'loading' | 'ready' | 'failed', root, info, slot, waiters[] }
export const slotFor = (type) => { const s = (D.BUILDING_MODELS || {})[type]; return s && s.url ? s : null; };

// What a model is made of, against the mobile budget.
export function inspect(scene, animations, bytes) {
  const box = new THREE.Box3().setFromObject(scene), size = box.getSize(new THREE.Vector3()), mats = new Set(), texs = new Map(); let tris = 0, verts = 0, meshes = 0, uv = true, skinned = false, alpha = 0, nonIndexed = 0, degenerate = 0, nan = false;
  scene.traverse((o) => { if (!o.isMesh) return; meshes++; const g = o.geometry, p = g.attributes.position; verts += p.count; tris += g.index ? g.index.count / 3 : p.count / 3; if (!g.index) nonIndexed++; if (!g.attributes.uv && !g.attributes.color) uv = false; if (o.isSkinnedMesh) skinned = true;
    for (let i = 0; i < Math.min(p.count, 3000); i++) if (!isFinite(p.getX(i)) || !isFinite(p.getY(i)) || !isFinite(p.getZ(i))) nan = true;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { mats.add(m); if (m.transparent || m.alphaTest > 0) alpha++; ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'].forEach((k) => { const t = m[k]; if (t && t.image) texs.set(t.uuid, { slot: k, w: t.image.width || 0, h: t.image.height || 0 }); }); }); });
  const B = D.MODEL_BUDGET, tl = [...texs.values()], maxTex = tl.reduce((n, t) => Math.max(n, t.w, t.h), 0), texMB = tl.reduce((n, t) => n + t.w * t.h * 4 * 1.33, 0) / 1048576, warn = [];
  if (tris > B.triangles) warn.push('triangles ' + Math.round(tris).toLocaleString('en-GB') + ' over the ' + B.triangles.toLocaleString('en-GB') + ' budget');
  if (maxTex > B.textureSize) warn.push('texture ' + maxTex + ' px over the ' + B.textureSize + ' px budget');
  if (tl.length > B.textures) warn.push(tl.length + ' textures over the budget of ' + B.textures);
  if (bytes && bytes > B.bytes) warn.push('file ' + (bytes / 1048576).toFixed(1) + ' MB over the ' + (B.bytes / 1048576) + ' MB budget');
  if (nan) warn.push('some vertex positions are not numbers'); if (!uv) warn.push('a mesh has neither UVs nor vertex colours'); if (!isFinite(size.x) || size.x <= 0 || size.y <= 0) warn.push('empty or flat model');
  return { meshes, triangles: Math.round(tris), vertices: verts, materials: mats.size, textures: tl, maxTexture: maxTex, textureMemoryMB: +texMB.toFixed(1), size: [+size.x.toFixed(3), +size.y.toFixed(3), +size.z.toFixed(3)], min: [+box.min.x.toFixed(3), +box.min.y.toFixed(3), +box.min.z.toFixed(3)],
    pivotAtBase: Math.abs(box.min.y) < size.y * 0.05, pivotCentred: Math.abs((box.min.x + box.max.x) / 2) < size.x * 0.05 && Math.abs((box.min.z + box.max.z) / 2) < size.z * 0.05, transparentMaterials: alpha, skinned, animations: (animations || []).map((c) => c.name), nodes: (() => { const n = []; scene.traverse((o) => { if (o.name && o !== scene) n.push(o.name); }); return n.slice(0, 40); })(), bytes: bytes || 0, warnings: warn, ok: !nan && size.x > 0 && size.y > 0 };
}
function prepare(gltf, slot, bytes) {
  const src = gltf.scene, info = inspect(src, gltf.animations, bytes);
  src.traverse((o) => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = true;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (slot.gain && slot.gain !== 1 && !m.userData.gained) { m.color.multiplyScalar(slot.gain); m.userData.gained = true; } if (m.transparent && !(m.alphaTest > 0)) { m.alphaTest = 0.5; m.transparent = false; m.depthWrite = true; } }); });
  const turn = new THREE.Group(); turn.rotation.y = (slot.yaw || 0) * Math.PI / 180; turn.add(src); turn.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(turn), c = box.getCenter(new THREE.Vector3());
  src.position.x -= 0; turn.position.set(-c.x, -box.min.y, -c.z); // base on the ground, centred on the footprint
  const root = new THREE.Group(); root.add(turn); root.userData.base = box.getSize(new THREE.Vector3());
  const pat = slot.spin ? new RegExp(slot.spin, 'i') : null, spin = []; if (pat) src.traverse((o) => { if (o !== src && o.name && pat.test(o.name)) spin.push(o.name); });
  info.spinParts = spin; return { root, info };
}
// The lighter file is used on phones and tablets (touch screens), below the High tier and in Battery saver. The
// full file is for desktop at High. (A.ModelSlots.forceFull is for tests and screenshots.)
const TOUCH = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const wantLite = (slot) => !!(slot.lite && !A.ModelSlots.forceFull && (TOUCH || (A.Perf && ((A.Perf.saver && A.Perf.saver()) || (A.Perf.tier && A.Perf.tier().id !== 'high')))));
// changes whenever a slot, a model's loading state or the wanted file changes, so the island knows to redraw
export const signature = () => Object.keys(D.BUILDING_MODELS || {}).map((t) => { const sl = slotFor(t), e = cache.get(t); return sl ? t + ':' + (wantLite(sl) ? sl.lite : sl.url) + ':' + (e ? e.state : '') : ''; }).join('|');
// The model file. Hosts that cannot serve .glb (the development preview) carry the same bytes as base64 in
// "<name>.glb.json"; that copy is tried only when the .glb itself is not there.
function getModel(url) {
  return fetch(url).then((r) => { if (r.ok) return r.arrayBuffer(); const st = r.status;
    return fetch(url + '.json').then((j) => { if (!j.ok) throw new Error('HTTP ' + st); return j.json(); }).then((d) => { const bin = atob(d.glb), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }); });
}
export function request(type, onReady) {
  const slot = slotFor(type); if (!slot) return; let e = cache.get(type);
  if (e) { if (e.state === 'loading' && onReady) e.waiters.push(onReady); return; }
  e = { state: 'loading', slot, waiters: onReady ? [onReady] : [], info: null, root: null, error: null }; cache.set(type, e);
  const done = (ok, err) => { e.state = ok ? 'ready' : 'failed'; e.error = err ? String(err.message || err) : null; if (!ok) console.warn('Aminas: the ' + type + ' model could not be loaded (' + e.error + '); the built-in model is used.'); e.waiters.splice(0).forEach((f) => { try { f(ok); } catch (x) { /* a redraw must not break loading */ } }); };
  const lite = wantLite(slot), url = lite ? slot.lite : slot.url; e.url = url; e.lite = lite;
  Promise.all([import('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js/+esm'), getModel(url)])
    .then(([{ GLTFLoader }, buf]) => new Promise((res, rej) => new GLTFLoader().parse(buf, url.replace(/[^/]*$/, ''), (g) => res([g, buf.byteLength]), rej)))
    .then(([g, bytes]) => { const p = prepare(g, slot, bytes); if (!p.info.ok) throw new Error('the model is empty or damaged'); e.root = p.root; e.info = p.info; done(true); })
    .catch((err) => done(false, err));
}
// One building's copy of the model, fitted to a w0 × h0 footprint (cells). Geometry and materials are shared.
export function instance(type, w0, h0, rot) {
  let e = cache.get(type); const sl = slotFor(type);
  if (e && e.state !== 'loading' && sl && e.url !== (wantLite(sl) ? sl.lite : sl.url)) { forget(type); e = null; } // the slot or the quality tier changed
  if (!e || e.state !== 'ready') return null;
  const g = e.root.clone(true), b = e.root.userData.base, fit = e.slot.fit || 0.96, s = Math.min(w0 * fit / b.x, h0 * fit / b.z);
  g.scale.setScalar(s); g.rotation.y = rot ? Math.PI / 2 : 0; g.userData = { glb: type, scale: s, height: b.y * s, spin: [] };
  if (e.info.spinParts.length) g.traverse((o) => { if (e.info.spinParts.indexOf(o.name) >= 0) g.userData.spin.push(o); });
  g.children[0].position.y += (e.slot.lift || 0) / s;
  return g;
}
// turn the spinning parts (called from the island's slow ambient tick, so it stops at rest and in Battery saver)
export function tick(groups, dt) { groups.forEach((g) => { const e = cache.get(g.userData.glb); if (!e) return; const ax = e.slot.axis || 'z', w = (e.slot.speed || 6) * Math.PI * 2 / 60; g.userData.spin.forEach((o) => { o.rotation[ax] += w * dt; }); }); }
export const status = (type) => { const e = cache.get(type); return e ? { state: e.state, error: e.error, info: e.info, url: e.url, lite: e.lite } : { state: slotFor(type) ? 'idle' : 'empty', error: null, info: null }; };
export function forget(type) { const e = cache.get(type); if (e && e.root) e.root.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'].forEach((k) => m[k] && m[k].dispose()); m.dispose(); }); } }); cache.delete(type); }
A.ModelSlots = { status, slotFor, forget, inspect };
