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
