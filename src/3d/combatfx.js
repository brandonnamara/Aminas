/* Aminas — Phase 7 combat effects (ES module, used by runtime.js).
   Everything here is built from small cubes, so attacks look like the rest of the voxel world:
   - Fx: one pooled InstancedMesh of cubes (one draw call for every projectile, trail, shard and spark in a battle)
     plus a few pooled additive glow sprites for flashes. When nothing is happening the effects do no work; during an
     action the only allocations are a few small vectors for new cubes.
   - projectile(): an element's signature shot travelling from attacker to target (fire = ember ball with a trail,
     water = arcing droplets, light = a straight beam, earth = a heavy rock, wind = a corkscrew, …).
   - impact(): shards in the element's colours, a glow flash, and for super-effective or heavy blows a shockwave.
   - FocusMarks: the arena half of the turn system: a voxel ring under the active Amina (cyan for yours, rose for the
     foe) and crystal corner brackets around whoever is being targeted. They fade and move smoothly.
   Budgets: at most 240 cubes alive; Reduce motion keeps a quarter, Battery saver half. */
import { THREE } from './creature3d.js';

// palettes: [core, mid, deep] per element, and how each element travels
export const ELFX = {
  fire:      { c: ['#fff1a0', '#ffa83a', '#ff5a2a', '#c8301c'], path: 'low', speed: 1, trail: 'ember', size: 1.15 },
  water:     { c: ['#effcff', '#8fdcff', '#3a9ae8', '#1f6ab0'], path: 'high', speed: 0.95, trail: 'drip', size: 1 },
  nature:    { c: ['#e8ffb0', '#8ade4a', '#4fae3a', '#2f7a2a'], path: 'curve', speed: 0.95, trail: 'leaf', size: 0.95 },
  light:     { c: ['#ffffff', '#fff6c8', '#ffe27a', '#ffc94a'], path: 'beam', speed: 1.6, trail: 'beam', size: 0.85 },
  dark:      { c: ['#e2d6ff', '#a58aff', '#6a4ad0', '#2a1a4a'], path: 'wobble', speed: 0.8, trail: 'void', size: 1.15 },
  earth:     { c: ['#f2d6a8', '#c4965a', '#8a6236', '#5a3e22'], path: 'lob', speed: 0.85, trail: 'dust', size: 1.35 },
  wind:      { c: ['#f2fffb', '#b8f4e8', '#7fe0cf', '#3fae9c'], path: 'spiral', speed: 1.2, trail: 'swirl', size: 0.85 },
  resonance: { c: ['#ffd2f0', '#c8b4ff', '#9fe8ff', '#fff0a8'], path: 'curve', speed: 1, trail: 'prism', size: 1, prism: true },
  metal:     { c: ['#ffffff', '#dfe8f6', '#a8bcd8', '#6a80a0'], path: 'beam', speed: 1.4, trail: 'shard', size: 0.9 },
};
const fxOf = (el) => ELFX[el] || ELFX.light;

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace; return glowTex;
}

