/* Aminas — 3D runtime (ES module, loaded on demand by src/c3d.js).
   One WebGL renderer and one render loop for the whole game. Live views (a battle stage or a creature viewer)
   borrow the renderer's canvas; the loop only runs while a view is attached and the page is visible.
   Creature templates are cached (heroes from GLB, the rest built procedurally) and shared between instances;
   everything a view creates is released in its dispose(). */
import * as C from './creature3d.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { buildArena, kit, motes, tracker, rnd } from './arenas.js';
import { Fx, FocusMarks, ELFX } from './combatfx.js';
import * as SC from './showcase.js';   // Phase 8: bespoke clips (registered on import), living details, move choreography
import './roster.js';                  // Phase 8B: the rest of the roster (clips, living details, moves) registered on import
import { hitAccent } from './proto15.js'; // Phase 15 prototypes (developer switch only): clips, moves, hit accents
import * as C15 from './combat15c.js';   // Phase 15C (developer switch only): signature sequences, camera, impact feedback
const THREE = C.THREE;
const A = window.A, D = A.Data;

/* ------------------------------------------------------------------ renderer & loop */
let renderer = null, active = null, raf = 0, last = 0, frames = 0, lastStatsT = 0, fps = 0, drawn = 0, starts = 0;
const clock = new THREE.Clock(false);
function getRenderer() {
  if (renderer) return renderer;
  // MSAA only on low-density screens: on retina displays (2x/3x) edges are already fine and multisampling costs a lot
  // Dev 7: 'default' power preference (laptops with two GPUs stay on the efficient one; phones are unaffected)
  renderer = new THREE.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, alpha: true, powerPreference: 'default' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  renderer.setPixelRatio(pr);
  renderer.domElement.className = 'c3d-canvas';
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); contextLost = true; stop(); if (A.UI && A.UI.toast) A.UI.toast('3D view paused (the graphics context was lost). Reopen the screen to restore it.', 't'); });
  renderer.domElement.addEventListener('webglcontextrestored', () => { contextLost = false; });
  return renderer;
}
let contextLost = false;
// Adaptive resolution: if frames are slow for a while, render fewer pixels (down to 1x); speed back up when there is room.
// Dev 7: phones (coarse pointer) render at most 1.5x: voxel art stays sharp and it is ~44% fewer pixels than 2x
const COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const PR_CAP = Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2);
const Perf = () => window.A && window.A.Perf;
// Phase 3: Battery saver caps at 1 and an explicit High raises phones to 2; Auto keeps the Phase 2 cap here, because the
// device test measured the island, not battles (re-test battles before letting Auto raise this)
const prCap = () => { const P = Perf(); if (!P) return PR_CAP; if (P.saver() || P.forceTier === 'saver') return 1; const q = P.quality ? P.quality() : ''; return q === 'high' && P.forceTier !== 'balanced' && ((A.State && A.State.state && A.State.state.settings.quality === 'high') || P.forceTier === 'high') ? Math.min(window.devicePixelRatio || 1, 2) : q === 'balanced' ? Math.min(window.devicePixelRatio || 1, 1.5) : PR_CAP; };
let pr = PR_CAP, slow = 0, quick = 0, sampled = 0, since = 0;
// Performance-test instrumentation: every 1.5 s judgement is kept in a short log (what was measured and what it led
// to), so the test can say exactly why the resolution dropped or Battery saver switched on. Recording only.
const adaptLog = [];
function adapt(ms, now) {
  if (ms > 28) slow++; else if (ms < 18) quick++; sampled++; meter.judged++; if (ms > 28) meter.judgedSlow++;
  if (!since) since = now; if (now - since < 1500 || sampled < 8) return; // judge every 1.5 s of rendering
  const cap = prCap(), P = Perf(), wantSaver = slow > sampled * 0.5 && pr <= 1;
  const next = pr > cap ? cap : slow > sampled * 0.5 && pr > 1 ? Math.max(1, pr - 0.25) : quick > sampled * 0.95 && pr < cap ? Math.min(cap, pr + 0.25) : pr;
  const why = { at: Math.round(now), view: active && active.kind, windowMs: Math.round(now - since), frames: sampled, slowFrames: slow, quickFrames: quick, pixelRatio: pr, cap, targetFps: P ? P.targetFps() : 60, displayFps: P && P.displayInfo ? P.displayInfo().fps : 60, boosting: !!(P && P.boosting && P.boosting()), result: wantSaver ? 'battery-saver' : next < pr ? 'lower-resolution' : next > pr ? 'raise-resolution' : 'keep' };
  adaptLog.push(why); if (adaptLog.length > 60) adaptLog.shift();
  if (wantSaver && P) P.reportSlow(why);   // already at the lowest resolution and still slow
  slow = quick = sampled = 0; since = now; if (next !== pr) { pr = next; renderer.setPixelRatio(pr); resize(); }
}
// Per-frame cost counters for the performance test: CPU time in the scene update (animation, effects) and in
// renderer.render (WebGL command submission). The GPU's own time cannot be read in Safari.
// draws: interval between drawn frames (only while the test records); missed = a drawn frame later than 1.5x its
// budget; judgedSlow = frames the resolution / Battery saver rule counted as slow (over 28 ms of render time)
const meter = { frames: 0, upd: 0, ren: 0, worst: 0, hide: null, rec: false, draws: [], lastDraw: 0, missed: 0, judgedSlow: 0, judged: 0, budget: 0 };
// The performance test can hide named layers (prefix match, e.g. 'atmo:') for each drawn frame, to compare with and
// without them. Visibility is put back straight after the draw, so the game's own show/hide logic is untouched.
function hideLayers(scene, prefixes) {
  const out = []; scene.traverse((x) => { if (x.visible && x.name && prefixes.some((p) => x.name.indexOf(p) === 0)) { x.visible = false; out.push(x); } }); return out;
}
// Dev 7 frame budget: 30 fps while the view is idle, 60 fps for a moment after an action, 30 in Battery saver.
// Frames in between are skipped before any update or draw, so the GPU does no work for them.
let lastDraw = 0;
// Phase 7 performance fix: evidence of the frame rate the page can get (see Perf.noteFrame). The interval to the next
// callback counts only after a light callback: a skipped frame, or a drawn frame with under 6 ms of CPU whose GPU work
// had finished ~6 ms after it was sent (a WebGL2 fence, checked without waiting) while the main thread was free. Heavy frames give no evidence, so a
// struggling device cannot talk itself into a lower budget. WebGL1 has no fences: only skipped frames count there.
let cbPrev = 0, cbLight = false, cbToken = 0;
function judgeLight(cpuMs) {
  const gl = renderer.getContext(); cbLight = false;
  if (cpuMs > 6 || typeof gl.fenceSync !== 'function') return;
  let f; try { f = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush(); } catch (e) { return; }
  if (!f) return; const tok = ++cbToken, t0 = performance.now(); cbLight = null;
  // light only if the check itself ran on time (the main thread was free right after the frame: nothing else on the
  // page is hogging it) and the GPU had finished by then
  setTimeout(() => { let done = false; try { done = performance.now() - t0 < 16 && gl.getSyncParameter(f, gl.SYNC_STATUS) === gl.SIGNALED; gl.deleteSync(f); } catch (e) { done = false; } if (tok === cbToken && cbLight === null) cbLight = done; }, 6);
}
function loop(now) {
  raf = 0; if (!active || document.hidden || contextLost) return;
  const P = Perf(), cap = P ? P.targetFps() : 60;
  if (cbPrev && cbLight === true && P && P.noteFrame) P.noteFrame(now - cbPrev);
  cbPrev = now;
  if (now - lastDraw < 1000 / cap - 2) { cbLight = true; raf = requestAnimationFrame(loop); return; }
  if (meter.rec) { if (meter.lastDraw) { const d = now - meter.lastDraw; if (meter.draws.length < 20000) meter.draws.push(d); if (d > 1500 / cap) meter.missed++; } meter.lastDraw = now; meter.budget += cap; }
  lastDraw = now; drawn++;
  const raw = clock.getDelta(), dt = Math.min(0.05, raw); const t = clock.elapsedTime;
  const c0 = performance.now(); active.update(dt, t); const c1 = performance.now();
  const hid = meter.hide ? hideLayers(active.scene, meter.hide) : null;
  renderer.render(active.scene, active.camera); const c2 = performance.now();
  if (hid) hid.forEach((x) => { x.visible = true; });
  meter.frames++; meter.upd += c1 - c0; meter.ren += c2 - c1; if (c2 - c0 > meter.worst) meter.worst = c2 - c0;
  judgeLight(c2 - c0);
  // judge render time, not the frame cap: a frame is only late beyond its budget, and the budget is never shorter than
  // the frames the page can get (Phase 7 fix: a page capped at 30 fps is not slow for missing a 60 fps goal). On a page
  // that gets 60 this is exactly the earlier rule.
  const budget = Math.max(1000 / cap, P && P.displayMs ? P.displayMs() : 1000 / 60);
  if (raw > 0 && raw < 1) adapt(Math.max(0, raw * 1000 - (budget - 1000 / 60)), now);
  frames++; if (now - lastStatsT > 1000) { fps = (frames * 1000) / (now - lastStatsT); frames = 0; lastStatsT = now; }
  raf = requestAnimationFrame(loop);
}
function start() { if (!raf && active && !document.hidden) { starts++; clock.start(); since = 0; slow = quick = sampled = 0; cbPrev = 0; cbLight = false; raf = requestAnimationFrame(loop); } }
function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; clock.stop(); }
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
const boost = (ms) => { const P = Perf(); if (P) P.boost(ms); };
function attach(view, container) {
  boost();
  if (active && active !== view) active.detach();
  active = view; const r = getRenderer(); container.appendChild(r.domElement); resize(); start();
}
function resize() {
  if (!active || !renderer) return; const el = renderer.domElement.parentNode; if (!el) return;
  const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
  active.camera.aspect = w / h; active.camera.updateProjectionMatrix(); if (active.onResize) active.onResize(w, h);
}
window.addEventListener('resize', resize);
const calm = () => !!(A.UI && A.UI.calm && A.UI.calm());

