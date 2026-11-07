# Aminas · Phase 7 — Combat Immersion, Monster Animation & Environmental Polish

**Branch:** `ui7-arena`, created from `ui6-combat` at `d8ee70b`. Phase 5 (`ui5-prismatic`), Phase 4 (`env4-visual`),
every earlier milestone and production (`main`, `0fc9e36`) are untouched.

Before and after screenshots: `docs/ui/screens7/{before,after}/`. Review page: `docs/ui/phase7-review.html`.
Performance data: `docs/perf/ui7-perf.json`.

## What I found before starting
* **Creatures:** all 63 Aminas are voxel models: one merged mesh under a `rig` and a `body` pivot. Every one
  shared the same six clips, so they all moved identically.
* **Arenas:** there are 10, one per Starter Island dungeon; the other battle modes reuse them. Each had its own
  props but one of three generic light moods, the same rising motes, and nothing behind it.
* **Attacks:** a generic sprite burst and a colour flash. No projectile, nothing per element, nothing special for
  powerful moves.
* **Arena vs interface:** the arena was only told what happened (use, hit, faint). It never knew whose turn it was
  or who was being targeted.

## 1. Arena ↔ interface (highest priority)
* **One shared state.** The battle interface now tells the arena who is active and who is targeted, and the
  panels use the same state:

  | Moment | Active | Target |
  |---|---|---|
  | Your move | your Amina | the foe |
  | While a move plays | whoever is acting | the other |
  | Faint, pending switch, end | nobody | nobody |

  The arena follows the playback, never the rules' final state. The rules resolve a whole turn at once, so the
  arena could otherwise briefly show the wrong creature.
* **Active Amina:**
  * an outline in its element's colour (an inverted hull drawn from its own voxels);
  * a voxel ring at its feet, cyan for yours and rose for the foe;
  * a battle-ready move when its turn begins.
* **Target:** rose crystal corner brackets on the ground. They close in when it is struck, and its panel gets the
  same rose brackets while a move plays.
* **Pressing a move** previews its target before it is played: the brackets close and the foe is outlined in rose.
  A heal or guard brightens your own ring instead.
* **Transitions:** every highlight fades in and out (about 0.15 s), so the focus slides from one creature to the
  next instead of jumping.
* **2D stage:** the fallback, used when 3D is off or unavailable, gets the same cues. These are a glow and dotted
  ring for the active Amina, brackets on the target, and an element-coloured streak for attacks.

## 2. Movement with personality
* **`motionProfile(spec, model)`** reads only what the game already knows about each species: its voxel body shape,
  evolution stage, element, speed stat and the words of its personality. From these it picks:
  * a temperament: playful, fierce, sly, calm or neutral;
  * a weight;
  * whether it floats;
  * a fighting style: lunge, pounce, slam, spin or cast;
  * whether it attacks from range.
* **Each profile drives its own clips:**

  | Clip | What varies |
  |---|---|
  | `idle` | breathing, bouncing, prowling, scanning or floating |
  | `ready` | an "I'm up" move when its turn begins |
  | `attack` | by fighting style |
  | `special` | a spin-up swell before a bigger strike |
  | `hit` and `hitBig` | light creatures are knocked further and wobble; heavy ones barely budge |
  | `heal` | draws itself up |
  | `guard` | braces |
  | `victory` | double hop, rear-up, spin jump or float twirl |
  | `defeat` | topple, slump, sink, or a spin-fall for playful ones |
* **Spread:** 14 distinct temperament and style combinations across the 63 species.
* **Evolution lines grow into their motion.** For example, Lumifern pounces playfully, Solarbloom pounces with more
  weight, and Aurelith becomes a floating caster. The Rockraki line goes from lunging to slamming.
* **Unchanged:** designs, stats and abilities. Every attack reaches the foe 0.30–0.42 s into its clip, inside the
  existing battle beat, so battles take exactly as long as before.

