# Phase 17B — Combat and dungeon refinement

**Branch and scope:**

- Branch `p17b-combat-refinement`, from the Phase 17A commit 316fa38. Production `main` is untouched.
- The Phase 16A opening stays off, and the Phase 15 and 16A switches are unchanged.
- Monster designs, evolution levels, story content and the UI's look and navigation are preserved.
- XP was not changed (section 7 compares the options).

**How it was tested:**

- **Simulated, not played.** Every figure here comes from simulations (`tools/p17b-sim.js`, `tools/p17b-xp.js`) or
  from automated tests. No one has played these changes, and nothing was tested on an iPhone.
- **Baseline and modified runs are identical apart from the code.** The simulator loads two copies of the game: the
  Phase 17A code, read straight from git (316fa38), and the working tree. Both use the same random seeds and the same
  simulated players.
- **Sample sizes:** 60 runs per cell for the dungeon grid, 200 per Cold Kiln cell, 300 per boss-margin cell.
- **Times** assume 4.5 seconds per turn (an estimate).

**Simulated players:**

| Player | What it does |
|---|---|
| `basic` | Basic attack only |
| `tactical` | The same strategic player for both versions: guards a charging guardian; heals below 45% while the foe is healthy; lowers a lasting foe's attack; soaks a guardian on the turn it charges; otherwise uses the best attack for the matchup |
| `auto` | The game's own auto-battle |

---

## 1. What changed

### 1.1 Combat

Every combat change can be switched off on its own with `D.COMBAT17` in `data.js`. With all switches off, a battle
plays out exactly as in 17A; this is checked against a log recorded from the 17A code.

| Change | Rule | Why |
|---|---|---|
| **Kept first-form move** | An evolved Amina of yours keeps its first form's special as a third move in battle, at move level 1. Its two upgradable slots are unchanged. Foes keep two moves. | In 17A, evolving replaced the only guard (Leaf Guard, Iron Wall), heal (Hum) and attack-lowering moves (Gloom Veil, Cyclone Spin). After the first evolution no one could guard, and only stage-3 Earth and Metal could lower attack. |
| **Guard counter** | A guard that takes a hit readies a counter: your next attack deals 30% more. Guard moves still recharge, so you cannot guard two turns running. | A guard turn deals no damage. The counter pays that back when the guard was well timed. |
| **Heal: cleanse and steady** | A heal also clears burn, soak, silence and one stack of lowered attack, and the next hit on the healed Amina is 25% softer. Amounts and recharge are unchanged. | See section 2.2. |
| **Soak stalls a charge** | A charging guardian that is soaked sputters, and its charged move waits one more turn (once per charge). Speed −30% is unchanged. | Soak's only effect was on speed, which rarely matters in a 2–4 turn fight. |
| **Gloom Veil power 35 → 40** | Now level with the basic move. | The game's own auto-battle never picked it, because it scored below the basic move. |
| **Swift edge** | One of your swift Aminas acting before its foe deals 15% more. Foes do not get this. | Swift was the weakest role (41–44% duel win rate). Its speed only decided turn order. |
| **Tailwind** | Wind moves are never resisted. Wind still takes super-effective hits from Fire and Earth, and the element chart is unchanged. | Wind was the weakest element (32–38%). |
| **Smarter auto-battle** | The auto-battle (used by Island Defence simulations and the tests) now heals, lowers attack, soaks and guards when these help. | The brief asked for it. Players' own moves are unaffected. |
| **Bug fix: silence** | A fighter's first (basic) move is never silenced. | Aimza's basic move, Echo Wave, has a 1-turn cooldown, so a silenced Aimza had **no move at all**. Alone, it could not act, and the battle could not continue (only switching worked). The Hollow Veil boss silences. |

### 1.2 Dungeons

- **Battles 7–9 use the form their level calls for.** Second form from level 12, third from 22. The line, level,
  clue and setting stay the same.
  - Affected: the Hollow Veil (2 battles), Lantern Orchard, Windworn Stair and Resonance Scar.
  - In 17A these were first forms against an evolved party, at about half strength (section 3).
- **Battle 9 rehearses the boss** (the "herald"). It carries the boss's charged move, with the same telegraph, so a
  guard blocks it. For the Waywarden, which has a barrier instead, it gets one barrier at half health.
