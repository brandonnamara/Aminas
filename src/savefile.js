/* Aminas — Phase 16B: save files (rules side, no DOM).
   Export writes the player's complete save into a small JSON file. Import reads a file, checks it thoroughly in a
   dry run (nothing changes until the player confirms), and keeps the replaced save in its own recovery slot, which
   ordinary saving never overwrites, so an import can always be undone.

   Accepted files: this export format; a raw save (the JSON the game stores); and the existing AMINAS1: backup codes.
   Older save schemas are migrated exactly as on load. The save schema itself is unchanged. */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const D = A.Data, S = A.State;
  const F = (A.SaveFile = {});
  F.FORMAT = 'aminas-save';
  F.FILE_VERSION = 1;
  F.MAX_BYTES = 4 * 1024 * 1024;               // a real save is ~10–60 KB; anything this large is not a save
  const RECOVER = () => D.SAVE_KEY + '-before-import';
  const ls = () => { try { return root.localStorage || null; } catch (e) { return null; } };

  // FNV-1a over the save's JSON: not security, just a check that the file was not cut short or edited by accident
  F.checksum = function (str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };
  const pad = (n) => (n < 10 ? '0' : '') + n;
  F.fileName = function (st, when) {
    const d = new Date(when || Date.now()), nm = String((st && st.avatar && st.avatar.name) || '').replace(/[^A-Za-z0-9_-]+/g, '').slice(0, 14);
    return 'aminas-save' + (nm ? '-' + nm : '') + '-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.json';
  };
  // A short, human description of a save (for the confirmation screen).
  F.summary = function (st) {
    if (!st) return null;
    const best = (st.aminas || []).reduce((m, a) => (a && a.lv > (m ? m.lv : 0) ? a : m), null);
    const dun = Object.keys(st.dungeon || {}).filter((k) => st.dungeon[k] && st.dungeon[k].clears > 0).length;
    return {
      name: (st.avatar && st.avatar.name) || '', rank: st.rank | 0, aminas: (st.aminas || []).length,
      best: best ? { sp: best.sp, name: D.SPECIES[best.sp] ? D.SPECIES[best.sp].name : best.sp, lv: best.lv } : null,
      starter: st.starter ? (D.SPECIES[st.starter] || {}).name || st.starter : null,
      gold: (st.res && st.res.gold) | 0, food: (st.res && st.res.food) | 0, gems: (st.res && st.res.gems) | 0,
      dungeons: dun, quests: Object.keys(st.missions || {}).filter((k) => st.missions[k] === 'claimed').length,
      items: (st.items || []).length, lastSaved: st.lastSaved || null,
    };
  };

  /* ---------- export ---------- */
  // Returns { ok, name, text, bytes } for the current save (or { ok:false, reason }).
  F.exportFile = function (st) {
    st = st || S.state;
    if (!st || !st.starter) return { ok: false, reason: 'no-game', msg: 'There is no game to export yet.' };
    const save = JSON.parse(JSON.stringify(st)), body = JSON.stringify(save), now = Date.now();
    const env = { format: F.FORMAT, fileVersion: F.FILE_VERSION, game: 'Aminas: Light & Shadow', gameVersion: D.VERSION, schema: S.SCHEMA,
      exportedAt: new Date(now).toISOString(), checksum: F.checksum(body), summary: F.summary(save), save };
    const text = JSON.stringify(env, null, 1);
    return { ok: true, name: F.fileName(st, now), text, bytes: text.length };
  };

  /* ---------- import: validate (dry run) ---------- */
  const no = (reason, msg) => ({ ok: false, reason, msg });
  // Reads file text and returns { ok, st, summary, kind, migratedFrom, exportedAt, warnings } without changing anything,
  // or { ok:false, reason, msg } with a plain explanation. Never throws.
  F.parse = function (text) {
    try {
      if (typeof text !== 'string') return no('unreadable', 'That file could not be read.');
      if (text.length > F.MAX_BYTES) return no('too-large', 'That file is far too large to be an Aminas save.');
      const t = text.replace(/^﻿/, '').trim();
      if (!t) return no('empty', 'That file is empty.');
      let data, kind, exportedAt = null, warnings = [];
      if (t.indexOf('AMINAS1:') === 0) {
        try {
          const b64 = t.slice(8).replace(/\s+/g, '');
          const json = typeof atob === 'function' ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, 'base64').toString('utf8');
          data = JSON.parse(json); kind = 'code';
        } catch (e) { return no('bad-code', 'That backup code is damaged or incomplete.'); }
      } else {
        let j; try { j = JSON.parse(t); } catch (e) { return no('not-json', 'That file is not an Aminas save (it is not a save file, or it is damaged).'); }
        if (!j || typeof j !== 'object' || Array.isArray(j)) return no('not-save', 'That file is not an Aminas save.');
        if (j.format === F.FORMAT) {
          if ((j.fileVersion | 0) > F.FILE_VERSION) return no('newer-file', 'That save file was made by a newer version of Aminas. Update the game, then try again.');
          if (!j.save || typeof j.save !== 'object') return no('no-save', 'That save file has no save inside it.');
          if (j.checksum && F.checksum(JSON.stringify(j.save)) !== j.checksum) return no('checksum', 'That save file has been changed or damaged since it was exported, so it was not loaded.');
          data = j.save; kind = 'file'; exportedAt = j.exportedAt || null;
        } else if (j.format) return no('not-save', 'That file is not an Aminas save.');
        else { data = j; kind = 'raw'; }
      }
      if (!data || typeof data !== 'object' || !Array.isArray(data.aminas) || !data.res || typeof data.res !== 'object') return no('not-save', 'That file is not an Aminas save.');
      if ((data.schema | 0) > S.SCHEMA) return no('newer-schema', 'That save is from a newer version of Aminas (save version ' + (data.schema | 0) + '; this game reads up to ' + S.SCHEMA + ').');
      let res; try { res = S.hydrate(data); } catch (e) { return no('invalid', 'That save could not be loaded: ' + (e && e.message ? e.message : 'it is not valid') + '.'); }
      const st = res.st;
      if (!st.starter || !st.aminas.length) return no('no-game', 'That save has no game in it yet (no starter Amina).');
      const lost = (data.aminas || []).length - st.aminas.length;
      if (lost > 0) warnings.push(lost + ' damaged Amina entr' + (lost === 1 ? 'y was' : 'ies were') + ' left out.');
      if (res.from < S.SCHEMA) warnings.push('This save was made by an older version and will be updated.');
      return { ok: true, st, kind, summary: F.summary(st), migratedFrom: res.from < S.SCHEMA ? res.from : null, exportedAt, warnings };
    } catch (e) { return no('unreadable', 'That file could not be read.'); }
  };

  /* ---------- import: apply (after the player confirms) ---------- */
  // Keeps the save being replaced in the recovery slot, then makes the imported save the current one.
  F.apply = function (parsed) {
    if (!parsed || !parsed.ok || !parsed.st) return { ok: false, reason: 'invalid' };
    const store = ls(); if (!store) return { ok: false, reason: 'storage-unavailable', msg: 'This browser is not allowing the game to save.' };
    try {
      const cur = store.getItem(D.SAVE_KEY);
      if (cur) store.setItem(RECOVER(), JSON.stringify({ at: Date.now(), summary: (() => { try { return F.summary(JSON.parse(cur)); } catch (e) { return null; } })(), raw: cur }));
    } catch (e) { return { ok: false, reason: 'backup-failed', msg: 'The game could not keep a copy of your current save, so nothing was changed.' }; }
    S.state = parsed.st;
    if (!S.save()) return { ok: false, reason: 'save-failed', msg: 'The imported save could not be written.' };
    return { ok: true };
  };
  // The save kept from before the last import, if any: { at, summary } (without its data).
  F.recovery = function () {
    const store = ls(); if (!store) return null;
    try { const r = JSON.parse(store.getItem(RECOVER()) || 'null'); return r && r.raw ? { at: r.at, summary: r.summary } : null; } catch (e) { return null; }
  };
  // Puts the pre-import save back. The save being replaced becomes the new recovery copy, so undo can itself be undone.
  F.undoImport = function () {
    const store = ls(); if (!store) return { ok: false, reason: 'storage-unavailable' };
    let r; try { r = JSON.parse(store.getItem(RECOVER()) || 'null'); } catch (e) { r = null; }
    if (!r || !r.raw) return { ok: false, reason: 'none', msg: 'There is no earlier save to restore.' };
    const p = F.parse(r.raw); if (!p.ok) return { ok: false, reason: 'damaged', msg: 'The earlier save could not be read.' };
    return F.apply(p);
  };
})(typeof window !== 'undefined' ? window : globalThis);
