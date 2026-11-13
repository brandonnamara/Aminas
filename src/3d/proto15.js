/* Aminas — Phase 15 prototypes: animation, move effects, combat accents and sound layers for the three prototype
   lines (Lumifern, Igniflare, Atem). Used only when the developer switch is on (A.Proto15, see src/voxel-proto15.js);
   with it off nothing here runs and the game behaves exactly as before.
   Contracts kept (Phase 8/8B): the same clip names and lengths, plus 'blink'; attack and special reach the foe at
   0.34 s and 0.40 s (the rig's forward peak); every clip except defeat ends exactly at rest; move effects land inside
   the battle's existing hit beat (≈0.48 s); effects are cubes from the shared pool and scale down with Battery Saver
   and Reduce Motion (fx.scale()). Battle rules, damage, turn order, statuses and timings are untouched.
   Each line moves as its anatomy suggests:
   - Lumifern (small, gentle, curious): quick light hops with squash and stretch; leaf ears in two parts, so the tips
     trail and flop after the body (follow-through); it dozes off and perks up; Aurelith's leaf wings flutter.
   - Igniflare → Ignivor (flying dragon, heavy by stage III): breathing that lifts the chest, the neck and tail moving as
     chains with a lag down each segment, wingbeats with a fast downstroke and the tips folding on the upstroke, a jaw
     that opens for bites and fire; the hatchling is bouncy, Ignivor slow and weighty.
   - Atem (mechanical, war): servo motion — quick moves into exact poses that are held, with a small overshoot and
     settle, never a drifting sway; a head scan in fixed steps; the ring behind its head turns in ticks; elbows and
     knees bend; slashes end in a held pose. */
import { THREE, PROTO_HOOKS } from './creature3d.js';
import { hitMaterial15 } from './roster15.js';   // Phase 15B: the refined roster's clips, move accents and hit material
import { kit, blinks, STYLE, MOVES } from './showcase.js';

const negX = (keys) => keys.map(([t, v]) => [t, [-v[0], v[1], v[2]]]);
const Z3 = [0, 0, 0], O3 = [1, 1, 1], sin = Math.sin, cos = Math.cos, TAU = Math.PI * 2, PI = Math.PI;
const bump = (t, a, b) => (t <= a || t >= b ? 0 : sin(PI * (t - a) / (b - a)) ** 2);
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
// sampled curve: f(t) -> [x,y,z], N keys over D
const F = (D, N, f) => Array.from({ length: N + 1 }, (_, i) => { const t = D * i / N; return [t, f(t)]; });
// servo keys: from a list of [time, pose] targets, each move takes `tr` seconds, overshoots a little and settles,
// then holds exactly (a machine reaching a position, not an animal drifting into one)
function servo(list, tr, over) {
  over = over == null ? 0.08 : over; const out = [[0, list[0][1]]]; let prev = list[0][1];
  for (let i = 1; i < list.length; i++) { const [t, v] = list[i], t0 = Math.max(out[out.length - 1][0] + 0.001, t - tr);
    if (t0 > out[out.length - 1][0] + 0.002) out.push([t0, prev]);
    const os = [v[0] + (v[0] - prev[0]) * over, v[1] + (v[1] - prev[1]) * over, v[2] + (v[2] - prev[2]) * over];
    out.push([t0 + (t - t0) * 0.7, os]); out.push([t, v]); prev = v; }
  return out;
}
const stageOf = (spId) => { const sp = window.A.Data.SPECIES[spId]; return (sp && sp.stage) || 1; };

/* ================================================================= LUMIFERN */
function lumifernClips(root, spId) {
  const st = stageOf(spId), k = kit(root), { R, S, L, clip, has } = k, Pw = (n, keys) => k.P(n, keys, true);
  const lidN = Object.keys(k.n).filter((n) => /^lid/.test(n) && k.n[n].isBone);
  const amp = [1.15, 1, 0.85][st - 1], spd = [1.12, 1, 0.9][st - 1];
  const ears = (fL, fR) => [R('earL', fL), R('earR', fR || fL, true)];
  const tips = (fL, fR) => [R('earTipL', fL), R('earTipR', fR || fL, true)];
  const wings = (keys) => [R('wingL', negX(keys)), R('wingR', negX(keys), true)];   // +x raises the wing
  const lids = (keys) => lidN.map((l) => L(l, keys));
  const head = (keys) => (has('head') ? R('head', keys) : null);
  const crown = (keys) => [R('sprout', keys), R('crown', keys)];
  const feet = (keys) => [R('pawL', keys), R('pawR', keys, true), R('legL', keys), R('legR', keys, true)];
  const out = [];
  // idle: breathing, ears swaying with their tips trailing, a curious tilt, a little bounce (I), and its quirk: it
  // dozes off (eyes half closed, ears drooping), then perks up with a flick of both ears
  { const D = +(4.0 / spd).toFixed(2), N = Math.ceil(D / 0.033), ph = (t) => (t / D) * TAU, q0 = D * 0.58, q1 = D * 0.86, doze = (t) => bump(t, q0, q1), perk = (t) => bump(t, q1 - 0.05, q1 + 0.25);
    out.push(clip('idle', D, [
      S('body', F(D, N, (t) => { const b = 0.035 * amp * sin(ph(t) * 2); return [1 + b, 1 - b * 0.8, 1 + b]; })),
      Pw('rig', F(D, N, (t) => [0, (st === 1 ? 0.035 * bump(t, D * 0.12, D * 0.22) + 0.03 * bump(t, D * 0.24, D * 0.33) : 0.012 * (0.5 - 0.5 * cos(ph(t) * 2))) * amp - 0.02 * doze(t), 0])),
      R('rig', F(D, N, (t) => [0.05 * doze(t), 0, (st === 1 ? 0.07 : 0.03) * sin(ph(t)) * (1 - doze(t))])),
      head(F(D, N, (t) => [0.12 * bump(t, D * 0.36, D * 0.54), 0.16 * sin(ph(t) + 0.6) * (1 - doze(t)), -0.12 * doze(t)])),
      ears(F(D, N, (t) => [0.08 * sin(ph(t) * 2), 0, -0.35 * doze(t) + 0.25 * perk(t)]), F(D, N, (t) => [0.08 * sin(ph(t) * 2 + 0.9), 0, -0.35 * doze(t) + 0.25 * perk(t)])),
      tips(F(D, N, (t) => [0.14 * sin(ph(t) * 2 - 0.8), 0, -0.4 * doze(t) + 0.35 * perk(t) - 0.1 * perk(t - 0.08)]), F(D, N, (t) => [0.14 * sin(ph(t) * 2 + 0.1), 0, -0.4 * doze(t) + 0.35 * perk(t)])),
      R('tail', F(D, N, (t) => [0, 0.3 * amp * sin(ph(t) * 3), 0.05 * sin(ph(t))])),
      crown(F(D, N, (t) => [0.06 * sin(ph(t)), 0.25 * sin(ph(t)), 0.05 * sin(ph(t) * 2)])),
      R('wheel', F(D, N, (t) => [0.35 * sin(ph(t)), 0, 0])),
      wings(F(D, N, (t) => [0.1 * sin(ph(t) * 4) + 0.05, 0, 0.04 * sin(ph(t) * 2)])),
      feet(F(D, N, (t) => [0, 0, 0.12 * bump(t, D * 0.05, D * 0.12)])),
      lidN.length ? lids(F(D, N, (t) => 0.55 * doze(t))) : [] ])); }
  if (lidN.length) out.push(blinks(k, lidN, 4.6, [[1.2, 3.6, 3.82]]));
  // ready: crouch, ears pressed back, then up on its toes, ears perked
  out.push(clip('ready', 0.75, [
    S('body', [[0, O3], [0.2, [1.1, 0.86, 1.1]], [0.42, [0.96, 1.06, 0.96]], [0.75, O3]]),
    Pw('rig', [[0, Z3], [0.2, [0, -0.02, 0]], [0.42, [0, 0.05 * amp, 0.02]], [0.75, Z3]]),
    ears([[0, Z3], [0.2, [0, 0, -0.55]], [0.45, [0, 0, 0.2]], [0.75, Z3]]), tips([[0, Z3], [0.26, [0, 0, -0.5]], [0.52, [0, 0, 0.3]], [0.75, Z3]]),
    R('tail', [[0, Z3], [0.3, [0, 0.4, 0]], [0.75, Z3]]) ]));
  // attack (hop-tackle): squats with ears back, springs forward (contact 0.34), stretches in the air, lands with a
  // squash; the ear tips trail the jump and flop on landing
  out.push(clip('attack', 0.9, [
    Pw('rig', [[0, Z3], [0.16, [0, -0.03, -0.06]], [0.27, [0, 0.16 * amp, 0.22]], [0.34, [0, 0.06, 0.46 * amp]], [0.48, [0, 0, 0.3]], [0.9, Z3]]),
    R('rig', [[0, Z3], [0.16, [-0.12, 0, 0]], [0.3, [0.2, 0, 0]], [0.42, [0.08, 0, 0]], [0.9, Z3]]),
    S('body', [[0, O3], [0.16, [1.16, 0.8, 1.16]], [0.28, [0.88, 1.18, 0.88]], [0.38, [1.14, 0.84, 1.14]], [0.55, [0.98, 1.03, 0.98]], [0.9, O3]]),
    ears([[0, Z3], [0.16, [0, 0, -0.7]], [0.34, [0, 0, -0.5]], [0.5, [0, 0, 0.15]], [0.9, Z3]]),
    tips([[0, Z3], [0.2, [0, 0, -0.5]], [0.38, [0, 0, -0.75]], [0.52, [0, 0, 0.45]], [0.66, [0, 0, -0.12]], [0.9, Z3]]),
    head([[0, Z3], [0.16, [0, 0, 0.18]], [0.34, [0, 0, -0.22]], [0.6, Z3], [0.9, Z3]]),
    R('tail', [[0, Z3], [0.16, [0, 0, 0.5]], [0.34, [0, 0, -0.4]], [0.6, [0, 0.2, 0]], [0.9, Z3]]),
    feet([[0, Z3], [0.16, [0, 0, -0.3]], [0.3, [0, 0, 0.4]], [0.5, Z3], [0.9, Z3]]),
    lids([[0, 0], [0.12, 0.35], [0.36, 0.35], [0.5, 0], [0.9, 0]]) ]));
  // special (Sun bloom): rises on stored sunlight with ears and leaves spread wide, then pushes the light forward
  // (contact 0.40); the crown and sun-wheel turn as it gathers
  out.push(clip('special', 1.1, [
    Pw('rig', [[0, Z3], [0.28, [0, 0.2 * amp, -0.06]], [0.4, [0, 0.12, 0.2]], [0.7, [0, 0.04, 0.06]], [1.1, Z3]]),
    R('rig', [[0, Z3], [0.28, [-0.22, 0, 0]], [0.4, [0.16, 0, 0]], [0.75, Z3], [1.1, Z3]]),
    S('body', [[0, O3], [0.28, [1.1, 1.12, 1.1]], [0.4, [0.94, 1.06, 0.94]], [0.7, [1.02, 0.98, 1.02]], [1.1, O3]]),
    ears([[0, Z3], [0.28, [0.4, 0, 0.35]], [0.42, [0.2, 0, -0.1]], [0.8, Z3], [1.1, Z3]]), tips([[0, Z3], [0.3, [0.25, 0, 0.45]], [0.46, [0, 0, -0.35]], [0.7, [0, 0, 0.12]], [1.1, Z3]]),
    wings([[0, Z3], [0.28, [0.55, 0, 0]], [0.4, [-0.25, 0, 0]], [0.6, [0.2, 0, 0]], [1.1, Z3]]),
    crown([[0, Z3], [0.3, [0, 0.9, 0]], [0.5, [0, 1.2, 0]], [1.1, Z3]]), R('wheel', [[0, Z3], [0.3, [0.9, 0, 0]], [0.55, [1.3, 0, 0]], [1.1, Z3]]),
    head([[0, Z3], [0.28, [0, 0, 0.25]], [0.42, [0, 0, -0.1]], [1.1, Z3]]),
    R('tail', [[0, Z3], [0.28, [0, 0.6, 0.3]], [0.5, [0, -0.3, 0]], [1.1, Z3]]),
    lids([[0, 0], [0.25, 0.4], [0.4, 0], [1.1, 0]]) ]));
  // hit: a flinch back, eyes squeezed, ears flattened; the tips whip forward after the body stops
  out.push(clip('hit', 0.55, [
    Pw('rig', [[0, Z3], [0.08, [0, 0.03, -0.16]], [0.3, [0, 0, -0.04]], [0.55, Z3]]), R('rig', [[0, Z3], [0.08, [-0.22, 0, 0.1]], [0.55, Z3]]),
    S('body', [[0, O3], [0.08, [0.9, 1.1, 0.9]], [0.2, [1.08, 0.92, 1.08]], [0.55, O3]]),
    ears([[0, Z3], [0.08, [0, 0, -0.75]], [0.4, [0, 0, -0.2]], [0.55, Z3]]), tips([[0, Z3], [0.1, [0, 0, -0.3]], [0.22, [0, 0, 0.5]], [0.38, [0, 0, -0.15]], [0.55, Z3]]),
    lids([[0, 0], [0.05, 1], [0.3, 1], [0.42, 0], [0.55, 0]]) ]));
  out.push(clip('hitBig', 0.8, [
    Pw('rig', [[0, Z3], [0.1, [0, 0.14, -0.32]], [0.3, [0, 0, -0.2]], [0.8, Z3]]), R('rig', [[0, Z3], [0.1, [-0.45, 0.5, 0.2]], [0.36, [-0.1, 0.1, 0]], [0.8, Z3]]),
    S('body', [[0, O3], [0.1, [0.86, 1.14, 0.86]], [0.3, [1.12, 0.88, 1.12]], [0.8, O3]]),
    ears([[0, Z3], [0.1, [0.3, 0, -0.9]], [0.5, [0, 0, -0.3]], [0.8, Z3]]), tips([[0, Z3], [0.14, [0, 0, -0.5]], [0.3, [0, 0, 0.6]], [0.5, [0, 0, -0.2]], [0.8, Z3]]),
    lids([[0, 0], [0.05, 1], [0.5, 1], [0.62, 0], [0.8, 0]]) ]));
  // heal: a happy wiggle, ears up; guard: curls into a ball, ears folded down over itself (as when frightened)
  out.push(clip('heal', 0.9, [ S('body', [[0, O3], [0.3, [1.06, 1.08, 1.06]], [0.6, [0.98, 1.02, 0.98]], [0.9, O3]]), R('rig', F(0.9, 18, (t) => [0, 0, 0.12 * sin(t / 0.9 * TAU * 2) * (1 - t / 0.9)])),
    ears([[0, Z3], [0.3, [0.2, 0, 0.4]], [0.9, Z3]]), tips([[0, Z3], [0.36, [0, 0, 0.5]], [0.9, Z3]]), lids([[0, 0], [0.2, 0.6], [0.6, 0.6], [0.9, 0]]) ]));
  out.push(clip('guard', 0.7, [ S('body', [[0, O3], [0.2, [1.14, 0.8, 1.14]], [0.5, [1.12, 0.82, 1.12]], [0.7, O3]]), Pw('rig', [[0, Z3], [0.2, [0, -0.05, -0.04]], [0.7, Z3]]),
    ears([[0, Z3], [0.18, [0, 0, -1.0]], [0.5, [0, 0, -0.95]], [0.7, Z3]]), tips([[0, Z3], [0.22, [0, 0, -0.7]], [0.5, [0, 0, -0.65]], [0.7, Z3]]), head([[0, Z3], [0.2, [0, 0, -0.25]], [0.7, Z3]]),
    lids([[0, 0], [0.15, 1], [0.5, 1], [0.7, 0]]) ]));
  // victory: two happy hops with a little twirl, ears flapping; defeat: a wobble, then it curls up and dozes off
  out.push(clip('victory', 1.6, [
    Pw('rig', F(1.6, 48, (t) => [0, 0.2 * amp * (bump(t, 0.1, 0.55) + 0.8 * bump(t, 0.7, 1.1)), 0])),
    R('rig', F(1.6, 48, (t) => [0, TAU * 0.5 * ease((t - 0.7) / 0.4) * (t < 1.1 ? 1 : 0) + (t >= 1.1 ? PI * (1 - ease((t - 1.1) / 0.5)) : 0), 0])),
    S('body', F(1.6, 48, (t) => { const s = bump(t, 0.05, 0.15) + bump(t, 0.55, 0.68) + bump(t, 1.1, 1.22); return [1 + 0.12 * s, 1 - 0.14 * s, 1 + 0.12 * s]; })),
    ears(F(1.6, 48, (t) => [0.3 * sin(t * 14) * bump(t, 0.1, 1.4), 0, 0.3 * bump(t, 0.1, 1.4)])), tips(F(1.6, 48, (t) => [0.35 * sin(t * 14 - 1) * bump(t, 0.1, 1.4), 0, 0.2 * sin(t * 9) * bump(t, 0.1, 1.4)])),
    wings(F(1.6, 48, (t) => [0.5 * sin(t * 18) * bump(t, 0.1, 1.4), 0, 0])), R('tail', F(1.6, 48, (t) => [0, 0.5 * sin(t * 16) * bump(t, 0, 1.5), 0])),
    lids([[0, 0], [0.2, 0.7], [1.3, 0.7], [1.6, 0]]) ]));
  out.push(clip('defeat', 1.2, [
    R('rig', [[0, Z3], [0.25, [0, 0, 0.15]], [0.45, [0, 0, -0.12]], [0.9, [0.3, 0, 0.05]], [1.2, [0.34, 0, 0.05]]]), Pw('rig', [[0, Z3], [0.9, [0, -0.06, 0]], [1.2, [0, -0.07, 0]]]),
    S('body', [[0, O3], [0.9, [1.14, 0.82, 1.14]], [1.2, [1.15, 0.8, 1.15]]]),
    ears([[0, Z3], [0.5, [0, 0, -0.6]], [1.2, [0, 0, -1.0]]]), tips([[0, Z3], [0.6, [0, 0, -0.6]], [1.2, [0, 0, -0.8]]]), head([[0, Z3], [1.2, [0, 0, -0.35]]]),
    lids([[0, 0], [0.5, 0.6], [1.0, 1], [1.2, 1]]) ]));
  // move: little hops, ears flopping a beat behind
  { const M = 0.8;
    out.push(clip('move', M, [ Pw('rig', F(M, 24, (t) => [0, 0.07 * amp * Math.abs(sin(t / M * TAU)), 0])), S('body', F(M, 24, (t) => { const c = cos(t / M * TAU * 2); return [1 + 0.05 * c, 1 - 0.06 * c, 1 + 0.05 * c]; })),
      tips(F(M, 24, (t) => [0, 0, 0.3 * sin(t / M * TAU * 2 - 1)])), ears(F(M, 24, (t) => [0, 0, 0.12 * sin(t / M * TAU * 2 - 0.4)])),
      feet(F(M, 24, (t) => [0, 0, 0.35 * sin(t / M * TAU)])), R('tail', F(M, 24, (t) => [0, 0.3 * sin(t / M * TAU), 0])) ])); }
  return out;
}

