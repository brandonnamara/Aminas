/* Aminas — Phase 8 showcase animation: bespoke clips, move choreography and living details for Umbrit, Cannonis
   and the three Aimza forms. Their models are built in parts (src/voxel-showcase.js), so these clips move ears, eyelids,
   jaws, heads, wings, tails and Cannonis's cannon, not just the whole body.
   Contracts kept from earlier phases:
   - the same clip names (idle, ready, attack, special, hit, hitBig, heal, guard, victory, defeat, move), plus 'blink',
     an overlay loop that only moves eyelids and plays alongside everything else;
   - attack and special reach the foe at 0.34 s and 0.40 s (the rig's forward peak), inside the battle's existing beat;
   - every clip but defeat ends exactly at rest; durations match the shared clips, so battles take no longer.
   Axes: rig rotations are in world space (x pitch: positive leans forward/down, y yaw); part rotations are in the
   model's own voxel space (z pitch: positive lifts the front, y yaw, x roll). Offsets are in voxel units; world
   offsets on the rig are converted with U. */
import { THREE, CLIP_HOOKS } from './creature3d.js';

const qE = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
function kit(root) {
  const n = {}; root.traverse((o) => { if (o.name && !n[o.name]) n[o.name] = o; });
  const U = 1 / root.scale.x;
  const times = (keys) => keys.map((k) => k[0]);
  // rotation offsets [x,y,z] from the rest pose; mirrored for right-hand parts when asked
  const R = (name, keys, mirror) => { const o = n[name]; if (!o) return null; const v = [];
    keys.forEach(([, e]) => { const q = o.quaternion.clone().multiply(mirror ? qE(-e[0], e[1] * -1, e[2]) : qE(e[0], e[1], e[2])); v.push(q.x, q.y, q.z, q.w); });
    return new THREE.QuaternionKeyframeTrack(name + '.quaternion', times(keys), v); };
  // position offsets (voxel units; world units on the rig/body when world is true)
  const P = (name, keys, world) => { const o = n[name]; if (!o) return null; const k = world ? U : 1, v = [];
    keys.forEach(([, d]) => v.push(o.position.x + d[0] * k, o.position.y + d[1] * k, o.position.z + d[2] * k)); return new THREE.VectorKeyframeTrack(name + '.position', times(keys), v); };
  // scale multipliers
  const S = (name, keys) => { const o = n[name]; if (!o) return null; const v = []; keys.forEach(([, s]) => v.push(o.scale.x * s[0], o.scale.y * s[1], o.scale.z * s[2])); return new THREE.VectorKeyframeTrack(name + '.scale', times(keys), v); };
  // eyelids: 0 open … 1 closed (absolute; their rest scale is closed-to-nothing)
  const L = (name, keys) => (n[name] ? new THREE.VectorKeyframeTrack(name + '.scale', times(keys), [].concat(...keys.map(([, c]) => [1, Math.max(0.001, c), 1]))) : null);
  const clip = (name, d, tracks) => new THREE.AnimationClip(name, d, tracks.flat().filter(Boolean));
  // a periodic curve sampled into keys (f(phase 0..1) must return to its start)
  const wave = (D, steps, f) => Array.from({ length: steps + 1 }, (_, i) => [D * i / steps, f(i / steps)]);
  const pair = (l, r, keys) => [R(l, keys), R(r, keys, true)];
  return { n, U, R, P, S, L, clip, wave, pair, has: (k) => !!n[k] };
}
const Z3 = [0, 0, 0], O3 = [1, 1, 1], sin = Math.sin, TAU = Math.PI * 2;
const blinks = (k, lids, D, at) => k.clip('blink', D, lids.map((l, i) => k.L(l, [[0, 0]].concat(...(at[i] || at[0]).map((t) => [[t - 0.04, 0], [t, 1], [t + 0.1, 1], [t + 0.16, 0]])).concat([[D, 0]]))));

