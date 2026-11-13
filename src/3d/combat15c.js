/* Aminas — Phase 15C: cinematic combat presentation (developer switch A.Proto15 only; off by default).
   Presentation only. The battle rules have already decided every outcome before anything here plays (ui2.js plays
   the rule engine's events in order), so nothing in this file can change damage, costs, cooldowns, statuses or turns.
   - Atem III's nine floating swords on Overclock (its existing special): preparation, summoning from fragments,
     an orbiting formation, targeting, a staggered launch with nine distinct impacts, and recovery. One shared voxel
     sword mesh drawn with instancing (two draw calls for all nine). The battle UI waits a little longer after this one
     move (hold), so the last blade lands with the rule engine's hit; nothing else in battle timing changes.
   - Signature special-move flourishes per line (bat, serpent, fox, phoenix, monkey, Meta's wires, Voltar's cards,
     Aimza's heads, Cannonis's recoil), layered on the existing sequences.
   - Camera: target framing on specials, controlled impact emphasis, smooth return. None with Reduce Motion.
   - Impact feedback: shields, healing, status application, super-effective sound, faint and victory.
   Battery Saver keeps every beat with fewer particles and no trails; Reduce Motion keeps the readable essentials. */
import { THREE, voxelGeometry } from './creature3d.js';
import { STYLE } from './showcase.js';
import './roster.js';    // the roster's move sequences exist before they are wrapped
import './proto15.js';   // and the Phase 15A/15B layers sit underneath this one

const A = () => window.A;
export const on = () => !!(A() && A().Proto15 && A().Proto15.enabled());
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), rnd = (q) => (Math.random() - 0.5) * q, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const lineOf = (sp) => ((A().Data.SPECIES[sp] || {}).line);
const audio = (name, o) => { try { const Au = A().Audio; if (Au && Au.seq15) Au.seq15(name, o); } catch (e) { /* optional */ } };
const N = (api, n) => Math.max(1, Math.round(n * api.fx.scale()));

/* ================================================================= the sword (one voxel model, shared) */
let SWORD = null;
function swordGeometry() {
  if (SWORD) return SWORD;
  const V = A().Voxel, m = new V.Model();
  const EDGE = '#eef3f8', INNER = '#b8c3d1', SEG = '#8794a6', GRIP = '#2b3240', CORE = '#7fd0ff', NODE = '#bfe9ff';
  for (let y = -5; y <= -1; y++) m.set(0, y, 0, GRIP);                       // grip
  m.set(0, -6, 0, CORE, 1);                                                   // glowing pommel cell
  for (let z = -4; z <= 4; z++) for (let x = -1; x <= 1; x++) for (let y = 0; y <= 1; y++) m.set(x, y, z, Math.abs(z) === 4 && y === 1 && x === 0 ? NODE : SEG, Math.abs(z) === 4 && y === 1 && x === 0 ? 1 : 0);
  for (let y = 2; y <= 21; y++) { const w = y < 16 ? 2 : Math.max(0, Math.round((21 - y) / 2.5));
    for (let z = -w; z <= w; z++) { const core = z === 0 && y >= 3 && y <= 16, seg = y % 4 === 0 && z !== 0; m.set(0, y, z, core ? CORE : seg ? SEG : Math.abs(z) === w && w > 0 ? EDGE : INNER, core ? 1 : 0); } }
  for (let y = 3; y <= 16; y++) { m.set(1, y, 0, CORE, 1); m.set(-1, y, 0, CORE, 1); }   // a raised glowing spine on both faces
  const s = 0.024, fix = (g) => { if (!g) return null; g.translate(-0.5, 0.5, -0.5); g.scale(s, s, s); return g; };   // grip at the origin, blade along +y
  SWORD = { metal: fix(voxelGeometry(m, false)), glow: fix(voxelGeometry(m, true)), len: 22 * s };
  return SWORD;
}

