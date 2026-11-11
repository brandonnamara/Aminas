# Aminas · Phase 12C: Hide and Seek controls, camera and scoring

**Branch:** `hs12c-controls`, created from `hs-redesign` (the Hide and Seek round you tested), which it keeps.
Production (`main`, `0fc9e36`) is untouched.

**Not verified on an iPhone.** Everything below was built and tested in desktop Chromium with software graphics,
emulating an 844×390 touch screen and injecting real multi-touch input. That exercises the touch logic (several
fingers at once, which finger owns which control), but not how it feels in the hand, nor Safari's own gesture
handling. Please treat touch feel, sensitivity and thumb reach as yours to judge on the device.

## 1. Movement and camera controls

### What the audit found in the previous round
* **No camera control.** The view was fixed at the island's angle, so scenery could hide the player.
* **The joystick had no dead zone.** A resting thumb made the player creep.
* **Full speed only at the very edge**, and the base stayed where the thumb first landed, so a thumb that had slid
  away needed a long way back to change direction.
* **The right side did one thing.** A tap turned the Seeker; nothing else could be done there.
* **A press could count twice on a slow frame.** The follow-up click was ignored only inside a half-second window.
  Opening the disguise tray for the first time drew all 22 pictures at once and could take longer than that, so the
  tray opened and closed again.

### Left: the joystick
* Appears under the thumb anywhere on the left 42% of the screen, below the top bar.
* **Dead zone:** the first 14% of its radius does nothing.
* **Speed:** rises from 30% at the edge of the dead zone to full speed at 85% of the radius, so full speed is
  reached before the edge.
* **Diagonals** are true diagonals at the same speed as straight lines.
* **The base follows a thumb that slides past the edge**, so turning back always takes about one radius of travel.
* **Size:** 12% of the screen height, between 38 and 56 px.
* **Movement is relative to the screen.** Up on the stick is away from the camera, however the camera is turned.
  The ground's foreshortening is corrected, so the player moves on screen in the direction the stick points.
* Lets go if the app loses focus or goes to the background.

### Right: the camera
* Drag anywhere on the right 58% of the screen to turn the camera around the player: all the way round, and tilted
  between 20° and 68° above the horizon. The round opens at the island's familiar angle.
* **Sensitivity:** about 0.37° per pixel sideways (a 120 px drag is 45°), 0.23° per pixel for tilt.
* **Smoothing:** the view eases to where the finger put it (0.07 s time constant). Reduce Motion turns the easing
  off.
* **Only the camera turns.** Nothing in the round reads the camera's angle except the joystick. It never turns the
  player, the Seeker or a disguise, standing still, moving or disguised.
* A short tap (under 0.35 s, moving less than 10 px) still turns the Seeker to face the spot tapped. A drag does not.

### Camera collision
The camera is the island's orthographic camera, now free to orbit. It sits outside the island and looks in, so it
cannot pass through scenery or push into walls. Three things stand in for collision handling:
* **Tilt limits** keep it above the ground and short of straight overhead.
* **The player's own Seeker shows through scenery** as a pale silhouette when a building or tree is between it and
  the camera.
* **The marker over the player's own disguise is drawn on top of everything.**

Neither the silhouette nor the marker is ever shown for anyone else, so they give nothing away.

### Touches do not interfere
* Each control follows its own finger, so moving, looking and pressing work together. Tested with three fingers
  down: stick, camera drag and Attack.
* Buttons sit above the two areas and take their own touches. A press never turns the camera. A camera drag that
  passes over or ends on a button does not press it, so there are no accidental attacks or penalties.
* Swiping the disguise strip scrolls it; it does not turn the camera or pick a disguise.
* A press can no longer count twice, however slow the frame. The disguise pictures are now drawn one per frame from
  the start of the round, so the tray opens at once.
* The page cannot scroll, zoom or show a menu under the round.
* The lobby and vote screens have no camera area, so voting is unaffected.

### Desktop
WASD or the arrow keys move; Space, J or Enter act; E or Q open the disguises (all as before). New: Z and C turn the
camera, V spectates, and the mouse drags the camera on the right. There was no gamepad support before and none was
added.

## 2. Spectating for hiders
* **Spectate** is a labelled button above Disguise. It works once the player is disguised and standing still.
  Before that it explains why: "Disguise yourself first…" or "Stand still to spectate."
