/* Aminas — Phase 14: model slots for buildings. A building type listed here is drawn from an imported 3D model
   (.glb) instead of its built-in voxel model. Everything else about the building is unchanged: its footprint,
   placement, upgrades, production, timers, interaction and save data all come from the existing building system,
   and the 2D layer keeps handling taps. If a model is missing or fails to load, the voxel model is drawn instead.

   To install a model: put the file under assets/models/ and set its slot, for example
     D.BUILDING_MODELS.farm = { url: 'assets/models/farm.glb' };
   Options (all optional):
     lite  a lighter file used at the Balanced quality setting and in Battery saver
     yaw   degrees to turn the model so its entrance faces the lower-left of the screen (default 0)
     fit   share of the footprint the model's base may cover (default 0.96)
     lift  cells to raise (+) or sink (-) the model (default 0)
     gain  brightness of the model's own colours under the island's light (default 1). The exports are painted
           darker than the island's voxel palette; this lifts them evenly. It adds no glow and does not change hue.
     spin  name pattern of parts that turn slowly (a windmill's sails), e.g. 'blade|sail'; needs the model to have
           that part as a separate node. axis: 'x' | 'y' | 'z' (default 'z'), speed in turns per minute (default 6)
   Nothing is loaded for an empty slot, or for a building that is not on the island being shown. */
(function (root) {
  'use strict';
  const D = root.A.Data;
  D.BUILDING_MODELS = {
    // Tripo "voxel_fortress": blue and gold, egg dome, lit entrance. Its door faces +x in the export, so it is turned
    // a quarter turn to face the lower-left like every other building.
    hatchery: { url: 'assets/models/hatchery.glb', lite: 'assets/models/hatchery-lite.glb', saver: 'assets/models/hatchery-saver.glb', yaw: -90, fit: 1.0, lift: -0.22, gain: 1.7 },
    // Tripo "voxel_farm_house": red roof, windmill, timber, crop beds. The model is square and the Farm's footprint is
    // 3 × 2, so it is allowed to overhang the short side a little rather than leave a third of the plot empty.
    farm: { url: 'assets/models/farm.glb', lite: 'assets/models/farm-lite.glb', saver: 'assets/models/farm-saver.glb', yaw: 0, fit: 1.15, lift: -0.12, gain: 1.45 },
    // Tripo lava habitat (exported as "stylized_character"): the Fire habitat. The export's mesh held three separate
    // shells; the human figure standing on top was one of them and was removed whole (tools/remove-component.mjs).
    // The fortress and its banner pole are untouched.
    hab_fire: { url: 'assets/models/hab_fire.glb', lite: 'assets/models/hab_fire-lite.glb', saver: 'assets/models/hab_fire-saver.glb', yaw: -90, fit: 1.08, lift: -0.6, gain: 1.75 },
  };
  // mobile budget used when a model is inspected (docs/PHASE14.md): over these it still loads, with a warning
  D.MODEL_BUDGET = { triangles: 100000, textureSize: 2048, textures: 2, bytes: 4 * 1024 * 1024 };
})(typeof window !== 'undefined' ? window : globalThis);
