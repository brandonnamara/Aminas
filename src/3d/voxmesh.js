/* Aminas — voxel mesher (ES module, no DOM). A VoxGrid is a box of cells holding colour codes (0 = empty).
   mesh() emits only the faces that touch air, with per-vertex ambient occlusion (the soft darkening in corners that
   makes block art read as solid), one quad per exposed face, vertex colours, and one BufferGeometry per grid, so a
   whole island or building is a single draw call. Colours are packed 0xRRGGBB + 1 (so 0 stays "empty"). */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';

export class VoxGrid {
  // x0,y0,z0: integer origin (in voxels) of cell [0,0,0]; nx,ny,nz: size. y is up.
  constructor(x0, y0, z0, nx, ny, nz) { Object.assign(this, { x0, y0, z0, nx, ny, nz }); this.d = new Uint32Array(nx * ny * nz); this.count = 0; }
  idx(x, y, z) { x -= this.x0; y -= this.y0; z -= this.z0; return x < 0 || y < 0 || z < 0 || x >= this.nx || y >= this.ny || z >= this.nz ? -1 : (y * this.nz + z) * this.nx + x; }
  get(x, y, z) { const i = this.idx(x, y, z); return i < 0 ? 0 : this.d[i]; }
  set(x, y, z, col) { const i = this.idx(x, y, z); if (i < 0) return; const v = col == null || col === 0 ? 0 : (typeof col === 'number' ? col : parseInt(col.slice(1), 16)) + 1; if (!this.d[i] && v) this.count++; else if (this.d[i] && !v) this.count--; this.d[i] = v; }
  // filled box, inclusive-exclusive: [x0,x1) etc. col may be a function (x,y,z) -> colour
  box(x0, y0, z0, x1, y1, z1, col) { for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) this.set(x, y, z, typeof col === 'function' ? col(x, y, z) : col); }
}

// face definitions: normal, the four corners (unit cube), and the two in-plane axes used for AO lookups
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], u: [0, 1, 0], v: [0, 0, 1], shade: 0.86 },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], u: [0, 1, 0], v: [0, 0, -1], shade: 0.86 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], u: [1, 0, 0], v: [0, 0, -1], shade: 1 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], u: [1, 0, 0], v: [0, 0, 1], shade: 0.6 },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], u: [0, 1, 0], v: [-1, 0, 0], shade: 0.93 },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], u: [0, 1, 0], v: [1, 0, 0], shade: 0.93 },
];
const AO = [0.5, 0.68, 0.84, 1];

// Builds a geometry. o: { size (world units per voxel), origin [x,y,z] world offset, ao (true), solid(x,y,z) extra
// occluder test (e.g. a neighbouring grid), shadeFaces (bake a little directional shading into the colours) }
export function meshGrid(g, o) {
  o = o || {}; const s = o.size || 1, org = o.origin || [0, 0, 0], useAO = o.ao !== false;
  const solid = (x, y, z) => g.get(x, y, z) !== 0 || (o.solid ? o.solid(x, y, z) : false);
  const pos = [], nor = [], col = [], ind = []; const c = new THREE.Color(); let vi = 0;
  for (let y = 0; y < g.ny; y++) for (let z = 0; z < g.nz; z++) for (let x = 0; x < g.nx; x++) {
    const v = g.d[(y * g.nz + z) * g.nx + x]; if (!v) continue;
    const X = x + g.x0, Y = y + g.y0, Z = z + g.z0;
    c.setHex(v - 1, THREE.SRGBColorSpace);
    for (let f = 0; f < 6; f++) {
      const F = FACES[f], nx = X + F.n[0], ny = Y + F.n[1], nz = Z + F.n[2];
      if (solid(nx, ny, nz)) continue;
      const ao = [1, 1, 1, 1];
      if (useAO) for (let k = 0; k < 4; k++) {
        const cc = F.c[k], du = cc[0] * F.u[0] + cc[1] * F.u[1] + cc[2] * F.u[2] > 0 ? 1 : -1, dv = cc[0] * F.v[0] + cc[1] * F.v[1] + cc[2] * F.v[2] > 0 ? 1 : -1;
        // the corner's two side neighbours and its diagonal, one layer out from the face
        const a = solid(nx + F.u[0] * du, ny + F.u[1] * du, nz + F.u[2] * du) ? 1 : 0, b = solid(nx + F.v[0] * dv, ny + F.v[1] * dv, nz + F.v[2] * dv) ? 1 : 0;
        const d = solid(nx + F.u[0] * du + F.v[0] * dv, ny + F.u[1] * du + F.v[1] * dv, nz + F.u[2] * du + F.v[2] * dv) ? 1 : 0;
        ao[k] = AO[a && b ? 0 : 3 - (a + b + d)];
      }
      const sh = o.shadeFaces === false ? 1 : F.shade;
      for (let k = 0; k < 4; k++) {
        const cc = F.c[k];
        pos.push((X + cc[0]) * s + org[0], (Y + cc[1]) * s + org[1], (Z + cc[2]) * s + org[2]);
        nor.push(F.n[0], F.n[1], F.n[2]);
        const m = ao[k] * sh; col.push(c.r * m, c.g * m, c.b * m);
      }
      // flip the quad's diagonal so the AO gradient does not crease the wrong way
      if (ao[0] + ao[2] > ao[1] + ao[3]) ind.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3); else ind.push(vi + 1, vi + 2, vi + 3, vi + 1, vi + 3, vi);
      vi += 4;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(vi > 65535 ? new THREE.Uint32BufferAttribute(ind, 1) : new THREE.Uint16BufferAttribute(ind, 1));
  geo.computeBoundingSphere(); geo.computeBoundingBox();
  return geo;
}

// small deterministic helpers shared by the voxel builders
export const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const pick = (arr, h) => arr[Math.min(arr.length - 1, Math.floor(h * arr.length))];
