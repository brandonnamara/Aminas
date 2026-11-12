// Phase 14: removes one separate shell from an exported model (.glb) and writes the rest unchanged. Used once, on
// the lava Habitat export, whose mesh held three unconnected shells: the fortress, a banner pole, and a human figure
// standing on top. The figure is the shell whose bounding box matches --min-y/--max-y; nothing else is touched (no
// vertex of the remaining shells moves, UVs and textures are the same). Run where @gltf-transform/cli is installed:
//   node tools/remove-component.mjs <in.glb> <out.glb> --above <y>     (drops shells lying entirely above y, bar a margin)
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { weld, dedup, prune } from '@gltf-transform/functions'; import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
const [, , src, dst, flag, val] = process.argv; if (flag !== '--above') throw new Error('usage: --above <y>'); const Y = +val;
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src); doc.getRoot().listExtensionsUsed().filter((e) => e.extensionName === 'EXT_meshopt_compression').forEach((e) => e.dispose()); await doc.transform(dedup(), weld());
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0], pos = prim.getAttribute('POSITION'), idx = prim.getIndices().getArray(), n = pos.getCount(), P = pos.getArray();
const key = new Map(), rep = new Int32Array(n); for (let i = 0; i < n; i++) { const k = P[i * 3] + ',' + P[i * 3 + 1] + ',' + P[i * 3 + 2]; let r = key.get(k); if (r === undefined) { r = i; key.set(k, i); } rep[i] = r; }
const par = new Int32Array(n).map((_, i) => i); const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
for (let t = 0; t < idx.length; t += 3) { const a = find(rep[idx[t]]), b = find(rep[idx[t + 1]]); if (a !== b) par[b] = a; const a2 = find(a), c = find(rep[idx[t + 2]]); if (a2 !== c) par[c] = a2; }
const comp = new Map(); for (let t = 0; t < idx.length; t += 3) { const r = find(rep[idx[t]]); let c = comp.get(r); if (!c) comp.set(r, (c = { tris: 0, minY: 1e9, maxY: -1e9 })); c.tris++; for (let k = 0; k < 3; k++) { const y = P[idx[t + k] * 3 + 1]; if (y < c.minY) c.minY = y; if (y > c.maxY) c.maxY = y; } }
const drop = new Set([...comp].filter(([, c]) => c.maxY > Y && (c.maxY - Y) > 4 * (Y - c.minY)).map(([r]) => r));
console.log('shells:', [...comp.values()].map((c) => c.tris + ' triangles, y ' + c.minY.toFixed(3) + ' to ' + c.maxY.toFixed(3) + (drop.has([...comp].find(([, v]) => v === c)[0]) ? '  <- removed' : '')).join(' | '));
if (drop.size !== 1) throw new Error('expected exactly one shell to remove, found ' + drop.size);
const keep = []; for (let t = 0; t < idx.length; t += 3) if (!drop.has(find(rep[idx[t]]))) keep.push(idx[t], idx[t + 1], idx[t + 2]);
prim.getIndices().setArray(new Uint32Array(keep)); await doc.transform(prune({ keepAttributes: false }), weld()); await io.write(dst, doc); console.log('kept', keep.length / 3, 'of', idx.length / 3, 'triangles');