/* ================================================================= IGNIFLARE → IGNIVOR */
function dragonClips(root, spId) {
  const st = stageOf(spId), k = kit(root), { R, S, L, clip } = k, Pw = (n, keys) => k.P(n, keys, true);
  const lidN = Object.keys(k.n).filter((n) => /^lid/.test(n) && k.n[n].isBone), lids = (keys) => lidN.map((l) => L(l, keys));
  const H = [0.25, 0.55, 0.85][st - 1], amp = [1.15, 1, 0.85][st - 1], lag = [0.9, 1, 1.15][st - 1];   // weight: the hatchling bounces, Ignivor is heavy
  const wings = (fL, fR) => [R('wingL', negX(fL)), R('wingR', negX(fR || fL), true)], tipsW = (fL, fR) => [R('wingTipL', negX(fL)), R('wingTipR', negX(fR || fL), true)];   // +x raises
  const legsF = (fl, fr) => [R('legFL', fl), R('legFR', fr || fl)], legsB = (bl, br) => [R('legBL', bl), R('legBR', br || bl)];
  // the tail as a chain: each segment follows the one before with a delay (the wave travels down the tail)
  const tailChain = (D, N, f) => [R('tail', F(D, N, (t) => f(t, 0))), R('tail2', F(D, N, (t) => f(t, 1))), R('tail3', F(D, N, (t) => f(t, 2)))];
  // a wingbeat: down fast, up slower; the tip lags (folds on the upstroke, opens on the downstroke)
  const beat = (p) => { const u = ((p % 1) + 1) % 1; return u < 0.38 ? 0.7 - 1.3 * ease(u / 0.38) : -0.6 + 1.3 * ease((u - 0.38) / 0.62); };
  const out = [];
  // idle: the chest rises with each breath; neck and head look about on a slow S; the tail sways as a chain; the quirk
  // is a big wing stretch with a yawn (the jaw opens), then the wings settle with a small shake
  { const D = +(3.8 * lag * [0.95, 1.15, 1.35][st - 1]).toFixed(2), N = Math.ceil(D / 0.033), ph = (t) => (t / D) * TAU, q0 = D * 0.5, q1 = D * 0.8, str = (t) => bump(t, q0, q1);
    out.push(clip('idle', D, [
      S('body', F(D, N, (t) => { const b = 0.03 * (1 + H * 0.4) * sin(ph(t) * 2); return [1 + b * 0.6, 1 + b, 1 + b * 0.8]; })),
      Pw('rig', F(D, N, (t) => [0.012 * sin(ph(t)), (st === 1 ? 0.02 * Math.abs(sin(ph(t) * 2)) : 0) - 0.015 * str(t), 0])),
      R('rig', F(D, N, (t) => [-0.04 * str(t), 0, 0.02 * sin(ph(t))])),
      R('neck', F(D, N, (t) => [0, 0.16 * sin(ph(t)), 0.05 * sin(ph(t) * 2) + 0.18 * str(t)])),
      R('head', F(D, N, (t) => [0, -0.1 * sin(ph(t) - 0.5), -0.04 * sin(ph(t) * 2 - 0.6) + 0.25 * str(t)])),
      R('jaw', F(D, N, (t) => [0, 0, -0.45 * bump(t, q0 + D * 0.05, q1 - D * 0.04)])),
      wings(F(D, N, (t) => [0.05 * sin(ph(t) * 2) + 0.55 * str(t) - 0.08 * bump(t, q1, q1 + D * 0.08) * sin((t - q1) * 40), 0.25 * str(t), 0])),
      tipsW(F(D, N, (t) => [0.03 * sin(ph(t) * 2 - 0.7) + 0.35 * bump(t, q0 + D * 0.04, q1 + D * 0.02), 0.35 * bump(t, q0 + D * 0.04, q1), 0])),
      tailChain(D, N, (t, i) => [0, 0.22 * amp * sin(ph(t) * 2 - i * 0.9), 0.06 * sin(ph(t) - i * 0.7)]),
      legsF(F(D, N, () => Z3)), legsB(F(D, N, () => Z3)),
      lidN.length ? lids(F(D, N, (t) => 0.7 * bump(t, q0 + D * 0.08, q1 - D * 0.06))) : [] ])); }
  if (lidN.length) out.push(blinks(k, lidN, 5.0, [[1.5, 4.0, 4.24]]));
  // ready: a low crouch, wings half open, tail lashing once
  out.push(clip('ready', 0.75, [
    S('body', [[0, O3], [0.24, [1.06, 0.92, 1.06]], [0.75, O3]]), Pw('rig', [[0, Z3], [0.24, [0, -0.03, -0.02]], [0.75, Z3]]),
    R('neck', [[0, Z3], [0.24, [0, 0, -0.2]], [0.75, Z3]]), R('head', [[0, Z3], [0.24, [0, 0, 0.15]], [0.75, Z3]]),
    wings([[0, Z3], [0.3, [0.35, 0.15, 0]], [0.75, Z3]]), tipsW([[0, Z3], [0.36, [0.25, 0.2, 0]], [0.75, Z3]]),
    tailChain(0.75, 15, (t, i) => [0, 0.5 * bump(t, 0.05 + i * 0.06, 0.55 + i * 0.06), 0]) ]));
  // attack (bite): rears the head back and crouches, wings flare; lunges (contact 0.34) with the neck thrust out and
  // the jaw snapping shut; the tail counter-swings; heavier forms reach less far and settle with a thud
  const lunge = 0.42 * amp * (1 - 0.3 * H);
  out.push(clip('attack', 0.9, [
    Pw('rig', [[0, Z3], [0.18, [0, -0.03, -0.08]], [0.34, [0, 0.02, lunge]], [0.5, [0, -0.02 * H, lunge * 0.6]], [0.9, Z3]]),
    R('rig', [[0, Z3], [0.18, [-0.1, 0, 0]], [0.34, [0.14, 0, 0]], [0.55, [0.04 + 0.04 * H, 0, 0]], [0.9, Z3]]),
    S('body', [[0, O3], [0.18, [1.06, 0.92, 1.06]], [0.34, [0.96, 1.05, 0.96]], [0.5, [1.04 + 0.04 * H, 0.94, 1.04]], [0.9, O3]]),
    R('neck', [[0, Z3], [0.18, [0, 0, 0.35]], [0.34, [0, 0, -0.3]], [0.55, [0, 0, -0.1]], [0.9, Z3]]),
    R('head', [[0, Z3], [0.18, [0, 0, 0.2]], [0.34, [0, 0, -0.15]], [0.9, Z3]]),
    R('jaw', [[0, Z3], [0.18, [0, 0, -0.1]], [0.27, [0, 0, -0.7]], [0.35, [0, 0, -0.05]], [0.5, [0, 0, -0.15]], [0.9, Z3]]),
    wings([[0, Z3], [0.18, [0.45, 0.1, 0]], [0.34, [-0.15, 0, 0]], [0.6, [0.12, 0, 0]], [0.9, Z3]]), tipsW([[0, Z3], [0.22, [0.35, 0.2, 0]], [0.4, [-0.2, 0, 0]], [0.9, Z3]]),
    legsF([[0, Z3], [0.18, [0, 0, -0.2]], [0.34, [0, 0, 0.35]], [0.55, Z3], [0.9, Z3]]), legsB([[0, Z3], [0.18, [0, 0, 0.15]], [0.34, [0, 0, -0.3]], [0.6, Z3], [0.9, Z3]]),
    tailChain(0.9, 27, (t, i) => [0, 0.45 * (bump(t, 0.05 + i * 0.05, 0.34 + i * 0.05) - bump(t, 0.34 + i * 0.05, 0.75 + i * 0.04)), 0.2 * bump(t, 0.25, 0.6)]),
    lids([[0, 0], [0.14, 0.4], [0.36, 0.4], [0.5, 0], [0.9, 0]]) ]));
  // special (fire): rears up with a full wingbeat — the downstroke drives it forward as the head thrusts out and the
  // jaw opens wide for the breath (contact 0.40); the jaw stays open while the fire pours, then it lands heavily
  out.push(clip('special', 1.1, [
    Pw('rig', [[0, Z3], [0.26, [0, 0.18 * amp, -0.1]], [0.4, [0, 0.12, 0.26 * amp]], [0.72, [0, 0.05, 0.12]], [0.86, [0, -0.02 * H, 0.04]], [1.1, Z3]]),
    R('rig', [[0, Z3], [0.26, [-0.3, 0, 0]], [0.4, [0.08, 0, 0]], [0.72, [0.05, 0, 0]], [1.1, Z3]]),
    S('body', [[0, O3], [0.26, [0.96, 1.08, 0.96]], [0.4, [1.04, 0.96, 1.04]], [0.86, [1.03 + 0.04 * H, 0.95, 1.03]], [1.1, O3]]),
    R('neck', [[0, Z3], [0.26, [0, 0, 0.45]], [0.4, [0, 0, -0.35]], [0.75, [0, 0, -0.25]], [1.1, Z3]]),
    R('head', [[0, Z3], [0.26, [0, 0, 0.3]], [0.4, [0, 0, -0.2]], [0.75, [0, 0, -0.12]], [1.1, Z3]]),
    R('jaw', [[0, Z3], [0.3, [0, 0, -0.2]], [0.4, [0, 0, -0.85]], [0.75, [0, 0, -0.8]], [0.9, [0, 0, -0.1]], [1.1, Z3]]),
    wings(F(1.1, 44, (t) => [t < 0.9 ? beat((t - 0.26) / 0.5) * bump(t, 0, 0.95) * 1.1 + 0.15 * bump(t, 0, 0.9) : 0, 0.2 * bump(t, 0, 0.9), 0])),   // top of the beat as it rears (0.26 s), the downstroke drives the breath
    tipsW(F(1.1, 44, (t) => [t < 0.9 ? beat((t - 0.3) / 0.5) * bump(t, 0, 0.95) * 0.8 : 0, 0.3 * bump(t, 0.05, 0.9), 0])),
    legsF([[0, Z3], [0.26, [0, 0, 0.45]], [0.45, [0, 0, 0.15]], [0.86, [0, 0, -0.05]], [1.1, Z3]]), legsB([[0, Z3], [0.26, [0, 0, -0.2]], [0.6, Z3], [1.1, Z3]]),
    tailChain(1.1, 33, (t, i) => [0, 0.35 * sin(t * 9 - i * 1.1) * bump(t, 0, 1.0), -0.25 * bump(t, 0.15 + i * 0.05, 0.6 + i * 0.05)]),
    lids([[0, 0], [0.3, 0.3], [0.72, 0.3], [0.9, 0], [1.1, 0]]) ]));
  // hit: recoils, wings snap in, the neck whips back and the tail lashes; hitBig staggers it onto its haunches
  out.push(clip('hit', 0.55, [
    Pw('rig', [[0, Z3], [0.08, [0, 0.02, -0.14 * (1 - 0.4 * H)]], [0.55, Z3]]), R('rig', [[0, Z3], [0.08, [-0.18 * (1 - 0.4 * H), 0, 0.08]], [0.55, Z3]]),
    S('body', [[0, O3], [0.08, [0.93, 1.06, 0.93]], [0.22, [1.04, 0.96, 1.04]], [0.55, O3]]),
    R('neck', [[0, Z3], [0.08, [0, 0.15, 0.4]], [0.3, [0, 0, 0.05]], [0.55, Z3]]), R('head', [[0, Z3], [0.12, [0, 0.1, 0.25]], [0.55, Z3]]), R('jaw', [[0, Z3], [0.08, [0, 0, -0.3]], [0.3, Z3], [0.55, Z3]]),
    wings([[0, Z3], [0.08, [-0.3, 0, 0]], [0.55, Z3]]), tipsW([[0, Z3], [0.12, [-0.3, -0.2, 0]], [0.55, Z3]]),
    tailChain(0.55, 11, (t, i) => [0, 0.45 * bump(t, 0.02 + i * 0.05, 0.4 + i * 0.03), 0]),
    lids([[0, 0], [0.05, 1], [0.3, 1], [0.4, 0], [0.55, 0]]) ]));
  out.push(clip('hitBig', 0.8, [
    Pw('rig', [[0, Z3], [0.1, [0, 0.08, -0.3 * (1 - 0.3 * H)]], [0.35, [0, -0.04, -0.18]], [0.8, Z3]]), R('rig', [[0, Z3], [0.1, [-0.32, 0.25, 0.14]], [0.4, [0.06, 0.05, 0]], [0.8, Z3]]),
    S('body', [[0, O3], [0.1, [0.9, 1.1, 0.9]], [0.35, [1.1, 0.9, 1.1]], [0.8, O3]]),
    R('neck', [[0, Z3], [0.1, [0, 0.25, 0.55]], [0.5, [0, 0, 0.1]], [0.8, Z3]]), R('jaw', [[0, Z3], [0.1, [0, 0, -0.5]], [0.5, Z3], [0.8, Z3]]),
    wings([[0, Z3], [0.1, [0.6, 0.2, 0]], [0.3, [-0.2, 0, 0]], [0.55, [0.15, 0, 0]], [0.8, Z3]]), tipsW([[0, Z3], [0.16, [0.3, 0.3, 0]], [0.8, Z3]]),
    legsB([[0, Z3], [0.1, [0, 0, 0.35]], [0.4, [0, 0, 0.2]], [0.8, Z3]]), tailChain(0.8, 16, (t, i) => [0, 0.6 * bump(t, 0.05 + i * 0.05, 0.55 + i * 0.04), 0.2 * bump(t, 0.05, 0.4)]),
    lids([[0, 0], [0.05, 1], [0.5, 1], [0.62, 0], [0.8, 0]]) ]));
  // heal: wings fold around it as it breathes in the warmth; guard: wings swing forward as a shield, head tucked
  out.push(clip('heal', 0.9, [ S('body', [[0, O3], [0.35, [1.06, 1.1, 1.06]], [0.9, O3]]), Pw('rig', [[0, Z3], [0.35, [0, 0.05, 0]], [0.9, Z3]]),
    wings([[0, Z3], [0.35, [0.2, -0.45, 0]], [0.9, Z3]]), tipsW([[0, Z3], [0.4, [0, -0.4, 0]], [0.9, Z3]]), R('neck', [[0, Z3], [0.35, [0, 0, 0.3]], [0.9, Z3]]), lids([[0, 0], [0.25, 0.8], [0.6, 0.8], [0.9, 0]]) ]));
  out.push(clip('guard', 0.7, [ S('body', [[0, O3], [0.2, [1.06, 0.9, 1.06]], [0.7, O3]]), Pw('rig', [[0, Z3], [0.2, [0, -0.03, -0.04]], [0.7, Z3]]),
    wings([[0, Z3], [0.18, [0.15, -0.75, 0]], [0.5, [0.15, -0.72, 0]], [0.7, Z3]]), tipsW([[0, Z3], [0.22, [0.2, -0.6, 0]], [0.5, [0.2, -0.58, 0]], [0.7, Z3]]),
    R('neck', [[0, Z3], [0.2, [0, 0, -0.35]], [0.7, Z3]]), lids([[0, 0], [0.15, 0.6], [0.5, 0.6], [0.7, 0]]) ]));
  // victory: rears and roars (jaw wide), two full wingbeats, the tail lashing; defeat: wings go slack, the neck sinks
  // and it topples onto its side
  out.push(clip('victory', 1.6, [
    Pw('rig', F(1.6, 48, (t) => [0, 0.16 * amp * bump(t, 0.1, 1.4) + 0.04 * sin(t * 12.5) * bump(t, 0.25, 1.3), 0])), R('rig', F(1.6, 48, (t) => [-0.3 * bump(t, 0.05, 1.45), 0, 0])),
    R('neck', F(1.6, 48, (t) => [0, 0.2 * sin(t * 4) * bump(t, 0.3, 1.4), 0.5 * bump(t, 0.1, 1.4)])), R('head', F(1.6, 48, (t) => [0, 0, 0.35 * bump(t, 0.2, 1.35)])),
    R('jaw', F(1.6, 48, (t) => [0, 0, -0.85 * bump(t, 0.35, 1.25)])),
    wings(F(1.6, 64, (t) => [beat(t / 0.62) * bump(t, 0.02, 1.5) * 1.1 + 0.2 * bump(t, 0, 1.55), 0.15 * bump(t, 0, 1.55), 0])),
    tipsW(F(1.6, 64, (t) => [beat((t - 0.06) / 0.62) * bump(t, 0.02, 1.5) * 0.8, 0.25 * bump(t, 0, 1.55), 0])),
    legsF(F(1.6, 32, (t) => [0, 0, 0.5 * bump(t, 0.05, 1.45)])), tailChain(1.6, 48, (t, i) => [0, 0.45 * sin(t * 8 - i * 1.0) * bump(t, 0, 1.55), -0.15 * bump(t, 0.1, 1.4)]),
    lids([[0, 0], [0.3, 0.5], [1.3, 0.5], [1.6, 0]]) ]));
  out.push(clip('defeat', 1.2, [
    R('rig', [[0, Z3], [0.3, [0.05, 0, -0.08]], [0.7, [0.1, 0, 0.5]], [1.0, [0.12, 0, 0.95]], [1.2, [0.12, 0, 0.9]]]), Pw('rig', [[0, Z3], [0.7, [0, -0.04, 0]], [1.0, [0, -0.1, 0]], [1.2, [0, -0.1, 0]]]),
    R('neck', [[0, Z3], [0.6, [0, 0, -0.4]], [1.2, [0, 0, -0.55]]]), R('head', [[0, Z3], [1.2, [0, 0, -0.3]]]), R('jaw', [[0, Z3], [0.4, [0, 0, -0.3]], [1.2, [0, 0, -0.2]]]),
    wings([[0, Z3], [0.4, [-0.3, 0, 0]], [1.2, [-0.55, 0, 0]]]), tipsW([[0, Z3], [0.5, [-0.4, -0.3, 0]], [1.2, [-0.6, -0.4, 0]]]),
    tailChain(1.2, 12, (t, i) => [0, 0, -0.2 * ease(t / 1.2) * (i + 1) * 0.5]), lids([[0, 0], [0.6, 0.5], [1.0, 1], [1.2, 1]]) ]));
  // move: a four-beat walk (diagonal pairs), the body rising over each step, the tail swaying in a chain
  { const M = +(0.8 * (1 + 0.15 * H)).toFixed(2), ph = (t) => (t / M) * TAU, sw = 0.38 * amp;
    out.push(clip('move', M, [
      legsF(F(M, 24, (t) => [0, 0, sw * sin(ph(t))]), F(M, 24, (t) => [0, 0, sw * sin(ph(t) + PI)])), legsB(F(M, 24, (t) => [0, 0, sw * sin(ph(t) + PI)]), F(M, 24, (t) => [0, 0, sw * sin(ph(t))])),
      Pw('rig', F(M, 24, (t) => [0.01 * sin(ph(t)), 0.025 * Math.abs(sin(ph(t))) * (1 - 0.3 * H), 0])), R('rig', F(M, 24, (t) => [0, 0.03 * sin(ph(t)), 0.03 * sin(ph(t))])),
      R('neck', F(M, 24, (t) => [0, -0.06 * sin(ph(t)), 0.06 * sin(ph(t) * 2)])), wings(F(M, 24, (t) => [0.06 * sin(ph(t) * 2), 0, 0])),
      tailChain(M, 24, (t, i) => [0, 0.25 * sin(ph(t) - i * 0.9), 0]) ])); }
  return out;
}

