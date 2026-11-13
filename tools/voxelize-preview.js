// Renders a voxelized model (output of tools/voxelize-glb.js) with the game's own voxel mesher and lighting, from
// two angles, next to nothing else. Usage: node tools/voxelize-preview.js <model.js> <id> <out.png> [yaw]
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path');
const [FILE, ID, OUT] = process.argv.slice(2), YAW = +(process.argv[5] || 0.6);
(async () => {
  const srv = await serve(); const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage(); page.setDefaultTimeout(600000); page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.Voxel && A.UI);
  await page.addScriptTag({ content: fs.readFileSync(path.resolve(FILE), 'utf8') });
  const png = await page.evaluate(async ({ ID, YAW }) => {
    const C = await import('/src/3d/creature3d.js'); const THREE = C.THREE;
    const r = C.buildVoxel({ id: ID, name: ID, el: 'metal', stage: 3, pers: 'calm', stats: { spd: 10 }, art: { vox: ID, st: 1 } }, { proto: false });
    const W = 420, R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(W, W); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.setClearColor('#1b2233');
    const sc = new THREE.Scene(); C.studioLights(sc, 'studio'); sc.add(r.root); const cam = new THREE.PerspectiveCamera(26, 1, 0.05, 50);
    const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = W; const g = cv.getContext('2d');
    [YAW, YAW + 2.4].forEach((y, i) => { r.root.rotation.y = y; r.root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(r.root), s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()), d = Math.max(s.x, s.y, s.z) / (2 * Math.tan(13 * Math.PI / 180)) * 1.15;
      cam.position.set(c.x, c.y + d * 0.22, c.z + d); cam.lookAt(c); R.render(sc, cam); g.drawImage(R.domElement, i * W, 0); });
    const v = C.validate(r.root, r.clips); g.fillStyle = '#fff'; g.font = '13px sans-serif'; g.fillText(ID + ' · ' + A.Voxel.model(ID, 1).v.size + ' blocks · ' + v.info.tris + ' tris', 8, 18);
    return cv.toDataURL('image/png'); }, { ID, YAW });
  fs.writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64')); await b.close(); srv.close();
})();
