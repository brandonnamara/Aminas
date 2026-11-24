# Phase 19C — Obsidian Reach campaign

Review page: https://claude.ai/artifact/HsVEbwwoeDAn5mGQwhN7uU · Preview: v47 of the Aminas preview.

Branch `p19c-obsidian-campaign`, built from Phase 19B (`448b7bf`). Production `main` was not touched. The Phase 16A
opening is still off by default. **Nothing here was tested on a physical iPhone.** Every browser number comes from
Chromium with software WebGL (SwiftShader) at 844×390 in touch mode, so use it to compare, not as a device speed. Every
balance number comes from automated, rule-level simulation with scripted play policies (`tools/p19c-sim.js`). No manual
gameplay verification was done for this phase.

Design references: `docs/PHASE19A.md` (concept, story, ten dungeons, cap study) and `docs/PHASE19B.md` (the island).

## What a player can now do

1. Defeat the Forest Crown on the Verdant Wilds. Obsidian Reach opens and the level cap rises to 50, announced once.
2. Travel to Black Sand Landing. The island's existing lines play, unchanged: the unlock dialogue and the first-visit
   greeting. Then the new arrival scene, *Warm Stone*, plays once.
3. Clear ten dungeons in order, 100 battles in all:

| # | Dungeon | Rec. level | Guardian · charged move |
|---|---|---|---|
| 1 | Cinder Steps | 38 | The Cinder Warden · Ashfall |
| 2 | Glasswick Kilns | 39 | The Glassblower · Molten Glaze |
| 3 | Basalt Rookery | 40 | The Rookery Matriarch · Cinder Dive |
| 4 | Quench Pools | 41 | The Quenchwarden · Cold Quench |
| 5 | Deep Seams | 42 | The Lamp-Eater · Blackout |
| 6 | Mirror Gallery | 43 | The Dusk Warden · Night Glass |
| 7 | Magenta Hollows | 44 | The Lantern Below · Shatterlight |
| 8 | Charred Orchard | 45 | The Ashbloom · Ashbloom |
| 9 | Great Bellows | 46 | The Bellows Wind · Furnace Draught |
| 10 | Heart of the Forge | 47 | The Forge Heart (Island Boss) · Heart of the Forge |

4. Follow the story, which is told through scenes and short lines along the way (see Story below).
5. Defeat the Forge Heart (Pyro-Core III). That gives the first-clear reward, Night Mail and the Island Boss record, and
   raises the level cap to 60, announced once. The Celestial Crown stays closed because it is not ready.

## Files

| Area | What changed | Files |
|---|---|---|
| Activation | `D.ISLAND_LIVE.obsidian = true` and `D.O19.live = true`.<br>Old-build saves keep their unlock, buildings and cleared obstacles.<br>Saves whose Forest Crown fell before 19C get the Reach on load, once (its 40 rank XP once, however often the save loads).<br>A 19B construction-preview unlock without the Forest Crown is closed on load, keeping its records.<br>The developer shortcut now only travels on a save that opened the Reach normally. | `src/obsidian19b.js`, `src/ui-obsidian19b.js` |
| Dungeons | Ten entries `o_cinder` … `o_forge`, each with 9 battles plus a guardian:<br>• levels rec−3 … rec, guardian at rec+3; third forms of existing species only, no legendary foes<br>• four sections with clues and section rewards<br>• first-clear and repeat rewards (gems only on the first clear), an existing item on each first clear<br>• island tier ×1.3 HP / ×1.18 attack, then tuned per dungeon | `src/campaign-data.js` |
| Charged moves | The ten approved moves, using existing effects only:<br>• burn: Ashfall, Furnace Draught<br>• soak (chill, slower): Cold Quench<br>• silence: Blackout<br>• lowered attack: Molten Glaze, Ashbloom<br>• never resisted: Night Glass<br>• plain damage: Cinder Dive, Shatterlight, Heart of the Forge<br>No move stuns; the stunning Cold Quench was not used. | `src/campaign-data.js` |
| Story | Seven scenes (arrival, Two Furnaces, The Mould, What the Crystals Kept, The Ledger, Still Warm, Three Clocks) and five after-lines | `src/scenes.js`, `src/ui-obsidian19b.js` |
| Battle environments | Ten 2D backdrops: basalt, kilns, nests, quench pools, mine galleries, mirror hall, magenta crystal, burned orchard, bellows, forge core.<br>Ten 3D arena variations recoloured from existing arenas (violet basalt, ash, ember/glass/crystal accents); no new geometry. | `src/dungeon-art.js`, `src/3d/arenas.js` |
| Explore | Ash Plain (after D1), Glass Beach (after D4) and Crystal Vein (after D7), now reachable.<br>Rare third forms use the Verdant rules (20% a day, certain on day 8, once ever):<br>• Pyrokai III at level 38<br>• Zeep III at 41<br>• Aimza III at 44<br>Each joins no higher than the dungeon ahead. | `src/obsidian19b.js` |
| Quests | Main chain `m_o1`–`m_o10` after *Shut from the Inside*.<br>Eight side quests: level 45 and 50, Cinder Steps sections, build and upgrade a Forge Habitat, clear 10 Obsidian obstacles, a farm on the Reach, befriend 40 species.<br>*The Dark Shore* is listed and its objectives have hints. *Above the Clouds* stays hidden. | `src/world-data.js` |
| Dialogue fix | The intermittent `browser-polish16b` failure (see Technical stability) | `src/ui-polish16b.js` |

