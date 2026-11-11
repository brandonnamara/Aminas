# Aminas · Phase 13A: Monster progression refinement

**Branch:** `p13a-progression`, created from `hs12c-controls` (Phase 12C), which it keeps. Production (`main`,
`0fc9e36`) is untouched. Island Defence, Hide and Seek and 5v5 are not modified.

**No balance or economy change.** Levels, experience, feed costs, stat growth, evolution requirements and costs,
move-upgrade costs and effects, and battle calculations are exactly as they were. This phase changes how progression
is shown and fixes three presentation defects.

All testing is desktop Chromium with software graphics at 844×390. Nothing here was tested on an iPhone.

## 1. Audit: what exists

### Fully implemented (left as it is)
| System | How it works today |
|---|---|
| Levels and experience | Levels 1 to 30. XP to the next level is `16 + 8·Lv + 1.2·Lv²` (25 at Lv 1, 216 at Lv 10, 1,257 at Lv 29). Extra XP carries over a level-up. |
| XP sources | Feeding, and won dungeon and survival battles (half for a fainted Amina). |
| Feeding | Berry Snack: 3 food for 18 XP. Honey Feast: 10 food for 70 XP. Refused at Lv 30 and when food is short, with nothing spent. |
| Stats | HP, ATK, DEF, SPD. Each level adds 11% of the form's base stats. Equipment adds a percentage on top. |
| Evolution | 21 lines of three forms (63 forms), named Name, Name II, Name III. Stage 1 → 2 at Lv 12 for 60 gold and 15 food; Stage 2 → 3 at Lv 22 for 160 gold and 40 food. Never automatic: the player confirms. Level, XP, equipment, move levels and home are kept. Blocked during a dungeon run. |
| Move upgrades | **The five-level system is fully implemented** (since Dev 8). Each Amina has two moves (basic and signature), each Level 1 to 5. Upgrades cost essence of the move's element: 10, 25, 50, 90 (175 for one move, 350 for both). Damage moves gain power (×1.08, 1.17, 1.27, 1.38), guard moves block more (50% → 70%), healing moves heal more (25% → 40%). Levels belong to the slot and carry through evolution. A stale or repeated tap cannot spend twice. Battles read the same levels. |
| Currencies | Gold, food, gems, and nine elemental essences (dungeon and survival wins, ruin searches, habitats set to essence). |
| Equipment | Forge items in slots, bonuses applied once to stats and battles. |
| Saves | An Amina is `uid, sp, lv, xp`, plus `mv` (move levels) and `gear` once used. |
| Details screen | Tabs (About, Battle, Moves, Gear, Growth), a live 3D viewer, and in-place updating since Phase 8: feeding already kept the screen, tab and scroll. |

### Gaps in presentation (addressed in this phase)
* **Level and XP were at the bottom of the screen**, in the "Your Lumifern" list under the tabs. The top of the screen showed no level at all.
* **Feed buttons said only "Snack 3" and "Feast 10":** no unit, no benefit, nothing about food in hand.
* **The green stat numbers were unexplained**, and equipment's share of a stat was not shown.
* **A level-up was a full-screen banner** over whatever was open.
* **"Not enough food" was a small floating label** that vanished.
* **Growth showed only "Lv 11 / 12"** and one sentence: no cost, nothing about what is still missing, no stat change.
* **The evolution prompt and ceremony did not say what changes:** no stats, no new move.
* **Moves showed only the current and next level**, not all five.

### Genuine defects (fixed)
1. **The next story line started during the evolution ceremony.** When evolving from the "ready to evolve" notice,
   the prompt reported "finished" twice (once on closing, once after evolving). The Entity's remark then opened over
   the ceremony and covered its button. It now reports once. *(`src/ui-v07.js`)*
2. **The level-up banner landed on top of the "ready to evolve" prompt** when a feed reached the evolution level.
   The prompt now waits until the level-up has been shown.
3. **The level-up banner left out SPD and ignored equipment.** It now lists all four stats, with equipment.

