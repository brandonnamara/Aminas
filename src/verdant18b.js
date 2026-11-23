/* Aminas — Phase 18B: the Verdant Wilds under construction (rules and data, no DOM).
   The approved concept (Phase 18A: the Overgrown Commonwealth with the Elder Root) is built into the existing
   Verdant map. Nothing here moves a cell, an obstacle or a building, and nothing here makes a battle reachable:
     - landmarks:  story places drawn over cells that cannot be built on (sand, path, water, bridge, the old landmark
                   slot), with an interaction each, voiced by the Entity;
     - gates:      the entrances of the ten planned dungeons, in order. Each one is 'locked' (the one before is not
                   cleared), 'sealed' (its turn has come but its battles are not built) or 'open'. A gate opens only
                   when D.V18.live is true AND a playable D.DUNGEONS entry with its id exists, so in this build every
                   gate is locked or sealed and nothing can be entered;
     - explore:    three Verdant areas using existing species, each opened by its gate's dungeon (so locked for now);
     - islands:    D.ISLAND_LIVE marks Obsidian Reach and the Celestial Crown as not ready. Travel, unlocking and quest
                   pointers respect it; saves keep every unlock, obstacle and quest record untouched, and setting the
                   flag to true later is the whole activation (no migration needed).
   Save data: st.v18 = { seen: { siteId: firstVisitTime } }. Everything else is derived. */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = A.Data, R = A.Rules, W = A.World;
  const now = () => Date.now();

  /* ---------- island readiness (future islands keep their data; they just cannot be visited yet) ---------- */
  D.ISLAND_LIVE = { starter: true, verdant: true, obsidian: false, celestial: false };
  W.islandLive = (id) => !!D.ISLANDS[id] && D.ISLAND_LIVE[id] !== false;

  /* ---------- the Verdant Wilds: landmarks, gates and explore areas ---------- */
  // Every cell listed here is sand, path, water, bridge or the old landmark slot: never buildable grass ('g'), so no
  // player building can stand on one. Tests check this against the map.
  D.V18 = {
    live: true, // the campaign switch: on since Phase 18C, with the ten playable dungeons in campaign-data.js
    island: 'verdant',
    sites: [
      { id: 'landing', kind: 'v_landing', name: 'Landing Cove', x: 16, y: 28, w: 1, h: 1, role: 'arrival',
        text: 'A flat stone at the end of the beach path, worn smooth by a great many feet. Not all of them had shoes.',
        entity: 'The Wilds. Mind the roots. They were here first, and they have never let anyone forget it.' },
      { id: 'settle', kind: 'v_settle', name: 'The Overgrown Settlement', x: 12, y: 28, w: 4, h: 1, role: 'story',
        text: 'Walls of fitted stone under the moss. Doorways of two heights: tall ones, and beside them small steps cut for little feet. People and Aminas lived here, side by side.',
        entity: 'Somebody built steps here. Lots of steps. People never build steps to nowhere. Well. Rarely.' },
      { id: 'settle2', kind: 'v_settle2', name: 'The Overgrown Settlement', x: 17, y: 28, w: 3, h: 1, role: 'story', part: 'settle',
        text: 'A shared hearth, big enough for a family and whatever the family had adopted. Two bowls sit by it: one deep, one wide.',
        entity: 'Two bowls. Either they had guests, or someone was spoiled. I have my suspicions.' },
      { id: 'aqueduct', kind: 'v_aqueduct', name: 'The Aqueduct', x: 25, y: 7, w: 1, h: 4, role: 'landmark',
        text: 'Stone arches carry the east stream across the island, and it still runs. You can see them from almost anywhere: follow them and you will not get lost.',
        entity: 'Plumbing. The surest sign of civilisation, and the least celebrated.' },
      { id: 'aqueduct2', kind: 'v_aqueductw', name: 'The Aqueduct', x: 20, y: 11, w: 5, h: 1, role: 'landmark', part: 'aqueduct',
        text: 'The channel turns west here and drops, a step at a time, towards the middle of the island.',
        entity: 'Water going exactly where someone told it to. I find that very restful.' },
      { id: 'archive', kind: 'v_archive', name: 'The Ivy Archive', x: 14, y: 2, w: 4, h: 1, role: 'story',
        text: 'Shelves of stone tablets on the north shore, filed under a blanket of ivy. The writing is patient and very old. Reading it properly will take time, and a way inside.',
        entity: 'A library. Out here. Somebody had ambitions.' },
      { id: 'shrine', kind: 'v_shrine', name: 'The Twin Shrine', x: 17, y: 13, w: 1, h: 3, role: 'story',
        text: 'A small temple split down the middle by the stream: one half pale stone, the other dark glass, a footbridge between them. The carved panels are too overgrown to read. Not yet.',
        entity: 'Two halves. Very symbolic. Somebody clearly paid their architect by the metaphor.' },
      { id: 'choir', kind: 'v_choir', name: 'The Standing Stone Choir', x: 29, y: 12, w: 1, h: 3, role: 'story',
        text: 'Pale standing stones on the east shore, like the ones at home. They hum when the wind is right. Stand still long enough and the hum seems to leave a gap, as if one voice were missing.',
        entity: 'Stones hum. It is the wind. Probably. Let us not stand here too long.' },
      { id: 'elderroot', kind: 'elderroot', name: 'The Elder Root', x: 21, y: 20, w: 3, h: 3, role: 'landmark', slot: true,
        text: 'The oldest thing on the island. Every stream bends towards it. There is a door between its roots, and it is shut from the inside.',
        entity: 'It was here first. It would like you to know that.' },
    ],
    // The ten dungeons of Phase 18A, in order. rec: recommended level (Band C). cell: the entrance (non-buildable).
    gates: [
      { id: 'v_mossgate', n: 1, name: 'Mossgate Steps', rec: 22, el: 'earth', x: 16, y: 24, theme: 'Root-lifted stairs climbing from the landing to the first terrace.', plan: 'The Moss Bastion' },
      { id: 'v_aqueduct', n: 2, name: 'Drowned Aqueduct', rec: 24, el: 'water', x: 25, y: 11, theme: 'Sluices and flooded channels under the arches.', plan: 'The Sluice Warden' },
      { id: 'v_spore', n: 3, name: 'Spore Hollow', rec: 25, el: 'nature', x: 12, y: 11, theme: 'A glade where the glowcaps breathe.', plan: 'The Spore Mother' },
      { id: 'v_archive', n: 4, name: 'Ivy Archive', rec: 27, el: 'metal', x: 14, y: 2, site: 'archive', theme: 'The vaults beneath the shelves.', plan: 'The Archivist' },
      { id: 'v_glow', n: 5, name: 'Glowworm Terraces', rec: 28, el: 'fire', x: 13, y: 19, theme: 'Terraces of lanterns, two kinds side by side.', plan: 'The Lantern Wyrm' },
      { id: 'v_twinshrine', n: 6, name: 'Twin Shrine', rec: 30, el: 'light', x: 17, y: 14, site: 'shrine', theme: 'The halls under the split temple.', plan: 'The Dawn Warden' },
      { id: 'v_canopy', n: 7, name: 'Canopy Walk', rec: 31, el: 'wind', x: 20, y: 3, theme: 'Rope bridges through the northern treetops.', plan: 'The Canopy Squall' },
      { id: 'v_moonwell', n: 8, name: 'Moonwell', rec: 33, el: 'water', x: 4, y: 20, theme: 'A grotto under the west lake.', plan: 'The Moonwell Serpent' },
      { id: 'v_choir', n: 9, name: 'Choir of Roots', rec: 34, el: 'resonance', x: 26, y: 17, theme: 'Down among the roots of the singing stones.', plan: 'The Third Voice' },
      { id: 'v_elderroot', n: 10, name: 'Elder Root', rec: 36, el: 'nature', x: 22, y: 22, site: 'elderroot', boss: true, theme: 'Inside the oldest tree. The Island Boss waits here.', plan: 'The Forest Crown' },
    ],
  };
  const G = {}; D.V18.gates.forEach((g, i) => { G[g.id] = g; g.prev = i ? D.V18.gates[i - 1].id : null; });
  const SITE = {}; D.V18.sites.forEach((s) => { SITE[s.id] = s; });

  /* ---------- explore areas (existing species only; opened by their dungeon) ---------- */
  Object.assign(D.AREAS, {
    glowcap: { name: 'Glowcap Glade', island: 'verdant', blurb: 'Mushroom light under old trees. Something in the moss is watching, politely.', unlock: { island: 'verdant' }, // Phase 18C: open on arrival (approved)
      steps: [['res', 30, 7], ['find', 'terraflora2'], ['res', 32, 7], ['find', 'sylvaneer2'], ['res', 34, 8], ['find', 'berrant']] },
    streamside: { name: 'Streamside', island: 'verdant', blurb: 'Where the aqueduct spills into the wild streams. Mind the slippery stones.', unlock: { v18: 'v_aqueduct' },
      steps: [['res', 32, 7], ['find', 'aquaflora2'], ['res', 34, 8], ['find', 'tidalong'], ['res', 36, 8], ['find', 'reefback']] },
    canopyedge: { name: 'Canopy Edge', island: 'verdant', blurb: 'The top of the northern woods, where the wind lives.', unlock: { v18: 'v_canopy' },
      steps: [['res', 36, 8], ['find', 'aeolus'], ['res', 38, 8], ['find', 'pyrohawk'], ['res', 40, 9], ['find', 'stormbringer']] },
  });
  // keep only species that exist (the data file is the authority; no new species are ever introduced here)
  ['glowcap', 'streamside', 'canopyedge'].forEach((id) => { const a = D.AREAS[id]; a.steps = a.steps.filter((s) => s[0] !== 'find' || D.SPECIES[s[1]]); if (D.AREA_ORDER.indexOf(id) < 0) D.AREA_ORDER.push(id); });
  if (R.AREA_LV) Object.assign(R.AREA_LV, { glowcap: 18, streamside: 20, canopyedge: 24 });
  // Verdant areas are listed on the Explore screen once the island has been reached
  R.areaListed = (st, id) => { const a = D.AREAS[id]; return !!a && (!a.island || W.islandUnlocked(st, a.island)); };

  /* ---------- gates ---------- */
  const V = (R.V18 = {});
  V.gate = (id) => G[id] || null;
  V.site = (id) => SITE[id] || null;
  V.built = (id) => { const d = D.DUNGEONS[id]; return !!(D.V18.live && d && d.playable && d.island === D.V18.island); };
  V.cleared = (st, id) => !!(D.DUNGEONS[id] && R.dungeonCleared(st, id));
  // 'locked' | 'sealed' | 'open', with the reason in words (never claims anything can be entered when it cannot)
  V.gateState = function (st, id) {
    const g = G[id]; if (!g) return { state: 'locked', text: 'Unknown.' };
    if (!W.islandUnlocked(st, D.V18.island)) return { state: 'locked', text: 'Reach the Verdant Wilds first.' };
    if (g.prev && !V.cleared(st, g.prev)) return { state: 'locked', text: 'Opens after the ' + G[g.prev].name + ' (Dungeon ' + G[g.prev].n + ').' };
    if (!V.built(id)) return { state: 'sealed', text: 'The way is grown shut. Whatever waits inside is not ready for visitors yet.' };
    return { state: 'open', text: 'Recommended level ' + g.rec + '.' };
  };
  V.canEnter = (st, id) => V.gateState(st, id).state === 'open';
  V.gates = (st) => D.V18.gates.map((g) => Object.assign({ id: g.id, n: g.n, name: g.name, rec: g.rec }, V.gateState(st, g.id)));

  /* ---------- requirements: island and Verdant gate ---------- */
  const reqMet0 = R.reqMet;
  R.reqMet = function (st, req) {
    if (req && req.island && !W.islandUnlocked(st, req.island)) return false;
    if (req && req.v18 && !V.cleared(st, req.v18)) return false;
    const rest = req && (req.island || req.v18) ? Object.assign({}, req, { island: undefined, v18: undefined }) : req;
    return reqMet0.call(this, st, rest);
  };
  const reqText0 = W.reqText;
  W.reqText = function (req) {
    const base = reqText0.apply(this, arguments) || '';
    if (req && req.v18 && G[req.v18]) return (base ? base + ' ' : '') + 'Opens with the ' + G[req.v18].name + ' (Dungeon ' + G[req.v18].n + '), which is not open yet.';
    if (req && req.island && D.ISLANDS[req.island]) return (base ? base + ' ' : '') + 'Reach the ' + D.ISLANDS[req.island].name + ' first.';
    return base;
  };

  /* ---------- no way into an unfinished Verdant battle, whatever calls it ---------- */
  const startRun0 = R.startRun;
  R.startRun = function (st, id) {
    if (G[id] && !V.canEnter(st, id)) return { ok: false, reason: 'locked', text: V.gateState(st, id).text };
    return startRun0.apply(this, arguments);
  };

  /* ---------- story interactions ---------- */
  V.visit = function (st, siteId) {
    const s = SITE[siteId] || null, g = G[siteId] || null; if (!s && !g) return { ok: false, reason: 'invalid' };
    st.v18 = st.v18 && typeof st.v18 === 'object' ? st.v18 : { seen: {} }; st.v18.seen = st.v18.seen || {};
    const first = !st.v18.seen[siteId]; if (first) st.v18.seen[siteId] = now();
    if (first && R.emit) R.emit('v18visit', { id: siteId });
    return { ok: true, first };
  };
  V.seen = (st, id) => !!(st.v18 && st.v18.seen && st.v18.seen[id]);
  V.progress = (st) => { const ids = D.V18.sites.filter((s) => !s.part).map((s) => s.id); return { seen: ids.filter((id) => V.seen(st, id)).length, total: ids.length }; };

  /* ---------- Phase 18C: the Twin Shrine's gift (optional, once) ----------
     After the Twin Shrine is first cleared, the shrine offers the second form of the starter you did not choose
     (Solarbloom or Duskmantle). Your own starter is never touched. If you already have that form, the shrine offers its
     element's essence and gems instead. Claiming is never needed to finish the campaign. Older saves without a recorded
     starter are judged by the line they own. Recorded in st.v18.gift so it can never be claimed twice. */
  D.V18.gift = { lv: 26, of: { lumifern: 'duskmantle', umbrit: 'solarbloom' }, alt: { essence: 40, gems: 8 } };
  V.starterOf = function (st) {
    if (st.starter === 'lumifern' || st.starter === 'umbrit') return st.starter;
    const own = (line) => (D.LINES[line] ? D.LINES[line].ids : []).some((id) => st.owned && st.owned[id]);
    const L = own(D.SPECIES.lumifern.line), U = own(D.SPECIES.umbrit.line);
    return L && !U ? 'lumifern' : U && !L ? 'umbrit' : 'lumifern';
  };
  V.giftOffer = function (st) {
    if (!D.DUNGEONS.v_twinshrine || !R.dungeonCleared(st, 'v_twinshrine')) return { state: 'locked' };
    if (st.v18 && st.v18.gift) return { state: 'claimed', got: st.v18.gift };
    const sp = D.V18.gift.of[V.starterOf(st)], owned = !!(st.owned && st.owned[sp]);
    return { state: 'ready', sp, kind: owned ? 'alt' : 'amina', el: D.SPECIES[sp].el, essence: D.V18.gift.alt.essence, gems: D.V18.gift.alt.gems, lv: D.V18.gift.lv };
  };
  V.claimGift = function (st) {
    const o = V.giftOffer(st); if (o.state !== 'ready') return { ok: false, reason: o.state };
    st.v18 = st.v18 || { seen: {} };
    if (o.kind === 'amina') {
      const inst = R.addAmina(st, o.sp, o.lv); if (!inst) return { ok: false, reason: 'full' };
      st.v18.gift = { t: now() || 1, kind: 'amina', sp: o.sp, uid: inst.uid };
      if (R.emit) R.emit('v18gift', { sp: o.sp }); return { ok: true, kind: 'amina', sp: o.sp, inst };
    }
    if (R.Essence && R.Essence.gain) R.Essence.gain(st, o.el, o.essence, 'shrine'); R.addRes(st, { gems: o.gems });
    st.v18.gift = { t: now() || 1, kind: 'alt', sp: o.sp, el: o.el, essence: o.essence, gems: o.gems };
    if (R.emit) R.emit('v18gift', { alt: true }); return { ok: true, kind: 'alt', el: o.el, essence: o.essence, gems: o.gems };
  };

  /* ---------- Phase 18C: the arrival scene, once (also for saves that reached the island before 18C) ---------- */
  V.arrivalDue = (st) => !!(D.V18.live && st && W.islandUnlocked(st, D.V18.island) && st.currentIsland === D.V18.island && !(st.story && st.story.scenes && st.story.scenes.v_arrival) && !(st.story && st.story.pendingScene));
  V.queueArrival = function (st) { if (!V.arrivalDue(st)) return false; st.story = st.story || {}; st.story.pendingScene = 'v_arrival'; return true; };
  if (R.on) R.on((ev) => { if (ev.name === 'traveled' && ev.data && ev.data.island === D.V18.island) { const st = A.State && A.State.state; if (st) V.queueArrival(st); } });

  /* ---------- Phase 18C: each Verdant dungeon's first-clear item (existing items that had no source yet) ---------- */
  if (D.DUNGEON_GEAR) Object.assign(D.DUNGEON_GEAR, { v_mossgate: 'ironbark', v_aqueduct: 'tideplate', v_spore: 'heartmail', v_archive: 'stoneclub', v_glow: 'blazefang',
    v_twinshrine: 'eclipseorb', v_canopy: 'galeplume', v_moonwell: 'moonpearl', v_choir: 'chorusshell', v_elderroot: 'elderguard' });

  /* ---------- island readiness: travel, unlocks and quest pointers ---------- */
  const travel0 = W.travel;
  W.travel = function (st, id) {
    if (D.ISLANDS[id] && !W.islandLive(id)) return { ok: false, reason: 'notready', text: D.ISLANDS[id].name + ' is not ready to visit yet.' };
    return travel0.apply(this, arguments);
  };
  const byBoss0 = W.unlockByBoss;
  // the usual answers come first ('already', 'boss'); 'notready' only when the island could otherwise be opened
  const notReady = (st, id) => D.ISLANDS[id] && !W.islandLive(id) && !W.islandUnlocked(st, id) && W.islandUnlockAllowed(st, id);
  W.unlockByBoss = function (st, id) { if (notReady(st, id)) return { ok: false, reason: 'notready' }; return byBoss0.apply(this, arguments); };
  const unlock0 = W.unlockIsland;
  W.unlockIsland = function (st, id) { if (notReady(st, id)) return { ok: false, reason: 'notready' }; return unlock0.apply(this, arguments); };
  if (A.Quests && A.Quests.islandReachable) {
    const reach0 = A.Quests.islandReachable;
    A.Quests.islandReachable = function (st, iid) { if (D.ISLANDS[iid] && !W.islandLive(iid)) return false; return reach0.apply(this, arguments); };
  }

  /* ---------- saves ---------- */
  // A save standing on an island that is not ready yet (only possible for saves that unlocked it in an older build)
  // is moved to the last ready island it has unlocked. Its unlock records, obstacles and buildings stay as they were.
  V.settle = function (st) {
    if (!st) return st;
    if (!st.v18 || typeof st.v18 !== 'object') st.v18 = { seen: {} };
    if (!st.v18.seen || typeof st.v18.seen !== 'object') st.v18.seen = {};
    Object.keys(st.v18.seen).forEach((k) => { if (!SITE[k] && !G[k]) delete st.v18.seen[k]; else st.v18.seen[k] = +st.v18.seen[k] || 1; });
    if (st.currentIsland && !W.islandLive(st.currentIsland)) st.currentIsland = W.islandUnlocked(st, 'verdant') ? 'verdant' : 'starter';
    // a save whose Island Boss fell while the next island was not ready gets that island once it is marked ready
    D.ISLAND_ORDER.forEach((iid) => { const c = D.CAMPAIGN[iid]; if (c && c.next && W.islandLive(c.next) && !W.islandUnlocked(st, c.next) && R.islandBossDefeated(st, iid)) W.unlockByBoss(st, c.next); });
    if (st.v18.gift && typeof st.v18.gift !== 'object') st.v18.gift = { t: 1, kind: 'unknown' };
    V.queueArrival(st);
    return st;
  };
  if (A.State && A.State.sanitize) { const san0 = A.State.sanitize; A.State.sanitize = function (st) { const r = san0.apply(this, arguments); V.settle(st); return r; }; }
})(typeof window !== 'undefined' ? window : globalThis);
