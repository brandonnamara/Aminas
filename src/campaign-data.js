/* Aminas — campaign data (pure data, no DOM): islands as world fragments, ten dungeons per island, ten battles per
   dungeon. Battle 10 of every dungeon is its boss; the boss of an island's tenth dungeon is that island's Island Boss,
   and defeating it unlocks the next island. Everything here is data: a new island or dungeon is a new entry, not new
   code. Loaded after world-data.js (needs D.ISLANDS). */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = A.Data;

  D.BATTLES_PER_DUNGEON = 10;
  D.DUNGEONS_PER_ISLAND = 10;

  /* ---------- boss moves (never in a species list) ---------- */
  Object.assign(D.ABILITIES, {
    lampsout:  { name: 'Lights Out', el: 'dark', type: 'weaken', power: 58, cd: 0, boss: true, tell: 'The Lamplighter cups every flame in the hall. Lights Out is coming!', desc: 'Darkness that lowers your attack.' },
    undertow:  { name: 'Undertow', el: 'water', type: 'dmg', power: 80, cd: 0, boss: true, tell: 'The water on the steps starts running uphill. Undertow is coming!', desc: 'A dragging wave. Soaks the target.', fx: { k: 'soak', p: 1, n: 2 } },
    kilnflare: { name: 'Kiln Flare', el: 'fire', type: 'dmg', power: 82, cd: 0, boss: true, tell: 'The kiln door glows white at the edges. Kiln Flare is coming!', desc: 'Heat that lingers: burns the target.', fx: { k: 'burn', p: 1, n: 2 } },
    lampglare: { name: 'Lamp Glare', el: 'light', type: 'dmg', power: 80, cd: 0, boss: true, tell: 'Every lantern in the orchard turns to face you. Lamp Glare is coming!', desc: 'A blinding flash. May stun.', fx: { k: 'stun', p: 0.4, n: 1 } },
    galeforce: { name: 'Gale Force', el: 'wind', type: 'weaken', power: 80, cd: 0, boss: true, tell: 'The weathervane stops spinning and points straight at you. Gale Force is coming!', desc: 'A wall of wind that lowers your attack.' },
    prismfall: { name: 'Prismfall', el: 'resonance', type: 'dmg', power: 86, cd: 0, boss: true, neutral: true, tell: 'Every colour in the air folds towards the stag. Prismfall is coming!', desc: 'Light from every colour at once. Never resisted, but a guard blocks most of it.' },
  });

  /* ---------- boss mechanics (read by the battle engine) ----------
     barrier: when its health first drops below each threshold, the boss spends its next turn raising a barrier that
              absorbs damage. Special abilities (those with a cooldown) crack a barrier twice as fast.
     prism:   every `every` turns its element shifts to the next in `els` (announced a turn ahead). */
  D.BOSS_MECHS = {
    barrier: { name: 'Stone Barrier', desc: 'Raises a barrier at two health thresholds. Special abilities crack it twice as fast.' },
    prism: { name: 'Prism Shift', desc: 'Its element keeps shifting. Watch the colour and change your approach.' },
  };

  // Generates the nine ordinary battles of a dungeon from a species pool and a level curve (deterministic).
  function nine(pool, lvFrom, lvTo, env) {
    const out = [];
    for (let i = 0; i < 9; i++) {
      const lv = Math.round(lvFrom + (lvTo - lvFrom) * (i / 8));
      out.push(Object.assign({ sp: pool[(i * 2 + (i >> 2)) % pool.length], lv }, env && env[i] ? env[i] : {}));
    }
    return out;
  }
  // Four sections per dungeon: battles 1-3, 4-6, 7-9 and the boss. Sections carry the environmental story and a
  // one-time first-clear reward.
  const sec = (a, b, c, d) => [
    Object.assign({ from: 0, to: 2 }, a), Object.assign({ from: 3, to: 5 }, b), Object.assign({ from: 6, to: 8 }, c), Object.assign({ from: 9, to: 9 }, d),
  ];

  /* ---------- dungeons ---------- */
  D.DUNGEONS = {
    /* ===== Starter Island, Dungeon 1 ===== */
    forgottenroad: {
      name: 'The Forgotten Road', island: 'starter', el: 'earth', playable: true, recommended: 4,
      theme: 'An abandoned stone road leading to a ruined settlement. An ordinary place with an extraordinary past.',
      unlock: { struct: 'hollow' }, unlockText: 'Restore the Sunlit Hollow.',
      env: 'road', scene: 'oldroads',
      battles: nine(['gaiaroki', 'acinus', 'terraflora', 'sylvaneer', 'gaiaroki'], 2, 4, [
        { env: 'road1', clue: 'Grass has swallowed the road, but the flagstones underneath are square and level. Someone laid these carefully.' },
        { env: 'road1', clue: 'The stones run dead straight, as if the road always knew exactly where it was going.' },
        { env: 'road2', clue: 'A low line of fitted stone beside the road. Foundations. Somebody meant to build here, and did.' },
        { env: 'signs', clue: 'A signpost leans over the road. The words have worn away. The arrows have not.' },
        { env: 'signs', clue: 'Doorways along the road, taller than most Aminas need. Some have little steps cut beside them, just the right height for small feet.' },
        { env: 'carving', clue: 'A carved lintel over a doorway: tall figures walking, and small round ones walking with them. Nobody is leading.' },
        { env: 'mural1', clue: 'A painted wall, mostly hidden under moss. One small figure shows through, leaf-eared, looking to its side.' },
        { env: 'mural2', clue: 'More of the mural under the ivy: a second figure, dark and crested, close enough to touch the first.' },
        { env: 'mural3', clue: 'The mural, nearly whole. The two of them stand side by side, facing the same way down the road.' },
      ]).concat([{ sp: 'gaiaroki', lv: 4, boss: true, title: 'The Waywarden', hpMult: 1.3, scale: 1.45, mech: { type: 'barrier', at: [0.66, 0.33], amt: 0.22 },
        env: 'roadend', clue: 'The road ends at a gate of standing stones. Something very old is still on duty.' }]),
      sections: sec(
        { name: 'Overgrown Stones', first: { gold: 25, food: 8 }, lore: 'road_stones' },
        { name: 'Broken Signposts', first: { gold: 35, food: 10 }, lore: 'road_signs' },
        { name: 'The Mural', first: { gold: 45, food: 12 }, lore: 'road_mural' },
        { name: 'The Road’s End', first: { gems: 3 }, lore: 'waywarden' }),
      first: { gold: 120, food: 30, gems: 3 }, repeat: { gold: 40, food: 12 },
      rewardText: 'First clear: 120 gold, 30 food, 3 gems. Replays: 40 gold, 12 food.',
    },
    /* ===== Dungeon 2: narrative direction only (central question: why was this place abandoned?) ===== */
    gatheringhall: {
      name: 'The Gathering Hall', island: 'starter', el: 'dark', playable: true, recommended: 5,
      theme: 'At the end of the old road: a hall where people and Aminas once ate together. Why was it abandoned?',
      unlock: null, env: 'hall', scene: 'emptyhall',
      battles: nine(['acinus', 'voltar', 'gaiaroki', 'terraflora', 'voltar'], 3, 5, [
        { env: 'hall1', clue: 'Long tables, set for more guests than any Amina would ever need.' }, {}, {},
        { env: 'hall2', clue: 'Feeding troughs, scrubbed clean, then never used again.' }, {}, {},
        { env: 'hall3', clue: 'A noticeboard with every notice taken down. Only the pin holes are left.' }, {}, {},
      ]).concat([{ sp: 'voltar', lv: 7, boss: true, title: 'The Lamplighter', hpMult: 1.55, scale: 1.4, move: 'lampsout', env: 'hall3', clue: 'One lantern still burns in the empty hall. Someone is tending it.' }]),
      sections: sec({ name: 'The Long Tables', first: { gold: 30, food: 10 }, lore: 'hall_tables' }, { name: 'The Feeding Room', first: { gold: 40, food: 12 } }, { name: 'The Noticeboard', first: { gold: 50, food: 14 } }, { name: 'The Last Lantern', first: { gems: 3 } }),
      first: { gold: 150, food: 40, gems: 3 }, repeat: { gold: 50, food: 15 },
      rewardText: 'First clear: 150 gold, 40 food, 3 gems. Replays: 50 gold, 15 food.',
    },
    /* ===== Dungeon 3: the original Overgrown Reliquary, now ten battles ===== */
    reliquary: {
      name: 'The Overgrown Reliquary', island: 'starter', el: 'nature', playable: true, recommended: 6, legacy: true,
      theme: 'Nature reclaiming a sanctuary vault. Mossy stairs, humming roots, and a staircase that remembers you.',
      unlock: { struct: 'reliquarygate' }, unlockText: 'Restore the Reliquary Gate.', env: 'vault',
      battles: nine(['acinus', 'terraflora', 'gaiaroki', 'sylvaneer', 'acinus'], 3, 5).concat([{ sp: 'terraki', lv: 6, boss: true, title: 'Rootbound Sentinel', hpMult: 1.1, move: 'rootcrush' }]),
      sections: sec({ name: 'Mossy Threshold', first: { gold: 20, food: 6 } }, { name: 'The Whispering Stacks', first: { gold: 30, food: 8 } }, { name: 'The Root Halls', first: { gold: 30, food: 8 } }, { name: 'Heart of the Reliquary', first: { gems: 2 } }),
      clearReward: { gold: 150, food: 40, gems: 5 },
      rewardText: '150 gold, 40 food, 5 gems on each clear. Gaiaroki II on your first clear, Sylvaneer II on your second.',
    },
    /* ===== Dungeons 4-5 ===== */
    drownedsteps: {
      name: 'The Drowned Steps', island: 'starter', el: 'water', playable: true, recommended: 8,
      theme: 'Stone steps leading down into the sea from the Tide Gate. The water goes further down than the steps do.',
      unlock: { struct: 'tidegate' }, unlockText: 'Restore the Tide Gate.', env: 'tide',
      battles: nine(['cannonis', 'kairyu', 'sylvaneer', 'cannonis', 'gaiaroki'], 6, 8).concat([{ sp: 'kairyu', lv: 10, boss: true, title: 'The Tidewarden', hpMult: 1.5, scale: 1.45, move: 'undertow' }]),
      sections: sec({ name: 'Wet Stone', first: { gold: 50, food: 14 } }, { name: 'The Waterline', first: { gold: 60, food: 16 } }, { name: 'Below the Waterline', first: { gold: 70, food: 18 } }, { name: 'The Last Step', first: { gems: 4 } }),
      first: { gold: 260, food: 60, gems: 5 }, repeat: { gold: 80, food: 20 },
      rewardText: 'First clear: 260 gold, 60 food, 5 gems. Replays: 80 gold, 20 food.',
    },
    coldkiln: {
      name: 'The Cold Kiln', island: 'starter', el: 'fire', playable: true, recommended: 10,
      theme: 'A kiln big enough to walk into, gone cold for an age. Something inside has started warming it again.',
      unlock: { flag: 'r1' }, unlockText: 'Investigate the humming stones on the east shore.', env: 'kiln',
      battles: nine(['pyrokai', 'pyrocell', 'emberix', 'pyrokai', 'igniflare'], 8, 10).concat([{ sp: 'pyroforge', lv: 12, boss: true, title: 'The Kiln Mother', hpMult: 1.55, scale: 1.5, move: 'kilnflare' }]),
      sections: sec({ name: 'The Ash Yard', first: { gold: 70, food: 18 } }, { name: 'The Firing Room', first: { gold: 80, food: 20 } }, { name: 'The Chimney', first: { gold: 90, food: 22 } }, { name: 'The Kiln Heart', first: { gems: 5 } }),
      first: { gold: 340, food: 80, gems: 6 }, repeat: { gold: 100, food: 25 },
      rewardText: 'First clear: 340 gold, 80 food, 6 gems. Replays: 100 gold, 25 food.',
    },
    /* ===== Dungeon 6: the original Hollow Veil ===== */
    hollowveil: {
      name: 'The Hollow Veil', island: 'starter', el: 'dark', playable: true, recommended: 12, legacy: true,
      theme: 'A Dark-themed ruin full of forgotten history: corridors that rearrange behind you and traces nobody wrote down.',
      unlock: { rank: 6, struct: 'moonshrine' }, unlockText: 'Reach Player Rank 6 and restore the Moon Shrine.', env: 'veil',
      species: ['voltar', 'zeep', 'voltar2'],
      battles: nine(['voltar', 'zeep', 'voltar2', 'duskmantle', 'zeep'], 9, 12).concat([{ sp: 'zeep2', lv: 13, boss: true, title: 'Keeper of Unsaid Things', hpMult: 1.2, move: 'unsaidverdict' }]),
      sections: sec({ name: 'The Unwritten Hall', first: { gold: 60, food: 15 } }, { name: 'Margins of Memory', first: { gold: 80, food: 20 } }, { name: 'The Folded Corridor', first: { gold: 80, food: 20 } }, { name: 'The Hollow Warden', first: { gems: 4 } }),
      clearReward: { gold: 420, food: 100, gems: 12 },
      rewardText: '420 gold, 100 food, 12 gems on each clear, plus Meta on your first clear.',
    },
    /* ===== Dungeons 7-8 ===== */
    lanternorchard: {
      name: 'The Lantern Orchard', island: 'starter', el: 'light', playable: true, recommended: 14,
      theme: 'Rows of lantern-trees planted in straight lines. They still light up at dusk, for nobody.',
      unlock: { flag: 'hollowveil' }, unlockText: 'Clear the Hollow Veil.', env: 'orchard',
      battles: nine(['lumi', 'igniflare', 'lumifern', 'aquaflora', 'lumi'], 12, 14).concat([{ sp: 'lumi2', lv: 16, boss: true, title: 'The Orchard Keeper', hpMult: 1.6, scale: 1.45, move: 'lampglare' }]),
      sections: sec({ name: 'The First Row', first: { gold: 100, food: 25 } }, { name: 'The Grafting Shed', first: { gold: 110, food: 28 } }, { name: 'The Old Rows', first: { gold: 120, food: 30 } }, { name: 'The Brightest Tree', first: { gems: 6 } }),
      first: { gold: 520, food: 120, gems: 8 }, repeat: { gold: 150, food: 35 },
      rewardText: 'First clear: 520 gold, 120 food, 8 gems. Replays: 150 gold, 35 food.',
    },
    windstair: {
      name: 'The Windworn Stair', island: 'starter', el: 'wind', playable: true, recommended: 16,
      theme: 'A stair cut into the cliffs below the Dormant Spire. The wind on it is newer than the stone.',
      unlock: { flag: 'r2' }, unlockText: 'Wake the Dormant Spire (clear the Overgrown Reliquary).', env: 'stair',
      battles: nine(['zephyr', 'pyrospark', 'igniflare', 'aeolus', 'pyrohawk'], 14, 16).concat([{ sp: 'pyrohawk', lv: 18, boss: true, title: 'The Weathervane', hpMult: 1.65, scale: 1.45, move: 'galeforce' }]),
      sections: sec({ name: 'The Lower Flight', first: { gold: 120, food: 30 } }, { name: 'The Landing', first: { gold: 130, food: 32 } }, { name: 'The Upper Flight', first: { gold: 140, food: 35 } }, { name: 'The Vane', first: { gems: 7 } }),
      first: { gold: 640, food: 150, gems: 10 }, repeat: { gold: 180, food: 40 },
      rewardText: 'First clear: 640 gold, 150 food, 10 gems. Replays: 180 gold, 40 food.',
    },
    /* ===== Dungeon 9: the original Resonance Scar ===== */
    resonancescar: {
      name: 'The Resonance Scar', island: 'starter', el: 'resonance', playable: true, recommended: 18, legacy: true,
      theme: 'A wound in the island where gravity, weather and time argue. Encounters change as you walk.',
      unlock: { rank: 9 }, unlockText: 'Reach Player Rank 9.', env: 'scar',
      species: ['aimza', 'voltar2', 'zeep2', 'aimza2'],
      battles: nine(['aimza', 'voltar2', 'zeep2', 'aimza', 'aimza2'], 15, 18).concat([{ sp: 'aimza2', lv: 20, boss: true, title: 'The Echo at the Centre', hpMult: 1.25, move: 'resonantcollapse' }]),
      sections: sec({ name: 'Where the Sky Is Floor', first: { gold: 120, food: 30 } }, { name: 'The Long Moment', first: { gold: 160, food: 40 } }, { name: 'The Sideways Hour', first: { gold: 160, food: 40 } }, { name: 'The Quiet Centre', first: { gems: 6 } }),
      clearReward: { gold: 900, food: 220, gems: 25 },
      rewardText: '900 gold, 220 food, 25 gems on each clear, plus Atem on your first clear.',
    },
    /* ===== Dungeon 10: the Island Boss ===== */
    heartwood: {
      name: 'The Heartwood', island: 'starter', el: 'nature', playable: true, recommended: 20,
      theme: 'The roots under the whole island meet here. Something has been guarding the place where they meet.',
      unlock: { rank: 10 }, unlockText: 'Reach Player Rank 10.', env: 'heart', scene: 'heartwood',
      battles: nine(['sylvaneer2', 'terraki', 'solarbloom', 'duskmantle', 'aimza2', 'reefback'], 17, 20).concat([{ sp: 'sylvaneer2', lv: 24, boss: true, islandBoss: true, title: 'The Heartwood Stag', hpMult: 2.2, scale: 1.75,
        move: 'prismfall', mech: { type: 'prism', every: 3, els: ['nature', 'light', 'water', 'earth', 'dark'] } }]),
      sections: sec({ name: 'The Root Gate', first: { gold: 200, food: 50 } }, { name: 'The Tangle', first: { gold: 220, food: 55 } }, { name: 'The Quiet Roots', first: { gold: 240, food: 60 } }, { name: 'The Heart', first: { gems: 15 } }),
      first: { gold: 2000, food: 400, gems: 30 }, repeat: { gold: 300, food: 60 },
      rewardText: 'Island Boss. First clear: 2,000 gold, 400 food, 30 gems and the next island. Replays: 300 gold, 60 food.',
    },
  };

  /* ---------- islands (world fragments) ---------- */
  // dungeons: the island's ten dungeons in order; islandBoss: the dungeon whose boss is the Island Boss (always the
  // tenth). next: the island that defeating it unlocks. An island with no dungeons yet is shown honestly as locked.
  D.CAMPAIGN = {
    starter: { dungeons: ['forgottenroad', 'gatheringhall', 'reliquary', 'drownedsteps', 'coldkiln', 'hollowveil', 'lanternorchard', 'windstair', 'resonancescar', 'heartwood'],
      islandBoss: 'heartwood', next: 'verdant', hint: 'Warm stone, old roads, and buildings that were here before anyone remembers.' },
    verdant: { dungeons: [], islandBoss: null, next: 'obsidian', hint: 'Something green and very old, pressing at the edge of the sanctuary.' },
    obsidian: { dungeons: [], islandBoss: null, next: 'celestial', hint: 'Dark stone, and a warmth that does not come from any sun.' },
    celestial: { dungeons: [], islandBoss: null, next: null, hint: 'High up. Higher than an island has any right to be.' },
  };
  D.DUNGEON_ORDER = [];
  D.ISLAND_ORDER.forEach((iid) => {
    const c = D.CAMPAIGN[iid]; if (!c) return;
    c.dungeons.forEach((id, i) => { const d = D.DUNGEONS[id]; d.id = id; d.island = iid; d.index = i + 1; d.prev = i ? c.dungeons[i - 1] : null; D.DUNGEON_ORDER.push(id); });
  });
  // Islands no longer cost gold: the Island Boss of the island before opens each one. (Earlier builds sold them for
  // 100k/200k/400k gold; islands bought that way stay unlocked.)
  D.ISLAND_ORDER.forEach((iid) => { D.ISLANDS[iid].price = 0; });
  // The island each island's boss unlocks requires that boss (data, so the map and the rules agree).
  D.ISLAND_ORDER.forEach((iid) => { const c = D.CAMPAIGN[iid]; if (c && c.next) D.CAMPAIGN[c.next].unlockedBy = iid; });
  Object.keys(D.DUNGEONS).forEach((id) => {
    const d = D.DUNGEONS[id];
    d.floors = d.sections.map((s) => ({ name: s.name, battles: d.battles.slice(s.from, s.to + 1), first: s.first })); // read-only view kept for older call sites
  });

  /* ---------- lore journal ----------
     Entries unlock from play (sections, ruins). They describe; they never explain. */
  D.LORE = {
    road_stones: { title: 'Square stones', text: 'The road on the starter island is paved with cut, fitted flagstones, laid level and straight. Aminas do not build roads like this. Somebody did.' },
    road_signs: { title: 'Signposts', text: 'The signposts along the Forgotten Road point somewhere. The names have worn off. The Entity has not offered to read them.' },
    road_mural: { title: 'The mural', text: 'A painted wall near the end of the road shows two small figures side by side: one leaf-eared, one dark and crested. They are not fighting.' },
    waywarden: { title: 'The Waywarden', text: 'An ancient guardian that kept the road long after the people who used it were gone. It did not stop. Nobody told it to.' },
    hall_tables: { title: 'The long tables', text: 'The Gathering Hall was set for a great many guests, tall and small. The plates were put away. Nobody came back for them.' },
    heartwood: { title: 'The Heartwood', text: 'Every root on the island meets in one place. The light there is every colour at once, and the Entity does not like to look at it.' },
    ruin_toll: { title: 'A bent key', text: 'Found in the old toll house. Too small for a gate, too large for a box. The Entity knew which door it opened before anyone asked.' },
    ruin_tower: { title: 'A ledger page', text: 'A water-stained page from the signal tower, in a neat hand and a script nobody on the island uses. The Entity read it aloud without seeming to notice he could.' },
    ruin_cellar: { title: 'A child’s drawing', text: 'Under the bakery: a drawing of a sprout-eared Amina sitting at a table, with a cake. Someone small drew it. Someone small kept it.' },
  };

  /* ---------- Loot Ruins ---------- */
  // Repeatable searches with a cooldown. The artefact (a lore entry) is found once, on the first search of each site.
  D.RUINS = {
    toll: { name: 'The Old Toll House', island: 'starter', blurb: 'A stone hut by the Forgotten Road, with a window for taking payments.', unlock: { dungeon: 'forgottenroad' }, unlockText: 'Clear the Forgotten Road.',
      loot: { gold: [30, 60], food: [8, 16] }, gemChance: 0.1, artefact: 'ruin_toll', cooldownMin: 30 },
    tower: { name: 'The Signal Tower', island: 'starter', blurb: 'A tower on the cliffs with a ladder that stops halfway up.', unlock: { dungeon: 'gatheringhall' }, unlockText: 'Clear the Gathering Hall.',
      loot: { gold: [50, 90], food: [10, 20] }, gemChance: 0.15, artefact: 'ruin_tower', cooldownMin: 45 },
    cellar: { name: 'The Bakery Cellar', island: 'starter', blurb: 'Ovens far too big for any Amina, and a cellar door that sticks.', unlock: { dungeon: 'reliquary' }, unlockText: 'Clear the Overgrown Reliquary.',
      loot: { gold: [70, 130], food: [20, 35] }, gemChance: 0.2, artefact: 'ruin_cellar', cooldownMin: 60 },
  };
  D.RUIN_ORDER = ['toll', 'tower', 'cellar'];

  /* ---------- Survival ---------- */
  D.SURVIVAL = {
    party: 3, minLevel: 3,
    pool: ['acinus', 'gaiaroki', 'terraflora', 'sylvaneer', 'cannonis', 'kairyu', 'aquaflora', 'pyrokai', 'pyrocell', 'emberix', 'igniflare', 'voltar', 'zeep', 'zephyr', 'pyrospark', 'lumi'],
    champions: ['terraki', 'sylvaneer2', 'reefback', 'tidalong', 'flaremon', 'emberkai', 'zeep2', 'duskmantle', 'solarbloom'],
    championMoves: ['rootcrush', 'kilnflare', 'undertow', 'galeforce', 'lampglare'],
    perWave: { gold: 12, food: 3 }, // paid when the run ends (cash out or defeat), times the wave number
    milestones: { 5: { gems: 3 }, 10: { gems: 6 }, 15: { gems: 10 }, 20: { gems: 15 } }, // once per save
    healBetween: 0.25,
  };

  /* ---------- PvP (local foundations; no server exists yet) ---------- */
  D.PVP = {
    rosterSize: 5, defenceSize: 3,
    practiceDailyRewards: 5, practiceReward: { gold: 60, food: 10 },
    online: false, // set true only when a real matchmaking service is connected
    // Phase 12A: Island Defence raid targets. Computer-owned islands (no server yet), each with its own defenders and
    // raidable loot, shown before you attack. Only coins (gold) and food can be raided; gems never. Loot scales with
    // how well an island is guarded, around the existing raid reward; a win still counts towards the same daily
    // limit of rewarded wins as 5v5 practice (practiceDailyRewards).
    raid: {
      base: { gold: 60, food: 10 }, // the reward a raid paid before Phase 12A, now the middle of the range
      foodValue: 3,                  // food counted as 3 coins in an island's total loot value
      recent: 6,                     // islands not offered again until this many others have been
      tiers: [
        { id: 'light', label: 'Lightly guarded', lv: -1, w: 2, mult: [0.6, 0.9] },
        { id: 'guarded', label: 'Guarded', lv: 0, w: 3, mult: [0.9, 1.25] },
        { id: 'well', label: 'Well guarded', lv: 1, w: 2, mult: [1.25, 1.6] },
        { id: 'fort', label: 'Fortified', lv: 2, w: 1, mult: [1.6, 2] },
      ],
      bots: [
        { id: 'mirelle', name: 'Captain Mirelle', isle: 'Driftwood Atoll', biome: 'starter' },
        { id: 'oskar', name: 'Old Oskar', isle: 'Barnacle Rest', biome: 'starter' },
        { id: 'tamsin', name: 'Tamsin Vale', isle: 'Clover Shoal', biome: 'starter' },
        { id: 'bramble', name: 'Bramble & Co.', isle: 'Fernhollow Isle', biome: 'verdant' },
        { id: 'liora', name: 'Liora Quill', isle: 'Mossgate Reach', biome: 'verdant' },
        { id: 'hob', name: 'Hob the Gardener', isle: 'Willowmere', biome: 'verdant' },
        { id: 'kaze', name: 'Kaze Ironleaf', isle: 'Cinder Spur', biome: 'obsidian' },
        { id: 'vex', name: 'Vex Ashcombe', isle: 'Glasswick Crag', biome: 'obsidian' },
        { id: 'rook', name: 'Rook & Rue', isle: 'Ember Hollow', biome: 'obsidian' },
        { id: 'selene', name: 'Selene Arch', isle: 'Starfall Terrace', biome: 'celestial' },
        { id: 'pell', name: 'Pell Wintergold', isle: 'Moonlit Spire', biome: 'celestial' },
        { id: 'nyx', name: 'Nyx Halloran', isle: 'Opal Halo', biome: 'celestial' },
      ],
    },
  };
  D.HIDESEEK = {
    lobbySize: 5, seconds: 75, searches: 10,
    morphs: ['bush', 'rock', 'barrel', 'stump', 'lantern', 'crate'],
    bots: ['Pip', 'Marlo', 'Juno', 'Fen', 'Sable', 'Wren'],
    map: { w: 8, h: 5 },
    // hs-redesign: the prop-disguise round on the Starter Island (src/hideseek.js). The voting and lobby above are
    // unchanged. `seconds` is still the search time; hiding gets its own short preparation before it.
    prep: 20, morphCooldown: 10, missPenalty: 3, swing: 0.55, reach: 1.35, cone: 60,
    seekerSpeed: 2.4, botSeekerSpeed: 2.1, wispSpeed: 2.2,
    speed: { tiny: 1.6, small: 1.2, medium: 0.8, large: 0.45, huge: 0.3 },
    // Seeker models. A Tripo export dropped in here (a .glb path, rigged, with idle/walk/attack/reveal clips) replaces
    // the built-in voxel seeker of that look; null keeps the voxel seeker.
    seekerGlb: { male: null, female: null },
    seekerLook: { Pip: 'male', Marlo: 'male', Juno: 'female', Fen: 'male', Sable: 'female', Wren: 'female' },
  };
})(typeof window !== 'undefined' ? window : globalThis);
