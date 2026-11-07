# Aminas · Phase 6 — Combat UI, Prismatic Icons & Unified Reward Presentation

**Branch:** `ui6-combat`, created from `ui5-prismatic` at `6a6b8fd` ("Phase 5: Prismatic Fantasy UI design system").
That branch sits on `env4-visual` (`9051d10`). Production (`main`, `0fc9e36`) and every earlier milestone branch
are untouched.

Design rules: `docs/ui/UI_PHASE6.md`. Live component gallery: `tools/ui6-gallery.html` (screenshot:
`docs/ui/gallery6.jpg`). Before and after screenshots: `docs/ui/screens6/{before,after}/`.

## Starting point (verified)
* `git log`: `6a6b8fd` Phase 5 → `9051d10` Phase 4 → `01a08d7` / `73d6d99` Phase 3 → … → `0fc9e36` (main).
* `src/ui-prism.css` and `src/ui-prism.js` are present.
* The baseline suite on unmodified Phase 5 gave 431/432. The one failure, the env1 "tap the voxel Hatchery" check,
  is load-sensitive: it ran while screenshots were being captured and passed 20/20 when run alone.

## What changed

### Combat (highest priority)
* **Fighter panels:** faceted glass plates with a strip in the element's colour, an element gem, the name, a gold
  level tag, the health bar, numbers and conditions.
* **Health bars:**
  * a crystal tube divided into tenths, green → amber → red;
  * damage drops the fill at once while a pale "lost health" band holds and then drains;
  * healing shows a mint band first and the fill grows into it;
  * transform-only animation, instant with Reduce motion;
  * below 25%: a red panel, a red bar and a "Critical" label;
  * the bar element now lives for the whole battle; it used to be rebuilt on every update, which is why it could
    never animate before.
* **Turn indicator** (new, top centre):
  * the turn number, "Your move", "<name> acts" or "Choose an Amina";
  * while you choose, who acts first, read from the game's own speed rule;
  * the acting fighter's panel lights up, and yours has the cyan rim while it is your move.
* **Moves:**
  * each has its element gem and colour, a name, what it does ("Pow 45", "Heal · self", "Guard · self") and its
    cost in words ("Special · every 3");
  * clear states: ready, recharging (with the turns left), silenced, waiting, chosen (cyan, with an activation
    flash) and suggested (gold);
  * effectiveness tags: Strong, Weak, Blocks the charge, Cracks barrier.
* **Conditions:**
  * every status shows as a chip with an icon, its turns left, and ▲ for a buff or ▼ for a debuff;
  * two existing hidden states are now visible: attack down (×n) and guarding;
  * Guardian and Island Boss traits get tags;
  * **tap any chip** for a plain-words explanation.
* **Damage and healing numbers:** outlined crystal digits with labels (Super effective, Resisted, Heavy blow,
  Guarded, Regen). Bug fixed: an older `.float` rule made battle numbers bob in place instead of rising and fading.
* **Transitions:**
  * a prismatic wipe into every battle;
  * a title card for guardians and the Island Boss, shown inside the existing opening beat so it adds no waiting;
  * both are skipped with Reduce motion and Battery saver.
* **Victory:**
  * the header has a crest, where it happened, and the title;
  * then dungeon progress, the rewards grouped by source, any new island, and the party's experience (Aminas still
    standing hop to celebrate);
  * guardians get the gold crown banner, frame and rays; the Island Boss gets the full spectrum treatment;
  * bug fixed: equipment found in a battle used to pop up as a separate card covering the victory title; it now
    appears on the result itself.
* **Defeat:** cool silver-violet with a moon crest and no celebration effects. It lists what you keep (progress,
  levels, the consolation food), then one tip, then Try again.
* **Layout:**
  * the player panel sizes itself into the space between the party and the moves, and moves above the party when
    you bring five;
  * moves, Switch and party buttons have a 44 px minimum (the root font shrinks on small phones, so rem-only sizes
    used to drop to 36 px).

### Prismatic icon collection
* **Audit:**
  * thin line icons sat next to Dev 8's pixel currency sprites;
  * at 16–20 px they blurred;
  * `star`, `hammer` and `spark` each carried many meanings;
  * there were no icons for rank, XP, the Forge, bosses, cooldowns or elements.
