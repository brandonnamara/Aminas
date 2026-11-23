# Phase 19B — Obsidian Reach world construction

Review page: https://claude.ai/artifact/Gm3Mf6pMzS7Y92AargcBsd · Preview: v46 of the Aminas preview.

Branch `p19b-obsidian-construction`, built from Phase 19A (`0bd4d7f`). Production `main` was not touched. The Phase 16A
opening is still disabled by default. **Nothing here was tested on a physical iPhone.** Every browser number comes from
Chromium with software WebGL (SwiftShader) at 844×390 in touch mode. Use them to compare islands, not as device speeds.

Obsidian Reach is still **not live** for normal players: `D.ISLAND_LIVE.obsidian === false` and `D.O19.live === false`.
The developer panel has an **Obsidian Reach construction preview** that opens it for the current session only.

## What was built

| Area | What changed | Files |
|---|---|---|
| Cooling Forge environment | Obsidian now draws on the voxel island; before this phase it was always 2D (see the correction below). It has its own palette: violet ash ground, rust-cinder paths, black sand, basalt cliffs and magenta flowers. Green scenery is swapped for ash trees, ash rocks, crystal shoots and ash vines. Cliff faces use the island's colours. | `src/3d/island3d.js`, `src/vox-island.js`, `src/3d/voxbuild.js`, `src/3d/library/obsidian.js` |
| Glasswick hub | The kilnworkers' square: benches, a hooded well, a notice board, double-height door hooks for people and Aminas, and workshop ruins on the west road (part of Glasswick) | `src/3d/library/obsidian.js`, `src/obsidian19b.js` |
| Landmarks | The Great Forge (in the existing slot; cold, with a glowing core), the Mirror Gallery (sealed hall of panes) and the Great Bellows (leather lungs joined to the forge by clay pipes). The Black Sand Landing is the arrival point. Each place has a tap point, a sheet, a short Entity line, a Wayfinder entry and a save-safe visit record (`st.o19.seen`; the cap notice is in `st.o19.cap`, so the save has no new top-level field). None of them advances a quest or the story. | same, plus `src/ui-obsidian19b.js`, `src/island-art.js` |
| Obstacles | 3D models for all six types (basalt, crystal, ember vent, charred tree, obsidian shard, slag heap). They are merged into the shared obstacle mesh. Positions, ids, sizes and collision are unchanged. The 2D art is kept for the 2D island. | `src/3d/library/obsidian.js`, `src/3d/island3d.js` (`MERGE_O`) |
| Ten dungeon entrances | Numbered 1–10 at the 19A positions, each with its own gate motif, a locked/sealed/open look and a tap sheet showing the order. Entrances 6 and 10 belong to the Gallery and the Forge. Every entrance is **sealed**: no Enter button, `R.startRun` refuses all ten, there is no Dungeons tab, and three Explore areas wait on unbuilt dungeons. | `src/obsidian19b.js`, `src/ui-obsidian19b.js` |
| Forge (Metal) Habitat | `hab_metal`: 3×3, same production and capacity as every habitat, Metal affinity +50% through the existing rule. At most 4 can be built (others allow 6). Costs 2,000 → 30,000 gold. It unlocks after the Forest Crown. 2D and 3D art: slate roof, stone walls, chimney with an ember top, anvil, quench tub. The Resonance habitat was not added. | `src/world-data.js`, `src/island-art.js`, `src/3d/voxbuild.js` |
| Level cap | Staged: **40**, then **50** after the Forest Crown (Verdant Island Boss), then **60** after the Forge Heart (Obsidian Island Boss). `R.levelCap(st)` replaces every cap read. Saves never lose a level: the load clamp is the absolute ceiling of 60. XP past the cap is not stored. There is no retroactive XP. The creature screen says when the cap is reached and how to raise it. Below the final cap, "Level cap 40" replaces "MAX" / "Max level" on the companion card, the growth strip and the victory screen. A one-time toast announces a raise; it waits for any scene or dialogue to finish. Old saves with the boss flag get 50 on load. | `src/data.js`, `src/rules.js`, `src/progression.js`, `src/ui*.js`, `src/obsidian19b.js` |
| Readiness | Unchanged. The Reach quest (`s_reach`) stays hidden. Saves that unlocked the Reach in an older build keep their unlock, obstacle and building records and load on a ready island. | — |

### Correction to Phase 19A

