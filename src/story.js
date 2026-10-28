/* Aminas — The Entity's voice: dialogue pools, scripted scenes, and event -> beat mapping. */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = A.Data;
  const T = (A.Story = {});

  // Mood codes: n normal, t tired, s shaken, a looking away, w wry/amused, c eyes closed. '*' = stage direction.
  const L = (m, x) => [m, x];

  /* ---------- Opening cards (lore) ---------- */
  T.introCards = [
    'Long ago, the forces of Light and Dark clashed across the boundaries between worlds.',
    'The boundaries weakened. And through the cracks came living souls from another world.',
    'They were called Aminas. Humans were frightened of them, and misunderstood them.',
    'But trust grew slowly. People who had never agreed on anything began to share meals, and stories, and burdens with the Aminas beside them.',
    'Peace did not arrive by magic. It arrived because people chose it, over and over.',
    'That age is history now. And the boundaries are thinning again, in places that should have stayed undisturbed.',
  ];

  /* ---------- Scripted scenes ---------- */
  T.scripts = {
    arrival: [
      L('*', 'A ruined island. Pale light. Somewhere, the sea is sighing.'),
      L('t', 'Hm. You’re standing in the middle of my island.'),
      L('t', 'I’d say that’s rude, but you weren’t here a moment ago, so I’m not sure what you are.'),
      L('a', 'The grass under your feet is glowing. Faintly. In a ring. That’s new.'),
      L('t', 'Never mind. I am The Entity. I look after this place. Badly, and for a very long time.'),
      L('t', 'The island was wrecked in the World Resonance. Islands in the wrong places. Habitats where habitats had no business being. Kind Souls wandering about where they shouldn’t have been.'),
      L('w', 'Overtime. An unbelievable amount of overtime.'),
      L('n', 'It needs restoring. Ruins repaired. Homes rebuilt. The Kind Souls that belong here found and looked after. And you seem to be available.'),
      L('n', 'Aminas, to be exact. That’s what we call them. Kind Souls, if you want to be polite, and I do. They deserve it.'),
      L('t', 'Before anything else, you’ll need a companion. Two small candidates, at the moment. I’ve been told not to play favourites.'),
    ],
    starterChosen: {
      lumifern: [
        L('n', 'Lumifern. A gentle little thing. Holds sunlight in its leaves like a miser.'),
        L('t', 'Light, mind. Not “good”. Light has its own list of mistakes, and I’ve read most of them.'),
        L('n', 'Right. Restore the Sunlit Hollow. It’s the ruin in the middle. It would make a fine home. I’ll mark it for you.'),
      ],
      umbrit: [
        L('n', 'Umbrit. Small, dark, suspicious of everyone. We’ll get along fine.'),
        L('t', 'Dark, mind. Not “bad”. Dark has its own list of virtues, and I’ve read most of them.'),
        L('n', 'Right. Restore the Sunlit Hollow. It’s the ruin in the middle. Yes, it’s sunny. It’ll cope. I’ll mark it for you.'),
      ],
    },
    firstRestore: [
      L('n', 'Another job completed. Excellent. Perhaps the island will stop falling apart for five minutes.'),
      L('t', 'Feed your companion. Eat, grow, repeat. Civilisation in a nutshell.'),
      L('w', 'You’re almost ready. For the very first step. Well done, I suppose.'),
    ],
    r1: [
      L('*', 'The ring of stones on the east shore hums. A thin, clear note. It does not sound like the sea.'),
      L('s', 'That’s… no. Stones don’t sing. They never did.'),
      L('a', 'It’s resonance. The old sort. Hm.'),
      L('*', 'A creature steps out of the shimmer. Crystal-eared, humming, curious.'),
      L('n', 'Resonyx. A new one. Don’t let it hum at you too long. It gets in your head.'),
      L('t', 'Disturbances. Spreading. Typical.'),
      L('c', 'Light and Dark. Always fighting. Always certain they were right.'),
      L('a', 'Whatever it was they were all quietly afraid of, it was not a thing you’d want humming on your shore.'),
      L('n', 'Forget I said that. The Reliquary Gate is next. And a bit more level on your companions. You’re almost ready.'),
    ],
    gateFirst: [
      L('n', 'The Reliquary. An old vault of the sanctuary. The disturbance is down there somewhere.'),
      L('t', 'Ten rooms of overgrown guardians, and one very large staircase with opinions.'),
      L('n', 'Bring up to three Kind Souls. Mind the elements. Fire loves leaves. Water loves fire. Leaves love water. It’s a circle. Everything is.'),
      L('w', 'Don’t get cocky in my presence.'),
    ],
    dungeonWinFirst: [
      L('n', 'Not bad. Not bad at all. Don’t look so pleased with yourself.'),
      L('*', 'The Sentinel kneels, and the vines on its shoulders loosen. Behind it, something deep in the island answers: a long, low chime.'),
      L('s', 'Hm. That wasn’t the Reliquary.'),
      L('t', 'Go home. Rest. Something above the island just woke up, and I’d like to finish being surprised in private.'),
    ],
    r2: [
      L('*', 'On the island, the broken spire in the north is glowing. Slowly. Like an eye opening.'),
      L('n', 'The Dormant Spire. It has been dormant for quite a while. Apparently it had an opinion about your dungeon.'),
      L('t', 'Sky changed. Winds changed. A drifting island turned up where an island shouldn’t be. And somebody else’s Kind Soul has wandered in, looking for you.'),
      L('n', 'Hatchery paths are open. The old pairings. Light and Dark in the same shell, if you’re brave.'),
      L('s', 'Also something stood up in the middle of the island that I’m certain wasn’t there this morning.'),
      L('a', 'Go and look at it. I’ll be… here. Doing paperwork.'),
    ],
    stone: [
      L('*', 'A pale standing stone. No carvings. No moss. As you step close, it hums, in a pitch you can almost feel in your teeth.'),
      L('s', '…Where did that come from.'),
      L('s', 'That wasn’t — No. That’s not possible. That stone doesn’t belong to any survey I ever filed. And I filed all of them.'),
      L('a', 'It’s humming. Only when you stand there.'),
      L('n', 'Coincidence. Stones hum. It’s a known stone behaviour.'),
      L('c', '…'),
      L('t', 'Stop touching it.'),
      L('n', 'Whatever it was, it’s not today’s problem. Today’s problem is that you have a perfectly good sanctuary and you’re standing in it staring at a rock.'),
      L('a', 'Go and feed something.'),
    ],
    arcDone: [
      L('*', 'The island is bright. The ruins are standing. The Kind Souls are home.'),
      L('n', 'A decent result. I suppose miracles do happen.'),
      L('t', 'You restored an island. You found its Kind Souls. You put a disturbance to rest. That is, objectively, a good week.'),
      L('w', 'You’re almost ready.'),
      L('n', 'For what? Ask me again later. Or don’t.'),
      L('*', 'Chapter One: complete. The sanctuary is yours to keep growing. More waits beyond the Hollow Veil.'),
    ],
    evolve: (name) => [
      L('n', name + ' just changed shape. In my day that took a decade and an apology.'),
      L('w', 'Well done. Try not to let it go to your head. Either of you.'),
    ],
  };

  /* ---------- Slips about the player (by Caretaker rank) ---------- */
  T.slips = {
    2: [L('n', 'Mm.'), L('s', 'That’s peculiar. I’ve seen that sort of resonance before. No, not from an Amina. From—'), L('*', 'The Entity falls silent.'), L('t', 'Forget it. Your habitat needs attention.')],
    3: [L('a', 'Tell me something, player. Have you ever felt as though you’ve arrived somewhere you were never meant to find?'), L('*', 'The Entity pauses.'), L('t', 'Never mind. Old habit. Asking questions I don’t particularly want answered.')],
    4: [L('n', 'Your reading is climbing faster than it should. Not that I read readings.'), L('w', 'Almost. There’s a rather important difference between “almost” and “ready”.')],
    5: [L('a', 'You hold the island together a bit more than you think. I noticed that. I’d like to un-notice it.'), L('t', 'Don’t look at me like that. I’m not worried. I’m… professionally attentive.')],
    6: [L('s', 'You walked through the old gate without a scratch. Gates don’t do that. Not for strangers.'), L('t', 'Perhaps you’re not one. A stranger. Perhaps that’s the problem.')],
    8: [L('c', 'You know, the first time I saw you, the grass lit up in a ring.'), L('a', 'I told myself it was the tide.'), L('t', 'Tides don’t come uphill.')],
  };

  /* ---------- Short ambient lines (toasts) ---------- */
  T.pools = {
    levelup: [
      'Well, look at you. Getting stronger already. Try not to let it go to your head.',
      '{n} grows. Slowly, but with dignity. I’ve seen worse.',
      'A decent result. I suppose miracles do happen.',
      'Level up. Remarkable. Please remain humble.',
      'Another level. Don’t get cocky in my presence.',
      'Stronger. Good. The world is not getting any friendlier.',
      '{n} is growing. Mind that it doesn’t outgrow your manners.',
    ],
    levelup5: ['Level five. Hm. Almost ready, then. For something. For a first dungeon, perhaps.'],
    levelup10: ['Level ten. A stage I used to find impressive. Now I just find it expected. Congratulations, that’s sarcasm.'],
    rank: [
      'Caretaker rank up. Your title is getting longer. Your workload will, I assure you, follow.',
      'Rank improved. The paperwork multiplies accordingly.',
      'You’re getting better at this. Marvellous. Don’t tell the island.',
    ],
    restore: [
      'Another job completed. Excellent. Perhaps the island will stop falling apart for five minutes.',
      'Restored. It’ll hold. For a bit.',
      'A ruin fewer. A responsibility more. That’s how it works.',
      'Good. Wash your hands. Everything here is two thousand years old.',
    ],
    hollow: ['The Hollow is a home again. Look. The Kind Soul is already napping on the good spot.'],
    tidegate: ['The Tide Gate. Water’s coming in properly again. Mind the east shore. It’s humming.'],
    moonshrine: ['The Moon Shrine. Dark and Light both used to visit. Nobody ever wrote down who arrived first.'],
    hatchery: ['The Hatchery. Warm shells and old magic. Please don’t name them all.'],
    reliquarygate: ['The Gate is open. The vines didn’t even complain. That worries me a little.'],
    discover: [
      'A new Kind Soul. Congratulations. Remember, they’re not a collection. They’re companions.',
      'Hm. Another one. The sanctuary is getting crowded. Good.',
      'That one has been waiting for someone to ask nicely.',
      'Welcome, small one. You’re in good company. Mostly.',
    ],
    feed: [
      'Eating. Marvellous. Civilisation at last.',
      'You do know they’ll eat anything you give them, don’t you? It’s a character flaw. A charming one.',
      'Feed it, yes. And don’t forget to feed yourself. I’m only saying.',
      'A snack. Yes. That’s how we solve most problems.',
    ],
    nofood: [
      'No food. A tragedy. Explore, collect, restore. The island will provide eventually.',
      'The larder is empty. Not my fault. Possibly yours.',
      'Hungry creatures and an empty bowl. That, my friend, is called a lesson.',
    ],
    missionDone: [
      'Another job done. Collect your reward. Quickly, before I change my mind.',
      'Good. Tick it off the list. Don’t look so pleased, there are more.',
      'Task completed. Not bad. I’d say you’re almost ready, but then I always say that.',
      'Done. Your reward is waiting in Tasks.',
    ],
    almost: [
      'You’re almost ready.',
      'There is always room for improvement.',
      'Don’t get cocky in my presence.',
      'Almost. There’s a rather important difference.',
      'A decent result. I suppose miracles do happen.',
      'You think you’re ready? How charming.',
    ],
    battleWin: [
      'Not bad. Not bad at all. Don’t look so pleased with yourself.',
      'The thing about victory: it’s very good at making you forget the stairs.',
      'Good. Keep going. Slowly. They’re not going anywhere.',
    ],
    dungeonLose: [
      'Well. That didn’t go according to plan. Rest, feed, return. I’ll pretend I wasn’t watching.',
      'A setback. Everyone has them. I have had several thousand.',
      'Back to the sanctuary. The dungeon isn’t going anywhere. It has had a lot of practice at that.',
    ],
    eggStart: ['An egg. Now we wait. Patience is a skill, apparently.', 'Warm it, keep it company, and don’t ask what’s in it. It doesn’t like being asked.'],
    hatched: ['Oh. Hello, small one. Well done. A new life, and you only had to pay for it with a little food.', 'There. That’s a Kind Soul. Look at it. Aren’t they ridiculous?'],
    explore: ['Quiet out there. Good. Quiet is underrated.', 'Wander as much as you like. The island is large and mostly harmless.'],
    idle: [
      'Hm. You’re back. Good. The island was getting suspiciously calm.',
      'The sanctuary looks better with you on it. I’m not saying that out loud.',
      'Don’t mind me. I’m just watching. It’s a hobby.',
      'Something needs doing. It always does.',
    ],
    arrivalMark: [
      'That mark? Wasn’t there yesterday. Neither were you.',
      'Mm. A ring in the grass. It brightens when you’re near. Funny, that.',
      'The mark is still there. I keep hoping it will go away. It keeps not doing that.',
    ],
    future: ['Room for more homes here. Eventually. Don’t look at me. I’m just the commentary.', 'An empty plot. Plenty of those. Plenty of time. Probably.'],
    zero: ['Hm.'],
  };

  /* ---------- Ask The Entity ---------- */
  // Each topic: first-time script (optional) and a repeatable pool. gate(st) hides a topic until relevant.
  T.ask = {
    strange: { label: 'A strange event', pool: [
      'Ah. That. Yes, I remember the paperwork. Terrible business. A great deal of overtime.',
      'Strange things? Every day. The trick is deciding which ones are your problem. Usually it’s all of them.',
      'The island has been hiccuping since the Resonance. Don’t take it personally. It certainly doesn’t.',
      'If it hums, glows, or points at you, it’s probably not an accident. If it also smells of cabbage, it’s probably a Gloomole.',
    ] },
    resonance: { label: 'World Resonance', first: [
      L('n', 'World Resonance? Hm. Yes. That was a big mess.'),
      L('t', 'Islands in the wrong places. Habitats where habitats had no business being. Kind Souls wandering about where they shouldn’t have been. Took an age to sort it all out.'),
      L('a', 'Overtime. An unbelievable amount of overtime.'),
    ], pool: [
      'The Resonance happened. I was there. I wouldn’t call it my best day. Or the world’s.',
      'It wasn’t one event. It was a lot of small ones in a very short time. The sort of thing that looks like an accident from far enough away.',
      'You want an explanation. I have a very large pile of reports. None of them agree. That should tell you something.',
    ] },
    lightdark: { label: 'Light and Dark', first: [
      L('n', 'Light and Dark. Always fighting. Always certain they were right. The strongest of them could tear the sky apart just to prove a point.'),
      L('*', 'The Entity pauses.'),
      L('a', 'Funny thing, though. There was one thing neither side would talk about.'),
      L('*', 'Silence.'),
      L('t', 'Ah, never mind. You’ll have enough trouble without digging up old rubbish.'),
    ], pool: [
      'Light isn’t good. Dark isn’t bad. They’re just two sides of the same long argument. Stubborn, both.',
      'Both had their heroes. Both had their villains. Both had their reasons. That’s what makes history so tiresome.',
      'They agreed on one thing eventually. I won’t say what. Not today.',
    ] },
    aminas: { label: 'My Aminas', pool: [
      'That one? A fine Kind Soul. Stubborn, mind you. But then, most of the good ones are.',
      'They’re not pets. They’re not tools. They’re people, only smaller and with better taste in food.',
      'Every Kind Soul has an opinion on how you’re doing. Learn to read them. It’s more useful than any manual.',
      'They do remember. Everything you’ve ever done for them. Yes, including the snacks.',
    ] },
    island: { label: 'The island', pool: [
      'The island is a sanctuary. It was built for Kind Souls who had nowhere else to go. It will do so again, with your help.',
      'The ruins aren’t decorative. Each one was a promise somebody made. Mend the promises. The rest follows.',
      'There’s a spire in the north. Dormant, for now. Don’t poke it. Or do. I’m not supervising.',
    ] },
    ready: { label: 'Am I ready?', pool: [
      'You’re almost ready.',
      'Ready? How charming. Do you know what for? No? Excellent. Neither do I.',
      'There is always room for improvement. Mostly yours, occasionally mine.',
      'Almost. There’s a rather important difference.',
      'You’ve improved. I’d say more, but praise has a way of ruining people.',
    ] },
    you: { label: 'Who am I?', pool: [
      'You? A stranger on my island. Most welcome. Mostly.',
      'I wish I could tell you. It would save me a lot of guesswork.',
      'You’re here. That’s the point. The rest is paperwork.',
      'I don’t know. That is not a thing I enjoy saying, so please don’t make me say it again.',
    ], slipAfter: 3 },
    it: { label: 'The thing neither side named', gate: (st) => !!st.flags.r1, pool: [
      'It. That something. The thing neither side named. No. We’re not doing this.',
      'Whatever it was. Even the strongest of them wouldn’t discuss it. Take that however you like.',
      'You’re clever. Don’t be clever about that. Ask me about the Gate.',
      'Something even they wouldn’t discuss. I’d like to keep it that way.',
    ] },
  };

  /* ---------- Picking & event mapping ---------- */
  T.pick = function (st, ctx, vars) {
    const pool = T.pools[ctx] || T.pools.zero;
    const used = (st.story.used[ctx] = st.story.used[ctx] || []);
    let idx = [];
    for (let i = 0; i < pool.length; i++) if (used.indexOf(i) < 0) idx.push(i);
    if (!idx.length) { used.length = 0; idx = pool.map((_, i) => i); }
    const i = idx[Math.floor(A.Rules.rng() * idx.length)];
    used.push(i); if (used.length > Math.max(1, Math.floor(pool.length / 2))) used.shift();
    return fill(pool[i], vars);
  };
  function fill(t, v) { v = v || {}; return t.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)); }
  T.fill = fill;

  T.askLines = function (st, topic) {
    const t = T.ask[topic]; if (!t) return { lines: [[ 'n', '…' ]] };
    st.story.asked[topic] = (st.story.asked[topic] || 0) + 1;
    if (t.first && st.story.asked[topic] === 1) return { lines: t.first };
    const text = T.pick(st, 'ask_' + topic, {}) ;
    return { text };
  };
  // ask pools are registered as pick pools
  Object.keys(T.ask).forEach((k) => { T.pools['ask_' + k] = T.ask[k].pool; });

  T.speciesNote = (spId) => D.SPECIES[spId].ent;
  T.pools.built = ['It even looks like it meant to be there.', 'Sturdy. Mostly.', 'The Aminas are already arguing over who gets to sit on it.', 'Another thing that wasn’t here yesterday. Good.'];
  T.pools.upgraded = ['Bigger. Better. Slightly shinier.', 'Improvements! My favourite kind of change. The kind that doesn’t bite.', 'You’re getting good at this. Don’t let it go to your head.'];
  T.islandHello = {
    verdant: 'The Verdant Wilds. Everything here grows a little too eagerly. Mind the roots, they gossip.',
    obsidian: 'Obsidian Reach. Warm stone, quiet crystals. Don’t lick anything. I say that from experience.',
    celestial: 'The Celestial Crown. Above the clouds, where the old observatory still watches. It was watching before I was. Let that sink in.',
  };
  T.scripts.island = (iid) => ({
    verdant: [['w', 'You did it. The Verdant Wilds are yours to look after now.'], ['n', 'Streams, roots, mossy old stones. The Aminas there have been waiting a long time for someone to notice them.'], ['t', 'Same rules as home: clear a little, build a little, and don’t trip over anything that glows.']],
    obsidian: [['s', 'Obsidian Reach. I didn’t think you’d get here so soon.'], ['n', 'Dark stone isn’t sad stone. It just keeps its warmth inside. Like some people. Like some Entities.'], ['t', 'Build carefully. The crystals hum when they’re pleased. They’re rarely pleased.']],
    celestial: [['a', 'The Celestial Crown…'], ['n', 'Up here the stars feel close enough to touch. Please don’t. They’re older than they look.'], ['w', 'This is the furthest island I can show you. For now. The sky has always had more to say.']],
  }[iid] || [['n', 'A new island. How exciting. Try not to lose it.']]);

  // Convert a rules event into 0..n UI beats: {type:'toast', text, mood} | {type:'script', lines, key}
  T.beats = function (st, ev) {
    const d = ev.data, out = [];
    const toast = (text, mood) => out.push({ type: 'toast', text, mood: mood || 'n' });
    const script = (lines, key) => out.push({ type: 'script', lines, key });
    const once = (key) => { if (st.story.used['once_' + key]) return false; st.story.used['once_' + key] = [1]; return true; };
    switch (ev.name) {
      case 'creatureLevel': {
        const act = A.Rules.active(st);
        if (act && d.uid === act.uid) {
          if (d.to === 5 && once('lv5')) toast(T.pick(st, 'levelup5'), 'w');
          else if (d.to === 10 && once('lv10')) toast(T.pick(st, 'levelup10'), 't');
          else toast(T.pick(st, 'levelup', { n: D.SPECIES[d.sp].name }), 'w');
        }
        break;
      }
      case 'rankUp':
        if (T.slips[d.rank] && once('slip' + d.rank)) script(T.slips[d.rank], 'slip' + d.rank);
        else toast(T.pick(st, 'rank'), 'w');
        break;
      case 'restored':
        if (d.id === 'hollow' && once('firstRestore')) script(T.scripts.firstRestore, 'firstRestore');
        else if (T.pools[d.id]) toast(T.pools[d.id][0], 'n');
        else toast(T.pick(st, 'restore'), 'n');
        if (d.id === 'reliquarygate' && once('gateFirst')) script(T.scripts.gateFirst, 'gateFirst');
        break;
      case 'discover':
        if (st.starter && d.sp !== st.starter) { toast(T.pick(st, 'discover') + ' ' + T.speciesNote(d.sp), 'n'); }
        break;
      case 'missionReady': toast(T.pick(st, 'missionDone'), 'w'); break;
      case 'feedEmpty': toast(T.pick(st, 'nofood'), 't'); break;
      case 'fed': if (A.Rules.rng() < 0.18) toast(T.pick(st, 'feed'), 'w'); break;
      case 'eggStart': toast(T.pick(st, 'eggStart'), 'n'); break;
      case 'hatched': toast(T.pick(st, 'hatched') + ' ' + T.speciesNote(d.sp), 'w'); break;
      case 'evolve': script(T.scripts.evolve(D.SPECIES[d.to].name), 'evolve'); break;
      case 'dungeonWin':
        // the Reliquary keeps its own first-clear scene; dungeons with a story scene play it from the result screen
        if (d.d === 'reliquary' && d.first && once('dwin')) script(T.scripts.dungeonWinFirst, 'dwin');
        else if (!(d.first && D.DUNGEONS[d.d] && (D.DUNGEONS[d.d].scene || (A.Scenes && A.Scenes.after[d.d])))) toast(T.pick(st, 'battleWin'), 'w');
        break;
      case 'lore': break; // shown on the result screen and in the Journal
      case 'islandBossDefeated': break; // the Island Boss scene covers it
      case 'dungeonLose': toast(T.pick(st, 'dungeonLose'), 't'); break;
      case 'resonance':
        if (d.id === 'r1') script(T.scripts.r1, 'r1');
        if (d.id === 'r2') script(T.scripts.r2, 'r2');
        if (d.id === 'stone') script(T.scripts.stone, 'stone');
        break;
      case 'arcDone': script(T.scripts.arcDone, 'arcDone'); break;
      case 'built': {
        const b = D.BUILDINGS[d.type];
        if (once('firstBuild')) script([['w', 'Oh. You built something. On purpose. With your own hands.'], ['n', 'The island likes it, I think. It’s hard to tell with islands. They mostly just sit there.'], ['t', 'Build more. Move things. Store what you don’t need. It’s your sanctuary, not a museum.']], 'firstBuild');
        else toast(b.name + ' is finished. ' + T.pick(st, 'built'), 'w');
        break;
      }
      case 'upgraded': toast(D.BUILDINGS[d.type].name + ' reached level ' + d.level + '. ' + T.pick(st, 'upgraded'), 'w'); break;
      case 'obstacleRemoved': if (once('firstClear')) toast('Cleared. See? Space. Space is the beginning of every good idea. And most bad ones.', 'w'); break;
      case 'islandUnlocked': script(T.scripts.island(d.island), 'island_' + d.island); break;
      case 'traveled': if (d.changed && d.island !== 'starter' && once('visit_' + d.island)) toast(T.islandHello[d.island], 'n'); break;
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
