# Aminas · Phase 14: world and environment polish — progress report (Tripo integration)

**Branch:** `p14-world`, created from `p13-core` (`f25eb9d`, Phase 13 complete). Production `main` (`0fc9e36`) is
not in its history and has not been touched.

**Status: Part 2 (Tripo assets) is done for the Hatchery and the Farm. The Habitat is waiting on a decision.
Parts 3 to 6 (island, dungeon, boss arena and exploration polish) have not been started.**

All testing is desktop Chromium with software graphics at 844×390. **Nothing was tested on an iPhone**, and
frame rates measured with software graphics are not meaningful, so none are quoted.

No gameplay, production, economy or save value was changed.

## 1. Where the models came from

Tripo Studio opened in Chrome but an onboarding survey covered the library, and a download would have landed on a
computer this chat cannot reach. The twelve `.glb` files you attached are what was used. No model was rebuilt from
a screenshot and none was substituted.

## 2. Catalogue of the twelve supplied models

Every file has the same technical shape: one mesh, one opaque material, colour + normal + metal/roughness textures
at 4096 × 4096, no skeleton, no animation, no separate parts, pivot at the centre of the model (not its base),
about one unit across. They are far too heavy to ship as exported.

| File | What it is | Triangles | File | Game role | Existing equivalent | Suitability | Priority |
|---|---|---|---|---|---|---|---|
| `voxel_fortress` | **The Hatchery**: blue and gold, three eggs, banners, lit door | 940,696 | 12.2 MB | Hatchery | Voxel Hatchery | Good after reduction | **Installed** |
| `voxel_farm_house` | **The Farm**: red roof, windmill, timber, crop beds | 962,168 | 14.4 MB | Berry Farm | Voxel Farm | Good after reduction | **Installed** |
| `stylized_character` | **The lava Habitat**, with a smooth, non-voxel human figure standing on top, fused into the same mesh | 978,173 | 12.6 MB | Fire habitat | Voxel Fire habitat | Blocked by the figure | Needs your decision |
| `voxel_dragon` | Red dragon on a lava and grass base | 955,729 | 12.8 MB | Fire creature or boss | Fire lines in the roster | Static; has a base | Hold: needs approval |
| `voxel_dragon_0` | Blue crystal dragon on a glowing disc | 1,889,467 | 19.7 MB | Water or crystal creature, boss | — | Static; has a base | Hold |
| `voxel_dragon_1` | Blue crystal dragon, no base | 1,867,201 | 19.5 MB | As above | — | Static | Hold |
| `dragon_2` | Grey and ice-blue dragon | 1,979,650 | 23.0 MB | Wind or ice creature | — | Static | Hold |
| `voxel_creature` | Blue and tan quadruped with a cannon back | 967,233 | 14.0 MB | Metal or water creature | Resembles "Cannonis" in the project files | Static | Hold |
| `voxel_crystal_creature` | White round creature, teal face, on a disc | 974,995 | 10.6 MB | Light or water creature | — | Static; has a base | Hold |
| `voxel_crystal_fairy` | White fairy with halo and teal wings, on a disc | 972,128 | 11.7 MB | Light creature | — | Static; has a base | Hold |
| `voxel_mage` | Dark robed figure with a purple orb, on a disc | 1,844,142 | 18.0 MB | Dark character, the Entity or an NPC | — | Static; has a base | Hold |
| `jester_voxel` | Purple and gold jester | 1,968,906 | 17.2 MB | Character or NPC | — | Static | Hold |

"Static" means no skeleton: the game's creatures walk, attack and react from built-in animation, so using any of
these as a creature means either a still figure or a separate rigging step. None has been added to the game, and
no approved monster model was replaced.

## 3. What was installed

| | Hatchery | Farm |
|---|---|---|
| Source | `voxel_fortress` | `voxel_farm_house` |
| Building | Old Hatchery, 3 × 3 cells | Berry Farm, 3 × 2 cells |
| Full file (desktop, High) | 96,000 triangles, 2048 colour + 1024 normal, 2.8 MB | 95,994 triangles, same textures, 2.9 MB |
| Lighter file (phones, Balanced, Battery saver) | 47,988 triangles, 1024 px, 1.1 MB | 47,966 triangles, 1024 px, 1.2 MB |
| Orientation | Turned a quarter turn so the door faces the lower-left like every building | As exported |
| Scale and pivot | Fitted to the plot, base on the ground, centred; 2.8 cells tall | Square model on a 3 × 2 plot: allowed to overhang the short side slightly |
| Texture memory (full) | about 27 MB | about 27 MB |

**Preparation** (`tools/optimize-model.mjs`, a build-time tool only): triangle count reduced with meshoptimizer,
textures resized and stored as WebP, the metal/roughness texture dropped (the models are matte). Shape, UVs,
colours and normals are otherwise untouched: nothing is smoothed and the blocks stay blocks.

