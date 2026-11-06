/* Aminas — voxel style guide, in code (Environment Phase 1). Every environment model reads its sizes and colours
   from here, so terrain, scenery and buildings stay one family. The written guide is docs/VOXEL_STYLE_GUIDE.md.

   Scale (the island's isometric grid is the reference):
   - 1 world unit = 1 island cell (64 × 32 px diamond in the 2D layer). Height: 1 unit = 39.19 px on screen.
   - Terrain voxel  = 1/2 cell  (2 × 2 per cell): chunky ground, cliffs and strata.
   - Prop voxel     = 1/8 cell  (8 × 8 per cell): buildings, trees, rocks, bridges, small scenery.
   - Detail voxel   = 1/16 cell: flowers, grass blades, pebbles (instanced).
   Light comes from the upper left (+z, above): left-facing walls are lit, right-facing walls in shade,
   matching the 2D art. Shadows are soft and short. Texture filtering is never used: every colour is a block. */
export const UNIT_PX = 45.2548;      // screen px per world unit along the iso axes at zoom 1 (32 px per half-cell)
export const HEIGHT_PX = 39.1918;    // screen px per world unit of height at zoom 1
export const TV = 0.5;               // terrain voxel
export const PV = 0.125;             // prop voxel
export const DV = 0.0625;            // detail voxel

// Each palette is a few close shades; builders pick with a hash so surfaces vary without noise.
export const PAL = {
  grass: ['#86d24a', '#7bc943', '#93db55', '#72c03f', '#a4e562'],   // Phase 1.1: brighter, slightly warmer meadow
  grassDark: ['#62b23a', '#5aa835'],
  grassSide: ['#74c041', '#69b53c', '#7cc848'],
  dirt: ['#b06c40', '#a26139', '#bb784b'],
  clay: ['#cf8a52', '#c07a47', '#d99a62'],          // the warm orange earth bands of the cliffs
  stone: ['#a8a29a', '#99938b', '#b5afa6', '#8d877f'],
  stoneDark: ['#77716b', '#7f7973'],
  deep: ['#7d7b8c', '#757385', '#868496'],           // under-island rock, cooler and bluer as it goes down
  deepLow: ['#6a6f88', '#63687f', '#727892'],
  moss: ['#68b043', '#74bc4a', '#5ea53d'],
  sand: ['#ecd9a0', '#e3cc8c', '#f2e2b0'],
  path: ['#e0c08e', '#d4b380', '#e8cc9c', '#c9a674'],
  pathStone: ['#bdb6aa', '#aea79a'],
  plaza: ['#efe3c4', '#e2d3ae'],
  water: '#4fb6e8', waterDeep: '#2f8cc8', foam: '#e8f8ff',
  bed: ['#7ba6b8', '#6b96a8'],
  wood: ['#a8774a', '#966640', '#b8875a'], woodDark: ['#6e4a2c', '#5e3f26'], plank: ['#c9965e', '#b9864f'],
  leaf: ['#45ad4c', '#52bc57', '#3c9f45', '#62c764'], leafDark: ['#358c3e', '#2f8038'],   // a bluer green than the meadow, so trees separate from grass
  pine: ['#2f8a50', '#2a7f49', '#389858'],
  blossom: ['#ffb7d0', '#ff9ec4', '#ffd0e0'],
  fruit: ['#e8453c', '#f0c040'],
  flowers: ['#ffffff', '#ffe066', '#ff8fb8', '#b48cff', '#ff7a5a'],
  rock: ['#a3a09a', '#93908a', '#b1ada6'], rockDark: ['#7d7a75'],
  roof: { red: ['#d8573a', '#c84a30', '#e06a48'], blue: ['#4a8ad8', '#3f7cc8', '#5a9ae6'], green: ['#4fa85a', '#459a50', '#5cb866'], purple: ['#8a64d0', '#7c57c0', '#9a74e0'], slate: ['#5a6478', '#505a6c', '#66708a'], gold: ['#e8b83a', '#d8a82e'] },
  plaster: ['#f2e6cc', '#e8dabc'], brick: ['#b8603e', '#a8553a', '#c46c48'],
  metal: ['#8a8f98', '#9aa0aa'], gold: ['#f2c440', '#e0ae2e', '#ffd86b'],
  glow: '#ffe6a0', glowWarm: '#ffb860', glowCool: '#9ae8ff',
  cloud: ['#ffffff', '#f2f7ff', '#e6eef8'],
};
// element colours for habitats and banners (mirrors data.js ELEMENTS)
export const EL = {
  nature: ['#5fbf5a', '#3f8a3c'], water: ['#4aa8f0', '#2a72b8'], earth: ['#c49a68', '#7a5632'], fire: ['#ff7a48', '#c4401c'],
  light: ['#ffd86b', '#c9951f'], dark: ['#9a78e6', '#4b3590'], wind: ['#8fe6d6', '#3d9c8c'], resonance: ['#ff86d6', '#a8338a'], metal: ['#b8c4d4', '#6a7888'],
};

// Phase 1.2: one family of magical lights, shared by glowing blocks, motes and 2D glows, so every enchanted place reads
// as the same magic in its own hue: egg (life-to-be), water (the Tidegate), moon (the Moonshrine), life (the
// Reliquary Gate), spirit (the standing stones and their quest). Hearth light (windows, torches) stays warm and is
// not magic.
export const MAGIC = { egg: '#a8e4ff', water: '#8fe4ff', moon: '#e2d4ff', life: '#a8ffc0', spirit: '#ffa8e6' };
