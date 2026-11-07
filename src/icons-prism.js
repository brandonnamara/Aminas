/* Aminas — Prismatic icon collection (Phase 6).
   One family of small voxel-crystal sprites for every "thing" in the game: navigation, creatures, elements, buildings,
   the hatchery, the forge, dungeons, battle, quests, rewards and settings. Control glyphs (close, check, plus, minus,
   back, arrow, up, rotate, move, info, swap) stay as the clean line icons from art.js: they are already clear and
   universal. The Dev 8 currency and essence sprites (gold, food, gem, ess_*) are kept as they are.

   How an icon is made: a 14×14 silhouette is written as text, one letter per material ('.' = empty). The builder adds
   a 1-pixel ink outline (16×16 in all) and lights every icon the same way: light from the top left, so top and left
   edges catch a highlight and bottom and right edges fall into shade. 'w' marks a hand-placed crystal glint and 'k'
   an ink detail. Output is crisp SVG (one <rect> per run, shape-rendering crispEdges), cached per name.

   Colour is used for meaning: element icons use the element's own colour, rare things use the spectrum, and
   everyday things use their natural material (steel, wood, parchment, stone). */
(function (root) {
  'use strict';
  const A = root.A, Art = A && A.Art; if (!Art) return;
  const PZI = (A.Icons = {});

  // material ramps: [highlight, base, shade]
  const M = {
    gold: ['#fff1a8', '#ffc93c', '#c97a12'], steel: ['#f4f6ff', '#bcc5e0', '#6f7aa0'], wood: ['#eab47c', '#b0743e', '#6e4320'],
    parch: ['#fff6dc', '#f0d39a', '#b8925a'], violet: ['#e8d8ff', '#a582ff', '#5c3ec4'], cyan: ['#e8fdff', '#8ff0ff', '#3aa8d0'],
    pink: ['#ffe2f4', '#ff9ee0', '#c8509e'], red: ['#ffc6b6', '#ff6a50', '#b02a2a'], green: ['#dcffc6', '#6fd36f', '#2f8a3c'],
    blue: ['#d8eeff', '#52b8ff', '#1f72b8'], stone: ['#ece4d8', '#b8a890', '#7a6a58'], white: ['#ffffff', '#ece8ff', '#aaa2d4'],
    orange: ['#ffe2a6', '#ff9a3c', '#c4561c'], earth: ['#f2d4ae', '#c49a68', '#7a5632'], teal: ['#e2fff8', '#8fe6d6', '#3d9c8c'],
    rose: ['#ffe2f6', '#ff86d6', '#a8338a'], dusk: ['#ddd0ff', '#9a78e6', '#4b3590'], metal: ['#eef6ff', '#9fc3e8', '#4f6f96'],
    leaf: ['#c8f5a0', '#5ab84a', '#2a6a24'], ember: ['#fff0a0', '#ffb43a', '#e0542e'], ink: ['#5a4a8a', '#3a2c66', '#241848'],
    egg: ['#fffaf0', '#f6e8d0', '#c8b490'], shell: ['#ffffff', '#dff4ff', '#9ac4e8'],
  };
  const OUT = '#1c1238';                // the shared ink outline
  const GLINT = '#ffffff', INK = '#1c1238';

  // name: [rows (14 strings of 14), { letter: material }]
  const I = {};
  /* ------------------------------------------------ navigation and places */
  I.swords = [[
    'SS..........SS',
    'SSS........SSS',
    '.SSS......SSS.',
    '..SSS....SSS..',
    '...SSS..SSS...',
    '....SSSSSS....',
    '.....SSSS.....',
    '....SSSSSS....',
    '..GSSS..SSSG..',
    '.GGGS....SGGG.',
    '..GWG....GWG..',
    '.WWG......GWW.',
    'WW..........WW',
    'P............P'], { S: 'steel', G: 'gold', W: 'wood', P: 'gold' }];
  I.hammer = [[
    '..............',
    '.SSSSSSSSSSS..',
    'SSSSSSSSSSSSS.',
    'SSSSGGGGGSSSS.',
    'SSSSSSSSSSSSS.',
    '.SSSSSSSSSSS..',
    '.....WWW......',
    '.....WWW......',
    '.....WWW......',
    '.....WWW......',
    '.....WWW......',
    '.....WWW......',
    '....GGGGG.....',
    '....GGGGG.....'], { S: 'steel', G: 'gold', W: 'wood' }];
  I.paw = [[
    '...PPP..PPP...',
    '..PPPPP.PPPPP.',
    '..PPPPP.PPPPP.',
    '...PPP..PPP...',
    'PPP........PPP',
    'PPPP......PPPP',
    'PPPP.PPPP.PPPP',
    '.PP.PPPPPP.PP.',
    '...PPPPPPPP...',
    '..PPPPPPPPPP..',
    '..PPPPPPPPPP..',
    '..PPPPPPPPPP..',
    '...PPPPPPPP...',
    '....PPPPPP....'], { P: 'pink' }];
  I.scroll = [[
    '..PPPPPPPPPPP.',
    '.PPPPPPPPPPPPP',
    '.PPWPPPPPPPPP.',
    '..PPkkkkkkPP..',
    '..PPPPPPPPPP..',
    '..PPkkkkkPPP..',
    '..PPPPPPPPPP..',
    '..PPkkkkkkPP..',
    '..PPPPPPPPPP..',
    '..PPkkkkPPPP..',
    '..PPPPPPPRRP..',
    '.PPPPPPPRRRRP.',
    'PPPPPPPPPRRPPP',
    '.PPPPPPPPPPPP.'], { P: 'parch', R: 'red', W: 'parch' }];
  I.compass = [[
    '....GGGGGG....',
    '..GGGGGGGGGG..',
    '.GGBBBBBBBBGG.',
    '.GBBBBBRBBBBG.',
    'GGBBBBRRBBBBGG',
    'GBBBBBRRRBBBBG',
    'GBBBBBRRRBBBBG',
    'GBBBBSSSBBBBBG',
    'GBBBBSSSBBBBBG',
    'GGBBBBSSBBBBGG',
    '.GBBBBSBBBBBG.',
    '.GGBBBBBBBBGG.',
    '..GGGGGGGGGG..',
    '....GGGGGG....'], { G: 'gold', B: 'blue', R: 'red', S: 'white' }];
  I.egg = [[
    '.....EEEE.....',
    '....EEwEEE....',
    '...EEwEEEEE...',
    '...EEEEEEEE...',
    '..EEEEEEEEEE..',
    '..EEPPEEEPPE..',
    '..EPPPPEPPPP..',
    '.EEEPPEEEPPEE.',
    '.EEEEEEEEEEEE.',
    '.EEEECCCEEEEE.',
    '.EEECCCCCEEEE.',
    '..EEECCCEEEE..',
    '...EEEEEEEE...',
    '.....EEEE.....'], { E: 'egg', P: 'pink', C: 'cyan' }];
  I.map = [[
    '..............',
    'PPPP....PPPP..',
    'PPPPPPPPPPPPPP',
    'PPGPPPPPPPPPPP',
    'PPGGPPPPkPPPPP',
    'PPPGGPPPkkPPPP',
    'PPPPGGGPPkPPPP',
    'PPPPPPGGPPPPPP',
    'PPPPPPPGGGPPRP',
    'PPPPPPPPPGGRRR',
    'PPPPPPPPPPPPRP',
    'PPPPPPPPPPPPPP',
    '..PPPP....PPPP',
    '..............'], { P: 'parch', G: 'green', R: 'red' }];
  I.gear = [[
    '.....SSSS.....',
    '..SS.SSSS.SS..',
    '.SSSSSSSSSSSS.',
    '.SSSSSSSSSSSS.',
    '..SSSSCCSSSS..',
    'SSSSSCCCCSSSSS',
    'SSSSCCkkCCSSSS',
    'SSSSCCkkCCSSSS',
    'SSSSSCCCCSSSSS',
    '..SSSSCCSSSS..',
    '.SSSSSSSSSSSS.',
    '.SSSSSSSSSSSS.',
    '..SS.SSSS.SS..',
    '.....SSSS.....'], { S: 'steel', C: 'cyan' }];
  I.chat = [[
    '..............',
    '.VVVVVVVVVVVV.',
    'VVVVVVVVVVVVVV',
    'VVwVVVVVVVVVVV',
    'VVVVVVVVVVVVVV',
    'VVVkkVVkkVVkkV',
    'VVVkkVVkkVVkkV',
    'VVVVVVVVVVVVVV',
    'VVVVVVVVVVVVVV',
    '.VVVVVVVVVVVV.',
    '..VVV.........',
    '..VV..........',
    '..V...........',
    '..............'], { V: 'violet' }];
  I.book = [[
    '..............',
    '.VVVVVVVVVVV..',
    '.VVVVVVVVVVVV.',
    '.VVwVVVGGVVVV.',
    '.VVVVVGGGGVVV.',
    '.VVVVVVGGVVVV.',
    '.VVVVVVVVVVVV.',
    '.VVVVVVVVVVVV.',
    '.VVVVVVVVVVVV.',
    '.VVVVVVVVVVVV.',
    '.VVVVVVVVVVVV.',
    '.PPPPPPPPPPPV.',
    '.PPPPPPPPPPPP.',
    '..VVVVVVVVVVV.'], { V: 'violet', G: 'gold', P: 'parch' }];
  I.box = [[
    '..............',
    '..WWWWWWWWWW..',
    '.WWWWWWWWWWWW.',
    'WWWWWWWWWWWWWW',
    'GGGGGGGGGGGGGG',
    'WWWWWGGGGWWWWW',
    'WWWWWGkkGWWWWW',
    'WWWWWGGGGWWWWW',
    'WWWWWWWWWWWWWW',
    'GWWWWWWWWWWWWG',
    'WWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWW',
    'GGGGGGGGGGGGGG',
    '..............'], { W: 'wood', G: 'gold' }];
  I.gate = [[
    '....SSSSSS....',
    '..SSSSSSSSSS..',
    '.SSSSCCCCSSSS.',
    '.SSSCCCCCCSSS.',
    'SSSCCCCCCCCSSS',
    'SSSCCCCCCCCSSS',
    'SSSCCCwCCCCSSS',
    'SSSCCCCCCCCSSS',
    'SSSCCCCCCCCSSS',
    'SSSCCCCCCCCSSS',
    'SSSCCCCCCCCSSS',
    'SSSCCCCCCCCSSS',
    'SSSCCCCCCCCSSS',
    'SSSSSSSSSSSSSS'], { S: 'stone', C: 'violet' }];
  I.home = [[
    '......RR......',
    '.....RRRR.....',
    '....RRRRRR....',
    '...RRRRRRRR...',
    '..RRRRRRRRRR..',
    '.RRRRRRRRRRRR.',
    'RRRRRRRRRRRRRR',
    '.SSSSSSSSSSSS.',
    '.SSCCSSSSWWSS.',
    '.SSCCSSSSWWSS.',
    '.SSSSSSSSWWSS.',
    '.SSSSSSSSWWSS.',
    '.SSSSSSSSWWSS.',
    '.SSSSSSSSWWSS.'], { R: 'red', S: 'stone', C: 'cyan', W: 'wood' }];
  I.habitat = [[
    '.....GGGG.....',
    '...GGGGGGGG...',
    '..GGGGGGGGGG..',
    '.GGGGGGGGGGGG.',
    'GGGGGGGGGGGGGG',
    '.EEEEEEEEEEEE.',
    '.EEEEkkkkEEEE.',
    '.EEEkkkkkkEEE.',
    '.EEEkkkkkkEEE.',
    '.EEEkkkkkkEEE.',
    '.EEEEEEEEEEEE.',
    'LLLLLLLLLLLLLL',
    '.LLLLLLLLLLLL.',
    '..............'], { G: 'leaf', E: 'earth', L: 'green' }];
  I.island = [[
    '..............',
    '......GG......',
    '...GGGGGGGG...',
    '.GGGGGGGGGGGG.',
    'GGGGGGGGGGGGGG',
    'EEEEEEEEEEEEEE',
    '.EEEEEEEEEEEE.',
    '..EEEEEEEEEE..',
    '...SSSSSSSS...',
    '....SSSSSS....',
    '.....SSSS..C..',
    '......SS......',
    '......S...C...',
    '..............'], { G: 'leaf', E: 'earth', S: 'stone', C: 'cyan' }];
  /* ------------------------------------------------ creatures, hatchery, profile */
  I.heart = [[
    '..............',
    '.RRRR....RRRR.',
    'RRRRRR..RRRRRR',
    'RRwRRRRRRRRRRR',
    'RRRRRRRRRRRRRR',
    'RRRRRRRRRRRRRR',
    '.RRRRRRRRRRRR.',
    '..RRRRRRRRRR..',
    '...RRRRRRRR...',
    '....RRRRRR....',
    '.....RRRR.....',
    '......RR......',
    '..............',
    '..............'], { R: 'pink' }];
  I.breed = [[
    '..............',
    '.RRR.RRR......',
    'RRRRRRRRR.....',
    'RRRRRRRRR.....',
    '.RRRRRRR......',
    '..RRRRRBBB.BBB',
    '...RRRBBBBBBBB',
    '....R.BBBBBBBB',
    '.......BBBBBB.',
    '........BBBB..',
    '.........BB...',
    '..............',
    '..............',
    '..............'], { R: 'pink', B: 'cyan' }];
  I.crown = [[
    '..............',
    '..............',
    'G.....G.....G.',
    'GG...GGG...GG.',
    'GGG.GGGGG.GGG.',
    'GGGGGGGGGGGGG.',
    'GGGGGGGGGGGGG.',
    'GGPGGGCGGGPGG.',
    'GGGGGGGGGGGGG.',
    'GGGGGGGGGGGGG.',
    '.GGGGGGGGGGG..',
    '..............',
    '..............',
    '..............'], { G: 'gold', P: 'pink', C: 'cyan' }];
  I.xp = [[
    '......VV......',
    '.....VVVV.....',
    '....VVwVVV....',
    '...VVVVVVVV...',
    '..VVVVVVVVVV..',
    '.VVVVGGGVVVVV.',
    'VVVVGGGGGVVVVV',
    'VVVGGGGGGGVVVV',
    '.VVVVGGGVVVVV.',
    '..VVVGGGVVVV..',
    '...VVGGGVVV...',
    '....VVVVVV....',
    '.....VVVV.....',
    '......VV......'], { V: 'violet', G: 'gold' }];
  I.spark = [[
    '......C.......',
    '......C.......',
    '.....CCC......',
    '.....CCC......',
    '....CCCCC.....',
    'CCCCCCwCCCCCC.',
    '..CCCCCCCCC...',
    '....CCCCC.....',
    '.....CCC......',
    '.....CCC...P..',
    '......C...PPP.',
    '......C....P..',
    '..............',
    '..............'], { C: 'cyan', P: 'pink' }];
  I.star = [[
    '......GG......',
    '.....GGGG.....',
    '.....GGGG.....',
    '....GGGGGG....',
    'GGGGGGwGGGGGGG',
    '.GGGGGGGGGGGG.',
    '..GGGGGGGGGG..',
    '...GGGGGGGG...',
    '...GGGGGGGG...',
    '..GGGGGGGGGG..',
    '..GGGGGGGGGG..',
    '.GGGGG..GGGGG.',
    '.GGG......GGG.',
    '..............'], { G: 'gold' }];
  I.trophy = [[
    '..GGGGGGGGGG..',
    'GGGGGGGGGGGGGG',
    'G.GGGwGGGGGG.G',
    'G.GGGGGGGGGG.G',
    '.GGGGGGGGGGGG.',
    '..GGGGGGGGGG..',
    '...GGGGGGGG...',
    '.....GGGG.....',
    '......GG......',
    '......GG......',
    '....GGGGGG....',
    '...WWWWWWWW...',
    '...WWWWWWWW...',
    '..............'], { G: 'gold', W: 'wood' }];
  I.lock = [[
    '..............',
    '....SSSSSS....',
    '...SS....SS...',
    '...SS....SS...',
    '...SS....SS...',
    '..GGGGGGGGGG..',
    '..GGGGGGGGGG..',
    '..GGGGkkGGGG..',
    '..GGGGkkGGGG..',
    '..GGGGGkGGGG..',
    '..GGGGGGGGGG..',
    '..GGGGGGGGGG..',
    '..............',
    '..............'], { S: 'steel', G: 'gold' }];
  /* ------------------------------------------------ forge, equipment, crafting */
  I.anvil = [[
    '..............',
    '..............',
    '.SSSSSSSSSSSS.',
    'SSSSSSSSSSSSS.',
    '.SSSSSSSSSSSSS',
    '...SSSSSSSSS..',
    '.....SSSSS....',
    '.....SSSSS....',
    '....SSSSSSS...',
    '...SSSSSSSSS..',
    '..OOO....OOO..',
    '..............',
    '..............',
    '..............'], { S: 'steel', O: 'ember' }];
  I.merge = [[
    '..............',
    'VV..........CC',
    'VVV........CCC',
    '.VVV......CCC.',
    '..VVV....CCC..',
    '...VVV..CCC...',
    '....VVGGCC....',
    '.....GGGG.....',
    '.....GGGG.....',
    '......GG......',
    '.....GGGG.....',
    '....GGwGGG....',
    '.....GGGG.....',
    '......GG......'], { V: 'violet', C: 'cyan', G: 'gold' }];
  I.axe = [[
    '...SSSS.......',
    '..SSSSSSW.....',
    '.SSSSSSWW.....',
    'SSSSSSWWW.....',
    'SSSSSS.WWW....',
    '.SSSS...WWW...',
    '..SS.....WWW..',
    '..........WWW.',
    '...........WWW',
    '............WW',
    '..............',
    '..............',
    '..............',
    '..............'], { S: 'steel', W: 'wood' }];
  /* ------------------------------------------------ battle: abilities, statuses, conditions */
  I.shield = [[
    'SSSSSSSSSSSSSS',
    'SBBBBBBBBBBBBS',
    'SBBBBBGGBBBBBS',
    'SBwBBBGGBBBBBS',
    'SBBBGGGGGGBBBS',
    'SBBBGGGGGGBBBS',
    'SBBBBBGGBBBBBS',
    '.SBBBBGGBBBBS.',
    '.SBBBBBBBBBBS.',
    '..SBBBBBBBBS..',
    '...SBBBBBBS...',
    '....SBBBBS....',
    '.....SSSS.....',
    '..............'], { S: 'gold', B: 'blue', G: 'white' }];
  I.claw = [[
    '..........R...',
    '.....R...RR...',
    '.R..RR..RR....',
    '.RR.RR.RR.....',
    '..RRR.RR..R...',
    '..RR.RR..RR...',
    '.RR.RR..RR....',
    'RR.RR..RR.....',
    'R.RR..RR......',
    '.RR..RR.......',
    'RR..RR........',
    'R..RR.........',
    '..RR..........',
    '..R...........'], { R: 'white' }];
  I.potion = [[
    '.....WWWW.....',
    '.....SSSS.....',
    '......SS......',
    '......SS......',
    '....SSSSSS....',
    '...SSSSSSSS...',
    '..SSwSSSSSSS..',
    '..GGGGGGGGGG..',
    '.GGGGGGGGGGGG.',
    '.GGGGGGGGGGGG.',
    '.GGGGGGGGGGGG.',
    '..GGGGGGGGGG..',
    '...GGGGGGGG...',
    '..............'], { W: 'wood', S: 'shell', G: 'green' }];
  I.hourglass = [[
    'WWWWWWWWWWWWWW',
    '.SSSSSSSSSSSS.',
    '.SGGGGGGGGGGS.',
    '..SGGGGGGGGS..',
    '...SGGGGGGS...',
    '....SGGGGS....',
    '.....SGGS.....',
    '.....SSGS.....',
    '....SSSGSS....',
    '...SSSSGSSS...',
    '..SSSSGGGSSS..',
    '.SSGGGGGGGGSS.',
    '.SSSSSSSSSSSS.',
    'WWWWWWWWWWWWWW'], { W: 'wood', S: 'shell', G: 'gold' }];
  I.target = [[
    '....RRRRRR....',
    '..RR......RR..',
    '.R....RR....R.',
    '.R..RRRRRR..R.',
    'R..RR....RR..R',
    'R..R......R..R',
    'R.RR..RR..RR.R',
    'R.RR..RR..RR.R',
    'R..R......R..R',
    'R..RR....RR..R',
    '.R..RRRRRR..R.',
    '.R....RR....R.',
    '..RR......RR..',
    '....RRRRRR....'], { R: 'pink' }];
  I.burn = [[
    '......R.......',
    '.....RR.......',
    '....RRR...R...',
    '....RRRR..RR..',
    '...RRRRR.RRR..',
    '..RRRORRRRRR..',
    '..RRROORRRRR..',
    '.RRROOOORRRRR.',
    '.RRROOYOORRRR.',
    '.RRROYYYOORRR.',
    '.RRROYYYYORRR.',
    '..RRROYYORRR..',
    '...RRROORRR...',
    '.....RRRR.....'], { R: 'red', O: 'orange', Y: 'gold' }];
  I.stun = [[
    '.......YYYY...',
    '......YYYY....',
    '.....YYYY.....',
    '....YYYY......',
    '...YYYY.......',
    '..YYYYYYYYY...',
    '.YYYYYYYYY....',
    '.....YYYY.....',
    '....YYYY......',
    '...YYYY.......',
    '..YYY.........',
    '.YYY..........',
    '.YY...........',
    '.Y............'], { Y: 'gold' }];
  I.soak = [[
    '......B.......',
    '......B.......',
    '.....BBB......',
    '.....BBB......',
    '....BBBBB.....',
    '...BBBBBBB....',
    '...BwBBBBB....',
    '..BBwBBBBBB...',
    '..BBBBBBBBB...',
    '..BBBBBBBBB...',
    '..BBBBBBBBB...',
    '...BBBBBBB....',
    '....BBBBB.....',
    '..............'], { B: 'blue' }];
  I.regen = [[
    '..........LL..',
    '.........LLLL.',
    '....GGGG.LLL..',
    '....GGGG..L...',
    '....GGGG......',
    'GGGGGGGGGGGG..',
    'GGGGGwGGGGGG..',
    'GGGGGGGGGGGG..',
    'GGGGGGGGGGGG..',
    '....GGGG......',
    '....GGGG......',
    '....GGGG......',
    '....GGGG......',
    '..............'], { G: 'green', L: 'leaf' }];
  I.silence = [[
    '..............',
    '......VV......',
    '.....VVV...R.R',
    '....VVVV....R.',
    'VVVVVVVV...R.R',
    'VVVVVVVV......',
    'VVVVVVVV......',
    'VVVVVVVV......',
    'VVVVVVVV......',
    '....VVVV......',
    '.....VVV......',
    '......VV......',
    '..............',
    '..............'], { V: 'dusk', R: 'red' }];
  I.weak = [[
    '..............',
    '.....RRRR.....',
    '.....RRRR.....',
    '.....RRRR.....',
    '.....RRRR.....',
    '.....RRRR.....',
    '.RRRRRRRRRRRR.',
    '..RRRRRRRRRR..',
    '...RRRRRRRR...',
    '....RRRRRR....',
    '.....RRRR.....',
    '......RR......',
    '..............',
    '..............'], { R: 'red' }];
  I.warn = [[
    '......RR......',
    '.....RRRR.....',
    '.....RRRR.....',
    '....RRYYRR....',
    '....RRYYRR....',
    '...RRRYYRRR...',
    '...RRRYYRRR...',
    '..RRRRYYRRRR..',
    '..RRRRRRRRRR..',
    '.RRRRRYYRRRRR.',
    '.RRRRRYYRRRRR.',
    'RRRRRRRRRRRRRR',
    'RRRRRRRRRRRRRR',
    '..............'], { R: 'red', Y: 'white' }];
  I.boss = [[
    'G.....G.....G.',
    'GG...GGG...GG.',
    'GGGGGGGGGGGGG.',
    'GGGGGGRGGGGGG.',
    '.............',
    '..SSSSSSSSS...',
    '.SSSSSSSSSSS..',
    '.SSkkSSSkkSS..',
    '.SSkkSSSkkSS..',
    '.SSSSSkSSSSS..',
    '..SSSSSSSSS...',
    '...SkSkSkS....',
    '...SSSSSSS....',
    '..............'], { G: 'gold', R: 'red', S: 'white' }];
  /* ------------------------------------------------ settings and accessibility */
  I.sound = [[
    '..............',
    '......SS......',
    '.....SSS...C..',
    '....SSSS....C.',
    'SSSSSSSS..C..C',
    'SSSSSSSS...C.C',
    'SSSSSSSS...C.C',
    'SSSSSSSS...C.C',
    'SSSSSSSS..C..C',
    '....SSSS....C.',
    '.....SSS...C..',
    '......SS......',
    '..............',
    '..............'], { S: 'steel', C: 'cyan' }];
  I.battery = [[
    '..............',
    '..............',
    '.SSSSSSSSSSS..',
    '.SGGGGGGGGGS..',
    '.SGGGGGGGGGSSS',
    '.SGGGGGGGGGSSS',
    '.SGGGGGGGGGSSS',
    '.SGGGGGGGGGSSS',
    '.SGGGGGGGGGS..',
    '.SSSSSSSSSSS..',
    '..............',
    '..............',
    '..............',
    '..............'], { S: 'steel', G: 'green' }];
  I.motion = [[
    '..............',
    '..............',
    '.....CCCC.....',
    '...CCCCCCCC...',
    '..CCCkkkkCCC..',
    '.CCCkkVVkkCCC.',
    'CCCCkVVVVkCCCC',
    'CCCCkVVVVkCCCC',
    '.CCCkkVVkkCCC.',
    '..CCCkkkkCCC..',
    '...CCCCCCCC...',
    '.....CCCC.....',
    '..............',
    '..............'], { C: 'white', V: 'violet' }];
  I.fragment = [[
    '.......CC.....',
    '......CCCC....',
    '.....CCCCCC...',
    '....CCwCCCCC..',
    '...CCCCCCCCCC.',
    '..PPPPPPPPPPP.',
    '...PPPPPPPPP..',
    '....PPPPPPP...',
    '.....PPPPP....',
    '..............',
    '..G.....G.....',
    '.GGG...GGG....',
    '..G.....G.....',
    '..............'], { C: 'cyan', P: 'violet', G: 'gold' }];

  /* ------------------------------------------------ elements: one glyph per element, in the element's own colour */
  I.el_light = [[
    '......GG......',
    '..G...GG...G..',
    '...G......G...',
    '.....GGGG.....',
    '....GGGGGG....',
    'GG.GGGwGGGG.GG',
    'GG.GGGGGGGG.GG',
    '....GGGGGG....',
    '.....GGGG.....',
    '...G......G...',
    '..G...GG...G..',
    '......GG......',
    '..............',
    '..............'], { G: 'gold' }];
  I.el_dark = [[
    '.....DDDD.....',
    '...DDDDD......',
    '..DDDDD.......',
    '.DDDDD.....S..',
    '.DDDD.........',
    'DDDDD.........',
    'DDDDD.........',
    'DDDDD.........',
    'DDDDDD........',
    '.DDDDDD....D..',
    '.DDDDDDDDDDD..',
    '..DDDDDDDDD...',
    '...DDDDDDD....',
    '.....DDD......'], { D: 'dusk', S: 'white' }];
  I.el_nature = [[
    '...........LL.',
    '........LLLLL.',
    '......LLLLLLL.',
    '.....LLLLLLLL.',
    '....LLLLkLLLL.',
    '...LLLLkLLLL..',
    '...LLLkLLLLL..',
    '..LLLkLLLLL...',
    '..LLkLLLLL....',
    '..LkLLLLL.....',
    '..kLLLL.......',
    '.k............',
    'k.............',
    '..............'], { L: 'leaf' }];
  I.el_fire = [[
    '......R.......',
    '......RR......',
    '.....RRR..R...',
    '....RRRRR.RR..',
    '...RRRORRRRR..',
    '...RROOORRRR..',
    '..RRROOOORRRR.',
    '..RROOYYOORRR.',
    '..RROYYYYORRR.',
    '..RROYYYYORRR.',
    '...RROYYORRR..',
    '....RROORRR...',
    '.....RRRRR....',
    '..............'], { R: 'red', O: 'orange', Y: 'gold' }];
  I.el_water = [[
    '......B.......',
    '.....BBB......',
    '.....BBB......',
    '....BBBBB.....',
    '...BBBBBBB....',
    '...BwBBBBB....',
    '..BwBBBBBBB...',
    '..BBBBBBBBB...',
    '..BBBBBBBBB...',
    '..BBBBBBBBB...',
    '...BBBBBBB....',
    '....BBBBB.....',
    '..............',
    '..............'], { B: 'blue' }];
  I.el_earth = [[
    '..............',
    '......EE......',
    '.....EEEE.....',
    '....EEwEEE....',
    '...EEEEEEEE...',
    '...EEEEEEEEEE.',
    '..EEEEkEEEEEE.',
    '..EEEEEkEEEEEE',
    '.EEEEEEkEEEEEE',
    '.EEEEEEEEEEEEE',
    'EEEEEEEEEEEEEE',
    'EEEEEEEEEEEEEE',
    '..............',
    '..............'], { E: 'earth' }];
  I.el_wind = [[
    '..............',
    '.......TTTT...',
    '......T....T..',
    '...........T..',
    'TTTTTTTTTTT...',
    '..............',
    'TTTTTTTTTTTTT.',
    '.............T',
    '..TTTTTTTTTTT.',
    '..............',
    'TTTTTTTT......',
    '........T.....',
    '.....TTT......',
    '..............'], { T: 'teal' }];
  I.el_resonance = [[
    '......PP......',
    '.....PPPP.....',
    '....PPPPPP....',
    '...PPPwPPPP...',
    '..PPPPPPPPPP..',
    '.PPPPPPPPPPPP.',
    'PPPPPPPPPPPPPP',
    'VVVVVVVCCCCCCC',
    '.VVVVVVCCCCCC.',
    '..VVVVVCCCCC..',
    '...VVVVCCCC...',
    '....VVVCCC....',
    '.....VVCC.....',
    '......VC......'], { P: 'rose', V: 'violet', C: 'cyan' }];
  I.el_metal = [[
    '..............',
    '....MMMMMM....',
    '...MMMMMMMM...',
    '..MMwMMMMMMM..',
    '.MMMMMMMMMMMM.',
    'MMMMMkkkkMMMMM',
    'MMMMk....kMMMM',
    'MMMMk....kMMMM',
    'MMMMMkkkkMMMMM',
    '.MMMMMMMMMMMM.',
    '..MMMMMMMMMM..',
    '...MMMMMMMM...',
    '....MMMMMM....',
    '..............'], { M: 'metal' }];

  /* ------------------------------------------------ the builder */
  function build(rows, mats) {
    const N = 16, g = Array.from({ length: N }, () => Array(N).fill(null));
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = r[x]; if (c !== '.' && c !== ' ') g[y + 1][x + 1] = c; } });
    const mat = (c) => (c === 'w' || c === 'k' ? null : c);
    const solid = (x, y) => x >= 0 && y >= 0 && x < N && y < N && g[y][x] !== null;
    // a glint takes the material of its neighbours for edge tests
    const same = (x, y, c) => solid(x, y) && (g[y][x] === c || g[y][x] === 'w' || g[y][x] === 'k');
    const col = Array.from({ length: N }, () => Array(N).fill(null));
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = g[y][x]; if (c === null) { if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) col[y][x] = OUT; continue; }
      if (c === 'w') { col[y][x] = GLINT; continue; } if (c === 'k') { col[y][x] = INK; continue; }
      const ramp = M[mats[c]] || M.white;
      const score = (same(x, y - 1, c) ? 0 : 1) + (same(x - 1, y, c) ? 0 : 1) - (same(x, y + 1, c) ? 0 : 1) - (same(x + 1, y, c) ? 0 : 1);
      col[y][x] = score > 0 ? ramp[0] : score < 0 ? ramp[2] : ramp[1];
      void mat;
    }
    let out = '';
    for (let y = 0; y < N; y++) { let x = 0; while (x < N) { const c = col[y][x]; if (!c) { x++; continue; } let n = 1; while (x + n < N && col[y][x + n] === c) n++; out += '<rect x="' + x + '" y="' + y + '" width="' + n + '" height="1" fill="' + c + '"/>'; x += n; } }
    return out;
  }
  const cache = {};
  PZI.names = () => Object.keys(I);
  PZI.has = (n) => !!I[n];
  PZI.body = (n) => (cache[n] || (cache[n] = build(I[n][0], I[n][1])));
  PZI.sprite = (n, cls) => '<svg class="ico px pzi pzi-' + n + ' ' + (cls || '') + '" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">' + PZI.body(n) + '</svg>';
  // the same sprite nested inside another SVG
  PZI.inline = (n, x, y, size) => '<svg x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '" viewBox="0 0 16 16" shape-rendering="crispEdges">' + PZI.body(n) + '</svg>';
  // element glyph for any element id
  PZI.el = (el, cls) => PZI.sprite(I['el_' + el] ? 'el_' + el : 'spark', 'el-ico ' + (cls || ''));

  // Art.icon: prismatic sprites for the "things"; the line icons stay for controls; currency/essence sprites unchanged.
  const icon1 = Art.icon;
  const KEEP_LINE = { close: 1, check: 1, plus: 1, minus: 1, back: 1, arrow: 1, up: 1, rotate: 1, move: 1, info: 1, swap: 1 };
  Art.icon = (n, cls) => (I[n] && !KEEP_LINE[n] ? PZI.sprite(n, cls) : icon1(n, cls));
  Art.elIcon = PZI.el;
  Art.iconNames = () => Object.keys(I);
})(typeof window !== 'undefined' ? window : globalThis);
