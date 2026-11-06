# Phase 5: Prismatic Fantasy UI

- **Branch:** `ui5-prismatic`, started from the head of `env4-visual` (`9051d10`). Phase 4's work is kept. `main`
  and production are not touched.
- **What it is:** one design system, applied to the shared components every screen already uses. It is not a set of
  separately redesigned screens.
- **Not changed:**
  - layout, flows, content, gameplay and saves (no new save fields);
  - the environment and the battle scenes.
- **Device testing:** **none yet for Phase 5.** All measurements are from Chromium on a desktop, emulating an iPhone
  (844 × 390 @3×, plus 667 × 375 for the iPhone SE).

## 1. What was implemented

| Area | Change |
|---|---|
| Design system | `src/ui-prism.css`. Tokens: amethyst glass, opal sheens, spectral rims, the gold / cyan / spectrum roles, facet sizes, motion durations, the rarity ladder. It loads after `style.css` and restyles the existing classes. |
| Shape language | crystal facets (cut corners with hairline glints along each diagonal) replace Dev 8's stepped pixel corners on buttons, pills, sheets, cards, tabs, wells, item rows, slots and toasts. Badge carriers keep soft rounding so badges are not cut. |
| Panels | glass sheets with an opal sheen, a spectral rim, a translucent blur over the island (off in Battery saver), spectral header and footer hairlines, a warm gradient title, and a 0.26 s rise on opening |
| Buttons | primary sun-crystal gold, secondary amethyst, ghost glass. Hover, pressed (sinks 1 px, 97 %, 0.05 s), ready and disabled states. Ready buttons show a sweep of light instead of the old pulsing glow. Focus ring in cyan. |
| Controls | crystal toggles (blue-cyan when on), cyan segmented choices and filter chips, tabs where the selected one is cyan crystal with a gold rim |
| HUD | glass pills with blur; resources in tabular numbers with spectral dividers; a crystal avatar frame; the rank bar with a moving glint; the task card with a green rim and sweep when ready; glass navigation tiles where the open screen's tile stays lit; rose-gem badges |
| Monsters | the creature stands on a prism halo and pedestal in details, reveals and evolution; crystal stat wells; element chips as gems; XP as a gold-to-pink crystal tube; collection cards in glass (selected = gold rim, owned legendary = spectrum rim); the companion panel |
| Buildings | Hatchery, Forge, Moon Shrine, habitats, the Hollow and every other building panel: the building in a faceted sky well, resident chips, production choices, hatchery slots (free, selected, ready), timers with a moving glint, costs in tabular numbers |
| Rarity | one ladder (common → uncommon → rare → epic → mythic / legendary) for item rows, item icons, tier labels, unique chips, cards and rewards |
| Rewards | **new reward card** for equipment discoveries, which replaced the plain toast. Intensity follows rarity: calm for common, a burst for rare, a sweep for epic, a spectrum rim with turning rays and the full burst for mythic. **Legendary creature reveals** get the spectrum card, a Legendary tag, rays and a second burst. Level-up and rank-up banners use spectral lettering over a short ray burst. Evolution flashes white → pink → cyan with rays behind the new form. Achievements get gold-rimmed toasts. |
| Behaviour | `src/ui-prism.js`: `UI.itemFound` (reward card), the legendary reveal, and the navigation's lit state. Plus a one-word change in `ui.js` (owned legendaries get a `legendary` card class) and in `ui-v07.js` (the discovery toast now calls `UI.itemFound`). |
| Documentation | `docs/ui/UI_DESIGN_SYSTEM.md` (the standard for future islands, buildings, monsters and features) and `tools/ui-gallery.html` (every component in every state, live) |

## 2. Before and after

The left half of each image is before and the right half is after. All are in `docs/ui/screens/`.

| Group | Screens |
|---|---|
| Main screens | `hud`, `hud-picked` (feeding controls), `settings`, `missions`, `battlehub`, `profile`, `bag` |
| Monsters | `collection`, `detail`, `reveal`, `reveal-legendary`, `evolve`, `levelup` |
| Buildings | `hatchery`, `forge`, `moonshrine`, `habitat`, `hollow` |
| Rewards | `item-rare`, `item-mythic`, `achievement`, `toast` |
| Battle | `battle` (the battle HUD is unchanged by design apart from shared chips and bars) |
| Overview | `all-before.png` and `all-after.png` |
| Small screen | `iphone-se-*.png` (667 × 375) |
| Component gallery | `docs/ui/gallery.png` |

## 3. Performance

