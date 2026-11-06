# Aminas — mobile performance standards

*Environment Phase 3.* **One phone has been measured: an iPhone with a 390 × 844 pt screen** (iPhone 12, 13 or 14
class; A14–A15). Its results are in §2 and in `env3-iphone-1.json`. The other columns are still targets. They were
set from:

- how the game renders (on demand, with no continuous loop while still);
- the software-GL measurements in `ENV_PHASE3.md`;
- the known GPU class of each chip family.

Revise them from device results. Do not tighten the art to fit them first.

## 1. Quality tiers

There is one table, `A.Perf.TIERS` in `src/perf.js`. The voxel island and the 3D creature runtime both read it.

| | **High** | **Balanced** | **Battery saver** |
|---|---|---|---|
| Pixel-ratio cap | 2 | 1.5 | 1 |
| Island canvas at 844 × 390 (iPhone 12–15) | 1688 × 780 | 1266 × 585 | 844 × 390 |
| Shadow map | 2048² | 1024² | 512² (Phase 3: shadows kept, were off) |
| Nature LOD | at the widest zoom | at the widest zoom | always |
| Building LOD | never | never | always (Phase 3: better twins) |
| Ambient animation (water, sway, clouds, motes) | 12 fps tick | 12 fps tick | off |
| 3D creatures, battles | 30 fps idle, 60 fps during action | same | 30 fps |
| Chosen by | Settings → 3D detail, or **Auto (the starting tier on every device)** | Settings → 3D detail, or Auto after stepping down | Settings switch, or automatically when the device keeps missing its frame budget |

- **Auto** starts at High on every device. It steps down to Balanced for the session if the island's camera-move frames
  run slow: their median is over 20 ms across about 1.5 s of continuous drawing. The iPhone test showed High costs the
  same frame time as Balanced on an A14/A15-class phone. An older save without the setting reads as Auto.
- **Battles and 3D creatures** keep the Phase 2 phone cap (1.5) under Auto, because the device test measured the
  island only. An explicit High raises them to 2.
- **Battery saver** overrides the tier while it is on, then returns to the chosen tier.

## 2. Budgets per iPhone generation

"Pan" means the player dragging the island continuously. It is the most demanding island case, because every frame
is redrawn. A still island draws nothing.

| | A12–A13 (XS, XR, 11, SE 2nd gen) | A14–A15 (12, 13, 14, SE 3rd gen) | A16 and later (14 Pro, 15, 16) |
|---|---|---|---|
| Default tier (Auto) | High, expected to step down to Balanced, then Battery saver if needed | High (measured: holds 60 fps) | High |
| Target, pan | 30 fps, p95 under 50 ms | 60 fps, p95 under 25 ms | 60 fps on High, p95 under 20 ms |
| Target, idle island | 0 redraws while still, 12 fps ambient tick only | same | same |
| Island CPU per drawn frame | under 8 ms | under 5 ms | under 4 ms |
| Triangles drawn | up to 130k (Battery saver: 95k) | up to 200k | up to 250k |
| Draw calls | up to 80 | up to 100 | up to 120 |
| JS heap (Safari can't report it) | under 150 MB | under 200 MB | under 250 MB |
| Island first shown after opening the game | under 4 s | under 3 s | under 2.5 s |
| Sustained 3-minute pan | under 20 % frame-rate drop | under 15 % | under 15 % |
| **Measured on device** | — | **390 × 844 pt iPhone, iOS 18.7, in the Claude app (6 Nov 2026):** 60 fps in every step and every tier (the display cap); p95 17 ms; island CPU 1.4–2.3 ms per frame; 107k–147k triangles, 27–69 calls; High (1500 × 624 px, 2048 shadows) costs the same as Balanced. 3-minute heat test: 60 fps throughout, apart from one 15 s slice with a pause (frames still 17 ms at p95), so **no thermal throttling seen**. Island module loaded in 0.77 s; island shown 1.0 s after loading began. | — |

**What the measurement does not show.** Every step was at the 60 fps cap, so the real margin is unknown: the GPU
could be at 30 % or at 95 %. The test ran in the Claude app's viewer (750 × 312 pt), which has about 70 % of the
pixels of full-screen Safari (844 × 390 pt). Battles were not measured.

The Starter Island today is 170k triangles and 68 draw calls at normal zoom, 127k at the widest zoom, and 91k in
Battery saver. It is inside every column except A12–A13 at normal zoom. That is why those phones should fall back to
Battery saver if their frame times say so; the automatic switch already does that.

## 3. Rules for future islands and content

1. **Draw calls:** one instanced batch per distinct model. Every new species or building type costs one or two
   calls. Prefer seed variation inside a model over new models.
2. **Triangles:** keep to the art bible's per-asset budgets (prop under 1.5k, tree under 3k, building under 8k,
   landmark under 15k). Every asset must have a LOD twin, which the library builds automatically.
3. **Fill rate** is the main cost on phones. Do not add full-screen transparent layers. Waterfalls, mist and clouds
   are small; keep them small.
4. **No continuous loop:**
   - the island redraws on change only;
   - ambient motion runs on the 12 fps tick and stops at rest, when covered, in the background and in Battery saver;
   - new effects must join that tick, not start their own `requestAnimationFrame`.
5. **Shadows** are re-rendered only when the island's objects change, never per frame.
6. **Before each milestone**, run Settings → Run performance test on at least one phone from each column that the
   team has. Paste the result into the milestone report.

## 4. What the game watches by itself

- **Frame budget** (`src/3d/runtime.js`): lowers the 3D creature resolution first. If the creatures are still slow
  at the lowest resolution, it switches on Battery saver for the session and says so.
- **Island** (`src/3d/island3d.js`): if the ambient tick averages more than 125 ms per frame (no GPU), ambient motion
  turns off and the island redraws only on change.
- **Lifecycle:** everything pauses when the page is hidden, and resumes once on return.
