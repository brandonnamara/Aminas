# Aminas UI · Phase 6 additions to the design system

Combat interface, prismatic icons and unified rewards. Everything here extends `UI_DESIGN_SYSTEM.md` (Phase 5)
and is built only from its tokens: amethyst glass, opal surfaces, spectral rims, faceted corners, gold for the
main action, cyan for selection, and the spectrum for rare things.

Files: `src/ui-combat.css` (styles), `src/icons-prism.js` (icons), `src/ui-rewards.js` (rewards), the battle
section of `src/ui2.js` (combat presentation). Live gallery: `tools/ui6-gallery.html` (rendered by the game's
own code).

---

## 1. Icons

### Audit of the existing icons (before Phase 6)

| Finding | Detail |
|---|---|
| Two unrelated styles side by side | 37 thin line icons (24×24, 1.8 px stroke, one colour) next to Dev 8's full-colour pixel sprites for gold, food, gems and essence. In the HUD and on result cards they sat in the same row. |
| Hard to read when small | At 16–20 px the strokes are about 1.3 px wide. `paw`, `gear`, `swords` and `compass` blur together at that size. |
| One icon, many meanings | `star` stood for Guardian, Island Boss, first clears, milestones and rewards. `hammer` meant both Build and the Forge. `spark` had 13 uses. |
| Missing icons | No icon for rank, XP, the Forge (anvil), merging, habitats, breeding, bosses, turn order, cooldowns, attack-down, guarding or settings. Elements were shown by colour and name only. |
| Similar status icons | `burn` and `soak` shared a silhouette (a flame and a drop) and were told apart mainly by chip colour. |

### What changed and what was kept

* **New: 52 prismatic voxel sprites** (`A.Icons`). They cover navigation and places, profile and rank,
  creatures, habitats and the hatchery, the Forge and crafting, battle moves and conditions, all nine elements,
  and settings.
* **Kept, because they are already clear:**
  * The 11 control glyphs: `close`, `check`, `plus`, `minus`, `back`, `arrow`, `up`, `rotate`, `move`, `info`
    and `swap`. They are universal UI signs and stay clean line icons.
  * The Dev 8 currency and essence sprites (gold, food, gems, essence), which already match the voxel look.
* **Same names, so nothing moved.** `Art.icon(name)` returns the new sprite wherever the game already asked for
  that name. The tests check that every one of the game’s 41 icon names resolves to artwork.

### How an icon is made

Each icon starts as a 14×14 text silhouette, one letter per material. The builder then:

* adds the shared ink outline (`#1c1238`), giving 16×16 in total;
* lights every icon the same way: the top and left edges get the material's highlight, the bottom and right
  edges its shade;
* treats `w` as a hand-placed glint and `k` as an ink detail.

The output is crisp SVG (`shape-rendering: crispEdges`, one `<rect>` per run, cached), so it stays sharp at any
size and screen density.

### How icons use colour

Each icon uses its natural material: steel, wood, parchment, stone, and gold for things of value. Element glyphs
use their element's own colour. The spectrum appears only on the Resonance glyph and in mythic frames.

### States

States are shown with light, not with new art:

| State | Treatment |
|---|---|
| Selected | Cyan glow |
| Pressed | Scale 0.9, brighter |
| Disabled | Desaturated and dimmed |

Rarity frames (`.pzi-frame.r-*`) put an icon in a crystal tile on the same ladder as rewards.

### Elements

Every element chip now carries its glyph as well as its colour and name, so colour is never the only cue.

---

## 2. Combat

