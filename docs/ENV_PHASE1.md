# Environment Phase 1 — Voxel Starter Island (milestone review)

- Branch: `env1-voxel-island`, started from `2833a54` (the head of `dev8-living-pixel`). `main` is not touched.
- Engine: the existing web game with three.js r170, not Godot. The project owner chose this at the start of the phase.

## Implemented (complete)

- **A real 3D voxel island.** This is geometry, not a painted image. An orthographic camera matched to the 2D isometric
  grid draws the Starter Island under the 2D interaction layer. All taps, timers, bubbles, labels, creatures, build
  mode and quests keep working through the unchanged 2D layer.
- **Terrain** voxelised from the island map:
  - grass top and dirt;
  - clay and stone strata, then deep rock;
  - a jagged underside, vines, stalactites and cliff outcrops;
  - an animated water surface over a lake bed;
  - sand shores and paths.
- **Every building rebuilt in voxels** at its existing size and position, with level growth and a ruined state:
  - Hatchery (the benchmark), Hollow, Tidegate, Moonshrine, Reliquary Gate, Forge, Farm, Mine;
  - all 9 habitat elements;
  - lantern, festival lantern, flowerbed, bench, statue, fountain.
- **Scenery and obstacles:**
  - trees: oak, pine, birch, blossom, sapling;
  - bushes, ferns, rocks, boulders, stumps;
  - grass and flower detail;
  - the jetty and its bobbing skiff, the lighthouse, the plaza mosaic, the seven standing stones (glowing while their
    quest is active), and drifting cloud banks below the island.
- **Lighting:** warm key light with soft shadows, sky fill, baked ambient occlusion, and glowing windows and torches.
- **Subtle animation:** water, tree sway, clouds, skiff and motes. It pauses when the island is still, hidden or
  covered, in Battery saver, with Reduce motion, and on devices too slow to keep up.
- **New setting "3D voxel island"** (on by default) with a fallback to the 2D island. The island also falls back to 2D
  automatically if WebGL or the 3D module is unavailable. Older saves get the setting on. No other save data changed.
- **Documents:** `docs/VOXEL_STYLE_GUIDE.md` (style guide) and `docs/ASSET_REGISTER.md` (asset register).

## Partial

- **Only the Starter Island is voxel.** Other islands keep their 2D art, as the brief excludes new islands.
- **Sea and sky backdrop:** this is still the 2D painted backdrop behind the 3D island.
- **Habitats:** they share one cottage form and differ by roof, walls and one element feature. They read as a set but
  less individually than the main buildings.
- **Ruins:** these are broken walls in each building's own stone, plus one hint of the building. They are simpler than
  the finished buildings.
- **Hatchery egg:** the egg on the roof nest reads a little grey where it shades itself. Brightness and nest colour
  still need a tuning pass.

## Not done / untested

- **No iPhone or real-GPU test.** All browser tests use Chromium with software WebGL (SwiftShader).
  Phone frame rates are unmeasured.
- **Overlays draw above the 3D layer.** Creatures and 2D overlays are in front of the 3D layer, so a creature behind a
  building is drawn in front of it, as it was in 2D. The Silent Stone's pink marker is also still 2D.
- **No external asset packs were imported.** See the asset register for the reasons.

## Testing

`node tests/run-all.js` gives 370 checks passed and 0 failed across 10 suites. That includes the new
`tests/browser-env1.test.js` (20 checks), which covers:

- the 3D canvas sits under the hit layer and the 2D terrain is hidden;
- buildings and obstacles are mirrored into 3D;
- tapping the voxel Hatchery opens its panel, and tapping a voxel obstacle opens its clearing panel;
- moving a building hides its 3D model, and leaving build mode restores it;
- other islands stay 2D;
- the setting toggles between 2D and voxel;
- the save shape is unchanged across a reload, and an older save gets the setting;
- no script errors.

Found and fixed during testing: without GPU flags (CPU-only WebGL), the ambient tick saturated the main thread.
A Dev 8 test's taps then timed out. A slow-device guard now turns ambient animation off after six slow frames.

## Performance (evidence, not phone numbers)

Measured with `node tests/perf-env1.js docs/perf/env1.json`: the same island with 22 buildings, run twice per mode.
The run used Chromium, software WebGL, a desktop CPU and a 844×390 viewport at 2× pixel ratio.

| | 2D island | Voxel island |
|---|---|---|
| Island ready after `showIsland` | ~275 ms | ~5.4 s (module and shader compile in software GL) |
| Terrain build, JS | — | ~190 ms (once per session) |
| First object sync / later syncs | — | ~80 ms / 0 ms unchanged, ~8 ms for one building change |
| Idle main thread | 94–98 ms/s | 52–68 ms/s (ambient paused by the slow-device guard) |
| Main thread while panning | 165–195 ms/s | 42–43 ms/s |
| Pan frame rate | 60 fps | **1.8 fps** (software rasteriser at 1688×780 px) |
| Draw calls / triangles | — (436 SVG nodes) | 51 / 166k |
| JS heap | ~10 MB | 14–20 MB |

The pan frame rate is the important unknown. In software WebGL every pixel is drawn by the CPU, so this number says
nothing reliable about an iPhone GPU. 166k triangles, 51 draw calls and a static shadow map are well inside what
current iPhones draw at 60 fps, but that has to be confirmed on the device. The main-thread time while panning fell
because the SVG terrain is no longer re-laid out.

## Recommended next milestone

Environment Phase 1b on the Starter Island only:

1. Test on an iPhone through the dev preview, and tune pixel ratio and shadows from real numbers.
2. A voxel sea and sky backdrop to replace the painted one.
3. A Hatchery egg colour pass, plus more distinct habitat silhouettes.
4. Depth-correct creatures: render the island creatures in the same 3D pass so buildings can hide them.

After that, carry the terrain and building kit to the next island.
