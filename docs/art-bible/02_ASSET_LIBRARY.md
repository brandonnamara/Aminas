# Aminas — Environment Asset Library

*Generated from `assets/library/manifest.json` by `tools/library-doc.js` (2026-11-06). Browse it live in `tools/library.html`.*

**Status:** `in-game` = on the Starter Island today · `library` = built, reviewed, exported, ready to place · `demo` = a demonstration of the standards, not a game asset.

**Files:**

- `assets/library/vox/<category>/<id>[_variant].vox`: MagicaVoxel, 1 voxel = 1/8 cell (in git).
- `assets/library/glb/...`: glTF binary for Godot 4, 1 unit = 1 cell. These are regenerated with `node tools/export-library.js`; they are in the release ZIP and not kept in git, because of size.

## A. Terrain and geology

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Grass block | `grassBlock` | 0.5×0.5 | 1 | in-game | 192 | 48 |
| Soil block | `soilBlock` | 0.5×0.5 | 1 | in-game | 192 | 48 |
| Layered cliff segment | `cliff` | 2×1.5 | 3 | library | 4,068–4,360 | 856–908 |
| Floating island edge | `islandEdge` | 2×2 | 1 | library | 3,984 | 984 |
| Stone pillar formation | `stonePillars` | 1.5×1.5 | 2 | library | 1,216 | 376 |
| Rocky outcrop | `outcrop` | 2×1.5 | 2 | library | 1,324–1,348 | 336–344 |
| Moss-covered rock | `mossyRock` | 1.5×1.5 | 2 | library | 892–956 | 252–276 |
| Boulder (obstacle) | `boulder` | 1×1 | 1 | in-game | 1,076 | 340 |
| Pebbles (obstacle) | `pebble` | 1×1 | 1 | in-game | 192 | 48 |
| Crystal cluster | `crystals` | 1×1 | 5 | library | 676 | 164 |
| Cave entrance | `caveMouth` | 3×2.5 | 1 | library | 2,244 | 608 |
| Natural stone arch | `arch` | 3×1 | 1 | library | 1,312 | 360 |
| Basalt columns | `basalt` | 1.5×1.5 | 1 | library | 3,204 | 608 |
| Fallen monolith ring | `monolithRing` | 2.5×2.5 | 1 | library | 832 | 356 |

## B. Vegetation

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Oak | `oak` | 1×1 | 3 | in-game | 1,260–1,804 | 380–536 |
| Old oak | `oakOld` | 1×1 | 3 | library | 2,028–2,088 | 592–596 |
| Pine | `pine` | 1×1 | 3 | in-game | 612–812 | 196–248 |
| Birch | `birch` | 1×1 | 3 | in-game | 548–764 | 196–252 |
| Blossom tree | `blossom` | 1×1 | 3 | in-game | 564–668 | 168–216 |
| Weeping willow | `willow` | 1×1 | 3 | library | 1,672–1,712 | 436–464 |
| Glowcap (fantasy) | `glowcap` | 1×1 | 3 | library | 1,260–1,368 | 434–466 |
| Crystalwood (fantasy) | `crystalwood` | 1×1 | 3 | library | 652–668 | 222–236 |
| Charred tree | `charredTree` | 1×1 | 3 | library | 156–172 | 60–68 |
| Sapling | `sapling` | 1×1 | 3 | in-game | 156–252 | 56–104 |
| Berry bush | `bush` | 1×1 | 3 | in-game | 372–388 | 120 |
| Round bush | `roundBush` | 1×1 | 3 | library | 364–396 | 116 |
| Flowering bush | `flowerBush` | 1×1 | 3 | library | 352 | 112 |
| Flower patch | `flowerPatch` | 1×1 | 3 | library | 200–224 | 76–92 |
| Tall grass | `tallGrass` | 1×1 | 3 | library | 152–248 | 56–64 |
| Fern (small) | `fern` | 1×1 | 3 | in-game | 92 | 12 |
| Fern (large) | `fernLarge` | 1×1 | 3 | library | 300–304 | 52–80 |
| Mushrooms | `mushrooms` | 1×1 | 3 | library | 232–248 | 76–80 |
| Exposed roots | `roots` | 1×1 | 3 | library | 260–276 | 68–72 |
| Stump (obstacle) | `stump` | 1×1 | 1 | in-game | 280 | 96 |
| Hanging vines | `vines` | 1.25×0.5 | 3 | library | 284–384 | 72–100 |
| Hanging moss | `hangingMoss` | 1×0.5 | 2 | library | 356–360 | 112–116 |

