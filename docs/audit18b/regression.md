# Phase 18B regression (Chromium + SwiftShader, 844×390; not an iPhone)

| Run | Code | Passed | Failed | Failures |
|---|---|---|---|---|
| 1 | mid-phase | 1,897 | 4 | `browser-dev8`, `browser-env1`, `browser-progress13a`: assertions of the old cap (30) or of the Verdant Wilds being 2D. Updated to the approved behaviour (same checks at the new cap; the 2D check now picks an island not yet built for 3D). `browser-intro14` arena camera: intermittent, passed on rerun. |
| 2 | final | 1,897 | 6 | `browser-env12` creature-behind-Hatchery occlusion (1): passed on rerun. `browser-perf-fix` (4): intermittent; failed 2 of 6 runs on 18B code and 2 of 4 runs on the 18A base (`ba6a0c5`), same four checks, so not caused by 18B. `browser-intro14` arena camera (1): failed in both full runs, passed both individual reruns. |

Forge close (`browser-dev7`): passed in both full runs (30/30); not reproduced. Island-animation pause check: passed in both runs; not reproduced.
New suites: `verdant18b` 56/56, `browser-verdant18b` 21/21 in run 1 and 22/22 in run 2 (the leak check was added between them).
