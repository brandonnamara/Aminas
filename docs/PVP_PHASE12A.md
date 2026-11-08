# Aminas · Phase 12A — Island Defence Raid Preview

**Branch:** `ui12a-raid-preview`, created from `ui8b-roster` (the latest development build, Phase 8B). Production
(`main`, `0fc9e36`) is untouched.

## What changed
Island Defence → **Find an island to raid** now opens a **Raid Preview** instead of starting a raid at once. It shows
one computer-owned island:
* **Who owns it:** a named computer owner with a pixel avatar, the island's name and an island thumbnail in one of the
  four island styles. It is labelled "computer"; online play is still not connected.
* **Loot you can raid**, the largest thing on screen: gold and food, and the total value in gold (each food counts as
  3). Gems can't be raided and are never shown as loot. It also says how many rewarded wins are left today.
* **Defenders:** the three Aminas you would fight, with levels, a guard label (Lightly guarded, Guarded, Well guarded,
  Fortified) and how they compare with your attack team.
* **Skip opponent** (cyan): discards the island and offers another, free. An island isn't offered again until six
  others have been. Skipping never starts a battle or touches resources, teams or the daily count.
* **Attack** (gold): locks the island shown and starts the raid against exactly those defenders.

A won raid shows a result screen ("Raid on Cinder Spur succeeded" with the loot), then returns to a new island.

## The economy rule (please review)
Before Phase 12A a raid had no opponent loot: every won raid paid the 5v5 practice reward (60 gold, 10 food), up to
5 rewarded wins a day shared with 5v5 practice. To make the preview meaningful, each island now has its own loot,
scaled by how well it is guarded, around that old reward:

| Guard | Defenders | Gold | Food (approx.) | How often offered |
|---|---|---|---|---|
| Lightly guarded | your team’s level −1 | 35–55 | 5–10 | 2 in 8 |
| Guarded | same level | 55–75 | 8–14 | 3 in 8 |
| Well guarded | +1 | 75–95 | 11–18 | 2 in 8 |
| Fortified | +2 | 95–120 | 14–23 | 1 in 8 |

The **daily limit is unchanged** (5 rewarded wins a day, shared with 5v5 practice). Because skipping is free, a player
can always hunt for a Fortified island, so the most a day of raids can pay rises from 300 gold and 50 food to about
600 gold and 115 food, against tougher defenders. The values live in `D.PVP.raid` (`src/campaign-data.js`) and are
easy to tune.

## Reward integrity
* The island on offer, its defenders and its loot are saved (`state.defence.target`), so leaving the screen or
  restarting shows the same island. Only Skip replaces it.
* Attack locks the island. The battle carries the island's id, and only a battle against the locked island can pay.
  It pays exactly the loot that was shown.
* A win uses the island up (a new one is offered next time), so the same loot can't be raided twice. Resolving the
  same battle again pays nothing.
* A lost or called-off raid gains and loses nothing (as before) and leaves the island on offer.
* If the game closes during a raid, the raid counts as called off when the preview is next opened. This matches
  retreating: nothing is paid and the island stays on offer.
* After the day's rewarded wins the preview says plainly that a win pays nothing, and it doesn't.
* Viewing and skipping never call the economy.

## Save compatibility
No migration. Two optional fields are added inside the existing `defence` record when the preview is first opened:
`target` (the island on offer) and `recent` (islands recently offered). Older saves open the preview normally and keep
their teams and log. The defence record's helper now fills missing fields in place instead of copying the record, so
nested writes land in the save; existing behaviour is the same.

## Unchanged
Battle rules and calculations, 3v3 raid teams, 5v5 practice matchmaking, Hide and Seek, the defence test, the monster
roster and every other system. The older direct raid (`R.PvP.createRaid`) still works for anything that calls it.

## Files
| File | Change |
|---|---|
| `src/rules.js` | `PvP.raidPreview`, `skipRaid`, `attackRaid`, `raidValue`, `rewardsLeft`; `resolveRaid` pays the locked island's loot; the defence record keeps its identity |
| `src/campaign-data.js` | `D.PVP.raid`: 12 computer islands, guard tiers, loot base, food value |
| `src/ui-pve.js` | Raid Preview screen, Skip, Attack, raid result; the Island Defence log names islands |
| `src/ui-raid.css` (new), `index.html` | the screen's styles |
| `tests/raid12a.test.js`, `tests/browser-raid12a.test.js` (new), `tests/run-all.js` | tests |

## Performance
The screen is static HTML and one small SVG island. A new island gets one entrance of about a quarter of a second,
which is off with Reduce Motion, Battery Saver and while the game is calm. No timers, loops, particles or blur, and no
background work: islands are generated only when you open the preview or skip.

## Limitations
* Opponents are computer islands generated on the device, as before; there is no server and no real players.
* Avatars and island thumbnails reuse the existing pixel-avatar and island-thumbnail art; they are not custom islands.
* Raid loot changes the economy as described above; please confirm the numbers.
* Not tested on a real iPhone.

## Tests
Full suite, 24 suites, one at a time (22 minutes), Chromium with software WebGL, not an iPhone: **732 of 733 passed**.
* New `tests/raid12a.test.js` (31 checks, rules) and `tests/browser-raid12a.test.js` (18 checks, the screen) cover
  the ten required cases: the preview on entry, loot matching the raid calculation, Skip offering a different island,
  Skip costing nothing, Attack fighting the island shown, the exact reward on a win, the old rules on a loss, no
  duplicate rewards through repeating, reopening or restarting (including closing the game mid-raid), 5v5 and Hide
  and Seek unchanged, and saves from before Phase 12A.
* The one failure is the Phase 7 arena check "leaving battles frees their arenas" (GPU geometries 13, then 15). It is
  timing-sensitive under load (noted in Phase 8) and touches nothing this phase changed. Run alone twice afterwards,
  it passed both times (22, then 22).

Screenshots: `docs/ui/screens12a/`.
