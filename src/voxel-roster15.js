/* Aminas — Phase 15B: the refined roster (behind the Phase 15 developer switch, A.Proto15; off by default).
   Refinement, not redesign. Each line's own builder is run again on a finer block grid (V.withDetail): the same
   primitives, proportions, palette, faces, horns, wings and tails, sculpted with more, smaller blocks, so curves and
   tapers come out smoother and features sharper while the silhouette stays the one players know. Then:
   - a shading pass adds depth: creases a touch darker, upper edges a touch lighter (glowing and rare "detail" colours,
     such as eyes and markings, are left exactly as sculpted);
   - species work where the brief asks for it (src/voxel-roster15-species.js): Umbrit's bat ears and wings, Aquaflora's
     longer serpent body, faces for Acinus, Emberix, Zeep, Kairyu and Voltar, Pyro-Phoenix's head and feathers, and the
     later stages that had less detail than their first form (Umbrit II–III, Cannonis II–III, Terraflora II).
   Detail levels: '…15' (High), '…15m' (phones), and Battery Saver uses the production model unchanged.
   Lines left alone: Aimza (already at the standard) and the Phase 8 sculpts of Umbrit I and Cannonis I. Lumifern,
   Igniflare, Atem and Meta keep their Phase 15A prototypes (src/voxel-proto15.js). */
