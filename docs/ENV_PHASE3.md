# Environment Phase 3: mobile performance, visual optimisation and asset pipeline validation

- **Branch:** `env3-mobile`, started from `e2dac52` (the head of `env2-art-library`). `main` and production are not
  touched.
- **Software actually used:**
  - Godot 4.3-stable (headless and under a virtual display; Compatibility renderer on a software GPU);
  - three.js, Playwright, Node.
- **Not used:** Meshy, Blockbench, MagicaVoxel and Figma were not operated.
- **Device testing:** **no iPhone test has been performed yet.** Every frame rate below comes from Chromium with
  software WebGL on a desktop CPU. The phone test is built into the dev preview and waits for the project owner
  (`perf/DEVICE_TEST.md`). **Phase 3 is not complete until those results are in.**

## Status by priority

| # | Priority | Status |
|---|---|---|
| 1 | Real-device performance | Measurement tool built and tested (Settings → Run performance test). **Waiting for iPhone results.** The software-GL bottleneck analysis is done. |
| 2 | Visual optimisation | Battery saver improved: better building LOD twins, shadows kept. Quality tiers added. Lighting, vegetation and water are unchanged, pending device numbers (see "Decisions"). |
| 3 | Asset pipeline (Godot 4) | **Done and actually run.** 12 assets plus 12 LOD twins imported. Three compatibility problems found and fixed. The workflow is in `GODOT_PIPELINE.md`. |
| 4 | Performance standards | Tiers implemented. Budgets per iPhone generation are written in `perf/PERFORMANCE_STANDARDS.md`, labelled as targets. |
| 5 | Project protection | Branch only. Gameplay, layouts and progression are unchanged. Save compatibility is tested. The full suite was run. |

## 1. The on-device performance test

`src/bench.js` adds **Settings → Run performance test**. The fixed script has 7 steps (about 40 s):

1. idle;
2. pan;
3. pan at the widest zoom;
4. pan at the closest zoom;
5. pan in High;
6. pan in Balanced;
7. pan in Battery saver.

An optional 3-minute sustained pan in 15 s slices serves as the heat test.

**For each step it records:**

- frame rate;
- p50, p95 and p99 frame times, the worst frame, and the share of frames over 33 ms;
- the island's CPU time per drawn frame;
- triangles, draw calls, pixel ratio, canvas size, shadow map size and LOD state.

**It also records:**

- the device: user agent, pixel ratio, screen, GPU string, cores;
- load timings: page loaded, 3D module loaded, island first shown;
- JS heap where the browser exposes it.

**It does not invent:**

- battery use (Safari has no Battery API);
- temperature (no thermal API);
- GPU time (no timer queries);
- memory on Safari.

These are reported as "not available". Thermal throttling shows up as frame-rate decline in the heat test.

**Results** appear in a sheet with a **Copy results** button (JSON plus a one-line summary). The last result is kept
in `localStorage` only. It is never written into the save.

## 2. Bottleneck analysis

Same machine, software GL, 844 × 390 landscape, phone emulation (pixel ratio 3, touch). Raw files are
`perf/env3-before.json` and `perf/env3-after.json`.

| Evidence | Reading |
|---|---|
| Pan: 3.4 fps at pixel ratio 1.5 vs 9.5 fps at pixel ratio 1 (2.25 × fewer pixels, 2.8 × faster) | **Fill rate dominates.** |
| Pan at the widest zoom (125k triangles) vs normal zoom (170k) at the same pixel ratio: 3.1 vs 3.4 fps | **Triangle count is not the limit.** 27 % fewer triangles gave no gain. |
| 68–73 draw calls | Low. Not a limit. |
| Island CPU per drawn frame: 4–7 ms; occlusion pass 4–8 ms, at most about 9 times a second | CPU is fine for 60 fps if the GPU keeps up. |
| Terrain build 245–355 ms, object sync 150–290 ms | Once per visit or layout change, not per frame. They are the main part of the island's first-show time. |
| Idle main thread 14–56 ms per second (noisy, both before and after) | The still island costs almost nothing. |

- **Conclusion:** on a phone, the levers that matter are, in order:
  1. pixel ratio (resolution);
  2. shadow-map sampling;
  3. overdraw from transparent effects.

  Triangle trimming matters much less. That is why the tiers change resolution and shadows first, and why the art
  was not simplified to hit triangle numbers.
- **Untested:** this ordering comes from software GL. Apple's tile-based GPUs are usually fill-bound too, but the
  iPhone test will confirm or correct it.

## 3. Quality tiers

`A.Perf.TIERS` in `src/perf.js` holds the tiers. The island and the creature runtime both read them. Settings has a
new control, **3D detail: Auto / High / Balanced**. Battery saver stays a separate switch and overrides the tier.

| | High | Balanced (Auto on phones) | Battery saver |
|---|---|---|---|
| Pixel-ratio cap | 2 | 1.5 | 1 |
| Shadow map | 2048 | 1024 | 512 (was: no shadows) |
| LOD | nature at the widest zoom | nature at the widest zoom | everything, with improved twins |

- **Balanced reproduces Phase 2's phone settings exactly.** Auto players on phones see no change except a better
  Battery saver.
- **Saves:** the new `settings.quality` defaults to `auto`. Old saves without it, and invalid values, read as `auto`.
  This is tested.

## 4. Visual changes

### Better LOD twins

![LOD twins before and after](screens-env3/lod-before-after.png)

