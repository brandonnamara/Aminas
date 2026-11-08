# Phase 7 performance fix: judge frames against the frame rate the page can get

**Branch:** `ui7-perf-fix`, created from `ui7-perf`. It changes only automatic performance detection. Gameplay, monster
animations, battle effects, saves, visual design and the Auto resolution (still 1.5x on phones) are unchanged.

## The problem (iPhone battle test, 8 Nov 2026)
* In the Claude app the page only got 30 frames a second.
* The 3D view's rule counts a frame as slow if it misses a 60 fps goal by more than about 11 ms. During moves the goal
  is 60, so at a steady 30 fps about 88% of frames counted as slow.
* Battle resolution then dropped step by step: 1.5x → 1x on Auto, 2x → 1x on High.
* After that the Battery Saver rule fired, 12 times in 5 minutes. The phone was using about 2 ms of a 33 ms frame.
* The island's Auto quality step-down (a median over 20 ms while dragging) had the same flaw.

## The fix
`src/perf.js` keeps an estimate of the frame rate the page can actually get:
* **Where the evidence comes from.** The 3D views report the interval between frame callbacks, but only after a
  callback where the game did little work. Those intervals are set by the browser and screen, not by the game.
  * Battle and creature views (`src/3d/runtime.js`) count a skipped frame, or a drawn frame that was light. Light
    means under 6 ms of CPU, the GPU had finished about 6 ms after the frame was sent (a WebGL2 fence, checked without
    waiting), and the main thread was free at that moment.
  * The island (`src/3d/island3d.js`) counts a callback that drew nothing.
* **How the estimate is made.** It is the median of the last 40 such intervals, snapped to a frame rate (60, 40, 30, 24
  or 20). It is only used when the intervals are steady: at least 70% within 15% of that rate.
* **The fallback.** Otherwise, with fewer than 20 samples, or on a 60/120 Hz page, the page is assumed to get 60 fps,
  which is exactly the earlier rule.
* **Fresh start.** The estimate starts again whenever the app comes back to the foreground, since Low Power Mode may
  have changed.

**How the rules use it:**
* **Battle and creature views:** a frame's budget is now the longer of its goal and the page's frame interval. At
  30 fps a frame is slow if it arrives more than about 45 ms after the previous one, which is a genuinely missed frame.
  At 60 fps the rule is identical to before.
* **Island Auto quality:** it steps down if the median is over max(20 ms, 1.2 × the page's frame interval). That is
  20 ms at 60 fps, as before, and 40 ms at 30 fps.

**Genuine protection is unchanged.** A struggling device produces heavy or late frames:
* Heavy frames (busy CPU, a GPU still working, a main thread hogged by something else) give no evidence, so the
  60 fps assumption stays.
* Frames slower than the page's own rate are still slow at any frame rate.

So a slow device still loses resolution step by step and then gets Battery Saver, as before. The reason it switched on
now also records the page frame rate it judged against.

## Tests
`tests/browser-perf-fix.test.js` has 23 checks:

| Area | What is checked |
|---|---|
| The estimate | no evidence means 60 fps; steady 60 and steady 30 read correctly, including the odd late frame; 120 Hz changes nothing; janky frames are not mistaken for a cap; it follows the page back to 60 |
| Healthy page at 60 fps | stays at 2x, no Battery Saver |
| Page capped at 30 fps | read as 30; draws a steady 30; 0% of frames slow; stays at 2x; no Battery Saver |
| Struggling at 60 fps | steps 2x → 1x, then Battery Saver; the estimate stays at 60; the reason is recorded |
| Struggling on a 30 fps page | resolution steps down and Battery Saver still switches on |
| GPU always behind on a 30 fps page | still caught |
| Island Auto quality | the same at 30 and at 60 fps |
| Returning to the app | starts a fresh estimate |

The live cases use the creature viewer. It runs on the same render loop and rule as battles, and the Heartwood boss
room is too heavy for software rendering in the test machine (about 24 ms a frame even at 200×100). The boss battle
itself is measured on the iPhone with the battle performance test.

**Before the fix:** the same test, run against the previous code, failed the 30 fps cases. Steady 30 fps frames were
counted 100% slow, and resolution fell from 2x to 1.25x within 6 seconds. The genuine-slowness cases passed on both
versions.

## Measurements
* **Before:** the first iPhone battle test (see `claude/ui7-battle-perf-results.md`).
* **After:** the same battle test needs to be run again on the iPhone.
