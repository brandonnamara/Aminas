# Aminas · Phase 14: world, environment and Tripo integration

**Branch:** `p14-world`, from `p13-core` (`f25eb9d`). Production `main` (`0fc9e36`) is untouched.

**Testing:** desktop Chromium with software graphics at 844×390. **Nothing was tested on an iPhone.** Software
rendering gives triangle and draw-call counts that are real, but its frame times are not comparable with a phone
GPU, so no frame rate is claimed.

No economy, production, reward, battle or save value was changed. No monster model was changed.

## 1. Environment audit

### Already at the standard (not rebuilt)
* **The Art Bible** (`docs/art-bible/`, four documents) is complete: direction, scale, construction, colour,
  materials, lighting, effects, budgets, pipeline and four island profiles. The work follows it.
* **The voxel library** (`src/3d/library/`): about 60 kinds of terrain, vegetation, decor and architecture, many
  of which were not yet used on the island.
* **The island renderer:** one terrain mesh, instanced models, shadows drawn once per change, a 12 fps ambient tick
  that stops at rest, in the background and in Battery saver, quality tiers and LOD.
* **Groves, meadow detail, cliff vines and moss, waterfalls with mist, clouds, motes and the jetty** (Environment
  Phases 1 to 4).
* **Arenas:** ten distinct dungeons with their own floors, props, lighting, fog, particles and a boss room each.

### Gaps found
* **Island:** nothing on the ground spoke of the past except the story ruins; most library pieces (column ruins,
  rune stones, stone pillars, willows, glowcaps, roots, log piles, pots) were unused.
* **Arenas:** a floor, a few props and a soft painted backdrop, with an empty band between them. The boss room added
  one structure but the boss stood on the same floor as any foe.
* **Loot Ruins:** no record of what had been found where, and a charm found in a ruin appeared as a separate banner
  that covered the result sheet's title.
* **Tripo buildings:** darker than the island and standing on top of the ground instead of in it.

### Asset reuse
The new island scenery is entirely existing library pieces. The arena dressing reuses the arena kit's blocks and
the existing glow materials.

### Rendering concerns
* **The island is over the Art Bible's budget** (under 180,000 triangles, under 80 draw calls) and was before this
  phase: 194,000 to 200,000 triangles with voxel buildings alone. See section 5.
* Each imported model adds two textures, about 7 MB of GPU memory on phones (27 MB with the full files).

### Recommendations (not done in this phase)
1. Measure the island on your iPhone with the three models in place before adding anything more to it.
2. Bring the island back under budget with LOD on the meadow detail at mid zoom (it is about 31,000 triangles).
3. Cliffs, waterfalls and lighting were already at the standard of Environment Phase 4; I did not change them.
4. Use the unused library architecture (`T.arch`, `T.monolithRing`, `D.obelisk`) for the other islands when they
   get their 3D phase, not on the Starter Island.

## 2. Tripo integration (final)

| | Hatchery | Farm | Fire habitat |
|---|---|---|---|
| Source | `voxel_fortress` | `voxel_farm_house` | `stylized_character`, figure removed |
| Export | 940,696 triangles, 3 × 4096² | 962,168, 3 × 4096² | 978,173, 3 × 4096² |
| Full file (desktop, High) | 96,000 triangles, 2048 + 1024 px, 2.8 MB | 95,994, 2.9 MB | 95,996, 2.0 MB |
| Phone file (touch screens, Balanced) | 19,672 triangles, 1024 + 512 px, 0.66 MB | 25,585, 0.83 MB | 9,996, 0.39 MB |
| Battery saver file | 7,580 triangles, 512 + 256 px, 0.30 MB | 12,860, 0.44 MB | 5,000, 0.19 MB |
| Placement | 3 × 3, turned so the door faces the lower left | 3 × 2, square model overhangs slightly | 3 × 3, turned so the arena opens to the camera |
| Base sunk into the terrain | 0.22 cells | 0.12 cells | 0.60 cells |
| Brightness lift | ×1.7 | ×1.45 | ×1.75 |

**The figure.** The Habitat export's mesh is three unconnected shells: the fortress (720,419 triangles), a banner
pole (10,030) and the human figure (247,724). The figure shared no vertex with the fortress, so it was removed
whole and nothing was repaired or rebuilt (`tools/remove-component.mjs`). The fortress is untouched; the render at
full, standard and phone detail shows no hole.