* **New:** 52 voxel-crystal sprites in one shared style. Each is a 16×16 pixel sprite with the same ink outline
  and the same top-left light, and renders as crisp SVG. They cover:
  * navigation and places;
  * profile and rank;
  * creatures, habitats and the hatchery;
  * the Forge and crafting;
  * battle moves and conditions;
  * all nine elements;
  * settings.
* **Kept, as clear as they were:** the 11 control glyphs and the Dev 8 currency and essence sprites.
* **Element chips everywhere** now carry their glyph, so colour is never the only cue.
* **States:** selected (cyan glow), pressed, disabled, and rarity frames on the reward ladder.

### Unified rewards
* **`UI.Rewards`:** one tile, group and card for every reward kind:
  * gold, food, gems and essence;
  * experience, rank XP and player rank;
  * equipment;
  * a new Amina and a new island.
* **One rarity ladder** (`UI.RARITY`):

  | Rarity | Treatment |
  |---|---|
  | Common | calm |
  | Uncommon | green |
  | Rare | blue, glow, small burst |
  | Epic | violet, glow, one sweep |
  | Legendary | gold prism, rays |
  | Mythic | full spectrum, turning rays, repeating sweep |

  Mythic items used to look like legendary; they are now the top step. Legendary Aminas use the gold step.
* **Where it is used:**
  * dungeon victories and boss victories;
  * equipment finds (now with the source, e.g. "The Forgotten Road");
  * task rewards (they used to float "+150 gold" text; now a card shows the task, the amounts and rank XP);
  * Loot Ruins;
  * Survival waves and the summary;
  * Practice results.
* **Special moments:**
  * a new Amina shows the creature as the largest element, with a quiet "Collection n / 63" line;
  * a legendary Amina gets the gold frame and tag;
  * a new island gets a spectrum card, on the result and afterwards;
  * guardian and Island Boss victories (see Combat).

## Files
| File | |
|---|---|
| `src/ui-combat.css` | new: all Phase 6 styles, built from the Phase 5 tokens |
| `src/icons-prism.js` | new: icon builder and 52 sprites; `Art.icon` routes names to them |
| `src/ui-rewards.js` | new: reward tiles, groups, cards, the ladder, the item card, discovery and island wrappers |
| `src/ui2.js` | battle presentation (panels, bars, turn, moves, conditions, numbers, transitions), victory, defeat |
| `src/ui-pve.js` | ruins, survival and practice results use reward groups |
| `src/ui-world.js` | task claims use the reward card |
| `src/ui-v07.js` | equipment found during a result goes onto the result |
| `src/ui.js` | element chips carry their glyph |
| `src/ui-prism.js` | the ladder and the item card moved to `ui-rewards.js` |
| `index.html` | the three new files; title "Aminas UI 6" |
| `tools/ui6-gallery.html`, `tools/ui6-gallery.js` | live gallery, rendered by the game's own code |
| `tests/browser-ui6.test.js` | 45 new checks |

**Untouched:**
* the rules and data: `rules.js`, `data.js`, `roster.js`, `campaign-data.js`, `gear-data.js`, `quests.js`,
  `forge.js`, `essence.js`, `achievements.js`, `world*.js`;
* the save code (`state.js`);
* the 3D runtime;
* all island and monster art.

## Scope and preservation
* No battle calculation, health, ability, difficulty, monster stat, progression, reward amount, probability or
  dungeon/island progression changed. `git diff ui5-prismatic` lists none of those files.
* **Turn order** is displayed, not changed. It reads the same rule as the battle: `B.speed(player) >= B.speed(enemy)`.
* **Attack down and guarding** were already in the battle state; they are now shown.
* **Task rewards** show the same rank XP that `quests.js` grants (15 or 25).
* **Saves:** no schema change (still 6) and no new fields. The new interface's state lives on `UI`, never in the
  save. The test checks that the keys after a full battle and victory equal a fresh save's, and that nothing from
  the interface is written. The existing migration suite (old saves) passes.
* **Battle modes** all pass their existing tests: dungeons, guardians, the Island Boss, Survival, 5v5 practice,
  raids and defence.