/* ------------------------------------------------------------------ templates (shared geometry/materials) */
const templates = new Map(); // spId -> Promise<{ root, clips, refs }>
const isVox = (id) => !!(A.Voxel && D.SPECIES[id] && D.SPECIES[id].art && A.Voxel.has(D.SPECIES[id].art.vox));
const heroUrl = (id) => (!isVox(id) && C.HERO_IDS.indexOf(id) >= 0 ? 'assets/creatures/' + id + '.glb' : null);
// Phase 15: a prototype model (developer switch, A.Proto15) is cached under its own key, so switching never mixes them
const tkey = (spId) => (A.Proto15 && A.Proto15.active(spId) ? spId + '#p15' + A.Proto15.lod() : spId);   // per detail level
function template(spId) {
  const tk = tkey(spId);
  if (templates.has(tk)) return templates.get(tk);
  const p = (async () => {
    const url = heroUrl(spId);
    if (url) {
      try { const g = await new GLTFLoader().loadAsync(url); const root = g.scene.getObjectByName('amina'); if (root) { root.userData = Object.assign({ id: spId, hover: C.isHover(D.SPECIES[spId].art) }, root.userData); return { root, clips: g.animations, refs: 0, source: 'glb' }; } }
      catch (e) { /* fall back to the procedural build below */ }
    }
    const m = isVox(spId) ? C.buildVoxel(D.SPECIES[spId]) : C.buildAmina(D.SPECIES[spId]); return { root: m.root, clips: m.clips, refs: 0, source: isVox(spId) ? 'voxel' : 'procedural' };
  })();
  templates.set(tk, p); trimTemplates(); return p;
}
// Keep at most 14 species in memory; free the least recently requested ones that nothing is using.
function trimTemplates() {
  if (templates.size <= 14) return;
  for (const [id, p] of templates) { if (templates.size <= 14) break; p.then((t) => { if (t.refs <= 0 && templates.get(id) === p) { templates.delete(id); disposeTree(t.root); } }); }
}
function disposeTree(root) { const sk = new Set(); root.traverse((o) => { if (o.isMesh) { if (o.geometry.userData && o.geometry.userData.shell) o.geometry.userData.shell.geo.dispose(); o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); if (o.isSkinnedMesh) sk.add(o.skeleton); } }); sk.forEach((s) => s.dispose()); }

