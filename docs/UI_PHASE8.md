# Aminas · Phase 8 — Three-Monster Visual & Audio Polish

**Branch:** `ui8-monsters`, created from `ui7-perf-fix`. That branch holds the approved Phase 7 work, the battle
performance test and the 30 fps fix. Production (`main`, `0fc9e36`) and every earlier branch are untouched.

**Scope (agreed):** Umbrit (stage 1), Cannonis (stage 1) and all three Aimza forms. Duskmantle, Eclipsar, Reefback,
Shellfin and every other monster are unchanged.

Review page: `docs/ui/phase8-review.html`. Its media is in `docs/ui/screens8/`: before/after screenshots, model
renders, animation videos and sound samples.

## 1. Models
* **Built in parts.** Each model is built in separately moving parts. The voxel engine (`src/voxel.js`) gained part
  tags, joints (`m.pivot`) and a hidden layer for eyelids. The 3D builder (`buildVoxel`) meshes each part on its own
  and hangs it on its joint.
* **Same model in 2D.** The model also draws the 2D portraits, cards and island critters, which ignore the parts.
  Portraits are re-baked with `tools/voxel-bake.js` (restored).

| Form | Reference | Moving parts | Voxels (before → after) | Triangles |
|---|---|---|---|---|
| Umbrit | original starter design | ears, eyelids, tail | 449 → ≈5,900 | ≈4,700 |
| Cannonis | its two cards | head, jaw, eyelids, cannon (+ muzzle point), four legs, tail | 3,771 → ≈15,300 | ≈12,400 |
| Aimza I | its card | head, jaw, eyelids, mouth point, wings, tail | 914 → ≈3,500 | ≈5,300 |
| Aimza II | its card | the above with two heads | 2,382 → ≈8,300 | ≈11,000 |
| Aimza III | its card | the above with three heads | 4,526 → ≈16,000 | ≈19,000 |

* **Umbrit:**
  * round velvet-indigo baby;
  * pointed ears, pale inside;
  * big eyes with highlights, blush and a smile;
  * pale belly and stubby feet;
  * a glowing crescent-moon crest;
  * a wisp tail fading into violet light;
  * in 3D, a shadow pool under it.
* **Cannonis:**
  * a shell of large stone and blue plates, with water light in some seams;
  * a banded living cannon with a glowing bore;
  * a blue head under a stone brow, with glowing eyes and a cream jaw;
  * stout plated legs with pale claws.
* **Aimza:**
  * I is a stocky white hatchling with big cyan eyes, swept-back horns, bat wings with a few glowing cells, a glowing
    chest core, and a glowing ring under it in 3D;
  * II and III are near-black with cyan circuitry, two or three heads on their own necks, larger wings whose
    membranes glow in pixel clusters, glowing seams and dorsal spikes.
* **Glow:**
  * emissive voxels that breathe with the creature;
  * they flare for specials and victories and dim on defeat;
  * plus the ground light. There is no bloom (see Limitations).
* **Budget:** part-built models may use up to 20,000 triangles, against 12,000 for the others. Measured below.

## 2. Animations (`src/3d/showcase.js`)
**Contract (unchanged):**
* Each form has its own clips, under the same names as before.
* Every clip except defeat ends exactly at rest.
* Attacks reach the foe at 0.34 s and specials at 0.40 s.
* Durations are unchanged, so battles take no longer.

**Additions:**
* **Blink:** an eyelid-only overlay loop that plays alongside everything else. Aimza's heads each blink at their own
  times.
* **Living details:** a glow pulse, the ground decoration, and eyelid meshes hidden while open. They stay still with
  Reduce Motion.
* **Details screen:** the viewer opens at a three-quarter angle, has a Special button and plays the creature's voice
  when tapped.

**Clips:**

| | Idle | Attack | Special | Damage | Victory / defeat |
|---|---|---|---|---|---|
| Umbrit | breathing, ears twitching, tail sway, a shy glance aside | coil, hop-bite, ears flat, eyes squint | rises and swells, ears up, then casts | flinch with eyes squeezed shut; the heavy hit knocks it back with a twist | two hops with a half-turn / deflates into its shadow, ears droop, eyes close |
| Cannonis | deep breaths, head looking about, cannon hum, a sniff | aims, leans in, barrel recoils | rears with a roar, slams down, fires | hunkers, head pulled into the shell | rears, roars and fires a salute skywards / legs fold, head down, cannon droops |
| Aimza | wings breathe; each head looks about on its own | main head draws back and strikes, jaw open | every head rears, wings flare, all strike together | heads snap back, wings pull in | wings beat, heads call one after another / heads lower one by one |

