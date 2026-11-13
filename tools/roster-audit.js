// Phase 15 roster audit: builds every form (63) in headless Chromium (software WebGL, NOT a phone), records model,
// rig, animation and cost metrics, and renders a contact sheet of every form at its viewer angle.
// Run: node tools/roster-audit.js [outDir]   -> roster-audit.json + roster-sheet.png
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'ui', 'screens15');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage(); page.setDefaultTimeout(900000);
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.C3D && A.Showcase);
  const res = await page.evaluate(async () => {
    const C = await import('/src/3d/creature3d.js'); const SC = await import('/src/3d/showcase.js'); const RO = await import('/src/3d/roster.js'); const THREE = C.THREE;
    const D = A.Data, lines = Object.values(D.LINES), cell = 200, cols = 9, rows = 7, lab = 26;
    const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true }); R.setSize(cell, cell); R.setPixelRatio(1);
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene(); C.studioLights(scene, 'studio'); const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    const sheet = document.createElement('canvas'); sheet.width = cols * cell; sheet.height = rows * (cell + lab); const g = sheet.getContext('2d');
    g.fillStyle = '#1b2233'; g.fillRect(0, 0, sheet.width, sheet.height);
    const forms = {}; let n = 0;
    for (const L of lines) for (let i = 0; i < 3; i++) {
      const id = L.ids[i], sp = D.SPECIES[id], m = A.Voxel.model(sp.art.vox, sp.art.st);
      let glow = 0; const colours = new Set(); m.v.forEach((v) => { colours.add(v.c); if (v.g > 0.5) glow++; });
      const t0 = performance.now(), r = C.buildVoxel(sp), ms = performance.now() - t0, v = C.validate(r.root, r.clips);
      let bones = 0, meshes = 0, mats = new Set(); r.root.traverse((o) => { if (o.isBone) bones++; if (o.isMesh) { meshes++; mats.add(o.material.uuid); } });
      const P = RO.PERSONA[L.id] || {};
      forms[id] = { line: L.id, el: sp.el, stage: sp.stage, name: sp.name, design: sp.design, voxels: m.v.size, dims: [m.max[0] - m.min[0] + 1, m.max[1] - m.min[1] + 1, m.max[2] - m.min[2] + 1],
        colours: colours.size, glow, parts: Object.keys(m.pivots || {}).filter((p) => !/^lid/.test(p)).length, eyes: m.rig ? m.rig.eyes.length : 0, tris: v.info.tris, meshes, materials: mats.size, bones,
        buildMs: Math.round(ms), clips: r.clips.map((c) => c.name), hook: !!C.CLIP_HOOKS[id], showcase: SC.SHOWCASE_IDS.indexOf(id) >= 0,
        persona: P.quirk ? [P.quirk, P.atk, P.sp, P.vic, P.def, P.heavy] : null };
      // render at the viewer angle
      const col = n % cols, row = Math.floor(n / cols); scene.add(r.root); r.root.rotation.y = (SC.VIEW_YAW[id] != null ? SC.VIEW_YAW[id] : -0.6);
      const mx = r.clips.find((c) => c.name === 'idle'); const mixer = new THREE.AnimationMixer(r.root); if (mx) { mixer.clipAction(mx).play(); mixer.update(0.01); }
      r.root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(r.root), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
      const d = Math.max(size.y, size.x * 0.85, size.z * 0.85) / (2 * Math.tan(13 * Math.PI / 180)) * 1.12;
      cam.position.set(ctr.x, ctr.y + d * 0.22, ctr.z + d); cam.lookAt(ctr); R.setClearColor(0x000000, 0); R.render(scene, cam);
      const x = col * cell, y = row * (cell + lab); g.fillStyle = ['#243048', '#2a3552', '#30395a'][i]; g.fillRect(x, y, cell, cell + lab);
      g.drawImage(R.domElement, x, y); g.fillStyle = '#e8f0ff'; g.font = 'bold 13px sans-serif'; g.fillText(sp.name, x + 6, y + cell + 12);
      g.fillStyle = '#9fb3d8'; g.font = '11px sans-serif'; g.fillText(m.v.size + ' blocks · ' + v.info.tris + ' tris', x + 6, y + cell + 23);
      scene.remove(r.root); mixer.stopAllAction(); r.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); n++;
    }
    return { forms, png: sheet.toDataURL('image/png') };
  });
  fs.writeFileSync(path.join(OUT, 'roster-sheet.png'), Buffer.from(res.png.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(OUT, 'roster-audit.json'), JSON.stringify(res.forms, null, 1));
  const F = res.forms; console.log('id,stage,voxels,dims,colours,glow,parts,tris,buildMs,hook');
  Object.keys(F).forEach((id) => { const f = F[id]; console.log([id, f.stage, f.voxels, f.dims.join('x'), f.colours, f.glow, f.parts, f.tris, f.buildMs, f.hook, f.showcase ? 'P8' : ''].join(',')); });
  await browser.close(); srv.close();
})();
