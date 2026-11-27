# Phase 20A: Celestial Crown design, story conclusion and endgame planning

**Design only.** Branch `p20a-celestial-design`, from `p19d-obsidian-polish` (`37fa020`). No game code changes:
- production `main` is untouched;
- the Phase 16A opening stays off by default;
- the Celestial Crown stays closed (`D.ISLAND_LIVE.celestial = false`).

Everything below is a proposal: nothing here is new canon until you approve it.

New files, none loaded by the game:
- `tools/p20a-design.js`: the proposed campaign as data, for the simulator only.
- `tools/p20a-sim.js`: the progression study. Results are in `docs/audit20a/sim.json` and `sim-tuned.json`.
- `tools/p20a-map.js` and `tools/p20a-mapimg.py`: the site check and the labelled map, `docs/audit20a/map.png`.
- `tools/p20a-hatchery-diag.js` and `tools/p20a-env12-trace.js`: the Hatchery investigation (evidence in `docs/audit20a/hatchery-*.txt`; the proposed test patch in `env12-proposed.patch`, not applied).

Simulations are rule-level runs with scripted policies. They are not real gameplay, and no iPhone was used.

---

## 1. Celestial Crown source audit (what exists today)

| Area | What the code has | Where |
|---|---|---|
| Island record | “Celestial Crown”, tier 3, element **Resonance**, short name “Crown”, obstacle multiplier 24.<br>Blurb: *“A high island above the clouds: luminous gardens, drifting stone fragments and an observatory older than the Entity.”* | `src/world-data.js` |
| Map | **34 × 34** (the other islands are 30–32).<br>Cells: 763 land, of which **566 buildable grass**; 57 path, 124 sand, 14 pond water, 16 landmark.<br>Paths: a north–south spine, a west branch, an east branch and a south path to the landing.<br>Pond at x 7–10, y 21–24. Landmark block at x 15–18, y 15–18. | `src/world-maps.js` |
| Obstacles | **62**, ids `ce-1` … `ce-62`:<br>• 8 Drifting Stone (2×2)<br>• 14 Star Shard<br>• 14 Moonbloom<br>• 10 Fallen Pillar<br>• 10 Cloud Puff<br>• 6 Sky Geode (2×2) | `src/world-maps.js`, `src/world-data.js` |
| Landmark | The 4×4 block is drawn as the **observatory** in 2D (`L.observatory`). No other places, no dungeon entrances. | `src/island-art.js` |
| 2D rendering | Complete:<br>• its own palette (periwinkle grass, lavender sand, gold paths);<br>• a gold band on the cliffs;<br>• no cloud puffs around it, its own sky;<br>• a map icon. | `src/island-art.js`, `src/ui-world.js`, `src/style.css` |
| 3D rendering | **Not built.**<br>• The voxel island draws only Starter, Verdant and Obsidian (`V.ISLANDS`).<br>• The 3D library has a *specification* (“Celestial Spire”, status “specification + vignette demo”): palette, moon-stone towers, monolith ring, orb pedestal, crystals.<br>• There are **no 3D models for any of the six obstacle types** and none for the observatory. | `src/vox-island.js`, `src/3d/library/biomes.js` |
| Save ids | `st.islands.celestial` (unlock record, obstacle records `ce-*`); buildings carry `island: 'celestial'`. A new save has no Celestial record. | `src/state.js`, `src/world.js` |
| Unlock | Opened by the **Forge Heart** (`CAMPAIGN.celestial.unlockedBy = 'obsidian'`), no gold price (islands stopped being sold in 18C).<br>**Blocked while not live:** `ISLAND_LIVE.celestial = false` makes `unlockByBoss` and travel refuse it. | `src/campaign-data.js`, `src/verdant18b.js` |
| Older saves | Early builds sold Celestial for 400,000 gold. A save that bought it keeps its unlock, obstacle records and buildings (tested in 20A).<br>A save standing there is moved to the last live island on load. | `src/verdant18b.js` (`V.settle`) |
| Arrival and story text | Greeting: *“The Celestial Crown. Above the clouds, where the old observatory still watches. It was watching before I was. Let that sink in.”*<br>Travel lines end *“This is the furthest island I can show you. For now. The sky has always had more to say.”*<br>The Forge Heart scene *Three Clocks* ends: *“high above the clouds, on an island you have not seen yet, something old turns slowly to watch.”* | `src/story.js`, `src/scenes.js` |
| Quests | `s_crown` “Above the Clouds” (after `s_reach`: unlock and visit; 20,000 gold, 25 gems). Hidden while the island is not live. | `src/world-data.js` |
| Dungeons | None: `CAMPAIGN.celestial = { dungeons: [], islandBoss: null, next: null, hint: 'High up. Higher than an island has any right to be.' }` | `src/campaign-data.js` |
| Assets | No Celestial backdrops, arenas, scenes or Explore areas.<br>Resonance essence exists (ruins cellar; battles against the Aimza line).<br>Three PvP raid rivals already use Celestial islands and the thumbnail (Selene Arch / Starfall Terrace, Pell Wintergold / Moonlit Spire, Nyx Halloran / Opal Halo). | `src/campaign-data.js`, `src/ui-pve.js` |

**Discrepancies**
1. The 3D specification calls the island **“Celestial Spire”**; the game calls it **Celestial Crown**. The “Spire” name also clashes with the **Dormant Spire** in the story. Recommendation: keep “Celestial Crown” and rename the spec when 3D work starts.
2. 18A and 19A recommended the **Resonance habitat with the Celestial Crown**, but no habitat or unlock exists yet (expected).
3. 19A expected the Forge Habitat to be unlocked by the Deep Seams story. It ships unlocked by the Forest Crown (`req.islandBoss: 'verdant'`). Not a bug, but the habitat proposal below follows the shipped pattern.
4. The map is 34×34 and the island tier is 3, while older docs assume 32×32 islands. Nothing depends on this.
5. **Celestial obstacles have no 3D models.** Opened today, they would block cells but be invisible in 3D. Construction must add them before the island goes live (or keep Celestial 2D-only, not recommended).

