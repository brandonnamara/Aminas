# Phase 19D: Obsidian Reach integration, optimisation and final polish

Branch `p19d-obsidian-polish`, from `p19c-obsidian-campaign` (`d7f53f3`). Production `main` is untouched. The Phase 16A
opening stays off by default. The Celestial Crown stays closed. No physical iPhone was used: every number below comes from
Chromium with software WebGL (SwiftShader) at 844×390, or from rule-level simulations, and is useful only for comparison.

## 1. What changed

| Area | Change | Files |
|---|---|---|
| Script 404 | Removed the service-worker registration. `sw.js` has never been in the repository, so every load made one failed request and logged a 404. No worker was ever installed, so there was no offline support to lose. | `src/main.js` |
| Island greeting | The batch flush kept only the last ordinary toast, so a quest toast in the same moment ("Done. Your reward is waiting in Tasks.") replaced the island's greeting. Greetings are now marked `keep`. On Obsidian the arrival scene speaks the greeting itself, so there is no duplicate toast while the scene is due. The same defect affected the Verdant Wilds. | `src/story.js`, `src/ui.js` |
| Story scenes | A tap during a scene's 1.1 s opening fade showed line 1 early, and the opening timer then jumped straight to line 2, so the first line could be lost. Taps before the scene starts now do nothing. Found by the new browser test; affects every story scene. | `src/ui-scene.js` |
| Codex quests | New `befriend` objective type. Metalworks: own Zeep, Zeep II and Zeep III (after m_o1; 3,000 gold, 6 gems). Two Furnaces: own Aurelith and Eclipsar (after m_o2; 4,000 gold, 8 gems). The main quest m_o2 is renamed "The Kiln Yard" so the name is used once. | `src/quests.js`, `src/world-data.js` |
| Mechanics | Glasswick kilns: the Glassblower alternates fire ↔ light every two turns, each change warned a turn ahead ("The other kiln is heating up"). Quench Pools steam: every third turn both active fighters are soaked for a turn, warned a turn ahead, no damage. Magenta Hollows echo: if Shatterlight lands unguarded, the crystals ring it back as Crystal Echo (power 72) on the guardian's next action. | `src/rules.js`, `src/campaign-data.js`, `src/ui2.js` |
| Forge Heart | The Island Boss introduction now describes each boss's real mechanics. Before, every island boss got the Starter boss's "element shifts … Prismfall" text. The Forge Heart gets a forge-coloured halo. The victory screen shows Night Mail as the Island Boss reward and a "Level cap raised: Level 60" block at the top of the card. Difficulty is unchanged. | `src/ui2.js`, `src/3d/runtime.js` |
| Environment | Lanterns, black sand, a moored skiff and crates at the Landing. Lanterns, a rack of cooling panes, crates and small doors in Glasswick. A glass ridge-light, fallen shards and two judged panes at the Mirror Gallery. A walkway, pressure gauge and lit ledger office at the Great Bellows. A gear, clay pipes, a cooling-ingot rack and a slag runnel at the Great Forge. Lighter column caps and obsidian glints on the basalt. A glowing crystal foot. A pennant on every dungeon entrance (coloured when open, grey when locked) and a brazier when open. All baked into the existing meshes. | `src/3d/library/obsidian.js` |
| Arenas | Each of the ten arenas gets forge furniture: basalt pillars, kilns, glass panes, a gear, a piston and cooling bars. Each arena has one glow colour and at most one small animated piece, which stops under Reduce Motion. The Great Bellows arena (reliquary base) was still bright green because its own materials bypassed the 19C recolour; it is now ash and rust. | `src/3d/arenas.js` |
| Encounter card | The card shown before a guardian looks its mechanic up in `D.BOSS_MECHS`, which had no `echo` entry, so the Lantern Below's card threw an error. Caught by the full regression (`browser-obsidian19c`); the entry is added, and a new check makes sure every guardian mechanic has a name and description. | `src/campaign-data.js` |
| Hidden page | The pause rules for a hidden page matched elements but not `::before`/`::after`, so the ready-task pill's sweep kept running while hidden. This predates 19D. | `src/style.css` |

## 2. Balance (the 19C difficulty is kept)

The Forge Heart is exactly as 19C shipped it: ×1.34 health and ×1.062 attack, battles ×1.456 health. The Quench Pools
adjustment is kept. There is no dynamic scaling, no level reduction, no change to global XP, and the cap stays 60.

A first version of the mechanics made two guardians easier for basic-attack-only teams. Direct guardian fights, 400
seeds each, basic play at the recommended level:
- **Quenchwarden:** 80% → 98%, because steam soaked a guardian that was already charging and so held its charge for free.
- **Lantern Below:** 36% → 76%, because a weak echo (power 34) replaced one of its ordinary attacks.

Fixes:
- A charging guardian is braced against steam. The Quenchwarden is back to exactly 80%.
- The echo keeps the countdown that was running, so it takes the place of an ordinary attack instead of delaying the next Shatterlight.
- The echo only follows an unguarded Shatterlight.
- The echo's power is set to 72. Lantern Below, basic play: 41% at level 44 (19C: 35%). Tactical and auto play: 100%.

Trade-off: under-levelled tactical play in the Hollows is a little harder. The level at which the whole dungeon clears
first try at least half the time goes from 42 to 43, still below the recommended 44. First-try clears with tactical
play, whole dungeon, 60 seeds:

| Party level | 19C | 19D |
|---|---|---|
| 42 | 58% | 37% |
| 43 | 85% | 55% |
| 44 (recommended) | 93% | 100% |

No echo power keeps both measures exactly; this is the closest.

Full simulation (`docs/audit19d/sim.json`; 20-seed campaigns in `sim-20seeds.json`):
- All other thresholds are unchanged from 19C.
- **Basic-attack campaign:** 14.9 losses and 3.4 grinds (19C, same seeds: 14.4 and 3.0).
- **Rarely-fed campaign:** 5.3 losses (19C: 4.6).
- **Fed-regularly campaign:** 0 losses in both.

## 3. Challenges on overlevelled players (recommendations only)

`tools/p19d-challenges.js` → `docs/audit19d/challenges.json`: 30 full replays per cell at the recommended level, +5 and +10.
- **Answer the Guardian** always needs an action (guard, soak, stun or barrier break). Basic play never completes it at any level. Scripted tactical play completes it 0–100% depending on the dungeon, even at +10. It stays meaningful.
- **Flawless** stays demanding: 0% at the recommended level for scripted play, and still 0% at +10 in six dungeons. Note that the policy never switches out a hurt Amina, so this overstates the difficulty for a careful player.
- **One element** stops being a challenge once overlevelled: 100% clears at +5 in every dungeon.

Recommendations for 20A (not implemented):
- Require One element and Flawless together for a bonus, or count One element only at or below the recommended level + 5.
- Show the party's level relative to the recommendation on the challenge card.

## 4. Performance (19C tree vs 19D tree, same tool and machine, one after the other)

- **Islands:** Obsidian 64 → 65 draw calls and 115k → 117k triangles on High. Starter and Verdant are unchanged.
- **2D fallback:** unchanged (16.7 ms per frame).
- **Battle renderer:** Obsidian arenas +0 to +2 draw calls and +100–300 triangles. Arena-only build:
  - normal rooms: at most +2 draw calls;
  - boss rooms on Battery Saver: +1 draw call, under 0.5k triangles.
- **Battle load:** 0.99–1.91 s against 1.10–1.75 s in 19C. Noise in both directions.
- **Memory:** heap flat, geometries and textures flat over 30 three-island round trips and repeated battles.
- **Arena-by-arena comparison:** `tools/p19d-arenas.js`.

## 5. Tests

- `tests/polish19d.test.js` (159, rule level): the 404; greetings; the Codex quests (retroactive, once, accurate hints, reachable); all three mechanics including counters and saves; the Forge Heart's unchanged tiers; a three-island journey from a new save with export/import at nine milestones; old saves; caps, feeding and move upgrades; rare encounters against reloads and clock changes; challenges on all ten dungeons; the Twin Shrine gift; every first-clear item exactly once across 30 dungeons.
- `tests/browser-polish19d.test.js` (34, Chromium): everything checked on screen, as listed in the file header.
- **Full regression:** a first full run found the encounter-card crash above (68 suites passed, `browser-obsidian19c` crashed). After the fix, the final run is recorded in section 8.

## 6. Known limitations

- No physical iPhone testing was done.
- Offline play is not supported. No service worker exists, and adding one needs a generated precache list (Phase 20A).
- The Hollows threshold shift is described in section 2.
- The simulations use scripted policies, not people.
- The scene-skip fix changes behaviour for every story scene: a tap during the 1.1 s fade-in is now ignored.

## 7. Recommended physical iPhone checks

1. On a fresh install with the network logged (Safari Web Inspector): no 404 and no `sw.js` request.
2. Travel to the Verdant Wilds right after the Starter boss, and to Obsidian Reach right after the Forest Crown. The greeting or arrival scene appears; tap during the fade-in and the first line is still shown.
3. In the arrival scene, the Aa, Auto and Skip buttons are reachable without overlap, in both landscape orientations and with the Dynamic Island on either side.
4. The Glassblower, Quenchwarden and Lantern Below warnings are readable without covering the action buttons.
5. Forge Heart victory: the cap block is visible without scrolling, Night Mail is listed, and Continue works.
6. Background the app on Obsidian for a minute, then return. It resumes without stutter and the battery isn't drained while hidden.
7. Island frame rate panning across Glasswick and the Great Forge on High and Balanced, compared with the Verdant Wilds.
8. One battle in each Obsidian arena on Battery Saver and with Reduce Motion on: the pistons and kiln mouths are still.
9. Export a save on the phone, import it on another device, and continue a dungeon run and the quests.

## 8. Regression report

The final full run (`tests/run-all.js`) on the final code covered 69 suites: **2,587 passed, 1 failed**.

- **The one failure:** `browser-env1.2`, "a creature standing behind the Hatchery is covered by it" (Starter Island, 2D/3D occlusion timing in software WebGL).
  - It is intermittent and already was: the 18B, 18C and 18D notes record it.
  - Standalone reruns, same machine: 19D failed 2 of 15, the 19C tree failed 1 of 15. Across the two full runs here, it passed in the first and failed in the second.
  - No 19D change touches Starter Island occlusion.
  - The assertion is unchanged and was not weakened.
- **The first full run** (before the encounter-card fix) had 68 suites at 2,565 passed and 0 failed, while `browser-obsidian19c` crashed on the missing `echo` entry. That defect is fixed (section 1), and the suite now passes 19/19.
- **New suites:** `polish19d` 159/159 and `browser-polish19d` 34/34.
