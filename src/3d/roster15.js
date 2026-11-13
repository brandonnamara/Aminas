/* Aminas — Phase 15B: animation and combat presentation for the refined roster (developer switch A.Proto15 only).
   The refined models keep each line's Phase 8B clips (same names, durations, contact at 0.34 s / 0.40 s, every clip
   but defeat ending at rest). On top of them each body type gets its own movement, added as extra tracks for the
   parts those clips leave still (Umbrit's new wings, Emberix's new ears…) or, for a few idles, a richer version of
   the same track:
     bat      wings that breathe, stretch, flare on the attack, wrap on guard and droop in defeat; ear flicks
     fox      ears that prick forward, flatten when it strikes or is hit, and droop in defeat
     serpent  a travelling wave through neck, head and tail (follow-through) in the idle
     monkey   a head scratch with one hand in the idle (standing on three limbs for a moment)
     mech     a head that turns in precise held steps
     bird     quick wing ruffles in the idle and deeper beats in the attack
     heavy    a slow weight shift in the idle, a longer settle after hits
   Combat: every refined line's moves get an elemental charge-up at the release point before the existing release
   and a ground mark under the impact, in the line's own colours; hits on a refined creature throw off its own
   material. Timing, damage, costs and statuses are untouched; nothing extra plays with Reduce Motion. */
import { THREE, PROTO_HOOKS, CLIP_HOOKS } from './creature3d.js';
import { kit, STYLE } from './showcase.js';
import { PERSONA } from './roster.js';

const Z3 = [0, 0, 0], sin = Math.sin, TAU = Math.PI * 2, PI = Math.PI;
const PROTO_LINES = { lumifern: 1, igniflare: 1, atem: 1, meta: 1 };
export const BODY15 = { umbrit: 'bat', emberix: 'fox', aquaflora: 'serpent', kairyu: 'monkey', pyrokai: 'monkey', zeep: 'mech', pyrospark: 'bird', zephyr: 'bird',
  cannonis: 'heavy', acinus: 'heavy', gaiaroki: 'heavy', pyrocell: 'heavy', terraflora: 'heavy', sylvaneer: 'quad', voltar: 'jester', lumi: 'float' };
const bump = (t, a, b) => (t <= a || t >= b ? 0 : sin(PI * (t - a) / (b - a)) ** 2);
const F = (D, n, f) => Array.from({ length: n + 1 }, (_, i) => [D * i / n, f(D * i / n)]);