Phase 19A said "the 3D island renders with a derived violet palette". **That was wrong.** `V.ISLANDS` never listed
`obsidian`, so the island always fell back to the 2D renderer, and the 19A screenshots show the 2D island. Phase 19B
adds Obsidian to the voxel island.

## Preserved (checked by tests)

The checks compare fingerprints against the 19A commit:

- the 59 obstacles: same ids, types and cells;
- the 32×32 map, its land and buildable grids, and the island record;
- every other island's obstacles.

Every place and entrance stands on land that is neither buildable nor under an obstacle, so nothing can sit under a
player building. Old-build saves keep buildings already placed on the Reach exactly where they were, and keep their
unlock and obstacle records.

## Level cap tests (`tests/obsidian19b.test.js`)

| Case | Result |
|---|---|
| New save | Cap 40; next step is 50 (Forest Crown) |
| Forest Crown beaten (campaign flag, or the old boss-dungeon clear) | Cap 50 |
| Forge Heart beaten | Cap 60; nothing further |
| XP at the cap | Not stored (no hidden XP); raising the cap grants nothing retroactively, then levelling resumes |
| Saved Amina at 47 (or 60) under cap 40 | Stays 47 (or 60), XP kept; it gains no further levels until the cap reaches it |
| Notice | Once per raise; old saves with the boss beaten are told once; a damaged record is repaired |
| Mastery | Does not exist in the build |

The approved staged-cap rule replaced older suite assertions:

- five that expected `D.MAX_LEVEL === 40` (`campaign18c`, `economy13d`, `progression13a`, `verdant18b`, `polish18d`);
- the "Max level" wording checks in `browser-progress13a` and `browser-polish18d`, which now expect "Level cap 40" / "Level cap N, no more XP";
- `browser-env1`'s voxel-island list, which now includes Obsidian (drawn only when live or previewed). The new assertions are no weaker: the start
cap is still 40, and no saved level is lowered.

## Mastery research (simulation only — `tools/p19b-mastery.js`, `docs/audit19b/mastery.json`)

The sandbox plays Starter Island and the Verdant Wilds with the 17C campaign agent, under the real 19B staged cap.
Then it plays the 19A recommended Obsidian band (cap 50, recommended levels 38–47). It uses 5 profiles and seeds 11 and 22.
XP earned at the cap goes to one of four variants:

- **none**: as built, the XP is not stored;
- **+1% × 10 ranks**;
- **+0.5% × 10 ranks**;
- **Forge Sparks**: no stat change; the XP becomes a resource at 1 gold-equivalent per 4 XP.

One rank costs `xpNeed(cap)` XP.

**Finding 1 — under staged caps, Mastery barely starts before the final cap.** Players arrive at Obsidian at 35–46
under cap 50. They reach 50 only near the end, and the Forge Heart then raises the cap to 60.

| Profile | XP earned at the cap during Obsidian (per Amina) | Ranks earned |
|---|---|---|
| fedRegularly, balanced, upgraded | ~2,100–2,700 | 0 |
| all optional Verdant content | ~5,300 | 1 |
| rarelyFed | 0 | 0 |

So Mastery cannot change Obsidian's difficulty: losses and clear times were identical across all four variants. It
matters only once players are at 60, in Celestial-era content.

**Finding 2 — earning at 60 is slow.** Balanced team, replaying Obsidian's last three dungeons at level 60:

| Variant | After 12 rounds (~2.4 h of play) |
|---|---|
| +1% or +0.5% | 5 ranks (a rank costs 4,816 XP) |
| Forge Sparks | ~6,700 Sparks |

So ten ranks would take roughly 5 hours.

**Finding 3 — stat Mastery moves boss balance a lot.** The Forge Heart's whole dungeon, first-try clear rate:

| Party level | 0 ranks | +0.5% × 10 | +1% × 10 |
|---|---|---|---|
| 41 | 0% | 18% | 98% |
| 43 | 25% | 95% | 100% |

The level-equivalents explain why:

| Bonus | At level 50 | At level 60 |
|---|---|---|
| +5% | ≈ 2.9 levels | ≈ 3.4 levels |
| +10% | ≈ 5.8 levels | ≈ 6.8 levels |

Celestial content would have to be tuned for a player population spread by up to ~7 levels of hidden stats.

**Finding 4 — save cost is trivial for every variant.** Two integers per Amina, about 1.4 KB for 60 Aminas, and old saves
start at 0. A stat variant, however, is permanent: it cannot be rebalanced downward later without taking power away.