/* ================================================================= UMBRIT: shy, watchful, loyal; quick and sly */
function umbritClips(root) {
  const k = kit(root), { R, P, S, L, clip, wave, pair } = k;
  const ears = (keys) => pair('earL', 'earR', keys);
  const lids = (keys) => [L('lidL', keys), L('lidR', keys)];
  const out = [];
  // idle: soft breathing, ears that twitch on their own, a swaying wisp tail and a shy little glance aside
  { const D = 3.6;
    out.push(clip('idle', D, [
      S('body', wave(D, 12, (p) => [1 + 0.03 * sin(p * TAU * 2), 1 - 0.025 * sin(p * TAU * 2), 1 + 0.03 * sin(p * TAU * 2)])),
      R('rig', [[0, Z3], [2.1, Z3], [2.35, [0, 0.28, 0]], [2.9, [0, 0.28, 0]], [3.2, Z3], [D, Z3]]),
      R('earL', [[0, Z3], [1.1, Z3], [1.16, [0.3, 0, -0.15]], [1.26, Z3], [1.32, [0.2, 0, -0.1]], [1.42, Z3], [D, Z3]]),
      R('earR', [[0, Z3], [2.55, Z3], [2.61, [0.3, 0, -0.15]], [2.71, Z3], [D, Z3]], true),
      R('tail', wave(D, 12, (p) => [0, 0.35 * sin(p * TAU * 2), 0.08 * sin(p * TAU)])) ])); }
  out.push(blinks(k, ['lidL', 'lidR'], 5.2, [[1.6, 4.4, 4.62]]));
  // ready: a crouch with the ears pressed back, then they perk up and it leans in
  out.push(clip('ready', 0.75, [
    S('body', [[0, O3], [0.22, [1.08, 0.88, 1.08]], [0.45, [0.97, 1.05, 0.97]], [0.75, O3]]),
    R('rig', [[0, Z3], [0.22, [0.08, 0, 0]], [0.5, [-0.04, 0, 0]], [0.75, Z3]]),
    ears([[0, Z3], [0.18, [0, 0, -0.55]], [0.42, [0.05, 0, 0.18]], [0.75, Z3]]) ]));
  // attack (Shade Nip): coils back, then a quick hop-bite that lands at 0.34 s
  out.push(clip('attack', 0.9, [
    P('rig', [[0, Z3], [0.16, [0, 0, -0.1]], [0.34, [0, 0.1, 0.42]], [0.5, [0, 0, 0.3]], [0.9, Z3]], true),
    R('rig', [[0, Z3], [0.16, [-0.14, 0, 0]], [0.34, [0.22, 0, 0]], [0.55, [0.06, 0, 0]], [0.9, Z3]]),
    S('body', [[0, O3], [0.16, [1.1, 0.86, 1.1]], [0.3, [0.92, 1.12, 0.92]], [0.38, [1.08, 0.9, 1.08]], [0.9, O3]]),
    ears([[0, Z3], [0.16, [0, 0, -0.6]], [0.5, [0, 0, -0.4]], [0.9, Z3]]),
    R('tail', [[0, Z3], [0.16, [0, 0, 0.5]], [0.34, [0, 0, -0.4]], [0.9, Z3]]),
    lids([[0, 0], [0.12, 0.45], [0.34, 0.45], [0.5, 0], [0.9, 0]]) ]));
  // special (Gloom Veil): rises and swells, ears up and out, crest flaring, then casts the veil forward at 0.40 s
  out.push(clip('special', 1.1, [
    P('rig', [[0, Z3], [0.28, [0, 0.16, -0.06]], [0.4, [0, 0.1, 0.16]], [0.7, [0, 0.04, 0.05]], [1.1, Z3]], true),
    R('rig', [[0, Z3], [0.28, [-0.2, 0, 0]], [0.4, [0.14, 0, 0]], [1.1, Z3]]),
    S('body', [[0, O3], [0.28, [1.12, 1.1, 1.12]], [0.4, [0.95, 1.04, 0.95]], [1.1, O3]]),
    ears([[0, Z3], [0.28, [0.35, 0, 0.25]], [0.45, [0.25, 0, 0.1]], [1.1, Z3]]),
    R('tail', [[0, Z3], [0.28, [0, 0.6, 0.4]], [0.5, [0, -0.4, 0]], [1.1, Z3]]) ]));
  // hit / hitBig: a flinch with squeezed eyes and flattened ears; the big one knocks it back and spins it a little
  out.push(clip('hit', 0.55, [
    P('rig', [[0, Z3], [0.08, [0, 0.02, -0.14]], [0.55, Z3]], true), R('rig', [[0, Z3], [0.08, [-0.22, 0, 0.08]], [0.55, Z3]]),
    S('body', [[0, O3], [0.08, [0.9, 1.08, 0.9]], [0.2, [1.06, 0.94, 1.06]], [0.55, O3]]),
    ears([[0, Z3], [0.08, [0, 0, -0.7]], [0.55, Z3]]), lids([[0, 0], [0.05, 1], [0.3, 1], [0.4, 0], [0.55, 0]]) ]));
  out.push(clip('hitBig', 0.8, [
    P('rig', [[0, Z3], [0.1, [0, 0.12, -0.3]], [0.3, [0, 0, -0.18]], [0.8, Z3]], true), R('rig', [[0, Z3], [0.1, [-0.4, 0.5, 0.18]], [0.35, [-0.1, 0.1, 0]], [0.8, Z3]]),
    S('body', [[0, O3], [0.1, [0.86, 1.12, 0.86]], [0.3, [1.1, 0.9, 1.1]], [0.8, O3]]),
    ears([[0, Z3], [0.1, [0.2, 0, -0.8]], [0.5, [0, 0, -0.3]], [0.8, Z3]]), lids([[0, 0], [0.06, 1], [0.5, 1], [0.6, 0], [0.8, 0]]) ]));
  // heal: a pleased wiggle, ears perked
  out.push(clip('heal', 0.9, [
    R('rig', wave(0.9, 6, (p) => [0, 0, 0.12 * sin(p * TAU * 2)])), P('rig', [[0, Z3], [0.3, [0, 0.08, 0]], [0.6, Z3], [0.9, Z3]], true),
    ears([[0, Z3], [0.2, [0.2, 0, 0.2]], [0.7, [0.2, 0, 0.2]], [0.9, Z3]]), lids([[0, 0], [0.2, 0.6], [0.7, 0.6], [0.9, 0]]) ]));
  // guard: shrinks into a ball, ears flat, eyes half closed
  out.push(clip('guard', 0.7, [
    S('body', [[0, O3], [0.2, [1.1, 0.82, 1.1]], [0.5, [1.1, 0.82, 1.1]], [0.7, O3]]), P('rig', [[0, Z3], [0.2, [0, -0.04, -0.05]], [0.5, [0, -0.04, -0.05]], [0.7, Z3]], true),
    ears([[0, Z3], [0.2, [0, 0, -0.8]], [0.5, [0, 0, -0.8]], [0.7, Z3]]), lids([[0, 0], [0.2, 0.55], [0.5, 0.55], [0.7, 0]]) ]));
  // victory: two happy hops with ear flaps and a tail swish, a little spin on the second
  out.push(clip('victory', 1.6, [
    P('rig', [[0, Z3], [0.2, [0, 0.22, 0]], [0.4, Z3], [0.6, [0, 0.3, 0]], [0.82, Z3], [1.6, Z3]], true),
    R('rig', [[0, Z3], [0.6, Z3], [0.82, [0, 1.3, 0]], [1.05, [0, 1.3, 0]], [1.35, Z3], [1.6, Z3]]),
    S('body', [[0, O3], [0.05, [1.12, 0.86, 1.12]], [0.2, [0.92, 1.1, 0.92]], [0.42, [1.1, 0.88, 1.1]], [0.6, [0.92, 1.1, 0.92]], [0.85, [1.08, 0.9, 1.08]], [1.1, O3], [1.6, O3]]),
    ears(wave(1.6, 8, (p) => [0.3 * sin(p * TAU * 4), 0, 0.1 * sin(p * TAU * 2)])),
    R('tail', wave(1.6, 8, (p) => [0, 0.6 * sin(p * TAU * 3), 0])), lids([[0, 0], [0.3, 0.7], [1.0, 0.7], [1.2, 0], [1.6, 0]]) ]));
  // defeat: deflates and sinks into its own shadow, ears drooping, eyes closed (holds the pose)
  out.push(clip('defeat', 1.2, [
    P('rig', [[0, Z3], [0.3, [0, 0.06, -0.04]], [1.2, [0, -0.08, 0]]], true), R('rig', [[0, Z3], [1.2, [0.32, 0.2, 0.1]]]),
    S('body', [[0, O3], [0.3, [0.95, 1.05, 0.95]], [1.2, [1.1, 0.72, 1.1]]]),
    ears([[0, Z3], [1.2, [0.9, 0, -0.5]]]), R('tail', [[0, Z3], [1.2, [0, 0.3, -0.5]]]), lids([[0, 0], [0.3, 0.5], [0.8, 1], [1.2, 1]]) ]));
  out.push(clip('move', 0.8, [P('rig', wave(0.8, 8, (p) => [0, 0.12 * Math.abs(sin(p * TAU)), 0]), true), S('body', wave(0.8, 8, (p) => [1 + 0.05 * sin(p * TAU * 2), 1 - 0.05 * sin(p * TAU * 2), 1 + 0.05 * sin(p * TAU * 2)])), ears(wave(0.8, 8, (p) => [0, 0, -0.2 * Math.abs(sin(p * TAU))]))]));
  return out;
}

