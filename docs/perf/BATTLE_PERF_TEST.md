# Battle performance test (Phase 7 measurement)

**Branch:** `ui7-perf`, created from `ui7-arena`. This is measurement only: gameplay, battle visuals, animations,
saves and every existing feature are unchanged. Phase 7 (`ui7-arena`), every earlier branch and production (`main`)
are untouched.

## Where it is
Settings → Run performance test, under **Battle test**:

| Option | Length |
|---|---|
| Battle test | about 2 minutes |
| With extended combat | about 5 minutes |
| Show last battle result | reopens the previous result |

Results open in a sheet with **Copy results**, the same as the island test. The last result is kept in
`localStorage` (`aminas.bench.battle`), never in the game save.

## What it does
**The battle is the same on every device:**
* the Heartwood Stag (the Island Boss, exactly as built in the game) against Lumifern, Emberix and Aimza at level 30;
* a fixed random seed;
* the test presses moves by itself and uses ultimates whenever they are ready;
* everyone's health is multiplied by 1000, so nobody faints and the battle never reaches a result: nothing is won,
  lost or recorded.

**For each quality setting:**

| Setting | Resolution cap on a phone |
|---|---|
| Auto (what players get by default) | 1.5x |
| High | 2x |
| Balanced | 1.5x |
| Battery saver | 1x |

1. Opens the battle fresh, because an arena builds its layers for the quality it opens at. It records the load time,
   the longest stall while loading, and whether the 3D stage made it in time.
2. *Auto only:* 5 s idle on your turn (30 fps budget).
3. 10 s of turns with the **Phase 7 effects on**.
4. 10 s of turns with the **Phase 7 effects off**. These layers are hidden on every drawn frame:
   * arena particles, light shafts and distant silhouettes;
   * the boss light pool;
   * attack effects (cubes, glows, shockwaves);
   * turn rings and target brackets;
   * creature outlines.

   Phase 7 movement, lighting and fog stay. "Off" is the arena without its added layers, not a copy of Phase 6.
5. **Breakdown.** A still frame is drawn repeatedly at the setting's own resolution:
   * with everything;
   * without any Phase 7 layer;
   * without each layer in turn;
   * at 1x.

   There are three interleaved rounds and medians are reported. This gives each layer's cost and how much of the
   frame is resolution (pixel) work.
6. **Verdict:**

   | Verdict | Meaning |
   |---|---|
   | keeps up | meets its frame budget |
   | display-limited | the page itself only gets about 30 fps, e.g. Low Power Mode |
   | CPU-bound | animation, effects and draw submission take too long |
   | GPU-bound by pixels | 1x is much cheaper |
   | GPU-bound by content | none of the above |

   The verdict also gives the on/off difference and the biggest Phase 7 layer.

**Extended combat (optional):** 3 minutes of continuous turns on Auto with effects on, reported in 15 s slices. The
resolution adapts exactly as in play. The first minute is compared with the last, for frame rate and p95. A big drop
means the phone heated up and slowed down.

## Recorded per phase
* **3D frame rate and budget:** fps drawn and the budget (60 during moves, 30 when still, 30 in Battery saver).
* **Frame times:** p50, p95, p99 and worst.
* **Missed frames:** the share of frames that arrived more than 1.5× late.
* **Slow frames:** the share of frames the resolution and Battery saver rule counted as slow (over 28 ms).
* **CPU:** per-frame time in the scene update (animation, effects) and in draw submission.
* **Workload:** draw calls, triangles, live effect cubes, pixel ratio (and any changes), canvas size.
* **Turns played and ultimates used.**
* **Page frame rate**, and pauses (app switcher or notifications) kept out of the rates.

**Also recorded once per run:**
* the device;
* the display rate the page gets;
* settings (quality, Battery saver, Reduce Motion);
* the state of the save.

## Automatic Battery saver
* **The rule:** in the 3D battle or creature view, if more than half of 1.5 s of frames are slow while already at the
  lowest resolution, Battery saver switches on for the session.
* **Its reason is now kept:** the view (e.g. `battle:heartwood:island-boss`), the window, slow and total frames,
  resolution, frame budget, whether a move was playing, the screen, and the time. It is held in memory and in
  `localStorage` (`aminas.saverlog`, last 5), so it survives reopening the preview. It is not in the save.
* **The test reports:**
  * whether Battery saver was already on for the session, and why;
  * every moment its rule *would* have fired during the test, with the measurement behind it.
* **During the test,** Battery saver is held off so every setting is measured as itself. The session's own state is
  put back afterwards.

## What it leaves behind
Nothing. While the test runs, saving is suspended. The save is compared before and after: it has been
byte-identical in every run, and if it ever differed the original would be restored.

Afterwards these are all exactly as before: quality, Battery saver and its rule, the 3D loop (stopped) and the
screen (the island).

## Code
| File | Change |
|---|---|
| `src/bench.js` | the battle test, results sheet, buttons |
| `src/3d/runtime.js` | per-frame CPU counters; draw-interval recording (off in play); the resolution and Battery saver decision log; a per-frame layer-hide switch for the test (off in play; visibility is restored straight after each draw); `bench()` can render at a given resolution and hide by name prefix; view names |
| `src/perf.js` | `reportSlow(reason)` keeps the reason; while the test forces a tier, that tier decides Battery saver (so High and Balanced are measured uncapped). In play the tier is never forced, so nothing changes. |
| `src/3d/combatfx.js`, `src/3d/arenas.js` | names on the Phase 7 objects (`fx:*`, `atmo:pool`) so the test can find them; nothing drawn changes |
| `tests/browser-bench-battle.test.js` | 28 checks |

## Limits
* A web page cannot read GPU time, battery or temperature. The GPU shows up as frame times and in the breakdown
  (which syncs with `readPixels`). Heat shows up indirectly, as frame rate falling over the 3 minutes.
* "Effects off" removes the added layers but keeps Phase 7 movement and lighting.
* Desktop runs of this test use software graphics. Their numbers only show that the test works.
