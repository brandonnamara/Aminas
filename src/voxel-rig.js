/* Aminas — Phase 8B: rigging for the roster. Every body plan (quadruped, primate, dragon, biped, and the one-off
   builders) records its anatomy while it sculpts: which blocks are the head, each leg, the tail, the wings, where
   their joints are, where its eyes and mouth are. This pass finishes the job after the species' own dressing:
   - a decoration (tuft, flame, mane, crystal, leaves) joins the part it grows from; floating debris becomes an "aura"
     part that the 3D view lets drift slowly around the creature;
   - any block still without a part joins its nearest neighbour's part;
   - jaws are split from heads; eyelids are added in the hidden layer (they only appear while blinking);
   - joints become the model's pivots, so the 3D view builds it in parts (one skinned mesh) and animates them.
   Nothing visible changes: the same blocks, the same colours, so 2D portraits, cards and island critters are as before.
   The Phase 8 showcase models (Umbrit, Cannonis, Aimza) are built in parts by hand and are left alone. */
(function (root) {
  'use strict';
  const V = root.A && root.A.Voxel, K = V && V.kit; if (!V || !K) return;
  const R = Math.round, key = (x, y, z) => x + ',' + y + ',' + z;
  const NB = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

  // a body plan starts its rig before it sculpts; parts are tagged as they are drawn (see voxel.js keepParts)
  V.rigStart = function (m, plan) { m.keepParts = true; m.rig = { plan, joints: {}, eyes: [], jaws: [], emit: {}, spin: ['aura', 'halo'] }; m.part = 'core'; return m.rig; };
  V.joint = function (m, name, at, parent, o) { if (m.rig) m.rig.joints[name] = Object.assign({ at: [at[0], at[1], at[2]], parent: parent || null }, o || {}); };
  V.emit = function (m, name, at, parent) { if (m.rig) m.rig.emit[name] = { at: [at[0], at[1], at[2]], parent: parent || null }; };
  V.jaw = function (m, from, name, at, test) { if (m.rig) m.rig.jaws.push({ from, name, at: [at[0], at[1], at[2]], test }); };
  // draw with an explicit part; force: take blocks that another part claimed first (a torso drawn after its legs)
  V.inPart = function (m, name, fn, force) { const was = m.part, wf = m.partForce; m.part = name; if (force) m.partForce = true; try { return fn(); } finally { m.part = was; m.partForce = wf; } };

  // the part a decoration grows from: the tagged block at, or nearest to, its base point
  function partAt(m, p, maxR) {
    const x0 = R(p[0]), y0 = R(p[1]), z0 = R(p[2]);
    for (let r = 0; r <= (maxR || 6); r++) {
      let best = null, bd = 1e9;
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue;
        const v = m.v.get(key(x0 + dx, y0 + dy, z0 + dz)); if (!v || !v.p) continue;
        const d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = v.p; }
      }
      if (best) return best;
    }
    return null;
  }
  V.partAt = partAt;
  // decorations: while one draws, its new blocks join the part at its base (an explicit m.part always wins)
  const wrapAt = (name, baseOf) => { const f = K[name]; if (!f) return; K[name] = function (m) {
    if (!m || !m.rig || m.part) return f.apply(this, arguments);
    const b = baseOf(arguments), p = b && partAt(m, b); if (!p) return f.apply(this, arguments);
    m.part = p; try { return f.apply(this, arguments); } finally { m.part = null; } }; };
  wrapAt('tuft', (a) => a[1]); wrapAt('flame', (a) => a[1]); wrapAt('mane', (a) => a[1]); wrapAt('crystal', (a) => a[1]); wrapAt('leaves', (a) => a[1]);
  // floating debris drifts with an aura part around the creature
  { const f = K.bits; K.bits = function (m) { if (!m || !m.rig || m.part) return f.apply(this, arguments); m.part = 'aura'; try { return f.apply(this, arguments); } finally { m.part = null; } }; }
  // wings are parts of their own, jointed at the shoulder
  { const f = K.wing; K.wing = function (m, at, sd) { if (!m || !m.rig || m.part) return f.apply(this, arguments);
    const n = sd > 0 ? 'wingL' : 'wingR'; if (!m.rig.joints[n]) V.joint(m, n, at, null);
    m.part = n; try { return f.apply(this, arguments); } finally { m.part = null; } }; }
  // eyes: remember where they are painted so eyelids can be added in front of them
  { const f = K.eyes; K.eyes = function (m, c, o) {
    if (!m || !m.rig) return f.apply(this, arguments);
    const part = m.part || partAt(m, c) || 'core', cells = [], set0 = m.set, was = m.part;
    m.set = function (x, y, z, col, g) { cells.push([R(x), R(y), R(z), col]); return set0.apply(this, arguments); };
    m.part = part; let out;
    try { out = f.apply(this, arguments); } finally { m.set = set0; m.part = was; }
    m.rig.eyes.push({ c: [c[0], c[1], c[2]], o: o || {}, cells, part });
    return out; }; }

  // ---------------------------------------------------------------- the finishing pass
  function fill(m) {
    const q = []; let untagged = 0;
    m.v.forEach((v, k) => { if (v.p) q.push(k); else untagged++; });
    if (!untagged) return;
    for (let h = 0; h < q.length; h++) {
      const k = q[h], v = m.v.get(k), p = k.split(',').map(Number);
      for (const d of NB) { const k2 = key(p[0] + d[0], p[1] + d[1], p[2] + d[2]), w = m.v.get(k2); if (w && !w.p) { w.p = v.p; q.push(k2); } }
    }
    // floating blocks no part reached: the nearest tagged block's part
    m.v.forEach((v, k) => { if (v.p) return; v.p = partAt(m, k.split(',').map(Number), 8) || 'core'; });
  }
  const sideName = (part) => (part === 'core' || part === 'head' ? 'lid' : 'lid' + part.replace(/^head/, ''));
  function lids(m) {
    const rig = m.rig;
    rig.eyes.forEach((e) => {
      const o = e.o, yaw = o.yaw || 0, eyeCols = [o.iris, o.white, o.pupil].filter(Boolean);
      const cells = e.cells.filter((c) => eyeCols.indexOf(c[3]) >= 0 && !(o.lid && c[3] === o.lid));
      [1, -1].forEach((sd) => {
        const mine = cells.filter((c) => { let a = Math.atan2(c[2] - e.c[2], c[0] - e.c[0]) * 180 / Math.PI - yaw; while (a > 180) a -= 360; while (a < -180) a += 360; return sd > 0 ? a >= 0 : a < 0; });
        if (!mine.length) return;
        const deg = (yaw + sd * (o.ang || 30)) * Math.PI / 180, cx = Math.cos(deg), cz = Math.sin(deg);
        const step = Math.abs(cx) >= Math.abs(cz) ? [Math.sign(cx), 0] : [0, Math.sign(cz)];
        const name = sideName(e.part) + (sd > 0 ? 'L' : 'R'), hidCells = [];
        // the lid colour: what was asked for, else the skin just above the eye, else a deep shade of the iris
        let col = o.lid || null;
        if (!col) { const top = mine.reduce((a, c) => (c[1] > a[1] ? c : a), mine[0]); const above = m.get(top[0], top[1] + 1, top[2]); col = above && eyeCols.indexOf(above.c) < 0 ? above.c : V.shade(o.iris || '#444444', -0.45); }
        mine.forEach((c) => { let x = c[0] + step[0], z = c[2] + step[1]; for (let i = 0; i < 2 && m.has(x, c[1], z); i++) { x += step[0]; z += step[1]; } if (!m.has(x, c[1], z)) { m.hide(name, x, c[1], z, col); hidCells.push([x, c[1], z]); } });
        if (!hidCells.length) return;
        const top = Math.max.apply(null, hidCells.map((c) => c[1])), ax = hidCells.reduce((s, c) => s + c[0], 0) / hidCells.length, az = hidCells.reduce((s, c) => s + c[2], 0) / hidCells.length;
        V.joint(m, name, [ax, top + 0.5, az], e.part === 'core' ? null : e.part, { lid: true });
      });
    });
  }
  function centre(m, part) {
    let n = 0, s = [0, 0, 0]; m.v.forEach((v, k) => { if (v.p !== part) return; const p = k.split(',').map(Number); s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; n++; });
    return n ? [s[0] / n, s[1] / n, s[2] / n] : [0, 0, 0];
  }
  V.autoRig = function (m) {
    const rig = m.rig; m.part = null; m.keepParts = false; m.partForce = false;
    fill(m);
    rig.jaws.forEach((j) => { let n = 0; m.v.forEach((v, k) => { if (v.p !== j.from) return; const p = k.split(',').map(Number); if (j.test(p[0], p[1], p[2])) { v.p = j.name; n++; } });
      if (n >= 2) V.joint(m, j.name, j.at, j.from); else m.v.forEach((v) => { if (v.p === j.name) v.p = j.from; }); });
    lids(m);
    const used = new Set(); m.v.forEach((v) => used.add(v.p || 'core')); if (m.hid) m.hid.forEach((v) => used.add(v.p));
    // a part with blocks but no joint (aura, halo, extras) turns about its own centre (the aura and halo about the
    // creature's vertical axis, so they can drift around it)
    used.forEach((p) => { if (p === 'core' || rig.joints[p]) return; V.joint(m, p, centre(m, p), null); });
    Object.keys(rig.joints).forEach((n) => { if (!used.has(n)) return; const j = rig.joints[n]; m.pivot(n, j.at, j.parent && j.parent !== 'core' && (used.has(j.parent)) ? j.parent : null, j.lid ? { lid: true } : null); });
    Object.keys(rig.emit).forEach((n) => { const e = rig.emit[n]; if (m.pivots && m.pivots[n]) return; m.pivot(n, e.at, e.parent && m.pivots && m.pivots[e.parent] ? e.parent : null); });
    // a model with no moving parts at all is left as a single block
    if (m.pivots && !Object.keys(m.pivots).length) delete m.pivots;
    rig.done = true;
    return m;
  };
})(typeof window !== 'undefined' ? window : globalThis);
