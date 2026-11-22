# Phase 18A — Second island: world and story design

Branch `p18a-world-design`, from Phase 17D (`203e3e9`). Production `main` (`0fc9e36`) is untouched. **This phase is
design only: no game code, data, save format or balance was changed.** New files are a design data file and
simulators used for analysis (`tools/p18a-design.js`, `tools/p18a-sim.js`, `tools/p18a-shots.js`), results in
`docs/audit18a/`, screenshots of the game as it is today in `docs/ui/screens18a/`, and this document. Nothing was tested
on an iPhone.

Everything below marked **Proposed** needs your approval before Phase 18B. Everything marked **Today** was read from
the source.

---

## 1. What already exists (source audit)

**The second island already exists, partly.** Defeating the Heartwood's Island Boss already unlocks and lets you
travel to the **Verdant Wilds**. It is a finished, rendered island with no campaign.

| Area | Today | Where |
|---|---|---|
| Island order | `starter → verdant → obsidian → celestial` (Sunlit Sanctuary, Verdant Wilds, Obsidian Reach, Celestial Crown) | `world-data.js` `D.ISLAND_ORDER`, `D.ISLANDS` |
| Verdant Wilds | Nature, tier 1. Blurb: “ancient roots, mossy ruins, singing streams and plants that glow after dusk.” | `D.ISLANDS.verdant` |
| Map | 32×32 grid: 479 buildable grass cells, 49 path, 31 inland water (streams), 7 bridge cells, a 3×3 landmark slot at (21–23, 20–22) | `world-maps.js` `D.MAPS.verdant` |
| Obstacles | 60 (elder roots, vine trees, ferns, glowcaps, moss ruins, moss rocks). **Ids and positions are referenced by saves; never move them.** | `D.OBSTACLE_LAYOUT.verdant` |
| Rendering | 2D island art palette, 3D island (terraces, arched doors, vines, rune stones), waterfalls, fireflies | `island-art.js`, `3d/island3d.js` |
| Unlock | Heartwood's Island Boss → `W.unlockByBoss(st, 'verdant')` once; islands bought for gold in old builds stay unlocked | `rules.js` `resolveBattle`, `world.js` |
| Campaign | `D.CAMPAIGN.verdant = { dungeons: [], islandBoss: null, next: 'obsidian' }`; the Dungeons screen hides islands without dungeons; the map says “Its dungeons have not opened yet. You can build and explore here.” | `campaign-data.js`, `ui2.js`, `ui-world.js` |
| Story | Heartwood scene ends: “The Verdant Wilds. Bring your manners. Everything there is older than it looks, including the moss.” Arrival lines exist (`T.islandHello.verdant`, `T.scripts.island('verdant')`). | `scenes.js`, `story.js` |
| Quests | `m_wilds` (unlock + visit Verdant; 5,000 gold, 10 gems), `s_wilds_farm`, `s_wilds_clear`; `s_reach` and `s_crown` hidden while Obsidian/Celestial cannot be reached (17B) | `world-data.js`, `quests.js` |
| Obsidian Reach, Celestial Crown | Maps, obstacles, art and arrival lines exist; no dungeons; unreachable in a new save | as above |
| Dungeons | 10 on Starter Island, 100 battles; `playable` flag per dungeon; `d.prev` chain per island; `R.dungeonUnlocked` already checks `d.island` | `campaign-data.js`, `rules.js` |
| Level cap | `D.MAX_LEVEL = 30`; stats grow linearly, `1 + 0.11 × (lv − 1)` | `data.js`, `rules.js` |
| Roster | 63 species in 21 lines; all obtainable on Starter Island (17D audit) | `roster.js` |
| Habitats | 7 element habitats (no Metal or Resonance), farm, mine, decor; limits are per island | `world-data.js`, `world.js` |
| Canon guard | “The Entity never explains the Emergence, never says where the starter island came from, never names the presence beyond the world, and never explains why the two starter species became enemies.” | `scenes.js` header |
| Story plan (your notes, project images) | Starters' shared history told through evidence across islands. Early clues: a mural of two companions. **Middle clues: records describe the same creatures as protectors, then enemies; each species remembers differently.** Later clues: an event neither intended. | `IMG_3866/3867` |

