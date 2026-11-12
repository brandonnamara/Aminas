# Aminas · Phase 13: progression, Hatchery, Forge and economy

**Branch:** `p13-core`, created from `p13a-progression` (`737af31`). Verified before starting: `p13a-progression`
contains `hs12c-controls` (Phase 12C) and `hs-redesign`; production `main` (`0fc9e36`) is not in its history and
has not been touched.

| Commit | Phase |
|---|---|
| `672beb5` | 13A finalisation |
| `bb96448` | 13B Hatchery and breeding |
| `fb8b988` | 13C Forge and equipment |
| `093ff3a` | 13D economy audit, model, wins-left line, recordings, this report |

**No balance or economy value was changed in any phase.** Costs, XP, feed values, evolution requirements, breeding
cost, incubation times, Hatchery and Forge levels, recipes, shop prices, merge costs, item bonuses, reward tables
and the five shared daily rewarded wins are as they were; tests assert each of them.

**All testing is desktop Chromium with software graphics at 844×390. Nothing was tested on an iPhone.**

Island Defence, Hide and Seek, dungeon progression, battle rules, monster models and the island environment were
not modified. One line of text was added to the 5v5 practice screen (13D); matchmaking itself is untouched.

---

## 1. Phase 13A finalisation

Your four decisions, applied:

1. Feed buttons stay at both the top and the bottom of the details screen (no change needed).
2. Undiscovered evolutions show their stat gains and hide their name and new move (no change needed).
3. **The large move-upgrade banner is replaced by a confirmation on the move itself:** "Glow Pulse upgraded to
   Lv 2: Power 40 → 43 · 10 Light essence used". The Amina, tab and scroll position stay as they are. With Reduce
   Motion or Battery saver it appears without animation.
4. All progression costs, XP requirements and economy values are preserved.

Regression: `browser-progress13a` 41 of 41 (three new checks for the confirmation), `progression13a` 40 of 40.

## 2. Phase 13B: Hatchery and breeding

### Audit
**Already complete (rules left as they are):** 30 element pairings, each giving a base form; cost 40 gold and 25
food; both parents Lv 5 or higher and kept; the Light + Dark pairing locked until the Dormant Spire wakes;
incubation 20 s (fast setting) or 5 min (normal), shortened by Hatchery level; five Hatchery levels (110, 500,
1,500, 4,000, 9,000 gold); eggs saved with the game and incubating while it is closed.

**"Every Hatchery upgrade unlocks one additional breeding slot": verified.** Slots are 1, 2, 3, 4, 5 at levels
1 to 5, and a test asserts it at every level.

**Gaps in presentation:** the screen did not name the Hatchery's state; requirements were a single sentence; the
outcome and incubation time were not shown before breeding; breeding spent resources on one tap; hatching was a
generic reveal; nothing on the island showed incubating eggs; incubating eggs wobbled continuously.

**Defects fixed:**
1. An egg could be stranded by a device clock change (a ready time weeks away). On load an egg is now never
   further away than the longest incubation.
2. A damaged save could hold two eggs in one slot, an unknown species or a slot outside the Hatchery. These are
   repaired on load; healthy eggs are not changed.
3. A newly hatched, newly discovered Amina queued two reveals. It now has one ceremony.

### What changed
* **One Hatchery screen in two columns.** Left: every breeding slot with its state, and the Hatchery's level,
  capacity, next upgrade cost and benefit ("+1 slot, faster incubation"). Right: the two parents, a checklist of
  the five requirements with exactly what is missing, the outcome, the slot it will use, the incubation time and
  the cost.
* **States named and shown:** Idle, Incubating, Fully occupied, Ready to hatch (breeding itself is instant in the
  rules, so it has no lasting state). A marker over the Hatchery on the island shows "1 / 2", "2 / 2 full" or
  "Hatch!" and opens the Hatchery when tapped.
