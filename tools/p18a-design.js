// Phase 18A: the proposed Verdant Wilds campaign as data, for the simulator and the review page ONLY.
// Nothing here is loaded by the game (index.html does not list it). Every species is an existing, approved Amina; the
// charged moves marked `proposed` are new ability entries that would need approval in Phase 18B.
// Battle levels follow Starter Island's pattern: rec-3, rec-3, rec-2 | rec-2, rec-1, rec-1 | rec, rec, rec (elites,
// battle 9 rehearses the boss) | boss at rec+3. Foes take the form their level calls for (II from 12, III from 22).
const MOVES = {
  floodgate:     { proposed: true, name: 'Floodgate', el: 'water', type: 'dmg', power: 84, cd: 0, boss: true, fx: { k: 'soak', p: 1, n: 2 }, tell: 'The aqueduct groans as every sluice opens at once. Floodgate is coming!', desc: 'A wall of released water that soaks the target.' },
  sporebloom:    { proposed: true, name: 'Spore Bloom', el: 'nature', type: 'weaken', power: 72, cd: 0, boss: true, tell: 'The hollow fills with drifting gold dust. Spore Bloom is coming!', desc: 'A cloud of spores that lowers your attack.' },
  archiveseal:   { proposed: true, name: 'Archive Seal', el: 'metal', type: 'dmg', power: 72, cd: 0, boss: true, fx: { k: 'silence', p: 1, n: 2 }, tell: 'Every shelf in the Archive slides shut. Archive Seal is coming!', desc: 'A filing-shut that silences: no special abilities next turn.' },
  embercanopy:   { proposed: true, name: 'Ember Canopy', el: 'fire', type: 'dmg', power: 86, cd: 0, boss: true, fx: { k: 'burn', p: 1, n: 3 }, tell: 'The terraces glow orange from below. Ember Canopy is coming!', desc: 'Burning glowworm-light that rains down and burns.' },
  twineclipse:   { proposed: true, name: 'Twin Eclipse', el: 'light', type: 'dmg', power: 88, cd: 0, boss: true, neutral: true, tell: 'Light and shadow fold together over the shrine. Twin Eclipse is coming!', desc: 'Light and shadow at once. Never resisted, but a guard blocks most of it.' },
  tidalhymn:     { proposed: true, name: 'Tidal Hymn', el: 'water', type: 'dmg', power: 88, cd: 0, boss: true, tell: 'The Moonwell rises without a ripple. Tidal Hymn is coming!', desc: 'A slow, enormous wave that sings as it breaks.' },
  crownofthorns: { proposed: true, name: 'Crown of Thorns', el: 'nature', type: 'dmg', power: 96, cd: 0, boss: true, tell: 'Every root on the island lifts at once. Crown of Thorns is coming!', desc: 'The Elder Root closes around the field.' },
};
// rec levels per candidate band (A = the brief's 22-30; B = fits the current level cap of 30; C = needs the cap raised)
const BANDS = {
  A: { label: 'A · 22–30 (brief target, current cap 30)', cap: 30, rec: [22, 23, 24, 25, 26, 27, 28, 29, 29, 30] },
  B: { label: 'B · 21–28 (fits under the cap)', cap: 30, rec: [21, 22, 23, 24, 25, 25, 26, 27, 27, 28] },
  C: { label: 'C · 22–36 (cap raised to 40)', cap: 40, rec: [22, 24, 25, 27, 28, 30, 31, 33, 34, 36] },
};
const DUNGEONS = [
  { id: 'v_mossgate', name: 'The Mossgate Steps', el: 'earth', where: 'Arrival cove to the first terrace', theme: 'Overgrown stone stairs from the landing; roots have lifted every step.',
    foes: ['gaiaroki', 'terraflora', 'acinus', 'gaiaroki', 'pyrocell', 'terraflora', 'gaiaroki', 'pyrocell', 'terraflora'], boss: { sp: 'gaiaroki', title: 'The Moss Bastion', move: 'rootcrush', hpMult: 1.6 },
    mechanic: 'Root-lifted steps: battles 4–6 start with the foe guarding (a free first block).', prep: 'Nature, Water and Metal beat Earth (Fire for the Nature foes); a guard or soak answers Root Crush.',
    story: 'Arrival. The stairs were cut for people and Aminas side by side.', challenge: 'Break the Bastion’s guard with a special before Root Crush.' },
  { id: 'v_aqueduct', name: 'The Drowned Aqueduct', el: 'water', where: 'Eastern stream channels', theme: 'A stone aqueduct carrying three singing streams; half its arches are under water.',
    foes: ['kairyu', 'cannonis', 'aquaflora', 'sylvaneer', 'kairyu', 'cannonis', 'kairyu', 'aquaflora', 'cannonis'], boss: { sp: 'kairyu', title: 'The Sluice Warden', move: 'floodgate', hpMult: 1.65 },
    mechanic: 'Rising water: each section end, the next foe is soaked for its first turn (it may act second).', prep: 'Nature beats Water; Floodgate soaks, so bring a heal that cleanses.',
    story: 'The streams carry voices. One repeats two names that the water has worn away.', challenge: 'Guard Floodgate, or soak the Warden so it sputters.' },
  { id: 'v_spore', name: 'Spore Hollow', el: 'nature', where: 'A sunken glade under the western canopy', theme: 'Giant glowcaps and drifting gold spores; bioluminescent after dusk.',
    foes: ['acinus', 'sylvaneer', 'terraflora', 'acinus', 'voltar', 'terraflora', 'acinus', 'sylvaneer', 'terraflora'], boss: { sp: 'acinus', title: 'The Spore Mother', move: 'sporebloom', hpMult: 1.65 },
    mechanic: 'Spore drifts: long fights matter; healing that cleanses is worth more here.', prep: 'Fire and Wind; Spore Bloom lowers attack, a heal clears one stack.',
    story: 'Spores carry memories (a Kind Soul here remembers the Light one as the one who left).', challenge: 'Win with no attack-lowered Amina at the end (cleanse it).' },
  { id: 'v_archive', name: 'The Ivy Archive', el: 'metal', where: 'A library-hall wrapped in ivy on the central hill', theme: 'Shelves of stone tablets; a mechanical archivist still files them.',
    foes: ['zeep', 'voltar', 'umbrit', 'zeep', 'voltar', 'zeep', 'umbrit', 'zeep', 'voltar'], boss: { sp: 'zeep', title: 'The Archivist', move: 'archiveseal', hpMult: 1.7 },
    mechanic: 'Indexed foes: the Archive shows each battle’s element in advance (preparation reward).', prep: 'Fire and Water beat Metal; Light beats Dark. Archive Seal silences: keep a basic attacker ready.',
    story: 'MAJOR DEVELOPMENT 1: records call the two starters “the Keepers”, protectors of the crossing.', challenge: 'Answer Archive Seal with a guard.' },
  { id: 'v_glow', name: 'The Glowworm Terraces', el: 'fire', where: 'South-facing terraced gardens', theme: 'Lantern-moss terraces lit by glowworm fire; warm and orange at night.',
    foes: ['igniflare', 'pyrokai', 'emberix', 'pyrospark', 'igniflare', 'emberix', 'pyrokai', 'igniflare', 'pyrospark'], boss: { sp: 'igniflare', title: 'The Lantern Wyrm', move: 'embercanopy', hpMult: 1.7 },
    mechanic: 'Burning terraces: burn is common; cleansing heals and Water carry the dungeon.', prep: 'Water beats Fire (Fire also resists Nature); Ember Canopy burns, so a cleansing heal helps.',
    story: 'The terraces were tended by both species together; half the lanterns are dark-glass.', challenge: 'Flawless here is hard: burn punishes long fights.' },
  { id: 'v_twinshrine', name: 'The Twin Shrine', el: 'light', where: 'The island’s centre, a shrine split by a stream', theme: 'Two halves of one temple: white stone and dark glass, joined by a broken bridge.',
    foes: ['lumifern', 'umbrit', 'lumi', 'voltar', 'lumifern', 'umbrit', 'lumi', 'umbrit', 'umbrit'], boss: { sp: 'lumifern', title: 'The Dawn Warden', move: 'twineclipse', hpMult: 1.8, mech: { type: 'prism', every: 2, els: ['light', 'dark'] } },
    mechanic: 'Light and Dark alternate (Prism Shift between two elements); battle 9 is an Eclipsar herald.', prep: 'Bring both a Light-hitter and a Dark-hitter, or Resonance (never resisted).',
    story: 'MID-ISLAND REVELATION: the shrine shows the two starters protecting the crossing together; the second panel is smashed.', challenge: 'Win while the Warden is Dark.' },
  { id: 'v_canopy', name: 'The Canopy Walk', el: 'wind', where: 'Rope bridges between the tallest trees (north)', theme: 'Bridges and platforms high in the canopy; wind and falling leaves.',
    foes: ['zephyr', 'pyrospark', 'zephyr', 'lumi', 'zephyr', 'pyrospark', 'zephyr', 'pyrospark', 'zephyr'], boss: { sp: 'zephyr', title: 'The Canopy Squall', move: 'galeforce', hpMult: 1.8 },
    mechanic: 'Swift foes: Wind and swift Aminas act first; the 17B swift edge matters.', prep: 'Fire and Earth beat Wind; Nature suffers here. Bring swift Aminas of your own.',
    story: 'MAJOR DEVELOPMENT 2: from the canopy the player sees the Dormant Spire glowing across the sea, in rhythm with the Choir.', challenge: 'One element: three Wind or three Metal.' },
  { id: 'v_moonwell', name: 'The Moonwell', el: 'water', where: 'A flooded grotto under the western lake', theme: 'A still, moonlit pool in a cave of roots; reflections show the wrong sky.',
    foes: ['aquaflora', 'voltar', 'kairyu', 'umbrit', 'aquaflora', 'voltar', 'aquaflora', 'umbrit', 'aquaflora'], boss: { sp: 'aquaflora', title: 'The Moonwell Serpent', move: 'tidalhymn', hpMult: 1.85 },
    mechanic: 'Reflections: Dark foes mirror Water foes; type coverage beats raw level.', prep: 'Nature for the Water half, Light for the Dark half.',
    story: 'The Entity refuses to enter; the reflection shows him beside a world that is not this one.', challenge: 'Guard Tidal Hymn twice in one fight.' },
  { id: 'v_choir', name: 'The Choir of Roots', el: 'resonance', where: 'A ring of standing stones in the north-east', theme: 'Standing stones like the Sanctuary’s pale stone, humming in chords; roots grow towards them.',
    foes: ['aimza', 'sylvaneer', 'aimza', 'terraflora', 'aimza', 'zeep', 'aimza', 'sylvaneer', 'aimza'], boss: { sp: 'aimza', title: 'The Third Voice', move: 'resonantcollapse', hpMult: 1.9 },
    mechanic: 'Resonance never resists and is never resisted: tactics and level, not types.', prep: 'Guards and heals; the 17C guard recoil shines here.',
    story: 'MAJOR DEVELOPMENT 3: a third voice in the chord. It is not Light, not Shadow. The Entity says “Don’t answer it.”', challenge: 'Answer the guardian with guard recoil finishing it.' },
  { id: 'v_elderroot', name: 'The Elder Root', el: 'nature', where: 'The giant tree at the island’s heart (Island Boss)', theme: 'Inside the roots of the oldest tree; every stream ends here.',
    foes: ['sylvaneer', 'terraflora', 'acinus', 'aimza', 'sylvaneer', 'acinus', 'terraflora', 'sylvaneer', 'terraflora'], boss: { sp: 'sylvaneer', title: 'The Forest Crown', move: 'crownofthorns', hpMult: 2.25, islandBoss: true, mech: { type: 'barrier', at: [0.66, 0.33], amt: 0.18 } },
    mechanic: 'Barrier and charge: break the Crown’s barrier with specials, guard Crown of Thorns.', prep: 'Fire and Wind; specials for the barrier; a guard for the charge.',
    story: 'FINAL CONFRONTATION: the stag from the Heartwood, grown into the Forest Crown, guards the door to the next island.', challenge: 'Break both barriers and guard the charge in one fight.' },
];
module.exports = { MOVES, BANDS, DUNGEONS };