| Part | Rule |
|---|---|
| **Fighter panel** | Faceted glass plate with a strip in the element's colour on the left. Header: element gem, name, gold level tag. Then the health bar, the numbers, and the conditions. |
| **Health bar** | Crystal tube divided into tenths. The fill is green, then amber below 50%, then red below 25%. |
| **Taking damage** | The fill drops at once (0.28 s) while a pale band holds for 0.42 s, then drains (0.55 s), so the size of the hit stays readable. |
| **Healing** | A bright mint band shows the new health first, and the fill grows into it. |
| **Bar motion** | Transform-only (`scaleX`) and composited. Instant with Reduce motion. |
| **Critical (below 25%)** | The panel rim and bar turn red, a "Critical" label appears, and a slow glow pulses behind the panel (static in Battery saver and with Reduce motion). |
| **Turn indicator** | Top centre. `TURN n` · "Your move" (cyan) / "<name> acts" (gold for yours, rose for the foe) / "Choose an Amina". While you choose, it says who acts first, using the game's own speed rule. |
| **Who is acting** | The acting fighter's panel brightens (gold rim for yours, rose for the foe). While you choose, your panel has the cyan rim. |
| **Moves** | See the move states below. |
| **Conditions** | Faceted chips with an icon, a short name and the turns left. Buffs are marked ▲ (regen, guarding) and debuffs ▼ (burn, stun, soak, silence, attack down). Guardian and Island Boss traits get gold and spectrum tags. **Tap any chip** for a plain-words explanation. |
| **Damage numbers** | Outlined crystal digits with a label pill: Super effective (gold), Resisted (silver), Heavy blow (rose), Guarded, and Regen for heals. They pop, then rise and fade (transform and opacity only). |
| **Entering a battle** | Three prismatic shards wipe across (0.6 s). Bosses get a title card ("Guardian" or "The Island Boss" and the name) during the existing opening beat, so it adds no waiting. Both are skipped with Reduce motion. |
| **Victory** | Crest, kicker (where it happened) and title, then the dungeon progress, then the rewards grouped by source, then special moments (a new island), then the party's experience. A fighter who stayed up hops twice to celebrate. |
| **Boss victories** | A guardian gets a gold crown crest and gold frame with a brief burst of rays. The Island Boss gets the spectrum frame and spectrum rays. |
| **Defeat** | Cool silver-violet with a moon crest and no celebration effects. What you keep comes first, then one useful tip, then "Try again" (gold). |

### Move states

Each move shows its element (gem and a wash of the element's colour), its name, what it does ("Pow 40",
"Heal · self", "Guard · self") and what it costs. A special move says "Special · every 3": its recharge, in words.

| State | Look |
|---|---|
| Ready | Lit rim |
| Recharging | Dimmed, with an hourglass and the turns left |
| Silenced | Greyed out |
| Waiting while a move resolves | Flat |
| Chosen | Cyan, with a light sweep when tapped |
| Suggested | Gold rim and sweep ("Blocks the charge", "Cracks barrier") |

### Layout

The player's panel takes whatever width is left between the party and the moves, so it never overlaps them. With
five Aminas it moves above the party. Tested at iPhone SE, iPhone 13/14 and Pro Max sizes, and at iPad landscape.

---

## 3. Rewards

**One vocabulary** (`UI.Rewards`):

* **Tile:** an icon in a rarity frame, then what was received and how much.
* **Group:** a heading naming the source and its tiles.
* **Card:** the pop-up (kicker, title, optional tiles, source line).

Every reward kind uses them: gold, food, gems, essence, experience, rank XP, player rank, equipment, a new Amina
and a new island.

**Where they are used:**

* The dungeon victory and boss victories.
* Equipment found (now on the result card, no longer a card covering the title).
* Task rewards (the task's name, amounts and rank XP).
* Loot Ruins, Survival waves and summary, and Practice results.

**The rarity ladder** (one table, `UI.RARITY`):

| Rarity | Frame | Glow | Motion | Burst |
|---|---|---|---|---|
| Common | plain lilac rim | none | none | none |
| Uncommon | green rim | none | none | none |
| Rare | blue/cyan rim | soft | none | 10 |
| Epic | violet-pink rim | stronger | one light sweep | 18 |
| Legendary | gold prism rim | warm | sweep, still rays | 24 |
| Mythic | full spectrum rim | spectrum | turning rays, repeating sweep, shimmering label | 30 |

Which rarity each reward kind gets:

* Gold, food, XP and rank XP are common.
* Essence is uncommon.
* Gems are rare.
* Equipment keeps its own rarity.
* A new Amina is rare; a legendary Amina is legendary.
* A new island is mythic.

**Special moments:**

* **A new Amina:** the creature is the largest thing on the card. One quiet line above the title gives its place
  in the collection. Legendary creatures get the gold frame and tag.
* **A new island:** the spectrum frame with a "New island unlocked" kicker, on the result card and on its own card
  afterwards.
* **Boss victories:** see Combat.

---

## 4. Motion budget

* **Battery saver and Reduce motion:** every decorative loop stops. That covers the critical-health pulse, the
  telegraph glow, the "choose your Amina" glow, the suggested-move sweep, the mythic rays and sweep, the
  celebration hop, the battle wipe and the rays.
* **Reduce motion only:** health changes become instant.
* **Page hidden:** battle and reward animations pause.
* **Functional motion stays** (damage numbers and the turn indicator), because it carries information.
