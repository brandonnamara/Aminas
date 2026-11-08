/* Aminas — Phase 8B: the Phase 8 treatment for the whole roster.
   Every form is built in parts (src/voxel-rig.js), so these clips move heads, jaws, eyelids, ears, legs, arms, wings,
   tails, necks, hair and Cannonis's cannon. Each line has its own personality (tempo, weight, an idle quirk, and its
   own attack, special, victory and defeat), and later forms move heavier and grander than the first.
   Same contracts as Phase 8: the same clip names and durations, plus a 'blink' overlay; attack and special reach the
   foe at 0.34 s and 0.40 s (the rig's forward peak); every clip except defeat ends exactly at rest.
   Axes (as in showcase.js): rig rotations are world space (x pitch: positive leans forward, y yaw); part rotations are
   in the model's voxel space (z pitch: positive lifts the front, y yaw, x roll / spread). */
import { THREE, CLIP_HOOKS } from './creature3d.js';
import { kit, blinks, SHOWCASE_IDS, VIEW_YAW, LIVING, STYLE, MOVES } from './showcase.js';

const Z3 = [0, 0, 0], O3 = [1, 1, 1], sin = Math.sin, cos = Math.cos, TAU = Math.PI * 2, PI = Math.PI;
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
// smooth bump: 0 outside [a, b], rising to 1 in the middle
const bump = (t, a, b) => (t <= a || t >= b ? 0 : sin(PI * (t - a) / (b - a)) ** 2);
const ease = (t) => t * t * (3 - 2 * t);

/* ------------------------------------------------------------------ personalities (one per line) */
// tempo: idle speed; breathe/bob: idle amplitudes; look: head wander; tail/wing: sway; heavy 0..1; amp: motion scale
// quirk: the idle's signature gesture; atk/sp/vic/def: attack, special, victory and defeat styles; fx: move colours
export const PERSONA = {
  lumifern: { tempo: 0.9, breathe: 0.034, bob: 0.018, look: 0.16, tail: 0.32, ear: 1, quirk: 'doze', atk: 'hop', sp: 'bloom', vic: 'hops', def: 'curl', heavy: 0.15, blink: 4.6, fx: ['#7fcf5a', '#ffd86b', '#fff7c8'], ground: 'ring', gcol: '#ffe08a', view: -0.55 },
  umbrit: { tempo: 0.85, breathe: 0.026, bob: 0, look: 0.3, tail: 0.38, ear: 1, quirk: 'glance', atk: 'pounce', sp: 'veil', vic: 'spin', def: 'sink', heavy: 0.3, blink: 4.2, fx: ['#2a1f55', '#6a58b0', '#b9a2ff'], ground: 'pool', gcol: '#1a1030', view: -0.5 },
  cannonis: { tempo: 0.72, breathe: 0.016, bob: 0, look: 0.15, tail: 0.18, quirk: 'aim', atk: 'fire', sp: 'rearfire', vic: 'salute', def: 'fold', heavy: 0.85, blink: 6, fx: ['#3a9ae8', '#8fdcff', '#effcff'], ground: null, view: -1.0 },
  kairyu: { tempo: 1.3, breathe: 0.03, bob: 0.03, look: 0.24, tail: 0.42, quirk: 'bounce', atk: 'swipe', sp: 'surf', vic: 'flip', def: 'slump', heavy: 0.35, blink: 4.8, fx: ['#0a4bff', '#3ec8ff', '#e0f6ff'], ground: 'pool', gcol: '#0f3a8a', view: -0.6 },
  aquaflora: { tempo: 0.78, breathe: 0.022, bob: 0, look: 0.2, tail: 0.3, quirk: 'sway', atk: 'strike', sp: 'rise', vic: 'coil', def: 'droop', heavy: 0.3, blink: 5.6, fx: ['#00b8a8', '#7fffb8', '#ff6b9d'], ground: 'pool', gcol: '#064a5a', view: -0.7 },
  gaiaroki: { tempo: 0.85, breathe: 0.028, bob: 0, look: 0.14, tail: 0.25, quirk: 'thump', atk: 'punch', sp: 'slam', vic: 'flex', def: 'kneel', heavy: 0.7, blink: 5.4, fx: ['#6b4e32', '#7aa437', '#c9a96b'], ground: 'pool', gcol: '#3a2a18', view: -0.6 },
  pyrocell: { tempo: 0.7, breathe: 0.02, bob: 0, look: 0.1, tail: 0, quirk: 'rumble', atk: 'punch', sp: 'stomp', vic: 'flex', def: 'kneel', heavy: 0.9, blink: 6.2, fx: ['#3a3234', '#ff4500', '#ffb020'], ground: 'ring', gcol: '#ff5a1a', view: -0.55 },
  acinus: { tempo: 0.8, breathe: 0.022, bob: 0, look: 0.16, tail: 0.3, quirk: 'shake', atk: 'headbutt', sp: 'stomp', vic: 'proud', def: 'lie', heavy: 0.6, blink: 5.8, fx: ['#5e8f3a', '#b33a3a', '#f4e9d7'], ground: 'pool', gcol: '#2c3a18', view: -0.85 },
  sylvaneer: { tempo: 0.85, breathe: 0.02, bob: 0, look: 0.26, tail: 0.28, quirk: 'alert', atk: 'antler', sp: 'rear', vic: 'rearv', def: 'kneel', heavy: 0.45, blink: 5.2, fx: ['#6b4423', '#8fd14f', '#7dff6a'], ground: 'pool', gcol: '#1f3a14', view: -0.8 },
  terraflora: { tempo: 0.75, breathe: 0.024, bob: 0, look: 0.14, tail: 0, quirk: 'rustle', atk: 'swing', sp: 'grow', vic: 'bloom', def: 'wilt', heavy: 0.5, blink: 6, fx: ['#5b3a1f', '#2b8b22', '#00ff88'], ground: 'pool', gcol: '#123a1a', view: -0.55 },
  emberix: { tempo: 1.25, breathe: 0.028, bob: 0.012, look: 0.22, tail: 0.5, quirk: 'wag', atk: 'bite', sp: 'flare', vic: 'hops', def: 'lie', heavy: 0.3, blink: 4.6, fx: ['#4a9bff', '#00d1ff', '#ffffff'], ground: 'ring', gcol: '#4ab0ff', view: -0.8 },
  pyrokai: { tempo: 1.2, breathe: 0.03, bob: 0.02, look: 0.2, tail: 0.38, quirk: 'shadowbox', atk: 'punch', sp: 'leap', vic: 'flex', def: 'slump', heavy: 0.35, blink: 4.8, fx: ['#7a8bff', '#3b8fff', '#00d1ff'], ground: 'ring', gcol: '#3b8fff', view: -0.6 },
  igniflare: { tempo: 0.95, breathe: 0.024, bob: 0, look: 0.2, tail: 0.32, wing: 0.08, quirk: 'wingstretch', atk: 'bite', sp: 'breath', vic: 'roar', def: 'topple', heavy: 0.45, blink: 5, fx: ['#ff4500', '#ff9a1a', '#fff1a0'], ground: 'ring', gcol: '#ff6a1a', view: -0.85 },
  pyrospark: { tempo: 1.35, breathe: 0.03, bob: 0.02, look: 0.28, tail: 0.3, wing: 0.1, quirk: 'flutter', atk: 'peck', sp: 'soar', vic: 'flap', def: 'flop', heavy: 0.2, blink: 4.2, fx: ['#c41010', '#ff8000', '#ffe600'], ground: 'ring', gcol: '#ff7a10', view: -0.65 },
  zephyr: { tempo: 1.0, breathe: 0.022, bob: 0.01, look: 0.24, tail: 0.3, wing: 0.1, quirk: 'preen', atk: 'claw', sp: 'dive', vic: 'wingbeat', def: 'topple', heavy: 0.35, blink: 5, fx: ['#3dbbff', '#7fe8ff', '#ffd166'], ground: 'ring', gcol: '#7fe8ff', view: -0.85 },
  voltar: { tempo: 1.3, breathe: 0.024, bob: 0.025, look: 0.26, tail: 0, quirk: 'juggle', atk: 'jab', sp: 'bow', vic: 'dance', def: 'collapse', heavy: 0.25, blink: 4.4, fx: ['#6a0090', '#d946ef', '#ffd700'], ground: 'pool', gcol: '#2a0a40', view: -0.45 },
  zeep: { tempo: 0.9, breathe: 0.016, bob: 0, look: 0.2, tail: 0.2, quirk: 'beep', atk: 'ram', sp: 'charge', vic: 'spinz', def: 'powerdown', heavy: 0.55, blink: 5.6, fx: ['#12161c', '#22d8ff', '#9ff0ff'], ground: 'ring', gcol: '#22d8ff', view: -0.7 },
  lumi: { tempo: 0.9, breathe: 0.02, bob: 0.06, float: 1, look: 0, tail: 0, wing: 0.14, quirk: 'twirl', atk: 'pulse', sp: 'radiate', vic: 'twirl', def: 'dim', heavy: 0.1, blink: 5, fx: ['#3fd6ff', '#a9ecff', '#ffffff'], ground: 'ring', gcol: '#5fe0ff', view: -0.5 },
  meta: { tempo: 0.95, breathe: 0.02, bob: 0, look: 0.2, tail: 0, quirk: 'tilt', atk: 'strike', sp: 'channel', vic: 'wave', def: 'kneel', heavy: 0.35, blink: 5, fx: ['#2f8cff', '#5fd0ff', '#eef4ff'], ground: 'ring', gcol: '#5fd0ff', view: -0.45 },
  atem: { tempo: 0.85, breathe: 0.018, bob: 0, look: 0.22, tail: 0, quirk: 'scan', atk: 'slash', sp: 'cross', vic: 'salutea', def: 'kneel', heavy: 0.6, blink: 5.6, fx: ['#2f7bff', '#7fd0ff', '#e8eef8'], ground: 'ring', gcol: '#7fd0ff', view: -0.45 },
};
// the three later forms of a line grow heavier and grander: tempo, bounce, weight and reach change with the stage
export function persona(spId) {
  const sp = window.A.Data.SPECIES[spId]; if (!sp) return null; const base = PERSONA[sp.line]; if (!base) return null;
  const s = sp.stage || 1, p = Object.assign({}, base);
  p.stage = s; p.tempo *= [1.08, 1, 0.9][s - 1]; p.bob *= [1.25, 1, 0.75][s - 1]; p.heavy = Math.min(1, p.heavy + [-0.08, 0, 0.14][s - 1]);
  p.amp = [1.1, 1, 0.92][s - 1]; p.grand = s === 3; p.el = sp.el;
  return p;
}