/* each spec: clip name -> (k, D) => tracks; `replace` lists clips whose same-named tracks the spec replaces */
const SPEC = {
  bat: { tracks: {
    idle: (k, D) => [k.pair('wingL', 'wingR', F(D, 36, (t) => [0.05 * sin(t / D * TAU * 2) - 0.45 * bump(t, D * 0.55, D * 0.8), 0.18 * bump(t, D * 0.55, D * 0.8), 0])),
      k.R('earL', [[0, Z3], [D * 0.3, Z3], [D * 0.32, [0.35, 0, 0]], [D * 0.36, Z3], [D, Z3]]), k.R('earR', [[0, Z3], [D * 0.7, Z3], [D * 0.72, [0.35, 0, 0]], [D * 0.76, Z3], [D, Z3]], true)],
    ready: (k, D) => [k.pair('wingL', 'wingR', [[0, Z3], [D * 0.35, [-0.45, 0.15, 0]], [D * 0.7, [-0.15, 0, 0]], [D, Z3]])],
    attack: (k, D) => [k.pair('wingL', 'wingR', [[0, Z3], [0.2, [-0.5, -0.35, 0]], [0.34, [0.25, 0.25, 0]], [0.55, [-0.1, 0, 0]], [0.75, Z3], [D, Z3]])],
    special: (k, D) => [k.pair('wingL', 'wingR', [[0, Z3], [0.28, [-0.85, 0.1, 0]], [0.4, [0.2, 0.3, 0]], [0.6, [-0.6, 0.1, 0]], [0.9, Z3], [D, Z3]])],
    hit: (k, D) => [k.pair('wingL', 'wingR', [[0, Z3], [0.08, [0.3, 0.35, 0]], [0.3, [0.1, 0.1, 0]], [D, Z3]])],
    hitBig: (k, D) => [k.pair('wingL', 'wingR', [[0, Z3], [0.1, [0.45, 0.45, 0]], [0.45, [0.15, 0.1, 0]], [D, Z3]])],
    heal: (k, D) => [k.pair('wingL', 'wingR', [[0, Z3], [D * 0.35, [0.1, 0.55, 0]], [D * 0.7, [0.1, 0.5, 0]], [D, Z3]])],
    guard: (k, D) => [k.pair('wingL', 'wingR', [[0, Z3], [D * 0.25, [0.15, 0.75, 0]], [D * 0.75, [0.15, 0.75, 0]], [D, Z3]])],
    victory: (k, D) => [k.pair('wingL', 'wingR', F(D, 32, (t) => [-0.7 * Math.abs(sin(t / D * TAU * 2)) * sin(t / D * PI), 0, 0]))],
    defeat: (k, D) => [k.pair('wingL', 'wingR', [[0, Z3], [0.3, [-0.3, 0, 0]], [D, [0.55, 0.25, 0]]])],
    move: (k, D) => [k.pair('wingL', 'wingR', F(D, 16, (t) => [-0.35 * Math.abs(sin(t / D * TAU)), 0, 0]))],
  } },
  fox: { tracks: {
    idle: (k, D) => [k.pair('earL', 'earR', [[0, Z3], [D * 0.4, Z3], [D * 0.43, [-0.25, 0, -0.15]], [D * 0.5, Z3], [D * 0.82, Z3], [D * 0.84, [0.3, 0, 0]], [D * 0.88, Z3], [D, Z3]])],
    ready: (k, D) => [k.pair('earL', 'earR', [[0, Z3], [D * 0.3, [0, 0, -0.25]], [D * 0.7, [0, 0, -0.2]], [D, Z3]])],
    attack: (k, D) => [k.pair('earL', 'earR', [[0, Z3], [0.2, [0.1, 0, 0.55]], [0.4, [0.1, 0, 0.6]], [0.7, Z3], [D, Z3]])],
    special: (k, D) => [k.pair('earL', 'earR', [[0, Z3], [0.3, [0, 0, -0.3]], [0.45, [0.1, 0, 0.5]], [0.85, Z3], [D, Z3]])],
    hit: (k, D) => [k.pair('earL', 'earR', [[0, Z3], [0.08, [0.2, 0, 0.7]], [0.35, [0.1, 0, 0.3]], [D, Z3]])],
    hitBig: (k, D) => [k.pair('earL', 'earR', [[0, Z3], [0.1, [0.25, 0, 0.8]], [0.5, [0.15, 0, 0.35]], [D, Z3]])],
    victory: (k, D) => [k.pair('earL', 'earR', F(D, 24, (t) => [0.2 * sin(t / D * TAU * 3) * sin(t / D * PI), 0, -0.2 * sin(t / D * PI)]))],
    defeat: (k, D) => [k.pair('earL', 'earR', [[0, Z3], [D, [0.5, 0, 0.6]]])],
  } },
  serpent: { replace: { idle: 1 }, tracks: {
    idle: (k, D) => [k.R('neck', F(D, 24, (t) => [0.04 * sin(t / D * TAU * 2), 0.16 * sin(t / D * TAU), 0.05 * sin(t / D * TAU * 2)])),
      k.R('head', F(D, 24, (t) => [0, -0.13 * sin(t / D * TAU - 0.9), 0.06 * sin(t / D * TAU * 2 - 0.9)])),
      k.R('tail', F(D, 24, (t) => [0, 0.32 * sin(t / D * TAU + 1.3), 0.06 * sin(t / D * TAU * 2 + 1.3)]))],
  } },
  monkey: { replace: { idle: 1 }, tracks: {
    idle: (k, D) => [k.R('armR', [[0, Z3], [D * 0.52, Z3], [D * 0.6, [0.35, 0, 1.7]], [D * 0.64, [0.35, 0, 1.85]], [D * 0.68, [0.35, 0, 1.7]], [D * 0.72, [0.35, 0, 1.85]], [D * 0.76, [0.35, 0, 1.7]], [D * 0.86, Z3], [D, Z3]], true)],
  } },
  mech: { replace: { idle: 1 }, tracks: {
    idle: (k, D) => [k.R('head', [[0, Z3], [D * 0.2, Z3], [D * 0.23, [0, 0.3, 0]], [D * 0.45, [0, 0.3, 0]], [D * 0.48, [0, 0.3, 0.12]], [D * 0.6, [0, 0.3, 0.12]], [D * 0.63, [0, -0.2, 0]], [D * 0.8, [0, -0.2, 0]], [D * 0.83, Z3], [D, Z3]])],
  } },
  bird: { tracks: {
    idle: (k, D) => [k.pair('wingL', 'wingR', F(D, 36, (t) => [-0.25 * bump(t, D * 0.3, D * 0.36) - 0.25 * bump(t, D * 0.38, D * 0.44), 0, 0]))],
  } },
  heavy: { tracks: {} },
  quad: { tracks: {} }, jester: { tracks: {} }, float: { tracks: {} },
};
const has = (clip, name) => clip.tracks.some((t) => t.name.split('.')[0] === name);
function overlay(root, line, clips) {
  const spec = SPEC[BODY15[line]]; if (!spec || !clips) return clips;
  const k = kit(root);
  return clips.map((c) => {
    const fn = spec.tracks[c.name]; if (!fn) return c;
    const add = [].concat(fn(k, c.duration)).flat().filter(Boolean); if (!add.length) return c;
    const repl = spec.replace && spec.replace[c.name], names = add.map((t) => t.name);
    const keep = c.tracks.filter((t) => !(repl && names.indexOf(t.name) >= 0));
    const extra = add.filter((t) => repl || !has(c, t.name.split('.')[0]));
    if (!extra.length) return c;
    return new THREE.AnimationClip(c.name, c.duration, keep.concat(extra));
  });
}
export const ROSTER15_IDS = [];
(function register() {
  const D = window.A && window.A.Data; if (!D) return;
  Object.values(D.SPECIES).forEach((sp) => {
    if (PROTO_LINES[sp.line] || PROTO_HOOKS[sp.id]) return;
    PROTO_HOOKS[sp.id] = (root, profile, base, m) => { const h = CLIP_HOOKS[sp.id], clips = h ? h(root, profile, base, m) : base; return root.userData.parts ? overlay(root, sp.line, clips) : clips; };
    ROSTER15_IDS.push(sp.id);
  });
})();

