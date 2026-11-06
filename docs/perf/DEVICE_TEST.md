# iPhone performance test: how to run it

The dev preview has a built-in test. It moves the island camera through a fixed script and measures what your
phone actually does. It takes about 40 seconds, or 4 minutes with the heat test.

## Before you start

1. Unplug the charger. Turn **Low Power Mode off**: Low Power Mode caps every web page at 30 fps.
2. Close other apps. Let the phone sit for a minute if it feels warm.
3. Open the dev preview in Safari, turn the phone to **landscape**, and load a game that is on the Starter Island.
   Any save works. A fresh game works after the intro.
4. Check that Settings → **3D voxel island** is on.

## Run it

1. Settings (the gear) → **Run performance test** → **Start (40 s)**.
2. Don't touch the screen. A small banner shows the step (1/7 … 7/7) and has a Cancel button.
3. When the results sheet appears, tap **Copy results** and paste them into the chat.
4. If you have time, run it once more with **Start with heat test (4 min)** and paste that too. This shows whether
   the phone slows down as it warms up.

Tell me the phone model, and whether the game was in Safari or added to the Home Screen.

## What it measures

| Step | What happens | What it tells us |
|---|---|---|
| idle | the island sits still for 4 s | the display rate your phone gives the page (60, or 30 in Low Power Mode) and that a still island costs almost nothing |
| pan | the camera sweeps continuously for 6 s | frame rate and frame-time spread in the most demanding island case |
| pan, widest / closest zoom | the same at both zoom limits | whether wide views (more on screen) or close views (bigger voxels) cost more |
| pan, High / Balanced / Battery saver | the same at each quality tier | which tier your phone should use by default |
| heat test (optional) | 3 minutes of panning, in 15 s slices | thermal throttling: how far the frame rate falls as the phone warms |

These also go in the copied text:

- the GPU name Safari reports (usually just "Apple GPU");
- screen size and pixel ratio;
- page and island load times;
- triangles and draw calls per step;
- the island's own CPU time per drawn frame.

## What a web page cannot measure

The test does not guess these:

- **Battery drain.** Safari has no Battery API. If you want a number, note the battery percentage before and after
  10 minutes of normal play.
- **Temperature.** There is no thermal API. The heat test shows its effect on frame rate instead.
- **GPU time and memory.** Safari has no GPU timer queries and no `performance.memory`. Both are reported as "not
  available". A slow GPU shows up as longer frame times.