### Incomplete or missing
Nothing in the progression rules is half-built. These are absent by design so far, and I have not added them:
* No way to upgrade a move several levels at once, and no confirmation step before an upgrade.
* No XP-sharing, no way to move levels between Aminas, no reset of move levels.
* No in-game list of where each essence comes from beyond the wallet's one-line descriptions.

## 2. What changed

### Details screen: a progression strip under the name
Always visible at the top, on every tab, for the Amina being shown:
* **Level and XP:** "Lv 11", a bar, and "219 / 249 XP · 30 to Lv 12".
* **Feed buttons with cost and benefit:** "Berry Snack · 3 food → +18 XP", "Honey Feast · 10 food → +70 XP · Lv 12" when
  the feed would level it up. The food in hand is beside them.
* **One status line** that normally says how far evolution is ("Evolves at Lv 12 (1 level, 30 XP to go).") and
  reports each feed where the player is looking.

With several of the same species, the strip shows one of them; tapping another in the list below switches to it,
and the page stays on that one when it is redrawn.

### Feeding and levelling
* **XP gained:** "+18 XP · 3 food used" in the status line. The bar slides to its new length.
* **Level-up:** the bar fills to the end, then starts the new level from empty. The status line reads "Level up! Lv 11
  → 12 · HP +5 · ATK +1 · DEF +1 · SPD +1", the level number pops once, the stat tiles flash once, and there is the
  level sound with a small burst on the portrait. No full-screen banner on this screen.
* **Not enough food:** "Not enough food: Honey Feast needs 10, you have 2 (8 short). Berry farms and rewards give
  food." The button also shows "need 8 more" before it is pressed. Nothing is spent.
* **Highest level:** "Max level", feeds switched off, no "next level" gains.
* The screen stays open, on the same Amina, tab and scroll position (the page is updated in place, not rebuilt).
* Feeding the companion from the island keeps its banner, now with SPD.

### Stats (Battle tab)
Each stat shows its value, the gain at the next level, and the part that comes from equipment, with a caption:
"Stats at Lv 12. Green: gained at Lv 13. Included from equipment."

### Evolution
* **Growth tab:** a requirements card for the next form.
  * Level, with levels and XP still to go.
  * Gold and food, with what the player has and how much is short ("40 food (you have 5, 35 short)").
  * The stat change at the same level and equipment (HP 143 → 187 +44, and so on).
  * The move that changes.
  * An Evolve button once the level is reached.
* **Prompt:** the same stat change and move line, so the decision is informed.
* **Ceremony:** unchanged in its glow, flash, models and sounds. When the new form appears it now shows "Stage 2 of
  3 · Lv 12 kept", the four stats before → after, "New move: Radiant Burst (Lv 1, Power 70) replaces Sun Sprout", and
  when it can evolve again. The new form's own voice plays where it has one. It fits a phone screen with its button.
* **Undiscovered forms stay hidden.** Where the next form's name is "???", its new move is described as "A new
  signature move" until the form has been met. Stat changes are shown either way.
* **No duplicate evolution.** A double tap on Evolve evolves once: one charge, one reward, no skipped stage.

### Moves
Each move shows all five levels in one track: the effect at each level, the essence cost of each upgrade, the
current level outlined and the next one marked. When essence is short it says how much more is needed and where it
comes from.

### Performance and motion
* All effects are one-off and under a second. Nothing loops and nothing runs in the background.
* Reduce Motion, Battery saver and a resting island switch the animations off; the numbers still update and the same
  messages appear.
* No new timers beyond the few seconds a status message stays up.

## 3. Decisions for you
1. **Feed buttons moved to the top of the details screen.** The list at the bottom keeps its compact Snack and Feast
   buttons. Say if you would rather have only one place to feed.
2. **How much to reveal about an undiscovered next form.** I show its stat gains but keep its name and new move
   hidden. The alternative is to hide the numbers too until it is discovered.