* **Outcomes follow discovery:** a pairing already discovered shows its egg by name; otherwise it is a mystery egg.
  The recipe book lists discovered recipes and hides the rest.
* **Parent picker** marks who can breed and says why the others cannot.
* **Confirmation before anything is spent**, which can only apply once (three taps breed once).
* **Hatching ceremony:** the egg cracks and opens, then the Amina is shown with element, role, stage, level and
  stats, whether it is new to the collection ("4 of 63 forms found") and its recipe. Existing models and sounds.
* **Only a ready egg moves;** incubating eggs are still.

Tests: `hatchery13b` 41 of 41, `browser-hatchery13b` 35 of 35. They cover invalid pairs, no deduction on refusal,
five simultaneous eggs, repeated Hatch presses (no duplicate Amina), a full collection (the egg waits), upgrades
with an egg in place, reloads, older saves and the two repairs.

## 3. Phase 13C: Forge, equipment and crafting

### Audit
**Already complete (rules left as they are):**

| Area | What exists |
|---|---|
| Tabs | Crafting, Equipment, Equipment Merge, Equipment Shop |
| Items | 47: 12 lines of four tiers and three unique items. Three slots: weapon, armour, charm |
| Rarity | Tier I Common, II Uncommon, III Rare, IV Epic; unique items separately |
| Bonuses | Percentages of HP, ATK, DEF or SPD (6% to 30% in total per item), applied once |
| Crafting | 12 recipes costing gold plus food or gems (100 to 520 gold); Forge Lv 1 to 3 |
| Merging | Two of the same item make the next tier. **The result is fixed: no chance is involved.** 60, 180, 450 gold |
| Shop | 13 items, gold only (160 to 950) |
| Inventory | 150 items. Every paying action carries an operation id, so a repeat cannot pay twice |
| Restrictions | **Any item fits any Amina.** The only rules are the slot, and no changes during a dungeon run |

**Gaps:** equipping, moving and removing happened instantly with no preview of the stat change; cost was shown as
chips with no "you have" or "left"; "Not enough resources" did not say which; results appeared as pop-up toasts;
the Merge tab did not say what could be merged; owned counts were not shown. No defect was found in the rules.

### What changed
* **Equip, move and remove show the change first.** The sheet shows the item leaving the slot, the item going in,
  and HP, ATK, DEF and SPD before and after. Moving an item from another Amina also shows what that Amina loses.
  One confirmation, which applies once. The same sheet serves the Forge and the Gear tab of the details screen.
* **Equipment tab:** each Amina shows how many of its three slots are filled; stats show the part from gear; slots
  show the item's bonus and rarity; the item list filters by slot and each item shows what it would change for the
  selected Amina and who wears it. The screen states that any item fits any Amina.
* **Crafting:** each recipe is marked craftable, short ("Missing 1 gem.") or locked ("Forge Lv 3"), with "Owned ×1".
  The confirmation previews the item, what it adds to your companion, and a table of cost, what you have and what
  is left.
* **Merging:** a "Ready to merge" list (2 × Driftwood Club → Ironbound Club, 60 gold), preferring items in the bag.
  The confirmation says what is used up, the one result "every time", the bonus before and after, the gold left
  and the wearer's stats with the result.
* **Shop:** the same cards, "Need 200 more gold.", and a confirmation with the price against your gold. Gold only;
  nothing is sold for gems.
* **Results are reported in the Forge itself** beside the balances, with an "Equip it" shortcut. A new item's row
  lights once. Both are skipped under Reduce Motion and Battery saver.
* **The Forge's voxel building was not changed** (approved environment); the polish is in the interface.

Tests: `gear13c` 46 of 46, `browser-gear13c` 39 of 39. For all 47 items the preview equals the stats after
equipping and the stats the Amina fights with; a full set adds each bonus once; a dungeon run starts with the
equipped stats; 1,500 random actions keep the inventory whole; a damaged save is repaired; reloads keep everything.
`browser-dev7` was updated for the new confirmation step (30 of 30).

