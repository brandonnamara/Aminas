# Aminas Dev 8 — living pixel, player profile, essences and moves

Base: Dev 7 (`dev7-forge-perf`, restored from the private dev preview after this session's workspace was reset).
Work branch: `dev8-living-pixel`. Version string `0.7.0-dev` is kept (no release). Save schema 5 → 6.
Nothing is deployed except the private dev preview. Production is untouched.

## How the repository was restored

The cloud workspace from Dev 7 was wiped between sessions, and `brandonnamara/Aminas` still only holds `index.html`.
The project was rebuilt from:

1. the v0.6 git bundle (history and the v0.6 test suites),
2. every runtime file of the private dev preview (Dev 7 code: `index.html`, `src/**`, `assets/portraits/**`),
3. the Dev 7 review diff (Dev 7's own tests and docs).

The v0.7-only test files (`tests/v07.test.js`, `tests/browser-v07.test.js`) and `tools/voxel-bake.js` were not in any of
those, so they are lost. The older suites were updated to the v0.7 roster (old species ids mapped through
`D.LEGACY`) and all pass. No game code was lost: the preview carries the complete game.

## What changed

### 1. Living-pixel visual identity
- **Reference scene** (`?scene=livingpixel`, or Settings › tap the version 7 times › Developer panel): block terrain,
  a building, a normal creature (Acinus), a glowing creature (Lumi with a pixel aura), drifting pixel motes and a
  "moment" button. It is built from the same parts as the game and shows live fps, draw calls and triangles.
- **Pixel sprites** (`src/pixel-art.js`): gold (minted coin with a stamped spark), food (honey-berry with leaf),
  gems (cut stone), nine elemental essences (crystal shards that shed pixels) and the player avatar. All are small
  pixel grids rendered as crisp SVG, cached, and used everywhere `Art.icon('gold'|'food'|'gem')` was used (HUD, costs,
  rewards, shops, Forge, collection bubbles on the island).
- **Pixel fragments on meaningful moments**: every existing sparkle moment (restoring, building, level up, hatching,
  evolution) now also sheds square pixel fragments; collecting, moving a building, move upgrades, achievements and
  avatar confirmation have their own bursts. One DOM burst is ≤ 24 squares with a stepped CSS animation, removed after
  0.9 s; fewer in Battery saver; still squares with reduced motion.
- **Stepped pixel corners** on buttons, pills, tabs and sheets (CSS clip-path, no extra elements).
- **Battle bosses shed pixels**: in 3D, every boss has a ring of rising glowing cubes (one instanced mesh); the
  Island Boss's cubes shift through the spectrum.

### 2. Names: Name, Name II, Name III
Every form keeps its line's name (`roster.js`). The line name is the base form's name, except the four lines whose only
supplied card is the final form: **Pyro-Core**, **Pyro-Phoenix**, **Meta**, **Atem** (e.g. Meta, Meta II, Meta III).
Species ids are unchanged, so saves, breeding and rewards are untouched. The old v0.7 display names are kept in
`D.V07_NAMES` for reference.

### 3. Player avatar and profile
- **First launch**: New Game → avatar creator → the story. The first-time creator cannot be dismissed without
  confirming; Confirm only applies once.
- **Options** (all drawn in code, no image files): skin (6), hair (6), hair colour (7), eyes (4), outfit (6),
  extra (6: none, leaf pin, cap, headband, goggles, crown of sparks), plus an optional name (14 characters).
  "Surprise me" randomises.
- **Returning players** load straight into the island. Saves from before Dev 8 get a default avatar and a small "!"
  on the head as a hint; they are never forced through the creator.
- **Top-left head**: the avatar sits left of the Player Rank pill, with a two-step idle bob that pauses with the
  island (Dev 7 rest/covered/hidden rules). Tapping it (or the rank pill) opens the **Profile**:
  - **Player Stats**: rank and xp, Aminas, forms owned, battles won/lost, dungeons cleared, Island Bosses, eggs
    hatched, evolutions, times fed, Survival best, equipment, move upgrades, and the nine essence balances. All read
    from the save.
  - **Achievements**: 19 achievements. There was no achievement system before, so each one is worked out from data
    the game already tracks (owned forms, stats, dungeon records, buildings, Forge, survival, move levels). Two count
    things the game only started counting in Dev 8 (essence gathered, move upgrades) and say so. Already-met
    achievements are recorded quietly the first time an older save loads.
  - **Customisation**: reopens the creator.

### 4. "Caretaker Rank" → "Player Rank"
HUD, rank-up banner, quest hints, dungeon and building requirements, the Entity's rank remark. The rank maths is
unchanged. A test scans every string literal in `src/` for leftovers.

### 5. Monster preview (bottom left)
- Smaller: 248 px wide at 844×390 (was 354 px), 3.3 rem portrait (was 4.2 rem).
- **Browsing**: portrait, name, element, level bar, previous/next. It cycles every 3 s as before.
- **Tap it to pick** that monster: the card holds still, says "Feeding *Name* · you have N food", and only then shows
  Snack and Feast, plus Details and Moves. ✕ un-picks it. Feeding only ever applies to the picked monster's uid.
  Buttons grey out when food is short; at Level 30 they are hidden and the card says no more food is needed.

### 6. Currencies
Gold, food and gems have new pixel sprites (above). Tapping the resource pill opens a **Wallet** with every balance and
how each one is earned. Values, costs and rewards are unchanged.

### 7. Building placement
- Moving a **placed** building now commits the moment it is dropped (or tapped) on a valid spot, or rotated into a
  valid position. There is no Done button any more.
- An invalid drop is refused: the saved position never changes, the ghost snaps back and the bar says why
  ("It stays where it was.").
- **Undo** puts the building back where this move started. ✕ finishes moving. The main bar's "Done" is now
  "Exit build".
- New buildings (a purchase) still confirm with **Build**; placing from storage still confirms with **Place**.

### 8. Essences and five-level moves
- **Essences**: one per element in the type system — Light, Dark, Nature, Fire, Water, Earth, Wind, Resonance, Metal —
  in `st.essence`.
- **Earning**:
  - every won dungeon battle: essence of the foe's element, 2 + ⌊level / 6⌋ (boss: 8 + ⌊level / 3⌋);
  - every won Survival wave: 1 of the foe's element (champion: 3);
  - every ruin search: 3–6 of one of that site's elements (Toll House: Earth/Nature/Light; Signal Tower:
    Wind/Metal/Dark; Bakery Cellar: Fire/Water/Resonance);
  - habitats set to make essence (below).
  Defeats give nothing; nothing else in the economy changed.
- **Moves**: every Amina has two move slots, its basic move and its signature move. Each goes from **Level 1** (the move
  exactly as before) to **Level 5**. A level belongs to the slot, so it carries over when the Amina evolves.

  | Level | Essence to reach | Damage moves (power) | Guard moves (blocks) | Heal moves (heals at once) |
  |---|---|---|---|---|
  | 1 | — | ×1.00 | 50% | 25% |
  | 2 | 10 | ×1.08 | 55% | 28% |
  | 3 | 25 | ×1.17 | 60% | 31% |
  | 4 | 50 | ×1.27 | 65% | 35% |
  | 5 | 90 | ×1.38 | 70% | 40% |

  175 essence of the move's element takes one move from 1 to 5. The essence used is the move's element (in this roster
  moves always match their Amina's element). Upgrades change the real combat numbers in `rules.js doAbility`; battle
  buttons show the level and the upgraded power. A guard still blocks three quarters of a guardian's charged move.
- **Safety**: each request carries the level it was made from, so a double tap or a stale panel can never pay twice
  or skip a level. Moves are locked while that Amina is in a dungeon or Survival run.
- **Where**: the monster preview (Moves), the Creatures detail (new Moves tab; the Battle tab shows levels too). All
  screens read the same data and redraw together.

### 9. Habitat production choice
- Each elemental habitat can make **Gold** or **its element's essence** (Grove → Nature, Tidepool → Water,
  Burrow → Earth, Ember → Fire, Sunbeam → Light, Moonlit → Dark, Aerie → Wind). There are no Metal or Resonance
  habitats in the game, so those essences come from battles and ruins.
- Essence is made at 10% of the habitat's gold rate, with the same storage time; residents, affinity and upgrades
  work as before.
- **Switching** collects whatever is stored first, in the resource it was made as, then starts the new resource from
  that moment. If anything is stored the game asks first. Nothing is converted, duplicated or deleted (a part-unit
  below 1 that has not finished being made is not carried over).
- The choice is saved per building; older saves keep making gold.

### 10. Dungeon battle environments
- **3D arenas** (`src/3d/arenas.js`): every one of the ten dungeons now has its own arena (before, seven of them
  reused the Reliquary's): the Forgotten Road (grass over flagstones, foundations, signpost), the Gathering Hall
  (plank floor, long tables, lanterns), the Overgrown Reliquary, the Drowned Steps (wet steps into the sea, coral,
  kelp), the Cold Kiln (brick floor and kiln walls, ash, pots), the Hollow Veil, the Lantern Orchard (rows of
  lantern-trees), the Windworn Stair (cliff steps, pennants, drifting rocks), the Resonance Scar and the Heartwood
  (root floor with glowing veins).
- **Boss rooms** (battle 10) add set dressing that belongs to that place: a gate of standing stones with glowing runes,
  the last lamp in the hall with candelabras and the noticeboard, a relic altar with a chest and spilled gold, a
  drowned arch with a pearl clam and coins, the kiln mouth burning again with molten channels and pottery, a lectern of
  unsaid things between stacks of books, the oldest lantern tree, the Weathervane's tower, a crown of orbiting sky
  crystals, and for the Island Boss a heart of roots glowing in shifting prismatic light.
- **2D backdrops** (`src/dungeon-art.js`): the five dungeons that shared one generic sky (Reliquary, Drowned Steps,
  Cold Kiln, Lantern Orchard, Windworn Stair) have their own, each with a boss-room version. These are what players see
  with 3D off, and the sky behind the 3D arenas.
- Cost: static blocks merge into one mesh per material, floors are one instanced mesh, motes one Points object.
  No shadows, no post-processing. Boss mechanics and dungeon progression are unchanged.

## Save compatibility (schema 5 → 6)

Migration 5 adds: `avatar` (default look, `made: false`, `legacy: true`), `essence: {}`, `ach: {}`,
`aminas[].mv = [1, 1]`, and `prod: 'gold'` on habitats. Sanitising on every load repairs odd data (avatar indices
clamped, name stripped of `<>` and cut to 14 characters, essence balances made whole numbers ≥ 0 and unknown types
dropped, move levels clamped to 1–5). The save key is unchanged and the previous save is still copied to its backup
slot. Tests cover a schema-5 save, a reload of the migrated save (idempotent), and damaged fields.

## Performance

Same probe (`tests/perf.js`, Chromium with a software GPU on this cloud machine, not a phone), run on Dev 7 and on
Dev 8 back to back. Dev 7 → Dev 8:

| Scenario | Main thread ms/s | Script ms/s | Paints/s | Raster tasks/s | 3D draw calls | 3D triangles |
|---|---|---|---|---|---|---|
| title screen (idle) | 5.5 → 5.2 | 0 → 0 | 0 → 0 | 0 → 0 | – → – | – → – |
| island idle (no input) | 63.5 → 61.3 | 1.4 → 0.8 | 43.2 → 36.8 | 12.9 → 9.2 | – → – | – → – |
| creature page with live 3D viewer, idle | 297.8 → 293.2 | 12 → 13.2 | 0 → 0 | 0 → 0 | 4 → 4 | 2392 → 2392 |
| 3D battle, waiting for input | 1004 → 1011.4 | 20.8 → 16.3 | 57.3 → 34.8 | 0 → 0.4 | 13 → 12 | 7268 → 7864 |
| 3D battle in a small window, idle (frame budget visible) | 392.5 → 619.4 | 13.6 → 17.3 | 120.5 → 120.7 | 0.3 → 0 | 13 → 12 | 7268 → 7864 |
| 3D battle in a small window, during an attack | 435.1 → 688.2 | 34.9 → 39.1 | 118.7 → 117.3 | 0 → 0 | 13 → 12 | 7268 → 7864 |
| game hidden during a battle (simulated visibilitychange) | 0.2 → 0.3 | 0 → 0 | 0 → 0 | 0 → 0 | 13 → 12 | 7268 → 7864 |
| battle after returning (and 5 more hide/show cycles) | 994.3 → 1013.8 | 16.7 → 13.8 | 72.4 → 39.2 | 0 → 0 | 13 → 12 | 7268 → 7864 |
| Island Boss battle (Heartwood 10/10), waiting for input | 1000.8 → 1009.9 | 22.9 → 23.5 | 77.3 → 52.9 | 51.5 → 35.5 | 18 → 21 | 8254 → 9558 |
| island after 9 battles (idle) | 53.7 → 52.4 | 0.5 → 0.6 | 59 → 40.2 | 17.8 → 17.3 | 13 → 12 | 7268 → 7864 |

Heap growth after 9 battles: 0.8 MB (Dev 7) → 0.7 MB (Dev 8). Live intervals on the island: 4 → 4.

What this shows:
- The island does slightly less work than in Dev 7 (fewer paints and raster tasks; the new HUD sprites and the
  avatar's two-step bob are cheap and pause with the island).
- 3D battles: JavaScript time per second is unchanged (13–23 ms/s), draw calls went down (13 → 12) because every
  plain block in an arena is merged into one vertex-coloured mesh; triangles are up 8% (16% in the Island Boss room).
- In the small-window test the main-thread total rose (392 → 619 ms/s) while script time stayed flat. On this machine
  the "GPU" is a CPU rasteriser, so this most likely reflects drawing a fuller scene in software, not phone GPU cost.
  It must be checked on the iPhone. If it is a problem there, Battery saver already lowers the 3D pixel ratio to 1.
- Hidden: no work. No timers pile up, no memory growth across nine battles.
- Overheating itself can only be judged on the real phone.

## Tests

`node tests/run-all.js` runs every suite. All 350 checks pass:

| Suite | Checks |
|---|---|
| baseline | 5 |
| campaign | 60 |
| migration v0.6 | 22 |
| modes | 41 |
| forge (Dev 7) | 53 |
| **dev8** (rules: names, Player Rank text, essences, move levels in real combat, habitat switching, essence rewards, achievements, schema 6 migration, repair of odd data) | **49** |
| browser v0.6 | 48 |
| browser dev7 | 30 |
| **browser dev8** (creator for new players only, profile tabs, Player Rank, pixel currencies, preview size and pick-to-feed, moves from two screens with a double tap, live placement, invalid drop, reload, Undo, habitat switch, wallet, distinct backdrops, burst cleanup, 667×375 and 932×430) | **42** |

A double-tap bug found by the browser test (the moves panel redraws, so a fast second tap landed on the new button
and bought a second level) was fixed: taps on the same move are ignored for 0.7 s after an upgrade.

## Known limits and not done

- Real iPhone and Safari: not tested here. Browser tests use Chromium at 844×390, 667×375 and 932×430.
- The island's own terrain and buildings were already voxel-style SVG (v0.5); Dev 8 adds the pixel sprites, pixel
  fragments, stepped UI shapes and battle scenery, but did not redraw every island building or tile.
- The avatar is a pixel head-and-shoulders bust; it does not walk on the island.
- Achievements have no rewards (none were specified).
- `sw.js` is not part of this repository (it lives with the production build), so the dev build logs a 404 when it
  tries to register the service worker. This is pre-existing and harmless.
