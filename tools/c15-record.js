// Phase 15C: deterministic battle recordings. Playwright's clock drives the page (timers, animation frames and
// performance.now advance exactly 1/30 s per captured frame), so a slow software renderer still records every beat of
// a sequence at its real timing. Each scenario records one row per variant (e.g. switch off / on, or normal / Battery
// Saver / Reduce Motion) and stacks them into one MP4. Desktop software WebGL, NOT a phone.
// Run: node tools/c15-record.js [scenario,...]   -> docs/ui/screens15c/rec/<scenario>.mp4
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const OUT = process.env.C15_OUT || path.join(__dirname, '..', 'docs', 'ui', 'screens15c', 'rec'), TMP = process.env.C15_TMP || '/tmp/c15rec', FPS = 30;
const ON = { q: '?p15=1', label: 'Phase 15C' }, OFF = { q: '', label: 'Current' };
const SC = {
  atem9: { id: 'atem', foe: 'rockraki', press: 'overclock', secs: 3.4, rows: [OFF, ON] },
  'atem9-modes': { id: 'atem', foe: 'rockraki', press: 'overclock', secs: 3.4, rows: [ON, Object.assign({}, ON, { label: 'Battery Saver', saver: true }), Object.assign({}, ON, { label: 'Reduce Motion', calm: true })] },
  eclipsar: { id: 'eclipsar', foe: 'calyxar', press: 1, secs: 2.6, rows: [OFF, ON] },
  aquaflora3: { id: 'aquaflora3', foe: 'infernox', press: 1, secs: 2.6, rows: [OFF, ON] },
  pyrophoenix: { id: 'pyrophoenix', foe: 'calyxar', press: 1, secs: 2.6, rows: [OFF, ON] },
  infernox: { id: 'infernox', foe: 'calyxar', press: 1, secs: 2.6, rows: [OFF, ON] },
  oceanfang: { id: 'oceanfang', foe: 'infernox', press: 1, secs: 2.6, rows: [OFF, ON] },
  voltar3: { id: 'voltar3', foe: 'calyxar', press: 1, secs: 2.6, rows: [OFF, ON] },
  aimza3: { id: 'aimza3', foe: 'calyxar', press: 1, secs: 2.6, rows: [OFF, ON] },
  shellfin: { id: 'shellfin', foe: 'infernox', press: 1, secs: 2.6, rows: [OFF, ON] },
  meta: { id: 'meta', foe: 'rockraki', press: 1, secs: 2.6, rows: [OFF, ON] },
  guard: { id: 'atem1', foe: 'rockraki', press: 'ironwall', secs: 2.2, rows: [OFF, ON] },
  status: { id: 'emberix', foe: 'acinus', press: 'flarebite', rng: 0.05, secs: 3.4, rows: [OFF, ON] },
  victory: { id: 'atem', foe: 'rockraki', press: 'overclock', hpMul: 0.05, secs: 5.0, rows: [OFF, ON] },
  // Phase 15D
  'lumi-solarflare': { id: 'aurelith', foe: 'rockraki', press: 'solarflare', secs: 2.8, rows: [OFF, ON] },
  'igni-inferno': { id: 'ignivor', foe: 'calyxar', press: 'inferno', secs: 2.8, rows: [OFF, ON] },
  'zeep-overclock': { id: 'zeep3', foe: 'rockraki', press: 'overclock', secs: 2.8, rows: [OFF, ON] },
  'zeep-modes': { id: 'zeep3', foe: 'rockraki', press: 'overclock', secs: 2.8, rows: [ON, Object.assign({}, ON, { label: 'Battery Saver', saver: true }), Object.assign({}, ON, { label: 'Reduce Motion', calm: true })] },
  'atem9-15d': { id: 'atem', foe: 'rockraki', press: 'overclock', secs: 3.0, rows: [ON] },
  'aqua-serpent': { id: 'aquaflora3', foe: 'calyxar', press: 1, secs: 2.6, rows: [OFF, ON] },
  'fox-head': { id: 'infernox', foe: 'calyxar', press: 0, secs: 2.4, rows: [OFF, ON] },
};
// Phase 15D: guard poses, played directly on the stage (the guard clip of each body type), one row per creature
['aquaflora2', 'ignivor', 'emberix', 'zeep3', 'shellfin', 'kairyu', 'voltar3', 'sylvaneer'].forEach((id) => { SC['guard-' + id] = { id, foe: 'rockraki', direct: 'guard', secs: 1.2, rows: [OFF, ON] }; });
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const want = process.argv[2] ? process.argv[2].split(',') : Object.keys(SC);
  for (const name of want) { const S = SC[name], parts = [];
    for (let r = 0; r < S.rows.length; r++) { const row = S.rows[r], dir = path.join(TMP, name + '-' + r); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }); const page = await ctx.newPage(); page.setDefaultTimeout(600000);
      page.on('pageerror', (e) => console.log('pageerror', e.message));
      await page.clock.install(); await page.goto(srv.url + row.q); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D && A.Proto15);
      await page.evaluate((row) => { if (!row.q) { try { localStorage.setItem('aminas.proto15', '0'); } catch (e) {} } A.Perf.reportSlow = () => {}; const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = true; s.settings.sfx = false; s.settings.reduceMotion = !!row.calm; s.settings.batterySaver = !!row.saver; A.Rules.drain(); if (A.UI.queue) A.UI.queue.length = 0; A.State.save(); A.UI.showIsland(); if (A.Perf.apply) A.Perf.apply(); if (!row.saver) A.Perf.forceTier = 'high'; }, row);   // the same arena detail in every row (the saver row keeps its own)
      await page.waitForSelector('#world', { timeout: 60000 });
      await page.evaluate(async () => { for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 100)); document.querySelectorAll('.dlg .dlg-skip').forEach((b) => b.click()); A.UI.closeAll(); } document.querySelectorAll('.dlg').forEach((x) => x.remove()); });
      const press = await page.evaluate(async (S) => {
        const R = A.Rules, Bt = R.Battle, f = Bt.fighter(S.id, 30), e = Bt.fighter(S.foe, 30); [f, e].forEach((x) => { x.hpMax *= S.hpMul || 50; x.hp = x.hpMax; }); f.spd = 999; e.atk = 1;
        A.UI.closeAll(); A.UI.startBattle({ kind: 'test', b: Bt.create([f], e, { rng: () => (S.rng == null ? 0.5 : S.rng) }), d: 'heartwood', label: 'Phase 15C review', finish: () => {} });
        for (let i = 0; i < 150 && !(A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy); i++) await new Promise((r) => setTimeout(r, 100));
        await new Promise((r) => setTimeout(r, 1500)); return typeof S.press === 'number' ? A.Data.SPECIES[S.id].abil[S.press] : S.press; }, S);
      const now = await page.evaluate(() => Date.now()); await page.clock.pauseAt(now + 1500); await page.clock.runFor(200);
      if (S.direct) await page.evaluate((k) => A.UI.B.stage[k]('p'), S.direct);
      else await page.evaluate((id) => { const b = document.querySelector('.abtn.ready[data-id="' + id + '"]'); if (b) b.click(); }, press);
      const n = Math.round(S.secs * FPS);
      for (let i = 0; i < n; i++) { await page.clock.runFor(1000 / FPS); await page.screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.png') }); }
      const vp = path.join(TMP, name + '-' + r + '.mp4');
      execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${dir}/%04d.png -vf "drawbox=x=0:y=0:w=200:h=24:color=black@0.55:t=fill,drawtext=text='${row.label}':x=8:y=5:fontsize=15:fontcolor=white" -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p ${vp}`);
      parts.push(vp); await ctx.close(); console.log(name, row.label, press, n, 'frames');
    }
    const out = path.join(OUT, name + '.mp4');
    if (parts.length === 1) fs.copyFileSync(parts[0], out); else
    execSync(`ffmpeg -y -loglevel error ${parts.map((p) => '-i ' + p).join(' ')} -filter_complex "${parts.map((_, i) => '[' + i + ':v]').join('')}vstack=inputs=${parts.length},scale=844:-2" -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p ${out}`);
    console.log('wrote', out);
  }
  await browser.close(); srv.close();
})();