Rewards are as approved:

- **First clears, one-time:** 35,500 gold, 5,660 food and 157 gems in total. The Island Boss gives 7,000 gold, 1,000 food, 40 gems and Night Mail.
- **First-clear items:** Surge Spear, Noon Charm, Sky Crest, Abyss Plate, Titan Maul, Solstice Charm, Choir Shell, Bloom Cloak, Tempest Lance, Night Mail. None of these items was previously any other dungeon's reward.

## Difficulty, progression and the Quench Pools

**Method.** The real rules run in a sandbox. The 17C campaign agent played Starter Island and the Verdant Wilds under the
staged cap, then Obsidian Reach, with seeds 11 and 22. *Threshold* is the lowest level at which a plain trio clears a
dungeon first try in at least half of 16 runs. *Slack* is the arrival level minus the threshold.
Data: `docs/audit19c/sim.json`; before tuning: `docs/audit19c/sim-untuned-quick.json`.

**Tuning.** All dungeons started at ×1.3 / ×1.18. Each was then set (`tools/p19c-tune.js`) so its threshold sits two
levels below its recommended level, and the Island Boss three.

| | Cinder | Kilns | Rookery | Quench | Seams | Gallery | Hollows | Orchard | Bellows | Forge |
|---|---|---|---|---|---|---|---|---|---|---|
| Threshold − rec, untuned | −4 | −3 | −2 | **0** | −2 | −1 | −2 | −3 | −4 | −3 |
| Threshold − rec, tuned | −2 | −2 | −2 | −2 | −2 | −2 | −2 | −2 | −2 | −3 |
| Health tune | ×1.2 | ×1.1 | — | ×0.9 (atk ×0.92) | — | ×0.85 | — | ×1.1 | ×1.15 | ×1.12 |

The Island Boss also has guardian hp ×0.92 and atk ×0.9.

**Quench Pools (addressed in this phase).** The spike had two causes:

- attrition at battles 5 and 6;
- the Quenchwarden itself.

Fixes:

- dungeon hp ×0.9, attack ×0.92;
- battles 5–6 hp ×0.88 and ×0.85;
- guardian hp ×0.92, attack ×0.86;
- Cold Quench unchanged in kind (it still chills, never stuns).

Clear rate of a plain trio:

| Party level | Before | After |
|---|---|---|
| rec−3 | 3% | 31% |
| rec−2 | 53% | 81% |
| rec−1 | 69% | 97% |

These are now in line with the neighbouring dungeons.

Rarely-fed players at the Pools:

| | Losses | Replays | First-try |
|---|---|---|---|
| Before | 6 | 3 | 0% |
| After | 1 | none | 10% |

**Campaigns (simulated):**

| Profile | Arrives | Ends | Losses | Replays | Minutes | Slack D1 → D10 |
|---|---|---|---|---|---|---|
| Rarely fed | 34.7 | 44.0 | 4 | 0 | 65 | −1.3 … −1.0 |
| Fed regularly | 39.3 | 50.7 | 0 | 0 | 51 | 3.3 → 6.0, rising smoothly |
| Highly upgraded | 40.3 | 51.0 | 0 | 0 | 41 | 4.3 → 6.0 |
| All optional Verdant content | 45.7 | 51.3 | 0 | 0 | 40 | 9.7 → 6.0 |
| Fed, basic attacks only | 39.3 | 50.7 | 12 | 2 | 97 | 3.3 → 6.0 |
| Entering at 38 / 40 / 43 / 46 | — | 50.7–51.7 | 0 | 0 | 47–51 | 2.0 / 4.0 / 7.0 / 10.0 at D1 |

What the numbers mean:

- **Rarely-fed teams progress without compulsory grinding.** They take 4 losses, and none needs a replay of an earlier
  dungeon.
- **Thorough players keep their advantage.** Players who did all the optional Verdant content arrive about 6 levels
  ahead and lose nothing.
