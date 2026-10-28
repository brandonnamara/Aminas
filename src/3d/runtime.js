/* Aminas — 3D runtime (ES module, loaded on demand by src/c3d.js).
   One WebGL renderer and one render loop for the whole game. Live views (a battle stage or a creature viewer)
   borrow the renderer's canvas; the loop only runs while a view is attached and the page is visible.
   Creature templates are cached (heroes from GLB, the rest built procedurally) and shared between instances;
   everything a view creates is released in its dispose(). */
import * as C from './creature3d.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { buildArena } from './arenas.js';
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
const prCap = () => (Perf() && Perf().saver() ? 1 : PR_CAP);
let pr = PR_CAP, slow = 0, quick = 0, sampled = 0, since = 0;
function adapt(ms, now) {
  if (ms > 28) slow++; else if (ms < 18) quick++; sampled++;
  if (!since) since = now; if (now - since < 1500 || sampled < 8) return; // judge every 1.5 s of rendering
  const cap = prCap();
  if (slow > sampled * 0.5 && pr <= 1 && Perf()) Perf().reportSlow();   // already at the lowest resolution and still slow
  const next = pr > cap ? cap : slow > sampled * 0.5 && pr > 1 ? Math.max(1, pr - 0.25) : quick > sampled * 0.95 && pr < cap ? Math.min(cap, pr + 0.25) : pr;
  slow = quick = sampled = 0; since = now; if (next !== pr) { pr = next; renderer.setPixelRatio(pr); resize(); }
}
// Dev 7 frame budget: 30 fps while the view is idle, 60 fps for a moment after an action, 30 in Battery saver.
// Frames in between are skipped before any update or draw, so the GPU does no work for them.
let lastDraw = 0;
function loop(now) {
  raf = 0; if (!active || document.hidden || contextLost) return;
  const P = Perf(), cap = P ? P.targetFps() : 60;
  if (now - lastDraw < 1000 / cap - 2) { raf = requestAnimationFrame(loop); return; }
  lastDraw = now; drawn++;
  const raw = clock.getDelta(), dt = Math.min(0.05, raw); const t = clock.elapsedTime;
  active.update(dt, t); renderer.render(active.scene, active.camera);
  if (raw > 0 && raw < 1) adapt(Math.max(0, raw * 1000 - (1000 / cap - 1000 / 60)), now); // judge render time, not the frame cap
  frames++; if (now - lastStatsT > 1000) { fps = (frames * 1000) / (now - lastStatsT); frames = 0; lastStatsT = now; }
  raf = requestAnimationFrame(loop);
}
function start() { if (!raf && active && !document.hidden) { starts++; clock.start(); since = 0; slow = quick = sampled = 0; raf = requestAnimationFrame(loop); } }
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
function template(spId) {
  if (templates.has(spId)) return templates.get(spId);
  const p = (async () => {
    const url = heroUrl(spId);
    if (url) {
      try { const g = await new GLTFLoader().loadAsync(url); const root = g.scene.getObjectByName('amina'); if (root) { root.userData = Object.assign({ id: spId, hover: C.isHover(D.SPECIES[spId].art) }, root.userData); return { root, clips: g.animations, refs: 0, source: 'glb' }; } }
      catch (e) { /* fall back to the procedural build below */ }
    }
    const m = isVox(spId) ? C.buildVoxel(D.SPECIES[spId]) : C.buildAmina(D.SPECIES[spId]); return { root: m.root, clips: m.clips, refs: 0, source: isVox(spId) ? 'voxel' : 'procedural' };
  })();
  templates.set(spId, p); trimTemplates(); return p;
}
// Keep at most 14 species in memory; free the least recently requested ones that nothing is using.
function trimTemplates() {
  if (templates.size <= 14) return;
  for (const [id, p] of templates) { if (templates.size <= 14) break; p.then((t) => { if (t.refs <= 0 && templates.get(id) === p) { templates.delete(id); disposeTree(t.root); } }); }
}
function disposeTree(root) { root.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } }); }

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
    this.root = t.root.clone(true); this.mats = [];
    this.root.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); this.mats.push(o.material); o.frustumCulled = true; } });
    this.group = new THREE.Group(); this.group.add(this.root);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: tex('shadow'), transparent: true, depthWrite: false }));
    quad.rotation.x = -Math.PI / 2; quad.position.y = 0.01; this.group.add(quad); this.shadow = quad;
    const art = D.SPECIES[spId].art;
    if (art.glow) { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('glow'), color: art.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 })); g.scale.set(1.5, 1.5, 1); g.position.y = 0.55; this.group.add(g); this.glow = g; }
    this.mixer = new THREE.AnimationMixer(this.root); this.actions = {};
    t.clips.forEach((c) => { this.actions[c.name] = this.mixer.clipAction(c); });
    this.mixer.addEventListener('finished', (e) => { const cb = this._done; if (cb && e.action === this._oneShot) { this._done = null; cb(); } });
    this.idle(); this.flashT = 0;
  }
  idle() {
    const a = this.actions.idle; if (!a) return; a.reset(); a.setLoop(THREE.LoopRepeat); a.enabled = true; a.setEffectiveWeight(1); a.timeScale = calm() ? 0 : 1; a.play(); this.current = a;
  }
  // play('attack'|'hit'|'victory'|'defeat'|'move'); returns a Promise resolved at the end of the clip
  play(name, o) {
    o = o || {}; const a = this.actions[name]; if (!a) return Promise.resolve();
    const prev = this.current; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.timeScale = 1;
    if (o.loop) { a.setLoop(THREE.LoopRepeat); a.clampWhenFinished = false; } else { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    if (prev && prev !== a) a.crossFadeFrom(prev, 0.12, false); a.play(); this.current = a;
    if (o.loop) return Promise.resolve();
    this._oneShot = a;
    return new Promise((res) => { this._done = () => { if (name !== 'defeat' && !o.hold) { const idle = this.actions.idle; idle.reset(); idle.play(); idle.crossFadeFrom(a, 0.18, false); this.current = idle; } res(); }; });
  }
  flash(color) { this.flashT = 0.22; this.flashCol = new THREE.Color(color || '#ffffff'); }
  update(dt) {
    this.mixer.update(dt);
    if (this.flashT > 0) { this.flashT -= dt; const k = Math.max(0, this.flashT / 0.22); this.mats.forEach((m) => { if (!m.userData.e0) m.userData.e0 = [m.emissive.clone(), m.emissiveIntensity]; m.emissive.copy(m.userData.e0[0]).lerp(this.flashCol, k); m.emissiveIntensity = m.userData.e0[1] + k * 1.2; }); if (this.flashT <= 0) this.mats.forEach((m) => { if (m.userData.e0) { m.emissive.copy(m.userData.e0[0]); m.emissiveIntensity = m.userData.e0[1]; } }); }
    if (this.glow) this.glow.material.opacity = 0.45 + Math.sin(performance.now() / 600) * 0.1;
    const rig = this.root.getObjectByName('rig'); if (rig) this.shadow.scale.setScalar(Math.max(0.5, 1 - rig.position.y * 0.8));
  }
  dispose() { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root); this.mats.forEach((m) => m.dispose()); this.shadow.geometry.dispose(); this.shadow.material.dispose(); if (this.glow) this.glow.material.dispose(); this.t.refs--; this.group.removeFromParent(); }
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