/* ================================================================= combat presentation */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), rnd = (q) => (Math.random() - 0.5) * q;
const lineOf = (sp) => (window.A.Data.SPECIES[sp] || {}).line;
const refined = (api, who) => { const sp = api.slot(who).spId, P = window.A.Proto15; return !!(P && P.active(sp)) && !PROTO_LINES[lineOf(sp)] && !!PERSONA[lineOf(sp)]; };
const N = (api, n) => Math.max(2, Math.round(n * api.fx.scale()));
const SRC = { cannonis: 'muzzle', kairyu: 'handR', pyrokai: 'handR', voltar: 'handR', terraflora: 'handR', gaiaroki: 'handR', pyrocell: 'handR' };
function accent(api, who) {
  if (api.calm && api.calm()) return;
  const line = lineOf(api.slot(who).spId), cols = PERSONA[line].fx, src = () => api.from(who, SRC[line] || 'mouth'), tgt = api.other(who), s = api.slot(tgt).group.scale.x;
  // charge-up: motes converge on the release point and flash just before the existing release (~0.3 s)
  const n = N(api, 9);
  for (let i = 0; i < n; i++) api.at(0.06 + 0.16 * (i / n), () => { const d = V3(rnd(2), rnd(2), rnd(2)).normalize().multiplyScalar(0.32), p = src().add(d);
    api.fx.spawn(p, d.clone().multiplyScalar(-1 / 0.12), { color: cols[i % cols.length], life: 0.12, size: 0.042, grav: 0, spin: 2 }); });
  api.at(0.26, () => api.fx.glow(src(), cols[2], 0.8, 0.16));
  // ground mark under the impact
  api.at(0.47, () => { const c = api.slot(tgt).group.position.clone(), m = N(api, 12);
    for (let i = 0; i < m; i++) { const a = (i / m) * TAU; api.fx.spawn(c.clone().add(V3(Math.cos(a) * 0.3 * s, 0.04, Math.sin(a) * 0.3 * s)), V3(Math.cos(a) * 1.1, 0.05, Math.sin(a) * 1.1), { color: cols[i % 3], life: 0.4, size: 0.05, grav: 0, spin: 1 }); } });
}
Object.keys(STYLE).forEach((key) => { const orig = STYLE[key]; STYLE[key] = (api, who, info) => { orig(api, who, info); try { if (refined(api, who)) accent(api, who); } catch (e) { /* decoration only */ } }; });
// a refined creature taking a hit throws off its own material (called from proto15's hitAccent)
export function hitMaterial15(api, who) {
  if (!refined(api, who)) return;
  const line = lineOf(api.slot(who).spId), cols = PERSONA[line].fx, body = BODY15[line];
  api.fx.burst(api.chest(who), cols, body === 'heavy' ? 10 : 7, { speed: body === 'heavy' ? 1.0 : 1.5, life: 0.38, size: body === 'heavy' ? 0.06 : 0.045, grav: body === 'bird' || body === 'bat' ? 0.4 : 2.2 });
}
