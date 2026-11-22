# Phase 16B — Interface and quality-of-life polish

Branch `p16b-ui-polish`, made from `p16a-onboarding` at `311a3b6`. Before branching I checked that the local and
remote heads matched and the working tree was clean. `main` is untouched at `0fc9e36` and nothing is merged.

The Phase 15 and Phase 16A switches are unchanged and still off by default; the new opening is not turned on. Phase
16B changes are refinements that apply to everyone on this branch.

## 1. What changed

### Save protection: export, import, undo (Settings › Your save)

- **Export save file** writes the complete save into a small JSON file named after the player and the time, for
  example `aminas-save-Rowan-20261122-0415.json`. On an iPhone it opens the share sheet ("Save to Files"); elsewhere
  it downloads.
- **What the file holds:** what it is, the game and save versions, the export time, a checksum, a short summary and
  the save itself.
- **Import save file** checks the file in a dry run first; nothing changes until the player confirms. It accepts:
  - this export format;
  - a raw save (the JSON the game stores);
  - the existing `AMINAS1:` backup codes.

  Older save versions are migrated exactly as on load.
- **Refused safely, with a plain reason:** empty, cut-short or damaged files; unrelated JSON; files edited after
  export (checksum); files or saves from a newer game version; saves with no game in them; files over 4 MB. Nothing
  is changed when a file is refused.
- **Confirmation** shows what is in the file beside the current game: name, rank, Aminas, strongest, gold, dungeons
  cleared, last saved.
- **Recoverable backup:** before replacing anything, the current save is copied into its own recovery slot.
  Ordinary saving never overwrites that slot (unlike the existing backup slot, which rotates on every save).
  **Undo last import** puts it back and keeps the replaced game the same way, so undo can be undone.
- **The existing backup-code restore** now goes through the same checks and confirmation instead of replacing the
  game at once.
- **No schema change, and no cloud or accounts.** The only new storage is the recovery slot, under its own key.

### Dialogue

- **Text size:** Standard, Large (+18 %) or Larger (+38 %), in Settings › Dialogue text size, or with the new **Aa**
  button on every dialogue panel: the original panel, the v7 panel, the Phase 16A panel and story scenes. It applies
  at once and is saved.
- **Instant text speed** joins Slow, Normal and Fast, in Settings and in the Phase 16A panel's Speed button. Every
  line appears at once.
- **Larger text never covers buttons.** The panel grows upwards but stops below the controls and scrolls inside
  itself.
- **A pre-existing overlap fixed.** The v7 controls sat at a fixed height above the panel, so a long line at the
  standard size already slid the panel under Skip. The controls now follow the panel's actual top edge.
- Existing animations, Auto, Skip and Reduce Motion behaviour are unchanged.

### Quest and objective tracking

**The discrepancy:**

- After the first Forgotten Road battle, the Phase 16A handoff told the player to finish the road. The task pill
  showed "Clear the Way" instead.
- The reason: the pill showed the first unclaimed, unlocked main quest in list order, and "Clear the Way" is listed
  before "The Forgotten Road". Both quests were open.

**The fix (display only):**

- A main quest whose dungeon the player is partway through is tracked first. "Partway through" means a run in
  progress, or battles won but the guardian not yet beaten. The quest stays first, ready to claim, once its dungeon
  is cleared. After it is claimed, the normal order resumes.
- The pill shows where you are: "Clear the Forgotten Road · Battle 4 of 10". Its Go button and the dungeon list
  point to the same place.
- The Phase 16A handoff now says "The road is pinned top left, with your place in it" when that is true.

Quest order, unlock rules, rewards and saved quest states are untouched. With no dungeon in progress, the tracked
quest is exactly the old rule's at every step of the main chain (tested).

### Touch, readability, consistency, transitions, feedback

- **Hit assist.** A tap that misses every control but lands within the margin that would make a small control
  44×44 activates the nearest one in the same panel. Nothing looks different.
  - It never applies to taps on the island or battle canvases, or to a panel's dimmed backdrop (which still closes
    the panel), or to disabled controls.
  - The HUD's round buttons (Ask, Settings, companion arrows) get a larger invisible touch area.
- **Pressed states** for pills, tabs, chips, hub cards, dungeon rows and forge items, which had none. There is also a
  visible keyboard focus ring.