/* ================================================================= Atem III: nine swords on Overclock */
const NINE = 9, LEN = [1, 0.92, 1.06, 0.96, 1.1, 0.9, 1.02, 0.94, 1.08];
const T9 = { prep: 0, summon: 0.18, form: 0.46, aim: 0.64, launch: 0.8, hit0: 0.84, step: 0.025, back: 1.12, end: 1.52 };
export const SWORD_HOLD_MS = 560;   // the extra wait in the battle UI after this move only (its last blade lands with the hit)
function nineSwords(api, who) {
  const tgt = api.other(who), calm = api.calm(), saver = api.saver ? api.saver() : false, G = swordGeometry(), t0 = api.now();
  const metalMat = new THREE.MeshLambertMaterial({ vertexColors: true }), glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 1 });
  const metal = new THREE.InstancedMesh(G.metal, metalMat, NINE), glow = new THREE.InstancedMesh(G.glow, glowMat, NINE);
  metal.name = 'fx:swords'; glow.name = 'fx:swords-glow'; [metal, glow].forEach((x) => { x.frustumCulled = false; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); api.scene.add(x); });
  // each blade its own: a slightly different length, a different tint of steel and of its glowing core
  const c = new THREE.Color();
  for (let i = 0; i < NINE; i++) { c.setHSL(0.58 + (i - 4) * 0.012, 0.12, 0.92 + (i % 3) * 0.03); metal.setColorAt(i, c); c.setHSL(0.53 + (i - 4) * 0.018, 0.85, 0.72 + (i % 2) * 0.1); glow.setColorAt(i, c); }
  metal.instanceColor.needsUpdate = glow.instanceColor.needsUpdate = true;
  const sc = api.slot(who).group.scale.x, home = api.slot(who).group.position.clone(), chestA = api.chest(who), chestT = api.chest(tgt), toT = chestT.clone().sub(chestA).setY(0).normalize();
  const st = { born: [], hit: new Array(NINE).fill(false), hitAt: [], done: false, start: t0, visible: 0, maxVisible: 0 };
  const UP = V3(0, 1, 0), M = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), dir = V3(0, 0, 0), tmp = V3(0, 0, 0);
  // where each blade strikes: a 3×3 spread over the target's body, so the impacts read as nine separate hits
  const strike = (i) => chestT.clone().add(V3(((i % 3) - 1) * 0.16 * sc, (1 - Math.floor(i / 3)) * 0.15 * sc, rnd(0.08)));
  const orbit = (i, t) => { const w = calm ? 0 : 1.6, a = (i / NINE) * TAU + (t - T9.summon) * w, r = 0.78 * sc;
    return V3(home.x + cos(a) * r, chestA.y + 0.38 * sc + (calm ? 0 : 0.05 * sin(t * 5 + i * 1.7)), home.z + sin(a) * r * 0.75); };
  // 1. preparation: energy gathers around Atem (its stance is its own 'special9' clip)
  api.fx.glow(chestA, '#bfe9ff', 1.2, 0.5);
  if (!calm) for (let i = 0; i < N(api, 16); i++) api.at(i * 0.01, () => { const d = V3(rnd(2), rnd(1.2) + 0.3, rnd(2)).normalize().multiplyScalar(0.6 * sc); api.fx.spawn(chestA.clone().add(d), d.clone().multiplyScalar(-1 / 0.18), { color: i % 2 ? '#bfe9ff' : '#7fd0ff', life: 0.18, size: 0.03, grav: 0, spin: 3 }); });
  // 2. summoning: each blade assembles from fragments that converge on its place
  for (let i = 0; i < NINE; i++) { const tb = T9.summon + i * 0.03; st.born[i] = tb;
    if (!calm) api.at(tb - api.now() + t0, () => { const p = orbit(i, tb + 0.12); for (let k = 0; k < (saver ? 2 : 5); k++) { const d = V3(rnd(1), rnd(1), rnd(1)).normalize().multiplyScalar(0.28 * sc); api.fx.spawn(p.clone().add(d), d.clone().multiplyScalar(-1 / 0.12), { color: k % 2 ? '#c9d3df' : '#8794a6', life: 0.12, size: 0.028, grav: 0, spin: 8 }); } }); }
  if (api.cam && !calm) { api.cam.focus(chestA, 0.6); api.at(T9.aim, () => api.cam.focus(chestA.clone().lerp(chestT, 0.5), 0.8)); api.at(T9.hit0 + 0.05, () => api.cam.focus(chestT, 1)); api.at(T9.back + 0.1, () => api.cam.release()); }
  // 5. impacts: nine distinct ones (cut, pierce, cut… the last heavy). They are driven by the sequence's own time, and
  // the rule engine's hit (onHit) brings the rest forward if a slow frame rate has let the sequence fall behind, so the
  // last blade always lands with the hit
  const impact = (i) => { const p = strike(i), last = i === NINE - 1;
    st.hit[i] = true; st.hitAt[i] = +api.now().toFixed(3);
    if (last) { api.fx.glow(p, '#e8f6ff', 1.3, 0.22); api.fx.shockwave(api.slot(tgt).group.position, '#7fd0ff', 1.2 * sc); api.fx.burst(p, ['#ffffff', '#bfe9ff', '#7fd0ff'], 14, { speed: 2.2, life: 0.4, size: 0.04, grav: 1.2 }); if (api.shake) api.shake(0.22); }
    else if (i % 3 === 1) { api.fx.burst(p, ['#ffd27a', '#ffffff'], 6, { speed: 2.6, life: 0.22, size: 0.03, grav: 3 }); api.fx.glow(p, '#ffd27a', 0.7, 0.14); }
    else { api.fx.glow(p, '#bfe9ff', 0.8, 0.16); for (let k = 0; k < N(api, 5); k++) api.fx.spawn(p, V3((i % 2 ? 1 : -1) * (1.5 + rnd(1)), rnd(1.4), rnd(0.6)), { color: k % 2 ? '#ffffff' : '#7fd0ff', life: 0.18, size: 0.025, grav: 2, spin: 0 }); } };
  st.tgt = tgt; st.shift = 0;
  st.landNow = () => { const tl = T9.hit0 + (NINE - 1) * T9.step, tn = api.now() - t0 + st.shift; if (tn < tl) { st.shift += tl - tn; st.caught = +(tl - tn).toFixed(3); tick(); } };
  audio('atem9');
  // the per-frame motion of the nine blades
  const tick = () => {
    const t = api.now() - t0 + st.shift; let vis = 0;
    for (let i = 0; i < NINE; i++) if (!st.hit[i] && t >= T9.hit0 + i * T9.step) impact(i);
    for (let i = 0; i < NINE; i++) {
      let p, s = 0, look = null;
      const born = st.born[i], launch = T9.launch + i * 0.022, land = T9.hit0 + i * T9.step;
      if (t < born) s = 0;
      else if (t < launch) {   // 2–4: materialise, orbit, then turn to the target
        s = calm ? (t - born < 0.12 ? (t - born) / 0.12 : 1) : ease((t - born) / 0.12);
        p = orbit(i, t); if (t > T9.aim) look = chestT.clone().sub(p);
      } else if (t < land) { const k = ease((t - launch) / Math.max(0.01, land - launch)); p = orbit(i, launch).lerp(strike(i), k); s = 1; look = chestT.clone().sub(p);
        if (!calm && !saver && api.fx.p.length < api.fx.max - 40) api.fx.spawn(p, V3(0, 0, 0), { color: '#7fd0ff', life: 0.1, size: 0.02, grav: 0, spin: 0 });
      } else if (t < T9.back) { p = strike(i).add(tmp.copy(toT).multiplyScalar(-0.12 * sc)); s = 1; look = chestT.clone().sub(p); }   // embedded for a beat
      else if (t < T9.end) { const k = ease((t - T9.back) / (T9.end - T9.back)); p = strike(i).lerp(orbit(i, t), k); s = 1 - k; look = k > 0.5 ? UP.clone() : chestT.clone().sub(p); }   // 6. recovery: pull back and dissolve
      else s = 0;
      if (s <= 0.001) { M.makeScale(0, 0, 0); }
      else { if (look && look.lengthSq() > 1e-6) { dir.copy(look).normalize(); q.setFromUnitVectors(UP, dir); } else q.identity();
        if (!look && !calm) { q2.setFromAxisAngle(V3(0, 0, 1), 0.12 * sin(t * 4 + i)); q.multiply(q2); }
        M.compose(p, q, tmp.set(sc, sc * s * LEN[i], sc)); vis++; }
      metal.setMatrixAt(i, M); glow.setMatrixAt(i, M);
    }
    st.visible = vis; st.maxVisible = Math.max(st.maxVisible, vis);
    metal.instanceMatrix.needsUpdate = glow.instanceMatrix.needsUpdate = true;
    glowMat.opacity = t > T9.back ? Math.max(0, 1 - (t - T9.back) / (T9.end - T9.back)) : 1;
    if (t >= T9.end) { cleanup(); return false; }
    return true;
  };
  let gone = false;
  const cleanup = () => { if (gone) return; gone = true; st.done = true; [metal, glow].forEach((x) => { api.scene.remove(x); x.dispose(); }); metalMat.dispose(); glowMat.dispose(); };
  tick(); api.tick(tick); api.own(cleanup);
  last9 = st;
  return st;
}
export let last9 = null;   // diagnostics for tests

