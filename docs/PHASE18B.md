# Phase 18B — Verdant Wilds construction

Branch `p18b-verdant-construction` (from Phase 18A, `ba6a0c5`). Production `main` is untouched. The Phase 16A opening
stays off by default.

This phase builds the approved concept (Phase 18A: the Overgrown Commonwealth with the Elder Root) into the
**existing** Verdant map. No cell, obstacle, building or save id moves. The ten-dungeon campaign is **not**
implemented: every entrance exists, in order, and none can be entered.

All testing ran in Chromium with Playwright and software WebGL (SwiftShader) at 844×390 landscape with touch.
**No physical iPhone testing was done.**

---

## 1. What changed

| Area | Change | Files |
|---|---|---|
| Voxel island | The Verdant Wilds now draws on the voxel island (it used the 2D renderer before). The 2D renderer stays as the fallback when 3D is off or fails. | `src/vox-island.js` |
| Landmarks | Six landmarks in nine parts: Landing Cove, Overgrown Settlement (2 parts), Aqueduct (2 parts), Ivy Archive, Twin Shrine, Standing Stone Choir, Elder Root. 3D voxel models, 2D pictures and tap areas. | `src/verdant18b.js`, `src/3d/library/verdant.js`, `src/island-art.js` |
| Dungeon entrances | Ten entrances in Phase 18A order, each with its own 3D model (shared shape, own accent and prop) and number marker. Three sit inside landmarks (Archive, Twin Shrine, Elder Root). States: locked, sealed, open. | same |
| Interactions | Tap a place or an entrance: a sheet with what you see, a line from the Entity, the entrance's state and the ten-dungeon order, and a Wayfinder that moves the camera to any place and points at it. Visits are saved (`st.v18.seen`). | `src/ui-verdant18b.js` |
| Explore | Three Verdant areas (existing species only), listed once the island is reached, each locked behind its dungeon. | `src/verdant18b.js`, `src/ui.js` (tab filter) |
| Level cap | `D.MAX_LEVEL` 30 → 40 (approved). | `src/data.js` |
| Future islands | Obsidian Reach and the Celestial Crown are marked not ready (`D.ISLAND_LIVE`). Travel, unlocking and quest pointers respect it; saves keep every record. | `src/verdant18b.js`, `src/ui-pve.js` |
| Island map text | Not-ready islands show “Not ready”, no Travel button; the Verdant card says its old places can be visited. | `src/ui-pve.js` |
| Fixes found on the way | (1) A tap that opens a sheet could press the button that appears under the finger (the touch's own click); Verdant sheets ignore clicks for their first 400 ms. (2) The meadow-detail mesh leaked a geometry and a material each time it was rebuilt; reachable now that two islands are 3D (+2 GPU geometries per round trip). Fixed. | `src/ui-verdant18b.js`, `src/3d/island3d.js` |

New save data: `st.v18 = { seen: { placeId: firstVisitTime } }`, added to `newGame` and repaired on load. Nothing
else is stored; entrance states are derived.

## 2. Layout (deviation from 18A noted)

All features stand on sand, path, water, bridge or the old landmark slot: never on buildable grass, so no existing
player building can be covered, and none adds to the occupancy grid (routes, creatures and building placement are
unchanged). A test checks every cell.

| Place | Cells | Notes |
|---|---|---|
| Landing Cove (arrival) | (16, 28) | South beach, end of the main path |
| Overgrown Settlement | (12–15, 28), (17–19, 28) | Either side of the landing: house fronts with doorways of two heights, a shared hearth |
| Aqueduct | (25, 7–10), (20–24, 11) | Arches over the east stream and its westward channel; visible from most of the island |
| Ivy Archive | (14–17, 2) | North shore; Dungeon 4's entrance at (14, 2) |
| Twin Shrine | (17, 13–15) | Pale half and dark half on the two water cells, footbridge on the bridge between; Dungeon 6's entrance on the bridge |
| Standing Stone Choir | (29, 12–14) | East shore; a faint, irregular third light (2D layer; still under reduced motion) |
| Elder Root | (21–23, 20–22) | **The island's existing landmark slot.** Dungeon 10 (Island Boss) at its door (22, 22) |

**Deviation from 18A:** 18A placed the hub (“Mossgate Commons”) in the landmark slot and the Elder Root on the north
headland (12, 1). The slot already holds the Elder Root's art, and the brief says not to rebuild the island, so the
Elder Root stays in the slot and the settlement moves to the south beach. Entrances 1–3 and 5–9 keep their 18A cells;
4 moves to the Archive (14, 2) so the Archive and its dungeon are one place; 10 moves with the Elder Root.

Entrances: 1 Mossgate Steps (16, 24) · 2 Drowned Aqueduct (25, 11) · 3 Spore Hollow (12, 11) · 4 Ivy Archive (14, 2) ·
5 Glowworm Terraces (13, 19) · 6 Twin Shrine (17, 14) · 7 Canopy Walk (20, 3) · 8 Moonwell (4, 20) · 9 Choir of Roots
(26, 17) · 10 Elder Root (22, 22). Recommended levels 22, 24, 25, 27, 28, 30, 31, 33, 34, 36 (Band C).

Labelled map: `docs/ui/screens18b/verdant-map.svg`.

## 3. Entrance states

- **locked** — the island is not reached, or the dungeon before is not cleared. Says which one opens it.
- **sealed** — its turn has come but its battles are not built. Dungeon 1 is sealed once the island is reached.
- **open** — needs **both** `D.V18.live === true` **and** a playable `D.DUNGEONS[id]` on the Verdant Wilds. Neither
  exists in this build, so nothing is open.
- `R.startRun` refuses a Verdant id unless its entrance is open, whatever calls it.
- The Dungeons screen is unchanged (it hides islands without dungeons, and `D.CAMPAIGN.verdant.dungeons` is still
  empty). Phase 18C activation: add the dungeon data with the entrance ids, push them to
  `D.CAMPAIGN.verdant.dungeons`, set `D.V18.live = true`. The entrance sheet's Enter button then opens the existing
  Dungeons screen on that dungeon.
- Development preview: add `?dev18` to the address to see each entrance's planned guardian in its sheet. It never adds
  a way in.

## 4. Explore areas (prepared, locked)

| Area | Opens with | Finds (existing species) | Befriend level |
|---|---|---|---|
| Glowcap Glade | Mossgate Steps (D1) | Terraflora II, Sylvaneer II, Berrant | 18 |
| Streamside | Drowned Aqueduct (D2) | Aquaflora II, Tidalong, Reefback | 20 |
| Canopy Edge | Canopy Walk (D7) | Aeolus, Pyro-Hawk, Stormbringer | 24 |

Listed on the Explore screen only after the Verdant Wilds is reached. 18A's “rare third form” step is not added
(a decision for 18C).

## 5. Level cap 30 → 40

- Same XP formula continued: `16 + 8·lv + 1.2·lv²`. Reaching 30 takes 14,198 XP from level 1; reaching 40 takes
  31,496 (17,298 more: about 1.2× the whole road to 30). Per level 1,336 (30→31) to 2,153 (39→40), 20–31 Honey Feasts.
- Stats keep the same line: Lumifern 192 HP / 46 ATK at 30, 218 / 52 at 35, 243 / 58 at 40.
- Evolution stays at 12 and 22; move upgrades unchanged; battle XP formulas and scaling unchanged (tested).
- Nothing retroactive: an Amina saved at 30 kept 0 XP (the old cap discarded it) and loads exactly as it was; it
  simply starts earning again. Saved levels 31–40 load as is; above 40 is clamped.
- Interface: XP bars, “MAX”, feed buttons and the detail strip all read `D.MAX_LEVEL` (browser-checked at 31 and 40).
- Survival and PvP foe levels clamp to the cap, so they can only exceed 30 when the party does.
- Four older tests asserted the old cap (30) and were moved to the new one, with the same checks at 40:
  `economy13d`, `progression13a`, `browser-progress13a`, `browser-dev8`.

## 6. Future islands

- `D.ISLAND_LIVE = { starter: true, verdant: true, obsidian: false, celestial: false }`.
- New saves cannot unlock them (unlock still answers `boss` first, as before; `notready` only where it could
  otherwise open).
- An older save that unlocked Obsidian Reach (bought with gold in an early build) keeps the unlock, its obstacle
  records and its quest records. The map says “Not ready” with no Travel button; travel is refused with a reason; a
  save standing there loads on the Verdant Wilds (or Starter Island).
- Quests whose destination cannot be visited stay hidden (status `locked`), records untouched. **Behaviour change:**
  Phase 17B showed The Dark Shore to a save that already had Obsidian Reach open; Phase 18B hides it while the island
  is not ready (brief: hide quests needing unavailable destinations). `rewards17b` was updated to the new rule, and
  checks that it shows again once the island is marked ready.
- Activation later: set `D.ISLAND_LIVE.obsidian = true`. No migration (tested with a legacy save).

## 7. Story interactions

Seven places, each with a short description and one Entity line. Nothing reveals the third force or completes the
story: the Archive's tablets are unread, the Shrine's panels are too overgrown to read, the Choir “seems to leave a
gap, as if one voice were missing”, and the Elder Root's door is shut from the inside.

## 8. Performance (software WebGL; relative numbers only)

| Tier | Island | Draw calls | Triangles | GPU geometries | Frame p50 / p95 while panning |
|---|---|---|---|---|---|
| High | Starter | 73 | 133,984 | 131 | 550 / 600 ms |
| High | Verdant | 77 | 123,982 | 133 | 550 / 633 ms |
| Balanced | Starter | 75 | 131,336 | 131 | 467 / 500 ms |
| Balanced | Verdant | 77 | 121,288 | 133 | 550 / 633 ms |
| Battery saver | Starter | 76 | 81,996 | 177 | 317 / 350 ms |
| Battery saver | Verdant | 77 | 75,412 | 226 | 283 / 317 ms |

- The landmark and entrance models merge into the island's shared batches: 0–4 extra draw calls, fewer triangles than
  Starter Island. Frame times are SwiftShader at DPR 2 and say nothing about an iPhone; they show the two islands cost
  about the same.
- First visit to the Verdant Wilds (models built once, then cached): 2.7 s in software rendering, against about 2.0 s
  for later visits; island switches without new models took 1.5–1.7 s in the same environment.
- Found and fixed: the place markers first went through the 3D occlusion pass, which roughly doubled panning cost on
  the Verdant Wilds (p50 783 ms against 417 ms without them). Like building markers, they are now interface and never
  covered; panning cost matches Starter Island. A marker may therefore show through a tree standing in front of it.
- Leak check: 40 round trips Starter ↔ Verdant left GPU geometries, textures, page nodes and heap flat after the
  meadow-detail fix (before the fix: +2 geometries per round trip).
- Reduced motion stills the Choir's glimmer; quality tiers apply to the new models like any other (LOD twins in
  Battery saver).

