# Environment Phase 1.2: environmental completion and rendering polish

- Branch: `env1.2-polish`, started from `e730185` (the head of `env1.1-refine`). `main` is not touched.
- Unchanged:
  - creatures, gameplay, buildings' function and placement;
  - the island layout, the camera, and saves.

## 1. Depth and occlusion (highest priority)

**Why it happened.** The island is two layers. The WebGL canvas draws the voxel world. Above it, the interactive SVG
draws creatures, markers, rings, bubbles and hit areas. A browser composites whole layers, so everything in the SVG
always covered everything in 3D. There is no shared depth.

**The fix: a reusable depth pass for the 2D overlay.** No objects were moved.

1. `src/vox-island.js` describes every occludable SVG element as a **proxy card in world space**:
   - **Creatures:** an upright card standing at the creature's feet. It is built from the creature's logical place
     (its anchor plus its current walk offset) and its art box, so idle bobbing never counts as movement.
   - **Landmarks:** pillars and floating markers ("!", "?") stand as upright cards at the landmark's centre. Glows and
     rings lie as flat cards on the ground.
   - **Rings:** a building's "restore me" ring lies flat on the ground.
2. `src/3d/island3d.js` then runs four steps:
   - draws the cards into depth and stencil only;
   - draws the opaque scene where the stencil is set, so only voxels nearer than a card survive;
   - copies that region to a thin canvas (`canvas.vox-occ`) directly above the SVG;
   - redraws the normal scene.

   Interface parts are cut out of that canvas, so they are never covered: bubbles, timers, tags, the build ghost,
   quest highlights and the sleep and heart icons.
3. **Taps:** a tap on a creature or marker that is visibly behind a building now goes to the building.
   Everything else is unchanged; interaction stays in the SVG.
4. **Cost control:**
   - the overlay is polled lightly (about 9 reads a second, 2.5 a second in Battery saver or on a still island);
   - a pass runs only when the overlay or the view actually changes;
   - during a drag the last occlusion image slides with the camera, with an exact pass at most about 8 times a
     second and once when the drag ends;
   - on devices flagged slow (no GPU), a moving creature is caught up once it stops;
   - water, waterfalls, motes, clouds and the distant islands never take part.

The result: a creature behind a building, tree or cliff is hidden by it, and in front it is drawn over it. This uses
the real depth of every voxel and works at every pan and zoom.

## 2. Sea and sky (layered, not everything 3D)

- **Distant voxel islands:** six small islands built in code, with:
  - a grass cap, earth, and a tapering rock root;
  - trees, and on some a broken tower or a thread of falling water;
  - colours baked part-way to the sky haze, so they read as far away;
  - **parallax:** they pan 40–60 % slower than the island.

  They replace the painted far islets. The story's Dormant Spire stays as painted.
- **The sea (the painted backdrop):** pixel glints twinkle in three staggered sets, plus a low cloud bank on the
  horizon and two bands of mist. These are CSS step animations, paused with the rest of the island when it is still,
  hidden or in Reduce motion.
- **Waterfalls:**
  - a darker sheet behind each ribbon gives the water body;
  - mist puffs bob where each fall thins into the air;
  - the left fall now avoids the jetty, so it is clear of it.

## 3. Ruins: individually designed

| Ruin | Design |
|---|---|
| **The Fallen Nursery** (Hatchery) | broken round tower, toppled drum, the egg-stone split open in its broken cradle with a faint light inside, scattered straw and red tiles |
| **The Buried Hollow** | the mound slumped, its stone arch still standing, propped by boulders, a fallen chimney |
| **The Dry Tidegate** | two towers (one snapped low), a fallen lintel, a cracked dry basin with one glowing puddle |
| **The Fallen Temple** (Moonshrine) | pillars at four heights, one toppled, the violet roof in a heap, a dim moon-crystal sliver |
| **The Cold Forge** | brick walls fallen to knee height except one corner, the chimney still standing, a cold anvil, a rusted rack, scattered bricks |
| **Abandoned cottage** (habitats) | one standing wall corner with its window hole, a fallen beam, element-coloured tiles |

The Reliquary Gate keeps its sealed-door design. All ruins share a small kit: broken towers, cracks, scattered
blocks, and moss in patches with vines. Gameplay purpose and placement are unchanged.

## 4. Visual corrections

- **The egg stays white:** a new "self-lit" voxel type keeps its face shading and corner darkening but is not tinted
  by the warm ground light. The Hatchery egg now stays white on its shaded side.
- **The left waterfall** has moved clear of the jetty (see section 2).
- **One family of magic lights** (`MAGIC` in `voxstyle.js`): egg cyan, water blue, moon lilac, life green, spirit
  pink. It is used by the motes, the egg speckles, the Tidegate crystals, the Moonshrine moon, the Reliquary runes
  and the standing stones. The stones now glow the same pink as their 2D quest ring. Hearth light (windows,
  torches) stays warm and is kept separate from magic.

## 5. Testing

`node tests/run-all.js` passes 380 checks across 11 suites in the final runs. That includes the new
`tests/browser-env12.test.js`:

- a creature behind the Hatchery is covered;
- the same creature in front is not;
- a tap on the covered part opens the building;
- interface cut-outs are listed;
- the draw-call bound holds;
- the 2D fallback has no occlusion layer, and turning the setting back on restores it;
- the painted far islets give way to the voxel ones;
- no script errors.

The work also fixed a bug in the Phase 1 test's obstacle fallback path (`A.IsoArt.Iso` changed to `A.Iso`).

**Known flake (not introduced here):** `browser-dev7`'s "a still island pauses its ambient decoration" fails
occasionally. When it does, the only running animation is a creature's CSS walk transition, caught mid-step. That
check counts transitions, which `animation-play-state` does not pause. It passed in 2 of 3 dedicated reruns and in
the final full run.

## 6. Performance (Chromium, software WebGL, desktop CPU: not a phone)

| | Phase 1.1 | Phase 1.2 |
|---|---|---|
| Draw calls / triangles | 53 / 164k | 59–61 / 165k |
| Terrain build, JS, once | ~250 ms | 190–310 ms |
| First object sync | ~120 ms | 115–165 ms |
| Occlusion pass (CPU side) | — | 3–5 ms |
| Main thread while panning | 34–42 ms/s | 33–53 ms/s |
| Pan frame rate, software GL | 1.3–1.9 | 1.1–1.2 |

The extra draw calls are the distant islands, the waterfall back sheets and the mist. Pan frame rates in software GL
are not meaningful for phones: every pixel is drawn by the CPU. **iPhone performance has not been verified;** no device
test has taken place.

## Outstanding

- **No iPhone test yet.** On a GPU, an occlusion update costs one extra scene render. That happens only when a creature
  moves or the view changes, and is throttled while dragging.
- **Creatures standing inside a building's footprint** (which the game never does) can peek through the gap under an
  eave.
- **Overlay parts that remain uncovered:** collect bubbles, timers and quest highlights always stay on top. This is
  deliberate.
- **The occlusion image stays fixed while trees sway:** occlusion is refreshed on change, not on every ambient frame,
  so tree tips in front of a creature can be one or two pixels out while they sway.
- **The painted backdrop stays on other islands;** only the Starter Island is voxel.
