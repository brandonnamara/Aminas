/* Aminas — Phase 20C: the Celestial Crown campaign and the end of the main story (Ending A, the Keepers' Door).
   Story scenes for the island (arrival, the dungeons' scenes, the door, the ending), the grief beat at the observatory's
   empty lens mount, the optional Watcher's Lens moment, the campaign-completion state, and the island's quests.
   The dungeons themselves are in campaign-data.js; the island's places and rules in celestial20b.js.
   Canon guard (approved Ending A):
   - resolved: the door was the Crossing; the two Keepers held it together, one from each side, and it took both keys to
     open or shut it; it cracked when it was forced from outside by someone who had been refused a key; each side felt
     the other give way and blamed it, and each was half right; the player, who belongs to neither side, finishes the
     repair the two keys asked for, with both starter lines at the door;
   - kept open: who wanted the third key, what lies beyond the door, the Emergence, where Starter Island came from, what
     the Entity is. The Entity calls Aminas Kind Souls, stays dry, and grieves in one line only:
     “I left that here. I meant to come back.” (exact; the lens mount scene). The Twin Shrine gift is never required. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, W = A.World, SC = A.Scenes, C = R.C20;
  const now = () => (R.now ? R.now() : Date.now());

  /* ---------- the two starter lines, in the player's own words ----------
     Scenes name the player's starter line ("your Aurelith") and the other line. A scene marked dynamic is resolved
     against the current save when it plays: {mine} the player's starter-line Amina (its current form's name), {other}
     the other line's first form, and beats marked if: 'otherOwned' / 'otherMissing' show only in that case. */
  const LINE = { lumifern: 'lumifern', umbrit: 'umbrit' };
  const lineOf = (sp) => { const s = D.SPECIES[sp]; return s && s.line; };
  C.starterLines = function (st) {
    const mine = (st && LINE[st.starter]) || 'lumifern', other = mine === 'lumifern' ? 'umbrit' : 'lumifern';
    const best = (line) => (st && st.aminas ? st.aminas.filter((a) => lineOf(a.sp) === lineOf(line)).sort((a, b) => b.lv - a.lv)[0] : null);
    const m = best(mine), o = best(other);
    return { mine, other, mineSp: m ? m.sp : mine, otherSp: o ? o.sp : other, mineName: D.SPECIES[m ? m.sp : mine].name, otherName: D.SPECIES[o ? o.sp : other].name, otherOwned: !!o, otherLight: other === 'lumifern' };
  };
  const resolve = (sc, st) => {
    const L = C.starterLines(st), sub = (t) => (typeof t === 'string' ? t.replace(/\{mine\}/g, L.mineName).replace(/\{other\}/g, L.otherName).replace(/\{otherHalf\}/g, L.otherLight ? 'pale' : 'dark').replace(/\{mineHalf\}/g, L.otherLight ? 'dark' : 'pale') : t);
    const keep = (b) => !b.if || (b.if === 'otherOwned' ? L.otherOwned : b.if === 'otherMissing' ? !L.otherOwned : true);
    const beats = sc.beats.filter(keep).map((b) => { const o = Object.assign({}, b); o.text = sub(o.text); if (o.show) o.show = Object.assign({}, o.show, { sp: o.show.sp === '{mine}' ? L.mineSp : o.show.sp === '{other}' ? L.otherSp : o.show.sp }); if (o.choice) o.choice = o.choice.map((c) => Object.assign({}, c, { text: sub(c.text) })); return o; });
    return Object.assign({}, sc, { beats });
  };
  const get0 = SC.get;
  SC.get = function (id) { const sc = get0(id); return sc && sc.dynamic && A.State && A.State.state ? resolve(sc, A.State.state) : sc; };

  /* ---------- scenes ---------- */
  Object.assign(SC.list, {
    c_arrival: {
      title: 'Above the Clouds', tone: 'quiet', bg: 'c_cloudstair', cast: {},
      beats: [
        { who: '*', text: 'The skiff bumps against a moonstone jetty. There is no water under it. There is cloud, slow and bright, a very long way down.' },
        { who: '*', entity: 'in', text: 'The Entity is already at the top of the steps, both hands in his coat, looking up at the brass dome.' },
        { who: 'entity', mood: 'n', text: 'The Celestial Crown. An observatory, a great deal of stairs, and nobody to complain to about either.' },
        { who: '*', text: 'The steps from the jetty come in two sizes, tall and short, side by side. On this island both are worn exactly the same.' },
        { who: 'you', choice: [{ text: 'Who built this?' }, { text: 'It’s very quiet.', goto: 'quiet' }] },
        { who: 'entity', mood: 'a', text: 'People who liked to write things down, and Kind Souls who liked to watch them do it. They got on. It happens more than the stories say.', goto: 'go' },
        { id: 'quiet', who: 'entity', mood: 's', text: 'It used to be louder up here.' },
        { id: 'go', who: 'entity', mood: 'n', entity: 'out', text: 'Up the Cloudstair, then. Ten doors, and one of them is the reason we came. Mind the edge. There is a great deal of it.' },
      ],
    },
    c_charts: {
      title: 'Four Points', tone: 'quiet', dungeon: 'c_starfall', bg: 'c_starfall',
      cast: { gardener: { name: 'The Shard Gardener', sp: 'aurelith' } },
      beats: [
        { who: '*', show: { sp: 'aurelith', pose: 'bow' }, text: 'The Shard Gardener folds its light away and settles among the star shards, like one more of them.' },
        { who: '*', text: 'The great chart carved into the top terrace is easier to read from here. It is not a chart of the sky. It is a chart of the islands.' },
        { who: '*', text: 'Four points are marked in gold: the Dormant Spire, the Choir of Roots, the Great Forge, and this terrace. Lines join all four, and meet in the middle of the observatory.' },
        { who: '*', entity: 'in', text: 'The Entity crouches to look, which he does not usually do.' },
        { who: 'entity', mood: 't', text: 'Three clocks and a watchman. Somebody wanted the islands to keep the same time.' },
        { who: 'you', choice: [{ text: 'Why would that matter?' }, { text: 'What’s in the middle?', goto: 'mid' }] },
        { who: 'entity', mood: 'a', text: 'Ask anyone who has missed a skiff. Now ask a whole island.', goto: 'end' },
        { id: 'mid', who: 'entity', mood: 'n', text: 'The middle of the observatory. Which is where we are going. Eventually. Stairs permitting.' },
        { id: 'end', who: 'entity', mood: 'n', entity: 'out', text: 'Leave the shards. They were planted. That is more than most things can say.' },
      ],
    },
    // The grief beat (Ending A): brief and understated, at the observatory's empty lens mount. The line is exact.
    c_mount: {
      title: 'The Empty Mount', tone: 'melancholy', dungeon: 'c_lens', bg: 'c_lens',
      cast: { lantern: { name: 'The Focal Lantern', sp: 'lumi3' } },
      beats: [
        { who: '*', show: { sp: 'lumi3', pose: 'bow' }, text: 'The Focal Lantern dims. Every lens in the gallery swings back to point the way it was built to point.' },
        { who: '*', bg: 'c_mount', text: 'They all point the same way: up the hill, through the observatory’s open doors, at the ornate brass mount in the middle of the floor. The mount that holds nothing.' },
        { who: '*', entity: 'in', text: 'The Entity has gone ahead of you. He is standing at the mount with one hand on its rim.' },
        { who: 'entity', mood: 's', pause: 1200, text: 'I left that here. I meant to come back.' },
        { who: '*', pause: 900, text: 'He does not say what. He takes his hand away, and the rim keeps the shape of it in the dust.' },
        { who: 'entity', mood: 'w', entity: 'out', text: 'Come along. The Kind Souls in the next hall have been waiting a very long time to be argued with.' },
      ],
    },
    c_cups: {
      title: 'Two Cups', tone: 'melancholy', dungeon: 'c_twinhall', bg: 'c_twinhall',
      cast: { steward: { name: 'The Dusk Steward', sp: 'eclipsar' } },
      beats: [
        { who: '*', show: { sp: 'eclipsar', pose: 'bow' }, text: 'The Dusk Steward steps back through the doorless frame and is gone. Both rooms keep their light, the bright one and the dark one.' },
        { who: '*', text: 'On the shared table, two cups. One pale, one dark. Both left half-full. Whatever was in them dried to a ring long ago.' },
        { who: '*', text: 'Your {mine} climbs onto the bench and looks into the cup on its own side of the table. Then into the other one.' },
        { who: '*', entity: 'in', text: 'The Entity does not sit down.' },
        { who: 'entity', mood: 't', text: 'Nobody gets up in the middle of a drink unless something is at the door.' },
        { who: 'you', choice: [{ text: 'So they left together.' }, { text: 'What was at the door?', goto: 'door' }] },
        { who: 'entity', mood: 'a', text: 'At the same moment, by the look of the chairs. Each to their own side. That is how you hold a door, I am told.', goto: 'end' },
        { id: 'door', who: 'entity', mood: 's', text: 'Someone who would not take no for an answer. I would rather not discuss them.' },
        { id: 'end', who: 'entity', mood: 'n', entity: 'out', text: 'Leave the cups where they are. Somebody may come back for them. People do, sometimes.' },
      ],
    },
    c_ledger: {
      title: 'The Visitors’ Book', tone: 'unsettling', dungeon: 'c_chart', bg: 'c_chart',
      cast: { clerk: { name: 'The Hour Clerk', sp: 'zeep3' } },
      beats: [
        { who: '*', show: { sp: 'zeep3', pose: 'bow' }, text: 'The Hour Clerk lowers its stamp and lets the clock’s three hands go still again.' },
        { who: '*', text: 'The visitors’ book lies open at its last page. Two lines, in two hands: one a neat pale script, one a dark script with a paw-print for a full stop. Each signs in as “Key”.' },
        { who: '*', pause: 800, text: 'Below them, a third line has been torn out. Not cut. Torn, in a hurry, by someone who did not want to be remembered here.' },
        { who: '*', entity: 'in', text: 'The Entity reads the two names. He does not read the gap.' },
        { who: 'entity', mood: 't', text: 'Two keys, signed in, as the rules required. The rules did not allow for a third. Rules rarely allow for the people who want to break them.' },
        { who: 'you', choice: [{ text: 'Who tore the page?' }, { text: 'Where are the Keepers now?', goto: 'where' }] },
        { who: 'entity', mood: 'a', text: 'Someone who was told no and took it badly. That is all the book knows, and books do not guess.', goto: 'end' },
        { id: 'where', who: 'entity', mood: 's', text: 'Where they always were, I expect. At the door. One on each side.' },
        { id: 'end', who: 'entity', mood: 'n', entity: 'out', text: 'Close the book. Gently. It has had enough people tearing at it.' },
      ],
    },
    c_bell: {
      title: 'The Great Sound', tone: 'unsettling', dungeon: 'c_bellloft', bg: 'c_bellloft',
      cast: { bell: { name: 'The Cracked Bell', sp: 'aimza3' } },
      beats: [
        { who: '*', show: { sp: 'aimza3', pose: 'bow' }, text: 'The Cracked Bell’s guardian lets go of the note it was holding. The hum in the tower drops to almost nothing.' },
        { who: '*', text: 'Almost. Close to the bell you can still hear it: the same low note that rang through the Magenta Hollows, under Obsidian Reach. The great sound the crystals kept.' },
        { who: '*', text: 'Under the bell, a basin of moonstone has filled with starlight, the way a well fills with rain. Kind Souls of the Aimza line are already curled round its rim.' },
        { who: '*', entity: 'in', text: 'The Entity stands well back from the crack.' },
        { who: 'entity', mood: 'n', text: 'A bell that rings when the door does. Somebody wanted to know the moment anything touched it.' },
        { who: 'you', choice: [{ text: 'Is it still ringing?' }, { text: 'Can the Kind Souls live here?', goto: 'live' }] },
        { who: 'entity', mood: 't', text: 'Very quietly. Bells like this remember the last thing that happened to them, and go on about it for years.', goto: 'end' },
        { id: 'live', who: 'entity', mood: 'a', text: 'Build them a starwell of their own at home and they will thank you in their usual way, which is by ignoring you contentedly.' },
        { id: 'end', who: 'entity', mood: 'n', entity: 'out', text: 'You can build a Starwell Habitat now. The Resonance Kind Souls will like it. I am told it hums.' },
      ],
    },
    c_outline: {
      title: 'The Bare Plaster', tone: 'unsettling', dungeon: 'c_dome', bg: 'c_dome',
      cast: { curator: { name: 'The Night Curator', sp: 'voltar3' } },
      beats: [
        { who: '*', show: { sp: 'voltar3', pose: 'bow' }, text: 'The Night Curator’s last spark goes out. The painted stars come back, one by one, all except a patch high in the dome.' },
        { who: '*', pause: 900, text: 'There the plaster is bare, and the bare plaster makes a shape. You have seen its edge before, chiselled out of the mould in the Mirror Gallery.' },
        { who: '*', entity: 'in', text: 'The Entity is looking at the floor, at the swept pile of paint flakes, very carefully.' },
        { who: 'entity', mood: 'n', text: 'Somebody scraped the sky to get rid of a shape. It is a lot of sky to scrape.' },
        { who: 'you', choice: [{ text: 'It’s the same shape as the mould.' }, { text: 'You won’t look at it.', goto: 'look' }] },
        { who: 'entity', mood: 'a', text: 'Is it? I am a poor judge of shapes. Ask anyone. Ask the Kind Souls. They will tell you I once mistook a Zeep for a lamp.', goto: 'end' },
        { id: 'look', who: 'entity', mood: 's', text: 'No. I won’t.' },
        { id: 'end', who: 'entity', mood: 'n', entity: 'out', text: 'One more door. Under the observatory. Then we can all stop climbing.' },
      ],
    },
    c_door: {
      title: 'The Threshold', tone: 'quiet', dungeon: 'c_threshold', bg: 'c_threshold', dynamic: true, cast: {},
      beats: [
        { who: '*', text: 'Under the observatory the stair ends at a door taller than the tower above it. A crack runs from top to bottom. Light leaks through one side of it, and dark through the other.' },
        { who: '*', text: 'On the floor in front of it, two worn hollows where somebody stood, a long time, one on each side of the crack.' },
        { who: '*', entity: 'in', text: 'The Entity stops three steps above the bottom. He comes no further.' },
        { who: 'entity', mood: 't', text: 'The Crossing. The door the Keepers kept. I will not touch it. I would advise you not to either, if I thought you would listen.' },
        { who: '*', show: { sp: '{mine}', pose: 'watch' }, text: 'Your {mine} walks straight to the {mineHalf} hollow and stands in it, as if it had always known which one was its own.' },
        { who: 'you', choice: [{ text: 'Something is guarding it.' }, { text: 'Why won’t you come down?', goto: 'why' }] },
        { who: 'entity', mood: 'n', text: 'The door remembers its Keepers. When strangers come, it puts their shapes in the way. They are not the Aminas you know. They are the door’s idea of its Keepers.', goto: 'go' },
        { id: 'why', who: 'entity', mood: 'a', text: 'I have opinions about doors. They are long and nobody enjoys them.' },
        { id: 'go', who: 'entity', mood: 'n', entity: 'out', text: 'It will be the Light Key first, and then the Shadow. One after the other, without a pause. Guard the big ones, Kind Soul. I mean that.' },
      ],
    },
    // The ending (approved Ending A, after The Two Keys). Purpose of the door, the two keys, why each side blamed the
    // other, how it began, and the repair: an outsider holds both keys' places. Both starter lines are at the door,
    // whether or not the player owns the other.
    c_ending: {
      title: 'The Keepers’ Door', tone: 'melancholy', dungeon: 'c_threshold', bg: 'c_threshold', dynamic: true, cast: {},
      beats: [
        { who: '*', text: 'The Shadow Key sinks back into the dark half of the door. The Light Key is already gone. For a moment there is nothing at the Threshold but the crack, and you, and the sound of it.' },
        { who: '*', entity: 'in', text: 'The Entity comes down the last three steps. Slowly. He still does not touch the door.' },
        { who: 'entity', mood: 'n', text: 'Well. Now you know what it was. The Crossing. A way between here and somewhere else, and a door on it, so nothing came through that had not been asked.' },
        { who: 'entity', mood: 't', text: 'Two keys, because one was never trusted to decide alone. A pale one, a dark one. It took both to open it and both to shut it. That was the whole idea. It was a good idea.' },
        { who: 'you', choice: [{ text: 'Then what happened?' }, { text: 'Why did they blame each other?', goto: 'blame' }] },
        { who: 'entity', mood: 's', text: 'Someone was refused a key, and leaned on the door anyway. It held. It cracked. Down the middle, where the two keys meet.', goto: 'sides' },
        { id: 'blame', who: 'entity', mood: 's', text: 'Because the door cracked down the middle. Each Keeper was holding their own side, and felt the other side give.' },
        { id: 'sides', who: 'entity', mood: 'a', text: 'Each was sure the other had let go. Each was half right: the door had. The pale ones told it one way, the dark ones the other. Both versions are on the Twin Shrine. Both are true, if you only ever stood on one side.' },
        { who: '*', text: 'The repair order from the Great Forge comes back to you: “Repair: one door. Requested by both keys.” They asked for it together. Then the crack kept them on their own sides, and nobody could hold both.' },
        { who: 'entity', mood: 'n', text: 'It needs someone who belongs to neither side. Someone who is not from here, and was asked in. I can think of one. Do not look so surprised.' },
        { who: '*', show: { sp: '{mine}', pose: 'watch' }, text: 'Your {mine} is standing in the {mineHalf} hollow, where its Keeper stood.' },
        { if: 'otherOwned', who: '*', show: { sp: '{other}', pose: 'watch' }, text: 'Your {other} pads past you without being asked, and takes the {otherHalf} hollow. The two of them stand shoulder to shoulder at the crack, the way the mould showed it.' },
        { if: 'otherMissing', who: '*', show: { sp: '{other}', pose: 'watch' }, text: 'Out of the {otherHalf} half of the crack steps a small {other}. Not the Shadow Key, not anything the door made: a Kind Soul of that line, who lives on this side of it. It takes the {otherHalf} hollow, and the two of them stand shoulder to shoulder, the way the mould showed it.' },
        { who: '*', pause: 900, text: 'You put one hand on the pale half of the door and one on the dark. It is warm on both sides.' },
        { who: '*', pause: 1200, text: 'The crack closes. Not with a bang. It closes the way a held breath is let go: slowly, all the way down, until there is one door and no seam in it at all.' },
        { who: '*', text: 'The door does not open. It does not need to. Far away, the Dormant Spire, the Choir and the Forge keep their time, and above you the observatory keeps watch with them. Nothing in the world is in a hurry any more.' },
        { if: 'otherMissing', who: '*', text: 'The small {other} touches noses with your {mine}, and goes back through the door it lives behind. It looks back once.' },
        { who: 'entity', mood: 'w', text: 'There. Mended. It only took several hundred battles and a great many stairs. I would have done it myself, of course. I was busy.' },
        { who: 'you', choice: [{ text: 'You knew them, didn’t you?' }, { text: 'What happens now?', goto: 'now' }] },
        { who: 'entity', mood: 's', text: 'I knew the door. Doors are easier to know than people. They only ever want one thing.', goto: 'last' },
        { id: 'now', who: 'entity', mood: 'n', text: 'Now? Nothing has to happen. That is rather the point of a door that works.' },
        { id: 'last', who: 'entity', mood: 'n', text: 'The islands are yours, and the Kind Souls on them. They always were, I suspect. Go home. Feed someone. Build something. Come back up here when you want the view.' },
        { who: '*', entity: 'out', text: 'He turns and climbs the stair without looking back at the door. Halfway up, he stops, and does look back. Then he goes on.' },
      ],
    },
    // The optional Watcher's Lens moment (for players who own it: equipped or in the bag). It takes nothing, gives
    // nothing and reveals nothing new; it can be played again at any time from the observatory.
    c_lensmount: {
      title: 'The Watcher’s Lens', tone: 'melancholy', bg: 'c_mount', cast: {},
      beats: [
        { who: '*', text: 'You take out the Watcher’s Lens, the one the Entity said he had lost, and hold it over the empty mount.' },
        { who: '*', pause: 900, text: 'The brass claws are exactly its size. You do not need to try it to know it would fit.' },
        { who: '*', entity: 'in', text: 'The Entity is in the doorway. You did not hear him come in. He looks at the lens, and at the mount, and at you.' },
        { who: 'entity', mood: 's', text: 'Oh. So that is where it went.' },
        { who: 'you', choice: [{ text: 'Do you want it back?' }, { text: 'Shall I leave it here?', goto: 'leave' }] },
        { who: 'entity', mood: 'w', text: 'Back? Heavens, no. It suits you. It never suited me. I only ever looked through it the wrong way round.', goto: 'end' },
        { id: 'leave', who: 'entity', mood: 'n', text: 'Leave it with nobody to look through it? That would be a waste of a perfectly good lens. Keep it. Look at things.' },
        { id: 'end', who: '*', entity: 'out', text: 'He goes. You put the Lens away again. The mount stays empty, which, for the first time, seems to be all right.' },
      ],
    },
  });
  // A line from the Entity after the first clear of the dungeons without a scene (toast)
  Object.assign(SC.after, {
    c_cloudstair: 'Two sizes of step, worn just the same. Nobody up here was ever in a hurry to be first.',
    c_orrery: 'The bent arm points across the sea, at the Dormant Spire. And the wheel is turning again, very slowly. Nobody asked it to.',
    c_cistern: 'Water from three islands in the one basin. Somebody wanted to keep them all in the same cup. Sentimental. I approve.',
  });
  // the scenes that play after each dungeon's first clear (and the two that play by place, not by clear)
  Object.assign(D.DUNGEONS.c_starfall, { scene: 'c_charts' }); Object.assign(D.DUNGEONS.c_lens, { scene: 'c_mount' }); Object.assign(D.DUNGEONS.c_twinhall, { scene: 'c_cups' });
  Object.assign(D.DUNGEONS.c_chart, { scene: 'c_ledger' }); Object.assign(D.DUNGEONS.c_bellloft, { scene: 'c_bell' }); Object.assign(D.DUNGEONS.c_dome, { scene: 'c_outline' });
  Object.assign(D.DUNGEONS.c_threshold, { scene: 'c_ending' });

  /* ---------- the arrival scene, once (also for saves that reached the Crown before this build) ---------- */
  C.arrivalDue = (st) => !!(D.C20.live && st && W.islandUnlocked(st, D.C20.island) && st.currentIsland === D.C20.island && !(st.story && st.story.scenes && st.story.scenes.c_arrival) && !(st.story && st.story.pendingScene));
  C.queueArrival = function (st) { if (!C.arrivalDue(st)) return false; st.story = st.story || {}; st.story.pendingScene = 'c_arrival'; return true; };
  const travel0 = W.travel;
  W.travel = function (st, id) { const r = travel0.apply(this, arguments); if (r && r.ok && id === D.C20.island) C.queueArrival(st); return r; };

  /* ---------- the Watcher's Lens at the mount (optional) ---------- */
  // Owned in any way: equipped on an Amina or in the bag (both are st.items). Never consumed.
  C.hasLens = (st) => R.items(st).some((x) => x && x.id === 'entityeye');
  C.lensReady = (st) => !!(st && C.hasLens(st) && st.story && st.story.scenes && st.story.scenes.c_mount);
  C.lensMoment = function (st) {
    if (!C.lensReady(st)) return { ok: false, reason: C.hasLens(st) ? 'later' : 'nolens' };
    st.c20 = st.c20 || { seen: {} }; st.c20.lens = (st.c20.lens | 0) + 1; return { ok: true, scene: 'c_lensmount', first: st.c20.lens === 1 };
  };

  /* ---------- the campaign-completion state ----------
     Set once, the first time The Two Keys fall: st.c20.done (when), and st.c20.mastery = 'eligible' for the future
     Resonance Mastery phase (nothing reads it yet). Kept forever; a replay of the Threshold changes nothing. */
  C.complete = (st) => !!(st && st.c20 && st.c20.done);
  C.masteryEligible = (st) => !!(C.complete(st) && st.c20.mastery === 'eligible');
  const resolve0 = R.resolveBattle;
  R.resolveBattle = function (st, b) {
    const d = st && st.run && st.run.d; const out = resolve0.apply(this, arguments);
    if (out && out.cleared && d === 'c_threshold' && !C.complete(st) && C.cleared(st, 'c_threshold')) {
      st.c20 = st.c20 || { seen: {} }; st.c20.done = now() || 1; st.c20.mastery = 'eligible'; st.c20.celebrate = 1; out.campaignComplete = true;
      R.emit && R.emit('campaignComplete', {});
    }
    return out;
  };
  // a save cleaned on load keeps these (celestial20b's settle keeps only known keys)
  C.settleExtra = function (st) {
    const c = st.c20; if (!c) return;
    if (c.done != null) c.done = +c.done || 1; if (c.done && !C.cleared(st, 'c_threshold')) { delete c.done; delete c.mastery; delete c.celebrate; } // forged alone: removed
    if (c.done && c.mastery !== 'eligible') c.mastery = 'eligible';
    if (!c.done) { delete c.mastery; delete c.celebrate; }
    if (c.lens != null) c.lens = Math.max(0, c.lens | 0);
    // a save whose Two Keys fell before the completion state existed (none should, but a future import might) gets it
    if (!c.done && C.cleared(st, 'c_threshold')) { c.done = 1; c.mastery = 'eligible'; }
    C.queueArrival(st);
  };

  /* ---------- quests: the Celestial Crown campaign (main, after Heart of the Forge) and its side tasks ---------- */
  const o = (type, props) => Object.assign({ id: 'o1', type }, props || {});
  const nonLegendary = Object.keys(D.SPECIES).filter((k) => !D.SPECIES[k].legendary);
  D.C20.nonLegendary = nonLegendary;
  const aimzaLine = Object.keys(D.SPECIES).filter((k) => D.SPECIES[k].line === D.SPECIES.aimza.line);
  D.QUESTS.push(
    { id: 'm_c1', title: 'Mind the Edge', desc: 'Climb Cloudstair Landing from the Cloud Jetty.', after: ['m_o10'],
      objectives: [o('dungeon_clear', { dungeon: 'c_cloudstair', count: 1, hint: 'Tap the gate marked 1 above the jetty, or open Dungeons and pick the Celestial Crown.' })], reward: { gold: 1600, gems: 4 } },
    { id: 'm_c2', title: 'Four Points', desc: 'Clear Starfall Terrace.', after: ['m_c1'],
      objectives: [o('dungeon_clear', { dungeon: 'c_starfall', count: 1, hint: 'Starfall burns: guard it, or heal to clear the burn. Dark beats Light.' })], reward: { gold: 1700, food: 200 } },
    { id: 'm_c3', title: 'The Bent Arm', desc: 'Clear the Orrery Wheel.', after: ['m_c2'],
      objectives: [o('dungeon_clear', { dungeon: 'c_orrery', count: 1, hint: 'Its guardian shifts between Metal and Earth. Water answers both.' })], reward: { gold: 1800, gems: 5 } },
    { id: 'm_c4', title: 'Three Islands, One Cup', desc: 'Clear Cloud Sea Cistern.', after: ['m_c3'],
      objectives: [o('dungeon_clear', { dungeon: 'c_cistern', count: 1, hint: 'The mist slows both sides every few turns. Nature and Earth beat Water.' })], reward: { gold: 1900, food: 220 } },
    { id: 'm_c5', title: 'The Empty Mount', desc: 'Clear the Lens Gallery.', after: ['m_c4'],
      objectives: [o('dungeon_clear', { dungeon: 'c_lens', count: 1, hint: 'Guard Focal Ray and the lenses stay quiet. Metal and Dark resist Light.' })], reward: { gold: 2000, gems: 5 } },
    { id: 'm_c6', title: 'Two Cups', desc: 'Clear the Hall of Two Doors.', after: ['m_c5'],
      objectives: [o('dungeon_clear', { dungeon: 'c_twinhall', count: 1, hint: 'Its guardian shifts between Dark and Light: bring both, and switch with it.' })], reward: { gold: 2100, gems: 5 } },
    { id: 'm_c7', title: 'The Torn Page', desc: 'Clear the Chart Room.', after: ['m_c6'],
      objectives: [o('dungeon_clear', { dungeon: 'c_chart', count: 1, hint: 'Specials crack its barrier. Hour Seal silences: keep a strong basic move.' })], reward: { gold: 2200, food: 240 } },
    { id: 'm_c8', title: 'The Great Sound', desc: 'Clear the Bell Loft.', after: ['m_c7'],
      objectives: [o('dungeon_clear', { dungeon: 'c_bellloft', count: 1, hint: 'Resonance is never resisted: guard Bell Toll, and the crack stays quiet.' })], reward: { gold: 2300, gems: 6 } },
    { id: 'm_c9', title: 'The Bare Plaster', desc: 'Clear the Shadowed Dome.', after: ['m_c8'],
      objectives: [o('dungeon_clear', { dungeon: 'c_dome', count: 1, hint: 'Umbral Hush lowers attack: guard it or heal. Light beats Dark.' })], reward: { gold: 2400, gems: 6 } },
    { id: 'm_c10', title: 'The Keepers’ Door', desc: 'Defeat The Two Keys at the Threshold, the Island Boss of the Celestial Crown.', after: ['m_c9'],
      objectives: [o('dungeon_clear', { dungeon: 'c_threshold', count: 1, hint: 'Two stages: the Light Key, then the Shadow Key. Break each barrier with specials and guard both charged moves.' })], reward: { gold: 5000, gems: 15 }, finale: true },
    { id: 's_c_lv55', title: 'Nearer the Stars', side: true, desc: 'Raise any Amina to level 55.', after: ['m_c1'], objectives: [o('creature_level', { count: 55, hint: 'Win battles, feed snacks, or replay a dungeon. Levels rise to the cap of 60.' })], reward: { gold: 3000, gems: 6 } },
    { id: 's_c_lv60', title: 'As High as It Goes', side: true, desc: 'Raise any Amina to level 60.', after: ['s_c_lv55'], objectives: [o('creature_level', { count: 60, hint: 'Level 60 is the highest any Amina can reach.' })], reward: { gold: 5000, gems: 10 } },
    { id: 's_c_stair', title: 'Every Step', side: true, desc: 'Clear three sections of Cloudstair Landing.', after: ['m_o10'], objectives: [o('dungeon_stage', { dungeon: 'c_cloudstair', count: 3, hint: 'Each section of Cloudstair Landing is three battles; the guardian is the fourth.' })], reward: { gold: 900, food: 140 } },
    { id: 's_c_starwell', title: 'A Well of Stars', side: true, desc: 'Build a Starwell Habitat, so your Resonance Aminas have a home.', after: ['m_c8'], objectives: [o('build', { building: 'hab_resonance', count: 1, hint: 'It opens with the Bell Loft. Build it on any island.' })], reward: { gold: 3000, gems: 4 } },
    { id: 's_c_starwell3', title: 'Deeper Starlight', side: true, desc: 'Upgrade a Starwell Habitat to level 3.', after: ['s_c_starwell'], objectives: [o('upgrade', { building: 'hab_resonance', level: 3, hint: 'Tap the Starwell Habitat and choose Upgrade.' })], reward: { gold: 4000, gems: 6 } },
    { id: 's_c_clear', title: 'Clear Skies', side: true, desc: 'Clear ten obstacles on the Celestial Crown.', after: ['m_c1'], objectives: [o('remove_obstacle', { island: 'celestial', count: 10, hint: 'Tap a drifting stone, star shard or moonbloom on the Celestial Crown and clear it.' })], reward: { gold: 5000, gems: 8 } },
    { id: 's_c_farm', title: 'Berries in the Clouds', side: true, desc: 'Build a Berry Farm on the Celestial Crown.', after: ['m_c1'], objectives: [o('build', { building: 'farm', island: 'celestial', count: 1, hint: 'Open Build while on the Celestial Crown and place a Berry Farm.' })], reward: { gold: 3000, gems: 5 } },
    { id: 's_c_note', title: 'Third Note', side: true, desc: 'Befriend every form of the Aimza line.', after: ['m_c8'], objectives: [o('befriend', { species: aimzaLine, hint: 'Aimza and Aimza II are found in the Star Shard Field; breed or evolve for the rest.' })], reward: { gold: 4000, gems: 8 } },
    { id: 's_c_chart', title: 'Starchart', side: true, desc: 'Befriend every Amina that is not legendary (' + nonLegendary.length + ').', after: ['m_c2'], objectives: [o('befriend', { species: nonLegendary, hint: 'Explore, breed and evolve. The Codex shows who is missing.' })], reward: { gold: 10000, gems: 20 } },
  );
  // the existing island quest gets its hints (its reward is unchanged and paid once, by the quest system)
  const qCrown = D.QUESTS.find((q) => q.id === 's_crown');
  if (qCrown) qCrown.objectives = [o('unlock_island', { island: 'celestial', hint: 'Defeat the Forge Heart in the Great Forge, Obsidian Reach’s Island Boss.' }), o('visit_island', { id: 'o2', island: 'celestial', hint: 'Open the Map and Travel to the Celestial Crown.' })];
})(typeof window !== 'undefined' ? window : globalThis);
