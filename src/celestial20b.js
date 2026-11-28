/* Aminas — Phase 20B: the Celestial Crown, the Silent Observatory (world construction; no campaign yet).
   The approved Phase 20A concept (docs/PHASE20A.md, sections 2–3): an ancient observatory island of moonstone terraces,
   brass instruments and old lenses. Its places and its ten dungeon entrances are data here, with the same rules as the
   Verdant Wilds and Obsidian Reach (src/verdant18b.js, src/obsidian19b.js): places can be visited and remembered, and
   entrances show their state in order. Nothing on this island can start a battle until the campaign switch
   (D.C20.live) is on and the ten dungeons exist as playable data. Neither is true in this build.
   Save safety: every cell used here is path, sand or the observatory's landmark slot, never buildable grass, and none
   touches an obstacle (tests check both against the map and every obstacle footprint), so no obstacle, map cell or
   player building moves. The island stays closed to normal play (D.ISLAND_LIVE.celestial is false; the Forge Heart
   would open it once it is ready). The developer panel offers a construction preview for the current session only.
   New save data: st.c20 = { seen: { <place>: time } }, cleaned on load.
   Story: introductory descriptions and Entity lines only. Nothing here reveals the third party, the origin of the
   Emergence or the Entity's past, and the approved ending's beats (the lens-mount line, the door) are not played. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, W = A.World;
  const now = () => (R.now ? R.now() : Date.now());

  D.C20 = {
    live: true, // the campaign switch: on since Phase 20C, with the ten playable dungeons in campaign-data.js
    island: 'celestial',
    sites: [
      { id: 'jetty', kind: 'c_jetty', name: 'The Cloud Jetty', x: 13, y: 33, w: 4, h: 1, role: 'arrival',
        text: 'A narrow moonstone jetty at the island’s southern tip. Below it there is no sea at all, only cloud, slow and bright, a very long way down. Mooring posts with brass caps, polished by wind rather than hands.',
        entity: 'Mind the edge. There is a great deal of it.' },
      { id: 'cloudstair', kind: 'c_cloudstair', name: 'The Cloudstair', x: 14, y: 28, w: 1, h: 2, role: 'landmark',
        text: 'Steps cut into the cliff, climbing from the jetty towards the observatory. Every flight has two sets of treads side by side: tall ones, and short ones for smaller feet.',
        entity: 'Stairs. Up here. Somebody really wanted visitors to suffer.' },
      { id: 'starfall', kind: 'c_starfall', name: 'Starfall Terrace', x: 15, y: 26, w: 3, h: 1, role: 'landmark',
        text: 'Terraced beds where something bright fell long ago and took root. Pale shards grow out of the soil like flowers, and moonblooms open between them at noon.',
        entity: 'Things fall from the sky here. Usually not on visitors.' },
      { id: 'orrery', kind: 'c_orrery', name: 'The Orrery Wheel', x: 6, y: 17, w: 4, h: 1, role: 'landmark',
        text: 'A great brass orrery under a cracked glass roof: bodies on long arms around a dull bronze sun. It has not turned in a very long time. One arm is bent.',
        entity: 'A clock for the sky. It stopped. Clocks do that.' },
      { id: 'cistern', kind: 'c_cistern', name: 'Cloud Sea Cistern', x: 2, y: 23, w: 2, h: 1, role: 'landmark',
        text: 'Stone basins on the western cliff that catch the cloud as it drifts past and keep it as water. Brass gutters run inland. Mist rolls over the rim in slow waves.',
        entity: 'They drank clouds. Resourceful. Damp.' },
      { id: 'lens', kind: 'c_lens', name: 'The Lens Gallery', x: 5, y: 15, w: 1, h: 2, role: 'landmark',
        text: 'A colonnade of great lenses in brass frames, each turned a little differently. Light comes in at one end and goes somewhere else entirely.',
        entity: 'Glass that bends light. Do not stand where it is pointing.' },
      { id: 'twinhall', kind: 'c_twinhall', name: 'The Hall of Two Doors', x: 17, y: 11, w: 1, h: 3, role: 'landmark',
        text: 'A long hall on the northern path with two doors side by side, one of pale moonstone, one of dark slate. Both are shut. Above them, a single lintel.',
        entity: 'Two doors. One hall. I am told this is architecture.' },
      { id: 'chart', kind: 'c_chart', name: 'The Chart Room', x: 20, y: 3, w: 1, h: 2, role: 'landmark',
        text: 'A tower room at the northern edge, its shutters open to the sky. Through them you can see shelves of rolled charts and a long desk, the ink dry in its well.',
        entity: 'Somebody wrote everything down. Everything. Imagine the paperwork.' },
      { id: 'bell', kind: 'c_bell', name: 'The Bell Loft', x: 28, y: 13, w: 1, h: 3, role: 'landmark',
        text: 'A slender bell tower on the eastern path. The great bell hangs inside, cracked from rim to crown. Nobody strikes it, and yet it is never quite silent.',
        entity: 'It hums. Bells are not supposed to hum on their own. Let us walk faster.' },
      { id: 'dome', kind: 'c_dome', name: 'The Shadowed Dome', x: 24, y: 16, w: 4, h: 1, role: 'landmark',
        text: 'A low dome of dark slate on the eastern road, painted inside with a night sky. Through the doorway you can see that some of the stars have been scraped away.',
        entity: 'A ceiling with stars on it. Some of them are missing. Ceilings are like that.' },
      { id: 'lenshold', kind: 'c_lenshold', name: 'Lenshold', x: 17, y: 19, w: 1, h: 2, role: 'hub',
        text: 'Broad moonstone steps below the observatory, where every path on the island meets. A dry fountain, benches with a low end, and a brass plaque worn too smooth to read.',
        entity: 'Steps. A fountain. A plaque. Somebody was very proud of this.' },
      { id: 'observatory', kind: 'c_observatory', name: 'The Silent Observatory', x: 15, y: 15, w: 4, h: 4, role: 'landmark', slot: true,
        text: 'The oldest building on the island: a moonstone tower under a great brass dome, its shutters half open. Inside, telescopes and calipers stand where they were left, a chair is pushed back from a desk, and in the middle of the floor an ornate lens mount holds nothing at all.',
        entity: 'An observatory. It watched things. It is not watching now. I would like to keep it that way.' },
    ],
    // The ten approved dungeons of Phase 20A, in order (docs/PHASE20A.md, section 5; recommended levels 48–57,
    // guardians 51–60). All of them are sealed in this build. The Threshold is inside the observatory.
    gates: [
      { id: 'c_cloudstair', n: 1, name: 'Cloudstair Landing', rec: 48, el: 'wind', x: 14, y: 30, site: 'cloudstair', theme: 'Steps cut into the cloud cliff, and the first light-bridges.' },
      { id: 'c_starfall', n: 2, name: 'Starfall Terrace', rec: 49, el: 'light', x: 14, y: 26, site: 'starfall', theme: 'Gardens where star shards fell and rooted.' },
      { id: 'c_orrery', n: 3, name: 'The Orrery Wheel', rec: 50, el: 'metal', x: 5, y: 17, site: 'orrery', theme: 'A brass orrery under glass, one arm bent.' },
      { id: 'c_cistern', n: 4, name: 'Cloud Sea Cistern', rec: 51, el: 'water', x: 4, y: 23, site: 'cistern', theme: 'Cisterns that catch the cloud; mist in waves.' },
      { id: 'c_lens', n: 5, name: 'The Lens Gallery', rec: 52, el: 'light', x: 5, y: 14, site: 'lens', theme: 'Great lenses that focus and bounce the light.' },
      { id: 'c_twinhall', n: 6, name: 'Hall of Two Doors', rec: 53, el: 'dark', x: 17, y: 10, site: 'twinhall', theme: 'Two rooms side by side, one bright, one dark.' },
      { id: 'c_chart', n: 7, name: 'The Chart Room', rec: 54, el: 'metal', x: 20, y: 5, site: 'chart', theme: 'Star charts and ledgers of hours.' },
      { id: 'c_bellloft', n: 8, name: 'The Bell Loft', rec: 55, el: 'resonance', x: 28, y: 12, site: 'bell', theme: 'The cracked great bell over the dome.' },
      { id: 'c_dome', n: 9, name: 'The Shadowed Dome', rec: 56, el: 'dark', x: 28, y: 16, site: 'dome', theme: 'The night side, where the stars were scraped away.' },
      { id: 'c_threshold', n: 10, name: 'The Threshold', rec: 57, el: 'resonance', x: 16, y: 16, site: 'observatory', inside: true, boss: true, theme: 'Beneath the observatory. The Island Boss waits here.' },
    ],
  };
  // Phase 20C: the Celestial Crown is ready. It opens when the Forge Heart falls (W.unlockByBoss); saves whose Forge Heart
  // fell before this build get it on load, once (V.settle in src/verdant18b.js).
  D.ISLAND_LIVE.celestial = true;
  const G = {}; D.C20.gates.forEach((g, i) => { G[g.id] = g; g.prev = i ? D.C20.gates[i - 1].id : null; });
  const SITE = {}; D.C20.sites.forEach((s) => { SITE[s.id] = s; });

  /* ---------- explore areas (existing species and forms; each opens with its dungeon, so none is open in this build) ----------
     The three areas of docs/PHASE20A.md, section 5. Finds are second forms (the island's level); the rare third-form
     meeting follows the Verdant rules of Phase 18D (src/verdant18b.js): once all three usual finds are met, the first
     exploration of each day rolls 20% (certain on the 8th), met once ever, at a level never above the dungeon ahead. */
  Object.assign(D.AREAS, {
    cloudshelf: { name: 'Cloud Shelf', island: 'celestial', blurb: 'A ledge of packed cloud under the southern cliff. It holds your weight. Mostly.', unlock: { c20: 'c_cloudstair' },
      steps: [['res', 56, 11], ['find', 'aeolus'], ['res', 58, 11], ['find', 'lumi2'], ['res', 60, 12], ['find', 'pyrohawk']] },
    moonbloombeds: { name: 'Moonbloom Beds', island: 'celestial', blurb: 'Pale flowers that open at noon and close when anyone looks straight at them.', unlock: { c20: 'c_cistern' },
      steps: [['res', 58, 11], ['find', 'aquaflora2'], ['res', 60, 12], ['find', 'terraflora2'], ['res', 62, 12], ['find', 'berrant']] },
    starfield: { name: 'Star Shard Field', island: 'celestial', blurb: 'Fallen shards stand in the grass like a crop. They are warm, and they hum.', unlock: { c20: 'c_chart' },
      steps: [['res', 62, 12], ['find', 'aimza2'], ['res', 64, 13], ['find', 'zeep2'], ['res', 66, 13], ['find', 'voltar2']] },
  });
  D.C20.areas = ['cloudshelf', 'moonbloombeds', 'starfield'];
  D.C20.areas.forEach((id) => { const a = D.AREAS[id]; a.steps = a.steps.filter((s) => s[0] !== 'find' || D.SPECIES[s[1]]); if (D.AREA_ORDER.indexOf(id) < 0) D.AREA_ORDER.push(id); });
  // the level an Amina found there joins at (the island's band, below Dungeon 1's 48)
  if (R.AREA_LV) Object.assign(R.AREA_LV, { cloudshelf: 46, moonbloombeds: 49, starfield: 52 });
  // rare third forms: Zephyr III on the Cloud Shelf (after Dungeon 1: Starfall is 49 → 48), Acinus III in the Moonbloom
  // Beds (after Dungeon 4: the Lens Gallery is 52 → 51), Voltar III in the Star Shard Field (after Dungeon 7: the Bell
  // Loft is 55 → 54). Stored with the Verdant records (st.v18.rare), like Obsidian's.
  if (D.V18 && D.V18.rare) { Object.assign(D.V18.rare.of, { cloudshelf: 'stormbringer', moonbloombeds: 'calyxar', starfield: 'voltar3' }); Object.assign(D.V18.rare.lvOf, { cloudshelf: 48, moonbloombeds: 51, starfield: 54 }); }

  /* ---------- Phase 20C: first-clear items and the Keeper's Emblem ----------
     Each dungeon's first clear gives an existing item that no dungeon gave yet (approved in Phase 20A); the Bell Loft
     opens the Starwell Habitat instead. The Two Keys give the Keeper's Emblem: a unique charm (no family: cannot be
     merged, bought or crafted; a second copy becomes gold). Stats: the trimmed Steadfast line approved for Phase 20C,
     compared with the Watcher's Lens and the best charms in docs/PHASE20C.md (tools/p20c-emblem.js). */
  D.ITEMS.keeperemblem = { id: 'keeperemblem', name: 'Keeper’s Emblem', slot: 'charm', bonus: { hp: 0.06, def: 0.08, atk: 0.03, spd: 0.02 }, rarity: 'mythic', unique: true, dupGold: 400, tier: 4, icon: 'emblem',
    desc: 'Two keys. One purpose.' };
  if (D.DUNGEON_GEAR) Object.assign(D.DUNGEON_GEAR, { c_cloudstair: 'dawncharm', c_starfall: 'moonstone', c_orrery: 'ironclub', c_cistern: 'reefplate', c_lens: 'basaltmail',
    c_twinhall: 'infernofang', c_chart: 'worldsplit', c_dome: 'feathertok', c_threshold: 'keeperemblem' });

  /* ---------- rules ---------- */
  const C = (R.C20 = {});
  // Session-only developer switches (never saved; a reload clears them): the construction preview, and access to the
  // Starwell Habitat without its campaign requirement. Both need the developer build (D.DEV_TOOLS).
  // Phase 20C: the 20B developer switches are retired (the island is part of the campaign). Kept as inert flags so an
  // older developer session cannot turn either back on.
  C.dev = Object.freeze({ preview: false, habitat: false });
  C.gate = (id) => G[id] || null;
  C.site = (id) => SITE[id] || null;
  C.built = (id) => { const d = D.DUNGEONS[id]; return !!(D.C20.live && d && d.playable && d.island === D.C20.island); };
  // Phase 20C: a Celestial dungeon counts as cleared only with its whole chain: the Forge Heart beaten and every dungeon
  // before it cleared too. A clear record forged on its own (or left by a developer session) opens nothing.
  C.cleared = (st, id) => { const g = G[id]; if (!g || !D.DUNGEONS[id] || !R.dungeonCleared(st, id) || !R.islandBossDefeated(st, 'obsidian')) return false; return !g.prev || C.cleared(st, g.prev); };
  C.gateFor = (siteId) => D.C20.gates.find((g) => g.site === siteId) || null;
  // 'locked' | 'sealed' | 'open', with the reason in words (never claims anything can be entered when it cannot)
  C.gateState = function (st, id) {
    const g = G[id]; if (!g) return { state: 'locked', text: 'Unknown.' };
    if (!W.islandUnlocked(st, D.C20.island)) return { state: 'locked', text: 'Reach the Celestial Crown first.' };
    if (!g.prev && !R.islandBossDefeated(st, 'obsidian')) return { state: 'locked', text: 'Opens after the Forge Heart, Obsidian Reach’s Island Boss.' };
    if (g.prev && !C.cleared(st, g.prev)) return { state: 'locked', text: 'Opens after ' + G[g.prev].name.replace(/^The /, 'the ') + ' (Dungeon ' + G[g.prev].n + ').' };
    if (!C.built(id)) return { state: 'sealed', text: 'The door is shut and very still. Whatever waits inside is not ready for visitors yet.' };
    return { state: 'open', text: 'Recommended level ' + g.rec + '.' };
  };
  C.canEnter = (st, id) => C.gateState(st, id).state === 'open';
  // the look of an entrance: 0 dark (locked), 1 lit (its turn has come: sealed or open), 2 cleared
  C.look = (st, id) => (C.cleared(st, id) ? 2 : C.gateState(st, id).state === 'locked' ? 0 : 1);
  C.gates = (st) => D.C20.gates.map((g) => Object.assign({ id: g.id, n: g.n, name: g.name, rec: g.rec }, C.gateState(st, g.id)));

  const reqMet0 = R.reqMet;
  R.reqMet = function (st, req) {
    if (req && req.c20 && !C.cleared(st, req.c20)) return false;
    return reqMet0.call(this, st, req && req.c20 ? Object.assign({}, req, { c20: undefined, hab20: undefined }) : req);
  };
  const reqText0 = W.reqText;
  W.reqText = function (req) {
    const base = reqText0.apply(this, req && req.c20 ? [Object.assign({}, req, { c20: undefined, hab20: undefined })].concat([].slice.call(arguments, 1)) : arguments) || '';
    if (req && req.c20 && G[req.c20]) return (base ? base + ' ' : '') + 'Opens with ' + G[req.c20].name.replace(/^The /, 'the ') + ' (Celestial Crown, Dungeon ' + G[req.c20].n + '), which is not open yet.';
    return base;
  };
  // the first unmet part, for navigation and the build menu's locked line
  const unmet0 = W.unmetReq;
  W.unmetReq = function (st, req) {
    const r = unmet0.apply(this, arguments); if (r) return r;
    if (req && req.c20 && !R.reqMet(st, { c20: req.c20, hab20: req.hab20 })) return { c20: req.c20 };
    return null;
  };
  // no way into an unfinished Celestial battle, whatever calls it
  const startRun0 = R.startRun;
  R.startRun = function (st, id) {
    if (G[id] && !C.canEnter(st, id)) return { ok: false, reason: 'locked', text: C.gateState(st, id).text };
    return startRun0.apply(this, arguments);
  };
  const dUnl0 = R.dungeonUnlocked;
  R.dungeonUnlocked = function (st, id) { if (G[id] && !C.canEnter(st, id)) return false; return dUnl0.apply(this, arguments); };
  // quests that ask for the Crown wait until its campaign is on, also during the developer preview
  if (A.Quests && A.Quests.islandReachable) {
    const reach0 = A.Quests.islandReachable;
    A.Quests.islandReachable = function (st, iid) { if (iid === D.C20.island && !D.C20.live) return false; return reach0.apply(this, arguments); };
  }

  /* ---------- places: visited once, remembered ---------- */
  C.visit = function (st, id) {
    if (!SITE[id] && !G[id]) return { ok: false, reason: 'invalid' };
    st.c20 = st.c20 && typeof st.c20 === 'object' ? st.c20 : { seen: {} }; st.c20.seen = st.c20.seen && typeof st.c20.seen === 'object' ? st.c20.seen : {};
    const first = !st.c20.seen[id]; if (first) st.c20.seen[id] = now() || 1;
    if (first && R.emit) R.emit('c20visit', { id });
    return { ok: true, first };
  };
  C.seen = (st, id) => !!(st.c20 && st.c20.seen && st.c20.seen[id]);
  C.placeIds = () => D.C20.sites.filter((s) => !s.part).map((s) => s.id);
  C.progress = (st) => { const ids = C.placeIds(); return { seen: ids.filter((id) => C.seen(st, id)).length, total: ids.length }; };

  /* ---------- the developer construction preview (session only) ----------
     Like Phase 19B's Obsidian preview: it marks the island ready for this session and, on a save that never opened it,
     opens it the way an old build's purchase did, marked by: 'preview', so it can be built on. It opens no dungeon, no
     Explore area and no quest (the campaign switch stays off). On the next load the preview mark is removed again
     (C.settle below): the island closes, and its obstacle records and any buildings placed there are kept. */
  // Phase 20C: the 20B construction preview is retired. The developer shortcut only travels to the Crown on a save that
  // opened it the normal way; it never unlocks the island, opens a dungeon or sets anything ready.
  C.preview = function (st) {
    if (!W.islandUnlocked(st, D.C20.island)) return { ok: false, reason: 'progress', text: R.islandBossDefeated(st, 'obsidian') ? 'Travel from the Map.' : 'Defeat the Forge Heart first.' };
    return { ok: true };
  };
  C.devHabitat = () => false; // retired (Phase 20C): the Starwell Habitat opens only with the Bell Loft

  /* ---------- an older purchase waits for the Forge Heart (Phase 20C) ----------
     An early build sold the Crown for gold. That record (and any obstacle or building on it) is kept exactly as it is,
     but the island only counts as open once the Forge Heart has fallen, so no save reaches the final campaign without
     the three islands before it. When the Forge Heart falls such a save finds its Crown, and its buildings, as it left
     them; the unlock is not granted twice (no second rank reward). */
  const unl0 = W.islandUnlocked;
  W.islandUnlocked = (st, id) => unl0(st, id) && (id !== D.C20.island || !!R.islandBossDefeated(st, 'obsidian'));
  C.waiting = (st) => unl0(st, D.C20.island) && !R.islandBossDefeated(st, 'obsidian'); // a kept purchase, not yet open
  W.islandKept = (st, id) => id === D.C20.island && C.waiting(st);

  /* ---------- saves ---------- */
  C.settle = function (st) {
    if (!st) return st;
    if (!st.c20 || typeof st.c20 !== 'object' || Array.isArray(st.c20)) st.c20 = { seen: {} };
    if (!st.c20.seen || typeof st.c20.seen !== 'object' || Array.isArray(st.c20.seen)) st.c20.seen = {};
    Object.keys(st.c20.seen).forEach((k) => { if (!SITE[k] && !G[k]) delete st.c20.seen[k]; else st.c20.seen[k] = +st.c20.seen[k] || 1; });
    Object.keys(st.c20).forEach((k) => { if (['seen', 'done', 'mastery', 'celebrate', 'lens'].indexOf(k) < 0) delete st.c20[k]; }); // Phase 20C: the completion state and the Lens moment
    // a developer preview's unlock never stands in for the Forge Heart: the island closes again on load, keeping its
    // obstacle records and buildings (a legacy purchase, by: 'gold' or no mark, is kept exactly as it is)
    const ci = st.islands && st.islands.celestial;
    if (ci && ci.by === 'preview') { if (R.islandBossDefeated(st, 'obsidian')) ci.by = 'boss'; else { ci.unlocked = false; delete ci.unlockedAt; delete ci.by; if (st.currentIsland === 'celestial') st.currentIsland = W.islandUnlocked(st, 'obsidian') ? 'obsidian' : W.islandUnlocked(st, 'verdant') ? 'verdant' : 'starter'; } }
    if (st.currentIsland === 'celestial' && C.waiting(st)) st.currentIsland = W.islandUnlocked(st, 'obsidian') ? 'obsidian' : W.islandUnlocked(st, 'verdant') ? 'verdant' : 'starter'; // record kept
    if (C.settleExtra) C.settleExtra(st); // Phase 20C (src/celestial20c.js)
    // a forged or stale run inside an unfinished Celestial dungeon is dropped
    if (st.run && G[st.run.d] && !C.canEnter(st, st.run.d)) st.run = null;
    return st;
  };
  if (A.State && A.State.sanitize) { const san0 = A.State.sanitize; A.State.sanitize = function (st) { try { if (st && st.islands && st.currentIsland === 'celestial' && st.campaign && C.waiting(st)) st.currentIsland = unl0(st, 'obsidian') ? 'obsidian' : unl0(st, 'verdant') ? 'verdant' : 'starter'; } catch (e) { /* the base sanitize repairs it */ } const r = san0.apply(this, arguments); C.settle(st); return r; }; }
})(typeof window !== 'undefined' ? window : globalThis);