/* ------------------------------------------------------------------ shared sprite textures */
let glowTex = null, shadowTex = null, sparkTex = null;
function tex(kind) {
  const mk = (stops) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  if (kind === 'glow') return glowTex || (glowTex = mk([[0, 'rgba(255,255,255,0.85)'], [0.45, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]));
  if (kind === 'shadow') return shadowTex || (shadowTex = mk([[0, 'rgba(10,5,30,0.55)'], [0.6, 'rgba(10,5,30,0.25)'], [1, 'rgba(10,5,30,0)']]));
  return sparkTex || (sparkTex = mk([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]));
}

/* ------------------------------------------------------------------ actors */
// An Actor is one creature instance: a clone of a template (shared geometry), its own materials (for hit flashes),
// a mixer, a blob shadow and an optional glow. play(name) resolves when a one-shot clip ends, then idles again.
class Actor {
  constructor(t, spId) {
    this.spId = spId; this.t = t; t.refs++;
    this.root = C.cloneCreature(t.root); this.mats = [];   // Phase 8B: skinned parts are re-bound to this copy's own bones
    this.root.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); this.mats.push(o.material); o.frustumCulled = !o.isSkinnedMesh; } });
    this.group = new THREE.Group(); this.group.add(this.root);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: tex('shadow'), transparent: true, depthWrite: false }));
    quad.rotation.x = -Math.PI / 2; quad.position.y = 0.01; this.group.add(quad); this.shadow = quad;
    const art = D.SPECIES[spId].art;
    if (art.glow) { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('glow'), color: art.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 })); g.scale.set(1.5, 1.5, 1); g.position.y = 0.55; this.group.add(g); this.glow = g; }
    this.mixer = new THREE.AnimationMixer(this.root); this.actions = {};
    t.clips.forEach((c) => { this.actions[c.name] = this.mixer.clipAction(c); });
    this.mixer.addEventListener('finished', (e) => { const cb = this._done; if (cb && e.action === this._oneShot) { this._done = null; cb(); } });
    this.idle(); this.flashT = 0;
    // Phase 8: eyelids blink on their own overlay, alongside whatever else is playing; glow and ground details live
    if (this.actions.blink) { this.blinkA = this.actions.blink; this.blinkA.setLoop(THREE.LoopRepeat); this.blinkA.time = Math.random() * this.blinkA.getClip().duration; this.blinkA.play(); }
    this.living = SC.living(this, calm);
  }
  idle() {
    const a = this.actions.idle; if (!a) return; a.reset(); a.setLoop(THREE.LoopRepeat); a.enabled = true; a.setEffectiveWeight(1); a.timeScale = calm() ? 0 : 1; a.play(); this.current = a;
    // Phase 7: two of the same species never breathe in step
    if (!this._idled) { this._idled = true; a.time = Math.random() * a.getClip().duration; }
  }
  // Phase 7: clips a species may not have fall back to the closest shared one
  clipName(name) { if (this.actions[name]) return name; return { special: 'attack', hitBig: 'hit', heal: 'move', guard: 'move', ready: null }[name] || null; }
  // Phase 7: an element-coloured outline (an inverted hull: the creature's own geometry, scaled about its centre,
  // drawn back faces only). Built on first use; fades in and out.
  setOutline(color, strength) {
    if (!this.hull) {
      this.hull = []; const meshes = []; const parts = !!this.root.userData.parts; this.root.traverse((o) => { if (o.isMesh && o.name !== 'hull' && !/:lid/.test(o.name) && !(parts && /:glow/.test(o.name)) && meshes.length < 24) meshes.push(o); });
      const hullMat = () => new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
      meshes.forEach((m) => {
        // Phase 8B: a skinned creature gets a skinned shell (each part inflated about its own centre, following the pose)
        if (m.isSkinnedMesh) { const h = C.skinnedShell(m, 1.06, hullMat()); h.name = 'hull'; h.visible = false; h.renderOrder = 1; m.parent.add(h); this.hull.push(h); return; }
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const c = m.geometry.boundingBox.getCenter(new THREE.Vector3()), s = 1.06;
        const h = new THREE.Mesh(m.geometry, hullMat());
        h.name = 'hull'; h.scale.setScalar(s); h.position.copy(c).multiplyScalar(1 - s); h.visible = false; h.renderOrder = 1; m.add(h); this.hull.push(h); });
      this.hullOp = 0;
    }
    if (color) this.hull.forEach((h) => h.material.color.set(color));
    this.hullTarget = Math.max(0, Math.min(1, strength || 0));
  }
  // play('attack'|'special'|'hit'|'hitBig'|'heal'|'guard'|'ready'|'victory'|'defeat'|'move'); resolves at the end of the clip
  play(name, o) {
    o = o || {}; name = this.clipName(name); const a = name && this.actions[name]; if (!a) return Promise.resolve();
    if (this.living) this.living.onPlay(name);
    if (this.blinkA) { if (name === 'defeat') this.blinkA.stop(); else if (!this.blinkA.isRunning()) this.blinkA.play(); }
    const prev = this.current; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.timeScale = 1;
    if (o.loop) { a.setLoop(THREE.LoopRepeat); a.clampWhenFinished = false; } else { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    if (prev && prev !== a) a.crossFadeFrom(prev, 0.12, false); a.play(); this.current = a;
    if (o.loop) return Promise.resolve();
    this._oneShot = a;
    return new Promise((res) => { this._done = () => { if (name !== 'defeat' && !o.hold) { const idle = this.actions.idle; idle.reset(); idle.play(); idle.crossFadeFrom(a, 0.18, false); this.current = idle; } res(); }; });
  }
  flash(color) { this.flashT = 0.22; this.flashCol = new THREE.Color(color || '#ffffff'); }
  get profile() { return (this.root.userData && this.root.userData.profile) || null; }
  update(dt) {
    this.mixer.update(dt);
    if (this.living) this.living.update(dt);
    if (this.hull) { const k = Math.min(1, dt * 7); this.hullOp += ((this.hullTarget || 0) - this.hullOp) * k; const op = this.hullOp < 0.01 ? 0 : this.hullOp * 0.85; this.hull.forEach((h) => { h.material.opacity = op; h.visible = op > 0; }); }
    if (this.flashT > 0) { this.flashT -= dt; const k = Math.max(0, this.flashT / 0.22); this.mats.forEach((m) => { if (!m.userData.e0) m.userData.e0 = [m.emissive.clone(), m.emissiveIntensity]; m.emissive.copy(m.userData.e0[0]).lerp(this.flashCol, k); m.emissiveIntensity = m.userData.e0[1] + k * 1.2; }); if (this.flashT <= 0) this.mats.forEach((m) => { if (m.userData.e0) { m.emissive.copy(m.userData.e0[0]); m.emissiveIntensity = m.userData.e0[1]; } }); }
    if (this.glow) this.glow.material.opacity = 0.45 + Math.sin(performance.now() / 600) * 0.1;
    const rig = this.root.getObjectByName('rig'); if (rig) this.shadow.scale.setScalar(Math.max(0.5, 1 - rig.position.y * 0.8));
  }
  dispose() { if (this.living) this.living.dispose(); this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root); this.mats.forEach((m) => m.dispose());
    { const sk = new Set(); this.root.traverse((o) => { if (o.isSkinnedMesh && o.name !== 'hull') sk.add(o.skeleton); }); sk.forEach((s) => s.dispose()); } if (this.hull) this.hull.forEach((h) => { h.removeFromParent(); h.material.dispose(); }); this.shadow.geometry.dispose(); this.shadow.material.dispose(); if (this.glow) this.glow.material.dispose(); this.t.refs--; this.group.removeFromParent(); }
}
export async function actor(spId) { return new Actor(await template(spId), spId); }

/* ------------------------------------------------------------------ particles (pooled) */
class Bursts {
  constructor(scene) { this.pool = []; this.live = []; this.scene = scene; }
  emit(pos, color, n, spread, life) {
    if (calm()) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) {
      const s = this.pool.pop() || new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('spark'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.material.color.set(color); s.material.opacity = 1; s.position.copy(pos); const sc = 0.12 + Math.random() * 0.18; s.scale.set(sc, sc, 1);
      s.userData.v = new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * spread * 0.9 + 0.3, (Math.random() - 0.5) * spread); s.userData.life = s.userData.max = life || 0.6;
      this.scene.add(s); this.live.push(s);
    }
  }
  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) { const s = this.live[i]; s.userData.life -= dt; if (s.userData.life <= 0) { this.scene.remove(s); this.live.splice(i, 1); if (this.pool.length < 60) this.pool.push(s); else s.material.dispose(); continue; }
      s.position.addScaledVector(s.userData.v, dt); s.userData.v.y -= dt * 1.6; s.material.opacity = s.userData.life / s.userData.max; }
  }
  dispose() { this.live.concat(this.pool).forEach((s) => { this.scene.remove(s); s.material.dispose(); }); this.live = []; this.pool = []; }
}

