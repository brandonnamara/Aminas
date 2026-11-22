# Phase 17C — Progression and economy

Branch `p17c-progression-economy`, from Phase 17B (`8ded42a`). Production `main` (`0fc9e36`) is untouched.
Everything below was measured in Node simulations of the real rule code and in Chromium (Playwright, software WebGL, an
844×390 touch viewport). **No physical iPhone testing was done.**

Reproduce: `node tools/p17c-sim.js` (progression, healing, economy, release; ~2 s),
`BASE_REF=8ded42a BASE_NAME='Phase 17B' MOD_NAME='Phase 17C' node tools/p17b-sim.js docs/audit17c/combat` (combat),
`node tools/p17c-experiments/heal-defence.js` (the healing/defence variants that were tried). Raw results: `docs/audit17c/`.

## 1. XP: Option A (reduced XP from much weaker foes)

`D.XP17 = { on: true, scale: { 3: 0.75, 4: 0.5, 5: 0.25 } }`, applied in `partyAfterWin` (dungeons and Survival) per
Amina, from the gap between that Amina's level and the battle's level:

| Gap (your level − foe level) | XP |
|---|---|
| 2 or less (including any fight at or above your level) | 100% |
| 3 | 75% |
| 4 | 50% |
| 5 or more | 25% |

- New content is never reduced: a dungeon's battles are at or above its recommended level, so a team arriving on level
  gets full XP. Only replaying content well below you is reduced.
- Evolution stays at 12 and 22. Feeding is unchanged (it never used battle XP). Existing levels and XP are never
  touched; nothing is taken away from a save.
- The battle result says why: "· 25%: the foe was 6 levels below".
- `D.XP17.on = false` restores 17B XP exactly.

### Full Starter Island campaign (balanced team from level 3, tactical play, dungeons in order; 3 seeds)

| | 17B no feeding | 17C no feeding | 17B half food | 17C half food | 17B all food | 17C all food |
|---|---|---|---|---|---|---|
| Level at the end | 25.0 | 22.0 | 29.0 | 25.0 | 29.7 | 25.3 |
| All three reach 12 (first evolution) | battle 30 (~8 min) | battle 40 (~11 min) | battle 22 | battle 31 | battle 21 | battle 31 |
| All three reach 22 (second evolution) | battle 82 (~17 min) | battle 97 (~23 min) | battle 69 | battle 91 | battle 68 | battle 90 |
| Losses / extra grinding replays | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

Minutes are battle time only (4.5 s a turn), not exploring or menus.

Average level on arrival at each dungeon (recommended level in brackets), no feeding:

| Dungeon | 17B | 17C | 17C readiness |
|---|---|---|---|
| Forgotten Road (4) | 3 | 3 | −1 |
| Gathering Hall (5) | 6.7 | 6.7 | +1.7 |
| Reliquary (6) | 9.7 | 9.0 | +3.0 |
| Drowned Steps (8) | 12 | 10 | +2.0 |
| Cold Kiln (10) | 14 | 12 | +2.0 |
| Hollow Veil (12) | 16 | 14 | +2.0 |
| Lantern Orchard (14) | 18 | 15 | +1.0 |
| Windstair (16) | 19.7 | 17 | +1.0 |
| Resonance Scar (18) | 21 | 19 | +1.0 |
| Heartwood (20) | 23 | 21 | +1.0 |

In 17B an un-fed team arrived 3–4 levels over every dungeon from the Reliquary on, and a fed team 6–7 over; in 17C
that is 1–2 (no feeding) and 3–4 (feeding). The first evolution moves from around the Drowned Steps to around the
Cold Kiln, and the second from the Resonance Scar to the Heartwood — still inside the island.

**Effects on players**
- *Basic-attack player* (no tactics, half food): 0 losses in both versions; arrives 2.7–4.7 over instead of 6–7.
- *New player with only the starter* (no feeding): **7 losses and 3 grinding replays in 17C, against 0 in 17B.** This is
  the case most exposed to the change and is reported as a concern (section 10). A softer table (85/60/35%) was tried:
  5 losses and 2 replays, so the solo case is mostly about having one Amina, not the exact percentages.