/* ================================================================= CANNONIS: steady, protective, proud of its aim */
function cannonisClips(root) {
  const k = kit(root), { R, P, S, L, clip, wave } = k;
  const lids = (keys) => [L('lidL', keys), L('lidR', keys)];
  const legs = (fl, fr, bl, br) => [R('legFL', fl), R('legFR', fr || fl), R('legBL', bl || fl), R('legBR', br || bl || fl)];
  // the barrel kicks back along its own axis (it points forward and up)
  const recoil = (a) => [-0.86 * a, -0.5 * a, 0];
  const out = [];
  // idle: deep slow breaths, the head looking about, a faint hum through the cannon, a sniff
  { const D = 4.4;
    out.push(clip('idle', D, [
      S('body', wave(D, 12, (p) => [1 + 0.018 * sin(p * TAU * 2), 1 - 0.012 * sin(p * TAU * 2), 1 + 0.018 * sin(p * TAU * 2)])),
      R('head', wave(D, 12, (p) => [0, 0.16 * sin(p * TAU), 0.06 * sin(p * TAU * 2)])),
      R('cannon', wave(D, 12, (p) => [0, 0.03 * sin(p * TAU + 1), 0.035 * sin(p * TAU * 2 + 0.5)])),
      R('jaw', [[0, Z3], [2.9, Z3], [3.05, [0, 0, -0.18]], [3.2, Z3], [3.3, [0, 0, -0.1]], [3.42, Z3], [D, Z3]]),
      R('tail', wave(D, 8, (p) => [0, 0.2 * sin(p * TAU * 2), 0])) ])); }
  out.push(blinks(k, ['lidL', 'lidR'], 6, [[2.4, 5.1]]));
  // ready: plants its feet, lowers its head and swings the cannon down onto the target
  out.push(clip('ready', 0.75, [
    P('rig', [[0, Z3], [0.3, [0, -0.04, 0]], [0.75, Z3]], true),
    R('head', [[0, Z3], [0.3, [0, 0, -0.16]], [0.75, Z3]]), R('cannon', [[0, Z3], [0.35, [0, 0, -0.2]], [0.75, Z3]]),
    legs([[0, Z3], [0.3, [0, 0, 0.12]], [0.75, Z3]]) ]));
  // attack (Bubble Pop): aims, leans into the shot at 0.34 s, the barrel kicks back as the bubbles leave
  out.push(clip('attack', 0.9, [
    P('rig', [[0, Z3], [0.2, [0, -0.02, -0.03]], [0.34, [0, 0, 0.06]], [0.46, [0, 0, -0.05]], [0.9, Z3]], true),
    R('cannon', [[0, Z3], [0.2, [0, 0, -0.18]], [0.34, [0, 0, -0.14]], [0.44, [0, 0, 0.06]], [0.9, Z3]]),
    P('cannon', [[0, Z3], [0.32, Z3], [0.38, recoil(2.4)], [0.6, recoil(0.5)], [0.9, Z3]]),
    R('head', [[0, Z3], [0.2, [0, 0, -0.1]], [0.4, [0, 0, 0.05]], [0.9, Z3]]), lids([[0, 0], [0.34, 0], [0.38, 0.6], [0.5, 0], [0.9, 0]]) ]));
  // special (Tidal Surge): rears up on its hind legs with a roar, then slams down at 0.40 s and the cannon fires
  out.push(clip('special', 1.1, [
    P('rig', [[0, Z3], [0.26, [0, 0.12, -0.04]], [0.4, [0, -0.03, 0.1]], [0.6, [0, 0, 0.04]], [1.1, Z3]], true),
    R('rig', [[0, Z3], [0.26, [-0.3, 0, 0]], [0.4, [0.1, 0, 0]], [0.6, [0.02, 0, 0]], [1.1, Z3]]),
    R('jaw', [[0, Z3], [0.18, [0, 0, -0.5]], [0.5, [0, 0, -0.5]], [0.75, Z3], [1.1, Z3]]),
    R('head', [[0, Z3], [0.26, [0, 0, 0.3]], [0.45, [0, 0, -0.1]], [1.1, Z3]]),
    R('cannon', [[0, Z3], [0.26, [0, 0, 0.12]], [0.42, [0, 0, -0.1]], [1.1, Z3]]), P('cannon', [[0, Z3], [0.42, Z3], [0.48, recoil(3)], [0.75, recoil(0.6)], [1.1, Z3]]),
    legs([[0, Z3], [0.26, [0, 0, 0.5]], [0.4, [0, 0, -0.1]], [1.1, Z3]], null, [[0, Z3], [0.26, [0, 0, -0.2]], [0.4, Z3], [1.1, Z3]]) ]));
  // hit: hunkers into its shell, head pulled in, eyes shut
  out.push(clip('hit', 0.55, [
    P('rig', [[0, Z3], [0.08, [0, -0.02, -0.06]], [0.55, Z3]], true), P('head', [[0, Z3], [0.08, [-2.2, -0.6, 0]], [0.4, [-0.6, 0, 0]], [0.55, Z3]]),
    S('body', [[0, O3], [0.08, [1.04, 0.94, 1.04]], [0.55, O3]]), lids([[0, 0], [0.05, 1], [0.32, 1], [0.42, 0], [0.55, 0]]) ]));
  out.push(clip('hitBig', 0.8, [
    P('rig', [[0, Z3], [0.1, [0, 0.04, -0.14]], [0.4, [0, 0, -0.05]], [0.8, Z3]], true), R('rig', [[0, Z3], [0.1, [-0.14, 0.12, 0.08]], [0.45, Z3], [0.8, Z3]]),
    P('head', [[0, Z3], [0.1, [-3.4, -0.8, 0]], [0.55, [-1, 0, 0]], [0.8, Z3]]), R('cannon', [[0, Z3], [0.1, [0.15, 0, 0.2]], [0.5, Z3], [0.8, Z3]]),
    lids([[0, 0], [0.06, 1], [0.55, 1], [0.65, 0], [0.8, 0]]) ]));
  // heal: lifts the cannon skyward and lets a cool mist fall over itself
  out.push(clip('heal', 0.9, [R('cannon', [[0, Z3], [0.3, [0, 0, 0.35]], [0.65, [0, 0, 0.35]], [0.9, Z3]]), R('head', [[0, Z3], [0.3, [0, 0, 0.2]], [0.7, [0, 0, 0.2]], [0.9, Z3]]), lids([[0, 0], [0.3, 0.7], [0.7, 0.7], [0.9, 0]]), R('jaw', [[0, Z3], [0.3, [0, 0, -0.12]], [0.7, [0, 0, -0.12]], [0.9, Z3]])]));
  // guard: withdraws its head into the shell and braces
  out.push(clip('guard', 0.7, [P('head', [[0, Z3], [0.2, [-4.2, -1, 0]], [0.5, [-4.2, -1, 0]], [0.7, Z3]]), P('rig', [[0, Z3], [0.2, [0, -0.07, 0]], [0.5, [0, -0.07, 0]], [0.7, Z3]], true), lids([[0, 0], [0.15, 1], [0.55, 1], [0.7, 0]]), legs([[0, Z3], [0.2, [0, 0, 0.18]], [0.5, [0, 0, 0.18]], [0.7, Z3]])]));
  // victory: rears and roars, then fires a salute straight up
  out.push(clip('victory', 1.6, [
    R('rig', [[0, Z3], [0.3, [-0.22, 0, 0]], [0.55, [0.05, 0, 0]], [0.75, Z3], [1.6, Z3]]), P('rig', [[0, Z3], [0.3, [0, 0.1, 0]], [0.55, [0, -0.02, 0]], [0.75, Z3], [1.6, Z3]], true),
    R('jaw', [[0, Z3], [0.2, [0, 0, -0.55]], [0.6, [0, 0, -0.55]], [0.8, Z3], [1.6, Z3]]), R('head', [[0, Z3], [0.3, [0, 0, 0.35]], [0.7, [0, 0, 0.2]], [1, Z3], [1.6, Z3]]),
    R('cannon', [[0, Z3], [0.6, [0, 0, 0.6]], [1.3, [0, 0, 0.6]], [1.6, Z3]]), P('cannon', [[0, Z3], [0.85, Z3], [0.9, recoil(2.6)], [1.1, recoil(0.4)], [1.6, Z3]]),
    legs([[0, Z3], [0.3, [0, 0, 0.4]], [0.55, Z3], [1.6, Z3]], null, [[0, Z3], [1.6, Z3]]) ]));
  // defeat: legs fold, head sinks to the ground, the cannon droops, eyes close (holds the pose)
  out.push(clip('defeat', 1.2, [
    P('rig', [[0, Z3], [1.2, [0, -0.12, 0]]], true), R('rig', [[0, Z3], [1.2, [0.12, 0, 0.06]]]),
    R('head', [[0, Z3], [1.2, [0, 0.2, -0.45]]]), P('head', [[0, Z3], [1.2, [-1.6, -1.2, 0]]]), R('cannon', [[0, Z3], [1.2, [0, 0, -0.3]]]),
    legs([[0, Z3], [1.2, [0, 0, 0.5]]], [[0, Z3], [1.2, [0, 0, 0.45]]], [[0, Z3], [1.2, [0, 0, -0.4]]]), lids([[0, 0], [0.5, 0.6], [1.0, 1], [1.2, 1]]) ]));
  out.push(clip('move', 0.8, [P('rig', wave(0.8, 8, (p) => [0, 0.04 * Math.abs(sin(p * TAU)), 0]), true),
    R('legFL', wave(0.8, 8, (p) => [0, 0, 0.3 * sin(p * TAU)])), R('legBR', wave(0.8, 8, (p) => [0, 0, 0.3 * sin(p * TAU)])), R('legFR', wave(0.8, 8, (p) => [0, 0, -0.3 * sin(p * TAU)])), R('legBL', wave(0.8, 8, (p) => [0, 0, -0.3 * sin(p * TAU)])),
    R('head', wave(0.8, 8, (p) => [0, 0.06 * sin(p * TAU), 0]))]));
  return out;
}

