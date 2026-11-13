# Phase 15C — Cinematic combat, signature abilities and audio polish

Branch `p15c-combat`, made from the approved Phase 15B branch `p15b-roster`. `main` is untouched and nothing is merged.
Everything new sits behind the Phase 15 developer switch, which is off by default (Monster showcase → Phase 15, or
`?p15=1`, developer builds only, never saved).

This is presentation only. The rule engine resolves each action first, and the battle UI then plays its events in order
(`ui2.js playEvents`). Nothing in Phase 15C can change damage, costs, cooldowns, statuses, turn order or outcomes. The
test suite checks this directly: the foe's HP, attack-down and Overclock's cooldown are identical with the switch on, off
and in the 2D fallback.

## A. Audit of the existing combat presentation

| Area | What was there | Verdict |
|---|---|---|
| Move sequences | Phase 8B choreography for every move (`STYLE`/`MOVES`): projectiles, slashes and impacts on the battle clock, with contact at 0.34 s / 0.40 s. | Solid. Kept as the base layer. |
| 15A / 15B polish | Charge-up and impact for the prototypes; generic elemental charge-up, ground mark, hit material and body-type sounds for the refined roster. | Good, but **specials looked alike**: the same column, camera push and generic flourish for every line. |
| Signature moves | Atem III's Overclock was the 15A arm-cross slash. | **Needed the nine-sword showcase.** |
| Camera | Phase 7 push toward the attacker on ultimates, a short punch on big hits, shake. Phase 14 boss introduction (skippable, off with Reduce Motion and Battery Saver). | Push and boss intro are good. **There was no target framing on specials.** |
| Impact feedback | Super-effective hit-stop, punch and 15A rim flash, ring and streaks; heavy-hit dust. | Good. Super-effective had **no sound accent** of its own. |
| Guard / heal / status | One generic column (guard, heal) or a small burst at the head (status), plus generic sound effects. | **Generic and alike.** Improved. |
| Faint / victory | A dust burst; a column plus the victory loop. | Functional. Lightly improved. |
| Audio | Phase 8 voices, 15A/15B layers, iPhone interruption recovery (resume from any non-running state). | Good. Kept. New sequences use the same bus and limits. |
| Reduce Motion | Effects at 0.25×, no camera push or shake, no intro. | Correct. Kept, and extended to every new camera move. |
| Battery Saver | Effects at 0.5×, no boss intro, lighter arenas; 15B keeps production models for the roster. | Correct. The new effects scale with it. |
| 2D fallback | `stage2d` CSS presentation, same events. | Untouched. The new hold applies only to the 3D stage. |

## B. Atem III: nine floating swords

**Attached to:** Overclock, Atem III's existing special (Metal, weaken, power 78, cooldown 3). It is still one hit and
one attack-down. There is no new move and no new hit. Atem-01 and Atem-02 keep their own presentations.

**The sword:** one voxel model (`src/3d/combat15c.js`) with a grip, a glowing pommel, a crossguard with light nodes, and a
five-wide steel blade with segment lines and a raised glowing spine. It is drawn as one shared geometry with two
`InstancedMesh` objects (steel and glow), so **all nine swords cost two draw calls**. Each blade has its own length and
its own tint of steel and core, and each moves on its own.