## 4. Phase 13D: economy findings

Method: `tools/economy-model.js` computes everything from the game's own data tables and rule functions, and
`tests/economy13d.test.js` checks its figures against really doing the thing (feeding 1 to 30, both evolutions,
eight move upgrades, crafting and merging a top-tier weapon, a full dungeon run, six practice wins).

### Sources and uses
| Resource | Sources | Uses |
|---|---|---|
| Gold | Buildings (Tide Gate, mines, habitats), dungeon battles and clears, survival, ruins, raids and practice, tasks | Buildings and upgrades, evolution, breeding, crafting, merging, shop |
| Food | Hollow, farms, dungeon battles and clears, survival, ruins, raids and practice | Feeding, evolution, breeding, some recipes |
| Gems | Moon Shrine, first clears, tasks, survival milestones, ruins (chance) | Finishing timers (1 per 6 minutes), recipes (1 to 5) |
| Essence (nine) | Dungeon and survival wins (the foe's element), ruins, a habitat switched to essence | Move upgrades only |
| Equipment | Forge, one item per dungeon first clear, survival milestones, ruins (15% charm) | Worn; merged |

Daily limit: five rewarded wins a day shared by 5v5 practice and Island Defence raids. Ruins have 30 to 60 minute
rests. Hide and Seek pays no resources. First clears, tasks and survival milestones are one-off. No other limits.

### One Amina, start to finish
| Step | Cost |
|---|---|
| Lv 1 → 12 | 1,307 XP, 190 food |
| Lv 12 → 22 | 4,842 XP, 700 food |
| Lv 22 → 30 | 8,049 XP, 1,150 food |
| Both evolutions | 220 gold, 55 food |
| Both moves to Lv 5 | 350 essence of its element |
| Top-tier set (three items, crafted and merged) | 6,670 gold, 120 food |

A dungeon run also gives each party member 414 XP (first dungeon) to 1,428 XP (last), which is not counted above.

### Scenarios (per day)
| Player | Gold | Food | Gems | Essence | Food for one Lv 30 | Essence for one Amina's moves |
|---|---|---|---|---|---|---|
| New, casual | 1,562 | 783 | 0.2 | 36 | 2.7 days | 19 days |
| New, intensive | 4,873 | 2,394 | 0.6 | 135 | 0.9 days | 5 days |
| Mid-game, casual | 18,107 | 4,287 | 54 | 48 | 0.5 days | 16 days |
| Mid-game, intensive | 55,344 | 13,069 | 163 | 202 | 0.2 days | 4 days |
| Advanced, casual | 244,714 | 33,172 | 522 | 68 | under 0.1 days | 11 days |
| Advanced, intensive | 736,799 | 100,037 | 1,566 | 293 | under 0.1 days | 3 days |

**Assumptions** (player behaviour is not known): every battle fought is won; casual is two visits, one dungeon
run, two rewarded wins and two ruin searches a day; intensive is six visits, four runs, five rewarded wins, eight
searches and one survival run; production is collected at evenly spaced visits and stops at each building's
storage limit; the building sets for each stage are examples I chose (new: two story buildings, one farm, one
mine; mid-game: two farms, two mines, two habitats at Lv 2; advanced: four farms, three mines, four habitats at
Lv 4), not measured from players; essence counts battles and ruins only. The advanced figures are the most
sensitive to the building set.

### Findings
1. **Buildings dominate income from mid-game.** Production is 69% of gold for a new player, 96% mid-game and 99%
   for an advanced player. A mid-game dungeon run pays about 500 gold against 17,000 a day from buildings, so
   battle rewards stop mattering as rewards.
2. **Gold runs out of uses.** Every building upgrade in the game totals about 185,000 gold plus habitats
   (26,600 each). A top-tier equipment set is 6,670 gold, less than half a mid-game casual day.
3. **Food is not a constraint after the first days.** A mid-game casual player earns enough food each day to take
   two Aminas from Lv 1 to 30.
4. **Gems accumulate.** Their only uses are finishing timers and 1 to 5 per recipe, against about 54 a day
   mid-game from one Moon Shrine.
5. **Essence is the real pacing resource, and it is uneven.** From battles alone, one Amina's moves take 11 to 19
   days of casual play. A habitat switched to essence makes about 580 a day mid-game, which removes the wait
   entirely for the seven elements that have habitats. **Metal and Resonance have no habitat**, so they depend on
   two dungeons (24 and 40 per run) and one ruin.
6. **Equipment is quick to finish.** Bonuses top out at 12% to 30% per item, and all three top-tier items are
   affordable soon after the Forge reaches Lv 3.

### Reward presentation
| Mode | Earned and why | Repeatable | Daily limit |
|---|---|---|---|
| Dungeons | Result groups rewards as battle, section "first clear", dungeon "first clear" or "cleared" | Shown by the label | None |
| Island Defence | Raid Preview shows the loot and "N of 5 rewarded wins left today" | Yes | Shown |
| 5v5 practice | Reward group on a win | Yes | **Was a static sentence; now shows "N of 5 rewarded wins left today"** |
| Survival | Per-wave pay explained; milestones show claimed or not | Milestones once | None |
| Ruins | Says each can be searched again after a rest, and the first search is special | Yes, with a rest | Rest timer shown |
| Hide and Seek | Points only | — | — |

The one change made here is the practice line (menu and result), tested in `browser-rewards13d` (5 of 5). The
limit itself is unchanged. "What do I need for my next upgrade" is answered by the 13A to 13C screens (feed,
evolution, move, Hatchery, craft, merge and shop shortfalls).

### Long-term progression
After Lv 30 an Amina still has move upgrades (essence) and equipment. Beyond one Amina there are 63 forms to
collect, 30 breeding recipes, 10 dungeons, endless survival with milestones to wave 20, and 19 achievements.
The gap is that gold, food and gems have nothing left to buy once buildings and one equipment set are done, and
that equipment has no step beyond Tier IV.

## 5. Proposed balance changes (none implemented; each needs your approval)

| # | Current | Proposed | Reason | Expected effect | Risk | Saves |
|---|---|---|---|---|---|---|
| 1 | Dungeon battle gold `10 + 3 × level` (+20 boss) | `20 + 8 × level` (+50 boss) | Battle rewards are 1% to 4% of income from mid-game | A mid-game run pays about 1,000 gold instead of 400 | Speeds up new players' first buildings by roughly a day | None |
| 2 | Habitat set to essence: 10% of its gold rate | 3% | One habitat removes the essence wait for seven elements | About 175 a day mid-game: two days per Amina instead of under one | Players already using it will notice the drop | None |
| 3 | Metal and Resonance: battles and one ruin only | Survival waves pay 2 (6 for a Champion) instead of 1 (3) | Two elements have no steady source | Survival becomes the route for elements without habitats | Slightly more of every element | None |
| 4 | Moon Shrine gem rate | Halve it, or leave it and add a gem use (see 6) | Gems accumulate with nothing to buy | Gems stay meaningful longer | Slower timer skipping | None |
| 5 | Feast 7 XP per food, snack 6 | No change | Food is plentiful; breeding adds new Aminas to feed | — | — | — |
| 6 | No use for gold after buildings | A design decision, not a number: for example a fifth equipment tier | Long-term goal for gold | — | New content; out of scope without approval | Depends |

Proposals 1 to 4 are independent. I would start with 2 and 3 together, since they address the same resource, and
decide 1 and 4 after you have seen how the mid-game feels on a real save. The scenario figures above are a model;
I have no data from real players.

## 6. Files changed

| File | Phase | Change |
|---|---|---|
| `src/ui-dev8.js`, `src/ui-p13.css` | 13A | Move-upgrade confirmation in place |
| `src/hatchery.js` (new) | 13B | Read-outs: state, pairing, upgrade, recipes; egg repair |
| `src/ui-p13b.js`, `src/ui-p13b.css` (new) | 13B | Hatchery screen, confirmation, hatching ceremony |
| `src/island-art.js`, `src/ui-world.js`, `src/ui.js`, `src/state.js`, `src/roster.js` | 13B | Island marker, badge count, one ceremony per hatch, repair on load, role on each line |
| `src/gear-view.js` (new) | 13C | Read-outs: equip, remove, craft, buy and merge previews; inventory check |
| `src/ui-p13c.js`, `src/ui-p13c.css` (new) | 13C | Equipment preview sheets, Gear tab, result line |
| `src/ui-forge.js` | 13C | The four tabs |
| `src/ui-pve.js` | 13D | Rewarded wins left, on the practice screen and result |
| `tools/economy-model.js` (new) | 13D | The model (not loaded by the game) |
| `index.html` | all | New scripts and stylesheets |
| `tests/` | all | Seven new suites; `browser-dev7` and `browser-progress13a` updated; `run-all.js` |

Saves: nothing is added to the save format. The only load-time change is the egg repair.

## 7. Tests

| Suite | Result |
|---|---|
| `progression13a` / `browser-progress13a` | 40 of 40 / 41 of 41 |
| `hatchery13b` / `browser-hatchery13b` | 41 of 41 / 35 of 35 |
| `gear13c` / `browser-gear13c` | 46 of 46 / 39 of 39 |
| `economy13d` / `browser-rewards13d` | 14 of 14 / 5 of 5 |

**Complete suite on the final build** (36 suites, run one at a time with nothing else running): **1,183 of 1,183
passed, no failures.** This includes the Phase 7 arena check that failed in the Phase 13A run; it is
timing-sensitive and passed this time.

The complete suite was run once, on the final build that contains every phase. After each phase I ran that
phase's suites and the suites touching the same code, not the whole suite. A complete run started after 13C was
stopped because I was recording clips at the same time, which made a timing-sensitive performance suite
(`browser-perf-fix`) fail 4 of 23; the same suite passed 23 of 23 in the clean final run.

## 8. Screenshots and recordings

`docs/ui/screens13/`:
* `before/` — Hatchery (`h00` to `h09`) and Forge (`f01` to `f09`) as they were.
* `after-hatchery/` — 14 stills: idle, picking parents, pair ready, confirmation, incubating, full, island markers,
  ready, hatching, new and repeat reveals, recipe book, not enough resources.
* `after-forge/` — 13 stills: the four tabs, each confirmation, the equip and move previews, the Gear tab.
* `hatchery-flow.mp4` (52 s, including loading) — choose two parents, confirm, incubate, hatch, reveal.
* `forge-flow.mp4` (44 s, including loading) — craft, equip with preview, buy, merge.

Recordings are of desktop Chromium, not a phone.

## 9. Performance observations

* Every new effect is one-off and under a second; nothing loops. Incubating eggs no longer animate, which removes
  a continuous animation that existed before.
* Reduce Motion, Battery saver and a resting island switch the effects off; the same information appears at once.
* The Hatchery countdown and island marker use the game's existing once-a-second tick and island redraw; no new
  timers run in the background.
* No new images, models or sounds are loaded. Six small files were added to the page (about 70 KB in total, uncompressed).
* Frame rate was not measured on a phone. The battle and island performance suites pass as before.

## 10. Known limitations

* **Not tested on an iPhone.**
* The Forge and Hatchery buildings themselves are unchanged; only their screens and the island marker are new.
* The Equipment tab's slot buttons sit just below the fold at 390 px high and need a short scroll.
* Result lines stay for six seconds and there is no history of past actions.
* The economy scenarios rest on the assumptions listed in section 4.
* The 13A move-upgrade confirmation has no before-and-after screenshot in this set.
