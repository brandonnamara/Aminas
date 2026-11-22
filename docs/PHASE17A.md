# Phase 17A — Gameplay depth and progression audit

Branch `p17a-gameplay-audit`, from the Phase 16C commit 078e003. Production `main` is untouched.

**What this phase changed:**

- No gameplay, balance, price, reward or drop-rate change. The Phase 15 and Phase 16A switches are unchanged, and the
  16A opening is still off.
- **New, audit only:**
  - the simulator `tools/p17a-sim.js`;
  - its outputs in `docs/audit17a/*.json`;
  - this document;
  - the two test-timing corrections in section 8.

**How the numbers were made:**

- `tools/p17a-sim.js` loads the game's own rule files, the same way the Node tests load them, and plays battles with
  the real battle engine (`R.Battle`).
- Dungeon runs follow the game's carry-over rules: health carries between battles, 40% is healed after a win and 50%
  at the end of each section, and a loss restarts that battle at full health.
- The campaign agents use the real `R.startRun` and `R.resolveBattle`, so rewards, XP, evolution costs and essence are
  the game's.
- Random numbers are seeded, so every run gives the same results.
- Sample sizes are 40–400 runs per cell (stated with each table).

**Assumptions to keep in mind:**

- **Time:** completion times assume **4.5 seconds per turn** (one exchange and its animations at normal speed). That
  figure is an estimate, not a measurement. Turn counts are exact; minutes scale with whatever the real figure is.
- **Simulated players:** they play by fixed rules (below), not as a person would. A person may choose worse or better
  moves, but the level and economy findings do not depend on move choice.
- **No device testing:** nothing here was tested on an iPhone.

**Simulated player policies:**

| Policy | What it does |
|---|---|
| `basic` | Only the move with no cooldown |
| `special` | The strongest move that is ready; never guards or heals |
| `auto` | The game's own auto-battle choice (`B.autoAction`): guards against a charging guardian, heals under 30% health, otherwise the best-scored attack |
| `smart` | `auto`, plus switching to a better elemental match when the active Amina is resisted, and the best match as the replacement after a faint |

Every finding below is labelled:

- **Confirmed:** measured, or read directly in the code.
- **Hypothesis:** consistent with the evidence, not proven.
- **Proposal:** a creative suggestion.

---

## 0. Summary

The starter island plays correctly and nothing in it is broken. As a game, though, it is **level-gated and nearly
strategy-free**.

1. **Level and evolution stage decide almost every battle** (confirmed).
   - At a dungeon's recommended level, a team that only ever uses its basic attack still clears 8 of 10 dungeons
     first time.
   - Two levels under, almost nothing clears. Two levels over, everything does.
   - At the level where a boss is a coin flip, one extra level takes it to 95–100%.
2. **Ordinary progress over-levels the player** (confirmed).
   - A player who never feeds, using one Amina, finishes the island at level 25, against the final dungeon's
     recommended 20, with **zero defeats**.
   - Feeding the food you earn reaches level 30 by the Island Boss.
3. **Battles 1–9 of every dungeon are filler** (confirmed).
   - 55% of all losses happen at battle 10, and 67% in battles 9–10.
   - Battles 1–9 have no difficulty ramp. Three dungeons fill them with enemies half as strong as the party.
4. **One sharp spike: the Cold Kiln boss** (confirmed). At its recommended level 10 the party cannot have evolved
   yet (evolution is at 12), but the boss is a level-12 second-stage form with 1.55× health. 0–25% of teams clear it.
5. **Many mechanics have no measurable effect.** Measured at the level where outcomes are in doubt:
   - **No effect (confirmed):** guard, heal, soak and attack-lowering moves.
   - **Large effect (confirmed):** burn (it takes a share of maximum health, and bosses have 1.3–2.2× health),
     elemental counter-picking, and the Twilight Pact.
6. **The economy runs out of sinks** (confirmed).
   - Three older dungeons pay their full clear reward, gems included, on **every** clear.
   - The **"Fight the boss again"** button makes that a single fight: up to 1,935 gems an hour from the Resonance
     Scar.
   - The Moon Shrine makes about 190 gems an hour late on.
   - Against that, everything gems can buy totals 22 gems of Forge recipes, plus skipping timers.
   - Late-game gold (~74,000 an hour from buildings) outruns every gold sink within hours.
7. **Long-term goals stop at the starter island** (confirmed).
   - The other three islands have no dungeons. Obsidian Reach and the Celestial Crown can never be unlocked in a new
     save, so their two quests cannot be finished.
   - Collection ends with no rarity, no variation and no use for duplicates.

The roadmap (section 7) puts four items in **Priority 1**:

- boss-only replay rewards;
- the always-full legacy rewards and the gem flood;
- the Cold Kiln spike;
- the over-levelling curve (one of a small set of options).

Most combat items are **Priority 2**: making guard, heal and status moves count, and adding a difficulty ramp inside
dungeons. New islands and systems are **Priority 3**.

---

## 1. Combat audit

### 1.1 Elements

Confirmed; `docs/audit17a/elements.json`. A strong hit does ×1.5 and a resisted one ×0.67. An element resists exactly
the elements it is strong against.