/* ------------------------------------------------------------------ the clip builder */
function rosterClips(root, spId) {
  const pr = persona(spId); if (!pr) return null;
  const k = kit(root), { R, S, L, clip, pair, has } = k, Pw = (n, keys) => k.P(n, keys, true), Pv = (n, keys) => k.P(n, keys);
  const A = pr.amp, H = pr.heavy, lunge = A * (1 - 0.4 * H), G = pr.grand ? 1.2 : 1;
  const lidN = Object.keys(k.n).filter((n) => /^lid/.test(n) && k.n[n].isBone);
  const heads = ['head', 'head2', 'head3'].filter(has), jaws = ['jaw', 'jaw2', 'jaw3'].filter(has);
  const quad = has('legFL'), biped = has('legL') || has('armL'), arms = has('armL'), wingsOn = has('wingL'), headOn = heads.length > 0;
  // track helpers (a part a creature lacks is simply skipped)
  const lids = (keys) => lidN.map((l) => L(l, keys));
  const hd = (keys) => heads.map((h) => R(h, keys)), jw = (keys) => jaws.map((j) => R(j, keys));
  const ears = (keys) => pair('earL', 'earR', keys), wings = (keys) => pair('wingL', 'wingR', keys);
  const armsK = (l, r) => [R('armL', l), R('armR', r || l, true)];   // keys are written for the left arm (+x spreads it outwards); the right one mirrors
  const legsQ = (f, b) => [R('legFL', f), R('legFR', f), R('legBL', b || f), R('legBR', b || f)];
  const legs2 = (l, r) => [R('legL', l), R('legR', r || l)];
  const allLegs = (f, b) => legsQ(f, b).concat(legs2(b || f));
  const tail = (keys) => R('tail', keys), neck = (keys) => R('neck', keys), hair = (keys) => R('hair', keys);
  const body = (keys) => S('body', keys), rigP = (keys) => Pw('rig', keys), rigR = (keys) => R('rig', keys);
  // sampled curves: f(t) -> value, N keys over D (loops must return to their start)
  const F = (D, N, f) => Array.from({ length: N + 1 }, (_, i) => { const t = D * i / N; return [t, f(t)]; });
  const out = [];

  /* ---------------- idle: breathing, wandering look, tail and wings, and the line's own quirk ---------------- */
  {
    const D = +(5.2 / pr.tempo).toFixed(2), N = 48, nb = Math.max(2, Math.round(D / 1.7)), qa = D * 0.52, qb = D * 0.82, e = (t) => bump(t, qa, qb);
    const ph = (t) => (t / D) * TAU;
    const q = QUIRK[pr.quirk] ? QUIRK[pr.quirk](qa, qb, e, { D, pr, has, heads }) : {};
    const at = (name, f) => (q[name] ? (t) => add3(f(t), q[name](t)) : f);
    const bodyF = at('body', (t) => [pr.breathe * sin(ph(t) * nb), -pr.breathe * 0.8 * sin(ph(t) * nb), pr.breathe * sin(ph(t) * nb)]);
    out.push(clip('idle', D, [
      body(F(D, N, (t) => add3(O3, bodyF(t)))),
      rigP(F(D, N, at('rigP', (t) => [0, pr.bob * (pr.float ? sin(ph(t)) : 0.5 - 0.5 * cos(ph(t) * nb)), 0]))),
      rigR(F(D, N, at('rigR', (t) => [pr.float ? 0.03 * sin(ph(t)) : 0, 0, pr.float ? 0.05 * sin(ph(t) + 1) : 0]))),
      hd(F(D, N, at('head', (t) => [0, pr.look * sin(ph(t) + 0.6), 0.05 * sin(ph(t) * 2)]))),
      jw(F(D, N, at('jaw', () => Z3))),
      tail(F(D, N, at('tail', (t) => [0, pr.tail * sin(ph(t) * Math.max(1, nb - 1)), 0.06 * sin(ph(t))]))),
      wings(F(D, N, at('wings', (t) => [(pr.wing || 0.06) * sin(ph(t) * nb + 0.6), 0, 0.03 * sin(ph(t) * nb)]))),
      R('earL', F(D, N, at('ears', (t) => mul3([0.25, 0, -0.12], bump(t, D * 0.18, D * 0.24) + bump(t, D * 0.27, D * 0.31) * 0.6)))),
      R('earR', F(D, N, at('ears', (t) => mul3([0.25, 0, -0.12], bump(t, D * 0.4, D * 0.46)))), true),
      armsK(F(D, N, at('armL', (t) => [0, 0, 0.06 * sin(ph(t) + 0.4)])), F(D, N, at('armR', (t) => [0, 0, 0.06 * sin(ph(t) + 2.0)]))),
      legsQ(F(D, N, at('legsF', (t) => [0, 0, 0.035 * sin(ph(t))])), F(D, N, at('legsB', (t) => [0, 0, -0.03 * sin(ph(t))]))),
      neck(F(D, N, at('neck', (t) => [0, 0.14 * sin(ph(t)), 0.05 * sin(ph(t) * 2)]))),
      hair(F(D, N, at('hair', (t) => [0.08 * sin(ph(t) * 2), 0.1 * sin(ph(t)), 0]))),
      R('cannon', F(D, N, at('cannon', (t) => [0, 0.03 * sin(ph(t) + 1), 0.035 * sin(ph(t) * 2 + 0.5)]))),
      q.lids ? lids(F(D, N, q.lids)) : [] ]));
  }
  // blink: every eyelid together, a double blink now and then (shy ones blink more)
  if (lidN.length) { const Db = pr.blink; out.push(blinks(k, lidN, Db, [[Db * 0.3, Db * 0.82, Db * 0.82 + 0.22]])); }

  /* ---------------- ready: braces for its turn, eyes on the target ---------------- */
  out.push(clip('ready', 0.75, [
    body([[0, O3], [0.22, [1.06, 0.9, 1.06]], [0.45, [0.98, 1.04, 0.98]], [0.75, O3]]),
    rigP([[0, Z3], [0.22, [0, -0.03 * A, 0]], [0.5, [0, 0.01, 0.02]], [0.75, Z3]]),
    hd([[0, Z3], [0.3, [0, 0, -0.12]], [0.75, Z3]]), ears([[0, Z3], [0.18, [0, 0, -0.5]], [0.42, [0.05, 0, 0.18]], [0.75, Z3]]),
    wings([[0, Z3], [0.35, [0.3, 0, 0]], [0.75, Z3]]), armsK([[0, Z3], [0.3, [0.15, 0, 0.35]], [0.75, Z3]]),
    tail([[0, Z3], [0.3, [0, 0, -0.25]], [0.75, Z3]]), legsQ([[0, Z3], [0.3, [0, 0, 0.1]], [0.75, Z3]]),
    R('cannon', [[0, Z3], [0.35, [0, 0, -0.18]], [0.75, Z3]]) ]));

  /* ---------------- attack: wind-up, the strike lands at 0.34 s ---------------- */
  const ctx = { pr, A, H, lunge, G, hd, jw, ears, wings, armsK, legsQ, legs2, allLegs, tail, neck, hair, body, rigP, rigR, lids, R, Pv, F, quad, biped, arms, wingsOn, headOn };
  out.push(clip('attack', 0.9, (ATTACK[pr.atk] || ATTACK.bite)(ctx)));

  /* ---------------- special: a bigger build-up, the strike lands at 0.40 s ---------------- */
  out.push(clip('special', 1.1, (SPECIAL[pr.sp] || SPECIAL.bloom)(ctx)));

  /* ---------------- hit / hitBig: flinch, eyes squeezed shut; the big one knocks it back and twists it ---------------- */
  const flinch = 1 - 0.45 * H;
  out.push(clip('hit', 0.55, [
    rigP([[0, Z3], [0.08, [0, 0.02, -0.14 * flinch]], [0.55, Z3]]), rigR([[0, Z3], [0.08, [-0.2 * flinch, 0, 0.08]], [0.55, Z3]]),
    body([[0, O3], [0.08, [0.92, 1.07, 0.92]], [0.2, [1.05, 0.95, 1.05]], [0.55, O3]]),
    hd([[0, Z3], [0.08, [0, 0.08, 0.3]], [0.4, Z3], [0.55, Z3]]), jw([[0, Z3], [0.08, [0, 0, -0.25]], [0.35, Z3], [0.55, Z3]]),
    ears([[0, Z3], [0.08, [0, 0, -0.7]], [0.55, Z3]]), wings([[0, Z3], [0.08, [-0.22, 0, 0]], [0.55, Z3]]),
    armsK([[0, Z3], [0.08, [0.35, 0, 0.3]], [0.4, Z3], [0.55, Z3]]), neck([[0, Z3], [0.08, [0, 0, 0.25]], [0.55, Z3]]),
    tail([[0, Z3], [0.08, [0, 0.3, -0.2]], [0.55, Z3]]), lids([[0, 0], [0.05, 1], [0.3, 1], [0.4, 0], [0.55, 0]]) ]));
  out.push(clip('hitBig', 0.8, [
    rigP([[0, Z3], [0.1, [0, 0.12 * flinch, -0.3 * flinch]], [0.3, [0, 0, -0.16 * flinch]], [0.8, Z3]]), rigR([[0, Z3], [0.1, [-0.38 * flinch, 0.45 * flinch, 0.16]], [0.35, [-0.1, 0.1, 0]], [0.8, Z3]]),
    body([[0, O3], [0.1, [0.88, 1.1, 0.88]], [0.3, [1.08, 0.92, 1.08]], [0.8, O3]]),
    hd([[0, Z3], [0.1, [0, 0.15, 0.45]], [0.55, [0, 0, 0.1]], [0.8, Z3]]), jw([[0, Z3], [0.1, [0, 0, -0.4]], [0.5, Z3], [0.8, Z3]]),
    ears([[0, Z3], [0.1, [0.2, 0, -0.8]], [0.5, [0, 0, -0.3]], [0.8, Z3]]), wings([[0, Z3], [0.1, [-0.32, 0, 0.1]], [0.5, Z3], [0.8, Z3]]),
    armsK([[0, Z3], [0.1, [0.6, 0, 0.5]], [0.5, [0.1, 0, 0.1]], [0.8, Z3]]), neck([[0, Z3], [0.1, [0, 0.2, 0.4]], [0.6, Z3], [0.8, Z3]]),
    tail([[0, Z3], [0.1, [0, 0.5, -0.3]], [0.6, Z3], [0.8, Z3]]), legsQ([[0, Z3], [0.1, [0, 0, -0.2]], [0.5, Z3], [0.8, Z3]]),
    R('cannon', [[0, Z3], [0.1, [0.15, 0, 0.2]], [0.5, Z3], [0.8, Z3]]), lids([[0, 0], [0.06, 1], [0.5, 1], [0.6, 0], [0.8, 0]]) ]));

  /* ---------------- heal: lifts its face with eyes closed, opens up, a gentle sway ---------------- */
  out.push(clip('heal', 0.9, [
    hd([[0, Z3], [0.35, [0, 0, 0.26]], [0.7, [0, 0, 0.26]], [0.9, Z3]]), neck([[0, Z3], [0.35, [0, 0, 0.2]], [0.7, [0, 0, 0.2]], [0.9, Z3]]),
    wings([[0, Z3], [0.4, [0.32, 0, 0]], [0.7, [0.32, 0, 0]], [0.9, Z3]]), armsK([[0, Z3], [0.35, [0.45, 0, 0.4]], [0.7, [0.45, 0, 0.4]], [0.9, Z3]]),
    ears([[0, Z3], [0.3, [0.2, 0, 0.2]], [0.7, [0.2, 0, 0.2]], [0.9, Z3]]), rigP([[0, Z3], [0.35, [0, 0.05, 0]], [0.7, [0, 0.05, 0]], [0.9, Z3]]),
    rigR(F(0.9, 8, (t) => [0, 0, 0.06 * sin(t / 0.9 * TAU)])), lids([[0, 0], [0.25, 1], [0.7, 1], [0.9, 0]]),
    R('cannon', [[0, Z3], [0.3, [0, 0, 0.35]], [0.65, [0, 0, 0.35]], [0.9, Z3]]) ]));

  /* ---------------- guard: braces, head down, arms crossed or wings wrapped ---------------- */
  out.push(clip('guard', 0.7, [
    body([[0, O3], [0.2, [1.08, 0.86, 1.08]], [0.5, [1.08, 0.86, 1.08]], [0.7, O3]]), rigP([[0, Z3], [0.2, [0, -0.04, -0.04]], [0.5, [0, -0.04, -0.04]], [0.7, Z3]]),
    hd([[0, Z3], [0.2, [0, 0, -0.22]], [0.5, [0, 0, -0.22]], [0.7, Z3]]), neck([[0, Z3], [0.2, [0, 0, -0.2]], [0.5, [0, 0, -0.2]], [0.7, Z3]]),
    armsK([[0, Z3], [0.2, [-0.35, 0, 0.75]], [0.5, [-0.35, 0, 0.75]], [0.7, Z3]]), wings([[0, Z3], [0.22, [-0.35, 0.5, 0]], [0.5, [-0.35, 0.5, 0]], [0.7, Z3]]),
    ears([[0, Z3], [0.2, [0, 0, -0.8]], [0.5, [0, 0, -0.8]], [0.7, Z3]]), tail([[0, Z3], [0.2, [0, 0.45, 0.2]], [0.5, [0, 0.45, 0.2]], [0.7, Z3]]),
    legsQ([[0, Z3], [0.2, [0, 0, 0.16]], [0.5, [0, 0, 0.16]], [0.7, Z3]]), lids([[0, 0], [0.2, 0.55], [0.5, 0.55], [0.7, 0]]) ]));

  /* ---------------- victory / defeat in the line's own style ---------------- */
  out.push(clip('victory', 1.6, (VICTORY[pr.vic] || VICTORY.hops)(ctx)));
  out.push(clip('defeat', 1.2, (DEFEAT[pr.def] || DEFEAT.slump)(ctx)));

  /* ---------------- move: its own gait ---------------- */
  const M = 0.8, gait = (amp, off) => F(M, 8, (t) => [0, 0, amp * sin(t / M * TAU + (off || 0))]);
  out.push(clip('move', M, [
    rigP(F(M, 8, (t) => [0, (pr.float ? 0.05 : 0.04 * (1 - H * 0.5)) * Math.abs(sin(t / M * TAU)), 0])),
    R('legFL', gait(0.3)), R('legBR', gait(0.3)), R('legFR', gait(-0.3)), R('legBL', gait(-0.3)),
    R('legL', gait(0.35)), R('legR', gait(-0.35)), R('armL', gait(-0.3)), R('armR', gait(0.3)),
    hd(F(M, 8, (t) => [0, 0.05 * sin(t / M * TAU), 0])), wings(F(M, 8, (t) => [0.15 * sin(t / M * TAU), 0, 0])),
    tail(F(M, 8, (t) => [0, 0.25 * sin(t / M * TAU), 0])), neck(F(M, 8, (t) => [0, 0.12 * sin(t / M * TAU), 0])) ]));
  return out;
}

/* ------------------------------------------------------------------ idle quirks: offsets added inside the window */
const QUIRK = {
  // Lumifern: nods off (head droops, eyes half shut, ears sag), then perks back up
  doze: (a, b, e, c) => ({ head: (t) => [0, 0, -0.28 * e(t)], rigR: (t) => (c.heads.length ? Z3 : [0.12 * e(t), 0, 0]), ears: (t) => [0.25 * e(t), 0, -0.35 * e(t)], lids: (t) => 0.7 * e(t) }),
  // Umbrit II / III: a shy glance aside, ears flicking
  glance: (a, b, e) => ({ head: (t) => [0, 0.42 * e(t), 0.06 * e(t)], rigR: (t) => [0, 0.14 * e(t), 0], ears: (t) => [0, 0, -0.25 * bump(t, a, a + (b - a) * 0.3)] }),
  // Cannonis II / III: sweeps the cannon across the horizon, head following
  aim: (a, b, e) => ({ cannon: (t) => [0, 0.22 * sin(PI * 2 * (t - a) / (b - a)) * e(t), 0.14 * e(t)], head: (t) => [0, 0.16 * sin(PI * 2 * (t - a) / (b - a)) * e(t), 0] }),
  // Kairyu: two springy hops in place, arms up
  bounce: (a, b, e) => { const h = (t) => (t > a && t < b ? Math.abs(sin(PI * 2 * (t - a) / (b - a))) : 0); return { rigP: (t) => [0, 0.09 * h(t), 0], body: (t) => [0.05 * (e(t) - h(t)), -0.06 * (e(t) - h(t)), 0.05 * (e(t) - h(t))], armL: (t) => [0, 0, 0.4 * h(t)], armR: (t) => [0, 0, 0.4 * h(t)], tail: (t) => [0, 0, -0.3 * h(t)] }; },
  // Aquaflora: a slow serpentine S-curve through neck and head
  sway: (a, b, e) => ({ neck: (t) => [0, 0.3 * sin(PI * 2 * (t - a) / (b - a)) * e(t), 0.08 * e(t)], head: (t) => [0, -0.3 * sin(PI * 2 * (t - a) / (b - a)) * e(t), 0.08 * e(t)], tail: (t) => [0, 0.3 * sin(PI * 2 * (t - a) / (b - a)) * e(t), 0] }),
  // Gaiaroki: pounds its chest, left, right, left
  thump: (a, b, e) => { const w = (b - a) / 3, hit = (i) => (t) => bump(t, a + i * w, a + (i + 1) * w); return { armL: (t) => [-0.3 * (hit(0)(t) + hit(2)(t)), 0, 0.9 * (hit(0)(t) + hit(2)(t))], armR: (t) => [-0.3 * hit(1)(t), 0, 0.9 * hit(1)(t)], head: (t) => [0, 0, 0.18 * e(t)], jaw: (t) => [0, 0, -0.3 * e(t)], body: (t) => [0.03 * e(t), 0, 0.03 * e(t)] }; },
  // Pyro-Core: a deep rumble that shakes it, the core flaring
  rumble: (a, b, e) => ({ rigR: (t) => [0.02 * sin(t * 47) * e(t), 0, 0.03 * sin(t * 41) * e(t)], body: (t) => [0.04 * e(t), -0.03 * e(t), 0.04 * e(t)], armL: (t) => [0.2 * e(t), 0, 0], armR: (t) => [0.2 * e(t), 0, 0] }),
  // Acinus: shakes its berry bush like a wet dog
  shake: (a, b, e) => ({ rigR: (t) => [0, 0, 0.1 * sin(t * 30) * e(t)], head: (t) => [0.25 * sin(t * 30 + 1) * e(t), 0, 0], tail: (t) => [0, 0.5 * sin(t * 30) * e(t), 0] }),
  // Sylvaneer: lifts its head high, alert, and scans the treeline
  alert: (a, b, e) => ({ head: (t) => [0, 0.32 * sin(PI * 2 * (t - a) / (b - a)) * e(t), 0.3 * e(t)], tail: (t) => [0, 0, -0.25 * e(t)], legsF: (t) => [0, 0, -0.06 * e(t)] }),
  // Terraflora: rustles its leaves (a quick wobble of the crown)
  rustle: (a, b, e) => ({ head: (t) => [0.14 * sin(t * 18) * e(t), 0.08 * sin(t * 9) * e(t), 0], armL: (t) => [0.2 * e(t), 0, 0.15 * sin(t * 9) * e(t)], armR: (t) => [0.2 * e(t), 0, 0.15 * sin(t * 9 + 2) * e(t)] }),
  // Emberix: a happy tail wag and a curious head tilt
  wag: (a, b, e) => ({ tail: (t) => [0, 0.6 * sin(t * 26) * e(t), -0.3 * e(t)], head: (t) => [0.3 * e(t), 0.1 * e(t), 0.08 * e(t)], rigP: (t) => [0, 0.015 * Math.abs(sin(t * 13)) * e(t), 0] }),
  // Pyrokai: shadow-boxes: jab, jab, cross
  shadowbox: (a, b, e) => { const w = (b - a) / 3, j = (i) => (t) => bump(t, a + i * w, a + i * w + w * 0.8); return { armR: (t) => [0, 0, 1.1 * (j(0)(t) + j(2)(t))], armL: (t) => [0, 0, 1.1 * j(1)(t)], rigR: (t) => [0, 0.15 * (j(0)(t) + j(2)(t) - j(1)(t)), 0], head: (t) => [0, 0, -0.08 * e(t)] }; },
  // Igniflare: stretches its wings wide with a smoky yawn
  wingstretch: (a, b, e) => ({ wings: (t) => [0.7 * e(t), 0.1 * e(t), 0.15 * e(t)], head: (t) => [0, 0, 0.25 * e(t)], jaw: (t) => [0, 0, -0.45 * bump(t, a + (b - a) * 0.3, b)], lids: (t) => 0.5 * bump(t, a + (b - a) * 0.3, b) }),
  // Pyro-Phoenix: a restless flutter and a little hop
  flutter: (a, b, e) => ({ wings: (t) => [0.6 * Math.abs(sin(PI * 6 * (t - a) / (b - a))) * e(t), 0, 0], rigP: (t) => [0, 0.06 * e(t), 0], tail: (t) => [0, 0.25 * sin(t * 20) * e(t), 0] }),
  // Zephyr: preens the feathers of its left wing
  preen: (a, b, e) => ({ head: (t) => [0.15 * e(t), -0.75 * e(t), -0.2 * e(t)], wings: (t) => [0.18 * e(t), 0, 0], jaw: (t) => [0, 0, -0.15 * sin(t * 24) ** 2 * e(t)] }),
  // Voltar: juggles (arms up in turn), hat bobbing
  juggle: (a, b, e) => { const w = (b - a) / 4, up = (i) => (t) => bump(t, a + i * w, a + (i + 1.4) * w); return { armL: (t) => [0, 0, 1.2 * (up(0)(t) + up(2)(t))], armR: (t) => [0, 0, 1.2 * (up(1)(t) + up(3)(t) * 0.8)], head: (t) => [0.12 * sin(t * 12) * e(t), 0, 0.12 * e(t)], rigP: (t) => [0, 0.03 * Math.abs(sin(PI * 4 * (t - a) / (b - a))) * e(t), 0] }; },
  // Zeep: tilts its head with a curious beep and taps a foot
  beep: (a, b, e) => ({ head: (t) => [0.35 * e(t), 0.15 * e(t), 0.05 * e(t)], legsF: (t) => [0, 0, 0.18 * Math.abs(sin(PI * 4 * (t - a) / (b - a))) * e(t)] }),
  // Lumi: a slow twirl (half a turn and back) with a lift
  twirl: (a, b, e) => ({ rigR: (t) => [0, PI * ease(Math.min(1, Math.max(0, (t - a) / (b - a)))) * (1 - ease(Math.min(1, Math.max(0, (t - a - (b - a) * 0.5) / ((b - a) * 0.5))))) * 0.9, 0], rigP: (t) => [0, 0.05 * e(t), 0], wings: (t) => [0.3 * e(t), 0, 0] }),
  // Meta: tilts its head and waves hello
  tilt: (a, b, e) => ({ head: (t) => [0.3 * e(t), 0.15 * e(t), 0], armR: (t) => [0.45 * e(t), 0, (1.3 + 0.25 * sin(t * 16)) * e(t)], hair: (t) => [0.15 * e(t), 0.15 * sin(t * 8) * e(t), 0] }),
  // Atem: a tactical scan, blade arm half raised
  scan: (a, b, e) => ({ head: (t) => [0, 0.5 * sin(PI * 2 * (t - a) / (b - a)) * e(t), 0], armR: (t) => [0, 0, 0.4 * e(t)], rigR: (t) => [0, 0.08 * sin(PI * 2 * (t - a) / (b - a)) * e(t), 0] }),
};