Preserved by every proposal below:
- the map, all 62 obstacle ids and cells;
- every buildable cell;
- older saves' Celestial records and buildings.

All proposed places stand on path, sand or the existing landmark (`tools/p20a-map.js` checks this).

---

## 2. Three island concepts

| | A. The Silent Observatory | B. The Drifting Sanctuary | C. The Divided Crown |
|---|---|---|---|
| Visual identity | A high garden-island around the ancient observatory:<br>• moon-stone terraces;<br>• brass orreries and lenses;<br>• star-shard gardens;<br>• a cloud sea far below;<br>• perpetual dusk | Ruins broken into floating fragments joined by light-bridges; the island hangs in open sky | One half in day, one half in night, meeting at a central door; Light and Shadow made literal in the landscape |
| Terrain palette | The existing palette: periwinkle grass, lavender sand, gold paths. Accents: moon-stone white, brass, star-gold; violet and cyan glow | Pale stone and sky-blue; strong rim light; lots of transparency | Gold-white and violet-black halves with a hard seam |
| Central hub | The Silent Observatory (the existing landmark) and **Lenshold**, a small square of steps below it | A central floating keep | The Door at the seam |
| Landmarks | Cloudstair Landing, Starfall Terrace, the Orrery Wheel, Cloud Sea Cistern, Lens Gallery, Hall of Two Doors, Chart Room, Bell Loft, Shadowed Dome, the Threshold | Fragments named for what broke off | Day Court, Night Court, the Seam |
| Dungeon environments | Ten distinct interiors that share one architecture (section 5) | Repeated fragment interiors | Day/night pairs (repetitive) |
| Exploration | Cloud Shelf, Moonbloom Beds, Star Shard Field (section 5) | Fragment hopping | Two halves |
| Environmental storytelling | The observatory recorded everything: charts, ledgers of hours, a cracked bell, a dome with one outline scraped out. Evidence, not exposition | Weaker: ruins say “something broke” and little more | Very strong, but **over-explains** the Light/Shadow history and risks canon |
| Technical complexity | **Low–medium**: the existing map unchanged; places on non-buildable cells; new 3D models for 6 obstacles and about 12 places, in the 19B style | **High**: needs void gaps in the map, which **moves or removes obstacles and buildable cells (unsafe for saves)**, plus floating geometry | Medium: map unchanged, but a split lighting model (two light rigs, or vertex-colour fakery) |
| Estimated mobile cost | Close to Obsidian (merged meshes; about 60–70 draw calls, about 110–120k triangles on High), by the 19B/19D method | Highest: transparency, overdraw, many separate fragments | Medium: two lighting moods cost a second set of materials |
| Save compatibility | **Full**: map, obstacles and buildable cells untouched | **Breaks** older saves that own Celestial (buildings on removed cells) | Full |

**Recommendation: A, the Silent Observatory**, with one idea taken from C: the **Hall of Two Doors**, a single dungeon where the two Keepers' rooms sit side by side. A keeps the map and saves exactly as they are, costs about what Obsidian costs, and gives the story a natural place for “records”. The observatory “watched” everything, which fits the established clue trail (evidence, never exposition). B is rejected because it needs unsafe map changes. C is visually striking, but says too much, too literally.

