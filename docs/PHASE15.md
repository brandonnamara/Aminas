# Aminas · Phase 15: monster visuals, animation and combat polish (prototype milestone)

**Branch:** `p15-monsters`, created from `p14-world` (`3c1b6ab`, the approved Phase 14 work). Production `main`
(`0fc9e36`) is untouched and is not in this branch's history.

**Scope of this milestone:** the roster audit, the Tripo catalogue, and a three-monster showcase. Nothing in the
game changes for a player: the prototypes are behind a developer switch that is off by default. As the brief asks,
the work stops here for your review before anything is applied to the rest of the roster.

**Testing:** headless desktop Chromium with software graphics (SwiftShader) at 844×390. **Nothing was tested on an
iPhone.** Triangle, draw-call, bone and particle counts are real counts; times are desktop software-render figures and
say nothing about an iPhone's frame rate.

---

## 1. Roster audit (21 lines, 63 forms)

Contact sheet of every form at its viewer angle: `docs/ui/screens15/roster-sheet.png`. Figures per form:
`docs/ui/screens15/roster-audit.json` (blocks, size in blocks, colours, glowing blocks, moving parts, triangles, build
time, clips, personality). Tool: `tools/roster-audit.js`.

### What every form already has
* **Models:** all 63 are code-sculpted voxel models (the same model draws the 3D view, the portraits, cards and island
  critters). Each is one skinned mesh plus one for glowing blocks: **2 draw calls**, **no textures** (vertex colours),
  942 to 18,966 triangles. Largest: Aimza III.
* **Animation (Phase 8/8B):** every form has the full clip set (idle with a line-specific quirk, blink, ready, attack,
  special, hit, heavy hit, heal, guard, victory, defeat, move), timed to the battle contract, with stage-aware weight.
  A test already guarantees no two forms share an identical clip.
* **Combat:** every move the roster knows (28) has its own effect sequence in the attacker's colours; hits have
  element shards, a flash and, for super-effective blows, an 80 ms hit-stop, camera punch and shockwave.
* **Sound:** a synthesized voice per line (pitch, timbre, call shape), deeper per stage; eleven cues.

### Already at the standard (no rebuild recommended)
| Form | Why |
|---|---|
| **Aimza, Aimza II, Aimza III** | Hand-sculpted in Phase 8 (3,499 / 8,261 / 15,990 blocks); grey and black bodies with white and blue glow, a baby-like first form, a head added per stage, heads animated independently, an echoing voice per head. Matches the identity you set. |
| **Umbrit** (stage I) | Phase 8 sculpt (5,945 blocks): readable face, crest, shadow pool. |
| **Cannonis** (stage I) | Phase 8 sculpt (15,333 blocks): shell plates, working cannon. |
| **Acinus line** | Rich materials (18–20 colours), berry bush, rock plates; detail grows 1,905 → 6,366. |
| **Gaiaroki line, Kairyu line, Sylvaneer line** | Clear silhouettes and good detail growth; animation reads well. Refinement here is optional polish. |

### Needs refinement
**Priority 1 — high visibility, low detail or an evolution that loses detail**
| Line | Finding |
|---|---|
| **Lumifern** (starter) | 480 blocks, the lowest-detail first form in the game, for the creature players see first. |
| **Umbrit II and III** | Less detailed than Umbrit I (2,358 and 4,160 blocks after 5,945; 9 colours after 18): the line *loses* detail when it evolves. |
| **Cannonis II and III** | Same inversion: 6,628 and 11,331 blocks after Cannonis I's 15,333. |
| **Atem** | 766–1,871 blocks; its plating is cellular noise, so the armour reads as camouflage, not as a built machine. Animation uses the same smooth sway as the animals. |
| **Meta** | 411–1,073 blocks and 5 colours; the wired hair, its signature, is a few thin cables. |
| **Igniflare line** | Readable dragon, but the card's obsidian scale plates, cream segmented belly, swept horns and lava seams are missing; the wings are one bone, so they cannot fold or beat convincingly. |
| **Pyro-Phoenix line** | 358 / 774 blocks at stages I–II; 8 colours. |
| **Terraflora II** | Fewer blocks than Terraflora I (867 after 889). |

