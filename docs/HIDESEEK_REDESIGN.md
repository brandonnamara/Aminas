# Aminas · Hide and Seek redesign: prop disguise on the Starter Island

**Branch:** `hs-redesign`, created from `ui12a-raid-preview` (Phase 12A, the latest development build), which it
keeps. Production (`main`, `0fc9e36`) is untouched.

## What the mode is now
After the existing lobby and vote, the round plays in 3D on **your own Starter Island**: its terrain, paths, plaza,
the six story buildings, every tree, bush, rock and stump, the hill groves and the dock crates. Landscape, full
screen.

1. **Lobby and vote: unchanged.** Same players, same preferences, same vote. The Seeker is still chosen by the same
   functions, so most votes wins, a tie goes to whoever has been Seeker least, then a seeded draw, and a fallback
   draw if nobody wants to seek. One addition to the lobby: **Your Seeker: Male / Female** (saved). No character or
   gender choice existed before.
2. **Hiding (20 s).** Hiders start as small prism spirits by the plaza, walk to a spot and tap **Disguise**. The
   Seeker counts behind a veil with eyes covered.
3. **Transforming.** The Disguise tray lists every eligible object on the island, each with a picture rendered from
   the island's own model, with nearby ones first. There are 22 on a new island:
   * Buildings: Sunlit Hollow, Tide Gate, Moon Shrine, Hatchery, Reliquary Gate, Forge.
   * Trees: Old Oak, Pine, Old Stump, Hill Pine, Young Oak.
   * Bushes: Berry Bush, Tall Grass, Fern, Hill Bush.
   * Rocks: Rock, Boulder, Mossy Rock.
   * Decorations: Mushrooms, Crate, Barrel, Sacks.

   The list follows the player's own island, so built or cleared objects change it.
4. **Searching (75 s, the same time as before).** The Seeker walks the island and attacks suspicious objects.
5. **Surviving.** Hiders keep still or move slowly, and change disguise when the cooldown allows.
6. **Results.**
   * Seeker side: found, scenery hit, attacks, accuracy.
   * Hider side, for each hider: the disguise, "Found at 0:41" or "Survived", disguise changes and distance moved.

   The played and won counters are updated as before.

A hider who is found becomes a rising spirit with their name, and the player then watches the Seeker, with
**Skip to results**. **Leave** asks to confirm. A Seeker who leaves concedes; a hider who leaves counts as found.
Skipping or leaving lets the computer players finish the round at once, so the results are what really happened.

## Disguises
* **The real model, not a lookalike.** A disguise is an exact copy of the nearest genuine object of that kind: the
  same model, variant and orientation. It uses the same material, including the island's leaf sway, and the same
  per-specimen tint rule as the island screen.
* **No player markings.** It is drawn as its own one-item batch with nothing attached: no face, outline, label or
  lingering effect. The transformation is a half-second puff of prism cubes and a ring, then nothing.
* **Your own marker.** Only the player sees a small prism floating over their own disguise, and only on their own
  screen. The computer players never use it.
* **Placement.**
  * Every point of the object's footprint must stand on walkable land: no ledges, floating chunks or cliff edges,
    and no step higher than half a unit across it.
  * It must overlap no scenery, other hider or the Seeker.
  * If the exact spot is tight, the nearest free spot within half a unit is used (within 0.9 for a building).
    Otherwise the tray says "No room for a Hatchery here. Move to an open spot."
* **Genuine scenery and players are kept apart.** Disguised players are never added to the scenery list. The game
  always knows which is which; the screen never shows it.

## Moving while disguised
Movement is never blocked by the cooldown. Speeds are set by size and are slower than the Seeker (2.4 units/s):

| Size | Disguises | Speed |
|---|---|---|
| Tiny | Rock, Tall Grass, Mushrooms | 1.6 units/s |
| Small | Bushes, Stump, Crate, Barrel, Sacks, Mossy Rock | 1.2 units/s |
| Medium | Pines, Young Oak | 0.8 units/s |
| Large | Old Oak, Boulder | 0.45 units/s |
| Huge | Buildings | 0.3 units/s |

