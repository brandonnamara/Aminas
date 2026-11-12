// Builds a tiny valid .glb for tests only (NOT game art, and not one of the Tripo models): a coloured block with a
// separate child part named "windmill_sails", off-centre and not on the ground, so fitting and pivots are tested.
const fs = require('fs'), path = require('path');
function cube(cx, cy, cz, sx, sy, sz, col) {
  const P = [], C = [], I = []; const f = [[0, 1, 2, [1, 1, 1]], [0, 1, 2, [-1, 1, 1]]];
  const faces = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]]];
  faces.forEach(([n, u, v], fi) => { const b = P.length / 3; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, c]) => { P.push(cx + (n[0] + u[0] * a + v[0] * c) * sx / 2, cy + (n[1] + u[1] * a + v[1] * c) * sy / 2, cz + (n[2] + u[2] * a + v[2] * c) * sz / 2); const k = 0.7 + fi * 0.05; C.push(col[0] * k, col[1] * k, col[2] * k); }); I.push(b, b + 1, b + 2, b, b + 2, b + 3); });
  return { P, C, I };
}
module.exports = function makeGlb(out) {
  const parts = [cube(3, 2.5, -1, 4, 3, 2, [0.8, 0.25, 0.2]), cube(0, 0, 0, 1.6, 0.2, 0.2, [0.9, 0.85, 0.6])];
  const chunks = [], views = [], accs = []; let off = 0;
  const add = (arr, Type, target, type, comp, minmax) => { const b = Buffer.from(new Type(arr).buffer); const pad = (4 - (b.length % 4)) % 4; views.push({ buffer: 0, byteOffset: off, byteLength: b.length, target }); const a = { bufferView: views.length - 1, componentType: comp, count: arr.length / (type === 'VEC3' ? 3 : 1), type }; if (minmax) { a.min = [0, 1, 2].map((i) => Math.min(...arr.filter((_, j) => j % 3 === i))); a.max = [0, 1, 2].map((i) => Math.max(...arr.filter((_, j) => j % 3 === i))); } accs.push(a); chunks.push(b, Buffer.alloc(pad)); off += b.length + pad; return accs.length - 1; };
  const meshes = parts.map((p) => ({ primitives: [{ attributes: { POSITION: add(p.P, Float32Array, 34962, 'VEC3', 5126, true), COLOR_0: add(p.C, Float32Array, 34962, 'VEC3', 5126) }, indices: add(p.I, Uint16Array, 34963, 'SCALAR', 5123), material: 0 }] }));
  const json = { asset: { version: '2.0', generator: 'aminas test fixture' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'standin_body', mesh: 0, children: [1] }, { name: 'windmill_sails', mesh: 1, translation: [3, 4.6, 0.2] }], meshes, materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } }], accessors: accs, bufferViews: views, buffers: [{ byteLength: off }] };
  let jb = Buffer.from(JSON.stringify(json)); jb = Buffer.concat([jb, Buffer.alloc((4 - (jb.length % 4)) % 4, 0x20)]); const bin = Buffer.concat(chunks);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + jb.length + 8 + bin.length, 8);
  const h1 = Buffer.alloc(8); h1.writeUInt32LE(jb.length, 0); h1.writeUInt32LE(0x4e4f534a, 4); const h2 = Buffer.alloc(8); h2.writeUInt32LE(bin.length, 0); h2.writeUInt32LE(0x004e4942, 4);
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.concat([head, h1, jb, h2, bin])); return out;
};
if (require.main === module) console.log(module.exports(process.argv[2] || path.join(__dirname, 'standin.glb')));