- **Refusal feedback.** When the game refuses an action (its own "no" sound), the pressed control gives a short shake.
- **Panels close with a 150 ms fade** instead of vanishing. The panel leaves the game at once, exactly as before; an
  inert copy with no ids or actions fades underneath. There is no fade with Reduce Motion or Battery Saver, or for
  panels holding a 3D view.
- **Readability.** The smallest labels grow:
  - most to 10.5 px: chips, levels, XP, hatchery and forge notes, dungeon numbers, task-pill captions, settings
    segments and the Phase 16A starter labels;
  - tightly packed ones to 9.5 px (bottom-bar names, move power numbers) so they still fit their unchanged buttons.

  Battle party names were left at their size: at 9.5 px "Lumifern" was cut off.
- **Scrolling.** Panel bodies keep their scroll inside (no page bounce).

## 2. Measured interface audit (desktop Chromium, software WebGL, 844×390; not an iPhone)

`tools/ui16b-audit.js` opens 13 screens. On each it counts:

- controls whose reachable touch area is under 44×44, probing points around each control, so the hit assist counts
  only where a tap really reaches the control;
- visible text under 10.5 px;
- clipped panels.

Results are in `docs/ui/screens16b/audit-*.json`. Screenshots are in `docs/ui/screens16b/before-*.jpg` and
`after-*.jpg`.

| Screen | Controls | Under 44×44, before | After | Text under 10.5 px, before | After |
|---|---|---|---|---|---|
| Island | 16 | 8 | 6 | 15 | 7 |
| Settings | 27 | 19 | 15 | 14 | 6 |
| Collection | 57 | 28 | 21 | 75 | 41 |
| Creature details | 33 | 25 | 20 | 25 | 8 |
| Hatchery | 24 | 14 | 9 | 39 | 31 |
| Forge | 25 | 17 | 10 | 23 | 7 |
| Bag | 18 | 10 | 8 | 15 | 6 |
| Battle menu | 20 | 10 | 8 | 16 | 6 |
| Dungeons | 27 | 19 | 8 | 39 | 9 |
| Journal | 18 | 10 | 8 | 15 | 6 |
| Profile | 21 | 13 | 8 | 38 | 6 |
| Dialogue | 18 | 10 | 8 | 15 | 7 |
| Battle | 7 | 1 | 0 | 14 | 9 |
| **Total** | | **184** | **129** | **343** | **149** |

The counts include the HUD buttons behind each panel.

- **Six HUD pills stay under 44 over the island:** the avatar, rank, island name and wallet pills. The hit assist
  deliberately does not act over the island, because a near-miss there belongs to the island, and enlarging the
  pills would change the HUD's look.
- **Closely stacked chip rows and tabs** (the collection filters, creature-detail tabs and animation buttons) cannot
  each reach 44 without new spacing.
- **The packed labels set at 9.5 px** (bottom-bar names, move power) still count as small text.

The Hatchery keeps its original small notes. Its panel is laid out to fit one landscape screen exactly (a tested
requirement), and the larger labels made it scroll (section 6).

## 3. Phase 16A follow-up

- The opening and its switch are unchanged; it is still off by default.
- Readability: the starter cards' small labels, the "1 of 2 / 2 of 2" tags and the prologue tag are now 10.5 px. The
  coach callouts are 13 px with a larger Entity icon.
- The handoff now matches the tracked quest (above).
- First-battle preparation, monster stats and battle difficulty are unchanged.

## 4. Memory-release check: the approved warm-up round

`browser-arena7` now runs one unmeasured round first and then measures three rounds, exactly as before: the same
threshold, comparing the geometry count after each measured round. It logs the warm-up and measured values,
template count and textures.

It cannot hide real growth: anything a battle retains still adds up across the three measured rounds. See section 6
for the runs.

**Results:**

- Isolated run 1: warm-up 14 geometries (4 templates), then 17, 17, 17 (5 templates). This is exactly the case that
  used to fail: the cache filled one round late, and now that happens in the warm-up.
- Isolated run 2: warm-up 17, then 17, 17, 17.
- Full run: passed (30 of 30).
- Geometries, templates and textures (3) stayed level across every measured round. **No continuing memory growth
  was seen.**