/* ------------------------------------------------------------------ attacks (0.9 s, the rig peaks forward at 0.34 s) */
const lungeP = (c, peak, up) => c.rigP([[0, Z3], [0.16, [0, 0, -0.1 * c.lunge]], [0.34, [0, (up || 0.06) * c.lunge, peak * c.lunge]], [0.52, [0, 0, peak * 0.55 * c.lunge]], [0.9, Z3]]);
const ATTACK = {
  // Lumifern: squashes down, then a happy hop-bump into the foe
  hop: (c) => [c.rigP([[0, Z3], [0.16, [0, -0.02, -0.06]], [0.26, [0, 0.12 * c.A, 0.2]], [0.34, [0, 0.03, 0.4 * c.lunge]], [0.52, [0, 0, 0.2]], [0.9, Z3]]),
    c.body([[0, O3], [0.16, [1.14, 0.84, 1.14]], [0.28, [0.92, 1.12, 0.92]], [0.36, [1.1, 0.9, 1.1]], [0.9, O3]]), c.ears([[0, Z3], [0.16, [0, 0, -0.6]], [0.5, [0, 0, -0.3]], [0.9, Z3]]),
    c.hd([[0, Z3], [0.16, [0, 0, 0.15]], [0.34, [0, 0, -0.2]], [0.9, Z3]]), c.tail([[0, Z3], [0.16, [0, 0, 0.4]], [0.34, [0, 0, -0.4]], [0.9, Z3]]), c.lids([[0, 0], [0.1, 0.45], [0.36, 0.45], [0.5, 0], [0.9, 0]])],
  // Umbrit II / III: coils, then a quick pounce and bite
  pounce: (c) => [lungeP(c, 0.42, 0.1), c.rigR([[0, Z3], [0.16, [-0.14, 0, 0]], [0.34, [0.22, 0, 0]], [0.55, [0.06, 0, 0]], [0.9, Z3]]),
    c.body([[0, O3], [0.16, [1.1, 0.86, 1.1]], [0.3, [0.92, 1.12, 0.92]], [0.9, O3]]), c.hd([[0, Z3], [0.16, [0, 0, 0.2]], [0.34, [0, 0, -0.22]], [0.9, Z3]]),
    c.ears([[0, Z3], [0.16, [0, 0, -0.6]], [0.5, [0, 0, -0.4]], [0.9, Z3]]), c.tail([[0, Z3], [0.16, [0, 0, 0.5]], [0.34, [0, 0, -0.4]], [0.9, Z3]]), c.lids([[0, 0], [0.12, 0.45], [0.34, 0.45], [0.5, 0], [0.9, 0]])],
  // four-legged bite (Emberix, Igniflare): crouch, spring, jaws snap at the contact
  bite: (c) => [lungeP(c, 0.42, 0.08), c.rigR([[0, Z3], [0.16, [-0.12, 0, 0]], [0.34, [0.18, 0, 0]], [0.55, [0.04, 0, 0]], [0.9, Z3]]),
    c.hd([[0, Z3], [0.16, [0, 0, 0.25]], [0.34, [0, 0, -0.25]], [0.55, [0, 0, -0.08]], [0.9, Z3]]), c.jw([[0, Z3], [0.22, [0, 0, -0.5]], [0.34, [0, 0, -0.05]], [0.42, [0, 0, -0.3]], [0.6, Z3], [0.9, Z3]]),
    c.legsQ([[0, Z3], [0.16, [0, 0, -0.15]], [0.34, [0, 0, 0.4]], [0.6, Z3], [0.9, Z3]], [[0, Z3], [0.16, [0, 0, 0.2]], [0.34, [0, 0, -0.3]], [0.6, Z3], [0.9, Z3]]),
    c.wings([[0, Z3], [0.16, [0.35, 0, 0]], [0.34, [-0.1, 0, 0]], [0.9, Z3]]), c.tail([[0, Z3], [0.16, [0, 0, 0.4]], [0.34, [0, 0, -0.45]], [0.9, Z3]]),
    c.body([[0, O3], [0.16, [1.08, 0.9, 1.08]], [0.3, [0.94, 1.08, 0.94]], [0.9, O3]]), c.lids([[0, 0], [0.3, 0.3], [0.42, 0.3], [0.55, 0], [0.9, 0]])],
  // head down and charge (Acinus, Zeep): the skull or shell leads
  headbutt: (c) => [lungeP(c, 0.38, 0.02), c.rigR([[0, Z3], [0.18, [0.14, 0, 0]], [0.34, [0.2, 0, 0]], [0.5, [0.05, 0, 0]], [0.9, Z3]]),
    c.hd([[0, Z3], [0.18, [0, 0, -0.35]], [0.34, [0, 0, -0.28]], [0.46, [0, 0, 0.2]], [0.7, Z3], [0.9, Z3]]),
    c.legsQ([[0, Z3], [0.18, [0, 0, -0.2]], [0.34, [0, 0, 0.3]], [0.6, Z3], [0.9, Z3]], [[0, Z3], [0.18, [0, 0, 0.25]], [0.34, [0, 0, -0.25]], [0.6, Z3], [0.9, Z3]]),
    c.tail([[0, Z3], [0.18, [0, 0, -0.3]], [0.5, Z3], [0.9, Z3]]), c.lids([[0, 0], [0.2, 0.5], [0.4, 0.5], [0.55, 0], [0.9, 0]])],
  // Sylvaneer: lowers its antlers and sweeps them up through the foe
  antler: (c) => [lungeP(c, 0.36, 0.04), c.rigR([[0, Z3], [0.18, [0.16, 0, 0]], [0.34, [0.08, 0, 0]], [0.9, Z3]]),
    c.hd([[0, Z3], [0.2, [0, 0.15, -0.45]], [0.34, [0, -0.1, 0.3]], [0.55, [0, 0, 0.1]], [0.9, Z3]]),
    c.legsQ([[0, Z3], [0.18, [0, 0, -0.15]], [0.34, [0, 0, 0.3]], [0.6, Z3], [0.9, Z3]], [[0, Z3], [0.18, [0, 0, 0.2]], [0.34, [0, 0, -0.25]], [0.6, Z3], [0.9, Z3]]),
    c.tail([[0, Z3], [0.3, [0, 0, -0.35]], [0.9, Z3]])],
  // Zeep: a short ram with its round head
  ram: (c) => [lungeP(c, 0.34, 0.02), c.hd([[0, Z3], [0.18, [0, 0, 0.2]], [0.34, [0, 0, -0.2]], [0.5, Z3], [0.9, Z3]]),
    c.legsQ([[0, Z3], [0.16, [0, 0, -0.2]], [0.34, [0, 0, 0.3]], [0.6, Z3], [0.9, Z3]]), c.body([[0, O3], [0.16, [1.06, 0.92, 1.06]], [0.34, [0.95, 1.06, 0.95]], [0.9, O3]]), c.lids([[0, 0], [0.3, 0.6], [0.42, 0.6], [0.55, 0], [0.9, 0]])],
  // Kairyu: a wide arm swipe with a lean
  swipe: (c) => [lungeP(c, 0.3, 0.06), c.rigR([[0, Z3], [0.18, [0, -0.3, 0]], [0.36, [0.1, 0.25, 0]], [0.9, Z3]]),
    c.armsK([[0, Z3], [0.36, [0, 0, -0.2]], [0.9, Z3]], [[0, Z3], [0.18, [0.5, 0, 1.2]], [0.34, [-0.3, 0, -0.1]], [0.55, [0, 0, 0.1]], [0.9, Z3]]),
    c.hd([[0, Z3], [0.18, [0, 0.2, 0.1]], [0.34, [0, -0.15, -0.1]], [0.9, Z3]]), c.jw([[0, Z3], [0.3, [0, 0, -0.3]], [0.5, Z3], [0.9, Z3]]), c.tail([[0, Z3], [0.18, [0, 0.4, 0]], [0.36, [0, -0.4, 0]], [0.9, Z3]])],
  // a straight punch (Gaiaroki, Pyrokai, Pyro-Core): pull back, drive the fist forward
  punch: (c) => [lungeP(c, 0.28, 0.02), c.rigR([[0, Z3], [0.18, [0, 0.25, 0]], [0.34, [0.08, -0.2, 0]], [0.9, Z3]]),
    c.armsK([[0, Z3], [0.18, [0, 0, 0.2]], [0.34, [0, 0, -0.3]], [0.9, Z3]], [[0, Z3], [0.18, [0, 0, -0.5]], [0.34, [0, 0, 1.15]], [0.5, [0, 0, 0.55]], [0.9, Z3]]),
    c.hd([[0, Z3], [0.2, [0, 0, -0.1]], [0.4, Z3], [0.9, Z3]]), c.jw([[0, Z3], [0.32, [0, 0, -0.3]], [0.5, Z3], [0.9, Z3]]), c.body([[0, O3], [0.18, [1.05, 0.95, 1.05]], [0.34, [0.97, 1.04, 0.97]], [0.9, O3]])],
  // Voltar: a cheeky quick jab with a hop
  jab: (c) => [c.rigP([[0, Z3], [0.14, [0, 0.06, -0.05]], [0.34, [0, 0.02, 0.36 * c.lunge]], [0.5, [0, 0, 0.18]], [0.9, Z3]]), c.rigR([[0, Z3], [0.16, [0, 0.3, 0]], [0.34, [0.1, -0.2, 0]], [0.9, Z3]]),
    c.armsK([[0, Z3], [0.16, [0.6, 0, 1.2]], [0.5, [0.3, 0, 0.6]], [0.9, Z3]], [[0, Z3], [0.16, [0, 0, -0.5]], [0.34, [0, 0, 1.25]], [0.5, [0, 0, 0.5]], [0.9, Z3]]),
    c.hd([[0, Z3], [0.16, [0.25, 0, 0.1]], [0.34, [-0.15, 0, -0.1]], [0.9, Z3]]), c.legs2([[0, Z3], [0.16, [0, 0, 0.3]], [0.34, [0, 0, -0.2]], [0.9, Z3]])],
  // Atem: raises its blade arm and cuts down across the foe
  slash: (c) => [lungeP(c, 0.32, 0.04), c.rigR([[0, Z3], [0.2, [-0.06, 0.35, 0]], [0.36, [0.12, -0.3, 0]], [0.9, Z3]]),
    c.armsK([[0, Z3], [0.2, [0, 0, 0.3]], [0.36, [0, 0, -0.2]], [0.9, Z3]], [[0, Z3], [0.2, [0.4, 0, 1.5]], [0.34, [-0.2, 0, -0.25]], [0.55, [0, 0, 0.1]], [0.9, Z3]]),
    c.hd([[0, Z3], [0.2, [0, 0.2, 0.1]], [0.34, [0, -0.2, -0.1]], [0.9, Z3]])],
  // a lunge with a raking claw (Zephyr: fore leg; bipeds: arm)
  claw: (c) => [lungeP(c, 0.38, 0.1), c.rigR([[0, Z3], [0.16, [-0.2, 0, 0]], [0.34, [0.2, 0, 0]], [0.9, Z3]]),
    c.R('legFR', [[0, Z3], [0.18, [0, 0, 1.1]], [0.34, [0, 0, -0.2]], [0.6, Z3], [0.9, Z3]]), c.R('legFL', [[0, Z3], [0.24, [0, 0, 0.7]], [0.4, [0, 0, -0.1]], [0.6, Z3], [0.9, Z3]]),
    c.wings([[0, Z3], [0.16, [0.6, 0, 0]], [0.34, [0.1, 0, 0]], [0.9, Z3]]), c.hd([[0, Z3], [0.16, [0, 0, 0.25]], [0.34, [0, 0, -0.2]], [0.9, Z3]]), c.jw([[0, Z3], [0.3, [0, 0, -0.3]], [0.5, Z3], [0.9, Z3]]), c.tail([[0, Z3], [0.16, [0, 0, 0.3]], [0.34, [0, 0, -0.3]], [0.9, Z3]])],
  // Aquaflora (and Meta): draws back, then strikes like a serpent / with a straight arm
  strike: (c) => [lungeP(c, 0.34, 0.04), c.neck([[0, Z3], [0.18, [0, 0, 0.3]], [0.34, [0, 0, -0.25]], [0.6, [0, 0, -0.05]], [0.9, Z3]]),
    c.hd([[0, Z3], [0.18, [0, 0, 0.3]], [0.34, [0, 0, -0.3]], [0.6, Z3], [0.9, Z3]]), c.jw([[0, Z3], [0.24, [0, 0, -0.5]], [0.36, [0, 0, -0.1]], [0.6, Z3], [0.9, Z3]]),
    c.armsK([[0, Z3], [0.18, [0, 0, 0.2]], [0.34, [0, 0, -0.2]], [0.9, Z3]], [[0, Z3], [0.18, [0, 0, -0.4]], [0.34, [0, 0, 1.3]], [0.55, [0, 0, 0.5]], [0.9, Z3]]),
    c.legsQ([[0, Z3], [0.18, [0, 0, -0.1]], [0.34, [0, 0, 0.25]], [0.6, Z3], [0.9, Z3]]), c.tail([[0, Z3], [0.18, [0, 0.3, 0]], [0.34, [0, -0.3, 0]], [0.9, Z3]])],
  // Pyro-Phoenix: wings flare, then a diving peck
  peck: (c) => [lungeP(c, 0.42, 0.12), c.rigR([[0, Z3], [0.16, [-0.25, 0, 0]], [0.34, [0.3, 0, 0]], [0.55, [0.05, 0, 0]], [0.9, Z3]]),
    c.hd([[0, Z3], [0.16, [0, 0, 0.35]], [0.34, [0, 0, -0.45]], [0.5, [0, 0, -0.1]], [0.9, Z3]]), c.wings([[0, Z3], [0.16, [0.7, 0, 0.1]], [0.34, [0.05, 0, -0.1]], [0.55, [0.3, 0, 0]], [0.9, Z3]]),
    c.legs2([[0, Z3], [0.2, [0, 0, -0.4]], [0.5, Z3], [0.9, Z3]]), c.tail([[0, Z3], [0.2, [0, 0, -0.35]], [0.9, Z3]])],
  // Cannonis II / III: aims, leans into the shot, the barrel kicks back
  fire: (c) => [c.rigP([[0, Z3], [0.2, [0, -0.02, -0.03]], [0.34, [0, 0, 0.06]], [0.46, [0, 0, -0.05]], [0.9, Z3]]),
    c.R('cannon', [[0, Z3], [0.2, [0, 0, -0.18]], [0.34, [0, 0, -0.14]], [0.44, [0, 0, 0.06]], [0.9, Z3]]), c.Pv('cannon', [[0, Z3], [0.32, Z3], [0.38, [-2.1, -1.3, 0]], [0.6, [-0.45, -0.25, 0]], [0.9, Z3]]),
    c.hd([[0, Z3], [0.2, [0, 0, -0.1]], [0.4, [0, 0, 0.05]], [0.9, Z3]]), c.lids([[0, 0], [0.34, 0], [0.38, 0.6], [0.5, 0], [0.9, 0]])],
  // Lumi: bobs forward and pulses (the light leaves it at the contact)
  pulse: (c) => [c.rigP([[0, Z3], [0.18, [0, 0.06, -0.05]], [0.34, [0, 0.02, 0.2 * c.lunge]], [0.6, [0, 0.02, 0.05]], [0.9, Z3]]),
    c.body([[0, O3], [0.2, [0.92, 0.92, 0.92]], [0.34, [1.12, 1.12, 1.12]], [0.5, [0.98, 0.98, 0.98]], [0.9, O3]]), c.wings([[0, Z3], [0.18, [0.5, 0, 0]], [0.34, [-0.1, 0, 0]], [0.9, Z3]]), c.lids([[0, 0], [0.3, 0.4], [0.4, 0.4], [0.55, 0], [0.9, 0]])],
  // Terraflora: a swing of the crown (first form) or of a branch arm
  swing: (c) => [lungeP(c, c.arms ? 0.3 : 0.22, 0.02), c.hd(c.arms ? [[0, Z3], [0.2, [0, 0.1, 0.1]], [0.34, [0, -0.1, -0.15]], [0.9, Z3]] : [[0, Z3], [0.2, [0.2, 0.35, 0.25]], [0.34, [-0.2, -0.3, -0.35]], [0.55, [0, 0, -0.1]], [0.9, Z3]]),
    c.armsK([[0, Z3], [0.2, [0.2, 0, 0.3]], [0.36, [0, 0, -0.2]], [0.9, Z3]], [[0, Z3], [0.2, [0.6, 0, 1.3]], [0.34, [-0.2, 0, -0.2]], [0.55, [0, 0, 0.1]], [0.9, Z3]]), c.rigR([[0, Z3], [0.2, [0, -0.2, 0]], [0.36, [0.06, 0.2, 0]], [0.9, Z3]])],
};