/* ------------------------------------------------------------------ living-pixel aura (Dev 8) */
// One InstancedMesh of tiny cubes orbiting and rising around a point; colours shift for the Island Boss.
function pixelAura(scene, at, scale, prismatic) {
  const n = calm() ? 8 : 22, geo = new THREE.BoxGeometry(0.06, 0.06, 0.06), mat = new THREE.MeshBasicMaterial({ color: prismatic ? '#ffffff' : '#ffe9a0', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const mesh = new THREE.InstancedMesh(geo, mat, n), m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
  const seed = Array.from({ length: n }, (_, i) => ({ a: (i / n) * Math.PI * 2, h: Math.random(), r: 0.55 + Math.random() * 0.5, sp: 0.25 + Math.random() * 0.3 }));
  if (prismatic) for (let i = 0; i < n; i++) mesh.setColorAt(i, col.setHSL(i / n, 0.85, 0.65));
  scene.add(mesh);
  return {
    update(t, dt) {
      for (let i = 0; i < n; i++) { const s = seed[i]; s.h += (dt || 0.016) * s.sp; if (s.h > 1) s.h -= 1; const a = s.a + t * 0.6;
        v.set(at.x + Math.cos(a) * s.r * scale * 0.7, 0.15 + s.h * 1.9 * scale / 1.3, at.z + Math.sin(a) * s.r * scale * 0.5); m.compose(v, q, one.setScalar(1 - s.h * 0.6)); mesh.setMatrixAt(i, m);
        if (prismatic) mesh.setColorAt(i, col.setHSL((i / n + t * 0.1) % 1, 0.85, 0.65)); }
      mesh.instanceMatrix.needsUpdate = true; if (prismatic && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    dispose() { scene.remove(mesh); geo.dispose(); mat.dispose(); mesh.dispose(); },
  };
}

/* ------------------------------------------------------------------ battle stage */
// createBattle(container, { dungeon, player: spId, enemy: spId, boss }) -> controller used by ui2.js
export async function createBattle(container, o) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 2, 0.1, 60);
  const saver = () => { const Pf = Perf(); return !!(Pf && Pf.saver()); };
  const arena = buildArena(scene, o.dungeon || 'reliquary', { boss: !!o.boss, island: !!o.prismatic, still: calm, saver, tier: () => { const Pf = Perf(); return Pf ? (Pf.saver() ? 'saver' : Pf.forceTier || (Pf.quality ? Pf.quality() : 'high')) : 'high'; } }); const lights = C.studioLights(scene, arena.def.mood, arena.light); arena.bindLights(lights);
  const bursts = new Bursts(scene);
  const fx = new Fx(scene, { calm, saver }), marks = new FocusMarks(scene);
  // both creatures turn three quarters towards the camera and partly towards each other, so faces stay readable
  const P = { pos: new THREE.Vector3(-1.45, 0, 0.9), yaw: 1.2 }, E = { pos: new THREE.Vector3(1.35, 0, -0.95), yaw: -0.85 };
  const slots = { p: null, e: null };
  const place = (who, act, scale) => { const s = who === 'p' ? P : E; act.group.position.copy(s.pos); act.group.rotation.y = s.yaw; act.group.scale.setScalar(scale); scene.add(act.group); };
  const [pa, ea] = await Promise.all([actor(o.player), actor(o.enemy)]);
  // bosses stand larger; o.scale (from the battle spec) sets how much, capped so faces stay in frame
  const eScale = o.scale ? Math.min(2.1, 1.3 * Math.max(1, o.scale)) : o.boss ? 1.65 : 1.3;
  slots.p = pa; slots.e = ea; place('p', pa, 1.25); place('e', ea, eScale);
  marks.slot('p', P.pos, 1.25); marks.slot('e', E.pos, eScale);
  // telegraph ring under the enemy (a charged attack is coming)
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 40), new THREE.MeshBasicMaterial({ color: '#ff4a6a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.copy(E.pos).setY(0.03); scene.add(ring);
  const bossRune = o.boss ? new THREE.Mesh(new THREE.RingGeometry(1.0, 1.15, 6), new THREE.MeshBasicMaterial({ color: '#ffd86b', transparent: true, opacity: 0.55, depthWrite: false })) : null;
  if (bossRune) { bossRune.rotation.x = -Math.PI / 2; bossRune.position.copy(E.pos).setY(0.02); scene.add(bossRune); }
  // Island Boss: a prismatic halo whose colour keeps shifting (one mesh, colour changed in place: no per-frame allocation)
  const prism = o.prismatic ? new THREE.Mesh(new THREE.RingGeometry(1.15, 1.5, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })) : null;
  const prismUp = o.prismatic ? new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })) : null;
  if (prism) { prism.rotation.x = -Math.PI / 2; prism.position.copy(E.pos).setY(0.04); scene.add(prism); prismUp.position.copy(E.pos).setY(1.25 * eScale / 1.3); prismUp.rotation.y = E.yaw; scene.add(prismUp); }
  // barrier: a translucent dome over the enemy while a Stone Barrier stands
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.05 * eScale / 1.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#c8d2e0', transparent: true, opacity: 0, depthWrite: false }));
  dome.position.copy(E.pos); scene.add(dome); let barrier = false;
  // Dev 8 living pixel: a boss sheds small glowing cubes that rise around it (prismatic for the Island Boss)
  const aura = o.boss ? pixelAura(scene, E.pos, eScale, !!o.prismatic) : null;
  let shake = 0, telegraph = false, t0 = 0;
  const camBase = new THREE.Vector3(-0.35, 1.7, 5.0), look = new THREE.Vector3(0.05, 0.62, -0.15);
  // Phase 7 camera: a gentle push towards whoever unleashes an ultimate, and a short punch-in on big hits
  const cam = { push: 0, pushTo: 0, toward: new THREE.Vector3(), punch: 0, focus: 0, focusTo: 0, fv: new THREE.Vector3() }, camTmp = new THREE.Vector3(), lookTmp = new THREE.Vector3();
  // Phase 15C: per-frame presentation updaters (the nine swords) and things to release if the battle ends mid-sequence
  const ticks = [], owned = []; let lastHitAt = -1;
  // Phase 14 finalisation: the boss introduction. The camera opens close on the boss, holds while it rears up (its own
  // approved 'special' clip, or 'attack' where it has none), then eases back to the battle view. About 1.6 s; a tap
  // ends it at once (skipIntro); skipped entirely for Reduce Motion and Battery saver.
  const intro = { t: -1, len: 1.6, hold: 0.45, done: null }, introTgt = new THREE.Vector3(), introPos = new THREE.Vector3(), INTRO_OFF = new THREE.Vector3(0.9, 0.45, 2.8); // framed from the boss's own side, so the player's Amina is out of shot
  // Phase 7 timeline: effects scheduled against the battle's own clock (they line up with the animation, not with timers)
  const timeline = []; let clockT = 0; const at = (delay, fn) => timeline.push({ t: clockT + delay, fn });
  // Phase 15C: the presentation API handed to move sequences (the camera, per-frame updaters, clean-up on dispose)
  const camApi = { focus: (v, w) => { cam.fv.copy(v); cam.focusTo = Math.max(0, Math.min(1, w == null ? 1 : w)); }, release: () => { cam.focusTo = 0; } };
  const mkApi = () => ({ fx, at, slot: (w) => slots[w], other, calm, saver, chest, head, scene, cam: camApi, now: () => clockT, tick: (fn) => ticks.push(fn), own: (fn) => owned.push(fn),
    shake: (v) => { if (!calm()) shake = Math.max(shake, v); }, from: (w, node) => { const r = slots[w].root, o = r.getObjectByName(node) || r.getObjectByName('mouth') || r.getObjectByName('handR'); return o ? o.getWorldPosition(new THREE.Vector3()) : chest(w); } });
  // Phase 7 focus: who is active, who is targeted (driven by the battle UI, see ui2.js syncArena)
  const focus = { active: null, target: null, mode: null, preview: null, key: '' };
  const SIDE = { p: '#8ff0ff', e: '#ff7aa0' }, TARGET = '#ff7aa0';
  const elOf = (who) => (slots[who].profile && slots[who].profile.el) || (D.SPECIES[slots[who].spId] && D.SPECIES[slots[who].spId].el) || 'light';
  const applyFocus = () => {
    ['p', 'e'].forEach((w) => {
      const act = focus.active === w, tgt = focus.target === w, pv = focus.preview;
      const ringK = act ? (focus.mode === 'turn' ? 0.85 : 1) * (pv === 'self' && w === 'p' ? 1.25 : 1) : 0;
      marks.ring(w, act && focus.mode === 'act' && w === 'e' ? SIDE.e : SIDE[w], Math.min(1, ringK));
      marks.reticle(w, tgt ? (pv === 'foe' && w === 'e' ? 1 : focus.mode === 'turn' ? 0.5 : 0.85) : 0, TARGET); if (tgt && pv === 'foe' && w === 'e') marks.strike(w);
      // the active Amina is outlined in its element's colour; a foe you are aiming at is outlined in the target rose
      const a = slots[w]; if (a) { if (act) a.setOutline(D.ELEMENTS[elOf(w)] ? D.ELEMENTS[elOf(w)].color : '#ffffff', focus.mode === 'turn' ? 0.5 : 0.8); else if (tgt && pv === 'foe') a.setOutline(TARGET, 0.55); else a.setOutline(null, 0); }
    });
  };
  const view = {
    scene, camera, kind: 'battle:' + arena.key + (o.prismatic ? ':island-boss' : o.boss ? ':guardian' : ''),
    update(dt, t) {
      t0 = t; clockT += dt;
      for (let i = timeline.length - 1; i >= 0; i--) if (timeline[i].t <= clockT) { const ev = timeline[i]; timeline.splice(i, 1); try { ev.fn(); } catch (e) { /* an effect never stops a battle */ } }
      const still = calm(), hold = fx.frozen > 0 ? 0 : dt;   // a super-effective hit freezes the fighters for a beat
      for (let i = ticks.length - 1; i >= 0; i--) { let keep = false; try { keep = ticks[i](dt) !== false; } catch (e) { keep = false; } if (!keep) ticks.splice(i, 1); }
      slots.p.update(hold); slots.e.update(hold); arena.update(t, dt); bursts.update(dt); fx.update(dt); marks.update(dt, t, still); if (aura) aura.update(t, dt);
      ring.material.opacity = telegraph ? 0.45 + Math.sin(t * 8) * 0.3 : Math.max(0, ring.material.opacity - dt * 2);
      if (bossRune) bossRune.rotation.z += dt * 0.25;
      if (prism && !still) { prism.material.color.setHSL((t * 0.12) % 1, 0.85, 0.62); prismUp.material.color.setHSL((t * 0.12 + 0.5) % 1, 0.85, 0.66); prism.rotation.z += dt * 0.4; prismUp.material.opacity = 0.24 + Math.sin(t * 2.2) * 0.1; }
      dome.material.opacity += ((barrier ? 0.28 : 0) - dome.material.opacity) * Math.min(1, dt * 6);
      cam.push += (cam.pushTo - cam.push) * Math.min(1, dt * 5); cam.punch = Math.max(0, cam.punch - dt * 3.5); cam.focus += ((still ? 0 : cam.focusTo) - cam.focus) * Math.min(1, dt * 4);
      camera.position.copy(camBase); lookTmp.copy(look);
      if (intro.t >= 0) { intro.t += dt; const k0 = intro.t < intro.hold ? 1 : Math.max(0, 1 - (intro.t - intro.hold) / (intro.len - intro.hold)), k = k0 * k0 * (3 - 2 * k0);
        introTgt.copy(chest('e')); introPos.copy(introTgt).add(INTRO_OFF); camera.position.lerp(introPos, 0.7 * k); lookTmp.lerp(introTgt, 0.8 * k);
        if (intro.t >= intro.len) { intro.t = -1; const d = intro.done; intro.done = null; if (d) d(); } }
      if (cam.push > 0.002 && !still) { camTmp.copy(cam.toward).sub(camBase).multiplyScalar(0.16 * cam.push); camera.position.add(camTmp); lookTmp.lerp(cam.toward, 0.25 * cam.push); }
      // Phase 15C: target framing on specials (eases in and back; never with Reduce Motion)
      if (cam.focus > 0.002 && !still) { camTmp.copy(cam.fv).sub(camera.position).multiplyScalar(0.1 * cam.focus); camTmp.y *= 0.4; camera.position.add(camTmp); lookTmp.lerp(cam.fv, 0.35 * cam.focus); }
      if (shake > 0 && !still) { shake -= dt; camera.position.x += (Math.random() - 0.5) * shake * 0.25; camera.position.y += (Math.random() - 0.5) * shake * 0.2; }
      const fov = 36 - (still ? 0 : cam.punch * 2.2); if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
      camera.lookAt(lookTmp);
    },
    onResize(w, h) { const narrow = w / h < 1.6; camBase.set(-0.35, narrow ? 1.9 : 1.7, narrow ? 6.2 : 5.0); },
    detach() { stop(); },
  };
  attach(view, container);
  const head = (who) => { const a = slots[who]; const p = a.group.position.clone(); p.y += 0.75 * a.group.scale.y; return p; };
  const chest = (who) => { const a = slots[who]; const p = a.group.position.clone(); p.y += 0.5 * a.group.scale.y; return p; };
  const toScreen = (v) => { const p = v.clone().project(camera), r = renderer.domElement.getBoundingClientRect(); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height }; };
  const elCol = (el) => (D.ELEMENTS[el] && D.ELEMENTS[el].color) || '#ffffff';
  const other = (w) => (w === 'p' ? 'e' : 'p');
  const log = []; const note = (k) => { log.push(k); if (log.length > 60) log.shift(); };
  return {
    is3d: true,
    anchor: (who) => toScreen(head(who)),
    attack(who) { boost(); return slots[who].play('attack'); },
    intro() { if (calm() || !slots.e) return Promise.resolve(false); boost(); intro.t = 0; at(0.18, () => { if (slots.e) slots.e.play('special'); }); if (slots.e) slots.e.setOutline('#ffd978', 0.7); at(intro.len, () => { if (slots.e && focus.target !== 'e') slots.e.setOutline(null, 0); }); return new Promise((res) => { intro.done = () => res(true); }); },
    skipIntro() { if (intro.t < 0) return; intro.t = intro.len; },
    introOn() { return intro.t >= 0; },
    // Phase 7: the battle UI says who is active and who is targeted; the arena shows it (outline, ring, reticle)
    focus(f) {
      f = f || {}; const key = (f.active || '-') + '|' + (f.target || '-') + '|' + (f.mode || '-');
      if (key === focus.key) return; const was = focus.key; focus.key = key; focus.active = f.active || null; focus.target = f.target || null; focus.mode = f.mode || null;
      note(key); applyFocus(); boost(600);
      // its turn begins: the active Amina plays its battle-ready move (once per turn, not with Reduce motion)
      if (f.mode === 'turn') cam.focusTo = 0;   // Phase 15C: a new turn always returns the camera to the battle view
      if (f.mode === 'turn' && f.active && !calm()) slots[f.active].play('ready');
      void was;
    },
    // pressing a move previews its target: 'foe' (the reticle closes on the opponent) or 'self' (your ring brightens)
    preview(kind) { if (focus.preview === (kind || null)) return; focus.preview = kind || null; applyFocus(); boost(400); },
    // 'attack' (style from the creature's profile), 'cast' (heal/guard). info: { el, type, special, boss, power }
    use(who, kind, info) {
      boost(1600); info = info || {}; const a = slots[who], tgt = other(who), pf = a.profile || {}, el = info.el || elOf(who);
      // Phase 8B: a shot leaves from the named point, else the creature's mouth, else its hand, else its chest
      const api = mkApi();
      if (kind !== 'attack') { const clip = info.type === 'heal' ? 'heal' : info.type === 'guard' ? 'guard' : 'move'; note('use:' + who + ':' + clip); SC.choreograph(api, who, a.spId, info.abil, info); return a.play(clip); }
      const mv = SC.SHOWCASE_IDS.indexOf(a.spId) >= 0 && A.Showcase && A.Showcase.moves && A.Showcase.moves[info.abil];
      const ult = mv && mv.ult === false ? !!info.boss : !!(info.special || info.boss), clip = mv && mv.clip ? mv.clip : ult ? 'special' : 'attack', F = ELFX[el] || ELFX.light;
      // Phase 15C: a move with its own signature sequence (Atem III's nine swords) plays that instead
      const sig = C15.sig(a.spId, info.abil);
      if (sig) { const sc = a.actions[sig.clip] ? sig.clip : clip; note('use:' + who + ':' + sc); note('move:' + who + ':' + info.abil); try { sig.run(api, who, info); } catch (e) { /* an effect never stops a battle */ } return a.play(sc); }
      note('use:' + who + ':' + clip);
      if (ult) {
        // the ultimate: the attacker gathers its element in a rising column while the camera leans in
        fx.column(a.group.position, F.c, 14, { r: 0.55 * a.group.scale.x, rise: 1.4 }); fx.glow(chest(who), F.c[1], 1.6, 0.5);
        if (!calm()) { cam.toward.copy(chest(who)); cam.pushTo = 1; at(0.62, () => { cam.pushTo = 0; }); }
      }
      const contact = ult ? 0.4 : 0.34, ranged = pf.ranged || ult || info.type === 'drain' || info.type === 'weaken';
      if (ult) C15.specialCamera(api, who, contact);
      if (SC.choreograph(api, who, a.spId, info.abil, info)) note('move:' + who + ':' + info.abil);
      else if (ranged) at(Math.max(0.05, contact - 0.2), () => { fx.projectile(chest(who), chest(tgt), el, { dur: 0.2, big: ult }); });
      else at(contact, () => { fx.slash(chest(tgt), el, who === 'p' ? 1 : -1); });
      return a.play(clip);
    },
    async hit(who, el, eff, info) {
      boost(1200); info = info || {}; const a = slots[who]; const big = eff === 'super' || info.big; lastHitAt = clockT;
      a.flash(elCol(el)); marks.strike(who); note('hit:' + who + ':' + (eff || 'normal'));
      fx.impact(chest(who), el, eff === 'super' ? 'super' : info.big ? 'big' : eff === 'weak' ? 'weak' : 'normal');
      shake = big ? 0.35 : eff === 'weak' ? 0.08 : 0.18;
      if (eff === 'super') { fx.freeze(80); cam.punch = 1; } else if (info.big) cam.punch = 0.6;
      hitAccent({ fx, at, slot: (w) => slots[w], chest, calm }, who, el, eff, info); C15.hit(mkApi(), who, el, eff);
      return a.play(big ? 'hitBig' : 'hit');
    },
    heal(who) { boost(1000); const a = slots[who]; fx.column(a.group.position, ['#e8ffe8', '#9dffb0', '#5fe08a'], 12, { r: 0.5 * a.group.scale.x, rise: 1.0 }); fx.glow(chest(who), '#9dffb0', 1.3, 0.5); a.flash('#9dffb0'); note('heal:' + who); C15.heal(mkApi(), who); },
    guard(who) { boost(800); const a = slots[who]; fx.column(a.group.position, ['#e8f6ff', '#9ad4ff', '#5aa8e8'], 10, { r: 0.68 * a.group.scale.x, rise: 0.55, life: 0.55, size: 0.07 }); note('guard:' + who); C15.guard(mkApi(), who); },
    status(who, color) { note('status:' + who); fx.burst(head(who), [color, '#ffffff'], 7, { speed: 0.8, life: 0.5, size: 0.05, grav: 0.4 }); C15.status(mkApi(), who, color); },
    // Phase 15C: extra milliseconds the battle UI waits after this move (only signature sequences ask for any)
    hold(who, abil) { const a = slots[who]; return a ? C15.hold(a.spId, abil, { calm: calm(), saver: saver() }) : 0; },
    faint(who) { boost(); note('faint:' + who); slots[who].setOutline(null, 0); marks.ring(who, null, 0); marks.reticle(who, 0); fx.burst(slots[who].group.position.clone().setY(0.1), ['#cfc6ee', '#9a90c0'], 10, { speed: 0.7, up: 0.3, life: 0.6, size: 0.06, grav: 0.6 }); C15.faint(mkApi(), who); return slots[who].play('defeat'); },
    victory(who) {
      boost(2500); note('victory:' + who); focus.key = ''; focus.active = focus.target = null; applyFocus();
      const a = slots[who], F = ELFX[elOf(who)] || ELFX.light; marks.ring(who, '#ffd978', 1);
      fx.column(a.group.position, F.c.concat(['#ffd978']), 18, { r: 0.6 * a.group.scale.x, rise: 1.8, life: 1.0, size: 0.06 }); C15.victory(mkApi(), who);
      return a.play('victory', { loop: true });
    },
    async swap(who, spId) {
      boost(); const old = slots[who]; const n = await actor(spId); const sc = who === 'e' ? 1.3 : 1.25; place(who, n, sc); slots[who] = n; marks.resize(who, sc); old.dispose(); n.play('move');
      fx.burst(head(who), ['#ffffff', elCol(elOf(who))], 10, { speed: 1.2, life: 0.5, size: 0.06 }); note('swap:' + who); applyFocus();
    },
    setTelegraph(on) { telegraph = !!on; },
    setBarrier(on) { barrier = !!on; },
    setElement(el) { fx.burst(head('e'), [elCol(el), '#ffffff'], 14, { speed: 1.4, life: 0.7, size: 0.06 }); },
    // diagnostics for tests: what the arena is showing and what is alive
    debug() { return { c15: { ticks: ticks.length, owned: owned.length, clock: +clockT.toFixed(3), lastHitAt: +lastHitAt.toFixed(3), camFocus: +cam.focus.toFixed(3), swords: C15.last9 ? { caught: C15.last9.caught || 0, hits: C15.last9.hit.filter(Boolean).length, hitAt: C15.last9.hitAt.slice(), start: C15.last9.start, done: C15.last9.done, visible: C15.last9.visible, maxVisible: C15.last9.maxVisible } : null }, focus: { active: focus.active, target: focus.target, mode: focus.mode, preview: focus.preview }, marks: marks.state(), fx: fx.live(), cubes: fx.p.length, shots: fx.shots.length, timeline: timeline.length, log: log.slice(), profiles: { p: slots.p.profile, e: slots.e.profile }, clips: { p: Object.keys(slots.p.actions), e: Object.keys(slots.e.actions) }, playing: { p: slots.p.current && slots.p.current.getClip().name, e: slots.e.current && slots.e.current.getClip().name }, arena: arena.key, atmosphere: arena.atmo || null }; },
    dispose() {
      if (active === view) { active = null; stop(); } if (renderer && renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      timeline.length = 0; ticks.length = 0; owned.forEach((f) => { try { f(); } catch (e) { /* already gone */ } }); owned.length = 0;
      slots.p.dispose(); slots.e.dispose(); bursts.dispose(); fx.dispose(); marks.dispose(); arena.dispose(); scene.remove(lights); ring.geometry.dispose(); ring.material.dispose();
      if (bossRune) { bossRune.geometry.dispose(); bossRune.material.dispose(); }
      if (prism) { [prism, prismUp].forEach((m) => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }); }
      scene.remove(dome); dome.geometry.dispose(); dome.material.dispose();
      if (aura) aura.dispose();
      void t0;
    },
  };
}

