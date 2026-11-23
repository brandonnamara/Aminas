# Phase 18D — Verdant Wilds integration, polish and stability

Branch `p18d-verdant-polish` (from Phase 18C, `8f591ee`). Production `main` is untouched. The Phase 16A opening stays
off by default. The Verdant map, its 60 obstacle ids, building placements and island coordinates are unchanged
(hash-checked by `verdant18b.test.js`). The level cap stays at 40.

**Testing note.** Everything below was verified by automated means only: Node rule tests, rule-level simulation with
scripted play styles (`tools/p18c-sim.js`), and Chromium + Playwright with software WebGL (SwiftShader) at 844×390 with
touch emulation. **Nobody played this by hand, and nothing was tested on an iPhone.** Chromium frame times are
relative comparisons between builds on the same machine, not phone performance.

---

## 1. Integration audit: the full journey

`tests/journey18d.test.js` (57 checks) plays one save from the end of Starter Island to the Forest Crown and back,
exporting and importing the save (`A.SaveFile.exportFile` → `parse` → `apply`) at nine checkpoints. At every checkpoint
it compares Aminas, resources, items, dungeon records, quests, islands, the current island, the Verdant record,
ownership, bosses, essence, story scenes and challenge records; nothing changed on any round trip.

| Step | Checked |
|---|---|
| 1–2 | Defeating the Heartwood Stag unlocks the Verdant Wilds and queues its scene |
| 3 | Travelling queues the arrival scene once; the Landing Cove is visited |
| 4 | Glowcap Glade is open on arrival (the other two areas are not); its three Aminas can be befriended |
| 5 | A defeat keeps battle-by-battle progress; the retry resumes and finishes; each dungeon is cleared once and its item granted once |
| 6 | Story scenes arrive in order: v_keepers, v_shrine, v_spire, v_voice, v_confront, v_crown; the five dungeons without a scene end with an Entity remark |
| 7 | Streamside opens with the Drowned Aqueduct, Canopy Edge with the Canopy Walk |
| 8 | The Twin Shrine gift is offered, claimed once, a second claim refused; the starter is unchanged |
| 9 | The Forest Crown records the Verdant Island Boss; Obsidian Reach stays closed |
| 10 | Back on Starter Island the Heartwood replays for its repeat reward and unlocks nothing again; a Verdant guardian replay also works from there |

Existing saves: a Phase 17 save already on the island imports with Dungeon 1 open, Glowcap Glade open and the arrival
due; a Phase 18B save keeps its visits and starts at Dungeon 1; Aminas and currencies are unchanged, and such saves
progress and round-trip.

**Fix found by the audit.** The arrival scene was queued by a `traveled` listener reading the global state, so a save
travelling while another save object was loaded (export/import, tests) could miss it. It is now queued by the travel
call itself, on the save that travelled.

## 2. Save and reward integrity

All in `journey18d.test.js`:
- Battle progress survives a defeat; retry resumes at the battle reached.
- First-clear rewards and items once per dungeon; section rewards once; quest gold paid exactly once (6,900 gold for
  the ten main quests); claiming a finished quest again is refused.
- Challenge rewards: a flawless replay that answered the guardian completes both, once; repeating pays nothing new.
- **Answer the Guardian rules preserved**: a guardian knocked out while charging, without a counter, does not count.
- The gift and its alternative (when the form is already owned) are recorded once.
- Island Boss, transitions and export/import round-trip at every stage. No duplicate rewards found.

## 3. Guardian review

`tests/browser-polish18d.test.js` drives each guardian in the browser; `tests/polish18d.test.js` checks the rules.

| Check | Result |
|---|---|
| Warnings readable | Each charged move is announced (“… is coming”) in the battle log a turn ahead (18C test, still passing) |
| Effects match descriptions | Floodgate soaks (“is soaked and slows down!”), Spore Bloom lowers attack (“’s attack fell!”), Archive Seal silences (“is silenced: no special abilities next turn!”), Ember Canopy burns (“is burning!”), each landing on an unguarded Amina in the browser |
| Archive Seal text | **Fixed**: the description said two turns; the silence lasts one player turn (measured). It now reads “Files you away: no special abilities on your next turn.” |
| Guard | **Fixed** (see below). Guarded: “The guard absorbed most of the blow!”; a guard takes about three quarters off |
| Stun and soak counters | A stun while charging staggers the guardian; a soaked guardian holds its charge a turn (18C tests, passing) |
| No unavoidable defeats | No Verdant charged move fells a full-health Amina at the recommended level, even unguarded at its highest roll (worst: Floodgate 69% of health; guarded worst 17%) |
| Logs accurate | Status lines come from one table (`STATUS_LOG`), checked against what the rules applied |