/* ------------------------------------------------------------------ specials (1.1 s, the rig peaks forward at 0.40 s) */
const castP = (c, up, fwd) => c.rigP([[0, Z3], [0.28, [0, up * c.A, -0.06]], [0.4, [0, up * 0.6 * c.A, fwd * c.lunge]], [0.7, [0, 0.03, fwd * 0.3]], [1.1, Z3]]);
const rearUp = (c, jaw) => [c.rigP([[0, Z3], [0.26, [0, 0.12 * c.A, -0.04]], [0.4, [0, -0.03, 0.12 * c.lunge]], [0.6, [0, 0, 0.04]], [1.1, Z3]]),
  c.rigR([[0, Z3], [0.26, [-0.3 * c.G, 0, 0]], [0.4, [0.1, 0, 0]], [0.6, [0.02, 0, 0]], [1.1, Z3]]),
  c.legsQ([[0, Z3], [0.26, [0, 0, 0.55]], [0.4, [0, 0, -0.1]], [1.1, Z3]], [[0, Z3], [0.26, [0, 0, -0.2]], [0.4, Z3], [1.1, Z3]]),
  c.hd([[0, Z3], [0.26, [0, 0, 0.32]], [0.42, [0, 0, -0.15]], [0.7, [0, 0, -0.05]], [1.1, Z3]]),
  jaw ? c.jw([[0, Z3], [0.18, [0, 0, -0.55]], [0.6, [0, 0, -0.55]], [0.8, Z3], [1.1, Z3]]) : [],
  c.wings([[0, Z3], [0.26, [0.65, 0, 0.1]], [0.42, [0.15, 0, 0]], [0.8, [0.3, 0, 0]], [1.1, Z3]]), c.tail([[0, Z3], [0.26, [0, 0, 0.4]], [0.42, [0, 0, -0.35]], [1.1, Z3]]),
  c.body([[0, O3], [0.26, [0.96, 1.06, 0.96]], [0.42, [1.08, 0.92, 1.08]], [0.6, O3], [1.1, O3]])];
const swell = (c, extra) => [castP(c, 0.15, 0.15), c.rigR([[0, Z3], [0.28, [-0.16, 0, 0]], [0.4, [0.1, 0, 0]], [1.1, Z3]]),
  c.body([[0, O3], [0.28, [1.1, 1.12, 1.1]], [0.42, [0.96, 1.04, 0.96]], [0.7, O3], [1.1, O3]]),
  c.armsK([[0, Z3], [0.28, [0.65, 0, 0.5]], [0.4, [0.1, 0, 1.0]], [0.7, [0.1, 0, 0.4]], [1.1, Z3]]), c.wings([[0, Z3], [0.28, [0.6, 0, 0.1]], [0.45, [0.2, 0, 0]], [1.1, Z3]]),
  c.ears([[0, Z3], [0.28, [0.35, 0, 0.25]], [0.45, [0.25, 0, 0.1]], [1.1, Z3]]), c.hd([[0, Z3], [0.28, [0, 0, 0.2]], [0.42, [0, 0, -0.15]], [1.1, Z3]]),
  c.neck([[0, Z3], [0.28, [0, 0, 0.3]], [0.42, [0, 0, -0.15]], [1.1, Z3]]), c.tail([[0, Z3], [0.28, [0, 0.5, 0.3]], [0.5, [0, -0.4, 0]], [1.1, Z3]]),
  c.lids([[0, 0], [0.2, 0.5], [0.38, 0.5], [0.5, 0], [1.1, 0]])].concat(extra || []);
const leapIn = (c, h) => [c.rigP([[0, Z3], [0.12, [0, -0.04, -0.04]], [0.26, [0, h * c.A, 0.06]], [0.4, [0, 0.02, 0.3 * c.lunge]], [0.55, [0, 0, 0.18]], [1.1, Z3]]),
  c.rigR([[0, Z3], [0.26, [-0.25, 0, 0]], [0.4, [0.3, 0, 0]], [0.6, [0.05, 0, 0]], [1.1, Z3]]), c.wings([[0, Z3], [0.2, [0.75, 0, 0.1]], [0.36, [-0.2, 0, 0]], [0.6, [0.3, 0, 0]], [1.1, Z3]]),
  c.allLegs([[0, Z3], [0.26, [0, 0, -0.5]], [0.42, [0, 0, 0.3]], [0.7, Z3], [1.1, Z3]]), c.armsK([[0, Z3], [0.26, [0.4, 0, 1.3]], [0.4, [0, 0, -0.3]], [0.7, Z3], [1.1, Z3]]),
  c.hd([[0, Z3], [0.26, [0, 0, 0.25]], [0.4, [0, 0, -0.3]], [0.7, Z3], [1.1, Z3]]), c.jw([[0, Z3], [0.3, [0, 0, -0.45]], [0.6, Z3], [1.1, Z3]]), c.tail([[0, Z3], [0.26, [0, 0, -0.5]], [0.42, [0, 0, 0.3]], [1.1, Z3]]),
  c.body([[0, O3], [0.12, [1.1, 0.88, 1.1]], [0.26, [0.92, 1.1, 0.92]], [0.42, [1.1, 0.9, 1.1]], [0.6, O3], [1.1, O3]])];
const SPECIAL = {
  bloom: (c) => swell(c),                                // Lumifern: rises, ears spread, glowing; the light goes out at 0.40
  veil: (c) => swell(c),                                 // Umbrit II / III
  grow: (c) => swell(c, [c.hd([[0, Z3], [0.28, [0.15, 0, 0.3]], [0.42, [0, 0, -0.1]], [1.1, Z3]])]),
  channel: (c) => swell(c, [c.R('hair', [[0, Z3], [0.28, [0.5, 0, 0.3]], [0.5, [0.2, 0, 0.1]], [1.1, Z3]])]),
  radiate: (c) => [castP(c, 0.2, 0.12), c.body([[0, O3], [0.28, [1.16, 1.16, 1.16]], [0.42, [0.94, 0.94, 0.94]], [0.6, [1.04, 1.04, 1.04]], [1.1, O3]]),
    c.wings([[0, Z3], [0.28, [0.8, 0, 0.1]], [0.42, [0, 0, 0]], [0.6, [0.4, 0, 0]], [1.1, Z3]]), c.rigR([[0, Z3], [0.28, [0, 0.6, 0]], [0.42, [0, 0, 0]], [1.1, Z3]]), c.lids([[0, 0], [0.2, 0.6], [0.36, 0.6], [0.46, 0], [1.1, 0]])],
  bow: (c) => [castP(c, 0.06, 0.18), c.rigR([[0, Z3], [0.2, [0.35, 0, 0]], [0.32, [-0.15, 0, 0]], [0.42, [0.1, 0, 0]], [1.1, Z3]]),
    c.armsK([[0, Z3], [0.2, [0.9, 0, -0.2]], [0.34, [0.6, 0, 1.4]], [0.42, [0.2, 0, 1.0]], [0.7, [0.2, 0, 0.4]], [1.1, Z3]]),
    c.hd([[0, Z3], [0.2, [0, 0, -0.35]], [0.34, [0.2, 0, 0.2]], [0.6, Z3], [1.1, Z3]]), c.legs2([[0, Z3], [0.2, [0, 0, 0.3]], [0.4, Z3], [1.1, Z3]], [[0, Z3], [0.2, [0, 0, -0.3]], [0.4, Z3], [1.1, Z3]])],
  charge: (c) => [castP(c, 0.04, 0.16), c.body([[0, O3], [0.1, [1.04, 0.96, 1.04]], [0.2, [0.97, 1.03, 0.97]], [0.3, [1.06, 0.94, 1.06]], [0.42, [0.95, 1.06, 0.95]], [0.7, O3], [1.1, O3]]),
    c.hd([[0, Z3], [0.28, [0, 0, 0.3]], [0.42, [0, 0, -0.25]], [0.7, Z3], [1.1, Z3]]), c.legsQ([[0, Z3], [0.3, [0, 0, -0.15]], [0.42, [0, 0, 0.2]], [0.7, Z3], [1.1, Z3]]), c.tail([[0, Z3], [0.3, [0, 0, -0.4]], [0.6, Z3], [1.1, Z3]])],
  rise: (c) => [castP(c, 0.1, 0.18), c.neck([[0, Z3], [0.28, [0, 0, 0.45]], [0.4, [0, 0, -0.3]], [0.7, [0, 0, -0.05]], [1.1, Z3]]),
    c.hd([[0, Z3], [0.28, [0, 0, 0.35]], [0.4, [0, 0, -0.35]], [0.7, Z3], [1.1, Z3]]), c.jw([[0, Z3], [0.22, [0, 0, -0.55]], [0.6, [0, 0, -0.4]], [0.8, Z3], [1.1, Z3]]),
    c.legsQ([[0, Z3], [0.28, [0, 0, 0.35]], [0.42, [0, 0, -0.05]], [1.1, Z3]]), c.tail([[0, Z3], [0.28, [0, 0.4, 0.2]], [0.5, [0, -0.3, 0]], [1.1, Z3]]), c.rigR([[0, Z3], [0.28, [-0.12 * c.G, 0, 0]], [0.42, [0.08, 0, 0]], [1.1, Z3]])],
  rear: (c) => rearUp(c, false),                         // Sylvaneer: rears gracefully and strikes the ground
  stomp: (c) => (c.quad ? rearUp(c, false) : [c.rigP([[0, Z3], [0.26, [0, 0.06 * c.A, -0.03]], [0.4, [0, -0.05, 0.1 * c.lunge]], [0.6, [0, 0, 0.03]], [1.1, Z3]]),
    c.armsK([[0, Z3], [0.26, [0.3, 0, 1.4]], [0.4, [0, 0, -0.25]], [0.7, Z3], [1.1, Z3]]), c.legs2([[0, Z3], [0.26, [0, 0, 0.5]], [0.4, [0, 0, -0.1]], [0.7, Z3], [1.1, Z3]], [[0, Z3], [0.4, Z3], [1.1, Z3]]),
    c.hd([[0, Z3], [0.26, [0, 0, 0.25]], [0.42, [0, 0, -0.2]], [1.1, Z3]]), c.body([[0, O3], [0.26, [0.95, 1.07, 0.95]], [0.42, [1.1, 0.88, 1.1]], [0.65, O3], [1.1, O3]])]),
  flare: (c) => rearUp(c, true),                          // Emberix: rears, roars, the flames flare
  breath: (c) => rearUp(c, true),                         // Igniflare: rears with wings flared, breathes fire at 0.40
  rearfire: (c) => [...rearUp(c, true), c.R('cannon', [[0, Z3], [0.26, [0, 0, 0.12]], [0.42, [0, 0, -0.1]], [1.1, Z3]]), c.Pv('cannon', [[0, Z3], [0.42, Z3], [0.48, [-2.6, -1.5, 0]], [0.75, [-0.5, -0.3, 0]], [1.1, Z3]])],
  slam: (c) => [c.rigP([[0, Z3], [0.26, [0, 0.08 * c.A, -0.04]], [0.4, [0, -0.06, 0.1 * c.lunge]], [0.6, [0, 0, 0.03]], [1.1, Z3]]),
    c.armsK([[0, Z3], [0.26, [0.25, 0, 1.5 * c.G]], [0.4, [0, 0, -0.3]], [0.65, [0, 0, -0.1]], [1.1, Z3]]), c.hd([[0, Z3], [0.26, [0, 0, 0.3]], [0.42, [0, 0, -0.25]], [1.1, Z3]]),
    c.jw([[0, Z3], [0.2, [0, 0, -0.5]], [0.5, [0, 0, -0.5]], [0.7, Z3], [1.1, Z3]]), c.rigR([[0, Z3], [0.26, [-0.15, 0, 0]], [0.4, [0.22, 0, 0]], [0.65, Z3], [1.1, Z3]]),
    c.body([[0, O3], [0.26, [0.96, 1.06, 0.96]], [0.42, [1.12, 0.86, 1.12]], [0.65, O3], [1.1, O3]])],
  surf: (c) => leapIn(c, 0.32),                           // Kairyu: leaps on a wave and comes down on the foe
  leap: (c) => leapIn(c, 0.36),                           // Pyrokai
  soar: (c) => leapIn(c, 0.42),                           // Pyro-Phoenix
  dive: (c) => leapIn(c, 0.42),                           // Zephyr
  cross: (c) => [castP(c, 0.04, 0.3), c.armsK([[0, Z3], [0.26, [0.5, 0, 1.5]], [0.4, [-0.35, 0, -0.2]], [0.65, [0, 0, 0.1]], [1.1, Z3]]),
    c.rigR([[0, Z3], [0.26, [-0.15, 0, 0]], [0.4, [0.18, 0, 0]], [1.1, Z3]]), c.hd([[0, Z3], [0.26, [0, 0, 0.2]], [0.42, [0, 0, -0.2]], [1.1, Z3]]), c.legs2([[0, Z3], [0.26, [0, 0, 0.3]], [0.4, [0, 0, -0.2]], [0.8, Z3], [1.1, Z3]], [[0, Z3], [0.4, [0, 0, 0.2]], [1.1, Z3]])],
};