* It moves the camera to the nearest other hider still in the round. A bar shows who is being watched ("Pip · 2 of
  3") with arrows to cycle through the others.
* **Return to my disguise** is on the bar, and the main button also becomes **Return** while spectating.
* **Only the camera changes.**
  * The player's disguise stays where it is, can still be attacked and found, and stays in the round.
  * Pushing the stick while spectating does not move it; a message says to return first.
  * The disguise tray is closed while spectating.
* **Never the Seeker.** While hiding, only other hiders can be watched. (A hider who has been found watches the
  Seeker, as before.)
* **Nothing is added to the watched hider:** no marker, outline or label. The player's own marker stays on their own
  disguise. The computer Seeker takes nothing from the player's camera.
* **It ends by itself** when:
  * the watched hider is found ("Pip was found. Back to your disguise.");
  * the player is found;
  * the round ends.
* While the player is watching elsewhere, a warning appears if the Seeker comes within 3 m of their disguise.
* The camera can be turned while spectating.

## 3. Proximity points
Hiders earn points for staying near the Seeker without being found.

| Distance from the Seeker | Points per second |
|---|---|
| Within 3 m | 5 |
| 3–8 m | 3 |
| 8–15 m | 1 |
| Beyond 15 m | 0 |

* **Scale.** The Seeker stands 1.36 island units tall. Taking that as an adult of about 1.7 m, one unit (one island
  cell) is **1.25 m**. So 3 m is 2.4 cells, 8 m is 6.4 cells and 15 m is 12 cells. The Starter Island is 30 cells,
  about 37 m, across. The scale is one number (`D.HIDESEEK.score.metresPerUnit`) if you want it different.
* **When points are given.** Only during the search, only while the hider is in the round and not found. Standing
  still, moving and spectating all score the same.
* **Whose position.** Always the hider's own disguise. Spectating never moves the scoring position.
* **Counted by the round clock, not by frames.** Points are added every quarter second of round time.
  * The total is identical at 60, 30, 20, 7 and 4 frames a second and with uneven frames.
  * Calling the scoring again at the same moment adds nothing.
  * The round clock does not run while the app is in the background and never jumps ahead on return, so a pause adds
    nothing and is not caught up afterwards.
  * A whole 75-second search right beside the Seeker is 375 points.
* **Invalid positions score nothing:**
  * either player off the playable island (ledges, floating chunks, outside the map);
  * a hider on land the Seeker can never reach.
* **Terrain between them.** If the straight line between hider and Seeker crosses ground nobody can walk on (a gap,
  a ledge, a cliff step), the distance used is the way round on foot. A hider under 4 m away across a gap but 44 m
  away on foot scores nothing.
* **On screen.** A chip by the Leave button shows the points and the current bonus, coloured by tier: "43 · +5/s ·
  Very close". During hiding it says "starts with the search"; after being found, "found".
* **In the results.** A Points column for every hider, with the round's top score starred, and a line for the
  player: "You scored 86 points for staying near the Seeker (best: 120)."
* **Rewards and economy: unchanged.** Points are a score only. No coins, food or gems are paid. The player's best
  score is remembered (`hideseek.best`, added to the save only when a score exists).
* Computer hiders score too, by the same rule, so the results compare like with like. The points do not change how
  they play: an all-computer round is identical with scoring switched off.

## Unchanged
The Seeker vote and lobby, the Starter Island map, the 10-second disguise cooldown, attacks and the 3-second scenery
penalty, the male and female seekers and their GLB slot, the computer players' behaviour, Island Defence, 5v5 and
production `main`.

## Files
| File | Change |
|---|---|
| `src/ui-hideseek.js`, `src/ui-hideseek.css` | Joystick rework, camera area, spectating controls, points chip, results points, press handling. |
| `src/3d/hideseek3d.js` | Orbit camera (turn, tilt limits, smoothing), screen-relative movement, silhouette for the player's Seeker, marker on top. |
| `src/hideseek.js` | Proximity points (`proximity`, `scoreStep`, `points`), who may be spectated (`spectatable`), points in the results. |
| `src/campaign-data.js` | `D.HIDESEEK.score`, `.camera`, `.stick` settings. |
| `tests/hideseek12c.test.js`, `tests/browser-hideseek12c.test.js` (new), `tests/run-all.js` | Tests. |

## Tests
All testing is desktop Chromium with software WebGL, emulating an 844×390 touch screen. None of it is an iPhone.

**New suites**
* `tests/hideseek12c.test.js` (30 checks, rules): **30 of 30**. Points by distance, tiers and calibration, frame-rate
  independence, repeated calls, long gaps, when points start and stop, invalid positions on a test island with a gap,
  a bridge and an islet, the real Starter Island, results, and who may be spectated.
* `tests/browser-hideseek12c.test.js` (58 checks, on screen with injected multi-touch): **58 of 58**.

| What you asked to be tested | Result |
|---|---|
| Independent camera movement | Pass. Stick and camera drag together, each on its own finger; three fingers with Attack. |
| Joystick controls | Pass. Dead zone, part and full speed, true diagonals, base following the thumb, release, letting go on loss of focus, movement following the screen after the camera is turned. |
| Stationary camera rotation | Pass. Turn and tilt with limits, turning back, smoothing, Reduce Motion without easing. |
| Disguise orientation | Pass. The drawn disguise is identical (position and orientation) before and after turning the camera, and still matches its genuine twin. The Seeker's facing is unchanged by a drag. |
| Controls not interfering | Pass. Disguise press does not turn the camera; a drag across or ending on a button does not press it; swiping the disguise strip neither turns the camera nor picks a disguise. |
| Spectator switching | Pass. Blocked before disguising and while moving; start, cycle both ways, return; never the Seeker; nothing added to the watched hider; the stick does not move the disguise; automatic return when the watched hider is found, when the player is found and at round end. |
| Proximity scoring | Pass. The player scores from their own disguise while watching a hider elsewhere; the watched hider's own score is separate; the chip shows the player's own points. |
| Frame-rate independence | Pass in the rules (60, 30, 20, 7 and 4 fps and uneven frames give the same total) and live (points equal clock ticks × rate; a 2.5-second pause adds nothing). |
| Round results | Pass. Points for every hider, the player's line and best, saved; coins, food and gems unchanged. |

**Regression: voting, transformation, attacks, computer players.** The two Hide and Seek suites from the last phase
pass unchanged in what they check: `tests/hideseek.test.js` **60 of 60** and `tests/browser-hideseek.test.js` **41
of 41** (one check was updated to read the new joystick's values). They cover the vote matching the original code on
300 lobbies, disguises, the 10-second cooldown, attacks, the 3-second penalty, line of sight and 12 all-computer
rounds. An all-computer round is also identical with scoring switched off.

**Full suite** (28 suites, one at a time, about half an hour): **920 of 922 passed.**

| Suite | In the full run | Alone afterwards |
|---|---|---|
| `browser-env1` | 1 failed: "tapping the voxel Hatchery opens its panel" | 20 of 20, twice. Phase 12C does not touch the island screen; this looks like timing under load. |
| `browser-arena7` | 1 failed: "leaving battles frees their arenas" | 30 of 30. The known timing-sensitive check from Phase 7. |

`browser-perf-fix`, intermittent in the last phase, passed 23 of 23 in this run. It is still a timing race and can
fail again.

## Recordings
`docs/ui/screens12c/`: two clips, with the injected touches drawn as white circles, and nine stills taken from them.
* `controls-hider.mp4`: walking with the stick while a second finger turns the camera, disguising, looking all round
  the disguise, spectating two other hiders and returning, the points chip counting as the Seeker passes, results
  with points.
* `controls-seeker.mp4`: walking and turning the camera together, the silhouette behind a tree, an attack on
  scenery.

They were captured at quarter speed under software graphics and sped back up, so they show behaviour, not iPhone
frame rate or touch feel. To keep the clips short, hiding time is cut short in both, and in the hider clip the
computer Seeker is told not to pick on the player so the spectating can be shown.

## Limitations
* **No iPhone testing by me.** See the note at the top.
* **The camera is an orbiting orthographic view**, the island's own look, not a perspective chase camera. It has no
  zoom gesture.
* **Sensitivity is fixed** (one setting in `D.HIDESEEK.camera`); there is no in-game slider.
* **Walking distance is measured cell to cell**, so "the way round" is accurate to about a metre.
* **Spectating is allowed during hiding time** once disguised, not only during the search.
* **No gamepad support** (there was none before).
* **Glowing ruin details are visible from new angles.** The Tide Gate's blue crystal and puddle, hidden from the
  island's usual angle, can be seen from behind. They are part of the island's model.
* **Three older timing checks are intermittent under load** (`browser-perf-fix`, `browser-arena7`, and this run
  `browser-env1`). None is in code this phase changed.
