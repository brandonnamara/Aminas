// Phase 19A: Obsidian Reach design data (PROPOSED, design only). Nothing here is loaded by the game; the simulator
// (tools/p19a-sim.js) adds these dungeons to a sandbox copy of the rules, and the review page draws the map from them.
// Every species is an existing Amina; foes take the form their level calls for (third form from 22), as in 18C.
'use strict';

// Ten dungeons, in order. foes: nine ordinary battles (line ids); boss: guardian line, title, charged move, mechanic.
// cell: entrance on the existing Obsidian map (never a buildable 'g' cell, so no building or obstacle can be displaced).
const DUNGEONS = [
  { id: 'o_cinder', name: 'The Cinder Steps', el: 'fire', cell: [16, 25],
    theme: 'Basalt steps from the black-sand landing up into the ash, warm underfoot. Every tenth step has a lantern hook.',
    foes: ['pyrokai', 'gaiaroki', 'emberix', 'pyrocell', 'pyrokai', 'gaiaroki', 'emberix', 'pyrokai', 'pyrocell'],
    boss: { line: 'pyrokai', title: 'The Cinder Warden', move: 'ashfall', hpMult: 1.6 },
    tactic: 'Burn: bring a heal that cleanses; Water and Earth answer Fire.', mech: 'Ash on the wind: the first foe of each section starts burning you (flavour, optional).',
    story: 'Arrival. Stairs cut for two sizes of feet again, but here the small steps are scorched and the large ones are not.' },
  { id: 'o_kilns', name: 'The Glasswick Kilns', el: 'fire', cell: [16, 21],
    theme: 'Two rows of glass kilns, one fired pale, one fired dark. Half-finished panes still stand in the racks.',
    foes: ['emberix', 'lumi', 'igniflare', 'emberix', 'voltar', 'igniflare', 'lumi', 'emberix', 'igniflare'],
    boss: { line: 'emberix', title: 'The Glassblower', move: 'moltenglaze', hpMult: 1.62 },
    tactic: 'Molten Glaze lowers attack: weaken it back, or bring a heal to clear it.', mech: 'Two kilns: pale and dark foes alternate within each section.',
    story: 'Development 1: the Twin Shrine panels were made here. The shard from the Elder Root fits a rack labelled in two hands.', scene: 'o_kilns' },
  { id: 'o_rookery', name: 'The Basalt Rookery', el: 'fire', cell: [8, 9],
    theme: 'Basalt columns on the west ridge, honeycombed with nests. Something large keeps them warm.',
    foes: ['pyrospark', 'zephyr', 'voltar', 'pyrospark', 'zephyr', 'umbrit', 'pyrospark', 'zephyr', 'voltar'],
    boss: { line: 'pyrospark', title: 'The Rookery Matriarch', move: 'cinderdive', hpMult: 1.62 },
    tactic: 'Swift foes: Water and Earth; guard the dive.', mech: 'Swift foes (the 17B swift edge) on battles 7–9.',
    story: 'Nests woven from glass threads, pale and dark together. Nobody told the birds.' },
  { id: 'o_quench', name: 'The Quench Pools', el: 'water', cell: [12, 13],
    theme: 'Steaming pools where hot glass was cooled. The water hisses whenever anything warm comes near.',
    foes: ['cannonis', 'kairyu', 'aquaflora', 'pyrocell', 'cannonis', 'kairyu', 'aquaflora', 'cannonis', 'pyrocell'],
    boss: { line: 'cannonis', title: 'The Quenchwarden', move: 'coldquench', hpMult: 1.65 },
    tactic: 'Cold Quench chills (slows): guard it; Nature and Earth answer Water.', mech: 'Steam: soaked foes in the second section.',
    story: 'A pool drained long ago. On its floor, the outline of one great round plate, cracked across. It cooled wrong.' },
  { id: 'o_seams', name: 'The Deep Seams', el: 'dark', cell: [21, 16],
    theme: 'Mine galleries under the central ridge. The lamps were all taken; something here eats light.',
    foes: ['voltar', 'zeep', 'pyrocell', 'voltar', 'umbrit', 'zeep', 'voltar', 'pyrocell', 'zeep'],
    boss: { line: 'voltar', title: 'The Lamp-Eater', move: 'blackout', hpMult: 1.65 },
    tactic: 'Blackout silences: keep a basic attack worth using; Light answers Dark.', mech: 'Dark galleries: the guardian\'s element is hidden until it acts (flavour).',
    story: 'Ore carts sorted into two lines, pale ore and dark ore, by someone very tidy.' },
  { id: 'o_gallery', name: 'The Mirror Gallery', el: 'dark', cell: [17, 14],
    theme: 'The finishing hall, on the central path: every pane that passed inspection hung here to be judged. Most are cracked.',
    foes: ['umbrit', 'lumifern', 'lumi', 'voltar', 'umbrit', 'lumifern', 'voltar', 'lumi', 'lumifern'],
    boss: { line: 'umbrit', title: 'The Dusk Warden', move: 'nightglass', hpMult: 1.7, mech: { type: 'prism', every: 2, els: ['dark', 'light'] } },
    tactic: 'Alternating element: a Light- and a Dark-hitter, or Resonance; Night Glass is never resisted, guard it.', mech: 'Prism Shift dark ↔ light (existing); battle 9: a Lumifern III herald.',
    story: 'Mid-island revelation: the mould for the smashed panel. Two Keepers holding one door shut, from the same side. And a third outline, chiselled away.', scene: 'o_gallery' },
  { id: 'o_hollows', name: 'The Magenta Hollows', el: 'resonance', cell: [17, 5],
    theme: 'Crystal caves under the north cliffs, at the top of the central path. The magenta crystals keep every sound that was ever made near them.',
    foes: ['aimza', 'lumi', 'zeep', 'aimza', 'voltar', 'lumi', 'aimza', 'zeep', 'lumi'],
    boss: { line: 'lumi', title: 'The Lantern Below', move: 'shatterlight', hpMult: 1.65 },
    tactic: 'Resonance is never resisted: tactics over types; Dark answers the Lantern.', mech: 'Echoes: a foe\'s last move repeats a turn later at half power (optional).',
    story: 'Development 2: the crystals replay one night. A great sound, a crack, two voices calling each other, then a long hum that is neither.', scene: 'o_hollows' },
  { id: 'o_orchard', name: 'The Charred Orchard', el: 'nature', cell: [5, 17],
    theme: 'A burned orchard on the west plain, still fruiting. Ash-grey leaves, magenta blossom.',
    foes: ['terraflora', 'acinus', 'sylvaneer', 'terraflora', 'pyrokai', 'acinus', 'terraflora', 'sylvaneer', 'pyrokai'],
    boss: { line: 'terraflora', title: 'The Ashbloom', move: 'ashbloom', hpMult: 1.65 },
    tactic: 'Ashbloom lowers attack; Fire and Wind answer Nature.', mech: 'Regrowth: Nature foes start with regen in the last section (optional).',
    story: 'Someone planted this after the fire. The rows are uneven, as if two people planted from opposite ends.' },
  { id: 'o_bellows', name: 'The Great Bellows', el: 'wind', cell: [25, 21],
    theme: 'The east ridge: leather lungs the size of houses that fed the forge. Some still breathe.',
    foes: ['zephyr', 'pyrospark', 'igniflare', 'zephyr', 'pyrokai', 'pyrospark', 'zephyr', 'igniflare', 'zeep'],
    boss: { line: 'zephyr', title: 'The Bellows Wind', move: 'furnacedraught', hpMult: 1.65 },
    tactic: 'Furnace Draught burns: cleanse; Fire and Earth answer Wind.', mech: 'Draught: every third turn a gust swaps nothing but scatters status (flavour).',
    story: 'Development 3: the forge ledger. "Commission: one door, two keys. Paid in full." A later line, another hand: "Third key: refused."', scene: 'o_ledger' },
  { id: 'o_forge', name: 'The Heart of the Forge', el: 'earth', cell: [23, 9], island: true,
    theme: 'The Great Forge on the north-east headland: cold everywhere except its core, which has never gone out.',
    foes: ['pyrocell', 'zeep', 'pyrokai', 'pyrocell', 'emberix', 'zeep', 'pyrocell', 'pyrokai', 'aimza'],
    boss: { line: 'pyrocell', title: 'The Forge Heart', move: 'heartofforge', hpMult: 1.75, mech: { type: 'barrier', at: [0.66, 0.33], amt: 0.18 }, islandBoss: true },
    tactic: 'Barrier at two thresholds (specials crack it twice as fast); guard the charge; Water answers it.', mech: 'Stone Barrier (existing) and a charged move.',
    story: 'Confrontation. The core is keeping the forge warm for a job that was never finished. Opens the way to the Celestial Crown.', scene: 'o_confront' },
];