**Priority 2 — good shapes, thin detail**
Lumi (685 at stage I; 7 colours), Voltar I (526), Zeep I (802), Pyro-Core I (723; 7 colours), Zephyr I (826),
Aquaflora I (902), Emberix line (flat white; 10 colours), Pyrokai line.

### Animation audit (Phase 8B system)
* **Strengths:** a personality per line, stage-aware weight, a quirk per idle, all contracts tested.
* **Limits that come from the rigs, not the clips:** limbs are single parts (no elbows or knees), tails are one part,
  wings are one part (no fold, no tip lag, so a wingbeat is a symmetric sine), necks are separate on only a few
  bodies. Heavy, flying and mechanical creatures therefore can only differ in tempo and amplitude.
* **Mechanical creatures** (Zeep, Meta, Atem) move with the same eased sine curves as the animals; nothing reads as
  "constructed precision".
* **Shared styles:** some lines share an attack or defeat style (punch, kneel); the test proves the clips differ, but
  they are variations.

### Combat and sound audit
* No critical-hit rule exists in battle; the "critical" presentation is the super-effective hit. It already has hit-stop
  and camera punch; it lacks anything at the target's feet and anything specific to the creature hit.
* Most moves release with little build-up at the source (the anticipation is in the body clip only).
* Voices are calls only; nothing sounds like the creature's body (wings, servos, steps, leaves).

### Recommended order (for the full roster, after approval)
1. Evolution inversions: Umbrit II–III, Cannonis II–III, Terraflora II (they currently read as downgrades).
2. Lines with established identities you named: Atem and Meta (Ancient Tech), then any Aimza tuning you want.
3. Starters and early encounters: Lumifern, Lumi, Voltar, Pyro-Phoenix, Pyro-Core.
4. Flying lines on the new wing rig: Igniflare, Zephyr, Pyro-Phoenix.
5. Optional polish: Emberix, Pyrokai, Aquaflora, Zeep, then the lines already at the standard.

---

## 2. Tripo asset catalogue

**Tripo access:** the Tripo Studio assets page opened in the browser, but its model grid never rendered to the
browser extension (two screenshot attempts timed out; the page text showed only the navigation). The catalogue is
therefore built from the fifteen exports you attached and the project files, as the brief allows. **Anything in the
Tripo account that was not exported is unverified.** Nothing in the account was opened, altered, renamed, deleted or
overwritten, and no survey, cookie banner or terms prompt was answered.

Thumbnails: `docs/ui/screens15/tripo/` (two angles per model) and `tripo-sheet.jpg`; measurements:
`tripo/catalogue.json`.

