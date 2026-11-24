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
    /* Phase 18C: the Verdant Wilds guardians' charged moves. Every one is telegraphed a turn ahead (tell), three-quarters
       blocked by a guard, broken by a stun while charging, and held back a turn by soak, like every guardian move. */
    floodgate:     { name: 'Floodgate', el: 'water', type: 'dmg', power: 74, cd: 0, boss: true, tell: 'The aqueduct groans as every sluice opens at once. Floodgate is coming!', desc: 'A wall of released water. Soaks the target.', fx: { k: 'soak', p: 1, n: 2 } },
    sporebloom:    { name: 'Spore Bloom', el: 'nature', type: 'weaken', power: 70, cd: 0, boss: true, tell: 'The hollow fills with drifting gold dust. Spore Bloom is coming!', desc: 'A cloud of spores that lowers your attack. A heal clears it.' },
    archiveseal:   { name: 'Archive Seal', el: 'metal', type: 'dmg', power: 70, cd: 0, boss: true, tell: 'Every shelf in the Archive slides shut. Archive Seal is coming!', desc: 'Files you away: no special abilities on your next turn.', fx: { k: 'silence', p: 1, n: 2 } },
    embercanopy:   { name: 'Ember Canopy', el: 'fire', type: 'dmg', power: 72, cd: 0, boss: true, tell: 'The terraces glow orange from below. Ember Canopy is coming!', desc: 'Burning glowworm light rains down. Burns the target.', fx: { k: 'burn', p: 1, n: 3 } },
    twineclipse:   { name: 'Twin Eclipse', el: 'light', type: 'dmg', power: 84, cd: 0, boss: true, neutral: true, tell: 'Light and shadow fold together over the shrine. Twin Eclipse is coming!', desc: 'Light and shadow at once. Never resisted, but a guard blocks most of it.' },
    tidalhymn:     { name: 'Tidal Hymn', el: 'water', type: 'dmg', power: 74, cd: 0, boss: true, tell: 'The Moonwell rises without a ripple. Tidal Hymn is coming!', desc: 'A slow, enormous wave that sings as it breaks.' },
    crownofthorns: { name: 'Crown of Thorns', el: 'nature', type: 'dmg', power: 90, cd: 0, boss: true, tell: 'Every root on the island lifts at once. Crown of Thorns is coming!', desc: 'The Elder Root closes around the field.' },
    /* Phase 19C: Obsidian Reach guardians' charged moves (approved in Phase 19A). Existing effects only: burn, soak
       (chilled: slower), silence, lowered attack, never resisted. Telegraphed a turn ahead; a guard blocks three-quarters
       and, since Phase 18D, always goes up before the blow lands, whatever the speeds; a stun while charging staggers;
       a soaked guardian holds its charge a turn. Cold Quench chills (soak) and never stuns: the stunning draft was rejected. */
    ashfall:        { name: 'Ashfall', el: 'fire', type: 'dmg', power: 76, cd: 0, boss: true, tell: 'The sky goes grey and starts to fall. Ashfall is coming!', desc: 'Hot ash settles on everything. Burns the target. Guard it; a heal clears the burn.', fx: { k: 'burn', p: 1, n: 2 } },
    moltenglaze:    { name: 'Molten Glaze', el: 'fire', type: 'weaken', power: 72, cd: 0, boss: true, tell: 'The Glassblower draws a long, glowing breath. Molten Glaze is coming!', desc: 'A coat of hot glass that lowers your attack. Guard it; a heal clears it.' },
    cinderdive:     { name: 'Cinder Dive', el: 'fire', type: 'dmg', power: 80, cd: 0, boss: true, tell: 'The Matriarch folds her wings and drops. Cinder Dive is coming!', desc: 'A burning dive from the top of the columns. Guard it, or stun her while she climbs.' },
    coldquench:     { name: 'Cold Quench', el: 'water', type: 'dmg', power: 70, cd: 0, boss: true, tell: 'Every pool goes still and starts to hiss. Cold Quench is coming!', desc: 'Plunges you into the quench. Chilled: slower for two turns, so you may act second. Guard it; a heal warms you up.', fx: { k: 'soak', p: 1, n: 2 } },
    blackout:       { name: 'Blackout', el: 'dark', type: 'dmg', power: 72, cd: 0, boss: true, tell: 'The last lamp in the gallery goes out. Blackout is coming!', desc: 'Total dark: no special abilities on your next turn (your basic move still works). Guard it; a heal clears it.', fx: { k: 'silence', p: 1, n: 2 } },
    nightglass:     { name: 'Night Glass', el: 'dark', type: 'dmg', power: 84, cd: 0, boss: true, neutral: true, tell: 'Every mirror in the gallery turns to face you. Night Glass is coming!', desc: 'Your own reflection strikes back. Never resisted, but a guard blocks most of it.' },
    shatterlight:   { name: 'Shatterlight', el: 'light', type: 'dmg', power: 78, cd: 0, boss: true, tell: 'The crystals ring, higher and higher. Shatterlight is coming!', desc: 'A note that breaks into light. Dark resists it; a guard blocks most of it.' },
    ashbloom:       { name: 'Ashbloom', el: 'nature', type: 'weaken', power: 74, cd: 0, boss: true, tell: 'Grey blossom drifts down like snow. Ashbloom is coming!', desc: 'Ash-pollen that lowers your attack. Guard it; a heal clears it.' },
    furnacedraught: { name: 'Furnace Draught', el: 'wind', type: 'dmg', power: 78, cd: 0, boss: true, tell: 'The bellows fill until the leather creaks. Furnace Draught is coming!', desc: 'A blast of forge air. Burns the target. Guard it; a heal clears the burn.', fx: { k: 'burn', p: 1, n: 2 } },
    // Phase 19D: the Magenta Hollows' echo (see echoAfter in rules.js): Shatterlight rung back at under half power
    crystalecho:    { name: 'Crystal Echo', el: 'light', type: 'dmg', power: 72, cd: 0, boss: true, tell: 'Shatterlight hit unguarded, and the crystals ring it back. Crystal Echo is coming!', desc: 'When Shatterlight lands unguarded, the crystals answer it with a weaker copy. Guard Shatterlight and they stay quiet; or guard the echo, or stun the guardian while the crystals ring.' },
    heartofforge:   { name: 'Heart of the Forge', el: 'earth', type: 'dmg', power: 92, cd: 0, boss: true, tell: 'The core flares white. Heart of the Forge is coming!', desc: 'The whole forge, at once. Guard it, or soak the core to make it sputter. Water answers Earth.' },
  });

  /* ---------- boss mechanics (read by the battle engine) ----------
     barrier: when its health first drops below each threshold, the boss spends its next turn raising a barrier that
              absorbs damage. Special abilities (those with a cooldown) crack a barrier twice as fast.
     prism:   every `every` turns its element shifts to the next in `els` (announced a turn ahead). */
  D.BOSS_MECHS = {
    barrier: { name: 'Stone Barrier', desc: 'Raises a barrier at two health thresholds. Special abilities crack it twice as fast.' },
    prism: { name: 'Prism Shift', desc: 'Its element keeps shifting. Watch the colour and change your approach.' },
    echo: { name: 'Crystal Echo', desc: 'If its charged move lands unguarded, the crystals ring it back as a weaker echo. Guard the first one and they stay quiet.' }, // Phase 19D
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

  /* Phase 18C: a Verdant dungeon's nine ordinary battles. Levels follow Starter Island's pattern around the recommended
     level: rec-3, rec-3, rec-2 | rec-2, rec-1, rec-1 | rec, rec, rec. Foes take the form their level calls for (second
     form from 12, third from 22), as your own Aminas do. env: backdrops per section; clues: a line on battles 1, 4, 7. */
  const vform = (spId, lv) => { const sp = D.SPECIES[spId], L = sp && D.LINES && D.LINES[sp.line]; if (!L) return spId; const want = lv >= 22 ? 3 : lv >= 12 ? 2 : 1; return want > sp.stage ? L.ids[want - 1] : spId; };
  function vnine(foes, rec, envs, clues) {
    const lvs = [rec - 3, rec - 3, rec - 2, rec - 2, rec - 1, rec - 1, rec, rec, rec];
    return foes.map((f, i) => { const o = typeof f === 'string' ? { sp: f } : Object.assign({}, f); o.lv = lvs[i] + (o.dl || 0); delete o.dl; o.sp = vform(o.sp, o.lv); o.env = envs[Math.min(2, Math.floor(i / 3))];
      if (clues && clues[Math.floor(i / 3)] && i % 3 === 0) o.clue = clues[Math.floor(i / 3)]; return o; });
  }
  const vboss = (o, rec) => Object.assign({ lv: rec + 3, boss: true, scale: 1.5 }, o, { sp: vform(o.sp, rec + 3) });

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
      first: { gold: 150, food: 40, gems: 5 }, repeat: { gold: 50, food: 15 }, // Phase 17B: was 150/40/5 gems on every clear
      rewardText: 'First clear: 150 gold, 40 food, 5 gems and Gaiaroki II. Second clear: Sylvaneer II. Replays: 50 gold, 15 food.',
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
      battles: nine(['pyrokai', 'pyrocell', 'emberix', 'pyrokai', 'igniflare'], 8, 10).concat([{ sp: 'pyroforge', lv: 11, boss: true, title: 'The Kiln Mother', hpMult: 1.55, scale: 1.5, move: 'kilnflare' }]), // Phase 17B: level 12 -> 11 (the spike)
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
      first: { gold: 420, food: 100, gems: 12 }, repeat: { gold: 140, food: 35 }, // Phase 17B: was 420/100/12 gems on every clear
      rewardText: 'First clear: 420 gold, 100 food, 12 gems and Meta. Replays: 140 gold, 35 food.',
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
      first: { gold: 900, food: 220, gems: 25 }, repeat: { gold: 250, food: 55 }, // Phase 17B: was 900/220/25 gems on every clear
      rewardText: 'First clear: 900 gold, 220 food, 25 gems and Atem. Replays: 250 gold, 55 food.',
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

    /* ======================= Phase 18C: the Verdant Wilds (Overgrown Commonwealth) =======================
       Ten dungeons, recommended levels 22 to 36 (Band C, level cap 40). Each opens when the one before is cleared; the
       first opens when the island is reached. The island's foes carry a tier (D.CAMPAIGN.verdant.foeTier), tuned per
       battle with `tune` after simulation (tools/p18c-sim.js). */
    v_mossgate: {
      name: 'The Mossgate Steps', island: 'verdant', el: 'earth', playable: true, tune: {hp: 0.95}, recommended: 22, env: 'v_mossgate',
      theme: 'Overgrown stone stairs from the landing to the first terrace. Roots have lifted every step, and nobody has put them back.',
      unlock: {}, unlockText: 'Reach the Verdant Wilds.',
      battles: vnine(['gaiaroki', 'terraflora', 'acinus', 'gaiaroki', 'pyrocell', 'terraflora', 'gaiaroki', 'pyrocell', 'terraflora'], 22, ['v_mossgate', 'v_mossgate', 'v_mossgate'],
        ['The steps are cut in two sizes: tall ones, and small ones beside them, worn smooth by small feet.', 'A root has lifted a whole flight of steps and set it down again, slightly to the left.', 'At the top, a gate of moss. It opens for you. It does not seem pleased about it.'])
        .concat([vboss({ sp: 'gaiaroki', title: 'The Moss Bastion', hpMult: 1.6, move: 'rootcrush', tune: { atk: 0.85 } }, 22)]),
      sections: sec({ name: 'The Landing Stair', first: { gold: 140, food: 30 } }, { name: 'The Lifted Flight', first: { gold: 150, food: 32 } }, { name: 'The First Terrace', first: { gold: 160, food: 34 } }, { name: 'The Moss Gate', first: { gems: 4 } }),
      first: { gold: 900, food: 200, gems: 6 }, repeat: { gold: 220, food: 50 },
      rewardText: 'First clear: 900 gold, 200 food, 6 gems. Replays: 220 gold, 50 food.',
    },
    v_aqueduct: {
      name: 'The Drowned Aqueduct', island: 'verdant', el: 'water', playable: true, recommended: 24, env: 'v_aqueduct',
      theme: 'Sluices and channels under the great arches. Half of the aqueduct runs under water, and all of it still works.',
      unlock: {}, unlockText: 'Clear the Mossgate Steps.',
      battles: vnine(['kairyu', 'cannonis', 'aquaflora', 'sylvaneer', 'kairyu', 'cannonis', 'kairyu', 'aquaflora', 'cannonis'], 24, ['v_aqueduct', 'v_aqueduct', 'v_aqueduct'],
        ['Three streams run side by side in stone channels, each at its own speed. Somebody measured them.', 'The water carries a sound like voices. Two names, worn down until only their shapes are left.', 'Every sluice gate has two handles: one high, one low.'])
        .concat([vboss({ sp: 'kairyu', title: 'The Sluice Warden', hpMult: 1.65, move: 'floodgate' }, 24)]),
      sections: sec({ name: 'The Dry Channel', first: { gold: 150, food: 34 } }, { name: 'The Singing Streams', first: { gold: 160, food: 36 } }, { name: 'Under the Arches', first: { gold: 170, food: 38 } }, { name: 'The Great Sluice', first: { gems: 4 } }),
      first: { gold: 1000, food: 220, gems: 6 }, repeat: { gold: 240, food: 55 },
      rewardText: 'First clear: 1,000 gold, 220 food, 6 gems. Replays: 240 gold, 55 food.',
    },
    v_spore: {
      name: 'Spore Hollow', island: 'verdant', el: 'nature', playable: true, recommended: 25, env: 'v_spore',
      theme: 'A sunken glade under the western canopy. Giant glowcaps breathe out gold spores that glow after dusk.',
      unlock: {}, unlockText: 'Clear the Drowned Aqueduct.',
      battles: vnine(['acinus', 'sylvaneer', 'terraflora', 'acinus', 'voltar', 'terraflora', 'acinus', 'sylvaneer', 'terraflora'], 25, ['v_spore', 'v_spore', 'v_spore'],
        ['The spores settle on your sleeve and glow there, like they have found somewhere to sit.', 'A Kind Soul hums as you pass. It sounds like a lullaby, sung in two different keys.', 'Old baskets under the glowcaps, the kind used for gathering. Some are very small.'])
        .concat([vboss({ sp: 'acinus', title: 'The Spore Mother', hpMult: 1.65, move: 'sporebloom' }, 25)]),
      sections: sec({ name: 'The Glowcap Rim', first: { gold: 160, food: 36 } }, { name: 'The Drifts', first: { gold: 170, food: 38 } }, { name: 'The Deep Glade', first: { gold: 180, food: 40 } }, { name: 'The Mother Cap', first: { gems: 5 } }),
      first: { gold: 1100, food: 240, gems: 8 }, repeat: { gold: 260, food: 55 },
      rewardText: 'First clear: 1,100 gold, 240 food, 8 gems. Replays: 260 gold, 55 food.',
    },
    v_archive: {
      name: 'The Ivy Archive', island: 'verdant', el: 'metal', playable: true, tune: {hp: 1.15}, recommended: 27, env: 'v_archive', scene: 'v_keepers',
      theme: 'The vaults beneath the shelves on the north shore. A mechanical archivist is still filing the tablets, very slowly.',
      unlock: {}, unlockText: 'Clear Spore Hollow.',
      battles: vnine(['zeep', 'voltar', 'umbrit', 'zeep', 'voltar', 'zeep', 'umbrit', 'zeep', 'voltar'], 27, ['v_archive', 'v_archive', 'v_archive'],
        ['Tablets in rows, each with a tag of woven ivy. The knots are a filing system.', 'One shelf is labelled in two hands: one neat, one with paw-prints for punctuation.', 'A tablet lies face-down on the floor. It is the only thing in the Archive that has not been filed.'])
        .concat([vboss({ sp: 'zeep', title: 'The Archivist', hpMult: 1.7, move: 'archiveseal' }, 27)]),
      sections: sec({ name: 'The Reading Room', first: { gold: 170, food: 38 } }, { name: 'The Stacks', first: { gold: 180, food: 40 } }, { name: 'The Sealed Vault', first: { gold: 190, food: 42 } }, { name: 'The Archivist’s Desk', first: { gems: 5 } }),
      first: { gold: 1250, food: 260, gems: 8 }, repeat: { gold: 280, food: 60 },
      rewardText: 'First clear: 1,250 gold, 260 food, 8 gems. Replays: 280 gold, 60 food.',
    },
    v_glow: {
      name: 'The Glowworm Terraces', island: 'verdant', el: 'fire', playable: true, tune: {hp: 1.15}, recommended: 28, env: 'v_glow',
      theme: 'South-facing terraced gardens lit by glowworm fire. Warm and orange at night, and quietly on fire most of the day.',
      unlock: {}, unlockText: 'Clear the Ivy Archive.',
      battles: vnine(['igniflare', 'pyrokai', 'emberix', 'pyrospark', 'igniflare', 'emberix', 'pyrokai', 'igniflare', 'pyrospark'], 28, ['v_glow', 'v_glow', 'v_glow'],
        ['Lanterns line every terrace, two kinds side by side: clear glass and dark glass.', 'The glowworms keep the terraces warm. Somebody built little roofs for them.', 'Halfway up, the dark-glass lanterns stop. Only the clear ones go on.'])
        .concat([vboss({ sp: 'igniflare', title: 'The Lantern Wyrm', hpMult: 1.7, move: 'embercanopy' }, 28)]),
      sections: sec({ name: 'The Lower Terrace', first: { gold: 180, food: 40 } }, { name: 'The Lantern Rows', first: { gold: 190, food: 42 } }, { name: 'The Upper Terrace', first: { gold: 200, food: 44 } }, { name: 'The Wyrm’s Lamp', first: { gems: 5 } }),
      first: { gold: 1400, food: 280, gems: 10 }, repeat: { gold: 300, food: 65 },
      rewardText: 'First clear: 1,400 gold, 280 food, 10 gems. Replays: 300 gold, 65 food.',
    },
    v_twinshrine: {
      name: 'The Twin Shrine', island: 'verdant', el: 'light', playable: true, recommended: 30, env: 'v_twinshrine', scene: 'v_shrine',
      theme: 'The halls under the split temple. Half of every room is pale stone, half is dark glass, and the stream runs between.',
      unlock: {}, unlockText: 'Clear the Glowworm Terraces.',
      battles: vnine(['lumifern', 'umbrit', 'lumi', 'voltar', 'lumifern', 'umbrit', 'lumi', 'umbrit', 'umbrit'], 30, ['v_twinshrine', 'v_twinshrine', 'v_twinshrine'],
        ['The light half and the dark half meet in a perfectly straight line. Nobody built it crooked, not even a little.', 'In the dark half, the glass shows your reflection a moment too late.', 'Footbridges cross the stream every few steps. Somebody wanted it to be easy to cross.'])
        .concat([vboss({ sp: 'lumifern', title: 'The Dawn Warden', hpMult: 1.8, move: 'twineclipse', mech: { type: 'prism', every: 2, els: ['light', 'dark'] } }, 30)]),
      sections: sec({ name: 'The Pale Hall', first: { gold: 190, food: 42 } }, { name: 'The Glass Hall', first: { gold: 200, food: 44 } }, { name: 'The Bridges', first: { gold: 210, food: 46 } }, { name: 'The Broken Panel', first: { gems: 6 } }),
      first: { gold: 1600, food: 300, gems: 12 }, repeat: { gold: 320, food: 70 },
      rewardText: 'First clear: 1,600 gold, 300 food, 12 gems. Replays: 320 gold, 70 food.',
    },
    v_canopy: {
      name: 'The Canopy Walk', island: 'verdant', el: 'wind', playable: true, tune: {hp: 1.12, atk: 1.04}, recommended: 31, env: 'v_canopy', scene: 'v_spire',
      theme: 'Rope bridges between the tallest trees of the north. The wind lives up here, and does not get many visitors.',
      unlock: {}, unlockText: 'Clear the Twin Shrine.',
      battles: vnine(['zephyr', 'pyrospark', 'zephyr', 'lumi', 'zephyr', 'pyrospark', 'zephyr', 'pyrospark', 'zephyr'], 31, ['v_canopy', 'v_canopy', 'v_canopy'],
        ['The bridges sway. The knots holding them are the same knots as the Archive’s tags.', 'A platform with two seats: one for sitting, one for perching.', 'From here you can see the sea on every side. And something across it, glowing.'])
        .concat([vboss({ sp: 'zephyr', title: 'The Canopy Squall', hpMult: 1.8, move: 'galeforce' }, 31)]),
      sections: sec({ name: 'The Low Bridges', first: { gold: 200, food: 44 } }, { name: 'The Swaying Platforms', first: { gold: 210, food: 46 } }, { name: 'The Crown of the Trees', first: { gold: 220, food: 48 } }, { name: 'The Squall’s Perch', first: { gems: 6 } }),
      first: { gold: 1800, food: 330, gems: 10 }, repeat: { gold: 340, food: 75 },
      rewardText: 'First clear: 1,800 gold, 330 food, 10 gems. Replays: 340 gold, 75 food.',
    },
    v_moonwell: {
      name: 'The Moonwell', island: 'verdant', el: 'water', playable: true, tune: {hp: 0.88}, recommended: 33, env: 'v_moonwell',
      theme: 'A flooded grotto under the western lake. The pool is perfectly still, and its reflections show the wrong sky.',
      unlock: {}, unlockText: 'Clear the Canopy Walk.',
      battles: vnine(['aquaflora', 'voltar', 'kairyu', 'umbrit', 'aquaflora', 'voltar', 'aquaflora', 'umbrit', 'aquaflora'], 33, ['v_moonwell', 'v_moonwell', 'v_moonwell'],
        ['The water is so still it looks solid. It is not. You check.', 'In the reflection, the cave has a different ceiling. It has stars.', 'Down here, even the Kind Souls whisper.'])
        .concat([vboss({ sp: 'aquaflora', title: 'The Moonwell Serpent', hpMult: 1.6, move: 'tidalhymn' }, 33)]),
      sections: sec({ name: 'The Lake Stair', first: { gold: 210, food: 46 } }, { name: 'The Reflections', first: { gold: 220, food: 48 } }, { name: 'The Still Pool', first: { gold: 230, food: 50 } }, { name: 'The Well’s Heart', first: { gems: 7 } }),
      first: { gold: 2000, food: 360, gems: 12 }, repeat: { gold: 360, food: 80 },
      rewardText: 'First clear: 2,000 gold, 360 food, 12 gems. Replays: 360 gold, 80 food.',
    },
    v_choir: {
      name: 'The Choir of Roots', island: 'verdant', el: 'resonance', playable: true, tune: {hp: 1.0}, recommended: 34, env: 'v_choir', scene: 'v_voice',
      theme: 'Down among the roots of the singing stones. Every root on the island seems to grow towards them.',
      unlock: {}, unlockText: 'Clear the Moonwell.',
      battles: vnine(['aimza', 'sylvaneer', 'aimza', 'terraflora', 'aimza', 'zeep', 'aimza', 'sylvaneer', 'aimza'], 34, ['v_choir', 'v_choir', 'v_choir'],
        ['The stones hum in a chord. You find yourself humming along, slightly flat.', 'Roots wrap the stones gently, the way you would hold something you were afraid to drop.', 'The chord is louder here. It has more notes than it should.'])
        .concat([vboss({ sp: 'aimza', title: 'The Third Voice', hpMult: 1.9, move: 'resonantcollapse' }, 34)]),
      sections: sec({ name: 'The Outer Ring', first: { gold: 220, food: 48 } }, { name: 'The Root Chamber', first: { gold: 230, food: 50 } }, { name: 'The Chord', first: { gold: 240, food: 52 } }, { name: 'The Gap in the Song', first: { gems: 8 } }),
      first: { gold: 2300, food: 400, gems: 15 }, repeat: { gold: 380, food: 85 },
      rewardText: 'First clear: 2,300 gold, 400 food, 15 gems. Replays: 380 gold, 85 food.',
    },
    v_elderroot: {
      name: 'The Elder Root', island: 'verdant', el: 'nature', playable: true, tune: {hp: 1.12, atk: 1.06}, recommended: 36, env: 'v_elderroot', scene: 'v_crown',
      theme: 'Inside the oldest tree on the island, where every stream ends. The door between its roots was shut from the inside.',
      unlock: {}, unlockText: 'Clear the Choir of Roots.',
      battles: vnine(['sylvaneer', 'terraflora', 'acinus', 'aimza', 'sylvaneer', 'acinus', 'terraflora', 'sylvaneer', 'terraflora'], 36, ['v_elderroot', 'v_elderroot', 'v_elderroot'],
        ['Inside, the tree is bigger than outside. You decide not to think about that.', 'The roots carry water upward, every stream on the island, all of it arriving here.', 'Ahead, antlers. Very large ones.'])
        .concat([vboss({ sp: 'sylvaneer', title: 'The Forest Crown', hpMult: 2.25, scale: 1.75, islandBoss: true, move: 'crownofthorns', mech: { type: 'barrier', at: [0.66, 0.33], amt: 0.18 } }, 36)]),
      sections: sec({ name: 'The Root Door', first: { gold: 260, food: 55 } }, { name: 'The Rising Water', first: { gold: 280, food: 60 } }, { name: 'The Inner Ring', first: { gold: 300, food: 65 } }, { name: 'The Crown', first: { gems: 15 } }),
      first: { gold: 4000, food: 600, gems: 30 }, repeat: { gold: 450, food: 90 },
      rewardText: 'Island Boss. First clear: 4,000 gold, 600 food, 30 gems. Replays: 450 gold, 90 food.',
    },

    /* ======================= Phase 19C: Obsidian Reach (the Cooling Forge) =======================
       Ten dungeons, recommended levels 38 to 47 (the level-cap-50 band approved in Phase 19A). Each opens when the one
       before is cleared; the first when the Forest Crown has fallen and the island is reached. Foes are existing species
       in the form their level calls for (third forms from 22); no new species and no legendary foes. The island's foes
       carry a tier (D.CAMPAIGN.obsidian.foeTier, from ×1.3 HP / ×1.18 attack), tuned per dungeon and per battle with
       `tune` after simulation (tools/p19c-sim.js). Cells: docs/PHASE19B.md. */
    o_cinder: {
      tune: { hp: 1.2 }, // Phase 19C tuning (tools/p19c-tune.js, tools/p19c-sim.js)
      name: 'The Cinder Steps', island: 'obsidian', el: 'fire', playable: true, recommended: 38, env: 'o_cinder',
      theme: 'Basalt steps from the black-sand landing up into the ash, warm underfoot. Every tenth step has a lantern hook.',
      unlock: { islandBoss: 'verdant' }, unlockText: 'Defeat the Forest Crown, then reach Obsidian Reach.',
      battles: vnine(['pyrokai', 'gaiaroki', 'emberix', 'pyrocell', 'pyrokai', 'gaiaroki', 'emberix', 'pyrokai', 'pyrocell'], 38, ['o_cinder', 'o_cinder', 'o_cinder'],
        ['The steps come in two sizes again. Here the small ones are scorched black, and the large ones are not.', 'A lantern hook every ten steps. Every hook is empty, and every one has been polished.', 'At the top, the ash thins. Somewhere ahead, a square, and the smell of hot glass.'])
        .concat([vboss({ sp: 'pyrokai', title: 'The Cinder Warden', hpMult: 1.6, move: 'ashfall' }, 38)]),
      sections: sec({ name: 'The Black Sand Stair', first: { gold: 260, food: 50 } }, { name: 'The Lantern Hooks', first: { gold: 270, food: 52 } }, { name: 'The Ash Line', first: { gold: 280, food: 54 } }, { name: 'The Warden’s Landing', first: { gems: 6 } }),
      first: { gold: 2200, food: 420, gems: 10 }, repeat: { gold: 500, food: 95 },
      rewardText: 'First clear: 2,200 gold, 420 food, 10 gems. Replays: 500 gold, 95 food.',
    },
    o_kilns: {
      tune: { hp: 1.1 }, // Phase 19C tuning (tools/p19c-tune.js, tools/p19c-sim.js)
      name: 'The Glasswick Kilns', island: 'obsidian', el: 'fire', playable: true, recommended: 39, env: 'o_kilns', scene: 'o_kilns',
      theme: 'Two rows of glass kilns behind Glasswick, one fired pale, one fired dark. Half-finished panes still stand in the racks.',
      unlock: {}, unlockText: 'Clear the Cinder Steps.',
      battles: vnine(['emberix', 'lumi', 'igniflare', 'emberix', 'voltar', 'igniflare', 'lumi', 'emberix', 'igniflare'], 39, ['o_kilns', 'o_kilns', 'o_kilns'],
        ['Two rows of kilns face each other across the yard. One row is streaked pale, the other soot-dark.', 'Racks of unfinished panes, sorted by colour. Somebody labelled every rack in two hands.', 'The last kiln is still warm. Nobody has fed it for an age, and it does not seem to have noticed.'])
        .concat([vboss({ sp: 'emberix', title: 'The Glassblower', hpMult: 1.62, move: 'moltenglaze', mech: { type: 'prism', every: 2, els: ['fire', 'light'], kilns: true } }, 39)]),
      sections: sec({ name: 'The Kiln Yard', first: { gold: 270, food: 52 } }, { name: 'The Racks', first: { gold: 280, food: 54 } }, { name: 'The Pale Row and the Dark', first: { gold: 290, food: 56 } }, { name: 'The Last Kiln', first: { gems: 6 } }),
      first: { gold: 2400, food: 440, gems: 10 }, repeat: { gold: 520, food: 95 },
      rewardText: 'First clear: 2,400 gold, 440 food, 10 gems. Replays: 520 gold, 95 food.',
    },
    o_rookery: {
      name: 'The Basalt Rookery', island: 'obsidian', el: 'fire', playable: true, recommended: 40, env: 'o_rookery',
      theme: 'Basalt columns on the west ridge, honeycombed with nests. Something large keeps them warm.',
      unlock: {}, unlockText: 'Clear the Glasswick Kilns.',
      battles: vnine(['pyrospark', 'zephyr', 'voltar', 'pyrospark', 'zephyr', 'umbrit', 'pyrospark', 'zephyr', 'voltar'], 40, ['o_rookery', 'o_rookery', 'o_rookery'],
        ['The nests are woven from glass thread: pale strands and dark strands, twisted together.', 'Feathers stuck in the basalt like pins. Some of them are still warm.', 'Higher up, the nests get bigger. Much bigger. The wind up here smells of smoke.'])
        .concat([vboss({ sp: 'pyrospark', title: 'The Rookery Matriarch', hpMult: 1.62, move: 'cinderdive' }, 40)]),
      sections: sec({ name: 'The Column Foot', first: { gold: 280, food: 54 } }, { name: 'The Glass Nests', first: { gold: 290, food: 56 } }, { name: 'The High Ledges', first: { gold: 300, food: 58 } }, { name: 'The Matriarch’s Crown', first: { gems: 7 } }),
      first: { gold: 2600, food: 460, gems: 10 }, repeat: { gold: 540, food: 100 },
      rewardText: 'First clear: 2,600 gold, 460 food, 10 gems. Replays: 540 gold, 100 food.',
    },
    o_quench: {
      field: { type: 'steam', every: 3, n: 1 }, // Phase 19D: steam vents in every battle (rules.js endOfTurn)
      tune: { hp: 0.9, atk: 0.92 }, // the spike found in Phase 19A (threshold at rec); see docs/PHASE19C.md // Phase 19C tuning (tools/p19c-tune.js, tools/p19c-sim.js)
      name: 'The Quench Pools', island: 'obsidian', el: 'water', playable: true, recommended: 41, env: 'o_quench',
      theme: 'Steaming pools where hot glass was cooled. The water hisses whenever anything warm comes near.',
      unlock: {}, unlockText: 'Clear the Basalt Rookery.',
      battles: vnine(['cannonis', 'kairyu', 'aquaflora', 'pyrocell', { sp: 'cannonis', tune: { hp: 0.88 } }, { sp: 'kairyu', tune: { hp: 0.85 } }, 'aquaflora', 'cannonis', 'pyrocell'], 41, ['o_quench', 'o_quench', 'o_quench'],
        ['Steam lies on the pools like a lid. Under it, the water is perfectly clear and very cold.', 'A row of iron tongs on hooks, long ones and short ones, all of them bent the same way.', 'One pool was drained long ago. Something round and very large once lay on its floor.'])
        .concat([vboss({ sp: 'cannonis', title: 'The Quenchwarden', hpMult: 1.65, move: 'coldquench', tune: { hp: 0.92, atk: 0.86 } }, 41)]),
      sections: sec({ name: 'The Steam Line', first: { gold: 290, food: 56 } }, { name: 'The Tong Racks', first: { gold: 300, food: 58 } }, { name: 'The Drained Pool', first: { gold: 310, food: 60 } }, { name: 'The Cold Basin', first: { gems: 8 } }),
      first: { gold: 2800, food: 480, gems: 12 }, repeat: { gold: 560, food: 100 },
      rewardText: 'First clear: 2,800 gold, 480 food, 12 gems. Replays: 560 gold, 100 food.',
    },
    o_seams: {
      name: 'The Deep Seams', island: 'obsidian', el: 'metal', playable: true, recommended: 42, env: 'o_seams',
      theme: 'Mine galleries under the central ridge. The lamps were all taken; something down here eats light.',
      unlock: {}, unlockText: 'Clear the Quench Pools.',
      battles: vnine(['voltar', 'zeep', 'pyrocell', 'voltar', 'umbrit', 'zeep', 'voltar', 'pyrocell', 'zeep'], 42, ['o_seams', 'o_seams', 'o_seams'],
        ['Ore carts in two lines: pale ore in one, dark ore in the other. Someone was very tidy.', 'Every lamp bracket is empty. Not broken. Emptied, one after another, all the way down.', 'The dark ahead is thicker than dark ought to be. It moves when you are not looking at it.'])
        .concat([vboss({ sp: 'voltar', title: 'The Lamp-Eater', hpMult: 1.65, move: 'blackout' }, 42)]),
      sections: sec({ name: 'The Ore Carts', first: { gold: 300, food: 58 } }, { name: 'The Empty Brackets', first: { gold: 310, food: 60 } }, { name: 'The Deep Gallery', first: { gold: 320, food: 62 } }, { name: 'The Lamp-Eater’s Den', first: { gems: 8 } }),
      first: { gold: 3000, food: 500, gems: 12 }, repeat: { gold: 580, food: 105 },
      rewardText: 'First clear: 3,000 gold, 500 food, 12 gems. Replays: 580 gold, 105 food.',
    },
    o_gallery: {
      tune: { hp: 0.85 }, // Phase 19C tuning (tools/p19c-tune.js, tools/p19c-sim.js)
      name: 'The Mirror Gallery', island: 'obsidian', el: 'dark', playable: true, recommended: 43, env: 'o_gallery', scene: 'o_mould',
      theme: 'The finishing hall on the central ridge: every pane that passed inspection hung here to be judged. Most are cracked.',
      unlock: {}, unlockText: 'Clear the Deep Seams.',
      battles: vnine(['umbrit', 'lumifern', 'lumi', 'voltar', 'umbrit', 'lumifern', 'voltar', 'lumi', 'lumifern'], 43, ['o_gallery', 'o_gallery', 'o_gallery'],
        ['Frames down both walls, hundreds of them. Your reflection walks beside you in every pane, a moment late.', 'A judging bench with two seats: one high, one low. Both are worn through.', 'At the end of the hall, a covered shape, taller than a door. The cloth over it has not been moved in an age.'])
        .concat([vboss({ sp: 'umbrit', title: 'The Dusk Warden', hpMult: 1.7, move: 'nightglass', mech: { type: 'prism', every: 2, els: ['dark', 'light'] } }, 43)]),
      sections: sec({ name: 'The Long Hall', first: { gold: 320, food: 60 } }, { name: 'The Judging Bench', first: { gold: 330, food: 62 } }, { name: 'The Covered Frame', first: { gold: 340, food: 64 } }, { name: 'The Last Mirror', first: { gems: 9 } }),
      first: { gold: 3400, food: 540, gems: 15 }, repeat: { gold: 600, food: 110 },
      rewardText: 'First clear: 3,400 gold, 540 food, 15 gems. Replays: 600 gold, 110 food.',
    },
    o_hollows: {
      name: 'The Magenta Hollows', island: 'obsidian', el: 'resonance', playable: true, recommended: 44, env: 'o_hollows', scene: 'o_crystals',
      theme: 'Crystal caves under the north cliffs, at the top of the central path. The magenta crystals keep every sound ever made near them.',
      unlock: {}, unlockText: 'Clear the Mirror Gallery.',
      battles: vnine(['aimza', 'lumi', 'zeep', 'aimza', 'voltar', 'lumi', 'aimza', 'zeep', 'lumi'], 44, ['o_hollows', 'o_hollows', 'o_hollows'],
        ['The crystals hum back whatever you say, a little later and a little sadder.', 'Footsteps echo that are not yours. Two sets, one heavy, one light, walking together.', 'Deeper in, the hum turns into a sound. You would rather it had stayed a hum.'])
        .concat([vboss({ sp: 'lumi', title: 'The Lantern Below', hpMult: 1.65, move: 'shatterlight', mech: { type: 'echo', move: 'crystalecho' } }, 44)]),
      sections: sec({ name: 'The Humming Mouth', first: { gold: 330, food: 62 } }, { name: 'The Echo Walk', first: { gold: 340, food: 64 } }, { name: 'The Singing Deep', first: { gold: 350, food: 66 } }, { name: 'The Lantern’s Hollow', first: { gems: 9 } }),
      first: { gold: 3700, food: 570, gems: 15 }, repeat: { gold: 620, food: 110 },
      rewardText: 'First clear: 3,700 gold, 570 food, 15 gems. Replays: 620 gold, 110 food.',
    },
    o_orchard: {
      tune: { hp: 1.1 }, // Phase 19C tuning (tools/p19c-tune.js, tools/p19c-sim.js)
      name: 'The Charred Orchard', island: 'obsidian', el: 'nature', playable: true, recommended: 45, env: 'o_orchard',
      theme: 'A burned orchard on the west plain, still fruiting. Ash-grey leaves, magenta blossom.',
      unlock: {}, unlockText: 'Clear the Magenta Hollows.',
      battles: vnine(['terraflora', 'acinus', 'sylvaneer', 'terraflora', 'pyrokai', 'acinus', 'terraflora', 'sylvaneer', 'pyrokai'], 45, ['o_orchard', 'o_orchard', 'o_orchard'],
        ['Black trunks in grey ash, every one of them in flower. Nothing about that is right, and it is very pretty.', 'The rows are uneven, as if two people planted from opposite ends and met in the middle.', 'In the middle row, two trees have grown into one. Nobody pruned them apart.'])
        .concat([vboss({ sp: 'terraflora', title: 'The Ashbloom', hpMult: 1.65, move: 'ashbloom' }, 45)]),
      sections: sec({ name: 'The Grey Rows', first: { gold: 340, food: 64 } }, { name: 'The Uneven Planting', first: { gold: 350, food: 66 } }, { name: 'The Joined Trees', first: { gold: 360, food: 68 } }, { name: 'The Blossom Heart', first: { gems: 10 } }),
      first: { gold: 4000, food: 600, gems: 15 }, repeat: { gold: 640, food: 115 },
      rewardText: 'First clear: 4,000 gold, 600 food, 15 gems. Replays: 640 gold, 115 food.',
    },
    o_bellows: {
      tune: { hp: 1.15 }, // Phase 19C tuning (tools/p19c-tune.js, tools/p19c-sim.js)
      name: 'The Great Bellows', island: 'obsidian', el: 'wind', playable: true, recommended: 46, env: 'o_bellows', scene: 'o_ledger',
      theme: 'Inside the leather lungs on the east ridge that once fed the forge. Some of them still breathe.',
      unlock: {}, unlockText: 'Clear the Charred Orchard.',
      battles: vnine(['zephyr', 'pyrospark', 'igniflare', 'zephyr', 'pyrokai', 'pyrospark', 'zephyr', 'igniflare', 'zeep'], 46, ['o_bellows', 'o_bellows', 'o_bellows'],
        ['The leather breathes in, very slowly, and the whole ridge leans with it.', 'A tally on the iron ribs: two kinds of mark, side by side, counting the same thing.', 'Behind the last lung, a small office with a desk and a chair, and a book left open.'])
        .concat([vboss({ sp: 'zephyr', title: 'The Bellows Wind', hpMult: 1.65, move: 'furnacedraught' }, 46)]),
      sections: sec({ name: 'The First Lung', first: { gold: 350, food: 66 } }, { name: 'The Iron Ribs', first: { gold: 360, food: 68 } }, { name: 'The Bellows Office', first: { gold: 370, food: 70 } }, { name: 'The Last Breath', first: { gems: 10 } }),
      first: { gold: 4400, food: 650, gems: 18 }, repeat: { gold: 660, food: 120 },
      rewardText: 'First clear: 4,400 gold, 650 food, 18 gems. Replays: 660 gold, 120 food.',
    },
    o_forge: {
      tune: { hp: 1.12 }, // Phase 19C tuning (tools/p19c-tune.js, tools/p19c-sim.js)
      name: 'The Heart of the Forge', island: 'obsidian', el: 'earth', playable: true, recommended: 47, env: 'o_forge', scene: 'o_heart',
      theme: 'The Great Forge on the north-east headland: cold everywhere except its core, which has never gone out.',
      unlock: {}, unlockText: 'Clear the Great Bellows.',
      battles: vnine(['pyrocell', 'zeep', 'pyrokai', 'pyrocell', 'emberix', 'zeep', 'pyrocell', 'pyrokai', 'aimza'], 47, ['o_forge', 'o_forge', 'o_forge'],
        ['Anvils in a ring, each with a hammer laid across it, ready. Nobody came back for the hammers.', 'Two moulds on the long bench, a door-shaped gap between them, as if the thing they made was carried out.', 'Ahead, the core. It beats. Slowly. Like something that has been waiting a very long time.'])
        .concat([vboss({ sp: 'pyrocell', title: 'The Forge Heart', hpMult: 1.75, scale: 1.75, islandBoss: true, move: 'heartofforge', mech: { type: 'barrier', at: [0.66, 0.33], amt: 0.18 }, tune: { hp: 0.92, atk: 0.9 } }, 47)]),
      sections: sec({ name: 'The Ring of Anvils', first: { gold: 380, food: 70 } }, { name: 'The Long Bench', first: { gold: 400, food: 75 } }, { name: 'The Core Approach', first: { gold: 420, food: 80 } }, { name: 'The Forge Heart', first: { gems: 18 } }),
      first: { gold: 7000, food: 1000, gems: 40 }, repeat: { gold: 750, food: 130 },
      rewardText: 'Island Boss. First clear: 7,000 gold, 1,000 food, 40 gems and Night Mail. Replays: 750 gold, 130 food.',
    },
  };

  /* ---------- islands (world fragments) ---------- */
  // dungeons: the island's ten dungeons in order; islandBoss: the dungeon whose boss is the Island Boss (always the
  // tenth). next: the island that defeating it unlocks. An island with no dungeons yet is shown honestly as locked.
  D.CAMPAIGN = {
    starter: { dungeons: ['forgottenroad', 'gatheringhall', 'reliquary', 'drownedsteps', 'coldkiln', 'hollowveil', 'lanternorchard', 'windstair', 'resonancescar', 'heartwood'],
      islandBoss: 'heartwood', next: 'verdant', hint: 'Warm stone, old roads, and buildings that were here before anyone remembers.' },
    // Phase 18C: the Verdant Wilds campaign. foeTier: the island's foes are a little tougher than their level alone
    // (Phase 18A recommendation, tuned per battle with `tune`). Its Island Boss would open Obsidian Reach, which stays
    // closed until that island is marked ready (D.ISLAND_LIVE, src/verdant18b.js).
    verdant: { dungeons: ['v_mossgate', 'v_aqueduct', 'v_spore', 'v_archive', 'v_glow', 'v_twinshrine', 'v_canopy', 'v_moonwell', 'v_choir', 'v_elderroot'],
      islandBoss: 'v_elderroot', next: 'obsidian', foeTier: { hp: 1.2, atk: 1.12 }, hint: 'Something green and very old, pressing at the edge of the sanctuary.' },
    // Phase 19C: the Obsidian Reach campaign. Its Island Boss (the Forge Heart) raises the level cap to 60 (R.levelCap)
    // and would open the Celestial Crown, which stays closed until that island is marked ready (D.ISLAND_LIVE).
    obsidian: { dungeons: ['o_cinder', 'o_kilns', 'o_rookery', 'o_quench', 'o_seams', 'o_gallery', 'o_hollows', 'o_orchard', 'o_bellows', 'o_forge'],
      islandBoss: 'o_forge', next: 'celestial', foeTier: { hp: 1.3, atk: 1.18 }, hint: 'Dark stone, and a warmth that does not come from any sun.' },
    celestial: { dungeons: [], islandBoss: null, next: null, hint: 'High up. Higher than an island has any right to be.' },
  };
  /* ---------- Phase 17B: the run-up to each boss ----------
     elites: the third section's foes (battles 7-9) appear in the form their level calls for (second form from level 12,
             third from 22), as the player's own Aminas do, instead of first forms against an evolved party.
     herald: battle 9 rehearses the boss. It carries the boss's charged move (the same telegraph, a guard blocks it),
             or for a barrier boss a single barrier at half health. Species, levels, clues and settings are unchanged. */
  D.DUNGEON17 = { elites: true, herald: true };
  Object.keys(D.DUNGEONS).forEach((id) => {
    const d = D.DUNGEONS[id], boss = d.battles[9], form = (spId, lv) => {
      const s = D.SPECIES[spId], L = s && D.LINES[s.line]; if (!L) return spId;
      const want = lv >= 22 ? 3 : lv >= 12 ? 2 : 1; return want > s.stage ? L.ids[want - 1] : spId;
    };
    d.battles.forEach((b, i) => {
      b.base17 = { sp: b.sp }; // what the battle was before Phase 17B (kept for the simulator and the notes)
      if (D.DUNGEON17.elites && i >= 6 && i <= 8) b.sp = form(b.sp, b.lv);
      if (D.DUNGEON17.herald && i === 8 && boss) {
        if (boss.move) b.move = boss.move;
        else if (boss.mech && boss.mech.type === 'barrier') b.mech = { type: 'barrier', at: [0.5], amt: boss.mech.amt };
        b.herald = true;
      }
    });
  });
  D.DUNGEON_ORDER = [];
  D.ISLAND_ORDER.forEach((iid) => {
    const c = D.CAMPAIGN[iid]; if (!c) return;
    c.dungeons.forEach((id, i) => { const d = D.DUNGEONS[id]; d.id = id; d.island = iid; d.index = i + 1; d.prev = i ? c.dungeons[i - 1] : null; D.DUNGEON_ORDER.push(id); });
  });
  // Phase 19D: a dungeon-wide field effect (the Quench Pools' steam) is carried by each of its battles
  Object.keys(D.DUNGEONS).forEach((id) => { const d = D.DUNGEONS[id]; if (d.field) d.battles.forEach((b) => { if (!b.field) b.field = d.field; }); });
  // Phase 18C: an island's foe tier, stamped on each of its battles (with that battle's own tuning) for R.enemyFromSpec
  D.ISLAND_ORDER.forEach((iid) => {
    const c = D.CAMPAIGN[iid], T = c && c.foeTier; if (!T) return;
    c.dungeons.forEach((id) => { const d = D.DUNGEONS[id]; d.battles.forEach((b) => { const dt = d.tune || {}, t = b.tune || {}; b.tier = { hp: +(T.hp * (dt.hp || 1) * (t.hp || 1)).toFixed(3), atk: +(T.atk * (dt.atk || 1) * (t.atk || 1)).toFixed(3) }; }); });
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
    // Phase 12C: proximity points for hiders. Distances are in metres; the island's scale is taken from the Seeker,
    // who stands 1.36 units tall (an adult of about 1.7 m), so one unit (one island cell) is 1.25 m. Points are added
    // every `tick` seconds of the round clock, `pts` per second for the nearest tier the hider is inside.
    score: { metresPerUnit: 1.25, tick: 0.25, tiers: [{ within: 3, pts: 5, name: 'Very close' }, { within: 8, pts: 3, name: 'Close' }, { within: 15, pts: 1, name: 'In range' }] },
    // Phase 12C: the round camera (radians per pixel dragged, degrees for the tilt limits, seconds of smoothing) and
    // the joystick (radius as a share of the screen height, dead zone and full-speed point as shares of the radius).
    camera: { sens: 0.0065, pitchSens: 0.004, pitch: 30, pitchMin: 20, pitchMax: 68, smooth: 0.07, keyRate: 1.9 },
    stick: { radius: 0.12, min: 38, max: 56, dead: 0.14, full: 0.85, minSpeed: 0.3 },
  };
})(typeof window !== 'undefined' ? window : globalThis);
