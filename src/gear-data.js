/* Aminas — equipment data (v0.7, extended for the Dev 7 Forge). Pure data.
   Three slots: Weapon, Armour, Charm. Bonuses are fractions of the base stat (atk 0.1 = +10% attack), applied once
   when a battle fighter is created. Every item belongs to a family and has a tier (I–IV): two items of the same
   family and tier merge into the next tier of that family. Unique items have no family: they cannot be merged,
   bought or crafted, and a duplicate turns into gold. Items whose ids existed in v0.7 keep their exact bonuses. */
(function (root) {
  'use strict';
  const D = root.A.Data;
  D.GEAR_SLOTS = ['weapon', 'armour', 'charm'];
  D.GEAR_SLOT_NAMES = { weapon: 'Weapon', armour: 'Armour', charm: 'Charm' };
  D.GEAR_TIERS = { 1: { name: 'I', rarity: 'common', label: 'Common' }, 2: { name: 'II', rarity: 'uncommon', label: 'Uncommon' }, 3: { name: 'III', rarity: 'rare', label: 'Rare' }, 4: { name: 'IV', rarity: 'epic', label: 'Epic' } };

  // Families: [family, slot, icon, [tier1..4 as [id, name, bonus, desc] or null]]
  const F = [
    ['club', 'weapon', 'club', [
      ['driftclub', 'Driftwood Club', { atk: 0.06 }, 'Washed up on the Forgotten Road. Solid enough.'],
      ['ironclub', 'Ironbound Club', { atk: 0.09 }, 'The same club, with opinions now. Iron bands hold it together.'],
      ['stoneclub', 'Stonebreaker', { atk: 0.12 }, 'Heavy enough that the ground flinches.'],
      ['titanmaul', 'Titan Maul', { atk: 0.15 }, 'Forged twice and cooled in the Tide Gate. It hums when swung.']]],
    ['fang', 'weapon', 'fang', [
      ['cinderfang', 'Cinder Fang', { atk: 0.07 }, 'A sliver of kiln glass, still warm.'],
      ['emberfang', 'Ember Fang', { atk: 0.10 }, 'A tooth of cooled kiln-glass, still warm inside.'],
      ['blazefang', 'Blaze Fang', { atk: 0.13 }, 'Glows orange when it is about to be useful.'],
      ['infernofang', 'Inferno Fang', { atk: 0.16 }, 'Hot to look at. Hotter to be hit by.']]],
    ['spear', 'weapon', 'spear', [
      ['reedspear', 'Reed Spear', { atk: 0.05, spd: 0.02 }, 'Light and quick. Mostly reed, a little hope.'],
      ['tidespear', 'Tidecaller Spear', { atk: 0.09, spd: 0.04 }, 'Light, quick, and always slightly damp.'],
      ['surgespear', 'Surge Spear', { atk: 0.12, spd: 0.05 }, 'Strikes like a wave coming in sideways.'],
      ['tempestlance', 'Tempest Lance', { atk: 0.15, spd: 0.06 }, 'The wind follows it around like a pet.']]],
    ['axe', 'weapon', 'axe', [null,
      ['barkaxe', 'Bark Axe', { atk: 0.10 }, 'A forester’s axe, sized for small hands.'],
      ['rootsplit', 'Rootsplitter', { atk: 0.14 }, 'Carved from a root that once cracked a gate.'],
      ['worldsplit', 'Worldsplitter', { atk: 0.17 }, 'Named optimistically. Still, it is very sharp.']]],
    ['vest', 'armour', 'vest', [
      ['barkvest', 'Bark Vest', { def: 0.08 }, 'Layered bark, laced with moss.'],
      ['ironbark', 'Ironbark Vest', { def: 0.11 }, 'Bark that has been told firmly to be metal.'],
      ['heartmail', 'Heartwood Mail', { def: 0.14 }, 'Grown in rings, like a tree. Each ring a lesson.'],
      ['elderguard', 'Elder Guard', { def: 0.17 }, 'Old wood, old promises. Both hold.']]],
    ['shell', 'armour', 'shell', [
      ['shellplate', 'Shellplate', { def: 0.10, hp: 0.05 }, 'A Cannonis shed it. It does not want it back.'],
      ['reefplate', 'Reef Plate', { def: 0.13, hp: 0.07 }, 'Two shells, pressed together on purpose.'],
      ['tideplate', 'Tide Plate', { def: 0.16, hp: 0.09 }, 'Water slides off it, and so do most problems.'],
      ['abyssplate', 'Abyss Plate', { def: 0.19, hp: 0.11 }, 'From the deep, where nothing is ever in a hurry.']]],
    ['mantle', 'armour', 'mantle', [
      ['leafwrap', 'Leaf Wrap', { hp: 0.06 }, 'Big leaves, tied with a smaller vine.'],
      ['vinewrap', 'Vine Wrap', { hp: 0.09 }, 'The vines hold on. So do you.'],
      ['mossmantle', 'Moss Mantle', { hp: 0.12 }, 'A living cloak that mends small scratches.'],
      ['bloomcloak', 'Bloom Cloak', { hp: 0.15 }, 'It flowers when its wearer is brave.']]],
    ['obsidian', 'armour', 'obsidian', [null,
      ['basaltmail', 'Basalt Mail', { def: 0.12 }, 'Plain black stone, chipped into scales.'],
      ['obsidmail', 'Obsidian Mail', { def: 0.16 }, 'Black glass scales from the Reach.'],
      ['nightmail', 'Night Mail', { def: 0.19 }, 'Darker than the Reach at midnight. Lighter than it looks.']]],
    ['sun', 'charm', 'sun', [
      ['suncharm', 'Sun Charm', { spd: 0.06 }, 'A disc of yellow glass that feels like morning.'],
      ['dawncharm', 'Dawn Charm', { spd: 0.08 }, 'Warm before the sun is.'],
      ['noonchrm', 'Noon Charm', { spd: 0.10 }, 'Bright enough to hurry anyone.'],
      ['solstice', 'Solstice Charm', { spd: 0.12 }, 'The longest day, kept in a pocket.']]],
    ['moon', 'charm', 'moon', [
      ['moonbead', 'Moon Bead', { hp: 0.06, def: 0.04 }, 'Cool to the touch, even in the sun.'],
      ['moonstone', 'Moonstone', { hp: 0.08, def: 0.05 }, 'Two beads that agreed to be one stone.'],
      ['moonpearl', 'Moon Pearl', { hp: 0.10, def: 0.06 }, 'Shines in the dark, politely.'],
      ['eclipseorb', 'Eclipse Orb', { hp: 0.12, def: 0.07 }, 'A small, calm night that fits in a hand.']]],
    ['echo', 'charm', 'echo', [null,
      ['echoshell', 'Echo Shell', { atk: 0.05, spd: 0.05 }, 'Hold it to your ear and it hums back.'],
      ['chorusshell', 'Chorus Shell', { atk: 0.065, spd: 0.065 }, 'Now it hums in harmony.'],
      ['choirshell', 'Choir Shell', { atk: 0.08, spd: 0.08 }, 'A whole choir in a shell. They are very good.']]],
    ['feather', 'charm', 'feather', [null,
      ['feathertok', 'Feather Token', { spd: 0.10 }, 'A gold feather from a Zephyr that let you keep it.'],
      ['galeplume', 'Gale Plume', { spd: 0.13 }, 'It never quite settles.'],
      ['skycrest', 'Sky Crest', { spd: 0.16 }, 'Worn by Zephyr III, given to almost nobody.']]],
  ];
  D.GEAR_FAMILIES = {};
  D.ITEMS = {};
  F.forEach(([fam, slot, icon, tiers]) => {
    D.GEAR_FAMILIES[fam] = { id: fam, slot, icon, tiers: tiers.map((t) => (t ? t[0] : null)) };
    tiers.forEach((t, i) => { if (!t) return; const tier = i + 1; D.ITEMS[t[0]] = { name: t[1], slot, bonus: t[2], desc: t[3], family: fam, tier, rarity: D.GEAR_TIERS[tier].rarity, icon }; });
  });
  // unique items (from v0.7 rewards): no family, cannot be merged, bought or crafted
  Object.assign(D.ITEMS, {
    stormglass: { name: 'Stormglass Blade', slot: 'weapon', bonus: { atk: 0.18, spd: 0.04 }, rarity: 'mythic', unique: true, dupGold: 300, tier: 4, icon: 'blade', desc: 'Forged where the wind stair meets the clouds. There is only one.' },
    coralaegis: { name: 'Coral Aegis', slot: 'armour', bonus: { def: 0.14, hp: 0.10 }, rarity: 'mythic', unique: true, dupGold: 300, tier: 4, icon: 'shell', desc: 'Grown, not forged, on the oldest reef. There is only one.' },
    entityeye: { name: 'Watcher’s Lens', slot: 'charm', bonus: { hp: 0.06, atk: 0.06, def: 0.06, spd: 0.06 }, rarity: 'mythic', unique: true, dupGold: 400, tier: 4, icon: 'eye', desc: 'The Entity says it lost this. It did not look very sorry.' },
  });
  Object.keys(D.ITEMS).forEach((k) => (D.ITEMS[k].id = k));
  D.RARITY_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', mythic: 'Unique' };

  // Reward sources (v0.7): first clear of each dungeon gives its item (once); later clears, a chance at the pool.
  D.DUNGEON_GEAR = {
    forgottenroad: 'driftclub', gatheringhall: 'suncharm', reliquary: 'barkvest', drownedsteps: 'shellplate', coldkiln: 'emberfang',
    hollowveil: 'obsidmail', lanternorchard: 'moonbead', windstair: 'stormglass', resonancescar: 'echoshell', heartwood: 'coralaegis',
  };
  D.GEAR_REPEAT_CHANCE = 0.3;
  D.GEAR_REPEAT_POOL = ['driftclub', 'cinderfang', 'reedspear', 'barkvest', 'leafwrap', 'suncharm', 'moonbead', 'emberfang', 'tidespear', 'shellplate', 'vinewrap', 'feathertok'];
  D.SURVIVAL_GEAR = { 5: 'feathertok', 10: 'mossmantle', 15: 'rootsplit', 20: 'entityeye' };
  D.RUIN_CHARM_CHANCE = 0.15;
  D.RUIN_CHARMS = ['suncharm', 'moonbead', 'echoshell'];
  D.MAX_EGG_SLOTS = 5;

  /* ---------------- the Forge (Dev 7) ----------------
     Crafting uses the existing resources: gold for every recipe, food for leather and plant work (wraps, vests),
     gems for charms and higher-tier pieces. Recipes, merge costs and shop stock open with the Forge's level. */
  D.FORGE = {
    // recipe: item, cost, Forge level needed
    recipes: [
      { item: 'driftclub', cost: { gold: 120 }, lv: 1 },
      { item: 'cinderfang', cost: { gold: 150, gems: 1 }, lv: 1 },
      { item: 'reedspear', cost: { gold: 140, food: 10 }, lv: 1 },
      { item: 'barkvest', cost: { gold: 120, food: 15 }, lv: 1 },
      { item: 'leafwrap', cost: { gold: 100, food: 25 }, lv: 1 },
      { item: 'suncharm', cost: { gold: 110, gems: 1 }, lv: 1 },
      { item: 'moonbead', cost: { gold: 130, gems: 1 }, lv: 1 },
      { item: 'shellplate', cost: { gold: 220, food: 20, gems: 2 }, lv: 2 },
      { item: 'barkaxe', cost: { gold: 380, gems: 3 }, lv: 2 },
      { item: 'basaltmail', cost: { gold: 520, gems: 4 }, lv: 3 },
      { item: 'echoshell', cost: { gold: 450, gems: 5 }, lv: 3 },
      { item: 'feathertok', cost: { gold: 450, food: 30, gems: 5 }, lv: 3 },
    ],
    // merging two tier-N items of one family gives the family's tier N+1: gold cost, and the Forge level it needs
    merge: { 2: { gold: 60, lv: 1 }, 3: { gold: 180, lv: 2 }, 4: { gold: 450, lv: 3 } },
    // shop: gold only; prices sit above crafting (which also asks for food or gems) and below the cost of merging up
    shop: [
      { item: 'driftclub', price: 180, lv: 1 }, { item: 'cinderfang', price: 220, lv: 1 }, { item: 'reedspear', price: 200, lv: 1 },
      { item: 'barkvest', price: 180, lv: 1 }, { item: 'leafwrap', price: 160, lv: 1 }, { item: 'suncharm', price: 200, lv: 1 }, { item: 'moonbead', price: 220, lv: 1 },
      { item: 'ironclub', price: 480, lv: 2 }, { item: 'ironbark', price: 480, lv: 2 }, { item: 'dawncharm', price: 520, lv: 2 },
      { item: 'tidespear', price: 900, lv: 3 }, { item: 'reefplate', price: 900, lv: 3 }, { item: 'moonstone', price: 950, lv: 3 },
    ],
    opsKept: 30,      // recent transaction ids remembered, so a repeated request is never applied twice
  };
})(typeof window !== 'undefined' ? window : globalThis);