- **The Cold Kiln.** The Kiln Mother drops from level 12 to 11 (section 4).
- **The guardian brief.** It appears in the party picker, under the party. Details:
  - **Before you meet the guardian:** its title and charged move. These were already on the dungeon card. Its element
    is not shown ("Not met yet").
  - **Once met (in your codex):** its element, what it is weak to and what it resists, as element chips.
  - **Advice for the party you picked:**
    - how many of them hit its weakness, or are resisted by it;
    - whether you can guard or soak its charge;
    - for the barrier and prism bosses, what works against them.
  - The battle log reports the new events: "…held firm and is ready to strike back!", "…shakes off what was wearing it
    down.", and "…is soaked: Kiln Flare sputters and waits a turn."

### 1.3 Rewards

- The Reliquary, Hollow Veil and Resonance Scar now use first-clear and repeat rewards, like the other seven:
  - first clear: the same rewards as before, with gems;
  - repeat: 50/15, 140/35 and 250/55 gold/food, no gems.
- A replay that skips battles pays the battles it fought, but **not** the clear reward or the gear roll. "Fight the
  boss again" now says "· battle reward only". It still counts as a clear and still gives XP and essence.
- A **first** clear always pays in full, including one finished from battle 10 after a defeat.

### 1.4 Quests

The Dark Shore and Above the Clouds stay hidden while their island cannot be opened. Only the Verdant Wilds has an
Island Boss before it.

- Quest data is unchanged.
- A claimed quest stays claimed.
- A save where Obsidian Reach was bought in an older version still shows them.

---

## 2. Combat balance comparison

### 2.1 Dungeons, by team and level

First-try full clear rate, averaged over the ten dungeons (`docs/audit17b/versus.json`, 60 runs per cell).

| Team (player) | 17A: −2 / −1 / 0 / +1 / +2 | 17B: −2 / −1 / 0 / +1 / +2 |
|---|---|---|
| Basic attacks only | 7.7 / 29.7 / 67.8 / 81.3 / 100 | 0.5 / 17.3 / 75.0 / 82.8 / 100 |
| Elemental advantage | 49.7 / 58.5 / 99.2 / 100 / 100 | 52.7 / **72.7** / 100 / 100 / 100 |
| Healing and status | 28.8 / 59.7 / 83.0 / 90.7 / 100 | 33.5 / **67.0** / 90.3 / 98.2 / 100 |
| Balanced roles | 29.7 / 59.7 / 85.5 / 91.8 / 100 | 31.8 / **70.5** / 93.8 / 98.8 / 100 |
| Swift and Wind | 23.2 / 50.7 / 85.3 / 90.3 / 100 | 25.3 / **69.5** / 93.0 / 96.2 / 100 |
| Defensive (guard) | 30.0 / 53.0 / 80.0 / 81.5 / 100 | 22.0 / 54.2 / 80.2 / 80.7 / 100 |
| Game's auto-battle | 29.7 / 59.7 / 85.5 / 91.8 / 100 | 31.8 / 70.5 / 93.8 / 98.8 / 100 |

Team line-ups:

- Basic: Lumifern, Cannonis, Emberix.
- Advantage: the three lines best against each boss.
- Healing/status: Aimza, Pyrokai, Kairyu.
- Balanced: as basic, played tactically.
- Swift/Wind: Zephyr, Kairyu, Umbrit.
- Defensive: Acinus, Zeep, Terraflora.

**Does strategy beat levels?**

- **Equal level.** One level under recommended, tactical teams now clear 67–73% first time, against 17% for basic
  attacks. In 17A the gap was 51–60 against 30.
- **Against a stronger team.** A tactical team at the recommended level (90–100%) beats a basic-attack team one level
  higher (82.8%). One level under (67–73%), it is close to basic at the recommended level (75%). Good play is now worth
  about one level.
- **Levelling still matters.** Every team still gains at every level up, and everyone clears at +2.
- **Not improved:** the defensive team. Nature and Metal first forms only have their basic move and a guard, so it
  has little damage. Its weak point is the first-form stage, not guarding.
- **Caveat:** these averages are dominated by the evolution levels (12 and 22). Crossing one is +42% or +30% to every
  stat, and no tactic outweighs that.

### 2.2 Each mechanic on its own

**Ablation:** the 17B rules with one change switched off at a time. Tactical teams one level under recommended, 40
runs per dungeon, first-try clears averaged over all ten (`ablation.json`).

