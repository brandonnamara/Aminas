# Aminas Dev 7 — mobile performance and the Forge

Base: v0.7.0-dev (branch `v0.7-voxel-art`). Work branch: `dev7-forge-perf`. Version string `0.7.0-dev` is kept
(no release). Save schema 4 → 5. Nothing deployed except the private dev preview.

The GitHub repository `brandonnamara/Aminas` still contains only `index.html`, so the v0.7 build was the
authoritative source for this work (its git history is in the bundle inside the ZIP).

## 1. What was making the phone work hard

Measured in Chromium with the Chrome DevTools Protocol (`tests/perf.js`), same scenarios before and after. The
largest causes, in order:

1. **The island is one big SVG, and every animated thing inside it repainted the whole picture every frame.**
   Clouds, butterflies, star twinkles, glows, the "restore me" ring on ruins, walking creatures and the HUD badges
   all animated smoothly at the display refresh rate. On the idle island that was ~180 full repaints and ~170
   raster tasks per second, with nobody touching the screen. After battles it reached ~300/s (the ruin ring and
   the badge pulses added full-frame work).
2. **3D views rendered at the full refresh rate even when nothing moved** (the creature page viewer and a battle
   waiting for input), at up to 2× pixel density on phones.
3. **Nothing stopped when the game was in the background** except the 3D loop: CSS animations, the music
   sequencer timer and the audio hardware kept running.
4. Smaller: the bottom-left selector checked 4 times a second; walkers glided every frame.

Not found: no memory leak (heap after 9 battles +0.3 MB, 3D geometries return to the same count), no growing
timer count across screen changes, no extra network requests after load.

## 2. What changed

- **Ambient beat (CSS, `src/style.css`):** island decoration now changes in small steps on shared 0.5 s
  boundaries (a pixel-art cadence), so the island repaints a few times a second instead of 60. The ruin ring, the
  live-run Battle button and the HUD badges pulse the same way. Walking creatures hop 4 times a second on a
  shared 250 ms beat (`src/island-life.js`). Fewer ambient sprites (butterflies 9 → 5, lanterns 6 → 4).
- **Rest and cover (`src/perf.js`):** after 45 s without input, or whenever a panel covers the island, its ambient
  decoration pauses (walking creatures finish their step); any touch resumes it. The selector stops cycling too.
- **3D frame budget (`src/3d/runtime.js`):** 30 fps while a view is idle, 60 fps for a moment after an action
  (attack, hit, swap, drag), 30 fps in Battery saver. Skipped frames do no update and no draw. Phones (coarse
  pointer) render at most 1.5× pixel density (was 2×); adaptive resolution still drops to 1× if frames are slow.
  `powerPreference` changed from `high-performance` to `default`.
- **Lifecycle:** when the page is hidden (home button, app switcher, lock, another tab) the 3D loop stops,
  every island/HUD animation pauses, the music timer stops and the audio context is suspended, and the island's
  1 s tick skips its work. On return everything resumes once (repeated hide/show events are ignored), and the
  clock-based systems (production, eggs, timers) catch up from the real time.