| Element | Strong against | Weak to | Lines (base forms) |
|---|---|---|---|
| Water | Fire, Earth, Metal | Nature | 3 |
| Fire | Nature, Wind, Metal | Water | 4 |
| Metal | Light, Earth | Fire, Water | 3 (2 legendary) |
| Nature | Water, Earth | Fire, Wind | 3 |
| Light | Dark | Dark, Metal | 2 |
| Dark | Light | Light | 2 |
| Earth | Wind | Nature, Water, Metal | 2 |
| Wind | Nature | Fire, Earth | 1 |
| Resonance | — (never resisted, never amplified) | — | 1 |

- **Water** has three strengths and one weakness. **Earth** has one strength and three weaknesses. **Wind** has one
  of each, one line, and the weakest role (below).
- Light and Dark only interact with each other.

**Duels** (`duels.json`: every line against every other line, same level and stage, 40 seeds per pair, `auto`
policy). Average win rate at level 15:

| | Values |
|---|---|
| By element | Water 76%, Resonance 71%, Fire 70%, Light 65%, Metal 56%, Nature 53%, Dark 52%, Earth 49%, Wind 36% |
| By role | Mystic 68%, Bruiser 67%, Tank 64%, Balanced 63%, **Swift 46%** |

- **Best line:** Cannonis, 85% at levels 5, 15 and 28.
- **Worst lines:** Zephyr 36% and Umbrit 37%.
- **Swift underperforms (confirmed).** Speed only decides who moves first, and it costs 4 HP, 2 attack and 2 defence
  relative to the balanced role. Wind and Dark, whose lines are mostly swift, pay for it twice.

### 1.2 Damage, moves and cooldowns

From the code:

- Damage = (level factor × power × attack ÷ defence) ÷ 16 + 2, × 1.2 if the move matches the user's element, ×
  element multiplier, × a random 0.92–1.08.
- Stats grow 11% per level. Evolution multiplies base stats by 1.42 (stage 2) and 1.85 (stage 3).
- **Every Amina has two moves:** a 40-power basic move with no cooldown, and one special. Specials have cooldowns of 2
  (usable every other turn) or 3.
- Move upgrades add up to 38% power. Gear adds up to 17% to a stat.

**Consequence (confirmed):**

- Evolution is a 42–30% jump in every stat, equal to about four levels.
- A level is +11%. All gear together is about one and a half levels.
- So the evolution levels 12 and 22 are cliffs, and gear and move upgrades are small next to them.
- The `smart` row in the margin table shows a turn spent switching often costs more than the matchup gains.

**Turn economy (confirmed):**

- Each dungeon battle is your team of up to three against **one** foe, and the enemy acts every turn.
- Switching costs your turn and clears your Amina's status effects.
- At recommended level an ordinary battle lasts 2–4 turns.

### 1.3 Strategies against dungeons

**At the recommended level** (`strategies.json`, 80 runs per cell): clear rate / first-try rate.

| Dungeon | Basic attack only | Strongest move | Game's auto | Smart switching |
|---|---|---|---|---|
| Forgotten Road | 100 / 100 | 100 / 100 | 100 / 100 | 100 / 100 |
| Gathering Hall | 100 / 100 | 100 / 100 | 100 / 100 | 100 / 100 |
| Overgrown Reliquary | 100 / 100 | 100 / 100 | 100 / 100 | 100 / 100 |
| Drowned Steps | 100 / 100 | 100 / 100 | 100 / 100 | 100 / 100 |
| **Cold Kiln** | **4 / 1** | **10 / 1** | **19 / 3** | **76 / 10** |
| Hollow Veil | 100 / 100 | 100 / 100 | 100 / 100 | 100 / 100 |
| Lantern Orchard | 100 / 100 | 100 / 100 | 100 / 100 | 100 / 100 |
| Windworn Stair | 100 / 100 | 100 / 100 | 100 / 100 | 100 / 100 |
| Resonance Scar | 100 / 100 | 100 / 100 | 100 / 100 | 100 / 100 |
| Heartwood | 100 / 58 | 100 / 86 | 100 / 86 | 100 / 100 |

Triangle team; the starter team gives the same picture.

**At the margin.** To see whether a mechanic matters, each boss was fought at the lowest party level where the `auto`
player wins at least 30% (`mechanics-margin.json`, Twilight Pact team, 400 seeds per cell). Values are win %.

| Boss | Rec. | Margin lv | Auto | Basic only | Never guard | Smart switch | +1 level | Gear II | Moves lv 3 |
|---|---|---|---|---|---|---|---|---|---|
| The Waywarden | 4 | 2 | 100 | 94.5 | 100 | 97.8 | 100 | 100 | 100 |
| The Lamplighter | 5 | 4 | 99 | 72.3 | 99 | 99 | 100 | 100 | 100 |
| Rootbound Sentinel | 6 | 5 | 64.8 | 29.5 | 64.8 | 93.5 | 100 | 99.5 | 91.5 |
| The Tidewarden | 8 | 6 | 99.5 | 0 | 99.5 | 99.5 | 100 | 100 | 100 |
| The Kiln Mother | 10 | 11 | 64.8 | 0 | 64.8 | 27.3 | 100 | 91.8 | 98.5 |
| Keeper of Unsaid Things | 12 | 11 | 40.8 | 2.3 | 40.8 | 0.8 | 100 | 87.3 | 100 |
| The Orchard Keeper | 14 | 12 | 94.8 | 51.5 | 94.8 | 94.8 | 100 | 100 | 99.3 |
| The Weathervane | 16 | 12 | 68.3 | 0 | 68.3 | 61.3 | 100 | 100 | 97.3 |
| The Echo at the Centre | 18 | 14 | 97.5 | 0 | 97.5 | 97.5 | 100 | 100 | 100 |
| The Heartwood Stag | 20 | 18 | 95.5 | 45.8 | 95.5 | 93.5 | 100 | 100 | 100 |

