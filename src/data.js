/* Aminas: Light & Shadow — content data (pure data, no DOM). */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = (A.Data = {});

  D.VERSION = '0.4.0-dev';
  // Hidden testing panel (Settings > tap the version line 7 times). MUST be false for an App Store / public release build.
  D.DEV_TOOLS = true;
  D.SAVE_KEY = 'aminas-light-shadow-save-v1';
  D.MAX_LEVEL = 30;
  D.MAX_INSTANCES = 60;

  /* ---------- Elements ---------- */
  D.ELEMENTS = {
    light:     { name: 'Light',     color: '#ffd86b', dark: '#c9951f' },
    dark:      { name: 'Dark',      color: '#9a78e6', dark: '#4b3590' },
    nature:    { name: 'Nature',    color: '#6fd36f', dark: '#2f8a3c' },
    fire:      { name: 'Fire',      color: '#ff8050', dark: '#c4401c' },
    water:     { name: 'Water',     color: '#52b8ff', dark: '#1f72b8' },
    earth:     { name: 'Earth',     color: '#c49a68', dark: '#7a5632' },
    wind:      { name: 'Wind',      color: '#8fe6d6', dark: '#3d9c8c' },
    resonance: { name: 'Resonance', color: '#ff86d6', dark: '#a8338a' },
  };
  // attacker -> defenders it is strong against (x1.5). Reverse is x0.67.
  D.STRONG = {
    light: ['dark'], dark: ['light'],
    fire: ['nature', 'wind'], water: ['fire', 'earth'], nature: ['water', 'earth'],
    earth: ['wind'], wind: ['nature'], resonance: [],
  };

  /* ---------- Abilities ---------- */
  // type: dmg | drain (dmg + heal half) | weaken (dmg + -atk) | guard | heal
  D.ABILITIES = {
    glowpulse:   { name: 'Glow Pulse',     el: 'light',  type: 'dmg',    power: 40, cd: 0, desc: 'A warm pulse of light.' },
    sunsprout:   { name: 'Sun Sprout',     el: 'light',  type: 'drain',  power: 45, cd: 2, desc: 'Damages the foe and heals you for half the damage.' },
    radiantburst:{ name: 'Radiant Burst',  el: 'light',  type: 'dmg',    power: 70, cd: 2, desc: 'A blooming flash of sunlight.' },
    shadenip:    { name: 'Shade Nip',      el: 'dark',   type: 'dmg',    power: 40, cd: 0, desc: 'A quick bite from the shadows.' },
    gloomveil:   { name: 'Gloom Veil',     el: 'dark',   type: 'weaken', power: 35, cd: 2, desc: 'Damages the foe and lowers its attack.' },
    duskrend:    { name: 'Dusk Rend',      el: 'dark',   type: 'dmg',    power: 70, cd: 2, desc: 'Claws of folded twilight.' },
    vinewhip:    { name: 'Vine Whip',      el: 'nature', type: 'dmg',    power: 40, cd: 0, desc: 'A lashing vine.' },
    leafguard:   { name: 'Leaf Guard',     el: 'nature', type: 'guard',  power: 0,  cd: 2, desc: 'Halves the next hit you take.' },
    mend:        { name: 'Mend',           el: 'nature', type: 'heal',   power: 0,  cd: 3, desc: 'Restores 25% of your health, then a little more for 2 turns.', fx: { k: 'regen', p: 1, n: 2, self: true } },
    emberflick:  { name: 'Ember Flick',    el: 'fire',   type: 'dmg',    power: 40, cd: 0, desc: 'A spit of warm sparks. 20% chance to burn.', fx: { k: 'burn', p: 0.2, n: 2 } },
    flarebite:   { name: 'Flare Bite',     el: 'fire',   type: 'dmg',    power: 60, cd: 2, desc: 'A blazing chomp. 50% chance to burn.', fx: { k: 'burn', p: 0.5, n: 2 } },
    bubblepop:   { name: 'Bubble Pop',     el: 'water',  type: 'dmg',    power: 40, cd: 0, desc: 'A cheerful burst of bubbles.' },
    tidalsurge:  { name: 'Tidal Surge',    el: 'water',  type: 'dmg',    power: 60, cd: 2, desc: 'A rolling wave. 50% chance to soak the foe (slower for 2 turns).', fx: { k: 'soak', p: 0.5, n: 2 } },
    pebbletoss:  { name: 'Pebble Toss',    el: 'earth',  type: 'dmg',    power: 40, cd: 0, desc: 'Thrown with enthusiasm.' },
    boulderroll: { name: 'Boulder Roll',   el: 'earth',  type: 'dmg',    power: 60, cd: 2, desc: 'Curls up and rolls over the foe. 30% chance to stun; staggers a charging guardian.', fx: { k: 'stun', p: 0.3, n: 1 } },
    gust:        { name: 'Gust',           el: 'wind',   type: 'dmg',    power: 40, cd: 0, desc: 'A snapping gust.' },
    cyclonespin: { name: 'Cyclone Spin',   el: 'wind',   type: 'weaken', power: 40, cd: 2, desc: 'Damages the foe and lowers its attack.' },
    echowave:    { name: 'Echo Wave',      el: 'resonance', type: 'dmg', power: 50, cd: 1, desc: 'Strikes true; never resisted, never amplified.', neutral: true },
    hum:         { name: 'Hum',            el: 'resonance', type: 'heal', power: 0, cd: 3, desc: 'A low note that mends you for 25%, then a little more for 2 turns.', fx: { k: 'regen', p: 1, n: 2, self: true } },
    // Guardian moves: never in a species list. A guardian spends a turn charging (telegraphed), then unleashes.
    // A guard raised against a guardian move blocks three quarters of it (instead of half).
    rootcrush:   { name: 'Root Crush',     el: 'earth',  type: 'dmg',    power: 95, cd: 0, boss: true, tell: 'Stone and root tear up through the flagstones. Root Crush is coming!', desc: 'The Sentinel drives stone and root up through the floor. Nature and Water Aminas resist it.' },
    unsaidverdict: { name: 'Unsaid Verdict', el: 'dark', type: 'dmg',  power: 65, cd: 0, boss: true, tell: 'The Keeper draws in every word nobody spoke. Unsaid Verdict is coming!', desc: 'A judgement that silences: no special abilities next turn.', fx: { k: 'silence', p: 1, n: 2 } },
    resonantcollapse: { name: 'Resonant Collapse', el: 'resonance', type: 'dmg', power: 75, cd: 0, boss: true, neutral: true, after: 'guard', tell: 'The air folds inward. Resonant Collapse is coming!', desc: 'Never resisted. The Echo shields itself afterwards.' },
  };

  /* ---------- Roster (28) ---------- */
  // stats: base hp/atk/def/spd at level 1 (grow ~11% per level)
  // src: machine-readable acquisition (verified in tests); find: text shown to the player
  const art = (o) => o; // readability helper
  D.ROSTER = [
    // --- Starters & their evolutions ---
    { id: 'lumifern', name: 'Lumifern', el: 'light', stage: 1, evo: { to: 'solarbloom', lv: 12 },
      stats: { hp: 46, atk: 11, def: 9, spd: 10 }, abil: ['glowpulse', 'sunsprout'],
      pers: 'Gentle, curious, stubborn about naps.',
      lore: 'A sprout-eared Amina whose leaves hold a little stored sunlight. It hums when the ruins are repaired, as if relieved.',
      ent: 'That one? A fine Kind Soul. Stubborn, mind you. But then, most of the good ones are.',
      find: 'Choose it as your starter. Also hatches from Light + Nature parents.',
      src: [{ t: 'starter' }, { t: 'breed' }],
      art: art({ body: 'round', c1: '#bff58a', c2: '#fff7c8', c3: '#ffd86b', ears: 'leaf', tail: 'leaf', mark: 'star', eyes: 'big', glow: '#ffe9a0' }) },
    { id: 'umbrit', name: 'Umbrit', el: 'dark', stage: 1, evo: { to: 'duskmantle', lv: 12 },
      stats: { hp: 44, atk: 12, def: 8, spd: 11 }, abil: ['shadenip', 'gloomveil'],
      pers: 'Shy, watchful, fiercely loyal once trusted.',
      lore: 'A velvet-dark baby with a moon-pale crest. Shadows pool under it like a puddle it refuses to leave.',
      ent: 'Umbrit. Small, dark, suspicious of everyone. We get along perfectly.',
      find: 'Choose it as your starter. Also hatches from Dark + Fire parents.',
      src: [{ t: 'starter' }, { t: 'breed' }],
      art: art({ body: 'round', c1: '#5a4a9a', c2: '#a89be0', c3: '#f4e9ff', ears: 'pointy', tail: 'wisp', mark: 'rune', eyes: 'big', glow: '#b9a2ff' }) },
    { id: 'solarbloom', name: 'Solarbloom', el: 'light', stage: 2,
      stats: { hp: 66, atk: 17, def: 14, spd: 13 }, abil: ['glowpulse', 'radiantburst'],
      pers: 'Warm, patient, quietly proud.',
      lore: 'Lumifern fully bloomed. A crown of petals turns to follow whoever it trusts most.',
      ent: 'Solarbloom. Don’t stare directly. Or do. I’m not your optician.',
      find: 'Lumifern evolves at level 12.',
      src: [{ t: 'evolve', from: 'lumifern' }],
      art: art({ body: 'round', c1: '#9fe36a', c2: '#fff3b0', c3: '#ffcf4a', ears: 'crown', tail: 'leaf', mark: 'star', eyes: 'big', glow: '#fff0a8', big: true }) },
    { id: 'duskmantle', name: 'Duskmantle', el: 'dark', stage: 2,
      stats: { hp: 62, atk: 19, def: 12, spd: 15 }, abil: ['shadenip', 'duskrend'],
      pers: 'Composed, protective, dry-humoured.',
      lore: 'Umbrit grown into a cloak of living twilight. It stands between you and the dark, and keeps the dark company.',
      ent: 'Duskmantle. Reminds me of someone. No, I won’t say who.',
      find: 'Umbrit evolves at level 12.',
      src: [{ t: 'evolve', from: 'umbrit' }],
      art: art({ body: 'tall', c1: '#4a3a88', c2: '#9a8ad8', c3: '#f0e4ff', ears: 'horn', tail: 'wisp', mark: 'rune', eyes: 'sharp', glow: '#b9a2ff', big: true }) },

    // --- Meadow / common ---
    { id: 'mossbun', name: 'Mossbun', el: 'nature', stage: 1,
      stats: { hp: 48, atk: 10, def: 11, spd: 8 }, abil: ['vinewhip', 'leafguard'],
      pers: 'Sleepy and soft. Believes every problem is solved by lying down.',
      lore: 'A round little rabbit-shaped Amina with a coat of living moss. Wildflowers sprout where it naps.',
      ent: 'Mossbun. Has never hurried in its life. I envy it terribly.',
      find: 'Explore the Sunlit Meadow. Or hatch from Earth + Nature parents.',
      src: [{ t: 'area', area: 'meadow' }, { t: 'breed' }],
      art: art({ body: 'round', c1: '#7fcf79', c2: '#e8f7c8', c3: '#ff9ec7', ears: 'long', tail: 'fluff', mark: 'spots', eyes: 'sleepy' }) },
    { id: 'pebblop', name: 'Pebblop', el: 'earth', stage: 1,
      stats: { hp: 50, atk: 10, def: 13, spd: 6 }, abil: ['pebbletoss', 'boulderroll'],
      pers: 'Earnest. Collects small stones and gives them as gifts.',
      lore: 'A lopsided pebble-hided Amina. It insists every rock it hands you is the best rock.',
      ent: 'Pebblop. If it hands you a rock, say thank you. It matters more than you’d think.',
      find: 'Explore the Sunlit Meadow. Or hatch from Earth + Light parents.',
      src: [{ t: 'area', area: 'meadow' }, { t: 'breed' }],
      art: art({ body: 'rock', c1: '#b99b78', c2: '#e8d7bd', c3: '#8a6a48', ears: 'none', tail: 'none', mark: 'spots', eyes: 'big' }) },
    { id: 'thornpup', name: 'Thornpup', el: 'nature', stage: 1,
      stats: { hp: 44, atk: 13, def: 9, spd: 11 }, abil: ['vinewhip', 'mend'],
      pers: 'Bristly, bouncy, bad at being gentle. Trying.',
      lore: 'A burr-backed puppy of the old gardens. Its thorns soften whenever it is praised.',
      ent: 'Thornpup. Leave your fingers out of its mouth. Learn from my mistakes.',
      find: 'Explore the Sunlit Meadow. Or hatch from two Nature parents.',
      src: [{ t: 'area', area: 'meadow' }, { t: 'breed' }],
      art: art({ body: 'long', c1: '#86c76a', c2: '#e6f2b8', c3: '#5a8a3a', ears: 'pointy', tail: 'leaf', mark: 'stripes', eyes: 'big', spikes: true }) },

    // --- Tide pools ---
    { id: 'ripplet', name: 'Ripplet', el: 'water', stage: 1,
      stats: { hp: 45, atk: 11, def: 9, spd: 12 }, abil: ['bubblepop', 'tidalsurge'],
      pers: 'Playful. Splashes first, apologises later.',
      lore: 'A droplet-shaped Amina that leaves tiny ripples in the air as it bounces.',
      ent: 'Ripplet. Wet. Cheerful. Somehow always in the way.',
      find: 'Explore the Tide Pools. Or hatch from Earth + Water parents.',
      src: [{ t: 'area', area: 'tidepools' }, { t: 'breed' }],
      art: art({ body: 'drop', c1: '#6cc6ff', c2: '#d8f3ff', c3: '#2f86d6', ears: 'fin', tail: 'fin', mark: 'spots', eyes: 'big', glow: '#b6e6ff' }) },
    { id: 'brinefin', name: 'Brinefin', el: 'water', stage: 1,
      stats: { hp: 52, atk: 11, def: 11, spd: 9 }, abil: ['bubblepop', 'tidalsurge'],
      pers: 'Grumbly, salty, secretly sentimental.',
      lore: 'A stout little fish that swims through the air near water. It keeps a collection of lost buttons.',
      ent: 'Brinefin. Complains constantly. Excellent company.',
      find: 'Explore the Tide Pools. Or hatch from two Water parents.',
      src: [{ t: 'area', area: 'tidepools' }, { t: 'breed' }],
      art: art({ body: 'fish', c1: '#4aa8e8', c2: '#cfeeff', c3: '#ffd27a', ears: 'fin', tail: 'fin', mark: 'stripes', eyes: 'sleepy' }) },

    // --- Ember Ridge ---
    { id: 'emberkit', name: 'Emberkit', el: 'fire', stage: 1,
      stats: { hp: 42, atk: 14, def: 8, spd: 12 }, abil: ['emberflick', 'flarebite'],
      pers: 'Brave beyond reason. Easily offended by cold weather.',
      lore: 'A kit with a flickering tail-flame. It warms cold stones just to be useful.',
      ent: 'Emberkit. Strong against anything leafy. Weak against anything damp. Like all of us.',
      find: 'Explore Ember Ridge. Or hatch from Fire + Light parents.',
      src: [{ t: 'area', area: 'emberridge' }, { t: 'breed' }],
      art: art({ body: 'long', c1: '#ff9a62', c2: '#ffe2b8', c3: '#ffd23a', ears: 'pointy', tail: 'flame', mark: 'stripes', eyes: 'big', glow: '#ffc07a' }) },
    { id: 'cindersnail', name: 'Cindersnail', el: 'fire', stage: 1,
      stats: { hp: 56, atk: 11, def: 13, spd: 4 }, abil: ['emberflick', 'flarebite'],
      pers: 'Slow, steady, radiates quiet warmth.',
      lore: 'Its shell is a small kiln. Travellers rest beside it and forget they were ever cold.',
      ent: 'Cindersnail. Takes an hour to cross a room. Arrives with excellent timing.',
      find: 'Explore Ember Ridge. Or hatch from two Fire parents.',
      src: [{ t: 'area', area: 'emberridge' }, { t: 'breed' }],
      art: art({ body: 'snail', c1: '#ffb07a', c2: '#fff0d0', c3: '#d4482a', ears: 'antenna', tail: 'none', mark: 'spots', eyes: 'sleepy', glow: '#ffb070' }) },
    { id: 'graniteling', name: 'Graniteling', el: 'earth', stage: 1,
      stats: { hp: 58, atk: 12, def: 15, spd: 4 }, abil: ['pebbletoss', 'boulderroll'],
      pers: 'Stoic. Speaks three words a year. Chooses them well.',
      lore: 'A small slab of living granite with a bright, unexpected face.',
      ent: 'Graniteling. Wall with feelings. Pleasant enough.',
      find: 'Explore Ember Ridge. Or hatch from two Earth parents.',
      src: [{ t: 'area', area: 'emberridge' }, { t: 'breed' }],
      art: art({ body: 'rock', c1: '#9a9aa6', c2: '#d8d8e2', c3: '#6a6a78', ears: 'horn', tail: 'none', mark: 'rune', eyes: 'sharp' }) },

    // --- Dusk Grove ---
    { id: 'gloomole', name: 'Gloomole', el: 'dark', stage: 1,
      stats: { hp: 50, atk: 12, def: 10, spd: 7 }, abil: ['shadenip', 'gloomveil'],
      pers: 'Gentle burrower. Terrified of surprises, enchanted by lanterns.',
      lore: 'A velvet mole of the quiet places. It digs by moonlight and always fills in its holes.',
      ent: 'Gloomole. Dark does not mean unkind. Remember that. I’ll deny saying it.',
      find: 'Explore the Dusk Grove (restore the Moon Shrine). Or hatch from two Dark parents.',
      src: [{ t: 'area', area: 'duskgrove' }, { t: 'breed' }],
      art: art({ body: 'round', c1: '#6a5aa8', c2: '#c8bff0', c3: '#ffd0f0', ears: 'round', tail: 'none', mark: 'spots', eyes: 'sleepy', snout: true }) },

    // --- Wind Bluff (opens after the Dormant Spire awakens) ---
    { id: 'zephyrow', name: 'Zephyrow', el: 'wind', stage: 1,
      stats: { hp: 40, atk: 12, def: 8, spd: 16 }, abil: ['gust', 'cyclonespin'],
      pers: 'Restless, breezy, forever on its way somewhere else.',
      lore: 'A swallow-shaped Amina trailing ribbons of air. It carries news between islands, mostly inaccurate.',
      ent: 'Zephyrow. Fast. Gossipy. Do not tell it anything you want kept private.',
      find: 'Explore the Wind Bluff (after the Dormant Spire awakens). Or hatch from Fire + Wind parents.',
      src: [{ t: 'area', area: 'windbluff' }, { t: 'breed' }],
      art: art({ body: 'bird', c1: '#8fe6d6', c2: '#e6fff8', c3: '#3d9c8c', ears: 'crest', tail: 'ribbon', mark: 'stripes', eyes: 'big', wings: true }) },
    { id: 'stormfinch', name: 'Stormfinch', el: 'wind', stage: 1,
      stats: { hp: 42, atk: 14, def: 8, spd: 15 }, abil: ['gust', 'cyclonespin'],
      pers: 'Loud, proud, wonderfully dramatic.',
      lore: 'A thundercloud-feathered finch. It sings before storms to warn everyone, and is offended if no one thanks it.',
      ent: 'Stormfinch. Opera, in a very small body. Cover your ears.',
      find: 'Explore the Wind Bluff. Or hatch from two Wind parents.',
      src: [{ t: 'area', area: 'windbluff' }, { t: 'breed' }],
      art: art({ body: 'bird', c1: '#7a8fd8', c2: '#dfe6ff', c3: '#ffe36a', ears: 'crest', tail: 'ribbon', mark: 'star', eyes: 'sharp', wings: true }) },
    { id: 'glimmoth', name: 'Glimmoth', el: 'light', stage: 1,
      stats: { hp: 40, atk: 12, def: 8, spd: 14 }, abil: ['glowpulse', 'sunsprout'],
      pers: 'Dreamy and easily distracted by anything shiny.',
      lore: 'A moth whose wings shed soft dust like lamplight. Old lanterns are said to have been built to match it.',
      ent: 'Glimmoth. Attracted to light. Which is, honestly, a perfectly sound life plan.',
      find: 'Explore the Wind Bluff. Or hatch from two Light parents.',
      src: [{ t: 'area', area: 'windbluff' }, { t: 'breed' }],
      art: art({ body: 'moth', c1: '#fff0b0', c2: '#fffbe6', c3: '#ffc84a', ears: 'antenna', tail: 'none', mark: 'star', eyes: 'big', wings: true, glow: '#fff4b8' }) },

    // --- Hybrids (breeding) ---
    { id: 'magmoss', name: 'Magmoss', el: 'fire', stage: 1,
      stats: { hp: 54, atk: 14, def: 11, spd: 7 }, abil: ['emberflick', 'flarebite'],
      pers: 'Smouldering optimist. Grows moss on warm stones and calls it gardening.',
      lore: 'Born where fire and growth agree to take turns. Its back is a tiny volcano blooming with ferns.',
      ent: 'Magmoss. A hybrid. Do not ask how. Or do. I have notes.',
      find: 'Hatch from Fire + Nature parents (Hatchery).',
      src: [{ t: 'breed' }],
      art: art({ body: 'long', c1: '#d4683a', c2: '#ffd9a8', c3: '#7ccf5a', ears: 'leaf', tail: 'flame', mark: 'spots', eyes: 'big', glow: '#ffa060' }) },
    { id: 'puffcap', name: 'Puffcap', el: 'nature', stage: 1,
      stats: { hp: 56, atk: 10, def: 12, spd: 6 }, abil: ['vinewhip', 'mend'],
      pers: 'Soft-spoken. Drifts through rainstorms, delighted.',
      lore: 'A mushroom-capped Amina that drinks rain through its cap and releases glowing spores when pleased.',
      ent: 'Puffcap. Nature and water. Mildly damp, endlessly pleasant.',
      find: 'Hatch from Nature + Water parents. Seen in the Overgrown Reliquary.',
      src: [{ t: 'breed' }],
      art: art({ body: 'cap', c1: '#f4d4a8', c2: '#fff4e0', c3: '#ff7a8a', ears: 'none', tail: 'none', mark: 'spots', eyes: 'sleepy' }) },
    { id: 'tidewisp', name: 'Tidewisp', el: 'water', stage: 1,
      stats: { hp: 46, atk: 13, def: 10, spd: 13 }, abil: ['bubblepop', 'tidalsurge'],
      pers: 'Serene, glowing, speaks in tides and half-sentences.',
      lore: 'A lantern-jelly of moonlit shallows. Where it passes, the water holds a little light for a while.',
      ent: 'Tidewisp. Light on water. The pairing I always liked best. Not that I had a favourite.',
      find: 'Hatch from Light + Water parents (Hatchery).',
      src: [{ t: 'breed' }],
      art: art({ body: 'jelly', c1: '#9ad4ff', c2: '#f0faff', c3: '#fff0a8', ears: 'none', tail: 'wisp', mark: 'star', eyes: 'big', glow: '#c8ecff' }) },
    { id: 'haloray', name: 'Haloray', el: 'light', stage: 1,
      stats: { hp: 46, atk: 14, def: 10, spd: 14 }, abil: ['glowpulse', 'sunsprout'],
      pers: 'Graceful, formal, extremely courteous.',
      lore: 'A manta-winged Amina circled by a thin ring of dawn-light. It bows to everyone, including walls.',
      ent: 'Haloray. Has better manners than the entire island combined.',
      find: 'Hatch from Light + Wind parents (Hatchery).',
      src: [{ t: 'breed' }],
      art: art({ body: 'moth', c1: '#ffe9a0', c2: '#fffaf0', c3: '#7fe0ff', ears: 'halo', tail: 'ribbon', mark: 'star', eyes: 'big', wings: true, glow: '#fff4c0' }) },
    { id: 'veilfox', name: 'Veilfox', el: 'dark', stage: 1,
      stats: { hp: 44, atk: 15, def: 9, spd: 15 }, abil: ['shadenip', 'gloomveil'],
      pers: 'Sly, elegant, finishes your sentences incorrectly on purpose.',
      lore: 'A fox with a tail like a drifting curtain. It slips between shadows and returns with trinkets nobody lost.',
      ent: 'Veilfox. Gets into things. Returns things. Somehow always with interest.',
      find: 'Hatch from Dark + Wind parents (Hatchery), or clear the Hollow Veil for the first time.',
      src: [{ t: 'breed' }, { t: 'dungeon', d: 'hollowveil', n: 1 }],
      art: art({ body: 'long', c1: '#7a5ac8', c2: '#d9cdf7', c3: '#ff9ad6', ears: 'pointy', tail: 'wisp', mark: 'rune', eyes: 'sharp', glow: '#c4a8ff' }) },
    { id: 'whisperhusk', name: 'Whisperhusk', el: 'dark', stage: 1,
      stats: { hp: 58, atk: 13, def: 14, spd: 6 }, abil: ['shadenip', 'gloomveil'],
      pers: 'Reserved. Says very little. Remembers everything.',
      lore: 'A hollow, seed-husk Amina with a lantern glow inside. Old stone seems to murmur when it passes.',
      ent: 'Whisperhusk. Listens to walls. Walls have more to say than people think.',
      find: 'Hatch from Dark + Earth parents (Hatchery).',
      src: [{ t: 'breed' }],
      art: art({ body: 'tall', c1: '#6c5a78', c2: '#d4c4dc', c3: '#ffe08a', ears: 'none', tail: 'none', mark: 'rune', eyes: 'lantern', glow: '#ffe08a' }) },

    // --- Rare dungeon ---
    { id: 'relicwarden', name: 'Relicwarden', el: 'earth', stage: 2,
      stats: { hp: 72, atk: 16, def: 18, spd: 6 }, abil: ['pebbletoss', 'boulderroll'],
      pers: 'Ancient, courteous, patient as a staircase.',
      lore: 'A mossy guardian who kept the Reliquary through long, quiet centuries. It forgives the vines that bound it.',
      ent: 'Relicwarden. Old as the stones and twice as polite. Do not insult its staircase.',
      find: 'Clear the Overgrown Reliquary for the first time.',
      src: [{ t: 'dungeon', d: 'reliquary', n: 1 }],
      art: art({ body: 'tall', c1: '#8aa078', c2: '#d8e4c8', c3: '#6a5a40', ears: 'horn', tail: 'none', mark: 'rune', eyes: 'lantern', glow: '#b8e69a', big: true, moss: true }) },
    { id: 'briarstag', name: 'Briarstag', el: 'nature', stage: 2,
      stats: { hp: 64, atk: 17, def: 13, spd: 13 }, abil: ['vinewhip', 'mend'],
      pers: 'Noble, wary, appears only for those who return.',
      lore: 'A stag crowned with blossoming antlers. It shows itself to those who come back to a place after leaving it.',
      ent: 'Briarstag. It only appears for those who return. Think about that. Or don’t. Up to you.',
      find: 'Clear the Overgrown Reliquary a second time.',
      src: [{ t: 'dungeon', d: 'reliquary', n: 2 }],
      art: art({ body: 'long', c1: '#a0c878', c2: '#f4f0cc', c3: '#ff9ec7', ears: 'antler', tail: 'fluff', mark: 'spots', eyes: 'sharp', glow: '#d0f0a0', big: true }) },

    // --- Resonance ---
    { id: 'resonyx', name: 'Resonyx', el: 'resonance', stage: 1,
      stats: { hp: 48, atk: 13, def: 10, spd: 12 }, abil: ['echowave', 'hum'],
      pers: 'Curious about everything. Hums when it is happy, and when it is not.',
      lore: 'A crystal-eared creature that appeared at the first disturbance. Its colours do not quite match any element.',
      ent: 'Resonyx. Came from the Singing Stones. Hums in a key I haven’t heard in a long, long time.',
      find: 'Investigate the Resonance disturbance on the island.',
      src: [{ t: 'event', ev: 'r1' }],
      art: art({ body: 'round', c1: '#ff9ede', c2: '#ffe6f6', c3: '#8ee6ff', ears: 'crystal', tail: 'wisp', mark: 'star', eyes: 'big', glow: '#ffb0ea' }) },
    { id: 'driftcub', name: 'Driftcub', el: 'resonance', stage: 1,
      stats: { hp: 54, atk: 13, def: 11, spd: 11 }, abil: ['echowave', 'hum'],
      pers: 'Cheerfully lost. Treats every place like home.',
      lore: 'A cub that floats an inch above the ground, trailing small clouds. It arrived with a drifting island that should not exist.',
      ent: 'Driftcub. From an island that was in the wrong place. As usual. Don’t pet it too long. It sticks.',
      find: 'Explore the Drift Isle (after the Dormant Spire awakens).',
      src: [{ t: 'area', area: 'driftisle' }],
      art: art({ body: 'round', c1: '#ffc6ee', c2: '#fff0fa', c3: '#9ad4ff', ears: 'round', tail: 'cloud', mark: 'spots', eyes: 'big', glow: '#ffd0f0' }) },
    { id: 'echolyn', name: 'Echolyn', el: 'resonance', stage: 1,
      stats: { hp: 50, atk: 14, def: 11, spd: 13 }, abil: ['echowave', 'hum'],
      pers: 'Repeats the last thing you said, then improves it.',
      lore: 'Born when Light and Dark are placed side by side and neither is asked to yield. It sings both halves of every song.',
      ent: 'Echolyn. Light and Dark in one. Neither one lost. I remember when that was considered impossible.',
      find: 'Hatch from Light + Dark parents (after the Dormant Spire awakens), or clear the Resonance Scar for the first time.',
      src: [{ t: 'breed' }, { t: 'dungeon', d: 'resonancescar', n: 1 }],
      art: art({ body: 'tall', c1: '#d8a8ff', c2: '#fff2c8', c3: '#9a78e6', ears: 'crystal', tail: 'wisp', mark: 'rune', eyes: 'star', glow: '#f0c8ff', split: true }) },
    { id: 'chimerrow', name: 'Chimerrow', el: 'resonance', stage: 1,
      stats: { hp: 56, atk: 15, def: 12, spd: 12 }, abil: ['echowave', 'hum'],
      pers: 'Never the same two days running. Insists this is consistency.',
      lore: 'A patchwork Amina stitched together by Resonance. Its horns, tail and feathers belong to no single species.',
      ent: 'Chimerrow. Resonance leftovers, assembled by hope. Wonderful. Don’t tell the paperwork.',
      find: 'Hatch from a Resonance Amina plus any other element (after the Dormant Spire awakens).',
      src: [{ t: 'breed' }],
      art: art({ body: 'long', c1: '#ffa6d8', c2: '#fff0f8', c3: '#8ee6ff', ears: 'antler', tail: 'flame', mark: 'stripes', eyes: 'star', glow: '#ffc0ec', wings: true }) },
  ];
  D.SPECIES = {};
  D.ROSTER.forEach((s) => (D.SPECIES[s.id] = s));

  /* ---------- Breeding recipes ---------- */
  // key = two elements sorted alphabetically joined by '+'. locked: needs flag r2 (Dormant Spire awake)
  D.BREED = {
    'dark+dark': { sp: 'gloomole' }, 'earth+earth': { sp: 'graniteling' }, 'fire+fire': { sp: 'cindersnail' },
    'light+light': { sp: 'glimmoth' }, 'nature+nature': { sp: 'thornpup' }, 'water+water': { sp: 'brinefin' },
    'wind+wind': { sp: 'stormfinch' },
    'fire+nature': { sp: 'magmoss' }, 'nature+water': { sp: 'puffcap' }, 'light+water': { sp: 'tidewisp' },
    'light+wind': { sp: 'haloray' }, 'dark+wind': { sp: 'veilfox' }, 'dark+earth': { sp: 'whisperhusk' },
    'earth+nature': { sp: 'mossbun' }, 'earth+light': { sp: 'pebblop' }, 'earth+water': { sp: 'ripplet' },
    'fire+light': { sp: 'emberkit' }, 'fire+wind': { sp: 'zephyrow' },
    'light+nature': { sp: 'lumifern' }, 'dark+fire': { sp: 'umbrit' },
    'dark+light': { sp: 'echolyn', locked: true },
    'resonance+resonance': { sp: 'driftcub', locked: true },
  };
  // any resonance + non-resonance (locked) -> chimerrow  (handled in rules)
  D.BREED_COST = { gold: 40, food: 25 };
  D.BREED_MIN_LEVEL = 5;
  D.EGG_SECONDS = { fast: 20, normal: 300 };

  /* Structures, buildings, islands, obstacles and quests now live in world-data.js. */

  /* ---------- Exploration areas ---------- */
  // steps: sequence for explore #1, #2, ...; after the list: small generic rewards.
  D.AREAS = {
    meadow:    { name: 'Sunlit Meadow', blurb: 'Warm grass, dandelion drift, and the occasional suspicious rustle.', unlock: null,
                 steps: [['res', 10, 4], ['find', 'mossbun'], ['res', 12, 4], ['find', 'pebblop'], ['res', 14, 5], ['find', 'thornpup']] },
    tidepools: { name: 'Tide Pools', blurb: 'Shallow, glittering pools threaded with old stonework.', unlock: { struct: 'tidegate' },
                 steps: [['res', 14, 4], ['find', 'ripplet'], ['res', 16, 5], ['find', 'brinefin']] },
    emberridge:{ name: 'Ember Ridge', blurb: 'Warm stone ridges that were not warm before the humming began.', unlock: { flag: 'r1' },
                 steps: [['res', 16, 5], ['find', 'emberkit'], ['res', 18, 5], ['find', 'cindersnail'], ['res', 20, 5], ['find', 'graniteling']] },
    duskgrove: { name: 'Dusk Grove', blurb: 'A stand of lantern-trees that never quite gets dark, and never quite gets light.', unlock: { struct: 'moonshrine' },
                 steps: [['res', 18, 5], ['find', 'gloomole']] },
    windbluff: { name: 'Wind Bluff', blurb: 'Cliffs that used to be a hill. The wind is very new and very interested.', unlock: { flag: 'r2' },
                 steps: [['res', 20, 6], ['find', 'zephyrow'], ['res', 22, 6], ['find', 'stormfinch'], ['res', 24, 6], ['find', 'glimmoth']] },
    driftisle: { name: 'Drift Isle', blurb: 'A small island hanging in the sky where no island should be.', unlock: { flag: 'r2' },
                 steps: [['res', 24, 6], ['find', 'driftcub']] },
  };
  D.AREA_ORDER = ['meadow', 'tidepools', 'emberridge', 'duskgrove', 'windbluff', 'driftisle'];
  D.BEFRIEND_COST = 8; // food

  /* ---------- Dungeons ---------- */
  D.DUNGEONS = {
    reliquary: {
      name: 'The Overgrown Reliquary', playable: true, el: 'nature',
      theme: 'Nature reclaiming a sanctuary vault. Mossy stairs, humming roots, and a staircase that remembers you.',
      unlock: { struct: 'reliquarygate' }, unlockText: 'Restore the Reliquary Gate.',
      recommended: 5,
      floors: [
        { name: 'Mossy Threshold', battles: [{ sp: 'mossbun', lv: 3 }, { sp: 'thornpup', lv: 3 }], first: { gold: 20, food: 6 } },
        { name: 'The Whispering Stacks', battles: [{ sp: 'pebblop', lv: 4 }, { sp: 'puffcap', lv: 5 }], first: { gold: 30, food: 8 } },
        { name: 'Heart of the Reliquary', battles: [{ sp: 'relicwarden', lv: 6, boss: true, title: 'Rootbound Sentinel', hpMult: 1.1, move: 'rootcrush' }], first: { gems: 2 } },
      ],
      rewardText: '150 gold, 40 food, 5 gems, Relicwarden (first clear), Briarstag (second clear).',
      clearReward: { gold: 150, food: 40, gems: 5 },
    },
    hollowveil: {
      name: 'The Hollow Veil', playable: true, el: 'dark',
      theme: 'A Dark-themed ruin full of forgotten history: corridors that rearrange behind you and traces nobody wrote down.',
      unlock: { rank: 6, struct: 'moonshrine' }, unlockText: 'Reach Caretaker Rank 6 and restore the Moon Shrine.',
      recommended: 12, species: ['gloomole', 'veilfox', 'whisperhusk'],
      floors: [
        { name: 'The Unwritten Hall', battles: [{ sp: 'gloomole', lv: 9 }, { sp: 'veilfox', lv: 10 }], first: { gold: 60, food: 15 } },
        { name: 'Margins of Memory', battles: [{ sp: 'whisperhusk', lv: 11 }, { sp: 'duskmantle', lv: 12 }], first: { gold: 80, food: 20 } },
        { name: 'The Hollow Warden', battles: [{ sp: 'veilfox', lv: 12 }, { sp: 'whisperhusk', lv: 13, boss: true, title: 'Keeper of Unsaid Things', hpMult: 1.2, move: 'unsaidverdict' }], first: { gems: 4 } },
      ],
      clearReward: { gold: 420, food: 100, gems: 12 },
      rewardText: '420 gold, 100 food, 12 gems on each clear, plus a Veilfox on your first clear.',
    },
    resonancescar: {
      name: 'The Resonance Scar', playable: true, el: 'resonance',
      theme: 'A wound in the island where gravity, weather and time argue. Encounters change as you walk.',
      unlock: { rank: 9, flag: 'hollowveil' }, unlockText: 'Clear the Hollow Veil and reach Caretaker Rank 9.',
      recommended: 18, species: ['resonyx', 'driftcub', 'chimerrow', 'echolyn'],
      floors: [
        { name: 'Where the Sky Is Floor', battles: [{ sp: 'resonyx', lv: 15 }, { sp: 'driftcub', lv: 16 }], first: { gold: 120, food: 30 } },
        { name: 'The Long Moment', battles: [{ sp: 'chimerrow', lv: 17 }, { sp: 'echolyn', lv: 18 }], first: { gold: 160, food: 40 } },
        { name: 'The Quiet Centre', battles: [{ sp: 'driftcub', lv: 18 }, { sp: 'echolyn', lv: 20, boss: true, title: 'The Echo at the Centre', hpMult: 1.25, move: 'resonantcollapse' }], first: { gems: 6 } },
      ],
      clearReward: { gold: 900, food: 220, gems: 25 },
      rewardText: '900 gold, 220 food, 25 gems on each clear, plus an Echolyn on your first clear.',
    },
  };
  D.DUNGEON_ORDER = ['reliquary', 'hollowveil', 'resonancescar'];
  // Status effects (durations count end-of-turn ticks; a stun is used up by the next action it blocks).
  D.STATUS = {
    burn:    { name: 'Burn',     short: 'Burn',  color: '#ff8a4a', desc: 'Loses 6% health at the end of each turn.' },
    stun:    { name: 'Stunned',  short: 'Stun',  color: '#ffd86b', desc: 'Loses its next action.' },
    soak:    { name: 'Soaked',   short: 'Soak',  color: '#52b8ff', desc: 'Speed lowered by 30%, so it may act second.' },
    regen:   { name: 'Regen',    short: 'Regen', color: '#8cffa0', desc: 'Recovers 5% health at the end of each turn.' },
    silence: { name: 'Silenced', short: 'Hush',  color: '#c9b8ff', desc: 'Only basic abilities can be chosen.' },
  };
  D.STATUS_RULES = { burn: 0.06, regen: 0.05, soak: 0.7, twilight: 0.03 };
  // Team synergies, decided by the elements of the party you bring.
  D.SYNERGIES = {
    kindred:  { name: 'Kindred', desc: 'Two or more Aminas share an element: they deal 10% more damage.', atk: 1.1 },
    twilight: { name: 'Twilight Pact', desc: 'Light and Dark together: your active Amina recovers 3% health each turn.' },
    triangle: { name: 'Elemental Triangle', desc: 'Fire, Water and Nature together: every Amina deals 8% more damage.', atk: 1.08 },
  };

  D.START = { gold: 100, food: 40, gems: 0 };
  D.SNACKS = {
    snack: { name: 'Berry Snack', food: 3, xp: 18, desc: 'A small, cheerful snack.' },
    feast: { name: 'Honey Feast', food: 10, xp: 70, desc: 'Proper dinner. Very proper.' },
  };
  D.RANK_NEED = (r) => 50 + r * 25;
})(typeof window !== 'undefined' ? window : globalThis);