// Proposed charged moves (data only; effects use existing statuses: burn, stun, soak, silence; weaken = attack down).
const MOVES = {
  ashfall: { name: 'Ashfall', el: 'fire', type: 'dmg', power: 76, cd: 0, boss: true, tell: 'The sky goes grey and starts to fall. Ashfall is coming!', desc: 'Hot ash settles on everything. Burns the target.', fx: { k: 'burn', p: 1, n: 2 } },
  moltenglaze: { name: 'Molten Glaze', el: 'fire', type: 'weaken', power: 72, cd: 0, boss: true, tell: 'The Glassblower draws a long, glowing breath. Molten Glaze is coming!', desc: 'A coat of hot glass that lowers your attack. A heal clears it.' },
  cinderdive: { name: 'Cinder Dive', el: 'fire', type: 'dmg', power: 80, cd: 0, boss: true, tell: 'The Matriarch folds her wings and drops. Cinder Dive is coming!', desc: 'A burning dive from the top of the columns.' },
  coldquench: { name: 'Cold Quench', el: 'water', type: 'dmg', power: 70, cd: 0, boss: true, tell: 'Every pool goes still and starts to hiss. Cold Quench is coming!', desc: 'Plunges you into the quench. Chilled: speed lowered, so you may act second.', fx: { k: 'soak', p: 1, n: 2 } }, // a stun variant was tested and rejected (sim: threshold rec+2, boss won 11 of 40 at rec)
  blackout: { name: 'Blackout', el: 'dark', type: 'dmg', power: 72, cd: 0, boss: true, tell: 'The last lamp in the gallery goes out. Blackout is coming!', desc: 'Total dark: no special abilities on your next turn.', fx: { k: 'silence', p: 1, n: 2 } },
  nightglass: { name: 'Night Glass', el: 'dark', type: 'dmg', power: 84, cd: 0, boss: true, neutral: true, tell: 'Every mirror in the gallery turns to face you. Night Glass is coming!', desc: 'Your own reflection strikes back. Never resisted, but a guard blocks most of it.' },
  shatterlight: { name: 'Shatterlight', el: 'light', type: 'dmg', power: 78, cd: 0, boss: true, tell: 'The crystals ring, higher and higher. Shatterlight is coming!', desc: 'A note that breaks into light.' },
  ashbloom: { name: 'Ashbloom', el: 'nature', type: 'weaken', power: 74, cd: 0, boss: true, tell: 'Grey blossom drifts down like snow. Ashbloom is coming!', desc: 'Ash-pollen that lowers your attack. A heal clears it.' },
  furnacedraught: { name: 'Furnace Draught', el: 'wind', type: 'dmg', power: 78, cd: 0, boss: true, tell: 'The bellows fill until the leather creaks. Furnace Draught is coming!', desc: 'A blast of forge air. Burns the target.', fx: { k: 'burn', p: 1, n: 2 } },
  heartofforge: { name: 'Heart of the Forge', el: 'earth', type: 'dmg', power: 92, cd: 0, boss: true, tell: 'The core flares white. Heart of the Forge is coming!', desc: 'The whole forge, at once. Guard it.' },
};