/* ================================================================= ATEM */
function atemClips(root, spId) {
  const st = stageOf(spId), k = kit(root), { R, S, clip, has } = k, Pw = (n, keys) => k.P(n, keys, true);
  const blades = st === 3 ? 2 : st === 2 ? 1 : 0, sc = [0.95, 1, 1.05][st - 1];
  const SV = 0.07;   // a servo move takes 70 ms
  const arms = (l, r) => [R('armL', l), R('armR', r || l)], fores = (l, r) => [R('foreL', l), R('foreR', r || l)];
  const legs = (l, r) => [R('legL', l), R('legR', r || l)], shins = (l, r) => [R('shinL', l), R('shinR', r || l)];
  // the striking arm: the blade arm (right on Atem-02), else the right
  const out = [];
  // idle: dead still apart from a faint power hum; the head scans in fixed steps, settling at each; the ring turns in
  // ticks; once per cycle the blade arm rises half way, checks, and returns
  { const D = +(5.6 * sc).toFixed(2), N = Math.ceil(D / 0.02), hum = (t) => 0.004 * sin((t / D) * TAU * Math.round(D * 9));
    out.push(clip('idle', D, [
      S('body', F(D, N, (t) => [1, 1 + 0.004 * sin((t / D) * TAU * 3), 1])),
      Pw('rig', F(D, Math.ceil(D / 0.1), (t) => [0, 0.004 * sin((t / D) * TAU * 3), 0])),
      R('head', servo([[0, Z3], [D * 0.12, [0, 0.38, 0]], [D * 0.3, [0, 0.38, 0]], [D * 0.36, [0, 0, 0]], [D * 0.48, [0, -0.38, 0.05]], [D * 0.64, [0, -0.38, 0.05]], [D * 0.72, Z3], [D, Z3]], SV * 1.4)),
      R('torso', servo([[0, Z3], [D * 0.14, [0, 0.08, 0]], [D * 0.34, [0, 0.08, 0]], [D * 0.42, [0, -0.08, 0]], [D * 0.66, [0, -0.08, 0]], [D * 0.74, Z3], [D, Z3]], SV * 2)),
      R('ring', servo([[0, Z3], [D * 0.2, [0.3, 0, 0]], [D * 0.45, [0.6, 0, 0]], [D * 0.7, [0.3, 0, 0]], [D * 0.95, Z3], [D, Z3]], SV)),
      fores(F(D, 20, () => Z3), servo([[0, Z3], [D * 0.78, Z3], [D * 0.8, [0, 0, 0.75]], [D * 0.9, [0, 0, 0.75]], [D * 0.93, Z3], [D, Z3]], SV * 1.5)),
      arms(F(D, 20, () => Z3), servo([[0, Z3], [D * 0.78, Z3], [D * 0.8, [0, 0, 0.3]], [D * 0.9, [0, 0, 0.3]], [D * 0.93, Z3], [D, Z3]], SV * 1.5)),
      R('core', F(D, N, (t) => [hum(t), 0, 0])) ])); }
  // ready: weapons up — feet set apart in one step, blade arm raised, the ring locks
  out.push(clip('ready', 0.75, [
    arms(servo([[0, Z3], [0.12, [0, 0, 0.35]], [0.55, [0, 0, 0.35]], [0.75, Z3]], SV), servo([[0, Z3], [0.12, [0, 0, 0.45]], [0.55, [0, 0, 0.45]], [0.75, Z3]], SV)),
    fores(servo([[0, Z3], [0.16, [0, 0, 0.5]], [0.55, [0, 0, 0.5]], [0.75, Z3]], SV), servo([[0, Z3], [0.16, [0, 0, 0.7]], [0.55, [0, 0, 0.7]], [0.75, Z3]], SV)),
    legs(servo([[0, Z3], [0.12, [-0.08, 0, 0.12]], [0.55, [-0.08, 0, 0.12]], [0.75, Z3]], SV), servo([[0, Z3], [0.12, [0.08, 0, -0.12]], [0.55, [0.08, 0, -0.12]], [0.75, Z3]], SV)),
    R('ring', servo([[0, Z3], [0.2, [0.4, 0, 0]], [0.75, Z3]], SV)), Pw('rig', [[0, Z3], [0.12, [0, -0.02, 0]], [0.55, [0, -0.02, 0]], [0.75, Z3]]) ]));
  // attack (slash or punch): the torso winds back and holds; then one step forward and the cut (contact 0.34), ending
  // in a held pose with the blade low; it resets in two clean moves
  { const cut = blades ? [0, 0, -0.6] : [0, 0, 1.1], up = blades ? [0, 0, 1.6] : [0, 0, 0.3], fUp = blades ? [0, 0, 0.9] : [0, 0, 1.4], fCut = blades ? [0, 0, 0.2] : [0, 0, 0];
    out.push(clip('attack', 0.9, [
      Pw('rig', [[0, Z3], [0.2, [0, 0, -0.05]], [0.26, [0, 0, -0.05]], [0.34, [0, -0.02, 0.4]], [0.52, [0, -0.02, 0.36]], [0.66, [0, 0, 0.18]], [0.9, Z3]]),
      R('rig', servo([[0, Z3], [0.18, [-0.06, 0, 0]], [0.34, [0.1, 0, 0]], [0.52, [0.1, 0, 0]], [0.68, [0.04, 0, 0]], [0.9, Z3]], SV)),
      R('torso', servo([[0, Z3], [0.18, [0, 0.5, 0]], [0.26, [0, 0.5, 0]], [0.34, [0, -0.35, 0.1]], [0.52, [0, -0.35, 0.1]], [0.68, [0, -0.1, 0]], [0.9, Z3]], SV)),
      R('armR', servo([[0, Z3], [0.18, up], [0.26, up], [0.34, cut], [0.52, cut], [0.68, [0, 0, 0.1]], [0.9, Z3]], SV)),
      R('foreR', servo([[0, Z3], [0.18, fUp], [0.26, fUp], [0.34, fCut], [0.52, fCut], [0.68, Z3], [0.9, Z3]], SV)),
      R('armL', servo([[0, Z3], [0.18, [0, 0, -0.3]], [0.34, [0, 0, 0.25]], [0.52, [0, 0, 0.25]], [0.68, Z3], [0.9, Z3]], SV)),
      legs(servo([[0, Z3], [0.26, Z3], [0.32, [0, 0, 0.45]], [0.52, [0, 0, 0.45]], [0.68, [0, 0, 0.15]], [0.9, Z3]], SV), servo([[0, Z3], [0.26, Z3], [0.32, [0, 0, -0.3]], [0.52, [0, 0, -0.3]], [0.68, Z3], [0.9, Z3]], SV)),
      shins(servo([[0, Z3], [0.26, Z3], [0.32, [0, 0, -0.3]], [0.52, [0, 0, -0.3]], [0.68, Z3], [0.9, Z3]], SV), F(0.9, 9, () => Z3)),
      R('head', servo([[0, Z3], [0.18, [0, -0.3, 0]], [0.34, [0, 0.2, 0]], [0.52, [0, 0.2, 0]], [0.68, Z3], [0.9, Z3]], SV)),
      R('ring', servo([[0, Z3], [0.2, [0.5, 0, 0]], [0.36, [0.9, 0, 0]], [0.7, [0.4, 0, 0]], [0.9, Z3]], SV)) ])); }
  // special (cross): both arms cross in front and lock (the ring spins up), a beat of stillness, then they slash
  // outward together with a step in (contact 0.40); the X is held, then it resets
  out.push(clip('special', 1.1, [
    Pw('rig', [[0, Z3], [0.22, [0, 0.02, -0.06]], [0.32, [0, 0.02, -0.06]], [0.4, [0, -0.03, 0.34]], [0.62, [0, -0.03, 0.3]], [0.8, [0, 0, 0.12]], [1.1, Z3]]),
    R('rig', servo([[0, Z3], [0.22, [-0.08, 0, 0]], [0.32, [-0.08, 0, 0]], [0.4, [0.12, 0, 0]], [0.62, [0.12, 0, 0]], [0.82, Z3], [1.1, Z3]], SV)),
    arms(servo([[0, Z3], [0.2, [-0.45, 0, 1.2]], [0.32, [-0.45, 0, 1.2]], [0.4, [0.55, 0, 0.4]], [0.62, [0.55, 0, 0.4]], [0.82, [0, 0, 0.1]], [1.1, Z3]], SV),
      servo([[0, Z3], [0.2, [0.45, 0, 1.2]], [0.32, [0.45, 0, 1.2]], [0.4, [-0.55, 0, 0.4]], [0.62, [-0.55, 0, 0.4]], [0.82, [0, 0, 0.1]], [1.1, Z3]], SV)),
    fores(servo([[0, Z3], [0.2, [0, 0, 0.6]], [0.32, [0, 0, 0.6]], [0.4, [0, 0, 0.1]], [0.62, [0, 0, 0.1]], [0.82, Z3], [1.1, Z3]], SV)),
    R('torso', servo([[0, Z3], [0.2, [0, 0, -0.08]], [0.32, [0, 0, -0.08]], [0.4, [0, 0, 0.12]], [0.62, [0, 0, 0.12]], [0.82, Z3], [1.1, Z3]], SV)),
    legs(servo([[0, Z3], [0.32, Z3], [0.38, [0, 0, 0.35]], [0.62, [0, 0, 0.35]], [0.82, Z3], [1.1, Z3]], SV), servo([[0, Z3], [0.32, Z3], [0.38, [0, 0, -0.25]], [0.62, [0, 0, -0.25]], [0.82, Z3], [1.1, Z3]], SV)),
    R('ring', F(1.1, 44, (t) => [1.6 * bump(t, 0.05, 1.0), 0, 0])), R('head', servo([[0, Z3], [0.22, [0, 0, 0.12]], [0.4, [0, 0, -0.08]], [0.82, Z3], [1.1, Z3]], SV)) ]));
  // hit: the frame takes it rigidly — tilts back as one piece to a hard stop, shudders, then servos back
  const shud = (t, a, b, A) => (t > a && t < b ? A * sin((t - a) * 90) * (1 - (t - a) / (b - a)) : 0);
  out.push(clip('hit', 0.55, [
    Pw('rig', F(0.55, 33, (t) => [shud(t, 0.08, 0.3, 0.012), 0, -0.1 * (t < 0.06 ? t / 0.06 : t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) / 0.12))])),
    R('rig', servo([[0, Z3], [0.06, [-0.16, 0, 0.05]], [0.3, [-0.16, 0, 0.05]], [0.42, Z3], [0.55, Z3]], 0.05, 0.15)),
    R('head', servo([[0, Z3], [0.06, [0, 0.2, 0.2]], [0.3, [0, 0.2, 0.2]], [0.42, Z3], [0.55, Z3]], 0.05, 0.2)),
    arms(servo([[0, Z3], [0.06, [0, 0, -0.2]], [0.3, [0, 0, -0.2]], [0.42, Z3], [0.55, Z3]], 0.05, 0.15)) ]));
  out.push(clip('hitBig', 0.8, [
    Pw('rig', F(0.8, 40, (t) => [shud(t, 0.1, 0.4, 0.02), -0.04 * bump(t, 0.1, 0.6), -0.24 * (t < 0.1 ? t / 0.1 : t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.2))])),
    R('rig', servo([[0, Z3], [0.1, [-0.3, 0.25, 0.12]], [0.45, [-0.3, 0.25, 0.12]], [0.62, Z3], [0.8, Z3]], 0.06, 0.15)),
    legs(servo([[0, Z3], [0.12, [0, 0, -0.4]], [0.45, [0, 0, -0.4]], [0.62, Z3], [0.8, Z3]], SV), F(0.8, 8, () => Z3)), shins(servo([[0, Z3], [0.12, [0, 0, -0.5]], [0.45, [0, 0, -0.5]], [0.62, Z3], [0.8, Z3]], SV), F(0.8, 8, () => Z3)),
    R('head', servo([[0, Z3], [0.1, [0, 0.35, 0.3]], [0.45, [0, 0.35, 0.3]], [0.62, Z3], [0.8, Z3]], 0.05, 0.2)),
    arms(servo([[0, Z3], [0.1, [0, 0, -0.4]], [0.45, [0, 0, -0.4]], [0.62, Z3], [0.8, Z3]], SV)) ]));
  // heal: recalibrates — the ring turns a full step, the frame rises one notch and the arms lock at its sides
  out.push(clip('heal', 0.9, [ R('ring', servo([[0, Z3], [0.2, [0.6, 0, 0]], [0.45, [1.2, 0, 0]], [0.7, [0.6, 0, 0]], [0.9, Z3]], SV)), Pw('rig', servo([[0, Z3], [0.2, [0, 0.03, 0]], [0.65, [0, 0.03, 0]], [0.9, Z3]], SV)),
    R('head', servo([[0, Z3], [0.2, [0, 0, 0.15]], [0.65, [0, 0, 0.15]], [0.9, Z3]], SV)) ]));
  // guard: forearms cross in front as a shield and the knees bend; held
  out.push(clip('guard', 0.7, [ arms(servo([[0, Z3], [0.12, [-0.45, 0, 0.9]], [0.5, [-0.45, 0, 0.9]], [0.7, Z3]], SV), servo([[0, Z3], [0.12, [0.45, 0, 0.9]], [0.5, [0.45, 0, 0.9]], [0.7, Z3]], SV)),
    fores(servo([[0, Z3], [0.14, [0, 0, 1.0]], [0.5, [0, 0, 1.0]], [0.7, Z3]], SV)), legs(servo([[0, Z3], [0.12, [0, 0, 0.3]], [0.5, [0, 0, 0.3]], [0.7, Z3]], SV)), shins(servo([[0, Z3], [0.12, [0, 0, -0.45]], [0.5, [0, 0, -0.45]], [0.7, Z3]], SV)),
    Pw('rig', servo([[0, Z3], [0.12, [0, -0.05, 0]], [0.5, [0, -0.05, 0]], [0.7, Z3]], SV)) ]));
  // victory: a crisp salute (the right hand to the visor, held), the ring turning in ticks, a blade flick to finish
  out.push(clip('victory', 1.6, [
    R('armR', servo([[0, Z3], [0.18, [0, 0, 1.0]], [1.2, [0, 0, 1.0]], [1.32, [0, 0, 0.3]], [1.6, Z3]], SV)),
    R('foreR', servo([[0, Z3], [0.22, [0, 0, 1.9]], [1.2, [0, 0, 1.9]], [1.32, [0, 0, 0.4]], [1.45, [0, 0, 0.6]], [1.6, Z3]], SV)),
    R('ring', servo([[0, Z3], [0.4, [0.4, 0, 0]], [0.7, [0.8, 0, 0]], [1.0, [1.2, 0, 0]], [1.3, [0.6, 0, 0]], [1.6, Z3]], SV)),
    R('head', servo([[0, Z3], [0.2, [0, 0, 0.12]], [1.2, [0, 0, 0.12]], [1.4, Z3], [1.6, Z3]], SV)),
    Pw('rig', servo([[0, Z3], [0.16, [0, 0.02, 0]], [1.2, [0, 0.02, 0]], [1.4, Z3], [1.6, Z3]], SV)) ]));
  // defeat: powers down in steps — the ring stops and drops, the head bows, the arms fall, it kneels
  out.push(clip('defeat', 1.2, [
    R('head', servo([[0, Z3], [0.25, [0, 0, -0.25]], [0.6, [0, 0, -0.25]], [0.75, [0, 0, -0.5]], [1.2, [0, 0, -0.5]]], 0.08, 0.05)),
    arms(servo([[0, Z3], [0.4, [0, 0, -0.1]], [0.75, [0, 0, -0.1]], [0.9, [0, 0, -0.25]], [1.2, [0, 0, -0.25]]], 0.08, 0.05)),
    legs(servo([[0, Z3], [0.5, Z3], [0.75, [0, 0, 0.9]], [1.2, [0, 0, 0.9]]], 0.12, 0.05)), shins(servo([[0, Z3], [0.5, Z3], [0.75, [0, 0, -1.4]], [1.2, [0, 0, -1.4]]], 0.12, 0.05)),
    Pw('rig', servo([[0, Z3], [0.5, Z3], [0.78, [0, -0.11, -0.03]], [1.2, [0, -0.11, -0.03]]], 0.12, 0.05)),
    R('torso', servo([[0, Z3], [0.75, Z3], [0.9, [0, 0, -0.3]], [1.2, [0, 0, -0.3]]], 0.1, 0.05)),
    R('ring', servo([[0, Z3], [0.2, [0, 0, -0.2]], [1.2, [0, 0, -0.2]]], 0.1, 0.05)) ]));
  // move: measured marching steps — each leg lifts (knee bends), plants and holds; the torso stays level
  { const M = 0.9;
    out.push(clip('move', M, [
      legs(servo([[0, Z3], [0.12, [0, 0, 0.45]], [0.3, [0, 0, 0.3]], [0.45, [0, 0, -0.2]], [0.75, [0, 0, -0.2]], [0.9, Z3]], SV * 1.5), servo([[0, Z3], [0.45, [0, 0, -0.2]], [0.57, [0, 0, 0.45]], [0.75, [0, 0, 0.3]], [0.9, Z3]], SV * 1.5)),
      shins(servo([[0, Z3], [0.12, [0, 0, -0.6]], [0.3, Z3], [0.9, Z3]], SV * 1.5), servo([[0, Z3], [0.45, Z3], [0.57, [0, 0, -0.6]], [0.75, Z3], [0.9, Z3]], SV * 1.5)),
      arms(servo([[0, Z3], [0.12, [0, 0, -0.15]], [0.45, [0, 0, 0.15]], [0.57, [0, 0, 0.15]], [0.9, Z3]], SV * 1.5), servo([[0, Z3], [0.12, [0, 0, 0.15]], [0.45, [0, 0, -0.15]], [0.57, [0, 0, -0.15]], [0.9, Z3]], SV * 1.5)),
      Pw('rig', servo([[0, Z3], [0.12, [0, 0.015, 0]], [0.3, Z3], [0.57, [0, 0.015, 0]], [0.75, Z3], [0.9, Z3]], SV)) ])); }
  // Phase 15C, Atem III only: 'special9', the stance for the nine floating swords (Overclock). Preparation: a wide,
  // lowered stance, arms out as the ring spins up; summoning and formation: arms rise and hold while the blades
  // assemble and circle; targeting: the right arm points at the foe and locks while the blades launch; recovery: a
  // measured servo return to rest. 1.6 s; the battle waits for it only on this move (see combat15c.js).
  if (st === 3) out.push(clip('special9', 1.6, [
    Pw('rig', servo([[0, Z3], [0.16, [0, -0.04, -0.04]], [0.62, [0, -0.02, -0.04]], [0.78, [0, -0.04, 0.06]], [1.12, [0, -0.04, 0.06]], [1.4, Z3], [1.6, Z3]], SV)),
    legs(servo([[0, Z3], [0.16, [0.18, 0, 0.3]], [1.12, [0.18, 0, 0.3]], [1.4, Z3], [1.6, Z3]], SV), servo([[0, Z3], [0.16, [-0.18, 0, -0.22]], [1.12, [-0.18, 0, -0.22]], [1.4, Z3], [1.6, Z3]], SV)),
    arms(servo([[0, Z3], [0.16, [0.55, 0, 0.35]], [0.46, [0.9, 0, 1.1]], [0.66, [0.9, 0, 1.15]], [0.78, [0.35, 0, 0.3]], [1.12, [0.35, 0, 0.3]], [1.4, Z3], [1.6, Z3]], SV),
      servo([[0, Z3], [0.16, [-0.55, 0, 0.35]], [0.46, [-0.9, 0, 1.1]], [0.66, [-0.9, 0, 1.15]], [0.78, [0.05, 0, 1.5]], [1.12, [0.05, 0, 1.5]], [1.4, Z3], [1.6, Z3]], SV)),
    fores(servo([[0, Z3], [0.16, [0, 0, 0.4]], [0.66, [0, 0, 0.25]], [0.78, [0, 0, 0.5]], [1.12, [0, 0, 0.5]], [1.4, Z3], [1.6, Z3]], SV),
      servo([[0, Z3], [0.16, [0, 0, 0.4]], [0.66, [0, 0, 0.25]], [0.78, Z3], [1.12, Z3], [1.4, Z3], [1.6, Z3]], SV)),
    R('torso', servo([[0, Z3], [0.16, [0, 0, -0.06]], [0.66, [0, 0, -0.1]], [0.78, [0, 0, 0.1]], [1.12, [0, 0, 0.1]], [1.4, Z3], [1.6, Z3]], SV)),
    R('head', servo([[0, Z3], [0.16, [0, 0, 0.08]], [0.66, [0, 0, 0.12]], [0.78, [0, 0, -0.04]], [1.12, [0, 0, -0.04]], [1.4, Z3], [1.6, Z3]], SV)),
    R('ring', F(1.6, 64, (t) => [2.2 * bump(t, 0.05, 1.45), 0, 0])) ]));
  return out;
}


