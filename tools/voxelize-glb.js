// Phase 15 test: converts a GLB (e.g. a Tripo export) into a game voxel model. Every triangle is sampled densely; each
// block takes the average texture (or vertex/material) colour of the surface inside it; colours are then reduced to a
// small palette so the result reads as clean blocks, like the hand-sculpted models; stray single blocks are removed.
// Runs in headless Chromium (three.js loader), offline, build-time only. Nothing here touches the game at runtime.
// Usage: node tools/voxelize-glb.js <in.glb> <out.js> --id meta_t --height 48 --colours 20 [--facing +z] [--glow #5fe0ff]
//        [--glowTol 0.18] [--cropBottom 0] [--sat 1.08]
// Output: a script that registers the model with A.Voxel (V.register(id, …)) plus a .json preview of its stats.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const args = process.argv.slice(2), IN = path.resolve(args[0]), OUT = path.resolve(args[1]);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const P = { id: opt('id', 'glbvox'), height: +opt('height', 48), colours: +opt('colours', 20), facing: opt('facing', '+z'), glow: opt('glow', ''), glowTol: +opt('glowTol', 0.18), cropBottom: +opt('cropBottom', 0), sat: +opt('sat', 1.08) };
const srv = http.createServer((q, r) => { if (q.url === '/m.glb') { r.writeHead(200, { 'content-type': 'model/gltf-binary' }); return fs.createReadStream(IN).pipe(r); } r.writeHead(200, { 'content-type': 'text/html' }); r.end('<html><body></body></html>'); });
srv.listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const page = await b.newPage(); page.setDefaultTimeout(1800000);
  page.on('console', (m) => console.log('[page]', m.text()));
  await page.goto('http://localhost:' + srv.address().port + '/');
  const res = await page.evaluate(async (P) => {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/+esm');
    const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js/+esm');
    const { MeshoptDecoder } = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/meshopt_decoder.module.js/+esm');
    const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder); const g = await L.loadAsync('/m.glb');
    // facing: the source's front axis is turned to +x (our models face +x)
    const yaw = { '+z': Math.PI / 2, '-z': -Math.PI / 2, '+x': 0, '-x': Math.PI }[P.facing] || 0; g.scene.rotation.y = yaw; g.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g.scene), size = box.getSize(new THREE.Vector3()), s = P.height / size.y;
    // texture readers
    const readers = new Map();
    const reader = (tex) => { if (!tex || !tex.image) return null; if (readers.has(tex)) return readers.get(tex); const im = tex.image, c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data, w = c.width, h = c.height;
      const fn = (u, v) => { u = u - Math.floor(u); v = v - Math.floor(v); const px = Math.min(w - 1, Math.floor(u * w)), py = Math.min(h - 1, Math.floor((tex.flipY ? 1 - v : v) * h)), i = (py * w + px) * 4; return [d[i], d[i + 1], d[i + 2]]; };
      readers.set(tex, fn); return fn; };
    const acc = new Map(), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), p = new THREE.Vector3();
    let tris = 0;
    g.scene.traverse((o) => {
      if (!o.isMesh) return; const geo = o.geometry, pos = geo.attributes.position, uv = geo.attributes.uv, col = geo.attributes.color, idx = geo.index, mat = Array.isArray(o.material) ? o.material[0] : o.material;
      const rd = reader(mat.map), em = reader(mat.emissiveMap), base = mat.color ? [mat.color.r * 255, mat.color.g * 255, mat.color.b * 255] : [255, 255, 255];
      const n = idx ? idx.count / 3 : pos.count / 3; tris += n;
      for (let t = 0; t < n; t++) {
        const ia = idx ? idx.getX(t * 3) : t * 3, ib = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, ic = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        A.fromBufferAttribute(pos, ia).applyMatrix4(o.matrixWorld).sub(box.min).multiplyScalar(s); B.fromBufferAttribute(pos, ib).applyMatrix4(o.matrixWorld).sub(box.min).multiplyScalar(s); C.fromBufferAttribute(pos, ic).applyMatrix4(o.matrixWorld).sub(box.min).multiplyScalar(s);
        const m = Math.max(1, Math.ceil(Math.max(A.distanceTo(B), B.distanceTo(C), C.distanceTo(A)) * 2));
        for (let i = 0; i <= m; i++) for (let j = 0; j <= m - i; j++) {
          const u = i / m, v = j / m, w0 = 1 - u - v; p.set(A.x * w0 + B.x * u + C.x * v, A.y * w0 + B.y * u + C.y * v, A.z * w0 + B.z * u + C.z * v);
          let c = base, e = null;
          if (uv && (rd || em)) { const tu = uv.getX(ia) * w0 + uv.getX(ib) * u + uv.getX(ic) * v, tv = uv.getY(ia) * w0 + uv.getY(ib) * u + uv.getY(ic) * v; if (rd) { const k = rd(tu, tv); c = [k[0] * base[0] / 255, k[1] * base[1] / 255, k[2] * base[2] / 255]; } if (em) e = em(tu, tv); }
          else if (col) c = [(col.getX(ia) * w0 + col.getX(ib) * u + col.getX(ic) * v) * 255, (col.getY(ia) * w0 + col.getY(ib) * u + col.getY(ic) * v) * 255, (col.getZ(ia) * w0 + col.getZ(ib) * u + col.getZ(ic) * v) * 255];
          const key = Math.floor(p.x) + ',' + Math.floor(p.y) + ',' + Math.floor(p.z); let a = acc.get(key); if (!a) acc.set(key, a = [0, 0, 0, 0, 0]);
          a[0] += c[0]; a[1] += c[1]; a[2] += c[2]; a[3]++; if (e && e[0] + e[1] + e[2] > 150) a[4]++;
        }
      }
    });
    // blocks: average colour, a little extra saturation (texture colours are softened by baked lighting)
    let vox = []; acc.forEach((a, k) => { const q = k.split(',').map(Number); let c = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; const mx = (c[0] + c[1] + c[2]) / 3; c = c.map((x) => Math.max(0, Math.min(255, mx + (x - mx) * P.sat))); vox.push({ q, c, e: a[4] / a[3] }); });
    // pedestal: drop the lowest rows if asked (Tripo often adds a base)
    if (P.cropBottom > 0) vox = vox.filter((v) => v.q[1] >= P.cropBottom);
    // stray blocks with no neighbour in the 26 around them
    const has = new Set(vox.map((v) => v.q.join(','))); vox = vox.filter((v) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) { if (!dx && !dy && !dz) continue; if (has.has((v.q[0] + dx) + ',' + (v.q[1] + dy) + ',' + (v.q[2] + dz))) return true; } return false; });
    // palette: k-means in RGB, seeded from the most different colours (deterministic)
    const K = P.colours, pts = vox.map((v) => v.c); const cent = [pts[0]];
    while (cent.length < Math.min(K, pts.length)) { let best = null, bd = -1; for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 4000))) { let d = 1e9; for (const c of cent) d = Math.min(d, (pts[i][0] - c[0]) ** 2 + (pts[i][1] - c[1]) ** 2 + (pts[i][2] - c[2]) ** 2); if (d > bd) { bd = d; best = pts[i]; } } cent.push(best.slice()); }
    const lab = new Array(pts.length).fill(0);
    for (let it = 0; it < 12; it++) { const sum = cent.map(() => [0, 0, 0, 0]);
      pts.forEach((c, i) => { let b2 = 0, bd = 1e12; cent.forEach((m, j) => { const d = (c[0] - m[0]) ** 2 + (c[1] - m[1]) ** 2 + (c[2] - m[2]) ** 2; if (d < bd) { bd = d; b2 = j; } }); lab[i] = b2; const S = sum[b2]; S[0] += c[0]; S[1] += c[1]; S[2] += c[2]; S[3]++; });
      sum.forEach((S, j) => { if (S[3]) cent[j] = [S[0] / S[3], S[1] / S[3], S[2] / S[3]]; }); }
    const hex = (c) => '#' + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
    const pal = cent.map(hex);
    // glow: blocks near the glow colour (or lit in an emissive map) glow in the game
    let gc = null; if (P.glow) { const n2 = parseInt(P.glow.slice(1), 16); gc = [n2 >> 16, (n2 >> 8) & 255, n2 & 255]; }
    const glowOf = (v, i) => { if (v.e > 0.4) return 1; if (!gc) return 0; const c = cent[lab[i]], d = Math.sqrt((c[0] - gc[0]) ** 2 + (c[1] - gc[1]) ** 2 + (c[2] - gc[2]) ** 2) / 441; return d < P.glowTol ? 1 : 0; };
    const out = vox.map((v, i) => [v.q[0], v.q[1], v.q[2], lab[i], glowOf(v, i)]);
    const mn = [0, 1, 2].map((a) => Math.min(...out.map((r) => r[a]))), mxx = [0, 1, 2].map((a) => Math.max(...out.map((r) => r[a])));
    return { tris, blocks: out.length, size: mxx.map((x, a) => x - mn[a] + 1), palette: pal, voxels: out.map((r) => [r[0] - mn[0], r[1] - mn[1], r[2] - mn[2], r[3], r[4]]), glow: out.filter((r) => r[4]).length };
  }, P);
  // centre on x/z so the model stands on its own origin, as the hand-built ones do
  const cx = Math.floor(res.size[0] / 2), cz = Math.floor(res.size[2] / 2);
  const data = { id: P.id, source: path.basename(IN), palette: res.palette, voxels: res.voxels.map((r) => [r[0] - cx, r[1], r[2] - cz, r[3], r[4]]) };
  const js = '/* Generated by tools/voxelize-glb.js from ' + path.basename(IN) + ' (' + res.tris + ' source triangles) — ' + res.blocks + ' blocks, ' + res.palette.length + ' colours. */\n' +
    '(function (root) { var V = root.A && root.A.Voxel; if (!V) return; var D = ' + JSON.stringify(data) + ';\n' +
    '  (V.GLB_DATA = V.GLB_DATA || {})[D.id] = D;\n' +
    '  V.register(D.id, function () { var m = new V.Model(); D.voxels.forEach(function (r) { m.set(r[0], r[1], r[2], D.palette[r[3]], r[4]); }); return m; });\n' +
    '})(typeof window !== "undefined" ? window : globalThis);\n';
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, js);
  fs.writeFileSync(OUT.replace(/\.js$/, '.json'), JSON.stringify({ id: P.id, source: path.basename(IN), sourceTris: res.tris, blocks: res.blocks, size: res.size, colours: res.palette.length, glow: res.glow, palette: res.palette }, null, 1));
  console.log(JSON.stringify({ sourceTris: res.tris, blocks: res.blocks, size: res.size, colours: res.palette.length, glow: res.glow, bytes: js.length }));
  await b.close(); srv.close();
});
