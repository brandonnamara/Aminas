# Phase 20C — Final Campaign & Main Story Conclusion

Branch `p20c-celestial-campaign` (from the latest Phase 20B commit). Production `main` is untouched. The Phase 16A
opening stays off by default. No physical iPhone was used. Every result below comes from automated simulation or from
headless Chromium with software WebGL; the two are reported separately.

**Review page:** https://claude.ai/artifact/JuPjQhnRVrqwKGMoF23f3T · **Development preview v50 (Aminas UI 8):** https://claude.ai/artifact/ShbtpoFoauudCMFtMCfogK

## What changed

The Celestial Crown is now a live island. The Forge Heart opens it. It holds ten dungeons of ten battles each, and The
Two Keys end the main story with Ending A, the Keepers' Door. After that, play continues as before. The campaign records
that it is complete, and that the save is eligible for Resonance Mastery. Mastery itself is not implemented.

| Area | Files |
|---|---|
| Battle engine: staged boss (`stages`), equal-health option, stage events | `src/rules.js`, `src/essence.js` |
| Campaign data: ten dungeons, 15 moves, The Two Keys | `src/campaign-data.js` |
| Activation, gates, legacy purchase, retired developer preview, Keeper's Emblem | `src/celestial20b.js` |
| Story, Watcher's Lens moment, completion state, quests | `src/celestial20c.js` *(new)* |
| Completion screen and marks, door scene, observatory buttons | `src/ui-celestial20c.js` *(new)* |
| Stage II banner, light change, boss-scale swap, two-portrait card, music | `src/ui2.js`, `src/ui-combat.css`, `src/audio.js` |
| 3D Keeper lighting; ten arena variants | `src/3d/runtime.js`, `src/3d/arenas.js` |
| 2D backdrops (ten dungeons and the empty mount) | `src/dungeon-art.js` |
| Orrery Wheel arms (separate model) and their slow turn | `src/3d/library/celestial.js`, `src/vox-island.js`, `src/3d/island3d.js` |
| Emblem icon | `src/ui-forge.js` |
| Sheet input-lock marker (`data-input-ready`) | `src/ui-obsidian19b.js`, `src/ui-celestial20b.js` |
| Kept-in-place buildings on an island the save owns but cannot visit yet | `src/world.js` |

## Activation and saves

- **New save.** The Forge Heart unlocks the Celestial Crown (`by: 'boss'`, +40 rank XP once), and the level cap stays 60.
  Dungeon 1 opens; the other nine open in order.
- **Older eligible saves.** A save whose Forge Heart fell before this build gets the Crown on load, once. Loading it again
  changes nothing, so there is no second unlock and no second reward.
- **Early-build purchase (bought with gold).** The ownership record, cleared obstacles and buildings are kept exactly.
  *Decision:* the island counts as open only once the Forge Heart has fallen, so no save skips the three islands before
  it. Until then, the save loads on its latest open island. Buildings stay where they were (they are not moved to
  Starter Island). When the Forge Heart falls, the island opens with everything as it was, and no second rank reward is
  paid.
  This is stricter than Obsidian Reach, where an old purchase simply travels there; the brief asked that nothing bypass
  progression.
- **20B preview unlocks** (`by: 'preview'`). If the Forge Heart has fallen, the unlock becomes a normal one. Otherwise it
  is removed on load, and records are kept.
- **No developer shortcut.** `C.dev` is frozen and inert, and `C.devHabitat()` returns false. The panel's remaining
  button only travels on a save that opened the island normally.
- **Map and obstacles.** All 62 obstacles and 566 buildable cells are unchanged; the 20B fingerprint checks still pass.
- **Forged records are ignored.**
  - A dungeon counts as cleared only through the whole chain: the Forge Heart, then every earlier Celestial dungeon.
  - A forged completion state is removed on load.
  - A forged run inside an unfinished dungeon is dropped.

## Ten dungeons × 10 battles