Read from this table:

- **Specials matter (confirmed).** Basic-only drops from 41–99% to 0–72% wherever the fight is close.
- **One level beats any strategy (confirmed).** +1 level takes every boss to 95–100%. Gear II and move level 3 are
  each worth roughly one level.
- **Smart switching is mixed (confirmed).** It helps against the Sentinel (+29 points) and hurts badly against the
  Kiln Mother and the Keeper (−38 and −40). With one foe, a switch gives the boss a free hit.
- **Guarding changes nothing for most teams (confirmed).** Only Nature and Metal Aminas have a guard move, and only
  at stage 1 (Leaf Guard, Iron Wall). After the first evolution nobody can guard.

### 1.4 Statuses, support and synergies at the margin

All at the margin level, 400 seeds per cell (`mechanics-margin.json`).

| Mechanic | Test | Result | Verdict |
|---|---|---|---|
| **Burn** (6% of max health a turn, 2 turns) | Status team (Pyrokai, Gaiaroki, Kairyu), player's burn removed | Drowned Steps 38.5 → 0; Heartwood 44.5 → 5; Lantern Orchard 77.5 → 61 | **Decisive against bosses (confirmed).** It scales with the boss's health multiplier, so it is strongest exactly where the health pool is largest. |
| **Stun** (30% on Boulder Roll) | Stun removed | Gathering Hall (at lv 3) 32 → 15; elsewhere ±3 | Useful early; guardians resist it except while charging |
| **Soak** (speed −30%) | Soak removed | No change anywhere (±1) | **No effect (confirmed).** Speed only reorders a 2–4 turn fight. |
| **Weaken** (attack −20% a stack) | Attack-lowering moves used every time they are ready, against never | 92.3 vs 92.3 (Lantern), 27.5 vs 27.5 (Heartwood), 97.5 → 100 (Drowned Steps) | **No measurable effect (confirmed).** The game's own auto-battle never picks them, because their power is at or below the basic move's. |
| **Guard** | Healer team (Aimza, Cannonis, Acinus) with guard vs never guard | Cold Kiln 6 → **29** without guarding; others equal | **Guarding can hurt (confirmed):** a guard turn is a turn with no damage. |
| **Heal** (Hum / Mend: 25% + 5% × 2 turns) | Heal vs never heal | Identical in all four tests. In a level-10 Aimza vs Lumi duel, healing below 30% lowered the win rate from 96% to 60%. | **Healing loses tempo (confirmed).** About a third of your health over three turns, against a turn of damage you don't deal. |
| **Twilight Pact** (+3% health a turn) | Synergy removed, Lantern Orchard lv 12 | 94.8 → 68.5 | **Strong (confirmed)** |
| **Elemental Triangle** (+8% damage) | Synergy removed | 95.0 → 85.8; Cold Kiln 68.3 → 48.5 | Useful |
| **Kindred** (+10% for a shared element) | Synergy removed | 96.5 → 91.3 | Small |

**Elemental counter-picking is the largest strategic lever** (confirmed, `counter` in `mechanics-margin.json`). The
same level, with the boss fought by a trio of one element, gives 0% for the wrong element and 100% for the right
one. Examples:

- Cold Kiln: Water 100%, Earth 6%.
- Hollow Veil: Fire and Water 100%, everything else 0–2%.
- Windworn Stair: Water 100%, Earth 98%, Fire 94%, the others 0–7%.

The game shows the boss's element and the dungeon's theme, so this is a real decision for the player. But
over-levelling (section 2) removes the need to make it.

### 1.5 Enemy behaviour and bosses

From the code:

- Ordinary foes use their special about 65% of the time it is ready, otherwise their basic move. Below 35% health
  they heal or guard 40% of the time, if they have a move for it.
- Guardians telegraph a charge one turn ahead (every second turn below half health). A guard blocks 75% of the
  guardian move.
- Two bosses have mechanics:
  - **Barrier (the Waywarden):** shields at 66% and 33% health; specials crack the shield twice as fast.
  - **Prism (the Heartwood Stag):** changes element every 3 turns, announced a turn early.

The telegraph and the counter-play are well designed. But at the levels players actually arrive at (section 2), the
boss dies before the charge or the second barrier matters. **Hypothesis:** most players never see the mechanics
play out.

---

## 2. Dungeon progression audit

### 2.1 Difficulty against level

All teams (7 teams × 10 dungeons × 60 runs, `dungeon-grid.json`):

