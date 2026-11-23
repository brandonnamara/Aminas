# Phase 18C balance tuning (automated simulation, tools/p18c-sim.js; not real gameplay)

Balanced trio Lumifern / Cannonis / Emberix lines, tactical play unless noted. Threshold = lowest party level that clears
the dungeon first try in at least half of 16 seeded runs.

| Step | Change | Thresholds (D1–D10, rec 22 24 25 27 28 30 31 33 34 36) | Note |
|---|---|---|---|
| 0 | 18A starting values: foe tier HP ×1.15, ATK ×1.10; Moonwell guardian HP ×1.75, Tidal Hymn 78 | 22 23 23 24 25 28 28 32 31 32 | Moonwell jumps 4 levels over the Canopy Walk while the Choir after it is easier: the spike 18A found |
| 1 | Per-dungeon HP tuning (Mossgate 0.95, Archive/Glow/Canopy 1.06, Choir 1.08, Elder Root 1.10 HP / 1.04 ATK, Moonwell 0.94) | 22 23 23 24 25 28 28 32 34 34 | thresholds move in whole levels; the Choir over-shot |
| 2 | Moonwell guardian HP 1.75 → 1.60, Tidal Hymn 78 → 74, Moonwell 0.92; Choir back to 1.00; Elder Root 1.06 / 1.04 | 22 23 23 24 25 28 28 31 31 34 | Moonwell smoothed; basic play fails everywhere, tactical and auto clear at rec |
| 3 | Archive and Glow 1.15, Canopy 1.12 HP / 1.04 ATK, Elder Root 1.12 / 1.06 (auto-battle cleared these 2 levels under rec every time) | – | middle dungeons were trivial for this trio |
| 4 | Island foe tier ×1.20 HP / ×1.12 ATK (from ×1.15 / ×1.10) | 22 24 24 25 26 29 29 32 32 35 | rarely fed now arrives near each threshold (slack −1.7 to +2), still 0 losses |
| 5 | Moonwell 0.88 | 22 24 24 25 26 29 29 31 32 35 | final: thresholds rise one or two levels per dungeon, no spike |
| 6 | Floodgate 80 → 74 and Ember Canopy 80 → 72; the Moss Bastion's attack ×0.85 | unchanged | one unguarded charged hit at its highest roll could fell a full-health Amina; now none can at the recommended level |

Not used: a guardian knocked out while charging as an extra way to "Answer the guardian". It happens in 52% of all guardian
wins, including plain basic-move play, and would have passed the challenge in 31% more wins with no deliberate response
(up to 72% on the Windworn Stair). Not implemented.