/* ================================================================= AIMZA: intelligent, protective, curious, gentle */
function aimzaClips(root, stage) {
  const k = kit(root), { R, P, S, L, clip, wave, pair } = k;
  const heads = ['', '2', '3'].slice(0, stage), lidN = heads.map((n) => 'lid' + n);
  const wings = (keys) => pair('wingL', 'wingR', keys);
  const lids = (keys, d) => lidN.map((l, i) => L(l, keys.map(([t, c]) => [Math.min(t + (d || 0) * i, t), c])));
  // per head: a helper that staggers the same keys a little for each extra head (three voices, slightly apart)
  const eachHead = (fn) => heads.map((n, i) => fn(n, i)).flat();
  const out = [];
  // idle: slow breaths that the wings follow; each head looks about on its own (curious), the tail sways
  { const D = 4.8;
    out.push(clip('idle', D, [
      S('body', wave(D, 12, (p) => [1 + 0.02 * sin(p * TAU * 2), 1 - 0.015 * sin(p * TAU * 2), 1 + 0.02 * sin(p * TAU * 2)])),
      wings(wave(D, 12, (p) => [0.09 * sin(p * TAU * 2 + 0.6), 0, 0.03 * sin(p * TAU * 2)])),
      eachHead((n, i) => R('head' + n, wave(D, 16, (p) => [0, 0.2 * sin(p * TAU + i * 2.1) + (i === 1 ? 0.1 : i === 2 ? -0.1 : 0), 0.07 * sin(p * TAU * 2 + i)]))),
      R('tail', wave(D, 12, (p) => [0, 0.28 * sin(p * TAU * 2), 0.06 * sin(p * TAU)])) ])); }
  out.push(blinks(k, lidN, 5.6, [[1.4, 4.6], [2.3, 5.0], [0.8, 3.7]]));
  // ready: wings half-spread, heads up and on the target, standing a little taller
  out.push(clip('ready', 0.75, [
    wings([[0, Z3], [0.35, [0.32, 0, 0]], [0.75, Z3]]), P('rig', [[0, Z3], [0.3, [0, 0.04, 0]], [0.75, Z3]], true),
    eachHead((n) => R('head' + n, [[0, Z3], [0.3, [0, 0, 0.18]], [0.75, Z3]])) ]));
  // attack (Echo Wave): the main head draws back, then pushes forward with an open jaw at 0.34 s
  out.push(clip('attack', 0.9, [
    P('rig', [[0, Z3], [0.18, [0, 0, -0.05]], [0.34, [0, 0.02, 0.12]], [0.55, [0, 0, 0.04]], [0.9, Z3]], true),
    R('head', [[0, Z3], [0.18, [0, 0, 0.28]], [0.34, [0, 0, -0.16]], [0.6, [0, 0, -0.05]], [0.9, Z3]]),
    R('jaw', [[0, Z3], [0.22, [0, 0, -0.08]], [0.34, [0, 0, -0.55]], [0.55, [0, 0, -0.4]], [0.75, Z3], [0.9, Z3]]),
    eachHead((n, i) => (i ? R('head' + n, [[0, Z3], [0.2, [0, 0.15 * (i === 1 ? 1 : -1), 0.1]], [0.5, Z3], [0.9, Z3]]) : [])),
    wings([[0, Z3], [0.18, [-0.15, 0, 0]], [0.36, [0.3, 0, 0]], [0.9, Z3]]) ]));
  // special (Double / Triple Echo): every head rears back as the wings flare, then all strike together at 0.40 s
  out.push(clip('special', 1.1, [
    P('rig', [[0, Z3], [0.3, [0, 0.08, -0.08]], [0.4, [0, 0.04, 0.14]], [0.7, [0, 0, 0.04]], [1.1, Z3]], true),
    R('rig', [[0, Z3], [0.3, [-0.16, 0, 0]], [0.4, [0.08, 0, 0]], [1.1, Z3]]),
    wings([[0, Z3], [0.3, [0.55, 0, 0.1]], [0.42, [0.2, 0, 0]], [0.8, [0.3, 0, 0]], [1.1, Z3]]),
    eachHead((n, i) => [R('head' + n, [[0, Z3], [0.3, [0, (i === 1 ? 0.2 : i === 2 ? -0.2 : 0), 0.35]], [0.4 + i * 0.015, [0, 0, -0.2]], [0.75, [0, 0, -0.05]], [1.1, Z3]]),
      R('jaw' + n, [[0, Z3], [0.28, [0, 0, -0.15]], [0.4 + i * 0.015, [0, 0, -0.6]], [0.7, [0, 0, -0.45]], [0.95, Z3], [1.1, Z3]])]) ]));
  // hit / hitBig: heads snap back, wings pull in, eyes shut
  out.push(clip('hit', 0.55, [
    P('rig', [[0, Z3], [0.08, [0, 0, -0.1]], [0.55, Z3]], true), R('rig', [[0, Z3], [0.08, [-0.12, 0, 0.06]], [0.55, Z3]]),
    eachHead((n, i) => R('head' + n, [[0, Z3], [0.08 + i * 0.02, [0, 0, 0.3]], [0.4, Z3], [0.55, Z3]])), wings([[0, Z3], [0.08, [-0.2, 0, 0]], [0.55, Z3]]),
    lids([[0, 0], [0.05, 1], [0.3, 1], [0.42, 0], [0.55, 0]]) ]));
  out.push(clip('hitBig', 0.8, [
    P('rig', [[0, Z3], [0.1, [0, 0.05, -0.24]], [0.4, [0, 0, -0.08]], [0.8, Z3]], true), R('rig', [[0, Z3], [0.1, [-0.24, 0.2, 0.12]], [0.45, Z3], [0.8, Z3]]),
    eachHead((n, i) => R('head' + n, [[0, Z3], [0.1 + i * 0.03, [0, (i - 1) * 0.2, 0.45]], [0.55, [0, 0, 0.1]], [0.8, Z3]])), wings([[0, Z3], [0.1, [-0.3, 0, 0.1]], [0.5, Z3], [0.8, Z3]]),
    lids([[0, 0], [0.06, 1], [0.55, 1], [0.65, 0], [0.8, 0]]) ]));
  // heal (Hum): heads lift with eyes closed, wings open slowly, a gentle sway
  out.push(clip('heal', 0.9, [
    eachHead((n, i) => R('head' + n, [[0, Z3], [0.35, [0, 0, 0.32 - i * 0.04]], [0.7, [0, 0, 0.32 - i * 0.04]], [0.9, Z3]])), wings([[0, Z3], [0.4, [0.3, 0, 0]], [0.7, [0.3, 0, 0]], [0.9, Z3]]),
    lids([[0, 0], [0.25, 1], [0.7, 1], [0.9, 0]]), R('rig', wave(0.9, 6, (p) => [0, 0, 0.05 * sin(p * TAU)])) ]));
  // guard: wings wrap forward around it, heads lowered behind them
  out.push(clip('guard', 0.7, [wings([[0, Z3], [0.22, [-0.35, 0.5, 0]], [0.5, [-0.35, 0.5, 0]], [0.7, Z3]]), eachHead((n) => R('head' + n, [[0, Z3], [0.22, [0, 0, -0.25]], [0.5, [0, 0, -0.25]], [0.7, Z3]])), P('rig', [[0, Z3], [0.22, [0, -0.04, 0]], [0.5, [0, -0.04, 0]], [0.7, Z3]], true)]));
  // victory: wings spread wide and beat twice; the heads rear up and call one after another
  out.push(clip('victory', 1.6, [
    wings([[0, Z3], [0.25, [0.6, 0, 0]], [0.45, [0.1, 0, 0]], [0.7, [0.6, 0, 0]], [0.9, [0.1, 0, 0]], [1.2, [0.4, 0, 0]], [1.6, Z3]]),
    P('rig', [[0, Z3], [0.45, [0, 0.12, 0]], [0.9, [0, 0.06, 0]], [1.3, Z3], [1.6, Z3]], true),
    eachHead((n, i) => [R('head' + n, [[0, Z3], [0.3 + i * 0.15, [0, (i === 1 ? 0.25 : i === 2 ? -0.25 : 0), 0.45]], [0.9 + i * 0.15, [0, 0, 0.3]], [1.4, Z3], [1.6, Z3]]),
      R('jaw' + n, [[0, Z3], [0.32 + i * 0.15, [0, 0, -0.6]], [0.75 + i * 0.15, [0, 0, -0.6]], [1.0 + i * 0.15, Z3], [1.6, Z3]])]) ]));
  // defeat: wings droop, the heads lower one by one and close their eyes (holds the pose)
  out.push(clip('defeat', 1.2, [
    wings([[0, Z3], [1.2, [-0.5, 0, -0.35]]]), P('rig', [[0, Z3], [1.2, [0, -0.08, 0]]], true), R('rig', [[0, Z3], [1.2, [0.16, 0, 0.1]]]),
    eachHead((n, i) => R('head' + n, [[0, Z3], [0.2 + i * 0.25, [0, 0, 0.05]], [0.9 + i * 0.1, [0, (i - 1) * 0.15, -0.55]], [1.2, [0, (i - 1) * 0.15, -0.55]]])),
    lidN.map((l, i) => L(l, [[0, 0], [0.4 + i * 0.2, 0.3], [0.9 + i * 0.1, 1], [1.2, 1]])), R('tail', [[0, Z3], [1.2, [0, 0.3, -0.3]]]) ]));
  out.push(clip('move', 0.8, [P('rig', wave(0.8, 8, (p) => [0, 0.05 * Math.abs(sin(p * TAU)), 0]), true), wings(wave(0.8, 8, (p) => [0.15 * sin(p * TAU), 0, 0])), eachHead((n, i) => R('head' + n, wave(0.8, 8, (p) => [0, 0, 0.06 * sin(p * TAU + i)])))]));
  return out;
}