/* ------------------------------------------------------------------ creature viewer (detail screen, hatch/evolve reveal) */
export async function createViewer(container, spId, o) {
  o = o || {};
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, 0.05, 30); C.studioLights(scene, 'studio');
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.75, 40), new THREE.MeshBasicMaterial({ map: tex('shadow'), transparent: true, depthWrite: false })); disc.rotation.x = -Math.PI / 2; scene.add(disc);
  let act = await actor(spId); act.group.scale.setScalar(1); scene.add(act.group);
  let yaw = SC.VIEW_YAW[spId] != null ? SC.VIEW_YAW[spId] : -0.45, vel = 0, drag = null;
  const view = {
    scene, camera, kind: 'viewer:' + spId,
    update(dt) { if (!drag) { yaw += vel * dt; vel *= Math.pow(0.04, dt); if (Math.abs(vel) < 0.02 && !calm()) yaw += dt * 0.15; } act.group.rotation.y = yaw; act.update(dt);
      camera.position.set(0, 0.98, 2.8); camera.lookAt(0, 0.52, 0); },
    detach() { stop(); },
  };
  attach(view, container);
  const el = renderer.domElement;
  const down = (e) => { boost(3000); drag = { x: e.clientX, y0: yaw, t: performance.now(), moved: false }; el.setPointerCapture && el.setPointerCapture(e.pointerId); };
  const move = (e) => { if (!drag) return; boost(); const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; const ny = drag.y0 + dx * 0.012; vel = (ny - yaw) / Math.max(0.016, (performance.now() - drag.t) / 1000); drag.t = performance.now(); yaw = ny; };
  const voice = (cue) => { const Au = A.Audio; if (Au && Au.monster) Au.monster(act.spId, cue); };
  const up = () => { if (drag && !drag.moved) { act.play('victory'); voice('tap'); } drag = null; vel = Math.max(-6, Math.min(6, vel)); };
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  if (o.intro) { act.play(o.intro); voice('idle'); }
  return {
    play: (n) => { boost(); return act.play(n); },
    async set(sp) { const n = await actor(sp); scene.add(n.group); act.dispose(); act = n; },
    dispose() {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      if (active === view) { active = null; stop(); } if (el.parentNode === container) container.removeChild(el);
      act.dispose(); disc.geometry.dispose(); disc.material.dispose();
    },
  };
}

