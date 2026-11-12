// The game ships two files per model: full (--tris 96000) and lighter (--tris 10000 --color 1024 --normal 512; the
// simplifier stops where further reduction would change the shape, at about 20,000 to 26,000 triangles).
// Phase 14: prepares an exported 3D model (.glb, e.g. from Tripo) for the game. Run from a folder where
// @gltf-transform/cli is installed (it is a build-time tool only; the game does not load it):
//   node tools/optimize-model.mjs <in.glb> <out.glb> [--tris 96000] [--color 2048] [--normal 1024]
// What it does, and nothing else:
//   - reduces the triangle count to the target with meshoptimizer (the exports are about a million triangles);
//   - resizes the colour texture and the normal map, stored as WebP;
//   - drops the metal/roughness texture (the models are matte; a constant is used instead);
//   - stores positions compactly (KHR_mesh_quantization), with no extra decoder needed in the game.
// The model's shape, UVs, colours and orientation are otherwise untouched. Prints what went in and what came out.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, prune, dedup, textureCompress, quantize, reorder } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
const [, , src, dst, ...rest] = process.argv; const opt = { tris: 96000, color: 2048, normal: 1024 };
for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, '')] = +rest[i + 1];
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src), root = doc.getRoot();
const count = () => root.listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0), 0);
const before = { triangles: Math.round(count()), textures: root.listTextures().map((t) => t.getSize().join('x')) };
// remove the mesh compression the export came with, so the game needs no decoder
root.listExtensionsUsed().filter((e) => e.extensionName === 'EXT_meshopt_compression').forEach((e) => e.dispose());
await doc.transform(dedup(), weld());
const ratio = Math.min(1, opt.tris / before.triangles);
if (ratio < 1) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.004, lockBorder: false }));
root.listMaterials().forEach((m) => { m.setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(0.92).setOcclusionTexture(null); });
await doc.transform(prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /baseColor|emissive/, resize: [opt.color, opt.color], quality: 90 }), textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /normal/, resize: [opt.normal, opt.normal], quality: 90 }), reorder({ encoder: MeshoptEncoder }), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }));
await io.write(dst, doc);
const fs = await import('fs');
console.log(JSON.stringify({ in: src.split('/').pop(), out: dst.split('/').pop(), before, after: { triangles: Math.round(count()), textures: root.listTextures().map((t) => t.getSize().join('x')), bytes: fs.statSync(dst).size } }));