Also included: ready (turn start), heal, guard and move clips, in each form's own style.

## 3. Battle moves
* **Choreographed sequences.** Their moves have their own sequences, timed to the animation. Shots leave from the
  real cannon muzzle or each head's mouth. Effects are built from cubes and scaled down with Battery Saver and
  Reduce Motion.

  | Move | Sequence |
  |---|---|
  | Shade Nip | double shadow slash |
  | Gloom Veil | crest flare, shadow orb, a veil spiralling around the foe |
  | Bubble Pop | muzzle flash, a stream of bubbles |
  | Tidal Surge | stomp shockwave, a wall of water along the ground, a cannon jet |
  | Echo Wave | widening rings from the mouth; as Aimza's basic move it uses the attack animation and no ultimate camera |
  | Hum | rising rings of light |
  | Double / Triple Echo | beams from every mouth converging, then rings and a shockwave |

* **Critical moments:** super-effective and heavy hits keep the Phase 7 treatment (freeze-frame, camera punch,
  shockwave) and play the bespoke heavy-hit reactions.
* **Unchanged:** battle calculations, power, targeting and cooldowns. The playback only passes the ability id to the
  stage.

## 4. Sounds (`src/audio.js`)
* **Original:** synthesized in code, with no recordings and nothing licensed.
  * **Umbrit:** chirps, a purr, a hiss and a shadow whoosh.
  * **Cannonis:** rumbles, a cannon boom, bubbles, surf and stone clunks.
  * **Aimza:** digital chimes and echoes, with one voice per head (unison, then a fifth, then a triad).
* **Cues:** tap, idle, move, attack, special, impact, hurt, heal, guard, victory, defeat.
* **When they play:**
  * in battle on use, impact, hurt, defeat and victory, replacing the shared sound so two at most play together;
  * in the details screen when you open it, tap the creature or press a clip button.
* **Volume handling:**
  * their own bus, through a compressor;
  * at most 6 at once (3 for idle, tap and move sounds);
  * never the same cue twice within 120 ms;
  * silent when sound effects are off.

  Every rendered cue peaks at 0.3 or below, so nothing clips.

## 5. Gem icon (`src/pixel-art.js`, `src/ui-prism.css`)
* **Same silhouette** as before, which reads well at 16 px.
* **New colouring:** a pale crown with a sparkle, and rainbow facets (rose, violet, cyan, mint, gold) that deepen
  towards the point.
* **Glow:** a soft prismatic glow, and a brief top-bar glint every 7 s. The glint is off with Reduce Motion, Battery
  Saver and while the island rests.
* **Other currency icons:** unchanged.

## 6. Feeding no longer resets the details screen (`src/ui.js`, `src/ui-v07.js`)
* **The cause:** feeding rebuilt the whole screen. The 3D viewer could restart and the tapped button was replaced.
* **The fix:** `UI.morph()` updates the screen in place. Text and attributes change, while the elements, including a
  running 3D viewer, stay.
* **Kept after feeding:** the same screen, the same Amina, the same tab and the same scroll position. Level,
  experience and stats update immediately.
* **Selector card:** the creature selector card gets the same treatment when the same Amina is fed.
* **Testing:** the automated test feeds six times in a row and checks that every element is the same one each time.

## 6b. A Phase 7 bug fixed along the way (`src/ui2.js`)
On the 2D battle stage (used when 3D creatures are off or unavailable), a super-effective hit passed two class names
(`'hurt big'`) to `classList`. That throws, and the battle froze before its result. It was introduced in Phase 7.
The full suite found it because survival's random foe can be Cannonis and Light is super-effective on Dark. The
helper now applies the class names one by one. The new suite includes a regression check.

## 7. Performance
**Desktop software graphics** at 844×390 @2×, Balanced, Island Boss room. This is not an iPhone, so only the
before/after difference means anything. On the iPhone, a whole Phase 7 battle frame cost about 1–2 ms.

| Battle | Render cost per frame | Draw calls | Triangles | CPU per frame |
|---|---|---|---|---|
| Umbrit vs Cannonis | 98.1 → 116.7 ms (+19%) | 20 → 37 | 11.0k → 26.9k | 1.44 → 1.92 ms |
| Aimza III vs Cannonis | 111.3 → 132.4 ms (+19%) | 20 → 57 | 22.8k → 53.1k | 1.26 → 1.91 ms |
| Aimza vs Umbrit | 103.2 → 114.3 ms (+11%) | 20 → 39 | 10.0k → 20.1k | 1.12 → 1.70 ms |

* **Peak draw calls:** with attack effects and the active creature's outline, the heaviest pairing peaks at about 80
  (the test budget is 85).