**Recommendation: the non-stat option first** (Forge Sparks, or XP-to-essence), spent on things that already have a
ceiling: move levels, gear upgrades and cosmetics.

- It makes XP at the cap feel worth earning.
- It leaves boss tuning untouched.
- It needs no future island to assume a rank count.

If a stat track is wanted later, use **+0.5% × 10, earnable only at the final cap**, and tune Celestial with the
assumption that the median player has about 5 ranks. Avoid +1% × 10: it is worth almost seven levels at cap 60 and
flattens boss fights for farmed teams.

**Side finding.** Under the staged cap, optional Verdant replays after the Forest Crown now raise players above 40. The
"all optional Verdant content" profile arrives at Obsidian at 45.7, with +6 to +12 levels of slack over the first-try
thresholds. Phase 19C should tune the first Obsidian dungeons with this in mind.

## Performance (`tools/p19b-perf.js`, `docs/audit19b/perf.json`; software WebGL, DPR 2; not an iPhone)

**Draw calls and triangles by quality tier**

| Tier | Starter | Verdant | Obsidian |
|---|---|---|---|
| High | 73 calls / 134k tris | 79 / 152k | **58 / 115k** |
| Balanced | 74 / 131k | 79 / 149k | **58 / 112k** |
| Saver | 75 / 81k | 79 / 84k | **57 / 68k** |

Obsidian is the lightest island on every tier. Its obstacles and scenery merge into the shared meshes, and its places use
one sparkle mesh.

**Visit times.** First visit to Obsidian (build and merge): 2.3 s. Second visit: 1.6 s. Average island switch over the
long session: 2.0 s.

**Frame times while the camera pans.** These are relative only: software rendering at DPR 2 is far slower than a GPU.

| Island | p50 |
|---|---|
| Starter | 533 ms |
| Verdant | 667 ms |
| Obsidian | 500 ms |

**2D fallback.** Frame-time p50 is 16.7 ms on all three islands. The page has 2,376 nodes on Obsidian, against 2,739
on Starter and 2,496 on Verdant.

**Long session.** Thirty round trips of Starter → Verdant → Obsidian. GPU geometries stayed at 287, textures at 2 and
page nodes at 2,105 throughout. The heap stayed at 110.6 MB, but the browser reports heap in coarse steps, so treat that
figure as rough.

**Browser test (DPR 1).** Draw calls: Starter 76, Verdant 79, Obsidian 40. Six Verdant ↔ Obsidian round trips left
geometries, textures and nodes unchanged.

## Regression

`node tests/run-all.js` ran 65 suites: **2,227 checks passed, 2 failed.**

- **`browser-polish18d`**, "keeps level 40 with no stored XP". The test's save has the Forest Crown beaten, so its cap
  is 50, but the assertion hard-coded 40. It now compares with `R.levelCap(state)`. Rerun: 17/17 passed.
- **`browser-polish16b`**, "the panel never covers Aa, Auto or Skip". This check is **intermittent, and was already
  intermittent before 19B**. On the 19A base commit `0bd4d7f` it failed 2 of 6 runs. On this branch it failed 3 of 7
  runs, and it passed 7 debug runs that recorded its measurements. 19B does not change the dialogue panel. It is
  **not fixed** here.

The new suites pass: `obsidian19b` 61/61 and `browser-obsidian19b` 25/25.

An earlier, abandoned run found a new top-level save field (`capSeen`) in `browser-ui6` and `browser-arena7`. That
record was moved into `st.o19.cap`, and both suites pass in the final run.

## Known limitations

- No physical iPhone testing. All frame times are from software WebGL and only compare the islands with each other.
- The ten dungeons are entrances only. None is playable, and the battles, foes, moves and rewards are Phase 19C work.
  The Explore areas are prepared but cannot open until their dungeons exist.
- The construction preview is developer-only and lasts for the session. If the save never unlocked the Reach, the
  preview unlocks it the way an old build's purchase did, so the island can be built on. "Reset save" clears that. On the
  next normal load the save is moved back to a ready island, like any old-build Reach save.
- Mastery is research only; nothing is implemented.
- The Great Forge, Mirror Gallery and Great Bellows are static models. Their glow uses the shared sparkle mesh. There
  is no new animation, sound or particle system, by design (no expensive effects).
- The heap figure from the browser is coarse.
- The staged cap lets optional Verdant replays push teams past 40 (see the side finding above).
