# Phase 16C — Mobile optimisation and stability

Branch `p16c-mobile-stability`, from the Phase 16B commit 2dc8e0a. Production `main` is untouched. The Phase 15 and
Phase 16A switches stay off by default; the new opening was not enabled.

**Where these results come from.** Everything here was measured in desktop Chromium driven by Playwright, with
SwiftShader (software WebGL) at an 844×390 landscape touch viewport. "Slow device" means Chrome DevTools CPU
throttling ×4. **No physical iPhone was used in this phase.** Software-rendered timings are useful for comparing
before and after; they are not iPhone frame rates.

## What changed

| Area | Change | Evidence |
|---|---|---|
| Graphics context loss, island | When iOS drops and restores the WebGL context, the island now pauses while it is lost and redraws everything, shadow map included, when it comes back. Before, the redraw after a restore sampled an empty shadow map: the island came back dark and blotchy until something forced a shadow redraw. | `docs/ui/screens16c/context-restore-16b-vs-16c.png`. Mean colour difference before loss → after restore: 16B 29.3 of 255, 16C 1.5. |
| Graphics context loss, battle | The battle loop now starts again by itself when the context returns. Before, it stayed stopped (`contextrestored` only cleared a flag), so the battle stayed frozen until the screen was reopened. The toast now says the view will come back on its own. | `browser-stability16c`: loop running again and the battle playable after restore. |
| Touches taken by the system | If the app goes to the background (or the window loses focus) with a finger down on the island, the touch is now forgotten. Before, a stale pointer stayed in the map, and the next one-finger drag was read as a pinch. | `browser-stability16c`, section 4. |
| Diagnostics | `VoxIsland.stats()` adds `ctx` (lost, events), `occPace` (occlusion passes and their whole-frame cost) and `programs`; `C3D.stats()` adds `ctx` and `programs`. Read-only. | — |
| Tests (approved) | Condition-based waits in Dev 8 and in the combat camera check; a new stability suite. | See "Tests" below. |

No appearance, layout, model, gameplay, save or economy change.

## Tried and reverted (no measured benefit)

Both were removed because repeated measurements did not show a gain, per the brief's "only where measurements
justify it".

1. **Shader compile in a frame of its own** (island and battle), to split the first-draw stall. Island compile is
   25–190 ms of a ~3 s first draw in software rendering. Battle entry, three runs each: longest task 679–833 ms after
   vs 743–836 ms before (normal), 1,031–1,341 vs 1,125–1,224 ms (slow). No difference beyond noise. It might matter on
   an iPhone, where Safari compiles shaders at first use, but that is unmeasured, so it is not shipped.
2. **Pacing the island occlusion pass by its whole-frame cost.** First 20 s after the island opens, slow device,
   three runs each: main-thread busy 35.5 / 48.0 / 31.7 % after vs 39.7 / 38.0 / 42.5 % before. Within noise.

## Rendering profile (before = 16B code, after = 16C)

`tools/p16c-profile.js`, single runs; raw files `docs/ui/screens16c/profile-{before,after}-{normal,slow}.json`.
First frame (ms) / longest task (ms) / sustained fps.

| Scene | Normal, before | Normal, after | Slow ×4, before | Slow ×4, after |
|---|---|---|---|---|
| Starter Island | 5,581 / 3,164 / 50 | 6,265 / 3,077 / 60.5 | 11,290 / 4,452 / 5.3 | 10,465 / 4,416 / 12 |
| Collection | 216 / 76 / 50.5 | 130 / 614 / 60.3 | 462 / 53 / 60.3 | 571 / 1,011 / 60.5 |
| Building interior (Hatchery) | 41 / 0 / 60.5 | 44 / 0 / 60.5 | 363 / 74 / 60.3 | 277 / 120 / 59.8 |
| Creature view | 812 / 756 / 30.5 | 732 / 678 / 19.8 | 1,608 / 1,369 / 18 | 1,904 / 1,481 / 20.8 |
| Dungeons | 872 / 793 / 34.8 | 867 / 782 / 28.8 | 1,897 / 1,536 / 30 | 1,670 / 1,252 / 29.5 |
| Combat | 1,155 / 855 / 11.5 | 1,295 / 577 / 12.3 | 3,029 / 1,708 / 7.3 | 1,546 / 903 / 7.8 |
| Combat, Cannonis vs Zephyr | 898 / 623 / 9.3 | 995 / 556 / 10.3 | 1,301 / 863 / 6.5 | 1,629 / 874 / 6.8 |