- **Early dungeons are not trivial.** The thresholds now sit two levels under the recommended level instead of four.
- **Tactics matter.** At the recommended level:

  | Play style | Clear rate |
  |---|---|
  | Tactical (guard, heal, soak) | 88–100% |
  | Game's auto-battle | 88–100% |
  | Team picked for the elemental matchup | 100% everywhere |
  | Basic attacks only | 0% |

  Basic-only players finish the island, but with 12 losses (1.5 of them at the Forge Heart).
- **No dynamic enemy scaling.** Foe levels are fixed in data.

**Charged moves at the recommended level** (one hit on a full-health member): 35–52% of health unguarded and
9–13% guarded. No move causes an unavoidable instant defeat, and every warning appears a turn ahead.

The Phase 18D rule still holds: a guard against an incoming charged move goes up first, even when the guardian is
faster. This is tested on the Forge Heart.

## Level cap (unchanged rule, now complete)

- Cap 40 before the Forest Crown, 50 after it, 60 after the Forge Heart.
- Saved levels are never reduced (the ceiling is 60).
- No XP is stored at the cap, and nothing is granted when the cap rises.
- Each raise is announced once.
- Feeding stops at the cap.
- Move upgrades answer normally after the raise.
- No Mastery system of any kind exists in the build.

## Story

The Entity stays dry and dismissive and calls the player *Kind Soul*. Each scene carries its beats as evidence only:

| Scene | When | Beats |
|---|---|---|
| *Warm Stone* | Arrival | The scorched small steps |
| *Two Furnaces* | Dungeon 2 | The panels were made here (the Elder Root shard fits a rack labelled in two hands). A Glasswick Kind Soul says “You came back”; the Entity answers “You have me confused with someone taller.” |
| *The Mould* | Dungeon 6 | Both Keepers hold the door shut from the same side. A third figure has been chiselled away. The Entity never looks at it. |
| *What the Crystals Kept* | Dungeon 7 | Two frightened voices calling each other's names. A hum that is neither light nor shadow. |
| *The Ledger* | Dungeon 9 | “Commission: one door, two keys. Paid in full.” then “Third key: refused.” |
| *Still Warm* | Before the Forge Heart | The confrontation |
| *Three Clocks* | After the Forge Heart | The repair order “Repair: one door. Requested by both keys.” The Spire, the Choir and the forge keep the same time, and something above the clouds turns to watch. |

The story establishes that the accident was intended by neither starter, and that someone wanted a third key. It never
says who. It does not explain the Emergence, Starter Island's origin or the presence beyond the world.

## Replay challenges

Flawless, One element and Answer the Guardian apply to all ten dungeons under the existing rules. A test checks that an
ordinary knockout of a guardian, without guarding, soaking or stunning its charge, does not count as answering it.

## Technical stability: the `browser-polish16b` dialogue failure

**Diagnosis: a transition-state problem that left a genuine (small) layout defect.**

- The dialogue panel enters with a 0.2 s slide (`fadein`, starting 0.5 rem lower).
- The control row (Aa, Auto, Skip) is placed above the panel by a ResizeObserver.
- When the panel's size settled during the slide (font loading or the text-size change decides when), the row was
  placed against the panel's mid-slide position.
- When the slide ended the panel moved up, but the row did not. It then overlapped the panel by about half a pixel
  (measured: row bottom 238 px, panel top 237.5 px, and still the same 600 ms later), so this was not a rendering delay.

**Fix:** the fit now uses the panel's resting position (it subtracts the slide's offset) and runs again when the slide
ends. **Test unchanged:** its assertions and waits are untouched.

| Runs | Failed |
|---|---|
| Before the fix: 19A base (measured in 19B) | 2 of 6 |
| Before the fix: this branch, instrumented runs | 2 of 10 (plus 1 of 5 plain runs) |
| After the fix | 0 of 15 (8 instrumented runs, the full regression run, 6 more) |

## Performance (Chromium + SwiftShader; relative only; `docs/audit19c/perf.json`)

| Island | Draw calls (high / balanced / saver) | Triangles (high) | 2D p50 | 2D nodes |
|---|---|---|---|---|
| Starter | 76 / 76 / 76 | 135k | 16.7 ms | 2,739 |
| Verdant | 85 / 85 / 86 | 152k | 16.7 ms | 2,495 |
| Obsidian | 64 / 64 / 64 | 115k | 16.7 ms | 2,376 |

- **Island cost.** Obsidian is still the lightest island. It has 6 more calls than the 19B preview (58) because the
  gates are now open and drawn lit. Triangles are unchanged.
- **Visits.** First visit 2.6 s, second 1.5 s, and an average three-island switch takes 1.9 s.
- **Long session.** After 30 Starter → Verdant → Obsidian round trips, geometries stayed at 312, textures at 2 and page
  nodes at 2,105. The heap is coarse.
