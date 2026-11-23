# Phase 18D full regression

`node tests/run-all.js`, Chromium + Playwright with software WebGL; not an iPhone.

| Run | Suites | Passed | Failed | Log |
|---|---|---|---|---|
| 1 | 63 | 2,139 | 2 | `regression-run1.log` |
| 2 (final) | 63 | 2,142 | 0 | `regression-run2.log` |

Run 1 failures, both investigated and resolved before run 2:
- `browser-verdant18b`, "the Verdant Wilds draws in about as many calls as Starter Island (88 vs 76)": a **genuine
  regression from 18D**. The new 3D obstacle models came in three variants each, one draw call per variant. Fixed in the
  game, not the test: the four kinds are baked into one mesh (79 vs 76 now). Assertion unchanged.
- `browser-ui5`, "reward cards leave by themselves": the test waited a fixed 7 s for a mythic card that stays 6.4 s plus
  a 0.32 s exit; under full-run load it overran. Now waits for the cards to leave (15 s ceiling) and reports the time.
  Assertion unchanged.

Run 2 adds 3 checks (browser-verdant18b and browser-ui5 now pass; one new rare-level check in `polish18d`).
`docs/ui/screens15d/status-chips.png` is rewritten by a test run and was restored before committing.
