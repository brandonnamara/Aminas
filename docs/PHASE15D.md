# Phase 15D — Final monster and combat refinement

Branch `p15d-final-polish`, made from the approved Phase 15C branch `p15c-combat`. `main` is untouched and nothing is
merged. All new work is behind the existing Phase 15 developer switch, which is off by default. The production models
are block-for-block unchanged (fingerprint test against `tests/fixtures/prod-models-15a.json`).

## Creature models

| Form(s) | Change |
|---|---|
| **Aquaflora II–III** (approved anatomical change) | The legs are gone, replaced by a continuous serpent. The line's own head (face, red eyes, jaw, horns, coral crest) is taken block for block from its builder and stays where it was. Below it is new: an S-curved neck rising from a ground coil into a finned, lifted tail, built as one smooth chain of voxel capsules with the line's turquoise segment pattern, white belly, coral fans, a finned frill, side fins, cheek fins and a tail fluke. Aquaflora III is the same serpent at a larger scale, with a longer tail and its water ribbons, so it reads as II grown up. Height matches the forms they replace (ratio checked in the tests). |
| **Emberix I–III** | The head is rebuilt as a fox's on the same neck and joint: a narrower cranium, a long tapering muzzle with a dark nose and a mouth line, an ice-blue mask from each eye down the muzzle, almond eyes, layered cheek ruffs, and tall pointed ears on their own joints. The brush tail curves up into its flame. The flame mane, palette and evolution silhouettes are kept. |
| **Gaiaroki line** | A heavy stone brow with moss eyebrows, a wide mouth, nostrils, tan inner ears, and fingers on the open hand. The boulder fist is kept. |
| **Pyrokai line** | A dark brow on the white face, small blue-flame brows, a grin, nostrils, and white hands. |
| **Pyro-Cell line** | The single-block eyes were lost among the glowing cracks. A cooled-rock face plate now frames two larger glowing eyes under a heavy brow, with a molten grin. |
| **Lumifern I–III** | Two clearly readable eyes on every form. Each is a crisp glossy eye plate with a dark rim, a deep-to-light green iris, a pupil and two highlights; the old dark-on-green eyes merged into one shape on the first form. The bud between the first form's eyes is cleared. Tiny five-petal flowers sit over the head and back (more on later forms), plus organic crease-and-edge shading. Shape, horns, leaves and crown are unchanged. |
| **Meta I–III** | Rebuilt on a finer block grid (×1.55 High, ×1.25 phones; Battery Saver keeps the 15A copy). Additions: a calm face with wide almond eyes of light and a soft lid line, a serene mouth and a framed face plate; fine armour seams over the pale shell (deliberately smooth and fine, unlike Atem's heavy angular plates); joint rings at shoulders and wrists; a larger gold-framed chest gem; two finer wires of light beside every hair lock, carried in the lock's own joints so they sway with it; more data cubes; and a fuller ring. |
| **Igniflare, Zeep** | Audited. Igniflare's face and anatomy read well at battle scale, so no model change. Zeep keeps its 15B face. Both got signature specials instead (see below). |

## Signature specials (presentation only)

These play on the line's existing special clip. Each impact is driven by the rule engine's hit, so it can't land early
or late, and nothing lingers if the battle ends.

- **Lumifern III, Solar Flare:** petals spiral up around Lumifern in warm light, then flow to the foe in a ribbon. The hit blooms outward, and petals drift down. The battle waits 0.18 s longer.
- **Igniflare III, Inferno:** two wingbeat gusts, then embers gather into a fireball at the mouth and launch. The hit sends up a fire column and a ring of flame, followed by smoke. 0.14 s longer.
- **Zeep III, Overclock:** a cyan charging ring spins up, then a locked-on beam fires. The hit makes a hex burst and a shockwave. 0.16 s longer.
- **Atem III, Overclock:** retuned. The six stages and nine swords are kept, but the extra wait drops from 0.56 s to 0.33 s (the last strike now lands 0.80 s after the move starts instead of 1.04 s). The strikes are 30 ms apart instead of 25 ms, and each has its own pitch in a rising run, so all nine can be told apart. The final strike is heavy but not louder than before, and the stance clip is 1.3 s instead of 1.6 s.

Other species that share these moves (for example Emberix III's and Pyro-Phoenix's Inferno) keep their 15C flourishes
and wait nothing extra.

## Defensive poses (guard)

The guard clip keeps its 0.7 s length and the guard rules. Each body type now braces its own way, and every pose is back
at rest by the end of the clip:

- **Serpents** coil back, draw the head in and open the mouth in warning.
- **Flyers** fold their wings forward as a shield.
- **Bats** wrap their wings and tuck the head.
- **The fox** crouches low with its ears flat and its tail swept round.
- **Monkeys** cross their arms in front of the face.
- **Zeep** retracts its head into its shell and clamps down.
- **Heavy forms** brace low and draw the head back (Cannonis into its shell).
- **Antlered quadrupeds** lower the head, antlers forward.
- **Voltar** flings its arms up over its face with a sly glance.

## Status indicators

Persistent status chips were already in the battle HUD. They show each active status with its turns, plus attack-down
and guard, and are rebuilt from the battle's status state on every render, in 3D and in the 2D fallback. I did not add a
second set. With the switch on, a chip pulses once as it appears, so a new status is noticed the moment it lands. There
is no pulse with Reduce Motion. The tests check that the chips match the rule engine's state exactly, show in the 2D
fallback, sit on screen at 844×390, and don't overlap the health bar.

## Haptics: investigated and deferred

The game runs as a web app in Safari. iOS Safari does not implement the Web Vibration API (`navigator.vibrate`), and
there is no other supported web haptics API. The only ways to get haptics are workarounds, such as toggling a hidden
switch-style checkbox, which the brief rules out. So haptics are not implemented. They would become possible with a
native wrapper (for example a Capacitor or WKWebView shell using the native haptics API).