/* ================================================================= META (peace: communicative, curious, kind)
   Smooth and composed, never servo-stiff like Atem: her limbs ease into place, while the wired hair moves as four locks
   whose tips lag behind the roots, so the cables flow. Idle: a curious head tilt and a small wave hello. Attack: the hair
   lashes forward (her lore: the hair is her weapon). Special: arms rise, the cables spread and lift, the ring turns, then
   she sends it all forward. */
function metaClips(root, spId) {
  const st = stageOf(spId), k = kit(root), { R, S, clip } = k, Pw = (n, keys) => k.P(n, keys, true);
  const amp = [1.1, 1, 0.9][st - 1];
  // hair: keys written for the left locks (+z swings the cables forward, -x spreads them outward); the right mirrors
  const hair = (f, ft) => ['F', 'B'].flatMap((fb, i) => [R('hairL' + fb, f(i)), R('hairR' + fb, f(i), true), R('hairL' + fb + 'T', ft(i)), R('hairR' + fb + 'T', ft(i), true)]);
  const arms = (l, r) => [R('armL', l), R('armR', r || l)], fores = (l, r) => [R('foreL', l), R('foreR', r || l)];
  const legs = (l, r) => [R('legL', l), R('legR', r || l)], shins = (l, r) => [R('shinL', l), R('shinR', r || l)];
  const out = [];
  { const D = +(5.0 * [1, 1.08, 1.16][st - 1]).toFixed(2), N = Math.ceil(D / 0.033), ph = (t) => (t / D) * TAU, tilt = (t) => bump(t, D * 0.22, D * 0.42), wave = (t) => bump(t, D * 0.58, D * 0.86);
    out.push(clip('idle', D, [
      S('body', F(D, N, (t) => { const b = 0.018 * sin(ph(t) * 2); return [1 + b, 1 + b * 0.6, 1 + b]; })),
      Pw('rig', F(D, N, (t) => [0, 0.01 * sin(ph(t) * 2), 0])), R('torso', F(D, N, (t) => [0, 0.06 * sin(ph(t)), 0.03 * sin(ph(t) * 2)])),
      R('head', F(D, N, (t) => [0.22 * tilt(t), 0.1 * sin(ph(t) + 0.5), 0.05 * tilt(t)])),
      R('ring', F(D, N, (t) => [0.3 * sin(ph(t)), 0, 0])),
      R('armR', F(D, N, (t) => [-0.35 * wave(t), 0, 1.7 * wave(t)])), R('foreR', F(D, N, (t) => [0.35 * sin((t - D * 0.6) * 14) * wave(t), 0, 0.9 * wave(t)])),
      R('armL', F(D, N, (t) => [0, 0, 0.05 * sin(ph(t) + 1)])),
      hair((i) => F(D, N, (t) => [-0.05 - 0.05 * sin(ph(t) * 2 + i), 0.04 * sin(ph(t) + i), 0.1 * sin(ph(t) * 2 + i * 1.3)]), (i) => F(D, N, (t) => [-0.1 * sin(ph(t) * 2 + i - 0.9), 0, 0.2 * sin(ph(t) * 2 + i * 1.3 - 0.9)])) ])); }
  out.push(clip('ready', 0.75, [ Pw('rig', [[0, Z3], [0.3, [0, 0.03, 0]], [0.75, Z3]]), arms([[0, Z3], [0.3, [-0.25, 0, 0.35]], [0.75, Z3]], [[0, Z3], [0.3, [0.25, 0, 0.35]], [0.75, Z3]]),
    R('ring', [[0, Z3], [0.4, [0.6, 0, 0]], [0.75, Z3]]), hair(() => [[0, Z3], [0.3, [-0.2, 0, -0.25]], [0.75, Z3]], () => [[0, Z3], [0.4, [-0.25, 0, -0.35]], [0.75, Z3]]) ]));
  // attack: the cables draw back, then lash forward together (contact 0.34); the tips crack a beat later
  out.push(clip('attack', 0.9, [
    Pw('rig', [[0, Z3], [0.18, [0, 0, -0.06]], [0.34, [0, 0.02, 0.26 * amp]], [0.55, [0, 0, 0.12]], [0.9, Z3]]),
    R('rig', [[0, Z3], [0.18, [-0.1, 0, 0]], [0.34, [0.12, 0, 0]], [0.9, Z3]]), R('torso', [[0, Z3], [0.18, [0, 0.25, 0]], [0.34, [0, -0.2, 0]], [0.6, Z3], [0.9, Z3]]),
    R('armR', [[0, Z3], [0.18, [0, 0, -0.3]], [0.34, [0, 0, 1.3]], [0.55, [0, 0, 1.0]], [0.9, Z3]]), R('foreR', [[0, Z3], [0.34, [0, 0, 0.2]], [0.9, Z3]]),
    hair((i) => [[0, Z3], [0.18, [-0.15, 0, -0.7]], [0.32, [0.1, 0, 1.1 - i * 0.2]], [0.5, [0, 0, 0.6]], [0.9, Z3]], (i) => [[0, Z3], [0.2, [0, 0, -0.6]], [0.38, [0, 0, 0.9 - i * 0.2]], [0.55, [0, 0, -0.2]], [0.9, Z3]]),
    R('head', [[0, Z3], [0.18, [0, 0, 0.12]], [0.34, [0, 0, -0.12]], [0.9, Z3]]) ]));
  // special: arms rise, cables spread wide and lift, the ring spins; then everything is sent forward (contact 0.40)
  out.push(clip('special', 1.1, [
    Pw('rig', [[0, Z3], [0.28, [0, 0.14 * amp, -0.05]], [0.4, [0, 0.1, 0.22 * amp]], [0.72, [0, 0.04, 0.08]], [1.1, Z3]]), R('rig', [[0, Z3], [0.28, [-0.15, 0, 0]], [0.4, [0.1, 0, 0]], [1.1, Z3]]),
    arms([[0, Z3], [0.28, [-0.9, 0, 0.8]], [0.4, [-0.3, 0, 1.3]], [0.75, [-0.2, 0, 0.6]], [1.1, Z3]], [[0, Z3], [0.28, [0.9, 0, 0.8]], [0.4, [0.3, 0, 1.3]], [0.75, [0.2, 0, 0.6]], [1.1, Z3]]),
    fores([[0, Z3], [0.28, [0, 0, 0.5]], [0.4, [0, 0, 0.1]], [1.1, Z3]]), R('ring', F(1.1, 33, (t) => [1.4 * bump(t, 0.05, 1.0), 0, 0])),
    hair((i) => [[0, Z3], [0.28, [-0.7 + i * 0.15, 0, -0.3]], [0.42, [-0.2, 0, 1.0]], [0.75, [-0.1, 0, 0.3]], [1.1, Z3]], (i) => [[0, Z3], [0.3, [-0.5, 0, -0.4]], [0.46, [0, 0, 0.8]], [0.8, [0, 0, 0.1]], [1.1, Z3]]),
    R('head', [[0, Z3], [0.28, [0, 0, 0.25]], [0.42, [0, 0, -0.1]], [1.1, Z3]]) ]));
  out.push(clip('hit', 0.55, [ Pw('rig', [[0, Z3], [0.08, [0, 0.02, -0.13]], [0.55, Z3]]), R('rig', [[0, Z3], [0.08, [-0.18, 0, 0.06]], [0.55, Z3]]), R('head', [[0, Z3], [0.08, [0, 0.15, 0.2]], [0.55, Z3]]),
    arms([[0, Z3], [0.08, [0, 0, -0.25]], [0.55, Z3]]), hair(() => [[0, Z3], [0.1, [0, 0, 0.5]], [0.3, [0, 0, -0.15]], [0.55, Z3]], () => [[0, Z3], [0.14, [0, 0, 0.7]], [0.34, [0, 0, -0.2]], [0.55, Z3]]) ]));
  out.push(clip('hitBig', 0.8, [ Pw('rig', [[0, Z3], [0.1, [0, 0.06, -0.28]], [0.4, [0, 0, -0.12]], [0.8, Z3]]), R('rig', [[0, Z3], [0.1, [-0.35, 0.3, 0.12]], [0.4, [-0.05, 0.05, 0]], [0.8, Z3]]),
    arms([[0, Z3], [0.1, [-0.4, 0, -0.3]], [0.5, Z3], [0.8, Z3]], [[0, Z3], [0.1, [0.4, 0, -0.3]], [0.5, Z3], [0.8, Z3]]), hair(() => [[0, Z3], [0.12, [-0.3, 0, 0.8]], [0.4, [0, 0, -0.2]], [0.8, Z3]], () => [[0, Z3], [0.16, [-0.3, 0, 0.9]], [0.45, [0, 0, -0.3]], [0.8, Z3]]) ]));
  out.push(clip('heal', 0.9, [ Pw('rig', [[0, Z3], [0.35, [0, 0.05, 0]], [0.9, Z3]]), arms([[0, Z3], [0.35, [-0.6, 0, 0.3]], [0.9, Z3]], [[0, Z3], [0.35, [0.6, 0, 0.3]], [0.9, Z3]]), R('head', [[0, Z3], [0.35, [0, 0, 0.25]], [0.9, Z3]]),
    hair(() => [[0, Z3], [0.35, [-0.35, 0, -0.2]], [0.9, Z3]], () => [[0, Z3], [0.42, [-0.3, 0, -0.3]], [0.9, Z3]]), R('ring', [[0, Z3], [0.5, [0.8, 0, 0]], [0.9, Z3]]) ]));
  out.push(clip('guard', 0.7, [ arms([[0, Z3], [0.18, [0.35, 0, 1.0]], [0.5, [0.35, 0, 1.0]], [0.7, Z3]], [[0, Z3], [0.18, [-0.35, 0, 1.0]], [0.5, [-0.35, 0, 1.0]], [0.7, Z3]]), fores([[0, Z3], [0.2, [0, 0, 0.8]], [0.5, [0, 0, 0.8]], [0.7, Z3]]),
    hair(() => [[0, Z3], [0.2, [0.3, 0, 0.9]], [0.5, [0.3, 0, 0.9]], [0.7, Z3]], () => [[0, Z3], [0.24, [0.3, 0, 0.6]], [0.5, [0.3, 0, 0.6]], [0.7, Z3]]), Pw('rig', [[0, Z3], [0.2, [0, -0.02, -0.03]], [0.7, Z3]]) ]));
  out.push(clip('victory', 1.6, [ R('armR', F(1.6, 48, (t) => [-0.4 * bump(t, 0.05, 1.5), 0, 2.0 * bump(t, 0.05, 1.5)])), R('foreR', F(1.6, 48, (t) => [0.4 * sin(t * 12) * bump(t, 0.2, 1.4), 0, 0.8 * bump(t, 0.05, 1.5)])),
    Pw('rig', F(1.6, 32, (t) => [0, 0.05 * bump(t, 0.1, 1.5), 0])), R('ring', F(1.6, 32, (t) => [1.2 * bump(t, 0.1, 1.5), 0, 0])), R('head', F(1.6, 32, (t) => [0.15 * bump(t, 0.2, 1.3), 0, 0.15 * bump(t, 0.1, 1.5)])),
    hair((i) => F(1.6, 32, (t) => [-0.3 * bump(t, 0.1, 1.5), 0, 0.2 * sin(t * 6 + i) * bump(t, 0.1, 1.5)]), (i) => F(1.6, 32, (t) => [-0.2 * bump(t, 0.1, 1.5), 0, 0.3 * sin(t * 6 + i - 0.9) * bump(t, 0.1, 1.5)])) ]));
  out.push(clip('defeat', 1.2, [ legs([[0, Z3], [0.5, Z3], [0.85, [0, 0, 0.9]], [1.2, [0, 0, 0.9]]]), shins([[0, Z3], [0.5, Z3], [0.85, [0, 0, -1.4]], [1.2, [0, 0, -1.4]]]),
    Pw('rig', [[0, Z3], [0.5, Z3], [0.85, [0, -0.11, -0.03]], [1.2, [0, -0.11, -0.03]]]), R('head', [[0, Z3], [0.6, [0, 0, -0.3]], [1.2, [0, 0, -0.45]]]), R('torso', [[0, Z3], [0.8, [0, 0, -0.2]], [1.2, [0, 0, -0.25]]]),
    arms([[0, Z3], [1.2, [0, 0, -0.15]]]), hair(() => [[0, Z3], [1.2, [0.15, 0, 0.3]]], () => [[0, Z3], [1.2, [0.1, 0, 0.4]]]), R('ring', [[0, Z3], [1.2, [0, 0, -0.25]]]) ]));
  { const M = 0.9, ph = (t) => (t / M) * TAU;
    out.push(clip('move', M, [ legs(F(M, 24, (t) => [0, 0, 0.32 * sin(ph(t))]), F(M, 24, (t) => [0, 0, -0.32 * sin(ph(t))])), shins(F(M, 24, (t) => [0, 0, -0.3 * Math.max(0, sin(ph(t) + 1))]), F(M, 24, (t) => [0, 0, -0.3 * Math.max(0, sin(ph(t) + 1 + PI))])),
      arms(F(M, 24, (t) => [0, 0, -0.18 * sin(ph(t))]), F(M, 24, (t) => [0, 0, 0.18 * sin(ph(t))])), Pw('rig', F(M, 24, (t) => [0, 0.015 * Math.abs(sin(ph(t))), 0])),
      hair(() => F(M, 24, (t) => [0, 0, -0.25 - 0.06 * sin(ph(t) * 2)]), () => F(M, 24, (t) => [0, 0, -0.3 - 0.1 * sin(ph(t) * 2 - 0.8)])) ])); }
  return out;
}

