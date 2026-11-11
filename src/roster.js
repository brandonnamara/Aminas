/* Aminas — the v0.7 roster: 21 evolution lines × 3 forms (63 species), built from the supplied reference cards.
   Pure data. Each species has: id, name, title, el, line, stage (1..3), evo {to, lv, cost}, stats, abil, lore, art {vox, st}.
   design: 'card' = the supplied art defines this form; 'new' = a provisional form created for v0.7 (needs approval).
   D.LEGACY maps every v0.6 species id to its v0.7 replacement so old saves convert cleanly. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data;

  D.ELEMENTS.metal = { name: 'Metal', color: '#9fc3e8', dark: '#4f6f96' };
  // Metal: strong against Earth and Light; Fire and Water (melt, rust) are strong against Metal.
  D.STRONG.metal = ['earth', 'light'];
  D.STRONG.fire = ['nature', 'wind', 'metal'];
  D.STRONG.water = ['fire', 'earth', 'metal'];

  // New abilities for the three-stage lines (stage 3 signature moves) and the Metal element.
  Object.assign(D.ABILITIES, {
    solarflare:   { name: 'Solar Flare',    el: 'light',  type: 'dmg',    power: 82, cd: 3, desc: 'A blinding crown of sunlight. 30% chance to stun.', fx: { k: 'stun', p: 0.3, n: 1 } },
    eclipsefang:  { name: 'Eclipse Fang',   el: 'dark',   type: 'drain',  power: 72, cd: 3, desc: 'A bite from the moon’s shadow; heals you for half the damage.' },
    verdantcrash: { name: 'Verdant Crash',  el: 'nature', type: 'dmg',    power: 62, cd: 2, desc: 'A thicket bursts up under the foe.' },
    worldroot:    { name: 'World Root',     el: 'nature', type: 'drain',  power: 76, cd: 3, desc: 'Roots drink the foe’s strength; heals you for half the damage.' },
    blazerush:    { name: 'Blaze Rush',     el: 'fire',   type: 'dmg',    power: 64, cd: 2, desc: 'A charging dash of flame. 30% chance to burn.', fx: { k: 'burn', p: 0.3, n: 2 } },
    inferno:      { name: 'Inferno',        el: 'fire',   type: 'dmg',    power: 84, cd: 3, desc: 'Everything nearby catches. 50% chance to burn.', fx: { k: 'burn', p: 0.5, n: 2 } },
    riptide:      { name: 'Riptide Dash',   el: 'water',  type: 'dmg',    power: 64, cd: 2, desc: 'Dashes through the foe on a current. 40% chance to soak.', fx: { k: 'soak', p: 0.4, n: 2 } },
    abyssalwave:  { name: 'Abyssal Wave',   el: 'water',  type: 'dmg',    power: 84, cd: 3, desc: 'The deep sea, all at once. 50% chance to soak.', fx: { k: 'soak', p: 0.5, n: 2 } },
    quakeslam:    { name: 'Earthquake',     el: 'earth',  type: 'dmg',    power: 64, cd: 2, desc: 'Strikes the ground. 30% chance to stun.', fx: { k: 'stun', p: 0.3, n: 1 } },
    mountainfall: { name: 'Mountainfall',   el: 'earth',  type: 'weaken', power: 76, cd: 3, desc: 'A landslide of living rock; lowers the foe’s attack.' },
    galestrike:   { name: 'Gale Strike',    el: 'wind',   type: 'dmg',    power: 64, cd: 2, desc: 'A gust that hits like a wall.' },
    stormdive:    { name: 'Storm Dive',     el: 'wind',   type: 'dmg',    power: 84, cd: 3, desc: 'Dives from the clouds. 30% chance to stun.', fx: { k: 'stun', p: 0.3, n: 1 } },
    doubleecho:   { name: 'Double Echo',    el: 'resonance', type: 'dmg', power: 62, cd: 2, desc: 'Two voices, one strike. Never resisted, never amplified.', neutral: true },
    tripleecho:   { name: 'Triple Echo',    el: 'resonance', type: 'dmg', power: 80, cd: 3, desc: 'Three heads speak at once. Never resisted, never amplified.', neutral: true },
    gearstrike:   { name: 'Gear Strike',    el: 'metal',  type: 'dmg',    power: 40, cd: 0, desc: 'A clean, mechanical blow.' },
    ironwall:     { name: 'Iron Wall',      el: 'metal',  type: 'guard',  power: 0,  cd: 2, desc: 'Halves the next hit you take.' },
    bladeform:    { name: 'Blade Form',     el: 'metal',  type: 'dmg',    power: 64, cd: 2, desc: 'An arm becomes a blade, briefly.' },
    overclock:    { name: 'Overclock',      el: 'metal',  type: 'weaken', power: 78, cd: 3, desc: 'Runs every system past its limit; lowers the foe’s attack.' },
  });
  // basic, stage-1 special, stage-2 special, stage-3 special
  const MOVES = {
    light: ['glowpulse', 'sunsprout', 'radiantburst', 'solarflare'], dark: ['shadenip', 'gloomveil', 'duskrend', 'eclipsefang'],
    nature: ['vinewhip', 'leafguard', 'verdantcrash', 'worldroot'], fire: ['emberflick', 'flarebite', 'blazerush', 'inferno'],
    water: ['bubblepop', 'tidalsurge', 'riptide', 'abyssalwave'], earth: ['pebbletoss', 'boulderroll', 'quakeslam', 'mountainfall'],
    wind: ['gust', 'cyclonespin', 'galestrike', 'stormdive'], resonance: ['echowave', 'hum', 'doubleecho', 'tripleecho'],
    metal: ['gearstrike', 'ironwall', 'bladeform', 'overclock'],
  };
  const ROLE = {
    tank:   { hp: 52, atk: 10, def: 13, spd: 6 },  bruiser: { hp: 48, atk: 13, def: 10, spd: 8 },
    swift:  { hp: 42, atk: 12, def: 8, spd: 13 },  balanced: { hp: 46, atk: 11, def: 10, spd: 10 },
    mystic: { hp: 46, atk: 12, def: 9, spd: 10 },
  };
  const STAGE_MULT = [1, 1.42, 1.85];
  // Evolution requirements: a level, plus a small cost in gold and food (paid when the player confirms).
  D.EVO_REQ = { 2: { lv: 12, cost: { gold: 60, food: 15 } }, 3: { lv: 22, cost: { gold: 160, food: 40 } } };

  /* Lines. names/titles per stage; design per stage ('card' | 'new'); src: how the base form is found. */
  const LINES = [
    { id: 'lumifern', el: 'light', role: 'balanced', ids: ['lumifern', 'solarbloom', 'aurelith'], names: ['Lumifern', 'Solarbloom', 'Aurelith'], titles: ['The Sprout of Light', 'The Sunlit Crown', 'The Dawn Bloom'], design: ['kept', 'kept', 'new'],
      lore: ['A sprout-eared Amina whose leaves hold a little stored sunlight. It hums when the ruins are repaired, as if relieved.', 'Lumifern fully bloomed. A crown of petals turns to follow whoever it trusts most.', 'Lumifern II at the height of summer. Its petals open into a sun-wheel and its leaves have learned to fly.'],
      pers: 'Gentle, curious, stubborn about naps.', ent: 'That one? A fine Kind Soul. Stubborn, mind you. But then, most of the good ones are.', src: [{ t: 'starter' }, { t: 'breed' }], find: 'Choose it as your starter. Also hatches from Light + Nature parents.' },
    { id: 'umbrit', el: 'dark', role: 'swift', ids: ['umbrit', 'duskmantle', 'eclipsar'], names: ['Umbrit', 'Duskmantle', 'Eclipsar'], titles: ['The Velvet Shadow', 'The Twilight Cloak', 'The Crescent Warden'], design: ['kept', 'kept', 'new'],
      lore: ['A velvet-dark baby with a moon-pale crest. Shadows pool under it like a puddle it refuses to leave.', 'Umbrit grown into a cloak of living twilight. It stands between you and the dark, and keeps the dark company.', 'Umbrit II crowned by a crescent moon. Small lights drift around it like fireflies that never land.'],
      pers: 'Shy, watchful, fiercely loyal once trusted.', ent: 'Umbrit. Small, dark, suspicious of everyone. We get along perfectly.', src: [{ t: 'starter' }, { t: 'breed' }], find: 'Choose it as your starter. Also hatches from Dark + Fire parents.' },
    { id: 'cannonis', el: 'water', role: 'tank', ids: ['cannonis', 'reefback', 'shellfin'], names: ['Cannonis', 'Reefback', 'Shellfin'], titles: ['The Living Artillery', 'The Coral Bastion', 'The Tidal Battery'], design: ['card', 'card', 'card'],
      lore: ['A hunched shell beast with a living cannon grown into its back. It fires pressurised water, and very rarely misses.', 'Coral crests and glowing vents mark a Cannonis that has spent years on the reef. The barrel hums before it fires.', 'Blade fins and shoulder guards. A Shellfin can hold a shoreline against a storm, and has.'],
      pers: 'Steady, protective, proud of its aim.', ent: 'Cannonis. Points its cannon at problems. Some days I see the appeal.', src: [{ t: 'area', area: 'tidepools' }, { t: 'breed' }], find: 'Explore the Tide Pools. Or hatch from Earth + Water parents.' },
    { id: 'kairyu', el: 'water', role: 'swift', ids: ['kairyu', 'tidalong', 'oceanfang'], names: ['Kairyu', 'Tidalong', 'Oceanfang'], titles: ['The Tidal Monkey', 'The Wave Runner', 'The Deep Fang'], design: ['card', 'card', 'card'],
      lore: ['Born from the ocean’s depths, Kairyu is a spirited, loyal companion whose body is shaped by the flow of water.', 'Fins grow along its arms and its mane rises like surf. It moves between land and sea without breaking stride.', 'Crystal fins and a tide-bright tail. Legends say it can sense the feelings of whoever it bonds with.'],
      pers: 'Playful, loyal, never still.', ent: 'Kairyu. Flows with strength, protects with heart. Splashes everything else.', src: [{ t: 'area', area: 'tidepools' }, { t: 'breed' }], find: 'Explore the Tide Pools. Or hatch from Water + Water parents.' },
    { id: 'aquaflora', el: 'water', role: 'mystic', ids: ['aquaflora', 'aquaflora2', 'aquaflora3'], names: ['Aquaflora', 'Aquaflora II', 'Aquaflora III'], titles: ['The Torrent Guardian', 'The Tidal Warden', 'The Abyssal Sovereign'], design: ['card', 'card', 'card'],
      lore: ['Born from the union of ocean currents and ancient coral. Its coral crown is a symbol of balance and renewal.', 'As it grows it gains legs, so it can explore deeper waters and protect its reef.', 'Each evolution brings greater control over the ocean’s energy. Water ribbons follow it wherever it walks.'],
      pers: 'Calm, careful, quietly powerful.', ent: 'Aquaflora. The tide brings life. And coral. Mostly coral.', src: [{ t: 'area', area: 'tidepools' }, { t: 'breed' }], find: 'Explore the Tide Pools. Or hatch from Light + Water parents.' },
    { id: 'gaiaroki', el: 'earth', role: 'bruiser', ids: ['gaiaroki', 'terraki', 'rockraki'], names: ['Gaiaroki', 'Terraki', 'Rockraki'], titles: ['The Earthbound Primate', 'The Mossback', 'The Mountain Fist'], design: ['card', 'card', 'card'],
      lore: ['Born from the fractured mountain ranges, its body is covered in living rock and moss. Often found guarding old stones.', 'Rock plates grow over its shoulders. It moves through rugged ground as if the ground had asked it to.', 'Both fists are boulders now. Small stones orbit it, waiting to be thrown.'],
      pers: 'Strong, loyal, never backs down.', ent: 'Gaiaroki. Earth, strength, loyalty, and a deep love of throwing rocks.', src: [{ t: 'area', area: 'meadow' }, { t: 'breed' }], find: 'Explore the Sunlit Meadow. Or hatch from Earth + Earth parents.' },
    { id: 'pyrocell', el: 'earth', role: 'tank', ids: ['pyrocell', 'pyroforge', 'pyrocore'], names: ['Pyro-Cell', 'Pyro-Forge', 'Pyro-Core'], titles: ['The Ember Stone', 'The Walking Kiln', 'The Molten Guardian'], design: ['new', 'new', 'card'],
      lore: ['A warm stone with a heartbeat. It rolls towards anything cold and sits on it until it isn’t.', 'Molten seams split its plates as it grows. It hums like a kiln when it is happy.', 'Forged from primal geothermal stone, Pyro-Core guards the deep heat of the islands. A force of containment and power.'],
      pers: 'Slow, warm, immovable.', ent: 'Pyro-Core. Don’t lean on it. I learned that the hard way.', src: [{ t: 'area', area: 'emberridge' }, { t: 'breed' }], find: 'Explore Ember Ridge. Or hatch from Earth + Fire parents.' },
    { id: 'acinus', el: 'nature', role: 'tank', ids: ['acinus', 'berrant', 'calyxar'], names: ['Acinus', 'Berrant', 'Calyxar'], titles: ['The Verdant Berry', 'The Bramble Shell', 'The Orchard Titan'], design: ['card', 'card', 'card'],
      lore: ['A gentle but resilient forest dweller known for the berries that grow on its back. It leaves fertile soil wherever it walks.', 'Its berry bush grows larger and brighter, drawing wildlife to it.', 'Vines bind its rocky plates and the bush bears fruit of two colours. The forest follows it.'],
      pers: 'Gentle, patient, generous with berries.', ent: 'Acinus. Rooted in nature, grown by balance. Also very snackable. Don’t.', src: [{ t: 'area', area: 'meadow' }, { t: 'breed' }], find: 'Explore the Sunlit Meadow. Or hatch from Nature + Nature parents.' },
    { id: 'sylvaneer', el: 'nature', role: 'swift', ids: ['sylvaneer', 'sylvaneer2', 'sylvaneer3'], names: ['Sylvaneer', 'Sylvaneer II', 'Sylvaneer III'], titles: ['The Verdant Spirit', 'The Antler Grove', 'The Forest Crown'], design: ['card', 'card', 'card'],
      lore: ['A moss-coated stag with a rune glowing on its flank. Its antlers are alive and bud in spring.', 'Its antlers branch further each year, and birds nest in them without asking.', 'Rooted in nature, guided by balance. Its crown of antlers glows blue at the tips.'],
      pers: 'Watchful, graceful, slow to trust.', ent: 'Sylvaneer. The forest’s own messenger. It doesn’t talk much. Neither does the forest.', src: [{ t: 'area', area: 'meadow' }, { t: 'breed' }], find: 'Explore the Sunlit Meadow. Or hatch from Nature + Water parents.' },
    { id: 'terraflora', el: 'nature', role: 'mystic', ids: ['terraflora', 'terraflora2', 'terraflora3'], names: ['Terraflora', 'Terraflora II', 'Terraflora III'], titles: ['The Root Guardian', 'The Grove Sentinel', 'The Worldshaper'], design: ['card', 'card', 'card'],
      lore: ['Grown from a deep-forest pattern meant to keep the land stable. It nurtures fragile things and helps them grow.', 'Its branches reach further and its bond with the land deepens. A vigilant guardian of its grove.', 'A living embodiment of nature’s will. It reshapes the land, balances ecosystems and makes sure life endures.'],
      pers: 'Thoughtful, nurturing, very patient.', ent: 'Terraflora. Same roots, greater purpose. Do not step on the roots.', src: [{ t: 'area', area: 'meadow' }, { t: 'breed' }], find: 'Explore the Sunlit Meadow. Or hatch from Earth + Nature parents.' },
    { id: 'emberix', el: 'fire', role: 'swift', ids: ['emberix', 'flaremon', 'infernox'], names: ['Emberix', 'Flaremon', 'Infernox'], titles: ['The Frostflame', 'The Pale Blaze', 'The Cold Inferno'], design: ['card', 'card', 'card'],
      lore: ['Born from the eternal flame and forged by cold winds, Emberix is the balance between fire and ice.', 'Its blue flames grow along its back. They warm the heart, and do not burn friends.', 'A full mane of frost-blue fire. Its presence brings hope to those who wander in the dark.'],
      pers: 'Energetic, curious, bonds quickly.', ent: 'Emberix. Small flame, big heart. Cold to the touch, oddly.', src: [{ t: 'area', area: 'emberridge' }, { t: 'breed' }], find: 'Explore Ember Ridge. Or hatch from Fire + Nature parents.' },
    { id: 'pyrokai', el: 'fire', role: 'bruiser', ids: ['pyrokai', 'emberkai', 'infernokai'], names: ['Pyrokai', 'Emberkai', 'Infernokai'], titles: ['The Ember Monkey', 'The Flame Climber', 'The Blue Inferno'], design: ['card', 'card', 'card'],
      lore: ['Born from a rare ember within the volcanic isles. Its flames are said to carry the spirits of its ancestors.', 'Flames run down its shoulders now. It climbs the hottest peaks for fun.', 'Its whole mane is blue fire. It guides its friends through the darkest forests and the hottest peaks.'],
      pers: 'Spirited, playful, loyal.', ent: 'Pyrokai. A spirited little ember. Keep it away from the bookshelves.', src: [{ t: 'area', area: 'emberridge' }, { t: 'breed' }], find: 'Explore Ember Ridge. Or hatch from Fire + Fire parents.' },
    { id: 'igniflare', el: 'fire', role: 'bruiser', ids: ['igniflare', 'pyronix', 'ignivor'], names: ['Igniflare', 'Pyronix', 'Ignivor'], titles: ['The Kindled Hatchling', 'The Ash Wing', 'The Eternal Flame'], design: ['card', 'card', 'card'],
      lore: ['A dragon hatchling with a flame for a tail-tip. It practises roaring when it thinks nobody is listening.', 'Its wings are obsidian and its scales glow at the seams. It has started to fly, badly, then well.', 'A majestic dragon born from the primal energy of fire and rebirth. Both destroyer and guardian.'],
      pers: 'Bold, proud, secretly soft.', ent: 'Ignivor. Fire, rebirth, eternity. And a very loud sneeze.', src: [{ t: 'area', area: 'emberridge' }, { t: 'breed' }], find: 'Explore Ember Ridge. Or hatch from Fire + Light parents.' },
    { id: 'pyrospark', el: 'fire', role: 'mystic', ids: ['pyrospark', 'pyrohawk', 'pyrophoenix'], names: ['Pyro-Spark', 'Pyro-Hawk', 'Pyro-Phoenix'], titles: ['The Ember Chick', 'The Flame Hawk', 'The Blaze-Crest'], design: ['new', 'new', 'card'],
      lore: ['A round red chick that leaves little scorch marks where it naps.', 'Its wings have caught fire properly now. It circles high over the ridges.', 'Born of an ancient cycle of renewal, Pyro-Phoenix burns away what is broken so something new can grow.'],
      pers: 'Bright, restless, impossible to keep indoors.', ent: 'Pyro-Phoenix. It always comes back. Usually warmer.', src: [{ t: 'area', area: 'windbluff' }, { t: 'breed' }], find: 'Explore Wind Bluff. Or hatch from Fire + Wind parents.' },
    { id: 'zephyr', el: 'wind', role: 'swift', ids: ['zephyr', 'aeolus', 'stormbringer'], names: ['Zephyr', 'Aeolus', 'Stormbringer'], titles: ['The Storm Warden', 'The Sky Strider', 'The Tempest Crown'], design: ['card', 'card', 'card'],
      lore: ['Said to be born from the meeting of sky and spirit. It roams the floating islands, guiding lost travellers.', 'Its wings grow broad and its golden armour brightens. It protects the balance of the winds.', 'Those who earn its trust can ride the skies with it. Storms part when it passes.'],
      pers: 'Noble, alert, a little vain about its feathers.', ent: 'Zephyr. Beyond the clouds, always. It will remind you.', src: [{ t: 'area', area: 'windbluff' }, { t: 'breed' }], find: 'Explore Wind Bluff. Or hatch from Wind + Wind parents.' },
    { id: 'voltar', el: 'dark', role: 'mystic', ids: ['voltar', 'voltar2', 'voltar3'], names: ['Voltar', 'Voltar II', 'Voltar III'], titles: ['The Sparkling Jester', 'The Chaos Harlequin', 'The Cosmic Trickster'], design: ['card', 'card', 'card'],
      lore: ['Born from a glitch, Voltar began as a playful bug with a spark in its hat.', 'Its hunger for tricks grew. Lightning orbs follow its hands and a cape follows the rest of it.', 'It is more than a jester now: a force of chaos that bends the room with every trick. What was once a bug is now a legend.'],
      pers: 'Mischievous, quick, never boring.', ent: 'Voltar. Same roots, greater chaos. Count your spoons.', src: [{ t: 'area', area: 'duskgrove' }, { t: 'breed' }], find: 'Explore the Dusk Grove. Or hatch from Dark + Dark parents.' },
    { id: 'zeep', el: 'metal', role: 'tank', ids: ['zeep', 'zeep2', 'zeep3'], names: ['Zeep', 'Zeep II', 'Zeep III'], titles: ['The Tiny Shell', 'The Core Shell', 'The Quantum Shell'], design: ['card', 'card', 'card'],
      lore: ['A discarded fragment born in the shadows of forgotten technology. It may look small, but its core holds old power.', 'Its shell grows more advanced, absorbing energy into bright crystals.', 'The core is fully awake. Zeep’s shell holds the power of a lost civilisation.'],
      pers: 'Quiet, steady, curious about buttons.', ent: 'Zeep. A shell full of old secrets. It won’t tell me any of them.', src: [{ t: 'area', area: 'duskgrove' }, { t: 'breed' }], find: 'Explore the Dusk Grove. Or hatch from Metal or Dark + Earth parents.' },
    { id: 'aimza', el: 'resonance', role: 'mystic', ids: ['aimza', 'aimza2', 'aimza3'], names: ['Aimza', 'Aimza II', 'Aimza III'], titles: ['The Awakening', 'The Second Head', 'The Third Head'], design: ['card', 'card', 'card'],
      lore: ['Created by Meta using code copied from Atem. A child born from imitation, not origin, and already aware that it is different.', 'With the birth of a second head, Aimza’s power and presence grew. The more it learns, the more it evolves.', 'The third head marked its final stage. It is no longer just a child: it is a living bridge between two worlds.'],
      pers: 'Intelligent, protective, curious, gentle.', ent: 'Aimza. A different code, but the same heart.', src: [{ t: 'gift' }, { t: 'area', area: 'driftisle' }, { t: 'breed' }], find: 'Appears when the Spire stirs. Also found on Drift Isle, or hatched from Resonance parents.' },
    { id: 'lumi', el: 'light', role: 'mystic', ids: ['lumi', 'lumi2', 'lumi3'], names: ['Lumi', 'Lumi II', 'Lumi III'], titles: ['The Soft Spark', 'The Winged Spark', 'The Haloed Spark'], design: ['card', 'card', 'card'],
      lore: ['A fragment of pure data that gained a gentle will. Lumi drifts around looking for warmth and connection.', 'Small wings and a bright gem at its heart. It shields the people it likes.', 'A halo, bright wings and two floating hands for holding on to friends.'],
      pers: 'Gentle, curious, protective.', ent: 'Lumi. A soft spark. Please don’t let it near the Spire wiring.', src: [{ t: 'area', area: 'windbluff' }, { t: 'breed' }], find: 'Explore Wind Bluff. Or hatch from Light + Light parents.' },
    { id: 'meta', el: 'metal', role: 'mystic', legendary: true, ids: ['meta1', 'meta2', 'meta'], names: ['Meta-01', 'Meta-02', 'Meta'], titles: ['The Waking Signal', 'The Growing Network', 'The Second Tech Amina'], design: ['new', 'new', 'card'],
      lore: ['A small, bright frame with a few short cables. It plugs into anything that hums.', 'Its cables lengthen and its halo flickers on. It is learning to talk to machines, and to people.', 'The second Tech Amina, crafted by ancient humans born for peace. Its long wired hair connects it to every kind of technology.'],
      pers: 'Communicative, intelligent, kind.', ent: 'Meta. The more we connect, the more we understand. Her words, not mine.', src: [{ t: 'dungeon' }], find: 'Joins you the first time you clear the Hollow Veil.' },
    { id: 'atem', el: 'metal', role: 'bruiser', legendary: true, ids: ['atem1', 'atem2', 'atem'], names: ['Atem-01', 'Atem-02', 'Atem'], titles: ['The Iron Seed', 'The First Blade', 'The First Tech Amina'], design: ['new', 'new', 'card'],
      lore: ['A compact armoured frame. Its fists look like they want to be something sharper.', 'One arm has learned to become a blade. It practises with great seriousness.', 'The first Tech Amina, forged by ancient humans for war. It can reshape its body, but uses that power only to protect.'],
      pers: 'Tactical, relentless, quietly gentle.', ent: 'Atem. War built it, peace keeps it. Mind the blades.', src: [{ t: 'dungeon' }], find: 'Joins you the first time you clear the Resonance Scar.' },
  ];
  D.LINES = {};
  D.ROSTER = [];
  // Dev 8 naming convention: every form keeps its line's name. Base form "Name", then "Name II" and "Name III".
  // The line name is the base form's name, except for lines whose only supplied card is the final form
  // (Pyro-Core, Pyro-Phoenix, Meta, Atem): there the card's name is the line's name.
  const LINE_NAME = { pyrocell: 'Pyro-Core', pyrospark: 'Pyro-Phoenix', meta: 'Meta', atem: 'Atem' };
  D.STAGE_SUFFIX = ['', ' II', ' III'];
  D.V07_NAMES = {}; // the v0.7 display names, kept so old names can still be searched or shown in notes
  LINES.forEach((L) => {
    const base = LINE_NAME[L.id] || L.names[0];
    L.ids.forEach((id, i) => { D.V07_NAMES[id] = L.names[i]; });
    L.names = L.ids.map((id, i) => base + D.STAGE_SUFFIX[i]);
    D.LINES[L.id] = { id: L.id, el: L.el, ids: L.ids.slice(), legendary: !!L.legendary, name: base, role: L.role };
    L.ids.forEach((id, i) => {
      const stg = i + 1, b = ROLE[L.role], m = STAGE_MULT[i] * (L.legendary ? 1.08 : 1), mv = MOVES[L.el];
      const next = L.ids[i + 1];
      D.ROSTER.push({
        id, name: L.names[i], title: L.titles[i], el: L.el, line: L.id, stage: stg, design: L.design[i],
        evo: next ? { to: next, lv: D.EVO_REQ[stg + 1].lv, cost: D.EVO_REQ[stg + 1].cost } : undefined,
        stats: { hp: Math.round(b.hp * m), atk: Math.round(b.atk * m), def: Math.round(b.def * m), spd: Math.round(b.spd * (1 + (m - 1) * 0.6)) },
        abil: [mv[0], mv[stg]], pers: L.pers, lore: L.lore[i], ent: L.ent,
        find: stg === 1 ? L.find : L.names[i - 1] + ' evolves at level ' + D.EVO_REQ[stg].lv + ' (when you choose).',
        src: stg === 1 ? L.src : [{ t: 'evolve', from: L.ids[i - 1] }],
        legendary: !!L.legendary,
        art: { vox: L.id, st: stg },
      });
    });
  });
  D.SPECIES = {};
  D.ROSTER.forEach((s) => (D.SPECIES[s.id] = s));
  D.lineOf = (id) => D.LINES[D.SPECIES[id].line];

  /* Breeding: two parent elements -> the base form of a line. locked: needs flag r2 (Dormant Spire awake). */
  D.BREED = {
    'dark+dark': { sp: 'voltar' }, 'earth+earth': { sp: 'gaiaroki' }, 'fire+fire': { sp: 'pyrokai' }, 'light+light': { sp: 'lumi' },
    'nature+nature': { sp: 'acinus' }, 'water+water': { sp: 'kairyu' }, 'wind+wind': { sp: 'zephyr' }, 'metal+metal': { sp: 'zeep' },
    'fire+nature': { sp: 'emberix' }, 'nature+water': { sp: 'sylvaneer' }, 'light+water': { sp: 'aquaflora' }, 'earth+water': { sp: 'cannonis' },
    'earth+nature': { sp: 'terraflora' }, 'earth+fire': { sp: 'pyrocell' }, 'fire+light': { sp: 'igniflare' }, 'fire+wind': { sp: 'pyrospark' },
    'light+wind': { sp: 'lumi' }, 'dark+wind': { sp: 'voltar' }, 'dark+earth': { sp: 'zeep' }, 'earth+light': { sp: 'gaiaroki' },
    'light+nature': { sp: 'lumifern' }, 'dark+fire': { sp: 'umbrit' }, 'nature+wind': { sp: 'sylvaneer' }, 'water+wind': { sp: 'kairyu' },
    'earth+metal': { sp: 'zeep' }, 'fire+metal': { sp: 'pyrocell' }, 'light+metal': { sp: 'lumi' }, 'dark+metal': { sp: 'zeep' },
    'dark+light': { sp: 'aimza', locked: true },
    'resonance+resonance': { sp: 'aimza', locked: true },
  };
  // any Resonance + non-Resonance parent (locked) also hatches Aimza (handled in rules)
  D.RESONANCE_CHILD = 'aimza';

  /* v0.6 -> v0.7 species conversion (save migration). Stage 2 v0.6 species map to stage 2 forms. */
  D.LEGACY = {
    lumifern: 'lumifern', solarbloom: 'solarbloom', umbrit: 'umbrit', duskmantle: 'duskmantle',
    mossbun: 'acinus', pebblop: 'gaiaroki', thornpup: 'terraflora', ripplet: 'cannonis', brinefin: 'kairyu',
    emberkit: 'pyrokai', cindersnail: 'pyrocell', graniteling: 'gaiaroki', gloomole: 'voltar', zephyrow: 'zephyr',
    stormfinch: 'pyrospark', glimmoth: 'lumi', magmoss: 'emberix', puffcap: 'sylvaneer', tidewisp: 'aquaflora',
    haloray: 'igniflare', veilfox: 'meta1', whisperhusk: 'zeep', relicwarden: 'terraki', briarstag: 'sylvaneer2',
    resonyx: 'aimza', driftcub: 'aimza', echolyn: 'atem1', chimerrow: 'aimza',
  };
})(typeof window !== 'undefined' ? window : globalThis);