| Model | Preview | Classification | Possible Aminas role | Technical quality | Recommended action | Approval needed |
|---|---|---|---|---|---|---|
| `voxel_fortress` | `tripo/voxel_fortress_3d_model.jpg` | **Confirmed** (you named it as the Hatchery) | Hatchery | 940,696 tris, 3 × 4096² maps; reduced to 96k / 20k / 7.6k in Phase 14 | Keep as integrated; **unchanged in Phase 15** | No |
| `voxel_farm_house` | `tripo/voxel_farm_house_3d_model.jpg` | **Confirmed** (Farm) | Farm | 962,168 tris; reduced in Phase 14 | Keep; unchanged | No |
| `stylized_character` | `tripo/stylized_character_3d_model.jpg` | **Confirmed** (Fire Habitat; figure removed) | Fire Habitat | 978,173 tris; reduced in Phase 14 | Keep; unchanged | No |
| `acinus_stylized_creature` | `tripo/acinus_stylized_creature.jpg` | **Confirmed** as an Aminas file (in the Aminas project, named for a species) — but **not a Tripo export**: assembled from 120 named smooth primitives, no textures | Acinus (reference only) | 19,992 tris, smooth low-poly | Do not import: smooth shapes conflict with the block style; useful as a proportion reference only | Yes, for any use |
| `cannonis_3d_creature` | `tripo/cannonis_3d_creature.jpg` | **Confirmed** as an Aminas file, same caveat (46 named primitives) | Cannonis (reference only) | 10,784 tris, smooth | Do not import (style); Cannonis I already has a Phase 8 voxel sculpt | Yes |
| `ignivor_stylized_dragon` | `tripo/ignivor_stylized_dragon.jpg` | **Confirmed** as an Aminas file, same caveat (58 named primitives) | Ignivor (reference only) | 7,760 tris, smooth, cartoon proportions unlike the card | Do not import; the Phase 15 Igniflare prototype follows the card instead | Yes |
| `jester_voxel` | `tripo/jester_voxel_3d_model.jpg` | **Potential candidate** | Resembles Voltar (purple and gold jester) | 1.97M tris, 3 × 4096²; voxel-styled | Present to you; if confirmed, it could guide Voltar's refinement (reduced as in Phase 14). Not imported | **Yes** |
| `voxel_creature` | `tripo/voxel_creature_3d_model.jpg` | **Potential candidate** | Resembles Cannonis (blue shell beast with a cannon) | 967k tris; voxel-styled | Present to you; possible reference for Cannonis II–III. Not imported | **Yes** |
| `voxel_crystal_creature` | `tripo/voxel_crystal_creature_3d_model.jpg` | **Potential candidate** | Resembles Lumi (white round body, cyan eye, holo pedestal) | 975k tris; voxel-styled; includes a pedestal | Present to you. Not imported | **Yes** |
| `voxel_crystal_fairy` | `tripo/voxel_crystal_fairy_3d_model.jpg` | **Potential candidate** | Resembles Lumi III (wings, floating hands) | 972k tris; includes a pedestal | Present to you. Not imported | **Yes** |
| `voxel_dragon` (red) | `tripo/voxel_dragon_3d_model.jpg` | **Potential candidate** | Resembles Ignivor (red fire dragon) | 956k tris; voxel-styled | Present to you; if confirmed, a reference for the Igniflare line. Not imported | **Yes** |
| `voxel_dragon_0` (grey/cyan) | `tripo/voxel_dragon_0_3d_model.jpg` | **Uncertain** | Possibly Aimza or Zephyr; no clear match | 1.89M tris | Excluded | Yes, to reclassify |
| `voxel_dragon_1` (blue) | `tripo/voxel_dragon_1_3d_model.jpg` | **Uncertain** | No clear match; on a platform | 1.87M tris | Excluded | Yes, to reclassify |
| `dragon_2` (blue, spiky) | `tripo/dragon_2_3d_model.jpg` | **Unrelated or uncertain** | None (realistic, not voxel) | 1.98M tris | Excluded | — |
| `voxel_mage` | `tripo/voxel_mage_3d_model.jpg` | **Unrelated or uncertain** | None (a cloaked human figure) | 1.84M tris | Excluded | — |

"Resembles" is a visual note only: following the brief, no model was treated as an Aminas asset because of its
style, theme, filename or thumbnail. **No Tripo model was imported in Phase 15,** and the Phase 14 Hatchery, Farm and
Fire Habitat integrations are unchanged.

---

## 3. Highest-priority improvements (what the prototypes test)

The audit's findings come down to three things that a re-sculpt alone cannot fix, so the showcase tests all three:
1. **Detail and structure:** finer block grids, and materials laid out by anatomy (plates, belly bands, leaf veins)
   instead of colour noise.
2. **Rigs that match anatomy:** joints where the creature bends (elbows, knees, wing tips, tail segments, neck, ear
   tips), so motion can show weight, flight and mechanism.
3. **Motion and effects by body type:** heavy versus light, wingbeats with a real downstroke, servo motion for
   machines; a build-up before each release and an impact that marks the ground.

## 4. The three prototypes

Chosen to cover the three body types the brief names, each a full evolution line so the growth from stage to stage
can be judged:

| Type | Line | Why this one |
|---|---|---|
| Small | **Lumifern → Lumifern II → Lumifern III** (Light, starter) | The lowest-detail first form in the game, and the starter most players see first. |
| Large, flying | **Igniflare → Igniflare II → Igniflare III** (Fire, flying dragon) | A supplied card with clear detail to match (Ignivor), and the best test of wings and weight. |
| Mechanical | **Atem → Atem II → Atem III** (Ancient Tech, war) | An identity you set (primitive weapons, bluish-white glow); its plating currently reads as noise. |

Names stay as they are: Lumifern / Lumifern II / Lumifern III, Igniflare / Igniflare II / Igniflare III,
Atem / Atem II / Atem III. No stage added, no species added, no stats or moves changed.