**Guard against a charged move goes first (rule fix, please review).** The battle screen marks the guard button “Blocks
the charge” while a guardian charges, and the challenge counts a guarded hit. But turn order was by speed alone, so a
slower Amina was hit before its guard went up. At their recommended levels **no Aminas species is as fast as three
Verdant guardians** (Drowned Aqueduct 77, Canopy Walk 92, Elder Root 103; species median 45–63), so against them the
advertised answer could not work. Now a guard used while the foe is charging resolves first. Nothing else about turn
order changes (an ordinary attack still follows speed; attacking into a charge still follows speed). It is a two-line
change in `R.Battle.act` (`guardFirst`), easy to revert. The campaign simulation is unchanged by it (identical output),
because its scripted teams carry no guard move.

## 4. Visual polish (Verdant Wilds island)

- **Verdant obstacles in 3D.** The four Verdant obstacle kinds had no voxel models and drew as flat 2D pictures over
  the 3D ground. New models: Elder Root sapling, vine tree, mossy ruin, mossy rock (`src/3d/library/verdant.js`). Ids
  and positions unchanged. The two tree models were then lightened, and all 44 are baked into one mesh (section 9).
- **Groves.** The same scenery layout (same count, same cells) grows Verdant kinds: willows for pines, oaks for birches,
  glowcaps for blossom, ferns and mushrooms in the glades, moss-capped rocks for crystals.
- **Landmarks.** Aqueduct: water glints and a spill waterfall. Ivy Archive: door lanterns and glowing tablets. Twin
  Shrine: warm and violet light pillars. Choir of Roots: a ground glow ring. Elder Root: canopy fireflies and a threshold
  glow. Sparkles share one points mesh (one draw call).
- **Entrance readability.** Cleared entrances show a green ✓; open entrances get a glowing ground ring and a larger
  number; locked ones stay dim. **Fix:** landmark and entrance number tags are now cut out of the 3D occlusion layer, so
  a tree in front can no longer hide an entrance number (seen with the Choir entrance behind a vine tree).
- Map, obstacle ids and player buildings unchanged.

Screenshots: `docs/ui/screens18d/` (18C left, 18D right).

## 5. Verdant battle arenas

