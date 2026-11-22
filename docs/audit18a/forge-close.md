# The intermittent “the Forge closes” failure (browser-dev7)

## The check
After buying in the Forge's shop, the test clicks `.overlay:last-child [data-act=close]`, waits a fixed 300 ms, and
asserts that no `.sheet.forge` remains.

## History
| Code | Runs | Failures |
|---|---|---|
| 17B (8ded42a) | 5 alone | 0 |
| 17C | 21 alone + 2 full regressions | 3 (2 alone, 1 in a full run) |
| 17D | 5 alone + 2 full regressions | 2 (1 alone, 1 in the second full run) |
| 18A (same game code as 17D), with diagnostics | 14 alone + 8 under parallel load | **0** |

## What the code does
- `UI.close` (ui.js) removes the overlay **synchronously** and runs its `onClose` (a HUD refresh). There is no close
  animation and no timer.
- No timer, interval or event reopens the Forge. `UI.forge` re-renders only into an attached overlay, and its
  `refresh()` looks only for attached overlays.

So once the click reaches the Forge's own Close button, the Forge is gone at once; the 300 ms wait is not what fails.

## What can make the check fail
- The selector depends on DOM position. `.overlay:last-child` is the Forge only while nothing has been appended after
  it in the modal layer.
- The game queues notices asynchronously after purchases and closes: Entity remarks held until panels close, toasts,
  scripted dialogue from the event queue, reward cards. Anything added as the last child, or covering the button at the
  moment of the click, changes what the click reaches.
- That fits the pattern: rare, more frequent in long or loaded runs, and never seen with the extra evaluation added
  just before the click.

## Verdict
| Cause | Assessment |
|---|---|
| Timing (the 300 ms wait) | No: closing is synchronous |
| UI transition state (asynchronous notices in the modal layer at click time) | **Most likely** |
| Event handling | Not indicated: the close handler is direct |
| Test environment (load, software WebGL) | **Contributes**: failures cluster in long or loaded runs |
| Functional defect | **No evidence**: in every observed run, the Close button closes the Forge |

Confidence is moderate, because the failure was not caught with diagnostics in 22 runs.

## Done in 18A
The test now records the modal layer just before and after the click, and prints it only if the check fails. The
click, the wait and the assertion are unchanged. The next real failure will show its cause.

## Recommended (not applied)
Target the Forge's own overlay (`.overlay:has(.sheet.forge) [data-act=close]`) and wait for that overlay to be
detached instead of a fixed time. That is more precise, not weaker. It needs your approval because it changes a test.

## Also seen
`browser-dev7` "hidden: every island animation is paused" failed 3 times in the same 22 runs (another intermittent
check, also timing-sensitive). It is reported, not changed.