| Party level against recommended | −3 | −1 | 0 | +2 | +4 |
|---|---|---|---|---|---|
| Clear rate (any number of tries) | 41% | 84% | 92% | 100% | 100% |
| First-try clear | 16% | 62% | 87% | 100% | 100% |
| Minutes per clear (estimate) | 5.6 | 3.7 | 3.0 | 2.1 | 1.6 |

The curve is a cliff three levels wide. Below it, the stage-1 to stage-2 gap makes some dungeons unwinnable:

- Hollow Veil at level 9 and Lantern Orchard at level 11: 0% for every team.
- Hollow Veil at level 11: 0–100% depending on team.

Above it, nothing can be lost.

### 2.2 Inside a dungeon: battles 1–9 against the boss

Share of all simulated losses by battle number: battle 1: 0%, 2–6: 1–5% each, 7: 11%, 8: 9%, 9: 14%, **10: 55%**.

**Enemy strength index** (`dungeon-curve.json`): enemy health × attack, relative to a Cannonis of the same form at the
recommended level.

| Dungeon | Battles 1–9 | Boss | Note |
|---|---|---|---|
| Forgotten Road | 0.74–1.19 | 1.55 | |
| Gathering Hall | 0.73–1.08 | 2.16 | |
| Reliquary | 0.63–0.86 | 2.61 | |
| Drowned Steps | 0.75–1.06 | 1.84 | |
| **Cold Kiln** | 0.79–1.21 | **3.88** | stage-2 boss while the party is still stage 1 |
| Hollow Veil | **0.39–1.00** | 1.34 | |
| Lantern Orchard | **0.40–0.55** | 2.03 | |
| Windworn Stair | **0.41–0.99** | 2.03 | |
| Resonance Scar | 0.41–0.97 | 1.53 | |
| Heartwood | 0.77–1.09 | 2.84 | |

- **Confirmed:** battles 1–9 have no ramp (the generator spreads levels over only 2–4 levels), and the species pattern
  repeats (`nine()` cycles a 5-species pool).
- **Confirmed:** from the Hollow Veil on, most battles 1–9 are stage-1 foes against a party that has evolved, at
  about half strength.
- **Hypothesis:** this is where "repetitive" comes from. Nine quick wins, then one real fight.

### 2.3 Boss and Island Boss difficulty

- **Spike (confirmed):** the Cold Kiln, as above. With gear II and move level 3 at the recommended level, the triangle
  team clears it 100% (77% first try). Preparation does matter there, but the dungeon card gives no hint of it.
- **Not hard (confirmed):** the Heartwood Stag (Island Boss, ×2.2 health, prism shift). It is the hardest boss by
  strength index after the Kiln, yet 86–100% clear it first time at the recommended level. By the time players reach
  it they are level 25–30 (section 2.5).

### 2.4 Defeat and retry

From the code:

- A defeat keeps your progress; the next try starts at the lost battle with full health, and pays 5 food.
- A retry is cheap and never punishing (good).
- **Confirmed:** because a retry restores full health, a loss at battle 10 is just a fresh boss attempt with a fully
  healed team. The 40%/50% healing between battles then only matters for not losing; it never decides a clear.

### 2.5 Campaign agents: does the dungeon loop alone keep pace?

Real rules, real rewards; `campaign-agents.json`. The agent plays dungeons in order, evolves when it can, and either
feeds all its food as Feasts or never feeds.

| Dungeon (rec.) | Party level, no feeding | Party level, feeding | Battles so far | Minutes so far (est.) | Defeats |
|---|---|---|---|---|---|
| Forgotten Road (4) | 7 | 9–10 | 10 | 3 | 0 |
| Gathering Hall (5) | 10 | 12–13 | 20 | 5 | 0 |
| Reliquary (6) | 12 | 14–15 | 30 | 7 | 0 |
| Drowned Steps (8) | 14 | 17 | 40 | 8 | 0 |
| Cold Kiln (10) | 16 | 19–20 | 50 | 10 | 0 |
| Hollow Veil (12) | 18 | 21–22 | 60 | 12 | 0 |
| Lantern Orchard (14) | 20 | 23–24 | 70 | 13 | 0 |
| Windworn Stair (16) | 21 | 25–26 | 80 | 15 | 0 |
| Resonance Scar (18) | 23 | 27–28 | 90 | 17 | 0 |
| Heartwood (20) | **25** | **29–30** | 100 | 18–26 | 0–1 |

Notes:

- The table is the same for the triangle, starter and Fire teams.
- **A single Amina with no feeding** gives the same levels and also clears every dungeon with no defeat. XP is not
  shared, so one Amina levels as fast as three.
- The Cold Kiln spike never shows: the agent arrives at level 16, not 10.

**Confirmed:**

- One clear of each dungeon carries the party +3 to +5 levels over the next dungeon's recommendation, even without
  feeding.
- Feeding all earned food adds 3–5 more and reaches the level cap by the Island Boss.
- The recommended levels describe a player who skips most of the XP the game hands out.

**Confirmed:** the whole starter campaign is about 100 battles, roughly 20–30 minutes of battle time (estimate). By
the dungeons' own measure it is too easy. By content length it is short.

**Rank gates:**