/* ================================================================= registration */
const LINE_CLIPS = { lumifern: lumifernClips, igniflare: dragonClips, atem: atemClips, meta: metaClips };
Object.values(window.A.Data.SPECIES).forEach((sp) => { const fn = LINE_CLIPS[sp.line]; if (fn) PROTO_HOOKS[sp.id] = (root, profile, base) => (root.userData.parts ? fn(root, sp.id) : base); });
export const PROTO_IDS = Object.keys(PROTO_HOOKS);
const on = (api, who) => !!(window.A.Proto15 && window.A.Proto15.active(api.slot(who).spId));

/* ================================================================= move effects (combat polish)
   The twelve moves these lines use get a Phase 15 sequence when the attacker is a prototype: a visible build-up at
   the mouth, hand or blade before release (anticipation), a projectile or strike that matches the creature, and an
   impact with a ground mark. Timings are the same as the Phase 8B sequences: release from 0.28–0.40 s, the impact
   at about 0.44–0.48 s, nothing after 0.7 s. Same cube pool and budgets. */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), rnd = (q) => (Math.random() - 0.5) * q;
const N = (api, n) => Math.max(2, Math.round(n * api.fx.scale()));
const spot = (api, w) => api.slot(w).group.position.clone(), sz = (api, w) => api.slot(w).group.scale.x;
// anticipation: motes converge on a point from a sphere around it, then flash
function gather(api, at, cols, n, r, t0, t1) { if (api.calm && api.calm()) return; n = N(api, n);   // decoration only: none with Reduce Motion
  for (let i = 0; i < n; i++) api.at(t0 + (t1 - t0) * (i / n) * 0.6, () => { const d = V3(rnd(2), rnd(2), rnd(2)).normalize().multiplyScalar(r), p = at().add(d);
    api.fx.spawn(p, d.clone().multiplyScalar(-1 / Math.max(0.08, (t1 - t0) * 0.6)), { color: cols[i % cols.length], life: Math.max(0.08, (t1 - t0) * 0.6), size: 0.045, grav: 0, spin: 2 }); });
  api.at(t1, () => api.fx.glow(at(), cols[cols.length - 1], 0.9, 0.2)); }