### How to see them
**Developer switch, off by default.** In the game: Settings → tap the version line seven times → Monster showcase →
**Phase 15 prototypes: Off/On**. With it on, the nine forms below appear with View (details screen: model, clips,
sounds) and Battle (a practice battle; nothing saved or earned). It changes only the 3D views in this browser;
portraits, cards, island critters and saves are untouched, and it never reaches the save file.

### What changed, form by form
**Lumifern line.** Kept: round lime body, cream belly, leaf ears, glowing star mark, leaf tail, big eyes,
Lumifern II's petal crown, Lumifern III's sun-wheel and flying leaves. Refined: about 1.75× finer grid; each ear is
one broad leaf with a midrib, side veins and a pale rim, in two parts (base and tip); soft fur tufts with a shaded
underside; gold specks of stored sunlight on the back; eyes with highlights, cheeks, a small smile; paws with toes;
a seed sprout (I) that becomes the crown of petals (II) and a twelve-petal sun-wheel with large flying leaves (III).
Blocks: 480 → 2,770; 1,227 → 5,356; 2,404 → 9,311.

**Igniflare line.** From the Ignivor card: obsidian plates along the back with dark seams (lit lava seams on II,
more on III), red cells on the flanks, a cream chest plate and segmented belly bands, a heavy brow over amber eyes,
two large swept-back horns with smaller ones below and cheek spikes, teeth on both jaws, cream claws, spine spikes,
bat wings with red bones and a black membrane with a red trailing edge and a wing claw, a tail in three segments with
spikes and a flame tip. Igniflare stays a chibi hatchling (big head, stub horns, small wings); Igniflare III stands
taller in the chest and carries glowing nostrils. Blocks: 710 → 2,931; 1,956 → 5,702; 3,641 → 10,150.

**Atem line.** From the Atem card: white and silver armour laid out as plates with seams (blue light in some seams
and at every joint), a broad chest tapering to a narrow lit waist, abdominal plates, a lit chest core and a seam of
light down the centre, stacked pauldrons trimmed in blue, bracers, knee guards, heavy feet, a helmet with cheek
plates and a T visor with two blue eyes, a crest (II and III), and the ring of blocks behind the head (a broken arc
on Atem). Fists on Atem; one crystalline blade on Atem II; two longer, broader blades on Atem III, white at the edge
and paler towards the tip. Blocks: 766 → 1,325; 1,143 → 2,739; 1,871 → 4,623.

Comparisons (current on top, prototype below, two angles): `docs/ui/screens15/compare-lumifern.jpg`,
`compare-igniflare.jpg`, `compare-atem.jpg`.

## 5. Animation (`src/3d/proto15.js`)

Audit first: the Phase 8B system's contracts were kept exactly (clip names and lengths; attack contact 0.34 s,
special 0.40 s; every clip except defeat ends at rest). What changed is what the new joints allow:

| | Lumifern (small, gentle) | Igniflare (flying, heavy by III) | Atem (mechanical) |
|---|---|---|---|
| Idle | breathing; ears sway and the tips trail; a curious tilt; little bounces (I); its quirk: dozes off (eyes half shut, ears droop) and perks up with an ear flick | the chest lifts with each breath; neck and head on a slow S; the tail sways as a chain (each segment lags the one before); quirk: a full wing stretch with a yawn, then a settling shake | dead still except a faint power hum; the head scans in three fixed steps, settling at each; the torso turns a notch; the ring turns in ticks; once a cycle the blade arm rises halfway, checks, returns |
| Attack | squash, spring, stretch in the air, land with a squash; ear tips trail then flop | rears the head, crouch, wings flare; lunge with the neck thrust and the jaw snapping shut; tail counter-swings; heavier forms reach less and land with a thud | the torso winds back and holds; a step and the cut; the pose is held, then reset in two clean moves |
| Special | rises on stored sunlight, ears and leaves wide, crown and sun-wheel turning; pushes the light forward | rears to the top of a wingbeat; the downstroke drives it forward as the head thrusts out; the jaw stays open while the fire pours | arms cross and lock, the ring spins up; a beat of stillness; both slash outward with a step; the X is held |
| Hits | flinch, eyes squeezed, ear tips whip after the body stops | recoil, wings snap down, neck whips, tail lashes | rigid tilt to a hard stop, a shudder, servo reset; a big hit buckles one knee |
| Victory / defeat | two happy hops with a half twirl / a wobble, curls up, dozes | rears and roars through two full wingbeats / wings go slack, it topples | a crisp salute, held / powers down in steps and kneels |
| Move | small hops, ears a beat behind | a four-beat walk, body rising over each step | measured marching steps with knee lifts, torso level |