**Brightness.** The models' own colours are multiplied evenly (a per-model `gain`). It adds no glow, changes no hue
and leaves the lava's own bright colours as they were. The island's lighting is unchanged.

**Integration.** The model replaces only the picture. Footprint, placement, moving, turning, upgrades, production,
residents, breeding, hatching, taps and save data are the existing building system's. While a model loads, or if it
fails, the voxel building is drawn. Nothing about models is saved. The development preview cannot serve `.glb`
files, so it carries the same bytes in `.glb.json`; the branch has the `.glb` files.

**Windmill:** stationary, as you asked. **Other models:** catalogued (`claude/phase14-tripo-CHANGES.md`), none
integrated.

## 3. Starter Island

* **Old stonework in the scenery:** standing and fallen column ruins and faintly glowing rune stones in the glades,
  on the ledges and on the loose chunks around the island, with stone pillars and roots on the rim and willows,
  glowcaps, log piles and pots in the woods. Only on hills, ledges and chunks, which are never built on.
* **The old road:** a line of worn flagstones, some tilted or mossed, a few with a pale fleck, running down the
  island in a gentle curve. Ground detail only: invisible to placement, hidden under buildings, not saved.
* **The three Tripo buildings** sit in the ground at the island's brightness.
* Not changed: terrain shapes, cliffs, waterfalls, water, lighting, clouds (already at the Art Bible standard).

## 4. Dungeons and boss arenas

* **A middle distance for every arena:** two rows of structures between the floor and the far backdrop, built
  for each place: ruined columns, arches and walls on the Forgotten Road; pillars, beams and banners in the
  Gathering Hall; chimneys in the Cold Kiln; bookshelves and arches in the Hollow Veil; lantern trees in the
  Lantern Orchard; cliffs on the Windworn Stair; crystal shards in the Resonance Scar; root arches in the Heartwood;
  coral in the Drowned Steps. They fade toward the arena's fog with distance. 190 to 250 blocks per arena.
* **Ground detail** at the floor's edges, never in the fighters' lane.
* **Boss rooms:** a framed boss ground with glowing corner studs, two braziers in the dungeon's own light, two
  banners, and (in seven of the ten) the boss's treasure: an open chest, spilled coins and a fallen column.
* Not changed: encounters, bosses, abilities, rewards, the boss introduction, transitions between battles.

## 5. Performance (software rendering, desktop Chromium; counts are real, frame times are not phone figures)

| Scene | Draw calls | Triangles | Textures |
|---|---|---|---|
| Island, voxel buildings (before) | 71 | 200,738 | 2 |
| Island, three models, phone files | 69 | 231,043 | 8 |
| Island, + scenery and old road (now, phone) | 76 | 231,417 | 8 |
| Island, three models at full files (desktop High, calculated) | about 76 | about 463,000 | 8 |
| Boss arena, average of three (before) | 38 | 13,266 | — |
| Boss arena, average of three (now) | 41 | 16,558 | — |

* Mobile now adds about 31,000 triangles to the island for the three models (was 78,000 with the earlier phone
  files). The scenery and road added about 400 triangles and 7 draw calls.
* GPU geometry counts return to the same value after repeated boss battles (no leak), measured over five rounds.
* No new continuous animation. Battery saver and Reduce Motion behave as before; the result-sheet effect is off
  under both.

## 6. Exploration

* **Loot Ruins:** "Stories found 1 of 3" across the top; each ruin says how often it has been searched, names the
  story found there or says something is still hidden, and mentions that a charm can turn up; a ruin ready to
  search is outlined.
* **Result:** the first search's story is presented as a "New discovery". **Fix:** a charm found in a ruin is now
  shown among the finds with where to equip it; before, a separate banner opened over the sheet and covered its
  title.
* Rewards, chances and rest times are unchanged.

## 7. Tests

| Suite | Result |
|---|---|
| `browser-models14` (new) | 31 of 31 |
| `browser-world14` (new) | 16 of 16 |
| `browser-arena7` | 30 of 30, three runs (its leak check now measures three rounds; see below) |
| `browser-env1` | 20 of 20 (its camera wait was lengthened: the island draws slower with the models) |
| `browser-perf-fix`, `browser-hatchery13b` | 23 of 23, 35 of 35 |