// a ring of motes lying on the ground that spreads out (a ground mark under an impact)
function groundRing(api, c, r, cols, n, speed, life) { if (api.calm && api.calm()) return; n = N(api, n);
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, p = c.clone().add(V3(Math.cos(a) * r, 0.04, Math.sin(a) * r));
    api.fx.spawn(p, V3(Math.cos(a) * speed, 0.05, Math.sin(a) * speed), { color: cols[i % cols.length], life: life || 0.45, size: 0.05, grav: 0, spin: 1 }); } }
function line(api, a, b, cols, n, o) { o = o || {}; const d = b.clone().sub(a); n = N(api, n);
  for (let i = 0; i <= n; i++) api.fx.spawn(a.clone().addScaledVector(d, i / n).add(V3(rnd(o.j || 0.04), rnd(o.j || 0.04), rnd(o.j || 0.04))), V3(rnd(0.2), rnd(0.2) + (o.up || 0), rnd(0.2)), { color: cols[i % cols.length], life: (o.life || 0.2) + (i / n) * 0.06, size: o.size || 0.05, grav: o.grav || 0, spin: 2 }); }
const P15 = {
  /* Lumifern: leaves and sunlight */
  glowpulse(api, who) { const tgt = api.other(who), c = ['#c8f59a', '#fff1a8', '#ffffff'], m = () => api.from(who, 'mouth');
    gather(api, m, c, 10, 0.3, 0.08, 0.28);
    api.at(0.3, () => api.fx.projectile(m(), api.chest(tgt), 'light', { dur: 0.16, cols: ['#fff6c8', '#ffe27a', '#ffffff'] }));
    api.at(0.47, () => { api.fx.burst(api.chest(tgt), ['#ffffff', '#fff1a8', '#9fe36a'], 12, { speed: 1.4, life: 0.4, size: 0.05, grav: 0.6 }); groundRing(api, spot(api, tgt), 0.3 * sz(api, tgt), ['#fff1a8', '#c8f59a'], 12, 1.0, 0.4); }); },
  sunsprout(api, who) { const tgt = api.other(who), c = ['#9fe36a', '#ffe27a', '#ffffff'];
    gather(api, () => api.from(who, 'mouth'), c, 8, 0.25, 0.08, 0.26);
    api.at(0.28, () => { const a = api.from(who, 'mouth'), b = api.chest(tgt); const n = N(api, 12); for (let i = 0; i <= n; i++) { const t = i / n, p = a.clone().lerp(b, t); p.y += sin(t * PI) * 0.55; api.fx.spawn(p, V3(0, 0, 0), { color: c[i % 3], life: 0.18 + t * 0.12, size: 0.055, grav: 0, spin: 3 }); } });
    api.at(0.46, () => { const p = spot(api, tgt); for (let i = 0; i < N(api, 8); i++) { const a = (i / 8) * TAU; api.fx.spawn(p.clone().add(V3(Math.cos(a) * 0.2, 0.05, Math.sin(a) * 0.2)), V3(Math.cos(a) * 0.3, 1.6 + rnd(0.5), Math.sin(a) * 0.3), { color: i % 2 ? '#7fcf5a' : '#9fe36a', life: 0.45, size: 0.06, grav: 2.5, spin: 4 }); } api.fx.burst(api.chest(tgt), c, 8, { speed: 1.2, life: 0.4, size: 0.05, grav: 1 }); }); },
  radiantburst(api, who) { const tgt = api.other(who), c = ['#ffe27a', '#fff6c8', '#ffffff'];
    gather(api, () => api.chest(who), c, 14, 0.5, 0.05, 0.34);
    api.at(0.38, () => { api.fx.glow(api.from(who, 'mouth'), '#ffffff', 1.4, 0.25); line(api, api.from(who, 'mouth'), api.chest(tgt), c, 18, { life: 0.22 }); });
    api.at(0.47, () => { api.fx.burst(api.chest(tgt), ['#ffffff', '#ffe27a', '#9fe36a', '#fff6c8'], 22, { speed: 2, life: 0.55, size: 0.065, grav: 0.4 }); api.fx.shockwave(spot(api, tgt), '#ffe27a', 1.5); groundRing(api, spot(api, tgt), 0.35, c, 16, 1.4, 0.45); }); },
  solarflare(api, who) { const tgt = api.other(who), c = ['#ffd23f', '#fff3b0', '#ffffff'], top = spot(api, tgt).add(V3(0, 1.4 * api.slot(tgt).group.scale.y, 0));
    gather(api, () => api.head(who).add(V3(0, 0.25, 0)), c, 12, 0.45, 0.04, 0.24);
    api.at(0.18, () => { for (let i = 0; i < N(api, 16); i++) { const a = (i / 16) * TAU; api.fx.spawn(top.clone().add(V3(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4)), V3(-Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6), { color: c[i % 3], life: 0.4, size: 0.06, grav: 0, spin: 2 }); } });
    for (let i = 0; i < 5; i++) api.at(0.36 + i * 0.025, () => { const a = (i / 5) * TAU; line(api, top.clone().add(V3(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3)), api.chest(tgt), c, 8, { life: 0.16 }); });
    api.at(0.46, () => { api.fx.glow(api.chest(tgt), '#ffffff', 1.6, 0.2); api.fx.shockwave(spot(api, tgt), '#ffd23f', 1.8); groundRing(api, spot(api, tgt), 0.4, c, 18, 1.6, 0.5); }); },
  /* Igniflare: fire from the jaws, heavier with each stage */
  emberflick(api, who) { const tgt = api.other(who), c = ['#ff4500', '#ff9a1a', '#fff1a0'], m = () => api.from(who, 'mouth');
    gather(api, m, c, 6, 0.18, 0.12, 0.27);
    api.at(0.3, () => { const a = m(), d = api.chest(tgt).sub(a).normalize(); for (let i = 0; i < N(api, 10); i++) api.fx.spawn(a, d.clone().multiplyScalar(2.4 + Math.random()).add(V3(rnd(0.8), rnd(0.8) + 0.3, rnd(0.8))), { color: c[i % 3], life: 0.3, size: 0.045, grav: 1.4, spin: 3 });
      api.fx.projectile(a, api.chest(tgt), 'fire', { dur: 0.15, cols: ['#fff1a0', '#ff9a1a', '#ff4500'] }); });
    api.at(0.46, () => groundRing(api, spot(api, tgt), 0.2, ['#ff4500', '#3a1a10'], 10, 0.8, 0.5)); },
  flarebite(api, who) { const tgt = api.other(who), c = ['#ff4500', '#ff9a1a', '#fff1a0'];
    gather(api, () => api.from(who, 'mouth'), c, 10, 0.25, 0.06, 0.24);
    api.at(0.34, () => { const p = api.chest(tgt); line(api, p.clone().add(V3(-0.28, 0.26, 0)), p.clone().add(V3(0.28, 0.04, 0)), c, 9, { life: 0.2 }); line(api, p.clone().add(V3(-0.28, -0.26, 0)), p.clone().add(V3(0.28, -0.04, 0)), c, 9, { life: 0.2 });
      api.fx.burst(p, ['#ffffff', ...c], 14, { speed: 1.6, life: 0.4, size: 0.06, grav: -0.6 }); });
    api.at(0.46, () => groundRing(api, spot(api, tgt), 0.25, ['#ff7a1a', '#3a1a10'], 12, 1.0, 0.5)); },
  blazerush(api, who) { const tgt = api.other(who), c = ['#ff4500', '#ff9a1a', '#fff1a0'], a = spot(api, who).setY(0.2), b = spot(api, tgt).setY(0.2);
    gather(api, () => api.chest(who), c, 10, 0.4, 0.02, 0.16);
    for (let i = 0; i < 7; i++) api.at(0.18 + i * 0.03, () => { const p = a.clone().lerp(b, i / 7); api.fx.burst(p, c, 4, { speed: 0.6, up: 1.1, life: 0.5, size: 0.06, grav: -0.8 }); });
    api.at(0.42, () => { api.fx.burst(api.chest(tgt), ['#ffffff', ...c], 20, { speed: 2.1, life: 0.5, size: 0.07, grav: -0.4 }); api.fx.shockwave(spot(api, tgt), '#ff9a1a', 1.6); groundRing(api, spot(api, tgt), 0.3, ['#ff4500', '#2a1210'], 16, 1.3, 0.55); }); },
  inferno(api, who) { const tgt = api.other(who), c = ['#ff4500', '#ff9a1a', '#fff1a0'], m = () => api.from(who, 'mouth');
    gather(api, m, c, 14, 0.35, 0.05, 0.36);
    // the breath: a cone of fire from the jaws to the foe, poured for a third of a second
    for (let i = 0; i < 6; i++) api.at(0.38 + i * 0.045, () => { const a = m(), b = api.chest(tgt), d = b.clone().sub(a); for (let j = 0; j < N(api, 5); j++) { const v = d.clone().multiplyScalar(1 / 0.18).add(V3(rnd(1.2), rnd(0.8), rnd(1.2))); api.fx.spawn(a.clone(), v, { color: c[(i + j) % 3], life: 0.2, size: 0.07 + j * 0.006, grav: -0.5, spin: 3 }); } });
    api.at(0.46, () => { for (let i = 0; i < N(api, 12); i++) { const a = (i / 12) * TAU, p = spot(api, tgt).add(V3(Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45)); api.fx.spawn(p, V3(0, 1.8 + rnd(0.6), 0), { color: c[i % 3], life: 0.5, size: 0.07, grav: -0.4, spin: 3 }); }
      api.fx.shockwave(spot(api, tgt), '#ff9a1a', 1.9); api.fx.glow(api.chest(tgt), '#fff1a0', 1.6, 0.25); }); },
  /* Atem: clean metal — sparks, straight lines, a held cut */
  gearstrike(api, who) { const tgt = api.other(who), c = ['#e8f6ff', '#7fd0ff', '#2f7bff'];
    gather(api, () => api.from(who, 'handR'), c, 6, 0.2, 0.12, 0.3);
    api.at(0.34, () => { const p = api.chest(tgt); api.fx.burst(p, ['#ffd27a', '#ffffff', '#7fd0ff'], 14, { speed: 2.2, life: 0.3, size: 0.04, grav: 3.2 });
      for (let i = 0; i < N(api, 10); i++) { const a = (i / 10) * TAU; api.fx.spawn(p.clone().add(V3(0, Math.sin(a) * 0.24, Math.cos(a) * 0.24)), V3(0, Math.cos(a) * 1.4, -Math.sin(a) * 1.4), { color: c[i % 3], life: 0.28, size: 0.05, grav: 0, spin: 6 }); } });
    api.at(0.46, () => groundRing(api, spot(api, tgt), 0.22, ['#7fd0ff', '#c8d2e0'], 10, 1.0, 0.35)); },
  ironwall(api, who) { const tgt = api.other(who), a = spot(api, who), d = spot(api, tgt).sub(a).normalize(), side = V3(-d.z, 0, d.x), f = a.clone().addScaledVector(d, 0.6 * sz(api, who));
    // plates snap into a grid one row at a time, then a scan line runs up it
    for (let r = 0; r < 4; r++) api.at(0.05 + r * 0.05, () => { for (let j = 0; j < N(api, 6); j++) { const p = f.clone().addScaledVector(side, (j / 5 - 0.5) * 0.95 * sz(api, who)).add(V3(0, 0.1 + r * 0.22 * sz(api, who), 0)); api.fx.spawn(p, V3(0, 0, 0), { color: (j + r) % 2 ? '#d9e1ee' : '#7fd0ff', life: 0.55 - r * 0.04, size: 0.1, grav: 0, spin: 0 }); } });
    api.at(0.28, () => line(api, f.clone().addScaledVector(side, -0.5 * sz(api, who)).setY(0.1), f.clone().addScaledVector(side, 0.5 * sz(api, who)).setY(0.1), ['#ffffff', '#7fd0ff'], 10, { life: 0.3, up: 2.4 }));
    api.at(0.3, () => api.fx.glow(f.clone().setY(0.5), '#7fd0ff', 1.2, 0.35)); },
  bladeform(api, who) { const tgt = api.other(who), s = who === 'p' ? 1 : -1, c = ['#ffffff', '#bfe6ff', '#7fd0ff'];
    // a glint runs down the blade, the cut is one clean diagonal line that hangs for a moment, then sparks
    api.at(0.14, () => { const h = api.from(who, 'handR'), sh = api.chest(who).add(V3(0, 0.2, 0)); line(api, sh, h, c, 8, { life: 0.16 }); api.fx.glow(h, '#ffffff', 0.9, 0.2); });
    api.at(0.34, () => { const p = api.chest(tgt); line(api, p.clone().add(V3(-0.4 * s, 0.42, 0)), p.clone().add(V3(0.4 * s, -0.38, 0)), c, 16, { life: 0.34, j: 0.01 }); api.fx.slash(p.clone().add(V3(0, 0.05, 0)), 'metal', s); });
    api.at(0.44, () => { api.fx.burst(api.chest(tgt), ['#ffffff', '#7fd0ff', '#ffd27a'], 14, { speed: 2.2, life: 0.35, size: 0.045, grav: 2.6 }); groundRing(api, spot(api, tgt), 0.24, ['#7fd0ff', '#ffffff'], 10, 1.1, 0.35); }); },
  overclock(api, who) { const tgt = api.other(who), c = ['#ffffff', '#7fd0ff', '#2f7bff'];
    api.at(0.08, () => api.fx.column(spot(api, who), c, 14, { r: 0.5 * sz(api, who), rise: 1.6, life: 0.55 }));
    gather(api, () => api.chest(who), c, 12, 0.5, 0.1, 0.36);
    // the X: two cuts cross on the foe as the arms open, then current arcs between the blades and the foe
    api.at(0.4, () => { const p = api.chest(tgt); line(api, p.clone().add(V3(-0.42, 0.42, 0)), p.clone().add(V3(0.42, -0.42, 0)), c, 14, { life: 0.32, j: 0.01 }); line(api, p.clone().add(V3(-0.42, -0.42, 0)), p.clone().add(V3(0.42, 0.42, 0)), c, 14, { life: 0.32, j: 0.01 }); });
    for (let k2 = 0; k2 < 2; k2++) api.at(0.44 + k2 * 0.05, () => { let a = api.chest(who); const b = api.chest(tgt); for (let i = 1; i <= 4; i++) { const q = a.clone().lerp(b, 0.25).add(V3(rnd(0.25), rnd(0.25), rnd(0.25))); if (i === 4) q.copy(b); line(api, a, q, c, 4, { life: 0.12, j: 0.02 }); a = q; } });
    api.at(0.5, () => { api.fx.glow(api.chest(tgt), '#7fd0ff', 1.4, 0.25); groundRing(api, spot(api, tgt), 0.3, c, 14, 1.3, 0.4); }); },
};
/* Meta uses the same four metal moves as Atem, performed with her wired hair: cables of light lash out from her head,
   a lattice of data cubes forms her wall, and the cables arc current into the foe. */