- *Existing players*: no levels are lost. Replaying old content is much slower XP — a level-18 Amina replaying the
  Forgotten Road gets 106 XP instead of 414, the Cold Kiln 202 instead of 801; a level-25 Amina in the Heartwood gets
  544 instead of 1,428. New content (and Survival's deeper waves) still pays in full.
- Option C (a steeper curve) was not implemented.

## 2. Healing and defence

Changes (all small, all switchable in `D.COMBAT17`):
- Healing moves restore 5 points more at every level (Lv 1–5: 30/33/36/40/45%, was 25/28/31/35/40%), and Mend and Hum's
  follow-up regeneration lasts **3 turns** instead of 2.
- **Guard recoil** (`guardReflect: 0.25`): an attacker that hits a guarding Amina takes 25% of the damage dealt back.
- **Tank counter** (`tankCounter: 0.5`): the counter after guarding is 50% for Aminas whose role is tank (30% for others).

Combat sweep, Phase 17B vs 17C (clear rates at recommended −2, −1, 0, +1, +3; 60 seeds):

| Team | 17B | 17C |
|---|---|---|
| Defensive, guard-and-counter play | 20.8 / 52.2 / 80.2 / 86.5 / 100 | **42 / 64.5 / 88 / 89.7 / 100** |
| Defensive, normal tactical play | 22 / 54.2 / 80.2 / 80.7 / 100 | 34.7 / 58.5 / 80.7 / 85.5 / 100 |
| Balanced | 31.8 / 70.5 / 93.8 / 98.8 / 100 | 32 / 70.5 / 93.8 / 98.8 / 100 |
| Heal and status | 33.5 / 67 / 90.3 / 98.2 / 100 | 33.7 / 67.5 / 90 / 98.8 / 100 |
| Type advantage | 52.7 / 72.7 / 100 / 100 / 100 | 52.8 / 71.7 / 100 / 100 / 100 |
| Basic attacks only | 0.5 / 17.3 / 75 / 82.8 / 100 | 0.5 / 16.7 / 74.7 / 82.8 / 100 |

- Nature/Metal defensive teams now have a strategy (guard, take the recoil, counter) that reaches the balanced team at
  and above level, without passing it below level, and without changing other teams.
- **Healing value** over every Starter Island dungeon one level under (Aimza, Acinus, Kairyu): 17B −0.5 points (healing
  was worth nothing), 17C **+2.3** (68.7% with healing vs 66.3% never healing). Small but now positive.
- Per-dungeon tactical margins (17B → 17C): Gathering Hall 97.7 → 99.3, Reliquary 47 → 54.3, Drowned Steps 64.7 → 80,
  Cold Kiln 25.3 → 28.7, Hollow Veil 46 → 56, Windstair 37.3 → 44.3, Resonance Scar 54.7 → 58.7, Heartwood 14 → 22.3.
  Basic attacks alone are unchanged, so tactics still decide fights. 0 softlocks.
- Variants that were tried and rejected are in `docs/audit17c/heal-defence-variants.json` (e.g. +5% heal alone: +1.7;
  3-turn regen alone: −0.2).

## 3. Retained moves in creature details

- The moves tab shows the kept move as a third row: "Leaf Guard · Kept from Acinus · every 3 turns", its effect, level
  pips, the next level's value and the upgrade button — the same row design as the other moves.
- Upgrades use the existing essence system (`R.upgradeMove` accepts slot 2; costs 10/25/50/90). Purchased levels are
  stored in `mv[2]`. Saves without it read as Lv 1; nothing is charged twice (tests check a second upgrade charges only
  the next level, and old saves load unchanged).
- In battle the kept move uses its level (`R.moveLevels`).

## 4. Duplicates: voluntary release for essence

- Only from a duplicate's row in creature details (☆ favourite toggle and "Release" appear only when you own more than
  one of that species). A confirmation sheet shows which one, its level, exactly what it gives, and that the Codex keeps
  the species. Nothing is ever removed automatically.
- Protected (cannot be released): your last of a species, the companion, one in a dungeon run or Survival, in a saved
  team (Island Defence or the 5v5 roster), living in a building, wearing gear, favourited, or legendary. Eggs record their
  parents' species, not the Aminas, so releasing a parent never affects an egg. The sheet says why.
- Essence = 2 + level + 5 per evolution stage after the first, in the Amina's element, plus half of the essence spent on
  its moves. Level 1: 3, level 5: 7, level 10: 12, level 20: 27, level 30: 42.
- Why these rates: breeding costs 40 gold and 25 food per egg, so breeding just to release gives 3 essence per egg — a
  max-level move (175) would need ~59 eggs (2,360 gold, 1,475 food). That makes it a useful gold/food sink without
  replacing habitats and ruins as the main essence source. Feeding a duplicate up first costs ~17 food per essence.

## 5. Economy

Gem income per day from the Moon Shrine (collected regularly over a week):

| Shrine level, residents | 17B, plays 16 h | 17B, plays 4 h | 17C |
|---|---|---|---|
| Lv 2, level-10 resident | 768 | 192 | 9 |
| Lv 4, level-20 residents | 3,182 | 936 | 18 |
| Lv 4, level-30 residents | 4,161 | 1,224 | 18 |
| Lv 4, away a week, collects once | 70 | — | 18 |

(17C is the cap per calendar day, 6/9/13/18 by level; the week-long simulation collected exactly the cap for every
calendar day it touched, whether collecting often or once.)