## C. Architecture: kit, standards and demonstrations

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Material board | `materialBoard` | 7×7 | 1 | demo | 10,752 | 2,688 |
| Component kit sampler | `kitSampler` | 8×7 | 1 | demo | 14,916 | 4,342 |
| Habitat: meadow cottage | `habitatCottage` | 2.5×2.5 | 1 | demo | 7,464 | 1,622 |
| Resource: granary | `resourceGranary` | 3×2.5 | 1 | demo | 7,684 | 1,874 |
| Breeding: twin nest lodge | `breedingLodge` | 3×2 | 1 | demo | 4,312 | 1,046 |
| Crafting: workshop | `craftWorkshop` | 3.5×2.5 | 1 | demo | 6,868 | 1,762 |
| Decorative: gazebo | `decorGazebo` | 2×2 | 1 | demo | 3,892 | 1,100 |
| Magical: moon spire | `magicSpire` | 2×2 | 1 | demo | 4,584 | 1,310 |

## C. Architecture: the game's buildings

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Hatchery | `b_hatchery` | 3×3 | 3 | in-game | 13,788–14,008 | 3,176–3,212 |
| Hollow | `b_hollow` | 3×3 | 3 | in-game | 5,200–5,232 | 1,388–1,392 |
| Tidegate | `b_tidegate` | 3×2 | 3 | in-game | 5,104–5,168 | 1,332–1,348 |
| Moonshrine | `b_moonshrine` | 2×2 | 3 | in-game | 4,260–4,324 | 1,276 |
| Reliquarygate | `b_reliquarygate` | 3×3 | 3 | in-game | 4,024 | 1,076 |
| Forge | `b_forge` | 3×3 | 3 | in-game | 8,764–8,820 | 2,094–2,102 |
| Farm | `b_farm` | 3×2 | 3 | in-game | 4,080 | 804 |
| Mine | `b_mine` | 2×2 | 3 | in-game | 1,792–1,828 | 520–528 |
| Habitat (7 elements) | `b_habitat` | 3×3 | 7 | in-game | 4,892–7,936 | 1,256–1,826 |
| Lantern | `b_lantern` | 1×1 | 1 | in-game | 272 | 132 |
| Festlantern | `b_festlantern` | 1×1 | 1 | in-game | 252 | 128 |
| Flowerbed | `b_flowerbed` | 1×1 | 1 | in-game | 448 | 120 |
| Bench | `b_bench` | 2×1 | 1 | in-game | 564 | 192 |
| Statue | `b_statue` | 2×2 | 1 | in-game | 1,972 | 552 |
| Fountain | `b_fountain` | 2×2 | 1 | in-game | 1,328 | 384 |

## C. Architecture: ruins

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Hatchery (ruin) | `r_hatchery` | 3×3 | 1 | in-game | 4,596 | 1,220 |
| Hollow (ruin) | `r_hollow` | 3×3 | 1 | in-game | 3,860 | 1,024 |
| Tidegate (ruin) | `r_tidegate` | 3×2 | 1 | in-game | 3,068 | 750 |
| Moonshrine (ruin) | `r_moonshrine` | 2×2 | 1 | in-game | 2,556 | 780 |
| Reliquarygate (ruin) | `r_reliquarygate` | 3×3 | 1 | in-game | 3,964 | 1,068 |
| Forge (ruin) | `r_forge` | 3×3 | 1 | in-game | 4,748 | 1,304 |
| Habitat (ruin) | `r_habitat` | 3×3 | 1 | in-game | 3,280 | 832 |