* **Models build once** (Cannonis 93 ms, Aimza III 70 ms on desktop) and are then cached. The 2D sprites take
  6–19 ms each, also cached.
* **No new continuous work:** the effects run only during moves, the glow pulse is a colour change, and Reduce Motion
  and Battery Saver are respected throughout.

## 8. Tests
| Suite | Result |
|---|---|
| New `tests/browser-showcase8.test.js` | 38 checks |
| Full suite (20 suites, run alone) | **596 of 596 passed** |

## 9. Fixes after the first iPhone test
**Polished monsters could not be opened (`src/ui.js`).**
* **The cause:** the details screen assumed you still have the form you tapped. A form you befriended and then
  evolved has no Amina left, so opening it threw an error inside the tap and nothing opened. This is old (it dates
  from the baseline) and hits every evolved-away form, but on the test phone it hit exactly the polished ones: its
  Umbrit, Cannonis and Aimza had all evolved.
* **The fix:** such a form now opens with its 3D model, the clip buttons (with Special and sounds for the polished
  ones), About, Battle (base stats and moves) and Growth, plus a line saying what it grew into. There are no feed
  buttons because there is nothing to feed.
* **Developer panel → Phase 8 showcase** (Settings, tap the version line 7 times): View opens any of the five
  polished forms, owned or not. Battle starts a practice battle with one in the Island Boss room. Nothing is saved
  and nothing is earned.

**No sound on the iPhone (`src/audio.js`, `src/ui.js`).** The old sounds were unchanged by Phase 8, so this was
not new. Three things could silence everything:
* iOS treats Web Audio as "ambient" sound, which the side (Ring/Silent) switch mutes completely. While sound effects
  or music are on, the game now asks iOS for the "playback" audio session (the Audio Session API, iOS 16.4+), so it
  plays like a video does, even on silent. With both off, it hands the session back. Older iOS gets a one-off silent
  clip instead. WebKit applies the setting to the whole page, including the frame the preview runs in.
* After a call, Siri or another app's audio, iOS leaves the sound "interrupted". The old code only restarted
  "suspended" sound, so one interruption silenced the game until a reload. Any non-running state now restarts.
* Sound could only start from a button. It now starts, or restarts, from any tap, touch or key.
* **Sound check** (developer panel): plays a game chime and the three voices, and shows what the browser reports
  (audio running or not, the iOS audio session, the settings).

**The battle performance test now measures the polished monsters (`src/bench.js`).** Its main battle never puts a
polished monster on stage (Lumifern stays in, against the Heartwood Stag). A new stretch after the four settings
runs Aimza III, the heaviest form, against Cannonis on Auto: 5 s idle and 10 s of turns with their own moves. The
earlier phases are unchanged, so results stay comparable. On desktop it peaks at 58–71 draw calls and 54–66k
triangles, against 38 and 16k for the main battle.

**Tests:** new `tests/browser-p8fix.test.js` (36 checks) and 3 new checks in the battle test.

## Limitations
* **Close to the cards, not copies.** Fine painted details are simplified, and the sides and backs are interpreted.
* **No bloom.** The cards' glow halos would need a bloom effect, which would change every creature and arena.
* **Aimza's heads in 2D.** On the side-on 2D portraits the extra heads partly overlap; they read clearly in 3D.
* **More draw calls** in showcase battles, up to about 80 against 30. Merging each part's glow into one mesh would
  roughly halve it if the iPhone test shows a need.
* **Not tested on a real iPhone.**
* **Sound and other apps:** with the "playback" session, the game pauses music from other apps while its own sound
  or music is on. Turning both off in Settings gives the session back.
* **The silent switch and real interruptions** cannot happen in the test browser. The tests fake those browser APIs
  and check that the game asks for the right things. Sound check shows what the phone actually reports.

## Testing on your iPhone
1. Open the dev preview. In Creatures, open Umbrit, Cannonis and Aimza, even if they have evolved. For the forms
   you don't have, use Settings → tap the version line 7 times → Phase 8 showcase. Turn the creature, tap it, and
   try Attack, Ouch, Cheer and the new Special.
2. Feed it several times from its details screen. It should stay on the same tab and scroll position, with the
   level going up.
3. Battle with them (any dungeon), with sound on. Watch Shade Nip, Gloom Veil, Bubble Pop, Tidal Surge, Echo Wave
   and the Echo specials.
4. Look at the gem count on the top bar.
5. Settings → Run performance test → Battle test, to confirm battles still hold their frame rate. The last two
   rows are the Phase 8 monsters. Don't touch the screen while it runs: the move buttons stay live.
6. Sound: with the silent switch on and the volume up, tap anywhere, then use the developer panel's Sound check.