/* ------------------------------------------------------------------ victories (1.6 s) */
const hopsP = (c, h1, h2) => c.rigP([[0, Z3], [0.2, [0, h1 * c.A, 0]], [0.4, Z3], [0.6, [0, h2 * c.A, 0]], [0.82, Z3], [1.6, Z3]]);
const happyLids = (c) => c.lids([[0, 0], [0.3, 0.7], [1.0, 0.7], [1.2, 0], [1.6, 0]]);
const VICTORY = {
  hops: (c) => [hopsP(c, 0.2, 0.26), c.body([[0, O3], [0.05, [1.12, 0.86, 1.12]], [0.2, [0.92, 1.1, 0.92]], [0.42, [1.1, 0.88, 1.1]], [0.6, [0.92, 1.1, 0.92]], [0.85, [1.08, 0.9, 1.08]], [1.1, O3], [1.6, O3]]),
    c.ears(c.F(1.6, 8, (t) => [0.3 * sin(t / 1.6 * TAU * 4), 0, 0.1 * sin(t / 1.6 * TAU * 2)])), c.tail(c.F(1.6, 8, (t) => [0, 0.6 * sin(t / 1.6 * TAU * 3), 0])), c.hd([[0, Z3], [0.3, [0, 0, 0.2]], [1.2, [0, 0, 0.2]], [1.6, Z3]]), happyLids(c)],
  spin: (c) => [hopsP(c, 0.2, 0.28), c.rigR([[0, Z3], [0.6, Z3], [0.82, [0, 1.3, 0]], [1.05, [0, 1.3, 0]], [1.35, Z3], [1.6, Z3]]), c.ears(c.F(1.6, 8, (t) => [0.3 * sin(t / 1.6 * TAU * 4), 0, 0])), c.tail(c.F(1.6, 8, (t) => [0, 0.6 * sin(t / 1.6 * TAU * 3), 0])), happyLids(c)],
  salute: (c) => [c.rigR([[0, Z3], [0.3, [-0.22, 0, 0]], [0.55, [0.05, 0, 0]], [0.75, Z3], [1.6, Z3]]), c.rigP([[0, Z3], [0.3, [0, 0.1, 0]], [0.55, [0, -0.02, 0]], [0.75, Z3], [1.6, Z3]]),
    c.jw([[0, Z3], [0.2, [0, 0, -0.55]], [0.6, [0, 0, -0.55]], [0.8, Z3], [1.6, Z3]]), c.hd([[0, Z3], [0.3, [0, 0, 0.35]], [0.7, [0, 0, 0.2]], [1, Z3], [1.6, Z3]]),
    c.R('cannon', [[0, Z3], [0.6, [0, 0, 0.6]], [1.3, [0, 0, 0.6]], [1.6, Z3]]), c.Pv('cannon', [[0, Z3], [0.85, Z3], [0.9, [-2.2, -1.3, 0]], [1.1, [-0.35, -0.2, 0]], [1.6, Z3]]), c.legsQ([[0, Z3], [0.3, [0, 0, 0.4]], [0.55, Z3], [1.6, Z3]], [[0, Z3], [1.6, Z3]])],
  flip: (c) => [c.rigP([[0, Z3], [0.15, [0, -0.04, 0]], [0.45, [0, 0.42 * c.A, 0]], [0.75, Z3], [1.6, Z3]]), c.rigR([[0, Z3], [0.2, Z3], [0.6, [0, 1.4, 0]], [0.9, [0, 1.4, 0]], [1.3, Z3], [1.6, Z3]]),
    c.armsK([[0, Z3], [0.4, [0.4, 0, 1.6]], [0.9, [0.4, 0, 1.6]], [1.3, Z3], [1.6, Z3]]), c.body([[0, O3], [0.15, [1.1, 0.88, 1.1]], [0.4, [0.94, 1.08, 0.94]], [0.78, [1.1, 0.9, 1.1]], [1, O3], [1.6, O3]]),
    c.tail(c.F(1.6, 8, (t) => [0, 0.5 * sin(t / 1.6 * TAU * 2), -0.2])), c.jw([[0, Z3], [0.4, [0, 0, -0.4]], [1.0, [0, 0, -0.4]], [1.2, Z3], [1.6, Z3]]), happyLids(c)],
  coil: (c) => [c.neck(c.F(1.6, 12, (t) => [0, 0.3 * sin(t / 1.6 * TAU * 1.5) * sin(t / 1.6 * PI), 0.35 * sin(t / 1.6 * PI)])), c.hd(c.F(1.6, 12, (t) => [0, -0.25 * sin(t / 1.6 * TAU * 1.5) * sin(t / 1.6 * PI), 0.3 * sin(t / 1.6 * PI)])),
    c.jw([[0, Z3], [0.5, [0, 0, -0.4]], [1.0, [0, 0, -0.4]], [1.2, Z3], [1.6, Z3]]), c.rigP([[0, Z3], [0.6, [0, 0.08, 0]], [1.2, Z3], [1.6, Z3]]), c.tail(c.F(1.6, 8, (t) => [0, 0.4 * sin(t / 1.6 * TAU * 2), 0])), happyLids(c)],
  flex: (c) => [c.armsK([[0, Z3], [0.25, [0.5, 0, 1.6]], [0.5, [0.7, 0, 1.2]], [0.7, [0.5, 0, 1.6]], [0.95, [0.7, 0, 1.2]], [1.3, Z3], [1.6, Z3]]),
    c.rigR([[0, Z3], [0.25, [-0.16, 0, 0]], [1.0, [-0.16, 0, 0]], [1.3, Z3], [1.6, Z3]]), c.hd([[0, Z3], [0.25, [0, 0, 0.3]], [1.0, [0, 0, 0.3]], [1.3, Z3], [1.6, Z3]]),
    c.jw([[0, Z3], [0.25, [0, 0, -0.5]], [0.8, [0, 0, -0.5]], [1.0, Z3], [1.6, Z3]]), c.body([[0, O3], [0.25, [1.06, 1.04, 1.06]], [1.0, [1.06, 1.04, 1.06]], [1.3, O3], [1.6, O3]]), c.rigP([[0, Z3], [0.3, [0, 0.05, 0]], [1.0, [0, 0.05, 0]], [1.3, Z3], [1.6, Z3]])],
  proud: (c) => [c.hd([[0, Z3], [0.3, [0, 0, 0.35]], [1.1, [0, 0, 0.35]], [1.4, Z3], [1.6, Z3]]), c.rigR(c.F(1.6, 16, (t) => [0, 0, 0.08 * sin(t * 28) * bump(t, 0.5, 1.2)])),
    c.tail(c.F(1.6, 12, (t) => [0, 0.5 * sin(t * 20) * bump(t, 0.2, 1.3), -0.3 * bump(t, 0.2, 1.3)])), c.legsQ([[0, Z3], [0.3, [0, 0, -0.08]], [1.2, [0, 0, -0.08]], [1.6, Z3]]), happyLids(c)],
  rearv: (c) => [c.rigR([[0, Z3], [0.4, [-0.32, 0, 0]], [0.9, [-0.32, 0, 0]], [1.2, [0.04, 0, 0]], [1.4, Z3], [1.6, Z3]]), c.rigP([[0, Z3], [0.4, [0, 0.14, 0]], [0.9, [0, 0.14, 0]], [1.2, Z3], [1.6, Z3]]),
    c.legsQ([[0, Z3], [0.4, [0, 0, 0.6]], [0.9, [0, 0, 0.45]], [1.2, Z3], [1.6, Z3]], [[0, Z3], [0.4, [0, 0, -0.2]], [1.2, Z3], [1.6, Z3]]), c.hd([[0, Z3], [0.4, [0, 0, 0.35]], [1.1, [0, 0, 0.25]], [1.4, Z3], [1.6, Z3]]), c.tail([[0, Z3], [0.4, [0, 0, -0.4]], [1.2, Z3], [1.6, Z3]])],
  bloom: (c) => [c.armsK([[0, Z3], [0.4, [0.7, 0, 1.3]], [1.2, [0.7, 0, 1.3]], [1.5, Z3], [1.6, Z3]]), c.hd(c.F(1.6, 12, (t) => [0.15 * sin(t / 1.6 * TAU * 2) * sin(t / 1.6 * PI), 0, 0.25 * sin(t / 1.6 * PI)])),
    c.rigP([[0, Z3], [0.5, [0, 0.06, 0]], [1.2, [0, 0.06, 0]], [1.5, Z3], [1.6, Z3]]), c.body([[0, O3], [0.5, [1.06, 1.06, 1.06]], [1.2, [1.06, 1.06, 1.06]], [1.5, O3], [1.6, O3]]), happyLids(c)],
  roar: (c) => [c.rigR([[0, Z3], [0.35, [-0.28, 0, 0]], [1.0, [-0.2, 0, 0]], [1.3, Z3], [1.6, Z3]]), c.rigP([[0, Z3], [0.35, [0, 0.12, 0]], [1.0, [0, 0.08, 0]], [1.3, Z3], [1.6, Z3]]),
    c.wings([[0, Z3], [0.35, [0.8, 0, 0.15]], [0.6, [0.4, 0, 0]], [0.85, [0.8, 0, 0.15]], [1.3, Z3], [1.6, Z3]]), c.hd([[0, Z3], [0.35, [0, 0, 0.45]], [1.1, [0, 0, 0.35]], [1.4, Z3], [1.6, Z3]]),
    c.jw([[0, Z3], [0.35, [0, 0, -0.6]], [1.0, [0, 0, -0.6]], [1.25, Z3], [1.6, Z3]]), c.legsQ([[0, Z3], [0.35, [0, 0, 0.45]], [1.1, [0, 0, 0.3]], [1.4, Z3], [1.6, Z3]], [[0, Z3], [1.6, Z3]]), c.tail([[0, Z3], [0.35, [0, 0, -0.4]], [1.3, Z3], [1.6, Z3]])],
  flap: (c) => [c.wings(c.F(1.6, 16, (t) => [0.8 * Math.abs(sin(t / 1.6 * TAU * 3)) * (t < 1.4 ? 1 : (1.6 - t) / 0.2), 0, 0])), c.rigP([[0, Z3], [0.3, [0, 0.16, 0]], [0.6, [0, 0.08, 0]], [0.9, [0, 0.18, 0]], [1.3, Z3], [1.6, Z3]]),
    c.hd([[0, Z3], [0.3, [0, 0, 0.35]], [1.2, [0, 0, 0.3]], [1.6, Z3]]), c.tail(c.F(1.6, 8, (t) => [0, 0.3 * sin(t / 1.6 * TAU * 3), 0])), happyLids(c)],
  wingbeat: (c) => [c.wings([[0, Z3], [0.25, [0.8, 0, 0]], [0.45, [0.05, 0, 0]], [0.7, [0.8, 0, 0]], [0.9, [0.05, 0, 0]], [1.2, [0.5, 0, 0]], [1.6, Z3]]), c.rigP([[0, Z3], [0.45, [0, 0.14, 0]], [0.9, [0, 0.08, 0]], [1.3, Z3], [1.6, Z3]]),
    c.hd([[0, Z3], [0.35, [0, 0.2, 0.35]], [1.1, [0, -0.15, 0.3]], [1.4, Z3], [1.6, Z3]]), c.jw([[0, Z3], [0.4, [0, 0, -0.45]], [0.8, [0, 0, -0.45]], [1.0, Z3], [1.6, Z3]]), c.tail([[0, Z3], [0.5, [0, 0, -0.3]], [1.3, Z3], [1.6, Z3]])],
  dance: (c) => [c.rigP(c.F(1.6, 16, (t) => [0.06 * sin(t / 1.6 * TAU * 2) * sin(t / 1.6 * PI), 0.06 * Math.abs(sin(t / 1.6 * TAU * 4)) * sin(t / 1.6 * PI), 0])), c.rigR(c.F(1.6, 16, (t) => [0, 0.4 * sin(t / 1.6 * TAU * 2) * sin(t / 1.6 * PI), 0.1 * sin(t / 1.6 * TAU * 4) * sin(t / 1.6 * PI)])),
    c.armsK(c.F(1.6, 16, (t) => [0.3, 0, (1.2 + 0.4 * sin(t / 1.6 * TAU * 4)) * sin(t / 1.6 * PI)]), c.F(1.6, 16, (t) => [0.3, 0, (1.2 - 0.4 * sin(t / 1.6 * TAU * 4)) * sin(t / 1.6 * PI)])),
    c.hd(c.F(1.6, 16, (t) => [0.25 * sin(t / 1.6 * TAU * 4) * sin(t / 1.6 * PI), 0, 0.15 * sin(t / 1.6 * PI)])), c.legs2(c.F(1.6, 16, (t) => [0, 0, 0.35 * Math.max(0, sin(t / 1.6 * TAU * 2)) * sin(t / 1.6 * PI)]), c.F(1.6, 16, (t) => [0, 0, 0.35 * Math.max(0, -sin(t / 1.6 * TAU * 2)) * sin(t / 1.6 * PI)])), happyLids(c)],
  spinz: (c) => [c.rigR([[0, Z3], [0.3, Z3], [0.75, [0, 1.25, 0]], [1.0, [0, 1.25, 0]], [1.4, Z3], [1.6, Z3]]), c.hd(c.F(1.6, 16, (t) => [0.3 * sin(t / 1.6 * TAU * 3) * sin(t / 1.6 * PI), 0, 0.1 * sin(t / 1.6 * PI)])),
    c.legsQ(c.F(1.6, 16, (t) => [0, 0, 0.2 * Math.abs(sin(t / 1.6 * TAU * 4)) * sin(t / 1.6 * PI)])), c.rigP([[0, Z3], [0.75, [0, 0.06, 0]], [1.2, Z3], [1.6, Z3]]), happyLids(c)],
  twirl: (c) => [c.rigR([[0, Z3], [0.75, [0, PI * 0.95, 0]], [1.45, [0, 0, 0]], [1.6, Z3]]), c.rigP([[0, Z3], [0.6, [0, 0.16, 0]], [1.2, [0, 0.08, 0]], [1.6, Z3]]),
    c.wings(c.F(1.6, 16, (t) => [0.5 * Math.abs(sin(t / 1.6 * TAU * 3)) * sin(t / 1.6 * PI), 0, 0])), c.body([[0, O3], [0.6, [1.06, 1.06, 1.06]], [1.2, O3], [1.6, O3]]), happyLids(c)],
  wave: (c) => [c.armsK([[0, Z3], [1.6, Z3]], c.F(1.6, 16, (t) => [0.4 * sin(t / 1.6 * PI), 0, (1.5 + 0.3 * sin(t / 1.6 * TAU * 4)) * sin(t / 1.6 * PI)])),
    c.hd(c.F(1.6, 12, (t) => [0.25 * sin(t / 1.6 * PI), 0.1 * sin(t / 1.6 * TAU), 0.1 * sin(t / 1.6 * PI)])), c.hair(c.F(1.6, 12, (t) => [0.2 * sin(t / 1.6 * TAU * 2) * sin(t / 1.6 * PI), 0.15 * sin(t / 1.6 * TAU), 0])), c.rigP([[0, Z3], [0.4, [0, 0.04, 0]], [1.2, [0, 0.04, 0]], [1.6, Z3]]), happyLids(c)],
  salutea: (c) => [c.armsK([[0, Z3], [1.6, Z3]], [[0, Z3], [0.35, [0.5, 0, 2.0]], [1.15, [0.5, 0, 2.0]], [1.45, Z3], [1.6, Z3]]), c.rigR([[0, Z3], [0.35, [-0.12, 0, 0]], [1.15, [-0.12, 0, 0]], [1.45, Z3], [1.6, Z3]]),
    c.hd([[0, Z3], [0.35, [0, 0, 0.2]], [1.15, [0, 0, 0.2]], [1.45, Z3], [1.6, Z3]]), c.legs2([[0, Z3], [0.3, [0, 0, 0.1]], [1.2, [0, 0, 0.1]], [1.6, Z3]], [[0, Z3], [1.6, Z3]])],
};