| Switched off | Defensive | Heal/status | Balanced | Swift/Wind | Advantage |
|---|---|---|---|---|---|
| Nothing (all on) | 57.0 | 65.0 | 67.5 | 67.5 | 72.8 |
| Kept moves | 58.0 | 64.8 | 60.3 | 51.0 | 72.3 |
| Guard counter | 55.5 | 65.0 | 67.8 | 67.5 | 73.0 |
| Heal cleanse | 57.0 | 65.0 | 67.5 | 67.5 | 72.8 |
| Heal steadying | 57.0 | 64.3 | 67.5 | 67.5 | 72.8 |
| Soak stalls a charge | 57.0 | 63.8 | 67.3 | 67.5 | 72.3 |
| Swift edge | 57.0 | 64.5 | 67.0 | 61.5 | 64.8 |
| Tailwind | 57.0 | 65.0 | 67.5 | 68.0 | 72.8 |

The kept moves and the swift edge carry most of the gain. Each of the others is small on its own, but they matter at
the bosses:

**At the boss margin.** Each boss was fought at the lowest party level where the tactical team (Aimza, Acinus,
Kairyu) wins at least 30%, then with one kind of move removed (`margin.json`, 300 fights per cell, win %).

| Boss | 17B tactical | Never guard | Never heal | Never soak | Basic only | Basic, +1 level |
|---|---|---|---|---|---|---|
| Rootbound Sentinel | 47.0 | 24.3 | 83.3 | 18.0 | 38.7 | 99.0 |
| Tidewarden | 64.7 | 46.3 | 84.3 | 52.7 | 88.7 | 100 |
| Kiln Mother | 25.3 | 43.7 | 23.3 | 1.7 | 0 | 76.0 |
| Keeper of Unsaid Things | 46.0 | 38.3 | 40.7 | 14.0 | 10.0 | 100 |
| Weathervane | 37.3 | 38.7 | 38.3 | 0 | 0 | 38.3 |
| Echo at the Centre | 54.7 | 36.3 | 54.7 | 1.0 | 0 | 41.3 |
| Heartwood Stag | 14.0 | 5.0 | 3.3 | 0 | 0 | 0 |

In 17A the same "never guard" and "never heal" columns were nearly identical to the tactical one from the Kiln Mother
on, because nobody had those moves after evolving.

**Guard** now counts against most guardians: dropping it costs 8–23 points. It hurts against the Kiln Mother, where a
guard turn loses the damage race.

**Healing: why it lost in 17A, and what changed.**

- **Why it lost:** a heal restores 25% (+5% for two turns) of one Amina, and costs a turn in which the foe keeps
  hitting. A guardian's blows are larger than the heal, so against bursty bosses a heal turn is a net loss. The old
  auto-heal also waited until 30% health, by which point the next hit usually finished the Amina anyway.
- **What changed:** with the cleanse, the 25% steadying and a 45% threshold, healing now helps in long boss fights:
  the Keeper (+5 points) and the Heartwood Stag (+10.7). It still loses against the Sentinel and the Tidewarden, which
  hit hard and fast; guard or soak is the answer there.
