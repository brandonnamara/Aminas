# Phase 17D — Replayability and gameplay polish

Branch `p17d-replayability`, from Phase 17C (`f0b9308`). Production `main` (`0fc9e36`) is untouched; the Phase 16A
opening stays off by default. Measured in Node simulations of the real rules and in Chromium (Playwright, software
WebGL, an 844×390 touch viewport). **No physical iPhone testing was done.** XP, combat balance and existing rewards
are unchanged.

Reproduce: `node tools/p17d-sim.js` (challenges, starter guidance, reward totals; ~4 s). Raw results: `docs/audit17d/`.
Rules: `src/replay17d.js`. Interface: `src/ui-replay17d.js`, small additions in `src/ui2.js`, styles at the end of
`src/ui-polish16b.css`.

## 1. Daily tasks

- Three optional tasks a day, in a new "Today's tasks · optional" section at the top of the existing **Tasks** sheet
  (same rows, Claim and Go buttons). The Tasks badge counts the ones ready to claim.
- They appear once the Forgotten Road is cleared, so the opening is unchanged.
- The pool uses things the player can already do, and each task is offered only when it is possible right now:

| Task | Needs | Reward |
|---|---|---|
| Win 3 dungeon battles (replays count) | an open dungeon | 90 gold, 15 food |
| Feed your Aminas twice | an Amina | 50 gold, 20 food |
| Collect from your buildings 3 times | a producing building | 60 gold, 20 food |
| Upgrade a move | an upgrade you can afford now | 80 gold |
| Hatch an egg | the Hatchery and two Aminas of level 5+ (or an egg) | 70 gold, 25 food |
| Win an Island Defence raid | three Aminas | 90 gold |
| Explore 3 times | an open area | 50 gold, 15 food |
| *Claim all of a day's tasks* | | *2 gems* |

- A day pays at most 260 gold, 65 food and 2 gems. Single tasks never pay gems; no paid currency exists.
- **No compulsory login, no punishment**: there are no streaks; a task finished but not claimed can still be claimed
  on a later day (up to three are kept); an unfinished one simply lapses.
- **No duplicate claims**: each claim is recorded in the save and checked again; a second tap, a reload or an old task
  pays nothing.
- **Interruptions**: the day's tasks and progress are stored in the save (`st.d17`), so closing the app keeps them.
- Progress comes from events the game already emits (battle won, fed, collected, move upgraded, hatched, explored) plus
  one new event for a won Island Defence raid.
- **Clock**: days follow the device's local date and never go backwards. Turning the clock back keeps today's tasks
  and cannot re-open earlier claims. Turning it forward does give new tasks (see limitations).

## 2. Codex milestones

- In the Tasks sheet ("Codex milestones"), showing what is ready and the next goal of each kind; a **Milestones**
  button beside Bag in the Creature Collection opens it there.
- Read from the Codex (`st.owned`), which releasing a duplicate never touches, so discoveries are never lost.
- Only species that can be obtained count (a starter, an area that exists, a playable dungeon, a pairing, or evolved
  from one of those). Today all 63 can be; a test entry that cannot be obtained is not counted.

| Track | Milestones (reward) |
|---|---|
| Species befriended | 5 (100 gold, 1 gem) · 10 (150, 2) · 25% (250, 3) · 50% (400, 5) · 75% (600, 8) · 100% (1,000, 15) |
| Evolved forms (42 in all) | 1 (80, 1) · 5 (200, 2) · 15 (400, 4) · 30 (700, 6) |
| Complete evolution lines (21) | 1 (150, 2) · 3 (300, 3) · 7 (500, 5) · 14 (800, 8) · all (1,200, 12) |

- All fifteen together: 77 gems and 6,830 gold, once each. For comparison, quests, first clears and Survival already
  give about 300 gems once.
- Existing saves find the milestones they have already reached ready to claim (once).

## 3. Dungeon challenges

- For a **full replay (from battle 1) of a dungeon already cleared**. First clears and "Fight the boss again" never
  count, and the normal replay rewards are unchanged.
- Shown on the cleared dungeon's card ("Optional challenges · replay from battle 1 · each pays once"), in the party
  picker for a replay (with whether this party qualifies for One element), and on the result card.

| Challenge | Goal |
|---|---|
| Flawless | No Amina faints in any of the ten battles. |
| One element | The party is three Aminas of one element. |
| Answer the guardian | Blunt the guardian's charged move (guard it, soak it or stun it), then win. On the Forgotten Road, whose guardian has a barrier instead: break the barrier with a special move. |

- Each pays 100 gold and 6 essence of the dungeon's element once; all three in a dungeon add 2 gems once. Starter
  Island in total: 3,000 gold, 180 essence, 20 gems, once. Nothing repeats, so there is no farming.
- A run already under way when the update arrives is not judged.

How often a replay meets them (100 runs each, Lumifern, Cannonis and Emberix playing tactically; the guardian column
also shows a player who plays for it):

