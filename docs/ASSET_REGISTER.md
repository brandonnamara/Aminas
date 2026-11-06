# Aminas — Environment Asset Register (Environment Phase 1)

**Summary: no third-party art assets were imported.** Every environment model in this phase is original. Each one is
built procedurally in code, from coloured voxels, by the files listed below. They are project-owned, so no attribution
or licence obligations apply. No assets were taken from any commercial game.
Blockbench, MagicaVoxel, Meshy and Figma were not used in this phase. No AI image generation was used for any shipped
asset. Concept images from earlier sessions are reference only and are not in the build.

## External libraries (code, not art)

| Name | Source | Licence | Attribution | Modifications | Where used |
|---|---|---|---|---|---|
| three.js r170 | cdn.jsdelivr.net/npm/three@0.170.0 (already used since v0.5) | MIT | "three.js authors" (licence text in the package) | none | all 3D rendering, including the voxel island |
| three.js GLTFExporter (part of three.js r170) | same CDN, `examples/jsm/exporters` | MIT | as above | none | the library exporter only (`tools/`), not loaded by the game |
| Playwright | npm (dev tooling) | Apache-2.0 | none needed for tooling | none | tests, screenshots, export automation; not shipped |

## External resources: Phase 2 review (licences checked on the publishers' own pages, 6 Nov 2026)

| Resource | Licence (as published) | Commercial use / attribution | What it offers | Decision |
|---|---|---|---|---|
| **Kenney** (kenney.nl/assets) | CC0: "All downloads listed below are licensed CC Zero" | yes / not required | 2D sprites, UI and 3D kits | **Not imported.** Its 3D kits are smooth low-poly with their own proportions; the brief rules out "ordinary low-poly mobile graphics". Good as a CC0 source if a plain utility prop is ever needed. |
| **Quaternius** (quaternius.com, FAQ) | CC0: "All models are under the CC0 License" | yes / not required | stylised low-poly nature, buildings, modular kits | **Not imported.** Stylised low-poly, not voxel; voxelising would lose its silhouettes and still not match the palette. |
| **ambientCG** (ambientcg.com) | CC0 | yes / not required | PBR materials, HDRIs, scans | **Not used.** Aminas uses no textures (art bible, section 12). It could serve as colour reference for natural materials. |
| **Poly Haven** (polyhaven.com/license) | CC0 for assets (logos, renders and text excluded) | yes / not required | HDRIs, textures, models | **Not used**, same reason. HDRI lighting is not part of the style. |
| **itch.io voxel tag** | **varies per pack**: the listing states no licence | per pack | voxel packs (characters, ships, props, buildings) | **Not imported.** Each pack's page would need its own licence check before any commercial use, and none matched the palette and scale rules. Re-check any specific pack individually before use. |
| **Blockbench** (blockbench.net) | the editor is open source under GPL | models made with it belong to their author | voxel and low-poly modelling editor | **Not operated in this milestone.** Library assets are built in code; the `.vox` exports can be opened in a voxel editor for hand edits (MagicaVoxel format). |
| **Meshy** | — | — | AI mesh generation | **Not used,** as the project owner decided: smooth meshes, credit cost, and inconsistency with hand-built voxels. |
| **Figma** | — | — | design boards | **Not used.** The art bible plates are real renders kept in the repo and in the published bible. |

**No external art asset is in the game or the library.** If one is ever imported, add a row here with: source URL,
the exact pack, its licence text, attribution text (if any), modifications made, and where it is used.

## Original assets created

All are in `src/3d/`. "Used" means where the asset appears in the game.

| Asset | Defined in | Variants | Used |
|---|---|---|---|
| Voxel mesher (faces, AO, vertex colours) | voxmesh.js | — | every model |
| Palettes and scale constants | voxstyle.js | — | every model |
| Island terrain: grass, dirt, clay and stone strata, deep rock, jagged underside, vines, stalactites, outcrops | island3d.js `buildTerrain` | built from the island map | Starter Island |
| Water surface (ripple and sparkle shader) and lake bed | island3d.js | — | Starter Island lake and shore |
| Cloud banks | island3d.js | 5 | below the Starter Island |
| Ambient motes | island3d.js | — | over the Starter Island |
| Grass clumps, flowers, path pebbles, sand shells | island3d.js `buildDetail` | hashed | free cells |
| Hatchery | voxbuild.js `B.hatchery` | levels 1–5, ruin | Hatchery building |
| Hollow (home) | `B.hollow` | levels, ruin | Hollow |
| Tidegate | `B.tidegate` | levels, ruin | Tidegate |
| Moonshrine | `B.moonshrine` | levels, ruin | Moonshrine |
| Reliquary Gate | `B.reliquarygate` | built, ruin | Reliquary Gate |
| Forge | `B.forge` | levels, ruin | Forge |
| Farm | `B.farm` | levels | Farm |
| Mine | `B.mine` | levels | Mine |
| Habitat cottage | `B.habitat` | 9 elements × levels, ruin | all habitats |
| Lantern, festival lantern, flowerbed, bench, statue, fountain | `B.*` | — | decorations |
| Oak, pine, birch, blossom tree, sapling, bush, fern | voxbuild.js `N.*` | seed-varied | hills, ledges, chunks; obstacles |
| Pebble, boulder, stump | `N.*` | seed-varied | obstacles |
| Jetty, skiff | voxbuild.js `X.jetty`, `X.skiff` | — | Starter Island jetty |
| Lighthouse | `X.lighthouse` | — | east rock |
| Plaza with sun mosaic | `X.plaza` | — | central plaza |
| Seven standing stones | `X.stones` | dormant / glowing | stone circle |
| *Phase 1.1:* hanging rock root, grass drape, cliff rock formations, hanging roots | island3d.js `buildTerrain` | built from the island map | Starter Island underside and cliffs |
| *Phase 1.1:* waterfalls (shader ribbon, churn, spring mouth) | island3d.js | 2 | camera-facing cliffs |
| *Phase 1.1:* magic motes | island3d.js `buildSparks` | per place | Hatchery, Tidegate, Moonshrine, Reliquary Gate, stones |
| *Phase 1.2:* distant voxel islands (6, hazed, parallax) | island3d.js `farIslet` | 6 | Starter Island sky |
| *Phase 1.2:* waterfall back sheets and mist puffs; sea glints and horizon mist (backdrop SVG) | island3d.js, island-art.js | — | Starter Island |
| *Phase 1.2:* designed ruins (Fallen Nursery, Buried Hollow, Dry Tidegate, Fallen Temple, Cold Forge, abandoned cottage) and the ruin kit | voxbuild.js | — | ruined buildings |
| *Phase 2:* environment library: 95 assets, 177 variants (terrain and geology, vegetation, architecture kit and category demonstrations, decoration, water objects, island vignettes); full list in `art-bible/02_ASSET_LIBRARY.md` | `src/3d/library/*.js` | see the library list | catalogue; on the Starter Island: old oak, round and flowering bushes, flower patches, tall grass, large ferns, mushrooms, mossy rocks, crystals, vines, hanging moss, jetty crates, barrel and sacks |
| *Phase 2:* exports (.glb for Godot 4, .vox for MagicaVoxel) | `tools/export-library.js` | all assets | `assets/library/` |
| *Phase 1.1:* window sills, bars and shutters; foundation skirts; Hatchery porch, chimney, lanterns and straw nest; habitat silhouette features | voxbuild.js | — | all buildings |

Buildings without a voxel model fall back to their existing 2D picture. In Phase 1, the only such building is one
under construction, which keeps its 2D scaffolding.