- **Over whole dungeons** (Aimza's team, 80 runs a dungeon, `tools/p17b-experiments/heal3.js`), the cost of healing
  fell from 7.0 / 5.8 / 3.7 points to 1.5 / 0.6 / 4.0 (at two under, one under and at the recommended level). **It is
  still slightly negative there.**
- **Remaining concern:** healing is no longer a trap, but it is only worth it in long fights. A larger heal (30–35%)
  or a longer regen would push it further. That is a balance choice, left for approval.

**Soak and attack-lowering:**

- **Soak** is now the strongest single support tool against charging guardians. Without it the margin team drops to
  0–18% on four bosses.
- **Lowering attack** decides several bosses for a Dark and Wind team (Umbrit, Zephyr, Voltar), which keeps Gloom
  Veil and Cyclone Spin after evolving:

  | Boss | Lowering attack | Never lowering it |
  |---|---|---|
  | Windworn Stair | 100 | 0.7 |
  | Resonance Scar | 96 | 0 |
  | Heartwood | 43 | 0 |

  It is not dominant: the same team wins only 9% against the Weathervane, which resists both Dark and Wind.

### 2.3 Elements and roles

From the duels (every line against every other, 30 seeds per pair, `duels.json`).

**Caveat:** in 17B the attacking side is built as one of your Aminas (kept move, swift edge) and the defending side as
a wild foe, so absolute win rates rise. Compare the spread, not the levels.

| Level 15 | 17A | 17B |
|---|---|---|
| Swift role | 41.5 (best role 66.0) | 69.5 (best 81.0) |
| Wind | 32.5 (last) | 60.5 (above Earth, Nature and Metal) |
| Dark | 46.0 | 88.3 (Gloom Veil kept) |
| Spread across elements | 32.5–74.8 | 55.5–88.3 |

Swift and Wind are no longer at the bottom. Water and Fire still lead the strong elements, and Earth, Nature and
Metal are now the weakest, so the elements still differ in strength.

---

## 3. Dungeon difficulty progression

**Enemy strength by battle:** health × attack against a recommended-level party Amina (`curve.json`). Only the run-up
to the boss changed:

| Dungeon | Battles 7–9, 17A | Battles 7–9, 17B | Boss |
|---|---|---|---|
| Hollow Veil | 0.90 / 0.54 / 1.00 | 0.90 / **1.08** / 1.00 | 1.34 |
| Lantern Orchard | 0.53 / 0.53 / 0.53 | **1.06 / 1.06 / 1.06** | 2.03 |
| Windworn Stair | 0.99 / 0.47 / 0.99 | 0.99 / **0.99** / 0.99 | 2.03 |
| Resonance Scar | 0.49 / 0.53 / 0.53 | **0.97 / 1.05 / 1.05** | 1.53 |

Battle 9 of every dungeon also rehearses the boss's charge.

**Other measures:**

- **Share of first-try losses by battle:** battle 8 rose from 9.0% to 12.1%, battle 9 went from 17.4% to 15.8%, and
  battle 10 from 40.1% to 39.6%.
- **Battle length:** a first-try clear at the recommended level went from 3.06 to 3.22 minutes (+5%, estimated time).

**Not changed:**

- Battles 1–6.
- The healing between battles (40% after a win, 50% at a section end).
- Encounter pools.
- Enemy move choice, apart from heralds charging the boss move.

**Hypothesis:** the larger remaining issue is over-levelling (section 7), which these changes do not touch.

---

## 4. Cold Kiln, before and after

The smallest effective change was **the Kiln Mother from level 12 to level 11**. Her evolved form (Pyro-Forge), 1.55×
health and Kiln Flare all stay.

Alternatives tried on the final 17B rules (`tools/p17b-experiments/kiln.js`, 150 runs each, first-try clears at
party levels 9/10/11/12):

| Option | Water trio | Balanced, tactical | Swift/Wind, tactical | Basic only |
|---|---|---|---|---|
| As it was (lv 12) | 83 / 100 / 100 / 100 | 0 / 8 / 51 / 100 | 0 / 5 / 35 / 100 | 0 / 0 / 0 / 100 |
| **Level 11 (chosen)** | 97 / 100 / 100 / 100 | 9 / 47 / 91 / 100 | 11 / 32 / 55 / 100 | 0 / 0 / 5 / 100 |
| Level 12, health 1.35× | 93 / 100 / 100 / 100 | 1 / 37 / 89 / 100 | 8 / 27 / 64 / 100 | 0 / 0 / 14 / 100 |
| Level 12, health 1.25× | 96 / 100 / 100 / 100 | 23 / 61 / 97 / 100 | 15 / 32 / 94 / 100 | 0 / 3 / 48 / 100 |

The water trio is Cannonis, Kairyu and Aquaflora.

Why level 11:

- It is one number, and keeps the boss's health and identity.
- It brings an unprepared tactical team from 8% to 47% at the recommended level.
- It still leaves basic attacks with nothing before evolving.
- The 1.25× health option is easier still, but it also lets basic attacks through at 48% one level up.

The final numbers with every 17B change (`coldkiln.json`, 200 runs; first try, then "within 6 tries"), at levels
8/9/10/11/12:

| Team | 17A, first try | 17B, first try | 17B, within 6 tries |
|---|---|---|---|
| Elemental advantage (Water) | 0 / 32.5 / 95 / 100 / 100 | 6.5 / 62.5 / **97** / 100 / 100 | 68.5 / 100 / 100 / 100 / 100 |
| Balanced, tactical | 0 / 0 / 0.5 / 32.5 / 100 | 0 / 0 / 12.5 / **72** / 100 | 0 / 2.5 / 58.5 / 100 / 100 |
| Healing and status | 0 / 0 / 0.5 / 13 / 100 | 0 / 1.5 / 15 / 76.5 / 100 | 0 / 10 / 82.5 / 100 / 100 |
| Basic attacks only | 0 / 0 / 0 / 0 / 100 | 0 / 0 / 0 / 6 / 100 | 0 / 0 / 9 / 93.5 / 100 |

- **A prepared team** (water counters) clears at the recommended level first time 97% of the time.
- **A tactical team without the counter** clears with a few tries at the recommended level, or first time one level
  up.
- **Basic attacks** still need the evolution at 12.
- The spike is now a lesson in counter-picking rather than a wall.

---

## 5. Reward exploit, verified

Tests: `tests/rewards17b.test.js` (39 checks) and the updated `tests/migration-v06.test.js`.

| Check | Result |
|---|---|
| All ten dungeons use first-clear and repeat rewards; the repeats have no gems | passed |
| The other seven dungeons' rewards are unchanged | passed |
| First clear: battle gold + section rewards + first-clear gold, exactly; first-clear gems; Gaiaroki II; its item | passed |
| Full replay: battle gold + repeat reward, no gems, no section rewards again; the second clear still gives Sylvaneer II | passed |
| "Fight the boss again": boss battle gold only; no clear reward, gems or gear roll; still a clear, still XP and essence | passed |
| 20 boss-only Resonance Scar replays: 0 gems and 1,800 gold (17A: 500 gems and 19,800 gold) | passed |
| A first clear finished from battle 10 after a defeat pays in full; the next boss-only fight pays no gems | passed |
| After a defeat, a run resumes at its battle and its claimed sections stay claimed | passed |
| A saved and reloaded run keeps its place and pays the first clear once | passed |
| Resolving again after a run has ended is refused | passed |
| An exported and re-imported save replays as a repeat | passed |
| An older save mid-run with no recorded start finishes as a full replay (repeat reward, no gems) | passed |

**Changed test (approved behaviour change):** `migration-v06` used to check that a boss-only Reliquary replay paid the
every-clear gem reward. That was the exploit. It now checks that such a replay pays the boss battle only.

---

## 6. Quests

`rewards17b` covers these, and they pass:

- The Dark Shore and Above the Clouds are hidden when their island cannot be opened.
- Verdant Wilds quests are unaffected.
- A claimed quest stays claimed.
- A save with Obsidian Reach already open shows them.
- The quest data is untouched.

---

## 7. XP options: simulated, not implemented

`tools/p17b-xp.js`, on the 17B rules (`xp-options.json`). The player is a balanced team from level 3 that plays the
dungeons in order with the tactical player. After two defeats in a row it replays the last cleared dungeon in full.

Feeding modes:

- **None:** never feeds.
- **Half (normal):** feeds half the food it holds after each run.
- **All:** feeds everything.

Three seeds each, from runs of the deterministic simulator.

| Option | Feeding | Level at the end | Battles (est. minutes) to all level 12 | to all level 22 | Readiness at the 10 dungeons (party − recommended) |
|---|---|---|---|---|---|
| **Today** | none | 25.0 | 30 (8) | 82 (17) | −1, +1.7, +3.7, +4, +4, +4, +4, +3.7, +3, +3 |
| | half | 29.0 | 22 (5) | 69 (11) | −1, +3.3, +5.7, +6, +6.3, +6.7, +6.7, +6.7, +6.7, +6.7 |
| | all | 29.7 | 21 (5) | 68 (10) | |
| **A: less XP from much weaker foes** (−25% at 3 levels below, −50% at 4, −75% at 5+) | none | 22.0 | 40 (11) | 97 (24) | −1, +1.7, +3, +2, +2, +2, +1, +1, +1, +1 |
| | half | 25.0 | 31 (8) | 91 (18) | −1, +3.3, +4.7, +4, +4, +3.7, +3.3, +3.3, +3.3, +3 |
| | all | 25.3 | 31 (7) | 90 (18) | |
| **B: dungeon levels raised** (rec 6, 8, 10, 12, 14, 17, 19, 21, 24, 27) | none | 27.0 | 25 (8) | 71 (18) | −3, −1, +0.7, +1.3, +1.7, +1, +0.7, +0.7, −0.3, −1.7 |
| | half | 30.0 | 21 (7) | 61 (13) | −3, +0.3, +2.3, +3, +3.7, +3.3, +3.3, +3.3, +2.7, +1.7 |
| | all | 30.0 | 20 (6) | 58 (12) | |
| **C: steeper XP after level 12** (+15% per level past 12) | none | 20.9 | 30 (8) | not reached | −1, +1.7, +3.7, +4, +4, +3, +2.7, +2, +1, 0 |
| | half | 23.3 | 22 (5) | 91 (16) | −1, +3.3, +5.7, +5.7, +5.7, +5.3, +4.7, +4, +3, +2.3 |
| | all | 23.7 | 21 (5) | 91 (16) | |

In every option the simulated player loses almost nothing (0–0.3 defeats per campaign) and never needs to grind.

### Option A: less XP from much weaker foes

- **For:** the gentlest. Nothing gets harder, and players who keep to the recommended path see no change.
- **Against:** feeding still levels freely, so a player who feeds stays +3 to +5 over.
- **Likely result:** readiness without feeding settles at about +1, and +3 with normal feeding.
- **Existing saves:** they keep their levels; only future growth slows.

### Option B: dungeon levels raised

- **For:** content meets players where they are. The late dungeons get real stakes (−1.7 at the Heartwood without
  feeding). More XP per battle means the level cap is still reached.
- **Against:**
  - The first dungeon becomes −3 for a new player. Its recommended level would rise to 6, against a starting level of
    3, so an opening exception would be needed.
  - Every dungeon's balance changes at once.
  - Feeding still pushes +2 to +3 over.
- **Likely result:** the hardest of the three.
- **Existing saves:** high-level saves meet tougher replays, but stay over-levelled at level 30.

### Option C: steeper XP after level 12

- **For:** it reaches the late game: readiness at the Heartwood is about 0 without feeding and +2.3 with feeding. It
  also makes feeding worth more late.
- **Against:**
  - Without feeding, level 22 (the second evolution) is not reached at all in the campaign.
  - It shows as a visible jump in "XP to next level", and the same food buys fewer levels.
- **Existing saves:** they keep their levels; their next levels cost more.

**Recommendation for discussion:** A, possibly with a lighter C (about +7% per level past 12), so that feeding and
dungeons both stay meaningful without a wall at level 22. Each needs a new simulation once chosen.

---

## 8. Regression and limitations

- **Static checks:** every `src`, `src/3d`, `tests` and `tools` script passes a syntax check (`node --check`).
- **Full suite:** `node tests/run-all.js`, 51 suites, **1,676 passed, 0 failed** (`docs/audit17b/runs/full-suite-17b.log`).
  This includes the three new suites:
  - `combat17b`: 31 checks;
  - `rewards17b`: 39;
  - `browser-combat17b`: 10, with screenshots in `docs/ui/screens17b/`.
- **Save compatibility:** `migration-v06` (22), `savefile16b` (47) and `browser-stability16c` (20, including export and
  import fidelity) all pass. One of those checks was rewritten for the approved reward change (section 5).
- **Regenerating the numbers:** the simulations are deterministic. `node tools/p17b-sim.js` (about 20 s) and
  `node tools/p17b-xp.js` (under 1 s) recreate `docs/audit17b/`.

**Known limitations and remaining concerns:**

- **Simulated, not played:** the simulated players play by fixed rules. A person will use guard, heal and soak with
  different timing. The tactical player is a reasonable reference, not a model of real players.
- **Over-levelling is untouched** (by design in 17B). As long as players arrive 3–7 levels over, most of these
  refinements only show when a player stays near the recommended level, or in replays at lower levels.
- **The defensive (Acinus/Zeep/Terraflora) team did not improve.** Nature and Metal first forms only have their basic
  attack and a guard.
- **Healing** still loses against fast, hard-hitting guardians (the Sentinel, the Tidewarden), and is still slightly
  negative over whole dungeon runs. It helps only in long boss fights. A stronger heal is a balance choice for
  approval.
- **The kept move is level 1** and cannot be upgraded (the two upgradable slots are unchanged). The creature detail
  screens still list two moves; the kept move only appears in battle and in the guardian brief's advice.
- **Codex:** fighting the run-up battles now records some second forms (for example Lumi II, Aeolus) as seen earlier
  than before.
- **Time estimates** use 4.5 s per turn.
- **No physical iPhone testing.**