**Conclusion:** the region that should become playable next is the **Verdant Wilds**. It is already the next island
in data, art, unlock logic, quests and story. No region needs renaming.

---

## 2. Three concepts for the Verdant Wilds (one region, three readings of its blurb)

| | A. The Overgrown Commonwealth | B. The Singing Delta | C. The Glowroot Canopy |
|---|---|---|---|
| Visual theme | A great settlement of people and Aminas swallowed by roots: aqueducts, terraces, a library, a shrine, all mossed over | A river delta: braided glowing streams, waterfalls, mangroves, lily-pad crossings, mist | A single colossal tree: terraced platforms up the trunk, rope bridges, bioluminescence at dusk |
| Terrain | Terraces and ruins on grass, existing streams and bridges, one landmark tree | Mostly water and sandbars; much less buildable ground | Vertical layers; the island map becomes a trunk with rings |
| Landmarks | Mossgate Steps, Drowned Aqueduct, Ivy Archive, Twin Shrine, Choir of Roots, Elder Root | Waterfall Gate, Sunken Bells, Delta Choir, the Mouth | Root Hollows, the Lantern Ring, the Crown |
| Hazards | Roots lifting the ground, spores, rising water in the aqueduct | Tides and mist (shifting routes) | Height, wind, glowing pollen |
| Habitats | Grove ruins for Nature, streams for Water, the Archive for Metal and Dark | Water, Nature | Nature, Wind, Light |
| Story value | **Strongest**: an archive and a split shrine are natural places for “records” and “two remembered versions” | Voices in the water: atmospheric, but records are hard to place | The tree as a witness: strong final, thin middle |
| Fit with today's map | **Uses it as is**: paths, streams, bridges and a landmark slot already exist | Needs a new map (would move obstacles: **unsafe for saves**) | Needs a new map and new 3D terrain work |
| Complexity | **Low–medium** | High | Highest |

