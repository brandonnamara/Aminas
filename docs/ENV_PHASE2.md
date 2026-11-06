# Environment Phase 2: environmental art production and world standardisation

- **Branch:** `env2-art-library`, started from `1fb0a0c` (the head of `env1.2-polish`). `main` is not touched.
- **Decisions** (project owner, at the start of this phase):
  - build in the web game and export every asset for Godot 4 (.glb) and MagicaVoxel (.vox);
  - no Meshy this time.
- **Software actually used:** three.js (rendering and the glTF exporter), Playwright (tests, renders, export
  automation) and Node. Godot, Blockbench, Meshy and Figma were **not** operated.

## Deliverables

| # | Deliverable | Where | Status |
|---|---|---|---|
| 1 | Environment art bible: 17 sections, 12 plates | `docs/art-bible/01_ART_BIBLE.md`, `plates/` | complete |
| 2 | Asset library: 95 assets, 177 variants, 8 categories | `src/3d/library/`, list in `docs/art-bible/02_ASSET_LIBRARY.md`, viewer `tools/library.html` | complete (see status split below) |
| 3 | Architectural construction standards and parts kit | `docs/art-bible/03_ARCHITECTURE_STANDARDS.md`, `src/3d/library/kit.js` | complete |
| 4 | Island identity framework: 4 profiles, 8 axes | `docs/art-bible/04_ISLAND_IDENTITIES.md`, `src/3d/library/biomes.js` | Starter implemented; 3 specified and demonstrated as vignettes only |
| 5 | Asset sources and licences | `docs/ASSET_REGISTER.md` | complete; publishers' licences checked on their own sites |
| 6 | In-game screenshots | `docs/screens-env2/` | complete |
| 7 | Automated tests | `tests/` (new `browser-library.test.js`) | 391 passed, 0 failed |
| 8 | Performance measurements | below; `docs/perf/env2.json` | software GL only |
| 9 | Limitations | below | — |
| 10 | Recommended next milestone | below | — |

## What is completed, what is planned, what is only demonstrated

- **In the game (39 assets):**
  - every existing building, ruin and obstacle;
  - the jetty and skiff;
  - oak, pine, birch, blossom and sapling (birch, blossom and sapling now have three real shapes each, not three
    copies);
  - **new on the Starter Island:**
    - old oak, round and flowering bushes, flower patches, tall grass, large ferns, mushrooms;
    - mossy rocks, crystals, vines and hanging moss under the rim;
    - crates, a barrel and sacks on the jetty.
- **Built and ready (44 assets), not yet placed in a world:**
  - cliff segments, island edge, stone pillars, outcrops, cave mouth, arch, basalt, monolith ring;
  - willow, glowcap, crystalwood, charred tree, roots;
  - lantern posts, torch, obelisk, ruined columns, rune stones, orb pedestal, crystal pylon;
  - barrels, crates, sacks, pots, bucket, log pile, cart wheel, haystack, signpost;
  - pond, stream, trough, cloud.
- **Demonstrations, not game assets (11):**
  - the six building-category examples (cottage, granary, nest lodge, workshop, gazebo, moon spire);
  - the kit sampler and the material board;
  - the four island vignettes. Verdant, Obsidian and Celestial are **specifications, not islands.**
- **Planned, not built:**
  - wiring biome profiles into `island3d.js` for new islands;
  - rivers through terrain (only prop stream segments exist);
  - cave interiors;
  - building types for categories the game doesn't have yet (breeding).

## Stage E: Starter Island validation

- **Scenery from the library, on cells that can never hold a building:**
  - hills grow groves (pine stands, oak woods with an old oak, birch and blossom copses) with glades of grass, ferns,
    flowers and mushrooms;
  - chunks and ledges carry mossy rocks and crystals;
  - rims facing the camera carry vines and hanging moss;
  - the jetty is a working dock.

  Layout, buildable cells, gameplay and saves are unchanged.