## D. Environmental decoration

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Lantern post | `lanternPost` | 1×1 | 2 | library | 292 | 128 |
| Torch | `torch` | 1×1 | 1 | library | 120 | 52 |
| Guardian statue | `statue` | 2×2 | 1 | in-game | 1,972 | 552 |
| Rune obelisk | `obelisk` | 1×1 | 1 | library | 992 | 320 |
| Ruined column | `columnRuin` | 2×2 | 2 | library | 532–544 | 160–168 |
| Rune stone | `runeStone` | 1×1 | 3 | library | 436 | 168 |
| Orb pedestal | `orbPedestal` | 1×1 | 1 | library | 672 | 208 |
| Crystal pylon | `crystalPylon` | 1×1 | 1 | library | 480 | 140 |
| Barrel | `barrel` | 1×1 | 1 | library | 384 | 144 |
| Crates | `crate` | 1×1 | 3 | library | 252–532 | 48–140 |
| Sacks | `sacks` | 1×1 | 1 | library | 308 | 92 |
| Clay pots | `pots` | 1×1 | 1 | library | 160 | 60 |
| Bucket | `bucket` | 1×1 | 1 | library | 164 | 48 |
| Log pile | `logPile` | 1×1 | 1 | library | 480 | 144 |
| Cart wheel | `cartWheel` | 1×1 | 1 | library | 292 | 76 |
| Haystack | `haystack` | 1×1 | 1 | library | 512 | 136 |
| Signpost | `signpost` | 1×1 | 1 | library | 244 | 92 |
| Bench | `bench` | 2×1 | 1 | in-game | 564 | 192 |

## E. Water and atmosphere (objects)

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Lily pond | `pond` | 2×2 | 2 | library | 1,008–1,032 | 280 |
| Stream segment | `stream` | 2×1.5 | 2 | library | 896 | 248 |
| Water trough | `trough` | 1×1 | 1 | library | 304 | 80 |
| Fountain | `fountain` | 2×2 | 1 | in-game | 1,328 | 384 |
| Cloud puff | `cloud` | 3×1.5 | 3 | library | 712–732 | 204–212 |
| Jetty | `jetty` | 1×4.5 | 1 | in-game | 2,516 | 836 |
| Skiff | `skiff` | 3×2 | 1 | in-game | 2,116 | 640 |

## Island identity vignettes (demonstrations)

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Sunlit Sanctuary (Starter Island) | `v_starter` | 6×6 | 1 | demo | 23,080 | 5,410 |
| Verdant Reach | `v_verdant` | 6×6 | 1 | demo | 23,800 | 5,556 |
| Obsidian Forge | `v_obsidian` | 6×6 | 1 | demo | 22,368 | 4,876 |
| Celestial Spire | `v_celestial` | 6×6 | 1 | demo | 21,448 | 5,360 |

## Totals

95 assets, 177 variants (39 in-game, 44 library, 12 demo).

Budget check against the art bible, section 16 (per-category maxima: terrain 6000, vegetation 2200, decor 2500, water 3000, buildings 15000, ruins 8000, architecture 16000, biomes 26000): all assets within budget.

## Effect systems (in `src/3d/island3d.js`, not exported as models)

- **Waterfalls:** ribbon shader, back sheet, churn and mist.
- **Water surface:** ripple and sparkle.
- **Clouds:** voxel banks.
- **Distant islands:** hazed, with parallax.
- **Pollen motes.**
- **Magic motes:** in `MAGIC` hues.
- **Sea glints and horizon mist:** in the backdrop.

These are documented in the art bible, section 11.