/* ================================================================= registration */
// keep the shared 'move' fallback order; the persona clips are replaced entirely
CLIP_HOOKS.umbrit = (root) => umbritClips(root);
CLIP_HOOKS.cannonis = (root) => cannonisClips(root);
CLIP_HOOKS.aimza = (root) => aimzaClips(root, 1);
CLIP_HOOKS.aimza2 = (root) => aimzaClips(root, 2);
CLIP_HOOKS.aimza3 = (root) => aimzaClips(root, 3);
export const SHOWCASE_IDS = ['umbrit', 'cannonis', 'aimza', 'aimza2', 'aimza3'];
// the details-screen viewer opens at a three-quarter angle that shows each one's signature (Cannonis's cannon and shell, Aimza's wings and heads)
export const VIEW_YAW = { umbrit: -0.45, cannonis: -1.05, aimza: -0.75, aimza2: -0.8, aimza3: -0.8 };

/* ================================================================= living details (viewer and battle)
   Glow that breathes with the creature, flares for a special and dims when it is defeated; a ground decoration
   (Umbrit's shadow pool, the glowing ring Aimza stands on in its card). Cheap: a colour multiply on the glow
   materials and one ground mesh. Reduce motion keeps everything still. */
const LIVING = {
  umbrit: { rate: 0.9, base: 0.9, amp: 0.12, ground: 'pool', col: '#1a1030' },
  cannonis: { rate: 1.6, base: 0.88, amp: 0.14, ground: null },
  aimza: { rate: 1.2, base: 0.86, amp: 0.16, ground: 'ring', col: '#22d3ee' },
  aimza2: { rate: 1.1, base: 0.85, amp: 0.18, ground: 'ring', col: '#22d3ee' },
  aimza3: { rate: 1.0, base: 0.84, amp: 0.2, ground: 'ring', col: '#22d3ee' },
};
let ringTex = null;
function ringTexture() {
  if (ringTex) return ringTex; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 34, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); ringTex = new THREE.CanvasTexture(c); ringTex.colorSpace = THREE.SRGBColorSpace; return ringTex;
}
export function living(actor, calm) {
  const cfg = LIVING[actor.spId]; if (!cfg || !actor.root.userData.parts) return null;
  const glows = actor.mats.filter((m) => m.name === 'voxelGlow'); let t = Math.random() * 10, flare = 0, dim = 0, dimTo = 0;
  // eyelids are only drawn while they are closing (an open lid is scaled to nothing: no need to send it to the GPU)
  const lids = []; actor.root.traverse((o) => { if (/^lid/.test(o.name) && o.children.length) lids.push(o); });
  let ground = null;
  if (cfg.ground === 'ring') {
    ground = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: ringTexture(), color: cfg.col, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  } else if (cfg.ground === 'pool') {
    ground = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), new THREE.MeshBasicMaterial({ color: cfg.col, transparent: true, opacity: 0.4, depthWrite: false }));
  }
  if (ground) { ground.name = 'showcase:ground'; ground.rotation.x = -Math.PI / 2; ground.position.y = 0.012; actor.group.add(ground); }
  return {
    onPlay(name) { if (name === 'special' || name === 'victory') flare = 1; if (name === 'defeat') dimTo = 0.6; else dimTo = 0; },
    update(dt) {
      const still = calm(); if (!still) t += dt; flare = Math.max(0, flare - dt * 1.4); dim += (dimTo - dim) * Math.min(1, dt * 2);
      const k = (cfg.base + (still ? 0 : cfg.amp * Math.sin(t * cfg.rate * Math.PI))) * (1 + flare * 0.6) * (1 - dim);
      glows.forEach((m) => m.color.setScalar(k));
      for (let i = 0; i < lids.length; i++) lids[i].visible = lids[i].scale.y > 0.02;
      if (ground) { const p = still ? 0 : Math.sin(t * cfg.rate * 0.8); ground.material.opacity = (cfg.ground === 'ring' ? 0.42 + p * 0.12 + flare * 0.3 : 0.36 + p * 0.05) * (1 - dim * 0.8); if (cfg.ground === 'pool') ground.scale.setScalar(1 + p * 0.05 + dim * 0.25); }
    },
    dispose() { if (ground) { ground.removeFromParent(); ground.geometry.dispose(); ground.material.dispose(); } },
  };
}