How each moves:
* Trees lean into the direction of travel and sway.
* Rocks rock and roll.
* Bushes and small decorations hop and shift.
* Buildings shudder and slide.

Each kind has a soft sound (rustle, grind or creak) while moving. At rest a disguise stands exactly like its twin.
Disguised objects collide with everything, so they cannot pass through buildings or each other; walking into
something round slides around it.

## The 10-second disguise cooldown
* **When it starts.** It starts at a successful transformation and is stored on the round's own clock. That clock
  only advances while the round plays: it pauses with the app in the background and cannot be wound on by opening
  or closing the tray, other menus or anything else.
* **What it shows.** The Disguise button shows a ring and the seconds left (9.7s …). The tray header says
  "Ready in 4.2s".
* **During the cooldown.** A change is refused with "Your disguise is recharging: 4.2s." Moving still works.

## Attacks and the 3-second penalty
* **What an attack hits.** The nearest object within reach (1.35 units), in front of the Seeker (within 60°), with
  nothing solid in between. Buildings, boulders, big oaks, the standing stones and building disguises block attacks,
  so nothing can be revealed through a wall.
* **Aim and facing.** A thin white ring shows what an attack would hit. It turns red while the Seeker must wait. It
  never says whether the object is a player. Tapping the island turns the Seeker to face that spot.
* **A hidden player:** revealed. There is a burst of light, a ring, a light camera bump and the name over them; the
  Seeker raises the prism staff; "Found Juno! They were a Pine Tree."; the hiders-left marker updates.
* **Genuine scenery:** nothing is revealed, and attacking is blocked for **3 seconds**. Feedback is a small puff of
  dust, a head-shake from the Seeker, "Just an Old Oak. 3s penalty.", and the Attack button counting down in red.
* **Thin air:** only the 0.55 s swing, with no penalty.
* **No cost for looking.** Walking up to, looking at or circling objects costs nothing.

## Seeker models: temporary voxel seekers
Tripo exports were not available, so as you asked, the Seeker uses two simple temporary models built in the
island's voxel style:
* **Male:** short hair and a teal tunic.
* **Female:** a ponytail and a violet tunic.

Both carry a prism staff. When the player is the Seeker, it takes the skin and hair colours of the player's avatar.

Both are rigged in parts and animated in code:
* walking (legs, arms, bob, ponytail), with smooth turning;
* a wind-up and strike when attacking;
* arms raised with the staff when they find someone;
* a head-shake after hitting scenery;
* eyes covered while counting.

Each is about 1,200–1,500 triangles.

**Replacing them with the Tripo models:**
1. Put the exports in `assets/seekers/`.
2. Set `D.HIDESEEK.seekerGlb.male` and `.female` (in `src/campaign-data.js`) to their paths.

That model is then loaded instead and scaled to the Seeker's height. Animation clips whose names contain idle, walk,
attack and reveal are used; without clips it is shown as is. Nothing else needs to change. Ideally the exports
should be rigged, under about 10k triangles each, in `.glb` with those four clips.

## Computer players
* **Hiders.** During hiding, each picks a disguise that is common on the island and a spot one or two units from a
  genuine object of the same kind. It keeps away from the other hiders and the Seeker's start, then walks there and
  transforms. Anyone still a spirit when hiding ends becomes the nearest object automatically. During the search:
  * Mostly they keep still.
  * When the Seeker comes close and is facing them, or attacks something nearby, they react once per approach:
    freeze (55%), creep away (30%), or change disguise if the cooldown allows.
  * When the Seeker is far away they now and then shift to a better spot. A lonely disguise (nothing like it nearby)
    takes the look of its neighbours, always respecting the 10 s cooldown.