`p5/perf.js` (saved as `perf/ui5-*.json`) loads the island in each quality setting and measures:

- main-thread time per second over 5 s at idle and with a panel open;
- style recalculations;
- running animations;
- the time to open Settings and the Collection.

The same machine, browser and settings were used for before and after.

| Setting | Idle main thread (ms/s) | Running animations at idle | With a panel open (ms/s) | Animations with a panel open | Open Settings (ms) |
|---|---|---|---|---|---|
| High | 124 → 136 | 34 → 36 | 1.5 → 1.5 | 0 → 0 | 45 → 42 |
| Balanced | 123 → 131 | 34 → 36 | 1.4 → 3.0 | 0 → 0 | 36 → 73 |
| Battery saver | 99 → 100 | 26 → 26 | 3.0 → 3.0 | 0 → 0 | 20 → 33 |
| Balanced + Reduce motion | 3.1 → 2.6 | 0 → 0 | 2.9 → 2.4 | 0 → 0 | 20 → 23 |

How to read it:

- **Idle cost is dominated by the island's own ambient animation** (clouds, sea, butterflies), as before. The UI adds
  two animations (the rank and companion bar glints). Both are transform-only and pause when the island rests or is
  covered.
- **Panel-open cost is unchanged.** A first version used an animated background position for the bar glint. It kept
  restyling at 76–83 ms/s behind open panels; the measurement caught it and it was rewritten as a composited
  transform.
- **Opening times** vary between runs by more than the difference shown. Software rendering of the new blur and
  gradients may add a few ms; the device test will show the real figure.
- **Battery saver** runs no decorative UI motion and drops the panel blur. **Reduce motion** runs no animation at all,
  island included.
- **Removed:** the old infinite `btnpulse` (a scale plus a box-shadow repaint every frame) on ready buttons, badges and
  the task pill.

## 4. Quality settings

| Setting | UI behaviour |
|---|---|
| High / Balanced | full system: blur on panels and pills, sweeps on ready and selected items, bar glints, rays on rare rewards and reveals |
| Battery saver | the same look without blur and without decorative motion. Entrances stay; they are short. |
| Reduce motion (Settings or the device setting) | no decorative motion and no entrance animation |

## 5. Usability

- **Contrast:** every text/surface pair of the system meets WCAG AA 4.5:1. The test computes it:

  | Pair | Contrast |
  |---|---|
  | Primary button | 7.6 |
  | Secondary button | 4.9 (its face was darkened to get there) |
  | Panel text | 11.0 |
  | Muted text | 7.1 |
  | Unselected tab | 8.1 |
  | Selected tab | 12.7 |
  | Navigation label | 6.2 |
  | Gold label | 8.4 |
  | Toggle choice | 8.7 |

- **Tap targets:** measured as real hit areas on an iPhone SE in landscape, the HUD and Settings come to at least
  32 px. Toggles and the small selector arrows gained an invisible larger hit area.
- **Fit:** panels stay inside the iPhone SE screen (tested). Layouts are unchanged at every size.

## 6. Tests

`node tests/run-all.js`: **432 passed, 0 failed** across 15 suites. That is the 420 from Phase 4 plus the new
`browser-ui5.test.js` (12 checks):

- contrast;
- the system applied to the HUD;
- tap targets on the iPhone SE;
- panels fit on the iPhone SE;
- the navigation's lit state;
- common and mythic reward cards, and their exit;
- the dungeon drop path;
- the legendary reveal;
- motion stopping in Battery saver and with Reduce motion;
- no script errors.

All earlier suites pass unchanged.

## 7. Limitations

- **No iPhone measurement of Phase 5 yet.** Please look at the panels, the reward cards and the HUD on the phone, and
  run the performance test again.
  - The thing to watch is the panel blur: it is the most GPU-heavy effect added.
  - If it costs too much, the first step is turning it off outside High. It is one rule.
- **Icons are unchanged.** The HUD and navigation keep their existing pixel icons; the system frames them. A matching
  prismatic icon set would be a separate art task.
- **The battle HUD** keeps its structure. It picks up the shared chips, bars and buttons, but was not redesigned.
- **Reward cards cover equipment discoveries.** Gold and food rewards keep their existing displays (victory screen,
  floating numbers) with the new styling.
- **Rare creature hatches** use the legendary reveal only for the two legendary lines; ordinary hatches keep the
  standard reveal.
- **Dev tools and the developer panel** pick up the system but were not reviewed screen by screen.

Phase 6 is not started; this phase stops here for review.