* **Wingbeats:** a fast downstroke and slower upstroke, with the wing tips lagging (folding on the way up).
* **Weight by stage:** idle cycles lengthen with each stage (Lumifern 3.6 / 4.0 / 4.4 s, Igniflare 3.3 / 4.4 / 5.9 s,
  Atem 5.3 / 5.6 / 5.9 s); reach shrinks and landings settle deeper.
* **Machine motion is measurable:** in Atem's idle the head is exactly still in 69 % of frames; the dragon's never is.
* **Evolution presentation:** the existing ceremony reveals the new form playing its own victory; with the switch on it
  plays the prototype's.

Animation comparisons, current (left) and prototype (right) playing the same clips: `docs/ui/screens15/anim/anim-<form>.mp4`
(idle, ready, attack, special, hit, heavy hit, guard, victory, defeat, move) and pose sheets `poses-<form>.jpg`.

## 6. Combat presentation

Only with the switch on, and only when the attacker is a prototype. Damage, turn order, statuses, move costs,
rewards, dungeon progression and the combat UI are untouched, and nothing is added to a battle's length (effects fit
inside the existing hit beat; nothing runs after 0.7 s).
* **Anticipation:** each of the twelve moves of these lines first gathers its element at the source (the mouth, the
  hand, the chest or above the head) before it releases.
* **Moves that fit the creature:** Lumifern's leaves and sunlight (a seed lobbed in an arc that bursts into sprouting
  leaves; a crown of light over the foe whose rays strike down); Igniflare's fire from the jaws (Inferno is a cone of
  fire poured for a third of a second, then flames rise around the foe); Atem's clean metal (a glint runs down the
  blade and the cut hangs as a single straight line; Overclock crosses two cuts into an X before the current arcs).
* **Impacts mark the ground:** a ring of the element spreads at the foe's feet.
* **"Critical" hits:** the battle has no critical-hit rule, so the super-effective hit is the critical moment: on top
  of the existing hit-stop and camera punch, a white flash, radial streaks and a ring of light on the ground. Heavy
  (boss) hits kick up dust.
* **Reactions in the creature's own material:** a prototype that is hit throws metal sparks (Atem), embers
  (Igniflare) or leaves (Lumifern).
* **Sound:** a layer on each line's existing voice that sounds like its body: Atem's servo whine, clanks and ringing
  blades; Igniflare's wingbeats, heavy steps and fire; Lumifern's leaf patter and chimes. Same bus, same limits; deeper
  per stage.
* **Reduce Motion:** no build-up, no ground marks, no accents (effects at the existing quarter budget).
  **Battery Saver:** the existing half budget.

Recordings, current (top) and prototype (bottom), the same battle with fixed rolls:
`docs/ui/screens15/combat/battle-aurelith.mp4`, `battle-ignivor.mp4`, `battle-atem.mp4`, `battle-lumifern.mp4`.

## 7. Performance

Desktop Chromium, software graphics. **Counts are real; times are desktop CPU times, not iPhone figures. No frame
rate is claimed.** Tool: `tools/proto15-measure.js`; data: `docs/ui/screens15/proto15-measure.json`.

