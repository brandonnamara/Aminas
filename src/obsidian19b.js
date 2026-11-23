/* Aminas — Phase 19B: Obsidian Reach, the Cooling Forge (world construction; no campaign yet).
   Glasswick (the kilnworkers' square), the island's landmarks and its ten dungeon entrances as data, with the same
   rules the Verdant Wilds uses (src/verdant18b.js): places can be visited and remembered, entrances show their state in
   order, and nothing can start a battle on this island until the campaign switch (D.O19.live) is on and the dungeons
   exist as playable data. Neither is true in this build.
   Save safety: every cell used here is sand, path, ridge or the forge's landmark slot, never buildable grass, and none
   touches an obstacle (tests check both against the map and every obstacle footprint), so no obstacle, map cell or
   player building is moved. The island stays closed to normal play (D.ISLAND_LIVE.obsidian is false); the developer
   panel offers a construction preview. New save data: st.o19 = { seen: { <place>: time } }, cleaned on load. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, W = A.World;
  const now = () => (R.now ? R.now() : Date.now());

  D.O19 = {
    live: false, // the campaign switch: off until the ten dungeons are playable (Phase 19C/19D)
    island: 'obsidian',
    sites: [
      { id: 'landing', kind: 'o_landing', name: 'Black Sand Landing', x: 16, y: 28, w: 1, h: 1, role: 'arrival',
        text: 'A jetty of black basalt on warm black sand. Iron rings for mooring, worn bright. The air smells of cold ash and something sweeter, like hot glass.',
        entity: 'Don’t lick anything. I did say.' },
      { id: 'glasswick', kind: 'o_glasswick', name: 'Glasswick', x: 11, y: 18, w: 5, h: 1, role: 'hub',
        text: 'The kilnworkers’ square, where every path on the island meets. Benches of fused glass, a well with an iron hood, a notice board nobody has written on in a very long time. Two sets of hooks by every door: high ones, and low ones for smaller hands.',
        entity: 'A square. Somebody liked meetings. I have never understood the appeal.' },
      { id: 'glasswick2', kind: 'o_workshops', name: 'Glasswick', x: 7, y: 17, w: 4, h: 1, role: 'hub', part: 'glasswick',
        text: 'Workshop ruins along the west road: glassblowers’ benches, moulds stacked like plates, a long cooling rack. Scorch marks on the floor in the shape of a resting Amina, where one must have kept a furnace warm.',
        entity: 'A furnace that breathes. Very efficient. Very warm. I would not have stood that close.' },
      { id: 'gallery', kind: 'o_gallery', name: 'The Mirror Gallery', x: 15, y: 14, w: 4, h: 1, role: 'landmark',
        text: 'A long hall on the central ridge where finished panes once hung to be judged. The doors are sealed. Through the dusty glass you can see your own reflection, and behind it, rows of empty frames.',
        entity: 'A gallery of mirrors. Somebody wanted to be very sure of what they had made.' },
      { id: 'bellows', kind: 'o_bellows', name: 'The Great Bellows', x: 22, y: 19, w: 4, h: 1, role: 'landmark',
        text: 'Leather lungs the size of houses on the east ridge, iron-ribbed, joined to the forge by long clay pipes. When the wind is right they sigh, very slowly, all together.',
        entity: 'It breathes. Forges are like that. Please stop listening to it.' },
      { id: 'forge', kind: 'o_greatforge', name: 'The Great Forge', x: 22, y: 7, w: 3, h: 3, role: 'landmark', slot: true,
        text: 'The heart of the island: a forge as big as a hall, cold everywhere but its core, which glows behind iron doors that have not been opened in a very long time.',
        entity: 'Still warm. After all this time. I don’t like it when things are still warm.' },
    ],
    // The ten approved dungeons of Phase 19A, in order (docs/PHASE19A.md, section 4; recommended levels: the cap-50 band).
    gates: [
      { id: 'o_cinder', n: 1, name: 'Cinder Steps', rec: 38, el: 'fire', x: 16, y: 25, theme: 'Basalt steps from the black-sand landing up into the ash.' },
      { id: 'o_kilns', n: 2, name: 'Glasswick Kilns', rec: 39, el: 'fire', x: 16, y: 21, theme: 'Two rows of glass kilns, one fired pale, one fired dark.' },
      { id: 'o_rookery', n: 3, name: 'Basalt Rookery', rec: 40, el: 'wind', x: 8, y: 9, theme: 'Basalt columns honeycombed with nests.' },
      { id: 'o_quench', n: 4, name: 'Quench Pools', rec: 41, el: 'water', x: 12, y: 13, theme: 'Steaming pools where hot glass was cooled.' },
      { id: 'o_seams', n: 5, name: 'Deep Seams', rec: 42, el: 'metal', x: 21, y: 16, theme: 'Mine galleries under the central ridge.' },
      { id: 'o_gallery', n: 6, name: 'Mirror Gallery', rec: 43, el: 'dark', x: 17, y: 14, site: 'gallery', theme: 'The finishing hall, where every pane was judged.' },
      { id: 'o_hollows', n: 7, name: 'Magenta Hollows', rec: 44, el: 'resonance', x: 17, y: 5, theme: 'Crystal caves under the north cliffs.' },
      { id: 'o_orchard', n: 8, name: 'Charred Orchard', rec: 45, el: 'nature', x: 5, y: 17, theme: 'A burned orchard, still fruiting.' },
      { id: 'o_bellows', n: 9, name: 'Great Bellows', rec: 46, el: 'wind', x: 25, y: 21, theme: 'Inside the lungs that fed the forge.' },
      { id: 'o_forge', n: 10, name: 'Heart of the Forge', rec: 47, el: 'earth', x: 23, y: 9, site: 'forge', boss: true, theme: 'The forge’s core. The Island Boss waits here.' },
    ],
  };
  const G = {}; D.O19.gates.forEach((g, i) => { G[g.id] = g; g.prev = i ? D.O19.gates[i - 1].id : null; });
  const SITE = {}; D.O19.sites.forEach((s) => { SITE[s.id] = s; });

  /* ---------- explore areas (existing species; each opens with its dungeon, so none is open in this build) ---------- */
  Object.assign(D.AREAS, {
    ashplain: { name: 'Ash Plain', island: 'obsidian', blurb: 'Grey drifts between the basalt, warm underfoot. Things nest in the ash.', unlock: { o19: 'o_cinder' },
      steps: [['res', 44, 9], ['find', 'emberkai'], ['res', 46, 9], ['find', 'terraki'], ['res', 48, 10], ['find', 'pyroforge']] },
    glassbeach: { name: 'Glass Beach', island: 'obsidian', blurb: 'Sand fused into glass by old heat, ground smooth by the sea.', unlock: { o19: 'o_quench' },
      steps: [['res', 46, 9], ['find', 'reefback'], ['res', 48, 10], ['find', 'tidalong'], ['res', 50, 10], ['find', 'zeep2']] },
    crystalvein: { name: 'Crystal Vein', island: 'obsidian', blurb: 'A seam of magenta crystal that hums when you are not listening.', unlock: { o19: 'o_hollows' },
      steps: [['res', 50, 10], ['find', 'aimza2'], ['res', 52, 10], ['find', 'lumi2'], ['res', 54, 11], ['find', 'voltar2']] },
  });
  ['ashplain', 'glassbeach', 'crystalvein'].forEach((id) => { const a = D.AREAS[id]; a.steps = a.steps.filter((s) => s[0] !== 'find' || D.SPECIES[s[1]]); if (D.AREA_ORDER.indexOf(id) < 0) D.AREA_ORDER.push(id); });
  if (R.AREA_LV) Object.assign(R.AREA_LV, { ashplain: 36, glassbeach: 39, crystalvein: 42 });

  /* ---------- rules ---------- */
  const O = (R.O19 = {});
  O.gate = (id) => G[id] || null;
  O.site = (id) => SITE[id] || null;
  O.built = (id) => { const d = D.DUNGEONS[id]; return !!(D.O19.live && d && d.playable && d.island === D.O19.island); };
  O.cleared = (st, id) => !!(D.DUNGEONS[id] && R.dungeonCleared(st, id));
  // 'locked' | 'sealed' | 'open', with the reason in words (never claims anything can be entered when it cannot)
  O.gateState = function (st, id) {
    const g = G[id]; if (!g) return { state: 'locked', text: 'Unknown.' };
    if (!W.islandUnlocked(st, D.O19.island)) return { state: 'locked', text: 'Reach Obsidian Reach first.' };
    if (!g.prev && !R.islandBossDefeated(st, 'verdant')) return { state: 'locked', text: 'Opens after the Forest Crown, the Verdant Wilds’ Island Boss.' };
    if (g.prev && !O.cleared(st, g.prev)) return { state: 'locked', text: 'Opens after the ' + G[g.prev].name + ' (Dungeon ' + G[g.prev].n + ').' };
    if (!O.built(id)) return { state: 'sealed', text: 'The door is cold and shut. Whatever waits inside is not ready for visitors yet.' };
    return { state: 'open', text: 'Recommended level ' + g.rec + '.' };
  };
  O.canEnter = (st, id) => O.gateState(st, id).state === 'open';
  O.gates = (st) => D.O19.gates.map((g) => Object.assign({ id: g.id, n: g.n, name: g.name, rec: g.rec }, O.gateState(st, g.id)));

  const reqMet0 = R.reqMet;
  R.reqMet = function (st, req) {
    if (req && req.o19 && !O.cleared(st, req.o19)) return false;
    if (req && req.islandBoss && !R.islandBossDefeated(st, req.islandBoss)) return false; // Phase 19B: the Forge Habitat
    return reqMet0.call(this, st, req && (req.o19 || req.islandBoss) ? Object.assign({}, req, { o19: undefined, islandBoss: undefined }) : req);
  };
  const reqText0 = W.reqText;
  W.reqText = function (req) {
    const base = reqText0.apply(this, arguments) || '';
    if (req && req.o19 && G[req.o19]) return (base ? base + ' ' : '') + 'Opens with the ' + G[req.o19].name + ' (Dungeon ' + G[req.o19].n + '), which is not open yet.';
    return base;
  };
  // no way into an unfinished Obsidian battle, whatever calls it
  const startRun0 = R.startRun;
  R.startRun = function (st, id) {
    if (G[id] && !O.canEnter(st, id)) return { ok: false, reason: 'locked', text: O.gateState(st, id).text };
    return startRun0.apply(this, arguments);
  };

  /* ---------- places: visited once, remembered ---------- */
  O.visit = function (st, id) {
    if (!SITE[id] && !G[id]) return { ok: false, reason: 'invalid' };
    st.o19 = st.o19 && typeof st.o19 === 'object' ? st.o19 : { seen: {} }; st.o19.seen = st.o19.seen || {};
    const first = !st.o19.seen[id]; if (first) st.o19.seen[id] = now() || 1;
    if (first && R.emit) R.emit('o19visit', { id });
    return { ok: true, first };
  };
  O.seen = (st, id) => !!(st.o19 && st.o19.seen && st.o19.seen[id]);
  O.progress = (st) => { const ids = D.O19.sites.filter((s) => !s.part).map((s) => s.id); return { seen: ids.filter((id) => O.seen(st, id)).length, total: ids.length }; };

  /* ---------- the construction preview (developer panel only; never offered to normal players) ----------
     Opens the island for this session only (D.ISLAND_LIVE is not saved). If the save has never unlocked it, the preview
     unlocks it the way an old build's purchase did, so the island can be walked and built on; like every developer
     shortcut, "Reset save" in Settings clears it. On the next load the island is closed again and the save is moved
     back to a ready island, as for any save that unlocked it in an older build. */
  O.preview = function (st) {
    D.ISLAND_LIVE.obsidian = true; O.previewOn = true;
    if (!W.islandUnlocked(st, 'obsidian')) { st.islands.obsidian = st.islands.obsidian || { obstacles: {} }; Object.assign(st.islands.obsidian, { unlocked: true, unlockedAt: now() || 1, by: 'preview' }); if (!st.islands.obsidian.obstacles) st.islands.obsidian.obstacles = {}; }
    return { ok: true };
  };

  /* ---------- level cap: announce a raise once (old saves included) ---------- */
  O.capNotice = function (st) {
    if (!st) return null; st.o19 = st.o19 && typeof st.o19 === 'object' ? st.o19 : { seen: {} }; // kept inside st.o19: no new top-level save field
    const cap = R.levelCap(st), was = +st.o19.cap || D.CAP_BASE;
    if (cap > was) { st.o19.cap = cap; return cap; }
    if (!st.o19.cap) st.o19.cap = cap;
    return null;
  };

  /* ---------- saves ---------- */
  O.settle = function (st) {
    if (!st) return st;
    if (!st.o19 || typeof st.o19 !== 'object') st.o19 = { seen: {} };
    if (!st.o19.seen || typeof st.o19.seen !== 'object') st.o19.seen = {};
    Object.keys(st.o19.seen).forEach((k) => { if (!SITE[k] && !G[k]) delete st.o19.seen[k]; else st.o19.seen[k] = +st.o19.seen[k] || 1; });
    if (st.o19.cap != null) st.o19.cap = Math.max(D.CAP_BASE, Math.min(D.MAX_LEVEL, +st.o19.cap || D.CAP_BASE));
    delete st.capSeen; // the v45 construction preview stored this record at the top level
    return st;
  };
  if (A.State && A.State.sanitize) { const san0 = A.State.sanitize; A.State.sanitize = function (st) { const r = san0.apply(this, arguments); O.settle(st); return r; }; }
})(typeof window !== 'undefined' ? window : globalThis);
