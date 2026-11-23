# Phase 18C regression (Chromium + SwiftShader, 844×390; automated; not an iPhone)

| Run | Code | Result |
|---|---|---|
| Partial run 1 (stopped at 21 suites) | before the last fixes | Found two real problems: `browser-ui6` (the gift button used an icon name with no artwork) and `browser-dev8` (the Verdant dungeons reused Starter backdrops; every dungeon must have its own). Both fixed: `spark` icon, ten new Verdant backdrops. Both suites then passed. |
| Final | final code | **2,020 passed, 1 failed.** The failure: `browser-dev8` "pixel bursts remove themselves (5 → 0 after a second)", a fixed 1.1 s wait on timed removals; passed in two individual reruns. New intermittent; test timing under load; not changed. |

Previously intermittent, all passed in the final run: `browser-perf-fix` (23/23, now with the display-rate fix), `browser-env12`
(10/10), `browser-intro14` (12/12), `browser-dev7` Forge close (30/30), island-animation checks.
New suites: `campaign18c` 98/98, `browser-campaign18c` 18/18, `stability18c` 5/5; updated `verdant18b` 53/53,
`browser-verdant18b` 22/22.

Older checks changed this phase (approved behaviour): `verdant18b` and `browser-verdant18b` (entrances now open in order,
Glowcap Glade open on arrival, the leak check now warms up Starter Island's one-time Hatchery model load first).