### Per model (current → prototype)
| Form | Triangles | Draw calls | Materials / textures | Bones | Clip tracks | Geometry | First build | Idle sampling per frame |
|---|---|---|---|---|---|---|---|---|
| Lumifern | 942 → 3,092 | 2 → 2 | 2 / 0 → 2 / 0 | 7 → 12 | 77 → 107 | 116 → 380 KB | 42 → 81 ms | 0.009 → 0.006 ms |
| Lumifern II | 2,112 → 5,294 | 2 → 2 | same | 10 → 13 | 92 → 112 | 260 → 651 KB | 17 → 56 ms | 0.002 → 0.004 ms |
| Lumifern III | 4,126 → 10,730 | 2 → 2 | same | 12 → 16 | 108 → 120 | 508 → 1,320 KB | 35 → 116 ms | 0.003 → 0.004 ms |
| Igniflare | 1,806 → 4,910 | 2 → 2 | same | 13 → 17 | 129 → 152 | 222 → 604 KB | 22 → 46 ms | 0.005 → 0.004 ms |
| Igniflare II | 4,330 → 9,050 | 2 → 2 | same | 13 → 18 | 129 → 161 | 533 → 1,114 KB | 26 → 67 ms | 0.003 → 0.004 ms |
| Igniflare III | 6,764 → 14,168 | 2 → 2 | same | 13 → 18 | 129 → 161 | 832 → 1,743 KB | 51 → 121 ms | 0.003 → 0.004 ms |
| Atem | 1,874 → 2,388 | 2 → 2 | same | 12 → 16 | 77 → 89 | 231 → 294 KB | 19 → 28 ms | 0.002 → 0.004 ms |
| Atem II | 2,540 → 4,166 | 2 → 2 | same | 12 → 16 | 77 → 89 | 313 → 513 KB | 23 → 27 ms | 0.002 → 0.002 ms |
| Atem III | 3,686 → 5,814 | 2 → 2 | same | 12 → 16 | 77 → 89 | 454 → 715 KB | 27 → 42 ms | 0.002 → 0.002 ms |

* **Draw calls, materials and texture memory do not change:** still one skinned mesh plus one glow mesh, no textures
  (colours are per vertex). Every prototype is under the existing 20,000-triangle budget for part-built models; the
  largest is Igniflare III at 14,168 (Aimza III, already in the game, is 18,966).
* **Animation cost** stays a few microseconds per frame on desktop; the extra bones (4–5 per form) are the main cost.
* **Load:** the first build of a form is 28–121 ms here (sculpting plus meshing), once per session, then cached.

### In battle (peak over the battle; Balanced, then Battery Saver)
| Battle | Draw calls | Triangles | Effect cubes, basic / special move |
|---|---|---|---|
| Lumifern III vs Umbrit III, current → prototype | 32 → 34 | 31,288 → 44,060 | 39 → 63 / 93 → 110 |
| same, Battery Saver | 28 → 30 | 30,208 → 42,262 | 20 → 38 / 53 → 56 |
| Igniflare III vs Acinus III | 31 → 32 | 39,098 → 54,062 | 43 → 71 / 82 → 107 |
| same, Battery Saver | 27 → 28 | 37,668 → 52,466 | 26 → 39 / 41 → 52 |
| Atem III vs Rockraki | 31 → 32 | 30,300 → 34,262 | 46 → 78 / 104 → 148 |
| same, Battery Saver | 27 → 28 | 28,812 → 32,436 | 23 → 39 / 58 → 74 |

* Triangles in battle rise by about twice the model's own increase, because the targeting outline copies the
  targeted model's geometry. The arena itself is unchanged.
* One or two extra draw calls at peak come from the build-up and impact glow flashes (pooled sprites).
* Effect cubes stay well inside the existing pool of 240; Battery Saver roughly halves them as before.
* **LOD:** none yet. Battle creatures are always close to the camera, so a reduced model would mostly matter on the
  island. Recommended before the roster rollout: a coarser model (the same sculpt at a lower grid) for the island and
  for Battery Saver, which these sculpting functions can produce from one parameter.

## 8. Tests

**New:** `tests/browser-proto15.test.js`, 40 checks: the switch is off by default and production is unchanged; all nine
prototypes build, validate, keep the triangle budget, two draw calls, the clip set, the 0.34 s / 0.40 s contact and
the clip lengths; the new clips are their own and unique across the nine; detail, glow and weight grow by stage;
names keep the convention; wings, wing tips, tail chain, jaw, ear tips, waist, elbows and knees move; Atem holds
servo poses; three battles with their Phase 15 moves, super-effective accents and sound layers; a production
monster keeps its own moves with the switch on; Reduce Motion (effects cut to 13 cubes from 78, accents off);
nothing reaches the save; stats and moves unchanged; the showcase panel within 844×390; the switch from the panel;
Battery Saver. **Result: 40 of 40.**

