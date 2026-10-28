/* Aminas: Light & Shadow — content data (pure data, no DOM). */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = (A.Data = {});

  D.VERSION = '0.7.0-dev';
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

  /* The roster (species, lines, breeding pairs and the v0.6 conversion map) lives in roster.js. */

  /* ---------- Breeding recipes ---------- */
  // key = two elements sorted alphabetically joined by '+'. locked: needs flag r2 (Dormant Spire awake)
  D.BREED_COST = { gold: 40, food: 25 };
  D.BREED_MIN_LEVEL = 5;
  D.EGG_SECONDS = { fast: 20, normal: 300 };

  /* Structures, buildings, islands, obstacles and quests now live in world-data.js. */

  /* ---------- Exploration areas ---------- */
  // steps: sequence for explore #1, #2, ...; after the list: small generic rewards.
  D.AREAS = {
    meadow:    { name: 'Sunlit Meadow', blurb: 'Warm grass, dandelion drift, and the occasional suspicious rustle.', unlock: null,
                 steps: [['res', 10, 4], ['find', 'acinus'], ['res', 12, 4], ['find', 'gaiaroki'], ['res', 14, 5], ['find', 'terraflora'], ['res', 15, 5], ['find', 'sylvaneer']] },
    tidepools: { name: 'Tide Pools', blurb: 'Shallow, glittering pools threaded with old stonework.', unlock: { struct: 'tidegate' },
                 steps: [['res', 14, 4], ['find', 'cannonis'], ['res', 16, 5], ['find', 'kairyu'], ['res', 17, 5], ['find', 'aquaflora']] },
    emberridge:{ name: 'Ember Ridge', blurb: 'Warm stone ridges that were not warm before the humming began.', unlock: { flag: 'r1' },
                 steps: [['res', 16, 5], ['find', 'pyrokai'], ['res', 18, 5], ['find', 'pyrocell'], ['res', 20, 5], ['find', 'emberix'], ['res', 21, 5], ['find', 'igniflare']] },
    duskgrove: { name: 'Dusk Grove', blurb: 'A stand of lantern-trees that never quite gets dark, and never quite gets light.', unlock: { struct: 'moonshrine' },
                 steps: [['res', 18, 5], ['find', 'voltar'], ['res', 19, 5], ['find', 'zeep']] },
    windbluff: { name: 'Wind Bluff', blurb: 'Cliffs that used to be a hill. The wind is very new and very interested.', unlock: { flag: 'r2' },
                 steps: [['res', 20, 6], ['find', 'zephyr'], ['res', 22, 6], ['find', 'pyrospark'], ['res', 24, 6], ['find', 'lumi']] },
    driftisle: { name: 'Drift Isle', blurb: 'A small island hanging in the sky where no island should be.', unlock: { flag: 'r2' },
                 steps: [['res', 24, 6], ['find', 'aimza']] },
  };
  D.AREA_ORDER = ['meadow', 'tidepools', 'emberridge', 'duskgrove', 'windbluff', 'driftisle'];
  D.BEFRIEND_COST = 8; // food

  /* Dungeons, islands-as-campaign, ruins, survival and PvP settings live in campaign-data.js. */
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