The shipped code does not change rendering work, so these two columns are the same renderer measured twice; the
spread is run-to-run noise in software rendering (an occlusion pass landing inside a scene's window, for example).
The collection's 614 ms and 1,011 ms tasks are island occlusion passes still running behind the panel.

**Where the time goes (software rendering).** The island's first draw (~3 s) is shadow map, occlusion pass and
raster, not shader compile. In a CPU profile, the occlusion pass (`drawOcc`: proxies, stencil pass, read-back into a
2D canvas, then a full redraw) is 2.0 s of self time in 5.2 s. It reruns when creatures move. On a phone GPU these
are milliseconds, not seconds (Phase 3 measured the island at the 60 fps cap on an A14/A15-class iPhone), so I did
not change it without an iPhone measurement. Renderer load is moderate: island 76 draw calls / 144k triangles with a
2048 VSM shadow map (High); battle 20–22 calls / 14–36k triangles.

**Models (Cannonis, Meta, Zephyr).** Creature meshes are already greedy-meshed (`voxelGeometry`), so there is no
lossless triangle cut left. Phone costs from 15D: Cannonis I 12,430, Cannonis III 9,842, Meta III 8,760, Zephyr III
8,214. All are inside the 20,000 budget and above the 8,000 phone preference. Cutting them further means a coarser
grid, which is a visible change. Not done without an iPhone measurement showing a need.

## Memory

Repeated transitions (island → collection → Hatchery → creature view → battle → dungeons), six cycles, heap after
forced GC. The deliberate creature cache is kept, with one unmeasured warm-up round in the new test as approved.

| | Cycle 1 → 6, normal | Cycle 1 → 6, slow |
|---|---|---|
| JS heap | 15.11 → 15.61 MB | 15.08 → 15.55 MB |
| DOM nodes | 7,386 → 7,378 | 7,358 → 7,366 |
| Event listeners | 69 → 68 | 68 → 69 |
| Battle geometries / textures / templates | 9 / 2 / 4 → same | same |
| Island geometries | 80 → 80 | 80 → 80 |
| Canvases | 2 → 2 | 2 → 2 |

16B measured the same (heap 15.02 → 15.53 MB, nodes 7,378 → 7,378, listeners 63 → 63). No leak found in geometry,
textures, listeners or animation resources. The ~0.5 MB heap rise over six cycles levels off and is the same before
and after. The opening cinematic removes its listeners when it ends (67 → 60).

## Tests

**Condition-based waits (approved).**

- **Dev 8:** each fixed delay after Continue is now "the island has drawn a frame, then three frames in a row under
  250 ms apart" (max 60 s). The intro and customisation steps wait for their own state. All assertions and the
  8-second action timeout are unchanged.
- **Combat camera:** the same 1.5 s as before, then, if the camera has not yet eased back (focus under 0.05, the
  value the check requires), it keeps waiting, at most 4.5 s more. The time is reported in the check.

| Run | Combat (33 checks) | Dev 8 (42 checks) |
|---|---|---|
| Normal | passed (camera settled after 1,728 ms) | passed |
| Under load (3 CPU-saturating processes, 2 cores), run 1 | passed (2,653 ms) | **failed** |
| Under load, run 2 | passed (2,441 ms) | **failed** |

Under load the camera settled after 2.4–2.7 s, so the old fixed 1.5 s would have read it mid-ease. **Dev 8 still fails
under load** (four runs, plus one with the reverted occlusion change). Every time, Playwright's 8-second action
timeout on a tap or screenshot runs out after a reload (at the wallet button, once at a screenshot). Software WebGL
holds the page for 3–8 s per island draw when the CPU is contended, and the page cannot take the tap. This is the
test environment, not an assertion failing. I did not raise the timeout.

**New suite `tests/browser-stability16c.test.js`** (20 checks): island and battle context loss and restore; a touch
taken away by backgrounding; save on background and on pagehide; audio suspended then resumed by the next touch; four
rounds of screen changes after a warm-up (no GPU, listener or DOM growth, heap within 2 MB); cinematic pause in the
background, cleanup after Skip, and cleanup when another screen opens mid-cinematic; a mid-game save through export
and import unchanged (Aminas, gear, items, quests, currencies, dungeons, buildings); malformed files refused without
touching the stored save.

## Full regression

`node tests/run-all.js`, 48 suites (47 plus the new one): **1,595 passed, 1 failed** (`docs/ui/screens16c/full-suite-16c.log`).

- **`browser-polish16b`, 1 failure:** "at every size the panel stays on screen and never covers Aa, Auto or Skip".
  - Run alone it failed 2 of 5 times on 16C, and 1 of 3 times on the 16B code. **It is pre-existing, not caused by
    16C.**
  - Cause (`tools/p16c-dialogue-probe.js`): the check reads the dialogue after a fixed 500 ms. For the first
    ~130–260 ms after a panel opens, the Aa/Auto/Skip buttons sit 1 px into the panel's top edge, until the
    ResizeObserver that moves them runs. While the page is busy with an island draw, that one frame lasts longer
    and the 500 ms sample can land in it.
  - The same timing gives the occasional "Instant shows the whole line" failure (0/228). The text fills as soon as
    the page runs again, at about 1 s on a busy page.
  - For a player this is a 1-pixel overlap for a few frames as the panel opens.
  - **Not changed.** Replacing the fixed 500 ms in this test with a wait for "the text is filled and the controls have
    moved" would fix it, in the same way as the approved Dev 8 and combat waits. That needs your approval, since the
    approval covered those two tests only.
- Dev 8 and combat passed in the full run, as did the new stability suite (20/20).

## iPhone stability review (simulated or by code reading)

| Item | Status |
|---|---|
| Safari / WebGL | WebGL2 with fallback (existing). Context loss and restore are now handled on the island and in battle (above). |
| Touch | Stale touches cleared on background or blur (new). `touch-action: manipulation`, no callout or tap highlight, 44 px hit assist (16B). |
| Landscape and safe areas | `viewport-fit=cover`; safe-area insets as CSS variables; a portrait "rotate" screen. Unchanged. |
| Audio interruptions | The 15C handler resumes a suspended or interrupted context on the next touch. Tested by suspending it in Chromium; a real phone call or Siri was not tested. |
| Backgrounding and resume | Rendering pauses when hidden; the save is written on `visibilitychange` and `pagehide` (tested). The cinematic pauses and resumes. |
| Battery Saver and Reduce Motion | Unchanged and covered by existing suites (perf-fix, final15d, polish16b). |
| Save persistence after interruption | Saved immediately on background and on pagehide (tested). |
| Opening cinematic | No leaked listeners, timers or overlay after it ends, is skipped or is interrupted (tested). Its frame rate on a phone is unmeasured. |

## Saves

Export, import and undo were retested in the new suite and in `savefile16b` (47 checks): every part of a mid-game
save survives a round trip; malformed files cannot overwrite progress; older saves still load (`migration-v06`,
`browser-dev8` schema 6 checks).

## Phase 16A opening

It is still off. Cleanup and interruption handling pass in software. **Recommendation:** enable it only after one pass
on a real iPhone in Safari, checking:

- cinematic smoothness;
- backgrounding mid-cinematic (lock the phone, then return);
- an incoming call during it;
- Reduce Motion on;
- Low Power Mode.

## Limitations

- No physical iPhone testing. All timings are from software WebGL on a desktop CPU.
- The profile is single runs per condition, and run-to-run noise in software rendering is large (±20 % or more on
  first-frame times).
- Dev 8 fails under heavy CPU contention (see "Tests").
- Audio interruption was simulated by suspending the context, not by a real call or Siri.
- Context loss was simulated with `WEBGL_lose_context`. Real iOS context loss under memory pressure may differ in
  timing.