* **Seeker.**
  * **Searching.** After a moment looking around, it walks a tour of waypoints covering the island, routing around
    buildings and big rocks. It looks around as it goes (6.5 units of sight, blocked by buildings).
  * **What makes it suspicious:**
    * Anything it sees move becomes a prime suspect at once.
    * An object it doesn't remember from the island may catch its eye, more so for a second copy of a building or
      something alone among different scenery.
    * Now and then it suspects genuine scenery it doesn't remember well, and pays the penalty for it.
  * **Attacking.** It walks up to its suspect, faces it and attacks. It respects the penalty and gives up on
    something it can't reach.

  In 40 all-computer rounds it found 2.7 of 4 hiders on average, everyone in 3 rounds of the 40, and hit scenery
  about 1.4 times a round.

## Round timing (recommendation)
* The search keeps its **75 seconds** and the lobby its 5 players.
* **New: 20 seconds of hiding before it.** Hiders need time to walk to a spot and transform.
* **The old cap of 10 searches is replaced by the 3-second penalty.** That keeps the Seeker from attacking
  everything without making each attack a scarce resource. The old settings are kept in `D.HIDESEEK` for anything
  that reads them.

All timings (`prep`, `morphCooldown`, `missPenalty`, `swing`, `reach`, `cone`, speeds) are in `D.HIDESEEK`.

## Rewards and saves
* **Rewards: unchanged.** As before, a round updates `played` and `won`; there are no economy rewards.
* **Saves: no migration.** The `hideseek` record is unchanged. `seekerModel` is added only when a Seeker look is
  chosen.

## Performance
* **Geometry.** The terrain is one mesh. Scenery is drawn in instanced batches by model, as on the island, reusing
  the island's cached models. Each player is one small draw. All effect cubes share one instanced mesh, with at most
  72 cubes and none continuous. A round is about 49 draw calls and 128k triangles on a new island, about the same as
  the island screen.
* **The loop.** It runs only during a round, at up to 30 fps; Battery saver drops it to 20 fps with no shadows. It
  stops when the round closes, by any route, and disposes its renderer and geometry. While the round is open, the
  island screen behind it pauses its ambient animation.
* **Shadows.** Shadows are redrawn only when a disguised object moves or changes, at most 8 times a second. The
  Seeker and spirits use a soft blob shadow.
* **Reduce Motion / calm.** No camera bump, a third of the effect cubes, no leaf sway, no bobbing, and steady HUD
  transitions.
* **Rules and computer players.** Under 0.1 ms a frame (Node, desktop).
* **Measured here.** Desktop Chromium with software graphics: about 7 fps, because the GPU is emulated; the island
  screen behaves the same here. This says nothing about iPhone frame rates, which have not been measured.

## Files
| File | Change |
|---|---|
| `src/hideseek.js` (new) | The round's rules, no DOM: arena from the island map, looks, placement, movement, cooldown, attack/penalty/line of sight, clock, computer hiders and Seeker, results. |
| `src/3d/hideseek3d.js` (new) | The 3D round: island terrain and models, disguises, voxel seekers (GLB slot), movement and reveal animation, effects, aim ring, tray pictures. |
| `src/ui-hideseek.js` (new), `src/ui-hideseek.css` (new) | Round screen: HUD, joystick and keys, Disguise tray, Attack, messages, spectating, leaving, results. |
| `src/ui-pve.js` | Lobby text and the Seeker look choice. The vote result opens the new round; the old grid round remains a fallback when 3D is unavailable. Voting untouched. |
| `src/vox-island.js` | `VoxIsland.mapData(iid)`: the island's map as data, for the round. |
| `src/3d/island3d.js` | `buildTerrain` exported (unchanged). |
| `src/campaign-data.js` | New settings in `D.HIDESEEK`; existing ones unchanged. |
| `src/audio.js` | Transform, swing, reveal, miss, movement rustles, countdown and start sounds. |
| `index.html` | The two new scripts and the stylesheet. |
| `tests/hideseek.test.js`, `tests/browser-hideseek.test.js` (new), `tests/fixtures/*`, `tests/run-all.js` | Tests; the original voting code and the Starter Island map are kept as fixtures. |

## Tests
All testing is desktop Chromium with software WebGL, emulating an 844×390 touch screen. None of it is an iPhone.

**New suites**
* `tests/hideseek.test.js` (60 checks, rules): **60 of 60**.
* `tests/browser-hideseek.test.js` (41 checks, the round on screen): **41 of 41**.