Each Verdant dungeon now fights in its own arena variation instead of borrowing a Starter arena. A variation reuses the
Starter arena whose setting fits, block for block (same merged meshes), recoloured through the island palette (moss-grey
stone, deep jungle greens, loam; coral, crystals and banners in the place's own accent), with its own light rig, fog,
particles, far backdrop colours and set dressing. Battery saver and Reduce motion apply as before.

| Dungeon | Built from | Accent |
|---|---|---|
| Mossgate Steps | Forgotten Road | moss green, pollen |
| Drowned Aqueduct | Drowned Steps | teal water, green weed instead of coral |
| Spore Hollow | Reliquary | golden spores, dusk |
| Ivy Archive | Gathering Hall | lamplight, green banners |
| Glowworm Terraces | Cold Kiln | amber glow |
| Twin Shrine | Lantern Orchard | warm and violet light |
| Canopy Walk | Wind Stair | bright canopy, falling leaves |
| Moonwell | Drowned Steps | night, violet coral, wisps |
| Choir of Roots | Resonance Scar | pale mint crystals |
| Elder Root | Heartwood | dark, cyan fireflies |

Cost (`tools/p18d-arenas.js`, `docs/audit18d/arenas.json`): arena geometry alone has the same draw calls as its base in
all 60 cases (10 arenas × normal/boss × three tiers) and at most 3.4% more triangles. In a live battle, draw calls are
equal or one higher (the extra particle colour), and render time is within the run-to-run spread (balanced tier mean
54.1 ms vs 55.3 ms for the Starter originals). The arenas were therefore kept.

## 6. Rare third-form encounter (Explore)

| | |
|---|---|
| Where | Glowcap Glade → Terraflora III; Streamside → Aquaflora III; Canopy Edge → Pyro-Phoenix. Existing species only; Starter areas have none |
| Eligible | The area is unlocked and its three usual Aminas have been found |
| Rate | The first exploration of each calendar day rolls once: 20%. Later explorations that day roll nothing (no farming); a clock set back gives no extra roll |
| Pity | If every roll fails, it arrives on the 8th eligible day. 400 simulated players: everyone within 8 days, median day 4, 20% on day 1 |
| Level | Glowcap 22, Streamside 25, Canopy Edge 32: never above the recommended level of the dungeon ahead when the area opens (Mossgate 22, Spore Hollow 25, Moonwell 33) |
| Once | Befriended at the usual food cost and recorded as met; it never appears again |
| Codex | It enters the collection and Codex like any find; an unanswered find waits like any other |
| UI | “Something rare stirs…” with “A rare encounter: it will not come this way again.” The area card says something rarer lives there, never which day or which species |

Why it does not replace breeding or evolution: three Aminas in total, one per area, each once; it joins at or below the
level of the dungeon ahead (a first draft used level 26 everywhere, which on arrival was above a typical level-22–25
party, so it was lowered); the other 54 species and every other third form still come from evolution. Saves: `st.v18.rare`, cleaned on load, round-trips through export/import.

## 7. Level cap at 40

Findings (tests in `polish18d.test.js` and `browser-polish18d.test.js`):
- **XP.** Before 18D an Amina at 40 kept collecting XP that could never be used, and the victory screen showed “+N xp”.
  Now XP past the cap is not stored (reaching 40 keeps 0 XP), and the victory row reads “Max level, no more XP”, or “(max
  level reached)” on the battle that reaches it. **Please review:** if the cap is later raised, a level-40 Amina carries
  on from 40 with 0 XP rather than jumping several levels with banked XP.
- **Feeding** at 40 is refused and costs nothing (the feed buttons are hidden, as before).
- **Move upgrades** still work at 40 (they cost essence, not levels).
- **Stats** continue the same line (HP 238 → 243 from 39 to 40).
- **Battle rewards** at 40 still pay gold, food and essence; only XP stops.
- **Saves**: a level-40 Amina saves and loads as is; a damaged save above 40 is clamped to 40.
- **Future expansion**: the XP formula already defines levels past 40, and with the cap raised a level-40 Amina simply
  continues (41 with 7 XP in the test). Evolution levels are unchanged.

Recommendations: when Obsidian Reach arrives, raise the cap in one step to 50 with its foe tier; give capped Aminas a
use for XP (essence or a small gold conversion) so victories at the cap still feel rewarded; keep the cap visible on the
creature screen (already “Max level”).

## 8. Timing failures

Approach as approved: condition-based waits, original assertions kept, timeouts kept unless evidence, rendering delays
told apart from functional failures.

| Test | Finding | Change |
|---|---|---|
| `browser-intro14` camera opens on the boss | **Real (rare) defect.** The boss card's 2.2 s clock started when the battle opened; on a slow load the 3D stage mounted later and the card ended, skipping the camera. Measured with 6× CPU throttle: camera began at 2.43 s, card ended at 2.74 s and cut it short | Game: the card's deadline moves to the camera's end (1.7 s after it starts). Test: the intro is recorded in the page frame by frame instead of sampled once; “ends within about 2.5 s” is now measured from the camera's start when the stage mounted late |
| `browser-env12` Hatchery covers a creature | Rendering delay: occlusion refreshes on the next view change (software WebGL) | Waits for the occlusion pass counter to move on (was a fixed 3 s); about 2.0 s measured |
| `browser-dev8` pixel bursts | Rendering/timer delay under load (bursts remove on a 950 ms timer) | The page records when the last burst left; measured 950 ms |
| `browser-dev7` Forge closes | Not reproduced in 6 runs (3 under parallel load). Clicking “the last overlay” could hit a notice above the Forge | Clicks the Forge's own Close button and waits for the Forge to detach; Playwright still refuses the click if anything covers it, and any overlay above the Forge is printed |
| `browser-dev7` island animation paused when hidden | **Real (minor) defect, caught with diagnostics**: a companion's walking hop is a CSS transition, which `animation-play-state` does not pause; one in flight when the app was hidden kept running (2 of 3 loaded runs) | Game: hidden ends the hop (`style.css`). New deterministic browser check; dev7 then passed 3 of 3 under load |
| `browser-ui5` reward cards leave | Timer delay under load: the mythic card stays 6.4 s + 0.32 s exit, the test waited 7 s | Waits for the cards to leave (15 s ceiling), reports the time |

## 9. Performance

Chromium + SwiftShader, 844×390 @2×. Relative only. Files in `docs/audit18d/`.

**Island** (`tools/p18b-perf.js` → `perf.json`, same tool as the 18B and 18C baselines):

| | 18C | 18D |
|---|---|---|
| Verdant draw calls, high / balanced / saver | 77 / 77 / 77 | 79 / 79 / 80 |
| Verdant triangles, high / balanced / saver | 124k / 121k / 75k | 152k / 149k / 84k |
| Verdant CPU per draw as a share of Starter's, high | 83% | 81% |
| First visit / second visit (ms) | 2,747 / 1,834 | 2,858–3,172 / 2,181–2,201 |
| GPU geometries over 10 round trips | 226 → 223 | 228 → 225 |

The machine ran slower during the final 18D run (Starter Island, unchanged, also measured 14% slower), so the CPU cost
is given relative to Starter in the same run. The 44 Verdant obstacles now in 3D first cost 13 draw calls and 54k
triangles; lightening the two tree models and baking all four kinds into one mesh (with each specimen's own tint, and
back faces dropped) brought that to +2 draw calls and +28k triangles. A browser-verdant18b check that Verdant stays
within four draw calls of Starter caught the first version (88 vs 76) and passes now. Island switching is about 10–20%
slower on a Verdant visit (more models to place); the bake itself adds nothing measurable (sync 459 vs 454 ms).

**Battle arenas**: see section 5 (balanced mean 55.9 ms vs 57.0 ms for the Starter originals, final run).

**Long session** (`tools/p18d-session.js`, 18C and 18D run back to back, heap after a double forced GC): 24 island round
trips and 10 Verdant battles.

| | 18C | 18D |
|---|---|---|
| Heap: start → after 12 trips → after 10 battles → after 24 more trips (MB) | 24.8 → 37.1 → 62.8 → 63.4 | 24.4 → 39.7 → 70.3 → 70.9 |
| Island geometries at the same points | 73 → 131 → 134 → 134 | 73 → 129 → 134 → 134 |
| Island switch p50 / p95 (ms) | 1,054 / 1,662 | 1,122 / 1,917 |
| Battle open (ms) | 744–1,427 | 734–1,404 |
| Battle render per frame (ms) | 0.93–1.70 | 0.66–1.46 |

No leak: heap, geometries and DOM nodes are flat over the last 24 trips; the battle stage is gone after each battle
(templates cached at 11). A separate 40-trip run: 18D 39.4 → 39.8 MB, 18C 36.8 → 37.1 MB. 18D holds 3–8 MB more (new
models, arena variations). An early reading of 98–281 MB came from a single GC with too short a pause; with a double GC
it does not reproduce.

## 10. Regression

**Final run: 63 suites, 2,142 passed, 0 failed** (`docs/audit18d/regression-run2.log`).

The first run had 2,139 passed and 2 failed (`regression-run1.log`), both resolved before the final run:
- `browser-verdant18b` (Verdant within four draw calls of Starter: 88 vs 76): a genuine 18D regression from the new
  obstacle models. Fixed in the game by baking them into one mesh (79 vs 76). Assertion unchanged.
- `browser-ui5` (reward cards leave): a fixed 7 s wait for a 6.72 s card, overrun under load. Now a condition wait.

New suites: `journey18d` (57), `polish18d` (47), `browser-polish18d` (17). Details: `docs/audit18d/regression.md`.

## 11. Known limitations

- No physical iPhone testing; frame times are software-renderer comparisons.
- The Verdant island draws 2 more calls and about 23% more triangles than in 18C while its obstacles stand, and a
  Verdant visit loads 10–20% slower.
- The rare encounter's day is the device's calendar day; moving the clock forward brings the next roll early (one roll
  per day still, and the pity count only rises once per day).
- Arena variations recolour existing arenas; their layouts match the Starter originals.
- The guard rule change and the level-cap XP change are small but are rule changes: both are flagged for your approval.

## 12. Recommendations for the next milestone

1. Approve or revert the two rule changes (guard against charges; XP not banked at the cap).
2. A short hand-played session on the iPhone: the Verdant island with all obstacles, a boss intro on a cold start, and a
   long session for heat.
3. Obsidian Reach: raise the cap to 50 with a foe tier, and give capped Aminas a use for XP.
4. Teach the guard answer in the first Verdant guardian (the picker brief could say “Guard while it charges”).
5. Give the Verdant arenas one unique prop each (aqueduct arches, archive shelves) if a distinct layout is wanted.
