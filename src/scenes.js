/* Aminas — story scenes as data (no DOM). A scene is a list of beats played by UI.scene (ui-scene.js).
   Beat fields:
     who   '*' narration | 'entity' | 'you' | any cast key            text   what is said or described
     mood  the Entity's expression: n normal, t tired, s shaken, a looking away, w wry, c eyes closed
     bg    background key for Art.envBg (changes the backdrop)        show   {sp, pose} creature on stage ('bow', 'watch')
     entity 'in' | 'out' (the Entity steps into or out of the scene)  pause  extra hold in ms (silences)
     choice [{text, goto?, set?}] the player's response; goto jumps to a beat id, set writes story flags
     id    a label for goto
   Scenes never grant rewards or unlock anything: the rules do that when the battle is won, before the scene plays,
   so skipping or closing a scene can never lose or duplicate progress.
   Canon guard (author notes): the Entity never explains the Emergence, never says where the starter island came from,
   never names the presence beyond the world, and never explains why the two starter species became enemies. */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const SC = (A.Scenes = {});

  SC.list = {
    /* Starter Island, Dungeon 1: after the Waywarden. Target length 35-50 s. */
    oldroads: {
      title: 'Old Roads', tone: 'melancholy', dungeon: 'forgottenroad', bg: 'roadend',
      cast: { waywarden: { name: 'The Waywarden', sp: 'gaiaroki' } },
      beats: [
        { who: '*', show: { sp: 'gaiaroki', pose: 'bow' }, text: 'The Waywarden lowers its head. The old stones beneath its feet stop glowing.' },
        { who: '*', entity: 'in', text: 'The Entity appears beside the ruined road, looking more inconvenienced than impressed.' },
        { who: 'entity', mood: 'w', text: 'Well. That was a great deal of effort for a glorified roadblock.' },
        { who: 'entity', mood: 'n', text: 'Still, it has done its job rather well. This road used to lead to a settlement. People travelled it every day, apparently. Can’t imagine why anyone would want to walk that far.' },
        { who: 'you', choice: [{ text: 'What happened to the settlement?' }] },
        { who: 'entity', mood: 't', text: 'Time. Neglect. A few other inconveniences. Take your pick.' },
        { who: '*', bg: 'mural', text: 'You notice the mural: the two small figures, side by side. The Entity glances at it.' },
        { who: 'entity', mood: 'c', text: '…', pause: 1400 },
        { who: '*', text: 'He looks away.' },
        { who: 'entity', mood: 'a', text: 'Old roads have a habit of outliving the people who built them.' },
        { who: 'entity', mood: 'n', bg: 'roadend', text: 'Come along, Kind Soul. If we’re going to repair this place, I’d rather we started before another few centuries pass.' },
        { who: '*', bg: 'roadopen', entity: 'out', show: { sp: 'gaiaroki', pose: 'watch' }, text: 'The Entity leaves. The Waywarden watches you pass through the newly opened road.' },
      ],
    },
    /* Dungeon 2 (draft for review): the central question is why the place was abandoned. Deliberately unanswered. */
    emptyhall: {
      title: 'The Empty Hall', tone: 'quiet', dungeon: 'gatheringhall', bg: 'hall3', draft: true,
      cast: { lamplighter: { name: 'The Lamplighter', sp: 'voltar' } },
      beats: [
        { who: '*', show: { sp: 'voltar', pose: 'bow' }, text: 'The Lamplighter lets the last lantern go out. In the dark, the hall looks bigger, and emptier.' },
        { who: '*', entity: 'in', text: 'The Entity is already sitting at one of the long tables, as if he had a seat there.' },
        { who: 'entity', mood: 'n', text: 'A gathering hall. People and Kind Souls ate here, argued here, and left the washing-up for later.' },
        { who: 'you', choice: [{ text: 'Why did they leave?' }, { text: 'Did you know them?', goto: 'knew' }] },
        { who: 'entity', mood: 'a', text: 'Nobody leaves a place like this on purpose. Something asks them to.', goto: 'mural' },
        { id: 'knew', who: 'entity', mood: 't', text: 'I know a great many things about a great many halls. Most of them are about the plumbing.' },
        { id: 'mural', who: '*', bg: 'mural', text: 'On the far wall, the same two figures again. Someone scratched a line between them, carefully. Someone else tried to scrub it out.' },
        { who: 'entity', mood: 'c', text: '…', pause: 1200 },
        { who: 'entity', mood: 't', bg: 'hall1', text: 'Lanterns. Good. We’ll want them where we’re going. Come along.' },
      ],
    },
    /* Starter Island, Dungeon 10: after the Island Boss. The prismatic light is never explained. */
    heartwood: {
      title: 'The Heart of the Island', tone: 'unsettling', dungeon: 'heartwood', bg: 'heart',
      cast: { stag: { name: 'The Heartwood Stag', sp: 'sylvaneer2' } },
      beats: [
        { who: '*', show: { sp: 'sylvaneer2', pose: 'bow' }, text: 'The stag lowers its antlers. The light around it thins, colour by colour, until only one is left.' },
        { who: '*', entity: 'in', text: 'The Entity steps out from between the roots. He keeps his eyes on the last colour until it fades.' },
        { who: 'entity', mood: 't', text: 'There. It was only keeping a door shut. Doors do that, if nobody tells them otherwise.' },
        { who: 'you', choice: [{ text: 'What door?' }, { text: 'What was that light?', goto: 'light' }] },
        { who: 'entity', mood: 'a', text: 'The one to the next island. Don’t look at me like that. It was never my door.', goto: 'after' },
        { id: 'light', who: 'entity', mood: 's', text: 'Colours. Lots of them. I would prefer not to discuss colours today.' },
        { id: 'after', who: '*', text: 'Far past the edge of the sanctuary, another island catches the light, as though it has only just arrived.' },
        { who: 'entity', mood: 'n', text: 'The Verdant Wilds. Bring your manners. Everything there is older than it looks, including the moss.' },
        { who: 'entity', mood: 'w', text: 'Well done, Kind Soul. One island holding together. That’s one more than this morning.' },
      ],
    },

    /* ======================= Phase 18C: the Verdant Wilds (Overgrown Commonwealth) =======================
       Canon guard as above. The third voice is heard, never identified; the Twin Shrine shows the two starters together
       and then a smashed panel; two Kind Souls disagree about why, and nothing confirms either of them. */
    v_arrival: {
      title: 'Mind the Roots', tone: 'quiet', bg: 'v_mossgate',
      cast: {},
      beats: [
        { who: '*', text: 'The skiff bumps against a landing stone worn smooth by a great many feet. Not all of them had shoes.' },
        { who: '*', entity: 'in', text: 'The Entity is already on the beach, frowning at a root as thick as a wall.' },
        { who: 'entity', mood: 'w', text: 'The Wilds. Mind the roots. They were here first, and they have never let anyone forget it.' },
        { who: '*', text: 'Beyond the landing, a stair of mossy steps climbs into the trees. Two sizes of step, side by side.' },
        { who: 'entity', mood: 'n', text: 'Somebody built steps here. Lots of steps. People never build steps to nowhere. Well. Rarely.' },
        { who: 'you', choice: [{ text: 'Who lived here?' }, { text: 'Is it safe?', goto: 'safe' }] },
        { who: 'entity', mood: 'a', text: 'People. Kind Souls. Both at once, by the look of the doorways. It is the sort of arrangement that never lasts.', goto: 'go' },
        { id: 'safe', who: 'entity', mood: 't', text: 'Nothing is safe. Some things are merely overgrown.' },
        { id: 'go', who: 'entity', mood: 'n', text: 'Up the Mossgate Steps, then. Ten places worth your trouble on this island, and one very large tree. Come along, Kind Soul.' },
      ],
    },
    v_keepers: {
      title: 'Filed Correctly', tone: 'quiet', dungeon: 'v_archive', bg: 'v_archive',
      cast: { archivist: { name: 'The Archivist', sp: 'zeep3' } },
      beats: [
        { who: '*', show: { sp: 'zeep3', pose: 'bow' }, text: 'The Archivist stops mid-file, clicks twice, and slides one last tablet onto its shelf.' },
        { who: '*', entity: 'in', text: 'The Entity picks up the tablet that was lying face-down and turns it over before you can.' },
        { who: 'entity', mood: 'n', text: '“The Keepers of the Crossing.” Charming. Folk tales. Every ruin has some.' },
        { who: '*', text: 'The carving shows two small figures, one bright, one dark, standing either side of something that looks like an open door.' },
        { who: 'you', choice: [{ text: 'Those look like my starter’s kind.' }, { text: 'What crossing?', goto: 'cross' }] },
        { who: 'entity', mood: 'a', text: 'They look like a great many things. Carvings are generous that way.', goto: 'filed' },
        { id: 'cross', who: 'entity', mood: 't', text: 'A crossing is a place where one thing becomes another. Rivers have them. So do bad ideas.' },
        { id: 'filed', who: 'entity', mood: 'c', text: '…', pause: 1200 },
        { who: 'entity', mood: 's', text: '…These are filed correctly. Nobody files folk tales correctly.' },
        { who: 'entity', mood: 'n', entity: 'out', text: 'Put it back where it was. Face-down. The Archivist will want to do the rest.' },
      ],
    },
    v_shrine: {
      title: 'The Broken Panel', tone: 'melancholy', dungeon: 'v_twinshrine', bg: 'v_twinshrine',
      cast: { warden: { name: 'The Dawn Warden', sp: 'aurelith' }, pale: { name: 'A pale Kind Soul', sp: 'lumi2' }, dark: { name: 'A dark Kind Soul', sp: 'voltar2' } },
      beats: [
        { who: '*', show: { sp: 'aurelith', pose: 'bow' }, text: 'The Dawn Warden folds its light away. Behind it, the shrine’s panels are clear of moss for the first time in an age.' },
        { who: '*', text: 'The first panel: two small figures, one of light and one of shadow, standing guard at a door together. Side by side. Close.' },
        { who: '*', text: 'The second panel has been smashed. Not cracked. Smashed, carefully, as if someone wanted to be sure.' },
        { who: 'pale', show: { sp: 'lumi2', pose: 'watch' }, text: 'The dark one let it in. Everybody on the pale side knows that.' },
        { who: 'dark', show: { sp: 'voltar2', pose: 'watch' }, text: 'The light one shut the door on us. Everybody on the dark side knows that.' },
        { who: '*', entity: 'in', text: 'Your own companion has gone very still, looking at the first panel.' },
        { who: 'you', choice: [{ text: 'Which of them is right?' }, { text: 'What did they let in?', goto: 'in' }] },
        { who: 'entity', mood: 'a', text: 'Both. Neither. The panel that would tell you is in pieces, and I did not bring glue.', goto: 'end' },
        { id: 'in', who: 'entity', mood: 's', text: 'I would prefer that you did not ask that question near a broken panel.' },
        { id: 'end', who: 'entity', mood: 't', text: 'Panels break. It is what panels do.' },
        { who: 'entity', mood: 'n', entity: 'out', text: 'The shrine seems to want to give you something. Shrines do that. Mind you only take it once.' },
      ],
    },
    v_spire: {
      title: 'In Time', tone: 'unsettling', dungeon: 'v_canopy', bg: 'v_canopy',
      cast: { squall: { name: 'The Canopy Squall', sp: 'stormbringer' } },
      beats: [
        { who: '*', show: { sp: 'stormbringer', pose: 'bow' }, text: 'The Canopy Squall settles on the highest branch, and for the first time today the wind is quiet.' },
        { who: '*', text: 'Across the sea, very small, you can see the sanctuary. And on it, the Dormant Spire, glowing.' },
        { who: '*', text: 'It pulses. Slowly. Somewhere behind you, to the east, the standing stones hum, and the pulse matches them exactly.' },
        { who: '*', entity: 'in', text: 'The Entity is beside you on the platform, which is impossible, because there was only room for one.' },
        { who: 'you', choice: [{ text: 'Why is the Spire answering the stones?' }, { text: 'Did you know it would?', goto: 'knew' }] },
        { who: 'entity', mood: 'a', text: 'Answering is a strong word. Keeping time, perhaps. Two clocks in the same house.', goto: 'go' },
        { id: 'knew', who: 'entity', mood: 't', text: 'I know that it is very windy up here and I would like to go down.' },
        { id: 'go', who: 'entity', mood: 'n', entity: 'out', text: 'The stones are in the north-east. We will get there. Ideally on foot, and ideally not today.' },
      ],
    },
    v_voice: {
      title: 'The Third Voice', tone: 'unsettling', dungeon: 'v_choir', bg: 'v_choir',
      cast: { voice: { name: 'The Third Voice', sp: 'aimza3' } },
      beats: [
        { who: '*', show: { sp: 'aimza3', pose: 'bow' }, text: 'The guardian of the Choir lowers itself among the roots. The stones go on singing without it.' },
        { who: '*', text: 'Two notes you know: one bright, one deep. And under them, very faint, a third. It is not light. It is not shadow.' },
        { who: '*', entity: 'in', text: 'The Entity arrives quickly, for once.' },
        { who: 'entity', mood: 's', text: 'Don’t answer it.' },
        { who: 'you', choice: [{ text: 'Answer what?' }, { text: 'You’re being dramatic.', goto: 'drama' }] },
        { who: 'entity', mood: 'a', text: 'Exactly. Keep it that way.', goto: 'go' },
        { id: 'drama', who: 'entity', mood: 'w', text: 'I’m not being dramatic. I’m being specific.' },
        { id: 'go', who: '*', text: 'The third note fades, or hides. The stones are only two voices again, and a gap where a third has just been.' },
        { who: 'entity', mood: 'n', entity: 'out', text: 'There is a tree waiting for us. A large one. Let us go and annoy that instead.' },
      ],
    },
    v_confront: {
      title: 'Shut from the Inside', tone: 'quiet', dungeon: 'v_elderroot', bg: 'v_elderroot',
      cast: { crown: { name: 'The Forest Crown', sp: 'sylvaneer3' } },
      beats: [
        { who: '*', text: 'The door between the Elder Root’s roots stands open now. Every stream on the island runs in through it.' },
        { who: '*', entity: 'in', text: 'The Entity stops at the threshold, which he never does.' },
        { who: 'entity', mood: 't', text: 'Something in there has been guarding the place where every stream ends. I believe we have met.' },
        { who: '*', show: { sp: 'sylvaneer3', pose: 'watch' }, text: 'Far inside, antlers catch the light. Very large ones.' },
        { who: 'entity', mood: 'w', text: 'It was a fawn the last time we met. They grow. Annoyingly.' },
        { who: 'you', choice: [{ text: 'The stag from the Heartwood?' }, { text: 'Will it let us through?', goto: 'through' }] },
        { who: 'entity', mood: 'a', text: 'Older. Larger. Considerably more opinionated.', goto: 'go' },
        { id: 'through', who: 'entity', mood: 'n', text: 'It will let us try. Guard when it gathers itself. Break its bark with your specials. The usual.' },
        { id: 'go', who: 'entity', mood: 'n', entity: 'out', text: 'After you, Kind Soul. I insist. Mostly for my own sake.' },
      ],
    },
    v_crown: {
      title: 'What It Was Keeping', tone: 'unsettling', dungeon: 'v_elderroot', bg: 'v_elderroot',
      cast: { crown: { name: 'The Forest Crown', sp: 'sylvaneer3' } },
      beats: [
        { who: '*', show: { sp: 'sylvaneer3', pose: 'bow' }, text: 'The Forest Crown lowers its antlers. The roots around it loosen, slowly, like a held breath let go.' },
        { who: '*', entity: 'in', text: 'The Entity steps in beside you and watches the roots part.' },
        { who: 'entity', mood: 't', text: 'It wasn’t keeping you out. It was keeping something in.' },
        { who: 'entity', mood: 's', text: '…I’d rather we didn’t test which.' },
        { who: '*', text: 'Through the parted roots, far across the sea: black stone, and a magenta glow.' },
        { who: 'entity', mood: 'w', text: 'Obsidian Reach. Warm stone. Quiet crystals. Don’t lick anything.' },
        { who: 'you', choice: [{ text: 'Can we go there?' }, { text: 'What was being kept in?', goto: 'kept' }] },
        { who: 'entity', mood: 'n', text: 'Not yet. It is not ready for visitors, and frankly, neither am I.', goto: 'shard' },
        { id: 'kept', who: 'entity', mood: 'a', text: 'I said I would rather we didn’t test it. I meant it.' },
        { id: 'shard', who: '*', text: 'Among the roots lies a single shard of carved glass, from a panel that was smashed somewhere else. The Entity picks it up and turns it over.' },
        { who: 'entity', mood: 'c', text: '…You always did take the dramatic route.' },
        { who: '*', entity: 'out', text: 'He does not say who he means. When you look again, he is gone, and so is the shard.' },
      ],
    },

    /* ======================= Phase 19C: Obsidian Reach (the Cooling Forge) =======================
       Canon guard as above, plus: the old event was an accident neither starter intended, and a third party wanted a part
       in it. That is shown only through evidence (the mould, the crystals, the ledger, the repair order). The third party
       is never named, described or explained; the Entity never confirms anything and never looks at the chiselled shape. */
    o_arrival: {
      title: 'Warm Stone', tone: 'quiet', bg: 'o_cinder',
      cast: {},
      beats: [
        { who: '*', text: 'The skiff grinds onto black sand. It is warm underfoot, like a hearthstone an hour after the fire.' },
        { who: '*', entity: 'in', text: 'The Entity is standing on the basalt jetty, holding his coat clear of the ash.' },
        { who: 'entity', mood: 'w', text: 'Obsidian Reach. Warm stone, quiet crystals. Don’t lick anything. I say that from experience.' },
        { who: '*', text: 'Steps climb from the landing into the grey. Two sizes again, tall and small. Here the small steps are scorched black, and the tall ones are not.' },
        { who: 'you', choice: [{ text: 'Why only the small steps?' }, { text: 'Who lived here?', goto: 'who' }] },
        { who: 'entity', mood: 'a', text: 'Small feet stand closer to the fire. Ask any kitchen.', goto: 'go' },
        { id: 'who', who: 'entity', mood: 'n', text: 'Glassmakers. People and Kind Souls, working the same furnaces. The square is up the steps. It is called Glasswick, because nobody here had any imagination about names.' },
        { id: 'go', who: 'entity', mood: 'n', entity: 'out', text: 'Up the Cinder Steps, then. Ten places worth your trouble, and one forge that is still warm. I would like to know why. I would also like not to know. We shall see which wins.' },
      ],
    },
    o_kilns: {
      title: 'Two Furnaces', tone: 'quiet', dungeon: 'o_kilns', bg: 'o_kilns',
      cast: { blower: { name: 'The Glassblower', sp: 'infernox' }, soul: { name: 'An old Glasswick Kind Soul', sp: 'flaremon' } },
      beats: [
        { who: '*', show: { sp: 'infernox', pose: 'bow' }, text: 'The Glassblower lets its breath out slowly. The glow in the last kiln sinks to embers.' },
        { who: '*', text: 'Two rows of kilns. In the pale row, every rack is labelled in a neat hand. In the dark row, the same labels, in a hand with paw-prints for punctuation.' },
        { who: '*', entity: 'in', text: 'The Entity takes something from his coat: the shard of carved glass from the Elder Root. He slides it into an empty slot in a rack. It fits exactly.' },
        { who: 'entity', mood: 'n', text: 'Glass remembers where it was made. It is very boring about it.' },
        { who: 'you', choice: [{ text: 'So the shrine’s panels were made here?' }, { text: 'Why do you still have that shard?', goto: 'shard' }] },
        { who: 'entity', mood: 'a', text: 'Made here, carried there, broken somewhere in between. Glass travels badly.', goto: 'soul' },
        { id: 'shard', who: 'entity', mood: 'w', text: 'I collect things. It is a hobby. Most people find it endearing.' },
        { id: 'soul', who: 'soul', show: { sp: 'flaremon', pose: 'watch' }, text: 'An old Kind Soul has come to the kiln door, ash on its whiskers. It looks straight at the Entity. “You came back.”' },
        { who: 'entity', mood: 's', text: '…', pause: 1200 },
        { who: 'entity', mood: 'w', text: 'You have me confused with someone taller.' },
        { who: 'soul', text: '“The pale ones say the light one shut the door on us. We were here when it shut. We heard it from this side.” It goes back to its furnace without waiting for an answer.' },
        { who: 'entity', mood: 'n', entity: 'out', text: 'Glasswick’s Kind Souls have long memories and short tempers. I recommend you do not ask them about doors. I recommend that to everyone.' },
      ],
    },
    o_mould: {
      title: 'The Mould', tone: 'melancholy', dungeon: 'o_gallery', bg: 'o_gallery',
      cast: { warden: { name: 'The Dusk Warden', sp: 'eclipsar' } },
      beats: [
        { who: '*', show: { sp: 'eclipsar', pose: 'bow' }, text: 'The Dusk Warden folds into its own reflection and is gone. Every mirror in the hall goes back to showing only you.' },
        { who: '*', text: 'At the end of the gallery, the covered shape. The cloth slides off at a touch: not a mirror, but a mould. The mould for the Twin Shrine’s broken panel, whole.' },
        { who: '*', pause: 900, text: 'It shows a door. The two Keepers are holding it shut, the light one and the dark one, shoulder to shoulder. From the same side.' },
        { who: '*', text: 'Beside them there was a third shape once. Someone has chiselled it out, carefully, down to the bare glass. Only its edge is left.' },
        { who: '*', text: 'Your companion presses its face to the glass, very close to the Keeper that looks like it.' },
        { who: '*', entity: 'in', text: 'The Entity is beside you. He looks at the two Keepers for a long time.' },
        { who: 'entity', mood: 'n', text: 'Moulds lie less than panels. Not much less.' },
        { who: 'you', choice: [{ text: 'They were on the same side.' }, { text: 'Who was the third one?', goto: 'third' }] },
        { who: 'entity', mood: 't', text: 'So it seems. The pale side says one thing and the dark side says another, and the glass says neither. Glass does that.', goto: 'end' },
        { id: 'third', who: 'entity', mood: 'a', text: 'Somebody who did not want to be remembered. It happens. Leave it.' },
        { id: 'end', who: '*', text: 'He does not look at the chiselled edge. Not once.' },
        { who: 'entity', mood: 'c', entity: 'out', text: 'Put the cloth back, please. Some things should be allowed to stay under cloth.' },
      ],
    },
    o_crystals: {
      title: 'What the Crystals Kept', tone: 'unsettling', dungeon: 'o_hollows', bg: 'o_hollows',
      cast: { lantern: { name: 'The Lantern Below', sp: 'lumi3' } },
      beats: [
        { who: '*', show: { sp: 'lumi3', pose: 'bow' }, text: 'The Lantern Below dims. In the quiet, the crystals begin to play back something they have kept for a very long time.' },
        { who: '*', pause: 900, text: 'A great sound, like a bell the size of a hill. Then a crack, very clear, like glass that has cooled wrong.' },
        { who: '*', text: 'Two voices, one bright and one deep, calling to each other. Not angry. Frightened. Each calling the other’s name, though the crystals have worn the names away.' },
        { who: '*', entity: 'in', text: 'The Entity is there, and his hands are over your companion’s ears. He takes them away at once, as if he had never put them there.' },
        { who: '*', text: 'Under the voices, a long hum begins. It is not light. It is not shadow. It goes on for a long time after the voices stop.' },
        { who: 'you', choice: [{ text: 'They didn’t mean for it to happen.' }, { text: 'What was that hum?', goto: 'hum' }] },
        { who: 'entity', mood: 't', text: 'Nobody calls a name like that on purpose.', goto: 'end' },
        { id: 'hum', who: 'entity', mood: 's', text: 'Crystals. They hum. That is all they do. I would prefer we agreed on that.' },
        { id: 'end', who: 'entity', mood: 'n', entity: 'out', text: 'There is an orchard to the west. Burned, and still flowering. Let us go and be confused by that instead.' },
      ],
    },
    o_ledger: {
      title: 'The Ledger', tone: 'quiet', dungeon: 'o_bellows', bg: 'o_bellows',
      cast: { wind: { name: 'The Bellows Wind', sp: 'stormbringer' } },
      beats: [
        { who: '*', show: { sp: 'stormbringer', pose: 'bow' }, text: 'The Bellows Wind sinks into the leather, and the great lungs breathe out, very slowly, for the last time today.' },
        { who: '*', text: 'Behind the last lung, the little office. A desk, a chair, and the forge ledger, left open, its pages stiff with ash.' },
        { who: '*', text: 'Orders for nails, hinges, glass, more glass. Then one entry, written larger than the rest:' },
        { who: '*', pause: 1200, text: '“Commission: one door, two keys. Paid in full.”' },
        { who: '*', pause: 1400, text: 'Below it, in a different hand, the ink pressed hard into the page: “Third key: refused.”' },
        { who: '*', entity: 'in', text: 'The Entity reads it over your shoulder. He does not touch the book.' },
        { who: 'entity', mood: 'n', text: 'Ledgers. The only honest thing anyone ever wrote, and nobody reads them.' },
        { who: 'you', choice: [{ text: 'Who wanted a third key?' }, { text: 'Two keys for the two Keepers?', goto: 'keys' }] },
        { who: 'entity', mood: 'a', text: 'Someone who was told no. The ledger does not say who. Ledgers are discreet. I admire that in a book.', goto: 'end' },
        { id: 'keys', who: 'entity', mood: 't', text: 'Two keys, two keepers, one door. It is the sort of arithmetic that holds until somebody wants to add.' },
        { id: 'end', who: 'entity', mood: 'c', entity: 'out', text: 'Leave it open at that page. Somebody may want to read it one day. It will not be me.' },
      ],
    },
    o_confront: {
      title: 'Still Warm', tone: 'quiet', dungeon: 'o_forge', bg: 'o_forge',
      cast: { heart: { name: 'The Forge Heart', sp: 'pyrocore' } },
      beats: [
        { who: '*', text: 'The iron doors of the Great Forge stand open. Inside, everything is cold: anvils, chains, the long benches. Everything except the core.' },
        { who: '*', show: { sp: 'pyrocore', pose: 'watch' }, text: 'In the core, something vast turns over, glowing white at the seams. It beats, slowly, like a heart that has been told to keep going and never told to stop.' },
        { who: '*', entity: 'in', text: 'The Entity stops on the threshold. He does not like thresholds. He likes this one less than most.' },
        { who: 'entity', mood: 't', text: 'It is keeping the fire in for a job nobody finished. Admirable. Inconvenient.' },
        { who: 'you', choice: [{ text: 'What job?' }, { text: 'How do we stop it?', goto: 'how' }] },
        { who: 'entity', mood: 'a', text: 'Ask it. Politely, and from behind something solid.', goto: 'go' },
        { id: 'how', who: 'entity', mood: 'n', text: 'Its shell cracks under your specials. When the core flares white, guard. Water helps. Everything helps a little, except standing still.' },
        { id: 'go', who: 'entity', mood: 'n', entity: 'out', text: 'After you, Kind Soul. It is the custom. I invented it just now.' },
      ],
    },
    o_heart: {
      title: 'Three Clocks', tone: 'unsettling', dungeon: 'o_forge', bg: 'o_forge',
      cast: { heart: { name: 'The Forge Heart', sp: 'pyrocore' } },
      beats: [
        { who: '*', show: { sp: 'pyrocore', pose: 'bow' }, text: 'The Forge Heart settles. Its glow sinks from white to gold to the dull red of a fire banked for the night.' },
        { who: '*', text: 'In the core’s cradle lies one last order, on a plate of iron so it would not burn: “Repair: one door. Requested by both keys.” The rest of the plate is blank. Nobody came back to finish it.' },
        { who: '*', entity: 'in', text: 'The Entity reads it twice. The second time, his mouth goes thin.' },
        { who: 'entity', mood: 't', text: 'Both of them. Together. Asking for the same thing.' },
        { who: 'you', choice: [{ text: 'So it was an accident.' }, { text: 'Why was it never finished?', goto: 'why' }] },
        { who: 'entity', mood: 'a', text: 'Nobody orders a repair for something they meant to break. That much even I can work out.', goto: 'clocks' },
        { id: 'why', who: 'entity', mood: 's', text: 'Because somebody refused to be refused. Don’t ask me who. I don’t know. I would also prefer not to.' },
        { id: 'clocks', who: '*', pause: 900, text: 'The core gives one last beat. Far across the sea, the Dormant Spire pulses. The standing stones of the Choir hum. All three keep exactly the same time.' },
        { who: '*', text: 'Three clocks in three houses. And high above the clouds, on an island you have not seen yet, something old turns slowly to watch.' },
        { who: 'entity', mood: 'n', text: 'The sky has always had more to say. I would prefer it said it to someone else.' },
        { who: '*', entity: 'out', text: 'This time he takes nothing. He leaves the ledger open at the refused key, and the plate where it lies.' },
      ],
    },
  };
  // Dungeons without a scene get a short line from the Entity after their first clear (toast). Keyed by dungeon id.
  SC.after = {
    drownedsteps: 'The steps go further down than the water does. I’d stop counting them, if I were you. I did.',
    coldkiln: 'Someone kept that kiln warm for a very long time. I hope they were paid. Nobody ever is.',
    lanternorchard: 'Lanterns in straight rows. Somebody liked things tidy. I approve, against my better judgement.',
    windstair: 'The wind on that stair is new. The stair is not. Interesting, the things that turn up together.',
    // Phase 18C: the Verdant Wilds
    v_mossgate: 'Steps in two sizes. Somebody thought about who would be climbing them. That is rarer than it should be.',
    v_aqueduct: 'Plumbing that still works after an age. I would like to meet the builder. I would like to ask about my sink.',
    v_spore: 'Spores remember things. So do I. Neither of us is obliged to share.',
    v_glow: 'Two kinds of lantern, side by side, and then only one. Do not ask me to read anything into that. I will refuse.',
    v_moonwell: 'I am not going down there. Do not take it personally. The reflection and I have an understanding.',
    // Phase 19C: Obsidian Reach
    o_cinder: 'Scorched small steps and clean tall ones. Somebody stood closer to the fire than the rest. Somebody always does.',
    o_rookery: 'Nests woven from both kinds of glass. Nobody told the birds they were supposed to choose.',
    o_quench: 'A drained pool, and the outline of one great round plate, cracked across. It cooled wrong. Things do, if you hurry them.',
    o_seams: 'Pale ore, dark ore, sorted by someone very tidy. I trust tidy people. They are too busy to plot.',
    o_orchard: 'Planted from both ends, by the look of the rows. They met in the middle. That part rarely happens.',
  };
  SC.get = (id) => SC.list[id] || null;
  // Estimated playing time in seconds at the normal text speed (typing plus reading), used by tests and the editor.
  SC.estimate = function (id) {
    const sc = SC.get(id); if (!sc) return 0;
    let ms = 0, i = 0, guard = 0;
    const idx = (k) => sc.beats.findIndex((b) => b.id === k);
    while (i < sc.beats.length && guard++ < 200) {
      const b = sc.beats[i], text = b.choice ? b.choice[0].text : b.text || '';
      ms += text.length * 18 + 900 + text.length * 22 + (b.pause || 0);
      i = b.goto ? idx(b.goto) : i + 1;
      if (b.choice && b.choice[0].goto) i = idx(b.choice[0].goto);
    }
    return Math.round(ms / 1000);
  };
})(typeof window !== 'undefined' ? window : globalThis);
