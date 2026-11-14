// Phase 16A: deterministic recordings of the new opening. Playwright's clock drives the page (timers, animation frames
// and performance.now advance exactly 1/30 s per captured frame), so the software renderer records every beat at its
// real timing. Desktop software WebGL at 844×390, NOT a phone.
// Run: node tools/o16-record.js [scenario,...]   -> docs/ui/screens16a/rec/<scenario>.mp4
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const OUT = process.env.O16_OUT || path.join(__dirname, '..', 'docs', 'ui', 'screens16a', 'rec'), TMP = process.env.O16_TMP || '/tmp/o16rec', FPS = 30;
// a scenario: prep (in page, before the clock runs), then a list of [seconds, in-page action] cues, recorded for secs
const body = (o) => `localStorage.clear(); localStorage.setItem('aminas.onboard16', '1'); A.Onboard16.set(true); const s = A.State.newGame(); A.Onboard16.begin(s);
  s.avatar = { made: true, name: 'Rowan', look: null }; s.settings.sfx = false; s.settings.music = false; s.settings.reduceMotion = ${!!o.calm}; s.settings.batterySaver = ${!!o.saver}; s.settings.textSpeed = 'normal';
  A.Perf.reportSlow = () => {}; A.Perf.autoSaver = false; if (A.Perf.apply) A.Perf.apply(); document.body.classList.toggle('calm', ${!!o.calm}); A.State.save();`;
const newGame = (o) => '(() => { ' + body(o) + ' })()';
const prologue = (o) => `(() => { ${body(o || {})} const R = A.Rules; s.onboard.cine = 2; s.onboard.met = true; A.Onboard16.chooseStarter(s, 'lumifern'); R.addAmina(s, 'acinus', 2); s.aminas[0].lv = 3;
  s.struct.hollow = true; if (s.buildings.hollow) { s.buildings.hollow.level = 1; s.buildings.hollow.state = 'built'; } s.missions = { m_hollow: 'claimed', m_feed: 'claimed', m_lv3: 'claimed', m_find: 'claimed' }; s.onboard.seen.inspect = 1; s.settings.creatures3d = true; R.drain(); A.State.save(); A.UI.showIsland(true); })()`;
const autoTalk = `(() => { const a = document.querySelector('.dlg.o16 .dlg-auto'); if (a && !a.classList.contains('on')) a.click(); })()`;
const SC = {
  cinematic: { label: 'Opening (normal)', prep: newGame({}), cues: [[0.2, 'A.UI.o16Cinematic()'], [10.8, autoTalk]], secs: 30 },
  'cinematic-calm': { label: 'Reduce Motion', prep: newGame({ calm: true }), cues: [[0.2, 'A.UI.o16Cinematic()'], [10.8, autoTalk]], secs: 14 },
  'cinematic-saver': { label: 'Battery Saver', prep: newGame({ saver: true }), cues: [[0.2, 'A.UI.o16Cinematic()'], [10.8, autoTalk]], secs: 14 },
  starter: { label: 'Starter choice', prep: newGame({}) + ";(() => { const s = A.State.state; s.onboard.cine = 2; s.onboard.met = true; A.State.save(); A.UI.o16Starters(); })()",
    cues: [[1.6, "A.UI.acts.o16Line()"], [3.0, "A.UI.acts.o16Line()"], [4.6, "document.querySelector('.o16-sc[data-id=lumifern]').click()"], [8.2, "document.querySelector('.o16-sc[data-id=umbrit]').click()"],
      [11.6, "document.querySelector('.o16-sc[data-id=lumifern]').click()"], [14.2, "document.querySelector('#o16-go').click()"], [15.8, "document.querySelector('#o16-yes').click()"], [17.4, autoTalk]], secs: 30 },
  'battle-coach': { label: 'First battle', prep: prologue() + `;(async () => { const s = A.State.state, R = A.Rules; A.UI.queue.length = 0; A.UI.busy = false; A.UI.closeAll(); R.startRun(s, 'forgottenroad', s.aminas.map((a) => a.uid)); A.UI.startBattle(); })()`,
    cues: [[3.4, "document.querySelector('#b-actions .abtn.ready').click()"], [9.0, "document.querySelector('.o16-coach-x') && document.querySelector('.o16-coach-x').click()"], [9.6, "document.querySelector('#b-actions .abtn.ready').click()"], [15.2, "document.querySelector('#b-actions .abtn.ready').click()"], [20.6, "document.querySelector('#b-actions .abtn.ready').click()"], [26.0, "document.querySelector('#b-actions .abtn.ready') && document.querySelector('#b-actions .abtn.ready').click()"]], secs: 34 },
  'dungeon-intro': { label: 'Dungeon introduction', prep: prologue() + ";(() => { A.UI.queue.length = 0; A.UI.busy = false; document.querySelectorAll('.dlg').forEach((x) => x.remove()); })()",
    cues: [[0.5, 'A.UI.closeAll(); A.UI.acts.battle()'], [3.0, "A.UI.closeAll(); A.UI.dungeons(null, 'forgottenroad')"], [3.8, autoTalk]], secs: 30 },
};
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
  const srv = await serve(); const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const want = process.argv[2] ? process.argv[2].split(',') : Object.keys(SC);
  for (const name of want) {
    const S = SC[name], dir = path.join(TMP, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }); const page = await ctx.newPage(); page.setDefaultTimeout(600000);
    page.on('pageerror', (e) => console.log('pageerror', e.message));
    await page.clock.install(); await page.goto(srv.url); await page.waitForFunction(() => window.A && A.UI && A.UI.screen === 'title' && A.Onboard16);
    await page.evaluate(S.prep);
    const now = await page.evaluate(() => Date.now()); await page.clock.pauseAt(now + 1000); await page.clock.runFor(400);
    if (name === 'battle-coach') { for (let i = 0; i < 120 && await page.evaluate(() => !A.UI.B || A.UI.B.busy); i++) await page.clock.runFor(100); }
    const n = Math.round(S.secs * FPS), cues = S.cues.slice();
    for (let i = 0; i < n; i++) {
      while (cues.length && cues[0][0] * FPS <= i) { const c = cues.shift(); await page.evaluate(c[1]).catch((e) => console.log('cue failed', c[1], e.message)); }
      await page.clock.runFor(1000 / FPS); await page.screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.png') });
    }
    const out = path.join(OUT, name + '.mp4');
    execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${dir}/%04d.png -vf "drawbox=x=0:y=0:w=230:h=24:color=black@0.55:t=fill,drawtext=text='${S.label}':x=8:y=5:fontsize=15:fontcolor=white" -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p ${out}`);
    await ctx.close(); console.log('wrote', out, n, 'frames');
  }
  await browser.close(); srv.close();
})();
