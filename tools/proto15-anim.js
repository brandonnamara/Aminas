// Phase 15: animation comparisons for the prototypes. Renders the production model (left) and the prototype (right)
// playing the same clips, frame by frame (software WebGL, NOT a phone), to PNG frames and an MP4 per form, or a
// pose sheet. Run: node tools/proto15-anim.js video|poses [ids...]
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const MODE = process.argv[2] || 'poses', IDS = process.argv.slice(3).length ? process.argv.slice(3) : ['lumifern', 'solarbloom', 'aurelith', 'igniflare', 'pyronix', 'ignivor', 'atem1', 'atem2', 'atem'];
const OUT = path.join(__dirname, '..', 'docs', 'ui', 'screens15'), TMP = process.env.P15_TMP || '/tmp/p15frames';
const SEQ = [['idle', 4.2], ['ready', 0.75], ['attack', 0.9], ['special', 1.1], ['hit', 0.55], ['hitBig', 0.8], ['guard', 0.7], ['victory', 1.6], ['defeat', 1.2], ['move', 1.6]];
const POSES = [['idle', 0], ['attack', 0.18], ['attack', 0.34], ['special', 0.26], ['special', 0.42], ['hit', 0.08], ['guard', 0.4], ['victory', 0.45], ['defeat', 1.2], ['move', 0.2]];
(async () => {
  fs.mkdirSync(path.join(OUT, 'anim'), { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage(); page.setDefaultTimeout(1800000);
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.C3D && A.Proto15);
  await page.evaluate(async () => {
    const C = await import('/src/3d/creature3d.js'); await import('/src/3d/runtime.js'); const SC = await import('/src/3d/showcase.js'); const THREE = C.THREE;
    const W = 400, R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(W, W); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
    const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50), sheet = document.createElement('canvas'), g = sheet.getContext('2d');
    window.__p15 = { setup(id) {
      const sp = A.Data.SPECIES[id], st = {};
      for (const proto of [false, true]) { const scene = new THREE.Scene(); scene.background = new THREE.Color('#1b2233'); C.studioLights(scene, 'studio');
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ color: '#0e1320', transparent: true, opacity: 0.6 })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.003; scene.add(disc);
        const r = C.buildVoxel(sp, { proto }); scene.add(r.root); r.root.rotation.y = (SC.VIEW_YAW[id] != null ? SC.VIEW_YAW[id] : -0.6) * 0.75; const mixer = new THREE.AnimationMixer(r.root);
        st[proto ? 'b' : 'a'] = { scene, root: r.root, clips: r.clips, mixer, act: null }; }
      // a shared frame: both models at the same scale, the camera fitted to the larger one
      const box = new THREE.Box3(); ['a', 'b'].forEach((k) => box.union(new THREE.Box3().setFromObject(st[k].root))); const size = box.getSize(new THREE.Vector3());
      const d = Math.max(size.y * 1.15, size.x, size.z) / (2 * Math.tan(13 * Math.PI / 180)) * 1.25; st.cam = { y: size.y * 0.5, d }; window.__st = st; return true; },
      pose(clip, t) { const st = window.__st; ['a', 'b'].forEach((k) => { const s = st[k]; const c = s.clips.find((x) => x.name === clip) || s.clips.find((x) => x.name === 'idle'); s.mixer.stopAllAction(); const a = s.mixer.clipAction(c); a.reset(); a.play(); a.paused = false; s.mixer.setTime(Math.min(t, c.duration - 0.0001)); }); },
      frame(label) { const st = window.__st; sheet.width = 2 * W; sheet.height = W; cam.position.set(0, st.cam.y + st.cam.d * 0.18, st.cam.d); cam.lookAt(0, st.cam.y, 0);
        ['a', 'b'].forEach((k, i) => { R.render(st[k].scene, cam); g.drawImage(R.domElement, i * W, 0); });
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, 2 * W, 22); g.fillStyle = '#e8f0ff'; g.font = 'bold 13px sans-serif'; g.fillText('Current', 8, 15); g.fillText('Phase 15 prototype', W + 8, 15); g.fillStyle = '#ffd978'; g.fillText(label, W - 60, 15);
        return sheet.toDataURL('image/jpeg', 0.88); },
      dispose() { const st = window.__st; ['a', 'b'].forEach((k) => st[k].root.traverse((o) => { if (o.geometry) o.geometry.dispose(); })); } };
  });
  for (const id of IDS) {
    await page.evaluate((id) => window.__p15.setup(id), id);
    if (MODE === 'poses') {
      const shots = []; for (const [c, t] of POSES) { await page.evaluate(([c, t]) => window.__p15.pose(c, t), [c, t]); shots.push(await page.evaluate((l) => window.__p15.frame(l), c + ' ' + t.toFixed(2))); }
      const dir = path.join(TMP, 'pose-' + id); fs.mkdirSync(dir, { recursive: true }); shots.forEach((s, i) => fs.writeFileSync(path.join(dir, String(i).padStart(2, '0') + '.jpg'), Buffer.from(s.split(',')[1], 'base64')));
      execSync(`ffmpeg -y -loglevel error -i ${dir}/%02d.jpg -vf "tile=2x5" -frames:v 1 ${path.join(OUT, 'anim', 'poses-' + id + '.jpg')}`);
    } else {
      const dir = path.join(TMP, 'vid-' + id); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); let n = 0;
      for (const [c, D] of SEQ) { for (let t = 0; t < D; t += 1 / 24) { await page.evaluate(([c, t]) => window.__p15.pose(c, t), [c, t]); const s = await page.evaluate((l) => window.__p15.frame(l), c); fs.writeFileSync(path.join(dir, String(n++).padStart(5, '0') + '.jpg'), Buffer.from(s.split(',')[1], 'base64')); }
        for (let i = 0; i < 6; i++) fs.copyFileSync(path.join(dir, String(n - 1).padStart(5, '0') + '.jpg'), path.join(dir, String(n++).padStart(5, '0') + '.jpg')); }
      execSync(`ffmpeg -y -loglevel error -framerate 24 -i ${dir}/%05d.jpg -c:v libx264 -preset veryfast -crf 24 -pix_fmt yuv420p ${path.join(OUT, 'anim', 'anim-' + id + '.mp4')}`);
    }
    await page.evaluate(() => window.__p15.dispose()); console.log('done', id);
  }
  await browser.close(); srv.close();
})();