**Visual direction for A**
- Palette: moon-stone `#e8e4fb`, periwinkle grass `#9cb0ee`, lavender sand `#d6d0f2`, path gold `#f0dfae`. Accents: brass `#c8a050`, star-gold `#ffd86b`, Resonance violet `#8a6ad8`, lens cyan `#9fd8e8`.
- Materials: smooth moon-stone with gold bands (the island's cliff band already exists); brass machinery; cut-glass lenses.
- Light: dusk, low sun, a cool sky, slow star motes, and a cloud sea below (not around the island, as today).
- Animation, cheap: one turning orrery, a lens glint, slow motes. Everything stops under Reduce Motion and hidden pages, as on Obsidian.

The labelled map is `docs/audit20a/map.png` (also on the review page).

---

## 3. Labelled island map

- Ten dungeon entrances:
  - **1** Cloudstair Landing (14,30)
  - **2** Starfall Terrace (14,26)
  - **3** Orrery Wheel (5,17)
  - **4** Cloud Sea Cistern (4,23, sand)
  - **5** Lens Gallery (5,14)
  - **6** Hall of Two Doors (17,10)
  - **7** Chart Room (20,5)
  - **8** Bell Loft (28,12)
  - **9** Shadowed Dome (28,16)
  - **10** the Threshold, inside the existing observatory landmark
- Places:
  - the Silent Observatory (hub, the existing 4×4 landmark);
  - Lenshold steps (17,19–20, path);
  - the landing jetty (14–15,32, sand);
  - the cloud pond (existing water).
- Route: up from the landing (1–2), the west side (3–5), north (6–7), east (8–9), then down beneath the observatory (10).
- All eleven positions were checked against the real data. Each is land, not buildable, and has no obstacle on it.

---

## 4. Three possible story conclusions

Established and preserved:
- **The Entity:** dry and dismissive; calls the creatures **Kind Souls**; never explains the Emergence, the starter island's origin or the presence beyond the world. Per your direction, his indifference should read as **grief** by the final island.
- **The player:** an outsider.
- **The starters:** the Light and Shadow starters were friends.
- **The clues so far:**
  - the Keepers of the Crossing (Ivy Archive);
  - the Dormant Spire keeping time with the Choir;
  - the third note (Choir of Roots);
  - the smashed panel and two remembered versions (Twin Shrine);
  - the mould showing both Keepers holding the door from the same side, with a third shape chiselled out (Mirror Gallery);
  - “one door, two keys … Third key: refused” (Great Bellows ledger);
  - the repair order “requested by both keys” and the three clocks (Forge Heart).

| | **A. The Keepers' door** (definitive Keepers ending, wider mystery open) | **B. The one who was refused** (partial revelation of the third force) | **C. What Resonance is** (major revelation) |
|---|---|---|---|
| Resolved | **Resolved:**<br>• The door was the Crossing.<br>• The Keepers held it together.<br>• The old event was the door cracking when someone forced it, not one Keeper betraying the other.<br>• The two peoples' versions are both partly true. Each saw only its own side of the door.<br>• The repair is finished, by the player, with both starter lines present. | Everything in A, plus:<br>• the third key was for an outside party;<br>• that party forced the door and failed;<br>• the hum in the crystals and the Choir is its presence pressing at the door. | Resonance is the sound of the door itself: the seam the islands are tuned around.<br>The three clocks (Spire, Choir, Forge) and the observatory keep the islands in time, so the world does not drift apart. |
| Still open | **Open:**<br>• who wanted the third key;<br>• what lies beyond the door;<br>• the Emergence;<br>• where the starter island came from;<br>• what the Entity is. | **Open:**<br>• who or what the party is (never named or described);<br>• why it wanted in;<br>• the Entity's history. | **Open:**<br>• the third party;<br>• the Entity's origin;<br>• whether the islands can ever be whole again. |
| The Entity | He brings the player to the door and will not touch it.<br>At the empty lens mount in the observatory he says only “I left that here. I meant to come back.” This is the grief beat, with no origin stated. | As A, and he refuses to look at the chiselled outline, which is fully visible at last. One line: “It asked me too.” | He explains nothing. The player hears the three clocks stop together for one beat. He sits down for the first time in the game. |
| The starters | The player's starter and the other starter line (the Twin Shrine gift, where owned) stand at the door together, as on the mould.<br>Friendship restored in image, not words. | As A; the two remember they were afraid of the same thing. | As A; the door hums in both their notes, and in a third that stops. |
| The player | The outsider is the only one who could hold both keys' places: belonging to neither side. | The same, and the refused party noticed it. | The player can hear all three notes, which is why an outsider was needed. |
| Final confrontation | The Threshold: the door's defence, wearing the Keepers' shapes (Boss candidate 1) or as the door itself (candidate 2). | The door, tuned by the third note (candidate 2). | The Watcher keeping the three clocks (candidate 3). |
| After the campaign | Clean ending.<br>Mastery and advanced challenges as “keeping the islands in time”.<br>A future island can open “beyond the door”. | Sets up a future antagonist, so content must eventually pay it off. | Changes what Resonance means for every element and system; heavy canon; hard to undo. |

**Recommendation: A.** It answers the questions the player has been collecting: the door, the keys, why both sides blame each other, and the repair. It keeps the big mysteries (the third party, the Emergence, the Entity's past) for later, and delivers the Entity's grief as a single, small beat. Keep B's line *“It asked me too.”* in reserve; it can be added later without contradicting A. C is a strong idea for a much later chapter, but it fixes too much canon now.

Nothing above is canon until approved. In particular, B's “outside party” and C's account of Resonance must not be written into scenes without your decision.

---

## 5. Ten-dungeon campaign (proposed)

**Shape.** The same structure as Obsidian:
- nine battles plus a guardian;
- foes at rec−3 … rec;
- the guardian at rec+3;
- four sections with rewards;
- battle 9 rehearses the guardian's charged move;
- third forms of existing species only;
- **no legendary foes** (no Meta or Atem lines);
- every charged move uses an existing effect;
- every mechanic is one of the four that exist after 19D (barrier, prism, echo, steam).

**Levels: recommended 48–57, guardians 51–60** (section 7). Foe tier ×1.3 HP / ×1.18 attack (Obsidian's), with tuning for Starfall and the Cloud Sea.

| # | Dungeon | Rec | Theme | Foes | Guardian | Charged move | Tactical counter | Story beat | Unlocks | First clear | Challenges |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Cloudstair Landing | 48 | Steps cut into the cloud cliff; light-bridges | Stormbringer, Lumi III, Pyrophoenix, Ignivor | The Stair Warden (Stormbringer 51) | **Updraft** (wind, lowers attack) | Guard; a heal clears it; Fire or Earth hit it hard | Steps in two sizes again; the Entity: “It used to be louder up here.” | Explore: Cloud Shelf | 2,550 g, 480 f, 12 gems, Dawn Charm | Flawless, One element, Answer the Guardian |
| 2 | Starfall Terrace | 49 | Gardens where star shards fell and rooted | Lumi III, Terraflora III, Aurelith, Calyxar | The Shard Gardener (Aurelith 52) | **Starfall** (light, burns) | Guard; heal clears burn; Dark hits Light ×1.5 | Star charts mark four points: the Spire, the Choir, the Forge, and here | — | 2,750 g, 500 f, 12 gems, Moonstone | as 1 |
| 3 | The Orrery Wheel | 50 | A brass orrery under glass, one arm bent | Zeep III, Pyrocore, Rockraki | The Orrery Keeper (Zeep III 53; prism Metal ↔ Earth) | **Orrery Turn** (metal) | Watch the shift: Fire and Water answer Metal, Nature and Water answer Earth | The bent arm points at the Dormant Spire | — | 3,000 g, 530 f, 12 gems, Ironbound Club | as 1 |
| 4 | Cloud Sea Cistern | 51 | Cisterns catching cloud; mist in waves | Aquaflora III, Oceanfang, Shellfin, Stormbringer | The Mist Serpent (Oceanfang 54; **steam** every 3 turns) | **Cloudburst** (water, chills) | Guard; heal; a charging guardian is braced against steam | Water from three islands runs into the same cistern | Explore: Moonbloom Beds | 3,200 g, 550 f, 14 gems, Reef Plate | as 1 |
| 5 | The Lens Gallery | 52 | Great lenses focusing and bouncing light | Lumi III, Zeep III, Pyrophoenix, Aurelith | The Focal Lantern (Lumi III 55; **echo**) | **Focal Ray** (light); unguarded, it comes back as **Refraction** | Guard the first ray and the lenses stay quiet; Metal resists Light | **The empty lens mount** (the Entity's grief beat; section 4A) | — | 3,450 g, 580 f, 14 gems, Basalt Mail | as 1 |
| 6 | Hall of Two Doors | 53 | The Keepers' rooms side by side, one shared table | Aurelith, Eclipsar, Lumi III, Voltar III | The Dusk Steward (Eclipsar 56; prism Dark ↔ Light every 2 turns) | **Twin Dusk** (dark) | Light and Dark beat each other ×1.5, so switch with the shift | Two cups on the table, both left half-full | — | 3,900 g, 620 f, 16 gems, Inferno Fang | as 1 |
| 7 | The Chart Room | 54 | Star charts and ledgers of hours | Zeep III, Aimza III, Voltar III, Lumi III | The Hour Clerk (Zeep III 57; barrier at half health) | **Hour Seal** (metal, silences) | Specials crack the barrier; guard the seal; heal clears silence | A visitors' ledger: two keys signed in; a third line torn out | Explore: Star Shard Field | 4,250 g, 660 f, 16 gems, Worldsplitter | as 1 |
| 8 | The Bell Loft | 55 | The cracked great bell over the dome | Aimza III, Stormbringer, Lumi III, Voltar III | The Cracked Bell (Aimza III 58; **echo**) | **Bell Toll** (resonance, never resisted); unguarded, **After-ring** | Guard; Resonance has no weakness, so tactics matter | The bell is the “great sound” from the Magenta Hollows; **Resonance habitat unlocks** | Resonance habitat | 4,600 g, 690 f, 16 gems, the Resonance habitat unlock (no item) | as 1 |
| 9 | The Shadowed Dome | 56 | The night side: stars scraped off, one outline left | Voltar III, Eclipsar, Aimza III, Pyrophoenix | The Night Curator (Voltar III 59) | **Umbral Hush** (dark, lowers attack) | Guard; heal; Light hits Dark ×1.5 | The outline matches the chiselled shape in the mould. Nobody says so | — | 5,050 g, 750 f, 18 gems, Feather Token | as 1 |
| 10 | The Threshold | 57 | Beneath the observatory: the door, cracked, still standing | Aimza III, Aurelith, Eclipsar, Voltar III, Lumi III | **Island Boss** (section 6; simulated as Aimza III 60, barrier ×2, ×2 health) | **The Closing Door** (resonance, never resisted) | Guard it; break its barriers with specials; answer every charge | The repair is finished (section 4) | Campaign complete | 8,000 g, 1,150 f, 50 gems, the Island Boss item (decision) | as 1 + advanced tier (section 10) |

- **Rewards:** Obsidian's plus about 15%:
  - first clears: 40,750 gold, 6,510 food and 180 gems in total (Obsidian: 35,500 / 5,660 / 157);
  - gems on first clears only;
  - section rewards: 300–410 gold each;
  - repeat clears: 580–860 gold.
- **Items:** existing ones that no dungeon gives yet. The final reward is your decision; see section 6.
- **Explore areas** (same rules as 18D/19C: 20% a day, certain on day 8, once ever, never above the dungeon ahead):
  - **Cloud Shelf:** Zephyr, Lumi, Pyrospark. Rare: Stormbringer.
  - **Moonbloom Beds:** Aquaflora, Terraflora, Acinus. Rare: Calyxar.
  - **Star Shard Field:** Aimza, Zeep, Voltar. Rare: Voltar III.
- **Quests:**
  - main chain `m_c1`–`m_c10`;
  - side quests: build a Resonance habitat, upgrade it, clear 10 Celestial obstacles, befriend every Aimza form (“Third Note”), own all 57 non-legendary species (“Starchart”);
  - `s_crown` appears once the island is live.

---

## 6. Final Island Boss: three candidates

| | 1. **The Two Keys** | 2. **The Unanswered Door** | 3. **The Watcher** |
|---|---|---|---|
| Lore | The door's defence takes the shapes it remembers best: the two Keepers | The door itself, animated by the hum pressing on it | The observatory's custodian, which has kept the three clocks for an age |
| Species | **Aurelith, then Eclipsar** (two foes, one battle); order follows the player's starter | **Aimza III** at boss scale (resonance) | **Zeep III** (or Meta/Atem, which are legendary and need separate approval) |
| Look | Two silhouettes in light and shadow; the second steps in as the first fades | The Aimza heads open one at a time; the door glows behind it | A great brass figure among turning rings |
| Mechanics | • Two stages as **two sequential foes** (the engine already supports this; PvP uses it, and 3D swaps the model).<br>• Each has a barrier.<br>• The second enters charging **The Closing Door**. | • Three stages by **health thresholds** (66% and 33%).<br>• Stage 1 tuned Light, stage 2 Dark, stage 3 Resonance (never resisted).<br>• A barrier at each threshold.<br>• **The Closing Door** in stage 3. | • **Three clocks**: it cycles three charged moves, each answered best by a different counter:<br>  – Spire (light): guard;<br>  – Choir (resonance): stun or stagger;<br>  – Forge (earth): soak / hold. |
| Narrative weight | Very high for ending A: the Keepers, together again | Highest for ending B | Highest for ending C |
| Tactical difficulty | Medium–high; health spread over two bars | High; three phases | High; demands three different answers |
| Arena | The Threshold: the door at the back, light on one side, shadow on the other | The door fills the background, with cracks that glow per stage | The observatory floor, rings turning overhead |
| Victory | Both shapes bow to each other; the door's crack closes; the repair order is finished | The hum stops; the door is quiet | The three clocks stop together for one beat, then go on |
| Final reward (decision) | A new **mythic** item tied to the door (“Crossing Key”, all stats ×0.06), or the Watcher's Lens. **Note:** the Lens is already the Survival mode's wave-20 prize, so a second copy becomes 400 gold | Same | Same |
| After the campaign | Repeatable as a featured advanced boss | Repeatable | Repeatable; it suits the advanced challenge “answer every counter” |
| Engine work | Small: dungeon battles accept a list of foes (`R.createBattle` builds one enemy today); rewards and challenges read the last foe | Small–medium: a `stages` mechanic on the existing health-threshold hook (as barrier) that switches element and move | Medium: a three-move rotation (as prism rotates elements); per-move counter logic exists |

**Can the engine do multiple stages without big changes? Yes.**
- `B.create` takes several foes and brings the next one in when one falls (event `foeIn`).
- The battle screen swaps the 3D model (`stg.swap`).
- Health-threshold hooks already drive barriers.

Candidate 1 needs only dungeon battles that pass a foe list. Candidate 2 needs one new mechanic on an existing hook. Neither needs a new combat system. Not implemented.

**Recommendation: candidate 1, The Two Keys** (with ending A). It is the most distinct from the Forest Crown and Forge Heart (one large foe each), the cheapest to build, and the best story payoff. The final battle simulated in section 7 is a stand-in (Aimza III, two barriers, ×2 health). The chosen boss will be tuned in construction.

---

## 7. Level progression

**Arrivals.** Realistic saves were built by playing Starter Island, the Verdant Wilds and Obsidian Reach for real, with the 17C agent and the real staged cap (40 → 50 → 60, never raised beyond 60).

| Profile | Arrives at the Crown (level) | Hours before |
|---|---|---|
| Rarely fed | **44.1** | 2.4 |
| Fed regularly (tactical) | **50.7** | 1.9 |
| Highly upgraded | **51.0** | 2.0 |
| Thorough completionist (two replays of every Verdant and Obsidian dungeon) | **57.7** | 4.2 |
| Fed regularly, basic attacks only | 50.7 | 1.9 |

**Bands and tiers tested:**
- Recommended levels 48–57, 49–58 and 50–60.
- Foe tier ×1.3/×1.18, ×1.4/×1.24 and ×1.5/×1.28.
- Five profiles, plus controlled arrivals at 47, 50, 55 and 60. Full output: `docs/audit20a/sim.json`.

Findings:
- **Stronger tiers make the Island Boss a wall for basic-attack players.** The agent gave up after 300 losses at the Threshold in **six of nine** combinations: every ×1.5 option, ×1.4 at 49–58 and 50–60, and 50–60 even at ×1.3. Rarely-fed players lose 17–40 times under those options.
- **Recommended 48–57 at Obsidian's tier (×1.3/×1.18)** is the best fit:
  - rarely-fed players lose 8.5 times with 2.5 grinds;
  - basic-attack players clear everything (19 losses);
  - everyone else loses nothing.
- Two spikes remain: **Starfall Terrace** and the **Cloud Sea Cistern**, whose thresholds sat at their recommended level. Tuning them, as 19D tuned the Quench Pools, gives the final numbers:
  - Starfall: battles ×0.92, guardian ×0.9 HP / ×0.88 attack;
  - Cloud Sea: battles ×0.9 / ×0.92, guardian ×0.92 / ×0.88.

**Recommended: rec 48–57, guardians 51–60, foe tier ×1.3/×1.18, two tuned dungeons** (six seeds; `docs/audit20a/sim-tuned.json`):

| Dungeon | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Recommended | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 |
| First-try threshold (tactical) | 44 | 47 | 46 | 49 | 50 | 52 | 52 | 53 | 55 | 56 |

| Profile | Losses | Grinds | Island time (min) | Ends at | Reaches 60 |
|---|---|---|---|---|---|
| Rarely fed | 8.3 | 1.8 | 132 | 56.6 | not on the island |
| Fed regularly | 0 | 0 | 92 | 60 | at the end |
| Completionist | 0 | 0 | 73 | 60 | from Dungeon 6 |
| Highly upgraded | 0 | 0 | 72 | 60 | at the end |
| Basic attacks only | 18.2 | 7.3 | 191 | 60 | at Dungeon 10 (most seeds) |
| Arrive at 47 / 50 / 55 / 60 | 0 / 0 / 0 / 0 | 0 | 96 / 93 / 89 / 87 | 60 | — |

- **No compulsory grinding.** The rarely-fed profile replays an earlier dungeon 1.8 times over the island after two losses in a row. That replay is the agent's habit, not a requirement; on Obsidian (19D, 20 seeds) the same profile replayed 0.8 times.
- **The cap is untouched at 60.** Regularly fed players reach it only at the end, so level 60 arrives with the finale.
- **Overlevelled players (55–60) find the island easy.** That is expected without dynamic scaling (which you ruled out). The advanced challenge tier (section 10) is the answer for them.
- **Basic-attack players clear everything,** with 18 losses against 14.9 on Obsidian in 19D. The final boss is their hardest fight (about 6 losses), as it should be.

---

## 8. Resonance habitat

| Item | Proposal |
|---|---|
| Name and look | **Starwell Habitat**: a round moon-stone basin on a holo-pedestal, a slow ring of three floating star shards, a violet-cyan glow. Same 3×3 footprint and art family as the other habitats |
| Element and residents | **Resonance**. It houses any Amina, like every habitat. Resonance residents (the **Aimza line**: Aimza, Aimza II, Aimza III) earn 50% more |
| Unlock | After **the Bell Loft** (Dungeon 8), mirroring the Forge Habitat's island-boss gating: `req: { struct: 'hollow', dungeon: 'c_bellloft' }` (or `islandBoss: 'obsidian'` to allow it from arrival: decision) |
| Construction and upgrades | Five levels with the **same rates, capacity and storage as every habitat** (rate 4 → 18, capacity 2 → 4, storage 60 → 180 min). Costs scale like the Forge Habitat, one step higher: 3,000 / 6,500 / 12,000 / 20,000 / 36,000 gold; build times 5 min → 2 h |
| Production | Gold, like every habitat; or **Resonance essence** in the existing essence mode (10% of its gold rate). **No new resource** |
| Limit | **4** (as the Forge Habitat; base habitats allow 6) |
| Placement | Anywhere buildable on any unlocked island; no special terrain |
| Codex | Home for the Aimza line; a Codex milestone (“Third Note”: own every Aimza form) uses the 19D `befriend` objective |
| Saves | A new building type, `hab_resonance`. Older saves simply do not have one. No migration; save size is unchanged until one is built |
| Balance | Identical production numbers, so the economy is unchanged. Its only effect is a home for one line, and one more way to earn Resonance essence (now rare: ruins cellar, battles against Aimza) |

---

## 9. Resonance Mastery (resource-based, no stats)

**Why.** At level 60, battle XP is thrown away (since 18D, XP past the cap is not stored). In the simulation a level-60 Amina earns about:
- **about 450 XP** during the Celestial campaign (regularly fed), **7,300** for completionists;
- **10,000 XP per full replay** of the island (100 battles, about 90 minutes): two levels' worth at `xpNeed(60) = 4,816`.

| Element | Proposal |
|---|---|
| Unlock | After the **Celestial Crown's Island Boss** (see the comparison below). Until then, XP at the cap is dropped as today: no hidden banking, no retroactive jump |
| Earning | A level-60 Amina's battle XP past the cap fills its **Mastery bar**. Each full bar (**4,816 XP**, the cost of level 60) is one **Mastery rank**, up to **20 ranks** per Amina. Each rank also gives the save **10 Starlight**. Feeding is still refused at 60: food never converts |
| Stats | **None.** No rank changes health, attack, defence or speed. Boss tuning stays valid for every player. (19B showed +1% × 10 is worth about 7 levels at 60) |
| Per-Amina rewards (cosmetic) | • Rank 1: a star on its card.<br>• Rank 3: an **aura tint** (the existing pixel-aura with a Starlight hue; 19D added hues).<br>• Rank 5: an idle flourish (an existing animation).<br>• Rank 10: an **Ascendant card frame** (prismatic border).<br>• Rank 20: an **alternative palette**. Creature designs are protected, so each palette needs your approval per species; until approved, rank 20 gives a title instead |
| Starlight (account) | Spent only on cosmetics:<br>• island decorations (star-lamp, orrery, lens arch: decor buildings with no production);<br>• player avatar trims and titles;<br>• collection trophies.<br>**It never converts into gold, food, gems or essence**, so existing currencies keep their value |
| Collection milestones | 5 Aminas at rank 5; 10 at rank 10; one of every element at rank 5. Each gives a trophy decoration and a title |
| Pace | About 2 ranks per full island replay. Rank 5 on a favourite takes a few sessions; rank 20 is a long-term goal, never required |
| Save | Two integers per Amina (`mx` XP into the current rank, `mr` rank) and one per save (`starlight`); about 1.4 KB for 60 Aminas. Older saves start at 0 |

**Unlock: at level 60, or after the final campaign?**

| | At level 60 (from the Forge Heart onwards) | **After the Celestial Crown's Island Boss** (recommended) |
|---|---|---|
| Completionist players | Gain ~1.5 ranks per Amina during the Celestial campaign | Gain nothing until the end; XP at the cap is dropped (as today) |
| Campaign focus | Two progression bars during the final island | One: the story; Mastery is the reward for finishing |
| Story fit | Weak | Strong: the Entity hands over the mechanism (“keeping the islands in time”) |
| Balance risk | None (no stats) | None |
| Retroactive jumps | None (no banking before unlock) | None |

Recommended: **after the final campaign**. It gives the post-game loop a clear start and keeps the last island about the story. It costs completionists some XP they would otherwise have dropped anyway.

---

## 10. Advanced dungeon challenges (optional “Ascendant” tier)

- **Kept as they are:** Flawless, One element and Answer the Guardian, with the 18D rule and their rewards.
- **Unlock:** a dungeon's advanced tier opens after its three base challenges and after the Celestial Crown's Island Boss.
- **Enemies:** never scaled to the player.

| Challenge | Rule | Tests |
|---|---|---|
| **Pair** | Clear with two Aminas (restricted team size) | Planning, switching |
| **Unarmed** | No equipment worn | Limited equipment |
| **No Mending** | No healing moves and no snacks during the run | Restricted healing |
| **At the Line** | Eligible only if every party member is **at or below the recommended level + 2** when the run starts (eligibility, not scaling; lower-level Aminas or second teams qualify) | Recommended-level play |
| **Every Answer** | Answer the guardian's charged move three times in one run, each a different way (guard, soak/hold, stun/stagger or barrier break) | Multiple guardian counters |
| **Quiet Hands** | Basic move and guard only; no signature specials | Tactical move restrictions |

**Rewards and replay incentives**
- Each advanced challenge gives Starlight once per dungeon: 20–40, with 60 for Every Answer.
- **Five of six** in a dungeon gives a crest decoration for that dungeon.
- **All 40 dungeons** at five of six gives a title and a trophy.
- A **featured weekly trio**: three dungeons whose advanced challenges pay double Starlight that week, using the 17D daily-task pool.
- No gems or items from advanced challenges, so the currencies and item economy are unchanged.

---

## 11. Offline functionality: audit and plan

**Today**
- **No service worker.** The `sw.js` registration was removed in 19D; the file never existed.
- **Saves** are in `localStorage` (`src/state.js`). `main.js` asks for persistent storage.
- **Assets:** about 2.9 MB of scripts and styles (`src/`) and about 15 MB of assets (124 portraits, 177 voxel files, 9 GLB models).
- **three.js 0.170.0 loads from jsDelivr at run time:** the core module, GLTFLoader and BufferGeometryUtils, in five places.
- **Offline today:** with no network, `C3D` catches the failed import and the game falls back to 2D, if the browser's HTTP cache still has `src/`. **Nothing guarantees that.** There is no offline mode.

**Plan** (to implement in a later phase, then test on a real iPhone before claiming it works)
1. **Vendor three.js.** Copy the three modules into `src/vendor/three/` and point imports at them through an **import map**. This keeps the code changes to the import lines, and the whole game becomes same-origin.
2. **Build step: a precache manifest.** A small script lists every file under `src/` and `assets/` with a content hash and writes `sw-manifest.json` with a **build version**. No hand-kept lists, which is how `sw.js` went stale.
3. **Service worker `sw.js`,** generated from a template:
   - *install*: precache the shell (index, `src/`, vendored three.js: about 3.5 MB);
   - *runtime*: cache-first for hashed assets (portraits, models), cached on first use; optionally pre-warm the current island's assets;
   - *activate*: delete caches from older versions;
   - `index.html` and `sw-manifest.json` are **network-first with a 3-second timeout**, falling back to the cache.
4. **Updates that cannot strand players**
   - A new worker waits until the player chooses **“Update ready: restart”**, or until the next cold start.
   - The page compares its build version with the manifest on every launch.
   - **Kill switch:** if the server's manifest says `{ reset: true }`, or the worker fails to install twice, the page unregisters every worker and clears the caches, then reloads from the network.
   - Saves are never in the Cache API, so a cache reset cannot touch them.
5. **Saves**
   - Unchanged (`localStorage`), with the existing export/import as the backup.
   - The game already calls `navigator.storage.persist()`. WebKit grants it by heuristics, such as being opened as a Home Screen web app.
   - Show a gentle “Back up your save” prompt after long breaks.
6. **Storage**
   - About 18 MB in total is far inside Safari's quota: since Safari 17, an origin can use about 60% of the disk, and Home Screen web apps get the same quota as the browser.
   - Older iOS versions had a 1 GB starting quota, which is also ample.
7. **iPhone Safari and Home Screen**
   - Add a `manifest.webmanifest` with `display: standalone` and icons.
   - Safari's 7-day deletion of site data applies to Safari itself; Home Screen web apps have their own days-of-use counter. Older WebKit bug reports describe Home Screen data still being lost, so **test it on the device**, and keep export as the safety net.
8. **Single-player and online**
   - Offline support covers the single-player game: the islands, dungeons, Explore, Forge, Hatchery, and the scripted PvP and Island Defence against bots.
   - Any future **online** multiplayer (real opponents, leaderboards) must stay network-only and say so when offline.
   - The worker never caches API responses.
9. **Tests**
   - Playwright with `context.setOffline(true)`: cold start offline after one online visit; a version bump while offline then online; a stuck old build and the kill switch.
   - Then the iPhone checklist: Safari tab and Home Screen, airplane mode, an update after a week.

Until tested on a device, offline is **not implemented**.

---

## 12. Endgame roadmap

| Tier | Feature | Uses | New work |
|---|---|---|---|
| **Essential (with Celestial)** | Advanced challenge tier | Replay and challenge system (17D) | Rules + UI rows |
| Essential | Resonance Mastery + Starlight cosmetics | XP past the cap (today discarded) | Bar, cosmetics, decor |
| Essential | Repeatable Island Bosses (featured weekly, guardian-only replay already exists) | 17D guardian replays | A weekly pick |
| Essential | Codex completion: “Starchart” (all 57 non-legendary species) | 19D `befriend` objective | Data |
| Light | Breeding for third forms and rare Explore finds | Hatchery, Explore | None |
| Light | Equipment: merge to tier 4 using Celestial drops | Forge merge | Data |
| Light | Island development: Starlight decorations on all four islands | Decor buildings | Art |
| Light | Island Defence and Hide & Seek with Celestial rivals and arenas | Existing modes; three Celestial rivals already exist | Arenas |
| **Future expansions** | Beyond the door (a fifth area); the refused party; legendary encounters (Meta, Atem); alternative palettes per species; online PvP | — | Large; each needs approval |

---

## 13. Hatchery occlusion failure (investigation)

**What fails.** `browser-env12`, “a creature standing behind the Hatchery is covered by it”: intermittently. The 19D record was 2 of 15 runs on 19D and 1 of 15 on 19C.

**Finding: test timing combined with animation state. Not a rendering defect, not object ordering, not camera position.** In every failure the occlusion was correct for where the creature really was. The test was checking a point the creature had left, or had never been at. Three ways that happens:

| Cause | How | Seen |
|---|---|---|
| **1. The view was still zooming when the point was measured** | The test places the creature 1.2 s after asking the camera to zoom onto the Hatchery. On a slow (software) renderer the zoom has not finished: the creature measured about **half size** at placement (66–89 × 77–97 px) against **156 × 182** at the check. The camera data already said 1.4, so the screen was lagging the data | 4 of the 6 failures in 40 traced runs |
| **2. A walk queued before the freeze** | The test stops the island-life interval, but a walk step it already queued with `setTimeout` still fires: the creature walks 50–70 px away (class `walk`) | 2 of 6 |
| **3. The production tick re-renders objects** | Every 15 s, `UI.timers.prod` calls `UI.renderObjects()`, then `Life.apply()`. That re-applies the companion's old walking offset, undoing the freeze (shifts of 43–49 px) | All 3 failures in the first 30-attempt diagnostic; reproduced on demand |

**Evidence** (`docs/audit20a/hatchery-trace.txt`, `hatchery-diag.txt`):
- `tools/p20a-env12-trace.js`, a traced copy of the test's first check: **6 failures in 40 runs**, each with its cause recorded. In none was the creature's real position wrongly drawn.
- `tools/p20a-hatchery-diag.js` repeats the steps in one session:
  - redraws coincided with every failure in run 1;
  - an imposed offset reproduces the failure (6 of 8);
  - stopping the production tick removes the redraw shift.
- **First proposal not enough.** Stopping only the production tick: a patched copy still failed **2 of 20**. That is what led to causes 1 and 2.
- **Full correction (below): 0 failures in 30 runs** of a corrected copy. At the 10–15% rate seen without it, 30 clean runs by chance would be unlikely, about 1–4%. Strong evidence, but not proof.

**Proposed correction, for approval and not applied** (`docs/audit20a/env12-proposed.patch`, which applies cleanly).

The test only, before its first placement; the assertions, placement and occlusion wait are unchanged:
1. Stop the island-life and production timers **before** the zoom, so a walk already queued finishes during the wait.
2. Replace the fixed 1.2 s with a wait until the island view and the creature have **stopped moving on screen** (their boxes unchanged across three checks, about 0.4 s).

**No game change is needed.** In play, creatures are drawn where the game believes they are and occlusion follows them. The zoom lag and the queued walk only matter to a test that measures a point and then expects it to stay valid.

---

## 14. Technical risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Celestial obstacles invisible in 3D (no models) | Certain if opened as is | High | Six obstacle models and about 12 places in the 19B style before `ISLAND_LIVE` |
| 2 | Older saves that bought Celestial have buildings where places go | Low | High | Every place is on path, sand or the landmark (checked); test with a fully built island |
| 3 | Story over-explains or fixes canon (ending B/C) | Medium | High | Ending A; the third party unnamed; scene text reviewed before construction |
| 4 | The final boss's two-foe battle touches rewards, challenges and the 17B herald | Medium | Medium | Read the guardian as the last foe; tests on rewards once, Answer the Guardian, replays |
| 5 | Basic-attack wall at the final boss | Medium | Medium | Tier ×1.3/×1.18 (×1.4 and above created a wall); tune once the boss is chosen |
| 6 | Overlevelled players find the island easy | High | Low | Advanced tier; no dynamic scaling (as you require) |
| 7 | Mastery becomes compulsory grinding | Low | Medium | Cosmetic only; no stats; Starlight never converts to currencies |
| 8 | Offline worker strands players on an old build | Medium | High | Network-first index, version check, user-confirmed update, kill switch, device tests |
| 9 | three.js CDN dependency (offline, CDN outage) | Medium | Medium | Vendor three.js with an import map |
| 10 | iOS deletes data for a Safari-tab player | Medium | High | Home Screen install guidance, persistence request, export backups |
| 11 | Performance of a fourth 3D island | Medium | Medium | Merged meshes and one glow colour per place (19D method), measured against Obsidian |
| 12 | Celestial rivals in PvP already show the island's look; a redesign could clash | Low | Low | Keep their names and thumbnails, or refresh them with the new art |
| 13 | Hatchery test flake hides real failures | Medium | Low | Apply the test-only correction (section 13; 0 failures in 30 runs) |
| 14 | Simulations differ from people | Certain | Medium | Treat them as relative; hand-play on iPhone in construction |

---

## 15. Decisions for you

1. Concept A (Silent Observatory, plus the Hall of Two Doors from C), or another.
2. Story ending A (recommended), B or C, and whether to keep *“It asked me too.”* in reserve.
3. Final Island Boss: The Two Keys (recommended), The Unanswered Door or The Watcher; and the final item (new mythic “Crossing Key”, or the Watcher's Lens as a duplicate).
4. Level band 48–57 with foe tier ×1.3/×1.18 and the two tunings.
5. Starwell Habitat unlocked by the Bell Loft (recommended) or on arrival.
6. Mastery: no stats, 20 ranks, Starlight cosmetics, unlocked after the final campaign (recommended) or at level 60.
7. Which advanced challenges to build first (recommended: At the Line, Every Answer, No Mending).
8. Offline support as a separate phase after the island, starting with vendoring three.js.
9. Approve the Hatchery test correction (section 13; the patch file, test only).


Sources for the Safari storage facts: WebKit, “Updates to Storage Policy” (webkit.org/?p=14403); MDN, “Storage quotas and eviction criteria”.