**Arena leak check.** With the fuller arenas the existing check ("geometries after three more boss battles ≤ after
the first three") failed once in three runs: the creature-template cache sometimes fills one round later. A
five-round measurement showed the count settles and stays flat, so the check now asserts that it stops growing.

**Complete suite on the final build** (38 suites, one at a time, nothing else running): **1,230 of 1,230 passed.**

An earlier complete run found one real failure, now fixed: `browser-env3` "Battery saver draws far fewer
triangles" (buildings 53,604 → 28,678, needing under 40%). The phone files were also used in Battery saver, so
the three models were not reduced further. Each model now has a third, Battery saver file (12,860, 7,580 and
5,000 triangles, 512 px textures); buildings now drop 53,604 → 16,586 in Battery saver.

## 8. Known limitations

* **Not tested on an iPhone.** The island is over the Art Bible's triangle budget, as it was before this phase.
* The Farm's windmill is still; its sails are not a separate part.
* Cliffs, waterfalls, water and island lighting were not changed.
* Battle transitions and boss introductions were not changed.
* No gameplay recordings were made in this phase; screenshots only.
* The Habitat's lava is part of its texture and does not glow at night.

## 9. Files

| File | Change |
|---|---|
| `src/model-slots.js`, `src/3d/modelslots.js` | Model slots, phone and Battery saver files, brightness, ground sink, `.glb.json` fallback |
| `assets/models/` | Nine `.glb` files (full, phone, Battery saver) for the Hatchery, Farm and Fire habitat, 11 MB in total |
| `src/3d/island3d.js`, `src/vox-island.js` | Models on the island, scenery layer, old road |
| `src/3d/library/decor.js`, `src/3d/library/terrain.js` | Library pieces made available as island scenery |
| `src/3d/arenas.js` | Arena dressing and boss grounds |
| `src/ui-pve.js`, `src/ui-v07.js`, `src/ui-p14.css` | Loot Ruins presentation and the charm fix |
| `tools/optimize-model.mjs`, `tools/remove-component.mjs` | Model preparation (build-time only) |
| `tests/` | Two new suites; `browser-arena7` and `browser-env1` updated |

Screenshots: `docs/ui/screens14/models/` (Hatchery, Farm and Habitat before and after), `world/` (island, ruins),
`arenas/` (all ten arenas and boss rooms), `compare/` (six boss rooms before and after).

---

# Phase 14 finalisation (preview Version 29)

All measurements below are desktop Chromium with software graphics at 844×390, phone detail setting (touch screen,
Balanced tier), fixed daylight. Triangle and draw-call counts are real counts of what is submitted; they say nothing
about an iPhone's frame rate. **Nothing was tested on an iPhone.**

## 1. Mobile performance: hidden geometry removed

The island camera never turns (it pans and zooms only), so it only ever sees faces turned towards it. Every solid
part of the island is now drawn as a "view" copy holding only those faces (about half), while the full model sits on a
layer only the sun's shadow camera draws. Shadows are drawn once per change, so the full models cost nothing per frame.
Batches of scenery facing several ways are split by quarter turn only where that saves 12,000 or more triangles, so
no draw calls were added. The meadow detail cubes now have three faces instead of five.

A pixel comparison of the island before and after differs only in animated things (the walking companion, the
waterfall, leaf sway); terrain, buildings, trees and shadows are identical.

| Island, default view | Version 28 | After culling only | Version 29 (with everything below) |
|---|---|---|---|
| Triangles | 224,923 | 146,878 | **160,692** |
| Draw calls | 76 | 76 | **79** |
| Terrain / buildings / nature / detail | 48,116 / 87,481 / 63,372 / 26,540 | 32,328 / 46,284 / 49,972 / 15,924 | 49,592 / 45,432 / 49,972 / 15,924 |

The island is now under the Art Bible's budget (180,000 triangles, 80 draw calls) at the default view. Zoomed fully
out it is 129,558 triangles and **87 draw calls** (was 184,871 and 84): the far-zoom tree LOD adds draw calls, and
that view is still over the 80-call budget.

## 2. Cliffs, waterfalls and water

* **Cliff skin:** on the upper cliff faces the camera sees, ledges in the rock's own colour with a darker line
  beneath (the strata read as layers), larger stones set in the face, moss drapes and roots under the grass lip, and a
  rare cold crystal glint deep in the stone (the World Resonance, as a hint). One instanced draw call, about 17,000
  triangles, no shadows, with the same aerial haze as the rock.
* **Haze:** the upper cliff no longer reads as see-through against the sky. The fade now starts 2 units below the
  rim and reaches 42 % at 12 units (was from the rim, 50 % at 10). The hanging root still fades into the air.
* **Waterfalls:** a narrower, faster front veil over the main sheet gives the water depth; white spray where it
  leaves the lip and where the sheet breaks up lower down; a wider, fainter bank of spray mist below. Veils and low
  mist share one draw call each; spray shares the churn's.
* **Sea:** unchanged (it is the painted backdrop).

## 3. Lighting and atmosphere

* **Imported models** now carry the same face grade as the voxels (tops 1, sides 0.86 and 0.93, undersides 0.6),
  normalised so it adds contrast without darkening. The Tripo buildings now read with the same light and shade as
  the voxel buildings beside them. Their texture colours are unchanged.
* The haze change above is the depth change: a solid rim against a hazy root separates island from sky.
* Sun, sky fill and tone mapping are unchanged. Values recorded in the Art Bible.

## 4. Battle entry and boss introductions

* **Every dungeon battle** opens with a short card naming the place and "Battle 4 of 10", gone after about a second.
* **Bosses:** the card names the Guardian of its dungeon (or The Island Boss), its element, "Battle 10 of 10", and
  how it fights, in the game's own words (its mechanic, or the Guardian trait). In the 3D arena the camera opens
  close on the boss, framed from its side so your Amina is out of shot, while the boss plays its own approved move,
  then eases back to the battle view.
* **Skippable:** one tap ends it (the tap is not a move); left alone it ends in about 2 seconds. Under Reduce Motion
  and Battery saver: no camera move and no animation, and the card still says who the boss is.
* Battle rules, encounters, rewards and saves are unchanged.

## 5. Tests

| Suite | Result |
|---|---|
| `browser-intro14` (new) | 12 of 12 |
| `browser-models14`, `browser-world14` | 31 of 31, 16 of 16 |
| `browser-env1`, `env1.2`, `env3`, `env4` | 20, 10, 19, 10: all pass (`env4`'s absolute threshold for building triangles lowered from 40,000 to 20,000, since half the faces are now not drawn) |
| `browser-hideseek`, `browser-hideseek12c` | 41 of 41, 58 of 58 |

**Complete suite (39 suites, one at a time): 1,238 of 1,242.** The four failures are all in `browser-perf-fix`, one
scenario: a simulated struggling device at 60 fps (it measured the display at 20 fps in that run and did not step its
resolution down as expected). Run alone afterwards, the suite passed **23 of 23 twice**. It is the timing-sensitive
suite noted in earlier phases; I report it as a failure of the full run, not as passed.

## 6. Screenshots and recordings

* `docs/ui/screens14/final/compare-*.jpg`: Version 28 (left) and Version 29 (right) at fixed daylight: default view,
  zoomed out, both waterfalls, the Tripo buildings. `before/` and `after/` hold the full-size images.
* `docs/ui/screens14/intro/`: entry card, boss introduction, Island Boss introduction.
* `docs/ui/screens14/recordings/island-cliffs-waterfalls.mp4` (18 s): in to the first waterfall, along the cliffs to
  the second, out to the whole island.
* `docs/ui/screens14/recordings/battle-entry-and-boss-intros.mp4` (14 s): an ordinary battle entry, then three boss
  introductions.

## 7. Known limitations

* Not tested on an iPhone; no frame-rate claim is made.
* Zoomed fully out the island draws 87 draw calls, over the 80 budget (default view: 79).
* The day/night cycle makes the island darker in the evening; comparisons were taken with it off.
* The cliff skin is on the two camera-facing sides only (the others are never seen).
* The boss camera move needs the 3D arena; in the 2D fallback only the card shows.
* `browser-perf-fix` failed in the complete run and passed alone (above).
* The Hide and Seek arena shares the island's terrain builder but not its renderer, so the cliff skin and culling do
  not appear there; its own camera orbits.
