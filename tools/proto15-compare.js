// Phase 15: renders the three prototype lines next to their production models (software WebGL, NOT a phone) and
// records model metrics for both. Run: node tools/proto15-compare.js [outDir]
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'ui', 'screens15');
const ALL = ['lumifern', 'solarbloom', 'aurelith', 'igniflare', 'pyronix', 'ignivor', 'atem1', 'atem2', 'atem', 'meta1', 'meta2', 'meta'], IDS = process.argv[3] ? process.argv[3].split(',') : ALL;
(async () => {
  fs.mkdirSync(path.join(OUT, 'models'), { recursive: true });
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage(); page.setDefaultTimeout(900000);
  page.on('pageerror', (e) => console.log('pageerror', e.message)); page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.C3D && A.Proto15);
  const res = await page.evaluate(async ([IDS, CELL]) => {
    const C = await import('/src/3d/creature3d.js'); await import('/src/3d/showcase.js'); await import('/src/3d/roster.js'); try { await import('/src/3d/proto15.js'); } catch (e) { console.error('proto15 module: ' + e.message); }
    const SC = await import('/src/3d/showcase.js'); const THREE = C.THREE, D = A.Data, cell = CELL;
    const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true }); R.setSize(cell, cell); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene(); C.studioLights(scene, 'studio'); const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    const out = {}, shots = {};
    const shoot = (root, yaw) => { scene.add(root); root.rotation.y = yaw; root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
      const d = Math.max(size.y, size.x * 0.85, size.z * 0.85) / (2 * Math.tan(13 * Math.PI / 180)) * 1.1; cam.position.set(ctr.x, ctr.y + d * 0.2, ctr.z + d); cam.lookAt(ctr); R.setClearColor(0x1b2233, 1); R.render(scene, cam); scene.remove(root); return R.domElement.toDataURL('image/png'); };
    for (const id of IDS) {
      const sp = D.SPECIES[id], o = {};
      for (const proto of [false, true]) {
        const t0 = performance.now(); const r = C.buildVoxel(sp, { proto: proto && !!A.Proto15.voxFor(id, 'h') }); if (proto && !A.Proto15.voxFor(id, 'h')) console.error('no refined model for ' + id); const ms = performance.now() - t0, v = C.validate(r.root, r.clips);
        const m = A.Voxel.model(proto ? A.Proto15.voxFor(id, 'h') : sp.art.vox, sp.art.st); let glow = 0; const cols = new Set(); m.v.forEach((x) => { cols.add(x.c); if (x.g > 0.5) glow++; });
        let bones = 0, mats = new Set(); r.root.traverse((x) => { if (x.isBone) bones++; if (x.isMesh) mats.add(x.material.uuid); });
        const yaw = SC.VIEW_YAW[id] != null ? SC.VIEW_YAW[id] : -0.6;
        const mixer = new THREE.AnimationMixer(r.root); const idle = r.clips.find((c) => c.name === 'idle'); if (idle) { mixer.clipAction(idle).play(); mixer.update(0.01); }
        o[proto ? 'p15' : 'cur'] = { voxels: m.v.size, colours: cols.size, glow, parts: Object.keys(m.pivots || {}).filter((p) => !/^lid/.test(p)), tris: v.info.tris, meshes: v.info.meshes, materials: mats.size, bones, buildMs: Math.round(ms), ok: v.ok, errors: v.errors, clips: r.clips.map((c) => c.name + ':' + c.duration.toFixed(2)), height: v.info.height };
        shots[id + (proto ? '-p15' : '-cur')] = [shoot(r.root, yaw), shoot(r.root, yaw + 1.9)];
        mixer.stopAllAction(); r.root.traverse((x) => { if (x.geometry) x.geometry.dispose(); });
      }
      out[id] = o;
    }
    return { out, shots };
  }, [IDS, +process.env.CELL || 300]);
  Object.entries(res.shots).forEach(([k, a]) => a.forEach((d, i) => fs.writeFileSync(path.join(OUT, 'models', k + '-' + i + '.png'), Buffer.from(d.split(',')[1], 'base64'))));
  fs.writeFileSync(path.join(OUT, process.argv[3] ? 'roster15b-models.json' : 'proto15-models.json'), JSON.stringify(res.out, null, 1));
  Object.entries(res.out).forEach(([id, o]) => console.log(id.padEnd(11), 'cur', JSON.stringify([o.cur.voxels, o.cur.tris, o.cur.parts.length, o.cur.ok]), ' p15', JSON.stringify([o.p15.voxels, o.p15.tris, o.p15.parts.length, o.p15.ok, o.p15.buildMs, o.p15.errors.slice(0, 3)])));
  await browser.close(); srv.close();
})();