- Dungeons alone reach rank 8 at the Resonance Scar (needs 9) and rank 9 at the Heartwood (needs 10).
- Building, quests and clearing obstacles also give rank, so this is only a gentle push towards the island.
  **Hypothesis:** it is not a bottleneck in practice.

### 2.6 Farming and repetition

`farming.json`: triangle team at recommended +2, full replay compared with "Fight the boss again".

| Dungeon | Pays every clear | Full replay: gold/min, gems/h | Boss only: gold/min, gems/h |
|---|---|---|---|
| Forgotten Road | — | 106, 0 | 149, 0 |
| Overgrown Reliquary | **yes, with 5 gems** | 142, 107 | 317, **480** |
| Hollow Veil | **yes, with 12 gems** | 443, 369 | 782, **1,152** |
| Lantern Orchard | — | 355, 0 | 294, 0 |
| Resonance Scar | **yes, with 25 gems** | 645, 633 | 1,277, **1,935** |
| Heartwood | — | 424, 0 | 519, 0 |

**Confirmed exploit:**

- The three legacy dungeons (`clearReward`) pay their whole clear reward, gems included, on every clear, multiplied by
  the Reliquary Gate (up to ×1.5).
- The "Fight the boss again" button (`ui2.js`, `data-from="9"`) makes a clear one battle.
- A boss-only replay also rolls the 30% gear drop and pays 8 + level/3 essence.
- Every other dungeon pays a small repeat reward and no gems.

---

## 3. Monster progression and collection

| System | What happens | Assessment |
|---|---|---|
| **Levelling** | XP needed: 25 at lv 1, 216 at lv 10, 656 at lv 20, 1,257 at lv 29; 14,198 from 1 to 30. One clear of the Heartwood gives 1,428 to each member. | Too generous for the content (section 2.5). The cap (30) arrives with the Island Boss, so the last levels mean nothing. **Confirmed.** |
| **Evolution** (lv 12 and 22, 60 g + 15 food, then 160 g + 40 food) | +42% then +30% to every stat, and a new special move. | **The most meaningful moment in the game (confirmed)**, worth about four levels. The cost is trivial by then (agent: over 1,000 gold at level 12). |
| **Feeding** | Snack 3 food / 18 XP, Feast 10 food / 70 XP. | Works, but adds to over-levelling, and is the only food sink of any size. **Confirmed.** |
| **Move upgrades** | Essence of the move's element: 10/25/50/90 per level (175 per slot, 350 per Amina). +8% to +38% power, 55–70% guard, 28–40% heal. | Meaningful near a boss (≈ one level at move level 3). Dungeon essence is the **foe's** element, and the campaign yields 16–67 per element. There are **no Metal or Resonance habitats**, so Meta, Atem, Zeep and Aimza can only be upgraded through battles and random ruin rolls. **Confirmed.** |
| **Equipment** | 3 slots, up to +17% to one stat per piece; merge two of a tier into the next. A tier IV piece costs about 2,000 gold of crafts and merges. | About 1½ levels for a full set. Ten pieces come from first clears, then a 30% drop per replay. Small but steady. **Confirmed.** |
| **Team composition** | Synergies (Kindred, Twilight, Triangle) and counter-picking matter only at the margin (section 1.4). XP is not shared, so a solo Amina keeps up. | Under-used because of over-levelling. **Confirmed.** |
| **Rarity** | Only Meta and Atem are "legendary" (+8% stats). Bred and found Aminas have no rarity, quality, natures or variation. | **Little to chase (confirmed).** |
| **Breeding and incubation** | 40 gold + 25 food, both parents level 5+, a 20-second egg by default (300 s on "normal"). It always gives the line's level-1 base form for that element pair. | Cheap and instant, and it never gives anything rarer or better. After the first hatch of each recipe it only produces duplicates. **Confirmed.** |
| **Duplicates** | No release, sell or merge; capped at 60 Aminas. | A dead end (confirmed). Habitats are the only use, as resident labour. |
| **Collection incentives** | 63 species: 17 found by exploring, 19 base forms by breeding, the rest by evolving; Meta and Atem from dungeons. Quests at 8, 15 and 24 species. | Nothing after 24. No codex reward per line, no reward for completing a form chain. **Confirmed.** |

---

## 4. Economy audit

### 4.1 Where resources come from

Simulated or derived (`economy.json`, `farming.json`, `campaign-agents.json`).

| Source | Early (after Gathering Hall) | Mid (Hollow Veil) | Late (after Heartwood) |
|---|---|---|---|
| Buildings, gold per hour (assumed layouts, see JSON) | ~720 | ~7,800 | ~74,000 |
| Buildings, food per hour | ~710 | ~2,700 | ~10,800 |
| Buildings, gems per hour (Moon Shrine) | 0 | ~49 | ~187 |
| Full dungeon replay, gold per minute | 100–110 | ~440 | ~420–650 |
| Boss-only legacy replay, gems per hour | 480 (Reliquary) | 1,152 | 1,935 |
| Island Defence and 5v5 practice | 5 rewarded wins a day × ~60 gold / 10 food | same | same: under 0.5% of building income |
| Survival | 12 × wave gold per wave, paid at cash-out; milestones once | | **Unbounded:** at level 30 enemies stop at level 30, and the simulation hit its 80-wave cap every time (38,880 gold for 80 waves; the payout grows with the square of the wave) |
| Loot Ruins | 30–130 gold, 8–35 food, 10–20% for 1 gem, every 30–60 minutes | | negligible |