/* ------------------------------------------------------------------ battle stage */
// createBattle(container, { dungeon, player: spId, enemy: spId, boss }) -> controller used by ui2.js
export async function createBattle(container, o) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 2, 0.1, 60);
  const arena = buildArena(scene, o.dungeon || 'reliquary'); const lights = C.studioLights(scene, arena.def.mood);
  const bursts = new Bursts(scene);
  // both creatures turn three quarters towards the camera and partly towards each other, so faces stay readable
  const P = { pos: new THREE.Vector3(-1.45, 0, 0.9), yaw: 1.2 }, E = { pos: new THREE.Vector3(1.35, 0, -0.95), yaw: -0.85 };
  const slots = { p: null, e: null };
  const place = (who, act, scale) => { const s = who === 'p' ? P : E; act.group.position.copy(s.pos); act.group.rotation.y = s.yaw; act.group.scale.setScalar(scale); scene.add(act.group); };
  const [pa, ea] = await Promise.all([actor(o.player), actor(o.enemy)]);
  // bosses stand larger; o.scale (from the battle spec) sets how much, capped so faces stay in frame
  const eScale = o.scale ? Math.min(2.1, 1.3 * Math.max(1, o.scale)) : o.boss ? 1.65 : 1.3;
  slots.p = pa; slots.e = ea; place('p', pa, 1.25); place('e', ea, eScale);
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
  let shake = 0, telegraph = false, t0 = 0;
  const camBase = new THREE.Vector3(-0.35, 1.7, 5.0), look = new THREE.Vector3(0.05, 0.62, -0.15);
  const view = {
    scene, camera,
    update(dt, t) {
      t0 = t; slots.p.update(dt); slots.e.update(dt); arena.update(t); bursts.update(dt);
      ring.material.opacity = telegraph ? 0.45 + Math.sin(t * 8) * 0.3 : Math.max(0, ring.material.opacity - dt * 2);
      if (bossRune) bossRune.rotation.z += dt * 0.25;
      if (prism && !calm()) { prism.material.color.setHSL((t * 0.12) % 1, 0.85, 0.62); prismUp.material.color.setHSL((t * 0.12 + 0.5) % 1, 0.85, 0.66); prism.rotation.z += dt * 0.4; prismUp.material.opacity = 0.24 + Math.sin(t * 2.2) * 0.1; }
      dome.material.opacity += ((barrier ? 0.28 : 0) - dome.material.opacity) * Math.min(1, dt * 6);
      camera.position.copy(camBase); if (shake > 0 && !calm()) { shake -= dt; camera.position.x += (Math.random() - 0.5) * shake * 0.25; camera.position.y += (Math.random() - 0.5) * shake * 0.2; }
      camera.lookAt(look);
    },
    onResize(w, h) { const narrow = w / h < 1.6; camBase.set(-0.35, narrow ? 1.9 : 1.7, narrow ? 6.2 : 5.0); },
    detach() { stop(); },
  };
  attach(view, container);
  const head = (who) => { const a = slots[who]; const p = a.group.position.clone(); p.y += 0.75 * a.group.scale.y; return p; };
  const toScreen = (v) => { const p = v.clone().project(camera), r = renderer.domElement.getBoundingClientRect(); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height }; };
  const elCol = (el) => (D.ELEMENTS[el] && D.ELEMENTS[el].color) || '#ffffff';
  return {
    is3d: true,
    anchor: (who) => toScreen(head(who)),
    attack(who) { boost(); return slots[who].play('attack'); },
    // 'attack' lunges at the foe; anything else (guard, heal) is a short hop in place
    use(who, kind) { boost(); return slots[who].play(kind === 'attack' ? 'attack' : 'move'); },
    async hit(who, el, eff) { boost(); const a = slots[who]; a.flash(eff === 'super' ? '#ffffff' : elCol(el)); bursts.emit(head(who), elCol(el), eff === 'super' ? 22 : 12, eff === 'super' ? 2.2 : 1.4, 0.6); shake = eff === 'super' ? 0.35 : 0.18; return a.play('hit'); },
    heal(who) { bursts.emit(head(who), '#8cffa0', 10, 1, 0.8); },
    guard(who) { bursts.emit(head(who), '#9ad4ff', 8, 0.8, 0.5); },
    status(who, color) { bursts.emit(head(who), color, 6, 0.7, 0.6); },
    faint(who) { boost(); return slots[who].play('defeat'); },
    victory(who) { boost(2500); return slots[who].play('victory', { loop: true }); },
    async swap(who, spId) { boost(); const old = slots[who]; const n = await actor(spId); place(who, n, who === 'e' ? 1.3 : 1.25); slots[who] = n; old.dispose(); n.play('move'); bursts.emit(head(who), '#ffffff', 10, 1.2, 0.5); },
    setTelegraph(on) { telegraph = !!on; },
    setBarrier(on) { barrier = !!on; },
    setElement(el) { bursts.emit(head('e'), elCol(el), 14, 1.4, 0.7); },
    dispose() {
      if (active === view) { active = null; stop(); } if (renderer && renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      slots.p.dispose(); slots.e.dispose(); bursts.dispose(); arena.dispose(); scene.remove(lights); ring.geometry.dispose(); ring.material.dispose();
      if (bossRune) { bossRune.geometry.dispose(); bossRune.material.dispose(); }
      if (prism) { [prism, prismUp].forEach((m) => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }); }
      scene.remove(dome); dome.geometry.dispose(); dome.material.dispose();
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
  let yaw = -0.45, vel = 0, drag = null;
  const view = {
    scene, camera,
    update(dt) { if (!drag) { yaw += vel * dt; vel *= Math.pow(0.04, dt); if (Math.abs(vel) < 0.02 && !calm()) yaw += dt * 0.15; } act.group.rotation.y = yaw; act.update(dt);
      camera.position.set(0, 0.98, 2.8); camera.lookAt(0, 0.52, 0); },
    detach() { stop(); },
  };
  attach(view, container);
  const el = renderer.domElement;
  const down = (e) => { boost(3000); drag = { x: e.clientX, y0: yaw, t: performance.now(), moved: false }; el.setPointerCapture && el.setPointerCapture(e.pointerId); };
  const move = (e) => { if (!drag) return; boost(); const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; const ny = drag.y0 + dx * 0.012; vel = (ny - yaw) / Math.max(0.016, (performance.now() - drag.t) / 1000); drag.t = performance.now(); yaw = ny; };
  const up = () => { if (drag && !drag.moved) act.play('victory'); drag = null; vel = Math.max(-6, Math.min(6, vel)); };
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  if (o.intro) act.play(o.intro);
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

/* ------------------------------------------------------------------ diagnostics */
export function stats() {
  const i = renderer ? renderer.info : null;
  return { c3dFps: +fps.toFixed(1), drawn, starts, loopRunning: !!raf, targetFps: Perf() ? Perf().targetFps() : 60, pixelRatio: pr, drawCalls: i ? i.render.calls : 0, triangles: i ? i.render.triangles : 0, geometries: i ? i.memory.geometries : 0, textures: i ? i.memory.textures : 0, templates: templates.size, live: !!active };
}
export const VERSION = C.VERSION;