The 17B shrine was the economy: thousands of gems a day against ~300 one-time gems from quests, dungeons and Survival
and ~10 a day from ruins. In 17C it gives at most 6/9/13/18 a day by level.

- **Offline is not punished**: each day's moonlight is stored (up to the shrine's storage), so a player away for a week
  collects the same as one who checks in often — in 17B they got far less (70 a day).
- Buildings, residents and existing gem balances are untouched.
- The panel explains it: "Produces: 1.1 gems / min, up to 18 a day" and "Moonlight today: 7 / 18 gems — Residents make it
  faster, but it condenses at most 18 gems a day…".
- Gold production was left alone: the issue there was a lack of sinks, not too much income. New sinks: breeding to
  release, and gem conveniences below.

## 6. Gem spending (no paid currency, nothing that wins fights)

- **Hatch now**: an incubating egg can be finished for 1 gem per started 6 minutes left — the same rate as finishing a
  building. A confirmation states the price.
- **Essence exchange**: gems for essence of an element you choose, 3 essence per gem, at most 30 gems a day. Offered
  beside a move upgrade you cannot afford; the sheet states rate, daily limit and price. It mostly helps Metal and
  Resonance, which have no habitat.
- Existing gem uses (forge, finishing buildings) are unchanged. No premium currency or purchases were added.

## 7. Long-term progression — recommendations only (nothing built)

1. **Next island** with dungeons recommended 22–30, so second-stage Aminas have new full-XP content after the Heartwood.
2. **Collection milestones** in the Codex (e.g. 10/20/30 species, all of one element) paying essence and cosmetics.
3. **Repeatable challenges**: weekly dungeon modifiers (no healing, Metal only) with fixed gem/essence rewards.
4. **Daily objectives** (three small tasks), capped, never required, rewarding essence of the day's element.
5. **Essence**: a Metal and a Resonance habitat on the next island so those elements stop depending on the exchange.
6. Revisit XP after the next island exists (Option C should only be considered with that content in place).

## 8. Tests

- `tests/progression17c.test.js` (new): 48 checks — XP scale, kept-move upgrades and saves, release safety, Moon Shrine
  moonlight (daily cap, offline storage, old saves), Hatch now, the exchange and its daily limit, heal values, recoil.
- `tests/browser-progression17c.test.js` (new): 14 checks in Chromium with screenshots in `docs/ui/screens17c/`.
- Changed existing checks, because of approved behaviour changes: `dev8` (Lv 5 heal now 45%), `combat17b` (tank counter
  uses `tankCounter`; a move list without a kept move has length 2), `browser-progress13a` (3 move rows for an evolved
  Amina), `browser-combat17b` (reads every battle-log line, since recoil follows the counter).
- Full regression: see section 9.

## 9. Full regression

**Final run: 1,738 passed, 0 failed (53 suites)** — `docs/audit17c/regression-run2.log`.

The first full run (`regression-run1.log`) had 1,731 passed and 7 failed. All are documented here:
- `browser-progress13a` (1) and `browser-combat17b` (1): checks written before 17C — an evolved Amina's moves tab
  now has 3 rows (the kept move), and the guard recoil line now follows the counter line in the battle log, so the
  check read only the last line. Both checks were updated (the counter check now reads every log line shown); the
  behaviour they test is unchanged and still checked.
- `browser-perf-fix` (4): timing-sensitive frame-rate checks. They also fail intermittently on the unchanged 17B code
  (1 of 3 runs there; 1 of 4 on 17C). Not changed.
- `browser-dev7` (1, "the Forge closes"): intermittent: a check failed in 3 of 21 runs on 17C (twice this one), 0 of 5 on 17B, and none of
  the last 14 runs. 17C does not touch the Forge; the check waits a fixed 300 ms after closing. Not changed, but noted.
- `docs/ui/screens15d/status-chips.png` is rewritten by a test run and was restored before committing.

## 10. Known limitations and concerns

- **Solo new players**: with only the starter and no feeding, the 17C campaign had 7 losses and 3 replays (17B: 0).
  Real players usually have a team by the Reliquary, but this is the group most affected.
- Minutes in the tables are simulated battle time, not real play time.
- The healing gain is small (+2.3 points); healing is still not a strong strategy on its own.
- The essence exchange lets gems speed up move upgrades (at most 90 essence a day). It does not buy levels, Aminas or
  gear, but it is the one gem use that touches combat strength.
- XP reduction uses the battle's level, not each foe's; a dungeon's late battles are higher, which favours players.
- `browser-dev7` and `browser-perf-fix` are intermittent (see section 9).
- Pre-existing wording: the duplicates list heading reads "Your Acinuss" (plural of names ending in s). Not changed.
- No physical iPhone testing.