Campaign totals (agent, dungeons only):

- About 12,000 gold and 2,300 food (if never fed).
- 162 gems: 103 from quests, 162 from first clears and sections, 34 from survival milestones are the one-time
  sources.

### 4.2 Where resources go

| Sink | Cost | Note |
|---|---|---|
| Every building and level, one of each (story, farms, mines, one habitat per element) | ~371,000 gold | About 5 hours of late building income. Once built, gold buys nothing. |
| Gear | 100–520 gold per craft, 60–450 per merge; a tier IV piece ≈ 2,000 | Small |
| Evolution | 220 gold + 55 food per Amina | Small |
| Breeding | 40 gold + 25 food | Small |
| Feeding | 10 food per 70 XP | The only real food sink, and it worsens over-levelling |
| **Gems** | Forge recipes need **22 gems in total**; "Finish now" costs 1 gem per 6 minutes of a timer | **Nothing else.** Islands are no longer sold. |

### 4.3 Findings

1. **Confirmed, Priority 1:** gems have almost no sink and two unlimited sources (legacy boss-only replays and the
   Moon Shrine). Gems lose all value after the early game.
2. **Confirmed:** gold becomes irrelevant once buildings are maxed, a few hours into the late game.
3. **Confirmed:** food is either fed (making the game easier) or piles up unused (2,300 at the end without feeding).
4. **Confirmed:** daily side-mode rewards are too small to matter after the early game.
5. **Hypothesis:** the Moon Shrine was tuned as "slow gems", but its rate is multiplied by resident level (×1.08 a
   level) like the gold buildings. A level-30 resident makes 3.4× the listed rate.
6. **Confirmed:** survival payouts are unbounded at the level cap. Its time cost limits it, but it is the best gold
   per minute in the late game.
7. **Not an exploit:** a defeat pays 5 food. A loss takes as long as a win and pays less.

---

## 5. Player motivation and replayability

| Question | Current state | Evidence |
|---|---|---|
| Reasons to explore the island | Explore areas give fixed finds (17 species) then small rewards; obstacles and ruins give one-time lore and small loot | Data: `D.AREAS`, `D.RUINS` |
| Reasons to collect | Quests at 8, 15 and 24 species; codex | Nothing after 24; no rarity (section 3) |
| Reasons to replay dungeons | Legacy rewards (an exploit) and gear drops; no new challenge | Section 2.6 |
| Reasons to try different teams | Real only at the margin, and players are rarely there | Sections 1.4 and 2.5 |
| Daily and repeatable activities | 5 rewarded PvP/raid wins a day, ruins on 30–60 min timers, survival | No daily quests, no rotating goals |
| Quest variety | 19 main and 18 side quests, linear, one-time; 1 seasonal festival (Duskfall) | `D.QUESTS`, `D.SEASONS` |
| Milestones | Evolutions, dungeon clears, rank, the Island Boss | Strong while they last; the island ends at about 100 battles |
| PvE and side modes | Survival, Island Defence, Hide and Seek and 5v5 practice share no progression with PvE apart from XP and small rewards | Sections 4.1 and 3 |

**Opportunities in existing systems, before new ones:**

- Give the dungeons a reason to replay that is not a reward exploit: challenge modifiers and level-scaled replays
  (section 7).
- Make team choice matter by making the margin common: tighter levels, plus a counter-pick hint on the dungeon card.
- Give duplicates a use.
- Spend gems on something players want.

---

## 6. Confirmed problems, hypotheses and proposals

- **Confirmed problems:** boss-only legacy farming; the gem sink gap; gold irrelevance late; over-levelling; the Cold
  Kiln spike; flat battles 1–9; inert soak, weaken, guard and heal; the swift role and Wind element underperforming;
  duplicates with no use; Obsidian and Celestial unreachable (their quests impossible); survival unbounded at the cap.
- **Hypotheses:** players never see the boss mechanics; repetition comes from flat battles 1–9; the Moon Shrine level
  multiplier is unintended; rank gates are not felt.
- **Proposals:** everything in section 7 marked *creative*.

---

## 7. Prioritised roadmap (for approval; nothing implemented)

For every item: current behaviour → evidence → proposal → benefit → complexity → risk → assets/UI.

### Priority 1 — Essential

**P1-1. Boss-only replays pay the full clear reward.**

- **Now:** "Fight the boss again" pays the whole dungeon reward, including gems on the three legacy dungeons.
- **Evidence:** section 2.6; up to 1,935 gems/hour and 1,277 gold/min.
- **Proposal:** a boss-only replay pays only the boss battle's own reward (and the gear and essence roll), not the
  clear reward. Or keep the button, but pay the clear reward only for a run started from battle 1.
- **Benefit:** removes the dominant farm.
- **Complexity:** low (one condition in `R.resolveBattle`, using `run.start`).
- **Risk:** none to saves; players who used it lose a farm.
- **Assets/UI:** the reward line on the dungeon card.

**P1-2. Legacy dungeons pay gems on every clear.**