- **Battle transitions.** Time to the battle screen, from tapping Go:

  | Arenas | Time |
  |---|---|
  | Obsidian | 0.83–1.23 s |
  | Verdant | 0.96–1.75 s |

- **Battle renderer, per arena:**

  | | Obsidian | Verdant |
  |---|---|---|
  | Draw calls | 20–37 | 21–29 |
  | Triangles | 12.7k–24.7k | 15.3k–15.8k |

  The Magenta Hollows is the heaviest at 24.7k triangles.
- **Battle memory.** After two rounds of all ten Obsidian battles the battle renderer was back to 29 geometries and
  2 textures both times, with page nodes flat.
- **Graphics settings.** No new geometry, so quality tiers, Battery Saver and Reduce Motion are unchanged.

## Tests

| Suite | Result |
|---|---|
| `tests/obsidian19c.test.js` (new, rule level) | 146 passed |
| `tests/browser-obsidian19c.test.js` (new, Chromium) | 19 passed |
| Full regression | 67 suites, 2,392 checks passed, 3 failed; both suites fixed and rerun (see Regression) |

**`obsidian19c` covers:**

- data for all 100 battles;
- the ten moves;
- the guard rule;
- soak holding a charge;
- activation and old saves;
- the full journey from the Forest Crown through all ten dungeons to the Forge Heart, with the story order and a save
  export/import at six stages;
- defeat and retry;
- replays;
- the cap;
- Explore and the rare encounter;
- the Forge Habitat;
- quests paid once;
- challenges;
- the story canon.

**`browser-obsidian19c` covers:**

- unlock and arrival;
- gates;
- the Dungeons screen;
- party picker into the 3D arena;
- all ten guardian warnings;
- six scenes with backdrops;
- the confrontation;
- the Battery Saver battle;
- the cap-60 notice.

**Updated for the approved activation.** These suites asserted that Obsidian Reach was not ready:

- `campaign18c`, `journey18d`, `polish18d`, `rewards17b`, `verdant18b`: now assert the Reach opens with the Forest
  Crown. Their not-ready checks moved to the Celestial Crown, which is still not ready.
- `obsidian19b`, `browser-obsidian19b`: gates now open in order instead of being sealed, and the preview no longer
  bypasses progression.

The assertions now state the approved state; none was loosened.

All 100 battles were run through automated simulation (tactical play cleared every one; basic attacks 94% on average).

## Regression

`node tests/run-all.js` ran 67 suites: **2,392 checks passed, 3 failed.** The failures were in two suites, and both were
fixed and rerun:

- **`browser-verdant18b`**, two checks. Both used Obsidian Reach as the example of an island that is "not ready". It is
  ready now, so they moved to the Celestial Crown. Rerun: 22/22 passed.
- **`browser-polish18d`**, one check. It expected "Level cap N" on the victory screen, but that save's cap is now 60:
  every dungeon is cleared, including the Forge Heart. So "Max level" is correct. The check now expects the wording for
  the save's own cap. Rerun: 17/17 passed.

**`browser-polish16b`** passed in the full run. Since the fix it has passed 15 of 15 runs: 8 instrumented, the regression
run and 6 more.

The new suites passed in the full run: `obsidian19c` 146/146 and `browser-obsidian19c` 19/19.

## Known limitations and open decisions

- **Not tested on device or by hand.** No physical iPhone testing and no manual playthrough. Balance is simulated.
- **First-visit greeting not seen in the scripted browser run.** The browser test did not catch the greeting toast on
  screen during the arrival sequence. A separate browser probe did show it, and the rule-level beat is checked word for
  word.
- **Basic-attack players.** They clear the island with 12 losses. The Forge Heart is the hardest point for them: 29%
  first-try at rec+4, against 63% for the Forest Crown. That is left as a tactical lesson, but it is a decision for you.
- **Thorough players.** Players arriving from all optional Verdant content are about 6–10 levels above the early
  thresholds. This is the "benefit of previous effort" by design, but the first dungeons are easy for them.
- **Unimplemented codex quests.** "Metalworks" (own every Zeep form) and "Two Furnaces" (own both starters' third
  forms) from 19A need an objective type the quest system lacks. They are not implemented.
- **Mechanics left out.** The optional dungeon mechanics from 19A (two-kiln alternation, steam, echoes) are not
  implemented. Only existing mechanics are used: barrier, prism, charged moves and herald.
- **Arenas are recolours.** The 3D arenas reuse existing arena geometry, as the Verdant ones did.
- **Mastery.** None. Resource-based Mastery is approved for future design only.
- **Console 404.** A script 404 appears in the browser console during play. It is not a page error, and no missing
  local file was found. It was not traced in this phase.