/* ------------------------------------------------------------------ defeats (1.2 s, the final pose is held) */
const shut = (c, a) => c.lids([[0, 0], [a || 0.4, 0.5], [0.9, 1], [1.2, 1]]);
const DEFEAT = {
  curl: (c) => [c.rigP([[0, Z3], [1.2, [0, -0.06, 0]]]), c.rigR([[0, Z3], [1.2, [0.3, 0.15, 0.1]]]), c.body([[0, O3], [0.3, [0.95, 1.05, 0.95]], [1.2, [1.1, 0.78, 1.1]]]), c.hd([[0, Z3], [1.2, [0, 0.1, -0.4]]]),
    c.ears([[0, Z3], [1.2, [0.9, 0, -0.5]]]), c.tail([[0, Z3], [1.2, [0, 0.5, 0.3]]]), c.legs2([[0, Z3], [1.2, [0, 0, 0.4]]]), shut(c)],
  sink: (c) => [c.rigP([[0, Z3], [0.3, [0, 0.06, -0.04]], [1.2, [0, -0.08, 0]]]), c.rigR([[0, Z3], [1.2, [0.32, 0.2, 0.1]]]), c.body([[0, O3], [0.3, [0.95, 1.05, 0.95]], [1.2, [1.1, 0.72, 1.1]]]),
    c.hd([[0, Z3], [1.2, [0, 0.15, -0.45]]]), c.ears([[0, Z3], [1.2, [0.9, 0, -0.5]]]), c.tail([[0, Z3], [1.2, [0, 0.3, -0.5]]]), shut(c, 0.3)],
  fold: (c) => [c.rigP([[0, Z3], [1.2, [0, -0.12, 0]]]), c.rigR([[0, Z3], [1.2, [0.12, 0, 0.06]]]), c.hd([[0, Z3], [1.2, [0, 0.2, -0.45]]]), c.Pv('head', [[0, Z3], [1.2, [-1.4, -1, 0]]]), c.R('cannon', [[0, Z3], [1.2, [0, 0, -0.3]]]),
    c.legsQ([[0, Z3], [1.2, [0, 0, 0.5]]], [[0, Z3], [1.2, [0, 0, -0.4]]]), shut(c, 0.5)],
  slump: (c) => [c.rigP([[0, Z3], [1.2, [0, -0.1, 0]]]), c.rigR([[0, Z3], [1.2, [0.35, 0, 0.12]]]), c.hd([[0, Z3], [1.2, [0, 0.15, -0.5]]]), c.armsK([[0, Z3], [1.2, [0.1, 0, -0.35]]]),
    c.legs2([[0, Z3], [1.2, [0, 0, 0.45]]]), c.tail([[0, Z3], [1.2, [0, 0.3, 0.4]]]), c.body([[0, O3], [1.2, [1.05, 0.9, 1.05]]]), shut(c)],
  droop: (c) => [c.neck([[0, Z3], [1.2, [0, 0.2, -0.55]]]), c.hd([[0, Z3], [1.2, [0, 0.1, -0.45]]]), c.rigP([[0, Z3], [1.2, [0, -0.1, 0]]]), c.rigR([[0, Z3], [1.2, [0.15, 0, 0.1]]]),
    c.legsQ([[0, Z3], [1.2, [0, 0, 0.45]]], [[0, Z3], [1.2, [0, 0, -0.35]]]), c.tail([[0, Z3], [1.2, [0, 0.3, 0.3]]]), shut(c)],
  kneel: (c) => [c.rigP([[0, Z3], [1.2, [0, -0.12, 0]]]), c.rigR([[0, Z3], [1.2, [0.22, 0, 0.06]]]), c.hd([[0, Z3], [1.2, [0, 0.1, -0.45]]]), c.armsK([[0, Z3], [1.2, [0.1, 0, 0.3]]]),
    c.legs2([[0, Z3], [1.2, [0, 0, 0.7]]], [[0, Z3], [1.2, [0, 0, -0.3]]]), c.legsQ([[0, Z3], [1.2, [0, 0, 0.55]]], [[0, Z3], [1.2, [0, 0, -0.4]]]), c.hair([[0, Z3], [1.2, [0.2, 0, 0.2]]]), c.tail([[0, Z3], [1.2, [0, 0.3, 0.4]]]), shut(c)],
  lie: (c) => [c.rigP([[0, Z3], [1.2, [0, -0.13, 0]]]), c.rigR([[0, Z3], [1.2, [0.1, 0.1, 0.12]]]), c.hd([[0, Z3], [1.2, [0, 0.25, -0.45]]]), c.legsQ([[0, Z3], [1.2, [0, 0, 0.65]]], [[0, Z3], [1.2, [0, 0, -0.55]]]),
    c.tail([[0, Z3], [1.2, [0, 0.4, 0.45]]]), c.jw([[0, Z3], [1.2, [0, 0, -0.1]]]), shut(c)],
  topple: (c) => [c.rigP([[0, Z3], [1.2, [0, -0.1, 0]]]), c.rigR([[0, Z3], [1.2, [0.15, 0, 0.35]]]), c.wings([[0, Z3], [1.2, [-0.5, 0, -0.35]]]), c.hd([[0, Z3], [1.2, [0, 0.2, -0.5]]]),
    c.legsQ([[0, Z3], [1.2, [0, 0, 0.5]]], [[0, Z3], [1.2, [0, 0, -0.4]]]), c.tail([[0, Z3], [1.2, [0, 0.4, 0.3]]]), c.jw([[0, Z3], [1.2, [0, 0, -0.12]]]), shut(c)],
  flop: (c) => [c.rigP([[0, Z3], [1.2, [0, -0.08, 0]]]), c.rigR([[0, Z3], [1.2, [0.2, 0, 0.3]]]), c.wings([[0, Z3], [0.4, [0.6, 0, 0]], [1.2, [0.5, 0, -0.4]]]), c.hd([[0, Z3], [1.2, [0, 0.2, -0.5]]]),
    c.legs2([[0, Z3], [1.2, [0, 0, 0.6]]]), c.tail([[0, Z3], [1.2, [0, 0, 0.4]]]), shut(c)],
  collapse: (c) => [c.rigP([[0, Z3], [0.3, [0, 0.04, 0]], [1.2, [0, -0.15, 0]]]), c.rigR([[0, Z3], [1.2, [0.25, 0.2, 0.3]]]), c.armsK([[0, Z3], [1.2, [0.6, 0, 0.2]]]), c.hd([[0, Z3], [1.2, [0.2, 0.2, -0.5]]]),
    c.legs2([[0, Z3], [1.2, [0, 0, 0.6]]], [[0, Z3], [1.2, [0, 0, -0.2]]]), shut(c, 0.3)],
  powerdown: (c) => [c.hd([[0, Z3], [0.5, [0, 0, -0.1]], [1.2, [0, 0.1, -0.35]]]), c.Pv('head', [[0, Z3], [1.2, [-0.5, -1, 0]]]), c.legsQ([[0, Z3], [1.2, [0.25, 0, 0.3]]], [[0, Z3], [1.2, [0.25, 0, -0.3]]]),
    c.body([[0, O3], [0.5, [1.02, 0.98, 1.02]], [1.2, [1.06, 0.88, 1.06]]]), c.rigP([[0, Z3], [1.2, [0, -0.06, 0]]]), c.tail([[0, Z3], [1.2, [0, 0, 0.4]]]), c.lids([[0, 0], [0.3, 0.3], [0.6, 0.6], [1.0, 1], [1.2, 1]])],
  dim: (c) => [c.rigP([[0, Z3], [1.2, [0, -0.16, 0]]]), c.rigR([[0, Z3], [1.2, [0.25, 0, 0.15]]]), c.wings([[0, Z3], [1.2, [-0.4, 0, -0.4]]]), c.body([[0, O3], [1.2, [0.96, 0.92, 0.96]]]), shut(c)],
  wilt: (c) => [c.hd([[0, Z3], [1.2, [0.25, 0.1, -0.5]]]), c.armsK([[0, Z3], [1.2, [0.1, 0, -0.3]]]), c.rigP([[0, Z3], [1.2, [0, -0.1, 0]]]), c.rigR([[0, Z3], [1.2, [0.2, 0, 0.1]]]),
    c.legs2([[0, Z3], [1.2, [0, 0, 0.4]]], [[0, Z3], [1.2, [0, 0, -0.2]]]), shut(c)],
};

/* ------------------------------------------------------------------ registration */
export const ROSTER_IDS = [];
(function register() {
  const D = window.A && window.A.Data; if (!D) return;
  Object.values(D.SPECIES).forEach((sp) => {
    if (SHOWCASE_IDS.indexOf(sp.id) >= 0 || !PERSONA[sp.line]) return;
    const pr = persona(sp.id);
    CLIP_HOOKS[sp.id] = (root, profile, base) => (root.userData.parts ? rosterClips(root, sp.id) || base : base);
    VIEW_YAW[sp.id] = pr.view;
    LIVING[sp.id] = { rate: 1.6 / pr.tempo * 0.8, base: 0.88, amp: 0.13, ground: pr.ground, col: pr.gcol, spin: pr.float ? 1.4 : 1 };
    ROSTER_IDS.push(sp.id); SHOWCASE_IDS.push(sp.id);
  });
})();

/* ------------------------------------------------------------------ move choreography
   Every move a roster line uses gets its own sequence, timed against the clips (contact 0.34 s / 0.40 s, the battle's
   hit beat lands at ≈0.48 s). Shared moves take the attacker's own colours and leave from its own mouth, hands or
   cannon, so Emberix's frost-blue Ember Flick and Igniflare's orange one look like theirs. Effects are built from
   cubes and scaled down with Battery Saver and Reduce Motion (fx.scale()). */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), rnd = (k) => (Math.random() - 0.5) * k;
const palOf = (api, who) => (persona(api.slot(who).spId) || {}).fx || ['#ffffff', '#cfd8e6', '#9fb0c8'];
const spot = (api, w) => api.slot(w).group.position.clone(), sz = (api, w) => api.slot(w).group.scale.x;
const N = (api, n) => Math.max(2, Math.round(n * api.fx.scale()));
// motes along a straight line, appearing in sequence (a streak); a parabolic arc; a ring around a point
function streak(api, a, b, cols, n, o) { o = o || {}; const d = b.clone().sub(a); n = N(api, n);
  for (let i = 0; i <= n; i++) api.fx.spawn(a.clone().addScaledVector(d, i / n).add(V3(rnd(o.j || 0.08), rnd(o.j || 0.08), rnd(o.j || 0.08))), V3(rnd(0.3), rnd(0.3) + (o.up || 0), rnd(0.3)), { color: cols[i % cols.length], life: (o.life || 0.22) + (i / n) * (o.tail || 0.08), size: o.size || 0.06, grav: o.grav || 0, spin: 2 }); }