| # | Dungeon | Rec. | Guardian (battle 10) | Lv | Charged move | Mechanic | First clear | Gear | Story |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Cloudstair Landing | 48 | The Stair Warden (Zephyr III) | 51 | Updraft | — | 2550g / 480f / 12 gems | Dawn Charm | after-line |
| 2 | Starfall Terrace | 49 | The Shard Gardener (Lumifern III) | 52 | Starfall | — | 2750g / 500f / 12 gems | Moonstone | Four Points |
| 3 | The Orrery Wheel | 50 | The Orrery Keeper (Zeep III) | 53 | Orrery Turn | prism | 3000g / 530f / 12 gems | Ironbound Club | after-line (the wheel turns) |
| 4 | Cloud Sea Cistern | 51 | The Mist Serpent (Kairyu III) | 54 | Cloudburst | steam field | 3200g / 550f / 14 gems | Reef Plate | after-line |
| 5 | The Lens Gallery | 52 | The Focal Lantern (Lumi III) | 55 | Focal Ray | echo | 3450g / 580f / 14 gems | Basalt Mail | The Empty Mount (grief) |
| 6 | The Hall of Two Doors | 53 | The Dusk Steward (Umbrit III) | 56 | Twin Dusk | prism | 3900g / 620f / 16 gems | Inferno Fang | Two Cups |
| 7 | The Chart Room | 54 | The Hour Clerk (Zeep III) | 57 | Hour Seal | barrier | 4250g / 660f / 16 gems | Worldsplitter | The Torn Page |
| 8 | The Bell Loft | 55 | The Cracked Bell (Aimza III) | 58 | Bell Toll | echo | 4600g / 690f / 16 gems | — (opens the Starwell Habitat) | The Great Sound |
| 9 | The Shadowed Dome | 56 | The Night Curator (Voltar III) | 59 | Umbral Hush | — | 5050g / 750f / 18 gems | Feather Token | The Bare Plaster |
| 10 | The Threshold | 57 | The Light Key (Lumifern III) → The Shadow Key (Umbrit III) | 60 | Keeper's Dawn / The Closing Door | barrier ×2 | 8000g / 1150f / 50 gems | **Keeper's Emblem** | The Keepers' Door (Ending A) |

- Every foe is an existing, non-legendary species, in the form its level calls for. No new legendaries.
- The foe tier is Obsidian's: ×1.3 health and ×1.18 attack. The two approved adjustments are kept: Starfall Terrace and
  the Cloud Sea Cistern, which also keeps its steam field. There is no dynamic scaling.
- Dungeons save after every battle, as before. You can retry and replay. Battle 9 heralds the guardian's move. Every
  gate shows its recommended level. First-clear and repeat rewards work as on every island. Replay challenges carry
  over.

## Guardians and The Two Keys

- **Charged moves.** Each guardian has its own warning a turn ahead, its own name and element, and a description that
  names the counter. They work with guard, stun and soak as before, and a guard blocks ¾ of a charged hit (the
  guard-priority rule is unchanged).
