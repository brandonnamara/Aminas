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
| Layered cliff segment | `cliff` | 2×1.5 | 3 | library | 4,068–4,360 | 824–836 |
| Floating island edge | `islandEdge` | 2×2 | 1 | library | 3,984 | 960 |
| Stone pillar formation | `stonePillars` | 1.5×1.5 | 2 | library | 1,216 | 324 |
| Rocky outcrop | `outcrop` | 2×1.5 | 2 | library | 1,324–1,348 | 312–316 |
| Moss-covered rock | `mossyRock` | 1.5×1.5 | 2 | library | 892–956 | 232–272 |
| Boulder (obstacle) | `boulder` | 1×1 | 1 | in-game | 1,076 | 312 |
| Pebbles (obstacle) | `pebble` | 1×1 | 1 | in-game | 192 | 48 |
| Crystal cluster | `crystals` | 1×1 | 5 | library | 676 | 188 |
| Cave entrance | `caveMouth` | 3×2.5 | 1 | library | 2,244 | 588 |
| Natural stone arch | `arch` | 3×1 | 1 | library | 1,312 | 360 |
| Basalt columns | `basalt` | 1.5×1.5 | 1 | library | 3,204 | 640 |
| Fallen monolith ring | `monolithRing` | 2.5×2.5 | 1 | library | 832 | 184 |

## B. Vegetation

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Oak | `oak` | 1×1 | 3 | in-game | 1,260–1,804 | 332–480 |
| Old oak | `oakOld` | 1×1 | 3 | library | 2,028–2,088 | 540–560 |
| Pine | `pine` | 1×1 | 3 | in-game | 612–812 | 164–212 |
| Birch | `birch` | 1×1 | 3 | in-game | 548–764 | 112–180 |
| Blossom tree | `blossom` | 1×1 | 3 | in-game | 564–668 | 136–144 |
| Weeping willow | `willow` | 1×1 | 3 | library | 1,672–1,712 | 300–308 |
| Glowcap (fantasy) | `glowcap` | 1×1 | 3 | library | 1,260–1,368 | 390–414 |
| Crystalwood (fantasy) | `crystalwood` | 1×1 | 3 | library | 652–668 | 186–204 |
| Charred tree | `charredTree` | 1×1 | 3 | library | 156–172 | 28–36 |
| Sapling | `sapling` | 1×1 | 3 | in-game | 156–252 | 44–64 |
| Berry bush | `bush` | 1×1 | 3 | in-game | 372–388 | 112 |
| Round bush | `roundBush` | 1×1 | 3 | library | 364–396 | 88 |
| Flowering bush | `flowerBush` | 1×1 | 3 | library | 352 | 112 |
| Flower patch | `flowerPatch` | 1×1 | 3 | library | 200–224 | 12–36 |
| Tall grass | `tallGrass` | 1×1 | 3 | library | 152–248 | 20–36 |
| Fern (small) | `fern` | 1×1 | 3 | in-game | 92 | 0 |
| Fern (large) | `fernLarge` | 1×1 | 3 | library | 300–304 | 12 |
| Mushrooms | `mushrooms` | 1×1 | 3 | library | 232–248 | 28–76 |
| Exposed roots | `roots` | 1×1 | 3 | library | 260–276 | 20–24 |
| Stump (obstacle) | `stump` | 1×1 | 1 | in-game | 280 | 56 |
| Hanging vines | `vines` | 1.25×0.5 | 3 | library | 284–384 | 0 |
| Hanging moss | `hangingMoss` | 1×0.5 | 2 | library | 356–360 | 72–80 |

## C. Architecture: kit, standards and demonstrations

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Material board | `materialBoard` | 7×7 | 1 | demo | 10,752 | 2,688 |
| Component kit sampler | `kitSampler` | 8×7 | 1 | demo | 14,916 | 3,624 |
| Habitat: meadow cottage | `habitatCottage` | 2.5×2.5 | 1 | demo | 7,464 | 1,246 |
| Resource: granary | `resourceGranary` | 3×2.5 | 1 | demo | 7,684 | 1,712 |
| Breeding: twin nest lodge | `breedingLodge` | 3×2 | 1 | demo | 4,312 | 996 |
| Crafting: workshop | `craftWorkshop` | 3.5×2.5 | 1 | demo | 6,868 | 1,646 |
| Decorative: gazebo | `decorGazebo` | 2×2 | 1 | demo | 3,892 | 960 |
| Magical: moon spire | `magicSpire` | 2×2 | 1 | demo | 4,584 | 1,180 |