3. **Move-upgrade banner.** Upgrading a move still shows the large "Glow Pulse · Lv 2" banner from Dev 8, which now
   sits over the strip for two seconds. I left it alone; it could become an in-place message like feeding.
4. **Economy, for information only (nothing changed).** By feasts alone:

   | Levels | XP | Food |
   |---|---|---|
   | 1 → 12 | 1,307 | 190 |
   | 12 → 22 | 4,842 | 700 |
   | 22 → 30 | 8,049 | 1,150 |

   A feast gives 7 XP per food and a snack 6. Fully upgrading one Amina's two moves costs 350 essence of its
   element. Any change to these would be a balance change and needs your approval.

## Files
| File | Change |
|---|---|
| `src/progression.js` (new) | Read-outs with no side effects: level, stats, feed preview, evolution preview and result, move track. |
| `src/ui-p13.js`, `src/ui-p13.css` (new) | The strip, in-place feed feedback, stats, evolution card and results, move track. |
| `src/ui.js` | Details screen uses the new parts; level banner lists SPD and equipment; the ceremony receives the Amina. |
| `src/ui-v07.js` | Evolution prompt shows the changes; the double "finished" fix. |
| `src/ui-dev8.js` | Move panel shows the track and the essence shortfall. |
| `index.html` | The new script and stylesheet. |
| `tests/progression13a.test.js`, `tests/browser-progress13a.test.js` (new), `tests/run-all.js` | Tests. |

No save change: nothing is added to the save, and older saves read and feed normally.

## Screenshots
`docs/ui/screens13a/compare/`: seven before-and-after pairs (Battle, Growth, Moves, level-up, evolution prompt,
evolution ceremony, not enough food). `before/` and `after/` hold the full sets.

## Tests
All in desktop Chromium with software WebGL, emulating an 844×390 touch screen. Not an iPhone.

**New suites**
* `tests/progression13a.test.js` (40 checks, rules): **40 of 40**.
* `tests/browser-progress13a.test.js` (38 checks, on screen): **38 of 38**.

| What you asked to be verified | Result |
|---|---|
| Feeding and resource deductions | Pass. Exact food taken per feed; nothing spent when food is short or at Lv 30; 1 → 12 by feasts costs what the XP table says. |
| Experience and level calculations | Pass. XP table and cap unchanged; carry-over across a level-up; what a feed button promises equals what the feed does on 400 random Aminas. |
| Stat progression | Pass. Growth per level unchanged; the gain shown for the next level is the real gain; equipment's share is shown and is what the Amina fights with. |
| Evolution requirements and results | Pass. Refused below the level, without the cost, and during a run; all 42 evolutions give the form, stats and moves their preview shows; level, XP, gear and move levels kept; a repeated or double-tapped Evolve charges and rewards once. |
| Attack-move upgrade data | Pass. Five levels, costs 10, 25, 50, 90; four upgrades cost exactly the 175 shown; stale taps and missing essence refused; battles read the same levels. |
| Details screen persistence | Pass. After feeding: same overlay, same Amina, same tab, same scroll position, same 3D viewer element. |
| Save/load compatibility | Pass. Nothing added to the save; a saved and reloaded game reads the same; an Amina from an older save (no move levels or gear) reads and feeds normally. |
| Existing battle and monster functionality | Pass. Battle fighters built as before; the roster, showcase and Phase 8 details suites pass unchanged. |

**Full suite** (30 suites, one at a time): **999 of 1,000 passed.** The one failure is the Phase 7 arena check
"leaving battles frees their arenas", the known timing-sensitive one. Run alone afterwards it passed 30 of 30.

## Limitations
* **Not tested on an iPhone.**
* **The move-upgrade banner still overlaps the strip** (decision 3).
* **The level-up message lasts about four seconds** and is then replaced by the usual status line; there is no log of
  past feeds.
* **The strip adds about 60 px** above the tabs, so on a phone the lower half of each tab needs a short scroll.
