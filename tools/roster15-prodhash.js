// Phase 15B guard: a fingerprint of every production voxel model (detail 1, no refinement), so a branch can prove
// the refined-roster work leaves what players see unchanged.  node tools/roster15-prodhash.js [repoRoot]
const path = require('path'), crypto = require('crypto');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const { load } = require(path.join(root, 'tests', 'harness.js'));
const ctx = load(), A = ctx.A, V = A.Voxel, out = {};
Object.values(A.Data.SPECIES).forEach((s) => {
  const m = V.SPECIES[s.art.vox] && V.SPECIES[s.art.vox](s.art.st); if (!m) return;
  const rows = []; m.v.forEach((v, k) => rows.push(k + ':' + v.c + ':' + (v.g || 0) + ':' + (v.p || '')));
  rows.sort(); out[s.id] = m.v.size + ':' + crypto.createHash('sha1').update(rows.join('|')).digest('hex').slice(0, 12);
});
console.log(JSON.stringify(out));