(function (root) {
  'use strict';
  const A = root.A, V = A && A.Voxel, P15 = A && A.Proto15; if (!V || !P15) return;
  const SKIP = { aimza: 1, lumifern: 1, igniflare: 1, atem: 1, meta: 1 };
  const SCULPTED = { umbrit: [1], cannonis: [1] };   // Phase 8 sculpts: stage I is hand-built at full detail already
  // block grid per level, per form: chosen from each production model's triangle count so that High lands near 11,000
  // triangles and phones near 6,500 (shading adds about a third); small creatures gain the most, large ones stay in budget
  const DT = {"lumifern":[1.9,1.6],"solarbloom":[1.9,1.51],"aurelith":[1.41,1.08],"umbrit":[1.32,1.01],"duskmantle":[1.42,1.09],"eclipsar":[1.15,1],"cannonis":[1.15,1],"reefback":[1.15,1],"shellfin":[1.15,1],"kairyu":[1.68,1.29],"tidalong":[1.37,1.05],"oceanfang":[1.15,1],"aquaflora":[1.9,1.53],"aquaflora2":[1.69,1.3],"aquaflora3":[1.19,1],"gaiaroki":[1.65,1.27],"terraki":[1.36,1.05],"rockraki":[1.15,1],"pyrocell":[1.9,1.6],"pyroforge":[1.85,1.42],"pyrocore":[1.47,1.13],"acinus":[1.65,1.27],"berrant":[1.26,1],"calyxar":[1.15,1],"sylvaneer":[1.87,1.44],"sylvaneer2":[1.53,1.17],"sylvaneer3":[1.33,1.02],"terraflora":[1.89,1.45],"terraflora2":[1.9,1.6],"terraflora3":[1.47,1.13],"emberix":[1.9,1.47],"flaremon":[1.53,1.18],"infernox":[1.31,1.01],"pyrokai":[1.67,1.28],"emberkai":[1.38,1.06],"infernokai":[1.18,1],"igniflare":[1.9,1.6],"pyronix":[1.37,1.05],"ignivor":[1.15,1],"pyrospark":[1.9,1.6],"pyrohawk":[1.85,1.43],"pyrophoenix":[1.35,1.03],"zephyr":[1.75,1.34],"aeolus":[1.32,1.01],"stormbringer":[1.15,1],"voltar":[1.9,1.6],"voltar2":[1.9,1.6],"voltar3":[1.66,1.27],"zeep":[1.9,1.6],"zeep2":[1.71,1.31],"zeep3":[1.33,1.02],"aimza":[1.24,1],"aimza2":[1.15,1],"aimza3":[1.15,1],"lumi":[1.9,1.6],"lumi2":[1.9,1.59],"lumi3":[1.56,1.2],"meta1":[1.9,1.6],"meta2":[1.9,1.56],"meta":[1.71,1.32],"atem1":[1.9,1.6],"atem2":[1.79,1.38],"atem":[1.49,1.14]};
  const VOXID = {}; Object.values(A.Data.SPECIES).forEach((s) => { VOXID[s.art.vox + ':' + s.art.st] = s.id; });
  V.detailFor15 = function (vox, stage, lvl) {
    if (SCULPTED[vox] && SCULPTED[vox].includes(stage)) return 1;
    const d = DT[VOXID[vox + ':' + stage]]; return d ? d[lvl === 'm' ? 1 : 0] : 1;
  };
  const SH = V.shade || ((c) => c);
  // depth: creases darker, upper edges lighter; glow and rare colours untouched
  V.shade15 = function (m) {
    const uses = new Map(); m.v.forEach((v) => uses.set(v.c, (uses.get(v.c) || 0) + 1));
    const rare = Math.max(6, m.v.size * 0.004), ch = [];
    m.v.forEach((v, k) => {
      if (v.g > 0.3 || uses.get(v.c) < rare) return;
      const p = k.split(',').map(Number), x = p[0], y = p[1], z = p[2];
      const up = !m.has(x, y + 1, z), exposed = up || !m.has(x + 1, y, z) || !m.has(x - 1, y, z) || !m.has(x, y, z + 1) || !m.has(x, y, z - 1) || !m.has(x, y - 1, z);
      if (!exposed) return;
      let n = 0; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) if ((dx || dy || dz) && m.has(x + dx, y + dy, z + dz)) n++;
      if (n >= 19) ch.push([k, SH(v.c, -0.09)]);
      else if (up && n <= 11 && (!m.has(x + 1, y, z) || !m.has(x, y, z + 1) || !m.has(x, y, z - 1))) ch.push([k, SH(v.c, 0.06)]);
    });
    ch.forEach(([k, c]) => { m.v.get(k).c = c; });
    return m;
  };
  // Two stage-I builders (Aquaflora, Terraflora) are written in fixed block units, so the finer grid is made from their
  // model instead: each block becomes f³ smaller blocks, and the staircase is smoothed (a finer block is filled where
  // the blocks around it are mostly filled), while thin features (eyes, fins, tips) are always kept.
  const UPSCALE = { aquaflora: [1], terraflora: [1] };
  V.upscale = function (src, f) {
    const key = (x, y, z) => x + ',' + y + ',' + z, has = (x, y, z) => src.v.has(key(x, y, z)), m = new V.Model(), map = (v) => (v + 0.5) * f - 0.5;
    const n26 = new Map(), thin = (x, y, z) => { const k = key(x, y, z); if (!n26.has(k)) { let n = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) if ((a || b || c) && has(x + a, y + b, z + c)) n++; n26.set(k, n); } return n26.get(k) <= 9; };
    const seen = new Set();
    src.v.forEach((v, k) => { const p = k.split(',').map(Number);
      for (let i = Math.floor((p[0] - 1) * f); i <= Math.ceil((p[0] + 2) * f); i++) for (let j = Math.floor((p[1] - 1) * f); j <= Math.ceil((p[1] + 2) * f); j++) for (let l = Math.floor((p[2] - 1) * f); l <= Math.ceil((p[2] + 2) * f); l++) {
        const fk = key(i, j, l); if (seen.has(fk)) continue; seen.add(fk);
        const u = (i + 0.5) / f - 0.5, w = (j + 0.5) / f - 0.5, q = (l + 0.5) / f - 0.5, x0 = Math.floor(u), y0 = Math.floor(w), z0 = Math.floor(q), fx = u - x0, fy = w - y0, fz = q - z0;
        let val = 0, best = null, bw = -1;
        for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) { const wt = (a ? fx : 1 - fx) * (b ? fy : 1 - fy) * (c ? fz : 1 - fz); if (!has(x0 + a, y0 + b, z0 + c)) continue; val += wt; if (wt > bw) { bw = wt; best = [x0 + a, y0 + b, z0 + c]; } }
        const nx = Math.round(u), ny = Math.round(w), nz = Math.round(q), near = has(nx, ny, nz);
        if (!(val >= 0.5 || (near && thin(nx, ny, nz)))) continue;
        const sv = src.v.get(near ? key(nx, ny, nz) : key(best[0], best[1], best[2])); m.part = sv.p || null; m.set(i, j, l, sv.c, sv.g);
      } });
    m.part = null;
    if (src.rig) { const r = src.rig, sc = (a) => a.map(map); m.rig = Object.assign({}, r, { joints: {}, emit: {}, eyes: r.eyes.map((e) => Object.assign({}, e, { c: sc(e.c), cells: (e.cells || []).map((c) => sc(c.slice(0, 3)).map(Math.round).concat(c.slice(3))) })),
      jaws: r.jaws.map((j) => Object.assign({}, j, { at: sc(j.at), test: (x, y, z) => j.test((x + 0.5) / f - 0.5, (y + 0.5) / f - 0.5, (z + 0.5) / f - 0.5) })) });
      Object.keys(r.joints).forEach((n) => { m.rig.joints[n] = Object.assign({}, r.joints[n], { at: sc(r.joints[n].at) }); }); Object.keys(r.emit).forEach((n) => { m.rig.emit[n] = Object.assign({}, r.emit[n], { at: sc(r.emit[n].at) }); }); }
    return m;
  };
  const HOOKS = (V.ROSTER15_HOOKS = V.ROSTER15_HOOKS || {});   // species work, filled by voxel-roster15-species.js
  const lines = {};
  Object.values(A.Data.LINES).forEach((L) => {
    const vox = A.Data.SPECIES[L.ids[0]].art.vox; if (SKIP[L.id] || !V.SPECIES[vox]) return;
    lines[L.id] = vox;
    ['h', 'm'].forEach((lvl) => V.register(vox + '15' + (lvl === 'm' ? 'm' : ''), function (stage) {
      const d = V.detailFor15(vox, stage, lvl);
      return V.withDetail(d, () => { let m = UPSCALE[vox] && UPSCALE[vox].includes(stage) ? V.upscale(V.withDetail(1, () => V.SPECIES[vox](stage)), d) : V.SPECIES[vox](stage);
        if (HOOKS[vox]) m = HOOKS[vox](m, stage, d, lvl) || m; V.shade15(m); return m; });
    }));
  });
  P15.addLines(lines);
})(typeof window !== 'undefined' ? window : globalThis);