| Dungeon (rec.) | Flawless at rec / +3 / +6 | Guardian answered, normal play / playing for it (rec, +3, +6) |
|---|---|---|
| Forgotten Road (4) | 0 / 100 / 100 | 100, 42, 100 / 100, 42, 100 |
| Gathering Hall (5) | 0 / 100 / 100 | 68, 0, 0 / 100, 100, 100 |
| Reliquary (6) | 0 / 1 / 100 | 37, 0, 0 / 100, 100, 100 |
| Drowned Steps (8) | 0 / 100 / 100 | 30, 0, 0 / 100, 100, 100 |
| Cold Kiln (10) | 0 / 95 / 100 | 27, 0, 0 / 87, 100, 100 |
| Hollow Veil (12) | 0 / 0 / 100 | 36, 0, 0 / 100, 100, 100 |
| Lantern Orchard (14) | 0 / 100 / 100 | 53, 0, 0 / 100, 100, 100 |
| Windstair (16) | 0 / 100 / 100 | 15, 0, 0 / 100, 100, 100 |
| Resonance Scar (18) | 0 / 100 / 100 | 12, 0, 0 / 100, 100, 100 |
| Heartwood (20) | 0 / 100 / 100 | 70, 0, 0 / 100, 100, 100 |

- Flawless is a goal for a stronger party (a few levels over); the Reliquary and Hollow Veil need about six.
- The guardian challenge needs deliberate play: an over-levelled party that just attacks finishes the guardian before
  it charges. Holding back and guarding (or soaking) when the countdown reaches the charge works in every dungeon.
- One element: at least one of the Nature, Water or Fire trios clears every dungeon at its recommended level.

## 4. Early-game team guidance

- The party picker now says, without blocking anything:
  - one Amina picked while owning more: "You can bring up to three. A second Amina takes hits while the first
    recovers, and covers more elements."
  - one Amina owned: "A lone Amina has no one to switch to when it tires. Explore finds new Aminas (the Sunlit Meadow
    has two near the start), and the Hatchery breeds more. A party of three makes guardians much easier." with an
    Explore button.
- XP and combat are unchanged. Simulated Starter Island campaign, starter only and no feeding (3 seeds):

| | Losses | Grinding replays | Battle minutes | End level |
|---|---|---|---|---|
| Lone starter (17C and 17D identical) | 7.3 | 3 | 32 | 23 |
| Following the advice: Acinus and Gaiaroki from the Meadow (Lv 2) before the Gathering Hall | 0.3 | 0 | 24 | 22 |

## 5. Releasing duplicates: checked again on release

- Every protection is checked at the moment Release is pressed, not when the sheet opened (favourite, gear, team,
  building, run, companion, last of its kind, legendary).
- The sheet also sends what it showed; if the Amina changed meanwhile (for example it levelled up, so it would give
  different essence) the release is refused: "It changed since you opened this. Have another look."

## 6. Moon Shrine reliability

| Case | Result |
|---|---|
| Six hours at Lv 4 | 18 gems, the day's limit |
| Collect three times in a row | pays 18 once |
| Save and reload the same day | the day's count is kept; no restart |
| Clock three days forward, collect, clock back | three days paid once; the shrine then waits until real time passes where the clock had been; nothing is paid twice |
| A stored day later than the clock's (time-zone jump back) | the count is not reset |
| Sixty days away | a full store (244), never more |
| Clock turned back with gems stored | the stored gems stay |

Changes: a building with a daily limit never rewinds its clock, and a day never comes back. Other buildings are
unchanged.

## 7. Tests

- `tests/replay17d.test.js` (new, 70 checks): daily reset, availability, claims, carry-over, clock back and long
  absences; Codex milestones, release and obtainability; challenges (pays once, partial and first clears excluded,
  normal reward unchanged, guard detection in a real battle, older runs not judged); advice; release re-checks; Moon
  Shrine cases above.
- `tests/browser-replay17d.test.js` (new, 15 checks, screenshots in `docs/ui/screens17d/`).
- Changed existing check: `rewards17b` ("full replay" reward) now subtracts any challenge reward, which is paid
  separately; the replay reward it checks is unchanged.
- Small fix: the 17C gem buttons now show their gem icon (they used a missing icon helper).
- New saves include an empty Phase 17D record (`d17`); older saves start without one and gain it when needed.

## 8. Full regression

**Final run: 1,822 passed, 1 failed (55 suites)**: `docs/audit17d/regression-run2.log`.

- The one failure is `browser-dev7` "the Forge closes", the intermittent check already reported in Phase 17C (it waits a
  fixed 300 ms after closing). Rerun alone five times: it failed once. Nothing in 17D touches the Forge. Not changed.

The first full run (`regression-run1.log`) had 1,817 passed and 6 failed:
- `browser-ui6` and `browser-arena7` (1 each): "saves are unchanged: no new fields". The new Phase 17D record (`d17`)
  appeared as an unknown field. It is now part of a new game's defaults (`state.js`), so it is a known field; both
  suites then passed alone and in the second full run. Their checks were not changed.
- `browser-perf-fix` (4): the timing-sensitive frame-rate checks that also fail now and then on the 17B code; they
  passed in the second full run.
- `docs/ui/screens15d/status-chips.png` is rewritten by a test run and was restored before committing.

## 9. Known limitations

- Turning the device clock forward brings the next day's tasks early. Each day still needs the tasks played, and a day
  pays at most 260 gold and 2 gems; there is no server time to check against.
- Other buildings (gold, food, essence) still rewind their clock when the device clock goes back, as before; only the
  Moon Shrine was hardened.
- Flawless and the guardian challenge depend on party level and deliberate play (section 3).
- The simulated players are scripted; real players will differ. Battle minutes are battle time only.
- `browser-dev7` ("the Forge closes") and `browser-perf-fix` remain intermittent; fixing their waits is a test-only
  change I recommend but did not make.
- No physical iPhone testing.