The first runs of the new suite found three problems, all fixed in the code or the test (not by loosening a check):
the Igniflare III wingbeat was out of phase with its rear (wings low at the top of the special); the test sampled
Atem's defeat at the clip's very end, where a looping player wraps to the start; and the Reduce Motion check toggled a
class the game does not read, so it now sets the Reduce Motion setting, and the build-up and ground marks were made
to switch off under Reduce Motion.

**Complete suite:** see section 8a below.

### 8a. Complete suite
40 suites, one at a time, nothing else running, on the final build: **1,282 of 1,282 passed.** That includes the
timing-sensitive `browser-perf-fix` (23 of 23 in this run; it failed 4 checks in the Phase 14 full run and passed
alone). No test threshold was changed in Phase 15. Log: `docs/ui/screens15/full-suite.log`.

Targeted coverage of the brief's list: monster loading and rendering (`proto15`, `roster8b`, `showcase8`), animation
playback (`proto15`, `roster8b`, `p8fix`), evolution consistency and names (`proto15`, `roster8b`), battle
presentation and specials (`proto15`, `arena7`, `bench-battle`, `intro14`), equipment and stats (`gear13c`, `forge`,
`proto15`), save/load and progression (`migration-v06`, `progression13a`, `hatchery13b`, `campaign`), mobile layout
(`ui5`, `ui6`, `proto15`), Battery Saver and Reduce Motion (`env3`, `perf-fix`, `proto15`).

## 9. Branch and preview
* Branch `p15-monsters` (pushed), from `p14-world` `3c1b6ab`. `main` untouched.
* Development preview: Version 30 of the usual preview link. Turn the prototypes on from Settings → tap the version
  line 7 times → Monster showcase → Phase 15 prototypes.
* Review page with the comparisons and recordings: "Aminas Phase 15 Showcase".

**Files:** `src/voxel-proto15.js` (the three sculpts and the switch), `src/3d/proto15.js` (clips, move effects, hit
accents), `src/3d/creature3d.js` and `src/3d/runtime.js` (the switch: a prototype is built and cached under its own key;
the hit accent hook), `src/audio.js` (sound layers), `src/ui.js` (the switch in the Monster showcase), `index.html`;
tools `roster-audit.js`, `proto15-compare.js`, `proto15-anim.js`, `proto15-battle.js`, `proto15-measure.js`,
`proto15-sheet.py`; test `tests/browser-proto15.test.js`; media `docs/ui/screens15/`.

## 10. Known limitations
* **Not tested on an iPhone.** No frame-rate claim; all times are desktop software rendering.
* The prototypes are 3D only. Portraits, cards and island critters still show the current models; adopting a
  prototype means re-baking its portraits (`tools/voxel-bake.js`).
* No level-of-detail models yet; battle triangles rise by 4,000–15,000 with a prototype on screen (the outline copies
  the targeted model).
* The Tripo library could not be browsed; only the fifteen exported models are catalogued.
* Atem has no eyes to blink (it has a visor), so it has no blink clip, as before.
* Lumifern III's sun-wheel is seen edge-on from some angles in the details screen.
* The comparison videos are silent; the sound layers can be heard in the preview with the switch on.
* Recordings are headless software renders at 844×390, smoother on a real device.

## 11. Recommendations for the full roster (after your approval)
1. Adopt or adjust the three prototypes, then re-bake their portraits.
2. Build the rig pieces once and reuse them: elbows and knees for bipeds and primates, tail chains for every tail,
   folding wings for every winged line, necks for quadrupeds and dragons. Most lines need only their sculpt refined
   on top of these.
3. Fix the evolution inversions first (Umbrit II–III, Cannonis II–III, Terraflora II), then Atem's partner Meta, then
   the starters and early creatures (Lumi, Voltar, Pyro-Phoenix, Pyro-Core), then the flying lines (Zephyr,
   Pyro-Phoenix) on the wing rig, then optional polish.
4. Give mechanical lines (Zeep, Meta) the servo motion style; give heavy lines the weight settings tested here.
5. Add a coarse model per form for the island and Battery Saver before the rollout raises island triangle counts.
6. Decide on the Tripo candidates (Voltar, Cannonis, Lumi, Ignivor look-alikes) before their lines are refined, so a
   confirmed model can guide the sculpt.