/* ================================================================= signatures: the moves with their own sequence */
/* Phase 15D: three more signature sequences. Each plays on its line's existing special clip; its impact is driven
   by the rule engine's hit (onHit), so it can never land early or late, and nothing lingers if the battle ends. */
let pending = null;   // { tgt, fn } — the impact of the signature sequence in flight
const onHitOnce = (api, tgt, fn) => { pending = { tgt, fn, done: false }; const p = pending; api.own(() => { p.done = true; if (pending === p) pending = null; }); };
function lumiferSolarFlare(api, who) {   // Lumifern III, Solar Flare: petals, soft light, a flowing ribbon, a bloom
  const tgt = api.other(who), calm = api.calm(), a = api.chest(who), sc = api.slot(who).group.scale.x, PET = ['#fff7c8', '#ffe28a', '#ffd86b', '#c8f59a', '#ffffff'];
  api.fx.glow(a, '#fff2b0', 1.0, 0.45);
  if (!calm) for (let i = 0; i < N(api, 18); i++) api.at(i * 0.016, () => { const ang = i * 0.75, r = (0.45 + (i % 3) * 0.08) * sc, p = a.clone().add(V3(cos(ang) * r, -0.25 + i * 0.02, sin(ang) * r));
    api.fx.spawn(p, V3(-sin(ang) * 0.9, 0.55, cos(ang) * 0.9), { color: PET[i % 5], life: 0.42, size: 0.035, grav: -0.2, drag: 0.6, spin: 5 }); });
  const n = N(api, 16);
  for (let i = 0; i <= n; i++) api.at(0.3 + (i / n) * 0.22, () => { const k = i / n, p = api.chest(who).lerp(api.chest(tgt), k); p.y += sin(k * Math.PI) * 0.4 + sin(k * TAU * 1.5) * 0.06; p.z += cos(k * TAU) * 0.08;
    api.fx.spawn(p, V3(0, 0.15, 0), { color: PET[i % 5], life: 0.3, size: 0.04, grav: -0.1, spin: 6 }); });
  onHitOnce(api, tgt, () => { const b = api.chest(tgt), g = api.slot(tgt).group.position;
    api.fx.glow(b, '#ffe9a0', 1.4, 0.35);
    for (let i = 0; i < N(api, 14); i++) { const ang = (i / 14) * TAU; api.fx.spawn(b, V3(cos(ang) * 1.3, sin(ang) * 0.9 + 0.3, sin(ang) * 0.5), { color: PET[i % 5], life: 0.5, size: 0.045, grav: 0.6, drag: 1.2, spin: 7 }); }
    if (!calm) for (let i = 0; i < N(api, 10); i++) api.at(0.1 + i * 0.04, () => api.fx.spawn(g.clone().add(V3(rnd(0.7), 1.0 + Math.random() * 0.4, rnd(0.5))), V3(rnd(0.3), -0.35, rnd(0.3)), { color: PET[i % 5], life: 1.0, size: 0.035, grav: 0.15, drag: 0.4, spin: 3 })); });
  if (api.cam && !calm) { api.at(0.28, () => api.cam.focus(api.chest(tgt), 0.6)); api.at(0.95, () => api.cam.release()); }
  audio('bloom');
}
function igniflareInferno(api, who) {   // Igniflare III, Inferno: wing gusts, a gathering fireball, a launch, a firestorm
  const tgt = api.other(who), calm = api.calm(), sc = api.slot(who).group.scale.x, F = ['#c41010', '#ff4500', '#ff8000', '#ffe600'];
  const mouth = () => api.from(who, 'mouth');
  [0.06, 0.2].forEach((t) => api.at(t, () => { const g = api.slot(who).group.position; for (let i = 0; i < N(api, 10); i++) { const ang = (i / 10) * TAU; api.fx.spawn(g.clone().setY(0.08), V3(cos(ang) * 1.5, 0.15, sin(ang) * 1.5), { color: i % 2 ? '#7a3a2a' : '#ff8000', life: 0.32, size: 0.045, grav: 0, drag: 1, spin: 2 }); } }));
  for (let i = 0; i < N(api, 20); i++) api.at(0.04 + i * 0.016, () => { const m0 = mouth(), d = V3(rnd(2), rnd(2), rnd(2)).normalize().multiplyScalar(0.45 * sc); api.fx.spawn(m0.clone().add(d), d.clone().multiplyScalar(-1 / 0.16), { color: F[i % 4], life: 0.16, size: 0.04, grav: 0, spin: 4 }); });
  api.at(0.3, () => api.fx.glow(mouth(), '#ffb040', 1.2, 0.18));
  api.at(0.36, () => api.fx.projectile(mouth(), api.chest(tgt), 'fire', { dur: 0.12, cols: F }));
  onHitOnce(api, tgt, () => { const g = api.slot(tgt).group.position, s2 = api.slot(tgt).group.scale.x;
    api.fx.column(g, F, 14, { r: 0.35 * s2, rise: 1.5, life: 0.55, size: 0.06 });
    for (let i = 0; i < N(api, 16); i++) { const ang = (i / 16) * TAU; api.fx.spawn(g.clone().add(V3(0, 0.06, 0)), V3(cos(ang) * 1.8, 0.25, sin(ang) * 1.8), { color: F[i % 4], life: 0.45, size: 0.05, grav: 0, drag: 1.4, spin: 3 }); }
    if (!calm) { if (api.shake) api.shake(0.16); for (let i = 0; i < N(api, 8); i++) api.at(0.25 + i * 0.05, () => api.fx.spawn(g.clone().add(V3(rnd(0.6), 0.4 + Math.random() * 0.8, rnd(0.5))), V3(0, 0.6, 0), { color: i % 2 ? '#5a4a4a' : '#7a6a6a', life: 0.7, size: 0.06, grav: -0.4, drag: 0.8, spin: 1 })); } });
  if (api.cam && !calm) { api.at(0.32, () => api.cam.focus(api.chest(tgt), 0.75)); api.at(0.9, () => api.cam.release()); }
  audio('inferno');
}
function zeepOverclock(api, who) {   // Zeep III, Overclock: a charging ring that spins up, a locked-on beam, a hex burst
  const tgt = api.other(who), calm = api.calm(), sc = api.slot(who).group.scale.x, c0 = api.chest(who), t0 = api.now(), CY = ['#22d8ff', '#9ff0ff', '#ffffff'];
  const n = N(api, 12), tick = () => { const t = api.now() - t0; if (t > 0.5) return false; const spin = 4 + t * 26;
    if (Math.floor(t * 60) % 2 === 0) for (let i = 0; i < n; i += 3) { const ang = (i / n) * TAU + t * spin, r = (0.62 - t * 0.5) * sc; api.fx.spawn(c0.clone().add(V3(cos(ang) * r, 0.05 + t * 0.2, sin(ang) * r)), V3(0, 0, 0), { color: CY[i % 3], life: 0.06, size: 0.035, grav: 0, spin: 0 }); }
    return true; };
  if (!calm) api.tick(tick);
  api.at(0.34, () => api.fx.glow(api.head(who), '#9ff0ff', 1.0, 0.2));
  api.at(0.4, () => { const a = api.from(who, 'mouth'), b = api.chest(tgt), m = N(api, 14); for (let i = 0; i <= m; i++) { const k = i / m; api.fx.spawn(a.clone().lerp(b, k), V3(0, 0, 0), { color: i % 2 ? '#22d8ff' : '#ffffff', life: 0.14 + k * 0.08, size: 0.03, grav: 0, spin: 0 }); } });
  onHitOnce(api, tgt, () => { const b = api.chest(tgt), g = api.slot(tgt).group.position;
    api.fx.glow(b, '#9ff0ff', 1.3, 0.25);
    for (let i = 0; i < 6; i++) { const ang = (i / 6) * TAU; for (let j = 1; j <= 3; j++) api.fx.spawn(b, V3(cos(ang) * j * 0.6, sin(ang) * j * 0.6, 0.2), { color: j === 3 ? '#ffffff' : '#22d8ff', life: 0.3, size: 0.035, grav: 0, drag: 2, spin: 0 }); }
    api.fx.shockwave(g, '#22d8ff', 0.9); if (!calm && api.shake) api.shake(0.1); });
  if (api.cam && !calm) { api.at(0.3, () => api.cam.focus(api.chest(tgt), 0.6)); api.at(0.8, () => api.cam.release()); }
  audio('overclockZ');
}
const SIG = {
  // Atem III only (Atem-01 and Atem-02 keep their own presentations)
  overclock: [{ match: (sp) => sp === 'atem' && A().Proto15.active(sp), clip: 'special9', hold: (o) => (o.calm ? 360 : SWORD_HOLD_MS), run: nineSwords },
    { match: (sp) => sp === 'zeep3', clip: 'special', hold: () => 160, run: zeepOverclock }],
  solarflare: [{ match: (sp) => sp === 'aurelith', clip: 'special', hold: () => 180, run: lumiferSolarFlare }],
  inferno: [{ match: (sp) => sp === 'ignivor', clip: 'special', hold: () => 140, run: igniflareInferno }],
};
export function sig(spId, abil) { if (!on()) return null; const l = SIG[abil]; return (l && l.find((s) => s.match(spId))) || null; }
export function hold(spId, abil, o) { const s = sig(spId, abil); return s ? s.hold(o || {}) : 0; }