/* ================================================================= move choreography
   Each of their moves gets its own sequence, timed against the clip: shots leave from the real cannon muzzle or each
   head's mouth; the effect reaches the foe as the battle's hit beat lands (≈0.48 s), as before.
   api: { fx, at(delay, fn), from(who, node), chest(who), head(who), other(who), calm() } */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const STYLE = {
  // Cannonis: Bubble Pop — a muzzle flash and a stream of bubbles from the cannon
  bubbles(api, who) {
    const { fx, at } = api, tgt = api.other(who), n = Math.max(2, Math.round(6 * fx.scale()));
    at(0.34, () => { const mz = api.from(who, 'muzzle'); fx.glow(mz, '#9ae8ff', 0.9, 0.22); fx.burst(mz, ['#effcff', '#8fdcff'], 8, { speed: 1.2, life: 0.35, size: 0.05, grav: 1.5 }); });
    for (let i = 0; i < n; i++) at(0.35 + i * 0.022, () => { const to = api.chest(tgt).add(V3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)); fx.projectile(api.from(who, 'muzzle'), to, 'water', { dur: 0.11 }); });
  },
  // Cannonis: Tidal Surge — the stomp throws a wall of water along the ground, then the cannon fires through it
  surge(api, who) {
    const { fx, at } = api, tgt = api.other(who);
    at(0.38, () => {
      const a = api.slot(who).group.position.clone(), b = api.slot(tgt).group.position.clone(), d = b.clone().sub(a), side = V3(-d.z, 0, d.x).normalize();
      fx.shockwave(a.clone().setY(0.05), '#8fdcff', 1.6);
      const cols = ['#effcff', '#8fdcff', '#3a9ae8'], W = Math.max(4, Math.round(10 * fx.scale()));
      for (let r = 0; r < 3; r++) for (let j = 0; j < W; j++) { const off = (j / (W - 1) - 0.5) * 1.2, p = a.clone().addScaledVector(side, off).add(V3(0, 0.05 + r * 0.12, 0));
        fx.spawn(p, d.clone().multiplyScalar(1 / 0.16).add(V3(0, 1.2 + r * 0.4, 0)), { color: cols[(r + j) % 3], life: 0.2, size: 0.09 - r * 0.015, grav: 6, spin: 4 }); }
    });
    at(0.44, () => { const mz = api.from(who, 'muzzle'); fx.glow(mz, '#9ae8ff', 1.2, 0.25); fx.projectile(mz, api.chest(tgt), 'water', { dur: 0.08, big: true }); });
  },
  // Umbrit: Shade Nip — a shadowy double bite at the target
  nip(api, who) {
    const { fx, at } = api, tgt = api.other(who), s = who === 'p' ? 1 : -1;
    at(0.1, () => fx.burst(api.slot(who).group.position.clone().setY(0.1), ['#2a1f55', '#4a3690'], 6, { speed: 0.6, up: 0.4, life: 0.4, size: 0.05, grav: -0.3 }));
    at(0.34, () => fx.slash(api.chest(tgt), 'dark', s));
    at(0.42, () => { fx.slash(api.chest(tgt).add(V3(0, -0.12, 0)), 'dark', -s); fx.burst(api.chest(tgt), ['#b9a2ff', '#2a1f55'], 8, { speed: 1.4, life: 0.35, size: 0.05 }); });
  },
  // Umbrit: Gloom Veil — the crest flares, a shadow orb crosses, and a veil of dusk wraps the foe
  veil(api, who) {
    const { fx, at } = api, tgt = api.other(who);
    at(0.12, () => { fx.glow(api.head(who), '#f6efff', 1.1, 0.4); fx.column(api.slot(who).group.position, ['#2a1f55', '#4a3690', '#b9a2ff'], 12, { r: 0.45, rise: 0.9, life: 0.6, size: 0.05 }); });
    at(0.3, () => fx.projectile(api.head(who), api.chest(tgt), 'dark', { dur: 0.17, big: true }));
    at(0.47, () => { const c = api.slot(tgt).group.position, n = Math.max(6, Math.round(18 * fx.scale())), R0 = 0.55 * api.slot(tgt).group.scale.x;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, p = c.clone().add(V3(Math.cos(a) * R0, 1.1 * api.slot(tgt).group.scale.y, Math.sin(a) * R0 * 0.8));
        fx.spawn(p, V3(-Math.sin(a) * 0.6 - Math.cos(a) * 0.3, -1.6, Math.cos(a) * 0.5 - Math.sin(a) * 0.3), { color: i % 2 ? '#2a1f55' : '#6a58b0', life: 0.6, size: 0.06, grav: 0, spin: 3 }); }
      fx.glow(api.chest(tgt), '#6a58b0', 1.2, 0.4); });
  },
  // Aimza: Echo Wave — rings of cyan light travel from the mouth and widen as they go
  echo(api, who, info) {
    const { fx, at } = api, tgt = api.other(who), heads = info.heads || 1;
    for (let r = 0; r < 3; r++) at(0.28 + r * 0.05, () => ring(api, who, tgt, 'mouth', 0.14, r));
    if (heads > 1) at(0.32, () => fx.glow(api.from(who, 'mouth'), '#7fe6f0', 0.8, 0.2));
  },
  // Aimza: Double / Triple Echo — every head fires a beam; they converge on the foe, then rings follow
  beams(api, who, info) {
    const { fx, at } = api, tgt = api.other(who), heads = ['mouth', 'mouth2', 'mouth3'].slice(0, info.heads || 2);
    heads.forEach((mn, i) => {
      at(0.2 + i * 0.03, () => fx.glow(api.from(who, mn), '#22d3ee', 0.7, 0.3));
      at(0.38 + i * 0.015, () => beam(api, api.from(who, mn), api.chest(tgt)));
      at(0.42 + i * 0.015, () => ring(api, who, tgt, mn, 0.1, 0));
    });
    at(0.5, () => { fx.shockwave(api.slot(tgt).group.position.clone().setY(0.06), '#7fe6f0', 1.5); fx.glow(api.chest(tgt), '#ffffff', 1.1, 0.2); });
  },
  // Aimza: Hum — rings of light rise around it
  hum(api, who) {
    const { fx, at } = api, c = api.slot(who).group.position, sc = api.slot(who).group.scale.x;
    for (let r = 0; r < 3; r++) at(0.1 + r * 0.16, () => { const n = Math.max(6, Math.round(16 * fx.scale()));
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; fx.spawn(c.clone().add(V3(Math.cos(a) * 0.62 * sc, 0.06, Math.sin(a) * 0.5 * sc)), V3(0, 1.0, 0), { color: i % 2 ? '#7fe6f0' : '#22d3ee', life: 0.8, size: 0.05, grav: 0, spin: 2 }); } });
    at(0.3, () => fx.glow(api.chest(who), '#7fe6f0', 1.2, 0.5));
  },
};
function ring(api, who, tgt, mouthNode, dur, idx) {
  const { fx } = api, a = api.from(who, mouthNode), b = api.chest(tgt), d = b.clone().sub(a), L = d.length(); d.normalize();
  const u = Math.abs(d.y) < 0.9 ? V3(0, 1, 0) : V3(1, 0, 0), s1 = u.clone().cross(d).normalize(), s2 = d.clone().cross(s1).normalize(), n = Math.max(6, Math.round(12 * fx.scale())), r0 = 0.08 + idx * 0.02;
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, off = s1.clone().multiplyScalar(Math.cos(t)).addScaledVector(s2, Math.sin(t));
    fx.spawn(a.clone().addScaledVector(off, r0), d.clone().multiplyScalar(L / dur).addScaledVector(off, 1.2), { color: i % 3 ? '#22d3ee' : '#ffffff', life: dur + 0.06, size: 0.045, grav: 0, spin: 1 }); }
}
function beam(api, a, b) {
  const { fx } = api, n = Math.max(6, Math.round(16 * fx.scale())), d = b.clone().sub(a);
  for (let i = 0; i <= n; i++) fx.spawn(a.clone().addScaledVector(d, i / n), V3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2), { color: i % 4 ? '#22d3ee' : '#ffffff', life: 0.22 + (i / n) * 0.08, size: 0.06, grav: 0, spin: 2 });
  fx.glow(b, '#7fe6f0', 0.9, 0.22);
}
export const MOVES = { bubblepop: 'bubbles', tidalsurge: 'surge', shadenip: 'nip', gloomveil: 'veil', echowave: 'echo', doubleecho: 'beams', tripleecho: 'beams', hum: 'hum' };
const HEADS = { aimza: 1, aimza2: 2, aimza3: 3 };
// returns true when the move was choreographed here (the stage then skips its generic projectile / slash)
export function choreograph(api, who, spId, abil, info) {
  if (SHOWCASE_IDS.indexOf(spId) < 0) return false; const st = STYLE[MOVES[abil]]; if (!st) return false;
  st(api, who, Object.assign({ heads: HEADS[spId] || 1 }, info)); return true;
}