- **Real level of detail:** every model now builds a half-resolution twin. Nature switches at the widest zoom.
  Battery saver uses the twins for everything. Buildings keep full detail otherwise, because their silhouettes carry
  the identity.

## Performance

Chromium with software WebGL on a desktop CPU, 844×390 phone-landscape viewport. **This is not a phone; iPhone
performance is unverified.**

| Starter Island | Phase 1.2 | Phase 2, normal zoom | Phase 2, widest zoom | Phase 2, Battery saver |
|---|---|---|---|---|
| Triangles | about 165k | 170k | **125k** (nature LOD) | **88k** (all LOD) |
| — nature | 51k | 62k (more species) | 17k | 17k |
| — buildings | 56k | 48k | 48k | 11k |
| — terrain / detail / far islands | 47k / 8k / 4k | 48k / 8k / 4k | same | same |
| Draw calls | 59–61 | 66–73 (more distinct species) | similar | similar |
| Idle main thread | 41–71 ms/s | 19 ms/s | — | — |
| First object sync, once per layout change | 115–165 ms | 177–198 ms (now also meshes the LOD twins) | — | — |
| Terrain build, once | 190–310 ms | 230–400 ms | — | — |

**Per-asset triangle counts and LOD counts** are in `02_ASSET_LIBRARY.md`. Everything is within the art bible
budgets. The landmark tier was set at 15k from the Hatchery benchmark (14k); it was not trimmed to fit an arbitrary
number.

## Tests

`node tests/run-all.js` passes **391 checks across 12 suites.** New is `browser-library.test.js`:

- all 95 assets build;
- every LOD is lighter than its full model;
- .glb and .vox exports are valid;
- the viewer renders;
- the island uses LOD only at the widest zoom (nature) and in Battery saver (everything);
- no script errors.

One older check was corrected: `browser-dev7`'s still-island check now accepts a creature's walk *transition* as
well as its walk animation. That matches the check's intent, and it was the source of the intermittent failure seen
since Phase 1.

## Exports for Godot 4 and MagicaVoxel

`node tools/export-library.js` writes 354 files:

| Format | Count | Details |
|---|---|---|
| .glb | 177 | 1 unit = 1 cell; vertex colours; a rough PBR `aminas_voxel` material and an unlit `aminas_glow` (KHR_materials_unlit) |
| .vox | 177 | 1 voxel = 1/8 cell; up to 255 colours; emissive MATL entries for glow colours; largest dimension 60 |

`manifest.json` lists everything.

- **Validation:** the files were checked structurally (headers, chunks, vertex colours). **They were not opened in
  Godot or MagicaVoxel,** because neither is available here.
- **Size:** the .glb files total about 36 MB, so they are in the ZIP and git-ignored. The .vox files (1.6 MB) and the
  manifest are in git.

## Limitations

- **No iPhone test.**
- **Not checked in Godot or MagicaVoxel:**
  - Godot import of the .glb files (vertex colours, the unlit extension, scale);
  - MagicaVoxel opening the .vox files.
- **Library assets not yet placed:** cliff segments and the cave mouth are free-standing. The island's own cliffs are
  generated at terrain scale and follow the same rules.
- **Building LOD** (Battery saver only) is visibly coarser. Glowing windows bloom at half resolution.
- **Island identity profiles are data and documentation;** the island renderer does not read them yet.
- **The library viewer's auto-layout** is functional, not polished: mixed sizes in one view can crowd.

## Recommended next milestone

**Environment Phase 3: device verification and the Godot pipeline proof.**

1. **iPhone test of the dev preview,** to get real frame times at the three zoom levels and in Battery saver. Tune the
   LOD threshold, pixel ratio and shadow map size from those numbers.
2. **Import a representative set into Godot 4:** 10 assets across categories as .glb. Confirm materials, scale,
   automatic LODs and instancing (MultiMesh). Record the import preset.
3. **Wire one biome profile into `island3d.js` behind a developer flag,** proving that profile-driven terrain,
   vegetation and light work, still without adding an island to the game.