**Recommendation: A, with one landmark from C** (the Elder Root as the Island Boss's home). It keeps the existing map,
obstacles and saves, needs no new terrain system, and gives the story its “middle clues” in places that feel natural.
Not locked: your call.

---

## 3. Story outline (Proposed)

Canon kept: the player is an outsider; the Entity is a dry, sardonic Caretaker who calls the creatures Kind Souls;
Light and Shadow stay central; the two starters were close friends before they became enemies; a third force is
hinted, never named; the Entity never explains why the starters fell out or names the presence.

1. **Arrival** (first visit after the update; also for players who already visited). The Entity: *“The Wilds. Mind the
   roots. They were here first, and they've never let anyone forget it.”* … *“Somebody built steps here. Lots of steps.
   People never build steps to nowhere. Well. Rarely.”*
2. **Initial objective:** climb the Mossgate Steps (Dungeon 1) to reach the settlement (the Commons, the main hub).
3. **Major development 1 — the Ivy Archive (D4):** the tablets call the two starters “the Keepers”, protectors of a
   crossing. The Entity reads them aloud without noticing he can. *“‘The Keepers of the Crossing.’ Charming. Folk
   tales. Every ruin has some.”* (beat) *“…These are filed correctly. Nobody files folk tales correctly.”*
4. **Major development 2 — the Canopy Walk (D7):** from the treetops the player sees the Dormant Spire across the sea,
   pulsing in time with something on this island.
5. **Major development 3 — the Choir of Roots (D9):** standing stones like the Sanctuary's pale stone sing a chord.
   It has three voices; one is neither Light nor Shadow. *Entity:* *“Don't answer it.”* *“I'm not being dramatic. I'm
   being specific.”*
6. **Mid-island revelation — the Twin Shrine (D6):** a temple split by a stream, half white stone, half dark glass.
   Its panels show the two starters guarding the crossing together; the panel after it is smashed. A Kind Soul on each
   side tells it differently (Lumifern line: “the Dark one let it in”; Umbrit line: “the Light one closed the door on
   us”). Neither version is confirmed. Your own starter reacts; the Entity changes the subject: *“Panels break. It's
   what panels do.”* The other starter's second form joins you here (see 8, a decision).
7. **Final dungeon — the Elder Root (D10), Island Boss:** the stag from the Heartwood, grown into the **Forest Crown**,
   guards the place where every stream ends.
   - *Entity, before:* *“It was a fawn the last time we met. They grow. Annoyingly.”*
   - *After:* *“It wasn't keeping you out. It was keeping something in. …I'd rather we didn't test which.”*
8. **Toward the third island:** the Elder Root's roots part. Across the sea, black stone and a magenta glow: Obsidian
   Reach. *“Warm stone. Quiet crystals. Don't lick anything.”* (the existing arrival line, kept). The Entity, alone,
   to the smashed panel's single surviving shard: *“…You always did take the dramatic route.”*
   - Who “you” is stays unsaid.

Dungeons 2, 3, 5 and 8 get a one-line Entity remark after the first clear, as on Starter Island (`A.Scenes.after`).
Scenes stay reward-free (the rules pay first; skipping never loses progress), as today.

---

## 4. The ten dungeons (Proposed)

The battle pattern is Starter Island's:
- Battles 1–3: rec − 3, rec − 3, rec − 2.
- Battles 4–6: rec − 2, rec − 1, rec − 1.
- Battles 7–9: the recommended level (elites; battle 9 rehearses the boss, as in 17B).
- Battle 10: the guardian at rec + 3.

Foes take the form their level calls for (III from level 22). Every species is an existing Amina. The 17D replay
challenges (Flawless, One element, Answer the guardian) apply to every dungeon automatically.

| # | Dungeon (rec, Band C) | Where | Foes | Guardian · charged move | Mechanic (proposed) | Preparation | Story | First clear | Repeat |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Mossgate Steps** (22) | Landing to the first terrace | Earth/Nature: Gaiaroki, Terraflora, Acinus, Pyro-Cell lines | **The Moss Bastion** (Gaiaroki III) · Root Crush (existing) | Root-lifted steps: battles 4–6 open with the foe guarding | Nature, Water, Metal; guard/soak the charge | Arrival; stairs cut for two kinds of feet | 900 g, 200 f, 6 gems, Rootsplit | 220 g, 50 f |
| 2 | **Drowned Aqueduct** (24) | East streams | Water: Kairyu, Cannonis, Aquaflora, Sylvaneer | **The Sluice Warden** (Kairyu III) · *Floodgate* (new: water + soak) | Rising water: each section's first foe starts soaked | Nature; a cleansing heal | Streams repeat two worn names | 1,000 g, 220 f, 6 gems, Tideplate | 240 g, 55 f |
| 3 | **Spore Hollow** (25) | West glade | Nature (+Dark): Acinus, Sylvaneer, Terraflora, Voltar | **The Spore Mother** (Acinus III) · *Spore Bloom* (new: weaken) | Spore drifts favour cleansing heals | Fire, Wind | A Kind Soul remembers “the Light one left” | 1,100 g, 240 f, 8 gems, Mossmantle | 260 g, 55 f |
| 4 | **Ivy Archive** (27) | Central hill | Metal/Dark: Zeep, Voltar, Umbrit lines | **The Archivist** (Zeep III) · *Archive Seal* (new: silence) | Indexed foes: each battle's element is shown in advance | Fire, Water; Light for Dark | **Development 1**: “the Keepers” | 1,250 g, 260 f, 8 gems, Stoneclub | 280 g, 60 f |
| 5 | **Glowworm Terraces** (28) | South-west terraces | Fire: Igniflare, Pyrokai, Emberix, Pyro-Spark | **The Lantern Wyrm** (Igniflare III) · *Ember Canopy* (new: burn) | Burning terraces | Water; cleansing heal | Two kinds of lantern, side by side | 1,400 g, 280 f, 10 gems, Blazefang | 300 g, 65 f |
| 6 | **Twin Shrine** (30) | Centre, split by the stream | Light/Dark: Lumifern, Umbrit, Lumi, Voltar | **The Dawn Warden** (Lumifern III) · *Twin Eclipse* (new, never resisted) · Prism Shift light ↔ dark; battle 9: Umbrit III herald | Alternating element | A Light- and a Dark-hitter, or Resonance | **Revelation** | 1,600 g, 300 f, 12 gems, Eclipse Orb | 320 g, 70 f |
| 7 | **Canopy Walk** (31) | North treetops | Wind (+Light): Zephyr, Pyro-Spark, Lumi | **The Canopy Squall** (Zephyr III) · Gale Force (existing) | Swift foes (17B swift edge) | Fire, Earth; your own swift Aminas | **Development 2**: the Spire pulses | 1,800 g, 330 f, 10 gems, Galeplume | 340 g, 75 f |
| 8 | **Moonwell** (33) | Grotto under the west lake | Water/Dark: Aquaflora, Kairyu, Voltar, Umbrit | **The Moonwell Serpent** (Aquaflora III) · *Tidal Hymn* (new) | Reflections: mixed elements | Nature for Water, Light for Dark | The Entity will not go in | 2,000 g, 360 f, 12 gems, Moonpearl | 360 g, 80 f |
| 9 | **Choir of Roots** (34) | North-east stone ring | Resonance (+Nature, Metal): Aimza, Sylvaneer, Terraflora, Zeep | **The Third Voice** (Aimza III) · Resonant Collapse (existing) | Neither resisted nor resisting: tactics over types | Guards (17C recoil), heals | **Development 3**: the third voice | 2,300 g, 400 f, 15 gems, Choir Shell | 380 g, 85 f |
| 10 | **Elder Root** (36) · Island Boss | The giant tree, north headland | Nature (+Resonance) | **The Forest Crown** (Sylvaneer III) · *Crown of Thorns* (new) + Stone Barrier (two thresholds) | Barrier and charge | Fire, Wind; specials for the barrier; guard the charge | **Confrontation**; opens Obsidian Reach | 4,000 g, 600 f, 30 gems, Elder Guard | 450 g, 90 f |

- New charged moves (7, data only, marked proposed in `tools/p18a-design.js`): Floodgate, Spore Bloom, Archive Seal,
  Ember Canopy, Twin Eclipse, Tidal Hymn, Crown of Thorns. Root Crush, Gale Force and Resonant Collapse are reused.
- Equipment rewards reuse existing, currently unused items (no new items).
- Reward scale continues Starter Island's (Heartwood: 2,000 g, 30 gems). Repeats pay no gems (17B rule). The island's
  one-time total: 17,350 gold, about 3,190 food and 117 gems from first clears.
- The mechanics column is optional flavour for 18C. Every dungeon works without it (the simulation used none except
  barrier, prism and charged moves, which exist today).

---

## 5. Level progression (simulated, sandbox only)

Method:
- The game's real rules (17D) were loaded in a sandbox, and the ten proposed dungeons were added to the sandbox only.
- Realistic end-of-Starter-Island saves were built with the 17C campaign agent: balanced trio, tactical play, it
  evolves when it can and replays after two defeats.
- Five profiles:
  - **rarely fed**
  - **fed regularly** (half of its food)
  - **fed with all food**
  - **prepared**: fed regularly, moves at Lv 4, the best gear worn
  - **challenger**: prepared, moves at Lv 5, extra Starter replays
- Each profile played on into the Verdant Wilds; two seeds each, and 10 fresh first attempts per dungeon from each save.
- **Threshold**: the lowest level at which a plain balanced trio (no gear, Lv 1 moves) clears a dungeon first try at
  least half the time. **Slack** is a profile's arrival level minus that threshold.
- Starter Island for comparison (17C): slack ≈ 2–4 rarely fed, 4–6 fed.

Findings:
1. **The level cap is the main constraint.** With the current cap of 30, fed players reach it by Dungeon 4–5 (Band A
   22–30) and everyone by Dungeon 8–10. Levels then stop mattering, and Obsidian Reach and the Celestial Crown would
   have no levels left.
2. **Levels matter much less after 22.** Stats grow linearly (+11% of base per level). From 22 to 30 that is only
   +27%, against the doubling between levels 4 and 8 on Starter Island; there is no evolution after 22. A party of
   third forms clears Dungeons 1–5 of Band A at level 22, whatever their recommended level.
3. **As designed (no other change), every band is easy**: 0 losses, 100% first tries, for every profile. Band A slack
   3–8; Band C slack 3–9 (fed), 0–5 (rarely fed).
4. **Band C (22–36, cap raised to 40) plus a modest foe tier for the second island** (sandbox: foe HP ×1.15 and
   attack ×1.10) gives a curve close to Starter Island's, slightly harder late:
   - Rarely fed: slack 0 to 3, then −1.7 at the Moonwell; 0.5 losses, no grinding.
   - Fed regularly: slack 2–6, 0 losses.
   - Challenger: slack 4–9.
   - With ×1.3/×1.15: rarely fed has 2 losses and 1 replay; fed teams still have no losses.
5. **The Moonwell (Dungeon 8) is the spike** in every variant (threshold jumps by 5). Tune it down (Tidal Hymn power,
   or rec 32) in 18D.
6. Well-prepared teams (challenger) stay comfortable in every variant. Making the island hard for them would make it
   punishing for rarely-fed players. The 17D challenges remain the stretch goal for them.

**Recommendation (not implemented):** Band C, with the level cap raised to 40 (XP needs per level follow the existing
formula; no new XP rule) and a second-island foe tier of about ×1.15 HP / ×1.10 attack, tuned in 18D. Both are
balance changes that need your approval. Alternatives:
- Keep cap 30 with Band A and the tier: playable, but the cap is reached halfway and the third island needs a cap
  change anyway.
- Band B (21–28): the easiest and least rewarding.

Full tables: `docs/audit18a/progression*.json` and `.txt`.

---

## 6. Island layout (Proposed; uses the existing map)

Coordinates are map cells (x, y) on the existing 32×32 Verdant map. New landmarks go only on cells that cannot be
built on today (path, sand, water, bridge, the landmark slot), so **no player's building or obstacle is ever
displaced**.

| Place | Cell | Notes |
|---|---|---|
| **Landing Cove** (arrival) | (16, 28) | South beach where the main path begins |
| **Mossgate Commons** (hub) | landmark slot (21–23, 20–22) | Ruined plaza; the Entity's spot; the Dungeons and Explore buttons point here |
| 1 Mossgate Steps | (16, 24) | On the south path |
| 2 Drowned Aqueduct | (25, 11) | East stream channel |
| 3 Spore Hollow | (12, 11) | West glade (path cell); its Explore area: Glowcap Glade |
| 4 Ivy Archive | (10, 6) | North end of the west path; restoring it opens the north route (story, not a building cost) |
| 5 Glowworm Terraces | (13, 19) | South-west path bend |
| 6 Twin Shrine | bridge (17, 14) | The island's centre, split by the stream |
| 7 Canopy Walk | (20, 3) | North-east shore below the woods (opens after the Archive) |
| 8 Moonwell | (4, 20) | West lake |
| 9 Choir of Roots | (26, 17) | East path end, a stone ring |
| 10 Elder Root (Island Boss) | (12, 1) | North headland (sand cell at the tip) |
| Explore areas (new, global Explore screen) | — | Glowcap Glade (after D1), Streamside (after D2), Canopy Edge (after D7) |

- **Routes and blockers.** Dungeons open in order, as on Starter Island. The north route is shown from the start and
  “opens after the Ivy Archive”; nothing on it is needed before then.
- **No trap.** The player can always travel back to Starter Island; the Map's Travel button is never locked, and
  every dungeon's lock text names what to do.
- **Navigation.** Dungeon markers use the existing Dungeons screen (a tap opens it at that dungeon). No new
  navigation system is needed: `Nav.resolve` already handles `dungeon_clear`, `visit_island` and `remove_obstacle`.

The labelled map is on the review page.

---

## 7. Buildings and habitats

- **No new building type is needed for the second island.** The existing habitats, farm, mine and decorations work on
  any island, with limits per island, so the Verdant Wilds already has full building room (479 cells).
- **Metal habitat: not needed yet.**
  - It would support the Zeep line (3 forms) and, as residents only, the six legendary Meta/Atem forms.
  - Metal essence is scarce today (Hollow Veil battles, the ruins tower, the 17C exchange). The Ivy Archive's Metal
    foes add a steady source on replays.
  - Recommend introducing it with Obsidian Reach, if approved: unlocked by that island's story, 3×3, five levels like
    the other habitats.
- **Resonance habitat: not needed yet.**
  - It would support only the Aimza line (3 forms); the Choir of Roots adds Resonance essence on replays.
  - Recommend introducing it with the Celestial Crown.
- Moon Shrine limits (17C/17D) are untouched; the second island adds no gem producer.
- Optional (decision): a restorable story landmark on the Verdant Wilds (the Archive), with no production and no cost
  beyond the story, to mirror the Sanctuary's restorations. Not proposed for 18B unless you want it.

---

## 8. Collection and Codex

- No new species. Every Amina in the Verdant dungeons exists today; all 63 are already obtainable.
- **What the island adds to collecting:**
  - **New encounter places**: three Verdant Explore areas offering existing species at higher levels, including
    second forms directly (Glowcap Glade: Terraflora II, Sylvaneer II; Streamside: Aquaflora II, Kairyu II; Canopy
    Edge: Aeolus, Pyro-Hawk). That helps the 17D “evolved forms” milestones.
  - **Rare encounter**: in each Verdant area, one step offers a third form (a once-only find).
  - **Twin Shrine gift** (decision): the second form of the starter you did not choose (Solarbloom or Duskmantle), once,
    if you do not already own it. It ties the revelation to your collection.
  - **Evolution**: nothing changes (12 and 22).
  - **Breeding**: no new pairings; the island's level range makes more parents breed-ready.
  - **Codex milestones (17D)** keep counting; species percentages stay over obtainable species only.
  - **Collection quests (Proposed)**:
    - “Naturalist IV”: befriend 32 species.
    - “Wilds Census”: every Nature form.
    - “Two Keepers”: own both starter lines.
- Optional new species: **none proposed.**

---

## 9. Quest and island-unlock audit, and a migration-safe plan

| Quest | Today | After 18B (Proposed) |
|---|---|---|
| `m_wilds` | unlock + visit Verdant after `m_stone`; 5,000 g, 10 gems | unchanged |
| `s_wilds_farm`, `s_wilds_clear` | side, after `m_wilds` | unchanged |
| `s_reach` | hidden: Obsidian unreachable (17B `Q.islandReachable`) | **would appear as soon as the Verdant boss is playable** (the rule only checks that the previous island's boss is playable). Proposed: also require the island to have playable dungeons, so it stays hidden until Obsidian has content |
| `s_crown` | hidden | unchanged by the same rule |
| New (Proposed) | — | a Verdant main chain (`v_*`), each step after the previous, the first after `m_wilds` |

**Saves**
- New dungeons are new keys in `st.dungeon`. New flags use a `v_` prefix. Explore counts are keyed by area.
- No schema change, and nothing existing is renamed or removed.
- 17D's daily tasks, challenges and milestones pick the new dungeons up automatically.

**Players who already reached the Verdant Wilds**
- They keep everything: buildings, cleared obstacles, claimed quests.
- Dungeon 1 is available at once, and the arrival scene plays once on their next visit (a flag).

**Players who bought islands in old builds**
- Obsidian and Celestial stay unlocked, as today. Their quests stay claimed if claimed.
- Defeating the Verdant boss never pays an island unlock twice: `unlockByBoss` returns “already”.

**Duplicate rewards**
- First-clear rewards are guarded by `rec.clears`.
- Quest claims are guarded by `st.missions`.
- `m_wilds` is already claimed by players who visited the Wilds; it is never re-offered.

**Staging**
- Dungeons can ship as data with `playable: false` (hidden by the existing check) until each is ready.
- The Verdant Island Boss should only be `playable` once Dungeons 1–10 are.

**Defeating the Verdant boss**
- Today's data says it unlocks Obsidian Reach, an island with no campaign. Same pattern as the Verdant Wilds today.
- Decision: keep that (consistent, honest “dungeons not opened yet” text), or delay Obsidian's unlock until its
  content exists.

---

## 10. Technical plan (smallest maintainable expansion)

| Topic | Plan |
|---|---|
| Island data | Fill `D.CAMPAIGN.verdant.dungeons` and `islandBoss`; no change to `D.ISLANDS`/maps |
| Dungeons | New entries in `D.DUNGEONS` (same shape as Starter's), in a new data file `campaign-verdant.js` loaded after `campaign-data.js`; the 17B elite/herald pass and `D.DUNGEON_ORDER` already loop over all dungeons |
| Enemies and bosses | Existing species; 7 new ability entries; existing mechanics (barrier, prism); optional light mechanics as data flags read in one place |
| Quests | New `v_*` quests in data; the `islandReachable` refinement (one line) |
| Story | New scenes in `A.Scenes.list` (same format), arrival script, `SC.after` lines; journal entries in `D.LORE` |
| Explore | Three areas in `D.AREAS`; `R.reqMet` gains `island` and `dungeon` requirements (dungeon exists) |
| Save schema | No version bump; new keys only; tests load old saves |
| Asset loading | No new models: dungeon environments reuse `Art.envBg` keys first (forest, ruins, water, shrine), then optional new env art in 18C; landmarks are small voxel props |
| Scene transitions | Existing travel, encounter card, battle and scene flow |
| Map navigation | Existing map, Travel and `Nav.resolve` |
| Mobile memory | One island in memory at a time (existing); landmark props reuse the island's instanced voxel kit; budget ≤ +5% island triangles; checked with the Phase 3 quality tiers |
| Quality settings | Existing tiers (high / balanced / saver), LOD and battery saver apply unchanged |
| Offline | Unchanged: no server; everything local |
| Level cap (if approved) | `D.MAX_LEVEL = 40`; the XP formula already continues; a test that nothing assumes 30 (achievements, feeding, Survival) |
| Foe tier (if approved) | One multiplier per island in `D.CAMPAIGN[iid].foeTier`, applied in `R.enemyFromSpec` |

**Phases**
- **18B: foundation and first half.**
  - Data file, Dungeons 1–5 playable, arrival scene, Mossgate Commons landmark, Explore area 1.
  - The `v_` quest chain to Dungeon 5, the `islandReachable` rule, and the level cap and foe tier (if approved).
  - Tests: migration, unlock, no early access to Dungeons 6–10, regression.
- **18C: second half and story.**
  - Dungeons 6–10 and the Island Boss, the Twin Shrine revelation and Elder Root scenes, the remaining landmarks and
    Explore areas, the new charged moves, optional mechanics, environment art.
- **18D: balance and polish.**
  - Simulations against the real data, Moonwell tuning, the collection quests, challenge checks for the new dungeons.
  - Performance on mid-range phones, full regression, review page.

---

## 11. The intermittent Forge-close failure

See section 11 of the review page and `docs/audit18a/forge-close.md` for the investigation and verdict.

**Verdict:** not a functional defect as far as can be shown. `UI.close` removes the Forge synchronously and nothing reopens it; the check depends on `.overlay:last-child` still being the Forge at click time, and asynchronous notices in the modal layer can change that (UI transition state, made more likely by load: test environment). It was not reproduced in 22 instrumented runs on the 18A code (14 alone, 8 under parallel load), after 5 failures in about 33 runs across 17C–17D. The test now prints the modal layer when it fails (diagnostics only; same click, wait and assertion). Full write-up: `docs/audit18a/forge-close.md`. A second intermittent check in the same suite ("hidden: every island animation is paused", 3 of 22) is reported, not changed.

---

## 12. Verification

- **No game file changed**: `git diff 203e3e9 -- src index.html` is empty. The one test change is diagnostics in
  `browser-dev7` (section 11; same click, wait and assertion).
- A fresh load of the game shows the following, so nothing unfinished became accessible:
  - the Verdant Wilds has 0 dungeons, there are 10 dungeons in all and none with a `v_` id;
  - none of the proposed moves exists, the level cap is 30, Obsidian Reach is unreachable;
  - the Verdant Wilds still has its 60 obstacles.
- Every Node suite passes (19 suites, 764 checks).
- `browser-dev7` was run 23 times (22 instrumented, then once more after the change): the Forge check passed every time.
- No full browser regression was rerun, since no game code changed.
- `node --check` passes on the new tools.
- Screenshots in `docs/ui/screens18a/` show the game as it is today (Chromium, 844×390), not proposals.
- Production `main` unchanged (`0fc9e36`).
- Planned work is labelled **Proposed** throughout; nothing proposed is implemented.

---

## 13. Risks and unresolved decisions

**Risks**
1. **Level cap.** Raising it touches feeding, achievements, Survival and the XP display. Mitigation: a single constant
   and a targeted test in 18B.
2. **Flat difficulty above 22.** Without a foe tier or new mechanics the island is easy. Mitigation: tier plus 18D
   tuning against the real data.
3. **The Moonwell spike.** Tune in 18D.
4. **Story canon.** The revelation must not explain the falling-out or name the presence. Mitigation: both versions
   are told by Kind Souls, never confirmed by the Entity.
5. **Save safety.** Map cells and obstacle ids must never change. Mitigation: landmarks only on non-buildable cells;
   a test that every Verdant obstacle id and position is unchanged.
6. **Content size and memory.** Up to 10 new environment backgrounds. Mitigation: reuse existing envs first; new art
   only where approved.
7. **Obsidian Reach without content** after the Verdant boss (as the Wilds today). Decision below.
8. **Intermittent browser tests** (Forge close, frame-rate stepping, island animation pause) can hide real failures.
   They are reported, not changed.

**Decisions for you**
1. Concept A (Overgrown Commonwealth with the Elder Root) or another.
2. Level band and cap: C with cap 40 (recommended), A with cap 30, or B.
3. A second-island foe tier (≈ ×1.15 HP / ×1.10 attack) or another way to keep it from being trivial.
4. The seven new charged moves (names, effects).
5. `s_reach` visibility rule (hide until Obsidian has dungeons).
6. What the Verdant Island Boss unlocks now (Obsidian Reach as data says, or delay).
7. The Twin Shrine gift (the other starter's second form).
8. Optional dungeon mechanics (root-lifted steps, rising water, indexed foes…), or plain dungeons first.
9. First- and repeat-clear rewards (table in section 4).
10. Metal and Resonance habitats deferred to Obsidian Reach and the Celestial Crown.
