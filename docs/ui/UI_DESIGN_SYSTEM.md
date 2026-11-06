# Aminas — Prismatic Fantasy UI design system

*Phase 5.* The interface is a luminous, prismatic magical object that sits above handcrafted voxel worlds. This
document is the standard for every future screen, island, building, monster and feature.

| What | Where |
|---|---|
| Code | `src/ui-prism.css` (styles), `src/ui-prism.js` (reward cards, legendary reveals, navigation state) |
| Live reference | `tools/ui-gallery.html`: every component in every state, using the game's real stylesheets |
| Screenshot | `docs/ui/gallery.png` |

## 1. Principles

1. **Dark amethyst glass, light on the edges.** Surfaces are deep violet glass. The light lives in the rims, in the
   facet glints and in a few chosen highlights. Never flood a whole surface with the spectrum.
2. **Each colour means one thing:**

   | Colour | Meaning |
   |---|---|
   | **Gold** | the main action (and resources measured in gold) |
   | **Cyan** | selection: the selected tab, choice or toggle |
   | **The full spectrum** | rare, magical or legendary things |
   | **Green / amber / red** | health, ready and warning, as they always were |
   | Element hues | each creature element (unchanged) |

3. **Faceted crystal.** Every framed element has cut corners, never round pills or square boxes. The exceptions are
   circular controls (round buttons, toggles, badges) and elements that carry badges (navigation tiles, generic
   panels): they keep soft rounding, because a clip would cut the badge off.
4. **The creature is the hero.** Panels frame a monster from the edges. A soft prism halo and pedestal sit under it.
   Nothing bright sits on top of it.
5. **Calm by default.** Motion appears only on what is selected, ready or rare. It stops when the island rests, a
   panel covers it, the app is in the background, Battery saver is on, or the player asks for Reduce motion.
6. **Readable first.** Body text and labels meet WCAG AA (4.5:1). Tap targets stay comfortable on an iPhone SE in
   landscape.

## 2. Tokens (`:root` in `ui-prism.css`)

| Token | Value | Use |
|---|---|---|
| `--pz-ink` / `--pz-deep` | `#0f0b28` / `#1a1440` | backgrounds, wells |
| `--pz-sheet` | violet glass gradient | panels and sheets |
| `--pz-opal` | pink and cyan radial sheens | opalescence on panels and pills |
| `--pz-base` | opaque `#271e58 → #1c1545` | goes under any translucent fill that has a rim, so the rim never bleeds into the face |
| `--pz-rim` / `--pz-rim-soft` | pink → violet → blue → cyan → gold, strong and soft | the edge of every framed element |
| `--pz-rim-gold` | white-gold → pink → ice | the edge of primary, selected and equipped things |
| `--pz-spectrum` | the full ribbon | rare and legendary only |
| `--pz-btn` / `--pz-btn-gold` | amethyst / sun-crystal | secondary and primary button faces |
| `--pz-pink` `--pz-violet` `--pz-blue` `--pz-cyan` `--pz-gold` | the five spectral notes | accents |
| `--cut` | 5 / 6 / 7 / 10 / 12 px | facet size: small controls / buttons / pills and wells / cards and panels / sheets |
| `--pz-fast` / `--pz-med` | 0.09 s / 0.22 s | press feedback / state changes |
| `--r-common` … `--r-mythic` | `#cdc7e2` `#8fe39a` `#7fc6ff` `#cf9bff` `#ffd978` | the rarity ladder |

**Typography** is unchanged: the rounded system font, weight 800–900 for labels and 700 for body. Labels and section
titles use 0.12–0.2 em letter-spacing in capitals. Numbers use tabular figures. Panel titles use a warm white-to-gold
gradient. Body text is never gradient.

## 3. Components

