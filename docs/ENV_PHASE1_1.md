# Environment Phase 1.1: refinement of the voxel Starter Island

- Branch: `env1.1-refine`, started from `deffe3a` (the head of `env1-voxel-island`). `main` is not touched.
- Scope: polish only. The Phase 1 work was refined, not rebuilt.
- Unchanged:
  - creatures, gameplay and saves;
  - the camera and the island layout;
  - building positions and footprints.

## Implemented

### 1. Colour and lighting
- **Brighter, warmer meadow:** grass is a yellow-green (`#86d24a` family) and paths are warmer.
  The clay bands in the cliffs are now orange.
- **Trees separate from the grass:** leaves are a bluer green than the meadow, so trees stand out instead of
  blending in.
- **Warmer light:** a stronger golden sun (`#ffe6b8`, 2.2) with a brighter sky fill (1.3), so shadows stay
  colourful rather than murky.
- **Softer shadows:** the shadow filter changed to a blurred PCF with radius 3 and 8 samples.
- **Brighter rounded forms:** ambient occlusion is lighter (darkest corner 60 % instead of 50 %), so trees, eggs and
  mounds no longer look dull.

### 2. Island construction
- **A hanging rock root:** the underside now tapers into an irregular rock root with long spires. Depth grows with
  distance from the rim, with noise, which gives the classic floating-island silhouette.
- **Grass-to-soil transition:** grass drapes 1 to 3 voxels over the rim. The dirt layer varies in depth, with clay
  showing at its foot. The strata are earth and clay bands at the top, then coursed stone, cool stone, and slate in
  the root.
- **More texture on the cliffs:**
  - moss creeps down the upper cliffs;
  - irregular rock formations (1 to 3 voxels tall, sometimes two deep) bulge out of the faces;
  - there are more vines, in two greens;
  - roots hang under the rim.
- **Two waterfalls:** one on each camera-facing cliff. Each springs from a dark mouth with a mossy stone lip and falls
  as a pixel-stepped ribbon with white streaks scrolling down, fading into the air below the island. There is white
  churn at the lip and a moss trail down the rock. Both sit off the cliff face and never touch buildable cells.

### 3. Buildings
- **All windows:** stone sills, glazing bars on taller panes, and optional painted shutters.
- **All building bases:** moss and grass tufts around the foundations, so buildings sit in the meadow rather than on it.
- **Hatchery** (detailed pass):
  - a gabled porch on carved posts, with a round lit window in its gable;
  - shuttered windows in egg-blue;
  - a stone chimney with a warm glow;
  - hanging lanterns;
  - a woven straw nest with twig tips, with a gold band from level 3;
  - the egg is now bright white, its speckles glow faintly blue, and a golden crack of light runs across it.
- **Habitats** now have distinct silhouettes while staying a set:

| Habitat | Silhouette feature |
|---|---|
| Nature | a fruit tree growing up beside the back of the house |
| Water | a stilted water tower with a blue cap, blue timbering, and the trough |
| Earth | a turf-mound roof (a burrow house), stone walls, a gold-flecked rock |
| Fire | a tall brick chimney with embers |
| Light | a pale stone lantern tower with a gold cap and a glowing top |
| Dark | a steep hip roof with a crooked spire and a violet crystal light, plus crystals at the door |
| Wind | a windmill sail on the front gable |

### 4. Composition
- **Trees grow in groves:** pine stands, oak and bush woods, and birch and blossom copses, chosen by a slow noise
  field. Open glades (bushes and ferns only) break up the tree line. Tree sizes vary more.
- **Calmer meadow detail:** flowers gather into a few bright drifts with a dominant colour each, instead of an even
  sprinkle. Grass clumps thin out in the open and grow taller in patches.
- Gameplay objects (obstacles, buildings, paths, the plaza) were not moved.

### 5. Environmental animation
- **Waterfalls:** the streaks scroll down at varied speeds per lane.
- **Magic motes:** small points of light spiral up around the Hatchery egg, the Tidegate, the Moonshrine, the
  Reliquary Gate, and the standing stones while they glow. That is about 10 per place (7 on phones).
- Existing water ripple, tree sway, clouds, the boat and pollen motes are unchanged.
- **Same 12 fps ambient tick with the same pause rules:** still, hidden or covered island, Battery saver,
  Reduce motion, and slow devices.

## Testing and performance

- **Tests:** `node tests/run-all.js` passes all 370 checks across 10 suites. That includes the 20 voxel-island checks:
  taps, build mode, the 2D fallback, saves, and no script errors.
- **Performance:** measured with `tests/perf-env1.js` in Chromium with software WebGL. This is not a phone; it is for
  comparing versions on the same machine.

| | Phase 1 | Phase 1.1 |
|---|---|---|
| Draw calls / triangles | 51 / 166k | 53 / 164k |
| Terrain build, JS, once | ~190 ms | ~250 ms |
| First object sync | ~80 ms | ~120 ms |
| Main thread while panning | 42–43 ms/s | 34–42 ms/s |
| JS heap | 14–20 MB | ~21 MB |

  The richer models, the root and the waterfalls cost about 60 ms more terrain build and about 40 ms more first sync,
  once per session. Leaving the triangle count where it was was deliberate: the calmer meadow detail offsets the
  root. Phone frame rates are still unmeasured.

## Still needs attention

- **No iPhone test yet.** That is the biggest open item before Phase 2.
- **The left waterfall is partly hidden** behind the jetty at the default view.
- **The Hatchery egg** reads well from a distance but is a little beige in close-ups on its shaded side.
- **Ruins** are still the generic rubble set.
- **The sea and sky backdrop** is still the painted 2D layer.
- **Creatures and 2D markers** (the Silent Stone's pink circle, quest "!") still draw on top of the 3D layer.
- **Other islands** remain 2D, as scoped.