## 9. Tests

- `tests/verdant18b.test.js` (Node, 56): cap 30–40, nothing retroactive, map and obstacles byte-identical, every
  feature on non-buildable cells with no overlap, entrance states and order, no run can start, activation path,
  walking reach from the landing (with every obstacle standing), Explore areas, island readiness and legacy saves,
  quest visibility, save repair and round trip.
- `tests/browser-verdant18b.test.js` (Chromium, 22): voxel island, 16 tap areas, real taps open sheets, no Enter
  anywhere, Dungeons screen unchanged, Wayfinder, save and reload, travel both ways twice, no leak over six more trips,
  Obsidian not ready, Lv 31 in the detail, 2D fallback with the same tap areas, draw calls, reduced motion.
- Full regression, final run: 1,897 passed, 6 failed. `browser-perf-fix` (4) is intermittent and fails the same
  way on the 18A base (2 of 4 runs); `browser-env12` (1) passed on rerun; `browser-intro14` (1) failed in both full runs
  and passed both individual reruns. Details in `docs/audit18b/regression.md`. Forge close and island-animation checks
  passed in both runs (not reproduced).

## 10. Known limitations

- No physical iPhone testing.
- No player avatar exists, so “navigation” is camera movement (pan, Wayfinder) and the walking check is a grid
  reachability test. Two free cells are pockets enclosed by obstacles in the original layout (no feature is in one).
- Place markers are never covered by 3D trees in front of them (performance choice above).
- Explore areas, entrances and the Island Boss are prepared, not playable. 18A's rare third-form step, Twin Shrine
  gift, charged moves and dungeon data are 18C work.
- The Verdant terrain uses the Starter Island palette; `BIOMES.verdant` colours are not applied to the ground.
- The Forge-close and island-animation checks were not reproduced this phase; `browser-intro14`'s arena-camera check
  is a new intermittent failure in full runs only (unexplained).