const META15 = {
  gearstrike(api, who) { const tgt = api.other(who), c = ['#eaf6ff', '#5fd0ff', '#2f8cff'], h = () => api.head(who);
    gather(api, h, c, 6, 0.25, 0.1, 0.26);
    for (let k2 = 0; k2 < 3; k2++) api.at(0.28 + k2 * 0.02, () => { const a = h().add(V3(0, -0.1 * k2, 0)), b = api.chest(tgt).add(V3(0, (k2 - 1) * 0.12, 0)), n = N(api, 10); for (let i = 0; i <= n; i++) { const t = i / n, p = a.clone().lerp(b, t); p.y += sin(t * PI) * (0.25 + k2 * 0.1); api.fx.spawn(p, V3(0, 0, 0), { color: c[(i + k2) % 3], life: 0.12 + t * 0.12, size: 0.04, grav: 0, spin: 2 }); } });
    api.at(0.36, () => { api.fx.burst(api.chest(tgt), ['#ffffff', '#5fd0ff', '#eaf6ff'], 12, { speed: 1.8, life: 0.3, size: 0.045, grav: 1 }); groundRing(api, spot(api, tgt), 0.22, ['#5fd0ff', '#eaf6ff'], 10, 1.0, 0.35); }); },
  ironwall(api, who) { const tgt = api.other(who), a = spot(api, who), d = spot(api, tgt).sub(a).normalize(), side = V3(-d.z, 0, d.x), f = a.clone().addScaledVector(d, 0.6 * sz(api, who));
    for (let r = 0; r < 4; r++) api.at(0.05 + r * 0.05, () => { for (let j = 0; j < N(api, 7); j++) { if ((j + r) % 2) continue; const p = f.clone().addScaledVector(side, (j / 6 - 0.5) * 0.95 * sz(api, who)).add(V3(0, 0.12 + r * 0.22 * sz(api, who), 0)); api.fx.spawn(p, V3(0, 0, 0), { color: r % 2 ? '#eaf6ff' : '#5fd0ff', life: 0.55 - r * 0.04, size: 0.08, grav: 0, spin: 1 }); } });
    api.at(0.3, () => api.fx.glow(f.clone().setY(0.5), '#5fd0ff', 1.2, 0.35)); },
  bladeform(api, who) { const tgt = api.other(who), s = who === 'p' ? 1 : -1, c = ['#ffffff', '#bfefff', '#5fd0ff'];
    api.at(0.14, () => { const h = api.head(who); line(api, h, h.clone().add(V3(0.5 * s, -0.5, 0)), c, 8, { life: 0.2 }); api.fx.glow(h, '#5fd0ff', 0.9, 0.2); });
    api.at(0.36, () => { const p = api.chest(tgt); line(api, p.clone().add(V3(-0.42 * s, 0.4, 0)), p.clone().add(V3(0.42 * s, -0.36, 0)), c, 16, { life: 0.3, j: 0.01 }); api.fx.slash(p, 'metal', s); });
    api.at(0.44, () => { api.fx.burst(api.chest(tgt), ['#ffffff', '#5fd0ff'], 12, { speed: 2, life: 0.35, size: 0.045, grav: 1.6 }); groundRing(api, spot(api, tgt), 0.24, ['#5fd0ff', '#ffffff'], 10, 1.1, 0.35); }); },
  overclock(api, who) { const tgt = api.other(who), c = ['#ffffff', '#5fd0ff', '#2f8cff'];
    api.at(0.08, () => api.fx.column(spot(api, who), c, 14, { r: 0.5 * sz(api, who), rise: 1.6, life: 0.55 }));
    gather(api, () => api.head(who), c, 12, 0.5, 0.1, 0.36);
    for (let k2 = 0; k2 < 4; k2++) api.at(0.4 + k2 * 0.035, () => { let a = api.head(who); const b = api.chest(tgt); for (let i = 1; i <= 4; i++) { const q = a.clone().lerp(b, 0.25).add(V3(rnd(0.3), rnd(0.3), rnd(0.3))); if (i === 4) q.copy(b); line(api, a, q, c, 4, { life: 0.12, j: 0.02 }); a = q; } });
    api.at(0.5, () => { api.fx.glow(api.chest(tgt), '#5fd0ff', 1.4, 0.25); groundRing(api, spot(api, tgt), 0.3, c, 14, 1.3, 0.4); }); },
};
const lineOf15 = (api, who) => ((window.A.Data.SPECIES[api.slot(who).spId] || {}).line);
// wrap the roster's sequences: a prototype attacker gets its Phase 15 sequence, everyone else exactly what they had
Object.keys(P15).forEach((mv) => { const key = MOVES[mv]; if (!key || !STYLE[key]) return; const orig = STYLE[key];
  STYLE[key] = (api, who, info) => (!on(api, who) ? orig(api, who, info) : lineOf15(api, who) === 'meta' && META15[mv] ? META15[mv](api, who, info) : P15[mv](api, who, info)); });