- **Worst single charged hit** on a fresh member of the trio at the recommended level (simulated): **64%** unguarded
  (Mist Serpent's Cloudburst into a Fire member) and **16%** guarded. No unavoidable instant defeat.
- **The Two Keys.** One battle with two stages:
  - Stage I: **The Light Key** (Lumifern III, Keeper's Dawn).
  - Stage II: **The Shadow Key** (Umbrit III, The Closing Door). It steps in already charging.
  - Both are at boss scale (1.7), and each raises a barrier at half health. They are the door's manifestations, not the
    starters; the encounter card says so.
  - The team carries its health from Stage I into Stage II. A Stage II defeat records nothing: the next attempt starts
    at Stage I, both Keys at full health (no checkpoint).
  - **Presentation:**
    - a two-portrait encounter card with one line per stage;
    - a "Stage II of II · The Shadow Key" banner, with a key-turn sound;
    - the arena light tweens from the Light Keeper's gold to the Shadow Keeper's violet;
    - the music shifts darker (finale → finale2), and the boss camera plays again;
    - the win banner reads "The door is still".
  - **Accessibility:** with Reduce Motion the banner is brief, the light changes instantly and the camera does not move.
  - **The five 20B issues, resolved:** staged spec in `createBattle`; boss-scale swap; stage wording (no PvP); a
    two-portrait card; essence for both stages (Light, then Dark).
  - **Equal health, then tuned.** Both start with equal health (`equalHp`, the Light Key's). The simulation justified one
    adjustment: both stages now have ×0.95 health. See "Level simulations" for the reason and the result.

## Story: Ending A, the Keepers' Door

The ending is played after the first Threshold clear, preceded by "The Threshold" (`c_door`) on first entry. It tells:

- **The door's purpose.** The Crossing: a way between here and somewhere else, with a door on it, "so nothing came
  through that had not been asked".
- **The two keys.** "One was never trusted to decide alone. A pale one, a dark one. It took both to open it and both to
  shut it."
- **How the conflict developed.** "Someone was refused a key, and leaned on the door anyway. It held. It cracked. Down
  the middle." (Who this was is not said.)
- **Why each side blamed the other.** Each Keeper held their own side, felt the other side give, and was sure the other
  had let go. "Each was half right: the door had." Both versions are on the Twin Shrine.
- **How the player completes the repair.**
  - The Forge's repair order was "requested by both keys". The door needs "someone who belongs to neither side… who is
    not from here, and was asked in".
  - The player's starter stands in its own hollow. The other starter line takes the other hollow: the player's own if
    owned, otherwise a small one that steps out of the door and goes home afterwards.
  - The player puts a hand on each half, and the crack closes.

The rest of the brief's story constraints:

- **Both starters take part** whichever was chosen, owned or not, and the Twin Shrine gift is not required.
- **The player stays an outsider.**
- **The Entity** keeps his voice and says "Kind Souls".
- **Concluded, not a cliffhanger.** "Nothing has to happen. That is rather the point of a door that works."
- **Not revealed:**
  - the third party's identity, the full Emergence, the Entity's origins, Starter Island's origin, or the presence
    beyond the world;
  - two draft lines were rewritten for this (see Decisions), and the canon guard (`tests/campaign.test.js`) passes.
- **Grief scene (`c_mount`).** It plays after the Lens Gallery: six beats, with "I left that here. I meant to come back."
  as an Entity line, and no exposition.
- **Watcher's Lens (optional).**
  - The Lens is recognised whether equipped or in the bag, and is never consumed. It gives no stats or advantage, and it
    remains the Survival wave-20 reward.
  - It is available once the mount scene has played, after completion included, from the observatory sheet ("Hold the
    Watcher's Lens to the mount"). It can be repeated.
  - The scene adds no new mystery: "Oh. So that is where it went… Keep it. Look at things."

## Keeper's Emblem

**Keeper's Emblem**: a charm with HP +6%, DEF +8%, ATK +3% and SPD +2%. Mythic and unique, it is given once, by the first
Threshold clear. Flavour text: "Two keys. One purpose." Its 12×12 icon is gold and silver with an amethyst crystal and
interlocking Light and Shadow halves. There is no new slot, and it does not duplicate the Lens's stats. A second copy
becomes 400 gold (`dupGold`), as for every unique item.

| Charm | Rarity | Bonus | Total | On a Lv 60 Lumifern III |
|---|---|---|---|---|
| Watcher's Lens | mythic | +6% all | 0.24 | +38 HP, +9 ATK, +9 DEF, +7 SPD |
| Eclipse Orb | epic | HP 12%, DEF 7% | 0.19 | +76 HP, +10 DEF |
| **Keeper's Emblem** | mythic | HP 6%, DEF 8%, ATK 3%, SPD 2% | **0.19** | +38 HP, +4 ATK, +11 DEF, +2 SPD |
| Moon Pearl | rare | HP 10%, DEF 6% | 0.16 | +64 HP, +9 DEF |
| Choir Shell | epic | ATK 8%, SPD 8% | 0.16 | +12 ATK, +9 SPD |

**No adjustment.** The approved values put the Emblem level with the best epic charm and below the Lens. It is an
all-round endgame keepsake, not a power step, so nothing is invalidated (`tools/p20c-emblem.js`,
`docs/audit20c/emblem.json`).

## Completion state

- **What is recorded.** The first chain-valid Threshold clear sets `st.c20.done` (a timestamp) and
  `st.c20.mastery = 'eligible'`, the flag for a future Resonance Mastery phase; nothing reads it yet.
- **The completion screen.** It shows once, after the ending: islands mended, 40 of 40 campaign dungeons (400 battles),
  kinds befriended, and the Emblem. It is then cleared.
- **After the ending.** The island map and the Journal show "Main story complete", with a Summary button. Every
  dungeon, quest and mode stays playable.
- **Replays.** A Threshold replay pays no first-clear reward, sets no second completion and gives no second Emblem.
- **Not added:** Mastery, Starlight, a new resource, or advanced challenges.

## Starwell Habitat, Explore, quests

- **Starwell Habitat.**
  - It opens with Dungeon 8 (the Bell Loft), chain-validated: a forged Bell Loft record does not count.
  - At most four per island, at the existing habitat rates; a Resonance resident earns 50% more (the existing affinity
    rule). There is no developer access.
- **Explore areas.** Each opens with its dungeon (1, 4 and 7):

  | Area | Second-form finds | Rare third form (joins at level) |
  |---|---|---|
  | Cloud Shelf | Zephyr II, Lumi II, Pyro-Phoenix II | Zephyr III (48) |
  | Moonbloom Beds | Aquaflora II, Terraflora II, Acinus II | Acinus III (51) |
  | Star Shard Field | Aimza II, Zeep II, Voltar II | Voltar III (54) |

  - The rare roll is the existing one: once a day, guaranteed by the 8th day, once ever. A reload or turning the clock
    back does not roll it again (tested).
  - Every species is already in the Codex and the habitats.
- **Main quests.** Ten (`m_c1`–`m_c10`, after Heart of the Forge); the last is the main story's finale.
- **Side quests.** Nine:
  - levels 55 and 60;
  - Cloudstair sections;
  - build and upgrade a Starwell Habitat;
  - clear ten Celestial obstacles;
  - build a Berry Farm on the Crown;
  - Third Note (every Aimza form);
  - Starchart (all 57 non-legendary species).
- **How quests behave.**
  - Every objective has a hint and uses an existing objective type.
  - Quests are retroactive: a save that finished the dungeons first can claim all ten, once each.
  - The existing "Above the Clouds" quest keeps its reward and gains hints.
- Daily tasks and the Codex are unchanged.

## Battle environments

- **3D.** Ten arena variants (`celestialArenas()`), each a recolour kit over an existing arena: moonstone and slate,
  brass, periwinkle, with its own light, fog and particles. No new geometry.
  - The Hall of Two Doors and the Shadowed Dome share a base (Hollowveil) but differ in tint, accent, mood and light.
  - The Threshold's rim light does not cycle; it follows the Keepers' light instead.
- **2D.** Ten new 2D backdrops, plus the empty mount for the grief scene, in `dungeon-art.js`. The 2D fallback is kept
  and tested with The Two Keys, including the stage change.

## Orrery animation

The Orrery Wheel's arms are now a separate small model (`c_orrery_arms`): a brass ring and four spokes, one bent. They
were removed from the merged landmark. Once the Orrery Wheel dungeon is cleared, they turn about the bronze sun at
0.18 rad/s. Before that they are still, matching the site text "It has not turned in a very long time".

How it runs:

- **Cost.** It is driven only by the island's existing ambient tick. It sets one rotation, creates no geometry and casts
  no shadow.
- **When it stops.** It stops with that tick: on a hidden page or app, at rest, for Reduce Motion, for Battery Saver,
  and on slow devices (the long-standing guard). Camera and navigation are unchanged.
- **Measured** (browser, fresh pages):
  - it turns 0.288 rad, then the software renderer trips the slow-device guard, which stops all ambient motion;
  - it stays at 0 with Reduce Motion, with Battery Saver, and before the dungeon is cleared;
  - the geometry count does not change.
- No regression was found, so the animation is kept.

## browser-obsidian19c timing fix

- **The race.** The test tapped 300 ms after the sheet opened, but the sheet ignores taps for 400 ms (so the tap that
  opened it cannot press a button).
- **The fix.** The sheets now mark `data-input-ready` when that lock ends (`ui-obsidian19b.js`, `ui-celestial20b.js`).
  The game's lock is unchanged, still 400 ms.
- The test waits for the marker (condition-based) and keeps its assertion. The 20C browser suite uses the same wait.
- **Results.** Run 3 times on its own with 19/19 each time, and again inside the full regression (see Regression).

## Level simulations

- **Method.** `tools/p20c-sim.js` runs the real game data, played by the 17C agent under the real cap (40 → 50 → 60). It
  is a rule-level simulation with scripted policies: not gameplay, and not an iPhone.
- **Data files** (in `docs/audit20c/`):
  - `sim.json`: the tuned version;
  - `sim-untuned.json`: before the Two Keys' ×0.95.

**All 100 battles at the recommended level (balanced trio).** Tactical play wins every one 100% of the time. Basic
attacks only, with no guards: every non-guardian battle 100%; guardians 5–85%; The Two Keys 0%.

**First-try threshold** (lowest level that clears a whole dungeon in ≥ 8 of 16 runs):

| Dungeon | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Recommended | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 |
| Threshold | 44 | 47 | 46 | 49 | 50 | 52 | 52 | 53 | 55 | 57 |

Whole-dungeon clear rate at the recommended level:

- tactical and auto-battle: 100% everywhere except the Lens Gallery (92%) and the Threshold (75%);
- basic attacks: 0–17%.

**Campaigns from realistic arrival saves:**

| Profile | Arrives | Ends | Losses | Grind replays | Minutes |
|---|---|---|---|---|---|
| Rarely fed (tactical) | 44.1 | 53.3 | 9 | 3 | 86 |
| Fed regularly (tactical) | 50.7 | 60 | 0 | 0 | 49 |
| Fed regularly (auto-battle) | 50.7 | 60 | 0 | 0 | 49 |
| Highly upgraded | 51.0 | 60 | 0 | 0 | 39 |
| Thorough completionist | 57.7 | 60 | 0 | 0 | 37 |
| Fed regularly, basic attacks only | 50.7 | 60 | 28 (16 on The Two Keys) | 12 | 167 |

Controlled arrivals at party level 47, 50, 55 and 60: 0 losses, 0 grinding, every dungeon cleared (54 / 51 / 46 / 43
minutes).

**Tuning decision (the only one).** With equal health ×1.0, a basic-attack player at the cap won The Two Keys 10% of the
time, against the Forge Heart's 28% at its cap. With both stages at ×0.95 (still equal health), the rate became 28%,
which is parity. Tactical play at level 57 is still 100%. The basic-attack campaign fell from 23.5 to 16 losses on the
final boss.

**Accepted as is (documented):**

- **Basic-attack-only play.** It still needs replays on the final boss: two charged moves in a row cannot be ignored, by
  design.
- **Rarely-fed saves.** They arrive at 44, below the brief's lowest arrival of 47, and needed 3 replays.

## Four-island integration

`tests/celestial20c.test.js` (rules) plays the whole sequence on a new save: Starter Island → Verdant Wilds → Forest
Crown (cap 50) → Obsidian Reach → Forge Heart (cap 60) → Celestial Crown unlock → Starwell Habitat → The Two Keys →
Keeper's Emblem → completion → continued play. Save export and import are exact at nine milestones. A legacy save
(Obsidian done in an earlier build, Umbrit starter) repeats it from the Crown's opening to completion.
`tests/browser-celestial20c.test.js` plays the Celestial half in the browser.

## Performance (headless Chromium, software WebGL — relative only, no iPhone claim)

Source: `docs/audit20c/perf.json`, from `tests/browser-celestial20c.test.js`. These figures come from Chromium + SwiftShader
at 844×390, so they are useful only to compare the islands with each other; they say nothing about iPhone performance.
No threshold was raised.

**Islands** (3D voxel island, after load; camera move = six focus moves across the island):

| Island | Load ms | Draw calls | Triangles | Geometries | GPU MB | Heap MB | Idle p50/p95 ms | Camera move p50/p95 ms |
|---|---|---|---|---|---|---|---|---|
| Starter Island | 2396 | 77 | 145,853 | 136 | 34.7 | 115 | 16.7 / 16.7 | 450 / 667 |
| Verdant Wilds | 3371 | 85 | 152,204 | 232 | 47.5 | 134 | 16.7 / 16.7 | 550 / 633 |
| Obsidian Reach | 1777 | 68 | 117,770 | 271 | 41.9 | 112 | 16.7 / 16.7 | 450 / 500 |
| **Celestial Crown** | 1912 | **44** | 126,578 | 298 | 42.7 | 151* | 16.7 / 16.7 | 383 / 467 |

\*The heap figure is for the whole page, measured in sequence after the story, the battles and the other islands.
Garbage-collection timing varies, so it is not a per-island cost.

The camera-move times are software rendering of continuous camera moves; the Crown is the cheapest of the four.

**Quality tiers** (draw calls / triangles; every frame time was 16.7 ms p50):

| Tier | Starter | Verdant | Obsidian | Celestial |
|---|---|---|---|---|
| High | 50 / 130,199 | 62 / 138,188 | 45 / 108,068 | 26 / 118,130 |
| Balanced | 50 / 127,409 | 62 / 135,548 | 45 / 105,560 | 26 / 114,968 |
| Battery Saver | 50 / 77,548 | 62 / 78,088 | 45 / 63,814 | 26 / 72,220 |

**Island Boss battles** (3D; load = tap Fight → first turn ready):

| Battle | Load ms | Draw calls | Triangles | Geometries | Textures | p50/p95 ms | Heap MB |
|---|---|---|---|---|---|---|---|
| Starter: Heartwood | 2545 | 34 | 25,352 | 52 | 7 | 83 / 100 | 108 |
| Verdant: Elderroot | 2403 | 34 | 27,588 | 55 | 7 | 83 / 100 | 117 |
| Obsidian: Forge Heart | 2281 | 36 | 25,978 | 59 | 7 | 100 / 117 | 113 |
| **Celestial: The Two Keys** | 2257 | 35 | 26,642 | 58 | 7 | 83 / 100 | 118 |

**Stress runs:**

- **The two-stage transition.** It takes 5.4 s from the finishing tap to Stage II ready. That covers the attack, the
  faint, the banner, the boss-scale swap and the 1.7 s boss camera. With Reduce Motion it is shorter: no camera, and a
  brief banner.
- **Repeated transitions.** Sixteen island changes (four full four-island rounds) averaged 2.2 s each, and geometries,
  textures and page nodes did not grow. The 20B suite's six Obsidian ↔ Celestial round trips also held steady in 3 of 4
  runs. One run inside the full regression showed +1 geometry (122 → 123), which was not reproduced in three standalone
  runs. It is reported, not explained.
- **Extended battle session.** Twelve battles back to back, two of them with the Two Keys' stage change, ended with the
  3D runtime's geometries, textures and templates unchanged (36 / 3 / 12 before and after).
- **2D fallback.** With 3D creatures off, The Two Keys plays on its 2D backdrop and the stage banner still shows.

## Save and reward integrity

- **One-time rewards, paid once:**
  - first-clear gold, food, gems and gear for each dungeon;
  - the Keeper's Emblem;
  - the island unlock (+40 rank XP);
  - quests (claiming twice pays nothing);
  - the completion state.
- **Checked against replays and reloads:**
  - replays and reloads change nothing;
  - a Stage II defeat records nothing;
  - battle-by-battle progress survives a reload.
- **Forged data ignored:**
  - clears out of order;
  - a forged completion state;
  - a forged run;
  - a 20B preview unlock without the Forge Heart.
- **Legacy saves:**
  - a bought Crown keeps its record and its buildings, in place;
  - an earlier-build Forge Heart opens the Crown once;
  - the 20B `c20` record is cleaned. The kept keys are `seen`, `done`, `mastery`, `celebrate` and `lens`.
- **Export and import.** Exact at every milestone of both journeys.

## Regression

**Final full run** (`node tests/run-all.js`, after the fixes below): 73 suites, **2890 passed, 0 failed**, in 65 minutes.
The log is `docs/audit20c/regression.txt`. That count includes:

- the two new suites: `celestial20c` (161, rules) and `browser-celestial20c` (42, browser);
- the browser-obsidian19c timing fix (19/19).

**The first full run** (before the fixes) had 2887 passed and 3 failed. All three are fixed or explained:

1. **browser-verdant18b.** It still expected a legacy Crown purchase to show "Not ready". Under the 20C rule it shows
   "Defeat the Island Boss of Obsidian Reach", still with no Travel button. The assertion was updated to the new rule.
2. **browser-polish19d.** The hidden-page check found four running transitions. They belonged to the Heart of the Forge
   story scene, which now starts later, because the Forge Heart's Celestial unlock notice is queued first. This was
   confirmed against the 20B commit, where the suite passes 34/34. The test now finishes any story scene before hiding
   the page. The island-animation assertion is unchanged.
3. **browser-celestial20b.** Its Obsidian ↔ Celestial round trips showed +1 geometry (122 → 123). Three standalone runs
   and the final full run held steady at 122. This is reported, not explained.

**The browser-obsidian19c timing fix.** The suite passed 19/19 in each of 8 runs: 6 standalone and 2 inside full
regressions.

**Simulated versus browser-verified:**

- **Simulated (rule level):**
  - the 100 battles;
  - the guardians' hits;
  - campaigns and arrivals;
  - the Emblem's stats;
  - the four-island journey with save export/import;
  - the rare-roll protection.
- **Verified in the browser (headless Chromium, software WebGL):**
  - the arrival, the gate and the Dungeons screen;
  - ten arenas;
  - nine guardian warnings;
  - The Two Keys: card, stages, light, defeat, retry, win;
  - the ending, the completion screen and its marks;
  - the grief scene and the Lens moment;
  - the orrery;
  - performance and the 2D fallback.
- **Not done:** physical iPhone testing, and manual play by a person.

## Decisions

1. **An early-build gold purchase of the Crown waits for the Forge Heart.** Its records and buildings are kept, in place.
   (See Activation.)
2. **The Two Keys: equal health, both ×0.95.** The simulation justified it; see Level simulations.
3. **The Keeper's Emblem's values are unchanged.** It sits level with the best epic charm and below the Lens.
4. **Two story lines were rewritten for canon:**
   - "came from outside" became "is not from here", because the canon guard forbids "came from";
   - "They are not your friends' shapes" became "They are not the Aminas you know". The canon guard reserves "friends"
     for the starters' past, which is shown, never explained;
   - an Entity reply that implied a past among people ("Most of them are doors now") became "I knew the door. Doors are
     easier to know than people."
5. **The Hall of Two Doors and the Shadowed Dome share a 3D base**, differently lit and tinted. That makes ten distinct
   variants without new geometry.
6. **New outputs in the battle event log.** The `foeIn` event now also carries the stage and the team's health, for
   tests and for the stage banner. A HUD bug that would have labelled the Keys' markers "2 foes left" instead of
   "Stage 1 of 2" was found by the browser test and fixed.
7. **Test assertions that described the "not live" state** (Phases 18B–20B) were updated to the new rule. No assertion
   was weakened:
   - the Crown opens through the Forge Heart;
   - the Dungeons screen offers only the next dungeon;
   - 48 items;
   - 40 campaign dungeons.

   The 20B prototype checks moved into the 20C suite, as checks against the real encounter.

## Limitations

- **No physical iPhone testing.** Frame times come from software WebGL in headless Chromium. They are useful only to
  compare the islands with each other.
- **The orrery's motion is measured only briefly.** In that renderer, ambient motion stops after a few seconds (the
  slow-device guard). On a fast device it continues.
- **Simulations are rule-level** and use scripted policies; real players vary.
- **Story and presentation timing** (banner, light change, camera) were checked by automated browser runs and
  screenshots, not by a person playing.
- **Resonance Mastery** is not implemented; only the eligibility flag exists.