export class Fx {
  constructor(scene, o) {
    o = o || {}; this.scene = scene; this.calm = o.calm || (() => false); this.saver = o.saver || (() => false);
    this.max = 240; this.geo = new THREE.BoxGeometry(1, 1, 1);
    this.mat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, this.max); this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.name = 'fx:cubes';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.setColorAt(0, new THREE.Color('#ffffff'));
    scene.add(this.mesh);
    this.p = []; this.shots = []; this.glows = []; this.gpool = []; this.rings = []; this.time = 0; this.frozen = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(); this._c = new THREE.Color();
    // shockwave: a flat ring of cubes (one InstancedMesh shared by every wave; at most two at a time)
    this.waveN = 28; this.wave = new THREE.InstancedMesh(this.geo, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, opacity: 1, depthWrite: false }), this.waveN * 2);
    this.wave.count = 0; this.wave.frustumCulled = false; this.wave.name = 'fx:wave'; scene.add(this.wave);
  }
  scale() { return this.calm() ? 0.25 : this.saver() ? 0.5 : 1; }
  // one cube: { pos, vel, life, size, color, grav, drag, spin, shrink }
  spawn(pos, vel, o) {
    if (this.p.length >= this.max) return null;
    const q = { pos: pos.clone(), vel: vel.clone(), life: o.life || 0.6, max: o.life || 0.6, size: o.size || 0.06, col: new THREE.Color(o.color || '#ffffff'), grav: o.grav == null ? 2.2 : o.grav, drag: o.drag || 0, rot: new THREE.Vector3(Math.random() * 3, Math.random() * 3, 0), spin: o.spin == null ? 6 : o.spin };
    this.p.push(q); return q;
  }
  burst(at, colors, n, o) {
    o = o || {}; n = Math.max(1, Math.round(n * this.scale()));
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, up = o.up == null ? 0.8 : o.up, sp = (o.speed || 1.6) * (0.5 + Math.random() * 0.7);
      const v = new THREE.Vector3(Math.cos(a) * sp, (Math.random() * 0.8 + up * 0.6) * sp, Math.sin(a) * sp * 0.7);
      this.spawn(at, v, { color: colors[i % colors.length], life: (o.life || 0.55) * (0.7 + Math.random() * 0.5), size: (o.size || 0.07) * (0.6 + Math.random() * 0.8), grav: o.grav, drag: o.drag }); }
  }
  glow(at, color, size, life) {
    if (this.calm() && size > 1) size *= 0.6;
    const s = this.gpool.pop() || new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    s.material.color.set(color); s.material.opacity = 1; s.position.copy(at); s.scale.setScalar(size * 0.4); s.userData = { life: life || 0.35, max: life || 0.35, size };
    s.name = 'fx:glow'; this.scene.add(s); this.glows.push(s); return s;
  }
  shockwave(at, color, radius) {
    if (this.rings.length >= 2) this.rings.shift();
    this.rings.push({ at: at.clone().setY(0.06), col: new THREE.Color(color), life: 0.5, max: 0.5, r: radius || 1.4 });
  }
  // the element's signature shot, from → to over `dur` seconds; resolves on arrival
  projectile(from, to, el, o) {
    o = o || {}; const F = fxOf(el), dur = (o.dur || 0.2) / F.speed, big = o.big ? 1.6 : 1;
    const shot = { from: from.clone(), to: to.clone(), el, F, t: 0, dur, big, emitT: 0, core: [], done: null, hue: Math.random() };
    const n = Math.max(3, Math.round((F.path === 'beam' ? 4 : 7) * big * (this.calm() ? 0.6 : 1)));
    for (let i = 0; i < n; i++) { const q = this.spawn(from, new THREE.Vector3(), { color: F.c[i % 3], life: dur + 0.3, size: (i === 0 ? 0.16 : 0.08 + Math.random() * 0.06) * F.size * big, grav: 0, spin: 5 }); if (q) { q.off = new THREE.Vector3((Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.18).multiplyScalar(i === 0 ? 0 : big); shot.core.push(q); } }
    this.shots.push(shot);
    return new Promise((res) => { shot.done = res; });
  }
  pathAt(s, k) {
    const F = s.F, a = s.from, b = s.to, p = new THREE.Vector3().lerpVectors(a, b, k), d = a.distanceTo(b);
    if (F.path === 'high') p.y += Math.sin(k * Math.PI) * d * 0.28;
    else if (F.path === 'lob') p.y += Math.sin(k * Math.PI) * d * 0.4;
    else if (F.path === 'low') p.y += Math.sin(k * Math.PI) * d * 0.08;
    else if (F.path === 'curve') { p.y += Math.sin(k * Math.PI) * d * 0.14; p.z += Math.sin(k * Math.PI) * 0.5; }
    else if (F.path === 'wobble') { p.y += Math.sin(k * Math.PI * 3) * 0.12; p.z += Math.cos(k * Math.PI * 3) * 0.12; }
    else if (F.path === 'spiral') { const r = 0.22 * Math.sin(k * Math.PI); p.y += Math.sin(k * Math.PI * 6) * r; p.z += Math.cos(k * Math.PI * 6) * r; }
    return p;
  }
  // a hit lands: shards, glow, and (for big moments) a shockwave
  impact(at, el, kind) {
    const F = fxOf(el), sup = kind === 'super', big = kind === 'big' || sup, k = big ? 1.5 : kind === 'weak' ? 0.55 : 1;
    const cols = F.prism ? ['#ff9ee0', '#b49bff', '#8ff0ff', '#fff0a8', '#ffffff'] : F.c;
    this.burst(at, cols, 16 * k, { speed: 1.9 * k, life: 0.55, size: 0.075 * F.size, up: el === 'earth' ? 0.4 : 0.9, grav: el === 'wind' || el === 'light' || el === 'resonance' ? 0.6 : 2.4 });
    this.glow(at, cols[1], 0.95 * k, 0.3);
    if (sup) this.glow(at, '#ffffff', 1.25, 0.18);
    if (big) this.shockwave(at, cols[1], sup ? 1.7 : 1.3);
  }
  // a slash arc at the target for creatures that strike in person
  slash(at, el, dir) {
    const F = fxOf(el), n = Math.round(9 * this.scale()) + 2;
    for (let i = 0; i < n; i++) { const a = -0.9 + (i / (n - 1)) * 1.8; const p = at.clone().add(new THREE.Vector3(Math.sin(a) * 0.35 * dir, Math.cos(a) * 0.35, 0.15));
      this.spawn(p, new THREE.Vector3(Math.sin(a) * 0.9 * dir, Math.cos(a) * 0.6, 0.3), { color: F.c[i % 3], life: 0.28, size: 0.07, grav: 0, spin: 2 }); }
  }
  // a rising column around a creature (heal, power-up, the gathering before an ultimate)
  column(at, colors, n, o) {
    o = o || {}; n = Math.max(2, Math.round(n * this.scale()));
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, r = (o.r || 0.55) * (0.8 + Math.random() * 0.4);
      const p = at.clone().add(new THREE.Vector3(Math.cos(a) * r, (o.y0 || 0.05) + Math.random() * 0.3, Math.sin(a) * r * 0.7));
      this.spawn(p, new THREE.Vector3(-Math.cos(a) * 0.15, (o.rise || 1.1) * (0.7 + Math.random() * 0.6), -Math.sin(a) * 0.1), { color: colors[i % colors.length], life: o.life || 0.8, size: o.size || 0.06, grav: -0.2, spin: 3 }); }
  }
  // super-effective: everything in the arena holds for a beat (skipped with Reduce motion)
  freeze(ms) { if (!this.calm()) this.frozen = Math.max(this.frozen, ms / 1000); }
  live() { return this.p.length + this.shots.length + this.glows.length + this.rings.length; }
  update(dt) {
    this.time += dt;
    // projectiles steer their cubes and leave a trail
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]; s.t += dt; const k = Math.min(1, s.t / s.dur), head = this.pathAt(s, k);
      s.core.forEach((q, j) => { const wob = s.F.path === 'spiral' || s.F.path === 'wobble' ? 0.08 : 0.03; q.pos.copy(head).add(q.off).addScaledVector(new THREE.Vector3(Math.sin(this.time * 20 + j), Math.cos(this.time * 17 + j), 0), wob); q.life = Math.max(q.life, 0.1); });
      s.emitT -= dt;
      if (s.emitT <= 0 && k < 1) { s.emitT = this.calm() ? 0.06 : 0.025; const F = s.F;
        const c = F.prism ? this._c.setHSL((s.hue + this.time * 1.5) % 1, 0.85, 0.72).getHexString() : null;
        const v = F.trail === 'ember' ? new THREE.Vector3(0, 0.6, 0) : F.trail === 'drip' ? new THREE.Vector3(0, -0.4, 0) : F.trail === 'dust' ? new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.2, 0) : new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0);
        this.spawn(head, v, { color: c ? '#' + c : F.c[1 + Math.floor(Math.random() * 2)], life: F.trail === 'beam' ? 0.22 : 0.32, size: (F.trail === 'beam' ? 0.07 : 0.05) * s.big, grav: F.trail === 'drip' ? 1.5 : 0, spin: 4 }); }
      if (k >= 1) { s.core.forEach((q) => { q.life = 0; }); this.shots.splice(i, 1); if (s.done) s.done(); }
    }
    const fdt = this.frozen > 0 ? 0 : dt; if (this.frozen > 0) this.frozen -= dt;
    const m = this._m, q = this._q, e = this._e, sc = this._s;
    let n = 0;
    for (let i = this.p.length - 1; i >= 0; i--) {
      const c = this.p[i]; c.life -= fdt; if (c.life <= 0) { this.p.splice(i, 1); continue; }
      if (fdt) { c.vel.y -= c.grav * fdt; if (c.drag) c.vel.multiplyScalar(1 - c.drag * fdt); c.pos.addScaledVector(c.vel, fdt); c.rot.x += c.spin * fdt; c.rot.y += c.spin * 0.7 * fdt; }
      if (c.pos.y < 0.03) { c.pos.y = 0.03; c.vel.y *= -0.3; c.vel.x *= 0.6; c.vel.z *= 0.6; }
      const life = c.life / c.max, s = c.size * Math.min(1, life * 2.2);
      m.compose(c.pos, q.setFromEuler(e.set(c.rot.x, c.rot.y, 0)), sc.setScalar(s)); this.mesh.setMatrixAt(n, m); this.mesh.setColorAt(n, c.col); n++;
    }
    this.mesh.count = n; if (n) { this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true; }
    for (let i = this.glows.length - 1; i >= 0; i--) { const s = this.glows[i], u = s.userData; u.life -= dt; if (u.life <= 0) { this.scene.remove(s); this.glows.splice(i, 1); if (this.gpool.length < 8) this.gpool.push(s); else s.material.dispose(); continue; }
      const k = u.life / u.max; s.material.opacity = k; s.scale.setScalar(u.size * (0.4 + (1 - k) * 0.8)); }
    let w = 0;
    for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; r.life -= dt; if (r.life <= 0) { this.rings.splice(i, 1); continue; } }
    this.rings.forEach((r) => { const k = 1 - r.life / r.max, rad = 0.3 + k * r.r, s = 0.09 * (1 - k * 0.6);
      for (let j = 0; j < this.waveN; j++) { const a = (j / this.waveN) * Math.PI * 2; sc.set(s * 1.4, s * 0.5, s); m.compose(new THREE.Vector3(r.at.x + Math.cos(a) * rad, r.at.y, r.at.z + Math.sin(a) * rad * 0.75), q.setFromEuler(e.set(0, -a, 0)), sc); this.wave.setMatrixAt(w, m); this.wave.setColorAt(w, r.col); w++; } });
    this.wave.count = w; this.wave.material.opacity = this.rings.length ? Math.max(0.2, this.rings[this.rings.length - 1].life / 0.5) : 0;
    if (w) { this.wave.instanceMatrix.needsUpdate = true; if (this.wave.instanceColor) this.wave.instanceColor.needsUpdate = true; }
  }
  dispose() {
    this.scene.remove(this.mesh); this.scene.remove(this.wave); this.geo.dispose(); this.mat.dispose(); this.wave.material.dispose(); this.mesh.dispose(); this.wave.dispose();
    this.glows.concat(this.gpool).forEach((s) => { this.scene.remove(s); s.material.dispose(); }); this.p = []; this.shots.forEach((s) => s.done && s.done()); this.shots = []; this.glows = []; this.gpool = [];
  }
}