## Tests (all actually run)
| Suite | Result |
|---|---|
| baseline / campaign / migration v0.6 / modes / forge / dev8 | 5 / 60 / 22 / 41 / 53 / 49 passed |
| browser v0.6 / dev7 / dev8 / env1 / env1.2 / library / env3 / env4 / ui5 | 48 / 30 / 42 / 20 / 10 / 11 / 19 / 10 / 12 passed |
| **browser ui6 (new)** | **45 passed** |
| **Total** | **477 passed, 0 failed** (full `node tests/run-all.js`, exit 0) |

**Two older tests were updated for renamed markup:**
* v0.6 looked for the barrier as `.bar.shield`; it is now `.hpb.shieldb`.
* ui5 expected a mythic item card to read "Legendary find"; it now reads "Mythic find".

**What the new suite covers:**

| Area | Checks |
|---|---|
| Contrast | 18 new text pairs at WCAG AA (lowest 8.5:1) |
| Icons | every icon the game asks for (41 names) resolves to artwork; navigation and element chips use the new icons |
| Panels and turn | panel content; the bar equals real health; turn order matches the rule |
| Moves | ready, recharging (the turns left), silenced and chosen, with the flash |
| Health animation | the acting highlight; the damage band then the drain, with the number equal to real health; heal; critical |
| Conditions | buff and debuff chips with turns; tap-to-explain |
| Boss tags | Guardian and Island Boss tags; the Island Boss title card |
| Layout | no overlaps and nothing off screen at iPhone SE, iPhone 13/14, Pro Max and iPad landscape; 44 px minimum; portrait still asks to rotate |
| Reward kinds | every kind renders; amounts and labels |
| Rarity | six distinct rarity looks; celebration rising with rarity (common 0 sparks); the source line |
| Victories | normal victory spoils equal what the rules paid; guardian banner; equipment on the result; the result fits; Island Boss banner and the island unlock |
| Defeat | calm, nothing celebrating |
| Discovery | the creature is the largest thing; legendary frame |
| Motion settings | decoration runs normally and stops in Battery saver and with Reduce motion; instant bars and no wipe with Reduce motion |
| Saves and errors | save compatibility; no script errors |

## Performance
**Environment:** desktop Linux container, headless Chromium (Playwright) with SwiftShader software WebGL, at a
phone-sized 844×390 @3× viewport. **This is not an iPhone**, so these numbers do not predict iPhone performance;
only the before/after difference on identical hardware means anything. Each figure is the median of 3 runs, with
the same scripted Island Boss battle for Phase 5 and Phase 6 (`docs/perf/ui6-perf-*.json`).

| 2D battle | Phase 5 | Phase 6 |
|---|---|---|
| Idle, waiting for a move: frame time p50 / p95 | 16.7 / 16.8 ms | 16.7 / 16.8 ms |
| Idle: style recalculation | 21 ms/s | 49 ms/s (finite pulses at low health) |
| Four turns: frame time p50 / p95 / max | 16.7 / 16.8 / 33.4 ms | 16.7 / 16.8 / 33.4 ms |
| Four turns: style recalculation | 33 ms/s | 74 ms/s |
| Victory screen idle: main-thread work | 139 ms/s | **23 ms/s** (the battle now pauses behind the result) |

**3D battle:** no measurable difference. Frames are bound by software WebGL (p50 50 ms in both phases), and style
work during the turns rose from about 4.5 to 11 ms/s.

**What was done for performance:**
* Every new effect is transform or opacity only.
* All loops are finite except the mythic reward tile.
* The battle's own animations pause while a panel covers it.
* Everything decorative stops in Battery saver and with Reduce motion.
* After about 9 s of idle, Phase 6 runs fewer animations than Phase 5: the telegraph's endless glow is now
  finite.

The extra style work during turns comes from the richer per-turn rendering. It did not change frame times here,
but it **needs confirming on your iPhone**.

## Known limitations
* Status chips are small (the tap area is enlarged to about 26 px). They are information rather than controls, and
  every move, Switch and party button meets 44 px.
* The 3D stage is unchanged. Active-monster highlighting is on the panels, not in the 3D scene.
* The icons are code-drawn pixel art. A few (boss, the claw slashes) are simple and could get a hand-polish pass.
* Achievement toasts and the level-up and rank-up banners keep their Phase 5 look, with the new icons. They give
  no item rewards, so they did not need the reward card.
* Not tested on a real iPhone.