/* ------------------------------------------------------------------ Dev 8: living-pixel test scene */
// The reference scene for the art direction: a patch of block terrain, one building, a normal creature, a glowing
// creature with a pixel aura, drifting motes, and a "moment" (burst) on demand. Same parts and budget as the game.
export async function createTestScene(container, o) {
  o = o || {};
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 2, 0.1, 60), T = tracker(), group = new THREE.Group(), r = rnd(4242);
  const add = (mesh, p) => { p = p || {}; mesh.position.set(p.x || 0, p.y || 0, p.z || 0); mesh.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0); if (p.sx || p.sy || p.sz) mesh.scale.set(p.sx || 1, p.sy || 1, p.sz || 1); group.add(mesh); return mesh; };
  const K = kit(add, T, r);
  // terrain: grass with a dirt path and a stone edge; a small cliff step at the back
  K.floor((i, j, x, z) => (Math.abs(x - z * 0.4) < 0.7 ? (r() < 0.5 ? '#b08a5a' : '#a07a4a') : (r() < 0.5 ? '#62ad4c' : '#57a044')), { rx: 5.5, rz: 4.2, bump: 0.08 });
  for (let x = -4.5; x <= 4.5; x += 0.5) K.box((x * 2) % 2 ? '#8a9098' : '#7a8088', x, 0, -3.6, 0.5, 0.5 + r() * 0.4, 0.5);
  // building: a small smithy of blocks (walls, slate roof, chimney with a glowing window)
  K.box('#b9a88a', -2.4, 0, -1.8, 1.8, 1.1, 1.4); K.box('#7a5a44', -2.4, 1.1, -1.8, 2.1, 0.22, 1.7); K.box('#5a6a80', -2.4, 1.32, -1.8, 1.7, 0.22, 1.3); K.box('#4a5a70', -2.4, 1.54, -1.8, 1.1, 0.2, 0.9);
  K.box('#3a3028', -2.4, 0, -1.08, 0.42, 0.7, 0.04); K.box('#ffd27a', -1.85, 0.45, -1.08, 0.3, 0.26, 0.04, { e: '#ffb84a', ei: 1.6 });
  K.box('#6a3222', -1.8, 1.3, -2.2, 0.36, 0.9, 0.36); K.box('#ff8a3a', -1.8, 2.2, -2.2, 0.2, 0.1, 0.2, { e: '#ff6a1a', ei: 2 });
  K.tree(3.6, -2.4, 1.1, '#3f8a3a', '#4fa046'); for (let i = 0; i < 12; i++) K.tuft((r() - 0.5) * 8, (r() - 0.5) * 5 - 0.6, '#5fb04a');
  scene.add(group); scene.fog = new THREE.Fog('#a8d8f0', 8, 18);
  const lights = C.studioLights(scene, 'day');
  const mt = motes(T, '#fffbe0', 30); group.add(mt);
  // creatures: a normal one and a glowing one (emissive voxels + rising pixel cubes)
  const [normal, glowing] = await Promise.all([actor(o.normal || 'acinus'), actor(o.glowing || 'lumi')]);
  normal.group.position.set(-0.4, 0, 0.6); normal.group.rotation.y = 0.5; scene.add(normal.group);
  glowing.group.position.set(1.4, 0, -0.2); glowing.group.rotation.y = -0.6; glowing.group.scale.setScalar(1.15); scene.add(glowing.group);
  glowing.mats.forEach((m) => { m.emissive = new THREE.Color('#5fd8ff'); m.emissiveIntensity = 0.16; });
  const aura = pixelAura(scene, glowing.group.position, 1.2, false);
  const bursts = new Bursts(scene);
  const view = { scene, camera, kind: 'test-scene',
    update(dt, t) { normal.update(dt); glowing.update(dt); aura.update(t, dt); bursts.update(dt);
      const u = mt.userData, p = u.pos; for (let i = 0; i < u.n; i++) { p[i * 3 + 1] += dt * (0.22 + (i % 5) * 0.05); if (p[i * 3 + 1] > 3.4) p[i * 3 + 1] = 0.05; } mt.geometry.attributes.position.needsUpdate = true;
      camera.position.set(0.3, 3.0, 8.4); camera.lookAt(0.1, 0.55, -0.8); },
    detach() { stop(); } };
  attach(view, container);
  return {
    moment() { boost(2000); const p = glowing.group.position.clone(); p.y += 0.9; bursts.emit(p, '#8fe6d6', 26, 2.2, 0.9); bursts.emit(p, '#ffd86b', 14, 1.6, 0.8); glowing.play('victory'); },
    dispose() { if (active === view) { active = null; stop(); } if (renderer && renderer.domElement.parentNode === container) container.removeChild(renderer.domElement); normal.dispose(); glowing.dispose(); aura.dispose(); bursts.dispose(); scene.remove(lights); scene.remove(group); T.dispose(); },
  };
}