Together they cover the 15 required cases:

| # | Case | Result |
|---|---|---|
| 1 | Voting works exactly as before | Pass. Lobbies, computer votes and the Seeker choice match the original code on 300 lobbies, and the four voting functions are unchanged line for line. |
| 2 | Voting picks the Seeker | Pass, by vote, by fallback, and with the player voted Seeker. |
| 3 | Seeker models load | Pass for the two temporary voxel seekers. The Tripo models were not available to test. |
| 4 | Hiders can transform | Pass. |
| 5 | Disguises match scenery | Pass: same model, variant, orientation, material and tint rule, nothing extra attached. |
| 6 | Hiders move while disguised | Pass, at the disguise's own speed, and not through buildings. |
| 7 | Change works after the 10 s cooldown | Pass. |
| 8 | Change is blocked during the cooldown | Pass, including repeated taps and opening and closing the tray. |
| 9 | Attacks reveal hiders | Pass. |
| 10 | Hitting scenery gives the 3 s penalty | Pass. |
| 11 | Inspecting gives no penalty | Pass. |
| 12 | Bots behave sensibly | Pass over 12 all-computer rounds (all disguised in time, cooldown and penalty respected, the Seeker searches and finds some but not all), plus reaction and movement-spotting checks. |
| 13 | Rounds, results and rewards | Pass: results for both sides, played and won counted and saved. |
| 14 | No Hide and Seek regressions | Pass: lobby, vote, counters and the older grid functions. |
| 15 | Other modes unaffected | Pass: 5v5, Island Defence and the raid preview open and behave as before. |

**Full suite** (26 suites, one at a time, about 25 minutes): 780 checks passed and 6 failed in the 25 suites that
completed; one suite stopped part-way.

| Suite | In the full run | Cause | After |
|---|---|---|---|
| `browser-v06` | Stopped at its Hide and Seek step | It clicked the old grid round, which the 3D round replaces. The test now opens the new round and leaves it. | 48 of 48 alone |
| `browser-dev8` | 1 failed (pixel bursts remove themselves within a second) | Timing under load; not related to this work. | 42 of 42 alone |
| `browser-arena7` | 1 failed (leaving battles frees their arenas) | The known timing-sensitive check from Phase 7. | 30 of 30 alone, twice |
| `browser-perf-fix` | 4 failed | The known timing race in this Phase 7 test (see below). | Still intermittent |

**`browser-perf-fix` is not resolved.** It fails the same 4 checks intermittently on both builds. Run alone,
alternating between builds:

| Build | Runs | Failed |
|---|---|---|
| Phase 12A | 7 | 3 |
| This branch | 10 | 8 |

That is too few runs to say whether this branch changes the odds. The test starts a simulated slow device after a
fixed 1.2-second warm-up and fails when the frame-rate estimate has not settled by then. Nothing in the render loop
or the performance rules was changed on this branch, and the test is left unchanged. It should be watched on the
next phase.

Screenshots and two gameplay recordings (as a hider, as the Seeker) are in `docs/ui/screens-hs/`. The recordings
were captured at quarter speed under software graphics and sped back up; they show the game's behaviour, not iPhone
frame rate.

## Limitations
* **Seekers are temporary voxel models.** The Tripo models could not be exported. The GLB loader is in place but has
  not been tried with a real Tripo file.
* **Offline only.** The other players are computer players on the device; there is no networking.
* **Desktop testing only.** All testing used desktop Chromium with software graphics, emulating an 844×390 touch
  screen. Nothing was tested on an iPhone, so touch feel, frame rate and heat there are unverified.
* **Two WebGL contexts.** The island screen's renderer stays in memory under the round. On older iPhones this is
  worth watching.
* **Ground detail.** Grass tufts and flowers under scenery are drawn the same under a disguise and its twin. The
  island screen's undergrowth around trees is not drawn in the round, so it cannot give a disguise away.
* **Computer Seeker memory.** It "remembers" the island imperfectly by design. It sometimes suspects real scenery
  and sometimes walks past a disguise.
