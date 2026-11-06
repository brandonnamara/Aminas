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

## Free asset libraries considered and not imported

| Library | Licence (as published) | Decision |
|---|---|---|
| Kenney (kenney.nl) voxel and nature packs | CC0 | Not imported. Their proportions and palette did not match the reference island, and code-built models share one palette and scale exactly. They remain suitable for later phases (CC0, commercial use allowed, no attribution required). |
| Quaternius packs | CC0 | Not imported, same reason. Their low-poly (non-voxel) style would also clash. |
| ambientCG / Poly Haven textures and HDRIs | CC0 | Not used. The style guide forbids textures; flat-shaded voxels are the look. |
| itch.io voxel packs | varies per pack | Not used. Licences differ per author and would need checking one by one before any commercial use. |

The workspace's network is restricted, so these libraries were not downloaded or inspected file by file.
The licences above are the ones the libraries publish. Re-check each specific pack before importing it.

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
| *Phase 1.1:* window sills, bars and shutters; foundation skirts; Hatchery porch, chimney, lanterns and straw nest; habitat silhouette features | voxbuild.js | — | all buildings |

Buildings without a voxel model fall back to their existing 2D picture. In Phase 1, the only such building is one
under construction, which keeps its 2D scaffolding.