function arc(api, a, b, h, cols, n, o) { o = o || {}; n = N(api, n);
  for (let i = 0; i <= n; i++) { const t = i / n, p = a.clone().lerp(b, t); p.y += Math.sin(t * Math.PI) * h; api.fx.spawn(p, V3(rnd(0.2), rnd(0.2), rnd(0.2)), { color: cols[i % cols.length], life: (o.life || 0.25) + t * 0.1, size: o.size || 0.06, grav: 0, spin: 3 }); } }
function ringAt(api, c, r, cols, n, vel, o) { o = o || {}; n = N(api, n);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, p = c.clone().add(V3(Math.cos(a) * r, o.y || 0, Math.sin(a) * r * (o.flat || 0.8)));
    api.fx.spawn(p, vel(a, p), { color: cols[i % cols.length], life: o.life || 0.5, size: o.size || 0.06, grav: o.grav || 0, spin: o.spin || 2 }); } }
// motes flowing from the foe back to the attacker (drain moves)
function drain(api, who, tgt, cols, n) { const a = api.chest(tgt), b = api.chest(who); n = N(api, n);
  for (let i = 0; i < n; i++) api.at(i * 0.02, () => { const p = a.clone().add(V3(rnd(0.3), rnd(0.3), rnd(0.3))); api.fx.spawn(p, b.clone().sub(p).multiplyScalar(1 / 0.32).add(V3(0, 0.4, 0)), { color: cols[i % cols.length], life: 0.34, size: 0.05, grav: 1.2, spin: 2 }); });
  api.at(0.36, () => api.fx.glow(api.chest(who), cols[1], 1.0, 0.4)); }