/* ------------------------------------------------------------------ focus marks */
// ring: 20 small cubes in a circle under the active Amina, turning slowly. reticle: four crystal corner brackets on
// the ground around the targeted Amina, closing in when it is struck. Both fade between states.
export class FocusMarks {
  constructor(scene) {
    this.scene = scene; this.geo = new THREE.BoxGeometry(1, 1, 1); this.marks = {};
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._e = new THREE.Euler();
  }
  slot(who, at, size) {
    const mk = (n) => { const me = new THREE.InstancedMesh(this.geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), n); me.frustumCulled = false; me.renderOrder = 2; me.visible = false; me.name = 'fx:marks'; this.scene.add(me); return me; };
    this.marks[who] = { at: at.clone(), size, ring: mk(20), ret: mk(20), ringOp: 0, ringTo: 0, retOp: 0, retTo: 0, ringCol: new THREE.Color('#8ff0ff'), retCol: new THREE.Color('#ff7aa0'), pulse: 0, spin: Math.random() * 6 };
  }
  resize(who, size) { if (this.marks[who]) this.marks[who].size = size; }
  ring(who, color, strength) { const s = this.marks[who]; if (!s) return; if (color) s.ringCol.set(color); s.ringTo = strength; }
  reticle(who, strength, color) { const s = this.marks[who]; if (!s) return; if (color) s.retCol.set(color); s.retTo = strength; }
  strike(who) { const s = this.marks[who]; if (s) s.pulse = 1; }
  state() { const o = {}; Object.keys(this.marks).forEach((k) => { const s = this.marks[k]; o[k] = { ring: +s.ringTo.toFixed(2), reticle: +s.retTo.toFixed(2), ringColor: '#' + s.ringCol.getHexString() }; }); return o; }
  update(dt, t, still) {
    const m = this._m, q = this._q, v = this._v, sc = this._s, e = this._e;
    Object.keys(this.marks).forEach((k) => {
      const s = this.marks[k], f = Math.min(1, dt * 6);
      s.ringOp += (s.ringTo - s.ringOp) * f; s.retOp += (s.retTo - s.retOp) * f; s.pulse = Math.max(0, s.pulse - dt * 2.4);
      if (!still) s.spin += dt * 0.5;
      // ring
      const R = 0.62 * s.size, show = s.ringOp > 0.01; s.ring.visible = show;
      if (show) { for (let i = 0; i < 20; i++) { const a = s.spin + (i / 20) * Math.PI * 2, big = i % 5 === 0; v.set(s.at.x + Math.cos(a) * R, 0.035, s.at.z + Math.sin(a) * R * 0.78);
          sc.set(big ? 0.14 : 0.09, 0.04, big ? 0.14 : 0.09); m.compose(v, q.setFromEuler(e.set(0, -a, 0)), sc); s.ring.setMatrixAt(i, m); }
        s.ring.instanceMatrix.needsUpdate = true; s.ring.material.color.copy(s.ringCol); s.ring.material.opacity = s.ringOp * (0.75 + (still ? 0 : Math.sin(t * 2.4) * 0.15)); }
      // reticle: four L-brackets (3 cubes each) at the corners, pulled in by a strike
      const showR = s.retOp > 0.01; s.ret.visible = showR;
      if (showR) { const r = (0.78 - s.pulse * 0.22) * s.size + (still ? 0 : Math.sin(t * 3) * 0.02); let i = 0;
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dz]) => { const cx = s.at.x + dx * r, cz = s.at.z + dz * r * 0.8;
          [[0, 0], [-dx * 0.12, 0], [-dx * 0.24, 0], [0, -dz * 0.1], [0, -dz * 0.2]].forEach(([ox, oz]) => { v.set(cx + ox, 0.045, cz + oz); sc.set(0.13, 0.05, 0.11); m.compose(v, q.identity(), sc); s.ret.setMatrixAt(i++, m); }); });
        s.ret.instanceMatrix.needsUpdate = true; s.ret.material.color.copy(s.retCol); s.ret.material.opacity = Math.min(1, s.retOp + s.pulse * 0.5); }
    });
  }
  dispose() { Object.values(this.marks).forEach((s) => { [s.ring, s.ret].forEach((me) => { this.scene.remove(me); me.material.dispose(); me.dispose(); }); }); this.geo.dispose(); this.marks = {}; }
}