**The sequence** (Atem's `special9` stance clip, 1.6 s):

1. **Preparation:** a wide, lowered stance. Light gathers around Atem.
2. **Summoning:** each blade assembles from converging fragments, one after another.
3. **Formation:** the nine orbit Atem, each bobbing on its own.
4. **Targeting:** the right arm points at the foe, and the blades turn to face it.
5. **Attack:** a staggered launch, then nine distinct impacts on a 3×3 spread over the target (cuts, sparks, and a heavy final strike with a shockwave).
6. **Recovery:** the blades pull out, return and dissolve while Atem servos back to rest.

**Timing:** the battle UI waits 0.56 s longer after this one move (0.36 s with Reduce Motion), so the last blade lands
with the rule engine's hit. If a slow frame rate lets the sequence fall behind, the hit brings the remaining impacts
forward (`landNow`), so the two never drift apart. If the battle ends or is left mid-sequence, the swords and their
updater are released immediately.

**Sound:** activation hum, nine assembly clicks, a held resonance, nine launches and ringing impacts (the last one
heavy), then retraction.

## C. Signature specials across the roster

These are layered on each line's existing special, specials only:

- **Umbrit:** a wing gust, a shadow crescent and a few bats.
- **Aquaflora:** a winding water stream and a splash ring.
- **Emberix:** a tight spiral of blue flame and a burst.
- **Pyro-Spark line and Zephyr:** two wingbeat gusts, an arcing flame trail and a fire column.
- **Kairyu:** three quick water fists from alternating hands.
- **Meta:** wired-hair lines of light to the target.
- **Voltar:** a fan of thrown cards and magenta sparks.
- **Aimza:** one beam per head, so more heads on later forms, plus a shockwave on Aimza III.
- **Cannonis:** muzzle flash, smoke thrown back by the recoil, dust at its feet and a small shake.

## D. Camera and impact feedback

- **Specials:** the camera eases toward the target just before contact, then returns. A new turn always returns it to
  the battle view. Nothing new happens with Reduce Motion. The Phase 14 boss introductions are unchanged.
- **Guard:** a lattice shield in front of the defender, facing its foe.
- **Heal:** a rising green spiral.
- **Status:** a coloured ring at the feet.
- **Super-effective:** a chime.
- **Faint:** drifting motes.
- **Victory:** cubes of confetti.

Each of these has its own synthesised sound. There is no critical-hit mechanic and no "critical" label.

## E. Audio

The new sounds are `Au.seq15`: atem9, guard, heal, status, super, faint and victory. They are synthesised in code, with
no recorded or licensed audio. They play through the existing monster bus and compressor, at most two sequences at
once, and only while the context is running. An interrupted context skips them rather than queueing them, and the
existing interruption recovery is untouched.

## Tools

- **`tools/c15-record.js`:** deterministic recordings. Playwright's clock advances exactly 1/30 s per captured frame, so a slow software renderer still records the real timing.
- **`tools/c15-measure.js`:** rendering costs.
- **`tools/c15-audio.js`:** offline WAV renders.

## Results

### Regression

The full suite was 42 suites and 1,352 checks: **1,351 passed, 1 failed** (`docs/ui/screens15c/full-suite-15c.log`). It
includes the new `browser-combat15c` suite (33 checks).

- **The failure:** `browser-arena7`, "leaving battles frees their arenas…". In the full run the geometry count went 14, 17, 17. The check allows +2 between the first two rounds, and the count stopped growing after that. That test's own note says the count "can settle one round later".
- **Isolated reruns** on the same code passed 3 of 3, each holding steady across rounds (20/20/20, 23/23/23, 20/20/20) (`arena7-reruns.log`).
- **One earlier failure** came from a rerun while the full suite was running at the same time. That rerun failed a different check, and I don't count it.
- **The 15C code builds no geometry with the switch off**, which is how that test runs. I did not change the threshold, and I report the failure as an intermittent result.

### Costs

These are desktop software rendering figures (`c15-measure.json`), not iPhone frame times.

- **Atem III Overclock:**
  - Peak draw calls: 30 off, 40 on, 36 with Battery Saver, 39 with Reduce Motion.
  - Peak effect cubes: 112 off, 152 on, 73 with Battery Saver, 21 with Reduce Motion.
- **Other specials:** draw calls are unchanged (29–35). Cubes rise by about 30–45 with the switch on, and fall to roughly half with Battery Saver and about a fifth with Reduce Motion.
- **Budgets:** everything is inside the 240-cube pool and the 60-draw-call budget.
- **Memory:** one sword geometry pair is cached after first use; nothing else is retained after a battle.

### Media

- `docs/ui/screens15c/rec/`: 14 deterministic recordings.
- `docs/ui/screens15c/audio/`: 7 WAV files.
