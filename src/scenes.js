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
  };
  // Dungeons without a scene get a short line from the Entity after their first clear (toast). Keyed by dungeon id.
  SC.after = {
    drownedsteps: 'The steps go further down than the water does. I’d stop counting them, if I were you. I did.',
    coldkiln: 'Someone kept that kiln warm for a very long time. I hope they were paid. Nobody ever is.',
    lanternorchard: 'Lanterns in straight rows. Somebody liked things tidy. I approve, against my better judgement.',
    windstair: 'The wind on that stair is new. The stair is not. Interesting, the things that turn up together.',
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