**In the game** (`src/model-slots.js`, `src/3d/modelslots.js`): a building type with a model slot is drawn from
the model; everything else about the building comes from the existing building system. The voxel model shows
while the file loads and stays if it fails. Ruins and building sites keep their voxel models. Nothing about models
is saved. The model loader is only fetched when a building with a model is on the island.

**Checked against your list:** mesh integrity (no bad vertices), triangle counts, texture sizes, materials (one,
opaque), UVs present, scale, orientation, pivot (corrected on load), transparency (none), animation (none),
mobile cost (below). Collision does not apply: placement uses the building's grid footprint, which is unchanged.

**Windmill:** the Farm's sails cannot turn. The export is a single fused mesh with no separate sail part. The
game is ready for it: a part named in the slot's `spin` option turns slowly with the island's ambient animation
and stops for Reduce Motion and Battery saver (tested with a stand-in model). It needs an export with the sails
as their own part.

## 4. The Habitat: not installed

The game has seven habitat types (Nature, Water, Earth, Fire, Light, Dark, Wind). The lava and fortress model
matches the **Fire habitat** (`hab_fire`); the other six keep their own models whatever is decided.

The export has a smooth, non-voxel human figure standing on the fortress, in the same mesh. I have not installed
it, and I have not cut the figure out myself, because that means editing your model. Options:

1. **Re-export from Tripo without the figure** (best result).
2. **I remove the figure** by deleting its part of the mesh. Likely clean if it is a separate shell; it may leave
   a small hole where the feet meet the stone.
3. Use it as it is.

## 5. Things you should look at

* **The models are darker than the island around them.** The Hatchery reads as deep navy beside the bright
  voxel buildings. I left the colours alone. I can lift them slightly if you want.
* **They bring their own patch of ground** (grass and rock base) and use smaller blocks than the island's own
  buildings, so they read as more detailed miniatures. That is the models' identity; say if you want the base
  sunk into the terrain.
* **The Farm looks small on its 3 × 2 plot** because the model is square.
* **Cost.** The island was about 194,000 triangles. With both models it is about 272,000 on phones (lighter
  files) and about 369,000 on desktop at High, plus four to six more textures. The island reached 60 fps at High
  on your iPhone before this; that needs re-checking on the device with the models in.
* **One existing island test needed a longer wait** (`browser-env1`, "tapping the voxel Hatchery opens its
  panel"): with software graphics the island draws slower with the models, so the camera had not settled when the
  test tapped. It passes with the longer wait. This is a sign of the extra drawing cost, not a functional fault.

## 6. Tests

`tests/browser-models14.test.js`: **28 of 28**. It covers:

| Brief item | Result |
|---|---|
| Model loading and rendering | Both load within the budget; a missing file falls back to the voxel model with no error |
| Hatchery interaction and breeding | Breeding lays an egg; the Hatchery screen opens |
| Farm production and upgrades | Food produced and collected; upgrade cost unchanged |
| Habitat production and assignment | Fire habitat (voxel) takes an Amina and produces |
| Placement and movement | The Farm moves and turns; the model follows and still fits |
| Save and load | Nothing about models in the save; reload gives the same buildings and egg |
| Asset loading and memory | Triangles, texture sizes, file sizes and texture memory asserted; lighter files on touch screens |

Also run after the change: `browser-env1` 20 of 20 (with the longer wait), `browser-hatchery13b` 35 of 35.

**The complete suite has not been run on this branch yet.**

## 7. Not done

* Part 1 audit write-up, and Parts 3 to 6: island terrain, vegetation, water, lighting and storytelling; dungeon
  environments; boss arenas; exploration presentation.
* Part 7 beyond the lighter model files.
* Gameplay recordings.

## Files

| File | Change |
|---|---|
| `src/model-slots.js` (new) | The three slots and the mobile budget |
| `src/3d/modelslots.js` (new) | Loading, inspection, fitting, lighter files, turning parts |
| `src/3d/island3d.js`, `src/vox-island.js` | Draw a building from its model; read-outs for tests |
| `assets/models/` (new) | `hatchery.glb`, `hatchery-lite.glb`, `farm.glb`, `farm-lite.glb` (8.1 MB in total) |
| `tools/optimize-model.mjs` (new) | Prepares an exported model |
| `index.html` | One script |
| `tests/browser-models14.test.js`, `tests/fixtures/` (new), `tests/browser-env1.test.js`, `tests/run-all.js` | Tests |

Screenshots: `docs/ui/screens14/models/` (`compare-hatchery-farm.png`, `before-voxel.png`, `after-tripo.png`).
