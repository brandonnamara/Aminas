# Aminas — Voxel Environment Style Guide (Environment Phase 1)

The rules every environment model follows so terrain, scenery and buildings read as one family.
The numbers live in code in `src/3d/voxstyle.js`; this document explains them.
The visual target is the floating-island reference the project owner supplied: chunky, bright, readable from far away,
warm light, layered cliffs, nothing photographic.

## 1. Camera and scale

- The camera is the island's existing isometric view: an orthographic camera matched exactly to the 2D grid
  (64 × 32 px diamond per cell). The 3D layer lines up with the 2D hit areas at every pan and zoom.
- **1 world unit = 1 island cell.** Height: 1 unit = 39.19 px on screen at zoom 1.
- Three voxel sizes, never mixed inside one surface:

| Voxel | Size | Used for |
|---|---|---|
| Terrain | 1/2 cell (2 × 2 per cell) | ground, cliffs, strata, under-island rock, clouds |
| Prop | 1/8 cell (8 × 8 per cell) | buildings, trees, rocks, jetty, skiff, lighthouse, plaza |
| Detail | 1/16 cell | grass clumps, flowers, pebbles, shells (instanced) |

- A building's footprint is its gameplay footprint: a 2 × 2 building is 16 × 16 prop voxels.
  Models may overhang by at most 1 prop voxel (eaves) and never cover a neighbouring cell.
- Height budget: small decorations up to 1 cell tall, houses about 2 to 2.5 cells, landmarks (Hatchery egg, Tidegate,
  lighthouse) up to 4 cells. Tall things go to the back of their footprint where possible.

## 2. Light

- Key light from the upper left (the same side as the 2D art), a soft sky/ground hemisphere fill, short soft shadows.
- Faces carry a small baked shade: top 100 %, left/front 93 %, right 86 %, underside 60 %.
- Every model has per-vertex ambient occlusion (four levels: 50 / 68 / 84 / 100 %), so corners and contact points
  darken. This is what makes the block art read as solid without textures.
- Glow (windows, torches, crystals, the egg's beacon) uses an unlit material in a few warm or cool colours only:
  `glow #ffe6a0`, `glowWarm #ffb860`, `glowCool #9ae8ff`.

## 3. Colour

- Every surface is picked from a short palette of 2 to 5 close shades with a position hash. That gives variation with
  no noise or texture. Never place a single flat colour over a large area, and never use texture images.
- Palettes (`PAL` in `voxstyle.js`): grass, grass sides, dirt, clay bands, stone, dark stone, deep under-rock (cooler
  and bluer going down), moss, sand, path, path stone, plaza, water, wood, dark wood, planks, leaves, pine, blossom,
  fruit, flowers, rock, roofs (red, blue, green, purple, slate, gold), plaster, brick, metal, gold, cloud.
- Element colours (`EL`) mirror the game's elements and are used only for habitat roofs, banners and element features.
- Saturation stays high and values stay mid-to-light on top surfaces. Dark values are kept for undersides, timber
  framing and window frames, so silhouettes stay readable at phone size.

## 4. Terrain

- Grass top layer (1 terrain voxel) with grass-coloured sides, then dirt, then alternating clay and stone strata
  bands, then cool deep rock, then a jagged bottom (every column ends at a different depth).
- Cliff edges get hanging vines; the underside gets stalactites; cliff faces get occasional rock outcrops.
- Water is a separate surface with a gentle animated ripple and sparkle (shader), over a visible lake bed.
- Paths and the plaza are flush with the grass, in the path or plaza palettes, with stone edging where they meet grass.
- Hills, ledges and loose chunks (never buildable) carry the trees; buildable cells carry only small detail voxels,
  and only where nothing stands.

## 5. Buildings

The **Hatchery** is the benchmark. Every building should match its density of detail:

1. **A base** that seats it in the ground: a stepped stone platform or timber deck, never a model floating on the grass.
2. **Materials by layer:** stone ground floor, timber-framed or plank upper parts, a tiled roof (shingle rows of
   alternating shade with a darker eave).
3. **A readable identity feature** visible from across the island: the Hatchery's egg nest on the roof, the Forge
   chimney and glow, the Tidegate's water portal, the Moonshrine's crystal, the Mine's cart and ore.
4. **Life at human scale:** lit windows, doors, torches, crates, flowers, banners.
5. **Level growth:** level 2 adds banners and a lit side window, level 3 turns metal bands to gold, level 4 adds a flag,
   level 5 gilds the landmark. Each level is a visible change in the same silhouette, never a different building.
6. **Ruined state:** broken walls in the building's own stone with rubble, plus one hint of what it will become
   (an egg shard, a crystal, a cold forge).

Habitats share one cottage form so they read as a set. Each element changes the roof colour, the wall material and
one feature (water trough, lava brazier, crystal lamp and so on).

## 6. Scenery

- Trees: oak, pine, birch, blossom, sapling. Each has a seed-varied size (±15 to 35 %) and a slow sway.
  Rocks: pebble, boulder (with moss on top). Also stumps, bushes with fruit, and ferns.
- Fixed set pieces: the jetty and its bobbing skiff, the lighthouse rock, the plaza with its sun mosaic, the seven
  standing stones (they glow violet while the Tidegate quest is active), and cloud banks drifting below the island.

## 7. Motion

Motion is subtle and stops when unseen. Water ripple, tree sway, cloud drift, skiff bob and drifting motes all run
on a 12 fps ambient tick. The tick stops:

- when the island is still,
- when the island is hidden or covered,
- in Battery saver,
- with Reduce motion,
- on devices that cannot keep up (the island then redraws only when something changes).

## 8. Performance rules

- Each model is meshed once into one geometry (faces touching air only) and cached.
  Identical models are drawn as one instanced batch.
- Shadows are re-rendered only when the island changes, not every frame.
- Pixel ratio is capped at 1.5 on touch devices and 1 in Battery saver. The shadow map is 1024 px on touch devices.
- Budgets for the Starter Island: up to about 80 draw calls and 250k triangles.
  Measured with a full island: 51 draw calls and 166k triangles.
