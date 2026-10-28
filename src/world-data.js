/* Aminas — world content data (pure data, no DOM): islands, buildings, obstacles, quests, economy tuning.
   Everything a designer would want to rebalance lives here; rules in world.js / quests.js read it, the UI never hard-codes it.
   Loaded after data.js and world-maps.js. */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = A.Data;

  /* =================================================================== ISLANDS
     Starter island is free. Every further island doubles the price: D.ISLAND_BASE_PRICE * 2^(tier-1).
     Adding a fifth island later = add a map + an entry here with the next tier; the price follows automatically. */
  D.ISLAND_BASE_PRICE = 100000;
  D.islandPriceForTier = (tier) => (tier <= 0 ? 0 : D.ISLAND_BASE_PRICE * Math.pow(2, tier - 1));
  D.ISLAND_ORDER = ['starter', 'verdant', 'obsidian', 'celestial'];
  D.ISLANDS = {
    starter: { name: 'Sunlit Sanctuary', tier: 0, el: 'light', short: 'Sanctuary',
      blurb: 'Your first island: a ruined sanctuary waking up under a warm sky. The Dormant Spire watches from the hills.',
      obstacleMult: 1 },
    verdant: { name: 'Verdant Wilds', tier: 1, el: 'nature', short: 'Wilds',
      blurb: 'A lush, overgrown island of ancient roots, mossy ruins, singing streams and plants that glow after dusk.',
      obstacleMult: 6 },
    obsidian: { name: 'Obsidian Reach', tier: 2, el: 'dark', short: 'Reach',
      blurb: 'Black basalt cliffs threaded with magenta crystal and ember-lit ruins. Mysterious, warm, and very quiet.',
      obstacleMult: 12 },
    celestial: { name: 'Celestial Crown', tier: 3, el: 'resonance', short: 'Crown',
      blurb: 'A high island above the clouds: luminous gardens, drifting stone fragments and an observatory older than the Entity.',
      obstacleMult: 24 },
  };
  // Derived per-island terrain flags (from the ASCII map in world-maps.js). Kept as arrays so placement checks are O(1).
  D.ISLAND_ORDER.forEach((id, i) => {
    const isl = D.ISLANDS[id], map = D.MAPS[id];
    isl.id = id; isl.order = i; isl.price = D.islandPriceForTier(isl.tier);
    isl.grid = { w: map[0].length, h: map.length };
    isl.map = map;
    isl.land = map.map((row) => row.split('').map((c) => c !== '~' && c !== 'w'));
    isl.buildable = map.map((row) => row.split('').map((c) => c === 'g'));
  });

  /* =================================================================== BUILDINGS
     cat: story (restorable ruins on the starter island) | habitat | production | decor
     w,h: footprint in grid cells (rotation swaps them). levels[i] is level i+1:
       cost {gold,food,gems}, time (seconds, scaled by the timer setting), and effects:
       rate (per minute; per resident for perResident buildings), capMin (minutes of production the building can hold),
       capacity (residents), eggTime (hatchery incubation multiplier), rewardMult (dungeon clear reward multiplier). */
  const L = (gold, time, fx) => Object.assign({ cost: { gold }, time }, fx || {});
  D.BUILDINGS = {
    // ---------- story buildings (start as ruins; restoring = building level 1) ----------
    hollow: { name: 'Sunlit Hollow', cat: 'story', story: true, w: 3, h: 3, canMove: true, canStore: false,
      produces: 'food', perResident: true, affinity: ['nature', 'light'], art: 'hollow',
      desc: 'A cracked stone alcove with a patch of sun. Your companion lives here and gathers food.',
      levels: [L(40, 0, { rate: 4, capMin: 20, capacity: 1 }), L(300, 60, { rate: 5, capMin: 40, capacity: 2 }), L(900, 300, { rate: 6, capMin: 60, capacity: 2 }), L(2500, 900, { rate: 8, capMin: 90, capacity: 3 }), L(6000, 1800, { rate: 10, capMin: 120, capacity: 3 })] },
    tidegate: { name: 'Tide Gate', cat: 'story', story: true, w: 3, h: 2, canMove: true, canStore: false, req: { struct: 'hollow' },
      produces: 'gold', perResident: true, affinity: ['water'], art: 'tidegate',
      desc: 'A drowned archway where the tide still tries to come in. Its resident gathers gold from the shallows. Opens the Tide Pools.',
      levels: [L(90, 0, { rate: 3, capMin: 30, capacity: 1 }), L(400, 120, { rate: 5, capMin: 45, capacity: 1 }), L(1200, 480, { rate: 7, capMin: 60, capacity: 2 }), L(3000, 1200, { rate: 10, capMin: 90, capacity: 2 }), L(7000, 2400, { rate: 14, capMin: 120, capacity: 3 })] },
    moonshrine: { name: 'Moon Shrine', cat: 'story', story: true, w: 2, h: 2, canMove: true, canStore: false, req: { struct: 'tidegate' },
      produces: 'gems', perResident: true, affinity: ['dark', 'light'], art: 'moonshrine',
      desc: 'A hilltop shrine, half swallowed by ivy. Its resident slowly condenses gems from moonlight. Opens the Dusk Grove.',
      levels: [L(130, 0, { rate: 0.25, capMin: 40, capacity: 1 }), L(800, 300, { rate: 0.3, capMin: 60, capacity: 1 }), L(2400, 900, { rate: 0.35, capMin: 90, capacity: 2 }), L(6000, 1800, { rate: 0.4, capMin: 120, capacity: 2 })] },
    hatchery: { name: 'Old Hatchery', cat: 'story', story: true, w: 3, h: 3, canMove: true, canStore: false, req: { struct: 'tidegate' }, art: 'hatchery',
      desc: 'A dome of cracked shell-stone. Restores breeding. Every upgrade adds one more breeding slot and shortens incubation.',
      levels: [L(110, 0, { eggTime: 1, slots: 1 }), L(500, 120, { eggTime: 0.85, slots: 2 }), L(1500, 600, { eggTime: 0.7, slots: 3 }), L(4000, 1500, { eggTime: 0.55, slots: 4 }), L(9000, 3000, { eggTime: 0.4, slots: 5 })] },
    reliquarygate: { name: 'Reliquary Gate', cat: 'story', story: true, w: 3, h: 3, canMove: true, canStore: false, req: { flag: 'r1' }, art: 'reliquarygate',
      desc: 'A great door in the hillside, sealed by vines. Opens the Overgrown Reliquary dungeon. Upgrades improve dungeon clear rewards.',
      levels: [L(140, 0, { rewardMult: 1 }), L(700, 300, { rewardMult: 1.15 }), L(2200, 900, { rewardMult: 1.3 }), L(6000, 1800, { rewardMult: 1.5 })] },

    // Dev 7: the Forge, an old smithy north of the plaza. Restoring it opens equipment crafting, merging and the shop;
    // its level opens more recipes, higher merges and more shop stock (D.FORGE in gear-data.js).
    forge: { name: 'Old Forge', cat: 'story', story: true, w: 3, h: 3, canMove: true, canStore: false, req: { struct: 'hatchery' }, art: 'forge',
      desc: 'A cold smithy with a cracked chimney. Restored, it crafts, merges and sells equipment for your Aminas. Upgrades open stronger gear.',
      levels: [L(300, 0, { forge: 1 }), L(1500, 600, { forge: 2 }), L(4500, 1800, { forge: 3 })] },

    // ---------- production ----------
    farm: { name: 'Berry Farm', cat: 'production', w: 3, h: 2, canMove: true, canStore: true, req: { struct: 'hollow' }, maxCount: 4,
      produces: 'food', art: 'farm', desc: 'Neat rows of sweetberries. Produces food over time; tap it to collect.',
      levels: [L(120, 20, { rate: 3, capMin: 60 }), L(400, 120, { rate: 5, capMin: 90 }), L(1200, 600, { rate: 8, capMin: 120 }), L(3500, 1500, { rate: 12, capMin: 150 }), L(9000, 3600, { rate: 18, capMin: 180 })] },
    mine: { name: 'Glimmer Mine', cat: 'production', w: 2, h: 2, canMove: true, canStore: true, req: { struct: 'hollow' }, maxCount: 3,
      produces: 'gold', art: 'mine', desc: 'A little shaft where glimmering ore surfaces on its own. Produces gold over time.',
      levels: [L(200, 30, { rate: 6, capMin: 60 }), L(700, 180, { rate: 12, capMin: 90 }), L(2000, 720, { rate: 22, capMin: 120 }), L(5500, 1800, { rate: 38, capMin: 150 }), L(14000, 3600, { rate: 60, capMin: 180 })] },
  };
  // ---------- habitats: one per element; residents earn gold, matching element earns +50% ----------
  const HAB = [['nature', 'Grove Habitat', 2], ['water', 'Tidepool Habitat', 2], ['earth', 'Burrow Habitat', 2], ['fire', 'Ember Habitat', 3], ['light', 'Sunbeam Habitat', 3], ['dark', 'Moonlit Habitat', 3], ['wind', 'Aerie Habitat', 4]];
  HAB.forEach(([el, name, rank]) => {
    D.BUILDINGS['hab_' + el] = { name, cat: 'habitat', el, w: 3, h: 3, canMove: true, canStore: true, req: { struct: 'hollow', rank }, maxCount: 6,
      produces: 'gold', perResident: true, affinity: [el], art: 'habitat',
      desc: 'A cosy home for Aminas. Residents earn gold; ' + D.ELEMENTS[el].name + ' residents earn 50% more.',
      levels: [L(400, 60, { rate: 4, capMin: 60, capacity: 2 }), L(1200, 300, { rate: 6, capMin: 90, capacity: 2 }), L(3000, 900, { rate: 9, capMin: 120, capacity: 3 }), L(7000, 1800, { rate: 13, capMin: 150, capacity: 3 }), L(15000, 3600, { rate: 18, capMin: 180, capacity: 4 })] };
  });
  // ---------- decorations: single level, cheap, freely movable/storable ----------
  const DEC = [['lantern', 'Glow Lantern', 1, 1, 25, 'A lantern that hums softly at night.'], ['flowerbed', 'Flower Bed', 1, 1, 15, 'Wildflowers in a stone ring.'],
    ['bench', 'Mossy Bench', 2, 1, 40, 'Somewhere to sit and watch the Aminas nap.'], ['statue', 'Kind Soul Statue', 2, 2, 150, 'A carved Amina, smiling at nothing in particular.'],
    ['fountain', 'Sun Fountain', 2, 2, 250, 'Water that catches the light like it means it.']];
  DEC.forEach(([id, name, w, h, gold, desc]) => {
    D.BUILDINGS[id] = { name, cat: 'decor', w, h, canMove: true, canStore: true, req: { struct: 'hollow' }, maxCount: 20, art: id, desc,
      levels: [L(gold, 0, {})] };
  });
  Object.keys(D.BUILDINGS).forEach((k) => { const b = D.BUILDINGS[k]; b.id = k; b.canRotate = b.w !== b.h || b.cat === 'decor'; });
  D.STORY_BUILDINGS = ['hollow', 'tidegate', 'moonshrine', 'hatchery', 'reliquarygate', 'forge'];
  D.STRUCT_ORDER = ['hollow', 'tidegate', 'reliquarygate', 'hatchery', 'moonshrine'];
  D.CATALOG = ['farm', 'mine', 'hab_nature', 'hab_water', 'hab_earth', 'hab_fire', 'hab_light', 'hab_dark', 'hab_wind', 'lantern', 'flowerbed', 'bench', 'statue', 'fountain'];
  D.CATALOG_CATS = [['production', 'Production'], ['habitat', 'Habitats'], ['decor', 'Decor']];
  // Legacy view used by story text and old helpers: restorable structures with their level-1 cost.
  D.STRUCTURES = {};
  D.STORY_BUILDINGS.forEach((id) => { const b = D.BUILDINGS[id]; D.STRUCTURES[id] = { name: b.name, kind: b.perResident ? 'habitat' : 'ruin', cost: b.levels[0].cost.gold, req: b.req, desc: b.desc, produces: b.produces, affinity: b.affinity || [] }; });

  /* =================================================================== OBSTACLES
     Base cost/time/reward per type; each island multiplies cost and resource reward by its obstacleMult.
     tags drive quests such as "Remove 3 rocks". xp = caretaker rank xp granted on removal. */
  D.OBSTACLE_TYPES = {
    // starter
    oak: { name: 'Old Oak', w: 2, h: 2, tags: ['tree'], cost: { gold: 60 }, time: 45, reward: { food: 12 }, xp: 6 },
    pine: { name: 'Pine Tree', w: 1, h: 1, tags: ['tree'], cost: { gold: 30 }, time: 20, reward: { food: 5 }, xp: 3 },
    bush: { name: 'Berry Bush', w: 1, h: 1, tags: ['bush'], cost: { gold: 15 }, time: 10, reward: { food: 6 }, xp: 2 },
    pebble: { name: 'Rock', w: 1, h: 1, tags: ['rock'], cost: { gold: 20 }, time: 15, reward: { gold: 8 }, xp: 2 },
    boulder: { name: 'Boulder', w: 2, h: 2, tags: ['rock'], cost: { gold: 80 }, time: 60, reward: { gems: 1 }, xp: 8 },
    stump: { name: 'Old Stump', w: 1, h: 1, tags: ['tree'], cost: { gold: 20 }, time: 15, reward: { food: 4 }, xp: 2 },
    // verdant
    elderroot: { name: 'Elder Root', w: 2, h: 2, tags: ['tree', 'root'], cost: { gold: 60 }, time: 60, reward: { food: 12 }, xp: 8 },
    vinetree: { name: 'Vine Tree', w: 2, h: 2, tags: ['tree'], cost: { gold: 50 }, time: 45, reward: { food: 10 }, xp: 6 },
    fern: { name: 'Giant Fern', w: 1, h: 1, tags: ['bush'], cost: { gold: 15 }, time: 10, reward: { food: 4 }, xp: 2 },
    glowcap: { name: 'Glowcap', w: 1, h: 1, tags: ['bush', 'plant'], cost: { gold: 20 }, time: 15, reward: { gems: 0.2 }, xp: 3 },
    mossruin: { name: 'Mossy Ruin', w: 2, h: 2, tags: ['rock', 'ruin'], cost: { gold: 80 }, time: 75, reward: { gold: 30 }, xp: 8 },
    mossrock: { name: 'Mossy Rock', w: 1, h: 1, tags: ['rock'], cost: { gold: 20 }, time: 15, reward: { gold: 8 }, xp: 2 },
    // obsidian
    basalt: { name: 'Basalt Column', w: 2, h: 2, tags: ['rock'], cost: { gold: 70 }, time: 60, reward: { gold: 25 }, xp: 8 },
    crystal: { name: 'Magenta Crystal', w: 1, h: 1, tags: ['crystal'], cost: { gold: 30 }, time: 20, reward: { gems: 0.25 }, xp: 3 },
    embervent: { name: 'Ember Vent', w: 1, h: 1, tags: ['vent'], cost: { gold: 25 }, time: 20, reward: { gold: 10 }, xp: 3 },
    charred: { name: 'Charred Tree', w: 1, h: 1, tags: ['tree'], cost: { gold: 25 }, time: 15, reward: { food: 4 }, xp: 2 },
    obsidianshard: { name: 'Obsidian Shard', w: 1, h: 1, tags: ['rock'], cost: { gold: 25 }, time: 15, reward: { gold: 9 }, xp: 2 },
    slagheap: { name: 'Slag Heap', w: 2, h: 2, tags: ['rock'], cost: { gold: 90 }, time: 75, reward: { gems: 1 }, xp: 9 },
    // celestial
    floatstone: { name: 'Drifting Stone', w: 2, h: 2, tags: ['rock'], cost: { gold: 80 }, time: 60, reward: { gold: 30 }, xp: 8 },
    starshard: { name: 'Star Shard', w: 1, h: 1, tags: ['crystal'], cost: { gold: 30 }, time: 20, reward: { gems: 0.25 }, xp: 3 },
    moonbloom: { name: 'Moonbloom', w: 1, h: 1, tags: ['bush', 'plant'], cost: { gold: 15 }, time: 10, reward: { food: 5 }, xp: 2 },
    pillar: { name: 'Fallen Pillar', w: 1, h: 1, tags: ['ruin'], cost: { gold: 30 }, time: 20, reward: { gold: 10 }, xp: 3 },
    cloudpuff: { name: 'Cloud Puff', w: 1, h: 1, tags: ['cloud'], cost: { gold: 15 }, time: 10, reward: { food: 4 }, xp: 2 },
    geode: { name: 'Sky Geode', w: 2, h: 2, tags: ['rock', 'crystal'], cost: { gold: 90 }, time: 75, reward: { gems: 1 }, xp: 9 },
  };
  D.OBSTACLES = {}; D.obstacleById = {};
  D.ISLAND_ORDER.forEach((iid) => {
    D.OBSTACLES[iid] = (D.OBSTACLE_LAYOUT[iid] || []).map(([id, type, x, y]) => ({ id, type, x, y, island: iid }));
    D.OBSTACLES[iid].forEach((o) => (D.obstacleById[o.id] = o));
  });
  // Final cost/time/reward for an obstacle type on a given island. Fractional rewards (e.g. 0.25 gem) round to whole units.
  D.obstacleInfo = function (iid, type) {
    const t = D.OBSTACLE_TYPES[type], m = D.ISLANDS[iid].obstacleMult || 1, out = { cost: {}, reward: {} };
    Object.keys(t.cost).forEach((k) => (out.cost[k] = Math.round(t.cost[k] * m)));
    Object.keys(t.reward).forEach((k) => { const v = k === 'gems' ? Math.max(1, Math.round(t.reward[k] * Math.max(1, m / 6))) : Math.round(t.reward[k] * m); out.reward[k] = v; });
    return Object.assign(out, { name: t.name, w: t.w, h: t.h, tags: t.tags, time: Math.round(t.time * (1 + Math.log2(m) * 0.35)), xp: Math.round(t.xp * (1 + Math.log2(m) * 0.5)) });
  };

  /* =================================================================== TIMERS
     'normal' = the balanced timings above. 'quick' = for testing on a phone (1/12 of the time). */
  D.TIMER_SCALE = { normal: 1, quick: 1 / 12 };
  D.FINISH_GEMS_PER_MIN = 1 / 6; // "Finish now" costs 1 gem per started 6 minutes remaining (earned gems only; nothing is sold)

  /* =================================================================== QUESTS
     Every objective is structured data: { id, type, ...targets, count|amount|level, optional, hint }.
     Types (see quests.js): restore build place store move upgrade remove_obstacle feed collect unlock_island visit_island
       dungeon_stage dungeon_clear creature_level own_aminas species resonance hatch evolve win_battles restore_all
     Quest ids from v0.1 missions are kept so claimed rewards carry over from old saves. Order = order shown/current. */
  const o = (type, props) => Object.assign({ id: 'o1', type }, props || {});
  D.QUESTS = [
    { id: 'm_hollow', title: 'Make Room for Kind Souls', desc: 'Restore the Sunlit Hollow so your companion has a proper home.', after: [],
      objectives: [o('restore', { target: 'hollow', hint: 'Tap the glowing ruin next to the plaza, then Restore.' })], reward: { gold: 30, food: 10 } },
    { id: 'm_feed', title: 'First Meal', desc: 'Feed your companion. Yes, with food. Revolutionary.', after: ['m_hollow'],
      objectives: [o('feed', { count: 1, hint: 'Tap Snack on your companion card (bottom-left).' })], reward: { gold: 10, food: 20 } },
    { id: 'm_clear', title: 'Clear the Way', desc: 'The sanctuary is overgrown. Clear three trees, bushes or rocks to make room.', after: ['m_feed'],
      objectives: [o('remove_obstacle', { island: 'starter', count: 3, hint: 'Tap a glowing tree, bush or rock and choose Remove.' })], reward: { gold: 60, food: 10 } },
    { id: 'm_lv3', title: 'Growing Pains', desc: 'Raise any Amina to level 3.', after: ['m_feed'],
      objectives: [o('creature_level', { count: 3, hint: 'Keep feeding your companion. Snacks add up.' })], reward: { gold: 40, food: 15 } },
    { id: 'm_find', title: 'A Friend of the Meadow', desc: 'Befriend a second Amina on the island.', after: ['m_feed'],
      objectives: [o('own_aminas', { count: 2, hint: 'Open Explore and wander the Sunlit Meadow. Offer food when something appears.' })], reward: { gold: 40, food: 10 } },
    { id: 'm_farm', title: 'Something to Eat', desc: 'Build a Berry Farm so the sanctuary never runs out of snacks.', after: ['m_clear'],
      objectives: [o('build', { building: 'farm', count: 1, hint: 'Open Build, pick the Berry Farm, drag it onto free grass and confirm.' }),
        o('collect', { id: 'o2', resource: 'food', amount: 5, optional: true, hint: 'Tap the farm when berries are ready and Collect.' })], reward: { gold: 80, food: 20 } },
    { id: 'm_tide', title: 'The Tide Gate', desc: 'Restore the Tide Gate so the water can find its way back.', after: ['m_lv3'],
      objectives: [o('restore', { target: 'tidegate', hint: 'Tap the drowned archway on the west shore.' })], reward: { gold: 40, food: 20, gems: 2 } },
    { id: 'm_mine', title: 'Gold from the Ground', desc: 'Build a Glimmer Mine and collect what it digs up.', after: ['m_farm'],
      objectives: [o('build', { building: 'mine', count: 1, hint: 'Open Build and place a Glimmer Mine.' }),
        o('collect', { id: 'o2', resource: 'gold', amount: 30, hint: 'Tap the mine when gold is ready and Collect.' })], reward: { gold: 150, gems: 1 } },
    { id: 'm_r1', title: 'Something Is Humming', desc: 'Investigate the Resonance disturbance by the east shore.', after: ['m_tide'],
      objectives: [o('resonance', { flag: 'r1', hint: 'Tap the glowing ring of stones on the east shore.' })], reward: { gold: 60, food: 20 } },
    { id: 'm_lv5', title: 'Almost Ready', desc: 'Raise any Amina to level 5. The Reliquary is not kind to level threes.', after: ['m_find'],
      objectives: [o('creature_level', { count: 5, hint: 'Feed your companion. A Feast gives much more experience.' })], reward: { gold: 60, food: 25 } },
    { id: 'm_party', title: 'Strength in Numbers', desc: 'Have three Aminas in your sanctuary.', after: ['m_find'],
      objectives: [o('own_aminas', { count: 3, hint: 'Explore the Meadow and Tide Pools for more Kind Souls.' })], reward: { food: 25, gold: 30 } },
    { id: 'm_road', title: 'The Forgotten Road', desc: 'An old stone road runs out of the sanctuary. Something is still guarding it.', after: ['m_lv3', 'm_find'],
      objectives: [o('dungeon_clear', { dungeon: 'forgottenroad', count: 1, hint: 'Tap Battle, then PvE, then Dungeons. Ten battles; the tenth is the guardian.' })], reward: { gold: 80, food: 20 } },
    { id: 'm_arrange', title: 'Make It Yours', desc: 'A sanctuary should feel like home. Move a building, put one in storage, then place it again.', after: ['m_mine'],
      objectives: [o('move', { count: 1, hint: 'Open Build, tap a building, drag it somewhere new and confirm.' }),
        o('store', { id: 'o2', count: 1, hint: 'In Build mode, select your farm or mine and tap Store.' }),
        o('place', { id: 'o3', fromStorage: true, count: 1, hint: 'Open Storage in Build mode and place the building again.' })], reward: { gold: 100, gems: 2 } },
    { id: 'm_gate', title: 'The Reliquary Gate', desc: 'Restore the great door in the hillside.', after: ['m_r1', 'm_lv5'],
      objectives: [o('restore', { target: 'reliquarygate', hint: 'Tap the vine-sealed door on the northern hillside.' })], reward: { gold: 40, gems: 2 } },
    { id: 'm_hall', title: 'The Gathering Hall', desc: 'The road led somewhere. Find out why everyone left.', after: ['m_road'],
      objectives: [o('dungeon_clear', { dungeon: 'gatheringhall', count: 1, hint: 'Open Dungeons and enter the Gathering Hall.' })], reward: { gold: 100, food: 25, gems: 2 } },
    { id: 'm_hatchup', title: 'Warm Shells', desc: 'Restore the Old Hatchery and improve it so eggs hatch faster.', after: ['m_tide'],
      objectives: [o('restore', { target: 'hatchery', hint: 'Tap the cracked dome near the southern shore.' }),
        o('upgrade', { id: 'o2', building: 'hatchery', level: 2, hint: 'Open the Hatchery panel and tap Upgrade.' })], reward: { gold: 150, food: 15, gems: 2 } },
    { id: 'm_dungeon', title: 'The Overgrown Reliquary', desc: 'Enter the Reliquary and put the disturbance to rest.', after: ['m_gate', 'm_party', 'm_hall'],
      objectives: [o('dungeon_clear', { dungeon: 'reliquary', count: 1, hint: 'Open Dungeons, choose up to three Aminas, and go in.' })], reward: { gold: 150, food: 40, gems: 5 } },
    { id: 'm_habitat', title: 'A Home for Everyone', desc: 'Build a habitat so your Aminas have somewhere to live and work.', after: ['m_arrange'],
      objectives: [o('place', { cat: 'habitat', count: 1, hint: 'Open Build, choose a habitat and place it.' })], reward: { gold: 200, food: 30 } },
    { id: 'm_stone', title: 'The Stone That Isn’t on the Map', desc: 'Something new stands near the heart of the island. Go and look at it.', after: ['m_dungeon'],
      objectives: [o('resonance', { flag: 'stone', hint: 'Tap the pale standing stone in the central plaza.' })], reward: { gold: 100, gems: 3 }, finale: true },
    { id: 'm_wilds', title: 'Beyond the Shallows', desc: 'Other islands are calling. Defeat the Island Boss at the end of the tenth dungeon, then go and see the Verdant Wilds.', after: ['m_stone'],
      objectives: [o('unlock_island', { island: 'verdant', hint: 'Clear the island’s dungeons. The Island Boss waits at the end of the tenth.' }),
        o('visit_island', { id: 'o2', island: 'verdant', hint: 'Open the Map and Travel to the Verdant Wilds.' })], reward: { gold: 5000, gems: 10 } },

    // ---------- Sanctuary tasks (side) ----------
    { id: 's_collect8', title: 'Naturalist I', side: true, desc: 'Befriend eight different Aminas.', after: ['m_hollow'], objectives: [o('species', { count: 8 })], reward: { gold: 80, food: 30 } },
    { id: 's_collect15', title: 'Naturalist II', side: true, desc: 'Befriend fifteen different Aminas.', after: ['s_collect8'], objectives: [o('species', { count: 15 })], reward: { gold: 150, gems: 4 } },
    { id: 's_collect24', title: 'Naturalist III', side: true, desc: 'Befriend twenty-four different Aminas.', after: ['s_collect15'], objectives: [o('species', { count: 24 })], reward: { gold: 300, gems: 10 } },
    { id: 's_rocks', title: 'Rock Collector', side: true, desc: 'Clear three rocks or boulders from your islands.', after: ['m_clear'], objectives: [o('remove_obstacle', { tag: 'rock', count: 3 })], reward: { gold: 90, gems: 1 } },
    { id: 's_decor', title: 'A Touch of Charm', side: true, desc: 'Place three decorations.', after: ['m_farm'], objectives: [o('place', { cat: 'decor', count: 3 })], reward: { gold: 80, food: 20 } },
    { id: 's_lv10', title: 'Elder Kind Soul', side: true, desc: 'Raise any Amina to level 10.', after: ['m_lv5'], objectives: [o('creature_level', { count: 10 })], reward: { gold: 100, food: 40 } },
    { id: 's_evolve', title: 'A Change of Shape', side: true, desc: 'Evolve an Amina (starters evolve at level 12).', after: ['s_lv10'], objectives: [o('evolve', { count: 1 })], reward: { gold: 150, gems: 3 } },
    { id: 's_hatch', title: 'Something Warm in the Shell', side: true, desc: 'Hatch an egg in the Old Hatchery.', after: ['m_hollow'], objectives: [o('hatch', { count: 1 })], reward: { gold: 60, food: 30 } },
    { id: 's_restore', title: 'Proper Housekeeping', side: true, desc: 'Restore every structure on the island.', after: ['m_tide'], objectives: [o('restore_all')], reward: { gold: 200, gems: 5 } },
    { id: 's_floors', title: 'Floor by Floor', side: true, desc: 'Clear three sections of the Overgrown Reliquary (a section is three battles, or the boss).', after: ['m_gate'], objectives: [o('dungeon_stage', { dungeon: 'reliquary', count: 3 })], reward: { gold: 120, food: 30 } },
    { id: 's_wins', title: 'Practice Makes Slightly Better', side: true, desc: 'Win ten battles.', after: ['m_dungeon'], objectives: [o('win_battles', { count: 10 })], reward: { gold: 100, food: 30 } },
    { id: 's_mine3', title: 'Deeper Seams', side: true, desc: 'Upgrade a Glimmer Mine to level 3.', after: ['m_mine'], objectives: [o('upgrade', { building: 'mine', level: 3 })], reward: { gold: 400, gems: 2 } },
    { id: 's_hollow2', title: 'Room to Grow', side: true, desc: 'Upgrade the Sunlit Hollow to level 2.', after: ['m_farm'], objectives: [o('upgrade', { building: 'hollow', level: 2 })], reward: { gold: 120, food: 30 } },
    { id: 's_gold1k', title: 'Pocket Change', side: true, desc: 'Collect 1,000 gold from your buildings.', after: ['m_mine'], objectives: [o('collect', { resource: 'gold', amount: 1000 })], reward: { gold: 300, gems: 2 } },
    { id: 's_wilds_farm', title: 'Roots and Rows', side: true, desc: 'Build a Berry Farm on the Verdant Wilds.', after: ['m_wilds'], objectives: [o('build', { building: 'farm', island: 'verdant', count: 1 })], reward: { gold: 1500, gems: 3 } },
    { id: 's_wilds_clear', title: 'Into the Green', side: true, desc: 'Clear five obstacles on the Verdant Wilds.', after: ['m_wilds'], objectives: [o('remove_obstacle', { island: 'verdant', count: 5 })], reward: { gold: 2500, gems: 4 } },
    { id: 's_reach', title: 'The Dark Shore', side: true, desc: 'Unlock and visit Obsidian Reach.', after: ['m_wilds'],
      objectives: [o('unlock_island', { island: 'obsidian' }), o('visit_island', { id: 'o2', island: 'obsidian' })], reward: { gold: 10000, gems: 15 } },
    { id: 's_crown', title: 'Above the Clouds', side: true, desc: 'Unlock and visit the Celestial Crown.', after: ['s_reach'],
      objectives: [o('unlock_island', { island: 'celestial' }), o('visit_island', { id: 'o2', island: 'celestial' })], reward: { gold: 20000, gems: 25 } },
  ];
  D.MISSIONS = D.QUESTS; // legacy alias
})(typeof window !== 'undefined' ? window : globalThis);
