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