/* ================================================================= combat accents (hits)
   With the switch on, every hit in a battle gets a little more weight, without changing its timing:
   - super-effective ("critical") hits: a white rim flash, a short ring of light on the ground and radial streaks
     (on top of the existing hit-stop and camera punch);
   - heavy (boss) hits: dust kicked up at the feet;
   - a prototype taking a hit reacts in its own material: Atem throws metal sparks, Igniflare spits embers, Lumifern
     sheds leaves. Nothing with Reduce Motion beyond the existing flash. */
export function hitAccent(api, who, el, eff, info) {
  if (!window.A.Proto15 || !window.A.Proto15.enabled() || api.calm()) return false;
  const p = api.chest(who), g = spot(api, who), s = sz(api, who), sp = api.slot(who).spId, line15 = (window.A.Data.SPECIES[sp] || {}).line;
  if (eff === 'super') {
    api.fx.glow(p, '#ffffff', 1.8 * s, 0.14);
    groundRing(api, g, 0.35 * s, ['#ffffff', '#ffe9a0'], 18, 2.0, 0.35);
    for (let i = 0; i < N(api, 8); i++) { const a = (i / 8) * TAU; api.fx.spawn(p.clone(), V3(Math.cos(a) * 3, Math.sin(a) * 2.2, rnd(1)), { color: i % 2 ? '#ffffff' : '#ffe9a0', life: 0.18, size: 0.04, grav: 0, spin: 0 }); }
  }
  if (info && info.big) api.fx.burst(g.clone().setY(0.08), ['#cbb89a', '#a8957a', '#e4d8c2'], 10, { speed: 1.0, up: 0.6, life: 0.5, size: 0.06, grav: 2 });
  if (window.A.Proto15.active(sp)) {
    if (line15 === 'atem') api.fx.burst(p, ['#ffd27a', '#ffffff', '#7fd0ff'], 10, { speed: 2.2, life: 0.28, size: 0.035, grav: 3.5 });
    else if (line15 === 'igniflare') api.fx.burst(p, ['#ff9a1a', '#ff4500', '#3a1a10'], 8, { speed: 1.2, life: 0.4, size: 0.045, grav: -0.6 });
    else if (line15 === 'meta') api.fx.burst(p, ['#5fd0ff', '#eaf6ff', '#2f8cff'], 9, { speed: 1.6, life: 0.35, size: 0.04, grav: 0.8 });
    else if (line15 === 'lumifern') api.fx.burst(p, ['#9fe36a', '#7fcf5a', '#c8f59a'], 7, { speed: 1.1, life: 0.55, size: 0.055, grav: 1.6 });
    else hitMaterial15(api, who);
  }
  return true;
}