- **Battery saver (Settings):** 30 fps 3D at 1× resolution, no butterflies/fireflies/lanterns, clouds that move in fewer, larger steps, and
  half as much creature wandering. It switches itself on for the session if the 3D view stays slow even at 1×
  (based on frame timing; JavaScript cannot read a phone's temperature).

## 3. Measurements (Chromium, software GPU, desktop CPU — not a phone)
These numbers compare the same scenarios on the same machine before and after; they are not phone figures. The
software GPU makes 3D far slower than any phone, so the 3D rows are mainly about frames requested and drawn.

| Scenario | Main-thread work (ms/s) | Paints/s | Raster tasks/s | 3D frames drawn/s | Running animations |
|---|---|---|---|---|---|
| title screen (idle) | 3.9 → 3.8 | 0 → 0 | 0 → 0 | – → – | 41 → 41 |
| island idle (no input) | 180.2 → 50.7 | 180 → 41.4 | 169.8 → 14.5 | – → – | 44 → 36 |
| creature page with live 3D viewer, idle | 627.1 → 225.4 | 180.4 → 0 | 183.6 → 0 | 60 → 30 | 46 → 0 |
| 3D battle, waiting for input | 1006.8 → 1009 | 67.3 → 51.4 | 0 → 0 | 35.8 → 27.1 | 6 → 6 |
| 3D battle in a small window, idle (frame budget visible) | 910.1 → 615.8 | 116.7 → 121 | 0 → 0 | 55.1 → 30 | 6 → 6 |
| 3D battle in a small window, during an attack | 1008.7 → 1017.5 | 113.3 → 90.7 | 0 → 0 | 54.1 → 42.3 | 6 → 6 |
| game hidden during a battle (simulated visibilitychange) | 0.6 → 0.2 | 0 → 0 | 0 → 0 | 0 → 0 (loop stopped in both) | 6 → 0 |
| battle after returning (and 5 more hide/show cycles) | 1011.2 → 1014.2 | 54.6 → 47.2 | 0 → 0 | 36.4 → 26.1 | 6 → 6 |
| island after 9 battles (idle) | 117.8 → 89.1 | 300.5 → 130.7 | 274 → 21.7 | – → – | 49 → 41 |

The full-size 3D battle rows are limited by this machine's software GPU (main thread saturated before and after), so the frame budget shows in the small-window rows: 55 → 30 frames a second while idle, rising during an attack. "Paints" include cheap HUD layers; raster tasks are the expensive part on a phone.

Other checks: heap growth after 9 battles 0 MB → 0.1 MB; 3D geometries after leaving battles 7 → 7; live timers on the island 4 → 4; while hidden, frames requested per second 0 → 0 and audio suspended (or never started).

What still needs a real phone: temperature and battery drain over a long session, real GPU cost of the 3D battle,
iOS Safari's handling of backgrounding (the code listens to `visibilitychange`, `pagehide` and `pageshow`), and
how the stepped animations feel on a 120 Hz screen. Nothing here proves the overheating is fixed on a device.

## 4. The Forge

A story-style building: the **Old Forge** ruin sits north of the plaza on the starter island (3×3, at grid 16,9,
on free land, not on a path). It is restored after the Hatchery (300 gold) and upgraded through the normal building
panel (Lv 2: 1,500 gold, Lv 3: 4,500 gold). If an older save already has a building on that spot, the player's
building stays and the Forge ruin goes to the nearest free spot. The building panel shows **Open Forge**. The sprite
is a static voxel smithy (brick walls, slate roof, chimney with a glowing top, furnace mouth, anvil, quench barrel,
weapon rack; Lv 2 adds bellows and a second rack, Lv 3 a gold chimney crown). It has no animation.

The Forge window has four tabs, in this order, all on the one inventory from v0.7 (`st.items`, `aminas[].gear`):

1. **Crafting**: recipes with icon, tier, bonuses, cost (shortfalls in red), the Forge level they need, and a
   reason when unavailable. Craft → confirmation → the cost is taken once and the item goes to the bag.
2. **Equipment**: pick an Amina; see base and effective HP/ATK/DEF/SPD and its three slots; every owned item with
   "Equipped", "On <Amina>" or "In the bag". Equip, move or remove. Slot rules, one wearer per item, and the lock
   during a dungeon run are the existing v0.7 rules.
3. **Equipment Merge**: choose item 1 and item 2 (incompatible choices are greyed with the reason), see the result,
   its tier and bonuses and the gold cost, then confirm. Both inputs are used up; one stronger item is granted.
   If an input is equipped, the window says so and the result goes back onto that Amina (with two wearers, onto the
   first; the other slot is emptied).
4. **Equipment Shop**: items for gold with price, tier and bonuses, your gold before and after; disabled with a
   reason when you cannot afford it.

Safety: every action is fully checked before anything changes; each confirmation carries an operation id and a
repeated id is refused (double taps, repeated clicks); a merge keeps a snapshot and restores it if anything fails
part-way; the last 30 ids are saved. Bonuses are applied once, when a battle fighter is created (dungeons,
survival, PvP practice, raids and defence all use the same `R.partyFighter`), never again during a battle, and stay
through evolution.

### Tiers
Tier I Common, II Uncommon, III Rare, IV Epic. Unique items (Stormglass Blade, Coral Aegis, Watcher's Lens) cannot
be crafted, bought or merged. No item adds more than +30% in total.

| Line (slot) | Tier I | Tier II | Tier III | Tier IV |
|---|---|---|---|---|
| Club (Weapon) | Driftwood Club +6% ATK | Ironbound Club +9% ATK | Stonebreaker +12% ATK | Titan Maul +15% ATK |
| Fang (Weapon) | Cinder Fang +7% ATK | Ember Fang +10% ATK | Blaze Fang +13% ATK | Inferno Fang +16% ATK |
| Spear (Weapon) | Reed Spear +5% ATK +2% SPD | Tidecaller Spear +9% ATK +4% SPD | Surge Spear +12% ATK +5% SPD | Tempest Lance +15% ATK +6% SPD |
| Axe (Weapon) | — | Bark Axe +10% ATK | Rootsplitter +14% ATK | Worldsplitter +17% ATK |
| Vest (Armour) | Bark Vest +8% DEF | Ironbark Vest +11% DEF | Heartwood Mail +14% DEF | Elder Guard +17% DEF |
| Shell (Armour) | Shellplate +10% DEF +5% HP | Reef Plate +13% DEF +7% HP | Tide Plate +16% DEF +9% HP | Abyss Plate +19% DEF +11% HP |
| Mantle (Armour) | Leaf Wrap +6% HP | Vine Wrap +9% HP | Moss Mantle +12% HP | Bloom Cloak +15% HP |
| Obsidian (Armour) | — | Basalt Mail +12% DEF | Obsidian Mail +16% DEF | Night Mail +19% DEF |
| Sun (Charm) | Sun Charm +6% SPD | Dawn Charm +8% SPD | Noon Charm +10% SPD | Solstice Charm +12% SPD |
| Moon (Charm) | Moon Bead +6% HP +4% DEF | Moonstone +8% HP +5% DEF | Moon Pearl +10% HP +6% DEF | Eclipse Orb +12% HP +7% DEF |
| Echo (Charm) | — | Echo Shell +5% ATK +5% SPD | Chorus Shell +7% ATK +7% SPD | Choir Shell +8% ATK +8% SPD |
| Feather (Charm) | — | Feather Token +10% SPD | Gale Plume +13% SPD | Sky Crest +16% SPD |

Every v0.7 item keeps its id and exact bonuses.

### Merge rules
Two items of the same line and the same tier → that line's next tier. Cost and Forge level: Tier II 60 gold (Lv 1),
Tier III 180 gold (Lv 2), Tier IV 450 gold (Lv 3). Refused, with the reason shown and nothing consumed: different
slot, different line, different tier, a unique item, the top tier, the same item twice, an item you don't own, an
item worn in an ongoing dungeon run, too little gold, Forge level too low.

### Recipes (existing resources only: gold, food, gems)
| Item | Slot | Tier | Bonus | Cost | Forge Lv |
|---|---|---|---|---|---|
| Driftwood Club | Weapon | I | +6% ATK | 120 gold | 1 |
| Cinder Fang | Weapon | I | +7% ATK | 150 gold + 1 gem | 1 |
| Reed Spear | Weapon | I | +5% ATK, +2% SPD | 140 gold + 10 food | 1 |
| Bark Vest | Armour | I | +8% DEF | 120 gold + 15 food | 1 |
| Leaf Wrap | Armour | I | +6% HP | 100 gold + 25 food | 1 |
| Sun Charm | Charm | I | +6% SPD | 110 gold + 1 gem | 1 |
| Moon Bead | Charm | I | +6% HP, +4% DEF | 130 gold + 1 gem | 1 |
| Shellplate | Armour | I | +10% DEF, +5% HP | 220 gold + 20 food + 2 gems | 2 |
| Bark Axe | Weapon | II | +10% ATK | 380 gold + 3 gems | 2 |
| Basalt Mail | Armour | II | +12% DEF | 520 gold + 4 gems | 3 |
| Echo Shell | Charm | II | +5% ATK, +5% SPD | 450 gold + 5 gems | 3 |
| Feather Token | Charm | II | +10% SPD | 450 gold + 30 food + 5 gems | 3 |

### Shop (gold)
| Item | Tier | Bonus | Price | Forge Lv |
|---|---|---|---|---|
| Driftwood Club | I | +6% ATK | 180 | 1 |
| Cinder Fang | I | +7% ATK | 220 | 1 |
| Reed Spear | I | +5% ATK, +2% SPD | 200 | 1 |
| Bark Vest | I | +8% DEF | 180 | 1 |
| Leaf Wrap | I | +6% HP | 160 | 1 |
| Sun Charm | I | +6% SPD | 200 | 1 |
| Moon Bead | I | +6% HP, +4% DEF | 220 | 1 |
| Ironbound Club | II | +9% ATK | 480 | 2 |
| Ironbark Vest | II | +11% DEF | 480 | 2 |
| Dawn Charm | II | +8% SPD | 520 | 2 |
| Tidecaller Spear | II | +9% ATK, +4% SPD | 900 | 3 |
| Reef Plate | II | +13% DEF, +7% HP | 900 | 3 |
| Moonstone | II | +8% HP, +5% DEF | 950 | 3 |

Shop prices sit above the gold part of crafting (crafting also costs food or gems), and buying a Tier II item costs
a little more than making it by merging, so every route stays worth using. Existing rewards still give items:
dungeon first clears, a 30% chance on repeat clears, ruin searches, survival milestones.

## 5. Save compatibility (schema 5)
- v0.7 saves (schema 4): items, equipment, gold and everything else are unchanged; `forge` records start empty; the
  Old Forge ruin is added by the world check (default spot, or the nearest free one).
- Older saves still migrate all the way (1 → 5). A copy of the pre-migration save is kept (`…-v4`).
- Unexpected Forge data is cleaned on load (only string operation ids, at most 30).

## 6. Tests
`node tests/run-all.js` runs every suite. New: `tests/forge.test.js` (53 rule checks), `tests/browser-dev7.test.js`
(30 browser checks: the Forge in the world, the four tabs, crafting / equipping / merging / buying through the
interface including repeated taps, reload persistence, timers across screen changes, hidden/visible, island rest,
the 3D frame budget, one render loop after repeated hide/show, iPhone SE and Pro Max sizes, portrait).
`tests/perf.js` produces the measurements above. All browser tests run in Chromium, not iOS Safari, and not on a
phone.

## 7. Known issues and limits
- No real-device testing: overheating is not proven fixed; it needs a session on the actual phone.
- The 3D battle's GPU cost could only be estimated (software GPU here).
- Stepped ambient motion is a deliberate look; if it feels too choppy on a device, the step counts in
  `src/style.css` (Dev 7 section) are the knobs.
- The Forge's item icons are small pixel sprites drawn in code; there is no supplied Forge art.
