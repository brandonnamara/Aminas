// Phase 15: records the same practice battle twice — prototype switch off (current) and on (Phase 15) — in the 3D
// arena (headless Chromium, software WebGL, NOT a phone) and stacks them into one MP4 per line: current on top,
// Phase 15 below. The battle uses fixed rolls and the attacker always moves first, so both runs play the same turns.
// Run: node tools/proto15-battle.js
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const OUT = path.join(__dirname, '..', 'docs', 'ui', 'screens15', 'combat'), TMP = process.env.P15_TMP || '/tmp/p15battle';
const FIGHTS = [
  { id: 'aurelith', foe: 'eclipsar', presses: ['glowpulse', 'solarflare'], arena: 'heartwood' },
  { id: 'ignivor', foe: 'calyxar', presses: ['emberflick', 'inferno'], arena: 'heartwood' },
  { id: 'atem', foe: 'rockraki', presses: ['gearstrike', 'overclock'], arena: 'heartwood' },
  { id: 'lumifern', foe: 'umbrit', presses: ['glowpulse', 'sunsprout'], arena: 'heartwood' },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const only = process.argv.slice(2); for (const F of FIGHTS.filter((f) => !only.length || only.includes(f.id))) {
    const parts = [];
    for (const on of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, recordVideo: { dir: TMP, size: { width: 844, height: 390 } } });
      const page = await ctx.newPage(); page.setDefaultTimeout(600000); const T0 = Date.now();
      await page.goto(srv.url + (on ? '?p15=1' : '')); await page.waitForFunction(() => window.A && A.UI && A.UI.showIsland && A.C3D && A.Proto15);
      await page.evaluate(() => { try { localStorage.setItem('aminas.proto15', '0'); } catch (e) {} A.Perf.reportSlow = () => {}; const s = A.State.newGame(); s.phase = 'play'; s.introDone = true; s.avatar.made = true; s.starter = 'lumifern'; s.settings.creatures3d = true; s.settings.sfx = false; A.Rules.drain(); if (A.UI.queue) A.UI.queue.length = 0; A.State.save(); A.UI.showIsland(); });
      await page.waitForSelector('#world', { timeout: 60000 }); await sleep(600);
      await page.evaluate(async () => { for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 100)); document.querySelectorAll('.dlg .dlg-skip').forEach((b) => b.click()); A.UI.closeAll(); } document.querySelectorAll('.dlg').forEach((x) => x.remove()); });
      const res = await page.evaluate(async (F) => {
        const R = A.Rules, Bt = R.Battle, f = Bt.fighter(F.id, 30), e = Bt.fighter(F.foe, 30); [f, e].forEach((x) => { x.hpMax *= 50; x.hp = x.hpMax; }); f.spd = 999; e.atk = 1;
        A.UI.closeAll(); A.UI.startBattle({ kind: 'test', b: Bt.create([f], e, { rng: () => 0.5 }), d: F.arena, label: 'Phase 15 review', finish: () => {} });
        for (let i = 0; i < 150 && !(A.UI.B.stage && A.UI.B.stage.is3d && !A.UI.B.busy); i++) await new Promise((r) => setTimeout(r, 100));
        await new Promise((r) => setTimeout(r, 1200)); const start = performance.now(), log = [];
        for (const id of F.presses) { for (let i = 0; i < 80 && A.UI.B.busy; i++) await new Promise((r) => setTimeout(r, 100)); const b = document.querySelector('.abtn.ready[data-id="' + id + '"]'); if (b) { b.click(); log.push(id); } await new Promise((r) => setTimeout(r, 700)); }
        for (let i = 0; i < 80 && A.UI.B.busy; i++) await new Promise((r) => setTimeout(r, 100)); await new Promise((r) => setTimeout(r, 900));
        return { proto: !!(A.Proto15 && A.Proto15.active(F.id)), presses: log, ms: performance.now() - start, stageLog: A.UI.B.stage.debug().log.filter((x) => /^move|^use|^hit/.test(x)) };
      }, F);
      const startAt = (Date.now() - T0) / 1000 - res.ms / 1000 - 0.4;
      const vp = await page.video().path(); await ctx.close();
      const clip = path.join(TMP, F.id + (on ? '-p15' : '-cur') + '.mp4');
      execSync(`ffmpeg -y -loglevel error -ss ${Math.max(0, startAt).toFixed(2)} -i ${vp} -t ${(res.ms / 1000 + 0.8).toFixed(2)} -vf "fps=24,drawbox=x=0:y=0:w=230:h=24:color=black@0.5:t=fill,drawtext=text='${on ? 'Phase 15 prototype' : 'Current'}':x=8:y=5:fontsize=15:fontcolor=white" -c:v libx264 -preset veryfast -crf 24 -pix_fmt yuv420p ${clip}`);
      parts.push(clip); console.log(F.id, on ? 'p15' : 'cur', JSON.stringify(res));
    }
    execSync(`ffmpeg -y -loglevel error -i ${parts[0]} -i ${parts[1]} -filter_complex "[0:v][1:v]vstack=inputs=2:shortest=1" -c:v libx264 -preset veryfast -crf 24 -pix_fmt yuv420p ${path.join(OUT, 'battle-' + F.id + '.mp4')}`);
  }
  await browser.close(); srv.close();
})();