const R_ = {
  /* ---- light (Lumifern, Lumi) ---- */
  // Glow Pulse: light gathers at the mouth, a soft orb crosses, a ring of light opens on the foe
  glowpulse(api, who, info) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.2, () => api.fx.glow(api.from(who, 'mouth'), c[2], 0.8, 0.25));
    api.at(0.3, () => api.fx.projectile(api.from(who, 'mouth'), api.chest(tgt), 'light', { dur: 0.16, cols: [c[1], c[2], '#ffffff'] }));
    api.at(0.47, () => ringAt(api, api.chest(tgt), 0.25 * sz(api, tgt), [c[2], c[1], '#ffffff'], 14, (a) => V3(Math.cos(a) * 1.2, 0, Math.sin(a) * 1.0), { life: 0.35 })); },
  // Sun Sprout: a seed of light is lobbed, bursts into leaves, and warmth flows back
  sunsprout(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.28, () => arc(api, api.from(who, 'mouth'), api.chest(tgt), 0.5, [c[0], c[1]], 12, { life: 0.22 }));
    api.at(0.46, () => api.fx.burst(api.chest(tgt), [c[0], '#9fe36a', c[1]], 12, { speed: 1.4, life: 0.5, size: 0.06, grav: 1.2 }));
    api.at(0.5, () => drain(api, who, tgt, [c[1], c[2], '#9dffb0'], 10)); },
  // Radiant Burst: a column of light, a flash at the mouth, a beam, and petals of light bloom on the foe
  radiantburst(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.12, () => api.fx.column(spot(api, who), [c[1], c[2], '#ffffff'], 12, { r: 0.5 * sz(api, who), rise: 1.2 }));
    api.at(0.38, () => { api.fx.glow(api.from(who, 'mouth'), '#ffffff', 1.3, 0.25); streak(api, api.from(who, 'mouth'), api.chest(tgt), [c[1], c[2], '#ffffff'], 16); });
    api.at(0.47, () => { api.fx.burst(api.chest(tgt), [c[1], c[2], '#ffffff', c[0]], 20, { speed: 2, life: 0.6, size: 0.07, grav: 0.4 }); api.fx.shockwave(spot(api, tgt), c[1], 1.5); }); },
  // Solar Flare: a crown of sunlight forms over the foe, then rays crash down
  solarflare(api, who) { const c = palOf(api, who), tgt = api.other(who), top = spot(api, tgt).add(V3(0, 1.35 * api.slot(tgt).group.scale.y, 0));
    api.at(0.16, () => ringAt(api, top, 0.35, [c[1], c[2], '#ffffff'], 16, (a) => V3(-Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5), { life: 0.45, flat: 1 }));
    for (let i = 0; i < 4; i++) api.at(0.36 + i * 0.03, () => { const a = (i / 4) * Math.PI * 2, s0 = top.clone().add(V3(Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25)); streak(api, s0, api.chest(tgt), [c[2], '#ffffff', c[1]], 8, { life: 0.16 }); });
    api.at(0.48, () => { api.fx.glow(api.chest(tgt), '#ffffff', 1.5, 0.25); api.fx.shockwave(spot(api, tgt), c[1], 1.7); }); },
  /* ---- dark (Umbrit II/III, Voltar) ---- */
  // Dusk Rend: three claws of folded twilight cross the foe
  duskrend(api, who) { const c = palOf(api, who), tgt = api.other(who), s = who === 'p' ? 1 : -1;
    api.at(0.12, () => api.fx.burst(spot(api, who).setY(0.1), [c[0], c[1]], 8, { speed: 0.6, up: 0.4, life: 0.4, size: 0.05, grav: -0.3 }));
    [0.38, 0.43, 0.48].forEach((t, i) => api.at(t, () => { const p = api.chest(tgt).add(V3(0, (1 - i) * 0.12, 0)); api.fx.slash(p, 'dark', i % 2 ? -s : s); api.fx.burst(p, [c[1], c[2]], 5, { speed: 1.2, life: 0.3, size: 0.05 }); }));
    api.at(0.5, () => api.fx.glow(api.chest(tgt), c[1], 1.1, 0.3)); },
  // Eclipse Fang: a dark moon passes over the foe, jaws of shadow close, and strength flows back
  eclipsefang(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.18, () => ringAt(api, api.chest(tgt).add(V3(0, 0.15, 0)), 0.32 * sz(api, tgt), [c[0], '#120c24', c[1]], 16, (a) => V3(-Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6), { life: 0.4, flat: 1 }));
    api.at(0.4, () => { const p = api.chest(tgt); api.fx.slash(p.clone().add(V3(0, 0.14, 0)), 'dark', 1); api.fx.slash(p.clone().add(V3(0, -0.14, 0)), 'dark', -1); api.fx.glow(p, c[2], 1.2, 0.3); });
    api.at(0.5, () => drain(api, who, tgt, [c[1], c[2], '#e0d0ff'], 10)); },
  /* ---- nature (Acinus, Sylvaneer, Terraflora) ---- */
  // Vine Whip: a vine lashes out in an arc and cracks across the foe
  vinewhip(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.2, () => arc(api, api.from(who, 'mouth'), api.chest(tgt), 0.45, [c[1], c[0], c[1]], 14, { life: 0.2, size: 0.055 }));
    api.at(0.36, () => { api.fx.slash(api.chest(tgt), 'nature', who === 'p' ? 1 : -1); api.fx.burst(api.chest(tgt), [c[1], '#9fe36a', c[2]], 10, { speed: 1.3, life: 0.45, size: 0.05, grav: 1 }); }); },
  // Leaf Guard: leaves spiral up around it and settle as a shield
  leafguard(api, who) { const c = palOf(api, who), p = spot(api, who), r = 0.6 * sz(api, who);
    for (let k = 0; k < 3; k++) api.at(0.05 + k * 0.12, () => ringAt(api, p, r, [c[1], '#9fe36a', c[0]], 10, (a) => V3(-Math.sin(a) * 1.0, 0.9, Math.cos(a) * 0.8), { y: 0.1 + k * 0.2, life: 0.6, spin: 4 }));
    api.at(0.3, () => api.fx.glow(api.chest(who), '#9fe36a', 1.2, 0.5)); },
  // Verdant Crash: a thicket bursts up under the foe
  verdantcrash(api, who) { const c = palOf(api, who), tgt = api.other(who), g = spot(api, tgt), r = 0.5 * sz(api, tgt);
    api.at(0.2, () => api.fx.burst(spot(api, who).setY(0.08), [c[0], c[1]], 8, { speed: 0.8, up: 0.2, life: 0.4, size: 0.05 }));
    for (let i = 0; i < 6; i++) api.at(0.38 + i * 0.02, () => { const a = (i / 6) * Math.PI * 2 + 0.3, p = g.clone().add(V3(Math.cos(a) * r, 0.05, Math.sin(a) * r * 0.8)); api.fx.column(p, [c[1], c[0], '#9fe36a'], 5, { r: 0.08, rise: 1.6, life: 0.45, size: 0.07 }); });
    api.at(0.46, () => { api.fx.shockwave(g, c[1], 1.4); api.fx.burst(api.chest(tgt), [c[1], c[2], c[0]], 14, { speed: 1.6, life: 0.5, size: 0.06, grav: 1.4 }); }); },
  // World Root: roots race along the ground, rise around the foe and drink its strength
  worldroot(api, who) { const c = palOf(api, who), tgt = api.other(who), a = spot(api, who).setY(0.06), b = spot(api, tgt).setY(0.06);
    api.at(0.22, () => streak(api, a, b, [c[0], c[1], c[0]], 16, { life: 0.3, size: 0.07, j: 0.05 }));
    api.at(0.42, () => api.fx.column(spot(api, tgt), [c[0], c[1], c[2]], 14, { r: 0.5 * sz(api, tgt), rise: 1.2, life: 0.6 }));
    api.at(0.52, () => drain(api, who, tgt, [c[1], c[2], '#9dffb0'], 10)); },
  /* ---- fire (Emberix, Pyrokai, Igniflare, Pyro-Phoenix) ---- */
  // Ember Flick: a spray of sparks from the mouth and a spit of flame
  emberflick(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.3, () => { const m = api.from(who, 'mouth'), d = api.chest(tgt).sub(m).normalize(); for (let i = 0; i < N(api, 10); i++) api.fx.spawn(m, d.clone().multiplyScalar(2.2 + Math.random()).add(V3(rnd(1), rnd(1) + 0.4, rnd(1))), { color: c[i % 3], life: 0.3, size: 0.045, grav: 1.5, spin: 3 });
      api.fx.projectile(m, api.chest(tgt), 'fire', { dur: 0.15, cols: [c[0], c[1], c[2]] }); }); },
  // Flare Bite: flames gather at the jaws, then two arcs of fire snap shut on the foe
  flarebite(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.2, () => api.fx.glow(api.from(who, 'mouth'), c[1], 0.8, 0.25));
    api.at(0.34, () => { const p = api.chest(tgt); streak(api, p.clone().add(V3(-0.25, 0.22, 0)), p.clone().add(V3(0.25, 0.02, 0)), [c[0], c[1], c[2]], 8, { life: 0.2 }); streak(api, p.clone().add(V3(-0.25, -0.22, 0)), p.clone().add(V3(0.25, -0.02, 0)), [c[0], c[1], c[2]], 8, { life: 0.2 });
      api.fx.burst(p, [c[0], c[1], c[2]], 12, { speed: 1.5, life: 0.4, size: 0.06, grav: -0.5 }); }); },
  // Blaze Rush: a charging dash that leaves a trail of fire, ending in a blast
  blazerush(api, who) { const c = palOf(api, who), tgt = api.other(who), a = spot(api, who).setY(0.25), b = spot(api, tgt).setY(0.25);
    for (let i = 0; i < 6; i++) api.at(0.18 + i * 0.035, () => { const p = a.clone().lerp(b, i / 6); api.fx.burst(p, [c[0], c[1], c[2]], 4, { speed: 0.6, up: 1, life: 0.45, size: 0.06, grav: -0.8 }); });
    api.at(0.42, () => { api.fx.burst(api.chest(tgt), [c[0], c[1], c[2], '#ffffff'], 18, { speed: 2, life: 0.5, size: 0.07, grav: -0.4 }); api.fx.shockwave(spot(api, tgt), c[1], 1.5); }); },
  // Inferno: flames rise around it, then a ring of fire erupts around the foe and a pillar of flame
  inferno(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.14, () => api.fx.column(spot(api, who), [c[0], c[1], c[2]], 14, { r: 0.55 * sz(api, who), rise: 1.4 }));
    api.at(0.4, () => ringAt(api, spot(api, tgt).setY(0.06), 0.6 * sz(api, tgt), [c[0], c[1], c[2]], 18, () => V3(rnd(0.3), 1.6 + Math.random(), rnd(0.3)), { life: 0.55, grav: -0.5, size: 0.07 }));
    api.at(0.46, () => { api.fx.column(spot(api, tgt), [c[1], c[2], '#ffffff'], 14, { r: 0.25 * sz(api, tgt), rise: 2, life: 0.5, size: 0.07 }); api.fx.shockwave(spot(api, tgt), c[1], 1.8); api.fx.glow(api.chest(tgt), c[2], 1.4, 0.3); }); },
  /* ---- water (Cannonis II/III, Kairyu, Aquaflora) ---- */
  // Riptide Dash: it rides a current through the foe; spray, then a whirl of water around it
  riptide(api, who) { const c = palOf(api, who), tgt = api.other(who), a = spot(api, who).setY(0.2), b = spot(api, tgt).setY(0.2);
    for (let i = 0; i < 6; i++) api.at(0.2 + i * 0.03, () => { const p = a.clone().lerp(b, i / 6); api.fx.burst(p, [c[0], c[1], c[2]], 4, { speed: 0.9, up: 0.9, life: 0.35, size: 0.055, grav: 3 }); });
    api.at(0.42, () => ringAt(api, api.chest(tgt), 0.32 * sz(api, tgt), [c[1], c[2], c[0]], 16, (a2) => V3(-Math.sin(a2) * 1.4, 0.3, Math.cos(a2) * 1.2), { life: 0.4, flat: 0.9 }));
    api.at(0.46, () => api.fx.burst(api.chest(tgt), [c[1], c[2], '#ffffff'], 14, { speed: 1.8, life: 0.45, size: 0.06, grav: 3 })); },
  // Abyssal Wave: the deep sea rises behind it as a wall and crashes over the foe
  abyssalwave(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.3, () => { const a = spot(api, who), b = spot(api, tgt), d = b.clone().sub(a), side = V3(-d.z, 0, d.x).normalize(), W = N(api, 12);
      for (let r = 0; r < 4; r++) for (let j = 0; j < W; j++) { const off = (j / (W - 1) - 0.5) * 1.5, p = a.clone().addScaledVector(side, off).add(V3(0, 0.05 + r * 0.16, 0));
        api.fx.spawn(p, d.clone().multiplyScalar(1 / 0.2).add(V3(0, 1.5 + r * 0.5, 0)), { color: [c[0], '#0a2a6a', c[1], c[2]][(r + j) % 4], life: 0.24, size: 0.1 - r * 0.012, grav: 6, spin: 4 }); } });
    api.at(0.48, () => { api.fx.burst(api.chest(tgt), [c[0], c[1], c[2], '#0a2a6a'], 22, { speed: 2.2, life: 0.55, size: 0.07, grav: 3 }); api.fx.shockwave(spot(api, tgt), c[1], 1.8); api.fx.glow(api.chest(tgt), c[1], 1.4, 0.35); }); },
  /* ---- earth (Gaiaroki, Pyro-Core) ---- */
  // Pebble Toss: a volley of pebbles, thrown with enthusiasm
  pebbletoss(api, who) { const c = palOf(api, who), tgt = api.other(who);
    for (let i = 0; i < 3; i++) api.at(0.26 + i * 0.05, () => api.fx.projectile(api.from(who, 'handR'), api.chest(tgt).add(V3(rnd(0.3), rnd(0.2), rnd(0.3))), 'earth', { dur: 0.16, cols: [c[0], c[2], '#8a8a80'] })); },
  // Boulder Roll: a boulder rolls along the ground and slams into the foe
  boulderroll(api, who) { const c = palOf(api, who), tgt = api.other(who), a = spot(api, who).setY(0.18), b = spot(api, tgt).setY(0.18);
    for (let i = 0; i < 7; i++) api.at(0.24 + i * 0.03, () => { const p = a.clone().lerp(b, i / 7); for (let k = 0; k < N(api, 5); k++) api.fx.spawn(p.clone().add(V3(rnd(0.22), rnd(0.22), rnd(0.22))), V3(rnd(0.4), 0.2, rnd(0.4)), { color: [c[0], '#6a6a66', c[2]][k % 3], life: 0.12, size: 0.1, grav: 0, spin: 6 }); api.fx.burst(p.clone().setY(0.04), ['#b8a68a', '#8a7a62'], 2, { speed: 0.4, up: 0.5, life: 0.4, size: 0.04 }); });
    api.at(0.46, () => { api.fx.burst(api.chest(tgt), [c[0], c[2], '#6a6a66', '#b8a68a'], 18, { speed: 1.8, up: 0.4, life: 0.5, size: 0.07, grav: 2.4 }); api.fx.shockwave(spot(api, tgt), '#c49a68', 1.5); }); },
  // Earthquake: the stamp cracks the ground; debris leaps along the line to the foe
  quakeslam(api, who) { const c = palOf(api, who), tgt = api.other(who), a = spot(api, who).setY(0.05), b = spot(api, tgt).setY(0.05);
    api.at(0.4, () => api.fx.shockwave(a, '#c49a68', 1.6));
    for (let i = 1; i <= 5; i++) api.at(0.4 + i * 0.02, () => api.fx.burst(a.clone().lerp(b, i / 5), [c[0], '#8a7a62', c[2]], 4, { speed: 1, up: 1.4, life: 0.45, size: 0.07, grav: 3 }));
    api.at(0.5, () => { api.fx.shockwave(b, c[1], 1.5); api.fx.burst(api.chest(tgt), [c[0], c[2], '#8a7a62'], 12, { speed: 1.6, up: 0.6, life: 0.5, size: 0.06, grav: 2.4 }); }); },
  // Mountainfall: a landslide of living rock falls on the foe
  mountainfall(api, who) { const c = palOf(api, who), tgt = api.other(who), top = spot(api, tgt).add(V3(0, 2.2, 0));
    for (let i = 0; i < N(api, 9); i++) api.at(0.26 + i * 0.02, () => { const p = top.clone().add(V3(rnd(0.8), rnd(0.4), rnd(0.6))); api.fx.spawn(p, V3(rnd(0.3), -6, rnd(0.3)), { color: [c[0], '#6a6a66', c[2], c[1]][i % 4], life: 0.34, size: 0.11, grav: 4, spin: 5 }); });
    api.at(0.48, () => { api.fx.shockwave(spot(api, tgt), '#c49a68', 1.8); api.fx.burst(spot(api, tgt).setY(0.1), ['#b8a68a', '#8a7a62', c[1]], 16, { speed: 1.4, up: 0.8, life: 0.6, size: 0.06, grav: 1.8 }); }); },
  /* ---- wind (Zephyr) ---- */
  // Gust: three snapping streaks of wind
  gust(api, who) { const c = palOf(api, who), tgt = api.other(who);
    for (let i = 0; i < 3; i++) api.at(0.28 + i * 0.03, () => { const a = api.chest(who).add(V3(0, (i - 1) * 0.15, 0)), b = api.chest(tgt).add(V3(0, (i - 1) * 0.12, 0)); arc(api, a, b, 0.1 + i * 0.05, ['#ffffff', c[1], c[0]], 10, { life: 0.16, size: 0.045 }); });
    api.at(0.44, () => api.fx.burst(api.chest(tgt), ['#ffffff', c[1]], 8, { speed: 1.6, life: 0.35, size: 0.04, grav: 0.3 })); },
  // Cyclone Spin: a little tornado wraps the foe
  cyclonespin(api, who) { const c = palOf(api, who), tgt = api.other(who), g = spot(api, tgt), r = 0.45 * sz(api, tgt);
    for (let k = 0; k < 3; k++) api.at(0.34 + k * 0.05, () => ringAt(api, g, r * (1 - k * 0.15), ['#ffffff', c[1], c[0]], 12, (a) => V3(-Math.sin(a) * 2.2, 1.4, Math.cos(a) * 1.8), { y: 0.1 + k * 0.25, life: 0.45, spin: 5 }));
    api.at(0.48, () => api.fx.glow(api.chest(tgt), c[1], 1.1, 0.3)); },
  // Gale Strike: a wide wall of wind with gold glints
  galestrike(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.36, () => { const a = spot(api, who), b = spot(api, tgt), d = b.clone().sub(a), side = V3(-d.z, 0, d.x).normalize(), W = N(api, 10);
      for (let r = 0; r < 3; r++) for (let j = 0; j < W; j++) { const p = a.clone().addScaledVector(side, (j / (W - 1) - 0.5) * 1.3).add(V3(0, 0.2 + r * 0.3, 0)); api.fx.spawn(p, d.clone().multiplyScalar(1 / 0.12), { color: j % 4 ? (r ? c[1] : '#ffffff') : c[2], life: 0.14, size: 0.05, grav: 0, spin: 2 }); } });
    api.at(0.48, () => { api.fx.burst(api.chest(tgt), ['#ffffff', c[1], c[2]], 14, { speed: 2, life: 0.4, size: 0.05, grav: 0.3 }); api.fx.shockwave(spot(api, tgt), c[1], 1.4); }); },
  // Storm Dive: a storm gathers above the foe, it dives in a streak, lightning flashes
  stormdive(api, who) { const c = palOf(api, who), tgt = api.other(who), top = spot(api, tgt).add(V3(0, 2, 0));
    api.at(0.12, () => api.fx.burst(top, ['#3a4a6a', '#5a6a8a', c[0]], 10, { speed: 0.5, up: 0, life: 0.5, size: 0.08, grav: -0.2 }));
    api.at(0.36, () => streak(api, top, api.chest(tgt), ['#ffffff', c[1], c[2]], 14, { life: 0.14 }));
    api.at(0.44, () => { api.fx.glow(api.chest(tgt), '#ffffff', 1.6, 0.18); api.fx.shockwave(spot(api, tgt), c[1], 1.8); api.fx.burst(api.chest(tgt), ['#ffffff', c[1], c[2]], 16, { speed: 2, life: 0.4, size: 0.05, grav: 0.4 }); }); },
  /* ---- metal (Zeep, Meta, Atem) ---- */
  // Gear Strike: a clean mechanical clang, sparks and a spinning gear ring
  gearstrike(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.34, () => { const p = api.chest(tgt); api.fx.burst(p, ['#ffd27a', '#ffffff', c[1]], 12, { speed: 2, life: 0.3, size: 0.04, grav: 3 });
      ringAt(api, p, 0.22 * sz(api, tgt), [c[1], '#c8d2e0', c[2]], 10, (a) => V3(-Math.sin(a) * 1.4, 0, Math.cos(a) * 1.4), { life: 0.3, flat: 1, spin: 6 }); }); },
  // Iron Wall: a wall of steel plates assembles in front of it
  ironwall(api, who) { const c = palOf(api, who), tgt = api.other(who), a = spot(api, who), d = spot(api, tgt).sub(a).normalize(), side = V3(-d.z, 0, d.x), f = a.clone().addScaledVector(d, 0.55 * sz(api, who));
    for (let r = 0; r < 4; r++) api.at(0.06 + r * 0.06, () => { for (let j = 0; j < N(api, 6); j++) { const p = f.clone().addScaledVector(side, (j / 5 - 0.5) * 0.9 * sz(api, who)).add(V3(0, 0.1 + r * 0.22 * sz(api, who), 0)); api.fx.spawn(p, V3(0, 0, 0), { color: (j + r) % 2 ? '#c8d2e0' : c[1], life: 0.5, size: 0.09, grav: 0, spin: 0 }); } });
    api.at(0.3, () => api.fx.glow(f.clone().setY(0.5), c[1], 1.2, 0.35)); },
  // Blade Form: a glint runs down the arm, then a great slash
  bladeform(api, who) { const c = palOf(api, who), tgt = api.other(who), s = who === 'p' ? 1 : -1;
    api.at(0.2, () => api.fx.glow(api.from(who, 'handR'), '#ffffff', 0.9, 0.25));
    api.at(0.38, () => { const p = api.chest(tgt); api.fx.slash(p.clone().add(V3(0, 0.1, 0)), 'metal', s); streak(api, p.clone().add(V3(-0.35 * s, 0.35, 0)), p.clone().add(V3(0.35 * s, -0.3, 0)), ['#ffffff', c[1], c[2]], 12, { life: 0.22 }); });
    api.at(0.44, () => api.fx.burst(api.chest(tgt), ['#ffffff', c[1], '#ffd27a'], 14, { speed: 2, life: 0.35, size: 0.045, grav: 2.4 })); },
  // Overclock: a surge of current runs up it, then arcs jump to the foe
  overclock(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.1, () => api.fx.column(spot(api, who), [c[1], c[2], '#ffffff'], 14, { r: 0.5 * sz(api, who), rise: 1.6, life: 0.6 }));
    for (let k = 0; k < 3; k++) api.at(0.36 + k * 0.04, () => { let a = api.chest(who); const b = api.chest(tgt); for (let i = 1; i <= 4; i++) { const q = a.clone().lerp(b, 0.25).add(V3(rnd(0.3), rnd(0.3), rnd(0.3))); if (i === 4) q.copy(b); streak(api, a, q, ['#ffffff', c[1], c[2]], 4, { life: 0.12, j: 0.02 }); a = q; } });
    api.at(0.5, () => { api.fx.glow(api.chest(tgt), c[2], 1.3, 0.25); api.fx.burst(api.chest(tgt), ['#ffffff', c[1], c[2]], 12, { speed: 1.8, life: 0.35, size: 0.04, grav: 0.5 }); }); },
};
// register: each move under its own style; the Phase 8 sequences the roster shares (Bubble Pop, Tidal Surge, Shade Nip,
// Gloom Veil) stay exactly as approved for Umbrit and Cannonis and take the attacker's own colours for everyone else
Object.keys(R_).forEach((k) => { STYLE['r_' + k] = R_[k]; MOVES[k] = 'r_' + k; });
const SHARED = {
  bubbles(api, who) { const c = palOf(api, who), tgt = api.other(who), n = Math.max(2, Math.round(6 * api.fx.scale()));
    api.at(0.34, () => { const m = api.from(who, 'muzzle'); api.fx.glow(m, c[2], 0.9, 0.22); api.fx.burst(m, [c[2], c[1]], 8, { speed: 1.2, life: 0.35, size: 0.05, grav: 1.5 }); });
    for (let i = 0; i < n; i++) api.at(0.35 + i * 0.022, () => api.fx.projectile(api.from(who, 'muzzle'), api.chest(tgt).add(V3(rnd(0.3), rnd(0.3), rnd(0.3))), 'water', { dur: 0.11, cols: [c[2], c[1], c[0]] })); },
  surge(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.38, () => { const a = spot(api, who), b = spot(api, tgt), d = b.clone().sub(a), side = V3(-d.z, 0, d.x).normalize(), W = Math.max(4, Math.round(10 * api.fx.scale())); api.fx.shockwave(a.clone().setY(0.05), c[1], 1.6);
      for (let r = 0; r < 3; r++) for (let j = 0; j < W; j++) { const p = a.clone().addScaledVector(side, (j / (W - 1) - 0.5) * 1.2).add(V3(0, 0.05 + r * 0.12, 0)); api.fx.spawn(p, d.clone().multiplyScalar(1 / 0.16).add(V3(0, 1.2 + r * 0.4, 0)), { color: [c[2], c[1], c[0]][(r + j) % 3], life: 0.2, size: 0.09 - r * 0.015, grav: 6, spin: 4 }); } });
    api.at(0.44, () => { const m = api.from(who, 'muzzle'); api.fx.glow(m, c[2], 1.2, 0.25); api.fx.projectile(m, api.chest(tgt), 'water', { dur: 0.08, big: true, cols: [c[2], c[1], c[0]] }); }); },
  nip(api, who) { const c = palOf(api, who), tgt = api.other(who), s = who === 'p' ? 1 : -1;
    api.at(0.1, () => api.fx.burst(spot(api, who).setY(0.1), [c[0], c[1]], 6, { speed: 0.6, up: 0.4, life: 0.4, size: 0.05, grav: -0.3 }));
    api.at(0.34, () => api.fx.slash(api.chest(tgt), 'dark', s));
    api.at(0.42, () => { api.fx.slash(api.chest(tgt).add(V3(0, -0.12, 0)), 'dark', -s); api.fx.burst(api.chest(tgt), [c[2], c[0]], 8, { speed: 1.4, life: 0.35, size: 0.05 }); }); },
  veil(api, who) { const c = palOf(api, who), tgt = api.other(who);
    api.at(0.12, () => { api.fx.glow(api.head(who), c[2], 1.1, 0.4); api.fx.column(spot(api, who), [c[0], c[1], c[2]], 12, { r: 0.45, rise: 0.9, life: 0.6, size: 0.05 }); });
    api.at(0.3, () => api.fx.projectile(api.head(who), api.chest(tgt), 'dark', { dur: 0.17, big: true, cols: [c[0], c[1], c[2]] }));
    api.at(0.47, () => { const g = spot(api, tgt), n = Math.max(6, Math.round(18 * api.fx.scale())), R0 = 0.55 * sz(api, tgt);
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; api.fx.spawn(g.clone().add(V3(Math.cos(a) * R0, 1.1 * api.slot(tgt).group.scale.y, Math.sin(a) * R0 * 0.8)), V3(-Math.sin(a) * 0.6 - Math.cos(a) * 0.3, -1.6, Math.cos(a) * 0.5 - Math.sin(a) * 0.3), { color: i % 2 ? c[0] : c[1], life: 0.6, size: 0.06, grav: 0, spin: 3 }); }
      api.fx.glow(api.chest(tgt), c[1], 1.2, 0.4); }); },
};
const TRIO = ['umbrit', 'cannonis', 'aimza', 'aimza2', 'aimza3'];
Object.keys(SHARED).forEach((k) => { const orig = STYLE[k]; STYLE[k] = (api, who, info) => (TRIO.indexOf(api.slot(who).spId) >= 0 ? orig(api, who, info) : SHARED[k](api, who, info)); });
