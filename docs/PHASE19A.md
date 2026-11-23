# Phase 19A — Obsidian Reach: design and progression planning

Branch `p19a-obsidian-design`, from Phase 18D (`6547bcf`). Production `main` (`0fc9e36`) is untouched. **Design only:
no game code, data, save format, XP formula or level cap was changed** (`git diff 6547bcf -- src index.html` is empty).
New files: the design data (`tools/p19a-design.js`), a sandbox simulator (`tools/p19a-sim.js`), a screenshot tool
(`tools/p19a-shots.js`), results in `docs/audit19a/`, screenshots in `docs/ui/screens19a/`, and this document. Nothing
was tested on an iPhone; the simulations are automated rule-level play with a scripted policy, not real play.

**Today** = read from the source. **Proposed** = needs your approval before Phase 19B.

---

## 1. Source audit: what Obsidian Reach already is (Today)

Obsidian Reach is a finished, rendered island with no campaign, closed by a readiness flag.

| Area | Today | Where |
|---|---|---|
| Identity | Third island, tier 2, element Dark. Blurb: “Black basalt cliffs threaded with magenta crystal and ember-lit ruins. Mysterious, warm, and very quiet.” Obstacle cost multiplier ×12 | `world-data.js` `D.ISLANDS.obsidian` |
| Map | 32×32: 454 buildable grass, 111 sand, 49 path, 33 rock-ridge cells (four basalt seams), a 3×3 landmark slot at (22–24, 7–9). No inland water | `world-maps.js` `D.MAPS.obsidian` |
| Obstacles | **59** (`ob-1`…`ob-59`): 8 Basalt Columns (2×2), 14 Magenta Crystals, 10 Ember Vents, 10 Charred Trees, 12 Obsidian Shards, 5 Slag Heaps (2×2); all on grass. **Ids and positions are save data: never move them** | `D.OBSTACLES.obsidian`, `D.OBSTACLE_TYPES` |
| Landmark | The slot draws the **Great Forge** (2D `L.forge()`; in 3D a brick forge with chimney and fire) | `island-art.js` |
| Rendering | 2D palette (violet-grey ground, magenta crystals, magma cracks in the cliffs, rising embers); the 3D island renders with a derived violet palette. The four obstacle kinds have **no voxel models** (drawn as sprites in 3D, as Verdant's were before 18D). The environment library has a “Obsidian Forge” biome spec and vignette (basalt columns, forges on plinths, slate roofs, twin chimneys, red-gold dusk) | `island-art.js`, `3d/library/biomes.js` |
| Readiness | `D.ISLAND_LIVE.obsidian = false`: travel, unlocking and quest pointers refuse it; setting it to true is the whole activation (18B design) | `verdant18b.js` |
| Unlock | `D.CAMPAIGN.verdant.next = 'obsidian'`; `V.settle` unlocks the next island on load once it is live and the Forest Crown is defeated. Old builds sold islands for gold (base 100,000 × 2^(tier−1)): such saves keep the unlock, cleared obstacles and buildings there | `campaign-data.js`, `verdant18b.js`, `world.js` |
| Campaign | `D.CAMPAIGN.obsidian = { dungeons: [], islandBoss: null, next: 'celestial', hint: 'Dark stone, and a warmth that does not come from any sun.' }` | `campaign-data.js` |
| Quests | `s_reach` “The Dark Shore” (unlock + visit; 10,000 g, 15 gems) after `m_wilds`, hidden while unreachable; `s_crown` after it | `world-data.js`, `quests.js` |
| Story | Forest Crown scene ends on the Reach (“Warm stone. Quiet crystals. Don’t lick anything.”); arrival lines exist: `T.islandHello.obsidian` (“…I say that from experience.”), `T.scripts.island('obsidian')` (“I didn’t think you’d get here so soon.” / “Dark stone isn’t sad stone…”) | `scenes.js`, `story.js` |
| Equipment | An “obsidian” armour family exists: Basalt Mail (shop), Obsidian Mail (Hollow Veil drop), Night Mail (merge tier) | `gear-data.js` |
| Island Defence | Three rival isles already use the obsidian biome: Cinder Spur, Glasswick Crag, Ember Hollow | `campaign-data.js` (rival bots) |
| Habitats | Seven element habitats; **no Metal or Resonance habitat** (those Aminas live anywhere without the +50% home bonus). Metal has no type strengths in `D.STRONG` (neutral) | `world-data.js`, `data.js` |
| Level cap | `D.MAX_LEVEL = 40` (18B). Read in about 20 places in `src/` (XP, feeding, previews, Survival and Defence foe levels, the load clamp in `state.js`) | `data.js` |
| Roster | 63 species in 21 lines; Metal: Zeep, Meta (legendary), Atem (legendary); Resonance: Aimza | `roster.js` |

Screenshots of the island as it is today (Chromium, forced open for the picture only): `docs/ui/screens19a/`.

**Conclusion:** keep everything: the map, all 59 obstacles, the forge landmark, the arrival lines and the readiness
flag. New places go only on non-buildable cells (path, sand, ridge, landmark slot). All 13 proposed cells were checked
against the map and every obstacle footprint: no overlap.

---

## 2. Three concepts (one region, three readings of its blurb)

| | **A. The Cooling Forge** (recommended) | B. The Quiet Caldera | C. The Glasswick Night-Quarter |
|---|---|---|---|
| Visual identity | A forge-island of the Kind Souls built over cooled lava: basalt plinths, twin chimneys, glass kilns, magenta crystal veins; red-gold dusk | A dormant volcano: caldera lake, crystal caves, steam vents, ash plains; mostly natural | A night city of the shadow-side Kind Souls: lantern-lit streets, glass towers, mirror halls |
| Terrain and landmarks | Existing map as is. The four ridge seams become basalt walls and lava seams; the slot is the Great Forge; paths link Landing → Glasswick square → Forge | Needs a central crater (map change) | Needs streets and many buildings; heavy art |
| Environmental storytelling | Workshops show how the Twin Shrine's glass was made, measured and judged: moulds, ledgers, quench pools, a cracked plate | Echoes in crystals; geological, little written record | The Umbrit side's own version, told by its people |
| Dungeon themes | Steps, kilns, rookery, quench pools, mines, mirror gallery, crystal hollows, charred orchard, bellows, forge heart | Vents, lake, caves, summit | Streets, archives, towers, a palace |
| Exploration | Ash Plain, Glass Beach, Crystal Vein | Lakeshore, caves | Markets, rooftops |
| Habitats | Forge → **Metal habitat**; ash pools for Fire; crystal for Resonance later | Fire, Earth, Water | Dark, Light |
| Story relevance | **Strongest**: where the panels (and the door's seal) were made; evidence of an accident nobody intended | Atmospheric, thin on records | Strong, but one-sided (Dark) and risks “explaining” the falling-out |
| Fit with today | Uses the existing map, obstacles, forge landmark, biome spec and rival-isle names | **Unsafe**: moves cells/obstacles | Re-dresses the island; new building art |
| Technical complexity | **Low–medium**: obstacle models, palette, ~10 landmark props | High | High |

**Recommendation: A, with one thread from C**: the kilnworkers' square, *Glasswick*, is the hub, and its Kind Souls
remember the Umbrit side's version as the Verdant shrine's pale side remembered the other. It keeps saves and the map,
reuses the forge landmark and the library's Obsidian Forge spec, and gives the story its “later clues” in places that
feel made for them.

---

## 3. Story outline (Proposed)

**Canon kept:** the Entity stays dry and deflecting and never explains the Emergence, the starter island's origin, the
presence beyond the world, or why the two starters became enemies. The starters' shared history is told only through
evidence. Every Verdant revelation stands (the Keepers of the Crossing, the smashed panel and its two accusations, the
third voice, “keeping something in”). **This island adds: the event was an accident neither intended, and a third
party wanted a part in it.** It never says who.

1. **Arrival — Black Sand Landing.** Existing lines kept, plus: the stairs are cut for two sizes of feet again, but
   here the small steps are scorched and the large ones are not. *Entity:* “Don’t lick anything. I did say.”
2. **Initial objective:** climb the Cinder Steps (D1) to Glasswick, the kilnworkers' square (hub).
3. **Development 1 — the Glasswick Kilns (D2), “Two Furnaces”.** One kiln fired pale glass, the other dark. The shard
   the Entity took from the Elder Root fits a rack labelled in two hands. *Entity:* “Glass remembers where it was made.
   It is very boring about it.”
4. **A Kind Soul at Glasswick** (after D2) recognises the Entity: “You came back.” *Entity:* “You have me confused
   with someone taller.”
5. **The Quench Pools (D4, remark).** A drained pool shows the outline of one great round plate, cracked across.
   *Entity:* “It cooled wrong. Things do, if you hurry them.”
6. **Mid-island revelation — the Mirror Gallery (D6), “The Mould”.** The mould for the Twin Shrine's smashed panel,
   intact. It shows the two Keepers holding one door shut **from the same side**. A third outline beside them has been
   chiselled away. Glasswick's Kind Souls say “the light one shut us out”; the mould contradicts both versions. Your
   starter presses against the glass. *Entity:* “Moulds lie less than panels. Not much less.” He does not look at the
   chiselled outline.
7. **Development 2 — the Magenta Hollows (D7), “What the Crystals Kept”.** The crystals replay one night: a great sound,
   a crack, two voices calling each other's names (never spelled out), then a long hum that is neither light nor
   shadow. The Entity covers your companion's ears, then pretends he didn't.
8. **Development 3 — the Great Bellows (D9), “The Ledger”.** The forge ledger: “Commission: one door, two keys. Paid in
   full.” Below, another hand: “Third key: refused.” *Entity:* “Ledgers. The only honest thing anyone ever wrote, and
   nobody reads them.”
9. **Final dungeon — the Heart of the Forge (D10), Island Boss.** The forge is cold everywhere except its core, kept
   burning by the **Forge Heart** (Pyro-Core III, the project's “Molten Guardian”). *Entity, before:* “It is keeping the
   fire in for a job nobody finished. Admirable. Inconvenient.”
10. **Toward the Celestial Crown — “Three Clocks”.** The core dims. Across the sea the Dormant Spire pulses; the Choir
    hums; the forge's last ember beats in time with both. Three clocks in three houses. High above the clouds, the
    observatory turns. *Entity:* “The sky has always had more to say. I would prefer it said it to someone else.”
    He takes nothing this time; he leaves the ledger open at the refused key.

Dungeons 1, 3, 5 and 8 get a one-line remark after the first clear (`A.Scenes.after`). Scenes stay reward-free.

---

## 4. Ten-dungeon design (Proposed)

Pattern as Verdant: battles 1–3 rec−3, rec−3, rec−2; 4–6 rec−2, rec−1, rec−1; 7–9 rec (battle 9 heralds the charged
move); battle 10 the guardian at rec+3. Foes are third forms (level ≥ 22). Every species exists today; **no new
species, no legendary foes** (Meta and Atem stay rewards). Apart from Zephyr, no guardian line repeats a Verdant
guardian, so the Reach's guardians are new faces at this level. Recommended levels below are the **cap-50** band (section 5).

| # | Dungeon (rec) | Where (cell) | Foes | Guardian · charged move | Tactical challenge | Story | First clear | Repeat |
|---|---|---|---|---|---|---|---|---|
| 1 | **Cinder Steps** (38) | south path (16, 25) | Fire/Earth: Pyrokai, Gaiaroki, Emberix, Pyro-Core | **The Cinder Warden** (Pyrokai III) · *Ashfall*: fire, burns | Burn: cleansing heal; Water, Earth | Arrival | 2,200 g, 420 f, 10 gems | 500 g, 95 f |
| 2 | **Glasswick Kilns** (39) | central path (16, 21) | Fire/Light: Emberix, Lumi, Igniflare, Voltar | **The Glassblower** (Emberix III) · *Molten Glaze*: attack down | Weaken it back, or heal to clear | **Dev 1**: the panels were made here | 2,400 g, 440 f, 10 gems | 520 g, 95 f |
| 3 | **Basalt Rookery** (40) | west ridge (8, 9) | Wind/Fire/Dark: Pyro-Phoenix, Zephyr, Voltar, Umbrit | **The Rookery Matriarch** (Pyro-Phoenix III) · *Cinder Dive* | Swift foes (17B edge); guard the dive | Glass-thread nests, pale and dark | 2,600 g, 460 f, 10 gems | 540 g, 100 f |
| 4 | **Quench Pools** (41) | central path (12, 13) | Water/Earth: Cannonis, Kairyu, Aquaflora, Pyro-Core | **The Quenchwarden** (Cannonis III) · *Cold Quench*: chills (slow) | Guard; Nature and Earth | The cracked plate | 2,800 g, 480 f, 12 gems | 560 g, 100 f |
| 5 | **Deep Seams** (42) | central ridge (21, 16) | Dark/Metal: Voltar, Zeep, Pyro-Core, Umbrit | **The Lamp-Eater** (Voltar III) · *Blackout*: silence | Keep a good basic move; Light | Pale ore, dark ore | 3,000 g, 500 f, 12 gems | 580 g, 105 f |
| 6 | **Mirror Gallery** (43) | central ridge (17, 14) | Dark/Light: Umbrit, Lumifern, Lumi, Voltar | **The Dusk Warden** (Umbrit III) · *Night Glass* (never resisted) · Prism Shift dark ↔ light; battle 9: Lumifern III herald | A Light- and a Dark-hitter; guard | **Revelation**: the mould | 3,400 g, 540 f, 15 gems | 600 g, 110 f |
| 7 | **Magenta Hollows** (44) | north path (17, 5) | Resonance/Light/Metal: Aimza, Lumi, Zeep, Voltar | **The Lantern Below** (Lumi III) · *Shatterlight* | Resonance foes: tactics over types; Dark | **Dev 2**: the crystals' night | 3,700 g, 570 f, 15 gems | 620 g, 110 f |
| 8 | **Charred Orchard** (45) | west path (5, 17) | Nature/Fire: Terraflora, Acinus, Sylvaneer, Pyrokai | **The Ashbloom** (Terraflora III) · *Ashbloom*: attack down | Fire, Wind; cleansing heal | Planted from both ends | 4,000 g, 600 f, 15 gems | 640 g, 115 f |
| 9 | **Great Bellows** (46) | east ridge (25, 21) | Wind/Fire: Zephyr, Pyro-Phoenix, Igniflare, Pyrokai, Zeep | **The Bellows Wind** (Zephyr III) · *Furnace Draught*: burns | Earth, Fire; cleanse | **Dev 3**: the ledger | 4,400 g, 650 f, 18 gems | 660 g, 120 f |
| 10 | **Heart of the Forge** (47) · Island Boss | landmark slot (23, 9) | Earth/Metal: Pyro-Core, Zeep, Pyrokai, Emberix, Aimza | **The Forge Heart** (Pyro-Core III) · *Heart of the Forge* + Stone Barrier (two thresholds) | Specials crack the barrier; guard the charge; Water | **Confrontation**; points to the Celestial Crown | 7,000 g, 1,000 f, 40 gems, Night Mail | 750 g, 130 f |

- New charged moves (data only in `tools/p19a-design.js`): Ashfall, Molten Glaze, Cinder Dive, Cold Quench, Blackout,
  Night Glass, Shatterlight, Ashbloom, Furnace Draught, Heart of the Forge. All use existing effects (burn, soak,
  silence, attack down, never-resisted). A stunning Cold Quench was tested and rejected: guardian won 29 of 40 at rec.
- Equipment: each first clear also gives one existing item not yet tied to a dungeon (proposed in 19B), and the Island
  Boss gives Night Mail (the obsidian family's top tier, today merge-only).
- One-time total: about 35,500 gold, 5,660 food and 157 gems; Verdant's was 17,350 gold and 117 gems. Repeats pay no
  gems (17B rule). The scale follows building costs on the island (×12 obstacles).
- Mechanics column flavour (two-kiln alternation, steam, echoes) is optional for 19C; the simulation used only existing
  mechanics (barrier, prism, charged moves).
- Foe tier proposal: ×1.3 HP / ×1.18 attack (Verdant ×1.2 / ×1.12), tuned per dungeon in 19D as in 18C.

---

## 5. Level-cap study (simulated; nothing changed)

**Method.** The real 18D rules in a sandbox. Six profiles played Starter Island and the Verdant Wilds with the 17C
campaign agent (two seeds each), then the ten proposed dungeons under three options, then one replay of the last three
dungeons. **Threshold** = lowest level at which a plain trio (no gear, Lv 1 moves) clears first try at least half the
time; **slack** = arrival level − threshold. Full data: `docs/audit19a/levelcap.json`.

Profiles: rarely fed (no feeding, no gear); fed regularly (half the food); balanced team (fed, moves Lv 3, gear);
highly upgraded (all food, moves Lv 5, gear, extra replays); arriving at level 40; all optional Verdant content (two
replays of every Verdant dungeon, moves Lv 4, gear).

**What a level is worth near the cap** (existing formula, unchanged):

| Level | XP for the next level | Stat gain of the next level |
|---|---|---|
| 30 | 1,336 | +2.6% |
| 40 | 2,256 | +2.1% |
| 50 | 3,416 | +1.7% |
| 60 | 4,816 | +1.5% |

**Results** (arrival = party level at Obsidian; mean of two seeds):

| Profile | Arrives | Cap 50: end · cap reached · losses | Cap 60: end · headroom · losses | Cap 40 + Mastery: ranks · losses |
|---|---|---|---|---|
| Rarely fed | 34.7 | 47 · never · 4.5 (2 replays) | 48.7 · 11.3 · **10.5** (4 replays) | 7.3 · **9** (4 replays) |
| Fed regularly | 39.3 | **50 · at the Island Boss** · 0 | 54.1 · 5.8 · 0 | 8.8 · 1.5 |
| Balanced team | 39.3 | 50 · at the Island Boss · 0 | 54.5 · 5.5 · 0 | 9.0 · 0 |
| Highly upgraded | 40.0 | 50 · D9–D10 · 0 | 54.3 · 5.7 · 0 | 9.2 · 0 |
| Arrives at 40 | 40.0 | 50 · at the Island Boss · 0 | 54.7 · 5.3 · 0 | 9.0 · 0 |
| All Verdant content | 40.0 | 50 · D9 · 0 | 55.0 · 5.0 · 0 | 9.2 · 0 |

Slack per dungeon (fed regularly): cap 50: 5.3 5 4.3 2.7 5 4 5.3 6.3 7.3 6; cap 60: 5.3 4 3.7 **0** 4.3 2.7 3 4.3 5.7
3.7; cap 40 + Mastery: 3.3 3 2 −1 0 0 0 0 1 −1. Rarely fed under cap 50: 0.7 −0.3 −1.7 −3.7 0.3 −1 0 1 1.3 0.3.

**Findings**
1. **Most players already reach 40 by the end of the Verdant Wilds** (fed players arrive at 39–40; only rarely-fed
   players arrive lower, at ~35). The current cap is already binding at the end of the second island.
2. **Cap 50 supports Obsidian Reach well.** Fed players reach 50 at the Island Boss; rarely-fed players finish at 47
   with a few losses, close to their Verdant experience. **But it leaves no room for the Celestial Crown**: everyone who
   feeds ends the island at 50. Celestial would need another raise.
3. **Cap 60 now leaves only ~5–6 levels for the Celestial Crown** (fed players end at 54–55) and makes the island
   harder for rarely-fed players (10.5 losses), because the band has to climb faster to stay ahead.
4. **Cap 40 + Mastery** keeps XP meaningful (6–9 ranks) but needs a much stronger foe tier (×1.55 HP / ×1.32 attack)
   to keep the island from being trivial, levels stop telling players anything, and rarely-fed players lose 9 times.
5. **XP is wasted at the cap.** Under cap 50, fed players drop 5,100–6,900 XP each by the end of the island and its
   replays (since 18D, XP past the cap is not stored): about 1.5–2 levels' worth.
6. **A global cap would let Verdant replays over-level players.** With cap 50 for everyone, all-optional-content
   players end the Verdant Wilds at 45.7 instead of 40, arriving at Obsidian five levels above its band.
7. **The Quench Pools (D4) is the spike** in every option (threshold 41–44). Tune in 19D (hp ×1.55, or a lighter Cold
   Quench).

**Recommendation: staged caps tied to islands, plus Mastery for XP past the cap.**
- The cap belongs to the save, not to the game: **40 until the Forest Crown is defeated, 50 after it** (when Obsidian
  opens), and **60 after the Forge Heart** (when the Celestial Crown opens, to be confirmed in its own design phase).
  This keeps each island's band predictable and stops replays of an earlier island from over-levelling players
  (finding 6).
- **Mastery ranks** take XP that would otherwise be dropped at the cap: each rank costs one level's XP at the current
  cap and gives **+1% to every stat** (half a level), up to 10 ranks in total. Small enough not to break bands, and it
  answers 18D's “give capped Aminas a use for XP”. Simulated overflow under cap 50: 1.5–2 ranks by the end of the
  island and its replays.
- Not chosen: cap 60 now (too little room left for the Celestial Crown, harder for rarely-fed players); cap 40 with
  Mastery only (levels stop meaning anything, steep foe tiers).
- Do not change the XP formula. Do not change the cap in 19A.

---

## 6. Habitats, systems and collection (Proposed)

| System | Plan |
|---|---|
| **Metal habitat** | Introduce with Obsidian: “Forge Habitat”, 3×3, five levels like the others, unlocked by the Deep Seams (D5) story. Homes the Zeep line and, as residents, Meta and Atem; Metal essence from the island's Metal foes on replays. Placed anywhere, like other habitats (per-island limits unchanged) |
| **Resonance habitat** | Defer to the Celestial Crown (its element is Resonance). Only the Aimza line needs it; the Magenta Hollows adds Resonance essence on replays meanwhile |
| Equipment and crafting | No new crafting system. Obsidian drops reuse existing unused items; the Island Boss gives Night Mail. Optional (decision): Obsidian Glass as a Forge material for a fourth merge tier, only if you want a gear sink |
| Breeding and evolution | Unchanged (12 and 22). The level band makes every parent breed-ready; no new pairings |
| Codex milestones | No new species; the 17D milestones keep counting. Proposed quests: “Metalworks” (own every Zeep form), “Glasswick Census” (befriend 40 species), “Two Furnaces” (own both starters' third forms) |
| Daily tasks | The 17D pool picks up Obsidian dungeons automatically; nothing new |
| Replay challenges | Flawless, One element and Answer the Guardian apply automatically, with 18D's guard rule |
| Explore | Three areas with existing species: **Ash Plain** (after D1: Pyrokai, Gaiaroki, Pyro-Core; rare Pyrokai III, Lv 38), **Glass Beach** (after D4: Cannonis, Kairyu, Zeep; rare Zeep III, Lv 41), **Crystal Vein** (after D7: Aimza, Lumi, Voltar; rare Aimza III, Lv 44). Same 18D rare rules: 20% a day, pity day 8, once, never above the dungeon ahead |
| Island quests | Main chain `m_o1`–`m_o10` (one per dungeon); side: build a Forge Habitat, clear 10 Obsidian obstacles, upgrade a habitat on the Reach. `s_reach` stays as it is and appears when the island is live and reachable |

---

## 7. Technical implementation plan (migration-safe)

| Topic | Plan |
|---|---|
| Island activation | `D.ISLAND_LIVE.obsidian = true` in the release that has all ten dungeons playable (the 18B mechanism); until then dungeon entries ship with `playable: false` |
| Dungeon unlocks | New entries in a data file `campaign-obsidian.js` (loaded after `campaign-data.js`), ids `o_*`, `island: 'obsidian'`, `prev` chain from `v_elderroot`; `D.CAMPAIGN.obsidian.dungeons/islandBoss` filled; foe tier on `D.CAMPAIGN.obsidian.foeTier` |
| Places and gates | An `o19` record like `D.V18` (sites, gates, explore) on the 13 checked cells; no map cell changes; a test that all 59 obstacle ids and positions are unchanged |
| Quest visibility | `m_o*` chain after `s_reach`; `Q.islandReachable` already respects `ISLAND_LIVE` |
| Save compatibility | New keys only (`st.o19`, `st.dungeon.o_*`, explore counts); no schema bump. Players who bought the Reach in old builds keep their buildings; gates sit on non-buildable cells, so nothing is displaced; the arrival scene plays once on their next visit |
| Level cap | Replace the reads of `D.MAX_LEVEL` (about 20) with `R.levelCap(st)` (40 / 50 / 60 by Island Boss), keeping `D.MAX_LEVEL` as the absolute ceiling. **The load clamp in `state.js` must use the save's cap, never a lower one**, so a save can never lose levels. Survival and Island Defence foe levels use the save's cap. Mastery: `inst.mxp` (new key), applied in `R.partyFighter` and shown on the creature screen |
| Asset loading | No new GLBs. Voxel models for the six obstacle kinds (basalt, crystal, ember vent, charred tree, shard, slag) baked into one mesh as 18D did; an Obsidian `ISLAND_PAL` entry; ten arena variations recolouring existing arenas (18D method) |
| Mobile performance | Budget: Obsidian within +4 draw calls of Starter Island and ≤ +25% triangles (the 18D Verdant result); ember particles share one points mesh; quality tiers, battery saver and Reduce motion unchanged |
| Regression testing | A journey test (Forest Crown → ten dungeons → Forge Heart → back), cap tests (40 before, 50 after, no level lost on load, Mastery), save import from 17/18B/18D saves and from old builds with the Reach bought, browser checks for the island, arenas and story order; full regression |

**Phases (Proposed):** 19B foundation and Dungeons 1–5 (data, cap function, Metal habitat, Ash Plain, obstacle models);
19C Dungeons 6–10, story, arenas, remaining Explore; 19D balance (Quench Pools), polish, performance, regression.

---

## 8. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Level-cap change loses levels on load (the clamp) | Medium | High | Clamp to the save's cap; tests with saves at 40 and above; never lower a cap |
| 2 | Saves that bought Obsidian in old builds have buildings where new places go | Low | High | Places only on non-buildable cells (checked); test with a fully built Reach |
| 3 | Story over-explains (canon guard) | Medium | High | Evidence only; the Entity never confirms; third party never named; review all scene text before 19C |
| 4 | Quench Pools spike | High | Medium | 19D tuning (sim shows threshold 41–44) |
| 5 | Rarely-fed players struggle late | Medium | Medium | Foe tier tuned per dungeon; Mastery gives fed and unfed alike something from replays |
| 6 | Mastery inflates power | Low | Medium | +1% a rank, 10 ranks total; tested in the sandbox at +2% without breaking bands |
| 7 | Performance of the 3D Reach (59 obstacles, embers) | Medium | Medium | 18D bake method and budget; measured against Starter and Verdant |
| 8 | Metal habitat changes the economy | Low | Low | Same production rules and limits as other habitats |
| 9 | Players reach the Reach before it is ready | Low | Medium | `ISLAND_LIVE` stays false until all ten dungeons are playable |
| 10 | Sandbox simulations differ from real play | Certain | Medium | Treat as relative; hand-play on iPhone at 19D |

**Decisions for you**
1. Concept A (Cooling Forge with Glasswick) or another.
2. Level progression: staged caps 50 → 60 tied to Island Bosses plus Mastery (recommended), cap 50 alone, cap 60, or 40 + Mastery.
3. Mastery rank size (+1% recommended) and total (10).
4. The ten charged moves and the foe tier (×1.3 / ×1.18).
5. Metal habitat with Obsidian (recommended); Resonance with the Celestial Crown.
6. Rewards (table in section 4) and Night Mail as the Island Boss item.
7. The story beats in section 3, especially the Mirror Gallery mould and the ledger's “third key”.
8. Optional dungeon mechanics, or plain dungeons first.