// Level bands: recommended level per dungeon for each cap scenario. Foes: rec-3 … rec, guardian rec+3 (Verdant pattern).
const BANDS = {
  cap50: { cap: 50, label: 'Level cap 50', rec: [38, 39, 40, 41, 42, 43, 44, 45, 46, 47] },
  cap60: { cap: 60, label: 'Level cap 60', rec: [38, 40, 41, 43, 44, 45, 47, 48, 49, 51] },
  cap40m: { cap: 40, label: 'Cap stays 40 + Mastery ranks', rec: [37, 37, 38, 38, 39, 39, 40, 40, 40, 40], mastery: true },
};
// A third island's foe tier (sandbox only): Verdant is ×1.2 HP / ×1.12 attack.
const TIER = { cap50: { hp: 1.3, atk: 1.18 }, cap60: { hp: 1.3, atk: 1.18 }, cap40m: { hp: 1.55, atk: 1.32 } };
// Option 3 (proposed): Mastery. Past the cap, XP fills Mastery ranks instead of being dropped: each rank costs the XP of
// one level at the cap and gives +2% to every stat (about what one level gives at 40: +2.1%). Ten ranks per island tier.
const MASTERY = { perRank: 0.02, ranks: 10 };

// Island layout (cells on the existing 32×32 Obsidian map; all on sand, path, ridge or the landmark slot).
const PLACES = [
  { id: 'landing', name: 'Black Sand Landing', cell: [16, 28], kind: 'arrival' },
  { id: 'glasswick', name: 'Glasswick (hub)', cell: [13, 17], kind: 'hub', note: 'The kilnworkers\' square at the path crossing; the Entity\'s spot' },
  { id: 'forge', name: 'The Great Forge', cell: [22, 7], kind: 'landmark', note: 'Existing 3×3 landmark slot (22–24, 7–9); Island Boss' },
];
const EXPLORE = [
  { id: 'ashplain', name: 'Ash Plain', after: 'o_cinder', finds: ['pyrokai', 'gaiaroki', 'pyrocell'], rare: 'infernokai' },
  { id: 'glassbeach', name: 'Glass Beach', after: 'o_quench', finds: ['cannonis', 'kairyu', 'zeep'], rare: 'zeep3' },
  { id: 'crystalvein', name: 'Crystal Vein', after: 'o_hollows', finds: ['aimza', 'lumi', 'voltar'], rare: 'aimza3' },
];

module.exports = { DUNGEONS, MOVES, BANDS, TIER, MASTERY, PLACES, EXPLORE };