- **Now:** the Reliquary (5), Hollow Veil (12) and Resonance Scar (25) pay full rewards on every clear.
- **Evidence:** sections 2.6 and 4.3.
- **Proposal:** move them to the first/repeat model used by the other seven: the current values on the first clear,
  and a repeat of about a third, without gems.
- **Benefit:** a consistent economy.
- **Complexity:** low (data only).
- **Risk:** none to saves.
- **Assets/UI:** reward text only.

**P1-3. The gem economy has no sink.**

- **Now:** 22 gems of recipes and "Finish now".
- **Evidence:** section 4.
- **Proposal:** decide what gems are for first. Options:
  - **(a)** cosmetic and decor items;
  - **(b)** a gem cost on higher Forge merges and on move levels 4–5;
  - **(c)** a reroll of a dungeon's repeat gear;
  - **(d)** cap the Moon Shrine's resident-level multiplier.

  A quick fix: (d) plus P1-1 and P1-2.
- **Benefit:** gems keep their value.
- **Complexity:** low for (d); medium for (a)–(c).
- **Risk:** low.
- **Assets/UI:** (a) needs assets; (b) and (c) need small UI.

**P1-4. The Cold Kiln spike.**

- **Now:** a level-12 stage-2 boss with 1.55× health at recommended level 10, before players can evolve.
- **Evidence:** 0–25% clear at recommended; 100% at +2.
- **Proposal:** either raise "recommended" to 12, or make the boss level 11 with 1.35× health, or make the boss
  stage 1 (Pyro-Cell).
- **Benefit:** the first water-counter lesson without a wall.
- **Complexity:** low (data).
- **Risk:** none to saves.
- **Assets/UI:** none.

**P1-5. Over-levelling makes the campaign strategy-free.**

- **Now:** players arrive 3–10 levels above recommended.
- **Evidence:** section 2.5.
- **Proposal:** pick one or two, test with the simulator, then decide:
  - **(a)** lower dungeon XP for repeats and for battles below the party's level (for example −50% when a foe is 3+
    levels below);
  - **(b)** raise dungeon levels to match where players really are (recommended 6, 8, 10, 12, 14, 17, 19, 21, 24,
    27);
  - **(c)** steepen `xpNeed` after level 12.

  (a) keeps the authored levels and is the least disruptive. (b) makes the late levels meaningful.
- **Benefit:** guard, heal, statuses and counter-picks start to matter.
- **Complexity:** low to change; **medium to verify** (rerun the full simulator and the browser tests).
- **Risk:** existing saves keep their levels and simply find the next dungeons easy; no data migration is needed.
- **Assets/UI:** none.

### Priority 2 — Important

**P2-1. A difficulty ramp inside dungeons.**

- **Now:** battles 1–9 are flat.
- **Proposal:** spread the nine levels over rec−2 to rec+1, and give battles 7–9 the dungeon's stage-2 forms (or a
  section mini-boss at battle 6 with a health multiplier).
- **Benefit:** fewer filler battles and a build-up to the boss.
- **Complexity:** low (the `nine()` parameters).
- **Risk:** none.

**P2-2. Make guard and heal worth a turn.**

- **Now:** no effect, or harmful (section 1.4).
- **Proposal:** make them free of the turn cost, or give them a rider:
  - guard reflects 25% of a blocked guardian move, or also clears one status;
  - heal also cleanses burn and soak;
  - keep a guard-type move available after evolution (today Nature and Metal lose theirs at stage 2).
- **Benefit:** real choices against telegraphed charges.
- **Complexity:** medium (engine plus move text).
- **Risk:** low.
- **Assets/UI:** move descriptions.

**P2-3. Soak and weaken.**

- **Now:** no measurable effect.
- **Proposal:**
  - **Soak:** the target's next special costs one extra turn of cooldown (speed rarely matters in a 3-turn fight).
  - **Weaken:** give attack-lowering moves the same power as the basic move or more, and make the game's
    auto-battle use them when the foe is charging.
- **Benefit:** two more status choices.
- **Complexity:** low to medium.
- **Risk:** low.

**P2-4. The swift role and the Wind element.**

- **Proposal:**
  - **Swift:** going first also gives +10% damage on the first turn of each battle, or a dodge chance.
  - **Wind:** add a resistance (Wind resists Earth, its weather-beaten opposite).
- **Benefit:** 7 lines become viable.
- **Complexity:** low.
- **Risk:** this is a balance change and needs the simulator.

**P2-5. Make burn's boss scaling deliberate.**

- **Now:** burn takes 6% of max health, so it scales with boss health multipliers.
- **Proposal:** cap burn on guardians at the value of a normal foe of the same level, or keep it as Fire's intended
  boss niche and say so in its description.
- **Benefit:** clarity.
- **Complexity:** low.

**P2-6. Counter-pick hints.**

- **Now:** the dungeon card shows the theme element. The boss's own element can differ (the Cold Kiln's boss is
  Earth; the Heartwood Stag shifts).
- **Proposal:** show "Weak to" icons for the boss on the dungeon card and in party selection.
- **Benefit:** makes the biggest lever visible.
- **Complexity:** low.
- **Assets/UI:** existing element icons.

**P2-7. Duplicates.**