## 3. Arena atmospheres
| Arena | Air | Light and depth |
|---|---|---|
| Forgotten Road | drifting pollen | warm sun, sun shafts, distant trees |
| Gathering Hall | lantern dust | warm amber, hall silhouettes |
| Overgrown Reliquary | rising spores | green light shafts, mossy pillars |
| Drowned Steps | rising bubbles | underwater blue, reef silhouettes |
| Cold Kiln | embers | flickering kiln-orange key light |
| Hollow Veil | violet wisps | dark violet, arches |
| Lantern Orchard | fireflies | lantern gold, orchard silhouettes |
| Wind Stair | wind gusts | bright sky light, distant spires |
| Resonance Scar | crystal glitter | prismatic rim, crystal silhouettes |
| Heartwood | falling voxel leaves | green shafts, great roots |

* **Bosses:** guardians and the Island Boss keep all their Phase 6 presentation (runes, halo, pixel aura, title
  card). They add a dimmer key light, a coloured rim (gold for guardians) and a pool of light under the boss. For
  the Island Boss the rim walks the spectrum.
* **Built from small cubes:** all particles are cubes in one instanced mesh per arena; the silhouettes are instanced
  blocks tinted towards the fog.

## 4. Element attacks
* **One pooled set of effect cubes** (a single draw call) carries every projectile, trail, shard and spark.
* **Each element travels its own way:**

  | Element | Shot |
  |---|---|
  | Fire | low ember ball with a rising trail |
  | Water | high arc that drips |
  | Nature | curving leaves |
  | Light | fast straight beam |
  | Dark | wobbling void orb |
  | Earth | heavy lobbed rock |
  | Wind | corkscrew |
  | Resonance | spectrum-cycling shot |
  | Metal | straight shards |

  Creatures that strike in person get an element slash at the target instead.
* **Impacts:** shards in the element's colours and a glow.
* **Heavy and super-effective hits** add a shockwave ring. Super-effective hits also get an 80 ms freeze-frame, a
  camera punch-in and the `hitBig` reaction.
* **Special and boss moves** get the ultimate treatment: a gathering column of the element, the camera leaning
  towards the attacker, and a bigger shot.
* **Heal and guard:** heal is a rising mint column; guard is a ring of blue cubes.

## Files
| File | |
|---|---|
| `src/3d/creature3d.js` | `motionProfile`, `personaClips`; `studioLights` takes an arena light override |
| `src/3d/runtime.js` | outlines, focus, preview, element-aware use and hit, timeline, camera push and punch, freeze-frame, `debug()`, `bench()` |
| `src/3d/combatfx.js` | new: `Fx` (pooled effect cubes, projectiles, impacts, shockwaves, columns), `FocusMarks` (rings, reticles) |
| `src/3d/arenas.js` | `ATMOS` (per-arena light, fog, particles, shafts, silhouettes), boss light, quality tiers |
| `src/ui2.js` | `syncArena()` (turn focus from the playback), move-press preview, use and hit details, enemy victory, 2D stage cues |
| `src/ui-arena.css` | new: targeted-panel brackets, 2D stage cues |
| `index.html` | the new stylesheet; title "Aminas UI 7" |
| `tests/browser-arena7.test.js` | new: 30 checks |

**Untouched:**
* rules and battle calculations (`rules.js`);
* data, stats and abilities;
* saves (`state.js`);
* the island;
* monster designs (voxel models).

## Performance
**Environment:** desktop Linux container, headless Chromium with SwiftShader software graphics, at 844×390 @3×.
**This is not an iPhone.** Software rendering is fill-bound, so these numbers overstate GPU work. Only the
before/after difference means anything.

**Scripted Island Boss battle, median of 3 runs:**

| | Phase 6 | Phase 7 |
|---|---|---|
| 2D: frame time, idle / during turns (p50 / p95) | 16.7 / 16.7 · 16.7 / 16.8 ms | 16.7 / 16.7 · 16.7 / 16.7 ms |
| 3D: draw calls / triangles | 21 / 9.6k | 30 / 11.7k |
| 3D: frame time, idle (p50 / p95) | 50 / 66.7 ms | 66.6 / 66.7 ms |
| 3D: frame time, during turns (p50 / p95) | 66.6 / 66.7 ms | 66.7 / 83.4 ms |

**Render cost per frame of the new layers**, measured by rendering each arena with and without each layer (Balanced
quality):

| Arena | Without the new layers | With them |
|---|---|---|
| Heartwood boss room | 97.8 ms | 110.4 ms |
| Forgotten Road | 63.9 ms | 70.4 ms |
| Cold Kiln | 47.6 ms | 56.2 ms |