## C. Architecture: the game's buildings

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Hatchery | `b_hatchery` | 3×3 | 3 | in-game | 13,788–14,008 | 3,004–3,106 |
| Hollow | `b_hollow` | 3×3 | 3 | in-game | 5,200–5,232 | 1,182–1,194 |
| Tidegate | `b_tidegate` | 3×2 | 3 | in-game | 5,104–5,168 | 1,304–1,328 |
| Moonshrine | `b_moonshrine` | 2×2 | 3 | in-game | 4,260–4,324 | 912–936 |
| Reliquarygate | `b_reliquarygate` | 3×3 | 3 | in-game | 4,024 | 996 |
| Forge | `b_forge` | 3×3 | 3 | in-game | 8,764–8,820 | 1,612–1,624 |
| Farm | `b_farm` | 3×2 | 3 | in-game | 4,080 | 720 |
| Mine | `b_mine` | 2×2 | 3 | in-game | 1,792–1,828 | 478–490 |
| Habitat (7 elements) | `b_habitat` | 3×3 | 7 | in-game | 4,892–7,936 | 1,144–1,684 |
| Lantern | `b_lantern` | 1×1 | 1 | in-game | 272 | 62 |
| Festlantern | `b_festlantern` | 1×1 | 1 | in-game | 252 | 76 |
| Flowerbed | `b_flowerbed` | 1×1 | 1 | in-game | 448 | 80 |
| Bench | `b_bench` | 2×1 | 1 | in-game | 564 | 120 |
| Statue | `b_statue` | 2×2 | 1 | in-game | 1,972 | 416 |
| Fountain | `b_fountain` | 2×2 | 1 | in-game | 1,328 | 392 |

## C. Architecture: ruins

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Hatchery (ruin) | `r_hatchery` | 3×3 | 1 | in-game | 4,596 | 1,028 |
| Hollow (ruin) | `r_hollow` | 3×3 | 1 | in-game | 3,860 | 880 |
| Tidegate (ruin) | `r_tidegate` | 3×2 | 1 | in-game | 3,068 | 744 |
| Moonshrine (ruin) | `r_moonshrine` | 2×2 | 1 | in-game | 2,556 | 460 |
| Reliquarygate (ruin) | `r_reliquarygate` | 3×3 | 1 | in-game | 3,964 | 960 |
| Forge (ruin) | `r_forge` | 3×3 | 1 | in-game | 4,748 | 1,112 |
| Habitat (ruin) | `r_habitat` | 3×3 | 1 | in-game | 3,280 | 732 |

## D. Environmental decoration

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Lantern post | `lanternPost` | 1×1 | 2 | library | 292 | 60 |
| Torch | `torch` | 1×1 | 1 | library | 120 | 28 |
| Guardian statue | `statue` | 2×2 | 1 | in-game | 1,972 | 416 |
| Rune obelisk | `obelisk` | 1×1 | 1 | library | 992 | 280 |
| Ruined column | `columnRuin` | 2×2 | 2 | library | 532–544 | 128–148 |
| Rune stone | `runeStone` | 1×1 | 3 | library | 436 | 118 |
| Orb pedestal | `orbPedestal` | 1×1 | 1 | library | 672 | 112 |
| Crystal pylon | `crystalPylon` | 1×1 | 1 | library | 480 | 144 |
| Barrel | `barrel` | 1×1 | 1 | library | 384 | 64 |
| Crates | `crate` | 1×1 | 3 | library | 252–532 | 48–140 |
| Sacks | `sacks` | 1×1 | 1 | library | 308 | 68 |
| Clay pots | `pots` | 1×1 | 1 | library | 160 | 24 |
| Bucket | `bucket` | 1×1 | 1 | library | 164 | 48 |
| Log pile | `logPile` | 1×1 | 1 | library | 480 | 144 |
| Cart wheel | `cartWheel` | 1×1 | 1 | library | 292 | 12 |
| Haystack | `haystack` | 1×1 | 1 | library | 512 | 128 |
| Signpost | `signpost` | 1×1 | 1 | library | 244 | 40 |
| Bench | `bench` | 2×1 | 1 | in-game | 564 | 120 |

## E. Water and atmosphere (objects)

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Lily pond | `pond` | 2×2 | 2 | library | 1,008–1,032 | 224 |
| Stream segment | `stream` | 2×1.5 | 2 | library | 896 | 248 |
| Water trough | `trough` | 1×1 | 1 | library | 304 | 80 |
| Fountain | `fountain` | 2×2 | 1 | in-game | 1,328 | 392 |
| Cloud puff | `cloud` | 3×1.5 | 3 | library | 712–732 | 160–184 |
| Jetty | `jetty` | 1×4.5 | 1 | in-game | 2,516 | 460 |
| Skiff | `skiff` | 3×2 | 1 | in-game | 2,116 | 484 |

## Island identity vignettes (demonstrations)

| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |
|---|---|---|---|---|---|---|
| Sunlit Sanctuary (Starter Island) | `v_starter` | 6×6 | 1 | demo | 23,080 | 4,958 |
| Verdant Reach | `v_verdant` | 6×6 | 1 | demo | 23,800 | 5,194 |
| Obsidian Forge | `v_obsidian` | 6×6 | 1 | demo | 22,368 | 4,718 |
| Celestial Spire | `v_celestial` | 6×6 | 1 | demo | 21,448 | 4,962 |

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