- **Proposal:** "Release to the wild", which returns food and essence of its element. Or "Share strength": merge a
  duplicate into an Amina of the same line for move essence or a small permanent stat bonus.
- **Benefit:** breeding and collecting get a purpose; it also fixes the essence gap for Metal and Resonance.
- **Complexity:** medium.
- **Risk:** saves need no migration (a new action).
- **Assets/UI:** one panel.

**P2-8. Essence availability.**

- **Proposal:**
  - add Metal and Resonance habitats, or let any habitat make the essence of its residents' element;
  - make dungeon essence the party's choice of element at the end of a clear.
- **Complexity:** low to medium.

**P2-9. Survival at the cap.**

- **Proposal:** let enemy level rise past 30 inside survival only (or raise health per wave), and cap the gold per
  wave.
- **Complexity:** low.
- **Risk:** low.

**P2-10. Daily goals.**

- **Proposal:** 3 rotating daily tasks from existing quest types (feed, clear sections, win battles, search ruins,
  hatch), paying gems and essence, so that each day has a short goal.
- **Complexity:** medium (the quest system already supports per-day ids, as in `events.js`).
- **Assets/UI:** a small panel.

**P2-11. Unreachable quests.**

- **Now:** "The Dark Shore" and "Above the Clouds" can never complete in a new save.
- **Proposal:** hide them until the Verdant Wilds has its dungeons, or mark them "coming later".
- **Complexity:** low.
- **Risk:** none.

### Priority 3 — Optional (creative, future phases)

- **P3-1. Content for the Verdant Wilds:** ten dungeons following the same data model. The biggest single extension
  of play time.
- **P3-2. Challenge replays:** a cleared dungeon can be replayed with modifiers (enemies +5 levels, no healing between
  battles, a single element only) for essence and cosmetic rewards.
- **P3-3. Variation in hatchlings:** a small chance of a hatchling with a coloured variant (a recolour of the existing
  voxel model) or a +5% stat "temperament". Collection depth without new species.
- **P3-4. Team-of-foes battles in late dungeons:** two foes, which makes switching and status spreading meaningful.
- **P3-5. Gem cosmetics:** island decor and avatar items for gems.

---

## 8. Regression and technical follow-up

### Dialogue panel test: the approved condition wait

`tests/browser-polish16b.test.js` used a fixed `sleep(500)` after opening each dialogue. It now waits until:

- the newest panel shows the whole line;
- its entrance animation has finished;
- the Aa/Auto/Skip row has stayed in place for two consecutive checks.

The maximum is 8 seconds. The final-layout checks are unchanged: on screen, and not covering Aa/Auto/Skip. Settled
measurements at 844×390, three runs, identical each time:

| Text size | Panel top | Row bottom | Gap |
|---|---|---|---|
| Standard | 261.3 | 255 | 6.3 px |
| Large | 237.5 | 231 | 6.5 px |
| Larger | 194.2 | 188 | 6.2 px |

### The transient overlap, investigated separately (no change made)

- **Cause:** the panel enters with a 0.2 s `fadein` that starts it 0.5 rem lower. The ResizeObserver that places the
  row runs at creation, against the panel's not-yet-risen position. When the panel rises, the row overlaps its top
  edge by 1–2 px until the next resize re-places it, which happens when the text fills.
- **Measured:** 1–2 px overlap for the first ~130–260 ms of each new panel (`tools/p16c-dialogue-probe.js`), during
  the fade-in. It is gone at rest.
- **Not changed:** a fix (re-place the row on the panel's `animationend`) is a one-line UI change. It is listed for
  approval rather than made, since this phase preserves the UI.

### Correction to Phase 16C

**Playwright's `waitForFunction` does not wait for a promise returned by its check.** A promise counts as "true" at
once (verified: a check resolving to `false` passed after 28 ms).

- In Phase 16C, the Dev 8 "page is responsive" wait (three frames under 250 ms) used such a check. **It returned at
  once and enforced nothing.**
- The Dev 8 passes reported in 16C did not depend on it, but the 16C report described it as working. That was wrong.
- It is now a synchronous check over frame times the page records itself (max 60 s).
- Dev 8 passes normally with it (42/42).
- No other test uses a promise-returning check.

### Regression results

- **Static checks:** every `src`, `src/3d`, `tests` and `tools` script passes a syntax check (`node --check`).
- **Full suite:** `node tests/run-all.js`, 48 suites, **1,596 passed, 0 failed**
  (`docs/audit17a/runs/full-suite-17a.log`). This includes `browser-polish16b` 34/34 and `browser-dev8` 42/42.
- **Under CPU load** (3 saturating processes on 2 cores, one run each): Dev 8 42/42 (it failed every time under load
  in 16C) and the dialogue test 34/34 (`docs/audit17a/runs/*-load.log`). One run each is not proof of stability
  under load.
- The simulator is deterministic and runs in about 10 seconds: `node tools/p17a-sim.js`.

### Known limitations

- Simulated players use fixed policies. A human may play better (counter-picks) or worse.
- Times use an assumed 4.5 s per turn.
- The economy layouts for early, mid and late are assumptions (stated in `economy.json`).
- Islands other than the starter have no dungeons, so this audit covers the starter island campaign only.
- No physical iPhone testing.