| Component | Classes | Rules |
|---|---|---|
| Panel / sheet | `.panel`, `.sheet.panel` | glass with an opal sheen and a spectral rim. Sheets get facet glints, a translucent blur over the island (off in Battery saver) and spectral hairlines under the header and above the footer. They open with a 0.26 s rise. |
| Primary button | `.btn.gold` | sun-crystal face with a gold-white rim. **One per panel**: the action that moves the player forward. |
| Secondary button | `.btn` | amethyst crystal with a spectral rim |
| Ghost button | `.btn.ghost` | glass. Use it for leaving, cancelling and the less likely choice. |
| Button states | `:hover` / `.is-hover`, `:active` / `.is-pressed`, `.pulse`, `[disabled]` / `.off` | hover lifts brightness 8 %; press sinks 1 px and scales to 97 % in 0.05 s; ready (`.pulse`) shows a sweep of light every 3.6 s instead of the old pulsing glow; disabled is flat and desaturated at 62 % opacity, still readable |
| Round controls | `.round`, `.x` | glass circles with a rim |
| Toggles | `.sw` | on = a blue-to-cyan crystal with a glow |
| Choices | `.seg`, `.fchip` | the selected one is cyan crystal |
| Tabs | `.dtab`, `.ftab` | unselected = glass with muted text; selected = cyan crystal with a gold rim and one sweep when chosen |
| HUD pills | `.pill`, `.rank`, `.res`, `.mission-pill` | blurred glass. Resources use tabular numbers with spectral dividers. A ready task gets a green-to-cyan rim and a sweep. |
| Navigation | `.nbtn` (`.on`, `.locked`) | glass tiles. The tile of the open screen stays lit (`.on`, set by `ui-prism.js`). The Battle triangle keeps its shape. |
| Badges | `.badge` | a rose gem. It no longer pulses (that animated a box-shadow every frame). |
| Element chips | `.chip.<element>` | the element hue with a gem highlight and a keyline. The hues never change. |
| Progress | `.bar`, `.bar.xp`, `.bar.hp.mid/.low` | a crystal tube with a glass highlight on the fill. XP runs gold → peach → pink. Health stays green, amber, red. HUD, rank, timer and hatchery bars carry a slow glint. |
| Stats and wells | `.stat`, `.timer-box`, `.toggle`, `.mv`, `.pst` | inset dark wells with a faint violet keyline |
| Cards | `.card` (`.sel`, `.unknown`, `.legendary`) | glass cards with a soft halo behind the creature. Selected = gold rim. Owned legendary = spectrum rim. |
| Building panels | `.bp`, `.bp-art`, `.rchip`, `.prodopt`, `.hslot` | the building stands in a faceted well with a sky glow. Resident chips, production choices and hatchery slots follow the card rules. |
| Toasts | `.toast`, `.ach-toast` | glass, with a gold rim for achievements. They spring in over 0.3–0.45 s. |

## 4. Rarity ladder

One ladder for equipment, creatures and rewards. Intensity rises with rarity; ordinary things stay calm.

| Rarity | Rim | Glow | Motion | Reward card | Burst |
|---|---|---|---|---|---|
| Common | soft neutral | none | none | "New equipment", 3.6 s | none |
| Uncommon | green | none | none | "Uncommon find" | none |
| Rare | blue to ice | soft | none | "Rare find", 4.2 s | 10 sparks |
| Epic | pink, violet, indigo | stronger | a sweep of light | "Epic find", 4.8 s | 18 sparks |
| Mythic / unique / legendary | the full spectrum | strongest | sweep and turning rays | "Legendary find", 6.2 s | 30 sparks |

- **Creatures:**
  - a legendary creature's reveal card gets the spectrum rim, a Legendary tag, spectral rays and a second burst;
  - owned legendaries carry the spectrum rim in the collection.
- **Level-ups and rank-ups:** spectral lettering over a short burst of rays. They are not heavier than before.
- **Evolution:** the flash runs white → pink → cyan, then rays turn behind the new form.

## 5. Motion budget

| Motion | Where | Cost |
|---|---|---|
| Sweep of light | ready buttons, a newly selected tab (once), a ready task, epic and higher rewards | transform of one small layer |
| Bar glint | HUD, rank, timer and hatchery bars | background position of a small element |
| Rays | reveal and evolution cards, legendary rewards | rotation of one masked layer |
| Entrances | panels, toasts, reward cards | one short transform and opacity |

- The old infinite `btnpulse` animation (scale plus box-shadow, a repaint every frame) is gone from buttons, badges and
  the task pill.
- Everything above pauses with `perf-rest`, `perf-covered` and `perf-hidden`.
- It stops under Battery saver (`perf-saver`), Reduce motion (`calm`) and `prefers-reduced-motion`.
- Battery saver also drops the panel blur.

## 6. Building new UI

1. Use the existing classes. A new screen is a `.sheet.panel` with `.sh-head`, `.sh-body` and `.sh-foot`.
2. Give each panel one `.btn.gold` for its forward action. Everything else is `.btn` or `.btn.ghost`.
3. Selection is cyan (`.on`). Rare and legendary is the spectrum. Never use the spectrum to decorate ordinary
   content.
4. Any new framed element joins the facet list at the top of `ui-prism.css`, unless it carries a badge.
5. Any translucent face on a rim needs `var(--pz-base) padding-box` under it.
6. Any new animation must use transform or opacity on a small element, must be listed in the motion-budget block, and
   must stop under `perf-saver` and `calm`.
7. For a new island or building, put the building or creature in a well (`.bp-art` or the halo pattern). Its own
   colours carry its identity; the frame stays the system's.
8. Add the component to `tools/ui-gallery.html`.

## 7. What the system does not change

- Layout, content, flows, the battle HUD's structure, icons and pixel portraits are unchanged. This phase is a visual
  layer over the existing interface.
- The element colours and the green / amber / red health and status colours keep their meaning.
