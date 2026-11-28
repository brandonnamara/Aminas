/* Aminas — Phase 20C: the Celestial Crown campaign on screen. The arrival scene, the Threshold's confrontation before
   its first entry, the campaign-completion screen after the ending, a "main story complete" mark on the island map and
   in the Journal, and the observatory's two quiet moments (the empty mount, and the Watcher's Lens for those who own it).
   Scenes never grant anything; the completion screen only reports what the save already holds. */
(function (root) {
  'use strict';
  const A = root.A, D = A.Data, R = A.Rules, S = A.State, W = A.World, UI = A.UI, Au = A.Audio;
  const { esc } = UI.h, I = A.Art.icon;
  const st = () => S.state;
  const C = R.C20;

  /* ---------- the arrival (after the island's own arrival lines, as Obsidian's) ---------- */
  const tr0 = UI.travelTo;
  if (tr0) UI.travelTo = function (iid) {
    const r = tr0.apply(this, arguments); const s = st();
    if (r !== false && s.story && s.story.pendingScene === 'c_arrival' && !UI.sceneBox) setTimeout(() => {
      if (UI.screen === 'island' && s.story.pendingScene === 'c_arrival' && !UI.sceneBox && !UI.queue.some((x) => x.c20arrival)) { UI.queue.push({ type: 'fn', c20arrival: true, fn: (done) => { if (s.story.pendingScene === 'c_arrival' && !UI.sceneBox) UI.playScene('c_arrival', () => done()); else done(); } }); UI.pump(); }
    }, 500);
    return r;
  };

  /* ---------- the Threshold: the confrontation plays before the party picker, the first time ---------- */
  const enter0 = UI.acts && UI.acts.enterDungeon;
  if (enter0) UI.acts.enterDungeon = function (el) {
    const s = st(), id = el && el.dataset && el.dataset.id;
    if (id === 'c_threshold' && !(s.story && s.story.scenes && s.story.scenes.c_door) && A.Scenes.get('c_door') && R.dungeonUnlocked(s, id)) { UI.playScene('c_door', () => enter0.call(this, el)); return; }
    return enter0.apply(this, arguments);
  };

  /* ---------- the campaign-completion screen (once, after the ending scene) ---------- */
  UI.c20Complete = function (opts) {
    const s = st(); if (!C.complete(s)) return null;
    const isl = D.ISLAND_ORDER.filter((k) => D.CAMPAIGN[k] && D.CAMPAIGN[k].dungeons.length);
    const all = [].concat(...isl.map((k) => D.CAMPAIGN[k].dungeons)), cleared = all.filter((id) => R.dungeonCleared(s, id)).length;
    const battles = all.reduce((n, id) => n + D.DUNGEONS[id].battles.length, 0);
    const emblem = R.items(s).some((x) => x.id === 'keeperemblem');
    const rows = [
      [I('map'), 'Islands mended', isl.map((k) => D.ISLANDS[k].name).join(' · ')],
      [I('swords'), 'Campaign dungeons cleared', cleared + ' of ' + all.length + ' (' + battles + ' battles)'],
      [I('star'), 'Kind Souls befriended', R.ownedCount(s) + ' kinds'],
      [I('gem'), 'Keeper’s Emblem', emblem ? 'In your bag: “Two keys. One purpose.”' : 'Not in your bag'],
    ];
    const body = '<div class="c20-done"><p class="c20-done-lede">The Keepers’ Door is whole again. The main story of Aminas: Light &amp; Shadow is complete.</p>' +
      rows.map((r) => '<div class="c20-done-row">' + r[0] + '<b>' + esc(r[1]) + '</b><span>' + esc(r[2]) + '</span></div>').join('') +
      '<p class="muted small-t">Nothing ends here. Every island, dungeon, quest and side mode is still yours: replay any dungeon, keep raising, breeding and evolving Aminas, and build on all four islands.</p></div>';
    Au && Au.play && Au.play('finalwin');
    return UI.modal(UI.sheet(I('crown') + ' Main story complete', body, '<button class="btn gold" data-act="close">Continue</button>', 'narrow c20-done-sheet'), { onClose: () => { if (!opts || !opts.replay) { const c = st().c20; if (c) delete c.celebrate; S.save && S.save(); } } });
  };
  const celebrateLater = () => setTimeout(() => {
    const s = st(); if (!s || !s.c20 || !s.c20.celebrate || UI.screen !== 'island') return;
    if (UI.sceneBox || UI.modalOpen() || document.querySelector('.dlg') || (s.story && s.story.pendingScene)) { celebrateLater(); return; }
    UI.c20Complete();
  }, 900);
  const show0 = UI.showIsland;
  if (show0) UI.showIsland = function () { const r = show0.apply(this, arguments); celebrateLater(); return r; };

  /* ---------- "main story complete" marks: the island map and the Journal ---------- */
  const mark = () => '<div class="c20-mark">' + I('crown') + ' <b>Main story complete</b> <button class="btn small ghost" data-act="c20Done">Summary</button></div>';
  const map0 = UI.islandMap;
  if (map0) UI.islandMap = function () { const r = map0.apply(this, arguments); try { if (C.complete(st())) { const ov = r && r.nodeType === 1 ? r : [...document.querySelectorAll('#modal-root .overlay')].pop(), at = ov && (ov.querySelector('.sheet > .sbody, .sheet .body, .sheet') || ov); if (at && !at.querySelector('.c20-mark')) at.insertAdjacentHTML('afterbegin', mark()); } } catch (e) { /* the map still works */ } return r; };
  const jr0 = UI.journal;
  if (jr0) UI.journal = function () { const r = jr0.apply(this, arguments); try { if (C.complete(st())) { const ov = r && r.nodeType === 1 ? r : [...document.querySelectorAll('#modal-root .overlay')].pop(), at = ov && ov.querySelector('.journal'); if (at && !ov.querySelector('.c20-mark')) at.insertAdjacentHTML('beforebegin', mark()); } } catch (e) { /* the Journal still works */ } return r; };
  UI.act('c20Done', () => { UI.closeAll(); UI.c20Complete({ replay: true }); });

  /* ---------- the observatory's quiet moments ---------- */
  const open0 = UI.c20Open;
  if (open0) UI.c20Open = function (id) {
    const ov = open0.apply(this, arguments), s = st();
    if (ov && id === 'observatory') {
      const at = ov.querySelector('.v18-gate') || ov.querySelector('.v18-way');
      let h = '';
      if (s.story && s.story.scenes && s.story.scenes.c_mount) h += '<button class="btn small ghost" data-act="c20Mount">' + I('book') + ' The empty mount</button>';
      if (C.lensReady(s)) h += '<button class="btn small gold" data-act="c20Lens">' + I('star') + ' Hold the Watcher’s Lens to the mount</button>';
      if (h && at) at.insertAdjacentHTML('beforebegin', '<div class="row-actions c20-mount">' + h + '</div>');
    }
    return ov;
  };
  UI.act('c20Mount', () => { UI.closeAll(); UI.playScene('c_mount', () => {}, { replay: true }); });
  UI.act('c20Lens', () => { const s = st(), r = C.lensMoment(s); if (!r.ok) { Au && Au.play && Au.play('no'); return; } S.save && S.save(); UI.closeAll(); UI.playScene(r.scene, () => {}, { replay: !r.first }); });
})(typeof window !== 'undefined' ? window : globalThis);