In Phase 2, each half-resolution block took the colour of the majority of its 8 voxels, hidden ones included, and
needed 3 of 8 voxels to exist. Thin roofs vanished and interiors showed through. Glow bloomed from a single voxel.

Now:

- **voxels the player can see** vote, and upper ones count double;
- a block needs 2 of 8 voxels;
- glow needs 2 of 8.

Results:

- the Forge keeps its slate roof and chimney;
- the Hatchery keeps its roof;
- the Moonshrine keeps its pillars.

Measured on top-face colour error against the full model:

| Building | Before | After |
|---|---|---|
| Forge | 0.056 | 0.010 |
| Hatchery | 0.044 | 0.006 |
| Moonshrine | 0.072 | 0.021 |
| Habitat | 0.024 | 0.033 (slightly worse) |

**The cost:** Battery saver draws **91k triangles instead of 88k (+3 %)**. Building twins go from 10.9k to 12.2k
triangles; nature twins from 17.2k to 18.8k.

### Battery saver keeps shadows

Shadows are re-rendered only when the island changes, so a 512 map costs little. Buildings and trees are grounded
again.

![Battery saver before and after](screens-env3/cmp-saver.png)
![Battery saver, close zoom](screens-env3/cmp-saver-close.png)
![Widest zoom (nature LOD) before and after](screens-env3/cmp-widest.png)

### Normal play is unchanged

At the default zoom in Balanced, the screenshots before and after differ only where ambient animation moved:
creatures, swaying leaves and motes (2.3 % of pixels).

### Decisions: what was deliberately not changed yet

Lighting, water, vegetation density and effects were not changed in this phase.

- The brief asks to find bottlenecks before optimising.
- The art of these systems was approved in Phases 1.2 and 2.

The analysis shows the costs are resolution and shadow sampling, not these systems. Any change to them should follow
the iPhone numbers. Examples:

- a cheaper water shader on A12–A13 if the test shows water-heavy views are slow;
- or the reverse: richer effects on High if A16 phones have headroom.

## 5. Godot 4 pipeline validation (actually run)

Full report: `GODOT_PIPELINE.md`. Renders and the JSON report are in `godot/`.

**Imported:** 12 assets.

| Category | Assets |
|---|---|
| Buildings | Hatchery, habitat |
| Ruin | Forge ruin |
| Terrain | cliff, mossy rock, crystals |
| Vegetation | oak, old oak, pine, glowcap |
| Decoration | lantern post |
| Water | pond |

Their 12 LOD twins were imported too.

**Checks passing on all 12:**

- scale (1 unit = 1 cell);
- pivot (footprint centre, ground at 0);
- vertex colours;
- materials;
- LOD twin.

**Instancing:** 400 trees as MultiMesh, with visibility-range LOD, rendered correctly.

**Problems found and fixed:**

1. Colours were dark and over-saturated in the Compatibility renderer: linear vertex colours were shaded as sRGB.
   Fixed with Aminas voxel and glow shaders that handle both colour spaces.
2. Godot's generated LODs smeared voxel colours. Fixed by turning them off and using the exported `_lod.glb` twins
   (the exporter now writes them).
3. The game's light values blew out in Godot. Fixed by calibrating against the web viewer.

![Godot import before and after the Aminas preset](godot/import-before-after.png)

**Not tested:**

- the Forward+ and Mobile (Vulkan/Metal) renderers;
- an iOS export from Godot;
- MagicaVoxel.

## 6. Tests

`node tests/run-all.js`: see the result in the milestone report.

The new suite is `browser-env3.test.js` (18 checks). It covers:

- quality-tier save compatibility;
- tier selection;
- what the island does in each tier;
- switching through Settings;
- Battery saver on and off;
- LOD colour fidelity and weight;
- the performance test end to end: phases, tier restore, report fields, results sheet, not saved in the game save.

## 7. Before and after (software GL, same machine)

| Starter Island, phone emulation | Phase 2 | Phase 3 |
|---|---|---|
| Normal zoom (Balanced): triangles / calls / pixel ratio / shadow | 170k / 68 / 1.5 / 1024 | same |
| Widest zoom: triangles | 125k | 127k (nature twins are a little heavier) |
| Battery saver: triangles / shadows | 88k / off | 91k / 512 map |
| Battery saver pan, software GL | 9.5 fps | 7.8 fps (shadow sampling; the cost of the better look) |
| Desktop default (High) | 170k, pixel ratio 2, 2048 | same |
| Island first shown (software, includes three.js from the CDN) | 5.5–6.3 s | 5.3–6.4 s |

The Battery saver frame-rate cost must be checked on an iPhone. If it is significant there, set
`TIERS.saver.shadows` to false. That is a one-line change.

## 8. Limitations

- **No iPhone measurements yet.** The per-generation budgets are targets.
- Software-GL frame rates are not phone frame rates. Use them only to compare before and after.
- **Godot:**
  - only the Compatibility renderer was run;
  - the Mobile renderer calibration (sun 0.70, ambient 0.41) is a starting point, untested.
- The habitat's LOD top colour is slightly less faithful than before (0.024 → 0.033). The other three buildings are
  much better.
- The quality tier changes resolution, shadows and LOD only. Ambient motes and effects are still sized by device type,
  not by tier.

## 9. What the project owner needs to do

Run Settings → **Run performance test** on your iPhone, ideally once with the heat test, and paste the results. Then:

1. I fill in the "Measured on device" row of the standards.
2. I set Auto's default tier per generation.
3. I decide whether Battery saver keeps shadows.
4. If the numbers leave headroom, I propose the lighting and water refinements.