/* ================================================================= roster-wide special flourishes (specials only) */
const F = {
  umbrit(api, who, tgt) {   // bat: a wing gust, a swift shadow crescent across the target, a few bats
    const a = api.chest(who), b = api.chest(tgt);
    api.at(0.16, () => { for (let i = 0; i < N(api, 10); i++) { const ang = (i / 10) * TAU; api.fx.spawn(a, V3(cos(ang) * 1.6, 0.3, sin(ang) * 1.2), { color: i % 2 ? '#2a1f55' : '#6a58b0', life: 0.25, size: 0.04, grav: 0, spin: 4 }); } });
    api.at(0.36, () => { for (let i = 0; i < N(api, 14); i++) { const k = i / 13, ang = -1.2 + k * 2.4, p = b.clone().add(V3(cos(ang) * 0.25, sin(ang) * 0.3, 0.05)); api.fx.spawn(p, V3(rnd(0.3), -0.4, 0), { color: k < 0.5 ? '#b9a2ff' : '#2a1f55', life: 0.22, size: 0.035, grav: 0, spin: 0 }); } });
    for (let i = 0; i < N(api, 4); i++) api.at(0.2 + i * 0.03, () => { const p = a.clone().add(V3(rnd(0.3), rnd(0.3), rnd(0.3))); const v = b.clone().sub(p).multiplyScalar(1 / 0.22).add(V3(0, 0.6, rnd(0.6))); api.fx.spawn(p, v, { color: '#1e1640', life: 0.22, size: 0.05, grav: 2.4, spin: 14 }); }); },
  aquaflora(api, who, tgt) {   // serpent: a flowing stream that winds to the target, a splash ring
    const a = api.from(who, 'mouth'), b = api.chest(tgt), n = N(api, 18);
    for (let i = 0; i <= n; i++) api.at(0.24 + (i / n) * 0.2, () => { const k = i / n, p = a.clone().lerp(b, k); p.y += sin(k * TAU) * 0.12; p.z += cos(k * TAU * 1.5) * 0.1; api.fx.spawn(p, V3(0, 0.2, 0), { color: i % 3 ? '#00b8a8' : '#7fffb8', life: 0.24, size: 0.045, grav: 0.4, spin: 2 }); });
    api.at(0.47, () => { const g = api.slot(tgt).group.position; for (let i = 0; i < N(api, 12); i++) { const ang = (i / 12) * TAU; api.fx.spawn(g.clone().add(V3(cos(ang) * 0.2, 0.05, sin(ang) * 0.2)), V3(cos(ang) * 0.8, 1.4, sin(ang) * 0.8), { color: i % 2 ? '#9ff0ff' : '#00b8a8', life: 0.45, size: 0.045, grav: 4, spin: 3 }); } }); },
  emberix(api, who, tgt) {   // fox: a tight spiral of blue flame that bursts on contact
    const a = api.from(who, 'mouth'), b = api.chest(tgt), n = N(api, 16);
    for (let i = 0; i < n; i++) api.at(0.22 + (i / n) * 0.18, () => { const k = i / n, ang = k * TAU * 3, p = a.clone().lerp(b, k).add(V3(0, cos(ang) * 0.08, sin(ang) * 0.08)); api.fx.spawn(p, V3(0, 0, 0), { color: i % 2 ? '#00d1ff' : '#ffffff', life: 0.16, size: 0.04, grav: 0, spin: 4 }); });
    api.at(0.44, () => api.fx.burst(b, ['#00d1ff', '#4a9bff', '#ffffff'], 12, { speed: 1.2, life: 0.3, size: 0.04, grav: 0 })); },
  pyrospark(api, who, tgt) {   // phoenix: two wingbeat gusts, a flame trail on an arc, a fiery impact column
    const a = api.chest(who), b = api.chest(tgt);
    [0.12, 0.26].forEach((t) => api.at(t, () => { for (let i = 0; i < N(api, 8); i++) { const ang = (i / 8) * TAU; api.fx.spawn(a.clone().setY(0.1), V3(cos(ang) * 1.4, 0.1, sin(ang) * 1.4), { color: i % 2 ? '#ff8000' : '#ffe600', life: 0.3, size: 0.04, grav: 0, spin: 2 }); } }));
    const n = N(api, 14); for (let i = 0; i <= n; i++) api.at(0.3 + (i / n) * 0.14, () => { const k = i / n, p = a.clone().lerp(b, k); p.y += sin(k * Math.PI) * 0.35; api.fx.spawn(p, V3(0, 0.5, 0), { color: ['#c41010', '#ff8000', '#ffe600'][i % 3], life: 0.3, size: 0.045, grav: -0.5, spin: 3 }); });
    api.at(0.46, () => api.fx.column(api.slot(tgt).group.position, ['#ff4500', '#ff8000', '#ffe600'], 10, { r: 0.3, rise: 1.2, life: 0.5, size: 0.05 })); },
  kairyu(api, who, tgt) {   // monkey: three quick fists of water, alternating hands
    ['handR', 'handL', 'handR'].forEach((h, i) => api.at(0.18 + i * 0.08, () => api.fx.projectile(api.from(who, h), api.chest(tgt).add(V3(0, (i - 1) * 0.08, 0)), 'water', { dur: 0.12, cols: ['#3ec8ff', '#e0f6ff', '#0a4bff'] })));
    api.at(0.46, () => api.fx.burst(api.chest(tgt), ['#3ec8ff', '#ffffff'], 10, { speed: 1.6, life: 0.35, size: 0.045, grav: 2 })); },
  meta(api, who, tgt) {   // Meta: its wired hair reaches out as lines of light to the target, then pulses
    const a = api.head(who), b = api.chest(tgt);
    for (let w = 0; w < 4; w++) api.at(0.2 + w * 0.03, () => { const n = N(api, 10), off = V3(rnd(0.4), 0.2 + rnd(0.3), rnd(0.4)); for (let i = 0; i <= n; i++) { const k = i / n, p = a.clone().add(off.clone().multiplyScalar(1 - k)).lerp(b, k); api.fx.spawn(p, V3(0, 0, 0), { color: i % 2 ? '#5fd0ff' : '#eef4ff', life: 0.18 + k * 0.08, size: 0.022, grav: 0, spin: 0 }); } });
    api.at(0.44, () => api.fx.glow(b, '#5fd0ff', 1.1, 0.2)); },
  voltar(api, who, tgt) {   // jester: a fan of flat cards thrown on a playful arc, with magenta sparks
    const a = api.from(who, 'handR'), b = api.chest(tgt);
    for (let i = 0; i < N(api, 5); i++) api.at(0.18 + i * 0.04, () => { const v = b.clone().sub(a).multiplyScalar(1 / 0.2).add(V3(0, 1.2 + i * 0.1, (i - 2) * 0.4)); api.fx.spawn(a, v, { color: i % 2 ? '#ffffff' : '#ffd700', life: 0.22, size: 0.06, grav: 6, spin: 16 }); });
    api.at(0.44, () => api.fx.burst(b, ['#d946ef', '#ffd700', '#ffffff'], 10, { speed: 1.8, life: 0.3, size: 0.035, grav: 1 })); },
  aimza(api, who, tgt, info) {   // Aimza: every head joins in, one beam each, converging (more heads on later forms)
    const st = (A().Data.SPECIES[api.slot(who).spId] || {}).stage || 1, b = api.chest(tgt), heads = ['mouth', 'mouth2', 'mouth3'].slice(0, st);
    heads.forEach((h, j) => api.at(0.24 + j * 0.04, () => { const a = api.from(who, h), n = N(api, 10); for (let i = 0; i <= n; i++) { const k = i / n; api.fx.spawn(a.clone().lerp(b, k), V3(0, 0, 0), { color: k > 0.7 ? '#ffffff' : '#1fe0ff', life: 0.14 + k * 0.08, size: 0.03 + st * 0.005, grav: 0, spin: 0 }); } }));
    api.at(0.46, () => { api.fx.glow(b, '#7ff0ff', 0.9 + st * 0.35, 0.22); if (st === 3) api.fx.shockwave(api.slot(tgt).group.position, '#1fe0ff', 1.1); }); },
  cannonis(api, who) {   // Cannonis: muzzle flash, smoke thrown backwards by the recoil, dust kicked up at its feet
    api.at(0.38, () => { const m = api.from(who, 'muzzle'), g = api.slot(who).group.position; api.fx.glow(m, '#effcff', 1.3, 0.12);
      for (let i = 0; i < N(api, 6); i++) api.fx.spawn(m, V3(-0.8 + rnd(0.4), 0.5 + rnd(0.3), rnd(0.4)), { color: i % 2 ? '#d4cdbd' : '#a8987a', life: 0.5, size: 0.07, grav: -0.3, drag: 1.5, spin: 1 });
      api.fx.burst(g.clone().setY(0.06), ['#c2b59b', '#a8987a'], 8, { speed: 0.9, up: 0.3, life: 0.45, size: 0.05, grav: 2 }); if (api.shake) api.shake(0.12); }); },
};
F.zephyr = F.pyrospark;
const MOVE_SKIP = { overclock: 1, solarflare: 1, inferno: 1 };   // with a signature of their own (other species with these moves keep their flourish)   // moves with a full signature sequence of their own
Object.keys(STYLE).forEach((key) => { const orig = STYLE[key]; STYLE[key] = (api, who, info) => { orig(api, who, info);
  try { if (!on() || !info || !info.special || (api.calm && api.calm())) return;   // (moves with a signature sequence never reach here) const ln = lineOf(api.slot(who).spId), f = F[ln]; if (f) f(api, who, api.other(who), info); } catch (e) { /* decoration only */ } }; });
export const FLOURISH_LINES = Object.keys(F);

/* ================================================================= camera on specials (any line) */
export function specialCamera(api, who, contact) {
  if (!on() || api.calm() || !api.cam) return;
  const tgt = api.other(who);
  api.at(Math.max(0.05, contact - 0.06), () => api.cam.focus(api.chest(tgt), 0.7));
  api.at(contact + 0.32, () => api.cam.release());
}

/* ================================================================= impact feedback */
export function guard(api, who) {
  if (!on()) return; audio('guard'); if (api.calm()) return;
  // a hexagonal lattice shield in front of the defender, facing its foe
  const c = api.chest(who), f = api.chest(api.other(who)).sub(c).setY(0).normalize(), side = V3(-f.z, 0, f.x), s = api.slot(who).group.scale.x, n = N(api, 19);
  for (let i = 0; i < n; i++) { const ring = i === 0 ? 0 : i < 7 ? 1 : 2, k = ring === 0 ? 0 : ring === 1 ? (i - 1) / 6 : (i - 7) / 12, ang = k * TAU + (ring === 2 ? 0.26 : 0), r = ring * 0.18 * s;
    const p = c.clone().addScaledVector(f, 0.32 * s - ring * 0.03).addScaledVector(side, cos(ang) * r).add(V3(0, sin(ang) * r, 0));
    api.fx.spawn(p, f.clone().multiplyScalar(0.05), { color: ring === 1 ? '#ffffff' : '#9ad4ff', life: 0.55, size: 0.045, grav: 0, spin: 0 }); }
  api.fx.glow(c.clone().addScaledVector(f, 0.3 * s), '#9ad4ff', 1.2, 0.35);
}
export function heal(api, who) {
  if (!on()) return; audio('heal'); if (api.calm()) return;
  const g = api.slot(who).group.position, s = api.slot(who).group.scale.x, n = N(api, 16);
  for (let i = 0; i < n; i++) api.at(i * 0.02, () => { const ang = i * 0.9, p = g.clone().add(V3(cos(ang) * 0.45 * s, 0.1 + i * 0.05, sin(ang) * 0.45 * s)); api.fx.spawn(p, V3(-sin(ang) * 0.4, 0.9, cos(ang) * 0.4), { color: i % 3 ? '#9dffb0' : '#ffffff', life: 0.55, size: 0.04, grav: -0.2, spin: 2 }); });
}
export function status(api, who, color) {
  if (!on()) return; audio('status'); if (api.calm()) return;
  const g = api.slot(who).group.position, s = api.slot(who).group.scale.x, n = N(api, 14);
  for (let i = 0; i < n; i++) { const ang = (i / n) * TAU; api.fx.spawn(g.clone().add(V3(cos(ang) * 0.5 * s, 0.06, sin(ang) * 0.5 * s)), V3(-cos(ang) * 0.25, 0.25, -sin(ang) * 0.25), { color: i % 2 ? color : '#ffffff', life: 0.5, size: 0.04, grav: 0, spin: 1 }); }
}
export function hit(api, who, el, eff) { if (!on()) return; if (last9 && !last9.done && last9.tgt === who && last9.landNow) last9.landNow();
  if (pending && !pending.done && pending.tgt === who) { const p = pending; p.done = true; pending = null; try { p.fn(); } catch (e) { /* decoration only */ } }
  if (eff === 'super') audio('super'); }
export function faint(api, who) {
  if (!on()) return; audio('faint', { delay: 0.1 }); if (api.calm()) return;
  const g = api.slot(who).group.position, n = N(api, 12);
  for (let i = 0; i < n; i++) api.at(0.3 + i * 0.03, () => api.fx.spawn(g.clone().add(V3(rnd(0.5), 0.3 + Math.random() * 0.6, rnd(0.4))), V3(0, 0.5, 0), { color: i % 2 ? '#cfc6ee' : '#8a84a8', life: 0.6, size: 0.035, grav: -0.3, spin: 1 }));
}
export function victory(api, who) {
  if (!on()) return; audio('victory', { delay: 0.15 }); if (api.calm()) return;
  const g = api.slot(who).group.position, n = N(api, 20), cols = ['#ffd978', '#ffffff', '#8ff0ff', '#ff9ad1'];
  for (let i = 0; i < n; i++) api.at(0.1 + (i % 5) * 0.05, () => { const ang = Math.random() * TAU; api.fx.spawn(g.clone().add(V3(0, 1.4, 0)), V3(cos(ang) * 1.1, 1.2 + Math.random(), sin(ang) * 0.8), { color: cols[i % 4], life: 1.0, size: 0.04, grav: 2.2, spin: 6 }); });
}