/* ------------------------------------------------------------------ diagnostics */
// renders the live view n times back to back and reports the average cost (performance test and tests only).
// o.hide: names of scene objects (e.g. 'atmo:shafts') to hide for this measurement.
// o.prefix: hide every object whose name starts with one of these. o.pr: render at this pixel ratio for the measurement.
export function bench(n, o) {
  if (!active || !renderer) return null; o = o || {}; const hidden = o.prefix ? hideLayers(active.scene, o.prefix) : [];
  if (o.hide) active.scene.traverse((x) => { if (o.hide.indexOf(x.name) >= 0 && x.visible) { x.visible = false; hidden.push(x); } });
  const prWas = pr; if (o.pr && o.pr !== pr) { renderer.setPixelRatio(o.pr); resize(); }
  const gl = renderer.getContext(), px = new Uint8Array(4); renderer.render(active.scene, active.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const t0 = performance.now(); for (let i = 0; i < n; i++) renderer.render(active.scene, active.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const ms = (performance.now() - t0) / n; hidden.forEach((x) => { x.visible = true; });
  const out = { ms: +ms.toFixed(2), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pixelRatio: o.pr || pr };
  if (o.pr && o.pr !== prWas) { renderer.setPixelRatio(prWas); resize(); }
  return out;
}
// performance test: read (and optionally reset) the per-frame counters; hide layers on every drawn frame (null = show
// all); the resolution log; restart from the tier's own resolution cap, as a freshly opened battle would
export function meterRead(reset) {
  const f = meter.frames || 0, out = { frames: f, updateMs: f ? +(meter.upd / f).toFixed(2) : 0, renderMs: f ? +(meter.ren / f).toFixed(2) : 0, worstCpuMs: +meter.worst.toFixed(1), pixelRatio: pr, canvas: renderer ? [renderer.domElement.width, renderer.domElement.height] : null,
    draws: meter.draws.slice(), missed: meter.missed, judged: meter.judged, judgedSlow: meter.judgedSlow, avgBudgetFps: f ? +(meter.budget / f).toFixed(1) : 0 };
  if (reset) { meter.frames = 0; meter.upd = 0; meter.ren = 0; meter.worst = 0; meter.draws = []; meter.lastDraw = 0; meter.missed = 0; meter.judged = 0; meter.judgedSlow = 0; meter.budget = 0; }
  return out;
}
export function meterRecord(on) { meter.rec = !!on; meter.lastDraw = 0; }
export function meterHide(prefixes) { meter.hide = prefixes && prefixes.length ? prefixes.slice() : null; }
export function resolutionLog(since) { return adaptLog.filter((e) => !since || e.at >= since).map((e) => Object.assign({}, e)); }
export function resetResolution() { if (!renderer) return; pr = prCap(); renderer.setPixelRatio(pr); resize(); slow = quick = sampled = 0; since = 0; }
export function stats() {
  const i = renderer ? renderer.info : null;
  return { c3dFps: +fps.toFixed(1), drawn, starts, loopRunning: !!raf, targetFps: Perf() ? Perf().targetFps() : 60, pixelRatio: pr, drawCalls: i ? i.render.calls : 0, triangles: i ? i.render.triangles : 0, geometries: i ? i.memory.geometries : 0, textures: i ? i.memory.textures : 0, templates: templates.size, live: !!active };
}
export const VERSION = C.VERSION;