## 5. Dev 8 and onboarding timeouts

**Dev 8**

I ran the suite on its own and with three CPU-saturating processes alongside it (`docs/ui/screens16b/logs/`).

- **Under load it failed 2 of 2 times, on the wallet tap.**
  - Playwright logged the button as visible, enabled and stable, then the tap did not complete within the suite's
    8-second limit.
  - The page's main thread was saturated by software-rendering the 3D island on a busy CPU. This is test-machine
    contention, not a game fault. It is also the Phase 16A full-run failure.
- **On its own it failed 1 of 1 time, on "Customisation reopens the creator and saves the change".** This check also
  failed on unchanged Phase 15D code.
  - An instrumented rerun showed the game doing the right thing: the draft outfit stepped 0 → 1, and the saved
    outfit is 1.
  - The check waits a fixed 600 ms and also requires the HUD hint dot to be gone, so a slow repaint fails it.
- **In this phase's full run it passed 42 of 42.**

Both are fixed waits in the test. Turning them into "wait until the condition holds" is a test-timing change, so I
have left it for your approval.

**The Phase 16A onboarding suite** passed 69 of 69 on its own and 69 of 69 under the same load. Its earlier stop was
a test bug fixed in 16A, and it has not recurred.

## 6. Full regression

**One complete run of all 47 suites** (the 45 from Phase 16A plus the two new ones), and **every suite ran to the
end** (`docs/ui/screens16b/full-suite-16b.log`). That is the complete run that Phase 16A could not get.

**Result: 1,573 of 1,576 checks passed; 3 failed, in three suites.**

- **`browser-hatchery13b`, "the whole screen fits a phone in landscape without scrolling": caused by Phase 16B, now
  fixed.**
  - The larger small labels made the Hatchery panel 12 px taller than the screen (content 284 px in a 272 px panel).
  - The Hatchery's notes now keep their original size; the rest of the readability change is unchanged.
  - Rerun on its own: 35 of 35.
- **`browser-combat15c`, "the camera … returns to the battle view": intermittent, also fails on Phase 16A code.**
  - The check needs the camera's leftover focus under 0.05 at the end of a sequence.
  - Phase 16B code: failed in the full run (0.056), then 1 of 4 isolated runs failed (0.058) and 3 passed (0.048,
    0.030, 0.029).
  - Unchanged Phase 16A code, the same day: failed 3 of 3 (0.077, 0.055, 0.076).
  - Phase 16B changes nothing in combat. This is a timing-sensitive end sample, new to the list of intermittent
    items. Logs: `logs/c15-*`.
- **`browser-polish16b`, "Instant shows the whole line at once": a weakness in the new test, now fixed.**
  - The check read the first dialogue box on the page, which in the full run could be an earlier box still fading
    out.
  - It now reads the newest box and reports the lengths it saw. Rerun on its own: 34 of 34.

**Carried-forward items in this run:**

- `browser-arena7`: 30 of 30, with the warm-up round.
- `browser-perf-fix`: 23 of 23. The five simulated slow-device checks did not fail, but they are not fixed.
- `browser-dev8`: 42 of 42.
- `browser-onboard16`: 69 of 69.

No thresholds were changed. The arena7 warm-up round was approved and keeps its threshold.

## 7. Known limitations and outstanding issues

- **Not tested on an iPhone,** in particular the share-sheet export, importing from Files or iCloud Drive, and how
  the hit assist feels under a finger.
- **Downloads in the preview.** The claude.ai preview frame blocks downloads, so Export there only offers Copy save
  text. A page cannot confirm the browser kept a file, so the export sheet says what it asked for rather than
  claiming success.
- **Touch targets still under 44×44:**
  - six HUD pills over the island;
  - closely stacked chip rows and tabs;
  - battle party names, which keep their small size.
- **One recovery copy** is kept, from the latest import or undo.
- **Intermittent tests:**
  - `browser-combat15c`'s camera end sample (new to the list; also on 16A code);
  - Dev 8's fixed waits;
  - the slow-device checks.
- **Decisions for you:**
  - whether the opening becomes the default (still off);
  - condition-based waits in Dev 8 (and, if wanted, in the combat camera check). These are test-timing changes, so
    they need approval.
