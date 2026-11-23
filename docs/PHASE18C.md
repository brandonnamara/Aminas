# Phase 18C — Verdant Wilds dungeons and story campaign

Branch `p18c-verdant-campaign` (from Phase 18B, `62ba756`). Production `main` is untouched. The Phase 16A opening
stays off by default. The map, its 60 obstacle ids, building placements and island coordinates are unchanged
(hash-checked by `verdant18b.test.js`).

**Testing note.** Everything below was verified by automated means only: rule-level simulation of the battle
engine with scripted play styles (`tools/p18c-sim.js`), Node rule tests, and Chromium + Playwright with software
WebGL at 844×390 (touch emulation). **No one played these dungeons by hand, and nothing was tested on an iPhone.**

---

## 1. What a player can do now

- Reach the Verdant Wilds (Starter Island's Island Boss, as before) and see the arrival scene once.
- Play ten dungeons in order, 100 battles, each ending in a guardian with a telegraphed charged move; the tenth is
  the Forest Crown, the Verdant Island Boss, inside the Elder Root.
- Follow the story through seven scenes: arrival, the Ivy Archive (the Keepers), the Canopy Walk (the Dormant
  Spire), the Choir of Roots (the third voice), the Twin Shrine (the broken panel), the Elder Root confrontation, and
  the conclusion. Five other dungeons end with a one-line remark from the Entity.
- Claim the Twin Shrine's optional gift once.
- Explore Glowcap Glade from arrival, Streamside after Dungeon 2, Canopy Edge after Dungeon 7.
- Follow ten Verdant main quests (one per dungeon) and three side quests.
- Obsidian Reach stays closed; its quest stays hidden.

## 2. The ten dungeons

| # | Dungeon | Rec | Foes (forms by level) | Guardian (battle 10) | Charged move | First clear | Replay |
|---|---|---|---|---|---|---|---|
| 1 | Mossgate Steps | 22 | Terraki, Terraflora II, Berrant, Pyroforge → Rockraki, Pyrocore, Terraflora III | The Moss Bastion (Rockraki 25) | Root Crush | 900 g, 200 f, 6 gems, Ironbark Vest | 220 g, 50 f |
| 2 | Drowned Aqueduct | 24 | Tidalong, Reefback, Aquaflora III, Sylvaneer III, Oceanfang, Shellfin | The Sluice Warden (Oceanfang 27) | **Floodgate** | 1,000 g, 220 f, 6 gems, Tide Plate | 240 g, 55 f |
| 3 | Spore Hollow | 25 | Calyxar, Sylvaneer III, Terraflora III, Voltar III | The Spore Mother (Calyxar 28) | **Spore Bloom** | 1,100 g, 240 f, 8 gems, Heartwood Mail | 260 g, 55 f |
| 4 | Ivy Archive | 27 | Zeep III, Voltar III, Eclipsar | The Archivist (Zeep III 30) | **Archive Seal** | 1,250 g, 260 f, 8 gems, Stonebreaker | 280 g, 60 f |
| 5 | Glowworm Terraces | 28 | Ignivor, Infernokai, Infernox, Pyrophoenix | The Lantern Wyrm (Ignivor 31) | **Ember Canopy** | 1,400 g, 280 f, 10 gems, Blaze Fang | 300 g, 65 f |
| 6 | Twin Shrine | 30 | Aurelith, Eclipsar, Lumi III, Voltar III | The Dawn Warden (Aurelith 33, Light ↔ Dark) | **Twin Eclipse** | 1,600 g, 300 f, 12 gems, Eclipse Orb | 320 g, 70 f |
| 7 | Canopy Walk | 31 | Stormbringer, Pyrophoenix, Lumi III | The Canopy Squall (Stormbringer 34) | Gale Force | 1,800 g, 330 f, 10 gems, Gale Plume | 340 g, 75 f |
| 8 | Moonwell | 33 | Aquaflora III, Voltar III, Oceanfang, Eclipsar | The Moonwell Serpent (Aquaflora III 36) | **Tidal Hymn** | 2,000 g, 360 f, 12 gems, Moon Pearl | 360 g, 80 f |
| 9 | Choir of Roots | 34 | Aimza III, Sylvaneer III, Terraflora III, Zeep III | The Third Voice (Aimza III 37) | Resonant Collapse | 2,300 g, 400 f, 15 gems, Chorus Shell | 380 g, 85 f |
| 10 | Elder Root | 36 | Sylvaneer III, Terraflora III, Calyxar, Aimza III | **The Forest Crown** (Sylvaneer III 39, Island Boss, barrier ×2) | **Crown of Thorns** | 4,000 g, 600 f, 30 gems, Elder Guard | 450 g, 90 f |

- Structure as on Starter Island: four sections (battles 1–3, 4–6, 7–9, the guardian) with one-time section rewards
  and a rest; battle 9 rehearses the guardian's move (the 17B herald); every win is saved; a defeat resumes at the
  battle that was lost; a cleared dungeon can be replayed from battle 1 or from its guardian (a guardian-only replay
  pays its battle, not the clear reward or item roll, as before).
- Levels: rec−3, rec−3, rec−2 | rec−2, rec−1, rec−1 | rec, rec, rec | guardian rec+3 (19 to 39, cap 40).
- Unlocks: Dungeon 1 when the island is reached, each next one when the one before is cleared. The island entrances
  (Phase 18B) now open in that order; the Dungeons screen gains a Verdant Wilds tab.
- First-clear items are existing items that had no source yet. All other one-time rewards follow the existing rules
  (paid once, never on replays).
- 3D battles reuse the Starter arena whose setting fits (Mossgate → Forgotten Road, Aqueduct and Moonwell → Drowned
  Steps, Spore Hollow → Reliquary, Archive → Gathering Hall, Terraces → Cold Kiln, Twin Shrine → Lantern Orchard,
  Canopy → Windworn Stair, Choir → Resonance Scar, Elder Root → Heartwood). Each dungeon has its own new 2D battle
  backdrop (normal and guardian room) in the Verdant palette, built from the existing backdrop parts; the story scenes
  use them too.

## 3. Balance (automated simulation)

- **Island foe tier**: every Verdant foe has ×1.20 health and ×1.12 attack (tuned from the 18A starting point of
  ×1.15 / ×1.10), with per-dungeon tuning on top (`tune` in `campaign-data.js`; log in `docs/audit18c/tuning.md`).
- **Thresholds** (lowest level clearing first try in half the runs, balanced trio, tactical): 22, 24, 24, 25, 26, 29,
  29, 31, 32, 35 against recommended 22, 24, 25, 27, 28, 30, 31, 33, 34, 36: one or two levels per dungeon, no spike.
- **Moonwell**: with the 18A values it jumped four levels over the Canopy Walk (28 → 32) while the Choir after it was
  easier (31). Guardian health ×1.75 → ×1.60, Tidal Hymn 78 → 74 and the dungeon at ×0.88 bring it to 31, between
  its neighbours (29, 32).
- **Campaigns from realistic end-of-Starter-Island saves** (3 seeds each):

| Profile | Arrives at D1 | Ends at | Losses (whole island) | Replays forced | Battle time | Slack over threshold |
|---|---|---|---|---|---|---|
| Rarely fed | 22.0 | 34.7 | 0.3 | 0 | ~54 min | −1.7 to +2.0 (lowest at the Island Boss) |
| Fed regularly | 25.0 | 39.3 | 0 | 0 | ~46 min | +2.7 to +5.0 |
| Prepared (moves Lv 4, gear) | 25.0 | 39.6 | 0 | 0 | ~34 min | +2.7 to +5.3 |

- **Strategy matters**: at the recommended level, tactical play and the game's auto-battle clear every dungeon
  (94–100%); always using the first damaging move clears almost none (0–19%). Guardians alone: basic play wins
  0–96% depending on matchup (the Forest Crown 0%).
- **Elements matter**: with other trios the easiest dungeons change (for example Umbrit/Gaiaroki/Sylvaneer finds the
  Aqueduct and Moonwell easy and the Elder Root hard).
- Global XP formula, evolution levels (12, 22) and the level cap (40) are unchanged.

## 4. The seven new charged moves

All use the existing guardian framework: telegraphed a turn ahead with a warning banner and a log line, three
quarters blocked by a guard, broken by a stun while charging, held back a turn by soak. No new combat systems.

| Move | Guardian | Element | Effect | Counter |
|---|---|---|---|---|
| Floodgate | Sluice Warden | Water, 74 | soaks (2 turns) | guard; a heal clears soak |
| Spore Bloom | Spore Mother | Nature, 70 | lowers attack | guard; a heal clears a stack |
| Archive Seal | Archivist | Metal, 70 | silences specials (2 turns) | guard; basic moves still work; a heal clears it |
| Ember Canopy | Lantern Wyrm | Fire, 72 | burns (3 turns) | guard; Water; a heal clears burn |
| Twin Eclipse | Dawn Warden | Light, 84 | never resisted (the Warden shifts Light ↔ Dark) | guard |
| Tidal Hymn | Moonwell Serpent | Water, 74 | a slow, heavy wave | guard; Nature |
| Crown of Thorns | Forest Crown | Nature, 90 | heavy hit, with a two-step barrier | guard; specials crack the barrier |

- No Verdant guardian's move can fell a full-health Amina at its recommended level in one hit, even unguarded at its
  highest roll (Floodgate, Ember Canopy and the Moss Bastion's Root Crush were lowered for this). Average unguarded
  hits take 29–69% of a member's health; guarded, 7–17%.
- The challenge system (Flawless, One element, Answer the guardian) applies to all ten automatically; tested on a
  Verdant replay.
- **Investigated, not implemented:** counting a guardian knocked out while charging as answering it. That happens in
  52% of all guardian wins, including plain basic-move play, and would have passed the challenge in 31% more wins with
  no deliberate response (up to 72% on the Windworn Stair). It would trivialise the challenge.

## 5. Story

Seven scenes, each 27–40 seconds, played by the existing scene player; scenes grant nothing (the rules pay first):

1. **Mind the Roots** — arrival (once; also for saves that reached the island before 18C).
2. **Filed Correctly** — after the Ivy Archive: the tablets name “the Keepers of the Crossing”.
3. **In Time** — after the Canopy Walk: the Dormant Spire pulses in time with the stones.
4. **The Third Voice** — after the Choir: a third note, neither light nor shadow. “Don’t answer it.”
5. **The Broken Panel** — after the Twin Shrine: the two starters guarding a door together, the next panel smashed;
   a pale and a dark Kind Soul each blame the other's side; nothing confirms either.
6. **Shut from the Inside** — the first time you enter the Elder Root: the stag from the Heartwood has grown.
7. **What It Was Keeping** — after the Forest Crown: “It wasn’t keeping you out. It was keeping something in.”
   Obsidian Reach is seen but “not ready for visitors”; the Entity's line to a shard of the smashed panel names no one.

The Entity stays dry and dismissive and calls the player Kind Soul. The third force is never identified.

## 6. Twin Shrine gift

- Offered after the Twin Shrine's first clear (its sheet opens by itself after the scene, and the shrine on the
  island keeps offering it): the second form of the starter you did not choose, at level 26: Umbrit II (Duskmantle)
  for a Lumifern player, Lumifern II (Solarbloom) for an Umbrit player.
- Optional, once (`st.v18.gift`). Your starter and starter choice are untouched; collection and Codex records are
  kept and gain the new form.
- Already own it: 40 Essence of its element and 8 gems instead. No room (60 Aminas): nothing is claimed; it waits.
- Older saves without a recorded starter are judged by the starter line they own.
- Not needed for the campaign: Dungeon 7 opens either way.

## 7. Explore

| Area | Opens | Finds (befriend level) |
|---|---|---|
| Glowcap Glade | on arrival (approved) | Terraflora II, Sylvaneer II, Berrant (18) |
| Streamside | Drowned Aqueduct cleared | Aquaflora II, Tidalong, Reefback (20) |
| Canopy Edge | Canopy Walk cleared | Aeolus, Pyro-Hawk, Stormbringer (24) |

Each find happens once; afterwards exploring gives the usual small amounts. Areas are listed only once the island is
reached; locked ones say which dungeon opens them.

## 8. Quests

Ten main quests after Beyond the Shallows (one per dungeon, rewards 400–1,500 gold plus gems or food), and three
side quests (Older Than the Moss: Lv 30; Older Than the Trees: Lv 35; Terrace by Terrace: three Mossgate sections).
They use existing objective types (dungeon clear, dungeon section, creature level), so progress, navigation and
claim-once behaviour are the existing, tested ones. The Dark Shore and Above the Clouds stay hidden.

## 9. Environment

- **Verdant ground palette**: deeper jungle greens, dark loam paths, moss-grey stone, pale shell sand and green-teal
  water (after `BIOMES.verdant`), swapped in only while the island's ground is built. Colours only: no extra draw
  calls, materials or effects (sampled ground: Starter rgb(68,120,33) vs Verdant rgb(38,103,42)).
- The 18B landmarks keep their glows (Archive, Twin Shrine lights, Choir, Elder Root).

## 10. Stability

- Found by the regression and fixed: the gift button used an icon name with no artwork (`gift` → `spark`), and the
  Verdant dungeons first reused Starter backdrops, which broke the rule that every dungeon has its own (now ten new
  ones).
- 18B's graphics-memory fix holds: 40 Starter ↔ Verdant round trips leave GPU geometries, textures, page nodes and
  heap flat; asserted in both browser tests.
- **Fixed: the frame-rate checks (`browser-perf-fix`).** In failing runs the page's light frames arrived every ~50 ms
  and the display-rate estimate snapped them to “a steady 20 fps screen”, so a struggling device was judged on
  budget (one resolution step instead of four, no Battery saver). The estimate no longer snaps to 24 or 20 fps; the
  slowest browser cap it recognises is 30 fps (Low Power Mode, in-app browsers). `stability18c.test.js` covers it.
- **Fixed: a finished story scene blocked the next pending scene for the rest of the session** (`UI.sceneBox` was
  never cleared). Found because the Twin Shrine scene would not play after the arrival scene.
- **Not fixed, diagnosed:** `browser-intro14`'s arena-camera check samples a 1.6 s real-time camera intro from the
  test process; under heavy load the sample lands after it ends. `browser-env12`'s occlusion check waits a fixed 3 s
  for a paced occlusion pass that can lag under load. Both are test timing, not product faults; changing either
  check needs approval (it would mean waiting longer or checking differently).
- **Final full regression: 2,020 passed, 1 failed** (`browser-dev8` pixel-burst removal, a fixed 1.1 s wait; passed in
  two reruns; new intermittent). The 18B intermittent checks (frame rate, Hatchery occlusion, battle-intro camera),
  Forge close and island animation all passed. Details: `docs/audit18c/regression.md`.

## 11. Saves

- New fields: `st.v18.gift` (only once claimed). Verdant dungeon records use the existing `st.dungeon` and
  `st.campaign.bosses`; quests use existing records.
- A Phase 18B save loads with its visits and Dungeon 1 open; a Phase 17 save that reached the island starts the
  campaign at Dungeon 1. Clears, unlocks, runs in progress and progress survive save/load (tested).
- A save that beat the Verdant boss while Obsidian Reach is not ready gets Obsidian Reach on load once it is marked
  ready (no migration).