That is about +10–13%, and these figures vary by about ±5%. The largest share is the distant silhouettes, which
paint sky that used to be empty.

**What I trimmed while profiling:**
* Light shafts went from up to 5 tall quads (about 10 ms here) to at most 3 smaller ones (about 1 ms).
* The silhouettes now draw after the arena, so hidden parts cost nothing.

**Quality tiers:**

| Tier | Silhouette layers | Light shafts | Particles and effects |
|---|---|---|---|
| High | 2 | up to 3 | full |
| Balanced | 1 | up to 2 | full |
| Battery Saver | 0 | 0 | half |

**Loops and idle:**
* The 3D view keeps its existing frame budget: 30 fps when idle, 60 fps for a moment after an action.
* Effects only run during actions and drain to nothing afterwards; a test checks this.
* With Reduce Motion, particles, light shafts, prop animation, the battle-ready move, camera moves and the
  freeze-frame are all still or skipped, and attack effects drop to a quarter.

**Needs confirming on your iPhone:** whether the 3D battle still holds 60 fps after actions and 30 fps idle in the
Heartwood boss room, and whether the phone stays cool over a long session.

## Tests (all actually run)
| Suite | Result |
|---|---|
| Existing suites (baseline through ui6) | 477 checks |
| **browser-arena7 (new)** | **30 passed** |

**Final full run:** 505 of 507 passed. The two failures were:
* Dev 8 "pixel bursts remove themselves". This is a timing check that passes 42/42 when run alone; it also passed
  in the earlier Phase 7 full run.
* My own leak check. It counted the creature cache (cached by design) as a leak, so I rewrote it to play the same
  battles twice and require no growth. It now passes: 12 → 12 geometries.

**Earlier full run:** the env1.2 "creature behind the Hatchery" check failed once under load and then passed 10/10
twice on its own. Phase 6 behaves the same way.

**What the new suite covers:**

| Area | Checks |
|---|---|
| Rigs and clips | all 63 rigs valid with the full clip set; 14 movement styles; contact timing inside the beat; evolution lines gain weight |
| Turn focus | your-move focus and the battle-ready move; press preview |
| Turn order | follows the rules both ways (you faster: p → e; foe faster: e → p) |
| Clean finish | creatures return to idle and every effect finishes |
| Element effects | fire, resonance, water and earth |
| Big moments | super-effective reaction; special-move ultimate; heal |
| Arenas and bosses | 10 distinct atmospheres; guardian and Island Boss presentation; draw-call budget (28 and 31; budget 45) |
| Battle modes | practice 5v5, raid and survival on the 3D stage |
| Clean-up | no growth between battles |
| Motion settings | Battery Saver halves particles and effects; Reduce Motion keeps a little and skips the battle-ready move |
| 2D stage | active and target cues, element streak |
| Saves and errors | saves unchanged; no script errors |

## Known limitations
* The outline is an inverted hull. On very thin parts (antenna tips, single-voxel spikes) it reads as a soft
  glow rather than a crisp line.
* Movement personality comes from rules, not hand animation, so some species would benefit from bespoke touches
  later.
* Reticles and rings sit on the ground. A very large boss can hide part of its own reticle from the camera.
* Mid-action screenshots were taken at fixed delays on a slow software renderer, so some show an earlier or later
  moment than intended.
* Not tested on a real iPhone.

## Testing on your iPhone
1. Open the updated preview link and start a battle (Battle → PvE → Dungeons). Settings → 3D creatures must be on.
2. **Your turn:** check your Amina has a cyan ring and a coloured outline and does a short "ready" move. The foe
   should have rose corner brackets. Press and hold a move: the brackets should close on the foe.
3. **Play a few turns:** the highlight should switch to whoever acts and the target panel should get rose
   brackets. Watch each element's shot and impact.
4. **Try a few dungeons** to see the atmospheres. The Cold Kiln, Drowned Steps and Heartwood show the biggest
   change.
5. **Boss rooms:** fight the guardian in battle 10 of any dungeon, and the Heartwood Stag (the Island Boss).
6. **Long session:** play 15–20 minutes. Watch for dropped frames or heat, then repeat once with Battery Saver and
   once with Reduce Motion.
7. Settings → Run performance test gives on-device numbers to send back.
