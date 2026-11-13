# Phase 15B — Full roster refinement (developer switch, off by default)

Branch `p15b-roster`, made from the approved Phase 15A branch `p15-monsters`. `main` is untouched and nothing is merged.
Everything here sits behind the Phase 15 developer switch (`A.Proto15`: Monster showcase → Phase 15 box, or `?p15=1`,
developer builds only, this browser only, never saved). With the switch off every model, clip, portrait, sound and
effect is exactly what Phase 15A shipped. A test proves this block for block against fingerprints of all 63 production
models (`tests/fixtures/prod-models-15a.json`).

## What changed

**The principle is refinement, not redesign.** Each line's own builder runs again on a finer block grid
(`V.withDetail`). It uses the same primitives, proportions, palette, faces, horns, wings and tails, sculpted with more,
smaller blocks. A shading pass then darkens creases and lightens upper edges. Glowing and rare colours (eyes, markings)
are left exactly as sculpted.

Kit helpers that were written in fixed block sizes now keep their proportions on the finer grid: wing bones and
feathers, toes, berries and dots, floating bits, leaf blobs, and the minimum tuft and flame radius. At detail 1
(production) they are identical.

Species work (`src/voxel-roster15-species.js`) is added only where the brief names it.

| Line | Work |
|---|---|
| **Umbrit II–III** (Part A) | Bat anatomy: broad upright bat ears with a pale hollow (rebuilt on the same ear joints); jointed bat wings (arm, wrist with a thumb claw, three fingers, membrane with a scalloped trailing edge); a nose-leaf, fangs and a brow. Duskmantle's wings are folded at the sides (cute, cape-like). Eclipsar's are held half open and tipped with light (imposing). Umbrit I is the Phase 8 sculpt and stays as it is. |
| **Cannonis II–III** (Part A) | Brought up to the sculpted first form's finish: 2×3 glowing eyes with pupils under a stone brow, nostrils, a mouth line, a notched stone rim round the shell, heavier claws. |
| **Terraflora II–III** (Part A) | The first form's face carried forward: taller glowing eyes, a bark brow, a carved mouth, moss on the shoulders, and the bud-tipped sprouts at the crown. |
| **Emberix** | Fox: a tapered snout carved from the blunt muzzle, a dark nose, a mouth line, white cheek ruffs, broad pointed ears on their own joints (blue tips kept), and a fuller brush tail below the flame. |
| **Acinus** | Face: bigger eyes with highlights, stone brows, a snout pad with nostrils, and a mouth line. The bush body and four-legged stance are unchanged. |
| **Zeep** | Face: a visor brow over the eyes, a snout plate with a glowing three-bar grille mouth, ear vents and rivets. |
| **Kairyu** | Monkey (not a dragon): a heavier brow, a curved smile, nostrils, tan inner ears, and real hands (four curled fingers and a thumb). |
| **Voltar** | Jester: a curved grin and painted diamonds under the eyes, a harlequin pattern on the hat lobes, and a pleated gold-and-white ruff. No Tripo model is used. |
| **Aquaflora** | Serpent: a continuous finned frill from head down the neck and back, cheek fins, side fins and a tail fluke (mint membranes with darker rays). The bodies are kept: the first form's coil and the later forms' long necks. |
| **Pyro-Spark line** | A hooked two-tone beak with a gape line, a gold eye ring, and feather vanes between the flight-feather shafts, so the wings read as feathers, not spines. |
| **Zephyr** | The same feather vanes. |
| **Lumi II–III** | The crown blocks and chest gem are kept at their original size on the finer grid. |

**Meta, Atem, Lumifern and Igniflare** keep their Phase 15A prototypes unchanged. **Aimza** is left as it is (already at
the standard). The other lines (Gaiaroki, Pyro-Cell, Sylvaneer, Pyrokai, the rest of the Zephyr, Kairyu and Lumi forms)
get the finer grid and shading only.

## Animation (Part C), `src/3d/roster15.js`

Each line keeps its Phase 8B clips, with the same names, durations and contact frames (0.34 s / 0.40 s). Every clip
except defeat ends at rest, which the test checks on every form. Body types add tracks for the new parts, or a richer
idle:

- **bat:** wings breathe and stretch in the idle, flare on ready, snap back then beat on the attack, spread fully on the special, flinch when hit, wrap forward on guard and heal, beat twice in victory and droop in defeat. The ears flick.
- **fox:** the ears prick forward on ready, flatten on the attack and when hit, wiggle in victory and droop in defeat.
- **serpent:** the idle is a travelling wave through neck, head and tail (follow-through).
- **monkey:** a head scratch with one hand in the idle.
- **mech:** Zeep's head turns in precise, held steps.
- **bird:** quick wing ruffles in the idle.
- **heavy:** keeps its Phase 8B weight.

## Combat (Part D)

Every refined line's moves get an elemental charge-up at the release point (mouth, cannon muzzle or hand) before the
existing release. A ground mark appears under the impact, and a hit on a refined creature throws off its own material.
All of this uses the line's own Phase 8B colours, and the 15A super-effective accent applies.

Sound layers are added by body type: bat wing flaps and chirps, fox yips, serpent hiss and water, monkey chatter, mech
beeps, bird wingbeats and cries, heavy thuds, jester bells and float chimes.

Timing, damage, costs and statuses are unchanged. There is no critical-hit mechanic. With Reduce Motion, none of the
decorative effects play.

## Detail levels (Part F)

| Level | Used for | Roster | 15A prototypes |
|---|---|---|---|
| High `…15` | desktop High tier | finer grid tuned to ~11,000 triangles | as in 15A |
| Mobile `…15m` | phones and other tiers | finer grid tuned to ~6,500 triangles | as in 15A |
| Battery Saver | saver | **production model** | coarser `…15s` copy |

The grid per form (`DT` in `src/voxel-roster15.js`) was chosen from each production model's measured triangles, so
small creatures gain the most and large ones stay in budget. Faces and silhouettes are never reduced. The finished
models are greedy-meshed with hidden faces removed and shared materials, as before. Measurements are in
`docs/ui/screens15b/roster15b-measure.json` (software WebGL on a desktop, not an iPhone).

## Portraits and cards (Part G)

`assets/portraits15/<id>.webp` holds 60 portraits, baked by `tools/roster15-portraits.js` from the refined High models
with the same renderer and size (320 px) as the production set. With the switch on, cards, the details screen, the
island and the dungeon use them (`A.Art.portraitSrc`, `C3D.portraitUrl`). With it off, the production portraits are
used.

## Tools

- `tools/roster15-prodhash.js`: production model fingerprints.
- `tools/proto15-compare.js [out] [ids]`: before/after renders (`CELL=` size).
- `tools/roster15-sheet.py`
- `tools/roster15-measure.js`
- `tools/roster15-portraits.js`
- `tools/proto15-anim.js` and `tools/proto15-battle.js`, which now take `P15_OUT` and `P15_FIGHTS`.

## Results

- **Regression:** 41 suites, 1,319 checks, 0 failures (`docs/ui/screens15b/full-suite-15b.log`). This includes the new `browser-roster15b` suite (37 checks).
  - In `browser-proto15`, the "production monster" example moved from Rockraki to Aimza II, because the switch now also covers Gaiaroki's line. The panel lists the 12 prototype forms as before. No threshold was changed.
  - Two refined-only tweaks (Zephyr vanes, Lumi crown) landed while the run was under way. Production is fingerprinted unchanged, and the roster suite ran on the final code.
- **Costs** (`roster15b-measure.json`; desktop software WebGL, not an iPhone), across the 48 roster forms:
  - Triangles: production average 3,950, High 8,018, phone 5,595.
  - Every model is under the 20,000 budget, at 2 draw calls per model.
  - Flagged against the per-level targets:
    - **Phone over 8,000:** Eclipsar 8,524, Cannonis I 13,918, Shellfin 11,000, Calyxar 8,676, Stormbringer 8,858.
    - **High over 12,000:** Cannonis I 13,918, Shellfin 14,294.
- **Recordings and comparisons** are in `docs/ui/screens15b/`: `evolution-1.jpg` and `evolution-2.jpg`, `anim/`, `combat/` and `models/`.

## Known limitations

- Nothing was tested on an iPhone.
- Aquaflora II–III keep their legs. A legless body would be a redesign and needs approval.
- Emberix's muzzle is tapered, not rebuilt.
- Gaiaroki, Pyro-Cell, Sylvaneer, Pyrokai and Lumi I get the finer grid and shading only.
- No Tripo assets were used; the five look-alikes remain unconfirmed.
