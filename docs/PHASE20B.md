# Phase 20B — Celestial Crown world construction (the Silent Observatory)

Review page: https://claude.ai/artifact/CN4Ufu7s828Ted6arZeKDu · Development preview: v49 of the Aminas preview
(https://claude.ai/artifact/ShbtpoFoauudCMFtMCfogK; developer panel → "Celestial Crown preview (session)").

Branch `p20b-celestial-construction`, built from Phase 20A (`00e13d2`). Production `main` was not touched. The Phase
16A opening is still disabled by default. **Nothing here was tested on a physical iPhone.** Every browser number comes
from Chromium with software WebGL (SwiftShader) at 844×390 in touch mode. Use them to compare islands, not as device
speeds.

The Celestial Crown is still **closed to normal play**:
- `D.ISLAND_LIVE.celestial` is `false`, and the new campaign switch `D.C20.live` is `false`;
- `D.CAMPAIGN.celestial.dungeons` is empty;
- beating the Forge Heart still does not open it (the unlock waits for readiness, as before).

The developer panel has a **session-only construction preview** (like Obsidian's in Phase 19B) and a session-only
**Starwell Habitat** switch.

Design reference: `docs/PHASE20A.md`. Approved decisions used here: the Silent Observatory, ending A (the Keepers'
door), The Two Keys (Lumifern III's shape, then Umbrit III's), recommended levels 48–57, guardians 51–60, cap 60,
Obsidian's foe tier, the Starwell Habitat after Dungeon 8 (at most four), Mastery cosmetic-only after the final boss
(not built), offline as its own future phase.

## What was built

| Area | What changed | Files |
|---|---|---|
| Silent Observatory environment | The Crown now draws on the voxel island; before this phase it was always 2D. It has its own palette: periwinkle grass, lavender sand, pale-gold paths, moonstone cliffs over violet-slate depths, cloud-pale water. Its groves grow moon trees, star-shard sprouts and moon rocks, with star vines under the rim. Gold bands, brass, cut glass and slate; violet light only where something hums (the observatory door, the Bell Loft's crack). | `src/3d/library/celestial.js`, `src/3d/island3d.js`, `src/vox-island.js` |
| Central observatory | A 3D model in the existing 4×4 landmark slot: a moonstone plinth and steps, a gold-banded round tower, a brass dome with its shutter half open and a telescope through it, round windows. On the terrace: a desk of charts with the chair pushed back, a caliper, a small armillary, fallen charts, and in front an ornate brass **lens mount holding nothing**. At the tower's foot, the sealed **Threshold** door. | `src/3d/library/celestial.js` |
| Places | Twelve, each with a tap point, a sheet, an introductory Entity line, a Wayfinder entry and a save-safe visit record (`st.c20.seen`): the Cloud Jetty (arrival), the Cloudstair, Starfall Terrace, the Orrery Wheel, Cloud Sea Cistern, the Lens Gallery, the Hall of Two Doors, the Chart Room, the Bell Loft, the Shadowed Dome, Lenshold (hub) and the Silent Observatory. None advances a quest or the story. | `src/celestial20b.js`, `src/ui-celestial20b.js`, `src/island-art.js` |
| Obstacles | 3D models for all six types (Drifting Stone, Star Shard, Moonbloom, Fallen Pillar, Cloud Puff, Sky Geode), baked into the island's one merged mesh. Ids, positions, sizes and collision are unchanged; the 2D art is kept for the 2D island. | `src/3d/library/celestial.js`, `src/3d/island3d.js` (`MERGE_O`) |
| Ten dungeon entrances | Numbered 1–10 at the 20A positions; nine stand outside, each beside its place, and the Threshold is inside the observatory. Each has a moonstone gate with its own motif and three looks: dark (locked), lit (its turn has come), cleared (open door, gold star). All ten are **sealed**. | same |
| Starwell Habitat | `hab_resonance`: the existing habitat framework, the same production and capacity as every habitat, Resonance (Aimza line) +50% through the existing rule, at most four, 3,000 → 36,000 gold, no new currency. It unlocks with the Bell Loft (Dungeon 8), which does not exist yet. 2D and 3D art: moonstone walls, violet roof, a moonstone well with three star shards over it. The Codex shows it as the home of Resonance Aminas. | `src/world-data.js`, `src/celestial20b.js`, `src/island-art.js`, `src/3d/voxbuild.js`, `src/ui-celestial20b.js` |
| Exploration | Three areas, all locked until their dungeon exists: Cloud Shelf (Dungeon 1), Moonbloom Beds (Dungeon 4), Star Shard Field (Dungeon 7). | `src/celestial20b.js` |
| The Two Keys | A development-only prototype on the real battle engine, outside the game. | `tools/p20b-twokeys.js` |
| The Keeper's Emblem | Three stat and visual proposals, measured. Nothing added to the game. | `tools/p20b-emblem.js`, the review page |
| Hatchery test | The approved Phase 20A test-setup correction, applied. | `tests/browser-env12.test.js` |
| Performance report | A graphics-memory estimate for the report (`V.gpuMem`, diagnostics only). | `src/3d/island3d.js`, `src/vox-island.js` |

## Places and entrances (as built)

All positions were checked against the real map: land, not buildable, no obstacle, no overlap
(`tests/celestial20b.test.js`, `tools/p20b-map.js`). Labelled map: `docs/audit20b/map.png`.

| # | Entrance | Rec | Cell | Its place (footprint) |
|---|---|---|---|---|
| — | — | — | — | The Cloud Jetty (13–16, 33, sand) — arrival |
| 1 | Cloudstair Landing | 48 | 14,30 | The Cloudstair (14, 28–29) |
| 2 | Starfall Terrace | 49 | 14,26 | Starfall Terrace (15–17, 26) |
| 3 | The Orrery Wheel | 50 | 5,17 | The Orrery Wheel (6–9, 17) |
| 4 | Cloud Sea Cistern | 51 | 4,23 (sand) | Cloud Sea Cistern (2–3, 23, sand) |
| 5 | The Lens Gallery | 52 | 5,14 | The Lens Gallery (5, 15–16) |
| 6 | Hall of Two Doors | 53 | 17,10 | The Hall of Two Doors (17, 11–13) |
| 7 | The Chart Room | 54 | 20,5 | The Chart Room (20, 3–4) |
| 8 | The Bell Loft | 55 | 28,12 | The Bell Loft (28, 13–15) |
| 9 | The Shadowed Dome | 56 | 28,16 | The Shadowed Dome (24–27, 16) |
| 10 | The Threshold | 57 | inside the observatory | The Silent Observatory (15–18, 15–18, the landmark slot) |
| — | — | — | — | Lenshold (17, 19–20) — hub |

**Story restrictions kept.** Place texts are short exterior descriptions with a dry Entity line. Nothing names or
hints at the third party, the Emergence or the Entity's past. The approved ending's beats are **not** played:
- the observatory shows the empty lens mount, but the Entity's line there is deflecting, not the grief line;
- *"I left that here. I meant to come back."* is reserved for Phase 20C;
- the 20A dungeon story beats (the bent arm pointing at the Dormant Spire, the torn visitors' ledger, the scraped
  outline) are **not** in the place texts; they belong to the dungeons.

A test checks the place texts for the reserved words.

## Sealed dungeons: no way in

| Route | Result |
|---|---|
| The entrance sheet | No Enter button. Dungeon 1 reads "Sealed"; the others read "Locked" in order. |
| `R.startRun` on any of the ten | Refused, with forged clear records too. |
| `R.dungeonUnlocked` | False for all ten. |
| Dungeons screen | Offers no Celestial dungeon. |
| A forged Enter button (`c20Enter`) | Does nothing. |
| A forged `st.run` inside the Threshold | Dropped on load. |
| The campaign switch on (`D.C20.live = true`) | Still shut: no dungeon data exists. |
| Developer preview | Opens no dungeon, no Explore area, no quest. |
| Explore areas | Locked, including on legacy and Forge-Heart saves. |

## Save compatibility report

| Case | Result (tests) |
|---|---|
| Map, obstacles, island record | Fingerprints identical to the 20A commit `00e13d2`: the map, the 62 obstacle ids, types and cells, the land and buildable grids (763 land, 566 buildable), the six obstacle types, the island record, and every other island's obstacles. |
| Placement | Nothing can be built on any place or entrance. Grass still takes buildings. A Drifting Stone still blocks its four cells and frees them when cleared. Obstacles can still be cleared. |
| Legacy save that bought the Crown early | Keeps ownership (`unlockedAt` unchanged), cleared obstacles, a level-3 building where it stood, currencies and progress. If it stood on the Crown, it is moved to a ready island (records kept). Every entrance stays shut; no Starwell Habitat appears. |
| Forge Heart beaten in this build | The Crown does not open; reload does not open it; "Above the Clouds" stays hidden. |
| Developer preview | Marks the unlock `by: 'preview'`. On the next load the unlock is removed and the save moved to a ready island. Buildings placed and obstacles cleared during the preview are kept, as old-build records are. No developer switch is saved. |
| New save field | `st.c20 = { seen: {} }`, cleaned on load: unknown ids and stray keys removed; a damaged record repaired. |

## The Starwell Habitat

| Item | Value |
|---|---|
| Unlock | After the Bell Loft, Celestial Dungeon 8 (`req: { struct: 'hollow', c20: 'c_bellloft' }`). A forged Bell Loft clear does not count while the dungeon does not exist. With a stand-in Bell Loft, a clear opens it (the rule is tested). |
| Production | The same rate, storage and capacity per level as every habitat (tested against the Forge Habitat). An Aimza III earns exactly 1.5× what a Voltar III earns there. |
| Cost | 3,000 / 6,500 / 12,000 / 20,000 / 36,000 gold; 5 min → 2 h. No new currency. |
| Limit | Four. **Note:** the habitat framework counts limits per island (as with the Forge Habitat's four), so the rule is four per island. See the decisions below. |
| Developer access | The developer panel's "Starwell Habitat (session)" switch. Not saved; after a reload the habitat is locked again, and any already built is kept. |
| Codex | The species screen of a Resonance Amina reads "Home: the Starwell Habitat (Resonance residents earn 50% more)", and says it opens with the Bell Loft. |

## Exploration infrastructure

| Area | Opens with | Finds (existing second forms) | Rare third form (20%, certain day 8) | Joins at | Rare level |
|---|---|---|---|---|---|
| Cloud Shelf | Dungeon 1 | Zephyr II, Lumi II, Pyro-Phoenix II | Zephyr III | 46 | 48 |
| Moonbloom Beds | Dungeon 4 | Aquaflora II, Terraflora II, Acinus II | Acinus III | 49 | 51 |
| Star Shard Field | Dungeon 7 | Aimza II, Zeep II, Voltar II | Voltar III | 52 | 54 |

The rare levels are never above the dungeon ahead (the 18D/19C rule). There are no new species and no legendary lines.
20A listed the lines (for example "Zephyr, Lumi, Pyrospark"). The build uses their second forms, which suit levels
46–52; see the decisions below.

## The Two Keys: technical findings

The prototype (`tools/p20b-twokeys.js`) runs on the real `src/rules.js` battle engine in a sandbox. It is **not loaded
by the game** and adds no moves to it (tested).
- Stage 1: "The Pale Key", Lumifern III's shape, charged move *Keeper's Dawn* (light, burns), barrier at half health.
- Stage 2: "The Dark Key", Umbrit III's shape, charged move *The Closing Door* (resonance, never resisted), barrier at
  half health. It arrives ready to charge.
- Both use the Forge Heart's tier (×1.3 health, ×1.18 attack) at level 60.

These are the defensive manifestations of the Keepers, not the starters themselves.

| Requirement | Supported today? | Evidence |
|---|---|---|
| Aurelith (Lumifern III) then Eclipsar (Umbrit III) | **Yes** | `B.create` takes a foe list; the next steps in when one falls (`foeIn`). |
| One continuous encounter | **Yes** | One battle object, one `end` event. |
| Player team kept between stages | **Yes** | The same fighters; health, statuses and cooldowns carry over (tested). |
| Clean stage transition | **Yes in rules**; wording needs work | The barrier and charge state belong to each foe; stage 1's barrier does not carry over (tested). |
| Distinct charged-move warnings | **Yes** | Each stage has its own `tell`; stage 2 charges on its first action (tested). |
| Defeat and retry | **Yes** | A loss records nothing; the next attempt starts at the same battle with both stages at full health (tested through the real `resolveBattle`). |
| Save-safe completion | **Yes** | Hosted in the Forge Heart's battle slot inside the sandbox: a win clears the dungeon and sets the Island Boss flag, which survives save and reload. |
| One-time final rewards | **Yes** | The first clear pays its reward once; a replay pays no gems again. |

**Traced battle** (level-60 team Lumi III, Aimza III, Zeep III; seed 11), a win in 20 turns:
1. Turn 3: *Keeper's Dawn* charging.
2. Turn 4: barrier announced; it rises on turn 5.
3. Turn 8: the Pale Key falls and the Dark Key steps in.
4. Turn 9: *The Closing Door* charging.
5. Turns 12–14: barrier.
6. Turn 16: the Dark Key falls.

**Balance (first look; `docs/audit20b/twokeys.json`).** Win rates over 40 seeds, using the game's own auto-battle with
bare fighters (no gear or move upgrades), so treat these as relative. "Stand-in" is the 20A placeholder: Aimza III,
health ×2, two barriers.

| Team, level | Stand-in | Two Keys, each ×1.0 | ×1.15 | ×1.3 |
|---|---|---|---|---|
| Light, 55 | 1.00 | 0.93 | 0.30 | 0.17 |
| Dark, 55 | 0.70 | 0.68 | 0.13 | 0.00 |
| Water, 57 | 1.00 | 0.97 | 0.90 | 0.33 |
| Light, 60, basic attacks only | 0.03 | 0.80 | 0.55 | 0.00 |

Health ×1.0 per stage matches the stand-in for tactical play. With basic attacks only it is easier than the stand-in,
because each Keeper has one barrier instead of two. This is the recommended starting point. Final tuning belongs to
Phase 20C, with the 20A simulator.

**Engine and interface work Phase 20C needs** (found, not changed):
1. `R.createBattle` builds one foe. A staged spec needs a foe list (the sandbox shows the four-line change), and
   `st.seen` for both species.
2. `src/3d/runtime.js` `swap()` gives the incoming foe a fixed size (1.3). Stage 2 would appear smaller than a boss.
   It should take the boss scale.
3. `src/ui2.js` uses PvP wording: "… leads the other team!" at the start and "… steps in! (1 left)" at the change.
   Both need stage lines.
4. The encounter preview card shows one portrait.
5. Essence from the battle uses the spec's single species (`src/essence.js`).

## The Keeper's Emblem: proposals (not activated)

Rules for all three proposals:
- the charm slot, so no new slot;
- unique rarity ("Unique", like the Watcher's Lens);
- one-time: no family, cannot be merged, bought or crafted, and a duplicate becomes gold;
- a stat budget of 0.24, the same as the Watcher's Lens and the Coral Aegis.

Measured with `tools/p20b-emblem.js` against the Two Keys prototype, below the boss's level (where charms make a
difference). Each cell is a win rate over 80 seeds for three teams (light / dark / water), with every member wearing the
charm.

| Option | Bonus | Level 50 | Level 52 | Look |
|---|---|---|---|---|
| None | — | 0.03 / 0.01 / 0.23 | 0.20 / 0.13 / 0.29 | — |
| Watcher's Lens (existing) | +6% each | 0.42 / 0.14 / 0.34 | 0.71 / 0.60 / 0.86 | — |
| **A. Steadfast** (recommended) | HP +8%, DEF +10%, ATK +4%, SPD +2% | 0.49 / 0.31 / 0.42 | 0.96 / 0.63 / 0.95 | A round medallion split pale gold and violet slate, a keyhole at the seam |
| B. Twin Keys | ATK +8%, DEF +8%, HP +4%, SPD +4% | 0.49 / 0.23 / 0.47 | 0.82 / 0.76 / 0.89 | Two crossed keys, one moonstone, one slate |
| C. Crossing (the 20A idea) | +6% each | identical to the Lens | identical | A door-shaped plaque. **Rejected: it duplicates the Watcher's Lens's stat line exactly** |
| Choir Shell (best epic charm, for scale) | ATK +8%, SPD +8% | 0.11 / 0.13 / 0.04 | 0.61 / 0.51 / 0.60 | — |

**A** fits "holding the door" and differs from the Lens in shape, not in total. It measures a little stronger than the
Lens at the same budget, because speed is worth less here. If it should not out-rank the Lens, trim it to HP +7%,
DEF +9% (0.22). Visual mock-ups are on the review page. Nothing is added to `D.ITEMS` until you choose.

## Hatchery test correction (approved in 20A, applied)

`tests/browser-env12.test.js`: the companion's walk and production timers are held **before** the zoom, and the test
waits until the view and the creature have stopped moving on screen, instead of a fixed 1.2 s. The occlusion assertion
itself is unchanged, and no game code changed for the test.

| Condition | Runs | Result |
|---|---|---|
| Normal (2-core machine, nothing else running) | 30 | **30 passed, 0 failed** |
| Heavy load: two busy CPU loops on both cores for the whole run (other tests also ran at times) | 20 | **20 passed, 0 failed** |
| Full regression | 1 | **10 passed, 0 failed** |

Log: `docs/audit20b/hatchery-runs.txt`. One earlier heavy-load attempt was stopped and discarded. For a few seconds of
it the working tree had been stashed to compare three node suites with the base, so a run in that window could have
used the old test. It was rerun cleanly.

## Performance comparison (`tools/p20b-perf.js`, `docs/audit20b/perf.json`; software WebGL, DPR 2; not an iPhone)

**Draw calls and triangles by quality tier**

| Tier | Starter | Verdant | Obsidian | **Celestial** |
|---|---|---|---|---|
| High | 76 / 144k | 79 / 152k | 59 / 117k | **42 / 125k** |
| Balanced | 76 / 142k | 79 / 149k | 59 / 114k | **42 / 122k** |
| Saver | 78 / 85k | 80 / 84k | 59 / 70k | **41 / 78k** |

The Crown draws in the fewest calls of the four islands: its 21 places and entrances and its 62 obstacles bake into one
mesh. Its triangles are about 7% above Obsidian's and below Starter's and Verdant's.

| Measure (High tier) | Starter | Verdant | Obsidian | **Celestial** |
|---|---|---|---|---|
| Graphics memory, estimated (geometry + instances + shadow map) | 34.0 MB | 47.5 MB | 41.9 MB | **42.8 MB** |
| Distinct geometries drawn | 215 | 219 | 149 | **79** |
| Triangles: nature layer | 50k | 53k | 33k | **52k** |
| Frame time while panning, p50 / p95 (relative only) | 617 / 717 ms | 533 / 583 ms | 433 / 500 ms | **517 / 550 ms** |

The Crown pans slower than Obsidian on High, within the range of the three completed islands. The cause is its denser
scenery: the moon trees' leaf clusters give it 52k scenery triangles against Obsidian's 33k, about Verdant's. On
Balanced (350 ms each) and Saver (250 against 267 ms) it matches Obsidian.

| Other measures | Result |
|---|---|
| First visit (build the Crown's models) | 452 ms; second visit 219 ms. (The other islands had been visited during warm-up, so their "first" figures are not first visits.) |
| Landmark interactions | A place's sheet opens in 29 ms (p50; max 41, over 12). A Wayfinder move settles in 1.7 s, dominated by software frame times of about 0.5 s. |
| 2D fallback, frame time p50 | 16.7 ms on all four islands. |
| 2D fallback, page nodes | Celestial 2,807; Starter 2,710; Verdant 2,416; Obsidian 2,297. The Crown has 21 tap points and tags. |
| Long session (30 four-island round trips) | GPU geometries 316 → 317, steady from the tenth trip; textures 2 → 4, steady; page nodes 2,353 throughout; heap readings 76–209 MB, rising and falling with garbage collection, with no growth trend. Average island switch 1.8 s. |
| Browser test (DPR 1) | Draw calls: Starter 76, Verdant 79, Obsidian 62, Celestial 21. Six Obsidian ↔ Celestial round trips left geometries, textures and nodes unchanged. |

## Tests

New suites:
- `tests/celestial20b.test.js`: 90 checks covering map preservation, obstacles and collision, placement, readiness,
  legacy saves, the preview, sealed dungeons, the Starwell Habitat, exploration, story restrictions, the save record
  and The Two Keys.
- `tests/browser-celestial20b.test.js`: 29 checks covering the voxel island, 21 models and tap areas, the six obstacle
  types, the 62 obstacles drawn, no invisible blockers, sheets, real taps, the Wayfinder, the habitat in 3D and 2D, the
  Codex line, the 2D fallback, round trips, draw calls, reload and developer access.

Both were added to `tests/run-all.js`.

The phase also updated `browser-env1`'s two voxel-island checks. See the regression section below.

Three older assertions described the absence of things this phase adds. Each was updated to the approved behaviour and
is no weaker:
1. `obsidian19b`: "no Resonance habitat yet" now checks that the habitat exists and stays locked behind the Bell Loft.
2. `polish18d`: the list of rare third forms now includes the Crown's three.
3. `rewards17b`: "would show it once the Celestial Crown is marked ready" now sets both readiness switches. A ready
   Crown now means the island and its campaign. This keeps quests, and their gold, out of the developer preview.

## Regression

`node tests/run-all.js` ran **71 suites (69 before this phase plus the two new ones): 2,704 checks passed, 3 failed**
(53 minutes; log `docs/audit20b/regression.txt`).

| Suite | Failed check | Cause | Action |
|---|---|---|---|
| `browser-env1` (2) | "other islands keep the 2D island art"; "the voxel islands are starter, verdant, obsidian" | Both described the island list before this phase. With the Crown added, no island is 2D-only. | Updated: the list now includes the Crown, and the 2D-art check now turns the voxel island off and checks that the same island draws in 2D (the fallback every island still has). Rerun: **21 passed, 0 failed**. |
| `browser-obsidian19c` (1) | "Enter opens the Dungeons screen on Obsidian Reach" | **Intermittent, and it happens on the 20A base too.** The test clicks Enter 300 ms after opening the sheet, but the sheet deliberately ignores clicks for its first 400 ms (so the tap that opened it cannot close it). Whether the click lands depends on page latency. Measured: the run passes when the click arrives after 400 ms (478 and 481 ms) and fails when it arrives before (390 ms on this branch, 388 ms on the base). Reruns: this branch 1 of 3 passed; the base 4 of 4, then 1 of 2. | **Not changed.** Proposed fix, for your approval: wait 500 ms before the click, past the guard, as a real tap would. The assertion stays the same. |

`browser-env12` (the Hatchery test) passed 10/10 in the full run. The new suites passed: `celestial20b` 90/90 and
`browser-celestial20b` 29/29.

## Manual and device testing

None. No manual play-through and no physical-iPhone testing was done in this phase. Everything above is automated
(Node and headless Chromium with software WebGL). Taps were simulated touch events in the browser.

## Known limitations

- The ten dungeons are entrances only. There are no battles, foes, rewards, scenes or arenas for the Crown, and its
  quests are still hidden.
- The observatory, the orrery and the bell are static models; nothing turns or swings. 20A suggested one turning
  orrery. It was left static to add no per-frame work, and can be added later as a small animation.
- No new lights, shaders, transparency or particles. The "astral" mood comes from the palette, unlit glow voxels and the
  island's shared sparkle points (the observatory, the Bell Loft, Starfall Terrace). The island uses the same light rig
  as the others.
- The 2D island keeps its existing obstacle pictures; the places and entrances have new simple 2D pictures.
- This build's developer tools are on (`D.DEV_TOOLS = true`, as in every preview build). Anyone who opens the
  developer panel (seven taps on the version number) can start the session-only preview or habitat access. Both end
  on reload and grant nothing permanent beyond what was built.
- The Two Keys numbers use bare fighters. They compare options; they do not predict real players.

## Decisions for you

1. **Starwell Habitat limit.** The framework counts "four" per island, like the Forge Habitat. Keep that, or make it
   four in total?
2. **Explore finds.** Second forms (as built), or the base forms named in 20A?
3. **The Keeper's Emblem.** A (recommended, optionally trimmed to 0.22) or B; and its look.
4. **Two Keys stage health.** ×1.0 each as the starting point for 20C tuning?
5. **A story question, not decided here.** The existing Watcher's Lens reads "The Entity says it lost this." The
   observatory now has an empty lens mount, and ending A gives the Entity the line "I left that here." Should the two
   be connected, or kept apart? Nothing in the game connects them.
6. **Names.** 20A's tables used species ids (Aurelith, Eclipsar, Stormbringer, Pyrospark, Calyxar). The in-game names
   are Lumifern III, Umbrit III, Zephyr III, Pyro-Phoenix and Acinus III. This build's text uses the in-game names.
7. Whether the orrery should turn (a small, cheap animation, paused under Reduce Motion).
8. **The `browser-obsidian19c` timing fix** (see the regression section): wait 500 ms before clicking Enter. This
   failure also occurs on the 20A base; the fix is not applied.
