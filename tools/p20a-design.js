// Phase 20A: the PROPOSED Celestial Crown campaign as data, for the design simulator only (tools/p20a-sim.js).
// Nothing here is loaded by the game. Existing species only (no legendary lines); charged moves use existing effects
// only (burn, soak, silence, weaken, never-resisted, plain damage); mechanics reuse the four that exist after 19D
// (barrier, prism, echo, steam field). Recommended levels are given per band; the simulator picks the band.
'use strict';
// [line, form chosen by level] for battles 1–9 (third forms at these levels), guardian on battle 10
const DUNGEONS = [
  { id: 'cloudstair', name: 'Cloudstair Landing', el: 'wind', theme: 'Steps cut into the cloud-cliff from the landing jetty; wind, gulls, the first light-bridges',
    foes: ['zephyr', 'lumi', 'zephyr', 'pyrospark', 'lumi', 'zephyr', 'igniflare', 'pyrospark', 'zephyr'],
    boss: { line: 'zephyr', title: 'The Stair Warden', move: 'updraft', hpMult: 1.65 } },
  { id: 'starfall', name: 'Starfall Terrace', el: 'light', theme: 'Terraced gardens where star shards fell and took root; moonbloom beds, shard-light',
    foes: ['lumi', 'terraflora', 'lumifern', 'lumi', 'acinus', 'lumifern', 'terraflora', 'lumi', 'lumifern'],
    boss: { line: 'lumifern', title: 'The Shard Gardener', move: 'starfall', hpMult: 1.65 }, tune: { hp: 0.92, atk: 0.92, guardian: { hp: 0.9, atk: 0.88 } } },
  { id: 'orrery', name: 'The Orrery Wheel', el: 'metal', theme: 'A great brass orrery under a glass roof, four bodies on four arms, one arm bent',
    foes: ['zeep', 'pyrocell', 'zeep', 'gaiaroki', 'zeep', 'pyrocell', 'zeep', 'gaiaroki', 'zeep'],
    boss: { line: 'zeep', title: 'The Orrery Keeper', move: 'orreryturn', hpMult: 1.65, mech: { type: 'prism', every: 3, els: ['metal', 'earth'] } } },
  { id: 'cloudsea', name: 'The Cloud Sea Cistern', el: 'water', theme: 'Cisterns that catch the clouds; mist rolls in waves across the pools',
    foes: ['aquaflora', 'kairyu', 'cannonis', 'zephyr', 'aquaflora', 'kairyu', 'cannonis', 'aquaflora', 'kairyu'], field: { type: 'steam', every: 3, n: 1 },
    boss: { line: 'kairyu', title: 'The Mist Serpent', move: 'cloudburst', hpMult: 1.6 }, tune: { hp: 0.9, atk: 0.92, guardian: { hp: 0.92, atk: 0.88 } } },
  { id: 'lensgallery', name: 'The Lens Gallery', el: 'light', theme: 'A corridor of great lenses; light is focused, split and bounced back',
    foes: ['lumi', 'zeep', 'lumi', 'pyrospark', 'zeep', 'lumi', 'lumifern', 'zeep', 'lumi'],
    boss: { line: 'lumi', title: 'The Focal Lantern', move: 'focalray', hpMult: 1.6, mech: { type: 'echo', move: 'refraction' } } },
  { id: 'twinhall', name: 'The Hall of Two Doors', el: 'dark', theme: 'The Keepers’ quarters: two rooms, one bright, one dark, and a shared table between them',
    foes: ['lumifern', 'umbrit', 'lumi', 'voltar', 'lumifern', 'umbrit', 'lumi', 'voltar', 'umbrit'],
    boss: { line: 'umbrit', title: 'The Dusk Steward', move: 'twindusk', hpMult: 1.65, mech: { type: 'prism', every: 2, els: ['dark', 'light'] } } },
  { id: 'hours', name: 'The Chart Room', el: 'metal', theme: 'Star charts and ledgers of hours; every visitor in the sky’s long history, written down',
    foes: ['zeep', 'aimza', 'voltar', 'zeep', 'aimza', 'lumi', 'zeep', 'aimza', 'voltar'],
    boss: { line: 'zeep', title: 'The Hour Clerk', move: 'hourseal', hpMult: 1.65, mech: { type: 'barrier', at: [0.5], amt: 0.2 } } },
  { id: 'bellloft', name: 'The Bell Loft', el: 'resonance', theme: 'The great bell, cracked, hanging over the dome; it still hums when nobody strikes it',
    foes: ['aimza', 'zephyr', 'aimza', 'lumi', 'voltar', 'aimza', 'zephyr', 'aimza', 'voltar'],
    boss: { line: 'aimza', title: 'The Cracked Bell', move: 'belltoll', hpMult: 1.6, mech: { type: 'echo', move: 'afterring' } } },
  { id: 'umbra', name: 'The Shadowed Dome', el: 'dark', theme: 'The observatory’s night side: a dome with its stars scraped off, one outline left',
    foes: ['voltar', 'umbrit', 'aimza', 'voltar', 'umbrit', 'pyrospark', 'voltar', 'umbrit', 'aimza'],
    boss: { line: 'voltar', title: 'The Night Curator', move: 'umbralhush', hpMult: 1.65 } },
  { id: 'threshold', name: 'The Threshold', el: 'resonance', theme: 'Beneath the observatory: the door from the mould and the shrine, cracked, still standing',
    foes: ['aimza', 'lumifern', 'umbrit', 'aimza', 'voltar', 'lumi', 'aimza', 'lumifern', 'umbrit'],
    boss: { line: 'aimza', title: 'The Unanswered Door', move: 'closingdoor', hpMult: 2.0, islandBoss: true, mech: { type: 'barrier', at: [0.66, 0.33], amt: 0.2 } } },
];
// charged moves (existing effects only)
const MOVES = {
  updraft:     { name: 'Updraft', el: 'wind', type: 'weaken', power: 74, cd: 0, boss: true, tell: 'The wind gathers under its wings. Updraft is coming!' },
  starfall:    { name: 'Starfall', el: 'light', type: 'dmg', power: 80, cd: 0, boss: true, fx: { k: 'burn', p: 1, n: 2 }, tell: 'Shards brighten overhead. Starfall is coming!' },
  orreryturn:  { name: 'Orrery Turn', el: 'metal', type: 'dmg', power: 84, cd: 0, boss: true, tell: 'The great wheel lines up. Orrery Turn is coming!' },
  cloudburst:  { name: 'Cloudburst', el: 'water', type: 'dmg', power: 78, cd: 0, boss: true, fx: { k: 'soak', p: 1, n: 2 }, tell: 'The mist thickens to rain. Cloudburst is coming!' },
  focalray:    { name: 'Focal Ray', el: 'light', type: 'dmg', power: 82, cd: 0, boss: true, tell: 'Every lens turns to the same point. Focal Ray is coming!' },
  refraction:  { name: 'Refraction', el: 'light', type: 'dmg', power: 74, cd: 0, boss: true, tell: 'Focal Ray hit unguarded, and the lenses bend it back. Refraction is coming!' },
  twindusk:    { name: 'Twin Dusk', el: 'dark', type: 'dmg', power: 82, cd: 0, boss: true, tell: 'Both rooms go dark at once. Twin Dusk is coming!' },
  hourseal:    { name: 'Hour Seal', el: 'metal', type: 'dmg', power: 74, cd: 0, boss: true, fx: { k: 'silence', p: 1, n: 2 }, tell: 'The clerk stamps the hour shut. Hour Seal is coming!' },
  belltoll:    { name: 'Bell Toll', el: 'resonance', type: 'dmg', power: 80, cd: 0, boss: true, neutral: true, tell: 'The bell draws a breath. Bell Toll is coming!' },
  afterring:   { name: 'After-ring', el: 'resonance', type: 'dmg', power: 72, cd: 0, boss: true, neutral: true, tell: 'Bell Toll hit unguarded, and the crack rings on. After-ring is coming!' },
  umbralhush:  { name: 'Umbral Hush', el: 'dark', type: 'weaken', power: 78, cd: 0, boss: true, tell: 'The last stars go out. Umbral Hush is coming!' },
  closingdoor: { name: 'The Closing Door', el: 'resonance', type: 'dmg', power: 90, cd: 0, boss: true, neutral: true, tell: 'The door begins to swing. The Closing Door is coming!' },
};
// candidate recommended-level bands (index 0 = Dungeon 1) and foe tiers
const BANDS = {
  b48: { rec: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57], label: 'Rec 48–57 (guardians 51–60)' },
  b49: { rec: [49, 50, 51, 52, 53, 54, 55, 56, 57, 58], label: 'Rec 49–58 (guardians 52–61)' },
  b50: { rec: [50, 51, 52, 53, 54, 55, 56, 57, 58, 60], label: 'Rec 50–60 (guardians 53–63)' },
};
// first-clear and repeat rewards: Obsidian's (19C) plus about 15%, gems only on first clears
const REWARDS = { gold: [2550, 2750, 3000, 3200, 3450, 3900, 4250, 4600, 5050, 8000], food: [480, 500, 530, 550, 580, 620, 660, 690, 750, 1150], gems: [12, 12, 12, 14, 14, 16, 16, 16, 18, 50],
  repeat: [580, 600, 620, 640, 670, 690, 710, 740, 760, 860], repeatFood: [110, 110, 115, 115, 120, 125, 125, 130, 135, 150] };
const TIERS = { t140: { hp: 1.4, atk: 1.24 }, t130: { hp: 1.3, atk: 1.18 }, t150: { hp: 1.5, atk: 1.28 } };
module.exports = { DUNGEONS, MOVES, BANDS, TIERS, REWARDS };
